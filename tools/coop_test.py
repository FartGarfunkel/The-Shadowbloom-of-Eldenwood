import sys, time, json, os
from playwright.sync_api import sync_playwright
SP = sys.argv[1]
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1100, 640)
URL = 'file://' + os.path.abspath('dist/emberwild.html')
logs = []
def wait_state(pg, s, t=120):
    for i in range(t * 2):
        if pg.evaluate('window.__game && window.__game.state') == s: return True
        pg.wait_for_timeout(500)
    return False
def shot(pg, path):
    try: pg.screenshot(path=path, timeout=60000)
    except Exception as e: print('SCREENSHOT FAILED', path, str(e)[:200]); print('\n'.join(logs[-20:]))
def ev(pg, js):
    try: return pg.evaluate(js)
    except Exception as e: print('EVAL ERROR', str(e)[:400]); return None
INIT = """
window.__pads = [];
navigator.getGamepads = () => window.__pads;
window.__mkpad = (i) => ({ index: i, id: 'Test pad ' + i, connected: true, mapping: 'standard', buttons: Array.from({length: 17}, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] });
"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={'width': W, 'height': H})
    ctx.add_init_script(INIT)
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(URL); pg.wait_for_timeout(800)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.5, farTerrain: 0}))")
    pg.reload(); pg.wait_for_timeout(3000)
    shot(pg, f'{SP}/c0_title.png')
    print('state', ev(pg, 'window.__game.state'))
    ev(pg, "window.__game.createWorld('Coop', 'hello')")
    print('playing', wait_state(pg, 'playing'))
    pg.wait_for_timeout(1500)
    shot(pg, f'{SP}/c1_play.png')
    # --- mining with the input state
    r = ev(pg, '''() => { const g = window.__game, p = g.player; p.pitch = -1.55; return [Math.floor(p.x), Math.floor(p.y)-1, Math.floor(p.z), g.world.getBlock(Math.floor(p.x), Math.floor(p.y)-1, Math.floor(p.z))]; }''')
    print('under feet', r)
    ev(pg, "window.__game.input.s.attack = true; window.__game.input.s.attackPressed = true;")
    for i in range(40):
        pg.wait_for_timeout(300)
        if ev(pg, f"window.__game.world.getBlock({r[0]},{r[1]},{r[2]})") == 0: break
    ev(pg, "window.__game.input.s.attack = false")
    pg.wait_for_timeout(1500)
    print('after mining', ev(pg, "JSON.stringify(window.__game.player.inv.main.slots.filter(Boolean))"))
    # --- classic inventory: craft planks then a table on the 2x2 grid
    r2 = ev(pg, '''() => { const g = window.__game, lp = g.local, p = lp.player, D = g.dev;
      p.inv.main.slots.fill(null);
      p.inv.add(D.mkStack('log', 3)); p.inv.add(D.mkStack('cobblestone', 20)); p.inv.add(D.mkStack('torch', 8)); p.inv.add(D.mkStack('iron_ore', 3)); p.inv.add(D.mkStack('coal', 4)); p.inv.add(D.mkStack('iron_ingot', 2));
      lp.openInventory('inventory');
      const ui = lp.inv;
      const li = p.inv.main.slots.findIndex(s => s && s.id === 'log');
      ui.slotClick('main', li, 'left', false);       // pick up logs
      ui.slotClick('grid', 0, 'right', false);       // place one
      const out1 = ui.match && ui.match.out;
      ui.slotClick('out', 0, 'left', true);          // shift-take: craft all
      ui.slotClick('grid', 1, 'left', false);         // put the remaining logs down... on grid
      const afterPlanks = p.inv.count('planks');
      // clear grid back
      lp.closeInventory();
      return { out1, planks: afterPlanks, logsBack: p.inv.count('log'), cursor: !!ui.cursor }; }''')
    print('2x2 crafting', json.dumps(r2))
    # --- recipe book fills the grid
    r3 = ev(pg, '''() => { const g = window.__game, lp = g.local, p = lp.player, D = g.dev;
      lp.openInventory('inventory'); const ui = lp.inv;
      if (!ui.bookOpen) ui.toggleBook();
      const idx = D.RECIPES.find(r => r.out === 'crafting_table').idx;
      ui.bookPick(idx, false); ui.bookPick(idx, false);
      const m = ui.match && ui.match.out;
      ui.slotClick('out', 0, 'left', false);
      const cur = ui.cursor && ui.cursor.id;
      return { match: m, cursor: cur, planksLeft: p.inv.count('planks') }; }''')
    print('recipe book', json.dumps(r3))
    pg.wait_for_timeout(500)
    shot(pg, f'{SP}/c2_inventory_book.png')
    ev(pg, "window.__game.local.closeInventory()")
    # --- furnace: smelt iron
    r4 = ev(pg, '''() => { const g = window.__game, lp = g.local, p = lp.player, w = g.world, D = g.dev;
      const x = Math.floor(p.x) + 2, z = Math.floor(p.z) + 1, y = D.findSafeY(w, x, z);
      w.setBlock(x, y, z, D.B.furnace);
      lp.openInventory('furnace', { pos: [x, y, z] }); const ui = lp.inv;
      const oi = p.inv.main.slots.findIndex(s => s && s.id === 'iron_ore'); ui.slotClick('main', oi, 'left', true);
      const ci = p.inv.main.slots.findIndex(s => s && s.id === 'coal'); ui.slotClick('main', ci, 'left', true);
      const e = w.getEntity(x, y, z);
      window.__furn = [x, y, z];
      return { items: e.items.map(s => s && s.id + 'x' + s.n) }; }''')
    print('furnace loaded', json.dumps(r4))
    pg.wait_for_timeout(500)
    shot(pg, f'{SP}/c3_furnace.png')
    pg.wait_for_timeout(6000)
    print('furnace after 6s', ev(pg, "(() => { const [x,y,z] = window.__furn; const e = window.__game.world.getEntity(x,y,z); return JSON.stringify({items: e.items, burn: e.burn, cook: e.cook, block: window.__game.world.getBlock(x,y,z)}); })()"))
    ev(pg, "window.__game.local.closeInventory()")
    # --- off hand torch + belt lantern light, at night in a hole
    r5 = ev(pg, '''() => { const g = window.__game, lp = g.local, p = lp.player, D = g.dev;
      p.inv.offhand = D.mkStack('torch', 4); p.inv.hook.slots[0] = D.mkStack('lantern', 1);
      g.meta.time = 900;
      return { light: p.inv.carriedLight(), src: lp.lightSource() }; }''')
    print('carried light', json.dumps(r5))
    pg.wait_for_timeout(1500)
    ev(pg, "(() => { const p = window.__game.player; p.pitch = -0.35; })()")
    pg.wait_for_timeout(800)
    shot(pg, f'{SP}/c4_night_light.png')
    ev(pg, "(() => { const lp = window.__game.local; lp.player.inv.offhand = null; lp.player.inv.hook.slots[0] = null; })()")
    pg.wait_for_timeout(800)
    print('fps', ev(pg, 'window.__game.fps'), 'entities', ev(pg, 'window.__game.entities.length'))
    shot(pg, f'{SP}/c4b_night_nolight.png')
    ev(pg, "(() => { const lp = window.__game.local; lp.player.inv.offhand = window.__game.dev.mkStack('torch', 4); lp.player.inv.hook.slots[0] = window.__game.dev.mkStack('lantern', 1); window.__game.meta.time = 300; })()")
    # --- place a lantern
    r6 = ev(pg, '''() => { const g = window.__game, lp = g.local, p = lp.player, D = g.dev;
      p.inv.main.slots[4] = D.mkStack('lantern', 2); p.inv.selected = 4; p.pitch = -0.9; lp.updateTarget();
      const t = lp.target; if (!t) return 'no target';
      lp.use(false, {});
      const [x, y, z] = lp.placeTarget(t);
      return { placed: g.world.getBlock(x, y, z) === D.B.lantern, meta: g.world.getMeta(x, y, z), left: p.inv.main.slots[4] && p.inv.main.slots[4].n }; }''')
    print('lantern', json.dumps(r6))
    pg.wait_for_timeout(800)
    shot(pg, f'{SP}/c5_lantern.png')
    # --- Carry On: pick up a chest with contents, set it down
    r7 = ev(pg, '''() => { const g = window.__game, lp = g.local, p = lp.player, w = g.world, D = g.dev;
      const x = Math.floor(p.x) - 2, z = Math.floor(p.z), y = D.findSafeY(w, x, z);
      w.setBlock(x, y, z, D.B.chest); w.setEntity(x, y, z, {type:'chest', items: Object.assign(new Array(27).fill(null), {0: D.mkStack('diamond', 5)})});
      lp.pickUpBlock(x, y, z);
      const carrying = p.carrying && p.carrying.key;
      return { carrying, blockGone: w.getBlock(x, y, z) === 0, contents: p.carrying && p.carrying.ent && p.carrying.ent.items.filter(Boolean).length }; }''')
    print('carry', json.dumps(r7))
    pg.wait_for_timeout(600)
    shot(pg, f'{SP}/c6_carry.png')
    r7b = ev(pg, '''() => { const g = window.__game, lp = g.local, p = lp.player; p.y = g.dev.findSafeY(g.world, p.x, p.z) + 0.01; p.yaw += Math.PI; p.pitch = -0.8; lp.updateTarget(); const t = lp.target; lp.placeCarried(); return { carrying: !!p.carrying, target: t && [t.x, t.y, t.z, t.id, t.ny] }; }''')
    print('set down', json.dumps(r7b))
    # --- split-screen: plug in a controller and press Start
    ev(pg, "window.__pads[0] = window.__mkpad(0); window.dispatchEvent(Object.assign(new Event('gamepadconnected'), { gamepad: window.__pads[0] }));")
    pg.wait_for_timeout(300)
    print('before join', ev(pg, "[window.__game.state, window.__game.pads.connected(), window.__game.locals.length]"))
    ev(pg, "window.__pads[0].buttons[9].pressed = true")
    pg.wait_for_timeout(900)
    ev(pg, "window.__pads[0].buttons[9].pressed = false")
    pg.wait_for_timeout(1500)
    print('locals', ev(pg, "window.__game.locals.map(l => [l.index, l.name, [...l.pads], l.useKb])"))
    # P2 walks forward a bit and looks around
    ev(pg, "window.__pads[0].axes = [0, -1, 0.6, 0]")
    pg.wait_for_timeout(1200)
    ev(pg, "window.__pads[0].axes = [0, 0, 0, 0]")
    pg.wait_for_timeout(500)
    print('p2 pos', ev(pg, "(() => { const p = window.__game.locals[1].player; return [p.x.toFixed(1), p.y.toFixed(1), p.z.toFixed(1), p.yaw.toFixed(2)]; })()"))
    shot(pg, f'{SP}/c7_split.png')
    # P2 opens the inventory with Y and moves the focus with the d-pad
    ev(pg, "window.__pads[0].buttons[3].pressed = true"); pg.wait_for_timeout(200); ev(pg, "window.__pads[0].buttons[3].pressed = false"); pg.wait_for_timeout(200)
    ev(pg, "window.__pads[0].buttons[15].pressed = true"); pg.wait_for_timeout(150); ev(pg, "window.__pads[0].buttons[15].pressed = false"); pg.wait_for_timeout(150)
    ev(pg, "window.__pads[0].buttons[12].pressed = true"); pg.wait_for_timeout(150); ev(pg, "window.__pads[0].buttons[12].pressed = false"); pg.wait_for_timeout(300)
    print('p2 inv', ev(pg, "(() => { const l = window.__game.locals[1]; return [l.mode, l.inv.mode, l.inv.focus && (l.inv.focus.dataset.g + ':' + l.inv.focus.dataset.i)]; })()"))
    shot(pg, f'{SP}/c8_split_inv.png')
    ev(pg, "window.__pads[0].buttons[1].pressed = true"); pg.wait_for_timeout(200); ev(pg, "window.__pads[0].buttons[1].pressed = false"); pg.wait_for_timeout(200)
    print('p2 mode after B', ev(pg, "window.__game.locals[1].mode"))
    # --- pause menu shows the party
    ev(pg, "window.__game.pause()")
    pg.wait_for_timeout(500)
    shot(pg, f'{SP}/c9_pause.png')
    print('party', ev(pg, "document.querySelector('#pause-party').innerText"))
    ev(pg, "window.__game.resume()")
    # --- save & reload: inventory incl. off hand & hook persists
    ev(pg, "window.__game.saveNow('test')"); pg.wait_for_timeout(1500)
    wid = ev(pg, "window.__game.meta.id")
    pg.reload(); pg.wait_for_timeout(2500)
    ev(pg, f"window.__game.openWorld('{wid}')")
    print('playing again', wait_state(pg, 'playing'))
    print('persisted', ev(pg, '''(() => { const g = window.__game, p = g.player; return JSON.stringify({ off: p.inv.offhand, hook: p.inv.hook.slots[0], planks: p.inv.count('planks'), coplayers: Object.keys(g.meta.coPlayers || {}) }); })()'''))
    print('\n'.join(l for l in logs if 'fonts' not in l and 'TUNNEL' not in l)[:4000])
    b.close()
