// ---------------------------------------------------------------------------
// render/doku.js — the block textures, painted in the spirit of the old
// Dokucraft / Gerudoku / Mini-Doku packs: warm medieval colour, chunky
// bevelled stones and bricks with dark mortar, boards with nail-heads, deep
// bark, lush clustered leaves and a dark outline on every item.
// Everything is generated here from code at start-up; nothing is downloaded.
// Animated tiles (water, lava, fire, portals, torch flames...) get several
// frames that the renderer swaps in as time passes.
// ---------------------------------------------------------------------------

const ANIMS = [];   // { tile, frames: [Uint8ClampedArray], fps, phase, cur }
const TINTA = 253;  // alpha marker: pixel takes the climate tint (grass, leaves, water)

// ---- colour helpers ------------------------------------------------------------------
const COOL = [38, 34, 62], WARM = [255, 240, 196];
// A tone ramp from shadow to highlight. Shadows lean cool, highlights warm,
// the way the Doku packs shade.
function ramp(hex, n = 6, spread = 0.5) {
  const c = typeof hex === 'string' ? hexRGB(hex) : hex, out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const f = 1 - spread + t * spread * 1.45;
    let col = shade(c, f);
    if (t < 0.5) col = mix(col, COOL, (0.5 - t) * 0.32); else col = mix(col, WARM, (t - 0.5) * 0.22);
    out.push(col);
  }
  return out;
}
const pick = (R, v) => R[clamp(Math.floor(v * R.length), 0, R.length - 1)];
const grey = (v) => [Math.round(v * 255), Math.round(v * 255), Math.round(v * 255)];

// ---- tileable noise -------------------------------------------------------------------
// Value noise on a lattice that repeats every 16 pixels, so tiles tile.
function vnoise(rand, px, py) {
  // whole lattice cells per tile, so the noise wraps exactly at 16 pixels
  const nx = Math.max(1, Math.round(16 / px)), ny = Math.max(1, Math.round(16 / py)), g = [];
  px = 16 / nx; py = 16 / ny;
  for (let j = 0; j < ny; j++) { g.push([]); for (let i = 0; i < nx; i++) g[j].push(rand()); }
  return (x, y) => {
    const fx = x / px, fy = y / py, ix = Math.floor(fx), iy = Math.floor(fy);
    let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const a = g[((iy % ny) + ny) % ny][((ix % nx) + nx) % nx], b = g[((iy % ny) + ny) % ny][(((ix + 1) % nx) + nx) % nx];
    const c = g[(((iy + 1) % ny) + ny) % ny][((ix % nx) + nx) % nx], d = g[(((iy + 1) % ny) + ny) % ny][(((ix + 1) % nx) + nx) % nx];
    return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
  };
}
function fbm(rand, sx = 1, sy = 1) {
  const a = vnoise(rand, 8 * sx, 8 * sy), b = vnoise(rand, 4 * sx, 4 * sy), c = vnoise(rand, 2 * sx, 2 * sy);
  return (x, y) => a(x, y) * 0.55 + b(x, y) * 0.3 + c(x, y) * 0.15;
}
const W16 = (v) => ((v % 16) + 16) % 16;

// ---- painters -----------------------------------------------------------------------------
// Natural rock: soft patches, flecks and a crack or two.
function pNatural(p, R, o = {}) {
  const n = fbm(p.rand, o.sx || 1, o.sy || 1);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let v = n(x, y) * (o.contrast || 1) + (p.rand() - 0.5) * (o.grain ?? 0.18);
    p.set(x, y, pick(R, clamp(v * 0.9 + 0.12, 0, 0.999)));
  }
  if (o.flecks) for (const [col, ch] of o.flecks) p.speck(col, ch, 0.12);
  for (let k = 0; k < (o.cracks ?? 2); k++) {
    let x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16);
    for (let i = 0; i < 3 + Math.floor(p.rand() * 4); i++) {
      p.set(W16(x), W16(y), R[0]); p.set(W16(x), W16(y + 1), R[R.length - 2]);
      x += p.rand() < 0.6 ? 1 : 0; y += p.rand() < 0.5 ? 1 : -1;
    }
  }
}
// Rounded cobbles with dark mortar, lit from the top-left.
function pCobble(p, R, mortar, cells = 8, o = {}) {
  const pts = [];
  for (let i = 0; i < cells; i++) pts.push([p.rand() * 16, p.rand() * 16, p.rand()]);
  const M = mortar || R[0];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let d1 = 99, d2 = 99, best = null;
    for (const c of pts) for (const ox of [-16, 0, 16]) for (const oy of [-16, 0, 16]) {
      const d = Math.hypot(x + 0.5 - c[0] - ox, (y + 0.5 - c[1] - oy) * 1.1);
      if (d < d1) { d2 = d1; d1 = d; best = [c, ox, oy]; } else if (d < d2) d2 = d;
    }
    const edge = d2 - d1;
    if (edge < (o.mortar ?? 1.1)) { p.set(x, y, edge < 0.55 ? M : shade(M, 1.25)); continue; }
    const [c, ox, oy] = best;
    const nx = (x + 0.5 - c[0] - ox), ny = (y + 0.5 - c[1] - oy), l = Math.hypot(nx, ny) || 1;
    const lit = -(nx + ny) / l * 0.22;
    const rim = edge < 2 ? -0.18 : 0;
    const v = clamp(0.35 + c[2] * 0.3 + lit + rim + (p.rand() - 0.5) * 0.1, 0, 0.999);
    p.set(x, y, pick(R, v));
  }
}
// Bricks with bevels: w x h bricks, offset rows, 1px mortar.
function pBricks(p, R, mortar, bw = 8, bh = 4, o = {}) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const row = Math.floor(y / bh), off = (row % 2) * (o.offset ?? bw / 2);
    const lx = W16(x + off) % bw, ly = y % bh;
    const brick = Math.floor(W16(x + off) / bw) + row * 7;
    if (ly === bh - 1 || lx === bw - 1) { p.set(x, y, shade(mortar, 0.9 + p.rand() * 0.15)); continue; }
    let v = 0.42 + ((brick * 37) % 10) / 40 + (p.rand() - 0.5) * 0.12;
    if (ly === 0 || lx === 0) v += 0.22;
    if (ly === bh - 2 || lx === bw - 2) v -= 0.18;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
}
// Smooth, polished face with a bevelled frame.
function pPolished(p, R, o = {}) {
  const n = fbm(p.rand, 2, 2);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let v = 0.5 + (n(x, y) - 0.5) * 0.25 + (p.rand() - 0.5) * 0.05;
    if (x === 0 || y === 0) v = 0.86; else if (x === 15 || y === 15) v = 0.14;
    else if (x === 1 || y === 1) v += 0.12; else if (x === 14 || y === 14) v -= 0.12;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
}
// Four (or more) square tiles.
function pTiles(p, R, mortar, size = 8) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const lx = x % size, ly = y % size;
    if (lx === size - 1 || ly === size - 1) { p.set(x, y, mortar); continue; }
    let v = 0.5 + (((Math.floor(x / size) + Math.floor(y / size) * 3) * 7) % 5) / 25 + (p.rand() - 0.5) * 0.08;
    if (lx === 0 || ly === 0) v += 0.22; if (lx === size - 2 || ly === size - 2) v -= 0.18;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
}
// A carved emblem in a polished frame.
function pChiseled(p, R) {
  pPolished(p, R);
  for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d > 3.2 && d < 4.4) p.set(x, y, R[d < 3.8 ? 1 : 4]);
    if (Math.abs(x - 7.5) < 0.6 && d < 3) p.set(x, y, R[1]);
    if (Math.abs(y - 7.5) < 0.6 && d < 3) p.set(x, y, R[1]);
  }
}
// Pillar side: vertical flutes; top: rings.
function pPillarSide(p, R) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let v = 0.55 + Math.sin((x + 0.5) / 16 * Math.PI * 4) * 0.12 + (p.rand() - 0.5) * 0.06;
    if (y === 0 || y === 15) v = y === 0 ? 0.85 : 0.18;
    if (y === 1 || y === 14) v = 0.4;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
}
function pRings(p, R, border) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    let v = 0.55 + Math.sin(d * 1.8) * 0.12 + (p.rand() - 0.5) * 0.06;
    if (d > 6.5) v = border ? 0.25 : 0.7;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
}
// Doku planks: four boards, dark seams, grain, staggered ends with nail-heads.
function pPlanks(p, R, o = {}) {
  const grain = vnoise(p.rand, 16, 2), g2 = vnoise(p.rand, 8, 1);
  const ends = [3 + Math.floor(p.rand() * 4), 10 + Math.floor(p.rand() * 4), 1 + Math.floor(p.rand() * 4), 8 + Math.floor(p.rand() * 4)];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const b = Math.floor(y / 4), ly = y % 4;
    let v = 0.42 + (b % 2) * 0.06 + (grain(x, y) - 0.5) * 0.35 + (g2(x + b * 5, y) - 0.5) * 0.15;
    if (ly === 0) v += 0.16;
    if (ly === 3) v = 0.06;
    if (x === ends[b] && ly !== 3) v = 0.12;
    if (x === W16(ends[b] + 1) && ly !== 3) v += 0.15;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  if (o.nails !== false) for (let b = 0; b < 4; b++) { const nx = W16(ends[b] + 2); p.set(nx, b * 4 + 1, R[0]); p.set(W16(ends[b] - 2), b * 4 + 1, R[0]); }
}
// Deep bark ridges running up the log.
function pBark(p, R, o = {}) {
  const n = vnoise(p.rand, 4, 16), n2 = vnoise(p.rand, 2, 8);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let v = n(x, y) * 0.7 + n2(x, y) * 0.3;
    v = v < 0.33 ? 0.05 : v < 0.42 ? 0.25 : v > 0.72 ? 0.85 : 0.5 + (v - 0.5) * 0.6;
    p.set(x, y, pick(R, clamp(v + (p.rand() - 0.5) * 0.08, 0, 0.999)));
  }
  if (o.birch) {
    for (let k = 0; k < 7; k++) { const x0 = Math.floor(p.rand() * 13), y0 = Math.floor(p.rand() * 16), w = 2 + Math.floor(p.rand() * 4); for (let i = 0; i < w; i++) { p.set(W16(x0 + i), y0, hexRGB('#2a2622')); if (p.rand() < 0.5) p.set(W16(x0 + i), W16(y0 + 1), hexRGB('#4a443c')); } }
  }
  for (let k = 0; k < (o.knots ?? 1); k++) { const x = 3 + Math.floor(p.rand() * 10), y = 3 + Math.floor(p.rand() * 10); p.set(x, y, R[0]); p.set(x + 1, y, R[1]); p.set(x, y - 1, R[R.length - 1]); }
}
function pLogTop(p, inner, bark, o = {}) {
  const n = vnoise(p.rand, 4, 4);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)) + (n(x, y) - 0.5) * 1.2;
    if (d > 6.6) { p.set(x, y, pick(bark, 0.25 + p.rand() * 0.5)); continue; }
    const ring = Math.sin(d * 2.2);
    let v = 0.55 + ring * 0.16 + (p.rand() - 0.5) * 0.06;
    if (d < 0.9) v = 0.12;
    if (d > 5.9) v = 0.25;
    p.set(x, y, pick(inner, clamp(v, 0, 0.999)));
  }
}
// Clustered leaves. Grey with the tint marker so climate colours them, or in colour.
function pLeaves(p, R, o = {}) {
  const tinted = !!o.tint, A = tinted ? TINTA : 255;
  const holes = o.holes ?? 0.12;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (p.rand() > holes) p.set(x, y, R[1], A);
  for (let k = 0; k < (o.clusters || 16); k++) {
    const cx = Math.floor(p.rand() * 16), cy = Math.floor(p.rand() * 16), s = p.rand();
    for (const [dx, dy, t] of [[0, 0, 3], [1, 0, 3], [0, 1, 2], [1, 1, 2], [-1, 0, 2], [0, -1, 4], [1, -1, 4], [2, 1, 1], [-1, 1, 1]]) {
      const ti = clamp(t + (s > 0.6 ? 1 : 0), 0, R.length - 1);
      p.set(W16(cx + dx), W16(cy + dy), R[ti], A);
    }
    if (o.fruit && p.rand() < 0.35) p.set(W16(cx + 1), W16(cy), o.fruit);
  }
  for (let k = 0; k < 10; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); p.set(x, y, R[0], A); }
}
// Grass on top: lush with darker clumps and bright blade tips.
function pGrassTop(p, o = {}) {
  const n = fbm(p.rand);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = 0.55 + (n(x, y) - 0.5) * 0.35 + (p.rand() - 0.5) * 0.14; p.set(x, y, grey(clamp(v, 0.3, 0.95)), TINTA); }
  for (let k = 0; k < 14; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); p.set(x, y, grey(0.88), TINTA); p.set(x, W16(y + 1), grey(0.4), TINTA); }
}
function pDirt(p, R, o = {}) {
  const n = fbm(p.rand);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, clamp(0.35 + (n(x, y) - 0.5) * 0.5 + (p.rand() - 0.5) * 0.2, 0, 0.999)));
  // clods with a lit top-left edge
  for (let k = 0; k < (o.clods ?? 6); k++) {
    const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16);
    p.set(x, y, R[R.length - 2]); p.set(W16(x + 1), y, R[R.length - 3]); p.set(x, W16(y + 1), R[1]); p.set(W16(x + 1), W16(y + 1), R[0]);
  }
  if (o.pebbles) for (let k = 0; k < o.pebbles; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); p.set(x, y, hexRGB('#9a948c')); p.set(W16(x + 1), y, hexRGB('#6a645e')); }
}
// Side of a grassy block: dirt with an overhanging fringe.
function pFringeSide(p, dirtR, top, o = {}) {
  pDirt(p, dirtR);
  const tinted = o.tint !== false;
  for (let x = 0; x < 16; x++) {
    const h = 2 + Math.floor(p.rand() * 3) + (p.rand() < 0.2 ? 2 : 0);
    for (let y = 0; y < h; y++) {
      const v = y === h - 1 ? 0.42 : 0.6 + p.rand() * 0.3;
      if (tinted) p.set(x, y, grey(v), TINTA); else p.set(x, y, shade(top, v * 1.4));
    }
    p.set(x, h, shade(dirtR[0], 0.8));
  }
}
function pSand(p, R, o = {}) {
  const n = fbm(p.rand, 1.5, 0.6);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const ripple = Math.sin((y + n(x, y) * 4) * 1.6) * 0.06;
    p.set(x, y, pick(R, clamp(0.5 + (n(x, y) - 0.5) * 0.3 + ripple + (p.rand() - 0.5) * 0.18, 0, 0.999)));
  }
}
function pOre(p, baseR, ore, o = {}) {
  pNatural(p, baseR, { cracks: 1, grain: 0.15 });
  const oreR = ramp(ore, 5, 0.6);
  const n = o.n || 5;
  for (let k = 0; k < n; k++) {
    const cx = 2 + Math.floor(p.rand() * 12), cy = 2 + Math.floor(p.rand() * 12);
    const cells = [[0, 0], [1, 0], [0, 1], [1, 1]].filter(() => p.rand() < 0.8).concat(p.rand() < 0.5 ? [[2, 0]] : [[0, 2]]);
    for (const [dx, dy] of cells) { p.set(W16(cx + dx - 1), W16(cy + dy), baseR[0]); p.set(W16(cx + dx), W16(cy + dy + 1), baseR[0]); }
    for (const [dx, dy] of cells) p.set(cx + dx, cy + dy, oreR[2 + ((dx + dy) % 2)]);
    p.set(cx, cy, oreR[4]);
  }
}
// Metal plate block with rivets.
function pMetal(p, R, o = {}) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let v = 0.55 + (p.rand() - 0.5) * 0.08 + ((x + y) % 7 === 0 ? 0.06 : 0);
    if (x === 0 || y === 0) v = 0.92; else if (x === 15 || y === 15) v = 0.1; else if (x === 1 || y === 1) v = 0.72; else if (x === 14 || y === 14) v = 0.28;
    if (o.cross && (x === 7 || y === 7)) v = 0.3;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
  for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) { p.set(x, y, R[R.length - 1]); p.set(x + 1, y + 1, R[0]); }
}
// Faceted gem block.
function pGemBlock(p, R) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const a = Math.abs(x - 7.5), b = Math.abs(y - 7.5);
    let v = 0.5 + (a + b < 7 ? 0.12 : -0.05) + ((x > y) !== (15 - x > y) ? 0.08 : -0.06) + (p.rand() - 0.5) * 0.06;
    if (x === 0 || y === 0) v = 0.95; else if (x === 15 || y === 15) v = 0.1;
    p.set(x, y, pick(R, clamp(v, 0, 0.999)));
  }
}
// Knitted wool in grey (coloured later).
function pWool(p, base) {
  const R = ramp(base, 6, 0.35);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const k = ((x + Math.floor(y / 2) * 2) % 4 < 2) ? 0.62 : 0.45;
    p.set(x, y, pick(R, clamp(k + (p.rand() - 0.5) * 0.15 + (y % 2 ? 0.05 : 0), 0, 0.999)));
  }
}
function pGlass(p, edge, a = 210, o = {}) {
  const E = hexRGB(edge);
  for (let i = 0; i < 16; i++) { p.set(i, 0, E, a); p.set(i, 15, shade(E, 0.7), a); p.set(0, i, E, a); p.set(15, i, shade(E, 0.7), a); }
  for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]]) p.set(x, y, E, a);
  for (let i = 3; i < 8; i++) p.set(i, 10 - i, [255, 255, 255], 190);
  for (let i = 9; i < 12; i++) p.set(i, 21 - i, [255, 255, 255], 160);
  if (o.fill) for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) if (!p.alpha(x, y)) p.set(x, y, shade(o.fill, 0.92 + p.rand() * 0.1), o.fa ?? 120);
}
// Crossed-plant helpers
function stem(p, x, y0, y1, col) { for (let y = y0; y <= y1; y++) p.set(x, y, shade(col, 0.85 + p.rand() * 0.3)); }
function flower(p, petals, centre, o = {}) {
  const S = hexRGB('#3d7a2a');
  stem(p, 7, o.top ?? 8, 15, S); p.set(6, 12, hexRGB('#4f9a34')); p.set(5, 11, hexRGB('#4f9a34')); p.set(8, 13, hexRGB('#4f9a34')); p.set(9, 12, hexRGB('#4f9a34'));
  const P = ramp(petals, 4, 0.45), cy = (o.top ?? 8) - 2;
  const shape = o.shape || [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
  for (const [dx, dy] of shape) p.set(7 + dx, cy + dy, P[clamp(2 - dy + (dx < 0 ? 0 : -1), 0, 3)]);
  for (const [dx, dy] of shape) if (Math.abs(dx) + Math.abs(dy) >= 2) p.set(7 + dx + Math.sign(dx), cy + dy + Math.sign(dy), P[0]);
  p.set(7, cy, hexRGB(centre));
}

// ---- tile registration helpers ------------------------------------------------------------------
// Animated tile: the painter receives (p, frame, frames).
function addAnim(name, frames, fps, painter, tintKind, res = 16) {
  // painting it again replaces the old animation
  const old = ATLAS.tile[name];
  if (old !== undefined) for (let i = ANIMS.length - 1; i >= 0; i--) if (ANIMS[i].tile === old) ANIMS.splice(i, 1);
  const idx = addTile(name, p => painter(p, 0, frames), 0, tintKind, res);
  const list = [];
  for (let f = 0; f < frames; f++) { const px = new Px(seedFromString(name) + f * 7, res); painter(px, f, frames); list.push(new Uint8Array(toTileSize(px.d, res).buffer.slice(0))); }
  ANIMS.push({ tile: idx, frames: list, fps, phase: 0, cur: -1 });
  return idx;
}
// Item sprite: painted, then given the dark Doku outline.
function addItem(name, painter, res = 16) {
  (ATLAS.items || (ATLAS.items = new Set())).add(name);
  return addTile(name, p => { painter(p); outlineSprite(p); }, 0, undefined, res);
}
function outlineSprite(p, col = [26, 18, 14]) {
  const W = p.w;
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < W && p.alpha(x, y) > 40;
  const add = [];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    if (solid(x, y)) continue;
    if (solid(x + 1, y) || solid(x - 1, y) || solid(x, y + 1) || solid(x, y - 1)) add.push([x, y]);
  }
  for (const [x, y] of add) p.set(x, y, col, 230);
}

// ---- the whole block set ---------------------------------------------------------------------------
const STONE_SPECS = {
  // key: [base colour, style, extra]
  stone: ['#8b8c90', 'natural'], granite: ['#a87561', 'speck', [['#c9907a', 0.12], ['#6a4436', 0.1], ['#d8b0a0', 0.04]]],
  diorite: ['#b9b6b2', 'speck', [['#e8e6e2', 0.18], ['#6a6866', 0.1]]], andesite: ['#86878a', 'speck', [['#6a6b6e', 0.15], ['#a6a7aa', 0.1]]],
  slate: ['#4d5360', 'layered'], tuff: ['#6d6e60', 'speck', [['#8a8a78', 0.12], ['#4e4f44', 0.1]]], calcite: ['#dfe0dc', 'natural'],
  dripstone_block: ['#86684e', 'streak'], marble: ['#e2e0dc', 'veined'], limestone: ['#cfc4a4', 'fossil'], blackstone: ['#2c2830', 'speck', [['#3e3a44', 0.15], ['#b8962a', 0.012]]],
  desert_stone: ['#b07a54', 'layered'], end_stone: ['#dcdca0', 'pitted'], emberstone: ['#7a2f26', 'speck', [['#4e1a14', 0.2], ['#a8473a', 0.08]]],
  skystone: ['#b4bccb', 'natural'], basalt: ['#4a4a50', 'columns'], prismarine: ['#5ea69a', 'mottled'],
  red_sandstone: ['#b95c25', 'banded'], sandstone: ['#d9c88e', 'banded'], obsidian: ['#1d1428', 'glint'], crying_obsidian: ['#24123a', 'glint'],
  smooth_stone: ['#9fa0a4', 'polished'], packed_mud: ['#8a6a4e', 'natural'], mud: ['#4a3c34', 'natural'], end: ['#000', 'x'],
};
function paintStone(p, key) {
  const [hex, style, fl] = STONE_SPECS[key];
  const R = ramp(hex, 7, 0.5);
  if (style === 'natural') pNatural(p, R, { cracks: 2 });
  else if (style === 'speck') pNatural(p, R, { cracks: 0, flecks: fl.map(([c, ch]) => [hexRGB(c), ch]) });
  else if (style === 'layered') { pNatural(p, R, { sx: 2, sy: 0.25, cracks: 1 }); for (let y = 3; y < 16; y += 5) for (let x = 0; x < 16; x++) if (p.rand() < 0.8) p.set(x, y, R[1]); }
  else if (style === 'streak') pNatural(p, R, { sx: 0.25, sy: 2, cracks: 0 });
  else if (style === 'veined') { pNatural(p, R, { cracks: 0, grain: 0.06, contrast: 0.4 }); let x = p.rand() * 16; for (let y = 0; y < 16; y++) { x += (p.rand() - 0.5) * 2.2; p.set(W16(Math.round(x)), y, R[2]); p.set(W16(Math.round(x) + 1), y, R[3]); } let y2 = p.rand() * 16; for (let xx = 0; xx < 16; xx++) { y2 += (p.rand() - 0.5) * 1.5; if (p.rand() < 0.7) p.set(xx, W16(Math.round(y2)), R[3]); } }
  else if (style === 'fossil') { pNatural(p, R, { cracks: 0, grain: 0.1 }); for (let k = 0; k < 3; k++) { const cx = 2 + Math.floor(p.rand() * 12), cy = 2 + Math.floor(p.rand() * 12); for (let a = 0; a < 6; a++) p.set(W16(cx + Math.round(Math.cos(a) * 1.5)), W16(cy + Math.round(Math.sin(a) * 1.5)), R[1]); } }
  else if (style === 'pitted') { pNatural(p, R, { cracks: 0 }); for (let k = 0; k < 8; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); p.set(x, y, R[1]); p.set(W16(x + 1), y, R[2]); p.set(x, W16(y - 1), R[5]); } }
  else if (style === 'columns') { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = x % 5; let v = 0.45 + (c === 0 ? -0.3 : c === 1 ? 0.25 : 0) + (p.rand() - 0.5) * 0.12; p.set(x, y, pick(R, clamp(v, 0, 0.999))); } }
  else if (style === 'mottled') { pNatural(p, R, { cracks: 0, contrast: 1.6 }); for (let k = 0; k < 6; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, hexRGB('#7fc6b4'), 0.1); }
  else if (style === 'banded') { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const band = y < 3 ? 0.75 : y === 3 ? 0.3 : y % 5 === 2 ? 0.38 : 0.55; p.set(x, y, pick(R, clamp(band + (p.rand() - 0.5) * 0.12, 0, 0.999))); } }
  else if (style === 'glint') { pNatural(p, R, { cracks: 0, contrast: 1.4 }); p.speck(hexRGB(key === 'crying_obsidian' ? '#8a3ae0' : '#5a4380'), 0.06); if (key === 'crying_obsidian') for (let k = 0; k < 4; k++) { const x = Math.floor(p.rand() * 16); let y = Math.floor(p.rand() * 10); for (let i = 0; i < 4; i++) p.set(x, y++, hexRGB('#b45cff')); } }
  else if (style === 'polished') pPolished(p, R);
}

const WOOD_SPECS = {
  oak: { plank: '#b08a50', bark: '#5e4428', inner: '#b89462' }, birch: { plank: '#d8c48e', bark: '#e2ddd2', inner: '#d8c690', birch: true }, spruce: { plank: '#7a5a34', bark: '#3e2c1c', inner: '#8a6a43' },
  jungle: { plank: '#a8784e', bark: '#56441e', inner: '#b07a4e' }, acacia: { plank: '#b85e30', bark: '#6a625a', inner: '#b8643a' }, dark_oak: { plank: '#4e331a', bark: '#3a2a18', inner: '#5e4024' },
  cherry: { plank: '#e8b4ac', bark: '#3a2228', inner: '#e2a8a0' }, mangrove: { plank: '#7a3430', bark: '#5a4a34', inner: '#7e3a32' },
  crimson: { plank: '#6a3448', bark: '#5c1a2e', inner: '#a03a4a' }, warped: { plank: '#2e6a64', bark: '#3a2a48', inner: '#3a8a7e' },
  pine: { plank: '#c9a066', bark: '#5a4230', inner: '#d6b07a' }, aspen: { plank: '#e2d2a4', bark: '#c4c0b0', inner: '#e8d8a8', birch: true },
  bamboo: { plank: '#d8c060', bark: '#7a9a2a', inner: '#e0cc78', noLog: true },
};

function paintDokuBlocks() {
  // --- natural ground ---
  const DIRT = ramp('#7a5634', 7, 0.55);
  addTile('dirt', p => pDirt(p, DIRT, { pebbles: 3 }));
  addTile('coarse_dirt', p => pDirt(p, DIRT, { pebbles: 14, clods: 10 }));
  addTile('rooted_dirt', p => { pDirt(p, DIRT); for (let k = 0; k < 4; k++) { let x = Math.floor(p.rand() * 16), y = 0; for (let i = 0; i < 9; i++) { p.set(W16(x), y, hexRGB('#c2a07a')); y++; x += p.rand() < 0.3 ? 1 : p.rand() < 0.3 ? -1 : 0; } } });
  addTile('grass_top', p => pGrassTop(p), 0, 'grass');
  addTile('grass_side', p => pFringeSide(p, DIRT), 0, 'grass');
  addTile('sky_grass_top', p => { pGrassTop(p); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = p.get(x, y); p.set(x, y, mix([c[0], c[1], c[2]], hexRGB('#9ee8d8'), 0.55)); } });
  addTile('sky_grass_side', p => { pFringeSide(p, ramp('#8a8070', 7, 0.5)); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = p.get(x, y); if (c[3] === 253) p.set(x, y, mix([c[0], c[1], c[2]], hexRGB('#9ee8d8'), 0.55)); } });
  addTile('snowy_grass_side', p => pFringeSide(p, DIRT, hexRGB('#f2f6fa'), { tint: false }));
  addTile('snow', p => { pNatural(p, ramp('#eef3f8', 5, 0.12), { cracks: 0, grain: 0.1 }); p.speck(hexRGB('#ffffff'), 0.08); });
  addTile('podzol_top', p => { pDirt(p, ramp('#6a4628', 6, 0.5)); for (let k = 0; k < 30; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); p.set(x, y, hexRGB('#8a5a2a')); p.set(W16(x + 1), W16(y + 1), hexRGB('#4a2e18')); } });
  addTile('podzol_side', p => pFringeSide(p, DIRT, hexRGB('#6a4628'), { tint: false }));
  addTile('mycelium_top', p => { pNatural(p, ramp('#7a6a74', 6, 0.4), { cracks: 0 }); p.speck(hexRGB('#b8a8b4'), 0.08); });
  addTile('mycelium_side', p => pFringeSide(p, DIRT, hexRGB('#7a6a74'), { tint: false }));
  addTile('moss_block', p => { pNatural(p, ramp('#58802e', 6, 0.45), { cracks: 0, contrast: 1.3 }); p.speck(hexRGB('#8ab04a'), 0.1); });
  addTile('farmland', p => { const R = ramp('#4e3420', 6, 0.5); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { let v = 0.45 + (p.rand() - 0.5) * 0.25; if (y % 4 === 0) v = 0.15; if (y % 4 === 1) v += 0.2; p.set(x, y, pick(R, clamp(v, 0, 0.999))); } });
  addTile('sand', p => pSand(p, ramp('#dccf98', 6, 0.3)));
  addTile('red_sand', p => pSand(p, ramp('#be6a2c', 6, 0.35)));
  addTile('silver_sand', p => pSand(p, ramp('#c6c8c4', 6, 0.3)));
  addTile('gravel', p => pCobble(p, ramp('#857f7c', 6, 0.6), hexRGB('#4a4644'), 16, { mortar: 0.9 }));
  addTile('clay', p => { pNatural(p, ramp('#9ea4b0', 5, 0.25), { cracks: 0, grain: 0.08 }); for (let y = 2; y < 16; y += 5) for (let x = 0; x < 16; x++) if (p.rand() < 0.5) p.set(x, y, hexRGB('#8a909c')); });
  addTile('permafrost', p => { pDirt(p, ramp('#5e6a74', 6, 0.5)); p.speck(hexRGB('#c8e0f0'), 0.08); });
  addTile('soul_soil', p => { pDirt(p, ramp('#4a3a2e', 6, 0.45)); for (let k = 0; k < 2; k++) { const x = 3 + Math.floor(p.rand() * 9), y = 3 + Math.floor(p.rand() * 9); p.set(x, y, hexRGB('#2a1e16')); p.set(x + 2, y, hexRGB('#2a1e16')); p.set(x + 1, y + 2, hexRGB('#2a1e16')); } });
  addTile('ash', p => { pNatural(p, ramp('#4a4542', 6, 0.5), { cracks: 0 }); p.speck(hexRGB('#ff8a3d'), 0.012); });
  addTile('bedrock', p => pCobble(p, ramp('#4a4a4a', 6, 0.7), hexRGB('#141414'), 10));
  addTile('mud', p => { paintStone(p, 'mud'); p.speck(hexRGB('#6a5444'), 0.08); });
  addTile('packed_mud', p => { paintStone(p, 'packed_mud'); for (let k = 0; k < 12; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 16); p.set(x, y, hexRGB('#c8a868')); p.set(x + 1, y, hexRGB('#b0905a')); } });
  addTile('mud_bricks', p => pBricks(p, ramp('#8e6c50', 6, 0.4), hexRGB('#5a4636'), 8, 4));

  // --- stones ---
  for (const k of ['stone', 'granite', 'diorite', 'andesite', 'slate', 'tuff', 'calcite', 'dripstone_block', 'marble', 'limestone', 'blackstone', 'desert_stone', 'end_stone', 'emberstone', 'skystone', 'basalt', 'prismarine', 'obsidian', 'crying_obsidian', 'smooth_stone'])
    addTile(k, p => paintStone(p, k));
  addTile('basalt_top', p => pRings(p, ramp('#4a4a50', 6, 0.5), true));
  addTile('cobblestone', p => pCobble(p, ramp('#86868a', 7, 0.6), hexRGB('#2e2c30'), 8));
  addTile('mossy_cobblestone', p => { pCobble(p, ramp('#86868a', 7, 0.6), hexRGB('#2e2c30'), 8); for (let k = 0; k < 40; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); p.set(x, y, shade(hexRGB('#5a8a3a'), 0.75 + p.rand() * 0.45)); } });
  addTile('cobbled_slate', p => pCobble(p, ramp('#4d5360', 7, 0.6), hexRGB('#1a1c22'), 10));
  addTile('stone_bricks', p => pBricks(p, ramp('#86878b', 7, 0.45), hexRGB('#3a3a3e'), 8, 8, { offset: 4 }));
  addTile('mossy_stone_bricks', p => { pBricks(p, ramp('#86878b', 7, 0.45), hexRGB('#3a3a3e'), 8, 8, { offset: 4 }); for (let k = 0; k < 34; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); p.set(x, y, shade(hexRGB('#5a8a3a'), 0.75 + p.rand() * 0.45)); } });
  addTile('cracked_stone_bricks', p => { pBricks(p, ramp('#86878b', 7, 0.45), hexRGB('#3a3a3e'), 8, 8, { offset: 4 }); let x = 2, y = 0; for (let i = 0; i < 16; i++) { p.set(W16(x), W16(y), hexRGB('#2a2a2e')); y++; x += p.rand() < 0.5 ? 1 : 0; } });
  addTile('chiseled_stone_bricks', p => pChiseled(p, ramp('#86878b', 7, 0.45)));
  addTile('bricks', p => pBricks(p, ramp('#9a4433', 7, 0.45), hexRGB('#c2b4a2'), 8, 4));
  addTile('nether_bricks', p => pBricks(p, ramp('#4a1c1c', 6, 0.5), hexRGB('#1e0a0a'), 8, 4));
  addTile('red_nether_bricks', p => pBricks(p, ramp('#6e1414', 6, 0.5), hexRGB('#2a0606'), 8, 4));
  for (const [k, hex, m] of [['polished_granite', '#a87561'], ['polished_diorite', '#c6c4c0'], ['polished_andesite', '#8a8c90'], ['polished_slate', '#4d5360'], ['polished_basalt', '#55555c'], ['quartz_block', '#ece6dc'], ['purpur_block', '#a87aa8'], ['cut_copper', '#c06a48'], ['exposed_cut_copper', '#a07a5e'], ['weathered_cut_copper', '#6a9a7a'], ['oxidized_cut_copper', '#4fa08a']])
    addTile(k, p => k.includes('cut_copper') ? pTiles(p, ramp(hex, 6, 0.4), shade(hexRGB(hex), 0.45), 8) : pPolished(p, ramp(hex, 7, 0.4)));
  for (const [k, hex, mortar] of [['slate_bricks', '#4d5360', '#1a1c22'], ['marble_bricks', '#dcdad6', '#9a9894'], ['limestone_bricks', '#cfc4a4', '#8a8268'], ['blackstone_bricks', '#2c2830', '#121014'], ['emberstone_bricks', '#7a2f26', '#2e0e0a'],
    ['skystone_bricks', '#b4bccb', '#6a7080'], ['desert_stone_bricks', '#b07a54', '#5a3a26'], ['end_stone_bricks', '#dcdca0', '#8a8a5a'], ['prismarine_bricks', '#63ab9c', '#2e5a52'], ['quartz_bricks', '#ece6dc', '#b0a898']])
    addTile(k, p => pBricks(p, ramp(hex, 7, 0.45), hexRGB(mortar), 8, k === 'marble_bricks' || k === 'skystone_bricks' ? 8 : 4, { offset: 4 }));
  addTile('slate_tiles', p => pTiles(p, ramp('#4d5360', 6, 0.45), hexRGB('#1a1c22'), 4));
  addTile('dark_prismarine', p => pTiles(p, ramp('#2e5a4e', 6, 0.45), hexRGB('#16302a'), 8));
  addTile('marble_pillar', p => pPillarSide(p, ramp('#e2e0dc', 6, 0.35)));
  addTile('marble_pillar_top', p => pRings(p, ramp('#e2e0dc', 6, 0.35)));
  addTile('quartz_pillar', p => pPillarSide(p, ramp('#ece6dc', 6, 0.3)));
  addTile('quartz_pillar_top', p => pRings(p, ramp('#ece6dc', 6, 0.3)));
  addTile('sandstone_top', p => pSand(p, ramp('#d9c88e', 6, 0.25)));
  addTile('sandstone_side', p => paintStone(p, 'sandstone'));
  addTile('cut_sandstone', p => pTiles(p, ramp('#d9c88e', 6, 0.3), hexRGB('#a8945e'), 16));
  addTile('chiseled_sandstone', p => pChiseled(p, ramp('#d9c88e', 6, 0.35)));
  addTile('red_sandstone_top', p => pSand(p, ramp('#b95c25', 6, 0.3)));
  addTile('red_sandstone_side', p => paintStone(p, 'red_sandstone'));
  addTile('roof_tiles', p => { const R = ramp('#a2482e', 7, 0.5); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const row = Math.floor(y / 4), off = (row % 2) * 2, lx = (x + off) % 4, ly = y % 4; let v = 0.6 - ly * 0.1 + (lx === 0 ? -0.35 : lx === 1 ? 0.15 : 0) + (p.rand() - 0.5) * 0.08; if (ly === 3) v = 0.08; p.set(x, y, pick(R, clamp(v, 0, 0.999))); } });
  addTile('dark_roof_tiles', p => { const R = ramp('#3e4654', 7, 0.5); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const row = Math.floor(y / 4), off = (row % 2) * 4, lx = (x + off) % 8, ly = y % 4; let v = 0.6 - ly * 0.08 + (lx === 0 ? -0.35 : 0) + (p.rand() - 0.5) * 0.1; if (ly === 3) v = 0.06; p.set(x, y, pick(R, clamp(v, 0, 0.999))); } });

  // --- ores, metals, gems ---
  const SR = ramp('#8b8c90', 7, 0.5), DR = ramp('#4d5360', 7, 0.5);
  for (const [k, ore, base, n] of [['coal_ore', '#2a2a2a', SR, 6], ['iron_ore', '#d8a888', SR], ['gold_ore', '#f6d541', SR], ['diamond_ore', '#5ee6e0', DR, 4], ['copper_ore', '#e07a48', SR],
    ['lapis_ore', '#2a50c8', SR], ['emerald_ore', '#30d070', SR, 3], ['tin_ore', '#d4d8dc', SR], ['mese_ore', '#f0e020', DR, 4]]) addTile(k, p => pOre(p, base, ore, { n: n || 5 }));
  addTile('quartz_ore', p => pOre(p, ramp('#7a2f26', 7, 0.5), '#f2ece2', { n: 6 }));
  addTile('cinderite_ore', p => pOre(p, ramp('#7a2f26', 7, 0.5), '#ff8a3d', { n: 5 }));
  addTile('aether_crystal_ore', p => pOre(p, ramp('#b4bccb', 7, 0.4), '#9be0ff', { n: 4 }));
  for (const [k, hex] of [['iron_block', '#d6d6d6'], ['gold_block', '#f2cf3a'], ['copper_block', '#c87050'], ['exposed_copper', '#a8806a'], ['weathered_copper', '#6aa088'], ['oxidized_copper', '#52a690'], ['tin_block', '#c8ccd2'], ['bronze_block', '#b98a46'], ['coal_block', '#2a2a2c']])
    addTile(k, p => { pMetal(p, ramp(hex, 7, 0.45), { cross: k === 'iron_block' }); if (k === 'exposed_copper' || k === 'weathered_copper') p.speck(hexRGB(k === 'exposed_copper' ? '#4fa08a' : '#c87050'), 0.12); });
  for (const [k, hex] of [['diamond_block', '#5ee6e0'], ['emerald_block', '#30c070'], ['lapis_block', '#2a50c8'], ['amethyst_block', '#9a6ad0']]) addTile(k, p => pGemBlock(p, ramp(hex, 7, 0.5)));
  addTile('glowstone', p => { pCobble(p, ramp('#e9b84a', 6, 0.5), hexRGB('#7a5520'), 9); p.speck(hexRGB('#fff3b8'), 0.06); });
  addTile('mese_lamp', p => { pCobble(p, ramp('#f0e030', 6, 0.35), hexRGB('#b0a010'), 7); p.speck(hexRGB('#ffffc0'), 0.1); });
  addTile('amethyst_cluster', p => { const R = ramp('#a070e0', 4, 0.5); for (const [x, h] of [[4, 6], [7, 10], [10, 7], [6, 4], [12, 5]]) for (let y = 15; y > 15 - h; y--) { p.set(x, y, R[2]); p.set(x + 1, y, R[1]); } p.set(7, 6, R[3]); p.set(10, 9, R[3]); });
  addTile('sponge', p => { pNatural(p, ramp('#d6c84a', 6, 0.35), { cracks: 0 }); for (let k = 0; k < 14; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); p.set(x, y, hexRGB('#8a7a20')); } });
  addTile('dried_kelp_side', p => { const R = ramp('#3e4a2a', 6, 0.5); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, clamp(0.45 + Math.sin(x * 1.4) * 0.15 + (y % 5 === 0 ? -0.3 : 0) + (p.rand() - 0.5) * 0.1, 0, 0.999))); });
  addTile('dried_kelp_top', p => pRings(p, ramp('#3e4a2a', 6, 0.5)));

  // --- ice & glass ---
  addTile('ice', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(hexRGB('#9cc4f4'), 0.95 + p.rand() * 0.1), 200); for (let i = 0; i < 4; i++) { let x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); for (let k = 0; k < 5; k++) { p.set(W16(x), W16(y), hexRGB('#e6f2ff'), 230); x += 1; y += p.rand() < 0.5 ? 1 : 0; } } });
  addTile('packed_ice', p => { pNatural(p, ramp('#8ab4e8', 6, 0.3), { cracks: 3, grain: 0.06 }); });
  addTile('blue_ice', p => { pNatural(p, ramp('#5a8ae8', 6, 0.35), { cracks: 3, grain: 0.06 }); p.speck(hexRGB('#c8e0ff'), 0.04); });
  addTile('glass', p => pGlass(p, '#dff3f7'));
  addTile('tinted_glass', p => pGlass(p, '#5a4a6a', 230, { fill: hexRGB('#2a2236'), fa: 200 }));
  addTile('obsidian_glass', p => pGlass(p, '#3e2a5c', 230, { fill: hexRGB('#1a1028'), fa: 90 }));

  // --- wood ---
  for (const [w, S] of Object.entries(WOOD_SPECS)) {
    const PR = ramp(S.plank, 7, 0.5), BR = ramp(S.bark, 7, 0.55), IR = ramp(S.inner, 6, 0.4);
    const planks = w === 'oak' ? 'planks' : w + '_planks';
    if (!S.noLog) {
      addTile(planks, p => pPlanks(p, PR));
      addTile(w === 'oak' ? 'log_side' : w + '_log_side', p => pBark(p, BR, { birch: S.birch, knots: 1 }));
      addTile(w === 'oak' ? 'log_top' : w + '_log_top', p => pLogTop(p, IR, BR));
      addTile('stripped_' + w + '_log_side', p => pBark(p, ramp(S.inner, 7, 0.3), { knots: 0 }));
      addTile('stripped_' + w + '_log_top', p => pLogTop(p, IR, ramp(S.inner, 6, 0.3)));
    }
    // doors: framed boards with iron straps; the top half has a little window
    const door = (p, upper) => {
      pPlanks(p, PR, { nails: false });
      for (let y = 0; y < 16; y++) { p.set(0, y, PR[0]); p.set(15, y, PR[0]); p.set(1, y, PR[2]); }
      if (upper) {
        for (let y = 3; y < 11; y++) for (let x = 4; x < 12; x++) p.set(x, y, [0, 0, 0], 0);
        for (let i = 3; i < 11; i++) { p.set(7, i, PR[1]); p.set(8, i, PR[1]); }
        for (let i = 4; i < 12; i++) { p.set(i, 6, PR[1]); p.set(i, 7, PR[1]); }
        for (let i = 3; i < 12; i++) { p.set(i, 2, PR[0]); p.set(i, 11, PR[0]); p.set(3, i, PR[0]); p.set(12, i, PR[0]); }
      } else {
        for (const y of [2, 12]) for (let x = 1; x < 15; x++) { p.set(x, y, hexRGB('#3a3a40')); p.set(x, y + 1, hexRGB('#6a6a74')); }
        for (let i = 3; i < 12; i++) p.set(i, 13 - i + 1, PR[1]);
        p.set(12, 7, hexRGB('#2a2a2e')); p.set(12, 8, hexRGB('#9a9aa4'));
      }
    };
    addTile(w + '_door_upper', p => door(p, true));
    addTile(w + '_door_lower', p => door(p, false));
    addItem(w + '_door_item', p => { for (let y = 1; y < 15; y++) for (let x = 4; x < 12; x++) p.set(x, y, pick(PR, 0.4 + (x % 2) * 0.15 + (p.rand() - 0.5) * 0.1)); for (let y = 3; y < 7; y++) for (let x = 6; x < 10; x++) p.set(x, y, hexRGB('#2a2a30')); p.set(10, 9, hexRGB('#d8d8d8')); for (let x = 4; x < 12; x++) p.set(x, 11, hexRGB('#4a4a50')); });
    addTile(w + '_trapdoor', p => {
      pPlanks(p, PR, { nails: false });
      for (let i = 0; i < 16; i++) { p.set(i, 0, PR[0]); p.set(i, 15, PR[0]); p.set(0, i, PR[0]); p.set(15, i, PR[0]); }
      for (const [x, y] of [[4, 4], [11, 4], [4, 11], [11, 11]]) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) p.set(x + a, y + b, [0, 0, 0], 0);
      for (let i = 2; i < 14; i++) p.set(i, i, PR[1]);
    });
    addItem(w + '_sign_item', p => { for (let y = 3; y < 10; y++) for (let x = 2; x < 14; x++) p.set(x, y, pick(PR, 0.45 + (y === 3 ? 0.3 : y === 9 ? -0.3 : 0) + (p.rand() - 0.5) * 0.1)); for (let x = 4; x < 12; x++) { if (p.rand() < 0.7) p.set(x, 5, PR[0]); if (p.rand() < 0.7) p.set(x, 7, PR[0]); } for (let y = 10; y < 15; y++) { p.set(7, y, BR[3]); p.set(8, y, BR[2]); } });
  }
  addTile('boat_planks', p => pPlanks(p, ramp('#8a6438', 7, 0.5)));
  addTile('boat_rail', p => pPlanks(p, ramp('#5e4428', 7, 0.45), { nails: false }));
  // leaves (grey + tint marker unless naturally coloured)
  const GL = [grey(0.22), grey(0.42), grey(0.56), grey(0.7), grey(0.82), grey(0.93)];
  addTile('leaves', p => pLeaves(p, GL, { tint: true, fruit: null }), 0, 'foliage');
  addTile('birch_leaves', p => pLeaves(p, GL.map(c => shade(c, 1.08)), { tint: true }), 0, 'foliage');
  addTile('spruce_leaves', p => pLeaves(p, ramp('#2e5a38', 6, 0.5), { holes: 0.08 }));
  addTile('jungle_leaves', p => pLeaves(p, GL, { tint: true, clusters: 20 }), 0, 'foliage');
  addTile('acacia_leaves', p => pLeaves(p, GL.map(c => shade(c, 0.95)), { tint: true, holes: 0.2 }), 0, 'foliage');
  addTile('dark_oak_leaves', p => pLeaves(p, GL.map(c => shade(c, 0.85)), { tint: true, holes: 0.06, clusters: 22 }), 0, 'foliage');
  addTile('mangrove_leaves', p => pLeaves(p, GL, { tint: true, holes: 0.1 }), 0, 'foliage');
  addTile('cherry_leaves', p => pLeaves(p, ramp('#e89ab4', 6, 0.4), { holes: 0.14, clusters: 18 }));
  addTile('aspen_leaves', p => pLeaves(p, GL.map(c => shade(c, 1.12)), { tint: true, holes: 0.16, clusters: 14 }), 0, 'foliage');
  addTile('pine_needles', p => { const R = ramp('#2a5a36', 6, 0.5); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (p.rand() > 0.1) p.set(x, y, R[1]); for (let k = 0; k < 40; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16), d = p.rand() < 0.5 ? 1 : -1; for (let i = 0; i < 3; i++) p.set(W16(x + i * d), W16(y + i), R[2 + (i % 3)]); } for (let k = 0; k < 10; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), R[0]); });
  addTile('azalea_leaves', p => pLeaves(p, ramp('#5a8a2e', 6, 0.45), { holes: 0.1, clusters: 18 }));
  addTile('flowering_azalea_leaves', p => pLeaves(p, ramp('#5a8a2e', 6, 0.45), { holes: 0.1, clusters: 18, fruit: hexRGB('#d870c8') }));
  addTile('cloud_leaves', p => pLeaves(p, ramp('#e8f0f8', 6, 0.2), { holes: 0.1 }));
  addTile('nether_wart_block', p => pNatural(p, ramp('#7a1a1e', 6, 0.5), { cracks: 0, contrast: 1.4 }));
  addTile('warped_wart_block', p => pNatural(p, ramp('#167a74', 6, 0.5), { cracks: 0, contrast: 1.4 }));
  addTile('mushroom_stem', p => { pNatural(p, ramp('#dcd4c4', 6, 0.25), { sx: 0.3, sy: 2, cracks: 0 }); });
  addTile('red_mushroom_block', p => { pNatural(p, ramp('#b8282a', 6, 0.35), { cracks: 0 }); for (let k = 0; k < 5; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, hexRGB('#f2ece2'), 0.05); });
  addTile('brown_mushroom_block', p => pNatural(p, ramp('#94704e', 6, 0.35), { cracks: 0 }));

  // --- building blocks of the old crafts ---
  addTile('plaster', p => { pNatural(p, ramp('#e6dcc8', 5, 0.18), { cracks: 1, grain: 0.06 }); });
  addTile('cob', p => { pNatural(p, ramp('#b08e5e', 6, 0.35), { cracks: 0 }); for (let k = 0; k < 18; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 16); p.set(x, y, hexRGB('#e0c878')); p.set(x + 1, y, hexRGB('#c8ae5a')); } });
  addTile('daub', p => { const R = ramp('#b49a74', 6, 0.35); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const weave = ((Math.floor(x / 4) + Math.floor(y / 2)) % 2) ? 0.6 : 0.4; p.set(x, y, pick(R, clamp(weave + (p.rand() - 0.5) * 0.15, 0, 0.999))); } for (let x = 0; x < 16; x += 4) for (let y = 0; y < 16; y++) p.set(x, y, hexRGB('#5e4428')); });
  const timber = (p, kind) => {
    pNatural(p, ramp('#e6dcc8', 5, 0.18), { cracks: 0, grain: 0.06 });
    const B = ramp('#4a3220', 5, 0.4);
    const beam = (x, y) => p.set(W16(x), W16(y), pick(B, 0.4 + p.rand() * 0.3));
    for (let i = 0; i < 16; i++) { beam(i, 0); beam(i, 1); beam(i, 14); beam(i, 15); beam(0, i); beam(1, i); beam(14, i); beam(15, i); }
    if (kind === 'cross') for (let i = 1; i < 15; i++) { beam(i, i); beam(i + 1, i); beam(15 - i, i); beam(14 - i, i); }
    if (kind === 'diagonal') for (let i = 1; i < 15; i++) { beam(i, i); beam(i + 1, i); }
  };
  addTile('timber_frame', p => timber(p, ''));
  addTile('timber_frame_cross', p => timber(p, 'cross'));
  addTile('timber_frame_diagonal', p => timber(p, 'diagonal'));
  addTile('thatch', p => { const R = ramp('#c8a248', 7, 0.45); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const s = ((x + y * 0.5 + Math.floor(y / 4) * 3) % 3) < 1 ? 0.3 : 0.6; p.set(x, y, pick(R, clamp(s + (p.rand() - 0.5) * 0.25, 0, 0.999))); } for (let x = 0; x < 16; x++) p.set(x, 15, R[1]); });
  addTile('hay_side', p => { const R = ramp('#c8a63a', 7, 0.45); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, clamp(0.5 + Math.sin(x * 2.1 + y * 0.2) * 0.2 + (p.rand() - 0.5) * 0.15, 0, 0.999))); for (const y of [3, 12]) for (let x = 0; x < 16; x++) { p.set(x, y, hexRGB('#8a2a20')); p.set(x, y + 1, hexRGB('#5e1a14')); } });
  addTile('hay_top', p => { const R = ramp('#c8a63a', 7, 0.45); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, clamp(0.45 + (p.rand() - 0.5) * 0.5, 0, 0.999))); });
  addTile('terracotta', p => { pNatural(p, ramp('#985c42', 6, 0.25), { cracks: 0, grain: 0.1 }); });

  // --- colours ---
  for (const [c, L, hex] of COLORS) {
    const base = hexRGB(hex);
    if (c === 'white') addTile('wool', p => pWool(p, '#e8e6e0'));
    else addTile(c + '_wool', p => pWool(p, base));
    addTile(c + '_terracotta', p => { pNatural(p, ramp(mix(base, hexRGB('#985c42'), 0.45), 6, 0.25), { cracks: 0, grain: 0.1 }); for (let y = 4; y < 16; y += 6) for (let x = 0; x < 16; x++) if (p.rand() < 0.4) p.set(x, y, shade(mix(base, hexRGB('#985c42'), 0.45), 0.85)); });
    addTile(c + '_concrete', p => pNatural(p, ramp(base, 5, 0.12), { cracks: 0, grain: 0.08 }));
    addTile(c + '_concrete_powder', p => { pSand(p, ramp(mix(base, [235, 235, 235], 0.2), 6, 0.25)); });
    addTile(c + '_glazed_terracotta', p => {
      const A = ramp(base, 5, 0.45), Wc = mix(base, [255, 255, 255], 0.7);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const d = Math.hypot(x - 3.5, y - 3.5), q = (x + y) % 4;
        const col = d < 2 ? Wc : d < 3.3 ? A[3] : q < 2 ? A[1] : A[2];
        for (const [sx, sy] of [[x, y], [15 - y, x], [15 - x, 15 - y], [y, 15 - x]]) p.set(sx, sy, col);
      }
    });
    addTile(c + '_stained_glass', p => { pGlass(p, '#ffffff', 200, { fill: mix(base, [255, 255, 255], 0.15), fa: 130 }); for (let i = 0; i < 16; i++) { p.set(i, 0, shade(base, 0.7), 220); p.set(0, i, shade(base, 0.7), 220); p.set(i, 15, shade(base, 0.5), 220); p.set(15, i, shade(base, 0.5), 220); } });
    // the blanket on top (the sheet, its fold and the pillow are shaped on, so they turn with the bed)
    addTile(c + '_bed_top', p => { const R = ramp(base, 5, 0.35); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, clamp(0.5 + ((x + y) % 4 === 0 ? 0.12 : 0) + ((x - y + 16) % 8 === 0 ? -0.1 : 0) + (p.rand() - 0.5) * 0.08, 0, 0.999))); for (let x = 0; x < 16; x++) { p.set(0, x, pick(R, 0.3)); p.set(15, x, pick(R, 0.3)); } });
    // the side: the blanket hanging over the edge, a darker hem, then the wooden frame
    addTile(c + '_bed_side', p => { const R = ramp(base, 5, 0.35), Wd = ramp('#8a6438', 5, 0.4); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y < 10 ? pick(R, clamp(0.55 + (p.rand() - 0.5) * 0.1, 0, 0.999)) : y === 10 ? pick(R, 0.2) : pick(Wd, clamp(0.5 + (y === 11 ? 0.2 : 0) + (p.rand() - 0.5) * 0.15, 0, 0.999))); for (let y = 11; y < 16; y++) { p.set(0, y, hexRGB('#5e4428')); p.set(15, y, hexRGB('#5e4428')); } });
    addItem(c + '_bed_item', p => { const R = ramp(base, 5, 0.35); for (let y = 6; y < 11; y++) for (let x = 1; x < 15; x++) p.set(x, y, y < 8 ? pick(R, 0.6) : pick(ramp('#8a6438', 5, 0.4), 0.5)); for (let y = 5; y < 8; y++) for (let x = 1; x < 5; x++) p.set(x, y, hexRGB('#f2ece2')); p.set(1, 11, hexRGB('#5e4428')); p.set(14, 11, hexRGB('#5e4428')); });
  }
  addTile('bed_pillow', p => pWool(p, '#f2ece2'));
  for (const [c, hex] of [['tube', '#3a5ad8'], ['brain', '#d85aa0'], ['bubble', '#a03ad0'], ['fire', '#d83a3a'], ['horn', '#e8c83a']]) {
    addTile(c + '_coral_block', p => { pNatural(p, ramp(hex, 6, 0.4), { cracks: 0 }); for (let k = 0; k < 16; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); p.set(x, y, shade(hexRGB(hex), 0.55)); p.set(W16(x + 1), y, shade(hexRGB(hex), 1.3)); } });
    addTile(c + '_coral', p => { const R = ramp(hex, 4, 0.4); for (let k = 0; k < 5; k++) { let x = 4 + Math.floor(p.rand() * 8), y = 15; for (let i = 0; i < 10; i++) { p.set(W16(x), y, R[1 + (i % 3)]); y--; x += p.rand() < 0.3 ? (p.rand() < 0.5 ? -1 : 1) : 0; } } });
  }
  addTile('dead_coral_block', p => pNatural(p, ramp('#8a8680', 6, 0.35), { cracks: 0 }));

  // --- utility blocks ---
  const OAK = ramp('#b08a50', 7, 0.5), OAKD = ramp('#5e4428', 7, 0.5), IRON = ramp('#9a9aa4', 6, 0.5), STONE = ramp('#86868a', 7, 0.5);
  addTile('table_top', p => { pPlanks(p, OAK); for (let i = 0; i < 16; i++) { p.set(i, 0, OAKD[1]); p.set(i, 15, OAKD[0]); p.set(0, i, OAKD[1]); p.set(15, i, OAKD[0]); } for (let i = 2; i < 14; i++) { p.set(i, 5, OAKD[1]); p.set(i, 10, OAKD[1]); p.set(5, i, OAKD[1]); p.set(10, i, OAKD[1]); } });
  addTile('table_side', p => { pPlanks(p, OAK); for (let i = 0; i < 16; i++) { p.set(i, 0, OAKD[1]); p.set(i, 1, OAKD[3]); } for (let y = 4; y < 13; y++) p.set(4, y, OAKD[1]); for (const [x, y] of [[3, 4], [4, 4], [5, 4], [3, 5], [5, 5]]) p.set(x, y, IRON[4]); for (let y = 4; y < 13; y++) p.set(11, y, OAKD[1]); for (let x = 9; x < 14; x++) p.set(x, 4, IRON[3]); p.set(9, 5, IRON[2]); p.set(13, 5, IRON[2]); });
  addTile('bookshelf', p => { pPlanks(p, OAK); for (const r of [1, 9]) { for (let x = 1; x < 15; x++) for (let y = r; y < r + 6; y++) { const book = Math.floor(x / 2); const col = ['#8a2a2a', '#2a4a8a', '#3a6a2a', '#8a6a2a', '#5a2a6a', '#2a6a6a', '#6a3a1a'][(book + r) % 7]; p.set(x, y, shade(hexRGB(col), y === r ? 1.2 : (x % 2 ? 0.9 : 1.05))); } for (let x = 1; x < 15; x += 2) if (p.rand() < 0.25) for (let y = r; y < r + 2; y++) p.set(x, y, OAKD[0]); } });
  const furn = (p) => { pBricks(p, STONE, hexRGB('#2e2c30'), 8, 8, { offset: 4 }); };
  addTile('furnace_top', p => pCobble(p, STONE, hexRGB('#2e2c30'), 8));
  addTile('furnace_side', p => furn(p));
  const mouth = (p, lit, f) => {
    for (let y = 7; y < 14; y++) for (let x = 4; x < 12; x++) { const arch = y === 7 && (x === 4 || x === 11); if (!arch) p.set(x, y, lit ? mix(hexRGB('#ffcf5a'), hexRGB('#d8501c'), clamp((y - 7) / 7 + Math.sin(x * 2 + f * 1.7) * 0.25, 0, 1)) : hexRGB('#16121a')); }
    for (let x = 3; x < 13; x++) { p.set(x, 6, STONE[1]); p.set(x, 14, STONE[1]); }
    if (!lit) for (let x = 5; x < 11; x++) if (p.rand() < 0.5) p.set(x, 13, hexRGB('#5a2a14'));
  };
  addTile('furnace_front', p => { furn(p); mouth(p, false, 0); });
  addAnim('furnace_front_lit', 4, 6, (p, f) => { furn(p); mouth(p, true, f); });
  addTile('smoker_top', p => { pPlanks(p, OAKD); });
  addTile('smoker_side', p => { furn(p); for (let x = 0; x < 16; x++) { p.set(x, 0, OAKD[2]); p.set(x, 1, OAKD[1]); p.set(x, 15, OAKD[1]); } });
  addTile('smoker_front', p => { furn(p); mouth(p, false, 0); for (let x = 0; x < 16; x++) { p.set(x, 0, OAKD[2]); p.set(x, 1, OAKD[1]); } });
  addAnim('smoker_front_lit', 4, 6, (p, f) => { furn(p); mouth(p, true, f); for (let x = 0; x < 16; x++) { p.set(x, 0, OAKD[2]); p.set(x, 1, OAKD[1]); } });
  addTile('blast_furnace_top', p => pMetal(p, IRON));
  addTile('blast_furnace_side', p => { pBricks(p, ramp('#6a6a72', 6, 0.5), hexRGB('#1e1e22'), 8, 4); for (let y = 0; y < 16; y++) { p.set(0, y, IRON[1]); p.set(15, y, IRON[1]); } });
  addTile('blast_furnace_front', p => { pBricks(p, ramp('#6a6a72', 6, 0.5), hexRGB('#1e1e22'), 8, 4); mouth(p, false, 0); });
  addAnim('blast_furnace_front_lit', 4, 8, (p, f) => { pBricks(p, ramp('#6a6a72', 6, 0.5), hexRGB('#1e1e22'), 8, 4); mouth(p, true, f); });
  const chestBase = (p) => { pPlanks(p, ramp('#8a5a2a', 7, 0.5)); for (let i = 0; i < 16; i++) { p.set(i, 0, IRON[1]); p.set(i, 15, IRON[0]); p.set(0, i, IRON[1]); p.set(15, i, IRON[0]); } };
  addTile('chest_top', p => { chestBase(p); for (let i = 1; i < 15; i++) { p.set(i, 4, IRON[2]); p.set(i, 11, IRON[2]); } });
  addTile('chest_side', p => { chestBase(p); for (let i = 1; i < 15; i++) { p.set(i, 5, IRON[1]); p.set(i, 6, IRON[3]); } });
  addTile('chest_front', p => { chestBase(p); for (let i = 1; i < 15; i++) { p.set(i, 5, IRON[1]); p.set(i, 6, IRON[3]); } for (let y = 4; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, y === 4 ? IRON[5] : IRON[3]); p.set(7, 7, hexRGB('#16121a')); p.set(8, 7, hexRGB('#16121a')); p.set(7, 8, hexRGB('#16121a')); });
  addTile('barrel_side', p => { const R = ramp('#7a5430', 7, 0.5); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { let v = 0.5 + (x % 4 === 0 ? -0.35 : x % 4 === 1 ? 0.2 : 0) + (p.rand() - 0.5) * 0.12; p.set(x, y, pick(R, clamp(v, 0, 0.999))); } for (const y of [2, 13]) for (let x = 0; x < 16; x++) { p.set(x, y, IRON[1]); p.set(x, y + 1, IRON[3]); } });
  addTile('barrel_top', p => { pPlanks(p, ramp('#7a5430', 7, 0.5)); for (let i = 0; i < 16; i++) { p.set(i, 0, IRON[1]); p.set(i, 15, IRON[0]); p.set(0, i, IRON[1]); p.set(15, i, IRON[0]); } for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, hexRGB('#2a1e14')); });
  addTile('barrel_bottom', p => { pPlanks(p, ramp('#7a5430', 7, 0.5)); for (let i = 0; i < 16; i++) { p.set(i, 0, IRON[1]); p.set(0, i, IRON[1]); p.set(i, 15, IRON[0]); p.set(15, i, IRON[0]); } });
  addTile('pumpkin_side', p => { const R = ramp('#d8781e', 7, 0.45); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { let v = 0.55 + Math.cos((x + 0.5) / 16 * Math.PI * 8) * 0.18 + (p.rand() - 0.5) * 0.08; if (y === 0) v -= 0.2; if (y === 15) v -= 0.25; p.set(x, y, pick(R, clamp(v, 0, 0.999))); } });
  addTile('pumpkin_top', p => { const R = ramp('#d8781e', 7, 0.45); pRings(p, R); for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, shade(hexRGB('#6a7a2a'), 0.8 + p.rand() * 0.4)); });
  const face = (p, lit) => { const R = ramp('#d8781e', 7, 0.45); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, clamp(0.55 + Math.cos((x + 0.5) / 16 * Math.PI * 8) * 0.18, 0, 0.999))); const F = lit ? hexRGB('#ffd44a') : hexRGB('#2a1408'), F2 = lit ? hexRGB('#ff9a1a') : hexRGB('#3e2010'); for (const [x, y] of [[3, 4], [4, 4], [4, 5], [3, 5], [11, 4], [12, 4], [11, 5], [12, 5], [7, 7], [8, 7]]) p.set(x, y, F); for (let x = 3; x < 13; x++) p.set(x, 10, F2); for (let x = 4; x < 12; x++) p.set(x, 11, F); for (const x of [5, 8, 11]) p.set(x, 10, R[3]); };
  addTile('carved_pumpkin', p => face(p, false));
  addTile('jack_o_lantern', p => face(p, true));
  addTile('melon_side', p => { const R = ramp('#5a8a24', 7, 0.5); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const st = (x + Math.round(Math.sin(y * 0.6) * 1.2)) % 4 < 2; p.set(x, y, pick(R, clamp((st ? 0.65 : 0.3) + (p.rand() - 0.5) * 0.12, 0, 0.999))); } });
  addTile('melon_top', p => { pRings(p, ramp('#5a8a24', 7, 0.5)); p.set(7, 7, hexRGB('#4a3a1a')); p.set(8, 8, hexRGB('#4a3a1a')); });
  addTile('tnt_side', p => { const R = ramp('#c8281e', 6, 0.4); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, 0.5 + (x % 4 === 0 ? -0.3 : 0) + (p.rand() - 0.5) * 0.08)); for (let y = 5; y < 11; y++) for (let x = 0; x < 16; x++) p.set(x, y, hexRGB('#ece6da')); p.art(['................', '................', '................', '................', '................', '................', '.kkk.k..k.kkk...', '..k..kk.k..k....', '..k..k.kk..k....', '..k..k..k..k....'], { k: hexRGB('#1a1414') }); });
  addTile('tnt_top', p => { pRings(p, ramp('#c8281e', 6, 0.4)); for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, hexRGB('#2a2224')); });
  addTile('tnt_bottom', p => pRings(p, ramp('#c8281e', 6, 0.4)));
  addTile('note_block', p => { pPlanks(p, ramp('#7a4a2a', 7, 0.5)); for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) p.set(x, y, (x + y) % 2 ? hexRGB('#2a1a10') : hexRGB('#4a2e1a')); });
  addTile('stonecutter_top', p => { pPolished(p, STONE); for (let x = 2; x < 14; x++) { p.set(x, 7, IRON[4]); p.set(x, 8, IRON[2]); } for (let x = 2; x < 14; x += 2) p.set(x, 6, IRON[5]); });
  addTile('stonecutter_side', p => { pPolished(p, STONE); for (let x = 0; x < 16; x++) { p.set(x, 12, OAKD[2]); p.set(x, 13, OAKD[1]); } });
  // the saw blade: the top of a round blade standing up out of the bench (rows 9-15, like the classic picture)
  addTile('stonecutter_saw', p => {
    for (let y = 8; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x + 0.5 - 8, y + 0.5 - 16);
      if (d > 6.6) continue;
      const ang = Math.atan2(y + 0.5 - 16, x + 0.5 - 8), tooth = Math.floor((ang + Math.PI) / (Math.PI / 7)) % 2;
      if (d > 5.8) { if (tooth) p.set(x, y, IRON[1]); continue; }
      p.set(x, y, d < 1.6 ? IRON[0] : d > 4.9 ? IRON[2] : (x + y) % 5 === 0 ? IRON[5] : IRON[4]);
    }
  });
  addTile('millstone_top', p => { pRings(p, ramp('#9a9a9e', 6, 0.45)); for (let a = 0; a < 8; a++) for (let r = 2; r < 7; r++) p.set(Math.round(7.5 + Math.cos(a * 0.785) * r), Math.round(7.5 + Math.sin(a * 0.785) * r), STONE[1]); p.set(7, 7, OAKD[0]); p.set(8, 8, OAKD[0]); });
  addTile('millstone_side', p => { pNatural(p, ramp('#9a9a9e', 6, 0.4), { cracks: 1 }); for (let x = 0; x < 16; x++) { p.set(x, 7, STONE[1]); p.set(x, 8, STONE[4]); } });
  addTile('sawmill_top', p => { pPlanks(p, OAK); for (let x = 2; x < 14; x++) { p.set(x, 7, hexRGB('#16121a')); p.set(x, 8, hexRGB('#16121a')); } });
  addTile('sawmill_side', p => { pPlanks(p, OAKD); for (let i = 0; i < 16; i++) { p.set(i, 0, OAK[4]); p.set(0, i, OAK[3]); p.set(15, i, OAKD[0]); } });
  addTile('saw_blade', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5), a = Math.atan2(y - 7.5, x - 7.5); const tooth = d < 6.2 + (Math.sin(a * 10) > 0 ? 1.2 : 0); if (tooth) p.set(x, y, d < 1.5 ? hexRGB('#3a3a40') : pick(IRON, 0.45 + Math.sin(a * 3) * 0.2 + 0.2)); } });
  addTile('axle', p => { pBark(p, ramp('#7a5430', 7, 0.45), { knots: 0 }); for (const x of [2, 13]) for (let y = 0; y < 16; y++) { p.set(x, y, IRON[1]); p.set(x + 1, y, IRON[3]); } });
  addTile('axle_end', p => pLogTop(p, ramp('#b08a50', 6, 0.4), ramp('#5e4428', 6, 0.5)));
  addTile('sail', p => { const R = ramp('#ece2cc', 5, 0.25); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { let v = 0.55 + (p.rand() - 0.5) * 0.1; if (y % 8 === 0) v = 0.25; if (x === 0 || x === 15) v = 0.3; p.set(x, y, pick(R, v)); } });
  addTile('flag', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(hexRGB(y < 8 ? '#b8242a' : '#e8c83a'), 0.9 + p.rand() * 0.2)); });
  addTile('iron_bars', p => { for (const x of [1, 5, 9, 13]) for (let y = 0; y < 16; y++) { p.set(x, y, IRON[2]); p.set(x + 1, y, IRON[4]); } for (const y of [1, 14]) for (let x = 0; x < 16; x++) { p.set(x, y, IRON[1]); p.set(x, y + 1 > 15 ? y : y + 1, IRON[3]); } });
  addTile('iron_door_lower', p => { pMetal(p, IRON); for (let i = 2; i < 14; i++) p.set(i, 8, IRON[1]); p.set(12, 6, hexRGB('#2a2a2e')); p.set(12, 7, IRON[5]); });
  addTile('iron_door_upper', p => { pMetal(p, IRON); for (let y = 3; y < 9; y++) for (let x = 4; x < 12; x++) if ((x + y) % 3) p.set(x, y, [0, 0, 0], 0); });
  addItem('iron_door_item', p => { for (let y = 1; y < 15; y++) for (let x = 4; x < 12; x++) p.set(x, y, pick(IRON, 0.5 + (x === 4 ? 0.3 : 0) + (p.rand() - 0.5) * 0.08)); for (let y = 3; y < 6; y++) for (let x = 6; x < 10; x++) p.set(x, y, hexRGB('#2a2a30')); });
  addTile('iron_trapdoor', p => { pMetal(p, IRON); for (const [x, y] of [[5, 5], [10, 5], [5, 10], [10, 10]]) p.set(x, y, [0, 0, 0], 0); });
  addTile('ladder', p => { for (const x of [2, 13]) for (let y = 0; y < 16; y++) { p.set(x, y, OAK[2]); p.set(x + 1 - (x === 13 ? 2 : 0), y, OAK[4]); } for (const y of [2, 6, 10, 14]) for (let x = 2; x < 15; x++) { p.set(x, y, OAK[3]); p.set(x, y + 1, OAKD[2]); } });
  addTile('vine', p => { for (let k = 0; k < 7; k++) { let x = Math.floor(p.rand() * 16), y = 0; for (let i = 0; i < 16; i++) { p.set(W16(x), y, grey(0.45 + p.rand() * 0.35), TINTA); if (p.rand() < 0.4) p.set(W16(x + 1), y, grey(0.6), TINTA); y++; if (p.rand() < 0.3) x += p.rand() < 0.5 ? 1 : -1; } } }, 0, 'foliage');
  addTile('chain', p => { for (let y = 0; y < 16; y++) { const link = Math.floor(y / 4) % 2; if (link) { p.set(7, y, IRON[1]); p.set(8, y, IRON[1]); } else { if (y % 4 === 0 || y % 4 === 3) { p.set(7, y, IRON[4]); p.set(8, y, IRON[3]); } else { p.set(6, y, IRON[3]); p.set(9, y, IRON[1]); } } } });
  addTile('paper_wall', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(hexRGB('#f2e8d0'), 0.95 + p.rand() * 0.06), 235); for (let i = 0; i < 16; i++) { p.set(i, 0, OAKD[2]); p.set(i, 15, OAKD[1]); p.set(0, i, OAKD[2]); p.set(15, i, OAKD[1]); p.set(7, i, OAKD[2]); p.set(i, 7, OAKD[2]); } });
  addTile('flower_pot', p => { const R = ramp('#a85a3c', 6, 0.4); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, clamp(0.5 + (y === 10 ? 0.3 : 0) + (p.rand() - 0.5) * 0.1, 0, 0.999))); });
  addTile('flower_pot_top', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, x < 2 || x > 13 || y < 2 || y > 13 ? hexRGB('#a85a3c') : pick(DIRT, 0.3 + p.rand() * 0.3)); });
  addTile('cauldron_side', p => { pMetal(p, ramp('#3a3a42', 6, 0.5)); for (let x = 0; x < 16; x++) p.set(x, 3, hexRGB('#5a5a64')); });
  addTile('cauldron_top', p => pMetal(p, ramp('#3a3a42', 6, 0.5)));
  addTile('cauldron_inner', p => pNatural(p, ramp('#2a2a30', 5, 0.4), { cracks: 0 }));
  addTile('bell', p => pMetal(p, ramp('#e8c040', 7, 0.5)));
  addTile('bell_frame', p => pPlanks(p, OAKD, { nails: false }));
  addTile('campfire_log', p => pBark(p, ramp('#4a3420', 7, 0.5), { knots: 1 }));
  addTile('campfire_log_end', p => pLogTop(p, ramp('#9a7a50', 6, 0.4), ramp('#4a3420', 6, 0.5)));
  addTile('campfire_embers', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, p.rand() < 0.25 ? hexRGB(p.rand() < 0.5 ? '#ff8a2a' : '#ffcf5a') : shade(hexRGB('#2a2020'), 0.8 + p.rand() * 0.4)); });
  addTile('lantern_cap', p => { const R = ramp('#4a4f5a', 6, 0.5); pMetal(p, R); });
  addTile('lantern', p => { pNatural(p, ramp('#4a4f5a', 5, 0.4), { cracks: 0 }); for (let y = 9; y < 16; y++) for (let x = 5; x < 11; x++) { const fr = x === 5 || x === 10 || y === 9 || y === 15; if (fr) { p.set(x, y, y === 9 ? hexRGB('#6e7482') : hexRGB('#2c2f36')); continue; } p.set(x, y, mix(hexRGB('#fff2b0'), hexRGB('#f08a1c'), clamp(Math.hypot(x - 7.5, y - 12.2) / 3, 0, 1))); } });
  addTile('soul_lantern', p => { pNatural(p, ramp('#4a4f5a', 5, 0.4), { cracks: 0 }); for (let y = 9; y < 16; y++) for (let x = 5; x < 11; x++) { const fr = x === 5 || x === 10 || y === 9 || y === 15; if (fr) { p.set(x, y, y === 9 ? hexRGB('#6e7482') : hexRGB('#2c2f36')); continue; } p.set(x, y, mix(hexRGB('#d8fbff'), hexRGB('#2ab8d8'), clamp(Math.hypot(x - 7.5, y - 12.2) / 3, 0, 1))); } });

  // --- liquids, fire, portals (animated) ---
  addAnim('water', 8, 7, (p, f, n) => {
    const t = f / n * Math.PI * 2;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const w = Math.sin((x + y * 0.5) * 0.785 + t) * 0.07 + Math.sin(y * 0.785 * 2 - x * 0.39 + t * 2) * 0.05 + Math.sin((x - y) * 0.39 + t) * 0.04;
      p.set(x, y, grey(clamp(0.76 + w, 0, 1)), 175);
    }
  });
  // running water and lava: streaks that slide downstream (+v), seamless top to bottom
  addAnim('water_flow', 16, 14, (p, f, n) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const yy = (y - f + 16) % 16;
      const w = Math.sin(x * 1.57 + Math.sin(yy * 0.785) * 0.9) * 0.06 + Math.sin(yy * 0.785 + x * 0.6) * 0.05 + ((x * 7 + Math.floor(yy / 2) * 3) % 11 === 0 ? 0.08 : 0);
      p.set(x, y, grey(clamp(0.74 + w, 0, 1)), 180);
    }
  });
  addAnim('lava_flow', 16, 6, (p, f, n) => {
    const R = ramp('#e8641c', 6, 0.6);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const yy = (y - f + 16) % 16;
      const v = 0.5 + Math.sin(x * 0.785 + Math.sin(yy * 0.39) * 1.5) * 0.22 + Math.sin(yy * 0.785 * 2 + x * 0.3) * 0.12;
      p.set(x, y, v > 0.86 ? hexRGB('#ffe88a') : pick(R, clamp(v, 0, 0.999)));
    }
  });
  addAnim('lava', 8, 4, (p, f, n) => {
    const t = f / n * Math.PI * 2, R = ramp('#e8641c', 6, 0.6);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = 0.5 + Math.sin(x * 0.785 + Math.sin(y * 0.39 + t) * 1.5) * 0.2 + Math.sin(y * 0.785 * 1.5 + t) * 0.15 + Math.sin((x + y) * 0.39 - t) * 0.12;
      p.set(x, y, v > 0.85 ? hexRGB('#ffe88a') : pick(R, clamp(v, 0, 0.999)));
    }
  });
  const flames = (p, f, n, hot, mid, cool, base) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const s = Math.sin(x * 1.3 + f * 1.9) * 0.5 + Math.sin(x * 0.7 - f * 1.3 + y * 0.4) * 0.5;
      const h = (16 - y) / 16, edge = 0.25 + s * 0.12 + Math.abs(x - 7.5) / 12;
      if (h > 1 - edge + 0.25) continue;
      const v = clamp(h + edge * 0.6, 0, 1);
      p.set(x, y, v > 0.85 ? hexRGB(cool) : v > 0.55 ? hexRGB(mid) : hexRGB(hot), y > 13 && base ? 255 : 235);
    }
  };
  addAnim('fire', 8, 10, (p, f, n) => flames(p, f, n, '#ffe48a', '#ff9a1c', '#d8401c'));
  addAnim('soul_fire', 8, 10, (p, f, n) => flames(p, f, n, '#d8fbff', '#3ad8e8', '#1a6a8a'));
  addAnim('campfire_fire', 8, 10, (p, f, n) => flames(p, f, n, '#ffe48a', '#ff9a1c', '#d8401c', true));
  addAnim('soul_campfire_fire', 8, 10, (p, f, n) => flames(p, f, n, '#d8fbff', '#3ad8e8', '#1a6a8a', true));
  const portal = (p, f, n, a, b, c) => {
    const t = f / n * Math.PI * 2;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = Math.sin(x * 0.7 + y * 0.35 + t) + Math.sin(y * 0.9 - x * 0.2 - t * 2) + Math.sin(Math.hypot(x - 7.5, y - 7.5) * 0.8 - t) * 0.6;
      p.set(x, y, v > 1.1 ? hexRGB(c) : v > 0 ? hexRGB(b) : hexRGB(a), 200);
    }
  };
  addAnim('ember_portal', 8, 8, (p, f, n) => portal(p, f, n, '#6a1430', '#e8641c', '#ffd34a'));
  addAnim('sky_portal', 8, 8, (p, f, n) => portal(p, f, n, '#2a5ac8', '#5ac8f0', '#e6f7ff'));
  addAnim('magma_block', 4, 3, (p, f) => { pCobble(p, ramp('#4a1e14', 6, 0.5), hexRGB(['#ff7a1c', '#ff9a2a', '#ffb84a', '#ff9a2a'][f]), 7, { mortar: 1.3 }); });
  addAnim('sea_lantern', 5, 4, (p, f) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); const v = 0.6 + Math.sin(d * 1.3 - f * 1.25) * 0.2; p.set(x, y, mix(hexRGB('#f0fffa'), hexRGB('#7ac8b8'), clamp(1 - v, 0, 1))); } for (let i = 0; i < 16; i++) { p.set(i, 0, hexRGB('#5a9a8a')); p.set(0, i, hexRGB('#5a9a8a')); p.set(i, 15, hexRGB('#3a7a6a')); p.set(15, i, hexRGB('#3a7a6a')); } });
  const torch = (p, f, cols, stick) => {
    for (let y = 6; y < 16; y++) { p.set(7, y, hexRGB(stick[0])); p.set(8, y, hexRGB(stick[1])); }
    const fl = [[cols[0], cols[1]], [cols[1], cols[0]], [cols[0], cols[0]], [cols[1], cols[1]]][f % 4];
    p.set(7, 6, hexRGB(fl[0])); p.set(8, 6, hexRGB(fl[1])); p.set(7, 5, hexRGB(cols[2])); p.set(8, 5, hexRGB(fl[0])); p.set(7 + (f % 2), 4, hexRGB(cols[1]));
  };
  addAnim('torch', 4, 7, (p, f) => torch(p, f, ['#ffd34a', '#ff9a1c', '#fff6c8'], ['#7a552c', '#5d3f1f']));
  addAnim('soul_torch', 4, 7, (p, f) => torch(p, f, ['#7af0ff', '#2ab8d8', '#e8ffff'], ['#5a4a3a', '#3e3228']));
  addTile('old_torch', p => torch(p, 0, ['#b0502a', '#7a2a14', '#d8743a'], ['#4a3420', '#36261a']));

  // --- plants ---
  const G = hexRGB('#3d7a2a'), GL2 = hexRGB('#5aa03a');
  addTile('tall_grass', p => { for (let b = 0; b < 10; b++) { let x = 1 + Math.floor(p.rand() * 14); const h = 5 + Math.floor(p.rand() * 9); for (let y = 15; y > 15 - h; y--) { p.set(x, y, grey(0.5 + (15 - y) / h * 0.35 + p.rand() * 0.1), TINTA); if (p.rand() < 0.2) x = clamp(x + (p.rand() < 0.5 ? -1 : 1), 0, 15); } } }, 0, 'grass');
  addTile('fern', p => { for (const sd of [-1, 1]) for (let y = 2; y < 16; y++) { const x = 7 + sd * Math.floor((16 - y) / 3); p.set(clamp(x, 0, 15), y, grey(0.5 + p.rand() * 0.3), TINTA); if (y % 2) p.set(clamp(x + sd, 0, 15), y, grey(0.65), TINTA); } for (let y = 3; y < 16; y++) p.set(7, y, grey(0.45), TINTA); }, 0, 'grass');
  addTile('flower_red', p => flower(p, '#d8262c', '#2a1a0c'));
  addTile('flower_yellow', p => flower(p, '#f7d32c', '#e48a12', { shape: [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, 1]] }));
  for (const [k, petal, centre] of [['blue_orchid', '#3aa8e8', '#1a5a8a'], ['allium', '#b85ae8', '#7a2aa8'], ['azure_bluet', '#e8eef2', '#e8c83a'], ['red_tulip', '#d8262c', '#5a1a0c'], ['orange_tulip', '#f0841c', '#7a3a0c'],
    ['white_tulip', '#f2f2ee', '#a8a8a0'], ['pink_tulip', '#f2a0c0', '#a85a7a'], ['oxeye_daisy', '#f2f2ee', '#e8c83a'], ['cornflower', '#4a6ae8', '#2a3a8a'], ['lily_of_the_valley', '#ffffff', '#c8e0a0'], ['lavender', '#a07ae0', '#6a4aa8'], ['heather', '#d070b0', '#8a3a6a']])
    addTile(k, p => flower(p, petal, centre, { top: k.includes('tulip') ? 9 : 8, shape: k.includes('tulip') ? [[-1, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [0, -2]] : k === 'lavender' || k === 'heather' ? [[0, -3], [0, -2], [0, -1], [0, 0], [-1, -1], [1, 0], [0, 1]] : undefined }));
  addTile('dead_bush', p => { const B = ramp('#7a5a34', 4, 0.5); let x = 7; for (let y = 15; y > 6; y--) { p.set(x, y, B[1]); if (y < 12 && p.rand() < 0.4) { let bx = x, by = y; const d = p.rand() < 0.5 ? -1 : 1; for (let i = 0; i < 4; i++) { bx += d; by--; p.set(clamp(bx, 0, 15), by, B[2]); } } } });
  addTile('brown_mushroom', p => { stem(p, 7, 10, 15, hexRGB('#e2d8c4')); stem(p, 8, 10, 15, hexRGB('#c8bca8')); const C = ramp('#9a6e4a', 4, 0.4); for (let x = 4; x < 12; x++) { p.set(x, 9, C[1]); if (x > 4 && x < 11) p.set(x, 8, C[2]); if (x > 5 && x < 10) p.set(x, 7, C[3]); } });
  addTile('red_mushroom', p => { stem(p, 7, 10, 15, hexRGB('#e2d8c4')); stem(p, 8, 10, 15, hexRGB('#c8bca8')); const C = ramp('#c8282a', 4, 0.4); for (let x = 4; x < 12; x++) { p.set(x, 9, C[1]); if (x > 4 && x < 11) p.set(x, 8, C[2]); if (x > 5 && x < 10) p.set(x, 7, C[3]); } p.set(6, 8, hexRGB('#f2ece2')); p.set(9, 7, hexRGB('#f2ece2')); });
  addTile('sugar_cane', p => { for (const x of [3, 8, 12]) for (let y = 0; y < 16; y++) { p.set(x, y, grey(y % 5 === 0 ? 0.5 : 0.78), TINTA); p.set(x + 1, y, grey(y % 5 === 0 ? 0.4 : 0.62), TINTA); if (y % 5 === 2 && p.rand() < 0.6) p.set(x + 2, y, grey(0.7), TINTA); } }, 0, 'grass');
  addTile('cobweb', p => { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 4; for (let r = 0; r < 8; r++) { p.set(W16(Math.round(7.5 + Math.cos(a) * r)), W16(Math.round(7.5 + Math.sin(a) * r)), [240, 240, 240], 200); p.set(W16(Math.round(7.5 - Math.cos(a) * r)), W16(Math.round(7.5 - Math.sin(a) * r)), [240, 240, 240], 200); } } for (const r of [3, 6]) for (let a = 0; a < 24; a++) p.set(W16(Math.round(7.5 + Math.cos(a / 24 * TAU) * r)), W16(Math.round(7.5 + Math.sin(a / 24 * TAU) * r)), [220, 220, 220], 170); });
  addTile('seagrass', p => { for (let b = 0; b < 6; b++) { let x = 2 + Math.floor(p.rand() * 12); for (let y = 15; y > 2 + Math.floor(p.rand() * 5); y--) { p.set(x, y, shade(hexRGB('#2a8a3a'), 0.8 + p.rand() * 0.4)); if (p.rand() < 0.25) x = clamp(x + (p.rand() < 0.5 ? -1 : 1), 0, 15); } } });
  addTile('kelp', p => { let x = 7; for (let y = 15; y >= 0; y--) { p.set(x, y, hexRGB('#4a7a2a')); p.set(x + 1, y, hexRGB('#3a6a22')); if (y % 3 === 0) { p.set(x + 2, y, hexRGB('#5a8a34')); p.set(x - 1, y - 1, hexRGB('#5a8a34')); } x += Math.round(Math.sin(y * 0.6)); x = clamp(x, 3, 12); } });
  addTile('lily_pad', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 7 && !(x > 7 && Math.abs(y - 7.5) < 1.2)) p.set(x, y, grey(0.5 + (d < 6 ? 0.2 : 0) + p.rand() * 0.1), TINTA); } }, 0, 'foliage');
  const sapling = (p, leaf, trunk) => { stem(p, 7, 9, 15, hexRGB(trunk)); const L = ramp(leaf, 4, 0.5); p.blob(7, 6, 3, L[2], 0.4); p.blob(5, 8, 2, L[1], 0.3); p.blob(9, 8, 2, L[3], 0.3); };
  addTile('sapling', p => sapling(p, '#4b8f2b', '#6b4a26'));
  for (const [k, leaf, trunk] of [['birch_sapling', '#6a9e45', '#d8d2c4'], ['spruce_sapling', '#30603a', '#3e2c1c'], ['jungle_sapling', '#3a8a2a', '#56441e'], ['acacia_sapling', '#6a9a2a', '#6a625a'],
    ['dark_oak_sapling', '#2e6a22', '#3a2a18'], ['cherry_sapling', '#e89ab4', '#3a2228'], ['mangrove_propagule', '#4a8a2a', '#5a4a34'],
    ['pine_sapling', '#2a5a36', '#5a4230'], ['aspen_sapling', '#7ab04a', '#c4c0b0']]) addTile(k, p => sapling(p, leaf, trunk));
  addTile('crimson_fungus', p => { stem(p, 7, 9, 15, hexRGB('#d8a868')); const C = ramp('#b8202a', 4, 0.4); for (let x = 4; x < 12; x++) { p.set(x, 8, C[1]); if (x > 4 && x < 11) p.set(x, 7, C[2]); if (x > 5 && x < 10) p.set(x, 6, C[3]); } p.set(5, 9, hexRGB('#f2c84a')); });
  addTile('warped_fungus', p => { stem(p, 7, 9, 15, hexRGB('#d8a868')); const C = ramp('#16a094', 4, 0.4); for (let x = 4; x < 12; x++) { p.set(x, 8, C[1]); if (x > 4 && x < 11) p.set(x, 7, C[2]); if (x > 5 && x < 10) p.set(x, 6, C[3]); } p.set(9, 9, hexRGB('#f2a04a')); });
  const bush = (p, berries) => { p.blob(7, 10, 5, hexRGB('#3f7a2a'), 0.5); p.blob(4, 11, 3, hexRGB('#386d25'), 0.4); p.blob(11, 11, 3, hexRGB('#4a8a30'), 0.4); for (let x = 2; x < 14; x++) if (p.rand() < 0.4) p.set(x, 15, hexRGB('#5a3d1f')); if (berries) for (let i = 0; i < 8; i++) { const x = 3 + Math.floor(p.rand() * 10), y = 6 + Math.floor(p.rand() * 8); p.set(x, y, hexRGB('#c8203a')); p.set(x + 1, y, hexRGB('#ff5a6a')); } };
  addTile('berry_bush', p => bush(p, true));
  addTile('berry_bush_empty', p => bush(p, false));
  addTile('cactus_side', p => { const R = ramp('#3e8a3a', 6, 0.5); for (let y = 0; y < 16; y++) for (let x = 1; x < 15; x++) p.set(x, y, pick(R, clamp(0.55 + (x % 4 === 1 ? -0.3 : x % 4 === 2 ? 0.2 : 0) + (p.rand() - 0.5) * 0.1, 0, 0.999))); for (let i = 0; i < 10; i++) { const y = Math.floor(p.rand() * 16); p.set(p.rand() < 0.5 ? 0 : 15, y, hexRGB('#e8e2b0')); } });
  addTile('cactus_top', p => { pRings(p, ramp('#4a9a42', 6, 0.45)); const W = p.w, k = W / 16; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (x < k || y < k || x >= W - k || y >= W - k) p.set(x, y, [0, 0, 0], 0); });
  // two-tall plants
  const tallStem = (p, upper, col) => { for (let y = upper ? 6 : 0; y < 16; y++) { p.set(7, y, shade(G, 0.9 + p.rand() * 0.2)); if (y % 4 === 1) { p.set(6, y, GL2); p.set(5, y - 1, GL2); } if (y % 4 === 3) { p.set(8, y, GL2); p.set(9, y - 1, GL2); } } };
  for (const [k, col, c2] of [['sunflower', '#f2c82a', '#6a3a14'], ['lilac', '#c890e0', '#9a5ab8'], ['rose_bush', '#c8202a', '#7a1414'], ['peony', '#f0b0d0', '#c86a9a']]) {
    addTile(k + '_lower', p => { tallStem(p, false); for (let k2 = 0; k2 < 6; k2++) p.blob(4 + Math.floor(p.rand() * 8), 6 + Math.floor(p.rand() * 8), 1, shade(G, 0.9 + p.rand() * 0.3), 0.2); });
    addTile(k + '_upper', p => { tallStem(p, true); const C = ramp(col, 4, 0.45); if (k === 'sunflower') { for (let y = 0; y < 8; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot(x - 7.5, y - 3.5); if (d < 4.5) p.set(x, y, d < 2.2 ? hexRGB(c2) : C[2 + (d > 3.5 ? 1 : 0)]); } } else for (let i = 0; i < 12; i++) p.blob(4 + Math.floor(p.rand() * 8), 1 + Math.floor(p.rand() * 7), 1, C[1 + Math.floor(p.rand() * 3)], 0.2); });
  }
  for (const k of ['large_fern', 'tall_grass_double']) {
    addTile(k + '_lower', p => { for (let b = 0; b < 10; b++) { let x = 1 + Math.floor(p.rand() * 14); for (let y = 15; y >= 0; y--) { p.set(x, y, grey(0.45 + p.rand() * 0.3), TINTA); if (p.rand() < 0.15) x = clamp(x + (p.rand() < 0.5 ? -1 : 1), 0, 15); } } }, 0, 'grass');
    addTile(k + '_upper', p => { for (let b = 0; b < 8; b++) { let x = 2 + Math.floor(p.rand() * 12); const h = 6 + Math.floor(p.rand() * 9); for (let y = 15; y > 15 - h; y--) { p.set(x, y, grey(0.55 + (15 - y) / h * 0.3), TINTA); if (p.rand() < 0.2) x = clamp(x + (p.rand() < 0.5 ? -1 : 1), 0, 15); } } }, 0, 'grass');
  }
  // crops
  const crop = (p, stage, n, kind) => {
    const t = (stage + 1) / n;
    for (let b = 0; b < 6; b++) {
      const x = 1 + b * 2 + Math.floor(p.rand() * 2), h = Math.max(2, Math.round(t * (kind === 'wheat' ? 14 : 8)) - Math.floor(p.rand() * 2));
      for (let y = 15; y > 15 - h; y--) p.set(x, y, shade(stage === n - 1 && kind === 'wheat' ? hexRGB('#c8a63a') : G, 0.85 + p.rand() * 0.3));
      if (kind === 'wheat' && stage >= n - 3) for (let y = 16 - h; y < 16 - h + 3; y++) { p.set(x, y, hexRGB(stage === n - 1 ? '#e2c04a' : '#9ab040')); p.set(clamp(x + 1, 0, 15), y + 1, hexRGB(stage === n - 1 ? '#c8a63a' : '#7a9a30')); }
      if (stage === n - 1 && kind !== 'wheat') { const col = kind === 'carrot' ? '#f0841c' : kind === 'potato' ? '#c8a060' : '#9a1a3a'; p.set(x, 15, hexRGB(col)); p.set(clamp(x + 1, 0, 15), 15, hexRGB(col)); p.set(x, 14, hexRGB(col)); }
    }
  };
  for (let s = 0; s < 8; s++) addTile('wheat_crop_stage' + s, p => crop(p, s, 8, 'wheat'));
  for (const [k, kind] of [['carrot_crop', 'carrot'], ['potato_crop', 'potato'], ['beetroot_crop', 'beet']]) for (let s = 0; s < 4; s++) addTile(k + '_stage' + s, p => crop(p, s, 4, kind));
}

// ---- items in the Doku style (added to the existing sprite set) ----------------------------------------
const HOE_ART = ['................', '...hHHHHh.......', '..hHHHHHHh......', '.......sSh......', '......sSs.......', '.....sSs........', '....sSs.........', '...sSs..........', '..sSs...........', '.sSs............', '.Ss.............', '................', '................', '................', '................', '................'];
function paintDokuItems() {
  const I = (name, rows, pal) => addItem(name, p => p.art(rows, pal));
  const dyeArt = ['................', '................', '.......aa.......', '......aAAa......', '.....aALAAa.....', '....aALLAAAa....', '....aAAAAAAa....', '....aAAAAAAa....', '.....aAAAAa.....', '......aaaa......', '................', '................', '................', '................', '................', '................'];
  for (const [c, L, hex] of COLORS) { const b = hexRGB(hex); I(c + '_dye', dyeArt, { A: b, a: shade(b, 0.55), L: mix(b, [255, 255, 255], 0.5) }); }
  const lump = (c, d, l) => ({ A: hexRGB(c), a: hexRGB(d), L: hexRGB(l) });
  I('copper_ingot', ART.ingot, lump('#d87850', '#8a3a20', '#ffb890'));
  I('tin_ingot', ART.ingot, lump('#cdd2d8', '#7a8088', '#ffffff'));
  I('bronze_ingot', ART.ingot, lump('#c8904a', '#7a4a1a', '#f0c880'));
  I('emerald', ART.gem, lump('#30d070', '#12703a', '#c8ffd8'));
  I('lapis_lazuli', ART.lump, lump('#2a50c8', '#122a7a', '#8aa8ff'));
  I('quartz', ART.shard, lump('#f2ece2', '#a8a090', '#ffffff'));
  I('amethyst_shard', ART.shard, lump('#a070e0', '#5a3a8a', '#e8d0ff'));
  I('mese_crystal', ART.gem, lump('#f0e020', '#9a8a10', '#ffffc0'));
  I('flint', ART.lump, lump('#3a3a3e', '#141416', '#7a7a80'));
  for (const m of [['iron', '#d8a888'], ['gold', '#f6d541'], ['copper', '#e07a48'], ['tin', '#d4d8dc']]) I('crushed_' + m[0], ART.berries.map(r => r.replace(/G/g, '.').replace(/s/g, '.')), lump(m[1], '#5a5450', '#ffffff'));
  I('flour', ART.clay, lump('#f2ece2', '#b8b0a0', '#ffffff'));
  I('sugar', ART.clay, lump('#f8f8f8', '#c8c8c8', '#ffffff'));
  I('snowball', ART.clay, lump('#f4f8fc', '#a8b8c8', '#ffffff'));
  I('string', ['................', '................', '...........aa...', '..........a..a..', '.........a......', '........a.......', '.......a........', '......a.........', '.....a..........', '....a...........', '...a............', '..aa............', '................', '................', '................', '................'], { a: hexRGB('#ece8e0') });
  I('paper', ['................', '................', '...LLLLLLLLL....', '...LAAAAAAAAa...', '...LAaaaaaAAa...', '...LAAAAAAAAa...', '...LAaaaaAAAa...', '...LAAAAAAAAa...', '...LAaaaaaaAa...', '...LAAAAAAAAa...', '...aaaaaaaaaa...', '................', '................', '................', '................', '................'], lump('#f2ead4', '#b8ac8c', '#ffffff'));
  I('book', ['................', '................', '...aaaaaaaaaa...', '..aAAAAAAAAAWa..', '..aALLAAAAAAWa..', '..aAAAAAAAAAWa..', '..aAAAGGGGAAWa..', '..aAAAAAAAAAWa..', '..aAAAAAAAAAWa..', '..aAAAAAAAAAWa..', '...aaaaaaaaaa...', '................', '................', '................', '................', '................'], { A: hexRGB('#8a2a2a'), a: hexRGB('#4a1414'), L: hexRGB('#c84a4a'), W: hexRGB('#f2ead4'), G: hexRGB('#e8c040') });
  I('straw', ['................', '................', '..........aA....', '.........aA.aA..', '........aA.aA...', '.......aA.aA....', '......aA.aA.....', '.....aA.aA......', '....aA.aA.......', '...aA.aA........', '...a.aA.........', '....a...........', '................', '................', '................', '................'], lump('#e2c04a', '#9a7a20', '#fff0a0'));
  I('wheat', ['................', '..........LA....', '.........LAa.L..', '........LAa.LA..', '.......LAa.LAa..', '......sAa.LAa...', '.....sSs.LAa....', '....sSs.sAa.....', '...sSs.sSs......', '..sSs.sSs.......', '.sSs.sSs........', '.Ss.sSs.........', '...sSs..........', '................', '................', '................'], { A: hexRGB('#d8b040'), a: hexRGB('#8a6a1a'), L: hexRGB('#f2d870'), s: hexRGB('#8a7a2a'), S: hexRGB('#b8a040') });
  I('wheat_seeds', ['................', '................', '................', '................', '.....A....A.....', '......A.A.......', '...A.....A..A...', '.....A.A........', '....A.....A.....', '.......A....A...', '...A..A.........', '.....A....A.....', '................', '................', '................', '................'], { A: hexRGB('#6a9a2a') });
  I('beetroot_seeds', ['................', '................', '................', '................', '.....A....A.....', '......A.A.......', '...A.....A..A...', '.....A.A........', '....A.....A.....', '.......A....A...', '...A..A.........', '.....A....A.....', '................', '................', '................', '................'], { A: hexRGB('#a8904a') });
  I('pumpkin_seeds', ['................', '................', '................', '................', '.....A....A.....', '......A.A.......', '...A.....A..A...', '.....A.A........', '....A.....A.....', '.......A....A...', '...A..A.........', '.....A....A.....', '................', '................', '................', '................'], { A: hexRGB('#e8d8a0') });
  I('carrot', ['................', '..........GG.G..', '.........GGGG...', '.........aAG....', '........aALA....', '.......aALAa....', '......aAAAa.....', '.....aALAa......', '....aAAAa.......', '...aALAa........', '..aAAa..........', '..aAa...........', '..a.............', '................', '................', '................'], { A: hexRGB('#f0841c'), a: hexRGB('#9a4a0a'), L: hexRGB('#ffb860'), G: hexRGB('#4f9a34') });
  I('potato', ART.lump, lump('#c8a060', '#7a5a2a', '#e8c890'));
  I('baked_potato', ART.lump, lump('#d8a040', '#8a5a1a', '#f8e0a0'));
  I('beetroot', ART.apple, { A: hexRGB('#9a1a3a'), a: hexRGB('#4a0a1a'), L: hexRGB('#d84a6a'), s: hexRGB('#4f9a34'), G: hexRGB('#4f9a34') });
  const bowlArt = ['................', '................', '................', '................', '................', '................', '..aWWWWWWWWWWa..', '..aLAAAAAAAALa..', '...aAAAAAAAAa...', '....aAAAAAAa....', '.....aaaaaa.....', '................', '................', '................', '................', '................'];
  I('bowl', bowlArt, { A: hexRGB('#8a6438'), a: hexRGB('#4a3420'), L: hexRGB('#b08a50'), W: hexRGB('#4a3420') });
  I('mushroom_stew', bowlArt, { A: hexRGB('#8a6438'), a: hexRGB('#4a3420'), L: hexRGB('#b08a50'), W: hexRGB('#b8906a') });
  I('beetroot_soup', bowlArt, { A: hexRGB('#8a6438'), a: hexRGB('#4a3420'), L: hexRGB('#b08a50'), W: hexRGB('#b8203a') });
  I('melon_slice', ['................', '................', '................', '................', '..g...........g.', '..gRRRRRRRRRRg..', '...gRkRRRRkRg...', '....gRRRkRRg....', '.....gRRRRg.....', '......gRRg......', '.......gg.......', '................', '................', '................', '................', '................'], { g: hexRGB('#4a8a24'), R: hexRGB('#e84a4a'), k: hexRGB('#1a1a1a') });
  I('pumpkin_pie', ART.bread, lump('#d8781e', '#7a3a0a', '#f8c070'));
  I('dried_kelp', ART.leather, lump('#3e4a2a', '#1e2a14', '#5e6a3a'));
  // tools: hoes of every tier, new tiers' tools and armour
  const tierCols = { wood: ['#b08a56', '#7a5a33'], stone: ['#9a9a9a', '#5e5e5e'], copper: ['#e08050', '#9a4422'], bronze: ['#d4a050', '#8a5a1e'], iron: ['#e6e6e6', '#9a9a9a'], gold: ['#fbe25b', '#c19a1c'], diamond: ['#7af3ec', '#2aa59f'], cinderite: ['#ff8a3d', '#a8300e'] };
  for (const [tk, cols] of Object.entries(tierCols)) {
    const pal = Object.assign({ H: hexRGB(cols[0]), h: hexRGB(cols[1]), g: hexRGB('#5a3d1f') }, STICK_PAL);
    I(tk + '_hoe', HOE_ART, pal);
    if (tk === 'copper' || tk === 'bronze') for (const kind of ['pickaxe', 'axe', 'shovel', 'sword']) I(tk + '_' + kind, ART[kind], pal);
  }
  for (const [mk, cols] of [['copper', ['#d87850', '#8a3a20', '#ffb890']], ['bronze', ['#c8904a', '#7a4a1a', '#f0c880']]]) for (const piece of ['helmet', 'chestplate', 'leggings', 'boots']) I(mk + '_' + piece, ART[piece], { A: hexRGB(cols[0]), a: hexRGB(cols[1]), L: hexRGB(cols[2]) });
  I('shears', ['................', '................', '..aA............', '..aLA...........', '...aLA..........', '....aLA..aA.....', '.....aLAaLA.....', '......aLLA......', '......aLAA......', '.....RRa.aRR....', '....R..R.R..R...', '....R..R.R..R...', '.....RR...RR....', '................', '................', '................'], { a: hexRGB('#6a6a72'), A: hexRGB('#c8c8d0'), L: hexRGB('#f0f0f8'), R: hexRGB('#3a3a42') });
  I('flint_and_steel', ['................', '................', '...aaaa.........', '..aAAAAa........', '..aALLAa........', '..aAAAAa........', '...aaaa.........', '................', '.......sss......', '......s...s.....', '.....s.....s....', '.....s.....s....', '......s...s.....', '.......sss......', '................', '................'], { a: hexRGB('#141416'), A: hexRGB('#3a3a3e'), L: hexRGB('#7a7a80'), s: hexRGB('#b8b8c0') });
  I('rowboat', ['................', '................', '................', '................', '................', '................', '.a............a.', '.aAAAAAAAAAAAAa.', '..aAAAAAAAAAAa..', '...aLLLLLLLLa...', '....aaaaaaaa....', '................', '................', '................', '................', '................'], lump('#8a6438', '#4a3420', '#b08a50'));
  I('sailboat', ['................', '.......S........', '.......SWW......', '.......SWWW.....', '.......SWWWW....', '.......SWWWWW...', '.a.....SWWWWWW..', '.aAAAAAAAAAAAAa.', '..aAAAAAAAAAAa..', '...aLLLLLLLLa...', '....aaaaaaaa....', '................', '................', '................', '................', '................'], { A: hexRGB('#8a6438'), a: hexRGB('#4a3420'), L: hexRGB('#b08a50'), S: hexRGB('#5e4428'), W: hexRGB('#ece2cc') });
  I('soul_lantern_item', ['................', '................', '......kkkk......', '.....k....k.....', '......kkkk......', '.....LLLLLL.....', '.....MMMMMM.....', '....LDDDDDDL....', '....DyyYYyyD....', '....DyYWWYyD....', '....DyYWWYyD....', '....DyyYYyyD....', '....DooyyooD....', '....LDDDDDDL....', '.....MMMMMM.....', '................'],
    { k: hexRGB('#2c2f36'), L: hexRGB('#6e7482'), M: hexRGB('#4a4f5a'), D: hexRGB('#2c2f36'), y: hexRGB('#3ab8d8'), Y: hexRGB('#8ae8f8'), W: hexRGB('#e8ffff'), o: hexRGB('#1a8aa8') });
  addItem('lantern_item', p => p.art(['................', '................', '......kkkk......', '.....k....k.....', '......kkkk......', '.....LLLLLL.....', '.....MMMMMM.....', '....LDDDDDDL....', '....DyyYYyyD....', '....DyYWWYyD....', '....DyYWWYyD....', '....DyyYYyyD....', '....DooyyooD....', '....LDDDDDDL....', '.....MMMMMM.....', '................'],
    { k: hexRGB('#2c2f36'), L: hexRGB('#6e7482'), M: hexRGB('#4a4f5a'), D: hexRGB('#2c2f36'), y: hexRGB('#f6b23a'), Y: hexRGB('#ffd86a'), W: hexRGB('#fff6d0'), o: hexRGB('#e07a1a') }));
  // particles
  addTile('smoke', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 7) p.set(x, y, grey(0.55 + p.rand() * 0.1), Math.round(170 * (1 - d / 7))); } });
  addTile('soul_flame', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.abs(x - 7.5) + Math.max(0, 8 - y) * 0.5; if (d < 6 && y > 2) p.set(x, y, mix(hexRGB('#e8ffff'), hexRGB('#2ab8d8'), clamp(d / 6, 0, 1)), 230); } });
  addTile('note_particle', p => p.art(['................', '................', '.........aaaa...', '.........a..a...', '.........a..a...', '.........a..a...', '.........a..a...', '.........a..a...', '.....aaa.a.aa...', '....aaaaaa.aa...', '....aaaaaa......', '.....aaaa.......', '................', '................', '................', '................'], { a: hexRGB('#4ae860') }));
  addTile('splash', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 6 && p.rand() < 0.6) p.set(x, y, [230, 240, 255], 200); } });
  addTile('portal_mote_ember', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 6) p.set(x, y, mix(hexRGB('#fff0a0'), hexRGB('#e8641c'), d / 6), Math.round(255 * (1 - d / 6))); } });
  addTile('portal_mote_sky', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 6) p.set(x, y, mix(hexRGB('#ffffff'), hexRGB('#5ac8f0'), d / 6), Math.round(255 * (1 - d / 6))); } });
}
