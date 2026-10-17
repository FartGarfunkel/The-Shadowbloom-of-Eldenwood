// ---------------------------------------------------------------------------
// game/blocks2.js — the 0.5 blocks and items in play: candles, cake, sea
// pickles, bamboo, cave plants, cocoa, nether wart and stems, composters,
// jukeboxes, ender chests, item frames, bee nests, the work stations
// (anvil, grindstone, smithing table, loom, fletching table), bone meal, the
// bow and arrows, compass, clock and spyglass.
// ---------------------------------------------------------------------------

const SOIL_IDS = () => [B.grass, B.dirt, B.snowy_grass, B.sky_grass, B.podzol, B.coarse_dirt, B.moss_block, B.rooted_dirt, B.mycelium, B.farmland, B.mud,
  B.dirt_with_dry_grass, B.dry_dirt_with_dry_grass, B.dirt_with_coniferous_litter, B.dirt_with_rainforest_litter, B.dry_dirt, B.peat];
// How likely each plant item is to raise a composter's level.
function compostChance(key) {
  const d = itemDef(key); if (!d) return 0;
  const b = d.block ? BLOCKS[B[d.block]] : null;
  if (['wheat_seeds', 'beetroot_seeds', 'pumpkin_seeds', 'melon_seeds', 'kelp', 'dried_kelp', 'glow_berries', 'berries', 'sweet_berries', 'seagrass', 'tall_grass', 'straw'].includes(key)) return 0.3;
  if (b && (b.isLeaves || b.tree)) return 0.3;
  if (['wheat', 'carrot', 'potato', 'beetroot', 'melon_slice', 'apple', 'cocoa_beans', 'nether_wart_item', 'sugar_cane', 'cactus', 'bamboo', 'vine', 'lily_pad', 'moss_carpet', 'glow_lichen', 'fern', 'dead_bush'].includes(key)) return 0.65;
  if (b && (b.flower || b.key.endsWith('mushroom') || b.key.endsWith('fungus') || b.key.endsWith('_roots'))) return 0.65;
  if (['pumpkin', 'carved_pumpkin', 'melon', 'hay_bale', 'bread', 'cookie', 'baked_potato', 'moss_block', 'brown_mushroom_block', 'red_mushroom_block', 'nether_wart_block', 'warped_wart_block', 'shroomlight'].includes(key)) return 0.85;
  if (['pumpkin_pie', 'cake'].includes(key)) return 1;
  return 0;
}
// The same block in another colour (loom), or null.
function recolorKey(key, c) {
  const d = BLOCKS[B[key]]; if (!d) return null;
  let base = key, col = d.color;
  if (key === 'wool') { base = 'white_wool'; col = 'white'; }
  if (key === 'bed') { base = 'red_bed'; col = 'red'; }
  const plain = { candle: 'candle', terracotta: 'terracotta', glass: 'stained_glass', glass_pane: 'stained_glass_pane' };
  const suffix = col ? base.slice(col.length + 1) : plain[key];
  if (!suffix) return null;
  let out = c + '_' + suffix;
  if (out === 'white_wool') out = 'wool';
  if (out === 'red_bed') out = 'bed';
  return out !== key && itemDef(out) ? out : null;
}
// Repair material of a tool or armour piece (anvil).
function repairMaterial(key) {
  for (const [tk, t] of Object.entries(TIERS)) if (key.startsWith(tk + '_') && TOOL_KINDS[key.slice(tk.length + 1)]) return t.mat;
  for (const [mk, m] of Object.entries(ARMOR_MATS)) for (const p of ARMOR_PIECES) if (key === mk + '_' + p.key) return m.mat;
  return null;
}
function maxDurability(d) { return d.tool ? d.tool.durability : d.armor ? d.armor.durability : 0; }

// What a work station makes from its two input slots: { out, useA, useB, note } or null.
function stationResult(kind, a, b) {
  const da = a && itemDef(a.id), db = b && itemDef(b.id);
  if (kind === 'anvil' || kind === 'grindstone') {
    if (!a || !b) return null;
    const max = maxDurability(da); if (!max || !(a.d > 0 || (b.id === a.id && b.d > 0))) return null;
    if (a.id === b.id) {
      const left = (max - (a.d || 0)) + (max - (b.d || 0)) + Math.floor(max * (kind === 'anvil' ? 0.12 : 0.05));
      return { out: Object.assign(cloneStack(a), { n: 1, d: Math.max(0, max - left) }), useA: 1, useB: 1, note: 'Joins the two into one' };
    }
    if (kind === 'anvil') {
      const mat = repairMaterial(a.id);
      if (!mat || !tagMatch(mat, b.id)) return null;
      const per = Math.ceil(max / 4), need = Math.min(b.n, Math.ceil((a.d || 0) / per));
      if (need <= 0) return null;
      return { out: Object.assign(cloneStack(a), { n: 1, d: Math.max(0, (a.d || 0) - per * need) }), useA: 1, useB: need, note: `Uses ${need} ${itemDef(b.id).name}` };
    }
    return null;
  }
  if (kind === 'smithing') {
    if (!a || !b) return null;
    let to = null;
    if (a.id.startsWith('diamond_') && b.id === 'cinderite_shard') to = 'cinderite_' + a.id.slice(8);
    else if (a.id.startsWith('copper_') && b.id === 'tin_ingot') to = 'bronze_' + a.id.slice(7);
    if (!to || !itemDef(to)) return null;
    const dt = itemDef(to), maxA = maxDurability(da), maxT = maxDurability(dt);
    const out = mkStack(to, 1); if (a.d && maxA) out.d = Math.round(a.d / maxA * maxT);
    if (a.gx) out.gx = a.gx;
    return { out, useA: 1, useB: 1, note: 'Upgraded, wear and all' };
  }
  if (kind === 'loom') {
    if (!a || !b || !db || !db.dye) return null;
    const to = recolorKey(a.id, db.dye); if (!to) return null;
    const n = Math.min(a.n, 8);
    return { out: mkStack(to, n), useA: n, useB: 1, note: 'Up to eight blocks per dye' };
  }
  if (kind === 'fletching') {
    const flint = [a, b].find(s => s && s.id === 'flint'), feather = [a, b].find(s => s && s.id === 'feather');
    if (!flint || !feather) return null;
    return { out: mkStack('arrow', 6), useA: 1, useB: 1, note: 'Six arrows, no sticks needed' };
  }
  return null;
}

// ---- arrows ----------------------------------------------------------------------------------
let ARROW_MESH = null;
function arrowMesh(gl) {
  if (ARROW_MESH) return ARROW_MESH;
  const mb = new MeshBuilder(64), t = ATLAS.tile.arrow_tex ?? 0, f = ATLAS.tile.wool ?? t, h = ATLAS.tile.iron_block ?? t;
  addBox(mb, [-0.03, -0.03, -0.42], [0.03, 0.03, 0.38], [t, t, t, t, t, t]);
  addBox(mb, [-0.05, -0.05, -0.5], [0.05, 0.05, -0.42], [h, h, h, h, h, h]);
  addBox(mb, [-0.11, -0.005, 0.22], [0.11, 0.005, 0.38], [f, f, f, f, f, f]);
  addBox(mb, [-0.005, -0.11, 0.22], [0.005, 0.11, 0.38], [f, f, f, f, f, f]);
  const r = mb.result();
  return (ARROW_MESH = makeVAO(gl, r.verts, r.idx));
}
class Arrow extends Entity {
  constructor(game, x, y, z, vx, vy, vz, owner, damage, pickup) {
    super(game, x, y, z);
    this.vx = vx; this.vy = vy; this.vz = vz; this.owner = owner; this.damage = damage; this.pickup = pickup;
    this.w = 0.05; this.h = 0.05; this.stuck = false; this.yaw = 0; this.pitch = 0; this.aim();
  }
  aim() { const s = Math.hypot(this.vx, this.vz); if (s > 0.01 || Math.abs(this.vy) > 0.01) { this.yaw = Math.atan2(-this.vx, -this.vz); this.pitch = Math.atan2(this.vy, s); } }
  update(dt) {
    const g = this.game, w = g.world;
    this.age += dt;
    if (this.stuck) {
      if (this.age > 60) { this.remove = true; return; }
      if (!T_SOLID[w.getBlock(this.bx, this.by, this.bz)]) { this.stuck = false; this.vy = 0; return; }
      for (const l of g.locals) {
        const p = l.player;
        if (!p.dead && this.pickup && Math.abs(p.x - this.x) < 1 && Math.abs(p.z - this.z) < 1 && this.y > p.y - 0.5 && this.y < p.y + 2) {
          if (p.inv.add(mkStack('arrow', 1)) <= 0) { this.remove = true; g.sfx.play('pop'); l.hud.pickup('arrow', 1); return; }
        }
      }
      return;
    }
    if (this.age > 30) { this.remove = true; return; }
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      const h = dt / steps;
      this.vy -= 20 * h;
      const drag = Math.max(0, 1 - h * 0.25);
      this.vx *= drag; this.vy *= drag; this.vz *= drag;
      const nx = this.x + this.vx * h, ny = this.y + this.vy * h, nz = this.z + this.vz * h;
      // creatures (and players, if a skeleton or a dispenser fired it)
      if (arrowHitsPawn(this, nx, ny, nz)) { this.remove = true; return; }
      for (const e of g.entities) {
        if (!(e instanceof Mob) || !e.alive || e === this.owner) continue;
        if (nx > e.x - e.w - 0.1 && nx < e.x + e.w + 0.1 && nz > e.z - e.w - 0.1 && nz < e.z + e.w + 0.1 && ny > e.y && ny < e.y + e.h) {
          const speed = Math.hypot(this.vx, this.vy, this.vz);
          const dmg = Math.max(1, Math.round(this.damage * speed / 30));
          const sl = speed || 1;
          const dealt = e.hurt(dmg, { attacker: this.owner, knock: 3, tool: 'arrow', ray: [this.x, this.y, this.z, this.vx / sl, this.vy / sl, this.vz / sl] });
          if (dealt > 0 && this.owner && this.owner.floatText) this.owner.floatText(e.x, e.y + e.h + 0.2, e.z, String(Math.round(dealt * 10) / 10), '#ffffff');
          g.sfx.playAt('hit', e.x, e.y, e.z);
          this.remove = true; return;
        }
      }
      // blocks: stick where it hits
      const bx = Math.floor(nx), by = Math.floor(ny), bz = Math.floor(nz), id = w.getBlock(bx, by, bz);
      if (T_SOLID[id]) {
        let hitIt = true;
        if (T_SHAPE[id] || (BLOCKS[id].shape && SHAPES[BLOCKS[id].shape])) {
          const bs = worldBoxes(w, bx, by, bz, id, 1);
          hitIt = !bs || bs.some(b => nx >= bx + b[0] / 16 && nx <= bx + b[3] / 16 && ny >= by + b[1] / 16 && ny <= by + b[4] / 16 && nz >= bz + b[2] / 16 && nz <= bz + b[5] / 16);
        }
        if (hitIt) {
          this.aim(); this.stuck = true; this.bx = bx; this.by = by; this.bz = bz; this.age = 0;
          this.vx = this.vy = this.vz = 0;
          g.sfx.playAt('arrow_hit', nx, ny, nz);
          if (BLOCKS[id].tnt && this.burning) { w.setBlock(bx, by, bz, 0); g.primeTNT(bx, by, bz, 4); }
          if (T_RS[id] === RS.TARGET) g.targetHit(bx, by, bz, nx, ny, nz);
          if (T_RS[id] === RS.BUTTON && BLOCKS[id].wooden && !(w.getMeta(bx, by, bz) & 8)) { w.setBlock(bx, by, bz, id, w.getMeta(bx, by, bz) | 8); g.rs.schedule(bx, by, bz, 30, 'button'); }
          return;
        }
      }
      this.x = nx; this.y = ny; this.z = nz;
    }
    this.aim();
  }
  draws(out) {
    const m = Mat4.create();
    Mat4.rotateY(m, this.yaw); Mat4.rotateX(m, this.pitch);
    out.push({ mesh: arrowMesh(this.game.renderer.gl), m, px: this.x, py: this.y, pz: this.z, light: this.lightAt(0) });
  }
}

// ---- music discs: little procedural tunes ---------------------------------------------------------
const DISC_TUNES = {
  ember: { bpm: 96, wave: 'triangle', root: 0, mel: '0 3 7 10 7 3 5 7 8 7 5 3 2 3 5 . 0 3 7 12 10 7 8 10 12 10 8 7 5 3 2 0', bass: '-12 . -9 . -7 . -5 .' },
  tide: { bpm: 72, wave: 'sine', root: -2, mel: '7 9 11 12 11 9 7 . 4 5 7 9 7 5 4 . 2 4 5 7 9 7 5 4 2 . 0 2 4 2 0 .', bass: '-12 . . -5 -10 . . -3' },
  grove: { bpm: 112, wave: 'square', root: 2, mel: '0 2 4 7 4 2 0 . 5 7 9 12 9 7 5 . 4 5 7 9 11 12 11 9 7 5 4 2 0 . . .', bass: '-12 -5 -10 -3 -8 -1 -10 -5' },
  sun: { bpm: 104, wave: 'triangle', root: 5, mel: '0 4 7 12 7 4 0 4 5 9 12 16 12 9 5 9 7 11 14 19 14 11 7 11 12 7 4 0 . . . .', bass: '-12 . -7 . -10 . -5 .' },
};
Sfx.prototype.disc = function (tune, gainNode) {
  const T = DISC_TUNES[tune]; if (!T || !this.ctx) return 0;
  const c = this.ctx, beat = 60 / T.bpm / 2, t0 = c.currentTime + 0.1;
  const mel = T.mel.split(' '), bass = T.bass.split(' ');
  const play = (f, at, dur, type, gain) => {
    const o = c.createOscillator(); o.type = type; o.frequency.value = f;
    const gg = c.createGain(); gg.gain.setValueAtTime(0.0001, at); gg.gain.exponentialRampToValueAtTime(gain, at + 0.02); gg.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(gg); gg.connect(gainNode); o.start(at); o.stop(at + dur + 0.05);
  };
  const rounds = 3;
  for (let r = 0; r < rounds; r++) {
    const base = t0 + r * mel.length * beat, lift = r === 1 ? 5 : 0;
    mel.forEach((n, i) => { if (n !== '.') play(262 * Math.pow(2, (Number(n) + T.root + lift) / 12), base + i * beat, beat * 1.6, T.wave, T.wave === 'square' ? 0.05 : 0.12); });
    for (let i = 0; i < mel.length; i += 2) { const n = bass[(i / 2) % bass.length]; if (n !== '.') play(262 * Math.pow(2, (Number(n) + T.root + lift - 12) / 12), base + i * beat, beat * 3, 'sine', 0.16); }
  }
  return rounds * mel.length * beat + 0.5;
};

// ---- the player's side -------------------------------------------------------------------------
Object.assign(LocalPlayer.prototype, {
  // Placement rules for the new blocks. Returns a placement, null to refuse, or undefined for the usual rules.
  placeSpecial(hit, bid) {
    if (T_RS[bid] || BLOCKS[bid].rail || BLOCKS[bid].tripwire) { const r = this.placeRedstone(hit, bid); if (r !== undefined) return r; }
    const w = this.g.world, d = BLOCKS[bid], kind = T_SHAPE[bid];
    const hitMeta = w.getMeta(hit.x, hit.y, hit.z);
    const [x, y, z] = this.placeTarget(hit);
    const cur = w.getBlock(x, y, z);
    const wet = T_LIQUID[cur] === 1 && (w.getMeta(x, y, z) & 15) === 0;
    if (kind === SHAPE.CANDLE) {
      if (hit.id === bid && (hitMeta & 3) < 3) return { x: hit.x, y: hit.y, z: hit.z, meta: hitMeta + 1, merge: true };
      if (!T_SOLID[w.getBlock(x, y - 1, z)]) return null;
      return { x, y, z, meta: wet ? WLOG : 0 };
    }
    if (kind === SHAPE.CAKE) return T_SOLID[w.getBlock(x, y - 1, z)] ? { x, y, z, meta: 0 } : null;
    if (kind === SHAPE.ROD) return { x, y, z, meta: (hit.nx ? 1 : hit.nz ? 2 : 0) | (wet && T_WLOG[bid] ? WLOG : 0) };
    if (kind === SHAPE.FRAME) {
      if (hit.ny !== 0) { this.toast('Hang item frames on a wall', ''); return null; }
      const f = dirOf(-hit.nx, -hit.nz);
      if (!T_SOLID[w.getBlock(x + DIRX[f], y, z + DIRZ[f])]) return null;
      return { x, y, z, meta: f };
    }
    if (d.facingModel) return { x, y, z, meta: d.station === 'anvil' ? (this.lookDir() + 1) & 3 : this.lookDir() };
    if (bid === B.pointed_dripstone) return { x, y, z, meta: (hit.ny === -1 ? 1 : 0) | (wet ? WLOG : 0) };
    if (d.hangs && hit.ny !== -1 && w.getBlock(x, y + 1, z) !== bid && !T_SOLID[w.getBlock(x, y + 1, z)]) { this.toast('This hangs from a ceiling', ''); return null; }
    return undefined;
  },
  // Does the ground (or ceiling) suit this plant or small thing?
  supportOK(bid, x, y, z, meta) {
    const w = this.g.world, d = BLOCKS[bid];
    const below = w.getBlock(x, y - 1, z), above = w.getBlock(x, y + 1, z);
    const SOIL = SOIL_IDS();
    if (T_RS[bid] || d.rail || d.tripwire) return d.attached || this.rsFloorOK(x, y - 1, z, T_SINK[bid]);
    if (d.hangs || (d.altTile && (meta & 1))) return !!T_SOLID[above] || above === bid || (BLOCKS[above].hangs && BLOCKS[above].key.startsWith('cave_vines') && d.key.startsWith('cave_vines'));
    if (bid === B.cactus) return below === B.sand || below === B.red_sand || below === B.desert_sand || below === B.cactus;
    if (bid === B.dead_bush || bid === B.dry_grass || bid === B.marram_grass) return [B.sand, B.red_sand, B.desert_sand, B.silver_sand, B.terracotta, ...SOIL].includes(below);
    if (bid === B.bamboo) return below === B.bamboo || [B.sand, B.red_sand, B.gravel, ...SOIL].includes(below);
    if (bid === B.twisting_vines) return !!T_SOLID[below] || below === bid;
    if ([B.crimson_roots, B.warped_roots, B.nether_sprouts, B.crimson_fungus, B.warped_fungus].includes(bid)) return [B.crimson_nylium, B.warped_nylium, B.netherrack, B.soul_soil, B.soul_sand, ...SOIL].includes(below);
    if ([B.brown_mushroom, B.red_mushroom, B.amethyst_cluster, B.small_amethyst_bud, B.medium_amethyst_bud, B.large_amethyst_bud, B.loose_stones, B.sea_pickle, B.pointed_dripstone].includes(bid)) return !!T_SOLID[below];
    if (bid === B.cattail) return [B.sand, B.clay, B.gravel, ...SOIL].includes(below);
    return SOIL.includes(below);
  },
  // Seeds, beans, berries and warts: plant them where they grow.
  plantItem(def, hit, held) {
    const g = this.g, w = g.world, p = this.player;
    const bid = B[def.plants]; if (bid === undefined) return false;
    const [x, y, z] = this.placeTarget(hit);
    if (w.getBlock(x, y, z) !== 0 && !T_REPLACEABLE[w.getBlock(x, y, z)]) return false;
    let meta = 0;
    if (bid === B.cocoa) {
      const logOK = [B.jungle_log, B.jungle_wood, B.stripped_jungle_log, B.stripped_jungle_wood].includes(hit.id);
      if (!logOK || hit.ny !== 0) { this.toast('Plant cocoa beans on the side of a jungle log', ''); return true; }
      meta = dirOf(-hit.nx, -hit.nz) << 4;
    } else if (bid === B.nether_wart) {
      if (hit.id !== B.soul_sand || hit.ny !== 1) { this.toast('Nether wart grows on soul sand', ''); return true; }
    } else if (bid === B.cave_vines) {
      const ceiling = T_SOLID[w.getBlock(x, y + 1, z)] || BLOCKS[w.getBlock(x, y + 1, z)].key.startsWith('cave_vines');
      if (!ceiling) { if (def.food) return false; this.toast('Glow berries grow down from a ceiling', ''); return true; }
    } else {
      if (hit.id !== B.farmland || hit.ny !== 1) { if (def.food) return false; this.toast('Plant seeds on farmland — till dirt with a hoe', ''); return true; }
    }
    if (this.blockedByBody(x, y, z) && T_SOLID[bid]) return true;
    w.setBlock(x, y, z, bid, meta);
    held.n--; if (held.n <= 0) p.inv.held = null;
    this.swingArm(); g.sfx.material('grass', 'place');
    return true;
  },
  drinkMilk(held) {
    const g = this.g, p = this.player;
    p.burn = 0; p.slow = 0; p.frozen = 0;
    p.inv.held = mkStack('bucket', 1);
    p.eatAnim = 0.45; g.sfx.play('eat');
    this.toast('Refreshing', 'good');
  },
  // Using the 0.5 blocks. Returns true when something happened.
  useBlockNew(hit, held, def) {
    if (this.useRedstone(hit, held, def)) return true;
    if (BLOCKS[hit.id].grave) { this.swingArm(); this.g.openGrave(this, hit.x, hit.y, hit.z); return true; }
    const g = this.g, w = g.world, p = this.player;
    const { x, y, z } = hit, id = hit.id, b = BLOCKS[id], meta = w.getMeta(x, y, z);
    const tool = def && def.tool ? def.tool.type : null;
    if (b.candle) {
      if (def && def.igniter === 'flint' && !(meta & 4) && !(meta & WLOG)) { w.setBlock(x, y, z, id, meta | 4); g.sfx.playAt('ignite', x, y, z); this.wearHeld(1); this.swingArm(); return true; }
      if (!held && (meta & 4)) { w.setBlock(x, y, z, id, meta & ~4); g.sfx.playAt('fizz', x, y, z); this.swingArm(); return true; }
      return false;
    }
    if (b.cake && (!def || !def.block)) {
      if (p.health >= p.maxHealth) { this.toast('You are already at full health', ''); return true; }
      p.heal(2); g.sfx.play('eat'); p.eatAnim = 0.45;
      const bites = (meta & 7) + 1;
      if (bites >= 7) w.setBlock(x, y, z, 0); else w.setBlock(x, y, z, id, bites);
      this.floatText(x + 0.5, y + 0.9, z + 0.5, '+1 ♥', '#ff8a8a');
      return true;
    }
    if (b.composter) {
      const lvl = meta & 15;
      if (lvl >= 8) { w.setBlock(x, y, z, id, 0); g.dropItem(mkStack('bone_meal', 1), x + 0.5, y + 1.1, z + 0.5, true); g.sfx.playAt('dig_gravel', x, y, z); this.swingArm(); return true; }
      const ch = held ? compostChance(held.id) : 0;
      if (!ch) return false;
      if (lvl < 7) {
        held.n--; if (held.n <= 0) p.inv.held = null;
        if (Math.random() < ch) { w.setBlock(x, y, z, id, lvl + 1 === 7 ? 8 : lvl + 1); g.burst(x + 0.5, y + 1, z + 0.5, 'bone_meal', 5, 0.4); }
        g.sfx.material('grass', 'place'); this.swingArm();
      }
      return true;
    }
    if (b.jukebox) {
      const e = w.getEntity(x, y, z);
      if (e && e.disc) { g.stopDisc(x, y, z); g.dropItem(mkStack(e.disc, 1), x + 0.5, y + 1.1, z + 0.5, true); w.setEntity(x, y, z, null); g.entityChanged(x, y, z); this.swingArm(); return true; }
      if (def && def.disc) {
        w.setEntity(x, y, z, { type: 'jukebox', disc: held.id }); g.entityChanged(x, y, z);
        held.n--; if (held.n <= 0) p.inv.held = null;
        g.startDisc(x, y, z, def.disc); this.toast('Now playing: ' + def.name.replace(/^Music Disc — /, ''), 'good'); this.swingArm(); return true;
      }
      return false;
    }
    if (b.enderChest) { this.swingArm(); g.sfx.play('chest'); this.openInventory('container', { ender: true }); return true; }
    if (b.station) {
      this.swingArm();
      if (b.station === 'cartography') { this.openInventory('table'); this.toast('Map table: a map ringed with 8 paper zooms out · a map with empty maps makes copies', ''); return true; }
      this.openInventory('station', { kind: b.station, pos: [x, y, z] });
      return true;
    }
    if (b.lectern) {
      const e = w.getEntity(x, y, z);
      if (!e && held && held.id === 'book') { w.setEntity(x, y, z, { type: 'lectern', book: true }); held.n--; if (held.n <= 0) p.inv.held = null; g.entityChanged(x, y, z); this.swingArm(); return true; }
      if (e && e.book && !held) { this.give(mkStack('book', 1)); w.setEntity(x, y, z, null); g.entityChanged(x, y, z); this.swingArm(); return true; }
      return false;
    }
    if (b.frame) {
      const e = w.getEntity(x, y, z);
      if (e && e.item) { e.rot = ((e.rot || 0) + 1) & 7; g.entityChanged(x, y, z); g.sfx.playAt('click', x, y, z); this.swingArm(); return true; }
      if (held) { w.setEntity(x, y, z, { type: 'frame', item: Object.assign(cloneStack(held), { n: 1 }), rot: 0 }); held.n--; if (held.n <= 0) p.inv.held = null; g.entityChanged(x, y, z); g.sfx.playAt('click', x, y, z); this.swingArm(); return true; }
      return false;
    }
    if (b.hive) {
      const full = (meta & 0x0c) === 0x0c;
      if (full && def && def.shears) { w.setBlock(x, y, z, id, meta & 3); g.dropItem(mkStack('honeycomb', 3), x + 0.5 + hit.nx * 0.6, y + 0.5, z + 0.5 + hit.nz * 0.6, true); this.wearHeld(1); g.sfx.play('shear'); this.swingArm(); return true; }
      if (full && def && def.bottle) { w.setBlock(x, y, z, id, meta & 3); held.n--; const hb = mkStack('honey_bottle', 1); if (held.n <= 0) p.inv.held = hb; else this.give(hb); g.sfx.play('bucket'); this.swingArm(); return true; }
      if (!full && def && (def.shears || def.bottle)) { this.toast('The nest is not full of honey yet', ''); return true; }
      return false;
    }
    if (id === B.cave_vines_lit) { w.setBlock(x, y, z, B.cave_vines, meta); g.dropItem(mkStack('glow_berries', 1), x + 0.5, y + 0.3, z + 0.5, true); g.sfx.material('grass', 'dig'); this.swingArm(); return true; }
    if (tool === 'shovel' && [B.grass, B.dirt, B.coarse_dirt, B.podzol, B.mycelium, B.rooted_dirt, B.dirt_with_dry_grass, B.dirt_with_coniferous_litter, B.dirt_with_rainforest_litter].includes(id) && hit.ny !== -1 && (w.getBlock(x, y + 1, z) === 0 || (T_REPLACEABLE[w.getBlock(x, y + 1, z)] && !T_LIQUID[w.getBlock(x, y + 1, z)]))) {
      if (w.getBlock(x, y + 1, z)) w.setBlock(x, y + 1, z, 0);
      w.setBlock(x, y, z, B.dirt_path, 0); g.sfx.material('gravel', 'dig'); this.wearHeld(1); this.swingArm(); return true;
    }
    if (tool === 'shovel' && (id === B.campfire || id === B.soul_campfire)) { g.sfx.playAt('fizz', x, y, z); return true; }
    return false;
  },
  // Bone meal: crops ripen, saplings grow, grass blooms.
  useBonemeal(hit, held) {
    const g = this.g, w = g.world, p = this.player;
    const { x, y, z } = hit, id = hit.id, d = BLOCKS[id], meta = w.getMeta(x, y, z);
    let ok = false;
    if (d.crop) {
      const st = meta & 15, max = d.crop.stages - 1;
      if (st < max) { w.setBlock(x, y, z, id, (meta & ~15) | Math.min(max, st + 2 + Math.floor(Math.random() * 3))); ok = true; }
      else if (d.crop.fruit) { g.stemFruit(x, y, z, d); ok = true; }
    } else if (d.tree) {
      ok = true;
      if (Math.random() < 0.45) w.growTree(x, y, z, Math.random);
    } else if (id === B.grass || id === B.moss_block || id === B.dirt_with_dry_grass) {
      ok = true;
      const flowers = ['flower_red', 'flower_yellow', 'oxeye_daisy', 'azure_bluet', 'cornflower', 'allium', 'red_tulip', 'white_tulip'];
      for (let i = 0; i < 26; i++) {
        const ax = x + Math.round((Math.random() - 0.5) * 6), az = z + Math.round((Math.random() - 0.5) * 6);
        for (let ay = y + 2; ay >= y - 2; ay--) {
          const base = w.getBlock(ax, ay, az);
          if ((base === B.grass || base === B.moss_block || base === B.dirt_with_dry_grass) && w.getBlock(ax, ay + 1, az) === 0) {
            const k = id === B.moss_block ? (Math.random() < 0.6 ? 'moss_carpet' : 'azalea') : id === B.dirt_with_dry_grass ? 'dry_grass' : Math.random() < 0.8 ? 'tall_grass' : flowers[Math.floor(Math.random() * flowers.length)];
            w.setBlock(ax, ay + 1, az, B[k], 0);
            break;
          }
        }
      }
    } else if ([B.sugar_cane, B.bamboo, B.cactus, B.twisting_vines, B.kelp].includes(id)) {
      let ty = y; while (w.getBlock(x, ty + 1, z) === id) ty++;
      const above = w.getBlock(x, ty + 1, z);
      if (above === 0 || (id === B.kelp && T_LIQUID[above] === 1)) { w.setBlock(x, ty + 1, z, id, id === B.kelp ? WLOG : 0); ok = true; }
    } else if (d.hangs && d.stackPlant) {
      let ty = y; while (BLOCKS[w.getBlock(x, ty - 1, z)].hangs && BLOCKS[w.getBlock(x, ty - 1, z)].stackPlant) ty--;
      if (w.getBlock(x, ty - 1, z) === 0) { w.setBlock(x, ty - 1, z, id === B.cave_vines ? (Math.random() < 0.4 ? B.cave_vines_lit : B.cave_vines) : id, 0); ok = true; }
      if (id === B.cave_vines) { w.setBlock(x, y, z, B.cave_vines_lit, meta); ok = true; }
    } else if (id === B.sea_pickle && (meta & 3) < 3) { w.setBlock(x, y, z, id, meta + 1); ok = true; }
    else if (id === B.berry_bush_empty) { w.setBlock(x, y, z, B.berry_bush); ok = true; }
    if (!ok) return;
    if (!g.creative) { held.n--; if (held.n <= 0) p.inv.held = null; }
    for (let i = 0; i < 8; i++) g.particles.add({ x: x + Math.random(), y: y + 0.6 + Math.random() * 0.8, z: z + Math.random(), vx: 0, vy: 0.4, vz: 0, life: 0.9, max: 0.9, size: 0.06, uv: tileUV(ATLAS.tile.note_particle ?? 0), light: 0xFF, grav: 0, tint: 0.33 });
    g.sfx.material('grass', 'place'); this.swingArm();
  },
  // Bow, spyglass, compass and clock: things you hold rather than place.
  updateHeldTools(dt, inp) {
    const g = this.g, p = this.player, held = p.inv.held, def = held ? itemDef(held.id) : null;
    const playing = this.mode === 'play' && !p.dead && !p.carrying;
    // bow: hold use to draw, let go to shoot
    if (playing && def && def.bow) {
      if (inp.use) {
        if (!this.findArrow() && !g.creative) { if (inp.usePressed) this.toast('You need arrows', ''); this.bowPull = 0; }
        else this.bowPull = Math.min(1.25, (this.bowPull || 0) + dt);
      } else if (this.bowPull > 0) {
        if (this.bowPull > 0.12) this.shootArrow(Math.min(1, this.bowPull));
        this.bowPull = 0;
      }
    } else this.bowPull = 0;
    // spyglass: hold use to look through it
    this.spyglassOn = !!(playing && def && def.spyglass && inp.use);
    const mask = this.el.querySelector('.spy-mask'); if (mask) mask.hidden = !this.spyglassOn;
    // compass and clock readouts
    const th = this.el.querySelector('.tool-hud');
    if (!th) return;
    const show = playing && def && (def.compass || def.clock);
    th.hidden = !show;
    if (!show) return;
    if (def.compass === 'death') {
      const gr = p.grave;
      th.className = 'tool-hud';
      if (!gr) { th.querySelector('.tool-text').textContent = 'No grave to find'; return; }
      const toYaw = Math.atan2(-(gr.x + 0.5 - p.x), -(gr.z + 0.5 - p.z));
      const rel = ((toYaw - p.yaw) % TAU + TAU + Math.PI) % TAU - Math.PI;
      th.querySelector('.tool-dial').style.setProperty('--needle', (-rel * 180 / Math.PI).toFixed(1) + 'deg');
      const dist = Math.round(Math.hypot(gr.x - p.x, gr.z - p.z));
      th.querySelector('.tool-text').textContent = gr.dim !== g.dim ? 'Your grave is in ' + DIM_NAME[gr.dim] : `Grave · ${dist} blocks · y ${gr.y}`;
      return;
    }
    if (def.compass) {
      const sp = p.spawn || g.meta.spawn || [0, 0, 0];
      const toYaw = Math.atan2(-(sp[0] - p.x), -(sp[2] - p.z));
      const rel = ((toYaw - p.yaw) % TAU + TAU + Math.PI) % TAU - Math.PI;
      th.className = 'tool-hud';
      th.querySelector('.tool-dial').style.setProperty('--needle', (-rel * 180 / Math.PI).toFixed(1) + 'deg');
      const dist = Math.round(Math.hypot(sp[0] - p.x, sp[2] - p.z));
      th.querySelector('.tool-text').textContent = g.dim !== 0 ? 'The needle spins wildly' : dist < 3 ? 'You are home' : `Home · ${dist} blocks`;
    } else {
      const t = (g.meta.time % DAY_LEN) / DAY_LEN;
      th.className = 'tool-hud clock';
      th.querySelector('.tool-dial').style.setProperty('--sun', (t * 360).toFixed(1) + 'deg');
      const hours = (t * 24 + 6) % 24, hh = Math.floor(hours), mm = Math.floor((hours - hh) * 60 / 10) * 10;
      th.querySelector('.tool-text').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${g.env.day > 0.45 ? 'Day' : 'Night'}`;
    }
  },
  findArrow() {
    const inv = this.player.inv;
    if (inv.offhand && inv.offhand.id === 'arrow') return 'off';
    return inv.count('arrow') > 0 ? 'bag' : null;
  },
  shootArrow(power) {
    const g = this.g, p = this.player, inv = p.inv;
    const from = this.findArrow();
    if (!from && !g.creative) return;
    if (!g.creative) { if (from === 'off') { inv.offhand.n--; if (inv.offhand.n <= 0) inv.offhand = null; } else inv.remove('arrow', 1); }
    const [dx, dy, dz] = p.look(), sp = 8 + power * 30;
    const a = new Arrow(g, p.x + dx * 0.4, p.y + p.eye - 0.1 + dy * 0.4, p.z + dz * 0.4, dx * sp, dy * sp, dz * sp, this, 3 + power * 6, !g.creative);
    g.addEntity(a);
    g.sfx.play('bow');
    this.wearHeld(1);
  },
});

// ---- the world's side ---------------------------------------------------------------------------
Object.assign(Game.prototype, {
  // A stem at full size sets a pumpkin or melon on soil beside it.
  stemFruit(x, y, z, d) {
    const w = this.world, fruit = B[d.crop.fruit];
    for (const k of [0, 1, 2, 3].sort(() => Math.random() - 0.5)) {
      const fx = x + DIRX[k], fz = z + DIRZ[k];
      if (w.getBlock(fx, y, fz) === fruit) return;
      if (w.getBlock(fx, y, fz) === 0 && SOIL_IDS().includes(w.getBlock(fx, y - 1, fz))) { w.setBlock(fx, y, fz, fruit, 0); return; }
    }
  },
  // Random ticks for the new growing things (called from World.randomTicks).
  growExtra(x, y, z, id, meta, rnd) {
    const w = this.world, d = BLOCKS[id];
    // grass creeps slowly onto bare dirt in the light, and dies under a roof
    if (T_GRASSY[id]) {
      if (rnd() > 1 / 30) return;
      this.grassTick(x, y, z, id, rnd);
      return;
    }
    if (d.crop && d.crop.fruit) { if ((meta & 15) >= d.crop.stages - 1 && rnd() < 1 / 340) this.stemFruit(x, y, z, d); return; }
    return this.growExtra2(x, y, z, id, meta, rnd, d);
  },
  grassTick(x, y, z, id, rnd) {
    const w = this.world;
    {
      const above = w.getBlock(x, y + 1, z);
      if ((T_OPAQUE[above] && T_SOLID[above] && !BLOCKS[above].isLog) || T_LIQUID[above]) { if (this.rules().grassSpread) w.setBlock(x, y, z, B.dirt, 0, { quiet: true }); return; }
      if (!this.rules().grassSpread) return;
      const tx = x + Math.floor(rnd() * 3) - 1, ty = y + Math.floor(rnd() * 5) - 3, tz = z + Math.floor(rnd() * 3) - 1;
      if (w.getBlock(tx, ty, tz) !== B.dirt) return;
      const a = w.getBlock(tx, ty + 1, tz);
      if (T_OPAQUE[a] || T_LIQUID[a]) return;
      const l = w.getLight(tx, ty + 1, tz);
      if (Math.max(l >> 4, l & 15) < 9) return;
      w.setBlock(tx, ty, tz, id, 0, { quiet: true });
    }
  },
  growExtra2(x, y, z, id, meta, rnd, d) {
    const w = this.world;
    if (id === B.bamboo) {
      if (rnd() > 1 / 205) return;
      let h = 1; while (h < 16 && w.getBlock(x, y - h, z) === id) h++;
      if (w.getBlock(x, y + 1, z) === 0 && h < 12 + (hash32(x, 0, z, 3) % 5)) w.setBlock(x, y + 1, z, id, 0);
      return;
    }
    if (id === B.twisting_vines) { if (rnd() < 1 / 680 && w.getBlock(x, y + 1, z) === 0) { let h = 1; while (h < 26 && w.getBlock(x, y - h, z) === id) h++; if (h < 25) w.setBlock(x, y + 1, z, id, 0); } return; }
    if (id === B.weeping_vines || id === B.cave_vines) {
      if (rnd() < 1 / 680 && w.getBlock(x, y - 1, z) === 0) { let h = 1; while (h < 26 && BLOCKS[w.getBlock(x, y + h, z)].hangs) h++; if (h < 25) w.setBlock(x, y - 1, z, id === B.cave_vines && rnd() < 0.15 ? B.cave_vines_lit : id, 0); }
      else if (id === B.cave_vines && rnd() < 1 / 60) w.setBlock(x, y, z, B.cave_vines_lit, meta);
      return;
    }
    if (d.hive) { if ((meta & 0x0c) !== 0x0c && rnd() < 1 / 140) w.setBlock(x, y, z, id, meta + 4, { quiet: true }); return; }
    if (id === B.redstone_ore_lit) { this.oreFade(x, y, z, rnd); return; }
    if (d.puddle || id === B.snow_layer) { if (this.weather) this.weather.blockTick(x, y, z, id, meta, rnd); return; }
    // a piston block left mid-move (the game closed during the slide) settles back to air
    if (id === B.moving_block) { if (!this.entities.some(e => e instanceof PistonAnim)) w.setBlock(x, y, z, 0); return; }
    if (id === B.budding_amethyst) {
      if (rnd() > 1 / 340) return;
      const k = Math.floor(rnd() * 6), [dx, dy, dz] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]][k];
      if (dy !== 1) return; // buds are drawn standing up, so they only grow on top
      const nid = w.getBlock(x + dx, y + dy, z + dz);
      const next = nid === 0 ? B.small_amethyst_bud : nid === B.small_amethyst_bud ? B.medium_amethyst_bud : nid === B.medium_amethyst_bud ? B.large_amethyst_bud : nid === B.large_amethyst_bud ? B.amethyst_cluster : -1;
      if (next >= 0) w.setBlock(x + dx, y + dy, z + dz, next, 0);
    }
  },
  // Jukeboxes: one tune each, quieter the further away you are.
  startDisc(x, y, z, tune) {
    const s = this.sfx; s.unlock(); if (!s.ctx) return;
    this.stopDisc(x, y, z);
    const gain = s.ctx.createGain(); gain.gain.value = 0; gain.connect(s.master);
    const len = s.disc(tune, gain);
    (this.jukeboxes || (this.jukeboxes = new Map())).set(x + ',' + y + ',' + z, { x, y, z, gain, end: this.time + len });
    this.updateJukeboxes();
  },
  stopDisc(x, y, z) {
    const k = x + ',' + y + ',' + z, j = this.jukeboxes && this.jukeboxes.get(k);
    if (!j) return;
    try { j.gain.gain.cancelScheduledValues(0); j.gain.gain.value = 0; j.gain.disconnect(); } catch (e) { }
    this.jukeboxes.delete(k);
  },
  updateJukeboxes() {
    if (!this.jukeboxes || !this.jukeboxes.size) return;
    for (const [k, j] of this.jukeboxes) {
      if (this.time > j.end || !this.world || !BLOCKS[this.world.getBlock(j.x, j.y, j.z)].jukebox) { this.stopDisc(j.x, j.y, j.z); continue; }
      let d = Infinity; for (const l of this.locals) d = Math.min(d, Math.hypot(l.player.x - j.x - 0.5, l.player.y - j.y, l.player.z - j.z - 0.5));
      j.gain.gain.value = clamp(1 - (d - 4) / 44, 0, 1);
    }
  },
});

// ---- farm animals: cows, pigs, sheep and chickens ---------------------------------------------
// p is whoever the animal is looking at (a LocalPlayer, or someone over LAN): the inventory is on their player
const holdsFood = (p, T) => { const who = p && (p.player || p), inv = who && who.inv; return !!(inv && T.food && [inv.held, inv.offhand].some(s => s && T.food.includes(s.id))); };
function hearts(g, x, y, z, n = 5) {
  for (let i = 0; i < n; i++) g.particles.add({ x: x + (Math.random() - 0.5) * 0.6, y: y + Math.random() * 0.4, z: z + (Math.random() - 0.5) * 0.6, vx: 0, vy: 0.6, vz: 0, life: 1, max: 1, size: 0.12, uv: tileUV(ATLAS.tile.heart_particle ?? 0), light: 0xFF, grav: 0 });
}
Object.assign(Mob.prototype, {
  // Follow whoever holds our food; when in love, go and find a mate.
  farmAI(dt, p, dist, toPlayer) {
    const g = this.game;
    if (this.loveT > 0) {
      this.loveT -= dt;
      if (Math.random() < dt * 3) hearts(g, this.x, this.y + this.h, this.z, 1);
      let mate = null, md = 8;
      for (const e of g.entities) if (e !== this && e instanceof Mob && e.type === this.type && e.alive && e.loveT > 0 && !e.baby) { const d = Math.hypot(e.x - this.x, e.z - this.z); if (d < md) { md = d; mate = e; } }
      if (mate) {
        if (md < 1.2 + this.w) { this.breedWith(mate); return { want: 0, dir: this.yaw }; }
        return { want: this.T.speed, dir: Math.atan2(-(mate.x - this.x), -(mate.z - this.z)) };
      }
    }
    if (p && dist < 9 && holdsFood(p, this.T)) return { want: dist > 2.2 ? this.T.speed * 1.1 : 0, dir: toPlayer };
    return null;
  },
  breedWith(mate) {
    const g = this.game;
    this.loveT = mate.loveT = 0; this.breedCd = mate.breedCd = 300;
    const baby = new Mob(g, this.type, (this.x + mate.x) / 2, Math.max(this.y, mate.y) + 0.1, (this.z + mate.z) / 2);
    baby.makeBaby();
    if (this.T.woolly) baby.color = Math.random() < 0.5 ? this.color : mate.color;
    if (this.variant) baby.variant = Math.random() < 0.5 ? this.variant : (mate.variant || this.variant);
    g.addEntity(baby);
    this.kept = mate.kept = true;
    hearts(g, baby.x, baby.y + 0.5, baby.z, 7);
    g.sfx.playAt(this.T.sound || 'pop', baby.x, baby.y, baby.z);
    const lp = g.locals.find(l => Math.hypot(l.player.x - baby.x, l.player.z - baby.z) < 16);
    if (lp) lp.grantXP(1 + Math.floor(Math.random() * 7), baby.x, baby.y + 1, baby.z);
  },
  // Growing up, laying eggs, regrowing wool.
  farmTick(dt) {
    const g = this.game, w = g.world;
    if (this.breedCd > 0) this.breedCd -= dt;
    if (this.baby) { this.growT -= dt; if (this.growT <= 0) this.grow(); }
    if (this.T.layer && !this.baby) {
      this.eggT -= dt;
      if (this.eggT <= 0) { this.eggT = 300 + Math.random() * 300; g.dropItem(mkStack('egg', 1), this.x, this.y + 0.3, this.z, false); g.sfx.playAt('pop', this.x, this.y, this.z); }
    }
    if (this.T.woolly && this.sheared && this.onGround && Math.random() < dt / 45) {
      const bx = Math.floor(this.x), by = Math.floor(this.y - 0.1), bz = Math.floor(this.z);
      if (w.getBlock(bx, by, bz) === B.grass) { w.setBlock(bx, by, bz, B.dirt); this.sheared = false; g.burst(this.x, this.y + 0.2, this.z, 'grass', 6, 0.5); }
      else if (w.getBlock(bx, by + 1, bz) === B.tall_grass) { w.setBlock(bx, by + 1, bz, 0); this.sheared = false; }
    }
  },
});
Object.assign(LocalPlayer.prototype, {
  // Feeding, milking, shearing and dyeing animals. Returns true when something happened.
  useOnAnimal(e, held, def) {
    const g = this.g, p = this.player;
    if (!(e instanceof Mob) || !e.alive || !e.T.farm) return false;
    if (held && e.T.food && e.T.food.includes(held.id)) {
      if (e.baby) { e.growT -= 60; }
      else if (e.loveT > 0 || e.breedCd > 0) return true;
      else e.loveT = 30;
      if (!g.creative) { held.n--; if (held.n <= 0) p.inv.held = null; }
      e.kept = true; hearts(g, e.x, e.y + e.h, e.z, e.baby ? 2 : 5); g.sfx.play('eat'); this.swingArm();
      return true;
    }
    if (e.type === 'cow' && def && def.bucket === 'empty' && !e.baby) {
      held.n--; const milk = mkStack('milk_bucket', 1); if (held.n <= 0) p.inv.held = milk; else this.give(milk);
      g.sfx.play('bucket'); this.swingArm(); e.kept = true; return true;
    }
    if (e.T.woolly && def && def.shears && !e.sheared && !e.baby) {
      e.sheared = true; e.kept = true;
      g.dropItem(mkStack(e.color === 'white' ? 'wool' : e.color + '_wool', 1 + Math.floor(Math.random() * 3)), e.x, e.y + 1, e.z, true);
      this.wearHeld(1); g.sfx.play('shear'); this.swingArm(); return true;
    }
    if (e.T.woolly && def && def.dye && def.dye !== e.color) {
      e.color = def.dye; e.kept = true;
      held.n--; if (held.n <= 0) p.inv.held = null;
      g.sfx.play('click'); this.swingArm(); return true;
    }
    return false;
  },
});
