// ---------------------------------------------------------------------------
// world/worldgen_v1.js — the world generator exactly as it was in 0.4.
//
// Worlds created before 0.5 keep generating with this (meta.genVersion 1), so
// the places you visited but didn't change come back exactly as you left them
// and nothing you built is cut off at a chunk edge. New worlds use the 0.5
// generator (world/worldgen.js) with all the new blocks and trees.
// Don't edit these methods: they must keep producing the same terrain.
// Saplings still grow with today's trees (see World.growTree).
// ---------------------------------------------------------------------------
class WorldGenV1 extends WorldGen {
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
      const underwater = h < SEA;
      for (let y = 0; y <= h; y++) {
        let id;
        if (y === 0 || (y < 4 && hashFloat(wx, y, wz, this.seed) < 0.5)) id = B.bedrock;
        else if (y === h) id = top;
        else if (y > h - fillDepth) id = filler;
        else if (y > h - fillDepth - 3 && under === B.sandstone) id = B.sandstone;
        else id = B.stone;
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

  placeOres(ch, rnd) {
    const veins = [
      [B.coal_ore, 18, 8, 5, 100],
      [B.iron_ore, 12, 6, 5, 64],
      [B.gold_ore, 3, 6, 5, 32],
      [B.diamond_ore, 1.4, 5, 4, 16],
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
            if (ch.blocks[i] === B.stone) ch.blocks[i] = id;
          }
          x += rnd() * 2 - 1; y += rnd() * 2 - 1; z += rnd() * 2 - 1;
        }
      }
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
    const density = { [BIOME.FOREST]: 7, [BIOME.PLAINS]: 0.6, [BIOME.TAIGA]: 4, [BIOME.MOUNTAINS]: 0.8 }[mid.biome] || 0;
    // now and then a whole grove stands with every leaf cut away
    const bare = (mid.biome === BIOME.FOREST || mid.biome === BIOME.PLAINS) && hashFloat(cx, cz, this.seed, 67) < 0.025;
    const n = Math.floor(density) + (rnd() < density % 1 ? 1 : 0) + (bare ? 3 : 0);
    for (let i = 0; i < n; i++) {
      const x = cx * 16 + Math.floor(rnd() * 16), z = cz * 16 + Math.floor(rnd() * 16);
      const c = this.column(x, z);
      const r = rnd(), r2 = rnd();
      if (c.h <= SEA || c.biome === BIOME.DESERT || c.biome === BIOME.BEACH || c.biome === BIOME.OCEAN) continue;
      if (c.biome === BIOME.MOUNTAINS && c.h > 82) continue;
      let type = 'oak';
      if (c.biome === BIOME.TAIGA || (c.biome === BIOME.MOUNTAINS && r < 0.7)) type = 'spruce';
      else if (c.biome === BIOME.FOREST && r < 0.3) type = 'birch';
      list.push({ x, y: c.h + 1, z, type, h: r2, bare });
    }
    if (this.colCache.size > 400) this.colCache.clear();
    this.colCache.set(key, list);
    return list;
  }
  writeTree(ch, t) {
    const bx = ch.cx * 16, bz = ch.cz * 16;
    const put = (x, y, z, id, onlyAir) => {
      const lx = x - bx, lz = z - bz;
      if (lx < 0 || lx > 15 || lz < 0 || lz > 15 || y < 1 || y >= CH) return;
      const i = cidx(lx, y, lz), cur = ch.blocks[i];
      if (onlyAir && cur !== B.air && cur !== B.tall_grass) return;
      ch.blocks[i] = id;
    };
    // Trees only grow on soil; check the ground block if it is in this chunk.
    const gl = t.x - bx, gz = t.z - bz;
    if (gl >= 0 && gl < 16 && gz >= 0 && gz < 16) {
      const g = ch.blocks[cidx(gl, t.y - 1, gz)];
      if (g !== B.grass && g !== B.snowy_grass && g !== B.dirt) return;
    }
    if (t.type === 'spruce') {
      const H = 6 + Math.floor(t.h * 4);
      for (let y = 0; y < H; y++) put(t.x, t.y + y, t.z, B.spruce_log);
      if (t.bare) return;
      let r = 0;
      for (let y = H; y >= 2; y--) {
        const rr = r;
        for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) {
          if (Math.abs(dx) + Math.abs(dz) > rr + 1) continue;
          if (dx || dz || y >= H) put(t.x + dx, t.y + y, t.z + dz, B.spruce_leaves, true);
        }
        r = r >= 2 ? 1 : r + 1;
        if (y === H) r = 1;
      }
      put(t.x, t.y + H, t.z, B.spruce_leaves, true);
      put(t.x, t.y + H + 1, t.z, B.spruce_leaves, true);
      return;
    }
    const log = t.type === 'birch' ? B.birch_log : B.log;
    const leaf = t.type === 'birch' ? B.birch_leaves : B.leaves;
    const H = (t.type === 'birch' ? 5 : 4) + Math.floor(t.h * 3);
    for (let y = 0; y < H; y++) put(t.x, t.y + y, t.z, log);
    if (t.bare) return;
    for (let ly = H - 3; ly <= H + 1; ly++) {
      const r = ly >= H ? 1 : 2;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && (ly === H + 1 || hashFloat(t.x + dx, ly, t.z + dz, this.seed) < 0.5)) continue;
        if (dx === 0 && dz === 0 && ly < H) continue;
        put(t.x + dx, t.y + ly, t.z + dz, leaf, true);
      }
    }
  }

  decorate(ch, cols) {
    const bx = ch.cx * 16, bz = ch.cz * 16;
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const c = cols[z * 16 + x];
      const y = c.h + 1;
      if (y >= CH - 2) continue;
      const below = ch.blocks[cidx(x, y - 1, z)], here = ch.blocks[cidx(x, y, z)];
      if (here !== B.air) continue;
      const r = hashFloat(bx + x, bz + z, this.seed, 9);
      if (below === B.grass) {
        if (c.biome === BIOME.PLAINS) {
          if (r < 0.18) ch.blocks[cidx(x, y, z)] = B.tall_grass;
          else if (r < 0.205) ch.blocks[cidx(x, y, z)] = B.flower_yellow;
          else if (r < 0.225) ch.blocks[cidx(x, y, z)] = B.flower_red;
        } else if (c.biome === BIOME.FOREST) {
          if (r < 0.09) ch.blocks[cidx(x, y, z)] = B.tall_grass;
          else if (r < 0.105) ch.blocks[cidx(x, y, z)] = B.berry_bush;
          else if (r < 0.115) ch.blocks[cidx(x, y, z)] = B.flower_red;
        } else if (r < 0.06) ch.blocks[cidx(x, y, z)] = B.tall_grass;
      } else if (below === B.snowy_grass && r < 0.012) {
        ch.blocks[cidx(x, y, z)] = B.berry_bush;
      } else if (below === B.sand && c.biome === BIOME.DESERT && r < 0.006) {
        const hgt = 1 + Math.floor(hashFloat(bx + x, bz + z, this.seed, 10) * 3);
        let ok = true;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz;
          if (nx >= 0 && nx < 16 && nz >= 0 && nz < 16 && ch.blocks[cidx(nx, y, nz)] !== B.air) ok = false;
        }
        if (ok) for (let k = 0; k < hgt; k++) ch.blocks[cidx(x, y + k, z)] = B.cactus;
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
            id = n > 0.55 ? B.glowstone : n < -0.6 ? B.obsidian : B.emberstone;
          } else if (y <= LAVA_SEA) id = B.lava;
        }
        ch.blocks[cidx(x, y, z)] = id;
      }
      // ash/soul layer on floors
      for (let y = 98; y > 1; y--) {
        const i = cidx(x, y, z);
        if (ch.blocks[i] === B.emberstone && ch.blocks[cidx(x, y + 1, z)] === B.air && hashFloat(wx, y, wz, 77) < 0.25) ch.blocks[i] = B.ash;
      }
    }
    const rnd = mulberry32(hash32(this.seed, ch.cx, ch.cz, 31));
    for (let v = 0; v < 10; v++) {
      let x = rnd() * 16, y = 10 + rnd() * 80, z = rnd() * 16;
      for (let k = 0; k < 6; k++) {
        const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
        if (ix >= 0 && ix < 16 && iz >= 0 && iz < 16 && iy > 0 && iy < 99) {
          const i = cidx(ix, iy, iz);
          if (ch.blocks[i] === B.emberstone) ch.blocks[i] = v < 7 ? B.cinderite_ore : B.gold_ore;
        }
        x += rnd() * 2 - 1; y += rnd() * 2 - 1; z += rnd() * 2 - 1;
      }
    }
    ch.recomputeMaxY();
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
