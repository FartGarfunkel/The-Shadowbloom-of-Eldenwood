// ---------------------------------------------------------------------------
// game/skymobs.js — 0.8.6.4: the Skylands get their own creatures.
//
// Phygs and flying cows (a pig and a cow with little white wings, who drift
// down gently when they fall), sheepuffs (sheep so fluffy they float), all of
// which can be fed, bred and kept like their ground cousins; and at night the
// cockatrice: a tall purple bird that hunts whoever is out on the islands.
// ---------------------------------------------------------------------------
{
  const winged = (src, half) => {
    const d = JSON.parse(JSON.stringify(MODEL_DEFS[src]));
    for (const s of [1, -1]) d.parts.push(rpart('wing' + (s > 0 ? 'R' : 'L'), 'body', [s * half, 3, -2], s > 0 ? [0, 0, -3, 8, 0.6, 5] : [-8, 0, -3, 0, 0.6, 5], 'sky_wing', { side: s, noCull: true }));
    return d;
  };
  if (MODEL_DEFS.pig) MODEL_DEFS.phyg = winged('pig', 5);
  if (MODEL_DEFS.cow) MODEL_DEFS.flying_cow = winged('cow', 6);
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('sky_wing', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H(x % 4 === 0 ? '#d8e4f0' : '#f6f8fc'), 0.94 + p.rand() * 0.1)); });
  };
  const pig = MOB_TYPES.pig || {}, cow = MOB_TYPES.cow || {}, sheep = MOB_TYPES.sheep || {};
  Object.assign(MOB_TYPES, {
    phyg: Object.assign({}, pig, { model: 'phyg', label: 'a phyg', floaty: true, ai: undefined }),
    flying_cow: Object.assign({}, cow, { model: 'flying_cow', label: 'a flying cow', floaty: true, ai: undefined }),
    sheepuff: Object.assign({}, sheep, { model: 'sheep', label: 'a sheepuff', floaty: true, hp: 10, ai: undefined }),
    cockatrice: { model: 'moa', label: 'a cockatrice', hp: 20, w: 0.45, h: 1.8, speed: 3.2, xp: 7, hostile: true, special: true, damage: 4, tint: [0.55, 0.2, 0.75, 0.45], voice: 'moa', sound: 'moa', drops: [['feather', 0, 2, 1], ['chicken', 0, 1, 0.5]] },
  });
  if (SPAWNS.skylands) SPAWNS.skylands.push(['phyg', 5, 1, 3], ['flying_cow', 4, 1, 3], ['sheepuff', 5, 2, 3]);
  MONSTER_AI.cockatrice = function (dt, p, dist, dyp, toPlayer) {
    const s = this.senses(p, dist, dyp, dt, 20);
    this.voiceTick(dt, dist, 4, 6);
    if (!s.hunting) { this.wander(dt); return this.wanderMove(); }
    if (dist < 1.3 + this.w && Math.abs(dyp) < 1.8 && this.attackCd <= 0) { this.attackCd = 1.1; this.swingT = 0.3; p.hurt(this.T.damage, { type: 'mob', attacker: this, knock: 2 }); }
    return { want: dist < 0.9 ? 0 : this.T.speed, dir: (dist > 2.2 ? this.navDir(p.x, p.y, p.z, dt) : null) ?? toPlayer };
  };
  // cockatrices come out on the islands at night
  const baseSpawn = Game.prototype.spawnMobs;
  Game.prototype.spawnMobs = function (...a) {
    const r = baseSpawn.apply(this, a);
    if (this.dim !== DIM.SKYLANDS || (this.env.day ?? 1) > 0.3 || this.isGuest || Math.random() > 0.02) return r;
    const p = this.locals[0] && this.locals[0].player, w = this.world;
    if (!p) return r;
    let n = 0; for (const e of this.entities) if (e.type === 'cockatrice' && e.alive) n++;
    if (n >= 3) return r;
    const ang = Math.random() * TAU, d = 24 + Math.random() * 20, x = Math.floor(p.x + Math.cos(ang) * d), z = Math.floor(p.z + Math.sin(ang) * d);
    for (let y = Math.min(CH - 2, Math.floor(p.y) + 16); y > Math.floor(p.y) - 16; y--) {
      const id = w.getBlock(x, y, z);
      if (!id) continue;
      if (T_SOLID[id] && !w.getBlock(x, y + 1, z) && !w.getBlock(x, y + 2, z) && (w.getLight(x, y + 1, z) & 15) < 8) this.addEntity(new Mob(this, 'cockatrice', x + 0.5, y + 1, z + 0.5));
      break;
    }
    return r;
  };
}
