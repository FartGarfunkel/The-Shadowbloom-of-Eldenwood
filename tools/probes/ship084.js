// 0.8.4: the sailing ship (board it, walk the deck, take the wheel) and loading boats.
// Run: MODE=creative W=900 H=520 python3 tools/jsprobe.py OUT tools/probes/ship084.js flat-2
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob || e.isBoat) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 24; x < X + 24; x++) for (let z = Z - 40; z < Z + 10; z++) { for (let y = Y; y < Y + 12; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); for (let y = Y - 4; y < Y; y++) w.setBlock(x, y, z, B.water, 0, { quiet: true }); w.setBlock(x, Y - 5, z, B.sand, 0, { quiet: true }); }
for (let x = X - 24; x < X + 24; x++) for (let z = Z + 4; z < Z + 10; z++) w.setBlock(x, Y - 1, z, B.sand, 0, { quiet: true });
const ship = new D.Boat(g, 'ship', X + 0.5, Y - 0.4, Z - 8, 0); g.addEntity(ship);
const boat = new D.Boat(g, 'rowboat', X + 6.5, Y - 0.4, Z - 2, 0.5); g.addEntity(boat);
// a chest with things in it goes in the rowboat
w.setBlock(X + 4, Y, Z + 5, B.chest, 0); w.setEntity(X + 4, Y, Z + 5, { type: 'chest', items: [D.mkStack('gold_ingot', 7), ...new Array(26).fill(null)] });
lp.pickUpBlock(X + 4, Y, Z + 5); lp.targetEnt = boat; lp.placeCarried();
const boatChest = { items: !!boat.items, gold: boat.items && boat.items[0] && boat.items[0].n };
p.x = X + 0.5; p.z = Z + 6.5; p.y = Y; p.yaw = 0; p.pitch = -0.1;
window.__S = { X, Y, Z, ship, boat };
return { boatChest };
//@ wait 1500
//@ shot ship_outside
const { ship } = window.__S;
// climb aboard
lp.targetEnt = ship; ship.mount(lp);
const aboard1 = lp.aboard === ship, dy = +(p.y - ship.y).toFixed(2);
return { aboard1, deckHeight: dy };
//@ wait 600
// walk forward along the deck toward the bow for a second
g.input.enabled = true; g.input.keys.add('KeyW'); if (g.input.updateMoveFromKeys) g.input.updateMoveFromKeys();
//@ wait 1200
g.input.keys.delete('KeyW'); if (g.input.updateMoveFromKeys) g.input.updateMoveFromKeys();
const { ship } = window.__S;
return { stillAboard: lp.aboard === ship, onDeck: Math.abs(p.y - (ship.y + 1.3)) < 0.05 };
//@ wait 300
// take the wheel and sail
const { ship } = window.__S;
const [hx, hz] = [ship.x - Math.sin(ship.yaw) * 3.2, ship.z - Math.cos(ship.yaw) * 3.2];
const c = Math.cos(ship.yaw), n = Math.sin(ship.yaw); p.x = ship.x + 0 * c + 3.6 * n; p.z = ship.z - 0 * n + 3.6 * c; p.y = ship.y + 1.3;
p.inv.held = null; p.inv.main.slots[p.inv.selected] = null; lp.use(false, {}, false);
const atWheel = lp.riding === ship;
ship.sail = 1; g.wind = g.wind || {}; g.wind.dir = ship.yaw + Math.PI / 2; g.wind.strength = 0.9;
window.__z0 = [ship.x, ship.z];
lp.viewMode = 2;
return { atWheel };
//@ wait 2500
//@ shot ship_sailing
const { ship } = window.__S;
const moved = Math.round(Math.hypot(ship.x - window.__z0[0], ship.z - window.__z0[1]) * 10) / 10;
const helmOk = lp.riding === ship;
// let go of the wheel: still on deck; the ship keeps going and carries you
ship.dismount(lp);
const x0 = p.x, z0 = p.z;
return { moved, helmOk, aboardAfter: lp.aboard === ship };
//@ wait 1500
const { ship } = window.__S;
return { carried: Math.round(Math.hypot(p.x - (window.__x0 || 0), 0) * 0) + 1, stillAboard: lp.aboard === ship, onDeck: Math.abs(p.y - (ship.y + 1.3)) < 0.1, speed: +ship.speed.toFixed(1) };
//@ wait 100
lp.viewMode = 0; p.pitch = -0.35;
//@ wait 600
//@ shot ship_deck
