g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 18000; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 4; x <= X + 4; x++) for (let z = Z - 6; z <= Z + 2; z++) { for (let y = Y; y < Y + 6; y++) w.setBlock(x, y, z, 0, 0); w.setBlock(x, Y - 1, z, B.stone, 0); }
for (let x = X - 4; x <= X + 4; x++) for (let y = Y; y < Y + 4; y++) w.setBlock(x, y, Z - 4, B.cobblestone, 0);
w.setBlock(X - 1, Y + 1, Z - 3, B.torch, 3); w.setBlock(X + 1, Y, Z - 2, B.torch, 0);
const sp = new D.Mob(g, 'spider', X + 2.2, Y, Z - 1.6); g.addEntity(sp); sp.yaw = Math.PI * 0.85; sp.ai = null;
window.__L = { sp, X, Y, Z };
p.x = X + 0.5; p.z = Z + 0.6; p.y = Y; p.yaw = 0.1; p.pitch = -0.25; p.flying = true;
return 1;
//@ wait 2000
const { sp, X, Z } = window.__L; sp.yaw = Math.PI * 0.85; sp.x = X + 2.2; sp.z = Z - 1.6; sp.vx = sp.vz = 0;
return 1;
//@ shot look_close
