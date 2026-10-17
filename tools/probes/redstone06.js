// Functional checks for 0.6 redstone, pistons, hoppers and rails.
// Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/redstone06.js flat-2
const X = Math.floor(p.x) + 3, Z = Math.floor(p.z) - 8, Y = Math.floor(p.y);
for (let x = X - 2; x < X + 30; x++) for (let z = Z - 2; z < Z + 24; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.stone, 0, { quiet: true }); }
window.__T = { X, Y, Z };
const run = (n) => { for (let i = 0; i < n; i++) { g.rs.step(); g.updateEntities(0.05); } };
const set = (x, y, z, k, m = 0) => w.setBlock(x, y, z, B[k], m);
const key = (x, y, z) => D.BLOCKS[w.getBlock(x, y, z)].key;
const R = {};
// 1. lever -> 6 dust -> lamp
set(X, Y, Z, 'lever', 0);
for (let i = 1; i <= 6; i++) set(X + i, Y, Z, 'redstone_wire');
set(X + 7, Y, Z, 'redstone_lamp');
run(4);
R.lampOffAtStart = key(X + 7, Y, Z);
w.setBlock(X, Y, Z, B.lever, 8); run(4);
R.dust = [1, 2, 3, 4, 5, 6].map(i => w.getMeta(X + i, Y, Z) & 15);
R.lampOn = key(X + 7, Y, Z);
w.setBlock(X, Y, Z, B.lever, 0); run(2); R.lampStill = key(X + 7, Y, Z); run(6); R.lampOff = key(X + 7, Y, Z);
// 2. torch inverter: lever powers a block, the torch on its side goes out
set(X, Y, Z + 2, 'stone'); set(X - 1, Y, Z + 2, 'lever', 2 + 1); // wall lever on the west side, fixed to the block east of it
set(X + 1, Y, Z + 2, 'redstone_torch', 1);                      // torch on the east face (hangs on the block to its west)
run(4); R.torchBefore = key(X + 1, Y, Z + 2);
w.setBlock(X - 1, Y, Z + 2, B.lever, (2 + 1) | 8); run(4); R.torchAfter = key(X + 1, Y, Z + 2);
// 3. repeater: delay and pulse
set(X, Y, Z + 4, 'lever', 0); set(X + 1, Y, Z + 4, 'repeater', 1 | (3 << 2)); set(X + 2, Y, Z + 4, 'redstone_lamp');   // facing east, 4 ticks
run(2); w.setBlock(X, Y, Z + 4, B.lever, 8); run(4); R.repEarly = key(X + 2, Y, Z + 4); run(8); R.repLate = key(X + 2, Y, Z + 4);
// 4. comparator reading a chest
set(X, Y, Z + 6, 'chest'); const ce = w.getEntity(X, Y, Z + 6, () => ({ type: 'chest', items: new Array(27).fill(null) }));
ce.items[0] = D.mkStack('dirt', 64); ce.items[1] = D.mkStack('dirt', 64);
set(X + 1, Y, Z + 6, 'comparator', 1); set(X + 2, Y, Z + 6, 'redstone_wire');
run(6); R.comparatorOut = (w.getMeta(X + 1, Y, Z + 6) >> 4) & 15; R.comparatorDust = w.getMeta(X + 2, Y, Z + 6) & 15;
// 5. piston pushes three blocks; sticky piston pulls one back
set(X, Y, Z + 8, 'piston', 5); set(X + 1, Y, Z + 8, 'cobblestone'); set(X + 2, Y, Z + 8, 'oak_planks' in B ? 'oak_planks' : 'planks'); set(X + 3, Y, Z + 8, 'glass');
set(X, Y, Z + 9, 'redstone_block'); run(10);
R.pushed = [0, 1, 2, 3, 4].map(i => key(X + i, Y, Z + 8));
w.setBlock(X, Y, Z + 9, 0); run(10);
R.retracted = [0, 1, 2, 3, 4].map(i => key(X + i, Y, Z + 8));
// (raised a block so the slime doesn't try to drag the floor along)
set(X, Y + 1, Z + 11, 'sticky_piston', 5); set(X + 1, Y + 1, Z + 11, 'slime_block'); set(X + 1, Y + 2, Z + 11, 'cobblestone');
set(X, Y + 1, Z + 12, 'redstone_block'); run(10);
R.stickyOut = [key(X + 1, Y + 1, Z + 11), key(X + 2, Y + 1, Z + 11), key(X + 2, Y + 2, Z + 11)];
w.setBlock(X, Y + 1, Z + 12, 0); run(10);
R.stickyBack = [key(X + 1, Y + 1, Z + 11), key(X + 2, Y + 1, Z + 11), key(X + 1, Y + 2, Z + 11)];
// 6. hopper moves items chest -> hopper -> chest
set(X + 10, Y + 1, Z, 'chest'); const top = w.getEntity(X + 10, Y + 1, Z, () => ({ type: 'chest', items: new Array(27).fill(null) })); top.items[0] = D.mkStack('cobblestone', 10);
set(X + 10, Y, Z, 'hopper', 5); set(X + 11, Y, Z, 'chest');
run(100);
const bot = w.getEntity(X + 11, Y, Z);
R.hopper = { top: top.items[0] && top.items[0].n, side: bot && bot.items && bot.items[0] && bot.items[0].n };
// 7. dropper into a chest, dispenser shoots an arrow
set(X + 10, Y, Z + 3, 'dropper', 5); set(X + 11, Y, Z + 3, 'chest');
const de = g.rs.inv(X + 10, Y, Z + 3); de.items[0] = D.mkStack('iron_ingot', 3);
set(X + 10, Y + 1, Z + 3, 'stone_button', 0); w.setBlock(X + 10, Y + 1, Z + 3, B.stone_button, 8); g.rs.schedule(X + 10, Y + 1, Z + 3, 20, 'button');
run(12);
const dc = w.getEntity(X + 11, Y, Z + 3);
R.dropper = dc && dc.items && dc.items[0] ? dc.items[0].n : 0;
run(20); R.buttonReleased = (w.getMeta(X + 10, Y + 1, Z + 3) & 8) === 0;
set(X + 10, Y, Z + 5, 'dispenser', 5); const di = g.rs.inv(X + 10, Y, Z + 5); di.items[4] = D.mkStack('arrow', 5);
const arrowsBefore = g.entities.filter(e => e.constructor.name === 'Arrow').length;
set(X + 10, Y, Z + 6, 'redstone_block'); run(6);
R.dispenser = { arrowsLeft: di.items[4] && di.items[4].n, arrowEntities: g.entities.filter(e => e.constructor.name === 'Arrow').length - arrowsBefore };
// 8. door opened by redstone
set(X + 14, Y, Z, 'iron_door', 0); set(X + 14, Y + 1, Z, 'iron_door', 16);
set(X + 15, Y, Z, 'redstone_block'); run(4);
R.doorOpen = !!(w.getMeta(X + 14, Y, Z) & 4) && !!(w.getMeta(X + 14, Y + 1, Z) & 4);
w.setBlock(X + 15, Y, Z, 0); run(4); R.doorClosed = !(w.getMeta(X + 14, Y, Z) & 4);
// 9. observer pulses when the block in front changes
set(X + 14, Y, Z + 4, 'observer', 4);  // looks west at X+13
set(X + 15, Y, Z + 4, 'redstone_lamp');  // its back (east)
run(4); set(X + 13, Y, Z + 4, 'dirt'); run(2); R.obsPulse = (w.getMeta(X + 14, Y, Z + 4) & 8) ? 1 : 0; R.obsLamp = key(X + 15, Y, Z + 4);
run(10); R.obsAfter = (w.getMeta(X + 14, Y, Z + 4) & 8) ? 1 : 0;
// 10. pressure plate under a dropped item (wooden plate)
set(X + 14, Y, Z + 7, 'oak_pressure_plate'); set(X + 15, Y, Z + 7, 'redstone_lamp');
g.dropItem(D.mkStack('dirt', 1), X + 14.5, Y + 0.3, Z + 7.5, false);
for (let i = 0; i < 30; i++) { g.updateEntities(0.05); g.rs.step(); }
R.plate = w.getMeta(X + 14, Y, Z + 7) & 15; R.plateLamp = key(X + 15, Y, Z + 7);
// 11. rails: an L turns a corner, a step makes a slope
const lp2 = lp;
const placeRail = (x, y, z) => { const h = { x, y: y - 1, z, nx: 0, ny: 1, nz: 0, id: w.getBlock(x, y - 1, z), dist: 3 }; p.inv.main.slots[0] = D.mkStack('rail', 16); p.inv.selected = 0; lp2.placeBlock(h, D.itemDef('rail'), p.inv.main.slots[0]); };
for (let i = 0; i < 4; i++) placeRail(X + 18, Y, Z + i);
for (let i = 1; i < 4; i++) placeRail(X + 18 + i, Y, Z + 3);
set(X + 22, Y, Z + 3, 'stone'); placeRail(X + 22, Y + 1, Z + 3);
R.rails = [[X + 18, Y, Z], [X + 18, Y, Z + 3], [X + 19, Y, Z + 3], [X + 21, Y, Z + 3], [X + 22, Y + 1, Z + 3]].map(([x, y, z]) => key(x, y, z) + ':' + (w.getMeta(x, y, z) & 15));
// 12. a cart on powered rails runs to a detector rail
for (let i = 0; i < 12; i++) set(X + 18 + i, Y, Z + 8, i < 3 ? 'powered_rail' : i === 9 ? 'detector_rail' : 'rail', 1);
for (let i = 0; i < 3; i++) set(X + 18 + i, Y - 1, Z + 8, 'redstone_block');
set(X + 17, Y, Z + 8, 'stone'); set(X + 30, Y, Z + 8, 'stone');
run(4);
R.poweredRail = w.getMeta(X + 18, Y, Z + 8) & 8;
const cart = g.placeCart('minecart', X + 18, Y, Z + 8, 5);
window.__cart = cart;
let det = 0; for (let i = 0; i < 40; i++) { g.updateEntities(0.05); g.rs.step(); det |= w.getMeta(X + 27, Y, Z + 8) & 8; }
R.detectorSaw = det; R.cart = { x: +cart.x.toFixed(2), vx: +cart.vx.toFixed(2), onRail: cart.onRail };
return R;
//@ wait 200
const cart = window.__cart, T = window.__T;
for (let i = 0; i < 60; i++) { g.updateEntities(0.05); g.rs.step(); }
return { cartX: +cart.x.toFixed(2), cartY: +cart.y.toFixed(2), vx: +cart.vx.toFixed(2), detector: w.getMeta(T.X + 27, T.Y, T.Z + 8) & 8 };
//@ wait 100
const T = window.__T;
// 13. daylight detector by day, note block on redstone
w.setBlock(T.X + 2, T.Y, T.Z + 20, B.daylight_detector, 0); for (let i = 0; i < 40; i++) g.rs.step();
const day = w.getMeta(T.X + 2, T.Y, T.Z + 20) & 15;
return { daylight: day, errors: [] };
//@ shot rs1
p.x = window.__T.X + 6; p.z = window.__T.Z + 16; p.y = window.__T.Y + 6; p.pitch = -0.75; p.yaw = 0; return 1;
//@ wait 4000
//@ shot rs2
