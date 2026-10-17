# The story's scares reach players who join over the network (0.9.0.46).
#   python3 tools/haunt_net_test.py OUTDIR
import sys, os, json, subprocess
from playwright.sync_api import sync_playwright
SP = sys.argv[1]; os.makedirs(SP, exist_ok=True)
PORT = 25690
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
        ev(H, "g.createWorld('Haunt Test', 'coop-1', 'survival')")
        until(H, "return g.state === 'playing'", 60)
        H.wait_for_timeout(800)
        r = evA(H, f"await D.Net.host(g, {{ port: {info['port']}, token: {json.dumps(info['token'])} }}); g.rules().mobSpawning = false; return !!g.net;")
        ok('host opens', r is True, r)
        until(G, "const b = document.getElementById('btn-lan-served'); return b && !b.hidden ? b.textContent : null", 10)
        G.evaluate("document.getElementById('btn-lan-served').click()")
        st = until(G, "return g.state === 'playing' && g.isGuest ? g.meta.name : null", 90)
        ok('guest joins', st == 'Haunt Test', st)
        G.wait_for_timeout(2500)
        # the story, three fragments in
        r = ev(H, "g.meta.playTime = 4000; D.COMMANDS.rift.run(lp, ['open']); for (let i = 0; i < 3; i++) D.COMMANDS.rift.run(lp, ['frag']); return D.COMMANDS.rift.run(lp, [])")
        ok('the rift is open with three fragments', isinstance(r, str) and 'fragments 3' in r and 'stability 22' in r, r)
        r = until(G, "return g.meta.rift && g.meta.rift.frags === 3 ? g.meta.rift.stage : null", 10)
        ok('the guest knows the story', r == 1, r)
        # the guest's own game shows sightings to the guest, and they stay (not swept away as stray entities)
        ev(G, "g.meta.playTime = 4000; return g.haunt.forceSighting()")
        G.wait_for_timeout(1500)
        r = ev(G, "return g.entities.filter(e => e instanceof D.Watcher).length")
        ok('a sighting on the guest\'s screen', isinstance(r, int) and r >= 1, r)
        # the host's events reach the guest: the host's own player away (in a test, only the guest can be picked)
        ev(G, "for (const e of g.entities) if (e instanceof D.Watcher) e.remove = true; return 1")
        ev(H, "for (const e of g.entities) if (e instanceof D.Watcher) e.remove = true; g.haunt.active = null; p.dead = true; return 1")
        got = None
        for k in range(8):
            ev(H, "D.RIFT.eventT = 0; g.haunt.active = null; return 1")
            got = until(G, "return g.entities.some(e => e instanceof D.Watcher || (e.kind === 'micro' && !e.remove)) || D.RIFT.frozenT > 0 ? 1 : null", 6)
            if got == 1: break
        ok('the host\'s rift events happen on the guest\'s screen', got == 1, got)
        # a little rift with creatures on the guest's screen: the host brings them through by the guest
        n0 = ev(H, "return g.entities.filter(e => e.type && /^rift_/.test(e.type) && e.alive).length")
        ev(G, "for (const e of g.entities) if (e instanceof D.Watcher) e.remove = true; return 1")
        ev(H, "const r = [...g.net.remotes.values()][0]; g.net.toPawn(r, { t: 'adv', k: 'haunt', ev: 'micro', mon: 1, i: r.idx }); return 1")
        n1 = until(H, f"const n = g.entities.filter(e => e.type && /^rift_/.test(e.type) && e.alive).length; return n > {n0} ? n : null", 15)
        ok('creatures come through by the guest (made by the host)', isinstance(n1, int) and n1 > n0, [n0, n1])
        near = ev(H, "const r = [...g.net.remotes.values()][0]; return g.entities.filter(e => e.type && /^rift_/.test(e.type) && e.alive).map(e => Math.round(Math.hypot(e.x - r.x, e.z - r.z)))")
        ok('they come through near the guest', isinstance(near, list) and near and min(near) < 20, near)
        # traces: with only the guest to pick, the host leaves one near the guest
        ev(H, "for (const e of g.entities) if (e.type && /^rift_/.test(e.type)) e.remove = true; return 1")
        r = ev(H, """const r = [...g.net.remotes.values()][0], H2 = g.haunt, pr = Object.getPrototypeOf(H2); let placed = 0, where = null; const baseSet = w.setEntity.bind(w);
          w.setEntity = (x, y, z, e) => { if (e && e.type === 'sign') { placed++; where = Math.round(Math.hypot(x - r.x, z - r.z)); } return baseSet(x, y, z, e); };
          const keep = [pr.digTunnel, pr.stripTree, pr.swapTorch]; pr.digTunnel = pr.stripTree = pr.swapTorch = function () { return this.placeSign(); };
          try { for (let i = 0; i < 40 && !placed; i++) H2.leaveTrace(); } finally { [pr.digTunnel, pr.stripTree, pr.swapTorch] = keep; w.setEntity = baseSet; }
          return { placed, where };""")
        ok('a trace is left near the guest', isinstance(r, dict) and r.get('placed', 0) >= 1 and r.get('where') is not None and r['where'] < 120, r)
        ev(H, "p.dead = false; return 1")
        for t in ('H', 'G'):
            errs = [l for l in logs[t] if 'PAGEERROR' in l]
            ok(f'no page errors ({t})', not errs, errs[:3])
        b.close()
finally:
    relay.kill()
print('SUMMARY', sum(results.values()), '/', len(results))
