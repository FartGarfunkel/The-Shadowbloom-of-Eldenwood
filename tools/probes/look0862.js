// 0.8.6.2 looks: torch flames at night, cactus, a spider's face, a gust of wind, the map held in both hands
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 15000; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 6; x <= X + 6; x++) for (let z = Z - 9; z <= Z + 2; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0); w.setBlock(x, Y - 1, z, B.sand, 0); }
for (let x = X - 6; x <= X + 6; x++) for (let y = Y; y < Y + 4; y++) w.setBlock(x, y, Z - 9, B.cobblestone, 0);
w.setBlock(X - 2, Y + 1, Z - 8, B.torch, 3); w.setBlock(X + 2, Y + 1, Z - 8, B.torch, 3); w.setBlock(X, Y, Z - 6, B.torch, 0);
for (let y = Y; y < Y + 3; y++) { w.setBlock(X - 3, y, Z - 5, B.cactus, 0); w.setBlock(X + 3, y, Z - 4, B.cactus, 0); }
const sp = new D.Mob(g, 'spider', X + 0.5, Y, Z - 3); g.addEntity(sp); sp.yaw = 0; sp.ai = null;
window.__L = { sp, X, Y, Z };
p.x = X + 0.5; p.z = Z + 1.5; p.y = Y; p.yaw = 0; p.pitch = -0.12; p.flying = true;
return [X, Y, Z];
//@ wait 2500
const { sp } = window.__L; sp.yaw = 0; sp.x = window.__L.X + 0.5; sp.z = window.__L.Z - 2;
return 1;
//@ shot look_night
g.meta.time = 3000; g.env = g.computeEnv(0); g.wind.gust = 0.35; g.wind.strength = 1; const { sp } = window.__L; sp.remove = true;
return 1;
//@ wait 1500
//@ shot look_day_gust
p.inv.main.slots[0] = { id: 'filled_map', n: 1 }; p.inv.selected = 0; p.pitch = -0.7; return 1;
//@ wait 600
//@ shot look_map
return [D.MAPS ? D.MAPS.all.size : -1, p.contacts && p.contacts.water];
