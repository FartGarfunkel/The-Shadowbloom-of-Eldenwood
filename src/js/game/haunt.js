// ---------------------------------------------------------------------------
// game/haunt.js — the watcher.
//
// A figure in the default skin with white, pupil-less eyes. He never attacks
// and never follows. He stands at the edge of what you can see: on a ridge,
// half behind a tree, at the far end of a cave, or right behind you — and
// when you look straight at him, or get close, he is simply gone.
//
// He also leaves things behind, always out of sight and never near you:
// 2x2 tunnels bored into the rock and lit with redstone torches, signs with
// a few words on them, trees stripped of every leaf, a torch you placed in
// the dark swapped for a redstone one. The "He is here" game rule sends him
// away for good.
// ---------------------------------------------------------------------------

const HAUNT_SIGNS = [['', 'STOP', '', ''], ['I see you', '', '', ''], ['', 'Wake up', '', ''], ['Go back', '', '', ''], ['', '', 'Nobody is', 'here'], ['Too far', '', '', ''],
  ['', 'It is too late', '', ''], ['Leave the', 'tunnels alone', '', ''], ['', 'Behind you', '', ''], ['Do not dig', 'down', '', ''], ['', 'Still here', '', ''], ['He was here', 'first', '', '']];
// what his tunnels may cut through (never anything built)
const HAUNT_ROCK = new Set(['stone', 'dirt', 'grass', 'gravel', 'andesite', 'diorite', 'granite', 'slate', 'tuff', 'deepslate', 'coarse_dirt', 'sandstone', 'clay', 'coal_ore', 'iron_ore', 'copper_ore', 'tin_ore',
  'snowy_grass', 'podzol', 'calcite', 'limestone', 'marble', 'dripstone_block', 'mud', 'red_sandstone', 'terracotta',
  'emberstone', 'basalt', 'blackstone', 'ash', 'skystone', 'sky_grass', 'end_stone', 'desert_stone', 'desert_sandstone'].map(k => B[k]).filter(v => v !== undefined));

// (0.9.0.50) where he can be: every land there is (the Overworld, the Skylands, the Ember Depths, the End), but not his own
// realm, and a pocket dimension only once its owner has built a portal there: he walks in through it.
function hauntDimOk(g) {
  const d = g.dim;
  if (d === undefined || (DIM.REALM !== undefined && d === DIM.REALM)) return false;
  if (d === DIM.POCKET) return hauntPortals(g).length > 0;
  return true;
}
// the lit portals (Ember Depths or Skylands) in the loaded land, as [x, y, z] of each portal's bottom cells (cached a few seconds)
function hauntPortals(g) {
  const C = hauntPortals.c || (hauntPortals.c = { t: -1e9, w: null, list: [] });
  const now = performance.now();
  if (C.w === g.world && now - C.t < 4000) return C.list;
  C.t = now; C.w = g.world; C.list = [];
  if (!g.world) return C.list;
  for (const ch of g.world.chunks.values()) {
    if (!ch.emitters) continue;
    for (const [lx, y, lz, id] of ch.emitters) {
      if (id !== B.ember_portal && id !== B.sky_portal) continue;
      const x = ch.cx * 16 + lx, z = ch.cz * 16 + lz;
      if (g.world.getBlock(x, y - 1, z) === id) continue;          // only the bottom of each column of portal
      C.list.push([x, y, z]);
    }
  }
  return C.list;
}


class Watcher extends Entity {
  constructor(game, x, y, z, mode) {
    super(game, x, y, z);
    this.netLocalOnly = true;         // (0.9.0.46) each player's own game shows him to them (a guest's too)
    this.born = game.time || 0;       // (0.9.0.47) so one that's been left behind can be cleared
    this.mode = mode;                 // 'far' | 'behind' | 'cave' | 'peek'
    this.w = 0.3; this.h = 1.8;
    this.life = 25 + Math.random() * 35;
    this.lookT = 0; this.hiddenT = 0;
    this.leaving = 0;                 // > 0 while walking away into the fog
    this.yaw = 0; this.walk = 0;
    this.asBoar = mode === 'far' && Math.random() < 0.08; // sometimes he wears another shape
    this.faceAt(game.player);
  }
  faceAt(p) { this.yaw = Math.atan2(-(p.x - this.x), -(p.z - this.z)); }
  vanish() { this.remove = true; this.game.haunt.onVanish(this); }
  update(dt) {
    const g = this.game, near = g.locals.length > 1 ? g.locals.map(l => l.player).filter(q => !q.dead).sort((a, b) => Math.hypot(a.x - this.x, a.z - this.z) - Math.hypot(b.x - this.x, b.z - this.z))[0] : null, p = near || g.player;   // (0.9.0.24) whoever is nearest
    this.age += dt;
    if (!p || p.dead || g.state === 'loading' || !hauntDimOk(g) || !g.rules().haunting) { this.remove = true; return; }
    const dx = this.x - p.x, dy = (this.y + 1.6) - (p.y + p.eye), dz = this.z - p.z;
    const d = Math.hypot(dx, dy, dz);
    if (this.leaving > 0) {
      // walk away, then gone
      this.leaving -= dt;
      this.x -= Math.sin(this.yaw) * 2.6 * dt; this.z -= Math.cos(this.yaw) * 2.6 * dt;
      this.walk += dt * 7;
      if (this.leaving <= 0) this.vanish();
      return;
    }
    this.faceAt(p);
    // (0.9.0.24) in a doorway (or stepped out of a rift) he lets you come close, the way the tale has it
    if (d < (this.mode === 'behind' ? 5 : this.mode === 'peek' ? 2.5 : 11)) { this.vanish(); return; }
    // is the player looking at him?
    const lv = p.look();
    const dot = (lv[0] * dx + lv[1] * dy + lv[2] * dz) / (d || 1);
    const straight = Math.cos(this.mode === 'behind' ? 0.45 : 0.12);
    const seen = this.lineOfSight(p, d);
    if (seen && dot > 0.55) g.haunt.noticed = true;            // in view: they've seen him, even from the corner of their eye
    if (seen && dot > straight) {
      this.lookT += dt;
      if (this.lookLimit === undefined) this.lookLimit = this.mode === 'behind' ? 0.08 : this.mode === 'peek' ? 3 + Math.random() * 1.2 : 0.7 + Math.random() * 0.8;
      const limit = this.lookLimit;
      if (this.lookT > limit) {
        if (this.mode === 'far' && Math.random() < 0.3 && !this.asBoar) { this.leaving = 1.1; this.yaw += Math.PI; }
        else this.vanish();
        return;
      }
    }
    // standing behind you: now and then a footstep
    if (this.mode === 'behind' && Math.random() < dt * 0.6) g.sfx.playAt('cave_steps', this.x, this.y, this.z, 30);
    this.life -= dt;
    if (this.life <= 0) { this.vanish(); return; }
    if (!seen) { this.hiddenT += dt; if (this.hiddenT > 14) this.vanish(); } else this.hiddenT = 0;
  }
  lineOfSight(p, d) {
    const ox = p.x, oy = p.y + p.eye, oz = p.z;
    const tx = this.x - ox, ty = this.y + 1.6 - oy, tz = this.z - oz;
    const hit = raycastBlocks(this.game.world, ox, oy, oz, tx / d, ty / d, tz / d, d - 0.6, false);
    return !hit || BLOCKS[hit.id].isLeaves || hit.dist > d - 0.8;
  }
  draws(out) {
    const M = MODELS[this.asBoar ? 'boar' : 'herobrine'];
    const light = this.lightAt(1.2);
    const base = Mat4.create();
    Mat4.rotateY(base, this.yaw);
    const p = this.game.player;
    const pitch = clamp(Math.atan2(p.y + p.eye - (this.y + 1.6), Math.hypot(p.x - this.x, p.z - this.z)), -0.5, 0.5);
    const sw = this.leaving > 0 ? Math.sin(this.walk) * 0.7 : 0;
    for (const part of M.parts) {
      const m = Mat4.create(); m.set(base);
      Mat4.translate(m, part.pivot[0], part.pivot[1], part.pivot[2]);
      let rx = 0;
      if (part.swing) rx += sw * part.swing;
      if (part.look && this.leaving <= 0) rx += pitch;
      if (rx) Mat4.rotateX(m, rx);
      out.push({ mesh: part.mesh, m, px: this.x, py: this.y, pz: this.z, light, unlit: !!part.unlit });
    }
    if (this.asBoar) {
      // the boar's eyes are white too
      const e = MODELS.herobrine.parts.find(q => q.eyes);
      const m = Mat4.create(); m.set(base);
      Mat4.translate(m, 0, 0.57, -0.62); Mat4.scale(m, 1.1, 1, 1);
      out.push({ mesh: e.mesh, m, px: this.x, py: this.y - 0.0, pz: this.z, light, unlit: true });
    }
  }
}

// (0.9.0.47) a real boss fight going on: a hostile boss, not anyone's tamed dragon or a far-off keeper, near a player.
// (It used to be any boss anywhere in the loaded world, so a tamed dragon kept him away for good.)
function hauntBossFight(g, extra) {
  const at = g.locals.filter(l => !l.player.dead).map(l => l.player).concat(extra || []);
  return g.entities.some(e => e.T && e.T.boss && e.alive && !e.tamed && !e.owner && at.some(q => Math.hypot(e.x - q.x, e.y - q.y, e.z - q.z) < 40));
}
class Haunt {
  constructor(game) {
    this.g = game;
    // he's rare: a glimpse every half hour or so of play, a trace now and then
    this.next = 600 + Math.random() * 900;    // first possible sighting
    this.traceT = 900 + Math.random() * 900;  // first thing he leaves behind
    this.active = null;
    this.noticed = false;
  }
  update(dt) {
    const g = this.g, p = g.player;
    if (!p || !hauntDimOk(g) || g.state !== 'playing') return;
    // (alpha 3) in the campaign he comes back: from the Mirrorroot on, until he falls
    if (typeof RIFT_OFF !== 'undefined' && RIFT_OFF) { const S = g.meta.campaign && typeof campState === 'function' ? campState(g) : null; if (!S || S.flags.watcher_fallen || !((S.quests.q8 && S.quests.q8.done) || S.flags.watcher_awake)) return; }
    if (!g.rules().haunting && !(g.meta.campaign && typeof campState === 'function' && campState(g).flags && ((campState(g).quests.q8 && campState(g).quests.q8.done) || campState(g).flags.watcher_awake) && g.rules().watcherOn !== false)) return;
    if ((g.meta.playTime || 0) < 120 && !this.force) return;
    // his traces, left where you aren't looking: only where the world is kept (the host), near anyone playing there
    if (!g.isGuest) {
      this.traceT -= dt;
      if (this.traceT <= 0) { this.traceT = this.leaveTrace() ? 1200 + Math.random() * 1500 : 60 + Math.random() * 60; }
    }
    // (0.9.0.46) the sightings are each player's own: a guest's game makes them for its players, and a dedicated
    // server, with nobody at it, makes none (it used to be the host's players only, so guests never saw a thing)
    if (p.dead || (typeof SERVER !== 'undefined' && SERVER.on)) return;
    // (0.9.0.47) one left behind (out where the land stopped loading, after a waystone or a portal) is gone after a while
    if (this.active && !this.active.remove && (g.time - (this.active.born || 0) > 90 || !g.entities.includes(this.active))) this.active.remove = true;
    if (this.active && this.active.remove) this.active = null;
    if (this.active) return;
    this.next -= dt;
    if (this.next > 0) return;
    // dusk, night and deep caves make him bolder
    const sky = g.world.getLight(Math.floor(p.x), Math.floor(p.y + p.eye), Math.floor(p.z)) >> 4;
    const underground = sky < 5;
    const chance = (underground ? 0.5 : g.env.day < 0.5 ? 0.6 : 0.4) + Math.min(0.3, (g.env.mist || 0) * 0.4);   // (0.9.0.50) and fog
    if (!this.force && (hauntBossFight(g) || Math.random() > chance)) { this.next = 120 + Math.random() * 240; return; }
    const r = Math.random();
    const mode = underground ? (r < 0.65 ? 'cave' : 'behind') : (r < 0.55 ? 'far' : r < 0.8 ? 'peek' : 'behind');
    const spot = this.findSpot(mode);
    if (!spot) { this.next = 15 + Math.random() * 25; return; }
    this.active = new Watcher(g, spot[0], spot[1], spot[2], mode);
    g.entities.push(this.active);
    this.noticed = false;
    this.force = false;
    this.next = 1200 + Math.random() * 1500;
  }
  // (for /herobrine: make him show himself now, somewhere he could be)
  forceSighting() {
    if (this.active && !this.active.remove) return true;
    this.force = true; this.next = 0;
    for (let i = 0; i < 6 && !this.active; i++) { this.next = 0; this.update(0.01); }
    this.force = false;
    return !!this.active;
  }
  onVanish(w) {
    const g = this.g; if (!g.meta) return;
    const f = g.meta.flags;
    if (!this.noticed) return;
    f.watcherSeen = (f.watcherSeen || 0) + 1;
    if (Math.random() < 0.45) g.sfx.play(Math.random() < 0.5 ? 'cave' : 'cave_breath');
    // the old story: someone who isn't there, telling you to stop
    if (f.watcherSeen >= 3 && !f.watcherSpoke && Math.random() < 0.5) {
      f.watcherSpoke = true;
      setTimeout(() => g.local && g.local.hud.whisper('stop'), 2500 + Math.random() * 4000);
    }
  }
  // Where he stands: in the open at the edge of your view (not behind it), half behind a tree,
  // in a dark cave, or a short way behind you.
  findSpot(mode) {
    const g = this.g, p = g.player, w = g.world;
    if (g.dim === DIM.POCKET) return this.portalSpot();
    const far = Math.max(26, Math.min(g.settings.renderDist * 16 - 18, 46));
    for (let i = 0; i < 24; i++) {
      let ang, d;
      const side = Math.random() < 0.5 ? -1 : 1;
      if (mode === 'far') { ang = p.yaw + side * (0.35 + Math.random() * 0.45); d = 18 + Math.random() * (far - 18); }   // 20-45 degrees off where you look
      else if (mode === 'peek') { ang = p.yaw + side * (0.2 + Math.random() * 0.6); d = 14 + Math.random() * 14; }
      else if (mode === 'behind') { ang = p.yaw + Math.PI + (Math.random() - 0.5) * 0.8; d = 8 + Math.random() * 5; }
      else { ang = p.yaw + (Math.random() - 0.5) * 2.2; d = 12 + Math.random() * 16; }
      const x = Math.floor(p.x - Math.sin(ang) * d) + 0.5, z = Math.floor(p.z - Math.cos(ang) * d) + 0.5;
      if (!w.isLoaded(x, z)) continue;
      let y = -1;
      if (mode === 'cave' || mode === 'behind') {
        for (let yy = Math.floor(p.y) + 5; yy > p.y - 8; yy--) if (T_SOLID[w.getBlock(Math.floor(x), yy - 1, Math.floor(z))] && !w.getBlock(Math.floor(x), yy, Math.floor(z)) && !w.getBlock(Math.floor(x), yy + 1, Math.floor(z))) { y = yy; break; }
        if (mode === 'cave' && y > 0 && (w.getLight(Math.floor(x), y, Math.floor(z)) & 15) > 6) continue; // stays in the dark
      } else {
        y = findSafeY(w, x, z, Math.min(CH - 3, Math.floor(p.y) + 30));
        if (y > 0 && BLOCKS[w.getBlock(Math.floor(x), y - 1, Math.floor(z))].isLeaves) continue;
        // peeking: right beside a tree trunk
        if (mode === 'peek' && y > 0) {
          let trunk = false;
          for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (BLOCKS[w.getBlock(Math.floor(x) + ox, y + 1, Math.floor(z) + oz)].isLog) trunk = true;
          if (!trunk) continue;
        }
      }
      if (y < 0 || Math.abs(y - p.y) > 22) continue;
      const tmp = { x, y, z, game: g };
      if (mode !== 'behind' && !Watcher.prototype.lineOfSight.call(tmp, p, Math.hypot(x - p.x, y + 1.6 - (p.y + p.eye), z - p.z))) continue;
      return [x, y, z];
    }
    return null;
  }

  // (0.9.0.50) in a pocket dimension: just out of a portal its owner built, on the floor beside it (in sight if it can be)
  portalSpot(minD = 5) {
    const g = this.g, p = g.player, w = g.world;
    const ports = hauntPortals(g).filter(q => Math.hypot(q[0] - p.x, q[2] - p.z) < 90);
    if (!ports.length) return null;
    let fallback = null;
    for (let i = 0; i < 30; i++) {
      const q = ports[Math.floor(Math.random() * ports.length)], d = Math.floor(Math.random() * 4), k = 1 + Math.floor(Math.random() * 2);
      const x = q[0] + DIRX[d] * k, z = q[2] + DIRZ[d] * k;
      if (w.getBlock(x, q[1], z) === B.ember_portal || w.getBlock(x, q[1], z) === B.sky_portal) continue;
      const y = riftStandY(w, x + 0.5, z + 0.5, q[1]);
      if (y === null || y > q[1] + 1 || y < q[1] - 2 || Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z) < minD) continue;   // beside it, not up on its frame
      const spot = [x + 0.5, y, z + 0.5];
      const tmp = { x: spot[0], y, z: spot[2], game: g };
      if (Watcher.prototype.lineOfSight.call(tmp, p, Math.hypot(spot[0] - p.x, y + 1.6 - (p.y + p.eye), spot[2] - p.z))) return spot;
      fallback = fallback || spot;
    }
    return fallback;
  }
  // ---- what he leaves behind ------------------------------------------------------------------------
  // Somewhere loaded, 28-70 blocks from every player, that none of them can see.
  unseenSpot(minD = 28, maxD = 70) {
    const g = this.g, w = g.world, p = g.player;
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * TAU, d = minD + Math.random() * (maxD - minD);
      const x = Math.floor(p.x + Math.cos(a) * d), z = Math.floor(p.z + Math.sin(a) * d);
      if (!w.isLoaded(x, z) || !w.isLoaded(x + 16, z) || !w.isLoaded(x - 16, z) || !w.isLoaded(x, z + 16) || !w.isLoaded(x, z - 16)) continue;
      if (g.pawns().some(q => Math.hypot(q.x - x, q.z - z) < minD)) continue;
      const y = findSafeY(w, x + 0.5, z + 0.5, Math.min(CH - 3, Math.floor(p.y) + 40));
      if (y < 0) continue;
      const tmp = { x: x + 0.5, y, z: z + 0.5, game: g };
      if (g.pawns().some(q => Watcher.prototype.lineOfSight.call(tmp, q, Math.hypot(x - q.x, y + 1.6 - (q.y + q.eye), z - q.z)))) continue;
      return [x, y, z];
    }
    return null;
  }
  leaveTrace() {
    if (this.g.isGuest || !this.g.meta) return false;          // (0.9.0.54) the world is the host's to change
    const r = Math.random(), f = this.g.meta.flags;
    const done = r < 0.4 ? this.digTunnel() : r < 0.65 ? this.placeSign() : r < 0.85 ? this.stripTree() : this.swapTorch();
    if (done) f.watcherTraces = (f.watcherTraces || 0) + 1;
    return done;
  }
  // A tunnel bored straight into a hillside or a cave wall (2 tall, usually 1 wide), dimly lit by
  // a redstone torch every six blocks.
  digTunnel() {
    const g = this.g, w = g.world, p = g.player;
    for (let tries = 0; tries < 30; tries++) {
      const s = this.unseenSpot(30, 64); if (!s) return false;
      const [sx, sy0, sz] = s;
      // start at the surface or down in a cave below it
      const sy = Math.random() < 0.5 ? sy0 : Math.max(8, sy0 - 6 - Math.floor(Math.random() * 30));
      const dir = Math.floor(Math.random() * 4), dx = DIRX[dir], dz = DIRZ[dir], px = -dz, pz = dx;   // along, and across
      // the mouth must be open air with ground under it, and solid rock ahead
      if (w.getBlock(sx, sy, sz) !== 0 || w.getBlock(sx, sy + 1, sz) !== 0 || !T_SOLID[w.getBlock(sx, sy - 1, sz)]) continue;
      const rock = (x, y, z) => HAUNT_ROCK.has(w.getBlock(x, y, z));
      let ok = 0;
      for (let k = 1; k <= 8; k++) if (rock(sx + dx * k, sy, sz + dz * k) && rock(sx + dx * k, sy + 1, sz + dz * k) && rock(sx + dx * k + px, sy, sz + dz * k + pz)) ok++;
      if (ok < 7) continue;
      const len = 12 + Math.floor(Math.random() * 18), wide = Math.random() < 0.3 ? 2 : 1;   // mostly 1 wide and 2 tall, now and then 2x2
      let made = 0;
      for (let k = 1; k <= len; k++) {
        const x = sx + dx * k, z = sz + dz * k;
        // stop at anything built, at water, or where the rock runs out
        let stop = false;
        for (let a = 0; a < wide; a++) for (let h = 0; h < 2; h++) { const id = w.getBlock(x + px * a, sy + h, z + pz * a); if (id && !HAUNT_ROCK.has(id)) stop = true; }
        if (stop || T_LIQUID[w.getBlock(x, sy + 2, z)]) break;
        for (let a = 0; a < wide; a++) for (let h = 0; h < 2; h++) w.setBlock(x + px * a, sy + h, z + pz * a, 0, 0, { quiet: true });
        made++;
        // a redstone torch on the wall every five blocks
        if (k % 6 === 3 && rock(x - px, sy + 1, z - pz)) {
          const meta = px === 1 ? 1 : px === -1 ? 2 : pz === 1 ? 3 : 4;    // facing away from the wall at -across
          w.setBlock(x, sy + 1, z, B.redstone_torch, meta, { quiet: true });
        }
      }
      if (made >= 8) return true;
    }
    return false;
  }
  // A sign with a few words on it, facing the way you'll come.
  placeSign() {
    const g = this.g, w = g.world, p = g.player;
    const s = this.unseenSpot(25, 55); if (!s) return false;
    const [x, y, z] = s;
    if (w.getBlock(x, y, z) !== 0 || !T_SOLID[w.getBlock(x, y - 1, z)] || T_LIQUID[w.getBlock(x, y - 1, z)]) return false;
    const sign = B.oak_sign ?? B.spruce_sign; if (sign === undefined) return false;
    const yaw = Math.atan2(p.x - x, p.z - z);                       // turned toward where you are
    const rot = Math.round(((Math.PI - yaw) / TAU) * 16) & 15;
    w.setBlock(x, y, z, sign, rot);
    w.setEntity(x, y, z, { type: 'sign', lines: HAUNT_SIGNS[Math.floor(Math.random() * HAUNT_SIGNS.length)].slice() });
    g.entityChanged(x, y, z);
    return true;
  }
  // A tree with every leaf gone, standing among green ones.
  stripTree() {
    const g = this.g, w = g.world;
    for (let tries = 0; tries < 12; tries++) {
      const s = this.unseenSpot(30, 60); if (!s) return false;
      const [x0, , z0] = s;
      for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) {
        const x = x0 + dx, z = z0 + dz;
        const top = findSafeY(w, x + 0.5, z + 0.5, CH - 3) - 1;
        if (top < 0 || !BLOCKS[w.getBlock(x, top, z)].isLeaves) continue;
        let y = top; while (y > 0 && BLOCKS[w.getBlock(x, y, z)].isLeaves) y--;
        if (!BLOCKS[w.getBlock(x, y, z)].isLog) continue;
        // only a wild tree: nothing built around it
        let built = false;
        for (let k = 0; k < 40 && !built; k++) { const id = w.getBlock(x + Math.floor(Math.random() * 9) - 4, y - 3 + Math.floor(Math.random() * 6), z + Math.floor(Math.random() * 9) - 4); if (id && (BLOCKS[id].render === RENDER.SHAPE || /plank|brick|glass|cobble|wool|door|torch|chest/.test(BLOCKS[id].key))) built = true; }
        if (built) continue;
        let n = 0;
        for (let yy = y - 2; yy <= top + 2; yy++) for (let ez = -4; ez <= 4; ez++) for (let ex = -4; ex <= 4; ex++) if (BLOCKS[w.getBlock(x + ex, yy, z + ez)].isLeaves) { w.setBlock(x + ex, yy, z + ez, 0, 0, { quiet: true }); n++; }
        if (n > 8) return true;
      }
    }
    return false;
  }
  // A torch left burning in the dark becomes a redstone torch while you're away.
  swapTorch() {
    const g = this.g, w = g.world;
    for (const ch of w.chunks.values()) {
      if (!ch.emitters) continue;
      for (const [lx, y, lz, id, meta] of ch.emitters) {
        if (id !== B.torch) continue;
        const x = ch.cx * 16 + lx, z = ch.cz * 16 + lz;
        if (g.pawns().some(q => Math.hypot(q.x - x, q.z - z) < 24)) continue;
        if ((w.getLight(x, y, z) >> 4) > 3 || Math.random() < 0.7) continue;                 // only down in the dark
        let wired = false;
        for (let dy = -2; dy <= 2; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (T_RS[w.getBlock(x + dx, y + dy, z + dz)]) wired = true;
        if (wired) continue;
        const tmp = { x: x + 0.5, y, z: z + 0.5, game: g };
        if (g.pawns().some(q => Watcher.prototype.lineOfSight.call(tmp, q, Math.hypot(x - q.x, y + 1.6 - (q.y + q.eye), z - q.z)))) continue;
        w.setBlock(x, y, z, B.redstone_torch, meta);
        return true;
      }
    }
    return false;
  }
}

// (0.9.0.46) his traces near anyone playing here, a guest too: the host keeps the world, so the host leaves them, by
// whichever player it picks (and on a dedicated server, only by those who have joined)
{
  const baseLeave = Haunt.prototype.leaveTrace;
  Haunt.prototype.leaveTrace = function () {
    const g = this.g, server = typeof SERVER !== 'undefined' && SERVER.on;
    const cands = server || !g.player || g.player.dead ? [] : [null];
    if (g.net && g.net.role === 'host') for (const r of g.net.remotes.values()) if ((r.dim ?? 0) === g.dim && r.placed !== false && !r.dead) cands.push(r);
    if (!cands.length) return false;
    const r = cands[Math.floor(Math.random() * cands.length)];
    if (!r) return baseLeave.call(this);
    const stand = { x: r.x, y: r.y, z: r.z, yaw: r.yaw || 0, pitch: 0, eye: 1.62, dead: false, look() { return lookVector(this.yaw, this.pitch); } };
    Object.defineProperty(g, 'player', { value: stand, configurable: true, writable: true });
    try { return baseLeave.call(this); } finally { delete g.player; }
  };
}

// (0.9.0.50) in a pocket dimension he leaves only small things, by the portal he came through: a sign beside it, or a torch
// swapped while you're away. Nothing dug or stripped: it's the owner's own place.
{
  const baseLeave = Haunt.prototype.leaveTrace;
  Haunt.prototype.leaveTrace = function () {
    const g = this.g;
    if (g.isGuest || !g.meta) return false;                      // (0.9.0.54) the world is the host's to change
    if (g.dim !== DIM.POCKET) return baseLeave.call(this);
    if (!hauntPortals(g).length) return false;
    let done = false;
    if (Math.random() < 0.6) {
      const s = this.portalSpot(12), w = g.world, sign = B.oak_sign ?? B.spruce_sign;
      if (s && sign !== undefined) {
        const [x, y, z] = [Math.floor(s[0]), s[1], Math.floor(s[2])], p = g.player;
        const hidden = !Watcher.prototype.lineOfSight.call({ x: s[0], y, z: s[2], game: g }, p, Math.hypot(s[0] - p.x, y + 1.6 - (p.y + p.eye), s[2] - p.z));
        if (hidden && w.getBlock(x, y, z) === 0 && T_SOLID[w.getBlock(x, y - 1, z)]) {
          const yaw = Math.atan2(p.x - x, p.z - z), rot = Math.round(((Math.PI - yaw) / TAU) * 16) & 15;
          w.setBlock(x, y, z, sign, rot);
          w.setEntity(x, y, z, { type: 'sign', lines: HAUNT_SIGNS[Math.floor(Math.random() * HAUNT_SIGNS.length)].slice() });
          g.entityChanged(x, y, z); done = true;
        }
      }
    } else done = this.swapTorch();
    if (done) g.meta.flags.watcherTraces = (g.meta.flags.watcherTraces || 0) + 1;
    return done;
  };
  // (and a portal's hum as he steps out of one, now and then)
  const baseUpd = Haunt.prototype.update;
  Haunt.prototype.update = function (dt) {
    const before = this.active;
    const r = baseUpd.call(this, dt);
    const a = this.active;
    if (a && a !== before && this.g.dim === DIM.POCKET && Math.random() < 0.5) this.g.sfx.playAt('portal', a.x, a.y + 1, a.z, 24);
    return r;
  };
}
