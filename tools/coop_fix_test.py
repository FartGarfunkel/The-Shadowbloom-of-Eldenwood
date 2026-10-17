# LAN co-op safety (0.9.0.57): saves before leaving, crossing changes ending the same, the party chest, heartbeats,
# rejoining, players leaving split screen, and one land's news kept out of another.
#   python3 tools/coop_fix_test.py OUTDIR
import sys, os, json, subprocess
from playwright.sync_api import sync_playwright
SP = sys.argv[1]; os.makedirs(SP, exist_ok=True)
PORT = 25720
relay = subprocess.Popen(['node', 'tools/lan_relay.js', str(PORT)], stdout=subprocess.PIPE, text=True)
info = json.loads(relay.stdout.readline())
HOST_URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
GUEST_URL = f'http://127.0.0.1:{info["port"]}/'
logs = {'H': [], 'G': [], 'G2': [], 'G3': [], 'G4': []}
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
            pg.goto(url, timeout=120000); pg.wait_for_timeout(400)
            pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 2, scale: 0.5, farTerrain: 0}))")
            pg.evaluate(f"localStorage.setItem('emberwild.profiles', JSON.stringify([{{name: {json.dumps(name)}, skin: null}}]))")
            pg.reload(timeout=120000); pg.wait_for_timeout(2500)
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
            return ev(pg, js)
        def join(pg):
            until(pg, "const b = document.getElementById('btn-lan-served'); return b && !b.hidden ? b.textContent : null", 10)
            pg.evaluate("document.getElementById('btn-lan-served').click()")
            return until(pg, "return g.state === 'playing' && g.isGuest ? g.meta.name : null", 90)
        ERRS = "window.__errs = []; const ke = console.error.bind(console); console.error = (...a) => { window.__errs.push('E ' + a.map(x => x && x.stack ? x.stack.split('\\n').slice(0, 3).join(' | ') : String(x)).join(' ').slice(0, 300)); ke(...a); }; window.addEventListener('error', (e) => window.__errs.push('U ' + e.message)); return 1"
        # split screen on the host first, with player 2 down in the Depths (before anyone joins)
        ev(H, "g.createWorld('Coop Fix', 'coop-1', 'survival')")
        until(H, "return g.state === 'playing'", 60)
        H.wait_for_timeout(800)
        ev(H, ERRS)
        ev(H, "g.rules().mobSpawning = false; const l2 = g.addLocal(null); g.queueMove(l2, D.DIM.DEPTHS, () => { l2.player.y = 40; }); return 1")
        layers = until(H, "return g.ctxs && g.ctxs.size > 1 ? [...g.ctxs.keys()] : null", 20)
        ok('host has two lands in split screen', layers and len(layers) == 2, layers)
        r = evA(H, f"await D.Net.host(g, {{ port: {info['port']}, token: {json.dumps(info['token'])} }}); return !!g.net;")
        ok('host opens', r is True, r)
        ok('guest joins', join(G) == 'Coop Fix')
        G.wait_for_timeout(2500)
        ev(G, ERRS)
        # one land's creatures stay out of another's: a creature in the host's Depths, right under the guest
        gp = ev(G, "return [lp.player.x, lp.player.y, lp.player.z, g.dim]")
        ev(H, f"const c = g.ctxs.get(D.DIM.DEPTHS); const m = new D.Mob(g, 'pig', {gp[0]} + 2, 40, {gp[2]} + 1); m.update = function () {{}}; c.entities.push(m); window.__dpig = m.id; return m.id")
        G.wait_for_timeout(3000)
        r = ev(G, "return g.entities.filter(e => e.ghost && e.type === 'pig' && Math.hypot(e.x - lp.player.x, e.z - lp.player.z) < 6).length")
        ok('a creature in another land never shows up for the guest', r == 0, r)
        r = ev(G, "const h = [...g.net.remotes.values()].filter(r => r.key.startsWith('h:')); return h.map(r => [r.key, r.dim])")
        ok('the host\'s player in the Depths is known to be there', isinstance(r, list) and any(k == 'h:1' and d == 1 for k, d in r), r)
        # player 2 leaves the host's split screen: the guest sees them go
        ev(H, "g.removeLocal(g.allLocals()[1]); return 1")
        r = until(G, "return [...g.net.remotes.keys()].includes('h:1') ? null : 'gone'", 10)
        ok('a split-screen player leaving the host is gone for the guest', r == 'gone', r)
        H.wait_for_timeout(1500)
        # what the guest carries reaches the host within a second or two, not eight
        ev(G, "lp.player.inv.main.slots[7] = D.mkStack('emerald', 13); return 1")
        r = until(H, "const s = (g.meta.netPlayers || {})['guesty']; return s && JSON.stringify(s).includes('\"emerald\"') ? 'saved' : null", 4)
        ok('a change to what the guest carries is saved on the host soon', r == 'saved', r)
        # the host asks for everyone's latest before it quits (or stops sharing)
        ev(G, "lp.player.inv.main.slots[8] = D.mkStack('diamond', 5); return 1")
        r = evA(H, "await g.net.flushGuests(); const s = (g.meta.netPlayers || {})['guesty']; return JSON.stringify(s).includes('\"diamond\"')")
        ok('the host gets the guest\'s latest save before quitting', r is True, r)
        # a block changed by both at once ends the same for both
        P = ev(G, "const x = Math.floor(lp.player.x) + 3, z = Math.floor(lp.player.z) + 2, y = Math.floor(lp.player.y) + 1; return [x, y, z]")
        H.evaluate(f"(() => {{ const g = window.__game; g.world.setBlock({P[0]}, {P[1]}, {P[2]}, g.dev.B.glass, 0); }})()")
        G.evaluate(f"(() => {{ const g = window.__game; g.world.setBlock({P[0]}, {P[1]}, {P[2]}, g.dev.B.cobblestone, 0); }})()")
        H.wait_for_timeout(2500)
        bh = ev(H, f"return w.getBlock({P[0]}, {P[1]}, {P[2]})"); bg = ev(G, f"return w.getBlock({P[0]}, {P[1]}, {P[2]})")
        ok('a block changed by both at once ends the same for both', bh == bg and bh != 0, [bh, bg])
        # a chest changed by both at once ends the same for both
        C = [P[0] + 1, P[1], P[2]]
        ev(H, f"w.setBlock({C[0]}, {C[1]}, {C[2]}, B.chest, 0); w.setEntity({C[0]}, {C[1]}, {C[2]}, {{ type: 'chest', items: new Array(27).fill(null) }}); g.net.blockEntityChanged({C[0]}, {C[1]}, {C[2]}); return 1")
        until(G, f"const e = w.getEntity({C[0]}, {C[1]}, {C[2]}); return e ? 1 : null", 6)
        H.evaluate(f"(() => {{ const g = window.__game, w = g.world, e = w.getEntity({C[0]}, {C[1]}, {C[2]}); e.items[0] = g.dev.mkStack('gold_ingot', 3); g.net.blockEntityChanged({C[0]}, {C[1]}, {C[2]}); }})()")
        G.evaluate(f"(() => {{ const g = window.__game, w = g.world, e = w.getEntity({C[0]}, {C[1]}, {C[2]}); e.items[1] = g.dev.mkStack('iron_ingot', 4); g.net.blockEntityChanged({C[0]}, {C[1]}, {C[2]}); }})()")
        H.wait_for_timeout(2500)
        ch = ev(H, f"return JSON.stringify(w.getEntity({C[0]}, {C[1]}, {C[2]}).items.slice(0, 3))"); cg = ev(G, f"return JSON.stringify(w.getEntity({C[0]}, {C[1]}, {C[2]}).items.slice(0, 3))")
        ok('a chest changed by both at once ends the same for both', ch == cg, [ch, cg])
        # the guest takes a furnace's output while the host's older news of it is on the way: it doesn't come back
        F = [P[0] - 1, P[1], P[2]]
        ev(H, f"w.setBlock({F[0]}, {F[1]}, {F[2]}, B.chest, 0); w.setEntity({F[0]}, {F[1]}, {F[2]}, {{ type: 'chest', items: Object.assign(new Array(27).fill(null), {{ 2: D.mkStack('iron_ingot', 9) }}) }}); g.net.blockEntityChanged({F[0]}, {F[1]}, {F[2]}); return 1")
        until(G, f"const e = w.getEntity({F[0]}, {F[1]}, {F[2]}); return e && e.items[2] ? 1 : null", 6)
        G.evaluate(f"(() => {{ const g = window.__game, w = g.world, e = w.getEntity({F[0]}, {F[1]}, {F[2]}); e.items[2] = null; g.net.blockEntityChanged({F[0]}, {F[1]}, {F[2]}); }})()")
        H.evaluate(f"(() => {{ const g = window.__game; g.net.blockEntityChanged({F[0]}, {F[1]}, {F[2]}); }})()")   # the host's stale news, sent after
        G.wait_for_timeout(2500)
        fg = ev(G, f"return JSON.stringify(w.getEntity({F[0]}, {F[1]}, {F[2]}).items[2])"); fh = ev(H, f"return JSON.stringify(w.getEntity({F[0]}, {F[1]}, {F[2]}).items[2])")
        ok('what the guest took out stays taken (for both)', fg == 'null' and fh == 'null', [fg, fh])
        # the party chest: the host takes from one slot while the guest puts into another; both stick
        ev(H, "const P = D.PV.debug.together.items(); P[0] = D.mkStack('apple', 5); D.PV.debug.together.sync(); return 1")
        ev(G, "g.net.send({ t: 'adv', k: 'partyget' }); return 1")
        until(G, "const P = D.PV.debug.together.items(); return P[0] ? 1 : null", 6)
        H.evaluate("(() => { const g = window.__game, D = g.dev, P = D.PV.debug.together.items(); P[0] = null; D.PV.debug.together.sync(); })()")
        G.evaluate("(() => { const g = window.__game, D = g.dev, P = D.PV.debug.together.items(); P[5] = D.mkStack('bread', 2); D.PV.debug.together.sync(); })()")
        H.wait_for_timeout(2500)
        ph = ev(H, "const P = D.PV.debug.together.items(); return [P[0], P[5]].map(s => s ? s.id + 'x' + s.n : null)")
        pg_ = ev(G, "const P = D.PV.debug.together.items(); return [P[0], P[5]].map(s => s ? s.id + 'x' + s.n : null)")
        ok('the party chest keeps both people\'s changes', ph == [None, 'breadx2'] and pg_ == ph, [ph, pg_])
        # the same person joining again from the same computer takes over from their old connection
        G2 = page('G2', GUEST_URL, 'Guesty')
        r = join(G2)
        ok('rejoining with the same name from the same computer is let in', r == 'Coop Fix', r)
        r = until(G, "return g.state === 'title' && !g.meta ? 'left' : null", 10)
        ok('the old connection is let go', r == 'left', r)
        r = until(H, "return g.net.remotes.size === 1 ? [...g.net.remotes.values()][0].name : null", 6)
        ok('the host has just the one of them', r == 'Guesty', r)
        r = ev(G2, "return lp.player.inv.main.slots[8] && lp.player.inv.main.slots[8].id")
        ok('and they come back with what they had', r == 'diamond', r)
        # a guest that goes silent (a laptop asleep) is let go after half a minute
        ev(G2, "g.net.raw = () => {}; g.net.ws.onmessage = null; return 1")
        r = until(H, "return g.net.remotes.size === 0 && g.net.peers.size === 0 ? 'dropped' : null", 45)
        ok('a silent guest is dropped by the host', r == 'dropped', r)
        r = until(G2, "return g.state === 'title' ? 'left' : null", 20)
        ok('and the silent guest\'s game knows it has lost the host', r == 'left', r)
        G.close(); G2.close()
        # leaving: the host lets go at once
        G3 = page('G3', GUEST_URL, 'Guesty')
        ok('joins again', join(G3) == 'Coop Fix')
        G3.wait_for_timeout(1500)
        evA(G3, "await g.quitToTitle(); return 1")
        r = until(H, "return g.net.remotes.size === 0 ? 'gone' : null", 4)
        ok('a guest who leaves is let go straight away', r == 'gone', r)
        G3.close()
        # the host stops while a guest is on a loading screen: the guest goes back to the title, not into a copy of the world
        G4 = page('G4', GUEST_URL, 'Guesty')
        ok('joins once more', join(G4) == 'Coop Fix')
        G4.wait_for_timeout(1000)
        ev(G4, "g.state = 'loading'; return 1")
        evA(H, "await g.net.flushGuests(); g.net.close(); g.net = null; return 1")
        r = until(G4, "return g.state === 'title' && !g.meta ? 'title' : null", 15)
        ok('a guest on a loading screen when the host goes ends up at the title', r == 'title', r)
        eh = ev(H, "return [...new Set(window.__errs)].slice(0, 6)")
        ok('no errors on the host', eh == [], eh)
        print('\n'.join((logs['H'] + logs['G'])[:12]))
        b.close()
finally:
    relay.terminate()
print('%d/%d passed' % (sum(results.values()), len(results)))
