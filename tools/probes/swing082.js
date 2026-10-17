// First-person swings (sword, empty hand), the left arm looking down, and the shoulder camera.
// Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/swing082.js flat-2
g.rules().daylightCycle = false; g.meta.time = 2600; g.env = g.computeEnv(0);
g.settings.viewBob = false; g.settings.heldSway = false;
p.inv.main.slots[p.inv.selected] = { id: 'iron_sword', n: 1 }; p.pitch = -0.1;
// hold the swing still for each picture
window.__hold = (v) => { const L = g.local; L.player.swinging = false; L.player.swing = v; const f = g.frame; if (!window.__of) { window.__of = f; g.frame = function (dt) { if (window.__sw !== undefined) L.player.swing = window.__sw; return window.__of.call(this, dt); }; } window.__sw = v; };
window.__hold(0);
//@ wait 1200
//@ shot sw_rest
window.__hold(0.15);
//@ wait 300
//@ shot sw_15
window.__hold(0.35);
//@ wait 300
//@ shot sw_35
window.__hold(0.6);
//@ wait 300
//@ shot sw_60
p.inv.main.slots[p.inv.selected] = null; window.__hold(0);
//@ wait 400
//@ shot fist_rest
window.__hold(0.3);
//@ wait 300
//@ shot fist_30
window.__hold(0); p.pitch = -1.2;
//@ wait 500
//@ shot look_down
p.pitch = -0.15; p.inv.main.slots[p.inv.selected] = { id: 'iron_pickaxe', n: 1 }; lp.viewMode = 1; window.__hold(0);
//@ wait 900
//@ shot shoulder
window.__hold(0.35);
//@ wait 300
//@ shot shoulder_swing
lp.viewMode = 2; window.__hold(0.3);
//@ wait 600
//@ shot behind_swing
