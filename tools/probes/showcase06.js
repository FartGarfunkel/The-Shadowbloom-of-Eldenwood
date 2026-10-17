// Visual check of the 0.6 redstone parts, pistons, hoppers, rails and carts.
// Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/showcase06.js flat-2
const X = Math.floor(p.x) + 2, Z = Math.floor(p.z) - 4, Y = Math.floor(p.y);
for (let x = X - 8; x < X + 22; x++) for (let z = Z - 16; z < Z + 14; z++) { for (let y = Y - 1; y < Y + 12; y++) w.setBlock(x, y, z, y === Y - 1 ? B.smooth_stone : 0, 0, { quiet: true }); }
const S = (dx, dy, dz, k, m = 0) => w.setBlock(X + dx, Y + dy, Z + dz, B[k], m);
// row 1 (z 0): a dust circuit — lever, dust round a corner, repeater, lamp; and an unpowered twin
S(0, 0, 0, 'lever', 8); for (let i = 1; i <= 4; i++) S(i, 0, 0, 'redstone_wire'); S(4, 0, -1, 'redstone_wire'); S(4, 0, -2, 'redstone_wire');
S(5, 0, -2, 'repeater', 1 | (2 << 2)); S(6, 0, -2, 'redstone_lamp');
S(8, 0, 0, 'lever', 0); for (let i = 9; i <= 11; i++) S(i, 0, 0, 'redstone_wire'); S(12, 0, 0, 'redstone_lamp');
// dust up a step, torches on and off, a comparator, a target
S(0, 0, 3, 'redstone_block'); S(1, 0, 3, 'redstone_wire'); S(2, 0, 3, 'stone'); S(2, 1, 3, 'redstone_wire'); S(3, 1, 3, 'stone'); S(3, 2, 3, 'redstone_wire');
S(5, 0, 3, 'stone'); S(5, 1, 3, 'redstone_torch', 0); S(6, 0, 3, 'redstone_torch', 0); S(7, 0, 3, 'stone'); S(7, 1, 3, 'redstone_torch_off', 0);
S(8, 0, 3, 'comparator', 1 | 8 | (9 << 4)); S(9, 0, 3, 'comparator', 3 | 4); S(10, 0, 3, 'target'); S(11, 0, 3, 'daylight_detector', 8); S(12, 0, 3, 'daylight_detector', 16);
// row 2 (z -5): pistons, observer, dispenser, dropper, hopper, bulbs, buttons and plates
S(0, 0, -5, 'piston', 5); S(1, 0, -5, 'piston_extended', 1); S(1, 1, -5, 'piston_head', 1); S(3, 0, -5, 'sticky_piston', 1); S(4, 0, -5, 'sticky_piston_extended', 5); S(5, 0, -5, 'piston_head', 5 | 8);
S(7, 0, -5, 'observer', 3); S(8, 0, -5, 'observer', 5 | 8); S(9, 0, -5, 'dispenser', 3); S(10, 0, -5, 'dropper', 1); S(11, 0, -5, 'hopper', 0); S(12, 0, -5, 'hopper', 5);
S(13, 0, -5, 'copper_bulb'); S(14, 0, -5, 'copper_bulb_lit');
S(0, 0, -8, 'stone_button', 0); S(1, 0, -8, 'oak_button', 0 | 16); S(2, 0, -8, 'stone_pressure_plate'); S(3, 0, -8, 'oak_pressure_plate', 15); S(4, 0, -8, 'light_weighted_pressure_plate'); S(5, 0, -8, 'heavy_weighted_pressure_plate');
S(7, 0, -9, 'stone'); S(7, 0, -8, 'stone_button', 2); S(8, 0, -9, 'stone'); S(8, 0, -8, 'lever', 2 | 8);
S(10, 0, -9, 'planks'); S(10, 0, -8, 'tripwire_hook', 0 | 4); S(11, 0, -8, 'tripwire', 2); S(12, 0, -8, 'tripwire', 2); S(13, 0, -8, 'tripwire_hook', 2 | 4); S(13, 0, -7, 'planks');
// row 3 (z -12): rails — straight, curve, slope, powered, detector, activator — and the carts
const rails = [['rail', 1], ['rail', 1], ['rail', 7], ['rail', 0]];
S(0, 0, -12, 'rail', 1); S(1, 0, -12, 'rail', 1); S(2, 0, -12, 'rail', 7); S(2, 0, -13, 'rail', 0); S(2, 0, -14, 'rail', 9); S(3, 0, -14, 'rail', 2); S(4, 0, -14, 'stone'); S(4, 1, -14, 'rail', 1);
S(6, 0, -12, 'powered_rail', 1); S(7, 0, -12, 'powered_rail', 1 | 8); S(8, 0, -12, 'detector_rail', 1); S(9, 0, -12, 'detector_rail', 1 | 8); S(10, 0, -12, 'activator_rail', 1); S(11, 0, -12, 'activator_rail', 1 | 8);
void rails;
for (let i = 0; i < 5; i++) S(13 + i, 0, -12, 'rail', 1);
const kinds = ['minecart', 'chest', 'hopper', 'furnace', 'tnt'];
kinds.forEach((k, i) => g.placeCart(k, X + 13 + i, Y, Z - 12, 5));
for (const c of w.chunks.values()) { c.needsMesh = true; w.meshSet.add(c); }
g.meta.time = 300; g.meta.mode = 'creative';
p.x = X + 6.5; p.y = Y + 3.2; p.z = Z + 7.5; p.yaw = 0.0; p.pitch = -0.45; p.flying = true; p.vx = p.vy = p.vz = 0;
window.__P = [X, Y, Z];
return [X, Y, Z];
//@ wait 6000
//@ shot s6a
const [X, Y, Z] = window.__P; p.x = X + 6.5; p.y = Y + 4.5; p.z = Z - 1.5; p.pitch = -0.6; p.vx = p.vy = p.vz = 0; return 1;
//@ wait 5000
//@ shot s6b
const [X, Y, Z] = window.__P; p.x = X + 9.5; p.y = Y + 3; p.z = Z - 6.5; p.pitch = -0.5; p.vx = p.vy = p.vz = 0; return 1;
//@ wait 5000
//@ shot s6c
