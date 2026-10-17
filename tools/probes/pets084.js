// 0.8.4: furniture and sitting, shelves and bookcases, taming and pets, riding, minecart trains, pets in carts.
// Run: MODE=creative W=900 H=520 python3 tools/jsprobe.py OUT tools/probes/pets084.js flat-2
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 20; x < X + 20; x++) for (let z = Z - 45; z < Z + 8; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.grass, 0, { quiet: true }); }
// a little room of furniture, all facing the camera (south)
const kinds = ['chair', 'stool', 'bench', 'table', 'standing_shelf', 'bookcase', 'cabinet'];
kinds.forEach((k, i) => w.setBlock(X - 6 + i * 2, Y, Z - 5, B['oak_' + k], 0));
kinds.forEach((k, i) => w.setBlock(X - 6 + i * 2, Y, Z - 8, B['spruce_' + k], 0));
for (let x = X - 7; x < X + 9; x++) for (let y = Y; y < Y + 3; y++) w.setBlock(x, y, Z - 9, B.stone_bricks, 0);
w.setBlock(X + 2, Y + 1, Z - 6, B.birch_shelf, 0);
w.setBlock(X + 2, Y, Z - 6, 0, 0);
// fill the shelf, the standing shelf and the bookcase through the player's own hands
const errs = [];
const useAt = (x, y, z, held, frac) => { const id = w.getBlock(x, y, z); p.inv.held = held; lp.hitFrac = () => frac; try { return lp.useBlockAt({ x, y, z, id, nx: 0, ny: 0, nz: 1, dist: 2 }, held, held ? D.itemDef(held.id) : null); } catch (e) { errs.push(e.message); } };
useAt(X + 2, Y + 1, Z - 6, D.mkStack('iron_ingot', 5), [0.2, 0.5, 0.5]);
useAt(X + 2, Y + 1, Z - 6, D.mkStack('apple', 3), [0.5, 0.5, 0.5]);
useAt(X + 2, Y + 1, Z - 6, D.mkStack('diamond_sword', 1), [0.85, 0.5, 0.5]);
useAt(X + 2, Y, Z - 5, D.mkStack('cobblestone', 10), [0.2, 0.2, 0.5]);
useAt(X + 2, Y, Z - 5, D.mkStack('bread', 4), [0.8, 0.7, 0.5]);
for (let k = 0; k < 5; k++) useAt(X + 4, Y, Z - 5, D.mkStack('book', 1), [[0.2, 0.5, 0.8][k % 3], k < 3 ? 0.2 : 0.7, 0.5]);
const refused = useAt(X + 4, Y, Z - 5, D.mkStack('dirt', 1), [0.8, 0.7, 0.5]);
const shelfE = w.getEntity(X + 2, Y + 1, Z - 6), standE = w.getEntity(X + 2, Y, Z - 5), caseE = w.getEntity(X + 4, Y, Z - 5);
p.inv.held = null;
p.x = X + 0.5; p.z = Z + 0.5; p.y = Y; p.yaw = 0; p.pitch = -0.15;
window.__F = { X, Y, Z };
return { errs, shelf: shelfE && shelfE.items.map(s => s && s.id), stand: standE && standE.items.map(s => s && s.id), books: caseE && caseE.items.filter(Boolean).length, dirtRefused: !!refused };
//@ wait 700
//@ shot furniture
// sit on the oak chair
const { X, Y, Z } = window.__F;
const sat = lp.sitOn(X - 6, Y, Z - 5);
for (let i = 0; i < 3; i++) g.updateEntities(0.05);
const seat = { sat, riding: !!lp.riding, y: +(p.y - Y).toFixed(2), yaw: +p.yaw.toFixed(2) };
lp.riding.dismount(lp);
// taming: a wolf with a bone (creative: always takes), then teleporting after you
const wolf = new D.Mob(g, 'wolf', X + 5.5, Y, Z + 3.5); g.addEntity(wolf);
lp.targetEnt = wolf; p.inv.held = D.mkStack('bone', 3); lp.petUse(wolf, p.inv.held);
const tamed = wolf.owner === lp.name;
p.x = X + 0.5; p.z = Z - 35; p.y = Y;
for (let i = 0; i < 20; i++) g.updateEntities(0.05);
const followed = Math.round(Math.hypot(wolf.x - p.x, wolf.z - p.z) * 10) / 10;
// a ghoul hits you: the wolf goes for it
const gh = new D.Mob(g, 'ghoul', p.x + 3, Y, p.z + 3); g.addEntity(gh);
lp.hurt(1, { type: 'mob', attacker: gh });
for (let i = 0; i < 80; i++) g.updateEntities(0.05);
const fight = { foe: wolf.petFoe === gh || !gh.alive, ghoulHp: gh.health, ghoulAlive: gh.alive };
gh.remove = true; p.health = 20;
// a horse: tame, saddle, ride
const horse = new D.Mob(g, 'horse', p.x + 2, Y, p.z); g.addEntity(horse);
p.sneaking = true; p.inv.held = D.mkStack('apple', 4); lp.petUse(horse, p.inv.held); p.sneaking = false;
p.inv.held = D.mkStack('saddle', 1); lp.petUse(horse, p.inv.held);
p.inv.held = null; lp.petUse(horse, null);
const riding = lp.riding === horse;
const hx = horse.x, hz = horse.z; p.yaw = Math.PI / 2;   // look west
lp.boatInput = { mx: 0, mz: -1, jump: false, sprint: true };
for (let i = 0; i < 40; i++) g.updateEntities(0.05);
const rode = { riding, saddled: !!horse.saddled, moved: Math.round(Math.hypot(horse.x - hx, horse.z - hz) * 10) / 10, westward: horse.x < hx - 3, playerOnTop: Math.abs(p.x - horse.x) < 0.01 && p.y > horse.y + 0.8 };
lp.boatInput = { mx: 0, mz: 0 };
window.__horse = horse; window.__wolf = wolf;
return { seat, tamed, followed, fight, rode };
//@ wait 100
// trains: a straight track, the engine (a double cart you sit in) and two carts joined by chains:
// a chest loaded into the first, the wolf riding in the second
const { X, Y, Z } = window.__F;
const horse = window.__horse; horse.dismount(lp); horse.remove = true;
for (let z = Z - 50; z <= Z + 4; z++) w.setBlock(X + 10, Y, z, B.rail, 0);
const eng = g.placeCart('furnace', X + 10, Y, Z - 3), c1 = g.placeCart('minecart', X + 10, Y, Z - 0), c2 = g.placeCart('minecart', X + 10, Y, Z + 2);
eng.yaw = 0;
for (let i = 0; i < 10; i++) g.updateEntities(0.05);
p.x = X + 9; p.z = Z; p.y = Y;
const chain = D.mkStack('chain', 4); p.inv.held = chain;
eng.use(lp, chain, D.itemDef('chain')); c1.use(lp, chain, D.itemDef('chain'));
c1.use(lp, chain, D.itemDef('chain')); c2.use(lp, chain, D.itemDef('chain'));
p.inv.held = null;
// a chest with things in it goes into the first cart
w.setBlock(X + 8, Y, Z, B.chest, 0); w.setEntity(X + 8, Y, Z, { type: 'chest', items: [D.mkStack('diamond', 3), ...new Array(26).fill(null)] });
lp.pickUpBlock(X + 8, Y, Z); lp.targetEnt = c1; lp.placeCarried();
const loaded = { type: c1.type, diamonds: c1.items && c1.items[0] && c1.items[0].n };
const wolf = window.__wolf; lp.pickUpMob(wolf); lp.targetEnt = c2; lp.placeCarried();
const inCart = !!c2.pet && c2.pet.type === 'wolf';
// climb into the engine, feed it from the seat, drive forward
lp.targetEnt = null; eng.use(lp, null, null);
const seated = lp.riding === eng;
p.inv.held = D.mkStack('coal', 3); lp.use(false, {}, false);
const fuel = Math.round(eng.fuel);
lp.boatInput = { mx: 0, mz: -1 };
const z0 = eng.z;
for (let i = 0; i < 100; i++) g.updateEntities(0.05);
const fwd = { travelled: Math.round((z0 - eng.z) * 10) / 10, speed: Math.round(Math.hypot(eng.vx, eng.vz) * 10) / 10, gap1: +Math.hypot(eng.x - c1.x, eng.z - c1.z).toFixed(2), gap2: +Math.hypot(c1.x - c2.x, c1.z - c2.z).toFixed(2), driverBehindFurnace: p.z > eng.z + 0.5 };
// S: slow down, then back up
lp.boatInput = { mx: 0, mz: 1 };
const z1 = eng.z;
for (let i = 0; i < 80; i++) g.updateEntities(0.05);
const back = { moved: Math.round((eng.z - z1) * 10) / 10, vz: Math.round(eng.vz * 10) / 10 };
lp.boatInput = { mx: 0, mz: 0 };
window.__T = { eng, c1, c2 };
lp.riding.dismount(lp);
p.x = X + 6; p.z = c1.z + 0.5; p.y = Y + 2; p.yaw = -Math.PI / 2 + 0.6; p.pitch = -0.35;
return { links: [eng.links.length, c1.links.length, c2.links.length], loaded, inCart, seated, fuel, fwd, back };
//@ wait 500
//@ shot train
// unloading: the chest comes out with its diamonds; saving keeps joins, cargo and passengers
const T = window.__T; p.sneaking = true; lp.targetEnt = T.c1; p.inv.held = null; lp.use(false, {}, false); p.sneaking = false;
const out = { carrying: p.carrying && p.carrying.key, diamonds: p.carrying && p.carrying.ent && p.carrying.ent.items[0] && p.carrying.ent.items[0].n, cartNow: T.c1.type };
p.carrying = null;
g.storeCarts(); g.storeAnimals();
const saved = g.meta.carts[g.dim];
const wolves = (g.meta.animals[g.dim] || []).filter(a => a.t === 'wolf').length;
return { out, carts: saved.length, lk: saved.map(s => s.lk || null), pm: saved.map(s => s.pm ? s.pm.t + ':' + (s.pm.o ? 'owned' : '') : null), wolvesAsAnimals: wolves };
