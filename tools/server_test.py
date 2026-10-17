# The dedicated server: a server page (with the desktop app's LAN calls stood in for by the relay run on its own)
# starts a world from its server screen, a guest joins it, and the server screen sees them, draws its map and
# isometric view, chats, runs a command and a plugin, and kicks.
# Usage: python3 tools/server_test.py OUTDIR
import sys, os, json, subprocess
from playwright.sync_api import sync_playwright
SP = sys.argv[1]; os.makedirs(SP, exist_ok=True)
PORT = 25660
relay = subprocess.Popen(['node', 'tools/lan_relay.js', str(PORT)], stdout=subprocess.PIPE, text=True)
info = json.loads(relay.stdout.readline())
SERVER_URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
GUEST_URL = f'http://127.0.0.1:{info["port"]}/'
logs = {'S': [], 'G': []}
results = {}
def ok(name, cond, extra=None):
    if isinstance(cond, str) and cond.startswith('ERROR'): cond = False
    results[name] = bool(cond)
    print(('PASS ' if cond else 'FAIL ') + name + ('' if extra is None else ' ' + json.dumps(extra)[:300]), flush=True)
PLUGIN = """DQ.name = 'Test Plugin';
DQ.command('ping', 'Answers pong', () => 'pong');
DQ.on('join', (name) => { window.__joined = name; DQ.say('Hello ' + name); });"""
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        def page(tag, url, name, w=860, h=540):
            pg = b.new_context(viewport={'width': w, 'height': h}).new_page()
            pg.on('pageerror', lambda e: logs[tag].append('PAGEERROR ' + str(e)))
            pg.on('console', lambda m: logs[tag].append(m.type + ' ' + m.text) if m.type in ('error',) and 'TUNNEL' not in m.text else None)
            pg.goto(url); pg.wait_for_timeout(400)
            pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 2, scale: 0.5, farTerrain: 0}))")
            pg.evaluate(f"localStorage.setItem('emberwild.profiles', JSON.stringify([{{name: {json.dumps(name)}, skin: null}}]))")
            if tag == 'S': pg.evaluate("localStorage.setItem('dokuquest.mods', JSON.stringify([{ id: 'mt', name: 'Test Plugin', kind: 'plugin', enabled: true, code: " + json.dumps(PLUGIN) + " }]))")
            pg.reload(); pg.wait_for_timeout(2500)
            return pg
        S = page('S', SERVER_URL, 'Admin')
        def ev(pg, js):
            try: return pg.evaluate("(() => { const g = window.__game, D = g.dev, B = D.B, w = g.world, lp = g.local; " + js + " })()")
            except Exception as e: return 'ERROR ' + str(e)[:300]
        def until(pg, js, secs=30):
            for i in range(int(secs * 4)):
                r = ev(pg, js)
                if r and not (isinstance(r, str) and r.startswith('ERROR')): return r
                pg.wait_for_timeout(250)
            return ev(pg, js)
        # the desktop app's LAN calls, answered by the relay running on its own
        S.evaluate("window.emberLauncher = { lan: { open: async (o) => { window.__lanOpts = o; return { ok: true, port: %d, token: %s, addresses: ['127.0.0.1'] }; }, close: async () => true, scan: async () => [], scanStop: async () => true, probe: async () => null } }" % (info['port'], json.dumps(info['token'])))
        btn = until(S, "const b = document.getElementById('btn-server'); return b ? b.textContent : null", 10)
        ok('title has the server button', btn == 'Dedicated Server', btn)
        S.evaluate("document.getElementById('btn-server').click()")
        S.wait_for_timeout(1200)
        S.screenshot(path=f'{SP}/setup.png')
        S.evaluate("document.querySelector('.sv-new').open = true; document.getElementById('sv-nw-name').value = 'Server Test'; document.getElementById('sv-name').value = 'Test Server'; document.getElementById('sv-upnp').checked = false;")
        S.evaluate("document.querySelector('[data-a=new]').click()")
        up = until(S, "return g.state === 'playing' && g.net && g.net.role === 'host' ? g.meta.name : null", 120)
        ok('server is up', up == 'Server Test', up)
        S.wait_for_timeout(1000)
        ok('lan opts passed', until(S, "return window.__lanOpts && window.__lanOpts.world", 5) == 'Test Server')
        G = page('G', GUEST_URL, 'Guesty', 480, 300)
        served = until(G, "const b = document.getElementById('btn-lan-served'); return b && !b.hidden ? b.textContent : null", 15)
        ok('served page offers join', bool(served), served)
        G.evaluate("document.getElementById('btn-lan-served').click()")
        st = until(G, "return g.state === 'playing' && g.isGuest ? g.meta.name : null", 90)
        ok('guest joins', st == 'Server Test', st)
        G.wait_for_timeout(2500)
        gy = ev(G, "const p = lp.player, y = D.findSafeY(w, Math.floor(p.x), Math.floor(p.z)); return [+p.y.toFixed(1), y, p.health]")
        ok('guest starts on the ground', isinstance(gy, list) and gy[1] > 0 and abs(gy[0] - gy[1]) < 2.5 and gy[2] >= 19, gy)
        seen = until(S, "const r = [...g.net.remotes.values()]; return r.length ? r.map(q => q.name) : null", 20)
        ok('server sees the guest', seen == ['Guesty'], seen)
        hostPawn = until(G, "return g.net.pawns().filter(p => p.placed).length", 5)
        ok('guest does not see a server avatar', hostPawn == 0, hostPawn)
        ok('plugin heard the join', until(S, "return window.__joined || null", 10) == 'Guesty')
        S.wait_for_timeout(500)
        S.screenshot(path=f'{SP}/players.png')
        rows = until(S, "return document.querySelectorAll('.sv-table tr').length - 1", 5)
        ok('players tab lists them', rows == 1, rows)
        # the map and the isometric view
        S.evaluate("document.querySelector('.sv-tab[data-t=map]').click()")
        S.wait_for_timeout(2500)
        S.screenshot(path=f'{SP}/map.png')
        px = ev(S, "const c = document.getElementById('sv-map'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 80) n++; return n;")
        ok('map draws the world', isinstance(px, int) and px > 20000, px)
        S.evaluate("document.querySelector('.sv-tab[data-t=iso]').click()")
        S.wait_for_timeout(1500)
        S.evaluate("const f = document.getElementById('sv-follow'); f.value = 'Guesty'; f.onchange();")
        S.wait_for_timeout(3500)
        print('iso state', ev(S, "const SV = D.PV.debug.server.state(); return { tab: SV.tab, follow: SV.follow, t: performance.now() | 0 }"), flush=True)
        S.screenshot(path=f'{SP}/iso.png', timeout=60000)
        px2 = ev(S, "const c = document.getElementById('sv-iso'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 90) n++; return n;")
        ok('isometric view draws', isinstance(px2, int) and px2 > 30000, px2)
        # chat both ways, a command, a plugin command
        S.evaluate("document.querySelector('.sv-tab[data-t=chat]').click()")
        S.wait_for_timeout(500)
        S.evaluate("const i = document.getElementById('sv-in'); i.value = 'Hello from the server'; document.getElementById('sv-say').requestSubmit();")
        gotChat = until(G, "const t = g.local.el.textContent; return t.includes('Hello from the server') ? true : null", 10)
        ok('guest gets server chat', gotChat is True, gotChat)
        S.evaluate("const i = document.getElementById('sv-in'); i.value = '/ping'; document.getElementById('sv-say').requestSubmit();")
        S.wait_for_timeout(500)
        S.evaluate("const i = document.getElementById('sv-in'); i.value = '/time set day'; document.getElementById('sv-say').requestSubmit();")
        S.wait_for_timeout(500)
        log = ev(S, "return document.getElementById('sv-log').textContent")
        ok('plugin command answers', isinstance(log, str) and 'pong' in log, (log or '')[-200:] if isinstance(log, str) else log)
        G.evaluate("(() => { const g = window.__game; g.net.send({ t: 'chat', li: 0, text: 'hi server' }); })()")
        S.wait_for_timeout(1500)
        log = ev(S, "return document.getElementById('sv-log').textContent")
        ok('server logs guest chat', isinstance(log, str) and 'hi server' in log)
        S.screenshot(path=f'{SP}/chat.png')
        # kick
        S.evaluate("document.querySelector('.sv-tab[data-t=players]').click()")
        S.wait_for_timeout(1500)
        S.evaluate("document.querySelector('.sv-table [data-k]').click()")
        gone = until(G, "return g.state !== 'playing' || !g.net ? true : null", 15)
        ok('kick sends them away', gone is True, gone)
        left = until(S, "return g.net.remotes.size === 0 ? true : null", 15)
        ok('server sees them gone', left is True, left)
        # stop
        S.evaluate("document.querySelector('[data-a=stop]').click()")
        stopped = until(S, "return g.state === 'title' ? true : null", 30)
        ok('server stops to the title', stopped is True, stopped)
        b.close()
finally:
    relay.terminate()
for t, L in logs.items():
    for l in L[:8]: print('LOGS ' + t + ': ' + l[:300])
print('SUMMARY', sum(results.values()), '/', len(results))
