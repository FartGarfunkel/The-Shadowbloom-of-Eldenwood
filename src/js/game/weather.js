// ---------------------------------------------------------------------------
// game/weather.js — rain, snow and thunderstorms.
//
// Clear spells last a good while, then cloud rolls in and it rains for a few
// minutes; some rains turn into thunderstorms with lightning that can strike
// the ground (and whatever stands on it). Cold places get snow instead and
// deserts stay dry. The sky greys and dims, monsters stop burning, and rain
// is heard (muffled under a roof). /weather sets it; the "Weather changes"
// game rule freezes it.
// ---------------------------------------------------------------------------

RULE_DEFAULTS.weatherCycle = true;
RULE_TOGGLES.push(['weatherCycle', 'Weather changes', 'Rain, snow and thunderstorms come and go']);
RULE_DEFAULTS.haunting = false;   // (Shadowbloom) the watcher is retired; the toggle is gone from the menus

// what a puddle can sit on
const PUDDLE_GROUND = new Set(['grass', 'dirt', 'coarse_dirt', 'dirt_path', 'podzol', 'mud', 'stone', 'cobblestone', 'gravel', 'mossy_cobblestone', 'stone_bricks', 'dirt_with_coniferous_litter', 'dirt_with_rainforest_litter', 'packed_mud', 'farmland'].map(k => B[k]).filter(v => v !== undefined));

// worlds saved before a rule existed get its default
{
  const baseRules = Game.prototype.rules;
  Game.prototype.rules = function () {
    const r = baseRules.call(this);
    if (r !== RULE_DEFAULTS && r._v2 !== 2) { for (const k in RULE_DEFAULTS) if (!(k in r)) r[k] = RULE_DEFAULTS[k]; r._v2 = 2; }
    return r;
  };
}

class Weather {
  constructor(game) {
    this.g = game; this.rain = 0; this.thunderK = 0; this.drops = []; this.flashT = 0; this.bolts = [];
    this.boltT = 10; this.loop = null; this.colTop = new Map(); this.colT = 0; this.meta = null;
  }
  state() {
    const m = this.g.meta;
    if (!m.weather) m.weather = { kind: 'clear', left: 600 + Math.random() * 1200 };
    return m.weather;
  }
  set(kind, secs) { const w = this.state(); w.kind = kind; w.left = secs || (kind === 'clear' ? 900 + Math.random() * 1200 : 300 + Math.random() * 360); }
  // What falls at this spot: 'rain', 'snow' or nothing (deserts and savannas stay dry).
  precipAt(x, y, z) {
    const g = this.g;
    if (g.dim !== DIM.OVERWORLD) return null;
    let c = null; try { c = g.world.gen.column ? g.world.gen.column(Math.floor(x), Math.floor(z)) : null; } catch (e) { c = null; }
    const temp = c && c.temp !== undefined ? c.temp : 0, humid = c && c.humid !== undefined ? c.humid : 0;
    if (c && (c.biome === BIOME.DESERT || (temp > 0.28 && humid < 0.02))) return null;
    if (temp < -0.3 || y > 110) return 'snow';
    return 'rain';
  }
  update(dt) {
    const g = this.g;
    if (!g.meta || !g.world) return;
    const W = this.state();
    // a different world: start in its weather at once instead of fading over
    if (this.meta !== g.meta) { this.meta = g.meta; this.rain = W.kind !== 'clear' ? 1 : 0; this.thunderK = W.kind === 'thunder' ? 1 : 0; this.drops.length = 0; this.colTop.clear(); }
    if (g.rules().weatherCycle && !g.isGuest && g.state === 'playing') {
      W.left -= dt;
      if (W.left <= 0) {
        if (W.kind === 'clear') this.set(Math.random() < 0.3 ? 'thunder' : 'rain');
        else this.set('clear');
      }
    }
    const wantRain = g.dim === DIM.OVERWORLD && W.kind !== 'clear' ? 1 : 0, wantThunder = W.kind === 'thunder' && wantRain ? 1 : 0;
    this.rain += (wantRain - this.rain) * Math.min(1, dt * 0.08);
    this.thunderK += (wantThunder - this.thunderK) * Math.min(1, dt * 0.08);
    if (this.rain < 0.002) this.rain = 0;
    if (this.flashT > 0) this.flashT -= dt;
    this.groundT = (this.groundT || 0) - dt;
    if (this.groundT <= 0) { this.groundT = 0.5; this.groundTick(); }
    this.updateDrops(dt);
    this.updateSound(dt);
    // lightning
    if (this.thunderK > 0.6 && g.state === 'playing' && !g.isGuest) {
      this.boltT -= dt;
      if (this.boltT <= 0) { this.boltT = 6 + Math.random() * 22; this.strikeNear(); }
    }
  }
  // The highest block that stops rain in this column (cached for a couple of seconds).
  topAt(x, z) {
    const k = x * 73856093 ^ z * 19349663, c = this.colTop.get(k), now = this.g.time;
    if (c && now - c[1] < 3) return c[0];
    const w = this.g.world, ch = w.chunkAt(x >> 4, z >> 4);
    let y = ch ? Math.min(CH - 1, ch.maxY + 1) : 0;
    if (ch) while (y > 0) { const id = w.getBlock(x, y, z); if (id && (T_SOLID[id] || T_LIQUID[id] || BLOCKS[id].isLeaves)) break; y--; }
    if (this.colTop.size > 4000) this.colTop.clear();
    this.colTop.set(k, [y + 1, now]);
    return y + 1;
  }
  updateDrops(dt) {
    const g = this.g, D = this.drops, parts = g.settings.particles ?? 2;
    for (let i = D.length - 1; i >= 0; i--) {
      const d = D[i];
      d.y += d.vy * dt; d.x += d.vx * dt; d.z += d.vz * dt;
      if (d.snow) { d.x += Math.sin(g.time * 1.3 + d.ph) * 0.4 * dt; d.z += Math.cos(g.time * 1.1 + d.ph) * 0.4 * dt; }
      if (d.y <= d.floor) {
        // a splash where it lands
        if (!d.snow && Math.random() < 0.25 && parts > 0) g.particles.add({ x: d.x, y: d.floor + 0.05, z: d.z, vx: (Math.random() - 0.5) * 0.8, vy: 1.2, vz: (Math.random() - 0.5) * 0.8, life: 0.25, max: 0.25, size: 0.03, uv: tileUV(ATLAS.tile.rain_splash ?? ATLAS.tile.white), light: d.light, grav: 9 });
        D[i] = D[D.length - 1]; D.pop();
      }
    }
    if (g.dim !== DIM.OVERWORLD) { D.length = 0; return; }        // (0.9.0.54) gone the moment you're somewhere else
    if (this.rain <= 0 || parts === 0) return;
    const want = Math.floor((parts === 1 ? 420 : 1100) * this.rain * (0.6 + 0.4 * this.thunderK) * (this.dens || 1));   // (0.9.0.50) heavier in a jungle, a blizzard
    const w = g.world;
    for (const l of g.locals) {
      // what falls is decided where each drop falls, not where you stand: from a dry desert you still see the
      // storm over the hills next to it, and the snow on the mountain beside you
      const p = l.player;
      let n = Math.min(want - D.length / g.locals.length, 90), tries = n * 2;
      const tilt = this.thunderK * 2.2 + (this.windTilt || 0), wdx = this.windDX ?? 1, wdz = this.windDZ ?? 0.4, drift = this.snowDrift || 0;   // (0.9.0.50) blown the way the wind blows
      while (n > 0 && tries-- > 0) {
        const a = Math.random() * TAU, r = Math.pow(Math.random(), 0.8) * 30;
        const x = p.x + Math.cos(a) * r + (p.vx || 0) * 0.6, z = p.z + Math.sin(a) * r + (p.vz || 0) * 0.6;
        if (!w.chunkAt(Math.floor(x) >> 4, Math.floor(z) >> 4)) continue;
        const kind = this.precipAt(x, p.y, z);
        if (!kind) continue;
        n--;
        const floor = this.topAt(Math.floor(x), Math.floor(z));
        const y = Math.max(floor, p.y + 6 + Math.random() * (8 + r * 0.4));
        if (floor > p.y + 14) continue;                        // under a roof: it's raining on the roof, not here
        const lt = w.getLight(Math.floor(x), Math.min(CH - 1, Math.floor(floor) + 1), Math.floor(z));
        const snow = kind === 'snow', far = 1 + Math.max(0, r - 9) / 6;   // far off they're drawn bigger, so a shower reads as a shower
        D.push({ x: x - (snow ? drift * wdx : tilt * wdx) * 0.8, y, z: z - (snow ? drift * wdz : tilt * wdz) * 0.8, vx: snow ? drift * wdx : tilt * wdx, vy: snow ? -1.6 - Math.random() * 0.6 - drift * 0.15 : -16 - Math.random() * 4, vz: snow ? drift * wdz : tilt * wdz, floor, snow, ph: Math.random() * 6,
          size: (snow ? 0.05 : 0.016) * far, vert: snow ? 0 : 0.5 * Math.min(2, far), uv: tileUV(ATLAS.tile[snow ? "snowflake" : "rain_streak"] ?? ATLAS.tile.white), light: (Math.max(lt >> 4, 12) << 4) | (lt & 15) });
      }
    }
  }
  // While it rains or snows, the ground changes: puddles gather in dips, snow settles on cold
  // ground and water freezes over, and rain on the edge of a snowy place melts the snow away.
  groundTick() {
    const g = this.g, w = g.world;
    if (this.rain < 0.5 || g.dim !== DIM.OVERWORLD || g.isGuest) return;
    for (const l of g.locals) {
      const p = l.player;
      for (let k = 0; k < 8; k++) {
        const x = Math.floor(p.x + (Math.random() - 0.5) * 56), z = Math.floor(p.z + (Math.random() - 0.5) * 56);
        if (!w.isLoaded(x, z)) continue;
        const top = this.topAt(x, z), y = top - 1, id = w.getBlock(x, y, z), above = w.getBlock(x, top, z);
        const kind = this.precipAt(x, y, z);
        if (!kind || (w.getLight(x, top, z) >> 4) < 15) continue;
        if (kind === 'snow') {
          if (id === B.water && w.getMeta(x, y, z) === 0 && Math.random() < 0.25) { w.setBlock(x, y, z, B.ice, 0); this.noteIce(x, y, z); continue; }
          // (0.9.0.50) snow the weather brings is marked (meta 8), so it can melt away again once the weather clears
          // (0.9.0.54) a snow layer is the top itself (it's solid underfoot), so that's where it thickens
          if (id === B.snow_layer) { const mm = w.getMeta(x, y, z), m = mm & 7; if (m < 1 && (mm & 8) && Math.random() < 0.15) w.setBlock(x, y, z, B.snow_layer, (m + 1) | 8, { quiet: true }); continue; }
          if (above === 0 && T_SOLID[id] && T_OPAQUE[id] && !T_SHAPE[id] && !BLOCKS[id].isLeaves && Math.random() < 0.35) w.setBlock(x, top, z, B.snow_layer, 8, { quiet: true });
          if (above === B.puddle) w.setBlock(x, top, z, B.snow_layer, 8, { quiet: true });
          continue;
        }
        // rain: snow on warmer ground melts, a puddle forms in a dip
        if (id === B.snow_layer || above === B.snow_layer) {
          const sy = id === B.snow_layer ? y : top, m = w.getMeta(x, sy, z) & 7;
          if (Math.random() < 0.5) { if (m > 0) w.setBlock(x, sy, z, B.snow_layer, m - 1, { quiet: true }); else w.setBlock(x, sy, z, 0, 0, { quiet: true }); }
          continue;
        }
        if (above !== 0 || !PUDDLE_GROUND.has(id) || Math.random() > 0.3) continue;
        if ((hash32(x, 7, z, g.meta.seed | 0) & 7) > 2) continue;           // puddles gather in patches, not everywhere
        let low = 0;
        for (let d = 0; d < 4; d++) { const nx = x + DIRX[d], nz = z + DIRZ[d]; if (T_SOLID[w.getBlock(nx, top, nz)] || this.topAt(nx, nz) > top) low++; else if (this.topAt(nx, nz) < top) low -= 2; }
        if (low >= 0) w.setBlock(x, top, z, B.puddle, 0, { quiet: true });
      }
    }
  }
  // Random ticks on puddles and snow: puddles dry when the rain stops (faster in the sun),
  // snow melts beside torches and in the warm parts of the world when it isn't snowing.
  blockTick(x, y, z, id, meta, rnd) {
    const g = this.g, w = g.world, l = w.getLight(x, y, z);
    // snow is everywhere in cold lands: most ticks end here, cheaply
    if (id === B.snow_layer && (l & 15) <= 11 && rnd() > 1 / 60) return;
    const kind = this.precipAt(x, y, z), wet = this.rain > 0.3;
    const sun = (l >> 4) * (g.env ? g.env.day : 1);
    if (id === B.puddle) {
      if (wet && kind === 'rain') return;
      if (rnd() < (sun > 12 ? 1 / 25 : 1 / 90)) w.setBlock(x, y, z, 0, 0, { quiet: true });
      return;
    }
    if (id === B.snow_layer) {
      const warm = kind === 'rain' || kind === null, snowing = wet && kind === 'snow';
      // (0.9.0.50) snow a storm left melts away once it's over: in the sun in a couple of minutes, slower in the shade
      // and at night. (The snow a cold land has always had stays, unless a torch or warm weather gets at it.)
      const left = (meta & 8) && !snowing && rnd() < (sun > 11 ? 0.5 : 0.12);
      if ((l & 15) > 11 || (warm && !snowing && sun > 11) || left) {
        const m = meta & 7;
        if (m > 0) w.setBlock(x, y, z, B.snow_layer, (m - 1) | (meta & 8), { quiet: true }); else w.setBlock(x, y, z, 0, 0, { quiet: true });
      }
    }
  }
  // The rain's hiss (loud out in the open, dull under a roof) and the rumble of far thunder.
  updateSound(dt) {
    const g = this.g, s = g.sfx;
    if (!s.ctx) return;
    if (!this.loop && this.rain > 0.01) {
      const c = s.ctx, src = c.createBufferSource(); src.buffer = s.noise; src.loop = true;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4500;
      const gn = c.createGain(); gn.gain.value = 0;
      src.connect(hp); hp.connect(lp); lp.connect(gn); gn.connect(s.master); src.start();
      this.loop = { src, lp, gn };
    }
    if (!this.loop) return;
    const lp = g.local, p = lp && lp.player;
    let open = 0;
    if (p && g.world && g.dim === DIM.OVERWORLD) {
      const sky = g.world.getLight(Math.floor(p.x), Math.floor(p.y + 1.5), Math.floor(p.z)) >> 4;
      open = sky / 15;
      // rain heard from the next biome over, more faintly
      if ((this._nearT = (this._nearT || 0) - dt) <= 0) {
        this._nearT = 1; let wet = 0, snow = 0;
        for (let k = 0; k < 9; k++) { const a = k * TAU / 8, r = k === 8 ? 0 : 16, kind = this.precipAt(p.x + Math.cos(a) * r, p.y, p.z + Math.sin(a) * r); if (kind === 'rain') wet += k === 8 ? 3 : 1; else if (kind === 'snow') snow++; }
        this._wet = Math.min(1, wet / 6);
      }
      open *= 0.12 + 0.88 * (this._wet ?? 1);
    }
    const lvl = (g.settings.ambience ?? 0.7) * this.rain * (0.08 + 0.22 * open) * (g.inWorld() ? 1 : 0);
    const gg = this.loop.gn.gain; gg.value += (lvl - gg.value) * Math.min(1, dt * 2);
    this.loop.lp.frequency.value = 900 + 3600 * open;
    if (this.rain <= 0.002 && gg.value < 0.001) { try { this.loop.src.stop(); } catch (e) { /* stopped */ } this.loop = null; }
    if (this.thunderK > 0.5 && Math.random() < dt / 25) s.play('thunder_far');
  }
  // Lightning: somewhere near a player, from the sky to the ground.
  strikeNear() {
    const g = this.g, w = g.world;
    const l = g.locals[Math.floor(Math.random() * g.locals.length)]; if (!l) return;
    const p = l.player, a = Math.random() * TAU, d = 12 + Math.random() * 60;
    const x = Math.floor(p.x + Math.cos(a) * d), z = Math.floor(p.z + Math.sin(a) * d);
    if (!w.isLoaded(x, z) || !this.precipAt(x, 64, z)) return;
    this.strike(x, this.topAt(x, z), z);
  }
  strike(x, y, z) {
    const g = this.g, w = g.world;
    this.flashT = 0.35;
    g.addEntity(new LightningBolt(g, x + 0.5, y, z + 0.5));
    for (const l of g.locals) {
      const d = Math.hypot(l.player.x - x, l.player.z - z);
      setTimeout(() => g.sfx.play(d < 40 ? 'thunder' : 'thunder_far'), Math.min(3000, d * 12));
    }
    // what it hits: burns, and sometimes sets a fire
    for (const e of g.entities) if (e instanceof Mob && e.alive && Math.hypot(e.x - x - 0.5, e.z - z - 0.5) < 3 && Math.abs(e.y - y) < 4) { e.hurt(5, { type: 'lightning', element: 'fire' }); e.burn = Math.max(e.burn, 4); }
    for (const q of g.pawns()) if (!q.dead && Math.hypot(q.x - x - 0.5, q.z - z - 0.5) < 2.5 && Math.abs(q.y - y) < 4) { q.hurt(5, { type: 'lightning' }); if (q.ignite) q.ignite(4); }
    if (g.rules().fireSpread && w.getBlock(x, y, z) === 0 && T_SOLID[w.getBlock(x, y - 1, z)] && Math.random() < 0.6) w.setBlock(x, y, z, B.fire, 0);
  }
}

// A lightning bolt: a jagged chain of glowing boxes from the clouds to the ground, gone in a blink.
class LightningBolt extends Entity {
  // (0.9.0.54) it always runs out, even where the land isn't loaded (far off over the distant terrain, where nothing
  // else moves): before, those bolts stayed in the sky for good
  constructor(game, x, y, z) { super(game, x, y, z); this.t = 0.45; this.seed = Math.floor(Math.random() * 1e6); this.mesh = null; this.alwaysTick = true; }
  update(dt) { this.t -= dt; if (this.t <= 0) this.remove = true; }
  dispose() { if (this.mesh) { freeVAO(this.game.renderer.gl, this.mesh); this.mesh = null; } }   // (0.9.0.54) its mesh freed, not left behind on the GPU
  draws(out) {
    if (this.remove) return;
    if (!this.mesh) {
      const mb = new MeshBuilder(400), r = mulberry32(this.seed), t = tilesOf('white');
      let x = 0, z = 0, y = Math.max(this.y + 70, 150) - this.y;
      while (y > 0) {
        const ny = Math.max(0, y - 2 - r() * 4), nx = x + (r() - 0.5) * 2.4, nz = z + (r() - 0.5) * 2.4, s = 0.09;
        addBox(mb, [Math.min(x, nx) - s, ny, Math.min(z, nz) - s], [Math.max(x, nx) + s, y, Math.max(z, nz) + s], t);
        if (r() < 0.12) { const bx = nx + (r() - 0.5) * 6, bz = nz + (r() - 0.5) * 6; addBox(mb, [Math.min(nx, bx) - 0.05, Math.max(0, ny - 3), Math.min(nz, bz) - 0.05], [Math.max(nx, bx) + 0.05, ny, Math.max(nz, bz) + 0.05], t); }
        x = nx; z = nz; y = ny;
      }
      const res = mb.result(); this.mesh = makeVAO(this.game.renderer.gl, res.verts, res.idx);
    }
    if (Math.sin(this.t * 60) < -0.3) return;   // it flickers
    out.push({ mesh: this.mesh, m: Mat4.create(), px: this.x, py: this.y, pz: this.z, light: [15, 15], unlit: true, tint: [0.75, 0.85, 1, 0.5], noCull: true });
  }
  glow(out) { out.push({ x: this.x, y: this.y + 1, z: this.z, size: 1.2, uv: tileUV(ATLAS.tile.white ?? 0), light: 0xFF }); }
}

// The sky greys and dims while it rains; lightning lights it up.
{
  const baseEnv = Game.prototype.computeEnv;
  Game.prototype.computeEnv = function (dim, fixedT) {
    const e = baseEnv.call(this, dim, fixedT);
    const W = this.weather;
    if (!W || fixedT !== undefined || dim !== DIM.OVERWORLD || (W.rain <= 0 && W.flashT <= 0)) return e;
    const r = W.rain, th = W.thunderK;
    const grey = (c, k) => { const l = (c[0] + c[1] + c[2]) / 3 * (1 - 0.35 * th); return [lerp(c[0], l, k), lerp(c[1], l, k), lerp(c[2], l * 1.05, k)]; };
    e.zenith = grey(e.zenith, 0.75 * r); e.horizon = grey(e.horizon, 0.75 * r); e.fog = grey(e.fog, 0.7 * r);
    e.day *= 1 - 0.28 * r - 0.25 * th;
    e.stars *= 1 - r; e.sunGlow = e.sunGlow.map(v => v * (1 - r));
    e.fogStart = Math.max(0.25, e.fogStart - 0.2 * r);
    if (W.flashT > 0) { const k = Math.min(1, W.flashT / 0.2); e.day = Math.max(e.day, 0.95 * k + e.day * (1 - k)); e.zenith = e.zenith.map(v => lerp(v, 0.9, k * 0.6)); e.horizon = e.horizon.map(v => lerp(v, 0.95, k * 0.6)); }
    e.raining = r;
    return e;
  };
  // rain and snow draw with the particles; lightning with the models
  const baseRender = Game.prototype.renderViews;
  Game.prototype.renderViews = function (dt, R) {
    if (this.weather && this.weather.drops.length && this.dim === DIM.OVERWORLD) {     // (0.9.0.54) only where it's falling
      const pl = this.particles.list, n = pl.length;
      for (const d of this.weather.drops) pl.push(d);
      try { return baseRender.call(this, dt, R); } finally { pl.length = n; }
    }
    return baseRender.call(this, dt, R);
  };
}

// the weather runs alongside the world
{
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    if (!this.weather) this.weather = new Weather(this);
    baseFrame.call(this, dt);
    // (0.9.0.54) split screen across layers: the weather runs with the Overworld's layer when anyone's in it (it was
    // player 1's, so with player 1 down in the Depths the rain stopped for whoever was still up top)
    let run = !this._pass;
    if (this._allLocals && this.ctxs && this.ctxs.size > 1 && this._pass !== 9 && this._allLocals.some(l => l.player.dim === 0)) run = this.dim === 0;
    if (this.inWorld()) { if (run) this.weather.update(dt); }
    else if (this.weather.loop) this.weather.updateSound(dt);
  };
}

// /weather clear | rain | thunder [seconds]
COMMANDS.weather = { usage: '<clear|rain|thunder> [seconds]', desc: 'Change the weather', run(lp, a) {
  const k = (a[0] || '').toLowerCase(), kind = k.startsWith('c') ? 'clear' : k.startsWith('r') ? 'rain' : k.startsWith('t') ? 'thunder' : null;
  if (!kind) usage();
  lp.g.weather.set(kind, Number(a[1]) > 0 ? Number(a[1]) : undefined);
  return 'Weather: ' + kind;
} };
