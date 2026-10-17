// ---------------------------------------------------------------------------
// render/skins.js — Minecraft / Mineclonia skin.png support.
//
// Accepts the standard layouts: 64x64 (modern, with separate left limbs and
// overlay layers) and 64x32 (classic/legacy, as used by Mineclonia's
// character.png; left limbs mirror the right ones). Larger HD skins in the
// same proportions are scaled down. Slim ("Alex") arms are detected
// automatically.
// ---------------------------------------------------------------------------

const PX = 0.9375 / 16; // one skin pixel in blocks (model is 1.875 blocks tall)
const SKINS = new Map(); // key -> { canvas, tex, parts, slim, legacy }

// Default skin, painted like everything else: the Emberwild wanderer.
function paintDefaultSkin() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  const R = mulberry32(4242);
  const put = (x, y, c, v = 0.06) => { const k = 1 + (R() - 0.5) * v; g.fillStyle = `rgb(${clamp(c[0] * k, 0, 255) | 0},${clamp(c[1] * k, 0, 255) | 0},${clamp(c[2] * k, 0, 255) | 0})`; g.fillRect(x, y, 1, 1); };
  const hair = hexRGB('#4a2c18'), skin = hexRGB('#d0a07c'), shirt = hexRGB('#2f8f86'), shirtD = hexRGB('#236b64'), pants = hexRGB('#3c4a8a'), shoes = hexRGB('#4a4a4a'), white = [245, 245, 245], eye = hexRGB('#3a5ab0'), mouth = hexRGB('#7a4630'), nose = hexRGB('#b8866a');
  // Paint a box: fn(face, x, y, w, h) returns a color
  const box = (u, v, w, h, d, fn) => {
    const faces = { top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, h], front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + d + w + d, v + d, w, h] };
    for (const [f, [x0, y0, fw, fh]] of Object.entries(faces)) for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) { const c = fn(f, x, y, fw, fh); if (c) put(x0 + x, y0 + y, c); }
  };
  box(0, 0, 8, 8, 8, (f, x, y) => {
    if (f === 'top') return hair;
    if (f === 'bottom') return skin;
    if (f === 'back') return y < 6 ? hair : skin;
    if (f === 'front') {
      if (y < 2 || (y === 2 && (x === 0 || x === 7))) return hair;
      if (y === 3) return x === 1 || x === 6 ? white : x === 2 || x === 5 ? eye : skin;
      if (y === 4 && (x === 3 || x === 4)) return nose;
      if (y === 5 && x >= 2 && x <= 5) return mouth;
      return skin;
    }
    return y < 3 || (f === 'right' ? x < 3 && y < 5 : x > 4 && y < 5) ? hair : skin; // sides
  });
  const shirtFn = (f, x, y, w, h) => (f === 'front' && y === 0 && (x === 3 || x === 4)) ? skin : (f === 'bottom' || y === h - 1) ? shirtD : shirt;
  box(16, 16, 8, 12, 4, shirtFn);
  const arm = (f, x, y) => f === 'top' ? shirt : f === 'bottom' ? skin : y < 4 ? (y === 3 ? shirtD : shirt) : skin;
  box(40, 16, 4, 12, 4, arm); box(32, 48, 4, 12, 4, arm);
  const leg = (f, x, y) => f === 'top' ? pants : f === 'bottom' ? shoes : y >= 10 ? shoes : pants;
  box(0, 16, 4, 12, 4, leg); box(16, 48, 4, 12, 4, leg);
  return cv;
}

// Normalise any skin image to 64x64 or 64x32 and inspect it.
function normalizeSkinImage(img) {
  const legacy = img.width === img.height * 2;
  if (!(legacy || img.width === img.height) || img.width < 64 || img.width % 64) throw new Error('That image is not a skin. Skins are 64×64 or 64×32 PNG files.');
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = legacy ? 32 : 64;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, cv.width, cv.height);
  const px = g.getImageData(0, 0, cv.width, cv.height).data;
  const a = (x, y) => px[(y * cv.width + x) * 4 + 3];
  // Slim skins leave the outer columns of the right arm empty.
  // (0.9.0.53) all four strips a slim skin doesn't use (the right arm's at 50,16 and 54,20, the left arm's at 42,48 and
  // 46,52) empty: slim. (Was three single pixels of the right arm, so a skin with a stray pixel there came out wrong.)
  const strips = [[50, 16, 2, 4], [54, 20, 2, 12], [42, 48, 2, 4], [46, 52, 2, 12]];
  const emptyStrip = ([x0, y0, w, h]) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (a(x, y) > 0) return false; return true; };
  let slim = !legacy && strips.every(emptyStrip);
  if (!legacy && !slim) { let n = 0; for (const st of strips) if (emptyStrip(st)) n++; if (n >= 3 && a(54, 20) === 0 && a(50, 16) === 0) slim = true; }   // three of four (a left-arm strip painted over by mistake)
  if (!legacy && !slim) {
    // some editors fill the unused strips with one flat colour: all four strips that one colour, and it isn't simply the
    // arm's own colour carrying on (a plain-coloured classic arm is uniform there too, and must stay classic)
    const c = (x, y) => { const i = (y * cv.width + x) * 4; return (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]; };
    const c0 = c(54, 20);
    const flatStrip = ([x0, y0, w, h]) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (c(x, y) !== c0 || a(x, y) !== a(54, 20)) return false; return true; };
    slim = strips.every(flatStrip) && c(53, 25) !== c0 && c(45, 57) !== c0 && c(52, 25) !== c0;
  }
  return { canvas: cv, legacy, slim };
}
function readSkinFile(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error('Could not read that file.'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => rej(new Error('That file is not a PNG image.'));
      img.onload = () => { try { const n = normalizeSkinImage(img); res(n.canvas.toDataURL('image/png')); } catch (e) { rej(e); } };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

// ---- skinned geometry ----------------------------------------------------------
// One textured box using the Minecraft skin UV layout (u,v = top-left of the
// box's net; w,h,d in pixels). Face orientation follows the character: front
// is -Z, the character's right side is +X.
// `slice` [from, to] (0 = top, 1 = bottom) keeps just that band of the sides, for limbs in two pieces.
function addSkinBox(mb, min, max, u, v, w, h, d, TW, TH, mirror, slice) {
  const R = { top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, h], front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + d + w + d, v + d, w, h] };
  if (mirror) { const t = R.right; R.right = R.left; R.left = t; }
  if (slice) for (const k of ['right', 'front', 'left', 'back']) { const r = R[k]; R[k] = [r[0], r[1] + slice[0] * h, r[2], (slice[1] - slice[0]) * h]; }
  // per face: which rect, and how a corner (cx,cy,cz in 0/1) maps to (s,t) in 0..1
  const F = [
    { r: 'right', s: (c) => 1 - c[2], t: (c) => 1 - c[1] },   // +X, viewed from +X: left edge = back (+Z)
    { r: 'left', s: (c) => c[2], t: (c) => 1 - c[1] },        // -X
    { r: 'top', s: (c) => 1 - c[0], t: (c) => 1 - c[2] },     // +Y: left = +X, bottom edge = front
    { r: 'bottom', s: (c) => 1 - c[0], t: (c) => c[2] },      // -Y
    { r: 'back', s: (c) => c[0], t: (c) => 1 - c[1] },        // +Z
    { r: 'front', s: (c) => 1 - c[0], t: (c) => 1 - c[1] },   // -Z: left edge = character's right
  ];
  for (let f = 0; f < 6; f++) {
    if (slice && ((f === 2 && slice[0] > 0) || (f === 3 && slice[1] < 1))) continue;   // the cut faces are inside the limb
    const face = FACES[f], m = F[f], rect = R[m.r];
    const vs = [];
    for (let k = 0; k < 4; k++) {
      const c = face.c[k];
      let s = m.s(c); if (mirror) s = 1 - s;
      const tt = m.t(c);
      vs.push(mb.vert(c[0] ? max[0] : min[0], c[1] ? max[1] : min[1], c[2] ? max[2] : min[2],
        (rect[0] + s * rect[2]) / TW, (rect[1] + tt * rect[3]) / TH, 255, 0, Math.round(Math.min(1, face.shade + 0.1) * 255)));
    }
    mb.quad(vs[0], vs[1], vs[2], vs[3], false);
  }
}

// Build the six animated parts (+ overlay layers) for a skin layout.
// (0.9.0.12) The outer layer in 3D: every pixel of the hat, jacket, sleeves and trousers layer stands
// out from the body as a little block of its own (like the 3D skin layers mods), so hair, hoods,
// collars and cuffs have real depth. `px` is the skin's pixels; mn/mx the base box (blocks).
const SKIN_FD = [
  { r: 'right', n: 0, hi: true, sA: 2, sI: true, tA: 1, tI: true }, { r: 'left', n: 0, hi: false, sA: 2, sI: false, tA: 1, tI: true },
  { r: 'top', n: 1, hi: true, sA: 0, sI: true, tA: 2, tI: true }, { r: 'bottom', n: 1, hi: false, sA: 0, sI: true, tA: 2, tI: false },
  { r: 'back', n: 2, hi: true, sA: 0, sI: false, tA: 1, tI: true }, { r: 'front', n: 2, hi: false, sA: 0, sI: true, tA: 1, tI: true },
];
function addSkinVoxels(mb, mn, mx, u, v, w, h, d, TW, TH, px, slice, depth, pred) {
  const R = { top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, h], front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + d + w + d, v + d, w, h] };
  const o0 = 0.12 * PX, o1 = depth * PX;
  // (0.9.0.53) which pixels: the solid ones, or (a pass of their own, blended) the see-through ones Minecraft draws too
  const ok = pred || ((al) => al >= 128);
  const A = (x, y) => x >= 0 && y >= 0 && x < TW && y < TH && ok(px[(y * TW + x) * 4 + 3]);
  for (let fi = 0; fi < 6; fi++) {
    const fd = SKIN_FD[fi];
    if (slice && ((fi === 2 && slice[0] > 0) || (fi === 3 && slice[1] < 1))) continue;
    let [rx, ry, rw, rh] = R[fd.r];
    let t0f = 0, t1f = 1;
    if (slice && fi !== 2 && fi !== 3) { const a = Math.round(slice[0] * rh), b = Math.round(slice[1] * rh); ry += a; rh = b - a; }
    const at = (ax, inv, f) => inv ? mx[ax] - f * (mx[ax] - mn[ax]) : mn[ax] + f * (mx[ax] - mn[ax]);
    const sgn = fd.hi ? 1 : -1, base = fd.hi ? mx[fd.n] : mn[fd.n];
    for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) {
      if (!A(rx + i, ry + j)) continue;
      const lo = [0, 0, 0], hi = [0, 0, 0];
      let sa = at(fd.sA, fd.sI, i / rw), sb = at(fd.sA, fd.sI, (i + 1) / rw), ta = at(fd.tA, fd.tI, j / rh), tb = at(fd.tA, fd.tI, (j + 1) / rh);
      // pixels on the edge of the face reach out to the corner, so the layer closes round the edges
      const ext = (val, edge) => edge ? val + (val >= (mn[fd.sA] + mx[fd.sA]) / 2 ? o1 : -o1) : val;
      const extT = (val, edge) => edge ? val + (val >= (mn[fd.tA] + mx[fd.tA]) / 2 ? o1 : -o1) : val;
      // (each corner belongs to one face only, so no two little blocks ever overlap there: overlapping faces flicker)
      const ownS = fd.n === 2, ownT = fd.n !== 1;      // front/back reach round the sides; sides, front and back reach up and down; top and bottom stay put
      if (ownS && i === 0) sa = ext(sa, true); if (ownS && i === rw - 1) sb = ext(sb, true);
      if (ownT && j === 0 && (!slice || slice[0] === 0)) ta = extT(ta, true);
      if (ownT && j === rh - 1 && (!slice || slice[1] === 1)) tb = extT(tb, true);
      lo[fd.sA] = Math.min(sa, sb); hi[fd.sA] = Math.max(sa, sb);
      lo[fd.tA] = Math.min(ta, tb); hi[fd.tA] = Math.max(ta, tb);
      lo[fd.n] = Math.min(base + sgn * o0, base + sgn * o1); hi[fd.n] = Math.max(base + sgn * o0, base + sgn * o1);
      const U = (rx + i + 0.5) / TW, V = (ry + j + 0.5) / TH;
      // which sides of this little block are covered by its neighbours on the same face
      for (let f = 0; f < 6; f++) {
        const F = FACES[f], ax = f >> 1, pos = (f & 1) === 0;
        if (ax === fd.n && pos !== fd.hi) continue;                         // the side against the body is never seen
        if (ax === fd.sA) { const di = (pos ? 1 : -1) * (fd.sI ? -1 : 1), ni = i + di; if (ni >= 0 && ni < rw && A(rx + ni, ry + j)) continue; }
        if (ax === fd.tA) { const dj = (pos ? 1 : -1) * (fd.tI ? -1 : 1), nj = j + dj; if (nj >= 0 && nj < rh && A(rx + i, ry + nj)) continue; }
        const vs = F.c.map(c => mb.vert(c[0] ? hi[0] : lo[0], c[1] ? hi[1] : lo[1], c[2] ? hi[2] : lo[2], U, V, 255, 0, Math.round(Math.min(1, F.shade + 0.1) * 255)));
        mb.quad(vs[0], vs[1], vs[2], vs[3], false);
      }
    }
  }
}
function buildSkinParts(gl, slim, legacy, canvas) {
  const px = canvas ? (canvas.getContext ? canvas.getContext('2d').getImageData(0, 0, 64, legacy ? 32 : 64).data : canvas) : null;   // the skin's pixels (read before it goes to the GPU: reading back is slow)
  const TW = 64, TH = legacy ? 32 : 64;
  const aw = slim ? 3 : 4;
  // [name, pivot(px), min(px), max(px), u, v, w, h, d, overlayUV|null, mirror]
  const defs = [
    ['head', [0, 24, 0], [-4, 24, -4], [4, 32, 4], 0, 0, 8, 8, 8, [32, 0], false],
    ['body', [0, 12, 0], [-4, 12, -2], [4, 24, 2], 16, 16, 8, 12, 4, legacy ? null : [16, 32], false],
    ['armR', [4 + aw / 2, 22, 0], [4, 12, -2], [4 + aw, 24, 2], 40, 16, aw, 12, 4, legacy ? null : [40, 32], false],
    ['armL', [-4 - aw / 2, 22, 0], [-4 - aw, 12, -2], [-4, 24, 2], legacy ? 40 : 32, legacy ? 16 : 48, aw, 12, 4, legacy ? null : [48, 48], legacy],
    ['legR', [2, 12, 0], [0, 0, -2], [4, 12, 2], 0, 16, 4, 12, 4, legacy ? null : [0, 32], false],
    ['legL', [-2, 12, 0], [-4, 0, -2], [0, 12, 2], legacy ? 0 : 16, legacy ? 16 : 48, 4, 12, 4, legacy ? null : [0, 48], legacy],
  ];
  const parts = {};
  const make = (name, pv, mn, mx, u, v, w, h, d, ov, mirror, slice, tr) => {
    const mb = new MeshBuilder(64), mo = new MeshBuilder(256), mt = new MeshBuilder(64);
    const rel = (p, grow) => [(p[0] - pv[0]) * PX, (p[1] - pv[1]) * PX, (p[2] - pv[2]) * PX].map((q, i) => q + grow[i] * PX);
    addSkinBox(mb, rel(mn, [0, 0, 0]), rel(mx, [0, 0, 0]), u, v, w, h, d, TW, TH, mirror, slice);
    if (ov && px) {
      const dep = name === 'head' ? 1.1 : 0.8;
      addSkinVoxels(mo, rel(mn, [0, 0, 0]), rel(mx, [0, 0, 0]), ov[0], ov[1], w, h, d, TW, TH, px, slice, dep, (al) => al >= 200);   // its own mesh: hidden under armour
      // (0.9.0.54) the see-through pixels are blended, so the halves of an arm or leg mustn't both draw the two rows
      // they share at the joint (that made a darker band at the elbows and knees): each draws only its own half
      const T = tr || { mn, mx, slice };
      addSkinVoxels(mt, rel(T.mn, [0, 0, 0]), rel(T.mx, [0, 0, 0]), ov[0], ov[1], w, h, d, TW, TH, px, T.slice, dep, (al) => al >= 26 && al < 200);
    }
    else if (ov) {
      const gr = name === 'head' ? 0.5 : 0.25;
      addSkinBox(mb, rel(mn, [-gr, slice && slice[1] < 1 ? 0 : -gr, -gr]), rel(mx, [gr, slice && slice[0] > 0 ? 0 : gr, gr]), ov[0], ov[1], w, h, d, TW, TH, false, slice);
    }
    const r = mb.result(), ro = mo.result(), rt = mt.result();
    parts[name] = { pivot: pv.map(q => q * PX), mesh: makeVAO(gl, r.verts, r.idx), ovl: ro && ro.idx.length ? makeVAO(gl, ro.verts, ro.idx) : null, ovlT: rt && rt.idx.length ? makeVAO(gl, rt.verts, rt.idx) : null };
  };
  for (const [name, pv, mn, mx, u, v, w, h, d, ov, mirror] of defs) {
    make(name, pv, mn, mx, u, v, w, h, d, ov, mirror);
    // arms and legs also come in two pieces (upper and lower) so elbows and knees can bend
    if (name.startsWith('arm') || name.startsWith('leg')) {
      // (0.9.0.53) the two halves overlap by two pixels at the joint, so a bent elbow or knee never opens a gap into the
      // hollow limb (straight, the overlap is the same pixels in the same place, so it can't be seen)
      const mid = (mn[1] + mx[1]) / 2, ovl = 2;
      make(name + '_u', pv, [mn[0], mid - ovl, mn[2]], mx, u, v, w, h, d, ov, mirror, [0, 0.5 + ovl / h], { mn: [mn[0], mid, mn[2]], mx, slice: [0, 0.5] });
      make(name + '_d', [pv[0], mid, pv[2]], mn, [mx[0], mid + ovl, mx[2]], u, v, w, h, d, ov, mirror, [0.5 - ovl / h, 1], { mn, mx: [mx[0], mid, mx[2]], slice: [0.5, 1] });
    }
  }
  return parts;
}

// (0.9.0.12) A face that moves: eyelids that blink (and stay shut in sleep), and for villagers a mouth that
// opens and closes while they talk. The lid is the row above the eyes drawn down over them, so it's the
// skin's own colour whatever the skin is.
function skinFace(gl, skin) {
  if (skin.faceMeshes !== undefined) return skin.faceMeshes;
  let f = skin.face;
  if (!f && skin.px) {
    // a skin of someone's own: find the row of the eyes (the row of the face that stands out most from the skin)
    const px = skin.px, col = (i, j) => { const o = ((8 + j) * 64 + 8 + i) * 4; return [px[o], px[o + 1], px[o + 2]]; };
    const sk = col(0, 6), score = (j) => { let n = 0; for (let i = 0; i < 8; i++) { const c = col(i, j); n += Math.abs(c[0] - sk[0]) + Math.abs(c[1] - sk[1]) + Math.abs(c[2] - sk[2]) > 90 ? 1 : 0; } return n; };
    let best = 4, bs = -1; for (const j of [3, 4, 5]) { const sc = score(j); if (sc > bs) { bs = sc; best = j; } }
    f = { eye: best };
  }
  if (!f) return (skin.faceMeshes = null);
  const TH = skin.legacy ? 32 : 64, z = -4 * PX - 0.1 * PX;      // far enough off the face not to flicker against it
  const quad = (mb, x0, x1, y0, y1, u0, u1, v0, v1, sh) => {
    const vs = [[x1, y0, u0, v1], [x0, y0, u1, v1], [x0, y1, u1, v0], [x1, y1, u0, v0]].map(q => mb.vert(q[0], q[1], z, q[2], q[3], 255, 0, sh));
    mb.quad(vs[0], vs[1], vs[2], vs[3], false);
  };
  const lid = new MeshBuilder(16), e = f.eye;
  quad(lid, -4 * PX, 4 * PX, (7 - e) * PX, (8 - e) * PX, 8 / 64, 16 / 64, (8 + e + 1) / TH, (8 + e + 2) / TH, 228);   // the row under the eyes (cheeks), drawn up over them
  const out = { lid: null, mouth: null, seed: (skin.key || '').length * 1.7 % 5, period: 3.4 + ((skin.key || '').charCodeAt(5) || 0) % 5 * 0.4 };
  let r = lid.result(); out.lid = makeVAO(gl, r.verts, r.idx);
  if (f.mouth !== undefined) {
    const mo = new MeshBuilder(16), m = f.mouth, [a, b] = f.mx || [2, 6];
    const u = (8 + 3.5) / 64, v = (8 + m + 0.5) / TH;
    quad(mo, (4 - b) * PX, (4 - a) * PX, (6 - m) * PX, (8 - m) * PX - 0.35 * PX, u, u, v, v, 92);
    r = mo.result(); out.mouth = makeVAO(gl, r.verts, r.idx);
  }
  return (skin.faceMeshes = out);
}

// (0.9.0.17) A skin reference is the picture, with '#slim' or '#classic' on the end when the player has said
// which arms it's drawn for (Alex's three-pixel arms or Steve's four); without one, the picture is looked at.
function skinRef(profile) { return profile && profile.skin ? profile.skin + (profile.arms === 'slim' || profile.arms === 'classic' ? '#' + profile.arms : '') : null; }
function skinArms(ref) { const m = ref && /#(slim|classic)$/.exec(ref); return m ? [ref.slice(0, -m[0].length), m[1]] : [ref, null]; }
// Returns (and caches) the GL resources for a skin data URL (or null = default).
function getSkin(gl, dataURL) {
  const key = dataURL || 'default';
  const [src, arms] = skinArms(dataURL);
  let s = SKINS.get(key);
  if (s) return s;
  s = { ready: false, key };
  SKINS.set(key, s);
  const finish = (canvas, slim, legacy) => {
    const px = canvas.getContext('2d').getImageData(0, 0, 64, legacy ? 32 : 64).data;
    // (0.9.0.54) an old 64x32 skin with its hat area painted solid all over (old editors filled it): Minecraft leaves
    // that hat off rather than putting a box over the head, and so does this
    if (legacy) {
      let solidHat = true;
      for (let y = 0; y < 16 && solidHat; y++) for (let x = 32; x < 64; x++) if (px[(y * 64 + x) * 4 + 3] < 128) { solidHat = false; break; }
      if (solidHat) for (let y = 0; y < 16; y++) for (let x = 32; x < 64; x++) px[(y * 64 + x) * 4 + 3] = 0;
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // (0.9.0.53) the base layer is solid, the way Minecraft draws it: a transparent pixel there is its colour (usually
    // black), never a hole into the limb. Only the outer layer can be see-through.
    const TH = legacy ? 32 : 64, solid = new Uint8Array(px);
    const isBase = (x, y) => legacy ? !(y < 16 && x >= 32) : (y < 16 ? x < 32 : y < 32 ? x < 56 : y >= 48 && x >= 16 && x < 48);
    for (let y = 0; y < TH; y++) for (let x = 0; x < 64; x++) if (isBase(x, y)) solid[(y * 64 + x) * 4 + 3] = 255;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 64, TH, 0, gl.RGBA, gl.UNSIGNED_BYTE, solid);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    Object.assign(s, { canvas, px, tex, slim, legacy, parts: buildSkinParts(gl, slim, legacy, px), ready: true });
  };
  if (!dataURL) { finish(paintDefaultSkin(), false, false); return s; }
  const img = new Image();
  img.onload = () => { try { const n = normalizeSkinImage(img); finish(n.canvas, arms && !n.legacy ? arms === 'slim' : n.slim, n.legacy); } catch (e) { SKINS.delete(key); } };
  img.onerror = () => SKINS.delete(key);
  img.src = src;
  return s;
}

// Flat front view of a skin for menus (character preview).
function drawSkinPreview(cv, dataURL, armor) {
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, cv.width, cv.height);
  const paint = (src, legacy, slim) => {
    const S = Math.floor(Math.min(cv.width / 16, cv.height / 32));
    const ox = Math.floor((cv.width - 16 * S) / 2), oy = Math.floor((cv.height - 32 * S) / 2);
    const aw = slim ? 3 : 4;
    const blit = (sx, sy, w, h, dx, dy, flip) => {
      g.save();
      if (flip) { g.translate(ox + (dx + w) * S, oy + dy * S); g.scale(-1, 1); g.drawImage(src, sx, sy, w, h, 0, 0, w * S, h * S); }
      else g.drawImage(src, sx, sy, w, h, ox + dx * S, oy + dy * S, w * S, h * S);
      g.restore();
    };
    blit(8, 8, 8, 8, 4, 0); blit(40, 8, 8, 8, 4, 0);            // face + hat
    blit(20, 20, 8, 12, 4, 8);                                     // body
    blit(44, 20, aw, 12, 4 - aw, 8);                               // right arm (viewer's left)
    if (legacy) blit(44, 20, aw, 12, 12, 8, true); else blit(36, 52, aw, 12, 12, 8);
    blit(4, 20, 4, 12, 4, 20);                                     // right leg
    if (legacy) blit(4, 20, 4, 12, 8, 20, true); else blit(20, 52, 4, 12, 8, 20);
    if (!legacy) { blit(20, 36, 8, 12, 4, 8); blit(44, 36, aw, 12, 4 - aw, 8); blit(52, 52, aw, 12, 12, 8); blit(4, 36, 4, 12, 4, 20); blit(4, 52, 4, 12, 8, 20); }
    // (0.9.0.12) and whatever armour you wear, over it
    if (armor && ATLAS.pixels) {
      const tileCv = (name, col) => {
        const t = ATLAS.tile[name]; if (t === undefined) return null;
        const tx = (t % ATLAS_TILES) * TILE, ty = Math.floor(t / ATLAS_TILES) * TILE, c = document.createElement('canvas'); c.width = TILE; c.height = TILE;
        const id = c.getContext('2d').createImageData(TILE, TILE), P = ATLAS.pixels.data;
        for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const o = ((ty + y) * ATLAS_SIZE + tx + x) * 4, q = (y * TILE + x) * 4; id.data[q] = col ? P[o] * col[0] / 255 : P[o]; id.data[q + 1] = col ? P[o + 1] * col[1] / 255 : P[o + 1]; id.data[q + 2] = col ? P[o + 2] * col[2] / 255 : P[o + 2]; id.data[q + 3] = P[o + 3]; }
        c.getContext('2d').putImageData(id, 0, 0); return c;
      };
      const put = (cvs, dx, dy, w, h) => { if (cvs) g.drawImage(cvs, 0, 0, TILE, TILE, ox + dx * S, oy + dy * S, w * S, h * S); };
      // (0.9.0.15) the resource pack's own armour pictures, where it has them (render/packarmor.js)
      const putP = (src, sx, sy, sw, sh, dx, dy, dw, dh, flip) => {
        g.save();
        if (flip) { g.translate(ox + (dx + dw) * S, oy + dy * S); g.scale(-1, 1); g.drawImage(src, sx, sy, sw, sh, 0, 0, dw * S, dh * S); }
        else g.drawImage(src, sx, sy, sw, sh, ox + dx * S, oy + dy * S, dw * S, dh * S);
        g.restore();
      };
      const packed = typeof packArmorDoll === 'function' ? packArmorDoll(armor, putP, aw) : [];
      const piece = (id, fn) => { if (!id || packed[armor.indexOf(id)]) return; const [pid, colH] = String(id).split('#'), col = colH ? hexRGB('#' + colH) : null, mat = armorMat(pid); fn('armor_' + mat, col, mat); };
      piece(armor[3], (t, c) => { const cv2 = tileCv(t, c); put(cv2, 3.7, 28, 4.3, 4.2); put(cv2, 8, 28, 4.3, 4.2); });
      piece(armor[2], (t, c) => { const cv2 = tileCv(t, c); put(cv2, 3.7, 18, 8.6, 3.4); put(cv2, 3.7, 20, 4.3, 6.5); put(cv2, 8, 20, 4.3, 6.5); });
      piece(armor[1], (t, c) => { const cv2 = tileCv(t, c); put(cv2, 3.6, 8, 8.8, 12.4); put(cv2, 4 - aw - 0.5, 8, aw + 0.6, 6.5); put(cv2, 12, 8, aw + 0.6, 6.5); });
      piece(armor[0], (t, c, mat) => { const cv2 = tileCv('armor_' + mat + '_face', c) || tileCv(t, c); put(cv2, 3.5, -0.5, 9, 9); });
    }
  };
  if (!dataURL) { paint(paintDefaultSkin(), false, false); return; }
  const img = new Image();
  const [src, arms] = skinArms(dataURL);
  img.onload = () => { try { const n = normalizeSkinImage(img); paint(n.canvas, n.legacy, arms && !n.legacy ? arms === 'slim' : n.slim); } catch (e) { /* ignore */ } };
  img.src = src;
}

// How a flat item sits in a fist (arm space: the arm hangs down -y, the chest faces -z).
// Tools are drawn bottom-left (grip) to top-right (head), so the picture is turned to put the
// grip in the fist and the head out in front, tilted up a little, with the cutting side of an
// axe or hoe facing forward and down — the way you'd swing it. Other things are held upright.
function heldMatrix(tilt, scale, grip, upright) {
  const s = scale, r2 = Math.SQRT1_2;
  let X, Y;
  if (upright) { X = [0, 0, -s]; Y = [0, s * Math.cos(tilt), -s * Math.sin(tilt)]; }
  else {
    const F = [0, Math.sin(tilt), -Math.cos(tilt)], Bn = [0, -Math.cos(tilt), -Math.sin(tilt)];
    X = F.map((f, i) => (f - Bn[i]) * r2 * s); Y = F.map((f, i) => (f + Bn[i]) * r2 * s);
  }
  const Z = [s, 0, 0];
  const t = [0, 1, 2].map(i => -(grip[0] * X[i] + grip[1] * Y[i]));
  return new Float32Array([X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, t[0], t[1], t[2], 1]);
}
// sizes from the original's item display settings: tools 0.85 of a block in the hand, other items 0.55
const HELD_TOOL = heldMatrix(0.25, 0.85, [-0.34, -0.24], false);
const HELD_ITEM = heldMatrix(0.2, 0.55, [0, -0.25], true);
// (0.9.0.19) a fishing rod is held up at an angle, out in front, its line hanging from the tip
const HELD_ROD = heldMatrix(0.75, 0.85, [-0.34, -0.24], false);
const isRod = (id) => id === 'fishing_rod' || id === 'fishing_rod_cast';
function heldMesh(gl, id) { return itemMesh(gl, id === 'fishing_rod' ? 'fishing_rod_tp' : id); }
function heldMat(id) { return isRod(id) ? HELD_ROD : isHandheld(id) ? HELD_TOOL : HELD_ITEM; }
const HANDHELD_TYPES = new Set(['pickaxe', 'axe', 'shovel', 'sword', 'hoe']);
function isHandheld(id) {
  const d = itemDef(id);
  return !!d && ((d.tool && HANDHELD_TYPES.has(d.tool.type)) || /stick|rod|wand|spear|staff|trident|mace/.test(d.key));
}

// ---- Mo' Bends-style movement for players: knees, elbows, a twist in the body ----------------
function avatarAnim(pose) {
  const a = pose.walkAmt || 0, ph = pose.walk || 0, t = pose.time || 0;
  const run = pose.sprint ? 1 : 0, idle = 1 - a;
  const sL = Math.sin(ph), cL = Math.cos(ph), amp = (0.75 + 0.3 * run) * a;
  const A = { body: [0, 0, 0], head: [0, 0, 0], armR: [0, 0, 0], foreR: [0, 0, 0], armL: [0, 0, 0], foreL: [0, 0, 0], legR: [0, 0, 0], shinR: [0, 0, 0], legL: [0, 0, 0], shinL: [0, 0, 0], lift: 0 };
  A.legR[0] = sL * amp; A.legL[0] = -sL * amp;
  A.shinR[0] = -a * (0.08 + (0.8 + 0.4 * run) * Math.max(0, cL));
  A.shinL[0] = -a * (0.08 + (0.8 + 0.4 * run) * Math.max(0, -cL));
  A.armR = [-sL * amp * 0.8, 0, (0.05 + Math.sin(t * 1.3) * 0.03) * idle]; A.armL = [sL * amp * 0.8, 0, -(0.05 + Math.sin(t * 1.3) * 0.03) * idle];
  A.foreR[0] = A.foreL[0] = 0.1 + 0.45 * run * a + 0.06 * idle;
  A.body = [-0.2 * run * a, sL * 0.1 * a, 0];
  A.lift = (1 - Math.abs(sL)) * 0.045 * a + Math.sin(t * 1.9) * 0.004 * idle;
  // (0.9.0.12) standing about: a slow shift of weight from foot to foot, the shoulders rising with each breath
  A.body[2] += Math.sin(t * 0.55) * 0.025 * idle; A.body[0] += Math.sin(t * 1.9) * 0.012 * idle;
  A.legR[2] = (A.legR[2] || 0) + Math.sin(t * 0.55) * 0.02 * idle; A.legL[2] = (A.legL[2] || 0) + Math.sin(t * 0.55) * 0.02 * idle;
  if (pose.held && !pose.carry) A.armR[0] = A.armR[0] * 0.5 + 0.31;
  if (pose.off && !pose.carry) A.armL[0] = A.armL[0] * 0.5 + 0.31;
  // off the ground: knees up; falling hard: arms up
  if (pose.air && !pose.swim && !pose.sit) {
    const fall = clamp(-(pose.vy || 0) / 12, 0, 1);
    A.legR = [0.55, 0, 0.05]; A.shinR = [-1.0, 0, 0]; A.legL = [-0.15, 0, -0.05]; A.shinL = [-0.4, 0, 0];
    if (!pose.held) A.armR = [0.3 + fall * 2.2, 0, 0.3 + fall * 0.5];
    if (!pose.off) A.armL = [0.3 + fall * 2.2, 0, -0.3 - fall * 0.5];
  }
  if (pose.land > 0) { const k = pose.land / 0.2; A.lift -= 0.1 * k; A.legR[0] += 0.5 * k; A.legL[0] += 0.5 * k; A.shinR[0] -= 1 * k; A.shinL[0] -= 1 * k; A.body[0] -= 0.25 * k; }
  // swinging a tool: the arm comes up and over, the body twists into it
  // (Minecraft's attack swing: a quick chop that eases out, the body twisting with it, aimed where you look)
  const at = pose.swing || 0;
  if (at > 0) {
    const tw = Math.sin(Math.sqrt(at) * TAU) * 0.2;
    let f = 1 - at; f *= f; f *= f; f = 1 - f;
    const f2 = Math.sin(f * Math.PI), f3 = Math.sin(at * Math.PI) * ((pose.headPitch || 0) + 0.7) * 0.75;
    A.body[1] -= tw;
    A.armR[0] += f2 * 1.2 + f3; A.armR[1] -= tw * 2; A.armR[2] -= Math.sin(at * Math.PI) * 0.4;
    A.armL[1] -= tw; A.armL[0] -= tw;
    A.foreR[0] += f2 * 0.25;
  }
  if (pose.bow > 0) {
    // the bow arm straight out at the target; the drawing hand pulls back to the cheek
    const k = Math.min(1, pose.bow), tr = k >= 0.95 ? Math.sin((pose.time || 0) * 47) * 0.012 : 0;
    A.armL = [1.52 + tr, 0.1 + 0.08 * k, 0]; A.foreL = [0.04, 0, 0];
    A.armR = [1.45, -0.45 - 0.25 * k, 0]; A.foreR = [0.1 + 0.15 * k, 0, -1.1 * k];
    A.body = [(A.body ? A.body[0] : 0), (A.body ? A.body[1] : 0) + 0.18 * k, 0];
  }
  if (pose.eat > 0) { A.armR = [1.15 + Math.sin(t * 22) * 0.12, -0.35, 0]; A.foreR = [0.9, 0, 0]; }
  if (pose.carry) { A.armR = [1.25, 0, 0.05]; A.armL = [1.25, 0, -0.05]; A.foreR = [0.3, 0, 0]; A.foreL = [0.3, 0, 0]; }
  if (pose.castWind > 0) { const k = Math.sin(pose.castWind * Math.PI / 2); A.armR = [0.6 + 2.3 * k, -0.15, 0.12]; A.foreR = [0.35 * k, 0, 0]; A.body[1] -= 0.2 * k; }   // winding back to cast
  if (pose.sneak) { A.body[0] = -0.45; A.legR[0] += 0.2; A.legL[0] += 0.2; A.shinR[0] -= 0.4; A.shinL[0] -= 0.4; A.lift -= 0.12; }
  if (pose.hang || pose.climb) {
    // up on a ledge: arms reaching up, legs hanging (then swinging up as you pull over)
    const k = pose.climb || 0;
    A.armR = [2.9 - k * 1.6, 0, 0.18]; A.armL = [2.9 - k * 1.6, 0, -0.18]; A.foreR = [0.15, 0, 0]; A.foreL = [0.15, 0, 0];
    A.legR = [0.15 + k * 1.2, 0, 0.04]; A.legL = [-0.05 + k * 0.4, 0, -0.04]; A.shinR = [-0.2 - k * 1.2, 0, 0]; A.shinL = [-0.1, 0, 0];
    A.body = [-0.1 - k * 0.4, 0, 0];
  }
  if (pose.sit) { A.legR = [1.4, 0, 0.1]; A.legL = [1.4, 0, -0.1]; A.shinR = [-1.4, 0, 0]; A.shinL = [-1.4, 0, 0]; }
  if (pose.swim) {
    // (0.9.0.15) the fast swim, lying flat: a front crawl, each arm going round in turn (forward, down and
    // back under you, then up over your back and forward again), the body rolling with it, legs fluttering
    const sp = pose.swimPh !== undefined ? pose.swimPh : ph * 0.9;
    const arm = (th, side) => {
      const u = ((th % TAU) + TAU) % TAU, rec = u > Math.PI ? Math.sin(u - Math.PI) : 0;
      return { a: [Math.PI - u, 0, side * (0.18 + 0.32 * rec)], f: [0.12 + 1.0 * rec, 0, 0] };
    };
    const R = arm(sp, 1), Lf = arm(sp + Math.PI, -1);
    A.armR = R.a; A.foreR = R.f; A.armL = Lf.a; A.foreL = Lf.f;
    const k = Math.sin(sp * 3) * 0.32;
    A.legR = [k, 0, 0.04]; A.legL = [-k, 0, -0.04]; A.shinR = [-0.18 - Math.max(0, Math.cos(sp * 3)) * 0.2, 0, 0]; A.shinL = [-0.18 - Math.max(0, -Math.cos(sp * 3)) * 0.2, 0, 0];
    A.body = [0, Math.sin(sp) * 0.28, 0];
  } else if (pose.paddle && !pose.sit) {
    // (0.9.0.15) out of your depth: treading water when still (arms sculling out at your sides, legs
    // turning slowly beneath you), a breaststroke when you swim along (reach, sweep out and round, kick)
    const sp = pose.swimPh || 0, mv = clamp(pose.swimMv || 0, 0, 1), u = ((sp % TAU) + TAU) % TAU;
    const mix = (a, b) => a.map((v, i) => v + (b[i] - v) * mv);
    const sw = Math.sin(u), reach = Math.max(0, Math.cos(u)), out = Math.max(0, sw), rec = Math.max(0, -sw);
    const tArmR = [0.45 + Math.sin(sp * 1.3) * 0.12, 0, 0.75 + Math.sin(sp) * 0.18], tFore = [0.55 + Math.sin(sp * 1.3 + 1) * 0.2, 0, 0];
    const bArmR = [1.25 + reach * 0.85 - rec * 0.3, 0, 0.12 + out * 0.75], bFore = [0.2 + rec * 1.1, 0, 0];
    A.armR = mix(tArmR, bArmR); A.foreR = mix(tFore, bFore);
    A.armL = [A.armR[0], -A.armR[1], -A.armR[2]]; A.foreL = A.foreR.slice();
    // legs: slow alternating kicks treading, a frog kick swimming along
    const kick = (1 + Math.sin(u + 0.6)) / 2;
    const tLegR = [0.3 + Math.sin(sp) * 0.3, 0, 0.12], tShinR = [-0.6 - Math.cos(sp) * 0.3, 0, 0];
    const tLegL = [0.3 - Math.sin(sp) * 0.3, 0, -0.12], tShinL = [-0.6 + Math.cos(sp) * 0.3, 0, 0];
    const bLegR = [0.15 + kick * 0.55, 0, 0.08 + kick * 0.3], bShin = [-0.15 - kick * 1.1, 0, 0], bLegL = [0.15 + kick * 0.55, 0, -0.08 - kick * 0.3];
    A.legR = mix(tLegR, bLegR); A.legL = mix(tLegL, bLegL); A.shinR = mix(tShinR, bShin); A.shinL = mix(tShinL, bShin);
    A.body = [-0.15 - mv * 0.85, 0, 0];
    A.lift = Math.sin(sp * (1 + mv)) * 0.035;
  }
  // the head keeps looking where the player looks, whatever the body does
  A.head = [(pose.swim ? 0.9 : (pose.headPitch || 0)) - A.body[0], -A.body[1], 0];
  return A;
}

// Armour drawn over the body: plates a little bigger than the limb they cover.
const ARMOR_MESHES = {};
function armorMat(id) { const m = String(id || '').split('_')[0]; return ARMOR_MATS[m] ? m : 'iron'; }
function armorMeshes(gl, mat, aw) {
  const key = mat + aw;
  if (ARMOR_MESHES[key]) return ARMOR_MESHES[key];
  const tile = 'armor_' + mat, face = 'armor_' + mat + '_face';
  const mk = (box, tex) => { const mb = new MeshBuilder(32); addBox(mb, box.slice(0, 3).map(v => v * PX), box.slice(3).map(v => v * PX), tilesOf(tex)); const r = mb.result(); return makeVAO(gl, r.verts, r.idx); };
  const h = aw / 2;
  return (ARMOR_MESHES[key] = {
    helmet: mk([-4.6, -0.6, -4.6, 4.6, 8.6, 4.6], { all: tile, front: face }),
    chest: mk([-4.6, 0.4, -2.6, 4.6, 12.6, 2.6], tile),
    pad: mk([-h - 0.6, -4.3, -2.6, h + 0.6, 2.6, 2.6], tile),
    cuff: mk([-h - 0.45, -6.3, -2.45, h + 0.45, 0.3, 2.45], tile),        // the sleeve of the chestplate down the forearm
    waist: mk([-4.4, -0.3, -2.4, 4.4, 3.4, 2.4], tile),
    thigh: mk([-2.5, -6, -2.5, 2.5, 0.3, 2.5], tile),
    knee: mk([-2.5, -3, -2.5, 2.5, 0, 2.5], tile),
    boot: mk([-2.65, -6.4, -2.65, 2.65, -2.5, 2.65], tile),
  });
}

// A first-person arm (the hand view, a map held up): the skin's arm with its sleeve layer, or, under a
// chestplate, the chestplate's sleeve over it, the way the armour looks on you in third person. m is the
// arm's frame at the shoulder.
function fpArmDraws(out, gl, skin, side, m, chest) {
  const part = skin.parts[side < 0 ? 'armL' : 'armR'], n0 = out.length;
  fpArmDrawsInner(out, gl, skin, side, m, chest, part);
  if (part.ovlT && !(chest && !(typeof packArmorKit === 'function' && packArmorKit(gl, armorMat(String(chest).split('#')[0]), String(chest).split('#')[1])))) out.push({ mesh: part.ovlT, m, tex: skin.tex, alpha: 0.999 });
  return out.length - n0;
}
// how many draws fpArmDraws makes for this arm (a held map takes the hand view's arm away by count)
function fpArmCount(gl, skin, side, chest) { const tmp = []; return fpArmDraws(tmp, gl, skin, side, Mat4.create(), chest); }
function fpArmDrawsInner(out, gl, skin, side, m, chest, part) {
  out.push({ mesh: part.mesh, m, tex: skin.tex });
  if (chest) {
    const [pid, col] = String(chest).split('#'), c = col ? hexRGB('#' + col) : null, tint = c ? [c[0] / 255, c[1] / 255, c[2] / 255, 0.6] : null;
    const mat = armorMat(pid), pk = typeof packArmorKit === 'function' ? packArmorKit(gl, mat, col) : null;
    const m2 = Mat4.create(); m2.set(m); Mat4.translate(m2, 0, -4 * PX, 0);
    if (pk && pk.t1) {
      // the resource pack's chestplate sleeve, over the skin's own sleeve (which shows wherever the pack's leaves gaps)
      if (part.ovl) out.push({ mesh: part.ovl, m, tex: skin.tex });
      out.push({ mesh: side < 0 ? pk.am.padL : pk.am.pad, m, tex: pk.t1 });
      out.push({ mesh: side < 0 ? pk.am.cuffL : pk.am.cuff, m: m2, tex: pk.t1 });
    } else {
      const am = armorMeshes(gl, mat, skin.slim ? 3 : 4);
      out.push({ mesh: am.pad, m, tint });
      out.push({ mesh: am.cuff, m: m2, tint });
    }
  } else if (part.ovl) out.push({ mesh: part.ovl, m, tex: skin.tex });
}

// The mesh for a worn cape (cached per kind): ten pixels wide, sixteen long, one thick.
const CAPE_MESHES = {};
function capeMesh(gl, id) {
  if (CAPE_MESHES[id] !== undefined) return CAPE_MESHES[id];
  const d = itemDef(id); if (!d || !d.cape) return (CAPE_MESHES[id] = null);
  const mb = new MeshBuilder(32), t = d.cape;
  addBox(mb, [-5 * PX, -16 * PX, 0], [5 * PX, 0, 1 * PX], tilesOf({ all: t, front: t + '_in', back: t }));
  const r = mb.result();
  return (CAPE_MESHES[id] = makeVAO(gl, r.verts, r.idx));
}

// Part of a cape (rows top..bot of its sixteen), hung from its top edge, thick px: under a backpack the top
// lies flat on the back beneath the pack and only the part below it swings.
function capeSegMesh(gl, id, top, bot, thick) {
  const key = id + ':' + top + ':' + bot + ':' + thick;
  if (CAPE_MESHES[key] !== undefined) return CAPE_MESHES[key];
  const d = itemDef(id); if (!d || !d.cape) return (CAPE_MESHES[key] = null);
  const mb = new MeshBuilder(32), tiles = tilesOf({ all: d.cape, front: d.cape + '_in', back: d.cape });
  const min = [-5 * PX, -(bot - top) * PX, 0], max = [5 * PX, 0, thick * PX], v0 = top / 16, v1 = bot / 16;
  for (let f = 0; f < 6; f++) {
    const F = FACES[f], uv = tileUV(tiles[f]), vs = [];
    for (let k = 0; k < 4; k++) {
      const c = F.c[k], t = FACE_UV[k], vertical = f !== 2 && f !== 3;
      const v = vertical ? uv[1] + (uv[3] - uv[1]) * (t[1] ? v1 : v0) : (t[1] ? uv[3] : uv[1]);
      vs.push(mb.vert(c[0] ? max[0] : min[0], c[1] ? max[1] : min[1], c[2] ? max[2] : min[2], t[0] ? uv[2] : uv[0], v, 255, 0, Math.round(Math.min(1, F.shade + 0.08) * 255)));
    }
    mb.quad(vs[0], vs[1], vs[2], vs[3], false);
  }
  const r = mb.result();
  return (CAPE_MESHES[key] = makeVAO(gl, r.verts, r.idx));
}

// First-person body: how far behind and below the eyes it sits, and how much of a forward lean it keeps.
const FP_BODY = { back: 0.25, drop: 0, lean: 0.25 };

// Draw calls for a whole character.
// pose: {x,y,z,yaw,headPitch,walk,walkAmt,swing,sneak,held,off,hook,back,carry,light,tint,deathT,
//        air,vy,sprint,land,bow,eat,time,armor:[helmet,chest,legs,boots],fp (first person: torso and legs, no head or arms)}
function avatarDraws(out, gl, skin, pose) {
  if (!skin || !skin.ready) return;
  const P = skin.parts;
  const base = Mat4.create();
  Mat4.rotateY(base, pose.yaw);
  if (pose.lean && !pose.fp) { Mat4.translate(base, 0, 0.9, 0); Mat4.rotateX(base, -pose.lean); Mat4.translate(base, 0, -0.9, 0); }   // (0.9.0.23) tipped into a flight
  if (pose.deathT) Mat4.rotateZ(base, Math.min(1, pose.deathT * 3) * Math.PI / 2);
  // swimming and crawling: lying flat, head first
  if (pose.swim) { Mat4.translate(base, 0, 0.32, 0.55); Mat4.rotateX(base, -Math.PI / 2 + (pose.swimPitch || 0) * 0.8); Mat4.translate(base, 0, -0.9, 0); }
  // lying on your back, head toward the pillow (the way you face)
  if (pose.sleep) { Mat4.rotateY(base, Math.PI); Mat4.translate(base, 0, 0.3, 0); Mat4.rotateX(base, Math.PI / 2); Mat4.translate(base, 0, -0.9, 0); }
  // In first person the body sits just behind the eyes (the head isn't drawn), so looking down
  // shows the front of your chest, your belt and your legs, the way the first-person-body mods do it.
  const carry = pose.carry, fp = !!pose.fp, sneak = pose.sneak ? 1 : 0;
  if (fp) Mat4.translate(base, 0, -FP_BODY.drop, FP_BODY.back);
  const A = avatarAnim(pose);
  // leaning forward (sprinting, sneaking, landing) would push the shoulders up into the view
  if (fp) { A.body[0] *= FP_BODY.lean; A.body[1] *= 0.5; if (A.armL) A.armL = [A.armL[0] * 0.45, A.armL[1], (A.armL[2] || 0) - 0.06]; if (A.foreL) A.foreL = [A.foreL[0] * 0.5, A.foreL[1], A.foreL[2]]; }
  const fpTorso = fp && !pose.swim && !pose.sleep && !pose.deathT;
  const at = (m, extra) => Object.assign({ m, px: pose.x, py: pose.y, pz: pose.z, light: pose.light }, extra);
  const rot = (m, r) => { if (r[1]) Mat4.rotateY(m, r[1]); if (r[0]) Mat4.rotateX(m, r[0]); if (r[2]) Mat4.rotateZ(m, r[2]); return m; };
  const child = (parent, from, to, r) => { const m = Mat4.create(); m.set(parent); Mat4.translate(m, to[0] - from[0], to[1] - from[1], to[2] - from[2]); return rot(m, r); };
  const root = Mat4.create(); root.set(base); if (A.lift) Mat4.translate(root, 0, A.lift, 0);
  const bodyM = child(root, [0, 0, 0], P.body.pivot, A.body);
  const headM = child(bodyM, P.body.pivot, P.head.pivot, A.head);
  const M = { body: bodyM, head: headM };
  for (const S of ['R', 'L']) {
    const arm = 'arm' + S, leg = 'leg' + S;
    M[arm] = child(bodyM, P.body.pivot, P[arm + '_u'].pivot, A[arm]);
    M['fore' + S] = child(M[arm], P[arm + '_u'].pivot, P[arm + '_d'].pivot, A['fore' + S]);
    M[leg] = child(root, [0, 0, 0], P[leg + '_u'].pivot, A[leg]);
    M['shin' + S] = child(M[leg], P[leg + '_u'].pivot, P[leg + '_d'].pivot, A['shin' + S]);
  }
  // (0.9.0.12) the 3D outer layer goes under armour: whatever a piece covers isn't drawn
  const AR = (pose.armor || []).map(id => id && !(typeof packArmorWorn === 'function' && packArmorWorn(id)) ? id : null);   // (0.9.0.17) a pack's armour lets the outer layer show through its gaps
  const hid = { head: !!AR[0], body: !!AR[1], armR_u: !!AR[1], armL_u: !!AR[1], armR_d: !!AR[1], armL_d: !!AR[1], legR_u: !!AR[2], legL_u: !!AR[2], legR_d: !!(AR[2] || AR[3]), legL_d: !!(AR[2] || AR[3]) };
  const skinPart = (part, m, name) => { if (pose.invis) return; out.push(at(m, { mesh: part.mesh, tint: pose.tint, tex: skin.tex })); if (part.ovl && !hid[name]) out.push(at(m, { mesh: part.ovl, tint: pose.tint, tex: skin.tex })); if (part.ovlT && !hid[name]) out.push(at(m, { mesh: part.ovlT, tint: pose.tint, tex: skin.tex, alpha: 0.999 })); };   // (0.9.0.53) and its see-through pixels, blended   // invisible: only what they wear and hold shows
  for (const S of ['R', 'L']) { skinPart(P['leg' + S + '_u'], M['leg' + S], 'leg' + S + '_u'); skinPart(P['leg' + S + '_d'], M['shin' + S], 'leg' + S + '_d'); }
  // first person: no head, and the arms come from the hand view
  if (!fp || fpTorso) skinPart(P.body, bodyM, 'body');
  if (!fp) {
    skinPart(P.head, headM, 'head');
    const fm = !pose.invis && !pose.deathT && skinFace(gl, skin);
    if (fm) {
      const t = pose.time || performance.now() / 1000, ph = (t + fm.seed) % fm.period;
      if (pose.sleep || ph < 0.13 || (ph > 1.6 && ph < 1.7 && fm.period > 4.5)) out.push(at(headM, { mesh: fm.lid, tint: pose.tint, tex: skin.tex }));   // a blink (now and then a double one)
      if (pose.talk && fm.mouth && Math.sin(t * 13 + fm.seed * 3) + Math.sin(t * 7.7) * 0.7 > 0.25) out.push(at(headM, { mesh: fm.mouth, tint: pose.tint, tex: skin.tex }));
    }
    for (const S of ['R', 'L']) { skinPart(P['arm' + S + '_u'], M['arm' + S], 'arm' + S + '_u'); skinPart(P['arm' + S + '_d'], M['fore' + S], 'arm' + S + '_d'); }
  } else if (fpTorso && pose.fpLeftArm && !pose.paddle) {
    // an empty left hand hangs at your side, there when you look down
    // a little forward of where it really hangs (the body sits back from the eye), so it shows
    const pv = P.armL_u.pivot;
    M.armL = child(bodyM, P.body.pivot, [pv[0], pv[1], pv[2] - 0.2], [A.armL[0] + 0.32, A.armL[1], A.armL[2]]);
    M.foreL = child(M.armL, pv, P.armL_d.pivot, A.foreL);
    skinPart(P.armL_u, M.armL, 'armL_u'); skinPart(P.armL_d, M.foreL, 'armL_d');
  }
  // armour
  const arm = pose.armor;
  if (arm) {
    const aw = skin.slim ? 3 : 4;
    const piece = (id, list) => {
      if (!id) return;
      // dyed leather comes as 'leather_chestplate#rrggbb'
      const [pid, col] = String(id).split('#'), c = col ? hexRGB('#' + col) : null, tint = c ? [c[0] / 255, c[1] / 255, c[2] / 255, 0.6] : pose.tint;
      const mat = armorMat(pid), am = armorMeshes(gl, mat, aw), L0 = list(am);
      // (0.9.0.15) in the resource pack's armour pictures, where it has them (render/packarmor.js)
      const pk = typeof packArmorKit === 'function' ? packArmorKit(gl, mat, col) : null, L1 = pk ? list(pk.am) : null;
      L0.forEach(([mesh, m], i) => {
        const pm = L1 && L1[i][0], pt = pm && (pm.layer === 2 ? pk.t2 : pk.t1);
        if (pt) out.push(at(m, { mesh: pm, tex: pt, tint: pose.tint }));
        else out.push(at(m, { mesh: mesh, tint }));
      });
    };
    if (!fp) {
      // (0.9.0.26) a wizard's hat is its own shape (game/arcana.js)
      const hd = arm[0] && itemDef(String(arm[0]).split('#')[0]), hm = hd && hd.hat && typeof hatMesh === 'function' ? hatMesh(gl, hd.hat) : null;
      if (hm) out.push(at(headM, { mesh: hm, tint: pose.tint })); else piece(arm[0], am => [[am.helmet, headM]]);
    }
    piece(arm[1], am => fp ? (fpTorso ? [[am.chest, bodyM]].concat(pose.fpLeftArm && !pose.paddle ? [[am.padL || am.pad, M.armL], [am.cuffL || am.cuff, M.foreL]] : []) : []) : [[am.chest, bodyM], [am.pad, M.armR], [am.padL || am.pad, M.armL], [am.cuff, M.foreR], [am.cuffL || am.cuff, M.foreL]]);
    piece(arm[2], am => (fp && !fpTorso ? [] : [[am.waist, bodyM]]).concat([[am.thigh, M.legR], [am.thighL || am.thigh, M.legL], [am.knee, M.shinR], [am.kneeL || am.knee, M.shinL]]));
    piece(arm[3], am => [[am.boot, M.shinR], [am.bootL || am.boot, M.shinL]]);
  }
  // a cape over the shoulders: it hangs from the top of the back (over a backpack if one is worn)
  // and swings out behind as they move
  if (bodyM && pose.cape && !fp && !pose.sleep && !pose.invis) {
    const cm = capeMesh(gl, pose.cape);
    if (cm && pose.back) {
      // worn under a backpack: it stays on your back, the pack's straps over it, and the hem below the pack swings
      const up = capeSegMesh(gl, pose.cape, 0, 11, 0.5), lo = capeSegMesh(gl, pose.cape, 11, 16, 0.5);
      const m = Mat4.create(); m.set(bodyM);
      Mat4.translate(m, 0, 12 * PX, 2.03 * PX);
      out.push(at(m, { mesh: up, noCull: true, tint: pose.tint }));
      const m2 = Mat4.create(); m2.set(m);
      Mat4.translate(m2, 0, -11 * PX, 0);
      Mat4.rotateX(m2, -Math.min(1.2, (pose.capeA ?? 0.1) * 0.9));
      if (pose.capeSway) Mat4.rotateZ(m2, pose.capeSway * 0.6);
      out.push(at(m2, { mesh: lo, noCull: true, tint: pose.tint }));
    } else if (cm) {
      const m = Mat4.create(); m.set(bodyM);
      Mat4.translate(m, 0, 12 * PX, 2.1 * PX);
      Mat4.rotateX(m, -(pose.capeA ?? 0.1));
      if (pose.capeSway) Mat4.rotateZ(m, pose.capeSway);
      out.push(at(m, { mesh: cm, noCull: true, tint: pose.tint }));
    }
  }
  // what's in their hands
  const held = (m, id) => {
    const im = heldMesh(gl, id);
    const hm = Mat4.create(); hm.set(m);
    Mat4.translate(hm, 0, -6 * PX, -1 * PX);
    if (im.kind === 'block') { Mat4.translate(hm, 0, 0, -1.5 * PX); Mat4.rotateX(hm, -0.3); Mat4.scale(hm, 0.375, 0.375, 0.375); }
    else Mat4.multiply(hm, hm, heldMat(id));
    out.push(at(hm, { mesh: im.mesh, noCull: im.kind !== 'block' }));
  };
  if (!fp && pose.held && !carry) held(pose.bow > 0 && /^bow/.test(pose.held) ? M.foreL : M.foreR, pose.held);   // drawing: the bow in the left hand
  if (!fp && pose.off && !carry) held(M.foreL, pose.off);
  // body is pivoted at the waist: +y up the back, -z is the chest
  if (bodyM && pose.back && (!fp || fpTorso)) {
    // the pack itself, straps over the shoulders (in first person, just the straps down your chest)
    const pk = PACK_LOOK[pose.back] ? pose.back : 'leather_backpack';
    const m = Mat4.create(); m.set(bodyM); Mat4.scale(m, PX, PX, PX);
    if (!fp) Mat4.rotateX(m, Math.sin(pose.walk * 2) * 0.02 * pose.walkAmt);
    out.push(at(m, { mesh: packMesh(gl, pk, fp ? 'straps' : 'worn', fp ? '' : (pose.gear || '')).mesh, noCull: true }));
  }
  if (bodyM && pose.hook && (!fp || (fpTorso && !pose.back))) {
    // hangs from the backpack's side if one is worn, otherwise from the front of the belt
    const im = itemMesh(gl, pose.hook);
    const m = Mat4.create(); m.set(bodyM);
    const walk = Math.sin(pose.walk * 2) * pose.walkAmt, sway = walk * 0.3;
    if (pose.back) Mat4.translate(m, 5.3 * PX, 6.6 * PX, 3.7 * PX); else Mat4.translate(m, 2.6 * PX, 0.4 * PX, -2.5 * PX);
    Mat4.rotateX(m, sway); Mat4.rotateZ(m, walk * 0.12);
    if (im.kind === 'block') {
      // the placed lantern (or torch), hanging by its handle: its top just under the hook
      Mat4.translate(m, 0, -0.12, pose.back ? 0 : -0.06); Mat4.scale(m, 0.27, 0.27, 0.27);
      if (BLOCKS[B[pose.hook]] && BLOCKS[B[pose.hook]].render === RENDER.TORCH) { Mat4.rotateZ(m, 0.5); Mat4.translate(m, 0, 0.2, 0); }
    } else { Mat4.translate(m, 0, -3 * PX, 0); Mat4.rotateZ(m, 0.25); Mat4.scale(m, 0.36, 0.36, 0.36); }
    out.push(at(m, { mesh: im.mesh, noCull: true }));
  }
  if (carry && bodyM && !fp) {
    // Carry On: whatever they hold sits in their arms against the chest (in first person the
    // hand view shows it, so the body doesn't draw a second one)
    const m = Mat4.create(); m.set(base);
    Mat4.translate(m, 0, 15 * PX - sneak * 0.12, -9 * PX);
    if (carry.kind === 'block') {
      const im = itemMesh(gl, carry.key || BLOCKS[carry.id].key);
      Mat4.scale(m, 0.6, 0.6, 0.6);
      out.push(at(m, { mesh: im.mesh }));
    } else if (MOB_TYPES[carry.type]) {
      const M = MODELS[carry.variant || MOB_TYPES[carry.type].model];
      const sc = MOB_TYPES[carry.type].carryScale || (carry.type === 'deer' ? 0.45 : carry.type === 'rabbit' ? 1 : 0.6);
      const pm = Mat4.create(); pm.set(m); Mat4.translate(pm, 0, -0.3, 0); Mat4.scale(pm, sc, sc, sc); Mat4.rotateY(pm, Math.PI / 2);
      for (const d of modelStillDraws(M, pm, { stag: carry.stag })) out.push(at(d.m, { mesh: d.mesh }));
    }
  }
}

// A model standing still (carried animals, menus): rigs get their resting pose, old models their pivots.
function modelStillDraws(M, base, opts = {}) {
  const out = [];
  if (M.def.rig) {
    const still = { walkAmt: 0, walk: 0, age: 0, onGround: true, ghost: true, T: {}, id: 0 };
    const mats = rigMatrices(still, M, base);
    for (const part of M.parts) { const m = mats[part.name]; if (!m || (part.antler && !opts.stag) || (part.wool && opts.sheared) || part.only) continue; out.push({ mesh: part.mesh, m, noCull: part.noCull }); }
    return out;
  }
  for (const part of M.parts) {
    if (part.antler && !opts.stag) continue;
    const pm = Mat4.create(); pm.set(base); Mat4.translate(pm, part.pivot[0], part.pivot[1], part.pivot[2]);
    out.push({ mesh: part.mesh, m: pm });
  }
  return out;
}
