// ---------------------------------------------------------------------------
// core/items.js — item registry, tool/armor tiers, food, recipes.
//
// Saves store items by string key ({id: 'iron_pickaxe', n: 1}), so this list
// can grow and be reordered freely. Renames go through ITEM_ALIASES.
// ---------------------------------------------------------------------------

const ITEM_ALIASES = {};

const TIERS = {
  wood:    { label: 'Wooden',  tier: 1, speed: 2,  durability: 60,   damage: 4, mat: '#planks' },
  stone:   { label: 'Stone',   tier: 2, speed: 4,  durability: 132,  damage: 5, mat: '#stone_tool' },
  copper:  { label: 'Copper',  tier: 2, speed: 4.5, durability: 180, damage: 5, mat: 'copper_ingot' },
  bronze:  { label: 'Bronze',  tier: 3, speed: 5.5, durability: 220, damage: 6, mat: 'bronze_ingot' },
  iron:    { label: 'Iron',    tier: 3, speed: 6,  durability: 251,  damage: 6, mat: 'iron_ingot' },
  gold:    { label: 'Golden',  tier: 1, speed: 12, durability: 33,   damage: 4, mat: 'gold_ingot' },
  diamond: { label: 'Diamond', tier: 4, speed: 8,  durability: 1562, damage: 7, mat: 'diamond' },
  cinderite: { label: 'Cinderite', tier: 5, speed: 10, durability: 2031, damage: 8, mat: 'cinderite_shard', element: 'fire' },
};
const TOOL_KINDS = {
  pickaxe: { label: 'Pickaxe', type: 'pickaxe', dmg: -2 },
  axe:     { label: 'Axe',     type: 'axe',     dmg: -1 },
  shovel:  { label: 'Shovel',  type: 'shovel',  dmg: -3 },
  sword:   { label: 'Sword',   type: 'sword',   dmg: 0 },
  hoe:     { label: 'Hoe',     type: 'hoe',     dmg: -3 },
};
const ARMOR_MATS = {
  leather: { label: 'Leather', mat: 'leather',    pts: [1, 3, 2, 1], dur: 5 },
  copper:  { label: 'Copper',  mat: 'copper_ingot', pts: [2, 4, 3, 1], dur: 10 },
  bronze:  { label: 'Bronze',  mat: 'bronze_ingot', pts: [2, 5, 4, 2], dur: 13 },
  iron:    { label: 'Iron',    mat: 'iron_ingot', pts: [2, 6, 5, 2], dur: 15 },
  gold:    { label: 'Golden',  mat: 'gold_ingot', pts: [2, 5, 3, 1], dur: 7 },
  diamond: { label: 'Diamond', mat: 'diamond',    pts: [3, 8, 6, 3], dur: 33 },
  cinderite: { label: 'Cinderite', mat: 'cinderite_shard', pts: [3, 9, 7, 3], dur: 37, fireResist: 0.25 },
};
const ARMOR_PIECES = [
  { slot: 0, key: 'helmet', label: 'Helmet', cost: 5, durMul: 11 },
  { slot: 1, key: 'chestplate', label: 'Chestplate', cost: 8, durMul: 16 },
  { slot: 2, key: 'leggings', label: 'Leggings', cost: 7, durMul: 15 },
  { slot: 3, key: 'boots', label: 'Boots', cost: 4, durMul: 13 },
];

const ITEMS = {};
function defItem(key, props) {
  ITEMS[key] = Object.assign({ key, name: key, maxStack: 64, icon: key }, props);
  return ITEMS[key];
}

// Every obtainable block is also an item that places that block.
const UNOBTAINABLE = new Set(['air', 'water', 'lava', 'bedrock', 'berry_bush_empty', 'ember_portal', 'sky_portal', 'old_torch', 'lit_furnace', 'lit_smoker', 'lit_blast_furnace',
  'item_pile', 'backpack_block', 'pocket_wall', 'fire', 'soul_fire', 'farmland', 'wheat_crop', 'carrot_crop', 'potato_crop', 'beetroot_crop', 'tomato_crop', 'onion_crop', 'cabbage_crop', 'corn_crop', 'pepper_crop', 'strawberry_crop', 'rice_crop',
  'cocoa', 'nether_wart', 'pumpkin_stem', 'melon_stem', 'cave_vines', 'cave_vines_lit', 'dirt_path',
  'redstone_wire', 'redstone_torch_off', 'redstone_lamp_on', 'piston_extended', 'sticky_piston_extended', 'piston_head', 'moving_block', 'copper_bulb_lit',
  'redstone_ore_lit', 'tripwire', 'grave', 'puddle', 'grapple_anchor', 'end_portal', 'end_gateway', 'end_portal_frame_eye', 'void_crust', 'reinforced_deepslate']);
for (const b of BLOCKS) {
  if (UNOBTAINABLE.has(b.key)) continue;
  // flat things show their own picture; everything else is drawn as a little 3D model
  const flat = b.render === RENDER.CROSS || b.render === RENDER.TORCH || b.itemIcon || T_SHAPE[b.id] === SHAPE_KIND.PANE || T_SHAPE[b.id] === SHAPE_KIND.LADDER || T_SHAPE[b.id] === SHAPE_KIND.PETALS || b.key === 'lily_pad';
  let icon = 'block:' + b.key;
  if (b.itemIcon) icon = b.itemIcon;
  else if (flat) icon = typeof b.tex === 'string' ? b.tex : (b.tex && b.tex.side) || b.key;
  defItem(b.key, { name: b.name, block: b.key, icon, fuel: b.fuel });
}
ITEMS.chest.maxStack = 1; // chests can carry contents, so they never stack
ITEMS.barrel.maxStack = 1;
ITEMS.torch.icon = 'torch';
ITEMS.lantern.icon = 'lantern_item';
ITEMS.soul_lantern.icon = 'soul_lantern_item';
ITEMS.tall_grass_double.icon = 'tall_grass_double_upper';
for (const k of ['sunflower', 'lilac', 'rose_bush', 'peony', 'large_fern']) ITEMS[k].icon = k + '_upper';
// Torches and lanterns hang on a belt or backpack hook; anything that glows lights the way when carried.
for (const k of ['torch', 'lantern', 'soul_torch', 'soul_lantern']) ITEMS[k].hook = true;
for (const k of Object.keys(ITEMS)) if (k.endsWith('_bed') || k === 'bed' || k.endsWith('_door') || k.endsWith('_sign')) ITEMS[k].maxStack = k.endsWith('_sign') ? 16 : 1;
ITEMS.cake.maxStack = 1;
for (const k of ['ender_chest', 'jukebox']) ITEMS[k].maxStack = 64;
ITEMS.pointed_dripstone.icon = 'pointed_dripstone';
ITEMS.cattail.icon = 'cattail_upper';
ITEMS.pitcher_plant.icon = 'pitcher_plant_upper';

// Materials
defItem('stick', { name: 'Stick', fuel: 0.5 });
defItem('coal', { name: 'Coal', fuel: 8 });
defItem('charcoal', { name: 'Charcoal', fuel: 8 });
defItem('iron_ingot', { name: 'Iron Ingot' });
defItem('gold_ingot', { name: 'Gold Ingot' });
defItem('copper_ingot', { name: 'Copper Ingot' });
defItem('tin_ingot', { name: 'Tin Ingot' });
defItem('bronze_ingot', { name: 'Bronze Ingot', desc: 'Three parts copper, one part tin.' });
defItem('diamond', { name: 'Diamond' });
defItem('emerald', { name: 'Emerald' });
defItem('lapis_lazuli', { name: 'Lapis Lazuli' });
defItem('quartz', { name: 'Ember Quartz' });
defItem('amethyst_shard', { name: 'Amethyst Shard' });
defItem('mese_crystal', { name: 'Mese Crystal', rarity: 'rare', desc: 'A crystal that hums faintly. Makes a bright lamp.' });
defItem('leather', { name: 'Leather' });
defItem('string', { name: 'String' });
defItem('flint', { name: 'Flint' });
defItem('clay_ball', { name: 'Clay Ball' });
defItem('brick', { name: 'Brick' });
defItem('paper', { name: 'Paper' });
defItem('book', { name: 'Book' });
defItem('sugar', { name: 'Sugar' });
defItem('straw', { name: 'Straw', fuel: 0.5, desc: 'Cut from tall grass. Makes thatch, hay and cob.' });
defItem('snowball', { name: 'Snowball', maxStack: 16 });
defItem('bowl', { name: 'Bowl', fuel: 0.5 });
defItem('flour', { name: 'Flour', desc: 'Ground at a millstone. Bake it in a furnace.' });
for (const m of ['iron', 'gold', 'copper', 'tin']) defItem('crushed_' + m, { name: 'Crushed ' + m[0].toUpperCase() + m.slice(1) + ' Ore', desc: 'Smelts into one ingot. A millstone makes two from every ore.' });
defItem('cinder_core', { name: 'Cinder Core', rarity: 'rare', desc: 'Still warm. Pulses like a heartbeat.' });
// Dyes
for (const [c, L] of COLORS) defItem(c + '_dye', { name: L + ' Dye', dye: c });

// Food — eating heals instantly. There is no hunger meter anywhere.
defItem('apple', { name: 'Apple', food: { heal: 4 } });
defItem('golden_apple', { name: 'Golden Apple', food: { heal: 8, effect: ['regen', 12, 1] }, rarity: 'rare', desc: 'Heals, then keeps healing for a while.' });
defItem('berries', { name: 'Wild Berries', food: { heal: 2 } });
defItem('raw_meat', { name: 'Raw Boar Meat', food: { heal: 3 } });
defItem('cooked_meat', { name: 'Roast Boar', food: { heal: 8 } });
defItem('bread', { name: 'Bread', food: { heal: 5 } });
defItem('venison', { name: 'Raw Venison', food: { heal: 3 } });
defItem('cooked_venison', { name: 'Venison Steak', food: { heal: 8 } });
defItem('rabbit', { name: 'Raw Rabbit', food: { heal: 2 } });
defItem('cooked_rabbit', { name: 'Roast Rabbit', food: { heal: 5 } });
defItem('wheat', { name: 'Wheat' });
defItem('wheat_seeds', { name: 'Wheat Seeds', block: 'wheat_crop', icon: 'wheat_seeds' });
defItem('carrot', { name: 'Carrot', food: { heal: 3 }, plants: 'carrot_crop' });
defItem('potato', { name: 'Potato', food: { heal: 1 }, plants: 'potato_crop' });
defItem('baked_potato', { name: 'Baked Potato', food: { heal: 5 } });
defItem('beetroot', { name: 'Beetroot', food: { heal: 1 } });
defItem('beetroot_seeds', { name: 'Beetroot Seeds', block: 'beetroot_crop', icon: 'beetroot_seeds' });
defItem('beetroot_soup', { name: 'Beetroot Soup', food: { heal: 6 }, maxStack: 1, bowl: true });
defItem('mushroom_stew', { name: 'Mushroom Stew', food: { heal: 6 }, maxStack: 1, bowl: true });
defItem('melon_slice', { name: 'Melon Slice', food: { heal: 2 } });
defItem('pumpkin_seeds', { name: 'Pumpkin Seeds' });
defItem('pumpkin_pie', { name: 'Pumpkin Pie', food: { heal: 8 } });
defItem('dried_kelp', { name: 'Dried Kelp', food: { heal: 1 } });
defItem('beef', { name: 'Raw Beef', food: { heal: 3 } });
defItem('cooked_beef', { name: 'Steak', food: { heal: 8 } });
defItem('porkchop', { name: 'Raw Porkchop', food: { heal: 3 } });
defItem('cooked_porkchop', { name: 'Cooked Porkchop', food: { heal: 8 } });
defItem('chicken', { name: 'Raw Chicken', food: { heal: 2 } });
defItem('cooked_chicken', { name: 'Cooked Chicken', food: { heal: 6 } });
defItem('mutton', { name: 'Raw Mutton', food: { heal: 2 } });
defItem('cooked_mutton', { name: 'Cooked Mutton', food: { heal: 6 } });
defItem('cookie', { name: 'Cookie', food: { heal: 2 } });
defItem('glow_berries', { name: 'Glow Berries', food: { heal: 2 }, plants: 'cave_vines', desc: 'Plant on a cave ceiling to grow glowing vines.' });
defItem('honey_bottle', { name: 'Honey Bottle', food: { heal: 6 }, maxStack: 16, returns: 'glass_bottle' });
defItem('milk_bucket', { name: 'Milk Bucket', maxStack: 1, food: { heal: 0 }, drink: 'milk', returns: 'bucket', desc: 'Drink to wash away frost and burning.' });
defItem('cocoa_beans', { name: 'Cocoa Beans', plants: 'cocoa', desc: 'Plant on the side of a jungle log.' });
defItem('nether_wart_item', { name: 'Nether Wart', plants: 'nether_wart', icon: 'nether_wart_item', desc: 'Grows on soul sand.' });
defItem('melon_seeds', { name: 'Melon Seeds', plants: 'melon_stem' });
ITEMS.pumpkin_seeds.plants = 'pumpkin_stem';
defItem('bone', { name: 'Bone' });
defItem('bone_meal', { name: 'Bone Meal', bonemeal: true, desc: 'Use on crops, saplings and grass to make them grow.' });
defItem('feather', { name: 'Feather' });
defItem('egg', { name: 'Egg', maxStack: 16 });
defItem('gunpowder', { name: 'Gunpowder' });
defItem('slime_ball', { name: 'Slimeball' });
defItem('honeycomb', { name: 'Honeycomb', desc: 'Shear it from a full bee nest or hive.' });
defItem('glass_bottle', { name: 'Glass Bottle', maxStack: 16, bottle: true });
defItem('iron_nugget', { name: 'Iron Nugget' });
defItem('gold_nugget', { name: 'Gold Nugget' });
defItem('nether_brick', { name: 'Nether Brick' });
defItem('redstone', { name: 'Redstone Dust', block: 'redstone_wire', desc: 'Lay it on the ground to carry power. Each block of dust loses a little.' });
defItem('we_wand', { name: 'WorldEdit Wand', maxStack: 1, weWand: true, rarity: 'rare', desc: 'Left click: corner 1. Right click: corner 2. Then //set, //replace, //copy... (/help)' });
defItem('death_compass', { name: 'Death Compass', compass: 'death', maxStack: 1, desc: 'Points to your grave. Open the grave to get everything back.' });
defItem('heart_crystal', { name: 'Heart Crystal', rarity: 'epic', heartCrystal: true, maxStack: 16, desc: 'A boss\'s heart, crystallised. Use it for one more heart that stays (up to ten).' });
defItem('vigor_charm', { name: 'Charm of Vigor', rarity: 'rare', maxStack: 1, charm: { hearts: 2 }, desc: 'Worn on the belt: two more hearts.' });
defItem('ember_charm', { name: 'Ember Charm', rarity: 'rare', maxStack: 1, charm: { fire: 0.5 }, desc: 'Worn on the belt: fire and lava hurt half as much.' });
defItem('tide_charm', { name: 'Tide Charm', rarity: 'rare', maxStack: 1, charm: { breath: 3 }, desc: 'Worn on the belt: your breath lasts four times as long under water.' });
defItem('feather_charm', { name: 'Feather Charm', rarity: 'rare', maxStack: 1, charm: { fall: 0.5 }, desc: 'Worn on the belt: falls hurt half as much.' });
defItem('minecart', { name: 'Minecart', cart: 'minecart', maxStack: 1, desc: 'Set it on a rail and climb in. Powered rails speed it up.' });
defItem('chest_minecart', { name: 'Minecart with Chest', cart: 'chest', maxStack: 1, desc: 'A rolling chest. Hoppers can fill and empty it.' });
defItem('hopper_minecart', { name: 'Minecart with Hopper', cart: 'hopper', maxStack: 1, desc: 'Picks up items it rolls under or over. Locked on a powered activator rail.' });
defItem('furnace_minecart', { name: 'Minecart with Furnace', cart: 'furnace', maxStack: 1, desc: 'Feed it coal and it pushes itself (and the carts in front of it).' });
defItem('tnt_minecart', { name: 'Minecart with TNT', cart: 'tnt', maxStack: 1, desc: 'Goes off when it rolls over a powered activator rail.' });
defItem('arrow', { name: 'Arrow' });
defItem('bow', { name: 'Bow', maxStack: 1, bow: true, tool: { type: 'bow', tier: 0, speed: 1, damage: 1, durability: 384 }, desc: 'Hold use to draw, let go to shoot. Needs arrows.' });
defItem('compass', { name: 'Compass', maxStack: 1, compass: true, desc: 'Points home, to your spawn point.' });
defItem('clock', { name: 'Clock', maxStack: 1, clock: true, desc: 'Shows the time of day.' });
defItem('spyglass', { name: 'Spyglass', maxStack: 1, spyglass: true, desc: 'Hold use to look through it.' });
for (const [k, n, tune] of [['music_disc_ember', 'Music Disc — Ember', 'ember'], ['music_disc_tide', 'Music Disc — Tide', 'tide'], ['music_disc_grove', 'Music Disc — Grove', 'grove'], ['music_disc_sun', 'Music Disc — Sunrise', 'sun']])
  defItem(k, { name: n, maxStack: 1, disc: tune, rarity: 'rare', desc: 'Put it in a jukebox.' });

// Tools
for (const [tk, t] of Object.entries(TIERS)) {
  for (const [kk, k] of Object.entries(TOOL_KINDS)) {
    defItem(tk + '_' + kk, {
      name: t.label + ' ' + k.label, maxStack: 1, icon: tk + '_' + kk,
      tool: { type: k.type, tier: t.tier, speed: t.speed, damage: Math.max(1, t.damage + k.dmg), durability: t.durability, element: kk === 'sword' ? t.element : undefined },
      fuel: tk === 'wood' ? 1 : undefined,
    });
  }
}
// Armor
for (const [mk, m] of Object.entries(ARMOR_MATS)) {
  for (const p of ARMOR_PIECES) {
    defItem(mk + '_' + p.key, {
      name: m.label + ' ' + p.label, maxStack: 1, icon: mk + '_' + p.key,
      armor: { slot: p.slot, points: m.pts[p.slot], durability: m.dur * p.durMul, fireResist: m.fireResist || 0 },
    });
  }
}
// Special
defItem('bucket', { name: 'Bucket', maxStack: 16, bucket: 'empty' });
defItem('water_bucket', { name: 'Water Bucket', maxStack: 1, bucket: 'water' });
defItem('lava_bucket', { name: 'Lava Bucket', maxStack: 1, bucket: 'lava', fuel: 100 });
defItem('flint_and_steel', { name: 'Flint and Steel', maxStack: 1, igniter: 'flint', tool: { type: 'igniter', tier: 0, speed: 1, damage: 1, durability: 64 } });
defItem('shears', { name: 'Shears', maxStack: 1, shears: true, tool: { type: 'shears', tier: 0, speed: 5, damage: 1, durability: 238 } });
defItem('rowboat', { name: 'Rowboat', maxStack: 1, boat: 'rowboat', desc: 'Place on water. Use to climb in; sneak to get out.' });
defItem('sailboat', { name: 'Sailboat', maxStack: 1, boat: 'sailboat', rarity: 'rare', desc: 'Catches the wind — fastest with the wind across or behind you. W/S set the sail, A/D steer.' });
defItem('leather_backpack', { name: 'Leather Backpack', maxStack: 1, backpack: 9, desc: 'Wear it in the backpack slot for 9 extra slots.' });
defItem('reinforced_backpack', { name: 'Reinforced Backpack', maxStack: 1, backpack: 18, desc: 'Wear it in the backpack slot for 18 extra slots.' });
defItem('ember_effigy', { name: 'Ember Effigy', maxStack: 4, summon: 'cinder_golem', rarity: 'rare', desc: 'Place on the ground at night to summon the Cinder Golem.' });
defItem('ember_blade', {
  name: 'Ember Blade', maxStack: 1, rarity: 'epic', desc: 'Fire element. Sets foes ablaze.',
  tool: { type: 'sword', tier: 3, speed: 1.5, damage: 7, durability: 900, element: 'fire' },
});
defItem('cinderite_shard', { name: 'Cinderite Shard', rarity: 'rare', desc: 'Mined in the Ember Depths. Forged into fire-proof gear.' });
defItem('aether_crystal', { name: 'Aether Crystal', rarity: 'rare', desc: 'Hums with weightless light. Found in the Skylands.' });
defItem('ember_igniter', { name: 'Ember Igniter', maxStack: 1, igniter: 'ember', rarity: 'rare', desc: 'Use on an obsidian frame to open a portal to the Ember Depths.' });
defItem('pocket_key', { name: 'Pocket Key', maxStack: 1, pocketKey: true, rarity: 'epic', desc: 'Use to step into your personal pocket dimension, and again to return.' });
defItem('frost_shard', { name: 'Frost Shard', rarity: 'rare', desc: 'Found in snowy peaks. Cold to the touch.' });
defItem('frostbite_dagger', {
  name: 'Frostbite Dagger', maxStack: 1, rarity: 'epic', desc: 'Frost element. Slows foes. Cinder Golems take double damage.',
  tool: { type: 'sword', tier: 3, speed: 1.5, damage: 7, durability: 700, element: 'frost' },
});
ITEMS.lava_bucket.light = 13;
ITEMS.glow_berries.light = 6;
for (const k of ['anvil', 'chipped_anvil', 'damaged_anvil']) ITEMS[k].desc = 'Repairs a tool with its own material, or joins two worn tools. Wears out with use.';
ITEMS.grindstone.desc = 'Joins two worn tools of the same kind into one, a little better than new.';
ITEMS.smithing_table.desc = 'Upgrades diamond gear with a cinderite shard, and copper gear to bronze with a tin ingot.';
ITEMS.loom.desc = 'Recolours wool, carpet, concrete powder, terracotta and glass in bulk: eight blocks per dye.';
ITEMS.fletching_table.desc = 'Fletches arrows: flint and feathers make twice the arrows of a crafting table.';
ITEMS.string.block = 'tripwire';
Object.assign(ITEMS.redstone_torch, { desc: 'Always on — until the block it hangs on is powered. Then it goes out.' });
Object.assign(ITEMS.lever, { desc: 'On and off. Goes on floors, ceilings and walls.' });
Object.assign(ITEMS.repeater, { desc: 'Passes a signal on at full strength, one way only. Use it to set a delay of 1-4 ticks.' });
Object.assign(ITEMS.comparator, { desc: 'Compares the signal behind it with the ones at its sides, or reads how full a container is. Use it to switch to subtract.' });
Object.assign(ITEMS.observer, { desc: 'Sends a short pulse out of its back when the block in front of its face changes.' });
Object.assign(ITEMS.piston, { desc: 'Pushes up to 12 blocks when powered.' });
Object.assign(ITEMS.sticky_piston, { desc: 'Pushes, and pulls the block back when the power goes.' });
Object.assign(ITEMS.dispenser, { desc: 'Powered: shoots arrows, pours buckets, uses bone meal, lights TNT, sets down carts and boats.' });
Object.assign(ITEMS.dropper, { desc: 'Powered: drops an item, or passes it into the container in front.' });
Object.assign(ITEMS.hopper, { desc: 'Pulls items from above and passes them on through its spout. Redstone locks it.' });
Object.assign(ITEMS.redstone_lamp, { desc: 'Lights up while powered.' });
Object.assign(ITEMS.daylight_detector, { desc: 'Gives a signal in daylight. Use it to invert it for night.' });
Object.assign(ITEMS.target, { desc: 'Hit it with an arrow: the nearer the middle, the stronger the signal.' });
Object.assign(ITEMS.copper_bulb, { desc: 'Toggles on or off each time it is powered.' });
Object.assign(ITEMS.tripwire_hook, { desc: 'Two hooks facing each other with string between them: walking through sends a signal.' });
Object.assign(ITEMS.rail, { desc: 'Lay track for minecarts. Rails join up, climb slopes and turn corners on their own.' });
Object.assign(ITEMS.powered_rail, { desc: 'Powered: speeds carts up. Unpowered: stops them.' });
Object.assign(ITEMS.detector_rail, { desc: 'Sends a signal while a cart is on it.' });
Object.assign(ITEMS.activator_rail, { desc: 'Powered: tips riders out, lights TNT carts, locks hopper carts.' });
ITEMS.cartography_table.desc = 'A mapmaker\'s desk. Maps come in a later update.';
ITEMS.composter.desc = 'Fill it with plants. When it is full, use it again for bone meal.';
ITEMS.ender_chest.desc = 'Your own private chest. Every ender chest opens onto the same 27 slots.';
ITEMS.jukebox.desc = 'Plays a music disc.';
ITEMS.scaffolding.desc = 'Climb it like a ladder; sneak to go down through it.';
ITEMS.item_frame.desc = 'Hang it on a wall and put an item in it. Use again to turn the item.';
ITEMS.glow_item_frame.desc = 'An item frame whose item glows in the dark.';
ITEMS.cake.desc = 'Place it, then eat it a slice at a time.';
ITEMS.slime_block.desc = 'Bounces you back up. Sneak to land softly.';
ITEMS.honey_block.desc = 'Sticky: slows you down and softens falls.';
ITEMS.ember_blade.light = 6;
ITEMS.cinder_core.light = 7;
ITEMS.aether_crystal.light = 5;
ITEMS.mese_crystal.light = 6;
ITEMS.windmill.desc = 'Place on the side of a block high up in open air. Its axle turns machines.';
ITEMS.waterwheel.desc = 'Place beside flowing water. Its axle turns machines.';
ITEMS.axle.desc = 'Carries turning power from a windmill or waterwheel to a millstone or sawmill.';
ITEMS.millstone.desc = 'Grinds ore into two crushed ores, wheat into flour, gravel into sand. Needs a turning axle.';
ITEMS.sawmill.desc = 'Saws logs into six planks. Needs a turning axle.';
ITEMS.stonecutter.desc = 'Cuts stone blocks into stairs, slabs, walls and bricks one for one.';

function itemDef(key) {
  return ITEMS[key] || ITEMS[ITEM_ALIASES[key]] || null;
}
function maxStackOf(key) { const d = itemDef(key); return d ? d.maxStack : 64; }
// How brightly an item glows when carried (0..15).
function itemLight(key) {
  const d = itemDef(key);
  if (!d) return 0;
  if (d.light !== undefined) return d.light;
  return d.block ? BLOCKS[B[d.block]].light : 0;
}

// ---- Recipes ---------------------------------------------------------------
// Classic grid crafting. Shaped recipes use up to 3x3 patterns (a 2x2 pattern
// also works in the inventory's own grid). Patterns may be mirrored. Tags
// (#log) accept any member. Shapeless recipes list their ingredients.
const TAGS = {
  '#log': [], '#planks': [], '#leaves': [], '#wool': ['wool'],
  '#coal': ['coal', 'charcoal'],
  '#stone_tool': ['cobblestone', 'cobbled_slate', 'blackstone'],
  '#sand': ['sand', 'red_sand', 'silver_sand'],
  '#sapling': [],
};
for (const [w, L, logK, plK, lfK, spK] of WOODS) {
  const wood = w + (STEMS.has(w) ? '_hyphae' : '_wood');
  TAGS['#logs_' + w] = [logK, wood, 'stripped_' + logK, 'stripped_' + wood];
  TAGS['#log'].push(...TAGS['#logs_' + w]);
  TAGS['#planks'].push(plK);
  if (!STEMS.has(w)) TAGS['#leaves'].push(lfK);
  TAGS['#sapling'].push(spK);
}
for (const [c] of COLORS) if (c !== 'white') TAGS['#wool'].push(c + '_wool');
TAGS['#planks'].push('bamboo_planks');
TAGS['#wood_slab'] = WOODS.map(w => w[0] + '_slab').concat(['bamboo_slab']);
const RECIPES = [
  { out: 'stick', n: 4, shape: ['P', 'P'], key: { P: '#planks' } },
  { out: 'crafting_table', n: 1, shape: ['PP', 'PP'], key: { P: '#planks' } },
  { out: 'torch', n: 4, shape: ['C', 'S'], key: { C: '#coal', S: 'stick' } },
  { out: 'soul_torch', n: 4, shape: ['C', 'S', 'A'], key: { C: '#coal', S: 'stick', A: 'soul_soil' } },
  { out: 'lantern', n: 1, shape: ['I', 'T'], key: { I: 'iron_ingot', T: 'torch' } },
  { out: 'soul_lantern', n: 1, shape: ['I', 'T'], key: { I: 'iron_ingot', T: 'soul_torch' } },
  { out: 'furnace', n: 1, shape: ['CCC', 'C C', 'CCC'], key: { C: '#stone_tool' } },
  { out: 'smoker', n: 1, shape: [' L ', 'LFL', ' L '], key: { L: '#log', F: 'furnace' } },
  { out: 'blast_furnace', n: 1, shape: ['III', 'IFI', 'SSS'], key: { I: 'iron_ingot', F: 'furnace', S: 'smooth_stone' } },
  { out: 'chest', n: 1, shape: ['PPP', 'P P', 'PPP'], key: { P: '#planks' } },
  { out: 'barrel', n: 1, shape: ['PSP', 'P P', 'PSP'], key: { P: '#planks', S: 'oak_slab' } },
  { out: 'bucket', n: 1, shape: ['I I', ' I '], key: { I: 'iron_ingot' } },
  { out: 'shears', n: 1, shape: [' I', 'I '], key: { I: 'iron_ingot' } },
  { out: 'flint_and_steel', n: 1, items: ['iron_ingot', 'flint'] },
  { out: 'bowl', n: 4, shape: ['P P', ' P '], key: { P: '#planks' } },
  { out: 'stone_bricks', n: 4, shape: ['SS', 'SS'], key: { S: 'stone' } },
  { out: 'bricks', n: 1, shape: ['BB', 'BB'], key: { B: 'brick' } },
  { out: 'sandstone', n: 1, shape: ['SS', 'SS'], key: { S: 'sand' } },
  { out: 'red_sandstone', n: 1, shape: ['SS', 'SS'], key: { S: 'red_sand' } },
  { out: 'cut_sandstone', n: 4, shape: ['SS', 'SS'], key: { S: 'sandstone' } },
  { out: 'chiseled_sandstone', n: 1, shape: ['S', 'S'], key: { S: 'sandstone_slab' } },
  { out: 'chiseled_stone_bricks', n: 1, shape: ['S', 'S'], key: { S: 'stone_brick_slab' } },
  { out: 'mossy_cobblestone', n: 1, items: ['cobblestone', 'vine'] },
  { out: 'mossy_stone_bricks', n: 1, items: ['stone_bricks', 'vine'] },
  { out: 'wool', n: 1, shape: ['SS', 'SS'], key: { S: 'string' } },
  { out: 'glowstone', n: 4, shape: ['GTG', 'TIT', 'GTG'], key: { G: 'glass', T: 'torch', I: 'gold_ingot' } },
  { out: 'golden_apple', n: 1, shape: ['GGG', 'GAG', 'GGG'], key: { G: 'gold_ingot', A: 'apple' } },
  { out: 'bread', n: 1, shape: ['WWW'], key: { W: 'wheat' } },
  { out: 'hay_bale', n: 1, shape: ['WWW', 'WWW', 'WWW'], key: { W: 'wheat' } },
  { out: 'wheat', n: 9, items: ['hay_bale'] },
  { out: 'thatch', n: 4, shape: ['SS', 'SS'], key: { S: 'straw' } },
  { out: 'cob', n: 4, shape: ['CD', 'DS'], key: { C: 'clay_ball', D: 'dirt', S: 'straw' } },
  { out: 'daub', n: 4, shape: ['SCS', 'CSC', 'SCS'], key: { S: 'stick', C: 'clay_ball' } },
  { out: 'plaster', n: 4, items: ['clay_ball', 'clay_ball', 'sand', 'sand'] },
  { out: 'timber_frame', n: 4, shape: ['S S', ' P ', 'S S'], key: { S: 'stick', P: 'plaster' } },
  { out: 'timber_frame_cross', n: 1, items: ['timber_frame'] },
  { out: 'timber_frame_diagonal', n: 1, items: ['timber_frame_cross'] },
  { out: 'timber_frame', n: 1, items: ['timber_frame_diagonal'] },
  { out: 'roof_tiles', n: 4, shape: ['BB', 'BB'], key: { B: 'terracotta' } },
  { out: 'dark_roof_tiles', n: 4, shape: ['BB', 'BB'], key: { B: 'slate_tiles' } },
  { out: 'mud_bricks', n: 4, shape: ['MM', 'MM'], key: { M: 'packed_mud' } },
  { out: 'packed_mud', n: 1, items: ['mud', 'wheat'] },
  { out: 'mud', n: 1, items: ['dirt', 'water_bucket'], keep: { water_bucket: 'bucket' } },
  { out: 'coarse_dirt', n: 4, shape: ['DG', 'GD'], key: { D: 'dirt', G: 'gravel' } },
  { out: 'paper', n: 3, shape: ['CCC'], key: { C: 'sugar_cane' } },
  { out: 'sugar', n: 1, items: ['sugar_cane'] },
  { out: 'book', n: 1, items: ['paper', 'paper', 'paper', 'leather'] },
  { out: 'bookshelf', n: 1, shape: ['PPP', 'BBB', 'PPP'], key: { P: '#planks', B: 'book' } },
  { out: 'ladder', n: 3, shape: ['S S', 'SSS', 'S S'], key: { S: 'stick' } },
  { out: 'campfire', n: 1, shape: [' S ', 'SCS', 'LLL'], key: { S: 'stick', C: '#coal', L: '#log' } },
  { out: 'soul_campfire', n: 1, shape: [' S ', 'SCS', 'LLL'], key: { S: 'stick', C: 'soul_soil', L: '#log' } },
  { out: 'chain', n: 1, shape: ['I', 'I', 'I'], key: { I: 'iron_ingot' } },
  { out: 'iron_bars', n: 16, shape: ['III', 'III'], key: { I: 'iron_ingot' } },
  { out: 'glass_pane', n: 16, shape: ['GGG', 'GGG'], key: { G: 'glass' } },
  { out: 'paper_wall', n: 6, shape: ['SPS', 'SPS'], key: { S: 'stick', P: 'paper' } },
  { out: 'tinted_glass', n: 2, shape: [' A ', 'AGA', ' A '], key: { A: 'amethyst_shard', G: 'glass' } },
  { out: 'amethyst_block', n: 1, shape: ['AA', 'AA'], key: { A: 'amethyst_shard' } },
  { out: 'iron_door', n: 3, shape: ['II', 'II', 'II'], key: { I: 'iron_ingot' } },
  { out: 'iron_trapdoor', n: 1, shape: ['II', 'II'], key: { I: 'iron_ingot' } },
  { out: 'flower_pot', n: 1, shape: ['B B', ' B '], key: { B: 'brick' } },
  { out: 'cauldron', n: 1, shape: ['I I', 'I I', 'III'], key: { I: 'iron_ingot' } },
  { out: 'bell', n: 1, shape: ['SSS', 'GGG', 'G G'], key: { S: 'stick', G: 'gold_ingot' } },
  { out: 'note_block', n: 1, shape: ['PPP', 'PRP', 'PPP'], key: { P: '#planks', R: 'quartz' } },
  { out: 'stonecutter', n: 1, shape: [' I ', 'SSS'], key: { I: 'iron_ingot', S: 'stone' } },
  { out: 'tnt', n: 1, shape: ['GSG', 'SGS', 'GSG'], key: { G: 'flint', S: '#sand' } },
  { out: 'jack_o_lantern', n: 1, items: ['carved_pumpkin', 'torch'] },
  { out: 'pumpkin_pie', n: 1, items: ['pumpkin', 'sugar', 'wheat'] },
  { out: 'pumpkin_seeds', n: 4, items: ['pumpkin'] },
  { out: 'melon', n: 1, shape: ['MMM', 'MMM', 'MMM'], key: { M: 'melon_slice' } },
  { out: 'mushroom_stew', n: 1, items: ['brown_mushroom', 'red_mushroom', 'bowl'] },
  { out: 'beetroot_soup', n: 1, items: ['beetroot', 'beetroot', 'beetroot', 'beetroot', 'beetroot', 'beetroot', 'bowl'] },
  { out: 'dried_kelp_block', n: 1, shape: ['KKK', 'KKK', 'KKK'], key: { K: 'dried_kelp' } },
  { out: 'snow_block', n: 1, shape: ['SS', 'SS'], key: { S: 'snowball' } },
  { out: 'snow_layer', n: 6, shape: ['SSS'], key: { S: 'snow_block' } },
  { out: 'bronze_ingot', n: 4, items: ['copper_ingot', 'copper_ingot', 'copper_ingot', 'tin_ingot'] },
  { out: 'mese_lamp', n: 1, shape: ['GGG', 'GMG', 'GGG'], key: { G: 'glass', M: 'mese_crystal' } },
  { out: 'obsidian_glass', n: 1, items: ['obsidian', 'glass'] },
  { out: 'sea_lantern', n: 1, shape: ['PGP', 'GGG', 'PGP'], key: { P: 'prismarine', G: 'glowstone' } },
  { out: 'prismarine_bricks', n: 4, shape: ['PP', 'PP'], key: { P: 'prismarine' } },
  { out: 'dark_prismarine', n: 1, items: ['prismarine', 'black_dye'] },
  { out: 'end_stone_bricks', n: 4, shape: ['EE', 'EE'], key: { E: 'end_stone' } },
  { out: 'quartz_block', n: 1, shape: ['QQ', 'QQ'], key: { Q: 'quartz' } },
  { out: 'quartz_bricks', n: 4, shape: ['QQ', 'QQ'], key: { Q: 'quartz_block' } },
  { out: 'quartz_pillar', n: 2, shape: ['Q', 'Q'], key: { Q: 'quartz_block' } },
  { out: 'marble_pillar', n: 2, shape: ['Q', 'Q'], key: { Q: 'marble' } },
  { out: 'red_nether_bricks', n: 1, shape: ['BW', 'WB'], key: { B: 'nether_bricks', W: 'red_dye' } },
  { out: 'leather_backpack', n: 1, shape: ['LIL', 'L L', 'LLL'], key: { L: 'leather', I: 'iron_ingot' } },
  { out: 'reinforced_backpack', n: 1, shape: ['III', 'IBI', 'LLL'], key: { I: 'iron_ingot', B: 'leather_backpack', L: 'leather' } },
  { out: 'ember_effigy', n: 1, shape: ['ICI', 'CGC', 'ICI'], key: { I: 'iron_ingot', C: 'coal', G: 'gold_ingot' } },
  { out: 'ember_igniter', n: 1, items: ['cinder_core', 'iron_ingot', 'iron_ingot'] },
  { out: 'frostbite_dagger', n: 1, shape: ['FDF', ' S '], key: { F: 'frost_shard', D: 'diamond', S: 'stick' } },
  { out: 'pocket_key', n: 1, shape: ['AGA', 'AOA', ' G '], key: { A: 'aether_crystal', G: 'gold_ingot', O: 'obsidian' } },
  { out: 'rowboat', n: 1, shape: ['P P', 'PPP'], key: { P: '#planks' } },
  { out: 'sailboat', n: 1, shape: [' W ', 'WSW', ' B '], key: { W: '#wool', S: 'stick', B: 'rowboat' } },
  // machines
  { out: 'axle', n: 4, shape: ['L', 'L'], key: { L: '#log' } },
  { out: 'windmill', n: 1, shape: ['WSW', 'SAS', 'WSW'], key: { W: '#wool', S: 'stick', A: 'axle' } },
  { out: 'waterwheel', n: 1, shape: ['PSP', 'SAS', 'PSP'], key: { P: '#planks', S: 'stick', A: 'axle' } },
  { out: 'millstone', n: 1, shape: [' A ', 'SSS', 'SSS'], key: { A: 'axle', S: 'stone' } },
  { out: 'sawmill', n: 1, shape: [' I ', 'PAP', 'PPP'], key: { I: 'iron_ingot', A: 'axle', P: '#planks' } },
  // metals in and out of blocks
  ...[['coal_block', 'coal'], ['iron_block', 'iron_ingot'], ['gold_block', 'gold_ingot'], ['diamond_block', 'diamond'], ['copper_block', 'copper_ingot'], ['tin_block', 'tin_ingot'],
    ['bronze_block', 'bronze_ingot'], ['lapis_block', 'lapis_lazuli'], ['emerald_block', 'emerald']].flatMap(([b, i]) => [
    { out: b, n: 1, shape: ['III', 'III', 'III'], key: { I: i } }, { out: i, n: 9, items: [b] }]),
  { out: 'cut_copper', n: 4, shape: ['CC', 'CC'], key: { C: 'copper_block' } },
  // ---- the 0.5 additions ----
  { out: 'bamboo_block', n: 1, shape: ['BBB', 'BBB', 'BBB'], key: { B: 'bamboo' } },
  { out: 'bamboo_planks', n: 2, items: ['bamboo_block'] },
  { out: 'bamboo_planks', n: 2, items: ['stripped_bamboo_block'] },
  { out: 'bamboo_mosaic', n: 1, shape: ['S', 'S'], key: { S: 'bamboo_slab' } },
  { out: 'stick', n: 1, shape: ['B', 'B'], key: { B: 'bamboo' } },
  { out: 'scaffolding', n: 6, shape: ['BSB', 'B B', 'B B'], key: { B: 'bamboo', S: 'string' } },
  { out: 'polished_tuff', n: 4, shape: ['XX', 'XX'], key: { X: 'tuff' } },
  { out: 'tuff_bricks', n: 4, shape: ['XX', 'XX'], key: { X: 'polished_tuff' } },
  { out: 'chiseled_tuff', n: 1, shape: ['S', 'S'], key: { S: 'tuff_slab' } },
  { out: 'chiseled_tuff_bricks', n: 1, shape: ['S', 'S'], key: { S: 'tuff_brick_slab' } },
  { out: 'polished_blackstone', n: 4, shape: ['XX', 'XX'], key: { X: 'blackstone' } },
  { out: 'blackstone_bricks', n: 4, shape: ['XX', 'XX'], key: { X: 'polished_blackstone' } },
  { out: 'chiseled_polished_blackstone', n: 1, shape: ['S', 'S'], key: { S: 'polished_blackstone_slab' } },
  { out: 'gilded_blackstone', n: 1, items: ['blackstone', 'gold_nugget', 'gold_nugget', 'gold_nugget'] },
  { out: 'chiseled_nether_bricks', n: 1, shape: ['S', 'S'], key: { S: 'nether_brick_slab' } },
  { out: 'nether_bricks', n: 1, shape: ['BB', 'BB'], key: { B: 'nether_brick' } },
  { out: 'chiseled_quartz_block', n: 1, shape: ['S', 'S'], key: { S: 'quartz_slab' } },
  { out: 'cut_red_sandstone', n: 4, shape: ['SS', 'SS'], key: { S: 'red_sandstone' } },
  { out: 'chiseled_red_sandstone', n: 1, shape: ['S', 'S'], key: { S: 'red_sandstone_slab' } },
  { out: 'purpur_pillar', n: 1, shape: ['S', 'S'], key: { S: 'purpur_slab' } },
  { out: 'purpur_block', n: 4, items: ['end_stone_bricks', 'end_stone_bricks', 'end_stone_bricks', 'end_stone_bricks', 'purple_dye'] },
  { out: 'chiseled_slate', n: 1, shape: ['S', 'S'], key: { S: 'cobbled_slate_slab' } },
  { out: 'desert_stone_block', n: 9, shape: ['XXX', 'XXX', 'XXX'], key: { X: 'desert_stone' } },
  { out: 'stone_block', n: 9, shape: ['XXX', 'XXX', 'XXX'], key: { X: 'stone' } },
  { out: 'desert_sandstone', n: 1, shape: ['SS', 'SS'], key: { S: 'desert_sand' } },
  { out: 'desert_sandstone_bricks', n: 4, shape: ['SS', 'SS'], key: { S: 'desert_sandstone' } },
  { out: 'desert_sandstone_block', n: 9, shape: ['SSS', 'SSS', 'SSS'], key: { S: 'desert_sandstone' } },
  { out: 'silver_sandstone', n: 1, shape: ['SS', 'SS'], key: { S: 'silver_sand' } },
  { out: 'silver_sandstone_bricks', n: 4, shape: ['SS', 'SS'], key: { S: 'silver_sandstone' } },
  { out: 'silver_sandstone_block', n: 9, shape: ['SSS', 'SSS', 'SSS'], key: { S: 'silver_sandstone' } },
  { out: 'obsidian_bricks', n: 4, shape: ['OO', 'OO'], key: { O: 'obsidian' } },
  { out: 'obsidian_block', n: 9, shape: ['OOO', 'OOO', 'OOO'], key: { O: 'obsidian' } },
  { out: 'copper_grate', n: 4, shape: [' C ', 'C C', ' C '], key: { C: 'copper_block' } },
  { out: 'chiseled_copper', n: 1, shape: ['S', 'S'], key: { S: 'cut_copper_slab' } },
  { out: 'bone_meal', n: 3, items: ['bone'] },
  { out: 'bone_block', n: 1, shape: ['BBB', 'BBB', 'BBB'], key: { B: 'bone_meal' } },
  { out: 'bone_meal', n: 9, items: ['bone_block'] },
  { out: 'slime_ball', n: 2, items: ['clay_ball', 'kelp', 'lime_dye'] },
  { out: 'slime_block', n: 1, shape: ['SSS', 'SSS', 'SSS'], key: { S: 'slime_ball' } },
  { out: 'slime_ball', n: 9, items: ['slime_block'] },
  { out: 'honey_block', n: 1, shape: ['HH', 'HH'], key: { H: 'honey_bottle' }, keep: { honey_bottle: 'glass_bottle' } },
  { out: 'honey_bottle', n: 4, items: ['honey_block', 'glass_bottle', 'glass_bottle', 'glass_bottle', 'glass_bottle'] },
  { out: 'honeycomb_block', n: 1, shape: ['HH', 'HH'], key: { H: 'honeycomb' } },
  { out: 'beehive', n: 1, shape: ['PPP', 'HHH', 'PPP'], key: { P: '#planks', H: 'honeycomb' } },
  { out: 'glass_bottle', n: 3, shape: ['G G', ' G '], key: { G: 'glass' } },
  { out: 'ochre_froglight', n: 1, items: ['shroomlight', 'yellow_dye'] },
  { out: 'verdant_froglight', n: 1, items: ['shroomlight', 'lime_dye'] },
  { out: 'pearlescent_froglight', n: 1, items: ['shroomlight', 'pink_dye'] },
  { out: 'jukebox', n: 1, shape: ['PPP', 'PDP', 'PPP'], key: { P: '#planks', D: 'diamond' } },
  { out: 'ender_chest', n: 1, shape: ['OOO', 'OAO', 'OOO'], key: { O: 'obsidian', A: 'aether_crystal' } },
  { out: 'smithing_table', n: 1, shape: ['II', 'PP', 'PP'], key: { I: 'iron_ingot', P: '#planks' } },
  { out: 'loom', n: 1, shape: ['SS', 'PP'], key: { S: 'string', P: '#planks' } },
  { out: 'cartography_table', n: 1, shape: ['AA', 'PP', 'PP'], key: { A: 'paper', P: '#planks' } },
  { out: 'fletching_table', n: 1, shape: ['FF', 'PP', 'PP'], key: { F: 'flint', P: '#planks' } },
  { out: 'composter', n: 1, shape: ['S S', 'S S', 'SSS'], key: { S: '#wood_slab' } },
  { out: 'lectern', n: 1, shape: ['SSS', ' B ', ' S '], key: { S: '#wood_slab', B: 'bookshelf' } },
  { out: 'anvil', n: 1, shape: ['BBB', ' I ', 'III'], key: { B: 'iron_block', I: 'iron_ingot' } },
  { out: 'grindstone', n: 1, shape: ['SLS', 'P P'], key: { S: 'stick', L: 'stone_slab', P: '#planks' } },
  { out: 'decorated_pot', n: 1, shape: [' B ', 'B B', ' B '], key: { B: 'brick' } },
  { out: 'end_rod', n: 4, shape: ['G', 'S'], key: { G: 'glowstone', S: 'stick' } },
  { out: 'lightning_rod', n: 1, shape: ['C', 'C', 'C'], key: { C: 'copper_ingot' } },
  { out: 'item_frame', n: 1, shape: ['SSS', 'SLS', 'SSS'], key: { S: 'stick', L: 'leather' } },
  { out: 'glow_item_frame', n: 1, items: ['item_frame', 'glow_lichen'] },
  { out: 'cake', n: 1, shape: ['MMM', 'SES', 'WWW'], key: { M: 'milk_bucket', S: 'sugar', E: 'egg', W: 'wheat' }, keep: { milk_bucket: 'bucket' } },
  { out: 'candle', n: 1, shape: ['S', 'H'], key: { S: 'string', H: 'honeycomb' } },
  { out: 'cookie', n: 8, shape: ['WCW'], key: { W: 'wheat', C: 'cocoa_beans' } },
  { out: 'arrow', n: 4, shape: ['F', 'S', 'E'], key: { F: 'flint', S: 'stick', E: 'feather' } },
  { out: 'bow', n: 1, shape: [' ST', 'S T', ' ST'], key: { S: 'stick', T: 'string' } },
  { out: 'compass', n: 1, shape: [' I ', 'IRI', ' I '], key: { I: 'iron_ingot', R: 'redstone' } },
  { out: 'clock', n: 1, shape: [' G ', 'GRG', ' G '], key: { G: 'gold_ingot', R: 'redstone' } },
  { out: 'spyglass', n: 1, shape: ['A', 'C', 'C'], key: { A: 'amethyst_shard', C: 'copper_ingot' } },
  { out: 'iron_nugget', n: 9, items: ['iron_ingot'] },
  { out: 'iron_ingot', n: 1, shape: ['NNN', 'NNN', 'NNN'], key: { N: 'iron_nugget' } },
  { out: 'gold_nugget', n: 9, items: ['gold_ingot'] },
  { out: 'gold_ingot', n: 1, shape: ['NNN', 'NNN', 'NNN'], key: { N: 'gold_nugget' } },
  { out: 'lantern', n: 1, shape: ['NNN', 'NTN', 'NNN'], key: { N: 'iron_nugget', T: 'torch' } },
  { out: 'chain', n: 1, shape: ['N', 'I', 'N'], key: { N: 'iron_nugget', I: 'iron_ingot' } },
  { out: 'redstone_block', n: 1, shape: ['RRR', 'RRR', 'RRR'], key: { R: 'redstone' } },
  { out: 'redstone', n: 9, items: ['redstone_block'] },
  // ---- 0.7: belt charms ----
  { out: 'vigor_charm', n: 1, shape: ['NNN', 'NHN', 'NNN'], key: { N: 'gold_nugget', H: 'heart_crystal' } },
  { out: 'ember_charm', n: 1, shape: ['NNN', 'NCN', 'NNN'], key: { N: 'gold_nugget', C: 'cinder_core' } },
  { out: 'tide_charm', n: 1, shape: ['NNN', 'NPN', 'NNN'], key: { N: 'gold_nugget', P: 'sea_lantern' } },
  { out: 'feather_charm', n: 1, shape: ['NFN', 'FDF', 'NFN'], key: { N: 'gold_nugget', F: 'feather', D: 'diamond' } },
  // ---- 0.6: redstone, pistons, hoppers, rails and carts ----
  { out: 'redstone_torch', n: 1, shape: ['R', 'S'], key: { R: 'redstone', S: 'stick' } },
  { out: 'lever', n: 1, shape: ['S', 'C'], key: { S: 'stick', C: 'cobblestone' } },
  { out: 'stone_button', n: 1, items: ['stone'] },
  { out: 'polished_blackstone_button', n: 1, items: ['polished_blackstone'] },
  { out: 'bamboo_button', n: 1, items: ['bamboo_planks'] },
  { out: 'stone_pressure_plate', n: 1, shape: ['SS'], key: { S: 'stone' } },
  { out: 'polished_blackstone_pressure_plate', n: 1, shape: ['SS'], key: { S: 'polished_blackstone' } },
  { out: 'bamboo_pressure_plate', n: 1, shape: ['SS'], key: { S: 'bamboo_planks' } },
  { out: 'light_weighted_pressure_plate', n: 1, shape: ['GG'], key: { G: 'gold_ingot' } },
  { out: 'heavy_weighted_pressure_plate', n: 1, shape: ['II'], key: { I: 'iron_ingot' } },
  { out: 'repeater', n: 1, shape: ['TRT', 'SSS'], key: { T: 'redstone_torch', R: 'redstone', S: 'stone' } },
  { out: 'comparator', n: 1, shape: [' T ', 'TQT', 'SSS'], key: { T: 'redstone_torch', Q: 'quartz', S: 'stone' } },
  { out: 'redstone_lamp', n: 1, shape: [' R ', 'RGR', ' R '], key: { R: 'redstone', G: 'glowstone' } },
  { out: 'piston', n: 1, shape: ['PPP', 'CIC', 'CRC'], key: { P: '#planks', C: 'cobblestone', I: 'iron_ingot', R: 'redstone' } },
  { out: 'sticky_piston', n: 1, shape: ['S', 'P'], key: { S: 'slime_ball', P: 'piston' } },
  { out: 'observer', n: 1, shape: ['CCC', 'RRQ', 'CCC'], key: { C: 'cobblestone', R: 'redstone', Q: 'quartz' } },
  { out: 'dispenser', n: 1, shape: ['CCC', 'CBC', 'CRC'], key: { C: 'cobblestone', B: 'bow', R: 'redstone' } },
  { out: 'dropper', n: 1, shape: ['CCC', 'C C', 'CRC'], key: { C: 'cobblestone', R: 'redstone' } },
  { out: 'hopper', n: 1, shape: ['I I', 'ICI', ' I '], key: { I: 'iron_ingot', C: 'chest' } },
  { out: 'daylight_detector', n: 1, shape: ['GGG', 'QQQ', 'SSS'], key: { G: 'glass', Q: 'quartz', S: '#wood_slab' } },
  { out: 'target', n: 1, shape: [' R ', 'RHR', ' R '], key: { R: 'redstone', H: 'hay_bale' } },
  { out: 'copper_bulb', n: 4, shape: [' C ', 'CGC', ' R '], key: { C: 'copper_block', G: 'glowstone', R: 'redstone' } },
  { out: 'tripwire_hook', n: 2, shape: ['I', 'S', 'P'], key: { I: 'iron_ingot', S: 'stick', P: '#planks' } },
  { out: 'rail', n: 16, shape: ['I I', 'ISI', 'I I'], key: { I: 'iron_ingot', S: 'stick' } },
  { out: 'powered_rail', n: 6, shape: ['G G', 'GSG', 'GRG'], key: { G: 'gold_ingot', S: 'stick', R: 'redstone' } },
  { out: 'detector_rail', n: 6, shape: ['I I', 'IPI', 'IRI'], key: { I: 'iron_ingot', P: 'stone_pressure_plate', R: 'redstone' } },
  { out: 'activator_rail', n: 6, shape: ['ISI', 'ITI', 'ISI'], key: { I: 'iron_ingot', S: 'stick', T: 'redstone_torch' } },
  { out: 'minecart', n: 1, shape: ['I I', 'III'], key: { I: 'iron_ingot' } },
  { out: 'chest_minecart', n: 1, shape: ['C', 'M'], key: { C: 'chest', M: 'minecart' } },
  { out: 'hopper_minecart', n: 1, shape: ['H', 'M'], key: { H: 'hopper', M: 'minecart' } },
  { out: 'furnace_minecart', n: 1, shape: ['F', 'M'], key: { F: 'furnace', M: 'minecart' } },
  { out: 'tnt_minecart', n: 1, shape: ['T', 'M'], key: { T: 'tnt', M: 'minecart' } },
  { out: 'note_block', n: 1, shape: ['PPP', 'PRP', 'PPP'], key: { P: '#planks', R: 'redstone' } },
  { out: 'tnt', n: 1, shape: ['GSG', 'SGS', 'GSG'], key: { G: 'gunpowder', S: '#sand' } },
  { out: 'cobblestone', n: 1, shape: ['SS', 'SS'], key: { S: 'loose_stones' } },
  { out: 'music_disc_ember', n: 1, shape: [' F ', 'FDF', ' F '], key: { F: 'flint', D: 'red_dye' } },
  { out: 'music_disc_tide', n: 1, shape: [' F ', 'FDF', ' F '], key: { F: 'flint', D: 'blue_dye' } },
  { out: 'music_disc_grove', n: 1, shape: [' F ', 'FDF', ' F '], key: { F: 'flint', D: 'green_dye' } },
  { out: 'music_disc_sun', n: 1, shape: [' F ', 'FDF', ' F '], key: { F: 'flint', D: 'yellow_dye' } },
  { out: 'melon_seeds', n: 1, items: ['melon_slice'] },
  { out: 'pumpkin_seeds', n: 4, items: ['carved_pumpkin'] },
  { out: 'moss_carpet', n: 3, shape: ['MM'], key: { M: 'moss_block' } },
  { out: 'packed_ice', n: 1, shape: ['III', 'III', 'III'], key: { I: 'ice' } },
  { out: 'blue_ice', n: 1, shape: ['III', 'III', 'III'], key: { I: 'packed_ice' } },
  { out: 'exposed_cut_copper', n: 4, shape: ['CC', 'CC'], key: { C: 'exposed_copper' } },
  { out: 'weathered_cut_copper', n: 4, shape: ['CC', 'CC'], key: { C: 'weathered_copper' } },
  { out: 'oxidized_cut_copper', n: 4, shape: ['CC', 'CC'], key: { C: 'oxidized_copper' } },
];
// woods: planks, and the family of each
for (const [w, L, logK, plK] of WOODS) {
  RECIPES.push({ out: plK, n: 4, items: ['#logs_' + w] });
  RECIPES.push({ out: w + '_button', n: 1, items: [plK], group: 'redstone' });
  RECIPES.push({ out: w + '_pressure_plate', n: 1, shape: ['PP'], key: { P: plK }, group: 'redstone' });
  RECIPES.push({ out: w + (STEMS.has(w) ? '_hyphae' : '_wood'), n: 3, shape: ['LL', 'LL'], key: { L: logK } });
  RECIPES.push({ out: w + '_door', n: 3, shape: ['PP', 'PP', 'PP'], key: { P: plK }, group: 'wood' });
  RECIPES.push({ out: w + '_trapdoor', n: 2, shape: ['PPP', 'PPP'], key: { P: plK }, group: 'wood' });
  RECIPES.push({ out: w + '_fence', n: 3, shape: ['PSP', 'PSP'], key: { P: plK, S: 'stick' }, group: 'wood' });
  RECIPES.push({ out: w + '_fence_gate', n: 1, shape: ['SPS', 'SPS'], key: { P: plK, S: 'stick' }, group: 'wood' });
  RECIPES.push({ out: w + '_sign', n: 3, shape: ['PPP', 'PPP', ' S '], key: { P: plK, S: 'stick' }, group: 'wood' });
}
// every stairs / slab / wall made from its block
for (const b of BLOCKS) {
  if (!b.family || !b.base) continue;
  if (b.family === 'stairs') RECIPES.push({ out: b.key, n: 4, shape: ['X  ', 'XX ', 'XXX'], key: { X: b.base }, group: 'shapes' });
  else if (b.family === 'slab') RECIPES.push({ out: b.key, n: 6, shape: ['XXX'], key: { X: b.base }, group: 'shapes' });
  else if (b.family === 'wall') RECIPES.push({ out: b.key, n: 6, shape: ['XXX', 'XXX'], key: { X: b.base }, group: 'shapes' });
}
RECIPES.push({ out: 'nether_brick_fence', n: 6, shape: ['BSB', 'BSB'], key: { B: 'nether_bricks', S: 'stick' }, group: 'shapes' });
// polished stones and bricks of the new stone types
for (const [from, to] of [['granite', 'polished_granite'], ['diorite', 'polished_diorite'], ['andesite', 'polished_andesite'], ['cobbled_slate', 'polished_slate'],
  ['polished_slate', 'slate_bricks'], ['slate_bricks', 'slate_tiles'], ['basalt', 'polished_basalt'], ['marble', 'marble_bricks'], ['limestone', 'limestone_bricks'],
  ['emberstone', 'emberstone_bricks'], ['skystone', 'skystone_bricks'], ['desert_stone', 'desert_stone_bricks']]) {
  RECIPES.push({ out: to, n: 4, shape: ['XX', 'XX'], key: { X: from } });
}
RECIPES.push({ out: 'granite', n: 1, items: ['diorite', 'quartz'] });
RECIPES.push({ out: 'diorite', n: 2, shape: ['CQ', 'QC'], key: { C: 'cobblestone', Q: 'quartz' } });
RECIPES.push({ out: 'andesite', n: 2, items: ['diorite', 'cobblestone'] });
// colours: dyes from flowers, coloured blocks from dye
const FLOWER_DYES = [['flower_red', 'red'], ['red_tulip', 'red'], ['rose_bush', 'red', 2], ['beetroot', 'red'], ['flower_yellow', 'yellow'], ['sunflower', 'yellow', 2],
  ['blue_orchid', 'light_blue'], ['allium', 'magenta'], ['lilac', 'magenta', 2], ['azure_bluet', 'light_gray'], ['oxeye_daisy', 'light_gray'], ['white_tulip', 'light_gray'],
  ['orange_tulip', 'orange'], ['pink_tulip', 'pink'], ['peony', 'pink', 2], ['cornflower', 'blue'], ['lapis_lazuli', 'blue'], ['lily_of_the_valley', 'white'],
  ['lavender', 'purple'], ['heather', 'magenta'], ['coal', 'black'], ['charcoal', 'black'], ['brown_mushroom', 'brown'], ['wheat_seeds', 'green'], ['kelp', 'green'],
  ['emerald', 'lime'], ['amethyst_shard', 'purple'], ['quartz', 'white'], ['crimson_fungus', 'red'], ['warped_fungus', 'cyan']];
for (const [src, c, n] of FLOWER_DYES) RECIPES.push({ out: c + '_dye', n: n || 1, items: [src], group: 'dye' });
for (const [a, b, out] of [['blue', 'green', 'cyan'], ['red', 'blue', 'purple'], ['green', 'white', 'lime'], ['black', 'white', 'gray'], ['gray', 'white', 'light_gray'],
  ['red', 'white', 'pink'], ['blue', 'white', 'light_blue'], ['red', 'yellow', 'orange'], ['purple', 'pink', 'magenta']]) {
  RECIPES.push({ out: out + '_dye', n: 2, items: [a + '_dye', b + '_dye'], group: 'dye' });
}
for (const [c] of COLORS) {
  const dye = c + '_dye', wool = c === 'white' ? 'wool' : c + '_wool';
  if (c !== 'white') RECIPES.push({ out: wool, n: 1, items: ['wool', dye], group: 'color' });
  RECIPES.push({ out: c + '_carpet', n: 3, shape: ['WW'], key: { W: wool }, group: 'color' });
  RECIPES.push({ out: c + '_terracotta', n: 8, shape: ['TTT', 'TDT', 'TTT'], key: { T: 'terracotta', D: dye }, group: 'color' });
  RECIPES.push({ out: c + '_stained_glass', n: 8, shape: ['GGG', 'GDG', 'GGG'], key: { G: 'glass', D: dye }, group: 'color' });
  RECIPES.push({ out: c + '_stained_glass_pane', n: 16, shape: ['GGG', 'GGG'], key: { G: c + '_stained_glass' }, group: 'color' });
  RECIPES.push({ out: c + '_concrete_powder', n: 8, items: [dye, 'sand', 'sand', 'sand', 'sand', 'gravel', 'gravel', 'gravel', 'gravel'], group: 'color' });
  RECIPES.push({ out: c === 'red' ? 'bed' : c + '_bed', n: 1, shape: ['WWW', 'PPP'], key: { W: wool, P: '#planks' }, group: 'color' });
  RECIPES.push({ out: c + '_candle', n: 1, items: ['candle', dye], group: 'color' });
}
// tools & armor
const TOOL_SHAPES = {
  pickaxe: ['MMM', ' S ', ' S '], axe: ['MM', 'MS', ' S'], shovel: ['M', 'S', 'S'], sword: ['M', 'M', 'S'], hoe: ['MM', ' S', ' S'],
};
const ARMOR_SHAPES = [['MMM', 'M M'], ['M M', 'MMM', 'MMM'], ['MMM', 'M M', 'M M'], ['M M', 'M M']];
for (const [tk, t] of Object.entries(TIERS)) {
  for (const kk of Object.keys(TOOL_KINDS)) RECIPES.push({ out: tk + '_' + kk, n: 1, shape: TOOL_SHAPES[kk], key: { M: t.mat, S: 'stick' }, group: 'tools' });
}
for (const [mk, m] of Object.entries(ARMOR_MATS)) {
  for (const p of ARMOR_PIECES) RECIPES.push({ out: mk + '_' + p.key, n: 1, shape: ARMOR_SHAPES[p.slot], key: { M: m.mat }, group: 'armor' });
}
// Every recipe gets its size worked out (and its place in the list) before it can be matched. Recipes
// added later on by other parts of the game (furniture, the saddle, the fishing rod, the ship...) are
// prepared the first time anything looks at the list after they arrive.
function prepRecipe(r, i) {
  r.idx = i;
  if (!itemDef(r.out)) console.warn('Recipe output missing', r.out);
  const keys = r.shape ? Object.values(r.key) : r.items;
  for (const k of keys) if (!k.startsWith('#') && !itemDef(k)) console.warn('Recipe ingredient missing', r.out, k);
  if (r.shape) { r.h = r.shape.length; r.w = Math.max(...r.shape.map(x => x.length)); r.shape = r.shape.map(x => x.padEnd(r.w, ' ')); }
  else { r.h = r.w = Math.ceil(Math.sqrt(r.items.length)); }
}
function prepRecipes() {
  if (prepRecipes.n === RECIPES.length) return;
  for (let i = 0; i < RECIPES.length; i++) if (RECIPES[i].w === undefined || RECIPES[i].idx !== i) prepRecipe(RECIPES[i], i);
  prepRecipes.n = RECIPES.length;
}
prepRecipes();

// Furnace: what smelts into what, and how long fuel burns (in items smelted).
const SMELTING = {
  iron_ore: 'iron_ingot', gold_ore: 'gold_ingot', copper_ore: 'copper_ingot', tin_ore: 'tin_ingot',
  crushed_iron: 'iron_ingot', crushed_gold: 'gold_ingot', crushed_copper: 'copper_ingot', crushed_tin: 'tin_ingot',
  sand: 'glass', red_sand: 'glass', silver_sand: 'glass', cobblestone: 'stone', stone: 'smooth_stone', cobbled_slate: 'slate', sandstone: 'smooth_sandstone',
  stone_bricks: 'cracked_stone_bricks', clay: 'terracotta', clay_ball: 'brick', cactus: 'green_dye', cinderite_ore: 'cinderite_shard', quartz_ore: 'quartz',
  raw_meat: 'cooked_meat', venison: 'cooked_venison', rabbit: 'cooked_rabbit', potato: 'baked_potato', kelp: 'dried_kelp', flour: 'bread',
  emberstone: 'nether_bricks',
  basalt: 'smooth_basalt', blackstone_bricks: 'cracked_blackstone_bricks', nether_bricks: 'cracked_nether_bricks', quartz_block: 'smooth_quartz',
  red_sandstone: 'smooth_red_sandstone', slate_bricks: 'cracked_slate_bricks', slate_tiles: 'cracked_slate_tiles', desert_cobble: 'desert_stone',
  netherrack: 'nether_brick', ancient_debris: 'cinderite_shard', nether_gold_ore: 'gold_ingot', redstone_ore: 'redstone', sea_pickle: 'lime_dye',
  beef: 'cooked_beef', porkchop: 'cooked_porkchop', chicken: 'cooked_chicken', mutton: 'cooked_mutton',
};
for (const l of TAGS['#log']) SMELTING[l] = 'charcoal';
for (const [c] of COLORS) SMELTING[c + '_terracotta'] = c + '_glazed_terracotta';
const SMELT_TIME = 5; // seconds per item
const FOOD_SMELTS = new Set(['raw_meat', 'venison', 'rabbit', 'potato', 'kelp', 'flour', 'beef', 'porkchop', 'chicken', 'mutton']);
const ORE_SMELTS = new Set(['iron_ore', 'gold_ore', 'copper_ore', 'tin_ore', 'crushed_iron', 'crushed_gold', 'crushed_copper', 'crushed_tin', 'cinderite_ore', 'quartz_ore', 'nether_gold_ore', 'redstone_ore', 'ancient_debris']);
function fuelValue(key) { const d = itemDef(key); return d && d.fuel ? d.fuel : 0; }

// Machines turned by windmills and waterwheels.
const MILLING = {
  iron_ore: ['crushed_iron', 2], gold_ore: ['crushed_gold', 2], copper_ore: ['crushed_copper', 2], tin_ore: ['crushed_tin', 2],
  wheat: ['flour', 1], cobblestone: ['gravel', 1], gravel: ['sand', 1], sandstone: ['sand', 4],
  sugar_cane: ['sugar', 2], beetroot: ['red_dye', 2], cactus: ['green_dye', 2],
  bone: ['bone_meal', 5], cocoa_beans: ['brown_dye', 2], netherrack: ['gravel', 1], redstone_ore: ['redstone', 6],
};
for (const [src, c, n] of FLOWER_DYES) if (!MILLING[src] && BLOCKS[B[src]] && BLOCKS[B[src]].flower) MILLING[src] = [c + '_dye', (n || 1) * 2];
const SAWING = {};
for (const [w, L, logK, plK] of WOODS) for (const l of TAGS['#logs_' + w]) SAWING[l] = [plK, 6];
for (const p of TAGS['#planks']) SAWING[p] = ['stick', 6];
SAWING.bamboo_block = ['bamboo_planks', 4]; SAWING.stripped_bamboo_block = ['bamboo_planks', 4];

// Stonecutter: one block of stone into its stairs, slabs (two), walls and bricks.
function stonecutterOptions(id) {
  const out = [];
  for (const b of BLOCKS) if (b.base === id && b.family && b.family !== 'fence' && b.family !== 'gate') out.push([b.key, b.family === 'slab' ? 2 : 1]);
  for (const r of RECIPES) if (r.shape && r.n === 4 && r.w === 2 && r.h === 2 && Object.keys(r.key).length === 1 && r.key[Object.keys(r.key)[0]] === id && BLOCKS[B[r.out]]) out.push([r.out, 1]);
  return out;
}

function tagMatch(want, id) { return want.startsWith('#') ? (TAGS[want] || []).includes(id) : want === id; }

// Find the recipe that the grid (W x W array of stacks) currently spells.
function matchGrid(slots, W) {
  prepRecipes();
  let x0 = W, y0 = W, x1 = -1, y1 = -1, count = 0;
  for (let i = 0; i < W * W; i++) if (slots[i]) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); count++; }
  if (!count) return null;
  // two worn tools of the same kind combine into one repaired tool (the classic way)
  if (count === 2) {
    const ts = slots.filter(Boolean);
    const d = itemDef(ts[0].id);
    if (ts[0].id === ts[1].id && d && d.tool && d.maxStack === 1) {
      const dur = d.tool.durability, left = (dur - (ts[0].d || 0)) + (dur - (ts[1].d || 0)) + Math.floor(dur * 0.05);
      const gx = Math.max(ts[0].gx || 0, ts[1].gx || 0);
      return { out: ts[0].id, n: 1, repair: Math.max(0, dur - left), idx: -1, w: 1, h: 1, extra: gx ? { gx } : undefined };
    }
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const at = (x, y) => slots[(y0 + y) * W + x0 + x];
  for (const r of RECIPES) {
    if (r.shape) {
      if (r.w !== bw || r.h !== bh) continue;
      for (const mirror of [false, true]) {
        let ok = true;
        for (let y = 0; y < bh && ok; y++) for (let x = 0; x < bw && ok; x++) {
          const ch = r.shape[y][mirror ? bw - 1 - x : x], s = at(x, y);
          if (ch === ' ') { if (s) ok = false; }
          else if (!s || !tagMatch(r.key[ch], s.id)) ok = false;
        }
        if (ok) return r;
      }
    } else if (r.items.length === count) {
      const left = r.items.slice();
      let ok = true;
      for (let i = 0; i < W * W && ok; i++) {
        const s = slots[i]; if (!s) continue;
        const k = left.findIndex(want => tagMatch(want, s.id));
        if (k < 0) ok = false; else left.splice(k, 1);
      }
      if (ok && !left.length) return r;
    }
  }
  return null;
}
// Ingredient list for display: [[itemKeyOrTag, count], ...]
function recipeIngredients(r) {
  const c = {};
  if (r.shape) for (const row of r.shape) for (const ch of row) { if (ch !== ' ') c[r.key[ch]] = (c[r.key[ch]] || 0) + 1; }
  else for (const k of r.items) c[k] = (c[k] || 0) + 1;
  return Object.entries(c);
}
// The recipe as a W x W cell list of wanted ingredients (null = empty).
function recipeLayout(r, W) {
  const cells = new Array(W * W).fill(null);
  if (r.shape) { for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const ch = r.shape[y][x]; if (ch !== ' ') cells[y * W + x] = r.key[ch]; } }
  else r.items.forEach((k, i) => { cells[(Math.floor(i / r.w)) * W + (i % r.w)] = k; });
  return cells;
}
