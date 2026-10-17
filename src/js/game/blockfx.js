// ---------------------------------------------------------------------------
// game/blockfx.js — blocks with a life of their own: sand and gravel that
// fall, concrete powder that sets in water, TNT, fire from flint and steel,
// sleeping through the night, and the smoke, sparks and motes that torches,
// campfires and portals give off.
// ---------------------------------------------------------------------------

// A block in mid-air (sand, gravel, concrete powder). Lands where it stops.
class FallingBlock extends Entity {
  constructor(game, x, y, z, id, meta) {
    super(game, x + 0.5, y, z + 0.5);
    this.id = game.nextEntityId++; this.block = id; this.meta = meta; this.w = 0.49; this.h = 0.98; this.stepHeight = 0;
  }
  update(dt) {
    const g = this.game, w = g.world;
    this.age += dt;
    this.vy = Math.max(-40, this.vy - 28 * dt);
    moveEntity(w, this, dt);
    if (this.onGround || this.age > 20) {
      this.remove = true;
      const x = Math.floor(this.x), y = Math.floor(this.y + 0.3), z = Math.floor(this.z);
      const cur = w.getBlock(x, y, z);
      if (cur === 0 || T_REPLACEABLE[cur]) {
        if (cur && !T_LIQUID[cur]) g.dropBlockItems(x, y, z, cur, true);
        w.setBlock(x, y, z, this.block, this.meta);
        g.sfx.playAt(BLOCKS[this.block].sound === 'sand' ? 'thud' : 'thud', x, y, z);
        g.checkHarden(x, y, z);
      } else g.dropItem(mkStack(BLOCKS[this.block].key, 1), this.x, this.y + 0.5, this.z, true);
    }
  }
  draws(out) {
    const im = itemMesh(this.game.renderer.gl, BLOCKS[this.block].key);
    const m = Mat4.create(); Mat4.translate(m, 0, 0.5, 0);
    out.push({ mesh: im.mesh, m, px: this.x, py: this.y, pz: this.z, light: this.lightAt(0.5) });
  }
}

// Lit TNT: flashes, then goes off.
class PrimedTNT extends Entity {
  constructor(game, x, y, z, fuse) {
    super(game, x + 0.5, y, z + 0.5);
    this.fuse = fuse; this.w = 0.49; this.h = 0.98; this.vy = 2; this.stepHeight = 0;
    this.vx = (Math.random() - 0.5) * 0.6; this.vz = (Math.random() - 0.5) * 0.6;
  }
  update(dt) {
    const g = this.game;
    this.fuse -= dt; this.age += dt;
    this.vy = Math.max(-30, this.vy - 22 * dt);
    this.vx *= Math.max(0, 1 - dt * 3); this.vz *= Math.max(0, 1 - dt * 3);
    moveEntity(g.world, this, dt);
    if (Math.random() < dt * 20) g.particles.add({ x: this.x, y: this.y + 1.05, z: this.z, vx: (Math.random() - 0.5) * 0.3, vy: 1, vz: (Math.random() - 0.5) * 0.3, life: 0.5, max: 0.5, size: 0.06, uv: tileUV(ATLAS.tile.smoke ?? 0), light: 0xFF, grav: -0.5 });
    if (this.fuse <= 0) { this.remove = true; g.explode(this.x, this.y + 0.5, this.z, 4); }
  }
  draws(out) {
    const im = itemMesh(this.game.renderer.gl, 'tnt');
    const m = Mat4.create(); Mat4.translate(m, 0, 0.5, 0);
    const flash = Math.floor(this.age * 5) % 2 === 0;
    const s = 1 + Math.max(0, 0.4 - this.fuse) * 0.4; Mat4.scale(m, s, s, s);
    out.push({ mesh: im.mesh, m, px: this.x, py: this.y, pz: this.z, light: [15, 15], tint: flash ? [1, 1, 1, 0.5] : null });
  }
}

Object.assign(Game.prototype, {
  // Sand, gravel and powder with nothing under them start to fall.
  checkFall(x, y, z) {
    const w = this.world;
    const id = w.getBlock(x, y, z);
    if (!BLOCKS[id].falls || this.isGuest) return;
    const below = w.getBlock(x, y - 1, z);
    if (y <= 0 || (below && !T_REPLACEABLE[below] && !T_LIQUID[below] && T_SOLID[below])) return;
    if (below && !T_LIQUID[below] && !T_REPLACEABLE[below]) return;
    const meta = w.getMeta(x, y, z);
    w.setBlock(x, y, z, 0, 0, { quiet: true });
    this.addEntity(new FallingBlock(this, x, y, z, id, meta));
  },
  // Concrete powder touching water becomes concrete.
  checkHarden(x, y, z) {
    const w = this.world, d = BLOCKS[w.getBlock(x, y, z)];
    if (!d.hardensTo) return;
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]]) {
      if (waterAt(w, x + dx, y + dy, z + dz)) { w.setBlock(x, y, z, B[d.hardensTo]); this.sfx.playAt('fizz', x, y, z); return; }
    }
  },
  primeTNT(x, y, z, fuse) {
    if (!this.rules().tntExplodes) { this.sfx.playAt('fizz', x, y, z); this.burst(x + 0.5, y + 0.5, z + 0.5, 'white', 8, 0.5, 0.1); this.dropItem(mkStack('tnt', 1), x + 0.5, y + 0.5, z + 0.5, true); return; }
    this.addEntity(new PrimedTNT(this, x, y, z, fuse));
    this.sfx.playAt('fuse', x, y, z);
  },
  // Blow a round hole, knock everyone back, set off nearby TNT.
  explode(x, y, z, power, opts = {}) {
    const w = this.world, r = power;
    this.sfx.playAt('explode', x, y, z, 64);
    this.shake(0.8, { x, z });
    if (!opts.noBlocks) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dy, dz);
      if (d > r * (0.75 + Math.random() * 0.3)) continue;
      const bx = Math.floor(x + dx), by = Math.floor(y + dy), bz = Math.floor(z + dz);
      const id = w.getBlock(bx, by, bz), b = BLOCKS[id];
      if (!id || T_LIQUID[id] || b.hardness < 0 || b.hardness >= 20 || b.mech === 'none') continue;
      if (b.tnt) { w.setBlock(bx, by, bz, 0); this.primeTNT(bx, by, bz, 0.5 + Math.random()); continue; }
      const ent = w.getEntity(bx, by, bz);
      if (ent) this.spillEntity(ent, bx, by, bz);
      w.setBlock(bx, by, bz, 0, 0, { quiet: true });
      if (Math.random() < 0.3) this.dropBlockItems(bx, by, bz, id, true, w.getMeta(bx, by, bz));
    }
    for (const ch of w.meshSet) w.urgent.add(ch);
    for (let i = 0; i < 40; i++) this.particles.add({ x: x + (Math.random() - 0.5) * r, y: y + (Math.random() - 0.5) * r, z: z + (Math.random() - 0.5) * r,
      vx: (Math.random() - 0.5) * 3, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 3, life: 0.9, max: 0.9, size: 0.35 + Math.random() * 0.3, uv: tileUV(ATLAS.tile.smoke ?? 0), light: 0xFF, grav: -1, shrink: true, size0: 0.5 });
    for (const p of this.pawns()) {
      const d = Math.hypot(p.x - x, p.y + 1 - y, p.z - z);
      if (d < r * 2) { const k = 1 - d / (r * 2); p.hurt(Math.round(k * 14), { type: 'explosion' }); p.knock((p.x - x) / (d || 1) * 10 * k, 6 * k, (p.z - z) / (d || 1) * 10 * k); }
    }
    for (const e of this.entities) if (e instanceof Mob && e.alive) { const d = Math.hypot(e.x - x, e.y - y, e.z - z); if (d < r * 2) e.hurt(Math.round((1 - d / (r * 2)) * 14), {}); }
  },
  // Everyone on this screen in bed: skip to morning.
  trySleep() {
    const awake = this.locals.filter(l => !l.dead && !l.sleeping);
    if (awake.length) { if (this.locals.length > 1) for (const l of this.locals) l.toast(awake.map(a => a.name).join(', ') + ' must sleep too', ''); return; }
    const fade = document.getElementById('fx-fade');
    fade.hidden = false; requestAnimationFrame(() => fade.classList.add('on'));
    setTimeout(() => {
      this.meta.time = DAY_LEN * 0.02;
      this.meta.day = (this.meta.day || 0) + 1;
      for (const l of this.locals) l.sleeping = null;
      fade.classList.remove('on'); setTimeout(() => { fade.hidden = true; }, 400);
      this.toastAll('Good morning', 'good');
      this.saveSoon();
    }, 1800);
  },
  particleNote(x, y, z, n) {
    const hue = n / 24;
    this.particles.add({ x: x + 0.5, y: y + 1.2, z: z + 0.5, vx: 0, vy: 0.8, vz: 0, life: 0.8, max: 0.8, size: 0.14, uv: tileUV(ATLAS.tile.note_particle ?? 0), light: 0xFF, grav: 0, tint: hue });
  },
  // Smoke from torches and campfires, sparks from lava and fire, motes around portals.
  emitterParticles(dt) {
    const w = this.world; if (!w) return;
    this._emAcc = (this._emAcc || 0) + dt;
    if (this._emAcc < 0.08) return;
    const step = this._emAcc; this._emAcc = 0;
    const centers = this.locals.map(l => l.player);
    for (const ch of w.chunks.values()) {
      if (!ch.emitters || !ch.emitters.length) continue;
      let near = false;
      for (const p of centers) if (Math.abs(ch.cx * 16 + 8 - p.x) < 28 && Math.abs(ch.cz * 16 + 8 - p.z) < 28) near = true;
      if (!near) continue;
      const EM = ch.emitters;
      for (let ei = 0; ei < EM.length; ei++) {
        const e = EM[ei], lx = e[0], y = e[1], lz = e[2], id = e[3], meta = e[4];
        const x = ch.cx * 16 + lx, z = ch.cz * 16 + lz, d = BLOCKS[id];
        if (d.rs === 'torch_off') continue;
        // little extras from glowing, smouldering and dripping blocks
        if (d.key === 'end_rod') { if (Math.random() < step * 1.2) this.particles.add({ x: x + 0.5 + (Math.random() - 0.5) * 0.3, y: y + 0.5 + (Math.random() - 0.5) * 0.6, z: z + 0.5 + (Math.random() - 0.5) * 0.3, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, vz: (Math.random() - 0.5) * 0.3, life: 1.6, max: 1.6, size: 0.04, uv: tileUV(ATLAS.tile.sparkle ?? ATLAS.tile.white), light: 0xFF, grav: 0, shrink: true, size0: 0.05 }); continue; }
        if (d.key === 'crying_obsidian') { if (Math.random() < step * 0.6 && !T_SOLID[w.getBlock(x, y - 1, z)]) this.particles.add({ x: x + 0.2 + Math.random() * 0.6, y: y - 0.03, z: z + 0.2 + Math.random() * 0.6, vx: 0, vy: 0, vz: 0, life: 2.2, max: 2.2, size: 0.04, uv: tileUV(ATLAS.tile.drip_tear ?? ATLAS.tile.white), light: 0xFF, grav: 9, hang: 0.6 }); continue; }
        if (d.key === 'spore_blossom') { if (Math.random() < step * 3) this.particles.add({ x: x + (Math.random() - 0.5) * 6, y: y - Math.random() * 4, z: z + (Math.random() - 0.5) * 6, vx: (Math.random() - 0.5) * 0.15, vy: -0.08, vz: (Math.random() - 0.5) * 0.15, life: 5, max: 5, size: 0.025, uv: tileUV(ATLAS.tile.spore ?? ATLAS.tile.white), light: 0xFF, grav: 0, flutter: 0.2, ph: Math.random() * 6 }); continue; }
        if (d.furnace && d.light) { if (Math.random() < step * 1.5) { this.particles.add({ x: x + 0.5 + (Math.random() - 0.5) * 0.5, y: y + 1.02, z: z + 0.5 + (Math.random() - 0.5) * 0.5, vx: 0, vy: 0.45, vz: 0, life: 2.2, max: 2.2, size: 0.06, size0: 0.06, grow: 1.5, uv: tileUV(ATLAS.tile.smoke ?? 0), light: 0xFF, grav: -0.08, rise: true, windX: this.windDrift()[0], windZ: this.windDrift()[1] }); }
          // and a flicker of flame at the mouth
          if (Math.random() < step * 2) { const f = (meta & 3), ox = [0, 0.56, 0, -0.56][f] || 0, oz = [-0.56, 0, 0.56, 0][f] || 0; this.particles.add({ x: x + 0.5 + ox + (Math.random() - 0.5) * 0.3 * (oz ? 1 : 0), y: y + 0.2 + Math.random() * 0.2, z: z + 0.5 + oz + (Math.random() - 0.5) * 0.3 * (ox ? 1 : 0), vx: 0, vy: 0.05, vz: 0, life: 0.5, max: 0.5, size: 0.035, size0: 0.035, shrink: true, uv: tileUV(ATLAS.tile.torch_flame ?? ATLAS.tile.flame), light: 0xFF, grav: 0 }); }
          continue; }
        if (d.candle) { if ((meta & 4) && Math.random() < step * 2) this.particles.add({ x: x + 0.5 + (Math.random() - 0.5) * 0.3, y: y + 0.55, z: z + 0.5 + (Math.random() - 0.5) * 0.3, vx: 0, vy: 0.3, vz: 0, life: 1, max: 1, size: 0.025, uv: tileUV(ATLAS.tile.smoke ?? 0), light: 0xFF, grav: -0.2 }); continue; }
        if (d.rs === 'wire' || d.rs === 'torch' || id === B.redstone_ore_lit) {
          // redstone gives off little red sparks
          const p = d.rs === 'wire' ? (meta & 15) / 15 : 1;
          if (!p || Math.random() > step * (d.rs === 'torch' ? 4 : 1.2) * p) continue;
          let tx = x + 0.5, ty = y + 0.75, tz = z + 0.5;
          if (d.rs === 'torch' && meta) { ty = y + 0.95; tx += meta === 1 ? -0.17 : meta === 2 ? 0.17 : 0; tz += meta === 3 ? -0.17 : meta === 4 ? 0.17 : 0; }
          if (d.rs === 'wire') { tx = x + 0.2 + Math.random() * 0.6; tz = z + 0.2 + Math.random() * 0.6; ty = y + 0.08; }
          if (id === B.redstone_ore_lit) { const f = Math.floor(Math.random() * 6); tx = x + (f === 0 ? 1.05 : f === 1 ? -0.05 : Math.random()); ty = y + (f === 2 ? 1.05 : f === 3 ? -0.05 : Math.random()); tz = z + (f === 4 ? 1.05 : f === 5 ? -0.05 : Math.random()); }
          this.particles.add({ x: tx, y: ty, z: tz, vx: 0, vy: 0.15, vz: 0, life: 0.6, max: 0.6, size: 0.035, uv: tileUV(ATLAS.tile.redstone_spark ?? 0), light: 0xFF, grav: 0 });
          continue;
        }
        if (d.render === RENDER.TORCH) {
          if (Math.random() > step * 2.4) continue;
          let tx = x + 0.5, tz = z + 0.5, ty = y + 0.7;
          if (meta === 1) tx = x + 0.35; else if (meta === 2) tx = x + 0.65; else if (meta === 3) tz = z + 0.35; else if (meta === 4) tz = z + 0.65;
          if (meta) { ty = y + 0.92; tx += (meta === 1 ? 0.18 : meta === 2 ? -0.18 : 0); tz += (meta === 3 ? 0.18 : meta === 4 ? -0.18 : 0); }
          // the flame itself burns all the time (game/particles2.js); now and then a spark flies up, and a
          // wisp of smoke rises, grows and gathers under the ceiling
          if (Math.random() < 0.3) { const fl = 0.4 + Math.random() * 0.4; this.particles.add({ x: tx + (Math.random() - 0.5) * 0.04, y: ty + 0.04, z: tz + (Math.random() - 0.5) * 0.04, vx: (Math.random() - 0.5) * 0.25, vy: 0.5 + Math.random() * 0.5, vz: (Math.random() - 0.5) * 0.25, life: fl, max: fl, size: 0.014, size0: 0.014, shrink: true, uv: tileUV(ATLAS.tile[id === B.soul_torch ? 'soul_flame' : 'ember_spark'] ?? ATLAS.tile.flame), light: 0xFF, grav: -0.2 }); }
          if (Math.random() < 0.85) { const sl = 1.3 + Math.random() * 0.9; this.particles.add({ x: tx, y: ty + 0.04, z: tz, vx: (Math.random() - 0.5) * 0.04, vy: 0.3 + Math.random() * 0.15, vz: (Math.random() - 0.5) * 0.04, life: sl, max: sl, size: 0.03, size0: 0.03, grow: 1.6, uv: tileUV(ATLAS.tile.smoke_puff ?? ATLAS.tile.smoke ?? 0), light: 0xFF, grav: -0.04, rise: true, windX: this.windDrift()[0], windZ: this.windDrift()[1] }); }
        } else if (d.shape === 'campfire' || d.shape === 'soul_campfire') {
          campfireFx(this, x, y, z, id, meta, step);   // game/camping.js
        } else if (d.fire || id === B.lava || id === B.magma_block) {
          if (Math.random() > step * (id === B.lava ? 0.4 : 2)) continue;
          if (id === B.lava && w.getBlock(x, y + 1, z) !== 0) continue;
          this.particles.add({ x: x + Math.random(), y: y + (id === B.lava ? 0.95 : 0.6), z: z + Math.random(), vx: (Math.random() - 0.5) * 1.5, vy: 2 + Math.random() * 2, vz: (Math.random() - 0.5) * 1.5, life: 0.7, max: 0.7, size: 0.05, uv: tileUV(ATLAS.tile.flame), light: 0xFF, grav: 6 });
          // fires smoke heavily (and the smoke gathers under roofs)
          if (d.fire && Math.random() < 0.8) this.particles.add({ x: x + 0.2 + Math.random() * 0.6, y: y + 0.8, z: z + 0.2 + Math.random() * 0.6, vx: 0, vy: 0.7 + Math.random() * 0.4, vz: 0, life: 3, max: 3, size: 0.12, size0: 0.12, grow: 1.6, uv: tileUV(ATLAS.tile.smoke_dark ?? ATLAS.tile.smoke ?? 0), light: 0xFF, grav: -0.08, rise: true, windX: this.windDrift()[0] * 2, windZ: this.windDrift()[1] * 2 });
          if (d.fire && Math.random() < 0.1) this.sfx.playAt('fire_crackle', x + 0.5, y + 0.5, z + 0.5, 14);
          if (id === B.lava && Math.random() < 0.15) this.sfx.playAt('lava_pop', x + 0.5, y + 1, z + 0.5, 16);
        } else if (T_PORTAL[id]) {
          if (Math.random() > step * 2) continue;
          const t = id === B.ember_portal ? 'portal_mote_ember' : 'portal_mote_sky';
          this.particles.add({ x: x + Math.random(), y: y + Math.random(), z: z + Math.random(), vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.3) * 0.6, vz: (Math.random() - 0.5) * 0.6, life: 1.2, max: 1.2, size: 0.05, uv: tileUV(ATLAS.tile[t] ?? ATLAS.tile.white), light: 0xFF, grav: 0 });
        }
      }
    }
  },
});

// What lights fire or particles when meshed.
for (const b of BLOCKS) if (b.render === RENDER.TORCH || b.rs === 'wire' || b.key === 'end_rod' || b.key === 'crying_obsidian' || b.key === 'spore_blossom' || (b.furnace && b.light) || b.candle || b.key === 'redstone_ore_lit' || b.shape === 'campfire' || b.shape === 'soul_campfire' || b.fire || b.key === 'lava' || b.key === 'magma_block' || b.portal) EMITS[b.id] = 1;

// Flint and steel: light TNT, or a fire on whatever you point at.
Object.assign(LocalPlayer.prototype, {
  useFlint(hit, held) {
    const g = this.g, w = g.world;
    if (!hit) return;
    if (BLOCKS[hit.id].tnt) { w.setBlock(hit.x, hit.y, hit.z, 0); g.primeTNT(hit.x, hit.y, hit.z, 4); this.wearHeld(1); return; }
    if (BLOCKS[hit.id].key === 'campfire' || BLOCKS[hit.id].key === 'soul_campfire') return;
    const [x, y, z] = this.placeTarget(hit);
    // inside an obsidian frame: the portal lights (any size, like Minecraft)
    if (tryIgniteAt(w, x, y, z, 'ember')) { g.sfx.playAt('ignite', x, y, z); g.sfx.play('portal'); this.toast('The portal roars open', 'boss'); this.swingArm(); this.wearHeld(1); return; }
    if (w.getBlock(x, y, z) !== 0 || !T_SOLID[w.getBlock(x, y - 1, z)]) return;
    const below = w.getBlock(x, y - 1, z);
    w.setBlock(x, y, z, below === B.soul_soil || below === B.ash ? B.soul_fire : B.fire);
    g.sfx.playAt('ignite', x, y, z); this.swingArm(); this.wearHeld(1);
  },
  useBonemeal() {},
});

// ---- blocks left half-broken -------------------------------------------------------------------
// Stop mining part way and the cracks stay. After a couple of seconds the block starts to mend,
// the cracks running backwards until it's whole again. Come back before then and you carry on
// from where you left off.
Object.assign(Game.prototype, {
  rememberDamage(m) {
    if (!m || !(m.progress > 0) || m.progress >= 1 || m.time === Infinity) return;
    this.damage = this.damage || new Map();
    this.damage.set(posKey(m.x, m.y, m.z), { x: m.x, y: m.y, z: m.z, id: m.id, p: m.progress, t: this.time });
  },
  damageFor(x, y, z, id) {
    const d = this.damage && this.damage.get(posKey(x, y, z));
    if (!d || d.id !== id) return 0;
    this.damage.delete(posKey(x, y, z));
    return d.p;
  },
  forgetDamage(x, y, z) { if (this.damage) this.damage.delete(posKey(x, y, z)); },
  // Mend over time, and hand the renderer the cracks near this camera.
  damageCracks(cam) {
    if (!this.damage || !this.damage.size) return null;
    const now = this.time, out = [];
    if (this._dmgT !== now) {
      const dt = now - (this._dmgPrev || now); this._dmgPrev = now; this._dmgT = now;
      for (const [k, d] of this.damage) {
        if (this.world.getBlock(d.x, d.y, d.z) !== d.id) { this.damage.delete(k); continue; }
        if (now - d.t > 2.5) d.p -= dt * 0.12;
        if (d.p <= 0) this.damage.delete(k);
      }
    }
    for (const d of this.damage.values()) {
      if (Math.abs(d.x - cam.x) > 48 || Math.abs(d.z - cam.z) > 48) continue;
      out.push({ x: d.x, y: d.y, z: d.z, stage: Math.min(9, Math.floor(d.p * 10)) });
    }
    return out;
  },
});
