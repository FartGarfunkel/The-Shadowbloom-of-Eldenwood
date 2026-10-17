// ---------------------------------------------------------------------------
// game/nightmobs.js — the classic night creatures that join the ghoul:
//   skeletons   keep their distance and shoot arrows; burn in sunlight
//   spiders     fast, climb walls, pounce; leave you be in daylight unless hit
//   fuselings   creep up, hiss, and burst (the mob-griefing rule decides
//               whether the blast breaks blocks)
//   slimes      hop about deep underground; big ones split when killed
// ---------------------------------------------------------------------------

Object.assign(MOB_TYPES, {
  skeleton: { model: 'skeleton', label: 'a skeleton', held: 'bow', hp: 20, w: 0.3, h: 1.95, speed: 2.5, xp: 6, hostile: true, special: true, damage: 2, undead: true, ranged: true, drops: [['bone', 0, 2, 1], ['arrow', 0, 2, 1]] },
  spider: { model: 'spider', label: 'a spider', hp: 16, w: 0.62, h: 0.9, speed: 3.6, xp: 6, hostile: true, special: true, damage: 2, climber: true, drops: [['string', 0, 2, 1]] },
  fuseling: { model: 'fuseling', label: 'a fuseling', hp: 20, w: 0.32, h: 1.45, speed: 2.4, xp: 6, hostile: true, special: true, damage: 0, drops: [['gunpowder', 0, 2, 1]] },
  slime: { model: 'slime', label: 'a slime', hp: 12, w: 0.5, h: 1.0, speed: 2.0, xp: 4, hostile: true, special: true, damage: 2, hopper: true, drops: [['slime_ball', 0, 2, 1]] },
});

// Animals that stop to graze now and then.
for (const k of ['cow', 'sheep', 'deer', 'boar', 'rabbit']) if (MOB_TYPES[k]) MOB_TYPES[k].grazer = true;

// Their bodies are rigs in render/rigdefs.js.

Object.assign(Mob.prototype, {
  // AI for the four night creatures: how fast and which way they want to go.
  specialAI(dt, p, dist, dyp, toPlayer) {
    const g = this.game, T = this.T;
    if (this.type === 'slime' && !this.size) this.setSize(2);
    this.soundT -= dt;
    const near = p && dist < 20 && Math.abs(dyp) < 10;
    // looking costs a ray through the blocks, so only look a few times a second
    this._losT = (this._losT || 0) - dt;
    if (this._losT <= 0) { this._losT = 0.2 + Math.random() * 0.1; this._sees = near && this.lineOfSight(p); }
    const sees = near && this._sees;
    if (dist > 72) this.remove = true;
    if (this.type === 'skeleton') {
      if (!near) { this.wander(dt); return this.wanderMove(); }
      if (this.soundT < 0) { this.soundT = 5 + Math.random() * 6; if (dist < 16) g.sfx.playAt(this.T.voice || 'rattle', this.x, this.y, this.z); }
      this.shootT = (this.shootT ?? 1 + Math.random()) - dt;
      this.aiming = !!(sees && dist < 16 && this.heldItem === 'bow');
      if (!this.heldItem) { this.meleeAt(p, dist, dyp); return { want: dist < 0.9 ? 0 : T.speed, dir: toPlayer }; }   // lost its bow: comes at you
      if (this.aiming && this.shootT <= 0) { this.shootT = 1.6 + Math.random() * 1.2; this.shootAt(p); }
      this.strafeT = (this.strafeT || 0) - dt;
      if (this.strafeT <= 0) { this.strafeT = 1.5 + Math.random() * 2; this.strafe = Math.random() < 0.5 ? -1 : 1; }
      if (!sees || dist > 11) return { want: T.speed, dir: this.navDir(p.x, p.y, p.z, dt) ?? toPlayer };
      if (dist < 5) return { want: T.speed * 0.9, dir: toPlayer + Math.PI + this.strafe * 0.4 };
      return { want: T.speed * 0.45, dir: toPlayer + this.strafe * Math.PI / 2 };
    }
    if (this.type === 'spider') return this.spiderAI(dt, p, dist, dyp, toPlayer, near);
    if (this.type === 'fuseling') {
      this.fuse = this.fuse || 0;
      if (near && dist < 2.8 && Math.abs(dyp) < 2.2 && sees) {
        if (this.fuse === 0) g.sfx.playAt('hiss', this.x, this.y, this.z, 20);
        this.fuse += dt;
        if (this.fuse >= 1.5) { this.fuseBurst(); return { want: 0, dir: toPlayer }; }
        return { want: 0, dir: toPlayer };
      }
      if (this.fuse > 0) this.fuse = Math.max(0, this.fuse - dt * 1.5);
      if (!near) { this.wander(dt); return this.wanderMove(); }
      return { want: T.speed, dir: (dist > 2.2 ? this.navDir(p.x, p.y, p.z, dt) : null) ?? toPlayer };
    }
    if (this.type === 'slime') {
      if (this.soundT < 0 || (this.onGround && !this._wasGround)) { this.soundT = 3 + Math.random() * 4; if (dist < 14) g.sfx.playAt(this.T.voice || 'squish', this.x, this.y, this.z); }
      this._wasGround = this.onGround;
      if (!near) { this.wander(dt); return this.wanderMove(); }
      if (this.size > 1) this.meleeAt(p, dist, dyp);
      return { want: T.speed * (this.size > 1 ? 1 : 1.2), dir: toPlayer };
    }
    this.wander(dt); return this.wanderMove();
  },
  // Spiders: on the ground, up walls, and upside down along ceilings. They climb whatever they
  // walk into; reaching a roof they carry on across it, and drop onto whoever passes underneath.
  spiderAI(dt, p, dist, dyp, toPlayer, near) {
    const g = this.game, w = g.world, T = this.T;
    const solid = (x, y, z) => !!T_SOLID[w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))];
    const [sky] = this.lightAt(0.5);
    const angry = this.panicT > 0 || g.env.day < 0.5 || sky < 10;
    if (this.panicT > 0) this.panicT -= dt;
    this.surf = this.surf || 'ground';
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), reach = this.w + 0.18;
    const front = (dy) => solid(this.x + fx * reach, this.y + dy, this.z + fz * reach);
    const roofAt = (x, z) => solid(x, this.y + this.h + 0.15, z);
    const land = () => { this.surf = 'ground'; this.noGrav = false; this.climbing = false; };
    if (this.burn > 0 || this.hurtTime > 0.3) { if (this.surf !== 'ground') land(); }
    let res = null;
    if (this.surf === 'ground') {
      // walked into a wall: up it goes
      if (this.hitWall && (this.lastWant || 0) > 0.5 && front(0.3)) { this.surf = 'wall'; this.wallYaw = this.yaw; }
    }
    if (this.surf === 'wall') {
      this.noGrav = true; this.climbing = true;
      if (!front(0.15) && !front(this.h * 0.6)) {                 // over the top
        land(); this.vy = 3.2; this.vx += fx * 2.5; this.vz += fz * 2.5;
      } else if (roofAt(this.x, this.z)) this.surf = 'ceil';      // a roof: carry on upside down
      else {
        const down = p && angry && near && dyp < -1.5 && dist < 4;
        this.vy = down ? -2.4 : 2.7;
        if (down && this.onGround) land();
        res = { want: 0.7, dir: this.wallYaw };                  // keep pressing against the wall
      }
    }
    if (this.surf === 'ceil') {
      this.noGrav = true; this.climbing = true; this.vy = 1.4;
      if (!roofAt(this.x, this.z)) land();                         // ran out of roof: fall
      else if (p && angry && near && Math.hypot(p.x - this.x, p.z - this.z) < 1.5 && dyp < -0.5) {
        land(); this.vy = -2; this.pounceCd = 0.4;                // drop onto them
        g.sfx.playAt('spider', this.x, this.y, this.z);
      } else {
        let dir = near && angry ? toPlayer : (this.wander(dt), this.wanderDir);
        // never walk off the edge of the roof: turn back instead
        const nx = this.x - Math.sin(dir) * 0.8, nz = this.z - Math.cos(dir) * 0.8;
        if (!roofAt(nx, nz)) { dir += Math.PI; this.wanderDir = dir; }
        res = { want: T.speed * (near && angry ? 0.85 : 0.4), dir };
      }
    }
    // the body turns to the surface it clings to
    const tp = this.surf === 'wall' ? Math.PI / 2 : 0, tr = this.surf === 'ceil' ? Math.PI : 0;
    const k = Math.min(1, dt * 9);
    this._tp = (this._tp || 0) + (tp - (this._tp || 0)) * k; this._tr = (this._tr || 0) + (tr - (this._tr || 0)) * k;
    this.surfaceTilt = Math.abs(this._tp) + Math.abs(this._tr) > 0.01 ? { pitch: this._tp, roll: this._tr } : null;
    if (res) return res;
    if (!near || !angry) { this.wander(dt); return this.wanderMove(); }
    if (this.soundT < 0) { this.soundT = 4 + Math.random() * 6; if (dist < 16) g.sfx.playAt(this.T.voice || 'spider', this.x, this.y, this.z); }
    this.pounceCd = (this.pounceCd || 0) - dt;
    // lost legs: slower, and with three or more gone it can't leap any more
    const legsLost = this.lost ? [...this.lost].filter(n => n.startsWith('sleg')).length : 0;
    if (this.onGround && dist < 3.6 && dist > 1.2 && this.pounceCd <= 0 && Math.abs(dyp) < 1.5 && legsLost < 3) {
      this.pounceCd = 1.4 + Math.random() * 0.8;
      const l = dist || 1;
      this.vy = 5.6; this.vx = (p.x - this.x) / l * 7; this.vz = (p.z - this.z) / l * 7;
    }
    this.meleeAt(p, dist, dyp);
    return { want: dist < 0.9 ? 0 : T.speed * Math.max(0.3, 1 - legsLost * 0.12), dir: toPlayer };
  },
  meleeAt(p, dist, dyp) {
    if (dist < 1.35 + this.w && Math.abs(dyp) < 1.6 && this.attackCd <= 0) {
      this.attackCd = 1.1; this.swingT = 0.3;
      p.hurt(this.T.damage * (this.type === 'slime' ? this.size - 1 || 1 : 1) + this.weaponBonus(), { type: 'mob', attacker: this });
    }
  },
  // Can it see you? A ray from its eyes to yours that no solid block stops.
  lineOfSight(p) {
    const ex = this.x, ey = this.y + this.h * 0.85, ez = this.z;
    const tx = p.x - ex, ty = p.y + 1.5 - ey, tz = p.z - ez, l = Math.hypot(tx, ty, tz);
    if (l < 1) return true;
    const hit = raycastBlocks(this.game.world, ex, ey, ez, tx / l, ty / l, tz / l, l, false);
    return !hit || hit.dist >= l - 0.5;
  },
  shootAt(p) {
    const g = this.game, sp = 22;
    const ex = this.x - Math.sin(this.yaw) * 0.4, ey = this.y + 1.45, ez = this.z - Math.cos(this.yaw) * 0.4;
    const tx = p.x - ex, tz = p.z - ez, hd = Math.hypot(tx, tz), t = hd / sp;
    const ty = p.y + 1.2 - ey + 0.5 * 20 * t * t;                           // aim high for the drop
    const l = Math.hypot(tx, ty, tz) || 1, spread = 0.035;
    const a = new Arrow(g, ex, ey, ez, (tx / l + (Math.random() - 0.5) * spread) * sp, (ty / l + (Math.random() - 0.5) * spread) * sp, (tz / l + (Math.random() - 0.5) * spread) * sp, this, 5, false);
    g.addEntity(a);
    g.sfx.playAt('bow', ex, ey, ez);
    this.swingT = 0.3;
  },
  // The fuseling's end: a burst that hurts, and breaks blocks only if mob griefing is on.
  fuseBurst() {
    const g = this.game;
    this.remove = true; this.deathTime = 0.0001;
    g.explode(this.x, this.y + 0.6, this.z, 3, { noBlocks: !g.rules().mobGriefing });
  },
  // Slimes come in two sizes; big ones split into little ones.
  setSize(n) {
    this.size = n; const s = n > 1 ? 1 : 0.5;
    this.w = this.T.w * s; this.h = this.T.h * s;
    if (n === 1) { this.health = this.maxHealth = 4; }
  },
});

// Death: big slimes split.
{
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    baseDie.call(this, src);
    if (this.type === 'slime' && this.size > 1) {
      const g = this.game, n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const m = new Mob(g, 'slime', this.x + (Math.random() - 0.5) * 0.6, this.y + 0.3, this.z + (Math.random() - 0.5) * 0.6);
        m.setSize(1); m.vy = 3; g.addEntity(m);
      }
    }
  };
}

// Arrows from skeletons (and dispensers) can hit players too.
function arrowHitsPawn(arrow, nx, ny, nz) {
  const g = arrow.game;
  if (arrow.owner && arrow.owner.player) return false;                  // a player's own arrows don't hit players
  for (const q of g.pawns()) {
    if (q.dead || q === arrow.owner) continue;
    if (Math.abs(nx - q.x) < 0.4 && Math.abs(nz - q.z) < 0.4 && ny > q.y && ny < q.y + 1.85) {
      const speed = Math.hypot(arrow.vx, arrow.vy, arrow.vz);
      q.hurt(Math.max(1, Math.round(arrow.damage * speed / 30)), { type: 'arrow', attacker: arrow.owner || arrow });
      g.sfx.playAt('hit', q.x, q.y + 1, q.z);
      return true;
    }
  }
  return false;
}
