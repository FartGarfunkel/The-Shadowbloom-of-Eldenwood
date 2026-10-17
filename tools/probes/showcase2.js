const X = Math.floor(p.x) + 2, Z = Math.floor(p.z) - 4, Y = Math.floor(p.y);
for (let x = X - 8; x < X + 20; x++) for (let z = Z - 14; z < Z + 14; z++) { for (let y = Y - 1; y < Y + 22; y++) w.setBlock(x, y, z, y === Y - 1 ? B.grass : 0, 0, { quiet: true }); for (let y = Y - 4; y < Y - 1; y++) w.setBlock(x, y, z, B.dirt, 0, { quiet: true }); }
const S = (dx, dy, dz, k, m = 0) => w.setBlock(X + dx, Y + dy, Z + dz, B[k], m, { quiet: true });
const E = (dx, dy, dz, e) => w.setEntity(X + dx, Y + dy, Z + dz, e);
// row 1: candles, cake, composter, lectern, anvils, grindstone, pot
S(0, 0, 0, 'red_candle', 4 | 3); S(1, 0, 0, 'candle', 4 | 0); S(2, 0, 0, 'blue_candle', 1); S(3, 0, 0, 'cake', 2); S(4, 0, 0, 'composter', 5); S(5, 0, 0, 'composter', 8);
S(6, 0, 0, 'lectern', 2); E(6, 0, 0, { type: 'lectern', book: true }); S(7, 0, 0, 'anvil', 1); S(8, 0, 0, 'damaged_anvil', 0); S(9, 0, 0, 'grindstone', 0); S(10, 0, 0, 'decorated_pot');
// row 2: stations and new cubes
const cubes = ['jukebox', 'ender_chest', 'smithing_table', 'loom', 'cartography_table', 'fletching_table', 'bee_nest', 'beehive', 'honey_block', 'slime_block', 'honeycomb_block', 'ochre_froglight', 'verdant_froglight', 'pearlescent_froglight', 'copper_grate', 'chiseled_copper'];
cubes.forEach((k, i) => S(i - 2, 0, -3, k, k === 'ender_chest' || k.startsWith('bee') || k.includes('table') || k === 'loom' ? 2 : 0));
// row 3: rods, scaffolding, item frame, bamboo, sea pickle, cocoa, petals, lichen, dripstone
S(0, 0, -6, 'end_rod'); S(1, 0, -6, 'lightning_rod'); S(2, 0, -6, 'scaffolding'); S(2, 1, -6, 'scaffolding'); S(3, 0, -6, 'scaffolding');
S(5, 0, -7, 'stone'); S(5, 1, -7, 'stone'); S(5, 0, -6, 'item_frame', 0); E(5, 0, -6, { type: 'frame', item: { id: 'diamond_sword', n: 1 }, rot: 1 }); S(5, 1, -6, 'glow_item_frame', 0); E(5, 1, -6, { type: 'frame', item: { id: 'glowstone', n: 1 }, rot: 0 });
for (let k = 0; k < 6; k++) S(7, k, -6, 'bamboo');
S(8, 0, -6, 'sea_pickle', 3); S(10, 0, -7, 'jungle_log'); S(10, 1, -7, 'jungle_log'); S(10, 0, -6, 'cocoa', 2); S(10, 1, -6, 'cocoa', 0);
S(12, 0, -6, 'pink_petals'); S(13, 0, -6, 'pink_petals'); S(12, 0, -7, 'stone'); S(12, 1, -7, 'glow_lichen', 0);
S(14, 2, -6, 'dripstone_block'); S(14, 1, -6, 'pointed_dripstone', 1); S(14, 0, -6, 'pointed_dripstone', 0);
// row 4: plants and crops
const plants = ['bamboo', 'torchflower', 'azalea', 'flowering_azalea', 'crimson_roots', 'warped_roots', 'nether_sprouts', 'dry_grass', 'marram_grass', 'jungle_grass', 'small_amethyst_bud', 'large_amethyst_bud', 'spore_blossom'];
plants.forEach((k, i) => S(i - 2, 0, -9, k));
S(12, 0, -9, 'cattail', 0); S(12, 1, -9, 'cattail', 1); S(13, 0, -9, 'pitcher_plant', 0); S(13, 1, -9, 'pitcher_plant', 1);
// new stone samples on a wall
const stones = ['netherrack', 'soul_sand', 'crimson_nylium', 'warped_nylium', 'shroomlight', 'ancient_debris', 'bone_block', 'polished_tuff', 'tuff_bricks', 'polished_blackstone', 'gilded_blackstone', 'smooth_quartz', 'desert_sandstone', 'silver_sandstone', 'obsidian_bricks', 'bamboo_planks', 'bamboo_mosaic', 'pine_planks', 'aspen_planks', 'dirt_with_dry_grass', 'peat', 'redstone_ore'];
stones.forEach((k, i) => S(-4 + (i % 11), 1 + Math.floor(i / 11), -12, k));
for (let i = 0; i < 11; i++) S(-4 + i, 0, -12, 'stone_bricks');
for (const c of w.chunks.values()) { c.needsMesh = true; w.meshSet.add(c); }
g.meta.time = 300; g.meta.mode = 'creative';
p.x = X + 4.5; p.y = Y + 2.6; p.z = Z + 5.5; p.yaw = 0.03; p.pitch = -0.5; p.flying = true; p.vx = p.vy = p.vz = 0;
window.__P = [X, Y, Z];
return [X, Y, Z];
//@ wait 5000
//@ shot n1
const [X1, Y1, Z1] = window.__P; p.x = X1 + 6.5; p.y = Y1 + 1.6; p.z = Z1 + -1.5; p.yaw = 0.03; p.pitch = -0.25;
return 1;
//@ wait 3500
//@ shot n2
const [X2, Y2, Z2] = window.__P; p.x = X2 + 4.5; p.y = Y2 + 1.4; p.z = Z2 - 4; p.yaw = 0.03; p.pitch = -0.2;
return 1;
//@ wait 3500
//@ shot n3
g.meta.time = 900;
return 1;
//@ wait 3500
//@ shot n4
