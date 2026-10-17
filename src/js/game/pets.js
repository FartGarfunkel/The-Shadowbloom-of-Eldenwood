// ---------------------------------------------------------------------------
// game/pets.js — 0.8.4: taming, pets, and riding.
//
// Almost anything can be tamed with the food it likes: a bone for a wolf,
// fish for a cat, seeds for birds, apples for horses, meat for the big cats,
// a slimeball for a baby slime. Offer it (sneak to offer farm animals their
// food, which otherwise sets them breeding); it may take a few tries. Hearts
// mean it's yours.
//
// A pet follows you, catches up if it falls far behind, and fights whatever
// hurts you or whatever you attack (if it has any bite). Use it with an empty
// hand to tell it to stay or to follow (sneak for the ones you can carry,
// since sneaking picks those up). Feed it to heal it. You can't hurt your own
// pet by accident (sneak if you mean to).
//
// Horses, donkeys, llamas, camels, deer, goats, moas, bears and the big cats
// take a saddle (three leather and an iron ingot); then use them to ride.
// WASD to go where you look, jump to jump, sprint to gallop, sneak to get off.
// Pets are saved with the world, saddles and all.
// ---------------------------------------------------------------------------

defItem('saddle', { name: 'Saddle', maxStack: 1, desc: 'Put it on a tamed horse, camel, bear or big cat, then ride.' });
RECIPES.push({ out: 'saddle', n: 1, shape: ['LLL', 'L L', ' I '], key: { L: 'leather', I: 'iron_ingot' }, group: 'tools' });

// What each creature can be tamed with, and the chance each offer works.
const TAME_FOOD = {
  wolf: [['bone'], 0.34], fox: [['sweet_berries', 'glow_berries'], 0.25], snow_fox: [['sweet_berries', 'glow_berries'], 0.25],
  cat: [['cod', 'salmon'], 0.34], ocelot: [['cod', 'salmon'], 0.25], parrot: [['wheat_seeds', 'melon_seeds', 'pumpkin_seeds', 'beetroot_seeds'], 0.34],
  horse: [['apple', 'golden_apple', 'sugar', 'wheat', 'hay_bale'], 0.25], donkey: [['apple', 'golden_apple', 'sugar', 'wheat', 'hay_bale'], 0.3],
  llama: [['wheat', 'hay_bale', 'apple'], 0.3], camel: [['cactus', 'apple'], 0.3], moa: [['wheat_seeds', 'beetroot_seeds'], 0.3],
  pig: [['carrot', 'potato', 'beetroot'], 0.34], boar: [['carrot', 'potato', 'apple'], 0.25], cow: [['wheat'], 0.34], sheep: [['wheat'], 0.34],
  goat: [['wheat'], 0.3], deer: [['apple', 'carrot'], 0.25], chicken: [['wheat_seeds'], 0.34], turkey: [['wheat_seeds'], 0.34], duck: [['wheat_seeds', 'bread'], 0.34],
  rabbit: [['carrot', 'dandelion'], 0.34], mouse: [['wheat_seeds', 'wheat'], 0.4], raccoon: [['sweet_berries', 'apple', 'bread'], 0.3],
  brown_bear: [['honey_bottle', 'salmon', 'cod', 'sweet_berries'], 0.2], polar_bear: [['salmon', 'cod'], 0.2], panda: [['bamboo'], 0.3],
  frog: [['slime_ball'], 0.34], turtle: [['seagrass'], 0.34], axolotl: [['cod', 'salmon'], 0.34], armadillo: [['spider_eye', 'string'], 0.3],
  aerbunny: [['carrot'], 0.4], dolphin: [['cod', 'salmon'], 0.3],
  lion: [['raw_meat', 'venison', 'porkchop', 'beef', 'mutton'], 0.15], lioness: [['raw_meat', 'venison', 'porkchop', 'beef', 'mutton'], 0.18],
  tiger: [['raw_meat', 'venison', 'porkchop', 'beef', 'mutton'], 0.15], panther: [['raw_meat', 'venison', 'porkchop', 'chicken'], 0.15],
  snow_leopard: [['raw_meat', 'venison', 'mutton', 'rabbit'], 0.2], crocodile: [['raw_meat', 'cod', 'salmon'], 0.1],
  slime: [['slime_ball'], 0.4], magma_slime: [['magma_cream'], 0.4],
};
// Creatures you can ride once tamed and saddled: top speed (blocks a second) and jump.
const MOUNTS = {
  horse: [10, 9.5], donkey: [7.5, 8.5], llama: [6.5, 8], camel: [7.5, 8], deer: [9.5, 10], goat: [6.5, 11], moa: [8.5, 10],
  brown_bear: [6.5, 8], polar_bear: [6.5, 8], lion: [9.5, 9.5], lioness: [9.5, 9.5], tiger: [10, 9.5], panther: [10, 10], snow_leopard: [9, 10.5],
};
const tameFoods = (type) => (TAME_FOOD[type] ? TAME_FOOD[type][0].filter(id => ITEMS[id]) : []);

// ---- a saddle on every mount's back -----------------------------------------------------------------
{
  const P = addItem;
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('saddle_leather', p => { p.noise(H('#7a4a22'), 0.14); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#4a2a12')); p.set(x, 15, H('#4a2a12')); } for (let y = 2; y < 14; y += 4) for (let x = 2; x < 14; x += 4) p.set(x, y, H('#c8a040')); });
    P('saddle', p => {
      for (let y = 4; y < 12; y++) for (let x = 2; x < 14; x++) if (Math.abs(x - 7.5) < 6 - Math.max(0, 7 - y) * 0.6) p.set(x, y, shade(H('#8a5426'), 0.85 + (y - 4) * 0.03));
      for (let x = 2; x < 5; x++) { p.set(x, 4, H('#5a3416')); p.set(x, 3, H('#5a3416')); } for (let x = 11; x < 14; x++) { p.set(x, 5, H('#5a3416')); p.set(x, 4, H('#5a3416')); }
      for (let y = 9; y < 15; y++) { p.set(5, y, H('#3a2410')); p.set(10, y, H('#3a2410')); } p.set(5, 15, H('#a8a8b0')); p.set(10, 15, H('#a8a8b0'));
    });
  };
  // the saddle part: a seat on the top of the body, straps down the sides
  const models = new Set();
  for (const t of Object.keys(MOUNTS)) { const T = MOB_TYPES[t]; if (!T) continue; if (T.variants) T.variants.forEach(v => models.add(v)); else models.add(T.model || t); }
  for (const k of models) {
    const d = MODEL_DEFS[k]; if (!d || !d.parts) continue;
    const body = d.parts.find(p => p.name === 'body'); if (!body || !body.box) continue;
    const [x0, y0, z0, x1, y1, z1] = body.box, zc = (z0 + z1) / 2, L = Math.min(8, (z1 - z0) * 0.45);
    d.parts.push(rpart('saddle', 'body', [0, 0, 0], [x0 - 0.4, y1, zc - L / 2, x1 + 0.4, y1 + 1.2, zc + L / 2], 'saddle_leather', { only: 'saddled' }));
    d.parts.push(rpart('girth', 'body', [0, 0, 0], [x0 - 0.3, y0 - 0.3, zc - 0.8, x1 + 0.3, y1 + 0.1, zc + 0.8], 'saddle_leather', { only: 'saddled' }));
    d.seatY = (body.pivot[1] + body.max[1]) * (d.scale || 1);
  }
}

// ---- who's whose ----------------------------------------------------------------------------------
Object.assign(Mob.prototype, {
  ownerPawn() {
    if (!this.owner) return null;
    for (const q of this.game.pawns()) if (!q.dead && q.name === this.owner) return q;
    return null;
  },
  isPetOf(who) { return !!who && !!this.owner && this.owner === who.name; },
  // Riders and owners steer before anything else thinks (see Mob.update).
  controlAI(dt, p, dist, dyp, toPlayer) {
    if (this.riddenBy) return this.rideAI(dt);
    if (this.owner) return this.petAI(dt);
    return null;
  },
  petAI(dt) {
    const g = this.game, T = this.T, o = this.ownerPawn();
    if (T.ai === 'swimmer' || T.ai === 'flyer') {
      if (!o || this.stay) return null;    // fish and birds keep their own ways, but don't wander off
      const d = Math.hypot(o.x - this.x, o.z - this.z);
      if (d > 8) { if (T.ai === 'flyer') { this.flyVy = clamp((o.y + 2 - this.y) * 1.5, -3, 3); } return { want: T.run || T.speed * 2, dir: heading(this.x, this.z, o.x, o.z) }; }
      return null;
    }
    // the fight comes first
    const foe = this.petFoe;
    if (foe && (foe.dead || foe.alive === false || foe.remove || Math.hypot(foe.x - this.x, foe.z - this.z) > 24 || foe === o)) this.petFoe = null;
    if (this.petFoe && (T.damage || 0) > 0 && !this.stay) {
      const f = this.petFoe;
      this.sitting = this.sleeping = false;
      this.bite(f, T.damage);
      return { want: T.run || T.speed * 1.8, dir: this.goToward(f.x, f.y, f.z, dt) };
    }
    if (this.stay) { this.sitting = true; this.sleeping = false; return { want: 0, dir: this.yaw }; }
    this.sitting = false;
    if (!o) {
      // no owner about: a tame slime idles rather than hunting anyone
      if (T.hostile) { this.wander(dt); const m = this.wanderMove(); m.want *= 0.5; return m; }
      return null;
    }
    const d = Math.hypot(o.x - this.x, o.z - this.z), dy = o.y - this.y;
    // far behind: catch up the way pets do, appearing beside you
    if ((d > 28 || Math.abs(dy) > 12) && (o.player ? o.player.onGround || o.riding : true)) { if (this.teleportNear(o)) return { want: 0, dir: this.yaw }; }
    if (d > 6) return { want: d > 11 ? (T.run || T.speed * 2) : T.speed * 1.5, dir: this.goToward(o.x, o.y, o.z, dt) };
    if (d < 2.2) { this.wanderOn = false; return { want: 0, dir: heading(this.x, this.z, o.x, o.z) }; }
    this.wander(dt); const m = this.wanderMove(); m.want *= 0.6; return m;
  },
  teleportNear(o) {
    const w = this.game.world, ox = Math.floor(o.x), oy = Math.floor(o.y), oz = Math.floor(o.z);
    for (let k = 0; k < 16; k++) {
      const a = k / 16 * TAU, x = ox + Math.round(Math.cos(a) * 2), z = oz + Math.round(Math.sin(a) * 2);
      for (const y of [oy, oy + 1, oy - 1]) {
        if (T_SOLID[w.getBlock(x, y - 1, z)] && !T_LIQUID[w.getBlock(x, y - 1, z)] && !collides(w, x + 0.5 - this.w, y, z + 0.5 - this.w, x + 0.5 + this.w, y + this.h, z + 0.5 + this.w)) {
          this.x = x + 0.5; this.y = y; this.z = z + 0.5; this.vx = this.vz = this.vy = 0; return true;
        }
      }
    }
    return false;
  },
  // ---- riding ----
  rideAI(dt) {
    const r = this.riddenBy, M = MOUNTS[this.type] || [7, 8];
    if (!r || r.riding !== this || r.dead) { this.riddenBy = null; return null; }
    const p = r.player, inp = r.boatInput || {};
    this.grazeT = 0; this.sitting = this.sleeping = false; this.stay = false;
    if (inp.jump && this.onGround) { this.vy = M[1]; this.onGround = false; }
    const f = -(inp.mz || 0), s = inp.mx || 0;
    const vx = -Math.sin(p.yaw) * f + Math.cos(p.yaw) * s, vz = -Math.cos(p.yaw) * f - Math.sin(p.yaw) * s, m = Math.hypot(vx, vz);
    if (m < 0.1) return { want: 0, dir: this.yaw };
    return { want: M[0] * (inp.sprint ? 1.3 : 0.75) * Math.min(1, m), dir: Math.atan2(-vx, -vz) };
  },
  mount(lp) {
    if (this.riddenBy) { lp.toast('Someone is riding it', ''); return; }
    this.riddenBy = lp; lp.riding = this; lp.seat = 0;
    const p = lp.player; p.vx = p.vy = p.vz = 0; p.yaw = this.yaw;
    lp.toast('WASD to ride · jump · sprint to gallop · sneak to get off', '');
    this.game.sfx.playAt(this.T.sound || 'pop', this.x, this.y + 1, this.z);
  },
  dismount(lp) {
    if (this.riddenBy !== lp) return;
    this.riddenBy = null; lp.riding = null;
    const p = lp.player, w = this.game.world;
    for (const side of [1, -1]) {
      const a = this.yaw + side * Math.PI / 2, x = this.x - Math.sin(a) * (this.w + 0.8), z = this.z - Math.cos(a) * (this.w + 0.8);
      for (let y = Math.floor(this.y) + 1; y >= Math.floor(this.y) - 1; y--) if (T_SOLID[w.getBlock(Math.floor(x), y - 1, Math.floor(z))] && !collides(w, x - 0.3, y, z - 0.3, x + 0.3, y + 1.8, z + 0.3)) { p.x = x; p.y = y; p.z = z; p.fallStart = null; return; }
    }
    p.y = this.y + this.h + 0.1; p.fallStart = null;
  },
});

// Hook the steering in ahead of the creature's own thinking, and carry the rider along.
{
  const baseUpdate = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    // riding along in a cart or a boat: sit still where the seat is
    const v = this.mountedOn;
    if (v) {
      if (v.remove || v.pet !== this || !this.alive) { this.mountedOn = null; if (v.pet === this) v.pet = null; this.y += 0.6; }
      else {
        const [sx, sy, sz] = v.isBoat ? v.seatPos(1) : [v.x, v.y + 0.25, v.z];
        this.x = sx; this.y = sy; this.z = sz; this.vx = v.vx || 0; this.vz = v.vz || 0; this.vy = 0;
        this.yaw = v.yaw + (v.isBoat ? 0 : 0); this.age += dt; this.sitting = true; this.walkAmt *= 0.9; this.onGround = true;
        if (this.hurtTime > 0) this.hurtTime -= dt;
        return;
      }
    }
    baseUpdate.call(this, dt);
    const r = this.riddenBy;
    if (r && r.riding === this) {
      const p = r.player, d = MODELS[this.variant || this.T.model], seat = (d && d.def.seatY) || this.h * 0.7;
      p.x = this.x; p.z = this.z; p.y = this.y + seat - 0.28; p.vx = this.vx; p.vz = this.vz; p.vy = 0; p.fallStart = null; p.onGround = true;
    }
  };
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    if (this.riddenBy) this.dismount(this.riddenBy);
    if (this.mountedOn && this.mountedOn.pet === this) this.mountedOn.pet = null;
    baseDie.call(this, src);
    if (this.owner && !this.uid && !this.T.spirit) { const o = this.ownerPawn(); if (o && o.toast) o.toast('Your ' + (this.petName || this.type.replace(/_/g, ' ')) + ' died', 'warn'); }
  };
  // pets don't take your blows by accident, and they answer anyone who hurts them
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const a0 = src.attacker, a = a0 && (a0.owner && !(a0 instanceof Mob) ? a0.owner : a0);
    if (this.owner && a && !(a instanceof Mob) && this.isPetOf(a) && !a.sneaking) return 0;
    if (this.owner && a instanceof Mob && a.owner === this.owner) return 0;
    if (this.riddenBy && a === this.riddenBy) return 0;
    const dealt = baseHurt.call(this, amount, src);
    if (dealt > 0 && this.owner && a && this.alive && !this.isPetOf(a)) { this.petFoe = a; this.panicT = 0; this.angryT = 0; this.quarrel = null; }
    return dealt;
  };
}

// The owner's fights become the pets' fights.
function petsDefend(owner, foe) {
  if (!foe || foe.dead || foe.alive === false || foe === owner) return;
  if (foe instanceof Mob && foe.owner === owner.name) return;
  for (const e of owner.g.entities) if (e instanceof Mob && e.alive && e.owner === owner.name && !e.stay && !e.mountedOn && !e.riddenBy && Math.hypot(e.x - owner.x, e.z - owner.z) < 20 && e !== foe) e.petFoe = foe;
}
{
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    baseHurt.call(this, amount, src);
    const a = src.attacker;
    if (a instanceof Mob && a.alive) petsDefend(this, a);
  };
  const baseAttack = LocalPlayer.prototype.attackEntity;
  LocalPlayer.prototype.attackEntity = function (e) {
    if (e instanceof Mob && e.isPetOf(this) && !this.player.sneaking) { this.swingArm(); return; }
    baseAttack.call(this, e);
    if (e instanceof Mob && e.alive && !e.isPetOf(this)) petsDefend(this, e);
  };
}

// ---- using a creature: taming, feeding, saddling, riding, stay/follow ----------------------------------------
Object.assign(LocalPlayer.prototype, {
  petUse(e, held) {
    const g = this.g, p = this.player, mine = e.isPetOf(this), name = e.petName || (e.T.label || e.type).replace(/^an? /, '');
    const use1 = () => { if (!g.creative) { held.n--; if (held.n <= 0) p.inv.held = null; } this.swingArm(); };
    if (mine && held && held.id === 'saddle') {
      if (!MOUNTS[e.type] || e.baby) { this.toast('A saddle won\'t fit that', ''); return true; }
      if (e.saddled) { this.toast('It already has a saddle', ''); return true; }
      e.saddled = true; use1(); g.sfx.play('equip'); this.toast('Saddled — use it to ride', 'good'); return true;
    }
    if (mine && held && tameFoods(e.type).includes(held.id) && e.health < e.maxHealth) {
      e.health = Math.min(e.maxHealth, e.health + 4); use1(); g.sfx.play('eat'); hearts(g, e.x, e.y + e.h, e.z, 2); return true;
    }
    if (!e.owner && held && tameFoods(e.type).includes(held.id) && (p.sneaking || !e.T.farm)) {
      if ((e.type === 'slime' || e.type === 'magma_slime') && e.size > 1) { this.toast('Only a little one can be tamed', ''); return true; }
      if (e.T.boss) return false;
      use1(); g.sfx.play('eat');
      const chance = g.creative || (typeof hasPerk === 'function' && hasPerk(p, 'taming', 90)) ? 1 : Math.min(1, TAME_FOOD[e.type][1] * (1 + (typeof skillBonus === 'function' ? skillBonus(p, 'taming', 1) : 0)));   // (0.9.0.24) Taming makes it easier
      if (Math.random() < chance) {
        if (typeof skillGain === 'function') skillGain(this, 'taming', 60);
        e.owner = this.name; e.tamed = true; e.kept = true; e.angryT = 0; e.foe = null; e.panicT = 0; e.quarrel = null; e.petFoe = null; e.stay = false; e.loveT = 0;
        hearts(g, e.x, e.y + e.h, e.z, 7); g.sfx.playAt('levelup', e.x, e.y, e.z, 12);
        this.toast('Tamed! The ' + name + ' is yours' + (MOUNTS[e.type] ? ' (a saddle lets you ride it)' : ''), 'good');
      } else { g.burst(e.x, e.y + e.h, e.z, 'smoke', 6, 0.4); }
      return true;
    }
    if (mine && !held) {
      if (p.sneaking && e.T.carry) return false;                 // Carry On picks it up
      if (!p.sneaking && MOUNTS[e.type] && e.saddled && !e.baby && !this.riding) { e.mount(this); this.swingArm(); return true; }
      e.stay = !e.stay; e.petFoe = null; this.swingArm();
      this.toast(e.stay ? 'Your ' + name + ' will stay here' : 'Your ' + name + ' will follow you', '');
      return true;
    }
    return false;
  },
});
{
  const base = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const e = this.targetEnt, p = this.player;
    if (!repeat && !fromOff && e instanceof Mob && e.alive && !p.carrying && this.petUse(e, p.inv.held)) return;
    return base.call(this, repeat, inp, fromOff);
  };
}

// ---- keeping a pet's details through being carried, and in saves ----------------------------------------------
function petFields(m) { return m.owner ? { o: m.owner, n: m.petName, sd: m.saddled ? 1 : 0, st: m.stay ? 1 : 0, sz: m.size } : (m.size ? { sz: m.size } : null); }
function applyPetFields(m, f) {
  if (!f) return;
  if (f.o) { m.owner = f.o; m.tamed = true; m.kept = true; }
  if (f.n) m.petName = f.n; if (f.sd) m.saddled = true; if (f.st) m.stay = true;
  if (f.sz && m.setSize) m.setSize(f.sz);
}
{
  const basePick = LocalPlayer.prototype.pickUpMob;
  LocalPlayer.prototype.pickUpMob = function (m) {
    const f = petFields(m);
    if (m.mountedOn && m.mountedOn.pet === m) m.mountedOn.pet = null;
    basePick.call(this, m);
    if (this.player.carrying) this.player.carrying.pet = f;
  };
  const basePlace = LocalPlayer.prototype.placeCarried;
  LocalPlayer.prototype.placeCarried = function () {
    const g = this.g, c = this.player.carrying, n0 = g.entities.length;
    basePlace.call(this);
    if (c && c.kind === 'mob' && c.pet) for (let i = n0; i < g.entities.length; i++) { const m = g.entities[i]; if (m instanceof Mob && m.type === c.type) { applyPetFields(m, c.pet); break; } }
  };
}
// a creature as it is saved, and back again (for kept animals, and pets riding in carts and boats)
function mobToSnap(e) {
  return Object.assign({ t: e.type, h: e.health, c: e.color, s: e.sheared ? 1 : 0, b: e.baby ? Math.round(e.growT) : 0, g: e.stag ? 1 : 0, v: e.variant || undefined }, petFields(e) || {});
}
function mobFromSnap(game, a, x, y, z) {
  if (!MOB_TYPES[a.t]) return null;
  const m = new Mob(game, a.t, x, y, z);
  m.kept = true; if (a.h) m.health = a.h; if (a.c) m.color = a.c; m.sheared = !!a.s; m.stag = !!a.g;
  if (a.b) { m.makeBaby(); m.growT = a.b; }
  if (a.v && MODELS[a.v]) m.variant = a.v;
  applyPetFields(m, a);
  return m;
}
{
  // kept animals: pets' saddles, stay orders and sizes go along; ones riding in vehicles are saved with the vehicle
  const baseStore = Game.prototype.storeAnimals;
  Game.prototype.storeAnimals = function () {
    const riding = this.entities.filter(e => e instanceof Mob && e.mountedOn);
    for (const e of riding) e.kept = false;
    try { baseStore.call(this); } finally { for (const e of riding) e.kept = true; }
    const kept = this.entities.filter(e => e instanceof Mob && e.kept && e.alive && !e.remove && !e.ghost && !e.mountedOn);
    const list = this.meta && this.meta.animals && this.meta.animals[this.dim];
    if (list) list.forEach((a, i) => { const e = kept[i]; if (e && e.type === a.t) Object.assign(a, petFields(e) || {}); });
  };
}
