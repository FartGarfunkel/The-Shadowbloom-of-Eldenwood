// ---------------------------------------------------------------------------
// render/items3d.js — 0.8.4: things you hold are things, not cut-outs.
//
// Every item picture gets depth that grows away from its edges: a thin
// handle stays slim, a pickaxe head is a solid chunk, an apple is round.
// Some get a proper model: ingots and bricks are bars (and stack in criss-
// crossed layers, Vintage Story style), lanterns, chains, pots and the like are
// the same model as when they're placed, torches are little torches, and the
// bow and the fishing rod are built from parts (see game/bows.js and
// game/fishing.js for what they do).
// ---------------------------------------------------------------------------

// ---- depth for every picture -------------------------------------------------------------------
extrudeTile = function (mb, tile) {
  const uv = tileUV(tile);
  const tx = (tile % ATLAS_TILES) * TILE, ty = Math.floor(tile / ATLAS_TILES) * TILE;
  const P = ATLAS.pixels.data, W = ATLAS_SIZE, R = ATLAS.res[tile] || 16, st = TILE / R;
  const A = (i, j) => (i < 0 || j < 0 || i >= R || j >= R) ? 0 : P[((ty + j * st) * W + tx + i * st) * 4 + 3] >= 128;
  // how far each pixel is from the edge (chessboard steps), so the middle can stand proud
  const D = new Float32Array(R * R), cap = R >= 32 ? 6 : 3;
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) D[j * R + i] = A(i, j) ? cap : 0;
  for (let pass = 0; pass < cap; pass++) for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    if (!D[j * R + i]) continue;
    let m = cap;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ii = i + di, jj = j + dj; m = Math.min(m, (ii < 0 || jj < 0 || ii >= R || jj >= R) ? 0 : D[jj * R + ii]); }
    D[j * R + i] = Math.min(D[j * R + i], m + 1);
  }
  const px = 1 / R, base = 0.5 / 16, grow = (R >= 32 ? 0.32 : 0.6) / 16;
  const half = (i, j) => (i < 0 || j < 0 || i >= R || j >= R || !D[j * R + i]) ? 0 : base + (D[j * R + i] - 1) * grow;
  const du = (uv[2] - uv[0]) / R, dv = (uv[3] - uv[1]) / R;
  const f = (a, b, c, e, sh) => { const vs = [a, b, c, e].map(q => mb.vert(q[0], q[1], q[2], q[3], q[4], 255, 0, sh)); mb.quad(vs[0], vs[1], vs[2], vs[3], false); };
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    const h = half(i, j); if (!h) continue;
    const x0 = -0.5 + i * px, x1 = x0 + px, y1 = 0.5 - j * px, y0 = y1 - px;
    const u0 = uv[0] + i * du, u1 = u0 + du, v0 = uv[1] + j * dv, v1 = v0 + dv, uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
    f([x0, y0, h, u0, v1], [x1, y0, h, u1, v1], [x1, y1, h, u1, v0], [x0, y1, h, u0, v0], 255);
    f([x1, y0, -h, u1, v1], [x0, y0, -h, u0, v1], [x0, y1, -h, u0, v0], [x1, y1, -h, u1, v0], 200);
    // sides wherever the neighbour is thinner: the step between them shows
    const L = half(i - 1, j), Rr = half(i + 1, j), T = half(i, j - 1), Bm = half(i, j + 1);
    if (L < h) { f([x0, y0, -h, uc, vc], [x0, y0, -L || 0, uc, vc], [x0, y1, -L || 0, uc, vc], [x0, y1, -h, uc, vc], 175); f([x0, y0, L, uc, vc], [x0, y0, h, uc, vc], [x0, y1, h, uc, vc], [x0, y1, L, uc, vc], 175); }
    if (Rr < h) { f([x1, y0, h, uc, vc], [x1, y0, Rr, uc, vc], [x1, y1, Rr, uc, vc], [x1, y1, h, uc, vc], 185); f([x1, y0, -Rr || 0, uc, vc], [x1, y0, -h, uc, vc], [x1, y1, -h, uc, vc], [x1, y1, -Rr || 0, uc, vc], 185); }
    if (T < h) { f([x0, y1, h, uc, vc], [x1, y1, h, uc, vc], [x1, y1, T, uc, vc], [x0, y1, T, uc, vc], 235); f([x0, y1, -T || 0, uc, vc], [x1, y1, -T || 0, uc, vc], [x1, y1, -h, uc, vc], [x0, y1, -h, uc, vc], 235); }
    if (Bm < h) { f([x1, y0, h, uc, vc], [x0, y0, h, uc, vc], [x0, y0, Bm, uc, vc], [x1, y0, Bm, uc, vc], 140); f([x1, y0, -Bm || 0, uc, vc], [x0, y0, -Bm || 0, uc, vc], [x0, y0, -h, uc, vc], [x1, y0, -h, uc, vc], 140); }
  }
};

// ---- building parts ----------------------------------------------------------------------------
// A box between two points in the picture's plane (x, y), w wide and d deep, coloured from a patch
// (in tile pixels [x0, y0, x1, y1]) of a tile.
function partSeg(mb, a, b, w, d, tile, rect, sh = 1) {
  const t = typeof tile === 'string' ? (ATLAS.tile[tile] ?? 0) : tile, uv = tileUV(t), R = 16;
  const r = rect || [6, 6, 10, 10];
  const u0 = uv[0] + (uv[2] - uv[0]) * r[0] / R, u1 = uv[0] + (uv[2] - uv[0]) * r[2] / R, v0 = uv[1] + (uv[3] - uv[1]) * r[1] / R, v1 = uv[1] + (uv[3] - uv[1]) * r[3] / R;
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L * w / 2, ny = dx / L * w / 2, z0 = (a[2] || 0) - d / 2, z1 = (a[2] || 0) + d / 2;
  const c = [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]];
  const q = (p, s) => { const vs = p.map(([x, y, z], k) => mb.vert(x, y, z, k === 0 || k === 3 ? u0 : u1, k < 2 ? v1 : v0, 255, 0, Math.round(s * sh))); mb.quad(vs[0], vs[1], vs[2], vs[3], false); };
  q([[...c[0], z1], [...c[1], z1], [...c[2], z1], [...c[3], z1]], 255);
  q([[...c[1], z0], [...c[0], z0], [...c[3], z0], [...c[2], z0]], 200);
  q([[...c[0], z0], [...c[1], z0], [...c[1], z1], [...c[0], z1]], 170);
  q([[...c[2], z0], [...c[3], z0], [...c[3], z1], [...c[2], z1]], 230);
  q([[...c[3], z0], [...c[0], z0], [...c[0], z1], [...c[3], z1]], 190);
  q([[...c[1], z0], [...c[2], z0], [...c[2], z1], [...c[1], z1]], 190);
}
// a bow's stave: a curve from tip to tip bowing out toward (-1, 1); its grip in the middle
const BOW3D = { t0: [-0.43, -0.43], t1: [0.43, 0.43], c: [-0.47, 0.47] };
function bowPoint(u, pull = 0) {
  const k = 1 + pull * 0.3, t0 = [BOW3D.t0[0] * (1 - pull * 0.09), BOW3D.t0[1] * (1 - pull * 0.09)], t1 = [BOW3D.t1[0] * (1 - pull * 0.09), BOW3D.t1[1] * (1 - pull * 0.09)];
  const c = [BOW3D.c[0] * k, BOW3D.c[1] * k];
  return [(1 - u) * (1 - u) * t0[0] + 2 * (1 - u) * u * c[0] + u * u * t1[0], (1 - u) * (1 - u) * t0[1] + 2 * (1 - u) * u * c[1] + u * u * t1[1]];
}
function buildBowStave(mb, pull) {
  const N = 10;
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N, a = bowPoint(u0, pull), b = bowPoint(u1, pull), mid = Math.abs((u0 + u1) / 2 - 0.5);
    const grip = mid < 0.08, w = grip ? 0.1 : 0.085 - mid * 0.08;
    partSeg(mb, [...a, 0], [...b, 0], w, grip ? 0.1 : 0.07, grip ? 'leather' : 'stripped_oak_log_side', grip ? [5, 5, 9, 9] : [4, 2, 6, 14]);
  }
  // nocks at the tips
  for (const t of [bowPoint(0, pull), bowPoint(1, pull)]) partSeg(mb, [t[0] - 0.03, t[1] - 0.03, 0], [t[0] + 0.03, t[1] + 0.03, 0], 0.07, 0.08, 'dark_oak_planks');
}
const STRING_TILE = 'white_wool';
function buildArrow3D(mb) {
  // along +x from the nock (0) to the head (0.85)
  partSeg(mb, [0, 0, 0], [0.74, 0, 0], 0.035, 0.035, 'stripped_oak_log_side', [5, 3, 6, 12]);
  partSeg(mb, [0.72, 0, 0], [0.86, 0, 0], 0.07, 0.03, 'iron_block', [4, 4, 8, 8]);
  partSeg(mb, [0.86, 0, 0], [0.92, 0, 0], 0.035, 0.02, 'iron_block', [4, 4, 8, 8]);
  partSeg(mb, [0.02, 0, 0], [0.16, 0, 0], 0.09, 0.01, 'white_wool', [4, 4, 8, 8]);
  partSeg(mb, [0.02, 0, 0], [0.16, 0, 0], 0.01, 0.09, 'white_wool', [4, 4, 8, 8]);
}
// the fishing rod: a cork grip, a reel, a long rod that thins to the tip, and the line hanging from it
function buildRod3D(mb, withLine, hang) {
  const A = [-0.47, -0.47], T = [0.47, 0.47], N = [0.7071, -0.7071];
  const at = (u, off = 0, z = 0) => [A[0] + (T[0] - A[0]) * u + N[0] * off, A[1] + (T[1] - A[1]) * u + N[1] * off, z];
  const box4 = [4, 4, 8, 8], grain = [4, 2, 7, 14];
  partSeg(mb, at(0), at(0.025), 0.095, 0.095, 'dark_oak_planks', box4);                                     // butt cap
  for (let i = 0; i < 6; i++) partSeg(mb, at(0.025 + i * 0.035), at(0.06 + i * 0.035), 0.085, 0.085, i % 2 ? 'stripped_birch_log_side' : 'stripped_oak_log_side', grain);   // cork grip in rings
  partSeg(mb, at(0.235), at(0.315), 0.072, 0.072, 'iron_block', box4);                                      // reel seat
  partSeg(mb, at(0.315), at(0.37), 0.07, 0.07, 'stripped_birch_log_side', grain);                           // fore grip
  for (let i = 0; i < 10; i++) { const u0 = 0.37 + i * 0.063, w = 0.05 - i * 0.0034; partSeg(mb, at(u0), at(u0 + 0.064), w, w, 'stripped_spruce_log_side', [4, 2, 6, 14]); }   // the blank, tapering
  for (const u of [0.46, 0.61, 0.75, 0.88]) {
    partSeg(mb, at(u - 0.014), at(u + 0.014), 0.058, 0.058, 'red_wool', box4);                              // thread wraps
    partSeg(mb, at(u, 0.025), at(u, 0.07), 0.012, 0.03, 'iron_block', box4);                                // line guides
  }
  partSeg(mb, at(0.993), at(1.0), 0.03, 0.03, 'iron_block', box4);                                          // tip top
  // the reel hangs under the seat: a foot, a spool of line, a crank with a knob
  partSeg(mb, at(0.275, 0.035), at(0.275, 0.085), 0.025, 0.03, 'iron_block', box4);
  partSeg(mb, at(0.245, 0.12), at(0.305, 0.12), 0.1, 0.1, 'iron_block', box4);
  partSeg(mb, at(0.255, 0.12), at(0.295, 0.12), 0.105, 0.07, STRING_TILE);
  partSeg(mb, at(0.24, 0.12), at(0.24, 0.19), 0.018, 0.018, 'iron_block', box4);
  partSeg(mb, at(0.232, 0.19, 0.03), at(0.248, 0.19, 0.03), 0.03, 0.05, 'dark_oak_planks', box4);
  // the line: off the spool, through each guide, to the tip
  const pts = [at(0.3, 0.12), at(0.46, 0.07), at(0.61, 0.07), at(0.75, 0.068), at(0.88, 0.066), at(1.0, 0.0)];
  for (let i = 0; i < pts.length - 1; i++) partSeg(mb, pts[i], pts[i + 1], 0.008, 0.008, STRING_TILE);
  if (withLine) {
    // not cast: the line hangs from the tip, with the float and the hook on it (0.9.0.19: hanging the way that's
    // down when the rod is in your hand, out in front of you rather than back towards you)
    const t = at(1.0), H = hang || ROD_HANG, hl = Math.hypot(H[0], H[1], H[2]) || 1;
    const P = (d) => [t[0] + H[0] / hl * d, t[1] + H[1] / hl * d, t[2] + H[2] / hl * d];
    partSeg(mb, t, P(0.34), 0.01, 0.01, STRING_TILE);
    partSeg(mb, P(0.34), P(0.4), 0.07, 0.07, 'red_wool', box4);
    partSeg(mb, P(0.4), P(0.45), 0.07, 0.07, 'white_wool', box4);
    partSeg(mb, P(0.45), P(0.53), 0.01, 0.01, STRING_TILE);
    partSeg(mb, P(0.53), P(0.58), 0.015, 0.015, 'iron_block', box4);
    const q = P(0.58); partSeg(mb, q, [q[0] + 0.04, q[1] + 0.02, q[2]], 0.015, 0.015, 'iron_block', box4);
  }
}
const ROD_HANG = [0, -0.76, 0.65], ROD_HANG_TP = [-1, 0.04, 0];
const ITEM3D = {};
function item3dMesh(gl, key, build, kind = 'flat') {
  if (ITEM3D[key]) return ITEM3D[key];
  const mb = new MeshBuilder(1024); build(mb); const r = mb.result();
  return (ITEM3D[key] = { mesh: makeVAO(gl, r.verts, r.idx), kind });
}
// a thin box from a to b (for strings and lines drawn each frame)
function lineMesh(gl) { return item3dMesh(gl, '__line', mb => partSeg(mb, [0, 0, 0], [1, 0, 0], 0.014, 0.014, STRING_TILE)).mesh; }

{
  const base = itemMesh;
  itemMesh = function (gl, key) {
    if (ITEM_MESHES[key]) return ITEM_MESHES[key];
    const def = itemDef(key);
    let out = null;
    if (def) {
      const b = def.block ? BLOCKS[B[def.block]] : null;
      if (b && b.render === RENDER.MODEL && SHAPES[b.shape] && !b.furniture) {
        // lanterns, chains, pots, campfires...: the placed model, in the hand too
        const mb = new MeshBuilder(256);
        for (const box of SHAPES[b.shape]) addShapeBox(mb, box, -0.8, -0.6, -0.8, 1.6 / 16, 255, 0);
        const r = mb.result(); out = { mesh: makeVAO(gl, r.verts, r.idx), kind: 'block' };
      } else if (b && b.render === RENDER.TORCH) {
        // the torch exactly as it stands on the ground: a stick two pixels square and ten tall, its
        // picture's middle wrapped round it, the flame on top (the same pieces of picture the placed one uses)
        const uv = tileUV(BLOCK_FACES[B[def.block]][0]), tw = (uv[2] - uv[0]) / 16, th = (uv[3] - uv[1]) / 16, mb = new MeshBuilder(64);
        const s = 0.1, x0 = -s, x1 = s, y0 = -0.8, y1 = 0.2, u0 = uv[0] + 7 * tw, u1 = uv[0] + 9 * tw, v0 = uv[1] + 6 * th, v1 = uv[3];
        const q = (pts, ua, ub, va, vb, sh) => { const vs = pts.map((p, k) => mb.vert(p[0], p[1], p[2], k === 0 || k === 3 ? ua : ub, k < 2 ? vb : va, 255, 0, sh)); mb.quad(vs[0], vs[1], vs[2], vs[3], false); };
        q([[x1, y0, x1], [x1, y0, x0], [x1, y1, x0], [x1, y1, x1]], u0, u1, v0, v1, 220);
        q([[x0, y0, x0], [x0, y0, x1], [x0, y1, x1], [x0, y1, x0]], u0, u1, v0, v1, 220);
        q([[x0, y0, x1], [x1, y0, x1], [x1, y1, x1], [x0, y1, x1]], u0, u1, v0, v1, 200);
        q([[x1, y0, x0], [x0, y0, x0], [x0, y1, x0], [x1, y1, x0]], u0, u1, v0, v1, 200);
        q([[x0, y1, x1], [x1, y1, x1], [x1, y1, x0], [x0, y1, x0]], u0, u1, uv[1] + 6 * th, uv[1] + 8 * th, 255);
        q([[x0, y0, x0], [x1, y0, x0], [x1, y0, x1], [x0, y0, x1]], u0, u1, uv[3] - 2 * th, uv[3], 160);
        const r = mb.result(); out = { mesh: makeVAO(gl, r.verts, r.idx), kind: 'block', torch3d: true };
      } else if (/_ingot$|^brick$|^nether_brick$|_bar$|^netherite_scrap$/.test(key) && !def.block) {
        // a bar: Vintage Story's ingot, cast in a mould (narrower on top)
        const t = ATLAS.tile[def.icon] ?? 0, mb = new MeshBuilder(64);
        partSeg(mb, [-0.42, 0, 0], [0.42, 0, 0], 0.34, 0.15, t, [5, 6, 11, 10]);
        partSeg(mb, [-0.36, 0, 0.06], [0.36, 0, 0.06], 0.26, 0.12, t, [6, 5, 10, 9]);
        const r = mb.result(); out = { mesh: makeVAO(gl, r.verts, r.idx), kind: 'flat', bar3d: true };
      } else if (key === 'bow' || key.startsWith('bow_pulling_')) {
        const pull = key === 'bow' ? 0 : [0.35, 0.65, 1][+key.slice(-1)];
        const mb = new MeshBuilder(512);
        buildBowStave(mb, pull);
        const t0 = bowPoint(0, pull), t1 = bowPoint(1, pull), nk = [pull * 0.27, -pull * 0.27];
        if (pull) { partSeg(mb, [...t0, 0], [...nk, 0], 0.016, 0.016, STRING_TILE); partSeg(mb, [...t1, 0], [...nk, 0], 0.016, 0.016, STRING_TILE); }
        else partSeg(mb, [...t0, 0], [...t1, 0], 0.016, 0.016, STRING_TILE);
        if (pull) {
          // the arrow on the string, pointing through the grip
          const d = [-0.7071, 0.7071], at = (u) => [nk[0] + d[0] * u, nk[1] + d[1] * u, 0];
          partSeg(mb, at(0), at(0.74), 0.035, 0.035, 'stripped_oak_log_side', [5, 3, 6, 12]);
          partSeg(mb, at(0.72), at(0.86), 0.07, 0.03, 'iron_block', [4, 4, 8, 8]);
          partSeg(mb, at(0.02), at(0.16), 0.09, 0.012, 'white_wool', [4, 4, 8, 8]);
        }
        const r = mb.result(); out = { mesh: makeVAO(gl, r.verts, r.idx), kind: 'flat', bow3d: true };
      } else if (key === 'fishing_rod' || key === 'fishing_rod_cast' || key === 'fishing_rod_tp') {
        // (0.9.0.19) in first person the line hangs one way from the tip; held by someone you're looking at
        // (another player, a fisher), the rod is held up at an angle and the line hangs another
        const mb = new MeshBuilder(1024); buildRod3D(mb, key !== 'fishing_rod_cast', key === 'fishing_rod_tp' ? ROD_HANG_TP : ROD_HANG); const r = mb.result();
        out = { mesh: makeVAO(gl, r.verts, r.idx), kind: 'flat', rod3d: true };
      }
    }
    if (out) { ITEM_MESHES[key] = out; return out; }
    return base(gl, key);
  };
}

// ---- backpacks: a proper pack, with a flap, a pouch, side pockets and a bedroll ------------------
// The same pack is worn on your back (with straps over your shoulders), held, dropped and set down.
const PACK_LOOK = {
  leather_backpack: { body: 'pack_body_l', flap: 'pack_flap_l', metal: 'pack_brass', roll: 'pack_roll_l', big: 0 },
  reinforced_backpack: { body: 'pack_body_r', flap: 'pack_flap_r', metal: 'pack_iron', roll: 'pack_roll_r', big: 1 },
};
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    const leather = (name, c, d, l, st) => addTile(name, p => {
      p.noise(H(c), 0.07);
      for (let i = 0; i < 22; i++) p.set((i * 7 + 3) % 16, (i * 11 + 5) % 16, H(l));
      for (let k = 0; k < 16; k++) { p.set(k, 0, H(d)); p.set(k, 15, H(d)); p.set(0, k, H(d)); p.set(15, k, H(d)); }
      for (let k = 2; k < 14; k += 2) { p.set(k, 2, H(st)); p.set(k, 13, H(st)); p.set(2, k, H(st)); p.set(13, k, H(st)); }
    });
    leather('pack_body_l', '#9a6232', '#5a3518', '#a86e3a', '#d8c890');
    leather('pack_flap_l', '#7a4a24', '#4a2a12', '#8a5630', '#d8c890');
    leather('pack_body_r', '#6e4a2a', '#3a2a1a', '#7a5434', '#b8b8b8');
    leather('pack_flap_r', '#4e3420', '#2a1c10', '#5a3e26', '#b8b8b8');
    addTile('pack_strap', p => { p.noise(H('#4a2c14'), 0.06); for (let y = 2; y < 16; y += 4) p.set(7, y, H('#24160a')); for (let k = 0; k < 16; k++) { p.set(0, k, H('#33200e')); p.set(15, k, H('#33200e')); } });
    addTile('pack_brass', p => { p.noise(H('#c8a040'), 0.1); for (let k = 0; k < 16; k++) { p.set(k, 0, H('#8a6a20')); p.set(0, k, H('#8a6a20')); p.set(k, 15, H('#8a6a20')); p.set(15, k, H('#8a6a20')); } p.set(5, 5, H('#f0d880')); p.set(6, 5, H('#f0d880')); });
    addTile('pack_iron', p => { p.noise(H('#b8b8c0'), 0.08); for (let k = 0; k < 16; k++) { p.set(k, 0, H('#70707a')); p.set(0, k, H('#70707a')); p.set(k, 15, H('#70707a')); p.set(15, k, H('#70707a')); } for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) p.set(x, y, H('#e8e8f0')); });
    const roll = (name, a, b) => addTile(name, p => { p.noise(H(a), 0.08); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y * 3) % 8 < 2) p.set(x, y, H(b)); for (let x = 0; x < 16; x++) { p.set(x, 5, H(b)); p.set(x, 10, H(b)); } });
    roll('pack_roll_l', '#6a7a4a', '#4a5a32');
    roll('pack_roll_r', '#3a5a8a', '#c8b890');
  };
}
// boxes in skin pixels on the back: x across the shoulders, y up from the waist, z out from the back
function buildPack3D(mb, key, mode, gear = '') {
  const L = PACK_LOOK[key] || PACK_LOOK.leather_backpack, big = L.big;
  const tf = mode === 'item' ? (v) => [v[0] * 0.1, (v[1] - 7) * 0.1, (v[2] - 4.2) * 0.1] : (v) => v;
  const box = (a, b, t) => { const p = tf(a), q = tf(b); addBox(mb, [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.min(p[2], q[2])], [Math.max(p[0], q[0]), Math.max(p[1], q[1]), Math.max(p[2], q[2])], typeof t === 'string' ? [t, t, t, t, t, t] : t); };
  if (mode === 'straps') {
    // just the shoulder straps, for looking down at yourself in first person
    for (const sx of [-2.3, 2.3]) box([sx - 0.6, 3.6, -2.32], [sx + 0.6, 12.25, -2.02], 'pack_strap');
    return;
  }
  const w = 3.5 + big * 0.3, top = 10.5 + big * 0.4, d = 5.2 + big * 0.4;
  box([-w, 1.4, 2.0], [w, top, d], L.body);                                                   // the bag
  box([-w - 0.2, top - 0.9, 1.9], [w + 0.2, top + 0.4, d + 0.4], [L.body, L.body, L.flap, L.body, L.flap, L.body]);   // the lid
  box([-3.0, top - 4.2, d], [3.0, top + 0.4, d + 0.4], L.flap);                               // the flap hanging over the front
  box([-0.7, top - 4.0, d + 0.4], [0.7, top - 3.0, d + 0.6], L.metal);                         // its buckle
  box([-2.6, 2.1, d - 0.2], [2.6, 5.8, d + 1.4], L.body);                                     // the pouch
  box([-2.7, 4.7, d - 0.2], [2.7, 6.0, d + 1.55], [L.flap, L.flap, L.flap, L.body, L.flap, L.flap]);
  box([-0.45, 4.6, d + 1.55], [0.45, 5.3, d + 1.7], L.metal);
  for (const s of [-1, 1]) {
    box([s * w, 2.4, 2.6], [s * (w + 1.1), 6.6, 4.8], L.body);                                // side pockets
    box([s * w, 6.0, 2.5], [s * (w + 1.2), 6.7, 4.9], L.flap);
  }
  box([-4.4, top + 0.4, 2.5], [4.4, top + 2.1, 4.6], gear.includes('b') ? 'bag_top' : L.roll);   // a bedroll on top (your sleeping bag, if you carry one)
  // gear carried on the outside (0.9.0.11): a coil of rope, the grappling hook, a cooking pot
  if (gear.includes('r')) for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, cy = 5.2 + Math.sin(a) * 2.2, cz = 3.7 + Math.cos(a) * 2.2; box([-w - 1.9, cy - 0.45, cz - 0.45], [-w - 1.0, cy + 0.45, cz + 0.45], 'rope'); }
  if (gear.includes('h')) { box([w + 1.3, 5.0, 3.3], [w + 1.8, 9.5, 3.8], 'hook_metal'); box([w + 1.0, 4.3, 2.4], [w + 2.1, 4.8, 4.7], 'hook_metal'); box([w + 1.0, 4.3, 2.4], [w + 2.1, 5.6, 2.9], 'hook_metal'); box([w + 1.0, 4.3, 4.2], [w + 2.1, 5.6, 4.7], 'hook_metal'); }
  if (gear.includes('k')) {
    // (0.9.0.12) the campfire kit: a bundle of logs strapped under the bag, and the cooking pot
    const LOG = ['campfire_log_end', 'campfire_log_end', 'campfire_log', 'campfire_log', 'campfire_log', 'campfire_log'];
    box([-3.6, -0.5, 2.2], [3.6, 0.5, 3.2], LOG); box([-3.6, -0.5, 3.3], [3.6, 0.5, 4.3], LOG); box([-3.4, 0.45, 2.75], [3.4, 1.45, 3.75], LOG);
    for (const sx of [-2.2, 2.2]) box([sx - 0.35, -0.7, 2.0], [sx + 0.35, 1.6, 4.5], 'pack_strap');
    box([-1.4, 0.2, d + 1.5], [1.4, 2.0, d + 4.0], 'pot_iron'); box([-0.25, 2.0, d + 2.6], [0.25, 2.9, d + 2.9], 'pack_strap');
  }
  for (const sx of [-2.6, 2.6]) box([sx - 0.35, top + 0.3, 2.4], [sx + 0.35, top + 2.2, 4.7], 'pack_strap');
  if (big) for (const yy of [3.2, 8.0]) box([-w - 0.12, yy, 1.95], [w + 0.12, yy + 0.6, d + 0.1], 'pack_iron');   // iron bands
  if (mode === 'worn') {
    for (const sx of [-2.3, 2.3]) {
      box([sx - 0.6, 11.95, -2.3], [sx + 0.6, 12.3, 2.0], 'pack_strap');                      // over the shoulder
      box([sx - 0.6, 3.6, -2.32], [sx + 0.6, 12.3, -2.02], 'pack_strap');                    // down the chest
    }
    box([-3.6, 3.4, -2.36], [3.6, 3.9, -2.06], 'pack_strap');                                 // a waist strap
  } else {
    for (const sx of [-2.3, 2.3]) box([sx - 0.6, 3.0, 1.6], [sx + 0.6, 11.0, 2.0], 'pack_strap');   // the straps, loose
  }
}
function packMesh(gl, key, mode, gear = '') { return item3dMesh(gl, '__pack_' + key + '_' + mode + (gear ? '_' + gear : ''), mb => buildPack3D(mb, key, mode, gear), 'block'); }
{
  const base = itemMesh;
  itemMesh = function (gl, key) {
    if (PACK_LOOK[key]) return packMesh(gl, key, 'item');
    return base(gl, key);
  };
}
