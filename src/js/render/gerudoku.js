// ---------------------------------------------------------------------------
// render/gerudoku.js — the 32-pixel repaint (0.8.2), in the manner of the old
// Dokucraft / Gerudoku packs: chunky stones with dark mortar and a lit
// top-left bevel, deep bark plates, boards with seams and nail-heads, dense
// leaf clusters, ore nuggets with dark outlines, warm earthy colour.
// All original pixel work, painted from code at start-up, like every other
// texture in the game. Each painting here replaces the 16-pixel one of the
// same name (the latest painting of a name wins).
// ---------------------------------------------------------------------------

const GR = 32;
const g32 = (v) => ((v % GR) + GR) % GR;

// ---- tileable noise at 32 pixels -------------------------------------------------------
// Value noise with a whole number of lattice cells across, so it wraps exactly.
function gNoise(rand, nx, ny = nx) {
  nx = clamp(Math.round(nx), 1, GR); ny = clamp(Math.round(ny), 1, GR);
  const g = new Float32Array(nx * ny); for (let i = 0; i < g.length; i++) g[i] = rand();
  const sx = GR / nx, sy = GR / ny;
  return (x, y) => {
    const fx = x / sx, fy = y / sy, ix = Math.floor(fx), iy = Math.floor(fy);
    let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const x0 = ((ix % nx) + nx) % nx, x1 = (x0 + 1) % nx, y0 = ((iy % ny) + ny) % ny, y1 = (y0 + 1) % ny;
    return lerp(lerp(g[y0 * nx + x0], g[y0 * nx + x1], tx), lerp(g[y1 * nx + x0], g[y1 * nx + x1], tx), ty);
  };
}
function gFbm(rand, nx = 3, ny = nx, oct = 3) {
  const L = []; for (let o = 0; o < oct; o++) L.push(gNoise(rand, nx * (1 << o), ny * (1 << o)));
  return (x, y) => { let s = 0, a = 1, t = 0; for (const n of L) { s += n(x, y) * a; t += a; a *= 0.5; } return s / t; };
}

// ---- tileable cells (stones, cobbles, clumps) --------------------------------------------
// Points on a jittered grid; for each pixel: its cell, the distance to the nearest
// border, and which way that border lies (for lighting the bevel from the top-left).
function gCells(rand, cols, rows, o = {}) {
  const jit = o.jitter ?? 0.85, ax = o.ax ?? 1, ay = o.ay ?? 1, pts = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const off = o.stagger && (j % 2) ? 0.5 : 0;
    pts.push({ x: (i + 0.5 + off + (rand() - 0.5) * jit) * GR / cols, y: (j + 0.5 + (rand() - 0.5) * jit) * GR / rows, t: rand(), u: rand(), id: pts.length });
  }
  const out = new Array(GR * GR);
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    let d1 = 1e9, d2 = 1e9, c1 = null, c2 = null, x1 = 0, y1 = 0, x2 = 0, y2 = 0;
    for (const c of pts) for (let ox = -GR; ox <= GR; ox += GR) for (let oy = -GR; oy <= GR; oy += GR) {
      const px = c.x + ox, py = c.y + oy, dx = (x + 0.5 - px) * ax, dy = (y + 0.5 - py) * ay, d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; c2 = c1; x2 = x1; y2 = y1; d1 = d; c1 = c; x1 = px; y1 = py; }
      else if (d < d2) { d2 = d; c2 = c; x2 = px; y2 = py; }
    }
    const ex = (x2 - x1) * ax, ey = (y2 - y1) * ay, el = Math.hypot(ex, ey) || 1;
    const dx = x + 0.5 - x1, dy = y + 0.5 - y1;
    out[y * GR + x] = { c: c1, edge: (d2 - d1) / (2 * el), bx: ex / el, by: ey / el, r: Math.hypot(dx * ax, dy * ay), dx, dy };
  }
  return out;
}
// how much a border facing (bx, by) catches the light from the top-left (-1..1)
const gLit = (k) => -(k.bx + k.by) * 0.7071;

// ---- painters -------------------------------------------------------------------------------
// Chunky stones with dark mortar: cobblestone, gravel, glowstone, bedrock...
// o.pal: several ramps, one chosen per stone; o.mw: half the mortar width; o.bevel: bevel depth.
function gStones(p, R, o = {}) {
  const K = gCells(p.rand, o.cols ?? 4, o.rows ?? 4, o), n = gFbm(p.rand, 4, 4, 3);
  const M = o.mortar || shade(R[0], 0.7), mw = o.mw ?? 1.0, bev = o.bevel ?? 2.8;
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    const k = K[y * GR + x];
    if (k.edge < mw) { p.set(x, y, k.edge < mw * 0.55 ? M : shade(M, 1.22), o.alpha ?? 255); continue; }
    const P = o.pal ? o.pal[Math.floor(k.c.u * o.pal.length)] : R;
    const lit = gLit(k), near = clamp(1 - (k.edge - mw) / bev, 0, 1);
    let v = (o.base ?? 0.46) + (k.c.t - 0.5) * (o.vary ?? 0.28) + lit * near * (o.light ?? 0.5)
      + (n(x, y) - 0.5) * (o.grain ?? 0.3) + (p.rand() - 0.5) * 0.05;
    if (k.edge < mw + 0.9 && lit < -0.25) v -= 0.16;                     // the dark outline on the shadow side
    if (o.dome) v += (1 - clamp(k.r / (GR / (o.cols ?? 4)), 0, 1)) * o.dome;
    p.set(x, y, pick(P, clamp(v, 0, 0.999)), o.alpha ?? 255);
  }
  return K;
}
// Natural rock face: broad plates, broken cracks with a lit lip, pits, flecks.
function gRock(p, R, o = {}) {
  const n = gFbm(p.rand, o.nx ?? 3, o.ny ?? 3, 4), cn = gNoise(p.rand, 5, 5);
  const K = gCells(p.rand, o.cols ?? 3, o.rows ?? 3, { jitter: 0.95, ax: o.ax, ay: o.ay });
  const cut = o.crackCut ?? 0.45;
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    const k = K[y * GR + x], cv = cn(x, y);
    let v = 0.5 + (n(x, y) - 0.5) * (o.contrast ?? 0.85) + (k.c.t - 0.5) * (o.plates ?? 0.14) + (p.rand() - 0.5) * (o.grain ?? 0.06);
    if (o.cracks !== false && cv > cut) {
      if (k.edge < 0.7) v = 0.06 + (p.rand() * 0.06);
      else if (k.edge < 2.2) v += gLit(k) * 0.24 * (1 - (k.edge - 0.7) / 1.5);
    }
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  for (let i = 0; i < (o.pits ?? 8); i++) {            // small pits: dark at the top-left, lit at the bottom-right
    const x = Math.floor(p.rand() * GR), y = Math.floor(p.rand() * GR);
    p.set(x, y, R[0]); p.set(g32(x + 1), y, R[1]); p.set(x, g32(y + 1), R[1]); p.set(g32(x + 1), g32(y + 1), R[R.length - 2]);
  }
  if (o.flecks) for (const [col, ch, big] of o.flecks) for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) if (p.rand() < ch) {
    const c = shade(col, 0.9 + p.rand() * 0.2); p.set(x, y, c);
    if (big && p.rand() < 0.6) { p.set(g32(x + 1), y, c); p.set(x, g32(y + 1), shade(c, 0.8)); p.set(g32(x + 1), g32(y + 1), shade(c, 0.7)); }
  }
}
// Pebbles and clods scattered over a painting.
function gPebbles(p, n, cols, o = {}) {
  for (let i = 0; i < n; i++) {
    const cx = p.rand() * GR, cy = p.rand() * GR, rx = (o.min ?? 1.1) + p.rand() * (o.max ?? 1.4), ry = rx * (0.65 + p.rand() * 0.3);
    const P = cols[Math.floor(p.rand() * cols.length)];
    const pts = [];
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
      if (d <= 1) pts.push([x, y, dx, dy]);
    }
    for (const [x, y] of pts) p.set(g32(x + 1), g32(y + 1), o.shadow || [30, 22, 16]);  // the shadow it casts
    for (const [x, y, dx, dy] of pts) { const v = 0.55 - (dx + dy) * 0.3; p.set(g32(x), g32(y), pick(P, clamp(v, 0, 0.999))); }
  }
}
// Rich soil: dark loam, clods, pebbles and a root or two.
function gDirt(p, R, o = {}) {
  const n = gFbm(p.rand, 4, 4, 3), m = gNoise(p.rand, 8, 8);
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    let v = 0.42 + (n(x, y) - 0.5) * 0.6 + (m(x, y) - 0.5) * 0.2 + (p.rand() - 0.5) * 0.16;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  // clods: little lumps lit from the top-left
  for (let i = 0; i < (o.clods ?? 14); i++) {
    const x = Math.floor(p.rand() * GR), y = Math.floor(p.rand() * GR), w = 2 + Math.floor(p.rand() * 2);
    for (let a = 0; a < w; a++) { p.set(g32(x + a), y, R[R.length - 2]); p.set(g32(x + a), g32(y + 1), R[3]); p.set(g32(x + a + 1), g32(y + 2), R[0]); }
    p.set(x, g32(y + 1), R[R.length - 3]); p.set(g32(x + w), g32(y + 1), R[1]);
  }
  if (o.roots) for (let k = 0; k < o.roots; k++) {
    let x = Math.floor(p.rand() * GR), y = Math.floor(p.rand() * GR);
    for (let i = 0; i < 6 + Math.floor(p.rand() * 6); i++) { p.set(g32(x), g32(y), hexRGB(o.rootCol || '#b89468')); p.set(g32(x + 1), g32(y + 1), R[1]); x += p.rand() < 0.6 ? 1 : 0; y += p.rand() < 0.5 ? 1 : 0; }
  }
  if (o.pebbles !== 0) gPebbles(p, o.pebbles ?? 5, [ramp('#8e8880', 5, 0.5), ramp('#9a8a76', 5, 0.5), ramp('#6e6a66', 5, 0.5)], { shadow: R[0] });
}
// Grass seen from above: clumps with dark gaps, blades with bright tips. Grey + tint marker.
function gGrassTop(p, o = {}) {
  const K = gCells(p.rand, 6, 6, { jitter: 1 }), n = gFbm(p.rand, 3, 3, 3);
  const A = o.color ? 255 : TINTA, col = (v) => o.color ? pick(o.color, clamp(v, 0, 0.999)) : grey(clamp(0.2 + v * 0.78, 0.18, 0.98));
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    const k = K[y * GR + x];
    let v = 0.5 + (n(x, y) - 0.5) * 0.35 + (k.c.t - 0.5) * 0.18 + gLit(k) * clamp(1 - k.edge / 3, 0, 1) * 0.2 + (p.rand() - 0.5) * 0.1;
    if (k.edge < 0.6) v -= 0.22;
    p.set(x, y, col(v), A);
  }
  for (let i = 0; i < (o.blades ?? 120); i++) {        // blades: dark root, bright tip, leaning
    let x = Math.floor(p.rand() * GR), y = Math.floor(p.rand() * GR);
    const len = 2 + Math.floor(p.rand() * 3), dx = p.rand() < 0.5 ? -1 : 1;
    for (let s = 0; s < len; s++) {
      p.set(g32(x), g32(y), col(0.38 + (s / len) * 0.55 + p.rand() * 0.06), A);
      y -= 1; if (p.rand() < 0.45) x += dx;
    }
  }
}
// The side of a grassy block: soil under an overhanging fringe with dripping tips.
function gFringeSide(p, dirtR, o = {}) {
  gDirt(p, dirtR, { pebbles: 4, clods: 10 });
  const tinted = !o.color, A = tinted ? TINTA : 255;
  const col = (v) => tinted ? grey(clamp(0.2 + v * 0.78, 0.18, 0.98)) : pick(o.color, clamp(v, 0, 0.999));
  const hn = gNoise(p.rand, 6, 1), base = o.depth ?? 7;
  const H = [];
  for (let x = 0; x < GR; x++) H.push(base + Math.round((hn(x, 0) - 0.5) * 5) + (p.rand() < 0.35 ? 1 : 0) - (p.rand() < 0.2 ? 1 : 0));
  // a few long drips, two pixels wide, tapering
  for (let i = 0; i < (o.drips ?? 4); i++) { const x = Math.floor(p.rand() * GR), L = 2 + Math.floor(p.rand() * (o.dripLen ?? 4)); H[x] = Math.max(H[x], base + L); H[g32(x + 1)] = Math.max(H[g32(x + 1)], base + L - 1 - Math.floor(p.rand() * 2)); H[g32(x - 1)] = Math.max(H[g32(x - 1)], base + Math.floor(L / 2)); }
  for (let x = 0; x < GR; x++) {
    const h = H[x], stripe = (x % 3 === 0) ? -0.07 : (x % 3 === 1 ? 0.05 : 0);
    for (let y = 0; y < h; y++) {
      const t = y / h;
      let v = 0.78 - t * 0.32 + stripe + (p.rand() - 0.5) * 0.12;
      if (y === 0) v += 0.08;
      if (y === h - 1) v = 0.36;
      p.set(x, y, col(v), A);
    }
    // shadow cast on the soil under the fringe
    p.set(x, h, shade(dirtR[0], 0.75)); if (p.rand() < 0.6) p.set(x, h + 1, dirtR[1]);
  }
}
// Fine sand with soft ripples, a few grains and tiny shells.
function gSand(p, R, o = {}) {
  const n = gFbm(p.rand, 2, 4, 3), w = gNoise(p.rand, 3, 2);
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    const ripple = Math.sin((y + w(x, y) * 10 + x * 0.15) * TAU / (o.period ?? 8)) * (o.ripple ?? 0.07);
    let v = 0.52 + (n(x, y) - 0.5) * 0.3 + ripple + (p.rand() - 0.5) * 0.2;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  for (let i = 0; i < (o.grains ?? 22); i++) { const x = Math.floor(p.rand() * GR), y = Math.floor(p.rand() * GR); p.set(x, y, R[R.length - 1]); p.set(g32(x + 1), g32(y + 1), R[1]); }
  if (o.pebbles) gPebbles(p, o.pebbles, [ramp(o.pebble || '#b8a888', 5, 0.4)], { min: 0.8, max: 0.6, shadow: R[1] });
}
// Planks: four boards, each with a lit top, a deep seam, flowing grain, one staggered
// butt joint and two nail-heads beside it.
function gPlanks(p, R, o = {}) {
  const boards = o.boards ?? 4, bh = GR / boards;
  const grain = gNoise(p.rand, 2, 16), fine = gNoise(p.rand, 4, 32), tone = [];
  for (let b = 0; b < boards; b++) tone.push((p.rand() - 0.5) * 0.12);
  const joints = []; for (let b = 0; b < boards; b++) joints.push(g32(Math.floor((b % 2 ? 0.55 : 0.08) * GR + p.rand() * 10)));
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    const b = Math.floor(y / bh), ly = y % bh, J = joints[b];
    let v = 0.5 + tone[b] + (grain(x, y) - 0.5) * 0.36 + (fine(x + b * 7, y) - 0.5) * 0.22;
    // grain lines
    if (Math.sin((y + grain(x * 0.5, y) * 4) * 2.4 + b) > 0.82) v -= 0.12;
    if (ly === 0) v += 0.2; else if (ly === 1) v += 0.07;
    if (ly === bh - 2) v -= 0.14;
    if (ly === bh - 1) v = 0.03;
    if (ly !== bh - 1) { if (x === J) v = 0.07; else if (x === g32(J + 1)) v += 0.18; else if (x === g32(J - 1)) v -= 0.1; }
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  if (o.nails !== false) for (let b = 0; b < boards; b++) for (const dx of [-3, 3]) {
    const x = g32(joints[b] + dx - (dx < 0 ? 1 : 0)), y = b * bh + Math.floor(bh / 2) - 1;
    p.set(x, y, hexRGB('#9a948a')); p.set(g32(x + 1), y, hexRGB('#5a544c')); p.set(x, y + 1, hexRGB('#5a544c')); p.set(g32(x + 1), y + 1, hexRGB('#2a2420'));
  }
  if (o.knot !== false && p.rand() < 0.7) {           // a knot
    const kx = Math.floor(p.rand() * GR), b = Math.floor(p.rand() * boards), ky = b * bh + 2 + Math.floor(p.rand() * (bh - 5));
    for (const [dx, dy, t] of [[0, 0, 0], [1, 0, 0], [-1, 0, 2], [2, 0, 2], [0, -1, 3], [1, -1, 3], [0, 1, 1], [1, 1, 1]]) p.set(g32(kx + dx), ky + dy, R[t]);
  }
}
// Bark: strips of plates running up the trunk, split by dark crevices and broken
// across into segments; each plate is lit on its left edge, shaded on its right.
function gBark(p, R, o = {}) {
  const fine = gNoise(p.rand, 32, 4), strips = [];
  let x = 0;
  while (x < GR) { let w = 3 + Math.floor(p.rand() * 4); if (GR - (x + w) < 3) w = GR - x; strips.push([x, w]); x += w; }
  const plate = new Int16Array(GR * GR).fill(-1), info = [];
  strips.forEach(([x0, w], si) => {
    let y = Math.floor(p.rand() * GR), left = GR;
    while (left > 0) {
      let h = 7 + Math.floor(p.rand() * 11); if (left - h < 5) h = left;
      const shift = p.rand() < 0.35 ? (p.rand() < 0.5 ? -1 : 1) : 0, id = info.length;
      info.push({ tone: (p.rand() - 0.5) * 0.18, x0: x0 + shift, w, y0: y, h, deep: p.rand() < 0.3 });
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) plate[g32(y + yy) * GR + g32(x0 + shift + xx)] = id;
      y += h; left -= h;
    }
  });
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    const id = plate[y * GR + x];
    if (id < 0) { p.set(x, y, R[0]); continue; }
    const P = info[id], lx = g32(x - P.x0), ly = g32(y - P.y0);
    let v = 0.5 + P.tone + (fine(x, y) - 0.5) * 0.3 + (p.rand() - 0.5) * 0.06;
    if (lx === P.w - 1) v = P.deep ? 0.04 : 0.12;                 // the crevice on its right
    else if (lx === 0) v += 0.26; else if (lx === 1) v += 0.1;
    else if (lx === P.w - 2) v -= 0.14;
    if (ly === P.h - 1 && lx !== P.w - 1) v = 0.16;               // the break under it
    else if (ly === 0 && lx !== P.w - 1) v += 0.14;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  if (o.birch) {   // pale papery bark with dark lenticels and patches
    const W = ramp(o.birch, 6, 0.3), dn = gNoise(p.rand, 4, 8);
    for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) p.set(x, y, pick(W, clamp(0.55 + (dn(x, y) - 0.5) * 0.4 + (p.rand() - 0.5) * 0.1, 0, 0.999)));
    for (let k = 0; k < 14; k++) {
      const x0 = Math.floor(p.rand() * GR), y0 = Math.floor(p.rand() * GR), w = 2 + Math.floor(p.rand() * 6);
      for (let i = 0; i < w; i++) { p.set(g32(x0 + i), y0, hexRGB('#2a2622')); if (p.rand() < 0.6) p.set(g32(x0 + i), g32(y0 + 1), hexRGB('#5a544a')); }
    }
    for (let k = 0; k < 3; k++) { const x0 = Math.floor(p.rand() * GR), y0 = Math.floor(p.rand() * GR); for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) p.set(g32(x0 + a), g32(y0 + b), hexRGB(b ? '#3a342c' : '#1e1a16')); }
  }
}
// Log end: rings, a dark pith, a radial check crack and a bark rim.
function gLogTop(p, inner, bark, o = {}) {
  const n = gNoise(p.rand, 6, 6), ang = p.rand() * TAU;
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    const ax = Math.abs(x - 15.5), ay = Math.abs(y - 15.5);
    const d = Math.pow(Math.pow(ax, 3) + Math.pow(ay, 3), 1 / 3) + (n(x, y) - 0.5) * 2;
    if (d > 13.6) { p.set(x, y, pick(bark, clamp(0.25 + p.rand() * 0.55 + (x + y < 31 ? 0.15 : -0.1), 0, 0.999))); continue; }
    if (d > 12.6) { p.set(x, y, bark[0]); continue; }
    let v = 0.55 + Math.sin(d * 1.45) * 0.17 + (p.rand() - 0.5) * 0.06;
    if (d < 1.6) v = 0.1; else if (d < 2.6) v = 0.3;
    if (d > 11.6) v = 0.3;
    p.set(x, y, pick(inner, clamp(v, 0, 0.999)));
  }
  for (let r = 3; r < 12; r++) {                       // a drying crack from the heart outward
    const x = Math.round(15.5 + Math.cos(ang) * r), y = Math.round(15.5 + Math.sin(ang) * r);
    p.set(x, y, inner[0]); if (r > 5) p.set(x + 1, y, inner[1]);
  }
}
// Leaves: dense clusters of little leaves, each lit on its top-left, with dark gaps
// and the odd hole you can see through. Grey + tint marker unless coloured.
function gLeaves(p, R, o = {}) {
  const A = o.tint ? TINTA : 255, hn = gNoise(p.rand, 6, 6);
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    if (hn(x, y) < (o.holes ?? 0.22) && p.rand() < 0.85) continue;
    p.set(x, y, p.rand() < 0.5 ? R[0] : R[1], A);
  }
  const N = o.count ?? 120;
  for (let i = 0; i < N; i++) {
    const cx = p.rand() * GR, cy = p.rand() * GR, a = p.rand() * Math.PI, L = 1.6 + p.rand() * 1.4, Wd = 0.9 + p.rand() * 0.5;
    const ca = Math.cos(a), sa = Math.sin(a), tone = (p.rand() - 0.5) * 0.25;
    for (let y = Math.floor(cy - 3); y <= cy + 3; y++) for (let x = Math.floor(cx - 3); x <= cx + 3; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = (dx * ca + dy * sa) / L, w = (-dx * sa + dy * ca) / Wd;
      if (u * u + w * w > 1) continue;
      const v = 0.6 + tone - (dx + dy) * 0.11;
      p.set(g32(x), g32(y), R[clamp(Math.round(v * (R.length - 1)), 1, R.length - 1)], A);
    }
    p.set(g32(Math.floor(cx + 1.5)), g32(Math.floor(cy + 1.5)), R[0], A);   // its shadow
    if (o.fruit && p.rand() < (o.fruitChance ?? 0.05)) { const fx = g32(Math.floor(cx)), fy = g32(Math.floor(cy)); p.set(fx, fy, o.fruit[1]); p.set(g32(fx + 1), fy, o.fruit[0]); p.set(fx, g32(fy + 1), o.fruit[0]); p.set(g32(fx + 1), g32(fy + 1), o.fruit[2]); }
  }
}
// Ore: rock with chunky nuggets, each with a dark outline, a lit face and a glint.
function gOre(p, baseR, oreHex, o = {}) {
  gRock(p, baseR, { cracks: o.cracks ?? true, pits: 4, crackCut: 0.55 });
  const OR = ramp(oreHex, 6, o.spread ?? 0.65), dark = shade(baseR[0], 0.75);
  const clusters = o.n ?? 4;
  for (let c = 0; c < clusters; c++) {
    const cx = 4 + p.rand() * 24, cy = 4 + p.rand() * 24, parts = 2 + Math.floor(p.rand() * 3);
    for (let k = 0; k < parts; k++) {
      const nx = cx + (p.rand() - 0.5) * 6, ny = cy + (p.rand() - 0.5) * 6, r = (o.size ?? 1.6) + p.rand() * 1.1;
      const inside = (x, y) => o.gem ? Math.abs(x + 0.5 - nx) + Math.abs(y + 0.5 - ny) * 1.15 <= r * 1.25 : Math.hypot(x + 0.5 - nx, (y + 0.5 - ny) * 1.15) <= r;
      const box = [Math.floor(nx - r - 2), Math.floor(ny - r - 2), Math.ceil(nx + r + 2), Math.ceil(ny + r + 2)];
      for (let y = box[1]; y <= box[3]; y++) for (let x = box[0]; x <= box[2]; x++)
        if (!inside(x, y) && (inside(x + 1, y) || inside(x - 1, y) || inside(x, y + 1) || inside(x, y - 1))) p.set(g32(x), g32(y), dark);
      for (let y = box[1]; y <= box[3]; y++) for (let x = box[0]; x <= box[2]; x++) if (inside(x, y)) {
        const dx = (x + 0.5 - nx) / r, dy = (y + 0.5 - ny) / r;
        let v = 0.55 - (dx + dy) * 0.32 + (p.rand() - 0.5) * 0.08;
        if (o.facets) v += (dx > 0) !== (dy > 0) ? 0.08 : -0.06;
        p.set(g32(x), g32(y), pick(OR, clamp(v, 0, 0.999)));
      }
      if (o.glint !== false && r > 1.8) { const gx = g32(Math.round(nx - r * 0.4)), gy = g32(Math.round(ny - r * 0.4)); p.set(gx, gy, mix(OR[5], [255, 255, 255], 0.6)); }
    }
  }
}
// Bricks: rounded, individually toned, lit top edge, recessed light mortar, a chip or two.
function gBricks(p, R, mortar, o = {}) {
  const bw = o.bw ?? 16, bh = o.bh ?? 8, off = o.offset ?? bw / 2, mw = o.mw ?? 2, n = gFbm(p.rand, 4, 4, 2);
  const M = ramp(mortar, 4, 0.3), tone = {};
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    const row = Math.floor(y / bh), sx = g32(x + (row % 2) * off), lx = sx % bw, ly = y % bh;
    const id = row * 64 + Math.floor(sx / bw);
    if (tone[id] === undefined) tone[id] = (p.rand() - 0.5) * (o.vary ?? 0.24);
    const inM = lx >= bw - mw || ly >= bh - mw;
    const corner = (lx === 0 || lx === bw - mw - 1) && (ly === 0 || ly === bh - mw - 1);
    if (inM || (corner && o.round !== false)) {
      // mortar: shadowed just under/left of a brick
      p.set(x, y, ly === bh - mw || lx === bw - mw ? M[0] : M[1 + Math.floor(p.rand() * 2)]); continue;
    }
    let v = 0.48 + tone[id] + (n(x, y) - 0.5) * (o.grain ?? 0.28) + (p.rand() - 0.5) * 0.08;
    if (ly === 0) v += 0.24; else if (ly === 1) v += 0.06;
    if (lx === 0) v += 0.12;
    if (ly === bh - mw - 1) v -= 0.22;
    if (lx === bw - mw - 1) v -= 0.14;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  for (let i = 0; i < (o.chips ?? 4); i++) {
    const x = Math.floor(p.rand() * GR), y = Math.floor(p.rand() * GR);
    p.set(x, y, M[0]); p.set(g32(x + 1), y, M[1]); p.set(x, g32(y + 1), R[R.length - 2]);
  }
}
// Big dressed stone blocks: bevelled, with a rocky face and the odd crack.
function gStoneBricks(p, R, mortar, o = {}) {
  const bw = o.bw ?? 16, bh = o.bh ?? 16, off = o.offset ?? 8, n = gFbm(p.rand, 4, 4, 3);
  const tone = {};
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    const row = Math.floor(y / bh), sx = g32(x + (row % 2) * off), lx = sx % bw, ly = y % bh, id = row * 64 + Math.floor(sx / bw);
    if (tone[id] === undefined) tone[id] = (p.rand() - 0.5) * 0.16;
    if (lx === bw - 1 || ly === bh - 1) { p.set(x, y, mortar); continue; }
    let v = 0.5 + tone[id] + (n(x, y) - 0.5) * (o.grain ?? 0.36) + (p.rand() - 0.5) * 0.06;
    if (ly === 0 || lx === 0) v = 0.86 + (p.rand() - 0.5) * 0.06;
    else if (ly === 1 || lx === 1) v += 0.14;
    if (ly === bh - 2 || lx === bw - 2) v = 0.16;
    else if (ly === bh - 3 || lx === bw - 3) v -= 0.12;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  for (let i = 0; i < (o.cracks ?? 2); i++) {
    let x = Math.floor(p.rand() * GR), y = Math.floor(p.rand() * GR);
    for (let s = 0; s < 4 + Math.floor(p.rand() * 4); s++) { p.set(g32(x), g32(y), R[0]); p.set(g32(x + 1), g32(y), R[R.length - 2]); y++; x += p.rand() < 0.5 ? 1 : -1; }
  }
  if (o.moss) gMoss(p, o.moss);
}
// Moss creeping over the top and into the joints.
function gMoss(p, amount = 1, col = '#4e7a2c') {
  const Mo = ramp(col, 7, 0.65), n = gFbm(p.rand, 5, 5, 3), fine = gNoise(p.rand, 16, 16), thr = 0.6 - amount * 0.06;
  const isM = (x, y) => n(g32(x), g32(y)) + (fine(g32(x), g32(y)) - 0.5) * 0.3 > thr;
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    if (!isM(x, y)) continue;
    let v = 0.45 + (fine(x, y) - 0.5) * 0.6 + (p.rand() - 0.5) * 0.3;
    if (!isM(x, y - 1)) v += 0.3;                // lit where it curls over the top
    if (!isM(x, y + 1)) v = 0.06;                // a dark lip underneath
    else if (!isM(x + 1, y)) v -= 0.15;
    p.set(x, y, pick(Mo, clamp(v, 0, 0.999)));
  }
}
// A smooth, polished slab in a bevelled frame.
function gPolished(p, R, o = {}) {
  const n = gFbm(p.rand, 2, 2, 3);
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    let v = 0.52 + (n(x, y) - 0.5) * 0.28 + (p.rand() - 0.5) * 0.04;
    const e = Math.min(x, y), f = Math.max(x, y);
    if (e === 0) v = 0.88; else if (f === GR - 1) v = 0.1; else if (e === 1) v += 0.16; else if (f === GR - 2) v -= 0.18;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  if (o.veins) gVeins(p, R);
}
function gVeins(p, R, n = 2) {
  for (let k = 0; k < n; k++) {
    let x = p.rand() * GR;
    for (let y = 0; y < GR; y++) { x += (p.rand() - 0.5) * 2.4; p.set(g32(Math.round(x)), y, R[2]); if (p.rand() < 0.5) p.set(g32(Math.round(x) + 1), y, R[3]); }
  }
}
// Knitted wool: columns of little V stitches.
function gWool(p, base) {
  const R = ramp(base, 7, 0.38), n = gFbm(p.rand, 3, 3, 2);
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    const lx = x % 4, slope = lx < 2 ? lx : 3 - lx, ly = g32(y + slope) % 4;
    let v = 0.55 + (ly === 0 ? 0.16 : ly === 3 ? -0.2 : ly === 2 ? -0.05 : 0.05) + (lx === 0 || lx === 3 ? -0.04 : 0) + (n(x, y) - 0.5) * 0.18 + (p.rand() - 0.5) * 0.08;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  for (let i = 0; i < 18; i++) p.set(Math.floor(p.rand() * GR), Math.floor(p.rand() * GR), R[R.length - 1]);   // fluff
}
// Glass: a lead frame with corner studs and two light streaks; clear inside.
function gGlass(p, edge, o = {}) {
  const E = ramp(edge, 5, 0.5), a = o.a ?? 230;
  if (o.fill) for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) p.set(x, y, shade(o.fill, 0.94 + p.rand() * 0.08), o.fa ?? 110);
  for (let i = 0; i < GR; i++) {
    p.set(i, 0, E[4], a); p.set(0, i, E[4], a); p.set(i, GR - 1, E[1], a); p.set(GR - 1, i, E[1], a);
    p.set(i, 1, E[2], a - 40); p.set(1, i, E[2], a - 40); p.set(i, GR - 2, E[0], a - 40); p.set(GR - 2, i, E[0], a - 40);
  }
  for (const [x, y] of [[2, 2], [GR - 4, 2], [2, GR - 4], [GR - 4, GR - 4]]) { p.set(x, y, E[3], a); p.set(x + 1, y, E[2], a); p.set(x, y + 1, E[2], a); p.set(x + 1, y + 1, E[0], a); }
  const W = [255, 255, 255];
  for (let i = 0; i < 11; i++) { p.set(6 + i, 20 - i, W, 170); p.set(7 + i, 20 - i, W, 110); }
  for (let i = 0; i < 5; i++) p.set(18 + i, 26 - i, W, 140);
  for (let i = 0; i < 3; i++) p.set(8 + i, 10 - i, W, 120);
}
// Metal storage block: four plates, seams, rivets, brushed grain.
function gMetal(p, R, o = {}) {
  const n = gNoise(p.rand, 2, 16);
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    const lx = x % 16, ly = y % 16;
    let v = 0.56 + (n(x, y) - 0.5) * 0.14 + (p.rand() - 0.5) * 0.05 + (((x + y) % 11) === 0 ? 0.05 : 0);
    if (lx === 0 || ly === 0) v = 0.9; else if (lx === 15 || ly === 15) v = 0.08;
    else if (lx === 1 || ly === 1) v += 0.16; else if (lx === 14 || ly === 14) v -= 0.2;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) for (const [ox, oy] of [[0, 0], [16, 0], [0, 16], [16, 16]]) {
    p.set(x + ox, y + oy, R[R.length - 1]); p.set(x + ox + 1, y + oy, R[3]); p.set(x + ox, y + oy + 1, R[3]); p.set(x + ox + 1, y + oy + 1, R[0]);
  }
}
// Faceted gem block: a cut stone in a bevelled setting, with glints.
function gGemBlock(p, R) {
  for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
    const lx = x % 16 - 7.5, ly = y % 16 - 7.5, a = Math.abs(lx), b = Math.abs(ly);
    let v;
    if (a + b < 5) v = 0.78;                                   // the table
    else if (a + b < 9) v = ly < 0 ? (lx < 0 ? 0.92 : 0.66) : (lx < 0 ? 0.5 : 0.28);
    else v = (ly < 0 || lx < 0) ? 0.6 : 0.35;
    v += (p.rand() - 0.5) * 0.06;
    const lx2 = x % 16, ly2 = y % 16;
    if (lx2 === 0 || ly2 === 0) v = 0.95; else if (lx2 === 15 || ly2 === 15) v = 0.06;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  for (const [x, y] of [[5, 4], [21, 4], [5, 20], [21, 20]]) { p.set(x, y, [255, 255, 255]); p.set(x + 1, y + 1, mix(R[5], [255, 255, 255], 0.5)); }
}

// ---- the repaint ---------------------------------------------------------------------------------
function paintGerudoku() {
  const T = (name, painter, tint) => addTile(name, painter, 0, tint, GR);
  const A = (name, frames, fps, painter, tint) => addAnim(name, frames, fps, painter, tint, GR);

  // --- ground ---
  const DIRT = ramp('#6e4a2c', 8, 0.62);
  T('dirt', p => gDirt(p, DIRT, { roots: 1 }));
  T('coarse_dirt', p => { gDirt(p, DIRT, { pebbles: 22, clods: 20 }); });
  T('rooted_dirt', p => gDirt(p, DIRT, { roots: 6, rootCol: '#c8a678' }));
  T('grass_top', p => gGrassTop(p), 'grass');
  T('grass_side', p => gFringeSide(p, DIRT), 'grass');
  T('snowy_grass_side', p => { gFringeSide(p, DIRT, { color: ramp('#eef3f8', 6, 0.22), depth: 8, drips: 4 }); });
  T('snow', p => { gRock(p, ramp('#eef3f8', 6, 0.16), { cracks: false, pits: 0, contrast: 0.7 }); for (let i = 0; i < 40; i++) p.set(Math.floor(p.rand() * GR), Math.floor(p.rand() * GR), [255, 255, 255]); });
  T('podzol_top', p => { gDirt(p, ramp('#5e3c22', 7, 0.55), { pebbles: 0 }); gLeaves(p, ramp('#7a4e26', 6, 0.55), { holes: 0.75, count: 50 }); });
  T('podzol_side', p => gFringeSide(p, DIRT, { color: ramp('#6a4628', 6, 0.5), depth: 5, drips: 2, dripLen: 3 }));
  T('mycelium_top', p => { gGrassTop(p, { color: ramp('#76666e', 6, 0.42), blades: 40 }); for (let i = 0; i < 30; i++) p.set(Math.floor(p.rand() * GR), Math.floor(p.rand() * GR), hexRGB('#c4b4c0')); });
  T('mycelium_side', p => gFringeSide(p, DIRT, { color: ramp('#76666e', 6, 0.42), depth: 5, drips: 3, dripLen: 3 }));
  T('farmland', p => { const R = ramp('#4a3220', 7, 0.55); gDirt(p, R, { pebbles: 3, clods: 6 }); for (let y = 0; y < GR; y++) if (y % 8 === 7 || y % 8 === 0) for (let x = 0; x < GR; x++) p.set(x, y, y % 8 === 7 ? R[0] : R[5]); });
  T('sand', p => gSand(p, ramp('#dccf98', 7, 0.32), { pebbles: 3 }));
  T('red_sand', p => gSand(p, ramp('#be6a2c', 7, 0.36), { pebbles: 3, pebble: '#9a5a2a' }));
  T('silver_sand', p => gSand(p, ramp('#c6c8c4', 7, 0.3), { pebbles: 3, pebble: '#9a9c98' }));
  T('gravel', p => gStones(p, ramp('#868080', 7, 0.6), { cols: 7, rows: 7, jitter: 1, mw: 0.6, bevel: 1.6, mortar: hexRGB('#2e2a28'), pal: [ramp('#8a8482', 7, 0.6), ramp('#9a8a7a', 7, 0.6), ramp('#6e6c6e', 7, 0.6), ramp('#a8a29a', 7, 0.55)], vary: 0.3, grain: 0.18 }));
  T('clay', p => { gRock(p, ramp('#9ea4b0', 6, 0.26), { cracks: false, pits: 3, contrast: 0.6 }); for (let y = 5; y < GR; y += 9) for (let x = 0; x < GR; x++) if (p.rand() < 0.55) p.set(x, y, hexRGB('#8a909c')); });
  T('bedrock', p => gStones(p, ramp('#4a4a4c', 7, 0.75), { cols: 5, rows: 5, mortar: hexRGB('#0e0e10'), mw: 1.3, vary: 0.5 }));

  // --- stone family ---
  const rockSpec = {
    stone: ['#8b8c90', {}], granite: ['#a87561', { flecks: [[hexRGB('#d8a690'), 0.03, true], [hexRGB('#5e3a2e'), 0.03, true], [hexRGB('#ecc8b8'), 0.01]] }],
    diorite: ['#bdbab6', { flecks: [[hexRGB('#f0eeea'), 0.05, true], [hexRGB('#5e5c5a'), 0.03, true]], cracks: false }],
    andesite: ['#86878a', { flecks: [[hexRGB('#6a6b6e'), 0.05, true], [hexRGB('#a8a9ac'), 0.03, true]] }],
    slate: ['#4d5360', { cols: 2, rows: 5, ax: 0.5, ay: 1.6, nx: 2, ny: 6 }], tuff: ['#6d6e60', { flecks: [[hexRGB('#8e8e7a'), 0.04, true], [hexRGB('#4a4b40'), 0.04, true]], cracks: false }],
    calcite: ['#dfe0dc', { contrast: 0.5, cracks: false }], dripstone_block: ['#86684e', { cols: 5, rows: 2, ax: 1.6, ay: 0.5, nx: 6, ny: 2 }],
    limestone: ['#cfc4a4', { contrast: 0.6 }], blackstone: ['#2c2830', { flecks: [[hexRGB('#4a4450'), 0.04, true], [hexRGB('#c8a032'), 0.004]] }],
    desert_stone: ['#b07a54', { cols: 2, rows: 5, ax: 0.5, ay: 1.6, nx: 2, ny: 6 }], end_stone: ['#dcdca0', { pits: 22, cracks: false }],
    emberstone: ['#7a2f26', { flecks: [[hexRGB('#4e1a14'), 0.05, true], [hexRGB('#b0503e'), 0.02]] }], skystone: ['#b4bccb', {}],
    obsidian: ['#1d1428', { contrast: 1.1, flecks: [[hexRGB('#5a4380'), 0.02]] }], crying_obsidian: ['#24123a', { contrast: 1.1, flecks: [[hexRGB('#8a3ae0'), 0.03]] }],
    packed_mud: ['#8a6a4e', { cracks: false }], mud: ['#4a3c34', { cracks: false, pits: 14 }],
  };
  for (const [k, [hex, o]] of Object.entries(rockSpec)) T(k, p => {
    gRock(p, ramp(hex, 8, 0.55), o);
    if (k === 'crying_obsidian') for (let i = 0; i < 5; i++) { const x = Math.floor(p.rand() * GR); let y = Math.floor(p.rand() * 20); for (let s = 0; s < 6; s++) { p.set(x, y, hexRGB('#c070ff')); p.set(x, y + 1, hexRGB('#8a3ae0')); y++; } }
    if (k === 'packed_mud') for (let i = 0; i < 26; i++) { const x = Math.floor(p.rand() * 30), y = Math.floor(p.rand() * GR); p.set(x, y, hexRGB('#d0b070')); p.set(x + 1, y, hexRGB('#a88a50')); p.set(x + 2, y, hexRGB('#d8bc80')); }
  });
  T('smooth_stone', p => gPolished(p, ramp('#9fa0a4', 7, 0.42)));
  T('marble', p => { gRock(p, ramp('#e2e0dc', 7, 0.3), { cracks: false, contrast: 0.4, pits: 0 }); gVeins(p, ramp('#9a9690', 5, 0.5), 3); });
  T('basalt', p => { const R = ramp('#4a4a50', 8, 0.55); for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) { const c = x % 8; let v = 0.46 + (c === 0 ? -0.4 : c === 1 ? 0.3 : c === 2 ? 0.12 : c === 7 ? -0.14 : 0) + (p.rand() - 0.5) * 0.14; p.set(x, y, pick(R, clamp(v, 0, 0.999))); } });
  const COBBLE = ramp('#9a9a9e', 8, 0.62), MORTAR = hexRGB('#26242a');
  T('cobblestone', p => gStones(p, COBBLE, { cols: 4, rows: 4, mortar: MORTAR, mw: 1.0, bevel: 3, grain: 0.3, base: 0.5 }));
  T('mossy_cobblestone', p => { gStones(p, COBBLE, { cols: 4, rows: 4, mortar: MORTAR, mw: 1.0, bevel: 3, base: 0.5 }); gMoss(p, 1); });
  T('cobbled_slate', p => gStones(p, ramp('#4d5360', 8, 0.66), { cols: 5, rows: 5, mortar: hexRGB('#14161c'), mw: 1 }));
  const SB = ramp('#87888c', 8, 0.5), SBM = hexRGB('#323236');
  T('stone_bricks', p => gStoneBricks(p, SB, SBM));
  T('mossy_stone_bricks', p => gStoneBricks(p, SB, SBM, { moss: 0.9 }));
  T('cracked_stone_bricks', p => gStoneBricks(p, SB, SBM, { cracks: 7 }));
  T('chiseled_stone_bricks', p => {
    gPolished(p, SB);
    for (let y = 4; y < 28; y++) for (let x = 4; x < 28; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5);
      if (d > 7 && d < 9.5) p.set(x, y, SB[d < 8.2 ? 1 : 6]);
      if (d < 6 && (Math.abs(x - 15.5) < 1 || Math.abs(y - 15.5) < 1)) p.set(x, y, SB[1]);
      if (d < 6 && (Math.abs(x - 15.5) < 2 && Math.abs(x - 15.5) >= 1 && Math.abs(y - 15.5) < 5)) p.set(x, y, SB[6]);
    }
  });
  T('bricks', p => gBricks(p, ramp('#9e4634', 8, 0.5), '#c4b6a2'));
  T('mud_bricks', p => gBricks(p, ramp('#8e6c50', 7, 0.4), '#5a4636', { round: false }));
  T('nether_bricks', p => gBricks(p, ramp('#4a1c1c', 7, 0.55), '#1a0808', { mw: 2 }));
  T('red_nether_bricks', p => gBricks(p, ramp('#6e1414', 7, 0.55), '#260606'));
  for (const [k, hex, mortar] of [['slate_bricks', '#4d5360', '#16181e'], ['marble_bricks', '#dcdad6', '#9a9894'], ['limestone_bricks', '#cfc4a4', '#8a8268'], ['blackstone_bricks', '#2c2830', '#100e12'], ['emberstone_bricks', '#7a2f26', '#2a0c08'],
    ['skystone_bricks', '#b4bccb', '#6a7080'], ['desert_stone_bricks', '#b07a54', '#5a3a26'], ['end_stone_bricks', '#dcdca0', '#8a8a5a'], ['prismarine_bricks', '#63ab9c', '#2a5650'], ['quartz_bricks', '#ece6dc', '#b0a898']])
    T(k, p => gStoneBricks(p, ramp(hex, 8, 0.5), hexRGB(mortar), k === 'marble_bricks' || k === 'skystone_bricks' || k === 'quartz_bricks' ? { grain: 0.18 } : { bh: 8, bw: 16, offset: 8 }));
  for (const [k, hex] of [['polished_granite', '#a87561'], ['polished_diorite', '#c6c4c0'], ['polished_andesite', '#8a8c90'], ['polished_slate', '#4d5360'], ['polished_basalt', '#55555c'], ['quartz_block', '#ece6dc'], ['purpur_block', '#a87aa8']])
    T(k, p => gPolished(p, ramp(hex, 7, 0.42), { veins: k === 'polished_granite' || k === 'polished_diorite' }));
  T('sandstone_top', p => gSand(p, ramp('#d9c88e', 7, 0.26), { ripple: 0.03 }));
  T('sandstone_side', p => { const R = ramp('#d9c88e', 8, 0.42), n = gFbm(p.rand, 4, 2, 2); for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) { let v = 0.55 + (n(x, y) - 0.5) * 0.2 + (p.rand() - 0.5) * 0.1; if (y < 6) v += 0.18; if (y === 6 || y === 7) v -= 0.3; if (y % 9 === 4 && y > 8) v -= 0.16; if (y === GR - 1) v -= 0.2; p.set(x, y, pick(R, clamp(v, 0, 0.999))); } });
  T('red_sandstone_top', p => gSand(p, ramp('#b95c25', 7, 0.3), { ripple: 0.03 }));
  T('red_sandstone_side', p => { const R = ramp('#b95c25', 8, 0.42), n = gFbm(p.rand, 4, 2, 2); for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) { let v = 0.55 + (n(x, y) - 0.5) * 0.2 + (p.rand() - 0.5) * 0.1; if (y < 6) v += 0.18; if (y === 6 || y === 7) v -= 0.3; if (y % 9 === 4 && y > 8) v -= 0.16; if (y === GR - 1) v -= 0.2; p.set(x, y, pick(R, clamp(v, 0, 0.999))); } });

  // --- ores, metals, gems ---
  const SR = ramp('#8b8c90', 8, 0.55), DR = ramp('#4d5360', 8, 0.55), ER = ramp('#7a2f26', 8, 0.55);
  for (const [k, ore, base, o] of [
    ['coal_ore', '#2c2a2c', SR, { n: 5, size: 1.9, glint: false, spread: 0.9 }], ['iron_ore', '#d8a888', SR, { n: 4 }], ['gold_ore', '#f6d541', SR, { n: 4 }],
    ['diamond_ore', '#5ee6e0', DR, { n: 3, gem: true, facets: true }], ['copper_ore', '#e07a48', SR, { n: 5 }], ['lapis_ore', '#2a50c8', SR, { n: 5, size: 1.3 }],
    ['emerald_ore', '#30d070', SR, { n: 3, gem: true, facets: true }], ['tin_ore', '#d4d8dc', SR, { n: 4 }], ['mese_ore', '#f0e020', DR, { n: 3, gem: true }],
    ['quartz_ore', '#f2ece2', ER, { n: 5, gem: true, size: 1.3 }], ['cinderite_ore', '#ff8a3d', ER, { n: 4 }], ['aether_crystal_ore', '#9be0ff', ramp('#b4bccb', 8, 0.45), { n: 3, gem: true, facets: true }]])
    T(k, p => gOre(p, base, ore, o));
  for (const [k, hex] of [['iron_block', '#d6d6d6'], ['gold_block', '#f2cf3a'], ['copper_block', '#c87050'], ['exposed_copper', '#a8806a'], ['weathered_copper', '#6aa088'], ['oxidized_copper', '#52a690'], ['tin_block', '#c8ccd2'], ['bronze_block', '#b98a46'], ['coal_block', '#2a2a2c']])
    T(k, p => { gMetal(p, ramp(hex, 8, 0.5)); if (k === 'exposed_copper' || k === 'weathered_copper') for (let i = 0; i < 120; i++) { const x = Math.floor(p.rand() * GR), y = Math.floor(p.rand() * GR); p.set(x, y, shade(hexRGB(k === 'exposed_copper' ? '#4fa08a' : '#c87050'), 0.85 + p.rand() * 0.3)); } });
  for (const [k, hex] of [['diamond_block', '#5ee6e0'], ['emerald_block', '#30c070'], ['lapis_block', '#2a50c8'], ['amethyst_block', '#9a6ad0']]) T(k, p => gGemBlock(p, ramp(hex, 8, 0.55)));
  T('glowstone', p => { gStones(p, ramp('#e9b84a', 7, 0.55), { cols: 5, rows: 5, mortar: hexRGB('#6a4818'), mw: 0.9, bevel: 2 }); for (let i = 0; i < 40; i++) p.set(Math.floor(p.rand() * GR), Math.floor(p.rand() * GR), hexRGB('#fff6c8')); });

  // --- glass and ice ---
  T('glass', p => gGlass(p, '#d8eef4'));
  T('tinted_glass', p => gGlass(p, '#5a4a6a', { fill: hexRGB('#2a2236'), fa: 200 }));
  T('ice', p => { const n = gFbm(p.rand, 3, 3, 3); for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) p.set(x, y, shade(hexRGB('#9cc4f4'), 0.9 + n(x, y) * 0.2), 200); for (let i = 0; i < 5; i++) { let x = Math.floor(p.rand() * GR), y = Math.floor(p.rand() * GR); for (let k = 0; k < 9; k++) { p.set(g32(x), g32(y), hexRGB('#eaf4ff'), 235); x += 1; y += p.rand() < 0.5 ? 1 : 0; } } });
  T('packed_ice', p => gRock(p, ramp('#8ab4e8', 7, 0.32), { contrast: 0.6, pits: 0 }));
  T('blue_ice', p => { gRock(p, ramp('#5a8ae8', 7, 0.38), { contrast: 0.6, pits: 0 }); for (let i = 0; i < 18; i++) p.set(Math.floor(p.rand() * GR), Math.floor(p.rand() * GR), hexRGB('#d0e6ff')); });

  // --- wood ---
  for (const [w, S] of Object.entries(WOOD_SPECS)) {
    const PR = ramp(S.plank, 8, 0.55), BR = ramp(S.bark, 8, 0.6), IR = ramp(S.inner, 7, 0.42);
    if (S.noLog) continue;
    T(w === 'oak' ? 'planks' : w + '_planks', p => gPlanks(p, PR));
    T(w === 'oak' ? 'log_side' : w + '_log_side', p => gBark(p, BR, { birch: S.birch ? S.bark : null }));
    T(w === 'oak' ? 'log_top' : w + '_log_top', p => gLogTop(p, IR, BR));
    T('stripped_' + w + '_log_side', p => { const R = ramp(S.inner, 8, 0.36), n = gNoise(p.rand, 3, 32); for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) p.set(x, y, pick(R, clamp(0.5 + (n(x, y) - 0.5) * 0.5 + (x % 6 === 0 ? -0.16 : 0) + (p.rand() - 0.5) * 0.06, 0, 0.999))); });
    T('stripped_' + w + '_log_top', p => gLogTop(p, IR, ramp(S.inner, 7, 0.32)));
  }
  T('boat_planks', p => gPlanks(p, ramp('#8a6438', 8, 0.55)));
  // leaves: grey + tint marker unless naturally coloured
  const GL = [0.16, 0.3, 0.42, 0.54, 0.66, 0.78, 0.9].map(grey);
  T('leaves', p => gLeaves(p, GL, { tint: true, fruit: null }), 'foliage');
  T('birch_leaves', p => gLeaves(p, GL.map(c => shade(c, 1.08)), { tint: true, holes: 0.26 }), 'foliage');
  T('spruce_leaves', p => gLeaves(p, ramp('#2e5a38', 7, 0.55), { holes: 0.16, count: 150 }));
  T('jungle_leaves', p => gLeaves(p, GL, { tint: true, count: 140, holes: 0.18 }), 'foliage');
  T('acacia_leaves', p => gLeaves(p, GL.map(c => shade(c, 0.95)), { tint: true, holes: 0.3 }), 'foliage');
  T('dark_oak_leaves', p => gLeaves(p, GL.map(c => shade(c, 0.85)), { tint: true, holes: 0.14, count: 150 }), 'foliage');
  T('mangrove_leaves', p => gLeaves(p, GL, { tint: true, holes: 0.2 }), 'foliage');
  T('cherry_leaves', p => gLeaves(p, ramp('#e89ab4', 7, 0.45), { holes: 0.24, count: 140 }));
  T('aspen_leaves', p => gLeaves(p, GL.map(c => shade(c, 1.12)), { tint: true, holes: 0.28, count: 110 }), 'foliage');
  T('azalea_leaves', p => gLeaves(p, ramp('#5a8a2e', 7, 0.5), { holes: 0.2, count: 130 }));
  T('flowering_azalea_leaves', p => gLeaves(p, ramp('#5a8a2e', 7, 0.5), { holes: 0.2, count: 130, fruit: ramp('#d870c8', 3, 0.5), fruitChance: 0.18 }));

  // --- wool ---
  for (const [c, , hex] of COLORS) T(c === 'white' ? 'wool' : c + '_wool', p => gWool(p, c === 'white' ? '#e8e6e0' : hex));

  // the face of a menu button: quiet, worn stone
  T('gui_button', p => gRock(p, ramp('#8c8c90', 7, 0.32), { cracks: false, pits: 3, contrast: 0.45 }));
  paintGerudokuStations();
}

// ---- crafting stations and such ---------------------------------------------------------------
function paintGerudokuStations() {
  const T = (name, painter, tint) => addTile(name, painter, 0, tint, GR);
  const A = (name, frames, fps, painter) => addAnim(name, frames, fps, painter, undefined, GR);
  const OAK = ramp('#b08a50', 8, 0.55), OAKD = ramp('#5a4026', 8, 0.55), IRON = ramp('#9a9aa4', 7, 0.55), STEEL = ramp('#b8bcc4', 6, 0.55);
  const STONE = ramp('#87888c', 8, 0.5), SOOT = hexRGB('#16121a');
  const rect = (p, x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) p.set(x, y, c); };
  const frame = (p, R, w = 2) => { for (let i = 0; i < GR; i++) for (let k = 0; k < w; k++) { p.set(i, k, R[k ? 5 : 2]); p.set(k, i, R[k ? 4 : 2]); p.set(i, GR - 1 - k, R[k ? 1 : 0]); p.set(GR - 1 - k, i, R[k ? 1 : 0]); } };

  // crafting table: a work-top with an inlaid grid; tools hanging on the sides
  T('table_top', p => {
    gPlanks(p, OAK, { nails: false, knot: false });
    frame(p, OAKD, 3);
    for (let i = 3; i < GR - 3; i++) for (const g of [11, 20]) { p.set(i, g, OAKD[1]); p.set(i, g + 1, OAK[6]); p.set(g, i, OAKD[1]); p.set(g + 1, i, OAK[6]); }
    for (const [x, y] of [[3, 3], [27, 3], [3, 27], [27, 27]]) rect(p, x, y, x + 1, y + 1, IRON[5]);
  });
  T('table_side', p => {
    gPlanks(p, OAK, { knot: false });
    for (let x = 0; x < GR; x++) { p.set(x, 0, OAKD[4]); p.set(x, 1, OAKD[2]); p.set(x, 2, OAKD[1]); p.set(x, 3, OAKD[0]); p.set(x, GR - 1, OAKD[0]); }
    // a saw on the left: wooden grip, steel blade with teeth
    rect(p, 4, 7, 7, 11, OAKD[3]); rect(p, 5, 8, 6, 10, OAKD[0]); p.set(4, 7, OAKD[5]);
    for (let y = 12; y < 27; y++) { const w = 5 - Math.floor((y - 12) / 6); for (let x = 4; x < 4 + w + 2; x++) p.set(x, y, IRON[x === 4 ? 5 : x === 5 ? 4 : 3]); p.set(4 + w + 2, y, y % 2 ? IRON[0] : IRON[2]); p.set(3, y, IRON[0]); }
    for (let x = 3; x < 8; x++) p.set(x, 27, IRON[0]);
    // a hammer on the right: iron head on a haft
    for (let y = 8; y < 27; y++) { p.set(23, y, OAKD[4]); p.set(24, y, OAKD[2]); }
    rect(p, 19, 6, 28, 10, IRON[3]); for (let x = 19; x <= 28; x++) { p.set(x, 6, IRON[6]); p.set(x, 10, IRON[0]); } p.set(19, 7, IRON[5]); p.set(28, 9, IRON[1]);
    // pegs
    for (const x of [5, 23]) { p.set(x, 5, OAKD[0]); p.set(x + 1, 5, OAKD[1]); }
  });
  // furnace: dressed stone with an arched fire-mouth and a grate
  const furnBody = (p) => gStoneBricks(p, STONE, hexRGB('#2a2a2e'), { bw: 16, bh: 8, offset: 8, cracks: 1 });
  const mouth = (p, lit, f = 0) => {
    const inArch = (x, y) => x >= 8 && x <= 23 && y >= 14 && y <= 27 && (y >= 18 || Math.hypot(x - 15.5, (y - 18) * 1.6) <= 8);
    for (let y = 9; y < 30; y++) for (let x = 5; x < 27; x++) {
      if (inArch(x, y)) continue;
      if (inArch(x + 1, y) || inArch(x - 1, y) || inArch(x, y + 1) || inArch(x, y - 1)) p.set(x, y, STONE[1]);
      else if (inArch(x + 2, y) || inArch(x - 2, y) || inArch(x, y + 2) || inArch(x, y - 2)) p.set(x, y, (x < 16 || y < 14) ? STONE[6] : STONE[2]);
    }
    for (let y = 14; y <= 27; y++) for (let x = 8; x <= 23; x++) if (inArch(x, y)) {
      if (!lit) { p.set(x, y, y > 24 ? shade(hexRGB('#3a1c10'), 0.8 + p.rand() * 0.5) : shade(SOOT, 0.8 + (y - 14) / 30)); continue; }
      const t = clamp((27 - y) / 13 + Math.sin(x * 1.3 + f * 1.7) * 0.18 + Math.sin(x * 0.6 - f * 2.1) * 0.12, 0, 1);
      p.set(x, y, y > 24 ? hexRGB(p.rand() < 0.5 ? '#ffcf5a' : '#ff8a2a') : t < 0.35 ? hexRGB('#ffe08a') : t < 0.6 ? hexRGB('#ff9a2a') : t < 0.82 ? hexRGB('#c8401c') : SOOT);
    }
    for (let x = 8; x <= 23; x++) { p.set(x, 24, IRON[1]); p.set(x, 25, IRON[3]); }         // the grate
    for (let x = 9; x <= 23; x += 3) for (let y = 18; y < 24; y++) if (inArch(x, y)) p.set(x, y, lit ? IRON[2] : IRON[1]);
  };
  T('furnace_top', p => gStones(p, STONE, { cols: 4, rows: 4, mortar: hexRGB('#26242a'), mw: 1.1 }));
  T('furnace_side', p => furnBody(p));
  T('furnace_front', p => { furnBody(p); mouth(p, false); });
  A('furnace_front_lit', 4, 6, (p, f) => { furnBody(p); mouth(p, true, f); });
  // bookshelf: two rows of leather books between shelves
  T('bookshelf', p => {
    gPlanks(p, OAK, { nails: false, knot: false });
    const LEATHER = ['#7a2424', '#24407a', '#2e5a2a', '#7a5a24', '#4e2460', '#245a5a', '#5a3218', '#8a6a3a', '#3a3a44'];
    for (const [top, bot] of [[3, 14], [18, 29]]) {
      for (let x = 2; x < GR - 2; x++) { p.set(x, top - 1, OAKD[0]); p.set(x, bot + 1, OAKD[4]); }
      let x = 2;
      while (x < GR - 3) {
        const w = 2 + Math.floor(p.rand() * 3), h = bot - top - Math.floor(p.rand() * 4), col = ramp(LEATHER[Math.floor(p.rand() * LEATHER.length)], 5, 0.5);
        if (p.rand() < 0.08) { x += 2; continue; }                                 // a gap
        for (let bx = x; bx < Math.min(x + w, GR - 2); bx++) for (let y = bot - h + 1; y <= bot; y++) {
          let c = col[bx === x ? 3 : bx === x + w - 1 ? 1 : 2];
          if (y === bot - h + 1) c = col[4];
          if (y === bot - h + 3 || y === bot - 2) c = hexRGB('#d8b04a');              // gilt bands
          p.set(bx, y, c);
        }
        x += w;
      }
    }
    frame(p, OAKD, 2);
  });
  // TNT: paper-wrapped sticks with a label band
  const TR = ramp('#c8281e', 7, 0.5);
  T('tnt_side', p => {
    for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) { const lx = x % 8; p.set(x, y, pick(TR, clamp(0.55 + (lx === 0 ? -0.4 : lx === 1 ? 0.25 : lx === 7 ? -0.2 : 0) + (p.rand() - 0.5) * 0.08, 0, 0.999))); }
    const PA = ramp('#ece2cc', 5, 0.3);
    for (let y = 10; y < 22; y++) for (let x = 0; x < GR; x++) p.set(x, y, PA[y === 10 ? 4 : y === 21 ? 0 : 2 + (p.rand() < 0.2 ? 1 : 0)]);
    const L = { T: ['xxxxx', '..x..', '..x..', '..x..', '..x..', '..x..', '..x..'], N: ['x...x', 'xx..x', 'x.x.x', 'x..xx', 'x...x', 'x...x', 'x...x'] };
    let lx = 7; for (const ch of 'TNT') { L[ch].forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === 'x') { p.set(lx + i, 12 + j, hexRGB('#1a1414')); } }); lx += 7; }
  });
  T('tnt_top', p => { for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) { const cx = x % 8 - 3.5, cy = y % 8 - 3.5, d = Math.hypot(cx, cy); p.set(x, y, d > 3.6 ? hexRGB('#3a1210') : pick(TR, clamp(0.7 - d * 0.1 + (p.rand() - 0.5) * 0.1, 0, 0.999))); } rect(p, 14, 14, 17, 17, hexRGB('#2a2224')); p.set(15, 15, hexRGB('#8a8478')); });
  T('tnt_bottom', p => { for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) { const cx = x % 8 - 3.5, cy = y % 8 - 3.5, d = Math.hypot(cx, cy); p.set(x, y, d > 3.6 ? hexRGB('#3a1210') : pick(TR, clamp(0.6 - d * 0.1, 0, 0.999))); } });
  // chest: dark boards bound in iron, a latch on the front
  const CH = ramp('#8a5a2a', 8, 0.55);
  const chestBase = (p) => { gPlanks(p, CH, { nails: false, knot: false }); frame(p, IRON, 2); };
  T('chest_top', p => { chestBase(p); for (let x = 2; x < GR - 2; x++) { p.set(x, 8, IRON[2]); p.set(x, 9, IRON[4]); p.set(x, 22, IRON[2]); p.set(x, 23, IRON[4]); } });
  T('chest_side', p => { chestBase(p); for (let x = 2; x < GR - 2; x++) { p.set(x, 10, IRON[1]); p.set(x, 11, IRON[4]); p.set(x, 12, IRON[2]); } });
  T('chest_front', p => {
    chestBase(p); for (let x = 2; x < GR - 2; x++) { p.set(x, 10, IRON[1]); p.set(x, 11, IRON[4]); p.set(x, 12, IRON[2]); }
    rect(p, 12, 8, 19, 18, IRON[3]); for (let x = 12; x <= 19; x++) { p.set(x, 8, IRON[6]); p.set(x, 18, IRON[0]); } for (let y = 8; y <= 18; y++) { p.set(12, y, IRON[5]); p.set(19, y, IRON[1]); }
    rect(p, 15, 12, 16, 15, SOOT); p.set(15, 16, SOOT);
  });
  // torch: the mesh samples columns 14-17 and rows 12-31 of this painting; the flame sits on top
  const torch = (p, f, cols, stick) => {
    const S = ramp(stick, 5, 0.5);
    for (let y = 16; y < GR; y++) { p.set(14, y, S[3]); p.set(15, y, S[2]); p.set(16, y, S[2]); p.set(17, y, S[0]); if (y % 5 === 0) { p.set(15, y, S[1]); p.set(16, y, S[1]); } }
    for (let y = 16; y < 18; y++) for (let x = 14; x < 18; x++) p.set(x, y, hexRGB('#3a2a1a'));    // cloth wrap, charred
    const F = cols.map(hexRGB), fl = [[0, 1, 2, 1], [1, 0, 1, 2], [2, 1, 0, 1], [1, 2, 1, 0]][f % 4];
    for (let x = 14; x < 18; x++) { p.set(x, 15, F[1]); p.set(x, 14, F[fl[x - 14] === 0 ? 2 : 0]); p.set(x, 13, F[fl[x - 14] === 2 ? 1 : 0]); p.set(x, 12, F[fl[x - 14] === 1 ? 2 : fl[x - 14] === 0 ? 0 : 1]); }
    p.set(15, 13, F[2]); p.set(16, 13, F[2]); p.set(15 + (f % 2), 12, F[2]);
  };
  A('torch', 4, 7, (p, f) => torch(p, f, ['#ffd34a', '#ff8a1c', '#fff6c8'], '#7a552c'));
  A('soul_torch', 4, 7, (p, f) => torch(p, f, ['#7af0ff', '#2ab8d8', '#e8ffff'], '#5a4a3a'));

  // water and lava, still and flowing (grey water takes the biome colour)
  A('water', 16, 8, (p, f, n) => {
    const t = f / n * TAU;
    for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
      const w = Math.sin((x + y * 0.5) * TAU / 16 + t) * 0.06 + Math.sin(y * TAU / 8 - x * TAU / 32 + t * 2) * 0.05 + Math.sin((x - y) * TAU / 32 + t) * 0.05;
      const glint = Math.sin(x * TAU / 16 + Math.sin(y * TAU / 16 + t) * 2 + t) > 0.93 ? 0.12 : 0;
      p.set(x, y, grey(clamp(0.74 + w + glint, 0, 1)), 175);
    }
  });
  A('water_flow', 32, 20, (p, f) => {
    for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
      const yy = g32(y - f);
      const w = Math.sin(x * TAU / 8 + Math.sin(yy * TAU / 16) * 1.2) * 0.06 + Math.sin(yy * TAU / 16 + x * 0.4) * 0.05 + (((x * 7 + Math.floor(yy / 3) * 5) % 13) === 0 ? 0.1 : 0);
      p.set(x, y, grey(clamp(0.72 + w, 0, 1)), 180);
    }
  });
  const LR = ramp('#e0581a', 7, 0.65);
  const lavaPx = (p, x, y, v) => p.set(x, y, v > 0.88 ? hexRGB('#fff0a0') : v > 0.78 ? hexRGB('#ffd04a') : v < 0.2 ? hexRGB('#5a1808') : pick(LR, clamp(v, 0, 0.999)));
  A('lava', 16, 4, (p, f, n) => {
    const t = f / n * TAU;
    for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
      const v = 0.5 + Math.sin(x * TAU / 16 + Math.sin(y * TAU / 32 + t) * 1.6) * 0.2 + Math.sin(y * TAU / 16 * 1 + t) * 0.15 + Math.sin((x + y) * TAU / 32 - t) * 0.14;
      lavaPx(p, x, y, v);
    }
  });
  A('lava_flow', 32, 8, (p, f) => {
    for (let y = 0; y < GR; y++) for (let x = 0; x < GR; x++) {
      const yy = g32(y - f);
      const v = 0.5 + Math.sin(x * TAU / 16 + Math.sin(yy * TAU / 32) * 1.6) * 0.22 + Math.sin(yy * TAU / 16 + x * 0.2) * 0.13;
      lavaPx(p, x, y, v);
    }
  });
}
