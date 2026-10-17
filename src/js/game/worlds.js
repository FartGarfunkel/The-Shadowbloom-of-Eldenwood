// ---------------------------------------------------------------------------
// game/worlds.js — 0.9.0.18: one world, everyone where they are.
//
// The Skylands, the Overworld, the Ember Depths (and what lies under them)
// are one world stacked up, and each player is wherever they've gone in it:
// on one screen, one of you can be up in the Skylands while the other digs
// in the Depths. Going through a portal, falling between the layers, opening
// your pocket: only you go (Herobrine's realm is the exception: the final fight
// takes everyone who's playing). And the places you can see into stay alive:
// look through a portal and whatever's over there (a creature, the other
// player) is there, moving, as if it were in front of you.
//
// How: each layer someone is in (or is looking into) has its own context, its
// world with its creatures, items, machines and particles. Each frame every
// context with players in it runs as the whole game did before (the same code,
// with the game's world and creatures switched over to that context's), and
// the ones only being looked into keep their creatures moving. A world is only
// ever held once: the background worlds made ready for falling through or
// looking into share the very same world as anyone playing in it.
// ---------------------------------------------------------------------------
const CTX_KEYS = ['world', 'dim', 'entities', 'fauna', 'mech', 'rs', 'damage', 'particles', 'shadow', 'tickAcc', 'randAcc', 'spawnAcc', 'furnAcc', 'jukeAcc', 'env'];
const PV_KEYS = ['shadows', 'wins', 'lives', 'live', 'fades', 'dests', 'lastS', 'scanT'];
const SFX_MUTE = new Proxy({}, { get: (t, k) => k === 'listeners' ? () => [] : () => null });
let GAME = null;
function pvFresh() { return { shadows: new Map(), wins: [], lives: [], live: null, fades: new Map(), dests: new Map(), lastS: {}, scanT: 0 }; }

Object.assign(Game.prototype, {
  // ---- contexts ----------------------------------------------------------------------------------------------------
  ctxCapture(ctx) { for (const k of CTX_KEYS) ctx[k] = this[k]; ctx.pv = ctx.pv || {}; for (const k of PV_KEYS) ctx.pv[k] = PV[k]; if (typeof RIFT !== 'undefined') ctx.tears = RIFT.tears; return ctx; },
  ctxApply(ctx) { for (const k of CTX_KEYS) this[k] = ctx[k]; for (const k of PV_KEYS) PV[k] = ctx.pv[k]; if (typeof RIFT !== 'undefined') RIFT.tears = ctx.tears || (ctx.tears = []); this.ctx = ctx; worldFluidRules(ctx.dim); },
  useCtx(ctx) { if (!ctx || this.ctx === ctx) return; if (this.ctx && this.ctxs && [...this.ctxs.values()].includes(this.ctx)) this.ctxCapture(this.ctx); this.ctxApply(ctx); },
  ctxInit() { GAME = this; this.ctx = this.ctxCapture({ dim: this.dim, pv: {} }); this.ctxs = new Map([[this.dim, this.ctx]]); this._moves = []; },
  ctxOf(lp) { return (this.ctxs && this.ctxs.get(lp.player.dim)) || this.ctx; },
  allLocals() { return this._allLocals || this.locals; },
  multiOK() { return !this.isGuest && !(this.net && this.net.peers && this.net.peers.size > 0); },
  // any world of this dimension already held (someone's in it, or it's being fallen into or looked into)
  worldOfDim(dim) {
    if (!this.ctxs) return null;
    if (this.ctx) this.ctxCapture(this.ctx);
    for (const c of this.ctxs.values()) if (c.dim === dim && c.world) return c.world;
    for (const c of this.ctxs.values()) {
      if (c.shadow && c.shadow.dim === dim && c.shadow.world) return c.shadow.world;
      for (const sh of (c.pv && c.pv.shadows ? c.pv.shadows.values() : [])) if (sh.dim === dim && sh.world) return sh.world;
    }
    return null;
  },
  worldInUse(W, except) {
    if (!this.ctxs) return false;
    if (this.ctx) this.ctxCapture(this.ctx);
    for (const c of this.ctxs.values()) {
      if (c === except) continue;
      if (c.world === W) return true;
      if (c.shadow && c.shadow.world === W) return true;
      for (const sh of (c.pv && c.pv.shadows ? c.pv.shadows.values() : [])) if (sh.world === W) return true;
    }
    return false;
  },
  // a context for a layer nobody's in yet: its world (the one already held, if any) with its own creatures
  makeCtx(dim) {
    if (this.ctx) this.ctxCapture(this.ctx);
    const prev = this.ctx, w = this.worldOfDim(dim) || new World(dim, this.meta.seed, this.records, this.meta.genVersion || 1);
    const ctx = { dim, pv: pvFresh() };
    this.ctx = ctx;
    for (const k of PV_KEYS) PV[k] = ctx.pv[k];
    if (typeof RIFT !== 'undefined') RIFT.tears = ctx.tears = [];   // the rift's tears are drawn by whichever layer they're in
    const fm = this.fauna && this.fauna.meshes;
    this.entities = []; this.fauna = new Fauna(this); if (fm) this.fauna.meshes = fm;
    this.mech = new Mechanics(this); this.rs = new Redstone(this); this.particles = new Particles(); this.damage = null; this.shadow = null;
    this.tickAcc = this.randAcc = this.spawnAcc = this.furnAcc = this.jukeAcc = 0;
    this._preWorld = w; this._keepWorld = prev ? prev.world : null; this._ctxBuild = true;
    try { this.loadDimension(dim); } finally { this._ctxBuild = false; this._preWorld = null; this._keepWorld = null; }
    this.env = this.computeEnv(dim);
    this.ctxCapture(ctx);
    this.ctxs.set(dim, ctx);
    return ctx;
  },
  // a layer nobody's in or looking into any more: what's kept there is stored, and its world let go
  retireCtx(ctx) {
    const back = this.ctx === ctx ? null : this.ctx;
    this.useCtx(ctx);
    const all = this.locals; this.locals = [];
    try { this.storeBoats(); this.storeCarts(); this.storeAnimals(); } catch (e) { console.warn('retire', e); }
    this.locals = all;
    const w = ctx.world, main = back ? back.world : null;
    if (this.shadow) { const sh = this.shadow; this.shadow = null; ctx.shadow = null; if (sh.world && !this.worldInUse(sh.world, ctx)) { flushWorld(this, sh.world, main); sh.world.unloadAll(); } }
    for (const [d, sh] of [...PV.shadows]) { PV.shadows.delete(d); if (sh.world && !this.worldInUse(sh.world, ctx)) { flushWorld(this, sh.world, main); sh.world.unloadAll(); } }
    this.ctxs.delete(ctx.dim);
    if (back) { this.useCtx(back); disposeEntities(ctx.entities); }
    if (w && !this.worldInUse(w)) { flushWorld(this, w, main); w.unloadAll(); }
    else if (w && main) flushWorld(this, w, main);
  },
  // ---- moving one player to another layer -----------------------------------------------------------------------
  queueMove(lp, to, place, after) { (this._moves || (this._moves = [])).push({ lp, to, place, after }); },
  applyMoves() {
    const list = this._moves; if (!list || !list.length) return;
    this._moves = [];
    for (const mv of list) { try { this.moveLocal(mv); } catch (e) { console.error('move', e); } }
  },
  moveLocal({ lp, to, place, after }) {
    const all = this.allLocals(), prevAll = this._allLocals;
    const src = this.ctxOf(lp);
    this._allLocals = all; this.useCtx(src); this.locals = [lp];
    try { this.moveInner(lp, to, place, after, src); }
    finally { this.locals = all; this._allLocals = prevAll; this.useCtx(this.ctxOf(all[0])); }
    PV.scanT = 0;
    setTimeout(() => { if (this.state === 'playing') this.saveNow('travel'); }, 1200);
  },
  moveInner(lp, to, place, after, src) {
    const carried = typeof takeMounts === 'function' ? takeMounts(this) : [];
    if (typeof this.storeAnimals === 'function') { /* the creatures left behind stay where they are, in that layer */ }
    const dst = this.ctxs.get(to) || this.makeCtx(to);
    this.useCtx(dst); this.locals = [lp];
    lp.mining = null; lp.player.dim = to; if (lp.sleeping) lp.sleeping = null;
    const p = lp.player;
    if (place) place(p);
    p.fallStart = p.fallStart ?? null; p.portalTime = 0;
    if (typeof restoreMounts === 'function') restoreMounts(this, carried, true);
    const pcx = Math.floor(p.x) >> 4, pcz = Math.floor(p.z) >> 4;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.world.ensureChunk(pcx + dx, pcz + dz);
    unstick(this.world, p);
    if (lp.hud && lp.hud.dimName) lp.hud.dimName(DIM_NAME[to]);
    const f = this.meta.flags;
    if (to === DIM.SKYLANDS && !f.skyVisited) { f.skyVisited = true; lp.grantXP(40); }
    if (to === DIM.DEPTHS && !f.depthsVisited) { f.depthsVisited = true; lp.grantXP(40); }
    if (after) after(lp);
    src.leftT = this.time;
  },
  // contexts with nobody in them are kept while someone's looking into them (or for a little while after), then let go
  reconcileCtxs() {
    if (!this.ctxs || this.ctxs.size < 2) return;
    const all = this.allLocals(), live = new Set(all.map(l => l.player.dim));
    if (this.ctx) this.ctxCapture(this.ctx);
    const watched = new Set();
    for (const c of this.ctxs.values()) if (live.has(c.dim)) for (const list of (c.pv.lives || [])) for (const L of list || []) watched.add(L.dest.dim);
    for (const c of [...this.ctxs.values()]) {
      if (live.has(c.dim)) { c.watched = false; continue; }
      c.watched = watched.has(c.dim);
      if (!c.watched && this.time - (c.leftT || 0) > 8) this.retireCtx(c);
    }
    this.useCtx(this.ctxOf(all[0]));
  },
  // the creatures over there keep going while someone looks in (with nobody near, they'd wander off for good)
  watchTick(ctx, dt) {
    this.useCtx(ctx);
    const sfx = this.sfx; this.sfx = SFX_MUTE;
    this._phantoms = [];
    for (const c of this.ctxs.values()) for (const list of (c.pv && c.pv.lives) || []) for (const L of list || []) if (L.dest.dim === ctx.dim)
      this._phantoms.push({ x: L.dest.c[0], y: L.dest.c[1] + 40, z: L.dest.c[2], dead: false, phantom: true, sneaking: true, hurt() { return 0; }, ignite() {}, player: null });
    try {
      this.updateEntities(dt);
      this.particles.update(dt, this.world);
      const ex = this.world._extra;
      if (ex && ex.c.length && performance.now() - ex.t < 1500) this.world.stream(ex.c.slice(), 3, 1.5, (c) => this.meshInto(this.world, c));
    } finally { this._phantoms = null; this.sfx = sfx; }
  },
});
// someone arriving a hair inside the ground (a path block on one side, a full block on the other) stands on it instead
function unstick(w, p) {
  for (let k = 0; k < 4; k++) {
    const fx = Math.floor(p.x), fy = Math.floor(p.y), fz = Math.floor(p.z);
    if (!T_SOLID[w.getBlock(fx, fy, fz)] && !T_SOLID[w.getBlock(fx, fy + 1, fz)]) return;
    p.y = fy + 1; if (p.vy < 0) p.vy = 0;
  }
}
// chunks changed in a world being let go are written into the record book, to be saved
function flushWorld(g, w, main) {
  for (const c of w.chunks.values()) if (c.modified && c.dirty) { g.records.set(c.key, encodeChunk(c)); (main || g.world || w).unsaved.add(c.key); c.dirty = false; }
  if (main && main !== w) { for (const k of w.unsaved) main.unsaved.add(k); w.unsaved.clear(); }
}
// a background world being made ready: if it's someone's world (or another's background), only ask it to keep
// that place loaded; its owner does the loading (so nobody's ground is unloaded from under them)
function worldStream(g, w, centers, R, budget, fn) {
  if (g && g.ctxs) for (const c of g.ctxs.values()) if (c.world === w && c !== g.ctx && (g.allLocals().some(l => l.player.dim === c.dim))) {
    const ex = w._extra && performance.now() - w._extra.t < 500 ? w._extra : (w._extra = { c: [], t: performance.now() });
    for (const cc of centers) if (!ex.c.some(e => Math.abs(e[0] - cc[0]) < 8 && Math.abs(e[1] - cc[1]) < 8)) ex.c.push(cc);
    ex.t = performance.now();
    return { pending: 0 };
  }
  return w.stream(centers, R, budget, fn);
}
{
  // a world asked to keep extra places loaded (where someone's looking in from elsewhere) keeps them too
  const baseStream = World.prototype.stream;
  World.prototype.stream = function (centers, R, budget, meshFn, lightFn) {
    const ex = this._extra;
    if (ex && ex.c.length && performance.now() - ex.t < 1500 && GAME && GAME.ctxs && [...GAME.ctxs.values()].some(c => c.world === this)) centers = centers.concat(ex.c);
    return baseStream.call(this, centers, R, budget, meshFn, lightFn);
  };
  // a world still held elsewhere isn't unloaded
  const baseUnload = World.prototype.unloadAll;
  World.prototype.unloadAll = function () {
    if (GAME && GAME.ctxs && GAME._unloadOK !== this && !GAME._quitting && GAME.worldInUse(this)) return;
    return baseUnload.call(this);
  };
}
{
  // the background worlds (falling through, looking into) share any world already held
  const baseShadow = Game.prototype.makeShadowWorld;
  Game.prototype.makeShadowWorld = function (dim) { return this.worldOfDim(dim) || baseShadow.call(this, dim); };
  // a world of creatures: only those in the context being run (and the watchers of a looked-into world)
  const basePawns = Game.prototype.pawns;
  Game.prototype.pawns = function () { return this._phantoms || basePawns.call(this); };
  // the screen is cleared once a frame, however many layers are drawn into it
  const baseBegin = Renderer.prototype.beginFrame;
  Renderer.prototype.beginFrame = function (scale, env) { if (this._keepFrame) return; return baseBegin.call(this, scale, env); };
  // who's acting (for travel started from inside a player's own update)
  const baseLPU = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) { const g = this.g, prev = g._actor; g._actor = this; try { return baseLPU.call(this, dt, inp); } finally { g._actor = prev; } };
}
{
  // starting a world: one context
  const baseStart = Game.prototype.startPlaying;
  Game.prototype.startPlaying = function (...a) {
    const r = baseStart.apply(this, a);
    if (!this.ctxs || !this.ctxs.has(this.dim) || this.ctx.world !== this.world) this.ctxInit();
    // anyone who was somewhere else when the world was saved goes back there
    for (const l of this.locals) if (l.index > 0 && l._savedDim !== undefined && l._savedDim !== this.dim && this.multiOK()) { const sv = l._savedPos, d = l._savedDim; this.queueMove(l, d, (p) => { p.x = sv[0]; p.y = sv[1]; p.z = sv[2]; }); }
    return r;
  };
  // every frame: each layer someone's in runs, the ones being looked into keep moving
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    const playing = this.ctxs && this.world && (this.state === 'playing' || this.state === 'paused');
    if (!playing || this.ctxs.size < 2) {
      const r = baseFrame.call(this, dt);
      if (playing) { this.applyMoves(); if (this.ctxs.size > 1) this.reconcileCtxs(); }
      return r;
    }
    const all = this.locals, primary = this.ctxOf(all[0]);
    this.ctxCapture(this.ctx);
    const order = [primary, ...[...this.ctxs.values()].filter(c => c !== primary && all.some(l => l.player.dim === c.dim))];
    const watched = [...this.ctxs.values()].filter(c => !order.includes(c));
    this._allLocals = all;
    try {
      order.forEach((ctx, k) => {
        this.useCtx(ctx);
        this.locals = all.filter(l => l.player.dim === ctx.dim);
        this._pass = k; this.renderer._keepFrame = k > 0;
        baseFrame.call(this, dt);
      });
      this._pass = 9; this.renderer._keepFrame = true;
      for (const ctx of watched) { this.locals = []; this.watchTick(ctx, dt); }
    } finally {
      this._pass = 0; this.renderer._keepFrame = false;
      this.locals = all; this._allLocals = null;
      this.useCtx(primary);
    }
    this.applyMoves();
    if ((this._recT = (this._recT || 0) - dt) <= 0) { this._recT = 1; this.reconcileCtxs(); }
  };
  // slow travel (the loading screen kind): alone, the old way, with any other layers let go first;
  // with others playing on this screen, only whoever's going goes (all of you, into his realm)
  const baseChange = Game.prototype.changeDimension;
  Game.prototype.changeDimension = async function (to, place) {
    const all = this.allLocals();
    if (all.length > 1 && this.multiOK() && this.ctxs) {
      const movers = to === DIM.REALM ? all : [this._actor || all[0]];
      for (const lp of movers) this.queueMove(lp, to, () => { const keep = this.locals; this.locals = [lp]; try { place(); } finally { this.locals = keep; } });
      this.sfx.play('portal');
      return;
    }
    if (this.ctxs) for (const c of [...this.ctxs.values()]) if (c !== this.ctx) this.retireCtx(c);
    return baseChange.call(this, to, place);
  };
  // the layer being played changes in place (slow travel, alone): this context changes with it
  const baseLoad = Game.prototype.loadDimension;
  Game.prototype.loadDimension = function (dim) {
    if (this._ctxBuild || !this.ctxs) return baseLoad.call(this, dim);
    this._unloadOK = this._keepWorld === this.world ? null : this.world;
    try { baseLoad.call(this, dim); } finally { this._unloadOK = null; }
    const ctx = this.ctx;
    for (const [d, c] of [...this.ctxs]) if (c === ctx) this.ctxs.delete(d);
    ctx.dim = dim; this.ctxCapture(ctx); this.ctxs.set(dim, ctx);
  };
  // saving: every layer's changes, everyone's place
  const baseSave = Game.prototype.saveNow;
  Game.prototype.saveNow = async function (reason) {
    if (!this.ctxs || this.isGuest || this._pass) return baseSave.call(this, reason);
    const all = this.allLocals();
    if (!this.meta || !all.length || !this.world) return;
    if (this.saving) { this._saveAgain = true; return; }
    this.saving = true;
    const L0 = all[0]; L0.hud.saving(true);
    try {
      const primary = this.ctxOf(L0), seen = new Set(), chunks = [];
      this.ctxCapture(this.ctx);
      const take = (w) => { if (w && !seen.has(w)) { seen.add(w); chunks.push(...w.collectDirty()); } };
      for (const c of this.ctxs.values()) {
        take(c.world); if (c.shadow) take(c.shadow.world);
        for (const sh of (c.pv && c.pv.shadows ? c.pv.shadows.values() : [])) take(sh.world);
        if (c !== primary) { this.useCtx(c); const keep = this.locals; this.locals = []; try { this.storeBoats(); this.storeCarts(); this.storeAnimals(); } finally { this.locals = keep; } }
      }
      this.useCtx(primary);
      const keep = this.locals; this.locals = all;
      let rec; try { rec = this.worldRecord(); } finally { this.locals = keep; }
      await this.save.saveWorld(rec, chunks);
      this.lastSave = Date.now();
    } catch (e) {
      console.error('Save failed', e);
      L0.hud.toast('Saving to this browser failed. Use "Download world backup" in the pause menu to keep a copy.', 'warn');
    } finally {
      this.saving = false; L0.hud.saving(false);
      if (this._saveAgain) { this._saveAgain = false; this.saveNow('again'); }
    }
  };
  // a player saved in another layer than the first goes back there when they join
  const baseAdd = Game.prototype.addLocal;
  Game.prototype.addLocal = function (padIndex) {
    const i = this.locals.length, saved = this.meta && this.meta.coPlayers && this.meta.coPlayers[i];
    const lp = baseAdd.call(this, padIndex);
    if (lp && saved && saved.dim !== undefined && saved.dim !== this.dim && this.ctxs && this.multiOK() && this.state === 'playing') {
      this.queueMove(lp, saved.dim, (p) => { p.load(saved); p.dim = saved.dim; });
    }
    return lp;
  };
}
// ---- the stacked layers: each player falls, climbs or digs through on their own -----------------------------------
stackedTick = function (g, lp) {
  if (g.isGuest || g._traveling || g.state !== 'playing') return;
  if (!g.multiOK() && lp.index !== 0) return;
  if (g._moves && g._moves.some(m => m.lp === lp)) return;
  const p = lp.player, m = lp.riding, vy = m && m.vy !== undefined ? m.vy : p.vy;
  let to = null, how = null;
  if (g.dim === DIM.SKYLANDS && p.y < 0 && vy < 0) { to = 0; how = 'fall'; }
  else if (g.dim === 0 && p.y < -0.5) { to = DIM.DEPTHS; how = 'crust'; }
  else if (g.dim === 0 && p.y > CH - 1.2 && vy > 0) { to = DIM.SKYLANDS; how = 'rise'; }
  else if (typeof stackedMore === 'function') { const r = stackedMore(g, lp, vy); if (r) [to, how] = r; }
  if (to === null) return;
  if (!g.multiOK()) {
    // playing over LAN everyone moves together for now: don't drag the others along by surprise
    if (!lp._stackWarn) { lp._stackWarn = 1; lp.toast('Falling between worlds only works when playing on one screen for now — use a portal', 'warn'); }
    const q = m || p;
    if (how === 'fall') { q.y = 1; q.vy = 0; p.slowFallT = 0; }
    if (how === 'crust') { p.y = 1; p.vy = 0; }
    if (how === 'rise') { q.y = CH - 2.5; q.vy = Math.min(q.vy, 0); }
    if (how === 'void') { p.y = 1; p.vy = 0; }
    if (how === 'unvoid') { q.y = CH - 2.5; q.vy = Math.min(q.vy, 0); }
    return;
  }
  g.queueMove(lp, to, (q) => stackPlace(g, lp, q, how), () => stackToast(g, lp, how, to));
};
// where you come out, falling, climbing or digging through (the moving player only; their mount comes along)
function stackPlace(g, lp, q, how) {
  const x = q.x, y = q.y, z = q.z, vx = q.vx, vy = q.vy, vz = q.vz;
  q.fallStart = null; q.portalTime = 0;
  if (how === 'fall') { q.y = Math.min(y + CH, CH - 2.5); q.vx = vx; q.vz = vz; q.vy = Math.max(vy, -6); q.slowFallT = 40; q.cloudFall = true; }
  else if (how === 'rise') { q.y = Math.max(1, y - CH); q.vx = vx; q.vz = vz; q.vy = Math.max(vy, 2); if (!q.flying && !lp.riding) q.updraft = seamUpdraft(g, q.x, q.z); }
  else if (how === 'crust') {
    const w = g.world, bx = Math.floor(x), bz = Math.floor(z);
    w.ensureChunk(bx >> 4, bz >> 4);
    for (let yy = 98; yy > 30; yy--) { if (yy < 96 && !T_SOLID[w.getBlock(bx, yy, bz)] && !T_SOLID[w.getBlock(bx, yy - 1, bz)] && !T_LIQUID[w.getBlock(bx, yy, bz)]) break; if (w.getBlock(bx, yy, bz)) w.setBlock(bx, yy, bz, 0, 0); }
    q.x = bx + 0.5; q.z = bz + 0.5; q.y = 97; q.vx = q.vz = 0; q.vy = Math.min(vy, -2); q.fallStart = 97;
  } else if (typeof stackPlaceMore === 'function') stackPlaceMore(g, lp, q, how, { x, y, z, vx, vy, vz });
}
function stackToast(g, lp, how, to) {
  if (how === 'fall') lp.toast('Down through the clouds, into the world below…', '');
  else if (how === 'crust') lp.toast('You break through the crust and fall into the Ember Depths!', 'warn');
  else if (how === 'rise') lp.toast(lp.player.updraft ? 'Up through the clouds — the winds carry you to the Skylands' : 'Up through the clouds, into the Skylands', 'good');
  else if (typeof stackToastMore === 'function') stackToastMore(g, lp, how, to);
}
// ---- portals: whoever steps through goes alone, and the place they left stays alive behind the window ---------------
pvSwap = function (g, to, lp = g.locals[0], L = PV.live) {
  const { win, dest } = L;
  if (g._moves && g._moves.some(m => m.lp === lp)) return false;
  g.queueMove(lp, to, (p) => {
    const m = pvMap(win, dest, p), [vx, vz] = pvTurn(p.vx, p.vz, m.d);
    if (win.kind === 'rift') {
      const s = dest.n[0] * (m.x - dest.c[0]) + dest.n[2] * (m.z - dest.c[2]), want = Math.max(0.08, Math.abs(s));
      if (s < want) { m.x += dest.n[0] * (want - s); m.z += dest.n[2] * (want - s); }
    }
    p.x = m.x; p.y = m.y; p.z = m.z; p.vx = vx; p.vz = vz; p.yaw += m.d; p.fallStart = null; p.portalTime = 0; p.portalCooldown = 3;
  }, () => { if (typeof pvArrived === 'function') pvArrived(g, to, win, dest, lp); });
  PV.lastS = {};
  return true;
};
// the background world's ground for a world someone's playing in is kept loaded by them
{
  const baseShadowFn = pvShadow;
  pvShadow = function (g, dim) {
    let sh = PV.shadows.get(dim);
    if (sh) return sh;
    const w = g.worldOfDim(dim);
    if (w) { sh = { dim, world: w }; PV.shadows.set(dim, sh); return sh; }
    return baseShadowFn(g, dim);
  };
}
{
  // dying out in another layer while others play on: you go home alone (to your bed, or the world's spawn)
  const baseRespawn = LocalPlayer.prototype.respawn;
  LocalPlayer.prototype.respawn = async function () {
    const g = this.g;
    if (!g.ctxs || g.allLocals().length < 2 || !g.multiOK()) return baseRespawn.call(this);
    const p = this.player, home = p.spawn ? (p.spawnDim || 0) : 0;
    const keep = g.ctx, keepL = g.locals, all = g.allLocals(), prevAll = g._allLocals;
    g._allLocals = all; g.useCtx(g.ctxOf(this)); g.locals = all.filter(l => l.player.dim === g.dim);
    try {
      if (g.dim === home) return await baseRespawn.call(this);
      p.dead = false; p.health = p.maxHealth; p.burn = 0; p.invuln = 2; p.fallStart = null;
      this.hud.hideDeath(); this.mode = 'play';
      g.queueMove(this, home, (q) => {
        if (p.spawn) { q.x = p.spawn[0]; q.y = p.spawn[1] + 0.6; q.z = p.spawn[2]; } else g.placeAtSpawn(q, false);
        q.vx = q.vy = q.vz = 0;
      });
    } finally { g.locals = keepL; g._allLocals = prevAll; g.useCtx(keep); }
  };
  // leaving a world (to the title, or another world): every layer of it goes
  const baseQuit = Game.prototype.quitToTitle;
  Game.prototype.quitToTitle = async function () {
    if (!this.ctxs) return baseQuit.call(this);
    this._moves = []; this._realmCall = null;
    this.useCtx(this.ctxOf(this.allLocals()[0]));
    const ws = new Set();
    for (const c of this.ctxs.values()) { if (c.world) ws.add(c.world); if (c.shadow && c.shadow.world) ws.add(c.shadow.world); for (const sh of (c.pv && c.pv.shadows ? c.pv.shadows.values() : [])) if (sh.world) ws.add(sh.world); }
    this._quitting = true;
    try {
      await baseQuit.call(this);
      for (const w of ws) { try { w.unloadAll(); } catch (e) { console.warn('worlds', e); } }
    } finally { this._quitting = false; }
    this.ctxs = null; this.ctx = null;
    PV.shadows = new Map(); PV.lives = []; PV.live = null; PV.fades = new Map(); PV.dests = new Map(); PV.lastS = {};
    if (typeof RIFT !== 'undefined') RIFT.tears = [];
  };
  const baseEnter = Game.prototype.enterWorld;
  Game.prototype.enterWorld = function (...a) {
    if (this.ctxs) {
      try { for (const c of [...this.ctxs.values()]) if (c !== this.ctx) { const w = c.world; this.ctxs.delete(c.dim); if (w && w !== this.world) { this._unloadOK = w; w.unloadAll(); this._unloadOK = null; } } } catch (e) { console.warn('worlds', e); }
      this.ctxs = null; this.ctx = null;
      try { pvRelease(this); } catch (e) { console.warn('worlds', e); }
      PV.shadows = new Map(); PV.lives = []; PV.live = null;
    }
    return baseEnter.apply(this, a);
  };
}
{
  // your pocket: only you go (and only you come back out)
  const basePocket = Game.prototype.travelPocket;
  Game.prototype.travelPocket = function (lp) {
    if (!this.ctxs || this.allLocals().length < 2 || !this.multiOK()) return basePocket.call(this, lp);
    const keep = this.ctx, keepL = this.locals, prev = this._actor, prevAll = this._allLocals;
    this._allLocals = this.allLocals();
    this.useCtx(this.ctxOf(lp)); this.locals = [lp]; this._actor = lp;
    try { return basePocket.call(this, lp); } finally { this._actor = prev; this.locals = keepL; this._allLocals = prevAll; this.useCtx(keep); }
  };
}
// ---- his realm: the final fight takes everyone who's playing ------------------------------------------------------
// The first to step through his door calls the others: a short count, then all of you are drawn in together,
// from wherever you are (on this screen, or across the network).
function realmCallSay(g, msg, kind) {
  for (const l of g.allLocals()) l.toast(msg, kind || '');
  if (g.net && g.net.role === 'host' && g.net.peers && g.net.peers.size) g.net.all({ t: 'chat', from: 'The Rift', text: msg });
}
function realmCallTick(g, dt) {
  const C = g._realmCall; if (!C) return;
  C.t -= dt;
  const s = Math.ceil(C.t);
  if (s > 0 && s < C.said && (s <= 3 || s === 5)) { C.said = s; realmCallSay(g, s + '…', 'warn'); }
  if (C.t > 0) return;
  g._realmCall = null;
  const R = riftOf(g);
  if (R.stage < 3) return;
  g._actor = C.by || g.allLocals()[0];
  try {
    g.changeDimension(DIM.REALM, () => { for (const l of g.locals) { l.player.x = 10.5; l.player.y = RIFT_FLOOR + 1; l.player.z = 0.5 + (l.index % 2 ? -1 : 1) * Math.ceil(l.index / 2) * 1.6; l.player.yaw = -Math.PI / 2; l.player.vx = l.player.vz = 0; } return [10.5, RIFT_FLOOR + 1, 0.5]; });
  } finally { g._actor = null; }
  riftSay(g, R.sealed ? 'His realm, quiet now' : 'His realm. Somewhere far down these halls, he waits', R.sealed ? '' : 'warn');
  for (const l of g.allLocals()) { const S = l.player.stats || (l.player.stats = {}); if (!S.realmSeen) { S.realmSeen = 1; l.grantXP(80); } }
}
{
  const baseRiftT = riftTravel;
  riftTravel = async function (g, to, lp) {
    if (to !== DIM.REALM || g.isGuest || !g.ctxs) return baseRiftT(g, to, lp);
    const others = g.allLocals().length > 1 || (g.net && g.net.peers && g.net.peers.size > 0);
    if (!others) return baseRiftT(g, to, lp);
    const R = riftOf(g);
    if (R.stage < 3) return;
    if (g._realmCall) return;
    const who = lp && lp.name ? lp.name : 'Someone';
    g._realmCall = { t: 10, by: lp, said: 11 };
    realmCallSay(g, R.sealed ? `${who} opens the way into his realm — everyone goes in 10 seconds` : `${who} steps into the rift: the final fight. Everyone is drawn in in 10 seconds — get ready!`, 'warn');
  };
  const baseFrameR = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    const r = baseFrameR.call(this, dt);
    if (this._realmCall && this.state === 'playing') { try { realmCallTick(this, dt); } catch (e) { console.warn('realm call', e); this._realmCall = null; } }
    return r;
  };
}
// for tests: the rift's tears, and whether a window can be walked through
PV.debug.rift = () => (typeof RIFT !== 'undefined' ? RIFT : null);
PV.debug.canSwap = (to, L) => pvCanSwap(GAME, to, L);
