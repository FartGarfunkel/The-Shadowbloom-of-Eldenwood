// ---------------------------------------------------------------------------
// game/monsters.js — 0.8.3: the monsters.
//
//   husks        desert ghouls; the sun doesn't burn them; a hit leaves you sluggish
//   the drowned  ghouls of the deep: they swim after you, and walk out of the sea at night
//   strays       frost skeletons of the snowfields; their arrows chill
//   cave spiders small, quick, venomous, in the deep caves
//   bog witches  throw hex flasks (poison, sluggishness) and drink to heal
//   stone mites  burst out of stone you mine deep down; bring their friends
//   wraiths      drift in out of the dark; their touch chills; gone at dawn
//   cinder wisps hover in the Ember Depths and loose fireballs in threes
//   magma slimes the Depths' slimes: fireproof, and they split
//   marauders    raiding bands with axes; knock an axe loose and they go back for it
//   werewolves   the forest's rare night terror: fast, leaping, gone by morning
//   ogres        slow, huge, and their club slam throws you across the field
//   crocodiles   lie still in swamp water, then lunge
//   sharks       hunt swimmers in the open sea
//   snakes       rattlers, green snakes, adders: leave them be (sneak past) or be bitten
//   scorpions    desert night hunters with a venomous sting
//   big cats     lions and lionesses on the savanna, tigers and panthers in the jungle
//                (they stalk you at night), snow leopards on the peaks
// Their skins and bodies are in render/monstex.js; their voices in game/voices3.js.
// ---------------------------------------------------------------------------

defItem('venom_sac', { name: 'Venom Sac', desc: 'From snakes, scorpions and cave spiders.' });
defItem('shark_tooth', { name: 'Shark Tooth' });
defItem('ectoplasm', { name: 'Ectoplasm', desc: 'Cold to the touch. Left behind by a wraith.' });
defItem('cinder_rod', { name: 'Cinder Rod', fuel: 12, desc: 'Still warm. Burns a long while.' });
defItem('magma_cream', { name: 'Magma Cream' });
defItem('ogre_club', { name: 'Ogre Club', maxStack: 1, tool: { type: 'sword', tier: 2, speed: 0.8, damage: 6.5, durability: 420 }, desc: 'Heavy. Hits hard and knocks things flying.' });
defItem('hex_flask', { name: 'Hex Flask', maxStack: 16, desc: 'A bog witch\'s brew. Best not to drink it.' });
defItem('croc_scale', { name: 'Crocodile Scale' });
defItem('pelt', { name: 'Pelt', desc: 'Thick fur. Works as leather.' });

Object.assign(MOB_TYPES, {
  husk: { model: 'husk', label: 'a husk', hp: 20, w: 0.3, h: 1.95, speed: 2.4, xp: 5, hostile: true, special: true, damage: 3, voice: 'husk', family: 'ghoul', onHit: { slow: 4 }, drops: [['leather', 0, 1, 0.5], ['sand', 0, 2, 0.5], ['bone', 0, 2, 0.5]] },
  drowned: { model: 'drowned', label: 'a drowned', hp: 20, w: 0.3, h: 1.95, speed: 2.3, xp: 5, hostile: true, special: true, damage: 3, undead: true, swims: true, walks: true, voice: 'drowned', family: 'ghoul', drops: [['bone', 0, 2, 0.6], ['gold_ingot', 1, 1, 0.08], ['kelp', 0, 2, 0.4]] },
  stray: { model: 'stray', label: 'a stray', held: 'bow', hp: 20, w: 0.3, h: 1.95, speed: 2.5, xp: 6, hostile: true, special: true, damage: 2, undead: true, ranged: true, voice: 'stray', onHit: { slow: 5, chill: 5 }, fleesSun: true, drops: [['bone', 0, 2, 1], ['arrow', 0, 2, 1]] },
  cave_spider: { model: 'cave_spider', label: 'a cave spider', hp: 12, w: 0.42, h: 0.5, speed: 4.0, xp: 5, hostile: true, special: true, damage: 2, climber: true, voice: 'spider', onHit: { poison: 6 }, drops: [['string', 0, 2, 1], ['venom_sac', 0, 1, 0.25]] },
  witch: { model: 'witch', label: 'a bog witch', hp: 26, w: 0.3, h: 1.95, speed: 2.2, xp: 8, hostile: true, special: true, damage: 2, voice: 'witch', faction: 'raider', drops: [['glass_bottle', 0, 2, 0.8], ['sugar', 0, 2, 0.4], ['redstone', 0, 2, 0.4], ['stick', 0, 2, 0.4], ['hex_flask', 1, 1, 0.12]] },
  stone_mite: { model: 'stone_mite', label: 'a stone mite', hp: 8, w: 0.25, h: 0.3, speed: 3.6, xp: 4, hostile: true, special: true, damage: 1, voice: 'mite', drops: [] },
  wraith: { model: 'wraith', label: 'a wraith', hp: 24, w: 0.35, h: 1.8, speed: 3.0, xp: 10, hostile: true, special: true, damage: 4, flyer: true, voice: 'wraith', onHit: { slow: 3, chill: 6 }, noPush: true, drops: [['ectoplasm', 1, 2, 1]] },
  cinder_wisp: { model: 'cinder_wisp', label: 'a cinder wisp', hp: 20, w: 0.35, h: 1.1, speed: 2.4, xp: 10, hostile: true, special: true, damage: 3, flyer: true, fireImmune: true, voice: 'wisp', drops: [['cinder_rod', 0, 1, 0.6], ['coal', 0, 2, 0.4]] },
  magma_slime: { model: 'magma_slime', label: 'a magma slime', hp: 16, w: 0.5, h: 1.0, speed: 2.1, xp: 5, hostile: true, special: true, damage: 3, hopper: true, slimy: true, fireImmune: true, voice: 'magma', onHit: { fire: 2 }, drops: [['magma_cream', 0, 1, 0.5]] },
  raider: { model: 'raider', label: 'a marauder', held: 'iron_axe', hp: 24, w: 0.3, h: 1.95, speed: 2.9, xp: 8, hostile: true, special: true, damage: 3, voice: 'raider', faction: 'raider', drops: [['emerald', 0, 1, 0.5], ['leather', 0, 1, 0.5], ['bread', 0, 1, 0.3]] },
  werewolf: { model: 'werewolf', label: 'a werewolf', hp: 40, w: 0.4, h: 2.15, speed: 4.4, xp: 20, hostile: true, special: true, damage: 6, knockResist: 0.3, voice: 'werewolf', drops: [['pelt', 1, 2, 1], ['raw_meat', 0, 2, 0.6]] },
  ogre: { model: 'ogre', label: 'an ogre', held: 'ogre_club', hp: 80, w: 0.62, h: 2.7, speed: 1.9, xp: 30, hostile: true, special: true, damage: 8, knockResist: 0.75, voice: 'ogre', drops: [['ogre_club', 1, 1, 0.35], ['leather', 1, 3, 1], ['raw_meat', 1, 3, 1]] },
  crocodile: { model: 'crocodile', label: 'a crocodile', hp: 30, w: 0.55, h: 0.6, speed: 1.6, run: 6.5, xp: 8, special: true, retaliates: true, damage: 6, swims: true, walks: true, knockResist: 0.4, voice: 'croc', drops: [['croc_scale', 0, 2, 0.8], ['leather', 0, 2, 0.6]] },
  shark: { model: 'shark', label: 'a shark', hp: 30, w: 0.6, h: 0.7, speed: 3.2, xp: 8, special: true, retaliates: true, damage: 5, swims: true, water: true, knockResist: 0.3, drops: [['shark_tooth', 1, 3, 0.8], ['cod', 0, 2, 0.5]] },
  rattlesnake: { model: 'rattlesnake', label: 'a rattlesnake', hp: 8, w: 0.25, h: 0.25, speed: 1.8, xp: 3, special: true, retaliates: true, damage: 2, voice: 'rattlesnake', snake: true, onHit: { poison: 5 }, drops: [['venom_sac', 0, 1, 0.35]] },
  green_snake: { model: 'green_snake', label: 'a green snake', hp: 8, w: 0.25, h: 0.25, speed: 2.0, xp: 3, special: true, retaliates: true, damage: 2, voice: 'snake', snake: true, onHit: { poison: 4 }, drops: [['venom_sac', 0, 1, 0.3]] },
  adder: { model: 'adder', label: 'an adder', hp: 8, w: 0.25, h: 0.25, speed: 1.8, xp: 3, special: true, retaliates: true, damage: 2, voice: 'snake', snake: true, onHit: { poison: 4 }, drops: [['venom_sac', 0, 1, 0.3]] },
  scorpion: { model: 'scorpion', label: 'a scorpion', hp: 14, w: 0.45, h: 0.45, speed: 3.0, xp: 5, hostile: true, special: true, damage: 2, voice: 'scorpion', dayNeutral: true, onHit: { poison: 4 }, drops: [['venom_sac', 0, 1, 0.4], ['string', 0, 1, 0.3]] },
  lion: { model: 'lion', label: 'a lion', ai: 'predator', hp: 30, w: 0.5, h: 1.3, speed: 1.8, run: 6.2, xp: 8, damage: 6, pack: true, protective: true, prey: ['deer', 'horse', 'donkey', 'llama', 'cow'], sound: 'lion', carryScale: 0.35, drops: [['pelt', 1, 1, 1], ['raw_meat', 1, 2, 1]] },
  lioness: { model: 'lioness', label: 'a lioness', ai: 'predator', hp: 26, w: 0.45, h: 1.2, speed: 1.9, run: 6.8, xp: 7, damage: 5, pack: true, prey: ['deer', 'horse', 'donkey', 'llama', 'cow', 'armadillo'], sound: 'bigcat', carryScale: 0.4, drops: [['pelt', 0, 1, 1], ['raw_meat', 1, 2, 1]] },
  tiger: { model: 'tiger', label: 'a tiger', ai: 'predator', hp: 30, w: 0.5, h: 1.3, speed: 1.8, run: 6.8, xp: 9, damage: 7, angersWhenHurt: true, stalker: true, prey: ['pig', 'boar', 'deer', 'chicken', 'panda'], sound: 'bigcat', carryScale: 0.35, drops: [['pelt', 1, 1, 1], ['raw_meat', 1, 2, 1]] },
  panther: { model: 'panther', label: 'a panther', ai: 'predator', hp: 24, w: 0.45, h: 1.15, speed: 2.0, run: 7.2, xp: 8, damage: 5, angersWhenHurt: true, stalker: true, nocturnal: true, prey: ['pig', 'chicken', 'parrot', 'ocelot'], sound: 'bigcat', carryScale: 0.4, drops: [['pelt', 1, 1, 1]] },
  snow_leopard: { model: 'snow_leopard', label: 'a snow leopard', ai: 'predator', hp: 20, w: 0.4, h: 1.0, speed: 2.0, run: 7.0, xp: 6, damage: 4, skittish: 10, angersWhenHurt: true, prey: ['goat', 'rabbit', 'snow_fox'], sound: 'bigcat', climbs: true, carryScale: 0.45, drops: [['pelt', 1, 1, 1]] },
});
// what they drop has to exist in this world
for (const k of ['husk', 'drowned', 'stray', 'cave_spider', 'witch', 'stone_mite', 'wraith', 'cinder_wisp', 'magma_slime', 'raider', 'werewolf', 'ogre', 'crocodile', 'shark', 'rattlesnake', 'green_snake', 'adder', 'scorpion', 'lion', 'lioness', 'tiger', 'panther', 'snow_leopard'])
  MOB_TYPES[k].drops = MOB_TYPES[k].drops.filter(([id]) => ITEMS[id]);
for (const k of ['ghoul', 'charred_ghoul']) if (MOB_TYPES[k]) MOB_TYPES[k].family = 'ghoul';
MOB_TYPES.skeleton.fleesSun = true;
if (MOB_TYPES.slime) MOB_TYPES.slime.voice = MOB_TYPES.slime.voice || 'squish';

// ---- shared know-how ---------------------------------------------------------------------------------
const MONSTER_AI = {};
Object.assign(Mob.prototype, {
  // Does it know where you are? It has to see you first (or hear a friend call, or bump into you);
  // then it remembers for a while after you slip out of sight.
  senses(p, dist, dyp, dt, range = 20) {
    const near = !!p && dist < range && Math.abs(dyp) < 12;
    this._losT = (this._losT || 0) - dt;
    if (this._losT <= 0) { this._losT = 0.2 + Math.random() * 0.12; this._sees = near && this.lineOfSight(p); }
    const sees = near && this._sees;
    if (sees) this.huntT = 10; else if (this.huntT > 0) this.huntT -= dt;
    return { near, sees, hunting: near && (sees || this.huntT > 0 || dist < 3.5 || this.alertT > 0 || this.quarrel === p) };
  },
  chase(p, dist, toPlayer, dt, k = 1) {
    return { want: dist < 0.9 ? 0 : this.T.speed * k, dir: (dist > 2.2 ? this.navDir(p.x, p.y, p.z, dt) : null) ?? toPlayer };
  },
  voiceTick(dt, dist, lo = 5, span = 7) {
    this.soundT -= dt;
    if (this.soundT < 0) { this.soundT = lo + Math.random() * span; if (dist < 18 && this.T.voice) this.game.sfx.playAt(this.T.voice, this.x, this.y + this.h * 0.8, this.z); }
  },
  // Run an older creature's brain as if it were that creature (a stray thinks like a skeleton).
  asType(type, fn) { const t = this.type; this.type = type; try { return fn(); } finally { this.type = t; } },
});
{
  const base = Mob.prototype.specialAI;
  Mob.prototype.specialAI = function (dt, p, dist, dyp, toPlayer) {
    const f = MONSTER_AI[this.type];
    if (f) { if (dist > 80 && !this.kept) this.remove = true; return f.call(this, dt, p, dist, dyp, toPlayer); }
    return base.call(this, dt, p, dist, dyp, toPlayer);
  };
  MONSTER_AI.__base = base;
}

// ---- ghouls of the sand and the sea ----
function zombieAI(dt, p, dist, dyp, toPlayer) {
  const s = this.senses(p, dist, dyp, dt, 24);
  this.voiceTick(dt, dist);
  if (!s.hunting) { this.wander(dt); return this.wanderMove(); }
  this.meleeAt(p, dist, dyp);
  return this.chase(p, dist, toPlayer, dt);
}
MONSTER_AI.husk = zombieAI;
MONSTER_AI.drowned = function (dt, p, dist, dyp, toPlayer) {
  if (!this.inWater) { this.swimVy = 0; return zombieAI.call(this, dt, p, dist, dyp, toPlayer); }
  const s = this.senses(p, dist, dyp, dt, 24);
  this.voiceTick(dt, dist, 6, 8);
  if (!s.hunting) { this.swimVy = Math.sin(this.age * 0.6 + this.id) * 0.5 - 0.3; this.wander(dt); return this.wanderMove(); }
  this.swimVy = clamp(((p.y + 0.4) - this.y) * 2.5, -3.2, 3.2);
  this.meleeAt(p, dist, dyp);
  return { want: dist < 0.8 ? 0 : this.T.speed * 1.15, dir: toPlayer };
};
// ---- the older brains, borrowed ----
MONSTER_AI.stray = function (dt, p, dist, dyp, toPlayer) { return this.asType('skeleton', () => MONSTER_AI.__base.call(this, dt, p, dist, dyp, toPlayer)); };
MONSTER_AI.cave_spider = function (dt, p, dist, dyp, toPlayer) { return this.asType('spider', () => MONSTER_AI.__base.call(this, dt, p, dist, dyp, toPlayer)); };
MONSTER_AI.magma_slime = function (dt, p, dist, dyp, toPlayer) {
  // magma slimes leap higher than the green ones
  if (this.onGround && this.lastWant > 0.1 && Math.random() < dt * 0.6) this.wantJump = true;
  return this.asType('slime', () => MONSTER_AI.__base.call(this, dt, p, dist, dyp, toPlayer));
};
{
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    baseDie.call(this, src);
    if (this.type === 'magma_slime' && this.size > 1) {
      for (let i = 0, n = 2 + Math.floor(Math.random() * 2); i < n; i++) {
        const m = new Mob(this.game, 'magma_slime', this.x + (Math.random() - 0.5) * 0.6, this.y + 0.3, this.z + (Math.random() - 0.5) * 0.6);
        m.setSize(1); m.vy = 3.5; this.game.addEntity(m);
      }
    }
  };
}

// ---- bog witches ----
MONSTER_AI.witch = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, s = this.senses(p, dist, dyp, dt, 18);
  this.voiceTick(dt, dist, 6, 9);
  // a sip of something when hurt
  this.drinkCd = (this.drinkCd || 0) - dt;
  if (this.drinkT > 0) {
    this.drinkT -= dt; this.heldItem = 'glass_bottle';
    if (this.drinkT <= 0) { this.health = Math.min(this.maxHealth, this.health + 8); this.heldItem = null; g.sfx.playAt('burp', this.x, this.y + 1.5, this.z); g.burst(this.x, this.y + 1.8, this.z, 'white', 6, 0.4); }
    return { want: 0, dir: toPlayer };
  }
  if (this.health < this.maxHealth * 0.5 && this.drinkCd <= 0) { this.drinkT = 1.4; this.drinkCd = 12; g.sfx.playAt('eat', this.x, this.y + 1.5, this.z); return { want: 0, dir: toPlayer }; }
  if (!s.hunting) { this.wander(dt); return this.wanderMove(); }
  this.throwT = (this.throwT ?? 1.5) - dt;
  if (s.sees && dist < 11 && this.throwT <= 0) { this.throwT = 2.6 + Math.random() * 1.2; this.throwFlask(p); }
  // keep a few blocks off: close enough to throw, too far to hit
  if (dist < 4) return { want: this.T.speed, dir: toPlayer + Math.PI + Math.sin(this.age) * 0.5 };
  if (dist > 8 || !s.sees) return this.chase(p, dist, toPlayer, dt);
  return { want: this.T.speed * 0.3, dir: toPlayer + Math.PI / 2 * (Math.sin(this.age * 0.5) > 0 ? 1 : -1) };
};
Mob.prototype.throwFlask = function (p) {
  const g = this.game, ex = this.x, ey = this.y + 1.6, ez = this.z, sp = 11;
  const tx = p.x - ex, tz = p.z - ez, hd = Math.hypot(tx, tz) || 1, t = hd / sp;
  const vy = ((p.y + 0.8) - ey) / t + 0.5 * 20 * t;
  const kind = (p.player && p.player.poison > 0) || (p.poisonT > 0) ? 'slow' : Math.random() < 0.6 ? 'poison' : 'slow';
  g.addEntity(new HexFlask(g, ex, ey, ez, tx / hd * sp, vy, tz / hd * sp, this, kind));
  this.swingT = 0.3;
  g.sfx.playAt('bow', ex, ey, ez);
};
class HexFlask extends Entity {
  constructor(game, x, y, z, vx, vy, vz, owner, kind) { super(game, x, y, z); this.vx = vx; this.vy = vy; this.vz = vz; this.owner = owner; this.kind = kind; this.w = 0.12; this.h = 0.12; }
  update(dt) {
    const g = this.game, w = g.world;
    if (this.ghost) { this.ghostStep(dt); return; }
    this.age += dt;
    if (this.age > 8) { this.remove = true; return; }
    for (let s = 0; s < 3; s++) {
      const h = dt / 3; this.vy -= 20 * h;
      this.x += this.vx * h; this.y += this.vy * h; this.z += this.vz * h;
      for (const q of g.pawns()) if (!q.dead && Math.abs(q.x - this.x) < 0.5 && Math.abs(q.z - this.z) < 0.5 && this.y > q.y && this.y < q.y + 1.9) return this.smash();
      for (const e of g.entities) if (e instanceof Mob && e !== this.owner && e.alive && Math.abs(e.x - this.x) < e.w + 0.2 && Math.abs(e.z - this.z) < e.w + 0.2 && this.y > e.y && this.y < e.y + e.h) return this.smash();
      if (T_SOLID[w.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))]) return this.smash();
    }
  }
  smash() {
    const g = this.game, x = this.x, y = this.y, z = this.z, own = this.owner;
    this.remove = true;
    g.sfx.playAt('splash_small', x, y, z);
    g.burst(x, y, z, this.kind === 'poison' ? 'venom_sac' : 'ice', 16, 1.6);
    for (const q of g.pawns()) {
      if (q.dead || Math.hypot(q.x - x, q.y + 0.9 - y, q.z - z) > 3) continue;
      const pl = q.player || q;
      if (this.kind === 'poison') pl.poison = Math.max(pl.poison || 0, 7); else { pl.slow = Math.max(pl.slow || 0, 8); }
      if (q.hurt) q.hurt(1, { type: 'magic', attacker: own, knock: 0 });
    }
    for (const e of g.entities) {
      if (!(e instanceof Mob) || !e.alive || e === own || Math.hypot(e.x - x, e.y + e.h / 2 - y, e.z - z) > 3) continue;
      if (own && own.T && e.T.faction && e.T.faction === own.T.faction) continue;
      e.hurt(this.kind === 'poison' ? 4 : 1, { type: 'magic', attacker: own, knock: 1 }); e.slowT = Math.max(e.slowT, 6);
    }
  }
  snap() { return { i: this.id, k: 'p', x: +this.x.toFixed(2), y: +this.y.toFixed(2), z: +this.z.toFixed(2) }; }
  applySnap(o) { this.tx = o.x; this.ty = o.y; this.tz = o.z; }
  draws() {}
  glow(out) { out.push({ x: this.x, y: this.y, z: this.z, size: 0.32, uv: tileUV(ATLAS.tile.hex_flask), light: 0xFF }); }
}

// ---- stone mites ----
MONSTER_AI.stone_mite = function (dt, p, dist, dyp, toPlayer) {
  const s = this.senses(p, dist, dyp, dt, 16);
  this.voiceTick(dt, dist, 2, 4);
  if (!s.hunting) { this.wander(dt); return this.wanderMove(); }
  if (dist < 0.9 + this.w && Math.abs(dyp) < 1.2 && this.attackCd <= 0) { this.attackCd = 0.6; this.swingT = 0.2; p.hurt(this.T.damage, { type: 'mob', attacker: this, knock: 1.5 }); }
  return { want: dist < 0.5 ? 0 : this.T.speed, dir: (dist > 2 ? this.navDir(p.x, p.y, p.z, dt) : null) ?? toPlayer };
};
// Mining deep stone sometimes wakes one; hurting one wakes the stone around it.
const MITE_STONE = new Set(['stone', 'deepslate', 'cobblestone', 'andesite', 'diorite', 'granite', 'tuff', 'slate', 'stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks'].map(k => B[k]).filter(v => v !== undefined));
Game.prototype.wakeMites = function (x, y, z, n, near) {
  const w = this.world;
  for (let i = 0; i < n; i++) {
    let sx = x, sy = y, sz = z;
    if (near) {   // break out of a stone block nearby
      let found = false;
      for (let k = 0; k < 12 && !found; k++) {
        const ax = x + Math.floor(Math.random() * 7) - 3, ay = y + Math.floor(Math.random() * 3) - 1, az = z + Math.floor(Math.random() * 7) - 3;
        if (MITE_STONE.has(w.getBlock(ax, ay, az)) && !w.getBlock(ax, ay + 1, az)) { if (this.rules().mobGriefing) w.setBlock(ax, ay, az, 0); sx = ax; sy = ay; sz = az; found = true; }
      }
      if (!found) continue;
    }
    const m = this.addEntity(new Mob(this, 'stone_mite', sx + 0.5, sy, sz + 0.5));
    m.huntT = 10; m.vy = 3;
    this.burst(sx + 0.5, sy + 0.5, sz + 0.5, 'stone', 10, 1.2);
  }
};
{
  const base = LocalPlayer.prototype.breakBlock;
  LocalPlayer.prototype.breakBlock = function (x, y, z) {
    const g = this.g, id = g.world.getBlock(x, y, z);
    base.call(this, x, y, z);
    if (!g.creative && g.dim === DIM.OVERWORLD && y < 34 && MITE_STONE.has(id) && !g.world.getBlock(x, y, z) && g.rules().mobSpawning && Math.random() < 0.012) {
      g.wakeMites(x, y, z, 1, false);
      g.sfx.playAt('mite', x + 0.5, y + 0.5, z + 0.5);
    }
  };
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const dealt = baseHurt.call(this, amount, src);
    if (dealt > 0 && this.type === 'stone_mite' && this.alive && src.attacker && !(src.attacker instanceof Mob) && Math.random() < 0.3)
      this.game.wakeMites(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z), 1 + Math.floor(Math.random() * 2), true);
    return dealt;
  };
}

// ---- wraiths ----
MONSTER_AI.wraith = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game;
  this.noGrav = true;
  // daylight undoes them
  if (g.dim === 0 && g.env.day > 0.55) {
    const [sky] = this.lightAt(1);
    if (sky >= 12) { this.remove = true; g.burst(this.x, this.y + 1, this.z, 'white', 18, 0.8); g.sfx.playAt('wraith_death', this.x, this.y + 1, this.z); return { want: 0, dir: this.yaw }; }
  }
  const s = this.senses(p, dist, dyp, dt, 28);
  this.voiceTick(dt, dist, 7, 9);
  this.retreatT = (this.retreatT || 0) - dt;
  if (!s.hunting) { this.flyVy = Math.sin(this.age * 0.8) * 0.6; this.wander(dt); return this.wanderMove(); }
  // drift to head height; swoop in, touch, fall back
  const hover = this.retreatT > 0 ? 2.6 : 0.4;
  this.flyVy = clamp(((p.y + hover) - this.y) * 1.8, -3, 3);
  if (this.retreatT > 0) return { want: this.T.speed * 0.8, dir: toPlayer + Math.PI + 0.6 };
  if (dist < 1.5 + this.w && Math.abs(dyp) < 1.8 && this.attackCd <= 0) {
    this.attackCd = 1.6; this.swingT = 0.4;
    p.hurt(this.T.damage, { type: 'mob', attacker: this, knock: 2 });
    this.retreatT = 1.2 + Math.random();
  }
  return { want: this.T.speed, dir: toPlayer };
};

// ---- cinder wisps ----
MONSTER_AI.cinder_wisp = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, w = g.world;
  this.noGrav = true;
  if (this.inWater) this.hurt(1, { type: 'drown' });
  // hover a few blocks over the ground
  let floor = 0; for (let k = 1; k <= 6; k++) { if (T_SOLID[w.getBlock(Math.floor(this.x), Math.floor(this.y) - k, Math.floor(this.z))]) break; floor = k; }
  const s = this.senses(p, dist, dyp, dt, 26);
  this.voiceTick(dt, dist, 3, 4);
  if (Math.random() < dt * 8) g.flame(this.x + (Math.random() - 0.5) * 0.6, this.y + 0.4 + Math.random() * 0.6, this.z + (Math.random() - 0.5) * 0.6);
  if (!s.hunting) { this.flyVy = floor < 2 ? 0.8 : floor > 4 ? -0.6 : Math.sin(this.age) * 0.3; this.wander(dt); return this.wanderMove(); }
  const wantY = Math.max(p.y + 2, this.y - floor + 2.5);
  this.flyVy = clamp((wantY - this.y) * 1.5, -2, 2);
  // three fireballs, then a breather
  this.volleyT = (this.volleyT ?? 2) - dt;
  if (this.volleyT <= 0 && s.sees && dist < 20) {
    this.shots = (this.shots || 0) + 1;
    const ex = this.x, ey = this.y + 0.6, ez = this.z, tx = p.x - ex, ty = p.y + 1 - ey, tz = p.z - ez, l = Math.hypot(tx, ty, tz) || 1, sp = 13;
    const jit = () => (Math.random() - 0.5) * 0.08;
    g.addEntity(new Projectile(g, ex, ey, ez, (tx / l + jit()) * sp, (ty / l + jit()) * sp, (tz / l + jit()) * sp, 'fireball', this));
    g.sfx.playAt('ignite', ex, ey, ez);
    if (this.shots >= 3) { this.shots = 0; this.volleyT = 3.5 + Math.random() * 1.5; } else this.volleyT = 0.35;
  }
  if (dist < 5) return { want: this.T.speed * 0.6, dir: toPlayer + Math.PI };
  if (dist > 12 || !s.sees) return { want: this.T.speed, dir: toPlayer };
  return { want: this.T.speed * 0.3, dir: toPlayer + Math.PI / 2 };
};

// ---- marauders ----
MONSTER_AI.raider = function (dt, p, dist, dyp, toPlayer) {
  // picked a dropped axe back up: into the main hand with it
  if (this.offItem && !this.heldItem && !(this.lost && (this.lost.has('armR') || this.lost.has('foreR')))) { this.heldItem = this.offItem; this.offItem = null; }
  const s = this.senses(p, dist, dyp, dt, 24);
  this.voiceTick(dt, dist, 6, 10);
  if (!s.hunting) {
    // a band keeps together: follow the leader
    const lead = this.leader && this.leader.alive && !this.leader.remove ? this.leader : null;
    if (lead && Math.hypot(lead.x - this.x, lead.z - this.z) > 5) return { want: this.T.speed * 0.7, dir: this.navDir(lead.x, lead.y, lead.z, dt) ?? Math.atan2(this.x - lead.x, this.z - lead.z) };
    this.wander(dt); return this.wanderMove();
  }
  if (s.sees && dist < 16 && !this._yelled) { this._yelled = true; this.game.sfx.playAt('raider', this.x, this.y + 1.6, this.z); }
  this.meleeAt(p, dist, dyp);
  return this.chase(p, dist, toPlayer, dt, this.heldItem ? 1 : 1.1);
};
{
  // a hard enough blow can knock the axe out of a marauder's hand
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const dealt = baseHurt.call(this, amount, src);
    if (dealt >= 4 && this.type === 'raider' && this.alive && this.heldItem && Math.random() < 0.35) { this.lost = this.lost || new Set(); this.dropWeapon('heldItem'); }
    return dealt;
  };
}

// ---- werewolves ----
MONSTER_AI.werewolf = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game;
  if (g.dim === 0 && g.env.day > 0.6) {
    // morning: it runs for the trees and is gone
    this.dawnT = (this.dawnT || 0) + dt;
    if (this.dawnT > 6 || (dist > 24 && this.dawnT > 1)) { this.remove = true; return { want: 0, dir: this.yaw }; }
    return { want: this.T.speed, dir: p ? toPlayer + Math.PI : this.yaw };
  }
  const s = this.senses(p, dist, dyp, dt, 32);
  this.soundT -= dt;
  if (this.soundT < 0) { this.soundT = 8 + Math.random() * 10; if (dist < 48) g.sfx.playAt(s.hunting ? 'werewolf_angry' : 'werewolf', this.x, this.y + 1.8, this.z, 48); }
  if (!s.hunting) { this.wander(dt); const m = this.wanderMove(); m.want *= 1.4; return m; }
  this.leapCd = (this.leapCd || 0) - dt;
  if (this.onGround && dist < 6 && dist > 2.2 && this.leapCd <= 0 && Math.abs(dyp) < 2 && s.sees) {
    this.leapCd = 2.2 + Math.random();
    const l = dist || 1; this.vy = 6.4; this.vx = (p.x - this.x) / l * 9; this.vz = (p.z - this.z) / l * 9;
    g.sfx.playAt('werewolf_angry', this.x, this.y + 1.8, this.z);
  }
  this.meleeAt(p, dist, dyp);
  return this.chase(p, dist, toPlayer, dt);
};

// ---- ogres ----
MONSTER_AI.ogre = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game;
  const s = this.senses(p, dist, dyp, dt, 22);
  this.voiceTick(dt, dist, 6, 8);
  // the slam: a long wind-up (club high), then down it comes
  if (this.slamT > 0) {
    this.slamT -= dt; this.swingT = 0.35; this.lockMove = false;
    if (this.slamT <= 0) {
      const fx = this.x - Math.sin(this.yaw) * 1.4, fz = this.z - Math.cos(this.yaw) * 1.4;
      g.shake(0.45, this);
      g.burst(fx, this.y + 0.1, fz, 'dirt', 26, 3);
      g.sfx.playAt('thud', fx, this.y, fz); g.sfx.playAt('explode', fx, this.y, fz, 18);
      const hit = (q, isPawn) => {
        const d = Math.hypot(q.x - fx, q.z - fz);
        if (d > 3.2 || Math.abs(q.y - this.y) > 2.5) return;
        const k = 1 - d / 3.6;
        q.hurt(Math.round(this.T.damage * (0.5 + 0.5 * k)) + (this.heldItem ? 2 : 0), { type: 'mob', attacker: this, knock: 9 * k + 3 });
        if (isPawn) { const pl = q.player || q; pl.vy = Math.max(pl.vy || 0, 7 * k + 2); }
      };
      for (const q of g.pawns()) if (!q.dead) hit(q, true);
      for (const e of g.entities) if (e instanceof Mob && e !== this && e.alive && e.T.hostile !== true) hit(e, false);
      this.attackCd = 2.2;
    }
    return { want: 0, dir: toPlayer };
  }
  if (!s.hunting) { this.wander(dt); const m = this.wanderMove(); m.want *= 0.7; return m; }
  if (dist < 3 && Math.abs(dyp) < 2.5 && this.attackCd <= 0) { this.slamT = 0.9; g.sfx.playAt('ogre_angry', this.x, this.y + 2.4, this.z); return { want: 0, dir: toPlayer }; }
  return this.chase(p, dist, toPlayer, dt);
};

// ---- crocodiles ----
MONSTER_AI.crocodile = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, T = this.T;
  this.voiceTick(dt, dist, 10, 14);
  const foe = this.quarrel || (this.angryT > 0 ? this.foe : null);
  if (this.angryT > 0) this.angryT -= dt;
  const target = foe || p;
  const near = target && dist < 7 && Math.abs(dyp) < 2.5 && !(target.player && g.creative);
  // in the water it lies still, eyes just above the surface
  if (this.inWater) this.swimVy = this.lungeT > 0 ? 0 : clamp((Math.floor(this.y) + 0.65 - this.y) * 3, -1, 1);
  if (this.lungeT > 0) {
    this.lungeT -= dt;
    if (this.bite(target, T.damage)) { this.lungeT = 0; this.restT = 2.5; }
    return { want: T.run, dir: toPlayer };
  }
  this.restT = (this.restT || 0) - dt;
  if ((foe || (near && dist < (this.inWater ? 6 : 3.5))) && this.restT <= 0) {
    if (dist < 7) { this.lungeT = 0.8; if (this.onGround || this.inWater) this.vy = this.inWater ? 2 : 3.5; g.sfx.playAt('croc_hurt', this.x, this.y + 0.4, this.z); }
    return { want: T.speed * 1.4, dir: toPlayer };
  }
  // otherwise it hardly moves: a slow wander, mostly lying in wait
  this.wander(dt);
  const m = this.wanderMove(); m.want *= this.inWater ? 0.6 : 0.4;
  return m;
};

// ---- sharks ----
MONSTER_AI.shark = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, T = this.T;
  if (!this.inWater) {   // stranded: thrash, weaken
    this.dryT = (this.dryT || 0) + dt;
    if (this.dryT > 2) { this.dryT = 0; this.hurt(2, { type: 'drown' }); }
    if (this.onGround && Math.random() < dt * 2) { this.vy = 3.5; this.yaw += (Math.random() - 0.5) * 2; g.sfx.playAt('flop', this.x, this.y, this.z); }
    return { want: 0.5, dir: this.yaw };
  }
  const targetIn = p && (p.inWater || (p.player && p.player.inWater) || (p instanceof Mob && p.inWater));
  const foe = this.quarrel || (targetIn && dist < 18 && Math.abs(dyp) < 10 && !(p.player && g.creative) ? p : null);
  if (foe) {
    this.swimVy = clamp(((foe.y + 0.5) - this.y) * 2, -3, 3);
    if (Math.hypot(foe.x - this.x, foe.z - this.z) < 1.6 + this.w && Math.abs(foe.y - this.y) < 1.6 && this.attackCd <= 0) {
      this.attackCd = 1.3; this.swingT = 0.3;
      foe.hurt(T.damage, { type: 'mob', attacker: this, knock: 3 });
      g.sfx.playAt('splash_small', this.x, this.y + 0.5, this.z);
    }
    return { want: T.speed * 1.2, dir: toPlayer };
  }
  // cruising: long lazy turns, staying a little below the surface
  this.swimVy = Math.sin(this.age * 0.4 + this.id) * 0.5;
  this.wander(dt); this.wanderOn = true;
  return { want: T.speed * 0.45, dir: this.wanderDir };
};

// ---- snakes ----
function snakeAI(dt, p, dist, dyp, toPlayer) {
  const g = this.game, T = this.T;
  const foe = this.quarrel || (this.angryT > 0 ? this.foe : null);
  if (this.angryT > 0) this.angryT -= dt;
  if (this.striking > 0) this.striking -= dt;
  const tgt = foe || p, td = foe ? Math.hypot(foe.x - this.x, foe.z - this.z) : dist;
  const quiet = tgt && tgt.sneaking;
  const warnR = quiet ? 1.6 : 4.5, strikeR = quiet ? 0.9 : 2.2;
  this.rattling = false; this.coiled = false;
  if (tgt && !(tgt.player && g.creative) && Math.abs(dyp) < 1.6) {
    if (foe || td < warnR) {
      this.coiled = true;
      if (this.type === 'rattlesnake') { this.rattling = true; this.rattleT = (this.rattleT || 0) - dt; if (this.rattleT <= 0) { this.rattleT = 1.2; g.sfx.playAt('rattlesnake', this.x, this.y, this.z, 16); } }
      else { this.soundT -= dt; if (this.soundT < 0) { this.soundT = 2.5; g.sfx.playAt(T.voice, this.x, this.y, this.z, 12); } }
      this.strikeCd = (this.strikeCd || 0) - dt;
      if ((foe || td < strikeR) && this.strikeCd <= 0 && td < 2.6) {
        this.strikeCd = 1.4; this.striking = 0.3; this.tongueOut = true;
        const l = td || 1; this.vx = (tgt.x - this.x) / l * 6; this.vz = (tgt.z - this.z) / l * 6; this.vy = 1.5;
        if (td < 1.6 + this.w) tgt.hurt(T.damage, { type: 'mob', attacker: this, knock: 1 });
      }
      // face it, back off a touch, unless it's a fight
      return { want: foe && td > 1.2 ? T.speed * 1.4 : 0, dir: Math.atan2(-(tgt.x - this.x), -(tgt.z - this.z)) };
    }
  }
  this.tongueOut = Math.sin(this.age * 3 + this.id) > 0.85;
  this.wander(dt);
  const m = this.wanderMove(); m.want *= 0.7;
  return m;
}
for (const k of ['rattlesnake', 'green_snake', 'adder']) MONSTER_AI[k] = snakeAI;
// snakes and crocodiles answer a blow
{
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const dealt = baseHurt.call(this, amount, src);
    if (dealt > 0 && this.T.retaliates && this.alive && src.attacker && src.attacker !== this) {
      const a = src.attacker.owner || src.attacker;
      if (a && a.hurt) { this.angryT = 15; this.foe = a; }
    }
    return dealt;
  };
}

// ---- scorpions ----
MONSTER_AI.scorpion = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, T = this.T;
  if (this.striking > 0) this.striking -= dt;
  const night = g.env.day < 0.45 || this.lightAt(0.3)[0] < 10;
  const s = this.senses(p, dist, dyp, dt, 16);
  const angry = night || this.panicT > 0 || this.quarrel;
  if (this.panicT > 0) this.panicT -= dt;
  if (!angry || !s.hunting) { this.wander(dt); const m = this.wanderMove(); m.want *= 0.8; return m; }
  this.voiceTick(dt, dist, 4, 6);
  if (dist < 1.4 + this.w && Math.abs(dyp) < 1.4 && this.attackCd <= 0) {
    this.attackCd = 1.0; this.swingT = 0.25;
    this.stings = ((this.stings || 0) + 1) % 2;
    if (this.stings) { this.striking = 0.4; p.hurt(T.damage + 1, { type: 'mob', attacker: this, knock: 2 }); }
    else p.hurt(T.damage, { type: 'mob', attacker: this, knock: 3, noEffect: true });
  }
  return this.chase(p, dist, toPlayer, dt);
};

// ---- big cats: they stalk you at night ----
{
  const base = Mob.prototype.archetypeAI;
  Mob.prototype.archetypeAI = function (dt, p, dist, dyp, toPlayer) {
    const T = this.T, g = this.game;
    if (T.stalker && p && !g.creative && !this.baby && !(this.angryT > 0)) {
      const night = g.dim === 0 && g.env.day < 0.4;
      if (night && dist < 14 && Math.abs(dyp) < 4) {
        // it closes in low and slow while you aren't looking, then charges
        const lx = this.x - p.x, lz = this.z - p.z, ly = p.yaw !== undefined ? -Math.sin(p.yaw) * lx - Math.cos(p.yaw) * lz : 0;
        const watched = ly > dist * 0.6;
        if (dist < 6 || (dist < 9 && !watched && Math.random() < dt * 0.5)) { this.provoke(p); g.sfx.playAt(T.sound + '_angry', this.x, this.y + 1, this.z); }
        else { this.sitting = this.sleeping = false; return { want: watched ? 0 : T.speed * 0.55, dir: this.goToward(p.x, p.y, p.z, dt) }; }
      }
    }
    return base.call(this, dt, p, dist, dyp, toPlayer);
  };
}

// ---- what a hit does to you: venom, frost, fire ----
{
  const base = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const p = this.player, before = p.health;
    base.call(this, amount, src);
    const a = src.attacker, fx = a && a.T && a.T.onHit;
    if (!fx || src.noEffect || p.health >= before || p.dead) return;
    if (fx.poison && (a.type !== 'scorpion' || src.type === 'mob')) p.poison = Math.max(p.poison || 0, fx.poison);
    if (fx.slow) p.slow = Math.max(p.slow || 0, fx.slow);
    if (fx.chill) p.chill = Math.max(p.chill || 0, fx.chill);
    if (fx.fire) p.burn = Math.max(p.burn || 0, fx.fire);
  };
  const baseUpdate = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    baseUpdate.call(this, dt, inp);
    const p = this.player;
    if (p.dead) { p.poison = p.chill = 0; return; }
    if (p.poison > 0) {
      p.poison -= dt;
      p._poisonT = (p._poisonT || 0) + dt;
      // venom wears you down, but never past the last half heart
      if (p._poisonT >= 1.25) { p._poisonT = 0; if (p.health > 1) this.hurt(1, { type: 'poison', bypassArmor: true }); }
    }
    if (p.chill > 0) { p.chill -= dt; if (p.slow < 0.2) p.slow = 0.2; }
  };
  // (arrows carry their archer's touch too: arrowHitsPawn names the archer as the attacker)
}
// creatures feel it too
{
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const dealt = baseHurt.call(this, amount, src);
    const fx = dealt > 0 && src.attacker && src.attacker.T && src.attacker.T.onHit;
    if (fx && this.alive) {
      if (fx.slow || fx.chill) this.slowT = Math.max(this.slowT, fx.slow || fx.chill);
      if (fx.poison && !this.T.undead) this.poisonT = Math.max(this.poisonT || 0, fx.poison);
      if (fx.fire && !this.T.fireImmune) this.burn = Math.max(this.burn, fx.fire);
    }
    return dealt;
  };
  const baseUpdate = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (this.poisonT > 0 && this.alive && !this.ghost) {
      this.poisonT -= dt; this._pT = (this._pT || 0) + dt;
      if (this._pT >= 1.25) { this._pT = 0; if (this.health > 1) this.hurt(1, { type: 'poison', knock: 0 }); }
    }
    baseUpdate.call(this, dt);
  };
}

// ---- where they turn up ----------------------------------------------------------------------------
Object.assign(SPAWNS, {
  savanna: [...SPAWNS.savanna, ['lioness', 3, 2, 3], ['lion', 1, 1, 1]],
  jungle: [...SPAWNS.jungle, ['tiger', 2, 1, 1], ['panther', 2, 1, 1], ['green_snake', 4, 1, 2]],
  snowy_peaks: [...SPAWNS.snowy_peaks, ['snow_leopard', 2, 1, 1]],
  desert: [...SPAWNS.desert, ['rattlesnake', 4, 1, 1], ['scorpion', 2, 1, 2]],
  swamp: [...SPAWNS.swamp, ['crocodile', 4, 1, 2], ['green_snake', 3, 1, 1]],
  plains: [...SPAWNS.plains, ['adder', 1, 1, 1]],
  forest: [...SPAWNS.forest, ['adder', 2, 1, 1]],
});
NEEDS_WATER.add('crocodile');
for (const k of ['ocean', 'warm']) WATER_SPAWNS[k].push(['shark', k === 'warm' ? 2 : 1, 1, 1]);

// The night crowd, by place: husks in the desert, strays on the snow, witches in the swamp, marauding
// bands on open ground, the rare wraith, werewolf or ogre; underground, cave spiders and stone mites.
{
  const NIGHT = {
    base: [['ghoul', 30], ['skeleton', 24], ['spider', 22], ['fuseling', 18], ['wraith', 1.2], ['ogre', 0.8]],
    desert: [['husk', 30], ['ghoul', 4], ['skeleton', 20], ['spider', 18], ['fuseling', 16], ['scorpion', 10], ['wraith', 1]],
    snowy: [['ghoul', 28], ['stray', 26], ['spider', 16], ['fuseling', 16], ['wraith', 1.5]],
    swamp: [['ghoul', 26], ['skeleton', 18], ['spider', 18], ['fuseling', 14], ['witch', 7], ['slime', 8], ['drowned', 6]],
    forest: [['ghoul', 30], ['skeleton', 24], ['spider', 22], ['fuseling', 18], ['raider', 0.3], ['werewolf', 1.2], ['wraith', 1.2], ['ogre', 0.8]],
    open: [['ghoul', 30], ['skeleton', 24], ['spider', 22], ['fuseling', 18], ['raider', 0.4], ['wraith', 1], ['ogre', 1]],
  };
  const habGroup = (h) => h === 'desert' ? 'desert' : /snow/.test(h) ? 'snowy' : h === 'swamp' ? 'swamp' : /forest|taiga|jungle/.test(h) ? 'forest' : /plains|savanna|mountains/.test(h) ? 'open' : 'base';
  const pickW = (list) => { let t = 0; for (const e of list) t += e[1]; let q = Math.random() * t; for (const e of list) { q -= e[1]; if (q <= 0) return e[0]; } return list[0][0]; };
  Game.prototype.spawnMonsters = function (p, ring, surfaceY) {
    const w = this.world, r = Math.random;
    const spawnOne = (t, x, y, z) => {
      const m = this.addEntity(new Mob(this, t, x + 0.5, y, z + 0.5));
      if (t === 'slime' || t === 'magma_slime') m.setSize(r() < 0.6 ? 2 : 1);
      if (t === 'raider') {   // a band: a leader and two to four more
        for (let i = 0, n = 2 + Math.floor(r() * 3); i < n; i++) { const o = this.addEntity(new Mob(this, 'raider', x + 0.5 + (r() - 0.5) * 3, y, z + 0.5 + (r() - 0.5) * 3)); o.leader = m; if (r() < 0.35) o.heldItem = 'stone_axe'; }
      }
      if (t === 'drowned' && r() < 0.2) m.heldItem = 'iron_sword';
      return m;
    };
    // at night, out in the open: only where no torch or lamp reaches at all (light 0), as in Minecraft
    if (this.env.day < 0.42 && r() < 0.3) {
      const [x, z] = ring(24, 44);
      const y = surfaceY(x, z);
      if (y > 0 && (w.getLight(x, y, z) & 15) === 0) {
        const ground = w.getBlock(x, y - 1, z);
        if (T_LIQUID[ground]) {
          // the drowned come up out of deep water
          let depth = 0; while (depth < 8 && T_LIQUID[w.getBlock(x, y - 1 - depth, z)] === 1) depth++;
          if (depth >= 3 && r() < 0.35) spawnOne('drowned', x, y - depth, z);
        } else {
          const hab = habitatAt(w, x, z, ground);
          let t = pickW(NIGHT[habGroup(hab)]);
          if (t === 'werewolf' && this.entities.some(e => e.type === 'werewolf')) t = 'ghoul';
          if (t === 'ogre' && this.entities.some(e => e.type === 'ogre')) t = 'skeleton';
          if (t === 'drowned') { t = 'ghoul'; }
          if (t === 'wraith') spawnOne(t, x, y + 1, z);
          else spawnOne(t, x, y, z);
        }
      }
    }
    // underground, in the dark
    if (r() < 0.2) {
      const [x, z] = ring(14, 30);
      const y0 = Math.floor(p.y) + Math.floor(r() * 24) - 12;
      for (let y = y0; y > y0 - 8 && y > 2; y--) {
        if (T_SOLID[w.getBlock(x, y - 1, z)] && w.getBlock(x, y, z) === 0 && w.getBlock(x, y + 1, z) === 0) {
          const l = w.getLight(x, y, z);
          if ((l >> 4) * this.env.day < 6 && (l & 15) === 0 && (l >> 4) < 12) {
            const q = r();
            let t = y < 40 && q < 0.12 ? 'slime' : y < 32 && q < 0.26 ? 'cave_spider' : null;   // (stone mites are gone)
            if (!t) { const k = r(); t = k < 0.34 ? 'ghoul' : k < 0.58 ? 'skeleton' : k < 0.8 ? 'spider' : 'fuseling'; }
            if (t === 'cave_spider' && r() < 0.5) spawnOne(t, x, y, z);   // they come in twos and threes
            spawnOne(t, x, y, z);
          }
          break;
        }
      }
    }
  };
  // the Ember Depths: wisps and magma slimes besides the charred ghouls
  const baseDepths = Game.prototype.spawnDepths;
  Game.prototype.spawnDepths = function (p, ring) {
    baseDepths.call(this, p, ring);
    const w = this.world, r = Math.random;
    let n = 0; for (const e of this.entities) if (e instanceof Mob && (e.type === 'cinder_wisp' || e.type === 'magma_slime')) n++;
    if (n >= 6 || r() > 0.3) return;
    const [x, z] = ring(16, 34);
    const y0 = Math.floor(p.y) + Math.floor(r() * 20) - 10;
    for (let y = y0; y > y0 - 10 && y > 2; y--) {
      if (T_SOLID[w.getBlock(x, y - 1, z)] && !w.getBlock(x, y, z) && !w.getBlock(x, y + 1, z)) {
        if (r() < 0.45) this.addEntity(new Mob(this, 'cinder_wisp', x + 0.5, y + 1.5, z + 0.5));
        else { const m = this.addEntity(new Mob(this, 'magma_slime', x + 0.5, y, z + 0.5)); m.setSize(r() < 0.6 ? 2 : 1); }
        break;
      }
    }
  };
}

// voices for the creatures that speak through the older synth (hurt/death calls come from T.voice)
for (const [k, v] of [['husk', 'husk'], ['drowned', 'drowned'], ['stray', 'stray'], ['cave_spider', 'spider'], ['witch', 'witch'], ['stone_mite', 'mite'], ['wraith', 'wraith'], ['cinder_wisp', 'wisp'], ['magma_slime', 'magma'],
  ['raider', 'raider'], ['werewolf', 'werewolf'], ['ogre', 'ogre'], ['crocodile', 'croc'], ['rattlesnake', 'rattlesnake'], ['green_snake', 'snake'], ['adder', 'snake'], ['scorpion', 'scorpion']]) MOB_TYPES[k].voice = v;

// ---- night creatures nobody is near wander off (Minecraft despawns them the same way) --------------------
{
  const baseUpdate = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    baseUpdate.call(this, dt);
    if (this.ghost || this.remove || !this.T.hostile || this.T.boss || this.kept || this.owner || this.netOwner || this.persistent || this.raid) return;
    let near = Infinity;
    for (const q of this.game.pawns()) if (!q.dead) near = Math.min(near, Math.hypot(q.x - this.x, q.z - this.z));
    if (near > 40) { this._farT = (this._farT || 0) + dt; if (this._farT > 20 && Math.random() < dt * 0.05) this.remove = true; }
    else this._farT = 0;
    if (near > 96) this.remove = true;
  };
}
