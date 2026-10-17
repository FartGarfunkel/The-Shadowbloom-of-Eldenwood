// 0.8.3 monsters: every new creature lined up for a look, three rows.
// Run: MODE=creative W=1000 H=540 python3 tools/jsprobe.py OUT tools/probes/zoo083.js flat-2
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 14; x < X + 14; x++) for (let z = Z - 40; z < Z + 6; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.grass, 0, { quiet: true }); }
const rows = [['husk', 'drowned', 'stray', 'witch', 'raider', 'werewolf', 'ogre', 'wraith'], ['cave_spider', 'stone_mite', 'cinder_wisp', 'magma_slime', 'scorpion', 'rattlesnake', 'green_snake', 'adder'], ['crocodile', 'shark', 'lion', 'lioness', 'tiger', 'panther', 'snow_leopard']];
window.__rows = []; const errs = [];
rows.forEach((row, ri) => { const zz = Z - 6 - ri * 12; row.forEach((t, i) => { try { const m = new D.Mob(g, t, X - (row.length - 1) * 0.9 + i * 1.8 + 0.5, Y + (t === 'wraith' || t === 'cinder_wisp' ? 0.6 : 0), zz + 0.5); m.yaw = Math.PI; if (m.setSize) m.setSize(2); g.addEntity(m); m.update(0.05); m.update = function (dt) { this.age += dt; }; window.__rows.push(m); } catch (e) { errs.push(t + ': ' + e.message); } }); });
p.x = X + 0.5; p.z = Z + 0.5; p.y = Y; p.yaw = 0; p.pitch = -0.18; p.flying = true;
window.__Z = { X, Y, Z };
return { made: window.__rows.length, errs, models: rows.flat().filter(t => !D.MODELS || !D.MODELS[t]).join(',') };
//@ wait 600
//@ shot zoo_row1
for (const m of window.__rows) if (m.type === 'wraith') { m.x -= 3; }
//@ wait 100
const { Y, Z } = window.__Z; p.z = Z - 18 + 0.5 + 4.5; p.y = Y + 0.6; p.pitch = -0.32;
//@ wait 500
//@ shot zoo_row2
const { Y, Z } = window.__Z; p.z = Z - 30 + 0.5 + 6; p.y = Y + 0.4; p.pitch = -0.22;
//@ wait 500
//@ shot zoo_row3
return { ents: g.entities.length };
