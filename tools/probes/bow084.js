// 0.8.4: drawing a bow (first and third person), and the creatures' new life (resting, dying).
// Run: MODE=creative W=900 H=520 python3 tools/jsprobe.py OUT tools/probes/bow084.js flat-2
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 12; x < X + 12; x++) for (let z = Z - 16; z < Z + 8; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.grass, 0, { quiet: true }); }
p.x = X + 0.5; p.z = Z + 0.5; p.y = Y; p.yaw = 0; p.pitch = 0;
p.inv.main.slots[p.inv.selected] = D.mkStack('bow', 1);
const I = g.input; I.enabled = true; I.keys.add('Mouse2'); I.updateMoveFromKeys && I.updateMoveFromKeys();
window.__B = { X, Y, Z };
return 'drawing';
//@ wait 500
//@ shot bow_fp_half
return { pull: +(lp.bowPull || 0).toFixed(2) };
//@ wait 1500
//@ shot bow_fp_full
lp.viewMode = 3;
return { pull: +(lp.bowPull || 0).toFixed(2), held: lp.pose().held };
//@ wait 600
//@ shot bow_tp
g.input.keys.delete('Mouse2'); lp.viewMode = 0;
// creatures: a cow lying down, a ghoul going down, a wolf just out of the water
const { X, Y, Z } = window.__B;
const cow = new D.Mob(g, 'cow', X - 1.5, Y, Z - 4.5); g.addEntity(cow); cow.update = function (dt) { this.age += dt; this.onGround = true; this.walkAmt = 0; };
cow._life = { yaw: cow.yaw, turn: 0, sp: 0, acc: 0, tail: 0, tailV: 0, idle: 30, rest: 0.9, ear: 2, earK: 0 };
const gh = new D.Mob(g, 'ghoul', X + 1.8, Y, Z - 4); gh.yaw = Math.PI; g.addEntity(gh);
gh.update = function (dt) { this.age += dt; if (this.deathTime > 0) this.deathTime = Math.min(0.42, this.deathTime + dt * 0.3); };
gh.deathTime = 0.0001;
p.yaw = 0; p.pitch = -0.2;
return { cow: !!cow, bowKick: +(lp.bowKick || 0).toFixed(2), arrows: g.entities.filter(e => e.constructor.name === 'Arrow').length };
//@ wait 1500
//@ shot creatures
