// ---------------------------------------------------------------------------
// game/ships.js — 0.8.4: loading boats, and a sailing ship you can walk on.
//
// Boats load like carts: carry a chest or barrel to one and it becomes a
// chest boat (open it from your seat: use with an empty hand), or set any
// other block you can carry in it as cargo, or a pet. Sneak + use with an
// empty hand takes it back out.
//
// The sailing ship (three wool and a stick over three rowboats... see the
// recipe) is big: a deck to walk about on with rails round it, a tall mast
// with a square sail, a bowsprit, and a wheel at the back. Climb aboard by
// using it from the water or the shore. At the wheel, use with an empty hand
// to take it: W/S set the sail, A/D steer, and the wind does the rest, as with
// the sailboat. Sneak to let go of the wheel; you stay on deck. Everyone on
// deck moves with the ship. Jump the rail to go over the side. Sneak and hit
// it to break it up (so a stray swing won't).
// ---------------------------------------------------------------------------

const SHIP = { deck: 1.3, halfW: 1.42, bow: -4.2, stern: 4.2, helm: [0, 3.2], cargo: [0, -2.4] };
BOAT_TYPES.ship = { seats: [[0, SHIP.deck, 3.75], [0.9, SHIP.deck + 0.05, -1.4]], item: 'sailing_ship', hp: 14, ship: true };
defItem('sailing_ship', { name: 'Sailing Ship', maxStack: 1, boat: 'ship', rarity: 'rare', desc: 'A ship with a deck to walk on. Use it to climb aboard; use the wheel to sail.' });
RECIPES.push({ out: 'sailing_ship', n: 1, shape: ['WWW', 'WSW', 'BBB'], key: { W: '#wool', S: 'stick', B: 'rowboat' }, group: 'transport' });
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addItem('sailing_ship', p => {
      for (let x = 1; x < 15; x++) for (let y = 11; y < 14; y++) if (y < 13 || (x > 2 && x < 13)) p.set(x, y, shade(H('#7a5430'), y === 11 ? 1.15 : 0.9));
      for (let y = 2; y < 11; y++) p.set(7, y, H('#5a3a1a'));
      for (let y = 3; y < 10; y++) for (let x = 3; x < 12; x++) if (x !== 7 && Math.abs(x - 7) <= 4 - Math.abs(y - 6.5) * 0.25) p.set(x, y, shade(H('#ece2cc'), 0.9 + (x % 3) * 0.05));
      p.set(7, 1, H('#c83a2a')); p.set(8, 1, H('#c83a2a')); p.set(8, 2, H('#c83a2a'));
      for (let x = 0; x < 3; x++) p.set(13 + x * 0.5 | 0, 10 - x, H('#5a3a1a'));
    });
  };
}
Object.defineProperty(Boat.prototype, 'name', { get() { return this.items ? (this.T.ship ? 'Ship\'s Chest' : 'Boat Chest') : itemDef(this.T.item).name; }, configurable: true });

// ---- the ship's deck: where you can stand ----
function shipLocal(s, x, z) { const dx = x - s.x, dz = z - s.z, c = Math.cos(s.yaw), n = Math.sin(s.yaw); return [dx * c - dz * n, dx * n + dz * c]; }
function shipWorld(s, lx, lz) { const c = Math.cos(s.yaw), n = Math.sin(s.yaw); return [s.x + lx * c + lz * n, s.z - lx * n + lz * c]; }
// half the deck's width at a point along it (it narrows toward the bow)
const shipHalfAt = (lz) => lz < SHIP.bow + 2.4 ? SHIP.halfW * clamp((lz - SHIP.bow) / 2.4, 0.15, 1) : SHIP.halfW;
const onShipDeck = (lx, lz, inset = 0) => lz > SHIP.bow + 0.2 + inset && lz < SHIP.stern - inset && Math.abs(lx) < shipHalfAt(lz) - inset;

{
  const baseUpdate = Boat.prototype.update;
  Boat.prototype.update = function (dt) {
    if (this.T.ship) { this.w = 1.3; this.h = 1.6; this.heel *= 0.6; }
    baseUpdate.call(this, dt);
  };
  // the ship's helm: let go and stay on deck
  const baseDismount = Boat.prototype.dismount;
  Boat.prototype.dismount = function (lp) {
    if (!this.T.ship) return baseDismount.call(this, lp);
    const i = this.riders.indexOf(lp); if (i < 0) return;
    this.riders[i] = null; lp.riding = null;
    const [x, z] = shipWorld(this, 0, SHIP.helm[1] + 0.2), p = lp.player;
    p.x = x; p.z = z; p.y = this.y + SHIP.deck; p.vy = 0; p.fallStart = null; lp.aboard = this;
  };
  const baseMount = Boat.prototype.mount;
  Boat.prototype.mount = function (lp) {
    if (!this.T.ship) { if (this.cargo || this.items) { if (this.riders[0]) { lp.toast('The boat is full', ''); return; } } return baseMount.call(this, lp); }
    // the ship: from outside you climb aboard; on deck you take the wheel
    if (lp.aboard !== this) { shipBoard(this, lp); return; }
    if (this.riders[0]) { lp.toast('Someone has the wheel', ''); return; }
    this.riders[0] = lp; lp.riding = this; lp.seat = 0; lp._boatYaw = this.yaw;
    lp.player.yaw = this.yaw;
    lp.toast('W/S set the sail · A/D steer · sneak to let go of the wheel', '');
    this.game.sfx.play('door_close');
  };
  const baseHurt = Boat.prototype.hurt;
  Boat.prototype.hurt = function (amount, src) {
    if (this.T.ship && src && src.attacker && src.attacker.sneaking === false) { if (src.attacker.toast) src.attacker.toast('Sneak and hit it to break up the ship', ''); return 0; }
    return baseHurt.call(this, amount, src);
  };
}
function shipBoard(s, lp) {
  const p = lp.player;
  let [lx, lz] = shipLocal(s, p.x, p.z);
  lz = clamp(lz, SHIP.bow + 1.2, SHIP.stern - 0.6); lx = clamp(lx, -(shipHalfAt(lz) - 0.5), shipHalfAt(lz) - 0.5);
  const [x, z] = shipWorld(s, lx, lz);
  p.x = x; p.z = z; p.y = s.y + SHIP.deck; p.vx = p.vy = p.vz = 0; p.fallStart = null; p.onGround = true; lp.aboard = s;
  lp.toast('Aboard. Use the wheel at the back to sail', '');
  s.game.sfx.material('wood', 'step');
}
// Each frame: carry the people on deck along with the ship, then stand them on it.
{
  const baseUpdate = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const p = this.player, s = this.aboard;
    if (s && (s.remove || this.riding || p.dead)) this.aboard = null;
    const sp = this._shipPose;
    if (this.aboard && sp && sp.s === s) {
      // the ship moved and turned under you since last time: so did you
      const dyaw = s.yaw - sp.yaw, rx = p.x - sp.x, rz = p.z - sp.z, c = Math.cos(dyaw), n = Math.sin(dyaw);
      p.x = s.x + rx * c + rz * n; p.z = s.z - rx * n + rz * c; p.y += s.y - sp.y; p.yaw += dyaw;
    }
    const bob0 = p.bobAmt;
    baseUpdate.call(this, dt, inp);
    if (this.riding || p.dead) { this._shipPose = null; return; }
    // the deck holds you up; the rails keep you on unless you jump them
    let on = null;
    for (const e of this.g.entities) {
      if (!e.isBoat || !e.T.ship || e.remove || Math.abs(e.x - p.x) > 7 || Math.abs(e.z - p.z) > 7) continue;
      const deck = e.y + SHIP.deck, [lx, lz] = shipLocal(e, p.x, p.z);
      if (!onShipDeck(lx, lz)) continue;
      if (p.y < deck - 0.8 || p.y > deck + 0.35 || p.vy > 0.5) { if (this.aboard === e && p.y >= deck - 0.8 && p.y < deck + 1.2) on = e; continue; }
      p.y = deck; p.vy = 0; p.onGround = true; p.fallStart = null; on = e;
    }
    if (on) {
      const [lx, lz] = shipLocal(on, p.x, p.z), inset = 0.3;
      if (p.y < on.y + SHIP.deck + 0.6 && !onShipDeck(lx, lz, inset)) {
        const cz = clamp(lz, SHIP.bow + 0.2 + inset, SHIP.stern - inset), cx = clamp(lx, -(shipHalfAt(cz) - inset), shipHalfAt(cz) - inset);
        [p.x, p.z] = shipWorld(on, cx, cz);
      }
    }
    this.aboard = on;
    this._shipPose = on ? { s: on, x: on.x, y: on.y, z: on.z, yaw: on.yaw } : null;
    // standing on the deck counts as standing: you walk (not slide), and the boards knock underfoot
    if (on && p.onGround) {
      const hs = Math.hypot(p.vx, p.vz);
      p.bobAmt = bob0 + (Math.min(1, hs / 4.3) - bob0) * Math.min(1, dt * 8);
      if (hs > 1) { p.deckStep = (p.deckStep || 0) + hs * dt; if (p.deckStep > 2.2) { p.deckStep = 0; this.g.sfx.material('wood', 'step'); } }
    }
  };
  // the ship you stand on isn't something you point at; its wheel is, when you're beside it
  const baseTarget = LocalPlayer.prototype.updateTarget;
  LocalPlayer.prototype.updateTarget = function () {
    const s = this.aboard;
    if (s) { const was = s.alive; Object.defineProperty(s, 'alive', { get: () => false, configurable: true }); try { baseTarget.call(this); } finally { delete s.alive; } return; }
    baseTarget.call(this);
  };
}
Object.assign(LocalPlayer.prototype, {
  // the camera and the pose: at a ship's wheel you stand
  ridingSeated() { return !!this.riding && !(this.riding.T && this.riding.T.ship); },
});

// ---- loading boats: chests, cargo, and the ship's wheel --------------------------------------------------------
{
  const basePlace = LocalPlayer.prototype.placeCarried;
  LocalPlayer.prototype.placeCarried = function () {
    const g = this.g, c = this.player.carrying, v = this.targetEnt;
    if (c && c.kind === 'block' && v && v.isBoat && !v.remove) {
      if (v.pet || v.cargo || v.items) { this.toast('That boat is already loaded', ''); return; }
      if (!v.T.ship && v.riders[1]) { this.toast('Someone is sitting there', ''); return; }
      const key = c.key || BLOCKS[c.id].key;
      if (key === 'chest' || key === 'barrel' || key === 'trapped_chest') {
        v.items = new Array(27).fill(null); v.cargoKey = key;
        if (c.ent && c.ent.items) c.ent.items.forEach((st, i) => { if (st && i < 27) v.items[i] = st; });
      } else v.cargo = { id: c.id, key, meta: c.meta || 0, ent: c.ent || null };
      this.player.carrying = null; this.swingArm(); g.sfx.play('chest');
      this.toast(v.items ? 'A chest aboard: use with an empty hand from your seat to open it' : 'Loaded', '');
      return;
    }
    return basePlace.call(this);
  };
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const g = this.g, p = this.player, v = this.targetEnt, held = p.inv.held;
    if (!repeat && !fromOff && !p.carrying) {
      // from your seat in a boat with a chest: open it
      const r = this.riding;
      if (r && r.isBoat && r.items && !held && !p.sneaking) { this.swingArm(); g.sfx.play('chest'); this.openInventory('container', { cart: r }); return; }
      // on a ship's deck, beside the wheel: take it
      const s = this.aboard;
      if (s && !this.riding && !held && !p.sneaking) {
        const [hx, hz] = shipWorld(s, SHIP.helm[0], SHIP.helm[1]);
        if (Math.hypot(hx - p.x, hz - p.z) < 1.8) { s.mount(this); this.swingArm(); return; }
        if (s.items) { const [cx, cz] = shipWorld(s, SHIP.cargo[0], SHIP.cargo[1]); if (Math.hypot(cx - p.x, cz - p.z) < 1.8) { this.swingArm(); g.sfx.play('chest'); this.openInventory('container', { cart: s }); return; } }
      }
      // unloading a boat
      if (v && v.isBoat && p.sneaking && !held && !v.pet && (v.cargo || v.items)) {
        if (v.cargo) { const cg = v.cargo; v.cargo = null; p.carrying = { kind: 'block', id: cg.id, key: cg.key, meta: cg.meta, ent: cg.ent }; }
        else { const key = v.cargoKey || 'chest'; p.carrying = { kind: 'block', id: B[key], key, meta: 0, ent: { type: 'chest', items: v.items.map(st => st && cloneStack(st)) } }; v.items = null; v.cargoKey = null; }
        this.swingArm(); g.sfx.play('chest'); this.toast('Carrying ' + BLOCKS[p.carrying.id].name + ' — use to set it down', 'good');
        return;
      }
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  const baseBreak = Boat.prototype.breakApart;
  Boat.prototype.breakApart = function () {
    const g = this.game;
    for (const l of g.locals) if (l.aboard === this) l.aboard = null;
    if (this.items) for (const st of this.items) if (st) g.dropItem(cloneStack(st), this.x, this.y + 0.8, this.z, true);
    if (this.items) g.dropItem(mkStack(this.cargoKey || 'chest', 1), this.x, this.y + 0.8, this.z, true);
    if (this.cargo) { g.dropItem(mkStack(this.cargo.key, 1), this.x, this.y + 0.8, this.z, true); if (this.cargo.ent) g.spillEntity(this.cargo.ent, Math.floor(this.x), Math.floor(this.y), Math.floor(this.z)); }
    this.items = null; this.cargo = null;
    baseBreak.call(this);
  };
  // saved with the boat
  const baseSnap = Boat.prototype.snap;
  Boat.prototype.snap = function () {
    const o = baseSnap.call(this);
    if (this.items) { o.items = this.items.map(st => st && cloneStack(st)); o.ck = this.cargoKey; }
    if (this.cargo) o.cg = this.cargo;
    return o;
  };
  const basePet = boatPetFromSnap;
  boatPetFromSnap = function (game, b, boat) {
    basePet(game, b, boat);
    if (b.items) { boat.items = b.items.slice(0, 27); while (boat.items.length < 27) boat.items.push(null); boat.cargoKey = b.ck || 'chest'; }
    if (b.cg && BLOCKS[b.cg.id]) boat.cargo = b.cg;
  };
}

// ---- drawing: cargo in boats, and the whole ship ----------------------------------------------------------------
{
  let SM = null;
  const build = (gl) => {
    const mk = (boxes) => { const mb = new MeshBuilder(1024); for (const [mn, mx, t] of boxes) addBox(mb, mn, mx, tilesOf(t)); const r = mb.result(); return makeVAO(gl, r.verts, r.idx); };
    const P = 'boat_planks', D = 'dark_oak_planks', R = 'boat_rail', A = 'axle', hw = SHIP.halfW, dk = SHIP.deck;
    const hull = [
      [[-1.25, 0.0, -3.6], [1.25, 0.2, 4.3], P],                                   // keel and bottom
      [[-hw - 0.15, 0.1, -2.0], [-hw, dk + 0.45, 4.3], P], [[hw, 0.1, -2.0], [hw + 0.15, dk + 0.45, 4.3], P],   // sides
      [[-hw - 0.15, dk + 0.45, -2.0], [-hw + 0.05, dk + 0.58, 4.3], R], [[hw - 0.05, dk + 0.45, -2.0], [hw + 0.15, dk + 0.58, 4.3], R],
      [[-hw - 0.15, 0.1, 4.3], [hw + 0.15, dk + 1.0, 4.5], D],                     // the transom, high at the stern
      [[-hw - 0.15, dk + 1.0, 4.28], [hw + 0.15, dk + 1.12, 4.52], R],
      [[-hw + 0.1, dk - 0.15, -2.0], [hw - 0.1, dk, SHIP.stern], P],    // the deck (the bow's slices carry the rest)
    ];
    // the bow: built in thin slices that narrow to the stem, each one solid up to the deck with its own bulwark
    // above, so there are no gaps to see through into the hull
    {
      const z0 = SHIP.bow - 0.25, z1 = -2.0, n = 14, step = (z1 - z0) / n;
      for (let i = 0; i < n; i++) {
        const za = z0 + i * step, zb = za + step + 0.02, zc = (za + zb) / 2;
        const half = Math.max(0.16, shipHalfAt(Math.max(SHIP.bow + 0.05, zc))) + 0.12, t = 1 - i / n;
        const bottom = 0.05 + t * 0.55, rail = dk + 0.5 + t * 0.35;
        hull.push([[-half - 0.03, bottom, za], [half + 0.03, dk, zb], P]);                              // below the deck: solid
        hull.push([[-half - 0.03, dk, za], [-half + 0.12, rail, zb], P], [[half - 0.12, dk, za], [half + 0.03, rail, zb], P]);   // the bulwarks
        hull.push([[-half - 0.05, rail, za], [-half + 0.14, rail + 0.1, zb], R], [[half - 0.14, rail, za], [half + 0.05, rail + 0.1, zb], R]);
      }
      // the very tip, where both sides meet
      hull.push([[-0.2, 0.55, SHIP.bow - 0.45], [0.2, dk + 0.95, SHIP.bow - 0.15], P]);
    }
    hull.push([[-0.07, dk + 0.7, SHIP.bow - 2.6], [0.07, dk + 0.84, SHIP.bow - 0.2], A]); // the bowsprit
    // the wheel on its post
    hull.push([[-0.08, dk, SHIP.helm[1] - 0.08], [0.08, dk + 0.95, SHIP.helm[1] + 0.08], D]);
    hull.push([[-0.42, dk + 0.55, SHIP.helm[1] - 0.12], [0.42, dk + 0.62, SHIP.helm[1] - 0.06], D], [[-0.04, dk + 0.18, SHIP.helm[1] - 0.12], [0.04, dk + 1.0, SHIP.helm[1] - 0.06], D]);
    // a hatch and some barrels about the deck
    hull.push([[-0.6, dk, 0.6], [0.6, dk + 0.12, 1.8], D]);
    SM = {
      hull: mk(hull),
      mast: mk([[[-0.13, dk, -0.62], [0.13, dk + 7.6, -0.36], A], [[-0.55, dk + 5.6, -0.99], [0.55, dk + 5.75, 0.01], D], [[-0.55, dk + 5.75, -0.99], [-0.45, dk + 6.1, 0.01], D], [[0.45, dk + 5.75, -0.99], [0.55, dk + 6.1, 0.01], D]]),
      yard: mk([[[-2.4, -0.07, -0.07], [2.4, 0.07, 0.07], A]]),
      sail: mk([[[-2.2, -1, -0.02], [2.2, 0, 0.02], 'sail']]),
      flag: mk([[[-0.01, 0, 0], [0.01, 0.35, 0.9], 'flag']]),
    };
  };
  const baseDraws = Boat.prototype.draws;
  Boat.prototype.draws = function (out) {
    const gl = this.game.renderer.gl;
    if (!this.T.ship) {
      baseDraws.call(this, out);
      if (this.cargo || this.items) {
        const [x, y, z] = this.seatPos(1), key = this.cargo ? this.cargo.key : this.cargoKey || 'chest', im = itemMesh(gl, key), m = Mat4.create();
        Mat4.translate(m, x - this.x, y - this.y + 0.28, z - this.z); Mat4.rotateY(m, this.yaw); Mat4.scale(m, 0.62, 0.62, 0.62);
        out.push({ mesh: im.mesh, m, px: this.x, py: this.y, pz: this.z, light: this.lightAt(0.8) });
      }
      return;
    }
    if (!SM) build(gl);
    const light = this.lightAt(SHIP.deck + 0.5), base = Mat4.create();
    Mat4.rotateY(base, this.yaw); Mat4.rotateZ(base, this.heel * 0.5 + (this.shakeT > 0 ? Math.sin(this.age * 60) * 0.03 : 0)); Mat4.rotateX(base, Math.sin(this.bob * 1.1) * 0.012);
    const put = (mesh, m, extra) => out.push(Object.assign({ mesh, m, px: this.x, py: this.y, pz: this.z, light }, extra || {}));
    put(SM.hull, base); put(SM.mast, base);
    // the yard swings to the wind; the sail drops as it's let out and bellies with the wind
    const ym = Mat4.create(); ym.set(base); Mat4.translate(ym, 0, SHIP.deck + 7.1, -0.75); Mat4.rotateY(ym, (this.boom || 0) * 0.45);
    put(SM.yard, ym);
    const set = this.sail || 0, fill = set * (0.3 + (this.eff || 0) * 0.7);
    for (let k = 0; k < 3; k++) {
      const sm = Mat4.create(); sm.set(ym);
      Mat4.translate(sm, 0, -0.05 - k * 1.55 * (0.3 + set * 0.7), -Math.sin((k + 0.5) / 3 * Math.PI) * fill * 0.6);
      Mat4.scale(sm, 1 - k * 0.05, 1.6 * (0.3 + set * 0.7), 1);
      put(SM.sail, sm, { noCull: true });
    }
    const wind = this.game.wind || { dir: 0 }, fm = Mat4.create();
    Mat4.translate(fm, 0, SHIP.deck + 7.6, 0); Mat4.rotateY(fm, wind.dir + Math.PI + Math.sin(this.age * 7) * 0.12 - 0);
    put(SM.flag, fm, { noCull: true });
    // cargo on deck
    if (this.cargo || this.items) {
      const [cx, cz] = SHIP.cargo, key = this.cargo ? this.cargo.key : this.cargoKey || 'chest', im = itemMesh(gl, key), m = Mat4.create(); m.set(base);
      Mat4.translate(m, cx, SHIP.deck + 0.5, cz); Mat4.scale(m, 1, 1, 1);
      put(im.mesh, m);
    }
  };
}
