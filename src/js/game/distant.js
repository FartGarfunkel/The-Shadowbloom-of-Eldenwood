// ---------------------------------------------------------------------------
// game/distant.js — 0.9.0.51: distant terrain, in the spirit of Distant
// Horizons and Voxy. (0.9.0.52: worked out from the seed itself.)
//
// Past your render distance the land goes on, drawn simply: blocky columns of
// ground (2 blocks across just outside your loaded chunks, 4, 8 and then 16
// further off), out to 512, 1,024 or 2,048 blocks (Options → Distant terrain).
//
// It's the world as it really is: the ground is worked out the way the world
// generator lays it (the same heights and the same top blocks: sand, gravel,
// podzol, mud, snow, dry grass), every tree stands where the generator plants
// it with its real height and crown (trunks and canopies near, canopies
// further off), villages stand where they are, and the sea darkens as it
// deepens. Chunks you've changed (kept in your save) and chunks loaded this
// session are drawn from the real blocks instead, so your builds show from
// afar. Far off, where single trees can't be seen, the forests are blended in.
//
// The land is drawn as tiles in a quadtree (64 blocks of 2-block columns up to
// 512 blocks of 16-block columns), coarse ones first so there is never a hole,
// finer ones as they're made, a few milliseconds a frame (a tile is worked out
// over several frames, so nothing stutters). Each is one draw. Inside your
// render distance the real chunks are drawn and the distant land is cut away.
// ---------------------------------------------------------------------------
const DIST = {
  CELLS: 32, LEVELS: 4,                  // 32 x 32 columns a tile; levels 0..3: columns of 2, 4, 8, 16 blocks
  tiles: new Map(), want: [], budget: 3, maxBytes: 96 * 1024 * 1024, bytes: 0, frame: 0, worldKey: '',
  sums: new Map(),                        // real chunks' surfaces (loaded this session, or from the save), 2x2-block cells
  trees: new Map(),                       // each tree's columns, from the generator
  job: null, prog: null, colors: null, built: 0,
};
const distSize = (L) => DIST.CELLS * (2 << L);
const DIST_MASK_R = 18;      // chunks each way round you that can be real (render distance 16, and a little more)
const distKey = (L, tx, tz) => L + ':' + tx + ':' + tz;

// ---- colours ------------------------------------------------------------------------------------------------
// the average colour of an atlas tile (a resource pack's too), worked out once
function distTileAvgIdx(idx) {
  if (idx === undefined || !ATLAS.pixels) return null;
  const P = ATLAS.pixels.data, x0 = (idx % ATLAS_TILES) * TILE, y0 = Math.floor(idx / ATLAS_TILES) * TILE;
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 0; y < TILE; y += 2) for (let x = 0; x < TILE; x += 2) { const o = ((y0 + y) * ATLAS_SIZE + x0 + x) * 4; if (P[o + 3] < 128) continue; r += P[o]; g += P[o + 1]; b += P[o + 2]; n++; }
  return n ? [r / n, g / n, b / n] : null;
}
function distColors() { return DIST.colors || (DIST.colors = { top: new Map(), side: new Map() }); }
// a block's colour from above (face 2) or from the side (face 0), in this climate
function distBlockColor(id, tb, hb, side) {
  const C = distColors(), M = side ? C.side : C.top;
  let base = M.get(id);
  if (base === undefined) { const f = BLOCK_FACES[id]; base = (f && distTileAvgIdx(f[side ? 0 : 2])) || [128, 128, 128]; M.set(id, base); }
  const b = BLOCKS[id];
  if (!b) return base;
  if (T_LIQUID[id] === 1) return climateWater(tb, hb, [0, 0, 0]);
  if (b.tint && !(side && b.key === 'grass')) { const t = climateGrass(tb, hb, [0, 0, 0]), k = b.tint === 'foliage' ? 0.85 : 1; return [base[0] * t[0] / 255 * 1.3 * k, base[1] * t[1] / 255 * 1.3 * k, base[2] * t[2] / 255 * 1.3 * k]; }
  return base;
}
const distClim = (c) => [(c.temp ?? 0) * 127 + 128, (c.humid ?? 0) * 127 + 128];

// ---- the generator's own surface: the top block of a column, as WorldGen.generateOverworld picks it -------------
function distTop(gen, wx, wz, c) {
  const h = c.h, S = gen.seed;
  let top = B.grass;
  switch (c.biome) {
    case BIOME.DESERT: top = B.sand; break;
    case BIOME.BEACH: top = B.sand; break;
    case BIOME.TAIGA: top = B.snowy_grass; break;
    case BIOME.OCEAN: { const f = gen.nFloor ? gen.nFloor.noise2(wx / 24, wz / 24) : 0.2; top = f > 0.45 ? B.clay : f > 0.05 ? B.sand : B.gravel; break; }
    case BIOME.MOUNTAINS: top = h > 96 ? B.snow_block : h > 82 ? B.stone : B.grass; break;
  }
  if ((c.biome === BIOME.PLAINS || c.biome === BIOME.FOREST) && h <= SEA + 1 && c.humid > 0.38 && c.temp > -0.1) top = B.mud;
  if (c.biome === BIOME.TAIGA && hashFloat(wx, wz, S, 13) < 0.18) top = B.podzol;
  if (c.biome === BIOME.PLAINS && c.temp > 0.3 && c.humid < -0.1 && hashFloat(wx, wz, S, 14) < 0.3) top = B.coarse_dirt;
  const fq = hashFloat(wx, wz, S, 15);
  if (top === B.grass && c.biome === BIOME.PLAINS && c.temp > 0.28 && c.humid < 0.02 && fq < 0.65) top = B.dirt_with_dry_grass;
  if (top === B.snowy_grass && c.temp > -0.42 && fq < 0.22) top = B.dirt_with_coniferous_litter;
  if (top === B.grass && c.temp > 0.25 && c.humid > 0.3 && fq < 0.3) top = B.dirt_with_rainforest_litter;
  if (c.biome === BIOME.DESERT && c.temp > 0.55 && B.desert_sand !== undefined) top = B.desert_sand;
  if (c.biome === BIOME.BEACH && c.temp < -0.2 && B.silver_sand !== undefined) top = B.silver_sand;
  return top ?? B.grass;
}
const DIST_SOIL = new Set(['grass', 'snowy_grass', 'dirt', 'podzol', 'coarse_dirt', 'mud', 'dirt_with_dry_grass', 'dirt_with_coniferous_litter', 'dirt_with_rainforest_litter'].map(k => B[k]).filter(v => v !== undefined));
// a tree's columns from the generator's own tree shapes: [dx, dz, top, leafBottom (999: none), leafId, logId]
function distTreeCols(gen, t) {
  const k = t.x + ',' + t.y + ',' + t.z;
  let v = DIST.trees.get(k);
  if (v) return v;
  const cols = new Map();
  let parts = [];
  try { parts = gen.treeParts(t) || []; } catch (e) { parts = []; }
  for (const q of parts) {
    const id = q[3]; if (!id) continue;
    const b = BLOCKS[id]; if (!b || !(b.isLeaves || b.isLog)) continue;
    if (t.bare && b.isLeaves) continue;
    const ck = (q[0] - t.x) * 1000 + (q[2] - t.z);
    let c = cols.get(ck);
    if (!c) cols.set(ck, c = [q[0] - t.x, q[2] - t.z, -1, 999, 0, 0]);
    if (q[1] + 1 > c[2]) c[2] = q[1] + 1;
    if (b.isLeaves) { if (q[1] < c[3]) c[3] = q[1]; if (!c[4]) c[4] = id; }
    else if (!c[5]) c[5] = id;
  }
  // kept compact (six shorts a column), and not too many: a few thousand trees is a lot of forest
  const vals = [...cols.values()], A = new Int16Array(vals.length * 6);
  vals.forEach((c, i) => A.set(c, i * 6));
  if (DIST.trees.size > 8000) DIST.trees.clear();
  DIST.trees.set(k, A);
  return A;
}

// ---- a real chunk's surface (loaded, or out of the save), 2x2 columns a cell: ground, canopy, water -------------
// ground: the top solid block (logs count as ground unless leaves are over them: a log cabin isn't a tree)
function distSummarize(world, ch, quiet) {
  if (!ch || (ch.dim !== undefined && ch.dim !== 0) || world.dim !== 0 || !world.gen || !world.gen.column) return;
  const S = { g: new Float32Array(64), gc: new Uint8Array(192), sc: new Uint8Array(192), ct: new Float32Array(64), cb: new Float32Array(64), cc: new Uint8Array(192), f: new Uint8Array(64), wd: new Uint8Array(64) };   // (worked out in floats, kept small below)
  const top = Math.min(CH - 1, (ch.maxY || CH - 2) + 1);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    let gBest = -1, gId = 0, ct = -1, cb = 999, leaf = 0, trunk = 0, wd = 0;
    for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < 2; dx++) {
      const x = i * 2 + dx, z = j * 2 + dz;
      let sawLeaf = false;
      for (let y = top; y >= 0; y--) {
        const id = ch.blocks[cidx(x, y, z)]; if (!id) continue;
        const b = BLOCKS[id];
        if (b.isLeaves) { sawLeaf = true; if (y + 1 > ct) ct = y + 1; if (y < cb) cb = y; if (!leaf) leaf = id; continue; }
        if (b.isLog && sawLeaf) { trunk = 1; continue; }
        if (T_OPAQUE[id] || T_LIQUID[id] || (T_SOLID[id] && b.render !== RENDER.CROSS)) {
          const gy = y + (T_LIQUID[id] ? 0.875 : 1);
          if (gy > gBest) {
            gBest = gy; gId = id;
            if (T_LIQUID[id] === 1) { let d = 0; for (let yy = y; yy > 0 && T_LIQUID[ch.blocks[cidx(x, yy, z)]] === 1 && d < 30; yy--) d++; wd = d; } else wd = 0;
          }
          break;
        }
      }
    }
    const k = j * 8 + i;
    if (gBest < 0) continue;
    let tb = 128, hb = 128;
    const cl = ch.climate, ci = ((j * 2) * 16 + i * 2) * 2;
    if (cl && cl.length > ci + 1 && (cl[ci] || cl[ci + 1])) { tb = cl[ci]; hb = cl[ci + 1]; }      // (0.9.0.54) the chunk knows its own climate
    else try { const cc = world.gen.column(ch.cx * 16 + i * 2, ch.cz * 16 + j * 2); [tb, hb] = distClim(cc); } catch (e) { /* defaults */ }
    const gc = distWater(gId, wd, tb, hb) || distBlockColor(gId, tb, hb), sc = distBlockColor(gId, tb, hb, true);
    S.g[k] = gBest; for (let q = 0; q < 3; q++) { S.gc[k * 3 + q] = Math.min(255, gc[q]); S.sc[k * 3 + q] = Math.min(255, sc[q]); }
    if (T_LIQUID[gId] === 1) { S.f[k] |= 1; S.wd[k] = wd; }
    if (leaf && ct > gBest + 0.5) { S.ct[k] = ct; S.cb[k] = Math.max(cb, gBest); const lc = distBlockColor(leaf, tb, hb); for (let q = 0; q < 3; q++) S.cc[k * 3 + q] = Math.min(255, lc[q]); if (trunk) S.f[k] |= 2; }
  }
  const key = ch.cx + ',' + ch.cz, old = DIST.sums.get(key);
  // kept small: heights in quarter blocks as shorts, and at most twelve thousand chunks (about 13 MB)
  const q = (F) => { const I = new Int16Array(64); for (let k = 0; k < 64; k++) I[k] = Math.round(F[k] * 4); return I; };
  S.g = q(S.g); S.ct = q(S.ct); S.cb = q(S.cb);
  DIST.sums.delete(key); DIST.sums.set(key, S);
  if (DIST.sums.size > 12000) { const k = DIST.sums.keys().next().value; DIST.sums.delete(k); }
  if (quiet) return;
  // the tiles that show it need making again, if its top has changed (digging under it, or a chest, changes nothing up there)
  if (old) { let same = true; for (let k = 0; k < 64 && same; k++) if (Math.abs(old.g[k] - S.g[k]) > 2 || Math.abs(old.ct[k] - S.ct[k]) > 2 || Math.abs(old.gc[k * 3 + 1] - S.gc[k * 3 + 1]) > 12) same = false; if (same) return; }
  for (let L = 0; L < DIST.LEVELS; L++) { const s = distSize(L), t = DIST.tiles.get(distKey(L, Math.floor(ch.cx * 16 / s), Math.floor(ch.cz * 16 / s))); if (t) t.dirty = true; }
}
// water: lighter and greener in the shallows, deep blue far out; ice where it's frozen
function distWater(id, depth, tb, hb) {
  if (T_LIQUID[id] !== 1) return null;
  const w = climateWater(tb, hb, [0, 0, 0]), k = Math.min(1, Math.max(0, (depth - 1) / 14));
  return [lerp(w[0] * 1.05 + 30, w[0] * 0.55, k), lerp(w[1] * 1.05 + 40, w[1] * 0.6, k), lerp(w[2] * 0.95 + 20, w[2] * 0.75, k)];
}
{
  const base = Game.prototype.meshInto;
  Game.prototype.meshInto = function (world, c) {
    const r = base.call(this, world, c);
    // (0.9.0.54) not the title screen's world (it once put its land into yours), and only your world's own chunks
    if (this.settings.farTerrain > 0 && world === this.world && !(this.panorama && world === this.panorama.world)) try { distCheckWorld(this); distSummarize(world, c); } catch (e) { /* never in the way of the real chunk */ }
    return r;
  };
}

// ---- working a tile out, a step at a time (a generator, resumed a few milliseconds a frame) -------------------
function* distBuild(g, L, tx, tz) {
  const gen = g.world.gen, world = g.world, N = DIST.CELLS, cs = 2 << L, size = N * cs, ox = tx * size, oz = tz * size, W = N + 2, WW = W * W;
  const G = new Float32Array(WW), GC = new Uint8Array(WW * 3), SC = new Uint8Array(WW * 3), CT = new Float32Array(WW), CB = new Float32Array(WW).fill(999), CC = new Uint8Array(WW * 3), FL = new Uint8Array(WW);
  const real = new Uint8Array(WW);
  const q4 = (v) => Math.min(252, Math.max(0, Math.round(v / 4) * 4));      // colours in steps of 4: runs of the same ground come out the same, and merge
  const setC = (A, k, c) => { A[k * 3] = q4(c[0]); A[k * 3 + 1] = q4(c[1]); A[k * 3 + 2] = q4(c[2]); };
  // 1. chunks you've changed, out of the save: their real blocks (near tiles only; it costs a little)
  DIST.phase = 'records';
  if (L <= 1 && world.records && world.records.size && typeof decodeChunkInto === 'function') {
    for (let cz = Math.floor((oz - cs) / 16); cz <= Math.floor((oz + size + cs) / 16); cz++) for (let cx = Math.floor((ox - cs) / 16); cx <= Math.floor((ox + size + cs) / 16); cx++) {
      const key = cx + ',' + cz; if (DIST.sums.has(key)) continue;
      // (0.9.0.54) only a chunk with a record is opened, into one spare chunk kept for it (not 128 KB new each time)
      const rec = world.records.get(chunkKey(0, cx, cz)); if (!rec) continue;
      const ck = DIST.scratch || (DIST.scratch = new Chunk(0, cx, cz));
      ck.cx = cx; ck.cz = cz; ck.key = chunkKey(0, cx, cz);
      try { decodeChunkInto(ck, rec); if (!ck.maxY) ck.maxY = CH - 2; distSummarize(world, ck, true); } catch (e) { /* a damaged record: the seed will do */ }
      yield;
    }
  }
  // 2. the ground, cell by cell: a real chunk's surface where there is one, otherwise the generator's
  DIST.phase = 'ground';
  for (let j = 0; j < W; j++) {
    for (let i = 0; i < W; i++) {
      const x = ox + (i - 1 + 0.5) * cs, z = oz + (j - 1 + 0.5) * cs, k = j * W + i;
      const fx = Math.floor(x), fz = Math.floor(z), sm = DIST.sums.get((fx >> 4) + ',' + (fz >> 4));
      if ((k & 7) === 7 && performance.now() > DIST.until) yield;      // (0.9.0.54) out of time this frame: carry on next frame
      if (sm) {
        const q = ((fz & 15) >> 1) * 8 + ((fx & 15) >> 1);
        G[k] = sm.g[q] ? sm.g[q] / 4 : SEA; GC[k * 3] = sm.gc[q * 3]; GC[k * 3 + 1] = sm.gc[q * 3 + 1]; GC[k * 3 + 2] = sm.gc[q * 3 + 2];
        SC[k * 3] = sm.sc[q * 3]; SC[k * 3 + 1] = sm.sc[q * 3 + 1]; SC[k * 3 + 2] = sm.sc[q * 3 + 2];
        if (sm.ct[q] > 0) { CT[k] = sm.ct[q] / 4; CB[k] = sm.cb[q] / 4; CC[k * 3] = sm.cc[q * 3]; CC[k * 3 + 1] = sm.cc[q * 3 + 1]; CC[k * 3 + 2] = sm.cc[q * 3 + 2]; }
        FL[k] = sm.f[q]; real[k] = 1;
        continue;
      }
      const c = gen.column(fx, fz), [tb, hb] = distClim(c);
      if (c.h < SEA) {
        const ice = (c.temp ?? 0) < -0.38;
        G[k] = SEA + 0.875; FL[k] |= 1;
        const wc = ice ? distBlockColor(B.ice, tb, hb) : distWater(B.water, Math.min(16, Math.round((SEA - c.h) / 2) * 2), tb, hb);
        setC(GC, k, wc); setC(SC, k, wc);
      } else {
        const top = distTop(gen, fx, fz, c);
        G[k] = c.h + 1;
        setC(GC, k, distBlockColor(top, tb, hb)); setC(SC, k, distBlockColor(top === B.grass ? B.dirt : top, tb, hb, true));
        // far off, single trees can't be told apart: the forest is blended into the ground, as tall as its trees
        if (L >= 2 && c.biome !== BIOME.DESERT && c.biome !== BIOME.BEACH && !(c.biome === BIOME.MOUNTAINS && c.h > 82)) {
          const jungle = c.temp > 0.25 && c.humid > 0.3, sav = c.biome === BIOME.PLAINS && c.temp > 0.28 && c.humid < 0.02;
          let per = { [BIOME.FOREST]: 7, [BIOME.PLAINS]: 0.6, [BIOME.TAIGA]: 4, [BIOME.MOUNTAINS]: 0.8 }[c.biome] || 0;     // trees a chunk (WorldGen.treesForChunk)
          if (jungle) per = 9; if (sav) per = 0.9;
          const cover = Math.min(1, per * 22 / 256);
          if (cover > 0.02) {
            const taiga = c.biome === BIOME.TAIGA || c.biome === BIOME.MOUNTAINS, lid = jungle ? B.jungle_leaves : taiga ? B.spruce_leaves : B.leaves;
            const lc = distBlockColor(lid ?? B.leaves, tb, hb), gcol = [GC[k * 3], GC[k * 3 + 1], GC[k * 3 + 2]];
            setC(GC, k, gcol.map((v, q) => lerp(v, lc[q] * 0.85, Math.min(1, cover * 1.2))));
            setC(SC, k, lc.map(v => v * 0.7));
            G[k] += Math.round(cover * (jungle ? 9 : taiga ? 7 : 5));
          }
        }
      }
    }
  }
  // 3. trees, where the generator plants them, with their real crowns (near tiles)
  if (L <= 1) {
    DIST.phase = 'trees';
    const x0 = ox - cs, z0 = oz - cs, x1 = ox + size + cs, z1 = oz + size + cs;
    let done = 0, newTrees = 0;
    for (let cz = Math.floor((z0 - 8) / 16); cz <= Math.floor((z1 + 8) / 16); cz++) for (let cx = Math.floor((x0 - 8) / 16); cx <= Math.floor((x1 + 8) / 16); cx++) {
      let list = [];
      try { list = gen.treesForChunk(cx, cz) || []; } catch (e) { list = []; }
      for (const t of list) {
        if (DIST.sums.has((t.x >> 4) + ',' + (t.z >> 4))) continue;          // a real chunk: its trees are in its surface already
        const bc = gen.column(t.x, t.z);
        if (t.type !== 'mangrove' && !DIST_SOIL.has(distTop(gen, t.x, t.z, bc))) continue;   // trees only take on soil
        const fresh = !DIST.trees.has(t.x + ',' + t.y + ',' + t.z);
        const [tb, hb] = distClim(bc), A = distTreeCols(gen, t);
        if (fresh) newTrees++;
        if (performance.now() > DIST.until) yield;                     // a big tree takes a moment to work out the first time
        for (let ci = 0; ci < A.length; ci += 6) {
          const c = A.subarray(ci, ci + 6), wx = t.x + c[0], wz = t.z + c[1];
          if (wx < x0 || wz < z0 || wx >= x1 || wz >= z1) continue;
          const i = Math.floor((wx - ox) / cs) + 1, j = Math.floor((wz - oz) / cs) + 1, k = j * W + i;
          if (real[k] || (FL[k] & 4)) continue;
          if (c[2] <= G[k] + 0.5) continue;
          if (c[2] > CT[k]) CT[k] = c[2];
          if (c[3] < 999 && c[3] < CB[k]) CB[k] = c[3];
          if (c[4] && !(FL[k] & 8)) { setC(CC, k, distBlockColor(c[4], tb, hb)); FL[k] |= 8; }
          if (c[5]) FL[k] |= 2;
        }
      }
      if (performance.now() > DIST.until) yield;
    }
    // 4. villages: each building a block of its walls with its roof on top
    if (typeof VREG !== 'undefined' && gen.villageAt) {
      DIST.phase = 'villages';
      for (let rz = Math.floor(z0 / VREG) - 1; rz <= Math.floor(z1 / VREG) + 1; rz++) for (let rx = Math.floor(x0 / VREG) - 1; rx <= Math.floor(x1 / VREG) + 1; rx++) {
        let v = null; try { v = gen.villageAt(rx, rz); } catch (e) { v = null; }
        if (!v || !v.blds) continue;
        for (const b of v.blds) {
          if (b.x1 < x0 || b.z1 < z0 || b.x0 >= x1 || b.z0 >= z1) continue;
          const wall = distBlockColor(B.oak_planks ?? B.planks ?? B.cobblestone, 128, 128, true), roof = distBlockColor(B.spruce_planks ?? B.dark_oak_planks ?? B.oak_planks ?? B.cobblestone, 128, 128).map(c => c * 0.8);
          for (let wz = b.z0; wz <= b.z1; wz++) for (let wx = b.x0; wx <= b.x1; wx++) {
            if (wx < x0 || wz < z0 || wx >= x1 || wz >= z1) continue;
            const i = Math.floor((wx - ox) / cs) + 1, j = Math.floor((wz - oz) / cs) + 1, k = j * W + i;
            if (real[k]) continue;
            const topY = b.y + 1 + (b.H || 5);
            if (topY > G[k]) { G[k] = topY; setC(GC, k, roof); setC(SC, k, wall); FL[k] |= 4; CT[k] = 0; CB[k] = 999; }
          }
        }
        // (alpha 3) the town's walls and towers, and its paved streets and square, as they really stand
        const mark = (wx, wz, y, top, side, solid) => { if (wx < x0 || wz < z0 || wx >= x1 || wz >= z1) return; const i = Math.floor((wx - ox) / cs) + 1, j = Math.floor((wz - oz) / cs) + 1, k = j * W + i; if (real[k]) return; if (solid ? y > G[k] : Math.abs(y - G[k]) < 3) { if (solid) G[k] = y; setC(GC, k, top); if (side) setC(SC, k, side); if (solid) { FL[k] |= 4; CT[k] = 0; CB[k] = 999; } } };
        if (v.tier) {
          const pave = distBlockColor(B.stone_bricks ?? B.cobblestone, 128, 128), path = distBlockColor(B.cobblestone, 128, 128);
          for (let dz = -v.P; dz <= v.P; dz++) for (let dx = -v.P; dx <= v.P; dx += Math.max(1, cs >> 1)) mark(v.x + dx, v.z + dz, v.y + 1, pave, null, false);
          for (const r of v.roads || []) for (const c of r.cells || []) mark(c[0], c[1], c[2] + 1, path, null, false);
        }
        if (v.wall) {
          const Wl = v.wall, stone = Wl.kind === 'stone', wc = distBlockColor(stone ? (B.stone_bricks ?? B.cobblestone) : (B.spruce_log ?? B.log), 128, 128, true), wt = distBlockColor(stone ? (B.stone_bricks ?? B.cobblestone) : (B.spruce_log ?? B.log), 128, 128);
          const y0 = (x, z) => Math.max(gen.column(x, z).h, SEA);
          const step = Math.max(1, cs >> 1);
          for (let x = Wl.x0; x <= Wl.x1; x += step) { mark(x, Wl.z0, y0(x, Wl.z0) + Wl.h + 1, wt, wc, true); mark(x, Wl.z1, y0(x, Wl.z1) + Wl.h + 1, wt, wc, true); }
          for (let z = Wl.z0; z <= Wl.z1; z += step) { mark(Wl.x0, z, y0(Wl.x0, z) + Wl.h + 1, wt, wc, true); mark(Wl.x1, z, y0(Wl.x1, z) + Wl.h + 1, wt, wc, true); }
          for (const [tx, tz] of [[Wl.x0, Wl.z0], [Wl.x1, Wl.z0], [Wl.x0, Wl.z1], [Wl.x1, Wl.z1]]) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) mark(tx + dx, tz + dz, y0(tx, tz) + Wl.h + 5, wt, wc, true);
        }
        yield;
      }
    }
  }
  yield;
  DIST.phase = 'mesh';
  return yield* distMesh(g.renderer.gl, L, tx, tz, { G, GC, SC, CT, CB, CC, FL });
}

// ---- a tile's mesh: a column per cell, walls down to lower neighbours (shaded darker toward the foot, for depth),
// tree crowns over the ground with their trunks under them (near), and a skirt round the edge -----------------------
function* distMesh(gl, L, tx, tz, D) {
  const N = DIST.CELLS, cs = 2 << L, size = N * cs, ox = tx * size, oz = tz * size, W = N + 2;
  const { G, GC, SC, CT, CB, CC, FL } = D;
  let minY = 1e9, maxY = -1e9;
  let cap = N * N * 16, vb = new ArrayBuffer(cap * 16), F = new Float32Array(vb), U = new Uint8Array(vb), nv = 0;
  let idx = new Uint32Array(N * N * 24), ni = 0;
  const drop = 0.6;      // a little below the real ground, so the real chunks always win where both are drawn
  const vert = (x, y, z, r, g, b, sh) => {
    if (nv >= cap) { cap *= 2; const nb = new ArrayBuffer(cap * 16); new Uint8Array(nb).set(U); vb = nb; F = new Float32Array(vb); U = new Uint8Array(vb); }
    const o = nv * 4; F[o] = x; F[o + 1] = y - drop; F[o + 2] = z; const u = nv * 16 + 12; U[u] = r; U[u + 1] = g; U[u + 2] = b; U[u + 3] = sh;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    return nv++;
  };
  const quad = (a, b, c, d) => {
    if (ni + 6 > idx.length) { const n2 = new Uint32Array(idx.length * 2); n2.set(idx); idx = n2; }
    idx[ni++] = a; idx[ni++] = b; idx[ni++] = c; idx[ni++] = a; idx[ni++] = c; idx[ni++] = d;
  };
  // a wall from y1 down to y0 along an edge, its foot in shadow
  const wall = (ax, az, bx, bz, y1, y0, r, g, b, sh) => {
    const foot = Math.max(80, Math.round(sh * Math.max(0.6, 1 - (y1 - y0) * 0.04)));
    quad(vert(ax, y1, az, r, g, b, sh), vert(bx, y1, bz, r, g, b, sh), vert(bx, y0, bz, r, g, b, foot), vert(ax, y0, az, r, g, b, foot));
  };
  const EDGES = [[-W, 0, 0, 1, 0, 205], [W, 1, 1, 0, 1, 205], [-1, 0, 1, 0, 0, 170], [1, 1, 0, 1, 1, 170]];   // neighbour, then the edge's two corners as (x,z) 0/1 pairs
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if ((i & 7) === 7 && performance.now() > DIST.until) yield;     // (0.9.0.54) out of time this frame
    const k = (j + 1) * W + (i + 1), h = G[k], x0 = i * cs, z0 = j * cs, x1 = x0 + cs, z1 = z0 + cs;
    const r = GC[k * 3], g = GC[k * 3 + 1], b = GC[k * 3 + 2];
    // the top: one face for a run of cells along the row at the same height and colour
    if (!(i > 0 && G[k - 1] === h && GC[k * 3 - 3] === r && GC[k * 3 - 2] === g && GC[k * 3 - 1] === b)) {
      let e = i; while (e + 1 < N && G[k + e - i + 1] === h && GC[(k + e - i + 1) * 3] === r && GC[(k + e - i + 1) * 3 + 1] === g && GC[(k + e - i + 1) * 3 + 2] === b) e++;
      const xe = (e + 1) * cs;
      quad(vert(x0, h, z0, r, g, b, 255), vert(x0, h, z1, r, g, b, 255), vert(xe, h, z1, r, g, b, 255), vert(xe, h, z0, r, g, b, 255));
    }
    const sr = SC[k * 3], sg = SC[k * 3 + 1], sb = SC[k * 3 + 2];
    for (let q = 0; q < 4; q++) {
      const e = EDGES[q], nk = k + e[0], edge = q === 0 ? j === 0 : q === 1 ? j === N - 1 : q === 2 ? i === 0 : i === N - 1;
      let lo = G[nk]; if (edge) lo = Math.min(lo, h) - 6;
      if (lo >= h) continue;
      wall(x0 + e[1] * cs, z0 + e[2] * cs, x0 + e[3] * cs, z0 + e[4] * cs, h, lo, sr, sg, sb, e[5]);
    }
    // a crown of leaves over the ground
    const ct = CT[k];
    if (ct > h + 0.4) {
      const cr = CC[k * 3], cg = CC[k * 3 + 1], cb = CC[k * 3 + 2];
      const float = L === 0, bot = float && CB[k] < 999 ? Math.max(CB[k], h) : h;
      quad(vert(x0, ct, z0, cr, cg, cb, 245), vert(x0, ct, z1, cr, cg, cb, 245), vert(x1, ct, z1, cr, cg, cb, 245), vert(x1, ct, z0, cr, cg, cb, 245));
      if (bot > h + 0.3) quad(vert(x1, bot, z0, cr, cg, cb, 110), vert(x1, bot, z1, cr, cg, cb, 110), vert(x0, bot, z1, cr, cg, cb, 110), vert(x0, bot, z0, cr, cg, cb, 110));
      for (const e of EDGES) {
        const nk = k + e[0], nct = CT[nk] > G[nk] + 0.4 ? CT[nk] : 0, nbot = nct ? (float && CB[nk] < 999 ? Math.max(CB[nk], G[nk]) : G[nk]) : 1e9;
        const from = nct && nbot <= bot + 0.01 ? Math.max(bot, nct) : bot;
        if (from >= ct - 0.01) continue;
        const ax = x0 + e[1] * cs, az = z0 + e[2] * cs, bx = x0 + e[3] * cs, bz = z0 + e[4] * cs;
        const s = Math.round(e[5] * 0.92);
        quad(vert(ax, ct, az, cr * 0.9, cg * 0.9, cb * 0.9, s), vert(bx, ct, bz, cr * 0.9, cg * 0.9, cb * 0.9, s), vert(bx, from, bz, cr * 0.75, cg * 0.75, cb * 0.75, s), vert(ax, from, az, cr * 0.75, cg * 0.75, cb * 0.75, s));
      }
      // its trunk, under a floating crown
      if (float && (FL[k] & 2) && bot > h + 0.3) {
        const tw = Math.min(cs, 1) / 2, mx = x0 + cs / 2, mz = z0 + cs / 2, tr = 92, tg = 70, tb2 = 46;
        wall(mx - tw, mz - tw, mx + tw, mz - tw, bot, h, tr, tg, tb2, 200); wall(mx + tw, mz + tw, mx - tw, mz + tw, bot, h, tr, tg, tb2, 200);
        wall(mx - tw, mz + tw, mx - tw, mz - tw, bot, h, tr, tg, tb2, 165); wall(mx + tw, mz - tw, mx + tw, mz + tw, bot, h, tr, tg, tb2, 165);
      }
    }
  }
  const vao = gl.createVertexArray(), vbo = gl.createBuffer(), ibo = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(vb, 0, nv * 16), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, true, 16, 12);
  const big = nv > 65535, I = big ? idx.slice(0, ni) : Uint16Array.from(idx.subarray(0, ni));
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, vbo, ibo, count: I.length, it: big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, ox, oz, size, minY: minY - drop, maxY: maxY - drop, L, used: DIST.frame, dirty: false, bytes: nv * 16 + I.byteLength };
}
function distFree(gl, t) { if (!t || !t.vao) return; gl.deleteVertexArray(t.vao); gl.deleteBuffer(t.vbo); gl.deleteBuffer(t.ibo); t.vao = null; DIST.bytes -= t.bytes || 0; }
// the ground height at a spot, for lightning far off (the generator's)
function distGround(gen, x, z) { const c = gen.column(Math.floor(x), Math.floor(z)); return c.h < SEA ? SEA + 0.875 : c.h + 1; }

// ---- which tiles to draw from here: coarse far off, finer near; a tile is split only once all four of its
// quarters are ready, so there's never a gap ----------------------------------------------------------------------
function distSelect(cx, cz, range, covered, out, need) {
  const Lt = DIST.LEVELS - 1, S = distSize(Lt);
  const t0x = Math.floor((cx - range) / S), t1x = Math.floor((cx + range) / S), t0z = Math.floor((cz - range) / S), t1z = Math.floor((cz + range) / S);
  const visit = (L, tx, tz) => {
    const s = distSize(L), x0 = tx * s, z0 = tz * s;
    const nx = Math.max(x0, Math.min(cx, x0 + s)), nz = Math.max(z0, Math.min(cz, z0 + s));
    const near = Math.hypot(nx - cx, nz - cz);
    if (near > range) return;
    const far = Math.max(Math.hypot(x0 - cx, z0 - cz), Math.hypot(x0 + s - cx, z0 - cz), Math.hypot(x0 - cx, z0 + s - cz), Math.hypot(x0 + s - cx, z0 + s - cz));
    if (covered && covered(x0, z0, s, far)) return;                // all of it is real chunks, drawn
    const key = distKey(L, tx, tz), t = DIST.tiles.get(key);
    const mid = Math.hypot(x0 + s / 2 - cx, z0 + s / 2 - cz);
    if (L > 0 && mid < s * 1.25) {
      // (0.9.0.54) the four quarters worked through without making arrays for them every frame
      const ks = distSize(L - 1);
      let live = 0, ready = true;
      for (let q = 0; q < 4; q++) {
        const a = tx * 2 + (q & 1), b = tz * 2 + (q >> 1), kx = a * ks, kz = b * ks;
        if (Math.hypot(Math.max(kx, Math.min(cx, kx + ks)) - cx, Math.max(kz, Math.min(cz, kz + ks)) - cz) > range) continue;
        live |= 1 << q;
        const kt = DIST.tiles.get(distKey(L - 1, a, b)); if (!(kt && kt.vao)) ready = false;
      }
      if (ready) { for (let q = 0; q < 4; q++) if (live >> q & 1) visit(L - 1, tx * 2 + (q & 1), tz * 2 + (q >> 1)); return; }
      for (let q = 0; q < 4; q++) if (live >> q & 1) { const a = tx * 2 + (q & 1), b = tz * 2 + (q >> 1); if (!DIST.tiles.get(distKey(L - 1, a, b))) need.push([L - 1, a, b, mid]); }
    }
    if (t && t.vao) { out.push(t); if (t.dirty) need.push([L, tx, tz, mid + 400]); }
    else need.push([L, tx, tz, mid - (Lt - L) * 2000]);            // coarse ones first
  };
  for (let tz = t0z; tz <= t1z; tz++) for (let tx = t0x; tx <= t1x; tx++) visit(Lt, tx, tz);
}

// ---- working them out, a few milliseconds a frame: one tile at a time, resumed where it left off ------------------
function distWork(g) {
  const gl = g.renderer.gl, W = DIST.want;
  if (!g.world || !g.world.gen) { W.length = 0; return; }
  const t0 = performance.now();
  let guard = 0;
  while (performance.now() - t0 < DIST.budget && guard++ < 64) {
    if (!DIST.job) {
      if (!W.length) break;
      W.sort((a, b) => a[3] - b[3]);
      let pick = null;
      while (W.length && !pick) { const w = W.shift(), old = DIST.tiles.get(distKey(w[0], w[1], w[2])); if (!old || !old.vao || old.dirty) pick = w; }
      if (!pick) break;
      DIST.job = { key: distKey(pick[0], pick[1], pick[2]), it: distBuild(g, pick[0], pick[1], pick[2]) };
    }
    let r;
    DIST.until = t0 + DIST.budget;
    try { r = DIST.job.it.next(); } catch (e) { console.warn('distant terrain', e); DIST.job = null; continue; }
    if (r.done) {
      const key = DIST.job.key, old = DIST.tiles.get(key), t = r.value;
      if (old) distFree(gl, old);
      DIST.tiles.set(key, t); DIST.bytes += t.bytes; DIST.built++;
      DIST.job = null;
    }
  }
  W.length = 0;
  // forget the ones not drawn for a while, past the memory it may use
  if (DIST.bytes > DIST.maxBytes) {
    const all = [...DIST.tiles.entries()].sort((a, b) => a[1].used - b[1].used);
    for (const [k, t] of all) { if (DIST.bytes <= DIST.maxBytes * 0.85 || t.used >= DIST.frame - 2) break; distFree(gl, t); DIST.tiles.delete(k); }
  }
}
// a different world (or a new version of its land): everything made for the last one goes
function distCheckWorld(g) {
  const key = (g.meta && g.meta.id) + ':' + (g.meta && g.meta.genVersion);
  if (key !== DIST.worldKey) { distReset(g.renderer.gl); DIST.worldKey = key; DIST.colors = null; }
}
function distReset(gl) { for (const t of DIST.tiles.values()) distFree(gl, t); DIST.tiles.clear(); DIST.sums.clear(); DIST.trees.clear(); DIST.want.length = 0; DIST.job = null; DIST.bytes = 0; }

// ---- drawing ---------------------------------------------------------------------------------------------------
const DIST_VS = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aCol;
uniform mat4 uProj; uniform mat4 uView; uniform vec3 uOffset; uniform vec2 uOrigin;
out vec4 vCol; out float vDist; out vec2 vW;
void main(){ vec3 p = aPos + uOffset; vec4 vp = uView * vec4(p, 1.0); gl_Position = uProj * vp; vCol = aCol; vDist = length(vp.xyz); vW = aPos.xz + uOrigin; }`;
const DIST_FS = `#version 300 es
precision highp float;
uniform vec3 uFog; uniform vec2 uFogRange; uniform float uDay; uniform float uMinLight; uniform vec3 uHole;
uniform sampler2D uMask; uniform vec3 uMaskO; uniform float uCell;
uniform vec4 uFront; uniform vec4 uTrail; uniform vec4 uStorm; uniform vec2 uAnchor; uniform vec3 uRainCol;
in vec4 vCol; in float vDist; in vec2 vW; out vec4 o;
// (0.9.0.51) the weather's storm, as the game has it (game/skies.js stormAt): over the far land too
float stormAt(vec2 p) {
  vec2 r = p - uAnchor; float s = uStorm.x;
  if (uTrail.w > 0.5) s = clamp((uTrail.z - dot(r, uTrail.xy)) / uStorm.z + 0.5, 0.0, 1.0);
  if (uFront.w > 0.5) s = max(s, clamp((dot(r, uFront.xy) - uFront.z) / uStorm.z + 0.5, 0.0, 1.0));
  return s * s * (3.0 - 2.0 * s);
}
void main(){
  // where a real chunk is drawn, it's drawn instead (chunk by chunk, so while chunks are still loading this fills in)
  vec2 mp = (vW - uMaskO.xy) / uMaskO.z;
  if (mp.x >= 0.0 && mp.y >= 0.0 && mp.x < 1.0 && mp.y < 1.0 && texture(uMask, mp).r > 0.5) discard;
  vec3 c = vCol.rgb * vCol.a * max(uDay, uMinLight);
  // a little variety cell to cell, as the real blocks have
  vec2 cell = floor((vW + 0.013) / uCell);
  c *= 0.94 + 0.12 * fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
  if (uStorm.y > 0.001) {
    float st = stormAt(vW);
    c *= 1.0 - st * uStorm.y * 0.4;                                        // in the storm's shadow
    c = mix(c, uRainCol, st * uStorm.w * smoothstep(40.0, 420.0, vDist));   // rain falling between you and it
  }
  o = vec4(mix(c, uFog, smoothstep(uFogRange.x, uFogRange.y, vDist)), 1.0);
}`;
Renderer.prototype.drawDistant = function (S, cam, env, fogRange) {
  const L = S.distant; if (!L || !L.list.length) return;
  const gl = this.gl;
  if (!DIST.prog) DIST.prog = compileProgram(gl, DIST_VS, DIST_FS, 'distant');
  const P = DIST.prog, u = P.u;
  gl.useProgram(P.p);
  gl.uniformMatrix4fv(u.uProj, false, this.proj); gl.uniformMatrix4fv(u.uView, false, this.view);
  gl.uniform3fv(u.uFog, env.fog); gl.uniform2f(u.uFogRange, fogRange[0], fogRange[1]);
  gl.uniform1f(u.uDay, env.day * 0.92); gl.uniform1f(u.uMinLight, env.minLight);
  // which chunks round you are drawn for real
  const M = 2 * DIST_MASK_R + 1, ccx = Math.floor(cam.x) >> 4, ccz = Math.floor(cam.z) >> 4, cx0 = ccx - DIST_MASK_R, cz0 = ccz - DIST_MASK_R;
  const mask = this._distMask || (this._distMask = new Uint8Array(M * M)); mask.fill(0);
  const far = Math.max(48, S.renderDist * 16) + 12;
  for (const [ch, m] of this.chunkMeshes) {
    if (S.dim !== undefined && ch.dim !== S.dim) continue;
    const i = ch.cx - cx0, j = ch.cz - cz0;
    if (i < 0 || j < 0 || i >= M || j >= M || !m.opaque) continue;
    const dx = ch.cx * 16 + 8 - cam.x, dz = ch.cz * 16 + 8 - cam.z;
    if (dx * dx + dz * dz <= far * far) mask[j * M + i] = 255;
  }
  gl.activeTexture(gl.TEXTURE1);                                     // (0.9.0.54) its own unit, so the block atlas on unit 0 is never disturbed
  if (!this._distTex) { const t = this._distTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); }
  gl.bindTexture(gl.TEXTURE_2D, this._distTex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  if (!this._distTexN) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, M, M, 0, gl.RED, gl.UNSIGNED_BYTE, mask); this._distTexN = M; }
  else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, M, M, gl.RED, gl.UNSIGNED_BYTE, mask);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  gl.uniform1i(u.uMask, 1); gl.uniform3f(u.uMaskO, cx0 * 16, cz0 * 16, M * 16);
  // the weather over it
  const Wt = GAME && GAME.weather, WM = Wt && Wt.state ? Wt.state() : null;
  if (WM && (WM.front || WM.trail || WM.kind !== 'clear')) {
    const F = WM.front, T = WM.trail, th = (WM.front ? WM.front.kind : WM.kind) === 'thunder';
    gl.uniform4f(u.uFront, F ? F.ux : 0, F ? F.uz : 1, F ? F.edge : 0, F ? 1 : 0);
    gl.uniform4f(u.uTrail, T ? T.ux : 0, T ? T.uz : 1, T ? T.edge : 0, T ? 1 : 0);
    gl.uniform4f(u.uStorm, !T && WM.kind !== 'clear' ? 1 : 0, th ? 1 : 0.7, SKY.BAND, th ? 0.55 : 0.4);
    gl.uniform2f(u.uAnchor, Wt.ax ?? cam.x, Wt.az ?? cam.z);
    const lum = 0.25 + 0.75 * Math.max(0, Math.min(1, (env.day - 0.2) / 0.8));
    gl.uniform3f(u.uRainCol, (th ? 0.36 : 0.52) * lum, (th ? 0.38 : 0.55) * lum, (th ? 0.43 : 0.6) * lum);
  } else gl.uniform4f(u.uStorm, 0, 0, SKY.BAND, 0);
  let n = 0;
  for (const t of L.list) {
    const ox = t.ox - cam.x, oz = t.oz - cam.z, oy = -cam.y;
    if (!aabbInFrustum(this.planes, ox, oy + t.minY, oz, ox + t.size, oy + t.maxY + 1, oz + t.size)) continue;
    gl.uniform3f(u.uOffset, ox, oy, oz); gl.uniform2f(u.uOrigin, t.ox, t.oz); gl.uniform1f(u.uCell, 2 << t.L);
    gl.bindVertexArray(t.vao); gl.drawElements(gl.TRIANGLES, t.count, t.it, 0); n++;
  }
  gl.bindVertexArray(null); gl.activeTexture(gl.TEXTURE0);
  this.stats.distant = n;
};

// ---- each view: what to draw; each frame: a little more made ---------------------------------------------------
{
  Game.prototype.distantFor = function (l, R) {
    const s = this.settings.farTerrain | 0;
    if (!s || this.dim !== 0 || !this.world || !this.world.gen || !this.world.gen.column || this.state !== 'playing' && this.state !== 'paused') return null;
    // at any render distance (16 chunks too) it reaches well beyond it: at least 256 blocks further
    const n = this.locals.length, want = n >= 3 ? Math.min(s, 512) : n === 2 ? Math.min(s, 1024) : s;
    // (0.9.0.54) on a machine that can't keep up it draws closer by itself, and reaches back out when it can
    const A = DIST.adapt || (DIST.adapt = { scale: 1, low: 0, high: 0, t: 0 });
    if (l === this.locals[0] && this.state === 'playing') {
      const now = performance.now(), dt = Math.min(0.5, (now - (A.t || now)) / 1000); A.t = now;
      const cap = this.settings.fpsLimit || 60, fps = this.fps || cap;
      if (fps < Math.min(40, cap * 0.7)) { A.low += dt; A.high = 0; } else if (fps > Math.min(55, cap * 0.9)) { A.high += dt; A.low = 0; } else { A.low = Math.max(0, A.low - dt); A.high = 0; }
      if (A.low > 5) { A.scale = Math.max(0.3, A.scale * 0.8); A.low = 0; }
      if (A.high > 12 && A.scale < 1) { A.scale = Math.min(1, A.scale * 1.15); A.high = 0; }
    }
    const range = Math.max(Math.round(want * A.scale), R * 16 + 160);
    distCheckWorld(this);
    if (DIST.pack !== ATLAS.pixels) { DIST.pack = ATLAS.pixels; if (DIST.colors) { DIST.colors = null; for (const t of DIST.tiles.values()) t.dirty = true; } }   // (0.9.0.54) a new resource pack: the far land takes its colours
    const cam = l.cam || { x: l.player.x, z: l.player.z };
    // a tile all of whose chunks are drawn for real isn't drawn at all; the rest is cut away chunk by chunk (drawDistant)
    const w = this.world, meshes = this.renderer.chunkMeshes, inner = R * 16 - 8;
    const covered = (x0, z0, sz, far) => {
      if (far > inner) return false;
      for (let cz = z0 >> 4; cz < (z0 + sz) >> 4; cz++) for (let cx = x0 >> 4; cx < (x0 + sz) >> 4; cx++) { const ch = w.chunkAt(cx, cz); if (!ch || !meshes.has(ch)) return false; }
      return true;
    };
    const hole = 0, list = [];
    distSelect(cam.x, cam.z, range, covered, list, DIST.want);
    for (const t of list) t.used = DIST.frame;
    return { list, hole, range };
  };
  // lightning out over the distant land in a thunderstorm (to be seen, and heard a while after)
  const farBolts = (g, dt) => {
    const W = g.weather; if (!W || g.isGuest || g.state !== 'playing' || !W.state) return;
    const M = W.state(), th = M.kind === 'thunder' || (M.front && M.front.kind === 'thunder' && (W.approach || 0) > 0.3);
    if (!th || (g._farBoltT = (g._farBoltT || 0) - dt) > 0) return;
    g._farBoltT = 3 + Math.random() * 7;
    const p = g.locals[0] && g.locals[0].player; if (!p) return;
    const R = g.renderDist() * 16, range = Math.max(g.settings.farTerrain | 0, R + 256) * 0.9;
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * TAU, d = R + 40 + Math.random() * (range - R - 40), x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (W.stormAt(x, z) < 0.65) continue;
      const y = distGround(g.world.gen, x, z) - 0.6;
      g.addEntity(new LightningBolt(g, x, y, z));
      W.flashT = Math.max(W.flashT, d < 400 ? 0.2 : 0.1);
      setTimeout(() => g.sfx.play('thunder_far'), Math.min(4000, d * 5));
      return;
    }
  };
  // (0.9.0.54) back at the title screen the far land's memory is given back
  const baseQuit = Game.prototype.quitToTitle;
  Game.prototype.quitToTitle = async function (...a) {
    const r = await baseQuit.apply(this, a);
    try { distReset(this.renderer.gl); DIST.worldKey = null; } catch (e) { /* only tidying */ }
    return r;
  };
  const baseLeave = Game.prototype.leaveGuestWorld;
  if (baseLeave) Game.prototype.leaveGuestWorld = async function (...a) {
    const r = await baseLeave.apply(this, a);
    try { distReset(this.renderer.gl); DIST.worldKey = null; } catch (e) { /* only tidying */ }
    return r;
  };
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    const r = baseFrame.call(this, dt);
    DIST.frame++;
    if (!(this.settings.farTerrain > 0)) { DIST.want.length = 0; if (DIST.tiles.size) distReset(this.renderer.gl); return r; }
    if (this.dim === 0) {
      try { farBolts(this, dt); } catch (e) { /* only for show */ }
      try { distWork(this); } catch (e) { console.warn('distant terrain', e); DIST.want.length = 0; }
      return r;
    }
    // (0.9.0.54) split screen with player 1 somewhere else and someone else in the Overworld: the work is done in the
    // Overworld's layer (before, the list of tiles wanted grew every frame and never got made)
    const ow = this.ctxs && this.ctxs.size > 1 && this.ctxs.get(0);
    if (ow && ow.world && DIST.want.length && typeof this.useCtx === 'function') {
      const back = this.ctx;
      try { this.useCtx(ow); distWork(this); } catch (e) { console.warn('distant terrain', e); }
      finally { this.useCtx(back); }
    }
    DIST.want.length = 0;
    return r;
  };
}
PV.debug.distant = DIST; PV.debug.distBuild = distBuild;
