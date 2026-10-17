// The 0.8.2 texture repaint in the world: a landscape view, then a little gallery of blocks.
// Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/tex082.js probe-1
g.rules().daylightCycle = false; g.rules().weatherCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
if (g.weather) { g.meta.weather = { kind: 'clear', left: 99999 }; }
g.settings.viewBob = false;
p.pitch = -0.25; p.yaw = 0.8;
//@ wait 2500
//@ shot tex_land_a
p.yaw = 2.6; p.pitch = -0.35;
//@ wait 1500
//@ shot tex_land_b
const X = Math.floor(p.x), Y = Math.floor(p.y), Z = Math.floor(p.z) - 5;
for (let x = X - 9; x < X + 10; x++) for (let z = Z - 6; z < Z + 9; z++) { for (let y = Y; y < Y + 9; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, (x + z) % 7 === 0 ? B.dirt : B.grass, 0, { quiet: true }); }
const S = (dx, dy, dz, k, m = 0) => { if (B[k] === undefined) return; w.setBlock(X + dx, Y + dy, Z + dz, B[k], m, { quiet: true }); };
const row1 = ['stone', 'cobblestone', 'mossy_cobblestone', 'stone_bricks', 'mossy_stone_bricks', 'bricks', 'planks', 'spruce_planks', 'birch_planks', 'dark_oak_planks', 'sand', 'gravel', 'dirt', 'granite', 'diorite', 'andesite'];
const row2 = ['coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'emerald_ore', 'lapis_ore', 'copper_ore', 'iron_block', 'gold_block', 'diamond_block', 'glass', 'white_wool', 'red_wool', 'blue_wool', 'bookshelf', 'tnt'];
row1.forEach((k, i) => { S(i - 8, 0, -4, k); S(i - 8, 1, -4, k); });
row2.forEach((k, i) => { S(i - 8, 2, -4, k); S(i - 8, 3, -4, k); });
// a nook: log pillars, leaves, a work corner
for (let y = 0; y < 4; y++) { S(-4, y, 2, 'log'); S(3, y, 2, 'log'); S(-4, y, 6, 'birch_log'); S(3, y, 6, 'spruce_log'); }
S(-2, 0, 1, 'crafting_table'); S(-1, 0, 1, 'furnace', 3); S(0, 0, 1, 'chest', 3); S(1, 0, 1, 'bookshelf');
S(2, 0, 1, 'torch'); S(-3, 0, 1, 'lit_furnace', 3);
for (let x = -6; x < -3; x++) for (let y = 3; y < 6; y++) S(x, y, 4, 'leaves');
for (let x = 4; x < 7; x++) for (let y = 2; y < 5; y++) S(x, y, 4, 'spruce_leaves');
S(5, 0, 0, 'water'); S(6, 0, 0, 'water'); S(5, 0, -1, 'lava');
for (const c of w.chunks.values()) { c.needsMesh = true; w.meshSet.add(c); }
p.x = X + 0.5; p.y = Y; p.z = Z + 4.5; p.yaw = 0; p.pitch = -0.12;
window.__T = { X, Y, Z };
return [B.lit_furnace !== undefined, B.log !== undefined, B.birch_log !== undefined];
//@ wait 2500
//@ shot tex_wall
const { X, Y, Z } = window.__T; p.z = Z + 5.5; p.x = X + 0.5; p.yaw = Math.PI; p.pitch = -0.3;
//@ wait 1500
//@ shot tex_nook
const { X, Z } = window.__T; p.x = X - 2.5; p.z = Z - 2; p.yaw = 0; p.pitch = 0;
//@ wait 1200
//@ shot tex_close
