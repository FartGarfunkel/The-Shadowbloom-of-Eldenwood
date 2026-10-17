// The Skylands portal: a Glow Lantern frame, a water bucket poured at it, step through and back home.
// Run: MODE=survival W=640 H=400 python3 tools/jsprobe.py OUT tools/probes/skyportal084.js flat-2
g.rules().mobSpawning = false;
const X = Math.floor(p.x) + 3, Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 3; x < X + 7; x++) for (let z = Z - 4; z < Z + 4; z++) { for (let y = Y; y < Y + 7; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.stone, 0, { quiet: true }); }
for (let dx = 0; dx < 4; dx++) for (let dy = 0; dy < 5; dy++) if (dx === 0 || dx === 3 || dy === 0 || dy === 4) w.setBlock(X + dx, Y + dy, Z, B.glowstone, 0);
p.x = X + 1.5; p.z = Z + 3.5; p.y = Y; p.yaw = 0; p.pitch = -0.21;
p.inv.main.slots[p.inv.selected] = D.mkStack('water_bucket', 1);
window.__S = { X, Y, Z };
return { ok: true };
//@ wait 400
const { X, Y, Z } = window.__S;
// the hard way: a water source already standing in the frame, and the bucket poured at the frame's front face
w.setBlock(X + 1, Y + 1, Z, B.water, 0);
const t = { x: X + 1, y: Y, z: Z, id: B.glowstone, nx: 0, ny: 0, nz: 1 };
lp.target = t; lp.useBucket(D.itemDef('water_bucket'), p.inv.held);
const lit = []; for (let dx = 1; dx < 3; dx++) for (let dy = 1; dy < 4; dy++) lit.push(w.getBlock(X + dx, Y + dy, Z) === B.sky_portal ? 1 : 0);
return { target: t && [t.x - X, t.y - Y, t.z - Z, t.id === B.glowstone, t.nx, t.ny, t.nz], lit: lit.join(''), held: p.inv.held && p.inv.held.id };
//@ wait 200
const { X, Y, Z } = window.__S;
p.x = X + 1.5; p.z = Z + 0.5; p.y = Y + 1;
return { inPortal: w.getBlock(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)) === B.sky_portal };
//@ wait 12000
return { dim: g.dim, state: g.state };
//@ wait 4000
let t = null; const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
for (let dx = -4; dx <= 4 && !t; dx++) for (let dy = -2; dy <= 6 && !t; dy++) for (let dz = -4; dz <= 4 && !t; dz++) if (w.getBlock(bx + dx, by + dy, bz + dz) === B.sky_portal && w.getBlock(bx + dx, by + dy - 1, bz + dz) !== B.sky_portal) t = [bx + dx, by + dy, bz + dz];
if (t) { p.x = t[0] + 0.5; p.y = t[1]; p.z = t[2] + 0.5; p.vx = p.vy = p.vz = 0; p.portalCooldown = 0; }
return { returnPortal: !!t };
//@ wait 14000
const { X, Y, Z } = window.__S;
return { dim: g.dim, fromHome: +Math.hypot(p.x - X - 1.5, p.z - Z - 0.5).toFixed(1) };
