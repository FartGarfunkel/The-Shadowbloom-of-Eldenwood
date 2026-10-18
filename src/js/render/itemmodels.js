// ---------------------------------------------------------------------------
// render/itemmodels.js — (alpha 3) every D&D item as a Hytale-style 3D model.
//
// DokuQuest's "Solid Things" (render/models3d.js, render/sculpt.js) already builds tools, swords, food, gems,
// potions, books and armour from parts coloured from the item's own picture. Here every weapon of the tabletop
// rules gets its own shape (a mace is flanged, a flail swings a spiked ball on a chain, a halberd has its axe, spike
// and hook, a crossbow its prod and string), and so does the gear: shields, holy symbols and arcane focuses, lutes,
// thieves' tools, kits and packs, rations, candles and coins, and the magic items: wands and rods, rings and
// amulets, cloaks, boots, gloves, belts, helms and bracers, scrolls, bags, horns, figurines, carpets, keys...
//
// Like the rest, each part takes its colour from the picture under it, so a resource pack's art carries into 3D.
// The frame is the picture's (x, y across -0.5..0.5, depth along z); weapons lie along its diagonal, handle at the
// bottom left. The same model is what you hold, what lies on the ground, what hangs on a rack or stands on a shelf,
// and (render/icons3d.js) the icon in your inventory.
// ---------------------------------------------------------------------------

const metalOk = p => p.sat < 0.32 && p.lum > 70, woodOk = p => p.r > p.b + 12 && p.lum > 30 && p.lum < 190, darkOk = p => p.lum < 110;
const brightP = (S) => S.info.px.reduce((a, p) => (!a || p.lum > a.lum ? p : a), null);
const vividP = (S) => S.info.px.reduce((a, p) => (!a || p.sat * 255 + p.lum * 0.3 > a.sat * 255 + a.lum * 0.3 ? p : a), null);
const darkestP = (S) => S.info.px.reduce((a, p) => (!a || (p.lum < a.lum && p.lum > 18) ? p : a), null);
const commonP = (S, ok) => spriteCommon(S.info, ok) || spriteCommon(S.info);
// a ring of segments (a loop of chain, a ring, a coil) around c in the plane given by axes a and b
function sloop(mb, P, c, r, a, b, n, w, d) {
  for (let k = 0; k < n; k++) {
    const t0 = k / n * Math.PI * 2, t1 = (k + 1) / n * Math.PI * 2;
    const p0 = [c[0] + (a[0] * Math.cos(t0) + b[0] * Math.sin(t0)) * r, c[1] + (a[1] * Math.cos(t0) + b[1] * Math.sin(t0)) * r, (c[2] || 0) + (a[2] * Math.cos(t0) + b[2] * Math.sin(t0)) * r];
    const p1 = [c[0] + (a[0] * Math.cos(t1) + b[0] * Math.sin(t1)) * r, c[1] + (a[1] * Math.cos(t1) + b[1] * Math.sin(t1)) * r, (c[2] || 0) + (a[2] * Math.cos(t1) + b[2] * Math.sin(t1)) * r];
    partSegSpot(mb, p0, p1, w, d, P);
  }
}
// a spike from a point outward (tapering)
function sspike(mb, P, from, to, w) { const m = lerp3(from, to, 0.55); partSegSpot(mb, from, m, w, w, P); partSegSpot(mb, m, to, w * 0.55, w * 0.55, shadeOf(P, 1.1)); }
const UD = [RT2, RT2, 0], VD = [-RT2, RT2, 0], ZD = [0, 0, 1];   // along the handle, across it, out of the picture

const T3D_DND = {
  // ---- blades ----
  longsword(mb, S, k, d) { return T3D.sword(mb, S, k, d, { len: 1.2, bw: 0.15, guard: 0.22 }); },
  shortsword(mb, S, k, d) { return T3D.sword(mb, S, k, d, { len: 1.0, bw: 0.15, guard: 0.18 }); },
  greatsword(mb, S) {
    const R = S.info.R, H = head(R), G = grip(R);
    sseg(mb, S, diag(-0.06), diag(0.02), 0.12, 0.12, 0.12, 0.12, G, 0.9);
    sseg(mb, S, diag(0.02), diag(0.33), 0.07, 0.07, 0.07, 0.07, G);
    for (const u of [0.07, 0.14, 0.21, 0.28]) sseg(mb, S, diag(u), diag(u + 0.022), 0.082, 0.082, 0.082, 0.082, G, 0.72);
    sseg(mb, S, diag(0.35, -0.3), diag(0.35, 0.3), 0.08, 0.08, 0.11, 0.11, H, 0.85, 0.12);
    for (const v of [-0.3, 0.3]) sseg(mb, S, diag(0.35, v), diag(0.42, v * 1.15), 0.07, 0.05, 0.1, 0.08, H, 0.85);
    sseg(mb, S, diag(0.39), diag(0.48), 0.1, 0.1, 0.06, 0.06, H, 0.8);                           // the ricasso
    sseg(mb, S, diag(0.48), diag(1.2), 0.2, 0.17, 0.05, 0.045, H, 1, 0.08);
    sseg(mb, S, diag(1.2), diag(1.32), 0.17, 0.02, 0.045, 0.02, H, 1.05, 0.05);
    for (const z of [0.024, -0.024]) sseg(mb, S, diag(0.5, 0, z), diag(1.1, 0, z), 0.045, 0.04, 0.012, 0.012, H, 0.78);
    return { depth: 0.06 };
  },
  scimitar(mb, S) {
    const R = S.info.R, H = head(R), G = grip(R);
    sseg(mb, S, diag(-0.04), diag(0.04), 0.1, 0.1, 0.1, 0.1, G, 0.9);
    sseg(mb, S, diag(0.04), diag(0.25), 0.07, 0.07, 0.07, 0.07, G);
    sseg(mb, S, diag(0.27, -0.16), diag(0.27, 0.16), 0.06, 0.06, 0.1, 0.1, H, 0.85, 0.1);
    // the blade curves back (toward -v), widening toward the tip, then sweeps to a point
    const N = 8; let prev = diag(0.3);
    for (let i = 1; i <= N; i++) { const t = i / N, u = 0.3 + t * 0.85, v = -0.16 * t * t, p = diag(u, v); sseg(mb, S, prev, p, 0.13 + t * 0.05, 0.13 + t * 0.06, 0.04, 0.035, H, 1, 0.2); prev = p; }
    sseg(mb, S, prev, diag(1.24, -0.06), 0.18, 0.02, 0.035, 0.02, H, 1.05, 0.2);
    return { depth: 0.05 };
  },
  falchion(mb, S) {
    const R = S.info.R, H = head(R), G = grip(R);
    sseg(mb, S, diag(-0.04), diag(0.04), 0.1, 0.1, 0.1, 0.1, G, 0.9);
    sseg(mb, S, diag(0.04), diag(0.26), 0.075, 0.075, 0.075, 0.075, G);
    sseg(mb, S, diag(0.28, -0.18), diag(0.28, 0.18), 0.07, 0.07, 0.1, 0.1, H, 0.85, 0.1);
    sseg(mb, S, diag(0.3), diag(0.85), 0.15, 0.24, 0.045, 0.04, H, 1, 0.08);                    // broadening toward the tip
    sseg(mb, S, diag(0.85), diag(1.1, -0.06), 0.24, 0.05, 0.04, 0.02, H, 1.05, 0.1);
    return { depth: 0.05 };
  },
  rapier(mb, S) {
    const R = S.info.R, H = head(R), G = grip(R), M = commonP(S, metalOk);
    sseg(mb, S, diag(-0.05), diag(0.03), 0.1, 0.1, 0.1, 0.1, G, 0.95);
    sseg(mb, S, diag(0.03), diag(0.24), 0.06, 0.06, 0.06, 0.06, G);
    // the swept hilt: a cup, a ring and a knuckle bow
    sseg(mb, S, diag(0.26, -0.16), diag(0.26, 0.16), 0.05, 0.05, 0.08, 0.08, H, 0.9, 0.08);
    sloop(mb, shadeOf(M, 0.95), diag(0.3, 0, 0), 0.1, VD, ZD, 8, 0.03, 0.03);
    partSegSpot(mb, diag(0.26, 0.16), diag(0.02, 0.12), 0.03, 0.03, shadeOf(M, 0.9));
    sdisc(mb, ...diag(0.28).slice(0, 2), -0.01, 0.01, 0.11, shadeOf(M, 0.85));
    sseg(mb, S, diag(0.3), diag(1.25), 0.05, 0.03, 0.03, 0.02, H, 1.05, 0.1);
    return { depth: 0.11 };
  },
  sickle(mb, S) {
    const R = S.info.R, G = grip(R), M = commonP(S, metalOk);
    sseg(mb, S, diag(-0.04), diag(0.36), 0.075, 0.08, 0.075, 0.08, G);
    sseg(mb, S, diag(0.36), diag(0.44), 0.09, 0.09, 0.09, 0.09, G, 0.8);
    // the crescent: up and round to the other side
    const c = diag(0.68, 0.18); let prev = null;
    for (let k = 0; k <= 9; k++) { const a = Math.PI * (1.25 - k / 9 * 1.15), p = [c[0] + Math.cos(a) * 0.3, c[1] + Math.sin(a) * 0.3, 0]; if (prev) partSegSpot(mb, prev, p, 0.07 - k * 0.005, 0.03, shadeOf(M, 1 + k * 0.01)); prev = p; }
    return { depth: 0.05 };
  },
  // ---- axes ----
  handaxe(mb, S, k, d) { return T3D.axe(mb, S, k, d); },
  greataxe(mb, S) {
    const R = S.info.R, H = head(R);
    T3D.handle(mb, S, 1.02, { w: 0.08 });
    sseg(mb, S, diag(0.66), diag(0.98), 0.12, 0.12, 0.12, 0.12, H, 0.8);
    for (const sgn of [1, -1]) {
      for (let k = 0; k < 5; k++) {
        const v0 = 0.05 + k * 0.06, v1 = v0 + 0.06, wd = 0.2 + k * 0.07, dd = 0.08 - k * 0.01;
        sseg(mb, S, diag(0.82, sgn * v0), diag(0.82, sgn * v1), wd, wd + 0.07, dd, dd - 0.01, H, k === 4 ? 1.12 : 1, 0.2);
      }
      sseg(mb, S, diag(0.82, sgn * 0.35), diag(0.82, sgn * 0.37), 0.55, 0.57, 0.025, 0.02, H, 1.25, 0.2);
    }
    sspike(mb, commonP(S, metalOk), diag(0.98), diag(1.12), 0.07);
    return { depth: 0.06 };
  },
  war_pick(mb, S) {
    const R = S.info.R, H = head(R);
    T3D.handle(mb, S, 0.9);
    sseg(mb, S, diag(0.74), diag(0.9), 0.11, 0.11, 0.11, 0.11, H, 0.8);
    // a long curved spike one way, a small hammer face the other
    let prev = diag(0.82, 0.04);
    for (let k = 1; k <= 6; k++) { const t = k / 6, p = diag(0.82 - t * t * 0.18, 0.04 + t * 0.4); sseg(mb, S, prev, p, 0.11 - t * 0.08, 0.1 - t * 0.08, 0.09 - t * 0.06, 0.08 - t * 0.06, H, 1, 0.2); prev = p; }
    sseg(mb, S, diag(0.82, -0.04), diag(0.82, -0.17), 0.13, 0.15, 0.12, 0.13, H, 0.9, 0.2);
    return { depth: 0.07 };
  },
  // ---- hammers, maces, clubs ----
  mace(mb, S) {
    const R = S.info.R, H = head(R), M = commonP(S, metalOk);
    T3D.handle(mb, S, 0.66, { w: 0.07 });
    const c = diag(0.8);
    sseg(mb, S, diag(0.64), diag(0.96), 0.13, 0.13, 0.13, 0.13, H, 0.9);                       // the core
    for (const [a, b] of [[VD, 0.17], [ZD, 0.17], [[(VD[0] + ZD[0]) * RT2, (VD[1] + ZD[1]) * RT2, RT2], 0.16], [[(VD[0] - ZD[0]) * RT2, (VD[1] - ZD[1]) * RT2, -RT2], 0.16]]) {
      for (const s of [1, -1]) { const o = [a[0] * b * s, a[1] * b * s, a[2] * b * s]; partSegSpot(mb, [c[0] + o[0] - UD[0] * 0.13, c[1] + o[1] - UD[1] * 0.13, o[2]], [c[0] + o[0] + UD[0] * 0.12, c[1] + o[1] + UD[1] * 0.12, o[2]], 0.05, 0.05, shadeOf(M, s > 0 ? 1.08 : 0.92)); }
    }
    sseg(mb, S, diag(0.96), diag(1.03), 0.07, 0.04, 0.07, 0.04, H, 1.1);
    return { depth: 0.2 };
  },
  morningstar(mb, S) {
    const R = S.info.R, H = head(R), M = brightP(S) || commonP(S, metalOk);
    T3D.handle(mb, S, 0.66, { w: 0.07 });
    const c = diag(0.84);
    sball(mb, S, c[0], c[1], 0, 0.17, H, 6);
    for (const dir of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [RT2, RT2, 0], [-RT2, RT2, 0], [RT2, -RT2, 0], [0.6, 0, 0.8], [-0.6, 0, -0.8], [0, 0.6, -0.8]])
      sspike(mb, shadeOf(M, 1.05), [c[0] + dir[0] * 0.13, c[1] + dir[1] * 0.13, dir[2] * 0.13], [c[0] + dir[0] * 0.29, c[1] + dir[1] * 0.29, dir[2] * 0.29], 0.05);
    return { depth: 0.29 };
  },
  flail(mb, S) {
    const R = S.info.R, H = head(R), M = commonP(S, metalOk);
    T3D.handle(mb, S, 0.5, { w: 0.07 });
    sseg(mb, S, diag(0.48), diag(0.55), 0.1, 0.1, 0.1, 0.1, H, 0.85);
    // the chain hangs off and swings out; a spiked ball at its end
    const pts = [diag(0.55), diag(0.66, 0.04), diag(0.76, 0.1), diag(0.85, 0.18)];
    for (let i = 0; i < pts.length - 1; i++) sloop(mb, shadeOf(M, 0.9 + i * 0.04), lerp3(pts[i], pts[i + 1], 0.5), 0.045, i % 2 ? VD : UD, ZD, 6, 0.022, 0.022);
    const c = diag(0.98, 0.26);
    sball(mb, S, c[0], c[1], 0, 0.14, H, 6);
    for (const dir of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [RT2, RT2, 0], [-RT2, -RT2, 0]])
      sspike(mb, shadeOf(M, 1.08), [c[0] + dir[0] * 0.1, c[1] + dir[1] * 0.1, dir[2] * 0.1], [c[0] + dir[0] * 0.22, c[1] + dir[1] * 0.22, dir[2] * 0.22], 0.045);
    return { depth: 0.22 };
  },
  warhammer(mb, S) {
    const R = S.info.R, H = head(R);
    T3D.handle(mb, S, 0.95);
    sseg(mb, S, diag(0.74), diag(0.95), 0.11, 0.11, 0.11, 0.11, H, 0.8);
    sseg(mb, S, diag(0.84, 0.02), diag(0.84, 0.24), 0.2, 0.22, 0.18, 0.2, H, 1, 0.3);         // the striking face
    sseg(mb, S, diag(0.84, 0.24), diag(0.84, 0.27), 0.23, 0.23, 0.21, 0.21, H, 1.12, 0.3);
    sspike(mb, commonP(S, metalOk), diag(0.84, -0.02), diag(0.8, -0.26), 0.1);                 // the beak at the back
    sseg(mb, S, diag(0.95), diag(1.05), 0.06, 0.03, 0.06, 0.03, H, 1.05);
    return { depth: 0.11 };
  },
  light_hammer(mb, S) {
    const R = S.info.R, H = head(R);
    T3D.handle(mb, S, 0.72, { w: 0.065 });
    sseg(mb, S, diag(0.62, -0.15), diag(0.62, 0.17), 0.17, 0.17, 0.15, 0.15, H, 1, 0.3);
    sseg(mb, S, diag(0.62, 0.17), diag(0.62, 0.2), 0.19, 0.19, 0.17, 0.17, H, 1.12, 0.3);
    return { depth: 0.09 };
  },
  maul(mb, S) {
    const R = S.info.R, H = head(R), M = commonP(S, metalOk);
    T3D.handle(mb, S, 0.9, { w: 0.08 });
    sseg(mb, S, diag(0.78, -0.28), diag(0.78, 0.28), 0.32, 0.32, 0.28, 0.28, H, 1, 0.56);      // a great block of a head
    for (const v of [-0.3, 0.3]) sseg(mb, S, diag(0.78, v), diag(0.78, v * 1.08), 0.34, 0.34, 0.3, 0.3, H, 1.12, 0.3);
    for (const u of [0.66, 0.9]) partSegSpot(mb, diag(u, -0.29, 0.145), diag(u, 0.29, 0.145), 0.03, 0.02, shadeOf(M, 0.8));   // iron bands
    return { depth: 0.16 };
  },
  greatclub(mb, S) {
    const R = S.info.R, H = head(R);
    sseg(mb, S, diag(-0.02), diag(0.35), 0.1, 0.12, 0.1, 0.12, grip(R));
    sseg(mb, S, diag(0.35), diag(1.15), 0.14, 0.34, 0.14, 0.32, H, 1, 0.1);
    for (const [u, v] of [[0.6, 0.15], [0.75, -0.18], [0.9, 0.2], [1.02, -0.13], [0.72, 0.02], [0.95, 0.0]]) sspike(mb, shadeOf(S(diag(u)[0], diag(u)[1]) || brightP(S), 1.2), diag(u, v), diag(u, v * 1.7, 0.05), 0.05);
    return { depth: 0.16 };
  },
  quarterstaff(mb, S) {
    const R = S.info.R, W = commonP(S, woodOk);
    sseg(mb, S, diag(-0.06), diag(1.18), 0.07, 0.07, 0.07, 0.07, null, 1, 0.1);
    for (const u of [-0.06, 1.12]) partSegSpot(mb, diag(u), diag(u + 0.07), 0.085, 0.085, shadeOf(commonP(S, metalOk) || W, 0.85));
    for (const u of [0.42, 0.52, 0.66, 0.76]) partSegSpot(mb, diag(u), diag(u + 0.025), 0.082, 0.082, shadeOf(W, 0.7));
    return { depth: 0.045 };
  },
  druid_staff(mb, S) {
    const R = S.info.R, W = commonP(S, woodOk), leaf = S.info.px.find(p => p.g > p.r + 20 && p.g > p.b) || vividP(S);
    // a living branch: knotted, a fork at the top, leaves sprouting
    let prev = diag(-0.06);
    for (let k = 1; k <= 10; k++) { const u = -0.06 + k * 0.115, p = diag(u, Math.sin(k * 1.7) * 0.02); partSegSpot(mb, prev, p, 0.075, 0.075, shadeOf(W, 0.9 + (k % 3) * 0.06)); prev = p; }
    for (const v of [-0.12, 0.12]) partSegSpot(mb, diag(1.0), diag(1.16, v), 0.05, 0.05, shadeOf(W, 0.95));
    for (const [u, v, z] of [[1.12, -0.16, 0.03], [1.14, 0.17, -0.03], [1.04, 0.1, 0.06], [0.98, -0.12, -0.05], [0.55, 0.06, 0.04]]) { const c = diag(u, v, z); cbox(mb, c[0] - 0.05, c[1] - 0.03, c[2] - 0.015, c[0] + 0.05, c[1] + 0.03, c[2] + 0.015, shadeOf(leaf, 1)); }
    const c = diag(1.1);
    cbox(mb, c[0] - 0.05, c[1] - 0.05, -0.05, c[0] + 0.05, c[1] + 0.05, 0.05, shadeOf(vividP(S), 1.15));
    return { depth: 0.08, glow: true };
  },
  // ---- polearms and spears ----
  spear(mb, S, k, d, o = {}) {
    const R = S.info.R, W = commonP(S, woodOk), M = commonP(S, metalOk), len = o.len || 1.0, w = o.w || 0.06;
    partSegSpot(mb, diag(-0.06), diag(len), w, w, W);
    for (const u of [0.25, 0.32]) partSegSpot(mb, diag(u), diag(u + 0.025), w + 0.015, w + 0.015, shadeOf(commonP(S, p => p.lum < 100) || W, 0.8));
    partSegSpot(mb, diag(len - 0.02), diag(len + 0.06), w + 0.02, w + 0.02, shadeOf(M, 0.85));      // the socket
    partSegSpot(mb, diag(len + 0.06), diag(len + 0.2), (o.blade || 0.13), (o.blade || 0.13) * 0.8, shadeOf(M, 1.05));
    partSegSpot(mb, diag(len + 0.2), diag(len + 0.33), (o.blade || 0.13) * 0.8, 0.02, shadeOf(M, 1.1));
    return { depth: 0.05 };
  },
  javelin(mb, S, k, d) { return T3D_DND.spear(mb, S, k, d, { len: 0.92, w: 0.045, blade: 0.09 }); },
  pike(mb, S, k, d) { return T3D_DND.spear(mb, S, k, d, { len: 1.12, w: 0.05, blade: 0.1 }); },
  glaive(mb, S) {
    const W = commonP(S, woodOk), M = commonP(S, metalOk);
    partSegSpot(mb, diag(-0.06), diag(0.86), 0.06, 0.06, W);
    partSegSpot(mb, diag(0.84), diag(0.92), 0.08, 0.08, shadeOf(M, 0.85));
    // a long single-edged blade, its edge bowed out toward +v
    let prev = diag(0.92, 0.02);
    for (let k = 1; k <= 6; k++) { const t = k / 6, p = diag(0.92 + t * 0.38, 0.02 + Math.sin(t * Math.PI) * 0.05 - t * 0.02); partSegSpot(mb, prev, p, 0.16 - t * 0.08, 0.035, shadeOf(M, 1 + t * 0.08)); prev = p; }
    sspike(mb, M, diag(0.98, -0.06), diag(0.92, -0.16), 0.04);                                   // a back spur
    return { depth: 0.05 };
  },
  halberd(mb, S) {
    const W = commonP(S, woodOk), M = commonP(S, metalOk);
    partSegSpot(mb, diag(-0.06), diag(0.98), 0.06, 0.06, W);
    for (const u of [0.18, 0.26]) partSegSpot(mb, diag(u), diag(u + 0.025), 0.075, 0.075, shadeOf(M, 0.75));
    partSegSpot(mb, diag(0.82), diag(0.98), 0.08, 0.08, shadeOf(M, 0.85));
    sspike(mb, shadeOf(M, 1.05), diag(0.98), diag(1.24), 0.09);                                   // the top spike
    for (let k = 0; k < 4; k++) { const v0 = 0.04 + k * 0.07; partSegSpot(mb, diag(0.89, v0), diag(0.89, v0 + 0.07), 0.15 + k * 0.05, 0.035, shadeOf(M, 1 + k * 0.04)); }   // the axe blade
    partSegSpot(mb, diag(0.89, 0.32), diag(0.89, 0.34), 0.36, 0.03, shadeOf(M, 1.2));
    sspike(mb, shadeOf(M, 0.95), diag(0.9, -0.04), diag(0.84, -0.22), 0.06);                       // the hook at the back
    return { depth: 0.05 };
  },
  lance(mb, S) {
    const W = commonP(S, woodOk), M = commonP(S, metalOk), V = vividP(S);
    partSegSpot(mb, diag(-0.06), diag(0.22), 0.06, 0.06, shadeOf(W, 0.85));                       // the grip
    sdisc(mb, ...diag(0.24).slice(0, 2), -0.02, 0.02, 0.17, shadeOf(M, 0.95));                    // the vamplate
    for (let k = 0; k < 8; k++) { const u0 = 0.25 + k * 0.12, w = 0.15 - k * 0.016; partSegSpot(mb, diag(u0), diag(u0 + 0.12), w, w, shadeOf(k % 2 ? V || W : W, 1)); }   // the tapering shaft, painted in stripes
    sspike(mb, M, diag(1.21), diag(1.32), 0.035);
    return { depth: 0.17 };
  },
  trident(mb, S) {
    const W = commonP(S, woodOk), M = commonP(S, metalOk);
    partSegSpot(mb, diag(-0.06), diag(0.86), 0.06, 0.06, W);
    partSegSpot(mb, diag(0.86, -0.18), diag(0.86, 0.18), 0.06, 0.06, shadeOf(M, 0.9));            // the crossbar
    for (const v of [-0.17, 0, 0.17]) { partSegSpot(mb, diag(0.86, v), diag(1.14, v), 0.045, 0.045, M); sspike(mb, shadeOf(M, 1.1), diag(1.14, v), diag(1.24, v), 0.045); partSegSpot(mb, diag(1.1, v), diag(1.06, v + (v >= 0 ? 0.05 : -0.05)), 0.03, 0.03, M); }
    return { depth: 0.05 };
  },
  whip(mb, S) {
    const R = S.info.R, G = grip(R), L = commonP(S, p => p.r > p.b) || commonP(S);
    sseg(mb, S, diag(-0.04), diag(0.3), 0.075, 0.07, 0.075, 0.07, G);
    for (const u of [0.05, 0.15, 0.25]) sseg(mb, S, diag(u), diag(u + 0.02), 0.085, 0.085, 0.085, 0.085, G, 0.7);
    // the lash, coiled in loops
    const c = diag(0.68, 0.12);
    for (let r = 0; r < 3; r++) sloop(mb, shadeOf(L, 0.9 + r * 0.06), [c[0], c[1], (r - 1) * 0.04], 0.22 - r * 0.03, [1, 0, 0], [0, 1, 0], 12, 0.035, 0.035);
    partSegSpot(mb, diag(0.3), [c[0] - 0.2, c[1] - 0.08, -0.04], 0.04, 0.04, L);
    return { depth: 0.08 };
  },
  // ---- ranged ----
  crossbow(mb, S, k, d, o = {}) {
    const sc = o.sc || 1, W = commonP(S, woodOk), M = commonP(S, metalOk), str = tileSpot('white_wool');
    const at = (u, v = 0, z = 0) => diag(0.1 + (u - 0.1) * sc, v * sc, z);
    partSegSpot(mb, at(-0.02), at(0.9), 0.1 * sc, 0.08 * sc, W);                                     // the stock
    partSegSpot(mb, at(-0.02), at(0.25), 0.14 * sc, 0.09 * sc, shadeOf(W, 0.88));                    // the butt
    partSegSpot(mb, at(0.45), at(0.85), 0.03 * sc, 0.025 * sc, shadeOf(M, 0.8));                     // the groove's rail
    // the prod: two arms curving back from the front, and the string between their tips
    const tip = [];
    for (const s of [1, -1]) { let prev = at(0.86); for (let i = 1; i <= 4; i++) { const t = i / 4, p = at(0.86 - t * t * 0.14, s * t * 0.46); partSegSpot(mb, prev, p, 0.06 * sc, 0.06 * sc, shadeOf(o.steel ? M : W, 0.95 + i * 0.02)); prev = p; } tip.push(prev); }
    const nut = at(0.52);
    partSegSpot(mb, tip[0], nut, 0.016, 0.016, str); partSegSpot(mb, tip[1], nut, 0.016, 0.016, str);
    partSegSpot(mb, at(0.32, -0.02, 0), at(0.25, -0.1, 0), 0.03 * sc, 0.03 * sc, M);                // the trigger
    partSegSpot(mb, at(0.88), at(0.95), 0.08 * sc, 0.08 * sc, shadeOf(M, 0.9));                      // the stirrup
    return { depth: 0.07 * sc };
  },
  hand_crossbow(mb, S, k, d) { return T3D_DND.crossbow(mb, S, k, d, { sc: 0.72, steel: true }); },
  heavy_crossbow(mb, S, k, d) { return T3D_DND.crossbow(mb, S, k, d, { sc: 1.15, steel: true }); },
  sling(mb, S) {
    const L = commonP(S, p => p.r > p.b) || commonP(S), str = shadeOf(L, 0.75), stone = tileSpot('cobblestone');
    const pouch = [0.1, -0.05, 0];
    cbox(mb, pouch[0] - 0.13, pouch[1] - 0.06, -0.07, pouch[0] + 0.13, pouch[1] + 0.06, 0.07, L);
    cbox(mb, pouch[0] - 0.07, pouch[1] - 0.03, -0.05, pouch[0] + 0.07, pouch[1] + 0.1, 0.05, stone);
    for (const s of [-1, 1]) { let prev = [pouch[0] + s * 0.13, pouch[1], 0]; for (let k = 1; k <= 5; k++) { const p = [pouch[0] + s * (0.13 + k * 0.05), pouch[1] + k * 0.08, Math.sin(k) * 0.02]; partSegSpot(mb, prev, p, 0.02, 0.02, str); prev = p; } cbox(mb, prev[0] - 0.03, prev[1] - 0.03, -0.03, prev[0] + 0.03, prev[1] + 0.03, 0.03, shadeOf(L, 0.9)); }
    return { depth: 0.07 };
  },
  dart(mb, S) {
    const M = commonP(S, metalOk), W = commonP(S, woodOk), F = brightP(S);
    for (const [ox, oy, z] of [[-0.08, 0.06, -0.05], [0.04, -0.04, 0.0], [0.14, -0.14, 0.05]]) {
      const a = [-0.3 + ox, -0.3 + oy, z], b = [0.3 + ox, 0.3 + oy, z];
      partSegSpot(mb, a, lerp3(a, b, 0.75), 0.035, 0.035, W);
      sspike(mb, M, lerp3(a, b, 0.75), b, 0.05);
      partSegSpot(mb, a, lerp3(a, b, 0.22), 0.1, 0.01, F); partSegSpot(mb, a, lerp3(a, b, 0.22), 0.01, 0.1, F);
    }
    return { depth: 0.1 };
  },
  blowgun(mb, S) {
    const W = commonP(S, woodOk), D = shadeOf(commonP(S, darkOk) || W, 0.8);
    partSegSpot(mb, diag(-0.04), diag(1.2), 0.07, 0.07, W);
    for (const u of [-0.04, 0.3, 0.7, 1.12]) partSegSpot(mb, diag(u), diag(u + 0.06), 0.09, 0.09, D);
    return { depth: 0.045 };
  },
  pistol(mb, S) {
    const W = commonP(S, woodOk), M = commonP(S, metalOk);
    partSegSpot(mb, [-0.36, -0.36, 0], [-0.1, -0.02, 0], 0.13, 0.09, W);                              // the grip
    partSegSpot(mb, [-0.18, 0.02, 0], [0.42, 0.06, 0], 0.08, 0.07, M);                                // the barrel
    partSegSpot(mb, [-0.22, -0.04, 0], [0.1, 0.0, 0], 0.11, 0.08, W);                                 // the stock under it
    partSegSpot(mb, [-0.14, 0.06, 0], [-0.1, 0.16, 0], 0.04, 0.04, shadeOf(M, 0.85));                // the hammer
    sloop(mb, shadeOf(M, 0.9), [-0.1, -0.1, 0], 0.06, [1, 0, 0], [0, 1, 0], 6, 0.02, 0.02);          // the trigger guard
    return { depth: 0.06 };
  },
  musket(mb, S) {
    const W = commonP(S, woodOk), M = commonP(S, metalOk);
    partSegSpot(mb, diag(-0.06, -0.04), diag(0.42), 0.16, 0.08, W);
    partSegSpot(mb, diag(0.4), diag(0.95), 0.08, 0.07, W);
    partSegSpot(mb, diag(0.38, 0.05), diag(1.28, 0.05), 0.05, 0.05, M);
    for (const u of [0.6, 0.9]) partSegSpot(mb, diag(u, 0.02), diag(u + 0.03, 0.02), 0.11, 0.09, shadeOf(M, 0.85));
    partSegSpot(mb, diag(0.4, 0.09), diag(0.44, 0.15), 0.04, 0.04, M);
    return { depth: 0.06 };
  },
  // ---- shields ----
  shield(mb, S, k, d) {
    const W = commonP(S, woodOk), M = commonP(S, metalOk) || brightP(S), V = vividP(S);
    // a heater shield facing you: planks, an iron rim, a boss, and the picture's colours on its face
    const rows = [[0.42, 0.4], [0.3, 0.41], [0.15, 0.4], [0.0, 0.37], [-0.15, 0.31], [-0.28, 0.23], [-0.38, 0.14], [-0.45, 0.06]];
    for (let i = 0; i < rows.length - 1; i++) { const [y1, w1] = rows[i], [y0] = rows[i + 1]; cbox(mb, -w1, y0, -0.035, w1, y1, 0.035, shadeOf(S(0, (y0 + y1) / 2) || W, 1)); }
    for (let i = 0; i < rows.length - 1; i++) { const [y1, w1] = rows[i], [y0, w0] = rows[i + 1]; for (const s of [-1, 1]) partSegSpot(mb, [s * w1, y1, 0], [s * w0, y0, 0], 0.035, 0.09, shadeOf(M, 0.92)); }
    cbox(mb, -0.41, 0.4, -0.045, 0.41, 0.45, 0.045, shadeOf(M, 1.05));
    sdisc(mb, 0, 0.06, 0.035, 0.08, 0.1, shadeOf(M, 1.12));
    sdisc(mb, 0, 0.06, 0.08, 0.1, 0.05, shadeOf(M, 1.25));
    // the strap behind
    cbox(mb, -0.2, -0.02, -0.08, 0.2, 0.06, -0.035, shadeOf(commonP(S, darkOk) || W, 0.8));
    return { depth: 0.1 };
  },
  // ---- holy symbols, focuses, jewellery ----
  amulet(mb, S) {
    const M = commonP(S, p => p.sat < 0.6) || commonP(S), G = vividP(S);
    for (let k = 0; k < 10; k++) { const a = Math.PI * (0.1 + k / 10 * 0.8), b = Math.PI * (0.1 + (k + 1) / 10 * 0.8); partSegSpot(mb, [Math.cos(a) * 0.34, -0.02 + Math.sin(a) * 0.42, 0], [Math.cos(b) * 0.34, -0.02 + Math.sin(b) * 0.42, 0], 0.03, 0.03, shadeOf(M, 0.9 + (k % 2) * 0.12)); }
    partSegSpot(mb, [Math.cos(Math.PI * 0.1) * 0.34, 0.11, 0], [0, -0.12, 0], 0.03, 0.03, M); partSegSpot(mb, [Math.cos(Math.PI * 0.9) * 0.34, 0.11, 0], [0, -0.12, 0], 0.03, 0.03, M);
    sdisc(mb, 0, -0.24, -0.04, 0.04, 0.15, shadeOf(M, 1.05));
    sdisc(mb, 0, -0.24, 0.04, 0.07, 0.08, shadeOf(G, 1.1));
    return { depth: 0.07 };
  },
  orb(mb, S) {
    const G = vividP(S), M = commonP(S, p => p.lum < 150) || commonP(S);
    sball(mb, S, 0, 0.08, 0, 0.27, p => p.sat > 0.2 || p.lum > 150, 7);
    cbox(mb, -0.08, 0.15, 0.24, 0.0, 0.24, 0.27, shadeOf(brightP(S), 1.3));                         // a glint
    // a claw stand
    for (const a of [0, 2.1, 4.2]) partSegSpot(mb, [Math.cos(a) * 0.1, -0.36, Math.sin(a) * 0.1], [Math.cos(a) * 0.24, -0.08, Math.sin(a) * 0.24], 0.04, 0.04, shadeOf(M, 0.9));
    sring(mb, 0, 0, -0.46, -0.36, 0.16, shadeOf(M, 0.85));
    return { depth: 0.27, glow: true, stand: true };
  },
  ring(mb, S) {
    const M = commonP(S, p => p.sat < 0.7) || commonP(S), G = vividP(S);
    sloop(mb, M, [0, -0.08, 0], 0.26, [1, 0, 0], [0, 1, 0], 14, 0.07, 0.1);
    cbox(mb, -0.1, 0.16, -0.08, 0.1, 0.24, 0.08, shadeOf(M, 1.1));
    cbox(mb, -0.08, 0.24, -0.06, 0.08, 0.34, 0.06, shadeOf(G, 1.1));
    return { depth: 0.1 };
  },
  // ---- books and scrolls ----
  spellbook(mb, S, k, d) {
    const r = M3D.book(mb, S.info, k, d);
    const M = commonP(S, p => p.r > p.b && p.sat > 0.3) || brightP(S);
    for (const y of [-0.15, 0.15]) cbox(mb, 0.26, y - 0.03, -0.12, 0.36, y + 0.03, 0.135, shadeOf(M, 1));   // clasps
    for (const [x, y] of [[-0.28, 0.36], [0.28, 0.36], [-0.28, -0.36], [0.28, -0.36]]) cbox(mb, x - 0.04, y - 0.04, 0.11, x + 0.04, y + 0.04, 0.135, shadeOf(M, 1.1));   // corner guards
    return r;
  },
  scroll(mb, S) {
    const P = commonP(S, p => p.lum > 150) || brightP(S), W = commonP(S, woodOk) || shadeOf(P, 0.6), Rb = vividP(S);
    // rolled parchment along the diagonal with wooden ends and a ribbon
    sseg(mb, S, diag(0.2), diag(0.98), 0.17, 0.17, 0.17, 0.17, p => p.lum > 120, 1, 0.1);
    for (const u of [0.13, 1.0]) { partSegSpot(mb, diag(u), diag(u + 0.07), 0.12, 0.12, W); partSegSpot(mb, diag(u - 0.03), diag(u), 0.06, 0.06, shadeOf(W, 0.85)); }
    partSegSpot(mb, diag(0.56), diag(0.62), 0.185, 0.185, Rb);
    partSegSpot(mb, diag(0.6, 0.06), diag(0.45, 0.22), 0.04, 0.01, Rb);
    return { depth: 0.09 };
  },
  // ---- instruments and kits ----
  lute(mb, S) {
    const W = commonP(S, woodOk), D = shadeOf(commonP(S, darkOk) || W, 0.7), str = tileSpot('white_wool');
    const c = diag(0.2);
    for (const [r, k] of [[0.3, 1], [0.24, 1.05]]) sdisc(mb, c[0], c[1], -0.08 * k, 0.06, r, shadeOf(W, k));
    sdisc(mb, c[0], c[1], 0.06, 0.065, 0.07, D);                                                     // the sound hole
    partSegSpot(mb, diag(0.42), diag(0.98), 0.08, 0.05, shadeOf(W, 0.85));                           // the neck
    partSegSpot(mb, diag(0.98), diag(1.06, -0.1), 0.1, 0.06, shadeOf(W, 0.8));                      // the head, bent back
    for (const v of [-0.025, 0, 0.025]) partSegSpot(mb, diag(0.08, v, 0.07), diag(0.98, v, 0.035), 0.008, 0.008, str);
    for (const [u, v] of [[1.0, 0.05], [1.03, -0.02], [1.06, -0.08]]) cbox(mb, ...diag(u, v + 0.06).slice(0, 2).map(q => q - 0.015), -0.02, ...diag(u, v + 0.06).slice(0, 2).map(q => q + 0.015), 0.02, D);
    return { depth: 0.08 };
  },
  toolroll(mb, S) {
    const L = commonP(S, p => p.r > p.b) || commonP(S), M = commonP(S, metalOk) || brightP(S);
    cbox(mb, -0.4, -0.2, -0.03, 0.4, 0.14, 0.03, L);                                                  // the open roll
    cbox(mb, 0.28, -0.2, -0.07, 0.42, 0.14, 0.07, shadeOf(L, 0.85));                                 // rolled up at one end
    for (let i = 0; i < 6; i++) { const x = -0.33 + i * 0.1; partSegSpot(mb, [x, -0.12, 0.04], [x + (i % 2 ? 0.03 : -0.02), 0.32 + (i % 3) * 0.04, 0.04], 0.025, 0.02, shadeOf(M, 0.95 + i * 0.03)); }
    for (let i = 0; i < 6; i++) cbox(mb, -0.36 + i * 0.1, -0.04, 0.03, -0.3 + i * 0.1, 0.02, 0.05, shadeOf(L, 0.75));   // the loops
    return { depth: 0.07 };
  },
  smiths_tools(mb, S) {
    const M = commonP(S, metalOk) || brightP(S), W = commonP(S, woodOk) || shadeOf(M, 0.6);
    // a hammer and a pair of tongs, crossed
    partSegSpot(mb, [-0.35, -0.38, 0.03], [0.22, 0.25, 0.03], 0.06, 0.06, W);
    partSegSpot(mb, [0.1, 0.36, 0.03], [0.36, 0.1, 0.03], 0.13, 0.12, M);
    for (const s of [-1, 1]) partSegSpot(mb, [0.35, -0.38 + s * 0.03, -0.04], [-0.25, 0.2 + s * 0.05, -0.04], 0.035, 0.035, shadeOf(M, 0.9));
    partSegSpot(mb, [-0.25, 0.22, -0.04], [-0.34, 0.36, -0.04], 0.05, 0.03, shadeOf(M, 0.85));
    return { depth: 0.1 };
  },
  satchel(mb, S) {
    const L = commonP(S, p => p.lum > 40 && p.lum < 220) || commonP(S), D = shadeOf(darkestP(S) || L, 0.9), V = vividP(S);
    cbox(mb, -0.34, -0.36, -0.14, 0.34, 0.14, 0.14, L);
    cbox(mb, -0.36, 0.0, -0.16, 0.36, 0.2, 0.16, shadeOf(L, 0.9));                                    // the flap
    cbox(mb, -0.07, -0.08, 0.16, 0.07, 0.04, 0.18, V);                                                // the clasp (or the healer's cross)
    for (let k = 0; k < 7; k++) { const a = Math.PI * (0.15 + k / 7 * 0.7), b = Math.PI * (0.15 + (k + 1) / 7 * 0.7); partSegSpot(mb, [Math.cos(a) * 0.3, 0.16 + Math.sin(a) * 0.3, 0], [Math.cos(b) * 0.3, 0.16 + Math.sin(b) * 0.3, 0], 0.045, 0.03, D); }
    return { depth: 0.18, stand: true };
  },
  bundle(mb, S) {
    // a pack: the bag, a bedroll strapped on top, a pot hanging off the side
    const L = commonP(S, p => p.lum > 40 && p.lum < 220) || commonP(S), D = shadeOf(darkestP(S) || L, 0.9);
    cbox(mb, -0.3, -0.42, -0.18, 0.3, 0.16, 0.18, L);
    cbox(mb, -0.32, 0.04, -0.2, 0.32, 0.2, 0.2, shadeOf(L, 0.88));
    cbox(mb, -0.38, 0.2, -0.12, 0.38, 0.38, 0.12, shadeOf(vividP(S) || L, 0.85));
    for (const x of [-0.2, 0.2]) cbox(mb, x - 0.03, 0.19, -0.13, x + 0.03, 0.39, 0.13, D);
    cbox(mb, -0.18, -0.3, 0.18, 0.18, -0.06, 0.25, shadeOf(L, 1.06));
    return { depth: 0.25, stand: true };
  },
  parcel(mb, S) {
    const P = commonP(S, p => p.lum > 60) || commonP(S), str = shadeOf(darkestP(S) || P, 0.9);
    cbox(mb, -0.34, -0.34, -0.12, 0.34, 0.12, 0.12, P);
    cbox(mb, -0.3, 0.12, -0.1, 0.3, 0.18, 0.1, shadeOf(P, 1.08));
    cbox(mb, -0.35, -0.13, -0.125, 0.35, -0.09, 0.125, str); cbox(mb, -0.02, -0.35, -0.125, 0.02, 0.19, 0.125, str);
    cbox(mb, -0.06, 0.18, -0.03, 0.06, 0.24, 0.03, str);
    return { depth: 0.125, stand: true };
  },
  candles(mb, S) {
    const Wx = commonP(S, p => p.lum > 140) || brightP(S), F = tileSpot('torch', 7, 3);
    for (const [x, z, h] of [[-0.18, 0.04, 0.5], [0.06, -0.06, 0.7], [0.24, 0.08, 0.38]]) {
      cbox(mb, x - 0.07, -0.5, z - 0.07, x + 0.07, -0.5 + h, z + 0.07, shadeOf(Wx, 1));
      cbox(mb, x - 0.08, -0.5 + h - 0.06, z - 0.08, x + 0.08, -0.5 + h - 0.02, z + 0.08, shadeOf(Wx, 1.06));   // a drip ring
      cbox(mb, x - 0.01, -0.5 + h, z - 0.01, x + 0.01, -0.5 + h + 0.05, z + 0.01, tileSpot('coal_block'));
      cbox(mb, x - 0.025, -0.5 + h + 0.05, z - 0.025, x + 0.025, -0.5 + h + 0.13, z + 0.025, F);
    }
    return { depth: 0.15, stand: true, glow: true };
  },
  coins(mb, S) {
    const G = commonP(S, p => p.lum > 90) || brightP(S);
    for (let i = 0; i < 5; i++) { const y = -0.5 + i * 0.07, ox = Math.sin(i * 1.7) * 0.02; sring(mb, -0.12 + ox, 0, y, y + 0.06, 0.2, shadeOf(G, 0.9 + (i % 2) * 0.1)); }
    sring(mb, 0.22, 0.08, -0.5, -0.44, 0.17, shadeOf(G, 0.95));
    // one standing on its edge
    sdisc(mb, 0.2, -0.24, -0.04, 0.0, 0.18, shadeOf(G, 1.08));
    sdisc(mb, 0.2, -0.24, 0.0, 0.01, 0.1, shadeOf(G, 0.85));
    return { depth: 0.22, stand: true };
  },
  // ---- magic items ----
  wand(mb, S) {
    const D = commonP(S, darkOk) || commonP(S), G = vividP(S), M = commonP(S, metalOk) || brightP(S);
    partSegSpot(mb, diag(0.02), diag(0.3), 0.075, 0.075, shadeOf(D, 0.85));
    for (const u of [0.05, 0.15, 0.25]) partSegSpot(mb, diag(u), diag(u + 0.025), 0.088, 0.088, shadeOf(M, 0.9));
    for (let k = 0; k < 6; k++) { const u0 = 0.3 + k * 0.1, w = 0.06 - k * 0.006; partSegSpot(mb, diag(u0), diag(u0 + 0.1), w, w, shadeOf(D, 1 + k * 0.03)); }
    const c = diag(0.94);
    cbox(mb, c[0] - 0.05, c[1] - 0.05, -0.05, c[0] + 0.05, c[1] + 0.05, 0.05, shadeOf(G, 1.2));
    return { depth: 0.05, glow: true };
  },
  rod(mb, S) {
    const M = commonP(S, p => p.lum > 60) || commonP(S), G = vividP(S);
    partSegSpot(mb, diag(-0.02), diag(0.86), 0.065, 0.065, M);
    for (const u of [0.1, 0.2, 0.3]) partSegSpot(mb, diag(u), diag(u + 0.03), 0.08, 0.08, shadeOf(M, 0.8));
    // a flanged head with a stone set in it
    for (const v of [-1, 1]) for (const z of [0, 1]) { const o = z ? [0, 0, v * 0.09] : [VD[0] * v * 0.09, VD[1] * v * 0.09, 0]; partSegSpot(mb, [diag(0.84)[0] + o[0], diag(0.84)[1] + o[1], o[2]], [diag(1.04)[0] + o[0] * 1.2, diag(1.04)[1] + o[1] * 1.2, o[2] * 1.2], 0.04, 0.04, shadeOf(M, 1.05)); }
    const c = diag(0.97); cbox(mb, c[0] - 0.06, c[1] - 0.06, -0.06, c[0] + 0.06, c[1] + 0.06, 0.06, shadeOf(G, 1.15));
    return { depth: 0.12, glow: true };
  },
  staff_magic(mb, S, k, d) { return T3D.staff(mb, S, k, d); },
  cloak(mb, S) {
    const C = commonP(S, p => p.lum > 30) || commonP(S), D = shadeOf(darkestP(S) || C, 0.95), M = commonP(S, p => p.sat > 0.3 && p.lum > 120) || brightP(S);
    // folded: three layers, each a little smaller, with the clasp on top
    cbox(mb, -0.38, -0.42, -0.14, 0.38, -0.26, 0.14, C);
    cbox(mb, -0.36, -0.26, -0.13, 0.36, -0.12, 0.13, shadeOf(C, 0.92));
    cbox(mb, -0.34, -0.12, -0.12, 0.34, 0.0, 0.12, shadeOf(C, 1.04));
    cbox(mb, -0.39, -0.3, -0.145, 0.39, -0.27, 0.145, D);
    cbox(mb, -0.08, 0.0, -0.04, 0.08, 0.05, 0.04, M); cbox(mb, -0.05, 0.05, -0.02, 0.05, 0.08, 0.02, shadeOf(M, 1.2));
    return { depth: 0.145, stand: true };
  },
  boots(mb, S) {
    const L = commonP(S, p => p.lum > 30 && p.lum < 220) || commonP(S), D = shadeOf(darkestP(S) || L, 0.9), T = vividP(S);
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -0.4 : 0.04, x1 = s < 0 ? -0.04 : 0.4;
      cbox(mb, x0, -0.22, -0.14, x1, 0.26, 0.12, L);
      cbox(mb, x0, -0.42, -0.14, x1, -0.22, 0.32, L);
      cbox(mb, x0 - 0.01, -0.48, -0.15, x1 + 0.01, -0.42, 0.33, D);
      cbox(mb, x0 - 0.015, 0.16, -0.155, x1 + 0.015, 0.28, 0.135, shadeOf(T, 0.95));
    }
    return { depth: 0.33, stand: true };
  },
  gloves(mb, S) {
    const L = commonP(S, p => p.lum > 30 && p.lum < 220) || commonP(S), T = vividP(S);
    for (const s of [-1, 1]) {
      const cx = s * 0.22, z = s * 0.04;
      cbox(mb, cx - 0.14, -0.42, z - 0.07, cx + 0.14, -0.12, z + 0.07, shadeOf(T, 0.9));          // the cuff
      cbox(mb, cx - 0.13, -0.12, z - 0.06, cx + 0.13, 0.14, z + 0.06, L);                           // the palm
      for (let f = 0; f < 4; f++) cbox(mb, cx - 0.12 + f * 0.065, 0.14, z - 0.05, cx - 0.07 + f * 0.065, 0.3 - Math.abs(f - 1.5) * 0.03, z + 0.05, shadeOf(L, 1.04));
      cbox(mb, cx + s * 0.13, -0.06, z - 0.05, cx + s * 0.22, 0.06, z + 0.05, shadeOf(L, 0.95));   // the thumb
    }
    return { depth: 0.11 };
  },
  belt(mb, S) {
    const L = commonP(S, p => p.lum > 30 && p.lum < 200) || commonP(S), M = commonP(S, p => p.lum > 140) || brightP(S);
    sloop(mb, L, [0, -0.05, 0], 0.32, [1, 0, 0], [0, 0, 1], 14, 0.12, 0.04);
    sloop(mb, shadeOf(L, 0.9), [0.06, 0.07, 0.02], 0.24, [1, 0, 0], [0, 0, 1], 12, 0.12, 0.04);
    cbox(mb, -0.12, -0.13, 0.27, 0.12, 0.05, 0.33, M); cbox(mb, -0.07, -0.08, 0.33, 0.07, 0.0, 0.35, shadeOf(L, 0.7));
    return { depth: 0.35, stand: true };
  },
  helm(mb, S, k) { return M3D.armor(mb, S.info, k, { armor: { slot: 0 } }); },
  bracers(mb, S) {
    const M = commonP(S, p => p.lum > 40) || commonP(S), T = vividP(S);
    for (const s of [-1, 1]) {
      const cx = s * 0.22;
      for (let k = 0; k < 4; k++) { const y0 = -0.36 + k * 0.17; sring(mb, cx, 0, y0, y0 + 0.15, 0.15 - k * 0.012, shadeOf(M, 0.95 + k * 0.03)); }
      cbox(mb, cx - 0.06, -0.1, 0.13, cx + 0.06, 0.06, 0.17, shadeOf(T, 1.1));
    }
    return { depth: 0.17, stand: true };
  },
  bag(mb, S) {
    const C = commonP(S, p => p.lum > 30) || commonP(S), str = shadeOf(darkestP(S) || C, 0.9);
    for (const [y0, y1, r] of [[-0.46, -0.38, 0.24], [-0.38, -0.08, 0.34], [-0.08, 0.06, 0.28], [0.06, 0.12, 0.16]]) sring(mb, 0, 0, y0, y1, r, shadeOf(C, 0.95 + y1 * 0.2));
    sring(mb, 0, 0, 0.12, 0.17, 0.12, str);
    sring(mb, 0, 0, 0.17, 0.3, 0.17, shadeOf(C, 1.05));
    partSegSpot(mb, [0.1, 0.15, 0.1], [0.3, -0.02, 0.18], 0.025, 0.025, str);
    return { depth: 0.34, stand: true };
  },
  horn(mb, S) {
    const B = commonP(S, p => p.lum > 80) || commonP(S), M = commonP(S, metalOk) || brightP(S);
    let prev = [0.36, 0.3, 0];
    for (let k = 1; k <= 8; k++) { const t = k / 8, a = Math.PI * (0.25 + t * 0.9), p = [Math.cos(a) * 0.36 * (1 - t * 0.2), 0.3 - t * 0.55 + Math.sin(a) * 0.08, 0]; const w = 0.2 - t * 0.15; partSegSpot(mb, prev, p, w, w, shadeOf(B, 0.9 + t * 0.15)); prev = p; }
    for (const P of [[0.36, 0.3, 0]]) cbox(mb, P[0] - 0.12, P[1] - 0.12, -0.12, P[0] + 0.02, P[1] + 0.12, 0.12, shadeOf(M, 0.95));
    return { depth: 0.12 };
  },
  cube(mb, S) {
    const C = vividP(S), M = commonP(S, p => p.lum < 140) || commonP(S);
    cbox(mb, -0.24, -0.4, -0.24, 0.24, 0.08, 0.24, shadeOf(C, 1));
    for (const [a, b] of [[-0.25, -0.41], [0.21, -0.41]]) { cbox(mb, a, b, -0.25, a + 0.04, b + 0.5, -0.21, M); cbox(mb, a, b, 0.21, a + 0.04, b + 0.5, 0.25, M); }
    cbox(mb, -0.25, 0.05, -0.25, 0.25, 0.09, 0.25, shadeOf(M, 1.05)); cbox(mb, -0.25, -0.41, -0.25, 0.25, -0.37, 0.25, shadeOf(M, 0.85));
    return { depth: 0.25, stand: true, glow: true };
  },
  stone(mb, S) {
    const C = vividP(S);
    // an ioun stone: an elongated cut stone, floating
    for (const [y0, y1, r] of [[-0.28, -0.18, 0.08], [-0.18, -0.04, 0.16], [-0.04, 0.1, 0.18], [0.1, 0.22, 0.12], [0.22, 0.3, 0.05]]) sring(mb, 0, 0, y0, y1, r, shadeOf(C, 0.85 + y1 * 0.6));
    return { depth: 0.18, glow: true };
  },
  eye(mb, S) {
    const W = brightP(S), C = vividP(S), M = commonP(S, metalOk) || shadeOf(W, 0.6);
    sball(mb, S, 0, 0, 0, 0.26, p => p.lum > 140, 6);
    sdisc(mb, 0, 0, 0.22, 0.27, 0.12, shadeOf(C, 1)); sdisc(mb, 0, 0, 0.27, 0.28, 0.05, tileSpot('coal_block'));
    sloop(mb, M, [0, 0, 0.05], 0.3, [1, 0, 0], [0, 1, 0], 12, 0.05, 0.08);
    return { depth: 0.3, glow: true };
  },
  feather(mb, S) {
    const F = commonP(S, p => p.lum > 70) || commonP(S), Q = shadeOf(brightP(S), 1);
    partSegSpot(mb, diag(-0.02), diag(1.12), 0.025, 0.025, Q);
    for (let k = 0; k < 9; k++) { const u = 0.2 + k * 0.1, w = 0.24 * Math.sin((k + 1) / 10 * Math.PI); partSegSpot(mb, diag(u, -w / 2), diag(u + 0.12, w / 2), 0.1, 0.012, shadeOf(F, 0.9 + (k % 2) * 0.1)); }
    return { depth: 0.02 };
  },
  figurine(mb, S) {
    const C = commonP(S, p => p.lum > 40) || commonP(S), D = shadeOf(darkestP(S) || C, 1);
    // a little carved beast on a plinth
    cbox(mb, -0.28, -0.5, -0.2, 0.28, -0.4, 0.2, D);
    cbox(mb, -0.2, -0.18, -0.1, 0.16, 0.02, 0.1, C);                                      // body
    cbox(mb, 0.12, -0.02, -0.08, 0.3, 0.16, 0.08, shadeOf(C, 1.05));                       // head
    cbox(mb, 0.26, 0.04, -0.04, 0.36, 0.1, 0.04, shadeOf(C, 0.95));                        // snout
    for (const x of [-0.17, 0.1]) for (const z of [-0.08, 0.05]) cbox(mb, x, -0.4, z, x + 0.05, -0.18, z + 0.04, shadeOf(C, 0.9));
    cbox(mb, -0.26, -0.06, -0.02, -0.2, 0.08, 0.02, shadeOf(C, 0.9));                      // tail
    return { depth: 0.2, stand: true };
  },
  carpet(mb, S) {
    const C = vividP(S), D = commonP(S, p => p.lum < 140) || shadeOf(C, 0.6), F = brightP(S);
    sseg(mb, S, diag(0.12), diag(1.0), 0.24, 0.24, 0.24, 0.24, null, 1, 0.08);           // rolled up
    for (const u of [0.35, 0.75]) partSegSpot(mb, diag(u), diag(u + 0.04), 0.25, 0.25, D);
    for (const u of [0.06, 1.0]) for (let i = -2; i <= 2; i++) partSegSpot(mb, diag(u, i * 0.045), diag(u + 0.07, i * 0.05), 0.02, 0.02, F);   // fringe
    return { depth: 0.12 };
  },
  lantern(mb, S) {
    const M = commonP(S, p => p.lum < 140) || commonP(S), L = tileSpot('glowstone');
    sring(mb, 0, 0, -0.5, -0.42, 0.24, M); sring(mb, 0, 0, 0.0, 0.08, 0.24, M);
    cbox(mb, -0.18, -0.42, -0.18, 0.18, 0.0, 0.18, L);
    for (const [x, z] of [[-0.22, -0.22], [0.18, -0.22], [-0.22, 0.18], [0.18, 0.18]]) cbox(mb, x, -0.42, z, x + 0.04, 0.0, z + 0.04, M);
    sring(mb, 0, 0, 0.08, 0.16, 0.14, shadeOf(M, 1.05));
    sloop(mb, M, [0, 0.26, 0], 0.08, [1, 0, 0], [0, 1, 0], 8, 0.03, 0.03);
    return { depth: 0.24, stand: true, glow: true };
  },
  key(mb, S) {
    const M = commonP(S, p => p.lum > 60) || commonP(S);
    sloop(mb, M, diag(0.12), 0.14, VD, UD, 10, 0.05, 0.05);
    partSegSpot(mb, diag(0.26), diag(1.0), 0.05, 0.05, M);
    for (const [u, l] of [[0.9, 0.16], [0.78, 0.12]]) partSegSpot(mb, diag(u, 0), diag(u, l), 0.06, 0.045, shadeOf(M, 1.05));
    return { depth: 0.05 };
  },
  crystal_d(mb, S, k, d) { return T3D.crystal(mb, S, k, d); },
  gem_d(mb, S, k, d) { return T3D.gem(mb, S, k, d); },
  potion_d(mb, S, k, d) { return M3D.potion(mb, S.info, k, d); },
  book_d(mb, S, k, d) { return M3D.book(mb, S.info, k, d); },
  club_d(mb, S, k, d) { return T3D.club(mb, S, k, d); },
  dagger_d(mb, S, k, d) { return T3D.dagger(mb, S, k, d); },
  axe_d(mb, S, k, d) { return T3D.axe(mb, S, k, d); },
};

// which model: by the weapon or gear key, then by the picture's kind
const DND_MODEL_KEY = {
  club: 'club_d', dagger: 'dagger_d', greatclub: 'greatclub', handaxe: 'handaxe', javelin: 'javelin', light_hammer: 'light_hammer', mace: 'mace',
  quarterstaff: 'quarterstaff', sickle: 'sickle', spear: 'spear', dart: 'dart', light_crossbow: 'crossbow', shortbow: null, sling: 'sling',
  battleaxe: 'axe_d', flail: 'flail', glaive: 'glaive', greataxe: 'greataxe', greatsword: 'greatsword', halberd: 'halberd', lance: 'lance', longsword: 'longsword',
  maul: 'maul', morningstar: 'morningstar', pike: 'pike', rapier: 'rapier', scimitar: 'scimitar', shortsword: 'shortsword', trident: 'trident', war_pick: 'war_pick',
  warhammer: 'warhammer', whip: 'whip', blowgun: 'blowgun', hand_crossbow: 'hand_crossbow', heavy_crossbow: 'heavy_crossbow', pistol: 'pistol', musket: 'musket',
  light_mace: 'mace', heavy_mace: 'mace', falchion: 'falchion',
  shield: 'shield', holy_symbol: 'amulet', arcane_focus: 'orb', druid_staff: 'druid_staff', spellbook: 'spellbook', lute: 'lute', thieves_tools: 'toolroll',
  healers_kit: 'satchel', herbalism_kit: 'satchel', smiths_tools: 'smiths_tools', signet_ring: 'ring', candle_kit: 'candles', rations: 'parcel',
  explorers_pack: null, dungeoneers_pack: null, priests_pack: null, scholars_pack: null, burglars_pack: null, entertainers_pack: null,
  gold_coin: 'coins', silver_coin: 'coins', copper_coin: 'coins', platinum_coin: 'coins',
};
const DND_ART_MODEL = {
  club: 'club_d', mace: 'mace', staff: 'staff_magic', sickle: 'sickle', spear: 'spear', polearm: 'glaive', greataxe: 'greataxe', greatsword: 'greatsword', sword: 'longsword',
  shortsword: 'shortsword', rapier: 'rapier', scimitar: 'scimitar', axe: 'axe_d', hammer: 'warhammer', whip: 'whip', dagger: 'dagger_d', shield: 'shield', amulet: 'amulet',
  orb: 'orb', book: 'book_d', lute: 'lute', tools: 'toolroll', satchel: 'satchel', ring: 'ring', candle: 'candles', pack: 'bundle', ration: 'parcel', potion: 'potion_d',
  gem: 'gem_d', coin: 'coins', wand: 'wand', rod: 'rod', cloak: 'cloak', boots: 'boots', gloves: 'gloves', belt: 'belt', helm: 'helm', bracers: 'bracers', scroll: 'scroll',
  bag: 'bag', horn: 'horn', cube: 'cube', stone: 'stone', eye: 'eye', feather: 'feather', figurine: 'figurine', carpet: 'carpet', lantern: 'lantern', key: 'key', crystal: 'crystal_d',
};
const DND_MODEL_SIZE = { coins: 0.72, ring: 0.5, amulet: 0.62, candles: 0.7, dart: 0.62, sling: 0.8, parcel: 0.7, toolroll: 0.8, satchel: 0.78, bundle: 0.86, light_hammer: 0.82, handaxe: 0.84, dagger_d: 1,
  hand_crossbow: 0.8, scroll: 0.82, wand: 0.85, stone: 0.5, eye: 0.55, cube: 0.6, figurine: 0.62, key: 0.62, horn: 0.75, bag: 0.7, gloves: 0.72, bracers: 0.7, belt: 0.7, cloak: 0.8, boots: 0.8, feather: 0.8, lantern: 0.7, orb: 0.75, pistol: 0.8 };
function dndModelOf(key, def, depth = 0) {
  if (!def || def.block || depth > 3) return null;
  if (DND_MODEL_KEY[key] !== undefined) return DND_MODEL_KEY[key];
  if (def.modelOf && ITEMS[def.modelOf]) return dndModelOf(def.modelOf, ITEMS[def.modelOf], depth + 1) || (def.art ? DND_ART_MODEL[def.art] : null);
  if (def.art && DND_ART_MODEL[def.art]) return DND_ART_MODEL[def.art];
  if (def.dndGear && def.dndGear.art && DND_ART_MODEL[def.dndGear.art]) return DND_ART_MODEL[def.dndGear.art];
  if (/^scroll_/.test(key)) return 'scroll';
  if (/_coin$|^coin_/.test(key)) return 'coins';
  return null;
}
{
  const base = itemMesh;
  itemMesh = function (gl, key) {
    if (ITEM_MESHES[key]) return ITEM_MESHES[key];
    const def = itemDef(key), mk = dndModelOf(key, def);
    if (mk && T3D_DND[mk] && ATLAS.pixels) {
      try {
        const info = spriteInfo(ATLAS.tile[def.icon] ?? 0);
        if (info.px.length) {
          const mb = new MeshBuilder(2048), S = sampler(info);
          MODEL_PROJ = info; MODEL_FILL = modelFill(gl, info);
          let extra; try { extra = T3D_DND[mk](mb, S, key, def) || {}; } finally { MODEL_PROJ = null; MODEL_FILL = null; }
          const sz = DND_MODEL_SIZE[mk] || 1;
          scaleMB(mb, sz, !!extra.stand); if (extra.depth) extra.depth *= sz;
          const r = mb.result();
          return (ITEM_MESHES[key] = Object.assign({ mesh: makeVAO(gl, r.verts, r.idx), kind: 'flat', model3d: mk }, extra));
        }
      } catch (e) { console.warn('dnd item model', key, e); }
    }
    return base(gl, key);
  };
}

// the adventuring packs are real backpacks: worn, held and dropped as the pack model
Object.assign(PACK_LOOK, { explorers_pack: PACK_LOOK.leather_backpack, dungeoneers_pack: PACK_LOOK.reinforced_backpack, burglars_pack: PACK_LOOK.reinforced_backpack, priests_pack: PACK_LOOK.leather_backpack, scholars_pack: PACK_LOOK.leather_backpack, entertainers_pack: PACK_LOOK.leather_backpack });

// the new armour on heroes (render/gear3d.js): ring mail is mail, the rest plate; a pack's chain or iron layer paints them
{
  const baseCls = gearArmorClass;
  gearArmorClass = function (mat) { if (mat === 'ringmail') return 'mail'; if (mat === 'breastplate' || mat === 'halfplate' || mat === 'splint') return 'plate'; return baseCls(mat); };
  Object.assign(GEAR_PACK_ALIAS, { breastplate: ['iron'], halfplate: ['iron'], ringmail: ['chain'], splint: ['iron'] });
  if (typeof PACK_ARMOR_NAMES !== 'undefined') Object.assign(PACK_ARMOR_NAMES, { ringmail: PACK_ARMOR_NAMES.chain || 'chainmail' });
  if (typeof PACK_ITEM_NAMES !== 'undefined') {
    Object.assign(PACK_ITEM_NAMES, { dnd_light_crossbow: 'crossbow_standby', dnd_heavy_crossbow: 'crossbow_standby', dnd_hand_crossbow: 'crossbow_standby', dnd_trident: 'trident', dnd_crossbow_bolt: 'arrow' });
    const SETS = { breastplate: 'iron', halfplate: 'iron', ringmail: 'chainmail', splint: 'iron' };
    for (const [k, v] of Object.entries(SETS)) for (const p of ['helmet', 'chestplate', 'leggings', 'boots']) PACK_ITEM_NAMES[k + '_' + p] = v + '_' + p;
  }
}
// test handles (alpha 3)
try { if (window.__dnd) Object.assign(window.__dnd, { spells: DND_SPELLS, cast: (lp, k, o) => dndCast(lp, k, o), weapons: DND_WEAPONS }); } catch (e) { /* no window */ }
