// ---------------------------------------------------------------------------
// game/endmobs.js — 0.9.0.19: the End's creatures and its dragon.
//
// Endermen: tall, black, long-limbed, with purple eyes. They wander and keep
// to themselves; meet their eyes (look one in the face) or hit one and it
// comes for you, blinking from place to place. Arrows never touch them, they
// can't bear water, and they leave ender pearls behind. Most live in the End;
// now and then one walks the Overworld at night, or the Ember Depths.
//
// The Ender Dragon circles the main island, healed by the end crystals on
// top of the obsidian pillars (the beam you see). Break the crystals (an arrow
// does it; up close, a blow), then bring it down: it sweeps over to breathe
// its void-fire, charges, and now and then settles on the exit portal's
// pillar, where it's easiest to reach. Beaten, the exit portal opens (a window
// home), its egg settles on the pillar, and a gateway to the far islands
// opens. The egg, kept warm, hatches an ender drake you can raise and ride.
// ---------------------------------------------------------------------------

// ---- endermen ---------------------------------------------------------------------------------------------------------
MODEL_DEFS.enderman = bipedRig({
  head: [8, 8, 8], body: [8, 12, 4], arm: [2, 30, 2], leg: [2, 30, 2], shoulder: 1,
  tex: { head: { all: 'ender_skin', front: 'ender_face' }, body: 'ender_skin', arm: 'ender_skin', leg: 'ender_skin' },
  extras: [['eyeglow', 'head', [0, 0, 0], [-4, 0, -4.06, 4, 8, -4.02], 'ender_eyes', { glow: true, noCull: true }]],
});
MOB_TYPES.enderman = { model: 'enderman', label: 'an enderman', hp: 40, w: 0.34, h: 2.9, speed: 3.4, xp: 18, hostile: true, special: true, damage: 7, knockResist: 0.2, voice: 'enderman', noDismember: true, drops: [['ender_pearl', 1, 1, 0.5]] };
if (typeof PACK_MOBS !== 'undefined') PACK_MOBS.enderman = { tex: ['entity/enderman/enderman'], texW: 64, parts: pmBiped({ head: PM(0, 0, 8, 8, 8), body: PM(32, 16, 8, 12, 4), arm: PM(56, 0, 2, 30, 2), leg: PM(56, 0, 2, 30, 2) }) };
// a blink: somewhere around (cx, cz), within r, on solid ground with room to stand
function enderBlink(e, cx, cz, r, near) {
  const g = e.game, w = g.world;
  for (let t = 0; t < 16; t++) {
    const a = Math.random() * TAU, d = near ? 2 + Math.random() * (r - 2) : Math.random() * r;
    const x = Math.floor(cx + Math.cos(a) * d), z = Math.floor(cz + Math.sin(a) * d);
    if (!w.isLoaded(x, z)) continue;
    for (let y = Math.floor(e.y) + 6; y >= Math.floor(e.y) - 8; y--) {
      if (T_SOLID[w.getBlock(x, y - 1, z)] && !T_SOLID[w.getBlock(x, y, z)] && !T_SOLID[w.getBlock(x, y + 1, z)] && !T_SOLID[w.getBlock(x, y + 2, z)] && !T_LIQUID[w.getBlock(x, y, z)] && !T_LIQUID[w.getBlock(x, y - 1, z)]) {
        for (let k = 0; k < 14; k++) g.burst(e.x + (Math.random() - 0.5) * 0.6, e.y + Math.random() * 2.8, e.z + (Math.random() - 0.5) * 0.6, 'end_mote', 1, 0.8, 0);
        g.sfx.playAt('ender_tp', e.x, e.y + 1.5, e.z, 24);
        e.x = x + 0.5; e.y = y; e.z = z + 0.5; e.vx = e.vy = e.vz = 0;
        for (let k = 0; k < 14; k++) g.burst(e.x + (Math.random() - 0.5) * 0.6, e.y + Math.random() * 2.8, e.z + (Math.random() - 0.5) * 0.6, 'end_mote', 1, 0.8, 0);
        g.sfx.playAt('ender_tp', e.x, e.y + 1.5, e.z, 24);
        return true;
      }
    }
  }
  return false;
}
MONSTER_AI.enderman = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, P = p ? (p.player || p) : null;
  this.voiceTick(dt, dist, 7, 10);
  // water burns: off it goes
  let wet = this.inWater;
  if (!wet && g.dim === 0 && g.weather && g.weather.rain > 0.3 && g.weather.precipAt && g.weather.precipAt(this.x, this.y + 3, this.z) === 'rain' && this.lightAt(2.5)[0] >= 12) wet = true;
  if (wet && (this._wetCd = (this._wetCd || 0) - dt) <= 0) { this._wetCd = 0.7; this.hurt(1, { type: 'drown' }); enderBlink(this, this.x, this.z, 18); }
  // looked in the eye
  if (p && P && !(this.angryT > 0) && dist < 48 && p.look) {
    const head = P.inv && P.inv.armor && P.inv.armor.slots ? P.inv.armor.slots[0] : null;
    const masked = head && head.id === 'carved_pumpkin';
    const lv = p.look(), ey = this.y + this.h - 0.3, eyeY = P.y + (P.eye || 1.62);
    const dx = this.x - P.x, dy = ey - eyeY, dz = this.z - P.z, d = Math.hypot(dx, dy, dz) || 1;
    const dot = (lv[0] * dx + lv[1] * dy + lv[2] * dz) / d, lim = Math.cos(Math.atan(0.4 / d) + 0.025);
    if (!masked && dot > lim && this.lineOfSight(p)) {
      this.stareT = (this.stareT || 0) + dt;
      if (this.stareT > 0.3) {
        this.angryT = 30; this.foe = p; this.stareT = 0;
        g.sfx.playAt('enderman_stare', this.x, this.y + 2.5, this.z, 40);
        this.lookT = 1.2;
      }
    } else this.stareT = 0;
  }
  if (this.angryT > 0) {
    this.angryT -= dt;
    if (!p) return { want: 0, dir: this.yaw };
    this.senses(p, dist, dyp, dt, 40);
    // it stares back a moment, then comes, blinking closer when you're far
    if (this.lookT > 0) { this.lookT -= dt; return { want: 0, dir: toPlayer }; }
    if ((this.tpT = (this.tpT ?? 2) - dt) <= 0) { this.tpT = 2.5 + Math.random() * 4; if (dist > 9 || Math.random() < 0.3) enderBlink(this, P.x, P.z, dist > 9 ? 4 : 7, true); }
    this.meleeAt(p, dist, dyp);
    return this.chase(p, dist, toPlayer, dt, 1.7);
  }
  // otherwise: an aimless amble, now and then a blink
  if ((this.wanderT = (this.wanderT || 0) - dt) <= 0) {
    this.wanderT = 3 + Math.random() * 6; this.wanderDir = Math.random() * TAU; this.wanderGo = Math.random() < 0.55;
    if (Math.random() < 0.05) enderBlink(this, this.x, this.z, 14);
  }
  return { want: this.wanderGo ? this.T.speed * 0.3 : 0, dir: this.wanderDir ?? this.yaw };
};
{
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    if (this.type === 'enderman' && !this.ghost) {
      // nothing you shoot ever reaches it
      if (src.tool === 'arrow' || src.type === 'arrow' || src.type === 'projectile') { enderBlink(this, this.x, this.z, 12); return 0; }
      const r = baseHurt.call(this, amount, src);
      if (src.attacker && src.attacker !== this) { this.angryT = 30; this.foe = src.attacker; this.lookT = 0; }
      if (r > 0 && this.alive && Math.random() < 0.3) enderBlink(this, this.x, this.z, 8, true);
      return r;
    }
    return baseHurt.call(this, amount, src);
  };
}

// ---- the end crystals ----------------------------------------------------------------------------------------------------
MODEL_DEFS.end_crystal = finishRig('crystal', [
  rpart('frameA', null, [0, 14, 0], [-5, -5, -5, 5, 5, 5], 'crystal_frame', { noCull: true, glow: true }),
  rpart('frameB', 'frameA', [0, 0, 0], [-4, -4, -4, 4, 4, 4], 'crystal_frame', { noCull: true, glow: true }),
  rpart('core', 'frameB', [0, 0, 0], [-2.5, -2.5, -2.5, 2.5, 2.5, 2.5], 'crystal_core', { glow: true }),
  rpart('base', null, [0, 0, 0], [-6, 0, -6, 6, 3, 6], 'bedrock'),
], { height: 20, scale: 1 });
RIG_ANIM.crystal = function (m, d, P, R) {
  const t = m.ghost ? (m.game ? m.game.time : 0) : (m.age || 0);
  P.frameA = [t * 1.3, t * 0.9, t * 0.5]; P.frameB = [-t * 1.1, t * 1.7, 0]; P.core = [t * 2.1, t * 1.3, t * 1.7];
  R.lift = 0;
};
MOB_TYPES.end_crystal = { model: 'end_crystal', label: 'an end crystal', hp: 1, w: 0.7, h: 2.0, speed: 0, special: true, noPush: true, knockResist: 1, noDismember: true, fireImmune: true, xp: 0, drops: [] };
MONSTER_AI.end_crystal = function (dt) { this.noGrav = true; this.flyVy = 0; this.vx = this.vz = 0; this.kept = true; return { want: 0, dir: this.yaw }; };

// ---- the Ender Dragon -------------------------------------------------------------------------------------------------------
DRAGON_TYPES.ender = { name: 'Ender', body: '#1c1622', dark: '#0c0910', belly: '#3a2c44', wing: '#2a2034', eye: '#e060ff', horn: '#d8d0e0', breath: 'void', fx: 'mana_arcane', hp: 600 };
DRAGON_BREATH_FX.void = ['mana_arcane', 'end_mote', 'mana_arcane', 'end_mote'];
MODEL_DEFS.ender_dragon = dragonRig('ender', 3.3);
{
  const d = MODEL_DEFS.ender_drake = dragonRig('ender', 1.35);
  d.parts.push(rpart('saddle', 'body', [0, 0, 0], [-7.4, 6, -9, 7.4, 7.4, 1], 'saddle_leather', { only: 'saddled' }));
  d.parts.push(rpart('girth', 'body', [0, 0, 0], [-7.3, -5.3, -5, 7.3, 6.1, -3.4], 'saddle_leather', { only: 'saddled' }));
}
MOB_TYPES.ender_dragon = { model: 'ender_dragon', label: 'the Ender Dragon', hp: 600, w: 1.9, h: 3.6, speed: 5, hostile: true, special: true, boss: true, mini: true, damage: 11, xp: 1500, knockResist: 1, fireImmune: true, dragon: 'ender', noDismember: true,
  drops: [['dragon_scale', 14, 22, 1], ['emerald', 20, 36, 1], ['heart_crystal', 2, 3, 1], ['diamond', 4, 8, 1]] };
MOB_TYPES.ender_drake = { model: 'ender_drake', label: 'an ender drake', hp: 80, w: 0.8, h: 1.5, speed: 4.4, damage: 7, retaliates: true, xp: 0, dragon: 'ender', drake: true, flyingMount: true, fireImmune: true, drops: [['dragon_scale', 1, 3, 1]] };
if (typeof MOUNTS !== 'undefined') MOUNTS.ender_drake = [7, 9];
if (typeof TAME_FOOD !== 'undefined') TAME_FOOD.ender_drake = [['beef', 'porkchop', 'mutton', 'chicken', 'cod', 'salmon', 'cooked_beef', 'cooked_porkchop', 'cooked_mutton', 'cooked_chicken', 'rabbit', 'cooked_rabbit', 'chorus_fruit'], 1];
SHAPES.dragon_egg_ender = [
  { b: [4.5, 0, 4.5, 11.5, 1, 11.5], side: 'dragon_egg_ender', end: 'dragon_egg_ender' }, { b: [3.5, 1, 3.5, 12.5, 7, 12.5], side: 'dragon_egg_ender', end: 'dragon_egg_ender' },
  { b: [4, 7, 4, 12, 10, 12], side: 'dragon_egg_ender', end: 'dragon_egg_ender' }, { b: [5, 10, 5, 11, 12.5, 11], side: 'dragon_egg_ender', end: 'dragon_egg_ender' }, { b: [6.5, 12.5, 6.5, 9.5, 13.5, 9.5], side: 'dragon_egg_ender', end: 'dragon_egg_ender' },
];
// the nearest crystal still standing, if it's close enough to heal from
function endCrystalFor(e) {
  let best = null, bd = 64;
  for (const c of e.game.entities) if (c.type === 'end_crystal' && c.alive && !c.remove) { const d = Math.hypot(c.x - e.x, c.y - e.y, c.z - e.z); if (d < bd) { bd = d; best = c; } }
  return best;
}
MONSTER_AI.ender_dragon = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, T = this.T, fy = g.world.gen.endFountainY ? g.world.gen.endFountainY() : 64;
  this.kept = true; this.noGrav = true;
  if (this.hoverT > 0) this.hoverT -= dt;
  dragonUnstick(this, dt);
  // healed by the crystals: a beam of light from the nearest
  const C = endCrystalFor(this);
  this.healBeam = C;
  if (C && this.health < this.maxHealth) { this.health = Math.min(this.maxHealth, this.health + dt * 2.5); }
  if (C && Math.random() < dt * 18) {
    const k = Math.random(), bx = C.x + (this.x - C.x) * k, by = C.y + 1.2 + (this.y + 1.5 - C.y - 1.2) * k, bz = C.z + (this.z - C.z) * k;
    g.particles.add({ x: bx, y: by, z: bz, vx: 0, vy: 0, vz: 0, life: 0.5, max: 0.5, size: 0.22, uv: tileUV(ATLAS.tile.end_mote ?? ATLAS.tile.white), light: 0xFF, grav: 0, shrink: true, size0: 0.22 });
  }
  if ((this.flapT = (this.flapT || 0) - dt) <= 0) { this.flapT = 0.9; g.sfx.playAt('dragon_flap', this.x, this.y + 2, this.z, 70); }
  const P = p ? (p.player || p) : null;
  this.stT = (this.stT ?? 4) - dt;
  const toPt = (x, y, z, sp) => { this.flyVy = clamp((y - this.y) * 1.2, -9, 9); return { want: sp, dir: Math.atan2(-(x - this.x), -(z - this.z)) }; };
  switch (this.dstate) {
    case 'strafe': {
      if (!P) { this.dstate = 'circle'; break; }
      if (!this.breathPt) { const a = Math.atan2(this.z - P.z, this.x - P.x); this.breathPt = [P.x + Math.cos(a) * 10, P.y + 7, P.z + Math.sin(a) * 10]; }
      const [bx, by, bz] = this.breathPt, d = Math.hypot(bx - this.x, bz - this.z);
      if (d > 3 && !(this.breathT > 0) && this.stT > -6) return toPt(bx, by, bz, T.speed * 2.4);
      this.flyVy = clamp((by - this.y) * 1.5, -6, 6);
      dragonFace(this, P.x, P.z, dt, 4); this.hoverT = 0.5;
      if (!(this.breathT > 0) && !this.breathed) { this.breathT = 2.6; this.breathed = true; g.sfx.playAt('dragon_breath', this.x, this.y + 2, this.z, 70); }
      if (this.breathT > 0) { this.breathT -= dt; dragonBreath(this, P, dt); return { want: 0, dir: this.yaw }; }
      this.breathed = false; this.breathPt = null; this.dstate = 'circle'; this.stT = 5 + Math.random() * 4;
      break;
    }
    case 'charge': {
      if (!P) { this.dstate = 'circle'; break; }
      const d3 = Math.hypot(P.x - this.x, P.y + 1 - this.y, P.z - this.z);
      this.flyVy = clamp((P.y + 0.8 - this.y) * 2.5, -12, 9);
      if (d3 < 3.5 + this.w && this.attackCd <= 0) {
        this.attackCd = 1.4; this.swingT = 0.3;
        p.hurt(T.damage, { type: 'mob', attacker: this, knock: 9 });
        if (P.vy !== undefined) P.vy = Math.max(P.vy, 7);
        g.sfx.playAt('dragon_bite', this.x, this.y + 1, this.z, 60);
        this.dstate = 'climb'; this.stT = 1.8;
      }
      if (this.stT <= 0) { this.dstate = 'climb'; this.stT = 1.5; }
      return { want: T.speed * 3.2, dir: toPlayer };
    }
    case 'climb': {
      this.flyVy = 9;
      if (this.stT <= 0) { this.dstate = 'circle'; this.stT = 5 + Math.random() * 4; }
      return { want: T.speed * 2, dir: this.yaw };
    }
    case 'perch': {
      // down onto the portal's pillar, where you can reach it; it breathes on anyone close
      const px = 0.5, pz = 0.5, py = fy + 4.1, d = Math.hypot(px - this.x, pz - this.z);
      if (!this.perched) {
        if (d > 2) return toPt(px, Math.max(py + 8, this.y - 1), pz, T.speed * 2);
        this.flyVy = clamp((py - this.y) * 2, -6, 4); this.hoverT = 0.5;
        if (Math.abs(this.y - py) < 0.6) { this.perched = true; this.stT = 10 + Math.random() * 5; g.sfx.playAt('dragon_roar', this.x, this.y + 2, this.z, 120); }
        return { want: 0, dir: this.yaw };
      }
      this.x += (px - this.x) * Math.min(1, dt * 3); this.z += (pz - this.z) * Math.min(1, dt * 3); this.flyVy = clamp((py - this.y) * 3, -3, 3); this.hoverT = 0.5;
      if (P) {
        dragonFace(this, P.x, P.z, dt, 2.5);
        if (dist < 5 + this.w && Math.abs(dyp) < 4 && this.attackCd <= 0) { this.attackCd = 1.5; this.swingT = 0.3; p.hurt(T.damage * 0.8, { type: 'mob', attacker: this, knock: 7 }); g.sfx.playAt('dragon_bite', this.x, this.y + 1, this.z, 50); }
        if (dist < 22 && !(this.breathT > 0) && (this.pbT = (this.pbT ?? 2) - dt) <= 0) { this.pbT = 4 + Math.random() * 2; this.breathT = 2; g.sfx.playAt('dragon_breath', this.x, this.y + 2, this.z, 60); }
        if (this.breathT > 0) { this.breathT -= dt; dragonBreath(this, P, dt); }
      }
      if (this.stT <= 0) { this.perched = false; this.dstate = 'climb'; this.stT = 2; g.sfx.playAt('dragon_roar', this.x, this.y + 2, this.z, 120); }
      return { want: 0, dir: this.yaw };
    }
  }
  // circling the island, high over the pillars
  this.dstate = 'circle';
  this.orbit = (this.orbit ?? Math.atan2(this.z, this.x)) + dt * 0.32;
  const gx = Math.cos(this.orbit) * 55, gz = Math.sin(this.orbit) * 55, alt = fy + 30 + Math.sin(this.age * 0.4) * 5;
  if (this.stT <= 0) {
    const crystals = g.entities.filter(e => e.type === 'end_crystal' && e.alive).length, r = Math.random();
    this.stT = 6 + Math.random() * 5;
    if (P && dist < 150) {
      if (r < 0.32) { this.dstate = 'strafe'; this.breathPt = null; this.stT = 8; }
      else if (r < 0.56) { this.dstate = 'charge'; this.stT = 6; }
      else if (r < 0.56 + (crystals ? 0.16 : 0.34) && Math.hypot(P.x, P.z) < 70) { this.dstate = 'perch'; this.perched = false; this.stT = 20; }
    }
  }
  return toPt(gx, alt, gz, T.speed * 2.2);
};

// ---- the fight: crystals set out, the dragon roused, and when it falls ----------------------------------------------------------
function endFightTick(g, dt) {
  if (g.dim !== DIM.END || g.isGuest || !g.meta || !g.world) return;
  if ((g._endT = (g._endT || 0) - dt) > 0) return;
  g._endT = 1;
  const E = endRec(g), w = g.world, gen = w.gen;
  const near = g.locals.some(l => !l.player.dead && Math.hypot(l.player.x, l.player.z) < 170);
  const dragon = g.entities.find(e => e.type === 'ender_dragon' && !e.remove);
  if (dragon && dragon.alive) E.dragonHp = Math.round(dragon.health);
  if (!near || (E.slain && !E.again)) return;   // (0.9.0.32) unless the crystals called it back (game/hearth.js)
  // the crystals on their pillars
  for (const pl of gen.endPillars()) {
    if ((E.crystalsGone || []).includes(pl.i)) continue;
    if (g.entities.some(e => e.type === 'end_crystal' && e.crystalIdx === pl.i && !e.remove)) continue;
    const c = g.addEntity(new Mob(g, 'end_crystal', pl.x + 0.5, pl.h + 2, pl.z + 0.5));
    c.crystalIdx = pl.i; c.kept = true; c.noGrav = true;
  }
  // the dragon
  if (!dragon) {
    const fy = gen.endFountainY();
    const d = g.addEntity(new Mob(g, 'ender_dragon', 0.5, fy + 34, -40.5));
    d.kept = true; d.noGrav = true; d.dstate = 'circle'; d.stT = 6; d.endBoss = true;
    if (E.dragonHp > 0) d.health = Math.min(d.maxHealth, E.dragonHp);
    // called back: a fight for the fight's sake (hearts and scales come once, mostly)
    if (E.slain) d.T = Object.assign({}, d.T, { drops: [['dragon_scale', 5, 10, 1], ['emerald', 10, 20, 1], ['heart_crystal', 1, 1, 0.25], ['diamond', 2, 4, 1]] });
    if (!E.met) { E.met = 1; g.sfx.playAt('dragon_roar', 0, fy + 30, 0, 300); for (const l of g.locals) l.toast('The Ender Dragon! Break the crystals on the pillars: they heal it', 'epic'); }
  }
}
function endDragonSlain(g, e) {
  const E = endRec(g), w = g.world, gen = w.gen, fy = gen.endFountainY();
  E.slain = (E.slain || 0) + 1; E.dragonHp = 0; E.again = 0;
  // the exit portal opens, and the egg comes to rest on the pillar
  for (const [cx, cz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) w.ensureChunk(cx, cz);
  for (let z = -3; z <= 3; z++) for (let x = -3; x <= 3; x++) { const d = Math.hypot(x, z); if (d <= 2.6 && (x || z)) w.setBlock(x, fy, z, B.end_portal, 0); }
  if (E.slain === 1) w.setBlock(0, fy + 4, 0, B.dragon_egg_ender, 0);   // (0.9.0.33) one egg (the dragon can be called back now)
  endGatewayOpen(g);
  g.sfx.playAt('end_portal_open', 0, fy, 0, 300);
  for (let i = 0; i < 60; i++) spellSpark(g, e.x, e.y + 1.5, e.z, i % 2 ? 'mana_arcane' : 'end_mote', { vx: (Math.random() - 0.5) * 10, vy: Math.random() * 8, vz: (Math.random() - 0.5) * 10, life: 1.6, size: 0.25 });
  for (const l of g.locals) {
    l.toast('The Ender Dragon is slain! The exit portal is open, its egg rests on the pillar, and a gateway has opened', 'epic');
    if (Math.hypot(l.player.x, l.player.z) < 200) l.grantXP(E.slain === 1 ? 1200 : 300, e.x, e.y + 2, e.z);
    const S = l.player.stats || (l.player.stats = {}); S.dragonsSlain = (S.dragonsSlain || 0) + 1;
  }
  (g.meta.flags || (g.meta.flags = {})).enderDragon = true;
}
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { endFightTick(this, dt); } catch (err) { console.warn('end fight', err); } return baseUpd.call(this, dt); };
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const g = this.game, type = this.type, x = this.x, y = this.y, z = this.z;
    const r = baseDie.call(this, src);
    if (g.isGuest || !g.meta) return r;
    if (type === 'end_crystal') {
      const E = endRec(g); if (this.crystalIdx !== undefined && !E.crystalsGone.includes(this.crystalIdx)) E.crystalsGone.push(this.crystalIdx);
      g.explode(x, y + 1, z, 3, { noBlocks: true });
      const left = g.entities.filter(e => e.type === 'end_crystal' && e.alive && e !== this).length;
      for (const l of g.locals) if (Math.hypot(l.player.x - x, l.player.z - z) < 120) l.toast(left ? `A crystal shatters — ${left} left` : 'The last crystal shatters! Nothing heals the dragon now', left ? '' : 'good');
    } else if (type === 'ender_dragon' && g.dim === DIM.END) endDragonSlain(g, this);
    return r;
  };
}

// ---- where endermen turn up ----------------------------------------------------------------------------------------------------
{
  const baseSpawn = Game.prototype.spawnMobs;
  Game.prototype.spawnMobs = function (...a) {
    const r = baseSpawn.apply(this, a);
    if (this.isGuest || !this.rules().mobSpawning || !this.world) return r;
    const ps = this.pawns().filter(q => !q.dead && !q.phantom); if (!ps.length) return r;
    const p = ps[Math.floor(Math.random() * ps.length)], w = this.world;
    const count = this.entities.filter(e => e.type === 'enderman' && e.alive && Math.hypot(e.x - p.x, e.z - p.z) < 72).length;
    const cap = this.dim === DIM.END ? 12 : 2, chance = this.dim === DIM.END ? 0.7 : this.dim === DIM.DEPTHS ? 0.04 : this.dim === 0 && this.env && this.env.day < 0.42 ? 0.05 : 0;
    if (count >= cap || Math.random() > chance) return r;
    const a2 = Math.random() * TAU, d = 18 + Math.random() * 26, x = Math.floor(p.x + Math.cos(a2) * d), z = Math.floor(p.z + Math.sin(a2) * d);
    if (!w.isLoaded(x, z)) return r;
    const from = this.dim === DIM.END ? 100 : Math.min(CH - 4, Math.floor(p.y) + 12), to = this.dim === DIM.END ? 20 : Math.max(2, Math.floor(p.y) - 16);
    for (let y = from; y >= to; y--) {
      const id = w.getBlock(x, y - 1, z);
      if (!T_SOLID[id] || T_SOLID[w.getBlock(x, y, z)] || T_SOLID[w.getBlock(x, y + 1, z)] || T_SOLID[w.getBlock(x, y + 2, z)] || T_LIQUID[w.getBlock(x, y, z)]) continue;
      if (this.dim === 0 && (w.getLight(x, y, z) & 15) > 0) break;
      this.addEntity(new Mob(this, 'enderman', x + 0.5, y, z + 0.5));
      break;
    }
    return r;
  };
}

// ---- sounds ---------------------------------------------------------------------------------------------------------------------
SND_FX.enderman = [1.2, 0.4, (b, v, r) => { b.vox(0, 0.9, 140 + r() * 30, 90, 'o', 0.35, 0.5); b.noise(0.1, 0.7, 'bp', 500, 4, 0.12, { sweep: 0.6 }); }];
SND_FX.enderman_hurt = [0.6, 0.5, (b, v, r) => { b.vox(0, 0.45, 260, 140, 'a', 0.5, 0.6); b.noise(0, 0.3, 'bp', 1200, 3, 0.2); }];
SND_FX.enderman_death = [1.6, 0.55, (b, v, r) => { b.vox(0, 1.3, 220, 60, 'o', 0.5, 0.6); b.noise(0, 1.2, 'bp', 700, 2, 0.25, { sweep: 0.4 }); }];
SND_FX.enderman_stare = [1.2, 0.6, (b, v, r) => { b.noise(0, 1.1, 'bp', 2400, 6, 0.4, { sweep: 1.6 }); b.vox(0, 1.0, 320, 520, 'e', 0.35, 0.8); }];

// ---- the pictures -------------------------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('ender_skin', p => { p.noise(H('#141018'), 0.25); for (let i = 0; i < 10; i++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#22182a')); });
    addTile('ender_face', p => {
      p.noise(H('#141018'), 0.22);
      // the eyes sit where Minecraft's do: a band across the middle of the face
      for (const x0 of [1, 9]) for (let x = x0; x < x0 + 6; x++) { p.set(x, 8, H(x === x0 + 2 || x === x0 + 3 ? '#f0b0ff' : '#c060f0')); p.set(x, 9, H('#7a2aa8')); }
    });
    addTile('ender_eyes', p => {
      for (const x0 of [1, 9]) for (let x = x0; x < x0 + 6; x++) { p.set(x, 8, H(x === x0 + 2 || x === x0 + 3 ? '#ffe0ff' : '#d070ff')); p.set(x, 9, H('#9a40d0'), 200); }
    });
    addTile('crystal_frame', p => { for (let i = 0; i < 16; i++) for (const [x, y] of [[i, 0], [i, 15], [0, i], [15, i]]) p.set(x, y, H(i % 3 ? '#e8e0ff' : '#ffffff')); for (let i = 1; i < 15; i++) if (i % 5 === 2) { p.set(i, i, H('#c8b8ff'), 200); p.set(15 - i, i, H('#c8b8ff'), 200); } });
    addTile('crystal_core', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5)); p.set(x, y, mix(H('#ffc0f0'), H('#d040a0'), d / 8)); } p.set(5, 5, H('#ffffff')); p.set(6, 5, H('#ffffff')); });
  };
}
