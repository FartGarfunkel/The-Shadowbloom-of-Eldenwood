# Shared helpers for the alpha 3 test scripts: open the game, make a campaign world with the default hero, and wait.
import os, time
from playwright.sync_api import sync_playwright

ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"]

def open_game(p, url=None, w=1100, h=680, scale=0.5):
    url = url or 'file://' + os.path.abspath(os.environ.get('DQ_HTML', 'dist/shadowbloom.html'))
    b = p.chromium.launch(args=ARGS)
    pg = b.new_context(viewport={'width': w, 'height': h}).new_page()
    logs = []
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') and 'GL Driver' not in m.text and 'TUNNEL' not in m.text and 'willReadFrequently' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(url); pg.wait_for_timeout(600)
    pg.evaluate("(s) => localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: s, farTerrain: 0}))", scale); pg.reload(); pg.wait_for_timeout(3500)
    return b, pg, logs

def campaign_world(pg, name='A3 Test', seed='eldenwood', timeout=120):
    pg.click('#btn-play'); pg.wait_for_timeout(1200)
    if pg.evaluate("!!document.querySelector('.cr-tab[data-step]')"):
        pg.evaluate("() => document.querySelector('.cr-tab[data-step=\"6\"]').click()"); pg.wait_for_timeout(500)
        pg.evaluate("() => document.querySelector('[data-done]').click()"); pg.wait_for_timeout(1200)
    pg.evaluate("([n, s]) => { document.querySelector('#nw-name').value = n; document.querySelector('#nw-seed').value = s; document.querySelector('#new-world button[type=submit]').click(); }", [name, seed])
    t0 = time.time()
    while time.time() - t0 < timeout:
        if pg.evaluate('window.__game && window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(2500)
    pg.evaluate("() => { const ui = __game.locals[0].creatorUI; if (ui) { ui.autoSkills(); ui.finish(); } }")
    pg.wait_for_timeout(2500)
    # close the opening narration and any books
    pg.evaluate("() => { document.querySelectorAll('.camp-narr, .book-ui').forEach(e => e.remove()); const lp = __game.locals[0]; lp.npcUI = null; lp.mode = 'play'; if (__game.state !== 'playing' && __game.resume) __game.resume(); }")
    pg.wait_for_timeout(800)

def creative_world(pg, name='A3 Zoo', seed='gear-flat-7', timeout=120):
    pg.evaluate("([n, s]) => window.__game.createWorld(n, s, 'creative')", [name, seed])
    t0 = time.time()
    while time.time() - t0 < timeout:
        if pg.evaluate('window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(2500)
    for i in range(30):
        if pg.evaluate("!!__game.locals[0].creatorUI"): break
        pg.wait_for_timeout(500)
    pg.evaluate("() => { const lp = __game.locals[0]; if (lp.creatorUI) { lp.creatorUI.autoSkills(); lp.creatorUI.finish(); } }")
    pg.wait_for_timeout(1500)
    pg.evaluate("() => { const lp = __game.locals[0]; document.querySelectorAll('.camp-narr, .book-ui, .dnd-creator').forEach(e => e.remove()); lp.creatorUI = null; lp.mode = 'play'; __game.meta.time = 300; if (__game.state !== 'playing' && __game.resume) __game.resume(); }")
    pg.wait_for_timeout(1000)
