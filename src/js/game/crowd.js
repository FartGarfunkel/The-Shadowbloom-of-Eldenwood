// ---------------------------------------------------------------------------
// game/crowd.js — bodies don't share space. Mobs and players nudge each other
// apart when they overlap, the way Minecraft's entities push: gently, the big
// ones shove the small ones more, and walking on keeps you moving, so you
// can still squeeze past a cow in a doorway. A heap of slimes spreads out
// instead of sitting inside one another.
// ---------------------------------------------------------------------------

Game.prototype.crowdPush = function (dt) {
  if (this.isGuest || dt <= 0) return;
  const w = this.world, bodies = [];
  for (const e of this.entities) {
    if (!(e instanceof Mob) || !e.alive || e.remove || e.riddenBy || e.mountedOn || e.T.noPush) continue;
    const r = e.w || 0.3, h = e.h || 1;
    bodies.push({ e, r, h, mass: Math.max(0.05, r * r * h * 4), player: false });
  }
  for (const l of this.locals) {
    const p = l.player;
    if (p.dead || l.riding || l.sleeping || (p.flying && this.creative)) continue;
    bodies.push({ e: p, r: 0.3, h: p.sneaking ? 1.5 : 1.8, mass: 0.65, player: true });
  }
  if (bodies.length < 2) return;
  bodies.forEach((b, i) => { b.i = i; });
  // a coarse grid so only near neighbours are compared
  const cell = new Map(), key = (x, z) => (x & 0xffff) | ((z & 0xffff) << 16);
  for (const b of bodies) { const k = key(Math.floor(b.e.x / 2), Math.floor(b.e.z / 2)); let a = cell.get(k); if (!a) cell.set(k, a = []); a.push(b); }
  // room for the body there: every block's real shape counts (a closed door, a fence, a pane, a slab),
  // so a crowd pressing on a door can't squeeze anyone through it
  const free = (x, y, z, r, h) => !collides(w, x - r, y + 0.02, z - r, x + r, y + Math.min(h, 1.8) - 0.02, z + r);
  const nudge = (b, nx, nz, amt, dv) => {
    const e = b.e;
    if (e.pinned) return;                                   // someone sitting or asleep stays put
    e.vx += nx * dv; e.vz += nz * dv;
    // and a little straight shift apart, if there's room (mobs only: a player's step is theirs)
    if (!b.player && amt > 0) { const x = e.x + nx * amt, z = e.z + nz * amt; if (free(x, e.y, z, b.r * 0.9, b.h)) { e.x = x; e.z = z; } }
  };
  for (const b of bodies) {
    const cx = Math.floor(b.e.x / 2), cz = Math.floor(b.e.z / 2);
    for (let gz = cz - 1; gz <= cz + 1; gz++) for (let gx = cx - 1; gx <= cx + 1; gx++) {
      const list = cell.get(key(gx, gz)); if (!list) continue;
      for (const o of list) {
        if (o === b || o.e === b.e || (b.player && o.player)) continue;
        if (o.i < b.i) continue;                                         // each pair once
        const a = b.e, c = o.e;
        if (a.y + b.h <= c.y + 0.05 || c.y + o.h <= a.y + 0.05) continue;     // one above the other
        let dx = c.x - a.x, dz = c.z - a.z, d = Math.hypot(dx, dz);
        const min = (b.r + o.r) * 0.92;
        if (d >= min) continue;
        const depth = (min - d) / min;
        if (d < 0.001) { const ang = Math.random() * TAU; dx = Math.cos(ang); dz = Math.sin(ang); d = 1; }
        const nx = dx / d, nz = dz / d;
        const tot = b.mass + o.mass, sa = o.mass / tot, sc = b.mass / tot;
        const dv = Math.min(6, depth * 30) * dt;                 // soft: a shove, not a wall
        const shift = Math.min(0.15, depth * min * 0.5) * Math.min(1, dt * 20);
        nudge(b, -nx, -nz, shift * sa, dv * sa * (b.player ? 0.6 : 1));
        nudge(o, nx, nz, shift * sc, dv * sc * (o.player ? 0.6 : 1));
      }
    }
  }
};
{
  const base = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { base.call(this, dt); try { this.crowdPush(dt); } catch (e) { console.warn('crowd', e); } };
}
