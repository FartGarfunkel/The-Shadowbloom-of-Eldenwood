// ---------------------------------------------------------------------------
// game/vehicles.js — rowboats and sailboats.
//
// Boats float on the water's surface. A rowboat goes where you row it. A
// sailboat goes where the wind lets it: fastest with the wind on its side
// (a beam reach), good with the wind behind, slow close to the wind and dead
// in the water pointing straight into it — just like a real one. W lets out
// more sail, S takes it in, A and D steer. The pennant on the mast always
// streams downwind. Sneak to climb out. Boats stay where you leave them.
// ---------------------------------------------------------------------------

const BOAT_TYPES = {
  rowboat: { seats: [[0, 0.25, 0.25], [0, 0.25, -0.55]], item: 'rowboat', hp: 3 },
  sailboat: { seats: [[0, 0.25, 0.85], [0, 0.25, -0.75]], item: 'sailboat', hp: 4 },
};

class Boat extends Entity {
  constructor(game, type, x, y, z, yaw) {
    super(game, x, y, z);
    this.type = type; this.T = BOAT_TYPES[type];
    this.yaw = yaw || 0; this.speed = 0; this.turn = 0; this.sail = 0.6; this.boom = 0; this.heel = 0; this.bob = Math.random() * 10;
    this.w = 0.65; this.h = 0.6; this.stepHeight = 0;
    this.riders = [null, null];
    this.health = this.T.hp; this.hitT = 0;
    this.isBoat = true; this.isVehicle = true;
  }
  get alive() { return !this.remove; }
  seatPos(i) {
    const s = this.T.seats[i], c = Math.cos(this.yaw), sn = Math.sin(this.yaw);
    return [this.x + s[0] * c + s[2] * sn, this.y + s[1], this.z - s[0] * sn + s[2] * c];
  }
  waterSurface() {
    const w = this.game.world, x = Math.floor(this.x), z = Math.floor(this.z), y0 = Math.floor(this.y + 0.5);
    for (let y = y0 + 1; y >= y0 - 2; y--) if (waterAt(w, x, y, z) && !waterAt(w, x, y + 1, z)) return y + 0.88;
    return null;
  }
  mount(lp) {
    const i = this.riders[0] ? (this.riders[1] ? -1 : 1) : 0;
    if (i < 0) { lp.toast('The boat is full', ''); return; }
    this.riders[i] = lp; lp.riding = this; lp.seat = i;
    lp.player.vx = lp.player.vy = lp.player.vz = 0;
    lp.toast(this.type === 'sailboat' && i === 0 ? 'W/S set the sail · A/D steer · sneak to get out' : i === 0 ? 'W/S row · A/D steer · sneak to get out' : 'Sneak to get out', '');
    this.game.sfx.play('door_close');
  }
  dismount(lp) {
    const i = this.riders.indexOf(lp); if (i < 0) return;
    this.riders[i] = null; lp.riding = null;
    const p = lp.player, w = this.game.world;
    // step off onto the nearest dry spot
    for (const r of [1.6, 2.4]) for (let k = 0; k < 8; k++) {
      const a = this.yaw + Math.PI / 2 + k * Math.PI / 4, x = this.x + Math.cos(a) * r, z = this.z - Math.sin(a) * r;
      for (let y = Math.floor(this.y) + 2; y >= Math.floor(this.y) - 1; y--) {
        if (T_SOLID[w.getBlock(Math.floor(x), y - 1, Math.floor(z))] && !collides(w, x - 0.3, y, z - 0.3, x + 0.3, y + 1.8, z + 0.3)) { p.x = x; p.y = y; p.z = z; p.fallStart = null; return; }
      }
    }
    p.y = this.y + 1; p.fallStart = null;
  }
  hurt(amount, src) {
    if (this.hitT > 0) return 0;
    this.hitT = 0.3; this.health -= 1; this.shakeT = 0.3;
    this.game.sfx.playAt('hit', this.x, this.y, this.z);
    if (this.health <= 0) this.breakApart();
    return 1;
  }
  breakApart() {
    for (const r of this.riders) if (r) this.dismount(r);
    this.remove = true;
    this.game.dropItem(mkStack(this.T.item, 1), this.x, this.y + 0.5, this.z, true);
  }
  update(dt) {
    const g = this.game, w = g.world;
    if (this.hitT > 0) this.hitT -= dt;
    if (this.shakeT > 0) this.shakeT -= dt;
    this.age += dt; this.bob += dt;
    for (let i = 0; i < 2; i++) { const r = this.riders[i]; if (r && (r.dead || !g.locals.includes(r))) { this.riders[i] = null; if (r) r.riding = null; } }
    const surf = this.waterSurface();
    const floating = surf !== null && this.y < surf + 0.3;
    // the helmsman's controls
    const helm = this.riders[0];
    const inp = helm ? helm.boatInput || {} : {};
    const steer = helm ? -(inp.mx || 0) : 0;
    this.turn += (steer * (floating ? 1.6 : 0.6) - this.turn) * Math.min(1, dt * 4);
    this.yaw += this.turn * dt * (0.4 + Math.min(1, Math.abs(this.speed) / 3));
    let target = 0;
    if (this.type === 'rowboat') {
      if (helm) target = inp.mz < -0.3 ? 4.6 : inp.mz > 0.3 ? -2 : 0;
      if (!floating) target *= 0.15;
    } else {
      if (helm) this.sail = clamp(this.sail + (inp.mz < -0.3 ? 0.7 : inp.mz > 0.3 ? -0.7 : 0) * dt, 0, 1);
      const wind = g.wind || { dir: 0, strength: 0.6 };
      const hx = -Math.sin(this.yaw), hz = -Math.cos(this.yaw);
      const wx = -Math.sin(wind.dir), wz = -Math.cos(wind.dir);     // where the wind blows to
      const th = Math.acos(clamp(hx * wx + hz * wz, -1, 1));            // 0 = wind straight behind
      const P = Math.PI;
      const eff = th < P / 2 ? lerp(0.72, 1, th / (P / 2)) : th < 0.78 * P ? lerp(1, 0.42, (th - P / 2) / (0.28 * P)) : Math.max(0, lerp(0.42, 0, (th - 0.78 * P) / (0.1 * P)));
      this.eff = eff;
      target = floating ? this.sail * wind.strength * eff * 10 : 0;
      // the boom swings out to leeward, more the further off the wind
      const side = Math.sign(hx * wz - hz * wx) || 1;
      const wantBoom = side * clamp((P - th) * 0.55, 0.12, 1.35);
      this.boom += (wantBoom - this.boom) * Math.min(1, dt * 2);
      this.heel += ((floating ? -side * this.sail * eff * wind.strength * 0.18 * clamp(th / (P / 2), 0, 1) * (th < P / 2 ? 1 : 1.3) : 0) - this.heel) * Math.min(1, dt * 1.5);
    }
    const accel = target > this.speed ? 1.2 : 2.2;
    this.speed += (target - this.speed) * Math.min(1, dt * accel);
    if (!floating && Math.abs(this.speed) > 0.5) this.speed *= Math.max(0, 1 - dt * 4);
    this.vx = -Math.sin(this.yaw) * this.speed; this.vz = -Math.cos(this.yaw) * this.speed;
    // float
    if (surf !== null && this.y < surf + 0.4) {
      const want = surf - 0.32 + Math.sin(this.bob * 1.7) * 0.03;
      this.vy += (want - this.y) * 18 * dt;
      this.vy *= Math.max(0, 1 - dt * 5);
    } else this.vy = Math.max(-30, this.vy - 22 * dt);
    const ox = this.x, oz = this.z;
    moveEntity(w, this, dt);
    if (this.hitWall) { this.speed *= 0.4; }
    if (floating && Math.abs(this.speed) > 2 && Math.random() < dt * 8) {
      const back = this.seatPos(0);
      g.particles.add({ x: back[0] + (Math.random() - 0.5) * 0.6, y: (surf || this.y) + 0.02, z: back[2] + (Math.random() - 0.5) * 0.6, vx: 0, vy: 0.3, vz: 0, life: 0.7, max: 0.7, size: 0.08, uv: tileUV(ATLAS.tile.splash ?? ATLAS.tile.white), light: 0xF0, grav: 2 });
    }
    // carry the riders
    for (let i = 0; i < 2; i++) {
      const r = this.riders[i]; if (!r) continue;
      const p = r.player, s = this.seatPos(i);
      p.x = s[0]; p.y = s[1]; p.z = s[2]; p.vx = this.x - ox; p.vz = this.z - oz; p.vy = 0;
      p.fallStart = null; p.onGround = true;
      if (r._boatYaw !== undefined) p.yaw += this.yaw - r._boatYaw;
      r._boatYaw = this.yaw;
    }
    if (this.y < -40) this.remove = true;
  }
  snap() { return { type: this.type, x: +this.x.toFixed(2), y: +this.y.toFixed(2), z: +this.z.toFixed(2), yaw: +this.yaw.toFixed(3), sail: this.sail }; }
  draws(out) {
    const g = this.game, gl = g.renderer.gl;
    if (!Boat.meshes) Boat.build(gl);
    const M = Boat.meshes;
    const light = this.lightAt(0.8);
    const base = Mat4.create();
    Mat4.rotateY(base, this.yaw);
    Mat4.rotateZ(base, this.heel + (this.shakeT > 0 ? Math.sin(this.age * 60) * 0.06 : 0));
    Mat4.rotateX(base, Math.sin(this.bob * 1.3) * 0.025 + clamp(this.speed * 0.006, -0.03, 0.05));
    const put = (mesh, m, extra) => out.push(Object.assign({ mesh, m, px: this.x, py: this.y, pz: this.z, light }, extra || {}));
    put(M.hull, base);
    if (this.type === 'sailboat') {
      put(M.mast, base);
      const bm = Mat4.create(); bm.set(base); Mat4.translate(bm, 0, 0, 0.05); Mat4.rotateY(bm, this.boom);
      put(M.boom, bm);
      // the sail fills with wind: three panels, bellied out
      const fill = (this.sail || 0) * (0.3 + (this.eff || 0) * 0.7);
      for (let k = 0; k < 3; k++) {
        const pm = Mat4.create(); pm.set(bm);
        const belly = Math.sin((k + 0.5) / 3 * Math.PI) * fill * 0.28 * Math.sign(this.boom || 1);
        Mat4.translate(pm, -belly, 0, 0.12 + k * 0.48);
        Mat4.scale(pm, 1, 0.25 + this.sail * 0.75, 1);
        put(M.sail, pm, { noCull: true });
      }
      // pennant at the masthead points downwind
      const wind = g.wind || { dir: 0 };
      const pn = Mat4.create(); Mat4.translate(pn, 0, 3.15, 0); Mat4.rotateY(pn, wind.dir + Math.PI + Math.sin(this.age * 7) * 0.12);
      put(M.flag, pn, { noCull: true });
    } else {
      // oars dip while rowing
      const row = this.riders[0] && Math.abs(this.speed) > 0.3 ? this.age * 6 : 0;
      for (const sd of [-1, 1]) {
        const om = Mat4.create(); om.set(base); Mat4.translate(om, sd * 0.62, 0.42, 0.1); Mat4.rotateY(om, sd * (0.3 + Math.sin(row) * 0.5)); Mat4.rotateZ(om, sd * (0.45 + Math.cos(row) * 0.15));
        put(M.oar, om);
      }
    }
  }
  static build(gl) {
    const mk = (boxes) => { const mb = new MeshBuilder(256); for (const [mn, mx, t] of boxes) addBox(mb, mn, mx, tilesOf(t)); const r = mb.result(); return makeVAO(gl, r.verts, r.idx); };
    const P = 'boat_planks';
    Boat.meshes = {
      hull: mk([
        [[-0.6, 0.05, -1.0], [0.6, 0.15, 1.1], P],                       // bottom
        [[-0.7, 0.05, -1.0], [-0.6, 0.5, 1.1], P], [[0.6, 0.05, -1.0], [0.7, 0.5, 1.1], P], // sides
        [[-0.6, 0.05, 1.1], [0.6, 0.5, 1.2], P],                         // stern
        [[-0.45, 0.05, -1.25], [0.45, 0.5, -1.0], P], [[-0.25, 0.05, -1.45], [0.25, 0.48, -1.25], P], // bow
        [[-0.6, 0.3, 0.75], [0.6, 0.36, 0.95], 'planks'], [[-0.6, 0.3, -0.65], [0.6, 0.36, -0.45], 'planks'], // seats
        [[-0.72, 0.48, -1.0], [0.72, 0.55, 1.22], 'boat_rail'],
      ]),
      mast: mk([[[-0.06, 0.15, -0.06], [0.06, 3.2, 0.06], 'axle'], [[-0.1, 0.15, -0.1], [0.1, 0.4, 0.1], 'axle_end']]),
      boom: mk([[[-0.04, 0.85, 0.0], [0.04, 0.93, 1.5], 'axle']]),
      sail: mk([[[-0.015, 0.93, 0], [0.015, 3.0, 0.48], 'sail']]),
      flag: mk([[[-0.01, 0, 0], [0.01, 0.2, 0.55], 'flag']]),
      oar: mk([[[-0.03, -0.03, -0.9], [0.03, 0.03, 0.4], 'axle'], [[-0.02, -0.12, -1.25], [0.02, 0.12, -0.9], 'planks']]),
    };
  }
}

Object.assign(LocalPlayer.prototype, {
  placeBoat(def, held) {
    const g = this.g, p = this.player, w = g.world, [dx, dy, dz] = p.look();
    const hit = raycastBlocks(w, p.x, p.y + p.eye, p.z, dx, dy, dz, REACH, true);
    if (!hit) return;
    const water = T_LIQUID[hit.id] === 1;
    if (!water && !(hit.ny === 1 && T_SOLID[hit.id])) { this.toast('Set a boat on water or on the shore', ''); return; }
    const t = hit.dist;
    const x = p.x + dx * t, z = p.z + dz * t, y = water ? hit.y + 0.6 : hit.y + 1.05;
    const b = new Boat(g, def.boat, x, y, z, p.yaw);
    g.addEntity(b);
    held.n--; if (held.n <= 0) p.inv.held = null;
    this.swingArm(); g.sfx.play('splash');
  },
});

// Wind: a slowly wandering direction and strength, with gusts.
class Wind {
  constructor(seed) { this.dir = (seed % 628) / 100; this.strength = 0.6; this.t = 0; this.gust = 0; }
  update(dt) {
    this.t += dt;
    this.dir += (Math.sin(this.t * 0.013) * 0.6 + Math.sin(this.t * 0.0071 + 2) * 0.4) * dt * 0.02;
    this.gust += ((Math.sin(this.t * 0.37) * Math.sin(this.t * 0.11 + 1) > 0.55 ? 0.35 : 0) - this.gust) * Math.min(1, dt * 0.8);
    this.strength = clamp(0.45 + Math.sin(this.t * 0.021) * 0.2 + Math.sin(this.t * 0.0057 + 3) * 0.15 + this.gust, 0.15, 1);
  }
}
