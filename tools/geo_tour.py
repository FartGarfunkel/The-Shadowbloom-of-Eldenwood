# A tour of the campaign's land in a new world: the camera at each of the places the notes describe, a picture of each.
# Usage: python3 tools/geo_tour.py OUTDIR [name,name...]
import sys, os, json, time
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
ONLY = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
os.makedirs(OUT, exist_ok=True)
PI = 3.14159
# name: camera x, z, height above the ground there, and the point it looks at (x, y above sea, z)
STOPS = [
  ('bridge', 'BRIDGE', 0, 0, 0, 0, 0),
  ('port', 62, 214, 6, 34, 1, 190),
  ('stonebridge_west', -40, 40, 30, -250, 4, 0),
  ('heart_tree', 745, 300, 26, 740, 20, 230),
  ('ravine', 586, 781, 14, 680, -2, 778),
  ('greystone', 170, -292, 10, 165, 20, -395),
  ('eastern_hill', 482, 66, 6, 535, 12, 50),
  ('willow', 905, 290, 12, 905, 2, 340),
  ('pines', -95, 215, 22, -200, 8, 215),
  ('stillwater', -690, 630, 8, -680, 0, 760),
  ('cleft', 610, -395, 18, 690, 10, -470),
  ('cinder', 380, -330, 16, 600, 30, -560),
  ('bay', 40, 120, 30, 40, 0, 420),
]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': 960, 'height': 560}).new_page()
    logs = []
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type == 'error' else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 4, scale: 0.6, farTerrain: 1}))"); pg.reload(); pg.wait_for_timeout(3500)
    pg.evaluate("window.__game.createWorld('Tour', 'eldenwood', 'creative')")
    for i in range(240):
        if pg.evaluate('window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(2000)
    pg.evaluate("() => { const lp = __game.locals[0]; if (lp.creatorUI) { lp.creatorUI.autoSkills(); lp.creatorUI.finish(); } }")
    pg.wait_for_timeout(1500)
    clean = "() => { const lp = __game.locals[0]; document.querySelectorAll('.camp-narr, .cn-wrap, .book-ui, .dnd-creator').forEach(e => e.remove()); lp.creatorUI = null; lp.mode = 'play'; lp.viewMode = 0; lp.handState = () => null; __game.meta.time = 400; lp.player.flying = true; lp.player.invuln = 1e9; document.querySelectorAll('.hud, #hud, .hotbar, .qt, .toasts').forEach(e => e.style.visibility = 'hidden'); }"
    pg.evaluate(clean)
    print('geo', pg.evaluate("__game.meta.camp && __game.meta.camp.geo"), flush=True)
    for name, x, z, dy, tx, ty, tz in STOPS:
        if ONLY and name not in ONLY: continue
        t0 = time.time()
        if x == 'BRIDGE':
            # where the road out of Stonebridge's south gate crosses the river: look at it from upstream, a little east
            b0 = pg.evaluate("(() => { const net = __roads.net(); for (const s of net.segs) { if (s.kind !== 'road') continue; for (let t = 0; t <= 1; t += 0.05) { const x = s.a[0] + (s.b[0] - s.a[0]) * t, z = s.a[1] + (s.b[1] - s.a[1]) * t; if (Math.abs(x) < 40 && z > 60 && z < 90 && __game.world.gen.column(Math.round(x), Math.round(z)).h < 48) return [Math.round(x), Math.round(z)]; } } return null; })()")
            print('bridge at', b0, flush=True)
            if not b0: continue
            x, z, dy, tx, ty, tz = b0[0] + 24, b0[1] + 2, 7, b0[0], 4, b0[1]
        for k in range(80):
            pg.evaluate(f"() => {{ const g = __game, p = g.locals[0].player, h = Math.max(g.world.gen.column({x}, {z}).h, 48); p.x = {x} + 0.5; p.y = h + {dy}; p.z = {z} + 0.5; p.vx = p.vy = p.vz = 0; const dx = {tx} - p.x, dz = {tz} - p.z, dyy = 48 + {ty} - (p.y + 1.62); p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(dyy, Math.hypot(dx, dz)); p.flying = true; }}")
            pg.evaluate(clean)
            if k > 24 and pg.evaluate(f"(() => {{ const w = __game.world; for (const [dx, dz] of [[0,0],[40,0],[-40,0],[0,40],[0,-40]]) if (!w.isLoaded({x} + dx, {z} + dz)) return false; return true; }})()"): break
            pg.wait_for_timeout(700)
        pg.wait_for_timeout(2500)
        pg.screenshot(path=f'{OUT}/{name}.png')
        print(name, f'{time.time() - t0:.0f}s', flush=True)
    b.close()
for l in logs[:15]: print(l)
