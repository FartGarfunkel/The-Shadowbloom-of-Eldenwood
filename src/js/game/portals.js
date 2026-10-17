// ---------------------------------------------------------------------------
// game/portals.js — portal frames and travel between dimensions.
//   Ember Depths: obsidian frame, lit with an Ember Igniter.
//   Skylands:     glow lantern frame, filled with a water bucket.
//   Pocket:       no portal — use a Pocket Key anywhere.
// ---------------------------------------------------------------------------

const DIM = { OVERWORLD: 0, DEPTHS: 1, SKYLANDS: 2, POCKET: 3 };
const DIM_NAME = ['Overworld', 'Ember Depths', 'Skylands', 'Pocket Dimension'];
const PORTAL_KIND = {
  ember: { frame: B.obsidian, portal: B.ember_portal, dim: DIM.DEPTHS },
  sky: { frame: B.glowstone, portal: B.sky_portal, dim: DIM.SKYLANDS },
};

// Flood-fill the opening inside a frame on one vertical plane. Any size from 2 wide x 3 tall up to
// 21 x 21 (Minecraft's limits), any shape the frame closes off.
const PORTAL_MAX = 21;
function findPortalOpening(world, sx, sy, sz, frame, axis) {
  const cells = [], seen = new Set(), q = [[sx, sy, sz]];
  let y0 = sy, y1 = sy, h0 = axis ? sz : sx, h1 = h0;
  while (q.length) {
    const [x, y, z] = q.pop();
    const key = x + ',' + y + ',' + z;
    if (seen.has(key)) continue;
    seen.add(key);
    const id = world.getBlock(x, y, z);
    if (id === frame) continue;
    if (id !== 0 && !T_REPLACEABLE[id] && !BLOCKS[id].fire) return null;
    if (T_LIQUID[id] && (world.getMeta(x, y, z) & 15) === 0) return null;   // a pool in the frame
    cells.push([x, y, z]);
    const h = axis ? z : x;
    y0 = Math.min(y0, y); y1 = Math.max(y1, y); h0 = Math.min(h0, h); h1 = Math.max(h1, h);
    if (y1 - y0 >= PORTAL_MAX || h1 - h0 >= PORTAL_MAX || cells.length > PORTAL_MAX * PORTAL_MAX) return null;
    q.push([x, y + 1, z], [x, y - 1, z]);
    if (axis) q.push([x, y, z + 1], [x, y, z - 1]); else q.push([x + 1, y, z], [x - 1, y, z]);
  }
  if (y1 - y0 < 2 || h1 - h0 < 1) return null;
  return cells;
}

// Light a portal whose opening includes this cell (flint and steel or fire inside the frame, a water
// bucket for the Skylands).
function tryIgniteAt(world, sx, sy, sz, kind) {
  const K = PORTAL_KIND[kind];
  if (world.getBlock(sx, sy, sz) === K.frame) return false;
  for (const axis of [0, 1]) {
    const cells = findPortalOpening(world, sx, sy, sz, K.frame, axis);
    if (cells) {
      for (const [x, y, z] of cells) world.setBlock(x, y, z, K.portal, axis, { noFluid: true });
      return true;
    }
  }
  return false;
}
function tryIgnitePortal(world, hit, kind) {
  if (!hit) return false;
  return tryIgniteAt(world, hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz, kind);
}

// Removing a frame block (or a portal block) collapses the whole portal.
function collapsePortalNear(world, x, y, z) {
  const q = [[x + 1, y, z], [x - 1, y, z], [x, y + 1, z], [x, y - 1, z], [x, y, z + 1], [x, y, z - 1]];
  const seen = new Set();
  let n = 0;
  while (q.length && n < PORTAL_MAX * PORTAL_MAX + 50) {
    const [a, b, c] = q.pop();
    const key = a + ',' + b + ',' + c;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!T_PORTAL[world.getBlock(a, b, c)]) continue;
    world.setBlock(a, b, c, 0, 0, { noFluid: true });
    n++;
    q.push([a + 1, b, c], [a - 1, b, c], [a, b + 1, c], [a, b - 1, c], [a, b, c + 1], [a, b, c - 1]);
  }
}

// Find (or build) a landing spot with a return portal in the destination.
function arrivePortal(world, x, z, kind) {
  const K = PORTAL_KIND[kind];
  const portalId = K.portal;
  // 1. an existing portal close by?
  for (let r = 0; r <= 24; r += 2) {
    for (let dz = -r; dz <= r; dz += 1) for (let dx = -r; dx <= r; dx += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r && r) continue;
      const cx = Math.floor(x + dx), cz = Math.floor(z + dz);
      if (!world.isLoaded(cx, cz)) continue;
      for (let y = 4; y < 120; y++) {
        if (world.getBlock(cx, y, cz) === portalId && world.getBlock(cx, y - 1, cz) !== portalId) {
          // stand beside it
          const axis = world.getMeta(cx, y, cz);
          const ox = axis ? 1.5 : 0.5, oz = axis ? 0.5 : 1.5;
          return [cx + ox, y, cz + oz];
        }
      }
    }
  }
  // 2. build one
  const bx = Math.floor(x), bz = Math.floor(z);
  let by = -1;
  if (world.dim === DIM.DEPTHS) {
    for (let y = 30; y < 90 && by < 0; y++) {
      let ok = true;
      for (let dx = -1; dx <= 3 && ok; dx++) for (let dy = 0; dy < 5 && ok; dy++) if (world.getBlock(bx + dx, y + dy, bz) !== 0) ok = false;
      if (ok && T_SOLID[world.getBlock(bx, y - 1, bz)]) by = y;
    }
    if (by < 0) by = 45;
  } else if (world.dim === DIM.SKYLANDS) {
    for (let y = 110; y > 20; y--) if (T_SOLID[world.getBlock(bx, y, bz)]) { by = y + 1; break; }
    if (by < 0) by = 80;
  } else {
    for (let y = 120; y > 2; y--) { const id = world.getBlock(bx, y, bz); if (T_SOLID[id] || T_LIQUID[id]) { by = y + 1; break; } }
    if (by < 0) by = 70;
  }
  const floor = world.dim === DIM.SKYLANDS ? B.skystone : world.dim === DIM.DEPTHS ? B.obsidian : B.cobblestone;
  // clear space + platform
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 4; dx++) {
    world.setBlock(bx + dx, by - 1, bz + dz, floor, 0, { noFluid: true });
    for (let dy = 0; dy < 6; dy++) world.setBlock(bx + dx, by + dy, bz + dz, 0, 0, { noFluid: true });
  }
  // frame 4 wide x 5 tall in the X plane, opening 2 x 3; (0.9.0.15) its foot set into the floor, so you walk
  // straight in and out without a step
  for (let dx = 0; dx < 4; dx++) for (let dy = 0; dy < 5; dy++) {
    const edge = dx === 0 || dx === 3 || dy === 0 || dy === 4;
    world.setBlock(bx + dx, by - 1 + dy, bz, edge ? K.frame : portalId, 0, { noFluid: true });
  }
  return [bx + 1.5, by, bz + 1.6];
}

// Safe standing spot (for respawn / pocket arrival)
function findSafeY(world, x, z, startY) {
  const bx = Math.floor(x), bz = Math.floor(z);
  for (let y = Math.min(CH - 3, startY ?? CH - 3); y > 1; y--) {
    const id = world.getBlock(bx, y - 1, bz);
    if (T_SOLID[id] && !T_SOLID[world.getBlock(bx, y, bz)] && !T_SOLID[world.getBlock(bx, y + 1, bz)] && !T_LIQUID[world.getBlock(bx, y, bz)]) return y;
  }
  return -1;
}

