# The icon sheet (3D item icons) and a few held items: saves icons.png (the whole sheet) and crops of chosen icons.
import sys, os, base64, json
sys.path.insert(0, os.path.dirname(__file__))
from a3lib import *
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b, pg, logs = open_game(p)
    pg.wait_for_timeout(2000)
    info = pg.evaluate("() => { const d = window.__game && window.__game.dev; return null; }")
    url = pg.evaluate("() => { const s = document.getElementById('vx-icon-css'); const m = s && s.textContent.match(/url\\((data:[^)]+)\\)/); return m ? m[1] : null; }")
    if url:
        open(os.path.join(OUT, 'icons.png'), 'wb').write(base64.b64decode(url.split(',', 1)[1]))
    keys = sys.argv[2].split(',') if len(sys.argv) > 2 else []
    idx = pg.evaluate("(keys) => keys.map(k => [k, window.__iconIndex ? window.__iconIndex(k) : -1])", keys)
    json.dump(idx, open(os.path.join(OUT, 'idx.json'), 'w'))
    print('3d icons:', pg.evaluate("window.__icons3d || 'n/a'"))
    print([l for l in logs if 'error' in l.lower()][:5])
    b.close()
