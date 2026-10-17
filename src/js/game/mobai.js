// ---------------------------------------------------------------------------
// game/mobai.js — finding a way on foot.
//
// A* over the block grid: creatures walk, step up one block (with a hop),
// drop down up to three, cut corners only where both sides are clear, wade
// through water (slowly) and keep out of lava, fire and cactus. Searches are
// capped, and if the goal can't be reached they head for the nearest spot
// they could get to, so they still come as close as they can.
// ---------------------------------------------------------------------------

const NAV_DANGER = new Uint8Array(MAX_BLOCKS);
for (const b of BLOCKS) if (b.fire || b.key === 'lava' || b.key === 'cactus' || b.key === 'magma_block' || b.key === 'sweet_berry_bush' || b.key === 'wither_rose' || b.key === 'campfire' || b.key === 'soul_campfire') NAV_DANGER[b.id] = 1;
// Things you can't stand on top of even though they're solid (you'd hop onto a fence and get stuck).
const NAV_NOSTAND = new Uint8Array(MAX_BLOCKS);
for (const b of BLOCKS) if (T_SHAPE[b.id] === SHAPE.FENCE || T_SHAPE[b.id] === SHAPE.WALL) NAV_NOSTAND[b.id] = 1;

class NavHeap {
  constructor() { this.a = []; }
  push(n) { const a = this.a; a.push(n); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= n.f) break; a[i] = a[p]; i = p; } a[i] = n; }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < (m === i ? last.f : a[m].f)) m = l; if (r < a.length && a[r].f < (m === i ? last.f : a[m].f)) m = r; if (m === i) break; a[i] = a[m]; i = m; } a[i] = last; }
    return top;
  }
  get size() { return this.a.length; }
}

// Path from (sx,sy,sz) to (tx,ty,tz) in block cells (feet). Returns [[x,y,z], ...] or null.
function findPath(w, sx, sy, sz, tx, ty, tz, opts = {}) {
  const H = opts.h || 2, maxDrop = opts.maxDrop ?? 3, maxNodes = opts.maxNodes || 700, swim = opts.swim !== false;
  const R = 40;
  if (Math.abs(tx - sx) > R - 2 || Math.abs(tz - sz) > R - 2) return null;
  const pass = (x, y, z) => { const id = w.getBlock(x, y, z); return !T_SOLID[id] && !NAV_DANGER[id]; };
  const clear = (x, y, z) => { for (let k = 0; k < H; k++) if (!pass(x, y + k, z)) return false; return true; };
  const water = (x, y, z) => T_LIQUID[w.getBlock(x, y, z)] === 1;
  const ground = (x, y, z) => { const id = w.getBlock(x, y - 1, z); return (T_SOLID[id] && !NAV_NOSTAND[id] && !NAV_DANGER[id]) || (swim && water(x, y - 1, z)) || (swim && water(x, y, z)); };
  const stand = (x, y, z) => y > 0 && y < CH - H && clear(x, y, z) && ground(x, y, z);
  const key = (x, y, z) => ((x - sx + R) | ((z - sz + R) << 7) | (y << 14));
  const hfn = (x, y, z) => { const dx = Math.abs(x - tx), dz = Math.abs(z - tz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz) + Math.abs(y - ty) * 0.6; };
  const open = new NavHeap(), seen = new Map();
  const start = { x: sx, y: sy, z: sz, g: 0, f: hfn(sx, sy, sz), p: null };
  open.push(start); seen.set(key(sx, sy, sz), start);
  let best = start, bestH = start.f, n = 0;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (open.size && n++ < maxNodes) {
    const c = open.pop();
    if (c.closed) continue;
    c.closed = true;
    const hc = hfn(c.x, c.y, c.z);
    if (hc < bestH) { bestH = hc; best = c; }
    if (c.x === tx && c.z === tz && Math.abs(c.y - ty) <= 1) { best = c; break; }
    for (const [dx, dz] of DIRS) {
      const nx = c.x + dx, nz = c.z + dz;
      if (Math.abs(nx - sx) >= R || Math.abs(nz - sz) >= R) continue;
      if (dx && dz && (!clear(c.x + dx, c.y, c.z) || !clear(c.x, c.y, c.z + dz))) continue;   // no squeezing past corners
      let ny = -1, cost = dx && dz ? 1.414 : 1;
      if (stand(nx, c.y, nz)) ny = c.y;
      else if (!dx || !dz) {
        if (pass(c.x, c.y + H, c.z) && stand(nx, c.y + 1, nz)) { ny = c.y + 1; cost += 0.6; }   // hop up one
        else if (clear(nx, c.y, nz)) {
          for (let d = 1; d <= maxDrop; d++) if (stand(nx, c.y - d, nz)) { ny = c.y - d; cost += 0.3 * d; break; } else if (!pass(nx, c.y - d, nz)) break;
        }
      }
      if (ny < 0) continue;
      if (water(nx, ny, nz)) cost += 1.5;
      const k = key(nx, ny, nz), g2 = c.g + cost;
      const old = seen.get(k);
      if (old && (old.closed || old.g <= g2)) continue;
      const node = { x: nx, y: ny, z: nz, g: g2, f: g2 + hfn(nx, ny, nz) * 1.1, p: c };
      seen.set(k, node); open.push(node);
    }
  }
  if (best === start) return null;
  const out = [];
  for (let c = best; c && c !== start; c = c.p) out.push([c.x, c.y, c.z]);
  return out.reverse();
}

Object.assign(Mob.prototype, {
  // Which way to head to reach (tx,ty,tz) on foot: follows a path, refreshed now and then. Null to go straight.
  navDir(tx, ty, tz, dt) {
    this.navT = (this.navT || 0) - dt;
    const ng = this.navGoal;
    const moved = !ng || Math.hypot(tx - ng[0], tz - ng[2]) > 1.5 || Math.abs(ty - ng[1]) > 1.5;
    if (this.navT <= 0 || moved || !this.path) {
      this.navT = 0.6 + Math.random() * 0.4;
      this.path = findPath(this.game.world, Math.floor(this.x), Math.floor(this.y + 0.45), Math.floor(this.z), Math.floor(tx), Math.floor(ty + 0.45), Math.floor(tz),
        { h: Math.max(1, Math.ceil(this.h - 0.05)), maxDrop: 3, swim: true });
      this.pathI = 0; this.navGoal = [tx, ty, tz];
    }
    const P = this.path;
    if (!P) return null;
    while (this.pathI < P.length) {
      const nd = P[this.pathI];
      if (Math.hypot(nd[0] + 0.5 - this.x, nd[2] + 0.5 - this.z) < 0.35 + this.w * 0.4 && Math.abs(nd[1] - this.y) < 1.2) this.pathI++;
      else break;
    }
    if (this.pathI >= P.length) return null;
    const nd = P[this.pathI];
    if (nd[1] - this.y > 0.55 && this.onGround) this.wantJump = true;            // the next spot is a real step up (paths and slabs it just walks onto)
    // stuck against something: look again soon
    const prog = Math.hypot(this.x - (this._navX ?? this.x), this.z - (this._navZ ?? this.z));
    this._navX = this.x; this._navZ = this.z;
    this._stuckT = prog < dt * 0.3 ? (this._stuckT || 0) + dt : 0;
    if (this._stuckT > 1.2) { this._stuckT = 0; this.navT = 0; if (this.stepAhead()) this.wantJump = true; }
    return Math.atan2(-(nd[0] + 0.5 - this.x), -(nd[2] + 0.5 - this.z));
  },
});

// Is there a block just ahead that a jump would get it up onto? (one high, room above, not a fence or a wall)
Mob.prototype.stepAhead = function () {
  const w = this.game.world, fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), r = this.w + 0.35;
  const x = Math.floor(this.x + fx * r), z = Math.floor(this.z + fz * r), y = Math.floor(this.y + 0.3);
  const id = w.getBlock(x, y, z);
  if (!T_SOLID[id]) return false;
  const k = T_SHAPE[id];
  if (k === SHAPE.FENCE || k === SHAPE.WALL || k === SHAPE.GATE) return false;
  for (let dy = 1; dy <= Math.ceil(this.h); dy++) if (T_SOLID[w.getBlock(x, y + dy, z)]) return false;
  return true;
};
