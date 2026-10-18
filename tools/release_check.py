# The release gate (alpha 5): before tools/publish.sh puts a build on GitHub Releases, this opens it in a headless
# browser and refuses the release if the game doesn't reach its main menu in time, throws an error while starting, or
# the campaign has broken links (tools/campaign_validate.js). Alpha 3 shipped taking minutes to reach the menu; this
# would have stopped it.
# Usage: python3 tools/release_check.py [dist/shadowbloom.html] [seconds]
import sys, os, json, time
from playwright.sync_api import sync_playwright
HTML = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/shadowbloom.html')
LIMIT = float(sys.argv[2]) if len(sys.argv) > 2 else 60
VALIDATE = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'campaign_validate.js')).read()
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
fails, errors = [], []
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    pg = b.new_context(viewport={'width': 1280, 'height': 720}).new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)[:300]))
    t0 = time.time()
    pg.goto('file://' + HTML, wait_until='commit')
    state = None
    while time.time() - t0 < LIMIT:
        try: state = pg.evaluate("() => window.__game ? __game.state : 'none'")
        except Exception: state = 'busy'
        if state == 'title': break
        time.sleep(0.25)
    took = time.time() - t0
    # (a busy page can't answer until it's done, so the last check may come back late: the time is what counts)
    if state != 'title' or took > LIMIT: fails.append(f'the main menu did not appear within {LIMIT:.0f} s (state: {state}, after {took:.0f} s)')
    if state == 'title': print(f'main menu after {took:.1f} s')
    if errors: fails.append('errors while starting: ' + ' | '.join(errors[:5]))
    if state == 'title':
        try:
            r = pg.evaluate(f"(() => {{ const f = {VALIDATE}; return f(window.__dnd, 'shadowbloom'); }})()")
            print(f"campaign: {len(r['errors'])} errors, {len(r['warnings'])} warnings")
            for e in r['errors'][:20]: print('  E', e)
            if r['errors']: fails.append(f"{len(r['errors'])} campaign errors")
        except Exception as e: fails.append('campaign check could not run: ' + str(e)[:200])
    b.close()
if fails:
    print('RELEASE CHECK FAILED'); [print('  -', f) for f in fails]; sys.exit(1)
print('release check passed')
