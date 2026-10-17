// First-person body: torso, chestplate, belt and legs when looking down. Run: python3 tools/jsprobe.py OUT tools/probes/fpbody.js flat-2
g.rules().daylightCycle = false; g.meta.time = 300; g.env = g.computeEnv(0);
g.settings.fpBody = true; g.settings.viewBob = false;
const X = Math.floor(p.x), Y = Math.floor(p.y), Z = Math.floor(p.z);
for (let x = X - 6; x < X + 7; x++) for (let z = Z - 6; z < Z + 7; z++) { for (let y = Y; y < Y + 6; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.grass, 0, { quiet: true }); }
p.x = X + 0.5; p.y = Y; p.z = Z + 0.5; p.vx = p.vy = p.vz = 0;
const inv = p.inv; inv.armor.slots[1] = { id: 'iron_chestplate', count: 1 }; inv.armor.slots[2] = { id: 'leather_leggings', count: 1 };
inv.hook.slots[0] = { id: 'lantern', count: 1 };
p.pitch = -0.6; p.yaw = 0.3;

return D.FP_BODY;
//@ wait 1200
//@ shot fp_a06
p.pitch = -1.0;
//@ wait 400
//@ shot fp_a10
p.pitch = -1.3;
//@ wait 400
//@ shot fp_a13
p.pitch = -1.55;
//@ wait 400
//@ shot fp_a155
p.inv.armor.slots[1] = null; p.inv.armor.slots[2] = null; p.pitch = -1.15;
//@ wait 400
//@ shot fp_plain
p.pitch = -1.3; window.__op = window.__op || lp.pose.bind(lp); lp.pose = () => Object.assign(window.__op(), { walk: 1.3, walkAmt: 1 });
//@ wait 300
//@ shot fp_walk
lp.pose = () => Object.assign(window.__op(), { sneak: true }); p.sneaking = true; p.eye = 1.45; p.pitch = -1.3;
p.inv.armor.slots[1] = { id: 'iron_chestplate', count: 1 };
//@ wait 300
//@ shot fp_sneak
