// item-frame wall of maps, placed on chunk-aligned ground
const { MAPS, mapCreate, newMapId } = D;
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
const X = 8, Z = 8, Y = Math.floor(p.y) + 1;
for (let x = X - 4; x <= X + 4; x++) for (let y = Y - 1; y <= Y + 6; y++) { w.setBlock(x, y, Z - 5, B.oak_planks || B.planks, 0); for (let z = Z - 4; z <= Z + 2; z++) w.setBlock(x, y, z, y === Y - 1 ? B.stone : 0, 0); }
const m = mapCreate(g, newMapId(), 0, X, Z, 0);
for (let i = 0; i < 16384; i++) if ((i & 127) < 90 && (i >> 7) > 30) m.setPixel(i, (i >> 7) > 80 ? B.water : B.grass, 64, 0x88);
const ids = [m.id, mapCreate(g, newMapId(), 0, m.x0 + 128, m.z0, 0).id, mapCreate(g, newMapId(), 0, m.x0, m.z0 + 128, 0).id, mapCreate(g, newMapId(), 0, m.x0 + 128, m.z0 + 128, 0).id];
const at = [[X - 1, Y + 2], [X, Y + 2], [X - 1, Y + 1], [X, Y + 1]];
at.forEach(([x, y], k) => { w.setBlock(x, y, Z - 4, B.item_frame, 0); w.setEntity(x, y, Z - 4, { type: 'frame', item: { id: 'filled_map', n: 1, map: ids[k] }, rot: 0 }); g.entityChanged(x, y, Z - 4); });
w.setBlock(X + 2, Y + 1, Z - 4, B.item_frame, 0); w.setEntity(X + 2, Y + 1, Z - 4, { type: 'frame', item: { id: 'diamond', n: 1 }, rot: 0 }); g.entityChanged(X + 2, Y + 1, Z - 4);
p.x = X; p.z = Z + 1; p.y = Y; p.yaw = 0; p.pitch = 0.15; p.flying = true;
p.inv.main.slots[0] = { id: 'filled_map', n: 1, map: ids[0] }; p.inv.selected = 0;
return [Y, ids.length];
//@ wait 1800
//@ shot map_wall2
p.pitch = -0.9; return 1;
//@ wait 400
//@ shot map_hold2
p.inv.offhand = { id: 'torch', n: 4 }; p.pitch = -0.5; return 1;
//@ wait 400
//@ shot map_hold_one
