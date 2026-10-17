// ---------------------------------------------------------------------------
// game/aether.js — 0.9.0.10: more life in the Skylands.
//
//  · Aerwhales: great gentle whales of the open sky, drifting in long slow
//    curves between the islands (steering round them) and singing to each
//    other. They mean no harm.
//  · Zephyrs: living clouds that hang above you, puff up their cheeks and
//    blow a gust that hurls you back — off the edge, if you're careless.
//    Each one leaves a gust puff: use it for one great leap into the air.
//  · Swets: jelly that hops after you and sticks, slowing you. The golden
//    ones keep to themselves unless you start it.
//  · Aechor plants: rooted on the sky grass, turning to watch you, spitting
//    poison thorns at anyone who comes too close. Their petals are sweet
//    (moas love them).
// ---------------------------------------------------------------------------

// ---- the models ------------------------------------------------------------------------------------------------
{
  const D = MODEL_DEFS;
  D.aerwhale = finishRig('aerwhale', [
    rpart('body', null, [0, 10, 0], [-8, -7, -12, 8, 7, 12], { all: 'aerwhale_skin', bottom: 'aerwhale_belly' }),
    rpart('head', 'body', [0, 0, -12], [-7, -6, -9, 7, 6, 0], { all: 'aerwhale_skin', bottom: 'aerwhale_belly', front: 'aerwhale_face' }, { limb: 'head' }),
    rpart('hump', 'body', [0, 7, -2], [-4, 0, -6, 4, 2, 7], 'aerwhale_skin'),
    rpart('tail1', 'body', [0, 1, 12], [-5, -4, 0, 5, 4, 9], { all: 'aerwhale_skin', bottom: 'aerwhale_belly' }),
    rpart('tail2', 'tail1', [0, 0, 9], [-3, -2.5, 0, 3, 2.5, 7], 'aerwhale_skin'),
    rpart('fluke', 'tail2', [0, 0, 6], [-9, -0.6, -1, 9, 0.6, 6], 'aerwhale_fin', { noCull: true }),
    rpart('finR', 'body', [8, -3, -5], [0, -0.6, -2, 9, 0.6, 4], 'aerwhale_fin', { noCull: true }),
    rpart('finL', 'body', [-8, -3, -5], [-9, -0.6, -2, 0, 0.6, 4], 'aerwhale_fin', { noCull: true }),
  ], { hipY: 10, height: 20, scale: 2.6 });
  const puff = (n, par, at, box, extra) => rpart(n, par, at, box, 'zephyr_puff', Object.assign({ noCull: true }, extra || {}));
  D.zephyr = finishRig('zephyr', [
    rpart('core', null, [0, 12, 0], [-7, -6, -7, 7, 6, 7], { all: 'zephyr_puff', front: 'zephyr_face' }, { limb: 'head' }),
    puff('pTop', 'core', [0, 5, 1], [-5, 0, -5, 5, 5, 5]),
    puff('pTop2', 'core', [3, 8, 3], [-2.5, 0, -2.5, 2.5, 3, 2.5]),
    puff('pR', 'core', [7, 0, 1], [0, -4, -4, 5, 4, 4]),
    puff('pL', 'core', [-7, 0, 1], [-5, -4, -4, 0, 4, 4]),
    puff('pBack', 'core', [0, 0, 7], [-5, -4, 0, 5, 3, 5]),
    puff('pLow', 'core', [0, -6, 0], [-5, -3, -5, 5, 0, 5]),
    puff('cheekR', 'core', [4, -2, -6], [0, -3, -3, 4, 3, 2], { only: 'charging' }),
    puff('cheekL', 'core', [-4, -2, -6], [-4, -3, -3, 0, 3, 2], { only: 'charging' }),
  ], { hipY: 12, height: 22 });
  for (const k of ['swet', 'golden_swet']) D[k] = finishRig('slime', [
    rpart('cube', null, [0, 0, 0], [-8, 0, -8, 8, 16, 8], k + '_gel', { role: 'cube', alpha: 0.82, noCull: true }),
    rpart('core', 'cube', [0, 0, 0], [-4.5, 3, -4.5, 4.5, 12, 4.5], { all: k + '_core', front: k + '_face' }),
  ]);
  const leaves = [0, 1, 2, 3, 4].map(i => rpart('leaf' + i, null, [0, 0.6, 0], [0, -0.4, -2.5, 9, 0.4, 2.5], 'aechor_leaf', { noCull: true, rest: [0, i / 5 * TAU, 0.18] }));
  D.aechor_plant = finishRig('aechor', [
    ...leaves,
    rpart('stem', null, [0, 0, 0], [-1.5, 0, -1.5, 1.5, 9, 1.5], 'aechor_stem'),
    rpart('head', 'stem', [0, 9, 0], [-4, 0, -4, 4, 7, 4], { all: 'aechor_bulb', front: 'aechor_mouth' }, { limb: 'head' }),
    ...[0, 1, 2, 3].map(i => rpart('pet' + i, 'head', [Math.cos(i / 4 * TAU + 0.78) * 3, 7, Math.sin(i / 4 * TAU + 0.78) * 3], [-1.5, 0, -1.5, 1.5, 4, 1.5], 'aechor_petal_tex', { rest: [Math.sin(i / 4 * TAU + 0.78) * 0.5, 0, -Math.cos(i / 4 * TAU + 0.78) * 0.5] })),
  ], { hipY: 4, height: 16 });
}
RIG_ANIM.aerwhale = function (m, d, P, R) {
  const t = (m.ghost ? (m.game ? m.game.time : 0) : (m.age || 0)) + (m.id || 0) * 1.3;
  const dt = clamp(t - (m._rigT ?? t), 0, 0.1); m._rigT = t;
  const k = m.hurtTime > 0 ? 2.2 : 1, sw = t * 1.1 * k;
  P.tail1 = [Math.sin(sw) * 0.16, 0, 0]; P.tail2 = [Math.sin(sw - 0.8) * 0.28, 0, 0]; P.fluke = [Math.sin(sw - 1.6) * 0.35, 0, 0];
  P.finR = [0, 0.1, 0.2 + Math.sin(t * 0.8) * 0.22]; P.finL = [0, -0.1, -0.2 - Math.sin(t * 0.8) * 0.22];
  P.head = [Math.sin(sw + 0.5) * 0.03, 0, 0];
  const dy = ((m.yaw - (m._rigYaw ?? m.yaw) + Math.PI * 3) % TAU) - Math.PI; m._rigYaw = m.yaw;
  m._bank = (m._bank || 0) + ((dt > 0 ? clamp(dy / dt * 0.8, -0.3, 0.3) : 0) - (m._bank || 0)) * Math.min(1, dt * 2);
  R.roll = m._bank; R.pitch = clamp((m.vy || 0) * 0.1, -0.25, 0.25); R.lift = Math.sin(sw) * 0.06;
};
RIG_ANIM.zephyr = function (m, d, P, R) {
  const t = (m.ghost ? (m.game ? m.game.time : 0) : (m.age || 0)) + (m.id || 0) * 0.9;
  const c = m.charging ? 1 : 0;
  P.pTop = [Math.sin(t * 1.3) * 0.08, 0, Math.sin(t * 1.1) * 0.06]; P.pTop2 = [0, t * 0.4, Math.sin(t * 1.7) * 0.1];
  P.pR = [0, 0, Math.sin(t * 1.5) * 0.12 + c * 0.25]; P.pL = [0, 0, -Math.sin(t * 1.5 + 1) * 0.12 - c * 0.25];
  P.pBack = [Math.sin(t * 1.2) * 0.1, 0, 0]; P.pLow = [0, Math.sin(t * 0.7) * 0.2, 0];
  P.core = [-(m.headPitch || 0) * 0.3 - c * 0.12, 0, 0];
  R.lift = Math.sin(t * 1.6) * 0.08 + c * 0.05;
};
RIG_ANIM.aechor = function (m, d, P, R) {
  const t = (m.ghost ? (m.game ? m.game.time : 0) : (m.age || 0)) + (m.id || 0);
  for (let i = 0; i < 5; i++) P['leaf' + i] = [0, 0, Math.sin(t * 1.2 + i) * 0.05];
  const strike = m.swingT > 0 ? Math.sin(Math.min(1, m.swingT / 0.3) * Math.PI) : 0;
  P.stem = [Math.sin(t * 0.9) * 0.05 - strike * 0.25, 0, Math.sin(t * 0.7) * 0.04];
  P.head = [-(m.headPitch || 0) * 0.7 - strike * 0.3, m.headYawRel || 0, 0];
  for (let i = 0; i < 4; i++) P['pet' + i] = [Math.sin(t * 2 + i) * 0.08, 0, 0];
};

// ---- the creatures ------------------------------------------------------------------------------------------------
defItem('swet_ball', { name: 'Swet Ball', desc: 'Sticky. Works like a slime ball.' });
defItem('aechor_petal', { name: 'Aechor Petal', food: { heal: 3 }, desc: 'Sweet. Moas love them.' });
defItem('gust_puff', { name: 'Gust Puff', rarity: 'rare', drink: 'milk', gustPuff: true, desc: 'Use it for one great leap into the air (and a gentle way down).' });
RECIPES.push({ out: 'slime_ball', n: 1, items: ['swet_ball'] });
Object.assign(MOB_TYPES, {
  aerwhale: { model: 'aerwhale', label: 'an aerwhale', hp: 60, w: 1.4, h: 2.3, speed: 2.2, xp: 8, special: true, flyer: true, noPush: true, knockResist: 0.95, drops: [['leather', 1, 4, 1]] },
  zephyr: { model: 'zephyr', label: 'a zephyr', hp: 20, w: 0.8, h: 1.7, speed: 2.6, xp: 9, hostile: true, special: true, flyer: true, damage: 0, knockResist: 0.3, drops: [['gust_puff', 1, 2, 1]] },
  swet: { model: 'swet', label: 'a swet', hp: 10, w: 0.5, h: 1.0, speed: 2.2, xp: 4, hostile: true, special: true, damage: 2, hopper: true, slimy: true, sound: 'slime', onHit: { slow: 2.5 }, drops: [['swet_ball', 1, 2, 1]] },
  golden_swet: { model: 'golden_swet', label: 'a golden swet', hp: 14, w: 0.5, h: 1.0, speed: 2.4, xp: 6, hostile: true, special: true, damage: 3, hopper: true, slimy: true, sound: 'slime', onHit: { slow: 2.5 }, drops: [['swet_ball', 1, 3, 1], ['gold_nugget', 2, 5, 1]] },
  aechor_plant: { model: 'aechor_plant', label: 'an aechor plant', hp: 16, w: 0.5, h: 1.3, speed: 0, xp: 6, hostile: true, special: true, damage: 0, noPush: true, knockResist: 1, onHit: { poison: 4 }, drops: [['aechor_petal', 1, 2, 1]] },
});
if (MOB_TYPES.moa) { MOB_TYPES.moa.food = (MOB_TYPES.moa.food || []).concat(['aechor_petal']); if (typeof TAME_FOOD !== 'undefined' && TAME_FOOD.moa) TAME_FOOD.moa[0].push('aechor_petal'); }

const SKY_AIR = (w, x, y, z, r) => { for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (w.getBlock(x + dx, y + dy, z + dz)) return false; return true; };
MONSTER_AI.aerwhale = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, w = g.world;
  this.noGrav = true;
  if (this.head === undefined) { this.head = this.yaw; this.cruiseY = this.y; this.turnRate = 0; this.songT = 4 + Math.random() * 10; }
  this.turnT = (this.turnT || 0) - dt;
  if (this.turnT <= 0) { this.turnT = 6 + Math.random() * 10; this.turnRate = (Math.random() - 0.5) * 0.22; this.cruiseY = clamp(this.cruiseY + (Math.random() - 0.5) * 16, 48, CH - 12); }
  // look ahead for islands: bank away and rise over them
  this.scanT = (this.scanT || 0) - dt;
  if (this.scanT <= 0) {
    this.scanT = 0.5;
    const fx = -Math.sin(this.head), fz = -Math.cos(this.head);
    for (const d of [5, 9, 14]) {
      const x = Math.floor(this.x + fx * d), z = Math.floor(this.z + fz * d), y = Math.floor(this.y);
      if (w.getBlock(x, y, z) || w.getBlock(x, y + 2, z) || w.getBlock(x, y - 1, z) || w.getBlock(x, y + 4, z)) {
        this.turnRate = (this.turnRate >= 0 ? 1 : -1) * 0.55; this.turnT = 2.5; this.cruiseY = Math.min(CH - 8, Math.max(this.cruiseY, this.y + 6)); break;
      }
    }
  }
  this.head += this.turnRate * dt;
  // keep out of the cloud bank and off the roof of the sky
  if (this.y < 46) this.cruiseY = Math.max(this.cruiseY, 60);
  this.flyVy = clamp((this.cruiseY - this.y) * 0.4, -1.4, 1.4);
  // they sing to one another
  this.songT -= dt;
  if (this.songT <= 0) { this.songT = 16 + Math.random() * 22; if (dist < 90) g.sfx.playAt('aerwhale', this.x, this.y + 1.5, this.z, 80); }
  return { want: this.T.speed * (this.hurtTime > 0 || this.panicT > 0 ? 2 : 1), dir: this.head };
};
MONSTER_AI.zephyr = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game;
  this.noGrav = true;
  const s = this.senses(p, dist, dyp, dt, 34);
  if (Math.random() < dt * 1.5) spellSpark(g, this.x + (Math.random() - 0.5) * 1.6, this.y + 0.4 + Math.random() * 1.2, this.z + (Math.random() - 0.5) * 1.6, 'gust_ball', { vx: (Math.random() - 0.5) * 0.4, vy: -0.2, vz: (Math.random() - 0.5) * 0.4, life: 1.2, size: 0.18, grow: 1 });
  if (this.chargeT > 0) {
    this.chargeT -= dt; this.charging = true;
    this.flyVy = 0;
    if (this.chargeT <= 0 && p) {
      this.charging = false; this.shootT = 3 + Math.random() * 1.8;
      const ex = this.x - Math.sin(this.yaw) * 0.9, ey = this.y + 0.9, ez = this.z - Math.cos(this.yaw) * 0.9;
      const tx = p.x - ex, ty = p.y + 1 - ey, tz = p.z - ez, l = Math.hypot(tx, ty, tz) || 1, sp = 11;
      g.addEntity(new Projectile(g, ex, ey, ez, tx / l * sp, ty / l * sp, tz / l * sp, 'gust', this));
      g.sfx.playAt('gust', ex, ey, ez, 30);
    }
    return { want: 0, dir: toPlayer };
  }
  this.charging = false;
  if (!s.hunting) { this.flyVy = Math.sin(this.age * 0.7 + this.id) * 0.5; this.wander(dt); return this.wanderMove(); }
  // hang above you and a little off, then puff up and blow
  const wantY = p.y + 3.5 + Math.sin(this.age * 0.5) * 1.5;
  this.flyVy = clamp((wantY - this.y) * 1.2, -2.2, 2.2);
  this.shootT = (this.shootT ?? 2.5) - dt;
  if (this.shootT <= 0 && s.sees && dist < 22) { this.chargeT = 0.9; g.sfx.playAt('zephyr', this.x, this.y + 1, this.z, 30); return { want: 0, dir: toPlayer }; }
  if (dist < 7) return { want: this.T.speed * 0.7, dir: toPlayer + Math.PI };
  if (dist > 14) return { want: this.T.speed, dir: toPlayer };
  return { want: this.T.speed * 0.45, dir: toPlayer + Math.PI / 2 * (Math.sin(this.age * 0.3 + this.id) > 0 ? 1 : -1) };
};
MONSTER_AI.swet = function (dt, p, dist, dyp, toPlayer) {
  if (this.onGround && this.lastWant > 0.1 && Math.random() < dt * 0.5) this.wantJump = true;
  return this.asType('slime', () => MONSTER_AI.__base.call(this, dt, p, dist, dyp, toPlayer));
};
MONSTER_AI.golden_swet = function (dt, p, dist, dyp, toPlayer) {
  if (!(this.angryT > 0)) { if (this.onGround && Math.random() < dt * 0.4) this.wantJump = true; this.wander(dt); return this.wanderMove(); }
  this.angryT -= dt;
  return MONSTER_AI.swet.call(this, dt, p, dist, dyp, toPlayer);
};
MONSTER_AI.aechor_plant = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game;
  const s = this.senses(p, dist, dyp, dt, 14);
  this.shootT = (this.shootT ?? 1.5) - dt;
  if (s.hunting && s.sees && dist < 12 && this.shootT <= 0) {
    this.shootT = 1.8 + Math.random() * 1.2; this.swingT = 0.3;
    const ex = this.x, ey = this.y + 1.05, ez = this.z, tx = p.x - ex, tz = p.z - ez, hd = Math.hypot(tx, tz) || 1, sp = 15, t = hd / sp;
    const vy = ((p.y + 1.1) - ey) / t + 0.5 * 20 * t;
    const a = new Arrow(g, ex + tx / hd * 0.4, ey, ez + tz / hd * 0.4, tx / hd * sp, vy, tz / hd * sp, this, 4, false);
    a.thorn = true;
    g.addEntity(a);
    g.sfx.playAt('bow', ex, ey, ez, 16);
  }
  return { want: 0, dir: s.hunting ? toPlayer : this.yaw };
};
{
  // a golden swet minds its own business until you start it; a rooted plant doesn't budge
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    if (this.type === 'golden_swet' && src.attacker) this.angryT = 30;
    if (this.type === 'aechor_plant') src = Object.assign({}, src, { knock: 0 });
    return baseHurt.call(this, amount, src);
  };
  // a zephyr's puffed cheeks show for everyone
  const baseSnap = Mob.prototype.snap;
  Mob.prototype.snap = function () { const s = baseSnap.call(this); if (this.charging) s.zc = 1; return s; };
  const baseApply = Mob.prototype.applySnap;
  Mob.prototype.applySnap = function (o) { baseApply.call(this, o); this.charging = !!o.zc; };
}
// ---- the gust ----------------------------------------------------------------------------------------------------
{
  const baseUpd = Projectile.prototype.update;
  Projectile.prototype.update = function (dt) {
    if (this.kind !== 'gust') return baseUpd.call(this, dt);
    const g = this.game;
    if (Math.random() < dt * 30) spellSpark(g, this.x + (Math.random() - 0.5) * 0.3, this.y + (Math.random() - 0.5) * 0.3, this.z + (Math.random() - 0.5) * 0.3, 'gust_ball', { vx: -this.vx * 0.05, vy: 0.1, vz: -this.vz * 0.05, life: 0.5, size: 0.14, grow: 1.5 });
    if (this.ghost) { this.ghostStep(dt); return; }
    this.age += dt;
    if (this.age > 4) { this.burst(); return; }
    for (let s = 0; s < 3; s++) {
      this.x += this.vx * dt / 3; this.y += this.vy * dt / 3; this.z += this.vz * dt / 3;
      for (const q of g.pawns()) {
        if (q.dead || Math.abs(q.x - this.x) > 0.7 || Math.abs(q.z - this.z) > 0.7 || this.y < q.y - 0.3 || this.y > q.y + 2) continue;
        const l = Math.hypot(this.vx, this.vz) || 1;
        q.hurt(1, { type: 'projectile', attacker: this.owner, knock: 0 });
        if (q.knock) q.knock(this.vx / l * 13, 6.5, this.vz / l * 13);
        this.burst(); return;
      }
      for (const e of g.entities) {
        if (!(e instanceof Mob) || !e.alive || e === this.owner || e.T.flyer) continue;
        if (Math.abs(e.x - this.x) < e.w + 0.4 && Math.abs(e.z - this.z) < e.w + 0.4 && this.y > e.y - 0.2 && this.y < e.y + e.h + 0.2) { e.vx += this.vx * 0.9; e.vz += this.vz * 0.9; e.vy = Math.max(e.vy, 5); this.burst(); return; }
      }
      if (T_SOLID[g.world.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))]) { this.burst(); return; }
    }
  };
  Projectile.prototype.burst = function () {
    this.remove = true;
    const g = this.game;
    for (let k = 0; k < 16; k++) { const a = Math.random() * TAU; spellSpark(g, this.x, this.y, this.z, 'gust_ball', { vx: Math.cos(a) * 2.5, vy: (Math.random() - 0.3) * 2, vz: Math.sin(a) * 2.5, life: 0.6, size: 0.16, grow: 1.2 }); }
    g.sfx.playAt('gust_pop', this.x, this.y, this.z, 20);
  };
  const baseGlow = Projectile.prototype.glow;
  Projectile.prototype.glow = function (out) {
    if (this.kind !== 'gust') return baseGlow.call(this, out);
    const l = this.game.world.getLight(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
    out.push({ x: this.x, y: this.y, z: this.z, size: 0.7 + Math.sin(this.age * 20) * 0.08, uv: tileUV(ATLAS.tile.gust_ball), light: l | 0xA0 });
  };
  // a gust puff: one great leap
  const baseMilk = LocalPlayer.prototype.drinkMilk;
  LocalPlayer.prototype.drinkMilk = function (held) {
    const d = held && itemDef(held.id);
    if (d && d.gustPuff) {
      const g = this.g, p = this.player;
      held.n--; if (held.n <= 0) p.inv.held = null;
      p.vy = Math.max(p.vy, 12.5); p.onGround = false; p.slowFallT = Math.max(p.slowFallT || 0, 3); p.fallStart = null;
      for (let k = 0; k < 18; k++) { const a = Math.random() * TAU; spellSpark(g, p.x + Math.cos(a) * 0.4, p.y + 0.1, p.z + Math.sin(a) * 0.4, 'gust_ball', { vx: Math.cos(a) * 2.2, vy: -0.5, vz: Math.sin(a) * 2.2, life: 0.7, size: 0.2, grow: 1.4 }); }
      g.sfx.play('gust'); this.swingArm();
      return;
    }
    return baseMilk.call(this, held);
  };
}
// ---- where they turn up ---------------------------------------------------------------------------------------------
{
  const baseSpawn = Game.prototype.spawnMobs;
  Game.prototype.spawnMobs = function (...a) {
    const r = baseSpawn.apply(this, a);
    if (this.dim !== DIM.SKYLANDS || this.isGuest || !this.rules().mobSpawning) return r;
    const ps = this.pawns().filter(q => !q.dead); if (!ps.length) return r;
    const p = ps[Math.floor(Math.random() * ps.length)], w = this.world;
    const count = (t) => { let n = 0; for (const e of this.entities) if (e.type === t && e.alive && Math.hypot(e.x - p.x, e.z - p.z) < 96) n++; return n; };
    const ring = (lo, hi) => { const ang = Math.random() * TAU, d = lo + Math.random() * (hi - lo); return [Math.floor(p.x + Math.cos(ang) * d), Math.floor(p.z + Math.sin(ang) * d)]; };
    const loaded = (x, z) => { const ch = w.chunkAt(x >> 4, z >> 4); return ch && ch.mesh; };
    // whales in the open sky, well away from you
    if (Math.random() < 0.025 && count('aerwhale') < 2) {
      const [x, z] = ring(40, 64), y = Math.floor(clamp(p.y + 6 + Math.random() * 22, 52, CH - 14));
      if (loaded(x, z) && SKY_AIR(w, x, y + 1, z, 3)) { const m = this.addEntity(new Mob(this, 'aerwhale', x + 0.5, y, z + 0.5)); m.yaw = Math.random() * TAU; }
    }
    if (Math.random() < 0.018 && count('zephyr') < 2) {
      const [x, z] = ring(22, 40), y = Math.floor(clamp(p.y + 4 + Math.random() * 8, 48, CH - 8));
      if (loaded(x, z) && SKY_AIR(w, x, y + 1, z, 1)) this.addEntity(new Mob(this, 'zephyr', x + 0.5, y, z + 0.5));
    }
    // on the sky grass
    const ground = (t, lo, hi) => {
      const [x, z] = ring(lo, hi); if (!loaded(x, z)) return;
      for (let y = Math.min(CH - 3, Math.floor(p.y) + 14); y > Math.max(30, Math.floor(p.y) - 20); y--) {
        const id = w.getBlock(x, y, z); if (!id) continue;
        if (id === B.sky_grass && !w.getBlock(x, y + 1, z) && !w.getBlock(x, y + 2, z)) this.addEntity(new Mob(this, t, x + 0.5, y + 1, z + 0.5));
        return;
      }
    };
    if (Math.random() < 0.035 && count('swet') + count('golden_swet') < 4) ground(Math.random() < 0.2 ? 'golden_swet' : 'swet', 16, 34);
    if (Math.random() < 0.02 && count('aechor_plant') < 3) ground('aechor_plant', 18, 40);
    return r;
  };
}

// ---- pictures and sounds ---------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('aerwhale_skin', p => { p.noise(H('#6a8aae'), 0.12); for (let k = 0; k < 9; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#9ab8d4'), 0.1); for (let x = 0; x < 16; x++) if (x % 5 === 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.25) p.set(x, y, H('#587898')); });
    addTile('aerwhale_belly', p => { p.noise(H('#dce8f0'), 0.06); for (let x = 1; x < 16; x += 3) for (let y = 0; y < 16; y++) p.set(x, y, H('#b8c8d8')); });
    addTile('aerwhale_face', p => {
      p.noise(H('#6a8aae'), 0.1);
      for (const ex of [2, 12]) { p.set(ex, 6, H('#101820')); p.set(ex + 1, 6, H('#101820')); p.set(ex, 7, H('#101820')); p.set(ex + 1, 7, H('#101820')); p.set(ex, 6, H('#ffffff')); }
      for (let x = 2; x < 14; x++) p.set(x, 11 + (x > 4 && x < 11 ? 1 : 0), H('#3a5070'));
      for (let y = 13; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, H('#dce8f0'));
    });
    addTile('aerwhale_fin', p => { p.noise(H('#4a6a8e'), 0.12); for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) p.set(x, y, H('#3a5878')); });
    addTile('zephyr_puff', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const n = p.rand(); p.set(x, y, shade(H('#eef2f8'), 0.9 + n * 0.12 - (y > 11 ? 0.08 : 0))); } for (let k = 0; k < 6; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 12), 1, H('#ffffff'), 0.03); });
    addTile('zephyr_face', p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#eef2f8'), 0.92 + p.rand() * 0.1));
      for (const [x, y] of [[3, 5], [4, 5], [4, 6], [5, 6], [12, 5], [11, 5], [11, 6], [10, 6]]) p.set(x, y, H('#3a4a6a'));
      for (let y = 9; y < 14; y++) for (let x = 6; x < 10; x++) { const d = Math.hypot(x - 7.5, y - 11.3); if (d < 2.4) p.set(x, y, d < 1.4 ? H('#1a2030') : H('#5a6a88')); }
      p.set(2, 8, H('#f0c8d8')); p.set(13, 8, H('#f0c8d8'));
    });
    addTile('gust_ball', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5), a = Math.atan2(y - 7.5, x - 7.5); if (d < 7) { const sw = Math.sin(a * 3 + d * 0.9); p.set(x, y, shade(H('#f4f8ff'), 0.9 + sw * 0.1), Math.round((1 - d / 7) * 200 + (sw > 0.5 ? 40 : 0))); } } });
    for (const [k, gel, core, eye] of [['swet', '#7ac8f0', '#3a88d0', '#103050'], ['golden_swet', '#f0d870', '#d8a020', '#503010']]) {
      addTile(k + '_gel', p => { p.noise(H(gel), 0.08); for (let i = 0; i < 16; i++) { p.set(i, 0, shade(H(gel), 1.15)); p.set(0, i, shade(H(gel), 1.1)); } p.set(3, 3, H('#ffffff')); p.set(4, 3, H('#ffffff')); p.set(3, 4, H('#ffffff')); });
      addTile(k + '_core', p => { p.noise(H(core), 0.1); });
      addTile(k + '_face', p => { p.noise(H(core), 0.1); for (const x of [3, 4, 11, 12]) for (const y of [5, 6]) p.set(x, y, H(eye)); for (let x = 5; x < 11; x++) p.set(x, 11, H(eye)); p.set(4, 10, H(eye)); p.set(11, 10, H(eye)); });
    }
    addTile('aechor_leaf', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const w = 7 * Math.sin(Math.PI * x / 16); if (Math.abs(y - 7.5) < w) p.set(x, y, shade(H(Math.abs(y - 7.5) < 0.8 ? '#e8a8d8' : '#c85aa8'), 0.92 + p.rand() * 0.12)); } });
    addTile('aechor_stem', p => { p.noise(H('#5a9a3a'), 0.12); for (let y = 0; y < 16; y += 3) p.set(7, y, H('#3a7a2a')); });
    addTile('aechor_bulb', p => { p.noise(H('#d870b8'), 0.1); for (let k = 0; k < 10; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#f8d0ec')); });
    addTile('aechor_mouth', p => {
      p.noise(H('#d870b8'), 0.1);
      for (let y = 6; y < 13; y++) for (let x = 3; x < 13; x++) if (Math.hypot((x - 7.5) / 1.3, y - 9.5) < 3.4) p.set(x, y, H('#3a0a2a'));
      for (const x of [4, 6, 9, 11]) { p.set(x, 7, H('#f8f0e0')); p.set(x, 12, H('#f8f0e0')); }
      p.set(5, 3, H('#ffe060')); p.set(10, 3, H('#ffe060'));
    });
    addTile('aechor_petal_tex', p => { p.noise(H('#f8a8d8'), 0.1); for (let y = 0; y < 16; y++) p.set(7, y, H('#ffd8f0')); });
    const I = (name, rows, pal) => addItem(name, p => p.art(rows, pal));
    I('swet_ball', ['................', '................', '................', '.....bbbbbb.....', '....bLLccccb....', '...bLLcccccdb...', '...bLccccccdb...', '...bccccccddb...', '...bcccccdddb...', '....bccdddddb...', '.....bbbbbbb....', '................', '................', '................', '................', '................'], { b: H('#1a4a7a'), L: H('#d8f0ff'), c: H('#7ac8f0'), d: H('#3a88d0') });
    I('aechor_petal', ['................', '................', '........pp......', '.......pPPp.....', '......pPLPp.....', '.....pPLPPp.....', '....pPLPPPp.....', '....pPLPPp......', '...pPLPPPp......', '...pPPPPp.......', '...pPPPp........', '...ppPp.........', '.....g..........', '....g...........', '................', '................'], { p: H('#8a2a6a'), P: H('#e878c0'), L: H('#ffd0ec'), g: H('#3a8a2a') });
    I('gust_puff', ['................', '................', '................', '.....oooo.......', '...ooWWWWoo.....', '..oWWWWWWWWoooo.', '.oWWWWWsWWWWWWWo', '.oWWsWWWWWWWsWWo', '..oWWWWWWWWWWWo.', '...ooWWWWWWWoo..', '.....ooooooo....', '................', '..ww....ww......', '....ww....ww....', '................', '................'], { o: H('#8a9ab8'), W: H('#f4f8ff'), s: H('#c8d4e8'), w: H('#d8e4f4') });
  };
}
SND_FX.aerwhale = [3.4, 0.7, (b, v, r) => {
  // a long low call that rises and falls, with a second voice answering under it
  const f0 = 70 + r() * 25;
  b.vox(0, 1.6, f0, f0 * 1.9, 'u', 0.55, 0.12);
  b.vox(1.4, 1.9, f0 * 1.9, f0 * 0.85, 'o', 0.5, 0.1);
  b.vox(0.6, 2.2, f0 * 0.5, f0 * 0.62, 'u', 0.3, 0.05);
  b.noise(0, 3.2, 'lp', 220, 0.7, 0.05, { att: 0.8, curve: 0.4 });
}];
SND_FX.zephyr = [1.0, 0.5, (b, v, r) => { b.noise(0, 0.9, 'bp', 500, 1.2, 0.5, { att: 0.5, sweep: 2.4 }); b.vox(0.1, 0.7, 180, 240, 'o', 0.15, 0.9); }];
SND_FX.gust = [0.9, 0.6, (b, v, r) => { b.noise(0, 0.8, 'bp', 1400, 0.7, 0.7, { att: 0.01, sweep: 0.35 }); b.noise(0, 0.5, 'lp', 300, 0.7, 0.4, { att: 0.01 }); }];
SND_FX.gust_pop = [0.5, 0.45, (b, v, r) => { b.noise(0, 0.35, 'bp', 900, 0.8, 0.6, { att: 0.002, sweep: 0.5 }); b.thump(0, 120, 60, 0.15, 0.3); }];
