import sys, time, json, os
from playwright.sync_api import sync_playwright
SP = sys.argv[1]
URL = 'file://' + os.path.abspath('dist/emberwild.html')
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={'width': 1100, 'height': 680})
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(URL)
    pg.wait_for_timeout(4000)
    pg.screenshot(path=f'{SP}/01_title.png')
    pg.click('#btn-play'); pg.wait_for_timeout(800)
    pg.screenshot(path=f'{SP}/02_worlds.png')
    pg.fill('#nw-name', 'Test World'); pg.fill('#nw-seed', 'hello')
    pg.click('#new-world button[type=submit]')
    t0 = time.time()
    while time.time() - t0 < 90:
        st = pg.evaluate('window.__game && window.__game.state')
        if st == 'playing': break
        pg.wait_for_timeout(500)
    print('state', st, 'after', round(time.time() - t0, 1), 's')
    pg.wait_for_timeout(3000)
    pg.screenshot(path=f'{SP}/03_game.png')
    info = pg.evaluate('''() => { const g = window.__game, p = g.player; return { pos: [p.x, p.y, p.z], chunks: g.world.chunks.size, meshes: g.renderer.chunkMeshes.size, fps: g.fps, tris: g.renderer.stats.tris, drawn: g.renderer.stats.drawn, backend: g.save.backendName, biome: BIOME_NAME ? 1 : 0 } }''')
    print(json.dumps(info))
    print('\n'.join(logs[:40]))
    b.close()
