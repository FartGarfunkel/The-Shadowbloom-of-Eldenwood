// ---------------------------------------------------------------------------
// game/boats2.js — 0.8.6: a proper rowboat, and boats are solid things.
//
// The rowboat (and the sailboat's hull) is built like a little clinker boat:
// a keel, a floor that narrows into a pointed bow, plank sides that sweep in
// to a stem post, a square stern, ribs inside, two thwarts to sit on, a rail
// along the top and oarlocks for the oars. Out of it, a boat is something you
// can stand on (getting out leaves you standing on it) and bump into: walk
// into its side and you stop, and one floating on the water drifts off a
// little. Anyone standing on a boat moves with it.
// ---------------------------------------------------------------------------

// a box turned about the upright, for the planks that sweep in to the bow
function boatBox(mb, cx, cy, cz, hx, hy, hz, yaw, tile) {
  const v0 = mb.vcount;
  addBox(mb, [-hx, -hy, -hz], [hx, hy, hz], tilesOf(tile));
  const c = Math.cos(yaw), s = Math.sin(yaw), f = mb.f;
  for (let v = v0; v < mb.vcount; v++) { const o = v * 7, x = f[o], z = f[o + 2]; f[o] = cx + x * c + z * s; f[o + 1] += cy; f[o + 2] = cz - x * s + z * c; }
}
const SMALL_BOAT = { top: 0.6, bow: -1.42, stern: 1.16, half: (lz) => lz > -0.52 ? 0.7 : 0.7 * clamp((lz + 1.42) / 0.9, 0.08, 1) };
{
  const baseBuild = Boat.build;
  Boat.build = function (gl) {
    baseBuild.call(Boat, gl);
    const P = 'boat_planks', R = 'boat_rail', IN = 'planks', mb = new MeshBuilder(1024);
    const b = (cx, cy, cz, hx, hy, hz, yaw, t) => boatBox(mb, cx, cy, cz, hx, hy, hz, yaw, t);
    b(0, 0.03, -0.1, 0.05, 0.05, 1.27, 0, R);                                   // keel
    b(0, 0.06, 0.28, 0.6, 0.025, 0.8, 0, P);                                     // bottom planking
    b(0, 0.11, 0.28, 0.6, 0.03, 0.8, 0, IN);                                     // floor boards
    b(0, 0.1, -0.66, 0.45, 0.04, 0.15, 0, IN); b(0, 0.1, -0.94, 0.28, 0.04, 0.13, 0, IN); b(0, 0.1, -1.18, 0.12, 0.04, 0.11, 0, IN);   // floor narrowing into the bow
    for (const sd of [-1, 1]) {
      b(sd * 0.645, 0.32, 0.28, 0.045, 0.25, 0.82, 0, P);                        // the sides
      const L = Math.hypot(0.6, 0.9), yaw = Math.atan2(-sd * 0.6, -0.9);
      b(sd * 0.345, 0.33, -0.97, 0.045, 0.26, L / 2 + 0.02, yaw, P);              // sweeping in to the bow
      b(sd * 0.645, 0.585, 0.28, 0.08, 0.03, 0.84, 0, R);                       // the rail along the top
      b(sd * 0.345, 0.595, -0.97, 0.075, 0.03, L / 2 + 0.02, yaw, R);
      for (const z of [-0.3, 0.3, 0.85]) b(sd * 0.57, 0.34, z, 0.03, 0.2, 0.035, 0, R);   // ribs
      b(sd * 0.66, 0.65, -0.05, 0.035, 0.05, 0.035, 0, 'iron_block');            // oarlocks
    }
    for (const z of [-0.3, 0.3, 0.85]) b(0, 0.145, z, 0.55, 0.012, 0.035, 0, R);
    b(0, 0.32, 1.125, 0.69, 0.25, 0.045, 0, P);                                  // the square stern
    b(0, 0.585, 1.125, 0.72, 0.03, 0.075, 0, R);
    b(0, 0.35, -1.44, 0.06, 0.31, 0.065, 0, R);                                  // stem post at the bow
    b(0, 0.33, 0.25, 0.6, 0.03, 0.12, 0, IN); b(0, 0.33, -0.55, 0.52, 0.03, 0.11, 0, IN);   // thwarts to sit on
    b(0, 0.33, 0.95, 0.6, 0.03, 0.1, 0, IN);                                     // a stern seat
    const r = mb.result();
    Boat.meshes.hull = makeVAO(gl, r.verts, r.idx);
    // oars: a round loom and a broad blade
    const om = new MeshBuilder(128), o = (cx, cy, cz, hx, hy, hz, t) => boatBox(om, cx, cy, cz, hx, hy, hz, 0, t);
    o(0, 0, -0.25, 0.028, 0.028, 0.65, 'axle'); o(0, 0, 0.42, 0.035, 0.035, 0.07, R); o(0, 0, -1.1, 0.012, 0.11, 0.22, P);
    const r2 = om.result();
    Boat.meshes.oar = makeVAO(gl, r2.verts, r2.idx);
  };
  // the oars sit in their oarlocks
  const baseDraws = Boat.prototype.draws;
  Boat.prototype.draws = function (out, viewer) {
    if (this.T.ship || this.type !== 'rowboat') return baseDraws.call(this, out, viewer);
    const n0 = out.length;
    baseDraws.call(this, out, viewer);
    if (!Boat.meshes) return;
    const oar = Boat.meshes.oar, oars = [];
    for (let i = n0; i < out.length; i++) if (out[i].mesh === oar) oars.push(out[i]);
    const row = this.riders[0] && Math.abs(this.speed) > 0.3 ? this.age * 6 : 0;
    oars.forEach((d, k) => {
      const sd = k === 0 ? -1 : 1, m = Mat4.create();
      Mat4.rotateY(m, this.yaw); Mat4.rotateZ(m, this.heel || 0);
      Mat4.translate(m, sd * 0.68, 0.66, -0.05);
      Mat4.rotateY(m, sd * (1.2 + Math.sin(row) * 0.45) + Math.PI);
      Mat4.rotateX(m, -(0.37 + Math.cos(row) * 0.18));
      d.m = m;
    });
  };
}

// ---- standing on a boat, and bumping into one ------------------------------------------------------
{
  const local = (s, x, z) => { const dx = x - s.x, dz = z - s.z, c = Math.cos(s.yaw), n = Math.sin(s.yaw); return [dx * c - dz * n, dx * n + dz * c]; };
  const world = (s, lx, lz) => { const c = Math.cos(s.yaw), n = Math.sin(s.yaw); return [s.x + lx * c + lz * n, s.z - lx * n + lz * c]; };
  const S = SMALL_BOAT;
  const baseUpdate = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const p = this.player;
    if (this.onBoat && (this.onBoat.remove || this.riding || p.dead)) this.onBoat = null;
    const s = this.onBoat, sp = this._boatPose;
    if (s && sp && sp.s === s) {
      // the boat moved and turned under you: so did you
      const dyaw = s.yaw - sp.yaw, rx = p.x - sp.x, rz = p.z - sp.z, c = Math.cos(dyaw), n = Math.sin(dyaw);
      p.x = s.x + rx * c + rz * n; p.z = s.z - rx * n + rz * c; p.y += s.y - sp.y; p.yaw += dyaw;
    }
    baseUpdate.call(this, dt, inp);
    if (this.riding || p.dead || p.flying) { this.onBoat = null; this._boatPose = null; return; }
    let on = null;
    for (const e of this.g.entities) {
      if (!e.isBoat || (e.T && e.T.ship) || e.remove || Math.abs(e.x - p.x) > 4 || Math.abs(e.z - p.z) > 4) continue;
      const sc = e.T.scale || 1, [lx0, lz0] = local(e, p.x, p.z), lx = lx0 / sc, lz = lz0 / sc, top = e.y + S.top * sc;
      const inside = (m) => lz > S.bow - m && lz < S.stern + m && Math.abs(lx) < S.half(clamp(lz, S.bow, S.stern)) + m;
      // on top of it
      if (inside(0.1) && p.y >= top - 0.45 && p.y <= top + 0.35 && p.vy <= 0.5) { p.y = top; p.vy = 0; p.onGround = true; p.fallStart = null; on = e; continue; }
      // into its side: it's solid, and one floating drifts off a little
      if (inside(0.3) && p.y < top - 0.45 && p.y + 1.7 > e.y) {
        const hw = S.half(clamp(lz, S.bow, S.stern)) + 0.3, dSide = hw - Math.abs(lx), dBow = lz - (S.bow - 0.3), dStern = S.stern + 0.3 - lz;
        let nlx = lx, nlz = lz;
        if (dSide <= dBow && dSide <= dStern) nlx = Math.sign(lx || 1) * hw; else if (dBow < dStern) nlz = S.bow - 0.3; else nlz = S.stern + 0.3;
        const [wx, wz] = world(e, nlx * sc, nlz * sc), ox = wx - p.x, oz = wz - p.z;
        const floats = !e.ghost && e.waterSurface && e.waterSurface() !== null && !e.riders.some(Boolean);
        const k = floats ? 0.7 : 1;
        p.x += ox * k; p.z += oz * k;
        if (floats) { e.x -= ox * 0.3; e.z -= oz * 0.3; }
      }
    }
    this.onBoat = on;
    this._boatPose = on ? { s: on, x: on.x, y: on.y, z: on.z, yaw: on.yaw } : null;
  };
  // getting out of a rowboat or sailboat leaves you standing on it
  const baseDismount = Boat.prototype.dismount;
  Boat.prototype.dismount = function (lp) {
    if (this.T.ship) return baseDismount.call(this, lp);
    const i = this.riders.indexOf(lp);
    const r = baseDismount.call(this, lp);
    if (i < 0) return r;
    const p = lp.player, seat = this.seatPos(i);
    p.x = seat[0]; p.z = seat[2]; p.y = this.y + S.top * (this.T.scale || 1) + 0.01; p.vx = p.vy = p.vz = 0; p.fallStart = null;
    lp.onBoat = this; lp._boatPose = { s: this, x: this.x, y: this.y, z: this.z, yaw: this.yaw };
    return r;
  };
}

// ---- 0.8.6.4: a bigger sailboat, no water inside boats, and a ship you can't walk through -----------------------
// The sailboat is built half again bigger (the sail is up out of your face at the helm). Water no longer shows
// inside a boat: an invisible lid at the waterline inside the hull hides it, the way the classic game does. The
// sailing ship's hull is closed up where the bow narrows, and walking into its side stops you.
BOAT_TYPES.sailboat.scale = 1.6;
BOAT_TYPES.sailboat.seats = [[0, 0.42, 1.38], [0, 0.42, -1.15]];
{
  const baseBuild = Boat.build;
  Boat.build = function (gl) {
    baseBuild.call(Boat, gl);
    // the inside of the hull at the waterline (scale 1: floor to the stern, narrowing into the bow)
    const mb = new MeshBuilder(32), pts = [[-0.6, 1.08], [0.6, 1.08], [0.6, -0.52], [0.38, -0.95], [0.12, -1.3], [-0.12, -1.3], [-0.38, -0.95], [-0.6, -0.52]];
    const v = pts.map(([x, z]) => mb.vert(x, 0, z, 0, 0, 255, 0, 255));
    for (let i = 1; i < pts.length - 1; i++) mb.quad(v[0], v[i], v[i + 1], v[i + 1], false);
    const r = mb.result();
    Boat.meshes.mask = makeVAO(gl, r.verts, r.idx);
  };
  const baseDraws = Boat.prototype.draws;
  Boat.prototype.draws = function (out, viewer) {
    const n0 = out.length;
    baseDraws.call(this, out, viewer);
    const sc = this.T.scale || 1;
    if (sc !== 1) { const S = Mat4.create(); Mat4.scale(S, sc, sc, sc); for (let i = n0; i < out.length; i++) { const m = Mat4.create(); Mat4.multiply(m, S, out[i].m); out[i].m = m; } }
    if (!this.T.ship && Boat.meshes && Boat.meshes.mask) {
      const surf = this.waterSurface();
      if (surf !== null && surf > this.y + 0.15) {
        const m = Mat4.create();
        Mat4.rotateY(m, this.yaw); Mat4.rotateZ(m, this.heel || 0);
        Mat4.translate(m, 0, surf - this.y + 0.02, 0); Mat4.scale(m, sc * 0.98, 1, sc * 0.98);
        out.push({ mesh: Boat.meshes.mask, m, px: this.x, py: this.y, pz: this.z, light: [15, 15], noCull: true, depthOnly: true });
      }
    }
  };
  const baseUpdate = Boat.prototype.update;
  Boat.prototype.update = function (dt) {
    if (this.T.scale && !this._sc) { this._sc = true; this.w *= this.T.scale; }
    return baseUpdate.call(this, dt);
  };
  // the ship's side stops you (from the water or the shore); on deck the ship's own code holds you
  const baseLP = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    baseLP.call(this, dt, inp);
    const p = this.player;
    if (this.riding || p.dead || p.flying) return;
    for (const e of this.g.entities) {
      if (!e.isBoat || !e.T.ship || e.remove || this.aboard === e || Math.abs(e.x - p.x) > 7 || Math.abs(e.z - p.z) > 7) continue;
      if (p.y >= e.y + SHIP.deck - 0.4 || p.y + 1.7 < e.y - 0.2) continue;
      const [lx, lz] = shipLocal(e, p.x, p.z), m = 0.3;
      const cz = clamp(lz, SHIP.bow, SHIP.stern), hw = shipHalfAt(cz) + m;
      if (lz < SHIP.bow - m || lz > SHIP.stern + m || Math.abs(lx) > hw) continue;
      const dSide = hw - Math.abs(lx), dBow = lz - (SHIP.bow - m), dStern = SHIP.stern + m - lz;
      let nlx = lx, nlz = lz;
      if (dSide <= dBow && dSide <= dStern) nlx = Math.sign(lx || 1) * hw; else if (dBow < dStern) nlz = SHIP.bow - m; else nlz = SHIP.stern + m;
      [p.x, p.z] = shipWorld(e, nlx, nlz);
    }
  };
}
