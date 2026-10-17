# Controller setup with a pretend pad that has its own button order and a hat-switch d-pad.
import os, json
from playwright.sync_api import sync_playwright
URL = 'file://' + os.path.abspath('dist/emberwild.html')
OUT = os.environ.get('OUT', '/tmp')
MOCK = """
window.__mock = { id: '8BitDo Ultimate Mobile (Vendor: 2dc8 Product: 3109)', index: 0, connected: true, mapping: '', timestamp: 0,
  buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0, -1, -1, 0, 0, 0, 3.2857] };
navigator.getGamepads = () => [window.__mock];
window.__press = (i, on) => { window.__mock.buttons[i] = { pressed: on, value: on ? 1 : 0 }; };
"""
# the pretend pad's wiring: standard button -> raw source
RAW = {0: ('b', 1), 1: ('b', 0), 2: ('b', 4), 3: ('b', 3), 4: ('b', 6), 5: ('b', 7), 6: ('a', 4, 1), 7: ('a', 5, 1), 8: ('b', 10), 9: ('b', 11), 10: ('b', 13), 11: ('b', 14),
       12: ('a', 9, -1.0), 13: ('a', 9, 0.1429), 14: ('a', 9, 0.7143), 15: ('a', 9, -0.4286)}
STICKS = {0: (0, 1), 1: (1, 1), 2: (2, 1), 3: (3, 1)}
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': 1000, 'height': 640}).new_page()
    logs = []
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.add_init_script(MOCK)
    pg.goto(URL); pg.wait_for_timeout(3000)
    pg.evaluate("window.__game.ui.openSub('settings'); window.__game.ui.padSetup()"); pg.wait_for_timeout(300)
    def act(src, on):
        if src[0] == 'b': pg.evaluate(f"window.__press({src[1]}, {str(on).lower()})")
        else:
            rest = {4: -1, 5: -1, 9: 3.2857}.get(src[1], 0)
            pg.evaluate(f"window.__mock.axes[{src[1]}] = {src[2] if on else rest}")
    for i in range(16):
        act(RAW[i], True); pg.wait_for_timeout(450); act(RAW[i], False); pg.wait_for_timeout(450)
        if i == 3: pg.screenshot(path=f'{OUT}/padsetup.png')
    for i in range(4):
        ax, s = STICKS[i]
        pg.evaluate(f"window.__mock.axes[{ax}] = {s}"); pg.wait_for_timeout(450); pg.evaluate(f"window.__mock.axes[{ax}] = 0"); pg.wait_for_timeout(450)
    pg.wait_for_timeout(300)
    print("saved", json.dumps(pg.evaluate("window.__game.settings.padMaps || {}"))[:600])
    # now check each standard button reads right through the layout
    bad = []
    for i in range(16):
        act(RAW[i], True)
        got = pg.evaluate("(() => { const r = window.__padLayout(window.__mock, false); return r.b.map((v, k) => v ? k : -1).filter(k => k >= 0); })()")
        act(RAW[i], False)
        if got != [i]: bad.append((i, got))
    pg.evaluate("window.__mock.axes[2] = 0.8; window.__mock.axes[1] = -0.5")
    print('sticks', pg.evaluate("window.__padLayout(window.__mock, false).ax.map(v => Math.round(v * 100) / 100)"))
    print('wrong buttons', bad)
    print('setup open', pg.evaluate("(document.querySelector('#padsetup .ps-step') || {}).textContent"))
    for l in logs: print(l)
    b.close()
