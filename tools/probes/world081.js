// 0.8.1 systems: sounds and music don't throw, weather (rain, puddles, snow, lightning), his traces, animal AI over time.
// Run: python3 tools/jsprobe.py OUT tools/probes/world081.js flat-2
const R = {};
const s = g.sfx; s.unlock();
const names = ['moo','oink','baa','cluck','boar','deer','rabbit','horse','donkey','llama','spit','camel','moa','wolf','wolf_angry','wolf_howl','fox','raccoon','cat','cat_purr','cat_angry','bear','bear_angry','panda','goat','armadillo','mouse','turkey','duck','parrot','bat','bee','bee_angry','squid','fish','flop','puff','dolphin','turtle','axolotl','frog','ghoul','rattle','spider','squish','fuseling','player',
  'cave_dig','cave_steps','cave_scrape','cave_whisper','cave_moan','cave_breath','cave_creak','cave_drone','cave_pebbles','thunder','thunder_far','lava_pop','fire_crackle','splash_small','hurt'];
const errs = [];
for (const n of names) for (const k of ['', '_hurt', '_death']) { try { s.last = {}; s.playAt(n + k, p.x + 3, p.y, p.z); } catch (e) { errs.push(n + k + ': ' + e.message); } }
R.soundErrors = errs.slice(0, 5); R.ctx = !!s.ctx;
// music: a piece in every mood
try { for (const mood of Object.keys(MUSIC_MOODS_KEYS = ['day','night','cave','sky','depths','menu','creative'])) {} } catch (e) {}
const m = g.music; let notes = {};
for (const mood of ['day','night','cave','sky','depths','menu','creative']) { m.play(mood); notes[mood] = m.notes.length; m.schedule(); }
m.stop(); R.music = notes;
// weather
g.rules().daylightCycle = false; g.meta.time = 300;
g.weather.set('thunder', 600); g.weather.rain = 1; g.weather.thunderK = 1;
return R;
//@ wait 3000
const W = g.weather;
const R = { rain: +W.rain.toFixed(2), drops: W.drops.length, envDay: +g.env.day.toFixed(2), raining: g.env.raining };
for (let i = 0; i < 80; i++) W.groundTick();
let puddles = 0; const X = Math.floor(p.x), Z = Math.floor(p.z);
for (let x = X - 30; x < X + 30; x++) for (let z = Z - 30; z < Z + 30; z++) { const t = W.topAt(x, z); if (w.getBlock(x, t, z) === D.B.puddle) puddles++; }
R.puddles = puddles;
W.strike(X + 6, W.topAt(X + 6, Z), Z);
R.bolt = g.entities.some(e => e.constructor.name === 'LightningBolt');
R.flash = W.flashT > 0;
window.__R = R;
return R;
//@ shot rain
//@ wait 200
// dry out: clear weather, then the puddles' random ticks
const W = g.weather; W.set('clear', 999); W.rain = 0; W.thunderK = 0;
const X = Math.floor(p.x), Z = Math.floor(p.z);
let left = 0;
for (let k = 0; k < 200; k++) for (const c of w.chunks.values()) { if (!c.tickables) continue; for (const i of c.tickables) { const id = c.blocks[i]; if (id === D.B.puddle) { const x = c.cx * 16 + (i & 15), z = c.cz * 16 + ((i >> 4) & 15), y = i >> 8; W.blockTick(x, y, z, id, 0, Math.random); } } }
for (let x = X - 30; x < X + 30; x++) for (let z = Z - 30; z < Z + 30; z++) { const t = W.topAt(x, z); if (w.getBlock(x, t, z) === D.B.puddle) left++; }
// snow: pretend this place is cold
const pa = W.precipAt.bind(W); W.precipAt = () => 'snow'; W.set('rain', 600); W.rain = 1;
for (let i = 0; i < 120; i++) W.groundTick();
let snow = 0; for (let x = X - 30; x < X + 30; x++) for (let z = Z - 30; z < Z + 30; z++) { const t = W.topAt(x, z); if (w.getBlock(x, t, z) === D.B.snow_layer) snow++; }
W.precipAt = pa; W.set('clear', 999); W.rain = 0;
// his traces
const H = g.haunt; const tr = { tunnel: 0, sign: 0, strip: 0, swap: 0 };
for (let i = 0; i < 6; i++) { if (H.digTunnel()) tr.tunnel++; if (H.placeSign()) tr.sign++; if (H.stripTree()) tr.strip++; }
// a sighting
let seen = null; for (const mode of ['far','peek','behind','cave']) { const sp = H.findSpot(mode); if (sp && !seen) seen = mode; }
return { puddlesLeft: left, snow, traces: tr, sightingSpot: seen };
//@ wait 200
// animals living for a while
g.rules().mobSpawning = true;
for (let i = 0; i < 400; i++) g.spawnMobs();
const before = g.entities.filter(e => e instanceof D.Mob).map(e => [e, e.x, e.z]);
let err = null;
try { for (let i = 0; i < 400; i++) { g.updateEntities(0.05); g.entities = g.entities.filter(e => !e.remove); } } catch (e) { err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
const mobs = g.entities.filter(e => e instanceof D.Mob);
const fishOut = mobs.filter(e => e.T.water && !e.inWater).map(e => e.type);
const moved = before.filter(([e, x, z]) => !e.remove && Math.hypot(e.x - x, e.z - z) > 1).length;
const byType = {}; for (const e of mobs) byType[e.type] = (byType[e.type] || 0) + 1;
return { err, mobs: mobs.length, moved, fishOut, roosting: mobs.filter(e => e.roosting).length, byType };
