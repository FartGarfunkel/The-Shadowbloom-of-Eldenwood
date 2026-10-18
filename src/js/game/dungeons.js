// ---------------------------------------------------------------------------
// game/dungeons.js — 0.9: dungeons.
//
// Under the land lie old dungeons: a crumbled shrine on the surface with a
// shaft going down, then rooms and corridors of mossy, cracked brick lit by
// guttering torches. Some rooms hold a monster cage that keeps spawning its
// kind while you're near, some a library of old books, some chests (one in
// a few of which has teeth: a mimic). At the far end waits the keeper of
// the place, a mini-boss with its name over the screen: the Grave Warden
// (a great skeleton), the Rot King (a ghoul lord), the Broodmother (a
// giant spider) or the Hex Matron (a witch). Beat it and the dungeon is
// cleared for good, and its hoard is yours: rare tomes, gems, mithril,
// sometimes a heart crystal.
//
// Three kinds: crypts (stone brick), nests (mossy cobble and cobwebs) and
// hollows (slate brick, deeper). Village quest boards point the way to the
// nearest one with a bounty for clearing it.
// ---------------------------------------------------------------------------
const DREG = 288;
const DGRID = 4, DCELL = 11;
const DTHEME = {
  crypt: { wall: ['stone_bricks', 'stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks'], floor: ['stone_bricks', 'cobblestone', 'gravel', 'mossy_stone_bricks'], pillar: 'chiseled_stone_bricks', mobs: ['skeleton', 'ghoul'], bosses: ['grave_warden', 'rot_king'], stairs: 'stone_brick_stairs', slab: 'stone_brick_slab', light: 'old_torch', name: 'Crypt' },
  nest: { wall: ['mossy_cobblestone', 'cobblestone', 'mossy_cobblestone', 'mossy_stone_bricks'], floor: ['cobblestone', 'gravel', 'mossy_cobblestone', 'coarse_dirt'], pillar: 'mossy_cobblestone', mobs: ['spider', 'cave_spider'], bosses: ['broodmother'], stairs: 'cobblestone_stairs', slab: 'cobblestone_slab', light: 'old_torch', webs: true, name: 'Spider Nest' },
  hollow: { wall: ['slate_bricks', 'slate_bricks', 'cracked_slate_bricks', 'cobbled_slate'], floor: ['slate_bricks', 'cobbled_slate', 'gravel'], pillar: 'slate_bricks', mobs: ['ghoul', 'skeleton', 'witch'], bosses: ['hex_matron', 'grave_warden'], stairs: 'slate_brick_stairs', slab: 'slate_brick_slab', light: 'soul_torch', name: 'Hollow' },
};
for (const th of Object.values(DTHEME)) for (const k of ['wall', 'floor']) th[k] = th[k].filter(b => B[b] !== undefined);
const DUNGEON_LOOT = {
  common: [['bread', 1, 4, 0.5], ['bone', 2, 6, 0.6], ['arrow', 4, 12, 0.4], ['iron_ingot', 1, 4, 0.45], ['gold_ingot', 1, 3, 0.3], ['emerald', 1, 4, 0.4], ['coal', 3, 8, 0.4], ['torch', 3, 8, 0.3], ['string', 2, 6, 0.3], ['rotten_flesh', 2, 5, 0.3], ['silver_ingot', 1, 3, 0.25], ['saddle', 1, 1, 0.1], ['name_tag', 1, 1, 0.08], ['tome_firebolt', 1, 1, 0.06], ['tome_frost', 1, 1, 0.06]],
  rare: [['diamond', 1, 2, 0.35], ['ruby', 1, 2, 0.35], ['sapphire', 1, 2, 0.35], ['steel_ingot', 1, 3, 0.3], ['golden_apple', 1, 1, 0.2], ['emerald', 3, 8, 0.6], ['tome_heal', 1, 1, 0.15], ['tome_blink', 1, 1, 0.12], ['tome_ward', 1, 1, 0.1], ['tome_levitate', 1, 1, 0.1], ['tome_stoneskin', 1, 1, 0.1], ['tome_familiar', 1, 1, 0.08], ['apprentice_staff', 1, 1, 0.12], ['mage_chestplate', 1, 1, 0.1], ['experience_bottle', 1, 3, 0.25]],
  boss: [['mithril_ingot', 1, 3, 0.6], ['emerald', 6, 14, 1], ['diamond', 1, 3, 0.5], ['tome_lightning', 1, 1, 0.35], ['tome_familiar', 1, 1, 0.3], ['tome_ward', 1, 1, 0.3], ['tome_blink', 1, 1, 0.3], ['heart_crystal', 1, 1, 0.3], ['ruby_staff', 1, 1, 0.2], ['sapphire_staff', 1, 1, 0.2], ['archmage_helmet', 1, 1, 0.15], ['adamantite_ingot', 1, 1, 0.1], ['golden_apple', 1, 2, 0.5]],
};
function dungeonLoot(kind, rnd) {
  const items = new Array(27).fill(null);
  const table = DUNGEON_LOOT[kind].concat(kind === 'boss' ? DUNGEON_LOOT.rare : kind === 'rare' ? DUNGEON_LOOT.common.slice(0, 8) : []);
  for (const [id, a, b, p] of table) {
    if (!ITEMS[id] || rnd() > p) continue;
    let k = Math.floor(rnd() * 27); for (let t = 0; t < 27 && items[k]; t++) k = (k + 1) % 27;
    items[k] = { id, n: a + Math.floor(rnd() * (b - a + 1)) };
  }
  return items;
}

// ---- the plan -----------------------------------------------------------------------------------------
WorldGen.prototype.dungeonAt = function (rx, rz) {
  if (this.dim !== 0) return null;
  const cache = this.dunCache || (this.dunCache = new Map());
  const key = rx + ',' + rz;
  if (cache.has(key)) return cache.get(key);
  let plan = null;
  try { plan = this.planDungeon(rx, rz); } catch (e) { console.warn('dungeon plan', e); }
  // an old world: not under ground someone has already changed
  if (plan && VILLAGE_CTX && VILLAGE_CTX.meta) {
    const book = VILLAGE_CTX.meta.dungeonBook || (VILLAGE_CTX.meta.dungeonBook = {});
    if (book[plan.id] === undefined) {
      let clear = true; const rec = VILLAGE_CTX.records;
      if (rec && rec.size) for (let cz = plan.z0 >> 4; cz <= plan.z1 >> 4 && clear; cz++) for (let cx = plan.x0 >> 4; cx <= plan.x1 >> 4; cx++) if (rec.has(chunkKey(0, cx, cz))) { clear = false; break; }
      book[plan.id] = clear ? 1 : 0;
    }
    if (!book[plan.id]) plan = null;
  }
  cache.set(key, plan);
  return plan;
};
WorldGen.prototype.dungeonsNear = function (x, z, pad = 0) {
  const out = [], rx = Math.floor(x / DREG), rz = Math.floor(z / DREG);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const d = this.dungeonAt(rx + dx, rz + dz);
    if (d && x >= d.x0 - pad && x <= d.x1 + pad && z >= d.z0 - pad && z <= d.z1 + pad) out.push(d);
  }
  return out;
};
// (Shadowbloom) F = a campaign dungeon forced here: { x, z, theme, boss, mobs, name, rooms, depth, place }
WorldGen.prototype.planDungeon = function (rx, rz, F) {
  if (!F && this.campaignDungeonAt) F = this.campaignDungeonAt(rx, rz);
  const rnd = mulberry32(hash32(this.seed, rx, rz, 5151));
  if (rnd() > 0.8 && !F) return null;
  const S = DGRID * DCELL;
  let ox = rx * DREG + 40 + Math.floor(rnd() * (DREG - 80 - S)), oz = rz * DREG + 40 + Math.floor(rnd() * (DREG - 80 - S));
  if (F) { ox = Math.round(F.x - S / 2); oz = Math.round(F.z - S / 2); }
  // keep clear of villages (and of the campaign's own places)
  if (!F && this.villagesNear && this.villagesNear(ox + S / 2, oz + S / 2, 40).length) return null;
  if (!F && this.campaignPlacesNear && this.campaignPlacesNear(ox + S / 2, oz + S / 2, 70)) return null;
  const deep = F ? !!F.deep : rnd() < 0.3;
  const theme = (F && F.theme && DTHEME[F.theme]) ? F.theme : deep ? 'hollow' : rnd() < 0.35 ? 'nest' : 'crypt';
  // the rooms: a random walk over a 4x4 grid from the entrance
  const start = [Math.floor(rnd() * DGRID), Math.floor(rnd() * DGRID)];
  const cells = new Map(), edges = [];
  const ck = (a, b) => a + ',' + b;
  cells.set(ck(...start), { gx: start[0], gz: start[1], d: 0 });
  const want = F && F.rooms ? Math.min(16, F.rooms) : 7 + Math.floor(rnd() * 5);
  for (let tries = 0; cells.size < want && tries < 200; tries++) {
    const list = [...cells.values()], from = list[Math.floor(rnd() * list.length)];
    const dir = Math.floor(rnd() * 4), nx = from.gx + DXL[dir], nz = from.gz + DZL[dir];
    if (nx < 0 || nz < 0 || nx >= DGRID || nz >= DGRID || cells.has(ck(nx, nz))) continue;
    cells.set(ck(nx, nz), { gx: nx, gz: nz, d: from.d + 1 }); edges.push([ck(from.gx, from.gz), ck(nx, nz)]);
  }
  if (cells.size < 5) return null;
  // a loop or two
  for (const c of cells.values()) for (let dir = 1; dir <= 2; dir++) { const n = ck(c.gx + DXL[dir], c.gz + DZL[dir]); if (cells.has(n) && rnd() < 0.18 && !edges.some(e => (e[0] === n && e[1] === ck(c.gx, c.gz)) || (e[1] === n && e[0] === ck(c.gx, c.gz)))) edges.push([ck(c.gx, c.gz), n]); }
  const ent = [ox + start[0] * DCELL + 5, oz + start[1] * DCELL + 5];
  const surf = this.column(ent[0] + 2, ent[1] + 2).h;
  if (surf <= SEA && !F) return null;
  const y = Math.max(8, Math.min(Math.max(surf, SEA + 2) - 18, (deep ? 14 : 24) + Math.floor(rnd() * 10)));
  if (surf - y < 10 && !F) return null;
  const rooms = [];
  let far = null;
  for (const c of cells.values()) { if (!far || c.d > far.d) far = c; }
  const kinds = ['hall', 'loot', 'spawner', 'hall', 'library', 'spawner', 'loot', 'hall', 'loot', 'spawner'];
  let ki = 0;
  for (const c of cells.values()) {
    const kind = c === far ? 'boss' : (c.gx === start[0] && c.gz === start[1]) ? 'entry' : kinds[ki++ % kinds.length];
    const R = kind === 'boss' ? 5 : 3 + (rnd() < 0.4 ? 1 : 0);
    rooms.push({ key: ck(c.gx, c.gz), kind, x: ox + c.gx * DCELL + 5, z: oz + c.gz * DCELL + 5, y, R, H: kind === 'boss' ? 7 : 4, seed: hash32(this.seed, c.gx, c.gz, rx * 7 + rz) });
  }
  const byKey = new Map(rooms.map(r => [r.key, r]));
  const corridors = edges.map(([a, b]) => [byKey.get(a), byKey.get(b)]);
  const boss = rooms.find(r => r.kind === 'boss');
  const th = DTHEME[theme];
  const id = 'd' + rx + '_' + rz;
  const plan = { id, rx, rz, theme, th, x0: ox - 3, z0: oz - 3, x1: ox + S + 3, z1: oz + S + 3, y, rooms, corridors, ent, surf, seed: hash32(this.seed, rx, rz, 5152),
    boss: { at: [boss.x, boss.y, boss.z], type: (F && F.boss) || th.bosses[Math.floor(rnd() * th.bosses.length)] },
    spawners: rooms.filter(r => r.kind === 'spawner').map(r => { const mobs = (F && F.mobs && F.mobs.length) ? F.mobs : th.mobs; return { at: [r.x, r.y, r.z], mob: mobs[Math.floor(rnd() * mobs.length)] }; }),
    x: ox + S / 2, z: oz + S / 2, name: (F && F.name) || th.name, place: F ? F.place : null };
  return plan;
};

// ---- building it ----------------------------------------------------------------------------------------
WorldGen.prototype.buildDungeons = function (ch) {
  const bx = ch.cx * 16, bz = ch.cz * 16;
  for (const d of this.dungeonsNear(bx + 8, bz + 8, 16)) {
    if (d.x1 < bx || d.x0 > bx + 15 || d.z1 < bz || d.z0 > bz + 15) continue;
    this.buildDungeonInto(ch, d);
  }
};
WorldGen.prototype.buildDungeonInto = function (ch, d) {
  const bx = ch.cx * 16, bz = ch.cz * 16, th = d.th;
  const inC = (x, z) => x >= bx && x < bx + 16 && z >= bz && z < bz + 16;
  const put = (x, y, z, key, meta = 0) => { if (!inC(x, z) || y < 1 || y >= CH) return -1; const id = key ? B[key] : 0; if (id === undefined) return -1; const i = cidx(x - bx, y, z - bz); ch.blocks[i] = id; ch.meta[i] = meta; ch.blockEntities.delete(i); return i; };
  const get = (x, y, z) => inC(x, z) && y >= 0 && y < CH ? ch.blocks[cidx(x - bx, y, z - bz)] : -1;
  const pick = (list, x, y, z, salt) => list[Math.floor(hashFloat(x * 3 + salt, y, z, d.seed) * list.length)];
  const wall = (x, y, z) => pick(th.wall, x, y, z, 1), floor = (x, y, z) => pick(th.floor, x, y, z, 2);
  // boxes of space: every room and corridor; shells first, then the insides
  const spaces = [];
  for (const r of d.rooms) spaces.push([r.x - r.R, r.y, r.z - r.R, r.x + r.R, r.y + r.H - 1, r.z + r.R]);
  for (const [a, b] of d.corridors) {
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z);
    if (a.x === b.x) spaces.push([a.x - 1, a.y, z0, a.x + 1, a.y + 2, z1]); else spaces.push([x0, a.y, a.z - 1, x1, a.y + 2, a.z + 1]);
  }
  // the shaft up from the entrance
  const ex = d.ent[0] + 2, ez = d.ent[1] + 2;
  spaces.push([ex, d.y, ez, ex, d.surf + 1, ez]);
  for (const [x0, y0, z0, x1, y1, z1] of spaces) {
    for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (!inC(x, z)) continue;
      for (let y = y0 - 1; y <= y1 + 1; y++) { if (y > d.surf - 2 && x === ex && z === ez) continue; put(x, y, z, wall(x, y, z)); }
    }
  }
  for (const [x0, y0, z0, x1, y1, z1] of spaces) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (!inC(x, z)) continue;
      for (let y = y0; y <= y1; y++) put(x, y, z, 0);
      if (!(x === ex && z === ez)) put(x, y0 - 1, z, floor(x, y0 - 1, z));
    }
  }
  // the ladder up the shaft (on its north wall) and the ruined shrine around the top
  for (let y = d.y; y <= d.surf; y++) put(ex, y, ez, 'ladder', 2);
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
    const x = ex + dx, z = ez + dz;
    if (!inC(x, z)) continue;
    const h = this.column(x, z).h, edge = Math.max(Math.abs(dx), Math.abs(dz)) === 3, mid = Math.max(Math.abs(dx), Math.abs(dz)) <= 1;
    if (dx === 0 && dz === 0) { for (let y = h + 1; y <= h + 3; y++) put(x, y, z, 0); continue; }
    if (mid) { put(x, h, z, wall(x, h, z)); for (let y = h + 1; y <= h + 3; y++) put(x, y, z, 0); if (dx && dz) { put(x, h + 1, z, th.pillar); if (hashFloat(x, z, d.seed, 9) < 0.6) put(x, h + 2, z, th.pillar); } continue; }
    put(x, h, z, floor(x, h, z));
    if (edge) { const tall = Math.floor(hashFloat(x, z, d.seed, 8) * 4); for (let y = h + 1; y <= h + tall; y++) put(x, y, z, wall(x, y, z)); for (let y = h + tall + 1; y <= h + 4; y++) if (get(x, y, z) > 0 && !T_SOLID[get(x, y, z)]) put(x, y, z, 0); }
    else for (let y = h + 1; y <= h + 3; y++) if (get(x, y, z) > 0 && (!T_SOLID[get(x, y, z)] || /leaves|log/.test(BLOCKS[get(x, y, z)].key))) put(x, y, z, 0);
  }
  { const h = this.column(ex, ez).h; put(ex + 1, h + 1, ez - 1, th.light === 'soul_torch' ? 'soul_lantern' : 'lantern'); }
  // the rooms' furnishings
  for (const r of d.rooms) {
    const rr = mulberry32(r.seed);
    const torch = (x, y, z, meta) => put(x, y, z, th.light, meta);
    // torches on the walls, dim and old
    for (const [x, z, m] of [[r.x, r.z - r.R, 3], [r.x, r.z + r.R, 4], [r.x - r.R, r.z, 1], [r.x + r.R, r.z, 2]]) if (rr() < 0.7 && get(x, r.y + 2, z) === 0 && T_SOLID[get(x + (m === 1 ? -1 : m === 2 ? 1 : 0), r.y + 2, z + (m === 3 ? -1 : m === 4 ? 1 : 0))]) torch(x, r.y + 2, z, m);
    // cobwebs and bones in the corners
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = r.x + sx * r.R, z = r.z + sz * r.R;
      if (th.webs || rr() < 0.4) put(x, r.y + r.H - 1, z, 'cobweb');
      if (th.webs && rr() < 0.6) put(x, r.y, z, 'cobweb');
      else if (rr() < 0.3) put(x, r.y, z, rr() < 0.5 ? 'bone_block' : 'decorated_pot');
    }
    const chest = (x, y, z, kind, mimic) => { const i = put(x, y, z, 'chest', Math.floor(rr() * 4)); if (i >= 0) ch.blockEntities.set(i, Object.assign({ type: 'chest', items: dungeonLoot(kind, rr) }, mimic ? { mimic: 1 } : {})); };
    switch (r.kind) {
      case 'hall':
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let y = r.y; y < r.y + r.H; y++) put(r.x + sx * 2, y, r.z + sz * 2, th.pillar);
        if (rr() < 0.5) chest(r.x, r.y, r.z, 'common', rr() < 0.2);
        break;
      case 'loot':
        chest(r.x - 1, r.y, r.z, 'common', rr() < 0.18); chest(r.x + 1, r.y, r.z, rr() < 0.4 ? 'rare' : 'common', rr() < 0.18);
        put(r.x, r.y, r.z, 'decorated_pot');
        break;
      case 'spawner':
        put(r.x, r.y - 1, r.z, th.pillar); put(r.x, r.y, r.z, 'monster_spawner');
        chest(r.x + 2, r.y, r.z + 2, 'common', false);
        break;
      case 'library':
        for (let k = -r.R + 1; k <= r.R - 1; k++) for (let y = r.y; y < r.y + 3; y++) { if (Math.abs(k) > 1 || y > r.y) { put(r.x - r.R, y, r.z + k, 'bookshelf'); put(r.x + r.R, y, r.z + k, 'bookshelf'); } }
        put(r.x, r.y, r.z + 1, 'lectern', 0);
        chest(r.x, r.y, r.z - 1, 'rare', false);
        break;
      case 'boss':
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { for (let y = r.y; y < r.y + r.H; y++) put(r.x + sx * 3, y, r.z + sz * 3, th.pillar); put(r.x + sx * 3 - sx, r.y + 3, r.z + sz * 3, 'soul_torch', sx < 0 ? 2 : 1); }
        // the hoard behind the dais
        for (let x = r.x - 2; x <= r.x + 2; x++) put(x, r.y, r.z + r.R - 1, th.slab, 0);
        chest(r.x, r.y + 1, r.z + r.R - 1, 'boss', false); chest(r.x - 1, r.y + 1, r.z + r.R - 1, 'rare', false); chest(r.x + 1, r.y + 1, r.z + r.R - 1, 'rare', false);
        break;
      case 'entry':
        put(r.x - 2, r.y, r.z - 2, 'decorated_pot');
        break;
    }
  }
};
{
  const baseGen = WorldGen.prototype.generate;
  WorldGen.prototype.generate = function (ch) {
    const r = baseGen.call(this, ch);
    if (this.dim === 0) { try { this.buildDungeons(ch); } catch (e) { console.warn('dungeon', e); } ch.recomputeMaxY(); }
    return r;
  };
  // no tree growing out of the shrine
  const baseTrees = WorldGen.prototype.treesForChunk;
  WorldGen.prototype.treesForChunk = function (cx, cz) {
    const list = baseTrees.call(this, cx, cz);
    if (this.dim !== 0 || list._d) return list;
    const out = list.filter(t => !this.dungeonsNear(t.x, t.z, 0).some(d => Math.abs(t.x - d.ent[0] - 2) < 7 && Math.abs(t.z - d.ent[1] - 2) < 7));
    out._d = true; out._v = list._v;
    const key = cx + ',' + cz; if (this.colCache.get(key) === list) this.colCache.set(key, out);
    return out;
  };
}

// ---- the keepers: mini-bosses ------------------------------------------------------------------------------------
{
  const D = MODEL_DEFS, sc = (from, s) => D[from] ? Object.assign({}, D[from], { scale: (D[from].scale || 1) * s }) : null;
  D.grave_warden = sc('skeleton', 1.45); D.rot_king = sc('ghoul', 1.45); D.broodmother = sc('spider', 2); D.hex_matron = sc('witch', 1.3);
  const T = (from, o) => Object.assign({}, MOB_TYPES[from] || {}, { mini: true, boss: true, xp: 120, knockResist: 0.7, special: true }, o);
  Object.assign(MOB_TYPES, {
    grave_warden: T('skeleton', { model: 'grave_warden', label: 'the Grave Warden', hp: 110, w: 0.45, h: 2.8, speed: 2.4, damage: 6, minion: 'skeleton', base: 'skeleton', tint: [0.6, 0.85, 1, 0.12], drops: [['bone', 4, 8, 1], ['arrow', 8, 16, 1]] }),
    rot_king: T('ghoul', { model: 'rot_king', label: 'the Rot King', hp: 140, w: 0.5, h: 2.8, speed: 2.7, damage: 7, minion: 'ghoul', base: 'ghoul', tint: [0.5, 0.9, 0.3, 0.12], drops: [['rotten_flesh', 4, 8, 1], ['iron_ingot', 2, 5, 1]] }),
    broodmother: T('spider', { model: 'broodmother', label: 'the Broodmother', hp: 100, w: 1.3, h: 1.6, speed: 3.6, damage: 5, minion: 'cave_spider', base: 'spider', tint: [0.7, 0.2, 0.3, 0.12], drops: [['string', 6, 12, 1], ['spider_eye', 2, 4, 1]] }),
    hex_matron: T('witch', { model: 'hex_matron', label: 'the Hex Matron', hp: 120, w: 0.4, h: 2.5, speed: 2.4, damage: 4, minion: 'ghoul', base: 'witch', tint: [0.6, 0.3, 0.9, 0.15], drops: [['glowstone_dust', 4, 8, 1], ['redstone', 4, 8, 1]] }),
    mimic: { model: 'mimic', label: 'a mimic', hp: 36, w: 0.45, h: 0.9, speed: 3.2, hostile: true, special: true, damage: 5, xp: 20, voice: 'raider', drops: [['emerald', 2, 6, 1], ['gold_ingot', 1, 3, 0.6], ['tome_firebolt', 1, 1, 0.1], ['diamond', 1, 1, 0.15]] },
  });
  for (const k of ['grave_warden', 'rot_king', 'broodmother', 'hex_matron']) {
    MONSTER_AI[k] = function (dt, p, dist, dyp, toPlayer) {
      const T = this.T;
      // at two thirds and at one third of its health it calls its servants
      const frac = this.health / this.maxHealth;
      this.calls = this.calls || 0;
      if ((frac < 0.66 && this.calls < 1) || (frac < 0.33 && this.calls < 2)) {
        this.calls++;
        for (let i = 0; i < 2 + this.calls; i++) { const a = Math.random() * TAU, m = this.game.addEntity(new Mob(this.game, T.minion, this.x + Math.cos(a) * 2, this.y + 0.2, this.z + Math.sin(a) * 2)); if (m) m.huntT = 20; }
        this.game.burst(this.x, this.y + 1, this.z, 'smoke', 30, 1.2);
        this.game.sfx.playAt(T.voice || 'ghoul', this.x, this.y + 1.5, this.z);
        for (const l of this.game.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 30) l.toast(`${T.label[0].toUpperCase() + T.label.slice(1)} calls for help!`, 'warn');
      }
      const f = MONSTER_AI[T.base];
      return f ? this.asType(T.base, () => f.call(this, dt, p, dist, dyp, toPlayer)) : this.asType(T.base, () => MONSTER_AI.__base.call(this, dt, p, dist, dyp, toPlayer));
    };
  }
  MONSTER_AI.mimic = function (dt, p, dist, dyp, toPlayer) {
    if (this.onGround && this.lastWant > 0.1 && Math.random() < dt * 1.2) this.wantJump = true;
    return this.asType('slime', () => MONSTER_AI.__base.call(this, dt, p, dist, dyp, toPlayer));
  };
  // the mimic: a chest with a jaw full of teeth
  D.mimic = finishRig('slime', [
    rpart('cube', null, [0, 0, 0], [-7, 0, -7, 7, 10, 7], { all: 'chest_side', top: 'chest_top', bottom: 'chest_top', front: 'mimic_jaw' }, { role: 'cube', noCull: true }),
    rpart('lid', 'cube', [0, 10, 7], [-7, 0, -14, 7, 5, 0], { all: 'chest_side', top: 'chest_top', front: 'mimic_lid' }, { rest: [-0.35, 0, 0] }),
    rpart('tongue', 'cube', [0, 9, -2], [-3, 0, -6, 3, 1, 0], 'mimic_tongue'),
  ]);
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('mimic_jaw', p => { p.noise(H('#8a5a2a'), 0.12); for (let y = 0; y < 3; y++) for (let x = 0; x < 16; x++) p.set(x, y, H('#2a0a0a')); for (let x = 0; x < 16; x += 2) { p.set(x, 0, H('#f0e8d0')); p.set(x, 1, H('#f0e8d0')); p.set(x + 1, 0, H('#d8d0b8')); } for (let x = 7; x < 9; x++) for (let y = 4; y < 7; y++) p.set(x, y, H('#c8a040')); });
    addTile('mimic_lid', p => { p.noise(H('#8a5a2a'), 0.12); for (let x = 0; x < 16; x++) { p.set(x, 15, H('#2a0a0a')); if (x % 2 === 0) p.set(x, 14, H('#f0e8d0')); } p.set(4, 8, H('#ffd040')); p.set(11, 8, H('#ffd040')); p.set(4, 9, H('#c02020')); p.set(11, 9, H('#c02020')); });
    addTile('mimic_tongue', p => { p.noise(H('#c83a5a'), 0.15); });
    addTile('monster_spawner', p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const bar = x % 4 === 0 || y % 4 === 0 || x === 15 || y === 15;
        if (bar) p.set(x, y, shade(H('#3a3e46'), 0.8 + p.rand() * 0.4)); else p.set(x, y, [0, 0, 0], 0);
      }
      for (const [x, y] of [[0, 0], [4, 4], [8, 8], [12, 12]]) p.set(x, y, H('#6a707a'));
    });
  };
  // the bar over the screen names whichever keeper you're fighting
  const baseFrame = Hud.prototype.frame;
  Hud.prototype.frame = function (dt, cam) {
    const r = baseFrame.call(this, dt, cam);
    const bar = this.q('.bossbar');
    if (bar && !bar.hidden) {
      const g = this.g, p = this.lp.player;
      let boss = null, bd = 48 * 48;
      for (const e of g.entities) if (e.T && e.T.boss && e.alive) { const d = e.dist2(p); if (d < bd) { bd = d; boss = e; } }
      if (boss && bar._b !== boss.type) {
        bar._b = boss.type;
        const nm = bar.querySelector('.boss-name span'), el = bar.querySelector('.boss-name .elem');
        const golem = boss.type === 'cinder_golem';   // (0.9.0.38) the golem's look-alikes (the Ember Lord, the Wardens) go by their own names
        if (nm) nm.textContent = golem ? 'Cinder Golem' : String(boss.T.label || boss.type).replace(/^the /, 'The ').replace(/^an? /, '');
        if (el) el.hidden = !golem;
      }
    }
    return r;
  };
}

// ---- dungeons at work: the cages, the keeper, mimics (host) ----------------------------------------------------------
const DUN = { tickT: 0 };
function dungeonRec(g, id) { const m = g.meta.dungeons || (g.meta.dungeons = {}); return m[id] || (m[id] = {}); }
function dungeonById(g, id) { const m = /^d(-?\d+)_(-?\d+)$/.exec(id); return m && g.world && g.world.gen.dungeonAt ? g.world.gen.dungeonAt(+m[1], +m[2]) : null; }
function dungeonTick(g, dt) {
  if (g.isGuest || g.dim !== 0 || !g.world || !g.world.gen.dungeonsNear) return;
  if ((DUN.tickT -= dt) > 0) return;
  DUN.tickT = 1;
  const w = g.world, ps = g.pawns().filter(p => !p.dead);
  const seen = new Set();
  for (const p of ps) for (const d of w.gen.dungeonsNear(p.x, p.z, 24)) {
    if (seen.has(d.id)) continue; seen.add(d.id);
    const rec = dungeonRec(g, d.id);
    // the cages
    for (const s of d.spawners) {
      const [x, y, z] = s.at;
      if (w.getBlock(x, y, z) !== B.monster_spawner) continue;
      const near = ps.some(q => Math.hypot(q.x - x - 0.5, q.y - y, q.z - z - 0.5) < 14);
      if (!near) continue;
      s.cd = (s.cd || 0) - 1;
      if (s.cd > 0) continue;
      s.cd = 5 + Math.floor(Math.random() * 6);
      let n = 0; for (const e of g.entities) if (e instanceof Mob && e.alive && e.T.hostile && Math.hypot(e.x - x, e.z - z) < 9 && Math.abs(e.y - y) < 5) n++;
      if (n >= 4) continue;
      for (let t = 0; t < 6; t++) {
        const sx = x + Math.floor(Math.random() * 7) - 3, sz = z + Math.floor(Math.random() * 7) - 3;
        if (!T_SOLID[w.getBlock(sx, y - 1, sz)] || w.getBlock(sx, y, sz) || w.getBlock(sx, y + 1, sz)) continue;
        const m = g.addEntity(new Mob(g, s.mob, sx + 0.5, y, sz + 0.5));
        if (m) { m.huntT = 15; m.fromCage = true; }
        g.burst(sx + 0.5, y + 0.5, sz + 0.5, 'smoke', 12, 0.6); g.burst(x + 0.5, y + 0.5, z + 0.5, 'flame', 6, 0.3);
        break;
      }
    }
    // the keeper wakes when someone walks into its hall
    if (!rec.cleared && !rec.bossUp && !(d.place && typeof campDungeonBossOk === 'function' && !campDungeonBossOk(g, d))) {
      const [bx, by, bz] = d.boss.at, room = d.rooms.find(r => r.kind === 'boss');
      const inside = ps.find(q => Math.abs(q.x - bx - 0.5) < room.R + 0.5 && Math.abs(q.z - bz - 0.5) < room.R + 0.5 && q.y >= by - 1 && q.y < by + room.H);
      if (inside && MOB_TYPES[d.boss.type]) {
        const m = g.addEntity(new Mob(g, d.boss.type, bx + 0.5, by, bz + 0.5));
        m.dungeon = d.id; m.huntT = 60; rec.bossUp = 1; m.persistent = true;
        g.sfx.playAt('spell_zap', bx, by + 2, bz, 40);
        g.burst(bx + 0.5, by + 1, bz + 0.5, 'smoke', 40, 1.5);
        for (const l of g.locals) if (Math.hypot(l.player.x - bx, l.player.z - bz) < 30) l.toast(`${MOB_TYPES[d.boss.type].label[0].toUpperCase() + MOB_TYPES[d.boss.type].label.slice(1)} awakens!`, 'warn');
      }
    }
    // the keeper was lost (everyone left): it can wake again
    if (rec.bossUp && !g.entities.some(e => e.dungeon === d.id && e.alive)) rec.bossUp = 0;
  }
}
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { dungeonTick(this, dt); } catch (err) { console.warn('dungeon', err); } return baseUpd.call(this, dt); };
  // the keeper falls: the dungeon is cleared
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const r = baseDie.call(this, src);
    const g = this.game;
    if (this.dungeon && !g.isGuest) {
      const rec = dungeonRec(g, this.dungeon); rec.cleared = 1; rec.bossUp = 0;
      const d = dungeonById(g, this.dungeon);
      for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 48) { l.toast(`${this.T.label[0].toUpperCase() + this.T.label.slice(1)} is defeated! The ${d ? d.name.toLowerCase() : 'dungeon'} is cleared.`, 'epic'); questDungeon(l, this.dungeon); }
      if (g.net) for (const p of g.net.pawns()) if (Math.hypot(p.x - this.x, p.z - this.z) < 48) p.send({ t: 'adv', k: 'dungeon', d: this.dungeon });
      if (g.net) g.net.all({ t: 'adv', k: 'dcleared', d: this.dungeon });   // (0.9.0.24) everyone's board knows it's done
      g.dropItem(mkStack(COIN(), (COIN() === 'gold_coin' ? 10 : 1) * (4 + Math.floor(Math.random() * 6))), this.x, this.y + 1, this.z, true);
      if (Math.random() < 0.35 && ITEMS.heart_crystal) g.dropItem(mkStack('heart_crystal', 1), this.x, this.y + 1, this.z, true);
    }
    return r;
  };
  // a mimic gives itself away when you try to open it
  const baseUseBlock = LocalPlayer.prototype.useBlockAt;
  LocalPlayer.prototype.useBlockAt = function (hit, held, def) {
    const g = this.g, w = g.world;
    if (hit && BLOCKS[hit.id] && BLOCKS[hit.id].container) {
      const ent = w.getEntity(hit.x, hit.y, hit.z);
      if (ent && ent.mimic) {
        w.setBlock(hit.x, hit.y, hit.z, 0, 0);
        const m = g.addEntity(new Mob(g, 'mimic', hit.x + 0.5, hit.y, hit.z + 0.5));
        if (m) m.huntT = 30;
        g.sfx.playAt('raider', hit.x, hit.y + 1, hit.z);
        this.toast('The chest has teeth!', 'warn');
        this.swingArm();
        return true;
      }
    }
    return baseUseBlock.call(this, hit, held, def);
  };
  // the guest hears about the keeper's fall too
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv' && m.k === 'dungeon') { const lp = this.g.locals[m.li || 0] || this.g.locals[0]; if (lp) { lp.toast('The dungeon is cleared!', 'epic'); questDungeon(lp, m.d); } return; }
    return baseGuest.call(this, m);
  };
}

// ---- the quest board's biggest bounty: clear the nearest dungeon ---------------------------------------------------
function questDungeon(lp, did) {
  const S = npcStats(lp.player);
  let hit = false;
  for (const q of S.quests) if (q.kind === 'dungeon' && q.did === did && !q.have) { q.have = 1; hit = true; lp.toast(`${q.title}: done — back to the village for your reward`, 'good'); }
  if (hit) questHud(lp);
}
{
  const base = boardQuests;
  boardQuests = function (g, v) {
    const out = base(g, v);
    // the nearest dungeon not yet cleared, within a few hundred blocks
    const gen = g.world && g.world.gen;
    if (!gen || !gen.dungeonAt) return out;
    let best = null, bd = 420;
    const rx = Math.floor(v.x / DREG), rz = Math.floor(v.z / DREG);
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
      const d = gen.dungeonAt(rx + dx, rz + dz); if (!d) continue;
      const dist = Math.hypot(d.ent[0] - v.x, d.ent[1] - v.z);
      if (dist < bd && !dungeonRec(g, d.id).cleared) { bd = dist; best = d; }
    }
    if (best) {
      const ang = Math.atan2(best.ent[1] - v.z, best.ent[0] - v.x), dirs = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
      const dir = dirs[(Math.round(ang / (Math.PI / 4)) + 8) % 8], far = Math.round(bd / 10) * 10;
      const boss = MOB_TYPES[best.boss.type].label;
      out.push({ id: v.id + ':dg:' + best.id, vid: v.id, giver: -1, from: 'Quest Board', kind: 'dungeon', did: best.id, need: 1, at: best.ent,
        title: 'Clear the ' + best.name, text: `An old ${best.name.toLowerCase()} lies about ${far} blocks to the ${dir} (near x ${best.ent[0]}, z ${best.ent[1]}). ${boss[0].toUpperCase() + boss.slice(1)} keeps it. End it.`, reward: { em: 14, xp: 150, rep: 15, skill: ['melee', 600] } });
    }
    return out;
  };
  const baseHave = questHave;
  questHave = function (lp, q) { return q.kind === 'dungeon' ? (q.have || 0) : baseHave(lp, q); };
}

// ---- finding one: noted (and marked on your maps) when you reach its shrine ----------------------------------
{
  const baseLP = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseLP.call(this, dt, inp);
    this._dsT = (this._dsT || 0) - dt;
    const g = this.g, p = this.player;
    if (this._dsT <= 0 && g.dim === 0 && g.world && g.world.gen.dungeonsNear && g.state === 'playing') {
      this._dsT = 1.5;
      for (const d of g.world.gen.dungeonsNear(p.x, p.z, 8)) {
        if (Math.hypot(p.x - d.ent[0] - 2, p.z - d.ent[1] - 2) > 14) continue;
        const S = p.stats || (p.stats = {}); S.dseen = S.dseen || {};
        if (!S.dseen[d.id]) { S.dseen[d.id] = 1; this.toast(`You have found a ${d.name.toLowerCase()}. Something waits below…`, 'warn'); }
      }
    }
    return r;
  };
}
