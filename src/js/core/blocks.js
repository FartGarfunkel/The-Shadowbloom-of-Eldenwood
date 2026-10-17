// ---------------------------------------------------------------------------
// core/blocks.js — block registry.
//
// SAVE COMPATIBILITY: saved chunks store blocks through a per-chunk palette
// of block *keys* (strings), never raw numeric IDs. So numeric IDs below may
// be reordered freely between versions. The only rule: never rename a key
// without adding the old name to BLOCK_ALIASES, and never delete a key that
// may exist in old saves (mark it hidden instead).
// ---------------------------------------------------------------------------

const RENDER = { NONE: 0, CUBE: 1, CUTOUT: 2, CROSS: 3, LIQUID: 4, TORCH: 5, MODEL: 6, SHAPE: 7 };
const TOOL = { NONE: null, PICK: 'pickaxe', AXE: 'axe', SHOVEL: 'shovel' };

// tier: 0 = hand, 1 = wood, 2 = stone, 3 = iron, 4 = diamond
const BLOCK_DEFS = [
  { key: 'air', name: 'Air', render: RENDER.NONE, solid: false, opaque: false, replaceable: true },
  { key: 'stone', name: 'Stone', tex: 'stone', hardness: 1.5, tool: TOOL.PICK, tier: 1, drop: 'cobblestone' },
  { key: 'grass', name: 'Grass Block', tex: { top: 'grass_top', bottom: 'dirt', side: 'grass_side' }, tint: 'grass', hardness: 0.6, tool: TOOL.SHOVEL, drop: 'dirt', sound: 'grass' },
  { key: 'dirt', name: 'Dirt', tex: 'dirt', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'gravel' },
  { key: 'cobblestone', name: 'Cobblestone', tex: 'cobblestone', hardness: 2, tool: TOOL.PICK, tier: 1 },
  { key: 'planks', name: 'Oak Planks', tex: 'planks', hardness: 2, tool: TOOL.AXE, sound: 'wood', fuel: 1.5 },
  { key: 'log', name: 'Oak Log', tex: { top: 'log_top', bottom: 'log_top', side: 'log_side' }, hardness: 2, tool: TOOL.AXE, sound: 'wood', isLog: true, fuel: 1.5 },
  { key: 'leaves', name: 'Oak Leaves', tex: 'leaves', tint: 'foliage', render: RENDER.CUTOUT, opaque: false, hardness: 0.2, sound: 'grass', isLeaves: true, lightAtt: 1 },
  { key: 'sand', name: 'Sand', tex: 'sand', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'sand' },
  { key: 'gravel', name: 'Gravel', tex: 'gravel', hardness: 0.6, tool: TOOL.SHOVEL, sound: 'gravel' },
  { key: 'water', name: 'Water', tex: 'water', render: RENDER.LIQUID, solid: false, opaque: false, replaceable: true, liquid: 'water', lightAtt: 2, hardness: -1 },
  { key: 'lava', name: 'Lava', tex: 'lava', render: RENDER.LIQUID, solid: false, opaque: false, replaceable: true, liquid: 'lava', light: 15, hardness: -1 },
  { key: 'bedrock', name: 'Bedrock', tex: 'bedrock', hardness: -1 },
  { key: 'coal_ore', name: 'Coal Ore', tex: 'coal_ore', hardness: 3, tool: TOOL.PICK, tier: 1, drop: 'coal', xp: 1 },
  { key: 'iron_ore', name: 'Iron Ore', tex: 'iron_ore', hardness: 3, tool: TOOL.PICK, tier: 2, xp: 2 },
  { key: 'gold_ore', name: 'Gold Ore', tex: 'gold_ore', hardness: 3, tool: TOOL.PICK, tier: 3, xp: 3 },
  { key: 'diamond_ore', name: 'Diamond Ore', tex: 'diamond_ore', hardness: 3, tool: TOOL.PICK, tier: 3, drop: 'diamond', xp: 6 },
  { key: 'glass', name: 'Glass', tex: 'glass', render: RENDER.CUTOUT, opaque: false, hardness: 0.3, sound: 'glass', selfCull: true },
  { key: 'crafting_table', name: 'Crafting Table', tex: { top: 'table_top', bottom: 'planks', side: 'table_side' }, hardness: 2.5, tool: TOOL.AXE, sound: 'wood', table: true, carry: true },
  { key: 'furnace', name: 'Furnace', tex: { top: 'furnace_top', bottom: 'furnace_top', side: 'furnace_side', front: 'furnace_front' }, hardness: 3.5, tool: TOOL.PICK, tier: 1, furnace: true, carry: true },
  { key: 'lit_furnace', name: 'Furnace', tex: { top: 'furnace_top', bottom: 'furnace_top', side: 'furnace_side', front: 'furnace_front_lit' }, hardness: 3.5, tool: TOOL.PICK, tier: 1, light: 13, drop: 'furnace', furnace: true, carry: true },
  { key: 'chest', name: 'Chest', tex: { top: 'chest_top', bottom: 'chest_top', side: 'chest_side', front: 'chest_front' }, hardness: 2.5, tool: TOOL.AXE, sound: 'wood', container: 27, carry: true },
  { key: 'torch', name: 'Torch', tex: 'torch', render: RENDER.TORCH, solid: false, opaque: false, light: 14, hardness: 0, sound: 'wood', needsSupport: true, sink: true },
  { key: 'obsidian', name: 'Obsidian', tex: 'obsidian', hardness: 25, tool: TOOL.PICK, tier: 4 },
  { key: 'snowy_grass', name: 'Snowy Grass', tex: { top: 'snow', bottom: 'dirt', side: 'snowy_grass_side' }, hardness: 0.6, tool: TOOL.SHOVEL, drop: 'dirt', sound: 'snow' },
  { key: 'tall_grass', name: 'Tall Grass', tex: 'tall_grass', tint: 'grass', render: RENDER.CROSS, solid: false, opaque: false, replaceable: true, hardness: 0, drop: null, sound: 'grass', needsSupport: true },
  { key: 'flower_red', name: 'Poppy', tex: 'flower_red', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', needsSupport: true },
  { key: 'flower_yellow', name: 'Dandelion', tex: 'flower_yellow', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', needsSupport: true },
  { key: 'sapling', name: 'Oak Sapling', tex: 'sapling', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', needsSupport: true, fuel: 0.5 },
  { key: 'berry_bush', name: 'Berry Bush', tex: 'berry_bush', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0.2, sound: 'grass', needsSupport: true, harvest: 'berries' },
  { key: 'berry_bush_empty', name: 'Berry Bush', tex: 'berry_bush_empty', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0.2, sound: 'grass', drop: 'berry_bush', needsSupport: true },
  { key: 'birch_log', name: 'Birch Log', tex: { top: 'birch_log_top', bottom: 'birch_log_top', side: 'birch_log_side' }, hardness: 2, tool: TOOL.AXE, sound: 'wood', isLog: true, fuel: 1.5 },
  { key: 'birch_leaves', name: 'Birch Leaves', tex: 'birch_leaves', tint: 'foliage', render: RENDER.CUTOUT, opaque: false, hardness: 0.2, sound: 'grass', isLeaves: true, lightAtt: 1 },
  { key: 'spruce_log', name: 'Spruce Log', tex: { top: 'spruce_log_top', bottom: 'spruce_log_top', side: 'spruce_log_side' }, hardness: 2, tool: TOOL.AXE, sound: 'wood', isLog: true, fuel: 1.5 },
  { key: 'spruce_leaves', name: 'Spruce Leaves', tex: 'spruce_leaves', render: RENDER.CUTOUT, opaque: false, hardness: 0.2, sound: 'grass', isLeaves: true, lightAtt: 1 },
  { key: 'sandstone', name: 'Sandstone', tex: { top: 'sandstone_top', bottom: 'sandstone_top', side: 'sandstone_side' }, hardness: 0.8, tool: TOOL.PICK, tier: 1 },
  { key: 'cactus', name: 'Cactus', tex: { top: 'cactus_top', bottom: 'cactus_top', side: 'cactus_side' }, render: RENDER.SHAPE, shapeKind: 35 /* SHAPE_KIND.CACTUS */, opaque: false, hardness: 0.4, sound: 'wood', contactDamage: 1, needsSupport: true },
  { key: 'snow_block', name: 'Snow', tex: 'snow', hardness: 0.2, tool: TOOL.SHOVEL, sound: 'snow' },
  { key: 'stone_bricks', name: 'Stone Bricks', tex: 'stone_bricks', hardness: 1.5, tool: TOOL.PICK, tier: 1 },
  { key: 'bricks', name: 'Bricks', tex: 'bricks', hardness: 2, tool: TOOL.PICK, tier: 1 },
  { key: 'glowstone', name: 'Glow Lantern', tex: 'glowstone', light: 15, hardness: 0.3, sound: 'glass' },
  { key: 'mossy_cobblestone', name: 'Mossy Cobblestone', tex: 'mossy_cobblestone', hardness: 2, tool: TOOL.PICK, tier: 1 },
  { key: 'clay', name: 'Clay', tex: 'clay', hardness: 0.6, tool: TOOL.SHOVEL, drop: 'clay_ball', dropCount: [3, 4], sound: 'gravel' },
  { key: 'ice', name: 'Ice', tex: 'ice', render: RENDER.CUTOUT, opaque: false, hardness: 0.5, tool: TOOL.PICK, drop: 'frost_shard', dropChance: 0.5, sound: 'glass', selfCull: true, slippery: true },
  { key: 'wool', name: 'White Wool', tex: 'wool', hardness: 0.8, sound: 'wool' },
  // --- Ember Depths ---
  { key: 'emberstone', name: 'Emberstone', tex: 'emberstone', hardness: 0.4, tool: TOOL.PICK, tier: 1 },
  { key: 'ash', name: 'Ash', tex: 'ash', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'sand' },
  { key: 'cinderite_ore', name: 'Cinderite Ore', tex: 'cinderite_ore', hardness: 3, tool: TOOL.PICK, tier: 3, drop: 'cinderite_shard', xp: 5, light: 6 },
  // --- Skylands ---
  { key: 'skystone', name: 'Skystone', tex: 'skystone', hardness: 1.2, tool: TOOL.PICK, tier: 1 },
  { key: 'sky_grass', name: 'Sky Grass', tex: { top: 'sky_grass_top', bottom: 'dirt', side: 'sky_grass_side' }, hardness: 0.6, tool: TOOL.SHOVEL, drop: 'dirt', sound: 'grass' },
  { key: 'aether_crystal_ore', name: 'Aether Crystal Ore', tex: 'aether_crystal_ore', hardness: 3, tool: TOOL.PICK, tier: 2, drop: 'aether_crystal', xp: 4, light: 5 },
  { key: 'cloud_leaves', name: 'Cloud Leaves', tex: 'cloud_leaves', render: RENDER.CUTOUT, opaque: false, hardness: 0.2, sound: 'wool', isLeaves: true, lightAtt: 1 },
  // A guttering torch found deep in strange tunnels. Nobody placed it. Mining it leaves nothing.
  { key: 'old_torch', name: 'Old Torch', tex: 'old_torch', render: RENDER.TORCH, solid: false, opaque: false, light: 7, hardness: 0, sound: 'wood', needsSupport: true, drop: null },
  // Things set down by hand: item piles (ground storage) and placed backpacks.
  { key: 'item_pile', name: 'Ground Storage', render: RENDER.NONE, solid: false, opaque: false, hardness: 0, drop: null, sound: 'wood', pile: true, sink: true, wlog: true },
  { key: 'backpack_block', name: 'Backpack', render: RENDER.NONE, solid: false, opaque: false, hardness: 0.3, drop: null, sound: 'wool', placedBackpack: true, sink: true },
  // The walls of a pocket dimension: unbreakable, softly glowing.
  { key: 'pocket_wall', name: 'Pocket Wall', tex: 'pocket_wall', hardness: -1, light: 10, sound: 'stone' },
  // --- Portals (no collision; standing inside travels between dimensions) ---
  { key: 'ember_portal', name: 'Ember Portal', tex: 'ember_portal', render: RENDER.LIQUID, solid: false, opaque: false, light: 11, hardness: -1, portal: 1, drop: null },
  { key: 'sky_portal', name: 'Sky Portal', tex: 'sky_portal', render: RENDER.LIQUID, solid: false, opaque: false, light: 11, hardness: -1, portal: 2, drop: null },
  // Small shaped blocks (boxes listed in SHAPES, world/mesher.js). Meta 1 = hanging from the ceiling.
  { key: 'lantern', name: 'Lantern', tex: 'lantern', render: RENDER.MODEL, shape: 'lantern', solid: false, opaque: false, light: 15, hardness: 0.6, tool: TOOL.PICK, sound: 'metal', needsSupport: true, sink: true, wlog: true },
];

// ---- the wider catalogue ---------------------------------------------------------------
// Families are generated: every building material gets its stairs, slabs and
// walls; every wood its planks, stairs, slabs, fence, gate, door and trapdoor.
// Shaped blocks borrow the textures of the block they are made from (`base`).
const BLOCK_EXTRA = [];
const addB = (d) => { BLOCK_EXTRA.push(d); return d; };
const STONE_P = { hardness: 1.5, tool: TOOL.PICK, tier: 1, sound: 'stone' };
const WOOD_P = { hardness: 2, tool: TOOL.AXE, sound: 'wood', fuel: 1.5 };
// stairs / slab / wall (or fence + gate) for a full block
function shapeFamily(base, prefix, label, kinds, props) {
  const sh = { stairs: [SHAPE_KIND.STAIRS, ' Stairs', 'Stairs'], slab: [SHAPE_KIND.SLAB, ' Slab', 'Slab'], wall: [SHAPE_KIND.WALL, ' Wall', 'Wall'], fence: [SHAPE_KIND.FENCE, ' Fence', 'Fence'], gate: [SHAPE_KIND.GATE, ' Fence Gate', 'Gate'] };
  for (const k of kinds) {
    const [kind, suffix] = sh[k];
    addB(Object.assign({}, props, { key: prefix + '_' + (k === 'gate' ? 'fence_gate' : k), name: label + suffix, base, render: RENDER.SHAPE, shapeKind: kind, solid: true, opaque: false, wlog: true, family: k }));
  }
}
const SHAPE_KIND = { SLAB: 1, STAIRS: 2, FENCE: 3, GATE: 4, WALL: 5, PANE: 6, DOOR: 7, TRAPDOOR: 8, LADDER: 9, CARPET: 10, BED: 11, LAYER: 12,
  CANDLE: 13, CAKE: 14, ROD: 15, SCAFFOLD: 16, PATH: 17, FRAME: 18, COMPOSTER: 19, COCOA: 20, PETALS: 21,
  WIRE: 22, LEVER: 23, BUTTON: 24, PLATE: 25, REPEATER: 26, COMPARATOR: 27, RAIL: 28, PISTON_BASE: 29, PISTON_HEAD: 30, HOPPER: 31, DAYLIGHT: 32,
  HOOK: 33, TRIPWIRE: 34, CACTUS: 35, CHORUS: 36 };

// --- woods -----------------------------------------------------------------------------
// [id, label, log key, planks key, leaves key, sapling key, leaf tint]
const WOODS = [
  ['oak', 'Oak', 'log', 'planks', 'leaves', 'sapling', 'foliage'],
  ['birch', 'Birch', 'birch_log', 'birch_planks', 'birch_leaves', 'birch_sapling', 'foliage'],
  ['spruce', 'Spruce', 'spruce_log', 'spruce_planks', 'spruce_leaves', 'spruce_sapling', null],
  ['jungle', 'Jungle', 'jungle_log', 'jungle_planks', 'jungle_leaves', 'jungle_sapling', 'foliage'],
  ['acacia', 'Acacia', 'acacia_log', 'acacia_planks', 'acacia_leaves', 'acacia_sapling', 'foliage'],
  ['dark_oak', 'Dark Oak', 'dark_oak_log', 'dark_oak_planks', 'dark_oak_leaves', 'dark_oak_sapling', 'foliage'],
  ['cherry', 'Cherry', 'cherry_log', 'cherry_planks', 'cherry_leaves', 'cherry_sapling', null],
  ['mangrove', 'Mangrove', 'mangrove_log', 'mangrove_planks', 'mangrove_leaves', 'mangrove_propagule', 'foliage'],
  ['crimson', 'Crimson', 'crimson_stem', 'crimson_planks', 'nether_wart_block', 'crimson_fungus', null],
  ['warped', 'Warped', 'warped_stem', 'warped_planks', 'warped_wart_block', 'warped_fungus', null],
  // the two Luanti woods
  ['pine', 'Pine', 'pine_log', 'pine_planks', 'pine_needles', 'pine_sapling', null],
  ['aspen', 'Aspen', 'aspen_log', 'aspen_planks', 'aspen_leaves', 'aspen_sapling', 'foliage'],
];
const STEMS = new Set(['crimson', 'warped']);
const EXISTING = new Set(BLOCK_DEFS.map(d => d.key));
for (const [w, L, logK, plK, lfK, spK, tint] of WOODS) {
  const stem = STEMS.has(w), LG = stem ? ' Stem' : ' Log', WD = stem ? ' Hyphae' : ' Wood';
  const lt = { top: w + '_log_top', bottom: w + '_log_top', side: w + '_log_side' };
  if (!EXISTING.has(logK)) addB(Object.assign({ key: logK, name: L + LG, tex: lt, isLog: true, axisBlock: true }, WOOD_P, stem ? { fuel: 0 } : {}));
  else Object.assign(BLOCK_DEFS.find(d => d.key === logK), { axisBlock: true });
  addB(Object.assign({ key: w + (stem ? '_hyphae' : '_wood'), name: L + WD, tex: w === 'oak' ? 'log_side' : w + '_log_side', axisBlock: true, strip: 'stripped_' + w + (stem ? '_hyphae' : '_wood') }, WOOD_P));
  addB(Object.assign({ key: 'stripped_' + logK, name: 'Stripped ' + L + LG, tex: { top: 'stripped_' + w + '_log_top', bottom: 'stripped_' + w + '_log_top', side: 'stripped_' + w + '_log_side' }, axisBlock: true }, WOOD_P));
  addB(Object.assign({ key: 'stripped_' + w + (stem ? '_hyphae' : '_wood'), name: 'Stripped ' + L + WD, tex: 'stripped_' + w + '_log_side', axisBlock: true }, WOOD_P));
  BLOCK_DEFS.concat(BLOCK_EXTRA).find(d => d.key === logK).strip = 'stripped_' + logK;
  if (!EXISTING.has(plK)) addB(Object.assign({ key: plK, name: L + ' Planks', tex: w + '_planks' }, WOOD_P, stem ? { fuel: 0 } : {}));
  if (!EXISTING.has(lfK)) {
    if (stem) addB({ key: lfK, name: w === 'crimson' ? 'Nether Wart Block' : 'Warped Wart Block', tex: lfK, hardness: 1, tool: TOOL.AXE, sound: 'grass', isLeaves: true, drop: lfK });
    else addB({ key: lfK, name: w === 'pine' ? 'Pine Needles' : L + ' Leaves', tex: w === 'pine' ? 'pine_needles' : w + '_leaves', tint: tint || undefined, render: RENDER.CUTOUT, opaque: false, hardness: 0.2, sound: 'grass', isLeaves: true, lightAtt: 1, sapling: spK });
  }
  if (!EXISTING.has(spK)) addB({ key: spK, name: stem ? L + ' Fungus' : w === 'mangrove' ? 'Mangrove Propagule' : L + ' Sapling', tex: spK.replace(/^(\w+)_sapling$/, '$1_sapling'), render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', needsSupport: true, fuel: 0.5, tree: w });
  else Object.assign(BLOCK_DEFS.find(d => d.key === spK), { tree: w });
  addB(Object.assign({ key: w + '_sign', name: L + ' Sign', tex: plK === 'planks' ? 'planks' : w + '_planks', render: RENDER.NONE, solid: false, opaque: false, sign: true, wlog: true, hardness: 1, itemIcon: w + '_sign_item', sink: true }, { tool: TOOL.AXE, sound: 'wood', fuel: 1 }));
  shapeFamily(plK, w, L, ['stairs', 'slab', 'fence', 'gate'], WOOD_P);
  addB(Object.assign({ key: w + '_door', name: L + ' Door', tex: { side: w + '_door_lower', top: w + '_door_lower' }, texUpper: w + '_door_upper', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.DOOR, solid: true, opaque: false, door: true, itemIcon: w + '_door_item' }, WOOD_P, { fuel: 1 }));
  addB(Object.assign({ key: w + '_trapdoor', name: L + ' Trapdoor', tex: w + '_trapdoor', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.TRAPDOOR, solid: true, opaque: false, wlog: true, trapdoor: true }, WOOD_P, { fuel: 1 }));
}

// --- stones -------------------------------------------------------------------------------
// [key, label, texture, families, props]
const STONES = [
  ['stone', 'Stone', null, ['stairs', 'slab']],
  ['cobblestone', 'Cobblestone', null, ['stairs', 'slab', 'wall']],
  ['mossy_cobblestone', 'Mossy Cobblestone', null, ['stairs', 'slab', 'wall']],
  ['smooth_stone', 'Smooth Stone', 'smooth_stone', ['slab']],
  ['stone_bricks', 'Stone Brick', null, ['stairs', 'slab', 'wall']],
  ['mossy_stone_bricks', 'Mossy Stone Brick', 'mossy_stone_bricks', ['stairs', 'slab', 'wall']],
  ['cracked_stone_bricks', 'Cracked Stone Bricks', 'cracked_stone_bricks', []],
  ['chiseled_stone_bricks', 'Chiseled Stone Bricks', 'chiseled_stone_bricks', []],
  ['granite', 'Granite', 'granite', ['stairs', 'slab', 'wall']],
  ['polished_granite', 'Polished Granite', 'polished_granite', ['stairs', 'slab']],
  ['diorite', 'Diorite', 'diorite', ['stairs', 'slab', 'wall']],
  ['polished_diorite', 'Polished Diorite', 'polished_diorite', ['stairs', 'slab']],
  ['andesite', 'Andesite', 'andesite', ['stairs', 'slab', 'wall']],
  ['polished_andesite', 'Polished Andesite', 'polished_andesite', ['stairs', 'slab']],
  ['slate', 'Slate', 'slate', [], { drop: 'cobbled_slate', hardness: 2.5 }],
  ['cobbled_slate', 'Cobbled Slate', 'cobbled_slate', ['stairs', 'slab', 'wall'], { hardness: 2.5 }],
  ['polished_slate', 'Polished Slate', 'polished_slate', ['stairs', 'slab', 'wall'], { hardness: 2.5 }],
  ['slate_bricks', 'Slate Brick', 'slate_bricks', ['stairs', 'slab', 'wall'], { hardness: 2.5 }],
  ['slate_tiles', 'Slate Tile', 'slate_tiles', ['stairs', 'slab', 'wall'], { hardness: 2.5 }],
  ['basalt', 'Basalt', 'basalt', [], { tex: { top: 'basalt_top', bottom: 'basalt_top', side: 'basalt' }, axisBlock: true }],
  ['polished_basalt', 'Polished Basalt', 'polished_basalt', ['stairs', 'slab']],
  ['marble', 'Marble', 'marble', ['stairs', 'slab']],
  ['marble_bricks', 'Marble Brick', 'marble_bricks', ['stairs', 'slab', 'wall']],
  ['marble_pillar', 'Marble Pillar', null, [], { tex: { top: 'marble_pillar_top', bottom: 'marble_pillar_top', side: 'marble_pillar' }, axisBlock: true }],
  ['limestone', 'Limestone', 'limestone', ['stairs', 'slab']],
  ['limestone_bricks', 'Limestone Brick', 'limestone_bricks', ['stairs', 'slab', 'wall']],
  ['sandstone', 'Sandstone', null, ['stairs', 'slab', 'wall']],
  ['smooth_sandstone', 'Smooth Sandstone', null, ['stairs', 'slab'], { tex: 'sandstone_top' }],
  ['cut_sandstone', 'Cut Sandstone', 'cut_sandstone', ['slab']],
  ['chiseled_sandstone', 'Chiseled Sandstone', 'chiseled_sandstone', []],
  ['red_sandstone', 'Red Sandstone', null, ['stairs', 'slab', 'wall'], { tex: { top: 'red_sandstone_top', bottom: 'red_sandstone_top', side: 'red_sandstone_side' }, hardness: 0.8 }],
  ['bricks', 'Brick', null, ['stairs', 'slab', 'wall']],
  ['mud_bricks', 'Mud Brick', 'mud_bricks', ['stairs', 'slab', 'wall'], { hardness: 1.5 }],
  ['packed_mud', 'Packed Mud', 'packed_mud', [], { hardness: 1, tool: TOOL.PICK, tier: 0 }],
  ['quartz_block', 'Quartz', 'quartz_block', ['stairs', 'slab'], { hardness: 0.8 }],
  ['quartz_bricks', 'Quartz Bricks', 'quartz_bricks', [], { hardness: 0.8 }],
  ['quartz_pillar', 'Quartz Pillar', null, [], { tex: { top: 'quartz_pillar_top', bottom: 'quartz_pillar_top', side: 'quartz_pillar' }, axisBlock: true, hardness: 0.8 }],
  ['blackstone', 'Blackstone', 'blackstone', ['stairs', 'slab', 'wall']],
  ['blackstone_bricks', 'Blackstone Brick', 'blackstone_bricks', ['stairs', 'slab', 'wall']],
  ['emberstone_bricks', 'Emberstone Brick', 'emberstone_bricks', ['stairs', 'slab', 'wall'], { hardness: 1 }],
  ['skystone_bricks', 'Skystone Brick', 'skystone_bricks', ['stairs', 'slab', 'wall'], { hardness: 1.2 }],
  ['roof_tiles', 'Clay Roof', 'roof_tiles', ['stairs', 'slab'], { hardness: 1.2 }],
  ['tuff', 'Tuff', 'tuff', ['stairs', 'slab', 'wall']],
  ['calcite', 'Calcite', 'calcite', []],
  ['dripstone_block', 'Dripstone Block', 'dripstone_block', []],
  ['desert_stone', 'Desert Stone', 'desert_stone', ['stairs', 'slab', 'wall'], { drop: 'desert_cobble' }],
  ['desert_stone_bricks', 'Desert Stone Brick', 'desert_stone_bricks', ['stairs', 'slab', 'wall']],
  ['nether_bricks', 'Nether Brick', 'nether_bricks', ['stairs', 'slab', 'wall', 'fence'], { hardness: 2 }],
  ['red_nether_bricks', 'Red Nether Brick', 'red_nether_bricks', ['stairs', 'slab', 'wall'], { hardness: 2 }],
  ['prismarine', 'Prismarine', 'prismarine', ['stairs', 'slab', 'wall']],
  ['prismarine_bricks', 'Prismarine Brick', 'prismarine_bricks', ['stairs', 'slab']],
  ['dark_prismarine', 'Dark Prismarine', 'dark_prismarine', ['stairs', 'slab']],
  ['end_stone', 'End Stone', 'end_stone', []],
  ['end_stone_bricks', 'End Stone Brick', 'end_stone_bricks', ['stairs', 'slab', 'wall']],
  ['purpur_block', 'Purpur', 'purpur_block', ['stairs', 'slab']],
  ['cut_copper', 'Cut Copper', 'cut_copper', ['stairs', 'slab'], { hardness: 3, sound: 'metal' }],
  ['exposed_cut_copper', 'Exposed Cut Copper', 'exposed_cut_copper', ['stairs', 'slab'], { hardness: 3, sound: 'metal' }],
  ['weathered_cut_copper', 'Weathered Cut Copper', 'weathered_cut_copper', ['stairs', 'slab'], { hardness: 3, sound: 'metal' }],
  ['oxidized_cut_copper', 'Oxidized Cut Copper', 'oxidized_cut_copper', ['stairs', 'slab'], { hardness: 3, sound: 'metal' }],
  ['dark_roof_tiles', 'Slate Roof', 'dark_roof_tiles', ['stairs', 'slab'], { hardness: 1.2 }],
];
for (const [key, label, tex, fam, props] of STONES) {
  const P = Object.assign({}, STONE_P, props || {});
  if (!EXISTING.has(key)) addB(Object.assign({ key, name: label.endsWith('Brick') || label.endsWith('Tile') ? label + 's' : label, tex: tex || key }, P));
  const famLabel = label;
  shapeFamily(key, key.replace(/_block$/, '').replace(/bricks$/, 'brick').replace(/tiles$/, 'tile'), famLabel, fam, P);
}
// existing blocks that also get families
shapeFamily('snow_block', 'snow', 'Snow', [], {});

// --- natural blocks, ores, metals -------------------------------------------------------
[
  ['coarse_dirt', 'Coarse Dirt', { tex: 'coarse_dirt', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'gravel' }],
  ['podzol', 'Podzol', { tex: { top: 'podzol_top', bottom: 'dirt', side: 'podzol_side' }, hardness: 0.5, tool: TOOL.SHOVEL, sound: 'gravel', drop: 'dirt' }],
  ['moss_block', 'Moss Block', { tex: 'moss_block', hardness: 0.2, tool: TOOL.SHOVEL, sound: 'grass' }],
  ['mud', 'Mud', { tex: 'mud', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'gravel' }],
  ['red_sand', 'Red Sand', { tex: 'red_sand', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'sand' }],
  ['packed_ice', 'Packed Ice', { tex: 'packed_ice', hardness: 0.5, tool: TOOL.PICK, sound: 'glass', slippery: true }],
  ['terracotta', 'Terracotta', { tex: 'terracotta', hardness: 1.25, tool: TOOL.PICK, tier: 1 }],
  ['copper_ore', 'Copper Ore', { tex: 'copper_ore', hardness: 3, tool: TOOL.PICK, tier: 2, xp: 1 }],
  ['lapis_ore', 'Lapis Ore', { tex: 'lapis_ore', hardness: 3, tool: TOOL.PICK, tier: 2, drop: 'lapis_lazuli', dropCount: [3, 6], xp: 3 }],
  ['emerald_ore', 'Emerald Ore', { tex: 'emerald_ore', hardness: 3, tool: TOOL.PICK, tier: 3, drop: 'emerald', xp: 5 }],
  ['quartz_ore', 'Ember Quartz Ore', { tex: 'quartz_ore', hardness: 3, tool: TOOL.PICK, tier: 1, drop: 'quartz', dropCount: [1, 2], xp: 2 }],
  ['coal_block', 'Block of Coal', { tex: 'coal_block', hardness: 5, tool: TOOL.PICK, tier: 1, fuel: 80 }],
  ['iron_block', 'Block of Iron', { tex: 'iron_block', hardness: 5, tool: TOOL.PICK, tier: 2, sound: 'metal' }],
  ['gold_block', 'Block of Gold', { tex: 'gold_block', hardness: 3, tool: TOOL.PICK, tier: 3, sound: 'metal' }],
  ['diamond_block', 'Block of Diamond', { tex: 'diamond_block', hardness: 5, tool: TOOL.PICK, tier: 3, sound: 'metal' }],
  ['copper_block', 'Block of Copper', { tex: 'copper_block', hardness: 3, tool: TOOL.PICK, tier: 2, sound: 'metal' }],
  ['lapis_block', 'Block of Lapis', { tex: 'lapis_block', hardness: 3, tool: TOOL.PICK, tier: 2 }],
  ['emerald_block', 'Block of Emerald', { tex: 'emerald_block', hardness: 5, tool: TOOL.PICK, tier: 3, sound: 'metal' }],
  ['bookshelf', 'Bookshelf', { tex: { top: 'planks', bottom: 'planks', side: 'bookshelf' }, hardness: 1.5, tool: TOOL.AXE, sound: 'wood', fuel: 1.5, drop: 'book', dropCount: [3, 3] }],
  ['pumpkin', 'Pumpkin', { tex: { top: 'pumpkin_top', bottom: 'pumpkin_top', side: 'pumpkin_side' }, hardness: 1, tool: TOOL.AXE, sound: 'wood' }],
  ['carved_pumpkin', 'Carved Pumpkin', { tex: { top: 'pumpkin_top', bottom: 'pumpkin_top', side: 'pumpkin_side', front: 'carved_pumpkin' }, hardness: 1, tool: TOOL.AXE, sound: 'wood' }],
  ['jack_o_lantern', "Jack o'Lantern", { tex: { top: 'pumpkin_top', bottom: 'pumpkin_top', side: 'pumpkin_side', front: 'jack_o_lantern' }, hardness: 1, tool: TOOL.AXE, sound: 'wood', light: 15 }],
  ['melon', 'Melon', { tex: { top: 'melon_top', bottom: 'melon_top', side: 'melon_side' }, hardness: 1, tool: TOOL.AXE, sound: 'wood', drop: 'melon_slice', dropCount: [3, 7] }],
  ['hay_bale', 'Hay Bale', { tex: { top: 'hay_top', bottom: 'hay_top', side: 'hay_side' }, hardness: 0.5, sound: 'grass', axisBlock: true, fuel: 4 }],
  ['thatch', 'Thatch', { tex: 'thatch', hardness: 0.5, sound: 'grass', fuel: 2 }],
  ['cob', 'Cob', { tex: 'cob', hardness: 1, tool: TOOL.SHOVEL, sound: 'gravel' }],
  ['daub', 'Wattle and Daub', { tex: 'daub', hardness: 1, tool: TOOL.AXE, sound: 'wood' }],
  ['plaster', 'Plaster', { tex: 'plaster', hardness: 1, tool: TOOL.PICK, sound: 'stone' }],
  ['timber_frame', 'Timber Frame', { tex: 'timber_frame', hardness: 1.5, tool: TOOL.AXE, sound: 'wood' }],
  ['timber_frame_cross', 'Timber Frame (Cross)', { tex: 'timber_frame_cross', hardness: 1.5, tool: TOOL.AXE, sound: 'wood' }],
  ['timber_frame_diagonal', 'Timber Frame (Diagonal)', { tex: 'timber_frame_diagonal', hardness: 1.5, tool: TOOL.AXE, sound: 'wood' }],
  ['sea_lantern', 'Sea Lantern', { tex: 'sea_lantern', hardness: 0.3, sound: 'glass', light: 15 }],
  ['sponge', 'Sponge', { tex: 'sponge', hardness: 0.6, sound: 'grass' }],
  ['barrel', 'Barrel', { tex: { top: 'barrel_top', bottom: 'barrel_bottom', side: 'barrel_side' }, hardness: 2.5, tool: TOOL.AXE, sound: 'wood', container: 27, carry: true }],
  ['mycelium', 'Mycelium', { tex: { top: 'mycelium_top', bottom: 'dirt', side: 'mycelium_side' }, hardness: 0.6, tool: TOOL.SHOVEL, sound: 'grass', drop: 'dirt' }],
  ['rooted_dirt', 'Rooted Dirt', { tex: 'rooted_dirt', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'gravel' }],
  ['silver_sand', 'Silver Sand', { tex: 'silver_sand', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'sand', falls: true }],
  ['permafrost', 'Permafrost', { tex: 'permafrost', hardness: 1.5, tool: TOOL.PICK, sound: 'gravel', drop: 'dirt' }],
  ['blue_ice', 'Blue Ice', { tex: 'blue_ice', hardness: 2.8, tool: TOOL.PICK, sound: 'glass', slippery: true }],
  ['magma_block', 'Magma Block', { tex: 'magma_block', hardness: 0.5, tool: TOOL.PICK, tier: 1, light: 3, hot: true }],
  ['soul_soil', 'Soul Soil', { tex: 'soul_soil', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'sand' }],
  ['crying_obsidian', 'Crying Obsidian', { tex: 'crying_obsidian', hardness: 25, tool: TOOL.PICK, tier: 4, light: 10 }],
  ['amethyst_block', 'Block of Amethyst', { tex: 'amethyst_block', hardness: 1.5, tool: TOOL.PICK, sound: 'glass' }],
  ['tinted_glass', 'Tinted Glass', { tex: 'tinted_glass', render: RENDER.CUTOUT, opaque: false, lightAtt: 15, hardness: 0.3, sound: 'glass', selfCull: true, translucent: true }],
  ['brown_mushroom_block', 'Brown Mushroom Block', { tex: 'brown_mushroom_block', hardness: 0.2, tool: TOOL.AXE, sound: 'wood', drop: 'brown_mushroom', dropChance: 0.3 }],
  ['red_mushroom_block', 'Red Mushroom Block', { tex: 'red_mushroom_block', hardness: 0.2, tool: TOOL.AXE, sound: 'wood', drop: 'red_mushroom', dropChance: 0.3 }],
  ['mushroom_stem', 'Mushroom Stem', { tex: 'mushroom_stem', hardness: 0.2, tool: TOOL.AXE, sound: 'wood', drop: null }],
  ['exposed_copper', 'Exposed Copper', { tex: 'exposed_copper', hardness: 3, tool: TOOL.PICK, tier: 2, sound: 'metal' }],
  ['weathered_copper', 'Weathered Copper', { tex: 'weathered_copper', hardness: 3, tool: TOOL.PICK, tier: 2, sound: 'metal' }],
  ['oxidized_copper', 'Oxidized Copper', { tex: 'oxidized_copper', hardness: 3, tool: TOOL.PICK, tier: 2, sound: 'metal' }],
  ['tin_ore', 'Tin Ore', { tex: 'tin_ore', hardness: 3, tool: TOOL.PICK, tier: 2, xp: 1 }],
  ['tin_block', 'Block of Tin', { tex: 'tin_block', hardness: 3, tool: TOOL.PICK, tier: 2, sound: 'metal' }],
  ['bronze_block', 'Block of Bronze', { tex: 'bronze_block', hardness: 4, tool: TOOL.PICK, tier: 2, sound: 'metal' }],
  ['mese_ore', 'Mese Ore', { tex: 'mese_ore', hardness: 3, tool: TOOL.PICK, tier: 3, drop: 'mese_crystal', xp: 5, light: 3 }],
  ['mese_lamp', 'Mese Lamp', { tex: 'mese_lamp', hardness: 0.3, sound: 'glass', light: 15 }],
  ['obsidian_glass', 'Obsidian Glass', { tex: 'obsidian_glass', render: RENDER.CUTOUT, opaque: false, hardness: 10, tool: TOOL.PICK, sound: 'glass', selfCull: true }],
  ['farmland', 'Farmland', { tex: { top: 'farmland', bottom: 'dirt', side: 'dirt' }, render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PATH, solid: true, opaque: false, hardness: 0.6, tool: TOOL.SHOVEL, sound: 'gravel', drop: 'dirt' }],   // (0.9.0.11) a sixteenth lower, like a path
  ['smoker', 'Smoker', { tex: { top: 'smoker_top', bottom: 'smoker_top', side: 'smoker_side', front: 'smoker_front' }, hardness: 3.5, tool: TOOL.PICK, tier: 1, furnace: 'smoker', carry: true }],
  ['lit_smoker', 'Smoker', { tex: { top: 'smoker_top', bottom: 'smoker_top', side: 'smoker_side', front: 'smoker_front_lit' }, hardness: 3.5, tool: TOOL.PICK, tier: 1, light: 13, drop: 'smoker', furnace: 'smoker', carry: true, unlit: 'smoker' }],
  ['blast_furnace', 'Blast Furnace', { tex: { top: 'blast_furnace_top', bottom: 'blast_furnace_top', side: 'blast_furnace_side', front: 'blast_furnace_front' }, hardness: 3.5, tool: TOOL.PICK, tier: 1, furnace: 'blast', carry: true }],
  ['lit_blast_furnace', 'Blast Furnace', { tex: { top: 'blast_furnace_top', bottom: 'blast_furnace_top', side: 'blast_furnace_side', front: 'blast_furnace_front_lit' }, hardness: 3.5, tool: TOOL.PICK, tier: 1, light: 13, drop: 'blast_furnace', furnace: 'blast', carry: true, unlit: 'blast_furnace' }],
  ['stonecutter', 'Stonecutter', { tex: { top: 'stonecutter_top', bottom: 'smooth_stone', side: 'stonecutter_side' }, render: RENDER.MODEL, shape: 'stonecutter', facingModel: true, solid: true, opaque: false, hardness: 3.5, tool: TOOL.PICK, stonecutter: true }],   // (0.9.0.11) a low bench with its saw, like the real one
  ['note_block', 'Note Block', { tex: 'note_block', hardness: 0.8, tool: TOOL.AXE, sound: 'wood', noteBlock: true, fuel: 1 }],
  ['tnt', 'TNT', { tex: { top: 'tnt_top', bottom: 'tnt_bottom', side: 'tnt_side' }, hardness: 0, sound: 'grass', tnt: true }],
  ['dried_kelp_block', 'Dried Kelp Block', { tex: { top: 'dried_kelp_top', bottom: 'dried_kelp_top', side: 'dried_kelp_side' }, hardness: 0.5, sound: 'grass', fuel: 20 }],
].forEach(([key, name, props]) => addB(Object.assign({ key, name }, props)));
shapeFamily('thatch', 'thatch', 'Thatch', ['stairs', 'slab'], { hardness: 0.5, sound: 'grass' });
shapeFamily('plaster', 'plaster', 'Plaster', ['stairs', 'slab', 'wall'], STONE_P);
shapeFamily('cob', 'cob', 'Cob', ['stairs', 'slab', 'wall'], { hardness: 1, tool: TOOL.SHOVEL, sound: 'gravel' });
shapeFamily('mossy_stone_bricks', 'mossy_stone_brick', 'Mossy Stone Brick', [], STONE_P);
for (const k of ['sand', 'gravel', 'red_sand']) Object.assign(BLOCK_DEFS.concat(BLOCK_EXTRA).find(d => d.key === k), { falls: true });
BLOCK_DEFS.find(d => d.key === 'gravel').extraDrops = undefined;
// corals and the sea floor
const CORALS = [['tube', 'Tube'], ['brain', 'Brain'], ['bubble', 'Bubble'], ['fire', 'Fire'], ['horn', 'Horn']];
for (const [c, L] of CORALS) {
  addB({ key: c + '_coral_block', name: L + ' Coral Block', tex: c + '_coral_block', hardness: 1.5, tool: TOOL.PICK, sound: 'stone' });
  addB({ key: c + '_coral', name: L + ' Coral', tex: c + '_coral', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', wlog: true, needsSupport: true, alwaysWet: true });
}
addB({ key: 'dead_coral_block', name: 'Dead Coral Block', tex: 'dead_coral_block', hardness: 1.5, tool: TOOL.PICK });
addB({ key: 'seagrass', name: 'Seagrass', tex: 'seagrass', render: RENDER.CROSS, solid: false, opaque: false, replaceable: true, hardness: 0, sound: 'grass', drop: null, wlog: true, alwaysWet: true, needsSupport: true });
addB({ key: 'kelp', name: 'Kelp', tex: 'kelp', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', wlog: true, alwaysWet: true, needsSupport: true, stackPlant: true });
addB({ key: 'amethyst_cluster', name: 'Amethyst Cluster', tex: 'amethyst_cluster', render: RENDER.CROSS, solid: false, opaque: false, hardness: 1.5, tool: TOOL.PICK, sound: 'glass', light: 5, needsSupport: true, drop: 'amethyst_shard', dropCount: [2, 4] });
addB({ key: 'moss_carpet', name: 'Moss Carpet', base: 'moss_block', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.CARPET, solid: true, opaque: false, hardness: 0.1, sound: 'grass', sink: true });
addB({ key: 'vine', name: 'Vines', tex: 'vine', tint: 'foliage', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.LADDER, solid: false, opaque: false, replaceable: true, hardness: 0.2, sound: 'grass', climb: true, drop: null });
// two-block-tall plants (meta bit 0 = upper half)
for (const [k, n, tint] of [['sunflower', 'Sunflower'], ['lilac', 'Lilac'], ['rose_bush', 'Rose Bush'], ['peony', 'Peony'], ['large_fern', 'Large Fern', 'grass'], ['tall_grass_double', 'Tall Grass', 'grass']]) {
  addB({ key: k, name: n, tex: k + '_lower', texUpper: k + '_upper', tint, render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', needsSupport: true, double: true, replaceable: k === 'tall_grass_double', drop: k === 'tall_grass_double' ? null : undefined, flower: !tint });
}
// crops: meta = growth stage
for (const [k, n, stages, drop] of [['wheat_crop', 'Wheat', 8, 'wheat'], ['carrot_crop', 'Carrots', 4, 'carrot'], ['potato_crop', 'Potatoes', 4, 'potato'], ['beetroot_crop', 'Beetroots', 4, 'beetroot']]) {
  addB({ key: k, name: n, tex: k + '_stage0', render: RENDER.CROSS, hash: true, solid: false, opaque: false, hardness: 0, sound: 'grass', crop: { stages, drop }, needsSupport: true, drop: null });
}
// (0.9.0.27) the kitchen garden (game/farming.js): seed-grown ones drop their seeds as wheat does
for (const [k, n, stages, drop, seed] of [['tomato_crop', 'Tomatoes', 5, 'tomato', 'tomato_seeds'], ['onion_crop', 'Onions', 4, 'onion'], ['cabbage_crop', 'Cabbages', 4, 'cabbage', 'cabbage_seeds'], ['corn_crop', 'Corn', 5, 'corn', 'corn_seeds'], ['pepper_crop', 'Peppers', 4, 'pepper', 'pepper_seeds'], ['strawberry_crop', 'Strawberries', 4, 'strawberry'], ['rice_crop', 'Rice', 4, 'rice']]) {
  addB({ key: k, name: n, tex: k + '_stage0', render: RENDER.CROSS, hash: true, solid: false, opaque: false, hardness: 0, sound: 'grass', crop: { stages, drop, seed }, needsSupport: true, drop: null });
}
// fire (burns out on its own unless it sits on something that burns forever)
addB({ key: 'fire', name: 'Fire', tex: 'fire', render: RENDER.CROSS, solid: false, opaque: false, replaceable: true, hardness: 0, light: 15, drop: null, fire: true, sound: 'wool' });
addB({ key: 'soul_fire', name: 'Soul Fire', tex: 'soul_fire', render: RENDER.CROSS, solid: false, opaque: false, replaceable: true, hardness: 0, light: 10, drop: null, fire: true, sound: 'wool' });
addB({ key: 'flower_pot', name: 'Flower Pot', tex: 'flower_pot', render: RENDER.MODEL, shape: 'flower_pot', solid: true, opaque: false, hardness: 0, sound: 'stone', pot: true, sink: true });
addB({ key: 'cauldron', name: 'Cauldron', tex: 'cauldron_side', render: RENDER.MODEL, shape: 'cauldron', solid: true, opaque: false, hardness: 2, tool: TOOL.PICK, sound: 'metal', cauldron: true });
addB({ key: 'bell', name: 'Bell', tex: 'bell', render: RENDER.MODEL, shape: 'bell', solid: true, opaque: false, hardness: 5, tool: TOOL.PICK, sound: 'metal', bellBlock: true });
addB({ key: 'soul_torch', name: 'Soul Torch', tex: 'soul_torch', render: RENDER.TORCH, solid: false, opaque: false, light: 10, hardness: 0, sound: 'wood', needsSupport: true, sink: true });
addB({ key: 'soul_lantern', name: 'Soul Lantern', tex: 'soul_lantern', render: RENDER.MODEL, shape: 'lantern', solid: false, opaque: false, light: 10, hardness: 0.6, tool: TOOL.PICK, sound: 'metal', needsSupport: true, sink: true, wlog: true });
addB({ key: 'soul_campfire', name: 'Soul Campfire', tex: 'campfire_log', render: RENDER.MODEL, shape: 'soul_campfire', solid: true, opaque: false, light: 10, hardness: 2, tool: TOOL.AXE, sound: 'wood', sink: true, drop: 'soul_soil' });
addB({ key: 'iron_door', name: 'Iron Door', tex: { side: 'iron_door_lower', top: 'iron_door_lower' }, texUpper: 'iron_door_upper', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.DOOR, solid: true, opaque: false, door: true, itemIcon: 'iron_door_item', hardness: 5, tool: TOOL.PICK, sound: 'metal' });
addB({ key: 'iron_trapdoor', name: 'Iron Trapdoor', tex: 'iron_trapdoor', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.TRAPDOOR, solid: true, opaque: false, wlog: true, trapdoor: true, hardness: 5, tool: TOOL.PICK, sound: 'metal' });

// --- colours --------------------------------------------------------------------------------
const COLORS = [
  ['white', 'White', '#e9ecec'], ['orange', 'Orange', '#f07613'], ['magenta', 'Magenta', '#bd44b3'], ['light_blue', 'Light Blue', '#3aafd9'],
  ['yellow', 'Yellow', '#f8c627'], ['lime', 'Lime', '#70b919'], ['pink', 'Pink', '#ed8dac'], ['gray', 'Gray', '#3e4447'],
  ['light_gray', 'Light Gray', '#8e8e86'], ['cyan', 'Cyan', '#158991'], ['purple', 'Purple', '#792aac'], ['blue', 'Blue', '#35399d'],
  ['brown', 'Brown', '#724728'], ['green', 'Green', '#546d1b'], ['red', 'Red', '#a12722'], ['black', 'Black', '#141519'],
];
for (const [c, L] of COLORS) {
  if (c !== 'white') addB({ key: c + '_wool', name: L + ' Wool', tex: c + '_wool', hardness: 0.8, sound: 'wool', color: c });
  addB({ key: c + '_carpet', name: L + ' Carpet', base: c === 'white' ? 'wool' : c + '_wool', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.CARPET, solid: true, opaque: false, hardness: 0.1, sound: 'wool', sink: true, color: c });
  addB({ key: c + '_terracotta', name: L + ' Terracotta', tex: c + '_terracotta', hardness: 1.25, tool: TOOL.PICK, tier: 1, color: c });
  addB({ key: c + '_concrete', name: L + ' Concrete', tex: c + '_concrete', hardness: 1.8, tool: TOOL.PICK, tier: 1, color: c });
  addB({ key: c + '_glazed_terracotta', name: L + ' Glazed Terracotta', tex: c + '_glazed_terracotta', hardness: 1.4, tool: TOOL.PICK, tier: 1, color: c, facingBlock: true });
  addB({ key: c + '_concrete_powder', name: L + ' Concrete Powder', tex: c + '_concrete_powder', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'sand', color: c, falls: true, hardensTo: c + '_concrete' });
  addB({ key: c + '_stained_glass', name: L + ' Stained Glass', tex: c + '_stained_glass', render: RENDER.CUTOUT, translucent: true, opaque: false, hardness: 0.3, sound: 'glass', selfCull: true, color: c });
  addB({ key: c + '_stained_glass_pane', name: L + ' Stained Glass Pane', base: c + '_stained_glass', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PANE, translucent: true, solid: true, opaque: false, hardness: 0.3, sound: 'glass', wlog: true, color: c });
}
addB({ key: 'glass_pane', name: 'Glass Pane', base: 'glass', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PANE, solid: true, opaque: false, hardness: 0.3, sound: 'glass', wlog: true });
addB({ key: 'iron_bars', name: 'Iron Bars', tex: 'iron_bars', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PANE, solid: true, opaque: false, hardness: 5, tool: TOOL.PICK, sound: 'metal', wlog: true });
addB({ key: 'paper_wall', name: 'Paper Wall', tex: 'paper_wall', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PANE, solid: true, opaque: false, hardness: 0.3, tool: TOOL.AXE, sound: 'wool', wlog: true });
addB({ key: 'ladder', name: 'Ladder', tex: 'ladder', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.LADDER, solid: true, opaque: false, hardness: 0.4, tool: TOOL.AXE, sound: 'wood', climb: true, wlog: true, fuel: 1 });
addB({ key: 'bed', name: 'Red Bed', tex: { top: 'red_bed_top', side: 'red_bed_side', bottom: 'planks' }, render: RENDER.SHAPE, shapeKind: SHAPE_KIND.BED, solid: true, opaque: false, hardness: 0.2, sound: 'wool', bed: true, itemIcon: 'red_bed_item', color: 'red' });
for (const [c, L] of COLORS) if (c !== 'red') addB({ key: c + '_bed', name: L + ' Bed', tex: { top: c + '_bed_top', side: c + '_bed_side', bottom: 'planks' }, render: RENDER.SHAPE, shapeKind: SHAPE_KIND.BED, solid: true, opaque: false, hardness: 0.2, sound: 'wool', bed: true, itemIcon: c + '_bed_item', color: c });
// rain leaves puddles in dips in the ground; they dry up again when the sun comes out
addB({ key: 'puddle', name: 'Puddle', tex: 'puddle', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.CARPET, solid: false, opaque: false, replaceable: true, hardness: 0, drop: null, sound: 'grass', puddle: true });
addB({ key: 'snow_layer', name: 'Snow Layer', tex: 'snow', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.LAYER, solid: true, opaque: false, hardness: 0.1, tool: TOOL.SHOVEL, sound: 'snow', replaceable: false, drop: 'snowball' });

// --- plants -------------------------------------------------------------------------------------
const PLANTS = [
  ['blue_orchid', 'Blue Orchid'], ['allium', 'Allium'], ['azure_bluet', 'Azure Bluet'], ['red_tulip', 'Red Tulip'], ['orange_tulip', 'Orange Tulip'],
  ['white_tulip', 'White Tulip'], ['pink_tulip', 'Pink Tulip'], ['oxeye_daisy', 'Oxeye Daisy'], ['cornflower', 'Cornflower'], ['lily_of_the_valley', 'Lily of the Valley'],
  ['lavender', 'Lavender'], ['heather', 'Heather'],
];
for (const [k, n] of PLANTS) addB({ key: k, name: n, tex: k, render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', needsSupport: true, flower: true });
addB({ key: 'fern', name: 'Fern', tex: 'fern', tint: 'grass', render: RENDER.CROSS, solid: false, opaque: false, replaceable: true, hardness: 0, drop: null, sound: 'grass', needsSupport: true });
addB({ key: 'dead_bush', name: 'Dead Bush', tex: 'dead_bush', render: RENDER.CROSS, solid: false, opaque: false, replaceable: true, hardness: 0, drop: 'stick', sound: 'grass', needsSupport: true, fuel: 0.5 });
addB({ key: 'brown_mushroom', name: 'Brown Mushroom', tex: 'brown_mushroom', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', needsSupport: true, light: 1 });
addB({ key: 'red_mushroom', name: 'Red Mushroom', tex: 'red_mushroom', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', needsSupport: true });
addB({ key: 'sugar_cane', name: 'Sugar Cane', tex: 'sugar_cane', tint: 'grass', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', needsSupport: true });
addB({ key: 'cobweb', name: 'Cobweb', tex: 'cobweb', render: RENDER.CROSS, solid: false, opaque: false, hardness: 1, sound: 'wool', drop: 'string', sticky: true });
addB({ key: 'lily_pad', name: 'Lily Pad', tex: 'lily_pad', tint: 'foliage', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.CARPET, solid: true, opaque: false, hardness: 0, sound: 'grass', onWater: true });

// --- light, fire and machines -------------------------------------------------------------------------
addB({ key: 'campfire', name: 'Campfire', tex: 'campfire_log', render: RENDER.MODEL, shape: 'campfire', solid: true, opaque: false, light: 15, hardness: 2, tool: TOOL.AXE, sound: 'wood', sink: true, wlog: false, drop: 'charcoal', dropCount: [1, 2] });
addB({ key: 'chain', name: 'Chain', tex: 'chain', render: RENDER.MODEL, shape: 'chain', solid: false, opaque: false, hardness: 2, tool: TOOL.PICK, sound: 'metal', wlog: true });
addB({ key: 'axle', name: 'Wooden Axle', tex: 'axle', render: RENDER.NONE, solid: false, opaque: false, hardness: 1, tool: TOOL.AXE, sound: 'wood', mech: 'axle' });
addB({ key: 'windmill', name: 'Windmill Sails', tex: 'axle', render: RENDER.NONE, solid: false, opaque: false, hardness: 1.5, tool: TOOL.AXE, sound: 'wood', mech: 'windmill' });
addB({ key: 'waterwheel', name: 'Waterwheel', tex: 'axle', render: RENDER.NONE, solid: false, opaque: false, hardness: 1.5, tool: TOOL.AXE, sound: 'wood', mech: 'waterwheel' });
addB({ key: 'millstone', name: 'Millstone', tex: { top: 'millstone_top', bottom: 'smooth_stone', side: 'millstone_side' }, hardness: 2, tool: TOOL.PICK, sound: 'stone', mech: 'millstone', machine: true });
addB({ key: 'sawmill', name: 'Sawmill', tex: { top: 'sawmill_top', bottom: 'planks', side: 'sawmill_side' }, hardness: 2, tool: TOOL.AXE, sound: 'wood', mech: 'sawmill', machine: true });
// (0.9.0.35) belts, the crusher and the harvester (game/machines.js)
addB({ key: 'conveyor', name: 'Conveyor Belt', tex: { top: 'conveyor_top', side: 'conveyor_side', bottom: 'conveyor_side' }, render: RENDER.SHAPE, shapeKind: SHAPE_KIND.CARPET, solid: true, opaque: false, hardness: 0.8, tool: TOOL.PICK, sound: 'wool', mech: 'belt' });
addB({ key: 'crusher', name: 'Crusher', tex: { top: 'crusher_top', bottom: 'smooth_stone', side: 'crusher_side' }, hardness: 3, tool: TOOL.PICK, sound: 'metal', mech: 'crusher', machine: true });
addB({ key: 'waystone', name: 'Waystone', tex: { top: 'waystone_top', bottom: 'stone_bricks', side: 'waystone_side' }, hardness: 4, tool: TOOL.PICK, sound: 'stone', light: 8, waystone: true });   // (0.9.0.36) game/travel.js
addB({ key: 'dungeon_gate', name: 'Dungeon Gate', tex: 'dungeon_gate', render: RENDER.CUTOUT, opaque: false, hardness: -1, sound: 'metal' });   // (0.9.0.38) game/deephalls.js: opened with its key
addB({ key: 'ward_stone', name: 'Ward Stone', tex: 'ward_stone', hardness: 50, tool: TOOL.PICK, tier: 4, sound: 'stone' });
addB({ key: 'harvester', name: 'Harvester', tex: { top: 'harvester_top', bottom: 'planks', side: 'harvester_side' }, hardness: 2, tool: TOOL.AXE, sound: 'wood', mech: 'harvester' });

// ===== the rest of the classic block set (Minecraft, Mineclonia / VoxeLibre, Luanti, Vintage Story) =====
// --- bamboo: a wood of its own, grown rather than felled ---
addB({ key: 'bamboo', name: 'Bamboo', tex: 'bamboo_stalk', render: RENDER.MODEL, shape: 'bamboo', solid: true, opaque: false, hardness: 1, tool: TOOL.AXE, sound: 'wood', needsSupport: true, stackPlant: true, fuel: 0.25, itemIcon: 'bamboo_item' });
addB(Object.assign({ key: 'bamboo_block', name: 'Block of Bamboo', tex: { top: 'bamboo_block_top', bottom: 'bamboo_block_top', side: 'bamboo_block_side' }, axisBlock: true, strip: 'stripped_bamboo_block' }, WOOD_P));
addB(Object.assign({ key: 'stripped_bamboo_block', name: 'Block of Stripped Bamboo', tex: { top: 'stripped_bamboo_block_top', bottom: 'stripped_bamboo_block_top', side: 'stripped_bamboo_block_side' }, axisBlock: true }, WOOD_P));
addB(Object.assign({ key: 'bamboo_planks', name: 'Bamboo Planks', tex: 'bamboo_planks' }, WOOD_P));
addB(Object.assign({ key: 'bamboo_mosaic', name: 'Bamboo Mosaic', tex: 'bamboo_mosaic' }, WOOD_P));
shapeFamily('bamboo_planks', 'bamboo', 'Bamboo', ['stairs', 'slab', 'fence', 'gate'], WOOD_P);
shapeFamily('bamboo_mosaic', 'bamboo_mosaic', 'Bamboo Mosaic', ['stairs', 'slab'], WOOD_P);
addB(Object.assign({ key: 'bamboo_sign', name: 'Bamboo Sign', tex: 'bamboo_planks', render: RENDER.NONE, solid: false, opaque: false, sign: true, wlog: true, hardness: 1, itemIcon: 'bamboo_sign_item', sink: true }, { tool: TOOL.AXE, sound: 'wood', fuel: 1 }));
addB(Object.assign({ key: 'bamboo_door', name: 'Bamboo Door', tex: { side: 'bamboo_door_lower', top: 'bamboo_door_lower' }, texUpper: 'bamboo_door_upper', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.DOOR, solid: true, opaque: false, door: true, itemIcon: 'bamboo_door_item' }, WOOD_P, { fuel: 1 }));
addB(Object.assign({ key: 'bamboo_trapdoor', name: 'Bamboo Trapdoor', tex: 'bamboo_trapdoor', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.TRAPDOOR, solid: true, opaque: false, wlog: true, trapdoor: true }, WOOD_P, { fuel: 1 }));
addB({ key: 'scaffolding', name: 'Scaffolding', tex: { top: 'scaffolding_top', bottom: 'scaffolding_bottom', side: 'scaffolding_side' }, render: RENDER.SHAPE, shapeKind: SHAPE_KIND.SCAFFOLD, solid: true, opaque: false, hardness: 0, sound: 'wood', climb: true, wlog: true, fuel: 0.25, scaffold: true });

// --- more stone ---
const STONES2 = [
  ['polished_tuff', 'Polished Tuff', 'polished_tuff', ['stairs', 'slab', 'wall']],
  ['tuff_bricks', 'Tuff Brick', 'tuff_bricks', ['stairs', 'slab', 'wall']],
  ['chiseled_tuff', 'Chiseled Tuff', 'chiseled_tuff', []],
  ['chiseled_tuff_bricks', 'Chiseled Tuff Bricks', 'chiseled_tuff_bricks', []],
  ['smooth_basalt', 'Smooth Basalt', 'smooth_basalt', [], { hardness: 1.25 }],
  ['polished_blackstone', 'Polished Blackstone', 'polished_blackstone', ['stairs', 'slab', 'wall']],
  ['cracked_blackstone_bricks', 'Cracked Blackstone Bricks', 'cracked_blackstone_bricks', []],
  ['chiseled_polished_blackstone', 'Chiseled Polished Blackstone', 'chiseled_polished_blackstone', []],
  ['gilded_blackstone', 'Gilded Blackstone', 'gilded_blackstone', []],
  ['cracked_nether_bricks', 'Cracked Nether Bricks', 'cracked_nether_bricks', [], { hardness: 2 }],
  ['chiseled_nether_bricks', 'Chiseled Nether Bricks', 'chiseled_nether_bricks', [], { hardness: 2 }],
  ['smooth_quartz', 'Smooth Quartz', 'smooth_quartz', ['stairs', 'slab'], { hardness: 2 }],
  ['chiseled_quartz_block', 'Chiseled Quartz Block', 'chiseled_quartz_block', [], { hardness: 0.8 }],
  ['smooth_red_sandstone', 'Smooth Red Sandstone', null, ['stairs', 'slab'], { tex: 'red_sandstone_top' }],
  ['cut_red_sandstone', 'Cut Red Sandstone', 'cut_red_sandstone', ['slab']],
  ['chiseled_red_sandstone', 'Chiseled Red Sandstone', 'chiseled_red_sandstone', []],
  ['purpur_pillar', 'Purpur Pillar', null, [], { tex: { top: 'purpur_pillar_top', bottom: 'purpur_pillar_top', side: 'purpur_pillar' }, axisBlock: true }],
  ['cracked_slate_bricks', 'Cracked Slate Bricks', 'cracked_slate_bricks', [], { hardness: 2.5 }],
  ['cracked_slate_tiles', 'Cracked Slate Tiles', 'cracked_slate_tiles', [], { hardness: 2.5 }],
  ['chiseled_slate', 'Chiseled Slate', 'chiseled_slate', [], { hardness: 2.5 }],
  ['desert_cobble', 'Desert Cobblestone', 'desert_cobble', ['stairs', 'slab', 'wall']],
  ['desert_stone_block', 'Desert Stone Block', 'desert_stone_block', []],
  ['desert_sandstone', 'Desert Sandstone', null, ['stairs', 'slab', 'wall'], { tex: { top: 'desert_sandstone_top', bottom: 'desert_sandstone_top', side: 'desert_sandstone' }, hardness: 0.8 }],
  ['desert_sandstone_bricks', 'Desert Sandstone Brick', 'desert_sandstone_bricks', ['stairs', 'slab', 'wall'], { hardness: 0.8 }],
  ['desert_sandstone_block', 'Desert Sandstone Block', 'desert_sandstone_block', [], { hardness: 0.8 }],
  ['silver_sandstone', 'Silver Sandstone', null, ['stairs', 'slab', 'wall'], { tex: { top: 'silver_sandstone_top', bottom: 'silver_sandstone_top', side: 'silver_sandstone' }, hardness: 0.8 }],
  ['silver_sandstone_bricks', 'Silver Sandstone Brick', 'silver_sandstone_bricks', ['stairs', 'slab', 'wall'], { hardness: 0.8 }],
  ['silver_sandstone_block', 'Silver Sandstone Block', 'silver_sandstone_block', [], { hardness: 0.8 }],
  ['stone_block', 'Stone Block', 'stone_block', []],
  ['obsidian_bricks', 'Obsidian Brick', 'obsidian_bricks', ['stairs', 'slab', 'wall'], { hardness: 25, tier: 4 }],
  ['obsidian_block', 'Obsidian Block', 'obsidian_block', [], { hardness: 25, tier: 4 }],
];
for (const [key, label, tex, fam, props] of STONES2) {
  const P = Object.assign({}, STONE_P, props || {});
  addB(Object.assign({ key, name: label.endsWith('Brick') ? label + 's' : label, tex: tex || key }, P));
  shapeFamily(key, key.replace(/bricks$/, 'brick'), label, fam, P);
}

// --- the nether set (found in the Ember Depths) ---
[
  ['netherrack', 'Netherrack', { tex: 'netherrack', hardness: 0.4, tool: TOOL.PICK, tier: 1 }],
  ['soul_sand', 'Soul Sand', { tex: 'soul_sand', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'sand', slow: 0.45 }],
  ['crimson_nylium', 'Crimson Nylium', { tex: { top: 'crimson_nylium_top', bottom: 'netherrack', side: 'crimson_nylium_side' }, hardness: 0.4, tool: TOOL.PICK, tier: 1, drop: 'netherrack' }],
  ['warped_nylium', 'Warped Nylium', { tex: { top: 'warped_nylium_top', bottom: 'netherrack', side: 'warped_nylium_side' }, hardness: 0.4, tool: TOOL.PICK, tier: 1, drop: 'netherrack' }],
  ['shroomlight', 'Shroomlight', { tex: 'shroomlight', hardness: 1, tool: TOOL.AXE, sound: 'wool', light: 15 }],
  ['nether_gold_ore', 'Nether Gold Ore', { tex: 'nether_gold_ore', hardness: 3, tool: TOOL.PICK, tier: 1, drop: 'gold_nugget', dropCount: [2, 6], xp: 1 }],
  ['ancient_debris', 'Ancient Debris', { tex: { top: 'ancient_debris_top', bottom: 'ancient_debris_top', side: 'ancient_debris_side' }, hardness: 30, tool: TOOL.PICK, tier: 4, sound: 'metal' }],
  ['redstone_ore', 'Redstone Ore', { tex: 'redstone_ore', hardness: 3, tool: TOOL.PICK, tier: 3, drop: 'redstone', dropCount: [4, 5], xp: 3, light: 1 }],
  ['redstone_block', 'Block of Redstone', { tex: 'redstone_block', hardness: 5, tool: TOOL.PICK, tier: 1, sound: 'metal' }],
  ['bone_block', 'Bone Block', { tex: { top: 'bone_block_top', bottom: 'bone_block_top', side: 'bone_block_side' }, axisBlock: true, hardness: 2, tool: TOOL.PICK, tier: 1 }],
  // --- sticky, bouncy and sweet ---
  ['slime_block', 'Slime Block', { tex: 'slime_block', render: RENDER.CUTOUT, translucent: true, opaque: false, hardness: 0, sound: 'slime', bouncy: true, selfCull: true }],
  ['honey_block', 'Honey Block', { tex: { top: 'honey_block_top', bottom: 'honey_block_top', side: 'honey_block_side' }, render: RENDER.CUTOUT, translucent: true, opaque: false, hardness: 0, sound: 'slime', slow: 0.4, sticky: true, selfCull: true }],
  ['honeycomb_block', 'Honeycomb Block', { tex: 'honeycomb_block', hardness: 0.6, sound: 'wool' }],
  ['bee_nest', 'Bee Nest', { tex: { top: 'bee_nest_top', bottom: 'bee_nest_bottom', side: 'bee_nest_side', front: 'bee_nest_front' }, hardness: 0.3, tool: TOOL.AXE, sound: 'wood', hive: true, fuel: 1.5 }],
  ['beehive', 'Beehive', { tex: { top: 'beehive_top', bottom: 'beehive_top', side: 'beehive_side', front: 'beehive_front' }, hardness: 0.6, tool: TOOL.AXE, sound: 'wood', hive: true, fuel: 1.5 }],
  // --- ground covers of the other games ---
  ['dry_dirt', 'Dry Dirt', { tex: 'dry_dirt', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'gravel' }],
  ['dirt_with_dry_grass', 'Dry Grass Block', { tex: { top: 'dry_grass_top', bottom: 'dirt', side: 'dry_grass_side' }, hardness: 0.6, tool: TOOL.SHOVEL, sound: 'grass', drop: 'dirt' }],
  ['dry_dirt_with_dry_grass', 'Dry Grass on Dry Dirt', { tex: { top: 'dry_grass_top', bottom: 'dry_dirt', side: 'dry_dirt_grass_side' }, hardness: 0.6, tool: TOOL.SHOVEL, sound: 'grass', drop: 'dry_dirt' }],
  ['dirt_with_coniferous_litter', 'Coniferous Litter', { tex: { top: 'coniferous_litter', bottom: 'dirt', side: 'coniferous_litter_side' }, hardness: 0.6, tool: TOOL.SHOVEL, sound: 'grass', drop: 'dirt' }],
  ['dirt_with_rainforest_litter', 'Rainforest Litter', { tex: { top: 'rainforest_litter', bottom: 'dirt', side: 'rainforest_litter_side' }, hardness: 0.6, tool: TOOL.SHOVEL, sound: 'grass', drop: 'dirt' }],
  ['desert_sand', 'Desert Sand', { tex: 'desert_sand', hardness: 0.5, tool: TOOL.SHOVEL, sound: 'sand', falls: true }],
  ['peat', 'Peat', { tex: 'peat', hardness: 0.6, tool: TOOL.SHOVEL, sound: 'gravel', fuel: 6 }],
  ['budding_amethyst', 'Budding Amethyst', { tex: 'budding_amethyst', hardness: 1.5, tool: TOOL.PICK, sound: 'glass', drop: null }],
  ['copper_grate', 'Copper Grate', { tex: 'copper_grate', render: RENDER.CUTOUT, opaque: false, hardness: 3, tool: TOOL.PICK, tier: 2, sound: 'metal' }],
  ['chiseled_copper', 'Chiseled Copper', { tex: 'chiseled_copper', hardness: 3, tool: TOOL.PICK, tier: 2, sound: 'metal' }],
  ['ochre_froglight', 'Ochre Froglight', { tex: { top: 'ochre_froglight_top', bottom: 'ochre_froglight_top', side: 'ochre_froglight_side' }, axisBlock: true, hardness: 0.3, light: 15, sound: 'wool' }],
  ['verdant_froglight', 'Verdant Froglight', { tex: { top: 'verdant_froglight_top', bottom: 'verdant_froglight_top', side: 'verdant_froglight_side' }, axisBlock: true, hardness: 0.3, light: 15, sound: 'wool' }],
  ['pearlescent_froglight', 'Pearlescent Froglight', { tex: { top: 'pearlescent_froglight_top', bottom: 'pearlescent_froglight_top', side: 'pearlescent_froglight_side' }, axisBlock: true, hardness: 0.3, light: 15, sound: 'wool' }],
  // --- work stations ---
  ['jukebox', 'Jukebox', { tex: { top: 'jukebox_top', bottom: 'jukebox_side', side: 'jukebox_side' }, hardness: 2, tool: TOOL.AXE, sound: 'wood', jukebox: true, fuel: 1.5 }],
  ['ender_chest', 'Ender Chest', { tex: { top: 'ender_chest_top', bottom: 'ender_chest_top', side: 'ender_chest_side', front: 'ender_chest_front' }, hardness: 22.5, tool: TOOL.PICK, tier: 1, light: 7, enderChest: true }],
  // (0.9.0.34) every party chest in a world opens onto the same 27 slots, for everyone playing in it (game/together.js)
  ['party_chest', 'Party Chest', { tex: { top: 'party_chest_top', bottom: 'party_chest_top', side: 'party_chest_side', front: 'party_chest_front' }, hardness: 2.5, tool: TOOL.AXE, sound: 'wood', partyChest: true, fuel: 1.5 }],
  ['smithing_table', 'Smithing Table', { tex: { top: 'smithing_table_top', bottom: 'smithing_table_bottom', side: 'smithing_table_side', front: 'smithing_table_front' }, hardness: 2.5, tool: TOOL.AXE, sound: 'wood', station: 'smithing', fuel: 1.5 }],
  ['loom', 'Loom', { tex: { top: 'loom_top', bottom: 'loom_bottom', side: 'loom_side', front: 'loom_front' }, hardness: 2.5, tool: TOOL.AXE, sound: 'wood', station: 'loom', fuel: 1.5 }],
  ['cartography_table', 'Cartography Table', { tex: { top: 'cartography_table_top', bottom: 'planks', side: 'cartography_table_side', front: 'cartography_table_front' }, hardness: 2.5, tool: TOOL.AXE, sound: 'wood', station: 'cartography', fuel: 1.5 }],
  ['fletching_table', 'Fletching Table', { tex: { top: 'fletching_table_top', bottom: 'planks', side: 'fletching_table_side', front: 'fletching_table_front' }, hardness: 2.5, tool: TOOL.AXE, sound: 'wood', station: 'fletching', fuel: 1.5 }],
].forEach(([key, name, props]) => addB(Object.assign({ key, name }, props)));
addB({ key: 'dirt_path', name: 'Dirt Path', tex: { top: 'dirt_path_top', bottom: 'dirt', side: 'dirt_path_side' }, render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PATH, solid: true, opaque: false, hardness: 0.65, tool: TOOL.SHOVEL, sound: 'gravel', drop: 'dirt' });
// small models and shaped things
addB({ key: 'composter', name: 'Composter', tex: { side: 'composter_side', top: 'composter_top', bottom: 'composter_bottom' }, render: RENDER.SHAPE, shapeKind: SHAPE_KIND.COMPOSTER, solid: true, opaque: false, hardness: 0.6, tool: TOOL.AXE, sound: 'wood', composter: true, fuel: 1 });
addB({ key: 'lectern', name: 'Lectern', tex: 'lectern_side', render: RENDER.MODEL, shape: 'lectern', facingModel: true, solid: true, opaque: false, hardness: 2.5, tool: TOOL.AXE, sound: 'wood', lectern: true, fuel: 1.5 });
for (const [k, n] of [['anvil', 'Anvil'], ['chipped_anvil', 'Chipped Anvil'], ['damaged_anvil', 'Damaged Anvil']])
  addB({ key: k, name: n, tex: k + '_top', render: RENDER.MODEL, shape: k, facingModel: true, solid: true, opaque: false, hardness: 5, tool: TOOL.PICK, tier: 1, sound: 'metal', station: 'anvil' });
addB({ key: 'grindstone', name: 'Grindstone', tex: 'grindstone_side', render: RENDER.MODEL, shape: 'grindstone', facingModel: true, solid: true, opaque: false, hardness: 2, tool: TOOL.PICK, sound: 'stone', station: 'grindstone' });
addB({ key: 'decorated_pot', name: 'Decorated Pot', tex: 'decorated_pot_side', render: RENDER.MODEL, shape: 'decorated_pot', solid: true, opaque: false, hardness: 0, sound: 'stone', wlog: true, sink: true });
addB({ key: 'end_rod', name: 'End Rod', tex: 'end_rod', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.ROD, solid: true, opaque: false, hardness: 0, light: 14, sound: 'wood', rod: true });
addB({ key: 'lightning_rod', name: 'Lightning Rod', tex: 'lightning_rod', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.ROD, solid: true, opaque: false, hardness: 3, tool: TOOL.PICK, sound: 'metal', wlog: true, rod: true });
addB({ key: 'item_frame', name: 'Item Frame', tex: 'item_frame', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.FRAME, solid: false, opaque: false, hardness: 0.3, sound: 'wood', frame: 1, itemIcon: 'item_frame_item', fuel: 0.5 });
addB({ key: 'glow_item_frame', name: 'Glow Item Frame', tex: 'glow_item_frame', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.FRAME, solid: false, opaque: false, hardness: 0.3, sound: 'wood', frame: 2, itemIcon: 'glow_item_frame_item' });
addB({ key: 'cake', name: 'Cake', tex: { top: 'cake_top', bottom: 'cake_bottom', side: 'cake_side' }, render: RENDER.SHAPE, shapeKind: SHAPE_KIND.CAKE, solid: true, opaque: false, hardness: 0.5, sound: 'wool', cake: true, drop: null, itemIcon: 'cake_item', sink: true });
// candles: meta bits 0-1 = how many (1-4), bit 2 = lit
addB({ key: 'candle', name: 'Candle', tex: 'candle', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.CANDLE, solid: true, opaque: false, hardness: 0.1, sound: 'wool', wlog: true, candle: true, lightMeta: 'candle', itemIcon: 'candle_item', sink: true });
for (const [c, L] of COLORS) addB({ key: c + '_candle', name: L + ' Candle', tex: c + '_candle', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.CANDLE, solid: true, opaque: false, hardness: 0.1, sound: 'wool', wlog: true, candle: true, lightMeta: 'candle', itemIcon: c + '_candle_item', color: c, sink: true });
addB({ key: 'sea_pickle', name: 'Sea Pickle', tex: 'sea_pickle', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.CANDLE, solid: true, opaque: false, hardness: 0, sound: 'slime', wlog: true, pickle: true, lightMeta: 'pickle', needsSupport: true, itemIcon: 'sea_pickle_item' });
addB({ key: 'cocoa', name: 'Cocoa', tex: 'cocoa_stage2', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.COCOA, solid: true, opaque: false, hardness: 0.2, tool: TOOL.AXE, sound: 'wood', crop: { stages: 3, drop: 'cocoa_beans' }, cocoa: true, drop: null });
addB({ key: 'pink_petals', name: 'Pink Petals', tex: 'pink_petals', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PETALS, solid: false, opaque: false, replaceable: true, hardness: 0, sound: 'grass', needsSupport: true, flower: true });
addB({ key: 'loose_stones', name: 'Loose Stones', tex: 'cobblestone', render: RENDER.MODEL, shape: 'loose_stones', solid: false, opaque: false, hardness: 0, sound: 'stone', needsSupport: true, sink: true, replaceable: false });
addB({ key: 'glow_lichen', name: 'Glow Lichen', tex: 'glow_lichen', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.LADDER, solid: false, opaque: false, replaceable: true, hardness: 0.2, sound: 'grass', light: 7, wlog: true, drop: null, onWall: true });
// plants: crossed sprites
const PLANTS2 = [
  ['crimson_roots', 'Crimson Roots', { replaceable: true }], ['warped_roots', 'Warped Roots', { replaceable: true }], ['nether_sprouts', 'Nether Sprouts', { replaceable: true, drop: null }],
  ['weeping_vines', 'Weeping Vines', { hangs: true, stackPlant: true, climb: true }], ['twisting_vines', 'Twisting Vines', { stackPlant: true, climb: true }],
  ['hanging_roots', 'Hanging Roots', { hangs: true, replaceable: true, wlog: true }], ['spore_blossom', 'Spore Blossom', { hangs: true, flower: true }],
  ['cave_vines', 'Cave Vines', { hangs: true, stackPlant: true, climb: true, drop: null }], ['cave_vines_lit', 'Cave Vines with Glow Berries', { hangs: true, stackPlant: true, climb: true, light: 14, drop: 'glow_berries' }],
  ['torchflower', 'Torchflower', { flower: true }], ['dry_grass', 'Dry Grass', { replaceable: true, drop: null }], ['marram_grass', 'Marram Grass', { replaceable: true, drop: null }],
  ['jungle_grass', 'Jungle Grass', { replaceable: true, drop: null, tint: 'grass' }], ['azalea', 'Azalea', { tree: 'azalea' }], ['flowering_azalea', 'Flowering Azalea', { tree: 'azalea' }],
  ['small_amethyst_bud', 'Small Amethyst Bud', { light: 1, tool: TOOL.PICK, hardness: 1.5, sound: 'glass', drop: null }], ['medium_amethyst_bud', 'Medium Amethyst Bud', { light: 2, tool: TOOL.PICK, hardness: 1.5, sound: 'glass', drop: null }],
  ['large_amethyst_bud', 'Large Amethyst Bud', { light: 4, tool: TOOL.PICK, hardness: 1.5, sound: 'glass', drop: null }],
  ['pointed_dripstone', 'Pointed Dripstone', { tool: TOOL.PICK, hardness: 1.5, sound: 'stone', texUpper: 'pointed_dripstone_down', altTile: true, sharp: true }],
];
for (const [k, n, p] of PLANTS2) addB(Object.assign({ key: k, name: n, tex: k, render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', needsSupport: true }, p));
for (const [c, L] of CORALS) addB({ key: c + '_coral_fan', name: L + ' Coral Fan', tex: c + '_coral_fan', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', wlog: true, needsSupport: true, alwaysWet: true });
addB({ key: 'azalea_leaves', name: 'Azalea Leaves', tex: 'azalea_leaves', render: RENDER.CUTOUT, opaque: false, hardness: 0.2, sound: 'grass', isLeaves: true, lightAtt: 1, sapling: 'azalea' });
addB({ key: 'flowering_azalea_leaves', name: 'Flowering Azalea Leaves', tex: 'flowering_azalea_leaves', render: RENDER.CUTOUT, opaque: false, hardness: 0.2, sound: 'grass', isLeaves: true, lightAtt: 1, sapling: 'flowering_azalea' });
addB({ key: 'cattail', name: 'Cattail', tex: 'cattail_lower', texUpper: 'cattail_upper', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', needsSupport: true, double: true, wlog: true });
addB({ key: 'pitcher_plant', name: 'Pitcher Plant', tex: 'pitcher_plant_lower', texUpper: 'pitcher_plant_upper', render: RENDER.CROSS, solid: false, opaque: false, hardness: 0, sound: 'grass', needsSupport: true, double: true, flower: true });
// crops: nether wart on soul sand, stems that set pumpkins and melons beside them
addB({ key: 'nether_wart', name: 'Nether Wart', tex: 'nether_wart_stage0', render: RENDER.CROSS, hash: true, solid: false, opaque: false, hardness: 0, sound: 'grass', crop: { stages: 4, drop: 'nether_wart_item' }, needsSupport: true, drop: null, soil: 'soul_sand' });
addB({ key: 'pumpkin_stem', name: 'Pumpkin Stem', tex: 'pumpkin_stem_stage0', render: RENDER.CROSS, hash: true, solid: false, opaque: false, hardness: 0, sound: 'grass', crop: { stages: 8, drop: 'pumpkin_seeds', fruit: 'pumpkin' }, needsSupport: true, drop: null });
addB({ key: 'melon_stem', name: 'Melon Stem', tex: 'melon_stem_stage0', render: RENDER.CROSS, hash: true, solid: false, opaque: false, hardness: 0, sound: 'grass', crop: { stages: 8, drop: 'melon_seeds', fruit: 'melon' }, needsSupport: true, drop: null });

// ===== 0.6: redstone, pistons, hoppers and rails =====
// `rs` names the part a block plays in a circuit (see game/redstone.js).
const RS_P = { hardness: 0, sound: 'stone', solid: false, opaque: false };
addB(Object.assign({ key: 'redstone_wire', name: 'Redstone Dust', tex: 'redstone_dust_line', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.WIRE, needsSupport: true, drop: 'redstone', rs: 'wire', sink: true }, RS_P));
addB({ key: 'redstone_torch', name: 'Redstone Torch', tex: 'redstone_torch', render: RENDER.TORCH, solid: false, opaque: false, light: 7, hardness: 0, sound: 'wood', needsSupport: true, sink: true, rs: 'torch', torchLike: true });
addB({ key: 'redstone_torch_off', name: 'Redstone Torch', tex: 'redstone_torch_off', render: RENDER.TORCH, solid: false, opaque: false, hardness: 0, sound: 'wood', needsSupport: true, sink: true, rs: 'torch_off', torchLike: true, drop: 'redstone_torch' });
addB(Object.assign({ key: 'lever', name: 'Lever', tex: 'cobblestone', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.LEVER, rs: 'lever', itemIcon: 'lever', attached: true }, RS_P, { hardness: 0.5, sound: 'wood' }));
addB(Object.assign({ key: 'stone_button', name: 'Stone Button', base: 'stone', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.BUTTON, rs: 'button', attached: true }, RS_P, { hardness: 0.5 }));
addB(Object.assign({ key: 'polished_blackstone_button', name: 'Polished Blackstone Button', base: 'polished_blackstone', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.BUTTON, rs: 'button', attached: true }, RS_P, { hardness: 0.5 }));
addB(Object.assign({ key: 'stone_pressure_plate', name: 'Stone Pressure Plate', base: 'stone', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PLATE, rs: 'plate', plate: 'mobs', needsSupport: true, sink: true }, RS_P, { hardness: 0.5 }));
addB(Object.assign({ key: 'polished_blackstone_pressure_plate', name: 'Polished Blackstone Pressure Plate', base: 'polished_blackstone', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PLATE, rs: 'plate', plate: 'mobs', needsSupport: true, sink: true }, RS_P, { hardness: 0.5 }));
addB(Object.assign({ key: 'light_weighted_pressure_plate', name: 'Light Weighted Pressure Plate', base: 'gold_block', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PLATE, rs: 'plate', plate: 'light', needsSupport: true, sink: true }, RS_P, { hardness: 0.5, sound: 'metal' }));
addB(Object.assign({ key: 'heavy_weighted_pressure_plate', name: 'Heavy Weighted Pressure Plate', base: 'iron_block', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PLATE, rs: 'plate', plate: 'heavy', needsSupport: true, sink: true }, RS_P, { hardness: 0.5, sound: 'metal' }));
for (const [w, L, , plK] of WOODS) {
  addB(Object.assign({ key: w + '_button', name: L + ' Button', base: plK, render: RENDER.SHAPE, shapeKind: SHAPE_KIND.BUTTON, rs: 'button', wooden: true, attached: true }, RS_P, { hardness: 0.5, sound: 'wood' }));
  addB(Object.assign({ key: w + '_pressure_plate', name: L + ' Pressure Plate', base: plK, render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PLATE, rs: 'plate', plate: 'all', needsSupport: true, sink: true }, RS_P, { hardness: 0.5, sound: 'wood' }));
}
addB(Object.assign({ key: 'bamboo_button', name: 'Bamboo Button', base: 'bamboo_planks', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.BUTTON, rs: 'button', wooden: true, attached: true }, RS_P, { hardness: 0.5, sound: 'wood' }));
addB(Object.assign({ key: 'bamboo_pressure_plate', name: 'Bamboo Pressure Plate', base: 'bamboo_planks', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PLATE, rs: 'plate', plate: 'all', needsSupport: true, sink: true }, RS_P, { hardness: 0.5, sound: 'wood' }));
addB({ key: 'redstone_lamp', name: 'Redstone Lamp', tex: 'redstone_lamp', hardness: 0.3, sound: 'glass', rs: 'lamp' });
addB({ key: 'redstone_lamp_on', name: 'Redstone Lamp', tex: 'redstone_lamp_on', hardness: 0.3, sound: 'glass', light: 15, drop: 'redstone_lamp', rs: 'lamp' });
addB({ key: 'repeater', name: 'Redstone Repeater', tex: 'smooth_stone', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.REPEATER, solid: true, opaque: false, hardness: 0, sound: 'stone', rs: 'repeater', itemIcon: 'repeater_item', needsSupport: true, sink: true });
addB({ key: 'comparator', name: 'Redstone Comparator', tex: 'smooth_stone', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.COMPARATOR, solid: true, opaque: false, hardness: 0, sound: 'stone', rs: 'comparator', itemIcon: 'comparator_item', needsSupport: true, sink: true });
addB({ key: 'observer', name: 'Observer', tex: { front: 'observer_front', back: 'observer_back', backOn: 'observer_back_on', side: 'observer_side', top: 'observer_top' }, facing6: true, hardness: 3, tool: TOOL.PICK, rs: 'observer' });
addB({ key: 'piston', name: 'Piston', tex: { front: 'piston_top', back: 'piston_bottom', side: 'piston_side' }, facing6: true, sideAll: true, hardness: 1.5, tool: TOOL.PICK, rs: 'piston' });
addB({ key: 'sticky_piston', name: 'Sticky Piston', tex: { front: 'piston_top_sticky', back: 'piston_bottom', side: 'piston_side' }, facing6: true, sideAll: true, hardness: 1.5, tool: TOOL.PICK, rs: 'piston', sticky: true });
addB({ key: 'piston_extended', name: 'Piston', tex: 'piston_side_base', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PISTON_BASE, solid: true, opaque: false, hardness: 1.5, tool: TOOL.PICK, rs: 'piston', drop: 'piston', extended: true });
addB({ key: 'sticky_piston_extended', name: 'Sticky Piston', tex: 'piston_side_base', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PISTON_BASE, solid: true, opaque: false, hardness: 1.5, tool: TOOL.PICK, rs: 'piston', drop: 'sticky_piston', extended: true, sticky: true });
addB({ key: 'piston_head', name: 'Piston Head', tex: 'piston_top', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.PISTON_HEAD, solid: true, opaque: false, hardness: 1.5, tool: TOOL.PICK, drop: null, pistonHead: true });
addB({ key: 'moving_block', name: 'Moving Block', render: RENDER.NONE, solid: true, opaque: false, hardness: -1, drop: null, movingBlock: true });
addB({ key: 'dispenser', name: 'Dispenser', tex: { front: 'dispenser_front', frontV: 'dispenser_front_vertical', side: 'furnace_side', top: 'furnace_top' }, facing6: true, hardness: 3.5, tool: TOOL.PICK, container: 9, rs: 'dispenser' });
addB({ key: 'dropper', name: 'Dropper', tex: { front: 'dropper_front', frontV: 'dropper_front_vertical', side: 'furnace_side', top: 'furnace_top' }, facing6: true, hardness: 3.5, tool: TOOL.PICK, container: 9, rs: 'dropper' });
addB({ key: 'hopper', name: 'Hopper', tex: 'hopper_outside', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.HOPPER, solid: true, opaque: false, hardness: 3, tool: TOOL.PICK, sound: 'metal', container: 5, rs: 'hopper', itemIcon: 'hopper_item' });
addB({ key: 'daylight_detector', name: 'Daylight Detector', tex: { top: 'daylight_detector_top', bottom: 'daylight_detector_side', side: 'daylight_detector_side' }, render: RENDER.SHAPE, shapeKind: SHAPE_KIND.DAYLIGHT, solid: true, opaque: false, hardness: 0.2, tool: TOOL.AXE, sound: 'wood', rs: 'daylight', fuel: 1 });
addB({ key: 'target', name: 'Target', tex: { top: 'target_top', bottom: 'target_top', side: 'target_side' }, hardness: 0.5, tool: TOOL.NONE, sound: 'grass', rs: 'target' });
addB({ key: 'copper_bulb', name: 'Copper Bulb', tex: 'copper_bulb', hardness: 3, tool: TOOL.PICK, sound: 'metal', rs: 'bulb' });
addB({ key: 'copper_bulb_lit', name: 'Copper Bulb', tex: 'copper_bulb_lit', hardness: 3, tool: TOOL.PICK, sound: 'metal', light: 15, rs: 'bulb', drop: 'copper_bulb' });
addB({ key: 'redstone_ore_lit', name: 'Redstone Ore', tex: 'redstone_ore_lit', hardness: 3, tool: TOOL.PICK, tier: 3, drop: 'redstone', dropCount: [4, 5], xp: 3, light: 9 });
addB(Object.assign({ key: 'tripwire_hook', name: 'Tripwire Hook', tex: 'planks', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.HOOK, rs: 'hook', itemIcon: 'tripwire_hook_item', attached: true }, RS_P, { hardness: 0, sound: 'wood' }));
addB(Object.assign({ key: 'tripwire', name: 'Tripwire', tex: 'tripwire', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.TRIPWIRE, drop: 'string', tripwire: true }, RS_P, { sound: 'wool' }));
// rails: meta 0-9 shape (straight, sloped, curved); powered / detector / activator rails 0-5, bit 3 = powered
const RAIL_P = { render: RENDER.SHAPE, shapeKind: SHAPE_KIND.RAIL, solid: false, opaque: false, hardness: 0.7, tool: TOOL.PICK, sound: 'metal', needsSupport: true, sink: true };
addB(Object.assign({ key: 'rail', name: 'Rail', tex: 'rail', rail: 'normal', itemIcon: 'rail' }, RAIL_P));
addB(Object.assign({ key: 'powered_rail', name: 'Powered Rail', tex: 'powered_rail', rail: 'powered', rs: 'prail', itemIcon: 'powered_rail' }, RAIL_P));
addB(Object.assign({ key: 'detector_rail', name: 'Detector Rail', tex: 'detector_rail', rail: 'detector', rs: 'drail', itemIcon: 'detector_rail' }, RAIL_P));
addB(Object.assign({ key: 'activator_rail', name: 'Activator Rail', tex: 'activator_rail', rail: 'activator', rs: 'prail', itemIcon: 'activator_rail' }, RAIL_P));

// ===== 0.7 =====
addB({ key: 'grave', name: 'Grave', tex: 'grave_stone', render: RENDER.MODEL, shape: 'grave', solid: true, opaque: false, hardness: 2.5, tool: TOOL.PICK, sound: 'stone', drop: null, facingModel: true, grave: true });

// ===== 0.8.4: furniture (shapes, sitting and shelves in game/furniture.js) =====
// Added at the end so every older block keeps its number in saved worlds.
const FURNITURE = [
  ['chair', 'Chair', { seat: 8 }], ['stool', 'Stool', { seat: 10 }], ['bench', 'Bench', { seat: 7 }], ['table', 'Table', {}],
  ['shelf', 'Wall Shelf', { shelf: 3 }], ['standing_shelf', 'Standing Shelf', { shelf: 6 }], ['bookcase', 'Bookcase', { bookcase: 6 }], ['cabinet', 'Cabinet', { container: 9 }],
];
for (const [w, L, , plK] of WOODS) for (const [k, n, extra] of FURNITURE) {
  const pt = plK === 'planks' ? 'planks' : w + '_planks';
  addB(Object.assign({ key: w + '_' + k, name: L + ' ' + n, tex: pt, render: RENDER.MODEL, shape: w + '_' + k, facingModel: true, solid: true, opaque: false,
    hardness: 2, tool: TOOL.AXE, sound: 'wood', fuel: STEMS.has(w) ? 0 : 1.5, furniture: k, wood: w, itemIcon: 'furn_' + k + '_' + w }, extra));
}

// 0.9: new ores and metals (game/metals.js), appended so every older block keeps its number
for (const [k, n, o] of [
  ['silver_ore', 'Silver Ore', { hardness: 3, tier: 3, xp: 2 }], ['mithril_ore', 'Mithril Ore', { hardness: 4, tier: 4, xp: 4 }], ['adamantite_ore', 'Adamantite Ore', { hardness: 5, tier: 5, xp: 6 }],
  ['ruby_ore', 'Ruby Ore', { hardness: 3, tier: 3, drop: 'ruby', xp: 5 }], ['sapphire_ore', 'Sapphire Ore', { hardness: 3, tier: 3, drop: 'sapphire', xp: 5 }],
  ['silver_block', 'Block of Silver', { hardness: 5, tier: 3, sound: 'metal' }], ['steel_block', 'Block of Steel', { hardness: 6, tier: 3, sound: 'metal' }],
  ['mithril_block', 'Block of Mithril', { hardness: 6, tier: 4, sound: 'metal' }], ['adamantite_block', 'Block of Adamantite', { hardness: 7, tier: 5, sound: 'metal' }],
  ['ruby_block', 'Block of Ruby', { hardness: 5, tier: 3, sound: 'glass' }], ['sapphire_block', 'Block of Sapphire', { hardness: 5, tier: 3, sound: 'glass' }],
]) addB(Object.assign({ key: k, name: n, tex: k, tool: TOOL.PICK }, o));
// 0.9: villages (game/villages.js)
addB({ key: 'monster_spawner', name: 'Monster Cage', tex: 'monster_spawner', render: RENDER.CUTOUT, solid: true, opaque: false, hardness: 5, tool: TOOL.PICK, tier: 1, sound: 'metal', light: 4, drop: 'none', xp: 25 });
// 0.9: his realm (game/riftarc.js)
addB({ key: 'rift_wall', name: 'Rift Stone', tex: 'rift_wall', hardness: 8, tool: TOOL.PICK, tier: 3, light: 4, sound: 'stone' });
addB({ key: 'rift_glass', name: 'Rift Glass', tex: 'rift_glass', render: RENDER.CUTOUT, translucent: true, opaque: false, selfCull: true, hardness: 1, sound: 'glass', light: 7 });
addB({ key: 'rift_crystal', name: 'Rift Crystal', tex: 'rift_crystal', hardness: 3, tool: TOOL.PICK, tier: 2, light: 13, sound: 'glass' });
addB({ key: 'ember_crust', name: 'Ember Crust', tex: 'ember_crust', hardness: 40, tool: TOOL.PICK, tier: 5, light: 5, sound: 'stone', drop: 'none' });
// 0.9: dragon eggs (game/dragons.js)
for (const t of ['verdant', 'sand', 'frost', 'bog', 'ember', 'storm', 'tide', 'ender']) addB({ key: 'dragon_egg_' + t, name: t[0].toUpperCase() + t.slice(1) + ' Dragon Egg', tex: 'dragon_egg_' + t, render: RENDER.MODEL, shape: 'dragon_egg_' + t, solid: true, opaque: false, hardness: 3, sound: 'stone', light: 3, dragonEgg: t, needsSupport: true });
addB({ key: 'quest_board', name: 'Quest Board', tex: { top: 'planks', bottom: 'planks', side: 'quest_board_side', front: 'quest_board_front' }, hardness: 2.5, tool: TOOL.AXE, sound: 'wood', questBoard: true, fuel: 1.5 });
// 0.9.0.17: The End (game/theend.js)
addB({ key: 'void_crust', name: 'Void Crust', tex: 'void_crust', hardness: 50, tool: TOOL.PICK, tier: 5, light: 3, sound: 'stone', drop: 'none' });
addB({ key: 'end_portal_frame', name: 'End Portal Frame', tex: { top: 'end_portal_frame_top', bottom: 'end_stone', side: 'end_portal_frame_side' }, render: RENDER.MODEL, shape: 'end_portal_frame', solid: true, opaque: false, light: 1, hardness: -1, sound: 'stone', drop: null });
addB({ key: 'end_portal_frame_eye', name: 'End Portal Frame', tex: { top: 'end_portal_frame_top', bottom: 'end_stone', side: 'end_portal_frame_side' }, render: RENDER.MODEL, shape: 'end_portal_frame_eye', solid: true, opaque: false, light: 4, hardness: -1, sound: 'stone', drop: null });
addB({ key: 'end_portal', name: 'End Portal', tex: 'end_portal', render: RENDER.MODEL, shape: 'end_portal', solid: false, opaque: false, light: 15, hardness: -1, drop: null, replaceable: false });
addB({ key: 'end_gateway', name: 'End Gateway', tex: 'end_portal', render: RENDER.MODEL, shape: 'end_gateway', solid: false, opaque: false, light: 15, hardness: -1, drop: null });
addB({ key: 'chorus_plant', name: 'Chorus Plant', tex: 'chorus_plant', render: RENDER.SHAPE, shapeKind: SHAPE_KIND.CHORUS, solid: true, opaque: false, hardness: 0.4, tool: TOOL.AXE, sound: 'wood', drop: 'chorus_fruit', chorus: true });
addB({ key: 'chorus_flower', name: 'Chorus Flower', tex: { side: 'chorus_flower', top: 'chorus_flower', bottom: 'chorus_flower' }, render: RENDER.SHAPE, shapeKind: SHAPE_KIND.CHORUS, solid: true, opaque: false, hardness: 0.4, tool: TOOL.AXE, sound: 'wood', light: 2, chorus: true });
// 0.9.0.20: the Deep Dark (game/deepdark.js)
addB({ key: 'sculk', name: 'Sculk', tex: 'sculk', hardness: 0.2, sound: 'wool', light: 1 });
addB({ key: 'sculk_vein', name: 'Sculk Vein', tex: 'sculk_vein', render: RENDER.MODEL, shape: 'sculk_vein', solid: false, opaque: false, replaceable: true, hardness: 0.2, sound: 'wool', itemIcon: 'sculk_vein' });
addB({ key: 'sculk_sensor', name: 'Sculk Sensor', tex: { top: 'sculk_sensor_top', bottom: 'sculk_sensor_bottom', side: 'sculk_sensor_side' }, render: RENDER.MODEL, shape: 'sculk_sensor', solid: true, opaque: false, hardness: 1.5, sound: 'wool', light: 1 });
addB({ key: 'sculk_shrieker', name: 'Sculk Shrieker', tex: { top: 'sculk_shrieker_top', bottom: 'sculk_shrieker_bottom', side: 'sculk_shrieker_side' }, render: RENDER.MODEL, shape: 'sculk_shrieker', solid: true, opaque: false, hardness: 3, sound: 'wool' });
addB({ key: 'sculk_catalyst', name: 'Sculk Catalyst', tex: { top: 'sculk_catalyst_top', bottom: 'sculk_catalyst_bottom', side: 'sculk_catalyst_side' }, hardness: 3, sound: 'wool', light: 6 });
addB({ key: 'reinforced_deepslate', name: 'Reinforced Deepslate', tex: { top: 'reinforced_deepslate_top', bottom: 'reinforced_deepslate_bottom', side: 'reinforced_deepslate_side' }, hardness: -1, sound: 'stone', drop: null });
// 0.9.0.10: enchanting and brewing (game/enchanting.js, game/brewing.js)
addB({ key: 'enchanting_table', name: 'Enchanting Table', tex: { side: 'ench_side', top: 'ench_top', bottom: 'ench_bottom' }, render: RENDER.MODEL, shape: 'enchanting_table', solid: true, opaque: false, hardness: 5, tool: TOOL.PICK, sound: 'stone', station: 'enchant', light: 7 });
// 0.9.0.11: travel and camping (game/camping.js)
addB({ key: 'rope', name: 'Rope', tex: 'rope', render: RENDER.MODEL, shape: 'rope', solid: false, opaque: false, climb: true, hardness: 0.3, sound: 'wool', itemIcon: 'rope_item' });
addB({ key: 'grapple_anchor', name: 'Grappling Hook', tex: 'hook_metal', render: RENDER.MODEL, shape: 'grapple_anchor', facingModel: true, solid: false, opaque: false, climb: true, hardness: 0.3, sound: 'metal', drop: null });
addB({ key: 'sleeping_bag', name: 'Sleeping Bag', tex: 'bag_side', render: RENDER.MODEL, shape: 'sleeping_bag', facingModel: true, solid: true, opaque: false, hardness: 0.2, sound: 'wool', bed: true, bag: true, itemIcon: 'sleeping_bag' });
addB({ key: 'brewing_stand', name: 'Brewing Stand', tex: 'brew_base', render: RENDER.MODEL, shape: 'brewing_stand', solid: true, opaque: false, hardness: 0.5, tool: TOOL.PICK, sound: 'metal', station: 'brew', light: 1, itemIcon: 'brewing_stand_item' });
// (0.9.0.50) what lightning leaves of a tree it strikes
addB({ key: 'charred_log', name: 'Charred Log', tex: { top: 'charred_log_top', bottom: 'charred_log_top', side: 'charred_log_side' }, hardness: 1.5, tool: TOOL.AXE, sound: 'wood', isLog: true, axisBlock: true, fuel: 2, drop: 'charcoal' });

BLOCK_DEFS.push(...BLOCK_EXTRA);

// Old key -> new key, applied when loading saves. Add entries when renaming.
const BLOCK_ALIASES = {};

const BLOCKS = [];          // numeric id -> def
const BLOCK_ID = {};        // key -> numeric id
BLOCK_DEFS.forEach((d, i) => {
  const def = Object.assign({
    id: i, render: RENDER.CUBE, solid: true, opaque: true, replaceable: false,
    hardness: 1, tool: null, tier: 0, drop: undefined, light: 0, lightAtt: 0, sound: 'stone',
  }, d);
  if (def.render !== RENDER.CUBE) def.opaque = d.opaque !== undefined ? d.opaque : false;
  if (def.drop === undefined) def.drop = def.key; // drops itself by default
  BLOCKS.push(def);
  BLOCK_ID[def.key] = i;
});
const B = BLOCK_ID; // shorthand: B.stone
// shaped blocks inherit hardness, tool and textures from what they are made of
for (const b of BLOCKS) if (b.base) { const p = BLOCKS[B[b.base]]; if (p) { if (!b.tex) b.tex = p.tex; } }

// Fast lookup tables used in hot loops (meshing, physics, lighting).
// Block ids are 16-bit (up to 4096 kinds of block).
const MAX_BLOCKS = 4096;
const NB = BLOCKS.length;
const T_OPAQUE = new Uint8Array(MAX_BLOCKS);   // fully blocks light & hides neighbor faces
const T_SOLID = new Uint8Array(MAX_BLOCKS);    // collides
const T_RENDER = new Uint8Array(MAX_BLOCKS);
const T_LIGHT = new Uint8Array(MAX_BLOCKS);    // emission
const T_ATT = new Uint8Array(MAX_BLOCKS);      // extra light attenuation for transparent blocks
const T_REPLACEABLE = new Uint8Array(MAX_BLOCKS);
const T_LIQUID = new Uint8Array(MAX_BLOCKS);   // 0 none, 1 water, 2 lava
const T_PORTAL = new Uint8Array(MAX_BLOCKS);   // destination dimension (0 = not a portal)
const T_SHAPE = new Uint8Array(MAX_BLOCKS);    // SHAPE kind for non-cube blocks
const T_WLOG = new Uint8Array(MAX_BLOCKS);     // can hold water (waterlogged via meta bit 7)
const T_SINK = new Uint8Array(MAX_BLOCKS);     // sits lower on a bottom half slab
const T_TRANS = new Uint8Array(MAX_BLOCKS);    // see-through tinted (drawn in the translucent pass)
const T_LMETA = new Uint8Array(MAX_BLOCKS);    // light depends on meta (candles, sea pickles)
for (const b of BLOCKS) {
  T_OPAQUE[b.id] = b.opaque ? 1 : 0;
  T_SOLID[b.id] = b.solid ? 1 : 0;
  T_RENDER[b.id] = b.render;
  T_LIGHT[b.id] = b.light;
  T_ATT[b.id] = b.lightAtt;
  T_REPLACEABLE[b.id] = b.replaceable ? 1 : 0;
  T_LIQUID[b.id] = b.liquid === 'water' ? 1 : b.liquid === 'lava' ? 2 : 0;
  T_PORTAL[b.id] = b.portal || 0;
  T_SHAPE[b.id] = b.shapeKind || 0;
  T_WLOG[b.id] = b.wlog ? 1 : 0;
  T_SINK[b.id] = b.sink ? 1 : 0;
  T_TRANS[b.id] = b.translucent ? 1 : 0;
  T_LMETA[b.id] = b.lightMeta ? 1 : 0;
}
// Redstone: what part each block plays in a circuit, and which blocks carry power through them.
const RS = { WIRE: 1, TORCH: 2, TORCH_OFF: 3, BLOCK: 4, LEVER: 5, BUTTON: 6, PLATE: 7, REPEATER: 8, COMPARATOR: 9, OBSERVER: 10, LAMP: 11, PISTON: 12,
  DISPENSER: 13, DROPPER: 14, HOPPER: 15, NOTE: 16, TNT: 17, DOOR: 18, TRAPDOOR: 19, GATE: 20, DAYLIGHT: 21, TARGET: 22, PRAIL: 23, DRAIL: 24, BELL: 25, BULB: 26, HOOK: 27 };
const RS_ROLE = { wire: RS.WIRE, torch: RS.TORCH, torch_off: RS.TORCH_OFF, block: RS.BLOCK, lever: RS.LEVER, button: RS.BUTTON, plate: RS.PLATE, repeater: RS.REPEATER,
  comparator: RS.COMPARATOR, observer: RS.OBSERVER, lamp: RS.LAMP, piston: RS.PISTON, dispenser: RS.DISPENSER, dropper: RS.DROPPER, hopper: RS.HOPPER, daylight: RS.DAYLIGHT,
  target: RS.TARGET, prail: RS.PRAIL, drail: RS.DRAIL, bulb: RS.BULB, hook: RS.HOOK };
const T_RS = new Uint8Array(MAX_BLOCKS);
const T_COND = new Uint8Array(MAX_BLOCKS);    // a full solid block that redstone can power
for (const b of BLOCKS) {
  let r = b.rs ? RS_ROLE[b.rs] : 0;
  if (b.key === 'redstone_block') r = RS.BLOCK;
  else if (b.noteBlock) r = RS.NOTE;
  else if (b.tnt) r = RS.TNT;
  else if (b.door) r = RS.DOOR;
  else if (b.trapdoor) r = RS.TRAPDOOR;
  else if (b.shapeKind === SHAPE_KIND.GATE) r = RS.GATE;
  else if (b.bellBlock) r = RS.BELL;
  T_RS[b.id] = r || 0;
  T_COND[b.id] = b.solid && b.opaque && !b.shapeKind && b.render === RENDER.CUBE && r !== RS.BLOCK && r !== RS.OBSERVER && r !== RS.PISTON ? 1 : 0;
}
// Light from blocks whose glow depends on their state.
function metaLight(id, meta) {
  const b = BLOCKS[id], n = (meta & 3) + 1;
  if (b.lightMeta === 'candle') return meta & 4 ? 3 * n : 0;
  if (b.lightMeta === 'pickle') return meta & 0x80 ? 3 + 3 * n : 0;
  return b.light;
}
if (NB > MAX_BLOCKS) throw new Error('Too many block kinds');
// copper weathers slowly: plain -> exposed -> weathered -> oxidized
for (const [a, b] of [['copper_block', 'exposed_copper'], ['exposed_copper', 'weathered_copper'], ['weathered_copper', 'oxidized_copper'],
  ['cut_copper', 'exposed_cut_copper'], ['exposed_cut_copper', 'weathered_cut_copper'], ['weathered_cut_copper', 'oxidized_cut_copper']]) BLOCKS[B[a]].oxidizes = b;
// blocks that need random ticks (growth, burning out, weathering)
const T_TICK = new Uint8Array(MAX_BLOCKS);
for (const b of BLOCKS) if (b.tree || b.crop || b.fire || b.oxidizes || b.hive || ['berry_bush_empty', 'sugar_cane', 'cactus', 'kelp', 'bamboo', 'twisting_vines', 'weeping_vines', 'cave_vines', 'budding_amethyst', 'redstone_ore_lit', 'moving_block', 'puddle', 'snow_layer'].includes(b.key)) T_TICK[b.id] = 1;
// Grass-like tops spread by sampling (see World.randomTicks), not by listing every grass block.
const T_GRASSY = new Uint8Array(MAX_BLOCKS);
for (const k of ['grass', 'sky_grass', 'mycelium', 'dirt_with_dry_grass']) if (B[k] !== undefined) T_GRASSY[B[k]] = 1;

function blockKeyToId(key) {
  if (key in BLOCK_ID) return BLOCK_ID[key];
  if (key in BLOCK_ALIASES) return BLOCK_ID[BLOCK_ALIASES[key]] ?? 0;
  return 0; // unknown block from a newer version: load as air rather than crash
}
