// ---------------------------------------------------------------------------
// game/stable.js — 0.9: your stable (World of Warcraft style).
//
// Every creature you tame, hatch or raise joins your stable. Press H (or use
// a whistle) to see them all: summon any of them to your side wherever you
// are, in any world, and dismiss them home again when you're done. A
// companion that falls in a fight isn't lost: it goes back to the stable to
// rest for a few minutes, then comes when called again. Mark a mount as your
// favourite (the star) and sneak + H calls it, or sends it home.
//
// Behind it: each companion has an id and a "generation". Summoning or
// dismissing moves the generation on, so any older copy of it left somewhere
// (an unloaded corner of the world, another dimension) quietly goes when it
// next wakes up. Only one of each is ever about.
// ---------------------------------------------------------------------------
const STABLE_REST = 300;
defItem('whistle', { name: 'Whistle', maxStack: 1, desc: 'Use it (or press H) to call your companions: your mounts and pets.' });
RECIPES.push({ out: 'whistle', n: 1, items: ['bone', 'string'], group: 'tools' });
if (typeof NPC_SHOPS !== 'undefined' && NPC_SHOPS.shepherd) NPC_SHOPS.shepherd.buy.push(['whistle', 1, 2, 0]);
else if (typeof NPC_SHOPS !== 'undefined' && NPC_SHOPS.farmer) NPC_SHOPS.farmer.buy.push(['whistle', 1, 2, 0]);

function stableBook(g, owner) { const S = g.meta.stable || (g.meta.stable = {}); return S[owner] || (S[owner] = []); }
function stableRec(g, owner, uid) { return owner && uid ? stableBook(g, owner).find(r => r.uid === uid) : null; }
function stableName(r) { return r.name || (MOB_TYPES[r.type] ? MOB_TYPES[r.type].label.replace(/^(an?|the) /, '') : r.type.replace(/_/g, ' ')); }
const capName = (r) => { const n = r.name || ('your ' + stableName(r)); return n[0].toUpperCase() + n.slice(1); };
function stableIsMount(type) { return !!MOUNTS[type]; }
// what the stable remembers about a companion
function stableSync(r, m) {
  r.type = m.type; r.name = m.petName || null; r.saddled = !!m.saddled; r.variant = m.variant || null; r.color = m.color || null; r.size = m.size || null;
  r.baby = m.baby ? Math.round(m.growT) : 0; r.hp = Math.max(1, Math.round(m.health)); r.maxHp = m.maxHealth;
  r.dim = m.game.dim; r.x = Math.round(m.x); r.y = Math.round(m.y); r.z = Math.round(m.z);
}
function stablePoof(g, x, y, z, h) {
  g.burst(x, y + h * 0.5, z, 'white', 14, 1.2, 2);
  if (typeof spellFx === 'function') spellFx(g, x, y + h * 0.5, z, 'mana_light', 18, 1.4, { life: 0.6, spread: 0.8, size: 0.07 });
}
// keep the book in step with the creature, and see off any copy that's been replaced
function stableTick(m, dt) {
  const g = m.game;
  if (!g.meta || g.isGuest) return;
  if (!m.uid) {
    m.uid = 'c' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 7); m.sgen = 1;
    const r = { uid: m.uid, gen: 1, state: 'out', joined: Math.round(g.meta.playTime || 0) };
    stableSync(r, m); stableBook(g, m.owner).push(r);
    const o = m.ownerPawn && m.ownerPawn();
    if (o && o.toast) o.toast(`${stableName(r)[0].toUpperCase() + stableName(r).slice(1)} joins your stable · H to call your companions`, 'good');
    return;
  }
  let r = stableRec(g, m.owner, m.uid);
  if (!r) { r = { uid: m.uid, gen: m.sgen || 1, state: 'out' }; m.sgen = r.gen; stableSync(r, m); stableBook(g, m.owner).push(r); return; }
  if (r.gen !== (m.sgen || 1) || r.state !== 'out') { m.remove = true; if (m.riddenBy) m.riddenBy.riding = null; return; }
  if ((m._stT = (m._stT || 0) - dt) <= 0) { m._stT = 2; stableSync(r, m); }
}
// a free place to stand beside someone, for a creature of this size
function stableSpot(g, pawn, w, h) {
  const W = g.world, yaw = pawn.yaw || (pawn.player && pawn.player.yaw) || 0;
  for (const [ang, d] of [[Math.PI / 2, 2], [-Math.PI / 2, 2], [Math.PI, 2.5], [Math.PI / 2, 3.5], [-Math.PI / 2, 3.5], [0, 3], [Math.PI * 0.75, 3], [-Math.PI * 0.75, 3]]) {
    const a = yaw + ang, x = pawn.x - Math.sin(a) * (d + w), z = pawn.z - Math.cos(a) * (d + w);
    for (let y = Math.floor(pawn.y) + 2; y >= Math.floor(pawn.y) - 3; y--) {
      if (!T_SOLID[W.getBlock(Math.floor(x), y - 1, Math.floor(z))]) continue;
      if (collides(W, x - w, y, z - w, x + w, y + h, z + w)) continue;
      return [x, y, z];
    }
  }
  return [pawn.x, pawn.y, pawn.z];
}
function stableLive(g, uid) { return g.entities.find(e => e instanceof Mob && e.uid === uid && e.alive && !e.remove && !e.ghost); }
// Host side: call a companion to someone
function stableSummon(g, pawn, uid) {
  const r = stableRec(g, pawn.name, uid);
  if (!r) return 'You don\'t have that companion';
  const now = g.meta.playTime || 0;
  if (r.state === 'resting' && now < r.restUntil) return `${capName(r)} is still resting (${Math.ceil((r.restUntil - now) / 60)} min)`;
  g.sfx.playAt('whistle', pawn.x, pawn.y + 1.5, pawn.z);
  const live = stableLive(g, uid);
  if (live) {
    // already about: it comes to you
    if (live.riddenBy) return `${capName(r)} is being ridden`;
    stablePoof(g, live.x, live.y, live.z, live.h);
    const [x, y, z] = stableSpot(g, pawn, live.w, live.h);
    live.x = x; live.y = y; live.z = z; live.vx = live.vy = live.vz = 0; live.stay = false; live.sitting = false;
    stablePoof(g, x, y, z, live.h);
    return null;
  }
  if (!MOB_TYPES[r.type]) return 'That creature can\'t be called here';
  r.gen++; r.state = 'out';
  const T = MOB_TYPES[r.type], w = r.baby ? T.w * 0.55 : T.w, h = r.baby ? T.h * 0.55 : T.h;
  const [x, y, z] = stableSpot(g, pawn, w, h);
  const m = new Mob(g, r.type, x, y, z);
  m.owner = pawn.name; m.tamed = true; m.kept = true; m.uid = r.uid; m.sgen = r.gen;
  if (r.name) m.petName = r.name; if (r.saddled) m.saddled = true; if (r.color) m.color = r.color;
  if (r.variant && MODELS[r.variant]) m.variant = r.variant;
  if (r.size && m.setSize) m.setSize(r.size);
  if (r.baby) { m.makeBaby(); m.growT = r.baby; }
  m.health = Math.min(m.maxHealth, r.hp || m.maxHealth);
  m.yaw = pawn.yaw || (pawn.player && pawn.player.yaw) || 0;
  if (T.flyingMount && !(pawn.player ? pawn.player.onGround : true)) { m.noGrav = true; m.flyVy = 0; }
  g.addEntity(m);
  stablePoof(g, x, y, z, h);
  return null;
}
function stableDismiss(g, pawn, uid) {
  const r = stableRec(g, pawn.name, uid);
  if (!r) return 'You don\'t have that companion';
  const live = stableLive(g, uid);
  if (live) {
    if (live.riddenBy) live.dismount(live.riddenBy);
    stableSync(r, live);
    stablePoof(g, live.x, live.y, live.z, live.h);
    live.remove = true;
  }
  if (r.state === 'out') r.state = 'stabled';
  r.gen++;
  return null;
}
function stableRename(g, pawn, uid, name) {
  const r = stableRec(g, pawn.name, uid); if (!r) return;
  r.name = String(name || '').slice(0, 24).trim() || null;
  const live = stableLive(g, uid); if (live) live.petName = r.name || undefined;
}
function stableRelease(g, pawn, uid) {
  const book = stableBook(g, pawn.name), i = book.findIndex(r => r.uid === uid);
  if (i < 0) return;
  const live = stableLive(g, uid);
  if (live) { if (live.riddenBy) live.dismount(live.riddenBy); live.owner = null; live.tamed = false; live.kept = false; live.uid = null; live.petName = undefined; stablePoof(g, live.x, live.y, live.z, live.h); }
  book.splice(i, 1);
}
function stableFav(g, pawn, uid) { for (const r of stableBook(g, pawn.name)) r.fav = r.uid === uid ? !r.fav : false; }
// what a player's stable looks like right now (for the window; sent to guests)
function stableList(g, owner) {
  const now = g.meta.playTime || 0;
  return stableBook(g, owner).map(r => {
    if (r.state === 'resting' && now >= r.restUntil) { r.state = 'stabled'; r.hp = r.maxHp || r.hp; }
    const live = r.state === 'out' ? stableLive(g, r.uid) : null;
    const nm = stableName(r);
    return { uid: r.uid, type: r.type, name: r.name ? nm : nm[0].toUpperCase() + nm.slice(1), named: !!r.name, variant: r.variant, saddled: r.saddled, baby: !!r.baby, hp: live ? live.health : r.hp, maxHp: live ? live.maxHealth : (r.maxHp || (MOB_TYPES[r.type] || {}).hp || 10),
      state: r.state, here: !!live, x: live ? live.x : r.x, z: live ? live.z : r.z, dim: live ? g.dim : r.dim, rest: r.state === 'resting' ? Math.max(0, Math.ceil(r.restUntil - now)) : 0, fav: !!r.fav, mount: stableIsMount(r.type) };
  });
}

// ---- in the world: register companions, see off old copies, rest instead of dying ----------------------------
{
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (this.owner && !this.ghost && this.alive && !this.T.spirit && !this.mountedOn) stableTick(this, dt);
    if (this.remove) return;
    return baseUpd.call(this, dt);
  };
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const g = this.game, r = this.uid && !g.isGuest ? stableRec(g, this.owner, this.uid) : null;
    if (!r) return baseDie.call(this, src);
    // not lost: home to the stable to rest, and nothing dropped
    const drop = g.dropItem; g.dropItem = () => null;
    try { baseDie.call(this, src); } finally { g.dropItem = drop; }
    stableSync(r, this);
    r.state = 'resting'; r.restUntil = (g.meta.playTime || 0) + STABLE_REST; r.hp = r.maxHp || this.maxHealth; r.gen++;
    const o = this.ownerPawn && this.ownerPawn(), nm = stableName(r);
    if (o && o.toast) o.toast(`${nm[0].toUpperCase() + nm.slice(1)} is hurt and goes home to the stable to rest (5 min)`, 'warn');
    else if (o && o.send) o.send({ t: 'adv', k: 'stable', op: 'toast', s: `${nm[0].toUpperCase() + nm.slice(1)} is hurt and goes home to the stable to rest (5 min)` });
  };
}
// the id and generation go wherever the creature's details go (carried, in a boat, saved as kept)
{
  const basePF = petFields;
  petFields = function (m) { const f = basePF(m); if (f && m.uid) { f.su = m.uid; f.sg = m.sgen || 1; } return f; };
  const baseApply = applyPetFields;
  applyPetFields = function (m, f) { baseApply(m, f); if (f && f.su) { m.uid = f.su; m.sgen = f.sg || 1; } };
}

// ---- the window ----------------------------------------------------------------------------------------
// a little face for each companion, from its model's head
const STABLE_FACES = new Map();
function creatureFace(type, variant) {
  const key = type + '|' + (variant || '');
  if (STABLE_FACES.has(key)) return STABLE_FACES.get(key);
  let url = '';
  try {
    const T = MOB_TYPES[type], def = MODEL_DEFS[variant || (T && T.model) || type];
    let tex = null;
    if (def && def.parts) {
      const part = def.rig === 'dragon' ? def.parts.find(p => p.name === 'snout') : def.parts.find(p => p.name === 'head') || def.parts.find(p => /head/.test(p.role || ''));
      const t = part && part.tex;
      tex = !t ? null : typeof t === 'string' ? t : (t.front || t.all || t.side);
    }
    const idx = tex && ATLAS.tile[tex];
    if (idx !== undefined && idx !== null && ATLAS.canvas) {
      const c = document.createElement('canvas'); c.width = c.height = 48;
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
      x.drawImage(ATLAS.canvas, (idx % ATLAS_TILES) * TILE, Math.floor(idx / ATLAS_TILES) * TILE, TILE, TILE, 0, 0, 48, 48);
      url = c.toDataURL();
    }
  } catch (e) { url = ''; }
  STABLE_FACES.set(key, url);
  return url;
}
class StableUI {
  constructor(lp) {
    this.lp = lp; this.g = lp.g; this.list = null; this.sel = 0; this.confirm = null;
    const el = this.el = document.createElement('div');
    el.className = 'stable-ui';
    el.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); if (ev.target === el) this.close(); });
    el.addEventListener('keydown', (ev) => ev.stopPropagation());
    this.onKey = (ev) => { if (ev.target && ev.target.tagName === 'INPUT') { if (ev.code === 'Escape' || ev.code === 'Enter') ev.target.blur(); return; } if (ev.code === 'Escape' || ev.code === 'KeyE' || ev.code === 'KeyH') { ev.preventDefault(); ev.stopPropagation(); this.close(); } };
    window.addEventListener('keydown', this.onKey, true);
    lp.el.appendChild(el);
    this.refresh();
    this.g.sfx.play('whistle');
    this.tick = setInterval(() => { if (!this.editing) this.refresh(); }, 1000);
  }
  // ask for the list (from the host, when you're a guest)
  refresh() {
    const g = this.g, lp = this.lp;
    if (g.isGuest) { if (g.net) g.net.send({ t: 'adv', k: 'stable', op: 'list', li: lp.index || 0 }); if (!this.list) this.draw(); return; }
    this.list = stableList(g, lp.name); this.draw();
  }
  act(op, uid, extra) {
    const g = this.g, lp = this.lp;
    if (g.isGuest) { if (g.net) g.net.send(Object.assign({ t: 'adv', k: 'stable', op, uid, li: lp.index || 0 }, extra || {})); return; }
    let msg = null;
    if (op === 'summon') msg = stableSummon(g, lp, uid);
    else if (op === 'dismiss') msg = stableDismiss(g, lp, uid);
    else if (op === 'rename') stableRename(g, lp, uid, extra && extra.name);
    else if (op === 'release') stableRelease(g, lp, uid);
    else if (op === 'fav') stableFav(g, lp, uid);
    if (msg) lp.toast(msg, '');
    this.refresh();
  }
  draw() {
    const L = this.list, g = this.g;
    const where = (c) => {
      if (c.state === 'resting') return `<span class="st-rest">Resting · ${Math.floor(c.rest / 60)}:${String(c.rest % 60).padStart(2, '0')}</span>`;
      if (c.state === 'stabled') return '<span>In the stable</span>';
      if (c.here) { const d = Math.round(Math.hypot(c.x - this.lp.player.x, c.z - this.lp.player.z)); return `<span class="st-out">${d < 12 ? 'With you' : 'Out · ' + d + ' m away'}</span>`; }
      return `<span class="st-out">Out${c.dim !== undefined && c.dim !== g.dim ? ' in ' + esc(DIM_NAME[c.dim] || 'another world') : ''}</span>`;
    };
    const card = (c) => {
      const face = creatureFace(c.type, c.variant), pct = Math.max(0, Math.min(100, c.hp / Math.max(1, c.maxHp) * 100));
      const kind = (MOB_TYPES[c.type] ? MOB_TYPES[c.type].label.replace(/^(an?|the) /, '') : c.type);
      const out = c.state === 'out', rest = c.state === 'resting';
      return `<div class="st-c${out ? ' out' : ''}${rest ? ' rest' : ''}" data-uid="${esc(c.uid)}">
        <div class="st-face"${face ? ` style="background-image:url(${face})"` : ''}></div>
        <div class="st-body"><div class="st-name"><input value="${esc(c.named ? c.name : '')}" placeholder="${esc(c.name)}" maxlength="24" data-ren="${esc(c.uid)}" spellcheck="false"></div>
          <div class="st-kind">${esc(kind)}${c.baby ? ' · young' : ''}${c.saddled ? ' · saddled' : ''}${c.mount ? ' · mount' : ''}</div>
          <div class="st-hp"><i style="width:${pct}%"></i></div><div class="st-where">${where(c)}</div></div>
        <div class="st-btns">${c.mount ? `<button class="btn tiny st-star${c.fav ? ' on' : ''}" data-fav="${esc(c.uid)}" title="Favourite mount: sneak + H calls it">★</button>` : ''}
          ${out && c.here ? `<button class="btn tiny" data-sum="${esc(c.uid)}">Here!</button><button class="btn tiny" data-dis="${esc(c.uid)}">Dismiss</button>`
            : out ? `<button class="btn tiny primary" data-sum="${esc(c.uid)}">Summon</button><button class="btn tiny" data-dis="${esc(c.uid)}">Dismiss</button>`
            : `<button class="btn tiny primary" data-sum="${esc(c.uid)}"${rest ? ' disabled' : ''}>Summon</button>`}
          <button class="btn tiny st-rel" data-rel="${esc(c.uid)}">${this.confirm === c.uid ? 'Sure?' : 'Release'}</button></div></div>`;
    };
    const mounts = L ? L.filter(c => c.mount) : [], pets = L ? L.filter(c => !c.mount) : [];
    const sort = (a, b) => (b.fav - a.fav) || a.name.localeCompare(b.name);
    this.el.innerHTML = `<div class="st-card"><div class="st-head"><b>Your Stable</b><span>${L ? L.length + ' companion' + (L.length === 1 ? '' : 's') : 'Calling…'}</span></div>
      ${L && !L.length ? '<div class="st-empty">No companions yet. Tame an animal, raise a drake from a dragon egg, or breed your pets, and they join your stable.</div>' : ''}
      ${mounts.length ? `<div class="st-sub">Mounts</div><div class="st-grid">${mounts.sort(sort).map(card).join('')}</div>` : ''}
      ${pets.length ? `<div class="st-sub">Pets</div><div class="st-grid">${pets.sort(sort).map(card).join('')}</div>` : ''}
      <div class="qb-hint">H or a whistle opens this · Summon brings it to your side, wherever it is · Dismiss sends it home · ★ marks your favourite mount: sneak + H calls it or sends it home</div></div>`;
    const on = (sel, fn) => this.el.querySelectorAll(sel).forEach(b => b.onclick = (ev) => { ev.stopPropagation(); fn(b); });
    on('[data-sum]', b => { this.confirm = null; this.act('summon', b.dataset.sum); });
    on('[data-dis]', b => { this.confirm = null; this.act('dismiss', b.dataset.dis); });
    on('[data-fav]', b => this.act('fav', b.dataset.fav));
    on('[data-rel]', b => { if (this.confirm === b.dataset.rel) { this.confirm = null; this.act('release', b.dataset.rel); } else { this.confirm = b.dataset.rel; this.draw(); } });
    this.el.querySelectorAll('[data-ren]').forEach(inp => {
      inp.onfocus = () => { this.editing = true; };
      inp.onblur = () => { this.editing = false; const c = this.list && this.list.find(q => q.uid === inp.dataset.ren); if (c && inp.value.trim() !== (c.named ? c.name : '')) this.act('rename', inp.dataset.ren, { name: inp.value }); };
      inp.onpointerdown = (ev) => ev.stopPropagation();
    });
    const bs = [...this.el.querySelectorAll('.st-btns button')];
    bs.forEach((b, i) => b.classList.toggle('sel', i === this.sel));
  }
  frame(dt, inp) {
    if (inp.padB || inp.padStart || inp.inventory) { this.close(); return; }
    const bs = [...this.el.querySelectorAll('.st-btns button:not([disabled])')];
    if (inp.navX || inp.navY) { this.sel = (this.sel + ((inp.navX || inp.navY) > 0 ? 1 : bs.length - 1)) % Math.max(1, bs.length); bs.forEach((b, i) => b.classList.toggle('sel', i === this.sel)); }
    if (inp.padA && bs[this.sel]) bs[this.sel].click();
  }
  close() {
    const lp = this.lp, g = this.g;
    clearInterval(this.tick);
    window.removeEventListener('keydown', this.onKey, true);
    this.el.remove();
    if (lp.npcUI === this) lp.npcUI = null;
    if (lp.mode === 'npc') lp.mode = 'play';
    if (lp.useKb && !g.input.touchMode && g.state === 'playing') g.input.requestLock();
  }
}
// sneak + H: your favourite mount, called or sent home
function stableQuick(g, pawn) {
  const book = stableBook(g, pawn.name), r = book.find(q => q.fav) || book.find(q => stableIsMount(q.type) && q.state !== 'resting');
  if (!r) return 'No mount to call — mark one with ★ in your stable (H)';
  const live = stableLive(g, r.uid);
  if (live && live.riddenBy) return null;
  if (live && Math.hypot(live.x - pawn.x, live.z - pawn.z) < 8) return stableDismiss(g, pawn, r.uid);
  return stableSummon(g, pawn, r.uid);
}

// ---- the H key and the whistle ------------------------------------------------------------------------------
{
  const at = KEY_ACTIONS.findIndex(a => a[0] === 'hideHud');
  KEY_ACTIONS.splice(at < 0 ? KEY_ACTIONS.length : at, 0, ['stable', 'Call companions (stable)', ['KeyH']]);
  KEY_DEFAULTS.stable = ['KeyH'];
  const basePress = InputManager.prototype.pressCode;
  InputManager.prototype.pressCode = function (code, e) { const r = basePress.call(this, code, e); if (this.actionsFor(code).includes('stable')) this.s.stable = true; return r; };
  const baseEnd = InputManager.prototype.endFrame;
  InputManager.prototype.endFrame = function () { baseEnd.call(this); this.s.stable = false; };
  const baseMerge = mergeInput;
  mergeInput = function (a, b) { const r = baseMerge(a, b); a.stable = a.stable || b.stable; return r; };
  const baseUpdate = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    if (inp.stable && this.mode === 'play' && !this.player.dead) this.openStable(this.player.sneaking);
    return baseUpdate.call(this, dt, inp);
  };
  LocalPlayer.prototype.openStable = function (quick) {
    const g = this.g;
    if (quick) {
      if (g.isGuest) { if (g.net) g.net.send({ t: 'adv', k: 'stable', op: 'quick', li: this.index || 0 }); return; }
      const msg = stableQuick(g, this); if (msg) this.toast(msg, '');
      return;
    }
    this.openNpcUI(() => new StableUI(this));
  };
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const h = this.player.inv.held;
    if (!fromOff && !repeat && h && h.id === 'whistle' && !(this.targetEnt instanceof Mob && this.targetEnt.isPetOf && this.targetEnt.isPetOf(this))) { this.swingArm(); this.openStable(this.player.sneaking); return; }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  const baseHas = itemHasUse;
  itemHasUse = function (d) { return !!(d && d.key === 'whistle') || baseHas(d); };
}
// ---- playing together: a guest's stable lives in the host's world ----------------------------------------------
{
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'stable') {
      const g = this.g, who = this.remotes.get('g' + from + ':' + (m.li || 0));
      if (!who || !g.meta) return;
      let msg = null;
      if (m.op === 'summon') msg = stableSummon(g, who, m.uid);
      else if (m.op === 'dismiss') msg = stableDismiss(g, who, m.uid);
      else if (m.op === 'rename') stableRename(g, who, m.uid, m.name);
      else if (m.op === 'release') stableRelease(g, who, m.uid);
      else if (m.op === 'fav') stableFav(g, who, m.uid);
      else if (m.op === 'quick') msg = stableQuick(g, who);
      if (msg) who.send({ t: 'adv', k: 'stable', op: 'toast', s: msg, li: m.li || 0 });
      if (m.op !== 'quick') who.send({ t: 'adv', k: 'stable', op: 'list', list: stableList(g, who.name), li: m.li || 0 });
      return;
    }
    return baseHost.call(this, from, m);
  };
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv' && m.k === 'stable') {
      const lp = this.g.locals[m.li || 0] || this.g.locals[0];
      if (!lp) return;
      if (m.op === 'toast') lp.toast(m.s, '');
      else if (m.op === 'list' && lp.npcUI instanceof StableUI) { lp.npcUI.list = m.list; if (!lp.npcUI.editing) lp.npcUI.draw(); }
      return;
    }
    return baseGuest.call(this, m);
  };
}

// ---- spirit wolves (the Spirit Wolf spell, game/magic.js) ----------------------------------------------------------
MOB_TYPES.spirit_wolf = { model: 'wolf', label: 'a spirit wolf', hp: 26, w: 0.3, h: 0.85, speed: 4.5, run: 8.5, xp: 0, damage: 5, spirit: true, sound: 'wolf', tint: [0.5, 0.85, 1, 0.5], knockResist: 0.5, drops: [] };
function summonFamiliar(lp, power) {
  const g = lp.g;
  if (g.isGuest) { if (g.net) g.net.send({ t: 'adv', k: 'familiar', p: +power.toFixed(2), li: lp.index || 0 }); return; }
  spawnFamiliar(g, lp, power);
}
function spawnFamiliar(g, pawn, power) {
  // one at a time (two for a master)
  const mine = g.entities.filter(e => e.T && e.T.spirit && e.owner === pawn.name && e.alive);
  const max = power >= 2 ? 2 : 1;
  while (mine.length >= max) { const o = mine.shift(); o.spiritT = 0; }
  const [x, y, z] = stableSpot(g, pawn, 0.3, 0.85);
  const m = g.addEntity(new Mob(g, 'spirit_wolf', x, y, z));
  m.owner = pawn.name; m.tamed = true; m.kept = false; m.spiritT = 45 + 30 * power;
  m.maxHealth = m.health = Math.round(26 * power); m.spiritDmg = Math.round(4 + 2 * power);
  m.yaw = pawn.yaw || (pawn.player && pawn.player.yaw) || 0;
  for (let i = 0; i < 30; i++) { const a = Math.random() * TAU; spellSpark(g, x + Math.cos(a) * 0.6, y + Math.random() * 1.2, z + Math.sin(a) * 0.6, 'mana_frost', { vy: 1.2, life: 0.8, size: 0.07 }); }
  g.sfx.playAt('wolf', x, y, z);
}
{
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (this.T.spirit && !this.ghost) {
      const g = this.game, o = this.ownerPawn();
      this.spiritT = (this.spiritT ?? 60) - dt;
      if (this.spiritT <= 0 || !o || Math.hypot(o.x - this.x, o.z - this.z) > 64) {
        for (let i = 0; i < 24; i++) spellSpark(g, this.x + (Math.random() - 0.5), this.y + Math.random(), this.z + (Math.random() - 0.5), 'mana_frost', { vy: 1.5, life: 0.7, size: 0.07 });
        this.remove = true; return;
      }
      // it hunts what threatens you
      if ((this._huntT = (this._huntT || 0) - dt) <= 0) {
        this._huntT = 0.5;
        if (!this.petFoe || !this.petFoe.alive) {
          let best = null, bd = 16;
          for (const e of g.entities) if (e instanceof Mob && e.alive && e.T.hostile && !e.owner && !e.npc) { const d = Math.hypot(e.x - o.x, e.z - o.z); if (d < bd) { bd = d; best = e; } }
          this.petFoe = best;
        }
      }
      if (Math.random() < dt * 10) spellSpark(g, this.x + (Math.random() - 0.5) * 0.6, this.y + 0.2 + Math.random() * 0.7, this.z + (Math.random() - 0.5) * 0.6, Math.random() < 0.5 ? 'mana_frost' : 'mana_arcane', { vy: 0.5, life: 0.6, size: 0.05 });
    }
    return baseUpd.call(this, dt);
  };
  // its bite carries the spell's strength
  const baseBite = Mob.prototype.bite;
  if (baseBite) Mob.prototype.bite = function (f, dmg) { return baseBite.call(this, f, this.T.spirit && this.spiritDmg ? this.spiritDmg : dmg); };
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'familiar') { const who = this.remotes.get('g' + from + ':' + (m.li || 0)); if (who) spawnFamiliar(this.g, who, clamp(+m.p || 1, 0.5, 3)); return; }
    return baseHost.call(this, from, m);
  };
}
Object.assign(SND_FX, {
  whistle: [0.6, 0.55, (b, v, r) => { b.modes(0, [[1700 + r() * 60, 0.09, 1]], 0.35, { droop: 0.18 }); b.modes(0.16, [[2300 + r() * 80, 0.14, 1]], 0.4, { droop: -0.08 }); b.noise(0, 0.4, 'bp', 2000, 3, 0.05, { att: 0.02 }); }],
});
