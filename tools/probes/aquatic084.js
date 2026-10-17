// 0.8.4: squid point the way they swim (mantle along the velocity), stranded fish and squid flop and dry out.
// Run: MODE=creative W=900 H=520 python3 tools/jsprobe.py OUT tools/probes/aquatic084.js flat-2
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y) + 2;
for (let x = X - 8; x <= X + 8; x++) for (let z = Z - 14; z <= Z + 4; z++) { for (let y = Y - 1; y < Y + 9; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 2, z, B.stone, 0, { quiet: true }); }
// a glass tank 9 wide, 6 tall, 7 deep
for (let x = X - 4; x <= X + 4; x++) for (let z = Z - 12; z <= Z - 6; z++) for (let y = Y - 1; y <= Y + 6; y++) {
  const edge = x === X - 4 || x === X + 4 || z === Z - 12 || z === Z - 6 || y === Y - 1;
  w.setBlock(x, y, z, edge ? B.glass : (y <= Y + 5 ? B.water : 0), 0, { quiet: true });
}
const mk = (t, x, y, z) => { const m = new D.Mob(g, t, x, y, z); g.addEntity(m); return m; };
const sq = mk('squid', X - 1.5, Y + 2, Z - 9); const sq2 = mk('glow_squid', X + 2, Y + 1, Z - 8.5);
const land = [mk('squid', X - 3, Y - 1, Z - 2), mk('cod', X + 1, Y - 1, Z - 2), mk('salmon', X + 3, Y - 1, Z - 2.5)];
window.__A = { sq, sq2, land, Y };
p.x = X + 0.5; p.z = Z + 3; p.y = Y + 1.2; p.yaw = 0; p.pitch = -0.15; p.flying = true;
return 1;
//@ wait 2500
//@ wait 2000
const { sq, sq2 } = window.__A;
const chk = (m) => { const M = m._mats && m._mats.body; if (!M) return null; const up = [M[4], M[5], M[6]], L = Math.hypot(...up), v = [m.vx, m.vy, m.vz], V = Math.hypot(...v) || 1; return { dot: +((up[0] * v[0] + up[1] * v[1] + up[2] * v[2]) / L / V).toFixed(2), sp: +V.toFixed(2), tilt: +(m._tilt || 0).toFixed(2) }; };
return [chk(sq), chk(sq2)];
//@ wait 1000
const { sq, sq2 } = window.__A;
const chk = (m) => { const M = m._mats && m._mats.body; if (!M) return null; const up = [M[4], M[5], M[6]], L = Math.hypot(...up), v = [m.vx, m.vy, m.vz], V = Math.hypot(...v) || 1; return { dot: +((up[0] * v[0] + up[1] * v[1] + up[2] * v[2]) / L / V).toFixed(2), sp: +V.toFixed(2), tilt: +(m._tilt || 0).toFixed(2) }; };
return [chk(sq), chk(sq2)];
//@ shot aq_tank
const { land } = window.__A;
return land.map(m => [m.type, +(m.dryT || 0).toFixed(1), m.health, m.inWater, m._flopSide]);
