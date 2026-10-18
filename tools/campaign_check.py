# Static check of the campaign: every person, node, quest, place, creature, item and letter, and every
# connection between them, checked inside the built game (so blocks, items and creatures are the game's own).
# Usage: python3 tools/campaign_check.py [campaign_id]
import sys, os, json
from playwright.sync_api import sync_playwright
CID = sys.argv[1] if len(sys.argv) > 1 else 'shadowbloom'
URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
SRC = open(os.path.join(os.path.dirname(__file__), 'campaign_validate.js')).read()
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page()
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_timeout(2500)
    r = pg.evaluate(f"(() => {{ const f = {SRC}; return f(window.__dnd, {json.dumps(CID)}); }})()")
    b.close()
print('stats', json.dumps(r['stats']))
print(f"\n{len(r['errors'])} errors")
for e in r['errors']: print('  E', e)
print(f"\n{len(r['warnings'])} warnings")
for w in r['warnings']: print('  W', w)
for l in logs: print(l)
sys.exit(1 if r['errors'] else 0)
