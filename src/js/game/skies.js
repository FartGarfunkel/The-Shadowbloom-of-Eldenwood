// ---------------------------------------------------------------------------
// game/skies.js — 0.9.0.50: the sky update.
//
// Storms you can see coming: weather arrives as a front on the wind. Thin wisps
// run ahead of it, then the clouds pile up thicker, darker and (for a
// thunderstorm) taller along one side of the sky, the wind rises and thunder
// rolls in the distance, and then the rain reaches you. When it passes, the
// clear sky follows it in from the same side.
// Fog: mist after rain that burns off as the sun climbs, morning fog in the
// valleys and over rivers, swamp mist, banks of sea fog on the coast.
// Each land its own weather: sandstorms in the desert, blizzards in the cold,
// downpours and passing showers in the jungle, drizzle in the swamp, dry
// thunderstorms over the savanna that set the grass alight, squalls at sea;
// storms flashing below the Skylands, ash drifting down in the Ember Depths.
// The open sea swells, more in a storm; lakes less, ponds hardly at all.
// Lightning goes for high points, a lightning rod takes it (and gives a pulse
// of redstone), struck sand turns to glass, a struck tree chars and burns, and
// a strike close by shakes you. Snow and ice a storm leaves melt once it's over.
// The northern lights over cold lands on clear nights; a rainbow after rain.
// ---------------------------------------------------------------------------
const SKY = { FRONT_SPEED: 7, FRONT_START: 1650, BAND: 260, TRAIL: 80 };
const sat = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth01 = (v) => { v = sat(v); return v * v * (3 - 2 * v); };

// what kind of land a spot is, for its weather
function skyZone(g, x, z) {
  if (g.dim !== 0 || !g.world || !g.world.gen || !g.world.gen.column) return 'none';
  let c; try { c = g.world.gen.column(Math.floor(x), Math.floor(z)); } catch (e) { return 'temperate'; }
  const t = c.temp ?? 0, hm = c.humid ?? 0;
  if (c.biome === BIOME.DESERT) return 'desert';
  if (c.biome === BIOME.OCEAN && c.h < SEA - 3) return 'ocean';
  if (c.biome === BIOME.PLAINS && t > 0.28 && hm < 0.02) return 'savanna';
  if (t > 0.25 && hm > 0.3) return 'jungle';
  if ((c.biome === BIOME.PLAINS || c.biome === BIOME.FOREST || c.biome === BIOME.BEACH) && c.h <= SEA + 3 && hm > 0.38 && t > -0.1) return 'swamp';
  if (t < -0.3 || c.h > 104) return 'cold';
  if (c.biome === BIOME.BEACH || c.biome === BIOME.OCEAN) return 'coast';
  return 'temperate';
}
const ZONE_WET = { desert: 0.15, savanna: 0.35, jungle: 1.2, swamp: 1.3, ocean: 1, coast: 1, cold: 0.7, temperate: 1, none: 0 };

{
  const WP = Weather.prototype;
  // ---- the front: where the storm is, as a field over the land ------------------------------------------------
  // d is how far a spot lies upwind of the lead player; a front's leading edge is that far upwind, and everything
  // beyond it is in the storm. The trailing edge works the same way the other way round.
  WP.stormAt = function (x, z) {
    const W = this.state(), ax = this.ax ?? x, az = this.az ?? z;
    let s;
    const T = W.trail;
    if (T) { const d = (x - ax) * T.ux + (z - az) * T.uz; s = sat((T.edge - d) / SKY.BAND + 0.5); }
    else s = W.kind !== 'clear' ? 1 : 0;
    const F = W.front;
    if (F) { const d = (x - ax) * F.ux + (z - az) * F.uz; s = Math.max(s, sat((d - F.edge) / SKY.BAND + 0.5)); }
    return smooth01(s);
  };
  WP.stormKind = function () { const W = this.state(); return W.front ? W.front.kind : W.kind; };
  WP.upwind = function () { const d = this.g.wind ? this.g.wind.dir : 0; return [Math.sin(d), Math.cos(d)]; };
  // a storm on its way: it reaches you in about four minutes
  WP.startFront = function (kind) {
    const W = this.state(), [ux, uz] = this.upwind();
    W.front = { kind, ux, uz, edge: SKY.FRONT_START };
    W.trail = null; W.left = 1e6;
  };
  const baseSet = WP.set;
  WP.set = function (kind, secs) {
    const W = this.state();
    W.front = null;                                 // /weather (or the front arriving) makes it so here and now
    if (!this._cycling) W.trail = null;             // (the storm ending by itself keeps its trailing edge going on past you)
    return baseSet.call(this, kind, secs);
  };
  // the ice a storm froze, so it can thaw again (kept with the world, up to 1500)
  WP.noteIce = function (x, y, z) {
    const W = this.state(), L = W.ice || (W.ice = []);
    L.push([x, y, z]); if (L.length > 1500) L.splice(0, L.length - 1500);
  };

  const baseUpd = WP.update;
  WP.update = function (dt) {
    const g = this.g;
    if (!g.meta || !g.world) return baseUpd.call(this, dt);
    const W = this.state(), lead = g.locals[0] && g.locals[0].player;
    if (lead) { this.ax = lead.x; this.az = lead.z; }
    // (0.9.0.54) a different world opened: the last one's rain, showers and mist don't come with you (quitting in the
    // rain into a sunny world used to bring a fog and a rainbow with it)
    if (this._skyMeta !== g.meta) {
      this._skyMeta = g.meta; this._lastKind = null; this.showerT = 0; this.showerK = 0; this.sand = 0; this.bliz = 0; this.mistNow = 0;
      this._pcs = null; this._colAt = null; this._zoneT = 0; this.ashT = 0; this.ash = 0.2; if (this.extra) this.extra.length = 0;
    }
    const host = !g.isGuest, cycle = g.rules().weatherCycle && host && g.state === 'playing';
    // the cycle: a clear spell ending sends a front in, instead of the rain simply starting
    if (cycle && W.kind === 'clear' && !W.front && W.left - dt <= 0) this.startFront(Math.random() < 0.3 ? 'thunder' : 'rain');
    if (W.front) {
      W.left = Math.max(W.left, 1e5);
      if (g.state === 'playing') W.front.edge -= SKY.FRONT_SPEED * dt;
      if (W.front.edge <= 0 && host) { const k = W.front.kind; this.set(k); }
    }
    // the end of a storm: the clear sky comes in from upwind over its last minute or so
    if (cycle && W.kind !== 'clear' && !W.trail && W.left < SKY.TRAIL) { const [ux, uz] = this.upwind(); W.trail = { ux, uz, edge: W.left * SKY.FRONT_SPEED }; }
    if (W.trail && g.state === 'playing') { W.trail.edge -= SKY.FRONT_SPEED * dt; if (W.trail.edge < -2400) W.trail = null; }
    const was = this._lastKind;
    this._cycling = true;
    let r; try { r = baseUpd.call(this, dt); } finally { this._cycling = false; }
    // just cleared up: mist that burns off, maybe a rainbow
    if (was && was !== 'clear' && W.kind === 'clear') {
      W.mist = Math.max(W.mist || 0, was === 'thunder' ? 0.85 : 0.62);
      if (g.env && g.env.sunDir && g.env.sunDir[1] > 0.05 && g.env.sunDir[1] < 0.72) W.rainbowT = 110;
    }
    this._lastKind = W.kind; if (W.kind !== 'clear') this._lastStorm = W.kind;
    if (this.bankFlash > 0) this.bankFlash -= dt;
    if (W.front && W.front.kind === 'thunder' && Math.random() < dt / 5) this.bankFlash = 0.25;
    if (W.mist > 0) { const sunUp = g.env ? sat((g.env.day - 0.3) / 0.6) : 0.5; W.mist = Math.max(0, W.mist - dt * (0.5 + sunUp * 1.6 + (g.wind ? g.wind.strength : 0.5)) / 420); }
    if (W.rainbowT > 0) W.rainbowT -= dt;
    // sea fog now and then on a clear day, and the local showers of wet places
    if (host && W.kind === 'clear') {
      if (!(W.seaFog > 0) && Math.random() < dt / 2400) W.seaFog = 180 + Math.random() * 240;
    }
    if (W.seaFog > 0) W.seaFog -= dt;
    this.localWeather(dt);
    this.thaw(dt);
    this.rodTick();
    return r;
  };

  // ---- the weather where you are ----------------------------------------------------------------------------
  WP.localWeather = function (dt) {
    const g = this.g, W = this.state(), lead = g.locals[0] && g.locals[0].player;
    if ((this._zoneT = (this._zoneT || 0) - dt) <= 0 && lead) { this._zoneT = 0.5; this.zone = skyZone(g, lead.x, lead.z); }
    const zone = g.dim === 0 ? this.zone || 'temperate' : 'none';
    const here = lead && g.dim === 0 ? this.stormAt(lead.x, lead.z) : 0, kind = this.stormKind(), storm = W.kind !== 'clear' ? here : 0;
    // showers in the jungle and drizzle in the swamp, between the storms (only there: precipAt keeps them to those lands)
    if (W.kind === 'clear' && !W.front && (zone === 'jungle' || zone === 'swamp') && !(this.showerT > 0) && Math.random() < dt / (zone === 'jungle' ? 260 : 340)) {
      this.showerT = zone === 'jungle' ? 40 + Math.random() * 60 : 60 + Math.random() * 100; this.showerZone = zone;
    }
    if (this.showerT > 0) { this.showerT -= dt; if (W.kind !== 'clear') this.showerT = 0; }
    const shower = this.showerT > 0 ? (this.showerZone === 'jungle' ? 0.9 : 0.42) : 0;
    this.showerK = (this.showerK || 0) + (shower - (this.showerK || 0)) * Math.min(1, dt * 0.25);
    if (this.showerK > 0.01 && W.kind === 'clear') this.rain = Math.max(this.rain, this.showerK);
    // how heavy, which way it blows
    const jungle = zone === 'jungle' || this.showerZone === 'jungle' && this.showerK > 0.05;
    this.bliz = (this.bliz || 0) + ((zone === 'cold' && kind === 'thunder' ? storm : 0) - (this.bliz || 0)) * Math.min(1, dt * 0.15);
    this.sand = (this.sand || 0) + ((zone === 'desert' && W.kind !== 'clear' ? storm : 0) - (this.sand || 0)) * Math.min(1, dt * 0.12);
    this.dens = W.kind === 'clear' && this.showerK > 0.01 ? (this.showerZone === 'jungle' ? 1.3 : 0.5) : jungle ? 1.5 : zone === 'ocean' ? 1.3 : 1 + this.bliz * 0.7;
    const wd = g.wind ? g.wind.dir : 0, ws = g.wind ? g.wind.strength : 0.5;
    this.windDX = -Math.sin(wd); this.windDZ = -Math.cos(wd);
    this.windTilt = ws * 1.2 + (zone === 'ocean' ? 1.5 * storm : 0);
    this.snowDrift = this.bliz * 9 + ws * 0.6;
    // the wind gets up as a front comes in, and in a storm
    const F = W.front, approach = F ? sat(1 - F.edge / SKY.FRONT_START) : 0;
    this.approach = approach;
    this.windUp = Math.max(approach * approach, storm * (kind === 'thunder' ? 1 : 0.6), this.sand, this.bliz);
    // thunder far off before the storm arrives
    if (F && F.kind === 'thunder' && approach > 0.35 && g.sfx && Math.random() < dt / 18) g.sfx.play('thunder_far');
    // the sky overhead: the storm's clouds reach over you before its rain does
    this.over = lead && g.dim === 0 ? Math.max(here, F ? this.stormAt(lead.x + F.ux * 260, lead.z + F.uz * 260) * 0.7 : 0) : 0;
    // mist where you are
    if (g.dim === 0 && g.meta && lead) {
      // (the column where you stand, looked up four times a second, not every frame)
      if (!this._colAt || (this._colT = (this._colT || 0) - dt) <= 0) { this._colT = 0.25; try { this._colAt = g.world.gen.column(Math.floor(lead.x), Math.floor(lead.z)); } catch (e) { this._colAt = null; } }
    } else if (g.dim === DIM.DEPTHS) {
      // ash: always a little, now and then a storm of it
      if (!(this.ashT > 0) && Math.random() < dt / 1500) this.ashT = 90 + Math.random() * 120;
      if (this.ashT > 0) this.ashT -= dt;
      this.ash = (this.ash || 0.2) + (((this.ashT > 0) ? 1 : 0.2) - (this.ash || 0.2)) * Math.min(1, dt * 0.08);
    }
    const mist = this.mistTarget(lead, zone, this._colAt, this.sand, this.bliz);
    this.mistNow = (this.mistNow || 0) + (mist - (this.mistNow || 0)) * Math.min(1, dt * 0.35);
    this._mistDim = g.dim;
    // the Skylands: the storms are below you, and flash
    if (this.belowFlash > 0) this.belowFlash -= dt;
    if (g.dim === DIM.SKYLANDS && W.kind === 'thunder' && Math.random() < dt / 7) { this.belowFlash = 0.3; if (Math.random() < 0.5 && g.sfx) setTimeout(() => g.sfx.play('thunder_far'), 600 + Math.random() * 1800); }
    // (0.9.0.54) split screen: everyone else on this screen has their own mist, sandstorm and northern lights, where
    // they stand (before, all of it was player 1's)
    for (let i = 1; i < g.locals.length; i++) this.localFor(g.locals[i], dt, W);
    this.extraParticles(dt, zone);
  };
  // how misty it is for someone standing here
  WP.mistTarget = function (p, zone, c, sand, bliz) {
    const g = this.g, W = this.state();
    if (g.dim === DIM.DEPTHS) return 0.12 + Math.max(0, (this.ash || 0.2) - 0.2) * 0.55;
    if (g.dim !== 0 || !g.meta) return 0;
    let mist = (W.mist || 0) * (ZONE_WET[zone] ?? 1);
    const t = g.meta.time / DAY_LEN, ang = t * TAU, sh = Math.sin(ang), morning = Math.cos(ang) > -0.2 ? smooth01((sh + 0.15) / 0.15) * (1 - smooth01((sh - 0.05) / 0.3)) : 0;
    let low = 0;
    if (p) {
      if (c) low = (c.river ? 0.8 : 0) + (c.h < SEA + 10 && (c.humid ?? 0) > 0.05 ? 0.5 : 0) + (zone === 'swamp' ? 0.8 : 0);
      if (p.y > SEA + 26) low *= 0.3;
    }
    mist = Math.max(mist, morning * Math.min(1, low) * 0.62);
    if (zone === 'swamp') mist = Math.max(mist, 0.28 + 0.2 * (1 - (g.env ? g.env.day : 1)));
    if (W.seaFog > 0 && (zone === 'ocean' || zone === 'coast' || zone === 'swamp')) mist = Math.max(mist, 0.62 * sat(W.seaFog / 30) * sat((420 - W.seaFog) / 30 + 1));
    mist = Math.max(mist, this.rain * 0.12, sand * 0.82, bliz * 0.72);
    if (p && (g.world.getLight(Math.floor(p.x), Math.floor(p.y + 1.5), Math.floor(p.z)) >> 4) < 6) mist *= 0.25;   // indoors and down a mine
    return mist;
  };
  // another player on this screen: their own patch of weather
  WP.localFor = function (l, dt, W) {
    const g = this.g, p = l.player;
    const S = l._sky || (l._sky = { zone: 'temperate', zt: 0, col: null, ct: 0, mist: this.mistNow || 0, sand: 0, bliz: 0 });
    if ((S.zt -= dt) <= 0) { S.zt = 0.5; S.zone = skyZone(g, p.x, p.z); }
    if (g.dim === 0 && (S.ct -= dt) <= 0) { S.ct = 0.25; try { S.col = g.world.gen.column(Math.floor(p.x), Math.floor(p.z)); } catch (e) { S.col = null; } }
    const zone = g.dim === 0 ? S.zone || 'temperate' : 'none', storm = W.kind !== 'clear' && g.dim === 0 ? this.stormAt(p.x, p.z) : 0;
    S.bliz += ((zone === 'cold' && this.stormKind() === 'thunder' ? storm : 0) - S.bliz) * Math.min(1, dt * 0.15);
    S.sand += ((zone === 'desert' && W.kind !== 'clear' ? storm : 0) - S.sand) * Math.min(1, dt * 0.12);
    S.mist += (this.mistTarget(p, zone, S.col, S.sand, S.bliz) - S.mist) * Math.min(1, dt * 0.35);
  };
  // rain only falls on the jungle or the swamp in one of their own showers
  // (0.9.0.54) what falls where is kept for each 8x8 patch a few seconds: every drop used to ask the world generator
  const basePrecip = WP.precipAt;
  const precipRaw = function (x, y, z) {
    const k = basePrecip.call(this, x, y, z);
    if (!k || this.state().kind !== 'clear') return k;
    if (this.showerK > 0.01) { const zn = skyZone(this.g, x, z); return zn === 'jungle' || zn === 'swamp' ? k : null; }
    return k;
  };
  WP.precipAt = function (x, y, z) {
    const g = this.g, W = this.state(), shower = this.showerK > 0.01 && W.kind === 'clear';
    const stamp = W.kind + ':' + (shower ? 1 : 0) + ':' + (g.world && g.world.gen ? g.world.gen.seed : 0);
    // (0.9.0.54) one cache for each layer, so split screen across layers doesn't empty it every pass
    const PC = this._pcs || (this._pcs = new Map());
    let C = PC.get(g.dim); if (!C) { C = { stamp: '', t: 0, map: new Map() }; PC.set(g.dim, C); }
    if (C.stamp !== stamp || g.time - C.t > 4 || C.map.size > 4000) { C.stamp = stamp; C.t = g.time; C.map.clear(); }
    const key = ((Math.floor(x) >> 3) * 65536 + (Math.floor(z) >> 3)) * 2 + (y > 110 ? 1 : 0);
    let v = C.map.get(key);
    if (v === undefined) { v = precipRaw.call(this, x, y, z); C.map.set(key, v); }
    return v;
  };

  // ---- sand, dust and ash, drawn with the particles ----------------------------------------------------------
  WP.extraParticles = function (dt, zone) {
    const g = this.g, E = this.extra || (this.extra = []), parts = g.settings.particles ?? 2;
    for (let i = E.length - 1; i >= 0; i--) { const q = E[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; if (q.life <= 0) { E[i] = E[E.length - 1]; E.pop(); } }
    if (!parts || !g.world) return;
    const w = g.world, white = tileUV(ATLAS.tile.white ?? 0), cap = parts === 1 ? 220 : 600;
    const spawn = (n, mk, only) => { for (const l of g.locals) { if (only && l !== only) continue; const p = l.player; for (let k = 0; k < n && E.length < cap; k++) { const q = mk(p); if (!q) continue; q.dim = g.dim; const lt = w.getLight(Math.floor(q.x), Math.floor(q.y), Math.floor(q.z)); if ((lt >> 4) < 8 && g.dim === 0) continue; q.uv = white; q.light = (Math.max(lt >> 4, 10) << 4) | (lt & 15); E.push(q); } } };
    const wdx = this.windDX ?? 1, wdz = this.windDZ ?? 0;
    if (g.dim === 0) for (const l of g.locals) {
      const sd = l !== g.locals[0] && l._sky ? l._sky.sand : this.sand;      // (0.9.0.54) each player's own sandstorm
      if (!(sd > 0.05)) continue;
      const n = Math.ceil(sd * 160 * dt * (parts === 1 ? 0.4 : 1));
      spawn(n, (p) => {
        const a = Math.random() * TAU, r = 2 + Math.random() * 18, sp = 9 + Math.random() * 7, x = p.x + Math.cos(a) * r - wdx * 6, z = p.z + Math.sin(a) * r - wdz * 6, y = p.y + Math.random() * 4 - 0.5;
        const big = Math.random() < 0.25;
        return { x, y, z, vx: wdx * sp, vy: (Math.random() - 0.5) * 0.6, vz: wdz * sp, life: 1.2 + Math.random(), size: big ? 0.07 : 0.02, streak: big ? 0 : 0.35, sdx: wdx, sdy: 0, sdz: wdz, tint: big ? [150, 118, 78] : [178, 140, 92] };
      }, l);
    }
    if (g.dim === DIM.DEPTHS) {
      const n = Math.ceil((this.ash || 0.2) * 70 * dt * (parts === 1 ? 0.4 : 1));
      spawn(n, (p) => {
        const a = Math.random() * TAU, r = Math.pow(Math.random(), 0.7) * 22;
        return { x: p.x + Math.cos(a) * r, y: p.y + 2 + Math.random() * 10, z: p.z + Math.sin(a) * r, vx: (Math.random() - 0.5) * 0.5 + wdx * 0.4, vy: -0.4 - Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.5 + wdz * 0.4, life: 6 + Math.random() * 6, size: 0.03 + Math.random() * 0.025, tint: Math.random() < 0.08 ? [255, 120, 40] : [96, 90, 86] };
      });
    }
  };
  {
    const baseRender = Game.prototype.renderViews;
    Game.prototype.renderViews = function (dt, R) {
      const E = this.weather && this.weather.extra;
      if (E && E.length) { const pl = this.particles.list, n = pl.length; for (const q of E) if (q.dim === undefined || q.dim === this.dim) pl.push(q); /* (0.9.0.55) only in their own land */ try { return baseRender.call(this, dt, R); } finally { pl.length = n; } }
      return baseRender.call(this, dt, R);
    };
  }

  // ---- snow and ice melt once a storm is over ------------------------------------------------------------------
  WP.thaw = function (dt) {
    const g = this.g, W = this.state(), L = W.ice;
    if (!L || !L.length || g.isGuest || g.dim !== 0 || (this._thawT = (this._thawT || 0) - dt) > 0) return;
    this._thawT = 1;
    const w = g.world, clear = W.kind === 'clear' && this.rain < 0.1, day = g.env ? g.env.day : 1;
    if (!clear) return;
    for (let i = L.length - 1; i >= 0; i--) {
      const [x, y, z] = L[i];
      if (!w.isLoaded(x, z)) continue;
      if (w.getBlock(x, y, z) !== B.ice) { L.splice(i, 1); continue; }
      const sun = (w.getLight(x, y + 1, z) >> 4) * day, cold = this.precipAt(x, y, z) === 'snow';
      if (Math.random() < (sun > 11 ? 1 / 120 : 1 / 480) * (cold ? 0.5 : 1)) { w.setBlock(x, y, z, B.water, 0, { quiet: true }); L.splice(i, 1); }
    }
  };

  // ---- lightning ---------------------------------------------------------------------------------------------
  // it goes for the high places: of a few spots in the storm near someone, the tallest; a lightning rod close by takes it
  WP.strikeNear = function () {
    const g = this.g, w = g.world;
    const l = g.locals[Math.floor(Math.random() * g.locals.length)]; if (!l) return;
    const p = l.player;
    let best = null;
    for (let i = 0; i < 7; i++) {
      let x, z;
      if (i === 0 && Math.random() < 0.2 && p.y > SEA + 30 && (w.getLight(Math.floor(p.x), Math.floor(p.y + 1.6), Math.floor(p.z)) >> 4) === 15) { x = Math.floor(p.x + (Math.random() - 0.5) * 6); z = Math.floor(p.z + (Math.random() - 0.5) * 6); }   // out on a high top
      else { const a = Math.random() * TAU, d = 12 + Math.random() * 60; x = Math.floor(p.x + Math.cos(a) * d); z = Math.floor(p.z + Math.sin(a) * d); }
      if (!w.isLoaded(x, z) || this.stormAt(x, z) < 0.6) continue;
      if (!this.precipAt(x, 64, z) && skyZone(g, x, z) !== 'savanna') continue;   // the savanna's storms are dry, and strike all the same
      const y = this.topAt(x, z), score = y + Math.random() * 6;
      if (!best || score > best[3]) best = [x, y, z, score];
    }
    if (!best) return;
    const rod = this.rodNear(best[0], best[1], best[2], 40);
    if (rod) this.strike(rod[0], rod[1] + 1, rod[2], { rod });
    else this.strike(best[0], best[1], best[2]);
  };
  WP.rodNear = function (x, y, z, R) {
    const w = this.g.world;
    let best = null;
    for (let cz = (z - R) >> 4; cz <= (z + R) >> 4; cz++) for (let cx = (x - R) >> 4; cx <= (x + R) >> 4; cx++) {
      const ch = w.chunkAt(cx, cz); if (!ch || !ch.rods) continue;
      for (const [lx, ry, lz] of ch.rods) {
        const rx = cx * 16 + lx, rz = cz * 16 + lz;
        if (Math.hypot(rx - x, rz - z) > R || w.getBlock(rx, ry, rz) !== B.lightning_rod) continue;
        if (this.topAt(rx, rz) > ry + 1) continue;                                   // under a roof: it can't be reached
        if (!best || ry > best[1] || (ry === best[1] && Math.hypot(rx - x, rz - z) < Math.hypot(best[0] - x, best[2] - z))) best = [rx, ry, rz];
      }
    }
    return best;
  };
  WP.strike = function (x, y, z, o = {}) {
    const g = this.g, w = g.world;
    this.flashT = 0.35;
    g.addEntity(new LightningBolt(g, x + 0.5, y, z + 0.5));
    for (const l of g.locals) {
      const d = Math.hypot(l.player.x - x, l.player.z - z);
      setTimeout(() => g.sfx.play(d < 40 ? 'thunder' : 'thunder_far'), Math.min(3000, d * 12));
      if (d < 28) { if (l.shake) l.shake(0.9 * (1 - d / 28)); else l.shakeAmt = Math.max(l.shakeAmt || 0, 0.9 * (1 - d / 28)); }   // close by: you feel it (unless screen shake is off)
    }
    const R = o.rod ? 1.2 : 1;
    for (const e of g.entities) if (e instanceof Mob && e.alive && Math.hypot(e.x - x - 0.5, e.z - z - 0.5) < 3 * R && Math.abs(e.y - y) < 4) { e.hurt(5, { type: 'lightning', element: 'fire' }); e.burn = Math.max(e.burn, 4); }
    for (const q of g.pawns()) if (!q.dead && Math.hypot(q.x - x - 0.5, q.z - z - 0.5) < 2.5 * (o.rod ? 0.5 : 1) && Math.abs(q.y - y) < 4) { q.hurt(5, { type: 'lightning' }); if (q.ignite) q.ignite(4); }
    if (o.rod) { this.rodPulse(o.rod[0], o.rod[1], o.rod[2]); return; }         // the rod takes it: nothing burns
    if (g.isGuest) return;
    const fire = g.rules().fireSpread, zone = skyZone(g, x, z);
    const below = w.getBlock(x, y - 1, z);
    // sand fuses into glass where it struck
    if (below === B.sand || below === B.red_sand) {
      for (let k = 1; k <= 3; k++) { const id = w.getBlock(x, y - k, z); if (id !== B.sand && id !== B.red_sand) break; if (k === 1 || Math.random() < 0.6) w.setBlock(x, y - k, z, B.glass, 0); }
      return;
    }
    // a tree: down through its leaves to the trunk, which chars; the crown catches
    let ty = y - 1; while (ty > y - 7 && BLOCKS[w.getBlock(x, ty, z)].isLeaves) ty--;
    if (BLOCKS[w.getBlock(x, ty, z)].isLog && B.charred_log !== undefined) {
      for (let k = 0, yy = ty; k < 9 && BLOCKS[w.getBlock(x, yy, z)].isLog; k++, yy--) w.setBlock(x, yy, z, B.charred_log, w.getMeta(x, yy, z));
      if (fire) for (let k = 0; k < 5; k++) { const fx = x + Math.floor(Math.random() * 5) - 2, fz = z + Math.floor(Math.random() * 5) - 2, fy = ty + Math.floor(Math.random() * 4); if (w.getBlock(fx, fy, fz) === 0 && BLOCKS[w.getBlock(fx, fy - 1, fz)].isLeaves) w.setBlock(fx, fy, fz, B.fire, 0); }
      return;
    }
    // the ground: a fire, likelier on the dry grass of the savanna, where it spreads about
    if (fire && w.getBlock(x, y, z) === 0 && T_SOLID[below] && Math.random() < (zone === 'savanna' ? 0.95 : 0.6)) {
      w.setBlock(x, y, z, B.fire, 0);
      if (zone === 'savanna') for (let k = 0; k < 4; k++) { const fx = x + Math.floor(Math.random() * 7) - 3, fz = z + Math.floor(Math.random() * 7) - 3, fy = this.topAt(fx, fz); if (Math.abs(fy - y) < 3 && w.getBlock(fx, fy, fz) === 0 && T_SOLID[w.getBlock(fx, fy - 1, fz)]) w.setBlock(fx, fy, fz, B.fire, 0); }
    }
  };
  // a struck rod gives out a pulse of redstone, to whatever is beside it and the block it stands on
  const ROD_ON = new Map();
  WP.rodPulse = function (x, y, z) {
    const g = this.g; if (g.isGuest || !g.rs) return;
    ROD_ON.set(posKey(x, y, z), [x, y, z, g.time + 0.8]);
    g.rs.changed(x, y, z, B.lightning_rod, B.lightning_rod);
    g.burst(x + 0.5, y + 1, z + 0.5, 'white', 10, 1.4);
  };
  WP.rodTick = function () {
    if (!ROD_ON.size) return;
    const g = this.g;
    for (const [k, [x, y, z, t]] of ROD_ON) if (g.time > t || g.time < t - 5) { ROD_ON.delete(k); if (g.rs) g.rs.changed(x, y, z, B.lightning_rod, B.lightning_rod); }
  };
  const RP = Redstone.prototype, baseBP = RP.blockPower, baseIn = RP.inputFrom;
  RP.blockPower = function (x, y, z, strongOnly) { if (ROD_ON.size && ROD_ON.has(posKey(x, y + 1, z))) return 15; return baseBP.call(this, x, y, z, strongOnly); };
  RP.inputFrom = function (x, y, z, d) { if (ROD_ON.size && ROD_ON.has(posKey(x + D6X[d], y + D6Y[d], z + D6Z[d]))) return 15; return baseIn.call(this, x, y, z, d); };
  PV.debug.rods = { on: () => [...ROD_ON.values()] };
}

// ---- the wind gets up with the weather --------------------------------------------------------------------------
{
  const baseWind = Wind.prototype.update;
  Wind.prototype.update = function (dt) {
    baseWind.call(this, dt);
    const W = GAME && GAME.weather, up = W ? W.windUp || 0 : 0;
    if (up > 0.01) this.strength = Math.min(1, this.strength + (1 - this.strength) * up * 0.75);
  };
}

// ---- how the sky looks --------------------------------------------------------------------------------------------
{
  const baseEnv = Game.prototype.computeEnv;
  Game.prototype.computeEnv = function (dim, fixedT) {
    const e = baseEnv.call(this, dim, fixedT);
    const W = this.weather;
    if (!W || fixedT !== undefined || !this.meta) return e;
    // (0.9.0.54) in split screen the sky can be worked out for another player (seamless.js sets _envFor): their mist
    const who = this._envFor && this._envFor !== this.locals[0] && this._envFor._sky ? this._envFor : null;
    const M = W.state(), sandNow = who ? who._sky.sand : W.sand || 0;
    let mist = Math.min(1, who ? who._sky.mist : W.mistNow || 0);
    // (0.9.0.54) a sky for another land than the one the weather was worked out in (a portal's view, or split screen
    // across layers): the Depths have their ash, the rest no mist of their own here
    if (!who && W._mistDim !== undefined && W._mistDim !== dim) mist = dim === DIM.DEPTHS ? 0.12 + Math.max(0, (W.ash || 0.2) - 0.2) * 0.55 : 0;
    if (dim === DIM.OVERWORLD) {
      // the storm's clouds overhead before its rain: the light goes grey
      const pre = Math.max(0, (W.over || 0) * 0.6 - W.rain);
      if (pre > 0.01) {
        const grey = (c, k) => { const l = (c[0] + c[1] + c[2]) / 3; return c.map(v => lerp(v, l, k)); };
        e.zenith = grey(e.zenith, pre * 0.6); e.horizon = grey(e.horizon, pre * 0.5); e.fog = grey(e.fog, pre * 0.4); e.day *= 1 - 0.18 * pre; e.sunGlow = e.sunGlow.map(v => v * (1 - pre * 0.6));
      }
      // a storm far off, or one moving away: its bank of cloud on the horizon (the clouds near you are drawn as clouds)
      const F = M.front, T = M.trail;
      let bank = null;
      if (F && F.edge > 0) bank = [F.ux, F.uz, F.edge, (0.55 + 0.45 * sat(1 - F.edge / SKY.FRONT_START)) * smooth01((F.edge - 40) / 260), F.kind];
      else if (T && T.edge < 0 && M.kind === 'clear') bank = [-T.ux, -T.uz, -T.edge, smooth01((-T.edge - 40) / 260) * sat(1 - (-T.edge - 1200) / 1000), W._lastStorm || 'rain'];
      if (bank && bank[3] > 0.001) {
        const th = bank[4] === 'thunder', lum = 0.22 + 0.78 * sat((e.day - 0.2) / 0.8);
        const fl = W.bankFlash > 0 ? W.bankFlash / 0.25 : 0;
        const col = (th ? [0.25, 0.26, 0.31] : [0.48, 0.5, 0.55]).map(v => v * lum + fl * 0.35);
        e.storm = [bank[0], bank[1], bank[2], bank[3]]; e.stormCol = col;
      }
      // the sea: swells in the wind, rolls in a storm
      const ws = this.wind ? this.wind.strength : 0.5;
      e.sea = sat(0.1 + ws * 0.3 + W.thunderK * 0.55 + W.rain * 0.2 + (W.approach || 0) * 0.2 + (W.zone === 'ocean' ? 0.15 : 0));
      // the northern lights: cold lands, clear nights (some nights more than others)
      const lead = who ? who.player : this.locals[0] && this.locals[0].player;
      let cold = 0;
      if (lead && this.world && this.world.gen.column) { const c = who ? who._sky.col : W._colAt; if (c) cold = sat((-(c.temp ?? 0) - 0.12) / 0.3) + (lead.y > 100 ? 0.3 : 0); }
      const night = sat((0.55 - e.day) / 0.3), clearSky = 1 - Math.min(1, W.rain * 2 + (W.over || 0)), nightNo = Math.floor((this.meta.time || 0) / DAY_LEN + (this.meta.day || 0));
      const strong = 0.45 + 0.55 * ((hash32(nightNo, 7, 3, this.meta.seed | 0) & 255) / 255);
      e.aurora = sat(cold) * night * night * clearSky * (1 - mist) * strong;
      // a rainbow, with the sun behind you after the rain
      if (M.rainbowT > 0) e.rainbow = sat(M.rainbowT / 25) * sat((110 - M.rainbowT) / 10) * (1 - mist) * (1 - W.rain) * sat((e.day - 0.5) / 0.3);
    }
    if (mist > 0.01 && (dim === 0 || dim === DIM.DEPTHS)) {
      // mist (white by day, dark by night), a sandstorm's dust, the Depths' ash
      const dayK = sat((e.day - 0.2) / 0.8);
      let col = dim === DIM.DEPTHS ? [0.24, 0.12, 0.08] : [lerp(0.08, 0.76, dayK), lerp(0.09, 0.79, dayK), lerp(0.11, 0.82, dayK)];
      const sand = Math.min(1, sandNow * 1.2);
      if (dim === 0 && sand > 0.01) col = col.map((v, i) => lerp(v, [0.74, 0.58, 0.38][i] * (0.35 + 0.65 * dayK), sand));
      e.fog = e.fog.map((v, i) => lerp(v, col[i], Math.min(1, mist * 1.1)));
      e.horizon = e.horizon.map((v, i) => lerp(v, e.fog[i], mist));
      e.zenith = e.zenith.map((v, i) => lerp(v, e.fog[i], mist * 0.85));
      e.sunGlow = e.sunGlow.map(v => v * (1 - mist));
      e.stars *= 1 - mist;
      if (mist > 0.6) e.showSun = false;
      e.mist = mist;
    }
    return e;
  };
  // (0.9.0.54) split screen: a player whose weather isn't player 1's (mist, a sandstorm, the cold that brings the
  // northern lights) gets a sky of their own
  const baseView = Game.prototype.viewEnv;
  Game.prototype.viewEnv = function (lp) {
    const L0 = this.locals[0], S = lp && lp._sky, W = this.weather;
    if (!S || lp === L0 || !W || !this.env || this._envFor || (this.dim !== 0 && this.dim !== DIM.DEPTHS)) return baseView.call(this, lp);
    const coldOf = (c) => c ? -(c.temp ?? 0) : 0;
    const dm = Math.abs(Math.min(1, S.mist) - Math.min(1, W.mistNow || 0)), ds = Math.abs(S.sand - (W.sand || 0));
    const da = this.dim === 0 && this.env.day < 0.6 && Math.abs(coldOf(S.col) - coldOf(W._colAt)) > 0.03;
    if (dm < 0.02 && ds < 0.02 && !da) return baseView.call(this, lp);
    const keep = this.env;
    this._envFor = lp; try { this.env = this.computeEnv(this.dim); } finally { this._envFor = null; }
    try { return baseView.call(this, lp); } finally { this.env = keep; }
  };
  // the clouds: thick and dark where the storm is, wisps ahead of it, the Skylands' storms below flashing
  const baseScene = Game.prototype.cloudScene;
  Game.prototype.cloudScene = function (dim = this.dim) {
    const sc = baseScene.call(this, dim);
    const W = this.weather;
    if (!sc || !W) return sc;
    const M = W.state(), kind = W.stormKind(), zone = W.zone || 'temperate';
    sc.base = zone === 'desert' ? 0.22 : zone === 'jungle' || zone === 'swamp' ? 0.55 : zone === 'savanna' ? 0.32 : 0.42;
    sc.field = (x, z) => Math.max(W.stormAt(x, z), Math.min(1, (W.showerK || 0) * 0.8));
    sc.thunder = kind === 'thunder' ? 1 : 0;
    sc.darkK = dim === 0 ? (kind === 'thunder' ? 1 : 0.8) : 0.45;
    const F = M.front;
    sc.wisp = (x, z) => {
      let k = 0.05;
      if (F) { const d = (x - (W.ax || 0)) * F.ux + (z - (W.az || 0)) * F.uz; k += 0.5 * sat(1 - Math.abs(d - (F.edge - 450)) / 500); }
      return k;
    };
    sc.flash = Math.max(W.flashT > 0 ? Math.min(1, W.flashT / 0.2) : 0, dim === DIM.SKYLANDS && W.belowFlash > 0 ? W.belowFlash / 0.3 : 0);
    return sc;
  };
}

// ---- in the fog he stands where it thins ---------------------------------------------------------------------------
{
  const baseFind = Haunt.prototype.findSpot;
  Haunt.prototype.findSpot = function (mode) {
    const g = this.g, mist = g.env && g.env.mist || 0;
    if (mode !== 'far' || mist < 0.25) return baseFind.call(this, mode);
    const keep = g.settings.renderDist, vis = 24 + (keep * 16 - 24) * Math.pow(1 - mist, 2);
    // as far as you can see, and no further
    g.settings.renderDist = Math.max(2, (vis + 14) / 16);
    try { return baseFind.call(this, mode); } finally { g.settings.renderDist = keep; }
  };
}

// ---- the charred log's look ------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('charred_log_side', p => {
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const crack = ((x * 7 + Math.floor(y / 3) * 13) % 11) < 2; p.set(x, y, shade(H(crack ? '#e05a1a' : '#26201c'), crack ? 0.35 + p.rand() * 0.25 : 0.7 + p.rand() * 0.45)); }
    }, 0, undefined, GR);
    addTile('charred_log_top', p => {
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const r = Math.hypot(x - 15.5, y - 15.5), ring = Math.floor(r) % 4 === 0; p.set(x, y, shade(H(r > 13 ? '#1c1714' : ring ? '#3a2e26' : '#2c241f'), 0.75 + p.rand() * 0.35)); }
    }, 0, undefined, GR);
  };
}

// /weather front <rain|thunder>: a storm on its way (a few minutes off), as the weather brings them
{
  const base = COMMANDS.weather;
  COMMANDS.weather = Object.assign({}, base, { usage: '<clear|rain|thunder> [seconds] | front <rain|thunder>', run(lp, a) {
    if ((a[0] || '').toLowerCase() === 'front') { const k = (a[1] || 'rain').toLowerCase().startsWith('t') ? 'thunder' : 'rain'; const W = lp.g.weather; W.set('clear'); W.startFront(k); return 'A ' + (k === 'thunder' ? 'thunderstorm' : 'storm') + ' is on its way'; }
    return base.run(lp, a);
  } });
}
