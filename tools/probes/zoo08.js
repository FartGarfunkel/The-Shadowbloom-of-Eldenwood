// The 0.8 animals side by side (land, then a water tank). Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/zoo08.js flat-2
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 300; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y) + 3;
for (let x = X - 16; x < X + 18; x++) for (let z = Z - 26; z < Z + 4; z++) { for (let y = Y; y < Y + 14; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.grass, 0, { quiet: true }); }
window.__zoo = [];
const mk = (t, dx, dz, f) => { const m = new D.Mob(g, t, X + dx + 0.5, Y, Z + dz + 0.5); m.yaw = -0.35; m.T = Object.assign({}, m.T, { speed: 0, run: 0, fly: 0, swimSpeed: 0, skittish: 0, farm: false }); m.noGrav = false; if (f) f(m); g.addEntity(m); window.__zoo.push(m); return m; };
const row1 = [['horse', 'horse_chestnut'], ['horse', 'horse_dun'], ['donkey'], ['llama', 'llama_cream'], ['camel'], ['polar_bear'], ['brown_bear'], ['panda']];
row1.forEach(([t, v], i) => mk(t, -13 + i * 3.4, -16, m => { if (v) m.variant = v; }));
const row2 = [['wolf'], ['fox'], ['snow_fox'], ['raccoon'], ['cat', 'cat_tabby'], ['cat', 'cat_black'], ['ocelot'], ['goat'], ['armadillo'], ['mouse'], ['aerbunny'], ['moa']];
row2.forEach(([t, v], i) => mk(t, -12 + i * 2.2, -11, m => { if (v) m.variant = v; }));
const row3 = [['turkey'], ['duck', 'duck'], ['duck', 'mallard'], ['parrot', 'parrot_red'], ['parrot', 'parrot_blue'], ['bat'], ['bee'], ['turtle'], ['frog'], ['axolotl', 'axolotl_pink'], ['axolotl', 'axolotl_gold']];
row3.forEach(([t, v], i) => mk(t, -11 + i * 2, -7, m => { if (v) m.variant = v; }));
p.x = X + 0.5; p.z = Z + 1.5; p.y = Y + 4.5; p.yaw = 0; p.pitch = -0.32; p.flying = true; p.vx = p.vy = p.vz = 0;
return g.entities.filter(e => e instanceof D.Mob).length;
//@ wait 3500
for (const m of window.__zoo) { m.x = m.x; }
//@ shot zoo_land
// a water tank with the swimmers
for (const m of window.__zoo) m.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z) - 12, Y = Math.floor(p.y) - 5;
for (let x = X - 10; x <= X + 10; x++) for (let z = Z - 4; z <= Z + 4; z++) for (let y = Y; y < Y + 5; y++) w.setBlock(x, y, z, (x === X - 10 || x === X + 10 || z === Z - 4) ? B.glass : B.water, 0, { quiet: true });
const sw = [['cod'], ['salmon'], ['tropical_fish', 'tropical_orange'], ['tropical_fish', 'tropical_blue'], ['pufferfish'], ['pufferfish', null, true], ['squid'], ['glow_squid'], ['dolphin']];
sw.forEach(([t, v, puff], i) => { const m = new D.Mob(g, t, X - 8 + i * 2 + 0.5, Y + 2, Z + 0.5); m.yaw = -0.4; if (v) m.variant = v; m.T = Object.assign({}, m.T, { speed: 0, swimSpeed: 0, puffs: false }); if (puff) m.puffed = true; g.addEntity(m); });
p.y = Y + 3.5; p.z = Z + 7; p.pitch = -0.15;
return 'tank';
//@ wait 3000
//@ shot zoo_water
return g.entities.filter(e => e instanceof D.Mob).map(e => e.type + (e.inWater ? '~' : '')).join(',');
