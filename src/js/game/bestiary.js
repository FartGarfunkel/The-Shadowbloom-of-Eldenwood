// ---------------------------------------------------------------------------
// game/bestiary.js — the 0.8 animals and how they live.
//
// Every new creature has an archetype that decides its behaviour:
//   passive    grazes, wanders, keeps near its herd, runs from danger
//   neutral    leaves you alone until you hurt it (or its young), then fights;
//              packs answer each other (wolves, bees, llamas spit, goats ram)
//   predator   now and then gets hungry and hunts smaller animals
//   flyer      bats (roost upside down by day), parrots (perch in trees), bees
//   swimmer    fish in schools, squid, dolphins that leap and come to play
//   amphibian  turtles, axolotls (play dead when hurt), frogs (eat small slimes)
// Spawning picks animals by habitat (plains, forest, taiga, snow, mountains,
// savanna, desert, jungle, swamp, beach, ocean, caves) with separate caps for
// land animals, water life, cave bats and monsters.
// ---------------------------------------------------------------------------

// ---- what they drop -----------------------------------------------------------------------
defItem('cod', { name: 'Raw Cod', food: { heal: 1 } });
defItem('cooked_cod', { name: 'Cooked Cod', food: { heal: 5 } });
defItem('salmon', { name: 'Raw Salmon', food: { heal: 2 } });
defItem('cooked_salmon', { name: 'Cooked Salmon', food: { heal: 6 } });
defItem('tropical_fish', { name: 'Tropical Fish', food: { heal: 1 } });
defItem('pufferfish', { name: 'Pufferfish', food: { heal: 1 }, desc: 'Not good to eat.' });
defItem('ink_sac', { name: 'Ink Sac', dye: 'black', desc: 'Black dye, and ink for writing.' });
defItem('glow_ink_sac', { name: 'Glow Ink Sac', desc: 'Makes the writing on signs glow.' });
defItem('turtle_scute', { name: 'Turtle Scute', desc: 'Shed by young turtles as they grow up.' });
defItem('goat_horn', { name: 'Goat Horn', maxStack: 1, desc: 'Knocked off when a goat rams something hard.' });
defItem('spider_eye', { name: 'Spider Eye', food: { heal: 1 } });
defItem('rotten_flesh', { name: 'Rotten Flesh', food: { heal: 1 } });
defItem('rabbit_foot', { name: "Rabbit's Foot", desc: 'Said to be lucky.' });
Object.assign(SMELTING, { cod: 'cooked_cod', salmon: 'cooked_salmon' });
FOOD_SMELTS.add('cod'); FOOD_SMELTS.add('salmon');

// ---- the animals ---------------------------------------------------------------------------
// ai: archetype. Flags: herd (keeps together), prey (list a predator hunts), pack (answers its own
// kind), skittish (bolts when you come this close), protective (guards its young), rams, spit,
// curls, roosts, perches, stings, school, puffs, playful, needsAir, glows, swims, walks, fly (speed).
const MOB_NEW = {
  horse: { variants: ['horse_chestnut', 'horse_black', 'horse_white', 'horse_dun'], label: 'a horse', ai: 'passive', hp: 22, w: 0.6, h: 1.6, speed: 1.6, run: 7.5, xp: 3, herd: true, grazer: true, farm: true, food: ['wheat', 'apple', 'golden_apple', 'hay_bale', 'sugar', 'carrot'], sound: 'horse', ride: 'horse', carryScale: 0.3, drops: [['leather', 0, 2, 1]] },
  donkey: { model: 'donkey', label: 'a donkey', ai: 'passive', hp: 20, w: 0.5, h: 1.4, speed: 1.4, run: 6, xp: 3, herd: true, grazer: true, farm: true, food: ['wheat', 'apple', 'hay_bale', 'carrot'], sound: 'donkey', ride: 'horse', carryScale: 0.35, drops: [['leather', 0, 2, 1]] },
  llama: { variants: ['llama_cream', 'llama_brown', 'llama_white', 'llama_gray'], label: 'a llama', ai: 'neutral', hp: 22, w: 0.45, h: 1.8, speed: 1.4, run: 5, xp: 3, herd: true, pack: true, spit: true, grazer: true, farm: true, food: ['wheat', 'hay_bale'], sound: 'llama', carryScale: 0.35, drops: [['leather', 0, 2, 1]] },
  camel: { model: 'camel', label: 'a camel', ai: 'passive', hp: 32, w: 0.8, h: 2.3, speed: 1.2, run: 5, xp: 4, grazer: true, farm: true, food: ['cactus'], sound: 'camel', ride: 'camel', carryScale: 0.25, drops: [] },
  wolf: { model: 'wolf', label: 'a wolf', ai: 'predator', hp: 8, w: 0.3, h: 0.85, speed: 2.2, run: 5.8, xp: 3, damage: 2, pack: true, prey: ['sheep', 'rabbit', 'fox', 'snow_fox', 'deer', 'skeleton'], sound: 'wolf', carryScale: 0.6, drops: [] },
  fox: { model: 'fox', label: 'a fox', ai: 'predator', hp: 10, w: 0.3, h: 0.7, speed: 2.0, run: 6.5, xp: 2, damage: 2, skittish: 9, nocturnal: true, prey: ['chicken', 'rabbit', 'mouse', 'duck', 'turkey'], food: ['sweet_berries', 'glow_berries'], farm: true, sound: 'fox', carry: true, carryScale: 0.7, drops: [] },
  snow_fox: { model: 'snow_fox', label: 'a snow fox', ai: 'predator', hp: 10, w: 0.3, h: 0.7, speed: 2.0, run: 6.5, xp: 2, damage: 2, skittish: 9, nocturnal: true, prey: ['chicken', 'rabbit', 'mouse'], food: ['sweet_berries', 'glow_berries'], farm: true, sound: 'fox', carry: true, carryScale: 0.7, drops: [] },
  raccoon: { model: 'raccoon', label: 'a raccoon', ai: 'passive', hp: 8, w: 0.28, h: 0.55, speed: 1.9, run: 6, xp: 2, skittish: 6, nocturnal: true, sound: 'raccoon', carry: true, carryScale: 0.8, drops: [['leather', 0, 1, 0.5]] },
  cat: { variants: ['cat_tabby', 'cat_black'], label: 'a cat', ai: 'predator', hp: 10, w: 0.3, h: 0.7, speed: 1.8, run: 6.5, xp: 2, damage: 1, skittish: 6, prey: ['mouse', 'rabbit'], farm: true, food: ['cod', 'salmon'], sound: 'cat', carry: true, carryScale: 0.8, drops: [['string', 0, 2, 1]] },
  ocelot: { model: 'ocelot', label: 'an ocelot', ai: 'predator', hp: 10, w: 0.3, h: 0.7, speed: 2.0, run: 7, xp: 3, damage: 2, skittish: 12, prey: ['chicken', 'mouse', 'parrot'], farm: true, food: ['cod', 'salmon'], sound: 'cat', carry: true, carryScale: 0.8, drops: [] },
  polar_bear: { model: 'polar_bear', label: 'a polar bear', ai: 'neutral', hp: 30, w: 0.7, h: 1.4, speed: 1.8, run: 5.2, xp: 5, damage: 6, protective: true, bear: true, sound: 'bear', carryScale: 0.35, drops: [['cod', 0, 2, 0.75], ['salmon', 0, 2, 0.25]] },
  brown_bear: { model: 'brown_bear', label: 'a brown bear', ai: 'neutral', hp: 30, w: 0.7, h: 1.45, speed: 1.8, run: 5.2, xp: 5, damage: 6, protective: true, bear: true, sound: 'bear', carryScale: 0.35, drops: [['raw_meat', 1, 3, 1], ['leather', 0, 2, 1]] },
  panda: { model: 'panda', label: 'a panda', ai: 'passive', hp: 20, w: 0.65, h: 1.25, speed: 1.2, xp: 3, damage: 4, angersWhenHurt: true, farm: true, food: ['bamboo'], sound: 'panda', bear: true, carryScale: 0.4, drops: [['bamboo', 0, 2, 1]] },
  goat: { model: 'goat', label: 'a goat', ai: 'neutral', hp: 10, w: 0.45, h: 1.3, speed: 1.6, run: 5, xp: 2, damage: 2, rams: true, grazer: true, farm: true, food: ['wheat'], sound: 'goat', climbs: true, carryScale: 0.5, drops: [['goat_horn', 1, 1, 0.08]] },
  armadillo: { model: 'armadillo', label: 'an armadillo', ai: 'passive', hp: 12, w: 0.35, h: 0.45, speed: 1.2, xp: 2, curls: true, farm: true, food: ['spider_eye'], sound: 'armadillo', carry: true, carryScale: 1, drops: [] },
  mouse: { model: 'mouse', label: 'a mouse', ai: 'passive', hp: 2, w: 0.15, h: 0.22, speed: 1.8, run: 6, xp: 1, skittish: 5, farm: true, food: ['wheat_seeds'], sound: 'mouse', carry: true, carryScale: 1.4, drops: [] },
  turkey: { model: 'turkey', label: 'a turkey', ai: 'passive', hp: 8, w: 0.3, h: 0.95, speed: 1.3, xp: 2, pecker: true, farm: true, food: ['wheat_seeds', 'beetroot_seeds', 'pumpkin_seeds', 'melon_seeds'], sound: 'turkey', carry: true, carryScale: 0.6, displays: true, drops: [['chicken', 1, 2, 1], ['feather', 1, 3, 1]] },
  duck: { variants: ['duck', 'mallard'], label: 'a duck', ai: 'passive', hp: 4, w: 0.25, h: 0.6, speed: 1.2, xp: 1, pecker: true, floaty: true, farm: true, layer: true, food: ['wheat_seeds', 'beetroot_seeds', 'pumpkin_seeds', 'melon_seeds'], sound: 'duck', carry: true, carryScale: 0.8, drops: [['chicken', 1, 1, 1], ['feather', 0, 2, 1]] },
  parrot: { variants: ['parrot_red', 'parrot_green', 'parrot_blue', 'parrot_gray'], label: 'a parrot', ai: 'flyer', hp: 6, w: 0.25, h: 0.6, speed: 1.4, fly: 4, xp: 2, perches: true, food: ['wheat_seeds', 'melon_seeds', 'pumpkin_seeds', 'beetroot_seeds'], sound: 'parrot', carry: true, carryScale: 1, drops: [['feather', 1, 2, 1]] },
  bat: { model: 'bat', label: 'a bat', ai: 'flyer', hp: 6, w: 0.25, h: 0.5, speed: 2, fly: 5, xp: 0, roosts: true, ambient: true, sound: 'bat', drops: [] },
  bee: { model: 'bee', label: 'a bee', ai: 'flyer', hp: 10, w: 0.3, h: 0.45, speed: 1.6, fly: 3.4, xp: 1, damage: 2, stings: true, pack: true, sound: 'bee', drops: [] },
  squid: { model: 'squid', label: 'a squid', ai: 'swimmer', hp: 10, w: 0.45, h: 0.9, speed: 1.2, xp: 1, swims: true, water: true, sound: 'squid', drops: [['ink_sac', 1, 3, 1]] },
  glow_squid: { model: 'glow_squid', label: 'a glow squid', ai: 'swimmer', hp: 10, w: 0.45, h: 0.9, speed: 1.2, xp: 1, swims: true, water: true, glows: 10, sound: 'squid', drops: [['glow_ink_sac', 1, 3, 1]] },
  cod: { model: 'cod', label: 'a cod', ai: 'swimmer', hp: 3, w: 0.25, h: 0.3, speed: 1.6, xp: 1, swims: true, water: true, school: true, sound: 'fish', carry: true, carryScale: 1.2, drops: [['cod', 1, 1, 1], ['bone_meal', 1, 1, 0.05]] },
  salmon: { model: 'salmon', label: 'a salmon', ai: 'swimmer', hp: 3, w: 0.3, h: 0.35, speed: 1.8, xp: 1, swims: true, water: true, school: true, sound: 'fish', carry: true, carryScale: 1.1, drops: [['salmon', 1, 1, 1], ['bone_meal', 1, 1, 0.05]] },
  tropical_fish: { variants: ['tropical_orange', 'tropical_blue', 'tropical_pink'], label: 'a tropical fish', ai: 'swimmer', hp: 3, w: 0.25, h: 0.35, speed: 1.6, xp: 1, swims: true, water: true, school: true, sound: 'fish', carry: true, carryScale: 1.2, drops: [['tropical_fish', 1, 1, 1]] },
  pufferfish: { model: 'pufferfish', label: 'a pufferfish', ai: 'swimmer', hp: 3, w: 0.3, h: 0.3, speed: 1.0, xp: 1, swims: true, water: true, puffs: true, sound: 'fish', carry: true, carryScale: 1.2, drops: [['pufferfish', 1, 1, 1]] },
  dolphin: { model: 'dolphin', label: 'a dolphin', ai: 'swimmer', hp: 10, w: 0.45, h: 0.6, speed: 4, xp: 3, damage: 3, swims: true, water: true, playful: true, needsAir: true, pack: true, sound: 'dolphin', drops: [['cod', 0, 1, 1]] },
  turtle: { model: 'turtle', label: 'a turtle', ai: 'amphibian', hp: 30, w: 0.6, h: 0.4, speed: 0.7, swimSpeed: 2.4, xp: 2, swims: true, walks: true, farm: true, food: ['seagrass'], sound: 'turtle', carry: true, carryScale: 0.6, drops: [['seagrass', 0, 2, 1]] },
  axolotl: { variants: ['axolotl_pink', 'axolotl_blue', 'axolotl_gold', 'axolotl_wild'], label: 'an axolotl', ai: 'amphibian', hp: 14, w: 0.35, h: 0.3, speed: 0.9, swimSpeed: 3.2, xp: 2, damage: 2, swims: true, walks: true, prey: ['cod', 'salmon', 'tropical_fish', 'pufferfish', 'squid', 'glow_squid'], playsDead: true, farm: true, food: ['tropical_fish'], sound: 'axolotl', carry: true, carryScale: 1, drops: [] },
  frog: { model: 'frog', label: 'a frog', ai: 'amphibian', hp: 10, w: 0.25, h: 0.45, speed: 1.0, swimSpeed: 2.2, xp: 2, swims: true, walks: true, hopper: true, frogTongue: true, farm: true, food: ['slime_ball'], sound: 'frog', carry: true, carryScale: 1, drops: [] },
  aerbunny: { model: 'aerbunny', label: 'an aerbunny', ai: 'passive', hp: 4, w: 0.25, h: 0.5, speed: 1.4, run: 5.5, xp: 1, skittish: 6, floaty: true, hopper: true, carry: true, carryScale: 0.9, sound: 'rabbit', drops: [['string', 0, 2, 1]] },
  moa: { model: 'moa', label: 'a moa', ai: 'passive', hp: 20, w: 0.5, h: 1.9, speed: 1.8, run: 7, xp: 3, pecker: true, farm: true, food: ['wheat_seeds', 'beetroot_seeds'], sound: 'moa', ride: 'moa', carryScale: 0.3, drops: [['feather', 1, 3, 1], ['chicken', 1, 2, 1]] },
};
for (const [k, T] of Object.entries(MOB_NEW)) { if (!T.model) T.model = T.variants[0]; MOB_TYPES[k] = T; }
// the older animals: who hunts whom, who keeps together
Object.assign(MOB_TYPES.sheep, { herd: true }); Object.assign(MOB_TYPES.cow, { herd: true }); Object.assign(MOB_TYPES.deer, { herd: true });
const PREDATORS = {};
for (const [k, T] of Object.entries(MOB_TYPES)) for (const q of T.prey || []) (PREDATORS[q] || (PREDATORS[q] = [])).push(k);

// the faces they make, synced to guests in co-op
const MOB_FLAG_BITS = ['roosting', 'puffed', 'curled', 'sitting', 'sleeping', 'playDead', 'tongueOut', 'angry', 'wet', 'dancing', 'ramming', 'hasSting'];
Object.assign(Mob.prototype, {
  flags() { let f = 0; MOB_FLAG_BITS.forEach((k, i) => { if (k === 'wet' ? this.inWater : k === 'angry' ? this.angryT > 0 : this[k]) f |= 1 << i; }); if (this.displayT > 0) f |= 1 << 12; if (this.rearT > 0) f |= 1 << 13; return f; },
  setFlags(f) { MOB_FLAG_BITS.forEach((k, i) => { const on = !!(f & (1 << i)); if (k === 'wet') this.inWater = on; else if (k === 'angry') this.angryT = on ? 1 : 0; else this[k] = on; }); this.displayT = f & (1 << 12) ? 1 : 0; this.rearT = f & (1 << 13) ? 1 : 0; },
});

// ---- behaviour ---------------------------------------------------------------------------------
const heading = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
Object.assign(Mob.prototype, {
  archetypeAI(dt, p, dist, dyp, toPlayer) {
    const T = this.T, g = this.game;
    if (T.stings && this.hasSting === undefined) this.hasSting = true;
    if (this.angryT > 0) this.angryT -= dt;
    if (this.rearT > 0) this.rearT -= dt;
    if (this.displayT > 0) this.displayT -= dt;
    if (this.croakT > 0) this.croakT -= dt;
    if (this.tongueT > 0) { this.tongueT -= dt; this.tongueOut = this.tongueT > 0; }
    this._scanT = (this._scanT || 0) - dt;
    if (this._scanT <= 0) { this._scanT = 0.5 + Math.random() * 0.3; this.scanAround(); }
    this.voice(dt, dist);
    const far = T.water ? 72 : T.ambient ? 64 : 110;
    if (dist > far && !this.kept) this.remove = true;
    switch (T.ai) {
      case 'flyer': return this.flyerAI(dt, p, dist, dyp, toPlayer);
      case 'swimmer': return this.swimmerAI(dt, p, dist, dyp, toPlayer);
      case 'amphibian': return this.amphibianAI(dt, p, dist, dyp, toPlayer);
      default: return this.landAI(dt, p, dist, dyp, toPlayer);
    }
  },
  // Who's around? (looked at a couple of times a second, not every frame)
  scanAround() {
    const g = this.game, T = this.T;
    this.nearPred = null; this.nearPrey = null; this.herdMate = null; this.herdCount = 0; this.leader = null;
    let dPred = 9, dPrey = 16, dHerd = 40;
    const preds = PREDATORS[this.type];
    for (const e of g.entities) {
      if (e === this || !(e instanceof Mob) || !e.alive) continue;
      const d = Math.abs(e.x - this.x) + Math.abs(e.z - this.z);
      if (d > 40) continue;
      if (preds && preds.includes(e.type) && !e.owner && d < dPred) { dPred = d; this.nearPred = e; }
      if (T.prey && T.prey.includes(e.type) && !e.fed && !e.owner && d < dPrey && (e.type !== 'skeleton' || this.type === 'wolf')) { dPrey = d; this.nearPrey = e; }
      if (e.type === this.type) {
        this.herdCount++;
        if (d < dHerd) { dHerd = d; this.herdMate = e; }
        if (T.school && e.id < this.id && (!this.leader || e.id < this.leader.id) && d < 10) this.leader = e;
      }
    }
  },
  // Their calls, now and then (and more often when upset).
  voice(dt, dist) {
    this.soundT -= dt;
    if (this.soundT > 0) return;
    const T = this.T;
    this.soundT = (T.ai === 'swimmer' ? 14 : T.ambient ? 4 : 7) + Math.random() * 10;
    if (!T.sound || dist > 20) return;
    let s = T.sound;
    if (this.angryT > 0 && (T.sound === 'wolf' || T.sound === 'bear' || T.sound === 'cat' || T.sound === 'bee')) s += '_angry';
    else if (T.sound === 'wolf' && this.game.env.day < 0.35 && Math.random() < 0.3) s = 'wolf_howl';
    else if (T.sound === 'cat' && this.sitting && Math.random() < 0.5) s = 'cat_purr';
    if (T.sound === 'fish' && this.inWater) return;
    if (T.sound === 'frog') this.croakT = 0.6;
    if (T.displays && Math.random() < 0.5) this.displayT = 2.5;
    this.game.sfx.playAt(s, this.x, this.y + this.h * 0.7, this.z);
  },
  // Steer toward a point (and round walls, using the path finder for longer walks).
  goToward(tx, ty, tz, dt) {
    const d = Math.hypot(tx - this.x, tz - this.z);
    return (d > 3 && this.navDir ? this.navDir(tx, ty, tz, dt) : null) ?? heading(this.x, this.z, tx, tz);
  },
  fleeDir(from) {
    let away = from ? heading(from.x, from.z, this.x, this.z) : this.yaw;
    if (this.hitWall) this.fleeTurn = (this.fleeTurn || (Math.random() < 0.5 ? -1 : 1));
    else if (this.fleeTurn && Math.random() < 0.02) this.fleeTurn = 0;
    return away + (this.fleeTurn || 0) * 0.9 + Math.sin(this.age * 1.7) * 0.18;
  },
  bite(target, dmg) {
    if (!target || this.attackCd > 0) return false;
    const d = Math.hypot(target.x - this.x, target.z - this.z), dy = Math.abs(target.y - this.y);
    if (d > 1.1 + this.w + (target.w || 0.3) || dy > 1.8) return false;
    this.attackCd = 1.0 + Math.random() * 0.3; this.swingT = 0.3;
    if (this.T.bear) this.rearT = 0.6;
    target.hurt(dmg, { type: 'mob', attacker: this, knock: this.T.bear ? 7 : 4 });
    return true;
  },

  // ---- on land: grazers, herds, hunters, and anything that fights back ----
  landAI(dt, p, dist, dyp, toPlayer) {
    const T = this.T, g = this.game;
    // armadillos curl up when something big comes close, and unroll when it's gone
    if (T.curls) {
      const scared = (p && dist < 3.5 && !p.sneaking) || this.hurtTime > 0 || this.nearPred;
      if (scared) this.curlT = 4;
      this.curlT = (this.curlT || 0) - dt; this.curled = this.curlT > 0;
      if (this.curled) return { want: 0, dir: this.yaw };
    }
    // fighting back
    const foe = this.angryT > 0 ? this.foe : null;
    if (foe && (foe.dead || (foe.alive === false) || foe.remove || Math.hypot(foe.x - this.x, foe.z - this.z) > 28)) this.angryT = 0;
    if (this.angryT > 0 && foe) return this.fight(dt, foe);
    // polar bears and brown bears guard their cubs
    if (T.protective && p && dist < 7 && !this.baby && this.herdMate && this.herdMate.baby && Math.hypot(p.x - this.herdMate.x, p.z - this.herdMate.z) < 6 && !g.creative) this.provoke(p);
    // danger: run
    if (this.nearPred && this.panicT <= 0 && Math.hypot(this.nearPred.x - this.x, this.nearPred.z - this.z) < 7) { this.panicT = 2.5; this.fleeFrom = this.nearPred; }
    const spooked = T.skittish && p && dist < T.skittish * (p.sneaking ? 0.45 : 1) && !this.fed && !this.owner;
    if (spooked && this.panicT <= 0) { this.panicT = 2 + Math.random() * 2; this.fleeFrom = p; }
    if (this.panicT > 0) { this.panicT -= dt; this.sitting = this.sleeping = false; return { want: T.run || T.speed * 2.2, dir: this.fleeDir(this.fleeFrom || p) }; }
    // in love, or following someone with food
    if (T.farm) { const f = this.farmAI(dt, p, dist, toPlayer); if (f) { this.sitting = this.sleeping = false; return f; } }
    // hungry hunters go after prey
    if (T.ai === 'predator') {
      this.hunger = (this.hunger || Math.random() * 90) + dt;
      const pr = this.nearPrey;
      if (this.hunger > 110 && pr && pr.alive && !this.baby) {
        this.sitting = this.sleeping = false;
        if (this.bite(pr, T.damage || 2) && !pr.alive) { this.hunger = 0; this.grazeT = this.grazeMax = 2.5; }
        if (!pr.alive) this.hunger = 0;
        return { want: T.run || T.speed * 2, dir: this.goToward(pr.x, pr.y, pr.z, dt) };
      }
    }
    // goats wander up to high places and butt things now and then
    if (T.rams && p && !this.baby && dist > 4 && dist < 9 && Math.random() < dt * 0.01 && !g.creative && !p.sneaking) { this.provoke(p); this.angryT = 4; this.ramOnce = true; }
    // night owls nap by day; cats and foxes sit about
    const restful = T.nocturnal ? g.env.day > 0.6 : g.env.day < 0.3;
    if ((T.ai === 'predator' || T.sound === 'raccoon') && (this.wanderOn === false)) {
      if (!this.sitting && !this.sleeping && Math.random() < dt * 0.05) { if (restful) this.sleeping = true; else if (T.sound === 'cat' || T.sound === 'fox' || T.sound === 'wolf') this.sitting = true; }
    } else this.sitting = this.sleeping = false;
    if ((this.sitting || this.sleeping) && Math.random() < dt * 0.04) this.sitting = this.sleeping = false;
    if (this.sitting || this.sleeping) return { want: 0, dir: this.yaw };
    // keep near the herd
    if (T.herd && this.herdMate) {
      const hm = this.herdMate, d = Math.hypot(hm.x - this.x, hm.z - this.z);
      if (d > 10) return { want: T.speed * 0.8, dir: this.goToward(hm.x, hm.y, hm.z, dt) };
    }
    // young ones stay by a grown-up
    if (this.baby && this.herdMate && !this.herdMate.baby && Math.hypot(this.herdMate.x - this.x, this.herdMate.z - this.z) > 4) return { want: T.speed * 1.2, dir: this.goToward(this.herdMate.x, this.herdMate.y, this.herdMate.z, dt) };
    this.wander(dt);
    return this.wanderMove();
  },
  // Someone hurt us (or our young): fight them, and call the pack.
  provoke(who) {
    if (!who || this.T.ai === 'passive' && !this.T.angersWhenHurt) return;
    this.angryT = 20 + Math.random() * 10; this.foe = who; this.panicT = 0; this.sitting = this.sleeping = false;
    if (this.T.pack) for (const e of this.game.entities) if (e !== this && e.type === this.type && e.alive && !(e.angryT > 0) && Math.hypot(e.x - this.x, e.z - this.z) < 16) { e.angryT = 20; e.foe = who; e.panicT = 0; }
  },
  fight(dt, foe) {
    const T = this.T, d = Math.hypot(foe.x - this.x, foe.z - this.z), dir = this.goToward(foe.x, foe.y, foe.z, dt);
    // llamas spit from a distance
    if (T.spit) {
      this.spitT = (this.spitT ?? 1) - dt;
      if (this.spitT <= 0 && d < 10) { this.spitT = 2 + Math.random(); this.spitAt(foe); }
      return { want: d < 5 ? -T.speed * 0.4 : d > 8 ? T.speed : 0, dir };
    }
    // goats back off, lower their heads and charge
    if (T.rams) {
      this.ramT = (this.ramT || 0) - dt;
      if (this.ramming) {
        if (this.bite(foe, T.damage || 2)) { this.ramming = false; this.ramT = 2.5; foe.knock && foe.knock(-Math.sin(this.yaw) * 9, 4, -Math.cos(this.yaw) * 9); if (this.ramOnce) { this.ramOnce = false; this.angryT = 0; } }
        else if (this.hitWall) { this.ramming = false; this.ramT = 2; if (Math.random() < 0.15) this.game.dropItem(mkStack('goat_horn', 1), this.x, this.y + 1, this.z, true); this.game.sfx.playAt('thud', this.x, this.y, this.z); }
        return { want: 6.5, dir: this.yaw };
      }
      if (this.ramT <= 0 && d > 3 && d < 9) { this.ramming = true; this.yaw = dir; this.game.sfx.playAt('goat', this.x, this.y + 1, this.z); return { want: 6.5, dir }; }
      return { want: d < 4 ? -T.speed : T.speed * 0.5, dir };
    }
    this.bite(foe, (T.damage || 2) + (this.baby ? -1 : 0));
    return { want: d < 0.8 ? 0 : (T.run || T.speed * 2) * 0.85, dir };
  },
  spitAt(foe) {
    const g = this.game;
    const ex = this.x - Math.sin(this.yaw) * 0.6, ey = this.y + this.h * 0.9, ez = this.z - Math.cos(this.yaw) * 0.6;
    const tx = foe.x - ex, ty = foe.y + 1.2 - ey, tz = foe.z - ez, l = Math.hypot(tx, ty, tz) || 1;
    g.addEntity(new Projectile(g, ex, ey, ez, tx / l * 12, ty / l * 12 + l * 0.35, tz / l * 12, 'spit', this));
    g.sfx.playAt('spit', ex, ey, ez);
  },

  // ---- in the air ----
  flyerAI(dt, p, dist, dyp, toPlayer) {
    const T = this.T, g = this.game, w = g.world;
    const solid = (x, y, z) => !!T_SOLID[w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))];
    this.noGrav = true;
    // bats: hang from a cave roof (or under a ledge) while it's light outside or nobody's near
    if (T.roosts) {
      if (this.roosting) {
        this.flyVy = 0; this.vx = this.vz = 0;
        if (!solid(this.x, this.y + this.h + 0.2, this.z) || (p && dist < 4 && !p.sneaking) || this.hurtTime > 0) { this.roosting = false; g.sfx.playAt('bat', this.x, this.y, this.z); }
        return { want: 0, dir: this.yaw };
      }
      this.roostT = (this.roostT || 4 + Math.random() * 10) - dt;
      if (this.roostT <= 0 && solid(this.x, this.y + this.h + 0.35, this.z)) { this.roosting = true; this.roostT = 8 + Math.random() * 20; this.y = Math.floor(this.y + this.h + 0.35) - this.h - 0.01; return { want: 0, dir: this.yaw }; }
      // jittery flight, rising toward roofs when it wants to rest
      this.flitT = (this.flitT || 0) - dt;
      if (this.flitT <= 0 || this.hitWall) { this.flitT = 0.4 + Math.random() * 1.2; this.flitDir = Math.random() * TAU; this.flitUp = this.roostT < 3 ? 2.5 : (Math.random() - 0.45) * 4; }
      if (solid(this.x, this.y - 0.6, this.z)) this.flitUp = Math.max(this.flitUp, 1.5);
      this.flyVy = this.flitUp;
      return { want: T.fly, dir: this.flitDir };
    }
    // bees: sting whoever bothered them (once), otherwise drift from flower to flower
    if (T.stings && this.angryT > 0 && this.foe && this.hasSting) {
      const f = this.foe, d = Math.hypot(f.x - this.x, f.z - this.z);
      this.flyVy = clamp((f.y + 1.2 - this.y) * 2, -3, 3);
      if (d < 1 + this.w && Math.abs(f.y + 1 - this.y) < 1.4 && this.attackCd <= 0) { this.attackCd = 1; f.hurt(T.damage || 2, { type: 'mob', attacker: this, knock: 2 }); this.hasSting = false; this.angryT = 0; }
      return { want: T.fly * 1.3, dir: heading(this.x, this.z, f.x, f.z) };
    }
    // parrots and bees settle on leaves, grass or flowers when they've flown a while
    if (this.perched) {
      this.flyVy = -1; this.noGrav = false;
      this.perchT -= dt;
      if (this.perchT <= 0 || (p && dist < 3 && !p.sneaking && T.perches) || this.hurtTime > 0) { this.perched = false; this.noGrav = true; this.flyVy = 3; }
      // a jukebox playing nearby: dance
      this.dancing = !!(T.perches && g.jukeboxes && [...g.jukeboxes.values()].some(j => Math.hypot(j.x - this.x, j.z - this.z) < 5));
      return { want: 0, dir: this.yaw };
    }
    this.flitT = (this.flitT || 0) - dt;
    if (!this.home) this.home = [this.x, this.y, this.z];
    if (this.flitT <= 0 || this.hitWall) {
      this.flitT = 2 + Math.random() * 3;
      const hx = this.home[0], hz = this.home[2];
      const back = Math.hypot(hx - this.x, hz - this.z) > 14;
      this.flitDir = back ? heading(this.x, this.z, hx, hz) : Math.random() * TAU;
      const ground = this.groundY();
      this.flyAlt = ground + (T.perches ? 3 + Math.random() * 6 : 1 + Math.random() * 2.5);
      if (Math.random() < (g.env.day < 0.35 ? 0.6 : 0.25)) { this.wantPerch = true; }
    }
    if (this.wantPerch && (solid(this.x, this.y - 0.3, this.z) || this.onGround)) { this.wantPerch = false; this.perched = true; this.perchT = 6 + Math.random() * 14; }
    this.flyVy = clamp(((this.wantPerch ? this.groundY() : this.flyAlt || this.y) - this.y) * 1.5, -2.5, 2.5);
    if (this.hitWall) this.flyVy = 2.5;
    return { want: T.fly * (this.wantPerch ? 0.5 : 1), dir: this.flitDir };
  },

  // ---- in the water ----
  swimmerAI(dt, p, dist, dyp, toPlayer) {
    const T = this.T, g = this.game, w = g.world;
    const wet = (x, y, z) => T_LIQUID[w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))] === 1;
    if (!this.inWater) {
      // stranded: flop about, gasping
      this.dryT = (this.dryT || 0) + dt; this.noGrav = false;
      if (this.onGround && Math.random() < dt * 2.5) { this.vy = 3.5; this.vx += (Math.random() - 0.5) * 3; this.vz += (Math.random() - 0.5) * 3; g.sfx.playAt('flop', this.x, this.y, this.z, 14); }
      if (this.dryT > (T.needsAir ? 60 : 15)) { this.dryT -= 2; this.hurt(1, { type: 'drown' }); }
      return { want: 0, dir: this.yaw };
    }
    this.dryT = 0;
    // dolphins come up for air
    if (T.needsAir) { this.airT = (this.airT ?? 90) - dt; if (wet(this.x, this.y + 1.2, this.z) === false) this.airT = 90; }
    // pufferfish puff up when something big comes close
    if (T.puffs) {
      if ((p && dist < 2.6 && Math.abs(dyp) < 2) || this.hurtTime > 0) this.puffT = 3;
      this.puffT = (this.puffT || 0) - dt; const was = this.puffed; this.puffed = this.puffT > 0;
      if (this.puffed && !was) g.sfx.playAt('puff', this.x, this.y, this.z, 14);
      if (this.puffed && p && dist < 1.2 && Math.abs(dyp) < 1.4 && this.attackCd <= 0) { this.attackCd = 1; p.hurt(1, { type: 'mob', attacker: this, knock: 2 }); }
    }
    // squid squirt ink when hurt
    if (this.hurtTime > 0.3 && T.sound === 'squid' && !this._inked) { this._inked = true; g.burst(this.x, this.y + 0.5, this.z, 'black_wool', 24, 1.6, 0); }
    if (this.hurtTime <= 0) this._inked = false;
    // pick somewhere in the water to go
    this.swimT = (this.swimT || 0) - dt;
    let want = T.speed, dir = this.swimDir ?? this.yaw, ty = this.swimY ?? this.y;
    const fleeing = !T.playful && (this.hurtTime > 0 || (p && dist < 4 && Math.abs(dyp) < 3 && !T.puffs && T.sound !== 'squid'));
    if (this.angryT > 0 && this.foe && T.damage) { const f = this.foe; this.bite(f, T.damage); dir = heading(this.x, this.z, f.x, f.z); ty = f.y + 0.5; want = T.speed * 1.4; }
    else if (fleeing) { dir = p ? heading(p.x, p.z, this.x, this.z) : dir; want = T.speed * 2.2; this.swimT = 0; }
    else if (T.needsAir && this.airT < 25) { ty = this.y + 6; want = T.speed; }
    else if (T.playful && p && dist < 14 && dist > 3 && (p.swimming || p.riding || p.inBoat || (p.contacts && p.contacts.water))) { dir = heading(this.x, this.z, p.x, p.z) + Math.sin(this.age * 0.8) * 0.9; ty = p.y; want = T.speed * 0.9; }
    else if (T.school && this.leader && this.leader.alive) { const L = this.leader; dir = heading(this.x, this.z, L.x + Math.sin(this.id) * 0.8, L.z + Math.cos(this.id) * 0.8); ty = L.y; want = Math.hypot(L.x - this.x, L.z - this.z) > 1.5 ? T.speed * 1.2 : T.speed * 0.4; }
    else if (this.swimT <= 0 || this.hitWall) {
      this.swimT = 2 + Math.random() * 4;
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * TAU, r = 3 + Math.random() * 5, nx = this.x - Math.sin(a) * r, nz = this.z - Math.cos(a) * r, ny = this.y + (Math.random() - 0.5) * 4;
        if (wet(nx, ny, nz) && wet(nx, ny + 0.4, nz)) { this.swimDir = a; this.swimY = ny; break; }
      }
      dir = this.swimDir ?? dir; ty = this.swimY ?? ty;
      if (T.sound === 'squid') want = T.speed * (0.4 + Math.random() * 0.8);
    }
    // stay in the water: don't swim up into the air (dolphins leap out on purpose)
    if (!wet(this.x, ty + this.h, this.z) && !(T.playful && Math.random() < 0.002)) ty = Math.min(ty, this.y);
    if (T.playful && this.speedNow > 3 && !wet(this.x, this.y + 1.2, this.z) && Math.random() < dt * 0.6) { this.vy = 7; g.sfx.playAt('splash', this.x, this.y + 1, this.z, 20); }
    this.swimVy = clamp((ty - this.y) * 1.2, -2, 2);
    this.swimPitch = clamp(-this.vy * 0.2, -0.6, 0.6);
    return { want, dir };
  },

  // ---- turtles, axolotls and frogs: at home in both ----
  amphibianAI(dt, p, dist, dyp, toPlayer) {
    const T = this.T, g = this.game;
    // axolotls play dead when badly hurt, and get better
    if (T.playsDead) {
      if (this.hurtTime > 0 && this.health < this.maxHealth * 0.5 && this.inWater && !this.playDead && Math.random() < 0.5) this.playDeadT = 10;
      this.playDeadT = (this.playDeadT || 0) - dt; this.playDead = this.playDeadT > 0;
      if (this.playDead) { if (Math.random() < dt * 0.5) this.health = Math.min(this.maxHealth, this.health + 1); this.swimVy = 0; return { want: 0, dir: this.yaw }; }
    }
    // frogs flick their tongues at small slimes (and gulp them down)
    if (T.frogTongue && this.attackCd <= 0) {
      for (const e of g.entities) {
        if (e.type !== 'slime' || !e.alive || e.size > 1) continue;
        const d = Math.hypot(e.x - this.x, e.z - this.z);
        if (d < 3 && Math.abs(e.y - this.y) < 1.5) {
          this.yaw = heading(this.x, this.z, e.x, e.z); this.tongueT = 0.3; this.tongueOut = true; this.attackCd = 2;
          e.remove = true; e.deathTime = 0.0001; g.dropItem(mkStack('slime_ball', 1), e.x, e.y + 0.3, e.z, true); g.sfx.playAt('frog', this.x, this.y, this.z);
          break;
        }
      }
    }
    // axolotls hunt fish
    if (T.prey && this.nearPrey && this.inWater && this.nearPrey.inWater && !this.baby) {
      const pr = this.nearPrey;
      this.bite(pr, T.damage || 2);
      this.swimVy = clamp((pr.y - this.y) * 1.5, -2, 2);
      return { want: T.swimSpeed, dir: heading(this.x, this.z, pr.x, pr.z) };
    }
    if (this.inWater) {
      // drift about, sometimes heading for the shore (turtles and frogs like to sunbathe)
      this.swimT = (this.swimT || 0) - dt;
      if (this.swimT <= 0 || this.hitWall) { this.swimT = 3 + Math.random() * 4; this.swimDir = Math.random() * TAU; this.swimUp = (Math.random() - (T.playsDead ? 0.6 : 0.35)) * 1.6; }
      if (this.hitWall) this.swimUp = 1.6;   // climb out onto the bank
      this.swimVy = this.swimUp || 0;
      this.swimPitch = clamp(-this.vy * 0.2, -0.5, 0.5);
      if (T.farm) { const f = this.farmAI(dt, p, dist, toPlayer); if (f) return { want: T.swimSpeed, dir: f.dir }; }
      return { want: T.swimSpeed * 0.7, dir: this.swimDir };
    }
    this.swimPitch = 0;
    const spooked = p && dist < 4 && !p.sneaking && T.sound === 'frog';
    if (spooked && this.panicT <= 0) { this.panicT = 1.5; this.fleeFrom = p; }
    if (this.panicT > 0) { this.panicT -= dt; return { want: T.speed * 2.5, dir: this.fleeDir(this.fleeFrom) }; }
    if (T.farm) { const f = this.farmAI(dt, p, dist, toPlayer); if (f) return f; }
    // wander, and head back to the water now and then
    this.wander(dt);
    const m = this.wanderMove();
    return { want: m.want * (T.hopper ? 1.4 : 1), dir: m.dir };
  },
});

// Getting hurt: neutral animals fight back, axolotls may play dead, everything else runs.
{
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const dealt = baseHurt.call(this, amount, src);
    const T = this.T;
    if (dealt > 0 && T.ai && src.attacker && src.attacker !== this) {
      const a0 = src.attacker.owner && src.attacker.owner.player ? src.attacker.owner : src.attacker, a = a0.player || a0;
      if (T.ai === 'neutral' || T.ai === 'predator' && (T.damage || 0) >= 2 && T.pack || T.angersWhenHurt || T.stings || (T.ai === 'swimmer' && T.damage) || (T.prey && T.ai === 'amphibian')) {
        if (!(T.skittish && this.health < this.maxHealth * 0.4) && a.hurt) this.provoke(a);
      }
      if (T.roosts) this.roosting = false;
      this.sitting = this.sleeping = this.perched = false;
      if (T.sound) this.game.sfx.playAt(T.sound + '_hurt', this.x, this.y + this.h * 0.7, this.z);
    }
    return dealt;
  };
  // the death cry
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    baseDie.call(this, src);
    if (this.T.ai && this.T.sound) this.game.sfx.playAt(this.T.sound + '_death', this.x, this.y + this.h * 0.6, this.z);
  };
  // young turtles shed a scute when they grow up
  const baseGrow = Mob.prototype.grow;
  Mob.prototype.grow = function () { baseGrow.call(this); if (this.type === 'turtle' && this.game) this.game.dropItem(mkStack('turtle_scute', 1), this.x, this.y + 0.3, this.z, true); };
}

// Glowing creatures light their surroundings (glow squid).
{
  const baseDraws = Mob.prototype.draws;
  Mob.prototype.draws = function (out, viewer) {
    baseDraws.call(this, out, viewer);
    if (this.T.glows && out.length) for (let i = out.length - 1; i >= 0 && out[i].px === this.x && out[i].pz === this.z; i--) out[i].light = [15, 15];
  };
}

// Llama spit: a little gob that arcs and splashes.
{
  const baseUpd = Projectile.prototype.update, baseGlow = Projectile.prototype.glow;
  Projectile.prototype.update = function (dt) {
    if (this.kind !== 'spit') return baseUpd.call(this, dt);
    const g = this.game;
    if (this.ghost) { this.ghostStep(dt); return; }
    this.age += dt;
    if (this.age > 3) { this.remove = true; return; }
    this.vy -= 12 * dt;
    for (let s = 0; s < 3; s++) {
      this.x += this.vx * dt / 3; this.y += this.vy * dt / 3; this.z += this.vz * dt / 3;
      for (const p of g.pawns()) {
        if (!p.dead && Math.abs(p.x - this.x) < 0.5 && Math.abs(p.z - this.z) < 0.5 && this.y > p.y - 0.2 && this.y < p.y + 1.9) {
          p.hurt(1, { type: 'projectile', attacker: this.owner, knock: 2 }); this.splat(); return;
        }
      }
      if (T_SOLID[g.world.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))]) { this.splat(); return; }
    }
    if (Math.random() < dt * 20) g.burst(this.x, this.y, this.z, 'white', 1, 0.1);
  };
  Projectile.prototype.splat = function () { this.remove = true; this.game.burst(this.x, this.y, this.z, 'white', 10, 0.8); };
  Projectile.prototype.glow = function (out) { if (this.kind === 'spit') { out.push({ x: this.x, y: this.y, z: this.z, size: 0.12, uv: tileUV(ATLAS.tile.white ?? 0), light: 0xFF }); return; } baseGlow.call(this, out); };
}

// ---- where they live ------------------------------------------------------------------------------
// The kind of place at (x, z): from the terrain's biome, warmth and wetness.
function habitatAt(w, x, z, ground) {
  let c = null;
  try { c = w.gen && w.gen.column ? w.gen.column(Math.floor(x), Math.floor(z)) : null; } catch (e) { c = null; }
  const biome = c ? c.biome : (w.gen && w.gen.biomeAt ? w.gen.biomeAt(x, z) : BIOME.PLAINS);
  const temp = c && c.temp !== undefined ? c.temp : 0, humid = c && c.humid !== undefined ? c.humid : 0, h = c ? c.h : SEA + 5;
  // the same rules the terrain uses to draw each place, so the animals match what you see
  if (biome === BIOME.OCEAN) return 'ocean';
  if (biome === BIOME.BEACH) return temp < -0.2 ? 'snowy_beach' : 'beach';
  if (biome === BIOME.DESERT) return 'desert';
  if (biome === BIOME.MOUNTAINS) return temp < -0.3 || ground === B.snow_block ? 'snowy_peaks' : 'mountains';
  if (biome === BIOME.TAIGA) return temp < -0.55 ? 'snowy_plains' : temp < -0.42 ? 'snowy_taiga' : 'taiga';
  if ((biome === BIOME.PLAINS || biome === BIOME.FOREST) && h <= SEA + 1 && humid > 0.38 && temp > -0.1) return 'swamp';
  if (temp > 0.25 && humid > 0.3) return 'jungle';
  if (biome === BIOME.PLAINS && temp > 0.28 && humid < 0.02) return 'savanna';
  return biome === BIOME.FOREST ? (temp < 0 ? 'birch_forest' : 'forest') : 'plains';
}
// Which habitats each animal is at home in (the spawner keeps to these; a few fit several).
// [type, weight, smallest group, largest group]
const SPAWNS = {
  plains: [['horse', 8, 2, 4], ['donkey', 2, 1, 2], ['sheep', 12, 2, 4], ['cow', 10, 2, 4], ['pig', 10, 1, 3], ['chicken', 10, 2, 4], ['rabbit', 4, 1, 3], ['turkey', 4, 2, 4], ['mouse', 2, 1, 2], ['duck', 3, 2, 3]],
  forest: [['deer', 8, 2, 4], ['boar', 5, 1, 3], ['wolf', 5, 2, 4], ['pig', 6, 1, 3], ['chicken', 6, 1, 3], ['sheep', 4, 2, 3], ['cow', 4, 2, 3], ['rabbit', 4, 1, 3], ['raccoon', 3, 1, 2], ['turkey', 3, 2, 3], ['brown_bear', 2, 1, 2], ['mouse', 2, 1, 2]],
  birch_forest: [['deer', 8, 2, 4], ['rabbit', 6, 1, 3], ['pig', 5, 1, 3], ['chicken', 5, 1, 3], ['sheep', 5, 2, 3], ['cow', 4, 2, 3], ['fox', 3, 1, 2]],
  taiga: [['wolf', 8, 2, 4], ['fox', 8, 1, 3], ['rabbit', 6, 1, 3], ['deer', 5, 2, 3], ['sheep', 4, 2, 3], ['pig', 3, 1, 2], ['brown_bear', 3, 1, 2]],
  snowy_taiga: [['wolf', 8, 2, 4], ['snow_fox', 8, 1, 3], ['rabbit', 6, 1, 3], ['deer', 3, 2, 3], ['brown_bear', 2, 1, 2]],
  snowy_plains: [['polar_bear', 3, 1, 2], ['snow_fox', 6, 1, 2], ['rabbit', 8, 1, 3], ['wolf', 3, 2, 4]],
  snowy_peaks: [['goat', 10, 2, 3], ['snow_fox', 2, 1, 2], ['rabbit', 3, 1, 2]],
  mountains: [['goat', 10, 2, 3], ['llama', 6, 2, 4], ['sheep', 5, 2, 3], ['rabbit', 3, 1, 2]],
  savanna: [['horse', 8, 2, 5], ['donkey', 5, 1, 3], ['llama', 4, 2, 4], ['cow', 4, 2, 3], ['armadillo', 7, 1, 2], ['sheep', 3, 2, 3]],
  desert: [['camel', 6, 1, 2], ['rabbit', 8, 1, 3], ['armadillo', 3, 1, 2]],
  jungle: [['parrot', 10, 1, 3], ['ocelot', 5, 1, 2], ['panda', 4, 1, 2], ['chicken', 4, 1, 3], ['pig', 3, 1, 2]],
  swamp: [['frog', 10, 2, 4], ['duck', 6, 2, 4], ['raccoon', 3, 1, 2], ['mouse', 2, 1, 2]],
  beach: [['turtle', 8, 2, 4], ['duck', 2, 1, 3]],
  snowy_beach: [['snow_fox', 3, 1, 2], ['rabbit', 3, 1, 2]],
  skylands: [['aerbunny', 6, 1, 3], ['moa', 3, 1, 2]],
};
// animals that need water close by, and what ground each will spawn on
const NEEDS_WATER = new Set(['duck', 'frog', 'turtle']);
const WATER_SPAWNS = {
  ocean: [['cod', 10, 3, 6], ['squid', 6, 1, 3], ['dolphin', 2, 2, 4], ['salmon', 3, 3, 5]],
  warm: [['tropical_fish', 10, 4, 7], ['pufferfish', 3, 1, 2], ['cod', 3, 3, 5], ['dolphin', 2, 2, 3], ['squid', 2, 1, 2]],
  cold: [['salmon', 10, 3, 5], ['cod', 6, 3, 5], ['squid', 3, 1, 2]],
  lake: [['salmon', 6, 2, 4], ['cod', 4, 2, 4], ['frog', 2, 1, 2]],
  cave: [['axolotl', 6, 1, 3], ['glow_squid', 4, 1, 2]],
};
function pickWeighted(list, r) {
  let tot = 0; for (const e of list) tot += e[1];
  let q = r() * tot; for (const e of list) { q -= e[1]; if (q <= 0) return e; }
  return list[list.length - 1];
}

Game.prototype.spawnMobs = function () {
  const w = this.world;
  if (!this.rules().mobSpawning) return;
  const ps = this.pawns().filter(p => !p.dead);
  if (!ps.length) return;
  const p = ps[Math.floor(Math.random() * ps.length)];
  // 0.8.6: calmer, the way Minecraft and Mineclonia do it. Only creatures near this player count toward
  // its caps (your own animals too: a farm full of sheep means no wild herd turns up beside it), the caps
  // are smaller, new herds come rarely and well out of sight, and never where animals are already thick.
  let animals = 0, hostiles = 0, water = 0, ambient = 0;
  for (const e of this.entities) if (e instanceof Mob && !e.remove && Math.abs(e.x - p.x) < 72 && Math.abs(e.z - p.z) < 72) {
    const T = e.T;
    if (T.hostile) { if (!T.boss) hostiles++; }
    else if (T.water) water++;
    else if (T.ambient) ambient++;
    else animals++;
  }
  const r = Math.random, n = ps.length;
  const capA = 7 + n * 2, capW = 6 + n * 2, capB = 2 + n, capH = 6 + n * 2;
  const crowded = (x, z, rad, max) => { let k = 0; for (const e of this.entities) if (e instanceof Mob && !e.T.hostile && Math.abs(e.x - x) < rad && Math.abs(e.z - z) < rad && ++k >= max) return true; return false; };
  const surfaceY = (x, z) => {
    const ch = w.chunkAt(x >> 4, z >> 4);
    if (!ch || !ch.mesh) return -1;
    for (let y = Math.min(CH - 2, ch.maxY); y > 1; y--) {
      const id = w.getBlock(x, y, z);
      if (id === 0 || BLOCKS[id].render === RENDER.CROSS || BLOCKS[id].render === RENDER.MODEL) continue;
      return T_SOLID[id] || T_LIQUID[id] ? y + 1 : -1;
    }
    return -1;
  };
  const ring = (a, b) => { const ang = r() * TAU, d = a + r() * (b - a); return [Math.floor(p.x + Math.cos(ang) * d), Math.floor(p.z + Math.sin(ang) * d)]; };
  const group = (type, x, y, z, k) => {
    for (let i = 0; i < k; i++) {
      const m = new Mob(this, type, x + 0.5 + (r() - 0.5) * 2, y, z + 0.5 + (r() - 0.5) * 2);
      if (i > 0 && r() < 0.18 && m.T.farm) m.makeBaby();
      if (i > 0 && this.entities.length) { const first = this.entities[this.entities.length - 1]; if (first.type === type && first.variant && m.T.variants && r() < 0.6) m.variant = first.variant; }
      this.addEntity(m);
    }
  };
  const OVER = this.dim === DIM.OVERWORLD, SKY = this.dim === DIM.SKYLANDS;
  // land animals: by habitat, in daylight on natural ground
  if ((OVER || SKY) && animals < capA && r() < 0.012) {   // herds mostly come with the land (game/husbandry.js)
    const [x, z] = ring(32, 56);
    const y = surfaceY(x, z);
    const ground = y > 0 ? w.getBlock(x, y - 1, z) : 0;
    const natural = ground === B.grass || ground === B.sky_grass || ground === B.snowy_grass || ground === B.sand || ground === B.red_sand || ground === B.desert_sand || ground === B.mud || ground === B.coarse_dirt || ground === B.podzol || ground === B.dirt_with_dry_grass || ground === B.dirt_with_coniferous_litter || ground === B.dirt_with_rainforest_litter || ground === B.snow_block || ground === B.stone && y > SEA + 20 || ground === B.silver_sand;
    if (y > 0 && natural && !T_LIQUID[ground] && (w.getLight(x, y, z) >> 4) >= 12) {
      const hab = SKY ? 'skylands' : habitatAt(w, x, z, ground);
      const list = SPAWNS[hab] || SPAWNS.plains;
      const [type, , lo, hi] = pickWeighted(list, r);
      let wet = !NEEDS_WATER.has(type);
      for (let dz = -6; dz <= 6 && !wet; dz += 2) for (let dx = -6; dx <= 6 && !wet; dx += 2) if (T_LIQUID[w.getBlock(x + dx, y - 1, z + dz)] === 1 || T_LIQUID[w.getBlock(x + dx, y, z + dz)] === 1) wet = true;
      if (MOB_TYPES[type] && wet && !crowded(x, z, 28, 3)) group(type, x, y, z, Math.min(3, lo + Math.floor(r() * (hi - lo + 1))));
    }
  }
  // water life: oceans, lakes, and the dark water of caves
  if (OVER && water < capW && r() < 0.12) {
    const [x, z] = ring(16, 40);
    const y0 = Math.min(CH - 2, Math.floor(p.y) + 12);
    let top = -1;
    for (let y = y0; y > 2 && y > p.y - 30; y--) { const id = w.getBlock(x, y, z); if (T_LIQUID[id] === 1) { top = y; break; } if (T_SOLID[id]) { if (y < SEA - 4) continue; break; } }
    if (top > 0) {
      let depth = 0; while (depth < 30 && T_LIQUID[w.getBlock(x, top - depth, z)] === 1) depth++;
      const sky = w.getLight(x, top, z) >> 4;
      let c = null; try { c = w.gen.column ? w.gen.column(x, z) : null; } catch (e) { /* old terrain */ }
      const temp = c && c.temp !== undefined ? c.temp : 0;
      const ocean = c ? c.biome === BIOME.OCEAN : depth > 6;
      const kind = sky < 6 && top < SEA - 6 ? 'cave' : ocean ? (temp > 0.3 ? 'warm' : temp < -0.1 ? 'cold' : 'ocean') : 'lake';
      if (depth >= 2) {
        let [type, , lo, hi] = pickWeighted(WATER_SPAWNS[kind], r);
        if ((type === 'dolphin' || type === 'squid') && depth < 5) type = 'cod';
        if (type === 'frog') { if (habitatAt(w, x, z, 0) === 'swamp') group('frog', x, top + 1, z, 1); }
        else if (MOB_TYPES[type]) group(type, x, top - Math.min(depth - 1, 1 + Math.floor(r() * (depth - 1))), z, lo + Math.floor(r() * (hi - lo + 1)));
      }
    }
  }
  // bats in dark caves
  if (OVER && ambient < capB && r() < 0.08) {
    const [x, z] = ring(10, 28);
    const y0 = Math.floor(p.y) + Math.floor(r() * 20) - 10;
    for (let y = y0; y > y0 - 10 && y > 3; y--) {
      if (w.getBlock(x, y, z) === 0 && w.getBlock(x, y + 1, z) === 0 && y < SEA - 2) {
        const l = w.getLight(x, y, z);
        if ((l >> 4) < 4 && (l & 15) < 4) { group('bat', x, y, z, 1 + Math.floor(r() * 3)); }
        break;
      }
    }
  }
  // the night crowd, as before
  if (OVER && hostiles < capH) this.spawnMonsters(p, ring, surfaceY);
  if (this.dim === DIM.DEPTHS) this.spawnDepths(p, ring);
};
Game.prototype.spawnMonsters = function (p, ring, surfaceY) {
  const w = this.world, r = Math.random;
  const pick = (y) => { const q = r(); if (y !== undefined && y < 40 && q < 0.14) return 'slime'; return q < 0.34 ? 'ghoul' : q < 0.58 ? 'skeleton' : q < 0.8 ? 'spider' : 'fuseling'; };
  const spawnOne = (t, x, y, z) => { const m = this.addEntity(new Mob(this, t, x + 0.5, y, z + 0.5)); if (t === 'slime') m.setSize(r() < 0.6 ? 2 : 1); return m; };
  if (this.env.day < 0.42 && r() < 0.6) {
    const [x, z] = ring(20, 40);
    const y = surfaceY(x, z);
    if (y > 0 && !T_LIQUID[w.getBlock(x, y - 1, z)] && (w.getLight(x, y, z) & 15) < 7) spawnOne(pick(), x, y, z);
  }
  if (r() < 0.35) {
    const [x, z] = ring(14, 30);
    const y0 = Math.floor(p.y) + Math.floor(r() * 24) - 12;
    for (let y = y0; y > y0 - 8 && y > 2; y--) {
      if (T_SOLID[w.getBlock(x, y - 1, z)] && w.getBlock(x, y, z) === 0 && w.getBlock(x, y + 1, z) === 0) {
        const l = w.getLight(x, y, z);
        if ((l >> 4) * this.env.day < 6 && (l & 15) < 7 && (l >> 4) < 12) spawnOne(pick(y), x, y, z);
        break;
      }
    }
  }
};
Game.prototype.spawnDepths = function (p, ring) {
  const w = this.world, r = Math.random;
  let hostiles = 0; for (const e of this.entities) if (e instanceof Mob && e.T.hostile && !e.T.boss) hostiles++;
  if (hostiles < 7 && r() < 0.5) {
    const [x, z] = ring(16, 34);
    const y0 = Math.floor(p.y) + Math.floor(r() * 24) - 12;
    for (let y = y0; y > y0 - 10 && y > 2; y--) {
      if (T_SOLID[w.getBlock(x, y - 1, z)] && w.getBlock(x, y, z) === 0 && w.getBlock(x, y + 1, z) === 0) {
        if ((w.getLight(x, y, z) & 15) < 11) this.addEntity(new Mob(this, 'charred_ghoul', x + 0.5, y, z + 0.5));
        break;
      }
    }
  }
  if (!this.entities.some(e => e.type === 'cinder_golem') && r() < 0.004) {
    const [x, z] = ring(20, 30);
    for (let y = Math.floor(p.y) + 8; y > p.y - 8; y--) {
      if (T_SOLID[w.getBlock(x, y - 1, z)] && !w.getBlock(x, y, z) && !w.getBlock(x, y + 1, z) && !w.getBlock(x, y + 2, z)) { this.summonGolem(x + 0.5, y, z + 0.5, p); break; }
    }
  }
};
