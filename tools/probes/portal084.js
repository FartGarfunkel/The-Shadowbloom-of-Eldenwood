// Portals remember where they lead: through to the Depths, wander off, come back through the same
// portal, and arrive home at the portal you left from.
// Run: MODE=creative W=700 H=420 python3 tools/jsprobe.py OUT tools/probes/portal084.js probe-1
g.rules().daylightCycle = false; g.meta.time = 2600;
const X = Math.floor(p.x) + 3, Y = Math.floor(p.y), Z = Math.floor(p.z);
for (let x = X - 2; x < X + 16; x++) for (let z = Z - 4; z < Z + 5; z++) { for (let y = Y; y < Y + 12; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.stone, 0, { quiet: true }); }
for (let dx = 0; dx < 7; dx++) for (let dy = 0; dy < 9; dy++) if (dx === 0 || dy === 0 || dx === 6 || dy === 8) w.setBlock(X + 6 + dx, Y + dy, Z, B.obsidian, 0, { quiet: true });
lp.useFlint({ x: X + 7, y: Y, z: Z, id: B.obsidian, nx: 0, ny: 1, nz: 0 }, { id: 'flint_and_steel', n: 1, d: 0 });
window.__home = [X + 9.5, Y + 1, Z + 0.5];
p.x = X + 9.5; p.y = Y + 1; p.z = Z + 0.5; p.vx = p.vy = p.vz = 0;
g.travelPortal(D.DIM.DEPTHS);
return { lit: w.getBlock(X + 9, Y + 1, Z) === B.ember_portal };
//@ wait 8000
const arrived = [p.x, p.y, p.z];
window.__depthsPortal = arrived;
return { dim: g.dim, state: g.state, links: Object.keys(g.meta.portalLinks || {}).length };
//@ wait 3000
// wander far off in the Depths, then come back and step into the same portal
p.x += 60; p.z += 40;
//@ wait 1500
const a = window.__depthsPortal; const bx = Math.floor(a[0]), by = Math.floor(a[1]), bz = Math.floor(a[2]); let t = null;
for (let dx = -4; dx <= 4 && !t; dx++) for (let dy = -2; dy <= 6 && !t; dy++) for (let dz = -4; dz <= 4 && !t; dz++) if (w.getBlock(bx + dx, by + dy, bz + dz) === B.ember_portal && w.getBlock(bx + dx, by + dy - 1, bz + dz) !== B.ember_portal) t = [bx + dx, by + dy, bz + dz];
if (t) { p.x = t[0] + 0.5; p.y = t[1]; p.z = t[2] + 0.5; p.vx = p.vy = p.vz = 0; p.portalCooldown = 0; g.travelPortal(D.DIM.DEPTHS); }
return ['into the depths portal', !!t];
//@ wait 8000
const h = window.__home;
return { dim: g.dim, state: g.state, fromHome: Math.round(Math.hypot(p.x - h[0], p.z - h[2]) * 10) / 10 };
