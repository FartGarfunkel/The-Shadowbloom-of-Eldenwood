// Checks for 0.7: hearts, charms, air, swimming, graves, commands, WorldEdit, block damage, grass, saplings, day length.
// Run: python3 tools/jsprobe.py OUT tools/probes/survival07.js flat-2
const X = Math.floor(p.x) + 2, Z = Math.floor(p.z) - 8, Y = Math.floor(p.y);
for (let x = X - 4; x < X + 16; x++) for (let z = Z - 4; z < Z + 14; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.stone, 0, { quiet: true }); }
window.__T = { X, Y, Z };
const R = {};
// hearts: ten, a crystal adds one that stays, a charm adds two while worn
R.max0 = p.maxHealth;
p.inv.main.slots[0] = D.mkStack('heart_crystal', 2); p.inv.selected = 0; lp.use(false, {}, false);
R.max1 = p.maxHealth; R.crystals = p.heartCrystals;
p.inv.charm.slots[0] = D.mkStack('vigor_charm', 1); p.recalcMax(); R.max2 = p.maxHealth;
p.inv.charm.slots[0] = null; p.recalcMax(); R.max3 = p.maxHealth;
// levelling no longer adds hearts
lp.grantXP(500); R.levelMax = p.maxHealth; R.level = p.level;
// air runs out under water, then you drown
for (let x = X; x < X + 3; x++) for (let z = Z; z < Z + 3; z++) for (let y = Y; y < Y + 4; y++) w.setBlock(x, y, z, B.water, 0, { quiet: true });
g.meta.mode = 'survival';
p.x = X + 1.5; p.y = Y + 0.2; p.z = Z + 1.5; p.vx = p.vy = p.vz = 0; p.health = p.maxHealth;
p.contacts = { water: true, eyeWater: true };
for (let i = 0; i < 20; i++) lp.breathe(1);
R.air = +p.air.toFixed(2); R.drowned = p.maxHealth - p.health;
p.contacts = {}; lp.breathe(1); R.airBack = +p.air.toFixed(1);
// swimming: sprint forward with your head under water
p.health = p.maxHealth; p.air = 15;
const inp = { mx: 0, mz: -1, jump: false, sneak: false, sprint: true, lookX: 0, lookY: 0 };
p.contacts = D.sampleContacts ? D.sampleContacts(w, p) : { water: true, eyeWater: true };
p.contacts.water = true; p.contacts.eyeWater = true;
p.move(w, inp, 0.05, {});
R.swimming = p.swimming; R.swimH = p.h;
p.contacts = {}; p.swimming = false; p.h = 1.8;
for (let x = X; x < X + 3; x++) for (let z = Z; z < Z + 3; z++) for (let y = Y; y < Y + 4; y++) w.setBlock(x, y, z, 0, 0, { quiet: true });
p.x = X + 6.5; p.y = Y; p.z = Z + 6.5;
// a grave keeps your things, and the compass finds it
p.inv.main.slots[3] = D.mkStack('diamond', 5); p.inv.armor.slots[1] = D.mkStack('iron_chestplate', 1);
lp.hurt(999, { type: 'fall', bypassArmor: true, bypass: true });
R.dead = p.dead;
R.grave = p.grave ? [p.grave.x - X, p.grave.y - Y, p.grave.z - Z, D.BLOCKS[w.getBlock(p.grave.x, p.grave.y, p.grave.z)].key] : null;
R.compass = p.inv.main.slots[0] && p.inv.main.slots[0].id;
lp.respawn();
if (p.grave) { const gr = p.grave; g.openGrave(lp, gr.x, gr.y, gr.z); }
R.back = { diamonds: p.inv.count('diamond'), chest: p.inv.armor.slots[1] && p.inv.armor.slots[1].id, compassLeft: p.inv.count('death_compass') };
// commands and WorldEdit
g.rules().commands = true;
lp.runCommand('/time set night'); R.night = g.env ? Math.round(g.meta.time) : null;
lp.runCommand('/gamerule keepInventory true'); R.keep = g.rules().keepInventory;
lp.runCommand('/daylength 20 5'); R.dayLen = [g.rules().dayMinutes, g.rules().nightMinutes];
const sx = X + 8, sz = Z + 2;
lp.we = { pos1: [sx, Y, sz], pos2: [sx + 3, Y + 2, sz + 3], clip: null, undo: [], redo: [] };
lp.runCommand('//set 50%cobblestone,50%stone'); R.weSet = w.getBlock(sx + 1, Y + 1, sz + 1) !== 0;
lp.runCommand('//replace stone glass'); R.weGlass = [...Array(4).keys()].some(i => w.getBlock(sx + i, Y, sz) === B.glass);
lp.runCommand('//undo 2'); R.weUndo = w.getBlock(sx + 1, Y + 1, sz + 1) === 0;
lp.runCommand('//walls planks'); R.weWalls = [w.getBlock(sx, Y, sz) === B.planks, w.getBlock(sx + 1, Y, sz + 1) === 0];
lp.runCommand('//undo');
const log = [...lp.el.querySelectorAll('.chat-line')].map(e => e.textContent);
R.chat = log.slice(-3);
// block damage stays, then mends
w.setBlock(X + 12, Y, Z, B.stone);
g.rememberDamage({ x: X + 12, y: Y, z: Z, id: B.stone, progress: 0.6, time: 1 });
R.damageNow = g.damageCracks({ x: X, y: Y, z: Z }).length;
R.resume = g.damageFor(X + 12, Y, Z, B.stone);
// grass creeps onto dirt
w.setBlock(X + 12, Y - 1, Z + 6, B.grass); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) w.setBlock(X + 12 + dx, Y - 1, Z + 6 + dz, B.dirt);
let spread = 0; for (let i = 0; i < 4000 && !spread; i++) { g.growExtra(X + 12, Y - 1, Z + 6, B.grass, 0, Math.random); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w.getBlock(X + 12 + dx, Y - 1, Z + 6 + dz) === B.grass) spread++; }
R.grassSpread = spread > 0;
// a sapling on the ground takes root
w.setBlock(X + 2, Y - 1, Z + 10, B.grass);
g.dropItem(D.mkStack('sapling', 1), X + 2.5, Y + 0.3, Z + 10.5, false);
const it = g.entities[g.entities.length - 1];
for (let i = 0; i < 40; i++) it.update(0.05);
it.age = 999; it.plantT = 0; it.update(0.05);
R.sapling = D.BLOCKS[w.getBlock(X + 2, Y, Z + 10)].key;
// days run slower than nights with 20/5
g.meta.time = 100; g.advanceTime(10); const dayStep = g.meta.time - 100;
g.meta.time = 700; g.advanceTime(10); const nightStep = g.meta.time - 700;
R.dayVsNight = [+dayStep.toFixed(2), +nightStep.toFixed(2)];
// torches only fix to full faces
w.setBlock(X + 14, Y, Z, B.oak_fence ?? B.fence);
const tb = w.getBlock(X + 15, Y, Z);
p.inv.main.slots[0] = D.mkStack('torch', 4); p.inv.selected = 0;
lp.placeBlock({ x: X + 14, y: Y, z: Z, nx: 1, ny: 0, nz: 0, id: w.getBlock(X + 14, Y, Z), dist: 2 }, D.itemDef('torch'), p.inv.main.slots[0]);
R.torchOnFenceSide = D.BLOCKS[w.getBlock(X + 15, Y, Z)].key;
void tb;
return R;
