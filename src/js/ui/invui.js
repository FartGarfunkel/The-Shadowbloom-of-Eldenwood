// ---------------------------------------------------------------------------
// ui/invui.js — the classic inventory, one per player, inside that player's
// slice of the screen.
//
// Modes: 'inventory' (2x2 crafting, armor, off hand, belt hook, backpack),
// 'table' (3x3 crafting), 'furnace', 'container' (chests, backpacks).
// Crafting is done on the grid like the old days; the recipe book beside it
// is optional and can fill the grid for you.
//
// Mouse: left = take/place, right = split/place one, shift = quick move,
// 1-9 over a slot = swap with the hotbar. Touch: tap = left, hold = right.
// Gamepad: d-pad/stick moves between slots, A = take/place, X = split,
// Y = quick move, B = close.
// ---------------------------------------------------------------------------

const BOOK_CATS = [['all', 'All'], ['blocks', 'Blocks'], ['redstone', 'Redstone'], ['tools', 'Tools'], ['armor', 'Armor'], ['food', 'Food'], ['misc', 'Other']];
// Redstone parts, rails and carts get a tab of their own.
function isRedstoneItem(d) { if (!d) return false; if (d.cart || d.key === 'redstone') return true; const b = d.block && BLOCKS[B[d.block]]; return !!(b && d.key !== 'string' && (b.rs || b.rail || b.key === 'redstone_block' || b.noteBlock || b.tnt)); }

function itemInfoHTML(s) {
  const d = itemDef(s.id);
  if (!d) return esc(s.id);
  const lines = [];
  lines.push(`<div class="tn ${d.rarity || ''}">${esc(d.name)}${s.n > 1 ? ' ×' + s.n : ''}</div>`);
  if (d.food) lines.push(`<div class="ts">Heals ${d.food.heal / 2} ${d.food.heal === 2 ? 'heart' : 'hearts'} instantly</div>`);
  if (d.tool) {
    const t = d.tool;
    lines.push(`<div class="ts">${t.type === 'sword' ? 'Attack' : 'Mining speed ' + t.speed + '× · attack'} ${t.damage / 2} ♥${t.element ? ' · ' + ELEMENT_LABEL[t.element] + ' element' : ''}</div>`);
    lines.push(`<div class="td">Durability ${t.durability - (s.d || 0)} / ${t.durability}</div>`);
  }
  if (d.armor) lines.push(`<div class="ts">Armor +${d.armor.points}${d.armor.fireResist ? ' · fire resist' : ''}</div><div class="td">Durability ${d.armor.durability - (s.d || 0)} / ${d.armor.durability}</div>`);
  if (d.backpack) lines.push(`<div class="ts">${d.backpack} extra slots when worn</div>`);
  const lt = itemLight(s.id);
  if (lt) lines.push(`<div class="ts">Gives light when carried${d.hook ? ' · hangs on your belt hook' : ''}</div>`);
  if (s.c) { const n = s.c.filter(Boolean).length; lines.push(`<div class="ts">Holds ${n} stack${n === 1 ? '' : 's'}</div>`); }
  if (d.fuel) lines.push(`<div class="td">Fuel: smelts ${d.fuel} item${d.fuel === 1 ? '' : 's'}</div>`);
  if (SMELTING[s.id]) lines.push(`<div class="td">Smelts into ${esc(itemDef(SMELTING[s.id]).name)}</div>`);
  if (d.desc) lines.push(`<div class="td">${esc(d.desc)}</div>`);
  return lines.join('');
}

function recipeCat(r) {
  if (r.group === 'tools') return 'tools';
  if (r.group === 'armor') return 'armor';
  const d = itemDef(r.out);
  if (isRedstoneItem(d)) return 'redstone';
  if (d.food) return 'food';
  if (d.block) return 'blocks';
  return 'misc';
}

class InvUI {
  constructor(lp) {
    this.lp = lp; this.g = lp.g;
    this.root = lp.el.querySelector('.inv');
    this.mode = null; this.opts = {};
    this.cursor = null;
    this.grid = []; this.W = 2;
    this.bookOpen = false; this.bookCat = 'all'; this.bookOnly = false; this.bookQuery = ''; this.ghost = null; this.bookSel = null;
    this.focus = null;            // gamepad focus element
    this.hover = null;            // mouse-hovered slot {g, i}
    this.bind();
  }

  // ---- open / close ----------------------------------------------------------------
  open(mode, opts = {}) {
    this.mode = mode; this.opts = opts;
    this.W = mode === 'table' ? 3 : 2;
    this.grid = new Array(this.W * this.W).fill(null);
    this.ghost = null; this.bookSel = null;
    this.root.hidden = false;
    this.focus = null;
    this.build();
    this.render();
    if (!this.lp.useKb || this.lp.pads.size) this.setFocus(this.root.querySelector(`.slot[data-g="main"][data-i="${this.lp.player.inv.selected}"]`));
  }
  close() {
    const p = this.lp.player;
    if (this.cutIn && this.cutIn[0]) { this.giveBack(this.cutIn[0]); this.cutIn[0] = null; }
    if (this.staIn) { for (let k = 0; k < this.staIn.length; k++) if (this.staIn[k]) { this.giveBack(this.staIn[k]); this.staIn[k] = null; } }
    // anything left on the crafting grid or the cursor goes back to the bag
    for (const s of this.grid) if (s) this.giveBack(s);
    this.grid = [];
    if (this.cursor) { this.giveBack(this.cursor); this.cursor = null; }
    if (this.opts.pos) this.g.world.touchEntity(this.opts.pos[0], this.opts.pos[2]);
    this.root.hidden = true;
    this.root.innerHTML = '';
    this.mode = null;
    p.inv.selected = clamp(p.inv.selected, 0, 8);
  }
  giveBack(s) {
    const left = this.lp.player.inv.add(s);
    if (left > 0) this.lp.throwStack(Object.assign(cloneStack(s), { n: left }));
  }
  // Someone (another player, a hopper of fate, a furnace tick) changed a block entity.
  externalChange(x, y, z) {
    const pos = this.opts.pos;
    if (!pos || pos[0] !== x || pos[1] !== y || pos[2] !== z) return;
    const here = BLOCKS[this.g.world.getBlock(x, y, z)];
    if (this.mode === 'container' && !this.container()) { this.lp.closeInventory(); return; }
    if (this.mode === 'furnace' && !here.furnace) { this.lp.closeInventory(); return; }
    if (this.mode === 'machine' && !here.machine) { this.lp.closeInventory(); return; }
    this.render();
  }

  // ---- data ---------------------------------------------------------------------------
  container() {
    const o = this.opts, w = this.g.world, inv = this.lp.player.inv;
    if (o.held) {
      const h = inv.held, d = h && itemDef(h.id);
      if (!d || !d.backpack) return null;
      if (!h.c || h.c.length !== d.backpack) { const old = h.c || []; h.c = new Array(d.backpack).fill(null); old.forEach((s, i) => { if (i < h.c.length) h.c[i] = s; }); }
      return { title: d.name, items: h.c, backpack: true };
    }
    if (o.ender) return { title: 'Ender Chest', items: inv.ender.slots };
    if (o.cart) return o.cart.remove ? null : { title: o.cart.name, items: o.cart.items };
    if (!o.pos) return null;
    const [x, y, z] = o.pos, id = w.getBlock(x, y, z);
    if (BLOCKS[id].container) {
      const n = BLOCKS[id].container;
      const e = w.getEntity(x, y, z, () => ({ type: 'chest', items: new Array(n).fill(null) }));
      if (!e.items || e.items.length !== n) e.items = Object.assign(new Array(n).fill(null), e.items || []);
      return { title: BLOCKS[id].name, items: e.items };
    }
    if (id === B.backpack_block) {
      const e = w.getEntity(x, y, z);
      if (!e || !e.stack) return null;
      const d = itemDef(e.stack.id);
      if (!e.stack.c || e.stack.c.length !== d.backpack) { const old = e.stack.c || []; e.stack.c = new Array(d.backpack).fill(null); old.forEach((s, i) => { if (i < e.stack.c.length) e.stack.c[i] = s; }); }
      return { title: d.name, items: e.stack.c, backpack: true };
    }
    return null;
  }
  furnace() {
    const pos = this.opts.pos; if (!pos) return null;
    const e = this.g.world.getEntity(pos[0], pos[1], pos[2], () => ({ type: 'furnace', items: [null, null, null], burn: 0, burnMax: 0, cook: 0 }));
    e.items = e.items || [null, null, null];
    return e;
  }
  machine() {
    const pos = this.opts.pos; if (!pos) return null;
    const e = this.g.world.getEntity(pos[0], pos[1], pos[2], () => ({ type: 'machine', items: [null, null], progress: 0 }));
    e.items = e.items || [null, null];
    return e;
  }
  machineTable() { const pos = this.opts.pos; return pos && BLOCKS[this.g.world.getBlock(pos[0], pos[1], pos[2])].mech === 'sawmill' ? SAWING : MILLING; }
  arr(group) {
    const inv = this.lp.player.inv;
    switch (group) {
      case 'main': return inv.main.slots;
      case 'armor': return inv.armor.slots;
      case 'back': return inv.back.slots;
      case 'off': return inv.off.slots;
      case 'hook': return inv.hook.slots;
      case 'charm': return inv.charm.slots;
      case 'cape': return inv.cape.slots;
      case 'bp': return inv.backpackSlots() || [];
      case 'grid': return this.grid;
      case 'cont': { const c = this.container(); return c ? c.items : []; }
      case 'furn': { const f = this.furnace(); return f ? f.items : []; }
      case 'mach': { const m = this.machine(); return m ? m.items : []; }
      case 'cut': return this.cutIn || (this.cutIn = [null]);
      case 'sta': return this.staIn || (this.staIn = [null, null]);
      default: return [];
    }
  }
  accepts(group, i, s) {
    const d = itemDef(s.id);
    if (!d) return false;
    if (group === 'armor') return !!(d.armor && d.armor.slot === i);
    if (group === 'back') return !!d.backpack;
    if (group === 'hook') return !!d.hook;
    if (group === 'charm') return !!d.charm;
    if (group === 'cape') return !!d.cape;
    if (group === 'bp') return !d.backpack;
    if (group === 'cont') { const c = this.container(); return !(c && c.backpack && d.backpack); }
    if (group === 'furn') return i === 0 ? true : i === 1 ? fuelValue(s.id) > 0 : false;
    if (group === 'mach') return i === 0 && !!this.machineTable()[s.id];
    if (group === 'cut') return stonecutterOptions(s.id).length > 0;
    return true;
  }
  changed(group) {
    if (group === 'cont' || group === 'furn' || group === 'mach') { const p = this.opts.pos; if (p) this.g.entityChanged(p[0], p[1], p[2]); }
    if (group === 'cut') this.renderCutter();
    if (group === 'sta') this.renderStation();
  }

  // ---- building the panel ---------------------------------------------------------------
  slotHTML(group, i, s, extra = '', ph = '') {
    const sel = group === 'main' && i === this.lp.player.inv.selected ? ' sel' : '';
    const full = s && s.c && s.c.some(Boolean) ? ' full' : '';
    const inner = s ? slotInner(s) : (ph ? `<i class="ico ph" style="background-position:${iconPos(ph)}"></i>` : '');
    return `<div class="slot${sel}${full}${extra}" data-g="${group}" data-i="${i}">${inner}</div>`;
  }
  build() {
    const lp = this.lp, mode = this.mode;
    const c = mode === 'container' ? this.container() : null;
    let title = '';
    const at = this.opts.pos ? BLOCKS[this.g.world.getBlock(...this.opts.pos)] : null;
    if (mode === 'table') title = 'Crafting';
    else if (mode === 'furnace') title = at ? at.name : 'Furnace';
    else if (mode === 'machine') title = at ? at.name : 'Machine';
    else if (mode === 'stonecutter') title = 'Stonecutter';
    else if (mode === 'station') title = at ? at.name : 'Work Station';
    else if (c) title = c.title;
    const canBook = mode === 'inventory' || mode === 'table';
    const creative = this.g.creative && mode === 'inventory';
    if (creative && this._creativeOpened !== this.g.meta.id) { this.bookOpen = true; this._creativeOpened = this.g.meta.id; }
    this.root.innerHTML = `
      <div class="inv-wrap">
        <div class="book" hidden>
          <div class="book-head"><input class="book-search" type="search" placeholder="${creative ? 'Search all items' : 'Search recipes'}" aria-label="Search"><label class="book-only"${creative ? ' hidden' : ''}><input type="checkbox"> Craftable</label><button class="bookclose" data-nav aria-label="Close recipe book" title="Close recipe book">✕</button></div>
          <div class="book-tabs">${BOOK_CATS.map(([k, l]) => `<button class="btab" data-cat="${k}" data-nav>${l}</button>`).join('')}</div>
          <div class="book-list"></div>
          <div class="book-detail"></div>
        </div>
        <div class="ipanel" data-mode="${mode}">
          ${title ? `<div class="ip-title">${esc(title)}</div>` : ''}
          <div class="ip-top"></div>
          <div class="bp-area"><div class="ip-label">Backpack</div><div class="grid9 bp"></div></div>
          <div class="ip-label">Inventory</div>
          <div class="grid9 main"></div>
          <div class="grid9 hot"></div>
          <div class="ip-info"></div>
        </div>
      </div>
      <div class="slot cursor-item" hidden></div>
      <div class="itip" hidden></div>`;
    const top = this.root.querySelector('.ip-top');
    if (mode === 'inventory') {
      top.innerHTML = `
        <div class="eq-col armor"></div>
        <div class="doll"><canvas width="64" height="128" aria-label="${esc(lp.name)}"></canvas><div class="doll-stats"></div></div>
        <div class="eq-col gear"></div>
        <div class="craft"><div class="ip-sub">Crafting</div><div class="cgrid w2"></div><div class="arrow"></div><div class="outwrap"></div>
          <button class="bookbtn" data-nav title="Recipe book" aria-label="Recipe book"></button></div>`;
      drawSkinPreview(top.querySelector('canvas'), skinRef(lp.profile), lp.player.inv.armor.slots.map(s => s ? (s.col ? s.id + '#' + s.col.slice(1) : s.id) : null));
    } else if (mode === 'table') {
      top.innerHTML = `<div class="craft big"><div class="cgrid w3"></div><div class="arrow"></div><div class="outwrap"></div>
        <button class="bookbtn" data-nav title="Recipe book" aria-label="Recipe book"></button></div>`;
    } else if (mode === 'furnace') {
      top.innerHTML = `<div class="furn"><div class="fcol"><div class="fslot in"></div><div class="flame"><i></i></div><div class="fslot fuel"></div></div>
        <div class="farrow"><i></i></div><div class="fslot out"></div></div>`;
    } else if (mode === 'container') {
      top.innerHTML = `<div class="grid9 cont"></div>`;
    } else if (mode === 'machine') {
      top.innerHTML = `<div class="furn mach"><div class="fslot in"></div><div class="farrow"><i></i></div><div class="fslot out"></div></div><div class="mach-status"></div>`;
    } else if (mode === 'stonecutter') {
      top.innerHTML = `<div class="cutter"><div class="fslot in"></div><div class="arrow"></div><div class="cut-list"></div></div>`;
    } else if (mode === 'station') {
      top.innerHTML = `<div class="furn station"><div class="fslot sa"></div><div class="plus">+</div><div class="fslot sb"></div><div class="arrow"></div><div class="fslot so"></div></div><div class="mach-status"></div>`;
    }
    if (canBook) {
      const book = this.root.querySelector('.book');
      book.hidden = !this.bookOpen;
      const search = book.querySelector('.book-search');
      search.value = this.bookQuery;
      search.addEventListener('input', () => { this.bookQuery = search.value; this.renderBook(); });
      search.addEventListener('keydown', (e) => e.stopPropagation());
      const only = book.querySelector('.book-only input');
      only.checked = this.bookOnly;
      only.onchange = () => { this.bookOnly = only.checked; this.renderBook(); };
    }
    this.layout();
  }
  // Fit the panel into this player's slice of the screen.
  layout() {
    const v = this.lp.view;
    const bpRows = Math.ceil((this.lp.player.inv.backpackSlots() || []).length / 9);
    const c = this.mode === 'container' ? this.container() : null;
    // heights in slot units: top section, then label + 3 rows + hotbar + info line + padding
    const topRows = this.mode === 'inventory' ? 4.8 : this.mode === 'table' ? 4.6 : this.mode === 'furnace' ? 3.2 : this.mode === 'machine' ? 2.6 : this.mode === 'stonecutter' ? 3.4 : this.mode === 'station' ? 2.6 : Math.ceil(((c && c.items.length) || 27) / 9);
    const rows = topRows + 6.1 + (bpRows ? bpRows + 0.65 : 0) + (this.mode !== 'inventory' ? 0.55 : 0);
    const wide = v.w > v.h * 1.25 && v.w > 640;
    const bookW = this.bookOpen ? (wide ? 6.4 : 0) : 0;
    const size = Math.floor(clamp(Math.min((v.w - 28) / (9.9 + bookW), (v.h - 28) / rows), 16, 44));
    this.root.style.setProperty('--is', size + 'px');
    this.root.classList.toggle('narrow', !wide);
  }

  // ---- rendering ------------------------------------------------------------------------
  render() {
    if (!this.mode) return;
    const R = this.root, inv = this.lp.player.inv, p = this.lp.player;
    const q = (s) => R.querySelector(s);
    const grid9 = (el, group, from, to) => { if (!el) return; let h = ''; for (let i = from; i < to; i++) h += this.slotHTML(group, i, this.arr(group)[i]); el.innerHTML = h; };
    grid9(q('.grid9.main'), 'main', 9, 36);
    grid9(q('.grid9.hot'), 'main', 0, 9);
    const bp = inv.backpackSlots();
    q('.bp-area').hidden = !bp;
    if (bp) grid9(q('.grid9.bp'), 'bp', 0, bp.length);
    if (this.mode === 'inventory') {
      const ph = ['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots'];
      q('.eq-col.armor').innerHTML = [0, 1, 2, 3].map(i => this.slotHTML('armor', i, inv.armor.slots[i], ' eq', ph[i])).join('');
      q('.eq-col.gear').innerHTML = this.slotHTML('off', 0, inv.off.slots[0], ' eq cap-off') + this.slotHTML('hook', 0, inv.hook.slots[0], ' eq cap-hook', 'lantern') + this.slotHTML('back', 0, inv.back.slots[0], ' eq cap-pack', 'leather_backpack') + this.slotHTML('charm', 0, inv.charm.slots[0], ' eq cap-charm', 'vigor_charm') + this.slotHTML('cape', 0, inv.cape.slots[0], ' eq cap-cape', 'red_cape');
      for (const [el, t] of [[q('[data-g="off"]'), 'Off hand — torches and lanterns here light your way (F to swap hands)'], [q('[data-g="hook"]'), (bp ? 'Backpack hook' : 'Belt hook') + ' — hang a torch or lantern here'], [q('[data-g="back"]'), 'Backpack'], [q('[data-g="charm"]'), 'Belt charm — extra hearts, fire ward, longer breath or softer falls'], [q('[data-g="cape"]'), 'Cape — worn over your shoulders (and over your backpack)']]) if (el) el.title = t;
      { const ak = inv.armor.slots.map(s => s ? (s.col ? s.id + '#' + s.col.slice(1) : s.id) : null), cvd = q('.doll canvas'); if (cvd && cvd._ak !== ak.join()) { cvd._ak = ak.join(); drawSkinPreview(cvd, skinRef(this.lp.profile), ak); } }   // the doll wears what you put on
      q('.doll-stats').innerHTML = `Lv ${p.level} · ${p.health / 2}/${p.maxHealth / 2} ♥`;
    }
    if (this.mode === 'inventory' || this.mode === 'table') {
      let h = '';
      for (let i = 0; i < this.W * this.W; i++) {
        const s = this.grid[i];
        let ghost = '';
        if (!s && this.ghost && this.ghost[i]) ghost = `<i class="ico ghost" style="background-position:${iconPos(ingredientIcon(this.ghost[i]))}"></i>`;
        h += s ? this.slotHTML('grid', i, s) : `<div class="slot" data-g="grid" data-i="${i}">${ghost}</div>`;
      }
      q('.cgrid').innerHTML = h;
      this.match = matchGrid(this.grid, this.W);
      const out = this.match ? mkStack(this.match.out, this.match.n, this.match.repair ? { d: this.match.repair } : undefined) : null;
      q('.outwrap').innerHTML = `<div class="slot out${out ? ' ready' : ''}" data-g="out" data-i="0">${out ? slotInner(out) : ''}</div>`;
      q('.bookbtn').classList.toggle('on', this.bookOpen);
      if (this.bookOpen) this.renderBook();
    }
    if (this.mode === 'furnace') {
      const f = this.furnace(), it = f.items;
      q('.fslot.in').innerHTML = this.slotHTML('furn', 0, it[0]);
      q('.fslot.fuel').innerHTML = this.slotHTML('furn', 1, it[1], '', 'coal');
      q('.fslot.out').innerHTML = this.slotHTML('furn', 2, it[2], ' out');
      this.furnaceBars();
    }
    if (this.mode === 'container') {
      const c = this.container();
      if (c) grid9(q('.grid9.cont'), 'cont', 0, c.items.length);
    }
    if (this.mode === 'machine') {
      const m = this.machine(), it = m.items;
      q('.fslot.in').innerHTML = this.slotHTML('mach', 0, it[0]);
      q('.fslot.out').innerHTML = this.slotHTML('mach', 1, it[1], ' out');
      this.machineBars();
    }
    if (this.mode === 'stonecutter') { q('.fslot.in').innerHTML = this.slotHTML('cut', 0, this.arr('cut')[0]); this.renderCutter(); }
    if (this.mode === 'station') this.renderStation();
    if (this.focus) { const f = this.refind(this.focus); this.setFocus(f); }
    this.renderCursor();
  }
  machineBars() {
    const m = this.machine(), pos = this.opts.pos; if (!m || !pos) return;
    const ar = this.root.querySelector('.farrow i'), st = this.root.querySelector('.mach-status');
    if (ar) ar.style.width = ((m.progress || 0) * 100) + '%';
    const sp = this.g.mech.speedAt(pos[0], pos[1], pos[2]);
    const kind = BLOCKS[this.g.world.getBlock(pos[0], pos[1], pos[2])].mech;
    if (st) st.textContent = sp > 0.05 ? `Turning at ${Math.round(Math.min(1, sp) * 100)}% — ${kind === 'sawmill' ? 'logs become 6 planks, planks 6 sticks' : 'ores grind into 2 crushed ore, cobble to gravel, gravel to sand, flowers to dye'}`
      : 'Not turning. Join it to a windmill (high, in open air) or a waterwheel (in flowing water) with wooden axles.';
  }
  stationKind() { return this.opts.kind; }
  renderStation() {
    const R = this.root, a = this.arr('sta');
    const sa = R.querySelector('.fslot.sa'); if (!sa) return;
    const ph = { anvil: ['iron_pickaxe', 'iron_ingot'], grindstone: ['iron_sword', 'iron_sword'], smithing: ['diamond_pickaxe', 'cinderite_shard'], loom: ['wool', 'red_dye'], fletching: ['flint', 'feather'] }[this.stationKind()] || [];
    sa.innerHTML = this.slotHTML('sta', 0, a[0], '', ph[0]);
    R.querySelector('.fslot.sb').innerHTML = this.slotHTML('sta', 1, a[1], '', ph[1]);
    const res = stationResult(this.stationKind(), a[0], a[1]);
    this.staRes = res;
    R.querySelector('.fslot.so').innerHTML = `<div class="slot out${res ? ' ready' : ''}" data-g="sout" data-i="0">${res ? slotInner(res.out) : ''}</div>`;
    const help = {
      anvil: 'Put in a worn tool and its own material (ingots, planks, stones…), or two of the same tool.',
      grindstone: 'Put in two worn tools of the same kind to join them.',
      smithing: 'Diamond gear + a cinderite shard → cinderite gear. Copper gear + a tin ingot → bronze gear.',
      loom: 'Wool, carpet, glass, terracotta, concrete powder, beds or candles + a dye: recolours up to eight.',
      fletching: 'A flint and a feather make six arrows.',
    }[this.stationKind()] || '';
    const st = R.querySelector('.mach-status'); if (st) st.textContent = res ? res.note : help;
  }
  takeStation(shift) {
    const res = this.staRes; if (!res) return;
    const a = this.arr('sta'), out = res.out;
    if (!shift && this.cursor && !(canMerge(this.cursor, out) && this.cursor.n + out.n <= maxStackOf(out.id))) return;
    if (shift) { const left = this.lp.player.inv.add(cloneStack(out)); if (left > 0) this.lp.throwStack(Object.assign(cloneStack(out), { n: left })); }
    else if (this.cursor) this.cursor.n += out.n; else this.cursor = cloneStack(out);
    const use = (k, n) => { if (!a[k]) return; a[k].n -= n; if (a[k].n <= 0) a[k] = null; };
    // the fletching table takes its flint and feather from whichever slot holds them
    if (this.stationKind() === 'fletching' && a[0] && a[0].id === 'feather') { use(0, 1); use(1, 1); }
    else { use(0, res.useA); use(1, res.useB); }
    const g = this.g, pos = this.opts.pos;
    if (this.stationKind() === 'anvil' && pos) {
      g.sfx.play('anvil');
      // anvils wear out: anvil -> chipped -> damaged -> gone
      if (Math.random() < 0.12) {
        const w = g.world, id = w.getBlock(pos[0], pos[1], pos[2]), m = w.getMeta(pos[0], pos[1], pos[2]);
        const next = id === B.anvil ? B.chipped_anvil : id === B.chipped_anvil ? B.damaged_anvil : 0;
        w.setBlock(pos[0], pos[1], pos[2], next, m);
        if (!next) { this.lp.toast('The anvil broke', 'warn'); this.lp.closeInventory(); return; }
      }
    } else g.sfx.play(this.stationKind() === 'grindstone' ? 'grind' : 'craft');
    this.render();
  }
  renderCutter() {
    const list = this.root.querySelector('.cut-list'); if (!list) return;
    const s = this.arr('cut')[0];
    const opts = s ? stonecutterOptions(s.id) : [];
    list.innerHTML = opts.length ? opts.map(([k, n], i) => `<div class="slot bslot cat" data-cut="${i}" title="${esc(itemDef(k).name)}">${slotInner(mkStack(k, n))}</div>`).join('') : '<p class="book-empty">Put a stone block in to see what it cuts into.</p>';
  }
  cutPick(i, all) {
    const a = this.arr('cut'), s = a[0]; if (!s) return;
    const opt = stonecutterOptions(s.id)[i]; if (!opt) return;
    for (let k = 0; k < (all ? 64 : 1) && a[0]; k++) {
      const out = mkStack(opt[0], opt[1]);
      if (!all) { if (this.cursor && !(canMerge(this.cursor, out) && this.cursor.n + out.n <= maxStackOf(out.id))) return; if (this.cursor) this.cursor.n += out.n; else this.cursor = out; }
      else if (this.lp.player.inv.add(out) > 0) { this.lp.throwStack(out); }
      s.n--; if (s.n <= 0) a[0] = null;
    }
    this.g.sfx.play('craft');
    this.render();
  }
  // Creative: every item, free.
  creativePick(key, all) {
    const st = mkStack(key, maxStackOf(key));
    if (all) { this.lp.player.inv.add(st); }
    else if (this.cursor && this.cursor.id === key) this.cursor.n = maxStackOf(key);
    else this.cursor = st;
    this.g.sfx.play('click');
    this.render();
  }
  furnaceBars() {
    const f = this.furnace(); if (!f) return;
    const fl = this.root.querySelector('.flame i'), ar = this.root.querySelector('.farrow i');
    if (fl) fl.style.height = (f.burn > 0 && f.burnMax ? Math.max(4, f.burn / f.burnMax * 100) : 0) + '%';
    if (ar) ar.style.width = (f.cook / SMELT_TIME * 100) + '%';
  }
  // after a re-render, find the element that sits where the old focus was
  refind(el) {
    if (el && el.isConnected) return el;
    if (!el || !el.dataset) return null;
    if (el.dataset.g) return this.root.querySelector(`[data-g="${el.dataset.g}"][data-i="${el.dataset.i}"]`);
    if (el.dataset.r) return this.root.querySelector(`[data-r="${el.dataset.r}"]`);
    if (el.dataset.cat) return this.root.querySelector(`[data-cat="${el.dataset.cat}"]`);
    if (el.classList.contains('bookbtn')) return this.root.querySelector('.bookbtn');
    if (el.classList.contains('bookclose')) return this.root.querySelector('.bookclose');
    return null;
  }

  // ---- recipe book ------------------------------------------------------------------------
  toggleBook() {
    this.bookOpen = !this.bookOpen;
    const book = this.root.querySelector('.book');
    if (book) book.hidden = !this.bookOpen;
    if (!this.bookOpen) this.ghost = null;
    this.layout(); this.render();
    this.g.sfx.play('click');
    // controller focus follows: into the book when it opens over the panel, back to its button when it closes
    if (this.focus || this.lp.pads.size) {
      if (this.bookOpen) this.setFocus(this.root.querySelector('.book-list [data-r]') || this.focus);
      else this.setFocus(this.root.querySelector('.bookbtn'));
    }
  }
  renderBook() {
    const R = this.root, inv = this.lp.player.inv;
    const list = R.querySelector('.book-list'); if (!list) return;
    for (const b of R.querySelectorAll('.btab')) b.classList.toggle('on', b.dataset.cat === this.bookCat);
    const qy = this.bookQuery.trim().toLowerCase();
    if (this.g.creative && this.mode === 'inventory') {
      const cat = (d) => d.tool || d.key.endsWith('_hoe') || d.shears ? 'tools' : d.armor ? 'armor' : isRedstoneItem(d) ? 'redstone' : d.food ? 'food' : d.block ? 'blocks' : 'misc';
      let h = '';
      for (const d of Object.values(ITEMS)) {
        if (d.hidden) continue;
        if (this.bookCat !== 'all' && cat(d) !== this.bookCat) continue;
        if (qy && !d.name.toLowerCase().includes(qy)) continue;
        h += `<div class="slot bslot cat" data-ci="${d.key}" title="${esc(d.name)}">${slotInner(mkStack(d.key, 1))}</div>`;
      }
      list.innerHTML = h || '<p class="book-empty">Nothing matches.</p>';
      R.querySelector('.book-detail').innerHTML = '<em>Creative: click an item for a full stack (shift puts it straight in your bag). Drop things outside the panel to get rid of them.</em>';
      return;
    }
    let h = '';
    const seen = new Set();
    for (const r of RECIPES) {
      if (this.bookCat !== 'all' && recipeCat(r) !== this.bookCat) continue;
      const d = itemDef(r.out);
      if (qy && !d.name.toLowerCase().includes(qy)) continue;
      const ok = canCraft(inv, r, this.grid);
      const fits = r.w <= this.W && r.h <= this.W;
      if (this.bookOnly && !(ok && fits)) continue;
      const key = r.out + ':' + r.idx;
      if (seen.has(key)) continue; seen.add(key);
      h += `<div class="slot bslot${ok && fits ? ' ok' : ok ? ' table' : ''}${this.bookSel === r.idx ? ' picked' : ''}" data-r="${r.idx}" title="${esc(d.name)}">${slotInner(mkStack(r.out, r.n))}</div>`;
    }
    list.innerHTML = h || '<p class="book-empty">Nothing here yet.</p>';
    const det = R.querySelector('.book-detail');
    if (this.bookSel !== null) {
      const r = RECIPES[this.bookSel], d = itemDef(r.out);
      const miss = recipeMissing(inv, r, this.grid);
      const ings = recipeIngredients(r).map(([k, n]) => `<span class="${miss[k] ? 'miss' : ''}"><i class="ico" style="background-position:${iconPos(ingredientIcon(k))}"></i>${n} ${esc(ingredientLabel(k))}</span>`).join('');
      const needTable = r.w > this.W || r.h > this.W;
      det.innerHTML = `<b class="${d.rarity || ''}">${esc(d.name)}${r.n > 1 ? ' ×' + r.n : ''}</b><div class="ings">${ings}</div>${needTable ? '<em>Needs a crafting table (3×3)</em>' : Object.keys(miss).length ? '<em>Missing ingredients are shown in red</em>' : '<em>Click again to fill the grid · shift for a full stack</em>'}`;
    } else det.innerHTML = '<em>Pick a recipe to see what it needs. Ones you can make now are lit.</em>';
  }
  bookPick(idx, all) {
    const r = RECIPES[idx], inv = this.lp.player.inv;
    const again = this.bookSel === idx;
    this.bookSel = idx;
    // put whatever is on the grid back first
    for (let i = 0; i < this.grid.length; i++) if (this.grid[i]) { this.giveBack(this.grid[i]); this.grid[i] = null; }
    const fits = r.w <= this.W && r.h <= this.W;
    if (!fits) { this.ghost = null; this.render(); return; }
    const layout = recipeLayout(r, this.W);
    if (!canCraft(inv, r) || !(again || all || this.lp.pads.size || !this.lp.useKb || this.g.input.touchMode)) {
      this.ghost = layout; this.render(); this.g.sfx.play('click'); return;
    }
    // how many sets: one, or as many as the ingredients allow (shift)
    let times = 1;
    if (all) {
      times = 64;
      for (const [k, n] of recipeIngredients(r)) times = Math.min(times, Math.floor(inv.countTag(k) / n));
      for (const k of layout) if (k) times = Math.min(times, maxStackOf(k.startsWith('#') ? TAGS[k][0] : k));
      times = Math.max(1, times);
    }
    for (let i = 0; i < layout.length; i++) {
      const k = layout[i]; if (!k) continue;
      for (let t = 0; t < times; t++) {
        const id = this.takeOne(k); if (!id) break;
        if (this.grid[i] && this.grid[i].id === id) this.grid[i].n++;
        else if (!this.grid[i]) this.grid[i] = mkStack(id, 1);
        else { this.giveBack(mkStack(id, 1)); }
      }
    }
    this.ghost = null;
    this.g.sfx.play('click');
    this.render();
  }
  takeOne(key) {
    const inv = this.lp.player.inv;
    for (const id of key.startsWith('#') ? TAGS[key] : [key]) if (inv.count(id) > 0) { inv.remove(id, 1); return id; }
    return null;
  }

  // ---- clicking slots ------------------------------------------------------------------------
  slotClick(group, i, button, shift) {
    const g = this.g;
    if (group === 'out') { this.takeOutput(shift); return; }
    if (group === 'sout') { this.takeStation(shift); return; }
    const a = this.arr(group);
    if (i >= a.length) return;
    const s = a[i];
    if (shift && s) { this.quickMove(group, i); this.changed(group); this.render(); g.sfx.play('click'); return; }
    const cur = this.cursor;
    if ((group === 'furn' && i === 2) || (group === 'mach' && i === 1)) {
      // furnace output: take only
      if (!s) return;
      if (!cur) { this.cursor = s; a[i] = null; }
      else if (canMerge(cur, s) && cur.n + s.n <= maxStackOf(s.id)) { cur.n += s.n; a[i] = null; }
      else return;
      this.changed(group); this.render(); g.sfx.play('click'); return;
    }
    if (button === 'left') {
      if (!cur) { if (s) { this.cursor = s; a[i] = null; } }
      else if (!s) { if (this.accepts(group, i, cur)) { a[i] = cur; this.cursor = null; } }
      else if (canMerge(s, cur)) { const mv = Math.min(maxStackOf(s.id) - s.n, cur.n); s.n += mv; cur.n -= mv; if (!cur.n) this.cursor = null; }
      else if (this.accepts(group, i, cur)) { a[i] = cur; this.cursor = s; }
    } else {
      if (!cur && s) { const half = Math.ceil(s.n / 2); this.cursor = Object.assign(cloneStack(s), { n: half }); s.n -= half; if (!s.n) a[i] = null; }
      else if (cur) {
        if (!s && this.accepts(group, i, cur)) { a[i] = Object.assign(cloneStack(cur), { n: 1 }); cur.n--; }
        else if (s && canMerge(s, cur) && s.n < maxStackOf(s.id)) { s.n++; cur.n--; }
        if (cur.n <= 0) this.cursor = null;
      }
    }
    if (group === 'armor' || group === 'back' || group === 'hook' || group === 'off' || group === 'charm' || group === 'cape') { if (a[i] && a[i] !== s) g.sfx.play('equip'); }
    if (s || cur) g.sfx.play('click');
    if (group === 'grid') this.ghost = null;
    if (group === 'back') this.layout();
    this.changed(group);
    this.render();
  }
  // Can a drag spread items into this slot? (empty, or the same thing with room)
  dragTarget(group, i) {
    const st = this.drag ? this.drag.orig : this.cursor;
    if (!st || group === 'out' || group === 'sout' || (group === 'furn' && i === 2)) return false;
    const s = this.arr(group)[i];
    if (!this.accepts(group, i, st)) return false;
    return !s || (canMerge(s, st) && s.n < maxStackOf(s.id));
  }
  dragAdd(group, i) {
    const d = this.drag, a = this.arr(group);
    d.slots.push([group, i]); d.base.push(a[i] ? cloneStack(a[i]) : null);
    if (d.right) {
      // one into each slot you pass over
      if (!this.cursor) return;
      const s = a[i];
      if (!s) a[i] = Object.assign(cloneStack(this.cursor), { n: 1 }); else s.n++;
      this.cursor.n--; if (this.cursor.n <= 0) this.cursor = null;
    } else {
      // share the stack evenly over every slot dragged across (what doesn't divide stays in hand)
      const k = d.slots.length, each = Math.floor(d.orig.n / k);
      if (each < 1) { d.slots.pop(); d.base.pop(); return; }
      let used = 0;
      d.slots.forEach(([g0, i0], j) => {
        const arr = this.arr(g0), base = d.base[j];
        const room = maxStackOf(d.orig.id) - (base ? base.n : 0), put = Math.min(each, room);
        arr[i0] = put > 0 ? Object.assign(cloneStack(d.orig), { n: (base ? base.n : 0) + put }) : base;
        used += Math.max(0, put);
      });
      const left = d.orig.n - used;
      this.cursor = left > 0 ? Object.assign(cloneStack(d.orig), { n: left }) : null;
    }
    this.g.sfx.play('click');
    for (const [g0] of d.slots) { if (g0 === 'grid') this.ghost = null; this.changed(g0); }
    this.render();
  }
  // Number key over a slot: swap it with that hotbar slot.
  hotbarSwap(group, i, k) {
    if (group === 'out' || (group === 'furn' && i === 2)) return;
    const a = this.arr(group), hot = this.lp.player.inv.main.slots;
    if (group === 'main' && i === k) return;
    const s = a[i], h = hot[k];
    if (h && !this.accepts(group, i, h)) return;
    a[i] = h; hot[k] = s;
    this.changed(group); this.render(); this.g.sfx.play('click');
  }
  quickMove(group, i) {
    const a = this.arr(group), s = a[i];
    const inv = this.lp.player.inv;
    const d = itemDef(s.id);
    const into = (list, stack, filter) => { const c = new Container(0); c.slots = list; return filter === false ? stack.n : c.add(stack); };
    const toBag = () => { let left = inv.main.add(s); if (left > 0) { const bp = inv.backpackSlots(); if (bp && !d.backpack) left = into(bp, s); } if (left <= 0) a[i] = null; };
    if (group === 'cont') { const c = new Container(0); c.slots = inv.main.slots; let left = c.add(s, [...Array(9).keys()].map(k => k).concat([...Array(27).keys()].map(k => k + 9))); if (left > 0) { const bp = inv.backpackSlots(); if (bp && !d.backpack) left = into(bp, s); } if (left <= 0) a[i] = null; return; }
    if (group !== 'main' && group !== 'bp') { toBag(); return; }
    // from the bag
    if (this.mode === 'container') {
      const c = this.container(); if (!c) return;
      if (c.backpack && d.backpack) return;
      if (into(c.items, s) <= 0) a[i] = null; return;
    }
    if (this.mode === 'machine') {
      const m = this.machine();
      if (this.machineTable()[s.id] && (!m.items[0] || canMerge(m.items[0], s))) { const tmp = [m.items[0]]; const left = into(tmp, s); m.items[0] = tmp[0]; if (left <= 0) a[i] = null; this.changed('mach'); return; }
    }
    if (this.mode === 'station') {
      const c = this.arr('sta');
      for (const k of [0, 1]) if (!c[k] || canMerge(c[k], s)) { const tmp = [c[k]]; const left = into(tmp, s); c[k] = tmp[0]; if (left <= 0) a[i] = null; this.renderStation(); return; }
    }
    if (this.mode === 'stonecutter') {
      const c = this.arr('cut');
      if (stonecutterOptions(s.id).length && (!c[0] || canMerge(c[0], s))) { const tmp = [c[0]]; const left = into(tmp, s); c[0] = tmp[0]; if (left <= 0) a[i] = null; this.renderCutter(); return; }
    }
    if (this.mode === 'furnace') {
      const f = this.furnace();
      if (SMELTING[s.id] && (!f.items[0] || canMerge(f.items[0], s))) { const tmp = [f.items[0]]; const left = into(tmp, s); f.items[0] = tmp[0]; if (left <= 0) a[i] = null; this.changed('furn'); return; }
      if (fuelValue(s.id) > 0 && (!f.items[1] || canMerge(f.items[1], s))) { const tmp = [f.items[1]]; const left = into(tmp, s); f.items[1] = tmp[0]; if (left <= 0) a[i] = null; this.changed('furn'); return; }
    }
    if (this.mode === 'inventory' || this.mode === 'table') {
      if (d.armor && !inv.armor.slots[d.armor.slot]) { inv.armor.slots[d.armor.slot] = s; a[i] = null; this.g.sfx.play('equip'); return; }
      if (d.backpack && !inv.back.slots[0] && group === 'main') { inv.back.slots[0] = s; a[i] = null; this.g.sfx.play('equip'); this.layout(); return; }
      if (d.hook && !inv.hook.slots[0] && this.mode === 'inventory') { const one = Object.assign(cloneStack(s), { n: 1 }); inv.hook.slots[0] = one; s.n--; if (!s.n) a[i] = null; this.g.sfx.play('equip'); return; }
    }
    if (group === 'bp') { const left = inv.main.add(s); if (left <= 0) a[i] = null; return; }
    const order = i < 9 ? Array.from({ length: 27 }, (_, k) => k + 9) : Array.from({ length: 9 }, (_, k) => k);
    a[i] = null;
    const left = inv.main.add(s, order);
    if (left > 0) a[i] = s;
  }
  takeOutput(shift) {
    const g = this.g, p = this.lp.player;
    let made = 0, rare = null;
    for (let k = 0; k < (shift ? 64 : 1); k++) {
      const r = matchGrid(this.grid, this.W);
      if (!r) break;
      const out = mkStack(r.out, r.n, r.make ? r.make() : r.extra);
      if (r.repair !== undefined) { if (r.repair) out.d = r.repair; else delete out.d; }
      // upgrading a backpack keeps what was inside it
      const oldPack = this.grid.find(s => s && s.c && itemDef(s.id) && itemDef(s.id).backpack);
      if (oldPack && itemDef(r.out).backpack) out.c = oldPack.c.slice();
      if (!shift) {
        if (this.cursor && !(canMerge(this.cursor, out) && this.cursor.n + out.n <= maxStackOf(out.id))) break;
      }
      for (let i = 0; i < this.grid.length; i++) {
        const s = this.grid[i]; if (!s) continue;
        // buckets and bottles come back empty (milk for a cake, honey for a honey block)
        const back = r.keep && r.keep[s.id];
        s.n--;
        if (s.n <= 0) this.grid[i] = back ? mkStack(back, 1) : null;
        else if (back) { const left = p.inv.add(mkStack(back, 1)); if (left > 0) this.lp.throwStack(mkStack(back, left)); }
      }
      if (shift) { const left = p.inv.add(out); if (left > 0) this.lp.throwStack(Object.assign(out, { n: left })); }
      else if (this.cursor) this.cursor.n += out.n; else this.cursor = out;
      made += out.n;
      const d = itemDef(out.id);
      if (d.rarity) rare = out.id;
      if (shift && made >= 64) break;
    }
    if (!made) return;
    g.sfx.play('craft');
    if (rare && !g.meta.flags['made_' + rare]) { g.meta.flags['made_' + rare] = true; this.lp.grantXP(10); this.lp.toast('Crafted ' + itemDef(rare).name + '!', 'rare'); }
    this.render();
  }

  // ---- cursor & tooltips ---------------------------------------------------------------------
  renderCursor(e) {
    const el = this.root.querySelector('.cursor-item'); if (!el) return;
    if (!this.cursor) { el.hidden = true; return; }
    el.hidden = false; el.innerHTML = slotInner(this.cursor);
    const rr = this.root.getBoundingClientRect();
    const z = typeof uiZoom === 'function' ? uiZoom() : 1;   // (alpha 6) the panel is drawn at the interface size: screen pixels to its own
    if (e && e.clientX !== undefined) { this._cx = (e.clientX - rr.left) / z; this._cy = (e.clientY - rr.top) / z - (e.pointerType && e.pointerType !== 'mouse' ? 36 : 0); }
    else if (this.focus && this.focus.isConnected) { const fr = this.focus.getBoundingClientRect(); this._cx = (fr.left - rr.left + fr.width * 0.75) / z; this._cy = (fr.top - rr.top + fr.height * 0.75) / z; }
    if (this._cx !== undefined) { el.style.left = this._cx + 'px'; el.style.top = this._cy + 'px'; }
  }
  showTip(s, e) {
    const t = this.root.querySelector('.itip'); if (!t) return;
    if (!s || this.cursor) { t.hidden = true; return; }
    t.innerHTML = itemInfoHTML(s); t.hidden = false;
    const rr = this.root.getBoundingClientRect();
    const z = typeof uiZoom === 'function' ? uiZoom() : 1;
    const x = Math.min(rr.width / z - t.offsetWidth - 6, (e.clientX - rr.left) / z + 14), y = Math.min(rr.height / z - t.offsetHeight - 6, (e.clientY - rr.top) / z + 10);
    t.style.left = Math.max(4, x) + 'px'; t.style.top = Math.max(4, y) + 'px';
  }
  info(html) { const el = this.root.querySelector('.ip-info'); if (el) el.innerHTML = html; }

  // ---- events (delegated) ----------------------------------------------------------------------
  bind() {
    const R = this.root;
    let timer = null, longDone = false, downEl = null;
    R.addEventListener('contextmenu', (e) => e.preventDefault());
    R.addEventListener('pointerdown', (e) => {
      if (!this.mode) return;
      if (e.target.closest('input, label')) return;
      const slot = e.target.closest('.slot[data-g]');
      const book = e.target.closest('[data-r]');
      const ci = e.target.closest('[data-ci]'), cut = e.target.closest('[data-cut]');
      if (ci) { e.preventDefault(); e.stopPropagation(); this.creativePick(ci.dataset.ci, e.shiftKey); this.renderCursor(e); return; }
      if (cut) { e.preventDefault(); e.stopPropagation(); this.cutPick(Number(cut.dataset.cut), e.shiftKey); this.renderCursor(e); return; }
      const btn = e.target.closest('.bookbtn, .btab, .bookclose');
      e.preventDefault(); e.stopPropagation();
      this.g.sfx.unlock();
      if (btn) { if (btn.classList.contains('bookbtn') || btn.classList.contains('bookclose')) this.toggleBook(); else { this.bookCat = btn.dataset.cat; this.renderBook(); } return; }
      if (book) { this.bookPick(Number(book.dataset.r), e.shiftKey); return; }
      if (!slot) {
        // a click outside the panel with something on the cursor throws it
        if (this.cursor && !e.target.closest('.ipanel, .book')) {
          const n = e.button === 2 ? 1 : this.cursor.n;
          this.lp.throwStack(Object.assign(cloneStack(this.cursor), { n }));
          this.cursor.n -= n; if (this.cursor.n <= 0) this.cursor = null;
          this.renderCursor(e);
        }
        return;
      }
      const group = slot.dataset.g, i = Number(slot.dataset.i);
      downEl = slot; longDone = false;
      if (e.pointerType !== 'mouse') {
        clearTimeout(timer);
        timer = setTimeout(() => { longDone = true; this.slotClick(group, i, 'right', false); this.renderCursor(e); }, 380);
      } else if (this.cursor && !e.shiftKey && this.dragTarget(group, i)) {
        // holding something: drag across slots to spread it — right button one each, left button evenly (like the classic game)
        const right = e.button === 2;
        this.drag = { right, slots: [], orig: cloneStack(this.cursor), base: [] };
        this.dragAdd(group, i);
        this.renderCursor(e);
      } else { this.slotClick(group, i, e.button === 2 ? 'right' : 'left', e.shiftKey); this.renderCursor(e); }
    });
    R.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'mouse' && this.drag) {
        const d = this.drag; this.drag = null;
        // a plain left click (no drag) puts the whole stack down, or swaps, as before
        if (!d.right && d.slots.length === 1) { const [g0, i0] = d.slots[0]; this.arr(g0)[i0] = d.base[0]; this.cursor = d.orig; this.slotClick(g0, i0, 'left', false); }
        this.renderCursor(e); this.render();
        return;
      }
      if (e.pointerType === 'mouse' || !downEl) return;
      clearTimeout(timer);
      const slot = downEl; downEl = null;
      if (!longDone && slot.isConnected) { this.slotClick(slot.dataset.g, Number(slot.dataset.i), 'left', false); this.renderCursor(e); }
      // touch: show what was tapped
      const s = slot.isConnected ? this.arr(slot.dataset.g)[Number(slot.dataset.i)] : null;
      if (s) this.info(itemInfoHTML(s).replace(/<div/g, '<span').replace(/<\/div>/g, '</span> '));
    });
    R.addEventListener('pointercancel', () => { clearTimeout(timer); downEl = null; });
    R.addEventListener('pointermove', (e) => {
      if (!this.mode) return;
      if (this.drag && e.pointerType === 'mouse' && e.buttons) {
        const el = e.target.closest('.slot[data-g]');
        if (el) { const g0 = el.dataset.g, i0 = Number(el.dataset.i); if (!this.drag.slots.some(([a, b]) => a === g0 && b === i0) && this.dragTarget(g0, i0)) this.dragAdd(g0, i0); }
      }
      if (this.cursor || this.drag) this.renderCursor(e);
      if (e.pointerType !== 'mouse') return;
      const slot = e.target.closest('.slot[data-g], [data-r]');
      if (!slot) { this.hover = null; this.showTip(null); return; }
      if (slot.dataset.r !== undefined) { const r = RECIPES[Number(slot.dataset.r)]; this.hover = null; this.showTip(mkStack(r.out, r.n), e); return; }
      this.hover = { g: slot.dataset.g, i: Number(slot.dataset.i) };
      let s = this.arr(this.hover.g)[this.hover.i];
      if (this.hover.g === 'out' && this.match) s = mkStack(this.match.out, this.match.n);
      if (this.hover.g === 'sout' && this.staRes) s = this.staRes.out;
      this.showTip(s, e);
    });
    R.addEventListener('pointerleave', () => { this.hover = null; this.showTip(null); });
    // number keys swap the hovered slot with the hotbar
    window.addEventListener('keydown', (e) => {
      if (!this.mode || !this.hover || !this.lp.useKb) return;
      if (e.target && e.target.tagName === 'INPUT') return;
      const m = /^Digit([1-9])$/.exec(e.code);
      if (m) { this.hotbarSwap(this.hover.g, this.hover.i, Number(m[1]) - 1); e.preventDefault(); }
    });
  }

  // ---- per frame: gamepad navigation, closing, furnace progress -----------------------------------
  frame(dt, inp) {
    if (!this.mode) return;
    if (inp.pause || inp.padB || (inp.inventory && !inp.padY)) { this.lp.closeInventory(); return; }
    if (this.mode === 'furnace') this.furnaceBars();
    if (this.mode === 'machine') this.machineBars();
    if (this.mode === 'container' && !this.container()) { this.lp.closeInventory(); return; }
    if (inp.navX || inp.navY) {
      if (!this.focus || !this.focus.isConnected) this.setFocus(this.root.querySelector('.slot[data-g="main"]'));
      else this.moveFocus(inp.navX, inp.navY);
    }
    const f = this.focus && this.focus.isConnected ? this.focus : null;
    if (f && (inp.padA || inp.padX || inp.padY)) {
      if (f.dataset.g) this.slotClick(f.dataset.g, Number(f.dataset.i), inp.padX ? 'right' : 'left', !!inp.padY);
      else if (f.dataset.r !== undefined) this.bookPick(Number(f.dataset.r), !!inp.padY);
      else if (f.dataset.ci !== undefined) this.creativePick(f.dataset.ci, !!inp.padY);
      else if (f.dataset.cut !== undefined) this.cutPick(Number(f.dataset.cut), !!inp.padY);
      else if (f.classList.contains('bookbtn') || f.classList.contains('bookclose')) this.toggleBook();
      else if (f.dataset.cat) { this.bookCat = f.dataset.cat; this.renderBook(); }
      this.renderCursor();
    }
    if (inp.padLB || inp.padRB) { if (this.mode === 'inventory' || this.mode === 'table') this.toggleBook(); }
  }
  setFocus(el) {
    for (const o of this.root.querySelectorAll('.focus')) o.classList.remove('focus');
    this.focus = el || null;
    if (!el) return;
    el.classList.add('focus');
    if (el.dataset.g) {
      let s = this.arr(el.dataset.g)[Number(el.dataset.i)];
      if (el.dataset.g === 'out' && this.match) s = mkStack(this.match.out, this.match.n);
      if (el.dataset.g === 'sout' && this.staRes) s = this.staRes.out;
      this.info(s ? itemInfoHTML(s).replace(/<div/g, '<span').replace(/<\/div>/g, '</span> ') : '<span class="td">A take/place · X split · Y quick move · LB recipe book · B close</span>');
    } else if (el.dataset.r !== undefined) { this.bookSel = Number(el.dataset.r); this.renderBook(); const n = this.refind(el); if (n && n !== el) { this.focus = n; n.classList.add('focus'); } }
    if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.renderCursor();
  }
  // Spatial navigation: the nearest focusable thing in the pushed direction.
  moveFocus(dx, dy) {
    const cur = this.focus.getBoundingClientRect();
    const cx = cur.left + cur.width / 2, cy = cur.top + cur.height / 2;
    let best = null, bd = Infinity;
    for (const el of this.root.querySelectorAll('.slot[data-g], [data-r], [data-ci], [data-cut], .bookbtn, .btab, .bookclose')) {
      if (el === this.focus || el.offsetParent === null || el.classList.contains('cursor-item')) continue;
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
      const along = x * dx + y * dy;
      if (along <= 2) continue;
      const across = Math.abs(dx ? y : x);
      const d = along + across * 2.2;
      if (d < bd) { bd = d; best = el; }
    }
    if (best) { this.setFocus(best); this.g.sfx.play('tick'); }
  }
}
