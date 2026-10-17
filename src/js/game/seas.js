// ---------------------------------------------------------------------------
// game/seas.js — 0.9.0.39: the seas.
//
// - Treasure maps: in shipwreck and sunken-temple chests, on pirate captains,
//   and (dear) from cartographers. Use one and it becomes a map of a stretch
//   of coast somewhere out there, with an X on it. Get close and dig: the
//   chest is just under the X.
// - Pirates: some nights a village by the sea is raided from the water. A
//   pirate ship drops anchor offshore and a crew comes up the beach with
//   their captain (who carries a treasure map). Beat them and the ship is
//   yours to sail.
// - Pirate coves: camps on lonely beaches, tents and a flag, a crew, their
//   captain and their hoard.
// ---------------------------------------------------------------------------
Object.assign(MOB_TYPES, {
  pirate: Object.assign({}, MOB_TYPES.raider, { label: 'a pirate', held: 'iron_sword', hp: 26, xp: 9, tint: [0.8, 0.15, 0.15, 0.2], drops: [['gold_nugget', 1, 4, 0.6], ['emerald', 0, 2, 0.5], ['bread', 0, 1, 0.3]] }),
  pirate_captain: Object.assign({}, MOB_TYPES.raider, { label: 'the Pirate Captain', held: 'iron_sword', hp: 150, damage: 6, xp: 140, speed: 3.1, boss: true, mini: true, knockResist: 0.5, tint: [0.25, 0.1, 0.45, 0.25],
    drops: [['treasure_map', 1, 1, 1], ['gold_ingot', 3, 8, 1], ['emerald', 4, 10, 1], ['diamond', 0, 2, 0.5]] }),
});
MONSTER_AI.pirate = MONSTER_AI.raider; MONSTER_AI.pirate_captain = MONSTER_AI.raider;
if (typeof HUNT_FAMILIES !== 'undefined' && HUNT_FAMILIES.raider) HUNT_FAMILIES.raider.push('pirate');
if (MOB_TYPES.raider.voice) { MOB_TYPES.pirate.voice = MOB_TYPES.raider.voice; MOB_TYPES.pirate_captain.voice = MOB_TYPES.raider.voice; }

defItem('treasure_map', { name: 'Treasure Map', maxStack: 1, rarity: 'rare', desc: 'An old map with an X on it. Use it to see where; dig at the X.' });
for (const k of ['pirate', 'pirate_captain']) MOB_TYPES[k].drops = MOB_TYPES[k].drops.filter(([id]) => ITEMS[id]);
Object.assign(STRUCT_LOOT, {
  buried_treasure: [['gold_ingot', 4, 10, 1], ['emerald', 6, 14, 1], ['diamond', 1, 4, 0.7], ['heart_crystal', 1, 1, 0.35], ['golden_apple', 1, 2, 0.5], ['sapphire', 1, 3, 0.4], ['ruby', 1, 3, 0.4], ['iron_ingot', 4, 9, 0.6], ['tome_blink', 1, 1, 0.15], ['saddle', 1, 1, 0.2]],
  pirate: [['gold_ingot', 2, 6, 0.8], ['gold_nugget', 6, 18, 0.7], ['emerald', 3, 9, 0.8], ['treasure_map', 1, 1, 0.5], ['diamond', 1, 2, 0.25], ['iron_sword', 1, 1, 0.3], ['bread', 2, 6, 0.5], ['rope', 2, 6, 0.3], ['spyglass', 1, 1, 0.2]],
});
for (const [k, ch] of [['wreck_treasure', 0.4], ['ocean', 0.45], ['maze', 0.05], ['ruin', 0.04]]) if (STRUCT_LOOT[k]) STRUCT_LOOT[k].push(['treasure_map', 1, 1, ch]);
if (typeof NPC_SHOPS !== 'undefined' && NPC_SHOPS.cartographer) NPC_SHOPS.cartographer.buy.push(['treasure_map', 1, 16, 2]);

// ---- treasure maps --------------------------------------------------------------------------------------------------------------
// somewhere along a coast, a few hundred blocks off
function treasureSpot(g, x0, z0) {
  const gen = g.world.gen, r = Math.random;
  let best = null;
  for (let i = 0; i < 60 && !best; i++) {
    const a = r() * TAU, d = 250 + r() * 350, x = Math.floor(x0 + Math.cos(a) * d), z = Math.floor(z0 + Math.sin(a) * d);
    const c = gen.column(x, z);
    if (c.biome === BIOME.BEACH && c.h > SEA) best = [x, z];
    else if (i > 40 && c.h > SEA + 1 && c.biome !== BIOME.OCEAN) best = [x, z];
  }
  return best;
}
function useTreasureMap(lp, held) {
  const g = lp.g, p = lp.player;
  if (g.dim !== 0) { lp.toast('This map shows the Overworld', ''); return; }
  const t = treasureSpot(g, p.x, p.z);
  if (!t) { lp.toast('The ink has run: you can\'t make out where it shows', 'warn'); return; }
  const id = newMapId();
  mapCreate(g, id, 0, t[0], t[1], 1);
  const fm = mkStack('filled_map', 1, { map: id, tx: t[0], tz: t[1], tm: 1 });
  held.n--; if (held.n <= 0) p.inv.held = fm; else lp.give(fm);
  g.sfx.play('map_paper'); lp.swingArm();
  const ang = Math.atan2(t[0] - p.x, -(t[1] - p.z)), dir = DIR_WORDS[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
  lp.toast(`The map shows a stretch of coast some ${Math.round(Math.hypot(t[0] - p.x, t[1] - p.z) / 10) * 10} blocks ${dir}, with an X on it`, 'good');
}
// the X, once someone with its map gets close: the chest is buried under it
function treasureStacks(p) { const out = []; for (const c of [p.inv.main, p.inv.off]) if (c && c.slots) for (const s of c.slots) if (s && s.tm && s.tx !== undefined) out.push(s); if (p.inv.offhand && p.inv.offhand.tm) out.push(p.inv.offhand); return out; }
function treasureBury(g, id, x, z) {
  const T = g.meta.treasures || (g.meta.treasures = {});
  if (T[id]) return T[id];
  const w = g.world; if (!w.isLoaded(x, z)) return null;
  const y = findSafeY(w, x, z); if (y < 2) return null;
  const at = [x, y - 2, z];
  w.setBlock(at[0], at[1], at[2], B.chest, 0);
  const e = w.getEntity(at[0], at[1], at[2], () => ({ type: 'chest', items: new Array(27).fill(null) }));
  e.items = structLoot('buried_treasure', mulberry32(hash32(x, z, 4411, g.meta.seed | 0)));
  g.entityChanged(at[0], at[1], at[2]);
  T[id] = at;
  return at;
}
const SEA_T = { t: 0 };
function treasureTick(g, dt) {
  if (g.dim !== 0 || !g.meta || !g.world || (SEA_T.t -= dt) > 0) return;
  SEA_T.t = 2;
  for (const l of g.locals) {
    const p = l.player;
    for (const s of treasureStacks(p)) {
      const d = Math.hypot(p.x - s.tx, p.z - s.tz);
      if (d > 24) continue;
      if (g.isGuest) { if (g.net) g.net.send({ t: 'adv', k: 'tdig', id: s.map, x: s.tx, z: s.tz, li: l.index || 0 }); }
      else treasureBury(g, s.map, s.tx, s.tz);
      if (d < 5 && !s.near) { s.near = 1; l.toast('The X is right here. Dig!', 'good'); }
    }
  }
}
{
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const held = this.player.inv.held;
    if (!repeat && !fromOff && held && held.id === 'treasure_map') { useTreasureMap(this, held); return; }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  const baseMarkers = mapMarkers;
  mapMarkers = function (g, m, lp) {
    const out = baseMarkers(g, m, lp);
    if (!lp || m.dim !== 0) return out;
    const s = 1 << m.scale;
    for (const st of treasureStacks(lp.player)) {
      if (st.map !== m.id) continue;
      const u = (st.tx - m.x0) / s, w = (st.tz - m.z0) / s; if (u < 0 || w < 0 || u > MAP_N || w > MAP_N) continue;
      out.push({ cell: 6, u, v: w, rot: 0, label: 'X marks the spot' });
    }
    return out;
  };
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { treasureTick(this, dt); } catch (e) { if (!SEA_T.warned) { SEA_T.warned = true; console.warn('treasure', e); } } return baseUpd.call(this, dt); };
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'tdig') {
      const r = this.remotes.get('g' + from + ':' + (m.li || 0));
      if (r && typeof m.id === 'string' && Math.hypot(r.x - m.x, r.z - m.z) < 32 && this.g.dim === 0) treasureBury(this.g, m.id.slice(0, 40), Math.floor(+m.x), Math.floor(+m.z));
      return;
    }
    return baseHost.call(this, from, m);
  };
}

// ---- pirate raids on villages by the sea -------------------------------------------------------------------------------------
function seaSide(g, v) {
  const gen = g.world.gen;
  for (let k = 0; k < 24; k++) {
    const a = k / 24 * TAU;
    for (let d = v.r * 0.6; d < v.r + 70; d += 4) {
      const c = gen.column(Math.floor(v.x + Math.cos(a) * d), Math.floor(v.z + Math.sin(a) * d));
      if (c.biome === BIOME.OCEAN && c.h < SEA - 2) return { a, d };
    }
  }
  return null;
}
function pirateRaid(g, v, side) {
  const w = g.world, mobs = [], gen = w.gen;
  // the beach: the last dry ground before the water
  let sx = v.x, sz = v.z;
  for (let d = 4; d < side.d; d += 2) { const x = v.x + Math.cos(side.a) * d, z = v.z + Math.sin(side.a) * d, c = gen.column(Math.floor(x), Math.floor(z)); if (c.h <= SEA) break; sx = x; sz = z; }
  const n = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n + 1; i++) {
    const x = Math.floor(sx + (Math.random() - 0.5) * 8), z = Math.floor(sz + (Math.random() - 0.5) * 8);
    if (!w.isLoaded(x, z)) continue;
    const y = findSafeY(w, x, z); if (y < 1) continue;
    const m = g.addEntity(new Mob(g, i === 0 ? 'pirate_captain' : 'pirate', x + 0.5, y, z + 0.5));
    if (m) { m.raid = v.id; m.huntT = 120; m.persistent = true; mobs.push(m); }
  }
  if (!mobs.length) return false;
  // their ship, at anchor offshore (and yours, if you beat them)
  let ship = null;
  if (BOAT_TYPES.ship) for (const off of [18, 14, 10, 7]) {
    const ox = sx + Math.cos(side.a) * off, oz = sz + Math.sin(side.a) * off;
    if (!w.isLoaded(Math.floor(ox), Math.floor(oz)) || gen.column(Math.floor(ox), Math.floor(oz)).h >= SEA - 2) continue;
    ship = g.addEntity(new Boat(g, 'ship', ox, SEA + 0.2, oz, Math.atan2(-(v.x - ox), -(v.z - oz))));
    if (ship) { ship.sail = 0; ship.pirate = v.id; }
    break;
  }
  g._raid = { vid: v.id, name: v.name, mobs, t: 0, n: mobs.length, pirate: true };
  g.sfx.playAt('rift_boom', sx, v.y + 2, sz, 140);
  for (const l of g.locals) if (Math.hypot(l.player.x - v.x, l.player.z - v.z) < 140) l.toast(ship ? `Pirates! A ship has dropped anchor off ${v.name} and its crew is coming ashore!` : `Pirates! A crew is coming up the beach at ${v.name}!`, 'boss');
  if (g.net) g.net.all({ t: 'chat', from: v.name, text: 'Pirates! Ship off the beach!' });
  return true;
}
{
  const base = raidStart;
  raidStart = function (g, v, st, sealed) {
    if (g.dim === 0 && Math.random() < 0.7) { const side = seaSide(g, v); if (side && pirateRaid(g, v, side)) return; }
    return base(g, v, st, sealed);
  };
}

// ---- pirate coves ------------------------------------------------------------------------------------------------------------------
function coveplan(gen, x, z, rnd) {
  // the nearest stretch of beach to the spot picked
  let c = gen.column(x, z);
  for (let r = 4; r <= 60 && (c.biome !== BIOME.BEACH || c.h <= SEA); r += 4) for (let k = 0; k < 12; k++) {
    const a = k / 12 * TAU, bx = Math.floor(x + Math.cos(a) * r), bz = Math.floor(z + Math.sin(a) * r), q = gen.column(bx, bz);
    if (q.biome === BIOME.BEACH && q.h > SEA) { x = bx; z = bz; c = q; break; }
  }
  if (c.biome !== BIOME.BEACH || c.h <= SEA) return null;
  // which way the sea is
  let sea = null;
  for (let k = 0; k < 8 && !sea; k++) { const a = k / 8 * TAU; for (let d = 6; d <= 20; d += 2) { const q = gen.column(Math.floor(x + Math.cos(a) * d), Math.floor(z + Math.sin(a) * d)); if (q.biome === BIOME.OCEAN) { sea = a; break; } } }
  if (sea === null) return null;
  const cx = Math.floor(x - Math.cos(sea) * 3), cz = Math.floor(z - Math.sin(sea) * 3);
  const [lo, hi] = sLand(gen, cx - 6, cz - 6, cx + 6, cz + 6);
  if (hi - lo > 4 || lo <= SEA - 1) return null;
  const y = gen.column(cx, cz).h;
  const res = [0, 1, 2].map(i => ({ at: [cx - 3 + i * 3, y + 1, cz + 3], mob: 'pirate' }));
  return { x0: cx - 8, z0: cz - 8, x1: cx + 8, z1: cz + 8, cx, cz, y, sea, surface: true, residents: res,
    boss: { at: [cx, y + 1, cz - 2], type: 'pirate_captain', box: [cx - 7, y - 1, cz - 7, cx + 7, y + 6, cz + 7] }, name: 'a Pirate Cove' };
}
function covebuild(P, S) {
  const { cx, cz } = S, gy = (x, z) => P.ground(x, z);
  // two tents (red and white canvas over a pole)
  for (const [tx, tz, col] of [[cx - 4, cz - 3, 'red_wool'], [cx + 3, cz - 3, 'white_wool']]) {
    const y0 = gy(tx, tz);
    for (let dz = -1; dz <= 1; dz++) for (let k = 0; k < 3; k++) { P.put(tx - 1 + k, y0 + 1 + (k === 1 ? 2 : 1), tz + dz, B[col] !== undefined ? col : 'wool'); }
    for (let dz = -1; dz <= 1; dz++) { P.put(tx - 2, y0 + 1, tz + dz, B[col] !== undefined ? col : 'wool'); P.put(tx + 2, y0 + 1, tz + dz, B[col] !== undefined ? col : 'wool'); }
    P.put(tx, y0 + 1, tz - 1, 'oak_fence'); P.put(tx, y0 + 2, tz - 1, 'oak_fence');
  }
  // the fire, the hoard, the barrels, the flag
  const y = gy(cx, cz);
  P.put(cx, y + 1, cz, 'campfire');
  P.chest(cx - 2, gy(cx - 2, cz + 1) + 1, cz + 1, 2, 'pirate'); P.chest(cx + 2, gy(cx + 2, cz + 1) + 1, cz + 1, 2, 'pirate'); P.chest(cx, gy(cx, cz - 5) + 1, cz - 5, 2, 'pirate');
  for (const [bx, bz] of [[cx + 5, cz + 1], [cx + 5, cz + 2], [cx - 5, cz + 2]]) if (B.barrel !== undefined) P.put(bx, gy(bx, bz) + 1, bz, 'barrel');
  const fx = cx + 6, fz = cz - 5, fy = gy(fx, fz);
  for (let k = 1; k <= 6; k++) P.put(fx, fy + k, fz, 'oak_fence');
  for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) P.put(fx + 1 + k, fy + 5 + j, fz, B.black_wool !== undefined ? 'black_wool' : 'wool');
  // a short jetty out over the water
  for (let d = 4; d <= 14; d++) {
    const x = Math.floor(cx + Math.cos(S.sea) * d), z = Math.floor(cz + Math.sin(S.sea) * d);
    if (!P.in(x, z)) continue;
    const g0 = gy(x, z); if (g0 > SEA + 1) continue;
    P.put(x, SEA + 1, z, 'planks'); if (d % 4 === 0) for (let yy = g0 + 1; yy <= SEA; yy++) P.put(x, yy, z, 'log');
  }
}
const PIRATE_COVE = defStruct({ key: 'pirate_cove', name: 'a Pirate Cove', reg: 600, chance: 0.6, margin: 40, dims: [0], plan: coveplan, build: covebuild });

// ---- looks ------------------------------------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addItem('treasure_map', p => {
      for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) p.set(x, y, shade(H('#d8c08a'), 0.9 + p.rand() * 0.15));
      for (let i = 2; i < 14; i++) { p.set(i, 2, H('#8a6a3a')); p.set(i, 13, H('#8a6a3a')); p.set(2, i, H('#9a7a4a')); p.set(13, i, H('#9a7a4a')); }
      for (let i = 0; i < 4; i++) { p.set(8 + i, 6 + i, H('#c82a2a')); p.set(11 - i, 6 + i, H('#c82a2a')); }
      for (const [x, y] of [[4, 10], [5, 9], [6, 9], [7, 8], [5, 5], [6, 5], [4, 6]]) p.set(x, y, H('#5a7a9a'));
    });
  };
}
PV.debug.seas = { raid: (vid) => { const g = GAME, v = vid ? villageById(g, vid) : riftSpawnVillage(g); const side = v && seaSide(g, v); return side ? pirateRaid(g, v, side) : 'inland'; }, spot: () => treasureSpot(GAME, GAME.local.player.x, GAME.local.player.z), bury: (id, x, z) => treasureBury(GAME, id, x, z), cove: (x, z) => { const T = STRUCTS[PIRATE_COVE.idx], rx = Math.floor(x / T.reg), rz = Math.floor(z / T.reg); for (let r = 0; r <= 4; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const S = GAME.world.gen.structAt(PIRATE_COVE.idx, rx + dx, rz + dz); if (S) return S; } return null; } };
