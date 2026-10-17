// Herobrine check: the hidden /herobrine command shows him; /herobrine trace leaves something behind.
// Run: MODE=survival python3 tools/jsprobe.py OUT tools/probes/haunt082.js probe-1
g.rules().daylightCycle = false; g.meta.time = 900; g.env = g.computeEnv(0);
lp.runCommand('/herobrine');
const wch = g.entities.find(e => e.constructor && e.constructor.name === 'Watcher');
window.__w = wch;
return { watcher: !!wch, mode: wch && wch.mode, dist: wch ? Math.round(Math.hypot(wch.x - p.x, wch.z - p.z)) : null };
//@ wait 300
const wch = window.__w; if (wch) { let best = 0, bd = -2; for (let a = 0; a < Math.PI * 2; a += 0.02) { p.yaw = a; const l = p.look(), dx = wch.x - p.x, dz = wch.z - p.z, d = Math.hypot(dx, dz); const dot = (l[0] * dx + l[2] * dz) / d; if (dot > bd) { bd = dot; best = a; } } p.yaw = best; p.pitch = 0; }
//@ wait 150
//@ shot herobrine_seen
//@ wait 4000
return { stillThere: window.__w ? !window.__w.remove : null, noticed: g.haunt.noticed };
//@ wait 100
const before = g.meta.flags.watcherTraces || 0; let tries = 0;
while ((g.meta.flags.watcherTraces || 0) === before && tries < 10) { lp.runCommand('/herobrine trace'); tries++; }
return { traces: (g.meta.flags.watcherTraces || 0) - before, tries };
