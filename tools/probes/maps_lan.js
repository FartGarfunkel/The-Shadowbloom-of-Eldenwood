//@ H
const { MAPS, mapCreate } = D;
mapCreate(g, 'testmap01', 0, p.x, p.z, 0);
p.inv.main.slots[0] = { id: 'filled_map', n: 1, map: 'testmap01' }; p.inv.selected = 0;
return 1;
//@ wait 4000
//@ H
const m = D.MAPS.all.get('testmap01'); return +(m.explored() * 100).toFixed(1);
//@ G
p.inv.main.slots[0] = { id: 'filled_map', n: 1, map: 'testmap01' }; p.inv.selected = 0;
return 1;
//@ wait 3000
//@ G
const m = D.MAPS.all.get('testmap01'); const g2 = D.mapCreate(g, 'guestmap1', 0, p.x, p.z, 0); p.inv.main.slots[1] = { id: 'filled_map', n: 1, map: 'guestmap1' }; p.inv.selected = 1;
return m ? +(m.explored() * 100).toFixed(1) : 'none';
//@ wait 4000
//@ G
g.meta.mapPins = [{ d: 0, x: 5, z: 6, c: 1 }]; D.mapPinsChanged(g); const m = D.MAPS.all.get('guestmap1'); return +(m.explored() * 100).toFixed(1);
//@ wait 2500
//@ H
const m = D.MAPS.all.get('guestmap1'); await g.saveNow();
return [m ? +(m.explored() * 100).toFixed(1) : 'none', JSON.stringify(g.meta.mapPins), !!g.records.get('map~guestmap1'), !!g.records.get('map~testmap01')];
