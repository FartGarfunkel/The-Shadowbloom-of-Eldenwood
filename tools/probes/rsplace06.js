// Placing and using redstone parts the way a player does (placement rules, toggles, breaking).
// Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/rsplace06.js flat-2
const X = Math.floor(p.x) + 3, Z = Math.floor(p.z) - 6, Y = Math.floor(p.y);
for (let x = X - 2; x < X + 16; x++) for (let z = Z - 2; z < Z + 12; z++) { for (let y = Y; y < Y + 6; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.stone, 0, { quiet: true }); }
const H = (x, y, z, nx, ny, nz) => ({ x, y, z, nx, ny, nz, id: w.getBlock(x, y, z), dist: 3 });
const give = (k, n = 8) => { p.inv.main.slots[0] = D.mkStack(k, n); p.inv.selected = 0; return p.inv.main.slots[0]; };
const place = (k, hit) => { const h = give(k); lp.placeBlock(hit, D.itemDef(k), h); };
const key = (x, y, z) => D.BLOCKS[w.getBlock(x, y, z)].key;
const run = (n) => { for (let i = 0; i < n; i++) { g.rs.step(); g.updateEntities(0.05); } };
const R = {};
p.yaw = 0; p.pitch = 0;   // looking north (-z)
// dust from the redstone item, on the floor
place('redstone', H(X, Y - 1, Z, 0, 1, 0)); R.dust = key(X, Y, Z);
// a wall: lever on its south face, torch on its east face
w.setBlock(X + 2, Y, Z, B.stone);
place('lever', H(X + 2, Y, Z, 0, 0, 1)); R.lever = [key(X + 2, Y, Z + 1), w.getMeta(X + 2, Y, Z + 1)];
place('redstone_torch', H(X + 2, Y, Z, 1, 0, 0)); R.torch = [key(X + 3, Y, Z), w.getMeta(X + 3, Y, Z)];
run(4);
// flip the lever: the wall is powered, so the torch goes out
p.inv.main.slots[0] = null; lp.useBlockAt(H(X + 2, Y, Z + 1, 0, 0, 1), null, null); run(4);
R.leverOn = w.getMeta(X + 2, Y, Z + 1) & 8; R.torchOut = key(X + 3, Y, Z);
// break the wall: lever and torch drop off
w.setBlock(X + 2, Y, Z, 0); R.afterWall = [key(X + 2, Y, Z + 1), key(X + 3, Y, Z)];
// repeater faces the way you look; using it changes the delay
place('repeater', H(X + 5, Y - 1, Z, 0, 1, 0)); R.repeater = w.getMeta(X + 5, Y, Z) & 3;
lp.useBlockAt(H(X + 5, Y, Z, 0, 1, 0), null, null); lp.useBlockAt(H(X + 5, Y, Z, 0, 1, 0), null, null); R.repDelay = (w.getMeta(X + 5, Y, Z) >> 2) & 3;
place('comparator', H(X + 6, Y - 1, Z, 0, 1, 0)); lp.useBlockAt(H(X + 6, Y, Z, 0, 1, 0), null, null); R.compSubtract = (w.getMeta(X + 6, Y, Z) >> 2) & 1;
// piston faces the player (south), observer looks away (north), dispenser faces the player
place('piston', H(X + 8, Y - 1, Z, 0, 1, 0)); R.piston = w.getMeta(X + 8, Y, Z) & 7;
place('observer', H(X + 9, Y - 1, Z, 0, 1, 0)); R.observer = w.getMeta(X + 9, Y, Z) & 7;
p.pitch = -1.3; place('sticky_piston', H(X + 10, Y - 1, Z, 0, 1, 0)); R.stickyLookingDown = w.getMeta(X + 10, Y, Z) & 7; p.pitch = 0;
// hopper clicked on the side of a chest spouts into it
w.setBlock(X + 12, Y, Z, B.chest); w.setEntity(X + 12, Y, Z, { type: 'chest', items: new Array(27).fill(null) });
lp.player.sneaking = true; place('hopper', H(X + 12, Y, Z, -1, 0, 0)); lp.player.sneaking = false; R.hopper = [key(X + 11, Y, Z), w.getMeta(X + 11, Y, Z) & 7];
// floor button, pressed by hand, lets go after a second
place('stone_button', H(X, Y - 1, Z + 3, 0, 1, 0)); lp.useBlockAt(H(X, Y, Z + 3, 0, 1, 0), null, null); R.buttonDown = w.getMeta(X, Y, Z + 3) & 8; run(25); R.buttonUp = w.getMeta(X, Y, Z + 3) & 8;
// piston: break the head, the base goes too
w.setBlock(X + 8, Y, Z + 5, B.redstone_block); w.setBlock(X + 8, Y, Z + 4, B.piston, 2); run(6);
R.extended = [key(X + 8, Y, Z + 4), key(X + 8, Y, Z + 3)];
w.setBlock(X + 8, Y, Z + 3, 0); R.headBroken = key(X + 8, Y, Z + 4);
// minecart item on a rail, climb in, push off
for (let i = 0; i < 8; i++) w.setBlock(X + 2 + i, Y, Z + 8, B.rail, 1);
give('minecart', 1); lp.use(false, {}, false);  // not aimed at a rail: refuses
R.cartRefused = g.entities.filter(e => e.isCart).length;
const ch = give('minecart', 1); lp.placeCartItem(D.itemDef('minecart'), ch, H(X + 3, Y, Z + 8, 0, 1, 0));
const cart = g.entities.find(e => e.isCart);
R.cartPlaced = !!cart && !p.inv.main.slots[0];
cart.mount(lp); R.riding = lp.riding === cart;
p.yaw = -Math.PI / 2;  // face east
lp.boatInput = { mx: 0, mz: -1 };
for (let i = 0; i < 20; i++) cart.update(0.05);
R.cartMoved = +(cart.x - (X + 3.5)).toFixed(2); R.playerOnCart = Math.abs(p.x - cart.x) < 0.01;
cart.dismount(lp); R.offCart = lp.riding === null;
// redstone ore glows when touched, fades later
w.setBlock(X + 14, Y, Z, B.redstone_ore); lp.useBlockAt(H(X + 14, Y, Z, 0, 0, 1), null, null); R.oreLit = key(X + 14, Y, Z);
return R;
