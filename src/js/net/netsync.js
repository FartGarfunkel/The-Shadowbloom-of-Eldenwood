// ---------------------------------------------------------------------------
// net/netsync.js — 0.8.6: how the game's own parts take part in LAN play.
//
// Snapshots of creatures and things for guests (and making ghosts from them),
// every block change reported, chunks checked against the host's, guests'
// new arrows, boats, carts and creatures made by the host instead, riding
// handed over to whoever climbs on, what a guest does to an animal sent to
// the host, the host's sounds and puffs passed on, and portal trips taken by
// everyone together.
// ---------------------------------------------------------------------------

// ---- snapshots (host) and ghosts (guest) ---------------------------------------------------------------
const NET_POS = (e) => ({ x: +e.x.toFixed(2), y: +e.y.toFixed(2), z: +e.z.toFixed(2) });
function netSnap(e) {
  if (e.netLocalOnly) return null;
  if (e instanceof Mob) {
    const s = e.snap(); s.k = 'm';
    const pf = typeof petFields === 'function' ? petFields(e) : null; if (pf) s.pf = pf;
    if (e.kept) s.kp = 1;
    if (e.deathTime > 0) s.dt = +e.deathTime.toFixed(2);
    return s;
  }
  if (e instanceof DroppedItem) return e.snap();
  if (typeof HexFlask === 'function' && e instanceof HexFlask) return Object.assign({ i: e.id, k: 'h', kd: e.kind }, NET_POS(e));
  if (e instanceof Projectile) return Object.assign({ i: e.id, k: 'p', kd: e.kind }, NET_POS(e));
  if (e instanceof Arrow) return Object.assign({ i: e.id, k: 'a', r: +(e.yaw || 0).toFixed(2), p: +(e.pitch || 0).toFixed(2), st: e.stuck ? 1 : 0 }, NET_POS(e));
  if (e instanceof Boat) { const s = e.snap(); delete s.pm; return Object.assign(s, { i: e.id, k: 'b', r: +e.yaw.toFixed(3), hl: +(e.heel || 0).toFixed(2), bm: +(e.boom || 0).toFixed(2), sp: +(e.speed || 0).toFixed(2) }); }
  if (e instanceof Minecart) { const s = e.snap(); delete s.pm; return Object.assign(s, { i: e.id, k: 'c', r: +e.yaw.toFixed(3), pt: +(e.pitch || 0).toFixed(3) }); }
  if (e instanceof FallingBlock) return Object.assign({ i: e.id, k: 'f', b: BLOCKS[e.block].key, m: e.meta }, NET_POS(e));
  if (e instanceof PrimedTNT) return Object.assign({ i: e.id, k: 't', f: +e.fuse.toFixed(2) }, NET_POS(e));
  if (typeof LightningBolt === 'function' && e instanceof LightningBolt) return Object.assign({ i: e.id, k: 'l', sd: e.seed }, NET_POS(e));
  return null;
}
// Make an entity from a snapshot: a ghost on a guest, or the real thing on the host (from a guest's request).
function netMake(g, s, ghost, owner) {
  let e = null;
  switch (s.k) {
    case 'm': {
      if (!MOB_TYPES[s.t]) return null;
      e = new Mob(g, s.t, s.x, s.y, s.z);
      if (ghost) e.applySnap(s); else { e.yaw = s.r || 0; if (s.h) e.health = s.h; if (s.c) e.color = s.c; e.sheared = !!s.sh; e.stag = !!s.g; if (s.bb) e.makeBaby(); if (s.v && MODELS[s.v]) e.variant = s.v; if (s.kp) e.kept = true; }
      if (s.pf && typeof applyPetFields === 'function') applyPetFields(e, s.pf);
      if (s.dt) e.deathTime = s.dt;
      break;
    }
    case 'i': e = new DroppedItem(g, mkStack(s.s, s.n), s.x, s.y, s.z); if (ghost) { e.vx = e.vy = e.vz = 0; } break;
    case 'a': e = new Arrow(g, s.x, s.y, s.z, s.vx || 0, s.vy || 0, s.vz || 0, owner || null, s.dmg || 3, s.pk !== undefined ? !!s.pk : true); if (ghost) { e.yaw = s.r; e.pitch = s.p; e.stuck = !!s.st; } break;
    case 'h': if (typeof HexFlask !== 'function') return null; e = new HexFlask(g, s.x, s.y, s.z, 0, 0, 0, owner || null, s.kd); break;
    case 'p': e = new Projectile(g, s.x, s.y, s.z, 0, 0, 0, s.kd, owner || null); break;
    case 'b': if (!BOAT_TYPES[s.type]) return null; e = new Boat(g, s.type, s.x, s.y, s.z, s.yaw); if (s.sail !== undefined) e.sail = s.sail; break;
    case 'c': e = Minecart.fromSnap(g, s); break;
    case 'f': e = new FallingBlock(g, Math.floor(s.x), s.y, Math.floor(s.z), B[s.b] ?? 0, s.m); e.x = s.x; e.z = s.z; break;
    case 't': e = new PrimedTNT(g, Math.floor(s.x), s.y, Math.floor(s.z), s.f); e.x = s.x; e.z = s.z; break;
    case 'l': if (typeof LightningBolt !== 'function') return null; e = new LightningBolt(g, s.x, s.y, s.z); e.seed = s.sd; if (g.weather) g.weather.flashT = 0.35; break;
    default: return null;
  }
  if (ghost) { e.id = s.i; e.ghost = true; e.tx = s.x; e.ty = s.y; e.tz = s.z; if (s.r !== undefined) e.tyaw = s.r; netApply(e, s); }
  return e;
}
function netApply(e, s) {
  if (e.applySnap && (s.k === 'm' || s.k === 'i' || s.k === 'p' || s.k === 'h')) e.applySnap(s);
  else { e.tx = s.x; e.ty = s.y; e.tz = s.z; if (s.r !== undefined) e.tyaw = s.r; }
  switch (s.k) {
    case 'm': if (s.pf && typeof applyPetFields === 'function') applyPetFields(e, s.pf); if (s.dt && !(e.deathTime > 0)) e.deathTime = s.dt; break;
    case 'a': e.stuck = !!s.st; e.pitch = s.p; break;
    case 'b': if (s.sail !== undefined) e.sail = s.sail; e.heel = s.hl || 0; e.boom = s.bm || 0; e.speed = s.sp || 0; for (const k of ['cg', 'cb']) if (s[k] !== undefined) e[k] = s[k]; break;
    case 'c': if (s.items && e.items) s.items.forEach((it, i) => { if (i < e.items.length) e.items[i] = it; }); e.fuel = s.fuel || 0; e.pitch = s.pt || 0; for (const k of ['cg', 'cb']) if (s[k] !== undefined) e[k] = s[k]; break;
    case 't': e.fuse = s.f; break;
  }
}
// What a guest sends about something it's riding, and the host about it when handing it over.
const OWN_KEYS = ['speed', 'turn', 'sail', 'heel', 'boom', 'fuel', 'pushX', 'pushZ', 'health', 'pitch'];
function ownedState(e) {
  const s = { x: +e.x.toFixed(3), y: +e.y.toFixed(3), z: +e.z.toFixed(3), r: +(e.yaw || 0).toFixed(3), vx: +(e.vx || 0).toFixed(3), vy: +(e.vy || 0).toFixed(3), vz: +(e.vz || 0).toFixed(3) };
  for (const k of OWN_KEYS) if (typeof e[k] === 'number') s[k] = +e[k].toFixed(3);
  return s;
}
function applyOwnedState(e, s, asGhost) {
  if (!s) return;
  e.tx = s.x; e.ty = s.y; e.tz = s.z; e.tyaw = s.r;
  if (!asGhost) { e.x = s.x; e.y = s.y; e.z = s.z; e.yaw = s.r; }
  e.vx = s.vx; e.vy = s.vy; e.vz = s.vz;
  for (const k of OWN_KEYS) if (s[k] !== undefined) e[k] = s[k];
}
// What a guest changed on an animal (fed it, tamed it, sheared it, dyed it, saddled it...).
const MOB_SKIP = new Set(['x', 'y', 'z', 'tx', 'ty', 'tz', 'tyaw', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'age', 'walk', 'walkAmt', 'gvx', 'gvz', 'hurtTime', 'deathTime', 'id', 'ghost', 'speedNow', 'onGround', 'inWater', 'hitWall', 'state', 'attack', 'health', 'netMine', 'netOwner', 'remove', 'w', 'h', 'T', 'game', 'type', 'alive']);
function mobFields(e) {
  const o = {};
  for (const k of Object.keys(e)) {
    if (k[0] === '_' || MOB_SKIP.has(k)) continue;
    const v = e[k];
    if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') o[k] = v;
  }
  return o;
}
function applyMobFields(e, f) { if (!(e instanceof Mob)) return; for (const [k, v] of Object.entries(f || {})) if (k[0] !== '_' && !MOB_SKIP.has(k)) e[k] = v; }

// ---- every block change, wherever it comes from -------------------------------------------------------
{
  const baseSet = World.prototype.setBlock;
  World.prototype.setBlock = function (x, y, z, id, meta = 0, opts = {}) {
    const ch = baseSet.call(this, x, y, z, id, meta, opts);
    const g = this.netGame, net = g && g.net;
    if (ch && net && net.open && !opts.fromNet && g.world === this) {
      const q = [x, y, z, id, this.getMeta(x, y, z), opts.netFrom || 0]; q[7] = this.dim;   // (0.9.0.57) which land it's in
      net.blockQ.push(q);
      if (net.role === 'client' && this.chunkAt(x >> 4, z >> 4)) { /* sent with the next 'blk' */ }
    }
    return ch;
  };
  const baseEnsure = World.prototype.ensureChunk;
  World.prototype.ensureChunk = function (cx, cz) {
    const had = this.chunkAt(cx, cz);
    const c = baseEnsure.call(this, cx, cz);
    const g = this.netGame;
    if (!had && c && g && g.net && g.net.role === 'client' && g.world === this) g.net.chunkLoaded(c);
    return c;
  };
  const baseLoad = Game.prototype.loadDimension;
  Game.prototype.loadDimension = function (dim) {
    const r = baseLoad.call(this, dim);
    if (this.world) this.world.netGame = this;
    return r;
  };
}

// ---- ghosts that never had a ghost mode -------------------------------------------------------------
for (const C of [Arrow, Boat, Minecart, FallingBlock, PrimedTNT]) {
  const base = C.prototype.update;
  C.prototype.update = function (dt) {
    if (this.ghost) { this.ghostStep(dt); if (this.fuse !== undefined && this instanceof PrimedTNT) this.fuse -= dt; if (this.bob !== undefined) this.bob += dt; return; }
    return base.call(this, dt);
  };
}
// hitting a boat or a cart that someone else's game is running
for (const C of [Boat, Minecart]) {
  const base = C.prototype.hurt;
  if (!base) continue;
  C.prototype.hurt = function (amount, src = {}) {
    const net = this.game.net;
    if (this.ghost && net) { if (net.role === 'client') net.sendHit(this, amount, src); return 0; }
    return base.call(this, amount, src);
  };
}

// ---- a guest's new arrows, boats, carts and creatures: the host makes the real ones ----------------------
{
  const baseAdd = Game.prototype.addEntity;
  Game.prototype.addEntity = function (e) {
    const net = this.net;
    if (net && net.role === 'client' && !e.ghost && !e.netLocalOnly && !(e instanceof FallingTree) && !(typeof Seat === 'function' && e instanceof Seat) && !(typeof Bobber === 'function' && e instanceof Bobber) && !(typeof Gib === 'function' && e instanceof Gib)) {
      const s = netSnap(e);
      if (s) {
        s.vx = +(e.vx || 0).toFixed(3); s.vy = +(e.vy || 0).toFixed(3); s.vz = +(e.vz || 0).toFixed(3);
        if (e instanceof Arrow) { s.dmg = e.damage; s.pk = e.pickup ? 1 : 0; }
        if (e instanceof Mob) { s.kp = e.kept ? 1 : 0; }
        const li = e.owner && e.owner.index !== undefined ? e.owner.index : 0;
        net.send({ t: 'spawn', s, li });
        return e;
      }
    }
    return baseAdd.call(this, e);
  };
}

// ---- climbing on: the host hands it over to whoever's riding it ----------------------------------------------
for (const C of [Boat, Minecart, Mob]) {
  const baseMount = C.prototype.mount, baseDis = C.prototype.dismount;
  if (!baseMount || !baseDis) continue;
  C.prototype.mount = function (lp) {
    const net = this.game.net;
    if (net && net.role === 'client' && this.ghost && lp && lp.player) {
      if (!this._wantRide) { this._wantRide = () => baseMount.call(this, lp); net.send({ t: 'ride', id: this.id }); }
      return;
    }
    return baseMount.call(this, lp);
  };
  C.prototype.dismount = function (lp) {
    const r = baseDis.call(this, lp);
    const net = this.game.net;
    if (net && net.role === 'client' && this.netMine && !this.game.locals.some(l => l.riding === this)) net.release(this);
    return r;
  };
}

// ---- what a guest does to an animal happens on the host -------------------------------------------------------
for (const name of ['useOnAnimal', 'petUse']) {
  const base = LocalPlayer.prototype[name];
  if (!base) continue;
  LocalPlayer.prototype[name] = function (e, ...rest) {
    const g = this.g;
    if (!(g.net && g.net.role === 'client' && e instanceof Mob && e.ghost)) return base.call(this, e, ...rest);
    const before = mobFields(e);
    const r = base.call(this, e, ...rest);
    const after = mobFields(e), diff = {};
    let n = 0;
    for (const k of Object.keys(after)) if (after[k] !== before[k]) { diff[k] = after[k]; n++; }
    for (const k of Object.keys(before)) if (!(k in after)) { diff[k] = null; n++; }
    if (n) g.net.send({ t: 'mobset', id: e.id, f: diff });
    return r;
  };
}

// ---- the host's sounds and puffs, passed on to guests who are near them ------------------------------------
{
  const basePlayAt = Sfx.prototype.playAt;
  Sfx.prototype.playAt = function (name, x, y, z, range) {
    const g = this.netGame;
    if (g && g.net && g.net.role === 'host') g.net.soundAt(name, x, y, z, range);
    return basePlayAt.call(this, name, x, y, z, range);
  };
  const baseBurst = Game.prototype.burst;
  if (baseBurst) Game.prototype.burst = function (x, y, z, key, n, speed, grav) {
    if (this.net && this.net.role === 'host') this.net.burstAt(x, y, z, key, n, speed, grav);
    return baseBurst.call(this, x, y, z, key, n, speed, grav);
  };
}

// ---- portals: when anyone steps through, everyone goes together ----------------------------------------------
{
  const baseTravel = Game.prototype.travelPortal;
  Game.prototype.travelPortal = async function (portalDim, leadAt) {
    if (!leadAt) return baseTravel.call(this, portalDim);
    // a guest walked into a portal: take everyone through it, from where they stood
    const lp = this.locals[0].player, keep = [lp.x, lp.y, lp.z];
    lp.x = leadAt.x; lp.y = leadAt.y; lp.z = leadAt.z;
    try { return await baseTravel.call(this, portalDim); }
    finally { if (lp.x === leadAt.x && lp.z === leadAt.z) { lp.x = keep[0]; lp.y = keep[1]; lp.z = keep[2]; } }   // the trip didn't happen
  };
}

// ---- leaving a world you joined -------------------------------------------------------------------------------
Game.prototype.leaveGuestWorld = async function (why) {
  if (this._leavingGuest) return;
  this._leavingGuest = true;
  try {
    if (this.net) { this.net.close(); this.net = null; }
    if (this.world) { this.world.unloadAll(); }
    this.renderer.freeAll();
    for (const l of this.locals) l.el.remove();
    disposeEntities(this.entities); this.world = null; this.meta = null; this.locals = []; this.entities = [];
    this.fauna.clear(); this.ambience.stopAll();
    this.input.enabled = false; this.input.releaseLock(true);
    this.startPanorama();
    this.ui.show('title');
    if (why) this.ui.toastMenu(why);
  } finally { this._leavingGuest = false; }
};

// ---- frames: note when one was drawn, so the LAN keep-alive knows when they've stopped ----------------------
{
  const baseLoop = Game.prototype.loop;
  Game.prototype.loop = function (t) { if (!this._timerTick) this._lastFrameAt = performance.now(); return baseLoop.call(this, t); };
  // a tick from the keep-alive timer only runs the world: nobody can see it being drawn
  const baseRender = Game.prototype.renderViews;
  Game.prototype.renderViews = function (dt, R) { if (this._timerTick) return; return baseRender.call(this, dt, R); };
}
