// ---------------------------------------------------------------------------
// render/models3d.js — 0.9.0.12 "Solid Things": a real model for every kind of item.
//
// Like the bow and the fishing rod, items are built from parts: a pickaxe is a
// round handle with a wrapped grip, a collar and a curved head that tapers to
// its points; a sword has a pommel, a bound grip, a crossguard and a blade with
// a fuller down the middle; an apple is round with a stem and a leaf; a gem is
// cut; dust lies in a little heap; a dye is a tied pouch.
//
// Every part takes its colour from the item's own picture, at the place on the
// picture where that part is (the pickaxe head from the head's pixels, the grip
// from the grip's), so a resource pack's items come through in 3D in the pack's
// own colours. Anything without a model of its own is sculpted from its picture
// (render/sculpt.js).
//
// The frame is the picture's: x and y across -0.5..0.5, depth along z. Tools lie
// along the picture's diagonal, handle at the bottom left, the way they're drawn.
// ---------------------------------------------------------------------------

const RT2 = Math.SQRT1_2;
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * t];
// along the diagonal: u up the handle from the bottom-left corner, v across it (toward the top left), z out of the picture
const diag = (u, v = 0, z = 0) => [-0.44 + RT2 * u - RT2 * v, -0.44 + RT2 * u + RT2 * v, z];

// nearest pixel of the picture to a point (in the picture's frame), among those that pass `ok`
function sampler(info) {
  let lo = 255, hi = 0; for (const p of info.px) { lo = Math.min(lo, p.lum); hi = Math.max(hi, p.lum); }
  const edge = lo + (hi - lo) * 0.14;                  // the dark outline most item pictures have
  const R = info.R;
  const S = (x, y, ok) => {
    const ci = (x + 0.5) * R - 0.5, cj = (0.5 - y) * R - 0.5;
    let best = null, bd = 1e9, any = null, ad = 1e9;
    for (const p of info.px) {
      if (ok && !ok(p)) continue;
      const d = (p.i - ci) * (p.i - ci) + (p.j - cj) * (p.j - cj);
      if (d < ad) { ad = d; any = p; }
      if (p.lum >= edge && d < bd) { bd = d; best = p; }
    }
    return best || any || info.px[0] || null;
  };
  S.info = info;
  return S;
}
// where along the diagonal a pixel lies (0 at the handle's end, 1 at the head's)
const tPos = (p, R) => ((p.i + 0.5) / R + 1 - (p.j + 0.5) / R) / 2;

// a segment from a to b (each [x, y, z]), cut into short pieces each coloured from the picture under it
function sseg(mb, S, a, b, w0, w1, d0, d1, ok, k = 1, step = 0.07) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
  for (let s = 0; s < n; s++) {
    const t0 = s / n, t1 = (s + 1) / n, tm = (t0 + t1) / 2, pm = lerp3(a, b, tm);
    const P = S(pm[0], pm[1], ok);
    if (P) partSegSpot(mb, lerp3(a, b, t0), lerp3(a, b, t1), w0 + (w1 - w0) * tm, d0 + (d1 - d0) * tm, shadeOf(P, k));
  }
}
// a box in the picture's frame coloured from the picture at its middle
function sbox(mb, S, x0, y0, z0, x1, y1, z1, ok, k = 1, open) { const P = S((x0 + x1) / 2, (y0 + y1) / 2, ok); cbox(mb, x0, y0, z0, x1, y1, z1, shadeOf(P, k), open); }
// a round layer at (cx, cz), y0..y1
function sring(mb, cx, cz, y0, y1, r, P, open) { cbox(mb, cx - r, y0, cz - r * 0.62, cx + r, y1, cz + r * 0.62, P, open); cbox(mb, cx - r * 0.62, y0, cz - r, cx + r * 0.62, y1, cz + r, P, open); }
// a ball of round layers, each coloured from the picture at its height
function sball(mb, S, cx, cy, cz, r, ok, n = 7, sx = 1) {
  for (let k = 0; k < n; k++) {
    const y0 = -1 + 2 * k / n, y1 = -1 + 2 * (k + 1) / n, ym = (y0 + y1) / 2, rr = r * Math.sqrt(Math.max(0.05, 1 - ym * ym));
    const P = S(cx + rr * 0.35, cy + ym * r, ok);
    cbox(mb, cx - rr * sx, cy + y0 * r, cz - rr * 0.62, cx + rr * sx, cy + y1 * r, cz + rr * 0.62, shadeOf(P, 0.92 + k * 0.03));
    cbox(mb, cx - rr * 0.62 * sx, cy + y0 * r, cz - rr, cx + rr * 0.62 * sx, cy + y1 * r, cz + rr, shadeOf(P, 0.92 + k * 0.03));
  }
}
// a disc facing you (in the picture's plane), z0..z1
function sdisc(mb, cx, cy, z0, z1, r, P) { cbox(mb, cx - r, cy - r * 0.62, z0, cx + r, cy + r * 0.62, z1, P); cbox(mb, cx - r * 0.62, cy - r, z0, cx + r * 0.62, cy + r, z1, P); }
// the picture itself on a flat plate (for faces that change: a compass needle, a clock's dial)
function spicture(mb, info, z, scale = 0.86) {
  const uv = info.uv, s = scale / 2;
  const vs = [[-s, -s, uv[0], uv[3]], [s, -s, uv[2], uv[3]], [s, s, uv[2], uv[1]], [-s, s, uv[0], uv[1]]].map(q => mb.vert(q[0], q[1], z, q[2], q[3], 255, 0, 255));
  mb.quad(vs[0], vs[1], vs[2], vs[3], false);
}

// ---- the families ------------------------------------------------------------------------------------------------
const head = (R) => p => tPos(p, R) > 0.5, grip = (R) => p => tPos(p, R) < 0.52;
const T3D = {
  // the handle every tool has: a cap at the end, a grip wrapped in bands, then the shaft
  handle(mb, S, to, opts = {}) {
    const R = S.info.R, ok = grip(R), w = opts.w || 0.075;
    sseg(mb, S, diag(-0.04), diag(0.03), w + 0.025, w + 0.025, w + 0.025, w + 0.025, ok, 0.85);
    sseg(mb, S, diag(0.03), diag(to), w, w * 0.92, w, w * 0.92, ok);
    for (const u of [0.1, 0.18, 0.26]) sseg(mb, S, diag(u), diag(u + 0.025), w + 0.012, w + 0.012, w + 0.012, w + 0.012, ok, 0.72);
  },
  pickaxe(mb, S) {
    const R = S.info.R, H = head(R);
    T3D.handle(mb, S, 0.86);
    sseg(mb, S, diag(0.72), diag(0.86), 0.12, 0.12, 0.12, 0.12, H, 0.8);                     // the collar
    // the head: a curved bar across the top of the handle, thick in the middle, tapering to points
    const pts = []; for (let s = -1; s <= 1.0001; s += 0.25) pts.push([s, diag(0.86 - 0.2 * s * s + 0.04, s * 0.47, 0)]);
    for (let i = 0; i < pts.length - 1; i++) {
      const m = (Math.abs(pts[i][0]) + Math.abs(pts[i + 1][0])) / 2, w = 0.14 - m * 0.085, d = 0.12 - m * 0.06;
      sseg(mb, S, pts[i][1], pts[i + 1][1], w, w, d, d, H, 1, 0.2);
    }
    return { depth: 0.07 };
  },
  axe(mb, S) {
    const R = S.info.R, H = head(R);
    T3D.handle(mb, S, 0.93);
    sseg(mb, S, diag(0.6), diag(0.9), 0.11, 0.11, 0.11, 0.11, H, 0.8);                       // the eye of the head round the handle
    // the blade, fanning out to its edge on one side
    for (let k = 0; k < 5; k++) {
      const v0 = 0.04 + k * 0.065, v1 = v0 + 0.065, wd = 0.17 + k * 0.055, dd = 0.09 - k * 0.012;
      sseg(mb, S, diag(0.75, v0), diag(0.75, v1), wd, wd + 0.055, dd, dd - 0.012, H, k === 4 ? 1.12 : 1, 0.2);
    }
    sseg(mb, S, diag(0.75, 0.365), diag(0.75, 0.39), 0.43, 0.45, 0.025, 0.02, H, 1.25, 0.2);     // the bright edge
    sseg(mb, S, diag(0.75, -0.02), diag(0.75, -0.13), 0.12, 0.1, 0.1, 0.09, H, 0.85, 0.2);       // the poll at the back
    return { depth: 0.06 };
  },
  shovel(mb, S) {
    const R = S.info.R, H = head(R);
    T3D.handle(mb, S, 0.8);
    sseg(mb, S, diag(-0.02, -0.11), diag(-0.02, 0.11), 0.06, 0.06, 0.08, 0.08, grip(R), 0.8);   // a crossbar grip at the end
    sseg(mb, S, diag(0.74), diag(0.88), 0.09, 0.12, 0.09, 0.07, H, 0.85);                     // the socket
    sseg(mb, S, diag(0.88), diag(1.12), 0.27, 0.27, 0.05, 0.045, H, 1, 0.06);                 // the blade
    sseg(mb, S, diag(1.12), diag(1.18), 0.21, 0.12, 0.04, 0.035, H, 1.1);                     // rounded off at the tip
    sseg(mb, S, diag(0.9, 0, 0.03), diag(1.08, 0, 0.03), 0.03, 0.03, 0.02, 0.02, H, 0.75);   // a rib down the middle
    return { depth: 0.05 };
  },
  hoe(mb, S) {
    const R = S.info.R, H = head(R);
    T3D.handle(mb, S, 0.9);
    sseg(mb, S, diag(0.76), diag(0.9), 0.1, 0.1, 0.1, 0.1, H, 0.8);
    sseg(mb, S, diag(0.84, 0), diag(0.84, 0.3), 0.09, 0.08, 0.08, 0.07, H, 1, 0.1);           // the arm
    sseg(mb, S, diag(0.86, 0.3), diag(0.6, 0.34), 0.14, 0.15, 0.055, 0.04, H, 1.08, 0.08);    // the blade, turned down
    return { depth: 0.06 };
  },
  sword(mb, S, key, def, opts = {}) {
    const R = S.info.R, H = head(R), G = grip(R), L = opts.len || 1.22, bw = opts.bw || 0.15;
    sseg(mb, S, diag(-0.04), diag(0.04), 0.11, 0.11, 0.11, 0.11, G, 0.9);                     // the pommel
    sseg(mb, S, diag(0.04), diag(0.25), 0.07, 0.07, 0.07, 0.07, G);                           // the grip
    for (const u of [0.09, 0.15, 0.21]) sseg(mb, S, diag(u), diag(u + 0.022), 0.082, 0.082, 0.082, 0.082, G, 0.72);
    sseg(mb, S, diag(0.27, -opts.guard || -0.22), diag(0.27, opts.guard || 0.22), 0.075, 0.075, 0.11, 0.11, H, 0.85, 0.11);   // the crossguard
    sseg(mb, S, diag(0.31), diag(L - 0.14), bw, bw * 0.8, 0.045, 0.04, H, 1, 0.08);           // the blade
    sseg(mb, S, diag(L - 0.14), diag(L), bw * 0.8, 0.02, 0.04, 0.02, H, 1.05, 0.05);          // its point
    for (const z of [0.022, -0.022]) sseg(mb, S, diag(0.34, 0, z), diag(L - 0.22, 0, z), 0.035, 0.03, 0.012, 0.012, H, 0.78);   // the fuller
    return { depth: 0.055 };
  },
  dagger(mb, S, key, def) { return T3D.sword(mb, S, key, def, { len: 0.92, bw: 0.13, guard: 0.16 }); },
  club(mb, S) {
    const R = S.info.R, H = head(R);
    sseg(mb, S, diag(-0.02), diag(0.32), 0.09, 0.1, 0.09, 0.1, grip(R));
    sseg(mb, S, diag(0.32), diag(1.1), 0.12, 0.27, 0.12, 0.26, H, 1, 0.1);
    for (const [u, v] of [[0.6, 0.12], [0.75, -0.15], [0.9, 0.16], [1.0, -0.1], [0.72, 0.02]]) sseg(mb, S, diag(u, v), diag(u, v * 1.6), 0.05, 0.02, 0.05, 0.02, H, 1.15);   // studs
    return { depth: 0.13 };
  },
  staff(mb, S, key) {
    const R = S.info.R, gem = S.info.px.reduce((a, p) => (!a || p.sat * 255 + p.lum * 0.3 > a.sat * 255 + a.lum * 0.3 ? p : a), null);
    sseg(mb, S, diag(-0.04), diag(1.0), 0.06, 0.055, 0.06, 0.055, p => tPos(p, R) < 0.75);
    for (const u of [0.2, 0.28, 0.6]) sseg(mb, S, diag(u), diag(u + 0.025), 0.075, 0.075, 0.075, 0.075, grip(R), 0.75);
    // a claw at the top, holding a stone
    for (const v of [-0.09, 0.09]) sseg(mb, S, diag(0.98, v * 0.4), diag(1.16, v), 0.04, 0.03, 0.04, 0.03, head(R), 0.9);
    const c = diag(1.12);
    cbox(mb, c[0] - 0.08, c[1] - 0.08, -0.08, c[0] + 0.08, c[1] + 0.08, 0.08, gem); cbox(mb, c[0] - 0.05, c[1] - 0.05, 0.08, c[0] + 0.05, c[1] + 0.05, 0.1, shadeOf(gem, 1.2));
    return { depth: 0.1, glow: true };
  },
  shears(mb, S) {
    const R = S.info.R, hi = S.info.px.reduce((a, p) => (!a || p.lum > a.lum ? p : a), null);
    for (const s of [-1, 1]) {
      sseg(mb, S, [0.0, 0.0, s * 0.025], [0.46 * (s > 0 ? 1 : 0.62), 0.46 * (s > 0 ? 0.62 : 1), s * 0.025], 0.15, 0.05, 0.04, 0.035, p => p.lum > 110, 1, 0.1);   // the blades
      const h = s > 0 ? [-0.2, -0.36] : [-0.36, -0.2];
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, b = (k + 1) / 8 * Math.PI * 2; sseg(mb, S, [h[0] + Math.cos(a) * 0.12, h[1] + Math.sin(a) * 0.12, s * 0.025], [h[0] + Math.cos(b) * 0.12, h[1] + Math.sin(b) * 0.12, s * 0.025], 0.055, 0.055, 0.055, 0.055, p => p.lum <= 140, 0.9, 0.3); }
      sseg(mb, S, [h[0] + 0.09, h[1] + 0.09, s * 0.025], [0.0, 0.0, s * 0.025], 0.07, 0.07, 0.05, 0.05);
    }
    cbox(mb, -0.045, -0.045, -0.07, 0.045, 0.045, 0.07, shadeOf(hi, 0.8));                       // the pivot
    return { depth: 0.06 };
  },
  flint_and_steel(mb, S) {
    // the steel: a ring open at one side; the flint: a chipped black stone
    for (let k = 0; k < 7; k++) { const a = 0.6 + k / 7 * 4.6, b = 0.6 + (k + 1) / 7 * 4.6; sseg(mb, S, [-0.12 + Math.cos(a) * 0.24, -0.12 + Math.sin(a) * 0.24, 0], [-0.12 + Math.cos(b) * 0.24, -0.12 + Math.sin(b) * 0.24, 0], 0.08, 0.08, 0.06, 0.06, p => p.lum > 90, 1, 0.3); }
    const dk = S.info.px.reduce((a, p) => (!a || p.lum < a.lum ? p : a), null), fl = S(0.25, 0.25, p => p.lum < 110) || dk;
    cbox(mb, 0.08, 0.06, -0.08, 0.36, 0.34, 0.08, fl); cbox(mb, 0.14, 0.3, -0.06, 0.32, 0.4, 0.06, shadeOf(fl, 1.15)); cbox(mb, 0.04, 0.12, -0.05, 0.1, 0.28, 0.05, shadeOf(fl, 0.9));
    return { depth: 0.08 };
  },
  spyglass(mb, S) {
    sseg(mb, S, diag(0.05), diag(0.4), 0.14, 0.14, 0.14, 0.14);
    sseg(mb, S, diag(0.4), diag(0.75), 0.12, 0.12, 0.12, 0.12);
    sseg(mb, S, diag(0.75), diag(1.05), 0.1, 0.1, 0.1, 0.1);
    for (const u of [0.05, 0.4, 0.75]) sseg(mb, S, diag(u), diag(u + 0.04), 0.165, 0.165, 0.165, 0.165, p => p.r > p.b + 20, 1.1);
    return { depth: 0.08 };
  },
  hook(mb, S) {
    const metal = p => p.sat < 0.3 && p.lum > 70;
    sseg(mb, S, diag(0.3), diag(0.95), 0.06, 0.06, 0.06, 0.06, metal);
    for (const v of [-1, 0, 1]) { const z = v * 0.12; sseg(mb, S, diag(0.95, 0, 0), diag(1.05, v * 0.18, z), 0.05, 0.045, 0.05, 0.045, metal, 1, 0.1); sseg(mb, S, diag(1.05, v * 0.18, z), diag(0.92, v * 0.24, z * 1.3), 0.045, 0.03, 0.045, 0.03, metal, 1.1, 0.1); }
    // a coil of rope at the bottom
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, b = (k + 1) / 8 * Math.PI * 2, c = diag(0.12); sseg(mb, S, [c[0] + Math.cos(a) * 0.18, c[1] + Math.sin(a) * 0.18, 0], [c[0] + Math.cos(b) * 0.18, c[1] + Math.sin(b) * 0.18, 0], 0.07, 0.07, 0.07, 0.07, p => p.r > p.b + 15, 1, 0.3); }
    return { depth: 0.12 };
  },
  // ---- round and lumpy things ----
  apple(mb, S) {
    const body = p => p.sat > 0.25;
    sball(mb, S, 0, -0.06, 0, 0.36, body, 8, 1.05);
    sbox(mb, S, -0.025, 0.26, -0.025, 0.025, 0.42, 0.025, p => p.r < 160 && p.g < 140, 0.8);
    const leaf = S(0.15, 0.38, p => p.g > p.r + 10) || S(0, 0.4);
    cbox(mb, 0.02, 0.3, -0.02, 0.2, 0.38, 0.02, leaf);
    return { depth: 0.36 };
  },
  carrot(mb, S) {
    const body = p => p.r > p.g + 25;
    sseg(mb, S, diag(0.05), diag(0.9), 0.04, 0.17, 0.04, 0.17, body, 1, 0.08);
    for (const v of [-0.08, 0, 0.08]) sseg(mb, S, diag(0.9, v * 0.4), diag(1.18, v * 1.6, v * 0.5), 0.05, 0.03, 0.04, 0.02, p => p.g > p.r, 1, 0.1);
    for (const u of [0.35, 0.55, 0.72]) sseg(mb, S, diag(u), diag(u + 0.02), 0.175 * (u / 0.9) + 0.02, 0.175 * (u / 0.9) + 0.02, 0.17 * (u / 0.9) + 0.015, 0.17 * (u / 0.9) + 0.015, body, 0.82);
    return { depth: 0.09 };
  },
  potato(mb, S) {
    sball(mb, S, 0, -0.04, 0, 0.3, null, 6, 1.35);
    for (const [x, y] of [[-0.18, 0.05], [0.12, -0.12], [0.24, 0.08]]) cbox(mb, x, y, 0.17, x + 0.05, y + 0.04, 0.2, shadeOf(S(x, y), 0.7));
    return { depth: 0.3 };
  },
  beetroot(mb, S) {
    sball(mb, S, 0, -0.12, 0, 0.27, p => p.r > p.g + 30, 7);
    sbox(mb, S, -0.02, -0.46, -0.02, 0.02, -0.36, 0.02, null, 0.8);
    for (const x of [-0.08, 0.06]) cbox(mb, x, 0.12, -0.03, x + 0.05, 0.42, 0.03, S(x, 0.3, p => p.g > p.r));
    return { depth: 0.27 };
  },
  bread(mb, S) {
    // a long loaf along the diagonal with slashes across the crust
    for (let k = 0; k < 6; k++) { const u0 = 0.12 + k * 0.13, u1 = u0 + 0.13, um = (u0 + u1) / 2, w = 0.3 * Math.sqrt(Math.max(0.2, 1 - Math.pow((um - 0.5) / 0.45, 2))); sseg(mb, S, diag(u0), diag(u1), w, w, w * 0.8, w * 0.8, null, 1, 0.2); }
    for (const u of [0.32, 0.5, 0.68]) sseg(mb, S, diag(u, -0.1, 0.11), diag(u + 0.06, 0.1, 0.11), 0.03, 0.03, 0.02, 0.02, null, 0.75);
    return { depth: 0.12 };
  },
  cookie(mb, S) {
    sdisc(mb, 0, 0, -0.06, 0.06, 0.4, shadeOf(S(0.2, 0.2), 1));
    for (const [x, y] of [[-0.15, 0.12], [0.12, 0.18], [0.05, -0.12], [-0.2, -0.15], [0.22, -0.02]]) cbox(mb, x - 0.04, y - 0.04, 0.06, x + 0.04, y + 0.04, 0.09, shadeOf(S(x, y, p => p.lum < 90), 0.9));
    return { depth: 0.09 };
  },
  berries(mb, S) {
    const pts = [[-0.12, -0.1], [0.1, -0.06], [0, 0.1], [0.16, 0.16], [-0.2, 0.12], [-0.02, -0.28], [0.22, -0.2]];
    for (const [x, y] of pts) { const P = S(x, y, p => p.sat > 0.3); const r = 0.1; cbox(mb, x - r, y - r, -r, x + r, y + r, r, P); cbox(mb, x - r * 0.6, y - r * 0.6, r, x + r * 0.6, y + r * 0.6, r + 0.03, shadeOf(P, 1.15)); }
    sseg(mb, S, [0, 0.12, 0], [0.05, 0.42, 0], 0.03, 0.025, 0.03, 0.025, p => p.g >= p.r, 0.9);
    return { depth: 0.13 };
  },
  melon(mb, S) {
    // a wedge: rind along the bottom, red flesh above it, seeds in it
    const rind = p => p.g > p.r, flesh = p => p.r > p.g + 30;
    for (let k = 0; k < 6; k++) { const x0 = -0.42 + k * 0.14, w = 0.36 - Math.abs(k - 2.5) * 0.06; cbox(mb, x0, -0.3, -0.07, x0 + 0.14, -0.3 + w, 0.07, S(x0 + 0.07, -0.2, flesh)); }
    cbox(mb, -0.44, -0.38, -0.08, 0.44, -0.3, 0.08, S(0, -0.38, rind));
    for (const x of [-0.2, 0, 0.2]) cbox(mb, x, -0.12, 0.07, x + 0.04, -0.07, 0.085, shadeOf(S(x, -0.1, p => p.lum < 70), 0.7));
    return { depth: 0.085 };
  },
  pie(mb, S) {
    sdisc(mb, 0, -0.02, -0.12, 0.12, 0.42, shadeOf(S(0, -0.3), 0.95));
    sdisc(mb, 0, -0.02, 0.12, 0.16, 0.34, shadeOf(S(0, 0.05, p => p.sat > 0.4), 1));
    return { depth: 0.16 };
  },
  egg(mb, S) { sball(mb, S, 0, -0.04, 0, 0.32, null, 7, 0.82); return { depth: 0.32 }; },
  ball(mb, S) { sball(mb, S, 0, 0, 0, 0.32, null, 7); return { depth: 0.32 }; },
  // a cut gem: a crown above, a point below, in the picture's own colours
  gem(mb, S) {
    const L = [[-0.06, 0.06, 0.18], [0.06, 0.2, 0.34], [0.2, 0.28, 0.3], [0.28, 0.34, 0.2]];
    const B = [[-0.4, -0.3, 0.07], [-0.3, -0.18, 0.16], [-0.18, -0.06, 0.25]];
    for (const [y0, y1, r] of B) sring(mb, 0, 0, y0, y1, r, shadeOf(S(r * 0.4, (y0 + y1) / 2), 0.85));
    for (const [y0, y1, r] of L) sring(mb, 0, 0, y0, y1, r, shadeOf(S(r * 0.4, (y0 + y1) / 2), 1.05));
    cbox(mb, -0.1, 0.34, -0.06, 0.1, 0.355, 0.06, shadeOf(S(-0.1, 0.3), 1.25));
    return { depth: 0.34, stand: true };
  },
  crystal(mb, S) {
    for (const [u, v, len, w] of [[0.1, 0, 0.95, 0.14], [0.25, 0.14, 0.55, 0.1], [0.2, -0.14, 0.6, 0.1]]) { sseg(mb, S, diag(u, v * 0.3), diag(u + len - 0.14, v), w, w, w, w, null, 1, 0.12); sseg(mb, S, diag(u + len - 0.14, v), diag(u + len, v * 1.1), w, 0.02, w, 0.02, null, 1.15); }
    return { depth: 0.07 };
  },
  lump(mb, S) {
    for (const [x, y, z, r] of [[-0.12, -0.1, 0, 0.2], [0.12, -0.05, 0.05, 0.17], [0, 0.14, -0.04, 0.16], [0.16, 0.16, 0.03, 0.1], [-0.2, 0.1, 0.06, 0.1]]) cbox(mb, x - r, y - r, z - r, x + r, y + r, z + r, shadeOf(S(x, y), 0.9 + y));
    return { depth: 0.22 };
  },
  nugget(mb, S) {
    for (const [x, y, r] of [[-0.12, -0.12, 0.13], [0.1, -0.06, 0.11], [0, 0.12, 0.1]]) cbox(mb, x - r, y - r, -r * 0.8, x + r, y + r, r * 0.8, shadeOf(S(x, y), 1 + y));
    return { depth: 0.11, stand: false };
  },
  // a little heap (dusts, powders, flour, sugar): stacked layers, each smaller
  heap(mb, S) {
    for (let k = 0; k < 5; k++) { const y0 = -0.46 + k * 0.09, r = 0.42 - k * 0.075; sring(mb, 0, 0, y0, y0 + 0.09, r, shadeOf(S(r * 0.5, -0.3 + k * 0.15), 0.9 + k * 0.05)); }
    return { depth: 0.42, stand: true };
  },
  seeds(mb, S) {
    for (let k = 0; k < 9; k++) { const x = Math.sin(k * 2.4) * 0.26, y = Math.cos(k * 1.9) * 0.24 - 0.04, z = Math.sin(k * 1.3) * 0.08; cbox(mb, x - 0.05, y - 0.07, z - 0.04, x + 0.05, y + 0.07, z + 0.04, shadeOf(S(x, y), 0.9 + (k % 3) * 0.08)); }
    return { depth: 0.12 };
  },
  // a dye: a little cloth pouch tied at the neck, the colour inside
  pouch(mb, S) {
    const col = p => p.sat > 0.2 || p.lum > 200 || p.lum < 60;
    for (const [y0, y1, r] of [[-0.42, -0.34, 0.2], [-0.34, -0.12, 0.3], [-0.12, 0.02, 0.26], [0.02, 0.1, 0.16]]) sring(mb, 0, 0, y0, y1, r, S(r * 0.5, (y0 + y1) / 2, col));
    sring(mb, 0, 0, 0.1, 0.15, 0.1, shadeOf(tileSpot('pack_strap'), 1));
    sring(mb, 0, 0, 0.15, 0.27, 0.15, S(0, 0.2, col));
    return { depth: 0.3, stand: true };
  },
  rod(mb, S, key) {
    const w = /bone/.test(key) ? 0.075 : 0.065;
    sseg(mb, S, diag(0.06), diag(1.08), w, w, w, w, null, 1, 0.08);
    if (/bone/.test(key)) for (const u of [0.04, 1.08]) for (const v of [-0.05, 0.05]) sseg(mb, S, diag(u - 0.04, v), diag(u + 0.04, v), 0.07, 0.07, 0.08, 0.08, null, 1.05);
    return { depth: 0.04 };
  },
  wheat(mb, S) {
    for (const v of [-0.08, 0, 0.08]) { sseg(mb, S, diag(0.0, v * 0.2), diag(0.7, v), 0.025, 0.025, 0.025, 0.025, p => tPos(p, S.info.R) < 0.6); sseg(mb, S, diag(0.7, v), diag(1.08, v * 1.4), 0.06, 0.04, 0.06, 0.04, p => tPos(p, S.info.R) > 0.55, 1, 0.08); }
    sseg(mb, S, diag(0.3, -0.06), diag(0.3, 0.06), 0.04, 0.04, 0.07, 0.07, null, 0.8);
    return { depth: 0.04 };
  },
  // a round case with the item's own face on the front (the compass needle and the clock's dial keep moving)
  dial(mb, S) {
    const info = S.info, rim = S(0.42, 0, p => p.lum > 60);
    sdisc(mb, 0, 0, -0.07, 0.05, 0.44, shadeOf(rim, 0.95));
    sdisc(mb, 0, 0, 0.05, 0.065, 0.46, shadeOf(rim, 1.1));
    spicture(mb, info, 0.068, 0.9);
    return { depth: 0.07 };
  },
  disc(mb, S) {
    const P = S(0.35, 0, p => p.lum < 90) || S(0.35, 0), lab = S(0, 0.06, p => p.sat > 0.3) || S(0, 0);
    sdisc(mb, 0, 0, -0.02, 0.02, 0.46, P);
    sdisc(mb, 0, 0, 0.02, 0.035, 0.17, lab); sdisc(mb, 0, 0, -0.035, -0.02, 0.17, lab);
    cbox(mb, -0.03, -0.03, -0.04, 0.03, 0.03, 0.04, shadeOf(P, 0.6));
    return { depth: 0.04 };
  },
  charm(mb, S) {
    const gem = S.info.px.reduce((a, p) => (!a || p.sat * 255 + p.lum * 0.3 > a.sat * 255 + a.lum * 0.3 ? p : a), null), metal = S(0, 0.3, p => p.sat < 0.35) || gem;
    sdisc(mb, 0, -0.08, -0.05, 0.05, 0.28, metal);
    sdisc(mb, 0, -0.08, 0.05, 0.09, 0.17, gem);
    for (let k = 0; k < 7; k++) { const a = Math.PI * (0.15 + k / 7 * 0.7), b = Math.PI * (0.15 + (k + 1) / 7 * 0.7); partSegSpot(mb, [Math.cos(a) * 0.32, 0.12 + Math.sin(a) * 0.3, 0], [Math.cos(b) * 0.32, 0.12 + Math.sin(b) * 0.3, 0], 0.03, 0.03, metal); }
    return { depth: 0.09 };
  },
};
// which model an item gets (null: sculpt it from its picture)
function model3dKind(key, def) {
  if (!def || def.block) return null;
  const t = def.tool && def.tool.type;
  if (t === 'pickaxe') return 'pickaxe';
  if (t === 'axe') return 'axe';
  if (t === 'shovel') return 'shovel';
  if (t === 'hoe') return 'hoe';
  if (key === 'ogre_club') return 'club';
  if (/dagger/.test(key)) return 'dagger';
  if (t === 'sword') return 'sword';
  if (def.staff || t === 'staff') return 'staff';
  if (t === 'shears') return 'shears';
  if (key === 'flint_and_steel') return 'flint_and_steel';
  if (key === 'spyglass') return 'spyglass';
  if (key === 'grappling_hook') return 'hook';
  if (/^(golden_)?apple$/.test(key)) return 'apple';
  if (/carrot$/.test(key)) return 'carrot';
  if (/potato$/.test(key)) return 'potato';
  if (key === 'beetroot') return 'beetroot';
  if (key === 'bread') return 'bread';
  if (key === 'cookie') return 'cookie';
  if (/berries$/.test(key)) return 'berries';
  if (/melon_slice$/.test(key)) return 'melon';
  if (key === 'pumpkin_pie') return 'pie';
  if (key === 'egg') return 'egg';
  if (/ball$|^snowball$|^cinder_core$|^magma_cream$/.test(key)) return 'ball';
  if (/^(diamond|emerald|ruby|sapphire|heart_crystal|aether_crystal|mese_crystal)$/.test(key)) return 'gem';
  if (/shard$|^quartz$/.test(key)) return 'crystal';
  if (/^(coal|charcoal|flint|raw_\w+|crushed_\w+)$/.test(key)) return 'lump';
  if (/nugget$/.test(key)) return 'nugget';
  if (/dust$|powder$|^sugar$|^flour$|^bone_meal$|^gunpowder$|^redstone$/.test(key)) return 'heap';
  if (/seeds$|^cocoa_beans$|^nether_wart_item$/.test(key)) return 'seeds';
  if (/_dye$/.test(key)) return 'pouch';
  if (/^stick$|^bone$|^cinder_rod$/.test(key)) return 'rod';
  if (key === 'wheat') return 'wheat';
  if (key === 'compass' || key === 'clock' || key === 'death_compass') return 'dial';
  if (/^music_disc_/.test(key)) return 'disc';
  if (/charm$/.test(key)) return 'charm';
  return null;
}
{
  const base = itemMesh;
  itemMesh = function (gl, key) {
    if (ITEM_MESHES[key]) return ITEM_MESHES[key];
    const def = itemDef(key), mk = model3dKind(key, def);
    if (mk && ATLAS.pixels) {
      try {
        const info = spriteInfo(ATLAS.tile[def.icon] ?? 0);
        if (info.px.length) {
          const mb = new MeshBuilder(2048), S = sampler(info);
          MODEL_PROJ = info; MODEL_FILL = modelFill(gl, info);
          let extra; try { extra = T3D[mk](mb, S, key, def) || {}; } finally { MODEL_PROJ = null; MODEL_FILL = null; }
          const sz = itemSize(key);
          scaleMB(mb, sz, !!extra.stand); if (extra.depth) extra.depth *= sz;
          const r = mb.result();
          return (ITEM_MESHES[key] = Object.assign({ mesh: makeVAO(gl, r.verts, r.idx), kind: 'flat', model3d: mk }, extra));
        }
      } catch (e) { console.warn('item model', key, e); }
    }
    return base(gl, key);
  };
}
