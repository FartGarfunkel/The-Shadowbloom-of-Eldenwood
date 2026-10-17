// ---------------------------------------------------------------------------
// game/husbandry.js — 0.8.6.4: animals you can keep, and bees that work.
//
// Animals: they follow anyone holding their food (that check was looking in
// the wrong place, so nobody could lead them), babies trail after the grown
// ones, and every land animal stays put once it exists — the classic game's
// rule — so a farm is a farm. Herds come with the world: each stretch of new
// ground gets its share once, the first time someone sees it, and only now and
// then does a new one wander in after that.
//
// Bees: little things, a swarm to a nest. They leave the nest by day, find
// flowers nearby, hover and work them until they're dusted yellow, carry the
// pollen home (helping crops along on the way) and fill the nest with honey.
// Night and rain send them home. A hive you build gets a swarm of its own
// once there are flowers near it.
//
// Stone mites are gone.
// ---------------------------------------------------------------------------

const HUSB = { herdT: 0, herds: null, herdsFor: null, colonies: new Map(), beeT: 0 };
const FLOWER_RE = /flower|poppy|dandelion|tulip|orchid|allium|azure|daisy|cornflower|lily_of|rose|peony|lilac|sunflower|bluet|blossom|lavender|clover|aster|foxglove|primrose|heather|petals/;
const T_FLOWER = new Uint8Array(MAX_BLOCKS);
for (const b of BLOCKS) if (b && b.key && FLOWER_RE.test(b.key) && (b.render === RENDER.CROSS || b.key.includes('petals'))) T_FLOWER[b.id] = 1;

// ---- following food, babies following their elders --------------------------------------------------
{
  const base = Mob.prototype.farmAI;
  Mob.prototype.farmAI = function (dt, p, dist, toPlayer) {
    const f = base.call(this, dt, p, dist, toPlayer);
    if (f) return f;
    // whoever it's looking at is a LocalPlayer (or someone over LAN): their inventory is on the player
    const who = p && (p.player || p), inv = who && who.inv, T = this.T;
    const held = inv && (inv.held || inv.offhand) ? [inv.held, inv.offhand] : [];
    if (p && dist < 10 && T.food && held.some(s => s && T.food.includes(s.id))) return { want: dist > 2.2 ? T.speed * 1.15 : 0, dir: toPlayer };
    // a youngster keeps close to a grown one of its kind
    if (this.baby) {
      if (!this._parent || this._parent.remove || (this._parentT = (this._parentT || 0) - dt) <= 0) {
        this._parentT = 3; this._parent = null; let bd = 10;
        for (const e of this.game.entities) if (e !== this && e instanceof Mob && e.type === this.type && !e.baby && e.alive) { const d = Math.hypot(e.x - this.x, e.z - this.z); if (d < bd) { bd = d; this._parent = e; } }
      }
      const q = this._parent;
      if (q) { const d = Math.hypot(q.x - this.x, q.z - this.z); if (d > 3) return { want: T.speed * 1.2, dir: Math.atan2(-(q.x - this.x), -(q.z - this.z)) }; }
    }
    return null;
  };
}

// ---- animals stay; herds come with the land -----------------------------------------------------------
{
  const baseAdd = Game.prototype.addEntity;
  Game.prototype.addEntity = function (e) {
    const r = baseAdd.call(this, e);
    // a land animal, once it exists, is here to stay (fish, bats and monsters still come and go)
    if (e instanceof Mob && !e.T.hostile && !e.T.water && !e.T.ambient && e.T.ai !== 'swimmer' && !e.T.roosts && e.type !== 'bee' && !e.ghost && !this.isGuest) e.kept = true;
    if (e instanceof Mob && e.type === 'stone_mite') e.remove = true;
    return r;
  };
}
// once per piece of ground: a herd (or none), the first time anyone sees it
function husbHerds(g) {
  const w = g.world, m = g.meta;
  if (g.isGuest || !w || (g.dim !== DIM.OVERWORLD && g.dim !== DIM.SKYLANDS)) return;
  if (HUSB.herdsFor !== m) { HUSB.herdsFor = m; HUSB.herds = new Set(m.herdChunks || []); }
  const seed = m.seed | 0;
  for (const ch of w.chunks.values()) {
    if (!ch.mesh) continue;
    const key = g.dim + ':' + ch.cx + ':' + ch.cz;
    if (HUSB.herds.has(key)) continue;
    if (!g.locals.some(l => Math.abs(ch.cx * 16 + 8 - l.player.x) < 72 && Math.abs(ch.cz * 16 + 8 - l.player.z) < 72)) continue;
    HUSB.herds.add(key);
    const r = mulberry32(hash32(seed, ch.cx, ch.cz, 4242));
    if (r() > (g.dim === DIM.SKYLANDS ? 0.12 : 0.09) * (HUSB.herdBoost || 1)) continue;
    // somewhere on natural ground in this chunk
    for (let tries = 0; tries < 6; tries++) {
      const x = ch.cx * 16 + Math.floor(r() * 16), z = ch.cz * 16 + Math.floor(r() * 16);
      let y = Math.min(CH - 2, ch.maxY);
      while (y > 1 && (!w.getBlock(x, y, z) || BLOCKS[w.getBlock(x, y, z)].render === RENDER.CROSS)) y--;
      const ground = w.getBlock(x, y, z);
      if (!ground || T_LIQUID[ground] || BLOCKS[ground].isLeaves || !T_SOLID[ground] || w.getBlock(x, y + 1, z) && BLOCKS[w.getBlock(x, y + 1, z)].render !== RENDER.CROSS) continue;
      if ((w.getLight(x, y + 1, z) >> 4) < 12) continue;
      const hab = g.dim === DIM.SKYLANDS ? 'skylands' : habitatAt(w, x, z, ground);
      const list = SPAWNS[hab] || SPAWNS.plains;
      const [type, , lo, hi] = pickWeighted(list, r);
      if (!MOB_TYPES[type] || NEEDS_WATER.has(type) || type === 'mouse') break;
      const n = Math.min(4, lo + Math.floor(r() * (hi - lo + 1)));
      let first = null;
      for (let i = 0; i < n; i++) {
        const mob = new Mob(g, type, x + 0.5 + (r() - 0.5) * 3, y + 1, z + 0.5 + (r() - 0.5) * 3);
        if (i > 0 && r() < 0.2 && mob.T.farm) mob.makeBaby();
        if (first && first.variant && mob.T.variants && r() < 0.6) mob.variant = first.variant;
        first = first || mob;
        g.addEntity(mob);
      }
      break;
    }
  }
  m.herdChunks = [...HUSB.herds];
}
// ---- bees --------------------------------------------------------------------------------------------
Object.assign(MOB_TYPES.bee, { w: 0.12, h: 0.14, hp: 3, damage: 1, xp: 0, fly: 2.4, pack: true });
function hiveFront(w, h) {
  const m = w.getMeta(h[0], h[1], h[2]) & 3;
  return [h[0] + 0.5 + DIRX[m] * 0.7, h[1] + 0.5, h[2] + 0.5 + DIRZ[m] * 0.7];
}
function beeColony(g, h, id) {
  const key = h.join(',');
  let c = HUSB.colonies.get(key);
  if (!c) { c = { h, inside: id === B.bee_nest ? 3 + Math.floor(Math.random() * 3) : 0, out: 0, t: 1 + Math.random() * 3, join: 40 }; HUSB.colonies.set(key, c); }
  return c;
}
function husbBees(g, dt) {
  const w = g.world;
  if (g.isGuest || !w) return;
  const day = (g.env.day ?? 1) > 0.45 && !(g.weather && g.weather.rain > 0.3);
  // how many are out from each nest
  const out = new Map();
  for (const e of g.entities) if (e.type === 'bee' && e.alive && e.hive) { const k = e.hive.join(','); out.set(k, (out.get(k) || 0) + 1); }
  for (const ch of w.chunks.values()) {
    if (!ch.hives || !ch.hives.length || !ch.mesh) continue;
    for (const [lx, y, lz] of ch.hives) {
      const x = ch.cx * 16 + lx, z = ch.cz * 16 + lz, id = w.getBlock(x, y, z);
      if (!BLOCKS[id] || !BLOCKS[id].hive) continue;
      if (!g.locals.some(l => Math.hypot(x - l.player.x, z - l.player.z) < 48)) continue;
      const h = [x, y, z], c = beeColony(g, h, id);
      c.out = out.get(h.join(',')) || 0;
      // a hive someone built: a swarm moves in once there are flowers about
      if (id === B.beehive && c.inside + c.out < 4 && day && (c.join -= dt) <= 0) {
        c.join = 45 + Math.random() * 45;
        if (beeFlower(w, x, y, z, 8, 30)) c.inside++;
      }
      if (!day || c.inside <= 0 || (c.t -= dt) > 0) continue;
      c.t = 2 + Math.random() * 5;
      const f = hiveFront(w, h);
      if (T_SOLID[w.getBlock(Math.floor(f[0]), Math.floor(f[1]), Math.floor(f[2]))]) continue;
      const bee = new Mob(g, 'bee', f[0], f[1] - 0.1, f[2]);
      bee.hive = h; bee.beeState = 'seek'; bee.hasSting = true;
      g.addEntity(bee);
      c.inside--;
    }
  }
}
// a flower near (x, y, z): [fx, fy, fz] or null
function beeFlower(w, x, y, z, R, tries) {
  for (let i = 0; i < tries; i++) {
    const fx = Math.floor(x + (Math.random() - 0.5) * 2 * R), fz = Math.floor(z + (Math.random() - 0.5) * 2 * R);
    for (let fy = Math.floor(y) + 4; fy > Math.floor(y) - 8; fy--) { const id = w.getBlock(fx, fy, fz); if (T_FLOWER[id]) return [fx, fy, fz]; if (T_SOLID[id]) break; }
  }
  return null;
}
{
  const baseFlyer = Mob.prototype.flyerAI;
  Mob.prototype.flyerAI = function (dt, p, dist, dyp, toPlayer) {
    if (this.type !== 'bee' || !this.hive || (this.angryT > 0 && this.foe)) return baseFlyer.call(this, dt, p, dist, dyp, toPlayer);
    return beeAI(this, dt);
  };
}
function beeAI(b, dt) {
  const g = b.game, w = g.world, h = b.hive;
  b.noGrav = true; b.perched = false;
  const hid = w.getBlock(h[0], h[1], h[2]);
  if (!BLOCKS[hid] || !BLOCKS[hid].hive) { b.hive = null; return { want: 0, dir: b.yaw }; }
  const day = (g.env.day ?? 1) > 0.45 && !(g.weather && g.weather.rain > 0.3);
  let tx, ty, tz;
  if (!day || (b.pollen && b.visits >= 1 + (b._want || 0)) || b.beeState === 'home' || (b.age > 240)) b.beeState = 'home';
  if (b.beeState === 'seek') {
    if (!b.flower || (b.seekT = (b.seekT || 0) - dt) <= 0) {
      b.seekT = 3;
      b.flower = beeFlower(w, h[0], h[1], h[2], 12, 12);
      if (!b.flower) { b.wanderT = (b.wanderT || 0) + 3; if (b.wanderT > 30) b.beeState = 'home'; }
    }
    if (b.flower) {
      [tx, ty, tz] = [b.flower[0] + 0.5, b.flower[1] + 0.45, b.flower[2] + 0.5];
      if (Math.hypot(tx - b.x, tz - b.z) < 0.5 && Math.abs(ty - b.y) < 0.6) { b.beeState = 'work'; b.workT = 2.5 + Math.random() * 3; }
    } else { const a = b.age * 0.7; [tx, ty, tz] = [h[0] + 0.5 + Math.cos(a) * 4, h[1] + 1, h[2] + 0.5 + Math.sin(a) * 4]; }
  }
  if (b.beeState === 'work') {
    // hover over the flower, nosing about it
    const f = b.flower || [b.x, b.y, b.z];
    if (!T_FLOWER[w.getBlock(f[0], f[1], f[2])]) { b.beeState = 'seek'; b.flower = null; return { want: 0, dir: b.yaw }; }
    tx = f[0] + 0.5 + Math.sin(b.age * 3.1) * 0.15; ty = f[1] + 0.4 + Math.sin(b.age * 5) * 0.06; tz = f[2] + 0.5 + Math.cos(b.age * 2.7) * 0.15;
    if ((b.workT -= dt) <= 0) {
      b.pollen = true; b.visits = (b.visits || 0) + 1; b._want = b._want ?? Math.floor(Math.random() * 2);
      b.flower = null; b.beeState = b.visits >= 1 + b._want ? 'home' : 'seek';
      g.burst(f[0] + 0.5, f[1] + 0.4, f[2] + 0.5, 'pollen', 3, 0.3);
    }
  }
  if (b.beeState === 'home') {
    const fr = hiveFront(w, h);
    [tx, ty, tz] = fr;
    if (Math.hypot(tx - b.x, tz - b.z) < 0.6 && Math.abs(ty - b.y) < 0.7) {
      // in it goes: a load of pollen makes honey
      const c = beeColony(g, h, hid);
      c.inside++;
      if (b.pollen) { const m = w.getMeta(h[0], h[1], h[2]); if ((m & 0x0c) !== 0x0c) w.setBlock(h[0], h[1], h[2], hid, m + 4, { quiet: true }); }
      b.remove = true; b.deathTime = 0;
      return { want: 0, dir: b.yaw };
    }
  }
  // carrying pollen: dusted yellow (a fleck falls now and then) and helping crops it passes over
  if (b.pollen) {
    if (Math.random() < dt * 3 && (g.settings.particles ?? 2)) g.particles.add({ x: b.x + (Math.random() - 0.5) * 0.1, y: b.y + 0.05, z: b.z + (Math.random() - 0.5) * 0.1, vx: 0, vy: -0.3, vz: 0, life: 0.8, max: 0.8, size: 0.018, uv: tileUV(ATLAS.tile.pollen ?? ATLAS.tile.white), light: w.getLight(Math.floor(b.x), Math.floor(b.y), Math.floor(b.z)), grav: 0.5 });
    if (Math.random() < dt * 0.15) {
      const cx = Math.floor(b.x), cz = Math.floor(b.z);
      for (let cy = Math.floor(b.y); cy > Math.floor(b.y) - 3; cy--) {
        const id = w.getBlock(cx, cy, cz), d = BLOCKS[id];
        if (d && d.crop && d.render === RENDER.CROSS) { const m = w.getMeta(cx, cy, cz); if (m < d.crop.stages - 1) { w.setBlock(cx, cy, cz, id, m + 1); g.burst(cx + 0.5, cy + 0.5, cz + 0.5, 'pollen', 3, 0.3); } break; }
        if (T_SOLID[id]) break;
      }
    }
  }
  if (tx === undefined) return { want: 0, dir: b.yaw };
  b.flyVy = clamp((ty - b.y) * 2.5, -2, 2);
  const d = Math.hypot(tx - b.x, tz - b.z);
  // a bee's flight wobbles
  return { want: d < 0.3 ? 0 : Math.min(MOB_TYPES.bee.fly, d * 2.5), dir: Math.atan2(-(tx - b.x), -(tz - b.z)) + Math.sin(b.age * 7) * 0.25 };
}

// ---- once a second ---------------------------------------------------------------------------------
{
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    baseFrame.call(this, dt);
    if (this.state !== 'playing' || !this.world || !this.locals.length) return;
    try {
      if ((HUSB.herdT -= dt) <= 0) { HUSB.herdT = 1; husbHerds(this); }
      husbBees(this, Math.min(dt, 0.1));
    } catch (e) { if (!HUSB.warned) { HUSB.warned = true; console.warn('husbandry', e); } }
  };
  const baseEnter = Game.prototype.enterWorld;
  Game.prototype.enterWorld = function (...a) { HUSB.colonies.clear(); HUSB.herdsFor = null; return baseEnter.apply(this, a); };
}
// fed or bred: tame enough not to bolt, and hunters leave it be (every animal is kept now, so that's its own mark)
{
  const baseUse = LocalPlayer.prototype.useOnAnimal;
  LocalPlayer.prototype.useOnAnimal = function (e, held, def) { const r = baseUse.call(this, e, held, def); if (r && e) e.fed = true; return r; };
  const baseBreed = Mob.prototype.breedWith;
  Mob.prototype.breedWith = function (mate) { this.fed = true; if (mate) mate.fed = true; return baseBreed.call(this, mate); };
}
// stone mites: gone
Game.prototype.wakeMites = function () {};
