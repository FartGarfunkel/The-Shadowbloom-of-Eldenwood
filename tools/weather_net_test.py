# Weather over LAN (0.9.0.54): a front, the storm, a lightning strike beside the guest and the mist after reach a guest.
#   python3 tools/weather_net_test.py OUTDIR
import sys, os, json, subprocess
from playwright.sync_api import sync_playwright
SP = sys.argv[1]; os.makedirs(SP, exist_ok=True)
PORT = 25710
relay = subprocess.Popen(['node', 'tools/lan_relay.js', str(PORT)], stdout=subprocess.PIPE, text=True)
info = json.loads(relay.stdout.readline())
HOST_URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
GUEST_URL = f'http://127.0.0.1:{info["port"]}/'
logs = {'H': [], 'G': []}
results = {}
def ok(name, cond, extra=None):
    if isinstance(cond, str) and cond.startswith('ERROR'): cond = False
    results[name] = bool(cond)
    print(('PASS ' if cond else 'FAIL ') + name + ('' if extra is None else ' ' + json.dumps(extra)[:300]), flush=True)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        def page(tag, url, name):
            pg = b.new_context(viewport={'width': 480, 'height': 300}).new_page()
            pg.on('pageerror', lambda e: logs[tag].append('PAGEERROR ' + str(e)))
            pg.on('console', lambda m: logs[tag].append(m.type + ' ' + m.text) if m.type in ('error',) and 'TUNNEL' not in m.text else None)
            pg.goto(url); pg.wait_for_timeout(400)
            pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 2, scale: 0.5, farTerrain: 0}))")
            pg.evaluate(f"localStorage.setItem('emberwild.profiles', JSON.stringify([{{name: {json.dumps(name)}, skin: null}}]))")
            pg.reload(); pg.wait_for_timeout(2500)
            return pg
        H = page('H', HOST_URL, 'Hosty')
        G = page('G', GUEST_URL, 'Guesty')
        def ev(pg, js):
            try: return pg.evaluate("(() => { const g = window.__game, D = g.dev, B = D.B, w = g.world, lp = g.local, p = lp && lp.player; " + js + " })()")
            except Exception as e: return 'ERROR ' + str(e)[:300]
        def evA(pg, js):
            try: return pg.evaluate("(async () => { const g = window.__game, D = g.dev, B = D.B, w = g.world, lp = g.local; " + js + " })()")
            except Exception as e: return 'ERROR ' + str(e)[:300]
        def until(pg, js, secs=30):
            for i in range(int(secs * 4)):
                r = ev(pg, js)
                if r and not (isinstance(r, str) and r.startswith('ERROR')): return r
                pg.wait_for_timeout(250)
            return ev(pg, js)
        ev(H, "g.createWorld('Weather Test', 'coop-1', 'survival')")
        until(H, "return g.state === 'playing'", 60)
        H.wait_for_timeout(800)
        r = evA(H, f"await D.Net.host(g, {{ port: {info['port']}, token: {json.dumps(info['token'])} }}); g.rules().mobSpawning = false; return !!g.net;")
        ok('host opens', r is True, r)
        until(G, "const b = document.getElementById('btn-lan-served'); return b && !b.hidden ? b.textContent : null", 10)
        G.evaluate("document.getElementById('btn-lan-served').click()")
        st = until(G, "return g.state === 'playing' && g.isGuest ? g.meta.name : null", 90)
        ok('guest joins', st == 'Weather Test', st)
        G.wait_for_timeout(2500)
        for pg in (H, G):
            ev(pg, "window.__errs = []; const ke = console.error.bind(console), kw = console.warn.bind(console); console.error = (...a) => { window.__errs.push('E ' + a.map(x => x && x.stack ? x.stack.split('\\n').slice(0, 3).join(' | ') : String(x)).join(' ').slice(0, 300)); ke(...a); }; console.warn = (...a) => { window.__errs.push('W ' + a.map(x => x && x.stack ? x.stack.split('\\n').slice(0, 3).join(' | ') : String(x)).join(' ').slice(0, 300)); kw(...a); }; window.addEventListener('error', (e) => window.__errs.push('U ' + e.message)); return 1")
        # a front is sent in on the host; the guest's sky knows it's coming
        ev(H, "D.COMMANDS.weather.run(lp, ['front', 'thunder']); return g.weather.state().front")
        r = until(G, "const f = g.weather.state().front; return f ? f.kind + ' ' + Math.round(f.edge) : null", 15)
        ok('guest sees the front coming', r and r.startswith('thunder'), r)
        # it arrives
        ev(H, "g.weather.set('thunder'); return 1")
        r = until(G, "return g.weather.state().kind === 'thunder' ? g.weather.state().kind : null", 15)
        ok('guest gets the storm', r == 'thunder', r)
        # lightning right beside the guest: the bolt and the flash on the guest's screen, the strike's marks on the land
        gp = ev(G, "return [Math.floor(lp.player.x), Math.floor(lp.player.z)]")
        r = ev(H, f"const x = {gp[0]} + 4, z = {gp[1]}; const y = g.weather.topAt(x, z); w.setBlock(x, y, z, B.sand, 0); g.weather.strike(x, y + 1, z); return [x, y, z, g.entities.filter(e => e.constructor.name === 'LightningBolt').length]")
        print('strike', r)
        r2 = until(G, "return g.entities.some(e => e.constructor.name === 'LightningBolt') || g.weather.flashT > 0 ? true : null", 8)
        ok('guest sees the bolt', r2, r2)
        G.wait_for_timeout(1500)
        r3 = ev(G, f"return w.getBlock({r[0]}, {r[1]}, {r[2]})")
        r4 = ev(H, f"return w.getBlock({r[0]}, {r[1]}, {r[2]})")
        ok('the strike marks the land for both', r3 == r4 and r4 != ev(H, "return B.sand"), [r3, r4])
        # it clears: the mist after the rain reaches the guest too
        ev(H, "g.weather.set('clear'); g.meta.weather.mist = 0.8; return 1")
        r = until(G, "const M = g.weather.state(); return M.kind === 'clear' && (M.mist || 0) > 0.3 ? +M.mist.toFixed(2) : null", 15)
        ok('guest gets the mist after', r, r)
        G.wait_for_timeout(3000)
        r = ev(G, "return +(g.weather.mistNow || 0).toFixed(2)")
        ok('guest is in the mist', r and r > 0.05, r)
        eh = ev(H, "return [...new Set(window.__errs)].slice(0, 8)"); eg = ev(G, "return [...new Set(window.__errs)].slice(0, 8)")
        ok('no errors on the host', eh == [], eh); ok('no errors on the guest', eg == [], eg)
        print('\n'.join((logs['H'] + logs['G'])[:12]))
        b.close()
finally:
    relay.terminate()
print('%d/%d passed' % (sum(results.values()), len(results)))
