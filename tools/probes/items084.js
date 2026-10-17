// 0.8.4: 3D items (dropped, piled, on the belt), 3D crops and flowers, fishing.
// Run: MODE=creative W=900 H=520 python3 tools/jsprobe.py OUT tools/probes/items084.js flat-2
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 12; x < X + 12; x++) for (let z = Z - 20; z < Z + 6; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.grass, 0, { quiet: true }); }
// a little farm and some flowers
const crops = ['wheat_crop', 'carrot_crop', 'potato_crop', 'beetroot_crop'];
crops.forEach((c, i) => { for (let dx = 0; dx < 3; dx++) for (let dz = 0; dz < 3; dz++) { w.setBlock(X - 6 + i * 3 + dx, Y - 1, Z - 6 + dz, B.farmland, 0, { quiet: true }); if (B[c] !== undefined) w.setBlock(X - 6 + i * 3 + dx, Y, Z - 6 + dz, B[c], 7, { quiet: true }); } });
['poppy', 'dandelion', 'cornflower', 'allium', 'oak_sapling', 'red_mushroom'].forEach((f, i) => { if (B[f] !== undefined) w.setBlock(X - 5 + i * 2, Y, Z - 2, B[f], 0, { quiet: true }); });
// an ingot pile and a few things dropped
w.setBlock(X + 3, Y, Z - 3, B.item_pile, 0); w.setEntity(X + 3, Y, Z - 3, { type: 'pile', items: [D.mkStack('iron_ingot', 64), D.mkStack('gold_ingot', 40), D.mkStack('copper_ingot', 24) , D.mkStack('brick', 30)], rot: [0, 0.3, 0, 0] }); g.entityChanged(X + 3, Y, Z - 3);
g.dropItem(D.mkStack('diamond_sword', 1), X - 1.5, Y + 0.2, Z - 3.5, false); g.dropItem(D.mkStack('apple', 1), X - 0.5, Y + 0.2, Z - 3.5, false); g.dropItem(D.mkStack('lantern', 1), X + 0.5, Y + 0.2, Z - 3.5, false); g.dropItem(D.mkStack('torch', 1), X + 1.5, Y + 0.2, Z - 3.5, false);
p.x = X + 0.5; p.z = Z + 1.5; p.y = Y + 1.2; p.yaw = 0; p.pitch = -0.45; p.flying = true;
window.__I = { X, Y, Z };
return { ok: true };
//@ wait 1500
//@ shot items_farm
// fishing in a pond
const { X, Y, Z } = window.__I;
for (let x = X - 8; x < X + 8; x++) for (let z = Z - 20; z < Z - 9; z++) for (let y = Y - 4; y < Y; y++) w.setBlock(x, y, z, B.water, 0, { quiet: true });
p.x = X + 0.5; p.z = Z - 7.5; p.y = Y; p.yaw = 0; p.pitch = -0.25; p.flying = false;
p.inv.main.slots[p.inv.selected] = D.mkStack('fishing_rod', 1);
lp.castLine();
return { fishing: !!lp.fishing };
//@ wait 2500
const b = lp.fishing;
const st = b && b.state; if (b) b.waitT = 0.01;
return { state: st, y: b && +(b.y - window.__I.Y).toFixed(2) };
//@ wait 400
//@ shot fishing_bite
const before = g.entities.length; lp.endFishing(true);
return { biteWas: true, dropped: g.entities.length - before };
//@ wait 300
// the lantern on your belt
p.inv.hook.slots[0] = D.mkStack('lantern', 1); p.inv.main.slots[p.inv.selected] = D.mkStack('iron_pickaxe', 1); lp.viewMode = 3; p.pitch = 0;
//@ wait 600
//@ shot belt_lantern
