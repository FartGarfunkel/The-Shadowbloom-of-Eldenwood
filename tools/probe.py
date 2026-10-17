import sys, time, json, os
from playwright.sync_api import sync_playwright
SP = sys.argv[1]; JS = sys.argv[2] if len(sys.argv) > 2 else ''
URL = 'file://' + os.path.abspath('dist/emberwild.html')
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={'width': 1000, 'height': 620})
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(URL); pg.wait_for_timeout(2500)
    pg.evaluate("window.__game.createWorld('Probe', 'hello')")
    for i in range(120):
        if pg.evaluate('window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(1500)
    out = pg.evaluate('''() => { const g = window.__game, p = g.player; const c = g.camera(0.016);
      return { pos: [p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2)], yaw: p.yaw, pitch: p.pitch, roll: c.roll, hurtTilt: p.hurtTilt, hp: p.health, fps: g.fps, chunks: g.world.chunks.size, meshes: g.renderer.chunkMeshes.size } }''')
    print(json.dumps(out))
    if JS:
        r = pg.evaluate(JS); print('JS->', json.dumps(r)[:3000])
    pg.wait_for_timeout(500)
    pg.screenshot(path=f'{SP}/probe.png')
    print('\n'.join(l for l in logs if 'fonts' not in l)[:3000])
    b.close()
