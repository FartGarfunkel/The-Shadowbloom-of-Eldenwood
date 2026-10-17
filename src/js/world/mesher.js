// ---------------------------------------------------------------------------
// world/mesher.js — lighting + mesh generation for one chunk.
//
// Light is a pure function of the 3x3 chunk neighbourhood: we copy blocks for
// the chunk plus a 15-block margin into a scratch volume, flood-fill sky and
// block light from scratch, then build geometry for the centre chunk with
// smooth lighting and ambient occlusion. Recomputing from scratch means no
// stale "ghost light" after torches are removed.
//
// Each vertex also carries a sway flag (grass and flowers bend at the top,
// leaves rustle, water rolls) and a climate tint, so grass, leaves and water
// shift colour smoothly across biomes.
// ---------------------------------------------------------------------------

const MARGIN = 15, RW = CS + MARGIN * 2, RW2 = RW * RW;
const R_BLOCK = new Uint16Array(RW2 * CH);
const R_META = new Uint8Array(RW2 * CH);
const R_SKY = new Uint8Array(RW2 * CH);
const R_BL = new Uint8Array(RW2 * CH);
const R_TOP = new Int16Array(RW2);
const LQ = new Int32Array(RW2 * CH);   // BFS queue (packed x | z<<6 | y<<12)
const R_CLIM = new Uint8Array(18 * 18 * 2); // temp, humidity for the chunk + 1 border

const SWAY = { NONE: 0, PLANT: 1, LEAVES: 2, WATER: 3, HANG: 4 };   // 4..15: hanging, swing grows with the code
const VSTRIDE = 28;
const TINT_GRASS = [124, 191, 72], TINT_FOLIAGE = [94, 160, 60], TINT_WATER = [63, 111, 216];

// Growable interleaved vertex buffer:
// pos(3 f32) uv(2 f32) light(sky, block, shade, sway u8) tint(r, g, b, all u8) = 28 bytes
class MeshBuilder {
  constructor(cap = 4096) { this.alloc(cap); this.vcount = 0; this.icount = 0; this.tint = TINT_GRASS; this.tintAll = 0; this.sway = 0; }
  alloc(cap) {
    this.cap = cap;
    this.buf = new ArrayBuffer(cap * VSTRIDE);
    this.f = new Float32Array(this.buf);
    this.u8 = new Uint8Array(this.buf);
    this.idx = new Uint32Array(cap * 1.5);
  }
  grow() {
    const ob = this.u8, oi = this.idx;
    this.alloc(this.cap * 2);
    this.u8.set(ob); this.idx.set(oi);
  }
  reset() { this.vcount = 0; this.icount = 0; this.tint = TINT_GRASS; this.tintAll = 0; this.sway = 0; }
  vert(x, y, z, u, v, sky, bl, sh) {
    if (this.vcount >= this.cap) this.grow();
    const o = this.vcount * 7, b = this.vcount * VSTRIDE + 20, t = this.tint;
    this.f[o] = x; this.f[o + 1] = y; this.f[o + 2] = z; this.f[o + 3] = u; this.f[o + 4] = v;
    this.u8[b] = sky; this.u8[b + 1] = bl; this.u8[b + 2] = sh; this.u8[b + 3] = this.sway;
    this.u8[b + 4] = t[0]; this.u8[b + 5] = t[1]; this.u8[b + 6] = t[2]; this.u8[b + 7] = this.tintAll;
    return this.vcount++;
  }
  quad(a, b, c, d, flip) {
    if (this.icount + 6 > this.idx.length) this.grow();
    const I = this.idx; let n = this.icount;
    if (flip) { I[n++] = b; I[n++] = c; I[n++] = d; I[n++] = b; I[n++] = d; I[n++] = a; }
    else { I[n++] = a; I[n++] = b; I[n++] = c; I[n++] = a; I[n++] = c; I[n++] = d; }
    this.icount = n;
  }
  result() {
    if (!this.vcount) return null;
    return { verts: this.u8.slice(0, this.vcount * VSTRIDE), idx: this.idx.slice(0, this.icount), count: this.icount };
  }
}
const MB_OPAQUE = new MeshBuilder(16384), MB_WATER = new MeshBuilder(4096);

// Face table: normal, 4 corners (CCW from outside), shading
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.8 },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.8 },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0 },
  { n: [0, -1, 0], c: [[1, 0, 1], [0, 0, 1], [0, 0, 0], [1, 0, 0]], shade: 0.52 },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.64 },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.64 },
];
const FACE_UV = [[0, 1], [1, 1], [1, 0], [0, 0]];
const AO_CURVE = [0.5, 0.68, 0.84, 1.0];
// Precomputed region offsets for each face's 4 corners: [front, s1, s2, corner]
const FACE_OFFS = FACES.map(f => {
  const fo = f.n[0] + f.n[2] * RW + f.n[1] * RW2;
  return f.c.map(p => {
    const axes = [0, 1, 2].filter(a => f.n[a] === 0);
    const off = (v) => v[0] + v[2] * RW + v[1] * RW2;
    const ea = [0, 0, 0], eb = [0, 0, 0];
    ea[axes[0]] = p[axes[0]] ? 1 : -1; eb[axes[1]] = p[axes[1]] ? 1 : -1;
    return [fo, fo + off(ea), fo + off(eb), fo + off(ea) + off(eb)];
  });
});

// ---- climate colours -------------------------------------------------------------
// temp & humidity are stored as bytes (value * 127 + 128).
const COL = { cold: [128, 168, 140], temperate: [124, 191, 74], lush: [80, 160, 56], dry: [190, 178, 92] };
function climateGrass(tb, hb, out) {
  const t = (tb - 128) / 127, h = (hb - 128) / 127;
  const wt = smoothstep(-0.55, 0.25, t), wh = smoothstep(-0.3, 0.45, h), hot = smoothstep(0.2, 0.6, t);
  for (let i = 0; i < 3; i++) {
    let c = lerp(COL.cold[i], COL.temperate[i], wt);
    c = lerp(c, COL.lush[i], wh * wt * 0.85);
    c = lerp(c, COL.dry[i], hot * (1 - wh));
    out[i] = c;
  }
  return out;
}
const WCOL = { cold: [70, 104, 176], temperate: [52, 104, 214], warm: [44, 150, 180] };
function climateWater(tb, hb, out) {
  const t = (tb - 128) / 127;
  for (let i = 0; i < 3; i++) out[i] = t < 0 ? lerp(WCOL.temperate[i], WCOL.cold[i], smoothstep(0, -0.6, t)) : lerp(WCOL.temperate[i], WCOL.warm[i], smoothstep(0.1, 0.6, t));
  return out;
}

function computeRegionLight(H) {
  R_SKY.fill(0, 0, RW2 * H);
  R_BL.fill(0, 0, RW2 * H);
  // 1. Direct sunlight down each column until the first non-air block.
  for (let c = 0; c < RW2; c++) {
    let top = -1;
    for (let y = H - 1; y >= 0; y--) { const b = R_BLOCK[y * RW2 + c]; if (b !== 0 && (T_OPAQUE[b] || T_ATT[b] || T_LIQUID[b])) { top = y; break; } }
    R_TOP[c] = top;
    for (let y = top + 1; y < H; y++) R_SKY[y * RW2 + c] = 15;
  }
  // 2. Seeds: lit cells beside taller neighbour columns, and the cell above a
  //    non-opaque top block (leaves, water, plants) so light keeps going down.
  let qh = 0, qt = 0;
  for (let z = 0; z < RW; z++) for (let x = 0; x < RW; x++) {
    const c = z * RW + x, t = R_TOP[c];
    let mt = t;
    if (x > 0) mt = Math.max(mt, R_TOP[c - 1]);
    if (x < RW - 1) mt = Math.max(mt, R_TOP[c + 1]);
    if (z > 0) mt = Math.max(mt, R_TOP[c - RW]);
    if (z < RW - 1) mt = Math.max(mt, R_TOP[c + RW]);
    const yEnd = Math.min(mt, H - 1);
    for (let y = t + 1; y <= yEnd; y++) LQ[qt++] = x | (z << 6) | (y << 12);
    if (t >= 0 && t + 1 < H && !T_OPAQUE[R_BLOCK[t * RW2 + c]] && t + 1 > yEnd) LQ[qt++] = x | (z << 6) | ((t + 1) << 12);
  }
  floodLight(R_SKY, qh, qt, H, true);
  // 3. Block light from emitters.
  qt = 0;
  for (let i = 0, n = RW2 * H; i < n; i++) {
    const id = R_BLOCK[i];
    if (id === 0) continue;
    const e = T_LMETA[id] ? metaLight(id, R_META[i]) : T_LIGHT[id];
    if (e) {
      R_BL[i] = e;
      const y = (i / RW2) | 0, r = i - y * RW2, z = (r / RW) | 0, x = r - z * RW;
      LQ[qt++] = x | (z << 6) | (y << 12);
    }
  }
  floodLight(R_BL, 0, qt, H, false);
}

function floodLight(L, qh, qt, H, sky) {
  const QN = LQ.length;
  while (qh !== qt) {
    const p = LQ[qh]; qh = (qh + 1) % QN;
    const x = p & 63, z = (p >> 6) & 63, y = p >> 12;
    const i = y * RW2 + z * RW + x;
    const l = L[i];
    if (l <= 1) continue;
    for (let d = 0; d < 6; d++) {
      let nx = x, ny = y, nz = z;
      if (d === 0) { if (++nx >= RW) continue; } else if (d === 1) { if (--nx < 0) continue; }
      else if (d === 2) { if (++ny >= H) continue; } else if (d === 3) { if (--ny < 0) continue; }
      else if (d === 4) { if (++nz >= RW) continue; } else { if (--nz < 0) continue; }
      const ni = ny * RW2 + nz * RW + nx;
      const nb = R_BLOCK[ni];
      if (T_OPAQUE[nb]) continue;
      const att = T_ATT[nb];
      const nl = (sky && d === 3 && l === 15 && att === 0) ? 15 : l - 1 - att;
      if (nl > L[ni]) { L[ni] = nl; LQ[qt] = nx | (nz << 6) | (ny << 12); qt = (qt + 1) % QN; }
    }
  }
}

// Build lighting + meshes for `ch`. `getChunk(cx,cz)` returns neighbours.
function meshChunk(ch, getChunk, opts) {
  // ---- gather 3x3 neighbourhood ----
  let maxY = 0;
  const nbs = [];
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const n = getChunk(ch.cx + dx, ch.cz + dz);
    nbs.push(n);
    if (n && n.maxY > maxY) maxY = n.maxY;
  }
  const H = Math.min(CH, maxY + 2);
  R_BLOCK.fill(0, 0, RW2 * H);
  R_META.fill(0, 0, RW2 * H);
  for (let k = 0; k < 9; k++) {
    const n = nbs[k]; if (!n) continue;
    const dx = (k % 3) - 1, dz = Math.floor(k / 3) - 1;
    const lx0 = dx < 0 ? CS - MARGIN : 0, lx1 = dx > 0 ? MARGIN : CS;
    const lz0 = dz < 0 ? CS - MARGIN : 0, lz1 = dz > 0 ? MARGIN : CS;
    const rxOff = MARGIN + dx * CS, rzOff = MARGIN + dz * CS;
    const len = lx1 - lx0, top = Math.min(H, n.maxY + 1);
    const nb = n.blocks, nm = n.meta;
    for (let y = 0; y < top; y++) for (let lz = lz0; lz < lz1; lz++) {
      const src = (y << 8) | (lz << 4) | lx0;
      const dst = y * RW2 + (lz + rzOff) * RW + lx0 + rxOff;
      for (let i = 0; i < len; i++) { R_BLOCK[dst + i] = nb[src + i]; R_META[dst + i] = nm[src + i]; }
    }
  }
  // climate for the chunk plus a one-column border (for smooth colour blending)
  for (let z = -1; z <= 16; z++) for (let x = -1; x <= 16; x++) {
    const n = nbs[(z < 0 ? 0 : z > 15 ? 2 : 1) * 3 + (x < 0 ? 0 : x > 15 ? 2 : 1)] || ch;
    const ci = ((z & 15) * 16 + (x & 15)) * 2, ri = ((z + 1) * 18 + x + 1) * 2;
    const cl = n.climate || ch.climate;
    R_CLIM[ri] = cl ? cl[ci] : 128; R_CLIM[ri + 1] = cl ? cl[ci + 1] : 128;
  }
  TINT_SEEN.fill(0);
  computeRegionLight(H);

  // ---- store centre light for gameplay queries ----
  const L = ch.light;
  for (let y = 0; y < CH; y++) for (let z = 0; z < CS; z++) {
    const base = (y << 8) | (z << 4);
    if (y >= H) { L.fill(0xF0, base, base + 16); continue; }
    const r = y * RW2 + (z + MARGIN) * RW + MARGIN;
    for (let x = 0; x < CS; x++) L[base + x] = (R_SKY[r + x] << 4) | R_BL[r + x];
  }
  ch.lightReady = true;
  if (opts && opts.lightOnly) return null;   // the LAN host lights ground round guests without drawing it

  // ---- geometry ----
  const mo = MB_OPAQUE, mw = MB_WATER;
  mo.reset(); mw.reset();
  const fancy = opts.fancyLeaves;
  const topY = Math.min(ch.maxY, CH - 1);
  const emitters = [], drips = [], hives = [], rods = [];
  MESH_H = H; MESH_CH = ch; MESH_OX = ch.cx * CS; MESH_OZ = ch.cz * CS;
  // (0.9.0.22) how deep the land here is solid all the way across: what lies well below that (caves) is
  // drawn only when you're down there too, or close by (the renderer is told where it starts)
  let minTop = CH;
  for (let z = 0; z < CS && minTop > 0; z++) for (let x = 0; x < CS; x++) {
    // the highest solid, light-stopping block in this column (water and leaves don't count: you can see through them)
    let t = -1;
    for (let y = topY; y >= 0; y--) if (T_OPAQUE[ch.blocks[cidx(x, y, z)]]) { t = y; break; }
    if (t < minTop) minTop = t;
    if (minTop <= 0) break;
  }
  const cut = minTop - 10;
  let deep = 0;
  for (let y = 0; y <= topY; y++) for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
    if (y === cut && z === 0 && x === 0) deep = mo.icount;
    const id = ch.blocks[cidx(x, y, z)];
    if (!id) continue;
    const ri = y * RW2 + (z + MARGIN) * RW + x + MARGIN;
    const rt = T_RENDER[id];
    const meta = ch.meta[cidx(x, y, z)];
    if (rt === RENDER.CUBE || rt === RENDER.CUTOUT) {
      // most blocks are buried: skip them without the full face-by-face work
      if (!(T_OPAQUE[R_BLOCK[ri + 1]] && T_OPAQUE[R_BLOCK[ri - 1]] && T_OPAQUE[R_BLOCK[ri + RW]] && T_OPAQUE[R_BLOCK[ri - RW]] && T_OPAQUE[R_BLOCK[ri + RW2]] && y > 0 && T_OPAQUE[R_BLOCK[ri - RW2]]))
        emitCube(T_TRANS[id] ? mw : mo, ri, id, x, y, z, fancy, meta);
    }
    else if (rt === RENDER.CROSS) emitCross(mo, ri, id, x, y, z, meta);
    else if (rt === RENDER.LIQUID) {
      // deep water with water all round shows no faces at all
      if (!(T_LIQUID[id] === 1 && y > 0 && rWater(ri + RW2) && rWater(ri + 1) && rWater(ri - 1) && rWater(ri + RW) && rWater(ri - RW) && (rWater(ri - RW2) || T_OPAQUE[R_BLOCK[ri - RW2]])))
        emitLiquid(T_LIQUID[id] === 2 ? mo : mw, ri, id, x, y, z, meta, H);
    }
    else if (rt === RENDER.TORCH) emitTorch(mo, ri, id, x, y, z, meta);
    else if (rt === RENDER.MODEL) emitShape(mo, ri, id, x, y, z, meta);
    else if (rt === RENDER.SHAPE) emitShapeBlock(T_TRANS[id] ? mw : mo, ri, id, x, y, z, meta);
    if ((meta & WLOG) && T_WLOG[id]) emitLiquid(mw, ri, B.water, x, y, z, 0, H);
    if (EMITS[id]) emitters.push([x, y, z, id, meta]);
    if (T_HIVE[id]) hives.push([x, y, z]);
    if (id === ROD_ID) rods.push([x, y, z]);     // (0.9.0.50) lightning rods, for the storms to find
    // where drips form: under a block with water or lava on it, and under leaves (rain comes through)
    if (y > 0 && R_BLOCK[ri - RW2] === 0) {
      if (T_HIVE[id]) { if ((meta & 0x0c) === 0x0c) drips.push([x, y, z, 4]); }     // a full hive drips honey
      else if (T_SOLID[id] && T_OPAQUE[id]) { const a = T_LIQUID[R_BLOCK[ri + RW2]]; if (a) drips.push([x, y, z, a]); }
      else if (T_LEAVES[id]) drips.push([x, y, z, 3]);
    }
  }
  mo.sway = 0; mw.sway = 0;
  ch.emitters = emitters; ch.drips = drips; ch.hives = hives; ch.rods = rods;
  return { opaque: mo.result(), water: mw.result(), deep: cut > 0 && cut <= topY ? deep : 0, cut };
}
const T_LEAVES = new Uint8Array(MAX_BLOCKS), T_HIVE = new Uint8Array(MAX_BLOCKS); for (const b of BLOCKS) { if (b && b.isLeaves) T_LEAVES[b.id] = 1; if (b && b.hive) T_HIVE[b.id] = 1; }
// Blocks that give off particles (smoke, flames, portal motes): found while meshing.
const EMITS = new Uint8Array(MAX_BLOCKS);
let MESH_H = CH;
// Is the region cell water (or a block holding water)?
function rWater(ri) { const b = R_BLOCK[ri]; return T_LIQUID[b] === 1 || (T_WLOG[b] && (R_META[ri] & WLOG) !== 0); }

// Average climate colour around a vertex corner (x,z in chunk-local block units).
const _c1 = [0, 0, 0], _acc = [0, 0, 0];
// Corner colours are worked out once per corner per chunk mesh and reused (3 kinds x 19 x 19 corners).
const TINT_SEEN = new Uint8Array(3 * 19 * 19);
const TINT_ARR = Array.from({ length: 3 * 19 * 19 }, () => [0, 0, 0]);
function cornerTint(x, z, fn, foliage) {
  const kind = fn === climateWater ? 2 : foliage ? 1 : 0;
  const key = kind * 361 + (clamp(Math.floor(z), -1, 17) + 1) * 19 + clamp(Math.floor(x), -1, 17) + 1;
  const out = TINT_ARR[key];
  if (TINT_SEEN[key]) return out;
  TINT_SEEN[key] = 1;
  const t = cornerTintRaw(x, z, fn, foliage);
  out[0] = t[0]; out[1] = t[1]; out[2] = t[2];
  return out;
}
function cornerTintRaw(x, z, fn, foliage) {
  _acc[0] = _acc[1] = _acc[2] = 0;
  for (let dz = -1; dz <= 0; dz++) for (let dx = -1; dx <= 0; dx++) {
    const cx = clamp(Math.floor(x + dx), -1, 16), cz = clamp(Math.floor(z + dz), -1, 16);
    const ri = ((cz + 1) * 18 + cx + 1) * 2;
    fn(R_CLIM[ri], R_CLIM[ri + 1], _c1);
    _acc[0] += _c1[0]; _acc[1] += _c1[1]; _acc[2] += _c1[2];
  }
  const k = foliage ? 0.2 : 0.25;
  return [Math.round(_acc[0] * k * (foliage ? 0.82 : 1)), Math.round(_acc[1] * k * (foliage ? 0.86 : 1)), Math.round(_acc[2] * k * (foliage ? 0.8 : 1))];
}

// Logs and pillars lie along an axis (meta 0 up, 1 east-west, 2 north-south).
const AXIS_END = [[2, 3], [0, 1], [4, 5]];
const _VS = new Int32Array(4), _CAO = new Uint8Array(4);
const AXIS_ROT = [[], [2, 3, 4, 5], [0, 1]];
function emitCube(mb, ri, id, x, y, z, fancy, meta) {
  const faces = BLOCK_FACES[id];
  const self = BLOCKS[id];
  const hasFront = self.tex && self.tex.front;
  const frontFace = hasFront ? FACING_FACE[meta & 3] : -1;
  const axis = self.axisBlock ? Math.min(2, meta & 3) : 0;
  const f6 = self.f6, dir6 = f6 ? Math.min(5, meta & 7) : 0;
  const tinted = self.tint;
  mb.sway = self.isLeaves ? SWAY.LEAVES : 0;
  for (let f = 0; f < 6; f++) {
    const F = FACES[f], offs = FACE_OFFS[f];
    const nb = R_BLOCK[ri + offs[0][0]];
    if (T_OPAQUE[nb]) continue;
    if (nb === id && (self.selfCull || (!fancy && self.isLeaves))) continue;
    let tile = faces[f], rot = 0;
    if (hasFront && f !== 2 && f !== 3) tile = f === frontFace ? faces[4] : faces[0];
    if (axis) { tile = AXIS_END[axis].includes(f) ? faces[2] : faces[0]; rot = AXIS_ROT[axis].includes(f) ? 1 : 0; }
    if (f6) {
      if (f === D6_FACE[dir6]) tile = dir6 < 2 ? f6.frontV : f6.front;
      else if (f === D6_FACE[OPP6[dir6]]) tile = meta & 8 ? f6.backOn : f6.back;
      else { tile = !self.sideAll && dir6 >= 2 && (f === 2 || f === 3) ? f6.top : f6.side; rot = F6_ROT[dir6][f]; }
    }
    const uv = tileUV(tile);
    const vs = _VS, ao = _CAO;
    for (let k = 0; k < 4; k++) {
      const o = offs[k];
      const s1 = T_OPAQUE[R_BLOCK[ri + o[1]]], s2 = T_OPAQUE[R_BLOCK[ri + o[2]]], cc = T_OPAQUE[R_BLOCK[ri + o[3]]];
      const a = (s1 && s2) ? 0 : 3 - (s1 + s2 + cc);
      ao[k] = a;
      // smooth light: average of non-opaque cells among front/s1/s2/corner
      let sk = R_SKY[ri + o[0]], bl = R_BL[ri + o[0]], n = 1;
      if (!s1) { sk += R_SKY[ri + o[1]]; bl += R_BL[ri + o[1]]; n++; }
      if (!s2) { sk += R_SKY[ri + o[2]]; bl += R_BL[ri + o[2]]; n++; }
      if (!cc && !(s1 && s2)) { sk += R_SKY[ri + o[3]]; bl += R_BL[ri + o[3]]; n++; }
      const c = F.c[k], t = FACE_UV[(k + rot) & 3];
      if (tinted) mb.tint = cornerTint(x + c[0], z + c[2], climateGrass, tinted === 'foliage');
      vs[k] = mb.vert(x + c[0], y + c[1], z + c[2], t[0] ? uv[2] : uv[0], t[1] ? uv[3] : uv[1],
        Math.round(sk / n * 17), Math.round(bl / n * 17), Math.round(F.shade * AO_CURVE[a] * 255));
    }
    mb.quad(vs[0], vs[1], vs[2], vs[3], ao[0] + ao[2] < ao[1] + ao[3]);
  }
  mb.sway = 0; mb.tint = TINT_GRASS;
}
// Blocks with a front (furnace, chest) store facing in meta: 0 +z, 1 +x, 2 -z, 3 -x.
const FACING_FACE = [4, 0, 5, 1];
// Six-way blocks (pistons, observers): turn each side's picture so its top edge points the way the block faces.
const F6_ROT = (() => {
  const out = [];
  for (let dir = 0; dir < 6; dir++) {
    out.push(FACES.map((F, f) => {
      let best = 0, bv = -9;
      for (let r = 0; r < 4; r++) {
        let mx = 0, my = 0, mz = 0, n = 0;
        for (let k = 0; k < 4; k++) if (FACE_UV[(k + r) & 3][1] === 0) { mx += F.c[k][0] - 0.5; my += F.c[k][1] - 0.5; mz += F.c[k][2] - 0.5; n++; }
        const v = (mx * D6X[dir] + my * D6Y[dir] + mz * D6Z[dir]) / n;
        if (v > bv + 1e-6) { bv = v; best = r; }
      }
      return best;
    }));
  }
  return out;
})();

// ---- solid plants: crops, flowers, saplings and mushrooms are built of little cubes -----------------
// Each picture is pushed out into a slab one pixel thick, with the edges of every leaf, petal and stalk
// filled in (coloured from the picture), the way Hytale and Vintage Story plants have body. The edge
// runs of each picture are worked out once (and again when a resource pack changes the pictures).
const VOXP = { src: null, cache: [], quads: [] };
function plantRuns(tile) {
  if (VOXP.src !== ATLAS.pixels) { VOXP.src = ATLAS.pixels; VOXP.cache = []; VOXP.quads = []; }
  const hit = VOXP.cache[tile]; if (hit) return hit;
  const P = ATLAS.pixels && ATLAS.pixels.data, W = ATLAS_SIZE, tx = (tile % ATLAS_TILES) * TILE, ty = Math.floor(tile / ATLAS_TILES) * TILE, st = TILE / 16;
  const M = new Uint8Array(256);
  if (P) for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) M[j * 16 + i] = P[((ty + Math.floor((j + 0.5) * st)) * W + tx + Math.floor((i + 0.5) * st)) * 4 + 3] >= 128 ? 1 : 0;
  const at = (i, j) => (i < 0 || j < 0 || i > 15 || j > 15) ? 0 : M[j * 16 + i];
  const runs = [];   // kind, line, from, to: 0 top edges of row, 1 bottom edges, 2 left edges of column, 3 right edges
  for (let j = 0; j < 16; j++) for (const [k, dj] of [[0, -1], [1, 1]]) {
    let s = -1;
    for (let i = 0; i <= 16; i++) { const e = i < 16 && at(i, j) && !at(i, j + dj); if (e && s < 0) s = i; else if (!e && s >= 0) { runs.push(k, j, s, i); s = -1; } }
  }
  for (let i = 0; i < 16; i++) for (const [k, di] of [[2, -1], [3, 1]]) {
    let s = -1;
    for (let j = 0; j <= 16; j++) { const e = j < 16 && at(i, j) && !at(i + di, j); if (e && s < 0) s = j; else if (!e && s >= 0) { runs.push(k, i, s, j); s = -1; } }
  }
  return (VOXP.cache[tile] = new Int8Array(runs));
}
// The quads of one picture's slab, worked out once in its own frame (t along it 0..1, h up it 0..1, s
// through it -1..1; u, v in pixels; shade), each wound to face outward. Every plane that uses the
// picture is that frame turned about the upright, so the winding holds.
function plantQuads(tile) {
  if (VOXP.src !== ATLAS.pixels) { VOXP.src = ATLAS.pixels; VOXP.cache = []; VOXP.quads = []; }
  const hit = VOXP.quads[tile]; if (hit) return hit;
  const R = plantRuns(tile), Q = [];
  const face = (vs, N) => {
    // vs: four [t, h, s, u, v, sh]; positions in the frame are (t, h, s)
    const P = (q) => [q[0], q[1], q[2] * 0.03];
    const a = P(vs[0]), b = P(vs[1]), c = P(vs[2]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const ok = cr[0] * N[0] + cr[1] * N[1] + cr[2] * N[2] >= 0;
    for (const q of ok ? vs : [vs[0], vs[3], vs[2], vs[1]]) Q.push(...q);
  };
  face([[0, 0, 1, 0, 16, 235], [1, 0, 1, 16, 16, 235], [1, 1, 1, 16, 0, 235], [0, 1, 1, 0, 0, 235]], [0, 0, 1]);
  face([[1, 0, -1, 16, 16, 220], [0, 0, -1, 0, 16, 220], [0, 1, -1, 0, 0, 220], [1, 1, -1, 16, 0, 220]], [0, 0, -1]);
  for (let r = 0; r < R.length; r += 4) {
    const k = R[r], line = R[r + 1], a = R[r + 2], b = R[r + 3];
    if (k < 2) {
      // the top or bottom of a row of pixels
      const hy = 1 - (line + (k ? 1 : 0)) / 16, vc = line + 0.5, sh = k ? 150 : 250;
      face([[a / 16, hy, -1, a, vc, sh], [b / 16, hy, -1, b, vc, sh], [b / 16, hy, 1, b, vc, sh], [a / 16, hy, 1, a, vc, sh]], [0, k ? -1 : 1, 0]);
    } else {
      // the left or right side of a column
      const t = (line + (k === 3 ? 1 : 0)) / 16, uc = line + 0.5, hA = 1 - a / 16, hB = 1 - b / 16, sh = k === 3 ? 200 : 185;
      face([[t, hB, -1, uc, b, sh], [t, hB, 1, uc, b, sh], [t, hA, 1, uc, a, sh], [t, hA, -1, uc, a, sh]], [k === 3 ? 1 : -1, 0, 0]);
    }
  }
  return (VOXP.quads[tile] = new Float32Array(Q));
}
// one picture as a slab from (ax, az) to (bx, bz) across the cell, h0..h1 up it, th thick
function voxelPlane(mb, tile, uv, x, y, z, ax, az, bx, bz, h0, h1, th, sk, bl, swayTop) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz) || 1, nx = -dz / L * th / 2, nz = dx / L * th / 2;
  const du = (uv[2] - uv[0]) / 16, dv = (uv[3] - uv[1]) / 16, Q = plantQuads(tile), X = x + ax, Z = z + az, H = h1 - h0;
  for (let i = 0; i < Q.length; i += 24) {
    const v0 = mb.vcount;
    for (let k = i; k < i + 24; k += 6) {
      const t = Q[k], hy = Q[k + 1], sg = Q[k + 2];
      mb.sway = swayTop && hy > 0.001 ? 16 + Math.round(15 * hy) : 0;
      mb.vert(X + dx * t + nx * sg, y + h0 + H * hy, Z + dz * t + nz * sg, uv[0] + Q[k + 3] * du, uv[1] + Q[k + 4] * dv, sk, bl, Q[k + 5]);
    }
    mb.quad(v0, v0 + 1, v0 + 2, v0 + 3, false);
  }
  mb.sway = 0;
}
const voxPlant = (b) => b._vox ?? (b._vox = !b.fire && !b.tint && b.key !== 'cobweb' && !/seagrass|kelp|coral/.test(b.key));

function emitCross(mb, ri, id, x, y, z, meta) {
  const self = BLOCKS[id];
  if (T_SHAPE[R_BLOCK[ri - RW2]] === SHAPE.PATH) y -= 1 / 16;     // crops sit down into farmland (a sixteenth lower than a full block)
  let tile = BLOCK_FACES[id][0];
  if (self.crop) tile = self.stageTiles[Math.min(meta & 15, self.stageTiles.length - 1)];
  else if ((self.double || self.altTile) && (meta & 1)) tile = self.upperTile;
  const uv = tileUV(tile);
  const sk = R_SKY[ri] * 17, bl = Math.max(R_BL[ri], T_LIGHT[id]) * 17, sh = 235;
  const fire = self.fire;
  const sway = fire ? 0 : SWAY.PLANT;
  if (self.tint) mb.tint = cornerTint(x + 1, z + 1, climateGrass, self.tint === 'foliage');
  const plane = (ax, az, bx, bz, swayTop) => {
    mb.sway = 0;
    const a = mb.vert(x + ax, y, z + az, uv[0], uv[3], sk, bl, sh);
    const b = mb.vert(x + bx, y, z + bz, uv[2], uv[3], sk, bl, sh);
    mb.sway = swayTop ? sway : 0;
    const c = mb.vert(x + bx, y + 1, z + bz, uv[2], uv[1], sk, bl, sh);
    const d = mb.vert(x + ax, y + 1, z + az, uv[0], uv[1], sk, bl, sh);
    mb.quad(a, b, c, d, false);
    mb.quad(b, a, d, c, false);
  };
  if (voxPlant(self)) {
    const th = 1 / 16;
    if (self.crop) {
      // crops: the classic # of four pictures, each a solid slab
      for (const q of [0.25, 0.75]) { voxelPlane(mb, tile, uv, x, y, z, 0.002, q, 0.998, q, 0, 1, th, sk, bl, true); voxelPlane(mb, tile, uv, x, y, z, q, 0.002, q, 0.998, 0, 1, th, sk, bl, true); }
    } else {
      // flowers, saplings, mushrooms, bushes: two slabs crossed, each plant a little off-centre and turned its own way
      const hy = self.double && (meta & 1) ? y - 1 : y, hsh = hash32(x, hy, z, 5), top = !self.double || (meta & 1);
      const jx = ((hsh & 255) / 255 - 0.5) * 0.24, jz = (((hsh >> 8) & 255) / 255 - 0.5) * 0.24, ang = ((hsh >> 16) & 255) / 255 * Math.PI / 2 + Math.PI / 4;
      const cx = 0.5 + jx, cz = 0.5 + jz, r = 0.46, ca = Math.cos(ang) * r, sa = Math.sin(ang) * r;
      voxelPlane(mb, tile, uv, x, y, z, cx - ca, cz - sa, cx + ca, cz + sa, 0, 1, th, sk, bl, top);
      voxelPlane(mb, tile, uv, x, y, z, cx + sa, cz - ca, cx - sa, cz + ca, 0, 1, th, sk, bl, top);
    }
  } else if (self.crop && self.hash && !fire) {
    // crops grow as a clump of separate plants, each its own height and turned its own way
    const hsh = hash32(x, y, z, 11), top = !self.double || (meta & 1);
    const spots = [[0.27, 0.27], [0.73, 0.3], [0.3, 0.73], [0.72, 0.72]];
    for (let k = 0; k < 4; k++) {
      const h = (hsh >>> (k * 7)) & 127, jx = ((h & 15) / 15 - 0.5) * 0.14, jz = (((h >> 4) & 7) / 7 - 0.5) * 0.14, ang = (h / 127) * Math.PI;
      const cx = spots[k][0] + jx, cz = spots[k][1] + jz, r = 0.27, ca = Math.cos(ang) * r, sa = Math.sin(ang) * r;
      plane(cx - ca, cz - sa, cx + ca, cz + sa, top); plane(cx + sa, cz - ca, cx - sa, cz + ca, top);
    }
  } else if (self.hash || fire) {
    // fire (and anything else drawn that way): four planes in a # pattern, like the classic game
    const o = fire ? 0.06 : 0.25, top = !self.double || (meta & 1);
    for (const q of [o, 1 - o]) { plane(0, q, 1, q, top); plane(q, 0, q, 1, top); }
  } else if (!self.tint && !self.double) {
    // flowers, saplings, mushrooms: three planes round the stem, so they have some body from every side
    const hsh = hash32(x, y, z, 5);
    const jx = ((hsh & 255) / 255 - 0.5) * 0.3, jz = (((hsh >> 8) & 255) / 255 - 0.5) * 0.3, ang = ((hsh >> 16) & 255) / 255 * Math.PI;
    const cx = 0.5 + jx, cz = 0.5 + jz, r = 0.46;
    for (let k = 0; k < 3; k++) { const a = ang + k * Math.PI / 3, ca = Math.cos(a) * r, sa = Math.sin(a) * r; plane(cx - ca, cz - sa, cx + ca, cz + sa, true); }
  } else {
    // each plant stands a little off-centre and turned its own way, so a meadow looks grown, not
    // planted in rows (the halves of a two-tall plant share theirs)
    const hy = self.double && (meta & 1) ? y - 1 : y, hsh = hash32(x, hy, z, 5);
    const jx = ((hsh & 255) / 255 - 0.5) * 0.36, jz = (((hsh >> 8) & 255) / 255 - 0.5) * 0.36, ang = ((hsh >> 16) & 255) / 255 * Math.PI / 2 + Math.PI / 4;
    const cx = 0.5 + jx, cz = 0.5 + jz, r = 0.48, ca = Math.cos(ang) * r, sa = Math.sin(ang) * r;
    const top = !self.double || (meta & 1);
    plane(cx - ca, cz - sa, cx + ca, cz + sa, top);
    plane(cx + sa, cz - ca, cx - sa, cz + ca, top);
  }
  mb.sway = 0; mb.tint = TINT_GRASS;
}

function liquidHeight(id, meta, above) {
  if (above === id) return 1;
  if (T_PORTAL[id]) return 1;
  const lvl = meta & 7;
  if (meta & 8) return 0.9;
  return Math.max(0.12, 0.875 - lvl * 0.105);
}
// Height of the liquid in the cell at region index r (-1 if it isn't this liquid).
function liqH(r, id, water) {
  const b = R_BLOCK[r];
  if (water ? !rWater(r) : b !== id) return -1;
  if (!T_LIQUID[b]) return 0.875;                       // a waterlogged block holds a full source
  return liquidHeight(b, R_META[r], 0);
}
// Height of a top corner: the average of the (up to) four cells that share it, the way
// Minecraft smooths water, so neighbouring cells meet with no steps or gaps.
function cornerH(ri, id, water, dx, dz) {
  let tot = 0, wsum = 0;
  for (let k = 0; k < 4; k++) {
    const r = ri + (dx - 1 + (k & 1)) + (dz - 1 + (k >> 1)) * RW;
    const h = liqH(r, id, water);
    if (h >= 0) {
      if (liqH(r + RW2, id, water) >= 0) return 1;
      if (h >= 0.8) { tot += h * 10; wsum += 10; } else { tot += h; wsum += 1; }
    } else if (!T_SOLID[R_BLOCK[r]]) wsum += 1;
  }
  return wsum ? tot / wsum : 0.875;
}
const _CH = [0, 0, 0, 0];
// (0.9.0.15) which way the river runs at a world column, for the chunk being meshed (set by Game.meshInto), and that chunk's corner
let MESH_RIVER = null, MESH_OX = 0, MESH_OZ = 0;
// A still source with still sources all round and open air above them: the top is simply flat
// (most of the sea), so skip the corner smoothing.
const NB8 = [-1, 1, -RW, RW, -RW - 1, -RW + 1, RW - 1, RW + 1];
function flatPool(ri, id, water) {
  for (let i = 0; i < 8; i++) {
    const r = ri + NB8[i], b = R_BLOCK[r];
    if (water ? !rWater(r) : b !== id) return false;
    if (T_LIQUID[b] && (R_META[r] & 15) !== 0) return false;
    if (water ? rWater(r + RW2) : R_BLOCK[r + RW2] === id) return false;
  }
  return true;
}
// (0.9.0.50) how open the water is at a corner of a block's surface: the depth of water under it, averaged over the four
// columns that meet there (so neighbouring blocks agree and the surface has no seams). The sea is deep, a pond shallow.
const ROD_ID = B.lightning_rod ?? -1;
function waterOpen(ri, cx, cz) {
  let tot = 0;
  for (let dz = cz - 1; dz <= cz; dz++) for (let dx = cx - 1; dx <= cx; dx++) {
    let r = ri + dx + dz * RW;
    if (!rWater(r)) continue;
    let d = 1;
    while (d < 12 && r - RW2 >= 0 && rWater(r - RW2)) { d++; r -= RW2; }
    tot += d;
  }
  return Math.min(15, Math.round(tot / 4 * 1.25));
}
function emitLiquid(mb, ri, id, x, y, z, meta, H) {
  const water = T_LIQUID[id] === 1;
  const isPortal = T_PORTAL[id];
  const stillT = BLOCK_FACES[id][0];
  const flowT = water ? (ATLAS.tile.water_flow ?? stillT) : id === B.lava ? (ATLAS.tile.lava_flow ?? stillT) : stillT;
  const above = y + 1 < H ? R_BLOCK[ri + RW2] : 0;
  const full = !!isPortal || (y + 1 < H && (water ? rWater(ri + RW2) : above === id));
  const ch = _CH;   // corner heights, index dx + dz * 2
  if (full) ch[0] = ch[1] = ch[2] = ch[3] = 1;
  else if ((meta & 15) === 0 && flatPool(ri, id, water)) ch[0] = ch[1] = ch[2] = ch[3] = 0.875;
  else for (let k = 0; k < 4; k++) ch[k] = cornerH(ri, id, water, k & 1, k >> 1);
  // which way it runs: from the high corners to the low ones
  const fx = (ch[0] + ch[2]) - (ch[1] + ch[3]), fz = (ch[0] + ch[1]) - (ch[2] + ch[3]);
  let runs = !full && !isPortal && (Math.abs(fx) + Math.abs(fz) > 0.03);
  // (0.9.0.15) a river's still water still runs: its surface ripples downstream, the way the river goes
  let rf = null;
  if (!runs && water && !full && MESH_RIVER && (rf = MESH_RIVER(x + MESH_OX, z + MESH_OZ))) runs = true;
  let cosA = 1, sinA = 0, scl = 1;
  if (runs) {
    const a = Math.round((rf ? Math.atan2(rf[0], rf[1]) : Math.atan2(fx, fz)) / (Math.PI / 4)) * (Math.PI / 4);
    cosA = Math.round(Math.cos(a) * 1e6) / 1e6; sinA = Math.round(Math.sin(a) * 1e6) / 1e6;
    scl = Math.abs(cosA) > 0.01 && Math.abs(sinA) > 0.01 ? 0.7071 : 1;
  }
  if (water) { mb.tint = cornerTint(x + 1, z + 1, climateWater, false); mb.tintAll = 255; }
  for (let f = 0; f < 6; f++) {
    const F = FACES[f], o = FACE_OFFS[f][0][0];
    const nb = R_BLOCK[ri + o];
    if (nb === id && !water) continue;
    if (water && rWater(ri + o)) continue;
    if (T_OPAQUE[nb] && !(f === 2 && !full)) continue;
    if (!isPortal && T_LIQUID[nb] && f !== 2) continue;
    const sk = R_SKY[ri + o], bl = R_BL[ri + o];
    const skv = (T_OPAQUE[nb] ? R_SKY[ri] : sk) * 17, blv = Math.max(T_OPAQUE[nb] ? R_BL[ri] : bl, T_LIGHT[id]) * 17;
    const top = f === 2, side = f !== 2 && f !== 3;
    const tile = isPortal ? stillT : top ? (runs ? flowT : stillT) : side ? flowT : stillT;
    const uv = tileUV(tile), du = uv[2] - uv[0], dv = uv[3] - uv[1];
    const vs = _LVS;
    for (let k = 0; k < 4; k++) {
      const c = F.c[k], t = FACE_UV[k];
      const hc = c[1] ? ch[c[0] + c[2] * 2] : 0;
      mb.sway = water && c[1] && hc < 1 ? 32 + waterOpen(ri, c[0], c[2]) : 0;
      let u, v;
      if (top) {
        // turn the texture so its ripples run downstream
        const ox = c[0] - 0.5, oz = c[2] - 0.5;
        const s = (cosA * ox - sinA * oz) * scl + 0.5, tt = (sinA * ox + cosA * oz) * scl + 0.5;
        u = uv[0] + s * du; v = uv[1] + tt * dv;
      } else if (side) {
        u = t[0] ? uv[2] : uv[0];
        v = c[1] ? uv[1] + (1 - hc) * dv : uv[3];
      } else { u = t[0] ? uv[2] : uv[0]; v = t[1] ? uv[3] : uv[1]; }
      vs[k] = mb.vert(x + c[0], y + hc, z + c[2], u, v, skv, blv, Math.round(F.shade * 255));
    }
    mb.quad(vs[0], vs[1], vs[2], vs[3], false);
    if (top || isPortal) mb.quad(vs[1], vs[0], vs[3], vs[2], false); // visible from below / inside
  }
  mb.sway = 0; mb.tint = TINT_GRASS; mb.tintAll = 0;
}

// Torches: a thin post. meta 0 = standing; 1..4 = on a wall (+x,-x,+z,-z side of
// support), leaning out from the wall at an angle like the classic game.
const TORCH_LEAN = 0.4;
function emitTorch(mb, ri, id, x, y, z, meta) {
  const uv = tileUV(BLOCK_FACES[id][0]);
  const tw = (uv[2] - uv[0]) / 16, th = (uv[3] - uv[1]) / 16;
  const P = 1 / 16, hgt = 10 * P, w = P;
  // wall direction (unit vector pointing from the wall into this cell)
  let wx = 0, wz = 0;
  if (meta === 1) wx = 1; else if (meta === 2) wx = -1; else if (meta === 3) wz = 1; else if (meta === 4) wz = -1;
  let bx = x + 0.5, by = y, bz = z + 0.5;
  if (meta) { bx = x + 0.5 - wx * (0.5 - 1.6 * P); bz = z + 0.5 - wz * (0.5 - 1.6 * P); by = y + 3.5 * P; }
  else if (T_SHAPE[R_BLOCK[ri - RW2]] === SHAPE.SLAB && (R_META[ri - RW2] & 7) === 0) by -= 0.5;
  const ca = Math.cos(meta ? TORCH_LEAN : 0), sa = Math.sin(meta ? TORCH_LEAN : 0);
  // local (u across, v up, n out from wall) -> world
  const V = (lx, ly, lz) => {
    const up = ly * ca - 0 + 0, out = ly * sa;
    return [bx + lx + wx * out, by + up, bz + lz + wz * out];
  };
  const sk = R_SKY[ri] * 17, bl = T_LIGHT[id] * 17;
  const u0 = uv[0] + 7 * tw, u1 = uv[0] + 9 * tw, v0 = uv[1] + 6 * th, v1 = uv[3];
  const corners = [V(-w, 0, -w), V(w, 0, -w), V(w, 0, w), V(-w, 0, w), V(-w, hgt, -w), V(w, hgt, -w), V(w, hgt, w), V(-w, hgt, w)];
  const quad = (a, b, c, d, ua, ub, va, vb, sh) => {
    const A = corners[a], Bc = corners[b], Cc = corners[c], D = corners[d];
    const i0 = mb.vert(A[0], A[1], A[2], ua, vb, sk, bl, sh), i1 = mb.vert(Bc[0], Bc[1], Bc[2], ub, vb, sk, bl, sh);
    const i2 = mb.vert(Cc[0], Cc[1], Cc[2], ub, va, sk, bl, sh), i3 = mb.vert(D[0], D[1], D[2], ua, va, sk, bl, sh);
    mb.quad(i0, i1, i2, i3, false);
  };
  quad(2, 1, 5, 6, u0, u1, v0, v1, 220);   // +x
  quad(0, 3, 7, 4, u0, u1, v0, v1, 220);   // -x
  quad(3, 2, 6, 7, u0, u1, v0, v1, 200);   // +z
  quad(1, 0, 4, 5, u0, u1, v0, v1, 200);   // -z
  quad(7, 6, 5, 4, u0, u1, uv[1] + 6 * th, uv[1] + 8 * th, 255); // top (flame)
  quad(0, 1, 2, 3, u0, u1, uv[3] - 2 * th, uv[3], 160);         // bottom
}

// ---- shaped blocks -----------------------------------------------------------------
// Boxes in pixel units (0..16). Each face samples the part of its tile that the
// box covers, the way block models work in Minecraft. side/end = tile names.
const SHAPES = {
  lantern: [
    { b: [5, 0, 5, 11, 7, 11], side: 'lantern', end: 'lantern_cap' },
    { b: [6, 7, 6, 10, 9, 10], side: 'lantern_cap' },
    { b: [7, 9, 7.5, 9, 11, 8.5], side: 'lantern_cap' },
  ],
  soul_lantern: [
    { b: [5, 0, 5, 11, 7, 11], side: 'soul_lantern', end: 'lantern_cap' },
    { b: [6, 7, 6, 10, 9, 10], side: 'lantern_cap' },
    { b: [7, 9, 7.5, 9, 11, 8.5], side: 'lantern_cap' },
  ],
  campfire: [
    { b: [1, 0, 0, 5, 4, 16], side: 'campfire_log', end: 'campfire_log_end' },
    { b: [11, 0, 0, 15, 4, 16], side: 'campfire_log', end: 'campfire_log_end' },
    { b: [0, 3, 1, 16, 7, 5], side: 'campfire_log', end: 'campfire_log_end' },
    { b: [0, 3, 11, 16, 7, 15], side: 'campfire_log', end: 'campfire_log_end' },
    { b: [5, 0, 3, 11, 1, 13], side: 'campfire_embers' },
  ],
  chain: [{ b: [7, 0, 7, 9, 16, 9], side: 'chain' }],
  flower_pot: [{ b: [5, 0, 5, 11, 6, 11], side: 'flower_pot', end: 'flower_pot_top' }],
  cauldron: [
    { b: [0, 3, 0, 16, 16, 2], side: 'cauldron_side', end: 'cauldron_top' }, { b: [0, 3, 14, 16, 16, 16], side: 'cauldron_side', end: 'cauldron_top' },
    { b: [0, 3, 2, 2, 16, 14], side: 'cauldron_side', end: 'cauldron_top' }, { b: [14, 3, 2, 16, 16, 14], side: 'cauldron_side', end: 'cauldron_top' },
    { b: [2, 3, 2, 14, 4, 14], side: 'cauldron_side', end: 'cauldron_inner' },
    { b: [0, 0, 0, 4, 3, 4], side: 'cauldron_side' }, { b: [12, 0, 0, 16, 3, 4], side: 'cauldron_side' },
    { b: [0, 0, 12, 4, 3, 16], side: 'cauldron_side' }, { b: [12, 0, 12, 16, 3, 16], side: 'cauldron_side' },
  ],
  bell: [
    { b: [0, 0, 6.5, 2, 16, 9.5], side: 'bell_frame' }, { b: [14, 0, 6.5, 16, 16, 9.5], side: 'bell_frame' },
    { b: [2, 13, 7, 14, 15, 9], side: 'bell_frame' },
    { b: [5, 5, 5, 11, 12, 11], side: 'bell', end: 'bell' }, { b: [4, 4, 4, 12, 6, 12], side: 'bell', end: 'bell' }, { b: [7, 12, 7, 9, 13, 9], side: 'bell' },
  ],
};
SHAPES.soul_campfire = SHAPES.campfire;
SHAPES.grave = [
  { b: [3, 0, 2, 13, 2, 14], side: 'grave_dirt', end: 'grave_dirt' },
  { b: [4, 2, 11, 12, 13, 14], side: 'grave_stone', end: 'grave_stone_top', x: 'grave_stone' },
  { b: [5, 13, 11.5, 11, 14, 13.5], side: 'grave_stone', end: 'grave_stone_top' },
];
// a lantern hanging from the ceiling hangs a little lower, on a short chain
// 0.9.0.17: The End
SHAPES.end_portal_frame = [{ b: [0, 0, 0, 16, 13, 16], side: 'end_portal_frame_side', end: 'end_portal_frame_top' }];
SHAPES.end_portal_frame_eye = [{ b: [0, 0, 0, 16, 13, 16], side: 'end_portal_frame_side', end: 'end_portal_frame_top' }, { b: [4, 13, 4, 12, 16, 12], side: 'end_portal_frame_eye', end: 'end_portal_frame_eye' }];
SHAPES.end_portal = [{ b: [0, 11.5, 0, 16, 12, 16], side: 'end_portal', end: 'end_portal', nocol: true }];
SHAPES.end_gateway = [{ b: [1, 1, 1, 15, 15, 15], side: 'end_portal', end: 'end_portal', nocol: true }];
SHAPES.lantern_hang = [
  { b: [5, 1, 5, 11, 8, 11], side: 'lantern', end: 'lantern_cap' },
  { b: [6, 8, 6, 10, 10, 10], side: 'lantern_cap' },
  { b: [7.5, 10, 7, 8.5, 16, 9], side: 'chain' },
];
SHAPES.soul_lantern_hang = [
  { b: [5, 1, 5, 11, 8, 11], side: 'soul_lantern', end: 'lantern_cap' },
  { b: [6, 8, 6, 10, 10, 10], side: 'lantern_cap' },
  { b: [7.5, 10, 7, 8.5, 16, 9], side: 'chain' },
];
SHAPES.bamboo = [{ b: [6.5, 0, 6.5, 9.5, 16, 9.5], side: 'bamboo_stalk', end: 'bamboo_stalk_top' }];
SHAPES.lectern = [
  { b: [0, 0, 0, 16, 2, 16], side: 'lectern_base', end: 'lectern_base' },
  { b: [4, 2, 4, 12, 13, 12], side: 'lectern_side', end: 'lectern_base' },
  { b: [0, 12, 1, 16, 15, 15], side: 'lectern_side', end: 'lectern_top' },
];
for (const k of ['anvil', 'chipped_anvil', 'damaged_anvil']) SHAPES[k] = [
  { b: [2, 0, 2, 14, 4, 14], side: 'anvil', end: 'anvil' },
  { b: [4, 4, 3, 12, 5, 13], side: 'anvil', end: 'anvil' },
  { b: [6, 5, 4, 10, 10, 12], side: 'anvil', end: 'anvil' },
  { b: [3, 10, 0, 13, 16, 16], side: 'anvil', end: k + '_top' },
];
SHAPES.grindstone = [
  { b: [4, 4, 2, 12, 16, 14], side: 'grindstone_round', end: 'grindstone_round', x: 'grindstone_side' },
  { b: [0, 0, 6, 2, 13, 10], side: 'grindstone_leg', end: 'grindstone_leg' }, { b: [14, 0, 6, 16, 13, 10], side: 'grindstone_leg', end: 'grindstone_leg' },
  { b: [2, 7, 6, 4, 13, 10], side: 'grindstone_pivot', end: 'grindstone_pivot' }, { b: [12, 7, 6, 14, 13, 10], side: 'grindstone_pivot', end: 'grindstone_pivot' },
];
// (0.9.0.11) the stonecutter: a bench nine pixels high with the saw blade standing up through it.
// The faces take the same parts of their pictures as the classic model, so resource packs line up.
SHAPES.stonecutter = [
  { b: [0, 0, 0, 16, 9, 16], side: 'stonecutter_side', end: 'stonecutter_top' },
  { b: [1, 9, 7.95, 15, 16, 8.05], side: 'stonecutter_saw', tv: 9, nocol: true },
];
SHAPES.decorated_pot = [
  { b: [2, 0, 2, 14, 13, 14], side: 'decorated_pot_side', end: 'decorated_pot_top' },
  { b: [4, 13, 4, 12, 16, 12], side: 'decorated_pot_neck', end: 'decorated_pot_top' },
];
SHAPES.loose_stones = [
  { b: [2, 0, 3, 6, 2, 6], side: 'pebble', end: 'pebble' }, { b: [8, 0, 2, 12, 3, 6], side: 'pebble', end: 'pebble' },
  { b: [5, 0, 9, 9, 2, 12], side: 'pebble', end: 'pebble' }, { b: [11, 0, 10, 14, 1.5, 13], side: 'pebble', end: 'pebble' },
];
// Hanging variants sit higher so the handle meets the ceiling.
function shapeOffsetY(id, meta) { return 0; }
function hangingLantern(id, meta) { const sh = BLOCKS[id].shape; return (sh === 'lantern' || sh === 'soul_lantern') && (meta & 0x7f) === 1; }
// (0.9.0.22) written into one scratch pair (read straight away) rather than a new array per corner
const _ST = [0, 0];
const SHAPE_ST = [
  (X, Y, Z) => (_ST[0] = 16 - Z, _ST[1] = 16 - Y, _ST), (X, Y, Z) => (_ST[0] = Z, _ST[1] = 16 - Y, _ST), (X, Y, Z) => (_ST[0] = X, _ST[1] = Z, _ST),
  (X, Y, Z) => (_ST[0] = 16 - X, _ST[1] = Z, _ST), (X, Y, Z) => (_ST[0] = X, _ST[1] = 16 - Y, _ST), (X, Y, Z) => (_ST[0] = 16 - X, _ST[1] = 16 - Y, _ST),
];
const _LVS = [0, 0, 0, 0], _SVS = [0, 0, 0, 0], _BVS = [0, 0, 0, 0], _PVV = [0, 0, 0];
// Adds one box. (ox,oy,oz) = where pixel (0,0,0) lands; unit = size of a pixel.
function addShapeBox(mb, box, ox, oy, oz, unit, sk, bl, lift = 0, rot = 0) {
  const b = box.b;
  const side = ATLAS.tile[box.side] ?? 0, end = box.end ? (ATLAS.tile[box.end] ?? side) : side;
  // box.x: a different picture on the faces across the model's x axis (turned with the model)
  const xt = box.x ? (ATLAS.tile[box.x] ?? side) : side, xf = rot & 1 ? 4 : 0;
  for (let f = 0; f < 6; f++) {
    const F = FACES[f];
    const uv = tileUV(f === 2 || f === 3 ? end : (f === xf || f === xf + 1) ? xt : side);
    const du = (uv[2] - uv[0]) / 16, dv = (uv[3] - uv[1]) / 16;
    const vs = _SVS;
    for (let k = 0; k < 4; k++) {
      const c = F.c[k];
      const X = c[0] ? b[3] : b[0], Y = c[1] ? b[4] : b[1], Z = c[2] ? b[5] : b[2];
      const st = SHAPE_ST[f](X, Y, Z), S = st[0], T0 = st[1], T = box.tv && f !== 2 && f !== 3 ? T0 + box.tv : T0;   // tv: shift down the picture (the saw's rows)
      vs[k] = (mb.vert(ox + X * unit, oy + (Y + lift) * unit, oz + Z * unit, uv[0] + S * du, uv[1] + T * dv, sk, bl, Math.round(Math.min(1, F.shade + 0.06) * 255)));
    }
    mb.quad(vs[0], vs[1], vs[2], vs[3], false);
  }
}
function emitShape(mb, ri, id, x, y, z, meta) {
  const def = BLOCKS[id];
  const hang = hangingLantern(id, meta);
  // a campfire that has gone out shows its ash (game/camping.js); the rest by how they hang
  const out = (def.shape === 'campfire' || def.shape === 'soul_campfire') && (meta & 8);
  const boxes = SHAPES[hang ? def.shape + '_hang' : out ? 'campfire_out' : def.shape] || SHAPES[def.shape];
  if (!boxes) return;
  const v0 = mb.vcount;
  const sk = R_SKY[ri] * 17, bl = Math.max(R_BL[ri], T_LIGHT[id]) * 17;
  let lift = shapeOffsetY(id, meta);
  if (T_SINK[id] && T_SHAPE[R_BLOCK[ri - RW2]] === SHAPE.SLAB && (R_META[ri - RW2] & 7) === 0) lift -= 8;
  const rf = def.facingModel ? meta & 3 : 0;
  for (const box of boxes) addShapeBox(mb, rf ? Object.assign({}, box, { b: rotBox(box.b, rf) }) : box, x, y, z, 1 / 16, sk, bl, lift, rf);
  // a hanging lantern swings gently in the wind: the further below the hook, the more it moves
  if (hang) for (let v = v0; v < mb.vcount; v++) {
    const below = clamp(y + 1 - mb.f[v * 7 + 1], 0, 1);
    mb.u8[v * VSTRIDE + 23] = SWAY.HANG + Math.round(below * 11);
  }
  // campfire flames
  if ((def.shape === 'campfire' || def.shape === 'soul_campfire') && !out) emitPlanes(mb, ATLAS.tile[def.shape === 'campfire' ? 'campfire_fire' : 'soul_campfire_fire'], x, y + lift / 16, z, 0.08, 1, 255, 255);
  // water in a cauldron
  if (def.cauldron && (meta & 3)) {
    mb.tint = cornerTint(x + 1, z + 1, climateWater, false); mb.tintAll = 255; mb.sway = 0;
    addShapeBox(mb, { b: [2, 4, 2, 14, 4 + (meta & 3) * 3.6, 14], side: 'water', end: 'water' }, x, y, z, 1 / 16, sk, bl, 0);
    mb.tint = TINT_GRASS; mb.tintAll = 0;
  }
  // a plant in a flower pot
  if (def.pot && MESH_CH) {
    const e = MESH_CH.blockEntities.get(cidx(x, y, z));
    const pid = e && e.plant ? B[e.plant] : 0;
    if (pid) emitPlanes(mb, BLOCK_FACES[pid][0], x, y + (lift + 4) / 16, z, 0.25, 0.75, sk, bl, true);
  }
}
let MESH_CH = null;
// Two crossed planes (fire, potted plants). inset trims the sides; scale shrinks the height.
function emitPlanes(mb, tile, x, y, z, inset, scale, sk, bl, cross) {
  const uv = tileUV(tile), h = scale;
  const a0 = inset, a1 = 1 - inset;
  const pl = (ax, az, bx, bz) => {
    const a = mb.vert(x + ax, y, z + az, uv[0], uv[3], sk, bl, 255), b = mb.vert(x + bx, y, z + bz, uv[2], uv[3], sk, bl, 255);
    const c = mb.vert(x + bx, y + h, z + bz, uv[2], uv[1], sk, bl, 255), d = mb.vert(x + ax, y + h, z + az, uv[0], uv[1], sk, bl, 255);
    mb.quad(a, b, c, d, false); mb.quad(b, a, d, c, false);
  };
  if (cross) { pl(a0, a0, a1, a1); pl(a0, a1, a1, a0); }
  else { pl(0, a0, 1, a0); pl(0, a1, 1, a1); pl(a0, 0, a0, 1); pl(a1, 0, a1, 1); }
}

// ---- shaped blocks: slabs, stairs, fences, panes, walls, doors... ----------------------
let SH_RI = 0;
const rNb = (dx, dy, dz) => { const i = SH_RI + dx + dz * RW + dy * RW2; return i < 0 || i >= RW2 * MESH_H ? 0 : R_BLOCK[i]; };
const rNm = (dx, dy, dz) => { const i = SH_RI + dx + dz * RW + dy * RW2; return i < 0 || i >= RW2 * MESH_H ? 0 : R_META[i]; };
const _SL = [0, 0, 0, 0], _BL = [0, 0, 0, 0], _AO = [0, 0, 0, 0];
const FACE_AXIS = [0, 0, 1, 1, 2, 2];
// Smooth light + AO at the four corners of a full face (same rules as cubes).
function faceCorners(ri, f) {
  const offs = FACE_OFFS[f];
  for (let k = 0; k < 4; k++) {
    const o = offs[k];
    const s1 = T_OPAQUE[R_BLOCK[ri + o[1]]], s2 = T_OPAQUE[R_BLOCK[ri + o[2]]], cc = T_OPAQUE[R_BLOCK[ri + o[3]]];
    const a = (s1 && s2) ? 0 : 3 - (s1 + s2 + cc);
    let sk = R_SKY[ri + o[0]], bl = R_BL[ri + o[0]], n = 1;
    if (!s1) { sk += R_SKY[ri + o[1]]; bl += R_BL[ri + o[1]]; n++; }
    if (!s2) { sk += R_SKY[ri + o[2]]; bl += R_BL[ri + o[2]]; n++; }
    if (!cc && !(s1 && s2)) { sk += R_SKY[ri + o[3]]; bl += R_BL[ri + o[3]]; n++; }
    _SL[k] = sk / n; _BL[k] = bl / n; _AO[k] = AO_CURVE[a];
  }
}
function emitShapeBlock(mb, ri, id, x, y, z, meta) {
  SH_RI = ri;
  const self = BLOCKS[id];
  const kind = T_SHAPE[id];
  if (kind === SHAPE.WIRE) { emitWire(mb, ri, id, x, y, z, meta); return; }
  if (kind === SHAPE.RAIL) { emitRail(mb, ri, id, x, y, z, meta); return; }
  let boxes = shapeBoxes(id, meta, rNb, rNm, 0);
  if (!boxes) return;
  const faces = BLOCK_FACES[id];
  let side = faces[0], top = faces[2], bot = faces[3];
  if (self.door && (meta & 16)) { side = top = bot = self.upperTile; }
  if (self.door) { top = bot = side; }
  const sink = sinkOffset(id, rNb, rNm);
  const shape = T_SHAPE[id];
  const L0 = T_LMETA[id] ? metaLight(id, meta) : T_LIGHT[id];
  const own = [R_SKY[ri], Math.max(R_BL[ri], L0), L0];
  if (self.tint) mb.tint = cornerTint(x + 1, z + 1, climateGrass, self.tint === 'foliage');
  for (const b of boxes) {
    const st = b[6] !== undefined ? ATLAS.tile[b[6]] ?? side : side;
    const et = b[7] !== undefined ? ATLAS.tile[b[7]] ?? top : null;
    const ft = b.faces ? b.faces.map(n => ATLAS.tile[n] ?? side) : null;
    // lit redstone torches on repeaters and comparators glow a little
    const glow = b[6] === 'rs_post_on' ? [own[0], Math.max(own[1], 9), 9] : own;
    emitBox(mb, ri, id, meta, x, y, z, b, st, et ?? top, et ?? bot, sink, shape, glow, ft);
  }
  mb.tint = TINT_GRASS;
  if (kind === SHAPE.LEVER) emitLeverHandle(mb, x, y, z, meta, own);
  // lit candles: a little flame on every wick
  if (self.candle && (meta & 4)) {
    const ft = ATLAS.tile.candle_flame;
    for (const b of boxes) emitFlame(mb, ft, x + (b[0] + b[3]) / 32, y + (b[4] + sink) / 16, z + (b[2] + b[5]) / 32, 0.11, 0.2, own[0] * 17, 255);
  }
}
// A small two-plane flame (candles), centred on (cx, cz) and standing on cy.
function emitFlame(mb, tile, cx, cy, cz, w, h, sk, bl) {
  const uv = tileUV(tile);
  const pl = (ax, az, bx, bz) => {
    const a = mb.vert(cx + ax, cy, cz + az, uv[0], uv[3], sk, bl, 255), b = mb.vert(cx + bx, cy, cz + bz, uv[2], uv[3], sk, bl, 255);
    const c = mb.vert(cx + bx, cy + h, cz + bz, uv[2], uv[1], sk, bl, 255), d = mb.vert(cx + ax, cy + h, cz + az, uv[0], uv[1], sk, bl, 255);
    mb.quad(a, b, c, d, false); mb.quad(b, a, d, c, false);
  };
  pl(-w / 2, 0, w / 2, 0); pl(0, -w / 2, 0, w / 2);
}
function emitBox(mb, ri, id, meta, x, y, z, b, sideT, topT, botT, sink, shape, own, faceT) {
  const P = 1 / 16;
  for (let f = 0; f < 6; f++) {
    if (b.only && b.only.indexOf(f) < 0) continue;
    const F = FACES[f];
    const onB = f === 0 ? b[3] >= 16 : f === 1 ? b[0] <= 0 : f === 2 ? b[4] + sink >= 16 : f === 3 ? b[1] + sink <= 0 : f === 4 ? b[5] >= 16 : b[2] <= 0;
    let smooth = false;
    if (onB) {
      const ni = ri + FACE_OFFS[f][0][0], nb = R_BLOCK[ni];
      if (T_OPAQUE[nb]) continue;
      // joined panes, walls and fences, and matching slabs, hide the faces they share
      if (nb === id && f !== 2 && f !== 3 && (shape === SHAPE.PANE || shape === SHAPE.WALL || shape === SHAPE.FENCE || (shape === SHAPE.SLAB && (R_META[ni] & 0x7f) === (meta & 0x7f)))) continue;
      faceCorners(ri, f); smooth = true;
    }
    const tile = faceT ? faceT[f] : f === 2 ? topT : f === 3 ? botT : sideT;
    const uv = tileUV(tile), du = (uv[2] - uv[0]) / 16, dv = (uv[3] - uv[1]) / 16;
    const ax = FACE_AXIS[f], A = ax === 0 ? 1 : 0, Bx = ax === 2 ? 1 : 2;
    const vs = _BVS;
    for (let k = 0; k < 4; k++) {
      const c = F.c[k];
      const X = c[0] ? b[3] : b[0], Y = c[1] ? b[4] : b[1], Z = c[2] ? b[5] : b[2];
      const st = SHAPE_ST[f](X, Y, Z), S = st[0], T = st[1];
      let sk, bl, ao = 1;
      if (smooth) {
        const pv = _PVV; pv[0] = X / 16; pv[1] = (Y + sink) / 16; pv[2] = Z / 16; const pa = clamp(pv[A], 0, 1), pb = clamp(pv[Bx], 0, 1);
        sk = 0; bl = 0; ao = 0;
        for (let q = 0; q < 4; q++) {
          const cq = F.c[q];
          const wgt = (cq[A] ? pa : 1 - pa) * (cq[Bx] ? pb : 1 - pb);
          sk += _SL[q] * wgt; bl += _BL[q] * wgt; ao += _AO[q] * wgt;
        }
        bl = Math.max(bl, own[2]);
      } else { sk = own[0]; bl = own[1]; }
      vs[k] = (mb.vert(x + X * P, y + (Y + sink) * P, z + Z * P, uv[0] + clamp(S, 0, 16) * du, uv[1] + clamp(T, 0, 16) * dv,
        Math.round(sk * 17), Math.round(bl * 17), Math.round(Math.min(1, F.shade * ao) * 255)));
    }
    mb.quad(vs[0], vs[1], vs[2], vs[3], false);
  }
}

// ---- redstone dust ------------------------------------------------------------------------
// Flat lines along the ground toward whatever the dust joins, climbing the sides of blocks
// where it runs up a step. Brighter red the stronger the signal.
const _WC = [0, 0, 0, 0];
function dustColor(power) {
  const f = power / 15;
  const r = f * 0.6 + (f > 0 ? 0.4 : 0.3), g = clamp(f * f * 0.7 - 0.5, 0, 1), b = clamp(f * f * 0.6 - 0.7, 0, 1);
  return [Math.round(r * 204), Math.round(g * 204), Math.round(b * 204)];
}
// One quad. pts: 4 [x,y,z]; st: 4 [s,t] tile fractions.
function quadST(mb, pts, st, tile, sk, bl, sh, twoSided) {
  const uv = tileUV(tile), du = uv[2] - uv[0], dv = uv[3] - uv[1];
  const vs = pts.map((p, k) => mb.vert(p[0], p[1], p[2], uv[0] + st[k][0] * du, uv[1] + st[k][1] * dv, sk, bl, sh));
  mb.quad(vs[0], vs[1], vs[2], vs[3], false);
  if (twoSided) mb.quad(vs[1], vs[0], vs[3], vs[2], false);
}
// A flat piece over part of the cell (xf/zf ranges); map(xf, zf) -> [s, t].
function flatPiece(mb, x, y, z, x0, z0, x1, z1, map, tile, sk, bl, hgt) {
  const c = [[x0, z1], [x1, z1], [x1, z0], [x0, z0]];  // same winding as a top face
  quadST(mb, c.map(([a, b]) => [x + a, hgt ? hgt(a, b) : y, z + b]), c.map(([a, b]) => map(a, b)), tile, sk, bl, 255, false);
}
function emitWire(mb, ri, id, x, y, z, meta) {
  const c = wireConnects(rNb, rNm, _WC);
  const arms = [c[0] > 0, c[1] > 0, c[2] > 0, c[3] > 0];
  const n = arms.filter(Boolean).length;
  if (n === 0) arms.fill(true);
  else if (n === 1) for (let h = 0; h < 4; h++) if (c[h]) arms[(h + 2) & 3] = true;
  const power = meta & 15;
  mb.tint = dustColor(power); mb.tintAll = 255; mb.sway = 0;
  const sk = R_SKY[ri] * 17, bl = Math.max(R_BL[ri], power ? (power >> 1) + 1 : 0) * 17;
  const Y = y + 0.016 + sinkOffset(id, rNb, rNm) / 16, line = ATLAS.tile.redstone_dust_line, dot = ATLAS.tile.redstone_dust_dot;
  const ns = (a, b) => [a, b], ew = (a, b) => [b, a];
  const straight = (arms[0] && arms[2] && !arms[1] && !arms[3]) || (arms[1] && arms[3] && !arms[0] && !arms[2]);
  if (!straight) flatPiece(mb, x, Y, z, 0, 0, 1, 1, ns, dot, sk, bl);
  if (arms[0]) flatPiece(mb, x, Y, z, 0, 0, 1, 0.5, ns, line, sk, bl);
  if (arms[2]) flatPiece(mb, x, Y, z, 0, 0.5, 1, 1, ns, line, sk, bl);
  if (arms[1]) flatPiece(mb, x, Y, z, 0.5, 0, 1, 1, ew, line, sk, bl);
  if (arms[3]) flatPiece(mb, x, Y, z, 0, 0, 0.5, 1, ew, line, sk, bl);
  // up the side of the next block
  for (let h = 0; h < 4; h++) {
    if (c[h] !== 2) continue;
    const e = 0.016;
    let pts;
    if (h === 0) pts = [[x, y, z + e], [x + 1, y, z + e], [x + 1, y + 1, z + e], [x, y + 1, z + e]];
    else if (h === 2) pts = [[x + 1, y, z + 1 - e], [x, y, z + 1 - e], [x, y + 1, z + 1 - e], [x + 1, y + 1, z + 1 - e]];
    else if (h === 1) pts = [[x + 1 - e, y, z], [x + 1 - e, y, z + 1], [x + 1 - e, y + 1, z + 1], [x + 1 - e, y + 1, z]];
    else pts = [[x + e, y, z + 1], [x + e, y, z], [x + e, y + 1, z], [x + e, y + 1, z + 1]];
    quadST(mb, pts, [[0, 1], [1, 1], [1, 0], [0, 0]].map(([a, b]) => [b, a]), line, sk, bl, 220, true);
  }
  mb.tint = TINT_GRASS; mb.tintAll = 0;
}

// ---- rails ------------------------------------------------------------------------------------
function emitRail(mb, ri, id, x, y, z, meta) {
  const d = BLOCKS[id], sh = railShape(id, meta), on = d.rail !== 'normal' && (meta & 8);
  const curve = sh >= 6;
  const tile = ATLAS.tile[curve ? 'rail_corner' : d.key + (on ? '_on' : '')] ?? BLOCK_FACES[id][0];
  const map = curve ? [(a, b) => [a, b], (a, b) => [1 - a, b], (a, b) => [1 - a, 1 - b], (a, b) => [a, 1 - b]][sh - 6]
    : (sh === 1 || sh === 2 || sh === 3) ? (a, b) => [b, 1 - a] : (a, b) => [a, b];
  const lift = 1 / 16 + sinkOffset(id, rNb, rNm) / 16;
  const hgt = (a, b) => y + lift + (sh === 2 ? a : sh === 3 ? 1 - a : sh === 4 ? 1 - b : sh === 5 ? b : 0);
  const sk = R_SKY[ri] * 17, bl = Math.max(R_BL[ri], on && d.rail === 'powered' ? 4 : 0) * 17;
  flatPiece(mb, x, y, z, 0, 0, 1, 1, map, tile, sk, bl, hgt);
  if (sh >= 2 && sh <= 5) flatPiece(mb, x, y, z, 0, 0, 1, 1, map, tile, sk, bl, (a, b) => hgt(a, b) - 0.02);
}

// ---- lever handles: a stick tilted one way when off, the other way when on --------------------
function emitOBB(mb, c, ax, ay, az, hx, hy, hz, tile, sk, bl) {
  const P = (sx, sy, sz) => [c[0] + ax[0] * hx * sx + ay[0] * hy * sy + az[0] * hz * sz, c[1] + ax[1] * hx * sx + ay[1] * hy * sy + az[1] * hz * sz, c[2] + ax[2] * hx * sx + ay[2] * hy * sy + az[2] * hz * sz];
  const st = [[0.4, 1], [0.6, 1], [0.6, 0], [0.4, 0]];
  const cap = [[0.4, 0], [0.6, 0], [0.6, 0.12], [0.4, 0.12]];
  quadST(mb, [P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1)], st, tile, sk, bl, 210, true);
  quadST(mb, [P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1)], st, tile, sk, bl, 210, true);
  quadST(mb, [P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)], st, tile, sk, bl, 180, true);
  quadST(mb, [P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1)], st, tile, sk, bl, 180, true);
  quadST(mb, [P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1)], cap, tile, sk, bl, 255, true);
}
function emitLeverHandle(mb, x, y, z, meta, own) {
  const a = 0.7 * (meta & 8 ? 1 : -1);
  const dir = [0, Math.cos(a), Math.sin(a)];
  const base = [8, 1.5, 8], len = 10;
  const ctr = attachPoint([base[0] + dir[0] * len / 2, base[1] + dir[1] * len / 2, base[2] + dir[2] * len / 2], meta);
  const ay = attachPoint(dir, meta, true), ax = attachPoint([1, 0, 0], meta, true);
  const az = [ax[1] * ay[2] - ax[2] * ay[1], ax[2] * ay[0] - ax[0] * ay[2], ax[0] * ay[1] - ax[1] * ay[0]];
  emitOBB(mb, [x + ctr[0] / 16, y + ctr[1] / 16, z + ctr[2] / 16], ax, ay, az, 1 / 16, len / 32, 1 / 16, ATLAS.tile.lever_handle ?? 0, own[0] * 17, own[1] * 17);
}
