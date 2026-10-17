// ---------------------------------------------------------------------------
// world/chunk.js — one 16 x 128 x 16 column of blocks, plus its save codec.
// ---------------------------------------------------------------------------

const CS = 16, CH = 128, SEA = 48;
const CVOL = CS * CS * CH;
const cidx = (x, y, z) => (y << 8) | (z << 4) | x;

class Chunk {
  constructor(dim, cx, cz) {
    this.dim = dim; this.cx = cx; this.cz = cz;
    this.key = chunkKey(dim, cx, cz);
    this.blocks = new Uint16Array(CVOL);  // block ids (16-bit: thousands of kinds)
    this.meta = new Uint8Array(CVOL);    // fluid level, facing, growth stage
    this.light = new Uint8Array(CVOL);   // (sky << 4) | block, filled by the mesher
    this.lightReady = false;
    this.blockEntities = new Map();      // local idx -> {type, items:[...]} (chests, furnaces, piles)
    this.climate = null;                 // Uint8Array(512): temp, humidity per column (for colour tints)
    this.maxY = 0;                       // highest non-air y (+1), for fast loops
    this.modified = false;               // has player changes -> must be saved
    this.dirty = false;                  // has unsaved changes
    this.savedAt = 0;
    this.mesh = null;                    // GPU buffers (renderer owns)
    this.needsMesh = true;
    this.meshVersion = 0;
    this.neighborsAtMesh = 0;
  }
  get(x, y, z) { return (y < 0 || y >= CH) ? 0 : this.blocks[cidx(x, y, z)]; }
  set(x, y, z, id, meta = 0) {
    const i = cidx(x, y, z);
    this.blocks[i] = id; this.meta[i] = meta;
    if (id && y + 1 > this.maxY) this.maxY = y + 1;
  }
  recomputeMaxY() {
    let m = 0;
    for (let y = CH - 1; y >= 0 && !m; y--) { const base = y << 8; for (let i = 0; i < 256; i++) if (this.blocks[base + i]) { m = y + 1; break; } }
    this.maxY = m;
  }
}

function chunkKey(dim, cx, cz) { return dim + '~' + cx + '~' + cz; }

// ---- Save codec --------------------------------------------------------------
// Format v1: { v:1, k, palette:[blockKey...], b: base64(RLE of palette idx, y-fastest),
//              m: base64(RLE of meta, y-fastest), be: {"x,y,z": {...}}, t: savedAt }
// Format v2: same, plus w:1 when the palette has more than 255 entries
//            (palette indices then take two bytes each).
// RLE stream: varint(runLength) then value byte(s), repeated.
const CHUNK_FORMAT = 2;

function rleEncode(src, order, wide) {
  const out = []; let prev = -1, run = 0;
  const pushVar = (n) => { while (n >= 128) { out.push((n & 127) | 128); n >>>= 7; } out.push(n); };
  const pushVal = (v) => { if (wide) { out.push(v & 255, v >> 8); } else out.push(v); };
  for (let k = 0; k < order.length; k++) {
    const v = src[order[k]];
    if (v === prev) run++;
    else { if (run) { pushVar(run); pushVal(prev); } prev = v; run = 1; }
  }
  if (run) { pushVar(run); pushVal(prev); }
  return Uint8Array.from(out);
}
function rleDecode(bytes, dst, order, wide) {
  let p = 0, k = 0;
  while (p < bytes.length && k < order.length) {
    let n = 0, shift = 0, b;
    do { b = bytes[p++]; n |= (b & 127) << shift; shift += 7; } while (b & 128);
    let v = bytes[p++];
    if (wide) v |= bytes[p++] << 8;
    for (let i = 0; i < n && k < order.length; i++) dst[order[k++]] = v;
  }
}
// y-fastest traversal order compresses vertical runs (stone, air) well.
const YFAST_ORDER = (() => {
  const o = new Uint32Array(CVOL); let k = 0;
  for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) for (let y = 0; y < CH; y++) o[k++] = cidx(x, y, z);
  return o;
})();

function encodeChunk(ch) {
  const palette = [], map = new Map();
  const pal = new Uint16Array(CVOL);
  for (let i = 0; i < CVOL; i++) {
    const id = ch.blocks[i];
    let p = map.get(id);
    if (p === undefined) { p = palette.length; map.set(id, p); palette.push(BLOCKS[id].key); }
    pal[i] = p;
  }
  const be = {};
  for (const [i, ent] of ch.blockEntities) {
    const x = i & 15, z = (i >> 4) & 15, y = i >> 8;
    be[x + ',' + y + ',' + z] = ent;
  }
  const wide = palette.length > 255;
  // NB: 'w' is the world id in the IndexedDB key path, so the wide flag is 'wd'.
  const rec = {
    v: CHUNK_FORMAT, k: ch.key, palette,
    b: bytesToBase64(rleEncode(pal, YFAST_ORDER, wide)),
    m: bytesToBase64(rleEncode(ch.meta, YFAST_ORDER)),
    be, t: ch.savedAt || Date.now(),
  };
  if (wide) rec.wd = 1;
  return rec;
}

function decodeChunkInto(ch, rec) {
  rec = migrateChunkRecord(rec);
  const pal = new Uint16Array(CVOL);
  rleDecode(base64ToBytes(rec.b), pal, YFAST_ORDER, !!rec.wd);
  const ids = rec.palette.map(blockKeyToId);
  for (let i = 0; i < CVOL; i++) ch.blocks[i] = ids[pal[i]] || 0;
  if (rec.m) rleDecode(base64ToBytes(rec.m), ch.meta, YFAST_ORDER);
  ch.blockEntities.clear();
  if (rec.be) for (const [pos, ent] of Object.entries(rec.be)) {
    const [x, y, z] = pos.split(',').map(Number);
    ch.blockEntities.set(cidx(x, y, z), ent);
  }
  ch.modified = true;
  ch.savedAt = rec.t || 0;
  ch.recomputeMaxY();
}

// Chunk record migrations: add `if (rec.v < N) { ...; rec.v = N; }` steps here
// whenever CHUNK_FORMAT is bumped. Old saves are upgraded on load, never dropped.
function migrateChunkRecord(rec) {
  if (!rec.v) rec.v = 1;
  if (rec.v < 2) rec.v = 2; // v1 records are valid v2 records with narrow palettes
  return rec;
}
