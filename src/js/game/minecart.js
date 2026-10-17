// ---------------------------------------------------------------------------
// game/minecart.js — rails and minecarts.
//
// Rails shape themselves as you lay them: straight, up a slope, or round a
// corner, joining whatever track is beside them. Carts follow the track the way
// Minecraft's do: each rail is a line between the middles of two of its edges
// (a curve is the diagonal), gravity speeds them down slopes, powered rails
// push them up to 8 blocks a second (and brake them when unpowered), detector
// rails send a signal when a cart rolls over, and activator rails tip riders
// out, light TNT carts and lock hopper carts.
//
// Kinds: a plain cart to ride, a chest cart and a hopper cart that carry
// things, a furnace cart that pushes itself while it has coal, and a TNT cart.
// Carts stay where you leave them and are saved with the world.
// ---------------------------------------------------------------------------

const CART_TYPES = {
  minecart: { item: 'minecart', seat: true },
  chest: { item: 'chest_minecart', block: 'chest', slots: 27, name: 'Minecart with Chest' },
  hopper: { item: 'hopper_minecart', block: 'hopper', slots: 5, name: 'Minecart with Hopper' },
  furnace: { item: 'furnace_minecart', block: 'furnace' },
  tnt: { item: 'tnt_minecart', block: 'tnt' },
};
const CART_MAX = 8;       // top speed on rails, blocks a second
const RAIL_Y = 1 / 16;    // carts ride a sixteenth above the rail block's floor

class Minecart extends Entity {
  constructor(game, type, x, y, z, yaw) {
    super(game, x, y, z);
    this.type = CART_TYPES[type] ? type : 'minecart'; this.T = CART_TYPES[this.type];
    this.w = 0.45; this.h = 0.7; this.stepHeight = 0;
    this.yaw = yaw || 0; this.pitch = 0; this.roll = 0;
    this.riders = [null];
    this.isCart = true; this.isVehicle = true;
    this.health = 3; this.hitT = 0; this.shakeT = 0;
    this.items = this.T.slots ? new Array(this.T.slots).fill(null) : null;
    this.fuel = 0; this.pushX = 0; this.pushZ = 0;
    this.fuse = -1; this.locked = false; this.onRail = false; this.rollT = 0; this.hopT = 0;
  }
  get alive() { return !this.remove; }
  get name() { return this.T.name || itemDef(this.T.item).name; }

  // ---- getting in and out ----------------------------------------------------------------------
  mount(lp) {
    if (!this.T.seat) return;
    if (this.riders[0]) { lp.toast('Someone is already riding', ''); return; }
    this.riders[0] = lp; lp.riding = this; lp.seat = 0;
    lp.player.vx = lp.player.vy = lp.player.vz = 0;
    lp.toast('W to push off · sneak to get out', '');
    this.game.sfx.play('door_close');
  }
  dismount(lp) {
    if (this.riders[0] !== lp) return;
    this.riders[0] = null; lp.riding = null;
    const p = lp.player, w = this.game.world;
    for (const r of [1.1, 1.8]) for (let k = 0; k < 8; k++) {
      const a = this.yaw + Math.PI / 2 + k * Math.PI / 4, x = this.x + Math.cos(a) * r, z = this.z - Math.sin(a) * r;
      for (let y = Math.floor(this.y) + 1; y >= Math.floor(this.y) - 1; y--) {
        if (T_SOLID[w.getBlock(Math.floor(x), y - 1, Math.floor(z))] && !collides(w, x - 0.3, y, z - 0.3, x + 0.3, y + 1.8, z + 0.3)) { p.x = x; p.y = y; p.z = z; p.fallStart = null; return; }
      }
    }
    p.y = this.y + 1; p.fallStart = null;
  }
  // Right click.
  use(lp, held, def) {
    const g = this.game;
    if (this.type === 'minecart') { if (!lp.riding) this.mount(lp); return true; }
    if (this.items) { lp.swingArm(); g.sfx.play('chest'); lp.openInventory('container', { cart: this }); return true; }
    if (this.type === 'furnace') {
      if (held && (held.id === 'coal' || held.id === 'charcoal')) {
        held.n--; if (held.n <= 0) lp.player.inv.held = null;
        this.fuel = Math.min(this.fuel + 180, 1800);
        const dx = this.x - lp.player.x, dz = this.z - lp.player.z, d = Math.hypot(dx, dz) || 1;
        this.pushX = dx / d; this.pushZ = dz / d;
        lp.swingArm(); g.sfx.playAt('ignite', this.x, this.y, this.z);
        return true;
      }
      lp.toast('Feed it coal and it pushes itself along', ''); return true;
    }
    if (this.type === 'tnt' && def && def.igniter === 'flint') { this.prime(); lp.wearHeld(1); return true; }
    return false;
  }
  hurt(amount, src) {
    if (this.hitT > 0) return 0;
    this.hitT = 0.25; this.health -= 1; this.shakeT = 0.3;
    this.game.sfx.playAt('hit', this.x, this.y, this.z);
    if (this.health <= 0 || (src && src.attacker && this.game.creative)) this.breakApart();
    return 1;
  }
  breakApart() {
    const g = this.game;
    for (const r of this.riders) if (r) this.dismount(r);
    this.remove = true;
    if (this.fuse > 0) { g.explode(this.x, this.y + 0.5, this.z, 4); return; }
    if (this.items) for (const s of this.items) if (s) g.dropItem(cloneStack(s), this.x, this.y + 0.5, this.z, true);
    if (!g.creative) g.dropItem(mkStack(this.T.item, 1), this.x, this.y + 0.5, this.z, true);
  }
  prime() { if (this.fuse < 0) { this.fuse = 4; this.game.sfx.playAt('fuse', this.x, this.y, this.z); } }

  // ---- the track under the cart --------------------------------------------------------------------
  railHere() {
    const w = this.game.world, x = Math.floor(this.x), z = Math.floor(this.z), y = Math.floor(this.y + 0.02);
    for (const yy of [y, y - 1]) { const id = w.getBlock(x, yy, z); if (BLOCKS[id].rail) return [x, yy, z, id]; }
    return null;
  }
  update(dt) {
    const g = this.game, w = g.world;
    this.age += dt;
    if (this.hitT > 0) this.hitT -= dt;
    if (this.shakeT > 0) this.shakeT -= dt;
    const r0 = this.riders[0];
    if (r0 && (r0.dead || !g.locals.includes(r0))) { this.riders[0] = null; if (r0) r0.riding = null; }
    if (this.fuse > 0) {
      this.fuse -= dt;
      if (Math.random() < dt * 20) g.particles.add({ x: this.x, y: this.y + 1.1, z: this.z, vx: (Math.random() - 0.5) * 0.3, vy: 1, vz: (Math.random() - 0.5) * 0.3, life: 0.5, max: 0.5, size: 0.06, uv: tileUV(ATLAS.tile.smoke ?? 0), light: 0xFF, grav: -0.5 });
      if (this.fuse <= 0) { this.remove = true; for (const r of this.riders) if (r) this.dismount(r); g.explode(this.x, this.y + 0.5, this.z, 4); return; }
    }
    // the rider can give a push
    const rider = this.riders[0];
    if (rider && rider.boatInput && rider.boatInput.mz < -0.3) {
      const p = rider.player, lx = -Math.sin(p.yaw), lz = -Math.cos(p.yaw);
      if (Math.hypot(this.vx, this.vz) < 4) { this.vx += lx * 5 * dt; this.vz += lz * 5 * dt; }
    }
    // people walking into an empty cart shove it; carts bump each other
    for (const l of g.locals) {
      const p = l.player;
      if (l.riding === this || p.dead || Math.abs(p.y - this.y) > 1.2) continue;
      const dx = this.x - p.x, dz = this.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.8 && d > 1e-3) { const k = (0.8 - d) * 14 * dt; this.vx += dx / d * k * 4; this.vz += dz / d * k * 4; }
    }
    for (const e of g.entities) {
      if (e === this || !e.isCart || e.remove || Math.abs(e.y - this.y) > 1) continue;
      const dx = this.x - e.x, dz = this.z - e.z, d = Math.hypot(dx, dz);
      if (d < 1.2 && d > 1e-3) {
        // swap speeds along the line between them (an elastic knock)
        const nx = dx / d, nz = dz / d;
        const va = this.vx * nx + this.vz * nz, vb = e.vx * nx + e.vz * nz;
        if (vb - va > 0) { const dv = vb - va; this.vx += nx * dv; this.vz += nz * dv; e.vx -= nx * dv; e.vz -= nz * dv; }
        this.x += nx * (1.2 - d) * 0.5; this.z += nz * (1.2 - d) * 0.5;
      }
    }
    // furnace carts push themselves
    if (this.fuel > 0) {
      this.fuel -= dt;
      const along = this.vx * this.pushX + this.vz * this.pushZ;
      if (along < 4) { this.vx += this.pushX * 6 * dt; this.vz += this.pushZ * 6 * dt; }
      if (Math.random() < dt * 6) g.particles.add({ x: this.x, y: this.y + 1, z: this.z, vx: 0, vy: 0.8, vz: 0, life: 1.6, max: 1.6, size: 0.14, uv: tileUV(ATLAS.tile.smoke ?? 0), light: 0xFF, grav: -0.2, shrink: true, size0: 0.18 });
    }
    // move in small steps so fast carts don't skip rails
    const sp = Math.hypot(this.vx, this.vz, this.vy);
    const n = Math.max(1, Math.ceil(sp * dt / 0.3));
    for (let i = 0; i < n; i++) this.step(dt / n);
    // hopper carts pick things up
    if (this.type === 'hopper' && !this.locked && (this.hopT += dt) > 0.2) { this.hopT = 0; this.hopperPull(); }
    // carry the rider
    if (rider) {
      const p = rider.player;
      p.x = this.x; p.y = this.y + 0.3; p.z = this.z; p.vx = this.vx; p.vz = this.vz; p.vy = 0;
      p.fallStart = null; p.onGround = true;
    }
    // the rails sing as you go
    const v = Math.hypot(this.vx, this.vz);
    if (this.onRail && v > 1) { this.rollT += dt * v; if (this.rollT > 3) { this.rollT = 0; g.sfx.playAt('rail', this.x, this.y, this.z, 20); } }
    if (this.y < -40) this.remove = true;
  }
  step(dt) {
    const g = this.game, w = g.world;
    const r = this.railHere();
    this.onRail = !!r;
    if (!r) {
      // off the rails: an ordinary heavy thing
      this.vy = Math.max(-30, this.vy - 24 * dt);
      moveEntity(w, this, dt);
      const f = this.onGround ? Math.max(0, 1 - dt * 3) : Math.max(0, 1 - dt * 0.2);
      this.vx *= f; this.vz *= f;
      if (Math.abs(this.vx) + Math.abs(this.vz) > 0.1) this.turnTo(Math.atan2(-this.vx, -this.vz));
      this.pitch *= Math.max(0, 1 - dt * 6);
      return;
    }
    const [bx, by, bz, id] = r, m = w.getMeta(bx, by, bz), b = BLOCKS[id];
    const sh = railShape(id, m), e0 = RAIL_EXITS[sh][0], e1 = RAIL_EXITS[sh][1];
    const p0x = bx + 0.5 + e0[0] * 0.5, p0z = bz + 0.5 + e0[2] * 0.5, p1x = bx + 0.5 + e1[0] * 0.5, p1z = bz + 0.5 + e1[2] * 0.5;
    const dx = p1x - p0x, dz = p1z - p0z, L2 = dx * dx + dz * dz, len = Math.sqrt(L2), ux = dx / len, uz = dz / len;
    let v = this.vx * ux + this.vz * uz;
    this.vy = 0;
    // down the slope
    if (e0[1] !== e1[1]) v += (e1[1] > e0[1] ? -1 : 1) * 5 * dt;
    // powered rails speed you up (or stop you dead when they're off)
    if (b.rail === 'powered') {
      if (m & 8) {
        if (Math.abs(v) > 0.05) v += Math.sign(v) * 22 * dt;
        else {
          // standing start: push away from a wall at one end
          const s0 = T_SOLID[w.getBlock(bx + e0[0], by + e0[1], bz + e0[2])], s1 = T_SOLID[w.getBlock(bx + e1[0], by + e1[1], bz + e1[2])];
          if (s0 && !s1) v = 2; else if (s1 && !s0) v = -2;
        }
      } else { v *= Math.max(0, 1 - dt * 14); if (Math.abs(v) < 0.2) v = 0; }
    }
    if (b.rail === 'activator') this.activate(!!(m & 8));
    // rolling resistance
    v *= Math.pow(this.riders[0] || this.fuel > 0 ? 0.997 : 0.985, dt * 20);
    v = clamp(v, -CART_MAX, CART_MAX);
    // onto the line, then along it
    let t = ((this.x - p0x) * dx + (this.z - p0z) * dz) / L2;
    t = clamp(t, 0, 1);
    let nt = t + v * dt / len;
    if (nt > 1 || nt < 0) {
      // is there track (or open air) past this end?
      const ex = nt > 1 ? e1 : e0;
      const cx = bx + ex[0], cz = bz + ex[2], cy = by + ex[1];
      const more = BLOCKS[w.getBlock(cx, cy, cz)].rail || BLOCKS[w.getBlock(cx, cy - 1, cz)].rail;
      if (!more && T_SOLID[w.getBlock(cx, cy, cz)] && !T_SHAPE[w.getBlock(cx, cy, cz)]) {
        // a wall: bump to a stop (and turn a furnace cart round)
        nt = nt > 1 ? 1 - 0.002 / len : 0.002 / len;
        if (Math.abs(v) > 3) g.sfx.playAt('thud', this.x, this.y, this.z, 16);
        v = 0; this.pushX = -this.pushX; this.pushZ = -this.pushZ;
      }
    }
    const ct = clamp(nt, 0, 1);
    this.x = p0x + dx * nt; this.z = p0z + dz * nt;
    this.y = by + RAIL_Y + lerp(e0[1], e1[1], ct);
    this.vx = ux * v; this.vz = uz * v;
    // face along the track, without spinning round when reversing
    this.turnTo(Math.atan2(-ux, -uz));
    const rise = (e1[1] - e0[1]) / len;
    const wantPitch = Math.atan(rise) * (Math.cos(this.yaw - Math.atan2(-ux, -uz)) > 0 ? 1 : -1);
    this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 12);
  }
  turnTo(target) {
    let d = ((target - this.yaw + Math.PI * 3) % TAU) - Math.PI;
    if (d > Math.PI / 2) d -= Math.PI; else if (d < -Math.PI / 2) d += Math.PI;
    this.yaw += d * 0.6;
  }
  // Over a powered activator rail.
  activate(on) {
    if (this.type === 'hopper') this.locked = on;
    if (!on) return;
    if (this.riders[0]) this.dismount(this.riders[0]);
    if (this.type === 'tnt') this.prime();
  }
  hopperPull() {
    const g = this.game, rs = g.rs;
    const x = Math.floor(this.x), y = Math.floor(this.y + 0.02), z = Math.floor(this.z);
    const me = { items: this.items, kind: 'box', cart: this };
    const src = rs.inv(x, y + 1, z);
    if (src && !src.cart) { if (rs.moveOne(src, 0, me, 1)) rs.changedInv(src); return; }
    for (const e of g.entities) {
      if (!(e instanceof DroppedItem) || e.remove || !e.stack) continue;
      if (Math.abs(e.x - this.x) > 1 || Math.abs(e.z - this.z) > 1 || e.y < this.y - 0.2 || e.y > this.y + 1.5) continue;
      if (rs.insertOne(me, 1, e.stack)) { e.stack.n--; if (e.stack.n <= 0) e.remove = true; return; }
    }
  }

  // ---- saving ------------------------------------------------------------------------------------
  snap() {
    const o = { type: this.type, x: +this.x.toFixed(3), y: +this.y.toFixed(3), z: +this.z.toFixed(3), yaw: +this.yaw.toFixed(3), vx: +this.vx.toFixed(2), vz: +this.vz.toFixed(2) };
    if (this.items) o.items = this.items.map(cloneStack);
    if (this.fuel > 0) { o.fuel = Math.round(this.fuel); o.px = +this.pushX.toFixed(2); o.pz = +this.pushZ.toFixed(2); }
    return o;
  }
  static fromSnap(game, s) {
    const c = new Minecart(game, s.type, s.x, s.y, s.z, s.yaw);
    c.vx = s.vx || 0; c.vz = s.vz || 0;
    if (c.items && s.items) s.items.forEach((it, i) => { if (i < c.items.length) c.items[i] = it; });
    if (s.fuel) { c.fuel = s.fuel; c.pushX = s.px || 0; c.pushZ = s.pz || 0; }
    return c;
  }

  // ---- drawing ------------------------------------------------------------------------------------
  draws(out) {
    const g = this.game, gl = g.renderer.gl;
    if (!Minecart.mesh) Minecart.build(gl);
    const light = this.lightAt(0.5);
    const m = Mat4.create();
    Mat4.rotateY(m, this.yaw);
    Mat4.rotateX(m, this.pitch);
    if (this.shakeT > 0) Mat4.rotateZ(m, Math.sin(this.age * 50) * 0.08);
    out.push({ mesh: Minecart.mesh, m, px: this.x, py: this.y, pz: this.z, light });
    if (this.T.block) {
      const im = itemMesh(gl, this.T.block), bm = Mat4.create(); bm.set(m);
      Mat4.translate(bm, 0, 0.5, 0); Mat4.scale(bm, 0.68, 0.68, 0.68);
      const flash = this.fuse > 0 && Math.floor(this.age * 5) % 2 === 0;
      out.push({ mesh: im.mesh, m: bm, px: this.x, py: this.y, pz: this.z, light: this.fuel > 0 ? [light[0], 13] : light, tint: flash ? [1, 1, 1, 0.5] : null });
    }
  }
  static build(gl) {
    const mb = new MeshBuilder(512);
    const S = tilesOf('minecart_side'), I = tilesOf('minecart_inside'), W = tilesOf('minecart_wheel');
    const box = (a, b, t) => addBox(mb, a, b, t);
    box([-0.44, 0.12, -0.62], [0.44, 0.2, 0.62], I);                          // floor
    box([-0.48, 0.12, -0.62], [-0.4, 0.68, 0.62], S); box([0.4, 0.12, -0.62], [0.48, 0.68, 0.62], S);     // sides
    box([-0.4, 0.12, -0.66], [0.4, 0.68, -0.58], S); box([-0.4, 0.12, 0.58], [0.4, 0.68, 0.66], S);       // ends
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box([sx * 0.42 - 0.06, 0, sz * 0.4 - 0.1], [sx * 0.42 + 0.06, 0.18, sz * 0.4 + 0.1], W);
    const r = mb.result();
    Minecart.mesh = makeVAO(gl, r.verts, r.idx);
  }
}

// ---- laying track -------------------------------------------------------------------------------
// Neighbouring rail in direction h (N E S W): its height difference (0, 1 up, -1 down) or null.
function railNeighbour(w, x, y, z, h) {
  const nx = x + DIRX[h], nz = z + DIRZ[h];
  if (BLOCKS[w.getBlock(nx, y, nz)].rail) return 0;
  if (BLOCKS[w.getBlock(nx, y + 1, nz)].rail) return 1;
  if (BLOCKS[w.getBlock(nx, y - 1, nz)].rail) return -1;
  return null;
}
// The exit of the rail at (x,y,z) toward direction h, if it has one: [dx, dy, dz].
function railExitTo(w, x, y, z, h) {
  const id = w.getBlock(x, y, z); if (!BLOCKS[id].rail) return null;
  for (const e of RAIL_EXITS[railShape(id, w.getMeta(x, y, z))]) if (e[0] === DIRX[h] && e[2] === DIRZ[h]) return e;
  return null;
}
function railRunsTo(w, x, y, z, h) { return !!railExitTo(w, x, y, z, h); }
// Is the rail at (x,y,z) joined to the track in direction h (both ends meeting at the right height)?
function railJoined(w, x, y, z, h) {
  const e = railExitTo(w, x, y, z, h); if (!e) return false;
  const nx = x + DIRX[h], nz = z + DIRZ[h], back = (h + 2) & 3;
  if (e[1]) { const b = railExitTo(w, nx, y + 1, nz, back); return !!b && !b[1]; }
  const same = railExitTo(w, nx, y, nz, back);
  if (same && !same[1]) return true;
  const low = railExitTo(w, nx, y - 1, nz, back);
  return !!low && low[1] === 1;
}
// The shape a rail should take here. `prefer` is the direction to run if nothing decides it.
function railShapeFor(w, x, y, z, id, prefer) {
  const normal = BLOCKS[id].rail === 'normal';
  // a neighbour counts if it's free to join us: it already points our way, or it has an end to spare
  const has = [0, 1, 2, 3].map(h => {
    const dy = railNeighbour(w, x, y, z, h); if (dy === null) return null;
    const nx = x + DIRX[h], nz = z + DIRZ[h], ny = y + dy, back = (h + 2) & 3;
    if (railRunsTo(w, nx, ny, nz, back)) return dy;
    let joins = 0; for (let k = 0; k < 4; k++) if (k !== back && railJoined(w, nx, ny, nz, k)) joins++;
    return joins < 2 ? dy : null;
  });
  const N = has[0] !== null, E = has[1] !== null, S = has[2] !== null, Wd = has[3] !== null;
  if (normal) {
    if (S && E && !N && !Wd) return 6;
    if (S && Wd && !N && !E) return 7;
    if (N && Wd && !S && !E) return 8;
    if (N && E && !S && !Wd) return 9;
  }
  const ns = N || S, ew = E || Wd;
  if (ns && !ew || (!ns && !ew && (prefer & 1) === 0) || (ns && ew && (prefer & 1) === 0)) {
    if (has[0] === 1) return 4;
    if (has[2] === 1) return 5;
    return 0;
  }
  if (has[1] === 1) return 2;
  if (has[3] === 1) return 3;
  return 1;
}
// After a rail is laid, loose ends next to it turn to meet it.
function railRefreshAround(w, x, y, z) {
  for (let h = 0; h < 4; h++) for (const dy of [0, 1, -1]) {
    const nx = x + DIRX[h], ny = y + dy, nz = z + DIRZ[h], id = w.getBlock(nx, ny, nz);
    if (!BLOCKS[id].rail) continue;
    let joins = 0; for (let k = 0; k < 4; k++) if (railJoined(w, nx, ny, nz, k)) joins++;
    if (joins >= 2) continue;
    const m = w.getMeta(nx, ny, nz), cur = railShape(id, m);
    const ex = RAIL_EXITS[cur][0];
    const sh = railShapeFor(w, nx, ny, nz, id, ex[0] ? 1 : 0);
    if (sh !== cur) w.setBlock(nx, ny, nz, id, BLOCKS[id].rail === 'normal' ? sh : (m & 8) | sh);
  }
}

// ---- the world's side ----------------------------------------------------------------------------
Object.assign(Game.prototype, {
  // The cart sitting on the rail at this block, if any.
  cartAt(x, y, z, withItems) {
    for (const e of this.entities) {
      if (!e.isCart || e.remove || (withItems && !e.items)) continue;
      if (Math.floor(e.x) === x && Math.floor(e.z) === z && (Math.floor(e.y + 0.02) === y || Math.floor(e.y + 0.02) === y + 1)) return e;
    }
    return null;
  },
  placeCart(kind, x, y, z, dir) {
    const id = this.world.getBlock(x, y, z);
    if (!BLOCKS[id].rail) return false;
    const sh = railShape(id, this.world.getMeta(x, y, z)), e = RAIL_EXITS[sh][0];
    const c = new Minecart(this, kind, x + 0.5, y + RAIL_Y, z + 0.5, Math.atan2(-e[0], -e[2]));
    this.addEntity(c);
    this.sfx.playAt('rail', x, y, z, 16);
    return c;
  },
  storeCarts() {
    if (!this.meta) return;
    // blocks in the middle of a piston move settle before saving
    for (const e of this.entities) if (e instanceof PistonAnim) e.finish();
    this.meta.carts = this.meta.carts || {};
    this.meta.carts[this.dim] = this.entities.filter(e => e.isCart && !e.remove).map(e => e.snap());
  },
  loadCarts(dim) {
    for (const s of (this.meta.carts && this.meta.carts[dim]) || []) this.addEntity(Minecart.fromSnap(this, s));
  },
});
