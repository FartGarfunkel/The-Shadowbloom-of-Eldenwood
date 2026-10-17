// ---------------------------------------------------------------------------
// game/entities.js — creatures, the Cinder Golem boss, dropped items,
// projectiles, felled trees and particles.
//
// Creatures act on "pawns": every player that can be seen, hurt or handed an
// item — local split-screen players and LAN players alike. A pawn exposes
// x, y, z, vx, vz, eye, dead, look(), hurt(), knock(), give(), grantXP().
//
// On a LAN guest, entities are "ghosts": they only smooth toward the
// positions the host sends; all decisions happen on the host.
// ---------------------------------------------------------------------------

const ELEMENT_LABEL = { fire: 'Fire', frost: 'Frost', physical: 'Physical' };

class Entity {
  constructor(game, x, y, z) {
    this.game = game; this.id = game.nextEntityId++;
    this.x = x; this.y = y; this.z = z; this.vx = 0; this.vy = 0; this.vz = 0;
    this.remove = false; this.age = 0; this.w = 0.3; this.h = 0.9;
    this.ghost = false; this.tx = x; this.ty = y; this.tz = z;
  }
  lightAt(dy = 0.5) {
    const l = this.game.world.getLight(Math.floor(this.x), Math.floor(this.y + dy), Math.floor(this.z));
    return [l >> 4, l & 15];
  }
  dist2(p) { const dx = this.x - p.x, dy = this.y - p.y, dz = this.z - p.z; return dx * dx + dy * dy + dz * dz; }
  // Ghosts glide toward the last position the host reported.
  ghostStep(dt) {
    const k = Math.min(1, dt * 10);
    const ox = this.x, oz = this.z;
    this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.z += (this.tz - this.z) * k;
    if (this.tyaw !== undefined) { const d = ((this.tyaw - this.yaw + Math.PI * 3) % TAU) - Math.PI; this.yaw += d * k; }
    this.gvx = (this.x - ox) / Math.max(dt, 1e-3); this.gvz = (this.z - oz) / Math.max(dt, 1e-3);
    this.age += dt;
  }
}

// ---- creatures -------------------------------------------------------------------
const MOB_TYPES = {
  boar: { model: 'boar', hp: 10, w: 0.42, h: 0.95, speed: 1.6, xp: 3, hostile: false, carry: true, drops: [['raw_meat', 1, 3, 1], ['leather', 0, 2, 1]] },
  deer: { model: 'deer', hp: 12, w: 0.36, h: 1.6, speed: 1.7, run: 7.2, xp: 4, hostile: false, skittish: 11, carry: true, drops: [['venison', 1, 3, 1], ['leather', 1, 2, 1]] },
  rabbit: { model: 'rabbit', hp: 4, w: 0.2, h: 0.45, speed: 1.4, run: 5.5, xp: 1, hostile: false, skittish: 7, hopper: true, carry: true, drops: [['rabbit', 1, 1, 0.9], ['leather', 1, 1, 0.25]] },
  cow: { model: 'cow', hp: 10, w: 0.45, h: 1.4, speed: 1.3, xp: 2, hostile: false, carry: true, farm: true, food: ['wheat'], sound: 'moo', drops: [['beef', 1, 3, 1], ['leather', 0, 2, 1]] },
  pig: { model: 'pig', hp: 10, w: 0.45, h: 0.9, speed: 1.4, xp: 2, hostile: false, carry: true, farm: true, food: ['carrot', 'potato', 'beetroot'], sound: 'oink', drops: [['porkchop', 1, 3, 1]] },
  sheep: { model: 'sheep', hp: 8, w: 0.42, h: 1.3, speed: 1.3, xp: 2, hostile: false, carry: true, farm: true, food: ['wheat'], sound: 'baa', woolly: true, drops: [['mutton', 1, 2, 1]] },
  chicken: { model: 'chicken', hp: 4, w: 0.2, h: 0.7, speed: 1.2, xp: 1, hostile: false, carry: true, farm: true, food: ['wheat_seeds', 'beetroot_seeds', 'pumpkin_seeds', 'melon_seeds'], sound: 'cluck', layer: true, floaty: true, drops: [['chicken', 1, 1, 1], ['feather', 0, 2, 1]] },
  ghoul: { model: 'ghoul', hp: 20, w: 0.3, h: 1.95, speed: 2.7, xp: 6, hostile: true, damage: 3, drops: [['leather', 0, 1, 0.5], ['iron_ingot', 1, 1, 0.04], ['coal', 1, 2, 0.25], ['bone', 0, 2, 0.6], ['gunpowder', 1, 1, 0.12]] },
  charred_ghoul: { model: 'ghoul', hp: 26, w: 0.3, h: 1.95, speed: 2.9, xp: 9, hostile: true, damage: 4, fireImmune: true, tint: [1, 0.45, 0.1, 0.35], drops: [['cinderite_shard', 1, 1, 0.08], ['coal', 1, 3, 0.5], ['gold_ingot', 1, 1, 0.1], ['gunpowder', 1, 2, 0.3], ['bone', 0, 2, 0.4]] },
  cinder_golem: { model: 'cinder_golem', hp: 240, w: 0.95, h: 3.1, speed: 2.3, xp: 150, hostile: true, boss: true, damage: 6, fireImmune: true, knockResist: 0.9, element: 'fire',
    drops: [['cinder_core', 1, 1, 1], ['iron_ingot', 3, 6, 1], ['gold_ingot', 1, 3, 1], ['cinderite_shard', 1, 2, 0.5]] },
};

class Mob extends Entity {
  constructor(game, type, x, y, z) {
    super(game, x, y, z);
    const T = MOB_TYPES[type];
    this.type = type; this.T = T;
    this.w = T.w; this.h = T.h; this.health = T.hp; this.maxHealth = T.hp;
    this.yaw = Math.random() * TAU;
    this.walk = 0; this.walkAmt = 0;
    this.hurtTime = 0; this.deathTime = 0; this.burn = 0; this.slowT = 0;
    this.attackCd = 0; this.state = 'idle'; this.stateT = 0;
    this.wanderT = Math.random() * 3; this.wanderDir = Math.random() * TAU; this.wanderOn = false;
    this.panicT = 0; this.soundT = 3 + Math.random() * 8;
    this.onGround = false;
    this.stag = type === 'deer' && Math.random() < 0.45;
    this.hopT = 0;
    // farm animals
    this.loveT = 0; this.breedCd = 0; this.baby = false; this.growT = 0; this.kept = false; this.sheared = false;
    if (T.woolly) { const r = Math.random(); this.color = r < 0.82 ? 'white' : r < 0.87 ? 'black' : r < 0.92 ? 'gray' : r < 0.97 ? 'light_gray' : r < 0.998 ? 'brown' : 'pink'; }
    if (T.layer) this.eggT = 300 + Math.random() * 300;
    this.heldItem = T.held || null;
    // coats and colours (horses, llamas, cats, parrots...): each is its own model
    if (T.variants) this.variant = T.variants[Math.floor(Math.random() * T.variants.length)];
    // now and then a ghoul turns up carrying something
    if ((type === 'ghoul' || type === 'charred_ghoul') && Math.random() < 0.07) this.heldItem = ['iron_sword', 'iron_shovel', 'stone_axe', 'gold_sword'][Math.floor(Math.random() * 4)];
  }
  // A weapon in hand hits harder.
  weaponBonus() {
    const id = this.heldItem || this.offItem, d = id && itemDef(id);
    return d && d.tool ? Math.max(0, Math.round((d.tool.damage - 1) * 0.6)) : 0;
  }
  aiTarget(p) { return p; }
  makeBaby() { this.baby = true; this.growT = 300; this.w = this.T.w * 0.55; this.h = this.T.h * 0.55; this.kept = true; }
  grow() { this.baby = false; this.w = this.T.w; this.h = this.T.h; }
  get alive() { return this.deathTime === 0; }
  hurt(amount, src = {}) {
    if (!this.alive || this.invulnT > 0) return 0;
    if (this.ghost) { this.game.net && this.game.net.sendHit(this, amount, src); this.hurtTime = 0.35; return amount; }
    let dmg = amount;
    // (0.9.0.24) a fire blade still cuts what fire can't burn: only pure fire (spells, flames) does nothing to them
    if (src.element === 'fire' && this.T.fireImmune && !src.weapon) dmg = 0;
    if (src.element === 'frost' && this.type === 'cinder_golem') dmg *= 2;
    if (src.type === 'lava' && this.T.fireImmune) dmg = 0;
    if (dmg <= 0) { if (src.attacker && src.attacker.floatText) src.attacker.floatText(this.x, this.y + this.h + 0.3, this.z, 'Immune', '#ffb070'); return 0; }
    this.health -= dmg;
    this.hurtTime = 0.35;
    if (src.attacker) {
      const kx = this.x - src.attacker.x, kz = this.z - src.attacker.z, l = Math.hypot(kx, kz) || 1;
      const kb = (src.knock ?? 5) * (1 - (this.T.knockResist || 0));
      this.vx += kx / l * kb; this.vz += kz / l * kb; if (this.onGround) this.vy = Math.max(this.vy, 4.5 * (1 - (this.T.knockResist || 0)));
      this.panicT = 4; this.fleeFrom = src.attacker;
    }
    if (src.element === 'fire' && !this.T.fireImmune) this.burn = Math.max(this.burn, 3);
    if (src.element === 'frost') this.slowT = 3;
    if (this.health <= 0) this.die(src);
    return dmg;
  }
  die(src) {
    this.deathTime = 0.0001;
    const g = this.game;
    const roll = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    if (!this.baby) for (const [id, a, b, ch] of (this.T.drops || [])) {   // (0.9.0.54) villagers and guards have none
      if (Math.random() < ch) { const n = roll(a, b); if (n > 0) g.dropItem(mkStack(id, n), this.x, this.y + 0.5, this.z, true); }
    }
    if (this.T.woolly && !this.sheared && !this.baby) g.dropItem(mkStack(this.color === 'white' ? 'wool' : this.color + '_wool', 1), this.x, this.y + 0.5, this.z, true);
    if (this.type === 'cinder_golem') {
      const flags = g.meta.flags;
      if (!flags.golemSlain || Math.random() < 0.35) g.dropItem(mkStack('ember_blade', 1), this.x, this.y + 1, this.z, true);
      // (0.9.0.24) a heart crystal the first time; after that only now and then (no farming him for hearts)
      if (!flags.golemSlain || Math.random() < 0.15) g.dropItem(mkStack('heart_crystal', 1), this.x, this.y + 1, this.z, true);
      flags.golemSlain = (flags.golemSlain || 0) + 1;
      g.onBossDefeated(this);
    }
    if (src.attacker && src.attacker.grantXP) { src.attacker.grantXP(this.T.xp, this.x, this.y + this.h, this.z); if (src.attacker.player) src.attacker.player.stats.mobsKilled++; }
  }
  update(dt) {
    const g = this.game, world = g.world;
    if (this.ghost) {
      this.ghostStep(dt);
      if (this.hurtTime > 0) this.hurtTime -= dt;
      if (this.deathTime > 0) this.deathTime += dt;
      const hs = Math.hypot(this.gvx || 0, this.gvz || 0);
      this.walkAmt += (Math.min(1, hs / 2) - this.walkAmt) * Math.min(1, dt * 6);
      this.walk += hs * dt * 3.2;
      return;
    }
    this.age += dt;
    if (this.deathTime > 0) {
      this.deathTime += dt;
      if (this.deathTime > 0.95) { this.remove = true; g.burst(this.x, this.y + this.h / 2, this.z, 'white', 14, 0.6); }
      return;
    }
    if (this.hurtTime > 0) this.hurtTime -= dt;
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.slowT > 0) this.slowT -= dt;
    const c = sampleContacts(world, this);
    if (c.lava && !this.T.fireImmune) { this.hurt(2, { type: 'lava' }); this.burn = 4; }
    if (this.burn > 0) {
      this.burn -= dt;
      this._burnTick = (this._burnTick || 0) + dt;
      if (this._burnTick > 0.8) { this._burnTick = 0; if (!this.T.fireImmune) this.hurt(1, { type: 'burn' }); }
      if (c.water) this.burn = 0;
      if (Math.random() < dt * 12) g.flame(this.x + (Math.random() - 0.5) * this.w * 2, this.y + Math.random() * this.h, this.z + (Math.random() - 0.5) * this.w * 2);
    }
    if (c.cactus) this.hurt(1, {});
    if (this.y < -20) { this.remove = true; return; }
    if ((this.type === 'ghoul' || this.T.undead) && g.dim === 0 && g.env.day > 0.65 && !c.water) {
      const [sky] = this.lightAt(this.h - 0.1);
      if (sky >= 14) this.burn = Math.max(this.burn, 2);
    }

    // AI → desired horizontal direction & speed
    const p = this.aiTarget(g.nearestPawn(this.x, this.y, this.z, 96));   // a player, or a creature it has a quarrel with (game/mobai.js)
    let want = 0, dir = this.yaw;
    const dx = p ? p.x - this.x : 0, dz = p ? p.z - this.z : 0, dist = p ? Math.hypot(dx, dz) : 999, dyp = p ? p.y - this.y : 0;
    const toPlayer = Math.atan2(-dx, -dz);
    this.lookAt = p;
    const ctl = this.controlAI ? this.controlAI(dt, p, dist, dyp, toPlayer) : null;   // a rider or an owner steers first (game/pets.js)
    if (ctl) ({ want, dir } = ctl);
    else if (this.type === 'cinder_golem') {
      ({ want, dir } = this.bossAI(dt, dist, toPlayer, p));
    } else if (this.T.special) {
      ({ want, dir } = this.specialAI(dt, p, dist, dyp, toPlayer));
    } else if (this.T.ai) {
      ({ want, dir } = this.archetypeAI(dt, p, dist, dyp, toPlayer));   // the 0.8 animals (game/bestiary.js)
    } else if (this.T.hostile) {
      const range = this.alertT > 0 ? 40 : 24;
      const canSee = p && dist < range && Math.abs(dyp) < 10 && this.senses(p, dist, dyp, dt, range).hunting;   // it has to notice you first (game/monsters.js)
      if (canSee) {
        // find a way round walls and up steps when it can't just walk straight at you
        const nd = dist > 2.2 ? this.navDir(p.x, p.y, p.z, dt) : null;
        dir = nd ?? toPlayer; want = this.T.speed;
        if (dist < 1.35 + this.w && Math.abs(dyp) < 1.6 && this.attackCd <= 0) {
          this.attackCd = 1.1; this.swingT = 0.3;
          p.hurt(this.T.damage + this.weaponBonus(), { type: 'mob', attacker: this, element: this.type === 'charred_ghoul' ? 'fire' : undefined });
        }
        if (dist < 0.9) want = 0;
        this.soundT -= dt;
        if (this.soundT < 0) { this.soundT = 4 + Math.random() * 6; if (dist < 16) g.sfx.playAt('ghoul', this.x, this.y, this.z); }
      } else { this.wander(dt); ({ want, dir } = this.wanderMove()); }
      if (dist > 72) this.remove = true;
    } else {
      // passive animals: skittish ones bolt when someone comes close (sneaking helps)
      const spooked = this.T.skittish && p && dist < this.T.skittish * (p.sneaking ? 0.45 : 1);
      if (spooked && this.panicT <= 0) { this.panicT = 2.5 + Math.random() * 2; this.fleeFrom = p; }
      const farm = this.T.farm && this.panicT <= 0 ? this.farmAI(dt, p, dist, toPlayer) : null;
      if (farm) ({ want, dir } = farm);
      else if (this.panicT > 0) {
        this.panicT -= dt;
        const f = this.fleeFrom || p;
        // run directly away from whoever spooked us (yaw faces -sin/-cos, so the
        // heading for the vector (dx, dz) is atan2(-dx, -dz)), weaving a little
        let away = this.yaw;
        if (f) { const ax = this.x - f.x, az = this.z - f.z; away = Math.atan2(-ax, -az); }
        // swerve around walls and water instead of running in circles
        if (this.hitWall) this.fleeTurn = (this.fleeTurn || (Math.random() < 0.5 ? -1 : 1));
        else if (this.fleeTurn && Math.random() < dt * 0.8) this.fleeTurn = 0;
        dir = away + (this.fleeTurn || 0) * 0.9 + Math.sin(this.age * 1.7) * 0.18; want = this.T.run || this.T.speed * 2;
      } else { this.wander(dt); ({ want, dir } = this.wanderMove()); }
      this.soundT -= dt;
      if (this.soundT < 0) { this.soundT = 6 + Math.random() * 10; if (dist < 14 && (this.type === 'boar' || this.T.sound)) g.sfx.playAt(this.T.sound || 'boar', this.x, this.y, this.z); }
      if (dist > 110 && !this.kept) this.remove = true;
    }
    // a dropped weapon is worth going back for
    if (this.regrab && this.alive) { const fw = this.fetchWeapon(dt); if (fw) { want = fw.want; dir = fw.dir; } }
    if (this.slowT > 0) want *= 0.5;
    if (this.crawling) want *= 0.35;
    if (this.limp) want *= Math.max(0.3, 1 - this.limp * 0.25);
    this.lastWant = want;
    const turn = ((dir - this.yaw + Math.PI * 3) % TAU) - Math.PI;
    this.yaw += turn * Math.min(1, dt * 8);
    let tx = -Math.sin(this.yaw) * want, tz = -Math.cos(this.yaw) * want;
    if (this.T.hopper) {
      // rabbits move in hops
      this.hopT -= dt;
      if (!this.onGround || want < 0.1) { tx *= this.onGround ? 0 : 1; tz *= this.onGround ? 0 : 1; }
      if (this.onGround && want > 0.1 && this.hopT <= 0) { this.vy = 5.2; this.hopT = 0.25; }
    }
    const k = Math.min(1, dt * (this.onGround ? 10 : 2));
    if (!this.lockMove) { this.vx += (tx - this.vx) * k; this.vz += (tz - this.vz) * k; }
    if (this.noGrav && this.flyVy !== undefined) this.vy += (this.flyVy - this.vy) * Math.min(1, dt * 4);   // flying: the AI picks the climb
    else if (c.water && this.T.swims) this.vy += ((this.swimVy || 0) - this.vy) * Math.min(1, dt * 3);   // swimming: free to dive and rise
    else if (c.water) { this.vy += 18 * dt; if (this.vy > 2) this.vy = 2; this.vy -= 6 * dt; }
    else if (!this.noGrav) this.vy -= GRAVITY * dt;
    if (this.T.floaty && this.vy < -2.2) this.vy = -2.2;
    if (this.T.farm) this.farmTick(dt);
    const wasGround = this.onGround;
    if (this.wantJump) { if (this.onGround && !this.noGrav) this.vy = this.T.hopper ? 6 : 7.8; this.wantJump = false; }
    if (this.pinned) { this.vx = this.vy = this.vz = 0; this.onGround = true; this.hitWall = false; }   // sitting or lying down (game/villagers.js): held still
    else moveEntity(world, this, dt);
    // walked into something: hop up only if it's a step it can get onto (not a fence, a wall or a person)
    if (this.hitWall && this.onGround && want > 0 && !(this.T.swims && !this.T.walks && c.water) && this.stepAhead()) this.vy = this.T.hopper ? 6 : 7.8;
    if (!wasGround && this.onGround && this.type === 'cinder_golem' && this._fallV < -8) g.shake(0.3, this);
    // a little crouch on landing; the head turns to watch someone nearby
    if (!wasGround && this.onGround && this._fallV < -5) this.landT = 0.18;
    if (this.landT > 0) this.landT -= dt;
    this.inWater = !!c.water;
    this.speedNow = Math.hypot(this.vx, this.vz);
    const watch = p && (this.T.hostile ? dist < 18 : (dist < 7 && this.panicT <= 0 && !this.fleeing)) ? p : null;
    rigLook(this, watch, dt);
    this.idleHabits(dt, want);
    this._fallV = this.vy;
    const hs = Math.hypot(this.vx, this.vz);
    this.walkAmt += (Math.min(1, hs / 2) - this.walkAmt) * Math.min(1, dt * 6);
    this.walk += hs * dt * (this.type === 'deer' ? 2.2 : 3.2);
    if (this.swingT > 0) this.swingT -= dt;
  }
  // Grazing heads-down (and sheep regrow their wool on grass), chickens pecking at the ground.
  idleHabits(dt, want) {
    if (this.grazeT > 0) {
      this.grazeT -= dt;
      if (this.grazeT <= 0 && this.type === 'sheep' && this.sheared) {
        const w = this.game.world, x = Math.floor(this.x), y = Math.floor(this.y) - 1, z = Math.floor(this.z);
        if (w.getBlock(x, y, z) === B.grass) { w.setBlock(x, y, z, B.dirt, 0); this.sheared = false; }
      }
    } else if (this.T.grazer && this.onGround && want < 0.1 && this.panicT <= 0 && Math.random() < dt * 0.12) {
      this.grazeT = this.grazeMax = 1.6 + Math.random() * 1.8;
    }
    if (this.peckT > 0) this.peckT -= dt;
    else if ((this.type === 'chicken' || this.T.pecker) && this.onGround && want < 0.1 && Math.random() < dt * 0.5) this.peckT = 0.35;
    if (this.flutterT > 0) this.flutterT -= dt;
  }
  wander(dt) {
    this.wanderT -= dt;
    if (this.wanderT <= 0) { this.wanderT = 2 + Math.random() * 5; this.wanderOn = Math.random() < 0.55; this.wanderDir = Math.random() * TAU; }
  }
  wanderMove() { return this.wanderOn ? { want: this.T.speed * 0.6, dir: this.wanderDir } : { want: 0, dir: this.yaw }; }

  // ---- Cinder Golem: telegraphed attacks -------------------------------------------
  // Every attack is announced first: a ground marker shows where it will land
  // and how long until it does, so a careful player can always dodge.
  bossAI(dt, dist, toPlayer, p) {
    const g = this.game;
    const enraged = this.health < this.maxHealth * 0.5;
    if (enraged && !this.enragedOnce) { this.enragedOnce = true; g.sfx.playAt('roar', this.x, this.y, this.z); g.toastAll('The Cinder Golem is enraged!', 'boss'); g.shake(0.5, this); }
    this.stateT -= dt;
    this.lockMove = false;
    if (this.state === 'spawning') {
      this.lockMove = true; this.vx = this.vz = 0;
      if (Math.random() < dt * 30) g.flame(this.x + (Math.random() - 0.5) * 2, this.y + Math.random() * 3, this.z + (Math.random() - 0.5) * 2);
      if (this.stateT <= 0) { this.state = 'chase'; this.stateT = 1.2; }
      return { want: 0, dir: toPlayer };
    }
    if (!p || dist > 48) return { want: 0, dir: this.yaw };
    this.target = p;
    const tf = enraged ? 0.68 : 1;
    switch (this.state) {
      case 'idle': case 'chase': {
        if (this.stateT <= 0) {
          const r = Math.random();
          if (dist < 6 && r < 0.55) this.beginAttack('slam', 1.25 * tf);
          else if (dist > 7 && r < 0.5) this.beginAttack('charge', 1.0 * tf, toPlayer);
          else this.beginAttack('volley', 0.95 * tf);
        }
        return { want: dist > 4 ? this.T.speed : 0, dir: toPlayer };
      }
      case 'tele': {
        this.lockMove = true; this.vx *= 0.8; this.vz *= 0.8;
        const a = this.attack;
        a.progress = clamp(1 - this.stateT / a.tele, 0, 1);
        if (a.kind === 'charge') return { want: 0, dir: a.yaw };
        if (this.stateT <= 0) this.executeAttack(enraged);
        return { want: 0, dir: a.kind === 'volley' ? toPlayer : this.yaw };
      }
      case 'charging': {
        this.lockMove = true;
        const a = this.attack;
        this.vx = -Math.sin(a.yaw) * 13; this.vz = -Math.cos(a.yaw) * 13;
        if (Math.random() < dt * 40) g.flame(this.x, this.y + 0.3, this.z);
        for (const q of g.pawns()) {
          if (q.dead || a.hit.has(q)) continue;
          if (Math.abs(q.x - this.x) < this.w + 0.6 && Math.abs(q.z - this.z) < this.w + 0.6 && Math.abs(q.y - this.y) < 2.5) {
            a.hit.add(q); q.hurt(7, { type: 'mob', attacker: this, knock: 12, element: 'fire' });
          }
        }
        if (this.stateT <= 0 || (this.hitWall && this.age - a.start > 0.15)) {
          if (this.hitWall) { g.shake(0.4, this); g.sfx.playAt('thud', this.x, this.y, this.z); }
          this.state = 'recover'; this.stateT = 1.1 * tf; this.attack = null;
        }
        return { want: 0, dir: a.yaw };
      }
      case 'volleying': {
        this.lockMove = true;
        const a = this.attack;
        a.t -= dt;
        if (a.t <= 0 && a.left > 0) {
          a.left--; a.t = 0.2;
          const ex = this.x - Math.sin(this.yaw) * 1.1, ey = this.y + 2.3, ez = this.z - Math.cos(this.yaw) * 1.1;
          const lead = 0.25 * a.left;
          const tx = p.x + (p.vx || 0) * lead - ex, ty = p.y + 1.0 - ey, tz = p.z + (p.vz || 0) * lead - ez, l = Math.hypot(tx, ty, tz) || 1;
          g.addEntity(new Projectile(g, ex, ey, ez, tx / l * 14, ty / l * 14, tz / l * 14, 'fireball', this));
          g.sfx.playAt('fireball', ex, ey, ez);
        }
        if (a.left <= 0 && a.t <= 0) { this.state = 'recover'; this.stateT = 0.9 * tf; this.attack = null; }
        return { want: 0, dir: toPlayer };
      }
      case 'recover': default:
        if (this.stateT <= 0) { this.state = 'chase'; this.stateT = (enraged ? 0.8 : 1.6) + Math.random() * 0.8; }
        return { want: this.T.speed * 0.5, dir: toPlayer };
    }
  }
  beginAttack(kind, tele, yaw) {
    this.state = 'tele'; this.stateT = tele;
    this.attack = { kind, tele, progress: 0, yaw: yaw ?? this.yaw, start: this.age, hit: new Set() };
    if (kind === 'charge') this.yaw = yaw;
    this.game.sfx.playAt(kind === 'charge' ? 'charge' : 'warn', this.x, this.y, this.z);
  }
  executeAttack(enraged) {
    const g = this.game, a = this.attack;
    if (a.kind === 'slam') {
      g.sfx.playAt('slam', this.x, this.y, this.z); g.shake(0.6, this);
      const R = 4.6;
      for (let i = 0; i < 40; i++) {
        const ang = Math.random() * TAU, r = Math.random() * R;
        g.burst(this.x + Math.cos(ang) * r, this.y + 0.2, this.z + Math.sin(ang) * r, 'golem_rock', 1, 0.9);
      }
      for (const q of g.pawns()) {
        const d = Math.hypot(q.x - this.x, q.z - this.z);
        if (!q.dead && d < R + 0.3 && Math.abs(q.y - this.y) < 2.2) { q.hurt(enraged ? 8 : 7, { type: 'mob', attacker: this, knock: 9 }); q.knock(0, 7, 0); }
      }
      this.state = 'recover'; this.stateT = 1.3; this.attack = null;
    } else if (a.kind === 'charge') {
      this.state = 'charging'; this.stateT = 1.15; a.start = this.age;
      g.sfx.playAt('roar', this.x, this.y, this.z);
    } else {
      this.state = 'volleying'; a.left = enraged ? 5 : 3; a.t = 0;
    }
  }
  telegraphDecal() {
    const a = this.attack;
    if (!a || this.state !== 'tele') return null;
    if (a.kind === 'slam') return { x: this.x, y: this.groundY(), z: this.z, sx: 4.6, sz: 4.6, shape: 0, progress: a.progress, color: [1, 0.25, 0.1, 0.9] };
    if (a.kind === 'charge') return { x: this.x, y: this.groundY(), z: this.z, yaw: a.yaw + Math.PI, sx: 1.4, sz: 14, shape: 1, progress: a.progress, color: [1, 0.45, 0.1, 0.9] };
    return null;
  }
  groundY() {
    const w = this.game.world;
    let y = Math.floor(this.y);
    for (let i = 0; i < 6 && !T_SOLID[w.getBlock(Math.floor(this.x), y - 1, Math.floor(this.z))]; i++) y--;
    return y;
  }
  // Network snapshot (host → guests)
  snap() {
    const a = this.attack;
    return { i: this.id, k: 'm', t: this.type, x: +this.x.toFixed(2), y: +this.y.toFixed(2), z: +this.z.toFixed(2), r: +this.yaw.toFixed(2), h: Math.round(this.health), s: this.state,
      a: a ? [a.kind, +(a.progress || 0).toFixed(2), +a.yaw.toFixed(2)] : 0, d: this.deathTime > 0 ? 1 : 0, b: this.burn > 0 ? 1 : 0, g: this.stag ? 1 : 0, sh: this.sheared ? 1 : 0, c: this.color, bb: this.baby ? 1 : 0,
      ls: this.lost && this.lost.size ? [...this.lost] : 0, v: this.variant || 0, fl: this.flags ? this.flags() : 0, hi: this.heldItem || 0, oi: this.offItem || 0, sf: this.surfaceTilt ? [+this.surfaceTilt.pitch.toFixed(2), +this.surfaceTilt.roll.toFixed(2)] : 0, cr: this.crawling ? 1 : 0 };
  }
  applySnap(o) {
    this.tx = o.x; this.ty = o.y; this.tz = o.z; this.tyaw = o.r;
    if (o.h < this.health) this.hurtTime = 0.3;
    this.health = o.h; this.state = o.s; this.stag = !!o.g; this.sheared = !!o.sh; if (o.c) this.color = o.c;
    if (o.bb && !this.baby) this.makeBaby(); else if (!o.bb && this.baby) this.grow();
    this.attack = o.a ? { kind: o.a[0], progress: o.a[1], yaw: o.a[2] } : null;
    if (o.d && this.deathTime === 0) this.deathTime = 0.0001;
    if (o.b && Math.random() < 0.3) this.game.flame(this.x, this.y + Math.random() * this.h, this.z);
    if (o.v) this.variant = o.v;
    if (o.fl !== undefined && this.setFlags) this.setFlags(o.fl);
    this.lost = o.ls ? new Set(o.ls) : null; this.heldItem = o.hi || null; this.offItem = o.oi || null; this.crawling = !!o.cr;
    this.surfaceTilt = o.sf ? { pitch: o.sf[0], roll: o.sf[1] } : null;
  }

  // ---- drawing ------------------------------------------------------------------------
  draws(out, viewer) {
    const M = MODELS[this.variant || this.T.model];
    if (!M) return;
    const light = this.lightAt(Math.min(1.5, this.h * 0.6));
    let tint = this.T.tint || null;
    if (this.hurtTime > 0 || this.deathTime > 0) tint = [1, 0.15, 0.1, 0.45];
    if (this.type === 'cinder_golem' && this.state === 'tele') tint = [1, 0.55, 0.15, 0.25 + 0.25 * Math.sin(this.age * 30)];
    if (this.type === 'cinder_golem') light[1] = Math.max(light[1], 12);
    const base = Mat4.create();
    if (this.carried) { Mat4.scale(base, 0.8, 0.8, 0.8); }
    if (this.baby) Mat4.scale(base, 0.55, 0.55, 0.55);
    if (this.type === 'slime' || this.T.slimy) { const s = this.size === 1 ? 0.5 : 1, sq = this.onGround ? 1 : 1 + Math.min(0.25, Math.abs(this.vy) * 0.04); Mat4.scale(base, s / Math.sqrt(sq), s * sq, s / Math.sqrt(sq)); }
    if (this.fuse > 0) { const s = 1 + this.fuse * 0.12 + Math.sin(this.fuse * 40) * 0.015; Mat4.scale(base, s, 1 + this.fuse * 0.05, s); if (Math.sin(this.fuse * 18) > 0.2) tint = [1, 1, 1, 0.55]; }
    const woolTint = this.T.woolly && this.color && this.color !== 'white' ? (() => { const c = COLORS.find(q => q[0] === this.color); const h = hexRGB(c ? c[2] : '#ffffff'); return [h[0] / 255, h[1] / 255, h[2] / 255, 0.62]; })() : null;
    Mat4.rotateY(base, this.yaw);
    if (this.deathTime > 0) {
      // knees go first (render/rigs2.js), then it topples onto its side, with a little bounce
      const k = clamp((this.deathTime - 0.12) / 0.36, 0, 1), fall = k * k, bounce = this.deathTime > 0.48 ? Math.sin(clamp((this.deathTime - 0.48) / 0.16, 0, 1) * Math.PI) * 0.07 : 0;
      const px = -(this.w || 0.3);
      Mat4.translate(base, px, 0, 0); Mat4.rotateZ(base, fall * Math.PI / 2 - bounce); Mat4.translate(base, -px, 0, 0);
    }
    if (M.def.rig) { this.orient(base); this.drawRig(out, M, base, light, tint, woolTint); return; }
    const sw = Math.sin(this.walk) * 0.7 * this.walkAmt;
    const p = this.lookAt || viewer;
    const pitchToPlayer = p ? clamp(Math.atan2(p.y + 1.5 - (this.y + this.h), Math.hypot(p.x - this.x, p.z - this.z)), -0.6, 0.6) : 0;
    const hop = this.T.hopper && !this.onGround && !this.ghost ? 0.6 : (this.T.hopper && this.ghost ? Math.min(0.6, Math.abs(this.ty - this.y) * 4) : 0);
    for (const part of M.parts) {
      if (part.antler && !this.stag) continue;
      if (part.wool && this.sheared) continue;
      if (part.skin && !this.sheared) continue;
      const m = Mat4.create(); m.set(base);
      Mat4.translate(m, part.pivot[0], part.pivot[1], part.pivot[2]);
      let rx = 0;
      if (part.swing) rx += sw * part.swing;
      if (part.hop) rx += hop * part.hop;
      // models face -z, so a positive turn about x lifts a limb forward
      if (part.reach && this.T.hostile) rx += 1.45 - (this.swingT > 0 ? Math.sin(this.swingT / 0.3 * Math.PI) * 0.6 : 0);
      if (part.look) rx += pitchToPlayer * (typeof part.look === 'number' ? part.look : 1);
      if (part.slam && this.attack && this.state === 'tele') {
        if (this.attack.kind === 'slam') rx += Math.PI * 0.95 * this.attack.progress;
        else if (this.attack.kind === 'volley') rx += 1.5 * this.attack.progress;
      }
      if (part.slam && this.state === 'volleying') rx += 1.5;
      if (rx) Mat4.rotateX(m, rx);
      if (part.flap) Mat4.rotateZ(m, part.flap * (this.onGround ? 0.05 : 0.6 + Math.sin(this.age * 30) * 0.5));
      // spider legs: fanned out, bent down, sweeping as it walks
      if (part.yaw0 !== undefined || part.sweep) Mat4.rotateY(m, (part.yaw0 || 0) + (part.sweep ? Math.sin(this.walk * 1.6 + part.sweep[0]) * part.sweep[1] * this.walkAmt : 0));
      if (part.tiltZ) Mat4.rotateZ(m, part.tiltZ + (part.sweep ? Math.max(0, Math.cos(this.walk * 1.6 + part.sweep[0])) * 0.25 * this.walkAmt * Math.sign(part.tiltZ) : 0));
      out.push({ mesh: part.mesh, m, px: this.x, py: this.y, pz: this.z, light, tint: part.wool && woolTint && !tint ? woolTint : tint, noCull: part.noCull, alpha: part.alpha });
    }
  }
}

// Rigged creatures (render/rigs.js): every part placed by the animation, lost parts left out,
// and whatever the creature holds drawn in its right hand.
Object.assign(Mob.prototype, {
  // Spiders on walls and ceilings turn their whole body to the surface they cling to.
  orient(base) {
    const o = this.surfaceTilt;
    if (!o) return;
    const h = (this.h || 1) * 0.5;
    if (o.pitch) { Mat4.translate(base, 0, h, 0); Mat4.rotateX(base, o.pitch); Mat4.translate(base, 0, -h, 0); }
    if (o.roll) { Mat4.translate(base, 0, h, 0); Mat4.rotateZ(base, o.roll); Mat4.translate(base, 0, -h, 0); }
  },
  drawRig(out, M, base, light, tint, woolTint) {
    const mats = rigMatrices(this, M, base);
    for (const part of M.parts) {
      const m = mats[part.name];
      if (!m || !rigPartShown(this, part)) continue;
      // glowing parts (spider eyes, a fuseling's ember cracks) ignore the dark and the fog
      if (part.glow) { out.push({ mesh: part.mesh, m, px: this.x, py: this.y, pz: this.z, light: [15, 15], unlit: true, tint: this.hurtTime > 0 ? tint : null, noCull: true }); continue; }
      out.push({ mesh: part.mesh, m, px: this.x, py: this.y, pz: this.z, light, tint: part.wool && woolTint && !tint ? woolTint : tint, noCull: part.noCull, alpha: part.alpha });
    }
    const held = this.heldItem === 'bow' && this.aiming && typeof bowStage === 'function' ? bowStage(clamp(1 - (this.shootT || 0) / 1.6, 0, 1)) : this.heldItem;   // a skeleton draws its bow
    const hn = this.aiming && held && /^bow/.test(held) ? 'foreL' : 'foreR';   // an archer holds the bow out in the left hand and draws with the right
    if (held && mats[hn] && itemDef(held)) {
      const hand = (M.parts.find(p => p.name === hn) || {}).hand || [0, -5, 0];
      const im = heldMesh(this.game.renderer.gl, held);
      const hm = Mat4.create(); hm.set(mats[hn]);
      const big = M.def.heavy ? 2 : 1;
      Mat4.translate(hm, hand[0] * RPX, hand[1] * RPX, -0.5 * RPX);
      if (big > 1) Mat4.scale(hm, big, big, big);
      if (im.kind === 'block') { Mat4.translate(hm, 0, 0, -1.5 * RPX); Mat4.rotateX(hm, -0.3); Mat4.scale(hm, 0.375, 0.375, 0.375); }
      else Mat4.multiply(hm, hm, heldMat(held));
      out.push({ mesh: im.mesh, m: hm, px: this.x, py: this.y, pz: this.z, light, tint, noCull: im.kind !== 'block' });
    }
    // a second item in the left hand (picked up after losing the right arm)
    const off = this.offItem;
    if (off && mats.foreL && itemDef(off)) {
      const hand = M.parts.find(p => p.name === 'foreL').hand || [0, -5, 0];
      const im = itemMesh(this.game.renderer.gl, off);
      const hm = Mat4.create(); hm.set(mats.foreL);
      Mat4.translate(hm, hand[0] * RPX, hand[1] * RPX, -0.5 * RPX);
      if (im.kind === 'block') { Mat4.rotateX(hm, -0.3); Mat4.scale(hm, 0.375, 0.375, 0.375); }
      else Mat4.multiply(hm, hm, isHandheld(off) ? HELD_TOOL : HELD_ITEM);
      out.push({ mesh: im.mesh, m: hm, px: this.x, py: this.y, pz: this.z, light, tint, noCull: im.kind !== 'block' });
    }
  },
});

// ---- dropped items ------------------------------------------------------------------
const KEEP_DROPS = new Set(['realm_fragment', 'heart_crystal', 'watcher_blade', 'rift_staff', 'ember_blade', 'cinder_core', 'elytra', 'dragon_egg_ender', 'pocket_key']);
class DroppedItem extends Entity {
  constructor(game, stack, x, y, z) {
    super(game, x, y, z);
    this.stack = stack; this.w = 0.15; this.h = 0.3; this.pickupDelay = 0.6; this.spin = Math.random() * TAU;
    this.vx = (Math.random() - 0.5) * 3; this.vz = (Math.random() - 0.5) * 3; this.vy = 3.5;
  }
  fireproof() { const id = this.stack.id; return id.startsWith('cinderite') || id === 'ember_blade' || id === 'cinder_core' || id === 'realm_fragment' || id === 'heart_crystal' || id === 'watcher_blade' || id === 'rift_staff'; }
  update(dt) {
    const g = this.game, w = g.world;
    if (this.ghost) { this.ghostStep(dt); return; }
    this.age += dt;
    if (this.pickupDelay > 0) this.pickupDelay -= dt;
    // Never stay buried: if spawned or pushed inside a block, climb out.
    if (collides(w, this.x - this.w, this.y, this.z - this.w, this.x + this.w, this.y + this.h, this.z + this.w)) this.unstick();
    const c = sampleContacts(w, this);
    if (c.lava && !this.fireproof()) { this.remove = true; g.sfx.playAt('fizz', this.x, this.y, this.z); return; }
    if (c.water) {
      // float up to the surface and bob there
      const by = Math.floor(this.y + 0.15);
      const top = by + liquidHeight(w.getBlock(Math.floor(this.x), by, Math.floor(this.z)), w.getMeta(Math.floor(this.x), by, Math.floor(this.z)), w.getBlock(Math.floor(this.x), by + 1, Math.floor(this.z)));
      const under = this.y + 0.12 < top;
      this.vy += (under ? 14 : -6) * dt;
      this.vy *= Math.max(0, 1 - dt * 3);
      this.vx *= Math.max(0, 1 - dt * 1.5); this.vz *= Math.max(0, 1 - dt * 1.5);
      this.floating = true;
    } else {
      this.vy -= 18 * dt;
      this.floating = false;
    }
    const k = this.onGround ? Math.min(1, dt * 6) : Math.min(1, dt * 0.5);
    this.vx -= this.vx * k; this.vz -= this.vz * k;
    // any player nearby pulls the item in
    if (this.pickupDelay <= 0) {
      let p = null, best = 2.4;
      for (const q of g.pawns()) {
        if (q.dead || q.carrying) continue;
        const d = Math.hypot(q.x - this.x, q.y + 0.8 - this.y, q.z - this.z);
        if (d < best) { best = d; p = q; }
      }
      if (p) {
        const dx = p.x - this.x, dy = (p.y + 0.8) - this.y, dz = p.z - this.z, d = best || 0.01;
        const s = (2.4 - d) * 10 * dt; this.vx += dx / d * s * 8; this.vy += dy / d * s * 8; this.vz += dz / d * s * 8;
        if (d < 0.9) {
          const left = p.give(this.stack);
          if (left <= 0) { this.remove = true; return; }
          this.stack.n = left; this.pickupDelay = 1;
        }
      }
    }
    moveEntity(w, this, dt);
    // a sapling left lying on soil takes root, so forests grow back by themselves
    if (this.onGround && !g.isGuest && !this.floating) {
      if (this.plantT === undefined) this.plantT = 10 + Math.random() * 25;
      if (this.age > this.plantT) { this.plantT = this.age + 15 + Math.random() * 30; this.takeRoot(); if (this.remove) return; }
    }
    if ((this.age > 300 && !KEEP_DROPS.has(this.stack.id)) || this.y < -30) this.remove = true;   // (0.9.0.24) the things that matter never fade
  }
  takeRoot() {
    const g = this.game, w = g.world, d = itemDef(this.stack.id);
    if (!d || !d.block || !g.rules().saplingsPlant) return;
    const bid = B[d.block], b = BLOCKS[bid];
    if (!b || !(b.tree || b.key.endsWith('_propagule') || b.key.endsWith('_fungus'))) return;
    const x = Math.floor(this.x), y = Math.floor(this.y + 0.1), z = Math.floor(this.z);
    const cur = w.getBlock(x, y, z);
    if (cur !== 0 && !(T_REPLACEABLE[cur] && !T_LIQUID[cur])) return;
    const below = w.getBlock(x, y - 1, z);
    const ok = b.key.endsWith('_fungus') ? [B.crimson_nylium, B.warped_nylium, B.soul_soil].includes(below) : SOIL_IDS().includes(below) && below !== B.farmland;
    if (!ok) return;
    // not right next to another sapling or trunk: leave them room to grow
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = BLOCKS[w.getBlock(x + dx, y, z + dz)]; if (n.tree || n.isLog) return; }
    w.setBlock(x, y, z, bid, 0);
    this.stack.n--; if (this.stack.n <= 0) this.remove = true;
  }
  unstick() {
    const w = this.game.world;
    const free = (x, y, z) => !collides(w, x - this.w, y, z - this.w, x + this.w, y + this.h, z + this.w);
    for (let up = 1; up <= 12; up++) {
      const y = Math.floor(this.y) + up + 0.01;
      if (free(this.x, y, this.z)) { this.y = y; this.vy = 0; return; }
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (free(this.x + dx, this.y, this.z + dz)) { this.x += dx; this.z += dz; return; }
  }
  snap() { return { i: this.id, k: 'i', s: this.stack.id, n: this.stack.n, x: +this.x.toFixed(2), y: +this.y.toFixed(2), z: +this.z.toFixed(2) }; }
  applySnap(o) { this.tx = o.x; this.ty = o.y; this.tz = o.z; this.stack.n = o.n; }
  draws(out) {
    const im = itemMesh(this.game.renderer.gl, this.stack.id);
    const light = this.lightAt(0.2);
    const m = Mat4.create();
    // items hover and bob a little above whatever they rest on
    Mat4.translate(m, 0, (this.floating ? 0.05 : 0.22) + Math.sin(this.age * 2.5) * 0.07, 0);
    Mat4.rotateY(m, this.spin + this.age * 1.8);
    // the original's sizes: a quarter-block cube, a half-block picture
    const s = im.kind === 'block' ? 0.25 : 0.5;
    Mat4.scale(m, s, s, s);
    out.push({ mesh: im.mesh, m, px: this.x, py: this.y, pz: this.z, light, noCull: im.kind !== 'block' });
    // bigger stacks show more copies (2, 3, 4 or 5), a little scattered
    const n = this.stack.n, copies = n > 48 ? 5 : n > 32 ? 4 : n > 16 ? 3 : n > 1 ? 2 : 1;
    for (let c = 1; c < copies; c++) {
      const m2 = Mat4.create(); m2.set(m);
      if (im.kind === 'block') Mat4.translate(m2, Math.sin(c * 2.4) * 0.45, c * 0.35, Math.cos(c * 2.4) * 0.45);
      else Mat4.translate(m2, Math.sin(c * 2.4) * 0.12, Math.cos(c * 1.7) * 0.1, -c * 0.12);
      out.push({ mesh: im.mesh, m: m2, px: this.x, py: this.y, pz: this.z, light, noCull: im.kind !== 'block' });
    }
  }
}

// ---- projectiles -----------------------------------------------------------------------
class Projectile extends Entity {
  constructor(game, x, y, z, vx, vy, vz, kind, owner) {
    super(game, x, y, z); this.vx = vx; this.vy = vy; this.vz = vz; this.kind = kind; this.owner = owner; this.w = 0.2; this.h = 0.4;
  }
  update(dt) {
    const g = this.game;
    if (this.ghost) { this.ghostStep(dt); if (Math.random() < dt * 40) g.flame(this.x, this.y, this.z); return; }
    this.age += dt;
    if (this.age > 5) { this.remove = true; return; }
    for (let s = 0; s < 3; s++) {
      this.x += this.vx * dt / 3; this.y += this.vy * dt / 3; this.z += this.vz * dt / 3;
      for (const p of g.pawns()) {
        if (!p.dead && Math.abs(p.x - this.x) < 0.55 && Math.abs(p.z - this.z) < 0.55 && this.y > p.y - 0.2 && this.y < p.y + 1.9) {
          p.hurt(4, { type: 'projectile', attacker: this.owner, element: 'fire', knock: 4 });
          p.ignite(2.5);
          this.explode(); return;
        }
      }
      if (T_SOLID[g.world.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))]) { this.explode(); return; }
    }
    if (Math.random() < dt * 40) g.flame(this.x, this.y, this.z);
  }
  explode() { this.remove = true; this.game.burst(this.x, this.y, this.z, 'fireball', 10, 0.8); this.game.sfx.playAt('burn', this.x, this.y, this.z); }
  snap() { return { i: this.id, k: 'p', x: +this.x.toFixed(2), y: +this.y.toFixed(2), z: +this.z.toFixed(2) }; }
  applySnap(o) { this.tx = o.x; this.ty = o.y; this.tz = o.z; }
  draws() {}
  glow(out) { out.push({ x: this.x, y: this.y, z: this.z, size: 0.35, uv: tileUV(ATLAS.tile.fireball), light: 0xFF }); }
}

// ---- felled trees ---------------------------------------------------------------------
// The whole tree tips over around its stump, then breaks into drops that land
// on the ground where the trunk fell (on top of hills and slopes too).
class FallingTree extends Entity {
  dispose() { if (this.mesh) { freeVAO(this.game.renderer.gl, this.mesh); this.mesh = null; } }   // (0.9.0.54) its mesh was never freed: every felled tree leaked one
  constructor(game, blocks, pivot, dirYaw, drops) {
    super(game, pivot[0], pivot[1], pivot[2]);
    this.blocks = blocks; this.drops = drops; this.dirYaw = dirYaw; this.t = 0;
    const mb = new MeshBuilder(blocks.length * 24);
    for (const b of blocks) {
      const x = b.x - pivot[0], y = b.y - pivot[1], z = b.z - pivot[2];
      mb.sway = 0; mb.tint = BLOCKS[b.id].tint === 'foliage' ? TINT_FOLIAGE : TINT_GRASS;
      addBox(mb, [x, y, z], [x + 1, y + 1, z + 1], BLOCK_FACES[b.id]);
    }
    const r = mb.result();
    this.mesh = makeVAO(game.renderer.gl, r.verts, r.idx);
    this.height = Math.max(...blocks.map(b => b.y)) - pivot[1] + 1;
  }
  // Highest standable point under (x, z), searching down from above the canopy.
  landingY(x, z) {
    const w = this.game.world;
    const bx = Math.floor(x), bz = Math.floor(z);
    for (let y = Math.min(CH - 2, Math.floor(this.y + this.height + 3)); y > 0; y--) {
      const id = w.getBlock(bx, y, bz);
      if (T_SOLID[id] || T_LIQUID[id]) return y + 1.05;
    }
    return this.y + 1;
  }
  update(dt) {
    this.t += dt;
    if (this.t >= 1.1 && !this.done) {
      this.done = true;
      const g = this.game;
      g.sfx.playAt('fell', this.x, this.y, this.z); g.shake(0.25, this);
      const fx = -Math.sin(this.dirYaw), fz = -Math.cos(this.dirYaw);
      for (const st of this.drops) {
        const d = 1 + Math.random() * Math.max(1, this.height - 1);
        const x = this.x + 0.5 + fx * d + (Math.random() - 0.5), z = this.z + 0.5 + fz * d + (Math.random() - 0.5);
        g.dropItem(st, x, this.landingY(x, z), z, false);
      }
      for (let i = 0; i < 24; i++) {
        const d = Math.random() * this.height;
        const x = this.x + 0.5 + fx * d, z = this.z + 0.5 + fz * d;
        g.burst(x, this.landingY(x, z) + 0.2, z, BLOCKS[this.blocks[Math.floor(Math.random() * this.blocks.length)].id].key, 1, 0.8);
      }
      freeVAO(g.renderer.gl, this.mesh);
      this.remove = true;
    }
  }
  draws(out) {
    if (this.done) return;
    const k = Math.min(1, this.t / 1.1);
    const ang = (k * k) * Math.PI / 2;
    const m = Mat4.create();
    Mat4.translate(m, 0.5, 0, 0.5);
    Mat4.rotateY(m, this.dirYaw);
    Mat4.rotateX(m, -ang);
    Mat4.rotateY(m, -this.dirYaw);
    Mat4.translate(m, -0.5, 0, -0.5);
    const l = this.game.world.getLight(Math.floor(this.x), Math.floor(this.y) + 1, Math.floor(this.z));
    out.push({ mesh: this.mesh, m, px: this.x, py: this.y, pz: this.z, light: [l >> 4, l & 15], noCull: true });
  }
}

// ---- particles -------------------------------------------------------------------------
class Particles {
  constructor() { this.list = []; }
  add(p) { if (this.list.length < 900) this.list.push(p); }
  update(dt, world) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
      if (p.hang > 0) { p.hang -= dt; continue; }          // a drip gathering before it falls
      if (p.flutter) { const t = p.life * 2.4 + p.ph; p.x += Math.sin(t) * p.flutter * dt; p.z += Math.cos(t * 0.8) * p.flutter * 0.7 * dt; }
      p.vy -= p.grav * dt;
      // smoke: rises, and when it meets a ceiling it spreads out underneath and gathers there
      if (p.rise) {
        if (T_SOLID[world.getBlock(Math.floor(p.x), Math.floor(p.y + p.size + p.vy * dt + 0.04), Math.floor(p.z))]) {
          if (!p.pooled) { p.pooled = true; const a = Math.random() * TAU, s = 0.15 + Math.random() * 0.25; p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s; p.life += 2.5; p.max += 2.5; }
          p.vy = Math.min(0, p.vy); p.grav = 0;
          if (T_SOLID[world.getBlock(Math.floor(p.x + p.vx * dt * 4), Math.floor(p.y), Math.floor(p.z + p.vz * dt * 4))]) { p.vx = -p.vx; p.vz = -p.vz; }
        } else if (p.pooled && p.vy <= 0) p.vy = 0.05;
        p.vx *= 1 - dt * 0.3; p.vz *= 1 - dt * 0.3;
        if (p.windX) { p.vx += p.windX * dt; p.vz += p.windZ * dt; }
      }
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      if (p.grav > 0 && T_SOLID[world.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz))]) { p.vx *= 0.3; p.vz *= 0.3; p.vy = 0; }
      else { p.x = nx; p.y = ny; p.z = nz; }
      if (p.grow) { const k = p.life / p.max; p.size = p.size0 * (1 + (1 - k) * p.grow) * (k < 0.2 ? k * 5 : 1); }
      else if (p.shrink) p.size = p.size0 * Math.max(0.1, p.life / p.max);
    }
  }
}

// ---- things set down in the world: item piles & placed backpacks -----------------
// Drawn from block-entity data, so they save with the chunk like chests do.
function blockEntityDraws(game, out, cam, R) {
  const w = game.world, gl = game.renderer.gl;
  const pcx = Math.floor(cam.x) >> 4, pcz = Math.floor(cam.z) >> 4;
  for (const ch of w.chunks.values()) {
    if (!ch.blockEntities.size || Math.abs(ch.cx - pcx) > R || Math.abs(ch.cz - pcz) > R) continue;
    for (const [i, e] of ch.blockEntities) {
      if (e.type !== 'pile' && e.type !== 'backpack' && e.type !== 'sign' && e.type !== 'frame' && e.type !== 'lectern') continue;
      const x = ch.cx * 16 + (i & 15), z = ch.cz * 16 + ((i >> 4) & 15), y0 = i >> 8;
      const l = w.getLight(x, y0, z), light = [l >> 4, l & 15];
      // resting on a bottom half slab: sit half a block lower
      const bl = w.getBlock(x, y0 - 1, z);
      const y = y0 + (T_SHAPE[bl] === SHAPE.SLAB && (w.getMeta(x, y0 - 1, z) & 7) === 0 ? -0.5 : 0);
      if (e.type === 'sign') { signDraws(game, out, x, y, z, ch.blocks[i], ch.meta[i], e, light); continue; }
      if (e.type === 'frame') {
        // the item sits flat in the frame, turned in eighths
        if (!e.item || !itemDef(e.item.id)) continue;
        const f = ch.meta[i] & 3, im = itemMesh(gl, e.item.id), m = Mat4.create();
        const glow = BLOCKS[ch.blocks[i]].frame === 2;
        Mat4.translate(m, 0.5, 0.5, 0.5); Mat4.rotateY(m, [0, -Math.PI / 2, Math.PI, Math.PI / 2][f]);
        Mat4.translate(m, 0, 0, -0.5 + Math.max(0.09, (im.depth || 0) * 0.55 + 0.07)); Mat4.rotateZ(m, -(e.rot || 0) * Math.PI / 4);   // (0.9.0.12) thick things stand out from the frame
        if (im.kind === 'block') Mat4.scale(m, 0.36, 0.36, 0.36);
        else Mat4.scale(m, 0.55, 0.55, 0.55);
        out.push({ mesh: im.mesh, m, px: x, py: y0, pz: z, light: glow ? [15, 15] : light, noCull: true });
        continue;
      }
      if (e.type === 'lectern') {
        if (!e.book) continue;
        const im = itemMesh(gl, 'book'), m = Mat4.create(), f = ch.meta[i] & 3;
        Mat4.translate(m, 0.5, 15.4 / 16, 0.5); Mat4.rotateY(m, [0, -Math.PI / 2, Math.PI, Math.PI / 2][f]); Mat4.rotateX(m, -Math.PI / 2 + 0.35); Mat4.scale(m, 0.6, 0.6, 0.6);
        out.push({ mesh: im.mesh, m, px: x, py: y0, pz: z, light, noCull: true });
        continue;
      }
      if (e.type === 'pile') {
        // set down in the world, Vintage Story style: blocks stack up, ingots and bricks lie in
        // criss-crossed layers, tools lie flat, everything else in a little heap
        (e.items || []).forEach((s, k) => {
          if (!s || !itemDef(s.id)) return;
          const im = itemMesh(gl, s.id), r0 = (e.rot && e.rot[k]) || k * 0.7;
          const ox = (k % 2) * 0.5 + 0.25, oz = Math.floor(k / 2) * 0.5 + 0.25;
          const bar = /ingot|brick|nugget|bar$/.test(s.id), tool = im.kind !== 'block' && isHandheld(s.id);
          const copies = im.kind === 'block' ? Math.min(4, Math.ceil(s.n / 16)) : bar ? Math.min(16, Math.ceil(s.n / 4)) : tool ? 1 : Math.min(5, Math.ceil(s.n / 12));
          for (let c = 0; c < copies; c++) {
            const m = Mat4.create(), j = ((k * 7 + c * 13) % 10) / 10 - 0.5;
            if (im.kind === 'block') { Mat4.translate(m, ox, 0.125 + c * 0.25, oz); Mat4.rotateY(m, r0 + c * 0.25); Mat4.scale(m, 0.25, 0.25, 0.25); }
            else if (bar) { const layer = Math.floor(c / 2), side = c % 2 ? 1 : -1; Mat4.translate(m, ox, 0.03 + layer * 0.055, oz); Mat4.rotateY(m, r0 + (layer % 2) * Math.PI / 2); Mat4.translate(m, side * 0.065, 0, 0); Mat4.rotateX(m, -Math.PI / 2); Mat4.scale(m, 0.36, 0.36, 0.36); }
            else if (tool) { Mat4.translate(m, ox, (im.depth || 0.03) * 0.6 + 0.005, oz); Mat4.rotateY(m, r0 + Math.PI / 4); Mat4.rotateX(m, -Math.PI / 2); Mat4.scale(m, 0.6, 0.6, 0.6); }
            else if (im.stand) { if (c >= 2) break; Mat4.translate(m, ox + (c ? 0.12 : 0) , 0.225, oz + (c ? -0.1 : 0)); Mat4.rotateY(m, r0 + c * 1.3); Mat4.scale(m, 0.45, 0.45, 0.45); }   // (0.9.0.12) bottles, buckets and bowls stand up
            else { const dz = (im.depth || 0.02) * 0.45; Mat4.translate(m, ox + j * 0.05, dz + 0.005 + c * dz * 1.8, oz - j * 0.05); Mat4.rotateY(m, r0 + c * 0.5 + j); Mat4.rotateX(m, -Math.PI / 2); Mat4.scale(m, 0.45, 0.45, 0.45); }
            out.push({ mesh: im.mesh, m, px: x, py: y, pz: z, light, noCull: im.kind !== 'block' });
          }
        });
      } else if (e.stack) {
        const im = itemMesh(gl, e.stack.id);
        const m = Mat4.create();
        if (PACK_LOOK[e.stack.id]) { Mat4.translate(m, 0.5, 0.36, 0.5); Mat4.rotateY(m, (e.yaw || 0) + Math.PI); Mat4.scale(m, 0.64, 0.64, 0.64); }   // standing up, its pouch toward you
        else { Mat4.translate(m, 0.5, 0.42, 0.5); Mat4.rotateY(m, (e.yaw || 0)); Mat4.scale(m, 0.85, 0.85, 0.85); }
        out.push({ mesh: im.mesh, m, px: x, py: y, pz: z, light, noCull: true });
      }
    }
  }
}

// ---- signs ----------------------------------------------------------------------------
// A plank board on a post (standing, 16 rotations) or flat against a wall, with
// the text painted onto a small texture that is remade only when it changes.
const SIGN_CACHE = { meshes: {}, text: new Map() };
function signMeshes(gl, id) {
  const key = BLOCKS[id].key;
  if (SIGN_CACHE.meshes[key]) return SIGN_CACHE.meshes[key];
  const t = BLOCK_FACES[id][0];
  const mk = (min, max) => { const mb = new MeshBuilder(32); addBox(mb, min, max, [t, t, t, t, t, t]); const r = mb.result(); return makeVAO(gl, r.verts, r.idx); };
  const quad = (() => { const mb = new MeshBuilder(4); const a = mb.vert(-0.5, -0.25, 0, 0, 1, 255, 0, 255), b = mb.vert(0.5, -0.25, 0, 1, 1, 255, 0, 255), c = mb.vert(0.5, 0.25, 0, 1, 0, 255, 0, 255), d = mb.vert(-0.5, 0.25, 0, 0, 0, 255, 0, 255); mb.quad(a, b, c, d, false); const r = mb.result(); return makeVAO(gl, r.verts, r.idx); })();
  return (SIGN_CACHE.meshes[key] = { board: mk([-0.5, -0.25, -1 / 24], [0.5, 0.25, 1 / 24]), post: mk([-1 / 24, 0, -1 / 24], [1 / 24, 0.58, 1 / 24]), quad });
}
function signTexture(gl, lines) {
  const sig = lines.join('\n');
  let t = SIGN_CACHE.text.get(sig);
  if (t) return t;
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = '#1e140c'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '600 13px "Pixelify Sans", ui-monospace, monospace';
  lines.forEach((ln, i) => c.fillText(String(ln || '').slice(0, 16), 64, 9 + i * 15.5, 124));
  t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (SIGN_CACHE.text.size > 200) { for (const v of SIGN_CACHE.text.values()) gl.deleteTexture(v); SIGN_CACHE.text.clear(); }
  SIGN_CACHE.text.set(sig, t);
  return t;
}
function signDraws(game, out, x, y, z, id, meta, e, light) {
  const gl = game.renderer.gl, M = signMeshes(gl, id);
  const wall = (meta & 16) !== 0;
  const base = Mat4.create();
  Mat4.translate(base, 0.5, 0, 0.5);
  if (wall) {
    const f = meta & 3; // the wall is in direction f; the sign faces away from it
    Mat4.rotateY(base, [0, -Math.PI / 2, Math.PI, Math.PI / 2][f]);
    Mat4.translate(base, 0, 0.5, -0.5 + 1 / 24 + 0.002);
  } else {
    Mat4.rotateY(base, (meta & 15) / 16 * TAU);
    const pm = Mat4.create(); pm.set(base);
    out.push({ mesh: M.post, m: pm, px: x, py: y, pz: z, light });
    Mat4.translate(base, 0, 0.58 + 0.25, 0);
  }
  out.push({ mesh: M.board, m: base, px: x, py: y, pz: z, light });
  if (e.lines && e.lines.some(Boolean)) {
    const tex = signTexture(gl, e.lines);
    for (const side of wall ? [1] : [1, -1]) {
      const tm = Mat4.create(); tm.set(base); if (side < 0) Mat4.rotateY(tm, Math.PI);
      Mat4.translate(tm, 0, 0, 1 / 24 + 0.004); Mat4.scale(tm, 0.94, 0.94, 1);
      out.push({ mesh: M.quad, m: tm, px: x, py: y, pz: z, light, tex });
    }
  }
}
