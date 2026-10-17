// Body actions: jump at a 3-high wall, catch the ledge, climb up; sneak into a 1-high gap and crawl through.
// Run: MODE=survival python3 tools/jsprobe.py OUT tools/probes/moves082.js flat-2
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 2600;
const X = Math.floor(p.x), Y = Math.floor(p.y), Z = Math.floor(p.z);
for (let x = X - 3; x < X + 8; x++) for (let z = Z - 12; z < Z + 3; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.stone, 0, { quiet: true }); }
for (let x = X; x < X + 5; x++) for (let y = Y; y < Y + 3; y++) for (let z = Z - 4; z < Z - 1; z++) w.setBlock(x, y, z, B.stone_bricks, 0, { quiet: true });
p.x = X + 2.5; p.y = Y; p.z = Z - 0.5; p.vx = p.vy = p.vz = 0; p.yaw = 0; p.pitch = 0;
window.__M = { X, Y, Z };
const I = g.input; I.enabled = true; I.keys.add('KeyW'); I.keys.add('Space'); I.updateMoveFromKeys();
return 'jumping at the wall';
//@ wait 450
g.input.keys.delete('Space'); g.input.updateMoveFromKeys();
//@ wait 900
g.input.keys.delete('KeyW'); g.input.updateMoveFromKeys(); return { hang: !!p.hang, y: +(p.y - window.__M.Y).toFixed(2) };
//@ wait 1000
//@ shot ledge_hang
return { stillHanging: !!p.hang, y: +(p.y - window.__M.Y).toFixed(2) };
//@ wait 100
g.input.keys.add('Space'); g.input.updateMoveFromKeys();
//@ wait 300
g.input.keys.delete('Space'); g.input.updateMoveFromKeys();
//@ wait 1500
//@ shot ledge_top
return { onTop: Math.abs(p.y - (window.__M.Y + 3)) < 0.05, y: +(p.y - window.__M.Y).toFixed(2), z: +(p.z - window.__M.Z).toFixed(2), climb: !!p.climb };
//@ wait 100
// crawling: a 1-high gap in a wall
const { X, Y, Z } = window.__M;
for (let x = X - 3; x < X + 8; x++) for (let z = Z - 12; z < Z + 3; z++) for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true });
for (let z = Z - 8; z < Z - 3; z++) for (let x = X + 1; x < X + 4; x++) { w.setBlock(x, Y + 1, z, B.cobblestone, 0, { quiet: true }); w.setBlock(x, Y + 2, z, B.cobblestone, 0, { quiet: true }); if (x !== X + 2) w.setBlock(x, Y, z, B.cobblestone, 0, { quiet: true }); }
p.x = X + 2.5; p.y = Y; p.z = Z - 1.5; p.vx = p.vy = p.vz = 0; p.yaw = 0; p.pitch = -0.2;
g.input.keys.add('KeyW'); g.input.keys.add('ShiftLeft'); g.input.updateMoveFromKeys();
//@ wait 1500
//@ shot crawl_in
return { crawling: !!p.crawling, z: +(p.z - window.__M.Z).toFixed(2) };
//@ wait 4500
g.input.keys.delete('KeyW'); g.input.keys.delete('ShiftLeft'); g.input.updateMoveFromKeys();
//@ wait 600
return { crawling: !!p.crawling, z: +(p.z - window.__M.Z).toFixed(2), throughGap: p.z < window.__M.Z - 8 };
