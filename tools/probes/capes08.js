// Capes and backpacks seen in third person, and the cape crafting recipe. Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/capes08.js flat-2
g.rules().daylightCycle = false; g.meta.time = 300; g.env = g.computeEnv(0);
p.inv.cape.slots[0] = D.mkStack('red_cape', 1); p.inv.back.slots[0] = null; lp.viewMode = 1; p.yaw = 0.5; p.pitch = -0.2;
const grid = [D.mkStack('string', 1), null, D.mkStack('string', 1), D.mkStack('blue_wool', 1), D.mkStack('blue_wool', 1), D.mkStack('blue_wool', 1), D.mkStack('blue_wool', 1), D.mkStack('blue_wool', 1), D.mkStack('blue_wool', 1)];
const r = D.matchGrid ? D.matchGrid(grid, 3) : null;
return { recipe: r ? r.out : null };
//@ wait 1500
//@ shot cape_back
p.inv.back.slots[0] = D.mkStack('leather_backpack', 1); p.inv.cape.slots[0] = D.mkStack('ember_cape', 1);
p.vx = -Math.sin(p.yaw) * 5; p.vz = -Math.cos(p.yaw) * 5;
//@ wait 400
//@ shot cape_pack
lp.viewMode = 2; p.inv.cape.slots[0] = D.mkStack('royal_cape', 1);
//@ wait 400
//@ shot cape_front
lp.viewMode = 0; lp.openInventory && lp.openInventory('player');
//@ wait 600
//@ shot cape_inv
