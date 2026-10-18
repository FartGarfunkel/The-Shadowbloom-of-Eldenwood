// ---------------------------------------------------------------------------
// world/worldgen.js — deterministic terrain from a seed.
//
// GEN_VERSION is stored in each world's save. Chunks the player has changed
// are saved in full, so they never depend on this code. Untouched chunks are
// regenerated from the seed, so if terrain generation changes in a future
// update, keep the old path reachable by GEN_VERSION for old worlds (or accept
// that unexplored land in old worlds will use the new generator — the same
// trade-off Minecraft makes).
// ---------------------------------------------------------------------------

// 1 = the 0.4 generator (world/worldgen_v1.js), 2 = 0.5: the full block set, new trees and caves.
// 3 = 0.9: rivers, and the crust at the bottom of the world you can break through (game/worldupdate.js).
const GEN_VERSION = 6;   // 4: villages stand on level ground (game/villageflat.js); 5: RPG towns (game/towns.js); 6: (alpha 3) gates, roads between the campaign's places
function makeWorldGen(seed, dim, genVersion) { return (genVersion || 1) < 2 ? new WorldGenV1(seed, dim, genVersion || 1) : new WorldGen(seed, dim, genVersion); }
const BIOME = { OCEAN: 0, BEACH: 1, PLAINS: 2, FOREST: 3, DESERT: 4, TAIGA: 5, MOUNTAINS: 6 };
const BIOME_NAME = ['Ocean', 'Beach', 'Plains', 'Forest', 'Desert', 'Taiga', 'Mountains'];

class WorldGen {
  constructor(seed, dim = 0, genVersion = GEN_VERSION) {
    this.seed = seed | 0;
    this.dim = dim;
    this.genVersion = genVersion;
    const s = this.seed;
    this.nCont = new SimplexNoise(s ^ 0x1234);
    this.nHill = new SimplexNoise(s ^ 0x2345);
    this.nDetail = new SimplexNoise(s ^ 0x3456);
    this.nMount = new SimplexNoise(s ^ 0x4567);
    this.nRidge = new SimplexNoise(s ^ 0x5678);
    this.nTemp = new SimplexNoise(s ^ 0x6789);
    this.nHumid = new SimplexNoise(s ^ 0x789a);
    this.nCave1 = new SimplexNoise(s ^ 0x89ab);
    this.nCave2 = new SimplexNoise(s ^ 0x9abc);
    this.nCave3 = new SimplexNoise(s ^ 0xabcd);
    this.nFloor = new SimplexNoise(s ^ 0xbcde);
    this.colCache = new Map();
  }

  // Pure function of (x, z): terrain height + biome. Cached per chunk.
  column(x, z) {
    const cont = this.nCont.fbm2(x / 900, z / 900, 4);
    const land = smoothstep(-0.4, -0.1, cont);
    let h = SEA - 16 + land * 20;
    h += this.nHill.fbm2(x / 140, z / 140, 3) * (3 + 9 * land);
    h += this.nDetail.noise2(x / 28, z / 28) * 1.6 * land;
    const mRaw = this.nMount.fbm2(x / 520, z / 520, 2);
    const mMask = smoothstep(0.18, 0.55, mRaw) * land;
    if (mMask > 0) {
      const r = 1 - Math.abs(this.nRidge.fbm2(x / 230, z / 230, 3));
      h += mMask * (r * r * 58 + 6);
    }
    h = Math.floor(clamp(h, 4, 120));
    const temp = this.nTemp.fbm2(x / 800, z / 800, 2) - (h > 90 ? (h - 90) / 40 : 0);
    const humid = this.nHumid.fbm2(x / 650, z / 650, 2);
    let biome;
    if (h < SEA - 1) biome = BIOME.OCEAN;
    else if (h <= SEA + 1 && land < 0.98) biome = BIOME.BEACH;
    else if (mMask > 0.45 && h > SEA + 24) biome = BIOME.MOUNTAINS;
    else if (temp < -0.3) biome = BIOME.TAIGA;
    else if (temp > 0.32 && humid < 0.12) biome = BIOME.DESERT;
    else if (humid > 0.08) biome = BIOME.FOREST;
    else biome = BIOME.PLAINS;
    if (biome === BIOME.BEACH && temp > 0.32 && humid < 0.12) biome = BIOME.DESERT;
    return { h, biome, temp, humid };
  }

  biomeAt(x, z) { return this.column(Math.floor(x), Math.floor(z)).biome; }
  // Rough surface height without generating a chunk (title panorama, spawn search).
  surfaceEstimate(x, z) { return this.dim === 0 ? Math.max(SEA, this.column(Math.floor(x), Math.floor(z)).h) : 64; }
  // A dry, gentle spot that isn't the middle of an ocean or on a cliff.
  goodSpawn(x, z) {
    const c = this.column(x, z);
    if (c.biome === BIOME.OCEAN || c.biome === BIOME.BEACH || c.h <= SEA || c.h > SEA + 28) return false;
    for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) if (Math.abs(this.column(x + dx, z + dz).h - c.h) > 3) return false;
    return true;
  }

  // Per-column climate bytes used to tint grass, leaves and water.
  fillClimate(ch) {
    const cl = ch.climate || (ch.climate = new Uint8Array(512));
    if (this.dim !== 0) { const t = this.dim === 2 ? 160 : 128, h = this.dim === 2 ? 190 : 128; for (let i = 0; i < 256; i++) { cl[i * 2] = t; cl[i * 2 + 1] = h; } return; }
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const c = this.column(ch.cx * 16 + x, ch.cz * 16 + z);
      cl[(z * 16 + x) * 2] = clamp(Math.round(c.temp * 127 + 128), 0, 255);
      cl[(z * 16 + x) * 2 + 1] = clamp(Math.round(c.humid * 127 + 128), 0, 255);
    }
  }

  generate(ch) {
    this.fillClimate(ch);
    if (this.dim === 1) return this.generateDepths(ch);
    if (this.dim === 2) return this.generateSkylands(ch);
    if (this.dim === 3) return this.generatePocket(ch);
    return this.generateOverworld(ch);
  }

  // ---- Pocket dimension (dimension 3): big walled void rooms -----------------
  // Each player gets their own room, centred every 256 blocks along x
  // (room 0 at x=0, room 1 at x=256, ...). Walls are unbreakable and glow
  // softly; inside is empty space to build and store things in.
  generatePocket(ch) {
    const HALF = 24, FLOOR = 63, CEIL = 100;
    const bx = ch.cx * 16, bz = ch.cz * 16;
    const rx = Math.round((bx + 8) / 256) * 256;
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const wx = bx + x - rx, wz = bz + z;
      if (Math.abs(wx + 0.5) > HALF + 1 || Math.abs(wz + 0.5) > HALF + 1) continue;
      const wall = Math.abs(wx + 0.5) > HALF || Math.abs(wz + 0.5) > HALF;
      for (let y = FLOOR; y <= CEIL; y++) {
        if (wall || y === FLOOR || y === CEIL) ch.blocks[cidx(x, y, z)] = B.pocket_wall;
      }
    }
    ch.recomputeMaxY();
  }
  pocketCenter(slot) { return [slot * 256 + 0.5, 64, 0.5]; }

  // ---- Overworld ------------------------------------------------------------
  generateOverworld(ch) {
    const bx = ch.cx * CS, bz = ch.cz * CS;
    const cols = new Array(256);
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) cols[z * 16 + x] = this.column(bx + x, bz + z);

    const caves = this.caveField(bx, bz);
    const rnd = mulberry32(hash32(this.seed, ch.cx, ch.cz, 1));

    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const c = cols[z * 16 + x];
      const h = c.h, wx = bx + x, wz = bz + z;
      const fr = hashFloat(wx, wz, this.seed, 2);
      // surface materials
      let top = B.grass, filler = B.dirt, fillDepth = 3 + Math.floor(fr * 2), under = B.stone;
      switch (c.biome) {
        case BIOME.DESERT: top = B.sand; filler = B.sand; fillDepth = 4; under = B.sandstone; break;
        case BIOME.BEACH: top = B.sand; filler = B.sand; fillDepth = 3; break;
        case BIOME.TAIGA: top = B.snowy_grass; break;
        case BIOME.OCEAN: {
          const f = this.nFloor.noise2(wx / 24, wz / 24);
          top = f > 0.45 ? B.clay : f > 0.05 ? B.sand : B.gravel; filler = top === B.clay ? B.clay : B.sand; fillDepth = 2; break;
        }
        case BIOME.MOUNTAINS:
          top = h > 96 ? B.snow_block : h > 82 ? B.stone : B.grass; filler = h > 82 ? B.stone : B.dirt; break;
      }
      // swampy shores: mud underfoot
      if ((c.biome === BIOME.PLAINS || c.biome === BIOME.FOREST) && h <= SEA + 1 && c.humid > 0.38 && c.temp > -0.1) { top = B.mud; filler = B.mud; fillDepth = 2; }
      // old growth: podzol under the spruces and coarse dirt in dry places
      if (c.biome === BIOME.TAIGA && hashFloat(wx, wz, this.seed, 13) < 0.18) top = B.podzol;
      if (c.biome === BIOME.PLAINS && c.temp > 0.3 && c.humid < -0.1 && hashFloat(wx, wz, this.seed, 14) < 0.3) top = B.coarse_dirt;
      // the ground covers of Luanti: dry grass on the savanna, needle litter under conifers, leaf litter in jungles
      const fq = hashFloat(wx, wz, this.seed, 15);
      if (top === B.grass && c.biome === BIOME.PLAINS && c.temp > 0.28 && c.humid < 0.02 && fq < 0.65) top = B.dirt_with_dry_grass;
      if (top === B.snowy_grass && c.temp > -0.42 && fq < 0.22) top = B.dirt_with_coniferous_litter;
      if (top === B.grass && c.temp > 0.25 && c.humid > 0.3 && fq < 0.3) top = B.dirt_with_rainforest_litter;
      // the hottest deserts are red desert sand over desert stone; cold beaches are silver sand
      if (c.biome === BIOME.DESERT && c.temp > 0.55) { top = B.desert_sand; filler = B.desert_sand; under = B.desert_stone; }
      if (c.biome === BIOME.BEACH && c.temp < -0.2) { top = B.silver_sand; filler = B.silver_sand; }
      if (top === B.mud) under = B.peat;
      const underwater = h < SEA;
      for (let y = 0; y <= h; y++) {
        let id;
        if (y === 0 || (y < 4 && hashFloat(wx, y, wz, this.seed) < 0.5)) id = B.bedrock;
        else if (y === h) id = top;
        else if (y > h - fillDepth) id = filler;
        else if (y > h - fillDepth - 3 && under === B.sandstone) id = B.sandstone;
        else if (y > h - fillDepth - 6 && under === B.desert_stone) id = y > h - fillDepth - 2 ? B.desert_sandstone : B.desert_stone;
        else if (y > h - fillDepth - 2 && under === B.peat) id = B.peat;
        else id = y < 10 + Math.floor(fr * 4) ? B.slate : B.stone;
        // carve caves
        if (id !== B.bedrock && y < 120) {
          const allowTop = underwater || c.biome === BIOME.BEACH ? h - 6 : h;
          if (y <= allowTop && this.isCave(caves, x, y, z)) id = y < 11 ? B.lava : B.air;
        }
        ch.blocks[cidx(x, y, z)] = id;
      }
      // water
      for (let y = h + 1; y <= SEA; y++) {
        const cold = c.temp < -0.38;
        ch.blocks[cidx(x, y, z)] = (y === SEA && cold) ? B.ice : B.water;
      }
    }

    this.placeOres(ch, rnd);
    this.placeTrees(ch);
    this.decorate(ch, cols);
    this.placeOddities(ch);
    ch.recomputeMaxY();
  }

  // ---- signs of the watcher --------------------------------------------------
  // Unnatural things the generator "shouldn't" make: perfectly straight 2x1
  // tunnels bored into hillsides and deep rock (sometimes with a guttering old
  // torch at the end), perfect sand pyramids standing in the ocean, and lone
  // old torches in caves. None of them are traps.
  odditiesFor(cx, cz) {
    const key = 'o' + cx + ',' + cz;
    let list = this.colCache.get(key);
    if (list) return list;
    list = [];
    const rnd = mulberry32(hash32(this.seed, cx, cz, 66));
    if (rnd() < 0.05) {
      const x = cx * 16 + Math.floor(rnd() * 16), z = cz * 16 + Math.floor(rnd() * 16);
      const c = this.column(x, z);
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], s0 = Math.floor(rnd() * 4);
      const len = 10 + Math.floor(rnd() * 22), torch = rnd() < 0.5;
      if (c.h > SEA + 1) for (let k = 0; k < 4; k++) {
        const d = dirs[(s0 + k) % 4];
        if (this.column(x + d[0] * 4, z + d[1] * 4).h >= c.h + 5) { list.push({ t: 'tunnel', x, y: c.h + 1, z, dx: d[0], dz: d[1], len, torch }); break; }
      }
    }
    if (rnd() < 0.025) {
      const x = cx * 16 + Math.floor(rnd() * 16), z = cz * 16 + Math.floor(rnd() * 16), y = 14 + Math.floor(rnd() * 28);
      const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rnd() * 4)];
      list.push({ t: 'tunnel', x, y, z, dx: d[0], dz: d[1], len: 20 + Math.floor(rnd() * 26), torch: rnd() < 0.35, deep: true });
    }
    if (rnd() < 0.014) {
      const x = cx * 16 + Math.floor(rnd() * 16), z = cz * 16 + Math.floor(rnd() * 16);
      const c = this.column(x, z);
      if (c.biome === BIOME.OCEAN && c.h <= SEA - 2) list.push({ t: 'pyramid', x, z, base: c.h, s: clamp(SEA - c.h + 2, 3, 7) });
    }
    if (this.colCache.size > 1200) this.colCache.clear();
    this.colCache.set(key, list);
    return list;
  }
  placeOddities(ch) {
    if (typeof RIFT_OFF !== 'undefined' && RIFT_OFF) return;   // (Shadowbloom) no signs of the watcher
    const bx = ch.cx * 16, bz = ch.cz * 16;
    const natural = (id) => id === B.stone || id === B.dirt || id === B.grass || id === B.gravel || id === B.sand || id === B.sandstone
      || id === B.snowy_grass || id === B.snow_block || id === B.clay || id === B.coal_ore || id === B.iron_ore || id === B.tall_grass;
    const inC = (x, z) => x >= bx && x < bx + 16 && z >= bz && z < bz + 16;
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
      for (const o of this.odditiesFor(ch.cx + dx, ch.cz + dz)) {
        if (o.t === 'tunnel') {
          for (let i = 0; i < o.len; i++) {
            const x = o.x + o.dx * i, z = o.z + o.dz * i;
            if (!inC(x, z)) continue;
            for (const y of [o.y, o.y + 1]) {
              if (y < 2 || y >= CH) continue;
              const k = cidx(x - bx, y, z - bz);
              if (natural(ch.blocks[k])) ch.blocks[k] = 0;
            }
            if (o.torch && i === o.len - 1) {
              const k = cidx(x - bx, o.y, z - bz);
              if (ch.blocks[k] === 0 && T_SOLID[ch.blocks[cidx(x - bx, o.y - 1, z - bz)]]) ch.blocks[k] = B.old_torch;
            }
          }
        } else if (o.t === 'pyramid') {
          for (let k = 0; k <= o.s; k++) {
            const r = o.s - k, y = o.base + 1 + k;
            if (y >= CH) break;
            for (let zz = o.z - r; zz <= o.z + r; zz++) for (let xx = o.x - r; xx <= o.x + r; xx++) {
              if (!inC(xx, zz)) continue;
              // fill down to the sea floor so the pyramid never floats
              for (let yy = y; yy > 1; yy--) {
                const i2 = cidx(xx - bx, yy, zz - bz), cur = ch.blocks[i2];
                if (yy < y && cur !== B.water && cur !== 0) break;
                ch.blocks[i2] = B.sand;
              }
            }
          }
        }
      }
    }
    // a lone old torch somewhere in this chunk's caves
    const r = mulberry32(hash32(this.seed, ch.cx, ch.cz, 68));
    if (r() < 0.06) {
      for (let tries = 0; tries < 24; tries++) {
        const x = Math.floor(r() * 16), z = Math.floor(r() * 16), y = 12 + Math.floor(r() * 40);
        if (ch.blocks[cidx(x, y, z)] === 0 && ch.blocks[cidx(x, y + 1, z)] === 0 && ch.blocks[cidx(x, y - 1, z)] === B.stone) { ch.blocks[cidx(x, y, z)] = B.old_torch; break; }
      }
    }
  }

  // Cave noise sampled on a coarse 4x4x4 grid and trilinearly interpolated.
  caveField(bx, bz) {
    const NX = 5, NY = 33, NZ = 5;
    const a = new Float32Array(NX * NY * NZ), b = new Float32Array(NX * NY * NZ), c = new Float32Array(NX * NY * NZ);
    for (let iz = 0; iz < NZ; iz++) for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++) {
      const x = bx + ix * 4, y = iy * 4, z = bz + iz * 4;
      const i = (iz * NY + iy) * NX + ix;
      a[i] = this.nCave1.noise3(x / 42, y / 22, z / 42);
      b[i] = this.nCave2.noise3(x / 42, y / 22, z / 42);
      c[i] = y < 56 ? this.nCave3.noise3(x / 64, y / 34, z / 64) : -1;
    }
    return { a, b, c, NX, NY };
  }
  isCave(f, x, y, z) {
    const fx = x / 4, fy = y / 4, fz = z / 4;
    const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
    const tx = fx - ix, ty = fy - iy, tz = fz - iz;
    const NX = f.NX, NY = f.NY;
    const s = (arr) => {
      const i000 = (iz * NY + iy) * NX + ix;
      const i100 = i000 + 1, i010 = i000 + NX, i110 = i010 + 1;
      const i001 = i000 + NY * NX, i101 = i001 + 1, i011 = i001 + NX, i111 = i011 + 1;
      const x00 = lerp(arr[i000], arr[i100], tx), x10 = lerp(arr[i010], arr[i110], tx);
      const x01 = lerp(arr[i001], arr[i101], tx), x11 = lerp(arr[i011], arr[i111], tx);
      return lerp(lerp(x00, x10, ty), lerp(x01, x11, ty), tz);
    };
    const depthFade = y > 70 ? 0.6 : 1;
    const w = 0.075 * depthFade;
    if (Math.abs(s(f.a)) < w && Math.abs(s(f.b)) < w * 1.4) return true;
    if (y < 52 && s(f.c) > 0.58) return true;
    return false;
  }

  placeOres(ch, rnd) {
    // [block, veins per chunk, vein length, min y, max y]
    const veins = [
      [B.coal_ore, 18, 8, 5, 100],
      [B.iron_ore, 12, 6, 5, 64],
      [B.copper_ore, 9, 7, 24, 80],
      [B.tin_ore, 5, 6, 20, 64],
      [B.gold_ore, 3, 6, 5, 32],
      [B.lapis_ore, 1.6, 5, 4, 30],
      [B.diamond_ore, 1.4, 5, 4, 16],
      [B.mese_ore, 0.5, 4, 3, 12],
      [B.redstone_ore, 2.5, 6, 3, 16],
      [B.gravel, 6, 10, 5, 70],
      [B.dirt, 6, 10, 5, 90],
    ];
    for (const [id, count, size, ymin, ymax] of veins) {
      let n = Math.floor(count) + (rnd() < count % 1 ? 1 : 0);
      for (let v = 0; v < n; v++) {
        let x = rnd() * 16, y = ymin + rnd() * (ymax - ymin), z = rnd() * 16;
        for (let k = 0; k < size; k++) {
          const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
          if (ix >= 0 && ix < 16 && iz >= 0 && iz < 16 && iy > 0 && iy < CH) {
            const i = cidx(ix, iy, iz);
            if (ch.blocks[i] === B.stone || (ch.blocks[i] === B.slate && id !== B.dirt && id !== B.gravel)) ch.blocks[i] = id;
          }
          x += rnd() * 2 - 1; y += rnd() * 2 - 1; z += rnd() * 2 - 1;
        }
      }
    }
    // big soft blobs of other rock: granite, diorite, andesite, tuff, marble, limestone, calcite
    const blobs = [[B.granite, 1.4, 0, 90], [B.diorite, 1.4, 0, 90], [B.andesite, 1.4, 0, 90], [B.tuff, 0.8, 0, 24], [B.marble, 0.35, 20, 100], [B.limestone, 0.5, 30, 90], [B.calcite, 0.2, 10, 60], [B.dripstone_block, 0.25, 6, 40]];
    for (const [id, count, ymin, ymax] of blobs) {
      const n = Math.floor(count) + (rnd() < count % 1 ? 1 : 0);
      for (let v = 0; v < n; v++) {
        const cx = rnd() * 16, cy = ymin + rnd() * (ymax - ymin), cz = rnd() * 16, r = 2.2 + rnd() * 2.6;
        for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let z = Math.max(0, Math.floor(cz - r)); z <= Math.min(15, cz + r); z++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(15, cx + r); x++) {
          if (y < 1 || y >= CH) continue;
          const d = ((x - cx) ** 2 + ((y - cy) * 1.3) ** 2 + (z - cz) ** 2) / (r * r);
          if (d > 1 - rnd() * 0.25) continue;
          const i = cidx(x, y, z);
          if (ch.blocks[i] === B.stone) ch.blocks[i] = id;
        }
      }
    }
    // emeralds only in the mountains, one block at a time
    const mid = this.column(ch.cx * 16 + 8, ch.cz * 16 + 8);
    if (mid.biome === BIOME.MOUNTAINS) for (let k = 0; k < 3; k++) {
      const x = Math.floor(rnd() * 16), y = 30 + Math.floor(rnd() * 50), z = Math.floor(rnd() * 16), i = cidx(x, y, z);
      if (ch.blocks[i] === B.stone) ch.blocks[i] = B.emerald_ore;
    }
  }

  // Trees from this chunk and its neighbours are evaluated so canopies that
  // straddle chunk borders come out identical on both sides.
  placeTrees(ch) {
    for (let ncz = ch.cz - 1; ncz <= ch.cz + 1; ncz++) for (let ncx = ch.cx - 1; ncx <= ch.cx + 1; ncx++) {
      for (const t of this.treesForChunk(ncx, ncz)) this.writeTree(ch, t);
    }
  }
  treesForChunk(cx, cz) {
    const key = cx + ',' + cz;
    let list = this.colCache.get(key);
    if (list) return list;
    list = [];
    const rnd = mulberry32(hash32(this.seed, cx, cz, 3));
    const mid = this.column(cx * 16 + 8, cz * 16 + 8);
    const jungle = mid.temp > 0.25 && mid.humid > 0.3, savanna = mid.biome === BIOME.PLAINS && mid.temp > 0.28 && mid.humid < 0.02;
    let density = { [BIOME.FOREST]: 7, [BIOME.PLAINS]: 0.6, [BIOME.TAIGA]: 4, [BIOME.MOUNTAINS]: 0.8 }[mid.biome] || 0;
    if (jungle) density = 9; if (savanna) density = 0.9;
    // now and then a whole grove stands with every leaf cut away
    const bare = (mid.biome === BIOME.FOREST || mid.biome === BIOME.PLAINS) && hashFloat(cx, cz, this.seed, 67) < 0.025;
    const n = Math.floor(density) + (rnd() < density % 1 ? 1 : 0) + (bare ? 3 : 0);
    for (let i = 0; i < n; i++) {
      const x = cx * 16 + Math.floor(rnd() * 16), z = cz * 16 + Math.floor(rnd() * 16);
      const c = this.column(x, z);
      const r = rnd(), r2 = rnd();
      if (c.h <= SEA || c.biome === BIOME.DESERT || c.biome === BIOME.BEACH || c.biome === BIOME.OCEAN) {
        // mangroves stand in warm shallows
        if (c.h >= SEA - 2 && c.h <= SEA && c.temp > 0.2 && c.humid > 0.25 && c.biome !== BIOME.DESERT && r < 0.5) list.push({ x, y: c.h + 1, z, type: 'mangrove', h: r2 });
        continue;
      }
      if (c.biome === BIOME.MOUNTAINS && c.h > 82) continue;
      let type = 'oak';
      if (c.biome === BIOME.TAIGA || (c.biome === BIOME.MOUNTAINS && r < 0.7)) type = c.biome === BIOME.MOUNTAINS && c.humid > 0.15 && c.h < 78 && r < 0.25 ? 'cherry' : r < 0.45 ? 'pine' : 'spruce';
      else if (jungle) type = r < 0.7 ? 'jungle' : 'oak';
      else if (savanna) type = 'acacia';
      else if (c.biome === BIOME.FOREST) type = r < 0.2 ? 'birch' : c.temp < 0 && r < 0.42 ? 'aspen' : c.humid > 0.25 && r < 0.55 ? 'dark_oak' : c.humid > 0.15 && r > 0.97 ? 'azalea' : 'oak';
      else if (c.biome === BIOME.PLAINS && c.temp < -0.05 && r < 0.4) type = 'aspen';
      const bees = (type === 'oak' || type === 'birch') && !bare && rnd() < (c.biome === BIOME.PLAINS ? 0.06 : 0.02);
      list.push({ x, y: c.h + 1, z, type, h: r2, bare, bees });
    }
    if (this.colCache.size > 400) this.colCache.clear();
    this.colCache.set(key, list);
    return list;
  }
  // Every block of a tree: [x, y, z, id, onlyIntoAir]. Shared by world
  // generation and saplings growing.
  treeParts(t) {
    const out = [], rnd = mulberry32(hash32(t.x, t.y, t.z, this.seed ^ 77));
    const put = (x, y, z, id, onlyAir = false, meta) => out.push([x, y, z, id, onlyAir, meta]);
    const leafBall = (cx, cy, cz, r, id, squash = 1) => {
      for (let dy = -Math.ceil(r * squash); dy <= Math.ceil(r * squash); dy++) for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const d = (dx * dx + dz * dz) / (r * r) + (dy * dy) / ((r * squash) ** 2 || 1);
        if (d <= 1 - rnd() * 0.18) put(cx + dx, cy + dy, cz + dz, id, true);
      }
    };
    const { x, y, z, type } = t;
    if (type === 'spruce') {
      const H = 6 + Math.floor(t.h * 4);
      for (let k = 0; k < H; k++) put(x, y + k, z, B.spruce_log);
      if (t.bare) return out;
      let r = 0;
      for (let yy = H; yy >= 2; yy--) {
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) + Math.abs(dz) > r + 1) continue;
          if (dx || dz || yy >= H) put(x + dx, y + yy, z + dz, B.spruce_leaves, true);
        }
        r = r >= 2 ? 1 : r + 1;
        if (yy === H) r = 1;
      }
      put(x, y + H, z, B.spruce_leaves, true); put(x, y + H + 1, z, B.spruce_leaves, true);
      return out;
    }
    if (type === 'jungle') {
      const H = 8 + Math.floor(t.h * 6);
      for (let k = 0; k < H; k++) put(x, y + k, z, B.jungle_log);
      if (t.bare) return out;
      leafBall(x, y + H, z, 3.2, B.jungle_leaves, 0.55);
      // a couple of side branches with leaf clumps, and vines down the trunk
      for (let b = 0; b < 2; b++) { const d = Math.floor(rnd() * 4), by = y + Math.floor(H * (0.5 + rnd() * 0.25)); put(x + DIRX[d], by, z + DIRZ[d], B.jungle_log); leafBall(x + DIRX[d] * 2, by + 1, z + DIRZ[d] * 2, 1.8, B.jungle_leaves, 0.6); }
      for (let d = 0; d < 4; d++) for (let k = 1; k < H - 2; k++) {
        const q = rnd();
        if (q < 0.35) put(x + DIRX[d], y + k, z + DIRZ[d], B.vine, true);
        else if (q > 0.93 && k > 2) put(x + DIRX[d], y + k, z + DIRZ[d], B.cocoa, true, (((d + 2) & 3) << 4) | Math.floor(rnd() * 3));
      }
      return out;
    }
    if (type === 'pine') {
      // Luanti pine: a tall bare trunk with thin rings of needles near the top
      const H = 9 + Math.floor(t.h * 5);
      for (let k = 0; k < H; k++) put(x, y + k, z, B.pine_log);
      if (t.bare) return out;
      for (let ly = H - 6; ly <= H; ly++) {
        const r = ly === H ? 0 : (H - ly) % 2 === 1 ? 2 : 1;
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) + Math.abs(dz) > r + (r > 1 ? 1 : 0)) continue;
          if (dx === 0 && dz === 0 && ly < H) continue;
          put(x + dx, y + ly, z + dz, B.pine_needles, true);
        }
      }
      put(x, y + H, z, B.pine_needles, true); put(x, y + H + 1, z, B.pine_needles, true);
      return out;
    }
    if (type === 'aspen') {
      // tall and slender with a small round crown
      const H = 7 + Math.floor(t.h * 4);
      for (let k = 0; k < H; k++) put(x, y + k, z, B.aspen_log);
      if (t.bare) return out;
      leafBall(x, y + H - 1, z, 2.1, B.aspen_leaves, 1.3);
      return out;
    }
    if (type === 'azalea') {
      // a little tree on rooted dirt with flowering leaves
      const H = 3 + Math.floor(t.h * 2);
      for (let k = 0; k < H; k++) put(x + (k === H - 1 && t.h > 0.5 ? 1 : 0), y + k, z, B.log);
      if (t.bare) return out;
      for (const [cx, cy, cz, r] of [[x, y + H, z, 2.2], [x + 1, y + H - 1, z + 1, 1.6]]) {
        for (let dy = -1; dy <= 1; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
          if (dx * dx + dz * dz + dy * dy * 2 > r * r) continue;
          put(cx + dx, cy + dy, cz + dz, rnd() < 0.3 ? B.flowering_azalea_leaves : B.azalea_leaves, true);
        }
      }
      return out;
    }
    if (type === 'acacia') {
      const H = 4 + Math.floor(t.h * 2), d = Math.floor(rnd() * 4);
      let tx = x, tz = z;
      for (let k = 0; k < H; k++) { if (k >= H - 2) { tx += DIRX[d]; tz += DIRZ[d]; } put(tx, y + k, tz, B.acacia_log); }
      if (t.bare) return out;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) + Math.abs(dz) <= 4 && !(Math.abs(dx) === 3 && Math.abs(dz) === 3)) put(tx + dx, y + H, tz + dz, B.acacia_leaves, true);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) put(tx + dx, y + H + 1, tz + dz, B.acacia_leaves, true);
      return out;
    }
    if (type === 'dark_oak') {
      const H = 6 + Math.floor(t.h * 3);
      for (let k = 0; k < H; k++) for (const [ax, az] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(x + ax, y + k, z + az, B.dark_oak_log);
      if (t.bare) return out;
      leafBall(x + 0.5, y + H - 1, z + 0.5, 3.6, B.dark_oak_leaves, 0.5);
      leafBall(x + 0.5, y + H + 0.5, z + 0.5, 2.4, B.dark_oak_leaves, 0.5);
      return out;
    }
    if (type === 'cherry') {
      const H = 4 + Math.floor(t.h * 2);
      for (let k = 0; k < H; k++) put(x, y + k, z, B.cherry_log);
      if (t.bare) return out;
      for (let b = 0; b < 2; b++) {
        const d = (Math.floor(rnd() * 4) + b * 2) & 3;
        let bx = x, bz = z, by = y + H - 1;
        for (let k = 0; k < 3; k++) { bx += DIRX[d]; bz += DIRZ[d]; if (k) by++; put(bx, by, bz, B.cherry_log); }
        leafBall(bx, by + 1, bz, 2.8, B.cherry_leaves, 0.6);
      }
      leafBall(x, y + H + 1, z, 2.2, B.cherry_leaves, 0.6);
      return out;
    }
    if (type === 'mangrove') {
      const H = 5 + Math.floor(t.h * 3);
      for (let k = 0; k < H; k++) put(x, y + k, z, B.mangrove_log);
      // arching prop roots
      for (let d = 0; d < 4; d++) if (rnd() < 0.8) { put(x + DIRX[d], y + 1, z + DIRZ[d], B.mangrove_log); put(x + DIRX[d] * 2, y, z + DIRZ[d] * 2, B.mangrove_log); put(x + DIRX[d] * 2, y - 1, z + DIRZ[d] * 2, B.mangrove_log); }
      if (t.bare) return out;
      leafBall(x, y + H, z, 2.8, B.mangrove_leaves, 0.6);
      return out;
    }
    if (type === 'crimson' || type === 'warped') {
      const stemId = type === 'crimson' ? B.crimson_stem : B.warped_stem, cap = type === 'crimson' ? B.nether_wart_block : B.warped_wart_block;
      const H = 4 + Math.floor(t.h * 4);
      for (let k = 0; k < H; k++) put(x, y + k, z, stemId);
      for (let dy = -2; dy <= 0; dy++) { const r = 2 + (dy < 0 ? 0 : -1); for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (dy === 0 || Math.abs(dx) === r || Math.abs(dz) === r) put(x + dx, y + H + dy, z + dz, rnd() < 0.08 ? B.shroomlight ?? cap : cap, true); }
      if (type === 'crimson') for (let k = 0; k < 4; k++) {
        const dx = Math.floor(rnd() * 5) - 2, dz = Math.floor(rnd() * 5) - 2;
        if (Math.abs(dx) < 2 && Math.abs(dz) < 2) continue;
        const len = 1 + Math.floor(rnd() * 3);
        for (let j = 1; j <= len; j++) put(x + dx, y + H - 2 - j, z + dz, B.weeping_vines, true);
      }
      return out;
    }
    // oak & birch (big oaks now and then)
    const log = type === 'birch' ? B.birch_log : B.log;
    const leaf = type === 'birch' ? B.birch_leaves : B.leaves;
    const big = type === 'oak' && t.h > 0.88 && !t.bare;
    const H = big ? 7 + Math.floor(rnd() * 3) : (type === 'birch' ? 5 : 4) + Math.floor(t.h * 3);
    for (let k = 0; k < H; k++) put(x, y + k, z, log);
    if (t.bare) return out;
    if (big) {
      for (let b = 0; b < 3; b++) { const d = Math.floor(rnd() * 4), by = y + H - 3 + b; put(x + DIRX[d], by, z + DIRZ[d], log); leafBall(x + DIRX[d] * 2, by + 1, z + DIRZ[d] * 2, 2.2, leaf, 0.7); }
      leafBall(x, y + H, z, 2.6, leaf, 0.8);
      return out;
    }
    if (t.bees) { const d = Math.floor(rnd() * 4); put(x + DIRX[d], y + H - 4, z + DIRZ[d], B.bee_nest, true, d | 0x0c); }
    for (let ly = H - 3; ly <= H + 1; ly++) {
      const r = ly >= H ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && (ly === H + 1 || hashFloat(x + dx, ly, z + dz, this.seed) < 0.5)) continue;
        if (dx === 0 && dz === 0 && ly < H) continue;
        put(x + dx, y + ly, z + dz, leaf, true);
      }
    }
    return out;
  }
  writeTree(ch, t) {
    const bx = ch.cx * 16, bz = ch.cz * 16;
    // Trees only grow on soil (mangroves also in shallow water); check the ground if it is in this chunk.
    const gl = t.x - bx, gz = t.z - bz;
    if (gl >= 0 && gl < 16 && gz >= 0 && gz < 16) {
      const g = ch.blocks[cidx(gl, t.y - 1, gz)];
      const soil = g === B.grass || g === B.snowy_grass || g === B.dirt || g === B.podzol || g === B.coarse_dirt || g === B.mud || g === B.dirt_with_dry_grass || g === B.dirt_with_coniferous_litter || g === B.dirt_with_rainforest_litter;
      if (!soil && !(t.type === 'mangrove' && (g === B.sand || g === B.clay || g === B.gravel || g === B.mud))) return;
    }
    for (const [x, y, z, id, onlyAir, meta] of this.treeParts(t)) {
      const lx = x - bx, lz = z - bz;
      if (lx < 0 || lx > 15 || lz < 0 || lz > 15 || y < 1 || y >= CH) continue;
      const i = cidx(lx, y, lz), cur = ch.blocks[i];
      if (onlyAir && cur !== B.air && cur !== B.tall_grass && cur !== B.fern && !(id === B.vine && cur === 0)) continue;
      if (id === B.vine) { if (cur !== 0) continue; ch.meta[i] = ((x - t.x) === 1 ? 3 : (x - t.x) === -1 ? 1 : (z - t.z) === 1 ? 0 : 2); }
      if (!onlyAir && T_LIQUID[cur] && T_WLOG[id]) ch.meta[i] |= WLOG;
      ch.blocks[i] = id;
      if (meta !== undefined) ch.meta[i] = meta;
      if (BLOCKS[id].axisBlock) ch.meta[i] = 0;
    }
  }

  decorate(ch, cols) {
    const bx = ch.cx * 16, bz = ch.cz * 16;
    const PLAIN_FLOWERS = [B.flower_yellow, B.flower_red, B.azure_bluet, B.oxeye_daisy, B.cornflower, B.red_tulip, B.orange_tulip, B.white_tulip, B.pink_tulip];
    const FOREST_FLOWERS = [B.lily_of_the_valley, B.allium, B.flower_red, B.lilac, B.rose_bush, B.peony];
    const set = (x, y, z, id, meta = 0) => { ch.blocks[cidx(x, y, z)] = id; ch.meta[cidx(x, y, z)] = meta; };
    const tall = (x, y, z, id) => { if (y + 1 < CH && ch.blocks[cidx(x, y + 1, z)] === 0) { set(x, y, z, id, 0); set(x, y + 1, z, id, 1); } };
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const c = cols[z * 16 + x];
      const y = c.h + 1, wx = bx + x, wz = bz + z;
      if (y >= CH - 2) continue;
      const below = ch.blocks[cidx(x, y - 1, z)], here = ch.blocks[cidx(x, y, z)];
      const r = hashFloat(wx, wz, this.seed, 9), r2 = hashFloat(wx, wz, this.seed, 19);
      // under water: sea grass, kelp, and coral in warm seas
      if (here === B.water && c.biome === BIOME.OCEAN) {
        const depth = SEA - c.h;
        if (c.temp > 0.3 && depth > 2 && depth < 10 && r < 0.12) {
          const corals = [B.tube_coral, B.brain_coral, B.bubble_coral, B.fire_coral, B.horn_coral];
          if (r < 0.04) set(x, y - 1, z, [B.tube_coral_block, B.brain_coral_block, B.bubble_coral_block, B.fire_coral_block, B.horn_coral_block][Math.floor(r2 * 5)]);
          else set(x, y, z, corals[Math.floor(r2 * 5)], WLOG);
        } else if (r < 0.18) set(x, y, z, B.seagrass, WLOG);
        else if (r < 0.24 && depth > 4) { const kh = 1 + Math.floor(r2 * Math.min(8, depth - 2)); for (let k = 0; k < kh; k++) if (ch.blocks[cidx(x, y + k, z)] === B.water) set(x, y + k, z, B.kelp, WLOG); }
        continue;
      }
      // lily pads on calm, shallow water near land
      if (here === B.water && y === SEA && c.h >= SEA - 2 && c.humid > 0.2 && r < 0.05 && y + 1 < CH) { set(x, y + 1, z, B.lily_pad); continue; }
      if (here !== B.air) continue;
      const patch = this.nDetail.noise2(wx / 14, wz / 14);
      if (below === B.grass) {
        if (c.biome === BIOME.PLAINS) {
          if (patch > 0.45 && r < 0.35) set(x, y, z, PLAIN_FLOWERS[Math.floor(((patch * 97) % 1) * PLAIN_FLOWERS.length)]);
          else if (r < 0.16) set(x, y, z, B.tall_grass);
          else if (r < 0.185) tall(x, y, z, B.tall_grass_double);
          else if (r < 0.19) tall(x, y, z, B.sunflower);
          else if (r < 0.1915 && r2 < 0.5) set(x, y, z, B.pumpkin);
          else if (r < 0.205) set(x, y, z, PLAIN_FLOWERS[Math.floor(r2 * 3)]);
        } else if (c.biome === BIOME.FOREST) {
          if (r < 0.08) set(x, y, z, B.tall_grass);
          else if (r < 0.095) set(x, y, z, B.fern);
          else if (r < 0.105) set(x, y, z, B.berry_bush);
          else if (r < 0.115) { const f = FOREST_FLOWERS[Math.floor(r2 * FOREST_FLOWERS.length)]; if (BLOCKS[f].double) tall(x, y, z, f); else set(x, y, z, f); }
          else if (r < 0.12) set(x, y, z, r2 < 0.5 ? B.brown_mushroom : B.red_mushroom);
          else if (r < 0.1205 && c.temp > 0.2) set(x, y, z, B.melon);
        } else if (c.biome === BIOME.MOUNTAINS) {
          if (r < 0.05) set(x, y, z, B.tall_grass);
          else if (r < 0.065) set(x, y, z, r2 < 0.5 ? B.lavender : B.heather);
          else if (r < 0.072) set(x, y, z, B.azure_bluet);
        } else if (r < 0.06) set(x, y, z, B.tall_grass);
        // sugar cane on shores
        if (r > 0.97 && c.h <= SEA + 2 && ch.blocks[cidx(x, y, z)] === 0) {
          let wet = false;
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz = z + dz; if (nx >= 0 && nx < 16 && nz >= 0 && nz < 16 && ch.blocks[cidx(nx, y - 1, nz)] === B.water) wet = true; }
          if (wet) for (let k = 0; k < 1 + Math.floor(r2 * 3); k++) set(x, y + k, z, B.sugar_cane);
        }
      } else if (below === B.snowy_grass || below === B.podzol) {
        if (r < 0.012) set(x, y, z, B.berry_bush);
        else if (r < 0.07) set(x, y, z, B.fern);
        else if (r < 0.08) tall(x, y, z, B.large_fern);
        else if (below === B.snowy_grass && r < 0.38) set(x, y, z, B.snow_layer, Math.floor(r2 * 2));
      } else if (below === B.mud) {
        if (r < 0.08) set(x, y, z, B.tall_grass); else if (r < 0.1) set(x, y, z, B.blue_orchid);
      } else if ((below === B.sand || below === B.coarse_dirt) && c.biome !== BIOME.BEACH && c.biome !== BIOME.OCEAN && r < 0.012 && r >= 0.006) {
        set(x, y, z, B.dead_bush);
      } else if (below === B.sand && c.biome === BIOME.DESERT && r < 0.006) {
        const hgt = 1 + Math.floor(hashFloat(wx, wz, this.seed, 10) * 3);
        let ok = true;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz;
          if (nx >= 0 && nx < 16 && nz >= 0 && nz < 16 && ch.blocks[cidx(nx, y, nz)] !== B.air) ok = false;
        }
        if (ok) for (let k = 0; k < hgt; k++) set(x, y + k, z, B.cactus);
      }
    }
    this.decorate2(ch, cols);
    this.decorateCaves(ch, cols);
    // mushrooms and amethyst in the dark below
    const rr = mulberry32(hash32(this.seed, ch.cx, ch.cz, 91));
    for (let k = 0; k < 6; k++) {
      const x = Math.floor(rr() * 16), z = Math.floor(rr() * 16), y = 12 + Math.floor(rr() * 40);
      if (ch.blocks[cidx(x, y, z)] === 0 && T_SOLID[ch.blocks[cidx(x, y - 1, z)]] && ch.blocks[cidx(x, y - 1, z)] !== B.water) set(x, y, z, k < 4 ? (rr() < 0.5 ? B.brown_mushroom : B.red_mushroom) : (y < 30 && rr() < 0.3 ? B.amethyst_cluster : B.brown_mushroom));
    }
  }

  // ---- 0.5 surface decoration: the plants of the other games ----------------
  decorate2(ch, cols) {
    const bx = ch.cx * 16, bz = ch.cz * 16;
    const at = (x, y, z) => (x < 0 || x > 15 || z < 0 || z > 15 || y < 0 || y >= CH) ? -1 : ch.blocks[cidx(x, y, z)];
    const set = (x, y, z, id, meta = 0) => { if (x < 0 || x > 15 || z < 0 || z > 15 || y < 1 || y >= CH) return; ch.blocks[cidx(x, y, z)] = id; ch.meta[cidx(x, y, z)] = meta; };
    const waterBeside = (x, y, z) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => at(x + dx, y, z + dz) === B.water);
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const c = cols[z * 16 + x], y = c.h + 1, wx = bx + x, wz = bz + z;
      if (y >= CH - 3) continue;
      const below = at(x, y - 1, z), here = at(x, y, z);
      const r = hashFloat(wx, wz, this.seed, 41), r2 = hashFloat(wx, wz, this.seed, 42);
      const jungle = c.temp > 0.25 && c.humid > 0.3, patch = this.nDetail.noise2(wx / 22 + 7, wz / 22 - 3);
      // the warm sea: sea pickles and coral fans
      if (here === B.water && c.biome === BIOME.OCEAN && c.temp > 0.3) {
        const depth = SEA - c.h;
        if (depth > 2 && depth < 12 && r < 0.02) set(x, y, z, B.sea_pickle, WLOG | Math.floor(r2 * 4));
        else if (depth > 2 && depth < 10 && r > 0.985) set(x, y, z, [B.tube_coral_fan, B.brain_coral_fan, B.bubble_coral_fan, B.fire_coral_fan, B.horn_coral_fan][Math.floor(r2 * 5)], WLOG);
        continue;
      }
      if (here !== 0) continue;
      // shore plants: cattails in the shallows' edge, marram grass on dunes
      if ((below === B.grass || below === B.mud || below === B.sand) && c.h <= SEA + 1 && waterBeside(x, y - 1, z) && r < 0.25 && at(x, y + 1, z) === 0) { set(x, y, z, B.cattail, 0); set(x, y + 1, z, B.cattail, 1); continue; }
      if ((below === B.sand || below === B.silver_sand) && c.biome === BIOME.BEACH && r < 0.08) { set(x, y, z, B.marram_grass); continue; }
      // loose stones (Vintage Story) on hills, beaches and mountain meadows
      if (T_SOLID[below] && below !== B.water && (c.biome === BIOME.MOUNTAINS || c.biome === BIOME.BEACH || (c.h > SEA + 14 && c.biome !== BIOME.DESERT)) && r > 0.988) { set(x, y, z, B.loose_stones); continue; }
      if (below === B.dirt_with_dry_grass) { if (r < 0.2) set(x, y, z, B.dry_grass); else if (r < 0.205) set(x, y, z, B.dead_bush); continue; }
      if (below === B.dirt_with_rainforest_litter || (jungle && below === B.grass)) {
        if (patch > 0.42 && r < 0.55) { const h = 4 + Math.floor(r2 * 9); for (let k = 0; k < h && at(x, y + k, z) === 0; k++) set(x, y + k, z, B.bamboo); }
        else if (r < 0.22) set(x, y, z, B.jungle_grass);
        else if (r < 0.225) set(x, y, z, B.melon);
        continue;
      }
      if (below === B.dirt_with_coniferous_litter) { if (r < 0.05) set(x, y, z, B.fern); else if (r < 0.06) set(x, y, z, B.brown_mushroom); continue; }
      if (below === B.grass) {
        // pumpkin patches, pink petals under cherry groves, the odd torchflower and pitcher plant
        if (patch > 0.6 && r < 0.05 && (c.biome === BIOME.PLAINS || c.biome === BIOME.FOREST)) set(x, y, z, B.pumpkin, Math.floor(r2 * 4));
        else if (c.biome === BIOME.MOUNTAINS && c.humid > 0.15 && c.h < 78 && r < 0.18) set(x, y, z, B.pink_petals);
        else if (c.biome === BIOME.PLAINS && r > 0.9985) set(x, y, z, B.torchflower);
        else if (c.biome === BIOME.PLAINS && r > 0.997 && r < 0.9985 && at(x, y + 1, z) === 0) { set(x, y, z, B.pitcher_plant, 0); set(x, y + 1, z, B.pitcher_plant, 1); }
      }
    }
  }

  // ---- 0.5 caves: lichen, dripstone, roots, lush caves and geodes -------------
  decorateCaves(ch, cols) {
    const bx = ch.cx * 16, bz = ch.cz * 16;
    const at = (x, y, z) => (x < 0 || x > 15 || z < 0 || z > 15 || y < 0 || y >= CH) ? -1 : ch.blocks[cidx(x, y, z)];
    const set = (x, y, z, id, meta = 0) => { ch.blocks[cidx(x, y, z)] = id; ch.meta[cidx(x, y, z)] = meta; };
    const stony = (id) => id === B.stone || id === B.slate || id === B.granite || id === B.diorite || id === B.andesite || id === B.tuff || id === B.calcite || id === B.dripstone_block || id === B.dirt || id === B.gravel;
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const c = cols[z * 16 + x], wx = bx + x, wz = bz + z;
      const top = Math.min(c.h - 3, 100);
      for (let y = 6; y < top; y++) {
        if (at(x, y, z) !== 0) continue;
        const above = at(x, y + 1, z), below = at(x, y - 1, z);
        const r = hashFloat(wx, y, wz, this.seed ^ 0x51);
        const lush = this.nCave3.noise3(wx / 40, y / 24, wz / 40) > 0.42 && y > 18 && y < c.h - 8;
        if (lush) {
          // lush caves: moss underfoot, azalea and glow berries hanging from the roof
          if (stony(below)) { set(x, y - 1, z, B.moss_block); if (r < 0.25) set(x, y, z, B.moss_carpet); else if (r < 0.3) set(x, y, z, B.azalea); else if (r < 0.34) set(x, y, z, B.tall_grass); continue; }
          if (stony(above)) {
            if (r < 0.12) { const len = 1 + Math.floor(hashFloat(wx, y, wz, 7) * 5); for (let k = 0; k < len && at(x, y - k, z) === 0; k++) set(x, y - k, z, hashFloat(wx, y - k, wz, 8) < 0.25 ? B.cave_vines_lit : B.cave_vines); }
            else if (r > 0.995) set(x, y, z, B.spore_blossom);
            else if (r > 0.9) set(x, y + 1, z, B.moss_block);
          }
          continue;
        }
        // pointed dripstone off dripstone blocks
        if (above === B.dripstone_block && r < 0.3) { set(x, y, z, B.pointed_dripstone, 1); continue; }
        if (below === B.dripstone_block && r < 0.25) { set(x, y, z, B.pointed_dripstone, 0); continue; }
        // roots hanging into caves just under the surface
        if ((above === B.dirt || above === B.stone) && y > c.h - 9 && r < 0.08) { set(x, y, z, B.hanging_roots); continue; }
        // glow lichen on cave walls
        if (y < c.h - 6 && r < 0.012) {
          for (let d = 0; d < 4; d++) { const w = at(x + DIRX[d], y, z + DIRZ[d]); if (w > 0 && stony(w)) { set(x, y, z, B.glow_lichen, d); break; } }
        }
      }
    }
    // a rare amethyst geode: calcite and smooth basalt shells around a hollow of amethyst
    const rnd = mulberry32(hash32(this.seed, ch.cx, ch.cz, 0x9e0));
    if (rnd() < 1 / 14) {
      const cx = 4 + rnd() * 8, cy = 14 + rnd() * 26, cz = 4 + rnd() * 8, R = 3.6 + rnd() * 1.2;
      for (let y = Math.floor(cy - R - 1); y <= cy + R + 1; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.1, z + 0.5 - cz);
        if (d > R + 1 || y < 2) continue;
        const cur = at(x, y, z); if (cur === B.bedrock || cur === B.lava || cur === B.water) continue;
        if (d > R) set(x, y, z, B.smooth_basalt);
        else if (d > R - 1) set(x, y, z, B.calcite);
        else if (d > R - 2) set(x, y, z, rnd() < 0.1 ? B.budding_amethyst : B.amethyst_block);
        else set(x, y, z, 0);
      }
      for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
        if (at(x, y, z) === 0 && (at(x, y - 1, z) === B.budding_amethyst || at(x, y - 1, z) === B.amethyst_block) && Math.hypot(x + 0.5 - cx, y + 0.5 - cy, z + 0.5 - cz) < R) {
          const q = rnd(); if (q < 0.25) set(x, y, z, q < 0.08 ? B.amethyst_cluster : q < 0.16 ? B.large_amethyst_bud : B.small_amethyst_bud);
        }
      }
    }
  }

  // ---- Ember Depths (dimension 1): an enclosed fiery cavern world ----------
  generateDepths(ch) {
    const bx = ch.cx * CS, bz = ch.cz * CS;
    const LAVA_SEA = 28;
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const wx = bx + x, wz = bz + z;
      for (let y = 0; y < 100; y++) {
        let id = B.air;
        if (y === 0 || y === 99 || (y < 3 && hashFloat(wx, y, wz, this.seed) < 0.6) || (y > 96 && hashFloat(wx, y, wz, this.seed ^ 5) < 0.6)) id = B.bedrock;
        else {
          const d = this.nCave1.noise3(wx / 48, y / 26, wz / 48) + this.nCave2.noise3(wx / 16, y / 12, wz / 16) * 0.35;
          const floorBias = (y < 34 ? (34 - y) / 18 : 0) + (y > 80 ? (y - 80) / 12 : 0);
          if (d + floorBias > 0.18) {
            const n = this.nFloor.noise3(wx / 12, y / 12, wz / 12);
            const rg = this.nHill.noise3(wx / 60, y / 40, wz / 60);
            const reg = this.nMount.noise2(wx / 90, wz / 90);
            id = n > 0.55 ? B.glowstone : n < -0.6 ? B.obsidian : rg > 0.38 ? B.blackstone : rg < -0.48 ? B.basalt : reg > 0.15 ? B.netherrack : B.emberstone;
            if ((id === B.emberstone || id === B.netherrack) && y >= LAVA_SEA - 2 && y <= LAVA_SEA + 2 && hashFloat(wx, y, wz, 81) < 0.35) id = B.magma_block;
            if (id === B.blackstone && hashFloat(wx, y, wz, 82) < 0.012) id = B.gilded_blackstone;
          } else if (y <= LAVA_SEA) id = B.lava;
        }
        ch.blocks[cidx(x, y, z)] = id;
      }
      // the floors: crimson and warped woods, soul sand valleys, ash elsewhere
      const wood = this.nDetail.noise2(wx / 40, wz / 40), vale = this.nMount.noise2(wx / 90 + 31, wz / 90 - 17);
      for (let y = 98; y > 1; y--) {
        const i = cidx(x, y, z);
        const here = ch.blocks[i];
        // weeping vines from the roof of the crimson woods
        if (here === B.air && wood > 0.35 && (ch.blocks[cidx(x, y + 1, z)] === B.netherrack || ch.blocks[cidx(x, y + 1, z)] === B.emberstone) && hashFloat(wx, y, wz, 79) < 0.06) {
          const len = 2 + Math.floor(hashFloat(wx, y, wz, 80) * 6);
          for (let k = 0; k < len && y - k > 1 && ch.blocks[cidx(x, y - k, z)] === B.air; k++) ch.blocks[cidx(x, y - k, z)] = B.weeping_vines;
          continue;
        }
        if ((here !== B.emberstone && here !== B.netherrack) || ch.blocks[cidx(x, y + 1, z)] !== B.air) continue;
        const r = hashFloat(wx, y, wz, 77);
        if (vale < -0.4 && Math.abs(wood) < 0.35) {
          ch.blocks[i] = r < 0.55 ? B.soul_sand : B.soul_soil;
          if (r > 0.995 && y < 90) for (let k = 1; k <= 3; k++) ch.blocks[cidx(x, y + k, z)] = B.bone_block;
          else if (r > 0.97 && y < 95) ch.blocks[cidx(x, y + 1, z)] = B.soul_fire;
          continue;
        }
        if (wood > 0.35) { ch.blocks[i] = B.crimson_nylium; if (r > 0.75 && y < 95) ch.blocks[cidx(x, y + 1, z)] = r > 0.93 ? B.crimson_fungus : B.crimson_roots; }
        else if (wood < -0.35) {
          ch.blocks[i] = B.warped_nylium;
          if (r > 0.97 && y < 90) { const len = 2 + Math.floor(hashFloat(wx, y, wz, 78) * 7); for (let k = 1; k <= len && ch.blocks[cidx(x, y + k, z)] === B.air; k++) ch.blocks[cidx(x, y + k, z)] = B.twisting_vines; }
          else if (r > 0.72 && y < 95) ch.blocks[cidx(x, y + 1, z)] = r > 0.93 ? B.warped_fungus : r > 0.82 ? B.warped_roots : B.nether_sprouts;
        }
        else if (r < 0.25) ch.blocks[i] = B.ash;
      }
    }
    // huge fungi, worked out per chunk so the ones on a border appear whole on both sides
    for (let ncz = ch.cz - 1; ncz <= ch.cz + 1; ncz++) for (let ncx = ch.cx - 1; ncx <= ch.cx + 1; ncx++) {
      for (const t of this.fungusTreesFor(ncx, ncz)) for (const [px, py, pz, id] of this.treeParts(t)) {
        const lx = px - bx, lz = pz - bz;
        if (lx < 0 || lx > 15 || lz < 0 || lz > 15 || py >= 98 || py < 1) continue;
        const k = cidx(lx, py, lz); if (ch.blocks[k] === 0) ch.blocks[k] = id;
      }
    }
    const rnd = mulberry32(hash32(this.seed, ch.cx, ch.cz, 31));
    for (let v = 0; v < 10; v++) {
      let x = rnd() * 16, y = 10 + rnd() * 80, z = rnd() * 16;
      for (let k = 0; k < 6; k++) {
        const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
        if (ix >= 0 && ix < 16 && iz >= 0 && iz < 16 && iy > 0 && iy < 99) {
          const i = cidx(ix, iy, iz);
          if (ch.blocks[i] === B.emberstone) ch.blocks[i] = v < 5 ? B.cinderite_ore : v < 8 ? B.quartz_ore : B.gold_ore;
          else if (ch.blocks[i] === B.netherrack) ch.blocks[i] = v < 4 ? B.quartz_ore : v < 8 ? B.nether_gold_ore : B.cinderite_ore;
        }
        x += rnd() * 2 - 1; y += rnd() * 2 - 1; z += rnd() * 2 - 1;
      }
    }
    // ancient debris, deep and rare
    if (rnd() < 0.45) {
      const x = Math.floor(rnd() * 16), y = 8 + Math.floor(rnd() * 14), z = Math.floor(rnd() * 16), i = cidx(x, y, z);
      if (ch.blocks[i] === B.emberstone || ch.blocks[i] === B.netherrack || ch.blocks[i] === B.basalt) ch.blocks[i] = B.ancient_debris;
    }
    ch.recomputeMaxY();
  }

  // Is this spot of the Ember Depths solid rock? (the same test the generator uses)
  depthsSolid(wx, y, wz) {
    if (y <= 0 || y >= 99) return true;
    const d = this.nCave1.noise3(wx / 48, y / 26, wz / 48) + this.nCave2.noise3(wx / 16, y / 12, wz / 16) * 0.35;
    const floorBias = (y < 34 ? (34 - y) / 18 : 0) + (y > 80 ? (y - 80) / 12 : 0);
    return d + floorBias > 0.18;
  }
  fungusTreesFor(cx, cz) {
    const key = 'f' + cx + ',' + cz;
    let list = this.colCache.get(key);
    if (list) return list;
    list = [];
    const rnd = mulberry32(hash32(this.seed, cx, cz, 0xf00));
    for (let k = 0; k < 3; k++) {
      const x = cx * 16 + Math.floor(rnd() * 16), z = cz * 16 + Math.floor(rnd() * 16), h = rnd();
      const wood = this.nDetail.noise2(x / 40, z / 40);
      if (Math.abs(wood) < 0.42) continue;
      for (let y = 84; y > 31; y--) {
        if (this.depthsSolid(x, y, z) && !this.depthsSolid(x, y + 1, z) && !this.depthsSolid(x, y + 2, z) && !this.depthsSolid(x, y + 6, z)) { list.push({ x, y: y + 1, z, type: wood > 0 ? 'crimson' : 'warped', h }); break; }
      }
    }
    if (this.colCache.size > 400) this.colCache.clear();
    this.colCache.set(key, list);
    return list;
  }

  // ---- Skylands (dimension 2): floating islands over the void --------------
  generateSkylands(ch) {
    const bx = ch.cx * CS, bz = ch.cz * CS;
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const wx = bx + x, wz = bz + z;
      const mask = this.nCont.fbm2(wx / 180, wz / 180, 3);
      const topY = 70 + Math.floor(this.nHill.fbm2(wx / 60, wz / 60, 3) * 10);
      let firstTop = -1;
      for (let y = 110; y > 20; y--) {
        const thick = (mask - 0.05) * 60;
        const dist = topY - y;
        const n = this.nCave1.noise3(wx / 30, y / 20, wz / 30) * 0.4;
        if (dist >= 0 && dist < thick * (0.6 + n) && mask > 0.05) {
          let id = B.skystone;
          if (firstTop < 0) { firstTop = y; id = B.sky_grass; }
          else if (firstTop - y < 3) id = B.dirt;
          ch.blocks[cidx(x, y, z)] = id;
        }
      }
      if (firstTop > 0) {
        const r = hashFloat(wx, wz, this.seed, 41);
        if (r < 0.12) ch.blocks[cidx(x, firstTop + 1, z)] = B.tall_grass;
        else if (r < 0.14) ch.blocks[cidx(x, firstTop + 1, z)] = B.flower_yellow;
      }
    }
    const rnd = mulberry32(hash32(this.seed, ch.cx, ch.cz, 43));
    for (let v = 0; v < 4; v++) {
      let x = rnd() * 16, y = 40 + rnd() * 60, z = rnd() * 16;
      for (let k = 0; k < 5; k++) {
        const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
        if (ix >= 0 && ix < 16 && iz >= 0 && iz < 16) {
          const i = cidx(ix, iy, iz);
          if (ch.blocks[i] === B.skystone) ch.blocks[i] = B.aether_crystal_ore;
        }
        x += rnd() * 2 - 1; y += rnd() * 2 - 1; z += rnd() * 2 - 1;
      }
    }
    // a few cloud-pine trees
    const tr = mulberry32(hash32(this.seed, ch.cx, ch.cz, 44));
    const nt = tr() < 0.6 ? 1 + Math.floor(tr() * 2) : 0;
    for (let i = 0; i < nt; i++) {
      const x = 2 + Math.floor(tr() * 12), z = 2 + Math.floor(tr() * 12);
      let y = -1;
      for (let yy = 110; yy > 20; yy--) if (ch.blocks[cidx(x, yy, z)] === B.sky_grass) { y = yy + 1; break; }
      if (y < 0) continue;
      const H = 4 + Math.floor(tr() * 3);
      for (let k = 0; k < H; k++) ch.blocks[cidx(x, y + k, z)] = B.birch_log;
      for (let ly = H - 2; ly <= H + 1; ly++) {
        const r = ly >= H ? 1 : 2;
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx, zz = z + dz;
          if (xx < 0 || xx > 15 || zz < 0 || zz > 15) continue;
          if (Math.abs(dx) === r && Math.abs(dz) === r) continue;
          const ii = cidx(xx, y + ly, zz);
          if (ch.blocks[ii] === B.air) ch.blocks[ii] = B.cloud_leaves;
        }
      }
    }
    ch.recomputeMaxY();
  }
}
