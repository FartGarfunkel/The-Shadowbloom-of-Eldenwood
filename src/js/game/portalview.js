// ---------------------------------------------------------------------------
// game/portalview.js — 0.9.0.14: portals you can see through.
//
// A portal is a window: look into it and you see the world on the other side,
// live, from exactly where you'd stand if you stepped through, turning and
// shifting as you move. Walk through and you're there, with no loading screen
// (the far side is already made, it's what you were looking at); turn round
// and the portal you came out of shows the way home.
//
// Ember and Skylands portals find (or build) their far end as soon as they're
// lit, so they're windows from the start. The rift in the village square shows
// his realm, a torn hole in the air with a ragged, shifting edge; the way out
// of the realm shows the village.
//
// (0.9.0.17) Every portal you can see is a window at once, an Ember portal and
// a Skylands portal side by side included, near or far, and in split screen
// for each player; the window is drawn so it never loses out to the portal's
// own picture behind it, however far off you stand.
//
// How: each far world is loaded in the background round its far portal, and
// drawn each frame into a picture from a camera placed at the far portal the
// way you are at this one (anything between that camera and the far portal is
// cut away), then the picture is laid over the portal in screen space.
// ---------------------------------------------------------------------------
const PV = { prog: null, vao: null, vb: null, ib: null, mb: null, shadows: new Map(), scanT: 0, wins: [], lives: [], live: null, fades: new Map(), dests: new Map(), failed: new Set(), views: [], extra: [], lastS: {}, MAX: 3, DIMS: 3 };
// the far world for a dimension (compatibility: PV.shadow is the first one)
Object.defineProperty(PV, 'shadow', { get() { return PV.shadows.values().next().value || null; } });

// ---- where the portals are -------------------------------------------------------------------------------------
// every portal cell in a chunk, found once (and again whenever a portal block there changes)
function pvChunkCells(w, ch) {
  if (ch._pv) return ch._pv;
  const out = [], bx = ch.cx * 16, bz = ch.cz * 16, top = Math.min(CH - 1, (ch.maxY || CH - 1) + 1);
  for (let y = 0; y <= top; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    const id = ch.blocks[cidx(x, y, z)];
    if (id && (T_PORTAL[id] || PV_FLAT[id])) out.push([bx + x, y, bz + z, id, PV_FLAT[id] ? 2 : ch.meta[cidx(x, y, z)] & 1]);
  }
  return (ch._pv = out);
}
// lying-down portals (the End's): filled in by game/theend.js
const PV_FLAT = new Uint8Array(4096);
// the portals near a point: each one a flat window of cells
function pvWindows(g, px, pz) {
  const w = g.world, cells = new Map();
  const cx0 = Math.floor(px) >> 4, cz0 = Math.floor(pz) >> 4, R = Math.max(1, Math.min(g.renderDist(), 8));
  let fresh = 0;
  // as far as you can see; chunks not looked through yet are done a few at a time, nearest first
  for (let r = 0; r <= R; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
    const ch = w.chunkAt(cx0 + dx, cz0 + dz);
    if (!ch || !ch.blocks) continue;
    if (!ch._pv) { if (r > 1 && fresh >= 6) continue; fresh++; }
    for (const c of pvChunkCells(w, ch)) cells.set(c[0] + ',' + c[1] + ',' + c[2], c);
  }
  const wins = [], seen = new Set();
  const STEP = [[[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]], [[0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]];
  for (const [k, c] of cells) {
    if (seen.has(k)) continue;
    const id = c[3], axis = c[4], list = [], q = [c]; seen.add(k);
    while (q.length && list.length < 450) {
      const a = q.pop(); list.push(a);
      for (const [dx, dy, dz] of STEP[axis]) {
        const kk = (a[0] + dx) + ',' + (a[1] + dy) + ',' + (a[2] + dz), n = cells.get(kk);
        if (n && !seen.has(kk) && n[3] === id) { seen.add(kk); q.push(n); }
      }
    }
    // its anchor, the way game/portallinks.js names a portal: lowest, then least x, then least z
    let an = list[0];
    for (const a of list) if (a[1] < an[1] || (a[1] === an[1] && (a[0] < an[0] || (a[0] === an[0] && a[2] < an[2])))) an = a;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const a of list) { x0 = Math.min(x0, a[0]); x1 = Math.max(x1, a[0]); y0 = Math.min(y0, a[1]); y1 = Math.max(y1, a[1]); z0 = Math.min(z0, a[2]); z1 = Math.max(z1, a[2]); }
    if (axis === 2) {
      // lying flat: a hole in the floor, looked down into
      const top = y0 + 0.75, win = { kind: 'flat', id, axis, cells: list, anchor: [an[0], an[1], an[2]], box: [x0, y0, z0, x1, y1, z1], y0: top, c: [(x0 + x1 + 1) / 2, top, (z0 + z1 + 1) / 2], n: [0, 1, 0], dim: g.dim, walk: true };
      win.dest = typeof pvFlatDest === 'function' ? pvFlatDest(g, win) : null;
      if (win.dest) wins.push(win);
      continue;
    }
    wins.push({ kind: 'block', id, axis, cells: list, anchor: [an[0], an[1], an[2]], box: [x0, y0, z0, x1, y1, z1], y0, c: [(x0 + x1 + 1) / 2, (y0 + y1 + 1) / 2, (z0 + z1 + 1) / 2], n: axis ? [1, 0, 0] : [0, 0, 1], dim: g.dim });
  }
  return wins;
}
const pvKey = (w) => w.kind + ':' + (w.anchor ? w.anchor.join(',') : w.tear ? w.tear.kind + w.tear.x : w.c.join(','));
// the rift's tears, as windows
function pvRiftWindows(g) {
  const out = [];
  if (typeof RIFT === 'undefined') return out;
  const R = riftOf(g);
  for (const t of RIFT.tears) {
    if (t.remove || t.kind === 'micro') continue;
    const [w, h] = t.size();
    let to = null;
    if (g.dim === 0 && (t.kind === 'gate' || t.kind === 'window')) to = { dim: DIM.REALM, c: [3.5, RIFT_FLOOR + 1 + 2.1, 0.5], y0: RIFT_FLOOR + 1, n: [1, 0, 0] };
    else if (g.dim === DIM.REALM && t.kind === 'exit' && t.x < 20 && R.at) { const yy = R.yaw || 0; to = { dim: 0, c: [R.at[0], R.at[1] + (R.stage >= 3 ? 2.1 : 1.7), R.at[2]], y0: R.at[1], n: [Math.sin(yy), 0, Math.cos(yy)] }; }
    if (!to) continue;
    out.push({ kind: 'rift', tear: t, w, h, c: [t.x, t.y + h / 2, t.z], y0: t.y, n: [Math.sin(t.yaw), 0, Math.cos(t.yaw)], along: [Math.cos(t.yaw), 0, -Math.sin(t.yaw)], dest: to, dim: g.dim, walk: t.kind !== 'window' });
  }
  return out;
}
// where a block portal leads: the far portal it's linked to, its shape worked out once the far world is there
function pvDest(g, win) {
  if (win.kind !== 'block') return win.dest;
  const links = g.meta.portalLinks || {}, L = links[g.dim + ':' + win.anchor.join(',')];
  if (!L) return null;
  const key = L.dim + ':' + L.anchor.join(','), sh = PV.shadows.get(L.dim);
  let d = PV.dests.get(key);
  if (d && d.n) return d;
  if (!d) { d = { dim: L.dim, anchor: L.anchor, c: [L.anchor[0] + 0.5, L.anchor[1] + 1.5, L.anchor[2] + 0.5], y0: L.anchor[1], n: null }; PV.dests.set(key, d); }
  // once the far world has the chunk, flood the far portal for its middle and which way it faces
  if (sh && sh.world.chunkAt(L.anchor[0] >> 4, L.anchor[2] >> 4)) {
    const W = sh.world, id = W.getBlock(L.anchor[0], L.anchor[1], L.anchor[2]);
    if (!T_PORTAL[id]) return d;
    const axis = W.getMeta(L.anchor[0], L.anchor[1], L.anchor[2]) & 1, q = [L.anchor], seen = new Set([L.anchor.join(',')]);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9, n = 0;
    while (q.length && n < 450) {
      const a = q.pop(); n++;
      x0 = Math.min(x0, a[0]); x1 = Math.max(x1, a[0]); y0 = Math.min(y0, a[1]); y1 = Math.max(y1, a[1]); z0 = Math.min(z0, a[2]); z1 = Math.max(z1, a[2]);
      for (const [dx, dy, dz] of axis ? [[0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] : [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]]) {
        const b = [a[0] + dx, a[1] + dy, a[2] + dz], k = b.join(',');
        if (!seen.has(k) && W.getBlock(b[0], b[1], b[2]) === id) { seen.add(k); q.push(b); }
      }
    }
    d.c = [(x0 + x1 + 1) / 2, (y0 + y1 + 1) / 2, (z0 + z1 + 1) / 2]; d.y0 = y0; d.n = axis ? [1, 0, 0] : [0, 0, 1];
  }
  return d;
}

// ---- carrying a view (or a person) from one portal to the other ----------------------------------------------------
// turning a direction by d (the way yaw turns): forward (-sin a, -cos a) becomes (-sin(a+d), -cos(a+d))
const pvTurn = (x, z, d) => [x * Math.cos(d) + z * Math.sin(d), z * Math.cos(d) - x * Math.sin(d)];
const pvYawOf = (n) => Math.atan2(-n[0], -n[2]);
function pvMap(win, dest, p) {
  if (win.kind === 'flat') return { x: dest.c[0] + (p.x - win.c[0]), y: dest.y0 + (p.y - win.y0), z: dest.c[2] + (p.z - win.c[2]), d: 0 };
  // a tear has no back: from either side you look into the same place
  let wn = win.n;
  if (win.kind === 'rift' && wn[0] * (p.x - win.c[0]) + wn[2] * (p.z - win.c[2]) > 0) wn = [-wn[0], 0, -wn[2]];
  const d = pvYawOf(dest.n) - pvYawOf(wn);
  const [ox, oz] = pvTurn(p.x - win.c[0], p.z - win.c[2], d);
  // up and down, floor to floor: a portal sunk into the ground (walk straight in) lines up with one you step up into
  const fy = win.y0 !== undefined && dest.y0 !== undefined ? dest.y0 + (p.y - win.y0) : dest.c[1] + (p.y - win.c[1]);
  return { x: dest.c[0] + ox, y: fy, z: dest.c[2] + oz, d };
}

// ---- the far worlds, kept ready in the background ----------------------------------------------------------------------
function pvShadow(g, dim) {
  let sh = PV.shadows.get(dim);
  if (!sh) { sh = { dim, world: g.makeShadowWorld(dim) }; PV.shadows.set(dim, sh); }
  return sh;
}
function pvRelease(g, dim) {
  if (dim === undefined) { for (const d of [...PV.shadows.keys()]) pvRelease(g, d); PV.live = null; PV.lives = []; return; }
  const sh = PV.shadows.get(dim); PV.shadows.delete(dim);
  for (const k of [...PV.dests.keys()]) if (k.startsWith(dim + ':')) PV.dests.delete(k);
  if (!sh || !sh.world) return;
  const w = sh.world;
  for (const c of w.chunks.values()) if (c.modified && c.dirty) { g.records.set(c.key, encodeChunk(c)); if (g.world) g.world.unsaved.add(c.key); c.dirty = false; }
  w.unloadAll();
}
function pvTick(g, dt) {
  if (!g.world || g.state !== 'playing' || g._traveling || g.isGuest || !g.locals.length || g.settings.portalViews === false) { if (PV.shadows.size && (g.isGuest || g.settings.portalViews === false)) pvRelease(g); return; }
  const locs = g.locals;
  if ((PV.scanT -= Math.min(0.25, dt || 1 / 30)) <= 0) {
    PV.scanT = 0.5;
    const seen = new Set(), all = [];
    for (const l of locs) for (const w of pvWindows(g, l.player.x, l.player.z)) { const k = pvKey(w); if (!seen.has(k)) { seen.add(k); all.push(w); } }
    PV.wins = all.concat(pvRiftWindows(g));
    for (const f of PV.extra) { try { PV.wins.push(...f(g)); } catch (e) { console.warn('portal windows', e); } }
  }
  // for each player: the portals in range that lead somewhere, nearest first, and the nearest that's never been used
  const far = Math.max(48, g.renderDist() * 16);
  let pend = null, pd = 28;
  const picks = locs.map(l => {
    const p = l.player, list = [];
    for (const win of PV.wins) {
      const d = Math.hypot(win.c[0] - p.x, win.c[1] - p.y - 1.6, win.c[2] - p.z);
      if (d >= far) continue;
      const dest = pvDest(g, win);
      if (dest) list.push({ win, dest, d });
      else if (win.kind === 'block' && d < pd && !PV.failed.has(g.dim + ':' + win.anchor.join(','))) { pend = win; pd = d; }
    }
    list.sort((a, b) => a.d - b.d);
    return list.slice(0, PV.MAX);
  });
  // the far worlds wanted: the first player's first, up to a few
  const dims = [];
  for (const list of picks) for (const k of list) if (!dims.includes(k.dest.dim) && dims.length < PV.DIMS) dims.push(k.dest.dim);
  // (0.9.0.15) a portal that's never been used: find (or build) its far end now, so it's a window straight away
  let pendDim = null;
  if (pend) { const kind = pend.id === B.sky_portal ? 'sky' : 'ember'; pendDim = g.dim === DIM.OVERWORLD ? PORTAL_KIND[kind].dim : DIM.OVERWORLD; }
  for (const d of [...PV.shadows.keys()]) if (!dims.includes(d) && d !== pendDim) pvRelease(g, d);
  if (pend && (dims.includes(pendDim) || dims.length < PV.DIMS)) pvPrelink(g, pend);
  // keep each far world ready round where its windows look out
  for (const dim of dims) {
    const w = pvShadow(g, dim).world, centers = [];
    let near = 99;
    for (const list of picks) for (const k of list) if (k.dest.dim === dim) { centers.push([k.dest.c[0], k.dest.c[2]]); near = Math.min(near, k.d); }
    worldStream(g, w, centers, near < 12 ? Math.min(g.renderDist(), 5) : 3, g.fps < 30 ? 1 : 2.5, (c) => g.meshInto(w, c));
  }
  PV.lives = picks.map(list => list.filter(k => {
    const sh = PV.shadows.get(k.dest.dim);
    return sh && sh.world.chunkAt(Math.floor(k.dest.c[0]) >> 4, Math.floor(k.dest.c[2]) >> 4) && (k.win.kind !== 'block' || k.dest.n);
  }).map(k => ({ win: k.win, dest: k.dest })));
  PV.live = (PV.lives[0] && PV.lives[0][0]) || (PV.lives.find(a => a.length) || [])[0] || null;
  // walking through: you're across the moment you pass its middle, no waiting in it
  for (let i = 0; i < locs.length; i++) {
    const lp = locs[i], p = lp.player;
    for (const L of PV.lives[i] || []) {
      const W = L.win;
      if (!(W.kind === 'block' || W.walk) || !pvCanSwap(g, L.dest.dim, L)) continue;
      const n = W.n, s = n[0] * (p.x - W.c[0]) + n[1] * (p.y - W.c[1]) + n[2] * (p.z - W.c[2]), key = i + '|' + pvKey(W);
      let inside;
      if (W.kind === 'block') { const b = W.box, a = W.axis ? p.z : p.x, lo = W.axis ? b[2] : b[0], hi = (W.axis ? b[5] : b[3]) + 1; inside = p.y + 0.3 >= b[1] && p.y < b[4] + 1 && a > lo - 0.1 && a < hi + 0.1; }
      else if (W.kind === 'flat') { const b = W.box; inside = p.x > b[0] && p.x < b[3] + 1 && p.z > b[2] && p.z < b[5] + 1; }
      else { const al = W.along, lat = al[0] * (p.x - W.c[0]) + al[2] * (p.z - W.c[2]); inside = Math.abs(lat) < W.w / 2 && p.y > W.y0 - 0.5 && p.y < W.y0 + W.h; }
      if (!(inside && Math.abs(s) < 1.6)) { if (PV.lastS[key] !== undefined) delete PV.lastS[key]; continue; }
      if (W.kind === 'block') { p.portalCooldown = Math.max(p.portalCooldown || 0, 0.3); p.portalTime = 0; }
      else if (W.kind === 'rift') lp.riftCd = Math.max(lp.riftCd || 0, 0.3);
      const prev = PV.lastS[key];
      if (prev !== undefined && prev * s < 0 && g.time - (PV.swapT || -9) > 0.35) {
        PV.lastS = {}; PV.swapT = g.time;
        if (W.kind === 'rift') { PV.live = L; riftTravel(g, L.dest.dim, lp); } else pvSwap(g, L.dest.dim, lp, L);
        return;
      }
      PV.lastS[key] = s;
    }
  }
}

// A portal nobody has been through yet: the far world is loaded round where it would come out, the portal
// there found or built (just as going through would), and the two linked, both ways.
function pvPrelink(g, win) {
  const kind = win.id === B.sky_portal ? 'sky' : 'ember', K = PORTAL_KIND[kind];
  const to = g.dim === DIM.OVERWORLD ? K.dim : DIM.OVERWORLD;
  if (to === g.dim) return;
  const W = pvShadow(g, to).world, x = win.c[0], z = win.c[2];
  worldStream(g, W, [[x, z]], 3, g.fps < 30 ? 1 : 2, (c) => g.meshInto(W, c));
  const cx = Math.floor(x) >> 4, cz = Math.floor(z) >> 4;
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (!W.chunkAt(cx + dx, cz + dz)) return;   // not there yet
  const key = g.dim + ':' + win.anchor.join(','), links = g.meta.portalLinks || (g.meta.portalLinks = {});
  const pos = arrivePortal(W, x, z, kind);
  const there = pos && (portalAnchor(W, pos[0], pos[1], pos[2]) || portalAnchor(W, pos[0] - 1, pos[1], pos[2] - 1));
  if (!there) { PV.failed.add(key); return; }
  links[key] = { dim: to, anchor: there, pos };
  links[to + ':' + there.join(',')] = { dim: g.dim, anchor: win.anchor.slice(), pos: portalStand(g.world, win.anchor) };
  PV.scanT = 0;
}

// ---- drawing -----------------------------------------------------------------------------------------------------
const PV_VS = `#version 300 es
precision highp float;
in vec3 aPos; in vec2 aUV;
uniform mat4 uProj; uniform mat4 uView;
out vec2 vUV;
void main() { vUV = aUV; gl_Position = uProj * uView * vec4(aPos, 1.0); }`;
const PV_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex; uniform vec2 uOrigin; uniform vec2 uSize; uniform float uTime; uniform float uTorn; uniform float uFade; uniform vec3 uRim;
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
void main() {
  vec2 sc = (gl_FragCoord.xy - uOrigin) / uSize;
  vec3 col = texture(uTex, sc).rgb;
  float edge;
  if (uTorn > 0.5) {
    vec2 c = vUV * 2.0 - 1.0;
    float a = atan(c.y, c.x), r = length(c);
    float lim = 0.8 + (vnoise(vec2(a * 2.5 + 3.0, uTime * 0.5)) - 0.5) * 0.3 + (vnoise(vec2(a * 9.0, uTime * 1.4)) - 0.5) * 0.12;
    if (r > lim) discard;
    edge = (lim - r) * 10.0;
  } else {
    edge = min(min(vUV.x, 1.0 - vUV.x), min(vUV.y, 1.0 - vUV.y)) * 9.0;
  }
  float gl = 1.0 - clamp(edge, 0.0, 1.0);
  gl = gl * gl * (0.75 + 0.25 * sin(uTime * 3.0 + vUV.y * 14.0 + vUV.x * 5.0));
  col = mix(col, uRim, gl * 0.8);
  col = mix(uRim * 0.55, col, uFade);
  o = vec4(col, 1.0);
}`;
function pvSetup(gl, w, h, vi = 0) {
  if (!PV.prog) {
    PV.prog = compileProgram(gl, PV_VS, PV_FS, 'portal');
    PV.vao = gl.createVertexArray(); gl.bindVertexArray(PV.vao);
    PV.vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, PV.vb); gl.bufferData(gl.ARRAY_BUFFER, 4096 * VSTRIDE, gl.DYNAMIC_DRAW); bindVertexLayout(gl);
    PV.ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, PV.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 6144 * 4, gl.DYNAMIC_DRAW);
    gl.bindVertexArray(null);
    PV.mb = new MeshBuilder(1024);
  }
  // one picture for each window each player sees
  const V = PV.views[vi] || (PV.views[vi] = { fb: null, tex: null, depth: null, w: 0, h: 0 });
  if (V.fb && V.w === w && V.h === h) return V;
  if (V.fb) { gl.deleteFramebuffer(V.fb); gl.deleteTexture(V.tex); gl.deleteRenderbuffer(V.depth); }
  V.w = w; V.h = h;
  V.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, V.tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  V.depth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, V.depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
  V.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, V.fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, V.tex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, V.depth);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return V;
}
// the picture through the portal: the far world from the far portal, the way you'd see it standing here
function pvRenderView(g, l, rect, L = PV.live, vi = 0, camera = null) {
  if (!L || !PV.shadows.has(L.dest.dim)) return null;
  const r = g.renderer, gl = r.gl, cam = camera || l.cam;
  if (!cam) return null;
  const { win, dest } = L;
  const vx = win.c[0] - cam.x, vy = win.c[1] - cam.y, vz = win.c[2] - cam.z, dist = Math.hypot(vx, vy, vz);
  const fx = -Math.sin(cam.yaw) * Math.cos(cam.pitch), fy = Math.sin(cam.pitch), fz = -Math.cos(cam.yaw) * Math.cos(cam.pitch);
  if (dist > 3) {
    // only when some of it is on screen
    const aspect = rect.w / Math.max(1, rect.h), half = Math.atan(Math.tan(cam.fov * Math.PI / 360) * Math.sqrt(1 + aspect * aspect));
    const rad = win.box ? Math.hypot(win.box[3] - win.box[0] + 1, win.box[4] - win.box[1] + 1, win.box[5] - win.box[2] + 1) / 2 : Math.hypot(win.w, win.h) / 2;
    const ang = Math.acos(clamp((vx * fx + vy * fy + vz * fz) / dist, -1, 1));
    if (ang > half + Math.asin(Math.min(1, rad / dist)) + 0.08) return null;
  }
  const m = pvMap(win, dest, cam);
  const vc = { x: m.x, y: m.y, z: m.z, yaw: cam.yaw + m.d, pitch: cam.pitch, roll: cam.roll || 0, fov: cam.fov };
  // cut away what's between that camera and the far portal
  let n = dest.n.slice(); const side = n[0] * (vc.x - dest.c[0]) + n[1] * (vc.y - dest.c[1]) + n[2] * (vc.z - dest.c[2]);
  if (side > 0) n = n.map(v => -v);
  const clip = [n[0], n[1], n[2], n[0] * (vc.x - dest.c[0]) + n[1] * (vc.y - dest.c[1]) + n[2] * (vc.z - dest.c[2]) - (win.kind === 'block' || dest.n ? 0.52 : 0.05)];   // just past the far portal itself
  // far off it covers little of the screen: a smaller picture does
  const k = dist < 12 ? 0.6 : dist < 32 ? 0.45 : 0.32;
  const W = Math.max(64, Math.round(rect.w * k)), H = Math.max(64, Math.round(rect.h * k));
  const V = pvSetup(gl, W, H, vi);
  gl.bindFramebuffer(gl.FRAMEBUFFER, V.fb);
  const env = g.computeEnv(dest.dim);
  // (0.9.0.18) whoever and whatever's over there, live: creatures, items, the other player
  const drawList = [], parts = [];
  const dc = g.ctxs && g.ctxs.get(dest.dim);
  if (dc && dc !== g.ctx) {
    const keep = g.ctx, keepL = g.locals, all = g.allLocals();
    g.useCtx(dc); g.locals = all.filter(o => o.player.dim === dest.dim);
    try {
      const glows = [];
      for (const e of g.entities) { e.draws(drawList, l); if (e.glow) e.glow(glows); }
      if (g.fauna && g.fauna.draws) g.fauna.draws(drawList, glows);
      if (typeof blockEntityDraws === 'function') blockEntityDraws(g, drawList, vc, 3);
      for (const o of g.locals) if (!o.player.dead) avatarDraws(drawList, r.gl, o.skin, o.pose());
      for (const q of g.particles.list) parts.push(q);
      for (const q of glows) parts.push(q);
    } catch (e) { console.warn('portal view creatures', e); }
    finally { g.locals = keepL; g.useCtx(keep); }
  }
  try {
    r.render({ camera: vc, renderDist: Math.min(g.renderDist(), 4), env, time: g.time, dim: dest.dim, drawList, decals: [], particles: parts, lights: [], target: null, crack: -1, hand: null, clip, clouds: g.cloudScene ? g.cloudScene(dest.dim) : null }, { x: 0, y: 0, w: W, h: H });
  } finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
  return V;
}
// the windows themselves, laid over their portals (both faces, inside and out), each showing its picture
Renderer.prototype.portalPass = function (S, cam) {
  const list = S.portals; if (!list || !PV.prog) return;
  const gl = this.gl, P = PV.prog, mb = PV.mb;
  gl.useProgram(P.p);
  gl.uniformMatrix4fv(P.u.uProj, false, this.proj); gl.uniformMatrix4fv(P.u.uView, false, this.view);
  gl.uniform1f(P.u.uTime, S.time);
  gl.disable(gl.CULL_FACE);
  // drawn a little in front of the portal's own faces in the depth buffer, so far off the window still wins
  gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-2, -8);
  gl.bindVertexArray(PV.vao);
  const ox = cam.x, oy = cam.y, oz = cam.z;
  const V = (x, y, z, u, v) => mb.vert(x - ox, y - oy, z - oz, u, v, 255, 255, 255);
  for (const PS of list) {
    if (!PS || !PS.tex) continue;
    const { win } = PS;
    mb.reset();
    if (win.kind === 'block') {
      const [x0, y0, z0, x1, y1, z1] = win.box, e = 0.004;
      for (const c of win.cells) {
        const [x, y, z] = c;
        const u0 = win.axis ? (z - z0) / (z1 - z0 + 1) : (x - x0) / (x1 - x0 + 1), u1 = u0 + 1 / ((win.axis ? z1 - z0 : x1 - x0) + 1);
        const v0 = (y - y0) / (y1 - y0 + 1), v1 = v0 + 1 / (y1 - y0 + 1);
        for (const s of [-e, e, 1 - e, 1 + e]) {
          let a, b, cc, d;
          if (win.axis) { a = V(x + s, y, z, u0, v0); b = V(x + s, y, z + 1, u1, v0); cc = V(x + s, y + 1, z + 1, u1, v1); d = V(x + s, y + 1, z, u0, v1); }
          else { a = V(x, y, z + s, u0, v0); b = V(x + 1, y, z + s, u1, v0); cc = V(x + 1, y + 1, z + s, u1, v1); d = V(x, y + 1, z + s, u0, v1); }
          mb.quad(a, b, cc, d, false);
        }
      }
    } else if (win.kind === 'flat') {
      const [x0, , z0, x1, , z1] = win.box;
      for (const c of win.cells) {
        const [x, y, z] = c;
        const u0 = (x - x0) / (x1 - x0 + 1), u1 = u0 + 1 / (x1 - x0 + 1), v0 = (z - z0) / (z1 - z0 + 1), v1 = v0 + 1 / (z1 - z0 + 1);
        for (const yy of [y + 0.755, y + 0.715]) mb.quad(V(x, yy, z, u0, v0), V(x + 1, yy, z, u1, v0), V(x + 1, yy, z + 1, u1, v1), V(x, yy, z + 1, u0, v1), false);
      }
    } else {
      const [cx, cy, cz] = win.c, al = win.along, hw = win.w * 0.62, hh = win.h * 0.56;
      mb.quad(V(cx - al[0] * hw, cy - hh, cz - al[2] * hw, 0, 0), V(cx + al[0] * hw, cy - hh, cz + al[2] * hw, 1, 0), V(cx + al[0] * hw, cy + hh, cz + al[2] * hw, 1, 1), V(cx - al[0] * hw, cy + hh, cz - al[2] * hw, 0, 1), false);
    }
    const r = mb.result(); if (!r) continue;
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, PS.tex); gl.uniform1i(P.u.uTex, 0);
    gl.uniform2f(P.u.uOrigin, PS.rect.x, PS.rect.y); gl.uniform2f(P.u.uSize, PS.rect.w, PS.rect.h);
    gl.uniform1f(P.u.uTorn, win.kind === 'rift' ? 1 : 0); gl.uniform1f(P.u.uFade, PS.fade ?? 1);
    const rim = win.rim || (win.kind === 'rift' ? [0.75, 0.3, 1.0] : win.id === B.sky_portal ? [0.55, 0.85, 1.0] : [1.0, 0.45, 0.12]);
    gl.uniform3f(P.u.uRim, rim[0], rim[1], rim[2]);
    gl.bindBuffer(gl.ARRAY_BUFFER, PV.vb); gl.bufferData(gl.ARRAY_BUFFER, r.verts, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, PV.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, r.idx, gl.DYNAMIC_DRAW);
    gl.drawElements(gl.TRIANGLES, r.count, gl.UNSIGNED_INT, 0);
  }
  gl.disable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(0, 0);
  gl.enable(gl.CULL_FACE);
  gl.bindVertexArray(null);
  gl.bindTexture(gl.TEXTURE_2D, this.tex);
};
{
  // each frame: keep the far sides ready; the views themselves are drawn just before each player's own view,
  // from exactly the camera that view uses (so a window never lags or swims as you turn)
  const baseViews = Game.prototype.renderViews;
  Game.prototype.renderViews = function (dt, R) {
    PV.game = this;
    try { PV.ticks = (PV.ticks || 0) + 1; pvTick(this, dt); } catch (e) { console.warn('portal view', e); PV.err = String(e && e.stack || e); }
    const dpr = this.renderer.canvas.width / Math.max(1, window.innerWidth), seenKeys = new Set();
    this.locals.forEach((l, i) => {
      const lives = (this.state === 'playing' && l.view && PV.lives && PV.lives[i]) || [];
      const v = l.view;
      l._pvPend = lives.length ? { pending: true, l, i, lives, rect: { x: Math.round(v.x * dpr), y: Math.round((window.innerHeight - v.y - v.h) * dpr), w: Math.round(v.w * dpr), h: Math.round(v.h * dpr) } } : null;
      // a window fades in once, when it first opens, and keeps its picture from then on
      for (const L of lives) { const key = i + '|' + pvKey(L.win); seenKeys.add(key); PV.fades.set(key, Math.min(1, (PV.fades.get(key) || 0) + dt * 2.5)); }
    });
    for (const k of [...PV.fades.keys()]) if (!seenKeys.has(k)) PV.fades.delete(k);
    // the rift's tear is drawn as a window only when everyone looking has it as one
    for (const t of (typeof RIFT !== 'undefined' ? RIFT.tears : [])) t.pvLive = this.locals.length > 0 && this.locals.every(l => l._pvPend && l._pvPend.lives.some(L => L.win.tear === t));
    return baseViews.call(this, dt, R);
  };
  Game.prototype.portalScene = function (l = this.locals[0]) { return l ? l._pvPend : null; };
  const baseRender = Renderer.prototype.render;
  Renderer.prototype.render = function (S, rect) {
    const pend = S.portals;
    if (pend && pend.pending) {
      const g = PV.game, scenes = [];
      S.portals = null;
      pend.lives.forEach((L, k) => {
        try { const V = pvRenderView(g, pend.l, pend.rect, L, pend.i * PV.MAX + k, S.camera); if (V) scenes.push({ win: L.win, rect: pend.rect, tex: V.tex, fade: PV.fades.get(pend.i + '|' + pvKey(L.win)) ?? 1 }); }
        catch (e) { console.warn('portal view render', e); PV.err = String(e && e.stack || e); this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null); }
      });
      S.portals = scenes.length ? scenes : null;
    }
    return baseRender.call(this, S, rect);
  };
  // a portal block placed or broken: look again
  const baseChanged = Game.prototype.onBlockChanged;
  Game.prototype.onBlockChanged = function (x, y, z, o, n, opts) {
    const r = baseChanged.call(this, x, y, z, o, n, opts);
    if (T_PORTAL[o] || T_PORTAL[n] || PV_FLAT[o] || PV_FLAT[n]) { const ch = this.world && this.world.chunkAt(x >> 4, z >> 4); if (ch) ch._pv = null; PV.scanT = 0; PV.dests.clear(); }
    return r;
  };
  // going somewhere the slow way: the far worlds we kept go too (all but the one being stepped into)
  const baseLoad = Game.prototype.loadDimension;
  Game.prototype.loadDimension = function (dim) {
    for (const [d, sh] of [...PV.shadows]) if (sh.world !== this._pvKeep && !(this._preWorld && this._preWorld === sh.world)) pvRelease(this, d);
    return baseLoad.call(this, dim);
  };
  // the rift's tear: when you can see through it, it's the window that's drawn, not the old glow
  if (typeof RiftTear === 'function') {
    const bd = RiftTear.prototype.draws, bg = RiftTear.prototype.glow;
    RiftTear.prototype.draws = function (out) { if (this.pvLive) return; return bd.call(this, out); };
    RiftTear.prototype.glow = function (out) { if (this.pvLive) return; const o = []; bg.call(this, o); for (const q of o) { q.size *= 0.45; out.push(q); } };
  }
}

// ---- walking through, with no stop ----------------------------------------------------------------------------------
function pvCanSwap(g, to, L = PV.live) {
  return !g.isGuest && !(g.net && g.net.peers && g.net.peers.size > 0) && PV.shadows.has(to) && L && L.dest.dim === to && !g._traveling;
}
// Across: lp is whoever stepped through; anyone else playing on this screen comes along (beside them, or,
// if they were by the portal too, just where they'd come out)
function pvSwap(g, to, lp = g.locals[0], L = PV.live) {
  const { win, dest } = L, from = g.dim, p = lp.player;
  const m = pvMap(win, dest, p), [vx, vz] = pvTurn(p.vx, p.vz, m.d);
  const others = g.locals.filter(l => l !== lp).map(l => {
    const q = l.player, near = Math.hypot(q.x - win.c[0], q.z - win.c[2]) < 5;
    const mm = near ? pvMap(win, dest, q) : null;
    return { l, mm, v: near ? pvTurn(q.vx, q.vz, mm.d) : [0, 0] };
  });
  if (win.kind === 'rift') {
    // a tear has one open side: come out on it, as far past the far tear as you were from this one
    const s = dest.n[0] * (m.x - dest.c[0]) + dest.n[2] * (m.z - dest.c[2]), want = Math.max(0.08, Math.abs(s));
    if (s < want) { m.x += dest.n[0] * (want - s); m.z += dest.n[2] * (want - s); }
  }
  const carried = typeof takeMounts === 'function' ? takeMounts(g) : [];
  g.worldRecord();
  if (g.shadow) g.releaseShadow();
  const old = g.world, pre = PV.shadows.get(to).world;
  // the other far worlds were seen from here; from over there they're no use
  PV.shadows.delete(to);
  pvRelease(g);
  PV.dests.clear();
  g._preWorld = pre; g._keepWorld = old; g._pvKeep = pre;
  disposeEntities(g.entities); g.entities = []; g.fauna.clear();
  for (const l of g.locals) { l.mining = null; l.player.dim = to; if (l.sleeping) l.sleeping = null; }
  g.loadDimension(to);
  g._pvKeep = null;
  for (const k of ['onBlockChanged', 'onAnyChange', 'onFluidReact', 'onFluidWash', 'onGrowExtra', 'onSurfaceTick']) old[k] = null;
  // what was changed in the world left behind is kept for saving; that world now waits behind the portal
  for (const c of old.chunks.values()) if (c.modified && c.dirty) { g.records.set(c.key, encodeChunk(c)); g.world.unsaved.add(c.key); c.dirty = false; }
  PV.shadows.set(from, { dim: from, world: old });
  p.x = m.x; p.y = m.y; p.z = m.z; p.vx = vx; p.vz = vz; p.yaw += m.d; p.fallStart = null; p.portalTime = 0; p.portalCooldown = 3;
  const al = [Math.cos(pvYawOf(dest.n)), Math.sin(pvYawOf(dest.n))];
  others.forEach(({ l, mm, v }, k) => {
    const q = l.player;
    if (mm) { q.x = mm.x; q.y = mm.y; q.z = mm.z; q.vx = v[0]; q.vz = v[1]; q.yaw += mm.d; }
    else { const o = (k % 2 ? -1 : 1) * 0.6 * Math.ceil((k + 1) / 2); q.x = p.x + al[0] * o; q.y = p.y; q.z = p.z - al[1] * o; q.vx = q.vz = 0; q.yaw = p.yaw; }
    q.fallStart = null; q.portalTime = 0; q.portalCooldown = 3;
  });
  if (typeof restoreMounts === 'function') restoreMounts(g, carried, true);
  for (const l of g.locals) { const pcx = Math.floor(l.player.x) >> 4, pcz = Math.floor(l.player.z) >> 4; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) g.world.ensureChunk(pcx + dx, pcz + dz); }
  // saved a moment later, so the step through doesn't stutter
  setTimeout(() => { if (g.state === 'playing') g.saveNow('travel'); }, 1200);
  const f = g.meta.flags;
  if (to === DIM.SKYLANDS && !f.skyVisited) { f.skyVisited = true; for (const l of g.locals) l.grantXP(40); }
  if (to === DIM.DEPTHS && !f.depthsVisited) { f.depthsVisited = true; for (const l of g.locals) l.grantXP(40); }
  if (typeof pvArrived === 'function') pvArrived(g, to, win, dest);
  PV.scanT = 0; PV.lives = []; PV.live = null;
  return true;
}
{
  const baseTravel = Game.prototype.travelPortal;
  Game.prototype.travelPortal = async function (portalDim, ...rest) {
    const to = this.dim === DIM.OVERWORLD ? portalDim : DIM.OVERWORLD;
    // whoever's standing in a portal that's a window goes straight across
    for (let i = 0; i < this.locals.length; i++) {
      const q = this.locals[i].player;
      for (const L of (PV.lives && PV.lives[i]) || []) if (L.win.kind === 'block' && pvCanSwap(this, to, L) && Math.hypot(q.x - L.win.c[0], q.z - L.win.c[2]) < 2.5) { pvSwap(this, to, this.locals[i], L); return; }
    }
    return baseTravel.call(this, portalDim, ...rest);
  };
  if (typeof riftTravel === 'function') {
    const baseRift = riftTravel;
    riftTravel = async function (g, to, lp) {
      const i = Math.max(0, g.locals.indexOf(lp)), L = ((PV.lives && PV.lives[i]) || []).find(k => k.win.kind === 'rift') || PV.live;
      if (L && pvCanSwap(g, to, L) && L.win.kind === 'rift' && L.win.walk) {
        const R = riftOf(g);
        if (to === DIM.REALM && R.stage < 3) return;
        pvSwap(g, to, lp || g.locals[0], L);
        if (to === DIM.REALM) {
          riftSay(g, R.sealed ? 'His realm, quiet now' : 'His realm. Somewhere far down these halls, he waits', R.sealed ? '' : 'warn');
          for (const l of g.locals) { const S = l.player.stats || (l.player.stats = {}); if (!S.realmSeen) { S.realmSeen = 1; l.grantXP(80); } }
        }
        return;
      }
      return baseRift(g, to, lp);
    };
  }
}
PV.debug = { pvTick, pvDest, pvWindows, pvRiftWindows, pvRenderView };
