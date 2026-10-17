// ---------------------------------------------------------------------------
// game/perf.js — 0.9.0.22: the optimisation pass.
//
// Plant detail by distance: the 3D plants (grass clumps, flowers, crops, cane,
// kelp) are built as solid little models only in the chunks near you; further
// out the same plants are two crossed pictures, a tenth of the triangles. As
// you walk, the chunks coming close are rebuilt with the detail (nearest
// first, a few at a time), so you never see the change up close.
// ---------------------------------------------------------------------------
let MESH_DETAIL = true;
const PLANT_DETAIL_R = 44;          // blocks from a player within which plants are full 3D
// two crossed pictures, the classic way
function emitCrossFlat(mb, ri, id, x, y, z, meta) {
  const self = BLOCKS[id];
  if (T_SHAPE[R_BLOCK[ri - RW2]] === SHAPE.PATH) y -= 1 / 16;
  let tile = BLOCK_FACES[id][0];
  if (self.crop) tile = self.stageTiles[Math.min(meta & 15, self.stageTiles.length - 1)];
  else if ((self.double || self.altTile) && (meta & 1)) tile = self.upperTile;
  const uv = tileUV(tile), sk = R_SKY[ri] * 17, bl = Math.max(R_BL[ri], T_LIGHT[id]) * 17, sh = 235;
  const sway = self.fire ? 0 : SWAY.PLANT;
  if (self.tint) mb.tint = cornerTint(x + 1, z + 1, climateGrass, self.tint === 'foliage');
  const plane = (ax, az, bx, bz) => {
    mb.sway = 0;
    const a = mb.vert(x + ax, y, z + az, uv[0], uv[3], sk, bl, sh), b = mb.vert(x + bx, y, z + bz, uv[2], uv[3], sk, bl, sh);
    mb.sway = sway;
    const c = mb.vert(x + bx, y + 1, z + bz, uv[2], uv[1], sk, bl, sh), d = mb.vert(x + ax, y + 1, z + az, uv[0], uv[1], sk, bl, sh);
    mb.quad(a, b, c, d, false); mb.quad(b, a, d, c, false);
  };
  if (self.crop) { for (const q of [0.25, 0.75]) { plane(0, q, 1, q); plane(q, 0, q, 1); } }
  else { plane(0.15, 0.15, 0.85, 0.85); plane(0.15, 0.85, 0.85, 0.15); }
  mb.sway = 0; mb.tint = TINT_GRASS;
}
{
  const baseCross = emitCross;
  emitCross = function (mb, ri, id, x, y, z, meta) {
    if (!MESH_DETAIL) { const s = BLOCKS[id]; if (s.render === RENDER.CROSS && !s.hangs && s.key !== 'kelp' && s.key !== 'sugar_cane') return emitCrossFlat(mb, ri, id, x, y, z, meta); }
    return baseCross(mb, ri, id, x, y, z, meta);
  };
  // each chunk built with the detail its distance calls for
  const baseMeshInto = Game.prototype.meshInto;
  Game.prototype.meshInto = function (world, c) {
    const all = this.allLocals ? this.allLocals() : this.locals, cx = c.cx * 16 + 8, cz = c.cz * 16 + 8;
    const pd = this.settings.plantDetail; let near = pd === 'all';
    if (!near && pd !== 'flat') for (const l of all) { const p = l.player; if ((p.dim ?? this.dim) === world.dim && Math.hypot(p.x - cx, p.z - cz) < PLANT_DETAIL_R + 12) { near = true; break; } }
    MESH_DETAIL = near;
    try { return baseMeshInto.call(this, world, c); } finally { c._detail = near; MESH_DETAIL = true; }
  };
  // as you go, the chunks coming close are rebuilt with their detail
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    const r = baseFrame.call(this, dt);
    if (this.state === 'playing' && this.world && !this._pass && (this._detT = (this._detT || 0) - dt) <= 0) {
      this._detT = 0.25;
      try { perfDetailTick(this); } catch (e) { console.warn('detail', e); }
    }
    return r;
  };
}
function perfDetailTick(g) {
  if (g.settings.plantDetail === 'flat' || g.settings.plantDetail === 'all') return;
  const all = g.allLocals ? g.allLocals() : g.locals, seen = new Set();
  for (const l of all) {
    const p = l.player, w = g.ctxs && g.ctxs.get(p.dim) ? g.ctxs.get(p.dim).world : g.world;
    if (!w || seen.has(w.dim + ':' + (p.x >> 4) + ',' + (p.z >> 4))) continue;
    seen.add(w.dim + ':' + (p.x >> 4) + ',' + (p.z >> 4));
    const pcx = Math.floor(p.x) >> 4, pcz = Math.floor(p.z) >> 4, R = Math.ceil(PLANT_DETAIL_R / 16), list = [];
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const c = w.chunkAt(pcx + dx, pcz + dz);
      if (!c || !c.mesh || c._detail !== false || c.needsMesh) continue;
      const d = Math.hypot(p.x - (c.cx * 16 + 8), p.z - (c.cz * 16 + 8));
      if (d < PLANT_DETAIL_R) list.push([d, c]);
    }
    list.sort((a, b) => a[0] - b[0]);
    for (const [, c] of list.slice(0, 3)) { c.needsMesh = true; c.litOnly = false; w.meshSet.add(c); }
  }
}
// for tests: what meshing every loaded chunk costs, with or without the plant detail
PV.debug.meshCost = (detail) => {
  const g = GAME, w = g.world; let tris = 0, ms = 0, n = 0;
  for (const c of w.chunks.values()) {
    if (!w.hasAllNeighbours(c)) continue;
    MESH_DETAIL = detail; const t = performance.now();
    try { const d = meshChunk(c, (x, z) => w.chunkAt(x, z), { fancyLeaves: g.settings.fancyLeaves }); tris += ((d.opaque && d.opaque.count) || 0) / 3 + ((d.water && d.water.count) || 0) / 3; }
    finally { MESH_DETAIL = true; }
    ms += performance.now() - t; n++;
  }
  return { chunks: n, tris: Math.round(tris), ms: Math.round(ms), msPerChunk: +(ms / Math.max(1, n)).toFixed(1) };
};
// for tests: where the triangles are, by height (under the land or above it) and with or without fancy leaves
PV.debug.meshSplit = (fancy) => {
  const g = GAME, w = g.world, buckets = {};
  const q = MeshBuilder.prototype.quad;
  MeshBuilder.prototype.quad = function (a, b, c, d, flip) { const y = this.f[a * 7 + 1], k = y < 40 ? 'y<40' : y < 56 ? 'y40-56' : y < 64 ? 'y56-64' : 'y64+'; buckets[k] = (buckets[k] || 0) + 2; return q.call(this, a, b, c, d, flip); };
  let n = 0;
  try { for (const c of w.chunks.values()) { if (!w.hasAllNeighbours(c)) continue; meshChunk(c, (x, z) => w.chunkAt(x, z), { fancyLeaves: fancy }); n++; } }
  finally { MeshBuilder.prototype.quad = q; }
  return { chunks: n, buckets };
};
