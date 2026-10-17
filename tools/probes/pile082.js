// Ground storage: ingots, a sword, bread and stone set down in the four spots of one block.
// Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/pile082.js flat-2
g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
const X = Math.floor(p.x), Y = Math.floor(p.y), Z = Math.floor(p.z) - 2;
for (let x = X - 3; x < X + 4; x++) for (let z = Z - 3; z < Z + 4; z++) { for (let y = Y; y < Y + 4; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.planks, 0, { quiet: true }); }
w.setBlock(X, Y, Z, B.item_pile); w.setEntity(X, Y, Z, { type: 'pile', items: [{ id: 'iron_ingot', n: 40 }, { id: 'iron_sword', n: 1 }, { id: 'bread', n: 30 }, { id: 'cobblestone', n: 64 }], rot: [0.3, 0.8, 0, 0.4] }); g.entityChanged(X, Y, Z);
p.x = X + 0.5; p.z = Z + 1.6; p.y = Y; p.yaw = 0; p.pitch = -0.75;
//@ wait 1800
//@ shot pile
