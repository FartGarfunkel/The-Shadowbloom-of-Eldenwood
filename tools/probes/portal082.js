// Portals: build frames of different sizes, light them with flint and steel, go through and back.
// Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/portal082.js probe-1
g.rules().daylightCycle = false; g.meta.time = 2600;
const X = Math.floor(p.x) + 3, Y = Math.floor(p.y), Z = Math.floor(p.z);
for (let x = X - 2; x < X + 30; x++) for (let z = Z - 4; z < Z + 5; z++) { for (let y = Y; y < Y + 14; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.stone, 0, { quiet: true }); }
// frames: opening w x h, built in the X plane at z = Z
const frame = (x0, wd, ht) => { for (let dx = 0; dx < wd + 2; dx++) for (let dy = 0; dy < ht + 2; dy++) if (dx === 0 || dy === 0 || dx === wd + 1 || dy === ht + 1) w.setBlock(x0 + dx, Y + dy, Z, B.obsidian, 0, { quiet: true }); };
frame(X, 2, 3); frame(X + 6, 5, 7); frame(X + 14, 10, 12); frame(X + 26, 1, 3);
const held = { id: 'flint_and_steel', n: 1, d: 0 };
const light = (x) => { const hit = { x, y: Y, z: Z, id: B.obsidian, nx: 0, ny: 1, nz: 0 }; lp.useFlint(hit, held); };
light(X + 1); light(X + 7); light(X + 15); light(X + 27);
const count = (x0, wd, ht) => { let n = 0; for (let dx = 1; dx <= wd; dx++) for (let dy = 1; dy <= ht; dy++) if (w.getBlock(x0 + dx, Y + dy, Z) === B.ember_portal) n++; return n; };
window.__P = { X, Y, Z };
return { small: count(X, 2, 3) + '/6', medium: count(X + 6, 5, 7) + '/35', big: count(X + 14, 10, 12) + '/120', tooThin: count(X + 26, 1, 3) + '/0 expected' };
//@ wait 800
//@ shot portal_frames
const { X, Y, Z } = window.__P; p.x = X + 9.5; p.y = Y + 1; p.z = Z + 0.5; p.vx = p.vy = p.vz = 0; return g.dim;
//@ wait 9000
return { dim: g.dim, state: g.state, pos: [Math.round(p.x), Math.round(p.y), Math.round(p.z)] };
//@ wait 6000
//@ shot portal_depths
const near = []; const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
for (let dx = -4; dx <= 4; dx++) for (let dy = -2; dy <= 6; dy++) for (let dz = -4; dz <= 4; dz++) if (w.getBlock(bx + dx, by + dy, bz + dz) === B.ember_portal) near.push([dx, dy, dz]);
return { dim: g.dim, state: g.state, returnPortalCells: near.length };
//@ wait 100
// walk into the return portal
const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z); let t = null;
for (let dx = -4; dx <= 4 && !t; dx++) for (let dy = -2; dy <= 6 && !t; dy++) for (let dz = -4; dz <= 4 && !t; dz++) if (w.getBlock(bx + dx, by + dy, bz + dz) === B.ember_portal && w.getBlock(bx + dx, by + dy - 1, bz + dz) !== B.ember_portal) t = [bx + dx, by + dy, bz + dz];
if (t) { p.x = t[0] + 0.5; p.y = t[1]; p.z = t[2] + 0.5; p.vx = p.vy = p.vz = 0; p.portalCooldown = 0; }
return ['going back', t];
//@ wait 7000
return { dim: g.dim, state: g.state, pos: [Math.round(p.x), Math.round(p.y), Math.round(p.z)] };
//@ wait 5000
//@ shot portal_back
return { dim: g.dim, state: g.state };
