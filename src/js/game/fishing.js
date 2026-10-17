// ---------------------------------------------------------------------------
// game/fishing.js — 0.8.4: fishing, the cozy way.
//
// Use a fishing rod: you wind back and cast, and the float sails out on its
// line. Where it lands in water it bobs and waits. Bubbles drift in as a fish
// comes nosing up; when the float ducks under with a splash, use the rod
// again, quick, and you reel it in: the catch flies up out of the water to
// you. Wait too long and it's gone. What bites depends on the water: cod and
// salmon in the sea, salmon in rivers and lakes, tropical fish and puffers in
// warm water; now and then some junk, and rarely something good. Each catch
// has a size, for bragging. Reeling in with nothing on the line just brings
// the float home. The rod wears a little each time.
// ---------------------------------------------------------------------------

defItem('fishing_rod', { name: 'Fishing Rod', maxStack: 1, fishing: true, tool: { type: 'rod', tier: 0, speed: 1, damage: 1, durability: 64 }, desc: 'Use to cast; use again to reel in. When the float ducks under, reel in quick.' });
defItem('fishing_rod_cast', { name: 'Fishing Rod', maxStack: 1, hidden: true, tool: { type: 'rod', tier: 0, speed: 1, damage: 1, durability: 64 } });
defItem('fishing_rod_tp', { name: 'Fishing Rod', maxStack: 1, hidden: true, icon: 'fishing_rod', tool: { type: 'rod', tier: 0, speed: 1, damage: 1, durability: 64 } });   // (0.9.0.19) how it looks in someone else's hand
RECIPES.push({ out: 'fishing_rod', n: 1, shape: ['  S', ' SW', 'S W'], key: { S: 'stick', W: 'string' }, group: 'tools' });
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    const rod = (p, line) => {
      for (let i = 0; i < 13; i++) { p.set(1 + i, 14 - i, i < 4 ? H('#c8a070') : H('#7a5430')); if (i < 4) p.set(2 + i, 14 - i, H('#a87a48')); }
      p.set(4, 12, H('#9a9aa4')); p.set(5, 12, H('#9a9aa4')); p.set(4, 13, H('#6a6a74'));
      if (line) for (let y = 2; y < 12; y++) p.set(14, y, H('#e8e8e8'));
      if (line) { p.set(13, 12, H('#9a9aa4')); p.set(14, 12, H('#9a9aa4')); }
    };
    addItem('fishing_rod', p => rod(p, true));
    addItem('fishing_rod_cast', p => rod(p, false));
  };
}

// ---- the float ----
class Bobber extends Entity {
  constructor(game, lp, x, y, z, vx, vy, vz) {
    super(game, x, y, z); this.lp = lp; this.vx = vx; this.vy = vy; this.vz = vz; this.w = 0.08; this.h = 0.12;
    this.state = 'fly'; this.waitT = 0; this.biteT = 0; this.nibbleT = 0;
  }
  surface() {
    const w = this.game.world, x = Math.floor(this.x), z = Math.floor(this.z);
    for (let y = Math.floor(this.y) + 1; y >= Math.floor(this.y) - 2; y--) if (T_LIQUID[w.getBlock(x, y, z)] === 1 && T_LIQUID[w.getBlock(x, y + 1, z)] !== 1) return y + 0.88;
    return null;
  }
  update(dt) {
    const g = this.game, w = g.world, lp = this.lp;
    this.age += dt;
    if (!lp || lp.dead || lp.fishing !== this || !g.locals.includes(lp)) { this.remove = true; return; }
    const held = lp.player.inv.held;
    if (!held || (held.id !== 'fishing_rod' && held.id !== 'fishing_rod_cast')) { lp.endFishing(false); return; }
    const p = lp.player;
    if (Math.hypot(this.x - p.x, this.y - p.y, this.z - p.z) > 34) { lp.endFishing(false); lp.toast('The line snapped', 'warn'); return; }
    if (this.state === 'fly') {
      for (let s = 0; s < 3; s++) {
        const h = dt / 3; this.vy -= 16 * h; const k = Math.max(0, 1 - h * 0.4); this.vx *= k; this.vz *= k;
        const nx = this.x + this.vx * h, ny = this.y + this.vy * h, nz = this.z + this.vz * h, id = w.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz));
        if (T_LIQUID[id] === 1) {
          this.x = nx; this.z = nz; this.y = ny; this.state = 'float'; this.vx = this.vy = this.vz = 0;
          this.waitT = (5 + Math.random() * 14) * (1 - (typeof skillBonus === 'function' ? skillBonus(lp.player, 'fishing', 0.4) : 0)); g.sfx.playAt('splash_small', this.x, this.y, this.z, 20);   // (0.9.0.24) a practised angler gets bites sooner
          g.burst(this.x, (this.surface() ?? this.y) + 0.05, this.z, 'water', 8, 1.5);
          return;
        }
        if (T_SOLID[id] || T_LIQUID[id] === 2) { this.state = 'ground'; this.vx = this.vy = this.vz = 0; if (T_LIQUID[id] === 2) { lp.endFishing(false); } return; }
        this.x = nx; this.y = ny; this.z = nz;
      }
      if (this.y < -10) lp.endFishing(false);
      return;
    }
    if (this.state !== 'float') return;
    const top = this.surface();
    if (top === null) { this.state = 'fly'; return; }
    // a fish swims up to the float, bubbles trailing off it, noses at it, then bites
    this.waitT -= dt;
    if (this.biteT <= 0 && this.waitT < 3.2 && this.waitT > 0) {
      if (!this.coming) this.comeUp(top);
      const t = clamp(1 - this.waitT / Math.min(3.2, this.comeT || 3.2), 0, 1), e = t * t * (3 - 2 * t), c = this.coming;
      const bx = c.x + (this.x - c.x) * e, bz = c.z + (this.z - c.z) * e, by = c.y + (top - 0.42 - c.y) * e;
      const f = this.fish;
      if (f && !f.remove) {
        // it weaves a little on the way, and slows to nose at the float
        const side = Math.sin(this.age * 3.1) * 0.25 * (1 - e);
        const hx = this.x - c.x, hz = this.z - c.z, hl = Math.hypot(hx, hz) || 1;
        f.x = bx - hz / hl * side; f.z = bz + hx / hl * side; f.y = by; f.tx = f.x; f.ty = f.y; f.tz = f.z;
        f.yaw = heading(f.x, f.z, this.x, this.z); f.speedNow = 1.4 * (1 - e) + 0.4; f.vx = f.vz = f.vy = 0;
        if (Math.random() < dt * 9) g.particles.add({ x: f.x + (Math.random() - 0.5) * 0.1, y: f.y + 0.15, z: f.z + (Math.random() - 0.5) * 0.1, vx: 0, vy: 0.9, vz: 0, life: Math.max(0.2, (top - f.y) / 0.9), max: 0.6, size: 0.045, uv: tileUV(ATLAS.tile.splash ?? ATLAS.tile.white), light: 0xFF, grav: 0 });
      } else if (Math.random() < dt * 14) g.particles.add({ x: bx + (Math.random() - 0.5) * 0.15, y: top - 0.02, z: bz + (Math.random() - 0.5) * 0.15, vx: 0, vy: 0.25, vz: 0, life: 0.5, max: 0.5, size: 0.05, uv: tileUV(ATLAS.tile.splash ?? ATLAS.tile.white), light: 0xFF, grav: 0 });
    }
    if (this.biteT <= 0 && this.waitT <= 0) {
      if (!this.coming) this.comeUp(top);
      this.biteT = 0.85 + Math.random() * 0.3;
      g.sfx.playAt('splash_small', this.x, top, this.z, 24); g.burst(this.x, top + 0.05, this.z, 'water', 10, 2);
      lp.hud && lp.pads && lp.pads.size && g.pads.rumble(lp, 0.4, 160);
    }
    if (this.biteT > 0) {
      const f = this.fish;
      if (f && !f.remove) { f.x = this.x + Math.sin(this.age * 20) * 0.04; f.z = this.z; f.y = top - 0.38 + Math.sin(this.age * 30) * 0.03; f.tx = f.x; f.ty = f.y; f.tz = f.z; f.speedNow = 3; }
      this.biteT -= dt;
      if (this.biteT <= 0) { this.waitT = (4 + Math.random() * 12) * (1 - (typeof skillBonus === 'function' ? skillBonus(lp.player, 'fishing', 0.4) : 0)); this.letGo(true); }          // it got away
    }
    const dip = this.biteT > 0 ? 0.22 + Math.sin(this.age * 30) * 0.03 : 0;
    this.y += ((top - 0.06 - dip + Math.sin(this.age * 2.6) * 0.02) - this.y) * Math.min(1, dt * 10);
  }
  // Something takes an interest. Junk and treasure just send bubbles; a fish is a real fish: one already
  // swimming close by if there is one (on the host), otherwise one comes up from deeper water.
  comeUp(top) {
    const g = this.game, w = g.world;
    this.catch = fishingCatch(g, this.x, this.z);
    this.comeT = Math.max(0.5, this.waitT);
    const a = Math.random() * TAU, r = 2.6 + Math.random() * 1.2;
    let start = { x: this.x + Math.cos(a) * r, y: top - 1.3, z: this.z + Math.sin(a) * r };
    if (T_LIQUID[w.getBlock(Math.floor(start.x), Math.floor(start.y), Math.floor(start.z))] !== 1) start = { x: this.x + Math.cos(a) * 1.4, y: top - 0.8, z: this.z + Math.sin(a) * 1.4 };
    this.coming = start;
    if (this.catch.kind !== 'fish') return;
    const FISH = ['cod', 'salmon', 'tropical_fish', 'pufferfish'];
    let f = null;
    if (!g.isGuest) {
      let best = 10;
      for (const e of g.entities) {
        if (!(e instanceof Mob) || !FISH.includes(e.type) || !e.alive || e.hooked || e.ghost || !e.inWater) continue;
        const d = Math.hypot(e.x - this.x, e.z - this.z); if (d < best && Math.abs(e.y - top) < 6) { best = d; f = e; }
      }
    }
    if (f) {
      // that one: it's what you'll catch
      this.catch.id = f.type; this.coming = { x: f.x, y: f.y, z: f.z };
      const size = { cod: [30, 70], salmon: [45, 90], tropical_fish: [8, 25], pufferfish: [15, 40] }[f.type];
      this.catch.cm = Math.round(size[0] + Math.pow(Math.random(), 1.6) * (size[1] - size[0]));
    } else if (MOB_TYPES[this.catch.id]) {
      f = new Mob(g, this.catch.id, start.x, start.y, start.z);
      if (g.isGuest) f.netLocalOnly = true;
      g.addEntity(f);
      if (!g.entities.includes(f)) f = null;
    }
    if (f) { f.hooked = this; this.fish = f; }
  }
  // the fish swims off (startled), or is gone with the catch
  letGo(scared) {
    const f = this.fish; this.fish = null; this.coming = null;
    if (!f) return;
    f.hooked = null;
    if (f.netLocalOnly) { f.remove = true; return; }
    if (scared) { f.swimDir = heading(this.x, this.z, f.x, f.z); f.swimT = 3; f.swimY = f.y - 1; }
  }
  draws(out, viewer) {
    if (Array.isArray(viewer)) return;            // game.js also offers it the per-view list; once is enough
    const g = this.game, gl = g.renderer.gl;
    if (!Bobber.mesh) {
      const mb = new MeshBuilder(64);
      addBox(mb, [-0.07, 0.05, -0.07], [0.07, 0.17, 0.07], tilesOf('red_wool'));
      addBox(mb, [-0.07, -0.04, -0.07], [0.07, 0.05, 0.07], tilesOf('white_wool'));
      addBox(mb, [-0.015, 0.17, -0.015], [0.015, 0.25, 0.015], tilesOf('white_wool'));
      const r = mb.result(); Bobber.mesh = makeVAO(gl, r.verts, r.idx);
    }
    const l = g.world.getLight(Math.floor(this.x), Math.floor(this.y + 0.5), Math.floor(this.z)), light = [l >> 4, l & 15];
    const m = Mat4.create(); Mat4.rotateZ(m, this.biteT > 0 ? Math.sin(this.age * 25) * 0.2 : 0);
    out.push({ mesh: Bobber.mesh, m, px: this.x, py: this.y, pz: this.z, light });
    // the line, from the rod's tip, sagging unless something's pulling
    const lp = this.lp, p = lp.player, [lx, ly, lz] = p.look(), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    const fp = !lp.viewMode, tip = fp ? [p.x + lx * 0.95 + rx * 0.42, p.y + p.eye + ly * 0.95 + 0.18, p.z + lz * 0.95 + rz * 0.42] : [p.x + lx * 1.1 + rx * 0.5, p.y + 1.9 + ly * 0.6, p.z + lz * 1.1 + rz * 0.5];
    const end = [this.x, this.y + 0.24, this.z], d = Math.hypot(end[0] - tip[0], end[2] - tip[2]);
    const sag = this.biteT > 0 ? 0.02 : this.state === 'float' ? 0.12 + d * 0.025 : 0.06, N = 12, line = lineMesh(gl);
    let prev = tip;
    for (let i = 1; i <= N; i++) {
      const t = i / N, q = [tip[0] + (end[0] - tip[0]) * t, tip[1] + (end[1] - tip[1]) * t - sag * 4 * t * (1 - t), tip[2] + (end[2] - tip[2]) * t];
      const dx = q[0] - prev[0], dy = q[1] - prev[1], dz = q[2] - prev[2], h = Math.hypot(dx, dz), L = Math.hypot(dx, dy, dz);
      const sm = Mat4.create(); Mat4.translate(sm, prev[0] - this.x, prev[1] - this.y, prev[2] - this.z); Mat4.rotateY(sm, Math.atan2(-dz, dx)); Mat4.rotateZ(sm, Math.atan2(dy, h)); Mat4.scale(sm, L, 0.6, 0.6);
      out.push({ mesh: line, m: sm, px: this.x, py: this.y, pz: this.z, light });
      prev = q;
    }
  }
  hurt() { return 0; }
  snap() { return null; }
}

// ---- what bites ----
function fishingCatch(g, x, z) {
  const w = g.world, r = Math.random();
  let c = null; try { c = w.gen.column ? w.gen.column(Math.floor(x), Math.floor(z)) : null; } catch (e) { /* older terrain */ }
  const temp = c && c.temp !== undefined ? c.temp : 0, ocean = c ? c.biome === BIOME.OCEAN : false;
  const has = (id) => !!ITEMS[id];
  const pick = (list) => { const l = list.filter(([id]) => has(id)); let t = 0; for (const e of l) t += e[1]; let q = Math.random() * t; for (const e of l) { q -= e[1]; if (q <= 0) return e[0]; } return l.length ? l[0][0] : 'cod'; };
  if (r < 0.04) return { id: pick([['saddle', 2], ['bow', 2], ['emerald', 3], ['gold_ingot', 3], ['diamond', 1], ['music_disc_tide', 1], ['music_disc_grove', 1], ['fishing_rod', 2]]), kind: 'treasure' };
  if (r < 0.12) return { id: pick([['stick', 3], ['string', 3], ['bowl', 2], ['leather', 2], ['bone', 3], ['lily_pad', 2], ['kelp', 3], ['ink_sac', 1]]), kind: 'junk' };
  const fish = ocean ? (temp > 0.3 ? [['tropical_fish', 4], ['pufferfish', 2], ['cod', 4]] : temp < -0.1 ? [['salmon', 6], ['cod', 4]] : [['cod', 7], ['salmon', 2], ['pufferfish', 1]])
    : temp > 0.4 ? [['tropical_fish', 3], ['salmon', 4], ['cod', 2]] : [['salmon', 6], ['cod', 3]];
  const id = pick(fish), size = { cod: [30, 70], salmon: [45, 90], tropical_fish: [8, 25], pufferfish: [15, 40] }[id] || [20, 50];
  return { id, kind: 'fish', cm: Math.round(size[0] + Math.pow(Math.random(), 1.6) * (size[1] - size[0])) };
}

{
  const baseMobUpdate = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (this.hooked && !this.ghost) {
      const b = this.hooked;
      if (b.remove || b.fish !== this) { this.hooked = null; if (this.netLocalOnly) this.remove = true; return baseMobUpdate.call(this, dt); }
      this.age += dt; this.inWater = true; this.onGround = false; this.walk = (this.walk || 0) + dt * 6; this.walkAmt = 1;
      return;
    }
    return baseMobUpdate.call(this, dt);
  };
}
Object.assign(LocalPlayer.prototype, {
  castLine() {
    const g = this.g, p = this.player, [lx, ly, lz] = p.look(), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    const b = new Bobber(g, this, p.x + lx * 0.8 + rx * 0.3, p.y + p.eye + 0.1 + ly * 0.8, p.z + lz * 0.8 + rz * 0.3, lx * 13, ly * 13 + 3.5, lz * 13);
    g.addEntity(b); this.fishing = b;
    this.swingArm(); g.sfx.play('bow');
  },
  endFishing(reel) {
    const g = this.g, b = this.fishing, p = this.player;
    this.fishing = null;
    if (!b) return;
    b.remove = true;
    if (!(b.state === 'float' && b.biteT > 0 && reel)) b.letGo(true);
    if (!reel) return;
    this.swingArm();
    if (b.state === 'float') g.sfx.playAt('splash_small', b.x, b.y, b.z, 16);
    if (b.state === 'float' && b.biteT > 0) {
      const c = b.catch || fishingCatch(g, b.x, b.z), st = mkStack(c.id, 1);
      if (b.fish) { const f = b.fish; b.fish = null; f.hooked = null; f.remove = true; if (f.ghost === false && g.net && g.isGuest && !f.netLocalOnly) g.net.sendRemoveEntity(f.id); }
      // up out of the water and over to you
      const dx = p.x - b.x, dy = p.y + 1.2 - b.y, dz = p.z - b.z, t = 0.9;
      g.dropItem(st, b.x, b.y + 0.3, b.z, false, 0, [dx / t, dy / t + 0.5 * 18 * t, dz / t]);
      this.grantXP(c.kind === 'treasure' ? 6 : 1 + Math.floor(Math.random() * 3), b.x, b.y + 0.5, b.z);
      const name = itemDef(c.id).name;
      this.toast(c.kind === 'fish' ? 'You caught a ' + name.toLowerCase() + ' (' + c.cm + ' cm)!' : c.kind === 'treasure' ? 'Treasure! ' + name : 'Reeled in some ' + name.toLowerCase(), c.kind === 'treasure' ? 'good' : '');
      g.sfx.play(c.kind === 'treasure' ? 'levelup' : 'pop');
      this.wearHeld(1);
    } else if (b.state === 'float') this.wearHeld(1);
  },
});
{
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const held = this.player.inv.held;
    if (!repeat && !fromOff && held && (held.id === 'fishing_rod' || held.id === 'fishing_rod_cast') && !this.player.carrying) {
      if (this.fishing) this.endFishing(true);
      else if (!(this.castWind > 0)) this.castWind = 0.3;
      return;
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  const baseUpdate = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    baseUpdate.call(this, dt, inp);
    if (this.castWind > 0) {
      this.castWind -= dt;
      const held = this.player.inv.held;
      if (!held || held.id !== 'fishing_rod') this.castWind = 0;
      else if (this.castWind <= 0) { this.castWind = 0; this.castLine(); }
    }
    if (this.fishing && this.player.dead) this.endFishing(false);
  };
  // the rod in your hand: no line hanging from it while the float is out
  const basePose = LocalPlayer.prototype.pose;
  LocalPlayer.prototype.pose = function () {
    const o = basePose.call(this);
    if (o.held === 'fishing_rod' && this.fishing) o.held = 'fishing_rod_cast';
    o.castWind = this.castWind > 0 ? 1 - this.castWind / 0.3 : 0;
    return o;
  };
}
