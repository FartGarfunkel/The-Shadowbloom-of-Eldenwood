# Screenshot a page as it first appears (title screen, launcher...).
# Usage: python3 tools/pageshot.py PAGE.html OUT.png [wait_ms] [WxH] [js-to-run-first]
import sys, os
from playwright.sync_api import sync_playwright
page, out = sys.argv[1], sys.argv[2]
wait = int(sys.argv[3]) if len(sys.argv) > 3 else 3500
w, h = (int(v) for v in (sys.argv[4] if len(sys.argv) > 4 else '1100x640').split('x'))
js = sys.argv[5] if len(sys.argv) > 5 else None
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': w, 'height': h}).new_page()
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: logs.append(m.type + ' ' + m.text) if m.type == 'error' and 'TUNNEL' not in m.text else None)
    pg.goto('file://' + os.path.abspath(page))
    if js: pg.wait_for_timeout(600); print(pg.evaluate(js))
    pg.wait_for_timeout(wait)
    pg.screenshot(path=out)
    for l in logs[:20]: print(l)
    b.close()
