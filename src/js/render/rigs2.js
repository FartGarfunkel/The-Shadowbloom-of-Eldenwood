// ---------------------------------------------------------------------------
// render/rigs2.js — 0.8.4: more life in every creature (in the spirit of Fresh
// Animations and Better Animations).
//
// A layer over each body's own walk and pose:
//   follow-through   tails swing out on turns and settle with a spring; pets
//                    wag when you're near; ears twitch now and then
//   weight           bodies lean into turns and rock back as they speed up
//   resting          cows, sheep, pigs, horses and the like lie down when
//                    they've stood a while, and get up when something moves
//   swimming         land animals paddle with their heads up; people-shaped
//                    things tread water
//   shaking off      wolves, dogs and cats shake themselves dry out of water
//   flinching        a blow makes them rear back
//   shambling        ghouls and their kin sway, tilt their heads, drag a foot
//   dying            knees buckle and limbs go limp before the body falls,
//                    onto its side rather than through the floor
// ---------------------------------------------------------------------------

const RIG_RESTERS = new Set(['cow', 'sheep', 'pig', 'horse', 'donkey', 'llama', 'camel', 'goat', 'deer', 'boar', 'wolf', 'fox', 'snow_fox', 'cat', 'ocelot',
  'lion', 'lioness', 'tiger', 'panther', 'snow_leopard', 'brown_bear', 'polar_bear', 'panda', 'mooshroom', 'turkey', 'armadillo']);
const RIG_SHAKERS = new Set(['wolf', 'fox', 'snow_fox', 'cat', 'ocelot', 'lion', 'lioness', 'tiger', 'panther', 'snow_leopard', 'brown_bear', 'polar_bear', 'werewolf', 'raccoon', 'sheep', 'goat']);

function rigLife(m, d, P, R) {
  const t = m.age || 0, dt = clamp(t - (m._lifeT ?? t), 0, 0.1);
  m._lifeT = t;
  const L = m._life || (m._life = { yaw: m.yaw, turn: 0, sp: 0, acc: 0, tail: 0, tailV: 0, idle: 0, rest: 0, ear: 1 + Math.random() * 4, earK: 0, wet: false, shake: 0 });
  const add = (n, x, y, z) => { const p = P[n] || (P[n] = [0, 0, 0]); p[0] += x; p[1] += y; p[2] += z; };
  const kind = d.rig, a = m.walkAmt || 0, ph = m.walk || 0, T = m.T || {};
  const dead = m.deathTime > 0;
  // how fast it's turning and speeding up (smoothed)
  const dyaw = ((m.yaw - L.yaw + Math.PI * 3) % TAU) - Math.PI; L.yaw = m.yaw;
  if (dt > 0) {
    L.turn += (clamp(dyaw / dt, -5, 5) - L.turn) * Math.min(1, dt * 6);
    const sp = m.speedNow || 0; L.acc += (clamp((sp - L.sp) / dt, -12, 12) - L.acc) * Math.min(1, dt * 4); L.sp = sp;
  }
  const ground = m.onGround || m.ghost;
  // ---- weight: lean into turns, rock back when setting off ----
  if (!dead && ground && (kind === 'quad' || kind === 'biped' || kind === 'pod' || kind === 'bird')) {
    const sp = clamp((m.speedNow || 0) / 4, 0, 1);
    R.roll += -L.turn * 0.05 * sp;
    if (kind === 'quad') R.pitch += -clamp(L.acc, -6, 6) * 0.012;
  }
  // ---- tails: a spring that swings out against the turn; a wag for a pet near its owner ----
  {
    const want = L.turn * 0.22;
    L.tailV += ((want - L.tail) * 40 - L.tailV * 7) * dt; L.tail += L.tailV * dt;
    let wag = 0;
    if (m.owner && !dead) { const o = m.ownerPawn ? m.ownerPawn() : null; if (o && Math.hypot(o.x - m.x, o.z - m.z) < 5) wag = Math.sin(t * 14) * 0.45; }
    for (const p of d.parts) if (p.role === 'tail' || p.name === 'tail') add(p.name, 0, clamp(L.tail, -0.9, 0.9) + wag, 0);
  }
  // ---- ears: a twitch now and then, laid back when hurt ----
  L.ear -= dt;
  if (L.ear <= 0) { L.ear = 1.5 + Math.random() * 5; L.earK = 1; L.earSide = Math.random() < 0.5 ? 1 : -1; }
  L.earK = Math.max(0, L.earK - dt * 6);
  if (P.earL || P.earR || d.parts.some(p => p.role === 'ear')) {
    const tw = Math.sin(L.earK * Math.PI) * 0.6, back = m.hurtTime > 0 || m.angryT > 0 ? -0.5 : 0;
    for (const p of d.parts) if (p.role === 'ear') { const s = p.name.endsWith('L') ? -1 : 1; add(p.name, back, 0, s * (L.earSide === s ? tw : tw * 0.2)); }
  }
  // ---- resting: grazers and big cats lie down after standing a while ----
  const resty = RIG_RESTERS.has(m.type) && kind === 'quad' && !dead && !m.riddenBy && !m.mountedOn && !m.baby;
  if (resty && a < 0.05 && ground && !m.inWater && m.hurtTime <= 0 && !(m.grazeT > 0)) L.idle += dt; else L.idle = 0;
  const wantRest = L.idle > 14 || (m.sitting && m.owner && m.stay && RIG_RESTERS.has(m.type) && !d.post) ? 1 : 0;
  L.rest += (wantRest - L.rest) * Math.min(1, dt * (wantRest ? 1.5 : 6));
  if (L.rest > 0.01 && kind === 'quad') {
    const k = L.rest * L.rest * (3 - 2 * L.rest);
    R.lift += -(d.legH || 8) * RPX * 0.8 * k;
    for (const p of d.parts) {
      if (p.role === 'qleg') add(p.name, (p.front ? -1.35 : 1.35) * k, 0, p.side * 0.1 * k);
      else if (p.role === 'qshin') add(p.name, (p.front ? 1.3 : -1.3) * k, 0, 0);
    }
    add('head', 0.15 * k + Math.sin(t * 0.5) * 0.05 * k, 0, Math.sin(t * 0.3) * 0.08 * k);
  }
  // ---- in the water, not on it: a land animal floats low, only its head and back out; a bird sits in it ----
  {
    let want = 0;
    if (m.inWater && !T.swims && !dead && m.game && m.game.world) {
      const w = m.game.world, bx = Math.floor(m.x), bz = Math.floor(m.z);
      let surf = null;
      for (let y = Math.floor(m.y) + 2; y >= Math.floor(m.y) - 1; y--) {
        const id = w.getBlock(bx, y, bz);
        if (T_LIQUID[id] === 1 && T_LIQUID[w.getBlock(bx, y + 1, bz)] !== 1) { surf = y + liquidHeight(id, w.getMeta(bx, y, bz), w.getBlock(bx, y + 1, bz)); break; }
      }
      if (surf !== null) {
        const H = (d.height || 16) * RPX * (d.scale || 1) * (m.baby ? 0.55 : 1);
        const frac = kind === 'quad' ? 0.6 : kind === 'biped' ? 0.74 : kind === 'bird' ? 0.32 : kind === 'spider' ? 0.7 : 0.5;
        want = Math.min(0, surf - (m.y + frac * H)) + Math.sin(t * 3.1 + (m.id || 0)) * 0.025;
      }
    }
    L.sink = (L.sink || 0) + (want - (L.sink || 0)) * Math.min(1, dt * 5);
    if (Math.abs(L.sink) > 0.002) R.lift += L.sink;
  }
  // ---- swimming: land animals paddle, heads up; people-shaped things tread water ----
  if (m.inWater && !T.swims && !dead) {
    if (kind === 'quad') {
      R.pitch += -0.22;
      for (const p of d.parts) if (p.role === 'qleg') { const off = (p.front === (p.side > 0)) ? 0 : Math.PI; P[p.name] = [Math.sin(t * 9 + off) * 0.7, 0, 0]; }
      add('head', -0.35, 0, 0);
    } else if (kind === 'biped') {
      for (const s of ['L', 'R']) { const sg = s === 'L' ? 1 : -1; P['leg' + s] = [Math.sin(t * 7 + (sg > 0 ? 0 : Math.PI)) * 0.5, 0, 0]; P['arm' + s] = [0.4 + Math.sin(t * 3.5) * 0.25, 0, sg * (1.1 + Math.sin(t * 3.5) * 0.4)]; }
      add('head', -0.25, 0, 0);
    } else if (kind === 'bird') {
      // feet paddling under it, tail up
      for (const p of d.parts) if (/leg/i.test(p.name)) P[p.name] = [Math.sin(t * 8 + (p.side > 0 ? 0 : Math.PI)) * 0.6, 0, 0];
    } else if (kind === 'spider') {
      for (const p of d.parts) if (p.role === 'sleg') add(p.name, 0, Math.sin(t * 10 + (p.idx || 0)) * 0.25, -0.2 * (p.side || 1));
    }
  }
  // ---- shaking dry: out of the water, a good shake ----
  if (RIG_SHAKERS.has(m.type)) {
    if (m.inWater) L.wet = true;
    else if (L.wet && ground) { L.wet = false; L.shake = 1.1; }
  }
  if (L.shake > 0) { L.shake -= dt; const k = Math.min(1, L.shake * 2); R.roll += Math.sin(t * 38) * 0.22 * k; add('head', 0, 0, Math.sin(t * 38 + 1) * 0.35 * k); }
  // ---- a flinch when hit ----
  if (m.hurtTime > 0 && !dead) {
    const k = Math.sin(clamp(m.hurtTime / 0.35, 0, 1) * Math.PI);
    R.pitch += 0.1 * k * (kind === 'quad' ? -1 : 1);
    add('head', -0.25 * k, 0, 0);
    if (kind === 'biped') { add('armR', 0, 0, 0.4 * k); add('armL', 0, 0, -0.4 * k); add('body', 0.15 * k, 0, 0); }
  }
  // ---- the shamble: ghouls and their kin ----
  if (kind === 'biped' && (T.family === 'ghoul' || m.type === 'ghoul') && !dead) {
    R.roll += Math.sin(ph) * 0.07 * a;
    add('head', Math.sin(t * 0.9 + (m.id || 0)) * 0.06, 0, Math.sin(t * 0.6 + (m.id || 0)) * 0.18);
    if (P.shinR) P.shinR[0] *= 0.45;                 // the right foot drags
    add('body', 0.06, 0, 0);
  }
  // ---- skeletons: a loose-boned rattle now and then ----
  if (m.type === 'skeleton' || m.type === 'stray') {
    const r = Math.max(0, Math.sin(t * 0.8 + (m.id || 0)) - 0.94) * 12;
    if (r > 0) { add('head', 0, Math.sin(t * 60) * 0.06 * r, Math.sin(t * 47) * 0.05 * r); add('armL', 0, 0, Math.sin(t * 53) * 0.05 * r); }
  }
  // ---- birds: quick, jerky looks rather than smooth turns ----
  if (kind === 'bird' && !dead && P.head) {
    if (!L.lookT || t > L.lookT) { L.lookT = t + 0.3 + Math.random() * 1.2; L.look = (Math.random() - 0.5) * 1.2; L.cock = (Math.random() - 0.5) * 0.5; }
    if (!m.lookAt || a > 0.3) { P.head[1] += L.look * (1 - a); P.head[2] = (P.head[2] || 0) + L.cock * (1 - a); }
  }
  // ---- idle breathing ----
  if (!dead && a < 0.2 && kind !== 'slime') R.lift += Math.sin(t * 1.9 + (m.id || 0)) * 0.006;
  // ---- dying: knees buckle, limbs go limp (the fall itself is in Mob.draws) ----
  if (dead) {
    const k = clamp(m.deathTime / 0.3, 0, 1);
    if (kind === 'biped') {
      add('shinL', -1.2 * k, 0, 0); add('shinR', -1.0 * k, 0, 0); add('legL', 0.6 * k, 0, 0.1 * k); add('legR', 0.5 * k, 0, -0.1 * k);
      add('armR', -0.3 * k, 0, 0.7 * k); add('armL', -0.2 * k, 0, -0.6 * k); add('head', 0.45 * k, 0, 0.3 * k);
      R.lift -= 0.12 * k;
    } else if (kind === 'quad') {
      for (const p of d.parts) if (p.role === 'qleg') add(p.name, (p.front ? 0.4 : -0.4) * k, 0, p.side * 0.5 * k);
      add('head', 0.5 * k, 0, 0.2 * k); add('tail', 0.6 * k, 0, 0);
    } else if (kind === 'spider') {
      for (const p of d.parts) { if (p.role === 'sleg') add(p.name, 0, 0, -p.side * 0.9 * k); if (p.role === 'sshin') add(p.name, 0, 0, -p.side * 1.1 * k); }
    } else if (kind === 'bird') { add('wingR', 0, 0, -0.9 * k); add('wingL', 0, 0, 0.9 * k); add('head', 0.6 * k, 0, 0); }
  }
}

// rigMatrices again, with the life layer between the pose and the matrices
rigMatrices = function (mob, M, base) {
  const d = M.def, P = {}, R = { lift: 0, pitch: 0, roll: 0, headShift: 0 };
  mob._M = M;
  const anim = RIG_ANIM[d.rig];
  if (anim) anim(mob, d, P, R);
  if (d.pitch0) R.pitch += d.pitch0;
  const post = d.post && RIG_POST[d.post];
  if (post) post(mob, d, P, R);
  try { rigLife(mob, d, P, R); } catch (e) { /* never let a flourish stop the drawing */ }
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
};
