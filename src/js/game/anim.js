// ---------------------------------------------------------------------------
// game/anim.js — 0.9.0.23: livelier bodies.
//
// Players: the body turns into the way you're going (forward, diagonally,
// sideways, backing off) while the head keeps looking where you aim; hips
// swing round further than the shoulders; arms and torso counter-swing;
// you lean into a sprint, into turns and when you speed up or pull up;
// knees and elbows bend more; the head nods with each step. Standing, the
// body lags a little behind the head and settles in line after a moment.
// Flying in creative: you lean forward into the flight, legs together and
// trailing, arms swept back; hovering, your legs dangle and drift; going up,
// knees tuck; going down, arms rise.
// Creatures get the same: a hip swing and shoulder twist on two legs, a
// rocking walk and nodding head on four.
// ---------------------------------------------------------------------------
const wrapA = (a) => ((a + Math.PI * 3) % TAU + TAU) % TAU - Math.PI;
{
  const basePose = LocalPlayer.prototype.pose;
  LocalPlayer.prototype.pose = function () {
    const ps = basePose.call(this), p = this.player, g = this.g;
    const now = g.time, dt = clamp(now - (this._animT ?? now), 0, 0.1); this._animT = now;
    const aim = p.yaw, hs = Math.hypot(p.vx, p.vz);
    let body = this._bodyYaw ?? aim;
    // ---- which way the body faces ----
    const busy = p.swimming || p.crawling || this.riding || p.hang || p.climb || this.sleeping || p.gliding || ps.sit;
    let legTurn = 0;
    if (busy) body = aim;
    else if (hs > 0.7) {
      const mv = Math.atan2(-p.vx, -p.vz);
      let rel = wrapA(mv - aim);
      // backing off: face away from the way you're going (you walk backwards, turned a little)
      if (Math.abs(rel) > Math.PI / 2 + 0.05) rel = wrapA(rel - Math.PI * Math.sign(rel));
      const want = aim + clamp(rel, -1.2, 1.2) * 0.62;
      body = aim + wrapA(turnToA(body, want, dt * 10) - aim);
      legTurn = clamp(wrapA(aim + rel - body), -0.7, 0.7);      // the hips go round further than the shoulders
      this._stillT = 0;
    } else {
      this._stillT = (this._stillT || 0) + dt;
      const off = wrapA(aim - body);
      if (Math.abs(off) > 0.9) body = aim - Math.sign(off) * 0.9;
      if (this._stillT > 0.5 || p.flying) body = turnToA(body, aim, dt * 3);
    }
    this._bodyYaw = body;
    this._legTurn = (this._legTurn || 0) + (legTurn - (this._legTurn || 0)) * Math.min(1, dt * 10);
    ps.bodyYaw = body; ps.headTurn = wrapA(aim - body); ps.legTurn = this._legTurn;
    // ---- leaning: into a sprint, into turns, when speeding up or pulling up ----
    const fwd = -(p.vx * Math.sin(body) + p.vz * Math.cos(body));
    const acc = (fwd - (this._lastFwd ?? fwd)) / Math.max(dt, 1e-3); this._lastFwd = fwd;
    this._accLean = (this._accLean || 0) + (clamp(acc * 0.012, -0.18, 0.18) - (this._accLean || 0)) * Math.min(1, dt * 6);
    const yawRate = dt > 0 ? wrapA(body - (this._lastBody ?? body)) / dt : 0; this._lastBody = body;
    this._turnLean = (this._turnLean || 0) + (clamp(yawRate * 0.06 * Math.min(1, hs / 5), -0.2, 0.2) - (this._turnLean || 0)) * Math.min(1, dt * 5);
    ps.accLean = p.onGround ? this._accLean : 0; ps.turnLean = this._turnLean;
    // ---- flying (creative) ----
    if (p.flying && !this.riding) {
      ps.fly = 1; ps.flySpeed = Math.min(1, hs / 14); ps.flyVy = p.vy || 0; ps.air = false;
      ps.lean = 0.85 * ps.flySpeed;     // the whole body tips into the flight
    }
    return ps;
  };
}
function turnToA(a, b, k) { return a + wrapA(b - a) * Math.min(1, k); }
{
  // the body turned its own way; the head (and what you aim) where you look
  const baseDraws = avatarDraws;
  avatarDraws = function (out, gl, skin, pose) {
    if (!pose.fp && pose.bodyYaw !== undefined && !pose.swim && !pose.sleep) pose = Object.assign({}, pose, { yaw: pose.bodyYaw, _turned: true });
    return baseDraws(out, gl, skin, pose);
  };
  const baseAnim = avatarAnim;
  avatarAnim = function (pose) {
    const A = baseAnim(pose);
    const a = pose.walkAmt || 0, ph = pose.walk || 0, t = pose.time || 0, run = pose.sprint ? 1 : 0, idle = 1 - a;
    const b0 = A.body[0], b1 = A.body[1];
    const special = pose.swim || pose.sleep || pose.hang || pose.climb || pose.sit || pose.glide || pose.deathT || pose.carry || pose.bow > 0 || pose.paddle || pose.fly;
    if (!special) {
      const sL = Math.sin(ph), cL = Math.cos(ph), busyR = pose.held || pose.swing > 0 || pose.eat > 0 || pose.castWind > 0;
      if (!pose.air) {
        // a looser walk: hips swing, shoulders counter-twist, arms swing wider and elbows bend, the head nods
        A.body[1] += sL * 0.07 * a;
        A.body[2] += sL * 0.035 * a;                                 // a roll from foot to foot
        if (!busyR) A.armR[0] *= 1.25; if (!pose.off) A.armL[0] *= 1.25;
        if (!busyR) A.armR[2] = (A.armR[2] || 0) + 0.06 * a; A.armL[2] = (A.armL[2] || 0) - 0.06 * a;
        if (!busyR) A.foreR[0] += (0.18 + 0.3 * run) * a * (0.6 + 0.4 * Math.max(0, -sL)); A.foreL[0] += (0.18 + 0.3 * run) * a * (0.6 + 0.4 * Math.max(0, sL));
        A.body[0] -= 0.1 * run * a;                                   // further into a sprint
        if (pose.accLean) A.body[0] -= pose.accLean;                  // tipping forward as you set off, back as you pull up
        // standing: the arms easy at your sides
        if (!busyR) A.foreR[0] += 0.08 * idle; A.foreL[0] += 0.08 * idle;
      }
      if (pose.turnLean) A.body[2] += pose.turnLean;                  // into the turn
      // the hips toward the way you're going (in first person, from where you look)
      const lt = pose.fp ? clamp((pose.legTurn || 0) - (pose.headTurn || 0), -0.8, 0.8) : (pose.legTurn || 0);
      if (lt) { A.legR[1] = (A.legR[1] || 0) + lt; A.legL[1] = (A.legL[1] || 0) + lt; }
    }
    // the head stays where you look, whatever the body did just now; then nods with the step, and glances about when still
    A.head[0] -= A.body[0] - b0; A.head[1] -= A.body[1] - b1;
    if (!special && !pose.air) { A.head[0] += Math.abs(Math.cos(ph)) * 0.04 * a + Math.sin(t * 0.53) * 0.02 * idle; A.head[1] += Math.sin(t * 0.37) * 0.04 * idle; }
    // the head looks where you aim, whichever way the body faces
    if (pose._turned && pose.headTurn) A.head[1] += clamp(pose.headTurn, -1.25, 1.25);
    if (pose.fly) {
      const s = pose.flySpeed || 0, vy = pose.flyVy || 0, hover = 1 - s, k = t * 1.6;
      // legs together, trailing as you speed up; dangling and drifting when you hover; tucked going up
      const up = clamp((vy - 1) / 4, 0, 1), down = clamp((-vy - 1) / 4, 0, 1);
      A.legR = [0.08 + Math.sin(k) * 0.12 * hover + 0.6 * up, 0, 0.03]; A.legL = [-0.04 - Math.sin(k + 1.3) * 0.12 * hover + 0.5 * up, 0, -0.03];
      A.shinR = [-0.25 * hover - 0.1 - 0.7 * up, 0, 0]; A.shinL = [-0.15 * hover - 0.05 - 0.7 * up, 0, 0];
      // arms swept back in flight, out a little to balance when still; up as you drop
      const ax = -0.25 * s + 0.15 * hover + 0.7 * down, az = 0.12 + 0.18 * hover + 0.25 * down;
      if (!pose.held && !(pose.swing > 0)) { A.armR = [ax, 0, az + Math.sin(k) * 0.05]; A.foreR = [0.15, 0, 0]; }
      if (!pose.off) { A.armL = [ax, 0, -az - Math.sin(k) * 0.05]; A.foreL = [0.15, 0, 0]; }
      A.body = [0, 0, Math.sin(k * 0.7) * 0.03 * hover + (pose.turnLean || 0) * 1.5];
      A.head = [(pose.headPitch || 0) + (pose.lean || 0) * 0.9, (pose._turned ? clamp(pose.headTurn || 0, -1.25, 1.25) : 0), 0];
      A.lift = Math.sin(k) * 0.04 * hover;
    }
    return A;
  };
}
// ---- creatures --------------------------------------------------------------------------------------------------------------
// a lean into the turn, from how fast the creature is turning while it moves
function rigTurnLean(m, k) {
  const t = m.age || 0, dt = clamp(t - (m._anT ?? t), 0, 0.1); m._anT = t;
  const yaw = m.yaw || 0, rate = dt > 0 ? wrapA(yaw - (m._anYaw ?? yaw)) / dt : 0; m._anYaw = yaw;
  const want = clamp(rate * k * Math.min(1, (m.walkAmt || 0) * 1.5), -0.16, 0.16);
  m._anLean = (m._anLean || 0) + (want - (m._anLean || 0)) * Math.min(1, dt * 6);
  return m._anLean;
}
{
  const baseBiped = RIG_ANIM.biped;
  RIG_ANIM.biped = function (m, d, P, R) {
    baseBiped(m, d, P, R);
    const a = m.walkAmt || 0, ph = m.walk || 0, t = m.age || 0;
    const lean = rigTurnLean(m, 0.05);
    if (m.sleeping || (m.lost && m.lost.size)) return;
    if (!a) { if (P.head) { P.head[1] += Math.sin(t * 0.41 + (m.id || 0)) * 0.06; P.head[0] += Math.sin(t * 0.29 + (m.id || 0) * 2) * 0.03; } return; }
    const sL = Math.sin(ph), cL = Math.cos(ph);
    // hips swing round against the shoulders, a roll from foot to foot, the head nods with each step
    if (P.body) { P.body[1] += sL * 0.06 * a; P.body[2] = (P.body[2] || 0) + sL * 0.03 * a + lean; }
    if (P.legL) { P.legL[1] = (P.legL[1] || 0) - sL * 0.08 * a; P.legR[1] = (P.legR[1] || 0) - sL * 0.08 * a; }
    if (P.armR && !m.aiming && !(m.swingT > 0) && !(d.armsReach && m.T && m.T.hostile && !m.calm)) { P.armR[0] *= 1.2; P.armL[0] *= 1.2; P.armR[2] = (P.armR[2] || 0) + 0.05 * a; P.armL[2] = (P.armL[2] || 0) - 0.05 * a; }
    if (P.head) P.head[0] += Math.abs(cL) * 0.05 * a;
  };
  const baseQuad = RIG_ANIM.quad;
  RIG_ANIM.quad = function (m, d, P, R) {
    baseQuad(m, d, P, R);
    const a = m.walkAmt || 0, ph = m.walk || 0, t = m.age || 0;
    // a rocking walk and a lean into turns; standing, a slow look round now and then
    R.roll = (R.roll || 0) + Math.sin(ph) * 0.035 * a + rigTurnLean(m, 0.06);
    R.lift = (R.lift || 0) + Math.abs(Math.cos(ph)) * 0.015 * a;
    if (P.head && !(m.grazeT > 0)) P.head[1] += Math.sin(t * 0.33 + (m.id || 0)) * 0.12 * (1 - a);
    if (P.body) P.body[2] = (P.body[2] || 0) + Math.sin(t * 1.1 + (m.id || 0)) * 0.012 * (1 - a);   // breathing
  };
  const baseBird = RIG_ANIM.bird;
  RIG_ANIM.bird = function (m, d, P, R) {
    baseBird(m, d, P, R);
    const a = m.walkAmt || 0, ph = (m.walk || 0) * 1.4, t = m.age || 0;
    // a waddle, and the wings shuffled now and then when standing
    R.roll = (R.roll || 0) + Math.sin(ph) * 0.09 * a;
    if (m.onGround && P.wingR) { const sh = Math.max(0, Math.sin(t * 0.9 + (m.id || 0)) - 0.96) * 8; P.wingR[2] -= sh * 0.3; P.wingL[2] += sh * 0.3; }
  };
}
// the character sheet's doll stands square on (it turns by the drag, not by how you've been moving)
{
  const baseDoll = dollPose;
  dollPose = function (lp) {
    const ps = baseDoll(lp);
    delete ps.bodyYaw; ps.headTurn = 0; ps.legTurn = 0; ps.lean = 0; ps.fly = 0; ps.accLean = 0; ps.turnLean = 0;
    return ps;
  };
}
