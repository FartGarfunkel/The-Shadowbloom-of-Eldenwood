// ---------------------------------------------------------------------------
// render/gear3d.js — (alpha 2) heroes and townsfolk in the round, the Hytale way.
//
// A skin is flat: hair painted on a cube, a robe painted down the legs. Over it every hero and every townsperson now
// wears real shapes: hair with volume (a fringe, a ponytail, braids, a crest, curls), beards that hang (a wizard's to
// below the belt), pointed ears, horns, tusks and tails, hoods and hats, robes whose skirts swing with the legs, bell
// sleeves, tabards, fur collars, sashes, pouches and cloaks that stream out behind. Worn armour grows pauldrons, a
// crest, a gorget, tassets, knee cops and cuffs over its shell, and a hero may keep their helmet off their head.
//
// The look travels inside the skin itself (a corner of the 64x64 picture that nothing is cut from), so it goes
// wherever the skin goes: saved with your hero, sent to the other players, painted onto the townsfolk.
//
// The shapes are painted with the pictures the game is using: cloth is the wool picture dyed, gold the gold block,
// leaves the leaves, and the armour's pieces are cut from the armour's own picture. With a resource pack installed
// (GeruDoku) those are the pack's pictures, so the 3D gear wears the pack's art.
// ---------------------------------------------------------------------------

const GEAR_SPECIES = ['human', 'elf', 'dwarf', 'halfling', 'gnome', 'dragonborn', 'orc', 'tiefling', 'goliath'];
const GEAR_HAIRS = ['bald', 'short', 'crop', 'long', 'tail', 'braids', 'mohawk', 'bun', 'curly', 'sides', 'wild'];
const GEAR_BEARDS = ['none', 'stubble', 'short', 'long', 'braided', 'moustache', 'wizard', 'forked'];
const GEAR_HORNS = ['none', 'curled', 'ram', 'straight', 'small'];
const GEAR_EARS = ['round', 'pointed', 'long'];
const GEAR_OUTFITS = ['gambeson', 'furs', 'doublet', 'vestments', 'leafrobe', 'wraps', 'surcoat', 'ranger', 'shadow', 'silks', 'pact', 'archrobe', 'traveller', 'noble', 'peasant'];
const GEAR_HATS = ['none', 'wizard', 'feather', 'circlet', 'crown', 'straw', 'cap', 'bucket', 'chef'];
const GEAR_ROBES = new Set(['archrobe', 'pact', 'silks', 'vestments', 'leafrobe']);
const GEAR_AT = [56, 16];        // x, y of the spare corner: two rows of eight pixels
const GEAR_PX = 15;              // pixels used (43 bytes)

// ---- the look, in the skin's spare pixels ---------------------------------------------------------------------------
function gearBytes(L) {
  const ix = (list, v) => Math.max(0, list.indexOf(v));
  const C = (c, d) => {
    let v = c == null ? d : typeof c === 'string' ? hexRGB(c) : c;
    if (!v || v.length < 3) v = d || [128, 128, 128];
    return [0, 1, 2].map(i => Math.max(0, Math.min(255, Math.round(v[i]))));
  };
  const out = GEAR_OUTFITS.indexOf(L.outfit);
  const cols = L.cols || (typeof LOOK_OUTFITS !== 'undefined' && LOOK_OUTFITS[L.outfit] && LOOK_OUTFITS[L.outfit].cols) || ['#7a6a4a', '#5a7a5a', '#4a4a3a', '#3a2414'];
  const hood = !!(L.hood || L.hat === 'hood');
  const f1 = (hood ? 1 : 0) | (L.cloak ? 2 : 0) | (L.tusks ? 4 : 0) | (L.snout ? 8 : 0) | (L.tail ? 16 : 0) | (L.scales ? 32 : 0) | (L.nose ? 64 : 0) | (L.body === 'slim' ? 128 : 0);
  const f2 = (L.robe ? 1 : 0) | (L.apron ? 2 : 0) | (L.tabard ? 4 : 0) | (L.helm === 'hide' ? 8 : 0) | (L.feather ? 16 : 0) | (L.elder ? 32 : 0);
  const b = [71, 82, 1, ix(GEAR_SPECIES, L.species), ix(GEAR_HAIRS, L.hair), ix(GEAR_BEARDS, L.beard), ix(GEAR_HORNS, L.horns), ix(GEAR_EARS, L.ears),
    out < 0 ? 255 : out, hood ? 0 : ix(GEAR_HATS, L.hat), f1, f2];
  for (const c of [C(L.hairCol, [80, 50, 30]), C(L.beardCol || L.hairCol, [80, 50, 30]), C(L.hornCol, [70, 60, 50]), C(L.skin, [220, 180, 140]),
    C(cols[0]), C(cols[1]), C(cols[2]), C(cols[3]), C(L.extra || cols[1]), C(L.hatCol || cols[0])]) b.push(...c);
  let s = 0; for (const v of b) s = (s + v) & 255; b.push(s);
  return b;
}
function gearWrite(cv, L) {
  try {
    const g = cv.getContext('2d'), b = gearBytes(L);
    for (let i = 0; i < GEAR_PX; i++) {
      g.fillStyle = `rgb(${b[i * 3] | 0},${b[i * 3 + 1] | 0},${b[i * 3 + 2] | 0})`;
      g.fillRect(GEAR_AT[0] + (i % 8), GEAR_AT[1] + (i >> 3), 1, 1);
    }
  } catch (e) { /* a skin without a look is still a skin */ }
  return cv;
}
function gearRead(px) {
  if (!px || px.length < 64 * 64 * 4) return null;
  const b = [];
  for (let i = 0; i < GEAR_PX; i++) {
    const o = ((GEAR_AT[1] + (i >> 3)) * 64 + GEAR_AT[0] + (i % 8)) * 4;
    if (px[o + 3] !== 255) return null;
    b.push(px[o], px[o + 1], px[o + 2]);
  }
  if (b[0] !== 71 || b[1] !== 82 || b[2] !== 1) return null;
  let s = 0; for (let i = 0; i < 42; i++) s = (s + b[i]) & 255;
  if (s !== b[42]) return null;
  const C = (i) => [b[i], b[i + 1], b[i + 2]], f1 = b[10], f2 = b[11], outfit = b[8] === 255 ? null : GEAR_OUTFITS[b[8]] || null;
  return {
    species: GEAR_SPECIES[b[3]] || 'human', hair: GEAR_HAIRS[b[4]] || 'bald', beard: GEAR_BEARDS[b[5]] || 'none', horns: GEAR_HORNS[b[6]] || 'none', ears: GEAR_EARS[b[7]] || 'round',
    outfit, hat: GEAR_HATS[b[9]] || 'none', hood: !!(f1 & 1), cloak: !!(f1 & 2), tusks: !!(f1 & 4), snout: !!(f1 & 8), tail: !!(f1 & 16), scales: !!(f1 & 32), nose: !!(f1 & 64), slim: !!(f1 & 128),
    robe: !!(f2 & 1) || GEAR_ROBES.has(outfit), apron: !!(f2 & 2), tabard: !!(f2 & 4), helmHide: !!(f2 & 8), feather: !!(f2 & 16), elder: !!(f2 & 32),
    hairCol: C(12), beardCol: C(15), hornCol: C(18), skin: C(21), cols: [C(24), C(27), C(30), C(33)], extra: C(36), hatCol: C(39),
    shape: b.slice(3, 12).join(','), code: b.slice(0, 42).join(','),
  };
}
// the look a loaded skin carries (worked out once)
function gearLookOf(skin) {
  if (!skin) return null;
  if (skin._gear === undefined) skin._gear = skin.px && !skin.legacy ? gearRead(skin.px) : null;
  return skin._gear;
}
// the same from a picture (the menus' figure)
function gearLookOfURL(url, cb) {
  if (!url) return cb(null);
  const img = new Image();
  img.onload = () => {
    try {
      if (img.width !== img.height) return cb(null);
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, 64, 64);
      cb(gearRead(g.getImageData(0, 0, 64, 64).data));
    } catch (e) { cb(null); }
  };
  img.onerror = () => cb(null);
  img.src = url;
}

// every painted hero skin carries its look
{
  const basePaint = dndPaintSkin;
  dndPaintSkin = function (look) {
    // the flat picture paints a wizard's or a forked beard as a long one; the 3D beard is the real thing
    const cv = basePaint(look.beard === 'wizard' || look.beard === 'forked' ? Object.assign({}, look, { beard: 'long' }) : look);
    try { gearWrite(cv, Object.assign(dndDefaultLook(look.species || 'human', null, 7), look)); } catch (e) { /* fine */ }
    return cv;
  };
}

// ---- the shapes --------------------------------------------------------------------------------------------------
// Every shape is a six-sided block given by its eight corners, in model pixels (feet at y 0, the top of the head at
// 32, the chest toward -z, the right arm out along +x). Corner (cx, cy, cz) is P[cx*4 + cy*2 + cz].
const gci = (cx, cy, cz) => cx * 4 + cy * 2 + cz;
function gPrismPts(y0, r0, y1, r1) {     // r = [x0, z0, x1, z1]: the bottom face at y0, the top at y1
  const P = new Array(8);
  for (let cx = 0; cx < 2; cx++) for (let cy = 0; cy < 2; cy++) for (let cz = 0; cz < 2; cz++) {
    const r = cy ? r1 : r0;
    P[gci(cx, cy, cz)] = [cx ? r[2] : r[0], cy ? y1 : y0, cz ? r[3] : r[1]];
  }
  return P;
}
function gBoxPts(a, b, t0, t1, sh) {     // a box, narrowed toward the bottom (t0) or top (t1) about its middle, its top shifted by sh
  const cx = (a[0] + b[0]) / 2, cz = (a[2] + b[2]) / 2, hx = (b[0] - a[0]) / 2, hz = (b[2] - a[2]) / 2;
  const r = (t, s) => [cx - hx * t[0] + s[0], cz - hz * t[1] + s[1], cx + hx * t[0] + s[0], cz + hz * t[1] + s[1]];
  return gPrismPts(a[1], r(t0 || [1, 1], [0, 0]), b[1], r(t1 || [1, 1], sh || [0, 0]));
}
const gSub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const gDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const gCross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const gNorm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function gSegPts(p0, p1, w0, w1, ref) {  // a square-ish rod from p0 to p1, w = width or [across, deep]
  const d = gNorm(gSub(p1, p0));
  let A = ref || [0, 0, 1]; if (Math.abs(gDot(d, A)) > 0.95) A = [1, 0, 0];
  const u = gNorm(gCross(d, A)), v = gCross(u, d);
  const W0 = Array.isArray(w0) ? w0 : [w0, w0], W1 = Array.isArray(w1) ? w1 : [w1, w1];
  const P = new Array(8);
  for (let cx = 0; cx < 2; cx++) for (let cy = 0; cy < 2; cy++) for (let cz = 0; cz < 2; cz++) {
    const p = cy ? p1 : p0, W = cy ? W1 : W0, su = (cx ? 0.5 : -0.5) * W[0], sv = (cz ? 0.5 : -0.5) * W[1];
    P[gci(cx, cy, cz)] = [p[0] + u[0] * su + v[0] * sv, p[1] + u[1] * su + v[1] * sv, p[2] + u[2] * su + v[2] * sv];
  }
  return P;
}
function gRot(P, axis, a, pv) {
  const c = Math.cos(a), s = Math.sin(a);
  return P.map(p => {
    const x = p[0] - pv[0], y = p[1] - pv[1], z = p[2] - pv[2];
    if (axis === 'x') return [p[0], pv[1] + y * c - z * s, pv[2] + y * s + z * c];
    if (axis === 'y') return [pv[0] + x * c + z * s, p[1], pv[2] - x * s + z * c];
    return [pv[0] + x * c - y * s, pv[1] + x * s + y * c, p[2]];
  });
}
const GEAR_MIRROR = { armR: 'armL', foreR: 'foreL', legR: 'legL', shinR: 'shinL', armL: 'armR', foreL: 'foreR', legL: 'legR', shinL: 'shinR' };
function gMirror(s) {
  const P = new Array(8);
  for (let cx = 0; cx < 2; cx++) for (let cy = 0; cy < 2; cy++) for (let cz = 0; cz < 2; cz++) { const q = s.pts[gci(1 - cx, cy, cz)]; P[gci(cx, cy, cz)] = [-q[0], q[1], q[2]]; }
  let fm = s.fm; if (fm && (fm[0] || fm[1])) { fm = Object.assign({}, fm); const t = fm[0]; fm[0] = fm[1]; fm[1] = t; }
  return Object.assign({}, s, { part: GEAR_MIRROR[s.part] || s.part, pts: P, fm });
}
function gShapeKit(S, show) {
  const put = (part, mat, pts, o) => {
    if (o.tag && show && !show[o.tag]) return null;
    const s = { part, mat, pts, fm: o.fm || null };
    S.push(s); if (o.mirror) S.push(gMirror(s));
    return s;
  };
  const turn = (P, o) => { if (o.r) for (const [ax, an, pv] of o.r) P = gRot(P, ax, an, pv); return P; };
  return {
    box: (part, mat, a, b, o = {}) => put(part, mat, turn(gBoxPts(a, b, o.t0, o.t1, o.sh), o), o),
    prism: (part, mat, y0, r0, y1, r1, o = {}) => put(part, mat, turn(gPrismPts(y0, r0, y1, r1), o), o),
    seg: (part, mat, p0, p1, w0, w1, o = {}) => put(part, mat, turn(gSegPts(p0, p1, w0, w1, o.ref), o), o),
  };
}

// The look's own shapes. helm / chest: a helmet or a chestplate is being worn (hair, hoods and hats go under a helmet;
// shoulder pieces, belts and cuffs under a chestplate).
function gearShapes(L, aw, helm, chest) {
  const S = [];
  const hood = L.hood && !helm, hat = helm ? 'none' : L.hat;
  const hatCovers = ['wizard', 'feather', 'straw', 'cap', 'bucket', 'chef'].includes(hat);
  const show = { top: !helm && !hood && !hatCovers, side: !helm && !hood, fringe: !helm, hang: !hood, sh: !chest, cuff: !chest, belt: !chest };
  const { box, prism, seg } = gShapeKit(S, show);
  const a0 = 4, a1 = 4 + aw;              // the right arm, across
  let sd = 17; for (const ch of L.shape || '') sd = (sd * 31 + ch.charCodeAt(0)) >>> 0;
  const R = mulberry32(sd || 1);

  // ---- hair ----
  const hs = L.hair;
  const H = (a, b, o = {}) => box(o.part || 'head', 'hair', a, b, o);
  const cap = () => H([-4.45, 31.1, -4.45], [4.45, 32.75, 4.45], { tag: 'top' });
  const back = (y0 = 25.6, z1 = 4.6) => H([-4.45, y0, 3.55], [4.45, 31.2, z1], { tag: 'side' });
  const sides = (y0 = 27.6) => H([-4.62, y0, -3.4], [-3.55, 31.2, 4.5], { tag: 'side', mirror: true });
  const fringe = () => H([-4.45, 30.3, -4.75], [4.45, 31.5, -3.7], { tag: 'fringe' });
  if (hs === 'short') { cap(); back(); sides(); fringe(); H([-2.6, 29.6, -4.9], [0.9, 30.5, -4.2], { tag: 'fringe' }); }
  else if (hs === 'crop') { H([-4.3, 31.5, -4.3], [4.3, 32.5, 4.3], { tag: 'top' }); H([-4.3, 28.6, 3.6], [4.3, 31.6, 4.35], { tag: 'side' }); H([-4.3, 30.8, -4.5], [4.3, 31.6, -3.8], { tag: 'fringe' }); }
  else if (hs === 'long') {
    cap(); back(24.2, 4.9); fringe();
    H([-4.78, 24.4, -2.6], [-3.55, 31.2, 4.6], { tag: 'side', mirror: true });
    H([-4.6, 17.0, 2.25], [4.6, 24.6, 3.9], { part: 'neck', tag: 'hang', t0: [1.05, 1] });
  } else if (hs === 'tail') {
    cap(); back(); sides(); fringe();
    H([-1.1, 28.2, 4.4], [1.1, 30.2, 5.5], { tag: 'side' });
    H([-1.3, 21.6, 4.7], [1.3, 28.6, 6.3], { tag: 'hang', t0: [0.6, 0.75], r: [['x', -0.22, [0, 28.6, 5.4]]] });
  } else if (hs === 'braids') {
    cap(); back(); sides(); fringe();
    for (const s of [-1, 1]) {
      const x = s * 2.2;
      H([x - 0.95, 21.6, 2.9], [x + 0.95, 24.9, 4.5], { part: 'neck', tag: 'hang' });
      H([x - 0.8, 18.6, 2.85], [x + 0.8, 21.8, 4.3], { part: 'neck', tag: 'hang' });
      H([x - 0.65, 16.2, 2.8], [x + 0.65, 18.8, 4.1], { part: 'neck', tag: 'hang' });
      box('neck', 'leather', [x - 0.75, 15.5, 2.75], [x + 0.75, 16.3, 4.2], { tag: 'hang' });
    }
  } else if (hs === 'mohawk') {
    H([-0.9, 31.5, -3.9], [0.9, 33.5, -1.0], { tag: 'top' }); H([-1.0, 31.5, -1.2], [1.0, 34.6, 1.9], { tag: 'top' });
    H([-0.9, 31.5, 1.7], [0.9, 33.9, 4.45], { tag: 'top' }); H([-0.8, 27.0, 3.95], [0.8, 31.7, 4.9], { tag: 'side' });
  } else if (hs === 'bun') { cap(); back(); sides(); fringe(); H([-2.0, 32.4, -0.2], [2.0, 35.0, 3.8], { tag: 'top', t1: [0.75, 0.75] }); }
  else if (hs === 'curly') {
    cap();
    for (const x of [-3.2, -1.05, 1.05, 3.2]) for (const z of [-3.2, -1.05, 1.05, 3.2]) { const r = R() * 0.6; H([x - 1.3, 31.6 + r, z - 1.3], [x + 1.3, 33.3 + r, z + 1.3], { tag: 'top' }); }
    for (const z of [-2.3, 0, 2.3]) for (const y of [28.6, 30.6]) H([3.45, y - 1.1, z - 1.2], [4.95, y + 1.1, z + 1.2], { tag: 'side', mirror: true });
    for (const x of [-2.4, 0, 2.4]) for (const y of [26.9, 29.3]) H([x - 1.25, y - 1.15, 3.5], [x + 1.25, y + 1.15, 5.0], { tag: 'side' });
    for (const x of [-3.1, -1.05, 1.05, 3.1]) H([x - 1.1, 30.2, -4.95], [x + 1.1, 31.6, -3.8], { tag: 'fringe' });
  } else if (hs === 'sides') {
    H([-2.8, 31.2, -4.5], [2.8, 33.3, 4.5], { tag: 'top' }); H([-2.8, 30.0, -4.8], [2.8, 31.4, -3.8], { tag: 'fringe' }); H([-2.8, 28.4, 3.6], [2.8, 31.4, 4.65], { tag: 'side' });
  } else if (hs === 'wild') {
    H([-4.8, 31.0, -4.8], [4.8, 33.0, 4.8], { tag: 'top' });
    for (const [x, z] of [[-2.6, -2.4], [2.6, -2.4], [-2.6, 2.4], [2.6, 2.4], [0, 0], [0, -3.3], [-3.4, 0], [3.4, 0], [0, 3.4]]) seg('head', 'hair', [x, 32.4, z], [x * 1.35, 35.4 - Math.hypot(x, z) * 0.3, z * 1.35 + 0.7], 2.3, 0.5, { tag: 'top' });
    H([-5.0, 24.2, 3.4], [5.0, 31.4, 5.9], { tag: 'side', t0: [1.1, 1] });
    H([-5.0, 25.0, -3.0], [-3.55, 31.4, 4.2], { tag: 'side', mirror: true });
    H([-5.2, 18.0, 2.25], [5.2, 24.6, 4.6], { part: 'neck', tag: 'hang', t0: [1.1, 1] });
    for (const x of [-2.6, 0, 2.6]) seg('head', 'hair', [x, 31.2, -4.1], [x * 1.1, 29.6, -5.3], 1.7, 0.45, { tag: 'fringe' });
  }

  // ---- beards ----
  const bd = L.beard, B = (part, a, b, o) => box(part, 'beard', a, b, o);
  const must = () => { B('head', [-2.6, 26.3, -4.7], [2.6, 27.2, -4.0]); B('head', [-3.1, 24.8, -4.65], [-2.2, 26.6, -4.05], { mirror: true }); };
  const jaw = () => { B('head', [-4.25, 23.9, -4.65], [4.25, 26.25, -3.7]); B('head', [-4.6, 24.1, -3.9], [-3.75, 28.6, 1.0], { mirror: true }); B('head', [-2.6, 23.0, -4.9], [2.6, 24.4, -3.6]); };
  if (bd === 'moustache') must();
  else if (bd === 'short') { jaw(); must(); }
  else if (bd === 'long') { jaw(); must(); B('neck', [-3.8, 18.4, -5.0], [3.8, 23.6, -3.3], { t0: [0.62, 0.85] }); }
  else if (bd === 'braided') {
    jaw(); must(); B('neck', [-1.5, 16.6, -4.85], [1.5, 23.6, -3.5], { t0: [0.8, 0.9] });
    box('neck', 'gold', [-1.7, 18.0, -5.0], [1.7, 19.0, -3.35]); box('neck', 'gold', [-1.6, 20.6, -5.0], [1.6, 21.5, -3.35]);
  } else if (bd === 'forked') { jaw(); must(); B('neck', [-3.3, 17.4, -4.95], [-0.5, 23.6, -3.4], { t0: [0.45, 0.8], mirror: true }); }
  else if (bd === 'wizard') {
    // the long wizard's beard: full at the jaw, a moustache that falls past the chin, then down in tiers to a point below the belt
    jaw();
    B('head', [-2.7, 26.3, -4.75], [2.7, 27.3, -4.0]);
    B('head', [-3.5, 22.4, -4.75], [-2.3, 26.7, -4.1], { mirror: true, t0: [0.7, 0.9] });
    B('head', [-4.5, 22.6, -5.05], [4.5, 26.2, -3.6]);
    B('neck', [-4.35, 18.4, -5.25], [4.35, 23.2, -3.4], { t0: [0.9, 0.95] });
    B('neck', [-3.8, 14.4, -5.3], [3.8, 18.8, -3.45], { t0: [0.8, 0.9] });
    B('neck', [-2.85, 11.0, -5.15], [2.85, 14.8, -3.5], { t0: [0.6, 0.85] });
    B('neck', [-1.6, 8.6, -4.95], [1.6, 11.4, -3.7], { t0: [0.3, 0.6] });
    B('neck', [-4.65, 19.2, -4.5], [-3.7, 23.8, -3.45], { mirror: true, t0: [0.7, 1] });
  }

  // ---- ears, horns, tusks, snout, nose, tail ----
  if (L.ears === 'pointed') seg('head', 'skin', [-4.0, 27.6, 0.4], [-5.5, 30.6, 1.5], [0.7, 2.2], [0.45, 0.45], { mirror: true });
  else if (L.ears === 'long') seg('head', 'skin', [-4.0, 27.8, 0.4], [-7.6, 30.4, 1.9], [0.7, 2.3], [0.4, 0.4], { mirror: true });
  if (L.horns === 'small') seg('head', 'horn', [-2.6, 31.6, -1.6], [-2.9, 33.6, -1.2], 1.5, 0.7, { mirror: true });
  else if (L.horns === 'straight') seg('head', 'horn', [-2.6, 31.5, -1.4], [-3.8, 36.8, 0.8], 1.7, 0.35, { mirror: true });
  else if (L.horns === 'curled' || L.horns === 'ram') {
    // swept back from the brow over the head and down behind (curled), or round past the ear and forward again (ram)
    const ram = L.horns === 'ram', n = ram ? 8 : 6, R0 = ram ? 3.3 : 3.6, ph0 = ram ? -1.0 : -1.1, ph1 = ram ? 3.8 : 2.2, cy = ram ? 29.4 : 30.4, cz = ram ? 1.0 : 2.2;
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n, ph = ph0 + (ph1 - ph0) * t, r = R0 * (1 - 0.25 * t);
      const p = [-(3.3 + t * (ram ? 2.3 : 1.2)), cy + r * Math.cos(ph), cz + r * Math.sin(ph)];
      if (prev) seg('head', 'horn', prev, p, 2.1 - 1.4 * (i - 1) / n, 2.1 - 1.4 * t, { mirror: true });
      prev = p;
    }
  }
  if (L.tusks) seg('head', 'bone', [-2.3, 25.0, -4.3], [-2.7, 27.6, -4.95], 0.95, 0.4, { mirror: true });
  if (L.snout) {
    box('head', 'skin', [-2.6, 24.2, -6.9], [2.6, 28.3, -3.8], { t1: [0.92, 1] });
    box('head', 'skin', [-4.3, 29.4, -4.65], [4.3, 30.4, -3.9]);
    seg('head', 'horn', [-2.0, 31.6, 2.0], [-2.7, 34.0, 4.8], 1.3, 0.3, { mirror: true });
  }
  if (L.nose) box('head', 'skin', [-1.0, 26.0, -5.6], [1.0, 28.3, -3.9]);
  if (L.tail) {
    if (L.species === 'dragonborn' || L.scales) {
      seg('tail', 'skin', [0, 12.4, 2.0], [0, 8.2, 6.6], 3.0, 2.4); seg('tail', 'skin', [0, 8.2, 6.6], [0, 4.6, 10.2], 2.4, 1.6); seg('tail', 'skin', [0, 4.6, 10.2], [0, 2.2, 13.4], 1.6, 0.6);
    } else {
      seg('tail', 'skin', [0, 12.2, 2.0], [0, 7.2, 5.6], 1.1, 0.95); seg('tail', 'skin', [0, 7.2, 5.6], [0, 4.2, 9.6], 0.95, 0.8); seg('tail', 'skin', [0, 4.2, 9.6], [0, 4.8, 12.8], 0.8, 0.7);
      box('tail', 'skin', [-1.3, 3.6, 12.4], [1.3, 6.2, 14.2], { t1: [0.2, 0.5] });
    }
  }

  // ---- hoods and hats ----
  if (hood) {
    const m = L.outfit ? 'main' : 'extra';
    box('head', m, [-4.95, 23.4, 3.6], [4.95, 33.4, 5.0]);
    box('head', m, [-4.95, 32.3, -4.7], [4.95, 33.6, 5.0]);
    box('head', m, [-4.95, 23.4, -4.5], [-3.95, 33.4, 5.0], { mirror: true });
    box('head', m, [-4.95, 31.4, -5.15], [4.95, 33.6, -4.3]);
    seg('head', m, [0, 32.8, 4.0], [0, 34.4, 7.4], [3.4, 2.6], [0.7, 0.6]);
    box('body', m, [-4.7, 18.6, 2.1], [4.7, 24.6, 3.4], { t0: [1.03, 1] });
    box('body', m, [-4.7, 22.1, -2.95], [4.7, 24.6, -2.1]);
  }
  if (hat === 'wizard') {
    box('head', 'hat', [-6.6, 31.3, -6.6], [6.6, 32.3, 6.6]);
    box('head', 'trim', [-4.75, 32.1, -4.75], [4.75, 33.2, 4.75]);
    box('head', 'hat', [-4.6, 32.2, -4.6], [4.6, 35.4, 4.6], { t1: [0.78, 0.78] });
    box('head', 'hat', [-3.6, 35.2, -3.4], [3.6, 38.6, 3.8], { t1: [0.62, 0.62], sh: [0, 0.8] });
    box('head', 'hat', [-2.25, 38.4, -1.6], [2.25, 41.2, 2.9], { t1: [0.5, 0.5], sh: [0, 1.0] });
    seg('head', 'hat', [0, 40.9, 1.6], [0, 42.4, 4.8], 1.25, 0.3);
    box('head', 'gold', [-0.7, 33.4, -4.2], [0.7, 34.6, -3.75]);
  } else if (hat === 'feather') {
    box('head', 'trim', [-4.65, 30.9, -4.65], [4.65, 33.4, 4.65], { t1: [0.9, 0.9] });
    box('head', 'trim', [-4.65, 30.9, -6.1], [4.65, 31.5, -4.4]);
    seg('head', 'feather', [3.3, 32.4, 1.0], [5.0, 38.4, 4.6], [0.4, 1.7], [0.2, 0.5]);
  } else if (hat === 'circlet') {
    for (const [a, b] of [[[-4.6, 29.6, -4.75], [4.6, 30.8, -4.15]], [[-4.6, 29.6, 4.15], [4.6, 30.8, 4.75]], [[-4.75, 29.6, -4.6], [-4.15, 30.8, 4.6]], [[4.15, 29.6, -4.6], [4.75, 30.8, 4.6]]]) box('head', 'leaf', a, b);
    for (const x of [-3.0, -0.6, 1.8]) box('head', 'leaf', [x - 0.7, 30.2, -5.0], [x + 0.7, 31.6, -4.3]);
    seg('head', 'leather', [-3.6, 30.6, -2.6], [-4.8, 33.6, -2.0], 0.6, 0.3, { mirror: true });
  } else if (hat === 'crown') {
    for (const [a, b] of [[[-4.6, 30.7, -4.75], [4.6, 32.0, -4.15]], [[-4.6, 30.7, 4.15], [4.6, 32.0, 4.75]], [[-4.75, 30.7, -4.6], [-4.15, 32.0, 4.6]], [[4.15, 30.7, -4.6], [4.75, 32.0, 4.6]]]) box('head', 'gold', a, b);
    for (const x of [-3, 0, 3]) { box('head', 'gold', [x - 0.45, 31.9, -4.75], [x + 0.45, 33.3, -4.3]); box('head', 'gold', [x - 0.45, 31.9, 4.3], [x + 0.45, 33.3, 4.75]); }
  } else if (hat === 'straw') {
    box('head', 'hat', [-6.9, 31.0, -6.9], [6.9, 31.8, 6.9]);
    box('head', 'hat', [-4.4, 31.6, -4.4], [4.4, 34.0, 4.4], { t1: [0.85, 0.85] });
    box('head', 'leather', [-4.5, 31.7, -4.5], [4.5, 32.4, 4.5]);
  } else if (hat === 'cap') {
    box('head', 'hat', [-4.55, 31.0, -4.55], [4.55, 33.1, 4.55], { t1: [0.94, 0.94] });
    box('head', 'hat', [-3.8, 31.0, -6.5], [3.8, 31.6, -4.4]);
    if (L.feather) seg('head', 'feather', [3.6, 32.4, 0.6], [4.6, 36.4, 3.6], [0.4, 1.4], [0.2, 0.4]);
  } else if (hat === 'bucket') {
    box('head', 'hat', [-4.6, 30.6, -4.6], [4.6, 33.4, 4.6]);
    box('head', 'hat', [-5.7, 30.2, -5.7], [5.7, 30.9, 5.7]);
  } else if (hat === 'chef') {
    box('head', 'hat', [-4.6, 30.8, -4.6], [4.6, 32.5, 4.6]);
    box('head', 'hat', [-5.0, 32.3, -5.0], [5.0, 36.0, 5.0], { t0: [0.88, 0.88] });
    box('head', 'hat', [-4.4, 35.8, -4.4], [4.4, 36.8, 4.4]);
  }

  // ---- a cloak: the mantle and clasps, and the cape in two pieces (the lower one swings further) ----
  if (L.cloak) {
    box('body', 'cloak', [-4.75, 22.8, -2.8], [4.75, 25.0, 3.1]);
    box('body', 'gold', [-3.3, 22.7, -3.0], [-2.2, 23.8, -2.55], { mirror: true });
    box('cape', 'cloak', [-4.7, 13.3, 2.35], [4.7, 24.7, 3.6], { t0: [1.08, 0.96], fm: { 5: 'trim' } });
    box('capeLo', 'cloak', [-5.08, 3.0, 2.4], [5.08, 13.5, 3.55], { t0: [1.12, 0.94], fm: { 5: 'trim' } });
  }

  // ---- clothes ----
  const of = L.outfit;
  const belt = (mat = 'leather', buckle = 'gold') => {
    box('body', mat, [-4.55, 11.3, -2.65], [4.55, 13.0, 2.65], { tag: 'belt' });
    if (buckle) box('body', buckle, [-1.0, 11.1, -2.85], [1.0, 13.2, -2.55], { tag: 'belt' });
  };
  const skirt = (mat, hem, y0 = 1.3) => {
    prism('skirtF', mat, y0, [-5.15, -3.35, 5.15, 0], 12.4, [-4.45, -2.55, 4.45, 0]);
    prism('skirtB', mat, y0, [-5.15, 0, 5.15, 3.35], 12.4, [-4.45, 0, 4.45, 2.55]);
    if (hem) {
      prism('skirtF', hem, y0 - 0.2, [-5.3, -3.5, 5.3, 0.02], y0 + 1.0, [-5.22, -3.42, 5.22, 0.02]);
      prism('skirtB', hem, y0 - 0.2, [-5.3, -0.02, 5.3, 3.5], y0 + 1.0, [-5.22, -0.02, 5.22, 3.42]);
    }
  };
  const sleeves = (mat, hem) => {
    prism('foreR', mat, 13.6, [a0 - 0.95, -2.95, a1 + 0.95, 2.95], 17.4, [a0 - 0.4, -2.4, a1 + 0.4, 2.4], { tag: 'cuff', mirror: true });
    if (hem) prism('foreR', hem, 13.4, [a0 - 1.05, -3.05, a1 + 1.05, 3.05], 14.4, [a0 - 0.98, -2.98, a1 + 0.98, 2.98], { tag: 'cuff', mirror: true });
  };
  const collar = (mat = 'main') => {
    box('body', mat, [-4.45, 22.6, 1.7], [4.45, 26.0, 2.9], { r: [['x', 0.25, [0, 22.6, 2.3]]], fm: { 5: 'trim' }, tag: 'sh' });
    box('body', mat, [-4.6, 22.6, -1.9], [-3.7, 25.2, 2.4], { mirror: true, tag: 'sh' });
  };
  // (a tabard or surcoat goes over armour, so it stands out from the chest a little)
  const tabard = (mat, y0, edge) => {
    box('body', mat, [-2.7, 12.4, -3.0], [2.7, 23.4, -2.7]); box('body', mat, [-2.7, 12.4, 2.7], [2.7, 23.4, 3.0]);
    box('skirtF', mat, [-2.75, y0, -3.3], [2.75, 12.6, -2.8]); box('skirtB', mat, [-2.75, y0, 2.8], [2.75, 12.6, 3.3]);
    if (edge) { box('skirtF', edge, [-2.85, y0 - 0.1, -3.35], [2.85, y0 + 0.7, -2.75]); box('skirtB', edge, [-2.85, y0 - 0.1, 2.75], [2.85, y0 + 0.7, 3.35]); }
  };
  const shoulders = (mat, big) => prism('armR', mat, big ? 21.0 : 21.3, [a0 - 0.5, -2.65, a1 + (big ? 0.8 : 0.55), 2.65], 24.7, [a0 - 0.3, -2.45, a1 + 0.4, 2.45], { tag: 'sh', mirror: true });
  const sash = (mat, a, z = -2.37) => box('body', mat, [-5.4, 17.25, z - 0.25], [5.4, 18.75, z + 0.25], { r: [['z', a, [0, 18, z]]] });
  if (L.robe) {
    skirt('main', of === 'pact' ? 'cloak' : of === 'leafrobe' ? null : 'trim');
    if (of !== 'leafrobe') sleeves('main', of === 'pact' ? 'cloak' : 'trim');
  }
  switch (of) {
    case 'archrobe':
      belt('leather', 'gold'); collar();
      box('skirtF', 'leather', [2.2, 9.2, -3.15], [4.0, 11.6, -2.45]); box('skirtF', 'gold', [2.9, 10.6, -3.25], [3.3, 11.0, -3.1]);
      break;
    case 'pact': belt('trim', null); collar(); break;
    case 'silks': belt('trim', 'gold'); box('skirtF', 'trim', [1.4, 6.6, -3.1], [2.6, 11.6, -2.6]); collar(); break;
    case 'vestments':
      belt('leather', 'gold');
      for (const x of [-2.1, 2.1]) { box('body', 'trim', [x - 0.6, 12.4, -2.5], [x + 0.6, 24.3, -2.2]); prism('skirtF', 'trim', 3.6, [x - 0.6, -3.3, x + 0.6, -3.0], 12.4, [x - 0.6, -2.7, x + 0.6, -2.4]); }
      box('body', 'trim', [-4.6, 22.8, -2.75], [4.6, 24.6, 2.75], { tag: 'sh' });
      break;
    case 'leafrobe':
      box('body', 'leather', [-4.5, 11.6, -2.6], [4.5, 12.6, 2.6], { tag: 'belt' });
      for (const x of [-3.5, -1.2, 1.2, 3.5]) {
        box('body', 'leaf', [x - 1.2, 22.6, -2.95], [x + 1.2, 24.8, -1.9], { tag: 'sh' }); box('body', 'leaf', [x - 1.2, 22.6, 1.9], [x + 1.2, 24.8, 2.95], { tag: 'sh' });
        box('skirtF', 'leaf', [x - 1.3, 0.9, -3.55], [x + 1.3, 2.6, -2.9]); box('skirtB', 'leaf', [x - 1.3, 0.9, 2.9], [x + 1.3, 2.6, 3.55]);
      }
      break;
    case 'gambeson': tabard('trim', 4.6); belt('leather', 'gold'); shoulders('main', true); break;
    case 'surcoat':
      tabard('main', 3.2, 'trim'); belt('leather', 'gold');
      box('body', 'trim', [-0.6, 15.4, -3.15], [0.6, 21.6, -2.95]); box('body', 'trim', [-2.0, 18.4, -3.15], [2.0, 19.6, -2.95]);
      shoulders('legs');
      break;
    case 'furs':
      prism('body', 'fur', 21.3, [-4.95, -2.95, 4.95, 3.05], 25.3, [-4.4, -2.6, 4.4, 2.7], { tag: 'sh' });
      prism('armR', 'fur', 21.0, [a0 - 0.5, -2.8, a1 + 0.85, 2.8], 24.9, [a0 - 0.3, -2.5, a1 + 0.5, 2.5], { tag: 'sh', mirror: true });
      box('body', 'leather', [-4.6, 11.0, -2.7], [4.6, 13.2, 2.7], { tag: 'belt' }); box('body', 'gold', [-1.3, 10.8, -2.95], [1.3, 13.4, -2.6], { tag: 'belt' });
      box('skirtF', 'main', [-2.3, 6.0, -2.75], [2.3, 12.4, -2.3]); box('skirtB', 'main', [-2.3, 6.0, 2.3], [2.3, 12.4, 2.75]);
      prism('shinR', 'fur', 3.4, [-0.45, -2.6, 4.45, 2.6], 6.1, [-0.3, -2.45, 4.3, 2.45], { mirror: true });
      box('foreR', 'leather', [a0 - 0.25, 13.4, -2.25], [a1 + 0.25, 15.8, 2.25], { tag: 'cuff', mirror: true });
      break;
    case 'doublet':
      prism('armR', 'main', 20.6, [a0 - 0.5, -2.75, a1 + 0.6, 2.75], 24.5, [a0 - 0.3, -2.45, a1 + 0.4, 2.45], { tag: 'sh', mirror: true });
      prism('armR', 'trim', 20.4, [a0 - 0.55, -2.8, a1 + 0.65, 2.8], 21.0, [a0 - 0.53, -2.78, a1 + 0.63, 2.78], { tag: 'sh', mirror: true });
      sash('trim', 0.68); belt();
      break;
    case 'wraps':
      box('body', 'trim', [-4.55, 11.2, -2.65], [4.55, 13.0, 2.65], { tag: 'belt' });
      box('skirtF', 'trim', [1.4, 6.6, -2.95], [2.6, 11.6, -2.55]); box('skirtF', 'trim', [2.8, 7.6, -2.9], [3.8, 11.6, -2.55]);
      box('foreR', 'bone', [a0 - 0.25, 13.2, -2.25], [a1 + 0.25, 16.4, 2.25], { tag: 'cuff', mirror: true });
      prism('shinR', 'legs', 1.2, [-0.6, -2.7, 4.6, 2.7], 4.4, [-0.25, -2.3, 4.25, 2.3], { mirror: true });
      break;
    case 'ranger':
      box('body', 'main', [-4.6, 22.2, -2.85], [4.6, 24.7, 2.95], { tag: 'sh' });
      box('foreR', 'leather', [a0 - 0.35, 13.2, -2.35], [a1 + 0.35, 16.8, 2.35], { tag: 'cuff', mirror: true });
      belt('leather', null); box('skirtF', 'leather', [2.4, 9.2, -3.05], [4.2, 11.8, -2.4]); sash('leather', -0.7);
      break;
    case 'shadow':
      box('body', 'trim', [-4.55, 22.6, -2.8], [4.55, 24.7, 2.8], { tag: 'sh' }); box('body', 'trim', [1.2, 17.0, 2.25], [2.6, 23.0, 2.75]);
      sash('leather', 0.7, -2.35); sash('leather', -0.7, -2.45); belt('leather', null);
      box('skirtF', 'leather', [-4.2, 9.6, -3.0], [-2.6, 11.6, -2.4]); box('skirtF', 'leather', [2.6, 9.6, -3.0], [4.2, 11.6, -2.4]);
      box('foreR', 'leather', [a0 - 0.3, 13.2, -2.3], [a1 + 0.3, 16.6, 2.3], { tag: 'cuff', mirror: true });
      break;
    case 'traveller':
      belt('leather', 'gold'); box('skirtB', 'leather', [0.8, 8.4, 2.45], [4.0, 12.2, 3.9]);
      sash('leather', -0.72, -2.35); sash('leather', 0.72, 2.35);
      box('body', 'main', [-4.55, 22.8, -2.75], [4.55, 24.5, 2.75], { tag: 'sh' });
      break;
    case 'noble':
      prism('body', 'bone', 23.2, [-4.65, -2.95, 4.65, 2.95], 25.0, [-4.3, -2.7, 4.3, 2.7], { tag: 'sh' });
      sash('trim', 0.68); belt('leather', 'gold');
      box('foreR', 'bone', [a0 - 0.3, 13.0, -2.3], [a1 + 0.3, 14.2, 2.3], { tag: 'cuff', mirror: true });
      break;
    case 'peasant': box('body', 'leather', [-4.5, 11.6, -2.6], [4.5, 12.6, 2.6], { tag: 'belt' }); break;
    default:
      // the townsfolk: aprons, a guard's tabard, a belt
      if (L.apron) {
        box('skirtF', 'extra', [-3.3, 4.4, -3.0], [3.3, 12.6, -2.45]); box('body', 'extra', [-2.9, 15.8, -2.45], [2.9, 21.8, -2.15]);
        box('body', 'extra', [-4.5, 11.8, -2.55], [4.5, 12.8, 2.55], { tag: 'belt' });
      } else if (L.tabard) { tabard('extra', 5.2, 'gold'); belt('leather', 'gold'); }
      else belt('leather', L.robe ? null : null);
  }
  return S;
}

// Armour's extra pieces, by kind (plate, mail, soft leather) and slot (0 helmet .. 3 boots); 'am' is the armour's
// own picture, 'at' its darker trim.
function gearArmorClass(mat) {
  if (['leather', 'studded', 'padded', 'hide'].includes(mat)) return 'soft';
  if (['chain', 'chainshirt', 'scale'].includes(mat)) return 'mail';
  return 'plate';
}
function gearArmorShapes(cls, slot, aw) {
  const S = [], { box, prism } = gShapeKit(S, null), a0 = 4, a1 = 4 + aw;
  if (slot === 0) {
    if (cls === 'plate') {
      box('head', 'am', [-0.65, 32.5, -4.45], [0.65, 34.1, 4.25], { t1: [0.75, 0.9] });
      box('head', 'at', [-4.95, 29.7, -5.1], [4.95, 30.7, -4.45]);
      box('head', 'am', [-4.95, 24.3, -4.95], [-4.25, 28.4, -1.2], { mirror: true });
    } else if (cls === 'mail') {
      prism('body', 'am', 21.4, [-4.75, -2.95, 4.75, 3.05], 24.8, [-4.4, -2.7, 4.4, 2.8]);
      box('head', 'at', [-1, 32.5, -1], [1, 33.4, 1]);
    } else box('head', 'at', [-4.85, 29.9, -5.35], [4.85, 30.7, -4.45]);
  } else if (slot === 1) {
    if (cls === 'plate') {
      prism('body', 'at', 23.4, [-3.9, -2.95, 3.9, 2.95], 25.0, [-3.5, -2.7, 3.5, 2.7]);
      box('body', 'am', [-0.55, 14.2, -2.95], [0.55, 23.2, -2.55]);
      box('body', 'at', [-4.75, 11.5, -2.85], [4.75, 13.1, 2.85]);
      prism('armR', 'am', 21.4, [a0 - 0.9, -3.05, a1 + 1.05, 3.05], 25.0, [a0 - 0.4, -2.6, a1 + 0.55, 2.6], { mirror: true });
      prism('armR', 'am', 19.6, [a0 - 0.2, -2.95, a1 + 1.25, 2.95], 21.6, [a0 - 0.5, -3.0, a1 + 1.1, 3.0], { mirror: true });
      prism('armR', 'at', 21.2, [a0 - 0.95, -3.1, a1 + 1.12, 3.1], 21.8, [a0 - 0.95, -3.1, a1 + 1.12, 3.1], { mirror: true });
      prism('foreR', 'at', 12.6, [a0 - 0.75, -2.95, a1 + 0.75, 2.95], 14.4, [a0 - 0.6, -2.8, a1 + 0.6, 2.8], { mirror: true });
    } else if (cls === 'mail') {
      prism('armR', 'am', 21.4, [a0 - 0.55, -2.8, a1 + 0.65, 2.8], 24.7, [a0 - 0.35, -2.55, a1 + 0.45, 2.55], { mirror: true });
      prism('skirtF', 'am', 7.2, [-4.75, -3.05, 4.75, 0], 12.4, [-4.55, -2.75, 4.55, 0]);
      prism('skirtB', 'am', 7.2, [-4.75, 0, 4.75, 3.05], 12.4, [-4.55, 0, 4.55, 2.75]);
      box('body', 'at', [-4.7, 11.6, -2.8], [4.7, 13.0, 2.8]);
    } else {
      prism('armR', 'am', 21.8, [a0 - 0.45, -2.75, a1 + 0.55, 2.75], 24.6, [a0 - 0.3, -2.55, a1 + 0.4, 2.55], { mirror: true });
      box('body', 'at', [-4.7, 11.6, -2.8], [4.7, 13.0, 2.8]);
      box('body', 'at', [-5.4, 17.5, -2.85], [5.4, 18.5, -2.6], { r: [['z', 0.7, [0, 18, -2.7]]] });
    }
  } else if (slot === 2) {
    if (cls === 'plate') {
      prism('legR', 'am', 7.4, [-0.3, -3.05, 4.35, -2.5], 12.2, [-0.15, -2.85, 4.2, -2.45], { mirror: true });
      box('legR', 'am', [4.05, 7.6, -2.5], [4.65, 12.2, 2.5], { mirror: true });
      box('shinR', 'at', [0.3, 4.4, -3.15], [3.7, 7.4, -2.55], { t1: [0.85, 1], mirror: true });
    } else box('shinR', 'at', [0.5, 4.8, -3.0], [3.5, 7.0, -2.5], { mirror: true });
  } else {
    if (cls === 'plate') {
      prism('shinR', 'at', 3.5, [-0.35, -3.0, 4.35, 3.0], 5.1, [-0.25, -2.9, 4.25, 2.9], { mirror: true });
      box('shinR', 'am', [0.1, 0, -3.9], [3.9, 1.9, -2.6], { t1: [0.95, 0.8], mirror: true });
    } else prism('shinR', 'at', 4.0, [-0.3, -2.9, 4.3, 2.9], 5.6, [-0.25, -2.85, 4.25, 2.85], { mirror: true });
  }
  return S;
}

// ---- building the meshes ----------------------------------------------------------------------------------------
const GEAR_CELLS = { hair: 0, beard: 1, main: 2, trim: 3, legs: 4, leather: 5, fur: 6, gold: 7, horn: 8, skin: 9, bone: 10, leaf: 11, hat: 12, cloak: 13, feather: 14, extra: 15 };
const GEAR_LOOK_GRID = { cols: 4, W: 128, H: 128, cell: (m) => GEAR_CELLS[m] ?? 2 };
const GEAR_ARMOR_GRID = { cols: 2, W: 64, H: 32, cell: (m) => (m === 'at' ? 1 : 0) };
function gearPivots(aw) {
  const ax = 4 + aw / 2;
  return { head: [0, 24, 0], neck: [0, 24, 0], body: [0, 12, 0], skirtF: [0, 12, 0], skirtB: [0, 12, 0], armR: [ax, 22, 0], foreR: [ax, 18, 0], armL: [-ax, 22, 0], foreL: [-ax, 18, 0],
    legR: [2, 12, 0], shinR: [2, 6, 0], legL: [-2, 12, 0], shinL: [-2, 6, 0], cape: [0, 24, 2.4], capeLo: [0, 13, 2.4], tail: [0, 12, 2] };
}
// where on the texture a face of a shape takes its picture: a patch of its material's cell, two texels a pixel
function gearUV(si, f, w, h, cell, grid) {
  const tw = Math.max(1, Math.min(32, Math.round(w * 2))), th = Math.max(1, Math.min(32, Math.round(h * 2)));
  const hs = (Math.imul(si + 1, 73856093) ^ Math.imul(f + 1, 19349663)) >>> 0;
  const ox = hs % (33 - tw), oy = (hs >>> 9) % (33 - th);
  const cx = (cell % grid.cols) * 32 + ox, cy = Math.floor(cell / grid.cols) * 32 + oy, e = 0.03;
  return [(cx + e) / grid.W, (cy + e) / grid.H, (cx + tw - e) / grid.W, (cy + th - e) / grid.H, cx, cy, tw, th];
}
const gLen = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function gearMeshes(gl, S, aw, grid) {
  const PV = gearPivots(aw), MB = {};
  S.forEach((s, si) => {
    const pv = PV[s.part]; if (!pv) return;
    const mb = MB[s.part] || (MB[s.part] = new MeshBuilder(256));
    for (let f = 0; f < 6; f++) {
      const F = FACES[f], c = F.c.map(q => s.pts[gci(q[0], q[1], q[2])]);
      const w = gLen(c[1], c[0]), h = gLen(c[3], c[0]);
      if (w < 0.01 || h < 0.01) continue;
      const uv = gearUV(si, f, w, h, grid.cell((s.fm && s.fm[f]) || s.mat), grid), sh = Math.round(Math.min(1, F.shade + 0.08) * 255), vs = [];
      for (let k = 0; k < 4; k++) {
        const p = c[k], t = FACE_UV[k];
        vs.push(mb.vert((p[0] - pv[0]) * PX, (p[1] - pv[1]) * PX, (p[2] - pv[2]) * PX, t[0] ? uv[2] : uv[0], t[1] ? uv[3] : uv[1], 255, 0, sh));
      }
      mb.quad(vs[0], vs[1], vs[2], vs[3], false);
    }
  });
  const out = {};
  for (const [k, mb] of Object.entries(MB)) { const r = mb.result(); if (r) out[k] = makeVAO(gl, r.verts, r.idx); }
  return out;
}

// ---- painting the gear's texture ---------------------------------------------------------------------------------
// The brightness pattern of one of the game's pictures (the pack's, with one installed), about 1 on average, so a
// colour times it keeps its colour and takes on the picture's weave or grain.
const GEAR_LUM = {};
function gearLumOf(px, w, sx, sy, sw, sh) {
  const L = new Float32Array(32 * 32); let sum = 0, n = 0;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const X = sx + Math.floor(x * sw / 32), Y = sy + Math.floor(y * sh / 32), s = (Y * w + X) * 4;
    const l = px[s + 3] < 40 ? -1 : px[s] * 0.3 + px[s + 1] * 0.59 + px[s + 2] * 0.11;
    L[y * 32 + x] = l; if (l >= 0) { sum += l; n++; }
  }
  if (n < 64 || sum <= 0) return null;
  const m = sum / n;
  for (let k = 0; k < L.length; k++) L[k] = L[k] < 0 ? 0.78 : Math.max(0.55, Math.min(1.45, L[k] / m));
  return L;
}
function gearLum(name) {
  if (GEAR_LUM[name] !== undefined) return GEAR_LUM[name];
  let out = null;
  try {
    const i = ATLAS.tile[name];
    if (i != null && ATLAS.pixels) out = gearLumOf(ATLAS.pixels.data, ATLAS_SIZE, (i % ATLAS_TILES) * TILE, Math.floor(i / ATLAS_TILES) * TILE, TILE, TILE);
  } catch (e) { out = null; }
  return (GEAR_LUM[name] = out);
}
function gearLeatherLum() {
  if (GEAR_LUM._leather !== undefined) return GEAR_LUM._leather;
  let out = null;
  try {
    const pc = typeof packArmorCanvas === 'function' && typeof PACK_ARMOR !== 'undefined' && PACK_ARMOR.leather ? packArmorCanvas('leather', 1, null) : null;
    if (pc) { const s = pc.width / 64; out = gearLumOf(pc.getContext('2d').getImageData(0, 0, pc.width, pc.height).data, pc.width, Math.round(20 * s), Math.round(21 * s), Math.round(8 * s), Math.round(10 * s)); }
  } catch (e) { out = null; }
  return (GEAR_LUM._leather = out || gearLum('armor_leather') || gearLum('leather'));
}
function gearPaint(L) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d'), img = g.createImageData(128, 128), D = img.data;
  let seed = 7; for (const ch of L.code) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const R = mulberry32(seed || 1);
  const cell = (k, fn) => {
    const ox = (k % 4) * 32, oy = Math.floor(k / 4) * 32;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const c = fn(x, y), o = ((oy + y) * 128 + ox + x) * 4;
      D[o] = Math.max(0, Math.min(255, c[0])); D[o + 1] = Math.max(0, Math.min(255, c[1])); D[o + 2] = Math.max(0, Math.min(255, c[2])); D[o + 3] = 255;
    }
  };
  const dye = (lum, col, k = 1) => (x, y) => { const f = (lum ? lum[y * 32 + x] : 1 + (R() - 0.5) * 0.14) * k; return [col[0] * f, col[1] * f, col[2] * f]; };
  const strands = (col, fine) => {
    const sx = []; for (let x = 0; x < 32; x++) sx.push(0.8 + R() * 0.32);
    return (x, y) => {
      const s = fine ? (sx[x] + sx[(x * 7 + 3) % 32]) / 2 : sx[x];
      const k = s * (y % 9 === 1 && R() < 0.5 ? 1.12 : 1) * (1.08 - y / 32 * 0.2) * (0.95 + R() * 0.1);
      return [col[0] * k + 6, col[1] * k + 5, col[2] * k + 4];
    };
  };
  const wool = gearLum('white_wool') || gearLum('wool'), lea = gearLeatherLum(), gold = gearLum('gold_block'), leaf = gearLum('oak_leaves') || gearLum('leaves');
  const dark = (c, k) => c.map(q => q * k);
  cell(0, strands(L.hairCol));
  cell(1, strands(L.beardCol, true));
  cell(2, dye(wool, L.cols[0]));
  cell(3, dye(wool, L.cols[1]));
  cell(4, dye(wool, L.cols[2]));
  cell(5, dye(lea, L.cols[3], 1.05));
  const furC = L.outfit === 'furs' ? L.cols[0].map(q => Math.min(255, q * 1.15)) : [150, 120, 84];
  cell(6, (x, y) => { const tuft = Math.sin(x * 1.7 + Math.floor(y / 4) * 2.1) * 0.12 + (y % 4 === 0 ? 0.14 : 0); const k = 0.82 + tuft + R() * 0.2; return furC.map(q => q * k); });
  cell(7, dye(gold, [232, 192, 72]));
  cell(8, (x, y) => { const k = (y % 5 === 0 ? 0.78 : 1) * (0.9 + R() * 0.16); return L.hornCol.map(q => q * k + 8); });
  cell(9, (x, y) => { const k = 0.97 + R() * 0.06; return L.skin.map(q => q * k); });
  cell(10, (x, y) => { const k = 0.92 + R() * 0.1; return [236 * k, 228 * k, 206 * k]; });
  cell(11, dye(leaf, [86, 146, 52]));
  cell(12, dye(wool, L.hatCol));
  cell(13, dye(wool, dark(L.cols[0], 0.74)));
  cell(14, (x, y) => (x === 15 || x === 16 ? [210, 200, 180] : y < 11 ? [210 + R() * 30, 60 + R() * 20, 40] : [236 + R() * 16, 232 + R() * 16, 222]));
  cell(15, dye(wool, L.extra));
  g.putImageData(img, 0, 0);
  return cv;
}
function gearGLTex(gl, cv) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}
const GEAR_TEX = new Map(), GEAR_MESH = new Map();
function gearLookTex(gl, L) {
  let t = GEAR_TEX.get(L.code);
  if (!t) { t = gearGLTex(gl, gearPaint(L)); GEAR_TEX.set(L.code, t); }
  return t;
}
function gearLookMeshes(gl, L, aw, helm, chest) {
  const key = L.shape + '|' + aw + '|' + (helm ? 1 : 0) + (chest ? 1 : 0);
  let m = GEAR_MESH.get(key);
  if (!m) { m = gearMeshes(gl, gearShapes(L, aw, helm, chest), aw, GEAR_LOOK_GRID); GEAR_MESH.set(key, m); }
  return m;
}
// the armour's pieces: meshes by kind, slot and arm width; the picture by material (and dye)
const GEAR_PACK_ALIAS = { chainshirt: ['chain'], scale: ['iron'], plate: ['iron'], steel: ['iron'], silver: ['iron'], bronze: ['gold'], mithril: ['diamond'], studded: ['leather', '6a4428'], padded: ['leather', 'd8ccb0'], hide: ['leather', 'a8885a'] };
const GEAR_AMESH = new Map(), GEAR_ATEX = new Map();
function gearArmorMeshes(gl, cls, slot, aw) {
  const key = cls + slot + aw;
  let m = GEAR_AMESH.get(key);
  if (!m) { m = gearMeshes(gl, gearArmorShapes(cls, slot, aw), aw, GEAR_ARMOR_GRID); GEAR_AMESH.set(key, m); }
  return m;
}
function gearArmorTex(gl, mat, col) {
  const key = mat + '#' + (col || '');
  if (GEAR_ATEX.has(key)) return GEAR_ATEX.get(key);
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 32;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  let done = false;
  try {
    // the pack's chestplate picture, its front (where the pack has this armour)
    const pc = typeof PACK_ARMOR !== 'undefined' && PACK_ARMOR[mat] && typeof packArmorCanvas === 'function' ? packArmorCanvas(mat, 1, col) : null;
    if (pc) { const s = pc.width / 64; g.drawImage(pc, 20 * s, 21 * s, 8 * s, 10 * s, 0, 0, 32, 32); done = true; }
  } catch (e) { done = false; }
  if (!done) {
    const i = ATLAS.tile['armor_' + mat];
    if (i != null && ATLAS.canvas) g.drawImage(ATLAS.canvas, (i % ATLAS_TILES) * TILE, Math.floor(i / ATLAS_TILES) * TILE, TILE, TILE, 0, 0, 32, 32);
    else { g.fillStyle = '#a8acb4'; g.fillRect(0, 0, 32, 32); }
  }
  // no holes (a pack's armour picture is see-through between its plates), dyed if asked, and the trim a shade darker
  const d = g.getImageData(0, 0, 32, 32), px = d.data; let r = 0, gg = 0, b = 0, n = 0;
  for (let k = 0; k < px.length; k += 4) if (px[k + 3] > 100) { r += px[k]; gg += px[k + 1]; b += px[k + 2]; n++; }
  const avg = n ? [r / n, gg / n, b / n] : [168, 172, 180], dyeC = !done && col ? hexRGB('#' + col) : null;
  for (let k = 0; k < px.length; k += 4) {
    if (px[k + 3] <= 100) { px[k] = avg[0] * 0.85; px[k + 1] = avg[1] * 0.85; px[k + 2] = avg[2] * 0.85; }
    if (dyeC) { const l = (px[k] * 0.3 + px[k + 1] * 0.59 + px[k + 2] * 0.11) / 160; px[k] = dyeC[0] * l; px[k + 1] = dyeC[1] * l; px[k + 2] = dyeC[2] * l; }
    px[k + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const t = g.getImageData(0, 0, 32, 32), tp = t.data;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const k = (y * 32 + x) * 4, f = y === 0 || x === 0 ? 1.12 : y === 31 || x === 31 ? 0.6 : 0.74; tp[k] *= f; tp[k + 1] *= f; tp[k + 2] *= f; }
  g.putImageData(t, 32, 0);
  const tex = gearGLTex(gl, cv);
  GEAR_ATEX.set(key, tex);
  return tex;
}

// ---- drawing ------------------------------------------------------------------------------------------------------
function gearDraws(out, n0, gl, skin, pose, L) {
  // far off, the gear's detail is lost anyway: past 56 blocks from everyone playing here, only the skin is drawn
  try { const G = typeof GAME !== 'undefined' && GAME; if (G && G.locals && G.locals.length && !pose.fp && G.locals.every(l => { const q = l.player; return (q.x - pose.x) ** 2 + (q.z - pose.z) ** 2 > 3136; })) return; } catch (e) { /* draw it */ }
  const P = skin.parts, F = {};
  const want = new Map([[P.head.mesh, 'head'], [P.body.mesh, 'body'], [P.armR_u.mesh, 'armR'], [P.armR_d.mesh, 'foreR'], [P.armL_u.mesh, 'armL'], [P.armL_d.mesh, 'foreL'],
    [P.legR_u.mesh, 'legR'], [P.legR_d.mesh, 'shinR'], [P.legL_u.mesh, 'legL'], [P.legL_d.mesh, 'shinL']]);
  for (let i = n0; i < out.length; i++) { const k = want.get(out[i].mesh); if (k && !F[k]) F[k] = out[i].m; }
  if (!F.body) return;
  const mk = (b) => { const m = Mat4.create(); m.set(b); return m; };
  const B = F.body;
  // the skirt's front and back follow whichever leg is ahead or behind (both, sitting down)
  const legAng = (k) => { const M = F[k]; if (!M) return 0; return Math.atan2(M[4] * B[8] + M[5] * B[9] + M[6] * B[10], M[4] * B[4] + M[5] * B[5] + M[6] * B[6]); };
  const tR = legAng('legR'), tL = legAng('legL');
  const front = Math.min(1.45, Math.max(tR, tL, 0)), back = tR > 0.5 && tL > 0.5 ? Math.min(tR, tL) : Math.min(tR, tL, 0);
  F.skirtF = mk(B); if (front) Mat4.rotateX(F.skirtF, front);
  F.skirtB = mk(B); if (back) Mat4.rotateX(F.skirtB, back);
  // what hangs from the chin and the nape follows the head only part way, so it never swings into the chest
  if (F.head) {
    const Hm = F.head, zx = Hm[8] * B[0] + Hm[9] * B[1] + Hm[10] * B[2], zy = Hm[8] * B[4] + Hm[9] * B[5] + Hm[10] * B[6], zz = Hm[8] * B[8] + Hm[9] * B[9] + Hm[10] * B[10];
    const yaw = Math.atan2(zx, zz), up = Math.asin(Math.max(-1, Math.min(1, -zy)));
    F.neck = mk(B); Mat4.translate(F.neck, 0, 12 * PX, 0); Mat4.rotateY(F.neck, yaw * 0.6); if (up > 0) Mat4.rotateX(F.neck, up * 0.5);
  }
  const at = (m, mesh, tex) => out.push({ m, mesh, tex, px: pose.x, py: pose.y, pz: pose.z, light: pose.light, tint: pose.tint });
  const aw = skin.slim ? 3 : 4, fp = !!pose.fp;
  const AR = pose.armor || [];
  const piece = (i) => { const id = AR[i]; if (!id) return null; const [pid, col] = String(id).split('#'); return { mat: armorMat(pid), col }; };
  const helm = piece(0), chest = piece(1);
  const hatItem = helm && itemDef(String(AR[0]).split('#')[0]) && itemDef(String(AR[0]).split('#')[0]).hat;
  if (L) {
    if (!fp && !pose.sleep && L.cloak && !pose.cape) {
      const t = pose.time || 0, wa = pose.walkAmt || 0;
      const capeA = pose.capeA ?? (0.1 + wa * (pose.sprint ? 0.8 : 0.45) + (pose.sit ? 0.35 : 0));
      const sway = pose.capeSway || Math.sin(t * 2.3) * 0.035 * (1 - wa);
      F.cape = mk(B); Mat4.translate(F.cape, 0, 12 * PX, (2.4 + (pose.back ? 5 : 0)) * PX); Mat4.rotateX(F.cape, -capeA * 0.55); if (sway) Mat4.rotateZ(F.cape, sway);
      F.capeLo = mk(F.cape); Mat4.translate(F.capeLo, 0, -11 * PX, 0); Mat4.rotateX(F.capeLo, -capeA * 0.6 - Math.sin(t * 3.1) * 0.03 * wa); if (sway) Mat4.rotateZ(F.capeLo, sway * 0.6);
    }
    if (L.tail && !fp) { const t = pose.time || 0; F.tail = mk(B); Mat4.translate(F.tail, 0, 0, 2 * PX); Mat4.rotateY(F.tail, Math.sin(t * 1.6) * 0.3); Mat4.rotateX(F.tail, 0.08 + Math.sin(t * 1.1) * 0.06); }
    const meshes = gearLookMeshes(gl, L, aw, !!helm && !hatItem, !!chest), tex = gearLookTex(gl, L);
    for (const [part, mesh] of Object.entries(meshes)) {
      if (fp && (part === 'head' || part === 'neck' || part === 'cape' || part === 'capeLo' || part === 'tail')) continue;
      if (part === 'neck' && !F.head) continue;
      const m = F[part]; if (m) at(m, mesh, tex);
    }
  }
  // armour's own 3D pieces, over its shell
  for (let i = 0; i < 4; i++) {
    const pc = piece(i); if (!pc) continue;
    if (i === 0 && (fp || hatItem)) continue;
    const meshes = gearArmorMeshes(gl, gearArmorClass(pc.mat), i, aw), tex = gearArmorTex(gl, pc.mat, pc.col);
    for (const [part, mesh] of Object.entries(meshes)) { if (fp && part === 'head') continue; const m = F[part]; if (m) at(m, mesh, tex); }
  }
}
{
  const baseDraws = avatarDraws;
  avatarDraws = function (out, gl, skin, pose) {
    if (!skin || !skin.ready || !skin.parts || !pose) return baseDraws(out, gl, skin, pose);
    const L = gearLookOf(skin);
    if (L && L.helmHide && pose.armor && pose.armor[0]) { pose = Object.assign({}, pose, { armor: pose.armor.slice() }); pose.armor[0] = null; }
    const n0 = out.length;
    baseDraws(out, gl, skin, pose);
    if (pose.invis || window.__gearOff) return;
    try { gearDraws(out, n0, gl, skin, pose, L); }
    catch (e) { if (!gearDraws.warned) { gearDraws.warned = true; console.warn('gear', e); } }
  };
}

// ---- the resource pack wears too: its chainmail, and its armour for the tabletop's kinds ------------------------------
if (typeof PACK_ARMOR_NAMES !== 'undefined') PACK_ARMOR_NAMES.chain = ['chainmail'];
if (typeof packArmor === 'function') {
  const basePA = packArmor;
  packArmor = async function (...a) {
    const n = await basePA.apply(this, a);
    for (const [k, [t]] of Object.entries(GEAR_PACK_ALIAS)) if (!PACK_ARMOR[k] && PACK_ARMOR[t]) PACK_ARMOR[k] = PACK_ARMOR[t];
    return n;
  };
}
if (typeof packArmorCanvas === 'function') {
  const basePC = packArmorCanvas;
  packArmorCanvas = function (mat, layer, col) {
    const A = GEAR_PACK_ALIAS[mat];
    if (A && A[0] === 'leather') return basePC('leather', layer, col || A[1]);
    if (A) return basePC(A[0], layer, col);
    return basePC(mat, layer, col);
  };
}
if (typeof PACK_ITEM_NAMES !== 'undefined') {
  Object.assign(PACK_ITEM_NAMES, {
    dnd_longsword: 'iron_sword', dnd_shortsword: 'stone_sword', dnd_handaxe: 'stone_axe', dnd_battleaxe: 'iron_axe', dnd_spellbook: 'enchanted_book',
    dnd_rations: 'bread', dnd_gold_coin: 'gold_nugget', dnd_silver_coin: 'iron_nugget', dnd_candle_kit: 'candle',
  });
  const SETS = { chain: 'chainmail', chainshirt: 'chainmail', plate: 'iron', scale: 'iron', studded: 'leather', padded: 'leather', hide: 'leather' };
  for (const [k, v] of Object.entries(SETS)) for (const p of ['helmet', 'chestplate', 'leggings', 'boots']) PACK_ITEM_NAMES[k + '_' + p] = v + '_' + p;
}

// ---- the menus' figure (ui/hymenu.js) wears the same gear, as CSS boxes -----------------------------------------------
function gearCSS(root, L, S0, aw) {
  if (!root || !L) return;
  const groups = {
    head: [root.querySelector('.hy-limb.head'), [0, 24, 0]], body: [root, [0, 12, 0]],
    armR: [root.querySelector('.hy-limb.arm.r'), [4 + aw / 2, 24, 0]], armL: [root.querySelector('.hy-limb.arm.l'), [-(4 + aw / 2), 24, 0]],
    legR: [root.querySelector('.hy-limb.leg.r'), [2, 12, 0]], legL: [root.querySelector('.hy-limb.leg.l'), [-2, 12, 0]],
  };
  const to = { head: 'head', neck: 'head', body: 'body', skirtF: 'body', skirtB: 'body', cape: 'body', capeLo: 'body', tail: 'body', armR: 'armR', foreR: 'armR', armL: 'armL', foreL: 'armL', legR: 'legR', shinR: 'legR', legL: 'legL', shinL: 'legL' };
  const cv = gearPaint(L), url = cv.toDataURL();
  const S = gearShapes(L, aw, false, false);
  // in the menu the cape hangs a little out behind, as if in a breeze
  const lean = (p, pv, a) => { const y = p[1] - pv[1], z = p[2] - pv[2], c = Math.cos(a), s = Math.sin(a); return [p[0], pv[1] + y * c - z * s, pv[2] + y * s + z * c]; };
  S.forEach((s, si) => {
    const G = groups[to[s.part]]; if (!G || !G[0]) return;
    let pts = s.pts;
    if (s.part === 'cape') pts = pts.map(p => lean(p, [0, 24, 2.4], -0.12));
    if (s.part === 'capeLo') pts = pts.map(p => lean(lean(p, [0, 13, 2.4], -0.1), [0, 24, 2.4], -0.12));
    const avg = (idx) => { const r = [0, 0, 0]; for (const i of idx) for (let k = 0; k < 3; k++) r[k] += pts[i][k] / idx.length; return r; };
    const ax = (hi, lo) => gSub(avg(hi), avg(lo));
    const ex = ax([4, 5, 6, 7], [0, 1, 2, 3]), ey = ax([2, 3, 6, 7], [0, 1, 4, 5]), ez = ax([1, 3, 5, 7], [0, 2, 4, 6]);
    const w = Math.hypot(...ex), h = Math.hypot(...ey), d = Math.hypot(...ez);
    if (w < 0.05 || h < 0.05 || d < 0.05) return;
    const X = gNorm(ex), Y = gNorm(ey), Z = gNorm(ez), c = avg([0, 1, 2, 3, 4, 5, 6, 7]), o = G[1];
    const t = [-(c[0] - o[0]) * S0, -(c[1] - o[1]) * S0, -(c[2] - o[2]) * S0];
    const bx = document.createElement('div'); bx.className = 'hy-box gear';
    bx.style.transform = `matrix3d(${X[0]},${X[1]},${X[2]},0,${Y[0]},${Y[1]},${Y[2]},0,${Z[0]},${Z[1]},${Z[2]},0,${t[0]},${t[1]},${t[2]},1)`;
    // the faces: [w, h, transform, GL face]; shade like the game does
    const F = [[w, h, `translateZ(${d * S0 / 2}px)`, 5], [w, h, `rotateY(180deg) translateZ(${d * S0 / 2}px)`, 4], [d, h, `rotateY(-90deg) translateZ(${w * S0 / 2}px)`, 0],
      [d, h, `rotateY(90deg) translateZ(${w * S0 / 2}px)`, 1], [w, d, `rotateX(90deg) translateZ(${h * S0 / 2}px)`, 2], [w, d, `rotateX(-90deg) translateZ(${h * S0 / 2}px)`, 3]];
    for (const [fw, fh, tr, gf] of F) {
      const uv = gearUV(si, gf, fw, fh, GEAR_LOOK_GRID.cell((s.fm && s.fm[gf]) || s.mat), GEAR_LOOK_GRID);
      const W = fw * S0, Hh = fh * S0, kx = W / uv[6], ky = Hh / uv[7], dim = 1 - Math.min(1, FACES[gf].shade + 0.12);
      const f = document.createElement('i');
      f.style.cssText = `width:${W}px;height:${Hh}px;margin:${-Hh / 2}px 0 0 ${-W / 2}px;transform:${tr};background-image:url("${url}");background-size:${128 * kx}px ${128 * ky}px;background-position:${-uv[4] * kx}px ${-uv[5] * ky}px;box-shadow:inset 0 0 0 ${Math.ceil(Math.max(W, Hh))}px rgba(0,0,0,${dim.toFixed(2)})`;
      bx.appendChild(f);
    }
    G[0].appendChild(bx);
  });
}
{
  const baseModel = hySkinModel;
  hySkinModel = function (host, url, o = {}) {
    const r = baseModel(host, url, o);
    const S0 = o.scale || 8, aw = o.slim ? 3 : 4;
    gearLookOfURL(url, (L) => { if (L && r.root.isConnected) gearCSS(r.root, L, S0, aw); });
    return r;
  };
}

// for the play-tests
try { window.__gear = { NPC_JOBS, gearRead, gearLookOf, gearShapes, GEAR_TEX, GEAR_MESH, CAMPAIGNS: typeof CAMPAIGNS !== 'undefined' ? CAMPAIGNS : null }; } catch (e) { /* no window */ }
