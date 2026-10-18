// ---------------------------------------------------------------------------
// campaign/roads.js — (alpha 3) the old roads of Eldenwood.
//
// Every town is joined to the others by a road (Stonebridge is the hub, and each town takes the shortest way to the
// network), and every place of the story by a trail to the nearest road or town. Roads leave a town by the gate that
// faces where they're going, wind a little across the land, cross water on plank bridges, and are paved near the towns
// (cobbles and stone), packed earth and gravel in between; trails are footpaths. Signposts stand at the junctions and
// where the roads leave the towns, naming what lies each way.
// Built into the land as it's generated: worlds made before alpha 3 get the roads in the parts not yet explored.
// ---------------------------------------------------------------------------

const ROAD_CELL = 32;
function campRoadsOf(gen) {
  if ((gen.genVersion || 1) < 6 || gen._roadsBuilding) return null;
  const C = campGenDef(); if (!C) return null;
  if (gen._campRoads && gen._campRoadsFor === C.id) return gen._campRoads;
  const net = { segs: [], grid: new Map(), signs: [], keep: [], exits: {} };
  gen._roadsBuilding = true;
  try { campBuildRoads(gen, C, net); } catch (e) { console.warn('roads', e); }
  gen._roadsBuilding = false;
  gen._campRoads = net; gen._campRoadsFor = C.id;
  return net;
}
function campTownR(T) { return T.size === 'large' ? 62 : T.size === 'small' ? 34 : 48; }
// the town's plan, as its streets are laid out (null if the town isn't built the RPG way)
function campTownPlan(gen, id) {
  const C = campGenDef(), T = C && C.towns[id]; if (!T || !gen.villageAt) return null;
  const v = gen.villageAt(Math.floor(T.at[0] / VREG), Math.floor(T.at[1] / VREG));
  return v && v.town === id ? v : null;
}
const ROAD_DX = [0, 1, 0, -1], ROAD_DZ = [-1, 0, 1, 0];      // north, east, south, west (as the towns' streets run)
const ROAD_DIR_NAME = ['North', 'East', 'South', 'West'];
function campBuildRoads(gen, C, net) {
  const towns = Object.entries(C.towns);
  if (!towns.length) return;
  const hubId = (C.start && C.start.town) || towns[0][0];
  const lakes = (C.lands || []).filter(l => l.kind === 'lake');
  const base = (x, z) => gen._roadBaseCol(x, z);
  const rnd = (a, b) => hashFloat(Math.round(a), Math.round(b), gen.seed, 401);
  // each town's streets out into the world: where they end, and which way they run
  for (const [id, T] of towns) {
    const v = campTownPlan(gen, id), out = [];
    if (v) {
      for (const r of v.roads) out.push({ dir: r.d, end: [v.x + ROAD_DX[r.d] * (r.L - 1), v.z + ROAD_DZ[r.d] * (r.L - 1)] });
      net.keep.push({ box: [v.x0 - 1, v.z0 - 1, v.x1 + 1, v.z1 + 1], town: id });
    } else {
      const R = campTownR(T);
      for (let d = 0; d < 4; d++) if (d !== T.skipRoad) out.push({ dir: d, end: [T.at[0] + ROAD_DX[d] * R, T.at[1] + ROAD_DZ[d] * R] });
      net.keep.push({ at: T.at, r: R - 6, town: id });
    }
    net.exits[id] = out;
  }
  for (const P of Object.values(C.places)) if (!P.noGround) net.keep.push({ at: P.at, r: (P.size || 8) + 5, soft: true });
  // where a street's road leaves the town: 16 blocks on, or (alpha 8) on over a river by the walls to the far bank
  const exitOut = (e) => {
    let L = 16;
    if ((C.geoEdition || 1) >= 2) while (L < 52 && base(Math.round(e.end[0] + ROAD_DX[e.dir] * L), Math.round(e.end[1] + ROAD_DZ[e.dir] * L)).h < SEA + 1) L += 4;
    if (L > 16) L += 4;
    return [e.end[0] + ROAD_DX[e.dir] * L, e.end[1] + ROAD_DZ[e.dir] * L];
  };
  // a town's door to the world: out along its street that runs nearest the way you're going
  const exitOf = (id, toward) => {
    const T = C.towns[id], dx = toward[0] - T.at[0], dz = toward[1] - T.at[1], L = Math.hypot(dx, dz) || 1;
    let best = null, bd = -9;
    for (const e of net.exits[id]) { const d = (ROAD_DX[e.dir] * dx + ROAD_DZ[e.dir] * dz) / L; if (d > bd) { bd = d; best = e; } }
    if (!best) return null;
    return { from: best.end.slice(), out: exitOut(best), dir: best.dir, e: best };
  };
  const pushOutOfLakes = (p) => { for (const l of lakes) { const R = (l.r || 50) + (l.fade || 20) * 0.6 + 6, dx = p[0] - l.at[0], dz = p[1] - l.at[1], d = Math.hypot(dx, dz); if (d < R) { p[0] = l.at[0] + dx / (d || 1) * R; p[1] = l.at[1] + dz / (d || 1) * R; } } return p; };
  // a winding line through a few jittered points, smoothed
  const wind = (pts0, amp) => {
    let pts = [];
    for (let i = 0; i < pts0.length - 1; i++) {
      const a = pts0[i], b = pts0[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 46));
      const nx = -(b[1] - a[1]) / (L || 1), nz = (b[0] - a[0]) / (L || 1);
      for (let k = 0; k < n; k++) {
        const t = k / n, j = (k === 0) ? 0 : (rnd(a[0] + k * 13, a[1] + k * 7) - 0.5) * 2 * Math.min(amp, L * 0.09);
        const p = [a[0] + (b[0] - a[0]) * t + nx * j, a[1] + (b[1] - a[1]) * t + nz * j];
        pts.push(k === 0 ? p : pushOutOfLakes(p));
      }
    }
    pts.push(pts0[pts0.length - 1].slice());
    for (let it = 0; it < 2; it++) {   // Chaikin: round the corners (keeping the ends where they are)
      const out = [pts[0]];
      for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
      out.push(pts[pts.length - 1]); pts = out;
    }
    return pts;
  };
  const addLine = (pts, hw, kind, near) => {
    // heights along the way (water counts as just above the sea: a bridge), smoothed, so the road climbs and dips gently
    const hs = pts.map(p => Math.max(base(Math.round(p[0]), Math.round(p[1])).h, SEA + 1));
    const sm = hs.map((h, i) => { let s = 0, n = 0; for (let k = -3; k <= 3; k++) { const v = hs[i + k]; if (v != null) { s += v; n++; } } return s / n; });
    for (let i = 0; i < pts.length - 1; i++) {
      const s = { a: pts[i], b: pts[i + 1], ha: sm[i], hb: sm[i + 1], hw, kind, near };
      const id = net.segs.length; net.segs.push(s);
      const pad = hw + 6, x0 = Math.floor((Math.min(s.a[0], s.b[0]) - pad) / ROAD_CELL), x1 = Math.floor((Math.max(s.a[0], s.b[0]) + pad) / ROAD_CELL);
      const z0 = Math.floor((Math.min(s.a[1], s.b[1]) - pad) / ROAD_CELL), z1 = Math.floor((Math.max(s.a[1], s.b[1]) + pad) / ROAD_CELL);
      for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) { const k = cx + ',' + cz; let l = net.grid.get(k); if (!l) net.grid.set(k, l = []); l.push(id); }
    }
  };
  // the towns: Prim's tree from the hub, each joining the nearest town already on the road
  const dist = (a, b) => Math.hypot(C.towns[a].at[0] - C.towns[b].at[0], C.towns[a].at[1] - C.towns[b].at[1]);
  const joined = [hubId], left = towns.map(([k]) => k).filter(k => k !== hubId), links = [];
  while (left.length) {
    let best = null;
    for (const a of joined) for (const b of left) { const d = dist(a, b); if (!best || d < best.d) best = { a, b, d }; }
    links.push(best); joined.push(best.b); left.splice(left.indexOf(best.b), 1);
  }
  // and the hub reaches every town within a few days' walk directly too
  for (const [k] of towns) if (k !== hubId && !links.some(l => (l.a === hubId && l.b === k) || (l.b === hubId && l.a === k)) && dist(hubId, k) < 760) links.push({ a: hubId, b: k });
  for (const { a, b } of links) {
    const A = C.towns[a], Bt = C.towns[b], ea = exitOf(a, Bt.at), eb = exitOf(b, A.at);
    if (!ea || !eb) continue;
    addLine(wind([ea.from, ea.out, eb.out, eb.from], 34), 1.6, 'road', [a, b]);
    ea.e.used = eb.e.used = true;
    net.signs.push({ at: [ea.out[0] + ROAD_DZ[ea.dir] * 3, ea.out[1] - ROAD_DX[ea.dir] * 3], dir: ea.dir, names: [Bt.name], to: [Bt.at], back: a }, { at: [eb.out[0] + ROAD_DZ[eb.dir] * 3, eb.out[1] - ROAD_DX[eb.dir] * 3], dir: eb.dir, names: [A.name], to: [A.at], back: b });
  }
  // (alpha 8) every gate's street goes on out a little way as a road, so the trails that start there are reached dry-shod
  // (over the river on its bridge, at Stonebridge's south gate)
  if ((C.geoEdition || 1) >= 2) for (const [id] of towns) for (const e of net.exits[id] || []) if (!e.used) addLine([e.end.slice(), exitOut(e)], 1.6, 'road', [id]);
  // the places: a trail to the nearest point on a road, or to the nearest town
  const nearestOnRoads = (p) => {
    let best = null;
    for (const s of net.segs) {
      if (s.kind !== 'road') continue;
      const vx = s.b[0] - s.a[0], vz = s.b[1] - s.a[1], L2 = vx * vx + vz * vz || 1;
      const t = Math.max(0, Math.min(1, ((p[0] - s.a[0]) * vx + (p[1] - s.a[1]) * vz) / L2)), q = [s.a[0] + vx * t, s.a[1] + vz * t];
      const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (!best || d < best.d) best = { q, d, s };
    }
    return best;
  };
  for (const [k, P] of Object.entries(C.places)) {
    if (P.noGround || P.noTrail || P.hidden) continue;
    if (towns.some(([, T]) => Math.hypot(T.at[0] - P.at[0], T.at[1] - P.at[1]) < campTownR(T) + 12)) continue;
    const onRoad = nearestOnRoads(P.at);
    let nt = null; for (const [tk, T] of towns) { const d = Math.hypot(T.at[0] - P.at[0], T.at[1] - P.at[1]) - campTownR(T); if (!nt || d < nt.d) nt = { tk, T, d }; }
    if (onRoad && onRoad.d < (P.size || 8) + 8) continue;
    let to, sign = null, signTo = null;
    if (onRoad && (!nt || onRoad.d < nt.d + 30) && onRoad.d < 460) { to = onRoad.q; sign = onRoad; }
    else if (nt && nt.d < 560) { const e = exitOf(nt.tk, P.at); if (!e) continue; to = e.out; signTo = e; }
    else continue;
    const L = Math.hypot(to[0] - P.at[0], to[1] - P.at[1]) || 1, r0 = (P.size || 8) + 4;
    const start = [P.at[0] + (to[0] - P.at[0]) / L * r0, P.at[1] + (to[1] - P.at[1]) / L * r0];
    addLine(wind([to, start], 18), 0.9, 'trail', [k]);
    if (sign) {
      // a fingerpost where the trail leaves the road, a step to the side of it
      const s = sign.s, vx = s.b[0] - s.a[0], vz = s.b[1] - s.a[1], l = Math.hypot(vx, vz) || 1, px = -vz / l, pz = vx / l;
      const side = (P.at[0] - sign.q[0]) * px + (P.at[1] - sign.q[1]) * pz > 0 ? -1 : 1;
      net.signs.push({ at: [sign.q[0] + px * side * 3.2 + vx / l * 2.5, sign.q[1] + pz * side * 3.2 + vz / l * 2.5], names: [P.name], to: [P.at], along: Math.atan2(vx, -vz) });
    } else if (signTo) net.signs.push({ at: [signTo.out[0] - ROAD_DZ[signTo.dir] * 3, signTo.out[1] + ROAD_DX[signTo.dir] * 3], dir: signTo.dir, names: [P.name], to: [P.at] });
  }
}
// is this column one the roads leave alone (a town, the ground of a place of the story)? 2: a town, 1: a place
function campRoadKeep(net, x, z, pad = 0) {
  for (const k of net.keep) {
    if (k.box) { if (x >= k.box[0] - pad && x <= k.box[2] + pad && z >= k.box[1] - pad && z <= k.box[3] + pad) return 2; }
    else if (Math.hypot(x - k.at[0], z - k.at[1]) < k.r + pad) return k.soft ? 1 : 2;
  }
  return 0;
}
// ---- (alpha 3) the rivers: C.rivers [{ name, pts: [[x, z]...], w, depth }] (version 6 terrain) ----------------------------
function campRiversOf(gen) {
  const C = campGenDef(); if (!C || !C.rivers || (gen.genVersion || 1) < 6) return null;
  if (gen._rivers && gen._riversFor === C.id) return gen._rivers;
  const segs = [], grid = new Map();
  for (const R of C.rivers) for (let i = 0; i < R.pts.length - 1; i++) {
    const a = R.pts[i], b = R.pts[i + 1], s = { a, b, w: R.w || 6, depth: R.depth || 4 }, id = segs.length; segs.push(s);
    const pad = s.w + 8;
    for (let cz = Math.floor((Math.min(a[1], b[1]) - pad) / ROAD_CELL); cz <= Math.floor((Math.max(a[1], b[1]) + pad) / ROAD_CELL); cz++)
      for (let cx = Math.floor((Math.min(a[0], b[0]) - pad) / ROAD_CELL); cx <= Math.floor((Math.max(a[0], b[0]) + pad) / ROAD_CELL); cx++) { const k = cx + ',' + cz; (grid.get(k) || grid.set(k, []).get(k)).push(id); }
  }
  gen._rivers = { segs, grid }; gen._riversFor = C.id;
  return gen._rivers;
}
{
  const baseCol = WorldGen.prototype.column;
  WorldGen.prototype.column = function (x, z) {
    const c = baseCol.call(this, x, z);
    if (this.dim !== 0) return c;
    const RV = campRiversOf(this); if (!RV) return c;
    const ids = RV.grid.get(Math.floor(x / ROAD_CELL) + ',' + Math.floor(z / ROAD_CELL)); if (!ids) return c;
    let best = null;
    for (const id of ids) { const s = RV.segs[id], vx = s.b[0] - s.a[0], vz = s.b[1] - s.a[1], L2 = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((x - s.a[0]) * vx + (z - s.a[1]) * vz) / L2)); const wob = Math.sin((s.a[0] + vx * t) * 0.05) * 2 + Math.sin((s.a[1] + vz * t) * 0.07) * 1.5; const d = Math.hypot(x - (s.a[0] + vx * t + wob), z - (s.a[1] + vz * t)); if (!best || d - s.w < best.d - best.s.w) best = { d, s }; }
    if (!best) return c;
    const { d, s } = best;
    if (d < s.w) { const h = Math.round(SEA - 1 - s.depth * Math.cos((d / s.w) * Math.PI / 2)); return h < c.h ? Object.assign({}, c, { h, river: 1 }) : c; }
    if (d < s.w + 6) { const bank = SEA + 1 + Math.round((d - s.w) / 2); return c.h > bank ? Object.assign({}, c, { h: Math.round(bank + (c.h - bank) * smoothstep(s.w, s.w + 6, d)) }) : c; }
    return c;
  };
}
{
  // the shape of the land: the road is levelled to its smooth line, gently blending into the ground either side
  const baseCol = WorldGen.prototype.column;
  WorldGen.prototype._roadBaseCol = function (x, z) { return baseCol.call(this, x, z); };
  WorldGen.prototype.column = function (x, z) {
    const c = baseCol.call(this, x, z);
    if (this.dim !== 0 || c.h < SEA) return c;              // water stays water: the road crosses on a bridge
    const net = campRoadsOf(this); if (!net || !net.segs.length) return c;
    const R = campRoadNear(net, x, z); if (!R) return c;
    if (campRoadKeep(net, x, z)) return c;
    const s = R.s, hRoad = Math.max(SEA + 1, s.ha + (s.hb - s.ha) * R.t);
    const w = R.d <= s.hw + 0.5 ? 1 : 1 - smoothstep(s.hw + 0.5, s.hw + 5, R.d);
    if (w <= 0) return c;
    const h = Math.round(c.h + (hRoad - c.h) * w * (s.kind === 'trail' ? 0.7 : 1));
    if (h === c.h) return c;
    return Object.assign({}, c, { h, river: 0 });
  };
  // the surface: paving, packed earth, gravel; bridges over water; the way cleared of brush and trees
  const baseGen = WorldGen.prototype.generate;
  WorldGen.prototype.generate = function (ch) {
    const r = baseGen.call(this, ch);
    if (this.dim !== 0) return r;
    try { campPaveChunk(this, ch); } catch (e) { console.warn('roads gen', e); }
    return r;
  };
}
function campPaveChunk(gen, ch) {
  const net = campRoadsOf(gen), C = campGenDef(); if (!net || !net.segs.length || !C) return;
  const bx = ch.cx * 16, bz = ch.cz * 16;
  let any = false;
  for (let cz = Math.floor(bz / ROAD_CELL); cz <= Math.floor((bz + 15) / ROAD_CELL) && !any; cz++) for (let cx = Math.floor(bx / ROAD_CELL); cx <= Math.floor((bx + 15) / ROAD_CELL); cx++) if (net.grid.has(cx + ',' + cz)) { any = true; break; }
  if (!any) return;
  const K = (k, alt) => B[k] !== undefined ? B[k] : B[alt];
  const PATH = K('dirt_path', 'gravel'), GRAVEL = B.gravel, COARSE = K('coarse_dirt', 'dirt'), COBBLE = B.cobblestone, BRICK = K('stone_bricks', 'cobblestone'), MOSSC = K('mossy_cobblestone', 'cobblestone');
  const PLANK = K('spruce_planks', 'planks'), FENCE = K('spruce_fence', 'oak_fence'), LOGP = K('spruce_log', 'log'), SLAB = K('spruce_slab', 'oak_slab');
  const clearable = (id) => id && (BLOCKS[id].render === RENDER.CROSS || /leaves|log|snow_layer|tall_grass|fern|flower|bush|mushroom|vine/.test(BLOCKS[id].key) || T_REPLACEABLE[id]);
  let changed = false;
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
    const x = bx + lx, z = bz + lz;
    const R = campRoadNear(net, x, z); if (!R || R.d > R.s.hw + 0.5) continue;
    const keep = campRoadKeep(net, x, z); if (keep === 2) continue;
    const s = R.s, col = gen.column(x, z), h = col.h;
    if (h < 1 || h >= CH - 4) continue;
    const q = hashFloat(x, z, gen.seed, 411);
    if (h < SEA) {
      // a plank bridge, rails at its edges and log piers every few blocks
      let y = SEA + 1;
      const edge = R.d > s.hw - 0.6;
      if (ch.blocks[cidx(lx, y, lz)] && !T_LIQUID[ch.blocks[cidx(lx, y, lz)]] && !clearable(ch.blocks[cidx(lx, y, lz)])) continue;
      const nearT = (s.near || []).some(id => { const T = C.towns[id]; return T && Math.hypot(T.at[0] - x, T.at[1] - z) < campTownR(T) + 90; });
      // (alpha 8) by a town, a road crosses the river on an arched stone bridge (Thalara's Bridge at Stonebridge)
      const X = nearT && s.kind === 'road' && (C.geoEdition || 1) >= 2 ? campRoadCrossing(gen, s, R.t) : null;
      if (X) {
        const rise = Math.min(4, Math.max(1.5, X.len / 7)), hh = Math.round(2 * rise * Math.sin(Math.PI * X.u)), slabTop = hh & 1;
        y = SEA + 1 + (hh >> 1);
        const openY = SEA + 1 + Math.round((rise - 0.6) * Math.sqrt(Math.max(0, 1 - (2 * X.u - 1) ** 2)));
        for (let yy = Math.min(openY, y); yy < y; yy++) { ch.blocks[cidx(lx, yy, lz)] = BRICK; ch.meta[cidx(lx, yy, lz)] = 0; }
        ch.blocks[cidx(lx, y, lz)] = BRICK; ch.meta[cidx(lx, y, lz)] = 0;
        for (let yy = y + 1; yy < y + 5; yy++) { const id = ch.blocks[cidx(lx, yy, lz)]; if (id && (T_LIQUID[id] || clearable(id))) { ch.blocks[cidx(lx, yy, lz)] = 0; ch.meta[cidx(lx, yy, lz)] = 0; } }
        const SLABS = K('stone_brick_slab', 'cobblestone_slab');
        if (slabTop && !edge && SLABS !== undefined) { ch.blocks[cidx(lx, y + 1, lz)] = SLABS; ch.meta[cidx(lx, y + 1, lz)] = 0; }
        if (edge) {
          ch.blocks[cidx(lx, y + 1, lz)] = K('stone_brick_wall', 'cobblestone_wall'); ch.meta[cidx(lx, y + 1, lz)] = 0;
          if (slabTop) { ch.blocks[cidx(lx, y + 2, lz)] = K('stone_brick_wall', 'cobblestone_wall'); ch.meta[cidx(lx, y + 2, lz)] = 0; }
          // lamps on the parapet at the middle of the span and at its ends
          if (Math.abs(X.u - 0.5) < 0.03 || X.u < 0.04 || X.u > 0.96) { const ly = y + 2 + (slabTop ? 1 : 0); if (B.lantern !== undefined) { ch.blocks[cidx(lx, ly, lz)] = B.lantern; ch.meta[cidx(lx, ly, lz)] = 0; } }
          // the piers stand where the arch springs from the water
          if (X.u < 0.12 || X.u > 0.88) for (let yy = Math.min(openY, y) - 1; yy > Math.max(1, h); yy--) { ch.blocks[cidx(lx, yy, lz)] = BRICK; ch.meta[cidx(lx, yy, lz)] = 0; }
        }
        changed = true; continue;
      }
      ch.blocks[cidx(lx, y, lz)] = s.kind === 'trail' && !edge ? SLAB : nearT ? BRICK : PLANK; ch.meta[cidx(lx, y, lz)] = 0;
      if (edge && s.kind === 'road') {
        ch.blocks[cidx(lx, y + 1, lz)] = nearT ? K('stone_brick_wall', 'cobblestone_wall') : FENCE; ch.meta[cidx(lx, y + 1, lz)] = 0;
        if (((x + z) % 6 + 6) % 6 === 0) for (let yy = y - 1; yy > Math.max(1, h); yy--) { ch.blocks[cidx(lx, yy, lz)] = nearT ? BRICK : LOGP; ch.meta[cidx(lx, yy, lz)] = 0; }
      }
      changed = true; continue;
    }
    if (keep === 1 && q < 0.5) continue;                 // fading out at the edge of a place
    if (s.kind === 'trail' && q < 0.22) continue;       // a footpath, worn in places only
    const i = cidx(lx, h, lz), top = ch.blocks[i];
    if (!top || T_LIQUID[top] || !T_SOLID[top]) continue;
    let blk;
    const townNear = (s.near || []).some(id => { const T = C.towns[id]; return T && Math.hypot(T.at[0] - x, T.at[1] - z) < campTownR(T) + 64; });
    if (s.kind === 'road' && townNear) blk = q < 0.5 ? COBBLE : q < 0.72 ? BRICK : q < 0.85 ? MOSSC : GRAVEL;
    else if (s.kind === 'road') blk = q < 0.62 ? PATH : q < 0.82 ? GRAVEL : COARSE;
    else blk = q < 0.8 ? PATH : COARSE;
    // on a slope the paving would hang in the air: only where the ground under it is solid
    if (!T_SOLID[ch.blocks[cidx(lx, h - 1, lz)]] && blk === GRAVEL) blk = COARSE;
    ch.blocks[i] = blk; ch.meta[i] = 0;
    for (let y = h + 1; y < Math.min(CH, h + 12); y++) { const id = ch.blocks[cidx(lx, y, lz)]; if (!id) { if (y > h + 4) break; continue; } if (clearable(id)) { ch.blocks[cidx(lx, y, lz)] = 0; ch.meta[cidx(lx, y, lz)] = 0; } else break; }
    changed = true;
  }
  // signposts
  const SIGN = K('oak_sign', 'spruce_sign');
  for (const sg of net.signs) {
    const x = Math.floor(sg.at[0]), z = Math.floor(sg.at[1]);
    if (x < bx || x >= bx + 16 || z < bz || z >= bz + 16 || SIGN === undefined) continue;
    const h = gen.column(x, z).h; if (h < SEA || h >= CH - 3) continue;
    const i = cidx(x - bx, h + 1, z - bz);
    if (ch.blocks[i] && !clearable(ch.blocks[i])) continue;
    if (!T_SOLID[ch.blocks[cidx(x - bx, h, z - bz)]]) continue;
    // the board turned across the road, so it reads from both ways along it
    const along = sg.along != null ? sg.along : Math.atan2(ROAD_DX[sg.dir], -ROAD_DZ[sg.dir]);
    const rot = ((Math.round(along / TAU * 16) % 16) + 16) % 16;
    ch.blocks[i] = SIGN; ch.meta[i] = rot;
    ch.blockEntities.set(i, { type: 'sign', lines: campSignLines(C, x, z, sg) });
    changed = true;
  }
  if (changed) ch.recomputeMaxY();
}
// the compass point from (x, z) toward a spot: N, NE, E ...
function campWay(x, z, to) { const ang = Math.atan2(to[0] - x, -(to[1] - z)); return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8]; }
function campSignLines(C, x, z, sg) {
  const fit = (t) => t.length <= 16 ? t : t.slice(0, 15) + '.';
  const lines = [];
  sg.names.forEach((n, k) => { lines.push(fit(campWay(x, z, sg.to[k]) + ' ' + n)); });
  if (sg.back && C.towns[sg.back]) lines.push(fit(campWay(x, z, C.towns[sg.back].at) + ' ' + C.towns[sg.back].name));
  return lines.concat(['', '', '', '']).slice(0, 4);
}
// the nearest road to a column: { d, t, s }
function campRoadNear(net, x, z) {
  const ids = net.grid.get(Math.floor(x / ROAD_CELL) + ',' + Math.floor(z / ROAD_CELL)); if (!ids) return null;
  let best = null;
  for (const id of ids) {
    const s = net.segs[id], vx = s.b[0] - s.a[0], vz = s.b[1] - s.a[1], L2 = vx * vx + vz * vz || 1;
    const t = Math.max(0, Math.min(1, ((x - s.a[0]) * vx + (z - s.a[1]) * vz) / L2));
    const d = Math.hypot(x - (s.a[0] + vx * t), z - (s.a[1] + vz * t));
    if (!best || d - s.hw < best.d - best.s.hw) best = { d, t, s };
  }
  return best && best.d < best.s.hw + 6 ? best : null;
}
// (alpha 8) where a road segment crosses water: the stretches of its line that run over water, and where along one this
// column is (u from 0 to 1), so a bridge can arch from bank to bank
function campRoadCrossing(gen, s, t) {
  if (!s._cross) {
    const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) || 1, n = Math.ceil(L), runs = [];
    let start = -1;
    for (let i = 0; i <= n; i++) {
      const tt = i / n, wet = gen.column(Math.floor(s.a[0] + (s.b[0] - s.a[0]) * tt), Math.floor(s.a[1] + (s.b[1] - s.a[1]) * tt)).h < SEA;
      if (wet && start < 0) start = tt;
      if ((!wet || i === n) && start >= 0) { runs.push([start - 1 / n, (wet ? tt : (i - 1) / n) + 1 / n]); start = -1; }
    }
    s._cross = { runs, L };
  }
  for (const [t0, t1] of s._cross.runs) if (t >= t0 && t <= t1 && t1 > t0) return { u: (t - t0) / (t1 - t0), len: (t1 - t0) * s._cross.L };
  return null;
}
// what the map shows: the roads (segments with a, b, kind)
function campRoadLines(g) { const gen = g && g.world && g.world.gen; const net = gen && g.dim === 0 ? campRoadsOf(gen) : null; return net ? net.segs : []; }

// ---- (alpha 3) the towns as they are now: what changed since the first versions of the land (version 6 terrain) -------
// T.a3: { palisade, walls, guards, buildings: [more, appended], roadLen }
{
  const baseTown = WorldGen.prototype.campaignTownAt;
  WorldGen.prototype.campaignTownAt = function (rx, rz) {
    const F = baseTown.call(this, rx, rz);
    if (!F || (this.genVersion || 1) < 6) return F;
    const C = campGenDef(), T = C && C.towns[F.town], A = T && T.a3;
    if (!A) return F;
    if (A.palisade) F.palisade = true;
    if (A.walls) F.walls = A.walls;
    if (A.guards != null) F.guards = A.guards;
    if (A.buildings) for (const b of A.buildings) { F.want.push(typeof b === 'string' ? b : b.t); F.signs.push(typeof b === 'string' ? null : (b.sign || null)); F.decors.push(typeof b === 'string' ? null : (b.decor || null)); }
    if (A.tier) F.tier = A.tier;
    return F;
  };
}
if (typeof window !== 'undefined') window.__roads = { net: () => campRoadsOf(GAME.world.gen), plan: (id) => campTownPlan(GAME.world.gen, id), gates: (id) => gatesOfPlan(GAME.world.gen, campTownPlan(GAME.world.gen, id)), near: (x, z) => campRoadNear(campRoadsOf(GAME.world.gen), x, z), keep: (x, z) => campRoadKeep(campRoadsOf(GAME.world.gen), x, z), tick: (dt) => gatesTick(GAME, dt || 1), rt: GATES_RT, draws: () => { const out = [], l = GAME.locals[0], cam = l.camera(0.016); blockEntityDraws(GAME, out, cam, 4); return out.filter(d => d.mesh && d.mesh === (GATES_RT.mesh.get('t0_0:1') || {}).leaf).map(d => ({ p: [d.px, d.py, d.pz], o: [0, 1, 2, 3].map(i => [d.m[12 + 0], d.m[13], d.m[14]][0]), m: Array.from(d.m).map(v => Math.round(v * 100) / 100), light: d.light })); }, mesh: (id, i) => gateMeshes(GAME.renderer.gl, gatesOfPlan(GAME.world.gen, campTownPlan(GAME.world.gen, id))[i]) };

// ---- (alpha 3) a letter with a map in it (C.letters[k].map: true): its last page is the map, drawn in ink ---------------
// Eldon's map shows the towns and the places he knew of (and anything you've found since), the roads and the river,
// his warnings in the margin, and a compass rose.
function campDrawMap(cv, g, L) {
  const C = campDef(g), c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.fillStyle = '#ead9b0'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(120,90,40,${Math.random() * 0.06})`; c.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  const pts = []; for (const T of Object.values(C.towns)) pts.push(T.at); for (const P of Object.values(C.places)) if (!P.noGround) pts.push(P.at);
  const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]), x0 = Math.min(...xs) - 60, x1 = Math.max(...xs) + 60, z0 = Math.min(...zs) - 60, z1 = Math.max(...zs) + 60;
  const k = Math.min((W - 40) / (x1 - x0), (H - 40) / (z1 - z0)), ox = (W - (x1 - x0) * k) / 2, oz = (H - (z1 - z0) * k) / 2;
  const X = (x) => ox + (x - x0) * k, Z = (z) => oz + (z - z0) * k;
  // the land's shapes: lakes, marshes, mountains, forests
  for (const l of C.lands || []) {
    const r = l.r * k;
    c.beginPath(); c.arc(X(l.at[0]), Z(l.at[1]), r, 0, TAU);
    c.fillStyle = l.kind === 'lake' ? 'rgba(80,110,140,.45)' : l.kind === 'marsh' ? 'rgba(90,110,70,.25)' : l.kind === 'mountain' ? 'rgba(110,90,70,.25)' : l.kind === 'forest' ? 'rgba(60,90,50,.18)' : 'rgba(120,100,70,.12)'; c.fill();
    if (l.kind === 'mountain') { c.strokeStyle = 'rgba(70,50,30,.6)'; c.lineWidth = 1.2; for (let i = -1; i <= 1; i++) { const mx = X(l.at[0]) + i * r * 0.45; c.beginPath(); c.moveTo(mx - 8, Z(l.at[1]) + 6); c.lineTo(mx, Z(l.at[1]) - 8); c.lineTo(mx + 8, Z(l.at[1]) + 6); c.stroke(); } }
    if (l.kind === 'forest') { c.fillStyle = 'rgba(50,70,40,.5)'; for (let i = 0; i < 9; i++) { const a = i * 2.4, d = r * 0.6 * ((i % 3) / 3 + 0.3); c.beginPath(); c.arc(X(l.at[0]) + Math.cos(a) * d, Z(l.at[1]) + Math.sin(a) * d, 3.2, 0, TAU); c.fill(); } }
  }
  // the river, the roads
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const R of C.rivers || []) { c.strokeStyle = 'rgba(60,90,130,.7)'; c.lineWidth = 3; c.beginPath(); R.pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Z(p[1])) : c.moveTo(X(p[0]), Z(p[1]))); c.stroke(); }
  const net = g.world && g.world.gen ? campRoadsOf(g.world.gen) : null;
  if (net) for (const s of net.segs) { c.strokeStyle = s.kind === 'road' ? 'rgba(90,60,30,.8)' : 'rgba(90,60,30,.45)'; c.lineWidth = s.kind === 'road' ? 1.8 : 1; c.setLineDash(s.kind === 'road' ? [] : [3, 3]); c.beginPath(); c.moveTo(X(s.a[0]), Z(s.a[1])); c.lineTo(X(s.b[0]), Z(s.b[1])); c.stroke(); }
  c.setLineDash([]);
  // the towns, and the places Eldon knew of (or you've found)
  const S = campState(g), known = (id) => (L.mapShows || []).includes(id) || (S.known && S.known[id]) || (S.seen && S.seen[id]);
  c.font = '600 12px "Pixelify Sans", serif'; c.textAlign = 'center';
  for (const T of Object.values(C.towns)) { const x = X(T.at[0]), z = Z(T.at[1]); c.fillStyle = '#5a2a14'; c.fillRect(x - 5, z - 5, 10, 10); c.strokeStyle = '#2a1408'; c.strokeRect(x - 5, z - 5, 10, 10); c.fillStyle = '#2a1408'; c.fillText(T.name, x, z - 9); }
  c.font = '11px "Pixelify Sans", serif';
  for (const [id, P] of Object.entries(C.places)) { if (P.noGround || !known(id)) continue; const x = X(P.at[0]), z = Z(P.at[1]); c.fillStyle = '#7a3a1a'; c.beginPath(); c.arc(x, z, 3, 0, TAU); c.fill(); c.fillStyle = '#4a2a14'; c.fillText(P.name, x, z + 13); }
  // Eldon's warnings
  for (const n of L.mapNotes || []) { const x = X(n.at[0]), z = Z(n.at[1]); c.strokeStyle = 'rgba(140,30,20,.75)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, z, (n.r || 40) * k, 0, TAU); c.stroke(); c.fillStyle = 'rgba(140,30,20,.9)'; c.font = 'italic 11px serif'; c.fillText(n.text, x, z + (n.r || 40) * k + 12); }
  if (typeof mapRose === 'function') mapRose(c, W - 40, 40, 30, true);
  c.strokeStyle = 'rgba(90,60,30,.6)'; c.lineWidth = 3; c.strokeRect(6, 6, W - 12, H - 12);
}
{
  const baseDraw = BookUI.prototype.draw;
  BookUI.prototype.draw = function (...a) {
    const C = typeof campDef === 'function' ? campDef(this.g) : null, L = C && C.letters && C.letters[this.key];
    if (L && L.map && !this._mapPage) { this._mapPage = true; this.pages.push('\u0000map'); }
    const r = baseDraw.apply(this, a);
    if (L && L.map && this.pages[this.page] === '\u0000map') {
      const t = this.el.querySelector('.bk-text');
      if (t) { t.innerHTML = ''; const cv = document.createElement('canvas'); cv.width = 520; cv.height = 400; cv.style.cssText = 'width:100%;max-width:520px;image-rendering:auto;border-radius:4px'; t.appendChild(cv); try { campDrawMap(cv, this.g, L); } catch (e) { console.warn('map', e); } }
    }
    return r;
  };
}

// ---- (alpha 3) the distant land (game/distant.js) the way it really is: the campaign's own ground (ash on the mountain,
// red sand on the Salt Road, mud in the marshes), and the roads and trails, seen from far off ---------------------------
if (typeof distTop === 'function') {
  const baseTop = distTop;
  distTop = function (gen, wx, wz, c) {
    let top = baseTop(gen, wx, wz, c);
    try {
      if (gen.dim !== 0 || c.h < SEA) return top;
      const net = campRoadsOf(gen);
      if (net && net.segs.length) {
        const R = campRoadNear(net, wx, wz);
        if (R && R.d <= R.s.hw + 0.5 && campRoadKeep(net, wx, wz) !== 2) {
          const C = campGenDef(), townNear = C && (R.s.near || []).some(id => { const T = C.towns[id]; return T && Math.hypot(T.at[0] - wx, T.at[1] - wz) < campTownR(T) + 64; });
          return R.s.kind === 'road' && townNear ? B.cobblestone : (B.dirt_path ?? B.gravel);
        }
      }
      const L = campLandsOf(gen); if (!L) return top;
      for (const l of L) {
        if (l.auto || !l.surface) continue;
        const d = Math.hypot(wx - l.at[0], wz - l.at[1]); if (d >= l.R) continue;
        const w = campLandW(l, d), q = hashFloat(wx, wz, gen.seed, 71);
        if (q > w + 0.1) continue;
        const k = l.surface[Math.floor(hashFloat(wx, wz, gen.seed, 72) * l.surface.length)];
        if (B[k] !== undefined) top = B[k];
        break;
      }
    } catch (e) { /* the plain ground */ }
    return top;
  };
}
