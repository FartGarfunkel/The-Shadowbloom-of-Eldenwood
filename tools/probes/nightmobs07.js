// Checks for 0.7's night creatures: skeletons shoot, spiders climb, fuselings burst (no block damage with mob griefing off), big slimes split, and the spawner picks them all.
// Run: python3 tools/jsprobe.py OUT tools/probes/nightmobs07.js flat-2
g.rules().daylightCycle = false; g.rules().mobSpawning = false; g.meta.mode = "survival"; g.meta.time = 900;
g.env = g.computeEnv(0);
const X = Math.floor(p.x), Y = Math.floor(p.y), Z = Math.floor(p.z);
for (let x = X - 14; x < X + 15; x++) for (let z = Z - 14; z < Z + 15; z++) { for (let y = Y; y < Y + 10; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.stone, 0, { quiet: true }); }
p.x = X + 0.5; p.y = Y; p.z = Z + 0.5; p.health = p.maxHealth = 20; p.vx = p.vy = p.vz = 0;
for (const e of g.entities.slice()) e.remove = true; g.entities.length = 0;
const R = { day: +g.env.day.toFixed(2) };
const run = (secs) => { for (let i = 0; i < secs * 20; i++) { p.invuln = 0; g.updateEntities(0.05); g.entities = g.entities.filter(e => !e.remove); } };
// skeleton at 9 blocks
const sk = g.addEntity(new D.Mob(g, 'skeleton', X + 0.5, Y, Z - 8.5));
let arrows = 0; const add = g.addEntity.bind(g); g.addEntity = (e) => { if (e.constructor.name === 'Arrow') arrows++; return add(e); };
run(6);
R.skeleton = { arrows, hp: p.health, dist: +Math.hypot(sk.x - p.x, sk.z - p.z).toFixed(1) };
sk.remove = true; p.health = 20;
// spider behind a 4-high wall climbs it
for (let x = X - 3; x <= X + 3; x++) for (let y = Y; y < Y + 4; y++) w.setBlock(x, y, Z - 4, B.stone, 0, { quiet: true });
const sp = g.addEntity(new D.Mob(g, 'spider', X + 0.5, Y, Z - 7.5));
let maxY = sp.y; for (let i = 0; i < 140; i++) { p.invuln = 0; g.updateEntities(0.05); maxY = Math.max(maxY, sp.y); }
R.spider = { maxClimb: +(maxY - Y).toFixed(1), z: +(sp.z - Z).toFixed(1), hp: p.health };
sp.remove = true; p.health = 20;
for (let x = X - 3; x <= X + 3; x++) for (let y = Y; y < Y + 4; y++) w.setBlock(x, y, Z - 4, 0, 0, { quiet: true });
// fuseling with mob griefing off: hurts, breaks nothing
g.rules().mobGriefing = false;
w.setBlock(X + 2, Y, Z, B.cobblestone, 0, { quiet: true });
const fu = g.addEntity(new D.Mob(g, 'fuseling', X + 0.5, Y, Z - 5.5));
run(6);
R.fuseling = { gone: !g.entities.includes(fu), hp: p.health, cobbleKept: w.getBlock(X + 2, Y, Z) === B.cobblestone };
p.health = 20; g.rules().mobGriefing = true;
// slime splits
const sl = g.addEntity(new D.Mob(g, 'slime', X + 4.5, Y, Z + 4.5)); sl.setSize(2);
sl.hurt(99, {});
R.slime = { kids: g.entities.filter(e => e.type === 'slime' && e !== sl).length, kidSize: (g.entities.find(e => e.type === 'slime' && e !== sl) || {}).size };
// a few spawn picks happen and include the new types
const seen = {}; const pk = g.addEntity; let n = 0;
g.addEntity = (e) => { if (e.type) seen[e.type] = (seen[e.type] || 0) + 1; n++; e.remove = true; return e; };
g.rules().mobSpawning = true;
for (let i = 0; i < 600; i++) g.spawnMobs();
g.addEntity = add;
R.spawned = seen;
return R;
