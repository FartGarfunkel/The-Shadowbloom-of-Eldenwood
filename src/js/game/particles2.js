// ---------------------------------------------------------------------------
// game/particles2.js — 0.8.6.2: particles more like the classic game and the
// particle mods people add to it.
//
// Every lit torch now burns: a steady little flame on its tip that flickers
// between two shapes and breathes in size, with sparks now and then and its
// thread of smoke. Gusts of wind show: thin strokes sweep past on open ground,
// sand and snow lift off the ground in the strong ones, and the wind's roar
// swells with them. Warm nights have fireflies over the grass, ash and embers
// drift through the Ember Depths, and motes of silt hang in the water.
// ---------------------------------------------------------------------------

// ---- pictures ------------------------------------------------------------------------------------
{
  const base = paintDokuBlocks4;
  paintDokuBlocks4 = function () {
    base();
    const H = hexRGB;
    // the flame's second shape: leaning the other way and a little taller, so it flickers
    addTile('torch_flame2', p => p.art(['................', '........Y.......', '........YY......', '.......YOY......', '.......YOOY.....', '......YOOOY.....', '......YOWOY.....', '.....YOWWOY.....',
      '.....OOWWWOY....', '....YOWWWWO.....', '....OWWWWWO.....', '.....OWWWO......', '......OOO.......', '................', '................', '................'], { Y: H('#ffc83a'), O: H('#ff8a1a'), W: H('#fff4c8') }));
    // a stroke of wind: thin, ragged at the ends
    addTile('wind_streak', p => {
      for (let x = 0; x < 16; x++) {
        const k = Math.sin(Math.PI * (x + 0.5) / 16);
        if (k > 0.2) p.set(x, 7, H('#ffffff'), 235);
        if (k > 0.55 && x % 4 !== 1) p.set(x, 8, H('#e4eef8'), 220);
      }
    });
    addTile('firefly', p => { for (const [x, y, c] of [[7, 7, '#fffbd0'], [8, 7, '#fffbd0'], [7, 8, '#fffbd0'], [8, 8, '#fffbd0'], [6, 7, '#d8f070'], [9, 8, '#d8f070'], [7, 6, '#d8f070'], [8, 9, '#d8f070'], [6, 8, '#b8e050'], [9, 7, '#b8e050']]) p.set(x, y, H(c)); });
    addTile('ash_flake', p => { for (const [x, y] of [[7, 7], [8, 7], [7, 8], [8, 8], [9, 8]]) p.set(x, y, shade(H('#8a8a8a'), 0.85 + p.rand() * 0.3)); });
    addTile('ember_spark', p => { for (const [x, y, c] of [[7, 7, '#fff0a0'], [8, 7, '#ffb030'], [7, 8, '#ff8a1a'], [8, 8, '#ffd060']]) p.set(x, y, H(c)); });
    addTile('water_speck', p => { for (const [x, y] of [[7, 7], [8, 8]]) p.set(x, y, H('#c8dcd0'), 220); });
  };
}

// ---- the torch flames ------------------------------------------------------------------------------
const P2 = { flames: [], pool: [] };
// where the flame sits on each torch in a chunk (worked out again when the chunk's emitters change)
function torchTips(ch) {
  if (ch._tipsFor === ch.emitters) return ch._tips;
  const out = [];
  for (const [lx, y, lz, id, meta] of ch.emitters || []) {
    const d = BLOCKS[id];
    if (!d || d.render !== RENDER.TORCH || d.rs) continue;
    const x = ch.cx * 16 + lx, z = ch.cz * 16 + lz;
    // the tip of the stick, worked out the way the torch is built (world/mesher.js emitTorch)
    let tx = x + 0.5, tz = z + 0.5, ty = y + 10 / 16;
    if (meta >= 1 && meta <= 4) {
      const wx = meta === 1 ? 1 : meta === 2 ? -1 : 0, wz = meta === 3 ? 1 : meta === 4 ? -1 : 0, L = 10 / 16;
      tx = x + 0.5 - wx * (0.5 - 1.6 / 16) + wx * L * Math.sin(TORCH_LEAN); tz = z + 0.5 - wz * (0.5 - 1.6 / 16) + wz * L * Math.sin(TORCH_LEAN);
      ty = y + 3.5 / 16 + L * Math.cos(TORCH_LEAN);
    } else if (T_SHAPE[ch.get(lx, y - 1, lz)] === SHAPE.SLAB && (ch.meta[((y - 1) << 8) | (lz << 4) | lx] & 7) === 0) ty -= 0.5;
    out.push([tx, ty, tz, id === B.soul_torch ? 1 : 0, (hash32(x, y, z, 77) & 1023) / 97]);
  }
  ch._tipsFor = ch.emitters; ch._tips = out;
  return out;
}
{
  const baseRender = Game.prototype.renderViews;
  Game.prototype.renderViews = function (dt, R) {
    const w = this.world, parts = this.settings.particles ?? 2;
    if (!w || !parts || !this.locals.length || !ATLAS.tile.torch_flame) return baseRender.call(this, dt, R);
    const pl = this.particles.list, n = pl.length, t = this.time, pool = P2.pool;
    let k = 0;
    const uvA = tileUV(ATLAS.tile.torch_flame), uvB = tileUV(ATLAS.tile.torch_flame2 ?? ATLAS.tile.torch_flame), uvS = tileUV(ATLAS.tile.soul_flame ?? ATLAS.tile.torch_flame);
    const near = this.locals.map(l => l.player);
    for (const ch of w.chunks.values()) {
      if (!ch.emitters || !ch.emitters.length) continue;
      const cx = ch.cx * 16 + 8, cz = ch.cz * 16 + 8;
      if (!near.some(p => Math.abs(cx - p.x) < 40 && Math.abs(cz - p.z) < 40)) continue;
      for (const [x, y, z, soul, h] of torchTips(ch)) {
        if (!near.some(p => Math.abs(x - p.x) < 32 && Math.abs(z - p.z) < 32 && Math.abs(y - p.y) < 24)) continue;
        const f = pool[k] || (pool[k] = { light: 0xFF });
        k++;
        const ph = t * 6 + h, frame = Math.floor(ph + Math.sin(ph * 1.9) * 0.6) & 1;
        f.x = x + Math.sin(t * 11 + h) * 0.006; f.z = z + Math.cos(t * 9 + h) * 0.006;
        f.size = 0.072 + Math.sin(t * 23 + h * 3) * 0.007 + Math.sin(t * 37 + h) * 0.005;
        f.y = y + f.size * 0.3;               // the flame's foot sits on the tip of the stick
        f.uv = soul ? uvS : frame ? uvB : uvA;
        pl.push(f);
      }
    }
    try { return baseRender.call(this, dt, R); } finally { pl.length = n; }
  };
}

// ---- wind, fireflies, ash, silt ----------------------------------------------------------------------
{
  // fireflies wink on and off
  const baseUpdate = Particles.prototype.update;
  Particles.prototype.update = function (dt, world) {
    baseUpdate.call(this, dt, world);
    for (const p of this.list) if (p.blink) p.size = p.size0 * (Math.sin(p.life * p.blink + p.ph) > -0.2 ? 1 : 0.25);
  };
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    baseFrame.call(this, dt);
    if (this.state !== 'playing' || !this.world || !this.locals.length) return;
    try { particleWeather(this, Math.min(dt, 0.1)); } catch (e) { if (!P2.warned) { P2.warned = true; console.warn('particles', e); } }
  };
}
function particleWeather(g, dt) {
  const parts = g.settings.particles ?? 2;
  if (!parts) return;
  const w = g.world, W = g.wind, r = Math.random, L = g.particles.list;
  const gust = W ? clamp(W.gust / 0.35, 0, 1) : 0;
  const amount = parts === 1 ? 0.45 : 1;
  // the gust's whoosh as it arrives
  if (W) { if (gust > 0.6 && !P2.gusting) { P2.gusting = true; P2.gustSound = true; } else if (gust < 0.3) P2.gusting = false; }
  for (const l of g.locals) {
    const p = l.player;
    if (p.dead) continue;
    const head = w.getLight(Math.floor(p.x), Math.floor(p.y + 1.6), Math.floor(p.z)), sky = head >> 4;
    const open = (g.dim === DIM.OVERWORLD || g.dim === DIM.SKYLANDS) && sky >= 13;
    if (P2.gustSound && open && g.sfx) g.sfx.play('gust');
    // strokes of wind sweeping past on open ground
    if (W && open && gust > 0.05) {
      const dx = -Math.sin(W.dir), dz = -Math.cos(W.dir), sp = 7 + gust * 6;
      let n = gust * 45 * amount * dt;
      while (n > r()) {
        n -= 1;
        const x = p.x + (r() - 0.5) * 24 - dx * 8, z = p.z + (r() - 0.5) * 24 - dz * 8, y = p.y + r() * 6 - 1;
        const lt = w.getLight(Math.floor(x), Math.floor(y), Math.floor(z));
        if ((lt >> 4) < 14 || T_SOLID[w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))]) continue;
        const life = 0.5 + r() * 0.6;
        g.particles.add({ x, y, z, vx: dx * sp, vy: (r() - 0.5) * 0.4, vz: dz * sp, life, max: life, size: 0.05, streak: 0.6 + r() * 0.8, sdx: dx, sdy: 0, sdz: dz, uv: tileUV(ATLAS.tile.wind_streak ?? ATLAS.tile.white), light: lt, grav: 0 });
      }
      // sand and snow lifted off the ground in the strong ones
      if (gust > 0.5) {
        let m = (gust - 0.5) * 30 * amount * dt;
        while (m > r()) {
          m -= 1;
          const x = Math.floor(p.x + (r() - 0.5) * 16), z = Math.floor(p.z + (r() - 0.5) * 16);
          const ch = w.chunkAt(x >> 4, z >> 4); if (!ch) continue;
          let y = Math.min(CH - 1, Math.floor(p.y) + 4);
          while (y > Math.floor(p.y) - 6 && !w.getBlock(x, y, z)) y--;
          const id = w.getBlock(x, y, z), key = BLOCKS[id] && BLOCKS[id].key;
          if (!key || !/sand$|^snow|snow_layer|powder_snow|^red_sand/.test(key)) continue;
          const lt = w.getLight(x, y + 1, z);
          for (let i = 0; i < 3; i++) {
            const life = 0.8 + r() * 0.8, u = tileUV(BLOCK_FACES[id][2]), sub = 0.25, ox = r() * (1 - sub), oy = r() * (1 - sub), du = u[2] - u[0], dv = u[3] - u[1];
            g.particles.add({ x: x + r(), y: y + 1.05, z: z + r(), vx: dx * (3 + r() * 3), vy: 0.6 + r() * 0.8, vz: dz * (3 + r() * 3), life, max: life, size: 0.03 + r() * 0.02,
              uv: [u[0] + ox * du, u[1] + oy * dv, u[0] + (ox + sub) * du, u[1] + (oy + sub) * dv], light: lt, grav: 1.2 });
          }
        }
      }
    }
    // fireflies over the grass on warm nights
    if (g.dim === DIM.OVERWORLD && sky >= 12 && (g.env.day ?? 1) < 0.3 && !(g.weather && g.weather.rain > 0.3)) {
      let n = 1.6 * amount * dt;
      if (P2.flies === undefined || (P2.fliesT = (P2.fliesT || 0) - dt) <= 0) { P2.fliesT = 1; P2.flies = L.reduce((a, q) => a + (q.blink ? 1 : 0), 0); }
      while (n > r() && P2.flies < 26) {
        n -= 1;
        const x = Math.floor(p.x + (r() - 0.5) * 20), z = Math.floor(p.z + (r() - 0.5) * 20);
        let y = Math.min(CH - 1, Math.floor(p.y) + 5);
        while (y > Math.floor(p.y) - 6 && !T_SOLID[w.getBlock(x, y, z)] && !T_LIQUID[w.getBlock(x, y, z)]) y--;
        const id = w.getBlock(x, y, z);
        if (id !== B.grass && id !== B.mud && id !== B.moss_block) continue;
        const col = g.world.gen && g.world.gen.column ? g.world.gen.column(x, z) : null;
        if (col && col.temp !== undefined && col.temp < -0.2) continue;
        const life = 4 + r() * 4;
        g.particles.add({ x: x + r(), y: y + 1.3 + r() * 1.5, z: z + r(), vx: (r() - 0.5) * 0.3, vy: (r() - 0.5) * 0.12, vz: (r() - 0.5) * 0.3, life, max: life, size: 0.03, size0: 0.03,
          uv: tileUV(ATLAS.tile.firefly ?? ATLAS.tile.white), light: 0xFF, grav: 0, flutter: 0.35, ph: r() * 6, blink: 3 + r() * 3 });
        P2.flies++;
      }
    }
    // the Ember Depths: ash drifting down, embers drifting up
    if (g.dim === DIM.DEPTHS) {
      let n = 7 * amount * dt;
      while (n > r()) {
        n -= 1;
        const ember = r() < 0.25, x = p.x + (r() - 0.5) * 18, z = p.z + (r() - 0.5) * 18, y = p.y + (ember ? -3 : 1) + r() * 7;
        if (T_SOLID[w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))]) continue;
        const life = ember ? 1.5 + r() * 1.5 : 4 + r() * 3;
        g.particles.add({ x, y, z, vx: (r() - 0.5) * 0.3, vy: ember ? 0.5 + r() * 0.5 : -0.25 - r() * 0.2, vz: (r() - 0.5) * 0.3, life, max: life, size: ember ? 0.02 : 0.03,
          size0: ember ? 0.02 : 0.03, shrink: ember, uv: tileUV(ATLAS.tile[ember ? 'ember_spark' : 'ash_flake'] ?? ATLAS.tile.white), light: ember ? 0xFF : w.getLight(Math.floor(x), Math.floor(y), Math.floor(z)), grav: 0, flutter: ember ? 0.2 : 0.5, ph: r() * 6 });
      }
    }
    // silt hanging in the water around you
    if (p.contacts && p.contacts.eyeWater) {
      let n = 6 * amount * dt;
      while (n > r()) {
        n -= 1;
        const x = p.x + (r() - 0.5) * 7, y = p.y + p.eye + (r() - 0.5) * 4, z = p.z + (r() - 0.5) * 7;
        if (!T_LIQUID[w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))]) continue;
        const life = 2 + r() * 2;
        g.particles.add({ x, y, z, vx: (r() - 0.5) * 0.08, vy: -0.03, vz: (r() - 0.5) * 0.08, life, max: life, size: 0.02, uv: tileUV(ATLAS.tile.water_speck ?? ATLAS.tile.white), light: w.getLight(Math.floor(x), Math.floor(y), Math.floor(z)), grav: 0 });
      }
    }
  }
  P2.gustSound = false;
}
SND_FX.gust = [2.4, 0.5, (b, v, r) => {
  // air rushing past: a broad band of noise that swells and sweeps up, with a rough edge
  b.noise(0, 2.3, 'bp', 260 + r() * 80, 0.6, 0.7, { att: 0.9, sweep: 2.4, brown: true });
  b.noise(0.3, 1.8, 'bp', 900 + r() * 300, 0.8, 0.25, { att: 0.7, sweep: 1.6 });
  b.noise(0.5, 1.5, 'hp', 3200, 0.7, 0.08, { att: 0.6 });
}];

// ---- drips, slime, poofs and crits ------------------------------------------------------------------------
// Drips form under any block with water or lava on top of it (and under leaves while it rains), hang a
// moment, fall, and splash (water) or leave a little glowing spot (lava). Slimes leave a splat of slime
// where they land, which slowly dries up. Creatures go up in a poof when they die, and critical hits throw
// out stars.
{
  const base = paintDokuBlocks4;
  paintDokuBlocks4 = function () {
    base();
    const H = hexRGB;
    const blob = (name, c0, c1, hi) => addTile(name, p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 4.2) p.set(x, y, H(d < 2 && x < 8 && y < 8 ? hi : d < 3.2 ? c0 : c1)); } });
    blob('slime_blob', '#7ad05a', '#4a9a3a', '#c8f0b0');
    blob('magma_blob', '#ff8a2a', '#b8401a', '#ffe08a');
    // a splat lying on the ground: an uneven blot, darker at the rim
    const splat = (name, c0, c1) => addTile(name, p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const a = Math.atan2(y - 7.5, x - 7.5), rr = 5.2 + Math.sin(a * 3 + 1) * 1.2 + Math.sin(a * 5) * 0.7, d = Math.hypot(x - 7.5, y - 7.5); if (d < rr) p.set(x, y, shade(H(d > rr - 1.3 ? c1 : c0), 0.9 + p.rand() * 0.2)); } for (const [x, y] of [[2, 3], [13, 11], [12, 2]]) p.set(x, y, H(c0)); });
    splat('slime_splat', '#6cc04e', '#3e8a32');
    splat('magma_splat', '#ff7a1a', '#8a2a0a');
    addTile('drip_honey', p => { for (let y = 4; y < 13; y++) for (let x = 5; x < 11; x++) { const d = Math.hypot((x - 7.5) * 1.1, (y - 9) * (y < 9 ? 0.6 : 1)); if (d < 3.2) p.set(x, y, H(d < 1.4 && y < 9 ? '#fff0a0' : '#e8a020')); } });
    addTile('honey_spot', p => { for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) if (Math.hypot(x - 7.5, y - 7.5) < 3.4) p.set(x, y, H(Math.hypot(x - 6.5, y - 6.5) < 1.2 ? '#ffe070' : '#d89018')); });
    addTile('pollen', p => { for (const [x, y, c] of [[7, 7, '#ffe84a'], [8, 7, '#ffd020'], [7, 8, '#ffd020'], [8, 8, '#f0b818']]) p.set(x, y, H(c)); });
    addTile('lava_spot', p => { for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) if (Math.hypot(x - 7.5, y - 7.5) < 2.8) p.set(x, y, H(Math.hypot(x - 7, y - 7) < 1.3 ? '#ffe08a' : '#ff7a1a')); });
    addTile('poof', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) + Math.sin(x * 1.3 + y * 0.9) * 0.8; if (d < 6.3) p.set(x, y, shade(H(d < 3.5 ? '#f4f4f4' : '#c8c8c8'), 0.92 + p.rand() * 0.12)); } });
    addTile('crit_star', p => { for (let i = 4; i < 12; i++) { p.set(i, 7, H('#fff4c0')); p.set(7, i, H('#fff4c0')); } for (const [x, y] of [[6, 6], [8, 8], [6, 8], [8, 6], [7, 7]]) p.set(x, y, H('#ffffff')); for (const [x, y] of [[5, 5], [9, 9], [5, 9], [9, 5]]) p.set(x, y, H('#ffd84a')); });
  };
}
function p2Splash(g, x, y, z, light, n = 3) {
  for (let i = 0; i < n; i++) g.particles.add({ x, y: y + 0.03, z, vx: (Math.random() - 0.5) * 1.2, vy: 1 + Math.random() * 0.8, vz: (Math.random() - 0.5) * 1.2, life: 0.3, max: 0.3, size: 0.025, uv: tileUV(ATLAS.tile.rain_splash ?? ATLAS.tile.white), light, grav: 9 });
}
function critStars(g, e) {
  if (!(g.settings.particles ?? 2)) return;
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * TAU, s = 2 + Math.random() * 2.5;
    g.particles.add({ x: e.x, y: e.y + e.h * 0.6, z: e.z, vx: Math.cos(a) * s, vy: 1 + Math.random() * 2.5, vz: Math.sin(a) * s, life: 0.5, max: 0.5, size: 0.06, size0: 0.06, shrink: true, uv: tileUV(ATLAS.tile.crit_star ?? ATLAS.tile.white), light: 0xFF, grav: 6 });
  }
}
{
  const baseUpdate = Particles.prototype.update;
  Particles.prototype.update = function (dt, world) {
    baseUpdate.call(this, dt, world);
    const g = P2.g;
    for (const p of this.list) {
      if (p.drip) {
        if (p.vy < -1) p.fell = true;
        else if (p.fell && p.vy === 0 && p.life > 0.01) {
          // it landed
          p.life = 0.001;
          if (!g) continue;
          if (p.drip === 4) {
            const life = 2 + Math.random();
            g.particles.add({ x: p.x, y: Math.floor(p.y) + 0.015, z: p.z, vx: 0, vy: 0, vz: 0, life, max: life, size: 0.06, size0: 0.06, dry: 0.8, flat: true, uv: tileUV(ATLAS.tile.honey_spot ?? ATLAS.tile.white), light: p.light, grav: 0 });
          } else if (p.drip === 2) {
            const life = 1 + Math.random() * 0.8;
            g.particles.add({ x: p.x, y: Math.floor(p.y) + 0.02, z: p.z, vx: 0, vy: 0, vz: 0, life, max: life, size: 0.07, size0: 0.07, shrink: true, flat: true, uv: tileUV(ATLAS.tile.lava_spot ?? ATLAS.tile.white), light: 0xFF, grav: 0 });
          } else p2Splash(g, p.x, Math.floor(p.y), p.z, p.light, 2 + (Math.random() < 0.5 ? 1 : 0));
        }
      }
      if (p.dry) p.size = p.size0 * Math.min(1, p.life / p.dry);     // a splat drying up at the end
    }
  };
}
function p2Drips(g, dt) {
  const parts = g.settings.particles ?? 2;
  if (!parts) return;
  const w = g.world, r = Math.random, k = parts === 1 ? 0.5 : 1, W = g.weather;
  const raining = W && W.rain > 0.3;
  let leafBudget = 12;
  for (const ch of w.chunks.values()) {
    const D = ch.drips;
    if (!D || !D.length) continue;
    const cx = ch.cx * 16 + 8, cz = ch.cz * 16 + 8;
    const L = g.locals.find(l => Math.abs(cx - l.player.x) < 30 && Math.abs(cz - l.player.z) < 30);
    if (!L) continue;
    const P = L.player;
    for (let di = 0; di < D.length; di++) {
      const e = D[di], kind = e[3];
      if (kind === 3 && !raining) continue;
      const rate = kind === 1 ? 0.35 : kind === 2 ? 0.22 : kind === 4 ? 0.3 : 0.18;
      if (r() > rate * k * dt) continue;
      const lx = e[0], y = e[1], lz = e[2], x = ch.cx * 16 + lx, z = ch.cz * 16 + lz;
      if (Math.abs(y - P.y) > 20 || Math.abs(x - P.x) > 24 || Math.abs(z - P.z) > 24) continue;
      if (kind === 3) {
        if (leafBudget-- <= 0 || (w.getLight(x, y - 1, z) >> 4) < 13 || W.precipAt(x, y, z) !== 'rain') continue;
      } else if (w.getBlock(x, y - 1, z) !== 0) continue;
      const lava = kind === 2, honey = kind === 4;
      g.particles.add({ x: x + 0.15 + r() * 0.7, y: y - 0.03, z: z + 0.15 + r() * 0.7, vx: 0, vy: -0.05, vz: 0, life: 4, max: 4, size: honey ? 0.045 : 0.04,
        uv: tileUV(ATLAS.tile[lava ? 'drip_lava' : honey ? 'drip_honey' : 'drip_water'] ?? ATLAS.tile.white), light: lava ? 0xFF : w.getLight(x, y - 1, z), grav: honey ? 6 : 9,
        hang: kind === 3 ? 0.1 + r() * 0.3 : honey ? 1 + r() * 1.5 : 0.6 + r() * 1.2, drip: lava ? 2 : honey ? 4 : 1 });
    }
  }
}
{
  // slimes splat where they land; creatures go up in a poof
  const base = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    const wasGround = this.onGround, wasAlive = this.alive;
    const r = base.apply(this, arguments);
    const g = this.game;
    if (!g || !(g.settings.particles ?? 2)) return r;
    if ((this.type === 'slime' || this.type === 'magma_slime') && this.alive) {
      if (!this.onGround) this._airT = (this._airT || 0) + dt;
      else if (!wasGround && (this._airT || 0) > 0.12) { this._airT = 0; slimeSplat(g, this); }
      else this._airT = 0;
    }
    if (!wasAlive && this.remove && !this._poofed) {
      this._poofed = true;
      for (let i = 0; i < 8; i++) {
        const life = 0.5 + Math.random() * 0.4;
        g.particles.add({ x: this.x + (Math.random() - 0.5) * this.w * 2, y: this.y + Math.random() * this.h, z: this.z + (Math.random() - 0.5) * this.w * 2, vx: (Math.random() - 0.5) * 0.6, vy: 0.3 + Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.6,
          life, max: life, size: 0.12, size0: 0.12, grow: 0.8, uv: tileUV(ATLAS.tile.poof ?? ATLAS.tile.white), light: g.world.getLight(Math.floor(this.x), Math.floor(this.y + 0.5), Math.floor(this.z)), grav: 0 });
      }
    }
    return r;
  };
}
function slimeSplat(g, m) {
  const magma = m.type === 'magma_slime', s = Math.max(0.3, m.w), w = g.world;
  const lt = magma ? 0xFF : w.getLight(Math.floor(m.x), Math.floor(m.y + 0.2), Math.floor(m.z));
  for (let i = 0, n = Math.round(6 + s * 8); i < n; i++) {
    const a = Math.random() * TAU, sp = 1 + Math.random() * 1.5 * s, life = 0.5 + Math.random() * 0.4;
    g.particles.add({ x: m.x + Math.cos(a) * s * 0.6, y: m.y + 0.15, z: m.z + Math.sin(a) * s * 0.6, vx: Math.cos(a) * sp, vy: 1.2 + Math.random() * 1.8, vz: Math.sin(a) * sp, life, max: life, size: 0.04 + s * 0.04, uv: tileUV(ATLAS.tile[magma ? 'magma_blob' : 'slime_blob'] ?? ATLAS.tile.white), light: lt, grav: 10 });
  }
  // and a splat left behind on the ground, that slowly dries up
  const below = w.getBlock(Math.floor(m.x), Math.floor(m.y - 0.1), Math.floor(m.z));
  if (!T_SOLID[below]) return;
  const life = 4 + Math.random() * 3;
  g.particles.add({ x: m.x + (Math.random() - 0.5) * 0.2, y: Math.floor(m.y + 0.01) + 0.012 + Math.random() * 0.004, z: m.z + (Math.random() - 0.5) * 0.2, vx: 0, vy: 0, vz: 0, life, max: life, size: s * 0.75, size0: s * 0.75, dry: 1.5, flat: true,
    uv: tileUV(ATLAS.tile[magma ? 'magma_splat' : 'slime_splat'] ?? ATLAS.tile.white), light: lt, grav: 0 });
}
{
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    baseFrame.call(this, dt);
    P2.g = this;
    if (this.state !== 'playing' || !this.world || !this.locals.length) return;
    try { p2Drips(this, Math.min(dt, 0.1)); } catch (e) { if (!P2.warned2) { P2.warned2 = true; console.warn('drips', e); } }
  };
}
