// ---------------------------------------------------------------------------
// game/portallinks.js — 0.8.4: portals remember where they lead.
// ---------------------------------------------------------------------------
// Going through a portal links it with the one you come out of, both ways, so going back takes you
// home to the portal you left from (not to wherever you happen to be standing in the other world).
// The world round the far end is loaded before looking for a portal there, so one that's already
// built is found instead of a new one being made.
function portalAnchor(w, x, y, z) {
  let start = null;
  for (let dy = 0; dy <= 2 && !start; dy++) for (let dz = -1; dz <= 1 && !start; dz++) for (let dx = -1; dx <= 1 && !start; dx++) {
    const bx = Math.floor(x) + dx, by = Math.floor(y) + dy, bz = Math.floor(z) + dz;
    if (T_PORTAL[w.getBlock(bx, by, bz)]) start = [bx, by, bz];
  }
  if (!start) return null;
  const id = w.getBlock(...start), seen = new Set([start.join(',')]), q = [start];
  let best = start;
  while (q.length && seen.size < 500) {
    const [cx, cy, cz] = q.pop();
    if (cy < best[1] || (cy === best[1] && (cx < best[0] || (cx === best[0] && cz < best[2])))) best = [cx, cy, cz];
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const n = [cx + dx, cy + dy, cz + dz], k = n.join(',');
      if (!seen.has(k) && w.getBlock(...n) === id) { seen.add(k); q.push(n); }
    }
  }
  return best;
}
const portalStand = (w, a) => { const axis = w.getMeta(a[0], a[1], a[2]); return [a[0] + (axis ? 1.5 : 0.5), a[1], a[2] + (axis ? 0.5 : 1.5)]; };
{
  const ensureAround = (w, x, z, r) => { const cx = Math.floor(x) >> 4, cz = Math.floor(z) >> 4; for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) w.ensureChunk(cx + dx, cz + dz); };
  Game.prototype.travelPortal = async function (portalDim) {
    if (this.isGuest) { this.net.sendPortal(portalDim); return; }
    const kind = portalDim === DIM.DEPTHS ? 'ember' : 'sky';
    const from = this.dim, to = from === DIM.OVERWORLD ? portalDim : DIM.OVERWORLD;
    const lead = this.locals[0].player;
    const here = portalAnchor(this.world, lead.x, lead.y, lead.z), links = this.meta.portalLinks || (this.meta.portalLinks = {});
    const key = here ? from + ':' + here.join(',') : null, link = key && links[key];
    const back = here ? portalStand(this.world, here) : [lead.x, lead.y, lead.z];
    await this.changeDimension(to, () => {
      const W = this.world;
      let pos = null, there = null;
      if (link && link.dim === to) {
        ensureAround(W, link.anchor[0], link.anchor[2], 1);
        if (T_PORTAL[W.getBlock(...link.anchor)]) { pos = link.pos || portalStand(W, link.anchor); there = link.anchor; }
      }
      if (!pos) { ensureAround(W, lead.x, lead.z, 2); pos = arrivePortal(W, lead.x, lead.z, kind); }
      if (!there) { ensureAround(W, pos[0], pos[2], 1); there = portalAnchor(W, pos[0], pos[1], pos[2]) || portalAnchor(W, pos[0] - 1, pos[1], pos[2] - 1); }
      if (here && there) { links[key] = { dim: to, anchor: there, pos }; links[to + ':' + there.join(',')] = { dim: from, anchor: here, pos: back }; }
      for (const l of this.locals) { l.player.x = pos[0] + l.index * 0.6; l.player.y = pos[1]; l.player.z = pos[2]; }
      return pos;
    });
  };
}

// ---- lighting the Skylands portal, forgivingly --------------------------------------------------
// Pour the water bucket at any inside face of the Glow Lantern frame (or straight into the frame) and
// it lights. Water already standing in the frame from an earlier try no longer stops it either:
// it becomes part of the portal, the way the Aether's does.
findPortalOpening = (function (base) {
  return function (world, sx, sy, sz, frame, axis) {
    if (frame !== B.glowstone) return base(world, sx, sy, sz, frame, axis);
    const cells = [], seen = new Set(), q = [[sx, sy, sz]];
    let y0 = sy, y1 = sy, h0 = axis ? sz : sx, h1 = h0;
    while (q.length) {
      const [x, y, z] = q.pop(), key = x + ',' + y + ',' + z;
      if (seen.has(key)) continue;
      seen.add(key);
      const id = world.getBlock(x, y, z);
      if (id === frame) continue;
      if (id !== 0 && !T_REPLACEABLE[id] && T_LIQUID[id] !== 1 && !BLOCKS[id].fire) return null;
      cells.push([x, y, z]);
      const h = axis ? z : x;
      y0 = Math.min(y0, y); y1 = Math.max(y1, y); h0 = Math.min(h0, h); h1 = Math.max(h1, h);
      if (y1 - y0 >= PORTAL_MAX || h1 - h0 >= PORTAL_MAX || cells.length > PORTAL_MAX * PORTAL_MAX) return null;
      q.push([x, y + 1, z], [x, y - 1, z]);
      if (axis) q.push([x, y, z + 1], [x, y, z - 1]); else q.push([x + 1, y, z], [x - 1, y, z]);
    }
    if (y1 - y0 < 2 || h1 - h0 < 1) return null;
    return cells;
  };
})(findPortalOpening);
tryIgnitePortal = (function (base) {
  return function (world, hit, kind) {
    if (base(world, hit, kind)) return true;
    // clicked the frame from the front, or the floor in front: try every side of the block clicked
    if (!hit || kind !== 'sky' || world.getBlock(hit.x, hit.y, hit.z) !== PORTAL_KIND.sky.frame) return false;
    for (const [dx, dy, dz] of [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0]])
      if (tryIgniteAt(world, hit.x + dx, hit.y + dy, hit.z + dz, kind)) return true;
    return false;
  };
})(tryIgnitePortal);
