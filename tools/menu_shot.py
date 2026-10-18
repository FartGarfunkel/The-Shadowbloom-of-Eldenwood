# The main menu and the hero maker, as a new player sees them: title -> Play (no hero) -> hero maker -> worlds -> a new world.
# Usage: python3 tools/menu_shot.py OUTDIR
import sys, os, json, time
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
os.makedirs(OUT, exist_ok=True)
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"])
    pg = b.new_context(viewport={'width': 1366, 'height': 768}).new_page()
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error',) and 'TUNNEL' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 4, scale: 0.6, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(6000)
    pg.screenshot(path=f'{OUT}/01_title.png')
    pg.hover('#btn-lan'); pg.wait_for_timeout(400); pg.screenshot(path=f'{OUT}/02_title_hover.png')
    pg.click('#btn-play'); pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{OUT}/03_hero_maker.png')
    for k in [1, 5]:
        pg.evaluate(f"() => {{ const ui = document.querySelector('.hy-hero-screen') && window.__dnd && null; }}")
        pg.evaluate(f"() => document.querySelector('.cr-tab[data-step=\"{k}\"]').click()"); pg.wait_for_timeout(900); pg.screenshot(path=f'{OUT}/04_hero_step{k}.png')
    pg.evaluate("() => document.querySelector('.cr-tab[data-step=\"6\"]').click()"); pg.wait_for_timeout(600)
    pg.evaluate("() => document.querySelector('[data-done]').click()")
    pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{OUT}/05_worlds.png')
    print('screen', pg.evaluate("document.querySelector('#worlds').hidden ? 'not worlds' : 'worlds'"))
    pg.click('#new-world button[type=submit]')
    t0 = time.time()
    while time.time() - t0 < 120:
        if pg.evaluate('window.__game && window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(4000)
    st = pg.evaluate("() => { const lp = __game.locals[0], c = lp.player.stats && lp.player.stats.dnd; return { creator: !!lp.creatorUI, hero: c ? c.name + ' ' + c.species + ' ' + c.cls : null, narr: !!document.querySelector('.camp-narr') }; }")
    print('in world', json.dumps(st))
    pg.screenshot(path=f'{OUT}/06_world.png')
    # back to the title: the hero stands there now
    pg.evaluate("() => { document.querySelectorAll('.camp-narr').forEach(e => e.remove()); }")
    pg.evaluate("() => __game.quitToTitle()"); pg.wait_for_timeout(5000)
    pg.screenshot(path=f'{OUT}/07_title_hero.png')
    b.close()
for l in logs[:30]: print(l)
