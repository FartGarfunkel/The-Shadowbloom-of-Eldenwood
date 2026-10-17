# Two players over LAN: a host and a guest in separate browsers, talking through the desktop app's
# LAN server (run on its own with node). Checks joining, terrain, building both ways, creatures,
# hits, items, chests, being hurt, chat, riding, leaving and coming back with your things.
# Usage: python3 tools/lan_test.py OUTDIR
import sys, os, json, subprocess, time
from playwright.sync_api import sync_playwright
SP = sys.argv[1]; os.makedirs(SP, exist_ok=True)
PORT = 25640
relay = subprocess.Popen(['node', 'tools/lan_relay.js', str(PORT)], stdout=subprocess.PIPE, text=True)
info = json.loads(relay.stdout.readline())
HOST_URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
GUEST_URL = f'http://127.0.0.1:{info["port"]}/'
logs = {'H': [], 'G': []}
results = {}
def ok(name, cond, extra=None):
    if isinstance(cond, str) and cond.startswith('ERROR'): cond = False
    results[name] = bool(cond)
    print(('PASS ' if cond else 'FAIL ') + name + ('' if extra is None else ' ' + json.dumps(extra)), flush=True)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        def page(tag, url, name):
            pg = b.new_context(viewport={'width': 640, 'height': 400}).new_page()
            pg.on('pageerror', lambda e: logs[tag].append('PAGEERROR ' + str(e)))
            pg.on('console', lambda m: logs[tag].append(m.type + ' ' + m.text) if m.type in ('error', 'warning') and 'TUNNEL' not in m.text else None)
            pg.goto(url); pg.wait_for_timeout(400)
            pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.5, farTerrain: 0}))")
            pg.evaluate(f"localStorage.setItem('emberwild.profiles', JSON.stringify([{{name: {json.dumps(name)}, skin: null}}]))")
            pg.reload(); pg.wait_for_timeout(2500)
            return pg
        H = page('H', HOST_URL, 'Hosty')
        G = page('G', GUEST_URL, 'Guesty')
        def ev(pg, js):
            try: return pg.evaluate("(() => { const g = window.__game, D = g.dev, B = D.B, w = g.world, lp = g.local; " + js + " })()")
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
        # the host makes a world and opens it
        ev(H, "g.createWorld('LAN Test', 'lan-1', 'survival')")
        until(H, "return g.state === 'playing'", 60)
        H.wait_for_timeout(800)
        r = evA(H, f"await D.Net.host(g, {{ port: {info['port']}, token: {json.dumps(info['token'])} }}); g.rules().mobSpawning = false; return !!g.net;")
        ok('host opens', r is True, r)
        # the page served by the host offers to join
        served = until(G, "const b = document.getElementById('btn-lan-served'); return b && !b.hidden ? b.textContent : null", 10)
        ok('served page offers join', served and served.startswith('Join '), served)
        G.evaluate("document.getElementById('btn-lan-served').click()")
        st = until(G, "return g.state === 'playing' && g.isGuest ? g.meta.name : null", 60)
        ok('guest joins', st == 'LAN Test', st)
        G.wait_for_timeout(1500); H.wait_for_timeout(200)
        # both see each other
        hp = until(H, "const r = g.net.pawns()[0]; return r ? { name: r.name, x: +r.x.toFixed(1) } : null", 10)
        gp = until(G, "const r = g.net.pawns()[0]; return r ? { name: r.name, x: +r.x.toFixed(1) } : null", 10)
        ok('host sees guest', hp and hp['name'] == 'Guesty', hp)
        ok('guest sees host', gp and gp['name'] == 'Hosty', gp)
        # same ground: compare a few chunks round the guest
        gpos = ev(G, "return [Math.floor(lp.player.x), Math.floor(lp.player.y), Math.floor(lp.player.z)]")
        cmp = []
        for attempt in range(6):
            cmp = []
            for dx, dz in [(0, 0), (1, 0), (0, -1), (-1, 1)]:
                cx, cz = (gpos[0] >> 4) + dx, (gpos[2] >> 4) + dz
                hh = ev(H, f"const c = w.chunkAt({cx}, {cz}); return c ? D.chunkHash(c) : null")
                gh = ev(G, f"const c = w.chunkAt({cx}, {cz}); return c ? D.chunkHash(c) : null")
                cmp.append([hh, gh])
            if all(a == b and a is not None for a, b in cmp): break
            G.wait_for_timeout(1000)
        ok('same terrain', all(a == b and a is not None for a, b in cmp), cmp)
        # building both ways
        X, Y, Z = gpos[0] + 2, gpos[1] + 3, gpos[2]
        ev(G, f"w.setBlock({X}, {Y}, {Z}, B.oak_planks ?? B.planks, 0)")
        hb = until(H, f"const id = w.getBlock({X}, {Y}, {Z}); return id === (B.oak_planks ?? B.planks) ? id : null", 5)
        ok('guest builds, host sees', hb, hb)
        ev(H, f"w.setBlock({X}, {Y + 1}, {Z}, B.glass, 0)")
        gb = until(G, f"return w.getBlock({X}, {Y + 1}, {Z}) === B.glass", 5)
        ok('host builds, guest sees', gb, gb)
        ev(G, f"w.setBlock({X}, {Y}, {Z}, 0, 0)")
        hb2 = until(H, f"return w.getBlock({X}, {Y}, {Z}) === 0", 5)
        ok('guest breaks, host sees', hb2, hb2)
        # a chest the host fills, the guest takes from
        ev(H, f"w.setBlock({X}, {Y}, {Z + 2}, B.chest, 0); const e = w.getEntity({X}, {Y}, {Z + 2}, () => ({{ type: 'chest', items: new Array(27).fill(null) }})); e.items[0] = D.mkStack('diamond', 5); g.entityChanged({X}, {Y}, {Z + 2});")
        gc = until(G, f"const e = w.getEntity({X}, {Y}, {Z + 2}); return e && e.items && e.items[0] ? e.items[0].n : null", 5)
        ok('guest sees chest contents', gc == 5, gc)
        ev(G, f"const e = w.getEntity({X}, {Y}, {Z + 2}); e.items[0].n = 2; g.entityChanged({X}, {Y}, {Z + 2});")
        hc = until(H, f"const e = w.getEntity({X}, {Y}, {Z + 2}); return e && e.items[0] && e.items[0].n === 2 ? 2 : null", 5)
        ok('host sees guest take from chest', hc == 2, hc)
        # a creature near the guest: the guest sees it and can hurt it
        mid = ev(H, f"const m = new D.Mob(g, 'pig', {gpos[0] + 3.5}, {gpos[1] + 0.2}, {gpos[2] + 0.5}); g.addEntity(m); return m.id")
        gm = until(G, f"const m = g.entities.find(e => e.id === {mid}); return m && m.ghost ? m.type : null", 6)
        ok('guest sees host creature', gm == 'pig', gm)
        hp0 = ev(H, f"return g.entities.find(e => e.id === {mid}).health")
        ev(G, f"const m = g.entities.find(e => e.id === {mid}); lp.attackEntity(m)")
        hp1 = until(H, f"const m = g.entities.find(e => e.id === {mid}); return m && m.health < {hp0} ? m.health : null", 5)
        ok('guest hits host creature', hp1 is not None, [hp0, hp1])
        # an item dropped by the guest lands on the host and flies to the guest
        n0 = ev(G, "return lp.player.inv.main.slots.filter(Boolean).reduce((n, s) => n + (s.id === 'apple' ? s.n : 0), 0)")
        ev(H, "const r = g.net.pawns()[0]; g.dropItem(D.mkStack('apple', 3), r.x, r.y + 0.5, r.z, false)")
        n1 = until(G, f"const n = lp.player.inv.main.slots.filter(Boolean).reduce((n, s) => n + (s.id === 'apple' ? s.n : 0), 0); return n > {n0} ? n : null", 10)
        ok('guest picks up host item', n1 == n0 + 3, [n0, n1])
        # the host's world hurts the guest
        h0 = ev(G, "return lp.player.health")
        ev(H, "const r = g.net.pawns()[0]; r.hurt(4, { type: 'mob' })")
        h1 = until(G, f"return lp.player.health < {h0} ? lp.player.health : null", 5)
        ok('guest gets hurt', h1 is not None, [h0, h1])
        # chat
        ev(G, "lp.submitChat('hello from the guest')")
        ch = until(H, "const l = [...document.querySelectorAll('.chat-line')].map(d => d.textContent); return l.find(t => t.includes('hello from the guest')) || null", 5)
        ok('chat reaches host', ch, ch)
        # time follows the host
        ev(H, "g.meta.time = 300")
        tm = until(G, "return Math.abs(g.meta.time - 300) < 30 ? g.meta.time : null", 5)
        ok('time follows host', tm, [tm, ev(G, 'return g.meta.time'), ev(H, 'return g.meta.time')])
        # riding: the host's boat, driven by the guest
        bid = ev(H, "const bt = new D.Boat(g, 'rowboat', %s, %s, %s, 0); g.addEntity(bt); return bt.id" % (gpos[0] + 0.5, gpos[1] + 0.1, gpos[2] - 2.5))
        print('boat id', bid)
        gbt = until(G, f"const e = g.entities.find(e => e.id === {bid}); return e && e.ghost ? true : null", 6)
        ok('guest sees boat', gbt, gbt)
        ev(G, f"const e = g.entities.find(e => e.id === {bid}); e.mount(lp)")
        rid = until(G, f"const e = g.entities.find(e => e.id === {bid}); return lp.riding === e && !e.ghost ? true : null", 6)
        ok('guest rides host boat', rid, rid)
        ev(G, f"const e = g.entities.find(e => e.id === {bid}); e.x += 3; e.z += 1")
        bmv = until(H, f"const e = g.entities.find(e => e.id === {bid}); return e && e.ghost && Math.abs(e.tx - {gpos[0] + 3.5}) < 1.5 ? +e.tx.toFixed(1) : null", 6)
        ok('host sees guest drive boat', bmv, bmv)
        ev(G, f"const e = g.entities.find(e => e.id === {bid}); e.dismount(lp)")
        rel = until(H, f"const e = g.entities.find(e => e.id === {bid}); return e && !e.ghost && !e.netOwner ? true : null", 6)
        ok('boat handed back', rel, rel)
        G.screenshot(path=f'{SP}/guest_view.png'); H.screenshot(path=f'{SP}/host_view.png')
        # leaving keeps your things; coming back gives them back
        ev(G, "lp.player.inv.main.slots[5] = D.mkStack('emerald', 7)")
        evA(G, "await g.quitToTitle(); return true")
        G.wait_for_timeout(800)
        saved = until(H, "const s = (g.meta.netPlayers || {})['guesty']; return s ? JSON.stringify(s).includes('emerald') : null", 6)
        ok('host keeps guest things', saved, saved)
        left = until(H, "return g.net.pawns().length === 0 ? true : null", 6)
        ok('guest gone from host', left, left)
        G.evaluate(f"(() => {{ document.getElementById('btn-lan-served').click(); }})()")
        back = until(G, "return g.state === 'playing' && g.isGuest ? lp.player.inv.main.slots.filter(Boolean).some(s => s.id === 'emerald' && s.n === 7) : null", 60)
        ok('guest comes back with things', back, back)
        # the host leaves: the guest is told and goes back to the title
        evA(H, "await g.quitToTitle(); return true")
        gone = until(G, "return g.state === 'title' ? document.getElementById('store-status').textContent : null", 10)
        ok('guest told when host leaves', gone, gone)
        b.close()
finally:
    relay.terminate()
print('LOGS H:', '\n'.join(logs['H'][:25]))
print('LOGS G:', '\n'.join(logs['G'][:25]))
print('SUMMARY', sum(results.values()), '/', len(results))
