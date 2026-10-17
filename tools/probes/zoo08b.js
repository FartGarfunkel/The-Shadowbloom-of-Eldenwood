// Close-ups of the 0.8 animals in groups of four, standing still. Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/zoo08b.js flat-2
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 300; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y) + 30;
for (let x = X - 8; x < X + 9; x++) for (let z = Z - 10; z < Z + 4; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.grass, 0, { quiet: true }); }
window.__base = [X, Y, Z];
window.__show = (list) => {
  for (const e of g.entities) if (e instanceof D.Mob) e.remove = true;
  const [X, Y, Z] = window.__base;
  list.forEach(([t, v, f], i) => { const m = new D.Mob(g, t, X - 4.5 + i * 3 + 0.5, Y, Z - 5 + 0.5); if (v) m.variant = v; m.yaw = window.__yaw ?? -2.0; m.onGround = true; if (f) f(m); m.update = function (dt) { this.age += dt; this.onGround = true; }; g.addEntity(m); });
  p.x = X + 0.5; p.z = Z + 0.5; p.y = Y + 0.6; p.yaw = 0; p.pitch = -0.12; p.flying = true; p.vx = p.vy = p.vz = 0;
};
window.__show([['horse', 'horse_chestnut'], ['donkey'], ['llama', 'llama_brown'], ['camel']]);
return 'ok';
//@ wait 3000
//@ shot g1
window.__show([['polar_bear'], ['brown_bear'], ['panda'], ['goat']]);
//@ wait 800
//@ shot g2
window.__show([['wolf'], ['fox'], ['raccoon'], ['cat', 'cat_tabby']]);
//@ wait 800
//@ shot g3
window.__show([['ocelot'], ['armadillo'], ['mouse'], ['aerbunny']]);
//@ wait 800
//@ shot g4
window.__show([['turkey', null, m => m.displayT = 9], ['duck', 'mallard'], ['parrot', 'parrot_green'], ['moa']]);
//@ wait 800
//@ shot g5
window.__show([['bat'], ['bee'], ['turtle'], ['frog']]);
//@ wait 800
//@ shot g6
window.__show([['axolotl', 'axolotl_pink'], ['armadillo', null, m => m.curled = true], ['wolf', null, m => m.sitting = true], ['cat', 'cat_black', m => m.sleeping = true]]);
//@ wait 800
//@ shot g7
