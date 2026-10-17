// ---------------------------------------------------------------------------
// game/deephalls.js — 0.9.0.38: the Deep Halls and the Twin Vault.
//
// The Deep Halls: a dungeon three floors deep, under a ring of old stones. On
//   each floor the way down is behind a locked gate: the bronze key lies in a
//   chest on the first floor, the Gaoler carries the silver one on the second,
//   and the gold key opens the Lich King's hall on the third. Rooms of cages,
//   rooms with dart traps under their floor plates, and on the first floor a
//   lever puzzle: set the levers the way the keeper's mural shows and a hidden
//   vault opens. Beat the Lich King and his vault opens behind him.
// The Twin Vault: built for two. Its door opens only while both of the plates
//   in the antechamber are held down at once (by two of you, or by something
//   heavy left on one), and inside wait the Sun and Moon Wardens: fell one
//   and the other must follow within fifteen seconds, or the first rises again.
//   Beat them both and the vault behind them is yours.
// ---------------------------------------------------------------------------
defItem('key_bronze', { name: 'Bronze Key', maxStack: 1, rarity: 'rare', desc: 'Opens the bronze gate on the first floor of the Deep Halls.' });
defItem('key_silver', { name: 'Silver Key', maxStack: 1, rarity: 'rare', desc: 'Opens the silver gate on the second floor of the Deep Halls.' });
defItem('key_gold', { name: 'Gold Key', maxStack: 1, rarity: 'epic', desc: 'Opens the Lich King\'s hall, deep in the Deep Halls.' });
for (const k of ['key_bronze', 'key_silver', 'key_gold']) KEEP_DROPS.add(k);
for (const k of ['dungeon_gate']) UNOBTAINABLE.add(k);
Object.assign(STRUCT_LOOT, {
  deep: [['bone', 2, 6, 0.5], ['arrow', 4, 12, 0.45], ['iron_ingot', 2, 5, 0.5], ['gold_ingot', 1, 4, 0.4], ['emerald', 2, 6, 0.5], ['steel_ingot', 1, 3, 0.3], ['diamond', 1, 2, 0.2], ['golden_apple', 1, 1, 0.12], ['tome_haste', 1, 1, 0.08], ['tome_icenova', 1, 1, 0.06]],
  deep_secret: [['diamond', 2, 5, 0.9], ['mithril_ingot', 2, 4, 0.7], ['emerald', 8, 16, 1], ['golden_apple', 1, 3, 0.6], ['heart_crystal', 1, 1, 0.4], ['tome_fireball', 1, 1, 0.3], ['tome_guardian', 1, 1, 0.25], ['ruby', 2, 4, 0.5], ['sapphire', 2, 4, 0.5]],
  deep_vault: [['adamantite_ingot', 1, 3, 0.7], ['mithril_ingot', 2, 5, 0.9], ['diamond', 3, 6, 1], ['emerald', 12, 24, 1], ['heart_crystal', 1, 1, 0.7], ['golden_apple', 2, 4, 0.8], ['tome_lightning', 1, 1, 0.4], ['tome_icenova', 1, 1, 0.4], ['ruby_staff', 1, 1, 0.3]],
  twin_vault: [['adamantite_ingot', 2, 4, 0.9], ['diamond', 4, 8, 1], ['emerald', 16, 32, 1], ['heart_crystal', 1, 2, 0.8], ['golden_apple', 2, 5, 1], ['mithril_ingot', 3, 6, 0.8], ['tome_guardian', 1, 1, 0.5], ['tome_fireball', 1, 1, 0.5], ['saddle', 1, 1, 0.4]],
});
LORE.deep_halls = ['The Keeper\'s Mural', 'Those who kept these halls trusted no lock they could not change. The way into the treasury, they set in the levers of the hall beside it, and painted the setting on the wall of the keeper\'s room, green for pulled and red for left alone.\n\nThe keeper is long dead. The paint is not.'];
LORE.twin_vault = ['The Twin Wardens', 'Two stood guard over the vault, the Sun and the Moon, and each one\'s death was only the other\'s grief: fell one, and the other calls it back.\n\nOnly a pair could open the door, and only a pair could hope to pass them.'];
LORE_KEYS.push('deep_halls', 'twin_vault');

// ---- the keepers ------------------------------------------------------------------------------------------------------------
Object.assign(MOB_TYPES, {
  gaoler: Object.assign({}, MOB_TYPES.ogre, { label: 'the Gaoler', hp: 170, damage: 9, xp: 160, boss: true, mini: true, tint: [0.35, 0.3, 0.25, 0.3], drops: [['emerald', 4, 10, 1], ['iron_ingot', 3, 8, 1], ['ogre_club', 1, 1, 0.5]] }),
  lich_king: Object.assign({}, MOB_TYPES.hollow_archmage, { label: 'the Lich King', hp: 460, damage: 8, xp: 420, speed: 2.6, tint: [0.2, 0.9, 0.5, 0.3], held: 'ruby_staff',
    drops: [['emerald', 10, 20, 1], ['diamond', 2, 5, 1], ['heart_crystal', 1, 1, 0.6], ['mithril_ingot', 2, 4, 1], ['lore_deep_halls', 1, 1, 0.5]] }),
  warden_sun: Object.assign({}, MOB_TYPES.cinder_golem, { label: 'the Sun Warden', hp: 300, damage: 8, xp: 300, tint: [1, 0.85, 0.3, 0.32], drops: [['gold_ingot', 6, 12, 1], ['emerald', 6, 12, 1], ['heart_crystal', 1, 1, 0.3]] }),
  warden_moon: Object.assign({}, MOB_TYPES.cinder_golem, { label: 'the Moon Warden', hp: 300, damage: 8, xp: 300, tint: [0.4, 0.6, 1, 0.32], drops: [['diamond', 1, 3, 1], ['emerald', 6, 12, 1], ['heart_crystal', 1, 1, 0.3]] }),
});
for (const k of ['gaoler', 'lich_king', 'warden_sun', 'warden_moon']) MOB_TYPES[k].drops = MOB_TYPES[k].drops.filter(([id]) => ITEMS[id]);
if (MONSTER_AI.ogre) MONSTER_AI.gaoler = MONSTER_AI.ogre;
MONSTER_AI.lich_king = MONSTER_AI.hollow_archmage;
if (typeof FRAG_FOES !== 'undefined') Object.assign(FRAG_FOES, { lich_king: 'the Lich King' });
defItem('lore_deep_halls', { name: 'Old Book: ' + LORE.deep_halls[0], maxStack: 1, icon: 'lore_book', lore: 'deep_halls', rarity: 'rare', desc: 'Use it to read it.' });
{
  // the Wardens fight the way the Cinder Golem does
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if ((this.type === 'warden_sun' || this.type === 'warden_moon') && !this.controlAI_) { this.controlAI_ = true; const self = this; this.controlAI = function (dt2, p, dist, dyp, toPlayer) { return self.bossAI ? self.bossAI(dt2, dist, toPlayer, p) : null; }; }
    return baseUpd.call(this, dt);
  };
}

// ---- the Deep Halls: the plan ----------------------------------------------------------------------------------------------
const DH = { C: 10, N: 3, F: 3, FH: 9 };
const DH_THEMES = [
  { wall: ['stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks', 'stone_bricks'], floor: ['stone_bricks', 'cobblestone', 'mossy_stone_bricks'], mob: 'skeleton' },
  { wall: ['mossy_cobblestone', 'cobblestone', 'mossy_stone_bricks'], floor: ['cobblestone', 'mossy_cobblestone', 'gravel'], mob: 'spider' },
  { wall: ['slate_bricks', 'cracked_slate_bricks', 'cobbled_slate', 'slate_bricks'], floor: ['slate_bricks', 'cobbled_slate'], mob: 'ghoul' },
];
for (const t of DH_THEMES) { t.wall = t.wall.filter(k => B[k] !== undefined); t.floor = t.floor.filter(k => B[k] !== undefined); if (!t.wall.length) t.wall = ['stone_bricks']; if (!t.floor.length) t.floor = ['stone_bricks']; }
const DH_CORNERS = [[0, 0], [2, 0], [2, 2], [0, 2]];
function dhPlan(gen, x, z, rnd) {
  const c = gen.column(x, z); if (!sLandy(c)) return null;
  const C = DH.C, W = DH.N * C + 1, X0 = x - (W >> 1), Z0 = z - (W >> 1);
  const [lo, hi] = sLand(gen, X0, Z0, X0 + W - 1, Z0 + W - 1);
  if (hi - lo > 14) return null;
  const Y0 = Math.max(28, Math.min(44, lo - 14));
  if (lo - Y0 < 10) return null;
  const cell = (cx, cz) => ({ cx, cz, x0: X0 + cx * C, z0: Z0 + cz * C });   // walls at x0 and x0 + C
  const key = (cx, cz) => cx + ',' + cz;
  const floors = [];
  let f0 = null;
  let entry = DH_CORNERS[Math.floor(rnd() * 4)];
  for (let f = 0; f < DH.F; f++) {
    const y = Y0 - f * DH.FH, roles = new Map();
    const ei = DH_CORNERS.findIndex(q => q[0] === entry[0] && q[1] === entry[1]);
    roles.set(key(...entry), 'entry');
    let stair = null, vault = null;
    if (f < DH.F - 1) { stair = DH_CORNERS[(ei + (f === 0 ? 1 : 2)) % 4]; roles.set(key(...stair), 'stair'); }
    const free = () => { const out = []; for (let cz = 0; cz < 3; cz++) for (let cx = 0; cx < 3; cx++) if (!roles.has(key(cx, cz))) out.push([cx, cz]); return out; };
    const take = (role, list) => { const l = list || free(); if (!l.length) return null; const q = l[Math.floor(rnd() * l.length)]; roles.set(key(...q), role); return q; };
    let gates = [];
    if (f === 0) {
      // the secret vault in a free corner, the puzzle room beside it, the keeper's room (key and mural) elsewhere
      vault = take('secret', DH_CORNERS.filter(q => !roles.has(key(...q))));
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => [vault[0] + a, vault[1] + b]).filter(q => q[0] >= 0 && q[1] >= 0 && q[0] < 3 && q[1] < 3 && !roles.has(key(...q)));
      const puz = take('puzzle', nb);
      take('keyroom'); take('cage'); take('trap'); take('cage');
      for (const q of free()) roles.set(key(...q), 'hall');
      f0 = { puz, vault };
    } else if (f === 1) {
      roles.set(key(1, 1), 'captain');
      take('cage'); take('trap'); take('trap'); take('cage');
      for (const q of free()) roles.set(key(...q), 'hall');
    } else {
      // the third floor: the Lich King's hall across the middle row, his vault in the far row
      for (let cx = 0; cx < 3; cx++) roles.set(key(cx, 1), 'boss');
      const farRow = entry[1] === 0 ? 2 : 0;
      vault = [2 - entry[0], farRow]; roles.set(key(...vault), 'vault');
      take('keyroom', [[1, entry[1]], [2 - entry[0], entry[1]]].filter(q => !roles.has(key(...q))));
      for (const q of free()) roles.set(key(...q), q[1] === farRow ? 'cage' : 'trap');
    }
    // doorways: every pair of neighbours, but gates into the stair (or the boss hall), a wall round the vaults
    const doors = [];
    for (let cz = 0; cz < 3; cz++) for (let cx = 0; cx < 3; cx++) for (const [dx, dz] of [[1, 0], [0, 1]]) {
      const nx = cx + dx, nz = cz + dz; if (nx > 2 || nz > 2) continue;
      const a = roles.get(key(cx, cz)), b = roles.get(key(nx, nz));
      if (a === 'boss' && b === 'boss') continue;                         // one long hall
      let kind = 'open';
      if (a === 'secret' || b === 'secret') kind = (a === 'puzzle' || b === 'puzzle') ? 'ward' : 'wall';
      else if (a === 'vault' || b === 'vault') kind = (a === 'boss' || b === 'boss') ? 'ward' : 'wall';
      else if (a === 'stair' || b === 'stair') kind = 'gate';
      else if ((a === 'boss') !== (b === 'boss')) kind = 'gate';
      // the door in the shared wall, three wide and four high, at the middle of it
      const wx = dx ? X0 + nx * C : X0 + cx * C + (C >> 1) - 1, wz = dz ? Z0 + nz * C : Z0 + cz * C + (C >> 1) - 1;
      doors.push({ kind, x0: wx, z0: wz, x1: dx ? wx : wx + 2, z1: dz ? wz : wz + 2, y0: y + 1, y1: y + 4, key: f === 0 ? 'key_bronze' : f === 1 ? 'key_silver' : 'key_gold' });
    }
    floors.push({ f, y, roles, entry, stair, vault, doors });
    if (stair) entry = stair;
  }
  // dart traps, cages, the captain, the levers and their mural
  const th = (f) => DH_THEMES[f % DH_THEMES.length];
  const traps = [], spawners = [], residents = [];
  let puzzle = null, captain = null, keyroom = [], ladders = [];
  for (const F of floors) {
    for (const [k, role] of F.roles) {
      const [cx, cz] = k.split(',').map(Number), q = cell(cx, cz), mx = q.x0 + (C >> 1), mz = q.z0 + (C >> 1), y = F.y;
      if (role === 'cage') spawners.push({ at: [mx, y + 1, mz], mob: th(F.f).mob });
      if (role === 'trap') {
        const plates = [], shooters = [];
        for (let i = 0; i < 4; i++) plates.push([q.x0 + 2 + Math.floor(rnd() * (C - 3)), y + 1, q.z0 + 2 + Math.floor(rnd() * (C - 3))]);
        for (const s of [-3, 3]) { shooters.push([mx + s, y + 2, q.z0, 0, 1]); shooters.push([mx + s, y + 2, q.z0 + C, 0, -1]); }
        traps.push({ plates, shooters, room: [q.x0, y, q.z0, q.x0 + C, y + 6, q.z0 + C] });
        if (rnd() < 0.5) residents.push({ at: [mx, y + 1, mz], mob: th(F.f).mob });
      }
      if (role === 'hall' && rnd() < 0.6) residents.push({ at: [mx + 1, y + 1, mz - 1], mob: th(F.f).mob });
      if (role === 'captain') captain = { at: [mx, y + 1, mz], box: [q.x0 + 1, y, q.z0 + 1, q.x0 + C - 1, y + 6, q.z0 + C - 1] };
      if (role === 'keyroom') keyroom.push({ at: [q.x0 + C - 2, y + 1, mz], key: F.f === 0 ? 'key_bronze' : 'key_gold', mural: F.f === 0 });
      if (role === 'stair') ladders.push({ x: q.x0 + 1, z: q.z0 + 1, top: F.y + 1, bottom: F.y - DH.FH + 1 });
    }
  }
  // the lever puzzle: four levers along the puzzle room's far wall; the mural in the keeper's room
  if (f0 && f0.puz) {
    const q = cell(...f0.puz), y = floors[0].y, combo = [0, 1, 2, 3].map(() => rnd() < 0.5 ? 1 : 0);
    if (!combo.some(Boolean)) combo[Math.floor(rnd() * 4)] = 1;
    const levers = [0, 1, 2, 3].map(i => [q.x0 + 2 + i * 2, y + 1, q.z0 + C - 2]);
    const door = floors[0].doors.find(d => d.kind === 'ward');
    puzzle = { levers, combo, door };
  }
  // the long hall on the third floor, and its master
  const yb = floors[2].y, brow = 1, bz0 = Z0 + brow * C;
  const boss = { at: [X0 + (W >> 1), yb + 1, bz0 + (C >> 1)], type: 'lich_king', box: [X0 + 1, yb, bz0 + 1, X0 + W - 2, yb + 6, bz0 + C - 1] };
  const v2 = cell(...floors[2].vault);
  const e0 = cell(...floors[0].entry);
  return { x0: X0 - 2, z0: Z0 - 2, x1: X0 + W + 1, z1: Z0 + W + 1, X0, Z0, W, Y0, floors, traps, spawners, residents, captain, keyroom, puzzle, ladders, boss,
    vault2: { at: [v2.x0 + (C >> 1), floors[2].y + 1, v2.z0 + (C >> 1)], door: floors[2].doors.find(d => d.kind === 'ward') },
    shaft: { x: e0.x0 + 1, z: e0.z0 + 1, top: hi + 2, bottom: Y0 + 1 }, name: 'the Deep Halls' };
}
function dhBuild(P, S) {
  const C = DH.C, W = S.W;
  for (const F of S.floors) {
    const T = DH_THEMES[F.f % DH_THEMES.length], y = F.y;
    const wall = (x, yy, z) => P.pick(T.wall, x, yy, z, 1), flo = (x, z) => P.pick(T.floor, x, y, z, 2);
    // the shell, then the rooms carved out of it
    for (let z = S.Z0; z < S.Z0 + W; z++) for (let x = S.X0; x < S.X0 + W; x++) {
      if (!P.in(x, z)) continue;
      P.put(x, y - 1, z, wall(x, y - 1, z)); P.put(x, y, z, flo(x, z)); P.put(x, y + 7, z, wall(x, y + 7, z));
      const gx = (x - S.X0) % C, gz = (z - S.Z0) % C, onWall = gx === 0 || gz === 0;
      for (let yy = y + 1; yy <= y + 6; yy++) P.put(x, yy, z, onWall ? wall(x, yy, z) : 0);
    }
    // the long boss hall: the walls inside it come down
    for (const [k, role] of F.roles) if (role === 'boss') {
      const [cx, cz] = k.split(',').map(Number);
      if (cx > 0) for (let z = S.Z0 + cz * C + 1; z < S.Z0 + cz * C + C; z++) for (let yy = y + 1; yy <= y + 6; yy++) P.put(S.X0 + cx * C, yy, z, 0);
    }
    // doorways
    for (const d of F.doors) {
      if (d.kind === 'wall') continue;
      for (let z = d.z0; z <= d.z1; z++) for (let x = d.x0; x <= d.x1; x++) for (let yy = d.y0; yy <= d.y1; yy++)
        P.put(x, yy, z, d.kind === 'gate' ? 'dungeon_gate' : d.kind === 'ward' ? 'ward_stone' : 0);
    }
    // light: lanterns hanging in every room, a few old torches
    for (const [k] of F.roles) {
      const [cx, cz] = k.split(',').map(Number), mx = S.X0 + cx * C + (C >> 1), mz = S.Z0 + cz * C + (C >> 1);
      P.put(mx, y + 6, mz, F.f === 2 ? 'soul_lantern' : 'lantern', 1);
      if (P.h(mx, y, mz, 9) < 0.3) P.put(mx + 3, y + 1, mz + 3, 'cobweb');
    }
  }
  // cages, plates and darts
  for (const s of S.spawners) P.put(s.at[0], s.at[1], s.at[2], 'monster_spawner');
  for (const t of S.traps) {
    for (const [x, y, z] of t.plates) P.put(x, y, z, 'stone_pressure_plate');
    for (const [x, y, z, dx, dz] of t.shooters) P.put(x, y, z, 'dispenser', dz > 0 ? 3 : dz < 0 ? 2 : dx > 0 ? 5 : 4);
  }
  // chests: the keeper's room has its key (and on the first floor, the mural), the halls a little
  for (const r of S.keyroom) {
    const i = P.chest(r.at[0], r.at[1], r.at[2], 3, 'deep');
    if (i >= 0) { const e = P.ch.blockEntities.get(i); if (e && e.items) e.items[13] = { id: r.key, n: 1 }; }
    if (r.mural && S.puzzle) S.puzzle.combo.forEach((on, k) => P.put(r.at[0] + 1, r.at[1] + 2, r.at[2] - 3 + k * 2, on ? 'lime_wool' : 'red_wool'));
    if (r.mural) P.lectern(r.at[0] - 2, r.at[1], r.at[2] - 3, 1, 'deep_halls');
  }
  for (const F of S.floors) for (const [k, role] of F.roles) {
    const [cx, cz] = k.split(',').map(Number), x = S.X0 + cx * C + 2, z = S.Z0 + cz * C + C - 2;
    if (role === 'hall' && P.h(x, F.y, z, 4) < 0.5) P.chest(x, F.y + 1, z, 0, 'deep');
    if (role === 'secret') { P.chest(x, F.y + 1, z, 0, 'deep_secret'); P.chest(x + 4, F.y + 1, z, 0, 'deep_secret'); }
    if (role === 'vault') { P.chest(x, F.y + 1, z, 0, 'deep_vault'); P.chest(x + 2, F.y + 1, z, 0, 'deep_vault'); P.chest(x + 4, F.y + 1, z, 0, 'deep_vault'); }
  }
  // the levers (on the floor, all off)
  if (S.puzzle) for (const [x, y, z] of S.puzzle.levers) P.put(x, y, z, 'lever', 0);
  // the ladders down between floors, and the shaft down from the stones on the land
  for (const L of S.ladders) for (let yy = L.bottom; yy <= L.top; yy++) { P.put(L.x, yy, L.z, 'ladder', 3); }
  const sh = S.shaft, top = Math.max(sh.top, ...[0, 1, 2].map(k => P.in(sh.x, sh.z) ? P.ground(sh.x, sh.z) + 1 : 0));
  for (let yy = sh.bottom; yy <= top; yy++) P.put(sh.x, yy, sh.z, 'ladder', 3);
  for (let yy = sh.bottom; yy <= top + 3; yy++) for (const [dx, dz] of [[1, 0], [0, 1], [1, 1]]) if (yy > S.Y0 + 7) P.put(sh.x + dx, yy, sh.z + dz, yy <= P.ground(sh.x + dx, sh.z + dz) ? 'stone_bricks' : 0);
  // a ring of old stones round the way down
  for (let a = 0; a < 8; a++) {
    const rx = Math.round(sh.x + Math.cos(a * Math.PI / 4) * 4), rz = Math.round(sh.z + Math.sin(a * Math.PI / 4) * 4);
    if (!P.in(rx, rz)) continue;
    const g0 = P.ground(rx, rz), hgt = 2 + Math.floor(P.h(rx, 0, rz, 6) * 3);
    for (let yy = g0 + 1; yy <= g0 + hgt; yy++) P.put(rx, yy, rz, yy === g0 + hgt && a % 2 === 0 ? 'chiseled_stone_bricks' : 'mossy_stone_bricks');
  }
}
const DEEP_HALLS = defStruct({ key: 'deep_halls', name: 'the Deep Halls', reg: 760, chance: 0.6, margin: 70, dims: [0], plan: dhPlan, build: dhBuild });

// ---- the Twin Vault: the plan -------------------------------------------------------------------------------------------------
function tvPlan(gen, x, z, rnd) {
  const c = gen.column(x, z); if (!sLandy(c)) return null;
  const X0 = x - 12, Z0 = z - 16, X1 = x + 12, Z1 = z + 16;
  const [lo, hi] = sLand(gen, X0, Z0, X1, Z1);
  if (hi - lo > 12) return null;
  const y = Math.max(16, Math.min(36, lo - 14));
  if (lo - y < 10) return null;
  // the antechamber (south), the arena (middle), the vault (north)
  const ante = [X0 + 2, Z1 - 8, X1 - 2, Z1 - 2], arena = [X0 + 1, Z0 + 8, X1 - 1, Z1 - 10], vault = [x - 4, Z0 + 1, x + 4, Z0 + 6];
  return { x0: X0 - 2, z0: Z0 - 2, x1: X1 + 2, z1: Z1 + 2, y, X0, Z0, X1, Z1, ante, arena, vault,
    plates: [[ante[0] + 1, y + 1, ante[1] + 3], [ante[2] - 1, y + 1, ante[1] + 3]],
    door: { x0: x - 1, x1: x + 1, z0: Z1 - 9, z1: Z1 - 9, y0: y + 1, y1: y + 4 },
    vdoor: { x0: x - 1, x1: x + 1, z0: Z0 + 7, z1: Z0 + 7, y0: y + 1, y1: y + 4 },
    wardens: [[x - 5, y + 1, Z0 + 15], [x + 5, y + 1, Z0 + 15]],
    shaft: { x: x, z: Z1 - 2, top: hi + 2, bottom: y + 1 }, name: 'the Twin Vault' };
}
function tvBuild(P, S) {
  const y = S.y, wall = (x, yy, z) => P.pick(['deepslate_bricks', 'polished_blackstone_bricks', 'stone_bricks', 'deepslate_tiles'].filter(k => B[k] !== undefined), x, yy, z, 1);
  const room = (r, h) => { for (let z = r[1] - 1; z <= r[3] + 1; z++) for (let x = r[0] - 1; x <= r[2] + 1; x++) { if (!P.in(x, z)) continue; const edge = x < r[0] || x > r[2] || z < r[1] || z > r[3]; P.put(x, y, z, wall(x, y, z)); P.put(x, y + h + 1, z, wall(x, y + h + 1, z)); for (let yy = y + 1; yy <= y + h; yy++) P.put(x, yy, z, edge ? wall(x, yy, z) : 0); } };
  room(S.ante, 5); room(S.arena, 9); room(S.vault, 5);
  // the doors: the vault door between antechamber and arena, the inner door to the vault (both ward stone)
  for (const d of [S.door, S.vdoor]) for (let z = d.z0; z <= d.z1; z++) for (let x = d.x0; x <= d.x1; x++) for (let yy = d.y0; yy <= d.y1; yy++) P.put(x, yy, z, 'ward_stone');
  // the plates, each in a lit alcove; braziers in the arena
  for (const [x, yy, z] of S.plates) { P.put(x, yy, z, 'stone_pressure_plate'); P.put(x, yy + 3, z, 'soul_lantern', 1); }
  for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const x = a ? S.arena[2] - 2 : S.arena[0] + 2, z = b ? S.arena[3] - 2 : S.arena[1] + 2; P.put(x, y + 1, z, 'chiseled_stone_bricks'); P.put(x, y + 2, z, 'campfire'); }
  for (let k = 0; k < 4; k++) P.chest(S.vault[0] + 1 + k * 2, y + 1, S.vault[1] + 1, 2, 'twin_vault');
  P.lectern(S.ante[0] + 4, y + 1, S.ante[3] - 1, 0, 'twin_vault');
  // the way down, and two black obelisks on the land
  const sh = S.shaft;
  for (let yy = sh.bottom; yy <= sh.top; yy++) P.put(sh.x, yy, sh.z, 'ladder', 2);
  for (let yy = y + 6; yy <= sh.top + 3; yy++) for (const [dx, dz] of [[-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1]]) if (P.in(sh.x + dx, sh.z + dz)) P.put(sh.x + dx, yy, sh.z + dz, yy <= P.ground(sh.x + dx, sh.z + dz) ? wall(sh.x, yy, sh.z) : 0);
  for (const dx of [-3, 3]) { const ox = sh.x + dx, oz = sh.z; if (!P.in(ox, oz)) continue; const g0 = P.ground(ox, oz); for (let yy = g0 + 1; yy <= g0 + 5; yy++) P.put(ox, yy, oz, yy === g0 + 5 ? 'crying_obsidian' : 'obsidian'); }
}
const TWIN_VAULT = defStruct({ key: 'twin_vault', name: 'the Twin Vault', reg: 900, chance: 0.5, margin: 70, dims: [0], plan: tvPlan, build: tvBuild });

// ---- in the world: gates and keys, darts, the levers, the Gaoler, the vaults, the Wardens --------------------------------------
const DHT = { t: 0 };
function dhOpen(g, d) {
  const w = g.world;
  for (let z = d.z0; z <= d.z1; z++) for (let x = d.x0; x <= d.x1; x++) for (let yy = d.y0; yy <= d.y1; yy++) {
    const id = w.getBlock(x, yy, z);
    if (id === B.dungeon_gate || id === B.ward_stone) { w.setBlock(x, yy, z, 0); g.burst(x + 0.5, yy + 0.5, z + 0.5, 'smoke', 4, 0.5); }
  }
  g.sfx.playAt('piston_out', (d.x0 + d.x1) / 2, d.y0 + 1, (d.z0 + d.z1) / 2, 40);
}
const onPlate = (g, x, y, z) => {
  for (const q of g.pawns()) if (!q.dead && Math.floor(q.x) === x && Math.floor(q.z) === z && Math.abs(q.y - y) < 0.6) return true;
  for (const e of g.entities) if (!e.remove && (e instanceof DroppedItem || (e instanceof Mob && e.alive)) && Math.floor(e.x) === x && Math.floor(e.z) === z && Math.abs(e.y - y) < 0.6) return true;
  return false;
};
function deepTick(g, dt) {
  if (g.isGuest || g.dim !== 0 || !g.world || !g.world.gen.structsNearKind || !g.meta) return;
  if ((DHT.t -= dt) > 0) return;
  DHT.t = 0.5;
  const w = g.world, ps = g.pawns().filter(p => !p.dead), seen = new Set();
  for (const p of ps) for (const S of [...w.gen.structsNearKind(DEEP_HALLS.idx, p.x, p.z, 8), ...w.gen.structsNearKind(TWIN_VAULT.idx, p.x, p.z, 8)]) {
    if (seen.has(S.id)) continue; seen.add(S.id);
    const rec = structRec(g, S.id), now = g.time;
    if (S.kind === 'deep_halls') {
      // darts: someone on a plate, and the room's dispensers loose at them
      for (let i = 0; i < S.traps.length; i++) {
        const t = S.traps[i]; rec.trapT = rec.trapT || {};
        if ((rec.trapT[i] || 0) > now) continue;
        const who = ps.find(q => t.plates.some(([x, y, z]) => Math.floor(q.x) === x && Math.floor(q.z) === z && Math.abs(q.y - y) < 0.6));
        if (!who) continue;
        rec.trapT[i] = now + 2.2;
        for (const [sx, sy, sz] of t.shooters) {
          if (w.getBlock(sx, sy, sz) !== B.dispenser) continue;
          const ox = sx + 0.5, oy = sy + 0.5, oz = sz + 0.5 + (sz === t.room[2] ? 0.7 : -0.7), dx = who.x - ox, dy = who.y + 1.2 - oy, dz = who.z - oz, l = Math.hypot(dx, dy, dz) || 1, sp = 22;
          g.addEntity(new Arrow(g, ox, oy, oz, dx / l * sp, dy / l * sp + 0.6, dz / l * sp, null, 3, false));
        }
        g.sfx.playAt('bow', who.x, who.y + 1, who.z, 20);
      }
      // the levers
      const Pz = S.puzzle;
      if (Pz && Pz.door && !rec.puzzle) {
        const ok = Pz.levers.every(([x, y, z], k) => w.getBlock(x, y, z) === B.lever && (!!(w.getMeta(x, y, z) & 8)) === !!Pz.combo[k]);
        if (ok) { rec.puzzle = 1; dhOpen(g, Pz.door); for (const l of g.locals) if (Math.hypot(l.player.x - Pz.door.x0, l.player.z - Pz.door.z0) < 40) l.toast('Somewhere close, stone grinds against stone. A hidden way has opened!', 'epic'); }
      }
      // the Gaoler, with the silver key
      const cp = S.captain;
      if (cp && rec.captain !== 'dead' && !g.entities.some(e => e.dhCaptain === S.id && e.alive)) {
        const [x0, y0, z0, x1, y1, z1] = cp.box;
        if (ps.some(q => q.x >= x0 && q.x <= x1 + 1 && q.z >= z0 && q.z <= z1 + 1 && q.y >= y0 - 1 && q.y <= y1)) {
          const m = g.addEntity(new Mob(g, 'gaoler', cp.at[0] + 0.5, cp.at[1], cp.at[2] + 0.5));
          if (m) { m.dhCaptain = S.id; m.persistent = true; m.huntT = 60; for (const l of g.locals) l.toast('The Gaoler! He has the key to the next floor down', 'warn'); }
        }
      }
      // the Lich King down: his vault opens
      if (rec.cleared && !rec.vault && S.vault2 && S.vault2.door) { rec.vault = 1; dhOpen(g, S.vault2.door); for (const l of g.locals) l.toast('Behind the Lich King\'s hall, his vault stands open', 'epic'); }
    } else {
      // the Twin Vault: both plates at once
      if (!rec.door && S.plates.every(([x, y, z]) => onPlate(g, x, y, z))) { rec.door = 1; dhOpen(g, S.door); for (const l of g.locals) l.toast('Both plates held: the vault door opens!', 'epic'); }
      else if (!rec.door && S.plates.some(([x, y, z]) => onPlate(g, x, y, z)) && !(rec.hintT > now)) { rec.hintT = now + 8; for (const l of g.locals) if (Math.hypot(l.player.x - S.plates[0][0], l.player.z - S.plates[0][2]) < 30) l.toast('The plate sinks, but the door waits for its twin to be held too', ''); }
      // the Wardens wake when someone comes into the arena
      if (rec.door && !rec.cleared) {
        const live = g.entities.filter(e => e.twinVault === S.id && e.alive);
        const A = S.arena, inside = ps.some(q => q.x >= A[0] && q.x <= A[2] + 1 && q.z >= A[1] && q.z <= A[3] + 1 && q.y >= S.y && q.y <= S.y + 10);
        if (!live.length && !rec.up && inside) {
          rec.up = 1; rec.fell = {};
          ['warden_sun', 'warden_moon'].forEach((t, i) => { const [x, y, z] = S.wardens[i], m = g.addEntity(new Mob(g, t, x + 0.5, y, z + 0.5)); if (m) { m.twinVault = S.id; m.persistent = true; m.huntT = 60; } });
          for (const l of g.locals) l.toast('The Sun and Moon Wardens rise! Fell them together', 'warn');
        }
        // one down too long alone: it rises again
        if (rec.up && rec.fell) for (const t of ['warden_sun', 'warden_moon']) {
          const at = rec.fell[t]; if (!at) continue;
          const other = t === 'warden_sun' ? 'warden_moon' : 'warden_sun';
          if (rec.fell[other]) continue;
          if (now - at > 15) {
            delete rec.fell[t];
            const i = t === 'warden_sun' ? 0 : 1, [x, y, z] = S.wardens[i], m = g.addEntity(new Mob(g, t, x + 0.5, y, z + 0.5));
            if (m) { m.twinVault = S.id; m.persistent = true; m.huntT = 60; m.health = Math.round(m.maxHealth / 2); }
            for (const l of g.locals) l.toast(`${MOB_TYPES[t].label[0].toUpperCase() + MOB_TYPES[t].label.slice(1)} rises again!`, 'warn');
          }
        }
        if (rec.up && !live.length && !inside && !(rec.fell && Object.keys(rec.fell).length)) rec.up = 0;   // everyone left: back at their posts
      }
    }
  }
}
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { deepTick(this, dt); } catch (e) { if (!DHT.warned) { DHT.warned = true; console.warn('deep halls', e); } } return baseUpd.call(this, dt); };
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const r = baseDie.call(this, src), g = this.game;
    if (g.isGuest || !g.meta) return r;
    if (this.dhCaptain) { const rec = structRec(g, this.dhCaptain); rec.captain = 'dead'; g.dropItem(mkStack('key_silver', 1), this.x, this.y + 1, this.z, true); for (const l of g.locals) l.toast('The Gaoler falls, and his silver key with him', 'epic'); }
    if (this.twinVault) {
      const rec = structRec(g, this.twinVault); rec.fell = rec.fell || {}; rec.fell[this.type] = g.time;
      if (rec.fell.warden_sun && rec.fell.warden_moon) {
        rec.cleared = 1; rec.up = 0;
        const S = g.world.gen.structsNearKind(TWIN_VAULT.idx, this.x, this.z, 30).find(s => s.id === this.twinVault);
        if (S) dhOpen(g, S.vdoor);
        for (const l of g.locals) { l.toast('The Twin Wardens are beaten! The vault is yours', 'epic'); l.grantXP(300, this.x, this.y + 2, this.z); }
      } else for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 60) l.toast('One Warden falls... the other must follow within fifteen seconds!', 'warn');
    }
    return r;
  };
  // a key in the lock
  const baseUseBlock = LocalPlayer.prototype.useBlockAt;
  LocalPlayer.prototype.useBlockAt = function (hit, held, def) {
    if (hit && hit.id === B.dungeon_gate) {
      const g = this.g, w = g.world, p = this.player;
      const S = w.gen.structsNearKind ? w.gen.structsNearKind(DEEP_HALLS.idx, hit.x, hit.z, 2)[0] : null;
      const d = S && S.floors.flatMap(F => F.doors).find(o => o.kind === 'gate' && hit.x >= o.x0 && hit.x <= o.x1 && hit.z >= o.z0 && hit.z <= o.z1 && hit.y >= o.y0 && hit.y <= o.y1);
      if (!d) return baseUseBlock.call(this, hit, held, def);
      const name = itemDef(d.key).name;
      if (!held || held.id !== d.key) { this.toast(`Locked. It wants a ${name}`, ''); return true; }
      this.swingArm();
      if (g.isGuest && g.net) g.net.send({ t: 'adv', k: 'dhgate', key: d.key, x: hit.x, y: hit.y, z: hit.z });
      else for (const o of S.floors.flatMap(F => F.doors)) if (o.kind === 'gate' && o.key === d.key) dhOpen(g, o);
      held.n--; if (held.n <= 0) p.inv.held = null;
      this.toast(`The ${name} turns, and the gate opens`, 'good');
      return true;
    }
    return baseUseBlock.call(this, hit, held, def);
  };
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'dhgate') {
      const g = this.g, r = this.remotes.get('g' + from + ':' + (m.li || 0));
      const S = g.world.gen.structsNearKind(DEEP_HALLS.idx, +m.x, +m.z, 2)[0];
      if (S && r && Math.hypot(r.x - m.x, r.z - m.z) < 8 && /^key_(bronze|silver|gold)$/.test(m.key)) for (const o of S.floors.flatMap(F => F.doors)) if (o.kind === 'gate' && o.key === m.key) dhOpen(g, o);
      return;
    }
    return baseHost.call(this, from, m);
  };
}

// ---- looks --------------------------------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('dungeon_gate', p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, [0, 0, 0], 0);
      for (const x of [1, 5, 10, 14]) for (let y = 0; y < 16; y++) { p.set(x, y, shade(H('#5a5a62'), 0.9 + p.rand() * 0.2)); p.set(x + 1, y, shade(H('#3a3a40'), 0.9)); }
      for (const y of [2, 13]) for (let x = 0; x < 16; x++) p.set(x, y, H('#4a4a52'));
      for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, shade(H('#d8a830'), y === 6 ? 1.2 : 0.95));
      p.set(7, 8, H('#2a1a0a')); p.set(8, 8, H('#2a1a0a'));
    });
    addTile('ward_stone', p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const row = y >> 2, off = (row & 1) * 4, mort = y % 4 === 3 || (x + off) % 8 === 7; p.set(x, y, shade(mort ? H('#1a1a22') : H('#34343e'), 0.9 + p.rand() * 0.2)); }
      for (const [x, y] of [[4, 5], [5, 6], [6, 5], [11, 9], [10, 10], [12, 10], [8, 13], [8, 2]]) p.set(x, y, H('#6a8aff'));
    });
    const key = (col, dark) => (p) => { for (let i = 0; i < 9; i++) p.set(3 + i, 8, H(col)); for (let a = 0; a < 10; a++) { const x = Math.round(4 + Math.cos(a * 0.63) * 2.4), y = Math.round(8 + Math.sin(a * 0.63) * 2.4); p.set(x, y, H(col)); } for (const [x, y] of [[10, 9], [10, 10], [12, 9], [12, 10], [11, 9]]) p.set(x, y, H(dark)); };
    addItem('key_bronze', key('#c88a4a', '#7a4a1a')); addItem('key_silver', key('#e8eef4', '#8a929a')); addItem('key_gold', key('#f6d541', '#a8841a'));
  };
}
PV.debug.deep = {
  find: (x, z, kind) => { const g = GAME, k = kind === 'twin' ? TWIN_VAULT.idx : DEEP_HALLS.idx, T = STRUCTS[k]; const rx = Math.floor(x / T.reg), rz = Math.floor(z / T.reg); let best = null; for (let r = 0; r <= 4 && !best; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { const S = g.world.gen.structAt(k, rx + dx, rz + dz); if (S && (!best || Math.hypot(S.X0 - x, S.Z0 - z) < Math.hypot(best.X0 - x, best.Z0 - z))) best = S; } return best; },
  open: (d) => dhOpen(GAME, d), rec: (id) => structRec(GAME, id),
};
