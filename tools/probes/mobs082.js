// 0.8.2 mob fixes: slimes see-through and spreading out, turkey fan, animals by habitat.
// Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/mobs082.js flat-2
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 10; x < X + 10; x++) for (let z = Z - 12; z < Z + 4; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.grass, 0, { quiet: true }); }
window.__sl = [];
for (let i = 0; i < 6; i++) { const m = new D.Mob(g, 'slime', X + 0.5, Y, Z - 5.5); if (m.setSize) m.setSize(i < 2 ? 2 : 1); g.addEntity(m); window.__sl.push(m); }
const t = new D.Mob(g, 'turkey', X + 3.5, Y, Z - 3.5); t.yaw = Math.PI / 2; g.addEntity(t); window.__tk = t;
p.x = X + 0.5; p.z = Z + 1.5; p.y = Y; p.yaw = 0; p.pitch = -0.25;
window.__P = { X, Y, Z };
return 'slimes in one spot';
//@ wait 300
//@ shot slimes_start
//@ wait 4000
const sl = window.__sl; let min = 99;
for (let i = 0; i < sl.length; i++) for (let j = i + 1; j < sl.length; j++) min = Math.min(min, Math.hypot(sl[i].x - sl[j].x, sl[i].z - sl[j].z));
return { minApart: Math.round(min * 100) / 100, widths: sl.map(s => Math.round(s.w * 100) / 100) };
//@ shot slimes_after
const t = window.__tk; for (const m of window.__sl) m.remove = true; p.x = t.x - 2.2; p.z = t.z + 0.2; p.yaw = -Math.PI / 2; p.pitch = -0.2; t.ai = null; t.vx = t.vz = 0;
//@ wait 1200
//@ shot turkey_side
window.__tk.displayT = 2;
//@ wait 400
//@ shot turkey_fan
// a player walking into a cow: pushed, but can get by
const { X, Y, Z } = window.__P; window.__tk.remove = true;
const c = new D.Mob(g, 'cow', X + 0.5, Y, Z - 2.5); c.T = Object.assign({}, c.T, { speed: 0 }); g.addEntity(c); window.__cow = c;
p.x = X + 0.5; p.z = Z - 1.6; p.y = Y; p.yaw = 0; p.pitch = 0;
//@ wait 1500
return { cowMoved: Math.round(Math.hypot(window.__cow.x - (window.__P.X + 0.5), window.__cow.z - (window.__P.Z - 2.5)) * 100) / 100, gap: Math.round(Math.hypot(window.__cow.x - p.x, window.__cow.z - p.z) * 100) / 100 };
// habitats across the world
const out = {}; const gen = w.gen;
for (let i = 0; i < 400; i++) { const x = Math.floor((Math.random() - 0.5) * 6000), z = Math.floor((Math.random() - 0.5) * 6000); const h = window.habitatAtDebug ? window.habitatAtDebug(w, x, z, 0) : '?'; out[h] = (out[h] || 0) + 1; }
return out;
