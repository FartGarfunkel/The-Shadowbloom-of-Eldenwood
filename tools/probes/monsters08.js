// Spider eyes in the dark and the fuseling's look (calm and hissing). Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/monsters08.js flat-2
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 300; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y) + 30;
for (let x = X - 8; x < X + 9; x++) for (let z = Z - 10; z < Z + 4; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.grass, 0, { quiet: true }); }
window.__base = [X, Y, Z];
window.__show = (list, yaw) => {
  for (const e of g.entities) if (e instanceof D.Mob) e.remove = true;
  const [X, Y, Z] = window.__base;
  list.forEach(([t, f], i) => { const m = new D.Mob(g, t, X - 3 + i * 3 + 0.5, Y, Z - 4 + 0.5); m.yaw = yaw; m.onGround = true; if (f) f(m); m.update = function (dt) { this.age += dt; this.onGround = true; }; g.addEntity(m); });
  p.x = X + 0.5; p.z = Z + 0.5; p.y = Y + 0.3; p.yaw = 0; p.pitch = -0.12; p.flying = true; p.vx = p.vy = p.vz = 0;
};
window.__show([['fuseling'], ['fuseling', m => { m.fuse = 1.2; }], ['spider']], -2.3);
return 'ok';
//@ wait 3000
//@ shot mon_day
window.__show([['fuseling'], ['spider'], ['fuseling', m => { m.fuse = 1.0; }]], Math.PI - 0.3);
//@ wait 600
//@ shot mon_front
g.meta.time = 900; g.env = g.computeEnv(0);
//@ wait 800
//@ shot mon_night
