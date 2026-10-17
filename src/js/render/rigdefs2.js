// ---------------------------------------------------------------------------
// render/rigdefs2.js — the 0.8 animals: horses, donkeys, llamas and camels;
// wolves, foxes, raccoons and cats; bears and pandas; goats, armadillos and
// mice; turkeys, ducks, parrots and moas; bats and bees; fish, squid,
// dolphins, turtles, axolotls and frogs.
//
// New body plans for the creatures that don't stand on four legs or two
// (fish, squid, bats, bees, turtles, frogs) and their animations, plus the
// extra poses (RIG_POST) other kinds use: sitting, ramming, rearing up,
// swimming with the legs tucked, a turkey's fan.
// Sizes are skin pixels, close to the classic models where there is one.
// ---------------------------------------------------------------------------

// ---- body plans ------------------------------------------------------------------------------
// Fish: one body (the front face is the face), a tail fin, a fin on the back and two side fins.
// Dolphins have flukes (a flat tail that beats up and down) and a beak.
function fishRig(o) {
  const Bd = o.body, T = o.tex, bodyY = Bd[1] / 2;
  const parts = [rpart('body', null, [0, bodyY, 0], [-Bd[0] / 2, -Bd[1] / 2, -Bd[2] / 2, Bd[0] / 2, Bd[1] / 2, Bd[2] / 2], T.body, { role: 'fbody', not: o.puffer ? 'puffed' : undefined })];
  const tl = o.tail || [4, 4];
  if (o.flukes) parts.push(rpart('tail', 'body', [0, 0, Bd[2] / 2], [-tl[0] / 2, -0.5, 0, tl[0] / 2, 0.5, tl[1]], T.fin, { role: 'ftail', noCull: true }));
  else if (tl[0]) parts.push(rpart('tail', 'body', [0, 0, Bd[2] / 2], [-0.25, -tl[0] / 2, 0, 0.25, tl[0] / 2, tl[1]], T.fin, { role: 'ftail', noCull: true, not: o.puffer ? 'puffed' : undefined }));
  if (o.dorsal) parts.push(rpart('dorsal', 'body', [0, Bd[1] / 2, o.dorsal[2] || 0], [-0.25, 0, -o.dorsal[1] / 2, 0.25, o.dorsal[0], o.dorsal[1] / 2], T.fin, { noCull: true, rest: [o.flukes ? -0.4 : 0, 0, 0], not: o.puffer ? 'puffed' : undefined }));
  if (o.fins) for (const s of [1, -1]) parts.push(rpart('fin' + (s > 0 ? 'R' : 'L'), 'body', [s * Bd[0] / 2, -Bd[1] / 4, -Bd[2] / 4], s > 0 ? [0, -0.25, -1, o.fins, 0.25, 1.5] : [-o.fins, -0.25, -1, 0, 0.25, 1.5], T.fin, { noCull: true, not: o.puffer ? 'puffed' : undefined }));
  for (const x of o.extras || []) parts.push(rpart(x[0], x[1], x[2], x[3], x[4], x[5]));
  return finishRig('fish', parts, { hipY: bodyY, rollY: bodyY, flukes: !!o.flukes, scale: o.scale || 1, height: Bd[1] });
}

// Squid: a tall mantle and eight arms hanging in a ring beneath it.
function squidRig(o) {
  const T = o.tex, parts = [rpart('body', null, [0, 18, 0], [-6, -8, -6, 6, 8, 6], T.body, { role: 'mantle' })];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * TAU;
    parts.push(rpart('tent' + i, 'body', [Math.cos(a) * 4.5, -8, Math.sin(a) * 4.5], [-1, -18, -1, 1, 0, 1], T.arm || T.body, { role: 'tent', ang: a }));
  }
  return finishRig('squid', parts, { hipY: 18, scale: o.scale || 0.7, height: 34 });
}

// Bats: a small furry body, big ears, and wings in two pieces that fold at the wrist.
function batRig(o) {
  const T = o.tex;
  const parts = [
    rpart('body', null, [0, 14, 0], [-3, -12, -1.5, 3, 0, 1.5], T.body, { role: 'batbody' }),
    rpart('head', 'body', [0, 0, 0], [-3, 0, -3, 3, 6, 3], T.head, { role: 'bhead', limb: 'head' }),
    rpart('earL', 'head', [-2, 6, 0], [-1.5, 0, -0.5, 1, 4, 0.5], T.body, { role: 'ear' }),
    rpart('earR', 'head', [2, 6, 0], [-1, 0, -0.5, 1.5, 4, 0.5], T.body, { role: 'ear' }),
  ];
  for (const s of [1, -1]) {
    const S = s > 0 ? 'R' : 'L';
    parts.push(rpart('wing' + S, 'body', [s * 3, -1, 0], s > 0 ? [0, -12, -0.25, 10, 0, 0.25] : [-10, -12, -0.25, 0, 0, 0.25], T.wing, { role: 'wing', side: s, noCull: true, limb: 'wing' + S }));
    parts.push(rpart('wing' + S + '2', 'wing' + S, [s * 10, 0, 0], s > 0 ? [0, -10, -0.25, 8, 0, 0.25] : [-8, -10, -0.25, 0, 0, 0.25], T.wing, { role: 'wing2', side: s, noCull: true, limb: 'wing' + S }));
  }
  return finishRig('bat', parts, { hipY: 8, scale: o.scale || 0.35, height: 20 });
}

// Bees: a striped body with the face on the front, a sting, feelers and two glassy wings.
function beeRig(o) {
  const T = o.tex;
  const parts = [
    rpart('body', null, [0, 5, 0], [-3.5, -3.5, -5, 3.5, 3.5, 5], T.body, { role: 'beebody' }),
    rpart('sting', 'body', [0, -0.5, 5], [-0.5, -0.5, 0, 0.5, 0.5, 2], T.sting, { only: 'hasSting' }),
    rpart('antL', 'body', [-1.5, 2, -5], [-0.25, 0, -3, 0.25, 0.5, 0], T.sting, { rest: [0.5, 0.2, 0] }),
    rpart('antR', 'body', [1.5, 2, -5], [-0.25, 0, -3, 0.25, 0.5, 0], T.sting, { rest: [0.5, -0.2, 0] }),
    rpart('legs', 'body', [0, -3.5, 0], [-2.5, -2, -2, 2.5, 0, 2], T.sting, { role: 'beelegs' }),
  ];
  for (const s of [1, -1]) parts.push(rpart('wing' + (s > 0 ? 'R' : 'L'), 'body', [s * 1, 3.5, -1], s > 0 ? [0, 0, -3, 9, 0.25, 3] : [-9, 0, -3, 0, 0.25, 3], T.wing, { role: 'beewing', side: s, noCull: true }));
  return finishRig('bee', parts, { hipY: 5, scale: o.scale || 1, height: 8.5 });
}

// Turtles: a broad shell over a little body, a head on a short neck, and four flippers.
function turtleRig(o) {
  const T = o.tex;
  const parts = [
    rpart('body', null, [0, 4, 0], [-8, -1, -9, 8, 5, 9], T.shell, { role: 'shell' }),
    rpart('belly', 'body', [0, -1, 0], [-6.5, -1.5, -7.5, 6.5, 0, 7.5], T.skin),
    rpart('head', 'body', [0, 1.5, -9], [-3, -2.5, -6, 3, 2.5, 0], T.head, { role: 'thead', limb: 'head' }),
  ];
  for (const s of [1, -1]) {
    const S = s > 0 ? 'R' : 'L';
    parts.push(rpart('flipF' + S, null, [s * 6.5, 1.5, -5.5], s > 0 ? [0, -1, -2.5, 8, 0.5, 2.5] : [-8, -1, -2.5, 0, 0.5, 2.5], T.skin, { role: 'flip', front: true, side: s, limb: 'flipF' + S }));
    parts.push(rpart('flipB' + S, null, [s * 5, 1.5, 7], [-2, -1, 0, 2, 0.5, 6], T.skin, { role: 'flip', front: false, side: s, limb: 'flipB' + S, rest: [0, s * -0.4, 0] }));
  }
  return finishRig('turtle', parts, { hipY: 4, rollY: 4, scale: o.scale || 1, height: 9 });
}

// Frogs: a squat body with the head across the front, bulging eyes on top, little front legs
// and long folded back legs that kick out straight when it jumps.
function frogRig(o) {
  const T = o.tex;
  const parts = [
    rpart('body', null, [0, 2, 1], [-3.5, 0, -3.5, 3.5, 3.5, 4.5], T.skin, { role: 'fbody' }),
    rpart('head', 'body', [0, 2, -3.5], [-3.5, 0, -5, 3.5, 2.5, 0], T.head, { role: 'fhead', limb: 'head' }),
    rpart('eyeL', 'head', [-2.25, 2.5, -3.5], [-1.25, 0, -1.25, 1.25, 1.75, 1.25], T.eye),
    rpart('eyeR', 'head', [2.25, 2.5, -3.5], [-1.25, 0, -1.25, 1.25, 1.75, 1.25], T.eye),
    rpart('throat', 'head', [0, 0, -2.5], [-2.5, -1, -2, 2.5, 0, 2], T.belly || T.skin, { role: 'throat' }),
    rpart('tongue', 'head', [0, 0.5, -5], [-0.5, -0.25, -10, 0.5, 0.25, 0], 'pink_skin', { only: 'tongueOut' }),
    rpart('legFL', null, [-2.5, 2, -2], [-1, -2, -1, 1, 0, 1], T.skin, { role: 'qleg', front: true, side: -1, limb: 'legFL' }),
    rpart('legFR', null, [2.5, 2, -2], [-1, -2, -1, 1, 0, 1], T.skin, { role: 'qleg', front: true, side: 1, limb: 'legFR' }),
    rpart('legBL', null, [-3.5, 2, 3.5], [-2.5, -2, -4, 0, 0, 2], T.skin, { role: 'qleg', front: false, side: -1, limb: 'legBL' }),
    rpart('legBR', null, [3.5, 2, 3.5], [0, -2, -4, 2.5, 0, 2], T.skin, { role: 'qleg', front: false, side: 1, limb: 'legBR' }),
  ];
  return finishRig('frog', parts, { hipY: 3, scale: o.scale || 1, height: 8 });
}

// Move a part under a new parent (used to hang a long-necked bird's head on its neck, and so on).
function rigReplace(def, name, fn) { const i = def.parts.findIndex(p => p.name === name); if (i >= 0) def.parts[i] = fn(def.parts[i]); return def; }

// ---- animation for the new body plans ---------------------------------------------------------
Object.assign(RIG_ANIM, {
  fish(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0) * 0.37, sp = clamp((m.speedNow || 0) / 3, 0, 1), out = !m.inWater && !m.ghost && m.onGround;
    const f = out ? 16 : 5 + sp * 9;
    P.body = [0, Math.sin(t * f) * (0.06 + sp * 0.1), 0];
    P.tail = d.flukes ? [Math.sin(t * f * 0.6 + 1) * (0.35 + sp * 0.3), 0, 0] : [0, Math.sin(t * f + 1) * (0.35 + sp * 0.35), 0];
    P.finL = [0, 0, -0.35 - Math.sin(t * 5) * 0.25]; P.finR = [0, 0, 0.35 + Math.sin(t * 5) * 0.25];
    if (out && !d.flukes) { R.roll = Math.PI / 2; P.body[1] += Math.sin(t * 22) * 0.35; }   // flapping on its side out of water
    R.pitch = m.swimPitch || 0;
  },
  squid(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), wet = m.inWater || m.ghost;
    const pulse = (Math.sin(t * (wet ? 2.6 : 1.2)) + 1) / 2, open = wet ? 0.12 + pulse * 0.55 : 0.04;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; P['tent' + i] = [-open * Math.sin(a), 0, open * Math.cos(a)]; }
    R.pitch = m.swimPitch || 0;
    if (!wet) R.lift = -0.35;
  },
  bat(m, d, P, R) {
    const t = (m.age || 0) * 1.0 + (m.id || 0);
    if (m.roosting) {
      R.pitch = Math.PI;                                    // hanging upside down from the roof
      R.lift = (d.hipY * 2) * RPX * d.scale;
      P.wingR = [0, -1.35, 0]; P.wingL = [0, 1.35, 0]; P.wingR2 = [0, -1.5, 0]; P.wingL2 = [0, 1.5, 0];
      P.head = [Math.sin(t * 0.7) * 0.1, 0, 0];
      return;
    }
    const flap = Math.sin(t * 26);
    R.pitch = -1.1 + (m.vy || 0) * 0.05;                    // body nearly flat, head first
    P.wingR = [0, flap * 0.9 - 0.15, 0]; P.wingL = [0, -flap * 0.9 + 0.15, 0];
    P.wingR2 = [0, flap * 0.55, 0]; P.wingL2 = [0, -flap * 0.55, 0];
    P.head = [0.9, 0, 0];
    P.earL = [0, 0, -0.2]; P.earR = [0, 0, 0.2];
  },
  bee(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0);
    const buzz = Math.abs(Math.sin(t * 70));
    P.wingR = [0, 0, -0.15 - buzz * 0.8]; P.wingL = [0, 0, 0.15 + buzz * 0.8];
    R.lift = m.onGround ? 0 : Math.sin(t * 5) * 0.04;
    R.pitch = -clamp((m.speedNow || 0) * 0.08, 0, 0.3) + (m.angry ? -0.15 : 0);
    P.legs = [Math.sin(t * 4) * 0.12, 0, 0];
    P.antL = [Math.sin(t * 3) * 0.1, 0, 0]; P.antR = [Math.sin(t * 3 + 1) * 0.1, 0, 0];
  },
  turtle(m, d, P, R) {
    const a = m.walkAmt || 0, ph = m.walk || 0, t = (m.age || 0) + (m.id || 0);
    if (m.inWater || m.ghost && m.wet) {
      const s = Math.sin(t * 3.2);
      P.flipFR = [0, 0.3, s * 0.55]; P.flipFL = [0, -0.3, -s * 0.55];
      P.flipBR = [0, Math.sin(t * 3.2 + 1) * 0.35, 0]; P.flipBL = [0, -Math.sin(t * 3.2 + 1) * 0.35, 0];
      R.pitch = m.swimPitch || 0;
    } else {
      const s = Math.sin(ph * 1.4) * a;
      P.flipFR = [0, s * 0.55, 0]; P.flipFL = [0, s * 0.55, 0];
      P.flipBR = [0, -s * 0.35, 0]; P.flipBL = [0, -s * 0.35, 0];
      R.roll = Math.sin(ph * 1.4) * 0.05 * a;               // a waddle from side to side
    }
    P.head = [(m.headPitch || 0) * 0.6 + Math.sin(t * 0.8) * 0.04, (m.headYawRel || 0) * 0.7, 0];
  },
  frog(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), air = !m.onGround && !m.inWater && !m.ghost;
    if (air || (m.ghost && Math.abs((m.ty || m.y) - m.y) > 0.05)) {
      P.legBL = [-1.25, 0, 0]; P.legBR = [-1.25, 0, 0]; P.legFL = [0.9, 0, 0]; P.legFR = [0.9, 0, 0];
      R.pitch = clamp((m.vy || 0) * 0.07, -0.45, 0.45);
    } else if (m.inWater) {
      const k = Math.abs(Math.sin(t * 5));
      P.legBL = [-k * 1.1, 0, 0]; P.legBR = [-k * 1.1, 0, 0]; P.legFL = [0.5, 0, 0]; P.legFR = [0.5, 0, 0];
    } else {
      const a = m.walkAmt || 0;
      P.legFL = [Math.sin(m.walk || 0) * 0.4 * a, 0, 0]; P.legFR = [-Math.sin(m.walk || 0) * 0.4 * a, 0, 0];
    }
    // breathing throat, a croak now and then
    const croak = m.croakT > 0 ? Math.sin(m.croakT / 0.6 * Math.PI) : 0;
    P.throat = [0, 0, 0]; R.headShift = 0;
    P.head = [(m.headPitch || 0) * 0.3 + croak * 0.25, (m.headYawRel || 0) * 0.5, 0];
    R.lift = (R.lift || 0) + Math.sin(t * 3) * 0.003;
  },
});

// ---- poses layered on top -------------------------------------------------------------------
Object.assign(RIG_POST, {
  // cats, wolves and foxes sit (and lie down to sleep)
  sit(m, d, P, R) {
    if (m.sleeping) {
      R.lift -= (d.legH || 6) * RPX * 0.85;
      for (const k of ['legFL', 'legFR']) P[k] = [1.45, 0, 0];
      for (const k of ['legBL', 'legBR']) P[k] = [-1.45, 0, 0];
      P.head = [-0.15, 0.5, 0]; P.tail = [0, 1.2, 0];
      return;
    }
    if (!m.sitting) return;
    const k = 0.5;
    R.pitch += k; R.lift += (d.bodyLen || 12) * 0.5 * RPX * Math.sin(k) * 0.55;
    for (const n of ['legFL', 'legFR']) P[n] = [-k, 0, 0];
    for (const n of ['legBL', 'legBR']) P[n] = [1.15, 0, 0];
    for (const n of ['shinBL', 'shinBR']) P[n] = [-1.2, 0, 0];
    if (P.head) P.head[0] -= k;
  },
  // goats lower their heads to ram
  ram(m, d, P, R) {
    if (m.ramming) { P.head = P.head || [0, 0, 0]; P.head[0] -= 0.75; }
    RIG_POST.sit(m, d, P, R);
  },
  // bears stand up on their back legs when they're about to swipe
  bear(m, d, P, R) {
    if (!m.rearT || m.rearT <= 0) return;
    const k = Math.min(1, m.rearT * 3) * 1.05;
    R.pitch += k; R.lift += (d.bodyLen || 20) * 0.5 * RPX * Math.sin(k) * 0.9;
    for (const n of ['legFL', 'legFR']) P[n] = [-k + 0.5 + Math.sin((m.age || 0) * 9) * 0.25, 0, 0];
    for (const n of ['legBL', 'legBR']) P[n] = [-k, 0, 0];
    if (P.head) P.head[0] -= k * 0.8;
  },
  // axolotls tuck their legs back and wave the tail to swim; they play dead when hurt
  swimTuck(m, d, P, R) {
    if (m.playDead) { R.roll = Math.PI; return; }
    if (!m.inWater) return;
    const t = (m.age || 0) + (m.id || 0);
    P.legFL = [-1.3, 0, -0.4]; P.legFR = [-1.3, 0, 0.4]; P.legBL = [-1.3, 0, -0.3]; P.legBR = [-1.3, 0, 0.3];
    P.tail = [0, Math.sin(t * 7) * 0.55, 0];
    P.body = [0, Math.sin(t * 7 - 1) * 0.08, 0];
    R.pitch = m.swimPitch || 0;
  },
  // a turkey spreads its fan to show off
  fan(m, d, P, R) {
    const k = m.displayT > 0 ? Math.min(1, m.displayT * 3) : 0;
    P.fan = [-k * 1.25, 0, 0];
    if (k) { P.wingR = [0, 0, -0.35 * k]; P.wingL = [0, 0, 0.35 * k]; }
  },
  // parrots sit upright, and bob their heads to the music
  perch(m, d, P, R) {
    if (m.dancing) { P.head = P.head || [0, 0, 0]; P.head[0] += Math.sin((m.age || 0) * 12) * 0.3; R.roll = Math.sin((m.age || 0) * 6) * 0.15; }
  },
});

// ---- the animals ---------------------------------------------------------------------------------
{
  const D = {};
  const ear = (name, at, w, h, tex, rest) => [name, 'head', at, [-w / 2, 0, -0.5, w / 2, h, 0.5], tex, { role: 'ear', rest: rest || [0, 0, 0] }];
  const snout = (at, w, h, l, tex) => ['snout', 'head', at, [-w / 2, -h / 2, -l, w / 2, h / 2, 0], tex];
  const hooves = (tex) => ['FL', 'FR', 'BL', 'BR'].map(k => ['hoof' + k, 'shin' + k, [0, 0, 0], [-2.15, -7, -2.15, 2.15, -5.5, 2.15], tex]);

  // horses: four coats, a mane down the neck, a long tail
  for (const k of ['chestnut', 'black', 'white', 'dun']) {
    const c = 'horse_' + k, mane = c + '_mane';
    D[c] = quadRig({
      body: [10, 10, 22], leg: [4, 14], head: [5, 6, 11], neck: [4, 12, 6, 0.6], headTilt: 0.45, headAt: [3, 0], tail: [3, 14, 3], tailRest: -0.35, gallop: true,
      tex: { body: c, head: { all: c, front: c + '_face' }, leg: c, tail: mane, neck: c },
      extras: [['mane', 'neck', [0, 0, 3], [-1, 0, 0, 1, 13, 2], mane], ear('earL', [-1.5, 3, -1.5], 1.5, 3, c, [-0.2, 0, -0.15]), ear('earR', [1.5, 3, -1.5], 1.5, 3, c, [-0.2, 0, 0.15])].concat(hooves('hoof')),
    });
  }
  D.donkey = quadRig({
    body: [8, 8, 18], leg: [3, 11], head: [4, 5, 9], neck: [3, 9, 5, 0.6], headTilt: 0.4, headAt: [2, 0], tail: [2, 10, 2], tailRest: -0.3, gallop: true,
    tex: { body: 'donkey_hide', head: { all: 'donkey_hide', front: 'donkey_face' }, leg: 'donkey_leg', tail: 'donkey_mane' },
    extras: [['mane', 'neck', [0, 0, 2.5], [-0.75, 0, 0, 0.75, 10, 1.5], 'donkey_mane'], ear('earL', [-1.25, 2.5, -1.5], 1.5, 6, 'donkey_hide', [-0.3, 0, -0.25]), ear('earR', [1.25, 2.5, -1.5], 1.5, 6, 'donkey_hide', [-0.3, 0, 0.25])],
  });
  for (const k of ['cream', 'brown', 'white', 'gray']) {
    const c = 'llama_' + k;
    D[c] = quadRig({
      body: [10, 10, 16], leg: [4, 13], head: [5, 6, 8], neck: [6, 13, 6, 0.08], headTilt: 0.05, headAt: [3, 1], tail: [4, 5, 2], tailRest: -0.3,
      tex: { body: c, head: { all: c, front: c + '_face' }, leg: c, neck: c },
      extras: [ear('earL', [-1.75, 3, -1.5], 1.5, 4, c, [-0.15, 0, -0.1]), ear('earR', [1.75, 3, -1.5], 1.5, 4, c, [-0.15, 0, 0.1])],
    });
  }
  D.camel = quadRig({
    body: [14, 12, 24], leg: [5, 22], head: [6, 6, 10], neck: [6, 13, 6, 0.95], headTilt: 0.1, headAt: [3, 0], tail: [2, 10, 2], tailRest: -0.2,
    tex: { body: 'camel_hide', head: { all: 'camel_hide', front: 'camel_face' }, leg: 'camel_hide' },
    extras: [['hump', 'body', [0, 6, 0], [-5, 0, -5, 5, 6, 5], 'camel_hump'], ear('earL', [-2.5, 3, -1.5], 1.5, 2, 'camel_hide', [0, 0, -0.5]), ear('earR', [2.5, 3, -1.5], 1.5, 2, 'camel_hide', [0, 0, 0.5])],
  });

  // wolves, foxes, raccoons
  D.wolf = quadRig({
    body: [6, 6, 12], leg: [2, 8], head: [6, 6, 4], headAt: [2, 0], tail: [2, 8, 2], tailRest: -0.75, post: 'sit',
    tex: { body: { all: 'wolf_fur', top: 'wolf_back' }, head: { all: 'wolf_fur', front: 'wolf_face', top: 'wolf_back' }, leg: 'wolf_leg', tail: 'wolf_back' },
    extras: [['mane', 'body', [0, 0.5, -3], [-4, -3.5, -3.5, 4, 3.5, 3.5], { all: 'wolf_fur', top: 'wolf_back' }], snout([0, -1.5, -4], 3, 3, 3, { all: 'wolf_fur', front: 'wolf_snout' }),
      ear('earL', [-2, 3, -1.5], 2, 2, 'wolf_back'), ear('earR', [2, 3, -1.5], 2, 2, 'wolf_back')],
  });
  for (const [k, pre] of [['fox', 'fox'], ['snow_fox', 'snow_fox']]) {
    D[k] = quadRig({
      body: [6, 6, 11], leg: [2, 6], head: [8, 6, 6], headAt: [2, 0], tail: [4, 9, 4], tailRest: -1.15, post: 'sit',
      tex: { body: pre + '_fur', head: { all: pre + '_fur', front: pre + '_face' }, leg: k === 'fox' ? 'fox_ear' : pre + '_fur', tail: pre + '_tail' },
      extras: [snout([0, -2, -6], 4, 2, 3, { all: pre + '_fur', front: pre + '_snout' }), ear('earL', [-2.5, 3, -2], 2, 2.5, k === 'fox' ? 'fox_ear' : pre + '_fur'), ear('earR', [2.5, 3, -2], 2, 2.5, k === 'fox' ? 'fox_ear' : pre + '_fur')],
    });
  }
  D.raccoon = quadRig({
    body: [6, 6, 10], leg: [2, 5], head: [6, 5, 5], headAt: [2, 0], tail: [3, 9, 3], tailRest: -1.0, post: 'sit',
    tex: { body: 'raccoon_fur', head: { all: 'raccoon_fur', front: 'raccoon_face' }, leg: 'fox_ear', tail: 'raccoon_tail' },
    extras: [snout([0, -1.5, -5], 3, 2, 2, { all: 'raccoon_fur', front: 'raccoon_snout' }), ear('earL', [-2, 2.5, -1.5], 2, 2, 'raccoon_fur'), ear('earR', [2, 2.5, -1.5], 2, 2, 'raccoon_fur')],
  });

  // cats
  for (const [k, tail] of [['cat_tabby', -2.0], ['cat_black', -2.0], ['ocelot', -1.2]]) {
    const fur = k === 'ocelot' ? 'ocelot_fur' : k;
    D[k] = quadRig({
      body: [4, 5, 14], leg: [2, 7], head: [5, 4, 5], headAt: [2, 0], tail: [1, 8, 1], tailRest: tail, post: 'sit',
      tex: { body: fur, head: { all: fur, front: k + '_face' }, leg: fur, tail: fur },
      extras: [ear('earL', [-1.5, 2, -1.5], 1.5, 1.5, fur), ear('earR', [1.5, 2, -1.5], 1.5, 1.5, fur)],
    });
  }

  // bears and pandas
  for (const k of ['polar_bear', 'brown_bear']) {
    D[k] = quadRig({
      body: k === 'polar_bear' ? [13, 12, 22] : [14, 13, 22], leg: [5, 10], head: [8, 8, 7], headAt: [0, 0], tail: [3, 3, 2], tailRest: -0.3, gallop: true, post: 'bear',
      tex: { body: k + '_fur', head: { all: k + '_fur', front: k + '_face' }, leg: k + '_fur' },
      extras: [snout([0, -1.5, -7], 5, 4, 3, { all: k + '_fur', front: k + '_snout' }), ear('earL', [-3, 4, -2], 2, 2, k + '_fur'), ear('earR', [3, 4, -2], 2, 2, k + '_fur')],
    });
  }
  D.panda = quadRig({
    body: [13, 12, 20], leg: [6, 9], head: [10, 8, 7], headAt: [0, 0], tail: [2, 2, 1], tailRest: 0, post: 'bear',
    tex: { body: 'panda_white', head: { all: 'panda_white', front: 'panda_face' }, leg: 'panda_black' },
    extras: [['band', 'body', [0, 0, -6], [-6.75, -6.25, -3, 6.75, 6.25, 3], 'panda_black'], snout([0, -2, -7], 5, 3, 3, { all: 'panda_white', front: 'panda_snout' }),
      ear('earL', [-4, 4, -2], 3, 3, 'panda_black'), ear('earR', [4, 4, -2], 3, 3, 'panda_black')],
  });

  // goats, armadillos, mice
  D.goat = quadRig({
    body: [8, 9, 16], leg: [3, 10], head: [5, 7, 7], headTilt: 0.3, headAt: [3, 0], tail: [2, 3, 1], post: 'ram',
    tex: { body: 'goat_fur', head: { all: 'goat_fur', front: 'goat_face' }, leg: 'goat_fur' },
    extras: [['hornL', 'head', [-1.5, 3.5, -2], [-0.5, 0, -0.5, 0.5, 6, 0.5], 'goat_horn', { rest: [-0.65, 0, -0.15] }],
      ['hornR', 'head', [1.5, 3.5, -2], [-0.5, 0, -0.5, 0.5, 6, 0.5], 'goat_horn', { rest: [-0.65, 0, 0.15] }],
      ['beard', 'head', [0, -3.5, -6], [-1, -3, -0.5, 1, 0, 0.5], 'goat_fur'],
      ear('earL', [-3, 2, -2], 3, 1, 'goat_fur', [0, 0, 1.2]), ear('earR', [3, 2, -2], 3, 1, 'goat_fur', [0, 0, -1.2])],
  });
  D.armadillo = quadRig({
    body: [7, 5, 9], leg: [2, 2], head: [3, 4, 4], headAt: [-1, 0], tail: [1, 6, 1], tailRest: -1.0,
    tex: { body: { all: 'armadillo_shell', bottom: 'armadillo_skin' }, head: { all: 'armadillo_skin', front: 'armadillo_face' }, leg: 'armadillo_skin', tail: 'armadillo_shell' },
    extras: [ear('earL', [-1, 2, -1], 1.5, 2, 'armadillo_skin'), ear('earR', [1, 2, -1], 1.5, 2, 'armadillo_skin')],
  });
  for (const p of D.armadillo.parts) p.not = 'curled';
  D.armadillo.parts.push(rpart('ball', null, [0, 3.5, 0], [-3.5, -3.5, -3.5, 3.5, 3.5, 3.5], 'armadillo_shell', { only: 'curled' }));
  D.mouse = quadRig({
    body: [3, 3, 5], leg: [1, 1], head: [3, 3, 3], headAt: [0.5, 0], tail: [0.6, 6, 0.6], tailRest: -1.35,
    tex: { body: 'mouse_fur', head: { all: 'mouse_fur', front: 'mouse_face' }, leg: 'pink_skin', tail: 'pink_skin' },
    extras: [ear('earL', [-1.2, 1.5, -1], 2, 2, 'mouse_ear', [0, 0, -0.2]), ear('earR', [1.2, 1.5, -1], 2, 2, 'mouse_ear', [0, 0, 0.2])],
  });
  D.aerbunny = quadRig({
    body: [7, 7, 9], leg: [2, 3], head: [6, 5, 5], headAt: [2.5, 1], tail: [3, 3, 2],
    tex: { body: 'aerbunny_fur', head: { all: 'aerbunny_fur', front: 'aerbunny_face' }, leg: 'aerbunny_fur', tail: 'aerbunny_fur' },
    extras: [ear('earL', [-1.5, 2.5, -2], 2, 4, 'aerbunny_fur', [0.2, 0, -0.2]), ear('earR', [1.5, 2.5, -2], 2, 4, 'aerbunny_fur', [0.2, 0, 0.2])],
  });

  // birds
  D.turkey = birdRig({
    body: [8, 8, 10], head: [3, 5, 3], leg: [1.5, 6], wing: [1, 6, 8], post: 'fan',
    tex: { body: 'turkey_feather', head: { all: 'turkey_head', front: 'turkey_face' }, leg: 'chicken_legs', wing: 'turkey_feather' },
    extras: [['fan', 'body', [0, 2, 4.5], [-7, 0, -0.5, 7, 11, 0.5], 'turkey_fan', { role: 'fan', rest: [1.3, 0, 0], noCull: true }],
      ['beak', 'head', [0, 2.5, -3], [-0.75, 0, -1.5, 0.75, 1, 0], 'chicken_beak'], ['wattle', 'head', [0, 1.5, -3], [-0.5, -2.5, -0.5, 0.5, 1, 0], 'wattle']],
  });
  D.duck = birdRig({
    body: [6, 5, 9], head: [3, 5, 4], leg: [1, 3], wing: [1, 4, 7],
    tex: { body: 'duck_feather', head: { all: 'duck_feather', front: 'duck_face' }, leg: 'chicken_legs', wing: 'duck_feather' },
    extras: [['bill', 'head', [0, 1.5, -4], [-1.25, 0, -2.5, 1.25, 1, 0], 'duck_bill'], ['tailF', 'body', [0, 1.5, 4.5], [-2, 0, 0, 2, 1, 2], 'duck_feather', { rest: [-0.3, 0, 0] }]],
  });
  D.mallard = birdRig({
    body: [6, 5, 9], head: [3, 5, 4], leg: [1, 3], wing: [1, 4, 7],
    tex: { body: 'mallard_body', head: { all: 'mallard_head', front: 'mallard_face' }, leg: 'chicken_legs', wing: 'mallard_body' },
    extras: [['bill', 'head', [0, 1.5, -4], [-1.25, 0, -2.5, 1.25, 1, 0], 'mallard_bill'], ['tailF', 'body', [0, 1.5, 4.5], [-2, 0, 0, 2, 1, 2], 'mallard_body', { rest: [-0.3, 0, 0] }]],
  });
  for (const k of ['red', 'green', 'blue', 'gray']) {
    const c = 'parrot_' + k;
    D[c] = birdRig({
      body: [4, 5, 5], head: [3, 4, 3], leg: [1, 2], wing: [1, 5, 3], legX: 1, pitch0: 0.45, post: 'perch',
      tex: { body: c, head: { all: c, front: c + '_face' }, leg: 'parrot_beak', wing: c },
      extras: [['beak', 'head', [0, 1, -3], [-0.5, 0, -1.5, 0.5, 2, 0], 'parrot_beak'], ['crest', 'head', [0, 4, -1], [-0.5, 0, 0, 0.5, 2.5, 2], c, { rest: [-0.5, 0, 0] }],
        ['tailP', 'body', [0, -1.5, 2.5], [-1.5, -5, 0, 1.5, 0, 1], c, { rest: [-0.5, 0, 0] }]],
    });
  }
  D.moa = birdRig({
    body: [10, 10, 14], head: [5, 6, 7], leg: [2, 18], wing: [1, 6, 9], neck: [4, 9, 0.25], scale: 0.8, legX: 3,
    tex: { body: 'moa_feather', head: { all: 'moa_feather', front: 'moa_face' }, leg: 'moa_leg', wing: 'moa_feather' },
    extras: [['beak', 'head', [0, 2, -7], [-1, 0, -3, 1, 2, 0], 'moa_beak'], ['tailM', 'body', [0, 3, 7], [-4, -1, 0, 4, 1, 5], 'moa_feather', { rest: [0.3, 0, 0] }]],
  });

  // bats, bees
  D.bat = batRig({ tex: { body: 'bat_fur', head: { all: 'bat_fur', front: 'bat_face' }, wing: 'bat_wing' } });
  D.bee = beeRig({ scale: 0.32, tex: { body: { all: 'bee_side', top: 'bee_body', bottom: 'bee_body', front: 'bee_face' }, sting: 'bee_sting', wing: 'bee_wing' } });

  // water life
  D.squid = squidRig({ tex: { body: { all: 'squid_skin', front: 'squid_face' }, arm: 'squid_skin' } });
  D.glow_squid = squidRig({ tex: { body: { all: 'glow_squid_skin', front: 'glow_squid_face' }, arm: 'glow_squid_skin' } });
  D.cod = fishRig({ body: [2.5, 4, 9], tail: [4, 4], dorsal: [2, 4], fins: 2, tex: { body: { all: 'cod_scales', front: 'cod_face' }, fin: 'cod_fin' } });
  D.salmon = fishRig({ body: [3, 5, 12], tail: [5, 4], dorsal: [2, 5], fins: 2, tex: { body: { all: 'salmon_scales', front: 'salmon_face' }, fin: 'salmon_fin' } });
  for (const k of ['orange', 'blue', 'pink']) D['tropical_' + k] = fishRig({ body: [2, 6, 6], tail: [5, 3], dorsal: [3, 5], fins: 1.5, tex: { body: { all: 'tropical_' + k, front: 'tropical_' + k + '_face' }, fin: 'tropical_' + k } });
  D.pufferfish = fishRig({
    body: [5, 5, 5], tail: [3, 2], fins: 1.5, puffer: true, tex: { body: { all: 'puffer_skin', front: 'puffer_face' }, fin: 'puffer_spine' },
    extras: [['big', null, [0, 4, 0], [-4, -4, -4, 4, 4, 4], { all: 'puffer_skin', front: 'puffer_face' }, { only: 'puffed' }]]
      .concat([[0, 1], [0, -1], [1, 0], [-1, 0]].map(([x, z], i) => ['spikeS' + i, 'big', [x * 4, 0, z * 4], [-0.25 - Math.abs(z) * 2.5, -2.5, -0.25 - Math.abs(x) * 2.5, 0.25 + Math.abs(z) * 2.5, 2.5, 0.25 + Math.abs(x) * 2.5], 'puffer_spine', { only: 'puffed', noCull: true }]))
      .concat([['spikeT', 'big', [0, 4, 0], [-2.5, 0, -2.5, 2.5, 1, 2.5], 'puffer_spine', { only: 'puffed' }]]),
  });
  D.dolphin = fishRig({
    body: [8, 7, 14], tail: [10, 4], flukes: true, dorsal: [4, 4, 1], fins: 4, tex: { body: { all: 'dolphin_skin', front: 'dolphin_face' }, fin: 'dolphin_skin' },
    extras: [['beak', 'body', [0, -1.5, -7], [-1.5, -1, -4, 1.5, 1, 0], 'dolphin_skin']],
  });
  D.turtle = turtleRig({ tex: { shell: { all: 'turtle_skin', top: 'turtle_shell', side: 'turtle_shell' }, skin: 'turtle_skin', head: { all: 'turtle_skin', front: 'turtle_face' } } });
  for (const k of ['pink', 'blue', 'gold', 'wild']) {
    const c = 'axolotl_' + k, gill = c + '_gill';
    D[c] = quadRig({
      body: [8, 4, 10], leg: [2, 2.5], head: [8, 5, 5], headAt: [0.5, 0], tail: [1, 4, 12], tailRest: 0, post: 'swimTuck',
      tex: { body: c, head: { all: c, front: c + '_face' }, leg: c, tail: c },
      extras: [['gillT', 'head', [0, 2.5, -2], [-4, 0, 0, 4, 3, 0.5], gill, { noCull: true }], ['gillL', 'head', [-4, 0, -2], [-3, -1, 0, 0, 3, 0.5], gill, { noCull: true }], ['gillR', 'head', [4, 0, -2], [0, -1, 0, 3, 3, 0.5], gill, { noCull: true }]],
    });
  }
  D.frog = frogRig({ tex: { skin: 'frog_skin', head: { all: 'frog_skin', front: 'frog_face' }, eye: 'frog_eye' } });

  // spiders: eight eyes that glow red in the dark
  const sp = MODEL_DEFS.spider;
  if (sp && !sp.parts.some(p => p.name === 'eyes')) sp.parts.push(rpart('eyes', 'head', [0, 0, 0], [-4, -4, -8.12, 4, 4, -8.04], 'spider_eyes', { glow: true }));
  // the fuseling, redrawn: thorny bark pod on root legs, burning slit eyes, a jaw that drops open
  // when it hisses, glowing cracks, and a crown of drooping fronds
  const fz = [
    rpart('body', null, [0, 4.5, 0], [-5, 0, -4.5, 5, 12, 4.5], 'fuse_bark', { role: 'pbody' }),
    rpart('cracks', 'body', [0, 0, 0], [-5.08, 0.5, -4.58, 5.08, 11.5, 4.58], 'fuse_cracks', { glow: true }),
    rpart('head', 'body', [0, 12, 0], [-4.5, 0, -4.5, 4.5, 7, 4.5], { all: 'fuse_bark', front: 'fuse_face2', top: 'fuse_bark' }, { role: 'phead', limb: 'head' }),
    rpart('slits', 'head', [0, 0, 0], [-4.5, 0, -4.62, 4.5, 7, -4.55], 'fuse_slits', { glow: true }),
    rpart('jaw', 'head', [0, 0.5, -1], [-3.5, -2.5, -3.6, 3.5, 0, 0], { all: 'fuse_bark', top: 'fuse_maw', front: 'fuse_maw' }, { role: 'jaw' }),
  ];
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * TAU + 0.3;
    fz.push(rpart('frond' + i, 'head', [Math.sin(a) * 2.5, 7, Math.cos(a) * 2.5], [-1, 0, -0.25, 1, 7, 0.25], 'fuse_leaf', { role: 'frond', noCull: true, rest: [Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9], ang: a }));
  }
  for (const [x, y, z, rx, rz] of [[5, 8, -1, 0, -1.2], [-5, 6, 1, 0, 1.2], [3, 10, 4.5, 1.1, 0], [-2, 4, -4.5, -1.1, 0], [5, 3, 2, 0, -1.2], [-5, 10, -2, 0, 1.2]])
    fz.push(rpart('thorn' + fz.length, 'body', [x, y, z], [-0.5, 0, -0.5, 0.5, 2.5, 0.5], 'fuse_thorn', { rest: [rx, 0, rz] }));
  for (const [nm, x, z, front, side] of [['legFL', -3, -3, true, -1], ['legFR', 3, -3, true, 1], ['legBL', -3, 3, false, -1], ['legBR', 3, 3, false, 1]])
    fz.push(rpart(nm, null, [x, 4.5, z], [-1.6, -4.5, -1.6, 1.6, 0, 1.6], 'fuse_root', { role: 'qleg', front, side, limb: nm }));
  D.fuseling = finishRig('pod', fz, { post: 'fuse', height: 24 });

  Object.assign(MODEL_DEFS, D);
}
// the fuseling's jaw drops and its fronds shiver as the fuse burns down
RIG_POST.fuse = (m, d, P, R) => {
  const k = clamp((m.fuse || 0) / 1.5, 0, 1), t = (m.age || 0) + (m.id || 0);
  P.jaw = [-(0.08 + k * 0.75) - Math.sin(t * 2) * 0.03, 0, 0];
  for (let i = 0; i < 5; i++) P['frond' + i] = [Math.sin(t * 1.3 + i) * 0.08 + k * 0.4 * Math.cos(i / 5 * TAU + 0.3), 0, k * Math.sin(t * 40 + i) * 0.15];
};
