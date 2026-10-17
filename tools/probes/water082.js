// Water poured on a lava pool, then scooped back up: does it spread like Minecraft and drain away?
// Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/water082.js flat-2
g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
const X = Math.floor(p.x) + 4, Y = Math.floor(p.y), Z = Math.floor(p.z);
for (let x = X - 14; x < X + 15; x++) for (let z = Z - 14; z < Z + 15; z++) { for (let y = Y; y < Y + 6; y++) w.setBlock(x, y, z, 0, 0, { quiet: true, noFluid: true }); for (let y = Y - 4; y < Y; y++) w.setBlock(x, y, z, B.stone, 0, { quiet: true, noFluid: true }); }
// a 5x5 lava pool, one deep, in the ground
for (let x = X - 2; x <= X + 2; x++) for (let z = Z - 2; z <= Z + 2; z++) w.setBlock(x, Y - 1, z, B.lava, 0, { quiet: true, noFluid: true });
window.__W = { X, Y, Z, log: [], changes: 0 };
const base = w.onAnyChange;
w.onAnyChange = function (x, y, z, o, n, opts) { window.__W.changes++; if (n === B.water && y > window.__W.Y && !window.__W.up && Math.abs(x - window.__W.X) < 15 && Math.abs(z - window.__W.Z) < 15) window.__W.up = [x - window.__W.X, y - window.__W.Y, z - window.__W.Z, w.getMeta(x, y, z), new Error().stack.split('\n').slice(1, 9).join(' | ')]; if (window.__W.track) window.__W.track.push([x - window.__W.X, y - window.__W.Y, z - window.__W.Z, o, n, w.getMeta(x, y, z)]); if (base) return base.apply(this, arguments); };
window.__count = () => {
  const { X, Y, Z } = window.__W; const c = { water: 0, src: 0, lava: 0, obsidian: 0, cobble: 0, stone: 0 };
  for (let x = X - 14; x < X + 15; x++) for (let z = Z - 14; z < Z + 15; z++) for (let y = Y - 2; y < Y + 3; y++) {
    const id = w.getBlock(x, y, z);
    if (id === B.water) { c.water++; if ((w.getMeta(x, y, z) & 15) === 0) c.src++; }
    else if (id === B.lava) c.lava++; else if (id === B.obsidian) c.obsidian++; else if (id === B.cobblestone) c.cobble++;
  }
  c.q = w.fluidQ.size; c.up = window.__W.up;
  if (window.__W.map) { const rows = []; for (let z = Z - 12; z <= Z + 12; z++) { let r = ''; for (let x = X - 14; x <= X + 14; x++) { const id = w.getBlock(x, Y, z), m = w.getMeta(x, Y, z); r += id === B.water ? (m & 8 ? 'F' : (m & 7) === 0 ? 'S' : String(m & 7)) : id === 0 ? '.' : '#'; } rows.push(r); } c.map = '\n' + rows.join('\n'); } c.changes = window.__W.changes; window.__W.changes = 0; return c;
};
return window.__count();
//@ wait 1500
// pour a bucket of water into the edge of the pool, as the bucket does
const { X, Y, Z } = window.__W; w.setBlock(X - 3, Y, Z, B.water, 0); return window.__count();
//@ wait 3000
return window.__count();
//@ wait 3000
return window.__count();
//@ wait 4000
//@ shot water_spread
window.__W.track = []; return window.__count();
//@ wait 3000
return [window.__W.track.length, JSON.stringify(window.__W.track.slice(0, 30))];
//@ wait 100
// scoop the source back up
window.__W.map = true;
const { X, Y, Z } = window.__W; const m = w.getMeta(X - 3, Y, Z); w.setBlock(X - 3, Y, Z, 0); return ['scooped meta', m, window.__count()];
//@ wait 3000
return window.__count();
//@ wait 3000
return window.__count();
//@ wait 6000
//@ shot water_after
return window.__count();
//@ wait 6000
return window.__count();
