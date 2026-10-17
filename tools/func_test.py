import sys, time, json, os
from playwright.sync_api import sync_playwright
SP = sys.argv[1]
URL = 'file://' + os.path.abspath('dist/emberwild.html')
logs = []
def wait_state(pg, s, t=120):
    for i in range(t * 2):
        if pg.evaluate('window.__game && window.__game.state') == s: return True
        pg.wait_for_timeout(500)
    return False
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={'width': 1000, 'height': 620})
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(URL); pg.wait_for_timeout(1000)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.5, farTerrain: 0}))")
    pg.reload(); pg.wait_for_timeout(2500)
    pg.evaluate("window.__game.createWorld('Func', 'hello')")
    print('playing', wait_state(pg, 'playing'))
    pg.wait_for_timeout(1000)
    # look straight down and mine the block under our feet
    r = pg.evaluate('''() => { const g = window.__game, p = g.player; p.pitch = -1.55; return [Math.floor(p.x), Math.floor(p.y)-1, Math.floor(p.z), g.world.getBlock(Math.floor(p.x), Math.floor(p.y)-1, Math.floor(p.z))]; }''')
    print('under feet', r)
    pg.wait_for_timeout(300)
    pg.evaluate("window.__game.input.s.attack = true; window.__game.input.s.attackPressed = true;")
    for i in range(40):
        pg.wait_for_timeout(300)
        if pg.evaluate(f"window.__game.world.getBlock({r[0]},{r[1]},{r[2]})") == 0: break
    pg.evaluate("window.__game.input.s.attack = false")
    pg.wait_for_timeout(1500)
    r2 = pg.evaluate(f'''() => {{ const g = window.__game, p = g.player; return {{ block: g.world.getBlock({r[0]},{r[1]},{r[2]}), inv: p.inv.main.slots.filter(Boolean), y: p.y, items: g.entities.filter(e=>e.stack).length }}; }}''')
    print('after mining', json.dumps(r2))
    # give items, craft, place
    r3 = pg.evaluate('''() => { const g = window.__game, p = g.player, D = g.dev;
      p.inv.add(D.mkStack('log', 5)); p.inv.add(D.mkStack('cobblestone', 20)); p.inv.add(D.mkStack('apple', 3)); p.inv.add(D.mkStack('torch', 8));
      g.ui.station = 'table'; g.ui._stations = {table:true, furnace:true};
      const rp = D.RECIPES.find(r => r.out === 'planks'); g.ui.craft(rp, 2);
      const rt = D.RECIPES.find(r => r.out === 'crafting_table'); g.ui._stations = {table:true, furnace:true}; g.ui.craft(rt, 1);
      return { planks: p.inv.count('planks'), table: p.inv.count('crafting_table'), logs: p.inv.count('log') }; }''')
    print('crafting', json.dumps(r3))
    # place cobblestone in front: look forward-down
    r4 = pg.evaluate('''() => { const g = window.__game, p = g.player; p.pitch = -0.7; p.inv.selected = p.inv.main.slots.findIndex(s => s && s.id === 'cobblestone'); return p.inv.selected; }''')
    pg.wait_for_timeout(300)
    t = pg.evaluate("(() => { const t = window.__game.target; return t ? [t.x,t.y,t.z,t.nx,t.ny,t.nz,t.id] : null })()")
    print('target', t)
    pg.evaluate("window.__game.input.s.usePressed = true")
    pg.wait_for_timeout(400)
    placed = pg.evaluate(f"window.__game.world.getBlock({t[0]+t[3]},{t[1]+t[4]},{t[2]+t[5]})") if t else None
    print('placed id', placed, 'cobble id', pg.evaluate('B.cobblestone') if False else '')
    # eat when hurt
    r5 = pg.evaluate('''() => { const g = window.__game, p = g.player; p.health = 10; p.inv.selected = p.inv.main.slots.findIndex(s => s && s.id === 'apple'); g.input.s.usePressed = true; return p.health; }''')
    pg.wait_for_timeout(300)
    print('health before/after eat', r5, pg.evaluate('window.__game.player.health'))
    pg.screenshot(path=f'{SP}/f1_after_build.png')
    # chest pickup with contents
    r6 = pg.evaluate('''() => { const g = window.__game, p = g.player, w = g.world, D = g.dev;
      const x = Math.floor(p.x)+2, z = Math.floor(p.z), y = D.findSafeY(w, x, z);
      w.setBlock(x, y, z, D.B.chest); w.setEntity(x, y, z, {type:'chest', items: Object.assign(new Array(27).fill(null), {0: D.mkStack('diamond', 5), 3: D.mkStack('iron_ingot', 9)})});
      p.inv.selected = 8; p.inv.main.slots[8] = null;
      const ok = g.pickUpChest(x, y, z);
      const held = p.inv.held;
      return { ok, held: held && held.id, contents: held && held.c.filter(Boolean).map(s => s.id + 'x' + s.n), blockNow: w.getBlock(x,y,z) }; }''')
    print('chest pickup', json.dumps(r6))
    # save, then reload page and reopen
    pg.evaluate("window.__game.saveNow('test')"); pg.wait_for_timeout(1500)
    wid = pg.evaluate("window.__game.meta.id")
    pg.reload(); pg.wait_for_timeout(2500)
    worlds = pg.evaluate("window.__game.save.listWorlds().then(l => l.map(w => w.rec.meta.name))")
    print('worlds after reload', worlds)
    pg.evaluate(f"window.__game.openWorld('{wid}')")
    print('playing again', wait_state(pg, 'playing'))
    r7 = pg.evaluate(f'''() => {{ const g = window.__game, p = g.player; return {{ mined: g.world.getBlock({r[0]},{r[1]},{r[2]}), placed: {f"g.world.getBlock({t[0]+t[3]},{t[1]+t[4]},{t[2]+t[5]})" if t else 'null'}, planks: p.inv.count('planks'), chestHeld: p.inv.main.slots[8] && p.inv.main.slots[8].c && p.inv.main.slots[8].c.filter(Boolean).length, health: p.health }}; }}''')
    print('persisted', json.dumps(r7))
    print('\n'.join(l for l in logs if 'fonts' not in l and 'TUNNEL' not in l)[:3000])
    b.close()
