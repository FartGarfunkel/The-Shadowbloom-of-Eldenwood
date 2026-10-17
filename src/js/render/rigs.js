// ---------------------------------------------------------------------------
// render/rigs.js — creature rigs and Mo' Bends-style animation.
//
// A rig is a tree of boxes measured in skin pixels (1 px = 1/16 block, front
// faces -z, like the classic models). Arms and legs come in two pieces so
// knees and elbows bend; the body bobs and twists with each step, heads turn
// to look before the body follows, things tuck their legs when they jump,
// flail when they fall, squash when they land, and breathe when they stand.
//
// Rigs register into MODEL_DEFS (so buildModels makes their meshes as usual)
// with `rig` set to an animation kind: biped, quad, spider, bird, slime, pod.
// Parts can be lost (see game/dismember.js): a lost part and everything
// hanging from it is not drawn.
// ---------------------------------------------------------------------------

const RPX = 1 / 16;

// A part: name, parent (or null), pivot in px relative to the parent's pivot (or the model's feet),
// box in px relative to its own pivot, texture, and extras (role, rest pose, limb group, flags).
function rpart(name, parent, at, box, tex, extra) {
  const p = Object.assign({ name, parent, at, box, tex }, extra || {});
  p.pivot = at.map(v => v * RPX);
  p.min = box.slice(0, 3).map(v => v * RPX);
  p.max = box.slice(3).map(v => v * RPX);
  return p;
}
// Parents before children, and a quick name index.
function finishRig(kind, parts, extra) {
  const byName = {}, out = [], seen = new Set();
  for (const p of parts) byName[p.name] = p;
  const add = (p) => { if (seen.has(p.name)) return; if (p.parent && byName[p.parent]) add(byName[p.parent]); seen.add(p.name); out.push(p); };
  for (const p of parts) add(p);
  return Object.assign({ rig: kind, scale: 1, parts: out }, extra || {});
}

// ---- builders ------------------------------------------------------------------------------
// Two-legged: zombies, skeletons, golems, illagers, villagers...
function bipedRig(o) {
  const H = o.head || [8, 8, 8], Bd = o.body || [8, 12, 4], A = o.arm || [4, 12, 4], L = o.leg || [4, 12, 4], T = o.tex;
  const hipY = L[1], legX = o.legX ?? L[0] / 2, armX = o.armX ?? (Bd[0] / 2 + A[0] / 2), shoulder = o.shoulder ?? 2;
  const upA = Math.ceil(A[1] / 2), loA = A[1] - upA, upL = Math.ceil(L[1] / 2), loL = L[1] - upL;
  const parts = [
    rpart('body', null, [0, hipY, 0], [-Bd[0] / 2, 0, -Bd[2] / 2, Bd[0] / 2, Bd[1], Bd[2] / 2], T.body, { role: 'body', noCull: o.bodyNoCull }),
    rpart('head', 'body', [0, Bd[1], 0], [-H[0] / 2, 0, -H[2] / 2, H[0] / 2, H[1], H[2] / 2], T.head, { role: 'head', limb: 'head' }),
  ];
  for (const s of [1, -1]) {
    const S = s > 0 ? 'R' : 'L';
    parts.push(rpart('arm' + S, 'body', [s * armX, Bd[1] - shoulder, 0], [-A[0] / 2, -(upA - shoulder), -A[2] / 2, A[0] / 2, shoulder, A[2] / 2], T.arm, { role: 'arm' + S, limb: 'arm' + S }));
    parts.push(rpart('fore' + S, 'arm' + S, [0, -(upA - shoulder), 0], [-A[0] / 2, -loA, -A[2] / 2, A[0] / 2, 0, A[2] / 2], T.fore || T.arm, { role: 'fore' + S, limb: 'arm' + S, hand: [0, -loA + 1, 0] }));
    parts.push(rpart('leg' + S, null, [s * legX, hipY, 0], [-L[0] / 2, -upL, -L[2] / 2, L[0] / 2, 0, L[2] / 2], T.leg, { role: 'leg' + S, limb: 'leg' + S }));
    parts.push(rpart('shin' + S, 'leg' + S, [0, -upL, 0], [-L[0] / 2, -loL, -L[2] / 2, L[0] / 2, 0, L[2] / 2], T.shin || T.leg, { role: 'shin' + S, limb: 'leg' + S }));
  }
  for (const x of o.extras || []) parts.push(rpart(x[0], x[1], x[2], x[3], x[4], x[5]));
  return finishRig('biped', parts, { hipY, bodyDepth: Bd[2], height: hipY + Bd[1] + H[1], armsReach: !!o.armsReach, heavy: !!o.heavy });
}

// Four-legged: cows, pigs, sheep, deer, boars, wolves, horses...
// body [w, h, l]; leg [w, h]; head [w, h, d]; headAt [y above body centre, z from front]; tail [w, h, l]
function quadRig(o) {
  const Bd = o.body, L = o.leg, H = o.head, T = o.tex;
  const legH = L[1], bodyY = legH + Bd[1] / 2 + (o.bodyLift || 0);
  const lx = Bd[0] / 2 - L[0] / 2 - (o.legInset ?? 0), lzF = -(Bd[2] / 2 - L[0] / 2 - (o.legInsetZ ?? 1)), lzB = -lzF;
  const split = legH >= 8;
  const up = split ? Math.ceil(legH / 2) : legH, lo = legH - up;
  const parts = [rpart('body', null, [0, bodyY, 0], [-Bd[0] / 2, -Bd[1] / 2, -Bd[2] / 2, Bd[0] / 2, Bd[1] / 2, Bd[2] / 2], T.body, { role: 'qbody' })];
  const ha = o.headAt || [Bd[1] / 2, 0];
  let headParent = 'body', headPivot = [0, ha[0], -Bd[2] / 2 + ha[1]];
  if (o.neck) {
    const N = o.neck;   // [w, h, d, tilt]
    // the neck leans forward (a negative turn about x tips an upright part toward the front)
    parts.push(rpart('neck', 'body', [0, ha[0] - N[2] / 2, -Bd[2] / 2 + N[2] / 2], [-N[0] / 2, 0, -N[2] / 2, N[0] / 2, N[1], N[2] / 2], T.neck || T.body, { role: 'neck', rest: [-(N[3] ?? 0.5), 0, 0], limb: 'head' }));
    headParent = 'neck'; headPivot = [0, N[1], 0];
  }
  // headTilt turns the nose down (a horse, a goat grazing-ready), whatever the neck does
  parts.push(rpart('head', headParent, headPivot, [-H[0] / 2, -H[1] / 2, -H[2], H[0] / 2, H[1] / 2, 0], T.head, { role: 'qhead', limb: 'head', rest: [(o.neck ? o.neck[3] ?? 0.5 : 0) - (o.headTilt || 0), 0, 0] }));
  for (const [nm, zz, front] of [['F', lzF, true], ['B', lzB, false]]) for (const s of [1, -1]) {
    const S = nm + (s > 0 ? 'R' : 'L');
    parts.push(rpart('leg' + S, null, [s * lx, legH, zz], [-L[0] / 2, -up, -L[0] / 2, L[0] / 2, 0, L[0] / 2], T.leg || T.body, { role: 'qleg', front, side: s, limb: 'leg' + S }));
    if (split) parts.push(rpart('shin' + S, 'leg' + S, [0, -up, 0], [-L[0] / 2, -lo, -L[0] / 2, L[0] / 2, 0, L[0] / 2], T.shin || T.leg || T.body, { role: 'qshin', front, side: s, limb: 'leg' + S }));
  }
  if (o.tail) { const Tl = o.tail; parts.push(rpart('tail', 'body', [0, Bd[1] / 2 - 1 + (Tl[3] || 0), Bd[2] / 2], [-Tl[0] / 2, -Tl[1], 0, Tl[0] / 2, 0, Tl[2]], T.tail || T.body, { role: 'tail', rest: [o.tailRest ?? 0.35, 0, 0], limb: 'tail' })); }
  for (const x of o.extras || []) parts.push(rpart(x[0], x[1], x[2], x[3], x[4], x[5]));
  return finishRig('quad', parts, { gallop: !!o.gallop, bodyY, bodyLen: Bd[2], legH, height: bodyY + Bd[1] / 2 + H[1], scale: o.scale || 1, post: o.post });
}

// Eight legs, each a thigh reaching out and up and a shin reaching down to the ground.
function spiderRig(o) {
  const T = o.tex, s = o.size || 1;
  const P = (v) => v * s;
  const parts = [
    rpart('thorax', null, [0, P(8), 0], [P(-3), P(-3), P(-3), P(3), P(3), P(3)], T.body, { role: 'sbody' }),
    rpart('abdomen', 'thorax', [0, P(1), P(3)], [P(-5), P(-4), 0, P(5), P(4), P(12)], T.back || T.body, { role: 'abdomen' }),
    rpart('head', 'thorax', [0, 0, P(-3)], [P(-4), P(-4), P(-8), P(4), P(4), 0], T.head, { role: 'shead', limb: 'head' }),
  ];
  const zs = [-2, -0.7, 0.7, 2], fan = [0.7, 0.25, -0.25, -0.7];
  for (let i = 0; i < 4; i++) for (const side of [1, -1]) {
    const S = (side > 0 ? 'R' : 'L') + i;
    parts.push(rpart('sleg' + S, 'thorax', [side * P(3), 0, P(zs[i])], side > 0 ? [0, P(-1), P(-1), P(9), P(1), P(1)] : [P(-9), P(-1), P(-1), 0, P(1), P(1)], T.leg || T.body,
      { role: 'sleg', idx: i, side, rest: [0, side * fan[i], side * 0.55], limb: 'sleg' + S }));
    parts.push(rpart('sshin' + S, 'sleg' + S, [side * P(9), 0, 0], side > 0 ? [P(-1), P(-11), P(-1), P(1), 0, P(1)] : [P(-1), P(-11), P(-1), P(1), 0, P(1)], T.leg || T.body,
      { role: 'sshin', idx: i, side, rest: [0, 0, side * 0.35], limb: 'sleg' + S }));
  }
  return finishRig('spider', parts, { height: P(12) });
}

// Two legs and wings: chickens, parrots, birds.
function birdRig(o) {
  const Bd = o.body, H = o.head, L = o.leg || [1, 5], W = o.wing || [1, 4, 6], T = o.tex;
  const legH = L[1], bodyY = legH + Bd[1] / 2;
  const parts = [rpart('body', null, [0, bodyY, 0], [-Bd[0] / 2, -Bd[1] / 2, -Bd[2] / 2, Bd[0] / 2, Bd[1] / 2, Bd[2] / 2], T.body, { role: 'bbody' })];
  if (o.neck) {   // long-necked birds (moas): [w, h, lean]
    const N = o.neck;
    parts.push(rpart('neck', 'body', [0, Bd[1] / 2 - 2, -Bd[2] / 2 + N[0] / 2], [-N[0] / 2, 0, -N[0] / 2, N[0] / 2, N[1], N[0] / 2], T.neck || T.body, { role: 'neck', rest: [-(N[2] ?? 0.3), 0, 0], limb: 'head' }));
    parts.push(rpart('head', 'neck', [0, N[1], N[0] / 2], [-H[0] / 2, 0, -H[2], H[0] / 2, H[1], 0], T.head, { role: 'bhead', limb: 'head', rest: [N[2] ?? 0.3, 0, 0] }));
  } else parts.push(rpart('head', 'body', [0, Bd[1] / 2 - 2, -Bd[2] / 2 + 1], [-H[0] / 2, 0, -H[2], H[0] / 2, H[1], 0], T.head, { role: 'bhead', limb: 'head' }));
  for (const s of [1, -1]) {
    const S = s > 0 ? 'R' : 'L';
    parts.push(rpart('wing' + S, 'body', [s * Bd[0] / 2, Bd[1] / 2 - 1, 0], s > 0 ? [0, -W[1], -W[2] / 2, W[0], 0, W[2] / 2] : [-W[0], -W[1], -W[2] / 2, 0, 0, W[2] / 2], T.wing || T.body, { role: 'wing', side: s, limb: 'wing' + S }));
    parts.push(rpart('leg' + S, null, [s * (o.legX ?? 1.5), legH, 0.5], [-L[0] / 2, -legH, -L[0] / 2, L[0] / 2, 0, L[0] / 2], T.leg, { role: 'bleg', side: s, limb: 'leg' + S }));
  }
  for (const x of o.extras || []) parts.push(rpart(x[0], x[1], x[2], x[3], x[4], x[5]));
  return finishRig('bird', parts, { height: bodyY + Bd[1] / 2 + H[1], scale: o.scale || 1, pitch0: o.pitch0 || 0, post: o.post, hipY: bodyY });
}

// ---- animation -------------------------------------------------------------------------------
// Each kind fills P[name] = [rx, ry, rz] (added to the part's rest pose) and R (root: lift, pitch, roll).
const RIG_ANIM = {
  biped(m, d, P, R) {
    const a = m.walkAmt || 0, ph = m.walk || 0, t = m.age || 0;
    const run = clamp((m.speedNow || 0) / 4.6, 0, 1), air = !m.onGround && !m.inWater && !m.ghost;
    const sL = Math.sin(ph), cL = Math.cos(ph), amp = (0.7 + 0.3 * run) * a;
    const lost = m.lost;
    const crawl = lost && (lost.has('legL') || lost.has('legR') || lost.has('shinL') || lost.has('shinR'));
    // legs: the thigh swings, the knee folds while the foot comes forward
    P.legL = [sL * amp, 0, 0]; P.legR = [-sL * amp, 0, 0];
    P.shinL = [-a * (0.08 + (0.75 + 0.4 * run) * Math.max(0, cL)), 0, 0];
    P.shinR = [-a * (0.08 + (0.75 + 0.4 * run) * Math.max(0, -cL)), 0, 0];
    // arms swing against the legs, elbows soft, a little sway when standing
    const idle = 1 - a, breathe = Math.sin(t * 1.9);
    P.armR = [sL * amp * 0.85, 0, 0.06 * idle + 0.03 * breathe * idle]; P.armL = [-sL * amp * 0.85, 0, -0.06 * idle - 0.03 * breathe * idle];
    P.foreR = [0.12 + 0.35 * run * a + 0.05 * idle, 0, 0]; P.foreL = [0.12 + 0.35 * run * a + 0.05 * idle, 0, 0];
    // the body twists with each step, leans into a run, bobs and breathes
    P.body = [-0.14 * run * a, sL * 0.11 * a, 0];
    R.lift = (1 - Math.abs(sL)) * 0.045 * a + breathe * 0.004 * idle;
    // in the air: knees up; falling hard: arms thrown up
    if (air) {
      const fall = clamp(-(m.vy || 0) / 10, 0, 1);
      P.legL = [0.55, 0, 0.05]; P.shinL = [-1.0, 0, 0]; P.legR = [-0.15, 0, -0.05]; P.shinR = [-0.45, 0, 0];
      P.armR = [0.3 + fall * 2.2, 0, 0.35 + fall * 0.5]; P.armL = [0.3 + fall * 2.2, 0, -0.35 - fall * 0.5];
    }
    // landing: a quick crouch
    if (m.landT > 0) { const k = m.landT / 0.18; R.lift -= 0.09 * k; P.legL[0] += 0.5 * k; P.legR[0] += 0.5 * k; P.shinL[0] -= 1.0 * k; P.shinR[0] -= 1.0 * k; P.body[0] -= 0.25 * k; }
    // arms out in front (ghouls), or a bow drawn (skeletons)
    const sw = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0;
    if (d.armsReach && m.T && m.T.hostile && !m.calm) {
      const sway = Math.sin(t * 2.3) * 0.06;
      P.armR = [1.45 + sway - sw * 0.6, 0.05, 0.02]; P.armL = [1.45 - sway - sw * 0.6, -0.05, -0.02];
      P.foreR = [0.05 + sw * 0.5, 0, 0]; P.foreL = [0.05 + sw * 0.5, 0, 0];
    } else if (m.aiming) {
      // the bow held out in the left hand; the right draws the string back to the cheek
      const dk = clamp(1 - (m.shootT || 0) / 1.6, 0, 1);
      P.armL = [1.52, 0.1, 0]; P.foreL = [0.04, 0, 0]; P.armR = [1.45, -0.45 - 0.25 * dk, 0]; P.foreR = [0.1 + 0.15 * dk, 0, -1.1 * dk];
    } else if (sw) {
      P.armR = [P.armR[0] + sw * 1.9, -sw * 0.25, 0]; P.foreR = [0.25 + sw * 0.5, 0, 0]; P.body[1] -= sw * 0.25;
    }
    // golem slams and volleys
    if (m.attack && m.state === 'tele') {
      const k = m.attack.progress || 0;
      if (m.attack.kind === 'slam') { P.armR = [Math.PI * 0.95 * k, 0, 0.1]; P.armL = [Math.PI * 0.95 * k, 0, -0.1]; P.body[0] += 0.25 * k; }
      else if (m.attack.kind === 'volley') { P.armR = [1.5 * k, 0, 0]; P.armL = [1.5 * k, 0, 0]; }
    }
    if (m.state === 'volleying') { P.armR = [1.5, 0, 0]; P.armL = [1.5, 0, 0]; }
    // no legs left to stand on: down on its front, pulling itself along with its arms
    if (crawl) {
      R.pitch = -1.35; R.lift = -(d.hipY * RPX) + (d.bodyDepth * RPX) * 0.55;
      const pull = Math.sin(ph * 0.8);
      P.armR = [2.9 + pull * 0.45, 0, 0.15]; P.armL = [2.9 - pull * 0.45, 0, -0.15]; P.foreR = [0.3 - pull * 0.3, 0, 0]; P.foreL = [0.3 + pull * 0.3, 0, 0];
      P.legL = [0.1, 0, 0.1]; P.legR = [-0.1, 0, -0.1]; P.shinL = [-0.3, 0, 0]; P.shinR = [-0.3, 0, 0];
      P.head = [1.1, 0, 0];   // lifted to look ahead
    }
    // the head turns toward what it watches before the body does
    P.head = P.head || [0, 0, 0];
    P.head[0] += m.headPitch || 0; P.head[1] += (m.headYawRel || 0) - P.body[1];
  },

  quad(m, d, P, R) {
    const a = m.walkAmt || 0, ph = m.walk || 0, t = m.age || 0;
    const run = clamp((m.speedNow || 0) / 5, 0, 1);
    const gallop = d.gallop && run > 0.55;
    const ph2 = gallop ? 0.45 : Math.PI;
    for (const p of m._M.parts) {
      if (p.role !== 'qleg') continue;
      // trot: diagonal pairs together; gallop: front pair then back pair
      const off = gallop ? (p.front ? 0 : Math.PI) + (p.side > 0 ? ph2 : 0) : ((p.front === (p.side > 0)) ? 0 : Math.PI);
      const s = Math.sin(ph + off), c = Math.cos(ph + off);
      P[p.name] = [s * (0.65 + 0.25 * run) * a, 0, 0];
      const shin = 'shin' + p.name.slice(3);
      // front knees fold back as the hoof comes forward; hocks fold the other way
      P[shin] = [p.front ? -Math.max(0, c) * (0.7 + 0.4 * run) * a : Math.max(0, -c) * 0.55 * a, 0, 0];
    }
    if (!m.onGround && !m.inWater && !m.ghost) for (const p of m._M.parts) if (p.role === 'qleg') P[p.name] = [p.front ? 0.6 : -0.6, 0, 0];
    R.lift = Math.abs(Math.sin(ph * 2)) * 0.025 * a * (gallop ? 2.5 : 1);
    P.body = [Math.sin(ph) * 0.035 * a * (gallop ? 2.5 : 1), 0, 0];
    // head bobs with the stride, drops to graze, looks about
    const graze = m.grazeT > 0 ? Math.min(1, m.grazeT * 3, (m.grazeMax - m.grazeT + 0.001) * 3) : 0;
    P.head = [Math.sin(ph * 2) * 0.07 * a + (m.headPitch || 0) * (1 - graze) - graze * 1.05, (m.headYawRel || 0) * (1 - graze), 0];
    if (graze) P.head[0] += Math.sin(t * 14) * 0.05 * graze;
    if (d.parts.some(p => p.name === 'neck')) { P.neck = [P.head[0] * 0.4 - graze * 0.5, P.head[1] * 0.4, 0]; P.head[0] *= 0.6; P.head[1] *= 0.6; }
    P.tail = [Math.sin(t * 1.3) * 0.08 + run * a * 0.6, Math.sin(t * 2.2) * 0.22 + Math.sin(ph) * 0.15 * a, 0];
    // ears flick now and then
    const flick = Math.max(0, Math.sin(t * 0.7 + (m.id || 0)) - 0.93) * 6;
    P.earL = [0, 0, -flick * 0.5]; P.earR = [0, 0, flick * 0.5];
    if (m.landT > 0) R.lift -= 0.06 * (m.landT / 0.18);
  },

  spider(m, d, P, R) {
    const a = m.walkAmt || 0, ph = (m.walk || 0) * 1.6, t = m.age || 0;
    for (const p of m._M.parts) {
      if (p.role !== 'sleg') continue;
      // two groups of four legs take turns, like a real spider's gait
      const off = ((p.idx % 2 === 0) === (p.side > 0)) ? 0 : Math.PI;
      const s = Math.sin(ph + off + p.idx * 0.35), c = Math.cos(ph + off + p.idx * 0.35);
      P[p.name] = [0, s * 0.38 * a * p.side, Math.max(0, c) * 0.35 * a * p.side];
      P['sshin' + p.name.slice(4)] = [0, 0, -Math.max(0, c) * 0.2 * a * p.side];
    }
    // idle legs twitch, the abdomen pulses
    P.abdomen = [Math.sin(t * 2.2) * 0.04, Math.sin(ph) * 0.05 * a, 0];
    P.head = [(m.headPitch || 0) * 0.6, (m.headYawRel || 0) * 0.5, 0];
    R.lift = Math.abs(Math.sin(ph * 2)) * 0.02 * a;
    if (!m.onGround && !m.climbing && !m.ghost) for (const p of m._M.parts) if (p.role === 'sleg') P[p.name] = [0, 0, -0.25 * p.side];
  },

  bird(m, d, P, R) {
    const a = m.walkAmt || 0, ph = (m.walk || 0) * 1.4, t = m.age || 0;
    const air = !m.onGround && !m.inWater && !m.ghost;
    P.legL = [Math.sin(ph) * 0.9 * a, 0, 0]; P.legR = [-Math.sin(ph) * 0.9 * a, 0, 0];
    const flap = air ? 0.5 + Math.sin(t * 32) * 0.7 : 0.04 + (m.flutterT > 0 ? Math.sin(t * 40) * 0.4 : 0);
    P.wingR = [0, 0, -flap]; P.wingL = [0, 0, flap];
    const peck = m.peckT > 0 ? Math.sin(m.peckT / 0.35 * Math.PI) : 0;
    P.head = [(m.headPitch || 0) - peck * 0.9, m.headYawRel || 0, 0];
    R.headShift = Math.sin(ph * 2) * 0.03 * a;   // pigeon-style head bob
  },

  slime(m, d, P, R) { P.cube = [0, 0, 0]; },

  pod(m, d, P, R) {   // fuselings: four stubby legs and a bobbing bud
    const a = m.walkAmt || 0, ph = m.walk || 0, t = m.age || 0;
    for (const p of m._M.parts) if (p.role === 'qleg') { const off = (p.front === (p.side > 0)) ? 0 : Math.PI; P[p.name] = [Math.sin(ph + off) * 0.8 * a, 0, 0]; }
    P.body = [0, 0, Math.sin(ph) * 0.06 * a];
    P.head = [(m.headPitch || 0) * 0.6 + Math.sin(t * 1.4) * 0.03, (m.headYawRel || 0) * 0.8, Math.sin(t * 2) * 0.03];
    P.crown = [0, t * 0.6, 0];
    R.lift = Math.abs(Math.sin(ph)) * 0.03 * a;
  },
};

// Extra poses layered over a kind's animation (sitting, ramming, swimming with the legs tucked...).
// Filled in by render/rigdefs2.js.
const RIG_POST = {};

// World-space matrices for every part (relative to the mob's position), parents first.
// Returns null for parts that are lost (or hang from a lost part).
function rigMatrices(mob, M, base) {
  const d = M.def, P = {}, R = { lift: 0, pitch: 0, roll: 0, headShift: 0 };
  mob._M = M;
  const anim = RIG_ANIM[d.rig];
  if (anim) anim(mob, d, P, R);
  if (d.pitch0) R.pitch += d.pitch0;
  const post = d.post && RIG_POST[d.post];
  if (post) post(mob, d, P, R);
  const root = Mat4.create(); root.set(base);
  if (R.lift) Mat4.translate(root, 0, R.lift, 0);
  if (d.scale && d.scale !== 1) Mat4.scale(root, d.scale, d.scale, d.scale);
  if (R.pitch) { const hy = (d.hipY || 0) * RPX; Mat4.translate(root, 0, hy, 0); Mat4.rotateX(root, R.pitch); Mat4.translate(root, 0, -hy, 0); }
  if (R.roll) { const ry = (d.rollY ?? d.hipY ?? 0) * RPX; Mat4.translate(root, 0, ry, 0); Mat4.rotateZ(root, R.roll); Mat4.translate(root, 0, -ry, 0); }
  const mats = mob._mats || (mob._mats = {});
  const lost = mob.lost;
  for (const part of M.parts) {
    const parent = part.parent ? mats[part.parent] : root;
    if (!parent || (lost && lost.has(part.name))) { mats[part.name] = null; continue; }
    const m = Mat4.create(); m.set(parent);
    Mat4.translate(m, part.pivot[0], part.pivot[1], part.pivot[2] - (part.name === 'head' && R.headShift ? R.headShift : 0));
    const r = P[part.name], rest = part.rest;
    const rx = (rest ? rest[0] : 0) + (r ? r[0] : 0), ry = (rest ? rest[1] : 0) + (r ? r[1] : 0), rz = (rest ? rest[2] : 0) + (r ? r[2] : 0);
    if (ry) Mat4.rotateY(m, ry);
    if (rx) Mat4.rotateX(m, rx);
    if (rz) Mat4.rotateZ(m, rz);
    mats[part.name] = m;
  }
  return mats;
}

// Is this part drawn right now? (antlers on stags, wool until shorn, and parts that only show in
// one state: a pufferfish puffed up, an armadillo curled into a ball, a bat folded at roost...)
function rigPartShown(m, part) {
  if (part.antler && !m.stag) return false;
  if (part.wool && m.sheared) return false;
  if (part.only && !m[part.only]) return false;
  if (part.not && m[part.not]) return false;
  return true;
}

// Turn the head toward what the creature is looking at, smoothly, within its neck's reach.
function rigLook(mob, target, dt) {
  let yawRel = 0, pitch = 0;
  if (target) {
    const dx = target.x - mob.x, dz = target.z - mob.z, dy = (target.y + (target.eye || 1.5)) - (mob.y + mob.h * 0.9);
    const want = Math.atan2(-dx, -dz);
    yawRel = clamp(((want - mob.yaw + Math.PI * 3) % TAU) - Math.PI, -1.2, 1.2);
    pitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -0.7, 0.7);
    if (Math.hypot(dx, dz) > 16) { yawRel = 0; pitch = 0; }
  } else {
    // nothing to watch: glance about now and then
    const g = Math.sin((mob.age || 0) * 0.37 + (mob.id || 0) * 1.7);
    yawRel = g > 0.6 ? (g - 0.6) * 2.2 * Math.sign(Math.sin((mob.id || 1) * 3.1)) : 0;
  }
  const k = Math.min(1, dt * 6);
  mob.headYawRel = (mob.headYawRel || 0) + (yawRel - (mob.headYawRel || 0)) * k;
  mob.headPitch = (mob.headPitch || 0) + (pitch - (mob.headPitch || 0)) * k;
}

// Ray against the parts of a rigged creature: which part does it hit first? (for dismemberment)
function rigHitPart(mob, ox, oy, oz, dx, dy, dz) {
  const M = mob._M, mats = mob._mats;
  if (!M || !mats) return null;
  let best = null, bt = Infinity;
  for (const part of M.parts) {
    const m = mats[part.name]; if (!m) continue;
    // into the part's own space (rotation + translation + uniform scale)
    const sx = Math.hypot(m[0], m[1], m[2]) || 1, s2 = sx * sx;
    const px = ox - (mob.x + m[12]), py = oy - (mob.y + m[13]), pz = oz - (mob.z + m[14]);
    const lx = (m[0] * px + m[1] * py + m[2] * pz) / s2, ly = (m[4] * px + m[5] * py + m[6] * pz) / s2, lz = (m[8] * px + m[9] * py + m[10] * pz) / s2;
    const ldx = (m[0] * dx + m[1] * dy + m[2] * dz) / s2, ldy = (m[4] * dx + m[5] * dy + m[6] * dz) / s2, ldz = (m[8] * dx + m[9] * dy + m[10] * dz) / s2;
    const pad = 0.03;
    const t = rayAABB(lx, ly, lz, ldx, ldy, ldz, part.min[0] - pad, part.min[1] - pad, part.min[2] - pad, part.max[0] + pad, part.max[1] + pad, part.max[2] + pad);
    if (t >= 0 && t < bt) { bt = t; best = part; }
  }
  return best;
}
