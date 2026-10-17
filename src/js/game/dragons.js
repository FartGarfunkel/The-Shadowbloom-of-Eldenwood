// ---------------------------------------------------------------------------
// game/dragons.js — 0.9: dragons.
//
// Each wild place has its dragon, asleep on a lair of bones and plunder:
//   the Verdant Dragon in the deep forests (poison breath),
//   the Sand Dragon in the deserts (fire),
//   the Frost Dragon on cold mountains and in the taiga (frost),
//   the Bog Dragon in the swamps (acid),
//   the Ember Dragon in a great cavern of the Ember Depths (fire),
//   the Storm Dragon on a high island of the Skylands (lightning),
//   the Tide Dragon on the floor of the open sea (a crushing wave of water).
// Come close and it wakes: it takes to the air, circles, breathes on you
// from above, dives to bite, lands to fight on the ground. Bring a bow or
// spells for when it's high. Beaten, it leaves its scales and its hoard.
//
// Its egg sits in the nest. Carry it home and set it down near warmth (fire,
// lava, a campfire, magma, a lit furnace) and in a few minutes it hatches: a
// drake, yours. Feed it meat and it grows; grown, it takes a saddle, and you
// can fly it: forward goes where you look, jump to climb, sneak to get off
// (the wind takes you gently down). Fly it high enough over the Overworld
// and you come out in the Skylands.
// ---------------------------------------------------------------------------
const DRAGON_TYPES = {
  verdant: { name: 'Verdant', body: '#3a7a3a', dark: '#22501f', belly: '#c8c070', wing: '#5a9a4a', eye: '#ffe040', horn: '#e8e0c0', breath: 'poison', fx: 'mana_heal', hp: 260 },
  sand: { name: 'Sand', body: '#c8964a', dark: '#8a6028', belly: '#f0dca0', wing: '#d8a860', eye: '#ff6a20', horn: '#5a3a1a', breath: 'fire', fx: 'mana_fire', hp: 280 },
  frost: { name: 'Frost', body: '#c8dcf0', dark: '#7a9ac0', belly: '#ffffff', wing: '#a0c8f0', eye: '#40c0ff', horn: '#e8f4ff', breath: 'frost', fx: 'mana_frost', hp: 300 },
  bog: { name: 'Bog', body: '#4a5030', dark: '#2a3018', belly: '#8a8a50', wing: '#5a6a3a', eye: '#c0ff40', horn: '#3a3a2a', breath: 'poison', fx: 'mana_heal', hp: 260 },
  ember: { name: 'Ember', body: '#8a1a10', dark: '#4a0a06', belly: '#f09030', wing: '#c03a1a', eye: '#ffd040', horn: '#2a1a1a', breath: 'fire', fx: 'mana_fire', hp: 340 },
  storm: { name: 'Storm', body: '#4a5a8a', dark: '#2a3458', belly: '#e0e8ff', wing: '#8a9ad0', eye: '#e0f0ff', horn: '#f0f0ff', breath: 'lightning', fx: 'mana_light', hp: 360 },
  tide: { name: 'Tide', body: '#2a7a8e', dark: '#14404e', belly: '#a8e8d8', wing: '#3a96a8', eye: '#ffe060', horn: '#e0f4ec', breath: 'water', fx: 'mana_frost', hp: 320 },
};
// the fingers of the right wing: how far each fans back from the forearm, its length, and the skin behind it
const DRAGON_FINGER = [[-0.06, 17, 6], [-0.55, 15, 7], [-1.05, 12, 8]];
// what each breath is made of
const DRAGON_BREATH_FX = { fire: ['mana_fire', 'mana_ember', 'mana_fire', 'mana_light'], frost: ['mana_frost', 'mana_frost', 'cloud_puff'], poison: ['mana_heal', 'mana_heal', 'smoke'], lightning: ['mana_light', 'mana_arcane', 'mana_light'], water: ['mana_frost', 'cloud_puff', 'mana_frost', 'cloud_puff'] };
// ---- the body: four legs, a long neck and tail, two great wings ----------------------------------------
function dragonRig(t, scale) {
  const tx = (k) => k + '_' + t;
  const T = { body: { all: tx('dscale'), bottom: tx('dbelly') }, neck: { all: tx('dscale'), bottom: tx('dbelly') }, head: { all: tx('dscale'), left: tx('dside'), right: tx('dside') }, snout: { all: tx('dscale'), front: tx('dsnout') }, jaw: { all: tx('dbelly') }, leg: tx('dscale'), wing: tx('dwing'), bone: tx('dbone'), horn: tx('dhorn') };
  const parts = [
    rpart('body', null, [0, 16, 0], [-7, -5, -14, 7, 6, 14], T.body, { role: 'dbody' }),
    rpart('neck1', 'body', [0, 3, -13], [-3.5, -3, -8, 3.5, 4, 0], T.neck, { rest: [0.6, 0, 0], limb: 'head' }),
    rpart('neck2', 'neck1', [0, 0.5, -8], [-3, -2.5, -8, 3, 3.5, 0], T.neck, { rest: [-0.25, 0, 0], limb: 'head' }),
    rpart('head', 'neck2', [0, 0.5, -8], [-4.5, -3, -7, 4.5, 4, 0], T.head, { rest: [-0.3, 0, 0], limb: 'head' }),
    rpart('snout', 'head', [0, -0.5, -7], [-3, -2.5, -6, 3, 1.5, 0], T.snout),
    rpart('jaw', 'head', [0, -3, -1], [-3, -1.5, -11, 3, 0, 0], T.jaw),
    rpart('hornL', 'head', [-3, 3.5, 0], [-0.75, 0, 0, 0.75, 1.5, 5], T.horn, { rest: [-0.45, -0.25, 0] }),
    rpart('hornR', 'head', [3, 3.5, 0], [-0.75, 0, 0, 0.75, 1.5, 5], T.horn, { rest: [-0.45, 0.25, 0] }),
    rpart('eyeL', 'head', [-4.55, 1.2, -4.5], [-0.1, -0.6, -0.9, 0.1, 0.6, 0.9], tx('deye'), { glow: true }),
    rpart('eyeR', 'head', [4.55, 1.2, -4.5], [-0.1, -0.6, -0.9, 0.1, 0.6, 0.9], tx('deye'), { glow: true }),
    rpart('tail1', 'body', [0, 2, 14], [-3.5, -3, 0, 3.5, 3, 10], T.body, { rest: [0.25, 0, 0], limb: 'tail' }),
    rpart('tail2', 'tail1', [0, 0, 10], [-2.5, -2.5, 0, 2.5, 2.5, 10], T.body, { rest: [0.1, 0, 0], limb: 'tail' }),
    rpart('tail3', 'tail2', [0, 0, 10], [-1.5, -1.5, 0, 1.5, 1.5, 10], T.body, { rest: [0.05, 0, 0], limb: 'tail' }),
    rpart('spade', 'tail3', [0, 0, 10], [-3, -0.5, 0, 3, 0.5, 5], T.horn, { limb: 'tail' }),
  ];
  for (const [nm, z] of [['F', -9], ['B', 9]]) for (const s of [1, -1]) {
    const S = nm + (s > 0 ? 'R' : 'L');
    parts.push(rpart('leg' + S, null, [s * 6, 12, z], [-2.5, -6, -2.5, 2.5, 0, 2.5], T.leg, { limb: 'leg' + S }));
    parts.push(rpart('shin' + S, 'leg' + S, [0, -6, 0], [-2, -6, -2.5, 2, 0, 2], T.leg, { limb: 'leg' + S }));
  }
  // the wings, built like a bat's: an arm, a forearm with a claw at the wrist, and three long fingers
  // fanned out behind it, with the skin stretched between them (front is -z, so the skin trails to +z)
  for (const s of [1, -1]) {
    const S = s > 0 ? 'R' : 'L', X = (a, b) => s > 0 ? [a, b] : [-b, -a];
    const [a0, a1] = X(0, 12), [b0, b1] = X(0, 14), [c0, c1] = X(-0.6, 0.6);
    parts.push(rpart('wing' + S, 'body', [s * 6.5, 5, -7], [a0, -1, -1, a1, 1, 1], T.bone, { limb: 'wing' + S }));
    parts.push(rpart('wing' + S + 'm', 'wing' + S, [0, 0, 0.5], [a0, -0.2, 0, a1, 0.2, 14], T.wing, { noCull: true, limb: 'wing' + S }));
    parts.push(rpart('wing' + S + '2', 'wing' + S, [s * 12, 0, 0], [b0, -0.75, -0.75, b1, 0.75, 0.75], T.bone, { limb: 'wing' + S }));
    parts.push(rpart('wing' + S + '2m', 'wing' + S + '2', [0, 0, 0.4], [b0, -0.2, 0, b1, 0.2, 12], T.wing, { noCull: true, limb: 'wing' + S }));
    parts.push(rpart('wing' + S + 'c', 'wing' + S + '2', [s * 14, 0, 0], [c0, -0.5, -3, c1, 0.5, 0], T.horn, { rest: [0, s * 0.35, 0], limb: 'wing' + S }));
    for (let k = 0; k < 3; k++) {
      const [f0, f1] = X(0, DRAGON_FINGER[k][1]), [m0, m1] = X(0, DRAGON_FINGER[k][1] - 2.5);
      parts.push(rpart('wing' + S + 'f' + k, 'wing' + S + '2', [s * 14, 0, 0], [f0, -0.45, -0.45, f1, 0.45, 0.45], T.bone, { rest: [0, s * DRAGON_FINGER[k][0], 0], limb: 'wing' + S }));
      parts.push(rpart('wing' + S + 'f' + k + 'm', 'wing' + S + 'f' + k, [0, 0, 0.3], [m0, -0.2, 0, m1, 0.2, DRAGON_FINGER[k][2]], T.wing, { noCull: true, limb: 'wing' + S }));
    }
  }
  return finishRig('dragon', parts, { hipY: 16, height: 30, scale, seatY: 22 * scale / 16 });
}
RIG_ANIM.dragon = function (m, d, P, R) {
  const t = m.ghost ? (m.game ? m.game.time : 0) : (m.age || 0), seed = (m.id || 0) * 0.37;
  const dt = clamp(t - (m._rigT ?? t), 0, 0.1); m._rigT = t;
  const fly = m.noGrav && !m.onGround, a = m.walkAmt || 0, ph = m.walk || 0;
  const add = (k, x, y, z) => { const v = P[k] || (P[k] = [0, 0, 0]); v[0] += x; v[1] += y; v[2] += z; };
  // banking into turns
  const dy = ((m.yaw - (m._rigYaw ?? m.yaw) + Math.PI * 3) % TAU) - Math.PI; m._rigYaw = m.yaw;
  const bank = fly && dt > 0 ? clamp(dy / dt * 0.3, -0.55, 0.55) : 0;
  m._bank = (m._bank || 0) + (bank - (m._bank || 0)) * Math.min(1, dt * 3);
  // the head follows what it looks at
  const hy = (m.headYawRel || 0) * 0.45, hp = (m.headPitch || 0) * 0.5;
  add('neck2', 0, hy, 0); add('head', -hp, hy, 0);
  if (fly) {
    const hover = m.hoverT > 0 || m.breathT > 0, climb = (m.vy || 0) > 2.5 || m.dstate === 'takeoff' || m.dstate === 'climb';
    const glide = !hover && !climb && (m.vy || 0) < -1.5;
    const rate = hover ? 8 : climb ? 7.5 : glide ? 2.5 : 5.2;
    const amp = hover ? 1.0 : climb ? 0.95 : glide ? 0.07 : 0.72;
    m._wph = (m._wph ?? seed * 7) + dt * rate;
    const w = m._wph;
    // a quick downstroke and a slower upstroke; the outer wing lags and whips through; on the way up
    // the wing sweeps back and the fingers half close, to slip through the air
    const down = Math.sin(w + 0.45 * Math.sin(w)), lag = Math.sin(w - 0.9), up = Math.max(0, Math.cos(w)) * (amp > 0.3 ? 1 : 0);
    const dihedral = glide ? 0.16 : 0.06;
    for (const [S, s] of [['R', 1], ['L', -1]]) {
      P['wing' + S] = [-0.08 * up, -s * (0.12 + 0.35 * up), s * (dihedral + amp * down)];
      P['wing' + S + '2'] = [0, -s * 0.45 * up, s * amp * 0.6 * lag];
      for (let k = 0; k < 3; k++) P['wing' + S + 'f' + k] = [0, -s * DRAGON_FINGER[k][0] * up * 0.55, s * amp * 0.3 * lag];
    }
    // legs tucked back in flight, hanging forward when hovering
    const legF = hover ? 0.25 : -0.7, legB = hover ? 0.1 : -1.1;
    P.legFR = [legF + Math.sin(t * 2 + 1) * 0.05, 0, 0]; P.legFL = [legF + Math.sin(t * 2) * 0.05, 0, 0];
    P.legBR = [legB, 0, 0]; P.legBL = [legB, 0, 0];
    for (const L of ['shinFR', 'shinFL', 'shinBR', 'shinBL']) P[L] = [hover ? -0.4 : 0.7, 0, 0];
    R.pitch = clamp((m.vy || 0) * 0.045, -0.45, 0.45) + (hover ? 0.18 : 0);
    R.roll = m._bank;
    R.lift = -down * 0.14 * amp;
    // neck reaching forward; the tail a rudder, waving slowly
    add('neck1', hover ? -0.1 : -0.4, 0, 0); add('neck2', hover ? 0.05 : 0.15, 0, 0); add('head', hover ? 0.1 : 0.2, 0, 0);
    const tw = t * 1.4 + seed;
    add('tail1', -R.pitch * 0.4 + down * 0.04, Math.sin(tw) * 0.08 - m._bank * 0.4, 0);
    add('tail2', 0, Math.sin(tw - 0.7) * 0.14, 0); add('tail3', 0, Math.sin(tw - 1.4) * 0.2, 0);
  } else {
    // on the ground: four-footed, wings folded in a Z along its sides (arm back, forearm forward, fingers back)
    const sw = Math.sin(ph) * 0.5 * a, lift = Math.max(0, -Math.cos(ph)) * 0.6 * a, lift2 = Math.max(0, Math.cos(ph)) * 0.6 * a;
    P.legFR = [sw, 0, 0]; P.legBL = [sw, 0, 0]; P.legFL = [-sw, 0, 0]; P.legBR = [-sw, 0, 0];
    P.shinFR = [-lift, 0, 0]; P.shinBL = [-lift, 0, 0]; P.shinFL = [-lift2, 0, 0]; P.shinBR = [-lift2, 0, 0];
    const breathe = Math.sin(t * 1.3 + seed);
    for (const [S, s] of [['R', 1], ['L', -1]]) {
      P['wing' + S] = [0.95, -s * 1.42, s * (0.42 + breathe * 0.02)];
      P['wing' + S + '2'] = [0, 0, s * 2.8];
      for (let k = 0; k < 3; k++) P['wing' + S + 'f' + k] = [0, -s * DRAGON_FINGER[k][0] * 0.85, -s * 2.75];
    }
    const tw = t * 0.9 + seed;
    add('tail1', 0, Math.sin(tw) * 0.1 * (1 + a), 0); add('tail2', 0, Math.sin(tw - 0.6) * 0.16, 0); add('tail3', 0, Math.sin(tw - 1.2) * 0.22, 0);
    add('neck1', Math.sin(ph * 2) * 0.04 * a, 0, 0);
    R.lift = breathe * 0.015 - Math.abs(Math.sin(ph)) * 0.03 * a;
    if (m.sleeping || m.dstate === 'sleep') {
      // curled up: head down by the forefeet, tail around, breathing slow
      // lying down: belly on the ground, forepaws out in front, hind legs folded under
      const px = (d.scale || 1) / 16;
      add('neck1', -0.95, 0.45, 0); add('neck2', 0.15, 0.35, 0); add('head', 0.5, 0.2, 0);
      add('tail1', 0.15, 0.55, 0); add('tail2', 0, 0.5, 0); add('tail3', 0, 0.4, 0);
      P.legFR = [1.35, 0.15, 0]; P.legFL = [1.35, -0.15, 0]; P.shinFR = [-0.2, 0, 0]; P.shinFL = [-0.2, 0, 0];
      P.legBR = [1.15, 0.2, 0]; P.legBL = [1.15, -0.2, 0]; P.shinBR = [-2.45, 0, 0]; P.shinBL = [-2.45, 0, 0];
      R.lift = -9 * px + Math.sin(t * 0.8 + seed) * 0.25 * px;
    }
  }
  // the jaw: open wide to breathe or bite, a slow idle working otherwise
  if (m.breathT > 0 || m.swingT > 0) { P.jaw = [-0.6, 0, 0]; add('head', -0.15, 0, 0); }
  else P.jaw = [-0.04 - Math.max(0, Math.sin(t * 0.6 + seed)) * 0.06, 0, 0];
};
for (const t of Object.keys(DRAGON_TYPES)) {
  MODEL_DEFS[t + '_dragon'] = dragonRig(t, 2.3);
  // a drake wears a saddle between its wings
  const d = MODEL_DEFS[t + '_drake'] = dragonRig(t, 1.35);
  d.parts.push(rpart('saddle', 'body', [0, 0, 0], [-7.4, 6, -9, 7.4, 7.4, 1], 'saddle_leather', { only: 'saddled' }));
  d.parts.push(rpart('girth', 'body', [0, 0, 0], [-7.3, -5.3, -5, 7.3, 6.1, -3.4], 'saddle_leather', { only: 'saddled' }));
}
// ---- what they are ---------------------------------------------------------------------------------------
defItem('dragon_scale', { name: 'Dragon Scale', rarity: 'epic', desc: 'Hard as steel and light as leather.' });
{
  ARMOR_MATS.dragonscale = { label: 'Dragonscale', mat: 'dragon_scale', pts: [3, 9, 7, 4], dur: 44 };
  for (const pc of ARMOR_PIECES) {
    defItem('dragonscale_' + pc.key, { name: 'Dragonscale ' + pc.label, maxStack: 1, icon: 'dragonscale_' + pc.key, rarity: 'epic', armor: { slot: pc.slot, points: ARMOR_MATS.dragonscale.pts[pc.slot], durability: 44 * pc.durMul, fireResist: 0.25 } });
    RECIPES.push({ out: 'dragonscale_' + pc.key, n: 1, shape: ARMOR_SHAPES[pc.slot], key: { M: 'dragon_scale' }, group: 'armor' });
  }
  ARMOR_COLORS.dragonscale = ['#5a8a6a', '#2a4a3a', '#c8e8a0'].map(hexRGB);
  for (const [t, D] of Object.entries(DRAGON_TYPES)) {
    MOB_TYPES[t + '_dragon'] = { model: t + '_dragon', label: 'the ' + D.name + ' Dragon', hp: D.hp, w: 1.4, h: 3.0, speed: 4, hostile: true, special: true, boss: true, mini: true, damage: 8, xp: 300, knockResist: 1, fireImmune: D.breath === 'fire', dragon: t, drops: [['dragon_scale', 8, 14, 1], ['emerald', 10, 20, 1], ['heart_crystal', 1, 1, 0.5]] };
    MOB_TYPES[t + '_drake'] = { model: t + '_drake', label: 'a ' + D.name.toLowerCase() + ' drake', hp: 70, w: 0.8, h: 1.5, speed: 4.2, damage: 6, retaliates: true, xp: 0, dragon: t, drake: true, flyingMount: true, fireImmune: D.breath === 'fire', drops: [['dragon_scale', 1, 3, 1]] };
    MOUNTS[t + '_drake'] = [7, 9];
    TAME_FOOD[t + '_drake'] = [['beef', 'porkchop', 'mutton', 'chicken', 'cod', 'salmon', 'cooked_beef', 'cooked_porkchop', 'cooked_mutton', 'cooked_chicken', 'rabbit', 'cooked_rabbit'], 1];
  }
}
// the eggs' shape: rounded, a bit taller than wide
for (const t of Object.keys(DRAGON_TYPES)) {
  const tex = 'dragon_egg_' + t;
  SHAPES[tex] = [
    { b: [4.5, 0, 4.5, 11.5, 1, 11.5], side: tex, end: tex }, { b: [3.5, 1, 3.5, 12.5, 7, 12.5], side: tex, end: tex },
    { b: [4, 7, 4, 12, 10, 12], side: tex, end: tex }, { b: [5, 10, 5, 11, 12.5, 11], side: tex, end: tex }, { b: [6.5, 12.5, 6.5, 9.5, 13.5, 9.5], side: tex, end: tex },
  ];
}
// ---- the pictures --------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB, tone = (p, c, k = 0.14) => shade(H(c), 1 + (p.rand() - 0.5) * k);
    for (const [t, D] of Object.entries(DRAGON_TYPES)) {
      const scales = (p) => {
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const row = y >> 2, cx = ((x + (row & 1) * 2) % 4), cy = y % 4;
          const edge = cy === 3 || (cy === 2 && (cx === 0 || cx === 3));
          p.set(x, y, edge ? tone(p, D.dark) : cy === 0 && cx > 0 && cx < 3 ? shade(H(D.body), 1.18) : tone(p, D.body));
        }
      };
      addTile('dscale_' + t, scales);
      addTile('dbelly_' + t, p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y % 4 === 3 ? shade(H(D.belly), 0.75) : tone(p, D.belly, 0.08)); });
      addTile('dside_' + t, p => { scales(p); });
      addTile('dsnout_' + t, p => { scales(p); for (const [x, y] of [[4, 5], [11, 5]]) { p.set(x, y, H('#1a0a0a')); p.set(x + 1, y, H('#1a0a0a')); } for (let x = 2; x < 14; x++) p.set(x, 13, H(D.dark)); for (const x of [3, 6, 9, 12]) { p.set(x, 14, H('#f0f0e8')); p.set(x, 15, H('#f0f0e8')); } });
      addTile('deye_' + t, p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, Math.abs(x - 7.5) < 1.5 ? H('#1a0a0a') : H(D.eye)); });
      addTile('dwing_' + t, p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const vein = x % 5 === 0 || (x + y) % 9 === 0; p.set(x, y, vein ? H(D.dark) : tone(p, D.wing, 0.1), vein ? 255 : 215); } });
      addTile('dbone_' + t, p => { p.noise(H(D.dark), 0.12); });
      addTile('dhorn_' + t, p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H(D.horn), 0.8 + (y / 16) * 0.35)); });
      addTile('dragon_egg_' + t, p => { p.noise(H(D.body), 0.12); for (let k = 0; k < 22; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), p.rand() < 0.5 ? H(D.belly) : H(D.dark)); });
    }
    addTile('mana_ember', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 7.5; p.set(x, y, mix(H('#ffd040'), H('#e83a08'), clamp(d * 1.4, 0, 1)), d < 1 ? Math.round(255 * Math.pow(1 - d, 1.2)) : 0); } });
    addItem('dragon_scale', p => { for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot(x - 7.5, (y - 5) * 1.2); if (d < 5.5 && y > 3 + Math.abs(x - 7.5) * 0.4) p.set(x, y, shade(H('#4a9a6a'), 1.2 - d * 0.08)); } for (let y = 5; y < 12; y++) p.set(7, y, H('#2a5a3a')); });
    addTile('armor_dragonscale', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const cy = y % 4, cx = (x + ((y >> 2) & 1) * 2) % 4; p.set(x, y, cy === 3 ? H('#2a4a3a') : tone(p, '#5a8a6a')); } });
    addTile('armor_dragonscale_face', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, (x >= 3 && x < 13 && y >= 4 && y < 15) ? [0, 0, 0] : H('#5a8a6a'), (x >= 3 && x < 13 && y >= 4 && y < 15) ? 0 : 255); });
  };
}
Object.assign(SND_FX, {
  dragon_roar: [2.4, 0.9, (b, v, r) => { b.vox(0, 1.9, 90 + r() * 20, 55, 'a', 0.9, 0.55); b.vox(0.05, 1.8, 180, 110, 'o', 0.4, 0.4); b.noise(0, 2.1, 'lp', 500, 0.7, 0.6, { brown: true, att: 0.15, curve: 0.6 }); }],
  dragon_flap: [0.6, 0.6, (b, v, r) => { b.noise(0, 0.45, 'lp', 320, 0.8, 0.9, { brown: true, att: 0.06 }); b.thump(0.05, 70, 40, 0.3, 0.5); }],
  dragon_breath: [1.6, 0.8, (b, v, r) => { b.noise(0, 1.5, 'bp', 700, 0.6, 0.9, { att: 0.08, curve: 0.5 }); b.noise(0, 1.4, 'lp', 300, 0.7, 0.6, { brown: true, att: 0.1, curve: 0.5 }); }],
  dragon_bite: [0.4, 0.7, (b, v, r) => { b.modes(0, [[600 + r() * 80, 0.02, 1], [1350, 0.012, 0.5]], 0.7); b.noise(0, 0.03, 'bp', 2400, 1.2, 0.4); b.thump(0, 160, 60, 0.15, 0.6); }],
  egg_crack: [0.3, 0.6, (b, v, r) => { b.modes(0, [[2400 + r() * 800, 0.008, 1]], 0.6); b.noise(0, 0.006, 'bp', 3200, 1.5, 0.5); b.modes(0.05, [[1800 + r() * 400, 0.01, 1]], 0.4); b.noise(0.05, 0.008, 'bp', 2600, 1.5, 0.35); }],
});

// ---- the lairs: one per region, where the land suits a dragon ------------------------------------------------------
const LAIR_REG = 480;
// a well-mixed seed for each region (rx and rz both count fully)
function lairSeed(seed, rx, rz, k) {
  let h = Math.imul((seed ^ k) | 0, 0x9E3779B1) ^ Math.imul(rx | 0, 0x85EBCA6B) ^ Math.imul(rz | 0, 0xC2B2AE35);
  h = Math.imul(h ^ (h >>> 16), 0x7FEB352D); h = Math.imul(h ^ (h >>> 15), 0x846CA68B);
  return (h ^ (h >>> 16)) >>> 0;
}
WorldGen.prototype.lairAt = function (rx, rz) {
  const cache = this.lairCache || (this.lairCache = new Map());
  const key = rx + ',' + rz;
  if (cache.has(key)) return cache.get(key);
  let lair = null;
  try { lair = this.planLair(rx, rz); } catch (e) { console.warn('lair', e); }
  if (lair && VILLAGE_CTX && VILLAGE_CTX.meta) {
    const book = VILLAGE_CTX.meta.lairBook || (VILLAGE_CTX.meta.lairBook = {});
    if (book[lair.id] === undefined) {
      let clear = true; const rec = VILLAGE_CTX.records;
      if (rec && rec.size) for (let cz = (lair.z - 14) >> 4; cz <= (lair.z + 14) >> 4 && clear; cz++) for (let cx = (lair.x - 14) >> 4; cx <= (lair.x + 14) >> 4; cx++) if (rec.has(chunkKey(this.dim, cx, cz))) { clear = false; break; }
      book[lair.id] = clear ? 1 : 0;
    }
    if (!book[lair.id]) lair = null;
  }
  cache.set(key, lair);
  return lair;
};
WorldGen.prototype.lairsNear = function (x, z, pad = 0) {
  const out = [], rx = Math.floor(x / LAIR_REG), rz = Math.floor(z / LAIR_REG);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const l = this.lairAt(rx + dx, rz + dz); if (l && Math.abs(l.x - x) <= 14 + pad && Math.abs(l.z - z) <= 14 + pad) out.push(l); }
  return out;
};
WorldGen.prototype.planLair = function (rx, rz) {
  if (this.dim === 3 || this.dim === 4) return null;
  const rnd = mulberry32(lairSeed(this.seed, rx, rz, 7171 + this.dim));
  if (rnd() > (this.dim === 0 ? 0.8 : 0.6)) return null;
  const x = rx * LAIR_REG + 80 + Math.floor(rnd() * (LAIR_REG - 160)), z = rz * LAIR_REG + 80 + Math.floor(rnd() * (LAIR_REG - 160));
  let type = null, y = 0;
  if (this.dim === 0) {
    const c = this.column(x, z);
    if (this.villagesNear && this.villagesNear(x, z, 60).length) return null;
    if (this.dungeonsNear && this.dungeonsNear(x, z, 30).length) return null;
    // the Tide Dragon sleeps on the floor of the open sea
    if (c.biome === BIOME.OCEAN && c.h <= SEA - 9) {
      if (rnd() > 0.3) return null;   // the open sea is wide; its dragons are few
      let sum = c.h, n = 1;
      for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; sum += Math.min(SEA - 4, this.column(Math.round(x + Math.cos(a) * 9), Math.round(z + Math.sin(a) * 9)).h); n++; }
      return { id: 'L' + this.dim + '_' + rx + '_' + rz, dim: this.dim, x, y: Math.min(SEA - 8, Math.round(sum / n)), z, type: 'tide', seed: lairSeed(this.seed, rx, rz, 7172) };
    }
    if (c.h <= SEA + 1) return null;
    if ((c.biome === BIOME.FOREST || c.biome === BIOME.PLAINS) && c.humid > 0.38 && c.h <= SEA + 5) type = 'bog';
    else if (c.biome === BIOME.FOREST || (c.biome === BIOME.PLAINS && c.humid > 0)) type = 'verdant';
    else if (c.biome === BIOME.DESERT) type = 'sand';
    else if ((c.biome === BIOME.MOUNTAINS || c.biome === BIOME.TAIGA) && c.temp < -0.15) type = 'frost';
    if (!type) return null;
    // the nest sits at the lie of the land around it, not in a pit or on a post
    let sum = c.h, n = 1;
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, h = this.column(Math.round(x + Math.cos(a) * 9), Math.round(z + Math.sin(a) * 9)).h; sum += h; n++; }
    y = Math.max(SEA + 2, Math.round(sum / n));
  } else if (this.dim === DIM.DEPTHS) { type = 'ember'; y = 44; }
  else if (this.dim === DIM.SKYLANDS) {
    // on top of an island big enough to hold it
    const mask = this.nCont.fbm2(x / 180, z / 180, 3);
    if (mask < 0.2) return null;
    type = 'storm'; y = 70 + Math.floor(this.nHill.fbm2(x / 60, z / 60, 3) * 10);
  } else return null;
  return { id: 'L' + this.dim + '_' + rx + '_' + rz, dim: this.dim, x, y, z, type, seed: lairSeed(this.seed, rx, rz, 7172) };
};
WorldGen.prototype.buildLair = function (ch, L) {
  const bx = ch.cx * 16, bz = ch.cz * 16;
  const inC = (x, z) => x >= bx && x < bx + 16 && z >= bz && z < bz + 16;
  const put = (x, y, z, key, meta = 0) => { if (!inC(x, z) || y < 1 || y >= CH) return -1; const id = key ? B[key] : 0; if (id === undefined) return -1; const i = cidx(x - bx, y, z - bz); ch.blocks[i] = id; ch.meta[i] = meta; ch.blockEntities.delete(i); return i; };
  const hf = (x, z, s) => hashFloat(x, z, L.seed, s);
  const deep = L.dim === DIM.DEPTHS, sky = L.dim === DIM.SKYLANDS, sea = L.type === 'tide';
  const above = (y) => sea && y <= SEA ? 'water' : 0;   // what fills the space over the nest
  const rock = sea ? ['prismarine', 'dark_prismarine', 'prismarine_bricks', 'prismarine'] : deep ? ['blackstone', 'basalt', 'blackstone', 'magma_block'] : sky ? ['skystone', 'skystone', 'cobblestone'] : L.type === 'sand' ? ['sandstone', 'cut_sandstone', 'sandstone'] : L.type === 'frost' ? ['packed_ice', 'stone', 'snow_block'] : ['mossy_cobblestone', 'cobblestone', 'stone'];
  const floor = sea ? ['sand', 'gravel', 'sand', 'prismarine'] : deep ? ['blackstone', 'magma_block', 'basalt'] : sky ? ['sky_grass', 'coarse_dirt', 'gravel'] : L.type === 'sand' ? ['sand', 'coarse_dirt', 'gravel'] : L.type === 'frost' ? ['snow_block', 'gravel', 'coarse_dirt'] : L.type === 'bog' ? ['mud', 'coarse_dirt', 'gravel'] : ['coarse_dirt', 'gravel', 'podzol'];
  const pick = (l, x, z, s) => l[Math.floor(hf(x, z, s) * l.length)];
  for (let dz = -14; dz <= 14; dz++) for (let dx = -14; dx <= 14; dx++) {
    const x = L.x + dx, z = L.z + dz;
    if (!inC(x, z)) continue;
    const d = Math.hypot(dx, dz);
    if (d > 13.5) continue;
    if (deep) {
      // a great round cavern carved in the rock, lava glowing in cracks of the floor
      for (let y = L.y - 3; y <= L.y + 16; y++) { const ry = (y - L.y - 5) / 11; if (dx * dx / 169 + dz * dz / 169 + ry * ry < 1) put(x, y, z, 0); }
      if (d < 12.5) { put(x, L.y, z, pick(floor, x, z, 1)); for (let y = L.y - 1; y > L.y - 4; y--) put(x, y, z, 'blackstone'); if (hf(x, z, 9) < 0.04 && d > 4) put(x, L.y, z, 'lava'); }
    } else {
      const h = sky ? L.y : this.column(x, z).h;
      if (d < 10.5) {
        // the floor of the nest: level, hard-packed, bones and plunder in it
        put(x, L.y, z, pick(floor, x, z, 1));
        for (let y = L.y - 1; y > L.y - 6 && y > 1; y--) put(x, y, z, sky ? 'skystone' : pick(rock, x, z, y));
        for (let y = L.y + 1; y <= L.y + 16; y++) put(x, y, z, above(y));
      } else {
        // a ring of great boulders
        const top = Math.max(h, L.y) + Math.floor(hf(x, z, 3) * 5) + (hf(x, z, 4) < 0.5 ? 1 : 0);
        for (let y = Math.min(h, L.y) - 2; y <= top; y++) put(x, y, z, pick(rock, x, z, y + 7));
        for (let y = top + 1; y <= L.y + 16; y++) put(x, y, z, above(y));
      }
    }
    if (d < 10.5) {
      const q = hf(x, z, 5);
      if (q < 0.05) put(x, L.y + 1, z, 'bone_block');
      else if (q < 0.056 && d > 3) put(x, L.y + 1, z, 'gold_block');
      else if (q < 0.059 && d > 3) put(x, L.y + 1, z, 'emerald_block');
      else if (q < 0.075 && d > 3) put(x, L.y + 1, z, sea ? 'sea_lantern' : deep ? 'magma_block' : L.type === 'frost' ? 'packed_ice' : 'gravel');
      else if (sea && q < 0.2 && d > 2) { const cor = ['tube', 'brain', 'bubble', 'fire', 'horn'][Math.floor(hf(x, z, 6) * 5)]; put(x, L.y + 1, z, hf(x, z, 7) < 0.4 ? cor + '_coral_block' : q < 0.15 ? cor + '_coral' : 'seagrass', 0); }
    }
  }
  // the nest itself, the egg on it, and a chest of plunder
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) put(L.x + dx, L.y + 1, L.z + dz, sea ? 'dark_prismarine' : deep ? 'magma_block' : L.type === 'frost' ? 'snow_block' : 'hay_bale');
  put(L.x, L.y + 2, L.z, 'dragon_egg_' + L.type);
  const ci = put(L.x + 4, L.y + 1, L.z - 3, 'chest', 2);
  if (ci >= 0 && typeof dungeonLoot === 'function') ch.blockEntities.set(ci, { type: 'chest', items: dungeonLoot('rare', mulberry32(L.seed)) });
};
{
  const baseGen = WorldGen.prototype.generate;
  WorldGen.prototype.generate = function (ch) {
    const r = baseGen.call(this, ch);
    if (this.dim <= 2) {
      try { for (const L of this.lairsNear(ch.cx * 16 + 8, ch.cz * 16 + 8, 10)) this.buildLair(ch, L); } catch (e) { console.warn('lair', e); }
      ch.recomputeMaxY();
    }
    return r;
  };
  const baseTrees = WorldGen.prototype.treesForChunk;
  WorldGen.prototype.treesForChunk = function (cx, cz) {
    const list = baseTrees.call(this, cx, cz);
    if (list._l || this.dim !== 0) return list;
    const out = list.filter(t => !this.lairsNear(t.x, t.z, 2).length);
    out._l = true; out._v = list._v; out._d = list._d;
    const key = cx + ',' + cz; if (this.colCache.get(key) === list) this.colCache.set(key, out);
    return out;
  };
}

// ---- the dragon awake (host) ----------------------------------------------------------------------------------------
const DRAG = { tickT: 0 };
function dragonRec(g, id) { const m = g.meta.dragons || (g.meta.dragons = {}); return m[id] || (m[id] = {}); }
function dragonTick(g, dt) {
  if (g.isGuest || !g.world || !g.world.gen.lairsNear || g.dim > 2) return;
  if ((DRAG.tickT -= dt) > 0) return;
  DRAG.tickT = 1.5;
  for (const p of g.pawns()) {
    if (p.dead) continue;
    for (const L of g.world.gen.lairsNear(p.x, p.z, 50)) {
      const rec = dragonRec(g, L.id);
      if (rec.slain || g.entities.some(e => e.lair === L.id && e.alive)) continue;
      const ch = g.world.chunkAt(L.x >> 4, L.z >> 4);
      if (!ch || !ch.mesh) continue;
      const e = g.addEntity(new Mob(g, L.type + '_dragon', L.x + 0.5, L.y + 2.1, L.z + 0.5));
      e.lair = L.id; e.home = [L.x + 0.5, L.y + 2, L.z + 0.5]; e.dstate = 'sleep'; e.yaw = Math.random() * TAU;
    }
  }
}
function dragonFace(e, tx, tz, dt, k = 3) { e.yaw = turnTo(e.yaw, Math.atan2(-(tx - e.x), -(tz - e.z)), dt * k); }
// where its mouth is: from the drawn pose of its head when there is one, else a good guess
function dragonMouth(e) {
  const M = e._mats && e._mats.head;
  if (M && e._M && e._M.def.rig === 'dragon') {
    const x = 0, y = -1 / 16, z = -13 / 16;
    return [e.x + M[0] * x + M[4] * y + M[8] * z + M[12], e.y + M[1] * x + M[5] * y + M[9] * z + M[13], e.z + M[2] * x + M[6] * y + M[10] * z + M[14]];
  }
  const s = MODELS[e.T.model] ? MODELS[e.T.model].def.scale : 2.3, f = 28 * s / 16;
  return [e.x - Math.sin(e.yaw) * f, e.y + e.h * 0.8, e.z - Math.cos(e.yaw) * f];
}
function dragonBreath(e, target, dt) {
  const g = e.game, D = DRAGON_TYPES[e.T.dragon], [mx, my, mz] = dragonMouth(e);
  const tx = target.x - mx, ty = (target.y + 1) - my, tz = target.z - mz, l = Math.hypot(tx, ty, tz) || 1;
  const ux = tx / l, uy = ty / l, uz = tz / l;
  // a roaring stream: its own colour at the heart, billowing out as it goes
  const n = Math.min(14, Math.ceil(dt * 200)), tiles = DRAGON_BREATH_FX[D.breath];
  for (let i = 0; i < n; i++) {
    const sp = 11 + Math.random() * 6, j = 0.22, jx = (Math.random() - 0.5) * j, jy = (Math.random() - 0.5) * j, jz = (Math.random() - 0.5) * j, f = Math.random() * 0.6;
    spellSpark(g, mx + ux * f, my + uy * f, mz + uz * f, tiles[i % tiles.length], { vx: (ux + jx) * sp, vy: (uy + jy) * sp, vz: (uz + jz) * sp, life: 0.55 + Math.random() * 0.3, size: 0.12 + Math.random() * 0.1, grow: 3.2 });
  }
  if (Math.random() < dt * 20) spellSpark(g, mx, my, mz, D.breath === 'frost' ? 'cloud_puff' : 'smoke', { vx: ux * 6, vy: uy * 6 + 1, vz: uz * 6, life: 1.2, size: 0.3, grow: 2 });
  if (D.breath === 'lightning' && Math.random() < dt * 8) {
    // forks of lightning crackling through it
    let x = mx, y = my, z = mz;
    for (let k = 0; k < 14; k++) { x += ux * 0.7 + (Math.random() - 0.5) * 0.6; y += uy * 0.7 + (Math.random() - 0.5) * 0.6; z += uz * 0.7 + (Math.random() - 0.5) * 0.6; spellSpark(g, x, y, z, 'mana_light', { life: 0.15, size: 0.12 }); }
  }
  if (e.ghost) return;                       // on a guest's screen it's only the look of it
  e.breathHitT = (e.breathHitT || 0) - dt;
  if (e.breathHitT > 0) return;
  e.breathHitT = 0.45;
  for (const p of g.pawns()) {
    if (p.dead) continue;
    const px = p.x - mx, py = p.y + 1 - my, pz = p.z - mz, d = Math.hypot(px, py, pz);
    if (d > 12 || (px * ux + py * uy + pz * uz) / (d || 1) < 0.86) continue;
    p.hurt(D.breath === 'lightning' ? 4 : 3, { type: 'magic', attacker: e, element: D.breath === 'frost' ? 'frost' : D.breath === 'fire' ? 'fire' : undefined, knock: 1 });
    const P = p.player;
    if (!P) continue;
    if (D.breath === 'fire' && p.ignite) p.ignite(3);
    else if (D.breath === 'poison') P.poison = Math.max(P.poison || 0, 5);
    else if (D.breath === 'frost') { P.chill = Math.max(P.chill || 0, 4); P.slow = Math.max(P.slow || 0, 3); }
    else if (D.breath === 'water') { P.burn = 0; P.slow = Math.max(P.slow || 0, 2); P.vx += ux * 9; P.vz += uz * 9; P.vy = Math.max(P.vy, 3); }
  }
}
// a dragon in the air crashes through the treetops rather than getting caught in them
function dragonUnstick(e, dt) {
  if (e.noGrav && (e.hitWall || e.hitCeiling)) e.stuckT = (e.stuckT || 0) + dt; else e.stuckT = Math.max(0, (e.stuckT || 0) - dt);
  if (e.stuckT < 0.2) return;
  const w = e.game.world, g = e.game;
  let n = 0;
  for (let y = Math.floor(e.y); y <= Math.floor(e.y + e.h + 1); y++) for (let z = Math.floor(e.z - e.w - 1); z <= Math.floor(e.z + e.w + 1); z++) for (let x = Math.floor(e.x - e.w - 1); x <= Math.floor(e.x + e.w + 1); x++) {
    const id = w.getBlock(x, y, z), d = BLOCKS[id];
    if (d && (d.isLeaves || (!T_SOLID[id] && id && !T_LIQUID[id] && T_REPLACEABLE[id]))) { w.setBlock(x, y, z, 0, 0); if (n++ < 6) g.burst(x + 0.5, y + 0.5, z + 0.5, d.key, 4, 2); }
  }
  // still wedged: up and out
  if (e.stuckT > 2 && !collides(w, e.x - e.w, e.y + 1.5, e.z - e.w, e.x + e.w, e.y + 1.5 + e.h, e.z + e.w)) { e.y += 1.5; e.stuckT = 0.5; }
  else if (e.stuckT > 4 && e.home) { e.x = e.home[0]; e.y = e.home[1] + 6; e.z = e.home[2]; e.stuckT = 0; }
}
for (const t of Object.keys(DRAGON_TYPES)) MONSTER_AI[t + '_dragon'] = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, T = this.T;
  if (this.hoverT > 0) this.hoverT -= dt;
  dragonUnstick(this, dt);
  if (!p) { this.noGrav = false; return { want: 0, dir: this.yaw }; }
  const P = p.player || p;
  switch (this.dstate) {
    case 'sleep': {
      this.noGrav = false;
      if (Math.random() < dt * 0.4) { const [mx, my, mz] = dragonMouth(this); g.burst(mx, my - 1.2, mz, DRAGON_TYPES[this.T.dragon].breath === 'fire' ? 'flame' : 'smoke', 3, 0.25, -1); }
      if ((dist < 22 && !(P.sneaking && dist > 10)) || this.hurtTime > 0) {
        this.dstate = 'takeoff'; this.stT = 1.6; this.noGrav = true; this.flyVy = 7;
        g.sfx.playAt('dragon_roar', this.x, this.y + 2, this.z, 90);
        for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 60) l.toast(`${T.label[0].toUpperCase() + T.label.slice(1)} wakes!`, 'warn');
      }
      return { want: 0, dir: this.yaw };
    }
    case 'takeoff': {
      this.stT -= dt; this.flyVy = 7;
      if (this.stT <= 0) { this.dstate = 'circle'; this.stT = 4 + Math.random() * 3; this.orbit = Math.random() * TAU; }
      return { want: 2, dir: this.yaw };
    }
    case 'circle': {
      this.noGrav = true; this.stT -= dt;
      this.orbit = (this.orbit || 0) + dt * 0.45;
      const gx = P.x + Math.cos(this.orbit) * 16, gz = P.z + Math.sin(this.orbit) * 16, alt = P.y + 12 + Math.sin(this.age * 0.7) * 2;
      this.flyVy = clamp((alt - this.y) * 1.2, -6, 6);
      if ((this.flapT = (this.flapT || 0) - dt) <= 0) { this.flapT = 0.75; g.sfx.playAt('dragon_flap', this.x, this.y + 2, this.z, 40); }
      if (this.stT <= 0) {
        const r = Math.random(), low = this.health < this.maxHealth * 0.7;
        this.dstate = r < 0.45 ? 'breath' : r < 0.8 || !low ? 'dive' : 'land'; this.stT = this.dstate === 'land' ? 9 : 6;
        if (this.dstate === 'breath') { this.breathPt = null; }
      }
      return { want: T.speed * 2.2, dir: Math.atan2(-(gx - this.x), -(gz - this.z)) };
    }
    case 'breath': {
      this.noGrav = true; this.stT -= dt;
      if (!this.breathPt) { const a = Math.atan2(this.z - P.z, this.x - P.x); this.breathPt = [P.x + Math.cos(a) * 9, P.y + 6, P.z + Math.sin(a) * 9]; }
      const [bx, by, bz] = this.breathPt, d = Math.hypot(bx - this.x, bz - this.z);
      this.flyVy = clamp((by - this.y) * 1.5, -6, 6);
      if (d > 2.5 && !(this.breathT > 0)) return { want: T.speed * 2, dir: Math.atan2(-(bx - this.x), -(bz - this.z)) };
      dragonFace(this, P.x, P.z, dt, 4); this.hoverT = 0.5;
      if (!(this.breathT > 0) && !this.breathed) { this.breathT = 2.4; this.breathed = true; g.sfx.playAt('dragon_breath', this.x, this.y + 2, this.z, 50); }
      if (this.breathT > 0) { this.breathT -= dt; dragonBreath(this, P, dt); }
      else { this.breathed = false; this.dstate = 'circle'; this.stT = 4 + Math.random() * 3; }
      if (this.stT <= -4) { this.breathT = 0; this.breathed = false; this.dstate = 'circle'; this.stT = 3; }
      return { want: 0, dir: this.yaw };
    }
    case 'dive': {
      this.noGrav = true; this.stT -= dt;
      const d3 = Math.hypot(P.x - this.x, P.y + 1 - this.y, P.z - this.z);
      this.flyVy = clamp((P.y + 0.6 - this.y) * 2.5, -11, 8);
      if (d3 < 3 + this.w && this.attackCd <= 0) {
        this.attackCd = 1.2; this.swingT = 0.3;
        p.hurt(T.damage, { type: 'mob', attacker: this, knock: 6 });
        g.sfx.playAt('dragon_bite', this.x, this.y + 1, this.z);
        this.dstate = 'climb'; this.stT = 1.6;
      }
      if (this.stT <= 0) { this.dstate = 'climb'; this.stT = 1.4; }
      return { want: T.speed * 3, dir: toPlayer };
    }
    case 'climb': {
      this.stT -= dt; this.flyVy = 8;
      if (this.stT <= 0) { this.dstate = 'circle'; this.stT = 4 + Math.random() * 3; }
      return { want: T.speed * 2, dir: this.yaw };
    }
    case 'land': {
      this.stT -= dt;
      if (!this.onGround) { this.noGrav = true; this.flyVy = -5; return { want: dist > 6 ? T.speed * 1.5 : 0, dir: toPlayer }; }
      this.noGrav = false;
      if (dist < 3.2 + this.w && Math.abs(dyp) < 3 && this.attackCd <= 0) {
        this.attackCd = 1.4; this.swingT = 0.3;
        p.hurt(T.damage, { type: 'mob', attacker: this, knock: 5 }); g.sfx.playAt('dragon_bite', this.x, this.y + 1, this.z);
      }
      if (this.stT <= 0) { this.dstate = 'takeoff'; this.stT = 1.4; this.noGrav = true; g.sfx.playAt('dragon_roar', this.x, this.y + 2, this.z, 70); }
      return { want: dist < 3 ? 0 : T.speed, dir: (dist > 4 ? this.navDir(P.x, P.y, P.z, dt) : null) ?? toPlayer };
    }
  }
  this.dstate = 'circle'; this.stT = 3;
  return { want: 0, dir: this.yaw };
};
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { dragonTick(this, dt); eggTick(this, dt); } catch (err) { console.warn('dragon', err); } return baseUpd.call(this, dt); };
  // slain: its lair is quiet for good
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const r = baseDie.call(this, src);
    const g = this.game;
    if (this.lair && !g.isGuest) {
      dragonRec(g, this.lair).slain = 1;
      for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 80) { l.toast(`${this.T.label[0].toUpperCase() + this.T.label.slice(1)} is slain! Its egg lies in the nest.`, 'epic'); l.grantXP(250, this.x, this.y + 2, this.z); }
      this.noGrav = false;
    }
    return r;
  };
  // a dragon struck from the ground wakes up
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const r = baseHurt.call(this, amount, src);
    if (this.T.dragon && this.dstate === 'sleep' && r > 0) this.hurtTime = 0.35;
    return r;
  };
}

// ---- what a guest's game needs to draw it right ------------------------------------------------------------------------------------
{
  const DST = ['sleep', 'takeoff', 'circle', 'breath', 'dive', 'climb', 'land'];
  const baseSnap = Mob.prototype.snap;
  Mob.prototype.snap = function () { const s = baseSnap.call(this); if (this.T.dragon) s.dg = [this.noGrav ? 1 : 0, Math.max(0, DST.indexOf(this.dstate)), this.breathT > 0 ? 1 : 0, this.hoverT > 0 ? 1 : 0]; return s; };
  const baseApply = Mob.prototype.applySnap;
  Mob.prototype.applySnap = function (o) { baseApply.call(this, o); if (o.dg) { this.noGrav = !!o.dg[0]; this.dstate = DST[o.dg[1]]; this.breathT = o.dg[2] ? 0.3 : 0; this.hoverT = o.dg[3] ? 0.3 : 0; this.onGround = !this.noGrav; } };
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    const r = baseUpd.call(this, dt);
    if (this.ghost && this.T.dragon && this.breathT > 0) { const g = this.game, t = g.nearestPawn(this.x, this.y, this.z, 40); if (t) dragonBreath(this, t, dt); }
    return r;
  };
}

// ---- eggs: kept warm, they hatch ----------------------------------------------------------------------------------------------
const EGG_HEAT = new Set(['fire', 'soul_fire', 'lava', 'campfire', 'soul_campfire', 'magma_block', 'lit_furnace', 'lit_smoker', 'lit_blast_furnace'].map(k => B[k]).filter(v => v !== undefined));
const EGG_TIME = 300;
function eggTick(g, dt) {
  if (g.isGuest || !g.meta) return;
  const eggs = g.meta.eggs || (g.meta.eggs = []);
  if (!eggs.length) return;
  g._eggT = (g._eggT || 0) - dt;
  if (g._eggT > 0) return;
  g._eggT = 1;
  const w = g.world;
  for (const e of eggs.slice()) {
    if (e.dim !== g.dim || !w.isLoaded(e.x, e.z)) continue;
    const id = w.getBlock(e.x, e.y, e.z), b = BLOCKS[id];
    if (!b || !b.dragonEgg) { eggs.splice(eggs.indexOf(e), 1); continue; }
    // a sea dragon's egg wants the sea; the rest want warmth
    const sea = b.dragonEgg === 'tide';
    let warm = false;
    for (let dy = -1; dy <= 1 && !warm; dy++) for (let dz = -2; dz <= 2 && !warm; dz++) for (let dx = -2; dx <= 2; dx++) { const id = w.getBlock(e.x + dx, e.y + dy, e.z + dz); if (sea ? T_LIQUID[id] === 1 : EGG_HEAT.has(id)) { warm = true; break; } }
    if (!warm) { if (!e.coldSaid) { e.coldSaid = 1; const o = g.locals.find(l => Math.hypot(l.player.x - e.x, l.player.z - e.z) < 10); if (o) o.toast(sea ? 'The egg is drying out. Set it in or beside water' : 'The egg is cold. Set it near a fire, lava or a campfire to keep it warm', ''); } continue; }
    e.t = (e.t || 0) + 1;
    if (e.t === 1) { const o = g.locals.find(l => Math.hypot(l.player.x - e.x, l.player.z - e.z) < 12); if (o) o.toast(sea ? 'The egg glistens in the water. It stirs…' : 'The egg is warming. It stirs…', 'good'); }
    if (Math.random() < 0.15 + e.t / EGG_TIME * 0.5) { g.sfx.playAt('egg_crack', e.x + 0.5, e.y + 0.5, e.z + 0.5); g.burst(e.x + 0.5, e.y + 0.7, e.z + 0.5, 'smoke', 3, 0.3); }
    if (e.t >= EGG_TIME) {
      eggs.splice(eggs.indexOf(e), 1);
      w.setBlock(e.x, e.y, e.z, 0, 0);
      const m = g.addEntity(new Mob(g, b.dragonEgg + '_drake', e.x + 0.5, e.y, e.z + 0.5));
      m.makeBaby(); m.growT = 1200;
      const owner = g.pawns().find(q => q.name === e.owner) || g.pawns().sort((a, c) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(c.x - e.x, c.z - e.z))[0];
      if (owner) { m.owner = owner.name; m.tamed = true; m.kept = true; if (typeof companionRegister === 'function' && owner instanceof LocalPlayer) companionRegister(owner, m); }
      for (let i = 0; i < 30; i++) spellSpark(g, e.x + 0.5, e.y + 0.6, e.z + 0.5, DRAGON_TYPES[b.dragonEgg].fx, { vx: (Math.random() - 0.5) * 3, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 3, life: 0.9, size: 0.08 });
      g.sfx.playAt('dragon_roar', e.x, e.y + 1, e.z, 20);
      for (const l of g.locals) if (Math.hypot(l.player.x - e.x, l.player.z - e.z) < 30) l.toast(`A ${DRAGON_TYPES[b.dragonEgg].name.toLowerCase()} drake has hatched${owner ? ' — it\'s ' + (owner === l ? 'yours' : owner.name + '\'s') : ''}! Feed it meat to help it grow.`, 'epic');
    }
  }
}
{
  // setting an egg down
  const baseChanged = Game.prototype.onBlockChanged;
  Game.prototype.onBlockChanged = function (x, y, z, o, n, opts) {
    const r = baseChanged.call(this, x, y, z, o, n, opts);
    if (!this.isGuest && this.meta) {
      const nb = BLOCKS[n];
      if (nb && nb.dragonEgg && o !== n) {
        const eggs = this.meta.eggs || (this.meta.eggs = []);
        if (!eggs.some(e => e.x === x && e.y === y && e.z === z && e.dim === this.dim)) {
          const near = this.pawns().sort((a, c) => Math.hypot(a.x - x, a.z - z) - Math.hypot(c.x - x, c.z - z))[0];
          eggs.push({ x, y, z, dim: this.dim, t: 0, owner: near ? near.name : null });
        }
      }
    }
    return r;
  };
}

// ---- drakes: growing up, and flying them ----------------------------------------------------------------------------------------
{
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (this.T.drake && this.baby && !this.ghost) { this.growT -= dt; if (this.growT <= 0) { this.grow(); const o = this.ownerPawn && this.ownerPawn(); if (o && o.toast) o.toast(`Your ${this.petName || 'drake'} is fully grown! Put a saddle on it to fly`, 'epic'); } }
    return baseUpd.call(this, dt);
  };
  // feeding a young one makes it grow faster
  const basePetUse = LocalPlayer.prototype.petUse;
  LocalPlayer.prototype.petUse = function (e, held) {
    if (e.T.drake && e.baby && e.isPetOf(this) && held && tameFoods(e.type).includes(held.id)) {
      e.growT = Math.max(0, e.growT - 150); if (!this.g.creative) { held.n--; if (held.n <= 0) this.player.inv.held = null; }
      this.g.sfx.play('eat'); hearts(this.g, e.x, e.y + e.h, e.z, 3); this.swingArm();
      this.toast(e.growT > 0 ? `It grows! (${Math.ceil(e.growT / 60)} min to go)` : 'It\'s nearly grown!', 'good');
      return true;
    }
    return basePetUse.call(this, e, held);
  };
  // in the saddle: forward goes where you look, jump to climb
  const baseRide = Mob.prototype.rideAI;
  Mob.prototype.rideAI = function (dt) {
    if (!this.T.flyingMount) return baseRide.call(this, dt);
    const r = this.riddenBy;
    if (!r || r.riding !== this || r.dead) { this.riddenBy = null; this.noGrav = false; return null; }
    const p = r.player, inp = r.boatInput || {};
    this.stay = false; this.sitting = false;
    const f = -(inp.mz || 0), s = inp.mx || 0;
    if (inp.jump && !this.noGrav) { this.noGrav = true; this.flyVy = 6; this.game.sfx.playAt('dragon_flap', this.x, this.y + 1, this.z); }
    const air = this.noGrav;
    const sp = air ? (inp.sprint ? 17 : 11) : (inp.sprint ? 8 : 5.5);
    if (air) {
      const climb = f > 0.1 ? Math.sin(p.pitch) * sp * f : 0;
      this.flyVy = clamp(climb + (inp.jump ? 6 : 0) - (r._descend ? 9 : 0), -14, 10);
      if (this.onGround && climb <= 0.5 && !inp.jump) this.noGrav = false;
      if ((this.flapT = (this.flapT || 0) - dt) <= 0) { this.flapT = 0.8; this.game.sfx.playAt('dragon_flap', this.x, this.y + 1, this.z, 24); }
    }
    const vx = -Math.sin(p.yaw) * f + Math.cos(p.yaw) * s, vz = -Math.cos(p.yaw) * f - Math.sin(p.yaw) * s, m = Math.hypot(vx, vz);
    if (m < 0.1) return { want: 0, dir: this.yaw };
    return { want: sp * Math.min(1, m), dir: Math.atan2(-vx, -vz) };
  };
  // off a flying mount (it lands first: in the air, sneak flies it down instead)
  const baseDis = Mob.prototype.dismount;
  Mob.prototype.dismount = function (lp) {
    const r = baseDis.call(this, lp);
    if (this.T.flyingMount) this.noGrav = false;
    return r;
  };
  const baseLPU = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const m = this.riding, air = m instanceof Mob && m.T.flyingMount && m.noGrav && !m.onGround;
    this._descend = !!(air && inp && inp.sneak);
    if (this._descend) { inp.sneak = false; this._sneakWas = true; }
    return baseLPU.call(this, dt, inp);
  };
  const baseMount = Mob.prototype.mount;
  Mob.prototype.mount = function (lp) {
    const r = baseMount.call(this, lp);
    if (this.T.flyingMount && this.riddenBy === lp) lp.toast('WASD · jump to take off and climb · look up or down to fly that way · sprint to race · sneak to fly down, and to get off once landed', '');
    return r;
  };
}
// ---- crossing between worlds with your mount ----------------------------------------------------------------------------------------
// The creature you're riding goes with you: taken out of the world you leave, set down under you in the next.
function takeMounts(g) {
  const carried = [];
  for (const l of g.locals) {
    const m = l.riding;
    if (!(m instanceof Mob) || !m.alive) continue;
    carried.push({ l, type: m.type, health: m.health, owner: m.owner, petName: m.petName, saddled: m.saddled, uid: m.uid, sgen: m.sgen, baby: m.baby, growT: m.growT, flying: m.noGrav, vx: m.vx, vy: m.vy, vz: m.vz, yaw: m.yaw, variant: m.variant, color: m.color });
    m.riddenBy = null; l.riding = null; m.remove = true;
    g.entities = g.entities.filter(e => e !== m);
  }
  return carried;
}
function restoreMounts(g, carried, keepSpeed) {
  for (const c of carried) {
    const l = c.l, p = l.player;
    const m = new Mob(g, c.type, p.x, p.y, p.z);
    Object.assign(m, { health: c.health, owner: c.owner, petName: c.petName, saddled: c.saddled, uid: c.uid, sgen: c.sgen, tamed: !!c.owner, kept: !!c.owner, yaw: c.yaw, color: c.color });
    if (c.variant && MODELS[c.variant]) m.variant = c.variant;
    if (c.baby) { m.makeBaby(); m.growT = c.growT; }
    const d = MODELS[m.variant || m.T.model], seat = (d && d.def.seatY) || m.h * 0.7;
    m.y = p.y - seat + 0.28;
    if (keepSpeed) { m.vx = c.vx; m.vy = c.vy; m.vz = c.vz; }
    if (c.flying) { m.noGrav = true; m.flyVy = keepSpeed ? c.vy : 0; }
    g.addEntity(m);
    m.riddenBy = l; l.riding = m; l.seat = 0;
    p.slowFallT = 0;
  }
}
{
  const baseChange = Game.prototype.changeDimension;
  Game.prototype.changeDimension = async function (to, place) {
    if (this._traveling) return baseChange.call(this, to, place);
    const carried = takeMounts(this);
    const r = await baseChange.call(this, to, place);
    restoreMounts(this, carried, false);
    return r;
  };
}
