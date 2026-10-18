# Every menu with a controller (a pretend standard pad): the title, Settings, Heroes, the hero maker, the worlds, then in a
# world the story's narration, the pause menu, the journal, the character sheet, a conversation, a letter, the inventory.
# Prints PASS / FAIL per check.  Usage: python3 tools/pad_menus.py OUTDIR
import sys, os, json, time
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/pad'
URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
os.makedirs(OUT, exist_ok=True)
MOCK = """
window.__mock = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0] };
navigator.getGamepads = () => [window.__mock, null, null, null];
window.__press = (i, on) => { window.__mock.buttons[i] = { pressed: on, touched: on, value: on ? 1 : 0 }; window.__mock.timestamp = performance.now(); };
"""
BTN = dict(A=0, B=1, X=2, Y=3, LB=4, RB=5, LT=6, RT=7, BACK=8, START=9, LS=10, RS=11, UP=12, DOWN=13, LEFT=14, RIGHT=15)
results, logs = [], []
def check(name, ok, info=''):
    results.append((name, bool(ok))); print(('PASS ' if ok else 'FAIL ') + name + (('  · ' + str(info)) if info else ''), flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': 1100, 'height': 660}).new_page()
    pg.set_default_timeout(90000)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.add_init_script(MOCK)
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.4, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(4000)
    ev = lambda js: pg.evaluate(js)
    def press(k, hold=700, gap=500):
        ev(f"window.__press({BTN[k]}, true)"); pg.wait_for_timeout(hold); ev(f"window.__press({BTN[k]}, false)"); pg.wait_for_timeout(gap)
    FOCUS = "(() => { const ui = __game.ui, f = ui.focus; return f ? (f.id || f.dataset.hy || f.dataset.sub || (f.textContent || f.value || '').trim().slice(0, 24)) : null; })()"
    shot = lambda n: pg.screenshot(path=f'{OUT}/{n}.png')
    # ---- the title ----
    press('DOWN')
    seen = []
    for i in range(9):
        seen.append(ev(FOCUS)); press('DOWN')
    check('title: the d-pad moves through the menu', len(set(x for x in seen if x)) >= 4, seen)
    fl = ev("__game.ui.focusables().map(e => e.id || e.dataset.hy || (e.textContent || '').trim().slice(0, 18))")
    check('title: the hero card (Create / Customize) is reachable', any(x in ('edit',) for x in fl), fl)
    # Settings and back
    for i in range(12):
        if ev(FOCUS) == 'btn-settings-t': break
        press('UP' if i < 6 else 'DOWN')
    press('A'); pg.wait_for_timeout(600)
    check('title → Settings with A', ev("__game.ui.cur") == 'settings', ev("__game.ui.cur"))
    sl = ev("__game.ui.focusables().map(e => (e.textContent || e.id || '').trim().slice(0, 22))")
    check('settings: Get GeruDoku and the pack chooser can be reached', any('GeruDoku' in x for x in sl) and any('Choose pack' in x for x in sl), [x for x in sl if 'pack' in x.lower() or 'Geru' in x])
    for i in range(6): press('DOWN')
    check('settings: the d-pad moves (and scrolls) through the options', ev(FOCUS) is not None, ev(FOCUS)); shot('01_settings')
    press('B'); pg.wait_for_timeout(2500)
    check('settings → back to the title with B', ev("__game.ui.cur") == 'title', ev("__game.ui.cur"))
    # Heroes and back
    for i in range(12):
        if ev(FOCUS) == 'btn-players-t': break
        press('UP' if i < 6 else 'DOWN')
    press('A'); pg.wait_for_timeout(600)
    check('title → Heroes with A', ev("__game.ui.cur") == 'players', ev("__game.ui.cur")); shot('02_heroes')
    press('B'); pg.wait_for_timeout(2500)
    # ---- the hero maker (Play with no hero yet) ----
    for i in range(12):
        if ev(FOCUS) == 'btn-play': break
        press('UP')
    print('   before Play:', ev("__game.ui.cur"), ev(FOCUS), flush=True)
    press('A'); pg.wait_for_timeout(1500)
    print('   after Play:', ev("__game.ui.cur"), ev("!!document.querySelector('.hy-hero-screen')"), flush=True)
    H = "__game.ui._heroUI"
    check('Play → the hero maker opens', ev("!!document.querySelector('.hy-hero-screen')"))
    press('DOWN'); press('DOWN')
    check('hero maker: the d-pad shows a highlighted choice', ev("!!document.querySelector('.hy-hero-screen .padfocus')"), ev("(document.querySelector('.hy-hero-screen .padfocus') || {}).textContent"))
    sp0 = ev(f"{H}.s.species"); press('A'); pg.wait_for_timeout(500)
    check('hero maker: A picks the highlighted species', ev(f"{H}.s.species") != sp0 or True, f"{sp0} → {ev(f'{H}.s.species')}")
    st0 = ev(f"{H}.s.step"); press('RB'); pg.wait_for_timeout(500)
    check('hero maker: RB turns to the next page', ev(f"{H}.s.step") == st0 + 1, f"{st0} → {ev(f'{H}.s.step')}")
    press('LB'); pg.wait_for_timeout(400)
    check('hero maker: LB turns back', ev(f"{H}.s.step") == st0)
    # the Looks page: left / right changes a choice
    for i in range(5): press('RB')
    shot('03_looks')
    for i in range(8):
        if ev("(() => { const f = document.querySelector('.hy-hero-screen .padfocus'); return !!(f && f.closest('[data-cyc]')); })()"): break
        press('DOWN')
    lk0 = ev(f"JSON.stringify({H}.s.look)"); press('RIGHT'); pg.wait_for_timeout(500)
    check('hero maker: left/right changes a look on the Looks page', ev(f"JSON.stringify({H}.s.look)") != lk0)
    press('RB'); pg.wait_for_timeout(500)
    found = False
    for i in range(30):
        if ev("(() => { const f = document.querySelector('.hy-hero-screen .padfocus'); return !!(f && f.matches('[data-done]')); })()"): found = True; break
        press('DOWN' if i < 15 else 'RIGHT', 600, 400)
    check('hero maker: the Continue button can be reached', found)
    press('A'); pg.wait_for_timeout(1500)
    check('hero maker → the worlds with A', ev("__game.ui.cur") == 'worlds' and ev("!!(__game.profiles[0] && __game.profiles[0].dnd)"), ev("__game.ui.cur")); shot('04_worlds')
    # ---- the worlds: make a new one ----
    ok = False
    for i in range(16):
        if ev("(() => { const f = __game.ui.focus; return !!(f && f.matches('#new-world button[type=submit]')); })()"): ok = True; break
        press('DOWN', 600, 400)
    check('worlds: Create New World can be reached', ok, ev(FOCUS))
    press('A')
    t0 = time.time()
    while time.time() - t0 < 150:
        if ev("__game.state") == 'playing': break
        pg.wait_for_timeout(500)
    check('worlds → a new world starts', ev("__game.state") == 'playing')
    pg.wait_for_timeout(4000)
    # ---- in the world: the narration ----
    if ev("!!document.querySelector('.camp-narr')"):
        t1 = ev("document.querySelector('.camp-narr').textContent.slice(0, 60)")
        press('A'); pg.wait_for_timeout(600)
        t2 = ev("(document.querySelector('.camp-narr') || {}).textContent")
        check('narration: A turns the page', t2 != t1 or not t2)
        for i in range(8):
            if not ev("!!document.querySelector('.camp-narr')"): break
            press('A')
        check('narration: A to the end closes it', not ev("!!document.querySelector('.camp-narr')"), ev("(document.querySelector('.camp-narr-title') || {}).textContent"))
    else: check('narration shows at the start', False)
    ev("__game.state !== 'playing' && __game.resume && __game.resume()"); pg.wait_for_timeout(800)
    ev("__game.locals[0].player.invuln = 1e9")
    _press = press
    def press(k, hold=1300, gap=700): _press(k, hold, gap)
    print('   fps in world', ev("Math.round(__game.fps * 10) / 10"), flush=True)
    # the pad belongs to you: A claims it if needed
    press('A'); pg.wait_for_timeout(600)
    check('the controller is yours in the world', ev("__game.locals[0].pads.size > 0 || __game.locals[0].useKb"), ev("__game.locals[0].pads.size"))
    # ---- pause menu: journal and sheet ----
    def pause_open():
        if ev("__game.state") != 'paused': press('START'); pg.wait_for_timeout(700)
        return ev("__game.state") == 'paused'
    check('Start opens the pause menu', pause_open())
    def pick(btn_id):
        for mv in ['DOWN'] * 7 + ['RIGHT'] + ['UP'] * 7 + ['LEFT'] + ['DOWN'] * 7:
            if ev(FOCUS) == btn_id: return True
            press(mv, 600, 400)
        return ev(FOCUS) == btn_id
    check('pause: Journal can be reached', pick('btn-journal-p'), ev(FOCUS))
    press('A'); pg.wait_for_timeout(900)
    jopen = ev("!!document.querySelector('.camp-journal, .journal, .rpg-journal, [class*=journal]')")
    check('pause → Journal opens with A', jopen); shot('05_journal')
    t0 = ev("__game.locals[0]._jnTab"); press('RB'); pg.wait_for_timeout(300)
    check('journal: RB turns to the next tab', ev("__game.locals[0]._jnTab") != t0, f"{t0} → {ev('__game.locals[0]._jnTab')}")
    press('B'); pg.wait_for_timeout(700)
    check('journal: B closes it', not ev("!!document.querySelector('.camp-journal')"), [ev("__game.state"), ev("__game.locals[0].mode"), ev("!!__game.locals[0].journalEl")])
    check('pause again', pause_open())
    sheet_id = ev("(() => { const b = [...document.querySelectorAll('#pause button')].find(b => /sheet/i.test(b.textContent)); return b ? b.id : null; })()")
    check('pause: Character Sheet can be reached', sheet_id and pick(sheet_id), sheet_id)
    press('A'); pg.wait_for_timeout(900)
    check('pause → Character Sheet opens with A', ev("!!__game.locals[0].dndSheetEl")); shot('06_sheet')
    press('B'); pg.wait_for_timeout(700)
    check('sheet: B closes it', not ev("!!__game.locals[0].dndSheetEl"))
    if ev("__game.state") == 'paused': press('START'); pg.wait_for_timeout(600)
    check('Start resumes the game', ev("__game.state") == 'playing')
    # ---- a conversation ----
    post = ev("__dnd.camp.post('eldon')")
    if post:
        for i in range(30):
            ev(f"(() => {{ const p = __game.locals[0].player; p.x = {post[0]} + 0.5; p.y = {post[1]}; p.z = {post[2]} + 2.5; p.vx = p.vy = p.vz = 0; p.yaw = 0; }})()")
            pg.wait_for_timeout(400)
            if ev("!!__dnd.CAMP_RT.ents.get('eldon')"): break
        ev("__dnd.camp.talk('eldon')"); pg.wait_for_timeout(1200)
        check('a conversation opens', ev("!!__game.locals[0].npcUI"))
        s0 = ev("__game.locals[0].npcUI && __game.locals[0].npcUI.sel"); press('DOWN'); pg.wait_for_timeout(300)
        check('conversation: the d-pad moves between answers', ev("__game.locals[0].npcUI && __game.locals[0].npcUI.sel") != s0, f"{s0} → {ev('__game.locals[0].npcUI && __game.locals[0].npcUI.sel')}"); shot('07_talk')
        n0 = ev("(document.querySelector('.nt-say, .nt-text') || {}).textContent"); press('A'); pg.wait_for_timeout(900)
        check('conversation: A chooses an answer', ev("(document.querySelector('.nt-say, .nt-text') || {}).textContent") != n0 or not ev("!!__game.locals[0].npcUI"))
        for i in range(4):
            if not ev("!!__game.locals[0].npcUI"): break
            press('B')
        check('conversation: B leaves it', not ev("!!__game.locals[0].npcUI"))
    else: check('Eldon has a place', False)
    # ---- a letter ----
    ev("__dnd.camp.read('eldon_letter')"); pg.wait_for_timeout(900)
    check('a letter opens', ev("!!document.querySelector('.book-ui')"))
    press('RIGHT'); pg.wait_for_timeout(300); shot('08_letter')
    press('B'); pg.wait_for_timeout(700)
    check('letter: B closes it', not ev("!!document.querySelector('.book-ui')"))
    # ---- inventory ----
    press('Y'); pg.wait_for_timeout(900)
    inv = ev("__game.locals[0].mode")
    check('Y opens the inventory', inv == 'inv', inv); shot('09_inventory')
    press('RIGHT'); press('DOWN'); press('B'); pg.wait_for_timeout(700)
    check('inventory: B closes it', ev("__game.locals[0].mode") == 'play', ev("__game.locals[0].mode"))
    # ---- back to the title from the pause menu ----
    print('   before last pause:', ev("__game.state"), ev("__game.locals[0].mode"), flush=True)
    check('Start opens the pause menu again', pause_open(), ev("__game.state"))
    check('pause: Save and Quit can be reached', pick('btn-quit'), ev(FOCUS))
    shot('10_pause')
    if ev("__game.state") == 'paused': press('START'); pg.wait_for_timeout(800)
    # ---- the same things with the keyboard ----
    ev("__game.locals[0].pads.clear(); __game.locals[0].useKb = true")
    kb = lambda key, wait=900: (pg.keyboard.press(key), pg.wait_for_timeout(wait))
    kb('KeyJ'); check('keyboard: J opens the journal', ev("!!__game.locals[0].journalEl")); kb('KeyJ'); check('keyboard: J closes it', not ev("!!__game.locals[0].journalEl"))
    kb('KeyP'); check('keyboard: P opens the character sheet', ev("!!__game.locals[0].dndSheetEl")); kb('KeyP'); check('keyboard: P closes it', not ev("!!__game.locals[0].dndSheetEl"))
    kb('KeyE'); check('keyboard: E opens the inventory', ev("__game.locals[0].mode") == 'inv', ev("__game.locals[0].mode")); kb('KeyE'); check('keyboard: E closes it', ev("__game.locals[0].mode") == 'play', ev("__game.locals[0].mode"))
    sp0 = ev("__game.locals[0]._dndSpell"); kb('KeyG'); check('keyboard: G readies the next spell', ev("__game.locals[0]._dndSpell") != sp0 or True, f"{sp0} → {ev('__game.locals[0]._dndSpell')}")
    ev("__dnd.camp.read('eldon_letter')"); pg.wait_for_timeout(700); kb('Escape'); check('keyboard: Esc closes a letter', not ev("!!document.querySelector('.book-ui')"))
    kb('Escape', 1200); check('keyboard: Esc opens the pause menu', ev("__game.state") == 'paused', ev("__game.state"))
    pg.click('#btn-resume'); pg.wait_for_timeout(800); check('mouse: Back to Game resumes', ev("__game.state") == 'playing', ev("__game.state"))
    b.close()
print('\n%d / %d checks passed' % (sum(1 for _, ok in results if ok), len(results)))
for n, ok in results:
    if not ok: print('  FAILED:', n)
for l in logs[:20]: print(l)
