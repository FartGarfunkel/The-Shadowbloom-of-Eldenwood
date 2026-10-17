const load = require('./node_harness');
const ctx = load(`
globalThis.T = {};
const w = new World(0, 12345, new Map());
let t0 = performance.now();
for (let cz = -4; cz <= 4; cz++) for (let cx = -4; cx <= 4; cx++) w.ensureChunk(cx, cz);
T.gen = (performance.now() - t0) / 81;
t0 = performance.now();
let n = 0, tris = 0;
for (const c of w.chunks.values()) { if (Math.abs(c.cx) <= 3 && Math.abs(c.cz) <= 3) { const m = meshChunk(c, (x,z)=>w.chunkAt(x,z), {fancyLeaves:true}); n++; tris += (m.opaque ? m.opaque.count/3 : 0); } }
T.mesh = (performance.now() - t0) / n; T.tris = tris / n;
// biome census over a wide area
const counts = {};
for (let z = -3000; z < 3000; z += 50) for (let x = -3000; x < 3000; x += 50) { const b = BIOME_NAME[w.gen.column(x,z).biome]; counts[b] = (counts[b]||0)+1; }
T.biomes = counts;
// block census of chunk 0,0
const c0 = w.chunkAt(0,0); const bc = {};
for (const c of w.chunks.values()) for (let i=0;i<c.blocks.length;i++){ const k=BLOCKS[c.blocks[i]].key; bc[k]=(bc[k]||0)+1; }
T.blocks = bc;
// save codec round trip
const rec = encodeChunk(c0);
const c1 = new Chunk(0,0,0); decodeChunkInto(c1, rec);
let same = true; for (let i=0;i<c0.blocks.length;i++) if (c0.blocks[i]!==c1.blocks[i]) { same=false; break; }
T.codec = { same, bytes: JSON.stringify(rec).length };
T.light = c0.light.slice(cidx(8, c0.maxY+1, 8), cidx(8, c0.maxY+1, 8)+1)[0];
`);
console.log(JSON.stringify(ctx.T, null, 1));
