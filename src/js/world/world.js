// ---------------------------------------------------------------------------
// world/world.js — one loaded dimension: chunk streaming, block access,
// fluids, plant growth, block entities.
// ---------------------------------------------------------------------------

const nkey = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);
const FLUID_MAX = { 1: 7, 2: 3 };
const FLUID_RATE = { 1: 5, 2: 28 };

// lava runs further and faster in the Ember Depths (the rules follow the world being played)
function worldFluidRules(dim) { if (dim === 1) { FLUID_MAX[2] = 6; FLUID_RATE[2] = 10; } else { FLUID_MAX[2] = 3; FLUID_RATE[2] = 28; } }
class World {
  constructor(dim, seed, records, genVersion) {
    this.dim = dim;
    this.seed = seed;
    this.gen = makeWorldGen(seed, dim, genVersion || 1);
    this.chunks = new Map();          // nkey -> Chunk
    this.records = records || new Map(); // chunkKey -> saved record (modified chunks)
    this.unsaved = new Set();         // chunkKeys whose record changed since last flush
    this.meshSet = new Set();         // chunks waiting for a mesh
    this.urgent = new Set();          // ...of which these were edited by the player
    this.fluidQ = new Map();          // posKey -> due tick
    this.tickNo = 0;
    this._sig = '';
    this.genList = [];
    this._last = null;
    this.onChunkUnload = null;        // renderer hook
    this.onBlockChanged = null;       // game hook (x,y,z,oldId,newId)
    worldFluidRules(dim);
  }

  chunkAt(cx, cz) {
    const l = this._last;
    if (l && l.cx === cx && l.cz === cz) return l;
    const c = this.chunks.get(nkey(cx, cz));
    if (c) this._last = c;
    return c;
  }
  getBlock(x, y, z) {
    if (y < 0 || y >= CH) return 0;
    const c = this.chunkAt(x >> 4, z >> 4);
    return c ? c.blocks[cidx(x & 15, y, z & 15)] : 0;
  }
  // For collision: unloaded terrain counts as solid so nobody falls through it.
  getBlockPhys(x, y, z) {
    if (y < 0 || y >= CH) return 0;
    const c = this.chunkAt(x >> 4, z >> 4);
    return c ? c.blocks[cidx(x & 15, y, z & 15)] : B.stone;
  }
  getMeta(x, y, z) {
    if (y < 0 || y >= CH) return 0;
    const c = this.chunkAt(x >> 4, z >> 4);
    return c ? c.meta[cidx(x & 15, y, z & 15)] : 0;
  }
  getLight(x, y, z) {
    if (y >= CH) return 0xF0;
    if (y < 0) return 0;
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c || !c.lightReady) return 0xF0;
    return c.light[cidx(x & 15, y, z & 15)];
  }
  isLoaded(x, z) { return !!this.chunkAt(x >> 4, z >> 4); }

  setBlock(x, y, z, id, meta = 0, opts = {}) {
    if (y < 0 || y >= CH) return false;
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c) return false;
    const lx = x & 15, lz = z & 15, i = cidx(lx, y, lz);
    const old = c.blocks[i];
    if (old === id && c.meta[i] === meta) return false;
    c.blocks[i] = id; c.meta[i] = meta;
    if (id && y + 1 > c.maxY) c.maxY = y + 1;
    if (old !== id && c.blockEntities.has(i) && !opts.keepEntity) c.blockEntities.delete(i);
    c.modified = true; c.dirty = true;
    if (T_TICK[id]) this.noteTickable(x, y, z, id);
    // (0.9.0.22) a change that can't alter the light only needs this chunk rebuilt (and a neighbour it touches)
    const lit = old !== id && (T_OPAQUE[old] !== T_OPAQUE[id] || T_LIGHT[old] !== T_LIGHT[id] || (BLOCKS[old].lightAtt || 0) !== (BLOCKS[id].lightAtt || 0)) || T_LMETA[old] || T_LMETA[id];
    this.markRemesh(c, lx, lz, !opts.quiet && !this._ticking, !lit);
    if (!opts.noFluid) this.scheduleFluidAround(x, y, z);
    if (this.onBlockChanged && old !== id) this.onBlockChanged(x, y, z, old, id, opts);
    if (this.onAnyChange) this.onAnyChange(x, y, z, old, id, opts);
    return true;
  }
  markRemesh(c, lx, lz, urgent, lightNeutral) {
    // Light reaches 15 blocks, so all 8 neighbours may need relighting (unless the light can't have changed:
    // then only those whose edge this block touches)
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const n = this.chunkAt(c.cx + dx, c.cz + dz);
      if (!n) continue;
      const touches = (dx === 0 || (dx < 0 ? lx === 0 : lx === 15)) && (dz === 0 || (dz < 0 ? lz === 0 : lz === 15));
      if (lightNeutral && !touches) continue;
      n.needsMesh = true; n.litOnly = false; this.meshSet.add(n);
      if (urgent && touches) this.urgent.add(n);
    }
  }

  // ---- block entities (chests) ----------------------------------------------
  getEntity(x, y, z, create) {
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c) return null;
    const i = cidx(x & 15, y, z & 15);
    let e = c.blockEntities.get(i);
    if (!e && create) { e = create(); c.blockEntities.set(i, e); }
    return e || null;
  }
  setEntity(x, y, z, e) {
    const c = this.chunkAt(x >> 4, z >> 4);
    if (!c) return;
    const i = cidx(x & 15, y, z & 15);
    if (e) c.blockEntities.set(i, e); else c.blockEntities.delete(i);
    c.modified = true; c.dirty = true;
  }
  touchEntity(x, z) { const c = this.chunkAt(x >> 4, z >> 4); if (c) { c.modified = true; c.dirty = true; } }

  // ---- streaming ------------------------------------------------------------
  ensureChunk(cx, cz) {
    let c = this.chunkAt(cx, cz);
    if (c) return c;
    c = new Chunk(this.dim, cx, cz);
    const rec = this.records.get(c.key);
    if (rec) {
      try { decodeChunkInto(c, rec); this.gen.fillClimate(c); }
      catch (e) { console.error('Corrupt chunk record, regenerating', c.key, e); this.gen.generate(c); }
    } else this.gen.generate(c);
    this.chunks.set(nkey(cx, cz), c);
    this.wakeLiquids(c);
    // Any loaded neighbour whose 3x3 just became complete can now be meshed.
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const n = this.chunkAt(cx + dx, cz + dz);
      if (n && n.needsMesh) this.meshSet.add(n);
    }
    return c;
  }
  hasAllNeighbours(c) {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!this.chunkAt(c.cx + dx, c.cz + dz)) return false;
    return true;
  }

  // Called each frame. Generates, meshes and unloads within a time budget.
  // `centers` is a list of [x, z] positions (one per player on this device,
  // plus LAN players on the host) that need terrain around them.
  // A centre marked far ([x, z, true]: a LAN guest, on the host) gets its ground made and lit, not drawn.
  stream(centers, R, budgetMs, meshFn, lightFn) {
    const t0 = performance.now();
    const cs = centers.map(([x, z, far]) => [Math.floor(x) >> 4, Math.floor(z) >> 4, !!far]);
    const sig = cs.map(c => c[0] + ',' + c[1] + (c[2] ? 'f' : '')).join(';') + '|' + R;
    if (sig !== this._sig) {
      this._sig = sig;
      const want = new Map();
      const G = R + 1;
      for (const [pcx, pcz] of cs) {
        for (let dz = -G; dz <= G; dz++) for (let dx = -G; dx <= G; dx++) {
          const d2 = dx * dx + dz * dz;
          if (d2 > (G + 0.5) * (G + 0.5)) continue;
          const k = nkey(pcx + dx, pcz + dz), prev = want.get(k);
          if (!prev || prev[2] > d2) want.set(k, [pcx + dx, pcz + dz, d2]);
        }
      }
      const list = [];
      for (const v of want.values()) if (!this.chunkAt(v[0], v[1])) list.push(v);
      list.sort((a, b) => b[2] - a[2]); // pop() takes nearest
      this.genList = list;
      this.unloadFar(cs, R + 3);
    }
    let generated = 0, meshed = 0;
    // Edited chunks first: the player expects instant feedback.
    for (const c of this.urgent) {
      this.urgent.delete(c);
      if (c.needsMesh && this.hasAllNeighbours(c)) { meshFn(c); this.meshSet.delete(c); meshed++; }
      if (performance.now() - t0 > budgetMs * 2) break;
    }
    while (this.genList.length && (performance.now() - t0 < budgetMs * 0.45 || generated === 0)) {
      const [cx, cz] = this.genList.pop();
      if (!this.chunkAt(cx, cz)) { this.ensureChunk(cx, cz); generated++; }
    }
    // Mesh nearest-first.
    if (this.meshSet.size && (performance.now() - t0 < budgetMs || meshed === 0)) {
      const cand = [];
      const lim = (R + 0.5) * (R + 0.5);
      for (const c of this.meshSet) {
        let d = Infinity, df = Infinity;
        for (const [pcx, pcz, far] of cs) { const dx = c.cx - pcx, dz = c.cz - pcz, dd = dx * dx + dz * dz; if (far) df = Math.min(df, dd); else d = Math.min(d, dd); }
        if (!this.hasAllNeighbours(c)) continue;
        if (d <= lim) cand.push([d, c, false]);
        else if (lightFn && df <= lim && !c.litOnly) cand.push([df + 1e4, c, true]);
      }
      cand.sort((a, b) => a[0] - b[0]);
      for (const [, c, lightOnly] of cand) {
        if (performance.now() - t0 > budgetMs && meshed > 0) break;
        if (lightOnly) { lightFn(c); c.litOnly = true; meshed++; continue; }   // stays listed, for when someone here comes near
        meshFn(c); this.meshSet.delete(c); c.litOnly = false; meshed++;
      }
    }
    return { generated, meshed, pending: this.genList.length + this.meshSet.size };
  }

  unloadFar(cs, maxD) {
    for (const [k, c] of this.chunks) {
      let far = true;
      for (const [pcx, pcz] of cs) { const dx = c.cx - pcx, dz = c.cz - pcz; if (dx * dx + dz * dz <= maxD * maxD) { far = false; break; } }
      if (far) {
        if (c.modified && c.dirty) { this.records.set(c.key, encodeChunk(c)); this.unsaved.add(c.key); c.dirty = false; }
        if (this.onChunkUnload) this.onChunkUnload(c);
        this.chunks.delete(k);
        this.meshSet.delete(c); this.urgent.delete(c);
        if (this._last === c) this._last = null;
      }
    }
  }
  unloadAll() {
    for (const c of this.chunks.values()) if (this.onChunkUnload) this.onChunkUnload(c);
    this.chunks.clear(); this.meshSet.clear(); this.urgent.clear(); this._last = null;
  }

  // Gather everything that needs writing to storage.
  collectDirty() {
    const out = [];
    for (const c of this.chunks.values()) {
      if (c.modified && c.dirty) {
        c.savedAt = Date.now();
        const rec = encodeChunk(c);
        this.records.set(c.key, rec); c.dirty = false;
        out.push(rec);
      }
    }
    for (const k of this.unsaved) { const r = this.records.get(k); if (r) out.push(r); }
    this.unsaved.clear();
    return out;
  }

  // ---- fluids -----------------------------------------------------------------
  // A newly loaded chunk: any water or lava with somewhere to run (a cave opened beside a lake,
  // a hole left when the game was closed) starts flowing on its own — and so do the edges of
  // the chunks next to it, which couldn't see past their border until now.
  wakeLiquids(c) {
    const top = Math.min(c.maxY, CH - 1), bx = c.cx * 16, bz = c.cz * 16;
    const open = (id) => id === 0 || (!T_SOLID[id] && !T_LIQUID[id] && !T_WLOG[id] && !T_PORTAL[id]);
    const blocks = c.blocks;
    const edge = (x, y, z) => this.isLoaded(x, z) ? this.getBlock(x, y, z) : B.stone;   // not loaded yet: treat as a wall
    for (let y = 1; y < top; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
      const i = (y << 8) | (z << 4) | x, id = blocks[i];
      if (!T_LIQUID[id]) continue;
      // running water that isn't fed any more (saved while the old drain bug left it stranded) settles too
      if (T_LIQUID[id] === 1 && c.meta[i] === 8 && !T_LIQUID[blocks[i + 256]] && y + 1 < CH) { this.scheduleFluid(bx + x, y, bz + z); continue; }
      let leak = open(blocks[i - 256]);
      if (!leak) leak = open(x < 15 ? blocks[i + 1] : edge(bx + 16, y, bz + z)) || open(x > 0 ? blocks[i - 1] : edge(bx - 1, y, bz + z))
        || open(z < 15 ? blocks[i + 16] : edge(bx + x, y, bz + 16)) || open(z > 0 ? blocks[i - 16] : edge(bx + x, y, bz - 1));
      if (leak) this.scheduleFluid(bx + x, y, bz + z);
    }
    // the neighbours' border columns facing this chunk
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = this.chunkAt(c.cx + dx, c.cz + dz); if (!n) continue;
      const ntop = Math.min(n.maxY, CH - 1);
      for (let y = 1; y < ntop; y++) for (let k = 0; k < 16; k++) {
        const lx = dx === 1 ? 0 : dx === -1 ? 15 : k, lz = dz === 1 ? 0 : dz === -1 ? 15 : k;
        if (!T_LIQUID[n.blocks[(y << 8) | (lz << 4) | lx]]) continue;
        const ox = dx === 1 ? 15 : dx === -1 ? 0 : k, oz = dz === 1 ? 15 : dz === -1 ? 0 : k;
        if (open(blocks[(y << 8) | (oz << 4) | ox])) this.scheduleFluid(n.cx * 16 + lx, y, n.cz * 16 + lz);
      }
    }
  }
  scheduleFluidAround(x, y, z) {
    this.scheduleFluid(x, y, z);
    this.scheduleFluid(x + 1, y, z); this.scheduleFluid(x - 1, y, z);
    this.scheduleFluid(x, y + 1, z); this.scheduleFluid(x, y - 1, z);
    this.scheduleFluid(x, y, z + 1); this.scheduleFluid(x, y, z - 1);
  }
  scheduleFluid(x, y, z) {
    if (y < 0 || y >= CH) return;
    const id = this.getBlock(x, y, z);
    const kind = T_LIQUID[id] || (T_WLOG[id] && (this.getMeta(x, y, z) & WLOG) ? 1 : 0);
    if (!kind) return;
    const k = posKey(x, y, z);
    if (!this.fluidQ.has(k)) this.fluidQ.set(k, this.tickNo + FLUID_RATE[kind]);
  }
  tickFluids() {
    if (!this.fluidQ.size) return;
    let n = 0;
    const due = [];
    for (const [k, t] of this.fluidQ) { if (t <= this.tickNo) { due.push(k); if (++n > 300) break; } }
    for (const k of due) {
      this.fluidQ.delete(k);
      const [x, y, z] = unpackPosKey(k);
      if (!this.isLoaded(x, z)) continue;
      // wait for the chunks around before deciding how it runs
      if (!this.isLoaded(x + 1, z) || !this.isLoaded(x - 1, z) || !this.isLoaded(x, z + 1) || !this.isLoaded(x, z - 1)) { this.fluidQ.set(k, this.tickNo + 20); continue; }
      this.updateFluid(x, y, z);
    }
  }
  canFlowInto(x, y, z, kind, level) {
    const id = this.getBlockPhys(x, y, z);
    if (id === 0) return true;
    if (T_WLOG[id]) return false;
    if (T_LIQUID[id] === kind) { const m = this.getMeta(x, y, z); return (m & 8) === 0 && (m & 7) > level && (m & 7) !== 0; }
    if (T_LIQUID[id]) return true; // other liquid: handled as a reaction
    return !T_SOLID[id] && !T_PORTAL[id]; // plants and torches get washed away
  }
  flowInto(x, y, z, kind, meta) {
    const id = this.getBlock(x, y, z);
    const other = T_LIQUID[id];
    if (other && other !== kind) {
      // water + lava reactions
      const m = this.getMeta(x, y, z);
      if (other === 2) this.setBlock(x, y, z, (m & 7) === 0 && !(m & 8) ? B.obsidian : B.cobblestone, 0, { fluid: true });
      else this.setBlock(x, y, z, B.stone, 0, { fluid: true });
      if (this.onFluidReact) this.onFluidReact(x, y, z);
      return;
    }
    if (id && !T_LIQUID[id] && this.onFluidWash) this.onFluidWash(x, y, z, id);
    this.setBlock(x, y, z, kind === 1 ? B.water : B.lava, meta, { fluid: true, quiet: true });
  }
  updateFluid(x, y, z) {
    let id = this.getBlock(x, y, z);
    let kind = T_LIQUID[id];
    let meta = this.getMeta(x, y, z);
    // a block holding water is a still source that only spreads
    const logged = !kind && T_WLOG[id] && (meta & WLOG);
    if (logged) { kind = 1; meta = 0; }
    if (!kind) return;
    const max = FLUID_MAX[kind];
    const same = (xx, yy, zz) => { const b = this.getBlock(xx, yy, zz); return T_LIQUID[b] === kind || (kind === 1 && T_WLOG[b] && (this.getMeta(xx, yy, zz) & WLOG) !== 0); };
    // Lava touching water hardens.
    if (kind === 2) {
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]]) {
        if (T_LIQUID[this.getBlock(x + dx, y + dy, z + dz)] === 1) {
          this.setBlock(x, y, z, (meta & 7) === 0 && !(meta & 8) ? B.obsidian : B.cobblestone, 0, { fluid: true });
          if (this.onFluidReact) this.onFluidReact(x, y, z);
          return;
        }
      }
    }
    const isSource = (meta & 7) === 0 && !(meta & 8);
    if (!isSource) {
      // Recompute this cell's level from its feeders.
      // (a separate flag for falling water: a level of 8 worked out from neighbours at 7 used to
      // read as "falling", which counts as a source to the cells around, so water never drained)
      let expected = 99, falling = false;
      if (same(x, y + 1, z)) falling = true;
      else {
        let sources = 0, best = 99;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!same(x + dx, y, z + dz)) continue;
          const nb = this.getBlock(x + dx, y, z + dz);
          const m = T_LIQUID[nb] ? this.getMeta(x + dx, y, z + dz) : 0;
          const lvl = (m & 8) ? 0 : (m & 7);
          if ((m & 7) === 0 && !(m & 8)) sources++;
          best = Math.min(best, lvl + 1);
        }
        expected = best;
        if (kind === 1 && sources >= 2) {
          const below = this.getBlockPhys(x, y - 1, z);
          if (T_SOLID[below] || (same(x, y - 1, z) && (this.getMeta(x, y - 1, z) & 15) === 0)) expected = 0;
        }
      }
      if (falling) {
        if (meta !== 8) { this.setBlock(x, y, z, id, 8, { fluid: true, quiet: true }); meta = 8; }
      } else if (expected > max) {
        this.setBlock(x, y, z, 0, 0, { fluid: true, quiet: true });
        return;
      } else if (expected !== (meta & 7) || (meta & 8)) {
        this.setBlock(x, y, z, id, expected, { fluid: true, quiet: true }); meta = expected;
      }
    }
    // Spread: down first, otherwise sideways.
    if (y > 0 && this.canFlowInto(x, y - 1, z, kind, 0) && !same(x, y - 1, z)) {
      this.flowInto(x, y - 1, z, kind, 8);
      return;
    }
    // resting on water: running water just feeds what's below instead of spreading sideways
    // (so a waterfall into a lake doesn't sheet out across the surface); a source still spreads
    if (y > 0 && same(x, y - 1, z)) {
      const bid = this.getBlock(x, y - 1, z), stillBelow = T_LIQUID[bid] ? (this.getMeta(x, y - 1, z) & 15) === 0 : true;
      if (!(isSource && stillBelow)) return;
    }
    const lvl = (meta & 8) ? 0 : (meta & 7);
    if (lvl >= max) return;
    const below = this.getBlockPhys(x, y - 1, z);
    if (!T_SOLID[below] && !T_LIQUID[below] && below !== 0) return;
    const next = lvl + 1;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (this.canFlowInto(x + dx, y, z + dz, kind, next)) this.flowInto(x + dx, y, z + dz, kind, next);
    }
  }

  // ---- plants -----------------------------------------------------------------
  // Plants grow, crops ripen, fires burn out, copper slowly turns green.
  // Called once a second for every growing thing near a player. Rates match Minecraft's random
  // ticks: each block is picked about once every 68 seconds (RT), then has its own chance to grow.
  randomTicks(px, pz, rnd) {
    // (0.9.0.22) what grows on its own is rebuilt with the rest, in the frame budget, not at once
    this._ticking = true;
    try { return this.randomTicksInner(px, pz, rnd); } finally { this._ticking = false; }
  }
  randomTicksInner(px, pz, rnd) {
    const RT = 68.27;
    const pcx = Math.floor(px) >> 4, pcz = Math.floor(pz) >> 4;
    for (const c of this.chunks.values()) {
      if (Math.abs(c.cx - pcx) > 6 || Math.abs(c.cz - pcz) > 6) continue;
      if (!c.tickables) this.scanTickables(c);
      for (const i of c.tickables) {
        const id = c.blocks[i], d = BLOCKS[id];
        const x = c.cx * 16 + (i & 15), z = c.cz * 16 + ((i >> 4) & 15), y = i >> 8;
        if (!T_TICK[id]) { c.tickables.delete(i); continue; }
        // saplings: two growth stages, each a 1 in 7 chance per random tick (about 16 minutes in all)
        if (d.tree) { if (rnd() < 1 / (RT * 7)) { const st = c.meta[i] & 8; if (st) this.growTree(x, y, z, rnd); else this.setBlock(x, y, z, id, c.meta[i] | 8, { quiet: true }); } }
        else if (id === B.berry_bush_empty) { if (rnd() < 1 / (RT * 5)) this.setBlock(x, y, z, B.berry_bush); }
        else if (d.crop) {
          const m = c.meta[i] & 15;
          if (m >= d.crop.stages - 1) { if (d.crop.fruit && this.onGrowExtra) this.onGrowExtra(x, y, z, id, c.meta[i], rnd); continue; }
          if (!d.soil && !d.cocoa) {
            const l = this.getLight(x, y, z);
            if (Math.max(l >> 4, l & 15) < 9 && (l >> 4) * (this.dayLight || 1) < 9) continue;
          }
          const wet = d.soil || d.cocoa || this.waterNear(x, y - 1, z, 4);
          // a well-watered field: about 1 in 4 per random tick; dry ground half that (wheat takes ~30 minutes)
          if (rnd() < (wet ? 1 / (RT * 4) : 1 / (RT * 8))) this.setBlock(x, y, z, id, (c.meta[i] & ~15) | (m + 1), { quiet: true });
        } else if (id === B.sugar_cane || id === B.cactus || id === B.kelp) {
          if (rnd() > (id === B.kelp ? 0.14 / RT : 1 / (RT * 16))) continue;   // cane and cactus: a block per 16 random ticks
          let h = 1; while (h < 4 && this.getBlock(x, y - h, z) === id) h++;
          const above = this.getBlock(x, y + 1, z);
          if (h < (id === B.kelp ? 8 : 3) && (id === B.kelp ? T_LIQUID[above] === 1 : above === 0)) this.setBlock(x, y + 1, z, id, id === B.kelp ? WLOG : 0);
        } else if (d.fire) {
          const below = this.getBlock(x, y - 1, z);
          if (below === B.emberstone || below === B.magma_block || below === B.soul_soil || below === B.ash) continue;
          if (rnd() < 0.3) this.setBlock(x, y, z, 0);
        } else if (d.oxidizes) { if (rnd() < 1 / 2400) this.setBlock(x, y, z, B[d.oxidizes], c.meta[i]); }
        else if (this.onGrowExtra) this.onGrowExtra(x, y, z, id, c.meta[i], rnd);
      }
      // grass creeping: a few random columns per chunk each second, like the classic random tick
      if (this.onSurfaceTick) for (let k = 0; k < 4; k++) {
        const col = ((rnd() * 16) | 0) | (((rnd() * 16) | 0) << 4);
        let y = Math.min(c.maxY, CH - 1);
        while (y > 0 && !T_SOLID[c.blocks[(y << 8) | col]]) y--;
        const id = c.blocks[(y << 8) | col];
        if (T_GRASSY[id]) this.onSurfaceTick(c.cx * 16 + (col & 15), y, c.cz * 16 + (col >> 4), id, rnd);
      }
    }
  }
  waterNear(x, y, z, r) {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) for (let dy = 0; dy <= 1; dy++) if (waterAt(this, x + dx, y + dy, z + dz)) return true;
    return false;
  }
  scanTickables(c) {
    c.tickables = new Set();
    const top = Math.min(c.maxY, CH);
    for (let i = 0, n = top << 8; i < n; i++) if (T_TICK[c.blocks[i]]) c.tickables.add(i);
  }
  noteTickable(x, y, z, id) {
    if (!T_TICK[id]) return;
    const c = this.chunkAt(x >> 4, z >> 4);
    if (c) { if (!c.tickables) this.scanTickables(c); c.tickables.add(cidx(x & 15, y, z & 15)); }
  }
  // A sapling becomes a tree of its kind (shapes shared with the world generator).
  growTree(x, y, z, rnd) {
    const type = BLOCKS[this.getBlock(x, y, z)].tree || 'oak';
    const parts = this.gen.treeParts({ x, y, z, type, h: rnd(), bare: false });
    for (const [px, py, pz] of parts) { if (py === y && px === x && pz === z) continue; const b = this.getBlock(px, py, pz); if (b && !BLOCKS[b].isLeaves && !T_REPLACEABLE[b] && BLOCKS[b].key !== 'tall_grass') return; }
    this.setBlock(x, y, z, 0, 0, { quiet: true });
    for (const [px, py, pz, id, onlyAir, meta] of parts) {
      const b = this.getBlock(px, py, pz);
      if (onlyAir && b && !T_REPLACEABLE[b]) continue;
      this.setBlock(px, py, pz, id, meta !== undefined && !BLOCKS[id].axisBlock ? meta : 0, { quiet: true });
    }
  }

}
