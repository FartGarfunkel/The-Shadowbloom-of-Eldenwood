// Functional checks for the 0.5 blocks. Run: python3 tools/jsprobe.py OUT tools/probes/blocks05.js
const X = Math.floor(p.x) + 2, Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 3; x < X + 12; x++) for (let z = Z - 6; z < Z + 6; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.stone, 0, { quiet: true }); }
window.__T = { X, Y, Z };
const H = (x, y, z, nx, ny, nz) => ({ x, y, z, nx, ny, nz, id: w.getBlock(x, y, z), dist: 2.5 });
const give = (k, n = 1) => { p.inv.main.slots[0] = D.mkStack(k, n); p.inv.selected = 0; return p.inv.main.slots[0]; };
const place = (k, hit) => { const h = give(k, 4); lp.placeBlock(hit, D.itemDef(k), h); };
const use = (hit, k, n = 1) => { const h = k ? give(k, n) : (p.inv.main.slots[0] = null); lp.use(false, {}, false); };
const R = {};
// candles: place, stack, light, put out
place('red_candle', H(X, Y - 1, Z, 0, 1, 0)); R.candle1 = [w.getBlock(X, Y, Z) === B.red_candle, w.getMeta(X, Y, Z)];
place('red_candle', H(X, Y, Z, 0, 1, 0)); R.candle2 = w.getMeta(X, Y, Z);
let held = give('flint_and_steel'); R.lit = lp.useBlockAt(H(X, Y, Z, 0, 1, 0), held, D.itemDef('flint_and_steel')); R.candleMeta = w.getMeta(X, Y, Z); R.candleLight = D.metaLight(B.red_candle, w.getMeta(X, Y, Z));
p.inv.main.slots[0] = null; lp.useBlockAt(H(X, Y, Z, 0, 1, 0), null, null); R.outMeta = w.getMeta(X, Y, Z);
// cake
place('cake', H(X + 1, Y - 1, Z, 0, 1, 0)); p.health = 10; p.inv.main.slots[0] = null; lp.useBlockAt(H(X + 1, Y, Z, 0, 1, 0), null, null); R.cake = [w.getBlock(X + 1, Y, Z) === B.cake, w.getMeta(X + 1, Y, Z), p.health];
// composter
place('composter', H(X + 2, Y - 1, Z, 0, 1, 0));
for (let i = 0; i < 60 && (w.getMeta(X + 2, Y, Z) & 15) < 8; i++) { held = give('melon', 1); lp.useBlockAt(H(X + 2, Y, Z, 0, 1, 0), held, D.itemDef('melon')); }
R.compostLevel = w.getMeta(X + 2, Y, Z) & 15;
const ents0 = g.entities.length; p.inv.main.slots[0] = null; lp.useBlockAt(H(X + 2, Y, Z, 0, 1, 0), null, null); R.compostAfter = [w.getMeta(X + 2, Y, Z) & 15, g.entities.slice(ents0).map(e => e.stack && e.stack.id)];
// jukebox
place('jukebox', H(X + 3, Y - 1, Z, 0, 1, 0)); held = give('music_disc_ember'); lp.useBlockAt(H(X + 3, Y, Z, 0, 1, 0), held, D.itemDef('music_disc_ember')); R.juke = w.getEntity(X + 3, Y, Z);
// ender chest
lp.openInventory('container', { ender: true }); R.enderTitle = lp.inv.container() && lp.inv.container().title; lp.inv.container().items[0] = D.mkStack('diamond', 3); lp.closeInventory(); R.ender = p.inv.ender.slots[0];
// stations
R.anvil = D.stationResult('anvil', Object.assign(D.mkStack('iron_pickaxe'), { d: 200 }), D.mkStack('iron_ingot', 5));
R.anvil2 = D.stationResult('anvil', Object.assign(D.mkStack('iron_pickaxe'), { d: 200 }), Object.assign(D.mkStack('iron_pickaxe'), { d: 100 }));
R.loom = D.stationResult('loom', D.mkStack('wool', 10), D.mkStack('red_dye', 1));
R.loom2 = D.stationResult('loom', D.mkStack('glass_pane', 3), D.mkStack('blue_dye', 1));
R.smith = D.stationResult('smithing', Object.assign(D.mkStack('diamond_sword'), { d: 100 }), D.mkStack('cinderite_shard', 1));
R.fletch = D.stationResult('fletching', D.mkStack('feather', 2), D.mkStack('flint', 2));
// bone meal on a crop and on grass
w.setBlock(X + 4, Y - 1, Z, B.farmland); w.setBlock(X + 4, Y, Z, B.wheat_crop, 0);
held = give('bone_meal', 5); lp.useBonemeal(H(X + 4, Y, Z, 0, 1, 0), held); R.wheat = w.getMeta(X + 4, Y, Z);
for (let x = X + 5; x < X + 10; x++) for (let z = Z - 3; z < Z + 3; z++) w.setBlock(x, Y - 1, z, B.grass);
held = give('bone_meal', 5); lp.useBonemeal(H(X + 7, Y - 1, Z, 0, 1, 0), held);
let flora = 0; for (let x = X + 5; x < X + 10; x++) for (let z = Z - 3; z < Z + 3; z++) if (w.getBlock(x, Y, z)) flora++; R.bloom = flora;
// bamboo grows
place('bamboo', H(X + 5, Y - 1, Z - 3, 0, 1, 0)); R.bambooPlaced = w.getBlock(X + 5, Y, Z - 3) === B.bamboo;
for (let i = 0; i < 400; i++) for (let y = Y; y < Y + 14; y++) if (w.getBlock(X + 5, y, Z - 3) === B.bamboo) g.growExtra(X + 5, y, Z - 3, B.bamboo, 0, Math.random);
let bh = 0; while (w.getBlock(X + 5, Y + bh, Z - 3) === B.bamboo) bh++; R.bambooHeight = bh;
// item frame on a wall, with an item; breaking the wall drops both
w.setBlock(X, Y, Z - 4, B.stone); place('item_frame', H(X, Y, Z - 4, 0, 0, 1)); R.frame = [w.getBlock(X, Y, Z - 3) === B.item_frame, w.getMeta(X, Y, Z - 3)];
held = give('diamond', 1); lp.useBlockAt(H(X, Y, Z - 3, 0, 0, 1), held, D.itemDef('diamond')); R.frameItem = w.getEntity(X, Y, Z - 3);
const ents1 = g.entities.length; w.setBlock(X, Y, Z - 4, 0); R.frameBroke = [w.getBlock(X, Y, Z - 3), g.entities.slice(ents1).map(e => e.stack && e.stack.id)];
// cocoa on a jungle log
w.setBlock(X + 2, Y, Z - 4, B.jungle_log); held = give('cocoa_beans', 3); R.cocoa = lp.plantItem(D.itemDef('cocoa_beans'), H(X + 2, Y, Z - 4, 0, 0, 1), held) && [w.getBlock(X + 2, Y, Z - 3) === B.cocoa, w.getMeta(X + 2, Y, Z - 3)];
// nether wart on soul sand
w.setBlock(X + 3, Y - 1, Z - 4, B.soul_sand); held = give('nether_wart_item', 3); lp.plantItem(D.itemDef('nether_wart_item'), H(X + 3, Y - 1, Z - 4, 0, 1, 0), held); R.wart = w.getBlock(X + 3, Y, Z - 4) === B.nether_wart;
// hanging vines fall when their ceiling goes
w.setBlock(X + 8, Y + 4, Z + 4, B.stone); place('weeping_vines', H(X + 8, Y + 4, Z + 4, 0, -1, 0)); place('weeping_vines', H(X + 8, Y + 3, Z + 4, 0, -1, 0));
R.vines = [w.getBlock(X + 8, Y + 3, Z + 4) === B.weeping_vines, w.getBlock(X + 8, Y + 2, Z + 4) === B.weeping_vines];
w.setBlock(X + 8, Y + 4, Z + 4, 0); R.vinesAfter = [w.getBlock(X + 8, Y + 3, Z + 4), w.getBlock(X + 8, Y + 2, Z + 4)];
// pointed dripstone hanging, end rod sideways, dirt path with a shovel
w.setBlock(X + 9, Y + 3, Z + 4, B.stone); place('pointed_dripstone', H(X + 9, Y + 3, Z + 4, 0, -1, 0)); R.drip = w.getMeta(X + 9, Y + 2, Z + 4);
w.setBlock(X + 10, Y, Z + 4, B.stone); place('end_rod', H(X + 10, Y, Z + 4, -1, 0, 0)); R.rod = [w.getBlock(X + 9, Y, Z + 4) === B.end_rod, w.getMeta(X + 9, Y, Z + 4)];
held = give('iron_shovel'); lp.useBlockAt(H(X + 9, Y - 1, Z - 2, 0, 1, 0), held, D.itemDef('iron_shovel')); R.path = D.BLOCKS[w.getBlock(X + 9, Y - 1, Z - 2)].key;
// a bow: shoot an arrow at a wall
held = give('bow'); p.inv.main.slots[1] = D.mkStack('arrow', 5); p.yaw = -Math.PI / 2; p.pitch = 0; lp.shootArrow(1);
R.arrowCount = p.inv.count('arrow'); R.arrows = g.entities.filter(e => e.constructor.name === 'Arrow').length;
return R;
//@ wait 2500
return { arrows: g.entities.filter(e => e.constructor.name === 'Arrow').map(e => ({ stuck: e.stuck, x: +e.x.toFixed(1), y: +e.y.toFixed(1) })), errors: (window.__errs || []).slice(0, 3) };
