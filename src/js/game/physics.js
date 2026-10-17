// ---------------------------------------------------------------------------
// game/physics.js — AABB-vs-voxel collision and ray casting.
// Entities: feet-centre position (x,y,z), half-width w, height h.
// ---------------------------------------------------------------------------

// Collision boxes (world units) of every solid block overlapping the region.
// Shaped blocks (slabs, stairs, fences...) contribute their real boxes;
// fences and walls reach 1.5 blocks up, so the cell below is checked too.
const _BOXES = [];
// Scaffolding is a one-way platform: it only holds up whoever is above it and not sneaking.
// moveEntity sets these for the entity being moved; null means "count it" (placement checks).
let PHYS_FEET = null, PHYS_SNEAK = false;
function gatherBoxes(world, minX, minY, minZ, maxX, maxY, maxZ, out = _BOXES) {
  out.length = 0;
  const x0 = Math.floor(minX), x1 = Math.floor(maxX - 1e-7);
  const y0 = Math.floor(minY) - 1, y1 = Math.floor(maxY - 1e-7);
  const z0 = Math.floor(minZ), z1 = Math.floor(maxZ - 1e-7);
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const id = world.getBlockPhys(x, y, z);
    if (!T_SOLID[id]) continue;
    if (!T_SHAPE[id] && !(BLOCKS[id].shape && SHAPES[BLOCKS[id].shape])) {
      if (y >= Math.floor(minY)) out.push([x, y, z, x + 1, y + 1, z + 1]);
      continue;
    }
    if (BLOCKS[id].scaffold && PHYS_FEET !== null && (PHYS_SNEAK || PHYS_FEET < y + 1 - 0.05)) continue;
    const bs = worldBoxes(world, x, y, z, id, 1);
    if (!bs) { if (y >= Math.floor(minY)) out.push([x, y, z, x + 1, y + 1, z + 1]); continue; }
    for (const b of bs) {
      const bx0 = x + b[0] / 16, by0 = y + b[1] / 16, bz0 = z + b[2] / 16, bx1 = x + b[3] / 16, by1 = y + b[4] / 16, bz1 = z + b[5] / 16;
      if (bx1 <= minX || bx0 >= maxX || by1 <= minY || by0 >= maxY || bz1 <= minZ || bz0 >= maxZ) continue;
      out.push([bx0, by0, bz0, bx1, by1, bz1]);
    }
  }
  return out;
}
function collides(world, minX, minY, minZ, maxX, maxY, maxZ) {
  const bs = gatherBoxes(world, minX, minY, minZ, maxX, maxY, maxZ, []);
  for (const b of bs) if (b[3] > minX && b[0] < maxX && b[4] > minY && b[1] < maxY && b[5] > minZ && b[2] < maxZ) return true;
  return false;
}

// Sweep one axis against the boxes: how far can we move before touching one?
function clipAxis(boxes, ax, d, mn, mx) {
  const o1 = (ax + 1) % 3, o2 = (ax + 2) % 3;
  for (const b of boxes) {
    if (b[o1 + 3] <= mn[o1] + 1e-7 || b[o1] >= mx[o1] - 1e-7 || b[o2 + 3] <= mn[o2] + 1e-7 || b[o2] >= mx[o2] - 1e-7) continue;
    if (d > 0 && b[ax] >= mx[ax] - 1e-7) d = Math.min(d, b[ax] - mx[ax]);
    else if (d < 0 && b[ax + 3] <= mn[ax] + 1e-7) d = Math.max(d, b[ax + 3] - mn[ax]);
  }
  return d;
}
// Moves e by its velocity, sliding along walls and stepping up onto slabs and
// stairs (e.stepHeight, default 0.6 for walkers).
function moveEntity(world, e, dt) {
  let dx = e.vx * dt, dy = e.vy * dt, dz = e.vz * dt;
  const step = e.stepHeight ?? 0.6;
  const wasGround = e.onGround;
  e.onGround = false; e.hitWall = false; e.hitCeiling = false;
  const sweep = (ox, oy, oz, mx, my, mz) => {
    PHYS_FEET = e.y; PHYS_SNEAK = !!e.sneaking;
    const mn = [e.x - e.w, e.y, e.z - e.w], mxv = [e.x + e.w, e.y + e.h, e.z + e.w];
    const boxes = gatherBoxes(world, Math.min(mn[0], mn[0] + mx) - 0.01, Math.min(mn[1], mn[1] + my) - 0.01, Math.min(mn[2], mn[2] + mz) - 0.01,
      Math.max(mxv[0], mxv[0] + mx) + 0.01, Math.max(mxv[1], mxv[1] + my) + 0.01, Math.max(mxv[2], mxv[2] + mz) + 0.01, []);
    const ry = clipAxis(boxes, 1, my, mn, mxv); mn[1] += ry; mxv[1] += ry;
    const rx = clipAxis(boxes, 0, mx, mn, mxv); mn[0] += rx; mxv[0] += rx;
    const rz = clipAxis(boxes, 2, mz, mn, mxv); mn[2] += rz; mxv[2] += rz;
    return [rx, ry, rz];
  };
  // long moves are split so nothing tunnels through thin blocks
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 0.45));
  dx /= n; dy /= n; dz /= n;
  let blockedX = false, blockedZ = false, landed = false, ceil = false;
  for (let i = 0; i < n; i++) {
    let [rx, ry, rz] = sweep(0, 0, 0, dx, dy, dz);
    const hitX = Math.abs(rx - dx) > 1e-6, hitZ = Math.abs(rz - dz) > 1e-6;
    // step up: if we bumped into something low while on the ground, try lifting over it
    // (0.9.0.41) a player just off the ground (e.airStep) may still step over a small lip
    const grounded = wasGround || landed || (dy < 0 && Math.abs(ry - dy) > 1e-6);
    const stepMax = grounded ? step : Math.min(step, e.airStep || 0);
    if ((hitX || hitZ) && stepMax > 0) {
      // lift no higher than needed: a doorway's lintel (or a low ceiling) can stop a full-height lift from fitting
      // through, when the little lip of a path or a slab only needs a sixteenth
      const sy = e.y, maxUp = sweep(0, 0, 0, 0, stepMax, 0)[1];
      let stepped = false;
      for (const want of [0.07, 0.13, 0.26, 0.51, step]) {
        if (want > stepMax + 1e-6) break;
        const lift = Math.min(want, maxUp);
        e.y = sy + lift;
        const [sx2, , sz2] = sweep(0, 0, 0, dx, 0, dz);
        e.x += sx2; e.z += sz2;
        const down = sweep(0, 0, 0, 0, -lift - 0.01, 0)[1];
        e.y += down;
        if (Math.hypot(sx2, sz2) > Math.hypot(rx, rz) + 1e-4 && down < 0) {
          landed = true; dy = 0; e.vy = Math.min(e.vy, 0);
          if (Math.abs(sx2 - dx) > 1e-6) blockedX = true;
          if (Math.abs(sz2 - dz) > 1e-6) blockedZ = true;
          stepped = true; break;
        }
        e.x -= sx2; e.z -= sz2; e.y = sy;
        if (lift >= maxUp - 1e-6) break;
      }
      if (stepped) continue;
    }
    e.x += rx; e.y += ry; e.z += rz;
    if (Math.abs(ry - dy) > 1e-6) { if (dy < 0) landed = true; else ceil = true; dy = 0; }
    if (hitX) { blockedX = true; dx = 0; }
    if (hitZ) { blockedZ = true; dz = 0; }
  }
  if (landed) { e.onGround = true; e.vy = 0; }
  if (ceil) { e.hitCeiling = true; e.vy = Math.min(0, e.vy); }
  if (blockedX) { e.vx = 0; e.hitWall = true; }
  if (blockedZ) { e.vz = 0; e.hitWall = true; }
  // Probe just below the feet so standing still still counts as grounded.
  PHYS_FEET = e.y; PHYS_SNEAK = !!e.sneaking;
  if (!e.onGround && e.vy <= 0 && collides(world, e.x - e.w + 0.01, e.y - 0.02, e.z - e.w + 0.01, e.x + e.w - 0.01, e.y, e.z + e.w - 0.01)) e.onGround = true;
  PHYS_FEET = null; PHYS_SNEAK = false;
}

// Which liquids/portals/cactus touch the entity's box.
function sampleContacts(world, e) {
  const r = { water: false, lava: false, eyeWater: false, eyeLava: false, portal: 0, cactus: false, ladder: false, web: false, hot: false };
  const x0 = Math.floor(e.x - e.w), x1 = Math.floor(e.x + e.w), z0 = Math.floor(e.z - e.w), z1 = Math.floor(e.z + e.w);
  const y0 = Math.floor(e.y), y1 = Math.floor(e.y + e.h - 0.01);
  for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const id = world.getBlock(x, y, z);
    const lq = T_LIQUID[id];
    if (lq === 1) r.water = true; else if (lq === 2) r.lava = true;
    else if (T_WLOG[id] && (world.getMeta(x, y, z) & WLOG)) r.water = true;
    if (T_PORTAL[id]) r.portal = T_PORTAL[id];
    const d = BLOCKS[id];
    if (d.climb) { r.ladder = true; if (d.scaffold) r.scaffold = true; }
    if (d.sticky) r.web = true;
    if (d.fire) r.fire = true;
  }
  const under = world.getBlock(Math.floor(e.x), Math.floor(e.y - 0.05), Math.floor(e.z));
  if (BLOCKS[under].hot) r.hot = true;
  // cactus is touched from the sides
  for (let y = y0; y <= y1; y++) for (const [dx, dz] of [[e.w + 0.05, 0], [-e.w - 0.05, 0], [0, e.w + 0.05], [0, -e.w - 0.05]]) {
    if (world.getBlock(Math.floor(e.x + dx), y, Math.floor(e.z + dz)) === B.cactus) r.cactus = true;
  }
  if (e.eye !== undefined) {
    const id = world.getBlock(Math.floor(e.x), Math.floor(e.y + e.eye), Math.floor(e.z));
    if (T_LIQUID[id] === 1) {
      const m = world.getMeta(Math.floor(e.x), Math.floor(e.y + e.eye), Math.floor(e.z));
      const above = world.getBlock(Math.floor(e.x), Math.floor(e.y + e.eye) + 1, Math.floor(e.z));
      const top = Math.floor(e.y + e.eye) + liquidHeight(id, m, above);
      r.eyeWater = e.y + e.eye < top;
    } else if (T_WLOG[id] && (world.getMeta(Math.floor(e.x), Math.floor(e.y + e.eye), Math.floor(e.z)) & WLOG)) r.eyeWater = true;
    if (T_LIQUID[id] === 2) r.eyeLava = true;
  }
  return r;
}

// Voxel DDA ray cast. Returns {x,y,z,id,nx,ny,nz,dist} or null.
function raycastBlocks(world, ox, oy, oz, dx, dy, dz, maxDist, pickLiquid) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
  const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity, tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
  let tmx = dx > 0 ? (x + 1 - ox) * tdx : dx < 0 ? (ox - x) * tdx : Infinity;
  let tmy = dy > 0 ? (y + 1 - oy) * tdy : dy < 0 ? (oy - y) * tdy : Infinity;
  let tmz = dz > 0 ? (z + 1 - oz) * tdz : dz < 0 ? (oz - z) * tdz : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;
  for (let i = 0; i < 256 && t <= maxDist; i++) {
    const id = world.getBlock(x, y, z);
    if (id) {
      const r = T_RENDER[id];
      const liquid = r === RENDER.LIQUID;
      if (!liquid || (pickLiquid && T_LIQUID[id] && (world.getMeta(x, y, z) & 15) === 0)) {
        const boxes = r === RENDER.CUBE || r === RENDER.CUTOUT || liquid ? null : worldBoxes(world, x, y, z, id, 2);
        if (!boxes) return { x, y, z, id, nx, ny, nz, dist: t };
        // shaped block: hit its real boxes, or keep going
        let best = Infinity, bn = null;
        for (const b of boxes) {
          const hit = rayBoxN(ox, oy, oz, dx, dy, dz, x + b[0] / 16, y + b[1] / 16, z + b[2] / 16, x + b[3] / 16, y + b[4] / 16, z + b[5] / 16);
          if (hit && hit[0] < best) { best = hit[0]; bn = hit; }
        }
        // (0.9.0.11) something sunk onto a bottom half slab (items set down, a torch, a campfire) pokes down
        // into the slab's cell: a ray that comes in from the side meets it here, before the slab under it
        if (T_SHAPE[id] === SHAPE_KIND.SLAB && (world.getMeta(x, y, z) & 7) === 0) {
          const up = world.getBlock(x, y + 1, z);
          if (up && T_SINK[up]) {
            const ub = worldBoxes(world, x, y + 1, z, up, 2);
            if (ub) for (const b of ub) {
              const hit = rayBoxN(ox, oy, oz, dx, dy, dz, x + b[0] / 16, y + 1 + b[1] / 16, z + b[2] / 16, x + b[3] / 16, y + 1 + b[4] / 16, z + b[5] / 16);
              if (hit && hit[0] < best && hit[0] <= maxDist) return { x, y: y + 1, z, id: up, nx: hit[1], ny: hit[2], nz: hit[3], dist: hit[0], boxes: ub };
            }
          }
        }
        if (bn && best <= maxDist) return { x, y, z, id, nx: bn[1], ny: bn[2], nz: bn[3], dist: best, boxes };
      }
    }
    if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; nx = -sx; ny = 0; nz = 0; }
    else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; nx = 0; ny = -sy; nz = 0; }
    else { z += sz; t = tmz; tmz += tdz; nx = 0; ny = 0; nz = -sz; }
  }
  return null;
}

// Ray vs box with the normal of the face hit: [t, nx, ny, nz] or null.
function rayBoxN(ox, oy, oz, dx, dy, dz, x0, y0, z0, x1, y1, z1) {
  let tmin = -Infinity, tmax = Infinity, n = [0, 0, 0];
  const o = [ox, oy, oz], d = [dx, dy, dz], mn = [x0, y0, z0], mx = [x1, y1, z1];
  for (let a = 0; a < 3; a++) {
    if (Math.abs(d[a]) < 1e-9) { if (o[a] < mn[a] || o[a] > mx[a]) return null; continue; }
    let t1 = (mn[a] - o[a]) / d[a], t2 = (mx[a] - o[a]) / d[a];
    let s = -1;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1; }
    if (t1 > tmin) { tmin = t1; n = [0, 0, 0]; n[a] = s; }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return [Math.max(0, tmin), n[0], n[1], n[2]];
}
// Ray vs entity AABB (slab method). Returns distance or -1.
function rayAABB(ox, oy, oz, dx, dy, dz, minX, minY, minZ, maxX, maxY, maxZ) {
  let tmin = 0, tmax = Infinity;
  const ax = [[ox, dx, minX, maxX], [oy, dy, minY, maxY], [oz, dz, minZ, maxZ]];
  for (const [o, d, mn, mx] of ax) {
    if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) return -1; continue; }
    let t1 = (mn - o) / d, t2 = (mx - o) / d;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return -1;
  }
  return tmin;
}

function lookVector(yaw, pitch) {
  const cp = Math.cos(pitch);
  return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp];
}
