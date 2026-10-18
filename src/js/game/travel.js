// ---------------------------------------------------------------------------
// game/travel.js — 0.9.0.36: roads and reins.
//
// - Waystones: every village has one in its square (raised the first time
//   someone comes by). Use it to attune to it; use any waystone to travel to
//   any other you've attuned to, for a level or two of experience by how far.
//   Craft your own to set at home, or anywhere (they work in their own layer).
// - Horses (and every other mount) have their own speed, jump and toughness.
//   Wild ones are anything from plodders to racers; a foal takes after both
//   parents and now and then outdoes them, so careful breeding gives the best.
//   You see a mount's measure when you get on, and when a foal is born.
// - The carriage: set it down beside a tamed horse (or donkey) and it hitches
//   itself. Two seats and a chest: whoever sits up front drives the horse, or
//   ride the horse yourself and let your partner sit in the back. Sneak and use
//   it with an empty hand to open its chest.
// ---------------------------------------------------------------------------
const DIR_WORDS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

// ---- waystones ----------------------------------------------------------------------------------------------------------
function wayRec(g) { return g.meta.waystones || (g.meta.waystones = {}); }
function waysOf(p) { const st = p.stats || (p.stats = {}); return st.ways || (st.ways = {}); }
function wayIdAt(g, x, y, z) {
  const e = g.world.getEntity(x, y, z);
  if (e && e.wayId) return e.wayId;
  return 'p:' + x + ',' + y + ',' + z;
}
function wayNameAt(g, x, y, z) { const e = g.world.getEntity(x, y, z); return (e && e.name) || 'A waystone'; }
// a village's waystone goes in its square, on open ground clear of the buildings, the well and the rift
function waySiteFor(g, v) {
  const w = g.world, R = g.meta.rift;
  for (let r = 4; r <= 10; r++) for (let k = 0; k < 16; k++) {
    const a = k / 16 * TAU + r, x = Math.floor(v.x + Math.cos(a) * r), z = Math.floor(v.z + Math.sin(a) * r);
    if (!w.isLoaded(x, z) || !w.isLoaded(x + 1, z + 1)) return null;
    if (v.blds && v.blds.some(b => x >= b.x0 - 1 && x <= b.x1 + 1 && z >= b.z0 - 1 && z <= b.z1 + 1)) continue;
    if (R && R.at && R.village === v.id && Math.hypot(R.at[0] - x - 0.5, R.at[2] - z - 0.5) < 4) continue;
    const y = findSafeY(w, x, z); if (y < 1 || Math.abs(y - (v.y + 1)) > 3) continue;
    const below = w.getBlock(x, y - 1, z); if (T_LIQUID[below] || !T_SOLID[below]) continue;
    if (w.getBlock(x, y, z) || w.getBlock(x, y + 1, z)) continue;
    let crowd = false; for (let dx = -1; dx <= 1 && !crowd; dx++) for (let dz = -1; dz <= 1; dz++) { const id = w.getBlock(x + dx, y, z + dz); if (id && T_SOLID[id]) { crowd = true; break; } }
    if (crowd) continue;
    return [x, y, z];
  }
  return null;
}
const WAY = { t: 0 };
function wayTick(g, dt) {
  if (g.isGuest || g.dim !== 0 || !g.meta || !g.world || (WAY.t -= dt) > 0) return;
  WAY.t = 3;
  const W = wayRec(g);
  for (const p of g.pawns()) {
    const v = villageAtPos(g, p.x, p.z, 48); if (!v || W['v:' + v.id]) continue;
    const s = waySiteFor(g, v); if (!s) continue;
    // (Shadowbloom) in a campaign the village stones are the old Resonance Anchors
    const nm = (typeof campDef === 'function' && campDef(g) ? 'Resonance Anchor of ' : 'Waystone of ') + v.name;
    g.world.setBlock(s[0], s[1], s[2], B.waystone, 0);
    g.world.setEntity(s[0], s[1], s[2], { type: 'waystone', wayId: 'v:' + v.id, name: nm });
    g.entityChanged(s[0], s[1], s[2]);
    W['v:' + v.id] = { x: s[0], y: s[1], z: s[2], dim: 0, name: nm };
  }
}
function wayAttune(lp, x, y, z) {
  const g = lp.g, id = wayIdAt(g, x, y, z), W = waysOf(lp.player);
  const fresh = !W[id];
  W[id] = { x, y, z, dim: lp.player.dim ?? g.dim, name: wayNameAt(g, x, y, z) };
  if (fresh) { lp.toast(`Attuned to the ${W[id].name.replace(/^A /, '')}`, 'good'); g.sfx.play('enchant'); for (let i = 0; i < 24; i++) spellSpark(g, x + 0.5, y + 0.5 + Math.random() * 1.5, z + 0.5, 'mana_arcane', { vx: (Math.random() - 0.5) * 2, vy: 1.5, vz: (Math.random() - 0.5) * 2, life: 0.9, size: 0.08 }); }
  return id;
}
function wayCost(d, g) { if (g && typeof dndOn === 'function' && dndOn(g)) return 0; return Math.max(1, Math.min(5, Math.ceil(d / 600))); }   // (Shadowbloom) free by the d20's rules: there are no experience levels to spend
function wayGo(lp, id) {
  const g = lp.g, p = lp.player, rec = waysOf(p)[id], w = g.world;
  if (!rec) return;
  if ((rec.dim ?? 0) !== (p.dim ?? g.dim)) { lp.toast('That waystone is in another layer of the world', 'warn'); return; }
  const d = Math.hypot(rec.x - p.x, rec.z - p.z), cost = wayCost(d, g);
  if (!g.creative && (p.level || 0) < cost) { lp.toast(`You need ${cost} level${cost > 1 ? 's' : ''} of experience to go that far`, 'warn'); return; }
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) w.ensureChunk((rec.x >> 4) + dx, (rec.z >> 4) + dz);
  if (w.getBlock(rec.x, rec.y, rec.z) !== B.waystone) { delete waysOf(p)[id]; lp.toast('That waystone is gone', 'warn'); return; }
  // step out beside it
  let at = null;
  for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1], [0, 2], [2, 0]]) {
    const x = rec.x + dx, z = rec.z + dz, y = findSafeY(w, x, z, rec.y + 3);
    if (y > 0 && Math.abs(y - rec.y) <= 3) { at = [x + 0.5, y, z + 0.5]; break; }
  }
  if (!at) at = [rec.x + 0.5, rec.y + 1, rec.z + 0.5];
  if (!g.creative && cost > 0) spendLevels(p, cost);
  if (lp.riding && lp.riding.dismount) lp.riding.dismount(lp);
  for (let i = 0; i < 30; i++) spellSpark(g, p.x, p.y + Math.random() * 1.8, p.z, 'mana_arcane', { vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 3, life: 0.8, size: 0.08 });
  p.x = at[0]; p.y = at[1]; p.z = at[2]; p.vx = p.vy = p.vz = 0; p.fallStart = null; p.invuln = Math.max(p.invuln || 0, 1.5);
  g.sfx.play('spell_blink');
  for (let i = 0; i < 30; i++) spellSpark(g, p.x, p.y + Math.random() * 1.8, p.z, 'mana_arcane', { vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 3, life: 0.8, size: 0.08 });
  lp.toast(`To the ${rec.name.replace(/^A /, '')}`, 'good');
}
class WayMenu {
  constructor(lp, hereId) {
    this.lp = lp; this.g = lp.g; this.here = hereId; this.sel = 0;
    this.el = document.createElement('div'); this.el.className = 'way-view';
    this.el.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); if (ev.target === this.el) this.close(); });
    this.onKey = (ev) => {
      if (ev.code === 'Escape' || ev.code === 'KeyE') { ev.preventDefault(); ev.stopPropagation(); this.close(); return; }
      const n = /^Digit([1-9])$/.exec(ev.code); if (n) { const b = this.el.querySelectorAll('.way-row button')[+n[1] - 1]; if (b) { ev.preventDefault(); ev.stopPropagation(); b.click(); } }
    };
    window.addEventListener('keydown', this.onKey, true);
    lp.el.appendChild(this.el);
    this.draw();
  }
  draw() {
    const lp = this.lp, p = lp.player, W = waysOf(p), dim = p.dim ?? this.g.dim;
    const list = Object.entries(W).filter(([id, r]) => id !== this.here && (r.dim ?? 0) === dim).map(([id, r]) => ({ id, r, d: Math.hypot(r.x - p.x, r.z - p.z) })).sort((a, b) => a.d - b.d);
    const here = W[this.here];
    const row = (o, i) => {
      const cost = wayCost(o.d, this.g), ang = Math.atan2(o.r.x - p.x, -(o.r.z - p.z)), dir = DIR_WORDS[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
      const can = this.g.creative || cost === 0 || (p.level || 0) >= cost;
      return `<div class="way-row${can ? '' : ' poor'}"><div><b>${esc(o.r.name)}</b><span>${Math.round(o.d)} blocks ${dir}</span></div><button class="btn tiny${can ? ' primary' : ''}" data-go="${esc(o.id)}">${i < 9 ? (i + 1) + ' · ' : ''}${this.g.creative || cost === 0 ? 'Go' : cost + ' level' + (cost > 1 ? 's' : '')}</button></div>`;
    };
    const dnd = typeof dndOn === 'function' && dndOn(this.g);
    this.el.innerHTML = `<div class="way-card"><div class="way-head"><b>${esc(this.title || (here ? here.name : 'Waystone'))}</b><span>${dnd ? (this.sub || 'Resonance Anchors you are attuned to') : `You have ${p.level || 0} level${p.level === 1 ? '' : 's'}`}</span></div>
      <div class="way-list">${list.length ? list.map(row).join('') : '<div class="way-empty">No other waystones yet. Use the waystone in each village you find (or one you\'ve made) to attune to it, and you can come and go between them.</div>'}</div>
      <div class="way-hint">${dnd ? (this.hint || 'Use any anchor (or the Sending Crystal) to travel to the others you know') : 'The further, the more it costs (a level for every 600 blocks, at most 5)'} · E to close</div></div>`;
    this.el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const id = b.dataset.go; this.close(); wayGo(lp, id); if (this.onGo) this.onGo(id); });
  }
  frame(dt, inp) {
    if (inp.padB || inp.padStart || inp.inventory) { this.close(); return; }
    const bs = [...this.el.querySelectorAll('.way-row button')];
    if (inp.navX || inp.navY) { this.sel = (this.sel + ((inp.navX || inp.navY) > 0 ? 1 : bs.length - 1)) % Math.max(1, bs.length); bs.forEach((b, i) => b.classList.toggle('sel', i === this.sel)); }
    if (inp.padA && bs[this.sel]) bs[this.sel].click();
  }
  close() {
    const lp = this.lp, g = this.g;
    window.removeEventListener('keydown', this.onKey, true);
    this.el.remove();
    if (lp.npcUI === this) lp.npcUI = null;
    if (lp.mode === 'npc') lp.mode = 'play';
    if (lp.useKb && !g.input.touchMode && g.state === 'playing') g.input.requestLock();
  }
}
{
  const baseUseBlock = LocalPlayer.prototype.useBlockAt;
  LocalPlayer.prototype.useBlockAt = function (hit, held, def) {
    const b = hit && BLOCKS[hit.id];
    if (b && b.waystone && !this.player.sneaking) {
      this.swingArm();
      const id = wayAttune(this, hit.x, hit.y, hit.z);
      this.openNpcUI(() => new WayMenu(this, id));
      return true;
    }
    return baseUseBlock.call(this, hit, held, def);
  };
  // your own: named for you, and you're attuned the moment it's down
  const basePlace = LocalPlayer.prototype.placeBlock;
  LocalPlayer.prototype.placeBlock = function (hit, def, held) {
    const id0 = held && held.id;
    const r = basePlace.call(this, hit, def, held);
    if (id0 === 'waystone' && hit) {
      const g = this.g, w = g.world;
      for (const [dx, dy, dz] of [[hit.nx | 0, hit.ny | 0, hit.nz | 0], [0, 0, 0]]) {
        const x = hit.x + dx, y = hit.y + dy, z = hit.z + dz;
        if (w.getBlock(x, y, z) !== B.waystone) continue;
        const e = w.getEntity(x, y, z, () => ({ type: 'waystone' }));
        if (!e.name) { e.type = 'waystone'; e.name = `${this.name}'s Waystone`; g.entityChanged(x, y, z); }
        wayAttune(this, x, y, z);
        break;
      }
    }
    return r;
  };
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { wayTick(this, dt); } catch (e) { if (!WAY.warned) { WAY.warned = true; console.warn('waystones', e); } } return baseUpd.call(this, dt); };
  // the ones you know, on your maps
  const baseMarkers = mapMarkers;
  mapMarkers = function (g, m, lp) {
    const out = baseMarkers(g, m, lp);
    if (!lp) return out;
    const s = 1 << m.scale;
    for (const r of Object.values(waysOf(lp.player))) {
      if ((r.dim ?? 0) !== m.dim) continue;
      const u = (r.x - m.x0) / s, w = (r.z - m.z0) / s; if (u < 0 || w < 0 || u > MAP_N || w > MAP_N) continue;
      out.push({ cell: 13, u, v: w, rot: 0, label: r.name });
    }
    return out;
  };
}
RECIPES.push({ out: 'waystone', n: 1, shape: ['BEB', 'BGB', 'BBB'], key: { B: 'stone_bricks', E: 'ender_pearl', G: 'gold_ingot' } });
if (ITEMS.waystone) ITEMS.waystone.desc = 'Use a waystone to attune to it, and to travel to any other you\'re attuned to (a level or two of experience, by how far). Every village has one.';

// ---- the measure of a mount -------------------------------------------------------------------------------------------------
const HS_NAMES = ['Speed', 'Jump', 'Toughness'];
function mountStats(m) {
  if (!m || !MOUNTS[m.type]) return null;
  if (!m.hs) {
    const r = () => 0.8 + Math.random() * 0.4;
    m.hs = [r(), r(), r()].map(v => Math.round(v * 100) / 100);
    hsApplyHp(m);
  }
  return m.hs;
}
function hsApplyHp(m) { if (!m.hs || !m.T) return; const mx = Math.round((MOB_TYPES[m.type].hp || m.T.hp || 20) * m.hs[2]); const f = m.maxHealth ? m.health / m.maxHealth : 1; m.maxHealth = mx; m.health = Math.max(1, Math.round(mx * f)); }
const stars = (v) => { const n = Math.max(1, Math.min(5, Math.round((v - 0.7) / 0.13))); return '★'.repeat(n) + '☆'.repeat(5 - n); };
function hsLine(hs) { return HS_NAMES.map((k, i) => `${k} ${stars(hs[i])}`).join(' · '); }
{
  // their measure goes with them: saved with kept animals and with the stable
  const baseFields = petFields;
  petFields = function (m) { const f = baseFields(m); if (!m.hs) return f; return Object.assign(f || {}, { hs: m.hs }); };
  const baseApply = applyPetFields;
  applyPetFields = function (m, f) { baseApply(m, f); if (f && Array.isArray(f.hs) && f.hs.length === 3) { m.hs = f.hs.map(v => clamp(+v || 1, 0.6, 1.6)); hsApplyHp(m); } };
  const baseSync = stableSync;
  stableSync = function (r, m) { baseSync(r, m); if (m.hs) r.hs = m.hs; };
  // riding: their speed and their jump
  const baseRide = Mob.prototype.rideAI;
  Mob.prototype.rideAI = function (dt) {
    const M = MOUNTS[this.type], hs = mountStats(this);
    if (!M || !hs) return baseRide.call(this, dt);
    const o0 = M[0], o1 = M[1]; M[0] = o0 * hs[0] * (this.hitchedTo ? 0.85 : 1); M[1] = o1 * hs[1];
    try { return baseRide.call(this, dt); } finally { M[0] = o0; M[1] = o1; }
  };
  const baseMount = Mob.prototype.mount;
  Mob.prototype.mount = function (lp) {
    const r = baseMount.call(this, lp);
    const hs = mountStats(this); if (hs && this.riddenBy === lp) lp.toast(hsLine(hs), '');
    return r;
  };
  // a foal takes after both parents, and now and then does better
  const baseBreed = Mob.prototype.breedWith;
  Mob.prototype.breedWith = function (mate) {
    const n0 = this.game.entities.length;
    const r = baseBreed.call(this, mate);
    if (!MOUNTS[this.type]) return r;
    const a = mountStats(this), b = mountStats(mate) || a;
    const baby = this.game.entities.slice(n0).find(e => e instanceof Mob && e.type === this.type && e.baby);
    if (baby && a) {
      baby.hs = a.map((v, i) => Math.round(clamp((v + b[i]) / 2 + (Math.random() - 0.42) * 0.14, 0.7, 1.5) * 100) / 100);
      hsApplyHp(baby);
      const lp = this.game.locals.find(l => Math.hypot(l.player.x - baby.x, l.player.z - baby.z) < 16);
      if (lp) lp.toast(`A foal! ${hsLine(baby.hs)}`, 'good');
    }
    return r;
  };
}

// ---- the carriage ---------------------------------------------------------------------------------------------------------
BOAT_TYPES.carriage = { seats: [[0, 0.72, -0.25], [0, 0.72, 0.65]], item: 'carriage', hp: 6, carriage: true };
defItem('carriage', { name: 'Carriage', maxStack: 1, boat: 'carriage', rarity: 'rare', desc: 'Set it down by a tamed horse or donkey and it hitches itself. Two seats (the front one drives) and a chest (sneak and use it with an empty hand).' });
RECIPES.push({ out: 'carriage', n: 1, shape: ['PLP', 'PCP', 'S S'], key: { P: '#planks', L: 'leather', C: 'chest', S: 'stick' }, group: 'transport' });
function carriageHitch(c) {
  const g = c.game; let best = null, bd = 6;
  for (const e of g.entities) {
    if (!(e instanceof Mob) || !e.alive || e.baby || !MOUNTS[e.type] || !(e.tamed || e.owner || e.saddled) || (e.hitchedTo && e.hitchedTo !== c && !e.hitchedTo.remove)) continue;
    const d = Math.hypot(e.x - c.x, e.z - c.z); if (d < bd) { bd = d; best = e; }
  }
  if (best) {
    c.horse = best; best.hitchedTo = c;
    const lp = g.locals.find(l => Math.hypot(l.player.x - c.x, l.player.z - c.z) < 12);
    if (lp && !c._told) { c._told = true; lp.toast(`The carriage is hitched to ${best.petName || (best.T.label || 'the horse').replace(/^an? /, 'the ')}`, 'good'); }
  }
  return best;
}
function carriageUpdate(c, dt) {
  const g = c.game, w = g.world;
  if (!c.items) c.items = new Array(27).fill(null);
  if (c.hitT > 0) c.hitT -= dt;
  if (c.shakeT > 0) c.shakeT -= dt;
  c.age += dt;
  for (let i = 0; i < 2; i++) { const r = c.riders[i]; if (r && (r.dead || !g.locals.includes(r))) { c.riders[i] = null; if (r) r.riding = null; } }
  let h = c.horse;
  if (h && (h.remove || !h.alive || h.hitchedTo !== c)) { if (h && h.hitchedTo === c) h.hitchedTo = null; h = c.horse = null; }
  if (!h && (c._hitchT = (c._hitchT || 0) - dt) <= 0) { c._hitchT = 1.5; h = carriageHitch(c); }
  const ox = c.x, oz = c.z;
  if (h) {
    const fx = -Math.sin(h.yaw), fz = -Math.cos(h.yaw), tx = h.x - fx * 2.7, tz = h.z - fz * 2.7;
    const d = Math.hypot(tx - c.x, tz - c.z);
    if (Math.hypot(h.x - c.x, h.z - c.z) > 9) { c.x = tx; c.z = tz; c.y = Math.max(c.y, h.y); }
    const k = Math.min(12, d * 5);
    c.vx = d > 0.05 ? (tx - c.x) / d * k : 0; c.vz = d > 0.05 ? (tz - c.z) / d * k : 0;
    const want = Math.atan2(-(h.x - c.x), -(h.z - c.z));
    const dy = ((want - c.yaw + Math.PI * 3) % TAU) - Math.PI; c.yaw += dy * Math.min(1, dt * 6);
  } else { c.vx *= Math.max(0, 1 - dt * 6); c.vz *= Math.max(0, 1 - dt * 6); }
  c.vy = Math.max(-30, c.vy - 22 * dt);
  c.stepHeight = 1.05;
  moveEntity(w, c, dt);
  c.wheel = (c.wheel || 0) + Math.hypot(c.x - ox, c.z - oz) / 0.42 * (Math.cos(c.yaw) * (c.z - oz) + Math.sin(c.yaw) * (c.x - ox) > 0 ? 1 : -1);
  for (let i = 0; i < 2; i++) {
    const r = c.riders[i]; if (!r) continue;
    const p = r.player, s = c.seatPos(i);
    p.x = s[0]; p.y = s[1]; p.z = s[2]; p.vx = c.x - ox; p.vz = c.z - oz; p.vy = 0; p.fallStart = null; p.onGround = true;
    if (r._boatYaw !== undefined) p.yaw += c.yaw - r._boatYaw;
    r._boatYaw = c.yaw;
  }
  if (c.y < -40) c.remove = true;
}
{
  const baseUpd = Boat.prototype.update;
  Boat.prototype.update = function (dt) { if (this.T && this.T.carriage && !this.ghost) return carriageUpdate(this, dt); return baseUpd.call(this, dt); };
  const baseMount = Boat.prototype.mount;
  Boat.prototype.mount = function (lp) {
    if (!(this.T && this.T.carriage) || this.ghost) return baseMount.call(this, lp);
    const i = this.riders[0] ? (this.riders[1] ? -1 : 1) : 0;
    if (i < 0) { lp.toast('The carriage is full', ''); return; }
    this.riders[i] = lp; lp.riding = this; lp.seat = i;
    lp.player.vx = lp.player.vy = lp.player.vz = 0;
    lp.toast(i === 0 ? (this.horse ? 'You hold the reins: WASD to drive · jump · sprint · sneak to get down' : 'No horse hitched: set the carriage by a tamed horse or donkey') : 'Sneak to get down', '');
    this.game.sfx.play('door_close');
  };
  const baseBreak = Boat.prototype.breakApart;
  Boat.prototype.breakApart = function () {
    if (this.T && this.T.carriage) { if (this.horse) this.horse.hitchedTo = null; if (this.items) for (const s of this.items) if (s) this.game.dropItem(cloneStack(s), this.x, this.y + 0.5, this.z, true); this.items = null; }
    return baseBreak.call(this);
  };
  // its chest, from outside: sneak and use with an empty hand
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const e = this.targetEnt, p = this.player;
    if (!repeat && !fromOff && e && e.isBoat && e.T && e.T.carriage && p.sneaking && !p.inv.held && !this.riding) {
      if (!e.items) e.items = new Array(27).fill(null);
      this.swingArm(); this.g.sfx.play('chest'); this.openInventory('container', { cart: e }); return;
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  // the driver up front steers the horse when nobody's on its back
  const baseCtl = Mob.prototype.controlAI;
  Mob.prototype.controlAI = function (dt, p, dist, dyp, toPlayer) {
    const c = this.hitchedTo;
    if (c && !c.remove && !this.riddenBy && c.riders && c.riders[0] && !this.ghost) {
      const d = c.riders[0], M = MOUNTS[this.type] || [7, 8], hs = mountStats(this) || [1, 1, 1], inp = d.boatInput || {}, pl = d.player;
      this.grazeT = 0; this.sitting = this.sleeping = false; this.stay = false;
      if (inp.jump && this.onGround) { this.vy = M[1] * hs[1]; this.onGround = false; }
      const f = -(inp.mz || 0), s = inp.mx || 0;
      const vx = -Math.sin(pl.yaw) * f + Math.cos(pl.yaw) * s, vz = -Math.cos(pl.yaw) * f - Math.sin(pl.yaw) * s, m = Math.hypot(vx, vz);
      if (m < 0.1) return { want: 0, dir: this.yaw };
      return { want: M[0] * hs[0] * 0.85 * (inp.sprint ? 1.3 : 0.75) * Math.min(1, m), dir: Math.atan2(-vx, -vz) };
    }
    return baseCtl.call(this, dt, p, dist, dyp, toPlayer);
  };
  Object.defineProperty(Boat.prototype, 'name', { get() { return this.T && this.T.carriage ? 'Carriage' : this.items ? (this.T.ship ? 'Ship\'s Chest' : 'Boat Chest') : itemDef(this.T.item).name; }, configurable: true });
  // drawn: a box on four wheels, a hood, the shafts to the horse
  const baseDraws = Boat.prototype.draws;
  Boat.prototype.draws = function (out) {
    if (!(this.T && this.T.carriage)) return baseDraws.call(this, out);
    const g = this.game, gl = g.renderer.gl;
    if (!CARRIAGE.meshes) {
      const mk = (boxes) => { const mb = new MeshBuilder(256); for (const [mn, mx, t] of boxes) addBox(mb, mn, mx, tilesOf(t)); const r = mb.result(); return makeVAO(gl, r.verts, r.idx); };
      CARRIAGE.meshes = {
        body: mk([
          [[-0.62, 0.45, -0.9], [0.62, 0.55, 1.05], 'boat_planks'],
          [[-0.66, 0.55, -0.9], [-0.56, 1.1, 1.05], 'boat_planks'], [[0.56, 0.55, -0.9], [0.66, 1.1, 1.05], 'boat_planks'],
          [[-0.62, 0.55, 0.95], [0.62, 1.2, 1.05], 'boat_planks'], [[-0.62, 0.55, -0.9], [0.62, 0.9, -0.8], 'boat_planks'],
          [[-0.56, 0.55, -0.45], [0.56, 0.72, -0.05], 'planks'], [[-0.56, 0.55, 0.4], [0.56, 0.72, 0.85], 'planks'],
          [[-0.68, 1.1, -0.95], [0.68, 1.16, 1.1], 'boat_rail'],
          [[-0.6, 1.16, 0.15], [0.6, 1.95, 1.05], 'red_wool'], [[-0.66, 1.95, 0.1], [0.66, 2.02, 1.1], 'boat_planks'],
          [[-0.5, 0.42, -2.5], [-0.42, 0.5, -0.9], 'axle'], [[0.42, 0.42, -2.5], [0.5, 0.5, -0.9], 'axle'],
        ]),
        wheel: mk([[[-0.05, -0.42, -0.12], [0.05, 0.42, 0.12], 'planks'], [[-0.05, -0.12, -0.42], [0.05, 0.12, 0.42], 'planks'], [[-0.07, -0.08, -0.08], [0.07, 0.08, 0.08], 'axle_end']]),
      };
    }
    const M = CARRIAGE.meshes, light = this.lightAt(0.8);
    const base = Mat4.create(); Mat4.rotateY(base, this.yaw);
    if (this.shakeT > 0) Mat4.rotateZ(base, Math.sin(this.age * 60) * 0.05);
    out.push({ mesh: M.body, m: base, px: this.x, py: this.y, pz: this.z, light });
    for (const [wx, wz] of [[-0.72, -0.6], [0.72, -0.6], [-0.72, 0.75], [0.72, 0.75]]) {
      const m = Mat4.create(); m.set(base); Mat4.translate(m, wx, 0.42, wz); Mat4.rotateX(m, -(this.wheel || 0));
      out.push({ mesh: M.wheel, m, px: this.x, py: this.y, pz: this.z, light });
    }
  };
}
const CARRIAGE = { meshes: null };

// ---- looks ----------------------------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB, S1 = H('#8a8a8e'), S2 = H('#6a6a70'), RUNE = H('#7ae0ff');
    const brick = (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const row = y >> 2, off = (row & 1) * 4, mort = y % 4 === 3 || (x + off) % 8 === 7; p.set(x, y, shade(mort ? S2 : S1, 0.9 + p.rand() * 0.2)); } };
    addTile('waystone_side', p => { brick(p); for (const [x, y] of [[7, 3], [8, 3], [6, 5], [9, 5], [7, 6], [8, 6], [7, 8], [8, 8], [6, 10], [9, 10], [7, 12], [8, 12]]) p.set(x, y, RUNE); });
    addTile('waystone_top', p => { brick(p); for (let i = 3; i < 13; i++) { p.set(i, 8, RUNE); p.set(8, i, RUNE); } for (const [x, y] of [[5, 5], [10, 10], [5, 10], [10, 5]]) p.set(x, y, RUNE); });
    addItem('carriage', p => {
      for (let x = 2; x < 14; x++) for (let y = 5; y < 10; y++) p.set(x, y, shade(H('#8a5a2a'), y === 5 ? 1.2 : 0.95));
      for (let x = 3; x < 13; x++) for (let y = 2; y < 5; y++) p.set(x, y, shade(H('#c83a2a'), y === 2 ? 1.15 : 0.95));
      for (const cx of [4, 11]) for (let a = 0; a < 8; a++) { const x = Math.round(cx + Math.cos(a * 0.785) * 2), y = Math.round(11 + Math.sin(a * 0.785) * 2); p.set(x, y, H('#3a2a1a')); }
    });
  };
}
PV.debug.travel = { site: (vid) => { const v = vid ? villageById(GAME, vid) : riftSpawnVillage(GAME); return v ? waySiteFor(GAME, v) : null; }, ways: (lp) => waysOf(lp.player), go: (lp, id) => wayGo(lp, id), attune: (lp, x, y, z) => wayAttune(lp, x, y, z), stats: (m) => mountStats(m), rec: () => wayRec(GAME) };
