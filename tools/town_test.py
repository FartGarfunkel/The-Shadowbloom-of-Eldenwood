# Look at the campaign's towns: a new Shadowbloom world, then views over and inside Stonebridge (and the others).
# Usage: python3 tools/town_test.py OUTDIR [town]
import sys, os, json, time
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
TOWN = sys.argv[2] if len(sys.argv) > 2 else 'stonebridge'
URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
os.makedirs(OUT, exist_ok=True)
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"])
    pg = b.new_context(viewport={'width': 1280, 'height': 760}).new_page()
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') and 'GL Driver' not in m.text and 'TUNNEL' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 5, scale: 0.6, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(3500)
    pg.evaluate("window.__startTest && window.__startTest()")
    pg.click('#btn-play'); pg.wait_for_timeout(600)
    pg.fill('#nw-name', 'Town Test'); pg.fill('#nw-seed', 'eldenwood')
    pg.click('#new-world button[type=submit]')
    t0 = time.time()
    while time.time() - t0 < 120:
        if pg.evaluate('window.__game && window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(2500)
    # through the creator and the intro
    print('creator', pg.evaluate("() => { const ui = __game.locals[0].creatorUI; if (!ui) return 'none'; try { ui.autoSkills(); ui.finish(); return 'done'; } catch (e) { return String(e); } }"))
    pg.wait_for_timeout(1500)
    for i in range(10):
        if not pg.evaluate("!!document.querySelector('.camp-narr')"): break
        pg.click('.camp-narr-next'); pg.wait_for_timeout(300)
    info = pg.evaluate(f"""() => {{ const v = __dnd.camp.town('{TOWN}'); const gen = __game.world.gen; const V = gen.villageAt(Math.floor(v.x / 352), Math.floor(v.z / 352));
      return {{ name: V.name, tier: V.tier, P: V.P, x: V.x, y: V.y, z: V.z, r: V.r, blds: V.blds.length, types: V.blds.map(b => b.type + (b.sign ? '*' : '')).join(','), streets: (V.streets || []).length, wall: V.wall, folk: V.folk.length, seats: V.seats.length, bounds: [V.x0, V.z0, V.x1, V.z1] }}; }}""")
    print('town', json.dumps(info))
    def go(x, y, z, yaw, pitch, wait=9000, name='shot'):
        pg.evaluate(f"() => {{ const lp = __game.locals[0], p = lp.player; p.x = {x}; p.y = {y}; p.z = {z}; p.vx = p.vy = p.vz = 0; p.yaw = {yaw}; p.pitch = {pitch}; p.flying = true; lp.mode = 'play'; if (p.abilities) p.abilities.flying = true; }}")
        t1 = time.time()
        while time.time() - t1 < wait / 1000:
            pg.evaluate(f"() => {{ const p = __game.locals[0].player; p.x = {x}; p.y = {y}; p.z = {z}; p.vx = p.vy = p.vz = 0; p.yaw = {yaw}; p.pitch = {pitch}; }}")
            pg.wait_for_timeout(400)
        pg.screenshot(path=f'{OUT}/{name}.png')
    pg.evaluate("() => { const lp = __game.locals[0], p = lp.player; p.invuln = 1e9; __game.meta.time = 0.3 * 24000; lp.handState = () => null; lp.el.classList.add('nohud'); }")
    X, Y, Z, R = info['x'], info['y'], info['z'], info['r']
    go(X + 0.5, Y + 55, Z + R * 0.9, 0, -0.75, 16000, '01_over_south')
    go(X + R * 0.8, Y + 30, Z + 0.5, 1.5708, -0.45, 10000, '02_over_east')
    go(X + 0.5, Y + 3, Z + info['P'] - 1, 0, -0.05, 8000, '03_square')
    # inside buildings: the inn, the smithy, a shop, the library
    def inside(kind, lx, lz, look, name, ly=1.6, nth=0):
        r = pg.evaluate(f"""() => {{ const v = __game.world.gen.villageAt(Math.floor({X} / 352), Math.floor({Z} / 352)); const bl = v.blds.filter(b => b.type === '{kind}')[{nth}]; if (!bl) return null;
          const rot = (r, x, z) => r === 0 ? [x, z] : r === 1 ? [-z, x] : r === 2 ? [-x, -z] : [z, -x]; const [a, c] = rot(bl.r, {lx}, {lz}); const [la, lc] = rot(bl.r, {look[0]}, {look[1]});
          const yaw = Math.atan2(-(la - a), -(lc - c)); return [bl.ox + a + 0.5, bl.y + {ly}, bl.oz + c + 0.5, yaw, bl.decor || null, bl.sign || null]; }}""")
        if not r: print('no', kind); return
        print(kind, nth, r[4], r[5])
        go(r[0], r[1], r[2], r[3], -0.2, 6000, name)
    inside('hall', 5, 2, (5, 8), '04_inn')
    inside('hall', 2, 7, (2, 2), '05_inn_tables')
    inside('smithy', 4, -1, (4, 5), '06_smithy', 1.8)
    inside('smithy', 5, 5, (1, 3), '07_smithy_wall', 1.8)
    inside('library', 4, 1, (4, 7), '08_nico', 1.6, 0)
    inside('library', 4, 1, (4, 7), '09_scribes', 1.6, 1)
    inside('store', 3, 1, (3, 6), '10_store', 1.6, 0)
    inside('tavern', 4, 1, (4, 7), '11_mug')
    inside('chapel', 4, 2, (4, 11), '12_temple')
    inside('council', 5, 1, (5, 9), '13_hall')
    inside('sage', 3, 1, (3, 4), '14_sage')
    inside('tower', 3, 1, (3, 4), '15_tower')
    inside('house_m', 3, 1, (3, 6), '16_house')
    st = pg.evaluate("() => ({ ents: __game.entities.length, npcs: __game.entities.filter(e => e.npc).length, err: 0 })")
    print('state', json.dumps(st))
    b.close()
for l in logs[:40]: print(l)
