# Host + guest over the LAN server, then scripted steps (like jsprobe.py): lines "//@ H" or "//@ G" pick
# the page the next step runs on, "//@ wait N" waits, "//@ shot H name" saves a screenshot.
# Usage: python3 tools/lan_probe.py OUTDIR script.js
import sys, os, json, subprocess, re
from playwright.sync_api import sync_playwright
SP, SCRIPT = sys.argv[1], sys.argv[2]; os.makedirs(SP, exist_ok=True)
PORT = int(os.environ.get('PORT', 25650))
relay = subprocess.Popen(['node', 'tools/lan_relay.js', str(PORT)], stdout=subprocess.PIPE, text=True)
info = json.loads(relay.stdout.readline())
logs = []
parts = re.split(r'^//@ (.*)$', open(SCRIPT).read(), flags=re.M)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        def page(tag, url, name):
            pg = b.new_context(viewport={'width': int(os.environ.get('W', 640)), 'height': int(os.environ.get('H_', 400))}).new_page()
            pg.on('pageerror', lambda e: logs.append(tag + ' PAGEERROR ' + str(e)))
            pg.on('console', lambda m: logs.append(tag + ' ' + m.type + ' ' + m.text) if m.type in ('error', 'warning') and 'TUNNEL' not in m.text and 'GL Driver' not in m.text else None)
            pg.goto(url); pg.wait_for_timeout(400)
            pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.5, farTerrain: 0}))")
            pg.evaluate(f"localStorage.setItem('emberwild.profiles', JSON.stringify([{{name: {json.dumps(name)}, skin: null}}]))")
            pg.reload(); pg.wait_for_timeout(2500)
            return pg
        P = {'H': page('H', 'file://' + os.path.abspath('dist/shadowbloom.html'), 'Hosty'), 'G': page('G', f'http://127.0.0.1:{info["port"]}/', 'Guesty')}
        def ev(pg, js):
            try: return pg.evaluate("(async () => { const g = window.__game, D = g.dev, B = D.B, w = g.world, lp = g.local, p = lp && lp.player; " + js + " })()")
            except Exception as e: return 'ERROR ' + str(e)[:300]
        H, G = P['H'], P['G']
        ev(H, f"g.createWorld('LAN Probe', {json.dumps(os.environ.get('SEED', 'lan-1'))}, {json.dumps(os.environ.get('MODE', 'survival'))})")
        for i in range(240):
            if ev(H, "return g.state") == 'playing': break
            H.wait_for_timeout(250)
        H.wait_for_timeout(600)
        ev(H, f"await D.Net.host(g, {{ port: {info['port']}, token: {json.dumps(info['token'])} }}); g.rules().mobSpawning = false;")
        G.wait_for_timeout(1500)
        G.evaluate("document.getElementById('btn-lan-served').click()")
        for i in range(240):
            if ev(G, "return g.state === 'playing' && g.isGuest") is True: break
            G.wait_for_timeout(250)
        G.wait_for_timeout(1000)
        cur = 'H'
        for i in range(0, len(parts), 2):
            code = parts[i].strip()
            if code:
                r = ev(P[cur], code)
                if r is not None: print(cur + ': ' + (json.dumps(r) if not isinstance(r, str) else r), flush=True)
            if i + 1 < len(parts):
                cmd = parts[i + 1].split()
                if cmd[0] in ('H', 'G'): cur = cmd[0]
                elif cmd[0] == 'wait': H.wait_for_timeout(int(cmd[1]))
                elif cmd[0] == 'shot': P[cmd[1]].screenshot(path=f'{SP}/{cmd[2]}.png')
        b.close()
finally:
    relay.terminate()
for l in logs[:40]: print(l)
