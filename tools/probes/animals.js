const X = p.x, Z = p.z, Y = p.y;
const give = (k, n = 1) => { p.inv.main.slots[0] = D.mkStack(k, n); p.inv.selected = 0; return p.inv.main.slots[0]; };
const mk = (t, dx, dz) => { const m = new D.Mob(g, t, X + dx, Y + 0.2, Z + dz); m.yaw = Math.PI; g.addEntity(m); return m; };
const c1 = mk('cow', -2, -4), c2 = mk('cow', -1, -4.5), sh = mk('sheep', 1, -4), pg2 = mk('pig', 3, -4), ch = mk('chicken', 2, -3);
const sh2 = mk('sheep', 0, -6); sh2.color = 'blue';
window.__A = { c1, c2, sh, pg2, ch, sh2 };
let held = give('wheat', 8);
const R = {};
R.feed1 = lp.useOnAnimal(c1, held, D.itemDef('wheat')); R.feed2 = lp.useOnAnimal(c2, held, D.itemDef('wheat'));
R.love = [c1.loveT, c2.loveT];
held = give('bucket'); R.milk = lp.useOnAnimal(c1, held, D.itemDef('bucket')); R.milkItem = p.inv.main.slots[0] && p.inv.main.slots[0].id;
held = give('shears'); const n0 = g.entities.length; R.shear = lp.useOnAnimal(sh, held, D.itemDef('shears')); R.sheared = sh.sheared; R.wool = g.entities.slice(n0).map(e => e.stack && e.stack.id + 'x' + e.stack.n);
held = give('red_dye'); R.dye = lp.useOnAnimal(pg2, held, D.itemDef('red_dye'));
g.meta.time = 300; p.pitch = -0.25; p.yaw = 0;
return R;
//@ wait 6000
//@ shot animals1
const A = window.__A;
const babies = g.entities.filter(e => e.baby).map(e => e.type);
g.storeAnimals();
return { babies, love: [A.c1.loveT, A.c2.loveT], kept: (g.meta.animals[g.dim] || []).map(a => a.t + (a.b ? '(baby)' : '')), d: Math.hypot(A.c1.x - A.c2.x, A.c1.z - A.c2.z).toFixed(2) };
