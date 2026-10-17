// First-person hands: what you hold sits in your fist. Run: MODE=creative python3 tools/jsprobe.py OUT tools/probes/hands08.js flat-2
g.rules().daylightCycle = false; g.meta.time = 300; g.env = g.computeEnv(0); g.settings.viewBob = false;
p.inv.held = D.mkStack('iron_sword', 1); p.inv.offhand = null; p.pitch = -0.1;
return 'ok';
//@ wait 1500
//@ shot hand_sword
p.inv.held = D.mkStack('cobblestone', 10);
//@ wait 300
//@ shot hand_block
p.inv.held = D.mkStack('torch', 10); p.inv.offhand = D.mkStack('torch', 3);
//@ wait 500
//@ shot hand_torches
p.inv.held = D.mkStack('compass', 1); p.inv.offhand = D.mkStack('clock', 1);
//@ wait 500
//@ shot hand_instruments
p.inv.held = D.mkStack('iron_pickaxe', 1); p.inv.offhand = null; lp.viewMode = 1;
//@ wait 600
//@ shot third_pick
