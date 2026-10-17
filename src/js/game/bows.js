// ---------------------------------------------------------------------------
// game/bows.js — 0.8.4: the bow, drawn and loosed.
//
// The bow bends in three stages as you draw (with the arrow on the string),
// the way Minecraft's does, and a resource pack's bow_pulling_0..2 pictures
// are used if it has them. In first person the bow comes up in front of you,
// nearer and toward the middle as you draw, trembling at full draw; letting
// go snaps the string and kicks the bow. In third person the drawing arm
// pulls back to the cheek. Skeletons draw theirs too. A creak as you draw.
// ---------------------------------------------------------------------------

for (let i = 0; i < 3; i++) defItem('bow_pulling_' + i, { name: 'Bow', maxStack: 1, hidden: true, bow: true, tool: { type: 'bow', tier: 0, speed: 1, damage: 1, durability: 384 } });
const bowStage = (k) => 'bow_pulling_' + (k < 0.45 ? 0 : k < 0.85 ? 1 : 2);

// ---- the pictures: a curved stave, a straight string, and the arrow on it as it's drawn ----
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    const paint = (p, pull) => {
      const S = 16, wood = H('#8a5a2e'), woodL = H('#b07a42'), woodD = H('#5a3a1a'), str = H('#e8e8e0'), shaft = H('#8a6a42'), head = H('#a8a8b0'), fl = H('#e8e8e8');
      // the stave: an arc between its two tips, bending more the further it's drawn
      const t0 = [2 + pull * 1.2, 13 - pull * 1.2], t1 = [13 - pull * 1.2, 2 + pull * 1.2];
      const bend = 3.2 + pull * 1.3;
      const mx = (t0[0] + t1[0]) / 2 - bend * 0.7071, my = (t0[1] + t1[1]) / 2 - bend * 0.7071;
      for (let i = 0; i <= 40; i++) {
        const u = i / 40, x = (1 - u) * (1 - u) * t0[0] + 2 * (1 - u) * u * mx + u * u * t1[0], y = (1 - u) * (1 - u) * t0[1] + 2 * (1 - u) * u * my + u * u * t1[1];
        const grip = Math.abs(u - 0.5) < 0.1;
        p.set(Math.round(x), Math.round(y), grip ? woodD : (i % 7 === 0 ? woodL : wood));
        if (grip || u < 0.08 || u > 0.92) p.set(Math.round(x) + 1, Math.round(y), grip ? woodD : wood);
      }
      // the string, from tip to tip through the nock (pulled back toward the lower right)
      const nx = (t0[0] + t1[0]) / 2 + pull * 3.2, ny = (t0[1] + t1[1]) / 2 + pull * 3.2;
      const line = (a, b, c) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2); for (let i = 0; i <= n; i++) { const u = i / n; const x = Math.round(a[0] + (b[0] - a[0]) * u), y = Math.round(a[1] + (b[1] - a[1]) * u); if (x >= 0 && y >= 0 && x < S && y < S && !p.alpha(x, y)) p.set(x, y, c); } };
      if (pull > 0) { line(t0, [nx, ny], str); line(t1, [nx, ny], str); }
      else line(t0, t1, str);
      // the arrow: from the nock, up and left, past the stave
      if (pull > 0) {
        const len = 9.5 + pull * 0.5, ax = nx - len * 0.7071, ay = ny - len * 0.7071;
        for (let i = 0; i <= len * 2; i++) { const u = i / (len * 2), x = Math.round(nx + (ax - nx) * u), y = Math.round(ny + (ay - ny) * u); if (x >= 0 && y >= 0) p.set(x, y, shaft); }
        p.set(Math.round(ax), Math.round(ay), head); p.set(Math.round(ax) - 1, Math.round(ay), head); p.set(Math.round(ax), Math.round(ay) - 1, head); p.set(Math.round(ax) - 1, Math.round(ay) - 1, H('#d8d8e0'));
        p.set(Math.round(nx) - 1, Math.round(ny), fl); p.set(Math.round(nx), Math.round(ny) - 1, fl);
      }
    };
    addItem('bow', p => paint(p, 0));
    for (let i = 0; i < 3; i++) addItem('bow_pulling_' + i, p => paint(p, [0.35, 0.65, 1][i]));
  };
}
SND_FX.bow_draw = [0.8, 0.45, (b, v, r) => {
  // the stave creaks and the string stretches
  const sr = b.sr, n = Math.floor(0.6 * sr), c = sndBiquad('bp', 700, 4, sr); let ph = 0;
  for (let i = 0; i < n; i++) { const f = 18 + 30 * (i / n) + r() * 6; ph += f / sr; const stick = (ph % 1) < 0.06 ? 1 : 0; b.d[i] += sndRun(c, stick * (0.5 + r() * 0.5)) * 0.7 * Math.min(1, i / (0.05 * sr)); }
  b.noise(0, 0.55, 'bp', 2400, 1.2, 0.12, { att: 0.25 });
}];

// ---- drawing and loosing --------------------------------------------------------------------------
{
  const baseTools = LocalPlayer.prototype.updateHeldTools;
  LocalPlayer.prototype.updateHeldTools = function (dt, inp) {
    const was = this.bowPull || 0;
    baseTools.call(this, dt, inp);
    if (!was && this.bowPull > 0) this.g.sfx.play('bow_draw');
    if (was > 0.12 && !this.bowPull) this.bowKick = 0.28;
    if (this.bowKick > 0) this.bowKick -= dt;
  };
}

// ---- first person: the bow held out in your left hand, the string drawn back with your right ----------------
LocalPlayer.prototype.fpBow = function (draws, arm, gl, bx, by) {
  const g = this.g, k = this.bowPull > 0 ? Math.min(1, this.bowPull) : 0, kick = this.bowKick > 0 ? this.bowKick / 0.28 : 0;
  const ease = k * k * (3 - 2 * k), shake = k >= 0.95 ? Math.sin(g.time * 47) * 0.004 : 0;
  // the bow's own frame: its tips upright (leaning a touch), its belly away from you, the string toward you
  const cant = 0.22, s = 0.85, T = [Math.sin(cant), Math.cos(cant), 0], U = [0, 0, -1], N = [-Math.cos(cant), Math.sin(cant), 0];
  const X = [0.7071 * (T[0] - U[0]), 0.7071 * (T[1] - U[1]), 0.7071 * (T[2] - U[2])], Y = [0.7071 * (T[0] + U[0]), 0.7071 * (T[1] + U[1]), 0.7071 * (T[2] + U[2])];
  const M = Mat4.create();
  M[0] = X[0] * s; M[1] = X[1] * s; M[2] = X[2] * s; M[4] = Y[0] * s; M[5] = Y[1] * s; M[6] = Y[2] * s; M[8] = N[0] * s; M[9] = N[1] * s; M[10] = N[2] * s;
  M[12] = -0.12 + bx * 0.4 - 0.03 * ease; M[13] = -0.16 + by + shake + kick * 0.03; M[14] = -1.0 - kick * 0.05;
  const pt = (x, y) => [M[0] * x + M[4] * y + M[12], M[1] * x + M[5] * y + M[13], M[2] * x + M[6] * y + M[14]];
  // the stave bends as it's drawn
  const q = Math.round(ease * 8) / 8, stave = item3dMesh(gl, 'bowstave_' + q, mb => buildBowStave(mb, q));
  draws.push({ mesh: stave.mesh, m: M, noCull: true });
  // the string, from each tip to the nock (and it hums after the arrow's gone)
  const t0 = bowPoint(0, q), t1 = bowPoint(1, q), hum = kick * Math.sin(g.time * 90) * 0.03;
  const nk = [ease * 0.27 + hum, -ease * 0.27 - hum], line = lineMesh(gl);
  for (const t of [t0, t1]) {
    const m = Mat4.create(); m.set(M); Mat4.translate(m, t[0], t[1], 0); Mat4.rotateZ(m, Math.atan2(nk[1] - t[1], nk[0] - t[0])); Mat4.scale(m, Math.hypot(nk[0] - t[0], nk[1] - t[1]), 1, 1);
    draws.push({ mesh: line, m, noCull: true });
  }
  // the arrow on the string
  if (k > 0) {
    const am = Mat4.create(); am.set(M); Mat4.translate(am, nk[0], nk[1], 0); Mat4.rotateZ(am, Math.PI * 0.75);
    draws.push({ mesh: item3dMesh(gl, '__arrow3d', mb => buildArrow3D(mb)).mesh, m: am, noCull: true });
  }
  // an arm for each, reaching from the shoulder to the hand: the left round the grip, the right at the nock
  const aim = (sh, fist) => {
    let d = [fist[0] - sh[0], fist[1] - sh[1], fist[2] - sh[2]]; const L = Math.hypot(...d) || 1; d = d.map(v => v / L);
    const yv = [-d[0], -d[1], -d[2]];
    let xv = [yv[2], 0, -yv[0]]; const xl = Math.hypot(...xv) || 1; xv = xv.map(v => v / xl);       // up x yv
    const zv = [xv[1] * yv[2] - xv[2] * yv[1], xv[2] * yv[0] - xv[0] * yv[2], xv[0] * yv[1] - xv[1] * yv[0]];
    const m = Mat4.create(), sl = 0.72;   // a slimmer arm, so it doesn't fill the view
    m[0] = xv[0] * sl; m[1] = xv[1] * sl; m[2] = xv[2] * sl; m[4] = yv[0]; m[5] = yv[1]; m[6] = yv[2]; m[8] = zv[0] * sl; m[9] = zv[1] * sl; m[10] = zv[2] * sl;
    m[12] = fist[0] - (yv[0] * -0.3 + zv[0] * -0.02); m[13] = fist[1] - (yv[1] * -0.3 + zv[1] * -0.02); m[14] = fist[2] - (yv[2] * -0.3 + zv[2] * -0.02);
    return m;
  };
  const gp = bowPoint(0.5, q), grip = pt(gp[0] + 0.02, gp[1] - 0.02);
  arm(aim([-0.7, -0.75, 0.0], grip), -1);
  const nock = pt(nk[0], nk[1]);
  arm(aim([0.85, -0.62 + kick * 0.05, 0.15 + kick * 0.1], [nock[0] + 0.04 + kick * 0.08, nock[1] - 0.03, nock[2] + 0.03 + kick * 0.06]), 1);
};
