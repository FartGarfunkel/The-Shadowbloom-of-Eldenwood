// ---------------------------------------------------------------------------
// render/sculpt.js — 0.9.0.12 "Solid Things": every item is a chunky 3D thing.
//
// Every item picture is sculpted into a little voxel model: each pixel stands
// as thick as the part of the picture it belongs to is wide, so a handle is a
// square rod, a pickaxe head a solid bar, an apple a round ball, a sword blade
// a flat blade with an edge, a feather or a map stays thin. (The thickness is
// the "local thickness" of the shape: the biggest circle that fits inside it
// around each pixel, rounded off like a pebble and stepped in whole pixels.)
//
// Some things get a real model built from parts, coloured from their own
// picture (so resource packs carry through): potions and bottles, buckets,
// bowls of stew, books and tomes, every piece of armour, and arrows.
//
// Models keep the picture's frame (x, y across -0.5..0.5, depth along z), so
// hands, frames, shelves, drops and ground storage all show them the same way.
// ---------------------------------------------------------------------------

let SCULPT_KIND = 'default', SCULPT_SCALE = 1;
// How big each thing is next to the others (a pickaxe or a sword fills the frame; an apple is smaller,
// a nugget smaller still). Applied to models and sculpts alike, so they keep their sizes in the hand,
// on the ground, in frames and set down.
const ITEM_SIZE = [
  [/^ender_pearl$|^ender_eye$/, 0.5],
  [/chorus_fruit$/, 0.6],
  [/nugget$|seeds$|^cocoa_beans$|^nether_wart_item$|berries$/, 0.55],
  [/^(diamond|emerald|ruby|sapphire|quartz|lapis_lazuli|amethyst_shard|frost_shard|cinderite_shard|aether_crystal|mese_crystal|heart_crystal|turtle_scute|dragon_scale|croc_scale)$/, 0.6],
  [/ball$|^snowball$|^egg$|^cinder_core$|^magma_cream$|^ink_sac$|^glow_ink_sac$|^venom_sac$|^spider_eye$|^fermented_spider_eye$|^ectoplasm$|^gust_puff$|^rabbit_foot$|^shark_tooth$/, 0.6],
  [/^(golden_)?apple$|potato$|^beetroot$|^cookie$|^aechor_petal$/, 0.62],
  [/_dye$|dust$|powder$|^sugar$|^flour$|^bone_meal$|^gunpowder$|^redstone$|^crushed_/, 0.68],
  [/^(coal|charcoal|flint|clay_ball|honeycomb)$/, 0.65],
  [/compass$|^clock$|charm$|^whistle$/, 0.62],
  [/potion_|bottle$|^hex_flask$/, 0.7],
  [/bucket$|^bowl$|_stew$|_soup$/, 0.8],
  [/^book$|^enchanted_book$|^tome_|^written_book$|^writable_book$|^lore_/, 0.8],
  [/^(raw_meat|cooked_meat|beef|cooked_beef|porkchop|cooked_porkchop|mutton|cooked_mutton|venison|cooked_venison|rabbit|cooked_rabbit|chicken|cooked_chicken|rotten_flesh)$/, 0.78],
  [/^(cod|cooked_cod|salmon|cooked_salmon|tropical_fish|pufferfish)$/, 0.82],
  [/carrot$|^bread$|melon_slice$|^pumpkin_pie$|^dried_kelp$|^wheat$/, 0.8],
  [/^(flint_and_steel|spyglass|shears|bone|feather|paper|leather|string)$/, 0.8],
  [/music_disc|^empty_map$|^filled_map$/, 0.85],
];
function itemSize(key) { for (const [re, s] of ITEM_SIZE) if (re.test(key)) return s; return 1; }
// shrink a model already built: round its middle, or (standing things) keeping its foot on the ground
function scaleMB(mb, s, stand, from = 0) {
  if (s === 1) return;
  const f = mb.f;
  for (let v = from; v < mb.vcount; v++) { const o = v * 7; f[o] *= s; f[o + 1] = stand ? -0.5 + (f[o + 1] + 0.5) * s : f[o + 1] * s; f[o + 2] *= s; }
}
// how thick each kind of thing is: [scale, most half-thickness in pixels]
const SCULPT_PROFILE = { round: [1.0, 6], default: [0.8, 3.5], tool: [0.9, 2], blade: [0.55, 1.25], thin: [0.45, 1], flat: [0, 0.5] };
function sculptKind(key, def) {
  if (!def) return 'default';
  if (def.block) return 'thin';                                              // saplings, flowers, doors as items
  if (/paper|map$|^leather$|^pelt$|feather|^string$|_cape$|saddle|name_tag|pattern|^lore_/.test(key)) return 'flat';
  if (/music_disc|compass|clock|charm$|_scale$|^turtle_scute$|minecart|boat$|ship$/.test(key)) return 'thin';
  if (def.tool && def.tool.type === 'sword' || /dagger|blade$/.test(key)) return 'blade';
  if (def.tool || def.staff || /stick|rod$|bone$|^cinder_rod$|spyglass|horn$|whistle|tooth$|shard$/.test(key)) return 'tool';
  if (def.food || /ball$|egg|snowball|pearl|eye|seeds|berries|nugget|dust|powder|diamond|emerald|ruby|sapphire|quartz|crystal|lapis|coal|flint|bone_meal|_dye$|beans|wart|slime|cream|sac$|core$|heart|sugar|flour|crushed_|gunpowder|honeycomb|puff$|petal|ectoplasm/.test(key)) return 'round';
  return 'default';
}

// ---- reading a picture ---------------------------------------------------------------------------------
function spriteInfo(tile) {
  const R = ATLAS.res[tile] || 16, st = TILE / R, tx = (tile % ATLAS_TILES) * TILE, ty = Math.floor(tile / ATLAS_TILES) * TILE;
  const P = ATLAS.pixels.data, W = ATLAS_SIZE, uv = tileUV(tile), px = [];
  const du = (uv[2] - uv[0]) / R, dv = (uv[3] - uv[1]) / R;
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    const o = ((ty + j * st) * W + tx + i * st) * 4;
    if (P[o + 3] < 128) continue;
    const r = P[o], g = P[o + 1], b = P[o + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    px.push({ i, j, r, g, b, lum: 0.3 * r + 0.59 * g + 0.11 * b, sat: mx ? (mx - mn) / mx : 0, u: uv[0] + (i + 0.5) * du, v: uv[1] + (j + 0.5) * dv });
  }
  const grid = new Uint8Array(R * R); for (const p of px) grid[p.j * R + p.i] = 1;
  return { R, px, uv, grid };
}
// (0.9.0.12) While a model is built from a picture, its front and back faces show that picture itself
// (your resource pack's), wherever the part lies over the drawn pixels; elsewhere a part takes its colour.
let MODEL_PROJ = null;
// (0.9.0.15) The item's picture as a skin for its 3D model: every face of every part shows the picture as if
// laid over the model from the front, so the model wears your resource pack's art (its colours, shading and
// detail) all over, sides included. The picture is first filled out past its edges, and its dark outline
// (a flat picture's trick, which a real 3D shape doesn't need) is replaced, so parts that reach a little
// past the drawing still carry it on.
let MODEL_FILL = null;
const FILL_TILES = new Map();
function modelFill(gl, info) {
  if (!info || !info.px.length) return null;
  const key = info.uv.join(',');
  const have = FILL_TILES.get(key); if (have && have.src === ATLAS.pixels) return have;
  if (ATLAS.count >= ATLAS_TILES * ATLAS_TILES) return null;
  const R = info.R;
  let lo = 255, hi = 0; for (const p of info.px) { lo = Math.min(lo, p.lum); hi = Math.max(hi, p.lum); }
  const edge = lo + (hi - lo) * 0.14, body = info.px.filter(p => p.lum >= edge);
  const src = body.length ? body : info.px;
  // spread the colours outward, nearest first
  const col = new Int32Array(R * R).fill(-1), q = [];
  for (const p of src) { const k = p.j * R + p.i; col[k] = (p.r << 16) | (p.g << 8) | p.b; q.push(k); }
  for (let h = 0; h < q.length; h++) {
    const k = q[h], i = k % R, j = (k / R) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= R || jj >= R) continue; const n = jj * R + ii; if (col[n] < 0) { col[n] = col[k]; q.push(n); } }
  }
  const idx = ATLAS.count++, st = TILE / R, img = new ImageData(TILE, TILE), d = img.data;
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const c = col[Math.min(R - 1, (y / st) | 0) * R + Math.min(R - 1, (x / st) | 0)], o = (y * TILE + x) * 4;
    d[o] = (c >> 16) & 255; d[o + 1] = (c >> 8) & 255; d[o + 2] = c & 255; d[o + 3] = 255;
  }
  const tx = (idx % ATLAS_TILES) * TILE, ty = Math.floor(idx / ATLAS_TILES) * TILE;
  ATLAS.ctx.putImageData(img, tx, ty); ATLAS.res[idx] = R;
  if (gl && ATLAS.glTex) { gl.bindTexture(gl.TEXTURE_2D, ATLAS.glTex); gl.texSubImage2D(gl.TEXTURE_2D, 0, tx, ty, TILE, TILE, gl.RGBA, gl.UNSIGNED_BYTE, d); }
  const out = { src: ATLAS.pixels, uv: tileUV(idx), R };
  FILL_TILES.set(key, out);
  return out;
}
function fillUV(x, y) { const F = MODEL_FILL, uv = F.uv, e = 0.5 / F.R; return [uv[0] + clamp(x + 0.5, e, 1 - e) * (uv[2] - uv[0]), uv[1] + clamp(0.5 - y, e, 1 - e) * (uv[3] - uv[1])]; }
function projOK(x, y) { const I = MODEL_PROJ, i = Math.floor((x + 0.5) * I.R), j = Math.floor((0.5 - y) * I.R); return i >= 0 && j >= 0 && i < I.R && j < I.R && I.grid[j * I.R + i] === 1; }
function projUV(x, y) { const uv = MODEL_PROJ.uv; return [uv[0] + clamp(x + 0.5, 0.001, 0.999) * (uv[2] - uv[0]), uv[1] + clamp(0.5 - y, 0.001, 0.999) * (uv[3] - uv[1])]; }
// the colour most of a picture is (among the pixels that pass `ok`)
function spriteCommon(info, ok = () => true) {
  const n = new Map(); let best = null, bn = 0;
  for (const p of info.px) {
    if (!ok(p)) continue;
    const k = (p.r >> 4) << 8 | (p.g >> 4) << 4 | (p.b >> 4), c = (n.get(k) || 0) + 1;
    n.set(k, c); if (c > bn) { bn = c; best = p; }
  }
  return best;
}
function spriteBest(info, score, ok = () => true) { let best = null, bs = -1e9; for (const p of info.px) { if (!ok(p)) continue; const s = score(p); if (s > bs) { bs = s; best = p; } } return best; }
// a spot of colour from a named picture (for parts that don't come from the item's own)
function tileSpot(name, i = 6, j = 6) { const t = ATLAS.tile[name] ?? 0, uv = tileUV(t), R = ATLAS.res[t] || 16; return { u: uv[0] + (i + 0.5) / 16 * (uv[2] - uv[0]), v: uv[1] + (j + 0.5) / 16 * (uv[3] - uv[1]) }; }
const shadeOf = (P, k) => P ? Object.assign({}, P, { k }) : P;

// ---- the sculpt ------------------------------------------------------------------------------------------
extrudeTile = function (mb, tile) {
  const uv = tileUV(tile);
  const tx = (tile % ATLAS_TILES) * TILE, ty = Math.floor(tile / ATLAS_TILES) * TILE;
  const P = ATLAS.pixels.data, W = ATLAS_SIZE, R = ATLAS.res[tile] || 16, st = TILE / R;
  const A = (i, j) => (i < 0 || j < 0 || i >= R || j >= R) ? false : P[((ty + j * st) * W + tx + i * st) * 4 + 3] >= 128;
  const [scale, cap] = SCULPT_PROFILE[SCULPT_KIND] || SCULPT_PROFILE.default;
  const packFlat = SCULPT_KIND === 'pack';
  // distance from each pixel to the nearest clear one (or the picture's edge)
  const RAD = 9, dist = new Float32Array(R * R), rad = new Float32Array(R * R), loc = new Float32Array(R * R);
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    if (!A(i, j)) continue;
    let best = RAD;
    for (let dj = -RAD; dj <= RAD; dj++) for (let di = -RAD; di <= RAD; di++) {
      const d = Math.hypot(di, dj); if (d >= best || (!di && !dj)) continue;
      if (!A(i + di, j + dj)) best = d;
    }
    dist[j * R + i] = best; rad[j * R + i] = Math.max(0.65, best - 0.35);
  }
  // local thickness: the biggest circle inside the shape that covers each pixel
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    const r = rad[j * R + i]; if (!r) continue;
    const e = Math.ceil(r + 0.5);
    for (let dj = -e; dj <= e; dj++) for (let di = -e; di <= e; di++) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= R || jj >= R || !rad[jj * R + ii] || Math.hypot(di, dj) > r + 0.5) continue;
      if (loc[jj * R + ii] < r) loc[jj * R + ii] = r;
    }
  }
  // half the thickness of each pixel, rounded like a pebble and stepped in half pixels
  const H = new Float32Array(R * R);
  let deepest = 0;
  for (let k = 0; k < R * R; k++) {
    if (!rad[k]) continue;
    const L = loc[k], r = rad[k];
    let h = scale ? Math.sqrt(Math.max(0, L * L - (L - r) * (L - r))) * scale : 0.5;
    h = Math.round(clamp(h, 0.5, cap) * 2) / 2;
    H[k] = packFlat ? 1 / 16 : h / R; deepest = Math.max(deepest, H[k]);   // a pack's picture: one even thickness, so it looks just like the pack's item
  }
  SCULPT_DEPTH = deepest;
  const half = (i, j) => (i < 0 || j < 0 || i >= R || j >= R) ? 0 : H[j * R + i];
  const px = 1 / R, du = (uv[2] - uv[0]) / R, dv = (uv[3] - uv[1]) / R, v0 = mb.vcount;
  const f = (a, b, c, e, sh) => { const vs = [a, b, c, e].map(q => mb.vert(q[0], q[1], q[2], q[3], q[4], 255, 0, sh)); mb.quad(vs[0], vs[1], vs[2], vs[3], false); };
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    const h = half(i, j); if (!h) continue;
    const x0 = -0.5 + i * px, x1 = x0 + px, y1 = 0.5 - j * px, y0 = y1 - px;
    const u0 = uv[0] + i * du, u1 = u0 + du, v0 = uv[1] + j * dv, v1 = v0 + dv, uc = (u0 + u1) / 2, vc = (v0 + v1) / 2;
    f([x0, y0, h, u0, v1], [x1, y0, h, u1, v1], [x1, y1, h, u1, v0], [x0, y1, h, u0, v0], 255);
    f([x1, y0, -h, u1, v1], [x0, y0, -h, u0, v1], [x0, y1, -h, u0, v0], [x1, y1, -h, u1, v0], 200);
    // the sides wherever the neighbour is thinner: the steps show, like a carved thing
    const L = half(i - 1, j), Rr = half(i + 1, j), T = half(i, j - 1), Bm = half(i, j + 1);
    if (L < h) { f([x0, y0, -h, uc, vc], [x0, y0, -L, uc, vc], [x0, y1, -L, uc, vc], [x0, y1, -h, uc, vc], 175); f([x0, y0, L, uc, vc], [x0, y0, h, uc, vc], [x0, y1, h, uc, vc], [x0, y1, L, uc, vc], 175); }
    if (Rr < h) { f([x1, y0, h, uc, vc], [x1, y0, Rr, uc, vc], [x1, y1, Rr, uc, vc], [x1, y1, h, uc, vc], 190); f([x1, y0, -Rr, uc, vc], [x1, y0, -h, uc, vc], [x1, y1, -h, uc, vc], [x1, y1, -Rr, uc, vc], 190); }
    if (T < h) { f([x0, y1, h, uc, vc], [x1, y1, h, uc, vc], [x1, y1, T, uc, vc], [x0, y1, T, uc, vc], 238); f([x0, y1, -T, uc, vc], [x1, y1, -T, uc, vc], [x1, y1, -h, uc, vc], [x0, y1, -h, uc, vc], 238); }
    if (Bm < h) { f([x1, y0, h, uc, vc], [x0, y0, h, uc, vc], [x0, y0, Bm, uc, vc], [x1, y0, Bm, uc, vc], 140); f([x1, y0, -Bm, uc, vc], [x0, y0, -Bm, uc, vc], [x0, y0, -h, uc, vc], [x1, y0, -h, uc, vc], 140); }
  }
  scaleMB(mb, SCULPT_SCALE, false, v0); SCULPT_DEPTH *= SCULPT_SCALE;
};
let SCULPT_DEPTH = 0;

// ---- building with flat colours ----------------------------------------------------------------------------
// A box coloured with one spot of a picture; faces shaded like a lit model (top bright, underside dark).
const CB_SHADE = [0.84, 0.8, 1.0, 0.58, 0.96, 0.74];
function cbox(mb, x0, y0, z0, x1, y1, z1, P, open) {
  if (!P) return;
  const k = P.k || 1;
  // the picture on the front and back, if this box lies over it
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, sx = (x1 - x0) / 2 * 0.85, sy = (y1 - y0) / 2 * 0.85;
  const proj = MODEL_PROJ && projOK(cx, cy) && projOK(cx - sx, cy - sy) && projOK(cx + sx, cy - sy) && projOK(cx + sx, cy + sy) && projOK(cx - sx, cy + sy);
  for (let f = 0; f < 6; f++) {
    if (open && open.indexOf(f) >= 0) continue;
    const F = FACES[f], s = Math.round(Math.min(1, CB_SHADE[f] * k) * 255), pj = proj && f >= 4;
    const vs = F.c.map(c => {
      const X = c[0] ? x1 : x0, Y = c[1] ? y1 : y0;
      const t = MODEL_FILL ? fillUV(X, Y) : pj ? projUV(cx + (X - cx) * 0.85, cy + (Y - cy) * 0.85) : null;
      return mb.vert(X, Y, c[2] ? z1 : z0, t ? t[0] : P.u, t ? t[1] : P.v, 255, 0, pj && !MODEL_FILL ? Math.max(s, 236) : s);
    });
    mb.quad(vs[0], vs[1], vs[2], vs[3], false);
  }
}
// a round layer (an octagon made of two crossed boxes) centred on the y axis
function cring(mb, y0, y1, r, P, open) { cbox(mb, -r, y0, -r * 0.62, r, y1, r * 0.62, P, open); cbox(mb, -r * 0.62, y0, -r, r * 0.62, y1, r, P, open); }
// a hollow ring: four walls of thickness t
function cwall(mb, y0, y1, r, t, P) {
  cbox(mb, -r, y0, -r * 0.62, -r + t, y1, r * 0.62, P); cbox(mb, r - t, y0, -r * 0.62, r, y1, r * 0.62, P);
  cbox(mb, -r * 0.62, y0, -r, r * 0.62, y1, -r + t, P); cbox(mb, -r * 0.62, y0, r - t, r * 0.62, y1, r, P);
}

// ---- the models -----------------------------------------------------------------------------------------------
const M3D = {
  // a flask: round belly, shoulder, neck, lip and cork. The liquid is the picture's brightest colour.
  potion(mb, info, key) {
    const liquidP = spriteBest(info, p => p.sat * 2 + p.lum / 400, p => p.sat > 0.25);
    const glassP = spriteBest(info, p => p.lum, p => p.lum > 120) || spriteCommon(info);
    const corkP = spriteBest(info, p => -Math.abs(p.r - 150) - Math.abs(p.g - 105) - Math.abs(p.b - 60), p => p.r > p.b + 30) || tileSpot('stripped_oak_log_side');
    const empty = key === 'glass_bottle' || /water$/.test(key) && false;
    const liq = empty ? shadeOf(glassP, 0.9) : liquidP || glassP, glass = shadeOf(glassP, 1.05);
    const splash = key.startsWith('splash_');
    cring(mb, -0.5, -0.44, 0.2, liq);
    cring(mb, -0.44, -0.12, 0.29, liq);
    cring(mb, -0.12, -0.02, 0.23, key === 'glass_bottle' ? glass : liq);
    cring(mb, -0.02, 0.06, 0.15, glass);
    cring(mb, 0.06, splash ? 0.22 : 0.3, 0.085, glass);
    cring(mb, splash ? 0.2 : 0.28, splash ? 0.26 : 0.34, splash ? 0.13 : 0.115, glass);
    cring(mb, splash ? 0.24 : 0.32, splash ? 0.34 : 0.44, 0.07, corkP && corkP.u !== undefined ? corkP : tileSpot('stripped_oak_log_side'));
    cbox(mb, -0.2, -0.3, 0.29, -0.12, -0.1, 0.305, glass);                                       // a glint on the glass
    return { stand: true, depth: 0.3 };
  },
  // a bucket: tapered and banded, its handle up over the top, whatever's in it filling it to the brim
  bucket(mb, info, key) {
    const metalP = spriteCommon(info, p => p.sat < 0.28 && p.lum > 60) || spriteCommon(info);
    const darkP = spriteBest(info, p => -p.lum, p => p.sat < 0.3 && p.lum > 25) || metalP;
    const content = key === 'bucket' ? shadeOf(darkP, 0.7)
      : key === 'milk_bucket' ? spriteBest(info, p => p.lum, p => p.sat < 0.15) : spriteBest(info, p => p.sat + p.lum / 600, p => p.sat > 0.3) || metalP;
    for (let k = 0; k < 6; k++) cring(mb, -0.5 + k * 0.09, -0.5 + (k + 1) * 0.09, 0.24 + k * 0.022, k === 1 || k === 4 ? shadeOf(darkP, 1.1) : metalP);
    cwall(mb, 0.04, 0.12, 0.37, 0.05, metalP);
    cring(mb, 0.035, 0.08, 0.33, content, [3]);
    // the handle: up from the rim at both sides and over the top
    cbox(mb, -0.4, 0.04, -0.025, -0.36, 0.3, 0.025, darkP); cbox(mb, 0.36, 0.04, -0.025, 0.4, 0.3, 0.025, darkP);
    cbox(mb, -0.4, 0.3, -0.025, 0.4, 0.34, 0.025, darkP);
    return { stand: true, depth: 0.37 };
  },
  // a bowl: a round wooden bowl on a foot, the stew in it
  bowl(mb, info, key) {
    const woodP = spriteCommon(info, p => p.r > p.b + 15 && p.lum > 40) || spriteCommon(info);
    const darkW = spriteBest(info, p => -p.lum, p => p.r > p.b && p.lum > 20) || woodP;
    const stew = key === 'bowl' ? shadeOf(darkW, 0.8) : spriteBest(info, p => Math.abs(p.r - woodP.r) + Math.abs(p.g - woodP.g) + Math.abs(p.b - woodP.b), p => p.j < info.R * 0.55) || woodP;
    cring(mb, -0.5, -0.44, 0.17, darkW);
    cring(mb, -0.44, -0.34, 0.27, woodP);
    cring(mb, -0.34, -0.22, 0.36, woodP);
    cwall(mb, -0.22, -0.1, 0.42, 0.05, woodP);
    cring(mb, -0.22, -0.13, 0.38, stew, [3]);
    if (key !== 'bowl') { const lump = spriteBest(info, p => p.lum, p => p.j < info.R * 0.6) || stew; cbox(mb, -0.12, -0.13, -0.05, 0.02, -0.09, 0.08, lump); cbox(mb, 0.08, -0.13, -0.14, 0.18, -0.1, -0.04, lump); }
    return { stand: true, depth: 0.42 };
  },
  // a closed book: two boards, a spine, the block of pages, and a mark on the front
  book(mb, info, key) {
    const coverP = spriteCommon(info, p => p.lum > 35 && p.lum < 200) || spriteCommon(info);
    const pageP = spriteBest(info, p => p.lum - p.sat * 120, p => p.lum > 150) || tileSpot('white_wool');
    const markP = spriteBest(info, p => p.sat * 255 + p.lum / 3, p => Math.abs(p.r - coverP.r) + Math.abs(p.g - coverP.g) + Math.abs(p.b - coverP.b) > 90) || shadeOf(coverP, 1.2);
    const W = 0.3, Hh = 0.4, D = 0.11;
    cbox(mb, -W, -Hh, D - 0.035, W + 0.02, Hh, D, coverP);                    // the front board
    cbox(mb, -W, -Hh, -D, W + 0.02, Hh, -D + 0.035, coverP);                  // the back board
    cbox(mb, -W - 0.03, -Hh, -D, -W + 0.01, Hh, D, shadeOf(coverP, 0.9));     // the spine
    cbox(mb, -W + 0.01, -Hh + 0.03, -D + 0.035, W, Hh - 0.03, D - 0.035, pageP);   // the pages
    cbox(mb, -0.12, 0.02, D, 0.14, 0.24, D + 0.02, markP);                    // a mark on the cover
    cbox(mb, -W - 0.035, 0.2, -D - 0.005, -W + 0.015, 0.25, D + 0.005, markP); cbox(mb, -W - 0.035, -0.25, -D - 0.005, -W + 0.015, -0.2, D + 0.005, markP);   // bands on the spine
    return { depth: D + 0.02 };
  },
  // armour: the piece itself, as it's worn, in its own colours
  armor(mb, info, key, def) {
    const main = spriteCommon(info, p => p.lum > 30 && p.lum < 235) || spriteCommon(info);
    const dark = spriteBest(info, p => -p.lum, p => p.lum > 22) || main, light = spriteBest(info, p => p.lum) || main;
    const trim = spriteBest(info, p => p.sat * 255, p => Math.abs(p.r - main.r) + Math.abs(p.g - main.g) + Math.abs(p.b - main.b) > 80 && p.sat > 0.35);
    const slot = def.armor.slot;
    if (slot === 0) {                                     // helmet: a dome with cheek guards, open at the face
      cbox(mb, -0.33, 0.05, -0.33, 0.33, 0.26, 0.33, main);
      cbox(mb, -0.27, 0.26, -0.27, 0.27, 0.33, 0.27, shadeOf(light, 0.95));
      cbox(mb, -0.33, -0.28, -0.33, -0.25, 0.05, 0.33, main); cbox(mb, 0.25, -0.28, -0.33, 0.33, 0.05, 0.33, main);
      cbox(mb, -0.25, -0.28, -0.33, 0.25, 0.05, -0.25, main);
      cbox(mb, -0.28, 0.0, 0.3, 0.28, 0.08, 0.35, trim || dark);
      cbox(mb, -0.25, -0.2, 0.26, -0.13, 0.0, 0.33, main); cbox(mb, 0.13, -0.2, 0.26, 0.25, 0.0, 0.33, main);
      if (trim) cbox(mb, -0.03, 0.26, -0.3, 0.03, 0.38, 0.3, trim);              // a crest
      return { depth: 0.36 };
    }
    if (slot === 1) {                                     // chestplate: the body, the shoulders, a belt
      cbox(mb, -0.28, -0.42, -0.15, 0.28, 0.28, 0.15, main);
      cbox(mb, -0.46, 0.04, -0.17, -0.28, 0.3, 0.17, shadeOf(light, 0.95)); cbox(mb, 0.28, 0.04, -0.17, 0.46, 0.3, 0.17, shadeOf(light, 0.95));
      cbox(mb, -0.44, -0.12, -0.14, -0.3, 0.04, 0.14, main); cbox(mb, 0.3, -0.12, -0.14, 0.44, 0.04, 0.14, main);
      cbox(mb, -0.1, 0.2, 0.15, 0.1, 0.28, 0.17, dark);                                         // the neck
      cbox(mb, -0.29, -0.34, -0.16, 0.29, -0.27, 0.16, trim || dark);                           // the belt
      cbox(mb, -0.02, -0.25, 0.15, 0.02, 0.18, 0.165, shadeOf(dark, 1.15));                    // down the middle
      return { depth: 0.17 };
    }
    if (slot === 2) {                                     // leggings: a waistband and two legs
      cbox(mb, -0.3, 0.2, -0.15, 0.3, 0.36, 0.15, main);
      cbox(mb, -0.31, 0.24, -0.16, 0.31, 0.3, 0.16, trim || dark);
      cbox(mb, -0.3, -0.48, -0.14, -0.03, 0.2, 0.14, main); cbox(mb, 0.03, -0.48, -0.14, 0.3, 0.2, 0.14, main);
      cbox(mb, -0.31, -0.2, -0.15, -0.02, -0.12, 0.15, shadeOf(dark, 1.1)); cbox(mb, 0.02, -0.2, -0.15, 0.31, -0.12, 0.15, shadeOf(dark, 1.1));
      return { depth: 0.16 };
    }
    // boots: a pair, toes toward you
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -0.38 : 0.06, x1 = s < 0 ? -0.06 : 0.38;
      cbox(mb, x0, -0.2, -0.13, x1, 0.18, 0.11, main);
      cbox(mb, x0, -0.4, -0.13, x1, -0.2, 0.3, main);
      cbox(mb, x0 - 0.01, -0.46, -0.14, x1 + 0.01, -0.4, 0.31, dark);
      cbox(mb, x0 - 0.01, 0.12, -0.14, x1 + 0.01, 0.2, 0.12, trim || light);
    }
    return { depth: 0.31 };
  },
  // an arrow: a shaft with a head and fletching, along the picture's diagonal
  arrow(mb, info) {
    const d = [0.7071, 0.7071], at = (u) => [-0.48 + d[0] * u * 1.36, -0.48 + d[1] * u * 1.36, 0];
    const shaft = spriteCommon(info, p => p.r > p.b + 20) || tileSpot('stripped_oak_log_side');
    const head = spriteBest(info, p => -p.sat * 200 + p.lum / 2, p => p.i + p.j < info.R * 0.7) || tileSpot('iron_block');
    const fl = spriteBest(info, p => p.lum, p => p.i + p.j > info.R * 1.3) || tileSpot('white_wool');
    const seg = (a, b, w, dd, P) => { const t = ATLAS.tile.white_wool ?? 0; partSegSpot(mb, a, b, w, dd, P); };
    seg(at(0.02), at(0.8), 0.045, 0.045, shaft);
    seg(at(0.78), at(0.93), 0.1, 0.04, head); seg(at(0.93), at(1.0), 0.05, 0.03, head);
    seg(at(0.03), at(0.2), 0.12, 0.012, fl); seg(at(0.03), at(0.2), 0.012, 0.12, fl);
    return { depth: 0.06 };
  },
};
// partSeg in one flat colour
function partSegSpot(mb, a, b, w, d, P) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L * w / 2, ny = dx / L * w / 2, z0 = (a[2] || 0) - d / 2, z1 = (a[2] || 0) + d / 2;
  const c = [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny], [b[0] + nx, b[1] + ny], [a[0] + nx, a[1] + ny]];
  const k = P.k || 1;
  const q = (p, s) => { const vs = p.map(([x, y, z]) => { const t = MODEL_FILL ? fillUV(x, y) : null; return mb.vert(x, y, z, t ? t[0] : P.u, t ? t[1] : P.v, 255, 0, Math.round(Math.min(255, s * k))); }); mb.quad(vs[0], vs[1], vs[2], vs[3], false); };
  // the front and back show the picture under them (drawn a little narrower than the part, so it never runs off the pixels)
  let T = null;
  if (MODEL_PROJ && !MODEL_FILL) {
    const ax = a[0] + dx * 0.04, ay = a[1] + dy * 0.04, bx = b[0] - dx * 0.04, by = b[1] - dy * 0.04, mx = nx * 0.45, my = ny * 0.45;
    const sc = [[ax - mx, ay - my], [bx - mx, by - my], [bx + mx, by + my], [ax + mx, ay + my]];
    if (sc.every(([x, y]) => projOK(x, y)) && projOK((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) T = sc.map(([x, y]) => projUV(x, y));
  }
  const qp = (p, idx, s) => { const vs = p.map(([x, y, z], n) => mb.vert(x, y, z, T[idx[n]][0], T[idx[n]][1], 255, 0, Math.round(Math.min(255, s * Math.max(k, 0.95))))); mb.quad(vs[0], vs[1], vs[2], vs[3], false); };
  if (T) { qp([[...c[0], z1], [...c[1], z1], [...c[2], z1], [...c[3], z1]], [0, 1, 2, 3], 250); qp([[...c[1], z0], [...c[0], z0], [...c[3], z0], [...c[2], z0]], [1, 0, 3, 2], 205); }
  else {
  q([[...c[0], z1], [...c[1], z1], [...c[2], z1], [...c[3], z1]], 250);
  q([[...c[1], z0], [...c[0], z0], [...c[3], z0], [...c[2], z0]], 195);
  }
  q([[...c[0], z0], [...c[1], z0], [...c[1], z1], [...c[0], z1]], 165);
  q([[...c[2], z0], [...c[3], z0], [...c[3], z1], [...c[2], z1]], 235);
  q([[...c[3], z0], [...c[0], z0], [...c[0], z1], [...c[3], z1]], 185);
  q([[...c[1], z0], [...c[2], z0], [...c[2], z1], [...c[1], z1]], 185);
}
// (0.9.0.15) an item whose picture comes from the resource pack is drawn as that picture, given an even
// thickness (the way Minecraft does it, a little thicker): built shapes can't match every pack's art
function packedItem(def) { return !!(def && !def.block && ATLAS.packed && ATLAS.packed.has(ATLAS.tile[def.icon])); }
function modelKind(key, def) {
  if (!def || def.block) return null;
  if (/^(splash_)?potion_|^glass_bottle$|^honey_bottle$|^experience_bottle$|^hex_flask$/.test(key)) return 'potion';
  if (/bucket$/.test(key)) return 'bucket';
  if (/^bowl$|_stew$|_soup$/.test(key)) return 'bowl';
  if (/^book$|^enchanted_book$|^written_book$|^writable_book$|^tome_/.test(key)) return 'book';
  if (def.armor && def.armor.slot >= 0 && def.armor.slot <= 3 && !def.cape) return 'armor';
  if (key === 'arrow') return 'arrow';
  return null;
}
{
  const base = itemMesh;
  itemMesh = function (gl, key) {
    if (ITEM_MESHES[key]) return ITEM_MESHES[key];
    const def = itemDef(key), mk = modelKind(key, def);
    if (mk && ATLAS.pixels) {
      const info = spriteInfo(ATLAS.tile[def.icon] ?? 0), mb = new MeshBuilder(1024);
      MODEL_PROJ = info.px.length ? info : null; MODEL_FILL = modelFill(gl, info);
      let extra; try { extra = M3D[mk](mb, info, key, def) || {}; } finally { MODEL_PROJ = null; MODEL_FILL = null; }
      const sz = itemSize(key);
      scaleMB(mb, sz, !!extra.stand); if (extra.depth) extra.depth *= sz;
      const r = mb.result();
      return (ITEM_MESHES[key] = Object.assign({ mesh: makeVAO(gl, r.verts, r.idx), kind: 'flat', model3d: mk }, extra));
    }
    SCULPT_KIND = sculptKind(key, def); SCULPT_DEPTH = 0; SCULPT_SCALE = def && !def.block ? itemSize(key) : 1;
    const out = base(gl, key);
    if (out && out.kind === 'flat' && out.depth === undefined) out.depth = SCULPT_DEPTH || 0.04;
    SCULPT_KIND = 'default'; SCULPT_SCALE = 1;
    return out;
  };
}
