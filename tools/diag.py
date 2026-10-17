import sys, os, json
from playwright.sync_api import sync_playwright
URL = 'file://' + os.path.abspath('dist/emberwild.html')
SP = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': 1100, 'height': 640}).new_page()
    logs = []
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: logs.append(m.type + ' ' + m.text) if m.type in ('error',) and 'TUNNEL' not in m.text else None)
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.5, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(3500)
    d = pg.evaluate("""(() => { const g = window.__game, D = g.dev;
      const missing = new Set();
      for (const bl of D.BLOCKS) { const t = bl.tex; const names = typeof t === 'string' ? [t] : t ? Object.values(t) : []; if (bl.texUpper) names.push(bl.texUpper); for (const n of names) if (typeof n === 'string' && D.ATLAS.tile[n] === undefined) missing.add(bl.key + ':' + n); }
      for (const [k, list] of Object.entries(D.SHAPES || {})) for (const b of list) for (const n of [b.side, b.end, b.x]) if (n && D.ATLAS.tile[n] === undefined) missing.add('shape ' + k + ':' + n);
      for (const bl of D.BLOCKS) if (bl.crop) for (let i = 0; i < bl.crop.stages; i++) if (bl.render === 3 && D.ATLAS.tile[bl.key + '_stage' + i] === undefined) missing.add(bl.key + ':stage' + i);
      for (const n of ['candle_flame', 'compost', 'compost_ready', 'composter_bottom', 'bed_pillow']) if (D.ATLAS.tile[n] === undefined) missing.add('extra:' + n);
      const noIcon = Object.values(D.ITEMS).filter(it => !it.icon.startsWith('block:') && D.ATLAS.tile[it.icon] === undefined).map(it => it.key + ':' + it.icon);
      return { atlas: D.ATLAS.count, anims: D.ANIMS.length, blocks: D.BLOCKS.length, items: Object.keys(D.ITEMS).length, missing: [...missing], noIcon }; })()""")
    print(json.dumps(d)[:4000])
    pg.screenshot(path=f'{SP}/d0_title.png')
    print('\n'.join(logs[:30]))
    b.close()
