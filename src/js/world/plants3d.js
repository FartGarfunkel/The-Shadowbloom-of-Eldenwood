// ---------------------------------------------------------------------------
// world/plants3d.js — 0.9.0.12: plants and crops with real depth.
//
// Flowers, saplings, mushrooms, bushes and every stage of every crop were
// 1-pixel slabs cut from their pictures. Now each part is as thick as it is
// wide, the same way items are sculpted (render/sculpt.js): a stem stays a
// thin square stalk, a flower's head is a chunky little bloom, a wheat ear a
// fat seed head, a mushroom cap a solid cap. It's all cut from the plant's own
// picture, so resource packs come through exactly.
//
// Short grass and ferns (tinted by the biome, and everywhere) stay as they were,
// to keep big meadows quick to draw.
// ---------------------------------------------------------------------------
{
  // how thick each pixel of a 16x16 picture is, in half-pixels (1 = the old 1-pixel slab)
  function plantDepth(M) {
    const RAD = 6, rad = new Float32Array(256), loc = new Float32Array(256), out = new Uint8Array(256);
    const at = (i, j) => i >= 0 && j >= 0 && i < 16 && j < 16 && M[j * 16 + i];
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      if (!at(i, j)) continue;
      let best = RAD;
      for (let dj = -RAD; dj <= RAD; dj++) for (let di = -RAD; di <= RAD; di++) { const d = Math.hypot(di, dj); if (d < best && (di || dj) && !at(i + di, j + dj)) best = d; }
      rad[j * 16 + i] = Math.max(0.65, best - 0.35);
    }
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const r = rad[j * 16 + i]; if (!r) continue;
      const e = Math.ceil(r + 0.5);
      for (let dj = -e; dj <= e; dj++) for (let di = -e; di <= e; di++) {
        const ii = i + di, jj = j + dj;
        if (!at(ii, jj) || Math.hypot(di, dj) > r + 0.5) continue;
        if (loc[jj * 16 + ii] < r) loc[jj * 16 + ii] = r;
      }
    }
    for (let k = 0; k < 256; k++) {
      if (!rad[k]) continue;
      const L = loc[k], r = rad[k], h = Math.sqrt(Math.max(0, L * L - (L - r) * (L - r))) * 0.8;   // half-thickness in pixels
      out[k] = clamp(Math.round(h * 2), 1, 3);
    }
    return out;
  }
  plantQuads = function (tile) {
    if (VOXP.src !== ATLAS.pixels) { VOXP.src = ATLAS.pixels; VOXP.cache = []; VOXP.quads = []; }
    const hit = VOXP.quads[tile]; if (hit) return hit;
    const P = ATLAS.pixels && ATLAS.pixels.data, W = ATLAS_SIZE, tx = (tile % ATLAS_TILES) * TILE, ty = Math.floor(tile / ATLAS_TILES) * TILE, st = TILE / 16;
    const M = new Uint8Array(256);
    if (P) for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) M[j * 16 + i] = P[((ty + Math.floor((j + 0.5) * st)) * W + tx + Math.floor((i + 0.5) * st)) * 4 + 3] >= 128 ? 1 : 0;
    const T = plantDepth(M), th = (i, j) => (i < 0 || j < 0 || i > 15 || j > 15) ? 0 : T[j * 16 + i];
    const Q = [];
    const face = (vs, N) => {
      // vs: four [t, h, s, u, v, sh]; positions in the frame are (t, h, s)
      const Pp = (q) => [q[0], q[1], q[2] * 0.03];
      const a = Pp(vs[0]), b = Pp(vs[1]), c = Pp(vs[2]);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      const ok = cr[0] * N[0] + cr[1] * N[1] + cr[2] * N[2] >= 0;
      for (const q of ok ? vs : [vs[0], vs[3], vs[2], vs[1]]) Q.push(...q);
    };
    // the faces you look at: rectangles of pixels of one thickness, front and back
    const done = new Uint8Array(256);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const s = th(i, j); if (!s || done[j * 16 + i]) continue;
      let i1 = i; while (i1 + 1 < 16 && th(i1 + 1, j) === s && !done[j * 16 + i1 + 1]) i1++;
      let j1 = j;
      grow: while (j1 + 1 < 16) { for (let k = i; k <= i1; k++) if (th(k, j1 + 1) !== s || done[(j1 + 1) * 16 + k]) break grow; j1++; }
      for (let jj = j; jj <= j1; jj++) for (let k = i; k <= i1; k++) done[jj * 16 + k] = 1;
      const t0 = i / 16, t1 = (i1 + 1) / 16, h0 = 1 - (j1 + 1) / 16, h1 = 1 - j / 16;
      face([[t0, h0, s, i, j1 + 1, 235], [t1, h0, s, i1 + 1, j1 + 1, 235], [t1, h1, s, i1 + 1, j, 235], [t0, h1, s, i, j, 235]], [0, 0, 1]);
      face([[t1, h0, -s, i1 + 1, j1 + 1, 220], [t0, h0, -s, i, j1 + 1, 220], [t0, h1, -s, i, j, 220], [t1, h1, -s, i1 + 1, j, 220]], [0, 0, -1]);
    }
    // the steps between columns (and the outline): from the thinner side's depth out to the thicker's
    for (let b = -1; b < 16; b++) {
      let j = 0;
      while (j < 16) {
        const L = th(b, j), R = th(b + 1, j);
        if (L === R) { j++; continue; }
        let j1 = j; while (j1 + 1 < 16 && th(b, j1 + 1) === L && th(b + 1, j1 + 1) === R) j1++;
        const t = (b + 1) / 16, hA = 1 - j / 16, hB = 1 - (j1 + 1) / 16, lo = Math.min(L, R), hi = Math.max(L, R), N = L > R ? [1, 0, 0] : [-1, 0, 0];
        const uc = (L > R ? b : b + 1) + 0.5, sh = L > R ? 200 : 185;
        face([[t, hB, lo, uc, j1 + 1, sh], [t, hB, hi, uc, j1 + 1, sh], [t, hA, hi, uc, j, sh], [t, hA, lo, uc, j, sh]], N);
        face([[t, hB, -hi, uc, j1 + 1, sh], [t, hB, -lo, uc, j1 + 1, sh], [t, hA, -lo, uc, j, sh], [t, hA, -hi, uc, j, sh]], N);
        j = j1 + 1;
      }
    }
    // the steps between rows (and the tops and bottoms)
    for (let b = -1; b < 16; b++) {
      let i = 0;
      while (i < 16) {
        const U = th(i, b), D = th(i, b + 1);
        if (U === D) { i++; continue; }
        let i1 = i; while (i1 + 1 < 16 && th(i1 + 1, b) === U && th(i1 + 1, b + 1) === D) i1++;
        const hy = 1 - (b + 1) / 16, lo = Math.min(U, D), hi = Math.max(U, D), N = U > D ? [0, -1, 0] : [0, 1, 0];
        const vc = (U > D ? b : b + 1) + 0.5, sh = U > D ? 150 : 250;
        face([[i / 16, hy, lo, i, vc, sh], [(i1 + 1) / 16, hy, lo, i1 + 1, vc, sh], [(i1 + 1) / 16, hy, hi, i1 + 1, vc, sh], [i / 16, hy, hi, i, vc, sh]], N);
        face([[i / 16, hy, -hi, i, vc, sh], [(i1 + 1) / 16, hy, -hi, i1 + 1, vc, sh], [(i1 + 1) / 16, hy, -lo, i1 + 1, vc, sh], [i / 16, hy, -lo, i, vc, sh]], N);
        i = i1 + 1;
      }
    }
    return (VOXP.quads[tile] = new Float32Array(Q));
  };
}

// ---------------------------------------------------------------------------
// (0.9.0.13) Flowers built in 3D, and grass as clumps of blades.
//
// A flower is a stalk with a couple of leaves and a real head: petals fanned
// out round a centre (daisies, bluets, cornflowers, orchids, poppies), a cup of
// petals (tulips, dandelions), a round ball of florets (alliums), or little
// bells nodding off an arched stalk (lilies of the valley). Every part takes its
// colour from the flower's own picture (your resource pack's).
// Short grass and ferns are a clump of separate blades at all angles, each
// leaning its own way, so a meadow has depth from every side.
// ---------------------------------------------------------------------------
const FLOWER3D = {};
function flowerLook(tile, key) {
  if (FLOWER3D[tile] && FLOWER3D[tile].src === ATLAS.pixels) return FLOWER3D[tile];
  const info = spriteInfo(tile), px = info.px;
  if (!px.length) return (FLOWER3D[tile] = { src: ATLAS.pixels, none: true });
  const green = (p) => p.g > p.r + 10 && p.g >= p.b - 8;
  const common = (list) => { const n = new Map(); let best = null, bn = 0; for (const p of list) { const k = (p.r >> 4) << 8 | (p.g >> 4) << 4 | (p.b >> 4), c = (n.get(k) || 0) + 1; n.set(k, c); if (c > bn) { bn = c; best = p; } } return best; };
  const G = px.filter(green), F = px.filter(p => !green(p) && p.lum > 25);
  const stem = common(G) || px[0], leaf = G.reduce((a, p) => (!a || p.lum > a.lum ? p : a), null) || stem;
  const petal = common(F) || stem;
  const far = (p) => Math.abs(p.r - petal.r) + Math.abs(p.g - petal.g) + Math.abs(p.b - petal.b) > 70;
  const center = common(F.filter(far)) || F.reduce((a, p) => (!a || p.lum < a.lum ? p : a), null) || petal;
  const top = px.reduce((a, p) => Math.min(a, p.j), 99), headRow = F.length ? F.reduce((a, p) => a + p.j, 0) / F.length : top + 2;
  const R = info.R;
  const kind = /tulip|flower_yellow|dandelion|torchflower/.test(key) ? 'cup' : /allium/.test(key) ? 'ball' : /lily_of_the_valley/.test(key) ? 'bells' : 'fan';
  return (FLOWER3D[tile] = { src: ATLAS.pixels, stem, leaf, petal, center, kind, h: clamp((R - top) / R, 0.42, 0.95), head: clamp(1 - (headRow + 0.5) / R, 0.3, 0.9) });
}
function emitFlower3D(mb, ri, id, x, y, z, meta) {
  const self = BLOCKS[id], tile = BLOCK_FACES[id][0], L = flowerLook(tile, self.key);
  if (L.none) return false;
  const sk = R_SKY[ri] * 17, bl = Math.max(R_BL[ri], T_LIGHT[id]) * 17;
  const hsh = hash32(x, y, z, 5), r1 = (hsh & 255) / 255, r2 = ((hsh >> 8) & 255) / 255, r3 = ((hsh >> 16) & 255) / 255;
  const cx = x + 0.5 + (r1 - 0.5) * 0.3, cz = z + 0.5 + (r2 - 0.5) * 0.3, rot = r3 * TAU;
  const sw = (vy) => { const hy = (vy - y); mb.sway = hy > 0.02 ? 16 + Math.round(15 * clamp(hy, 0, 1)) : 0; };
  const V = (X, Y, Z, P, sh) => { sw(Y); return mb.vert(X, Y, Z, P.u, P.v, sk, bl, sh); };
  // an upright box round a point
  const box = (x0, y0, z0, x1, y1, z1, P) => {
    for (let f = 0; f < 6; f++) {
      const F = FACES[f], sh = [205, 195, 250, 140, 225, 215][f];
      const vs = F.c.map(c => V(c[0] ? x1 : x0, c[1] ? y1 : y0, c[2] ? z1 : z0, P, sh));
      mb.quad(vs[0], vs[1], vs[2], vs[3], false);
    }
  };
  // a flat piece from p to q, w wide and t thick (a leaf, a petal), lying across the way it points
  const piece = (p, q, w, t, P) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], Lh = Math.hypot(dx, dz) || 1e-6;
    const sx = -dz / Lh * w / 2, sz = dx / Lh * w / 2;                 // across, level
    const L3 = Math.hypot(dx, dy, dz) || 1e-6, ux = dx / L3, uy = dy / L3, uz = dz / L3;
    let nx = uy * sz - uz * 0, ny = uz * sx - ux * sz, nz = ux * 0 - uy * sx;   // the face's normal: along x across
    const nl = Math.hypot(nx, ny, nz) || 1; nx = nx / nl * t / 2; ny = ny / nl * t / 2; nz = nz / nl * t / 2;
    const C = [[p[0] - sx, p[1], p[2] - sz], [q[0] - sx, q[1], q[2] - sz], [q[0] + sx, q[1], q[2] + sz], [p[0] + sx, p[1], p[2] + sz]];
    const up = C.map(c => [c[0] + nx, c[1] + ny, c[2] + nz]), dn = C.map(c => [c[0] - nx, c[1] - ny, c[2] - nz]);
    const quad = (a, b, c, d, sh) => { const vs = [a, b, c, d].map(o => V(o[0], o[1], o[2], P, sh)); mb.quad(vs[0], vs[1], vs[2], vs[3], false); mb.quad(vs[1], vs[0], vs[3], vs[2], false); };
    quad(up[0], up[1], up[2], up[3], 245); quad(dn[1], dn[0], dn[3], dn[2], 175);
    quad(up[0], dn[0], dn[1], up[1], 200); quad(up[2], dn[2], dn[3], up[3], 200);
    quad(up[1], dn[1], dn[2], up[2], 215);
  };
  const s1 = 1 / 32, H = L.h * (0.88 + r1 * 0.2), hy = y + Math.min(H, L.head + 0.08) - 0.02;
  const lean = 0.035, lx = Math.cos(rot) * lean, lz = Math.sin(rot) * lean;
  // the stalk, in two pieces so it leans a little
  const mid = y + (hy - y) * 0.5;
  box(cx - s1, y, cz - s1, cx + s1, mid, cz + s1, L.stem);
  box(cx + lx * 0.5 - s1, mid - 0.01, cz + lz * 0.5 - s1, cx + lx * 0.5 + s1, hy, cz + lz * 0.5 + s1, L.stem);
  const hx = cx + lx * 0.6, hz = cz + lz * 0.6;
  // two leaves from low on the stalk
  for (let k = 0; k < 2; k++) {
    const a = rot + k * Math.PI + 0.6, ly = y + 0.06 + k * 0.08, len = 0.17 + r2 * 0.06;
    piece([cx, ly, cz], [cx + Math.cos(a) * len, ly + 0.13, cz + Math.sin(a) * len], 0.075, 0.02, L.leaf);
  }
  if (L.kind === 'ball') {
    // an allium: a round head of florets
    const R0 = 0.11; for (let k = 0; k < 3; k++) { const yy = hy - 0.02 + k * 0.07, rr = R0 * [0.75, 1, 0.75][k]; box(hx - rr, yy, hz - rr * 0.6, hx + rr, yy + 0.07, hz + rr * 0.6, L.petal); box(hx - rr * 0.6, yy, hz - rr, hx + rr * 0.6, yy + 0.07, hz + rr, L.petal); }
    box(hx - 0.03, hy + 0.21, hz - 0.03, hx + 0.03, hy + 0.24, hz + 0.03, L.center);
  } else if (L.kind === 'cup') {
    // a tulip or a dandelion: petals curving up round the centre, a cup
    box(hx - 0.04, hy - 0.01, hz - 0.04, hx + 0.04, hy + 0.06, hz + 0.04, L.center);
    for (let k = 0; k < 5; k++) { const a = rot + k / 5 * TAU; piece([hx + Math.cos(a) * 0.03, hy, hz + Math.sin(a) * 0.03], [hx + Math.cos(a) * 0.085, hy + 0.15, hz + Math.sin(a) * 0.085], 0.075, 0.025, L.petal); }
  } else if (L.kind === 'bells') {
    // lily of the valley: an arching stalk with little bells hanging under it
    for (let k = 0; k < 4; k++) { const t = k / 3, bx = hx + Math.cos(rot) * (0.03 + t * 0.15), bz = hz + Math.sin(rot) * (0.03 + t * 0.15), by = hy + 0.06 - t * t * 0.12; box(bx - 0.012, by, bz - 0.012, bx + 0.012, by + 0.03, bz + 0.012, L.stem); box(bx - 0.035, by - 0.06, bz - 0.035, bx + 0.035, by, bz + 0.035, L.petal); }
  } else {
    // a fan of petals round a centre, opened up to the sky
    const n = 5 + (hsh & 1), plen = 0.13 + r3 * 0.03;
    for (let k = 0; k < n; k++) { const a = rot + k / n * TAU; piece([hx + Math.cos(a) * 0.025, hy + 0.02, hz + Math.sin(a) * 0.025], [hx + Math.cos(a) * plen, hy + 0.06, hz + Math.sin(a) * plen], 0.085, 0.022, L.petal); }
    box(hx - 0.04, hy + 0.01, hz - 0.04, hx + 0.04, hy + 0.07, hz + 0.04, L.center);
  }
  mb.sway = 0;
  return true;
}
// short grass and ferns: a clump of blades, each a strip of the picture standing at its own angle and lean
function emitGrassClump(mb, ri, id, x, y, z, meta) {
  const self = BLOCKS[id], tile = BLOCK_FACES[id][0], uv = tileUV(tile), du = (uv[2] - uv[0]) / 16;
  const sk = R_SKY[ri] * 17, bl = Math.max(R_BL[ri], T_LIGHT[id]) * 17;
  if (self.tint) mb.tint = cornerTint(x + 1, z + 1, climateGrass, self.tint === 'foliage');
  let h = hash32(x, y, z, 9);
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) ^ 0x297a2d39; h ^= h >>> 12; return ((h >>> 0) % 10000) / 10000; };
  const N = 6;
  for (let k = 0; k < N; k++) {
    const px = x + 0.18 + rnd() * 0.64, pz = z + 0.18 + rnd() * 0.64, a = rnd() * Math.PI, w = 0.2 + rnd() * 0.12, hh = 0.62 + rnd() * 0.38;
    const ca = Math.cos(a) * w / 2, sa = Math.sin(a) * w / 2, la = rnd() * TAU, lean = 0.06 + rnd() * 0.12, lx = Math.cos(la) * lean, lz = Math.sin(la) * lean;
    const u0 = uv[0] + Math.floor(rnd() * 10) * du, u1 = u0 + 6 * du, sh = 220 + Math.floor(rnd() * 30);
    mb.sway = 0;
    const A = mb.vert(px - ca, y, pz - sa, u0, uv[3], sk, bl, sh), Bv = mb.vert(px + ca, y, pz + sa, u1, uv[3], sk, bl, sh);
    mb.sway = 16 + Math.round(15 * hh);
    const Cv = mb.vert(px + ca + lx, y + hh, pz + sa + lz, u1, uv[1], sk, bl, sh), Dv = mb.vert(px - ca + lx, y + hh, pz - sa + lz, u0, uv[1], sk, bl, sh);
    mb.quad(A, Bv, Cv, Dv, false); mb.quad(Bv, A, Dv, Cv, false);
  }
  mb.sway = 0; mb.tint = TINT_GRASS;
}
// ---- (0.9.0.15) stacked plants in 3D, lined up block to block ---------------------------------------------------------
// the boxes and leaves these are made of; sw(vy) sets how much a vertex at height vy sways
function plantKit(mb, sk, bl, sw) {
  const V = (X, Y, Z, P, sh) => { sw(Y); return mb.vert(X, Y, Z, P.u, P.v, sk, bl, sh); };
  const box = (x0, y0, z0, x1, y1, z1, P, caps = 3) => {
    for (let f = 0; f < 6; f++) {
      if ((f === 2 && !(caps & 1)) || (f === 3 && !(caps & 2))) continue;
      const F = FACES[f], sh = [205, 195, 250, 140, 225, 215][f];
      const vs = F.c.map(c => V(c[0] ? x1 : x0, c[1] ? y1 : y0, c[2] ? z1 : z0, P, sh));
      mb.quad(vs[0], vs[1], vs[2], vs[3], false);
    }
  };
  const piece = (p, q, w, t, P) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], Lh = Math.hypot(dx, dz) || 1e-6;
    const sx = -dz / Lh * w / 2, sz = dx / Lh * w / 2;
    const L3 = Math.hypot(dx, dy, dz) || 1e-6, ux = dx / L3, uy = dy / L3, uz = dz / L3;
    let nx = uy * sz, ny = uz * sx - ux * sz, nz = -uy * sx;
    const nl = Math.hypot(nx, ny, nz) || 1; nx = nx / nl * t / 2; ny = ny / nl * t / 2; nz = nz / nl * t / 2;
    const C = [[p[0] - sx, p[1], p[2] - sz], [q[0] - sx * 0.35, q[1], q[2] - sz * 0.35], [q[0] + sx * 0.35, q[1], q[2] + sz * 0.35], [p[0] + sx, p[1], p[2] + sz]];
    const up = C.map(c => [c[0] + nx, c[1] + ny, c[2] + nz]), dn = C.map(c => [c[0] - nx, c[1] - ny, c[2] - nz]);
    const quad = (a, b, c, d, sh) => { const vs = [a, b, c, d].map(o => V(o[0], o[1], o[2], P, sh)); mb.quad(vs[0], vs[1], vs[2], vs[3], false); mb.quad(vs[1], vs[0], vs[3], vs[2], false); };
    quad(up[0], up[1], up[2], up[3], 245); quad(dn[1], dn[0], dn[3], dn[2], 175);
    quad(up[0], dn[0], dn[1], up[1], 200); quad(up[2], dn[2], dn[3], up[3], 200); quad(up[1], dn[1], dn[2], up[2], 215);
  };
  return { V, box, piece };
}
// Sugar cane: the picture's upright stalks become real round-ish stalks, each with its own bands and leaves,
// standing in the same spots all the way up (only x and z choose them), so a tall cane is one piece.
const CANE3D = {};
function caneLook(tile) {
  if (CANE3D[tile] && CANE3D[tile].src === ATLAS.pixels) return CANE3D[tile];
  const info = spriteInfo(tile), R = info.R, px = info.px;
  const col = new Array(R).fill(0); for (const p of px) col[p.i]++;
  const stalks = [];
  for (let i = 0; i < R; i++) {
    if (col[i] < R * 0.6) continue;
    const last = stalks[stalks.length - 1];
    if (last && last[1] === i - 1) last[1] = i; else stalks.push([i, i]);
  }
  const inStalk = (i) => stalks.findIndex(s => i >= s[0] && i <= s[1]);
  const leaves = [];
  for (const p of px) if (inStalk(p.i) < 0) { let k = 0, bd = 99; stalks.forEach((s, n) => { const d = Math.min(Math.abs(p.i - s[0]), Math.abs(p.i - s[1])); if (d < bd) { bd = d; k = n; } }); if (bd <= 3) leaves.push({ p, k, side: p.i > stalks[k][1] ? 1 : -1, out: bd }); }
  const cap = stalks.map(s => px.find(p => p.i === s[0] && p.j === Math.floor(R / 2)) || px.find(p => p.i === s[0]) || px[0]);
  return (CANE3D[tile] = { src: ATLAS.pixels, R, uv: info.uv, stalks: stalks.slice(0, 4), leaves, cap, none: !stalks.length });
}
function emitCane3D(mb, ri, id, x, y, z, meta) {
  const self = BLOCKS[id], tile = BLOCK_FACES[id][0], L = caneLook(tile);
  if (L.none) return false;
  const sk = R_SKY[ri] * 17, bl = Math.max(R_BL[ri], T_LIGHT[id]) * 17;
  if (self.tint) mb.tint = cornerTint(x + 1, z + 1, climateGrass, self.tint === 'foliage');
  const K = plantKit(mb, sk, bl, () => { mb.sway = 0; });
  const above = y + 1 < CH ? R_BLOCK[ri + RW2] : 0, below = y > 0 ? R_BLOCK[ri - RW2] : 0;
  const caps = (above !== id ? 1 : 0) | (below !== id ? 2 : 0);
  const h = hash32(x, 0, z, 23), turn = (h & 3) * Math.PI / 2;
  const spots = [[0.3, 0.3], [0.7, 0.38], [0.46, 0.72], [0.74, 0.76]];
  const R = L.R, uv = L.uv, du = (uv[2] - uv[0]) / R;
  L.stalks.forEach(([c0, c1], k) => {
    const sp = spots[k % 4], jx = (((h >>> (8 + k * 4)) & 15) / 15 - 0.5) * 0.08, jz = (((h >>> (10 + k * 4)) & 15) / 15 - 0.5) * 0.08;
    let ox = sp[0] - 0.5 + jx, oz = sp[1] - 0.5 + jz; [ox, oz] = [ox * Math.cos(turn) - oz * Math.sin(turn), ox * Math.sin(turn) + oz * Math.cos(turn)];
    const cx = x + 0.5 + ox, cz = z + 0.5 + oz, hw = (c1 - c0 + 1) / R / 2;
    // the four sides each show the stalk's strip of the picture, bands and all
    const u0 = uv[0] + c0 * du, u1 = uv[0] + (c1 + 1) * du;
    const side = (ax, az, bx, bz, sh) => {
      mb.sway = 0;
      const a = mb.vert(ax, y, az, u0, uv[3], sk, bl, sh), b = mb.vert(bx, y, bz, u1, uv[3], sk, bl, sh);
      const c = mb.vert(bx, y + 1, bz, u1, uv[1], sk, bl, sh), d = mb.vert(ax, y + 1, az, u0, uv[1], sk, bl, sh);
      mb.quad(a, b, c, d, false);
    };
    side(cx - hw, cz + hw, cx + hw, cz + hw, 225); side(cx + hw, cz - hw, cx - hw, cz - hw, 215);
    side(cx + hw, cz + hw, cx + hw, cz - hw, 205); side(cx - hw, cz - hw, cx - hw, cz + hw, 195);
    if (caps & 1) K.box(cx - hw, y + 0.999, cz - hw, cx + hw, y + 1, cz + hw, L.cap[k], 1);
    // its leaves: the picture's side pixels, standing out from the stalk the way they lie in the picture
    const a = turn + k * 1.9, dx = Math.cos(a), dz = Math.sin(a);
    for (const lf of L.leaves) {
      if (lf.k !== k) continue;
      const yy = y + 1 - (lf.p.j + 1) / R, o0 = hw + (lf.out - 1) / R, o1 = o0 + 1.2 / R, s = lf.side, t = 0.6 / R;
      const lx0 = cx + dx * s * o0, lz0 = cz + dz * s * o0, lx1 = cx + dx * s * o1, lz1 = cz + dz * s * o1;
      K.box(Math.min(lx0, lx1) - Math.abs(dz) * t, yy, Math.min(lz0, lz1) - Math.abs(dx) * t, Math.max(lx0, lx1) + Math.abs(dz) * t, yy + 1 / R, Math.max(lz0, lz1) + Math.abs(dx) * t, lf.p);
    }
  });
  mb.sway = 0; mb.tint = TINT_GRASS;
  return true;
}
// Kelp: one stem standing in the same spot all the way up from the sea floor, swaying more the higher it
// goes (so the pieces stay joined), with leaves off it turn and turn about, and a leafy tip at the top.
const KELP3D = {};
function kelpLook(tile) {
  if (KELP3D[tile] && KELP3D[tile].src === ATLAS.pixels) return KELP3D[tile];
  const info = spriteInfo(tile), px = info.px;
  if (!px.length) return (KELP3D[tile] = { src: ATLAS.pixels, none: true });
  const n = new Map(); let stem = px[0], bn = 0;
  for (const p of px) { const k = (p.r >> 4) << 8 | (p.g >> 4) << 4 | (p.b >> 4), c = (n.get(k) || 0) + 1; n.set(k, c); if (c > bn) { bn = c; stem = p; } }
  const leaf = px.reduce((a, p) => (!a || p.lum > a.lum ? p : a), null) || stem;
  return (KELP3D[tile] = { src: ATLAS.pixels, stem, leaf });
}
function emitKelp3D(mb, ri, id, x, y, z, meta) {
  const tile = BLOCK_FACES[id][0], L = kelpLook(tile);
  if (L.none) return false;
  const sk = R_SKY[ri] * 17, bl = Math.max(R_BL[ri], T_LIGHT[id]) * 17;
  let d = 0; while (d < 6 && y - d - 1 >= 0 && R_BLOCK[ri - RW2 * (d + 1)] === id) d++;
  const sw = (vy) => { const k = Math.min(1, (d + (vy - y)) / 5); mb.sway = k > 0.01 ? 16 + Math.round(15 * k) : 0; };
  const K = plantKit(mb, sk, bl, sw);
  const top = !(y + 1 < CH && R_BLOCK[ri + RW2] === id);
  const h = hash32(x, 0, z, 31), cx = x + 0.5 + (((h & 255) / 255) - 0.5) * 0.3, cz = z + 0.5 + ((((h >>> 8) & 255) / 255) - 0.5) * 0.3, s = 1.1 / 16;
  const hy = top ? y + 0.72 : y + 1;
  K.box(cx - s, y, cz - s, cx + s, hy, cz + s, L.stem, top ? 1 : 0);
  // leaves, turn and turn about up the stem
  const base = ((h >>> 16) & 255) / 255 * TAU;
  for (let k = 0; k < 2; k++) {
    const a = base + (y * 2 + k) * 2.4, ly = y + 0.18 + k * 0.45, len = 0.26 + (((h >>> (k * 5)) & 31) / 31) * 0.1;
    K.piece([cx, ly, cz], [cx + Math.cos(a) * len, ly + 0.2, cz + Math.sin(a) * len], 0.16, 0.03, L.leaf);
  }
  if (top) for (let k = 0; k < 3; k++) { const a = base + k * TAU / 3 + y; K.piece([cx, hy - 0.05, cz], [cx + Math.cos(a) * 0.16, hy + 0.22, cz + Math.sin(a) * 0.16], 0.12, 0.03, L.leaf); }
  mb.sway = 0;
  return true;
}
{
  const baseCross = emitCross;
  emitCross = function (mb, ri, id, x, y, z, meta) {
    const self = BLOCKS[id];
    if ((self.flower || /^flower_|tulip|daisy|orchid|allium|bluet|cornflower|lily_of_the|poppy|dandelion/.test(self.key)) && !self.double && !self.hangs && self.render === RENDER.CROSS && !self.tint && ATLAS.pixels) { if (emitFlower3D(mb, ri, id, x, y, z, meta)) return; }
    if (self.tint && !self.double && self.render === RENDER.CROSS && /grass|fern/.test(self.key) && !/sea/.test(self.key)) { emitGrassClump(mb, ri, id, x, y, z, meta); return; }
    if (self.key === 'sugar_cane' && ATLAS.pixels) { if (emitCane3D(mb, ri, id, x, y, z, meta)) return; }
    if (self.key === 'kelp' && ATLAS.pixels) { if (emitKelp3D(mb, ri, id, x, y, z, meta)) return; }
    return baseCross(mb, ri, id, x, y, z, meta);
  };
}
