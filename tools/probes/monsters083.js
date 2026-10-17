// 0.8.3 monsters at work: quarrels (a skeleton's arrow starts a fight), every new monster let loose
// at night around the player for a while, and every voice rendered.
// Run: MODE=survival W=900 H=520 python3 tools/jsprobe.py OUT tools/probes/monsters083.js flat-2
g.rules().mobSpawning = false; g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 20; x < X + 20; x++) for (let z = Z - 20; z < Z + 20; z++) { for (let y = Y; y < Y + 8; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.grass, 0, { quiet: true }); }
// a skeleton, a ghoul standing between it and its target; the player far off behind a wall
const sk = new D.Mob(g, 'skeleton', X + 0.5, Y, Z - 12.5); g.addEntity(sk);
const gh = new D.Mob(g, 'ghoul', X + 0.5, Y, Z - 9.5); g.addEntity(gh);
gh.hurt(1, { attacker: sk }); sk.hurt(1, { attacker: gh });   // as if the arrow struck and the ghoul struck back
p.x = X + 0.5; p.z = Z + 15.5; p.y = Y; g.creative = false;
window.__q = { sk, gh, X, Y, Z };
return { skTarget: sk.quarrel === gh, ghTarget: gh.quarrel === sk };
//@ wait 6000
const { sk, gh } = window.__q;
return { skHp: sk.health, ghHp: gh.health, skAlive: sk.alive, ghAlive: gh.alive, dist: Math.round(Math.hypot(sk.x - gh.x, sk.z - gh.z) * 10) / 10 };
//@ wait 100
// everything at once, at night, around the player
const { X, Y, Z } = window.__q;
for (const e of g.entities.slice()) if (e instanceof D.Mob) e.remove = true;
g.meta.time = 18000; g.env = g.computeEnv(0);
const types = ['husk', 'drowned', 'stray', 'cave_spider', 'witch', 'stone_mite', 'wraith', 'magma_slime', 'raider', 'werewolf', 'ogre', 'crocodile', 'shark', 'rattlesnake', 'green_snake', 'adder', 'scorpion', 'lion', 'tiger', 'panther', 'snow_leopard', 'lioness'];
window.__ms = types.map((t, i) => { const a = i / types.length * Math.PI * 2; const m = new D.Mob(g, t, X + 0.5 + Math.cos(a) * 9, Y + (t === 'wraith' ? 1 : 0), Z + 0.5 + Math.sin(a) * 9); if (m.setSize) m.setSize(2); g.addEntity(m); return m; });
p.x = X + 0.5; p.z = Z + 0.5; p.y = Y; p.health = 20; p.dead = false;
window.__hp0 = p.health;
return { spawned: window.__ms.length };
//@ wait 7000
//@ shot night_crowd
const ms = window.__ms;
const moved = ms.filter(m => m.alive && Math.hypot(m.vx, m.vz) + (m.age > 0 ? 1 : 0) > 0).length;
return { alive: ms.filter(m => m.alive && !m.remove).length, playerHp: p.health, poison: +(p.poison || 0).toFixed(1), slow: +(p.slow || 0).toFixed(1), dead: p.dead, near: ms.filter(m => Math.hypot(m.x - p.x, m.z - p.z) < 4).map(m => m.type) };
//@ wait 100
// the Depths creatures (wisp shooting) and voices
const ctx = new (window.AudioContext || window.webkitAudioContext)();
const t0 = performance.now(), bad = [];
let n = 0;
for (const [who, set] of Object.entries(D.VOX)) for (const [kind, spec] of Object.entries(set)) {
  const list = D.sndTakes(ctx, 'test.' + who + '.' + kind, spec); n += list.length;
  for (const b of list) { const d = b.getChannelData(0); let pk = 0, nan = false; for (let i = 0; i < d.length; i++) { if (d[i] !== d[i]) { nan = true; break; } pk = Math.max(pk, Math.abs(d[i])); } if (nan || pk < 0.05) bad.push(who + '.' + kind + (nan ? ' NaN' : ' quiet')); }
}
return { takes: n, ms: Math.round(performance.now() - t0), bad: bad.slice(0, 10) };
