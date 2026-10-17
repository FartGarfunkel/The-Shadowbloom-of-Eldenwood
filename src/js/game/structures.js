// ---------------------------------------------------------------------------
// game/structures.js — 0.9.0.9: places worth finding.
//
//   Ruins            the broken walls of old houses and keeps, mossy and fallen in, often
//                    with a book on a lectern, sometimes a cellar with a chest below.
//   Mage towers      tall round towers of stone in the woods and hills: a library of
//                    old books, a study, warlocks in purple robes who throw fire and frost,
//                    and at the top the Hollow Archmage, the tower's master gone wrong.
//   Desert temples   sandstone halls with two towers and a coloured floor. Something lies
//                    under the blue stone at the heart, and so does the trap.
//   Sunken temples   prismarine halls on the floor of the deep sea, lit by sea lanterns,
//                    with gold at their core. The drowned keep them.
//   Shipwrecks       old ships broken on the sea floor or run aground on a beach, with
//                    their supplies and the captain's chest.
//   Mineshafts       old timbered tunnels with rails, cobwebs and cave spiders under the
//                    land, found by a little wooden frame over a ladder going down.
//   The Labyrinth    a stone maze deep under the land, entered by a stair under a ruined
//                    gate. At its heart, the Minotaur, and his treasure.
//
// Each kind is placed one per region of the world (where the land suits it), the same
// in every game of a world. In worlds you've played already, they appear only in land
// you haven't changed yet.
// ---------------------------------------------------------------------------
const STRUCTS = [];
function defStruct(o) { o.idx = STRUCTS.length; STRUCTS.push(o); return o; }

// ---- what's in the chests --------------------------------------------------------------------------------------------
const STRUCT_LOOT = {
  ruin: [['bread', 1, 3, 0.4], ['apple', 1, 3, 0.4], ['coal', 2, 6, 0.4], ['iron_ingot', 1, 3, 0.4], ['gold_nugget', 2, 8, 0.35], ['emerald', 1, 3, 0.35], ['torch', 2, 6, 0.3], ['string', 1, 4, 0.3], ['bone', 1, 4, 0.3], ['paper', 2, 6, 0.3], ['wheat_seeds', 2, 8, 0.3], ['compass', 1, 1, 0.08], ['saddle', 1, 1, 0.08], ['tome_light', 1, 1, 0.08], ['gold_ingot', 1, 2, 0.15]],
  tower: [['book', 1, 4, 0.6], ['paper', 3, 9, 0.5], ['lapis_lazuli', 2, 8, 0.4], ['emerald', 2, 6, 0.5], ['tome_light', 1, 1, 0.25], ['tome_frost', 1, 1, 0.2], ['tome_firebolt', 1, 1, 0.2], ['tome_heal', 1, 1, 0.15], ['tome_levitate', 1, 1, 0.12], ['tome_stoneskin', 1, 1, 0.12], ['apprentice_staff', 1, 1, 0.15], ['mage_helmet', 1, 1, 0.1], ['mage_boots', 1, 1, 0.1], ['sapphire', 1, 2, 0.2], ['candle', 2, 4, 0.3]],
  archmage: [['emerald', 6, 14, 1], ['tome_blink', 1, 1, 0.4], ['tome_ward', 1, 1, 0.35], ['tome_familiar', 1, 1, 0.35], ['tome_lightning', 1, 1, 0.25], ['sapphire_staff', 1, 1, 0.25], ['ruby_staff', 1, 1, 0.2], ['archmage_chestplate', 1, 1, 0.2], ['archmage_helmet', 1, 1, 0.2], ['heart_crystal', 1, 1, 0.3], ['diamond', 1, 3, 0.5], ['sapphire', 2, 4, 0.5]],
  temple: [['bone', 3, 8, 0.6], ['rotten_flesh', 2, 6, 0.5], ['gold_ingot', 2, 6, 0.5], ['iron_ingot', 1, 5, 0.4], ['emerald', 2, 6, 0.4], ['diamond', 1, 3, 0.25], ['saddle', 1, 1, 0.2], ['golden_apple', 1, 1, 0.15], ['spider_eye', 1, 3, 0.3], ['gunpowder', 2, 6, 0.3], ['ruby', 1, 2, 0.2], ['tome_ward', 1, 1, 0.06]],
  ocean: [['gold_ingot', 4, 10, 0.8], ['emerald', 4, 10, 0.6], ['diamond', 1, 3, 0.4], ['sapphire', 1, 3, 0.4], ['sponge', 1, 4, 0.5], ['sea_lantern', 2, 4, 0.4], ['heart_crystal', 1, 1, 0.2], ['golden_apple', 1, 2, 0.3], ['tome_frost', 1, 1, 0.2], ['tome_levitate', 1, 1, 0.15]],
  wreck_supply: [['bread', 2, 6, 0.6], ['potato', 3, 8, 0.5], ['carrot', 3, 8, 0.4], ['wheat', 4, 10, 0.4], ['paper', 2, 6, 0.5], ['coal', 2, 8, 0.4], ['leather', 1, 4, 0.4], ['gunpowder', 1, 4, 0.3], ['pumpkin', 1, 3, 0.2], ['rotten_flesh', 2, 6, 0.3], ['string', 1, 4, 0.3], ['spyglass', 1, 1, 0.08], ['compass', 1, 1, 0.15]],
  wreck_treasure: [['gold_ingot', 2, 7, 0.8], ['iron_ingot', 3, 8, 0.7], ['emerald', 3, 9, 0.7], ['gold_nugget', 4, 14, 0.6], ['diamond', 1, 2, 0.3], ['ruby', 1, 3, 0.3], ['sapphire', 1, 3, 0.3], ['clock', 1, 1, 0.15], ['golden_apple', 1, 1, 0.12]],
  mineshaft: [['rail', 4, 12, 0.6], ['torch', 4, 12, 0.5], ['coal', 3, 10, 0.5], ['iron_ingot', 1, 4, 0.5], ['gold_ingot', 1, 3, 0.3], ['redstone', 3, 9, 0.35], ['lapis_lazuli', 3, 9, 0.3], ['bread', 1, 3, 0.5], ['diamond', 1, 2, 0.12], ['silver_ingot', 1, 3, 0.25], ['iron_pickaxe', 1, 1, 0.15], ['powered_rail', 2, 6, 0.2], ['melon_seeds', 2, 4, 0.2], ['pumpkin_seeds', 2, 4, 0.2]],
  maze: [['bone', 2, 6, 0.5], ['arrow', 4, 12, 0.4], ['iron_ingot', 1, 4, 0.45], ['gold_ingot', 1, 3, 0.35], ['emerald', 1, 5, 0.45], ['string', 2, 6, 0.3], ['steel_ingot', 1, 2, 0.2], ['golden_apple', 1, 1, 0.08], ['tome_blink', 1, 1, 0.05]],
  maze_heart: [['emerald', 8, 18, 1], ['gold_ingot', 4, 10, 1], ['diamond', 2, 4, 0.7], ['mithril_ingot', 1, 3, 0.5], ['adamantite_ingot', 1, 1, 0.15], ['heart_crystal', 1, 1, 0.5], ['golden_apple', 1, 3, 0.5], ['tome_familiar', 1, 1, 0.25], ['tome_blink', 1, 1, 0.3], ['ruby', 2, 4, 0.4]],
};
function structLoot(kind, rnd) {
  const items = new Array(27).fill(null), table = STRUCT_LOOT[kind] || STRUCT_LOOT.ruin;
  for (const [id, a, b, p] of table) {
    if (!ITEMS[id] || rnd() > p) continue;
    let k = Math.floor(rnd() * 27); for (let t = 0; t < 27 && items[k]; t++) k = (k + 1) % 27;
    items[k] = { id, n: a + Math.floor(rnd() * (b - a + 1)) };
  }
  // a chest is never quite empty
  if (!items.some(Boolean)) items[Math.floor(rnd() * 27)] = { id: ITEMS.emerald ? 'emerald' : 'coal', n: 1 + Math.floor(rnd() * 3) };
  // now and then, an old book
  if (rnd() < (kind === 'tower' ? 0.45 : kind === 'maze_heart' || kind === 'archmage' ? 0.6 : 0.18)) { const k = LORE_KEYS[Math.floor(rnd() * LORE_KEYS.length)]; let s = Math.floor(rnd() * 27); for (let t = 0; t < 27 && items[s]; t++) s = (s + 1) % 27; items[s] = { id: 'lore_' + k, n: 1 }; }
  return items;
}

// ---- placing them --------------------------------------------------------------------------------------------------
WorldGen.prototype.structAt = function (k, rx, rz) {
  const T = STRUCTS[k];
  if (!T.dims.includes(this.dim)) return null;
  const cache = this.structCache || (this.structCache = new Map()), key = k + ':' + rx + ',' + rz;
  if (cache.has(key)) return cache.get(key);
  cache.set(key, null);
  let S = null;
  try {
    const rnd = mulberry32(lairSeed(this.seed, rx, rz, 9100 + k * 37 + this.dim));
    if (rnd() < T.chance) {
      const m = T.margin || 40;
      const x = rx * T.reg + m + Math.floor(rnd() * (T.reg - 2 * m)), z = rz * T.reg + m + Math.floor(rnd() * (T.reg - 2 * m));
      S = T.plan(this, x, z, rnd);
      if (S) {
        S.k = k; S.kind = T.key; S.id = 's' + k + '_' + this.dim + '_' + rx + '_' + rz; S.seed = lairSeed(this.seed, rx, rz, 9200 + k); S.name = S.name || T.name;
        // keep clear of everything else
        const cx = (S.x0 + S.x1) / 2, cz = (S.z0 + S.z1) / 2, rad = Math.max(S.x1 - S.x0, S.z1 - S.z0) / 2;
        if (this.villagesNear && this.villagesNear(cx, cz, rad + 24).length) S = null;
        else if (this.dungeonsNear && this.dungeonsNear(cx, cz, rad + 8).length) S = null;
        else if (this.lairsNear && this.lairsNear(cx, cz, rad + 6).length) S = null;
        else for (let j = 0; j < k && S; j++) if (this.structsNearKind(j, cx, cz, rad + 6).length) S = null;
      }
    }
    // land that's been played on keeps what it has
    if (S && typeof VILLAGE_CTX !== 'undefined' && VILLAGE_CTX && VILLAGE_CTX.meta) {
      const book = VILLAGE_CTX.meta.structBook || (VILLAGE_CTX.meta.structBook = {});
      if (book[S.id] === undefined) {
        let clear = true; const rec = VILLAGE_CTX.records;
        if (rec && rec.size) for (let cz = S.z0 >> 4; cz <= S.z1 >> 4 && clear; cz++) for (let cx = S.x0 >> 4; cx <= S.x1 >> 4; cx++) if (rec.has(chunkKey(this.dim, cx, cz))) { clear = false; break; }
        book[S.id] = clear ? 1 : 0;
      }
      if (!book[S.id]) S = null;
    }
  } catch (e) { console.warn('structure', T.key, e); S = null; }
  cache.set(key, S);
  return S;
};
WorldGen.prototype.structsNearKind = function (k, x, z, pad = 0) {
  const T = STRUCTS[k], out = [];
  if (!T.dims.includes(this.dim)) return out;
  const rx = Math.floor(x / T.reg), rz = Math.floor(z / T.reg);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const S = this.structAt(k, rx + dx, rz + dz);
    if (S && x >= S.x0 - pad && x <= S.x1 + pad && z >= S.z0 - pad && z <= S.z1 + pad) out.push(S);
  }
  return out;
};
WorldGen.prototype.structsNear = function (x, z, pad = 0) {
  const out = [];
  for (let k = 0; k < STRUCTS.length; k++) for (const S of this.structsNearKind(k, x, z, pad)) out.push(S);
  return out;
};
// a builder for one structure, working within one chunk
function sPut(gen, ch, S) {
  const bx = ch.cx * 16, bz = ch.cz * 16;
  const P = {
    gen, ch, S, bx, bz,
    in: (x, z) => x >= bx && x < bx + 16 && z >= bz && z < bz + 16,
    put(x, y, z, key, meta = 0) {
      if (x < bx || x >= bx + 16 || z < bz || z >= bz + 16 || y < 1 || y >= CH) return -1;
      const id = !key || key === 'air' ? 0 : B[key]; if (id === undefined) return -1;
      const i = cidx(x - bx, y, z - bz); ch.blocks[i] = id; ch.meta[i] = meta; ch.blockEntities.delete(i); return i;
    },
    get(x, y, z) { return x >= bx && x < bx + 16 && z >= bz && z < bz + 16 && y >= 0 && y < CH ? ch.blocks[cidx(x - bx, y, z - bz)] : -1; },
    fill(x0, y0, z0, x1, y1, z1, key, meta = 0) {
      const ax = Math.max(x0, bx), bx2 = Math.min(x1, bx + 15), az = Math.max(z0, bz), bz2 = Math.min(z1, bz + 15);
      for (let y = y0; y <= y1; y++) for (let z = az; z <= bz2; z++) for (let x = ax; x <= bx2; x++) P.put(x, y, z, typeof key === 'function' ? key(x, y, z) : key, meta);
    },
    h(x, y, z, s = 0) { return hashFloat(x * 31 + s * 7919, y + s * 131, z, S.seed); },
    pick(list, x, y, z, s = 0) { return list[Math.floor(P.h(x, y, z, s) * list.length)]; },
    // a chest whose front faces direction f (0 north, 1 east, 2 south, 3 west), filled from a loot table
    chest(x, y, z, f, kind) { const i = P.put(x, y, z, 'chest', (f + 2) & 3); if (i >= 0) ch.blockEntities.set(i, { type: 'chest', items: structLoot(kind, mulberry32(hash32(x, y, z, S.seed))) }); return i; },
    lectern(x, y, z, f, lore) { const i = P.put(x, y, z, 'lectern', (f + 2) & 3); if (i >= 0) ch.blockEntities.set(i, { type: 'lectern', book: true, lore: lore || LORE_KEYS[Math.floor(P.h(x, y, z, 5) * LORE_KEYS.length)] }); return i; },
    // a ladder on the wall in direction f from this cell
    ladder(x, y0, y1, z, f) { for (let y = y0; y <= y1; y++) P.put(x, y, z, 'ladder', f); },
    ground(x, z) { return gen.column(x, z).h; },
  };
  return P;
}
{
  const baseGen = WorldGen.prototype.generate;
  WorldGen.prototype.generate = function (ch) {
    const r = baseGen.call(this, ch);
    if (this.dim === 0 || this.dim === 1 || this.dim === 2) {   // (0.9.0.28) the Skylands and the Depths have places too (game/places.js)
      const bx = ch.cx * 16, bz = ch.cz * 16;
      try {
        for (const S of this.structsNear(bx + 8, bz + 8, 12)) {
          if (S.x1 < bx || S.x0 > bx + 15 || S.z1 < bz || S.z0 > bz + 15) continue;
          STRUCTS[S.k].build(sPut(this, ch, S), S);
        }
      } catch (e) { console.warn('structure build', e); }
      ch.recomputeMaxY();
    }
    return r;
  };
  // no trees growing through the floors
  const baseTrees = WorldGen.prototype.treesForChunk;
  WorldGen.prototype.treesForChunk = function (cx, cz) {
    const list = baseTrees.call(this, cx, cz);
    if (list._s || this.dim !== 0) return list;
    const out = list.filter(t => !this.structsNear(t.x, t.z, 3).some(S => S.surface));
    out._s = true; out._l = list._l; out._v = list._v; out._d = list._d;
    const key = cx + ',' + cz; if (this.colCache.get(key) === list) this.colCache.set(key, out);
    return out;
  };
}
// how even the land is over a footprint: [lowest, highest, mean]
function sLand(gen, x0, z0, x1, z1) {
  let lo = 999, hi = -1, sum = 0, n = 0;
  for (let z = z0; z <= z1; z += Math.max(1, (z1 - z0) >> 2)) for (let x = x0; x <= x1; x += Math.max(1, (x1 - x0) >> 2)) { const h = gen.column(x, z).h; lo = Math.min(lo, h); hi = Math.max(hi, h); sum += h; n++; }
  return [lo, hi, Math.round(sum / n)];
}
const sLandy = (c) => c.h > SEA + 1 && c.biome !== BIOME.OCEAN && c.biome !== BIOME.BEACH;

// ==== Ruins =========================================================================================================
const RUIN_PAL = {
  stone: { wall: ['stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks', 'mossy_cobblestone', 'cobblestone', 'stone_bricks'], floor: ['stone_bricks', 'cobblestone', 'gravel', 'coarse_dirt', 'mossy_cobblestone', 'grass'], corner: 'chiseled_stone_bricks', found: 'cobblestone', rubble: ['cobblestone', 'mossy_cobblestone', 'gravel', 'stone_brick_slab'] },
  sand: { wall: ['sandstone', 'cut_sandstone', 'smooth_sandstone', 'sandstone'], floor: ['sandstone', 'sand', 'cut_sandstone'], corner: 'chiseled_sandstone', found: 'sandstone', rubble: ['sandstone', 'sand', 'cut_sandstone'] },
  cold: { wall: ['stone_bricks', 'cracked_stone_bricks', 'cobblestone', 'stone_bricks', 'spruce_planks'], floor: ['spruce_planks', 'cobblestone', 'gravel', 'snow_block'], corner: 'spruce_log', found: 'cobblestone', rubble: ['cobblestone', 'gravel', 'snow_block'] },
};
defStruct({
  key: 'ruin', name: 'Ruins', reg: 176, chance: 0.5, margin: 24, dims: [0],
  plan(gen, x, z, rnd) {
    const c = gen.column(x, z); if (!sLandy(c)) return null;
    const W = 7 + 2 * Math.floor(rnd() * 3), D = 7 + 2 * Math.floor(rnd() * 3), x0 = x - (W >> 1), z0 = z - (D >> 1);
    const [lo, hi, mean] = sLand(gen, x0, z0, x0 + W - 1, z0 + D - 1);
    if (hi - lo > 5) return null;
    const style = c.biome === BIOME.DESERT ? 'sand' : c.temp < -0.2 ? 'cold' : 'stone';
    const side = Math.floor(rnd() * 4);
    return { x0, z0, x1: x0 + W - 1, z1: z0 + D - 1, y: mean, W, D, style, surface: true, cellar: rnd() < 0.35, lectern: rnd() < 0.5, door: side, breach: [Math.floor(rnd() * 4), rnd()], maxH: 3 + Math.floor(rnd() * 3), spawners: [], name: style === 'sand' ? 'Sandstone Ruins' : 'Ruins' };
  },
  build(P, S) {
    const pal = RUIN_PAL[S.style];
    const cx = (S.x0 + S.x1) >> 1, cz = (S.z0 + S.z1) >> 1;
    for (let z = S.z0 - 1; z <= S.z1 + 1; z++) for (let x = S.x0 - 1; x <= S.x1 + 1; x++) {
      if (!P.in(x, z)) continue;
      const out = x < S.x0 || x > S.x1 || z < S.z0 || z > S.z1, gh = P.ground(x, z);
      if (out) { if (gh < S.y) P.fill(x, gh + 1, z, x, S.y, z, S.style === 'sand' ? 'sand' : 'dirt'); if (gh >= S.y) P.put(x, S.y, z, S.style === 'sand' ? 'sand' : 'grass'); continue; }
      // the floor, on a footing down to the land
      for (let y = Math.min(gh, S.y) - 2; y < S.y; y++) P.put(x, y, z, pal.found);
      for (let y = S.y + 1; y <= Math.max(gh, S.y) + 3; y++) P.put(x, y, z, 0);
      const fl = P.h(x, 0, z, 1);
      P.put(x, S.y, z, fl < 0.15 ? (S.style === 'sand' ? 'sand' : 'grass') : P.pick(pal.floor, x, 0, z, 2));
      const edge = x === S.x0 || x === S.x1 || z === S.z0 || z === S.z1, corner = (x === S.x0 || x === S.x1) && (z === S.z0 || z === S.z1);
      if (edge) {
        // the walls, broken down to stumps where they fell, worst at the breach
        const side = z === S.z0 ? 0 : x === S.x1 ? 1 : z === S.z1 ? 2 : 3;
        const along = side === 0 || side === 2 ? (x - S.x0) / (S.W - 1) : (z - S.z0) / (S.D - 1);
        let h = corner ? S.maxH + 1 : Math.round(S.maxH * (0.35 + 0.65 * P.h(x, 1, z, 3)));
        if (side === S.breach[0]) h -= Math.round(Math.max(0, 3 - Math.abs(along - S.breach[1]) * 10));
        const door = side === S.door && Math.abs(along - 0.5) < 0.6 / ((side & 1) ? S.D : S.W) + 0.01;
        for (let y = 1; y <= h; y++) {
          if (door && y <= 2) continue;
          const win = !corner && y === 2 && h >= 3 && P.h(x, 2, z, 4) < 0.25;
          P.put(x, S.y + y, z, corner ? pal.corner : win ? 'iron_bars' : P.pick(pal.wall, x, y, z, 5));
        }
        // what fell off lies at its foot
        if (!corner && h < S.maxH - 1 && P.h(x, 9, z, 6) < 0.5) { const ox = side === 1 ? 1 : side === 3 ? -1 : 0, oz = side === 0 ? -1 : side === 2 ? 1 : 0; if (P.in(x + ox, z + oz)) P.put(x + ox, S.y + 1, z + oz, P.pick(pal.rubble, x, 3, z, 7)); }
      } else {
        const q = P.h(x, 2, z, 8);
        if (q < 0.07) P.put(x, S.y + 1, z, P.pick(pal.rubble, x, 4, z, 9));
        else if (q < 0.11 && S.style !== 'sand') P.put(x, S.y + 1, z, 'tall_grass');
        else if (q < 0.13 && S.style === 'stone') P.put(x, S.y + 1, z, 'cobweb');
      }
    }
    // a book left open, and a chest
    if (S.lectern) P.lectern(cx, S.y + 1, cz, S.door);
    if (S.cellar) {
      // a trapdoor in the floor, a ladder down to a little cellar
      const y0 = S.y - 5;
      P.fill(cx - 2, y0, cz - 2, cx + 2, S.y - 1, cz + 2, pal.found);
      P.fill(cx - 1, y0 + 1, cz - 1, cx + 1, y0 + 3, cz + 1, 0);
      P.put(cx, S.y - 1, cz + 1, 0); P.put(cx, S.y, cz + 1, S.style === 'cold' ? 'spruce_trapdoor' : 'oak_trapdoor', 2 | 8);
      P.ladder(cx, y0 + 1, S.y - 1, cz + 1, 2); P.put(cx, y0 + 1, cz + 2, pal.found); for (let y = y0 + 1; y < S.y; y++) P.put(cx, y, cz + 2, pal.found);
      P.chest(cx - 1, y0 + 1, cz - 1, 2, 'ruin'); P.chest(cx + 1, y0 + 1, cz - 1, 2, 'ruin');
      P.put(cx + 1, y0 + 3, cz, 'cobweb'); P.put(cx - 1, y0 + 3, cz + 1, 'cobweb'); P.put(cx, y0 + 3, cz - 1, 'old_torch', 3);
    } else P.chest(S.x0 + 1, S.y + 1, S.z0 + 1, 2, 'ruin');
  },
});

// ==== Mage towers ===================================================================================================
const TOWER_R = 5, TOWER_LV = 6;
defStruct({
  key: 'tower', name: 'Mage Tower', reg: 560, chance: 0.6, margin: 48, dims: [0],
  plan(gen, x, z, rnd) {
    const c = gen.column(x, z); if (!sLandy(c) || c.biome === BIOME.DESERT) return null;
    const R = TOWER_R, [lo, hi] = sLand(gen, x - R, z - R, x + R, z + R);
    if (hi - lo > 6 || lo + 4 * TOWER_LV + 12 >= CH - 2) return null;
    const y = lo + 1;
    const roof = ['purple_wool', 'blue_wool', 'cyan_wool', 'black_wool'][Math.floor(rnd() * 4)];
    return { x0: x - R - 2, z0: z - R - 2, x1: x + R + 2, z1: z + R + 2, cx: x, cz: z, y, R, roof, surface: true, door: Math.floor(rnd() * 4), name: 'Mage Tower',
      residents: [{ at: [x + 2, y + 1, z], mob: 'warlock' }, { at: [x - 2, y + 1 + TOWER_LV * 2, z + 1], mob: 'warlock' }, { at: [x + 1, y + 1 + TOWER_LV * 2, z - 2], mob: 'warlock' }],
      boss: { at: [x, y + 1 + TOWER_LV * 3, z], type: 'hollow_archmage', box: [x - R, y + TOWER_LV * 3, z - R, x + R, y + TOWER_LV * 4 + 6, z + R] } };
  },
  build(P, S) {
    const { cx, cz, y, R } = S, top = y + TOWER_LV * 4;
    const wall = (x, yy, z) => P.pick(['stone_bricks', 'stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks', 'polished_andesite'], x, yy, z, 1);
    const dx0 = DXL[S.door], dz0 = DZL[S.door];
    const ladderAt = [cx - dx0 * (R - 1), cz - dz0 * (R - 1)];   // up the wall opposite the door
    for (let z = S.z0; z <= S.z1; z++) for (let x = S.x0; x <= S.x1; x++) {
      if (!P.in(x, z)) continue;
      const d = Math.hypot(x - cx, z - cz), gh = P.ground(x, z);
      if (d > R + 1.6) continue;
      if (d > R + 0.5) { if (gh < y) P.fill(x, gh + 1, z, x, y - 1, z, 'cobblestone'); P.put(x, y, z, 'grass'); for (let yy = y + 1; yy <= Math.max(gh, y) + 2; yy++) P.put(x, yy, z, 0); continue; }
      for (let yy = Math.min(gh, y) - 3; yy < y; yy++) P.put(x, yy, z, 'cobblestone');
      const ring = d > R - 0.5;
      for (let yy = y; yy <= top; yy++) {
        const lv = (yy - y) % TOWER_LV, level = Math.floor((yy - y) / TOWER_LV);
        if (ring) {
          // windows on each floor, the door at the bottom
          const card = Math.abs(x - cx) < 0.6 || Math.abs(z - cz) < 0.6;
          const isDoor = level === 0 && (lv === 1 || lv === 2) && x === cx + dx0 * R && z === cz + dz0 * R;
          if (isDoor) { P.put(x, yy, z, 'oak_door', S.door | (lv === 2 ? 16 : 0)); continue; }
          if (card && (lv === 2 || lv === 3) && level > 0) { P.put(x, yy, z, 'glass_pane'); continue; }
          P.put(x, yy, z, lv === 0 && level > 0 ? 'chiseled_stone_bricks' : wall(x, yy, z));
        } else if (lv === 0) {
          // the floors, with the ladder's hole
          const hole = x === ladderAt[0] && z === ladderAt[1] && yy > y;
          P.put(x, yy, z, hole ? 0 : yy === y ? 'stone_bricks' : P.pick(['spruce_planks', 'dark_oak_planks'], x, 0, z, 2));
        } else P.put(x, yy, z, 0);
      }
      // a pointed roof, round and steep, with a light at its tip
      for (let k = 0; ; k++) {
        const rr = R + 1.4 - k * 0.62; if (rr < 0.4) { if (x === cx && z === cz) { P.put(x, top + k, z, 'sea_lantern'); P.put(x, top + k + 1, z, 'iron_bars'); P.put(x, top + k + 2, z, 'iron_bars'); } break; }
        if (d <= rr && d > rr - 1.25) P.put(x, top + 1 + k, z, S.roof);
      }
    }
    // the ladder up through every floor
    P.ladder(ladderAt[0], y + 1, top - 1, ladderAt[1], (S.door + 2) & 3);
    // ground floor: a workroom
    const L = (lv) => y + 1 + lv * TOWER_LV;
    P.put(cx - 3, L(0), cz - 1, 'cauldron'); P.put(cx - 3, L(0), cz + 1, 'barrel', 1); P.put(cx + 3, L(0), cz - 1, 'crafting_table'); P.put(cx - 2, L(0), cz - 3, 'barrel', 1);
    P.put(cx + 3, L(0), cz + 1, 'lantern'); P.put(cx - 3, L(0) + 1, cz + 1, 'lantern');
    // first floor: the library
    for (let z = cz - R + 1; z <= cz + R - 1; z++) for (let x = cx - R + 1; x <= cx + R - 1; x++) {
      const d = Math.hypot(x - cx, z - cz);
      if (d > R - 1.5 && d <= R - 0.5 && !(x === ladderAt[0] && z === ladderAt[1]) && !(Math.abs(x - ladderAt[0]) <= 1 && Math.abs(z - ladderAt[1]) <= 1)) { P.put(x, L(1), z, 'bookshelf'); P.put(x, L(1) + 1, z, 'bookshelf'); if (P.h(x, 1, z, 3) < 0.6) P.put(x, L(1) + 2, z, 'bookshelf'); }
    }
    P.lectern(cx, L(1), cz, S.door);
    P.chest(cx + dx0 * 2 + dz0, L(1), cz + dz0 * 2 + dx0, (S.door + 2) & 3, 'tower');
    P.put(cx - dz0 * 2, L(1), cz - dx0 * 2, 'candle', 2); P.put(cx + dz0 * 2, L(1), cz + dx0 * 2, 'lantern');
    // second floor: the study
    P.put(cx - 2, L(2), cz - 2, 'crafting_table'); P.put(cx - 1, L(2), cz - 2, 'barrel', 1); P.put(cx + 2, L(2), cz + 2, 'flower_pot'); P.put(cx + 3, L(2), cz, 'cauldron');
    P.chest(cx - 3, L(2), cz + 1, 1, 'tower'); P.put(cx, L(2), cz + 3, 'lantern'); P.put(cx - 2, L(2), cz + 2, 'candle', 3);
    // the top: the master's room, a crystal glowing over his hoard
    P.put(cx, L(3), cz - 3, 'amethyst_block'); P.put(cx, L(3) + 1, cz - 3, 'sea_lantern'); P.put(cx + 3, L(3), cz, 'amethyst_block'); P.put(cx - 3, L(3), cz, 'amethyst_block');
    P.chest(cx, L(3), cz + 3, 0, 'archmage');
    for (const [a, b] of [[2, 2], [-2, 2], [2, -2], [-2, -2]]) P.put(cx + a, L(3), cz + b, 'soul_lantern');
  },
});

// ==== Desert temples =================================================================================================
defStruct({
  key: 'desert_temple', name: 'Desert Temple', reg: 420, chance: 0.75, margin: 40, dims: [0],
  plan(gen, x, z, rnd) {
    const c = gen.column(x, z); if (c.biome !== BIOME.DESERT || c.h <= SEA + 1) return null;
    const [lo, hi, mean] = sLand(gen, x - 10, z - 10, x + 10, z + 10);
    if (hi - lo > 8) return null;
    return { x0: x - 10, z0: z - 10, x1: x + 10, z1: z + 10, cx: x, cz: z, y: mean, surface: true, name: 'Desert Temple' };
  },
  build(P, S) {
    const { cx, cz, y } = S, ss = 'sandstone', cut = 'cut_sandstone', sm = 'smooth_sandstone', chis = 'chiseled_sandstone';
    const OT = B.orange_terracotta !== undefined ? 'orange_terracotta' : 'terracotta', BT = B.blue_terracotta !== undefined ? 'blue_terracotta' : 'lapis_block';
    for (let z = S.z0; z <= S.z1; z++) for (let x = S.x0; x <= S.x1; x++) {
      if (!P.in(x, z)) continue;
      const lx = x - cx, lz = z - cz, ax = Math.abs(lx), az = Math.abs(lz), gh = P.ground(x, z);
      for (let yy = Math.min(gh, y) - 3; yy < y; yy++) P.put(x, yy, z, ss);
      for (let yy = y + 1; yy <= Math.max(gh, y) + 2; yy++) P.put(x, yy, z, 0);
      // the floor: a star of orange round a blue heart
      const star = (ax === az || ax === 0 || az === 0) && ax <= 3 && az <= 3;
      P.put(x, y, z, ax <= 3 && az <= 3 ? (ax === 0 && az === 0 ? BT : star ? OT : cut) : sm);
      const tower = lz <= -6 && ax >= 6, edge = ax === 10 || az === 10;
      if (tower) {
        // two hollow towers at the front, a doorway from the hall, a ladder up to a lookout at the top
        const tEdge = ax === 10 || ax === 6 || lz === -10 || lz === -6;
        for (let yy = 1; yy <= 14; yy++) {
          if (!tEdge) { P.put(x, y + yy, z, yy === 14 ? cut : 0); continue; }
          const doorway = lz === -6 && ax === 8 && yy <= 2, window = (yy === 11 || yy === 12) && (ax === 8 || lz === -8);
          P.put(x, y + yy, z, doorway || window ? 0 : yy === 14 ? cut : (yy === 5 || yy === 10) ? OT : yy === 13 ? chis : ss);
        }
        if (ax === 8 && lz === -9) for (let yy = 1; yy <= 13; yy++) P.put(x, y + yy, z, 'ladder', 0);
        if (ax === 8 && lz === -8) P.put(x, y + 14, z, 0);
      } else if (edge) {
        // the walls, banded, with the doorway at the front
        const door = lz === -10 && ax <= 1;
        for (let yy = 1; yy <= 9; yy++) {
          if (door && yy <= 4) continue;
          P.put(x, y + yy, z, yy === 9 ? cut : yy === 6 ? OT : (yy === 3 || yy === 7) && (ax % 3 === 0 || az % 3 === 0) ? chis : ss);
        }
      } else {
        // pillars round the hall, a roof over it, open to the sky over the star
        const pillar = (ax === 5 || az === 5) && (ax === 5 && az === 5);
        if (pillar) for (let yy = 1; yy <= 8; yy++) P.put(x, y + yy, z, yy === 4 ? OT : cut);
        if (!(ax <= 3 && az <= 3)) P.put(x, y + 9, z, cut);
        else if (ax === 3 || az === 3) P.put(x, y + 9, z, 'sandstone_slab');
      }
    }
    // under the blue stone: a shaft down to the treasure, and the trap
    const yf = y - 14;
    P.fill(cx - 4, yf - 2, cz - 4, cx + 4, y - 1, cz + 4, ss);
    P.fill(cx - 3, yf + 1, cz - 3, cx + 3, yf + 3, cz + 3, 0);
    for (let yy = yf + 4; yy < y; yy++) P.put(cx, yy, cz, 0);
    P.put(cx, yf, cz, ss); P.put(cx, yf + 1, cz, 'stone_pressure_plate');
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) P.put(cx + dx, yf - 1, cz + dz, 'tnt');
    for (const [dx, dz, f] of [[0, -3, 2], [3, 0, 3], [0, 3, 0], [-3, 0, 1]]) P.chest(cx + dx, yf + 1, cz + dz, f, 'temple');
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { P.put(cx + dx, yf + 1, cz + dz, chis); P.put(cx + dx, yf + 2, cz + dz, OT); }
  },
});

// ==== Sunken temples =================================================================================================
defStruct({
  key: 'ocean_temple', name: 'Sunken Temple', reg: 520, chance: 0.65, margin: 40, dims: [0],
  plan(gen, x, z, rnd) {
    const c = gen.column(x, z); if (c.biome !== BIOME.OCEAN || c.h > SEA - 9) return null;
    const [lo, hi] = sLand(gen, x - 11, z - 11, x + 11, z + 11);
    if (hi > SEA - 6) return null;
    return { x0: x - 11, z0: z - 11, x1: x + 11, z1: z + 11, cx: x, cz: z, y: lo, name: 'Sunken Temple',
      residents: [{ at: [x + 6, lo + 1, z], mob: 'drowned' }, { at: [x - 6, lo + 1, z], mob: 'drowned' }, { at: [x, lo + 1, z + 7], mob: 'drowned' }, { at: [x, lo + 1, z - 7], mob: 'drowned' }] };
  },
  build(P, S) {
    const { cx, cz, y } = S, wb = 'prismarine_bricks', pr = 'prismarine', dk = 'dark_prismarine';
    const fillAbove = (yy) => yy <= SEA ? 'water' : 0;
    for (let z = S.z0; z <= S.z1; z++) for (let x = S.x0; x <= S.x1; x++) {
      if (!P.in(x, z)) continue;
      const lx = x - cx, lz = z - cz, ax = Math.abs(lx), az = Math.abs(lz), gh = P.ground(x, z);
      for (let yy = gh + 1; yy < y; yy++) P.put(x, yy, z, pr);
      for (let yy = y + 1; yy <= Math.min(SEA, y + 12); yy++) P.put(x, yy, z, fillAbove(yy));
      P.put(x, y, z, (ax + az) % 4 === 0 ? dk : wb);
      const corner = ax >= 8 && az >= 8, edge = ax === 11 || az === 11;
      const wallTop = Math.min(y + 9, SEA + 1), towerTop = Math.min(y + 12, SEA + 2);
      if (corner) {
        const tEdge = ax === 11 || az === 11 || ax === 8 || az === 8;
        for (let yy = y + 1; yy <= towerTop; yy++) P.put(x, yy, z, tEdge ? (yy === towerTop ? dk : (yy - y) % 4 === 0 ? 'sea_lantern' : pr) : yy === towerTop ? dk : fillAbove(yy));
      } else if (edge) {
        const gate = (ax <= 1 || az <= 1);
        for (let yy = y + 1; yy <= wallTop; yy++) { if (gate && yy <= y + 4) continue; P.put(x, yy, z, yy === wallTop ? dk : yy === y + 5 ? 'sea_lantern' : wb); }
      } else {
        // the roof, a lantern in every fourth tile
        P.put(x, wallTop, z, (ax % 4 === 2 && az % 4 === 2) ? 'sea_lantern' : pr);
        // pillars in the hall
        if (ax % 4 === 3 && az % 4 === 3 && !(ax <= 4 && az <= 4)) for (let yy = y + 1; yy < wallTop; yy++) P.put(x, yy, z, yy === wallTop - 1 ? 'sea_lantern' : pr);
        // the core: dark walls round a heart of gold
        if (ax <= 4 && az <= 4) {
          const cEdge = ax === 4 || az === 4, door = cEdge && (ax <= 0 || az <= 0);
          for (let yy = y + 1; yy <= y + 6; yy++) {
            if (cEdge) { if (door && yy <= y + 2) continue; P.put(x, yy, z, yy === y + 6 ? dk : dk); }
            else if (yy === y + 6) P.put(x, yy, z, dk);
          }
          if (ax <= 1 && az <= 1 && lx <= 0 && lz <= 0) { P.put(x, y + 1, z, 'gold_block'); P.put(x, y + 2, z, 'gold_block'); }
          if (ax === 3 && az === 3) P.put(x, y + 1, z, 'sea_lantern');
        }
        // a sponge room in one wing
        if (lx >= 6 && lx <= 9 && lz >= 2 && lz <= 5) { if (lx === 6 || lz === 2 || lz === 5) for (let yy = y + 1; yy <= y + 3; yy++) P.put(x, yy, z, wb); else if (P.h(x, 0, z, 4) < 0.6) P.put(x, y + 1, z, 'sponge'); }
      }
    }
    P.chest(cx + 2, y + 1, cz + 2, 0, 'ocean'); P.chest(cx - 2, y + 1, cz + 2, 0, 'ocean');
  },
});

// ==== Shipwrecks ====================================================================================================
defStruct({
  key: 'wreck', name: 'Shipwreck', reg: 300, chance: 0.55, margin: 32, dims: [0],
  plan(gen, x, z, rnd) {
    const c = gen.column(x, z);
    const sunk = c.biome === BIOME.OCEAN && c.h <= SEA - 6, beached = c.biome === BIOME.BEACH;
    if (!sunk && !beached) return null;
    const L = 17 + Math.floor(rnd() * 6), axis = rnd() < 0.5 ? 0 : 1;   // 0: along z, 1: along x
    const hx = axis ? L >> 1 : 4, hz = axis ? 4 : L >> 1;
    const [lo, , mean] = sLand(gen, x - hx, z - hz, x + hx, z + hz);
    const yb = sunk ? lo - 1 : Math.max(SEA - 2, mean - 2);
    return { x0: x - hx, z0: z - hz, x1: x + hx, z1: z + hz, cx: x, cz: z, L, axis, yb, sunk, wood: ['spruce', 'planks', 'dark_oak'][Math.floor(rnd() * 3)], mast: 3 + Math.floor(rnd() * 7), flip: rnd() < 0.5, name: 'Shipwreck', surface: !sunk,
      residents: sunk ? [{ at: [x, yb + 2, z], mob: 'drowned' }] : [] };
  },
  build(P, S) {
    const plank = S.wood === 'planks' ? 'planks' : S.wood + '_planks', log = S.wood === 'planks' ? 'log' : S.wood + '_log', fence = S.wood === 'planks' || B[S.wood + '_fence'] === undefined ? 'oak_fence' : S.wood + '_fence', slab = S.wood === 'planks' || B[S.wood + '_slab'] === undefined ? 'oak_slab' : S.wood + '_slab';
    const keel = S.axis ? 1 : 2;
    const L = S.L, half = L >> 1;
    const water = (yy) => yy <= SEA ? 'water' : 0;
    // local (a along the ship, c across) to world
    const W = (a, c) => S.axis ? [S.cx + (S.flip ? -a : a), S.cz + c] : [S.cx + c, S.cz + (S.flip ? -a : a)];
    for (let a = -half; a <= half; a++) {
      const t = (a + half) / L, prof = Math.sin(Math.min(1, t * 1.25 + 0.08) * Math.PI);   // the bow is the sharp end
      const hw = Math.max(1, Math.round(3 * Math.min(1, prof * 1.4))), bottom = S.yb + Math.round(2 * (1 - Math.min(1, prof * 1.3)));
      const deck = S.yb + 4, cabin = a >= half - 4;
      for (let c = -hw - 1; c <= hw + 1; c++) {
        const [x, z] = W(a, c); if (!P.in(x, z)) continue;
        const broken = (yy) => P.h(x, yy, z, 9) < 0.1 + (S.sunk ? 0.06 : 0);
        if (Math.abs(c) > hw) continue;
        for (let yy = bottom; yy <= deck + (cabin ? 3 : 1); yy++) {
          const side = Math.abs(c) === hw;
          let id = null;
          if (yy === bottom) id = c === 0 ? log : plank;
          else if (side && yy <= deck + 1) id = yy === deck + 1 ? fence : plank;
          else if (yy === deck) id = P.h(x, 7, z, 2) < 0.25 ? null : (c === 0 ? slab : plank);
          else if (cabin && yy > deck) id = side || a === half - 4 || a === half ? (a === half - 4 && c === 0 && yy <= deck + 2 ? null : plank) : yy === deck + 3 ? plank : null;
          if (id && broken(yy)) id = null;
          const meta = yy === bottom && c === 0 ? keel : 0;
          P.put(x, yy, z, id || water(yy), id ? meta : 0);
        }
        // sand drifted in where it lies
        if (S.sunk && Math.abs(c) < hw && P.h(x, 0, z, 6) < 0.3) P.put(x, bottom + 1, z, 'sand');
        if (S.sunk && Math.abs(c) === hw && P.h(x, 1, z, 7) < 0.3) { const [ox, oz] = W(a, c + Math.sign(c)); if (P.in(ox, oz)) P.put(ox, S.yb, oz, 'seagrass'); }
      }
      // the broken mast
      if (a === Math.round(L * 0.08)) { const [x, z] = W(a, 0); if (P.in(x, z)) { for (let yy = S.yb + 1; yy <= S.yb + 4 + S.mast; yy++) P.put(x, yy, z, log, 0); if (S.mast > 5) for (const c of [-2, -1, 1, 2]) { const [xx, zz] = W(a, c); if (P.in(xx, zz)) P.put(xx, S.yb + 2 + S.mast, zz, fence); } } }
    }
    // the hold's stores at the bow, the captain's chest in the cabin
    const [bx, bz] = W(-half + 4, 0), [sx, sz] = W(half - 2, 0);
    const fwd = S.axis ? (S.flip ? 1 : 3) : (S.flip ? 0 : 2);
    P.chest(bx, S.yb + 2, bz, fwd, 'wreck_supply');
    P.chest(sx, S.yb + 5, sz, (fwd + 2) & 3, 'wreck_treasure');
    const [mx, mz] = W(half - 3, 1); P.put(mx, S.yb + 5, mz, 'lantern');
  },
});

// ==== Mineshafts =====================================================================================================
defStruct({
  key: 'mineshaft', name: 'Mineshaft', reg: 480, chance: 0.55, margin: 64, dims: [0],
  plan(gen, x, z, rnd) {
    const c = gen.column(x, z); if (!sLandy(c)) return null;
    const y = 18 + Math.floor(rnd() * 14);
    if (c.h - y < 16) return null;
    // corridors, branching out from the start
    const segs = [], LIM = 56;
    const q = [{ x, z, dir: Math.floor(rnd() * 4), d: 0 }];
    while (q.length && segs.length < 28) {
      const s = q.shift(), len = 8 + Math.floor(rnd() * 18), ex = s.x + DXL[s.dir] * len, ez = s.z + DZL[s.dir] * len;
      if (Math.abs(ex - x) > LIM || Math.abs(ez - z) > LIM) continue;
      // not running into (or alongside) a corridor that's already there
      const nx0 = Math.min(s.x + DXL[s.dir] * 4, ex) - 1, nx1 = Math.max(s.x + DXL[s.dir] * 4, ex) + 1, nz0 = Math.min(s.z + DZL[s.dir] * 4, ez) - 1, nz1 = Math.max(s.z + DZL[s.dir] * 4, ez) + 1;
      if (segs.some(o => !(o.x1 + 1 < nx0 || o.x0 - 1 > nx1 || o.z1 + 1 < nz0 || o.z0 - 1 > nz1))) continue;
      segs.push({ x: s.x, z: s.z, ex, ez, dir: s.dir, x0: Math.min(s.x, ex), x1: Math.max(s.x, ex), z0: Math.min(s.z, ez), z1: Math.max(s.z, ez), chest: rnd() < 0.3, spider: false });
      if (s.d < 5) for (const nd of [s.dir, (s.dir + 1) & 3, (s.dir + 3) & 3]) if (rnd() < (nd === s.dir ? 0.6 : 0.45)) q.push({ x: ex, z: ez, dir: nd, d: s.d + 1 });
    }
    if (segs.length < 5) return null;
    const sp = segs[1 + Math.floor(rnd() * (segs.length - 1))]; sp.spider = true;
    let x0 = x, x1 = x, z0 = z, z1 = z;
    for (const s of segs) { x0 = Math.min(x0, s.x0 - 3); x1 = Math.max(x1, s.x1 + 3); z0 = Math.min(z0, s.z0 - 3); z1 = Math.max(z1, s.z1 + 3); }
    const spAt = [(sp.x + sp.ex) >> 1, y, (sp.z + sp.ez) >> 1];
    return { x0, z0, x1, z1, x, z, y, segs, name: 'Mineshaft', spawners: [{ at: spAt, mob: 'cave_spider' }] };
  },
  build(P, S) {
    const y = S.y;
    for (const s of S.segs) {
      if (s.x1 + 3 < P.bx || s.x0 - 3 > P.bx + 15 || s.z1 + 3 < P.bz || s.z0 - 3 > P.bz + 15) continue;
      const alongX = s.dir === 1 || s.dir === 3;
      for (let k = 0; k <= Math.abs(alongX ? s.ex - s.x : s.ez - s.z); k++) {
        const ax = alongX ? s.x + DXL[s.dir] * k : s.x, az = alongX ? s.z : s.z + DZL[s.dir] * k;
        for (let w = -1; w <= 1; w++) {
          const x = alongX ? ax : ax + w, z = alongX ? az + w : az;
          if (!P.in(x, z)) continue;
          for (let yy = y; yy <= y + 2; yy++) if (P.get(x, yy, z) !== B.bedrock) P.put(x, yy, z, 0);
          // over a cave, a bridge of planks
          if (!T_SOLID[P.get(x, y - 1, z)]) P.put(x, y - 1, z, 'planks');
          if (w === 0 && P.h(x, 0, z, 1) < 0.8) P.put(x, y, z, 'rail', alongX ? 1 : 0);
          // timbers every fourth step: posts and a beam
          if (k % 4 === 0) {
            if (w !== 0) { P.put(x, y, z, 'oak_fence'); P.put(x, y + 1, z, 'oak_fence'); }
            P.put(x, y + 2, z, 'planks');
          }
          if (P.h(x, 2, z, 3) < 0.06 && k % 4 !== 0) P.put(x, y + 2, z, 'cobweb');
          if (s.spider && P.h(x, 3, z, 4) < 0.3 && w !== 0) P.put(x, y + 1 + (k & 1), z, 'cobweb');
        }
        if (s.chest && k === 5) { const x = alongX ? ax : ax + 2, z = alongX ? az + 2 : az; if (P.in(x, z)) P.chest(x, y, z, alongX ? 0 : 3, 'mineshaft'); }
      }
      // crossings
      for (const [cx, cz] of [[s.x, s.z], [s.ex, s.ez]]) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx, z = cz + dz; if (!P.in(x, z)) continue;
        for (let yy = y; yy <= y + 3; yy++) if (P.get(x, yy, z) !== B.bedrock && P.get(x, yy, z) !== B.rail) P.put(x, yy, z, 0);
        if (!T_SOLID[P.get(x, y - 1, z)]) P.put(x, y - 1, z, 'planks');
      }
    }
    // the cage, wrapped in webs
    const [sx, sy, sz] = S.spawners[0].at; P.put(sx, sy, sz, 'monster_spawner'); P.put(sx, sy - 1, sz, 'planks');
    // the way in: a ladder in a timbered shaft from the land above
    const gh = P.ground(S.x, S.z);
    for (let yy = y; yy <= gh + 3; yy++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const x = S.x + dx, z = S.z + dz; if (!P.in(x, z)) continue;
      const ring = dx !== 0 || dz !== 0;
      if (yy > gh) { if (ring && (Math.abs(dx) + Math.abs(dz) === 2) && yy <= gh + 2) P.put(x, yy, z, 'oak_fence'); else if (yy === gh + 3 && ring) P.put(x, yy, z, 'oak_slab'); else P.put(x, yy, z, 0); continue; }
      if (ring) { if (yy >= y + 3) P.put(x, yy, z, yy === gh ? 'planks' : (Math.abs(dx) + Math.abs(dz) === 2 ? 'log' : 'planks')); }
      else P.put(x, yy, z, 0);
    }
    if (P.in(S.x, S.z)) for (let yy = y; yy <= gh; yy++) P.put(S.x, yy, S.z, 'ladder', 0);
    if (P.in(S.x, S.z - 1)) for (let yy = y; yy <= gh; yy++) P.put(S.x, yy, S.z - 1, 'planks');
  },
});

// ==== The Labyrinth ==================================================================================================
const MAZE_N = 13, MAZE_C = 3, MAZE_SIZE = MAZE_N * MAZE_C + 1;
defStruct({
  key: 'labyrinth', name: 'The Labyrinth', reg: 720, chance: 0.6, margin: 60, dims: [0],
  plan(gen, x, z, rnd) {
    const c = gen.column(x, z); if (!sLandy(c)) return null;
    const x0 = x - (MAZE_SIZE >> 1), z0 = z - (MAZE_SIZE >> 1), x1 = x0 + MAZE_SIZE - 1, z1 = z0 + MAZE_SIZE - 1;
    const [lo] = sLand(gen, x0, z0, x1, z1);
    const y = Math.max(10, Math.min(30, lo - 16));
    if (lo - y < 12) return null;
    // carve the maze: cells are open, walls between them are knocked through as it wanders
    const open = new Uint8Array(MAZE_SIZE * MAZE_SIZE), O = (gx, gz) => gx * MAZE_SIZE + gz;
    const cellOpen = (cx, cz) => { for (let a = 0; a < MAZE_C - 1; a++) for (let b = 0; b < MAZE_C - 1; b++) open[O(cx * MAZE_C + 1 + a, cz * MAZE_C + 1 + b)] = 1; };
    const seen = new Uint8Array(MAZE_N * MAZE_N), S0 = (cx, cz) => cx * MAZE_N + cz;
    const mid = MAZE_N >> 1, heart = (cx, cz) => Math.abs(cx - mid) <= 1 && Math.abs(cz - mid) <= 1;
    for (let cx = 0; cx < MAZE_N; cx++) for (let cz = 0; cz < MAZE_N; cz++) if (heart(cx, cz)) seen[S0(cx, cz)] = 1;
    const knock = (ax, az, bx, bz) => { cellOpen(bx, bz); const wx = ax === bx ? ax * MAZE_C + 1 : Math.max(ax, bx) * MAZE_C, wz = az === bz ? az * MAZE_C + 1 : Math.max(az, bz) * MAZE_C; for (let t = 0; t < MAZE_C - 1; t++) open[O(ax === bx ? wx + t : wx, az === bz ? wz + t : wz)] = 1; };
    const start = [mid, MAZE_N - 1]; cellOpen(...start); seen[S0(...start)] = 1;
    const stack = [start];
    while (stack.length) {
      const [cx, cz] = stack[stack.length - 1], opts = [];
      for (let d = 0; d < 4; d++) { const nx = cx + DXL[d], nz = cz + DZL[d]; if (nx >= 0 && nz >= 0 && nx < MAZE_N && nz < MAZE_N && !seen[S0(nx, nz)]) opts.push([nx, nz]); }
      if (!opts.length) { stack.pop(); continue; }
      const [nx, nz] = opts[Math.floor(rnd() * opts.length)]; seen[S0(nx, nz)] = 1; knock(cx, cz, nx, nz); stack.push([nx, nz]);
    }
    // the heart: one great room, open on all four sides
    for (let gx = (mid - 1) * MAZE_C + 1; gx < (mid + 2) * MAZE_C; gx++) for (let gz = (mid - 1) * MAZE_C + 1; gz < (mid + 2) * MAZE_C; gz++) open[O(gx, gz)] = 1;
    for (const [dx, dz] of [[0, -2], [0, 2], [-2, 0], [2, 0]]) { const cx = mid + dx, cz = mid + dz; cellOpen(cx, cz); knock(cx, cz, mid + Math.sign(dx), mid + Math.sign(dz)); }
    // dead ends get a chest or an old skeleton
    const dead = [];
    for (let cx = 0; cx < MAZE_N; cx++) for (let cz = 0; cz < MAZE_N; cz++) {
      if (heart(cx, cz) || (cx === start[0] && cz === start[1])) continue;
      const gx = cx * MAZE_C + 1, gz = cz * MAZE_C + 1; let exits = 0;
      if (open[O(gx - 1, gz)]) exits++; if (open[O(gx + MAZE_C - 1, gz)]) exits++; if (open[O(gx, gz - 1)]) exits++; if (open[O(gx, gz + MAZE_C - 1)]) exits++;
      if (exits === 1) dead.push([x0 + gx, z0 + gz]);
    }
    const res = [];
    for (const [dx, dz] of dead) if (rnd() < 0.18) res.push({ at: [dx, y + 1, dz], mob: rnd() < 0.5 ? 'skeleton' : 'ghoul' });
    const hx = x0 + mid * MAZE_C + 1, hz = z0 + mid * MAZE_C + 1, ex = x0 + start[0] * MAZE_C + 1;
    // the stair climbs one step for each block south until it comes out on the land
    let stairK = 0; while (stairK < 60 && y + stairK <= gen.column(ex, z1 + 1 + stairK).h) stairK++;
    return { x0: x0 - 1, z0: z0 - 1, x1: x1 + 1, z1: z1 + stairK + 6, mx0: x0, mz0: z0, y, open, dead, name: 'The Labyrinth', heart: [hx, hz], entry: [ex, z1], stairK,
      residents: res, boss: { at: [hx, y + 1, hz], type: 'minotaur', box: [hx - 3, y, hz - 3, hx + 4, y + 5, hz + 4] } };
  },
  build(P, S) {
    const y = S.y, O = (gx, gz) => gx * MAZE_SIZE + gz;
    const wall = (x, yy, z) => P.pick(['stone_bricks', 'stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks', 'stone_bricks', 'mossy_stone_bricks'], x, yy, z, 1);
    for (let gz = 0; gz < MAZE_SIZE; gz++) for (let gx = 0; gx < MAZE_SIZE; gx++) {
      const x = S.mx0 + gx, z = S.mz0 + gz; if (!P.in(x, z)) continue;
      P.put(x, y, z, P.h(x, 0, z, 2) < 0.25 ? 'cracked_stone_bricks' : 'stone_bricks');
      P.put(x, y + 5, z, 'stone_bricks');
      const o = S.open[O(gx, gz)];
      for (let yy = y + 1; yy <= y + 4; yy++) P.put(x, yy, z, o ? 0 : (yy === y + 4 && (gx + gz) % 6 === 0 ? 'chiseled_stone_bricks' : wall(x, yy, z)));
      if (o && P.h(x, 3, z, 3) < 0.04) P.put(x, y + 4, z, 'cobweb');
      if (o && P.h(x, 4, z, 4) < 0.012) P.put(x, y + 1, z, 'bone_block');
    }
    // lamps in the heart, chests at its back
    const [hx, hz] = S.heart;
    for (const [a, b] of [[-3, -3], [4, -3], [-3, 4], [4, 4]]) { P.put(hx + a, y + 1, hz + b, 'chiseled_stone_bricks'); P.put(hx + a, y + 2, hz + b, 'soul_lantern'); }
    P.chest(hx - 1, y + 1, hz - 3, 2, 'maze_heart'); P.chest(hx + 2, y + 1, hz - 3, 2, 'maze_heart');
    P.lectern(hx, y + 1, hz + 4, 0, 'labyrinth');
    // the dead ends
    for (const [x, z] of S.dead) if (P.in(x, z)) { const q = P.h(x, 7, z, 5); if (q < 0.22) P.chest(x, y + 1, z, 2, 'maze'); else if (q < 0.4) P.put(x, y + 1, z, 'old_torch', 0); }
    // the way down: a stair under a broken gate, south of the maze
    const [ex, ez] = S.entry;
    for (let k = 0; k <= S.stairK; k++) {
      const z = ez + 1 + k, floor = y + k;   // one step up for every step south
      for (let dx = -1; dx <= 2; dx++) {
        const x = ex + dx; if (!P.in(x, z)) continue;
        const side = dx === -1 || dx === 2;
        for (let yy = floor - 1; yy <= floor + 4; yy++) {
          if (yy > P.ground(x, z) + 1 && side) continue;
          P.put(x, yy, z, side || yy === floor - 1 ? wall(x, yy, z) : yy === floor + 4 ? (floor + 4 > P.ground(x, z) ? 0 : 'stone_bricks') : 0);
        }
        if (!side) P.put(x, floor, z, 'stone_brick_stairs', 2);
      }
    }
    for (let dx = 0; dx <= 1; dx++) if (P.in(ex + dx, ez)) for (let yy = y + 1; yy <= y + 4; yy++) P.put(ex + dx, yy, ez, 0);
    // the gate: two worn pillars and a fallen lintel
    const gz = ez + 1 + S.stairK + 2;
    for (const dx of [-2, 3]) { const x = ex + dx; if (!P.in(x, gz)) continue; const gy = P.ground(x, gz); for (let yy = gy + 1; yy <= gy + 4; yy++) P.put(x, yy, gz, yy === gy + 4 ? 'chiseled_stone_bricks' : wall(x, yy, gz)); }
    for (let dx = -1; dx <= 2; dx++) { const x = ex + dx; if (P.in(x, gz + 1) && P.h(x, 9, gz, 6) < 0.6) P.put(x, P.ground(x, gz + 1) + 1, gz + 1, 'stone_brick_slab'); }
  },
});

// ---- the people and monsters of these places ------------------------------------------------------------------------
{
  const D = MODEL_DEFS;
  D.warlock = bipedRig({
    head: [8, 9, 8], body: [8, 12, 5], arm: [3.5, 12, 3.5], leg: [4, 12, 4],
    tex: { head: { all: 'warlock_skin', front: 'warlock_face' }, body: 'warlock_robe', arm: 'warlock_robe', fore: 'warlock_skin', leg: 'warlock_robe' },
    extras: [['hood', 'head', [0, 0, 0.5], [-5, -1, -4.6, 5, 10.5, 4.6], { all: 'warlock_hood', front: false }, { noCull: true }],
      ['skirt', 'body', [0, 0, 0], [-4.6, -11, -3, 4.6, 0.5, 3], 'warlock_robe', { noCull: true }],
      ['sash', 'body', [0, 3, -2.7], [-4.2, -1, -0.2, 4.2, 1, 0.2], 'warlock_trim', { noCull: true }],
      ['eyes', 'head', [0, 0, 0], [-3, 3.5, -4.12, 3, 4.5, -4.05], 'warlock_eyes', { glow: true }]],
  });
  D.hollow_archmage = Object.assign({}, D.warlock, { scale: 1.25 });
  D.minotaur = bipedRig({
    head: [10, 9, 9], body: [14, 14, 8], arm: [5, 15, 5], leg: [6, 14, 6], armX: 9.5, legX: 3.5, heavy: true,
    tex: { head: { all: 'mino_hide', front: 'mino_face' }, body: { all: 'mino_hide', front: 'mino_chest' }, arm: 'mino_hide', fore: 'mino_hide', leg: 'mino_fur', shin: 'mino_hoof' },
    extras: [['snout', 'head', [0, 2, -4.5], [-3, -1, -3, 3, 3, 0], { all: 'mino_hide', front: 'mino_nose' }],
      ['hornL', 'head', [-5, 7, -1], [-6, -1, -1, 0, 1, 1], 'mino_horn', { rest: [0, 0, 0.35] }], ['hornR', 'head', [5, 7, -1], [0, -1, -1, 6, 1, 1], 'mino_horn', { rest: [0, 0, -0.35] }],
      ['hornLt', 'hornL', [-6, 0, 0], [-1, 0, -1, 1, 4, 1], 'mino_horn'], ['hornRt', 'hornR', [6, 0, 0], [-1, 0, -1, 1, 4, 1], 'mino_horn'],
      ['belt', 'body', [0, 0, 0], [-7.3, -1, -4.3, 7.3, 2, 4.3], 'mino_belt'], ['kilt', 'body', [0, 0, 0], [-7.2, -6, -4.2, 7.2, 0, 4.2], 'mino_belt', { noCull: true }],
      ['eyes', 'head', [0, 0, 0], [-4, 5, -4.62, 4, 6, -4.55], 'mino_eyes', { glow: true }]],
  });
  D.minotaur.scale = 1.4;
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB, tone = (p, c, k = 0.12) => shade(H(c), 1 + (p.rand() - 0.5) * k);
    const robe = (c1, c2) => (p) => { p.noise(H(c1), 0.1); for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) if (p.rand() < 0.3) p.set(x, y, shade(H(c1), 0.85)); for (let x = 0; x < 16; x++) p.set(x, 15, H(c2)); };
    addTile('warlock_robe', robe('#4a2a6a', '#c8a040'));
    addTile('warlock_hood', robe('#3a1e56', '#2a1240'));
    addTile('warlock_trim', p => { p.noise(H('#c8a040'), 0.1); });
    addTile('warlock_skin', p => { p.noise(H('#8a8a9a'), 0.08); });
    addTile('warlock_face', p => { p.noise(H('#7a7a8a'), 0.08); for (let x = 3; x < 13; x++) for (let y = 0; y < 5; y++) p.set(x, y, H('#2a1a3a')); for (let x = 5; x < 11; x++) p.set(x, 12, H('#3a2a3a')); });
    addTile('warlock_eyes', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, (x >= 2 && x <= 5) || (x >= 10 && x <= 13) ? H('#d070ff') : [0, 0, 0], (x >= 2 && x <= 5) || (x >= 10 && x <= 13) ? 255 : 0); });
    addTile('mino_hide', p => { p.noise(H('#5a3a24'), 0.16); p.speck(H('#3a2414'), 0.15); });
    addTile('mino_fur', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, (x + y * 3) % 5 === 0 ? '#2a1a0e' : '#4a2e1a', 0.2)); });
    addTile('mino_hoof', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y > 11 ? tone(p, '#1a1410') : tone(p, '#4a2e1a', 0.2)); });
    addTile('mino_face', p => { p.noise(H('#5a3a24'), 0.12); for (const x of [3, 4, 11, 12]) p.set(x, 6, H('#1a0a06')); for (let x = 2; x < 14; x++) p.set(x, 4, H('#3a2414')); });
    addTile('mino_nose', p => { p.noise(H('#6a4a3a'), 0.1); p.set(5, 9, H('#1a0a06')); p.set(10, 9, H('#1a0a06')); for (let x = 6; x < 10; x++) p.set(x, 13, H('#c8b04a')); p.set(6, 12, H('#c8b04a')); p.set(9, 12, H('#c8b04a')); });
    addTile('mino_chest', p => { p.noise(H('#5a3a24'), 0.14); for (let y = 2; y < 8; y++) { p.set(7, y, H('#3a2414')); p.set(8, y, H('#3a2414')); } });
    addTile('mino_horn', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#e8dcc0'), 0.75 + (y / 16) * 0.35)); });
    addTile('mino_belt', p => { p.noise(H('#3a2414'), 0.1); for (let x = 0; x < 16; x += 5) for (let y = 5; y < 10; y++) p.set(x, y, H('#a88a3a')); });
    addTile('mino_eyes', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const e = (x >= 1 && x <= 3) || (x >= 12 && x <= 14); p.set(x, y, e ? H('#ff3a1a') : [0, 0, 0], e ? 255 : 0); } });
    addItem('lore_book', p => { for (let y = 2; y < 14; y++) for (let x = 3; x < 13; x++) p.set(x, y, x === 3 ? H('#3a2414') : shade(H('#6a3a1a'), 0.9 + p.rand() * 0.15)); for (let y = 3; y < 13; y++) { p.set(12, y, H('#e8dcc0')); } for (const [x, y] of [[6, 5], [7, 5], [8, 5], [9, 5], [6, 9], [9, 9], [7, 7], [8, 7]]) p.set(x, y, H('#d8b048')); p.set(4, 3, H('#d8b048')); p.set(4, 12, H('#d8b048')); });
    addItem('minotaur_horn', p => { for (let i = 0; i < 11; i++) { const x = 3 + i, y = 12 - Math.round(i * 0.8 - (i * i) * 0.03); for (let w = 0; w < (i < 8 ? 2 : 1); w++) p.set(x, y + w, shade(H('#e8dcc0'), 0.7 + i * 0.03)); } });
  };
  Object.assign(MOB_TYPES, {
    warlock: { model: 'warlock', label: 'a warlock', hp: 26, w: 0.3, h: 1.9, speed: 2.6, hostile: true, special: true, damage: 3, xp: 14, held: 'apprentice_staff', voice: 'witch', drops: [['lapis_lazuli', 1, 4, 0.6], ['book', 0, 1, 0.4], ['emerald', 0, 2, 0.4], ['tome_light', 1, 1, 0.05]] },
    hollow_archmage: { model: 'hollow_archmage', label: 'the Hollow Archmage', hp: 160, w: 0.4, h: 2.4, speed: 2.4, hostile: true, special: true, boss: true, mini: true, damage: 5, xp: 160, knockResist: 0.7, held: 'sapphire_staff', voice: 'witch', tint: [0.6, 0.3, 1, 0.12], drops: [['emerald', 6, 12, 1], ['sapphire', 1, 3, 0.8], ['heart_crystal', 1, 1, 0.4], ['tome_blink', 1, 1, 0.3], ['tome_lightning', 1, 1, 0.2], ['mithril_staff', 1, 1, 0.12]] },
    minotaur: { model: 'minotaur', label: 'the Minotaur', hp: 220, w: 0.6, h: 3.2, speed: 3.2, hostile: true, special: true, boss: true, mini: true, damage: 9, xp: 220, knockResist: 0.85, held: 'iron_axe', voice: 'ogre', drops: [['minotaur_horn', 1, 2, 1], ['emerald', 8, 16, 1], ['gold_ingot', 3, 8, 1], ['heart_crystal', 1, 1, 0.6], ['steel_ingot', 2, 5, 0.6]] },
  });
}
defItem('minotaur_horn', { name: 'Minotaur Horn', rarity: 'rare', desc: 'A trophy from the heart of the Labyrinth.' });
// hex bolts: a warlock's fire and frost
{
  const baseUpd = Projectile.prototype.update, baseGlow = Projectile.prototype.glow, baseSnap = Projectile.prototype.snap;
  Projectile.prototype.update = function (dt) {
    if (this.kind !== 'hexfire' && this.kind !== 'hexfrost') return baseUpd.call(this, dt);
    const g = this.game, fx = this.kind === 'hexfire' ? 'mana_fire' : 'mana_frost';
    if (this.ghost) { this.ghostStep(dt); spellSpark(g, this.x, this.y, this.z, fx, { life: 0.3, size: 0.1 }); return; }
    this.age += dt;
    if (this.age > 4) { this.remove = true; return; }
    for (let s = 0; s < 3; s++) {
      this.x += this.vx * dt / 3; this.y += this.vy * dt / 3; this.z += this.vz * dt / 3;
      for (const p of g.pawns()) if (!p.dead && Math.abs(p.x - this.x) < 0.5 && Math.abs(p.z - this.z) < 0.5 && this.y > p.y - 0.2 && this.y < p.y + 1.9) {
        p.hurt(this.dmg || 4, { type: 'magic', attacker: this.owner, element: this.kind === 'hexfire' ? 'fire' : 'frost', knock: 2 });
        const P = p.player; if (P) { if (this.kind === 'hexfire' && p.ignite) p.ignite(2); else P.slow = Math.max(P.slow || 0, 3); }
        this.pop(fx); return;
      }
      if (T_SOLID[g.world.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))]) { this.pop(fx); return; }
    }
    spellFx(g, this.x, this.y, this.z, fx, 2, 0.25, { life: 0.3, size: 0.1, spread: 0.1 });
    spellSpark(g, this.x, this.y, this.z, 'mana_arcane', { life: 0.35, size: 0.05 });
  };
  Projectile.prototype.pop = function (fx) { this.remove = true; spellFx(this.game, this.x, this.y, this.z, fx, 24, 2.2, { life: 0.5, size: 0.09 }); this.game.sfx.playAt('spell_hit', this.x, this.y, this.z); };
  Projectile.prototype.glow = function (out) { if (this.kind === 'hexfire' || this.kind === 'hexfrost') { out.push({ x: this.x, y: this.y, z: this.z, size: 0.3, uv: tileUV(ATLAS.tile[this.kind === 'hexfire' ? 'mana_fire' : 'mana_frost'] ?? ATLAS.tile.white), light: 0xFF }); return; } return baseGlow.call(this, out); };
  Projectile.prototype.snap = function () { const s = baseSnap.call(this); if (this.kind) s.kd = this.kind; return s; };
}
function hexCast(e, p, kind, spread = 0) {
  const g = e.game, s = MODELS[e.T.model] && MODELS[e.T.model].def.scale || 1;
  const sx = e.x - Math.sin(e.yaw) * 0.5, sy = e.y + 1.5 * s, sz = e.z - Math.cos(e.yaw) * 0.5;
  let dx = p.x - sx, dy = p.y + 1.2 - sy, dz = p.z - sz; const l = Math.hypot(dx, dy, dz) || 1;
  const a = Math.atan2(dz, dx) + spread; const hl = Math.hypot(dx, dz);
  dx = Math.cos(a) * hl; dz = Math.sin(a) * hl;
  const b = g.addEntity(new Projectile(g, sx, sy, sz, dx / l * 15, dy / l * 15, dz / l * 15, kind, e));
  b.dmg = e.T.boss ? 6 : 4; e.swingT = 0.3;
  g.sfx.playAt(kind === 'hexfire' ? 'spell_fire' : 'spell_frost', sx, sy, sz);
  for (let i = 0; i < 10; i++) spellSpark(g, sx, sy, sz, kind === 'hexfire' ? 'mana_fire' : 'mana_frost', { vx: (Math.random() - 0.5) * 2, vy: Math.random() * 2, vz: (Math.random() - 0.5) * 2, life: 0.5, size: 0.06 });
}
function hexBlink(e, p) {
  const g = e.game, w = g.world;
  for (let t = 0; t < 12; t++) {
    const a = Math.random() * TAU, r = 5 + Math.random() * 4, x = Math.floor(p.x + Math.cos(a) * r), z = Math.floor(p.z + Math.sin(a) * r);
    for (let y = Math.floor(e.y) + 2; y >= Math.floor(e.y) - 2; y--) {
      if (T_SOLID[w.getBlock(x, y - 1, z)] && !T_SOLID[w.getBlock(x, y, z)] && !T_SOLID[w.getBlock(x, y + 1, z)] && !T_SOLID[w.getBlock(x, y + 2, z)]) {
        spellFx(g, e.x, e.y + 1, e.z, 'mana_arcane', 30, 2, { life: 0.5 });
        e.x = x + 0.5; e.y = y; e.z = z + 0.5; e.vx = e.vz = 0;
        spellFx(g, e.x, e.y + 1, e.z, 'mana_arcane', 30, 2, { life: 0.5 }); g.sfx.playAt('spell_blink', e.x, e.y, e.z);
        return true;
      }
    }
  }
  return false;
}
MONSTER_AI.warlock = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, T = this.T, boss = !!T.boss;
  if (Math.random() < dt * (boss ? 8 : 3)) spellSpark(g, this.x + (Math.random() - 0.5) * 0.6, this.y + Math.random() * this.h, this.z + (Math.random() - 0.5) * 0.6, 'mana_arcane', { vy: 0.6, life: 0.6, size: 0.05 });
  const s = this.senses(p, dist, dyp, dt, boss ? 28 : 22);
  this.voiceTick(dt, dist);
  if (!s.hunting) { this.wander(dt); return this.wanderMove(); }
  this.castT = (this.castT ?? 1.5) - dt; this.blinkT = (this.blinkT ?? 4) - dt;
  // the master calls his apprentices as he weakens
  if (boss) {
    const frac = this.health / this.maxHealth; this.calls = this.calls || 0;
    if ((frac < 0.66 && this.calls < 1) || (frac < 0.33 && this.calls < 2)) {
      this.calls++;
      for (let i = 0; i < 2; i++) { const a = Math.random() * TAU, m = g.addEntity(new Mob(g, 'warlock', this.x + Math.cos(a) * 2, this.y + 0.2, this.z + Math.sin(a) * 2)); m.huntT = 30; spellFx(g, m.x, m.y + 1, m.z, 'mana_arcane', 30, 1.5); }
      for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 30) l.toast('The Hollow Archmage calls his apprentices!', 'warn');
    }
  }
  if (this.castT <= 0 && s.sees && dist < 24) {
    this.castT = boss ? 1.3 + Math.random() * 0.6 : 2 + Math.random() * 1.2;
    const kind = Math.random() < 0.55 ? 'hexfire' : 'hexfrost';
    if (boss && Math.random() < 0.45) { hexCast(this, p, kind, -0.25); hexCast(this, p, kind, 0); hexCast(this, p, kind, 0.25); } else hexCast(this, p, kind);
  }
  // too close: step away through space
  if (dist < 3.5 && this.blinkT <= 0) { this.blinkT = boss ? 3.5 : 6; if (hexBlink(this, p)) return { want: 0, dir: toPlayer }; }
  if (this.hurtTime > 0.3 && this.blinkT <= 0 && Math.random() < 0.3) { this.blinkT = boss ? 3 : 6; hexBlink(this, p); }
  // keep its distance
  if (dist < 7) return { want: T.speed, dir: toPlayer + Math.PI + Math.sin(this.age) * 0.5 };
  if (dist > 12) return this.chase(p, dist, toPlayer, dt, 0.9);
  return { want: T.speed * 0.4, dir: toPlayer + Math.PI / 2 * (Math.sin(this.age * 0.7) > 0 ? 1 : -1) };
};
MONSTER_AI.hollow_archmage = MONSTER_AI.warlock;
MONSTER_AI.minotaur = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, T = this.T;
  if (!p) return { want: 0, dir: this.yaw };
  this.chargeCd = (this.chargeCd ?? 3) - dt;
  if (!this.roared) { this.roared = true; g.sfx.playAt('dragon_roar', this.x, this.y + 2, this.z, 50); g.shake && g.shake(0.4, this); }
  // stunned after hitting a wall at full charge
  if (this.stunT > 0) {
    this.stunT -= dt; this.lockMove = true; this.vx *= 0.8; this.vz *= 0.8;
    if (Math.random() < dt * 8) g.burst(this.x, this.y + this.h, this.z, 'white', 2, 0.4);
    if (this.stunT <= 0) this.lockMove = false;
    return { want: 0, dir: this.yaw };
  }
  if (this.chargeT > 0) {
    this.chargeT -= dt; this.lockMove = true;
    const a = this.chargeYaw; this.vx = -Math.sin(a) * 13; this.vz = -Math.cos(a) * 13; this.yaw = a;
    if (Math.random() < dt * 20) g.burst(this.x, this.y + 0.2, this.z, 'smoke', 2, 0.6);
    for (const q of g.pawns()) if (!q.dead && !this.chargeHit && Math.abs(q.x - this.x) < this.w + 0.8 && Math.abs(q.z - this.z) < this.w + 0.8 && Math.abs(q.y - this.y) < 2.5) { this.chargeHit = true; q.hurt(T.damage + 3, { type: 'mob', attacker: this, knock: 14 }); g.sfx.playAt('dragon_bite', this.x, this.y + 1, this.z); }
    if (this.hitWall && this.chargeT < 0.95) { this.chargeT = 0; this.lockMove = false; this.stunT = 2.2; g.shake && g.shake(0.4, this); g.sfx.playAt('thud', this.x, this.y, this.z); for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 24) l.toast('The Minotaur crashes into the wall — he\'s stunned!', 'good'); }
    if (this.chargeT <= 0) this.lockMove = false;
    return { want: 0, dir: a };
  }
  if (this.windT > 0) { this.windT -= dt; this.lockMove = true; this.vx *= 0.7; this.vz *= 0.7; if (this.windT <= 0) { this.chargeT = 1.3; this.chargeYaw = toPlayer; this.chargeHit = false; } return { want: 0, dir: toPlayer }; }
  // lower the horns and charge when you're out of reach
  if (dist > 5 && dist < 18 && this.chargeCd <= 0 && Math.abs(dyp) < 3) { this.chargeCd = 5 + Math.random() * 2; this.windT = 0.7; g.sfx.playAt('ogre', this.x, this.y + 2, this.z, 40); return { want: 0, dir: toPlayer }; }
  if (dist < 1.8 + this.w && Math.abs(dyp) < 2.5 && this.attackCd <= 0) { this.attackCd = 1.3; this.swingT = 0.35; p.hurt(T.damage, { type: 'mob', attacker: this, knock: 7 }); }
  return this.chase(p, dist, toPlayer, dt, 1);
};

// ---- the world's old books -----------------------------------------------------------------------------------------
const LORE = {
  first_fire: ['The First Fire', 'Before the sky had islands, the world burned from beneath. The old miners say the Ember Depths are what is left of that fire: a sea of lava under a roof of red stone, and in its rock, cinderite, the metal that will not melt.\n\nThey say too that the floor of our world is only a crust over that fire. Strike it with a pick of mithril and it gives way, and down you go.'],
  sky_islands: ['Of Islands in the Sky', 'Above the clouds the land floats in pieces, and the winds there are kind. Step off the edge and they will carry you down through the cloud to the world below, slowly, so that you land on your feet.\n\nGoing up is harder. Build high enough, or fly, and the same winds catch you at the top of the sky and set you on the nearest island. The sheep there have wings. Do not ask me how.'],
  watcher: ['A Mage\'s Warning', 'I have seen him three times now, at the edge of the trees, always at the edge. He does not walk. He is simply there, and then not.\n\nThe elders say that where the first village is found, a door opens, a rift into a place that is his. Four keys of time close it, and the keepers of the deep places hold them. I do not know who wrote that first. I know that the torches I find in the tunnels are not mine.'],
  six_wyrms: ['The Seven Wyrms', 'Each wild place has its dragon. The green one sleeps in the deep forest, the gold one in the sand, the white on the cold mountains, the brown in the bog, the red in the Depths, the blue on the high islands, and the sea-green on the floor of the open sea.\n\nTheir eggs are cold until they are warmed, by fire for most, by the sea for the last. Raise one from the shell and it will carry you anywhere, even into the sky.'],
  labyrinth: ['Labyrinth Journal', 'Day 3. The stair went down and down, and then the walls began. They all look the same. I keep my right hand on the wall as my father taught me, and I will come out again, he said, wherever I go in.\n\nDay 4. There is something in the middle. I heard it breathe. It has horns. It ran at me and struck the wall where I had been standing, and the whole maze shook, and it stood there dazed. I did not wait to see it wake.'],
  schools: ['On the Schools of Magic', 'Destruction is the first school anyone learns, and the least. Fire and frost come easily to the angry.\n\nRestoration is harder, for mending wants patience. Alteration changes what is: a light that follows, the air made to hold you, skin made stone. Conjuration calls what is not there, and it is the most dangerous, for what you call may not wish to leave.\n\nRead the tomes slowly. A tome read too early burns the mind and teaches nothing.'],
  drowned_temple: ['The Drowned Temple', 'The fishermen of the coast speak of halls under the deep water, built of a green stone that glows, older than any kingdom. At their heart, they say, lies a block of gold the size of a man, and the drowned walk the halls to guard it.\n\nTake a sponge if you go, the old women say, and do not let your breath run out on the stair.'],
  miner: ['A Miner\'s Last Entry', 'The new seam is good. Iron and gold and redstone in the walls, and the timbers hold. Jory says he hears skittering at night past the fourth crossing.\n\nThe webs are thicker every morning. There is a cage down there, iron, old, and spiders come out of it as though it breathes them. We have stopped going past the fourth crossing. I am leaving the chest where it is.'],
  desert: ['The Sands Keep Secrets', 'Under the blue stone at the heart of the desert temples lies the treasure of the old kings, four chests of it. Many have gone down for it. Few came up.\n\nIf you would be one of the few: do not drop down the shaft. Dig the stairs beside it. And whatever you do, do not step on the stone plate in the middle of the floor below.'],
  villages: ['On the Villages', 'The folk of the villages keep their own hours: to work at dawn, to the square in the afternoon, home to bed at night. They trade for emeralds and remember who has helped them.\n\nIf you strike one by mistake, say you are sorry. The guards will listen once. They will not listen twice.'],
  keepers: ['The Keepers Below', 'Under the land lie the old crypts, nests and hollows, and in the deepest room of each a keeper waits: the Grave Warden, the Rot King, the Broodmother, the Hex Matron.\n\nEach calls its servants when it weakens. Each, when it falls, leaves behind a fragment of something it should never have held: a piece of time itself.'],
  sailor: ['A Sailor\'s Log', 'Storm three days. Lost the mainmast. The captain says we are near the coast; I say we are near the bottom.\n\nIf anyone finds this: the stores are in the bow, under the deck. The captain keeps the pay chest in his cabin at the stern, and he keeps it locked, but the sea has a key for everything.'],
  archmage: ['The Hollow Archmage', 'He was the greatest of us. He built the tower with his own hands and filled it with books, and his apprentices came from every village to learn.\n\nThen he found the rift. He studied it for a year. He came back from it hollow: the same robes, the same voice, nothing behind the eyes. His apprentices stayed, and serve him still. He waits at the top of the tower, among his crystals. Do not go up alone.'],
  crust: ['Of the Stacked Worlds', 'The world is built in floors, like a house. The Skylands are the attic, the Ember Depths the cellar, and we live in between.\n\nThe floors are joined. A fall from the attic ends in the house; a hole through the floor of the house ends in the cellar. Only the stairs between are hidden: in cloud above, in fire below.\n\nAnd the cellar has a floor of its own. Under the last of the fire there is a crust that hums, and under that, nothing at all: a black sky, and far below it, pale islands.'],
  end: ['The End of All Roads', 'There is a last place, beyond all the others, where the land is pale and the sky is black and the tall ones walk who will not be looked at.\n\nThe way there is a door of twelve eyes, deep in a stronghold under the land. Find the eyes. They will show you the way.\n\nOr go down. Always down, past the fire, until there is no more down.'],
  rhyme: ['A Children\'s Rhyme', 'Torches two by the old pine tree,\nwho put them there? Not you, not me.\nDoors that open, signs that speak,\nhe watches us from week to week.\n\nDon\'t look long and don\'t look near,\nand if he stares, don\'t show your fear.\nFour keys of time to close the door,\nand then he won\'t come any more.'],
};
// (Shadowbloom) the books about the old watcher story are kept (old saves hold them) but no longer turn up as loot
const LORE_RETIRED = new Set(['watcher', 'keepers', 'archmage', 'rhyme']);
const LORE_KEYS = Object.keys(LORE).filter(k => !LORE_RETIRED.has(k));
for (const [k, [title]] of Object.entries(LORE)) defItem('lore_' + k, { name: 'Old Book: ' + title, maxStack: 1, icon: 'lore_book', lore: k, rarity: 'rare', desc: 'Use it to read it.' });
class BookUI {
  constructor(lp, key, opts = {}) {
    this.lp = lp; this.g = lp.g; this.key = key; this.page = 0; this.opts = opts;
    const [title, text] = LORE[key] || ['A blank book', '…'];
    // pages of a comfortable length
    const paras = text.split('\n\n'), pages = [];
    let cur = '';
    for (const p of paras) { if ((cur + p).length > 520 && cur) { pages.push(cur); cur = ''; } cur += (cur ? '\n\n' : '') + p; }
    if (cur) pages.push(cur);
    this.title = title; this.pages = pages;
    const el = this.el = document.createElement('div');
    el.className = 'book-ui';
    el.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); if (ev.target === el) this.close(); });
    this.onKey = (ev) => {
      if (ev.code === 'Escape' || ev.code === 'KeyE') { ev.preventDefault(); ev.stopPropagation(); this.close(); }
      else if (ev.code === 'ArrowRight' || ev.code === 'KeyD') { ev.preventDefault(); this.turn(1); }
      else if (ev.code === 'ArrowLeft' || ev.code === 'KeyA') { ev.preventDefault(); this.turn(-1); }
    };
    window.addEventListener('keydown', this.onKey, true);
    lp.el.appendChild(el);
    this.draw();
    this.g.sfx.play('map_paper');
    // the books you've read are remembered
    const st = lp.player.stats || (lp.player.stats = {}); st.lore = st.lore || {};
    if (!st.lore[key]) { st.lore[key] = 1; const n = Object.keys(st.lore).length; lp.toast(`A new page of lore (${n} of ${LORE_KEYS.length} found)`, 'good'); if (typeof skillGain === 'function') skillGain(lp, 'magic', 30); }
  }
  turn(d) { const n = this.page + d; if (n < 0 || n >= this.pages.length) return; this.page = n; this.draw(); this.g.sfx.play('map_paper'); }
  draw() {
    const n = this.pages.length;
    this.el.innerHTML = `<div class="bk-page"><div class="bk-title">${esc(this.title)}</div><div class="bk-text">${esc(this.pages[this.page]).replace(/\n/g, '<br>')}</div>
      <div class="bk-foot"><button class="btn tiny" data-p="-1"${this.page ? '' : ' disabled'}>‹</button><span>${this.page + 1} / ${n}</span><button class="btn tiny" data-p="1"${this.page < n - 1 ? '' : ' disabled'}>›</button>${this.opts.take ? '<button class="btn tiny" data-take="1">Take the book</button>' : ''}</div></div>`;
    this.el.querySelectorAll('[data-p]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); this.turn(+b.dataset.p); });
    const t = this.el.querySelector('[data-take]'); if (t) t.onclick = (ev) => { ev.stopPropagation(); this.opts.take(); this.close(); };
  }
  frame(dt, inp) {
    if (inp.padB || inp.padStart || inp.inventory) { this.close(); return; }
    if (inp.navX) this.turn(inp.navX > 0 ? 1 : -1);
    if (inp.padA && this.opts.take) { this.opts.take(); this.close(); }
  }
  close() {
    const lp = this.lp, g = this.g;
    window.removeEventListener('keydown', this.onKey, true);
    this.el.remove();
    if (lp.npcUI === this) lp.npcUI = null;
    if (lp.mode === 'npc') lp.mode = 'play';
    if (lp.useKb && !g.input.touchMode && g.state === 'playing') g.input.requestLock();
  }
}
{
  // reading a book in your hand, or on a lectern
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const p = this.player, h = p.inv.held, d = h && itemDef(h.id), g = this.g;
    if (!fromOff && !repeat && d && d.lore) {
      const hit = this.target, b = hit && BLOCKS[hit.id];
      if (b && b.lectern && !g.world.getEntity(hit.x, hit.y, hit.z)) {
        g.world.setEntity(hit.x, hit.y, hit.z, { type: 'lectern', book: true, lore: d.lore }); p.inv.held = null; g.entityChanged(hit.x, hit.y, hit.z); this.swingArm(); return;
      }
      this.swingArm(); this.openNpcUI(() => new BookUI(this, d.lore)); return;
    }
    if (!fromOff && !repeat && this.target && BLOCKS[this.target.id] && BLOCKS[this.target.id].lectern) {
      const t = this.target, e = g.world.getEntity(t.x, t.y, t.z);
      if (e && e.lore && LORE[e.lore]) {
        const take = () => { this.give(mkStack('lore_' + e.lore, 1)); g.world.setEntity(t.x, t.y, t.z, null); g.entityChanged(t.x, t.y, t.z); };
        if (p.sneaking && !h) { take(); this.swingArm(); return; }
        this.swingArm(); this.openNpcUI(() => new BookUI(this, e.lore, { take: h ? null : take })); return;
      }
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  const baseHas = itemHasUse;
  itemHasUse = function (d) { return !!(d && d.lore) || baseHas(d); };
}

// ---- in the world: the residents, the cages, the master of the place --------------------------------------------------
const STRUCT_T = { t: 0 };
function structRec(g, id) { const m = g.meta.structs || (g.meta.structs = {}); return m[id] || (m[id] = {}); }
function structTick(g, dt) {
  if (g.isGuest || !(g.dim === 0 || g.dim === 1 || g.dim === 2) || !g.world || !g.world.gen.structsNear) return;
  // (0.9.0.31) a timer for each place (in split screen each world runs its own frame; one shared timer let one take every tick)
  const tk = 't' + g.dim;
  if ((STRUCT_T[tk] = (STRUCT_T[tk] || 0) - dt) > 0) return;
  STRUCT_T[tk] = 1;
  const w = g.world, ps = g.pawns().filter(p => !p.dead), seen = new Set();
  for (const p of ps) for (const S of w.gen.structsNear(p.x, p.z, 28)) {
    if (seen.has(S.id)) continue; seen.add(S.id);
    const rec = structRec(g, S.id);
    // finding it
    const inside = (q, pad) => q.x >= S.x0 - pad && q.x <= S.x1 + pad && q.z >= S.z0 - pad && q.z <= S.z1 + pad;
    for (const l of g.locals) {
      const st = l.player.stats || (l.player.stats = {}); st.sseen = st.sseen || {};
      if (!st.sseen[S.id] && inside(l.player, 6) && Math.abs(l.player.y - (S.y ?? S.yb ?? l.player.y)) < 24) {
        st.sseen[S.id] = [Math.round((S.x0 + S.x1) / 2), Math.round((S.z0 + S.z1) / 2), S.name];
        l.toast(`You have found ${/^(the|an?) /i.test(S.name) ? S.name.replace(/^(The|An?) /, (m) => m.toLowerCase()) : 'a ' + S.name}!`, 'good');
        l.grantXP(25, l.player.x, l.player.y + 2, l.player.z);
      }
    }
    // (0.9.0.31) players joined over the network find places too (scout jobs, the journal, Exploring)
    if (g.net && typeof RemotePawn === 'function') for (const q of ps) {
      if (!(q instanceof RemotePawn) || !inside(q, 6) || Math.abs(q.y - (S.y ?? S.yb ?? q.y)) >= 24) continue;
      const fs = q._sfound || (q._sfound = new Set()); if (fs.has(S.id)) continue; fs.add(S.id);
      q.send({ t: 'adv', k: 'sfound', id: S.id, c: [Math.round((S.x0 + S.x1) / 2), Math.round((S.z0 + S.z1) / 2)], n: S.name });
    }
    const meshed = (x, z) => !!w.chunkAt(Math.floor(x) >> 4, Math.floor(z) >> 4);
    // those who live there turn up the first time someone comes close
    if (S.residents && S.residents.length && !rec.res && ps.some(q => inside(q, 12)) && S.residents.every(r => meshed(r.at[0], r.at[2]))) {
      rec.res = 1;
      for (const r of S.residents) if (MOB_TYPES[r.mob]) { const m = g.addEntity(new Mob(g, r.mob, r.at[0] + 0.5, r.at[1], r.at[2] + 0.5)); m.persistent = true; m.home = r.at; }
    }
    // the cages keep breathing out their monsters
    for (const s of S.spawners || []) {
      const [x, y, z] = s.at;
      if (w.getBlock(x, y, z) !== B.monster_spawner) continue;
      if (!ps.some(q => Math.hypot(q.x - x - 0.5, q.y - y, q.z - z - 0.5) < 14)) continue;
      s.cd = (s.cd || 0) - 1; if (s.cd > 0) continue;
      s.cd = 5 + Math.floor(Math.random() * 6);
      let n = 0; for (const e of g.entities) if (e instanceof Mob && e.alive && e.T.hostile && Math.hypot(e.x - x, e.z - z) < 9 && Math.abs(e.y - y) < 5) n++;
      if (n >= 4) continue;
      for (let t = 0; t < 6; t++) {
        const sx = x + Math.floor(Math.random() * 7) - 3, sz = z + Math.floor(Math.random() * 7) - 3;
        if (!T_SOLID[w.getBlock(sx, y - 1, sz)] || T_SOLID[w.getBlock(sx, y, sz)] || T_SOLID[w.getBlock(sx, y + 1, sz)]) continue;
        const m = g.addEntity(new Mob(g, s.mob, sx + 0.5, y, sz + 0.5)); m.huntT = 15; m.fromCage = true;
        g.burst(sx + 0.5, y + 0.5, sz + 0.5, 'smoke', 12, 0.6); g.burst(x + 0.5, y + 0.5, z + 0.5, 'flame', 6, 0.3);
        break;
      }
    }
    // its master wakes when someone walks in
    if (S.boss && !rec.cleared) {
      const [x0, y0, z0, x1, y1, z1] = S.boss.box, live = g.entities.some(e => e.structBoss === S.id && e.alive && !e.remove);
      if (rec.bossUp && !live && !ps.some(q => inside(q, 16))) rec.bossUp = 0;   // gone while nobody watched: back at his post next time
      if (!rec.bossUp && !live) {
        const intruder = ps.find(q => q.x >= x0 && q.x <= x1 + 1 && q.z >= z0 && q.z <= z1 + 1 && q.y >= y0 - 1 && q.y <= y1);
        if (intruder && MOB_TYPES[S.boss.type]) {
          const [bx, by, bz] = S.boss.at, m = g.addEntity(new Mob(g, S.boss.type, bx + 0.5, by, bz + 0.5));
          m.structBoss = S.id; m.huntT = 60; m.persistent = true; rec.bossUp = 1;
          spellFx(g, m.x, m.y + 1.5, m.z, 'mana_arcane', 40, 2.5, { life: 0.8 });
          for (const l of g.locals) if (Math.hypot(l.player.x - bx, l.player.z - bz) < 40) l.toast(`${MOB_TYPES[S.boss.type].label[0].toUpperCase() + MOB_TYPES[S.boss.type].label.slice(1)} rises to meet you!`, 'warn');
        }
      }
    }
  }
}
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { structTick(this, dt); } catch (e) { console.warn('structures', e); } return baseUpd.call(this, dt); };
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const r = baseDie.call(this, src);
    const g = this.game;
    if (this.structBoss && !g.isGuest) {
      const rec = structRec(g, this.structBoss); rec.cleared = 1;
      for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 60) { l.toast(`${this.T.label[0].toUpperCase() + this.T.label.slice(1)} is defeated! Its treasure is yours.`, 'epic'); l.grantXP(150, this.x, this.y + 2, this.z); }
    }
    return r;
  };
  // the places you've found go on your maps
  const baseMarkers = mapMarkers;
  mapMarkers = function (g, m, lp) {
    const out = baseMarkers(g, m, lp);
    if (m.dim !== 0) return out;
    const s = 1 << m.scale, seen = (lp.player.stats && lp.player.stats.sseen) || {};
    for (const [id, v] of Object.entries(seen)) {
      const u = (v[0] - m.x0) / s, w = (v[1] - m.z0) / s; if (u < 0 || w < 0 || u > MAP_N || w > MAP_N) continue;
      const cleared = g.meta.structs && g.meta.structs[id] && g.meta.structs[id].cleared;
      out.push({ cell: cleared ? 15 : 13, u, v: w, rot: 0, label: v[2] });
    }
    return out;
  };
}
// creatures that drop things the game doesn't have (an old slip in a table) drop nothing instead
for (const T of Object.values(MOB_TYPES)) if (T && T.drops) T.drops = T.drops.filter(([id]) => ITEMS[id]);
