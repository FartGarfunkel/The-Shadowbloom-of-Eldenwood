// ---------------------------------------------------------------------------
// game/trains.js — 0.8.4: minecart trains, and pets that ride along.
//
// A chain joins two carts: use a chain on one cart, then on the next (up to
// two joins per cart, so they make a line). Use a chain on two joined carts
// to part them again (you get the chain back). Joined carts keep their
// distance, pulling and pushing each other along the track, like train cars.
//
// The furnace cart is now a double cart: the furnace up front, a seat behind
// it. Feed it coal (you can do that from the seat), climb in and drive: W to
// go forward, S to slow down and back up, sneak to get out. It pulls whatever
// carts are joined to it. Left alone with coal in it, it chugs along by itself
// the old way.
//
// The other carts carry things. Carry a chest or barrel (sneak + use with an
// empty hand, contents and all) and set it in a plain minecart: now it's a
// chest cart. A hopper, furnace or TNT does the same; any other block you can
// carry rides along as cargo. Pets too: carry one and set it in a cart or a
// boat. Sneak + use with an empty hand on the cart (or boat) lifts it back out.
// A cart with something in it has no room for you; a boat has room for you
// and a pet.
// ---------------------------------------------------------------------------

// half a cart's length; joined carts keep their ends a hand's width apart
const cartHalf = (c) => c.type === 'furnace' ? 1.36 : 0.68;
const linkLen = (a, b) => cartHalf(a) + cartHalf(b) + 0.06;
CART_TYPES.furnace.seat = true;

// ---- the clink of a chain ----
Object.assign(SND_FX, {
  chain_link: [0.4, 0.6, (b, v, r) => { for (let i = 0; i < 5; i++) b.modes(i * 0.04 + r() * 0.02, [[1800 + r() * 900, 0.02, 1], [4200 + r() * 800, 0.01, 0.4]], 0.4); }],
});

// ---- joining ----------------------------------------------------------------------------------------
function cartLinks(c) { return c.links || (c.links = []); }
function linkCarts(a, b) { if (!cartLinks(a).includes(b)) a.links.push(b); if (!cartLinks(b).includes(a)) b.links.push(a); }
function unlinkCarts(a, b) { a.links = cartLinks(a).filter(x => x !== b); b.links = cartLinks(b).filter(x => x !== a); }
// every cart in this one's train
function trainOf(c) {
  const out = [c], seen = new Set([c]);
  for (let i = 0; i < out.length; i++) for (const o of cartLinks(out[i])) if (!seen.has(o) && !o.remove) { seen.add(o); out.push(o); }
  return out;
}
{
  const baseUse = Minecart.prototype.use;
  Minecart.prototype.use = function (lp, held, def) {
    const g = this.game;
    if (held && held.id === 'chain') {
      const a = lp._linkFrom;
      lp.swingArm();
      if (!a || a.remove || a === this) { lp._linkFrom = this; lp.toast('Now use the chain on the cart to join it to', ''); g.sfx.playAt('chain_link', this.x, this.y, this.z, 12); return true; }
      lp._linkFrom = null;
      if (Math.hypot(a.x - this.x, a.z - this.z) > 3.5 || Math.abs(a.y - this.y) > 1.5) { lp.toast('Those carts are too far apart', ''); return true; }
      if (cartLinks(a).includes(this)) { unlinkCarts(a, this); lp.give(mkStack('chain', 1)); lp.toast('Carts parted', ''); g.sfx.playAt('chain_link', this.x, this.y, this.z, 12); return true; }
      if (cartLinks(a).length >= 2 || cartLinks(this).length >= 2) { lp.toast('A cart can only be joined at its two ends', ''); return true; }
      linkCarts(a, this);
      if (!g.creative) { held.n--; if (held.n <= 0) lp.player.inv.held = null; }
      lp.toast(trainOf(this).length > 2 ? trainOf(this).length + ' carts joined' : 'Carts joined', 'good');
      g.sfx.playAt('chain_link', this.x, this.y, this.z, 12);
      return true;
    }
    if (this.type === 'minecart' && this.pet) { lp.toast('There\'s a ' + this.pet.type.replace(/_/g, ' ') + ' in this cart (sneak + use to lift it out)', ''); return true; }
    if (this.type === 'furnace' && held && (held.id === 'coal' || held.id === 'charcoal' || held.id === 'coal_block')) {
      if (held.id === 'coal_block') {
        if (!g.creative) { held.n--; if (held.n <= 0) lp.player.inv.held = null; }
        this.fuel = Math.min(this.fuel + 1620, 3600);
        const dx = this.x - lp.player.x, dz = this.z - lp.player.z, d = Math.hypot(dx, dz) || 1;
        this.pushX = dx / d; this.pushZ = dz / d;
        lp.swingArm(); g.sfx.playAt('ignite', this.x, this.y, this.z);
      } else baseUse.call(this, lp, held, def);
      return true;
    }
    if (this.type === 'furnace' && !lp.riding) { if (!this.riders[0]) this.mount(lp); else lp.toast('Someone is driving it', ''); return true; }
    return baseUse.call(this, lp, held, def);
  };
  // when a cart breaks, its joins and its passenger go too
  const baseBreak = Minecart.prototype.breakApart;
  Minecart.prototype.breakApart = function () {
    for (const o of cartLinks(this).slice()) { unlinkCarts(this, o); if (!this.game.creative) this.game.dropItem(mkStack('chain', 1), this.x, this.y + 0.5, this.z, true); }
    if (this.pet) { const m = this.pet; this.pet = null; m.mountedOn = null; m.y += 0.6; }
    const g = this.game;
    if (this.cargo) { const cg = this.cargo; this.cargo = null; g.dropItem(mkStack(cg.key, 1), this.x, this.y + 0.5, this.z, true); if (cg.ent) g.spillEntity(cg.ent, Math.floor(this.x), Math.floor(this.y), Math.floor(this.z)); }
    if (this.T.cargoBlock && !g.creative && this.fuse <= 0) g.dropItem(mkStack(this.T.cargoBlock, 1), this.x, this.y + 0.5, this.z, true);
    baseBreak.call(this);
  };
  const baseMount = Minecart.prototype.mount;
  Minecart.prototype.mount = function (lp) { if (this.pet || this.cargo) { lp.toast(this.pet ? 'There\'s a pet in this cart' : 'This cart is loaded', ''); return; } return baseMount.call(this, lp); };
}

// ---- driving: sit behind the furnace; it pulls whatever is joined to it ---------------------------------------
{
  const baseUpdate = Minecart.prototype.update;
  Minecart.prototype.update = function (dt) {
    if (this.type !== 'furnace') return baseUpdate.call(this, dt);
    const g = this.game, seated = this.riders[0];
    if (!seated) return baseUpdate.call(this, dt);          // left alone with coal, it chugs along the old way
    const carts = trainOf(this), fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), inp = seated.boatInput || {};
    const along = this.vx * fx + this.vz * fz;
    let drive = inp.mz < -0.3 ? 1 : inp.mz > 0.3 ? -1 : 0;
    if (drive && this.fuel <= 0 && !g.creative) { if (!this._noFuelT || g.time - this._noFuelT > 4) { this._noFuelT = g.time; seated.toast('The furnace needs coal (use coal while you sit here)', 'warn'); } drive = 0; }
    if (drive) {
      // W toward the furnace end, S slows you and then backs up; speed builds and falls away gently
      const want = drive > 0 ? 7 : -4, pull = (8 + 2 * carts.length) / carts.length * 2;
      if (drive < 0 && along > 0.2) { for (const c of carts) { const k = Math.max(0, 1 - dt * 3); c.vx *= k; c.vz *= k; } }
      else if ((drive > 0 && along < want) || (drive < 0 && along > want)) { this.vx += fx * drive * pull * dt; this.vz += fz * drive * pull * dt; }
      if (!g.creative) this.fuel = Math.max(0, this.fuel - dt);
      if (Math.random() < dt * 6) g.particles.add({ x: this.x + fx * 0.68, y: this.y + 1.05, z: this.z + fz * 0.68, vx: 0, vy: 0.8, vz: 0, life: 1.6, max: 1.6, size: 0.14, uv: tileUV(ATLAS.tile.smoke ?? 0), light: 0xFF, grav: -0.2, shrink: true, size0: 0.18 });
    }
    // the base cart, without its own pushing (the driver does that)
    const savedFuel = this.fuel, savedInp = seated.boatInput;
    this.fuel = 0; seated.boatInput = null;
    try { baseUpdate.call(this, dt); } finally { this.fuel = savedFuel; seated.boatInput = savedInp; }
    // the driver sits behind the furnace
    if (this.riders[0] === seated) { const p = seated.player; p.x = this.x - fx * 0.68; p.z = this.z - fz * 0.68; }
  };
  // feeding the engine from its own seat
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const c = this.riding, held = this.player.inv.held;
    if (!repeat && !fromOff && c && c.isCart && c.type === 'furnace' && held && (held.id === 'coal' || held.id === 'charcoal' || held.id === 'coal_block')) {
      const add = held.id === 'coal_block' ? 1620 : 180;
      if (c.fuel >= 3600 - 1) { this.toast('The furnace is full', ''); return; }
      c.fuel = Math.min(3600, c.fuel + add);
      if (!this.g.creative) { held.n--; if (held.n <= 0) this.player.inv.held = null; }
      this.swingArm(); this.g.sfx.playAt('ignite', c.x, c.y, c.z);
      this.toast('Coal for ' + Math.round(c.fuel / 60) + ' minutes of driving', 'good');
      return;
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
}
Game.prototype.trainStep = function (dt) {
  const done = new Set();
  for (const c of this.entities) {
    if (!c.isCart || c.remove || !c.links || !c.links.length) continue;
    for (const o of c.links.slice()) {
      if (o.remove) { unlinkCarts(c, o); continue; }
      const key = c.id < o.id ? c.id + ':' + o.id : o.id + ':' + c.id;
      if (done.has(key)) continue; done.add(key);
      let dx = o.x - c.x, dz = o.z - c.z; const dy = o.y - c.y, d = Math.hypot(dx, dz);
      // pulled too far apart (a broken track, a fall): the chain snaps
      if (d > 6 || Math.abs(dy) > 3) { unlinkCarts(c, o); if (!this.creative) this.dropItem(mkStack('chain', 1), (c.x + o.x) / 2, (c.y + o.y) / 2 + 0.5, (c.z + o.z) / 2, true); this.sfx.playAt('chain_link', c.x, c.y, c.z, 16); continue; }
      if (d < 1e-3) continue;
      const nx = dx / d, nz = dz / d, mc = c.type === 'furnace' ? 2 : 1, mo = o.type === 'furnace' ? 2 : 1, tot = mc + mo;
      const err = d - linkLen(c, o);
      if (Math.abs(err) > 0.01) {
        // hold the distance: each moves along the line between them (the rails put them back on the track)
        const k = Math.min(1, dt * 30);
        c.x += nx * err * (mo / tot) * k; c.z += nz * err * (mo / tot) * k;
        o.x -= nx * err * (mc / tot) * k; o.z -= nz * err * (mc / tot) * k;
      }
      // and share their speed along it, the heavier engine counting for more
      const vc = c.vx * nx + c.vz * nz, vo = o.vx * nx + o.vz * nz, avg = (vc * mc + vo * mo) / tot;
      c.vx += nx * (avg - vc); c.vz += nz * (avg - vc); o.vx += nx * (avg - vo); o.vz += nz * (avg - vo);
    }
  }
};
{
  const base = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { base.call(this, dt); try { this.trainStep(dt); } catch (e) { console.warn('trains', e); } };
}

// ---- drawing: the couplings, and the furnace cart as a double cart (furnace in front, a seat behind) ----------------
{
  let BAR = null, SEAT = null;
  const build = (gl) => {
    let mb = new MeshBuilder(64); addBox(mb, [-0.035, -0.035, -0.5], [0.035, 0.035, 0.5], tilesOf('chain')); let r = mb.result(); BAR = makeVAO(gl, r.verts, r.idx);
    mb = new MeshBuilder(128);
    addBox(mb, [-0.38, 0.2, -0.28], [0.38, 0.4, 0.3], tilesOf('spruce_planks'));
    addBox(mb, [-0.38, 0.4, 0.2], [0.38, 0.85, 0.3], tilesOf('spruce_planks'));
    addBox(mb, [-0.36, 0.4, -0.26], [0.36, 0.44, 0.2], tilesOf('red_wool'));
    r = mb.result(); SEAT = makeVAO(gl, r.verts, r.idx);
  };
  const baseDraws = Minecart.prototype.draws;
  Minecart.prototype.draws = function (out) {
    const gl = this.game.renderer.gl;
    if (!BAR) build(gl);
    if (!Minecart.mesh) Minecart.build(gl);
    const light = this.lightAt(0.5);
    if (this.type === 'furnace') {
      const base = Mat4.create(); Mat4.rotateY(base, this.yaw); Mat4.rotateX(base, this.pitch);
      if (this.shakeT > 0) Mat4.rotateZ(base, Math.sin(this.age * 50) * 0.08);
      const at = (z) => { const m = Mat4.create(); m.set(base); Mat4.translate(m, 0, 0, z); return m; };
      out.push({ mesh: Minecart.mesh, m: at(-0.68), px: this.x, py: this.y, pz: this.z, light });
      out.push({ mesh: Minecart.mesh, m: at(0.68), px: this.x, py: this.y, pz: this.z, light });
      const im = itemMesh(gl, 'furnace'), fm = at(-0.68); Mat4.translate(fm, 0, 0.5, 0); Mat4.rotateY(fm, Math.PI); Mat4.scale(fm, 0.7, 0.7, 0.7);
      out.push({ mesh: im.mesh, m: fm, px: this.x, py: this.y, pz: this.z, light: this.fuel > 0 ? [light[0], 13] : light });
      out.push({ mesh: SEAT, m: at(0.68), px: this.x, py: this.y, pz: this.z, light });
    } else if (this.cargo) {
      // a block riding along as cargo
      const m = Mat4.create(); Mat4.rotateY(m, this.yaw); Mat4.rotateX(m, this.pitch);
      out.push({ mesh: Minecart.mesh, m, px: this.x, py: this.y, pz: this.z, light });
      const key = BLOCKS[this.cargo.id] ? BLOCKS[this.cargo.id].key : 'stone', im = itemMesh(gl, key), bm = Mat4.create(); bm.set(m);
      Mat4.translate(bm, 0, 0.5, 0); Mat4.scale(bm, 0.68, 0.68, 0.68);
      out.push({ mesh: im.mesh, m: bm, px: this.x, py: this.y, pz: this.z, light });
    } else baseDraws.call(this, out);
    for (const o of cartLinks(this)) {
      if (o.remove || o.id < this.id) continue;
      const dx = o.x - this.x, dz = o.z - this.z, d = Math.hypot(dx, dz), m = Mat4.create();
      Mat4.translate(m, dx / 2, (o.y - this.y) / 2 + 0.28, dz / 2); Mat4.rotateY(m, Math.atan2(dx, dz)); Mat4.scale(m, 1, 1, Math.max(0.05, d - cartHalf(this) - cartHalf(o) + 0.12));
      out.push({ mesh: BAR, m, px: this.x, py: this.y, pz: this.z, light });
    }
  };
}

// ---- loading carts up: chests, barrels, hoppers, furnaces, TNT, or any block you can carry ----------------------
const CARGO_KIND = { chest: 'chest', barrel: 'chest', trapped_chest: 'chest', hopper: 'hopper', furnace: 'furnace', lit_furnace: 'furnace', tnt: 'tnt' };
function cartBecome(c, type, blockKey) {
  c.type = type; c.T = CART_TYPES[type];
  if (blockKey && blockKey !== c.T.block) c.T = Object.assign({}, c.T, { block: blockKey, item: 'minecart', cargoBlock: blockKey });
  c.items = c.T.slots ? new Array(c.T.slots).fill(null) : null;
  c.fuel = 0; c.fuse = -1; c.locked = false;
}
// ---- saving the joins (and pets riding along) -------------------------------------------------------------
{
  const baseStore = Game.prototype.storeCarts;
  Game.prototype.storeCarts = function () {
    baseStore.call(this);
    const carts = this.entities.filter(e => e.isCart && !e.remove), saved = this.meta && this.meta.carts && this.meta.carts[this.dim];
    if (!saved) return;
    carts.forEach((c, i) => {
      const s = saved[i]; if (!s) return;
      const lk = cartLinks(c).map(o => carts.indexOf(o)).filter(j => j > i); if (lk.length) s.lk = lk;
      if (c.pet && c.pet.alive) s.pm = mobToSnap(c.pet);
      if (c.cargo) s.cg = c.cargo;
      if (c.T.cargoBlock) s.cb = c.T.cargoBlock;
    });
  };
  const baseLoad = Game.prototype.loadCarts;
  Game.prototype.loadCarts = function (dim) {
    const n0 = this.entities.length;
    baseLoad.call(this, dim);
    const saved = (this.meta.carts && this.meta.carts[dim]) || [], made = this.entities.slice(n0).filter(e => e.isCart);
    saved.forEach((s, i) => {
      const c = made[i]; if (!c) return;
      for (const j of s.lk || []) if (made[j]) linkCarts(c, made[j]);
      if (s.pm) seatPet(c, mobFromSnap(this, s.pm, c.x, c.y + 0.3, c.z));
      if (s.cg && BLOCKS[s.cg.id]) c.cargo = s.cg;
      if (s.cb && B[s.cb] !== undefined) c.T = Object.assign({}, c.T, { block: s.cb, item: 'minecart', cargoBlock: s.cb });
    });
  };
  const baseBoatSnap = Boat.prototype.snap;
  Boat.prototype.snap = function () { const o = baseBoatSnap.call(this); if (this.pet && this.pet.alive) o.pm = mobToSnap(this.pet); return o; };
}
// called from the boat loader in game.js
function boatPetFromSnap(game, b, boat) { if (b.pm) seatPet(boat, mobFromSnap(game, b.pm, boat.x, boat.y + 0.4, boat.z)); }

// ---- pets in carts and boats --------------------------------------------------------------------------------
function seatPet(v, m) {
  if (!m) return null;
  if (!m.game.entities.includes(m)) m.game.addEntity(m);
  v.pet = m; m.mountedOn = v; m.riddenBy = null; m.petFoe = null; m.kept = true;
  return m;
}
{
  const basePlace = LocalPlayer.prototype.placeCarried;
  LocalPlayer.prototype.placeCarried = function () {
    const g = this.g, c = this.player.carrying, v = this.targetEnt;
    if (c && c.kind === 'block' && v && v.isCart && !v.remove) {
      if (v.type !== 'minecart' || v.cargo || v.pet) { this.toast('That cart is already loaded', ''); return; }
      if (v.riders[0]) { this.toast('Someone is riding in that cart', ''); return; }
      const key = c.key || BLOCKS[c.id].key, kind = CARGO_KIND[key];
      if (kind) {
        cartBecome(v, kind, key === 'lit_furnace' ? 'furnace' : key);
        if (v.items && c.ent && c.ent.items) c.ent.items.forEach((st, i) => { if (st && i < v.items.length) v.items[i] = st; else if (st) g.dropItem(st, v.x, v.y + 0.8, v.z, true); });
      } else v.cargo = { id: c.id, key, meta: c.meta || 0, ent: c.ent || null };
      this.player.carrying = null; this.swingArm(); g.sfx.play('chest');
      this.toast('Loaded. Sneak + use with an empty hand to unload it', '');
      return;
    }
    if (c && c.kind === 'mob' && v && v.isVehicle && !v.isSeat && !v.remove) {
      if (v.isCart && v.type !== 'minecart') { this.toast('Only a plain minecart has room for it', ''); return; }
      if (v.pet) { this.toast('There\'s already one in there', ''); return; }
      if (v.isCart && v.riders[0]) { this.toast('Someone is riding in that cart', ''); return; }
      if (v.isBoat && v.riders[1]) { this.toast('The boat is full', ''); return; }
      const m = new Mob(g, c.type, v.x, v.y + 0.3, v.z);
      if (c.hp) m.health = c.hp; m.stag = !!c.stag; m.yaw = v.yaw;
      if (c.color) m.color = c.color; m.sheared = !!c.sheared; if (c.baby) { m.makeBaby(); m.growT = c.baby; }
      if (c.variant) m.variant = c.variant;
      applyPetFields(m, c.pet);
      seatPet(v, m);
      this.player.carrying = null; this.swingArm(); g.sfx.play('pop');
      this.toast('Sneak + use with an empty hand to lift it out again', '');
      return;
    }
    return basePlace.call(this);
  };
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const v = this.targetEnt, p = this.player;
    if (!repeat && !fromOff && v && v.isVehicle && p.sneaking && !p.inv.held && !p.carrying) {
      if (v.pet) { const m = v.pet; v.pet = null; m.mountedOn = null; this.pickUpMob(m); return; }
      // unloading a cart: the block comes out in your arms, contents and all
      if (v.isCart && v.cargo) { const cg = v.cargo; v.cargo = null; p.carrying = { kind: 'block', id: cg.id, key: cg.key, meta: cg.meta, ent: cg.ent }; this.swingArm(); this.g.sfx.play('chest'); this.toast('Carrying ' + BLOCKS[cg.id].name + ' — use to set it down', 'good'); return; }
      if (v.isCart && v.type !== 'minecart' && v.fuse < 0 && !v.riders[0]) {
        const key = v.T.cargoBlock || v.T.block, ent = v.items ? { type: 'chest', items: v.items.map(st => st && cloneStack(st)) } : null;
        cartBecome(v, 'minecart');
        p.carrying = { kind: 'block', id: B[key], key, meta: 0, ent };
        this.swingArm(); this.g.sfx.play('chest'); this.toast('Carrying ' + BLOCKS[B[key]].name + ' — use to set it down', 'good');
        return;
      }
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  // a boat with a pet aboard has room for one more
  const baseMount = Boat.prototype.mount;
  Boat.prototype.mount = function (lp) {
    if (this.pet && this.riders[0]) { lp.toast('The boat is full', ''); return; }
    return baseMount.call(this, lp);
  };
  const baseBreak = Boat.prototype.breakApart;
  Boat.prototype.breakApart = function () { if (this.pet) { const m = this.pet; this.pet = null; m.mountedOn = null; m.y += 0.6; } baseBreak.call(this); };
}
