// ---------------------------------------------------------------------------
// game/enchanting.js — 0.9.0.10: the enchanting table.
//
// Set a tool, weapon, piece of armour, bow, rod, staff or a plain book on the
// table with some lapis, and spend your levels on one of three offers. More
// bookshelves around the table (two blocks out, nothing in between) mean
// stronger offers, up to level 30 with fifteen shelves. The book floats over
// the table, turns to whoever comes near and leafs through its pages; little
// glyphs drift in to it from the shelves.
//
// Enchantments live on the stack itself (s.en = { sharp: 3, unb: 2 }) so they
// save, trade and travel with it. Books carry one each and go onto gear at the
// anvil (for levels); the grindstone takes enchantments off again and gives
// some of the experience back. Enchanted things shimmer, in the bag and in
// your hand.
// ---------------------------------------------------------------------------

const ENCH_TOOLS = ['pickaxe', 'axe', 'shovel', 'hoe'];
const ENCH_ARMOR = ['helmet', 'chest', 'legs', 'boots'];
const ENCH_DUR = ['sword', 'axe', 'pickaxe', 'shovel', 'hoe', 'shears', 'bow', 'rod', 'staff', 'igniter', ...ENCH_ARMOR];
// name, highest level, what it goes on, how common (weight), the least power that can give it, and what it can't share an item with
const ENCH = {
  sharp: { name: 'Sharpness', max: 5, on: ['sword', 'axe'], w: 10, group: 'dmg', desc: 'More damage' },
  smite: { name: 'Smite', max: 5, on: ['sword', 'axe'], w: 5, group: 'dmg', desc: 'Much more damage to the undead' },
  bane: { name: 'Bane of Arthropods', max: 5, on: ['sword', 'axe'], w: 5, group: 'dmg', desc: 'Much more damage to spiders, scorpions and mites' },
  knock: { name: 'Knockback', max: 2, on: ['sword'], w: 5, desc: 'Sends them flying' },
  fire: { name: 'Fire Aspect', max: 2, on: ['sword'], w: 2, minP: 10, desc: 'Sets what you hit alight' },
  loot: { name: 'Looting', max: 3, on: ['sword'], w: 2, minP: 14, desc: 'Creatures drop more' },
  eff: { name: 'Efficiency', max: 5, on: [...ENCH_TOOLS, 'shears'], w: 10, desc: 'Digs faster' },
  silk: { name: 'Silk Touch', max: 1, on: ENCH_TOOLS, w: 1, minP: 15, group: 'drop', desc: 'Blocks drop themselves' },
  fortune: { name: 'Fortune', max: 3, on: ENCH_TOOLS, w: 2, minP: 14, group: 'drop', desc: 'More gems and dust from ore' },
  unb: { name: 'Unbreaking', max: 3, on: ENCH_DUR, w: 5, desc: 'Wears out slower' },
  mend: { name: 'Mending', max: 1, on: ENCH_DUR, w: 2, treasure: true, desc: 'Experience you gain mends it' },
  prot: { name: 'Protection', max: 4, on: ENCH_ARMOR, w: 10, group: 'prot', desc: 'Less damage from everything' },
  fprot: { name: 'Fire Protection', max: 4, on: ENCH_ARMOR, w: 5, group: 'prot', desc: 'Less damage from fire and lava' },
  bprot: { name: 'Blast Protection', max: 4, on: ENCH_ARMOR, w: 2, group: 'prot', desc: 'Less damage from explosions' },
  pprot: { name: 'Projectile Protection', max: 4, on: ENCH_ARMOR, w: 5, group: 'prot', desc: 'Less damage from arrows and bolts' },
  thorns: { name: 'Thorns', max: 3, on: ['chest'], w: 1, minP: 10, desc: 'Hurts whatever hurts you' },
  resp: { name: 'Respiration', max: 3, on: ['helmet'], w: 2, desc: 'Breath lasts longer underwater' },
  aqua: { name: 'Aqua Affinity', max: 1, on: ['helmet'], w: 2, desc: 'Dig as fast underwater as on land' },
  feather: { name: 'Feather Falling', max: 4, on: ['boots'], w: 5, desc: 'Softer landings' },
  strider: { name: 'Depth Strider', max: 3, on: ['boots'], w: 2, minP: 10, desc: 'Walk faster through water' },
  power: { name: 'Power', max: 5, on: ['bow'], w: 10, desc: 'Arrows hit harder' },
  punch: { name: 'Punch', max: 2, on: ['bow'], w: 2, desc: 'Arrows knock back' },
  flame: { name: 'Flame', max: 1, on: ['bow'], w: 2, minP: 18, desc: 'Arrows set things alight' },
  inf: { name: 'Infinity', max: 1, on: ['bow'], w: 1, minP: 20, excl: ['mend'], desc: 'Never runs out of arrows (keep one)' },
  lure: { name: 'Lure', max: 3, on: ['rod'], w: 2, desc: 'Fish bite sooner' },
  luck: { name: 'Luck of the Sea', max: 3, on: ['rod'], w: 2, desc: 'More treasure on the line' },
  arcane: { name: 'Arcane Might', max: 3, on: ['staff'], w: 5, desc: 'Spells hit harder' },
  flow: { name: 'Mana Flow', max: 3, on: ['staff'], w: 5, desc: 'Mana comes back faster' },
};
ENCH.mend.excl = ['inf'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
function enchName(k, lv) { const E = ENCH[k]; return E ? E.name + (E.max > 1 || lv > 1 ? ' ' + (ROMAN[lv] || lv) : '') : k; }
// what sort of thing an item is, as far as enchanting goes
function enchKind(id) {
  if (id === 'book') return 'book';
  if (id === 'enchanted_book') return 'ebook';
  const d = itemDef(id); if (!d) return null;
  if (d.armor) return ENCH_ARMOR[d.armor.slot];
  if (d.tool) return { fishing: 'rod' }[d.tool.type] || d.tool.type;
  return null;
}
function enchApplies(k, kind) { const E = ENCH[k]; return !!E && (kind === 'book' || kind === 'ebook' || E.on.includes(kind)); }
function enchCompatible(en, k) {
  const E = ENCH[k];
  for (const o of Object.keys(en || {})) {
    if (o === k) continue;
    const O = ENCH[o]; if (!O) continue;
    if (E.group && E.group === O.group) return false;
    if ((E.excl && E.excl.includes(o)) || (O.excl && O.excl.includes(k))) return false;
  }
  return true;
}
// A treasure book from a chest or a trade decides what it holds the first time anyone looks.
function enchOf(s) {
  if (!s) return null;
  if (s.id === 'enchanted_book' && !s.en) s.en = enchRandomBook(Math.random, 8 + Math.floor(Math.random() * 24), true);
  return s.en || null;
}
function enchLv(s, k) { const en = s && s.en; return en && en[k] ? en[k] : 0; }
function enchArmorLv(p, k) { let n = 0; for (const s of p.inv.armor.slots) if (s && s.en && s.en[k]) n += s.en[k]; return n; }
function enchArmorMax(p, k) { let n = 0; for (const s of p.inv.armor.slots) if (s && s.en && s.en[k]) n = Math.max(n, s.en[k]); return n; }
// how readily a material takes enchantments
function enchantability(id) {
  const d = itemDef(id), kind = enchKind(id);
  if (kind === 'book') return 1;
  if (kind === 'bow' || kind === 'rod' || kind === 'shears' || kind === 'igniter') return 6;
  if (kind === 'staff') return 18;
  const m = /^([a-z]+)_/.exec(id), mat = m ? m[1] : '';
  const armor = !!(d && d.armor);
  const T = armor ? { leather: 15, chainmail: 12, iron: 9, gold: 25, diamond: 10, copper: 11, bronze: 12, silver: 18, steel: 10, mithril: 20, adamantite: 12, cinderite: 15, dragonscale: 18, mage: 22, archmage: 24, frost: 14 }
    : { wooden: 15, wood: 15, stone: 5, iron: 14, gold: 22, golden: 22, diamond: 10, copper: 12, bronze: 13, silver: 20, steel: 11, mithril: 22, adamantite: 13, cinderite: 16 };
  return T[mat] || 10;
}
// how high a level an enchantment reaches for a given power
function enchLevelFor(k, P) {
  const E = ENCH[k];
  if (P < (E.minP || 1)) return 0;
  return clamp(1 + Math.floor((P - 1) * E.max / 40), 1, E.max);
}
function enchPickWeighted(list, r) {
  let t = 0; for (const [k] of list) t += ENCH[k].w;
  let q = r() * t;
  for (const e of list) { q -= ENCH[e[0]].w; if (q <= 0) return e; }
  return list[list.length - 1];
}
// What an offer of a given level puts on a kind of item.
function enchRoll(kind, L, E, r) {
  let P = L + 1 + Math.floor(r() * (E / 4 + 1)) + Math.floor(r() * (E / 4 + 1));
  P = Math.max(1, Math.round(P * (1 + (r() + r() - 1) * 0.15)));
  const pool = Object.keys(ENCH).filter(k => !ENCH[k].treasure && enchApplies(k, kind));
  const out = {};
  const pick = (pw) => {
    const c = pool.filter(k => !out[k] && enchCompatible(out, k)).map(k => [k, enchLevelFor(k, pw)]).filter(e => e[1] > 0);
    if (!c.length) return false;
    const [k, lv] = enchPickWeighted(c, r); out[k] = lv; return true;
  };
  if (!pick(P)) { const k = pool.find(k => enchLevelFor(k, 1)); if (k) out[k] = 1; }
  // books hold one; gear can come out with more
  if (kind !== 'book') { let pw = P; while (r() < (pw + 1) / 50) { if (!pick(pw)) break; pw = Math.floor(pw / 2); } }
  return out;
}
// One enchantment for a book found or bought.
function enchRandomBook(r, P, treasure) {
  const pool = Object.keys(ENCH).filter(k => treasure || !ENCH[k].treasure);
  const c = pool.map(k => [k, ENCH[k].treasure ? 1 : enchLevelFor(k, P)]).filter(e => e[1] > 0);
  const [k, lv] = enchPickWeighted(c, r);
  return { [k]: lv };
}
// The three offers on the table for this item, this many shelves and this player.
function enchOffers(stack, shelves, seed) {
  const kind = stack && enchKind(stack.id);
  if (!kind || kind === 'ebook' || (stack.en && Object.keys(stack.en).length)) return null;
  let h = seed >>> 0; for (const ch of stack.id) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
  const r = mulberry32(h), n = Math.min(15, shelves), E = enchantability(stack.id);
  const base = 1 + Math.floor(r() * 8) + Math.floor(n / 2) + Math.floor(r() * (n + 1));
  const lv = [Math.max(Math.floor(base / 3), 1), Math.floor(base * 2 / 3) + 1, Math.max(base, n * 2)];
  return lv.map((L, i) => ({ level: L, cost: i + 1, en: enchRoll(kind, L, E, r) }));
}
// bookshelves two blocks out round the table, with air (or a carpet, a torch...) between
function enchShelves(w, x, y, z) {
  let n = 0;
  const shelf = (id) => id === B.bookshelf || (B.bookcase !== undefined && id === B.bookcase);
  for (let dy = 0; dy <= 1; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2) continue;
    if (!shelf(w.getBlock(x + dx, y + dy, z + dz))) continue;
    const mx = x + Math.sign(dx) * (Math.abs(dx) === 2 ? 1 : 0), mz = z + Math.sign(dz) * (Math.abs(dz) === 2 ? 1 : 0);
    if (T_SOLID[w.getBlock(mx, y + dy, mz)] && T_OPAQUE[w.getBlock(mx, y + dy, mz)]) continue;
    n++;
  }
  return n;
}
// little runes for the offers, like the old game's alphabet
const ENCH_RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
function enchRunes(seed, n) { const r = mulberry32(seed); let s = ''; for (let i = 0; i < n; i++) s += (i && r() < 0.2 ? ' ' : '') + ENCH_RUNES[Math.floor(r() * ENCH_RUNES.length)]; return s; }
function spendLevels(p, n) { p.level = Math.max(0, p.level - n); p.xp = Math.min(p.xp, xpForLevel(p.level) - 1); }

// ---- items, recipes, pictures ---------------------------------------------------------------------------
defItem('enchanted_book', { name: 'Enchanted Book', maxStack: 1, rarity: 'rare', desc: 'Put it on gear at an anvil, with some of your levels.' });
defItem('experience_bottle', { name: 'Bottle o\' Enchanting', rarity: 'rare', drink: 'milk', xpBottle: true, desc: 'Use to break it open: a little experience pours out.' });
RECIPES.push({ out: 'enchanting_table', n: 1, shape: [' B ', 'DOD', 'OOO'], key: { B: 'book', D: 'diamond', O: 'obsidian' } });
ITEMS.enchanting_table.desc = 'Lapis and your levels: three offers. Bookshelves two blocks around it make them stronger.';
ITEMS.lapis_lazuli.desc = 'Spent at the enchanting table.';
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('ench_bottom', p => { p.noise(H('#1c1430'), 0.25); p.speck(H('#3a2a5a'), 0.1); });
    addTile('ench_side', p => {
      p.noise(H('#1e1630'), 0.22);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        if (y < 4) p.set(x, y, shade(H(y === 3 ? '#6a1018' : '#a8202c'), 0.92 + p.rand() * 0.12));     // the red cloth hanging over
        else if ((x + y * 3) % 9 === 0) p.set(x, y, H('#3a2a5a'));
      }
      for (let x = 1; x < 16; x += 3) p.set(x, 4, H('#7a1018'));
      p.set(0, 0, H('#5ee6e0')); p.set(15, 0, H('#5ee6e0'));
    });
    addTile('ench_top', p => {
      p.noise(H('#a8202c'), 0.12);
      for (let i = 0; i < 16; i++) { p.set(i, 0, H('#6a1018')); p.set(i, 15, H('#6a1018')); p.set(0, i, H('#6a1018')); p.set(15, i, H('#6a1018')); }
      for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]]) { p.set(x, y, H('#5ee6e0')); p.set(x + (x < 8 ? 1 : -1), y, H('#2aa6a8')); p.set(x, y + (y < 8 ? 1 : -1), H('#2aa6a8')); }
      for (let i = 3; i < 13; i++) { p.set(i, 3, H('#c8a040')); p.set(i, 12, H('#c8a040')); p.set(3, i, H('#c8a040')); p.set(12, i, H('#c8a040')); }
    });
    addTile('ench_cover', p => { p.noise(H('#6a3a1a'), 0.18); for (let i = 0; i < 16; i++) { p.set(i, 0, H('#3a1e0a')); p.set(i, 15, H('#3a1e0a')); } for (let y = 5; y < 11; y++) for (let x = 6; x < 10; x++) p.set(x, y, H('#c8a040')); p.set(7, 7, H('#5ee6e0')); p.set(8, 8, H('#5ee6e0')); });
    addTile('ench_page', p => { p.noise(H('#ece2c4'), 0.06); for (let y = 2; y < 15; y += 2) for (let x = 2; x < 14; x++) if (p.rand() < 0.7) p.set(x, y, H('#6a5a4a')); });
    for (let i = 0; i < 6; i++) addTile('ench_glyph_' + i, p => {
      const r = mulberry32(i * 977 + 13), c = H('#e8e0ff');
      let x = 4 + Math.floor(r() * 3), y = 3 + Math.floor(r() * 3);
      for (let k = 0; k < 18; k++) { p.set(x, y, c); p.set(x + 1, y, c); const d = Math.floor(r() * 4); x = clamp(x + [1, -1, 0, 0][d] * 2, 2, 12); y = clamp(y + [0, 0, 1, -1][d] * 2, 2, 12); }
    });
    addItem('enchanted_book', p => p.art(['................', '................', '...aaaaaaaaaa...', '..aBBBBBBBBBBa..', '..aBbbbbbbbbBaw.', '..aBbGGGGGGbBaw.', '..aBbGccccGbBaw.', '..aBbGcLLcGbBaw.', '..aBbGcLLcGbBaw.', '..aBbGccccGbBaw.', '..aBbGGGGGGbBaw.', '..aBbbbbbbbbBaw.', '..aBBBBBBBBBBaw.', '...aaaaaaaaaawww', '................', '................'],
      { a: H('#2a1a3a'), B: H('#6a2a8a'), b: H('#8a3aa8'), G: H('#d8b040'), c: H('#a85ad8'), L: H('#e8d0ff'), w: H('#ece2c4') }));
    // (the whistle from 0.9.0.8 never had its picture)
    addItem('whistle', p => p.art(['................', '................', '................', '................', '..........ss....', '.........s..s...', '....bbbbbbbs.s..', '...bWWWWWWkbs...', '..bWWWWwWWWWb...', '..bWWWWWWWWWb...', '...bwwwwwwwb....', '....bbbbbbb.....', '................', '................', '................', '................'],
      { b: H('#5a4a3a'), W: H('#f0e8d8'), w: H('#c8bca8'), k: H('#1a1410'), s: H('#a8885a') }));
    addItem('experience_bottle', p => p.art(['................', '......aaaa......', '......aSSa......', '.......aa.......', '......aGGa......', '.....aGgLGa.....', '....aGgggLGa....', '....aGgYggGa....', '....aGggggGa....', '....aGgggYGa....', '....aGgYggGa....', '.....aGgggGa....', '......aaaaa.....', '................', '................', '................'],
      { a: H('#1a2a1a'), S: H('#8a6a4a'), G: H('#a8e8ff'), g: H('#6ad850'), L: H('#e8ffd0'), Y: H('#f6f070') }));
  };
}
SHAPES.enchanting_table = [{ b: [0, 0, 0, 16, 12, 16], side: 'ench_side', end: 'ench_top' }];
// the cleric has the bottles; dungeons and towers keep the odd book
{
  const cl = NPC_SHOPS.cleric; if (cl) cl.buy = cl.buy.filter(t => t[0] !== 'experience_bottle').concat([['experience_bottle', 2, 3, 1]]);
  const lib = NPC_SHOPS.librarian; if (lib) lib.buy.push(['enchanted_book', 1, 9, 1], ['enchanted_book', 1, 14, 2]);
  if (typeof DUNGEON_LOOT !== 'undefined') { DUNGEON_LOOT.common.push(['enchanted_book', 1, 1, 0.12]); DUNGEON_LOOT.rare.push(['enchanted_book', 1, 1, 0.35], ['experience_bottle', 2, 5, 0.3]); DUNGEON_LOOT.boss.push(['enchanted_book', 1, 2, 0.6]); }
}

// ---- stacks keep their enchantments (saves, chests, the network) ---------------------------------------
{
  const baseNorm = normalizeStack;
  normalizeStack = function (s) {
    const o = baseNorm(s);
    if (o && s && s.en && typeof s.en === 'object') {
      const en = {}; for (const k of Object.keys(s.en)) if (ENCH[k]) en[k] = clamp(s.en[k] | 0, 1, 10);
      if (Object.keys(en).length) o.en = en;
    }
    return o;
  };
  const baseMerge = canMerge;
  canMerge = function (a, b) { return baseMerge(a, b) && !a.en && !b.en; };
  // a dropped thing carries everything on its stack, not just what it is and how many
  const baseSnap = DroppedItem.prototype.snap;
  DroppedItem.prototype.snap = function () {
    const s = baseSnap.call(this), st = this.stack, x = {};
    for (const k of Object.keys(st)) if (k !== 'id' && k !== 'n') x[k] = st[k];
    if (Object.keys(x).length) s.x2 = JSON.parse(JSON.stringify(x));
    return s;
  };
  const baseMake = netMake;
  netMake = function (g, s, ghost, owner) {
    const e = baseMake(g, s, ghost, owner);
    if (e && s.k === 'i' && s.x2 && e.stack) { const n = normalizeStack(Object.assign({ id: e.stack.id, n: e.stack.n }, s.x2)); if (n) e.stack = n; }
    return e;
  };
  // the shimmer on a dropped enchanted thing
  const baseDraws = DroppedItem.prototype.draws;
  DroppedItem.prototype.draws = function (out) {
    const n0 = out.length; baseDraws.call(this, out);
    if (this.stack && (this.stack.en || this.stack.id === 'enchanted_book' || this.stack.id === 'experience_bottle')) for (let i = n0; i < out.length; i++) out[i].glint = 1;
  };
}

// ---- how they look in the bag: a shimmer over the picture, and the list in the tooltip -----------------
{
  const baseInner = slotInner;
  slotInner = function (s) {
    let h = baseInner(s);
    if (s && (s.en || s.id === 'enchanted_book' || s.id === 'experience_bottle')) h += `<i class="glint" style="--gp:${iconPos(s.id)}"></i>`;
    return h;
  };
  const baseInfo = itemInfoHTML;
  itemInfoHTML = function (s) {
    let h = baseInfo(s);
    const en = s && enchOf(s);
    if (en) {
      const lines = Object.keys(en).filter(k => ENCH[k]).map(k => `<div class="ts en">${esc(enchName(k, en[k]))}${s.id === 'enchanted_book' ? ` <span class="td">· ${esc(ENCH[k].desc)}</span>` : ''}</div>`).join('');
      const i = h.indexOf('</div>');
      h = i >= 0 ? h.slice(0, i + 6) + lines + h.slice(i + 6) : lines + h;
      h = h.replace('class="tn ', 'class="tn enchanted ');
    }
    return h;
  };
  const baseCSS = installIconCSS;
  installIconCSS = function () {
    baseCSS();
    const st = document.getElementById('vx-icon-css'); if (!st) return;
    const u = `url(${ICONS.url})`, sz = `${ICONS.cols * 100}% ${ICONS.rows * 100}%`;
    st.textContent += `.glint{-webkit-mask-image:${u};mask-image:${u};-webkit-mask-size:${sz};mask-size:${sz};-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-position:var(--gp);mask-position:var(--gp)}`;
  };
}

// ---- the table's panel ---------------------------------------------------------------------------------------
{
  const isEnch = (ui) => ui.mode === 'station' && ui.opts && ui.opts.kind === 'enchant';
  const baseBuild = InvUI.prototype.build;
  InvUI.prototype.build = function () {
    baseBuild.call(this);
    if (!isEnch(this)) return;
    const top = this.root.querySelector('.ip-top');
    top.innerHTML = `<div class="ench"><div class="ench-in"><div class="fslot sa"></div><div class="fslot sb"></div></div><div class="ench-opts"></div></div><div class="mach-status"></div>`;
    this.layout();
  };
  const baseLayout = InvUI.prototype.layout;
  InvUI.prototype.layout = function () {
    baseLayout.call(this);
    if (!isEnch(this)) return;
    const v = this.lp.view, bpRows = Math.ceil((this.lp.player.inv.backpackSlots() || []).length / 9);
    const rows = 3.9 + 6.1 + (bpRows ? bpRows + 0.65 : 0) + 0.55;
    const size = Math.floor(clamp(Math.min((v.w - 28) / 9.9, (v.h - 28) / rows), 16, 44));
    this.root.style.setProperty('--is', size + 'px');
  };
  InvUI.prototype.enchState = function () {
    const pos = this.opts.pos, g = this.g, p = this.lp.player, a = this.arr('sta');
    const shelves = pos ? enchShelves(g.world, pos[0], pos[1], pos[2]) : 0;
    const st = p.stats || (p.stats = {});
    if (!st.enchSeed) st.enchSeed = (Math.random() * 0x7fffffff) | 1;
    return { shelves, offers: a[0] ? enchOffers(a[0], shelves, st.enchSeed) : null, lapis: a[1] && a[1].id === 'lapis_lazuli' ? a[1].n : 0 };
  };
  const baseRender = InvUI.prototype.renderStation;
  InvUI.prototype.renderStation = function () {
    if (!isEnch(this)) return baseRender.call(this);
    const R = this.root, a = this.arr('sta'), p = this.lp.player, cr = this.g.creative;
    const sa = R.querySelector('.fslot.sa'); if (!sa) return;
    sa.innerHTML = this.slotHTML('sta', 0, a[0], '', 'iron_sword');
    R.querySelector('.fslot.sb').innerHTML = this.slotHTML('sta', 1, a[1], '', 'lapis_lazuli');
    const S = this.enchState(); this.enchS = S;
    let h = '';
    for (let i = 0; i < 3; i++) {
      const o = S.offers && S.offers[i];
      if (!o) { h += `<div class="ench-opt off" data-cut="${i}"><span class="eo-runes"></span></div>`; continue; }
      const ks = Object.keys(o.en), first = ks[0];
      const can = cr || (p.level >= o.level && S.lapis >= o.cost);
      const hint = first ? enchName(first, o.en[first]) + (ks.length > 1 ? ' …' : '') : '';
      h += `<div class="ench-opt${can ? '' : ' no'}" data-cut="${i}" title="${esc(hint)}"><span class="eo-cost">${'●'.repeat(o.cost)}</span><span class="eo-runes">${enchRunes((p.stats.enchSeed + i * 131 + o.level) | 0, 9 + i * 3)}</span><span class="eo-hint">${esc(hint)}</span><b class="eo-lv${p.level >= o.level || cr ? '' : ' low'}">${o.level}</b></div>`;
    }
    R.querySelector('.ench-opts').innerHTML = h;
    const st = R.querySelector('.mach-status');
    if (st) st.textContent = a[0] && !S.offers ? (enchKind(a[0].id) && a[0].en ? 'Already enchanted — use books at an anvil to add more' : 'That can\'t be enchanted')
      : !a[0] ? `Put in something to enchant, and lapis · ${S.shelves} bookshelf${S.shelves === 1 ? '' : 's'} around (15 for the strongest)`
      : `Costs the levels shown on the right, and 1-3 lapis · you have ${p.level} level${p.level === 1 ? '' : 's'}`;
  };
  // picking an offer (the offers ride on the stonecutter's clickable rows, so mouse, touch and pads all work)
  const baseCut = InvUI.prototype.cutPick;
  InvUI.prototype.cutPick = function (i, all) {
    if (!isEnch(this)) return baseCut.call(this, i, all);
    const a = this.arr('sta'), p = this.lp.player, g = this.g, S = this.enchS || this.enchState();
    const o = S.offers && S.offers[i]; if (!o || !a[0]) return;
    if (!g.creative && (p.level < o.level || S.lapis < o.cost)) { this.lp.toast(p.level < o.level ? `You need level ${o.level}` : `That takes ${o.cost} lapis`, 'warn'); g.sfx.play('click_off'); return; }
    const item = a[0];
    if (item.id === 'book') { a[0] = { id: 'enchanted_book', n: 1, en: o.en }; if (item.n > 1) this.giveBack({ id: 'book', n: item.n - 1 }); }
    else item.en = Object.assign({}, o.en);
    if (!g.creative) { spendLevels(p, o.cost); a[1].n -= o.cost; if (a[1].n <= 0) a[1] = null; }
    p.stats.enchSeed = (Math.random() * 0x7fffffff) | 1;
    p.stats.enchanted = (p.stats.enchanted || 0) + 1;
    g.sfx.play('enchant');
    const pos = this.opts.pos;
    if (pos) for (let k = 0; k < 26; k++) { const t = Math.random() * TAU, r = 0.3 + Math.random() * 0.6; spellSpark(g, pos[0] + 0.5 + Math.cos(t) * r, pos[1] + 1 + Math.random() * 0.8, pos[2] + 0.5 + Math.sin(t) * r, 'ench_glyph_' + (k % 6), { vy: 0.6 + Math.random(), life: 0.9, size: 0.12 }); }
    if (typeof gearGain === 'function') { /* enchanting is its own reward */ }
    this.render();
  };
  const baseAccepts = InvUI.prototype.accepts;
  InvUI.prototype.accepts = function (group, i, s) {
    if (group === 'sta' && isEnch(this)) return i === 1 ? s.id === 'lapis_lazuli' : !!enchKind(s.id) && enchKind(s.id) !== 'ebook';
    return baseAccepts.call(this, group, i, s);
  };
  // shift-click from the bag: lapis to its slot, the rest to the table
  const baseQuick = InvUI.prototype.quickMove;
  InvUI.prototype.quickMove = function (group, i) {
    if (isEnch(this) && (group === 'main' || group === 'bp')) {
      const a = this.arr(group), s = a[i], c = this.arr('sta');
      if (s.id === 'lapis_lazuli') { if (!c[1]) { c[1] = s; a[i] = null; } else if (c[1].id === s.id) { const mv = Math.min(64 - c[1].n, s.n); c[1].n += mv; s.n -= mv; if (!s.n) a[i] = null; } }
      else if (!c[0] && this.accepts('sta', 0, s)) { c[0] = Object.assign(cloneStack(s), { n: 1 }); s.n--; if (!s.n) a[i] = null; }
      return;
    }
    return baseQuick.call(this, group, i);
  };
}

// ---- what enchantments do ------------------------------------------------------------------------------------
const ARTHROPOD = /spider|scorpion|mite|bee|silverfish|beetle|tick/;
{
  // the held tool, as the enchantments make it: faster, sharper, burning
  const baseTool = LocalPlayer.prototype.heldTool;
  LocalPlayer.prototype.heldTool = function () {
    const t = baseTool.call(this), h = this.player.inv.held;
    if (!t || !h || !h.en) return t;
    const en = h.en, o = Object.assign({}, t, { ench: en });
    if (en.eff) o.speed = t.speed + en.eff * en.eff + 1;
    if (en.sharp) o.damage = t.damage + 0.5 * en.sharp + 0.5;
    if (en.fire && !t.element) o.element = 'fire';
    return o;
  };
  // smite, bane, knockback (with a melee weapon); flame and punch (arrows); looting
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const a = src.attacker, h = a && a.player && a.player.inv && a.player.inv.held;
    const en = src.tool === 'arrow' ? null : src.en || (h && h.en && src.weapon === h.id ? h.en : null);     // (a guest's blow brings its enchantments along)
    if (en) {
      const T = this.T || {};
      if (en.smite && (T.undead || /ghoul|skeleton|stray|husk|drowned|wraith|zombie|wight|lich|revenant/.test(this.type))) amount += 2.5 * en.smite;
      if (en.bane && ARTHROPOD.test(this.type)) { amount += 2.5 * en.bane; this.slowT = Math.max(this.slowT || 0, 1 + Math.random() * 0.5 * en.bane); }
      if (en.knock) src = Object.assign({}, src, { knock: (src.knock || 5) * (1 + 0.8 * en.knock) });
      if (en.fire && !T.fireImmune) { const r = baseHurt.call(this, amount, src); if (this.alive) this.burn = Math.max(this.burn || 0, 4 * en.fire); return r; }
    }
    const arrow = src.tool === 'arrow' ? Arrow._cur : null;
    if (arrow && arrow.punch) src = Object.assign({}, src, { knock: (src.knock || 3) * (1 + 1.2 * arrow.punch) });
    const r = baseHurt.call(this, amount, src);
    if (arrow && arrow.flame && this.alive && !(this.T && this.T.fireImmune)) this.burn = Math.max(this.burn || 0, 5);
    return r;
  };
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src = {}) {
    const a = src.attacker, h = a && a.player && a.player.inv && a.player.inv.held;
    const loot = src.en && src.en.loot ? src.en.loot : h && h.en && h.en.loot && src.weapon === h.id ? h.en.loot : 0;
    baseDie.call(this, src);
    if (!loot || this.baby || !this.T.drops) return;
    for (const [id, , , ch] of this.T.drops) {
      if (!itemDef(id) || this.T.boss) continue;
      let n = 0; for (let k = 0; k < loot; k++) if (Math.random() < Math.min(1, ch + 0.1)) n += Math.random() < 0.5 ? 1 : 0;
      if (n > 0) this.game.dropItem(mkStack(id, n), this.x, this.y + 0.5, this.z, true);
    }
  };
  // aqua affinity: no slowdown digging with your head underwater
  const baseBreak = LocalPlayer.prototype.breakTime;
  LocalPlayer.prototype.breakTime = function (id, hit) {
    const t = baseBreak.call(this, id, hit);
    return this.player.contacts && this.player.contacts.eyeWater && enchArmorMax(this.player, 'aqua') ? t / 3 : t;
  };
  // unbreaking: each bit of wear may not happen
  const baseWear = LocalPlayer.prototype.wearHeld;
  LocalPlayer.prototype.wearHeld = function (n) {
    const h = this.player.inv.held, u = enchLv(h, 'unb');
    if (u && n > 0) { let k = 0; for (let i = 0; i < n; i++) if (Math.random() < 1 / (u + 1)) k++; n = k; }
    return baseWear.call(this, n);
  };
  Player.prototype.wearArmor = function () {
    const a = this.inv.armor.slots;
    for (let i = 0; i < 4; i++) {
      const s = a[i]; if (!s) continue;
      const d = itemDef(s.id); if (!d || !d.armor) continue;
      const u = enchLv(s, 'unb'); if (u && Math.random() > 0.6 + 0.4 / (u + 1)) continue;
      s.d = (s.d || 0) + 1;
      if (s.d >= d.armor.durability) { a[i] = null; this.brokeSomething = itemName(s); }
    }
  };
  // protection of every kind
  const basePHurt = Player.prototype.hurt;
  Player.prototype.hurt = function (amount, source = {}) {
    if (!source.bypassArmor || source.type === 'fall') {
      let epf = enchArmorLv(this, 'prot');
      const t = source.type, el = source.element;
      if (el === 'fire' || t === 'lava' || t === 'burn') epf += 2 * enchArmorLv(this, 'fprot');
      if (t === 'explosion') epf += 2 * enchArmorLv(this, 'bprot');
      if (t === 'arrow' || t === 'projectile' || t === 'magic_bolt') epf += 2 * enchArmorLv(this, 'pprot');
      if (t === 'fall') epf = 3 * enchArmorLv(this, 'feather');
      if (epf > 0) amount *= 1 - Math.min(0.6, epf * 0.025);   // (0.9.0.24) was 4% a level to 80%: with armour and skill it stacked to 95%
    }
    return basePHurt.call(this, amount, source);
  };
  // respiration: breath lasts longer
  const baseCharm = PlayerInventory.prototype.charmBonus;
  PlayerInventory.prototype.charmBonus = function (kind) {
    let b = baseCharm.call(this, kind);
    if (kind === 'breath') for (const s of this.armor.slots) if (s && s.en && s.en.resp) b += s.en.resp;
    return b;
  };
  // thorns: whatever hits you gets a little back
  const baseLHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const p = this.player, before = p.health;
    const r = baseLHurt.call(this, amount, src);
    const a = src.attacker, th = enchArmorMax(p, 'thorns');
    if (th && a instanceof Mob && a.alive && p.health < before && Math.random() < 0.15 * th + 0.1) {
      a.hurt(1 + Math.floor(Math.random() * 3), { attacker: this, knock: 1, type: 'thorns' });
      this.g.sfx.playAt('hit', a.x, a.y + a.h / 2, a.z);
      for (const s of p.inv.armor.slots) if (s && s.en && s.en.thorns) s.d = (s.d || 0) + 1;
    }
    return r;
  };
  // mending: experience goes into mending your gear first
  const baseXP = LocalPlayer.prototype.grantXP;
  LocalPlayer.prototype.grantXP = function (n, x, y, z) {
    const p = this.player, inv = p.inv;
    const worn = [inv.held, inv.offhand, ...inv.armor.slots].filter(s => s && s.en && s.en.mend && s.d > 0);
    if (worn.length && n > 0) {
      const s = worn[Math.floor(Math.random() * worn.length)], fix = Math.min(s.d, n * 2);
      s.d -= fix; n -= Math.ceil(fix / 2);
      if (n <= 0) { if (x !== undefined) this.floatText(x, y, z, 'Mended', '#c9a6ff'); return; }
    }
    return baseXP.call(this, n, x, y, z);
  };
  // silk touch and fortune
  const SILK_NO = new Set(['grave', 'monster_spawner', 'item_pile', 'backpack_block', 'pocket_wall', 'fire', 'soul_fire', 'farmland']);
  const baseDrops = Game.prototype.dropBlockItems;
  Game.prototype.dropBlockItems = function (x, y, z, id, washed, meta = 0, tool = null) {
    const en = tool && tool.ench, b = BLOCKS[id];
    if (en && en.silk && !washed && b && this.rules().blockDrops && ITEMS[b.key] && !UNOBTAINABLE.has(b.key) && !SILK_NO.has(b.key) && !b.crop && !b.door && !b.bed && !b.double && T_SHAPE[id] !== SHAPE.SLAB && b.drop !== b.key) {
      this.dropItem(mkStack(b.key, 1), x + 0.5, y + 0.4, z + 0.5, true); return;
    }
    if (en && en.fortune && b && !washed && b.drop && b.drop !== b.key && (/_ore$|^glowstone$/.test(b.key) || b.dropCount)) {
      const real = this.dropItem, extra = Math.max(0, Math.floor(Math.random() * (en.fortune + 2)) - 1);
      this.dropItem = function (s, ...rest) { if (s && s.id === b.drop) s.n += extra * Math.max(1, Math.round(s.n / 2)); return real.call(this, s, ...rest); };
      try { return baseDrops.call(this, x, y, z, id, washed, meta, tool); } finally { delete this.dropItem; }
    }
    return baseDrops.call(this, x, y, z, id, washed, meta, tool);
  };
  // a guest's blow carries its weapon's enchantments to the host
  const baseSendHit = Net.prototype.sendHit;
  Net.prototype.sendHit = function (e, amount, src = {}) {
    const a = src.attacker, h = a && a.player && a.player.inv && a.player.inv.held;
    if (!(h && h.en && src.weapon === h.id)) return baseSendHit.call(this, e, amount, src);
    this.send = (m) => { if (m && m.t === 'hit' && m.s) m.s.en = h.en; return Net.prototype.send.call(this, m); };
    try { return baseSendHit.call(this, e, amount, src); } finally { delete this.send; }
  };
  // the bow: power, punch, flame, infinity
  const baseShoot = LocalPlayer.prototype.shootArrow;
  LocalPlayer.prototype.shootArrow = function (power) {
    const g = this.g, inv = this.player.inv, bow = inv.held, en = bow && bow.en;
    if (!en) return baseShoot.call(this, power);
    const before = inv.count('arrow') + (inv.offhand && inv.offhand.id === 'arrow' ? inv.offhand.n : 0);
    const realAdd = g.addEntity;
    g.addEntity = function (e) {
      if (e instanceof Arrow) {
        if (en.power) e.damage *= 1 + 0.25 * (en.power + 1);
        if (en.punch) e.punch = en.punch;
        if (en.flame) { e.flame = 1; e.burning = true; }
        if (en.inf) e.pickup = false;
      }
      return realAdd.call(this, e);
    };
    try { baseShoot.call(this, power); } finally { delete g.addEntity; }
    const after = inv.count('arrow') + (inv.offhand && inv.offhand.id === 'arrow' ? inv.offhand.n : 0);
    if (en.inf && after < before) { if (inv.offhand && inv.offhand.id === 'arrow' && before - after === 1 && inv.count('arrow') === after - inv.offhand.n) inv.offhand.n++; else inv.add(mkStack('arrow', 1)); }
  };
  const baseArrowUpd = Arrow.prototype.update;
  Arrow.prototype.update = function (dt) {
    Arrow._cur = this;
    try { return baseArrowUpd.call(this, dt); } finally { Arrow._cur = null; }
  };
  // a flaming arrow trails fire
  const baseArrowDraws = Arrow.prototype.draws;
  Arrow.prototype.draws = function (out) { baseArrowDraws.call(this, out); if ((this.flame || this.fl) && !this.stuck && Math.random() < 0.6) this.game.flame(this.x, this.y, this.z); };
  const baseSnap = netSnap;
  netSnap = function (e) { const s = baseSnap(e); if (s && e instanceof Arrow) { if (e.flame) s.fl = 1; if (e.punch) s.pu = e.punch; } return s; };
  const baseMake = netMake;
  netMake = function (g, s, ghost, owner) { const e = baseMake(g, s, ghost, owner); if (e && s.k === 'a') { if (s.fl) { e.flame = 1; e.burning = true; } if (s.pu) e.punch = s.pu; } return e; };
  // depth strider: wading isn't so slow
  const baseMove = Player.prototype.move;
  Player.prototype.move = function (w, inp, dt, opts = {}) {
    const ds = enchArmorMax(this, 'strider');
    if (ds && this.contacts && this.contacts.water && !this.swimming && !this.flying) opts = Object.assign({}, opts, { slow: (opts.slow || 1) * (1 + ds * 0.39) });
    return baseMove.call(this, w, inp, dt, opts);
  };
  // the staff: arcane might, mana flow
  const baseStaff = LocalPlayer.prototype.heldStaff;
  if (baseStaff) LocalPlayer.prototype.heldStaff = function () {
    const st = baseStaff.call(this), h = this.player.inv.held;
    return st && h && h.en && h.en.arcane ? Object.assign({}, st, { power: st.power * (1 + 0.15 * h.en.arcane) }) : st;
  };
  if (typeof manaRegen === 'function') {
    const baseRegen = manaRegen;
    manaRegen = function (p) { const h = p.inv.held; return baseRegen(p) + (h && h.en && h.en.flow ? 0.3 * h.en.flow : 0); };
  }
  // the fishing rod: lure and luck of the sea
  let FISH_LUCK = 0;
  if (typeof Bobber === 'function') {
    const baseBob = Bobber.prototype.update;
    Bobber.prototype.update = function (dt) {
      const was = this.state, h = this.lp && this.lp.player && this.lp.player.inv.held;
      FISH_LUCK = enchLv(h, 'luck');
      baseBob.call(this, dt);
      const lure = enchLv(h, 'lure');
      if (lure && was === 'fly' && this.state === 'float') this.waitT = Math.max(2, this.waitT - lure * 4);
    };
  }
  if (typeof fishingCatch === 'function') {
    const baseCatch = fishingCatch;
    fishingCatch = function (g, x, z) {
      if (FISH_LUCK && Math.random() < FISH_LUCK * 0.03) return { id: Math.random() < 0.35 ? 'enchanted_book' : 'diamond', kind: 'treasure' };
      const c = baseCatch(g, x, z);
      if (c && c.kind === 'treasure' && Math.random() < 0.25) c.id = 'enchanted_book';
      return c;
    };
  }
}

// ---- the anvil puts books on, the grindstone takes enchantments off ------------------------------------------
{
  const enchMerge = (to, from, kind) => {
    const out = Object.assign({}, to || {}); let added = 0, cost = 0;
    for (const [k, lv] of Object.entries(from || {})) {
      if (!ENCH[k] || !enchApplies(k, kind) || !enchCompatible(out, k)) continue;
      const cur = out[k] || 0, nv = cur === lv ? Math.min(ENCH[k].max, lv + 1) : Math.max(cur, lv);
      if (nv > cur) { out[k] = nv; added++; cost += nv * (ENCH[k].w <= 2 ? 2 : 1); }
    }
    return added ? { en: out, cost: Math.max(1, cost) } : null;
  };
  const baseRes = stationResult;
  stationResult = function (kind, a, b) {
    if (kind === 'anvil' && a && b) {
      const ka = enchKind(a.id), eb = enchOf(b), same = a.id === b.id;
      if (ka && eb && (b.id === 'enchanted_book' || same)) {
        const m = enchMerge(enchOf(a), eb, ka);
        if (m) {
          const base = same && b.id !== 'enchanted_book' ? baseRes(kind, a, b) : null;
          const out = Object.assign(cloneStack(base ? base.out : a), { n: 1, en: m.en });
          return { out, useA: 1, useB: 1, lv: m.cost, note: `Adds the enchantment${Object.keys(eb).length > 1 ? 's' : ''} · costs ${m.cost} level${m.cost > 1 ? 's' : ''}` };
        }
        if (b.id === 'enchanted_book') return null;
      }
    }
    if (kind === 'grindstone') {
      const one = a && !b ? [a, 1, 0] : b && !a ? [b, 0, 1] : null;
      if (one && enchOf(one[0])) {
        const s = one[0], en = s.en, xp = Object.entries(en).reduce((t, [k, lv]) => t + lv * 3 + (ENCH[k] && ENCH[k].treasure ? 6 : 0), 0);
        const out = s.id === 'enchanted_book' ? mkStack('book', 1) : Object.assign(cloneStack(s), { n: 1 });
        delete out.en;
        return { out, useA: one[1], useB: one[2], xp, note: `Takes the enchantments off · gives back ${xp} experience` };
      }
    }
    const r = baseRes(kind, a, b);
    // joining two worn tools keeps the enchantments of both (where they fit)
    if (r && (kind === 'anvil' || kind === 'grindstone') && a && b && a.id === b.id && (a.en || b.en)) {
      if (kind === 'grindstone') delete r.out.en;
      else { const m = enchMerge(a.en, b.en, enchKind(a.id)); if (m) { r.out.en = m.en; r.lv = m.cost; r.note += ` · costs ${m.cost} level${m.cost > 1 ? 's' : ''}`; } }
    }
    return r;
  };
  const baseTake = InvUI.prototype.takeStation;
  InvUI.prototype.takeStation = function (shift) {
    const res = this.staRes, p = this.lp.player, g = this.g;
    if (res && res.lv && !g.creative && p.level < res.lv) { this.lp.toast(`You need ${res.lv} level${res.lv > 1 ? 's' : ''} for that`, 'warn'); g.sfx.play('click_off'); return; }
    const before = this.arr('sta').map(s => s && s.n);
    baseTake.call(this, shift);
    const after = this.arr('sta').map(s => s && s.n);
    if (!res || (before[0] === after[0] && before[1] === after[1])) return;     // nothing was taken
    if (res.lv && !g.creative) { spendLevels(p, res.lv); g.sfx.play('enchant'); }
    if (res.xp) this.lp.grantXP(res.xp, p.x, p.y + 1.6, p.z);
  };
}

// ---- Bottle o' Enchanting ---------------------------------------------------------------------------------------
{
  const baseMilk = LocalPlayer.prototype.drinkMilk;
  LocalPlayer.prototype.drinkMilk = function (held) {
    const d = held && itemDef(held.id);
    if (d && d.xpBottle) {
      const g = this.g, p = this.player;
      held.n--; if (held.n <= 0) p.inv.held = null;
      this.swingArm(); g.sfx.play('glass_break'); g.sfx.play('levelup');
      const [lx, , lz] = p.look();
      for (let k = 0; k < 16; k++) spellSpark(g, p.x + lx * 0.8, p.y + 1.3, p.z + lz * 0.8, k % 2 ? 'mana_light' : 'ench_glyph_' + (k % 6), { vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 1.5, vz: (Math.random() - 0.5) * 2, life: 0.8, size: 0.08 });
      this.grantXP(4 + Math.floor(Math.random() * 8), p.x + lx, p.y + 1.6, p.z + lz);
      return;
    }
    return baseMilk.call(this, held);
  };
}
if (!SND_FX.glass_break) SND_FX.glass_break = [0.5, 0.6, (b, v, r) => { for (let k = 0; k < 9; k++) b.modes(r() * 0.12, [[2400 + r() * 3000, 0.02 + r() * 0.04, 1]], 0.25); b.noise(0, 0.12, 'hp', 3000, 0.8, 0.4); }];
SND_FX.enchant = [1.4, 0.55, (b, v, r) => {
  // a shimmering run of glassy notes over a soft swell
  const notes = [0, 4, 7, 11, 14, 19, 16, 23];
  for (let i = 0; i < notes.length; i++) { const f = 523 * Math.pow(2, notes[i] / 12) * (0.995 + r() * 0.01); b.modes(i * 0.07, [[f, 0.45, 1], [f * 2.01, 0.2, 0.3], [f * 3.02, 0.08, 0.12]], 0.16); }
  b.noise(0, 1.2, 'bp', 4200, 3, 0.05, { att: 0.4, curve: 0.5 });
}];
SND_FX.book_page = [0.3, 0.35, (b, v, r) => { b.noise(0, 0.14, 'bp', 2600 + r() * 800, 0.9, 0.5, { att: 0.03 }); b.noise(0.06, 0.08, 'hp', 4200, 0.8, 0.25); }];

// ---- the table: a book that floats, turns to you and leafs through its pages; glyphs from the shelves ------------
let ENCH_MESH = null;
function enchBookMeshes(gl) {
  if (ENCH_MESH) return ENCH_MESH;
  const T = (n) => ATLAS.tile[n] ?? 0, cv = T('ench_cover'), pg = T('ench_page');
  const mk = (fn) => { const mb = new MeshBuilder(64); fn(mb); const r = mb.result(); return makeVAO(gl, r.verts, r.idx); };
  ENCH_MESH = {
    // one cover, hinged at x=0, lying along +x
    cover: mk(mb => addBox(mb, [0, -0.01, -0.19], [0.27, 0.01, 0.19], [cv, cv, cv, cv, cv, cv])),
    // the block of pages on one side
    pages: mk(mb => addBox(mb, [0.005, 0.01, -0.17], [0.24, 0.05, 0.17], [pg, pg, pg, pg, pg, pg])),
    // one page turning
    leaf: mk(mb => addBox(mb, [0, -0.002, -0.165], [0.235, 0.002, 0.165], [pg, pg, pg, pg, pg, pg])),
    spine: mk(mb => addBox(mb, [-0.012, -0.03, -0.19], [0.012, 0.05, 0.19], [cv, cv, cv, cv, cv, cv])),
  };
  return ENCH_MESH;
}
{
  // a placed table gets a little record of its own (its book's state is drawn from it)
  const baseChanged = Game.prototype.onBlockChanged;
  Game.prototype.onBlockChanged = function (x, y, z, oldId, newId, opts = {}) {
    const r = baseChanged.call(this, x, y, z, oldId, newId, opts);
    if (newId === B.enchanting_table && !this.isGuest && !this.world.getEntity(x, y, z)) { this.world.setEntity(x, y, z, { type: 'ench' }); this.entityChanged(x, y, z); }
    return r;
  };
  const baseBE = blockEntityDraws;
  blockEntityDraws = function (game, out, cam, R) {
    baseBE(game, out, cam, R);
    const w = game.world, gl = game.renderer.gl, pcx = Math.floor(cam.x) >> 4, pcz = Math.floor(cam.z) >> 4;
    for (const ch of w.chunks.values()) {
      if (!ch.blockEntities.size || Math.abs(ch.cx - pcx) > 2 || Math.abs(ch.cz - pcz) > 2) continue;
      for (const [i, e] of ch.blockEntities) {
        if (e.type !== 'ench') continue;
        if (ch.blocks[i] !== B.enchanting_table) continue;
        const x = ch.cx * 16 + (i & 15), z = ch.cz * 16 + ((i >> 4) & 15), y = i >> 8;
        enchBookDraw(game, out, gl, e, x, y, z);
      }
    }
  };
}
const ENCH_ANIM = new WeakMap();
function enchBookDraw(g, out, gl, e, x, y, z) {
  // (its moving state lives beside the record, not in it, so it isn't saved or sent)
  let a = ENCH_ANIM.get(e); if (!a) ENCH_ANIM.set(e, a = {});
  const M = enchBookMeshes(gl), t = g.time, dt = Math.min(0.1, Math.max(0, t - (a._t ?? t))); a._t = t;
  // whoever's nearest
  let best = null, bd = 7 * 7;
  for (const q of g.pawns()) { if (q.dead) continue; const d = (q.x - x - 0.5) ** 2 + (q.z - z - 0.5) ** 2 + (q.y - y) ** 2; if (d < bd) { bd = d; best = q; } }
  const want = best ? Math.atan2(best.x - x - 0.5, best.z - z - 0.5) - Math.PI / 2 : (a._yaw || 0) + dt * 0.3;
  let dy = want - (a._yaw || 0); while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU;
  a._yaw = (a._yaw || 0) + dy * Math.min(1, dt * 3);
  a._open = clamp((a._open || 0) + (best ? dt * 1.5 : -dt * 1.2), 0, 1);
  // pages turn now and then while it's open
  a._flip = (a._flip || 0) - dt;
  if (a._open > 0.8 && a._flip <= 0) { a._flip = 0.6 + Math.random() * 2.2; a._leaf = 0; if (Math.random() < 0.5) g.sfx.playAt('book_page', x + 0.5, y + 1, z + 0.5, 8); }
  if (a._leaf !== undefined) { a._leaf += dt * 2.4; if (a._leaf >= 1) a._leaf = undefined; }
  const l = g.world.getLight(x, y + 1, z), light = [l >> 4, Math.max(7, l & 15)];
  const open = a._open * a._open * (3 - 2 * a._open), ang = 0.08 + open * 1.25;       // half the opening angle from flat-closed
  const base = Mat4.create();
  Mat4.translate(base, 0.5, 0.75 + 0.3 + Math.sin(t * 1.4 + x) * 0.05, 0.5);
  Mat4.rotateY(base, a._yaw);
  Mat4.rotateZ(base, 0.25 + 0.55 * open);                  // tilted up towards you as it opens
  const push = (mesh, m) => out.push({ mesh, m, px: x, py: y, pz: z, light, noCull: true });
  const sp = Mat4.create(); sp.set(base); Mat4.rotateZ(sp, Math.PI / 2); push(M.spine, sp);
  for (const s of [1, -1]) {
    const c = Mat4.create(); c.set(base); Mat4.rotateZ(c, s > 0 ? Math.PI / 2 - ang : Math.PI / 2 + ang);
    push(M.cover, c);
    const pm = Mat4.create(); pm.set(c); Mat4.translate(pm, 0, s > 0 ? -0.055 : 0.005, 0); push(M.pages, pm);
  }
  if (a._leaf !== undefined) {
    const k = a._leaf, lm = Mat4.create(); lm.set(base);
    Mat4.rotateZ(lm, Math.PI / 2 - ang + k * 2 * ang); Mat4.translate(lm, 0, -0.055, 0); push(M.leaf, lm);
  }
  // glyphs drift in from the shelves
  if (best && bd < 6 * 6 && Math.random() < dt * 6) {
    a._shelfT = (a._shelfT || 0) - 1;
    if (a._shelfT <= 0 || !a._shelves) { a._shelfT = 40; a._shelves = []; const w = g.world; for (let yy = 0; yy <= 1; yy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (Math.max(Math.abs(dx), Math.abs(dz)) === 2 && w.getBlock(x + dx, y + yy, z + dz) === B.bookshelf) a._shelves.push([x + dx, y + yy, z + dz]); }
    if (a._shelves.length) {
      const [sx, sy, sz] = a._shelves[Math.floor(Math.random() * a._shelves.length)];
      const fx = sx + 0.5 + (Math.random() - 0.5) * 0.6, fy = sy + 0.6 + Math.random() * 0.8, fz = sz + 0.5 + (Math.random() - 0.5) * 0.6, life = 1.6;
      spellSpark(g, fx, fy, fz, 'ench_glyph_' + Math.floor(Math.random() * 6), { vx: (x + 0.5 - fx) / life, vy: (y + 1.2 - fy) / life + 0.3, vz: (z + 0.5 - fz) / life, life, size: 0.1, grav: 0.4 });
    }
  }
}
