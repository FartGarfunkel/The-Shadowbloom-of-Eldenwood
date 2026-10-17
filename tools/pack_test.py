# Loads a resource pack through Settings (as a player would), then shows it in a world.
# Usage: python3 tools/pack_test.py PACK.zip OUTDIR [seed]
import sys, os, json
from playwright.sync_api import sync_playwright
URL = 'file://' + os.path.abspath('dist/emberwild.html')
PACK, OUT = sys.argv[1], sys.argv[2]
SEED = sys.argv[3] if len(sys.argv) > 3 else 'probe-1'
os.makedirs(OUT, exist_ok=True)
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={'width': 1100, 'height': 640})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: logs.append(m.type + ' ' + m.text) if m.type in ('error', 'warning') else None)
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.6, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(2500)
    pg.evaluate("window.__game.ui.openSub('settings')"); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/pack_settings_before.png')
    with pg.expect_navigation(timeout=60000):
        pg.set_input_files('.pack-setting input[type=file]', PACK)
    pg.wait_for_timeout(4000)
    print('report', json.dumps(pg.evaluate("PACKS_DEBUG()")))
    for i in range(20):
        if pg.evaluate('!!(window.__game && window.__game.ui)'): break
        pg.wait_for_timeout(500)
    if not pg.evaluate('!!(window.__game && window.__game.ui)'):
        for l in logs[:20]: print(l)
    pg.evaluate("window.__game.ui.openSub('settings')"); pg.wait_for_timeout(500)
    pg.screenshot(path=f'{OUT}/pack_settings_after.png')
    pg.evaluate(f"window.__game.ui.closeSub(); window.__game.createWorld('Pack', {json.dumps(SEED)}, 'creative')")
    for i in range(200):
        if pg.evaluate('window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(1500)
    if os.environ.get('PROBE'):
        code = open(os.environ['PROBE']).read()
        import re
        parts = re.split(r'^//@ (.*)$', code, flags=re.M)
        def run(c):
            c = c.strip()
            if not c: return
            r = pg.evaluate("(() => { const g = window.__game, D = g.dev, B = D.B, w = g.world, lp = g.local, p = g.player; " + c + " })()")
            if r is not None: print(json.dumps(r))
        run(parts[0])
        for i in range(1, len(parts), 2):
            cmd = parts[i].split()
            if cmd[0] == 'wait': pg.wait_for_timeout(int(cmd[1]))
            elif cmd[0] == 'shot': pg.screenshot(path=f'{OUT}/{cmd[1]}.png')
            run(parts[i + 1])
    else:
        pg.wait_for_timeout(2000); pg.screenshot(path=f'{OUT}/pack_world.png')
    for l in logs[:20]: print(l)
    b.close()
