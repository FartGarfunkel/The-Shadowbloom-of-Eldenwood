import sys, os, json
from playwright.sync_api import sync_playwright
URL = 'file://' + os.path.abspath('dist/emberwild.html')
SP = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': 1000, 'height': 600}).new_page()
    logs = []
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: logs.append(m.type + ' ' + m.text) if m.type in ('error', 'warning') and 'TUNNEL' not in m.text else None)
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 2, scale: 0.4, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(3500)
    info = pg.evaluate("""(() => { const g = window.__game; if (!g) return 'no game';
      const D = g.dev || {};
      return { state: g.state, fatal: document.getElementById('fatal').hidden ? null : document.getElementById('fatal').innerText }; })()""")
    print('boot', info)
    print('\n'.join(logs[:30]))
    b.close()
