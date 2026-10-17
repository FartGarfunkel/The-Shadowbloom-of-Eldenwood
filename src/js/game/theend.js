// ---------------------------------------------------------------------------
// game/theend.js — 0.9.0.19: The End.
//
// Under the Ember Depths lies the End: a great island of pale stone hanging in
// the void, ringed with obsidian pillars, and far out past an empty gulf the
// outer islands with their chorus groves and the purpur towers of the End
// cities. It's part of the one stacked world, like the Skylands and the
// Depths: break through the void crust at the very bottom of the Depths (it
// takes a cinderite pick) and you fall out of the Depths' floor into the End's
// sky, and the void wind carries you down onto the nearest island. Fly up out
// of the End's sky and you come out on the Depths' floor.
//
// Or find a stronghold (game/stronghold.js): set an Eye of Ender in each of the
// twelve frames round its portal and the portal opens, a window looking down on
// the obsidian platform at the edge of the main island. Step in and you drop
// through.
//
// Its dragon and its creatures are in game/endmobs.js; the elytra found on the
// End ships in game/elytra.js.
// ---------------------------------------------------------------------------
DIM.END = 5;
DIM_NAME[5] = 'The End';
const END_PLAT = [100, 48, 0];          // the obsidian platform the stronghold portal lets you down onto
const END_PILLAR_R = 43;                // the ring of obsidian pillars round the middle of the main island
const END_OUTER = 330;                  // the outer islands begin past this
const END_GATE_R = 96;                  // the gateways that open round the main island, one per dragon slain
const END_CITY_REG = 360;

// ---- the land --------------------------------------------------------------------------------------------------------
WorldGen.prototype.endNoise = function () {
  if (!this._endN) this._endN = { a: new SimplexNoise(this.seed ^ 0xE4D01), b: new SimplexNoise(this.seed ^ 0xE4D02), c: new SimplexNoise(this.seed ^ 0xE4D03) };
  return this._endN;
};
// the island over (x, z): { top, bot } or null (the void)
WorldGen.prototype.endColumn = function (x, z) {
  const N = this.endNoise(), r = Math.hypot(x, z);
  if (r < 112) {
    // the main island: a broad dome of end stone, tapering to a point far below
    const R = 80 + N.a.fbm2(x / 60, z / 60, 2) * 9;
    if (r >= R) return null;
    const k = 1 - (r / R) * (r / R);
    const top = 61 + Math.floor(k * 3 + N.b.noise2(x / 24, z / 24) * 1.5);
    const bot = top - Math.floor(3 + k * 38 + N.c.noise2(x / 18, z / 18) * 4);
    return { top, bot, main: true };
  }
  if (r < END_OUTER) return null;
  // the outer islands, scattered over the void: few at the near edge, more further out
  const th = 0.28 + Math.max(0, (END_OUTER + 70 - r) / 70) * 0.45 - Math.min(0.1, Math.max(0, r - END_OUTER - 70) / 4000);
  const m = N.a.fbm2(x / 130, z / 130, 3) + N.b.noise2(x / 40, z / 40) * 0.12;
  if (m < th) return null;
  const k = Math.min(1, (m - th) * 5);
  const top = 58 + Math.floor(N.c.fbm2(x / 90, z / 90, 2) * 9 + k * 3);
  const bot = top - Math.floor(2 + k * 22 + N.b.noise2(x / 15, z / 15) * 3);
  return { top, bot };
};
// the ten obsidian pillars: where, how high, how thick; the two tallest caged
WorldGen.prototype.endPillars = function () {
  if (this._endP) return this._endP;
  const rnd = mulberry32(this.seed ^ 0x5b1e5), off = rnd() * TAU, hs = [];
  for (let i = 0; i < 10; i++) hs.push(76 + i * 3);
  for (let i = hs.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [hs[i], hs[j]] = [hs[j], hs[i]]; }
  const out = [];
  for (let i = 0; i < 10; i++) {
    const a = off + i / 10 * TAU, h = hs[i];
    out.push({ i, x: Math.round(Math.cos(a) * END_PILLAR_R), z: Math.round(Math.sin(a) * END_PILLAR_R), h, rad: 2 + Math.floor((h - 76) / 8), cage: h >= 97 });
  }
  return (this._endP = out);
};
// the exit portal's bowl in the middle of the main island
WorldGen.prototype.endFountainY = function () { const c = this.endColumn(0, 0); return (c ? c.top : 64) + 1; };
// a chorus plant: a stem that branches as it climbs, a flower at each tip
function chorusTree(rnd, x, y, z, depth, out) {
  const h = depth === 0 ? 2 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < h; i++) out.push([x, y + i, z, 'chorus_plant']);
  const top = y + h - 1;
  const n = depth >= 3 ? 0 : depth === 0 ? 1 + Math.floor(rnd() * 3) : Math.floor(rnd() * 2.6);
  for (let b = 0; b < n && out.length < 70; b++) {
    const d = Math.floor(rnd() * 4), dx = [0, 1, 0, -1][d], dz = [-1, 0, 1, 0][d];
    out.push([x + dx, top, z + dz, 'chorus_plant']);
    chorusTree(rnd, x + dx, top + 1, z + dz, depth + 1, out);
  }
  if (!n) out.push([x, top + 1, z, 'chorus_flower']);
}
WorldGen.prototype.chorusAt = function (wx, wz) {
  if (Math.hypot(wx, wz) < END_OUTER + 20 || hashFloat(wx, wz, this.seed, 77) > 0.007) return null;
  const c = this.endColumn(wx, wz); if (!c) return null;
  // on flat enough ground, well in from the edge
  for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) { const o = this.endColumn(wx + dx, wz + dz); if (!o || Math.abs(o.top - c.top) > 2) return null; }
  const out = []; chorusTree(mulberry32(hash32(wx, wz, this.seed, 78)), wx, c.top + 1, wz, 0, out);
  return out;
};
// the End cities: purpur towers out on the islands, some with a ship moored beside them
WorldGen.prototype.endCityAt = function (rx, rz) {
  const cache = this._cities || (this._cities = new Map()), key = rx + ',' + rz;
  if (cache.has(key)) return cache.get(key);
  let S = null;
  const rnd = mulberry32(lairSeed(this.seed, rx, rz, 7701));
  if (rnd() < 0.6) {
    const x0 = rx * END_CITY_REG + 60 + Math.floor(rnd() * (END_CITY_REG - 120)), z0 = rz * END_CITY_REG + 60 + Math.floor(rnd() * (END_CITY_REG - 120));
    if (Math.hypot(x0, z0) > END_OUTER + 90) {
      for (let t = 0; t < 12 && !S; t++) {
        const x = x0 + Math.round((rnd() - 0.5) * 60), z = z0 + Math.round((rnd() - 0.5) * 60), c = this.endColumn(x, z);
        if (!c || c.top - c.bot < 8) continue;
        let ok = true;
        for (const [dx, dz] of [[5, 5], [-5, 5], [5, -5], [-5, -5]]) { const o = this.endColumn(x + dx, z + dz); if (!o || Math.abs(o.top - c.top) > 3) ok = false; }
        if (!ok) continue;
        const floors = 3 + Math.floor(rnd() * 3), dir = Math.floor(rnd() * 4), ship = rnd() < 0.65;
        S = { x, z, y: c.top + 1, floors, dir, ship, seed: lairSeed(this.seed, rx, rz, 7702), name: 'an End city' };
        const top = S.y + floors * 6;
        S.roofY = top;
        const reach = ship ? 26 : 7;
        S.x0 = x - reach; S.x1 = x + reach; S.z0 = z - reach; S.z1 = z + reach;
      }
    }
  }
  cache.set(key, S);
  return S;
};
WorldGen.prototype.endCitiesNear = function (x, z, pad = 0) {
  const out = [], rx = Math.floor(x / END_CITY_REG), rz = Math.floor(z / END_CITY_REG);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const S = this.endCityAt(rx + dx, rz + dz);
    if (S && x >= S.x0 - pad && x <= S.x1 + pad && z >= S.z0 - pad && z <= S.z1 + pad) out.push(S);
  }
  return out;
};
STRUCT_LOOT.end_city = [['diamond', 2, 6, 0.55], ['iron_ingot', 4, 9, 0.6], ['gold_ingot', 2, 7, 0.55], ['emerald', 2, 6, 0.45], ['ender_pearl', 1, 3, 0.35], ['chorus_fruit', 2, 6, 0.3],
  ['diamond_sword', 1, 1, 0.14], ['diamond_pickaxe', 1, 1, 0.12], ['diamond_chestplate', 1, 1, 0.1], ['diamond_helmet', 1, 1, 0.1], ['diamond_boots', 1, 1, 0.1], ['saddle', 1, 1, 0.12],
  ['experience_bottle', 2, 5, 0.3], ['golden_apple', 1, 2, 0.2], ['heart_crystal', 1, 1, 0.12], ['adamantite_ingot', 1, 2, 0.12], ['mithril_ingot', 1, 3, 0.2]];
function buildEndCity(P, S) {
  const { x, z, y, floors } = S;
  const wall = (xx, yy, zz) => (Math.abs(xx - x) === 3 && Math.abs(zz - z) === 3) ? 'purpur_pillar' : 'purpur_block';
  // footing: a broad purpur base, its legs reaching down into the island
  P.fill(x - 5, y - 1, z - 5, x + 5, y - 1, z + 5, 'purpur_block');
  for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) for (let yy = y - 2; yy > y - 10; yy--) { if (P.get(x + dx, yy, z + dz) > 0 && T_SOLID[P.get(x + dx, yy, z + dz)]) break; P.put(x + dx, yy, z + dz, 'purpur_pillar'); }
  // the tower: a hollow column with a floor every six blocks, lit with end rods, windows of magenta glass
  const topY = y + floors * 6;
  P.fill(x - 3, y, z - 3, x + 3, topY, z + 3, wall);
  P.fill(x - 2, y, z - 2, x + 2, topY - 1, z + 2, 'air');
  for (let f = 0; f < floors; f++) {
    const fy = y + f * 6;
    if (f > 0) P.fill(x - 2, fy, z - 2, x + 2, fy, z + 2, 'purpur_block');
    P.put(x, fy + 5, z, 'end_rod');
    for (const [dx, dz] of [[0, -3], [3, 0], [0, 3], [-3, 0]]) if (!(f === 0 && dz === 3)) { P.put(x + dx, fy + 2, z + dz, 'magenta_stained_glass'); P.put(x + dx, fy + 3, z + dz, 'magenta_stained_glass'); }
  }
  // a ladder up the north wall, through a gap in each floor
  for (let f = 1; f <= floors; f++) P.put(x, y + f * 6, z - 2, 'air');
  P.ladder(x, y, topY, z - 2, 0);
  // the door
  P.fill(x, y, z + 3, x, y + 1, z + 3, 'air');
  P.put(x, y - 1, z + 4, 'purpur_block'); P.put(x, y - 1, z + 5, 'purpur_block');
  // the room at the top: open to the sky, a low wall of end stone bricks, its chests
  P.fill(x - 5, topY, z - 5, x + 5, topY, z + 5, 'purpur_block');
  P.fill(x - 5, topY + 1, z - 5, x + 5, topY + 1, z + 5, (xx, yy, zz) => (Math.abs(xx - x) === 5 || Math.abs(zz - z) === 5) ? 'end_stone_bricks' : 'air');
  P.fill(x - 4, topY + 2, z - 4, x + 4, topY + 6, z + 4, 'air');
  P.put(x, topY, z - 2, 'ladder', 0);
  for (const [dx, dz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { for (let yy = topY + 1; yy <= topY + 4; yy++) P.put(x + dx, yy, z + dz, 'purpur_pillar'); P.put(x + dx, topY + 5, z + dz, 'end_rod'); }
  P.chest(x - 4, topY + 1, z + 4, 0, 'end_city');
  P.chest(x + 4, topY + 1, z + 4, 0, 'end_city');
  P.chest(x + 4, topY + 1, z - 4, 2, 'end_city');
  // the ship, moored off one side at the height of the roof, with a bridge across to it
  if (S.ship) {
    const D = [[0, -1], [1, 0], [0, 1], [-1, 0]][S.dir], ax = D[0], az = D[1], sx = -az, sz = ax;   // along the ship, and across it
    const cx = x + ax * 18, cz = z + az * 18, yS = topY;
    const at = (i, j) => [cx + ax * i + sx * j, cz + az * i + sz * j];
    // the bridge
    for (let k = 6; k <= 13; k++) { const [bx, bz] = [x + ax * k, z + az * k]; P.put(bx, yS, bz, 'purpur_block'); P.put(bx + sx, yS, bz + sz, 'purpur_slab'); P.put(bx - sx, yS, bz - sz, 'purpur_slab'); }
    P.put(x + ax * 5, yS + 1, z + az * 5, 'air');
    // the hull: pointed at the bow, square at the stern
    for (let i = -7; i <= 7; i++) {
      const hw = i >= 6 ? 0 : i >= 4 || i <= -6 ? 1 : 2;
      for (let j = -hw; j <= hw; j++) {
        const [hx, hz] = at(i, j);
        P.put(hx, yS - 2, hz, Math.abs(j) < hw || hw === 0 ? 'purpur_block' : 'air');
        P.put(hx, yS - 1, hz, Math.abs(j) === hw ? 'purpur_block' : 'end_stone_bricks');
        P.put(hx, yS, hz, Math.abs(j) === hw || Math.abs(i) === 7 ? 'purpur_block' : 'purpur_slab');
        for (let yy = yS + 1; yy <= yS + 9; yy++) P.put(hx, yy, hz, 'air');
        if (Math.abs(j) === hw && Math.abs(i) < 7) P.put(hx, yS + 1, hz, 'purpur_slab');
      }
    }
    // the gap in the rail where the bridge comes aboard
    { const [gx, gz] = at(-8, 0); P.put(gx, yS, gz, 'purpur_block'); const [hx, hz] = at(-7, 0); P.put(hx, yS, hz, 'purpur_slab'); P.put(hx, yS + 1, hz, 'air'); }
    // the mast and its sail
    for (let yy = yS + 1; yy <= yS + 9; yy++) { const [mx, mz] = at(1, 0); P.put(mx, yy, mz, 'purpur_pillar'); }
    for (let yy = yS + 4; yy <= yS + 8; yy++) for (let j = -2; j <= 2; j++) if (j) { const [ux, uz] = at(1, j); P.put(ux, yy, uz, 'magenta_wool'); }
    { const [lx, lz] = at(3, 0); P.put(lx, yS + 1, lz, 'end_rod'); }
    // the hold: down a hatch at the stern, the chest with the wings
    const [cx2, cz2] = at(-4, 0);
    P.put(cx2, yS, cz2, 'air');
    const i = P.chest(cx2, yS - 1, cz2, S.dir, 'end_city');
    if (i >= 0) { const be = P.ch.blockEntities.get(i); if (be && be.items) { let s = 13; while (be.items[s] && s < 26) s++; be.items[s] = { id: 'elytra', n: 1 }; } }
    const [k1x, k1z] = at(-3, 0); P.chest(k1x, yS - 1, k1z, S.dir, 'end_city');
  }
}
{
  // the End made, chunk by chunk
  const baseGen = WorldGen.prototype.generate;
  WorldGen.prototype.generate = function (ch) {
    if (this.dim !== DIM.END) return baseGen.call(this, ch);
    this.fillClimate(ch);
    const bx = ch.cx * 16, bz = ch.cz * 16, ES = B.end_stone;
    for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
      const c = this.endColumn(bx + lx, bz + lz);
      if (!c) continue;
      for (let y = Math.max(1, c.bot); y <= c.top; y++) ch.blocks[cidx(lx, y, lz)] = ES;
    }
    const S0 = { seed: this.seed ^ 0xE4D, x0: bx, z0: bz, x1: bx + 15, z1: bz + 15 };
    const P = sPut(this, ch, S0);
    // the obsidian pillars, each with its crystal's bedrock seat
    if (Math.abs(bx) < 64 && Math.abs(bz) < 64) {
      for (const pl of this.endPillars()) {
        if (pl.x + pl.rad < bx || pl.x - pl.rad > bx + 15 || pl.z + pl.rad < bz || pl.z - pl.rad > bz + 15) continue;
        const base = (this.endColumn(pl.x, pl.z) || { top: 60 }).top - 8;
        for (let z = pl.z - pl.rad; z <= pl.z + pl.rad; z++) for (let x = pl.x - pl.rad; x <= pl.x + pl.rad; x++) {
          if ((x - pl.x) ** 2 + (z - pl.z) ** 2 > pl.rad * pl.rad + 1) continue;
          for (let y = base; y <= pl.h; y++) P.put(x, y, z, 'obsidian');
        }
        P.put(pl.x, pl.h + 1, pl.z, 'bedrock');
        if (pl.cage) for (let y = pl.h + 1; y <= pl.h + 4; y++) for (let z = pl.z - 2; z <= pl.z + 2; z++) for (let x = pl.x - 2; x <= pl.x + 2; x++) {
          const edge = Math.abs(x - pl.x) === 2 || Math.abs(z - pl.z) === 2 || y === pl.h + 4;
          if (edge) P.put(x, y, z, 'iron_bars');
        }
      }
      // the exit portal's bowl, dark until the dragon falls
      const fy = this.endFountainY();
      if (bx <= 4 && bx + 15 >= -4 && bz <= 4 && bz + 15 >= -4) {
        for (let z = -4; z <= 4; z++) for (let x = -4; x <= 4; x++) {
          const d = Math.hypot(x, z);
          if (d > 3.6) continue;
          P.put(x, fy - 1, z, 'bedrock');
          if (d > 2.6) P.put(x, fy, z, 'bedrock'); else P.put(x, fy, z, 'air');
          for (let y = fy + 1; y < fy + 5; y++) P.put(x, y, z, 'air');
        }
        for (let y = fy; y <= fy + 3; y++) P.put(0, y, 0, 'bedrock');
      }
    }
    // the obsidian platform where the stronghold portal lets you down
    if (END_PLAT[0] + 2 >= bx && END_PLAT[0] - 2 <= bx + 15 && END_PLAT[2] + 2 >= bz && END_PLAT[2] - 2 <= bz + 15) {
      P.fill(END_PLAT[0] - 2, END_PLAT[1], END_PLAT[2] - 2, END_PLAT[0] + 2, END_PLAT[1], END_PLAT[2] + 2, 'obsidian');
      P.fill(END_PLAT[0] - 2, END_PLAT[1] + 1, END_PLAT[2] - 2, END_PLAT[0] + 2, END_PLAT[1] + 3, END_PLAT[2] + 2, 'air');
    }
    // out on the islands: chorus groves and cities
    if (Math.hypot(bx + 8, bz + 8) > END_OUTER - 30) {
      for (let wz = bz - 6; wz < bz + 22; wz++) for (let wx = bx - 6; wx < bx + 22; wx++) {
        const tree = this.chorusAt(wx, wz); if (!tree) continue;
        for (const [x, y, z, k] of tree) if (P.in(x, z) && y > 0 && y < CH && !P.get(x, y, z)) P.put(x, y, z, k);
      }
      try { for (const S of this.endCitiesNear(bx + 8, bz + 8, 12)) if (!(S.x1 < bx || S.x0 > bx + 15 || S.z1 < bz || S.z0 > bz + 15)) buildEndCity(sPut(this, ch, S), S); }
      catch (e) { console.warn('end city', e); }
    }
    ch.recomputeMaxY();
  };
  // nothing else of the Overworld's gets built out here
  WorldGen.prototype.endSpawn = function () { return [END_PLAT[0] + 0.5, END_PLAT[1] + 1, END_PLAT[2] + 0.5]; };
}
// ---- the floor of the Ember Depths: the void crust ------------------------------------------------------------------
{
  const baseGen = WorldGen.prototype.generate;
  WorldGen.prototype.generate = function (ch) {
    const r = baseGen.call(this, ch);
    if (this.dim === DIM.DEPTHS && B.void_crust !== undefined) {
      const VC = B.void_crust, BR = B.bedrock, BS = B.blackstone ?? B.stone;
      for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
        ch.blocks[cidx(x, 0, z)] = VC;
        for (let y = 1; y <= 2; y++) if (ch.blocks[cidx(x, y, z)] === BR) ch.blocks[cidx(x, y, z)] = BS;
      }
    }
    return r;
  };
}

// ---- how it looks, sounds and behaves --------------------------------------------------------------------------------
{
  const baseEnv = Game.prototype.computeEnv;
  Game.prototype.computeEnv = function (dim, fixedT) {
    const e = baseEnv.call(this, dim, fixedT);
    if (dim !== DIM.END) return e;
    const rgb = (h) => hexRGB(h).map(v => v / 255);
    Object.assign(e, { day: 0.78, zenith: rgb('#07040e'), horizon: rgb('#241a34'), fog: rgb('#191224'), fogStart: 0.45, stars: 0.35, showSun: false, voidBelow: true, sunGlow: [0, 0, 0] });
    e.minLight = Math.max(e.minLight || 0, 0.12);
    return e;
  };
  if (typeof MUSIC_MOODS !== 'undefined') MUSIC_MOODS.end = { modes: ['phrygian', 'aeolian'], roots: [43, 45, 47], tempo: [42, 52], density: 0.3, register: 1, progs: [[0, 5, 1, 0], [0, 3, 5, 4], [0, 1, 0, 5]], bell: 0.6, drone: true, lead: 'flute', lead2: 'harp', lh: 'harp', padIns: 'choir' };
  if (typeof Music === 'function') {
    const baseMood = Music.prototype.moodNow;
    Music.prototype.moodNow = function () { const g = this.g; if (g.inWorld && g.inWorld() && g.dim === DIM.END) return 'end'; return baseMood.call(this); };
  }
  // nobody sleeps out here
  if (typeof MAP_CEILING !== 'undefined') MAP_CEILING[DIM.END] = false;
}

// ---- falling into the End, rising out of it --------------------------------------------------------------------------
{
  const baseWant = seamWant;
  seamWant = function (g) {
    const r = baseWant(g);
    if (r !== null && r !== undefined) return r;
    if (g.isGuest || !g.world || !g.meta || g._traveling || (g.net && g.net.peers && g.net.peers.size > 0)) return null;
    const lp = g.locals[0]; if (!lp) return null;
    const y = lp.player.y, sh = g.shadow, has = (d) => sh && sh.dim === d;
    if (g.dim === DIM.DEPTHS && (y < 7 || (has(DIM.END) && y < 12))) return DIM.END;
    if (g.dim === DIM.END && (y > CH - 26 || (has(DIM.DEPTHS) && y > CH - 36))) return DIM.DEPTHS;
    return null;
  };
}
function endLanding(g, x, z) {
  const gen = g.world && g.world.dim === DIM.END ? g.world.gen : makeWorldGen(g.meta.seed, DIM.END, g.meta.genVersion || 1);
  for (let r = 0; r <= 200; r += 5) {
    const n = Math.max(1, Math.floor(r / 3));
    for (let a = 0; a < n; a++) {
      const ang = a / n * TAU, wx = Math.floor(x + Math.cos(ang) * r), wz = Math.floor(z + Math.sin(ang) * r), c = gen.endColumn(wx, wz);
      if (c && c.top - c.bot >= 3) return [wx + 0.5, c.top + 1, wz + 0.5];
    }
  }
  return [END_PLAT[0] + 0.5, END_PLAT[1] + 1, END_PLAT[2] + 0.5];
}
function stackedMore(g, lp, vy) {
  const p = lp.player;
  if (g.dim === DIM.DEPTHS && p.y < -0.5) return [DIM.END, 'void'];
  if (g.dim === DIM.END && p.y > CH - 1.2 && vy > 0) return [DIM.DEPTHS, 'unvoid'];
  return null;
}
function stackPlaceMore(g, lp, q, how, src) {
  if (how === 'void') {
    q.y = CH - 3; q.vx = src.vx * 0.3; q.vz = src.vz * 0.3; q.vy = Math.min(src.vy, -2);
    q.slowFallT = 90; q.cloudFall = false; q.fallStart = null;
    q.endDrift = endLanding(g, q.x, q.z);
  } else if (how === 'unvoid') {
    // up through the crust from below: a pocket opens in the Depths' floor
    const w = g.world, bx = Math.floor(q.x), bz = Math.floor(q.z);
    w.ensureChunk(bx >> 4, bz >> 4);
    for (let y = 1; y <= 3; y++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const id = w.getBlock(bx + dx, y, bz + dz); if (id && !T_LIQUID[id]) w.setBlock(bx + dx, y, bz + dz, 0, 0); }
    if (!T_SOLID[w.getBlock(bx, 0, bz)]) w.setBlock(bx, 0, bz, B.void_crust, 0);
    q.x = bx + 0.5; q.z = bz + 0.5; q.y = 1.05; q.vx = q.vz = 0; q.vy = 0; q.fallStart = null;
  }
}
function stackToastMore(g, lp, how, to) {
  if (how === 'void') {
    lp.toast('Through the void crust… and out into the sky of The End. The void winds carry you down', 'epic');
    endFirstVisit(g, lp);
  } else if (how === 'unvoid') lp.toast('Up out of the End, through the void crust, into the Ember Depths', 'warn');
}
function endFirstVisit(g, lp) {
  const f = g.meta.flags || (g.meta.flags = {});
  if (!f.endVisited) { f.endVisited = true; lp.grantXP(120); }
  const S = lp.player.stats || (lp.player.stats = {});
  if (!S.endSeen) { S.endSeen = 1; setTimeout(() => lp.toast('Somewhere over the main island, a dragon keeps watch', 'warn'), 4000); }
}
{
  // the void wind: down gently and across onto the nearest island
  const baseLP = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseLP.call(this, dt, inp);
    const g = this.g, p = this.player, T = p.endDrift;
    if (!T) return r;
    if (g.dim !== DIM.END || p.dead || p.flying || this.riding || p.gliding) { p.endDrift = null; return r; }
    const dx = T[0] - p.x, dz = T[2] - p.z, d = Math.hypot(dx, dz);
    p.fallStart = null; p.slowFallT = Math.max(p.slowFallT || 0, 1);
    if (d > 0.8) { const s = Math.min(10, d * 1.5); p.vx = dx / d * s; p.vz = dz / d * s; }
    // don't come down short of it
    if (d > 4 && p.y < T[1] + 3) p.vy = Math.max(p.vy, 0);
    if (p.onGround) { p.endDrift = null; p.slowFallT = 0; }
    if (Math.random() < dt * 20) g.burst(p.x, p.y + 0.6, p.z, 'end_mote', 1, 0.4, 0);
    return r;
  };
}

// ---- the End's portals: windows down into the End, and back out ----------------------------------------------------
PV_FLAT[B.end_portal] = 1;
function pvFlatDest(g, win) {
  if (g.dim === 0) {
    // a stronghold's portal: high over the obsidian platform, looking down on it
    win.rim = [0.25, 0.95, 0.75];
    return { dim: DIM.END, c: [END_PLAT[0] + 0.5, END_PLAT[1] + 22, END_PLAT[2] + 0.5], y0: END_PLAT[1] + 22, n: [0, 1, 0] };
  }
  if (g.dim === DIM.END && Math.hypot(win.c[0], win.c[2]) < 8) {
    // the exit portal: high over the world's spawn (or where you last slept)
    win.rim = [0.55, 0.85, 1.0];
    const s = g.meta.spawn || [0, 80, 0], E = endRec(g);
    if (!(E.exitY > 0)) E.exitY = (s[1] > 0 ? s[1] : makeWorldGen(g.meta.seed, 0, g.meta.genVersion || 1).column(Math.floor(s[0]), Math.floor(s[2])).h + 1);
    const sy = E.exitY + 24;
    return { dim: 0, c: [s[0] + 0.5, sy, s[2] + 0.5], y0: sy, n: [0, 1, 0] };
  }
  return null;
}
function pvArrived(g, to, win, dest, lp) {
  if (!win || win.kind !== 'flat' || !lp) return;
  const p = lp.player;
  p.slowFallT = Math.max(p.slowFallT || 0, 40); p.cloudFall = false; p.fallStart = null;
  if (to === DIM.END) {
    p.endDrift = [END_PLAT[0] + 0.5, END_PLAT[1] + 1, END_PLAT[2] + 0.5];
    lp.toast('The End', 'epic');
    endFirstVisit(g, lp);
  } else if (to === 0) lp.toast('Back to the Overworld — the winds of the portal set you down gently', 'good');
}
{
  // the portal blocks themselves: a starry deep that the window covers once it's live
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) {
    try { endGatewayTick(this, dt); } catch (e) { console.warn('gateway', e); }
    return baseUpd.call(this, dt);
  };
}
// ---- gateways: after each dragon, one opens round the main island, to a far island and back -----------------------------
function endGatewaySpots(g) {
  const E = endRec(g), out = [];
  for (let k = 0; k < (E.gates || 0); k++) {
    const a = k * 2.399 + 0.6, x = Math.round(Math.cos(a) * END_GATE_R), z = Math.round(Math.sin(a) * END_GATE_R);
    out.push({ k, x, y: 75, z, a });
  }
  return out;
}
function endRec(g) { return g.meta.end || (g.meta.end = { slain: 0, gates: 0, crystalsGone: [] }); }
function endGatewayOpen(g) {
  const E = endRec(g); E.gates = Math.min(20, (E.gates || 0) + 1);
  const s = endGatewaySpots(g).pop(), w = g.world;
  if (!s || g.dim !== DIM.END) return;
  w.ensureChunk(s.x >> 4, s.z >> 4);
  w.setBlock(s.x, s.y, s.z, B.end_gateway, 0);
  w.setBlock(s.x, s.y - 1, s.z, B.bedrock, 0); w.setBlock(s.x, s.y + 1, s.z, B.bedrock, 0);
  g.sfx.playAt('end_gate', s.x, s.y, s.z, 120);
  for (let i = 0; i < 40; i++) g.burst(s.x + 0.5, s.y + 0.5, s.z + 0.5, 'end_mote', 1, 3, 0);
}
function endGatewayTick(g, dt) {
  if (g.isGuest || !g.meta) return;
  endPortalFallback(g);
  if (g.dim !== DIM.END) return;
  for (const lp of g.locals) {
    const p = lp.player;
    if (p.dead || (lp._gateCd = (lp._gateCd || 0) - dt) > 0) continue;
    const id = g.world.getBlock(Math.floor(p.x), Math.floor(p.y + 0.5), Math.floor(p.z)), id2 = g.world.getBlock(Math.floor(p.x), Math.floor(p.y + 1.5), Math.floor(p.z));
    if (id !== B.end_gateway && id2 !== B.end_gateway) continue;
    lp._gateCd = 3;
    const r = Math.hypot(p.x, p.z), a = Math.atan2(p.z, p.x);
    let to;
    if (r < 200) {
      // out to the far islands, in the direction of this gateway
      to = endLanding(g, Math.cos(a) * 900, Math.sin(a) * 900);
      const w = g.world, gx = Math.floor(to[0]) + 2, gz = Math.floor(to[2]);
      w.ensureChunk(gx >> 4, gz >> 4);
      if (w.getBlock(gx, Math.floor(to[1]) + 2, gz) !== B.end_gateway) { w.setBlock(gx, Math.floor(to[1]) + 2, gz, B.end_gateway, 0); w.setBlock(gx, Math.floor(to[1]) + 1, gz, B.bedrock, 0); w.setBlock(gx, Math.floor(to[1]) + 3, gz, B.bedrock, 0); }
      to = [to[0] - 1, to[1], to[2]];
    } else {
      // and back: to the nearest gateway round the main island
      const sp = endGatewaySpots(g).sort((u, v) => Math.abs(((u.a - a + Math.PI * 3) % TAU) - Math.PI) - Math.abs(((v.a - a + Math.PI * 3) % TAU) - Math.PI))[0];
      to = sp ? [sp.x * 0.85 + 0.5, sp.y, sp.z * 0.85 + 0.5] : [END_PLAT[0] + 0.5, END_PLAT[1] + 1, END_PLAT[2] + 0.5];
    }
    g.burst(p.x, p.y + 1, p.z, 'end_mote', 30, 3, 0);
    g.world.ensureChunk(Math.floor(to[0]) >> 4, Math.floor(to[2]) >> 4);
    p.x = to[0]; p.y = to[1] + 0.2; p.z = to[2]; p.vx = p.vy = p.vz = 0; p.fallStart = null; p.slowFallT = Math.max(p.slowFallT || 0, 6);
    if (typeof unstick === 'function') unstick(g.world, p);
    g.sfx.play('end_gate');
    lp.toast(r < 200 ? 'The gateway flings you out to the far islands' : 'Back towards the main island', '');
  }
}

// Playing over LAN the portals aren't walked through as windows: stepping into one takes everyone, the old way
function endPortalFallback(g) {
  if (!(g.net && g.net.peers && g.net.peers.size > 0) || g._traveling) return;
  for (const lp of g.locals) {
    const p = lp.player;
    if (p.dead || g.world.getBlock(Math.floor(p.x), Math.floor(p.y + 0.2), Math.floor(p.z)) !== B.end_portal) continue;
    if (g.dim === 0) {
      g.changeDimension(DIM.END, () => { for (const l of g.locals) { l.player.x = END_PLAT[0] + 0.5 + l.index * 0.6; l.player.y = END_PLAT[1] + 1; l.player.z = END_PLAT[2] + 0.5; } return [END_PLAT[0] + 0.5, END_PLAT[1] + 1, END_PLAT[2] + 0.5]; });
      setTimeout(() => { for (const l of g.locals) endFirstVisit(g, l); }, 3000);
    } else if (g.dim === DIM.END) {
      const s = g.meta.spawn || [0, 80, 0];
      g.changeDimension(0, () => { for (const l of g.locals) g.placeAtSpawn(l.player, false); return [s[0], s[1] || 80, s[2]]; });
    }
    return;
  }
}
// ---- things from the End ---------------------------------------------------------------------------------------------------
defItem('ender_pearl', { name: 'Ender Pearl', maxStack: 16, drink: 'milk', pearl: true, desc: 'Throw it, and you are wherever it lands. It stings a little.' });
defItem('ender_eye', { name: 'Eye of Ender', drink: 'milk', enderEye: true, rarity: 'rare', desc: 'Throw it and follow it: it flies towards the nearest stronghold. Set one in each frame round a stronghold\'s portal to open it.' });
defItem('chorus_fruit', { name: 'Chorus Fruit', drink: 'milk', chorus: true, desc: 'Eat it and you find yourself somewhere nearby, suddenly. Restores a little health.' });
defItem('popped_chorus_fruit', { name: 'Popped Chorus Fruit', desc: 'Light as air. Builds purpur.' });
SMELTING.chorus_fruit = 'popped_chorus_fruit';
RECIPES.push({ out: 'ender_eye', n: 1, items: ['ender_pearl', 'cinder_powder'] });
RECIPES.push({ out: 'purpur_block', n: 4, shape: ['PP', 'PP'], key: { P: 'popped_chorus_fruit' } });
RECIPES.push({ out: 'end_rod', n: 4, shape: ['R', 'P'], key: { R: 'cinder_rod', P: 'popped_chorus_fruit' } });
RECIPES.push({ out: 'end_stone_bricks', n: 4, shape: ['EE', 'EE'], key: { E: 'end_stone' } });
// the villagers' cleric has pearls now and then (game/villagers.js); the endermen drop them (game/endmobs.js)

// a thrown pearl or eye
class EnderOrb extends Entity {
  constructor(game, lp, x, y, z, vx, vy, vz, kind, target) {
    super(game, x, y, z); this.lp = lp; this.vx = vx; this.vy = vy; this.vz = vz; this.kind = kind; this.target = target; this.w = 0.12; this.h = 0.12; this.netLocalOnly = true;
    if (kind === 'eye') { this.sx = x; this.sz = z; }
  }
  update(dt) {
    const g = this.game, w = g.world, lp = this.lp;
    this.age += dt;
    if (this.kind === 'eye') return this.eyeStep(dt);
    if (this.age > 10 || !lp || lp.player.dead || lp.player.dim !== g.dim) { this.remove = true; return; }
    for (let s = 0; s < 4; s++) {
      const h = dt / 4; this.vy -= 18 * h;
      const nx = this.x + this.vx * h, ny = this.y + this.vy * h, nz = this.z + this.vz * h;
      if (this.age > 0.15) for (const e of g.entities) if (e instanceof Mob && e.alive && Math.abs(e.x - nx) < e.w + 0.2 && Math.abs(e.z - nz) < e.w + 0.2 && ny > e.y && ny < e.y + e.h) { e.hurt(1, { type: 'mob', attacker: lp, knock: 1 }); return this.land(nx, ny, nz, null); }
      const id = w.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz));
      if (T_SOLID[id] || T_LIQUID[id] || ny < -40) return this.land(this.x, this.y, this.z, [Math.floor(nx), Math.floor(ny), Math.floor(nz)]);
      this.x = nx; this.y = ny; this.z = nz;
    }
    if (Math.random() < dt * 30) g.burst(this.x, this.y, this.z, 'end_mote', 1, 0.2, 0);
  }
  land(x, y, z, hitBlock) {
    const g = this.game, lp = this.lp, p = lp.player, w = g.world;
    this.remove = true;
    if (y < -30) return;
    g.burst(x, y, z, 'end_mote', 18, 2, 0);
    g.sfx.playAt('ender_tp', x, y, z, 30);
    // find standing room at the spot it struck
    let tx = x, ty = y, tz = z;
    if (hitBlock) { const [bx, by, bz] = hitBlock; if (!T_SOLID[w.getBlock(bx, by + 1, bz)] && !T_SOLID[w.getBlock(bx, by + 2, bz)] && Math.abs(by + 1 - y) < 1.6) { tx = bx + 0.5; ty = by + 1; tz = bz + 0.5; } }
    if (lp.riding && lp.riding.dismount) lp.riding.dismount(lp);
    g.burst(p.x, p.y + 1, p.z, 'end_mote', 20, 2, 0);
    p.x = tx; p.y = ty; p.z = tz; p.vx = p.vy = p.vz = 0; p.fallStart = null;
    if (typeof unstick === 'function') unstick(w, p);
    if (lp.hurt) lp.hurt(g.creative ? 0 : 3, { type: 'fall', bypassArmor: true });
    lp.endPearlT = 0;
  }
  eyeStep(dt) {
    const g = this.game, T = this.target;
    if (!this.hover) {
      // up and away towards it, then a hang in the air
      const dx = T ? T[0] - this.sx : Math.cos(this.age * 3), dz = T ? T[2] - this.sz : Math.sin(this.age * 3), d = Math.hypot(dx, dz) || 1;
      const far = Math.min(12, d), gone = Math.hypot(this.x - this.sx, this.z - this.sz);
      if (gone < far - 0.2 && this.age < 3) { this.x += dx / d * 8 * dt; this.z += dz / d * 8 * dt; this.y += (d < 12 ? -1 : 2.2) * dt; }
      else { this.hover = 1.4; }
    } else {
      this.hover -= dt; this.y += Math.sin(this.age * 8) * 0.01;
      if (this.hover <= 0) {
        this.remove = true;
        if (Math.random() < 0.8) g.dropItem(mkStack('ender_eye', 1), this.x, this.y - 0.2, this.z);
        else { g.burst(this.x, this.y, this.z, 'ender_eye', 10, 1); g.sfx.playAt('glass_break', this.x, this.y, this.z); }
      }
    }
    if (Math.random() < dt * 40) g.burst(this.x, this.y, this.z, 'end_mote', 1, 0.3, -1);
  }
  draws() {}
  glow(out) { out.push({ x: this.x, y: this.y, z: this.z, size: this.kind === 'eye' ? 0.32 : 0.26, uv: tileUV(ATLAS.tile[this.kind === 'eye' ? 'ender_eye' : 'ender_pearl'] ?? ATLAS.tile.white), light: 0xFF }); }
  hurt() { return 0; }
  snap() { return null; }
}
{
  const baseMilk = LocalPlayer.prototype.drinkMilk;
  LocalPlayer.prototype.drinkMilk = function (held) {
    const d = held && itemDef(held.id), g = this.g, p = this.player;
    if (!d || !(d.pearl || d.enderEye || d.chorus)) return baseMilk.call(this, held);
    const take = () => { if (!g.creative) { held.n--; if (held.n <= 0 && p.inv.held === held) p.inv.held = null; } };
    const [lx, ly, lz] = p.look();
    if (d.pearl) {
      if ((this.endPearlCd || 0) > performance.now()) return;
      this.endPearlCd = performance.now() + 900;
      take();
      const sp = 19;
      g.addEntity(new EnderOrb(g, this, p.x + lx * 0.5, p.y + p.eye - 0.1 + ly * 0.5, p.z + lz * 0.5, lx * sp, ly * sp + 2, lz * sp, 'pearl'));
      this.swingArm(); g.sfx.play('bow');
      return;
    }
    if (d.enderEye) {
      take();
      const T = g.dim === 0 && g.world.gen.nearestStronghold ? g.world.gen.nearestStronghold(p.x, p.z) : null;
      g.addEntity(new EnderOrb(g, this, p.x + lx * 0.6, p.y + p.eye, p.z + lz * 0.6, 0, 0, 0, 'eye', T));
      this.swingArm(); g.sfx.play('ender_eye');
      if (!T) this.toast(g.dim === 0 ? 'The eye spins, lost' : 'The eye spins, lost: strongholds are in the Overworld', '');
      return;
    }
    if (d.chorus) {
      take();
      p.heal(4); p.eatAnim = 0.45; g.sfx.play('eat');
      g.burst(p.x + lx * 0.4, p.y + p.eye - 0.25, p.z + lz * 0.4, 'chorus_fruit', 6, 0.6);
      chorusTeleport(g, this);
    }
  };
}
// somewhere within eight blocks, on solid ground
function chorusTeleport(g, lp) {
  const p = lp.player, w = g.world;
  for (let t = 0; t < 16; t++) {
    const x = Math.floor(p.x + (Math.random() - 0.5) * 16), z = Math.floor(p.z + (Math.random() - 0.5) * 16);
    for (let y = Math.min(CH - 3, Math.floor(p.y) + 8); y >= Math.max(1, Math.floor(p.y) - 8); y--) {
      if (T_SOLID[w.getBlock(x, y - 1, z)] && !T_SOLID[w.getBlock(x, y, z)] && !T_SOLID[w.getBlock(x, y + 1, z)] && !T_LIQUID[w.getBlock(x, y, z)]) {
        g.burst(p.x, p.y + 1, p.z, 'end_mote', 18, 2, 0);
        p.x = x + 0.5; p.y = y; p.z = z + 0.5; p.vx = p.vy = p.vz = 0; p.fallStart = null;
        g.sfx.play('ender_tp');
        g.burst(p.x, p.y + 1, p.z, 'end_mote', 18, 2, 0);
        return true;
      }
    }
  }
  return false;
}
// an eye set into a portal frame; twelve, and the portal opens
{
  const baseUBA = LocalPlayer.prototype.useBlockAt;
  LocalPlayer.prototype.useBlockAt = function (hit, held, def) {
    const g = this.g, w = g.world;
    if (hit && hit.id === B.end_portal_frame && held && held.id === 'ender_eye') {
      w.setBlock(hit.x, hit.y, hit.z, B.end_portal_frame_eye, w.getMeta(hit.x, hit.y, hit.z));
      if (!g.creative) { held.n--; if (held.n <= 0) this.player.inv.held = null; }
      g.sfx.playAt('ender_eye', hit.x + 0.5, hit.y + 1, hit.z + 0.5);
      g.burst(hit.x + 0.5, hit.y + 1, hit.z + 0.5, 'end_mote', 8, 1, 0);
      this.swingArm();
      if (endPortalCheck(g, hit.x, hit.y, hit.z)) { g.sfx.playAt('end_portal_open', hit.x, hit.y, hit.z, 80); this.toast('The portal opens', 'epic'); }
      return true;
    }
    if (hit && hit.id === B.end_portal_frame_eye && held && held.id === 'ender_eye') return true;
    return baseUBA.call(this, hit, held, def);
  };
}
// is (x, y, z) part of a complete ring of twelve eyes? then fill its middle with the portal
function endPortalCheck(g, x, y, z) {
  const w = g.world, eye = (a, b) => w.getBlock(a, y, b) === B.end_portal_frame_eye;
  for (let cz = z - 2; cz <= z + 2; cz++) for (let cx = x - 2; cx <= x + 2; cx++) {
    const ring = [];
    for (let i = -1; i <= 1; i++) ring.push([cx + i, cz - 2], [cx + i, cz + 2], [cx - 2, cz + i], [cx + 2, cz + i]);
    if (!ring.some(([a, b]) => a === x && b === z)) continue;
    if (!ring.every(([a, b]) => eye(a, b))) continue;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) w.setBlock(cx + dx, y, cz + dz, B.end_portal, 0);
    for (let k = 0; k < 40; k++) g.burst(cx + 0.5 + (Math.random() - 0.5) * 3, y + 0.8, cz + 0.5 + (Math.random() - 0.5) * 3, 'end_mote', 1, 1.5, -1);
    return true;
  }
  return false;
}
{
  // a portal frame without its eye doesn't hold a portal open
  const baseChanged = Game.prototype.onBlockChanged;
  Game.prototype.onBlockChanged = function (x, y, z, o, n, opts) {
    const r = baseChanged.call(this, x, y, z, o, n, opts);
    if (o === B.end_portal_frame_eye && n !== B.end_portal_frame_eye && this.world) {
      const w = this.world;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (w.getBlock(x + dx, y, z + dz) === B.end_portal) w.setBlock(x + dx, y, z + dz, 0, 0);
    }
    return r;
  };
}

// ---- the chorus plant's shape: a stem reaching out to its neighbours --------------------------------------------------
{
  const baseBoxes = shapeBoxes;
  shapeBoxes = function (id, meta, nb, nm, purpose = 0) {
    if (T_SHAPE[id] !== SHAPE.CHORUS) return baseBoxes(id, meta, nb, nm, purpose);
    const isC = (k) => !!(BLOCKS[k] && BLOCKS[k].chorus), flower = id === B.chorus_flower;
    const a = flower ? 2 : 3, b = 16 - a, out = [[a, a, a, b, b, b]];
    if (isC(nb(0, -1, 0)) || nb(0, -1, 0) === B.end_stone) out.push([a, 0, a, b, a, b]);
    if (!flower && isC(nb(0, 1, 0))) out.push([a, b, a, b, 16, b]);
    if (!flower) {
      if (isC(nb(1, 0, 0))) out.push([b, a, a, 16, b, b]);
      if (isC(nb(-1, 0, 0))) out.push([0, a, a, a, b, b]);
      if (isC(nb(0, 0, 1))) out.push([a, a, b, b, b, 16]);
      if (isC(nb(0, 0, -1))) out.push([a, a, 0, b, b, a]);
    }
    return out;
  };
}
{
  // a chorus plant cut at the root comes down with everything above it
  const baseChanged = Game.prototype.onBlockChanged;
  Game.prototype.onBlockChanged = function (x, y, z, o, n, opts) {
    const r = baseChanged.call(this, x, y, z, o, n, opts);
    if (BLOCKS[o] && BLOCKS[o].chorus && !(BLOCKS[n] && BLOCKS[n].chorus) && !this.isGuest && this.world) {
      const w = this.world, q = [[x, y + 1, z], [x + 1, y, z], [x - 1, y, z], [x, y, z + 1], [x, y, z - 1]];
      setTimeout(() => {
        if (!this.world || this.world !== w) return;
        for (const [a, b, c] of q) {
          const id = w.getBlock(a, b, c); if (!BLOCKS[id] || !BLOCKS[id].chorus) continue;
          // still held up from below or the side by another stem?
          const under = w.getBlock(a, b - 1, c);
          if (BLOCKS[under] && BLOCKS[under].chorus || under === B.end_stone) continue;
          w.setBlock(a, b, c, 0, 0);
          if (id === B.chorus_plant && Math.random() < 0.5) this.dropItem(mkStack('chorus_fruit', 1), a + 0.5, b + 0.5, c + 0.5, true);
          this.burst(a + 0.5, b + 0.5, c + 0.5, 'chorus_plant', 6, 1);
        }
      }, 90);
    }
    return r;
  };
}

// ---- sounds ---------------------------------------------------------------------------------------------------------------
SND_FX.ender_tp = [0.7, 0.5, (b, v, r) => { b.noise(0, 0.5, 'bp', 900, 3, 0.4, { sweep: 2.4 }); b.modes(0.02, [[620, 0.25, 1], [930, 0.2, 0.5]], 0.25, { droop: 0.8 }); }];
SND_FX.ender_eye = [0.9, 0.45, (b, v, r) => { b.modes(0, [[1046, 0.5, 1], [1568, 0.4, 0.5], [2093, 0.3, 0.25]], 0.3); b.noise(0.02, 0.4, 'bp', 3000, 4, 0.12); }];
SND_FX.end_portal_open = [3.0, 0.7, (b, v, r) => { b.thump(0, 90, 40, 1.6, 0.8); b.modes(0.1, [[220, 2.4, 1], [330, 2.2, 0.6], [440, 2, 0.4], [660, 1.6, 0.25]], 0.35); b.noise(0, 2.4, 'lp', 400, 0.7, 0.35); }];
SND_FX.end_gate = [1.6, 0.55, (b, v, r) => { b.noise(0, 1.2, 'bp', 600, 2, 0.4, { sweep: 3 }); b.modes(0.05, [[392, 1.2, 1], [587, 1, 0.5]], 0.3, { droop: 1.5 }); }];

// ---- the pictures -----------------------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('void_crust', p => {
      p.noise(H('#140c1c'), 0.35);
      for (let k = 0; k < 7; k++) { let x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); for (let i = 0; i < 9; i++) { p.set(x & 15, y & 15, mix(H('#b070ff'), H('#4a1a7a'), p.rand())); x += p.rand() < 0.5 ? 1 : -1; y += p.rand() < 0.6 ? 1 : 0; } }
      for (let i = 0; i < 6; i++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#f0d8ff'));
    });
    addTile('end_portal_frame_side', p => {
      p.noise(H('#dedca4'), 0.12);
      for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) p.set(x, y, shade(H('#3a7a6a'), 0.9 + p.rand() * 0.2));
      for (let x = 0; x < 16; x++) p.set(x, 4, H('#24504a'));
      for (let i = 0; i < 10; i++) p.set(Math.floor(p.rand() * 16), 5 + Math.floor(p.rand() * 11), H('#b8b682'));
    });
    addTile('end_portal_frame_top', p => {
      p.noise(H('#3e8270'), 0.15);
      for (let i = 0; i < 16; i++) { p.set(i, 0, H('#24504a')); p.set(i, 15, H('#24504a')); p.set(0, i, H('#24504a')); p.set(15, i, H('#24504a')); }
      for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) p.set(x, y, shade(H('#16302a'), 0.9 + p.rand() * 0.2));
      for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) p.set(x, y, H('#8ad8c0'));
    });
    addTile('end_portal_frame_eye', p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 7.5, y - 7.5);
        if (d < 7.2) p.set(x, y, d < 2.2 ? H('#0a1410') : d < 4.5 ? mix(H('#2ad0a0'), H('#a0ffe0'), p.rand() * 0.4) : shade(H('#1a8a6a'), 0.85 + p.rand() * 0.25));
      }
      p.set(5, 5, H('#e8fff8'));
    });
    addTile('end_portal', p => {
      p.fill(H('#05040a'));
      const cols = ['#1ab0a0', '#5a3aa0', '#2a6ad0', '#c0f0ff', '#3ad08a', '#8a4ad0'];
      for (let i = 0; i < 22; i++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H(cols[i % cols.length]));
    });
    addTile('chorus_plant', p => {
      p.noise(H('#5a3a62'), 0.18);
      for (let i = 0; i < 18; i++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H(p.rand() < 0.5 ? '#8a6a92' : '#3a2242'));
      for (let y = 0; y < 16; y += 5) for (let x = 0; x < 16; x++) if (p.rand() < 0.6) p.set(x, y, H('#432a4a'));
    });
    addTile('chorus_flower', p => {
      p.noise(H('#a68aa8'), 0.14);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); if (d > 6.5) p.set(x, y, H('#6a4a70')); else if (d < 2.5) p.set(x, y, H('#e8d8ea')); }
      for (let i = 0; i < 6; i++) p.set(4 + Math.floor(p.rand() * 8), 4 + Math.floor(p.rand() * 8), H('#c8b0ca'));
    });
    addTile('end_mote', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 7.5; if (d < 1) p.set(x, y, mix(H('#e0b0ff'), H('#8a3ad0'), d), Math.round(255 * Math.pow(1 - d, 1.4))); } });
    const I = (name, rows, pal) => addItem(name, p => p.art(rows, pal));
    I('ender_pearl', ['................', '................', '................', '.....kkkkk......', '....kTTTTTk.....', '...kTWLTTTDk....', '...kTLTTTTDk....', '...kTTTTTDDk....', '...kTTTTDDDk....', '...kTTTDDDDk....', '....kDDDDDk.....', '.....kkkkk......', '................', '................', '................', '................'],
      { k: H('#0a2a26'), T: H('#1e7a6a'), L: H('#5ad0b8'), W: H('#d0fff0'), D: H('#124a40') });
    I('ender_eye', ['................', '................', '................', '.....kkkkk......', '....kGGGGGk.....', '...kGWLGGGDk....', '...kGLGppGDk....', '...kGGpPPpDk....', '...kGGpPPpDk....', '...kGGGppDDk....', '....kDDDDDk.....', '.....kkkkk......', '................', '................', '................', '................'],
      { k: H('#0a2a1a'), G: H('#3ab070'), L: H('#9af0b8'), W: H('#f0fff4'), D: H('#1a6a3a'), p: H('#1a3a2a'), P: H('#040806') });
    I('chorus_fruit', ['................', '................', '.......ss.......', '......kssk......', '.....kPPPPk.....', '....kPLPPPDk....', '...kPLPPPPPDk...', '...kPPPdPPPDk...', '...kPPPPPdPDk...', '...kPPdPPPPDk...', '....kPPPPPDk....', '.....kDDDDk.....', '......kkkk......', '................', '................', '................'],
      { k: H('#2a1a32'), P: H('#8a5a96'), L: H('#c8a0d0'), D: H('#5a3a66'), d: H('#3e2848'), s: H('#6a4a3a') });
    I('popped_chorus_fruit', ['................', '................', '......k..k......', '.....kPk.kPk....', '....kPLPkPPPk...', '...kPLPPPPLPk...', '...kPPPPPPPPDk..', '..kPPLPPPPPPDk..', '..kPPPPPPLPDk...', '...kPPPPPPPDk...', '....kPPDPPDk....', '.....kDDDDk.....', '......kkkk......', '................', '................', '................'],
      { k: H('#4a3a52'), P: H('#d8c0de'), L: H('#f4ecf6'), D: H('#a88aae') });
  };
}
