// 0.8.6.2: paper maps — make one, explore, hold it, frame a wall of them, look closely, craft copies and zoom.
// Run: W=900 H=520 python3 tools/jsprobe.py OUT tools/probes/maps0862.js maps-1
const { MAPS, encodeMap, decodeMap, mapCreate, newMapId, canMerge, normalizeStack, InputManager, matchGrid } = D;
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
p.inv.main.slots[0] = { id: 'empty_map', n: 3 }; p.inv.selected = 0;
p.pitch = 1.3; lp.target = null; lp.targetEnt = null;
lp.use(false, InputManager.blankState());
const s = p.inv.main.slots[0], s2 = p.inv.main.slots.find(x => x && x.id === 'filled_map');
window.__M = { id: (s2 || s).map };
return [JSON.stringify(s), JSON.stringify(s2), typeof MAPS, D.matchGrid ? 'mg' : 'nomg'];
//@ wait 3000
const { MAPS, encodeMap, decodeMap, mapCreate, newMapId, canMerge, normalizeStack, InputManager, matchGrid } = D;
const id = window.__M.id, m = MAPS.all.get(id);
p.inv.main.slots[0] = p.inv.main.slots.find(x => x && x.id === 'filled_map'); 
return m ? [m.x0, m.z0, m.scale, +(m.explored() * 100).toFixed(1), MAPS._warned || 0, Math.round(p.x), Math.round(p.z)] : 'no map';
//@ wait 1500
const { MAPS, encodeMap, decodeMap, mapCreate, newMapId, canMerge, normalizeStack, InputManager, matchGrid } = D;
p.pitch = 0; p.yaw = 0;
const m = MAPS.all.get(window.__M.id);
return [+(m.explored() * 100).toFixed(1), p.inv.held && p.inv.held.id];
//@ shot map_hold_level
p.pitch = -0.85;
return 1;
//@ wait 300
//@ shot map_hold_down
const { MAPS, encodeMap, decodeMap, mapCreate, newMapId, canMerge, normalizeStack, InputManager, matchGrid } = D;
// crafting: copies and zoom
const id = window.__M.id, fm = { id: 'filled_map', n: 1, map: id }, P = { id: 'paper', n: 1 };
const c = matchGrid([fm, { id: 'empty_map', n: 1 }, null, null], 2);
const z = matchGrid([P, P, P, P, fm, P, P, P, P], 3);
const made = z && z.make ? z.make() : null, zm = made && MAPS.all.get(made.map);
const bad = matchGrid([fm, P, null, null], 2);
// round trip through the save record
const m = MAPS.all.get(id), rec = encodeMap(m), back = decodeMap(rec);
let same = 0; for (let i = 0; i < 16384; i++) if (back.ids[i] === m.ids[i] && back.h[i] === m.h[i] && back.cl[i] === m.cl[i]) same++;
return { copy: c && [c.out, c.n, c.extra], zoom: zm && [zm.scale, zm.x0, zm.z0, +(zm.explored() * 100).toFixed(1)], bad, same, recLen: JSON.stringify(rec).length,
  merge: [canMerge({ id: 'filled_map', n: 1, map: 'a' }, { id: 'filled_map', n: 1, map: 'b' }), canMerge({ id: 'filled_map', n: 1, map: 'a' }, { id: 'filled_map', n: 1, map: 'a' })],
  norm: JSON.stringify(normalizeStack({ id: 'filled_map', n: 1, map: id })) };
//@ wait 100
const { MAPS, encodeMap, decodeMap, mapCreate, newMapId, canMerge, normalizeStack, InputManager, matchGrid } = D;
// a wall of four maps in item frames: this one, and the maps either side of it (blank so far)
const m = MAPS.all.get(window.__M.id);
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 3; x <= X + 3; x++) for (let y = Y; y <= Y + 5; y++) { w.setBlock(x, y, Z - 5, B.oak_planks || B.planks, 0, { quiet: true }); for (let z = Z - 4; z <= Z; z++) w.setBlock(x, y, z, 0, 0, { quiet: true }); }
const ids = [m.id, mapCreate(g, newMapId(), 0, m.x0 + 128, m.z0, 0).id, mapCreate(g, newMapId(), 0, m.x0, m.z0 + 128, 0).id, mapCreate(g, newMapId(), 0, m.x0 + 128, m.z0 + 128, 0).id];
const at = [[X - 1, Y + 3], [X, Y + 3], [X - 1, Y + 2], [X, Y + 2]];
at.forEach(([x, y], k) => { w.setBlock(x, y, Z - 4, B.item_frame, 0, { quiet: true }); w.setEntity(x, y, Z - 4, { type: 'frame', item: { id: 'filled_map', n: 1, map: ids[k] }, rot: 0 }); g.entityChanged(x, y, Z - 4); });
w.setBlock(X + 2, Y + 2, Z - 4, B.item_frame, 0, { quiet: true }); w.setEntity(X + 2, Y + 2, Z - 4, { type: 'frame', item: { id: 'diamond', n: 1 }, rot: 0 });
p.inv.main.slots[0] = null; p.x = X + 0.0; p.z = Z - 1.2; p.y = Y; p.yaw = 0; p.pitch = 0.25; p.flying = true;
return ids;
//@ wait 1500
//@ shot map_wall
p.inv.main.slots[0] = { id: 'filled_map', n: 1, map: window.__M.id };
lp.openMapView(p.inv.main.slots[0]);
return [lp.mode, !!document.querySelector('.mapview')];
//@ wait 600
//@ shot map_view
const { MAPS, encodeMap, decodeMap, mapCreate, newMapId, canMerge, normalizeStack, InputManager, matchGrid } = D;
lp.mapView.close();
return [lp.mode, !!document.querySelector('.mapview'), MAPS._warned || 0];
