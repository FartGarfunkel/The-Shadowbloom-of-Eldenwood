import sys, os, json
from playwright.sync_api import sync_playwright
SP = sys.argv[1]
def wait_state(pg, s, t=120):
    for i in range(t * 2):
        if pg.evaluate('window.__game && window.__game.state') == s: return True
        pg.wait_for_timeout(500)
    return False
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={'width': 960, 'height': 600})
    logs = []; pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e))); pg.on('console', lambda m: logs.append(m.text) if m.type == 'error' else None)
    pg.goto('file://' + os.path.abspath('dist/emberwild.html')); pg.wait_for_timeout(800)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 4, scale: 0.6, farTerrain: 0}))")
    pg.reload(); pg.wait_for_timeout(2000)
    pg.evaluate("window.__game.createWorld('Vis', 'hello')")
    wait_state(pg, 'playing'); pg.wait_for_timeout(1500)
    # 1. hand holding a pickaxe, looking at terrain
    pg.evaluate("(() => { const g = window.__game, p = g.player, D = g.dev; p.inv.main.slots[0] = D.mkStack('iron_pickaxe', 1); p.inv.main.slots[1] = D.mkStack('cobblestone', 30); p.inv.main.slots[2] = D.mkStack('apple', 5); p.inv.main.slots[3] = D.mkStack('torch', 16); p.inv.selected = 0; p.pitch = -0.35; p.yaw = 3.6; })()")
    pg.wait_for_timeout(2500); pg.screenshot(path=f'{SP}/v1_hand.png')
    # 2. block in hand
    pg.evaluate("window.__game.player.inv.selected = 1"); pg.wait_for_timeout(1200); pg.screenshot(path=f'{SP}/v2_block.png')
    # 3. golem with slam telegraph in front of player
    pg.evaluate("""(() => { const g = window.__game, p = g.player, D = g.dev; const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
      const x = p.x + fx * 9, z = p.z + fz * 9; const y = D.findSafeY(g.world, x, z, Math.floor(p.y) + 10);
      const m = new D.Mob(g, 'cinder_golem', x, y > 0 ? y : p.y, z); g.entities.push(m); m.state = 'chase'; m.stateT = 0.01; m.yaw = Math.atan2(-(p.x - x), -(p.z - z));
      p.pitch = -0.15; window.__golem = m; })()""")
    pg.wait_for_timeout(200)
    pg.evaluate("(() => { const m = window.__golem; m.beginAttack('slam', 30); })()")
    pg.wait_for_timeout(2000); pg.screenshot(path=f'{SP}/v3_golem.png')
    pg.evaluate("(() => { const m = window.__golem; m.attack = null; m.beginAttack('charge', 30, m.yaw); })()")
    pg.wait_for_timeout(1500); pg.screenshot(path=f'{SP}/v4_charge.png')
    pg.evaluate("(() => { const g = window.__game; g.entities = g.entities.filter(e => e !== window.__golem); })()")
    # 4. watcher in view at distance
    pg.evaluate("""(() => { const g = window.__game, p = g.player, D = g.dev; const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
      const x = p.x + fx * 22, z = p.z + fz * 22; const y = D.findSafeY(g.world, x, z, Math.floor(p.y) + 12);
      g.meta.time = 900; return y; })()""")
    pg.wait_for_timeout(1500)
    pg.evaluate("""(() => { const g = window.__game, p = g.player, D = g.dev; const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
      const x = p.x + fx * 22, z = p.z + fz * 22; const y = D.findSafeY(g.world, x, z, Math.floor(p.y) + 12);
      const w = new D.Watcher(g, x, y, z, 'far'); w.lookT = -999; w.life = 999; g.entities.push(w); p.pitch = -0.05; })()""")
    pg.wait_for_timeout(1500); pg.screenshot(path=f'{SP}/v5_watcher_night.png')
    # 5. inventory UI
    pg.evaluate("(() => { const g = window.__game; g.meta.time = 300; g.entities = g.entities.filter(e => !e.mode); g.openInventory('bag'); })()")
    pg.wait_for_timeout(800); pg.screenshot(path=f'{SP}/v6_inv.png')
    pg.evaluate("window.__game.ui.setInvTab('craft')"); pg.wait_for_timeout(300)
    print('\n'.join(logs[:20]))
    b.close()
