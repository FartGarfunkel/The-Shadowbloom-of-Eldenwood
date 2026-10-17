// ---------------------------------------------------------------------------
// game/ambientfx.js — the little things that make the world feel alive:
// leaves drifting down from trees, drips from blocks under water or lava,
// dust kicked up when you run, splashes, the flame on a torch you carry, and
// sparkles and smoke from end rods, crying obsidian, spore blossoms, lit
// furnaces and candles. How much you see follows the Particles setting.
// ---------------------------------------------------------------------------

// Leaf colour for each kind of leaves (particles aren't climate-tinted, so they carry their own colour).
const LEAF_PARTICLE = (key) => key.startsWith('cherry') || key.includes('flowering') ? 'leaf_pink' : key.startsWith('birch') || key.startsWith('aspen') ? 'leaf_light'
  : key.startsWith('spruce') || key.startsWith('pine') ? 'leaf_dark' : key.startsWith('dark_oak') || key.startsWith('mangrove') || key.startsWith('jungle') ? 'leaf_deep' : key.startsWith('cloud') ? 'leaf_white' : 'leaf_green';

// Things that burn when you hold them, and the flame they give off.
const FLAME_ITEMS = { torch: 'torch_flame', soul_torch: 'soul_flame', redstone_torch: 'redstone_spark' };
// The top middle of an item's picture, in the flat item mesh's space (-0.5..0.5).
const ICON_TIPS = {};
function iconTip(id) {
  if (id in ICON_TIPS) return ICON_TIPS[id];
  const def = itemDef(id), tile = def && ATLAS.tile[def.icon];
  let res = null;
  if (tile !== undefined && ATLAS.pixels) {
    const tx = (tile % ATLAS_TILES) * TILE, ty = Math.floor(tile / ATLAS_TILES) * TILE, P = ATLAS.pixels.data;
    for (let j = 0; j < TILE && !res; j++) {
      let sum = 0, n = 0;
      for (let i = 0; i < TILE; i++) if (P[((ty + j) * ATLAS_SIZE + tx + i) * 4 + 3] >= 128) { sum += i; n++; }
      if (n) res = [-0.5 + (sum / n + 0.5) / TILE, 0.5 - j / TILE];
    }
  }
  return (ICON_TIPS[id] = res);
}

Object.assign(Game.prototype, {
  particleLevel() { const v = this.settings.particles; return v === undefined ? 2 : v; },
  // which way the breeze carries smoke and leaves (blocks per second, per second)
  windDrift() { const wd = this.wind || { dir: 0, strength: 0.5 }; return [-Math.sin(wd.dir) * wd.strength * 0.35, -Math.cos(wd.dir) * wd.strength * 0.35]; },
  ambientParticles(dt) {
    const w = this.world; if (!w) return;
    const level = this.particleLevel(); if (!level) return;
    this._ambAcc = (this._ambAcc || 0) + dt;
    if (this._ambAcc < 0.05) return;
    const step = this._ambAcc; this._ambAcc = 0;
    const r = Math.random;
    for (const l of this.locals) {
      const p = l.player; if (p.dead) continue;
      // leaves: look around for leaf blocks with open air under them
      // more come loose when the wind gusts, and they're carried further
      const wind = this.wind || { dir: 0, strength: 0.5 }, gust = clamp((wind.strength - 0.45) * 2, 0, 1);
      const tries = (level === 1 ? 30 : 70) * (1 + gust * 1.5);
      for (let i = 0; i < tries; i++) {
        const x = Math.floor(p.x + (r() - 0.5) * 34), y = Math.floor(p.y + r() * 22 - 4), z = Math.floor(p.z + (r() - 0.5) * 34);
        const id = w.getBlock(x, y, z), b = BLOCKS[id];
        if (!b.isLeaves || w.getBlock(x, y - 1, z) !== 0) continue;
        if (r() > step * (3 + gust * 6)) continue;
        const sp = wind.strength * (0.9 + gust * 1.8);
        const wx = -Math.sin(wind.dir) * sp, wz = -Math.cos(wind.dir) * sp;
        const lf = this.light(x, y - 1, z);
        this.particles.add({ x: x + r(), y: y - 0.02, z: z + r(), vx: wx, vy: -0.5 - r() * 0.3, vz: wz, life: 7 + r() * 4, max: 11, size: 0.075 + r() * 0.03,
          uv: tileUV(ATLAS.tile[LEAF_PARTICLE(b.key)] ?? ATLAS.tile.white), light: lf, grav: 0.02, flutter: 1.1 + gust, ph: r() * 6 });
      }
      // on open ground in a strong wind, a few leaves tumble along the grass
      if (gust > 0.3 && r() < step * gust * 3) {
        const x = Math.floor(p.x + (r() - 0.5) * 20), z = Math.floor(p.z + (r() - 0.5) * 20), y = Math.floor(p.y) + 1;
        if (w.getBlock(x, y, z) === 0 && T_SOLID[w.getBlock(x, y - 1, z)] || w.getBlock(x, y - 1, z) === 0 && T_SOLID[w.getBlock(x, y - 2, z)]) {
          const yy = w.getBlock(x, y - 1, z) === 0 ? y - 1 : y;
          this.particles.add({ x: x + r(), y: yy + 0.1, z: z + r(), vx: -Math.sin(wind.dir) * 2.5, vy: 0.6, vz: -Math.cos(wind.dir) * 2.5, life: 4, max: 4, size: 0.07, uv: tileUV(ATLAS.tile.leaf_green ?? ATLAS.tile.white), light: this.light(x, yy, z), grav: 2.5, flutter: 1.5, ph: r() * 6 });
        }
      }
      // drips from the underside of blocks that hold water or lava above them
      for (let i = 0; i < 0; i++) {   // (drips are now found while meshing: game/particles2.js)
        const x = Math.floor(p.x + (r() - 0.5) * 22), y = Math.floor(p.y + r() * 14 - 3), z = Math.floor(p.z + (r() - 0.5) * 22);
        const id = w.getBlock(x, y, z);
        if (!T_SOLID[id] || !T_OPAQUE[id] || w.getBlock(x, y - 1, z) !== 0) continue;
        const above = T_LIQUID[w.getBlock(x, y + 1, z)];
        if (!above || r() > step * 1.4) continue;
        this.particles.add({ x: x + 0.15 + r() * 0.7, y: y - 0.03, z: z + 0.15 + r() * 0.7, vx: 0, vy: -0.05, vz: 0, life: 2.4, max: 2.4, size: 0.04,
          uv: tileUV(ATLAS.tile[above === 1 ? 'drip_water' : 'drip_lava'] ?? ATLAS.tile.white), light: above === 2 ? 0xFF : this.light(x, y - 1, z), grav: 9, hang: 0.5 + r() * 0.8 });
      }
      // the flame on a torch in either hand (first person)
      if (l.cam && l.mode !== 'dead') this.handFlames(l, step);
      // seen from outside (third person, or by the other players in split-screen): the torch's flame
      // in their hand, and a trail of smoke behind it as they move
      if ((l.viewMode || this.locals.length > 1) && l.mode !== 'dead') this.carriedFlames(l, step);
    }
  },
  light(x, y, z) { return this.world.getLight(x, y, z); },
  // Torches held in a hand give off a flickering flame and a wisp of smoke at their tip. The tip is
  // found in hand space (the hand is drawn with its own 70° lens), then carried into the world so the
  // flame sits on the torch on screen, and trails behind as you move.
  handFlames(l, step) {
    const p = l.player, cam = l.cam;
    if (!l._tips || !l._tips.length || l.viewMode) return;
    const k = Math.tan((cam.fov || 70) * Math.PI / 360) / Math.tan(35 * Math.PI / 180);
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const fx = -sy * cp, fy = sp, fz = -cy * cp;          // forward
    const rx = cy, rz = -sy;                               // right
    const ux = sy * sp, uy = cp, uz = cy * sp;              // up
    for (const tip of l._tips) {
      if (this.time - tip.t > 0.5 || Math.random() > step * 16) continue;
      const lx = tip.v[0] * k, ly = tip.v[1] * k + 0.012, lz = -tip.v[2];
      const x = cam.x + rx * lx + ux * ly + fx * lz, y = cam.y + uy * ly + fy * lz, z = cam.z + rz * lx + uz * ly + fz * lz;
      const tile = FLAME_ITEMS[tip.id];
      this.particles.add({ x: x + (Math.random() - 0.5) * 0.008, y, z: z + (Math.random() - 0.5) * 0.008, vx: 0, vy: 0.12, vz: 0, life: 0.3, max: 0.3, size: 0.016, uv: tileUV(ATLAS.tile[tile] ?? ATLAS.tile.white), light: 0xFF, grav: 0, shrink: true, size0: 0.019 });
      if (tile !== 'redstone_spark' && Math.random() < 0.55) this.particles.add({ x, y: y + 0.02, z, vx: 0, vy: 0.22, vz: 0, life: 1.2, max: 1.2, size: 0.014, size0: 0.014, grow: 1.5, uv: tileUV(ATLAS.tile.smoke_puff ?? ATLAS.tile.smoke ?? 0), light: 0xFF, grav: -0.06, rise: true });
    }
  },
  carriedFlames(l, step) {
    const p = l.player, inv = p.inv;
    const spots = [];
    const lit = (st) => st && FLAME_ITEMS[st.id];
    const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw), fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    if (lit(inv.held) && !p.carrying) spots.push([0.36, 0.32, 1.28, inv.held.id]);
    if (lit(inv.offhand)) spots.push([-0.36, 0.32, 1.28, inv.offhand.id]);
    if (lit(inv.hook.slots[0])) spots.push(inv.back.slots[0] ? [0.3, 0.25, 1.15, inv.hook.slots[0].id] : [0.32, -0.05, 0.8, inv.hook.slots[0].id]);
    if (!spots.length) return;
    const speed = Math.hypot(p.vx || 0, p.vz || 0), rate = 4 + speed * 2.5;
    for (const [side, fwd, up, id] of spots) {
      if (Math.random() > step * rate) continue;
      const x = p.x + rx * side + fx * fwd, y = p.y + up - (p.sneaking ? 0.2 : 0), z = p.z + rz * side + fz * fwd;
      const tile = FLAME_ITEMS[id];
      this.particles.add({ x, y, z, vx: 0, vy: 0.05, vz: 0, life: 0.35, max: 0.35, size: 0.04, size0: 0.04, shrink: true, uv: tileUV(ATLAS.tile[tile === 'flame' ? 'torch_flame' : tile] ?? ATLAS.tile.flame), light: 0xFF, grav: 0 });
      if (tile !== 'redstone_spark' && Math.random() < 0.7) this.particles.add({ x, y: y + 0.08, z, vx: 0, vy: 0.3, vz: 0, life: 1.3, max: 1.3, size: 0.03, size0: 0.03, grow: 1.6, uv: tileUV(ATLAS.tile.smoke_puff ?? ATLAS.tile.smoke ?? 0), light: 0xFF, grav: -0.05, rise: true });
    }
  },
  // Dust from your feet when you run (and a little when you walk), like the classic game.
  footDust(p, speed) {
    const level = this.particleLevel(); if (!level) return;
    const w = this.world, x = Math.floor(p.x), y = Math.floor(p.y - 0.2), z = Math.floor(p.z);
    const id = w.getBlock(x, y, z); if (!id || !T_SOLID[id]) return;
    const n = speed > WALK + 0.5 ? (level === 1 ? 1 : 2) : (Math.random() < 0.25 ? 1 : 0);
    if (n) this.burst(p.x - p.vx * 0.05, p.y + 0.08, p.z - p.vz * 0.05, BLOCKS[id].key, n, 0.18, 9);
  },
  splash(x, y, z, big) {
    const n = big ? 22 : 10;
    for (let i = 0; i < n * (this.particleLevel() === 1 ? 0.5 : 1); i++) {
      const a = Math.random() * TAU, s = 0.8 + Math.random() * (big ? 2.4 : 1.4);
      this.particles.add({ x: x + Math.cos(a) * 0.3, y: y + 0.05, z: z + Math.sin(a) * 0.3, vx: Math.cos(a) * s, vy: 2 + Math.random() * (big ? 3.5 : 2), vz: Math.sin(a) * s, life: 0.8, max: 0.8, size: 0.05, uv: tileUV(ATLAS.tile.splash ?? ATLAS.tile.white), light: 0xF0, grav: 12 });
    }
  },
});

// ---- screenshots (F2) ------------------------------------------------------------------------------
Object.assign(Game.prototype, {
  screenshot(lp) { this._shotReq = lp; },
  // Called straight after a frame is drawn, while the picture is still in the canvas.
  async saveScreenshot(lp) {
    let url;
    try { url = this.canvas.toDataURL('image/png'); } catch (e) { lp.toast('Could not take a screenshot here', 'warn'); return; }
    const d = new Date(), pad = (n) => String(n).padStart(2, '0');
    const name = `emberwild-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}.${pad(d.getMinutes())}.${pad(d.getSeconds())}.png`;
    this.sfx.play('click');
    try {
      if (window.claude && window.claude.use) {
        const dl = await window.claude.use('downloads').catch(() => null);
        if (dl && dl.save) { const blob = await (await fetch(url)).blob(); await dl.save({ filename: name, data: blob, mimeType: 'image/png' }); lp.toast('Screenshot saved: ' + name, 'good'); return; }
      }
    } catch (e) { /* fall back to a plain download */ }
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    lp.toast('Screenshot saved: ' + name, 'good');
  },
});
