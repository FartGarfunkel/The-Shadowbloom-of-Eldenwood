// ---------------------------------------------------------------------------
// game/places.js — 0.9.0.28: far places.
//
// The Skylands and the Ember Depths get places worth finding.
// In the Skylands:
//   the Sky Temple, floating on its own island of skystone, where the Valkyrie
//     Queen keeps the hall (a Realm Fragment, the first time, and her lance);
//   cloud shrines on the islands, a ring of pillars round an old book;
//   skyships, drifting under their great wool balloons, their holds full;
//   moa nests, with the moas still about.
// In the Depths:
//   Ember Bastions, great keeps of nether brick standing out of the lava sea,
//     with bridges into the caverns, cages breathing out charred ghouls, and
//     the Ember Lord in the hall (a fragment, and his crown);
//   obsidian spires, climbed inside to a treasure room at the top;
//   ruined forges, their anvils and furnaces still there, and cinderite;
//   bone pits, where something still raises the dead.
// Places you find there count for Exploring and the journal, like any other.
// ---------------------------------------------------------------------------
const PLK = (k, alt) => (B[k] !== undefined ? k : alt);

// ---- what's in their chests --------------------------------------------------------------------------------------
Object.assign(STRUCT_LOOT, {
  sky_temple: [['aether_crystal', 3, 8, 0.9], ['gold_ingot', 4, 10, 0.8], ['emerald', 4, 10, 0.7], ['diamond', 1, 3, 0.4], ['mithril_ingot', 1, 3, 0.35], ['gust_puff', 2, 5, 0.5], ['golden_feather', 1, 1, 0.45], ['heart_crystal', 1, 1, 0.3], ['tome_haste', 1, 1, 0.2], ['tome_lightning', 1, 1, 0.15], ['stormcaller_chestplate', 1, 1, 0.12], ['golden_apple', 1, 2, 0.3]],
  sky_shrine: [['aether_crystal', 1, 4, 0.7], ['gust_puff', 1, 3, 0.5], ['golden_feather', 1, 1, 0.25], ['emerald', 1, 4, 0.5], ['glowstone_dust', 2, 6, 0.4], ['tome_levitate', 1, 1, 0.12], ['feather', 2, 6, 0.4]],
  skyship: [['string', 3, 9, 0.6], ['white_wool', 2, 6, 0.5], ['gold_ingot', 2, 6, 0.6], ['iron_ingot', 2, 6, 0.6], ['emerald', 2, 7, 0.6], ['compass', 1, 1, 0.3], ['empty_map', 1, 2, 0.4], ['spyglass', 1, 1, 0.2], ['saddle', 1, 1, 0.2], ['bread', 2, 6, 0.6], ['aether_crystal', 1, 3, 0.4], ['elytra', 1, 1, 0.03]],
  moa_nest: [['feather', 4, 10, 0.9], ['egg', 1, 3, 0.6], ['golden_feather', 1, 1, 0.2], ['wheat_seeds', 2, 6, 0.4], ['strawberry', 1, 4, 0.3]],
  ember_bastion: [['gold_ingot', 3, 9, 0.8], ['cinderite_shard', 1, 4, 0.6], ['magma_cream', 1, 4, 0.5], ['cinder_powder', 2, 6, 0.6], ['emerald', 3, 9, 0.6], ['diamond', 1, 3, 0.35], ['mithril_ingot', 1, 2, 0.25], ['obsidian', 2, 6, 0.4], ['tome_fireball', 1, 1, 0.15], ['pyromancer_helmet', 1, 1, 0.1], ['saddle', 1, 1, 0.2], ['golden_apple', 1, 1, 0.2], ['heart_crystal', 1, 1, 0.15]],
  ember_spire: [['crying_obsidian', 1, 4, 0.5], ['ender_pearl', 1, 3, 0.4], ['gold_block', 1, 1, 0.3], ['emerald', 4, 10, 0.7], ['diamond', 1, 3, 0.5], ['tome_icenova', 1, 1, 0.12], ['cinderite_shard', 2, 5, 0.5], ['adamantite_ingot', 1, 1, 0.1]],
  forge: [['cinderite_shard', 2, 6, 0.8], ['steel_ingot', 2, 6, 0.7], ['iron_ingot', 4, 10, 0.8], ['mithril_ingot', 1, 3, 0.4], ['adamantite_ingot', 1, 1, 0.12], ['coal', 6, 16, 0.6], ['cinderite_sword', 1, 1, 0.12], ['cinderite_pickaxe', 1, 1, 0.1], ['steel_chestplate', 1, 1, 0.15]],
  bone_pit: [['bone', 6, 16, 0.9], ['arrow', 6, 16, 0.6], ['bone_meal', 4, 10, 0.5], ['gold_nugget', 4, 12, 0.5], ['emerald', 1, 4, 0.4], ['bow', 1, 1, 0.2], ['soul_lantern', 1, 2, 0.3]],
});
LORE.skylands_temple = ['The Queen of the Air', 'Before the islands broke from the world, a people lived on them who could ride the wind. When they were gone, one stayed: the Queen, in her temple above the clouds, keeping a hall for a court that will not come back.\n\nShe does not take kindly to visitors. She carries a lance that the wind itself obeys, and a piece of something older than all of us.'];
LORE.ember_lord = ['The Ember Lord', 'The keeps in the lava sea were built to hold the fire back. They did not. The fire came up through the floors and into their lord, and he burns still, in his hall, wearing a crown that never cools.\n\nThe smiths say his crown keeps the fire off whoever wears it. The smiths say a great many things.'];
LORE_KEYS.push('skylands_temple', 'ember_lord');
defItem('lore_skylands_temple', { name: 'Old Book: ' + LORE.skylands_temple[0], maxStack: 1, icon: 'lore_book', lore: 'skylands_temple', rarity: 'rare', desc: 'Use it to read it.' });
defItem('lore_ember_lord', { name: 'Old Book: ' + LORE.ember_lord[0], maxStack: 1, icon: 'lore_book', lore: 'ember_lord', rarity: 'rare', desc: 'Use it to read it.' });

// ---- new things to find ----------------------------------------------------------------------------------------------
defItem('golden_feather', { name: 'Golden Feather', rarity: 'rare', desc: 'Carried, it makes every fall gentle (no fall damage while it\'s in your inventory).' });
defItem('valkyrie_lance', { name: 'Valkyrie Lance', maxStack: 1, rarity: 'epic', tool: { type: 'sword', tier: 5, speed: 1.2, damage: 8.5, durability: 1600 }, desc: 'Light in the hand, and it sends things flying.' });
defItem('ember_crown', { name: 'Ember Crown', maxStack: 1, rarity: 'epic', armor: { slot: 0, points: 3, durability: 600, fireResist: 0.6 }, hat: 'crown_ember', desc: 'Fire hardly touches whoever wears it.' });
{
  // the golden feather: no fall damage while you carry one
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    if (src.type === 'fall' && this.player.inv.count && this.player.inv.count('golden_feather') > 0) { this.g.burst(this.player.x, this.player.y + 0.2, this.player.z, 'white', 8, 0.6); return 0; }
    return baseHurt.call(this, amount, src);
  };
  // the lance knocks things up into the air
  const baseReach = LocalPlayer.prototype.attackEntity;
  LocalPlayer.prototype.attackEntity = function (e) {
    const h = this.player.inv.held;
    if (h && h.id === 'valkyrie_lance' && e && e.vx !== undefined) { const r = baseReach.call(this, e); if (e.alive && !e.T.knockResist) { e.vy = Math.max(e.vy || 0, 6); } return r; }
    return baseReach.call(this, e);
  };
}

// ---- the keepers of the hall ------------------------------------------------------------------------------------
Object.assign(MOB_TYPES, {
  valkyrie_queen: Object.assign({}, MOB_TYPES.hollow_archmage, { label: 'the Valkyrie Queen', hp: 280, damage: 7, xp: 260, speed: 3, held: 'valkyrie_lance', voice: 'witch', tint: [1, 0.92, 0.55, 0.22],
    drops: [['valkyrie_lance', 1, 1, 1], ['aether_crystal', 4, 10, 1], ['golden_feather', 1, 2, 1], ['emerald', 8, 16, 1], ['heart_crystal', 1, 1, 0.5], ['lore_skylands_temple', 1, 1, 0.5]] }),
  ember_lord: Object.assign({}, MOB_TYPES.cinder_golem, { label: 'the Ember Lord', hp: 380, damage: 8, xp: 320, tint: [0.55, 0.15, 0.9, 0.28],
    drops: [['ember_crown', 1, 1, 1], ['cinderite_shard', 3, 7, 1], ['gold_ingot', 4, 10, 1], ['emerald', 8, 16, 1], ['heart_crystal', 1, 1, 0.5], ['lore_ember_lord', 1, 1, 0.5]] }),
});
MONSTER_AI.valkyrie_queen = MONSTER_AI.hollow_archmage;
if (typeof FRAG_FOES !== 'undefined') Object.assign(FRAG_FOES, { valkyrie_queen: 'the Valkyrie Queen', ember_lord: 'the Ember Lord' });
{
  // the Ember Lord fights the way the golem does (its slams and volleys), whatever he's called
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (this.type === 'ember_lord' && !this.controlAI_) { this.controlAI_ = true; const self = this; this.controlAI = function (dt2, p, dist, dyp, toPlayer) { return self.bossAI ? self.bossAI(dt2, dist, toPlayer, p) : null; }; }
    return baseUpd.call(this, dt);
  };
}

// ---- the Skylands ------------------------------------------------------------------------------------------------------------
// an island's top here (the Skylands' own shape: world/worldgen.js generateSkylands)
function skyTop(gen, x, z) {
  const mask = gen.nCont.fbm2(x / 180, z / 180, 3);
  if (mask <= 0.12) return -1;
  return 70 + Math.floor(gen.nHill.fbm2(x / 60, z / 60, 3) * 10);
}
function skyFlat(gen, x, z, r) {
  const c = skyTop(gen, x, z); if (c < 0) return -1;
  for (const [a, b] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r]]) { const t = skyTop(gen, x + a, z + b); if (t < 0 || Math.abs(t - c) > 3) return -1; }
  return c;
}
defStruct({
  key: 'sky_temple', name: 'the Sky Temple', reg: 640, chance: 0.8, margin: 70, dims: [2],
  plan(gen, x, z, rnd) {
    const y = 92 + Math.floor(rnd() * 8);
    return { x0: x - 14, x1: x + 14, z0: z - 14, z1: z + 14, y, cx: x, cz: z, surface: true, name: 'the Sky Temple',
      boss: { at: [x, y + 1, z + 4], type: 'valkyrie_queen', box: [x - 8, y, z - 8, x + 8, y + 9, z + 8] } };
  },
  build(P, S) {
    const { cx, cz, y } = S, R = 9, Q = PLK('quartz_block', 'smooth_stone'), QP = PLK('quartz_pillar', Q), GB = PLK('gold_block', 'glowstone');
    // its own island under it
    for (let dz = -14; dz <= 14; dz++) for (let dx = -14; dx <= 14; dx++) {
      const r = Math.hypot(dx, dz); if (r > 13.5) continue;
      const depth = Math.round((13.5 - r) * 0.9 + P.h(cx + dx, 0, cz + dz, 3) * 3);
      for (let k = 1; k <= depth; k++) P.put(cx + dx, y - k, cz + dz, k === depth && P.h(cx + dx, k, cz + dz, 4) < 0.3 ? 'aether_crystal_ore' : 'skystone');
      if (Math.abs(dx) > R || Math.abs(dz) > R) { P.put(cx + dx, y, cz + dz, 'sky_grass'); if (P.h(cx + dx, 1, cz + dz, 5) < 0.12) P.put(cx + dx, y + 1, cz + dz, 'tall_grass'); }
    }
    // the hall
    P.fill(cx - R, y, cz - R, cx + R, y, cz + R, Q);
    P.fill(cx - R, y + 1, cz - R, cx + R, y + 8, cz + R, (x, yy, z) => (x === cx - R || x === cx + R || z === cz - R || z === cz + R) ? ((Math.abs(x - cx) % 4 === 1 && Math.abs(z - cz) % 4 === 1) || (x - cx) % 4 === 0 && (z - cz) % 4 === 0 ? QP : (yy - y >= 3 && yy - y <= 5) && ((x - cx + z - cz) % 3 === 0) ? PLK('glass_pane', 'glass') : Q) : 'air');
    P.fill(cx - R, y + 8, cz - R, cx + R, y + 8, cz + R, Q);
    for (let dx = -R; dx <= R; dx += 2) { P.put(cx + dx, y + 9, cz - R, GB); P.put(cx + dx, y + 9, cz + R, GB); }
    for (let dz = -R; dz <= R; dz += 2) { P.put(cx - R, y + 9, cz + dz, GB); P.put(cx + R, y + 9, cz + dz, GB); }
    // a dome of gold and glass in the middle of the roof
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const r = Math.hypot(dx, dz); if (r <= 3.2) { P.put(cx + dx, y + 8, cz + dz, r < 2 ? PLK('glass', 'air') : GB); if (r <= 2.2) P.put(cx + dx, y + 9, cz + dz, r < 1.2 ? GB : PLK('glass', 'air')); } }
    // pillars inside, lights, the altar where she waits, the treasure behind it
    for (const [a, b] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { P.fill(cx + a, y + 1, cz + b, cx + a, y + 7, cz + b, QP); P.put(cx + a, y + 1, cz + b - 1, 'glowstone'); }
    P.fill(cx - 1, y + 1, cz + 6, cx + 1, y + 1, cz + 7, GB);
    P.chest(cx - 3, y + 1, cz + 8, 2, 'sky_temple'); P.chest(cx + 3, y + 1, cz + 8, 2, 'sky_temple');
    P.lectern(cx, y + 1, cz - 6, 0, 'skylands_temple');
    // the door, facing north, with steps out onto the island
    P.fill(cx - 1, y + 1, cz - R, cx + 1, y + 4, cz - R, 'air');
    for (let k = 1; k <= 3; k++) P.fill(cx - 1, y, cz - R - k, cx + 1, y, cz - R - k, Q);
  },
});
defStruct({
  key: 'sky_shrine', name: 'a Cloud Shrine', reg: 260, chance: 0.6, margin: 30, dims: [2],
  plan(gen, x, z, rnd) {
    const t = skyFlat(gen, x, z, 4); if (t < 0) return null;
    return { x0: x - 6, x1: x + 6, z0: z - 6, z1: z + 6, y: t + 1, cx: x, cz: z, surface: true };
  },
  build(P, S) {
    const { cx, cz, y } = S, Q = PLK('quartz_block', 'smooth_stone');
    for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) { const r = Math.hypot(dx, dz); if (r > 5.2) continue; P.put(cx + dx, y - 1, cz + dz, r < 2.2 ? Q : 'skystone'); for (let k = 0; k < 5; k++) P.put(cx + dx, y + k, cz + dz, 'air'); for (let k = 2; k < 5; k++) P.put(cx + dx, y - k, cz + dz, 'skystone'); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, x = Math.round(cx + Math.cos(a) * 4), z = Math.round(cz + Math.sin(a) * 4); P.fill(x, y, z, x, y + 2, z, PLK('quartz_pillar', Q)); P.put(x, y + 3, z, 'glowstone'); }
    P.lectern(cx, y, cz, 0, P.h(cx, y, cz, 1) < 0.5 ? 'sky_islands' : 'skylands_temple');
    P.chest(cx, y, cz + 2, 2, 'sky_shrine');
  },
});
defStruct({
  key: 'skyship', name: 'a Skyship', reg: 480, chance: 0.55, margin: 50, dims: [2],
  plan(gen, x, z, rnd) {
    const y = 96 + Math.floor(rnd() * 8);
    return { x0: x - 12, x1: x + 12, z0: z - 7, z1: z + 7, y, cx: x, cz: z, surface: true };
  },
  build(P, S) {
    const { cx, cz, y } = S, W = PLK('spruce_planks', 'planks'), L = PLK('spruce_log', 'log'), wool = PLK('white_wool', 'wool');
    // the hull: a long boat, tapering at the ends, the deck at y
    for (let dx = -10; dx <= 10; dx++) {
      const taper = Math.abs(dx) > 6 ? Math.abs(dx) - 6 : 0, half = 3 - Math.min(2, taper);
      for (let dz = -half; dz <= half; dz++) {
        P.put(cx + dx, y, cz + dz, W);
        const depth = 3 - Math.min(2, taper);
        for (let k = 1; k <= depth; k++) P.put(cx + dx, y - k, cz + dz, Math.abs(dz) === half || k === depth ? W : 'air');
        if (Math.abs(dz) === half) P.put(cx + dx, y + 1, cz + dz, PLK('spruce_fence', PLK('oak_fence', W)));
      }
    }
    // the hold: two chests below the deck, a hatch
    P.put(cx - 2, y - 2, cz, 'air'); P.chest(cx - 3, y - 2, cz, 1, 'skyship'); P.chest(cx + 3, y - 2, cz, 3, 'skyship'); P.put(cx, y, cz, 'air'); P.put(cx, y - 1, cz, 'air'); P.ladder(cx, y - 2, y - 1, cz, 2);
    // the mast and its sail, and the great balloon above held by chains
    P.fill(cx + 1, y + 1, cz, cx + 1, y + 9, cz, L);
    P.fill(cx + 1, y + 3, cz - 3, cx + 1, y + 7, cz + 3, (x, yy, z) => z === cz ? L : wool);
    for (const [a, b] of [[-6, -2], [-6, 2], [6, -2], [6, 2]]) P.fill(cx + a, y + 1, cz + b, cx + a, y + 8, cz + b, 'chain');
    for (let dz = -6; dz <= 6; dz++) for (let dx = -11; dx <= 11; dx++) for (let dy = 0; dy <= 6; dy++) {
      const e = (dx / 11) ** 2 + (dz / 6) ** 2 + ((dy - 3) / 3.4) ** 2;
      if (e <= 1 && e > 0.62) P.put(cx + dx, y + 9 + dy, cz + dz, P.h(cx + dx, dy, cz + dz, 6) < 0.15 ? PLK('light_gray_wool', wool) : wool);
    }
    P.put(cx - 9, y + 1, cz, 'lantern'); P.put(cx + 9, y + 1, cz, 'lantern');
  },
});
defStruct({
  key: 'moa_nest', name: 'a Moa Nest', reg: 300, chance: 0.5, margin: 30, dims: [2],
  plan(gen, x, z, rnd) {
    const t = skyFlat(gen, x, z, 3); if (t < 0) return null;
    const res = MOB_TYPES.moa ? [{ mob: 'moa', at: [x + 2, t + 1, z + 2] }, { mob: 'moa', at: [x - 2, t + 1, z - 1] }] : [];
    return { x0: x - 4, x1: x + 4, z0: z - 4, z1: z + 4, y: t + 1, cx: x, cz: z, surface: true, residents: res };
  },
  build(P, S) {
    const { cx, cz, y } = S, H = PLK('hay_bale', PLK('hay_block', 'planks'));
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const r = Math.hypot(dx, dz); if (r > 3.3) continue; P.put(cx + dx, y - 1, cz + dz, r > 2.3 ? H : PLK('coarse_dirt', 'dirt')); if (r > 2.3) P.put(cx + dx, y, cz + dz, P.h(cx + dx, y, cz + dz, 2) < 0.5 ? H : 'air'); else P.put(cx + dx, y, cz + dz, 'air'); }
    P.chest(cx, y, cz, 0, 'moa_nest');
  },
});

// ---- the Ember Depths ----------------------------------------------------------------------------------------------------------------
const PL_NB = () => PLK('nether_bricks', 'blackstone');
defStruct({
  key: 'ember_bastion', name: 'an Ember Bastion', reg: 600, chance: 0.8, margin: 70, dims: [1],
  plan(gen, x, z, rnd) {
    const y = 31;
    return { x0: x - 34, x1: x + 34, z0: z - 34, z1: z + 34, y, cx: x, cz: z, name: 'an Ember Bastion',
      boss: { at: [x, y + 1, z], type: 'ember_lord', box: [x - 6, y, z - 6, x + 6, y + 9, z + 6] },
      spawners: [{ at: [x - 9, y + 1, z + 9], mob: 'charred_ghoul' }, { at: [x + 9, y + 1, z - 9], mob: 'charred_ghoul' }] };
  },
  build(P, S) {
    const { cx, cz, y } = S, R = 12, nb = PL_NB(), bs = PLK('blackstone', nb), pb = PLK('polished_blackstone_bricks', PLK('polished_blackstone', bs));
    // room to stand: the cavern cleared round it
    P.fill(cx - R - 2, y + 1, cz - R - 2, cx + R + 2, y + 15, cz + R + 2, 'air');
    // the floor, on pillars down into the lava
    P.fill(cx - R, y, cz - R, cx + R, y, cz + R, nb);
    for (let dz = -R; dz <= R; dz += 4) for (let dx = -R; dx <= R; dx += 4) for (let k = 1; k <= 12; k++) P.put(cx + dx, y - k, cz + dz, nb);
    // the walls, crenellated, with towers at the corners
    P.fill(cx - R, y + 1, cz - R, cx + R, y + 8, cz + R, (x, yy, z) => (x === cx - R || x === cx + R || z === cz - R || z === cz + R) ? (yy - y === 4 && (x + z) % 4 === 0 ? 'air' : nb) : 'air');
    for (let d = -R; d <= R; d += 2) { P.put(cx + d, y + 9, cz - R, nb); P.put(cx + d, y + 9, cz + R, nb); P.put(cx - R, y + 9, cz + d, nb); P.put(cx + R, y + 9, cz + d, nb); }
    for (const [a, b] of [[-R, -R], [R, -R], [-R, R], [R, R]]) { P.fill(cx + a - 1, y + 1, cz + b - 1, cx + a + 1, y + 13, cz + b + 1, bs); P.fill(cx + a, y + 12, cz + b, cx + a, y + 12, cz + b, 'glowstone'); }
    // the inner hall where he sits, magma glowing in the floor
    P.fill(cx - 6, y + 1, cz - 6, cx + 6, y + 9, cz + 6, (x, yy, z) => (Math.abs(x - cx) === 6 || Math.abs(z - cz) === 6) ? pb : yy === y + 9 ? pb : 'air');
    for (let dz = -4; dz <= 4; dz += 4) for (let dx = -4; dx <= 4; dx += 4) P.put(cx + dx, y, cz + dz, PLK('magma_block', 'glowstone'));
    P.fill(cx - 1, y + 1, cz - 6, cx + 1, y + 4, cz - 6, 'air');
    P.chest(cx - 4, y + 1, cz + 5, 2, 'ember_bastion'); P.chest(cx + 4, y + 1, cz + 5, 2, 'ember_bastion'); P.chest(cx + R - 2, y + 1, cz - R + 2, 3, 'ember_bastion');
    P.lectern(cx, y + 1, cz + 4, 2, 'ember_lord');
    for (const s of S.spawners) P.put(s.at[0], s.at[1], s.at[2], 'monster_spawner');
    for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) P.put(cx + a, y + 8, cz + b, 'soul_lantern');
    // gates on every side, and bridges out into the caverns
    for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const px = -az, pz = ax;
      for (let k = -1; k <= 1; k++) for (let h = 1; h <= 4; h++) P.put(cx + ax * R + px * k, y + h, cz + az * R + pz * k, 'air');
      for (let d = R + 1; d <= 34; d++) for (let k = -1; k <= 1; k++) {
        const bx = cx + ax * d + px * k, bz = cz + az * d + pz * k;
        P.put(bx, y, bz, nb);
        for (let h = 1; h <= 4; h++) P.put(bx, y + h, bz, Math.abs(k) === 1 && h === 1 ? PLK('nether_brick_fence', nb) : 'air');
        if (d % 6 === 0 && k === 0) for (let q = 1; q <= 10; q++) P.put(bx, y - q, bz, nb);
      }
    }
  },
});
defStruct({
  key: 'ember_spire', name: 'an Obsidian Spire', reg: 360, chance: 0.55, margin: 30, dims: [1],
  plan(gen, x, z, rnd) { return { x0: x - 4, x1: x + 4, z0: z - 4, z1: z + 4, y: 30, cx: x, cz: z, name: 'an Obsidian Spire' }; },
  build(P, S) {
    const { cx, cz, y } = S, top = 74;
    for (let yy = y - 8; yy <= top + 4; yy++) {
      const r = yy > top ? 3 - (yy - top) * 0.6 : 3;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dz));
        if (d > r) continue;
        const shell = d >= Math.floor(r);
        P.put(cx + dx, yy, cz + dz, shell ? (P.h(cx + dx, yy, cz + dz, 1) < 0.1 ? PLK('crying_obsidian', 'obsidian') : 'obsidian') : (yy === top - 6 || yy === y ? 'obsidian' : 'air'));
      }
    }
    P.fill(cx - 1, y + 1, cz - 3, cx + 1, y + 3, cz - 3, 'air');   // the way in
    P.ladder(cx, y + 1, top - 7, cz + 2, 2);
    P.put(cx, top - 6, cz + 2, 'air');
    P.chest(cx - 1, top - 5, cz - 1, 0, 'ember_spire'); P.put(cx + 1, top - 5, cz - 1, 'soul_lantern');
    for (const [a, b] of [[0, -3], [0, 3], [-3, 0], [3, 0]]) P.put(cx + a, top - 3, cz + b, PLK('glass', 'air'));
  },
});
defStruct({
  key: 'ruined_forge', name: 'a Ruined Forge', reg: 320, chance: 0.6, margin: 30, dims: [1],
  plan(gen, x, z, rnd) { const y = 40 + Math.floor(rnd() * 30); return { x0: x - 7, x1: x + 7, z0: z - 7, z1: z + 7, y, cx: x, cz: z, name: 'a Ruined Forge' }; },
  build(P, S) {
    const { cx, cz, y } = S, pb = PLK('polished_blackstone_bricks', PLK('blackstone', 'obsidian')), bs = PLK('blackstone', pb);
    P.fill(cx - 6, y, cz - 6, cx + 6, y + 6, cz + 6, (x, yy, z) => (Math.abs(x - cx) === 6 || Math.abs(z - cz) === 6 || yy === y || yy === y + 6) ? (P.h(x, yy, z, 2) < 0.12 && yy > y && yy < y + 6 ? 'air' : yy === y ? bs : pb) : 'air');
    // the lava channel, the anvils and furnaces, the stores
    P.fill(cx - 4, y, cz, cx + 4, y, cz, 'lava'); P.fill(cx - 4, y - 1, cz, cx + 4, y - 1, cz, bs);
    P.put(cx - 3, y + 1, cz - 3, PLK('anvil', 'iron_block')); P.put(cx + 3, y + 1, cz - 3, PLK('anvil', 'iron_block'));
    P.put(cx - 5, y + 1, cz + 2, PLK('blast_furnace', 'furnace'), 1); P.put(cx - 5, y + 1, cz + 4, 'furnace', 1);
    P.chest(cx + 4, y + 1, cz + 4, 3, 'forge'); P.chest(cx + 4, y + 1, cz + 2, 3, 'forge');
    P.put(cx, y + 5, cz - 4, 'lantern', 1); P.put(cx, y + 5, cz + 4, 'lantern', 1);
    P.fill(cx - 1, y + 1, cz - 6, cx + 1, y + 3, cz - 6, 'air');
  },
});
defStruct({
  key: 'bone_pit', name: 'a Bone Pit', reg: 280, chance: 0.5, margin: 20, dims: [1],
  plan(gen, x, z, rnd) { const y = 32; return { x0: x - 6, x1: x + 6, z0: z - 6, z1: z + 6, y, cx: x, cz: z, name: 'a Bone Pit', spawners: [{ at: [x, y - 3, z], mob: 'skeleton' }] }; },
  build(P, S) {
    const { cx, cz, y } = S, bone = PLK('bone_block', 'blackstone');
    P.fill(cx - 6, y, cz - 6, cx + 6, y + 6, cz + 6, 'air');
    for (let dz = -6; dz <= 6; dz++) for (let dx = -6; dx <= 6; dx++) {
      const r = Math.hypot(dx, dz); if (r > 6.2) continue;
      const depth = Math.max(0, Math.round(4 - r * 0.6));
      P.put(cx + dx, y - 1 - depth, cz + dz, P.h(cx + dx, 0, cz + dz, 1) < 0.5 ? PLK('soul_sand', bone) : bone);
      for (let k = 0; k < depth + 1; k++) P.put(cx + dx, y - k, cz + dz, 'air');
      if (r > 5 && P.h(cx + dx, 2, cz + dz, 3) < 0.4) P.fill(cx + dx, y, cz + dz, cx + dx, y + 1 + Math.floor(P.h(cx + dx, 3, cz + dz, 4) * 3), cz + dz, bone);
    }
    for (const s of S.spawners) P.put(s.at[0], s.at[1], s.at[2], 'monster_spawner');
    P.chest(cx + 2, y - 2, cz + 1, 1, 'bone_pit');
    P.put(cx - 4, y, cz - 2, 'soul_lantern'); P.put(cx + 4, y, cz + 3, 'soul_lantern');
  },
});

// ---- the pictures ----------------------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addItem('golden_feather', p => { for (let i = 0; i < 12; i++) { const x = 3 + i, y = 13 - i; p.set(x, y, H('#e8c040')); if (i > 1 && i < 11) { p.set(x - 1, y - 1, shade(H('#f8d860'), 0.9 + p.rand() * 0.2)); p.set(x + 1, y + 1, shade(H('#d8a830'), 0.9 + p.rand() * 0.2)); p.set(x - 2, y - 1, shade(H('#fff0a0'), 0.95)); } } });
    addItem('valkyrie_lance', p => { for (let i = 0; i < 14; i++) { p.set(1 + i, 14 - i, i > 9 ? H('#f8f0d0') : H('#c8a040')); if (i > 9) p.set(2 + i, 14 - i, H('#e8e0c0')); } for (const [x, y] of [[3, 10], [4, 11], [5, 12]]) p.set(x, y, H('#ffffff')); p.set(4, 12, H('#a8e8ff')); });
    addItem('ember_crown', p => { for (let x = 2; x < 14; x++) for (let y = 9; y < 13; y++) p.set(x, y, shade(H('#e8b030'), y === 9 ? 1.2 : 0.95)); for (const x of [2, 6, 9, 13]) for (let y = 5; y < 9; y++) if (y > 5 + Math.abs(x - 7.5) * 0) p.set(x, y, H('#e8b030')); for (const x of [4, 8, 11]) p.set(x, 11, H('#e83a1a')); });
    // the crown, worn: a gold band with points (render/skins.js draws hats; game/arcana.js hatMesh)
    addTile('armor_crown_ember', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#e8b030'), 0.85 + p.rand() * 0.3)); for (let k = 0; k < 4; k++) p.set(2 + k * 4, 8, H('#e83a1a')); });
    addTile('hatband_crown_ember', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#c88a20'), 0.85 + p.rand() * 0.2)); for (let k = 0; k < 4; k++) p.set(3 + k * 4, 8, H('#ff5a2a')); });
  };
  // a crown is a band with points, not a wizard's hat
  const baseHat = hatMesh;
  hatMesh = function (gl, mk) {
    if (!String(mk).startsWith('crown')) return baseHat(gl, mk);
    if (HAT_MESHES[mk] !== undefined) return HAT_MESHES[mk];
    const t = tilesOf('armor_' + mk), band = tilesOf('hatband_' + mk), mb = new MeshBuilder(64);
    const box = (a, b, tt) => addBox(mb, a.map(v => v * PX), b.map(v => v * PX), tt);
    box([-4.6, 7.2, -4.6], [4.6, 9, 4.6], band);
    for (const [x, z] of [[-4.1, -4.1], [0, -4.3], [4.1, -4.1], [-4.3, 0], [4.3, 0], [-4.1, 4.1], [0, 4.3], [4.1, 4.1]]) box([x - 0.6, 9, z - 0.6], [x + 0.6, 10.8, z + 0.6], t);
    const r = mb.result();
    return (HAT_MESHES[mk] = makeVAO(gl, r.verts, r.idx));
  };
}
PV.debug.places = { skyTop: (x, z) => skyTop(GAME.world.gen, x, z), near: (x, z, pad) => GAME.world.gen.structsNear(x, z, pad || 0).map(S => [S.kind, S.cx, S.y, S.cz]) };
