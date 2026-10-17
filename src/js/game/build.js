// ---------------------------------------------------------------------------
// game/build.js — building rules for a LocalPlayer: where and how each kind of
// block goes when placed (slabs top/bottom/vertical, stairs facing and upside
// down, doors with hinges, beds, ladders, double plants, logs on their side,
// waterlogging), what happens when you use a placed block (doors, gates,
// trapdoors, beds, note blocks, cauldrons, flower pots, signs...), and how
// multi-block things break.
// ---------------------------------------------------------------------------

// Direction index (0 N, 1 E, 2 S, 3 W) for a horizontal unit vector.
function dirOf(nx, nz) { return Math.abs(nx) > Math.abs(nz) ? (nx > 0 ? 1 : 3) : (nz > 0 ? 2 : 0); }
const HOE_TARGETS = new Set(['grass', 'dirt', 'coarse_dirt', 'rooted_dirt', 'snowy_grass', 'sky_grass', 'podzol', 'mycelium', 'dirt_path', 'dirt_with_dry_grass', 'dirt_with_coniferous_litter', 'dirt_with_rainforest_litter']);
const POTTABLE = (d) => d && d.block && (BLOCKS[B[d.block]].flower || BLOCKS[B[d.block]].tree || ['flower_red', 'flower_yellow', 'fern', 'dead_bush', 'brown_mushroom', 'red_mushroom', 'cactus', 'berry_bush'].includes(d.block));

Object.assign(LocalPlayer.prototype, {
  // The direction the player is looking along the ground.
  lookDir() { const p = this.player; return dirOf(-Math.sin(p.yaw), -Math.cos(p.yaw)); },
  // Hit point of the current target, relative to the block that was hit (0..1).
  hitFrac(hit) {
    const p = this.player, [dx, dy, dz] = p.look();
    const hx = p.x + dx * hit.dist, hy = p.y + p.eye + dy * hit.dist, hz = p.z + dz * hit.dist;
    return [hx - hit.x, hy - hit.y, hz - hit.z];
  },

  // ---- placing --------------------------------------------------------------------
  // Works out position + meta (and any second block) for placing block `bid`.
  placement(hit, bid) {
    const special = this.placeSpecial(hit, bid);
    if (special !== undefined) return special;
    const w = this.g.world, bdef = BLOCKS[bid];
    const kind = T_SHAPE[bid];
    const [fx, fy, fz] = this.hitFrac(hit);
    const alt = this.placeMode === 1;
    const side = hit.ny === 0;
    const look = this.lookDir();
    let [x, y, z] = this.placeTarget(hit);
    const hitMeta = w.getMeta(hit.x, hit.y, hit.z);
    let meta = 0;
    const also = [];
    // slabs: merge into a double, or pick the half
    if (kind === SHAPE.SLAB) {
      const hk = hitMeta & 7;
      const comp = (a, b) => (a === 0 && b === 1) || (a === 1 && b === 0) || (a >= 2 && a <= 5 && b >= 2 && b <= 5 && ((a - 2 + 2) & 3) === b - 2);
      if (hit.id === bid && hk !== 6) {
        // clicking the open face of a half slab fills it in
        const into = (hk === 0 && hit.ny === 1) || (hk === 1 && hit.ny === -1) || (hk >= 2 && hk <= 5 && dirOf(-hit.nx, -hit.nz) === hk - 2 && side);
        if (into) return { x: hit.x, y: hit.y, z: hit.z, meta: 6, merge: true };
      }
      let k;
      if (alt) k = 2 + (side ? dirOf(-hit.nx, -hit.nz) : look);
      else k = hit.ny === 1 ? 0 : hit.ny === -1 ? 1 : fy > 0.5 ? 1 : 0;
      const cur = w.getBlock(x, y, z);
      if (cur === bid && comp(w.getMeta(x, y, z) & 7, k)) return { x, y, z, meta: 6, merge: true };
      meta = k;
    } else if (kind === SHAPE.STAIRS) {
      meta = look | (alt || hit.ny === -1 || (side && fy > 0.5) ? 4 : 0);
    } else if (kind === SHAPE.GATE) {
      meta = look;
    } else if (kind === SHAPE.DOOR) {
      if (y + 1 >= CH || !T_REPLACEABLE[w.getBlock(x, y + 1, z)] && w.getBlock(x, y + 1, z) !== 0) return null;
      if (!T_SOLID[w.getBlock(x, y - 1, z)]) return null;
      const f = look, right = (f + 1) & 3, left = (f + 3) & 3;
      // double doors: hinge away from a neighbouring door
      const ln = w.getBlock(x + DIRX[left], y, z + DIRZ[left]), rn = w.getBlock(x + DIRX[right], y, z + DIRZ[right]);
      let hingeRight;
      if (BLOCKS[ln].door) hingeRight = true;
      else if (BLOCKS[rn].door) hingeRight = false;
      else {
        const along = DIRX[right] * (fx - 0.5) + DIRZ[right] * (fz - 0.5);
        hingeRight = along > 0;
      }
      meta = f | (hingeRight ? 8 : 0);
      also.push([x, y + 1, z, bid, meta | 16]);
    } else if (kind === SHAPE.TRAPDOOR) {
      const f = side ? dirOf(-hit.nx, -hit.nz) : (look + 2) & 3;
      meta = f | (alt || hit.ny === -1 || (side && fy > 0.5) ? 8 : 0);
    } else if (kind === SHAPE.LADDER) {
      if (!side) return null;
      const f = dirOf(-hit.nx, -hit.nz);
      if (!T_SOLID[w.getBlock(x + DIRX[f], y, z + DIRZ[f])]) return null;
      meta = f;
    } else if (kind === SHAPE.BED) {
      const f = look, hx = x + DIRX[f], hz = z + DIRZ[f];
      const free = (a, b) => { const id = w.getBlock(a, y, b); return id === 0 || T_REPLACEABLE[id]; };
      if (!free(hx, hz) || !T_SOLID[w.getBlock(x, y - 1, z)] || !T_SOLID[w.getBlock(hx, y - 1, hz)]) { this.toast('Not enough room for the bed', ''); return null; }
      meta = f;
      also.push([hx, y, hz, bid, f | 4]);
    } else if (bdef.double) {
      if (y + 1 >= CH || (w.getBlock(x, y + 1, z) && !T_REPLACEABLE[w.getBlock(x, y + 1, z)])) return null;
      also.push([x, y + 1, z, bid, 1]);
    } else if (bdef.axisBlock) {
      meta = hit.nx ? 1 : hit.nz ? 2 : 0;
    } else if (bdef.sign) {
      if (side) meta = 16 | dirOf(-hit.nx, -hit.nz);
      else if (hit.ny === 1) meta = Math.round(((this.player.yaw % TAU + TAU) % TAU) / TAU * 16) & 15;
      else return null;
    } else if (bdef.tex && bdef.tex.front) meta = this.facingMeta();
    // supports
    const below = w.getBlock(x, y - 1, z);
    if (bdef.crop && below !== B.farmland) { this.toast('Plant seeds on farmland — till dirt with a hoe', ''); return null; }
    if (bdef.alwaysWet && !waterAt(w, x, y, z)) { this.toast('This grows under water', ''); return null; }
    if (bid === B.sugar_cane) {
      const okSoil = below === B.sugar_cane || ((below === B.grass || below === B.dirt || below === B.sand || below === B.red_sand) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => waterAt(w, x + a, y - 1, z + b)));
      if (!okSoil) { this.toast('Sugar cane needs water beside it', ''); return null; }
    }
    // standing in water: waterloggable blocks keep it
    if (T_WLOG[bid]) {
      const cur = w.getBlock(x, y, z);
      if ((T_LIQUID[cur] === 1 && (w.getMeta(x, y, z) & 15) === 0) || bdef.alwaysWet) meta |= WLOG;
    }
    return { x, y, z, meta, also };
  },

  placeBlock(hit, def, held) {
    const g = this.g, p = this.player, w = g.world;
    const bid = B[def.block];
    const bdef = BLOCKS[bid];
    if (bid === B.lily_pad) return this.placeLilyPad(def, held);
    let [x, y, z] = this.placeTarget(hit);
    if (y < 0 || y >= CH) return;
    let meta = 0, also = [];
    if (bdef.render === RENDER.TORCH) {
      const cur = w.getBlock(x, y, z);
      if (!T_REPLACEABLE[cur] && cur !== 0) return;
      const below = w.getBlock(x, y - 1, z);
      if (hit.ny === 1 || (T_REPLACEABLE[hit.id] && T_SOLID[below])) { if (!T_SOLID[below]) return; meta = 0; }
      else if (hit.ny === -1) return;
      else {
        // on a wall only against a whole face: not the side of a fence post, pane or slab
        const sid = hit.id, sk = T_SHAPE[sid], sm = w.getMeta(hit.x, hit.y, hit.z);
        const whole = T_SOLID[sid] && (!sk ? (BLOCKS[sid].render === RENDER.CUBE || BLOCKS[sid].render === RENDER.CUTOUT) : sk === SHAPE.SLAB && ((sm & 7) === 6 || ((sm & 7) >= 2 && (sm & 7) - 2 === dirOf(-hit.nx, -hit.nz))));
        if (!whole) { this.toast('Torches fix to the full face of a block — or stand one on top', ''); return; }
        meta = hit.nx === 1 ? 1 : hit.nx === -1 ? 2 : hit.nz === 1 ? 3 : 4;
      }
      if (T_LIQUID[cur]) return;
    } else if (bid === B.lantern || bid === B.soul_lantern) {
      if (hit.ny === -1 && T_SOLID[w.getBlock(x, y + 1, z)]) meta = 1;
      else if (T_SOLID[w.getBlock(x, y - 1, z)]) meta = 0;
      else if (T_SOLID[w.getBlock(x, y + 1, z)] || BLOCKS[w.getBlock(x, y + 1, z)].shape === 'chain') meta = 1;
      else return;
      if (T_LIQUID[w.getBlock(x, y, z)] === 1 && (w.getMeta(x, y, z) & 15) === 0) meta |= WLOG;
    } else {
      const pl = this.placement(hit, bid);
      if (!pl) return;
      ({ x, y, z, meta } = pl); also = pl.also || [];
      if (pl.merge) {
        w.setBlock(x, y, z, bid, meta);
        held.n--; if (held.n <= 0) p.inv.held = null;
        this.swingArm(); g.sfx.material(bdef.sound, 'place');
        return;
      }
    }
    const cur = w.getBlock(x, y, z);
    if (cur !== 0 && !T_REPLACEABLE[cur]) return;
    if (bdef.needsSupport && !bdef.crop && !bdef.alwaysWet && bdef.render !== RENDER.TORCH && bid !== B.lantern && bid !== B.soul_lantern && bid !== B.sugar_cane && !bdef.door) {
      if (!this.supportOK(bid, x, y, z, meta)) return;
    }
    if (T_SOLID[bid] && !bdef.door && this.blockedByBody(x, y, z)) return;
    for (const [ax, ay, az] of also) { const c2 = w.getBlock(ax, ay, az); if (c2 !== 0 && !T_REPLACEABLE[c2]) return; if (T_SOLID[bid] && !bdef.door && this.blockedByBody(ax, ay, az)) return; }
    w.setBlock(x, y, z, bid, meta);
    for (const [ax, ay, az, aid, am] of also) w.setBlock(ax, ay, az, aid, am);
    if (bdef.rail) railRefreshAround(w, x, y, z);
    if (bid === B.chest || bid === B.barrel) { w.setEntity(x, y, z, { type: 'chest', items: held.c ? held.c.map(cloneStack) : new Array(27).fill(null) }); g.entityChanged(x, y, z); }
    if (bdef.sign) { w.setEntity(x, y, z, { type: 'sign', lines: ['', '', '', ''] }); g.entityChanged(x, y, z); this.editSign(x, y, z); }
    if (bdef.mech) g.mech.placed(x, y, z, bid, this);
    held.n--; if (held.n <= 0) p.inv.held = null;
    this.swingArm();
    g.sfx.material(bdef.sound, 'place');
    if (bdef.falls) g.checkFall(x, y, z);
    if (bdef.hardensTo) g.checkHarden(x, y, z);
  },
  placeLilyPad(def, held) {
    const g = this.g, p = this.player, w = g.world, [dx, dy, dz] = p.look();
    const hit = raycastBlocks(w, p.x, p.y + p.eye, p.z, dx, dy, dz, REACH, true);
    if (!hit || T_LIQUID[hit.id] !== 1 || w.getBlock(hit.x, hit.y + 1, hit.z) !== 0) return;
    w.setBlock(hit.x, hit.y + 1, hit.z, B.lily_pad, 0);
    held.n--; if (held.n <= 0) p.inv.held = null;
    this.swingArm(); g.sfx.material('grass', 'place');
  },

  // ---- using placed blocks ---------------------------------------------------------------
  // Returns true when the block did something.
  useBlockAt(hit, held, def) {
    if (this.useBlockNew(hit, held, def)) return true;
    const g = this.g, w = g.world, p = this.player;
    const { x, y, z } = hit, id = hit.id, b = BLOCKS[id], meta = w.getMeta(x, y, z);
    const tool = def && def.tool ? def.tool.type : null;
    if (b.door) {
      const lower = meta & 16 ? y - 1 : y;
      const m0 = w.getMeta(x, lower, z) ^ 4;
      w.setBlock(x, lower, z, id, m0 & ~16); w.setBlock(x, lower + 1, z, id, (m0 | 16));
      g.sfx.playAt(doorSound(b, m0 & 4), x + 0.5, lower + 1, z + 0.5); this.swingArm(); return true;
    }
    if (b.trapdoor || T_SHAPE[id] === SHAPE.GATE) {
      let m = meta ^ 4;
      if (T_SHAPE[id] === SHAPE.GATE && (m & 4)) { const f = this.lookDir(); if (((m & 3) + 2 & 3) === f) m = (m & ~3) | f; }
      w.setBlock(x, y, z, id, m); g.sfx.playAt(doorSound(b, m & 4), x + 0.5, y + 0.5, z + 0.5); this.swingArm(); return true;
    }
    if (b.bed) { this.sleep(x, y, z, meta); return true; }
    if (b.noteBlock) { const n = ((meta & 31) + 1) % 25; w.setBlock(x, y, z, id, n | (meta & 0x20)); g.sfx.note(n, w.getBlock(x, y - 1, z)); g.particleNote(x, y, z, n); this.swingArm(); return true; }
    if (b.bellBlock) { g.sfx.playAt('bell', x, y, z, 48); this.swingArm(); return true; }
    if (b.sign) { this.editSign(x, y, z); return true; }
    if (b.stonecutter) { this.openInventory('stonecutter'); return true; }
    if (b.machine) { this.openInventory('machine', { pos: [x, y, z] }); return true; }
    if (b.cauldron) {
      if (def && def.bucket === 'water' && (meta & 3) < 3) { w.setBlock(x, y, z, id, 3); p.inv.held = mkStack('bucket', 1); g.sfx.play('bucket'); return true; }
      if (def && def.bucket === 'empty' && (meta & 3) === 3) { w.setBlock(x, y, z, id, 0); held.n--; const full = mkStack('water_bucket', 1); if (held.n <= 0) p.inv.held = full; else this.give(full); g.sfx.play('bucket'); return true; }
      return false;
    }
    if (b.pot) {
      const e = w.getEntity(x, y, z, () => ({ type: 'pot', plant: null }));
      if (!e.plant && POTTABLE(def)) { e.plant = def.block; held.n--; if (held.n <= 0) p.inv.held = null; }
      else if (e.plant && !held) { this.give(mkStack(e.plant, 1)); e.plant = null; }
      else return false;
      g.entityChanged(x, y, z); w.markRemesh(w.chunkAt(x >> 4, z >> 4), x & 15, z & 15, true); this.swingArm(); return true;
    }
    if (b.tnt && def && def.igniter === 'flint') { w.setBlock(x, y, z, 0); g.primeTNT(x, y, z, 4); this.wearHeld(1); return true; }
    // tools on blocks
    if (tool === 'axe' && b.strip) { w.setBlock(x, y, z, B[b.strip], meta); g.sfx.material('wood', 'dig'); this.wearHeld(1); this.swingArm(); return true; }
    if (tool === 'hoe' && HOE_TARGETS.has(b.key) && w.getBlock(x, y + 1, z) === 0) { w.setBlock(x, y, z, B.farmland, 0); g.sfx.material('gravel', 'dig'); this.wearHeld(1); this.swingArm(); return true; }
    if ((tool === 'sword' || def && def.shears) && id === B.pumpkin) {
      w.setBlock(x, y, z, B.carved_pumpkin, this.facingMeta()); g.dropItem(mkStack('pumpkin_seeds', 4), x + 0.5 + hit.nx * 0.6, y + 0.5, z + 0.5 + hit.nz * 0.6, true); this.swingArm(); return true;
    }
    // ripe crops: pick and replant in one go
    if (b.crop && !held && (meta & 15) >= b.crop.stages - 1) {
      g.dropBlockItems(x, y, z, id, false, meta);
      w.setBlock(x, y, z, id, meta & ~15);
      g.sfx.material('grass', 'dig'); this.swingArm(); return true;
    }
    return false;
  },

  // ---- buckets & waterlogging -------------------------------------------------------------
  // Water into a stair/slab/fence..., or back out of it. Returns true when handled.
  bucketWaterlog(def, held) {
    const g = this.g, w = g.world, hit = this.target, p = this.player;
    if (!hit || !T_WLOG[hit.id]) return false;
    const m = w.getMeta(hit.x, hit.y, hit.z);
    if (def.bucket === 'water' && !(m & WLOG) && !(T_SHAPE[hit.id] === SHAPE.SLAB && (m & 7) === 6)) {
      w.setBlock(hit.x, hit.y, hit.z, hit.id, m | WLOG); p.inv.held = mkStack('bucket', 1); g.sfx.play('bucket'); this.swingArm(); return true;
    }
    if (def.bucket === 'empty' && (m & WLOG)) {
      w.setBlock(hit.x, hit.y, hit.z, hit.id, m & ~WLOG);
      held.n--; const full = mkStack('water_bucket', 1); if (held.n <= 0) p.inv.held = full; else if (p.inv.add(full) > 0) g.dropItem(full, p.x, p.y + 1, p.z, false);
      g.sfx.play('bucket'); this.swingArm(); return true;
    }
    return false;
  },

  // ---- breaking ---------------------------------------------------------------------------
  // What's left in the cell after a block goes (water stays if it was waterlogged).
  afterBreak(x, y, z, id, meta) {
    const w = this.g.world;
    if (T_WLOG[id] && (meta & WLOG)) w.setBlock(x, y, z, B.water, 0);
    // the other half of doors, beds and tall plants
    const d = BLOCKS[id];
    if (d.door) { const oy = meta & 16 ? y - 1 : y + 1; if (w.getBlock(x, oy, z) === id) w.setBlock(x, oy, z, 0, 0, { quiet: true }); }
    if (d.double) { const oy = meta & 1 ? y - 1 : y + 1; if (w.getBlock(x, oy, z) === id) w.setBlock(x, oy, z, 0, 0, { quiet: true }); }
    if (d.bed && !d.bag) {
      const f = meta & 3, s = meta & 4 ? -1 : 1, ox = x + DIRX[f] * s, oz = z + DIRZ[f] * s;
      if (w.getBlock(ox, y, oz) === id) w.setBlock(ox, y, oz, 0, 0, { quiet: true });
    }
  },

  // ---- signs --------------------------------------------------------------------------------
  editSign(x, y, z) {
    const w = this.g.world, e = w.getEntity(x, y, z, () => ({ type: 'sign', lines: ['', '', '', ''] }));
    this.hud.signEditor(e.lines, (lines) => { e.lines = lines; this.g.entityChanged(x, y, z); });
  },

  // ---- beds ---------------------------------------------------------------------------------
  sleep(x, y, z, meta) {
    const g = this.g, p = this.player;
    p.spawn = [x + 0.5, y + 0.6, z + 0.5];
    p.spawnDim = g.dim;
    if (g.dim !== DIM.OVERWORLD) { this.toast('Beds only work in the Overworld — your spawn is set here anyway', 'warn'); return; }
    const night = g.env.day < 0.45;
    if (!night) { this.toast('Spawn point set. You can only sleep at night.', 'good'); return; }
    if (g.entities.some(e => e.T && e.T.hostile && e.alive && Math.hypot(e.x - x, e.z - z) < 8)) { this.toast('You may not rest now, there are monsters nearby', 'warn'); return; }
    this.sleeping = { x, y, z, meta, t: 0 };
    p.vx = p.vz = 0;
    this.toast('Sleeping… spawn point set', 'good');
    g.trySleep();
  },
});
