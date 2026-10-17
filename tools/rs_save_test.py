# Redstone, carts and moving blocks survive a save and reload.
# Usage: python3 tools/rs_save_test.py OUT
import sys, os, json
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
    pg = b.new_context(viewport={'width': 900, 'height': 560}).new_page()
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: logs.append(m.type + ' ' + m.text) if m.type == 'error' and 'TUNNEL' not in m.text else None)
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 2, scale: 0.5, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(2500)
    pg.evaluate("window.__game.createWorld('RS save', 'flat-2', 'creative')")
    print('playing', wait_state(pg, 'playing'))
    pg.wait_for_timeout(1000)
    r = pg.evaluate("""(() => { const g = window.__game, D = g.dev, B = D.B, w = g.world, p = g.player;
      const X = Math.floor(p.x) + 2, Y = Math.floor(p.y), Z = Math.floor(p.z) + 2;
      for (let i = 0; i < 4; i++) w.setBlock(X + i, Y, Z, B.rail, 1);
      const c = g.placeCart('chest', X + 1, Y, Z, 5); c.items[3] = D.mkStack('diamond', 7);
      w.setBlock(X, Y, Z + 2, B.lever, 8); w.setBlock(X + 1, Y, Z + 2, B.redstone_wire); w.setBlock(X + 2, Y, Z + 2, B.redstone_lamp);
      for (let i = 0; i < 6; i++) g.rs.step();
      window.__X = [X, Y, Z];
      return { lamp: D.BLOCKS[w.getBlock(X + 2, Y, Z + 2)].key, carts: g.entities.filter(e => e.isCart).length }; })()""")
    print('before', r)
    pg.evaluate("window.__game.saveNow('test')"); pg.wait_for_timeout(1500)
    wid = pg.evaluate("window.__game.meta.id"); X = pg.evaluate("window.__X")
    pg.reload(); pg.wait_for_timeout(2500)
    pg.evaluate(f"window.__game.openWorld('{wid}')")
    print('playing again', wait_state(pg, 'playing'))
    pg.wait_for_timeout(1500)
    r2 = pg.evaluate("""(([X, Y, Z]) => { const g = window.__game, D = g.dev, w = g.world;
      const carts = g.entities.filter(e => e.isCart);
      return { carts: carts.map(c => [c.type, c.items && c.items[3] && c.items[3].n, +c.x.toFixed(1)]), lamp: D.BLOCKS[w.getBlock(X + 2, Y, Z + 2)].key, dust: w.getMeta(X + 1, Y, Z + 2) & 15, version: g.meta.gameVersion || null }; })""" , X)
    print('after', r2)
    for l in logs[:20]: print(l)
    b.close()
