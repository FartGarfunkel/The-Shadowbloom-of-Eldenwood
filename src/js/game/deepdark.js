// ---------------------------------------------------------------------------
// game/deepdark.js — 0.9.0.20: the Deep Dark.
//
// Far down under some parts of the Overworld, just above the lava, the caves
// open into great dark halls of deepslate grown over with sculk: a living
// crust that listens. Sculk sensors twitch at every footstep; sculk shriekers
// scream, and each scream brings the dark down over your eyes and something
// closer. On the fourth, it comes: the Warden, blind, huge, following every
// sound you make. Sneak, and it can't hear you. Wake it and it will find you,
// and what it can't reach it strikes with a blast of sound through stone.
// Left in peace for a minute, it digs back down.
//
// Here and there in the Deep Dark lie the Ancient Cities: houses and halls of
// deepslate round a great gate of stone nobody can break, with chests of old
// treasure: echo shards, enchanted books (Swift Sneak among them) and more.
// A sculk catalyst, where something dies near it, spreads the sculk.
// ---------------------------------------------------------------------------
const DEEP_TOP = 34;                        // the Deep Dark is below this
// ---- where it is ---------------------------------------------------------------------------------------------------
WorldGen.prototype.deepZone = function (x, z) {
  if (this.dim !== 0 || (this.genVersion || 1) < 3) return 0;
  const n = this.nDeep || (this.nDeep = new SimplexNoise(this.seed ^ 0xDEE9));
  return smoothstep(0.32, 0.46, n.fbm2(x / 260, z / 260, 3));
};
{
  const baseGen = WorldGen.prototype.generate;
  WorldGen.prototype.generate = function (ch) {
    const r = baseGen.call(this, ch);
    if (this.dim !== 0 || (this.genVersion || 1) < 3) return r;
    const bx = ch.cx * 16, bz = ch.cz * 16;
    // a quick look at the corners and middle: is any of this chunk in it?
    let any = false;
    for (const [dx, dz] of [[0, 0], [15, 0], [0, 15], [15, 15], [8, 8]]) if (this.deepZone(bx + dx, bz + dz) > 0) { any = true; break; }
    if (!any) return r;
    try { this.carveDeep(ch); } catch (e) { console.warn('deep dark', e); }
    ch.recomputeMaxY();
    return r;
  };
}
WorldGen.prototype.carveDeep = function (ch) {
  const bx = ch.cx * 16, bz = ch.cz * 16, NB = ch.blocks;
  const nC = this.nDeepC || (this.nDeepC = new SimplexNoise(this.seed ^ 0xDEEC));
  const cities = this.structsNearKind ? this.structsNearKind(ANCIENT_CITY.idx, bx + 8, bz + 8, 12) : [];
  const inCity = (x, z) => cities.some(S => x >= S.x0 && x <= S.x1 && z >= S.z0 && z <= S.z1);
  const ST = B.stone, SL = B.slate, AIR = 0, SC = B.sculk, VE = B.sculk_vein;
  const rockish = (id) => id === ST || id === SL || id === B.granite || id === B.diorite || id === B.andesite || id === B.tuff || id === B.dirt || id === B.gravel || id === B.cobbled_slate;
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
    const wx = bx + lx, wz = bz + lz, zone = this.deepZone(wx, wz);
    if (zone <= 0) continue;
    const h = this.column(wx, wz).h, city = inCity(wx, wz);
    // the rock turns to deepslate, and great halls open in it
    for (let y = 12; y < DEEP_TOP + 4; y++) {
      const i = cidx(lx, y, lz), id = NB[i];
      if (id === ST && y < DEEP_TOP + (hashFloat(wx, y, wz, 31) * 4 | 0)) NB[i] = SL;
      if (city || y > DEEP_TOP - 2 || y >= h - 12) continue;
      const v = nC.noise3(wx / 30, y / 11, wz / 30) + nC.noise3(wx / 11, y / 7, wz / 11) * 0.25;
      if (v + (zone - 1) * 0.7 - Math.max(0, (y - 26)) * 0.06 > 0.2 && !T_LIQUID[NB[i]]) NB[i] = AIR;
    }
    // sculk over the floors, veins up the walls and over the roof
    for (let y = 13; y < DEEP_TOP; y++) {
      const i = cidx(lx, y, lz);
      if (NB[i] !== AIR) continue;
      const below = NB[cidx(lx, y - 1, lz)], above = y + 1 < CH ? NB[cidx(lx, y + 1, lz)] : 0, r = hashFloat(wx, y, wz, this.seed ^ 0x5c1);
      const patch = nC.noise3(wx / 9, y / 9, wz / 9) > -0.15 + (1 - zone) * 0.6;
      if (rockish(below) && patch) {
        NB[cidx(lx, y - 1, lz)] = SC;
        if (city) continue;
        if (r < 0.010) NB[i] = B.sculk_sensor;
        else if (r < 0.014) { NB[i] = B.sculk_shrieker; ch.meta[i] = 1; }       // one that can call it
        else if (r < 0.0155) NB[cidx(lx, y - 1, lz)] = B.sculk_catalyst;
        else if (r < 0.2) NB[i] = VE;
      } else if (rockish(above) && patch && r < 0.35) NB[cidx(lx, y + 1, lz)] = SC;
    }
  }
};

// ---- the Ancient Cities ---------------------------------------------------------------------------------------------------
STRUCT_LOOT.ancient_city = [['echo_shard', 1, 3, 0.55], ['enchanted_book', 1, 1, 0.35], ['golden_apple', 1, 2, 0.25], ['experience_bottle', 1, 4, 0.4], ['diamond', 1, 3, 0.25], ['sculk_sensor', 1, 3, 0.2],
  ['candle', 1, 4, 0.3], ['amethyst_shard', 1, 8, 0.3], ['diamond_leggings', 1, 1, 0.08], ['heart_crystal', 1, 1, 0.1], ['emerald', 3, 9, 0.4], ['soul_lantern', 1, 2, 0.2], ['lore_deepdark', 1, 1, 0.3], ['tome_ward', 1, 1, 0.08]];
const ANCIENT_CITY = defStruct({
  key: 'ancient_city', name: 'an Ancient City', reg: 512, chance: 0.85, margin: 70, dims: [0],
  plan(gen, x0, z0, rnd) {
    if ((gen.genVersion || 1) < 3) return null;
    // somewhere in the region where the Deep Dark is deepest
    for (let t = 0; t < 24; t++) {
      const x = t ? x0 + Math.round((rnd() - 0.5) * 360) : x0, z = t ? z0 + Math.round((rnd() - 0.5) * 360) : z0;
      if (gen.deepZone(x, z) < 0.9 || gen.deepZone(x + 30, z) < 0.6 || gen.deepZone(x - 30, z) < 0.6 || gen.deepZone(x, z + 30) < 0.6 || gen.deepZone(x, z - 30) < 0.6) continue;
      if (gen.column(x, z).h < 40) continue;
      return { x0: x - 38, x1: x + 38, z0: z - 38, z1: z + 38, y: 14, cx: x, cz: z, rot: Math.floor(rnd() * 2), spawners: [], name: 'an Ancient City' };
    }
    return null;
  },
  build: (P, S) => buildAncientCity(P, S),
});
function buildAncientCity(P, S) {
  const { cx, cz, y } = S, fy = y - 1;
  const brick = (x, yy, z) => P.pick(['slate_bricks', 'slate_bricks', 'slate_tiles', 'cracked_slate_bricks', 'polished_slate'], x, yy, z, 4);
  // the hall it stands in: a dome of dark air over a floor of deepslate tiles, sculk creeping in from the edges
  for (let z = cz - 38; z <= cz + 38; z++) for (let x = cx - 38; x <= cx + 38; x++) {
    if (!P.in(x, z)) continue;
    const d = Math.hypot(x - cx, z - cz) / 37;
    if (d > 1) continue;
    const top = y + Math.round(16 - d * d * 11);
    P.put(x, fy - 1, z, 'slate');
    P.put(x, fy, z, d > 0.82 || P.h(x, 0, z, 2) < d * 0.35 ? 'sculk' : P.h(x, 1, z, 3) < 0.5 ? 'slate_tiles' : 'polished_slate');
    for (let yy = y; yy <= top; yy++) P.put(x, yy, z, 'air');
    P.put(x, top + 1, z, 'slate');
    if (d > 0.7 && P.h(x, 2, z, 5) < 0.25) P.put(x, y, z, 'sculk_vein');
  }
  // the gate: a great arch of reinforced deepslate on a stepped dais
  const G = (a, b) => S.rot ? [cx + b, cz + a] : [cx + a, cz + b];      // a along the gate, b across it
  for (let a = -13; a <= 13; a++) for (let b = -5; b <= 5; b++) {
    const [x, z] = G(a, b), step = Math.max(Math.abs(a) - 10, Math.abs(b) - 3, 0);
    for (let yy = y; yy < y + 2 - Math.min(2, step); yy++) P.put(x, yy, z, brick(x, yy, z));
  }
  const gy = y + 2;
  for (let a = -9; a <= 9; a++) for (let b = -1; b <= 1; b++) {
    const [x, z] = G(a, b);
    const pillar = Math.abs(a) >= 7, top = gy + (pillar ? 13 : 0);
    if (pillar) for (let yy = gy; yy <= gy + 13; yy++) P.put(x, yy, z, 'reinforced_deepslate');
    // the lintel, stepping down at its ends
    const ly = gy + 11 + (Math.abs(a) <= 4 ? 2 : Math.abs(a) <= 6 ? 1 : 0);
    for (let yy = gy + 11; yy <= ly; yy++) P.put(x, yy, z, 'reinforced_deepslate');
    if (!pillar && b === 0 && P.h(x, gy, z, 9) < 0.4) P.put(x, gy, z, 'sculk_vein');
  }
  // soul lanterns hung from the lintel, candles on the dais, chests before the gate
  for (const a of [-5, 0, 5]) { const [x, z] = G(a, 0); P.put(x, gy + 10, z, 'soul_lantern'); }
  for (const [a, b] of [[-11, -4], [11, -4], [-11, 4], [11, 4]]) { const [x, z] = G(a, b); P.put(x, y + 1, z, 'candle'); }
  { const [x, z] = G(-3, -4); P.chest(x, gy, z, 2, 'ancient_city'); }
  { const [x, z] = G(3, -4); const i = P.chest(x, gy, z, 2, 'ancient_city'); if (i >= 0) { const be = P.ch.blockEntities.get(i); if (be && be.items) { let s = 13; while (be.items[s] && s < 26) s++; be.items[s] = { id: 'enchanted_book', n: 1, en: { swift: 1 + Math.floor(P.h(x, gy, z, 13) * 3) } }; } } }
  // the shriekers that guard it (these can call the Warden), and sensors all round
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * TAU + 0.3, r = k % 2 ? 13 : 30, x = Math.round(cx + Math.cos(a) * r), z = Math.round(cz + Math.sin(a) * r);
    if (P.in(x, z)) { P.put(x, fy, z, 'sculk'); P.put(x, y, z, 'sculk_shrieker', 1); }
  }
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * TAU + 0.9, r = 17 + (k % 3) * 5, x = Math.round(cx + Math.cos(a) * r), z = Math.round(cz + Math.sin(a) * r);
    if (P.in(x, z)) { P.put(x, fy, z, 'sculk'); P.put(x, y, z, 'sculk_sensor'); }
  }
  // the houses: a ring of six round the gate, each with a door towards it
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * TAU + 0.52, hx = Math.round(cx + Math.cos(a) * 24), hz = Math.round(cz + Math.sin(a) * 24);
    const doorX = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a));
    const dsx = doorX ? -Math.sign(Math.cos(a)) : 0, dsz = doorX ? 0 : -Math.sign(Math.sin(a));
    P.fill(hx - 4, y, hz - 4, hx + 4, y + 5, hz + 4, brick);
    P.fill(hx - 3, y, hz - 3, hx + 3, y + 4, hz + 3, 'air');
    P.fill(hx - 4, y + 6, hz - 4, hx + 4, y + 6, hz + 4, (x, yy, z) => (Math.abs(x - hx) + Math.abs(z - hz)) % 2 ? 'slate_tiles' : 'slate_brick_slab');
    P.fill(hx + dsx * 4, y, hz + dsz * 4, hx + dsx * 4, y + 2, hz + dsz * 4, 'air');
    for (const [wx, wz] of [[hx + 4 * (doorX ? 0 : 1), hz + 4 * (doorX ? 1 : 0)], [hx - 4 * (doorX ? 0 : 1), hz - 4 * (doorX ? 1 : 0)]]) P.put(wx, y + 2, wz, 'iron_bars');
    P.put(hx, y + 4, hz, 'soul_lantern');
    P.chest(hx - dsx * 3 + (doorX ? 0 : 2), y, hz - dsz * 3 + (doorX ? 2 : 0), 0, 'ancient_city');
    P.put(hx - dsx * 3 - (doorX ? 0 : 2), y, hz - dsz * 3 - (doorX ? 2 : 0), 'candle');
    for (let t = 0; t < 4; t++) { const x = hx - 2 + Math.floor(P.h(hx, t, hz, 21) * 5), z = hz - 2 + Math.floor(P.h(hx, t, hz, 22) * 5); if (P.get(x, y, z) === 0) P.put(x, y, z, 'sculk_vein'); }
    // a path of polished deepslate to the dais
    for (let s = 5; s < 14; s++) { const x = Math.round(hx - Math.cos(a) * s), z = Math.round(hz - Math.sin(a) * s); P.put(x, fy, z, 'polished_slate'); }
  }
}
{
  // its story, in a book
  LORE.deepdark = ['The Silent City', 'We built it deep, where nothing could hear us. Then we learned that something could.\n\nWalk softly there. Do not run. When the crust begins to scream, it is telling you how close it is, and the fourth time it screams, it is no longer telling you anything.\n\nIt cannot see. It does not need to.'];
  LORE_KEYS.push('deepdark');
  defItem('lore_deepdark', { name: 'Old Book: ' + LORE.deepdark[0], maxStack: 1, icon: 'lore_book', lore: 'deepdark', rarity: 'rare', desc: 'Use it to read it.' });
}

// ---- things from the Deep Dark ------------------------------------------------------------------------------------------------
defItem('echo_shard', { name: 'Echo Shard', rarity: 'rare', desc: 'It hums with every sound around it. Found in the Ancient Cities.' });
defItem('echo_charm', { name: 'Echo Charm', rarity: 'epic', maxStack: 1, charm: { silent: 1 }, desc: 'Worn on the belt: your steps make no sound the sculk can hear.' });
RECIPES.push({ out: 'echo_charm', n: 1, shape: ['EEE', 'EGE', 'EEE'], key: { E: 'echo_shard', G: 'gold_ingot' } });
ENCH.swift = { name: 'Swift Sneak', max: 3, on: ['legs'], w: 1, treasure: true, desc: 'Move faster while sneaking or crawling' };
{
  const baseMove = Player.prototype.move;
  Player.prototype.move = function (world, inp, dt, opts) {
    const legs = this.inv && this.inv.armor && this.inv.armor.slots[2], lv = legs ? enchLv(legs, 'swift') : 0;
    if (lv && (inp.sneak || this.crawling) && !this.flying) opts = Object.assign({}, opts, { slow: (opts.slow || 1) * (1 + lv * 0.45) });
    return baseMove.call(this, world, inp, dt, opts);
  };
}
SHAPES.sculk_vein = [{ b: [0, 0, 0, 16, 0.4, 16], side: 'sculk_vein', end: 'sculk_vein', nocol: true }];
SHAPES.sculk_sensor = [
  { b: [0, 0, 0, 16, 8, 16], side: 'sculk_sensor_side', end: 'sculk_sensor_top' },
  { b: [3, 8, 3, 4, 16, 4], side: 'sculk_tendril', end: 'sculk_tendril', nocol: true }, { b: [12, 8, 3, 13, 16, 4], side: 'sculk_tendril', end: 'sculk_tendril', nocol: true },
  { b: [3, 8, 12, 4, 16, 13], side: 'sculk_tendril', end: 'sculk_tendril', nocol: true }, { b: [12, 8, 12, 13, 16, 13], side: 'sculk_tendril', end: 'sculk_tendril', nocol: true },
];
SHAPES.sculk_shrieker = [
  { b: [0, 0, 0, 16, 8, 16], side: 'sculk_shrieker_side', end: 'sculk_shrieker_top' },
  { b: [1, 8, 1, 15, 9, 15], side: 'sculk_shrieker_inner', end: 'sculk_shrieker_inner', nocol: true },
  { b: [1, 8, 1, 15, 15, 3], side: 'shrieker_bone', end: 'shrieker_bone' }, { b: [1, 8, 13, 15, 15, 15], side: 'shrieker_bone', end: 'shrieker_bone' },
  { b: [1, 8, 3, 3, 15, 13], side: 'shrieker_bone', end: 'shrieker_bone' }, { b: [13, 8, 3, 15, 15, 13], side: 'shrieker_bone', end: 'shrieker_bone' },
];

// ---- listening: footsteps, blocks broken and placed, falls ---------------------------------------------------------------------
// the sensors, shriekers and catalysts in a chunk, found once (and again when one there changes)
const SCULK_IDS = new Set([B.sculk_sensor, B.sculk_shrieker, B.sculk_catalyst]);
function sculkCells(ch) {
  if (ch._sk) return ch._sk;
  const out = [], bx = ch.cx * 16, bz = ch.cz * 16, top = Math.min(CH - 1, DEEP_TOP + 20);
  for (let y = 1; y <= top; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) { const i = cidx(x, y, z), id = ch.blocks[i]; if (SCULK_IDS.has(id)) out.push([bx + x, y, bz + z, id, ch.meta[i]]); }
  return (ch._sk = out);
}
function sculkNear(g, x, y, z, r) {
  const w = g.world, out = [];
  for (let cz = Math.floor(z - r) >> 4; cz <= Math.floor(z + r) >> 4; cz++) for (let cx = Math.floor(x - r) >> 4; cx <= Math.floor(x + r) >> 4; cx++) {
    const ch = w.chunkAt(cx, cz); if (!ch || !ch.blocks) continue;
    for (const c of sculkCells(ch)) if (Math.hypot(c[0] + 0.5 - x, c[1] + 0.5 - y, c[2] + 0.5 - z) <= r) out.push(c);
  }
  return out;
}
const SCULK_CD = new Map();
function vibrate(g, x, y, z, src, kind) {
  if (!g.world || g.dim !== 0 || g.isGuest) return;
  const P = src && (src.player || src);
  if (P && P.inv && P.inv.charmBonus && P.inv.charmBonus('silent') > 0) return;
  const V = g._vibes || (g._vibes = []);
  V.push({ x, y, z, src, t: g.time, kind });
  if (V.length > 48) V.shift();
  if (y > DEEP_TOP + 14) return;
  for (const [sx, sy, sz, id, meta] of sculkNear(g, x, y, z, 8)) {
    const key = sx + ',' + sy + ',' + sz, now = g.time;
    if (id === B.sculk_sensor) {
      if ((SCULK_CD.get(key) || -9) > now - 1) continue;
      SCULK_CD.set(key, now);
      g.sfx.playAt('sculk_click', sx + 0.5, sy + 0.6, sz + 0.5, 16);
      for (let k = 0; k < 6; k++) g.burst(sx + 0.5, sy + 0.8, sz + 0.5, 'sculk_glow', 1, 0.6, -0.5);
      // a sensor's twitch carries to the shriekers round it
      if (src) for (const [hx, hy, hz, hid, hm] of sculkNear(g, sx + 0.5, sy + 0.5, sz + 0.5, 8)) if (hid === B.sculk_shrieker) shriek(g, hx, hy, hz, hm & 1, src);
    } else if (id === B.sculk_shrieker && src) shriek(g, sx, sy, sz, meta & 1, src);
  }
}
function shriek(g, x, y, z, summoner, src) {
  const key = 'sh' + x + ',' + y + ',' + z, now = g.time;
  if ((SCULK_CD.get(key) || -99) > now - 10) return;
  SCULK_CD.set(key, now);
  g.sfx.playAt('sculk_shriek', x + 0.5, y + 1, z + 0.5, 48);
  for (let k = 0; k < 4; k++) setTimeout(() => { if (g.world) g.burst(x + 0.5, y + 1.2 + k * 0.4, z + 0.5, 'sculk_soul', 6, 0.8, -1.5); }, k * 180);
  for (const l of g.allLocals ? g.allLocals() : g.locals) if (l.player.dim === g.dim && Math.hypot(l.player.x - x, l.player.y - y, l.player.z - z) < 40) l.darkT = Math.max(l.darkT || 0, 12);
  const W = g.meta.deepWarn || (g.meta.deepWarn = { lvl: 0, t: 0 });
  // the warning ebbs away over ten minutes of quiet
  W.lvl = Math.max(0, W.lvl - Math.floor((g.time - W.t) / 600)); W.t = g.time;
  W.lvl++;
  const near = (g.allLocals ? g.allLocals() : g.locals).filter(l => Math.hypot(l.player.x - x, l.player.z - z) < 40);
  const say = (m, k) => { for (const l of near) l.toast(m, k); };
  if (W.lvl === 1) say('The sculk shrieks. Something far below stirs…', 'warn');
  else if (W.lvl === 2) say('Another shriek. It is listening…', 'warn');
  else if (W.lvl === 3) say('It is coming closer…', 'warn');
  else if (summoner && !g.entities.some(e => e.type === 'warden' && !e.remove && Math.hypot(e.x - x, e.z - z) < 48)) {
    if (summonWarden(g, x, y, z)) { W.lvl = 3; say('It is here.', 'epic'); }
  }
}
function summonWarden(g, x, y, z) {
  const w = g.world;
  for (let t = 0; t < 80; t++) {
    // roomy spots first; then anywhere it can stand (it shoulders its way out)
    const loose = t >= 40, a = Math.random() * TAU, d = 2 + Math.random() * 8, wx = Math.floor(x + Math.cos(a) * d), wz = Math.floor(z + Math.sin(a) * d);
    for (let yy = y + 3; yy >= y - 4; yy--) {
      if (!T_SOLID[w.getBlock(wx, yy - 1, wz)]) continue;
      let room = true;
      const R = loose ? 0 : 1;
      for (let dy = 0; dy < 3 && room; dy++) for (let dz = -R; dz <= R && room; dz++) for (let dx = -R; dx <= R; dx++) if (T_SOLID[w.getBlock(wx + dx, yy + dy, wz + dz)] || T_LIQUID[w.getBlock(wx + dx, yy + dy, wz + dz)]) { room = false; break; }
      if (!room) continue;
      const e = g.addEntity(new Mob(g, 'warden', wx + 0.5, yy, wz + 0.5));
      e.kept = true; e.emergeT = 4.5; e.y0 = yy; e.yaw = Math.atan2(-(x - wx), -(z - wz));
      g.sfx.playAt('warden_emerge', wx + 0.5, yy, wz + 0.5, 60);
      return true;
    }
  }
  return false;
}
{
  // footsteps (not when sneaking), landings
  const baseLP = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const p = this.player, g = this.g, wasGround = p.onGround, vy0 = p.vy;
    const r = baseLP.call(this, dt, inp);
    if (g.state !== 'playing' || p.dead || g.dim !== 0) { this.darkTick(dt); return r; }
    if (p.y < DEEP_TOP + 14) {
      const hs = Math.hypot(p.vx, p.vz);
      if (p.onGround && hs > 1.2 && !p.sneaking && !p.crawling && (this._stepT = (this._stepT || 0) - dt) <= 0) { this._stepT = p.sprinting ? 0.3 : 0.5; vibrate(g, p.x, p.y, p.z, this, 'step'); }
      if (!wasGround && p.onGround && vy0 < -6) vibrate(g, p.x, p.y, p.z, this, 'land');
    }
    this.darkTick(dt);
    return r;
  };
  // the darkness: the edges of your sight closing in, pulsing like a heartbeat
  LocalPlayer.prototype.darkTick = function (dt) {
    const g = this.g;
    if (this.darkT > 0) this.darkT -= dt;
    // near a Warden it never quite lifts
    if (g.dim === 0 && (this._wdT = (this._wdT || 0) - dt) <= 0) { this._wdT = 0.5; const p = this.player; if (g.entities.some(e => e.type === 'warden' && e.alive && Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z) < 20)) this.darkT = Math.max(this.darkT || 0, 3); }
    if (!this.el) return;
    let fx = this._darkEl;
    if (!fx) { fx = this._darkEl = document.createElement('div'); fx.className = 'fx fx-dark'; Object.assign(fx.style, { position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 8%, rgba(0,0,0,0.82) 48%, rgba(0,0,0,0.97) 75%)', opacity: '0' }); this.el.prepend(fx); }
    const k = this.darkT > 0 ? Math.min(1, this.darkT / 1.5) * (0.62 + 0.38 * Math.sin(g.time * 1.9)) : 0;
    fx.style.opacity = k.toFixed(2); fx.hidden = k <= 0.01;
  };
  // blocks broken and set down near someone
  const baseChanged = Game.prototype.onBlockChanged;
  Game.prototype.onBlockChanged = function (x, y, z, o, n, opts) {
    const r = baseChanged.call(this, x, y, z, o, n, opts);
    if ((SCULK_IDS.has(o) || SCULK_IDS.has(n)) && this.world) { const ch = this.world.chunkAt(x >> 4, z >> 4); if (ch) ch._sk = null; }
    if (this.dim === 0 && y < DEEP_TOP + 14 && !this.isGuest && o !== n && this.locals) {
      const lp = this.locals.find(l => Math.hypot(l.player.x - x - 0.5, l.player.y - y, l.player.z - z - 0.5) < 6);
      if (lp && !(lp.player.sneaking && BLOCKS[n] && BLOCKS[n].key === 'sculk_vein')) vibrate(this, x + 0.5, y + 0.5, z + 0.5, lp, 'block');
    }
    return r;
  };
}

// ---- the Warden ------------------------------------------------------------------------------------------------------------------
MODEL_DEFS.warden = bipedRig({
  head: [16, 16, 10], body: [18, 21, 11], arm: [8, 28, 8], leg: [6, 13, 6], shoulder: 3,
  tex: { head: { all: 'warden_skin', front: 'warden_face' }, body: { all: 'warden_skin', front: 'warden_chest' }, arm: 'warden_skin', leg: 'warden_skin' },
  extras: [
    ['tendrilL', 'head', [-7, 12, 0], [-7, 0, -0.5, 0, 8, 0.5], 'warden_tendril', { glow: true, noCull: true, rest: [0, 0, 0.55] }],
    ['tendrilR', 'head', [7, 12, 0], [0, 0, -0.5, 7, 8, 0.5], 'warden_tendril', { glow: true, noCull: true, rest: [0, 0, -0.55] }],
    ['souls', 'body', [0, 5, -5.56], [-6, 0, -0.06, 6, 12, 0.02], 'warden_souls', { glow: true, noCull: true }],
  ],
});
MOB_TYPES.warden = { model: 'warden', label: 'the Warden', hp: 420, w: 0.85, h: 2.9, speed: 2.4, hostile: true, special: true, boss: true, mini: true, damage: 16, xp: 400, knockResist: 1, noDismember: true, fireImmune: true, voice: 'warden',
  drops: [['sculk_catalyst', 1, 1, 1], ['echo_shard', 2, 4, 1]] };
if (typeof PACK_MOBS !== 'undefined') PACK_MOBS.warden = { tex: ['entity/warden/warden'], texW: 128, hide: ['tendrilL', 'tendrilR', 'souls'],
  parts: [['head', PM(0, 32, 16, 16, 10)], ['body', PM(0, 0, 18, 21, 11)],
    ['armR', PM(44, 50, 8, 28, 8), { upper: true }], ['foreR', PM(44, 50, 8, 28, 8), { lower: true }], ['armL', PM(0, 58, 8, 28, 8), { upper: true }], ['foreL', PM(0, 58, 8, 28, 8), { lower: true }],
    ['legR', PM(76, 48, 6, 13, 6), { upper: true }], ['shinR', PM(76, 48, 6, 13, 6), { lower: true }], ['legL', PM(76, 76, 6, 13, 6), { upper: true }], ['shinL', PM(76, 76, 6, 13, 6), { lower: true }]] };
// (0.9.0.46) how much rock lies between two points (solid blocks along the line, every half block)
function wardenRock(g, x0, y0, z0, x1, y1, z1) {
  const w = g.world, L = Math.hypot(x1 - x0, y1 - y0, z1 - z0), n = Math.max(1, Math.ceil(L / 0.5));
  let c = 0, last = '';
  for (let i = 1; i < n; i++) {
    const t = i / n, x = Math.floor(x0 + (x1 - x0) * t), y = Math.floor(y0 + (y1 - y0) * t), z = Math.floor(z0 + (z1 - z0) * t), k = x + ',' + y + ',' + z;
    if (k === last) continue; last = k;
    if (T_SOLID[w.getBlock(x, y, z)] && !BLOCKS[w.getBlock(x, y, z)].door) c++;
  }
  return c;
}
// sneaking or crawling: quiet enough that it has to be close to smell you
function wardenQuiet(q) { const P = q.player; if (P) return !!(P.sneaking || P.crawling); const s = q.st || {}; return !!s.sn; }
// walking or running about on the ground, not sneaking: footsteps it can hear (a player here, or one joined over the network)
function wardenNoisy(q) {
  if (q.player) { const P = q.player; return P.onGround && !P.sneaking && !P.crawling && Math.hypot(P.vx, P.vz) > 1.2; }
  const s = q.st || {}; return !!s.og && !s.sn && Math.hypot(s.vx || 0, s.vz || 0) > 1.2;
}
MONSTER_AI.warden = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, T = this.T;
  this.kept = true;
  // rising out of the ground
  if (this.emergeT > 0) {
    this.emergeT -= dt; this.noGrav = true; this.flyVy = 0; this.vx = this.vz = 0;
    this.y = this.y0 - 2.9 * Math.max(0, this.emergeT / 4.5);
    if (Math.random() < dt * 30) g.burst(this.x + (Math.random() - 0.5), this.y0 + 0.1, this.z + (Math.random() - 0.5), 'sculk', 2, 1.5);
    if (this.emergeT <= 0) { this.noGrav = false; this.y = this.y0; g.sfx.playAt('warden_roar', this.x, this.y + 2, this.z, 64); this.calmT = 0; }
    return { want: 0, dir: this.yaw };
  }
  // and sinking back into it
  if (this.digT > 0) {
    this.digT -= dt; this.noGrav = true; this.flyVy = 0; this.vx = this.vz = 0; this.y -= dt * 0.75;
    if (Math.random() < dt * 30) g.burst(this.x + (Math.random() - 0.5), this.y + 2.9, this.z + (Math.random() - 0.5), 'sculk', 2, 1.5);
    if (this.digT <= 0) this.remove = true;
    return { want: 0, dir: this.yaw };
  }
  const A = this.anger || (this.anger = new Map());
  // (0.9.0.46) it's blind: it knows where you are only from what it hears (roughly, the farther and the more rock
  // between, the rougher) or smells (close by, exactly). Quiet, you can slip away, and its boom can go wide.
  const K = this.known || (this.known = new Map());   // foe -> { x, y, z, t }: where it last made them out
  const hx = this.x, hy = this.y + 2.2, hz = this.z;
  const rock = (x, y, z) => wardenRock(g, hx, hy, hz, x, y, z);
  const fix = (q, x, y, z, exact) => {
    const d = Math.hypot(x - hx, z - hz), err = exact ? 0.3 : Math.min(7, 0.6 + d * 0.09 + rock(x, y + 1, z) * 0.9), a = Math.random() * Math.PI * 2, r = Math.random() * err;
    K.set(q, { x: x + Math.cos(a) * r, y, z: z + Math.sin(a) * r, t: g.time });
  };
  // it hears
  for (const v of g._vibes || []) {
    if (v.t <= (this.heardT || 0)) continue;
    this.heardT = v.t;
    if (Math.hypot(v.x - this.x, v.y - this.y, v.z - this.z) > 18) continue;
    this.target = [v.x, v.y, v.z]; this.calmT = 0;
    if (v.src) { A.set(v.src, Math.min(150, (A.get(v.src) || 0) + (v.kind === 'block' ? 45 : v.kind === 'land' ? 40 : 30))); fix(v.src, v.x, v.y, v.z, false); }
    if (Math.random() < 0.5) g.sfx.playAt('warden_sniff', this.x, this.y + 2.5, this.z, 24);
  }
  // footsteps of anyone walking or running about (a player joined over the network too), and whoever's close, however quiet
  for (const q of g.pawns()) {
    if (q.dead || q.phantom) continue;
    const dq = Math.hypot(q.x - this.x, q.y - this.y, q.z - this.z);
    const smell = wardenQuiet(q) ? 4 : 6;                                    // creeping, you have to be closer to be smelled
    if (dq < smell) { A.set(q, Math.min(150, (A.get(q) || 0) + dt * 14)); fix(q, q.x, q.y, q.z, dq < 3); continue; }
    if (dq < 16 && wardenNoisy(q) && Math.random() < dt * 2.5) { A.set(q, Math.min(150, (A.get(q) || 0) + 6)); fix(q, q.x, q.y, q.z, false); }
  }
  let foe = null, fa = 0;
  for (const [k, a] of A) {
    const info = K.get(k), quiet = !info || g.time - info.t > 6;            // nothing from them for a while: it loses interest faster
    const n = a - dt * (quiet ? 4 : 1.2);
    if (n <= 0 || k.dead || k.remove) { A.delete(k); K.delete(k); } else { A.set(k, n); if (n > fa) { fa = n; foe = k; } }
  }
  // the heartbeat in its chest quickens as it closes in
  if ((this.beatT = (this.beatT || 0) - dt) <= 0) { this.beatT = 1.6 - Math.min(1, fa / 120) * 1.0; g.sfx.playAt('warden_heart', this.x, this.y + 1.8, this.z, 24); }
  const info = foe && K.get(foe);
  if (foe && fa >= 80 && info) {
    this.calmT = 0;
    const F = foe.player || foe, age = g.time - info.t;
    const d = Math.hypot(info.x - this.x, info.z - this.z), dy = info.y - this.y, tp = Math.atan2(-(info.x - this.x), -(info.z - this.z));
    // the sonic boom: a gathering roar, then a blast of sound at where it thinks you are. It keeps its aim on you while
    // it can hear you, and the last moment it can't change it; rock in the way scatters it and takes some of its force
    if (this.boomCharge > 0) {
      this.boomCharge -= dt;
      if (this.boomCharge > 0.35 && age < 0.6) this.boomAim = [info.x, info.y, info.z];
      const aim = this.boomAim || [info.x, info.y, info.z];
      this.yaw = turnTo(this.yaw, Math.atan2(-(aim[0] - this.x), -(aim[2] - this.z)), dt * 6);
      if (Math.random() < dt * 30) g.burst(this.x, this.y + 1.8, this.z, 'sculk_soul', 1, 1.2, 0);
      if (this.boomCharge <= 0) {
        const sx = this.x, sy = this.y + 1.8, sz = this.z, walls = rock(aim[0], aim[1] + 1, aim[2]);
        // farther, and through rock, the wider it goes: scattered across the blast (sideways and up or down)
        const hd = Math.hypot(aim[0] - sx, aim[2] - sz) || 1, spread = 0.5 + walls * 0.5 + hd * 0.07, a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
        const px = -(aim[2] - sz) / hd, pz = (aim[0] - sx) / hd;
        let ex = aim[0] + px * Math.cos(a) * r, ey = aim[1] + 1 + Math.sin(a) * r, ez = aim[2] + pz * Math.cos(a) * r;
        const L0 = Math.hypot(ex - sx, ey - sy, ez - sz) || 1, L = Math.max(L0, Math.min(18, L0 + 3));   // the blast carries a little past
        ex = sx + (ex - sx) * L / L0; ey = sy + (ey - sy) * L / L0; ez = sz + (ez - sz) * L / L0;
        for (let s2 = 0; s2 < L; s2 += 0.8) spellSpark(g, sx + (ex - sx) * s2 / L, sy + (ey - sy) * s2 / L, sz + (ez - sz) * s2 / L, 'sculk_ring', { life: 0.5, size: 0.5, grow: 2 });
        g.sfx.playAt('warden_boom', sx, sy, sz, 64);
        // anyone in the blast's path takes it (armour softens it, and so does rock it went through)
        for (const q of g.pawns()) {
          if (q.dead || q.phantom) continue;
          const t = Math.max(0, Math.min(1, ((q.x - sx) * (ex - sx) + (q.y + 1 - sy) * (ey - sy) + (q.z - sz) * (ez - sz)) / (L * L)));
          const off = Math.hypot(sx + (ex - sx) * t - q.x, sy + (ey - sy) * t - (q.y + 1), sz + (ez - sz) * t - q.z);
          if (off < 1.25 && Math.hypot(q.x - sx, q.z - sz) < 18) (q.hurt ? q : q.player || q).hurt(Math.max(3, Math.round(8 * Math.max(0.4, 1 - walls * 0.2))), { type: 'magic', attacker: this, knock: 7 });
        }
        this.boomAim = null;
      }
      return { want: 0, dir: tp };
    }
    if ((this.boomCd = (this.boomCd ?? 3) - dt) <= 0 && age < 3 && d > 3.5 && d < 15) { this.boomCd = 7; this.boomCharge = 1.7; this.boomAim = [info.x, info.y, info.z]; g.sfx.playAt('warden_boom_charge', this.x, this.y + 2, this.z, 40); return { want: 0, dir: tp }; }
    // a swipe at whoever is really there, within reach
    const dr = Math.hypot(F.x - this.x, F.z - this.z);
    if (dr < 1.7 + this.w && Math.abs(F.y - this.y) < 2.5 && this.attackCd <= 0) {
      this.attackCd = 1.8; this.swingT = 0.4;
      foe.hurt(T.damage, { type: 'mob', attacker: this, knock: 5 });
      g.sfx.playAt('warden_hit', this.x, this.y + 1.5, this.z, 30);
    }
    // to where it last made them out; there, with nothing new to go on, it stops and sniffs
    if (d < 1.4 && age > 1.5) { if (Math.random() < dt * 0.8) g.sfx.playAt('warden_sniff', this.x, this.y + 2.5, this.z, 24); return { want: 0, dir: this.yaw + Math.sin(g.time * 1.3) * 0.02 }; }
    return { want: d < 1.2 ? 0 : T.speed * (age < 1.5 ? 1.75 : 1.3), dir: (d > 2 ? this.navDir(info.x, info.y, info.z, dt) : null) ?? tp };
  }
  // after a sound: over to where it came from, slowly
  if (this.target) {
    const [tx, ty, tz] = this.target, d = Math.hypot(tx - this.x, tz - this.z);
    if (d < 1.5) this.target = null;
    else return { want: T.speed * 0.7, dir: this.navDir(tx, ty, tz, dt) ?? Math.atan2(-(tx - this.x), -(tz - this.z)) };
  }
  // left in peace a minute, it digs back down
  this.calmT = (this.calmT || 0) + dt;
  if (this.calmT > 60) { this.digT = 4; g.sfx.playAt('warden_dig', this.x, this.y + 1, this.z, 40); }
  return { want: 0, dir: this.yaw };
};
{
  // struck, it knows exactly who did it
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    if (this.type === 'warden' && (this.emergeT > 0 || this.digT > 0)) return 0;
    const r = baseHurt.call(this, amount, src);
    if (this.type === 'warden' && src.attacker && src.attacker !== this) { const A = this.anger || (this.anger = new Map()); A.set(src.attacker, 150); this.calmT = 0; }
    return r;
  };
  // the catalyst: where something dies close by, the sculk spreads
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const g = this.game, x = this.x, y = this.y, z = this.z, xp = this.T && this.T.xp;
    const r = baseDie.call(this, src);
    if (g.isGuest || g.dim !== 0 || y > DEEP_TOP + 14 || !g.world || this.type === 'warden') return r;
    const cat = sculkNear(g, x, y, z, 8).find(c => c[3] === B.sculk_catalyst);
    if (!cat) return r;
    const w = g.world, n = Math.min(12, 2 + Math.floor((xp || 2) / 3));
    g.sfx.playAt('sculk_bloom', cat[0] + 0.5, cat[1] + 1, cat[2] + 0.5, 24);
    for (let k = 0; k < 10; k++) g.burst(cat[0] + 0.5, cat[1] + 1.1, cat[2] + 0.5, 'sculk_soul', 1, 0.5, -1);
    for (let k = 0, done = 0; k < n * 4 && done < n; k++) {
      const bx = Math.floor(x + (Math.random() - 0.5) * 6), bz = Math.floor(z + (Math.random() - 0.5) * 6);
      for (let by = Math.floor(y) + 1; by >= Math.floor(y) - 3; by--) {
        const id = w.getBlock(bx, by, bz);
        if (T_SOLID[id] && !w.getBlock(bx, by + 1, bz) && [B.stone, B.slate, B.dirt, B.gravel, B.cobbled_slate, B.tuff, B.grass].includes(id)) { w.setBlock(bx, by, bz, B.sculk, 0); done++; break; }
      }
    }
    return r;
  };
}

// ---- sounds ----------------------------------------------------------------------------------------------------------------------
SND_FX.sculk_click = [0.4, 0.4, (b, v, r) => { for (let k = 0; k < 3; k++) b.modes(k * 0.06 + r() * 0.02, [[900 + r() * 400, 0.03, 1]], 0.25); b.noise(0, 0.2, 'bp', 2400, 3, 0.12); }];
SND_FX.sculk_shriek = [2.2, 0.75, (b, v, r) => { b.noise(0, 1.9, 'bp', 1800, 5, 0.5, { sweep: 1.8 }); b.vox(0, 1.8, 420, 760, 'e', 0.45, 0.9); b.vox(0.05, 1.7, 610, 980, 'i', 0.3, 0.9); }];
SND_FX.sculk_bloom = [1.0, 0.4, (b, v, r) => { b.noise(0, 0.8, 'lp', 300, 0.8, 0.4); b.modes(0.1, [[180, 0.6, 1], [270, 0.5, 0.5]], 0.25); }];
SND_FX.warden = [1.4, 0.5, (b, v, r) => { b.vox(0, 1.2, 70, 55, 'o', 0.55, 0.4); b.noise(0, 1.1, 'lp', 220, 0.6, 0.25); }];
SND_FX.warden_hurt = [0.6, 0.6, (b, v, r) => { b.vox(0, 0.5, 120, 80, 'a', 0.6, 0.5); }];
SND_FX.warden_death = [2.4, 0.7, (b, v, r) => { b.vox(0, 2.1, 110, 40, 'o', 0.6, 0.6); b.noise(0, 2, 'lp', 300, 0.6, 0.35, { sweep: -0.5 }); }];
SND_FX.warden_heart = [0.5, 0.55, (b, v, r) => { b.thump(0, 70, 40, 0.14, 0.7); b.thump(0.2, 62, 36, 0.12, 0.5); }];
SND_FX.warden_roar = [2.4, 0.8, (b, v, r) => { b.vox(0, 2.2, 95, 60, 'a', 0.7, 0.6); b.noise(0, 2.1, 'lp', 500, 0.8, 0.45); b.thump(0, 60, 30, 0.8, 0.6); }];
SND_FX.warden_sniff = [0.8, 0.35, (b, v, r) => { for (let k = 0; k < 3; k++) b.noise(k * 0.18, 0.12, 'bp', 1400, 1.5, 0.35); }];
SND_FX.warden_boom_charge = [1.7, 0.6, (b, v, r) => { b.noise(0, 1.6, 'bp', 300, 2, 0.4, { sweep: 2.5 }); b.vox(0, 1.6, 60, 140, 'o', 0.4, 0.5); }];
SND_FX.warden_boom = [1.6, 0.9, (b, v, r) => { b.thump(0, 90, 25, 1.2, 1); b.noise(0, 1.2, 'lp', 900, 0.7, 0.7, { sweep: -1 }); b.modes(0, [[140, 1, 1], [210, 0.8, 0.5]], 0.3); }];
SND_FX.warden_hit = [0.5, 0.7, (b, v, r) => { b.thump(0, 120, 50, 0.25, 0.8); b.noise(0, 0.2, 'lp', 600, 0.7, 0.4); }];
SND_FX.warden_emerge = [4.5, 0.7, (b, v, r) => { for (let k = 0; k < 14; k++) b.noise(k * 0.3 + r() * 0.1, 0.25, 'lp', 400 + r() * 300, 0.8, 0.45); b.vox(3.4, 1.0, 80, 60, 'o', 0.4, 0.5); }];
SND_FX.warden_dig = [4.0, 0.6, (b, v, r) => { for (let k = 0; k < 12; k++) b.noise(k * 0.3 + r() * 0.1, 0.25, 'lp', 350 + r() * 300, 0.8, 0.45); }];

// ---- the pictures ----------------------------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    const sculkBase = (p) => {
      p.noise(H('#0c1a22'), 0.3);
      for (let i = 0; i < 26; i++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H(p.rand() < 0.5 ? '#14303a' : '#081218'));
      for (let i = 0; i < 7; i++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H(p.rand() < 0.5 ? '#2ad8e0' : '#1a8a98'));
    };
    addTile('sculk', sculkBase);
    addTile('sculk_vein', p => { for (let k = 0; k < 5; k++) { let x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); for (let i = 0; i < 10; i++) { p.set(x & 15, y & 15, H(i % 4 ? '#0e2028' : '#2ab8c8')); x += p.rand() < 0.5 ? 1 : -1; y += p.rand() < 0.5 ? 1 : 0; } } });
    addTile('sculk_sensor_top', p => { sculkBase(p); for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) p.set(x, y, H('#0a3a44')); });
    addTile('sculk_sensor_side', p => { sculkBase(p); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#1a5a64')); p.set(x, 1, H('#0e3038')); } for (let y = 8; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#0a1418'), 0.8 + p.rand() * 0.3)); });
    addTile('sculk_sensor_bottom', p => { p.noise(H('#0a1418'), 0.2); });
    addTile('sculk_tendril', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, mix(H('#48f0f8'), H('#0a6070'), y / 16)); });
    addTile('sculk_shrieker_top', p => { p.noise(H('#2a3438'), 0.2); for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) p.set(x, y, H('#0c1a20')); });
    addTile('sculk_shrieker_side', p => { sculkBase(p); for (let y = 0; y < 3; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#d8d0b8'), 0.85 + p.rand() * 0.2)); });
    addTile('sculk_shrieker_bottom', p => { p.noise(H('#0a1418'), 0.2); });
    addTile('sculk_shrieker_inner', p => { p.noise(H('#0a2a30'), 0.25); for (let i = 0; i < 12; i++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#5af0f0')); });
    addTile('shrieker_bone', p => { p.noise(H('#d8d0b4'), 0.12); for (let i = 0; i < 16; i += 4) for (let x = 0; x < 16; x++) p.set(x, i, H('#a89c80')); });
    addTile('sculk_catalyst_top', p => { sculkBase(p); for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) p.set(x, y, H((x + y) % 2 ? '#40f0f0' : '#d8f8f8')); });
    addTile('sculk_catalyst_side', p => { p.noise(H('#d8d0b4'), 0.1); for (let y = 0; y < 6; y++) for (let x = 0; x < 16; x++) if (p.rand() < 0.9 - y * 0.12) p.set(x, y, shade(H('#0c1a22'), 0.8 + p.rand() * 0.4)); for (let i = 0; i < 4; i++) p.set(Math.floor(p.rand() * 16), 8 + Math.floor(p.rand() * 6), H('#8a7e66')); });
    addTile('sculk_catalyst_bottom', p => { p.noise(H('#c8c0a4'), 0.12); });
    addTile('reinforced_deepslate_side', p => { p.noise(H('#3a3a40'), 0.2); for (let i = 0; i < 16; i++) { p.set(i, 0, H('#d8d0b4')); p.set(i, 15, H('#d8d0b4')); p.set(0, i, H('#c8c0a4')); p.set(15, i, H('#c8c0a4')); } for (let y = 6; y < 10; y++) for (let x = 3; x < 13; x++) p.set(x, y, H('#28282c')); });
    addTile('reinforced_deepslate_top', p => { p.noise(H('#34343a'), 0.2); for (let i = 0; i < 16; i++) { p.set(i, 0, H('#d8d0b4')); p.set(i, 15, H('#d8d0b4')); p.set(0, i, H('#d8d0b4')); p.set(15, i, H('#d8d0b4')); } for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) p.set(x, y, H('#0c1a22')); });
    addTile('reinforced_deepslate_bottom', p => { p.noise(H('#2e2e34'), 0.2); });
    addTile('sculk_glow', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 7.5; if (d < 1) p.set(x, y, mix(H('#c0ffff'), H('#2ab8c8'), d), Math.round(255 * Math.pow(1 - d, 1.3))); } });
    addTile('sculk_soul', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, (y - 7.5) * 0.8) / 7.5; if (d < 1 && d > 0.45) p.set(x, y, H('#7af8f8'), Math.round(220 * (1 - d))); } });
    addTile('sculk_ring', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 7.5; if (d < 1 && d > 0.6) p.set(x, y, H('#a0ffff'), Math.round(255 * (1 - Math.abs(d - 0.8) * 5))); } });
    // the Warden
    addTile('warden_skin', p => { p.noise(H('#0e2a30'), 0.3); for (let i = 0; i < 20; i++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H(p.rand() < 0.7 ? '#081a1e' : '#1a4a50')); });
    addTile('warden_face', p => { p.noise(H('#0e2a30'), 0.25); for (let y = 9; y < 15; y++) for (let x = 3; x < 13; x++) p.set(x, y, H(y === 9 || y === 14 ? '#c8c0a4' : '#04080a')); for (const x of [5, 7, 9, 11]) p.set(x, 9, H('#e8e0c8')); });
    addTile('warden_chest', p => { p.noise(H('#0e2a30'), 0.25); for (let y = 2; y < 14; y++) for (let x = 3; x < 13; x++) if ((x + y) % 5) p.set(x, y, H('#d8d0b4')); });
    addTile('warden_souls', p => { for (let k = 0; k < 4; k++) { const cx = 3 + (k % 2) * 9, cy = 3 + Math.floor(k / 2) * 8; for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) p.set(cx + x, cy + y, H(x * x + y * y <= 1 ? '#e8ffff' : '#40e0e8')); } });
    addTile('warden_tendril', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, mix(H('#58f8f8'), H('#0a5060'), Math.abs(x - 7.5) / 8)); });
    const I = (name, rows, pal) => addItem(name, p => p.art(rows, pal));
    I('echo_shard', ['................', '................', '..........kk....', '.........kCk....', '........kCCk....', '.......kCLCk....', '......kCLCk.....', '.....kCLCDk.....', '....kCCCDk......', '...kCCCDk.......', '...kCDDk........', '....kkk.........', '................', '................', '................', '................'],
      { k: H('#062026'), C: H('#1a8a98'), L: H('#6af0f8'), D: H('#0c4450') });
    I('echo_charm', ['................', '......kkkk......', '.....k....k.....', '.....k....k.....', '......kggk......', '.....kgCCgk.....', '....kgCLCCgk....', '....kgCCLCgk....', '....kgCCCDgk....', '.....kgCDgk.....', '......kggk......', '.......kk.......', '................', '................', '................', '................'],
      { k: H('#3a2a10'), g: H('#d8a830'), C: H('#1a8a98'), L: H('#6af0f8'), D: H('#0c4450') });
  };
}
// for tests
PV.debug.vibrate = (x, y, z, src, kind) => vibrate(GAME, x, y, z, src, kind);
PV.debug.riftTick = (dt) => riftTick(GAME, dt);
PV.debug.haunt = { ok: () => hauntDimOk(GAME), portals: () => hauntPortals(GAME) };   // (0.9.0.49) for testing the story's pace
PV.debug.warden = { ai: () => MONSTER_AI.warden, rock: (x0, y0, z0, x1, y1, z1) => wardenRock(GAME, x0, y0, z0, x1, y1, z1) };
