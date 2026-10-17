// ---------------------------------------------------------------------------
// game/livingworld.js — 0.9.0.30: a living world.
//
// Raids: some nights, drums. A band of marauders comes for the village you're
//   in or near (and, as the rift thins, things from the rift come with them).
//   Beat them all and the village thanks you: emeralds, and standing. A
//   village is left alone for a few days after; once the rift is sealed, the
//   rift's creatures stop coming, and the raids grow rarer.
// Named foes: the quest board now and then posts a bounty on one creature with
//   a name and a reputation, out in the wild at a place it gives: far tougher
//   than its kind, with a bar over the screen when you meet it, and good
//   things on it. It's there when you get there.
// Your maps mark where your jobs are: the dungeon, the place to scout, the
//   village to carry word to, the named foe's haunt.
// ---------------------------------------------------------------------------
const RAID = { checkT: 30 };
function raidRec(g, vid) { const m = g.meta.raids || (g.meta.raids = {}); return m[vid] || (m[vid] = { last: -99 }); }
function raidTick(g, dt) {
  if (g.isGuest || g.dim !== 0 || !g.meta || !g.world || g.state !== 'playing') return;
  const active = g._raid;
  if (active) { raidActive(g, active, dt); return; }
  if ((RAID.checkT -= dt) > 0) return;
  RAID.checkT = 40;
  if (g.rules && g.rules().mobSpawning === false) return;
  if (!(g.env && g.env.day < 0.25)) return;      // only in the dark
  const ps = g.pawns().filter(p => !p.dead && !p.serverPawn);
  for (const p of ps) {
    const v = villageAtPos(g, p.x, p.z, 64); if (!v) continue;
    const rec = raidRec(g, v.id), day = npcDay(g);
    if (day - rec.last < 3) continue;
    const R = g.meta.rift || {}, st = typeof riftStability === 'function' ? riftStability(g) : 100;
    const chance = R.sealed ? 0.05 : 0.08 + (100 - st) / 100 * 0.18;
    if (Math.random() > chance) continue;
    rec.last = day;
    raidStart(g, v, st, !!R.sealed);
    return;
  }
}
function raidStart(g, v, st, sealed) {
  const n = 4 + Math.floor(Math.random() * 3) + Math.floor((100 - st) / 30), mobs = [];
  // (0.9.0.31) they gather somewhere the world is actually there (a raider made in an unloaded column stood frozen
  // under the world, and the raid couldn't be won); failing that, nearer the square
  let a = Math.random() * TAU, R = 46, cx = 0, cz = 0;
  for (let k = 0; k < 16; k++) {
    if (k === 8) R = 26;
    const ta = a + k * 0.785; cx = v.x + Math.cos(ta) * R; cz = v.z + Math.sin(ta) * R;
    if (g.world.isLoaded(Math.floor(cx), Math.floor(cz)) && findSafeY(g.world, Math.floor(cx), Math.floor(cz)) > 0) break;
  }
  for (let i = 0; i < n; i++) {
    const x = cx + (Math.random() - 0.5) * 8, z = cz + (Math.random() - 0.5) * 8;
    if (!g.world.isLoaded(Math.floor(x), Math.floor(z))) continue;
    const y = findSafeY(g.world, Math.floor(x), Math.floor(z));
    if (y == null || y < 1) continue;
    const rift = !sealed && st < 60 && Math.random() < (100 - st) / 160;
    const type = rift ? ['rift_ghoul', 'rift_skeleton', 'rift_spider'][Math.floor(Math.random() * 3)] : (Math.random() < 0.15 && MOB_TYPES.witch ? 'witch' : 'raider');
    if (!MOB_TYPES[type]) continue;
    const m = g.addEntity(new Mob(g, type, x + 0.5, y, z + 0.5));
    if (m) { m.raid = v.id; m.huntT = 120; m.persistent = true; mobs.push(m); }
  }
  if (!mobs.length) return;
  g._raid = { vid: v.id, name: v.name, mobs, t: 0, n: mobs.length };
  g.sfx.playAt('rift_boom', cx, v.y + 2, cz, 140);
  for (const l of g.locals) if (Math.hypot(l.player.x - v.x, l.player.z - v.z) < 120) l.toast(`Drums in the dark! A raid is coming for ${v.name}!`, 'boss');
  if (g.net) g.net.all({ t: 'chat', from: v.name, text: 'Drums in the dark! A raid is coming!' });
}
function raidActive(g, R, dt) {
  R.t += dt;
  // they head for the village square
  const v = villageById(g, R.vid);
  for (const m of R.mobs) if (m.alive && v && !m.lookAt && (m._rgT = (m._rgT || 0) - dt) <= 0) { m._rgT = 2; const d = Math.hypot(v.x - m.x, v.z - m.z); if (d > 6) { m.wanderTo = [v.x, v.y, v.z]; m.yaw = Math.atan2(-(v.x - m.x), -(v.z - m.z)); } }
  const left = R.mobs.filter(m => m.alive && !m.remove);
  if (left.length && R.t < 600) return;
  g._raid = null;
  // (0.9.0.31) won only when every raider was actually brought down (walking away until they were tidied up won it)
  const slain = R.mobs.filter(m => m.deathTime > 0).length;
  if (left.length || slain < R.mobs.length) { for (const m of left) m.remove = true; for (const l of g.locals) l.toast(`The raiders melt back into the dark around ${R.name}`, ''); return; }
  // won: the village thanks whoever stood with it (players joined over the network too)
  const near = g.pawns().filter(p => !p.dead && !p.serverPawn && v && Math.hypot(p.x - v.x, p.z - v.z) < 90);
  for (const p of near) {
    const lp = g.locals.find(l => l === p || l.player === p);
    const who = lp || (typeof RemotePawn === 'function' && p instanceof RemotePawn ? p : null);
    if (who) {
      who.toast(`The raid on ${R.name} is beaten! The village thanks you.`, 'epic');
      const left2 = who.give(mkStack(COIN(), 4 + R.n)); if (left2 > 0) g.dropItem(mkStack(COIN(), left2), p.x, p.y + 1, p.z, true);
      who.grantXP(40 + R.n * 8);
    }
    npcRep(g, lp || p, R.vid, 15, 'raid');
  }
  g.sfx.play('levelup');
}
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { raidTick(this, dt); eliteTick(this, dt); } catch (e) { if (!RAID.warned) { RAID.warned = true; console.warn('living world', e); } } return baseUpd.call(this, dt); };
  // a raider walking to the square
  const baseUpdM = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (this.raid && this.wanderTo && !this.ghost && this.alive && !(this.lookAt && Math.hypot(this.lookAt.x - this.x, this.lookAt.z - this.z) < 20)) {
      const [tx, , tz] = this.wanderTo, d = Math.hypot(tx - this.x, tz - this.z);
      if (d > 5) { const k = Math.min(1, dt * 4), sp = (this.T.speed || 2.5) * 0.8; this.vx += ((tx - this.x) / d * sp - this.vx) * k; this.vz += ((tz - this.z) / d * sp - this.vz) * k; this.yaw = Math.atan2(-(tx - this.x), -(tz - this.z)); }
    }
    return baseUpdM.call(this, dt);
  };
  // raiders don't count against the "nothing spawns in a village" rule, and don't wander off for good
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) { const r = baseDie.call(this, src); if (this.elite && !this.game.isGuest) eliteSlain(this.game, this, src); return r; };
}

// ---- named foes -------------------------------------------------------------------------------------------------------
const ELITE_FIRST = ['Grim', 'Rot', 'Ash', 'Gnash', 'Mord', 'Skarr', 'Vel', 'Hollow', 'Bram', 'Quill', 'Thorn', 'Dread', 'Mire', 'Crag', 'Fen', 'Wither'];
const ELITE_LAST = ['tooth', 'maw', 'claw', 'gut', 'eye', 'jaw', 'back', 'hide', 'fang', 'skull', 'spine', 'heart'];
const ELITE_EPITHET = ['the Cruel', 'the Old', 'the Hungry', 'the Unburied', 'the Patient', 'of the Barrows', 'the Red', 'Who Walks at Noon', 'the Twice-Dead', 'the Collector'];
const ELITE_KIND = [['ghoul', 'ghoul'], ['skeleton', 'skeleton'], ['spider', 'spider'], ['raider', 'raider'], ['werewolf', 'werewolf'], ['ogre', 'ogre']];
// (0.9.0.31) its own mix of the village seed and the period (questRand's lost precision on big seeds, so some villages
// only ever posted two kinds of foe)
function eliteMix(s, p, salt) { let h = Math.imul((s | 0) ^ 0x5bd1e995, 0x27d4eb2d) ^ Math.imul((p | 0) + salt * 0x3c6ef372, 0x85ebca6b); h ^= h >>> 15; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 13; return h >>> 0; }
function eliteName(r) { return ELITE_FIRST[Math.floor(r() * ELITE_FIRST.length)] + ELITE_LAST[Math.floor(r() * ELITE_LAST.length)] + ' ' + ELITE_EPITHET[Math.floor(r() * ELITE_EPITHET.length)]; }
{
  const base = boardQuests;
  boardQuests = function (g, v) {
    const out = base(g, v);
    const day = npcDay(g), period = Math.floor(day / 3), r = mulberry32(eliteMix(v.seed, period, 34));
    if (g.dim !== 0 || r() > 0.75) return out;
    const kinds = ELITE_KIND.filter(([t]) => MOB_TYPES[t]); if (!kinds.length) return out;
    const [type] = kinds[Math.floor(r() * kinds.length)], name = eliteName(r);
    const a = r() * TAU, d = 120 + r() * 140, x = Math.round(v.x + Math.cos(a) * d), z = Math.round(v.z + Math.sin(a) * d);
    const dirs = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'], dir = dirs[(Math.round(a / (Math.PI / 4)) + 8) % 8];
    const lvl = 1 + Math.min(4, Math.floor(day / 6));
    out.push({ id: v.id + ':el:' + period, vid: v.id, giver: -1, from: 'Quest Board', kind: 'elite', etype: type, ename: name, elvl: lvl, need: 1, at: [x, z],
      title: 'Wanted: ' + name, text: `${name} has been seen some ${Math.round(d / 10) * 10} blocks to the ${dir} (near x ${x}, z ${z}). Bring it down. It is no ordinary ${String(MOB_TYPES[type].label || type).replace(/^an? /, '').replace(/_/g, ' ')}.`,
      reward: { em: 10 + lvl * 4, xp: 120 + lvl * 40, rep: 12, skill: ['melee', 500 + lvl * 200] } });
    return out;
  };
  const baseHave = questHave;
  questHave = function (lp, q) { return q.kind === 'elite' ? (q.have || 0) : baseHave(lp, q); };
}
// it's there when someone with the bounty comes near its haunt (someone on this device, or a player joined over the
// network: their board is their own, so their game tells this one when they're close to their bounty's haunt)
function eliteTick(g, dt) {
  if (g.dim !== 0 || !g.meta) return;
  if ((RAID.elT = (RAID.elT || 0) - dt) > 0) return;
  RAID.elT = 2;
  if (g.isGuest) {
    if (!g.net) return;
    for (const l of g.locals) for (const q of npcStats(l.player).quests) {
      if (q.kind !== 'elite' || q.have || !q.at) continue;
      if (Math.hypot(l.player.x - q.at[0], l.player.z - q.at[1]) < 56) g.net.send({ t: 'adv', k: 'eliteat', li: l.index, q: { id: q.id, etype: q.etype, ename: q.ename, elvl: q.elvl, at: q.at } });
    }
    return;
  }
  const E = g.meta.elites || (g.meta.elites = {});
  for (const l of g.locals) {
    for (const q of npcStats(l.player).quests) {
      if (q.kind !== 'elite' || q.have || !q.at) continue;
      if (Math.hypot(l.player.x - q.at[0], l.player.z - q.at[1]) > 56) continue;
      eliteSpawn(g, q, l);
    }
  }
  const W = RAID.wants; if (!W) return;
  const now = performance.now();
  for (const [id, w] of W) {
    if (now - w.t > 8000) { W.delete(id); continue; }
    eliteSpawn(g, w.q, w.r);
  }
}
function eliteSpawn(g, q, who) {
  const E = g.meta.elites || (g.meta.elites = {});
  if (E[q.id] === 'dead' || !MOB_TYPES[q.etype]) return;
  if (g.entities.some(e => e.elite === q.id && e.alive)) return;
  const qx = Math.floor(+q.at[0]), qz = Math.floor(+q.at[1]);
  if (!g.world.isLoaded(qx, qz)) return;
  // its haunt, or the nearest dry ground to it (findSafeY passes over water)
  let sx = qx, sz = qz, y = findSafeY(g.world, qx, qz);
  for (let k = 0; y < 1 && k < 24; k++) { const a = k * 0.9, r = 3 + k; sx = Math.floor(qx + Math.cos(a) * r); sz = Math.floor(qz + Math.sin(a) * r); if (g.world.isLoaded(sx, sz)) y = findSafeY(g.world, sx, sz); }
  if (y == null || y < 1) return;
  const m = g.addEntity(new Mob(g, q.etype, sx + 0.5, y, sz + 0.5)); if (!m) return;
  const k = 1 + 0.25 * (q.elvl || 1);
  m.elite = q.id; m.persistent = true; m.huntT = 60;
  m.T = Object.assign({}, m.T, { boss: true, mini: true, label: q.ename, hp: Math.round((m.T.hp || 20) * 5 * k), damage: Math.round((m.T.damage || 3) * 1.7 * k * 2) / 2, speed: (m.T.speed || 2.5) * 1.15, knockResist: Math.max(m.T.knockResist || 0, 0.5), tint: [1, 0.25, 0.15, 0.25], xp: (m.T.xp || 5) * 8,
    drops: (m.T.drops || []).concat([['emerald', 4, 10, 1], ['gold_ingot', 1, 4, 0.8], ['diamond', 1, 2, 0.35], ['heart_crystal', 1, 1, 0.12], [['steel_sword', 'mithril_sword', 'steel_chestplate', 'golden_apple'][Math.floor(Math.random() * 4)], 1, 1, 0.5]]).filter(([id]) => ITEMS[id]) });
  m.maxHealth = m.health = m.T.hp;
  if (who && who.toast) who.toast(`${q.ename} is here!`, 'boss');
  g.sfx.playAt('rift_boom', m.x, m.y + 2, m.z, 60);
}
function eliteSlain(g, m, src) {
  const E = g.meta.elites || (g.meta.elites = {}); E[m.elite] = 'dead';
  for (const l of g.locals) {
    const S = npcStats(l.player);
    for (const q of S.quests) if (q.id === m.elite && !q.have) { q.have = 1; l.toast(`${q.ename} is dead. Back to the board for your bounty.`, 'epic'); questHud(l); }
  }
  if (g.net) for (const p of g.net.pawns()) if (Math.hypot(p.x - m.x, p.z - m.z) < 80) p.send({ t: 'adv', k: 'elite', q: m.elite });
}
{
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'eliteat' && m.q && typeof m.q.id === 'string') {
      // (0.9.0.33) only the host's own copy of a real bounty (a guest's word alone could call up anything)
      const r = this.remotes.get('g' + from + ':' + (m.li || 0)), q = boardJob(this.g, m.q.id, 'elite');
      if (r && q && Math.hypot(r.x - q.at[0], r.z - q.at[1]) < 64) { const W = RAID.wants || (RAID.wants = new Map()); if (W.has(q.id) || W.size < 16) W.set(q.id, { q, r, t: performance.now() }); }
      return;
    }
    return baseHost.call(this, from, m);
  };
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv' && m.k === 'sfound' && typeof m.id === 'string') {
      const l = this.g.locals[m.li || 0] || this.g.locals[0], st = l.player.stats || (l.player.stats = {}); st.sseen = st.sseen || {};
      if (!st.sseen[m.id]) {
        const name = String(m.n || 'a place'); st.sseen[m.id] = [+(m.c && m.c[0]) || 0, +(m.c && m.c[1]) || 0, name];
        l.toast(`You have found ${/^(the|an?) /i.test(name) ? name.replace(/^(The|An?) /, (x) => x.toLowerCase()) : 'a ' + name}!`, 'good');
        l.grantXP(25, l.player.x, l.player.y + 2, l.player.z); questHud(l);
      }
      return;
    }
    if (m && m.t === 'adv' && m.k === 'elite') { for (const l of this.g.locals) { const S = npcStats(l.player); for (const q of S.quests) if (q.id === m.q && !q.have) { q.have = 1; l.toast(`${q.ename} is dead. Back to the board for your bounty.`, 'epic'); questHud(l); } } return; }
    return baseGuest.call(this, m);
  };
}
// ---- where your jobs are, on your maps ---------------------------------------------------------------------------------
{
  const baseMarkers = mapMarkers;
  mapMarkers = function (g, m, lp) {
    const out = baseMarkers(g, m, lp);
    if (m.dim !== 0 || !lp) return out;
    const s = 1 << m.scale, S = npcStats(lp.player);
    for (const q of S.quests) {
      const at = q.at; if (!at || q.have) continue;
      const u = (at[0] - m.x0) / s, w = (at[1] - m.z0) / s; if (u < 0 || w < 0 || u > MAP_N || w > MAP_N) continue;
      out.push({ cell: 13, u, v: w, rot: 0, label: q.title });
    }
    return out;
  };
}
PV.debug.living = { raid: (vid) => { const g = GAME, v = vid ? villageById(g, vid) : riftSpawnVillage(g); if (v) raidStart(g, v, 60, false); return g._raid ? g._raid.n : 0; }, state: () => ({ raid: GAME._raid ? { n: GAME._raid.n, left: GAME._raid.mobs.filter(m => m.alive).length } : null }) };
