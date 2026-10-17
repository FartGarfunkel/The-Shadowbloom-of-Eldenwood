// ---------------------------------------------------------------------------
// game/maps.js — 0.8.6.2: paper maps.
//
// Eight paper round a compass make an empty map. Use it and it becomes a map
// of the 128 x 128 blocks where you stand, lined up on a grid so the maps
// either side of it fit edge to edge. It starts blank and fills in as you
// walk about holding it (in either hand): the ground, water by its depth,
// shaded by the lie of the land, in the colours of whatever texture pack is
// on. Look down and it comes up into view, with an arrow for you, the other
// players, your home, your grave and any pins you've set.
//
// Right-click (or M) looks at it closely: every map of the same place and
// scale laid out together, to scroll and zoom about and pin. At a map table
// (or any crafting table) a map ringed with 8 paper zooms out to twice the
// area (up to 1:16), and a map with empty maps makes copies that stay the
// same map. In an item frame a map fills the whole frame, so a wall of them
// joins up into one big picture.
//
// Maps are saved with the world as records of their own ('map~id'), and over
// LAN the host keeps them: guests ask for the ones they hold or see and send
// back what they explore.
// ---------------------------------------------------------------------------

const MAP_N = 128, MAP_PIX = MAP_N * MAP_N, MAP_MAX_SCALE = 4, MAP_R = 64;
const MAP_CEILING = { 1: true, 3: true };            // under a roof: map the floor around you, not the roof
const MAP_SHADE = [180 / 255, 220 / 255, 1, 135 / 255];
const MAP_ORDER = (() => { const o = new Uint32Array(MAP_PIX); for (let i = 0; i < MAP_PIX; i++) o[i] = i; return o; })();
const MAP_PIN_COLS = ['#e8484d', '#3a8ae8', '#4ac04a', '#e8b83a', '#b85ae8', '#f4f0e8'];
const MAPS = { all: new Map(), dirty: new Set(), none: new Set(), asked: new Map(), colors: [], colorsFor: null, skip: null, res: null, g: null, netOn: false };

function mapAlign(v, scale) { const size = MAP_N << scale; return Math.floor((v + 64) / size) * size - 64; }
function newMapId() { return Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 6); }
function isMapStack(s) { return !!(s && s.id === 'filled_map'); }

class PaperMap {
  constructor(id, dim, x0, z0, scale) {
    this.id = id; this.dim = dim; this.x0 = x0; this.z0 = z0; this.scale = scale;
    this.ids = new Uint16Array(MAP_PIX);   // the block seen from above
    this.h = new Uint8Array(MAP_PIX);      // its height + 1 (0: not explored yet)
    this.cl = new Uint8Array(MAP_PIX);     // climate (temperature << 4 | humidity), or water depth for water
    this.ver = 1; this.painted = 0; this.paintedAt = 0; this.cv = null; this.tex = null; this.texVer = 0; this.net = null;
  }
  get span() { return MAP_N << this.scale; }
  has(x, z) { return x >= this.x0 && z >= this.z0 && x < this.x0 + this.span && z < this.z0 + this.span; }
  setPixel(i, id, h, cl, fromNet) {
    if (this.ids[i] === id && this.h[i] === h && this.cl[i] === cl) return false;
    this.ids[i] = id; this.h[i] = h; this.cl[i] = cl; this.ver++;
    MAPS.dirty.add(this.id);
    if (!fromNet && MAPS.netOn) (this.net || (this.net = new Set())).add(i);
    return true;
  }
  explored() { let n = 0; for (let i = 0; i < MAP_PIX; i++) if (this.h[i]) n++; return n / MAP_PIX; }
}

// ---- saving: a record of its own, beside the chunks -----------------------------------------------
function encodeMap(m) {
  const pal = ['air'], at = new Map([[0, 0]]), pi = new Uint16Array(MAP_PIX);
  for (let i = 0; i < MAP_PIX; i++) {
    const id = m.ids[i];
    let k = at.get(id);
    if (k === undefined) { k = pal.length; at.set(id, k); pal.push(BLOCKS[id] ? BLOCKS[id].key : 'air'); }
    pi[i] = k;
  }
  const wide = pal.length > 255;
  const rec = { v: 2, k: 'map~' + m.id, t: Date.now(), map: 1, dim: m.dim, x0: m.x0, z0: m.z0, sc: m.scale, pal,
    ids: bytesToBase64(rleEncode(pi, MAP_ORDER, wide)), hs: bytesToBase64(rleEncode(m.h, MAP_ORDER)), cl: bytesToBase64(rleEncode(m.cl, MAP_ORDER)) };
  if (wide) rec.wd = 1;
  return rec;
}
function decodeMap(rec) {
  const m = new PaperMap(String(rec.k).slice(4), rec.dim | 0, rec.x0 | 0, rec.z0 | 0, clamp(rec.sc | 0, 0, MAP_MAX_SCALE));
  const pi = new Uint16Array(MAP_PIX);
  rleDecode(base64ToBytes(rec.ids), pi, MAP_ORDER, !!rec.wd);
  const ids = (rec.pal || []).map(k => BLOCK_ID[k] ?? 0);
  for (let i = 0; i < MAP_PIX; i++) m.ids[i] = ids[pi[i]] || 0;
  rleDecode(base64ToBytes(rec.hs), m.h, MAP_ORDER);
  rleDecode(base64ToBytes(rec.cl), m.cl, MAP_ORDER);
  return m;
}
function mapGet(g, id) {
  if (!id) return null;
  let m = MAPS.all.get(id);
  if (m) return m;
  const rec = g && g.records && g.records.get('map~' + id);
  if (rec && rec.map) {
    try { m = decodeMap(rec); MAPS.all.set(id, m); return m; } catch (e) { console.warn('map', id, e); }
  }
  // a LAN guest asks the host for it (now and then, until it comes)
  if (g && g.isGuest && g.net && !MAPS.none.has(id)) {
    const now = performance.now(), t = MAPS.asked.get(id) || -1e9;
    if (now - t > 4000) { MAPS.asked.set(id, now); g.net.send({ t: 'mapreq', id }); }
  }
  return null;
}
function mapCreate(g, id, dim, x, z, scale) {
  const m = new PaperMap(id, dim, mapAlign(Math.floor(x), scale), mapAlign(Math.floor(z), scale), scale);
  MAPS.all.set(id, m); MAPS.dirty.add(id); MAPS.none.delete(id);
  return m;
}
// the map a stack shows (one with no map yet, from the creative menu say, becomes a map of here)
function mapForStack(g, lp, s) {
  if (!s.map || (MAPS.none.has(s.map) && !MAPS.all.has(s.map))) {
    const p = lp.player, id = s.map || newMapId();
    s.map = id;
    return mapCreate(g, id, g.dim, p.x, p.z, 0);
  }
  return mapGet(g, s.map);
}
// zooming out: twice the area, with what the old map knew carried over
function mapZoomed(src) {
  const sc = Math.min(MAP_MAX_SCALE, src.scale + 1), m = new PaperMap(newMapId(), src.dim, mapAlign(src.x0, sc), mapAlign(src.z0, sc), sc);
  const ox = (src.x0 - m.x0) >> sc, oz = (src.z0 - m.z0) >> sc;
  for (let z = 0; z < MAP_N / 2; z++) for (let x = 0; x < MAP_N / 2; x++) {
    let j = -1;
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const k = (z * 2 + dz) * MAP_N + x * 2 + dx; if (src.h[k]) { j = k; break; } }
    if (j < 0) continue;
    const i = (oz + z) * MAP_N + ox + x;
    m.ids[i] = src.ids[j]; m.h[i] = src.h[j]; m.cl[i] = src.cl[j];
  }
  MAPS.all.set(m.id, m); MAPS.dirty.add(m.id);
  if (MAPS.netOn) { m.net = new Set(); for (let i = 0; i < MAP_PIX; i++) if (m.h[i]) m.net.add(i); }
  return m;
}
function mapsReset(g) {
  const gl = g && g.renderer && g.renderer.gl;
  for (const m of MAPS.all.values()) if (m.tex && gl) gl.deleteTexture(m.tex);
  MAPS.all.clear(); MAPS.dirty.clear(); MAPS.none.clear(); MAPS.asked.clear();
  MAPS.g = g;
}

// ---- exploring: what's under you, a few columns of the map each frame --------------------------------------
function mapSkipTable() {
  const t = MAPS.skip = new Uint8Array(BLOCKS.length);
  const thin = /^(barrier|light|structure_void|moving_block|redstone_wire|tripwire|tripwire_hook|rail|powered_rail|detector_rail|activator_rail|string)$/;
  for (let id = 0; id < BLOCKS.length; id++) {
    const b = BLOCKS[id];
    if (!id || !b || b.render === RENDER.NONE || b.render === RENDER.CROSS || b.render === RENDER.TORCH || thin.test(b.key)) t[id] = 1;
    else if (b.liquid === 'water') t[id] = 2;
  }
  return t;
}
function mapSample(m, i, ch, lx, lz, top) {
  const skip = MAPS.skip || mapSkipTable(), B = ch.blocks, col = (lz << 4) | lx;
  let y = Math.min(top, ch.maxY - 1), id = 0;
  for (; y >= 0; y--) { id = B[(y << 8) | col]; if (skip[id] !== 1) break; }
  if (y < 0) return;                                  // nothing at all (the void): the paper stays blank
  const cl = ch.climate, t = cl ? cl[col * 2] : 128, hu = cl ? cl[col * 2 + 1] : 128;
  let lo = hu >> 4;
  if (skip[id] === 2) { let d = 0; for (let yy = y; yy >= 0 && d < 15 && skip[B[(yy << 8) | col]] === 2; yy--) d++; lo = d; }
  m.setPixel(i, id, y + 1, ((t >> 4) << 4) | lo);
}
function mapExplore(g, lp, m) {
  const p = lp.player, w = g.world, s = 1 << m.scale;
  const ppx = Math.floor((p.x - m.x0) / s), ppz = Math.floor((p.z - m.z0) / s);
  if (ppx < -MAP_R || ppz < -MAP_R || ppx >= MAP_N + MAP_R || ppz >= MAP_N + MAP_R) return;
  const lo = Math.max(0, ppx - MAP_R), hi = Math.min(MAP_N - 1, ppx + MAP_R), span = hi - lo + 1;
  if (span <= 0) return;
  const top = MAP_CEILING[g.dim] ? Math.floor(p.y) + 2 : CH - 1;
  const st = lp._mapSweep || (lp._mapSweep = { k: 0 });
  for (let n = 0; n < 3; n++) {
    const px = lo + (st.k++ % span), dx = px - ppx, rr = Math.floor(Math.sqrt(Math.max(0, MAP_R * MAP_R - dx * dx)));
    const z0 = Math.max(0, ppz - rr), z1 = Math.min(MAP_N - 1, ppz + rr);
    if (z1 < z0) continue;
    const bx = m.x0 + px * s + (s >> 1), cx = bx >> 4, lx = bx & 15;
    let ch = null, chz = null;
    for (let pz = z0; pz <= z1; pz++) {
      const bz = m.z0 + pz * s + (s >> 1), cz = bz >> 4;
      if (cz !== chz) { ch = w.chunkAt(cx, cz); chz = cz; }
      if (!ch || !(ch.mesh || ch.lightReady)) continue;
      mapSample(m, pz * MAP_N + px, ch, lx, bz & 15, top);
    }
  }
}

// ---- colours: worked out from the textures, so a pack recolours every map ----------------------------------------
const MAP_TINT = [0, 0, 0], MAP_RGB = [0, 0, 0];
function mapColorOf(id) {
  if (MAPS.colorsFor !== ATLAS.pixels) { MAPS.colors = []; MAPS.colorsFor = ATLAS.pixels; for (const m of MAPS.all.values()) m.painted = -1; }
  let c = MAPS.colors[id];
  if (c) return c;
  const b = BLOCKS[id], faces = BLOCK_FACES[id], P = ATLAS.pixels;
  const p = [0, 0, 0], t = [0, 0, 0];
  if (P && faces) {
    const tile = faces[2], x0 = (tile % ATLAS_TILES) * TILE, y0 = Math.floor(tile / ATLAS_TILES) * TILE, W = P.width, D = P.data;
    let n = 0;
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const o = ((y0 + y) * W + x0 + x) * 4, a = D[o + 3];
      if (a < 26) continue;
      n++; const dst = a === 253 ? t : p;
      dst[0] += D[o]; dst[1] += D[o + 1]; dst[2] += D[o + 2];
    }
    if (n) for (let k = 0; k < 3; k++) { p[k] /= n; t[k] /= n; }
  }
  c = { p, t, k: b && b.liquid === 'water' ? 3 : b && b.tint === 'grass' ? 1 : b && b.tint === 'foliage' ? 2 : 0 };
  return (MAPS.colors[id] = c);
}
function mapRGB(id, cl, out) {
  const c = mapColorOf(id), t = (cl >> 4) * 17, hu = (cl & 15) * 17;
  if (c.k === 3) {
    climateWater(t, hu, MAP_TINT);
    for (let k = 0; k < 3; k++) out[k] = (c.p[k] + c.t[k]) * MAP_TINT[k] * (1.25 / 255);
    return out;
  }
  let tint = TINT_GRASS;
  if (c.k) {
    climateGrass(t, hu, MAP_TINT);
    if (c.k === 2) { MAP_TINT[0] *= 0.82; MAP_TINT[1] *= 0.86; MAP_TINT[2] *= 0.8; }
    tint = MAP_TINT;
  }
  for (let k = 0; k < 3; k++) out[k] = c.p[k] + c.t[k] * tint[k] * (1.3 / 255);
  return out;
}
// blank paper, with a little grain
const MAP_PAPER = (() => {
  const a = new Uint8Array(MAP_PIX);
  for (let i = 0; i < MAP_PIX; i++) { let h = Math.imul(i ^ 0x5bd1e995, 0x2c1b3c6d); h ^= h >>> 13; h = Math.imul(h, 0x297a2d39); a[i] = (h >>> 24) & 7; }
  return a;
})();
function mapPaint(m) {
  if (!m.cv) { m.cv = document.createElement('canvas'); m.cv.width = m.cv.height = MAP_N; m.ctx = m.cv.getContext('2d'); m.img = m.ctx.createImageData(MAP_N, MAP_N); }
  mapColorOf(0);
  const d = m.img.data, H = m.h, I = m.ids, C = m.cl, skip = MAPS.skip || mapSkipTable();
  for (let z = 0; z < MAP_N; z++) for (let x = 0; x < MAP_N; x++) {
    const i = z * MAP_N + x, o = i * 4, h = H[i];
    if (!h) { const n = MAP_PAPER[i]; d[o] = 222 + n; d[o + 1] = 207 + n; d[o + 2] = 166 + n; d[o + 3] = 255; continue; }
    const id = I[i], c = C[i];
    let sh;
    if (skip[id] === 2) { const dd = (c & 15) * 0.1 + ((x + z) & 1) * 0.2; sh = dd < 0.5 ? 2 : dd > 0.9 ? 0 : 1; }
    else { const hn = z > 0 && H[i - MAP_N] ? H[i - MAP_N] : h; sh = h > hn ? 2 : h < hn ? 0 : 1; }
    mapRGB(id, c, MAP_RGB);
    const f = MAP_SHADE[sh];
    d[o] = MAP_RGB[0] * f; d[o + 1] = MAP_RGB[1] * f; d[o + 2] = MAP_RGB[2] * f; d[o + 3] = 255;
  }
  m.ctx.putImageData(m.img, 0, 0);
  m.painted = m.ver; m.paintedAt = performance.now();
}
function mapCanvas(m, force) {
  mapColorOf(0);
  if (!m.cv || (m.painted !== m.ver && (force || performance.now() - m.paintedAt > 150))) mapPaint(m);
  return m.cv;
}
function mapTex(g, m) {
  const r = g.renderer, gl = r.gl;
  mapCanvas(m);
  if (!m.tex) { m.tex = gl.createTexture(); m.texVer = -1; }
  if (m.texVer !== m.painted) {
    gl.bindTexture(gl.TEXTURE_2D, m.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, m.cv);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, r.tex || null);
    m.texVer = m.painted;
  }
  return m.tex;
}

// ---- markers: you, the others, home, your grave, pins ------------------------------------------------------
function mapMarker(c, kind, x, y, sz, rot, col) {
  c.save(); c.translate(x, y); if (rot) c.rotate(rot); c.scale(sz / 16, sz / 16);
  c.lineJoin = 'round'; c.lineWidth = 1.6; c.strokeStyle = '#1a1208'; c.fillStyle = col || '#fff';
  c.beginPath();
  if (kind === 'arrow') { c.moveTo(0, -7); c.lineTo(5.6, 6.4); c.lineTo(0, 3.4); c.lineTo(-5.6, 6.4); c.closePath(); c.fill(); c.stroke(); }
  else if (kind === 'dot') { c.arc(0, 0, 3.6, 0, TAU); c.fill(); c.stroke(); }
  else if (kind === 'home') {
    c.moveTo(-6.5, 0.5); c.lineTo(0, -6); c.lineTo(6.5, 0.5); c.lineTo(4.5, 0.5); c.lineTo(4.5, 6.5); c.lineTo(-4.5, 6.5); c.lineTo(-4.5, 0.5); c.closePath();
    c.fillStyle = '#f2e6c8'; c.fill(); c.stroke();
    c.fillStyle = '#b0402a'; c.beginPath(); c.moveTo(-6.5, 0.5); c.lineTo(0, -6); c.lineTo(6.5, 0.5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#5a3a20'; c.fillRect(-1.3, 2.4, 2.6, 4.1);
  } else if (kind === 'grave') {
    c.moveTo(-4.5, 6.5); c.lineTo(-4.5, -2); c.arc(0, -2, 4.5, Math.PI, 0); c.lineTo(4.5, 6.5); c.closePath();
    c.fillStyle = '#a8a8b0'; c.fill(); c.stroke();
    c.fillStyle = '#3a3a44'; c.fillRect(-0.7, -3.5, 1.4, 6); c.fillRect(-2.3, -1.6, 4.6, 1.4);
  } else if (kind === 'village') {
    // two cottages side by side
    for (const [ox, w, h, roof] of [[-6.5, 6, 5, '#b0402a'], [0.2, 6.4, 7, '#3a6ab0']]) {
      c.beginPath(); c.rect(ox, 6.5 - h + 2.5, w, h - 2.5); c.fillStyle = '#f2e6c8'; c.fill(); c.stroke();
      c.beginPath(); c.moveTo(ox - 0.8, 6.5 - h + 2.6); c.lineTo(ox + w / 2, 6.5 - h - 1.6); c.lineTo(ox + w + 0.8, 6.5 - h + 2.6); c.closePath(); c.fillStyle = roof; c.fill(); c.stroke();
    }
    c.fillStyle = '#5a3a20'; c.fillRect(-4.4, 4, 1.8, 2.5); c.fillRect(2.6, 3.6, 1.8, 2.9);
  } else if (kind === 'dungeon') {
    // a dark arch in old stone
    c.moveTo(-6, 6.5); c.lineTo(-6, -1); c.arc(0, -1, 6, Math.PI, 0); c.lineTo(6, 6.5); c.closePath(); c.fillStyle = col || '#8a8a92'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-3, 6.5); c.lineTo(-3, 0); c.arc(0, 0, 3, Math.PI, 0); c.lineTo(3, 6.5); c.closePath(); c.fillStyle = '#120a0a'; c.fill();
    c.fillStyle = '#e8d8a8'; c.fillRect(-1.2, 1.4, 2.4, 2); c.fillStyle = '#120a0a'; c.fillRect(-0.9, 2, 0.6, 0.7); c.fillRect(0.3, 2, 0.6, 0.7);
  } else if (kind === 'rift') {
    c.moveTo(0, -7.5); c.quadraticCurveTo(4.5, 0, 0, 7.5); c.quadraticCurveTo(-4.5, 0, 0, -7.5); c.closePath(); c.fillStyle = '#c040ff'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, -5); c.quadraticCurveTo(2, 0, 0, 5); c.quadraticCurveTo(-2, 0, 0, -5); c.fillStyle = '#16001e'; c.fill();
  } else if (kind === 'pin') {
    c.moveTo(0, 7); c.lineTo(-2.2, 0); c.lineTo(2.2, 0); c.closePath(); c.fillStyle = '#3a2a1a'; c.fill();
    c.beginPath(); c.arc(0, -2.2, 4.4, 0, TAU); c.fillStyle = col; c.fill(); c.stroke();
    c.beginPath(); c.arc(-1.3, -3.4, 1.2, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill();
  }
  c.restore();
}
// the cells of the marker picture used in the hand: 0 you, 1 someone here, 2 someone over LAN, 3 off the edge,
// 4 home, 5 grave, 6.. pins
const MAP_CELLS = 16;
function mapRes(g) {
  const gl = g.renderer.gl;
  if (MAPS.res && MAPS.res.gl === gl) return MAPS.res;
  const quad = (u0, v0, u1, v1) => {
    const mb = new MeshBuilder(4);
    const a = mb.vert(-0.5, -0.5, 0, u0, v1, 255, 0, 255), b = mb.vert(0.5, -0.5, 0, u1, v1, 255, 0, 255), c = mb.vert(0.5, 0.5, 0, u1, v0, 255, 0, 255), d = mb.vert(-0.5, 0.5, 0, u0, v0, 255, 0, 255);
    mb.quad(a, b, c, d, false); const r = mb.result(); return makeVAO(gl, r.verts, r.idx);
  };
  const tex = (cv, nearest) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, g.renderer.tex || null);
    return t;
  };
  // the paper the map is drawn on, with a darker rim
  const pc = document.createElement('canvas'); pc.width = pc.height = 64;
  const c = pc.getContext('2d');
  c.fillStyle = '#7a5a34'; c.fillRect(0, 0, 64, 64);
  c.fillStyle = '#c9b07c'; c.fillRect(1, 1, 62, 62);
  c.fillStyle = '#ddc995'; c.fillRect(3, 3, 58, 58);
  for (let i = 0; i < 160; i++) { const x = (i * 37) % 62 + 1, y = (i * 53 + (i >> 3)) % 62 + 1; c.fillStyle = i & 1 ? 'rgba(120,90,50,0.12)' : 'rgba(255,250,230,0.18)'; c.fillRect(x, y, 1, 1); }
  // the markers, in a strip
  const mc = document.createElement('canvas'); mc.width = 32 * MAP_CELLS; mc.height = 32;
  const k = mc.getContext('2d'), cell = (n) => 16 + 32 * n;
  mapMarker(k, 'arrow', cell(0), 16, 30, 0, '#ffffff');
  mapMarker(k, 'arrow', cell(1), 16, 30, 0, '#ffe08a');
  mapMarker(k, 'arrow', cell(2), 16, 30, 0, '#7ad0ff');
  mapMarker(k, 'dot', cell(3), 16, 30, 0, '#ffffff');
  mapMarker(k, 'home', cell(4), 16, 30, 0);
  mapMarker(k, 'grave', cell(5), 16, 30, 0);
  MAP_PIN_COLS.forEach((col, n) => mapMarker(k, 'pin', cell(6 + n), 16, 30, 0, col));
  mapMarker(k, 'village', cell(12), 16, 30, 0);
  mapMarker(k, 'dungeon', cell(13), 16, 30, 0);
  mapMarker(k, 'rift', cell(14), 16, 30, 0);
  mapMarker(k, 'dungeon', cell(15), 16, 30, 0, '#5a8a5a');
  const res = { gl, quad: quad(0, 0, 1, 1), paper: tex(pc, true), marks: tex(mc, false), cells: [] };
  for (let n = 0; n < MAP_CELLS; n++) res.cells.push(quad(n / MAP_CELLS, 0, (n + 1) / MAP_CELLS, 1));
  MAPS.res = res;
  return res;
}
// where everything is on a map, in map pixels (0..128): [{cell, u, v, rot}]
function mapMarkers(g, m, lp) {
  const out = [], s = 1 << m.scale, P = (x, z) => [(x - m.x0) / s, (z - m.z0) / s];
  const inside = (u, v) => u >= 0 && v >= 0 && u <= MAP_N && v <= MAP_N;
  const who = (x, z, yaw, cell) => {
    const [u, v] = P(x, z);
    if (inside(u, v)) out.push({ cell, u, v, rot: yaw });
    else if (u > -MAP_N * 0.6 && v > -MAP_N * 0.6 && u < MAP_N * 1.6 && v < MAP_N * 1.6) out.push({ cell: 3, u: clamp(u, 1.5, MAP_N - 1.5), v: clamp(v, 1.5, MAP_N - 1.5), rot: 0, small: true });
  };
  const pins = (g.meta && g.meta.mapPins) || [];
  for (const pn of pins) if (pn.d === m.dim) { const [u, v] = P(pn.x, pn.z); if (inside(u, v)) out.push({ cell: 6 + ((pn.c | 0) % MAP_PIN_COLS.length), u, v, rot: 0, pin: true }); }
  if (m.dim === 0) { const sp = lp.player.spawn || (g.meta && g.meta.spawn); if (sp) { const [u, v] = P(sp[0], sp[2]); if (inside(u, v)) out.push({ cell: 4, u, v, rot: 0 }); } }
  // places you've found: villages, dungeons (green once cleared) and the rift
  if (m.dim === 0 && typeof villageById === 'function') {
    const S = lp.player.stats || {};
    const R = g.meta && g.meta.rift, riftOpen = R && R.stage >= 1 && !R.sealed && R.at;
    for (const id of Object.keys(S.vseen || {})) { const vl = villageById(g, id); if (!vl) continue; const [u, v] = P(vl.x, vl.z); if (inside(u, v)) out.push({ cell: 12, u, v, rot: 0, label: vl.name + (riftOpen && R.village === id ? ' · the rift' : '') }); }
    if (typeof dungeonById === 'function') for (const id of Object.keys(S.dseen || {})) {
      const d = dungeonById(g, id); if (!d) continue;
      const [u, v] = P(d.ent[0] + 2, d.ent[1] + 2), cleared = g.meta.dungeons && g.meta.dungeons[id] && g.meta.dungeons[id].cleared;
      if (inside(u, v)) out.push({ cell: cleared ? 15 : 13, u, v, rot: 0, label: d.name + (cleared ? ' (cleared)' : '') });
    }
    if (riftOpen && !(S.vseen || {})[R.village]) { const [u, v] = P(R.at[0], R.at[2]); if (inside(u, v)) out.push({ cell: 14, u, v, rot: 0, label: 'The rift' }); }
  }
  const gr = lp.player.grave;
  if (gr && gr.dim === m.dim) { const [u, v] = P(gr.x + 0.5, gr.z + 0.5); if (inside(u, v)) out.push({ cell: 5, u, v, rot: 0 }); }
  if (g.dim === m.dim) {
    if (g.net) for (const r of g.net.remotes.values()) if (r.dim === m.dim && r.placed !== false) who(r.x, r.z, r.yaw ?? r.tyaw ?? 0, 2);
    for (const l of g.locals) if (l !== lp && !l.player.dead) who(l.player.x, l.player.z, l.player.yaw, 1);
    who(lp.player.x, lp.player.z, lp.player.yaw, 0);
  }
  return out;
}

// ---- the map in your hands ----------------------------------------------------------------------------
{
  const baseHand = LocalPlayer.prototype.handState;
  LocalPlayer.prototype.handState = function () {
    const r = baseHand.call(this);
    if (!r) return r;
    const g = this.g, p = this.player, main = p.inv.held, off = p.inv.offhand;
    const mainMap = isMapStack(main), offMap = isMapStack(off);
    if ((!mainMap && !offMap) || p.carrying || p.hang || p.climb) return r;
    try {
      const skin = this.skin && this.skin.ready ? this.skin : null;
      // how many draws the hand view made for each arm (the arm, and its sleeve or the chestplate's)
      const chest0 = this.player.inv.armor.slots[1];
      const chestId = chest0 ? (chest0.col ? chest0.id + '#' + chest0.col.slice(1) : chest0.id) : null;
      const armN = (side) => skin ? fpArmCount(gl, skin, side, chestId) : MODELS.player_arm.parts.length;   // (0.9.0.53) counted the way fpArmDraws draws
      const bowDraw = main && main.id === 'bow' && (this.bowPull > 0 || this.bowKick > 0) && typeof bowStage === 'function';
      let draws = r.draws;
      if (mainMap && !bowDraw) draws = draws.slice(armN(1) + 1);
      if (offMap && off && itemDef(off.id)) draws = draws.slice(0, Math.max(0, draws.length - (armN(-1) + 1)));
      const arm = (fx, fy, fz, yaw, pitch, side) => {
        const am = Mat4.create();
        Mat4.translate(am, fx, fy, fz); Mat4.rotateY(am, yaw); Mat4.rotateX(am, pitch); Mat4.translate(am, 0, 0.3, 0.02);
        if (skin) { const m2 = Mat4.create(); m2.set(am); Mat4.translate(m2, 0, 0.3, 0); const ch = chest0; fpArmDraws(draws, gl, skin, side, m2, ch ? (ch.col ? ch.id + '#' + ch.col.slice(1) : ch.id) : null); }
        else for (const part of MODELS.player_arm.parts) draws.push({ mesh: part.mesh, m: am });
      };
      const bob = g.settings.viewBob ? p.bobAmt : 0;
      const bx = Math.sin(p.bob * 1.1) * 0.02 * bob, by = -Math.abs(Math.sin(p.bob * 2.2)) * 0.02 * bob;
      const eq = 1 - (p.equip ?? 1), look = clamp(-p.pitch / 0.9, 0, 1), sw = Math.sin((p.swing || 0) * Math.PI);
      const one = (s, side, mm) => {
        // one hand: off to that side, the hand at its outer lower corner
        const M = Mat4.create();
        Mat4.translate(M, side * (0.34 - look * 0.06) + bx, -0.36 + look * 0.12 + by - eq * 0.5 - sw * 0.08, -0.62 - sw * 0.06);
        Mat4.rotateY(M, -side * (0.28 - look * 0.12)); Mat4.rotateX(M, -0.75 + look * 0.45); Mat4.rotateZ(M, side * 0.06);
        const S = 0.36;
        mapSheetDraws(g, this, mm, M, S, draws);
        const f = mapPoint(M, side * 0.44 * S, -0.36 * S, 0.03);
        arm(f[0], f[1], f[2], side * 0.4, 2.1, side);
      };
      const mm = mainMap ? mapForStack(g, this, main) : null, om = offMap ? mapForStack(g, this, off) : null;
      if (mainMap && !bowDraw && (!off || !itemDef(off.id))) {
        // both hands: held up in front of you, coming up into view as you look down
        const M = Mat4.create();
        Mat4.translate(M, bx, -0.43 + look * 0.24 + by - eq * 0.55 - sw * 0.08, -0.6 + look * 0.03 - sw * 0.05);
        Mat4.rotateX(M, -0.95 + look * 0.72);
        const S = 0.5;
        mapSheetDraws(g, this, mm, M, S, draws);
        for (const side of [-1, 1]) { const f = mapPoint(M, side * 0.5 * S, -0.47 * S, 0.04); arm(f[0], f[1], f[2], side * 0.6, 2.3, side); }
      } else {
        if (mainMap && !bowDraw) one(main, 1, mm);
        if (offMap) one(off, -1, om);
      }
      r.draws = draws;
    } catch (e) { if (!MAPS._warned) { MAPS._warned = true; console.warn('map in hand', e); } }
    return r;
  };
}
function mapPoint(M, x, y, z) { return [M[0] * x + M[4] * y + M[8] * z + M[12], M[1] * x + M[5] * y + M[9] * z + M[13], M[2] * x + M[6] * y + M[10] * z + M[14]]; }
// a sheet of paper with the map on it (and its markers), at M, S across
function mapSheetDraws(g, lp, m, M, S, draws) {
  const res = mapRes(g);
  const pm = Mat4.create(); pm.set(M); Mat4.scale(pm, S * 1.12, S * 1.12, 1);
  draws.push({ mesh: res.quad, m: pm, tex: res.paper, noCull: true });
  if (!m) return;
  const mm = Mat4.create(); mm.set(M); Mat4.translate(mm, 0, 0, 0.002); Mat4.scale(mm, S, S, 1);
  draws.push({ mesh: res.quad, m: mm, tex: mapTex(g, m), noCull: true });
  for (const k of mapMarkers(g, m, lp)) {
    const km = Mat4.create(); km.set(M);
    Mat4.translate(km, (k.u / MAP_N - 0.5) * S, (0.5 - k.v / MAP_N) * S, 0.004 + (k.cell === 0 ? 0.001 : 0));
    if (k.cell <= 2) Mat4.rotateZ(km, k.rot);
    const ks = S * (k.small ? 0.045 : k.pin ? 0.075 : 0.07);
    Mat4.scale(km, ks, ks, 1);
    if (k.pin) Mat4.translate(km, 0, 0.35, 0);
    draws.push({ mesh: res.cells[k.cell], m: km, tex: res.marks, noCull: true });
  }
}

// ---- in an item frame: the map fills the frame, so maps side by side make one picture ----------------------------
{
  const baseBED = blockEntityDraws;
  blockEntityDraws = function (game, out, cam, R) {
    const n0 = out.length;
    baseBED(game, out, cam, R);
    const gl = game.renderer.gl, w = game.world;
    let flat = null;
    for (let i = n0; i < out.length; i++) {
      const d = out[i];
      if (d.tex) continue;
      if (!flat) { if (!ITEMS.filled_map) return; flat = itemMesh(gl, 'filled_map').mesh; }
      if (d.mesh !== flat) continue;
      const e = w.getEntity(d.px, d.py, d.pz);
      if (!e || e.type !== 'frame' || !e.item || e.item.id !== 'filled_map') continue;
      const m = mapGet(game, e.item.map);
      if (!m) continue;
      const res = mapRes(game), f = w.getMeta(d.px, d.py, d.pz) & 3, mm = Mat4.create();
      Mat4.translate(mm, 0.5, 0.5, 0.5); Mat4.rotateY(mm, [0, -Math.PI / 2, Math.PI, Math.PI / 2][f]);
      Mat4.translate(mm, 0, 0, -0.5 + 1 / 16 + 0.004); Mat4.rotateZ(mm, -((e.rot || 0) >> 1) * Math.PI / 2);
      d.mesh = res.quad; d.m = mm; d.tex = mapTex(game, m); d.noCull = false;
    }
  };
  // turning a map in a frame goes a quarter at a time
  const baseUse = LocalPlayer.prototype.useBlockAt;
  LocalPlayer.prototype.useBlockAt = function (hit, held, def) {
    const b = BLOCKS[hit.id];
    if (b && b.frame) {
      const g = this.g, e = g.world.getEntity(hit.x, hit.y, hit.z);
      if (e && e.item && e.item.id === 'filled_map') {
        e.rot = (((e.rot || 0) >> 1) + 1 & 3) << 1;
        g.entityChanged(hit.x, hit.y, hit.z); g.sfx.playAt('click', hit.x, hit.y, hit.z); this.swingArm();
        return true;
      }
    }
    return baseUse.call(this, hit, held, def);
  };
}

// ---- looking at it closely ------------------------------------------------------------------------------
class MapView {
  constructor(lp, m) {
    this.lp = lp; this.g = lp.g; this.m = m; this.zoom = 1; this.cx = m.x0 + m.span / 2; this.cz = m.z0 + m.span / 2;
    this.drag = null; this.hover = null; this.t = 1; this.k = 1;
    const el = this.el = document.createElement('div');
    el.className = 'mapview';
    el.innerHTML = `<div class="mv-card"><div class="mv-head"><span class="mv-title"></span><span class="mv-sub"></span><button class="mv-x" aria-label="Close">✕</button></div>
      <canvas class="mv-sheet"></canvas>
      <div class="mv-foot"><span class="mv-pos"></span><span class="mv-btns"><button data-z="-1" aria-label="Zoom out">−</button><button data-z="0">Find me</button><button data-z="1" aria-label="Zoom in">+</button></span></div>
      <div class="mv-hint">Scroll to zoom · drag to look around · click to set a pin, click it again to clear it · M or Esc to close</div></div>`;
    lp.el.appendChild(el);
    this.cv = el.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.collect();
    const g = this.g, P = this.lp.player;
    const s = 1 << m.scale;
    el.querySelector('.mv-title').textContent = 'Map · ' + (DIM_NAME[m.dim] || 'Somewhere') + ' · 1:' + s;
    el.querySelector('.mv-sub').textContent = Math.round(m.explored() * 100) + '% explored · ' + m.span + ' blocks across';
    el.querySelector('.mv-x').onclick = () => this.close();
    el.querySelectorAll('[data-z]').forEach(b => b.onclick = () => {
      const z = Number(b.dataset.z);
      if (z) this.zoomBy(z > 0 ? 1.5 : 1 / 1.5);
      else if (g.dim === m.dim) { this.cx = P.x; this.cz = P.z; }
      this.draw();
    });
    const stop = (e) => e.stopPropagation();
    el.addEventListener('pointerdown', stop); el.addEventListener('mousedown', stop);
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); if (e.target === this.cv) this.close(); });
    const cv = this.cv;
    cv.addEventListener('wheel', (e) => { e.preventDefault(); e.stopPropagation(); this.zoomBy(e.deltaY < 0 ? 1.25 : 0.8, e); this.draw(); }, { passive: false });
    cv.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      this.drag = { x: e.clientX, y: e.clientY, cx: this.cx, cz: this.cz, moved: false };
    });
    cv.addEventListener('pointermove', (e) => {
      this.hover = this.toWorld(e);
      const d = this.drag;
      if (d) {
        const dx = e.clientX - d.x, dy = e.clientY - d.y, dpr = this.dpr || 1;
        if (Math.hypot(dx, dy) > 4) d.moved = true;
        if (d.moved) { this.cx = d.cx - dx * dpr / this.k; this.cz = d.cz - dy * dpr / this.k; }
      }
      this.draw();
    });
    cv.addEventListener('pointerup', (e) => { const d = this.drag; this.drag = null; if (d && !d.moved) { this.togglePin(e); this.draw(); } });
    cv.addEventListener('pointerleave', () => { this.hover = null; });
    this.onKey = (e) => {
      const b = g.input.binds || {}, code = e.code;
      const is = (a) => (b[a] || []).includes(code);
      if (code === 'Escape' || is('map') || is('inventory')) { e.preventDefault(); e.stopPropagation(); this.close(); return; }
      if (code === 'Equal' || code === 'NumpadAdd') { this.zoomBy(1.5); this.draw(); e.stopPropagation(); }
      else if (code === 'Minus' || code === 'NumpadSubtract') { this.zoomBy(1 / 1.5); this.draw(); e.stopPropagation(); }
    };
    window.addEventListener('keydown', this.onKey, true);
    this.draw();
  }
  // every map of this place at this scale, laid out together (the one you hold on top)
  collect() {
    const g = this.g, m = this.m, out = new Map();
    if (g.records) for (const [k, rec] of g.records) if (rec && rec.map && rec.dim === m.dim && rec.sc === m.scale) { const mm = mapGet(g, k.slice(4)); if (mm) out.set(mm.id, mm); }
    for (const mm of MAPS.all.values()) if (mm.dim === m.dim && mm.scale === m.scale) out.set(mm.id, mm);
    // a guest asks for the maps they carry
    const P = this.lp.player;
    for (const s of [...P.inv.main.slots, P.inv.offhand]) if (isMapStack(s) && s.map) mapGet(g, s.map);
    out.delete(m.id);
    this.maps = [...out.values()].sort((a, b) => a.explored() - b.explored());
    this.maps.push(m);
  }
  get size() { return this.cv.width; }
  toWorld(e) {
    const r = this.cv.getBoundingClientRect(), dpr = this.dpr || 1;
    const sx = (e.clientX - r.left) * dpr, sy = (e.clientY - r.top) * dpr;
    return [this.cx + (sx - this.cv.width / 2) / this.k, this.cz + (sy - this.cv.height / 2) / this.k];
  }
  zoomBy(f, e) {
    const before = e ? this.toWorld(e) : null;
    this.zoom = clamp(this.zoom * f, 0.2, 10);
    this.k = this.baseK * this.zoom;
    if (before) { const after = this.toWorld(e); this.cx += before[0] - after[0]; this.cz += before[1] - after[1]; }
  }
  togglePin(e) {
    const g = this.g, m = this.m, [x, z] = this.toWorld(e);
    const pins = g.meta.mapPins = (g.meta.mapPins || []).filter(p => p && Number.isFinite(p.x));
    const near = pins.findIndex(p => p.d === m.dim && Math.hypot(p.x - x, p.z - z) * this.k < 12 * (this.dpr || 1));
    if (near >= 0) { pins.splice(near, 1); g.sfx.play('click_off'); }
    else {
      if (pins.length >= 64) { this.lp.toast('That\'s a lot of pins — clear some first', ''); return; }
      const used = pins.filter(p => p.d === m.dim).length;
      pins.push({ d: m.dim, x: Math.round(x), z: Math.round(z), c: used % MAP_PIN_COLS.length });
      g.sfx.play('click');
    }
    mapPinsChanged(g);
  }
  frame(dt, inp) {
    if (inp.padB || inp.padStart || inp.inventory || inp.map) { this.close(); return; }
    if (inp.navX || inp.navY || inp.mx || inp.mz) {
      const vx = inp.navX || inp.mx || 0, vz = inp.navY || inp.mz || 0;
      this.cx += vx * dt * 300 / this.k * (this.dpr || 1); this.cz += vz * dt * 300 / this.k * (this.dpr || 1);
    }
    if (inp.padLB) this.zoomBy(1 / 1.5); if (inp.padRB) this.zoomBy(1.5);
    if ((this.t += dt) > 0.05) { this.t = 0; this.draw(); }
  }
  draw() {
    const el = this.el, cv = this.cv, g = this.g, m = this.m, P = this.lp.player;
    if (!el.isConnected) return;
    const dpr = this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const box = Math.max(120, Math.min(el.clientWidth - 24, el.clientHeight - 128));
    if (cv.style.width !== box + 'px') { cv.style.width = cv.style.height = box + 'px'; }
    const W = Math.round(box * dpr);
    if (cv.width !== W) { cv.width = cv.height = W; }
    this.baseK = W / (m.span * 1.06); this.k = this.baseK * this.zoom;
    const c = this.ctx, k = this.k, sx = (x) => W / 2 + (x - this.cx) * k, sz = (z) => W / 2 + (z - this.cz) * k;
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#3a2c1c'; c.fillRect(0, 0, W, W);
    // the table they're laid out on
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 0; y < W; y += 14 * dpr) c.fillRect(0, y, W, 1);
    for (const mm of this.maps) {
      const x = sx(mm.x0), y = sz(mm.z0), w = mm.span * k;
      if (x > W || y > W || x + w < 0 || y + w < 0) continue;
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x + 3 * dpr, y + 3 * dpr, w, w);
      c.drawImage(mapCanvas(mm, true), Math.round(x), Math.round(y), Math.round(w), Math.round(w));
    }
    { const x = sx(m.x0), y = sz(m.z0), w = m.span * k; c.strokeStyle = 'rgba(255,230,160,0.8)'; c.lineWidth = 2 * dpr; c.strokeRect(x - dpr, y - dpr, w + 2 * dpr, w + 2 * dpr); }
    // markers: drawn at a steady size whatever the zoom
    const s = 1 << m.scale, mk = 18 * dpr;
    for (const mm of [m]) for (const q of mapMarkers(g, mm, this.lp)) {
      if (q.small) continue;
      const x = sx(m.x0 + q.u * s), y = sz(m.z0 + q.v * s);
      const kind = q.cell <= 2 ? 'arrow' : q.cell === 3 ? 'dot' : q.cell === 4 ? 'home' : q.cell === 5 ? 'grave' : q.cell === 12 ? 'village' : q.cell === 13 || q.cell === 15 ? 'dungeon' : q.cell === 14 ? 'rift' : 'pin';
      const col = q.cell === 0 ? '#ffffff' : q.cell === 1 ? '#ffe08a' : q.cell === 2 ? '#7ad0ff' : q.cell === 13 ? '#8a8a92' : q.cell === 15 ? '#5a8a5a' : q.cell >= 12 ? undefined : MAP_PIN_COLS[(q.cell - 6) % MAP_PIN_COLS.length];
      const big = q.cell >= 12 ? 1.3 : kind === 'pin' ? 1.1 : 1;
      mapMarker(c, kind, x, kind === 'pin' ? y - mk * 0.35 : y, mk * big, q.cell <= 2 ? -q.rot : 0, col);
      if (q.label) (this._labels || (this._labels = [])).push([x, y + mk * 1.05, q.label]);
    }
    // pins and people beyond the held map, and names
    c.font = `600 ${11 * dpr}px "Pixelify Sans", ui-monospace, monospace`; c.textAlign = 'center';
    const tag = (x, y, text) => { c.lineWidth = 3 * dpr; c.strokeStyle = 'rgba(20,14,8,0.85)'; c.strokeText(text, x, y); c.fillStyle = '#fff3d6'; c.fillText(text, x, y); };
    for (const [x, y, text] of this._labels || []) tag(x, y, text);
    this._labels = null;
    for (const pn of (g.meta.mapPins || [])) if (pn.d === m.dim && !m.has(pn.x, pn.z)) mapMarker(c, 'pin', sx(pn.x), sz(pn.z) - mk * 0.35, mk * 1.1, 0, MAP_PIN_COLS[(pn.c | 0) % MAP_PIN_COLS.length]);
    if (g.dim === m.dim) {
      const people = g.locals.filter(l => l !== this.lp && !l.player.dead).map(l => [l.player.x, l.player.z, l.player.yaw, '#ffe08a', l.name]);
      if (g.net) for (const r of g.net.remotes.values()) if (r.dim === m.dim) people.push([r.x, r.z, r.yaw ?? r.tyaw ?? 0, '#7ad0ff', r.name]);
      for (const [x, z, yaw, col, name] of people) {
        if (!m.has(x, z)) mapMarker(c, 'arrow', sx(x), sz(z), mk, -yaw, col);
        if (name) tag(sx(x), sz(z) - mk * 0.75, name);
      }
      if (!m.has(P.x, P.z)) mapMarker(c, 'arrow', sx(P.x), sz(P.z), mk, -P.yaw, '#ffffff');
    }
    const at = this.hover || (g.dim === m.dim ? [P.x, P.z] : null);
    el.querySelector('.mv-pos').textContent = at ? `x ${Math.floor(at[0])} · z ${Math.floor(at[1])}${this.hover ? '' : ' (you)'}` : 'You are not in this world';
  }
  close() {
    const lp = this.lp, g = this.g;
    window.removeEventListener('keydown', this.onKey, true);
    this.el.remove();
    if (lp.mapView === this) lp.mapView = null;
    if (lp.mode === 'map') lp.mode = 'play';
    g.sfx.play('map_paper');
    if (lp.useKb && !g.input.touchMode && g.state === 'playing') g.input.requestLock();
  }
}
function mapPinsChanged(g) {
  if (!g.net) { g.saveSoon(); return; }
  if (g.isGuest) g.net.send({ t: 'mappins', l: g.meta.mapPins });
  else { g.net.all({ t: 'mappins', l: g.meta.mapPins }); g.saveSoon(); }
}
function mapCleanPins(l) {
  return (Array.isArray(l) ? l : []).slice(0, 64).filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.z)).map(p => ({ d: p.d | 0, x: Math.round(p.x), z: Math.round(p.z), c: (p.c | 0) % MAP_PIN_COLS.length }));
}

// ---- using maps; the M key ------------------------------------------------------------------------------
Object.assign(LocalPlayer.prototype, {
  openMapView(s) {
    if (this.mode !== 'play' || this.mapView) return;
    const g = this.g, m = mapForStack(g, this, s);
    if (!m) { this.toast('This map is still on its way from the host', ''); return; }
    this.mode = 'map'; this.mining = null;
    if (this.useKb) g.input.releaseLock(true);
    this.mapView = new MapView(this, m);
    g.sfx.play('map_paper');
  },
  openBestMap() {
    const g = this.g, p = this.player;
    let pick = [p.inv.held, p.inv.offhand].find(isMapStack);
    if (!pick) {
      let best = null, score = -1;
      for (const s of p.inv.main.slots) {
        if (!isMapStack(s)) continue;
        const m = s.map ? mapGet(g, s.map) : null;
        const sc = !m ? 0 : m.dim !== g.dim ? 1 : m.has(p.x, p.z) ? 10 - m.scale : 2;
        if (sc > score) { score = sc; best = s; }
      }
      pick = best;
    }
    if (!pick) { this.toast('No map with you — make one from 8 paper round a compass', ''); return; }
    this.openMapView(pick);
  },
  useMapItem(s) {
    const g = this.g, p = this.player;
    if (s.id === 'filled_map') { this.openMapView(s); return; }
    const id = newMapId();
    mapCreate(g, id, g.dim, p.x, p.z, 0);
    const fm = mkStack('filled_map', 1, { map: id });
    if (g.creative) this.give(fm);
    else { s.n--; if (s.n <= 0) p.inv.held = fm; else this.give(fm); }
    g.sfx.play('map_paper'); this.swingArm();
    this.toast('A new map — it fills in as you explore. Look down to read it, right-click to look closely', 'good');
  },
});
{
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const p = this.player, s = p.inv.held;
    if (repeat || !s || (s.id !== 'empty_map' && s.id !== 'filled_map') || p.sneaking) return baseUse.call(this, repeat, inp, fromOff);
    // boats, carts and animals first, then whatever the block you look at does (an item frame takes the map)
    if (!fromOff && this.targetEnt) return baseUse.call(this, repeat, inp, fromOff);
    const hit = this.target;
    if (hit && !fromOff) {
      const b = BLOCKS[hit.id];
      if (b.pile || b.placedBackpack || b.container || b.table || b.furnace || b.harvest) return baseUse.call(this, repeat, inp, fromOff);
      if (this.useBlockAt(hit, s, itemDef(s.id))) return;
      // a torch in the other hand goes on the wall you look at, not the map up to your face
      const off = p.inv.offhand, od = off && itemDef(off.id);
      if (s.id === 'filled_map' && od && od.block) { this.useOffhand(repeat, inp); return; }
    }
    this.useMapItem(s);
  };
  const baseHasUse = itemHasUse;
  itemHasUse = function (d) { return !!(d && d.mapItem) || baseHasUse(d); };
  const baseUpdate = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    if (this.mode === 'map') {
      if (!this.mapView) this.mode = 'play';
      else { this.mapView.frame(dt, inp); inp = InputManager.blankState(); }
    }
    const r = baseUpdate.call(this, dt, inp);
    const g = this.g, p = this.player;
    if (p.dead) { if (this.mapView) this.mapView.close(); return r; }
    if (this.mode === 'play' && inp.map) this.openBestMap();
    if (g.state === 'playing' && g.world) {
      for (const s of [p.inv.held, p.inv.offhand]) {
        if (!isMapStack(s)) continue;
        const m = mapForStack(g, this, s);
        if (m && m.dim === g.dim) mapExplore(g, this, m);
      }
    }
    return r;
  };
}
// the M key
{
  const at = KEY_ACTIONS.findIndex(a => a[0] === 'hideHud');
  KEY_ACTIONS.splice(at < 0 ? KEY_ACTIONS.length : at, 0, ['map', 'Look at your map', ['KeyM']]);
  KEY_DEFAULTS.map = ['KeyM'];
  const basePress = InputManager.prototype.pressCode;
  InputManager.prototype.pressCode = function (code, e) {
    const r = basePress.call(this, code, e);
    if (this.actionsFor(code).includes('map')) this.s.map = true;
    return r;
  };
  const baseEnd = InputManager.prototype.endFrame;
  InputManager.prototype.endFrame = function () { baseEnd.call(this); this.s.map = false; };
  const baseMerge = mergeInput;
  mergeInput = function (a, b) { const r = baseMerge(a, b); a.map = a.map || b.map; return r; };
}

// ---- crafting: copies and zooming out --------------------------------------------------------------------
{
  const baseMatch = matchGrid;
  matchGrid = function (slots, W) {
    let fm = null, nf = 0, ne = 0, np = 0, other = 0, fi = -1;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i]; if (!s) continue;
      if (s.id === 'filled_map') { nf++; fm = s; fi = i; } else if (s.id === 'empty_map') ne++; else if (s.id === 'paper') np++; else other++;
    }
    if (!nf) return baseMatch(slots, W);
    if (nf !== 1 || other) return null;
    // a map and empty maps: copies of the same map
    if (ne && !np) return { out: 'filled_map', n: ne + 1, idx: -1, w: 1, h: 1, extra: fm.map ? { map: fm.map } : undefined };
    // a map ringed with 8 paper: zoomed out to twice the area
    if (np === 8 && !ne && W === 3 && fi === 4) {
      const src = fm.map ? mapGet(MAPS.g, fm.map) : null;
      if (!src || src.scale >= MAP_MAX_SCALE) return null;
      return { out: 'filled_map', n: 1, idx: -1, w: 3, h: 3, make: () => ({ map: mapZoomed(src).id }) };
    }
    return null;
  };
  const baseMerge = canMerge;
  canMerge = function (a, b) { return baseMerge(a, b) && (a.id !== 'filled_map' || a.map === b.map); };
  const baseNorm = normalizeStack;
  normalizeStack = function (s) { const o = baseNorm(s); if (o && s.map) o.map = String(s.map); return o; };
  const baseInfo = itemInfoHTML;
  itemInfoHTML = function (s) {
    let h = baseInfo(s);
    if (s && s.id === 'filled_map') {
      const m = s.map ? mapGet(MAPS.g, s.map) : null;
      if (m) h += `<div class="ts">1:${1 << m.scale} · ${esc(DIM_NAME[m.dim] || '')} · ${Math.round(m.explored() * 100)}% explored</div><div class="td">x ${m.x0} to ${m.x0 + m.span - 1}, z ${m.z0} to ${m.z0 + m.span - 1}</div>`;
      else if (!s.map) h += '<div class="ts">Becomes a map of wherever you first hold it</div>';
      h += '<div class="td">Look down to read it · right-click or M to look closely · in an item frame it fills the frame</div>';
    } else if (s && s.id === 'empty_map') h += '<div class="td">Use it to start a map of where you stand</div>';
    return h;
  };
}

// ---- items, recipes, pictures, a rustle of paper ------------------------------------------------------
defItem('empty_map', { name: 'Empty Map', mapItem: true, desc: 'Use it to start a map of where you stand.' });
defItem('filled_map', { name: 'Map', mapItem: true, desc: 'Fills in as you explore while you hold it.' });
RECIPES.push(
  { out: 'empty_map', n: 1, shape: ['PPP', 'PCP', 'PPP'], key: { P: 'paper', C: 'compass' } },
  { out: 'filled_map', n: 2, items: ['filled_map', 'empty_map'] },
  { out: 'filled_map', n: 1, shape: ['PPP', 'PMP', 'PPP'], key: { P: 'paper', M: 'filled_map' } },
);
PACK_ITEM_NAMES.empty_map = ['map', 'map_empty'];
PACK_ITEM_NAMES.filled_map = ['filled_map', 'map_filled'];
{
  const basePaint = paintMobItems;
  paintMobItems = function () {
    basePaint();
    const H = hexRGB, pal = { k: H('#6a4a28'), p: H('#d8c494'), P: H('#ecdfb8'), g: H('#6f9a4a'), G: H('#8ab85a'), b: H('#4a78c8'), B: H('#6a98e0'), d: H('#a08050'), r: H('#d03a2a') };
    const sheet = (inner) => ['................', '.kkkkkkkkkkkkkk.', '.kppppppppppppk.', ...inner.map(r => '.kp' + r + 'pk.'), '.kppppppppppppk.', '.kkkkkkkkkkkkkk.', '................'];
    addItem('empty_map', p => p.art(sheet(Array.from({ length: 10 }, (_, i) => i === 3 || i === 6 ? 'PPpPPPPpPP' : 'PPPPPPPPPP')), pal));
    addItem('filled_map', p => p.art(sheet(['ggGGgBBBBB', 'gGGgggBBbB', 'GgdGgggBBB', 'ggGGGggBBB', 'gGggGgggBB', 'bBgggrgGgB', 'BBbgGggdgg', 'BBBbgGgggG', 'BbBBbggGGg', 'BBBBBgGggg']), pal));
  };
}
SND_FX.map_paper = [0.4, 0.5, (b, v, r) => {
  for (let k = 0; k < 4; k++) b.noise(k * 0.06 + r() * 0.02, 0.05 + r() * 0.03, 'bp', 2400 + r() * 2600, 0.9, 0.45 - k * 0.07, { att: 0.004 });
  b.noise(0, 0.22, 'hp', 3800, 0.7, 0.18, { att: 0.02 });
}];

// ---- saving, and starting over with each world ---------------------------------------------------------
{
  const baseCollect = World.prototype.collectDirty;
  World.prototype.collectDirty = function () {
    const out = baseCollect.call(this);
    if (MAPS.dirty.size && !this.isGuest) {
      for (const id of MAPS.dirty) { const m = MAPS.all.get(id); if (!m) continue; const rec = encodeMap(m); this.records.set(rec.k, rec); out.push(rec); }
      MAPS.dirty.clear();
    }
    return out;
  };
  const baseEnter = Game.prototype.enterWorld;
  Game.prototype.enterWorld = function (...a) {
    mapsReset(this);
    for (const l of this.locals || []) if (l.mapView) l.mapView.close();
    return baseEnter.apply(this, a);
  };
}

// ---- LAN: the host keeps the maps; guests ask for them and send back what they find -------------------------
function mapDelta(m) {
  if (m.net.size > 2500) return { t: 'mapfull', r: encodeMap(m) };
  const px = [];
  for (const i of m.net) px.push(i, m.ids[i], m.h[i], m.cl[i]);
  return { t: 'mapd', id: m.id, dim: m.dim, x0: m.x0, z0: m.z0, sc: m.scale, px };
}
function mapApplyDelta(g, msg) {
  let m = MAPS.all.get(msg.id) || mapGet(g, msg.id);
  if (!m) { m = new PaperMap(String(msg.id), msg.dim | 0, msg.x0 | 0, msg.z0 | 0, clamp(msg.sc | 0, 0, MAP_MAX_SCALE)); MAPS.all.set(m.id, m); MAPS.none.delete(m.id); }
  const px = msg.px || [];
  for (let k = 0; k + 3 < px.length; k += 4) { const i = px[k] | 0; if (i >= 0 && i < MAP_PIX && BLOCKS[px[k + 1]]) m.setPixel(i, px[k + 1] | 0, px[k + 2] & 255, px[k + 3] & 255, true); }
  return m;
}
function mapApplyFull(g, rec) {
  const inc = decodeMap(rec), m = MAPS.all.get(inc.id);
  if (!m) { MAPS.all.set(inc.id, inc); MAPS.none.delete(inc.id); MAPS.dirty.add(inc.id); return inc; }
  // what they explored lands on top of what we have (anything we're about to send stays ours)
  for (let i = 0; i < MAP_PIX; i++) if (inc.h[i] && !(m.net && m.net.has(i))) m.setPixel(i, inc.ids[i], inc.h[i], inc.cl[i], true);
  return m;
}
function mapNetTick(net, dt) {
  MAPS.netOn = true;
  if ((net._mapT = (net._mapT || 0) + dt) < 1) return;
  net._mapT = 0;
  for (const m of MAPS.all.values()) {
    if (!m.net || !m.net.size) continue;
    const msg = mapDelta(m);
    m.net.clear();
    if (net.role === 'host') { for (const peer of net.peers.values()) if (peer.ready && peer.maps && peer.maps.has(m.id)) net.to(peer.id, msg); }
    else net.send(msg);
  }
}
if (typeof Net === 'function') {
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (from && m && typeof m.t === 'string' && m.t.startsWith('map')) {
      const peer = this.peers.get(from), g = this.g;
      if (!peer || !peer.hello) return;
      const sub = (id) => (peer.maps || (peer.maps = new Set())).add(String(id));
      try {
        if (m.t === 'mapreq') {
          const mm = mapGet(g, String(m.id));
          if (mm) { sub(mm.id); this.to(from, { t: 'mapfull', r: encodeMap(mm) }); } else this.to(from, { t: 'mapnone', id: m.id });
        } else if (m.t === 'mapd' || m.t === 'mapfull') {
          const mm = m.t === 'mapd' ? mapApplyDelta(g, m) : mapApplyFull(g, m.r);
          sub(mm.id);
          for (const p of this.peers.values()) if (p.id !== from && p.maps && p.maps.has(mm.id)) this.to(p.id, m);
        } else if (m.t === 'mappins') {
          g.meta.mapPins = mapCleanPins(m.l);
          this.all({ t: 'mappins', l: g.meta.mapPins }, from); g.saveSoon();
        }
      } catch (e) { console.warn('map net', m.t, e); }
      return;
    }
    return baseHost.call(this, from, m);
  };
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && typeof m.t === 'string' && m.t.startsWith('map')) {
      const g = this.g;
      try {
        if (m.t === 'mapfull') mapApplyFull(g, m.r);
        else if (m.t === 'mapd') mapApplyDelta(g, m);
        else if (m.t === 'mapnone') { if (!MAPS.all.has(m.id)) MAPS.none.add(String(m.id)); }
        else if (m.t === 'mappins') g.meta.mapPins = mapCleanPins(m.l);
      } catch (e) { console.warn('map net', m.t, e); }
      return;
    }
    return baseGuest.call(this, m);
  };
  const baseHT = Net.prototype.hostTick, baseGT = Net.prototype.guestTick;
  Net.prototype.hostTick = function (dt) { baseHT.call(this, dt); try { mapNetTick(this, dt); } catch (e) { console.warn('map net', e); } };
  Net.prototype.guestTick = function (dt) { baseGT.call(this, dt); try { mapNetTick(this, dt); } catch (e) { console.warn('map net', e); } };
  const baseWelcome = Net.prototype.welcome;
  Net.prototype.welcome = function (peer, m) {
    const r = baseWelcome.call(this, peer, m);
    if (peer.hello && this.g.meta.mapPins && this.g.meta.mapPins.length) this.to(peer.id, { t: 'mappins', l: this.g.meta.mapPins });
    return r;
  };
}

// ---- (0.9.0.45) a map in someone's hands, as everyone else sees it ------------------------------------------------
// Held up in both hands in front of the chest (or in one hand when the other is busy), with the real map on it facing
// its holder: look over a partner's shoulder and you can read it, from in front you see the back of the paper.
// The map's id travels with the pose (over the network too), and a guest fetches the map from the host as usual.
{
  const basePose = LocalPlayer.prototype.pose;
  LocalPlayer.prototype.pose = function () {
    const ps = basePose.call(this), p = this.player, main = p.inv.held, off = p.inv.offhand;
    if (!p.carrying && !p.dead) {
      if (isMapStack(main) && main.map) ps.mapId = String(main.map);
      if (isMapStack(off) && off.map) ps.offMapId = String(off.map);
    }
    return ps;
  };
  const busy = (pose) => !pose || pose.fp || pose.carry || pose.sleep || pose.swim || pose.hang || pose.deathT || pose.invis;
  const baseAnim = avatarAnim;
  avatarAnim = function (pose) {
    const A = baseAnim(pose);
    if (busy(pose) || (pose.swing > 0) || !(pose.mapId || pose.offMapId)) return A;
    if (pose.mapId && !pose.off) { A.armR = [0.95, 0, -0.3]; A.armL = [0.95, 0, 0.3]; }       // both hands on the sheet
    else {
      if (pose.mapId) A.armR = [0.9, 0, -0.1];
      if (pose.offMapId) A.armL = [0.9, 0, 0.1];
    }
    return A;
  };
  const baseDraws = avatarDraws;
  avatarDraws = function (out, gl, skin, pose) {
    const mapId = busy(pose) ? null : pose.mapId, offId = busy(pose) ? null : pose.offMapId;
    if (!mapId && !offId) return baseDraws(out, gl, skin, pose);
    const p2 = Object.assign({}, pose); if (mapId) p2.held = null; if (offId) p2.off = null;
    const n0 = out.length;
    baseDraws(out, gl, skin, p2);
    const g = typeof GAME !== 'undefined' ? GAME : null;
    if (out.length === n0 || !g || !g.renderer || !g.local) return;
    try {
      const both = mapId && !pose.off, drop = pose.sneak ? 0.22 : 0;
      const sheets = both ? [[mapId, 0, 0.46]] : [mapId && [mapId, -1, 0.34], offId && [offId, 1, 0.34]].filter(Boolean);
      for (const [id, side, S] of sheets) {
        const M = Mat4.create();
        Mat4.rotateY(M, pose.yaw);
        Mat4.translate(M, side * 0.2, 0.98 - drop, -0.5);
        if (side) Mat4.rotateY(M, side * 0.35);
        Mat4.rotateX(M, -0.95);                                  // tipped up toward its holder's eyes
        const list = [];
        mapSheetDraws(g, g.local, mapGet(g, id), M, S, list);
        list.forEach((d, i) => { if (i > 0) d.noCull = false; out.push(Object.assign(d, { px: pose.x, py: pose.y, pz: pose.z, light: pose.light })); });
      }
    } catch (e) { if (!MAPS._warnedHeld) { MAPS._warnedHeld = true; console.warn('map held', e); } }
  };
}
