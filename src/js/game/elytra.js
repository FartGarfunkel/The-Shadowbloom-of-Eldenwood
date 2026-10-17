// ---------------------------------------------------------------------------
// game/elytra.js — 0.9.0.19: elytra, the wings from the End ships.
//
// Wear them in the cape slot. Jump while you're falling and they spread: you
// glide where you look. Dive to gather speed, pull up to climb (it costs you
// speed), and land by coming in low and slow. Hit a wall fast and it hurts.
// A gust puff used in flight throws you forward like a rocket.
// ---------------------------------------------------------------------------
defItem('elytra', { name: 'Elytra', maxStack: 1, cape: 'elytra', rarity: 'epic', desc: 'Wear them in the cape slot. Jump while falling to spread them and glide; look down to dive, up to climb. A gust puff in flight is a boost.' });
const ELYTRA_SPAN = 1.15;    // how far the wings spread in flight (radians out from the back)
function elytraWorn(p) { const c = p.inv && p.inv.cape && p.inv.cape.slots[0]; return !!(c && c.id === 'elytra'); }

// ---- the wings' shape: two long leathery panels hung from the shoulders -----------------------------------------------------
// a box turned about its top inner corner, drawn in the cape's frame (x right, y down from the shoulders, z back)
function elytraWing(mb, side, spread, tiles) {
  const W = 9, L = 21, T = 1.2, ang = side * (0.16 + spread), tilt = spread * 0.35;
  const ca = Math.cos(ang), sa = Math.sin(ang), ct = Math.cos(tilt), st = Math.sin(tilt);
  const tf = (x, y, z) => {
    // round z (out from the back), then tip back
    let X = x * ca - y * sa, Y = x * sa + y * ca, Z = z;
    const Y2 = Y * ct - Z * st, Z2 = Y * st + Z * ct;
    return [X * PX + side * 0.5 * PX, Y2 * PX, Z2 * PX + 0.6 * PX];
  };
  const x0 = side > 0 ? 0 : -W, x1 = side > 0 ? W : 0;
  const min = [x0, -L, 0], max = [x1, 0, T];
  for (let f = 0; f < 6; f++) {
    const F = FACES[f], uv = tileUV(tiles[f]), vs = [];
    for (let k = 0; k < 4; k++) {
      const c = F.c[k], t = FACE_UV[k];
      const [x, y, z] = tf(c[0] ? max[0] : min[0], c[1] ? max[1] : min[1], c[2] ? max[2] : min[2]);
      let u = t[0] ? uv[2] : uv[0];
      if (side < 0 && (f === 4 || f === 5)) u = t[0] ? uv[0] : uv[2];      // the left wing is the right one mirrored
      vs.push(mb.vert(x, y, z, u, t[1] ? uv[3] : uv[1], 255, 0, Math.round(Math.min(1, F.shade + 0.08) * 255)));
    }
    mb.quad(vs[0], vs[1], vs[2], vs[3], false);
  }
}
const ELYTRA_MESHES = {};
function elytraMesh(gl, open) {
  const k = open ? 'open' : 'shut';
  if (ELYTRA_MESHES[k]) return ELYTRA_MESHES[k];
  const mb = new MeshBuilder(64), tiles = tilesOf({ all: 'elytra', front: 'elytra_in', back: 'elytra' });
  elytraWing(mb, 1, open ? ELYTRA_SPAN : 0, tiles); elytraWing(mb, -1, open ? ELYTRA_SPAN : 0, tiles);
  const r = mb.result();
  return (ELYTRA_MESHES[k] = makeVAO(gl, r.verts, r.idx));
}
let ELYTRA_NONE = null;
{
  // worn, they take the cape's place on your back (over or under a backpack alike)
  const baseCape = capeMesh, baseSeg = capeSegMesh;
  capeMesh = function (gl, id) { if (id === 'elytra' || id === 'elytra_open') return elytraMesh(gl, id === 'elytra_open'); return baseCape(gl, id); };
  capeSegMesh = function (gl, id, top, bot, thick) {
    if (id === 'elytra' || id === 'elytra_open') {
      if (top === 0) return elytraMesh(gl, id === 'elytra_open');
      if (!ELYTRA_NONE) { const mb = new MeshBuilder(4); addBox(mb, [0, 0, 0], [0.0001, 0.0001, 0.0001], tilesOf({ all: 'elytra' })); const r = mb.result(); ELYTRA_NONE = makeVAO(gl, r.verts, r.idx); }
      return ELYTRA_NONE;
    }
    return baseSeg(gl, id, top, bot, thick);
  };
  const basePose = LocalPlayer.prototype.pose;
  LocalPlayer.prototype.pose = function () {
    const ps = basePose.call(this), p = this.player;
    if (ps.cape === 'elytra') {
      ps.capeA = p.gliding ? 0.05 : Math.min(0.3, (ps.capeA || 0.1) * 0.35);
      ps.capeSway = (ps.capeSway || 0) * 0.3;
      if (p.gliding) { ps.cape = 'elytra_open'; ps.swim = true; ps.glide = true; ps.swimPitch = p.pitch; ps.air = false; ps.back = null; }
    }
    return ps;
  };
  const baseAnim = avatarAnim;
  avatarAnim = function (pose) {
    const A = baseAnim(pose);
    if (pose.glide) {
      // arms swept back along the sides, legs together
      A.armR = [0.15, 0, 0.32]; A.armL = [0.15, 0, -0.32]; A.foreR = [0.05, 0, 0]; A.foreL = [0.05, 0, 0];
      A.legR = [0, 0, 0.04]; A.legL = [0, 0, -0.04]; A.shinR = [0, 0, 0]; A.shinL = [0, 0, 0];
      A.body = [0, 0, 0]; A.lift = 0;
    }
    return A;
  };
}

// ---- flying ------------------------------------------------------------------------------------------------------------------
{
  const baseMove = Player.prototype.move;
  Player.prototype.move = function (world, inp, dt, opts) {
    if (!this.gliding) return baseMove.call(this, world, inp, dt, opts);
    const c = this.contacts || {};
    if (this.onGround || c.water || c.lava || c.ladder || this.flying || this.hang || this.climb || !elytraWorn(this)) {
      this.gliding = false; this.h = PLAYER_H;
      return baseMove.call(this, world, inp, dt, opts);
    }
    this.sneaking = false; this._jumpHeld = inp.jump; this.swimming = false; this.crawling = false;
    const [lx, ly, lz] = this.look();
    let sp = Math.hypot(this.vx, this.vy, this.vz);
    sp += -ly * 17 * dt;                                    // diving gathers speed, climbing spends it
    sp -= sp * 0.05 * dt + 0.5 * dt;                        // and the air takes a little
    if (this.glideBoost > 0) { this.glideBoost -= dt; sp += 26 * dt; }
    sp = clamp(sp, 0, this.glideBoost > 0 ? 46 : 40);
    const k = Math.min(1, dt * 2.4);
    this.vx += (lx * sp - this.vx) * k; this.vz += (lz * sp - this.vz) * k; this.vy += (ly * sp - this.vy) * k;
    // too slow to stay up: it drops
    if (sp < 8) this.vy -= (8 - sp) * 2.2 * dt + 3 * dt;
    this.fallStart = null; this.h = SWIM_H; this.eye = SWIM_EYE;
    const before = Math.hypot(this.vx, this.vy, this.vz);
    moveEntity(world, this, dt);
    const after = Math.hypot(this.vx, this.vy, this.vz);
    if ((this.hitWall || this.onGround || this.hitCeiling) && before - after > 0) this.glideCrash = Math.max(this.glideCrash || 0, before - after);
    const hs = Math.hypot(this.vx, this.vz);
    this.bobAmt *= 0.9;
    return { horizSpeed: hs, landed: this.onGround };
  };
  const baseLP = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const p = this.player, g = this.g;
    // jump while falling, wings on your back: they spread
    const jumpEdge = inp && inp.jump && !this._glideJump; this._glideJump = !!(inp && inp.jump);
    if (jumpEdge && !p.gliding && !p.onGround && !p.flying && !this.riding && !p.dead && elytraWorn(p) && p.vy < 1.5 && !(p.contacts && (p.contacts.water || p.contacts.lava || p.contacts.ladder)) && !p.hang && !p.climb && g.state === 'playing') {
      p.gliding = true; p.slowFallT = 0; p.endDrift = null; p.updraft = null;
      g.sfx.play('elytra_open');
    }
    const r = baseLP.call(this, dt, inp);
    if (p.glideCrash > 0) {
      const loss = p.glideCrash; p.glideCrash = 0;
      if (loss > 13 && !p.dead) { this.hurt(Math.round((loss - 13) * 0.7), { type: 'fall', bypassArmor: true }); g.sfx.play('thud'); }
    }
    if (p.gliding) {
      p.fallStart = null;
      // the rush of air
      if ((this._windT = (this._windT || 0) - dt) <= 0) { this._windT = 0.5; const s = Math.hypot(p.vx, p.vy, p.vz); if (s > 14) g.sfx.play('elytra_wind'); }
      if (p.glideBoost > 0 && Math.random() < dt * 40) g.burst(p.x, p.y + 0.3, p.z, 'gust_ball', 1, 0.5, 0);
    }
    return r;
  };
  // a gust puff in flight: a boost forward
  const baseMilk = LocalPlayer.prototype.drinkMilk;
  LocalPlayer.prototype.drinkMilk = function (held) {
    const d = held && itemDef(held.id), p = this.player;
    if (d && d.gustPuff && p.gliding) {
      if (!this.g.creative) { held.n--; if (held.n <= 0 && p.inv.held === held) p.inv.held = null; }
      p.glideBoost = 1.8;
      this.g.sfx.play('gust'); this.swingArm();
      return;
    }
    return baseMilk.call(this, held);
  };
}
SND_FX.elytra_open = [0.6, 0.45, (b, v, r) => { b.noise(0, 0.35, 'bp', 900, 1.2, 0.5, { sweep: -0.6 }); b.noise(0.05, 0.3, 'lp', 400, 0.7, 0.3); }];
SND_FX.elytra_wind = [0.6, 0.25, (b, v, r) => { b.noise(0, 0.6, 'bp', 700 + r() * 300, 0.8, 0.35); }];

// ---- the pictures --------------------------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('elytra', p => {
      p.noise(H('#8a8a9a'), 0.12);
      // ribs fanning down the wing, a darker leading edge
      for (let y = 0; y < 16; y++) { p.set(0, y, H('#4a4a58')); p.set(1, y, H('#5a5a6a')); }
      for (const x0 of [4, 8, 12]) for (let y = 0; y < 16; y++) { const x = x0 + Math.floor(y / 6); if (x < 16) p.set(x, y, H('#6a6a7a')); }
      for (let x = 0; x < 16; x++) p.set(x, 15, H('#5a5a68'));
    });
    addTile('elytra_in', p => { p.noise(H('#b4b4c4'), 0.1); for (const x0 of [4, 8, 12]) for (let y = 0; y < 16; y++) { const x = x0 + Math.floor(y / 6); if (x < 16) p.set(x, y, H('#9a9aac')); } });
    addItem('elytra', p => p.art(['................', '.oo..........oo.', '.oGo........oGo.', '.oGGo......oGGo.', '.oGgGo....oGgGo.', '.oGgGGo..oGGgGo.', '.oGGgGo..oGgGGo.', '.oGGGgGooGgGGGo.', '.oGGGGGooGGGGGo.', '..oGGgGooGgGGo..', '..oGGGGooGGGGo..', '...oGgGooGgGo...', '...oGGo..oGGo...', '....oo....oo....', '................', '................'],
      { o: H('#3a3a48'), G: H('#9a9aae'), g: H('#6a6a80') }));
  };
}
