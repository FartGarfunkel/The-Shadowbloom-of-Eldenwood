// ---------------------------------------------------------------------------
// world/shapes.js — blocks that aren't full cubes.
//
// One function describes every non-cube block as a list of boxes (in 1/16
// block "pixels"), and the same boxes drive drawing, collision and the
// selection outline, so what you see is what you bump into.
//
// Many shapes depend on their neighbours: fences, walls, glass panes and iron
// bars join up with whatever is beside them, and stairs turn into inner and
// outer corners exactly like Minecraft's.
//
// Meta bits (the per-block byte):
//   bit 7 (0x80)  waterlogged (any block marked wlog)
//   slab          0 bottom, 1 top, 2..5 vertical against N/E/S/W, 6 double
//   stairs        0-1 facing (N,E,S,W: the high side), 2 upside-down
//   door          0-1 facing, 2 open, 3 hinge on the right, 4 upper half
//   trapdoor      0-1 facing (hinge side), 2 open, 3 top half
//   gate          0-1 facing, 2 open
//   ladder        0-1 side of the wall it hangs on
//   bed           0-1 facing (toward the head), 2 head half
//   log / axle    0-1 axis (0 y, 1 x, 2 z)
//   candle        0-1 how many (1-4), 2 lit       sea pickle: 0-1 how many
//   cake          0-2 slices eaten (0-6)          composter: 0-2 fill level (0-8)
//   end/lightning rod 0-1 axis                    item frame: 0-1 wall side
//   cocoa         0-1 growth, 4-5 side of the log it hangs on
//   redstone dust 0-3 power                       pressure plate: 0-3 power
//   lever, button 0-2 where it's fixed (0 floor, 1 ceiling, 2-5 wall to the N/E/S/W), 3 on, 4 turned
//   repeater      0-1 facing (output), 2-3 delay, 4 powered, 5 locked
//   comparator    0-1 facing, 2 subtract, 3 lit, 4-7 output strength
//   piston, observer, dispenser, dropper: 0-2 facing in 3D (0 down 1 up 2 N 3 S 4 W 5 E), 3 powered
//   piston head   0-2 facing, 3 sticky            hopper: 0-2 spout (0 down, 2-5 sideways), 3 locked
//   rail          0-3 shape (0-9)                 powered/detector/activator rail: 0-2 shape (0-5), 3 powered
//   daylight      0-3 power, 4 inverted           target: 0-3 power
//   tripwire hook 0-1 wall side, 2 strung, 3 powered     tripwire: 0 powered, 1 strung
//   doors, trapdoors, gates, note blocks, bells, bulbs: bit 5 (0x20) = held open/on by redstone
// ---------------------------------------------------------------------------

const SHAPE = { NONE: 0, SLAB: 1, STAIRS: 2, FENCE: 3, GATE: 4, WALL: 5, PANE: 6, DOOR: 7, TRAPDOOR: 8, LADDER: 9, CARPET: 10, BED: 11, LAYER: 12,
  CANDLE: 13, CAKE: 14, ROD: 15, SCAFFOLD: 16, PATH: 17, FRAME: 18, COMPOSTER: 19, COCOA: 20, PETALS: 21,
  WIRE: 22, LEVER: 23, BUTTON: 24, PLATE: 25, REPEATER: 26, COMPARATOR: 27, RAIL: 28, PISTON_BASE: 29, PISTON_HEAD: 30, HOPPER: 31, DAYLIGHT: 32,
  HOOK: 33, TRIPWIRE: 34, CACTUS: 35, CHORUS: 36 };
const DIRX = [0, 1, 0, -1], DIRZ = [-1, 0, 1, 0];   // N, E, S, W
const WLOG = 0x80;
// Six directions (pistons, observers, dispensers): 0 down, 1 up, 2 north, 3 south, 4 west, 5 east.
const D6X = [0, 0, 0, 0, -1, 1], D6Y = [-1, 1, 0, 0, 0, 0], D6Z = [0, 0, -1, 1, 0, 0];
const OPP6 = [1, 0, 3, 2, 5, 4];
const H2D6 = [2, 5, 3, 4];                 // N E S W -> six-way
const D62H = [-1, -1, 0, 2, 3, 1];         // six-way -> N E S W (-1 for up/down)
const D6_FACE = [3, 2, 5, 4, 1, 0];        // six-way -> mesher face index (+x,-x,+y,-y,+z,-z)
const FACE_D6 = [5, 4, 1, 0, 3, 2];        // and back

// ---- redstone dust: what it joins up with ---------------------------------------------
// Does dust beside a block (in direction h) run toward it?
function rsAttracts(id, m, h) {
  switch (T_RS[id]) {
    case RS.WIRE: case RS.TORCH: case RS.TORCH_OFF: case RS.BLOCK: case RS.LEVER: case RS.BUTTON: case RS.PLATE:
    case RS.COMPARATOR: case RS.DAYLIGHT: case RS.TARGET: case RS.DRAIL: case RS.HOOK: return true;
    case RS.REPEATER: return ((m & 3) & 1) === (h & 1);
    case RS.OBSERVER: return (m & 7) === H2D6[h];
  }
  return false;
}
// Per side N/E/S/W: 0 nothing, 1 runs that way, 2 also climbs the side of the next block.
function wireConnects(nb, nm, out) {
  const upCond = T_COND[nb(0, 1, 0)];
  for (let h = 0; h < 4; h++) {
    const dx = DIRX[h], dz = DIRZ[h], n = nb(dx, 0, dz);
    let c = 0;
    if (rsAttracts(n, nm(dx, 0, dz), h)) c = 1;
    else if (!upCond && T_SOLID[n] && T_RS[nb(dx, 1, dz)] === RS.WIRE) c = 2;
    else if (!T_COND[n] && T_RS[nb(dx, -1, dz)] === RS.WIRE) c = 1;
    out[h] = c;
  }
  return out;
}

// ---- rails ------------------------------------------------------------------------------
// The two ends of each rail shape: [dx, dy, dz] (dy = 1 where a slope rises).
// 0 N-S, 1 E-W, 2-5 rising to the E/W/N/S, 6-9 curves S-E, S-W, N-W, N-E.
const RAIL_EXITS = [
  [[0, 0, -1], [0, 0, 1]], [[-1, 0, 0], [1, 0, 0]],
  [[-1, 0, 0], [1, 1, 0]], [[-1, 1, 0], [1, 0, 0]], [[0, 1, -1], [0, 0, 1]], [[0, 0, -1], [0, 1, 1]],
  [[0, 0, 1], [1, 0, 0]], [[0, 0, 1], [-1, 0, 0]], [[0, 0, -1], [-1, 0, 0]], [[0, 0, -1], [1, 0, 0]],
];
function railShape(id, m) { return BLOCKS[id].rail === 'normal' ? (m & 15) % 10 : (m & 7) % 6; }

// ---- small things fixed to a floor, ceiling or wall (levers, buttons) ---------------------
// Boxes are given lying on the floor (y = out of the surface, z = along the long side).
function attachBox(b, m) {
  const k = m & 7;
  let o = b;
  if (k >= 2) { o = [b[0], b[2], b[1], b[3], b[5], b[4]]; for (let i = 6; i < b.length; i++) o[i] = b[i]; return rotBox(o, k - 2); }
  if (m & 16) o = rotBox(o, 1);
  return k === 1 ? flipBox(o) : o;
}
// The same transform for a point (pixels) and for a direction.
function attachPoint(p, m, vec) {
  const k = m & 7;
  let [x, y, z] = p;
  const c = vec ? 0 : 16;
  if (k >= 2) {
    [y, z] = [z, y];
    const f = k - 2;
    if (f === 1) [x, z] = [c - z, x]; else if (f === 2) [x, z] = [c - x, c - z]; else if (f === 3) [x, z] = [z, c - x];
    return [x, y, z];
  }
  if (m & 16) [x, z] = [c - z, x];
  if (k === 1) y = c - y;
  return [x, y, z];
}
// A box modelled facing up, turned to face any of the six directions.
function box6(b, dir) {
  const [x0, y0, z0, x1, y1, z1] = b;
  let o;
  switch (dir) {
    case 1: o = [x0, y0, z0, x1, y1, z1]; break;
    case 0: o = [x0, 16 - y1, z0, x1, 16 - y0, z1]; break;
    case 2: o = [x0, z0, 16 - y1, x1, z1, 16 - y0]; break;
    case 3: o = [x0, z0, y0, x1, z1, y1]; break;
    case 4: o = [16 - y1, x0, z0, 16 - y0, x1, z1]; break;
    default: o = [y0, x0, z0, y1, x1, z1];
  }
  return o;
}
// Per-face tile names for a six-way box: front, back and the four sides.
function faces6(dir, front, back, side) {
  const f = [side, side, side, side, side, side];
  f[D6_FACE[dir]] = front; f[D6_FACE[OPP6[dir]]] = back;
  return f;
}
function withFaces(b, faces) { b.faces = faces; return b; }

// Rotate a north-facing box (pixels) to face f; flip it upside down.
function rotBox(b, f) {
  if (!f) return b;
  const [x0, y0, z0, x1, y1, z1] = b;
  let ax, az, bx, bz;
  if (f === 1) { ax = 16 - z0; az = x0; bx = 16 - z1; bz = x1; }
  else if (f === 2) { ax = 16 - x0; az = 16 - z0; bx = 16 - x1; bz = 16 - z1; }
  else { ax = z0; az = 16 - x0; bx = z1; bz = 16 - x1; }
  const out = [Math.min(ax, bx), y0, Math.min(az, bz), Math.max(ax, bx), y1, Math.max(az, bz)];
  for (let i = 6; i < b.length; i++) out[i] = b[i];
  return out;
}
function flipBox(b) { const out = b.slice(); out[1] = 16 - b[4]; out[4] = 16 - b[1]; return out; }

// Is this neighbour a full, solid cube (fences and walls join to those)?
function fullSolid(id) { return T_SOLID[id] && T_OPAQUE[id] && !T_SHAPE[id]; }
function joinsFence(id) { const s = T_SHAPE[id]; return s === SHAPE.FENCE || s === SHAPE.GATE || fullSolid(id); }
function joinsWall(id) { const s = T_SHAPE[id]; return s === SHAPE.WALL || s === SHAPE.PANE || s === SHAPE.GATE || fullSolid(id); }
function joinsPane(id) { const s = T_SHAPE[id]; return s === SHAPE.PANE || s === SHAPE.WALL || fullSolid(id); }

// ---- stairs: Minecraft's corner rules ------------------------------------------------
const STAIR_STRAIGHT = 0, STAIR_OUTER_L = 1, STAIR_OUTER_R = 2, STAIR_INNER_L = 3, STAIR_INNER_R = 4;
function stairShape(meta, nb, nm) {
  const f = meta & 3, top = meta & 4;
  const isStair = (id) => T_SHAPE[id] === SHAPE.STAIRS;
  const ccw = (f + 3) & 3;
  const canTake = (dir) => { const id = nb(DIRX[dir], 0, DIRZ[dir]); if (!isStair(id)) return true; const m = nm(DIRX[dir], 0, DIRZ[dir]); return (m & 3) !== f || (m & 4) !== top; };
  const bid = nb(DIRX[f], 0, DIRZ[f]);
  if (isStair(bid)) {
    const bm = nm(DIRX[f], 0, DIRZ[f]);
    if ((bm & 4) === top) { const d1 = bm & 3; if ((d1 & 1) !== (f & 1) && canTake((d1 + 2) & 3)) return d1 === ccw ? STAIR_OUTER_L : STAIR_OUTER_R; }
  }
  const o = (f + 2) & 3, fid = nb(DIRX[o], 0, DIRZ[o]);
  if (isStair(fid)) {
    const fm = nm(DIRX[o], 0, DIRZ[o]);
    if ((fm & 4) === top) { const d2 = fm & 3; if ((d2 & 1) !== (f & 1) && canTake(d2)) return d2 === ccw ? STAIR_INNER_L : STAIR_INNER_R; }
  }
  return STAIR_STRAIGHT;
}
// candles and sea pickles: one to four little cylinders
const CANDLE_BOXES = [
  [[7, 0, 7, 9, 6, 9]],
  [[5, 0, 7, 7, 6, 9], [9, 0, 6, 11, 5, 8]],
  [[7, 0, 9, 9, 6, 11], [5, 0, 6, 7, 5, 8], [9, 0, 7, 11, 3, 9]],
  [[5, 0, 5, 7, 6, 7], [9, 0, 5, 11, 5, 7], [5, 0, 9, 7, 3, 11], [9, 0, 8, 11, 4, 10]],
];
const PICKLE_BOXES = [
  [[6, 0, 6, 10, 6, 10]],
  [[3, 0, 3, 7, 6, 7], [9, 0, 9, 13, 4, 13]],
  [[2, 0, 2, 6, 6, 6], [10, 0, 3, 14, 4, 7], [6, 0, 9, 10, 6, 13]],
  [[2, 0, 2, 6, 7, 6], [10, 0, 2, 14, 5, 6], [2, 0, 10, 6, 5, 14], [10, 0, 10, 14, 7, 14]],
];
const STAIR_BOXES = [
  [[0, 8, 0, 16, 16, 8]],                                  // straight: the back step
  [[0, 8, 0, 8, 16, 8]],                                   // outer left (NW)
  [[8, 8, 0, 16, 16, 8]],                                  // outer right (NE)
  [[0, 8, 0, 16, 16, 8], [0, 8, 8, 8, 16, 16]],            // inner left
  [[0, 8, 0, 16, 16, 8], [8, 8, 8, 16, 16, 16]],           // inner right
];

// ---- the box list ------------------------------------------------------------------
// nb(dx,dy,dz) -> neighbour id, nm(dx,dy,dz) -> neighbour meta.
// purpose: 0 draw, 1 collide, 2 select. Returns null for an empty shape.
function shapeBoxes(id, meta, nb, nm, purpose = 0) {
  const s = T_SHAPE[id];
  const m = meta & 0x7f;
  const def = BLOCKS[id];
  switch (s) {
    case SHAPE.SLAB: {
      const k = m & 7;
      if (k === 6) return [[0, 0, 0, 16, 16, 16]];
      if (k === 0) return [[0, 0, 0, 16, 8, 16]];
      if (k === 1) return [[0, 8, 0, 16, 16, 16]];
      return [rotBox([0, 0, 0, 16, 16, 8], k - 2)];
    }
    case SHAPE.STAIRS: {
      const f = m & 3, top = m & 4;
      const sh = stairShape(m, nb, nm);
      const out = [[0, 0, 0, 16, 8, 16]];
      for (const b of STAIR_BOXES[sh]) out.push(rotBox(b, f));
      return top ? out.map(flipBox) : out;
    }
    case SHAPE.FENCE: {
      const H = purpose === 1 ? 24 : 16;
      const out = [[6, 0, 6, 10, H, 10]];
      for (let d = 0; d < 4; d++) {
        if (!joinsFence(nb(DIRX[d], 0, DIRZ[d]))) continue;
        if (purpose === 0) { out.push(rotBox([7, 12, 0, 9, 15, 6], d)); out.push(rotBox([7, 6, 0, 9, 9, 6], d)); }
        else out.push(rotBox([6, 0, 0, 10, H, 6], d));
      }
      return out;
    }
    case SHAPE.GATE: {
      const f = m & 3, open = m & 4;
      if (purpose === 1 && open) return [];          // open: nothing to bump into (null would mean a full block)
      if (purpose === 1) return [rotBox([0, 0, 6, 16, 24, 10], f)];
      const out = [[0, 5, 7, 2, 16, 9], [14, 5, 7, 16, 16, 9]];
      if (!open) out.push([2, 6, 7, 14, 9, 9], [2, 12, 7, 14, 15, 9], [6, 9, 7, 10, 12, 9]);
      else out.push([0, 6, 9, 2, 9, 15], [0, 12, 9, 2, 15, 15], [14, 6, 9, 16, 9, 15], [14, 12, 9, 16, 15, 15], [0, 9, 13, 2, 12, 15], [14, 9, 13, 16, 12, 15]);
      return out.map(b => rotBox(b, f));
    }
    case SHAPE.WALL: {
      const c = [0, 1, 2, 3].map(d => joinsWall(nb(DIRX[d], 0, DIRZ[d])));
      const straight = (c[0] && c[2] && !c[1] && !c[3]) || (c[1] && c[3] && !c[0] && !c[2]);
      const post = !straight || T_SHAPE[nb(0, 1, 0)] === SHAPE.WALL;
      const out = [];
      if (post) out.push([4, 0, 4, 12, purpose === 1 ? 24 : 16, 12]);
      for (let d = 0; d < 4; d++) if (c[d]) out.push(rotBox([5, 0, 0, 11, purpose === 1 ? 24 : 14, 8], d));
      return out;
    }
    case SHAPE.PANE: {
      const out = [[7, 0, 7, 9, 16, 9]];
      for (let d = 0; d < 4; d++) if (joinsPane(nb(DIRX[d], 0, DIRZ[d]))) out.push(rotBox([7, 0, 0, 9, 16, 7], d));
      return out;
    }
    case SHAPE.DOOR: {
      const f = m & 3, open = m & 4, right = m & 8;
      // closed: on the near side of the block; open: swung against the hinge side
      let b = rotBox([0, 0, 13, 16, 16, 16], f);
      if (open) b = rotBox(right ? [13, 0, 0, 16, 16, 16] : [0, 0, 0, 3, 16, 16], f);
      return [b];
    }
    case SHAPE.TRAPDOOR: {
      const f = m & 3, open = m & 4, top = m & 8;
      if (open) return [rotBox([0, 0, 0, 16, 16, 3], f)];
      return [top ? [0, 13, 0, 16, 16, 16] : [0, 0, 0, 16, 3, 16]];
    }
    case SHAPE.LADDER: return [rotBox(purpose === 0 ? [0, 0, 0, 16, 16, 1] : [0, 0, 0, 16, 16, 3], m & 3)];
    case SHAPE.CARPET: return [[0, 0, 0, 16, 1, 16]];
    case SHAPE.LAYER: return [[0, 0, 0, 16, 2 * ((m & 7) + 1), 16]];
    case SHAPE.CACTUS: {
      // like the classic model: the top and bottom span the block, the sides sit a pixel in, spines poking out at the corners
      if (purpose !== 0) return [[1, 0, 1, 15, 16, 15]];
      const ends = [0, 0, 0, 16, 16, 16], ns = [0, 0, 1, 16, 16, 15], ew = [1, 0, 0, 15, 16, 16];
      ends.only = [2, 3]; ns.only = [4, 5]; ew.only = [0, 1];
      return [ends, ns, ew];
    }
    case SHAPE.CANDLE: {
      const n = m & 3, list = def.pickle ? PICKLE_BOXES : CANDLE_BOXES;
      if (purpose === 1) return def.pickle ? [[2, 0, 2, 14, 6, 14]] : [[5, 0, 5, 11, 6, 11]];
      return list[n];
    }
    case SHAPE.CAKE: return [[1 + 2 * Math.min(6, m & 7), 0, 1, 15, 8, 15]];
    case SHAPE.ROD: {
      const ax = m & 3;
      if (ax === 1) return [[0, 7, 7, 16, 9, 9]];
      if (ax === 2) return [[7, 7, 0, 9, 9, 16]];
      return purpose === 0 && def.key === 'end_rod' ? [[7, 1, 7, 9, 16, 9], [6, 0, 6, 10, 1, 10]] : [[7, 0, 7, 9, 16, 9]];
    }
    case SHAPE.SCAFFOLD: {
      if (purpose === 1) return [[0, 14, 0, 16, 16, 16]];
      if (purpose === 2) return [[0, 0, 0, 16, 16, 16]];
      return [[0, 14, 0, 16, 16, 16], [0, 0, 0, 2, 14, 2], [14, 0, 0, 16, 14, 2], [0, 0, 14, 2, 14, 16], [14, 0, 14, 16, 14, 16], [0, 1, 0, 16, 2, 2], [0, 1, 14, 16, 2, 16]];
    }
    case SHAPE.PATH: return [[0, 0, 0, 16, 15, 16]];
    case SHAPE.FRAME: {
      if (purpose === 1) return null;
      return [rotBox([2, 2, 0, 14, 14, 1], m & 3)];
    }
    case SHAPE.COMPOSTER: {
      const lvl = Math.min(8, m & 15);
      if (purpose === 1) return [[0, 0, 0, 16, 16, 16]];
      const out = [[0, 0, 0, 16, 2, 16, 'composter_side', 'composter_bottom'], [0, 2, 0, 2, 16, 16], [14, 2, 0, 16, 16, 16], [2, 2, 0, 14, 16, 2], [2, 2, 14, 14, 16, 16]];
      if (lvl) out.push([2, 2, 2, 14, 2 + Math.min(13, lvl * 1.75), 14, 'composter_side', lvl >= 8 ? 'compost_ready' : 'compost']);
      return out;
    }
    case SHAPE.COCOA: {
      const st = m & 3, f = (m >> 4) & 3;
      const w = 4 + st * 2, h = 5 + st * 2, d = w;
      const b = [8 - w / 2, 12 - h, 1, 8 + w / 2, 12, 1 + d];
      return [rotBox(b, f)];
    }
    case SHAPE.PETALS: return [[0, 0, 0, 16, 0.6, 16]];
    // ---- redstone and rails (dust and rails are drawn by their own routines in the mesher) ----
    case SHAPE.WIRE: return purpose === 1 ? null : purpose === 2 ? [[0, 0, 0, 16, 1, 16]] : [];
    case SHAPE.RAIL: {
      if (purpose === 1) return null;
      const sh = railShape(id, m);
      return purpose === 2 ? [[0, 0, 0, 16, sh >= 2 && sh <= 5 ? 8 : 2, 16]] : [];
    }
    case SHAPE.LEVER: return purpose === 1 ? null : purpose === 2 ? [attachBox([4, 0, 4, 12, 10, 12], m)] : [attachBox([5, 0, 4, 11, 3, 12, 'cobblestone', 'cobblestone'], m)];
    case SHAPE.BUTTON: return purpose === 1 ? null : [attachBox([5, 0, 6, 11, m & 8 ? 1 : 2, 10], m)];
    case SHAPE.PLATE: return purpose === 1 ? null : [[1, 0, 1, 15, (m & 15) ? 0.5 : 1, 15]];
    case SHAPE.DAYLIGHT: return [withFaces([0, 0, 0, 16, 6, 16], ['daylight_detector_side', 'daylight_detector_side', m & 16 ? 'daylight_detector_inverted_top' : 'daylight_detector_top', 'daylight_detector_side', 'daylight_detector_side', 'daylight_detector_side'])];
    case SHAPE.REPEATER: case SHAPE.COMPARATOR: {
      if (purpose !== 0) return [[0, 0, 0, 16, 2, 16]];
      const f = m & 3, rep = s === SHAPE.REPEATER;
      const lit = rep ? m & 16 : m & 8;
      const out = [[0, 0, 0, 16, 2, 16, 'smooth_stone', (rep ? 'repeater_top_' : 'comparator_top_') + (lit ? 'on_' : 'off_') + f]];
      const torch = (x0, z0, h, on) => [x0, 2, z0, x0 + 2, 2 + h, z0 + 2, on ? 'rs_post_on' : 'rs_post_off', on ? 'rs_head_on' : 'rs_head_off'];
      if (rep) {
        out.push(torch(7, 2, 5, lit));
        const zz = 6 + ((m >> 2) & 3) * 2;
        out.push(m & 32 ? [2, 2, zz, 14, 4, zz + 2, 'bedrock', 'bedrock'] : torch(7, zz, 5, lit));
      } else {
        out.push(torch(7, 2, m & 4 ? 4 : 3, m & 4));
        out.push(torch(4, 11, 5, lit), torch(10, 11, 5, lit));
      }
      return out.map(b => rotBox(b, f));
    }
    case SHAPE.PISTON_BASE: {
      const dir = m & 7;
      return [withFaces(box6([0, 0, 0, 16, 12, 16], dir), faces6(dir, 'piston_inner', 'piston_bottom', 'piston_side_base'))];
    }
    case SHAPE.PISTON_HEAD: {
      const dir = m & 7, face = m & 8 ? 'piston_top_sticky' : 'piston_top';
      const plate = withFaces(box6([0, 12, 0, 16, 16, 16], dir), faces6(dir, face, 'piston_top', 'piston_head_side'));
      const rod = withFaces(box6(purpose === 0 ? [6, -4, 6, 10, 12, 10] : [6, 0, 6, 10, 12, 10], dir), faces6(dir, 'piston_rod', 'piston_rod', 'piston_rod'));
      return [plate, rod];
    }
    case SHAPE.HOPPER: {
      const dir = m & 7;
      const out = [
        [0, 10, 0, 16, 16, 2, 'hopper_outside', 'hopper_top'], [0, 10, 14, 16, 16, 16, 'hopper_outside', 'hopper_top'],
        [0, 10, 2, 2, 16, 14, 'hopper_outside', 'hopper_top'], [14, 10, 2, 16, 16, 14, 'hopper_outside', 'hopper_top'],
        [2, 10, 2, 14, 11, 14, 'hopper_outside', 'hopper_inside'], [4, 4, 4, 12, 10, 12, 'hopper_outside', 'hopper_outside'],
      ];
      out.push(dir >= 2 ? rotBox([6, 4, 0, 10, 8, 4, 'hopper_outside', 'hopper_outside'], D62H[dir]) : [6, 0, 6, 10, 4, 10, 'hopper_outside', 'hopper_outside']);
      return out;
    }
    case SHAPE.HOOK: {
      const f = m & 3, strung = m & 4;
      if (purpose !== 0) return [rotBox([5, 0, 0, 11, 10, 8], f)];
      const arm = strung ? 1.5 : 0;
      return [rotBox([6, 0, 0, 10, 10, 2, 'planks', 'planks'], f), rotBox([7.5, 5 - arm, 2, 8.5, 6 - arm, 7, 'iron_block', 'iron_block'], f), rotBox([6.5, 4 - arm, 6, 9.5, 7 - arm, 9, 'iron_block', 'iron_block'], f)];
    }
    case SHAPE.TRIPWIRE: {
      if (purpose === 1) return null;
      if (purpose === 2) return [[0, 0, 0, 16, 2, 16]];
      const along = (d) => { const n = nb(DIRX[d], 0, DIRZ[d]); return BLOCKS[n].tripwire || T_SHAPE[n] === SHAPE.HOOK; };
      const y = m & 2 ? 1 : 2.5;
      const xs = along(1) || along(3), zs = along(0) || along(2) || !xs;
      const out = [];
      if (xs) out.push([0, y, 7.75, 16, y + 0.5, 8.25, 'tripwire', 'tripwire']);
      if (zs) out.push([7.75, y, 0, 8.25, y + 0.5, 16, 'tripwire', 'tripwire']);
      return out;
    }
    case SHAPE.BED: {
      const f = m & 3, head = m & 4;
      const out = [[0, 3, 0, 16, 9, 16]];
      if (purpose === 0) {
        // legs at the outer corners of this half
        const legs = head ? [[0, 0, 0, 3, 3, 3], [13, 0, 0, 16, 3, 3]] : [[0, 0, 13, 3, 3, 16], [13, 0, 13, 16, 3, 16]];
        for (const l of legs) out.push(rotBox(l, f));
        if (head) {
          // the head half: a white sheet turned down under the pillow, the blanket's folded edge below it
          const top = (def.tex && def.tex.top) || 'red_bed_top';
          out.push(rotBox([0.5, 9, 0.5, 15.5, 9.05, 8.5, 'bed_pillow', 'bed_pillow'], f));
          out.push(rotBox([0, 9, 8.5, 16, 9.6, 10.5, top, top], f));
          out.push(rotBox([1.5, 9.05, 1.2, 14.5, 11, 6], f).concat(['bed_pillow', 'bed_pillow']).slice(0, 8));
        }
      }
      return out;
    }
  }
  // static models and small things
  if (def.shape && SHAPES[def.shape]) {
    const f = def.facingModel ? m & 3 : 0;
    const boxes = SHAPES[hangingLantern(id, m) ? def.shape + '_hang' : def.shape] || SHAPES[def.shape];
    if (purpose === 1) return def.solid ? boxes.filter(x => !x.nocol).map(x => rotBox(x.b, f)) : null;
    return boxes.map(x => rotBox(x.b, f).slice());
  }
  if (purpose === 2) {
    if (def.render === RENDER.CROSS) return [[2, 0, 2, 14, 13, 14]];
    if (def.render === RENDER.MODEL && def.key === 'bamboo') return [[5, 0, 5, 11, 16, 11]];
    if (def.render === RENDER.TORCH) return m === 0 ? [[6, 0, 6, 10, 10, 10]] : [rotBox([5, 3, 0, 11, 13, 6], [3, 1, 0, 2][m - 1] ?? 0)];
    if (def.pile) return [[1, 0, 1, 15, 7, 15]];
    if (def.placedBackpack) return [[3, 0, 3, 13, 12, 13]];
  }
  return null; // full cube
}

// Things set on top of a bottom half slab sink down to sit on it.
function sinkOffset(id, nb, nm) {
  if (!T_SINK[id]) return 0;
  const b = nb(0, -1, 0);
  return T_SHAPE[b] === SHAPE.SLAB && (nm(0, -1, 0) & 7) === 0 ? -8 : 0;
}
// World accessors for a block position.
function worldAccess(world, x, y, z) {
  return [(dx, dy, dz) => world.getBlock(x + dx, y + dy, z + dz), (dx, dy, dz) => world.getMeta(x + dx, y + dy, z + dz)];
}
// Boxes for a block in the world (pixels, with any slab sink applied), or null = full cube.
function worldBoxes(world, x, y, z, id, purpose) {
  const meta = world.getMeta(x, y, z);
  const [nb, nm] = worldAccess(world, x, y, z);
  let boxes = shapeBoxes(id, meta, nb, nm, purpose);
  const sink = sinkOffset(id, nb, nm);
  if (sink && boxes) boxes = boxes.map(b => { const o = b.slice(); o[1] += sink; o[4] += sink; return o; });
  return boxes;
}
function isWaterlogged(id, meta) { return T_WLOG[id] && (meta & WLOG) !== 0; }
// Water at a position, counting waterlogged blocks as still sources.
function waterAt(world, x, y, z) {
  const id = world.getBlock(x, y, z);
  if (T_LIQUID[id] === 1) return true;
  return T_WLOG[id] && (world.getMeta(x, y, z) & WLOG) !== 0;
}
