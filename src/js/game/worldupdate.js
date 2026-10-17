// ---------------------------------------------------------------------------
// game/worldupdate.js — 0.9: the world update, first steps.
//
//   Rivers (terrain version 3): rivers wind across the land in their own
//     valleys, cutting gorges through the hills and mountains, with sandy and
//     gravel banks; cold ones freeze over. They flow: the current carries you,
//     your boat and anything dropped in it downstream.
//   Stacked worlds: the Skylands hang over the Overworld and the Ember Depths
//     lie under it, at the same x and z. Step off an island and you fall all
//     the way down into the Overworld (the winds slow you so you land
//     safely). Fly (or build) up past the top of the Overworld and you come
//     out on the nearest island above. At the very bottom of the Overworld
//     (terrain version 3) lies the Ember Crust: break through it with a
//     mithril pick or better and you drop into the Ember Depths.
//   Portals take you as you walk through them.
//
// Old worlds keep their terrain; use "Upgrade terrain" on the world screen
// to get rivers and the crust in land you haven't changed.
// ---------------------------------------------------------------------------
{
  const baseCol = WorldGen.prototype.column;
  const RW0 = 0.016, RW1 = 0.048;
  WorldGen.prototype.riverNoise = function (x, z) {
    const n = this.nRiver || (this.nRiver = new SimplexNoise(this.seed ^ 0x5eed11));
    return n.fbm2(x / 760, z / 760, 3) + this.nDetail.noise2(x / 90, z / 90) * 0.012;
  };
  WorldGen.prototype.column = function (x, z) {
    const c = baseCol.call(this, x, z);
    if (this.dim !== 0 || (this.genVersion || 1) < 3 || c.h < SEA - 1) return c;
    const rv = Math.abs(this.riverNoise(x, z));
    if (rv >= RW1) return c;
    let h = c.h;
    // (0.9.0.44) a bowl, like the sea's shores: deepest mid-stream (4 deep), shallowing to a ledge you can stand on
    // at the edge (1 deep), and a sandy bank that starts level with the water and rises gently. It used to drop
    // from a bank a block above the water straight into water 2 to 4 deep, so you couldn't climb out.
    if (rv < RW0) {
      // how far in from the edge this is, in blocks (the river's noise slopes about evenly across it)
      const gx = Math.abs(this.riverNoise(x + 1, z)) - Math.abs(this.riverNoise(x - 1, z)), gz = Math.abs(this.riverNoise(x, z + 1)) - Math.abs(this.riverNoise(x, z - 1));
      const d = (RW0 - rv) / Math.max(1e-4, Math.hypot(gx, gz) / 2);
      const depth = d < 1.6 ? 0 : d < 3.2 ? 1 : d < 4.8 ? 2 : 3;
      h = Math.min(h, SEA - 1 - depth);
    }
    else { const k = (rv - RW0) / (RW1 - RW0), edge = SEA; h = Math.min(h, Math.round(edge + (h - edge) * k * k)); }
    if (h === c.h) return c;
    const out = { h, biome: c.biome, temp: c.temp, humid: c.humid, river: rv < RW0 ? 1 : 0.5 };
    if (h < SEA) out.biome = BIOME.OCEAN;
    else if (h <= SEA + 1 && c.biome !== BIOME.DESERT) out.biome = BIOME.BEACH;
    return out;
  };
  // which way a river runs here: along its course, toward lower ground (null if this isn't a river)
  WorldGen.prototype.riverFlow = function (x, z) {
    if (this.dim !== 0 || (this.genVersion || 1) < 3) return null;
    x = Math.floor(x); z = Math.floor(z);
    const cache = this.flowCache || (this.flowCache = new Map());
    const key = x * 65536 + z;
    if (cache.has(key)) return cache.get(key);
    let f = null;
    if (Math.abs(this.riverNoise(x, z)) < RW1 * 0.8) {
      const e = 3, gx = this.riverNoise(x + e, z) - this.riverNoise(x - e, z), gz = this.riverNoise(x, z + e) - this.riverNoise(x, z - e);
      let tx = -gz, tz = gx; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const a = baseCol.call(this, Math.round(x + tx * 24), Math.round(z + tz * 24)).h, b = baseCol.call(this, Math.round(x - tx * 24), Math.round(z - tz * 24)).h;
      if (a > b) { tx = -tx; tz = -tz; }
      f = [tx, tz];
    }
    if (cache.size > 6000) cache.clear();
    cache.set(key, f);
    return f;
  };
  // the crust at the bottom of the world
  const baseGen = WorldGen.prototype.generate;
  WorldGen.prototype.generate = function (ch) {
    const r = baseGen.call(this, ch);
    if (this.dim === 0 && (this.genVersion || 1) >= 3 && B.ember_crust !== undefined) {
      for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) ch.blocks[cidx(x, 0, z)] = B.ember_crust;
    }
    return r;
  };
}
// ---- the current ------------------------------------------------------------------------------------------
function riverPush(g, e, dt, strength, grip = 7) {
  if (g.dim !== 0 || !g.world || !g.world.gen.riverFlow) return;
  const f = g.world.gen.riverFlow(e.x, e.z);
  if (!f) return;
  const want = 2.2 * strength, along = (e.vx || 0) * f[0] + (e.vz || 0) * f[1];
  if (along < want) { const k = Math.min(1, dt * grip); e.vx += f[0] * (want - along) * k; e.vz += f[1] * (want - along) * k; }
}
{
  const baseLP = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseLP.call(this, dt, inp);
    const g = this.g, p = this.player;
    if (g.state !== 'playing' || p.dead) return r;
    const c = p.contacts || {};
    // (0.9.0.15) a gentler pull on a swimmer: it carries you along, but you can swim across it, or against it slowly
    if (c.water && !this.riding && !p.flying) riverPush(g, p, dt, p.sneaking ? 0.2 : 0.42, 2.5);
    // the winds that carry you down from the sky
    if (p.slowFallT > 0) {
      p.slowFallT -= dt; p.fallStart = null;
      // the stacked worlds' winds only hold you up inside the cloud bank between them (game/seamless.js)
      if (p.cloudFall && !(cloudAt(g, p.y) > 0.05)) { p.slowFallT = 0; p.cloudFall = false; p.fallStart = p.y; }
      if (p.vy < -5) { p.vy += (-5 - p.vy) * Math.min(1, dt * 5); if (p.vy > -7) p.vy = -5; }   // the air thickens: slowed, not stopped dead
      if (Math.random() < dt * 12) g.burst(p.x, p.y + 0.5, p.z, g.dim === DIM.DEPTHS ? 'flame' : 'white', 1, 0.3, 2);
      if (p.onGround) p.slowFallT = 0;
    }
    stackedTick(g, this);
    return r;
  };
  if (typeof Boat === 'function') {
    const baseBoat = Boat.prototype.update;
    Boat.prototype.update = function (dt) { const r = baseBoat.call(this, dt); if (!this.ghost && this.game) { const w = this.game.world, id = w && w.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z)); if (T_LIQUID[id] === 1 || T_LIQUID[w.getBlock(Math.floor(this.x), Math.floor(this.y - 0.3), Math.floor(this.z))] === 1) riverPush(this.game, this, dt, 0.8); } return r; };
  }
  const baseItem = DroppedItem.prototype.update;
  DroppedItem.prototype.update = function (dt) { const r = baseItem.call(this, dt); if (!this.ghost && this.game && T_LIQUID[this.game.world.getBlock(Math.floor(this.x), Math.floor(this.y + 0.1), Math.floor(this.z))] === 1) riverPush(this.game, this, dt, 0.7); return r; };
}

// ---- the stacked worlds: falling down, climbing up -----------------------------------------------------------
// No loading screen: the world you're heading into is made ready in the background as you come near the
// edge (game/seamless.js), and you pass from one to the other through a bank of cloud without stopping.
function stackedTick(g, lp) {
  if (g.isGuest || g._traveling || lp.index !== 0 || g.state !== 'playing') return;
  const p = lp.player, m = lp.riding, vy = m && m.vy !== undefined ? m.vy : p.vy;
  const together = g.net && g.net.peers && g.net.peers.size > 0;
  let to = null, how = null;
  if (g.dim === DIM.SKYLANDS && p.y < 0 && vy < 0) { to = 0; how = 'fall'; }
  else if (g.dim === 0 && p.y < -0.5) { to = DIM.DEPTHS; how = 'crust'; }
  else if (g.dim === 0 && p.y > CH - 1.2 && vy > 0) { to = DIM.SKYLANDS; how = 'rise'; }
  if (to === null) return;
  if (together) {
    // everyone moves together for now: don't drag the others along by surprise
    if (!lp._stackWarn) { lp._stackWarn = 1; lp.toast('Falling between worlds only works when playing alone for now — use a portal', 'warn'); }
    const q = m || p;
    if (how === 'fall') { q.y = 1; q.vy = 0; p.slowFallT = 0; }
    if (how === 'crust') { p.y = 1; p.vy = 0; }
    if (how === 'rise') { q.y = CH - 2.5; q.vy = Math.min(q.vy, 0); }
    return;
  }
  g.stackSwap(to, how);
}
// the nearest island surface to (x, z), worked out from the Skylands' own shape
function skyLanding(g, x, z) {
  const gen = g.world && g.world.dim === DIM.SKYLANDS ? g.world.gen : makeWorldGen(g.meta.seed, DIM.SKYLANDS, g.meta.genVersion || 1);
  for (let r = 0; r <= 160; r += 6) {
    for (let a = 0; a < Math.max(1, r / 3); a++) {
      const ang = a / Math.max(1, r / 3) * TAU, wx = Math.floor(x + Math.cos(ang) * r), wz = Math.floor(z + Math.sin(ang) * r);
      const mask = gen.nCont.fbm2(wx / 180, wz / 180, 3);
      if (mask < 0.16) continue;
      const topY = 70 + Math.floor(gen.nHill.fbm2(wx / 60, wz / 60, 3) * 10);
      return [wx + 0.5, topY + 2, wz + 0.5];
    }
  }
  return [x, 90, z];
}
// ---- the crust's look -----------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('ember_crust', p => {
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.set(x, y, shade(H('#2a2224'), 0.8 + p.rand() * 0.3));
      for (let k = 0; k < 6; k++) { let x = Math.floor(p.rand() * 32), y = Math.floor(p.rand() * 32); for (let i = 0; i < 12; i++) { p.set(x & 31, y & 31, mix(H('#ffb040'), H('#e04010'), p.rand())); x += p.rand() < 0.5 ? 1 : -1; y += p.rand() < 0.5 ? 1 : 0; } }
    }, 0, undefined, GR);
  };
}
