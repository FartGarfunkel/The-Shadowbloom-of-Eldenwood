import sys, os
from playwright.sync_api import sync_playwright
SP = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True, device_scale_factor=1)
    pg = ctx.new_page()
    logs = []; pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.goto('file://' + os.path.abspath('dist/emberwild.html')); pg.wait_for_timeout(800)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.5, farTerrain: 0}))")
    pg.reload(); pg.wait_for_timeout(2500)
    pg.screenshot(path=f'{SP}/m1_title.png')
    pg.tap('#btn-play'); pg.wait_for_timeout(600)
    pg.screenshot(path=f'{SP}/m2_worlds.png')
    pg.tap('#new-world button[type=submit]')
    for i in range(200):
        if pg.evaluate('window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(500)
    # tap the game area to switch into touch mode
    pg.touchscreen.tap(600, 150); pg.wait_for_timeout(800)
    print('touchMode', pg.evaluate('window.__game.input.touchMode'), 'touch hidden', pg.evaluate("document.getElementById('touch').hidden"))
    pg.screenshot(path=f'{SP}/m3_game.png')
    pg.tap('[data-t="inv"]'); pg.wait_for_timeout(800)
    pg.screenshot(path=f'{SP}/m4_inv.png')
    print(logs)
    b.close()
