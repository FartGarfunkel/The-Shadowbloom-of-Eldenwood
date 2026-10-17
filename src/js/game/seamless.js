// ---------------------------------------------------------------------------
// game/seamless.js — 0.9: the stacked worlds, without a loading screen.
//
// The Skylands hang over the Overworld, and the Ember Depths lie under it.
// When you come near the edge between two of them (falling out of the
// Skylands, climbing or flying up near the top of the Overworld, digging
// down to the crust) the world on the other side is quietly made ready in
// the background: its ground generated and meshed, but not drawn. When you
// cross, the game just switches over, keeping your speed, the creature
// you're riding and everything you carry, and the world you left waits in
// the background for the way back.
//
// Between the Skylands and the Overworld lies a bank of cloud: the sky and
// light of the two worlds blend as you fall through it, so there's no seam
// to see. Rising out of the top of the Overworld on foot, the winds catch
// you and carry you up onto the nearest island.
// ---------------------------------------------------------------------------
// which world should be ready in the background, if any (with a margin, so it isn't made and dropped over and over)
function seamWant(g) {
  if (g.isGuest || !g.world || !g.meta || g._traveling || (g.net && g.net.peers && g.net.peers.size > 0)) return null;
  const lp = g.locals[0];
  if (!lp) return null;
  const y = lp.player.y, sh = g.shadow, has = (d) => sh && sh.dim === d;
  if (g.dim === DIM.SKYLANDS) return y < 54 || (has(0) && y < 64) ? 0 : null;
  if (g.dim === 0) {
    if (y > CH - 34 || (has(DIM.SKYLANDS) && y > CH - 46)) return DIM.SKYLANDS;
    if ((g.meta.genVersion || 1) >= 3 && (y < 7 || (has(DIM.DEPTHS) && y < 12))) return DIM.DEPTHS;
  }
  return null;
}
Object.assign(Game.prototype, {
  makeShadowWorld(dim) {
    const w = new World(dim, this.meta.seed, this.records, this.meta.genVersion || 1);
    worldFluidRules(this.dim);                    // the world being played keeps its own rules for lava
    w.onChunkUnload = (c) => this.renderer.freeChunk(c);
    w.isGuest = this.isGuest;
    return w;
  },
  // let the background world go; anything changed in it is written back for saving
  releaseShadow() {
    const sh = this.shadow; this.shadow = null;
    if (!sh || !sh.world) return;
    const w = sh.world, main = this.world;
    for (const c of w.chunks.values()) if (c.modified && c.dirty) { this.records.set(c.key, encodeChunk(c)); (main || w).unsaved.add(c.key); c.dirty = false; }
    if (main) { for (const k of w.unsaved) main.unsaved.add(k); w.unsaved.clear(); }
    w.unloadAll();
  },
  seamTick() {
    const want = seamWant(this);
    if (this.shadow && this.shadow.dim !== want) this.releaseShadow();
    if (want === null) return;
    if (!this.shadow) this.shadow = { dim: want, world: this.makeShadowWorld(want) };
    const w = this.shadow.world, p = this.locals[0].player;
    const R = Math.min(this.renderDist(), 4);
    (typeof worldStream === 'function' ? worldStream(this, w, [[p.x, p.z]], R, this.fps < 40 ? 1.5 : 3, (c) => this.meshInto(w, c)) : w.stream([[p.x, p.z]], R, this.fps < 40 ? 1.5 : 3, (c) => this.meshInto(w, c)));
  },
  // Across, with no stop: the world on the other side takes over where you are.
  stackSwap(to, how) {
    if (this._traveling || !this.locals.length) return;
    const g = this, from = g.dim, lead = g.locals[0].player;
    const st = g.locals.map(l => ({ l, x: l.player.x, y: l.player.y, z: l.player.z, vx: l.player.vx, vy: l.player.vy, vz: l.player.vz }));
    const carried = typeof takeMounts === 'function' ? takeMounts(g) : [];
    g.worldRecord();                                // kept animals, boats and carts of the world being left
    let pre = g.shadow && g.shadow.dim === to ? g.shadow.world : null;
    if (!pre) { if (g.shadow) g.releaseShadow(); pre = g.makeShadowWorld(to); }
    const old = g.world;
    g.shadow = null;
    g._preWorld = pre; g._keepWorld = old;
    disposeEntities(g.entities); g.entities = []; g.fauna.clear();
    for (const l of g.locals) { l.mining = null; l.player.dim = to; if (l.sleeping) l.sleeping = null; }
    g.loadDimension(to);
    // the world we left waits in the background for the way back (nothing happens in it meanwhile)
    for (const k of ['onBlockChanged', 'onAnyChange', 'onFluidReact', 'onFluidWash', 'onGrowExtra', 'onSurfaceTick']) old[k] = null;
    g.shadow = { dim: from, world: old };
    const w = g.world;
    const L0 = st[0];
    for (const s of st) {
      const q = s.l.player, off = s.l.index * 0.6;
      q.fallStart = null; q.portalTime = 0;
      if (how === 'fall') {
        q.x = L0.x + off; q.z = L0.z; q.y = Math.min(L0.y + CH, CH - 2.5);
        q.vx = L0.vx; q.vz = L0.vz; q.vy = Math.max(L0.vy, -6); q.slowFallT = 40; q.cloudFall = true;
      } else if (how === 'rise') {
        q.x = L0.x + off; q.z = L0.z; q.y = Math.max(1, L0.y - CH);
        q.vx = L0.vx; q.vz = L0.vz; q.vy = Math.max(L0.vy, 2);
        if (!q.flying && !s.l.riding && !carried.some(c => c.l === s.l)) q.updraft = seamUpdraft(g, q.x, q.z);
      } else {
        // down through the crust: a shaft broken through the Depths' roof to the first open cave below
        const bx = Math.floor(L0.x), bz = Math.floor(L0.z);
        if (s === L0) {
          w.ensureChunk(bx >> 4, bz >> 4);
          for (let y = 98; y > 30; y--) { if (y < 96 && !T_SOLID[w.getBlock(bx, y, bz)] && !T_SOLID[w.getBlock(bx, y - 1, bz)] && !T_LIQUID[w.getBlock(bx, y, bz)]) break; if (w.getBlock(bx, y, bz)) w.setBlock(bx, y, bz, 0, 0); }
        }
        q.x = bx + 0.5; q.z = bz + 0.5; q.y = 97; q.vx = q.vz = 0; q.vy = Math.min(L0.vy, -2); q.fallStart = 97;
        if (s !== L0) q.y = 97 + s.l.index * 0.1;
      }
    }
    if (typeof restoreMounts === 'function') restoreMounts(g, carried, true);
    for (const l of g.locals) { const p = l.player, pcx = Math.floor(p.x) >> 4, pcz = Math.floor(p.z) >> 4; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) w.ensureChunk(pcx + dx, pcz + dz); }
    g.saveNow('travel');
    const f = g.meta.flags;
    if (to === DIM.SKYLANDS && !f.skyVisited) { f.skyVisited = true; for (const l of g.locals) l.grantXP(40); }
    if (to === DIM.DEPTHS && !f.depthsVisited) { f.depthsVisited = true; for (const l of g.locals) l.grantXP(40); }
    const lp = g.locals[0];
    if (how === 'fall') lp.toast('Down through the clouds, into the world below…', '');
    else if (how === 'crust') lp.toast('You break through the crust and fall into the Ember Depths!', 'warn');
    else lp.toast(lead.updraft ? 'Up through the clouds — the winds carry you to the Skylands' : 'Up through the clouds, into the Skylands', 'good');
  },
});
// a soft puff of cloud, lit by the sky like everything else
function cloudPuff(g, x, y, z, o) {
  const life = o.life || 1, size = o.size || 0.5;
  g.particles.add({ x, y, z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life, max: life, size, size0: size, uv: tileUV(ATLAS.tile.cloud_puff ?? ATLAS.tile.white), light: 0xF0, grav: 0, shrink: false, grow: o.grow || 0, flutter: 0, ph: 0 });
}
// Rising out of the Overworld on foot: the winds carry you to an island. They take you along under the
// islands to clear sky beside one, straight up past its top, then across onto it.
function seamUpdraft(g, x, z) {
  const w = g.world, [lx, ly, lz] = skyLanding(g, x, z);
  const top = Math.floor(ly) + 3;
  const open = (cx, cz) => { w.ensureChunk(cx >> 4, cz >> 4); for (let y = 2; y <= top; y++) if (T_SOLID[w.getBlock(cx, y, cz)]) return false; return true; };
  let col = null;
  const fx = Math.floor(x), fz = Math.floor(z);
  if (Math.hypot(lx - x, lz - z) < 40 && open(fx, fz)) col = [x, z];
  for (let r = 2; r <= 40 && !col; r += 2) {
    const n = Math.max(8, Math.round(r * 1.6));
    for (let a = 0; a < n; a++) {
      const ang = a / n * TAU, cx = Math.floor(lx + Math.cos(ang) * r), cz = Math.floor(lz + Math.sin(ang) * r);
      if (open(cx, cz)) { col = [cx + 0.5, cz + 0.5]; break; }
    }
  }
  if (!col) col = [lx + 30, lz];
  return { stage: 0, cx: col[0], cz: col[1], x: lx, y: ly, z: lz };
}
{
  const base = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = base.call(this, dt, inp);
    const g = this.g, p = this.player;
    if (g.state !== 'playing' || p.dead) return r;
    // the cloud bank under the Skylands slows a fall, so you come out the other side gently
    if (g.dim === DIM.SKYLANDS && p.y < 30 && p.vy < 0 && !p.flying && !this.riding && cloudAt(g, p.y) > 0.05) { p.slowFallT = Math.max(p.slowFallT || 0, 2); p.cloudFall = true; }
    const u = p.updraft;
    if (u) {
      if (g.dim !== DIM.SKYLANDS || this.riding || p.flying) p.updraft = null;
      else {
        p.fallStart = null;
        if (u.stage === 0) {
          // along, under the islands, to open sky
          const dx = u.cx - p.x, dz = u.cz - p.z, d = Math.hypot(dx, dz);
          if (d < 0.6) u.stage = 1;
          else { const s = Math.min(14, d * 2); p.vx = dx / d * s; p.vz = dz / d * s; p.vy = clamp((6 - p.y) * 2, -2, 4); }
        } else if (u.stage === 1) {
          // straight up
          p.vx = (u.cx - p.x) * 3; p.vz = (u.cz - p.z) * 3; p.vy = 14;
          if (p.y > u.y + 2) u.stage = 2;
        } else {
          // across onto the island, and down gently
          const dx = u.x - p.x, dz = u.z - p.z, d = Math.hypot(dx, dz);
          p.vy = clamp((u.y + 2.5 - p.y) * 2, -3, 3);
          if (d < 0.8 || p.onGround) { p.updraft = null; p.slowFallT = 8; }
          else { const s = Math.min(9, d * 2); p.vx = dx / d * s; p.vz = dz / d * s; }
        }
        if (Math.random() < dt * 30) cloudPuff(g, p.x + (Math.random() - 0.5) * 1.6, p.y + Math.random() * 2, p.z + (Math.random() - 0.5) * 1.6, { vx: -p.vx * 0.2, vy: -p.vy * 0.25, vz: -p.vz * 0.2, life: 0.8, size: 0.35, grow: 1.5 });
      }
    }
    // wisps of cloud streaming past in the bank between the worlds
    const k = cloudAt(g, p.y);
    if (k > 0.05) {
      const n = dt * 60 * k;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, rr = 2 + Math.random() * 10;
        cloudPuff(g, p.x + Math.cos(a) * rr, p.y + (Math.random() - 0.5) * 8, p.z + Math.sin(a) * rr, { vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, vz: (Math.random() - 0.5) * 0.6, life: 1.6, size: 0.9 + Math.random() * 1.2, grow: 0.6 });
      }
    }
    return r;
  };
}
// ---- the look of the edge between worlds --------------------------------------------------------------------
// how deep in the cloud bank between the worlds a height is (each player's own: one can be in it while the other isn't)
function cloudAt(g, y) {
  let k = 0;
  if (g.dim === DIM.SKYLANDS) k = smoothstep(30, 0, y); else if (g.dim === 0) k = smoothstep(CH - 22, CH, y);
  return k > 0 ? smoothstep(0.15, 0.85, k) * 0.93 : 0;
}
{
  const base = Game.prototype.computeEnv;
  Game.prototype.computeEnv = function (dim, fixedT) {
    const e = base.call(this, dim, fixedT);
    if (fixedT !== undefined || dim !== this.dim || !this.meta || !this.locals || !this.locals[0] || this.state === 'title') return e;
    const y = (this._envFor || this.locals[0]).player.y;
    let k = 0, other = -1;
    if (dim === DIM.SKYLANDS) { k = smoothstep(30, 0, y); other = 0; }
    else if (dim === 0) { k = smoothstep(CH - 22, CH, y); other = DIM.SKYLANDS; }
    if (!(k > 0)) return e;
    const o = base.call(this, other, fixedT);
    const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    // halfway through, the two worlds' skies and light are the same on either side
    const h = k * 0.5;
    for (const f of ['zenith', 'horizon', 'fog', 'sunGlow']) if (e[f] && o[f]) e[f] = mixc(e[f], o[f], h);
    e.day = lerp(e.day, o.day, h); e.stars = lerp(e.stars || 0, o.stars || 0, h);
    // and in the middle of it all, cloud
    const c = smoothstep(0.15, 0.85, k), lum = 0.3 + 0.7 * clamp((e.day - 0.2) / 0.8, 0, 1);
    const cloud = mixc(e.fog, [1, 1, 1], 0.6).map(v => v * lum);
    e.fog = mixc(e.fog, cloud, c); e.horizon = mixc(e.horizon, cloud, c); e.zenith = mixc(e.zenith, cloud, c * 0.9);
    e.sunGlow = e.sunGlow.map(v => v * (1 - c));
    if (c > 0.55) e.showSun = false;
    if (c > 0.3) e.voidBelow = false;   // no dark pit below while you're inside the cloud
    e.cloud = c * 0.93;
    return e;
  };
  // in split screen, the second player's view has their own sky when either of you is in the cloud bank
  const baseViewEnv = Game.prototype.viewEnv;
  Game.prototype.viewEnv = function (lp) {
    const L0 = this.locals[0];
    if (lp !== L0 && L0 && this.env && (cloudAt(this, lp.player.y) > 0 || cloudAt(this, L0.player.y) > 0)) {
      const keep = this.env;
      this._envFor = lp; try { this.env = this.computeEnv(this.dim); } finally { this._envFor = null; }
      try { return baseViewEnv.call(this, lp); } finally { this.env = keep; }
    }
    return baseViewEnv.call(this, lp);
  };
  const baseTiles = paintMonsterTiles;
  paintMonsterTiles = function () {
    baseTiles();
    addTile('cloud_puff', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 7.5; p.set(x, y, [255, 255, 255], d < 1 ? Math.round(120 * Math.pow(1 - d, 1.6)) : 0); } });
  };
}
// ---- keeping the background world in step ------------------------------------------------------------------
{
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    const r = baseFrame.call(this, dt);
    if (this.state === 'playing' && this.world) { try { this.seamTick(); } catch (e) { console.warn('seam', e); } }
    return r;
  };
  // any other way of changing worlds (portals, the pocket, the rift) lets it go first, keeping what changed in it
  const baseLoad = Game.prototype.loadDimension;
  Game.prototype.loadDimension = function (dim) {
    if (!this._preWorld && this.shadow) this.releaseShadow();
    // chunks waiting to be written go on the list of whichever world comes next (they all share one record book)
    const pend = this.world ? [...this.world.unsaved] : [];
    const r = baseLoad.call(this, dim);
    if (this.world) for (const k of pend) this.world.unsaved.add(k);
    return r;
  };
  const baseQuit = Game.prototype.quitToTitle;
  Game.prototype.quitToTitle = async function () {
    const r = await baseQuit.call(this);
    if (this.shadow) { if (this.shadow.world) this.shadow.world.unloadAll(); this.shadow = null; }
    return r;
  };
  const baseEnter = Game.prototype.enterWorld;
  Game.prototype.enterWorld = function (...a) {
    if (this.shadow) { if (this.shadow.world) this.shadow.world.unloadAll(); this.shadow = null; }
    return baseEnter.apply(this, a);
  };
}

// ---- creatures keep away from the edge -------------------------------------------------------------------------------
// A creature walking about stops at the brink of a long drop instead of stepping off it: always at the edges of
// the Skylands, and anywhere at drops deeper than a few blocks. Flyers, swimmers, ridden mounts and anything
// being knocked back are left alone.
{
  const baseMove = moveEntity;
  const solidBelow = (w, x, y, z, depth) => { for (let k = 1; k <= depth; k++) if (T_SOLID[w.getBlock(x, y - k, z)] || T_LIQUID[w.getBlock(x, y - k, z)]) return true; return false; };
  moveEntity = function (world, e, dt) {
    if (e instanceof Mob && e.onGround && !e.noGrav && !e.riddenBy && !e.ghost && !(e.hurtTime > 0.15) && !e.lockMove && !(e.T.ai === 'flyer') && !e.T.flyer && !e.inWater) {
      const hs = Math.hypot(e.vx, e.vz);
      if (hs > 0.05) {
        const g = e.game, sky = g && g.dim === DIM.SKYLANDS, depth = sky ? 14 : 7;
        const nx = e.vx / hs, nz = e.vz / hs, ahead = (e.w || 0.3) + 0.4;
        const fx = Math.floor(e.x + nx * ahead), fz = Math.floor(e.z + nz * ahead), fy = Math.floor(e.y + 0.01);
        if (!T_SOLID[world.getBlock(fx, fy, fz)] && world.isLoaded(fx, fz) && !solidBelow(world, fx, fy, fz, depth)) {
          // the brink: stop, and look for somewhere else to go
          e.vx = 0; e.vz = 0; e.edgeT = 0.6;
          if (e.wanderOn) { e.wanderDir = Math.atan2(nx, nz) + Math.PI * (0.6 + Math.random() * 0.8); e.wanderT = Math.min(e.wanderT || 0, 1.5); }
          if (e.panicT > 0) e.fleeTurn = e.fleeTurn || (Math.random() < 0.5 ? -1 : 1);
        }
      }
    }
    return baseMove(world, e, dt);
  };
}
