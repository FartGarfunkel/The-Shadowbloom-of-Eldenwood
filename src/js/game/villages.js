// ---------------------------------------------------------------------------
// game/villages.js — 0.9: villages in the world.
//
// The land is split into big regions; about two in three hold a village if the
// ground there suits one (plains, savanna, forest edge, taiga, snow or desert,
// and fairly flat). A village is a plaza (a well, the quest board, a bell,
// benches, market stalls under striped awnings), roads running out from it
// with lamp posts, hay and barrels along them, and buildings with their doors
// to the road: cottages and houses with shutters, porch lanterns and smoking
// chimneys, workshops, a smithy, a library, a tavern, farms and a pen.
// Each building sits level on its own foundation and has the beds its
// people sleep in (game/villagers.js brings them to life).
//
// Everything is a pure function of the seed, so each chunk builds just its
// own part. Old worlds: a village whose ground someone has already changed is
// left out (the choice is written in the world's "village book" so it stays
// the same), so there are no half-houses cut by your own builds.
// ---------------------------------------------------------------------------
const VREG = 352;                    // region size in blocks
const VPLAZA = 7;                    // the plaza reaches this far from the middle
let VILLAGE_CTX = null;              // { records, meta } of the world being played
const DXL = [0, 1, 0, -1], DZL = [-1, 0, 1, 0];

const VSTYLE = {
  plains: { planks: 'planks', log: 'log', beam: 'stripped_log', base: 'cobblestone', floor: 'planks', stairs: 'oak_stairs', slab: 'oak_slab', fence: 'oak_fence', gate: 'oak_fence_gate', door: 'oak_door', trapdoor: 'oak_trapdoor', wood: 'oak', path: ['dirt_path', 'dirt_path', 'dirt_path', 'gravel', 'coarse_dirt'], bed: ['bed', 'yellow_bed', 'blue_bed', 'green_bed'], stone: 'cobblestone', stoneSlab: 'cobblestone_slab', stoneStairs: 'cobblestone_stairs', lampPost: 'oak_fence', awning: ['red_wool', 'white_wool'], awning2: ['blue_wool', 'white_wool'] },
  savanna: { planks: 'acacia_planks', log: 'acacia_log', beam: 'stripped_acacia_log', base: 'terracotta', floor: 'acacia_planks', stairs: 'acacia_stairs', slab: 'acacia_slab', fence: 'acacia_fence', gate: 'acacia_fence_gate', door: 'acacia_door', trapdoor: 'acacia_trapdoor', wood: 'acacia', path: ['dirt_path', 'dirt_path', 'coarse_dirt', 'gravel'], bed: ['orange_bed', 'yellow_bed', 'bed', 'brown_bed'], stone: 'cobblestone', stoneSlab: 'cobblestone_slab', stoneStairs: 'cobblestone_stairs', lampPost: 'acacia_fence', awning: ['orange_wool', 'yellow_wool'], awning2: ['red_wool', 'yellow_wool'] },
  taiga: { planks: 'spruce_planks', log: 'spruce_log', beam: 'stripped_spruce_log', base: 'cobblestone', floor: 'spruce_planks', stairs: 'spruce_stairs', slab: 'spruce_slab', fence: 'spruce_fence', gate: 'spruce_fence_gate', door: 'spruce_door', trapdoor: 'spruce_trapdoor', wood: 'spruce', path: ['dirt_path', 'dirt_path', 'podzol', 'coarse_dirt', 'gravel'], bed: ['bed', 'brown_bed', 'green_bed', 'gray_bed'], stone: 'cobblestone', stoneSlab: 'cobblestone_slab', stoneStairs: 'cobblestone_stairs', lampPost: 'spruce_fence', awning: ['green_wool', 'white_wool'], awning2: ['brown_wool', 'white_wool'] },
  snowy: { planks: 'spruce_planks', log: 'spruce_log', beam: 'stripped_spruce_log', base: 'stone_bricks', floor: 'spruce_planks', stairs: 'spruce_stairs', slab: 'spruce_slab', fence: 'spruce_fence', gate: 'spruce_fence_gate', door: 'spruce_door', trapdoor: 'spruce_trapdoor', wood: 'spruce', path: ['dirt_path', 'dirt_path', 'gravel', 'packed_ice'], bed: ['light_blue_bed', 'white_bed', 'blue_bed', 'cyan_bed'], stone: 'stone_bricks', stoneSlab: 'stone_brick_slab', stoneStairs: 'stone_brick_stairs', lampPost: 'spruce_fence', awning: ['blue_wool', 'white_wool'], awning2: ['cyan_wool', 'white_wool'] },
  desert: { planks: 'smooth_sandstone', log: 'cut_sandstone', beam: null, base: 'sandstone', floor: 'smooth_sandstone', stairs: 'sandstone_stairs', slab: 'smooth_sandstone_slab', fence: 'jungle_fence', gate: 'jungle_fence_gate', door: 'jungle_door', trapdoor: 'jungle_trapdoor', wood: 'jungle', path: ['smooth_sandstone', 'smooth_sandstone', 'sandstone', 'cut_sandstone'], bed: ['orange_bed', 'bed', 'yellow_bed', 'cyan_bed'], stone: 'sandstone', stoneSlab: 'sandstone_slab', stoneStairs: 'sandstone_stairs', lampPost: 'sandstone_wall', flat: true, roof: 'cut_sandstone', rim: 'smooth_sandstone_slab', awning: ['orange_wool', 'white_wool'], awning2: ['cyan_wool', 'white_wool'] },
};
for (const st of Object.values(VSTYLE)) {
  st.bed = st.bed.filter(k => B[k] !== undefined);
  st.path = st.path.filter(k => B[k] !== undefined);
  if (st.beam && B[st.beam] === undefined) st.beam = null;
  for (const k of ['awning', 'awning2']) st[k] = st[k].map(c => (c === 'white_wool' && B[c] === undefined) ? 'wool' : c).filter(c => B[c] !== undefined);
}
const VFLOWERS = ['flower_red', 'flower_yellow', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 'oxeye_daisy', 'cornflower', 'allium', 'azure_bluet', 'blue_orchid', 'lavender', 'lily_of_the_valley'];
const VSYL = [['Ash', 'Bram', 'Cor', 'Dun', 'El', 'Fen', 'Glen', 'Har', 'Ivy', 'Kel', 'Lin', 'Mar', 'Nor', 'Oak', 'Pen', 'Ros', 'Stan', 'Thorn', 'Wil', 'Yar', 'Bel', 'Cal', 'Dor', 'Mill', 'Brook', 'Hollow', 'Wren', 'Hazel', 'Lark', 'Sun'],
  ['ford', 'by', 'wick', 'ton', 'dale', 'mere', 'stead', 'holm', 'field', 'brook', 'well', 'moor', 'vale', 'haven', 'hurst', 'cross', 'gate', 'bridge', 'shire', 'combe']];

// ---- the plan ------------------------------------------------------------------------------------
// rot: local (x, z) with the front facing north (−z) → world, turned r quarter turns clockwise
function vRot(r, x, z) { switch (r & 3) { case 0: return [x, z]; case 1: return [-z, x]; case 2: return [-x, -z]; default: return [z, -x]; } }
const vDirOf = (dx, dz) => dz < 0 ? 0 : dx > 0 ? 1 : dz > 0 ? 2 : 3;
// a building's local spot → world
function vWorld(b, lx, ly, lz) { const [a, c] = vRot(b.r, lx, lz); return [b.ox + a, b.y + ly, b.oz + c]; }

WorldGen.prototype.villageAt = function (rx, rz) {
  if (this.dim !== 0) return null;
  const cache = this.vilCache || (this.vilCache = new Map());
  const key = rx + ',' + rz;
  if (cache.has(key)) return cache.get(key);
  let plan = null;
  try { plan = this.planVillage(rx, rz); } catch (e) { console.warn('village plan', e); plan = null; }
  // an old world: a village where someone has already changed the ground is left out
  if (plan && VILLAGE_CTX && VILLAGE_CTX.meta) {
    const book = VILLAGE_CTX.meta.villageBook || (VILLAGE_CTX.meta.villageBook = {});
    if (book[plan.id] === undefined) {
      let clear = true;
      const rec = VILLAGE_CTX.records;
      if (rec && rec.size) {
        for (let cz = plan.z0 >> 4; cz <= plan.z1 >> 4 && clear; cz++) for (let cx = plan.x0 >> 4; cx <= plan.x1 >> 4; cx++) if (rec.has(chunkKey(0, cx, cz))) { clear = false; break; }
      }
      book[plan.id] = clear ? 1 : 0;
    }
    if (!book[plan.id]) plan = null;
  }
  cache.set(key, plan);
  return plan;
};
// every village whose bounds might reach this block column
WorldGen.prototype.villagesNear = function (x, z, pad = 0) {
  const out = [], rx = Math.floor(x / VREG), rz = Math.floor(z / VREG);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const v = this.villageAt(rx + dx, rz + dz);
    if (v && x >= v.x0 - pad && x <= v.x1 + pad && z >= v.z0 - pad && z <= v.z1 + pad) out.push(v);
  }
  return out;
};

// (Shadowbloom) a campaign town is a village forced to a place: F = { x, z, name, style, want, town, roads }
WorldGen.prototype.planVillage = function (rx, rz, F) {
  if (!F && this.campaignTownAt) F = this.campaignTownAt(rx, rz);
  if (!F && this.campaignTownsNear && this.campaignTownsNear(rx * VREG + VREG / 2, rz * VREG + VREG / 2, VREG * 1.1)) return null;   // no stray village crowding a campaign town
  const rnd = mulberry32(hash32(this.seed, rx, rz, 4242));
  if (rnd() > 0.66 && !F) return null;
  let cx = rx * VREG + 84 + Math.floor(rnd() * (VREG - 168)), cz = rz * VREG + 84 + Math.floor(rnd() * (VREG - 168));
  if (F) { cx = F.x; cz = F.z; }
  const c = this.column(cx, cz);
  if (!F) {
    if (![BIOME.PLAINS, BIOME.FOREST, BIOME.TAIGA, BIOME.DESERT].includes(c.biome)) return null;
    if (c.h <= SEA || c.h > SEA + 30) return null;
    // fairly flat, mostly dry ground
    let lo = c.h, hi = c.h, wet = 0;
    for (let a = 0; a < 12; a++) for (const d of [14, 28]) {
      const q = this.column(cx + Math.round(Math.cos(a / 12 * TAU) * d), cz + Math.round(Math.sin(a / 12 * TAU) * d));
      lo = Math.min(lo, q.h); hi = Math.max(hi, q.h); if (q.h <= SEA) wet++;
    }
    if (hi - lo > 11 || wet > 4) return null;
  }
  const style = (F && F.style && VSTYLE[F.style]) ? F.style : c.biome === BIOME.DESERT ? 'desert' : c.biome === BIOME.TAIGA ? (c.temp < -0.38 ? 'snowy' : 'taiga') : (c.temp > 0.28 && c.humid < 0.02 ? 'savanna' : 'plains');
  const st = VSTYLE[style];
  let name = VSYL[0][Math.floor(rnd() * VSYL[0].length)] + VSYL[1][Math.floor(rnd() * VSYL[1].length)];
  if (F && F.name) name = F.name;
  const y0 = F ? Math.max(SEA + 1, c.h) : c.h, P = VPLAZA;
  const plan = { id: 'v' + rx + '_' + rz, rx, rz, name, style, st, x: cx, z: cz, y: y0, roads: [], blds: [], lamps: [], decor: [], x0: cx - P - 1, z0: cz - P - 1, x1: cx + P + 1, z1: cz + P + 1, seed: hash32(this.seed, rx, rz, 4244), town: F ? F.town : null };
  const taken = [[cx - P - 1, cz - P - 1, cx + P + 1, cz + P + 1]];
  const free = (a) => !taken.some(t => a[0] <= t[2] && a[2] >= t[0] && a[1] <= t[3] && a[3] >= t[1]);
  const grow = (a) => { plan.x0 = Math.min(plan.x0, a[0]); plan.z0 = Math.min(plan.z0, a[1]); plan.x1 = Math.max(plan.x1, a[2]); plan.z1 = Math.max(plan.z1, a[3]); };
  // the buildings still to place: the important ones first
  const want = (F && F.want && F.want.length) ? F.want.filter(k => VTEMPLATES[k]) : ['hall', 'farm', 'smithy', 'house_m', 'library', 'workshop', 'house_s', 'farm', 'pen', 'workshop', 'house_m', 'workshop', 'house_s', 'house_m'];
  let wi = 0;
  const nextType = () => {
    if (wi < want.length) return want[wi++];
    if (F && F.small) return null;
    const q = rnd(); return q < 0.3 ? 'house_s' : q < 0.52 ? 'house_m' : q < 0.72 ? 'workshop' : q < 0.9 ? 'farm' : 'pen';
  };
  // four roads out from the plaza (now and then only three)
  const skip = rnd() < 0.25 ? Math.floor(rnd() * 4) : -1;
  const doors = [];
  for (let d = 0; d < 4; d++) {
    if (d === skip) continue;
    const ax = DXL[d], az = DZL[d], L = (F && F.roadLen) ? F.roadLen + Math.floor(rnd() * 8) : 26 + Math.floor(rnd() * 20);
    const road = { d, L, cells: [] };
    for (let t = P + 1; t <= L; t++) for (let s = -1; s <= 1; s++) {
      const x = cx + ax * t + (-az) * s, z = cz + az * t + ax * s;
      road.cells.push([x, z, this.column(x, z).h]);
    }
    plan.roads.push(road);
    grow([cx + Math.min(0, ax * L) - 2, cz + Math.min(0, az * L) - 2, cx + Math.max(0, ax * L) + 2, cz + Math.max(0, az * L) + 2]);
    // lamp posts every so often along the road, and hay, barrels and flowers by the wayside
    for (let t = P + 5; t < L; t += 11) { const s = Math.floor(t / 11) % 2 ? 2 : -2; plan.lamps.push([cx + ax * t + (-az) * s, cz + az * t + ax * s]); }
    for (let t = P + 3; t < L; t += 2 + Math.floor(rnd() * 4)) if (rnd() < 0.4) { const s = rnd() < 0.5 ? 2 : -2; plan.decor.push([cx + ax * t + (-az) * s, cz + az * t + ax * s, Math.floor(rnd() * 8)]); }
    // lots along both sides
    for (const side of [1, -1]) {
      let t = P + 2 + Math.floor(rnd() * 3);
      while (t < L - 3) {
        const type = nextType(), T = VTEMPLATES[type];
        if (!T) break;
        if (t + T.W > L + 2) { wi = Math.max(0, wi - 1); break; }
        const nx = -az * side, nz = ax * side;                     // from the road out to the lot
        const tc = t + (T.W - 1) / 2;
        const doorX = cx + ax * tc + nx * 3, doorZ = cz + az * tc + nz * 3;
        const r = vDirOf(-nx, -nz);                                 // the front faces the road
        const [ddx, ddz] = vRot(r, (T.W - 1) / 2, 0);
        const ox = doorX - ddx, oz = doorZ - ddz;
        const cs = [[0, 0], [T.W - 1, 0], [0, T.D - 1], [T.W - 1, T.D - 1]].map(([lx, lz]) => { const [a, b] = vRot(r, lx, lz); return [ox + a, oz + b]; });
        const box = [Math.min(...cs.map(q => q[0])), Math.min(...cs.map(q => q[1])), Math.max(...cs.map(q => q[0])), Math.max(...cs.map(q => q[1]))];
        const mid = this.column((box[0] + box[2]) >> 1, (box[1] + box[3]) >> 1);
        let ok = free([box[0] - 1, box[1] - 1, box[2] + 1, box[3] + 1]) && (F || (mid.h > SEA && Math.abs(mid.h - y0) <= 7));
        if (ok && !F) for (const [qx, qz] of cs) { const h = this.column(qx, qz).h; if (h <= SEA - 1 || Math.abs(h - mid.h) > 6) { ok = false; break; } }
        if (!ok) { wi = Math.max(0, wi - 1); t += 3; continue; }
        const b = { type, r, ox, oz, W: T.W, D: T.D, H: T.H, y: F ? y0 : mid.h, x0: box[0], z0: box[1], x1: box[2], z1: box[3], seed: hash32(this.seed, ox, oz, 4243), job: null, beds: [], work: null };
        if (T.plan) T.plan(b, rnd, st);
        plan.blds.push(b); taken.push(box); grow([box[0] - 2, box[1] - 2, box[2] + 2, box[3] + 2]);
        if (T.H > 3) doors.push(vWorld(b, (T.W - 1) / 2, 0, -1));
        t += T.W + 2 + Math.floor(rnd() * 3);
      }
    }
  }
  if (plan.blds.length < 3 && !F) return null;
  // nothing standing in front of a door
  const nearDoor = ([x, z]) => doors.some(d => Math.abs(d[0] - x) + Math.abs(d[2] - z) <= 2);
  plan.lamps = plan.lamps.filter(q => !nearDoor(q));
  plan.decor = plan.decor.filter(q => !nearDoor(q) && !plan.lamps.some(l => Math.abs(l[0] - q[0]) + Math.abs(l[1] - q[1]) <= 1));
  // the plaza's furniture
  plan.board = [cx + 4, y0 + 2, cz - 6];          // the quest board (two wide: x+3 and x+4)
  plan.bell = [cx - 4, y0 + 1, cz - 4];
  plan.stalls = [{ x: cx + 4, z: cz + 5, wares: 'merchant' }, { x: cx - 4, z: cz + 5, wares: 'baker' }];
  plan.seats = [];
  for (const dz of [-3, -4, -5]) plan.seats.push([cx - 6, y0 + 1, cz + dz, 1]);   // a bench facing east, toward the well
  // the people: every bed is someone's; the workplaces give the jobs
  const beds = []; for (const b of plan.blds) for (const bd of b.beds) beds.push(bd);
  const jobs = [];
  const hall = plan.blds.find(b => b.type === 'hall');
  if (hall) jobs.push(['elder', hall.elderAt], ['innkeeper', hall.work]);
  for (const s of plan.stalls) jobs.push([s.wares, { at: [s.x, y0 + 1, s.z + 1], face: 0 }]);
  for (const b of plan.blds) if (b.job && b.type !== 'hall') jobs.push([b.job, b.work]);
  plan.folk = beds.map((home, i) => ({ home, job: i < jobs.length ? jobs[i][0] : 'none', work: i < jobs.length ? jobs[i][1] : null }));
  if (!hall && plan.folk.length) plan.folk[plan.folk.length - 1].job = 'elder';
  // the guards and the iron golem keep watch from the plaza
  plan.guards = 2 + (plan.blds.length >= 10 ? 1 : 0);
  plan.golems = plan.blds.length >= 7 ? 1 : 0;
  plan.r = Math.max(plan.x1 - cx, cx - plan.x0, plan.z1 - cz, cz - plan.z0);
  return plan;
};

// ---- building it, one chunk at a time --------------------------------------------------------------
function vStamp(ch, b, st) {
  const bx = ch.cx * 16, bz = ch.cz * 16, r = b.r, Y = b.y;
  const S = {
    st, r, b, rnd: mulberry32(b.seed),
    at(lx, ly, lz) { const [a, c] = vRot(r, lx, lz); const X = b.ox + a - bx, Z = b.oz + c - bz, y = Y + ly; return X < 0 || X > 15 || Z < 0 || Z > 15 || y < 1 || y >= CH ? -1 : cidx(X, y, Z); },
    set(lx, ly, lz, key, meta = 0) {
      const i = S.at(lx, ly, lz); if (i < 0) return -1;
      const id = key === 0 || key === 'air' ? 0 : B[key]; if (id === undefined) return -1;
      ch.blocks[i] = id; ch.meta[i] = meta; ch.blockEntities.delete(i);
      return i;
    },
    get(lx, ly, lz) { const i = S.at(lx, ly, lz); return i < 0 ? -1 : ch.blocks[i]; },
    fill(x0, y0, z0, x1, y1, z1, key, meta = 0) { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) S.set(x, y, z, key, meta); },
    d(f) { return (f + r) & 3; },
    stairs(lx, ly, lz, key, f, top) { S.set(lx, ly, lz, key, S.d(f) | (top ? 4 : 0)); },
    // something with a front (furnace, chest, lectern, chair) whose front faces local direction f
    face(lx, ly, lz, key, f) { S.set(lx, ly, lz, key, (S.d(f) + 2) & 3); },
    log(lx, ly, lz, key, axis) { S.set(lx, ly, lz, key, axis ? ((axis === 1) === !(r & 1) ? 1 : 2) : 0); },
    door(lx, lz, key, f = 2, right = false) { const m = S.d(f) | (right ? 8 : 0); S.set(lx, 1, lz, key, m); S.set(lx, 2, lz, key, m | 16); },
    bed(lx, lz, f, key) { const m = S.d(f); S.set(lx, 1, lz, key, m); S.set(lx + DXL[f], 1, lz + DZL[f], key, m | 4); },
    torch(lx, ly, lz, wall) { S.set(lx, ly, lz, 'torch', [3, 2, 4, 1][S.d(wall)]); },
    chest(lx, ly, lz, f, items) { const i = S.set(lx, ly, lz, 'chest', (S.d(f) + 2) & 3); if (i >= 0) ch.blockEntities.set(i, { type: 'chest', items: vLoot(items, S.rnd) }); },
    // an open shutter flat against the wall: the cell is beside a window, outside; `toWall` points back at the wall
    shutter(lx, ly, lz, toWall) { if (st.trapdoor) S.set(lx, ly, lz, st.trapdoor, S.d(toWall) | 4); },
    flower(lx, lz) { S.set(lx, 0, lz, 'grass'); S.set(lx, 1, lz, VFLOWERS[Math.floor(S.rnd() * VFLOWERS.length)]); },
    // walls round the footprint: logs at the corners, a stone footing, a beam along the top
    walls(W, D, H, o = {}) {
      for (let ly = 1; ly <= H; ly++) for (let lz = 0; lz < D; lz++) for (let lx = 0; lx < W; lx++) {
        const edgeX = lx === 0 || lx === W - 1, edgeZ = lz === 0 || lz === D - 1;
        if (!edgeX && !edgeZ) continue;
        if (edgeX && edgeZ) S.set(lx, ly, lz, o.corner || st.log);
        else if (ly === H && st.beam && !o.noBeam) S.log(lx, ly, lz, st.beam, edgeZ ? 1 : 2);
        else S.set(lx, ly, lz, ly === 1 && st.base && !o.noBase ? st.base : (o.wall || st.planks));
      }
    },
    floor(W, D, key) { S.fill(0, 0, 0, W - 1, 0, D - 1, key || st.floor); },
    // a window with shutters either side (on the front wall, the back wall, or a side wall)
    window(lx, ly, lz, W, D, tall) {
      S.set(lx, ly, lz, 'glass_pane'); if (tall) S.set(lx, ly + 1, lz, 'glass_pane');
      const out = lz === 0 ? 0 : lz === D - 1 ? 2 : lx === 0 ? 3 : 1;          // which way the wall faces out
      const ox = DXL[out], oz = DZL[out], tx = oz ? 1 : 0, tz = ox ? 1 : 0;      // outward, and along the wall
      if (st.flat) return;
      for (const s of [-1, 1]) for (let k = 0; k <= (tall ? 1 : 0); k++) S.shutter(lx + ox + tx * s, ly + k, lz + oz + tz * s, (out + 2) & 3);
    },
    // a gable roof with its ridge running front to back (or a flat roof in the desert)
    roof(W, D, ly0) {
      if (st.flat) {
        S.fill(0, ly0, 0, W - 1, ly0, D - 1, st.roof);
        for (let lz = 0; lz < D; lz++) for (let lx = 0; lx < W; lx++) if (lx === 0 || lz === 0 || lx === W - 1 || lz === D - 1) S.set(lx, ly0 + 1, lz, st.rim, 0);
        return ly0 + 1;
      }
      let top = ly0;
      for (let k = 0; ; k++) {
        const L = k - 1, R = W - k, ly = ly0 + k;
        if (L > R) break;
        top = ly;
        for (let lz = -1; lz <= D; lz++) {
          if (L === R) S.set(L, ly, lz, st.slab, 0);
          else { S.stairs(L, ly, lz, st.stairs, 1); S.stairs(R, ly, lz, st.stairs, 3); }
        }
        // the gable ends
        for (let lx = Math.max(0, k); lx <= Math.min(W - 1, W - 1 - k); lx++) if (lx > L && lx < R) { S.set(lx, ly, 0, st.planks); S.set(lx, ly, D - 1, st.planks); }
        if (L === R) break;
      }
      // a little round window up in the front gable
      if (W >= 7) S.set((W - 1) / 2, ly0 + 1, 0, 'glass_pane');
      return top;
    },
    // (0.9.0.11) a fireplace in the back wall: the fire in a stone hearth inside the room, a hood over it, and the
    // chimney stack behind it climbing past the roof; the smoke comes out of the top (game/camping.js finds the flue)
    chimney(lx, D, top, W) {
      const z = D - 1;
      for (let ly = 0; ly <= top + 2; ly++) S.set(lx, ly, D, st.stone);
      S.set(lx, 0, z, st.stone); S.set(lx, 1, z, 'campfire'); S.set(lx, 2, z, st.stone);
      for (const s of [-1, 1]) if (lx + s > 0 && lx + s < (W || 99) - 1) { S.set(lx + s, 1, z, st.stone); S.set(lx + s, 0, z, st.stone); }
    },
    // the porch: a little canopy over the door with lanterns hanging under it, flowers either side
    porch(dx) {
      if (!st.flat) { for (const k of [-1, 0, 1]) S.set(dx + k, 3, -1, st.slab, 1); S.set(dx - 1, 2, -1, 'lantern', 1); S.set(dx + 1, 2, -1, 'lantern', 1); }
      else { S.torch(dx - 1, 2, -1, 2); S.torch(dx + 1, 2, -1, 2); }
      vFrontPath(S, dx);
    },
  };
  return S;
}
function vLoot(kind, rnd) {
  const T = {
    house: [['bread', 1, 4, 0.6], ['apple', 1, 3, 0.5], ['wheat_seeds', 2, 6, 0.4], ['emerald', 1, 2, 0.25], ['torch', 2, 6, 0.4], ['potato', 1, 4, 0.3], ['carrot', 1, 3, 0.3], ['stick', 2, 5, 0.3]],
    smithy: [['iron_ingot', 1, 4, 0.7], ['coal', 2, 6, 0.6], ['bread', 1, 3, 0.4], ['iron_pickaxe', 1, 1, 0.2], ['iron_sword', 1, 1, 0.15], ['silver_ingot', 1, 2, 0.25], ['steel_ingot', 1, 1, 0.12], ['emerald', 1, 3, 0.3], ['iron_helmet', 1, 1, 0.12]],
    library: [['book', 1, 3, 0.7], ['paper', 2, 6, 0.6], ['feather', 1, 3, 0.4], ['emerald', 1, 2, 0.3], ['empty_map', 1, 1, 0.2], ['compass', 1, 1, 0.15]],
    tavern: [['bread', 2, 5, 0.7], ['cooked_beef', 1, 3, 0.4], ['apple', 1, 4, 0.5], ['honey_bottle', 1, 2, 0.3], ['emerald', 1, 3, 0.4], ['cake', 1, 1, 0.15]],
  }[kind] || [];
  const items = new Array(27).fill(null);
  for (const [id, a, bb, p] of T) {
    if (!ITEMS[id] || rnd() > p) continue;
    let k = Math.floor(rnd() * 27); for (let t = 0; t < 27 && items[k]; t++) k = (k + 1) % 27;
    items[k] = { id, n: a + Math.floor(rnd() * (bb - a + 1)) };
  }
  return items;
}

// ---- the buildings -------------------------------------------------------------------------------------
// Local coordinates: x across the front, z from the front wall back, y up from the floor (0).
// The door is in the middle of the front wall (z 0); the road is in front (z < 0).
// plan(b) notes the beds ({ at, f }) and the workplace ({ at, face }) in world terms.
const JOB_STATION = { farmer: 'composter', fisherman: 'barrel', shepherd: 'loom', fletcher: 'fletching_table', librarian: 'lectern', cartographer: 'cartography_table', cleric: 'cauldron', armorer: 'blast_furnace', weaponsmith: 'grindstone', toolsmith: 'smithing_table', butcher: 'smoker', mason: 'stonecutter', jeweller: 'ruby_block' };
const WORKSHOP_JOBS = ['fisherman', 'shepherd', 'fletcher', 'cartographer', 'cleric', 'butcher', 'mason', 'jeweller'];
const vBed = (b, lx, lz, f) => ({ at: vWorld(b, lx, 1, lz), f: (f + b.r) & 3 });
const vWork = (b, lx, lz, f) => ({ at: vWorld(b, lx, 1, lz), face: (f + b.r) & 3 });
const VTEMPLATES = {
  house_s: {
    W: 5, D: 5, H: 9,
    plan(b, rnd) { b.beds.push(vBed(b, 1, 2, 2)); b.bedCol = Math.floor(rnd() * 4); },
    build(S) {
      const st = S.st; S.floor(5, 5); S.walls(5, 5, 3); S.roof(5, 5, 4);
      S.door(2, 0, st.door);
      S.window(0, 2, 2, 5, 5); S.window(4, 2, 2, 5, 5); S.window(2, 2, 4, 5, 5);
      S.bed(1, 2, 2, st.bed[S.b.bedCol % st.bed.length]);
      S.chest(3, 1, 3, 0, 'house');
      if (S.b.station) S.face(3, 1, 2, S.b.station, 3); else S.set(3, 1, 2, 'crafting_table');
      S.torch(2, 3, 3, 2);
      S.porch(2); S.flower(0, -1); S.flower(4, -1);
    },
  },
  workshop: {
    W: 5, D: 5, H: 9,
    plan(b, rnd) { b.beds.push(vBed(b, 1, 2, 2)); b.job = WORKSHOP_JOBS[Math.floor(rnd() * WORKSHOP_JOBS.length)]; b.station = JOB_STATION[b.job]; b.work = vWork(b, 2, 2, 1); b.bedCol = Math.floor(rnd() * 4); },
    build(S) { VTEMPLATES.house_s.build(S); },
  },
  house_m: {
    W: 7, D: 6, H: 10,
    plan(b, rnd) { b.beds.push(vBed(b, 1, 3, 2), vBed(b, 5, 3, 2)); b.bedCol = Math.floor(rnd() * 4); },
    build(S) {
      const st = S.st; S.floor(7, 6); S.walls(7, 6, 3); const top = S.roof(7, 6, 4);
      S.door(3, 0, st.door);
      for (const [x, z] of [[1, 0], [5, 0], [0, 2], [6, 3], [2, 5], [4, 5]]) S.window(x, 2, z, 7, 6);
      S.bed(1, 3, 2, st.bed[S.b.bedCol % st.bed.length]); S.bed(5, 3, 2, st.bed[(S.b.bedCol + 1) % st.bed.length]);
      S.set(1, 1, 1, 'crafting_table'); S.chest(5, 1, 1, 3, 'house');
      const w = st.wood;
      if (B[w + '_table']) { S.set(3, 1, 3, w + '_table'); if (B[w + '_chair']) { S.face(2, 1, 3, w + '_chair', 1); S.face(4, 1, 3, w + '_chair', 3); } S.set(3, 2, 3, 'flower_pot'); }
      else S.set(3, 1, 4, 'bookshelf');
      if (B.red_carpet !== undefined) for (const x of [2, 3, 4]) S.set(x, 1, 2, ['red_carpet', 'brown_carpet', 'green_carpet', 'blue_carpet'][S.b.bedCol % 4]);
      S.torch(3, 3, 4, 2); S.torch(1, 3, 1, 3);
      if (!st.flat) S.chimney(3, 6, top, 7);
      S.porch(3); S.flower(0, -1); S.flower(6, -1); S.flower(2, -1); S.flower(4, -1);
    },
  },
  // the tavern, where the elder and the innkeeper live; the heart of the village
  hall: {
    W: 9, D: 9, H: 12,
    plan(b, rnd) { b.beds.push(vBed(b, 1, 6, 2), vBed(b, 7, 6, 2)); b.work = vWork(b, 4, 6, 0); b.elderAt = vWork(b, 4, 3, 0); b.bedCol = Math.floor(rnd() * 4); },
    build(S) {
      const st = S.st; S.floor(9, 9, st.stone); S.walls(9, 9, 4); const top = S.roof(9, 9, 5);
      S.door(4, 0, st.door);
      for (const [x, z] of [[2, 0], [6, 0], [0, 2], [0, 4], [8, 2], [8, 4], [3, 8], [5, 8]]) S.window(x, 2, z, 9, 9, true);
      // the bar: a counter across the room, barrels behind it
      for (let x = 2; x <= 6; x++) if (x !== 4) S.set(x, 1, 5, st.slab, 1);
      S.face(4, 1, 5, st.wood + '_trapdoor' in B ? st.trapdoor : st.slab, 0);
      S.set(2, 1, 7, 'barrel'); S.set(3, 1, 7, 'barrel'); S.set(5, 1, 7, 'barrel'); S.set(6, 1, 7, 'barrel'); S.set(2, 2, 7, 'barrel'); S.set(6, 2, 7, 'barrel');
      S.bed(1, 6, 2, st.bed[S.b.bedCol % st.bed.length]); S.bed(7, 6, 2, st.bed[(S.b.bedCol + 2) % st.bed.length]);
      // tables and chairs out front
      const w = st.wood;
      if (B[w + '_table']) for (const [x, z] of [[2, 2], [6, 2]]) {
        S.set(x, 1, z, w + '_table'); S.set(x, 2, z, 'flower_pot');
        if (B[w + '_chair']) { S.face(x - 1, 1, z, w + '_chair', 1); S.face(x + 1, 1, z, w + '_chair', 3); }
      }
      S.chest(1, 1, 1, 1, 'tavern'); S.set(7, 1, 1, 'bookshelf'); S.set(7, 2, 1, 'bookshelf');
      for (const [x, z, wl] of [[4, 7, 2], [1, 3, 3], [7, 3, 1], [2, 1, 0], [6, 1, 0]]) S.torch(x, 3, z, wl);
      if (!st.flat) S.chimney(4, 9, top, 9);
      S.porch(4); S.flower(1, -1); S.flower(7, -1); S.flower(2, -1); S.flower(6, -1);
    },
  },
  smithy: {
    W: 7, D: 6, H: 7,
    plan(b, rnd) { b.job = ['armorer', 'weaponsmith', 'toolsmith'][Math.floor(rnd() * 3)]; b.work = vWork(b, 3, 3, 0); },
    build(S) {
      const st = S.st;
      S.floor(7, 6, st.stone);
      // back and side walls of stone; the front open between log posts
      for (let ly = 1; ly <= 3; ly++) {
        for (let lz = 1; lz < 6; lz++) { S.set(0, ly, lz, lz === 5 ? st.log : st.stone); S.set(6, ly, lz, lz === 5 ? st.log : st.stone); }
        for (let lx = 1; lx < 6; lx++) S.set(lx, ly, 5, st.stone);
        S.set(0, ly, 0, st.log); S.set(6, ly, 0, st.log);
      }
      S.fill(-1, 4, -1, 7, 4, 6, st.stoneSlab); S.fill(0, 4, 0, 6, 4, 5, st.stone);
      S.face(1, 1, 4, 'furnace', 0); S.face(2, 1, 4, 'furnace', 0);
      S.set(4, 0, 4, 'lava'); S.set(4, 1, 4, 'iron_bars');
      S.set(3, 1, 2, 'anvil'); S.face(5, 1, 2, JOB_STATION[S.b.job] || 'smithing_table', 3);
      S.chest(1, 1, 1, 1, 'smithy');
      S.set(5, 1, 4, 'barrel');
      S.torch(3, 3, 4, 2); S.torch(1, 3, 2, 3); S.torch(5, 3, 2, 1);
      for (let ly = 5; ly <= 6; ly++) S.set(1, ly, 4, st.stone); S.set(1, 7, 4, 'campfire');
      vFrontPath(S, 3);
    },
  },
  library: {
    W: 7, D: 7, H: 10,
    plan(b) { b.job = 'librarian'; b.work = vWork(b, 3, 4, 2); },
    build(S) {
      const st = S.st; S.floor(7, 7); S.walls(7, 7, 4); S.roof(7, 7, 5);
      S.door(3, 0, st.door);
      for (let lz = 2; lz <= 4; lz++) for (let ly = 1; ly <= 2; ly++) { S.set(1, ly, lz, 'bookshelf'); S.set(5, ly, lz, 'bookshelf'); }
      for (const [x, z] of [[0, 2], [0, 4], [6, 2], [6, 4], [2, 6], [4, 6], [1, 0], [5, 0]]) S.window(x, 3, z, 7, 7);
      S.face(3, 1, 5, 'lectern', 0);
      S.chest(1, 1, 5, 1, 'library');
      S.set(5, 1, 5, 'crafting_table');
      if (B.blue_carpet !== undefined) for (let z = 1; z <= 4; z++) S.set(3, 1, z, 'blue_carpet');
      S.torch(3, 3, 5, 2); S.torch(1, 3, 1, 3); S.torch(5, 3, 1, 1);
      S.porch(3); S.flower(1, -1); S.flower(5, -1);
    },
  },
  farm: {
    W: 9, D: 7, H: 3,
    plan(b, rnd) { b.job = 'farmer'; b.work = vWork(b, 4, -1, 2); b.crop = ['wheat_crop', 'carrot_crop', 'potato_crop', 'beetroot_crop'][Math.floor(rnd() * 4)]; b.crop2 = rnd() < 0.5 ? 'wheat_crop' : b.crop; },
    build(S) {
      const st = S.st;
      for (let lz = 0; lz < 7; lz++) for (let lx = 0; lx < 9; lx++) {
        const edge = lx === 0 || lx === 8 || lz === 0 || lz === 6;
        if (edge) { S.log(lx, 0, lz, st.log, lx === 0 || lx === 8 ? 2 : 1); continue; }
        if (lz === 3) { S.set(lx, 0, lz, 'water'); S.set(lx, -1, lz, 'dirt'); continue; }
        S.set(lx, 0, lz, 'farmland', 0);
        const crop = lx < 4 ? S.b.crop : S.b.crop2, def = BLOCKS[B[crop]];
        const stages = def && def.crop ? def.crop.stages : 4;
        S.set(lx, 1, lz, crop, Math.min(stages - 1, Math.floor(S.rnd() * stages)));
      }
      S.set(0, 1, 0, 'composter'); S.set(8, 1, 6, 'composter');
      S.set(8, 1, 0, 'hay_bale'); S.set(0, 1, 6, 'hay_bale');
    },
  },
  pen: {
    W: 7, D: 7, H: 3,
    plan(b, rnd) { b.animals = ['sheep', 'cow', 'pig', 'chicken'][Math.floor(rnd() * 4)]; b.mid = vWorld(b, 3, 1, 3); },
    build(S) {
      const st = S.st;
      S.fill(0, 0, 0, 6, 0, 6, 'grass');
      for (let lz = 0; lz < 7; lz++) for (let lx = 0; lx < 7; lx++) if (lx === 0 || lz === 0 || lx === 6 || lz === 6) S.set(lx, 1, lz, st.fence);
      S.face(3, 1, 0, st.gate, 0);
      S.set(5, 1, 5, 'hay_bale'); S.set(4, 1, 5, 'hay_bale'); S.set(5, 2, 5, 'hay_bale');
      S.set(1, 1, 5, 'cauldron');
      S.set(2, 1, -1, 'lantern'); S.set(2, 0, -1, S.st.stone);
    },
  },
};
// a step of path from the door out to the road
function vFrontPath(S, lx) {
  const p = S.st.path[0];
  S.set(lx, 0, -1, p); S.set(lx, 1, -1, 0); S.set(lx, 2, -1, 0);
  S.set(lx, 0, -2, p); S.set(lx, 1, -2, 0);
}

// ---- writing a village into a chunk ------------------------------------------------------------------
WorldGen.prototype.buildVillages = function (ch) {
  const bx = ch.cx * 16, bz = ch.cz * 16;
  for (const v of this.villagesNear(bx + 8, bz + 8, 16)) {
    if (v.x1 < bx || v.x0 > bx + 15 || v.z1 < bz || v.z0 > bz + 15) continue;
    this.buildVillageInto(ch, v);
  }
};
WorldGen.prototype.buildVillageInto = function (ch, v) {
  const bx = ch.cx * 16, bz = ch.cz * 16, st = v.st;
  const inC = (x, z) => x >= bx && x < bx + 16 && z >= bz && z < bz + 16;
  const soft = (id) => !id || !T_SOLID[id] || T_LIQUID[id] || BLOCKS[id].render === RENDER.CROSS || /leaves|log|snow_layer/.test(BLOCKS[id].key);
  const put = (x, y, z, key, meta = 0) => { if (!inC(x, z) || y < 1 || y >= CH) return; const id = key ? B[key] : 0; if (id === undefined) return; const i = cidx(x - bx, y, z - bz); ch.blocks[i] = id; ch.meta[i] = meta; };
  const get = (x, y, z) => ch.blocks[cidx(x - bx, y, z - bz)];
  const pathAt = (x, z) => { const q = hashFloat(x, z, v.seed, 7); return q < 0.72 ? st.path[0] : st.path[1 + Math.floor((q - 0.72) / 0.28 * (st.path.length - 1))] || st.path[0]; };
  const faceMeta = (f) => (f + 2) & 3;
  // the roads: following the land, bridged over water
  for (const road of v.roads) for (const [x, z, h] of road.cells) {
    if (!inC(x, z)) continue;
    if (h < SEA) { put(x, SEA, z, st.planks === 'smooth_sandstone' ? 'jungle_planks' : st.planks); for (let y = SEA + 1; y <= SEA + 3; y++) put(x, y, z, 0); continue; }
    put(x, h, z, pathAt(x, z));
    for (let y = h + 1; y <= h + 4; y++) if (soft(get(x, y, z))) put(x, y, z, 0);
    if (get(x, h - 1, z) === 0 || T_LIQUID[get(x, h - 1, z)]) put(x, h - 1, z, 'dirt');
  }
  // the plaza: level, the well in the middle
  const y0 = v.y, P = VPLAZA;
  for (let dz = -P; dz <= P; dz++) for (let dx = -P; dx <= P; dx++) {
    const x = v.x + dx, z = v.z + dz;
    if (!inC(x, z)) continue;
    if (Math.abs(dx) + Math.abs(dz) > P * 2 - 2) continue;    // rounded corners
    const edge = Math.max(Math.abs(dx), Math.abs(dz)) === P;
    put(x, y0, z, edge && !(Math.abs(dx) <= 1 || Math.abs(dz) <= 1) ? st.stone : pathAt(x, z));
    for (let y = y0 + 1; y <= y0 + 7; y++) put(x, y, z, 0);
    for (let y = y0 - 1; y > 1 && soft(get(x, y, z)); y--) put(x, y, z, 'dirt');
  }
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const x = v.x + dx, z = v.z + dz;
    if (!inC(x, z)) continue;
    const rim = Math.abs(dx) === 2 || Math.abs(dz) === 2;
    for (let y = y0 - 4; y <= y0; y++) put(x, y, z, rim ? st.stone : 'water');
    put(x, y0 - 5, z, st.stone);
    if (rim) put(x, y0 + 1, z, st.stoneSlab);
    if (Math.abs(dx) === 2 && Math.abs(dz) === 2) { put(x, y0 + 1, z, st.stone); put(x, y0 + 2, z, st.fence); put(x, y0 + 3, z, st.fence); }
    put(x, y0 + 4, z, st.stoneSlab);
    if (dx === 0 && dz === 0) { put(x, y0 + 4, z, st.stone); put(x, y0 + 3, z, 'lantern', 1); }
  }
  // the quest board on its posts under a little roof
  for (const k of [3, 4]) { const x = v.x + k, z = v.z - 6; put(x, y0 + 1, z, st.log); put(x, y0 + 2, z, 'quest_board', faceMeta(2)); put(x, y0 + 3, z, st.slab); }
  put(v.x + 2, y0 + 1, v.z - 6, st.fence); put(v.x + 2, y0 + 2, v.z - 6, 'lantern');
  put(v.x + 5, y0 + 1, v.z - 6, st.fence); put(v.x + 5, y0 + 2, v.z - 6, 'lantern');
  // the bell on its frame
  put(v.bell[0], y0 + 1, v.bell[2], 'bell');
  // a bench facing the well, flowers either end
  for (const [x, , z, f] of v.seats) put(x, y0 + 1, z, st.stairs, (f + 2) & 3);
  for (const dz of [-2, -6]) { put(v.x - 6, y0, v.z + dz, 'grass'); put(v.x - 6, y0 + 1, v.z + dz, VFLOWERS[(v.seed + dz) & 7]); }
  // market stalls: a counter in front, posts, a striped awning
  v.stalls.forEach((s, si) => {
    const aw = si ? st.awning2 : st.awning;
    for (let dz = 0; dz <= 2; dz++) for (let dx = -1; dx <= 1; dx++) {
      const x = s.x + dx, z = s.z + dz;
      if (Math.abs(dx) === 1 && (dz === 0 || dz === 2)) { put(x, y0 + 1, z, st.fence); put(x, y0 + 2, z, st.fence); }
      else if (dz === 0) put(x, y0 + 1, z, st.slab, 1);
      else if (dz === 2) put(x, y0 + 1, z, 'barrel');
      put(x, y0 + 3, z, aw[(dx + 1) % aw.length] || st.planks);
    }
    put(s.x, y0 + 2, s.z, si ? 'hay_bale' : 'barrel');
  });
  // lamps at the plaza's corners and along the roads
  for (const [dx, dz] of [[6, 6], [-6, 6], [-6, -6], [6, -6]]) { const x = v.x + dx, z = v.z + dz; if (Math.abs(dx) + Math.abs(dz) > P * 2 - 2) continue; put(x, y0 + 1, z, st.lampPost); put(x, y0 + 2, z, st.lampPost); put(x, y0 + 3, z, 'lantern'); }
  for (const [x, z] of v.lamps) {
    if (!inC(x, z)) continue;
    const y = this.column(x, z).h; if (y < SEA) continue;
    put(x, y, z, st.stone); put(x, y + 1, z, st.lampPost); put(x, y + 2, z, st.lampPost); put(x, y + 3, z, 'lantern');
    for (let yy = y + 4; yy <= y + 5; yy++) if (soft(get(x, yy, z))) put(x, yy, z, 0);
  }
  // hay, barrels and flowers by the road
  for (const [x, z, k] of v.decor) {
    if (!inC(x, z)) continue;
    const y = this.column(x, z).h; if (y < SEA) continue;
    for (let yy = y + 1; yy <= y + 3; yy++) if (soft(get(x, yy, z))) put(x, yy, z, 0);
    if (k <= 1) { put(x, y + 1, z, 'hay_bale'); if (k === 0) put(x, y + 2, z, 'hay_bale'); }
    else if (k <= 3) put(x, y + 1, z, 'barrel');
    else if (k === 4) put(x, y + 1, z, 'composter');
    else { put(x, y, z, v.style === 'desert' ? 'sand' : 'grass'); put(x, y + 1, z, v.style === 'desert' ? 'dead_bush' : k === 7 ? 'rose_bush' : VFLOWERS[(x * 7 + z) & 7]); }
  }
  // the buildings: ground cleared, a foundation under them, then the building
  for (const b of v.blds) {
    if (b.x1 + 2 < bx || b.x0 - 2 > bx + 15 || b.z1 + 2 < bz || b.z0 - 2 > bz + 15) continue;
    const T = VTEMPLATES[b.type];
    const found = T === VTEMPLATES.farm || T === VTEMPLATES.pen ? 'dirt' : st.stone;
    for (let z = Math.max(b.z0 - 1, bz); z <= Math.min(b.z1 + 1, bz + 15); z++) for (let x = Math.max(b.x0 - 1, bx); x <= Math.min(b.x1 + 1, bx + 15); x++) {
      const inside = x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
      for (let y = b.y + 1; y <= Math.min(CH - 1, b.y + T.H + 1); y++) if (inside || soft(get(x, y, z))) put(x, y, z, 0);
      if (!inside) continue;
      put(x, b.y, z, found);
      for (let y = b.y - 1; y > 1 && soft(get(x, y, z)); y--) put(x, y, z, found);
    }
    T.build(vStamp(ch, b, st));
  }
};
{
  // villages go in after everything else in the overworld
  const baseGen = WorldGen.prototype.generate;
  WorldGen.prototype.generate = function (ch) {
    const r = baseGen.call(this, ch);
    if (this.dim === 0) { try { this.buildVillages(ch); } catch (e) { console.warn('village', e); } ch.recomputeMaxY(); }
    return r;
  };
  // no trees in the middle of the village
  const baseTrees = WorldGen.prototype.treesForChunk;
  WorldGen.prototype.treesForChunk = function (cx, cz) {
    const list = baseTrees.call(this, cx, cz);
    if (this.dim !== 0 || list._v) return list;
    const out = list.filter(t => !this.villagesNear(t.x, t.z, 4).length);
    out._v = true;
    if (out.length !== list.length) { const key = cx + ',' + cz; if (this.colCache.get(key) === list) this.colCache.set(key, out); }
    return out;
  };
  // the world being played tells the generator which ground has been changed
  const baseLoad = Game.prototype.loadDimension;
  Game.prototype.loadDimension = function (dim) {
    VILLAGE_CTX = { records: this.records, meta: this.meta };
    return baseLoad.call(this, dim);
  };
  // a new world starts at the edge of a village
  const baseSpawn = Game.prototype.placeAtSpawn;
  Game.prototype.placeAtSpawn = function (p, initial) {
    let face = null;
    if (!this.meta.spawn && this.dim === 0 && this.world && this.world.gen.villageAt && !this.meta.noVillageSpawn) {
      let best = null, bd = 1e9;
      for (let rz = -3; rz <= 2; rz++) for (let rx = -3; rx <= 2; rx++) {
        const v = this.world.gen.villageAt(rx, rz);
        if (!v) continue;
        const d = Math.hypot(v.x, v.z);
        if (d < bd) { bd = d; best = v; }
      }
      if (best) {
        const road = best.roads.reduce((a, r) => (!a || r.L > a.L ? r : a), null);
        const t = road.L + 3, x = best.x + DXL[road.d] * t, z = best.z + DZL[road.d] * t;
        this.meta.spawn = [x + 0.5, 0, z + 0.5];
        face = Math.atan2(-(best.x - x), -(best.z - z));
      }
    }
    const r = baseSpawn.call(this, p, initial);
    if (face !== null && initial) p.yaw = face;
    return r;
  };
  // the day count goes up each morning (for shops restocking and the quest board)
  const baseTime = Game.prototype.advanceTime;
  Game.prototype.advanceTime = function (dt) {
    const t0 = this.meta.time;
    const r = baseTime.call(this, dt);
    if (this.meta.time < t0 - DAY_LEN / 2) this.meta.day = (this.meta.day || 0) + 1;
    return r;
  };
}

// ---- the quest board's look --------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB, PR = ramp('#9a7448', 8, 0.55);
    addTile('quest_board_side', p => gPlanks(p, PR), 0, undefined, GR);
    addTile('quest_board_front', p => {
      gPlanks(p, ramp('#7a5634', 8, 0.5), { nails: false, knot: false });
      for (let i = 0; i < 32; i++) { p.set(i, 0, H('#3a2814')); p.set(i, 31, H('#3a2814')); p.set(0, i, H('#3a2814')); p.set(31, i, H('#3a2814')); p.set(i, 1, H('#5a3e22')); p.set(1, i, H('#5a3e22')); }
      // pinned notes
      for (const [x0, y0, w, h, pin] of [[3, 3, 11, 12, '#c83a2a'], [17, 4, 12, 10, '#2a6ac8'], [4, 18, 10, 11, '#3a9a3a'], [16, 17, 13, 12, '#c8a82a']]) {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.set(x0 + x, y0 + y, shade(H('#e8dcc0'), 0.92 + p.rand() * 0.1 - (x === w - 1 || y === h - 1 ? 0.15 : 0)));
        for (let l = 3; l < h - 1; l += 2) for (let x = 2; x < w - 2 - (l * 3 % 4); x++) p.set(x0 + x, y0 + l, H('#6a5a48'));
        p.set(x0 + (w >> 1), y0 + 1, H(pin)); p.set(x0 + (w >> 1) + 1, y0 + 1, shade(H(pin), 0.7));
      }
    }, 0, undefined, GR);
  };
}
