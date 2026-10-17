# Playing together over the network (0.9.0.34): the party HUD, going down and being helped up (both ways),
# jobs shared, kills for a shared bounty, the party chest, and a guest's Stone Guardian.
# Usage: python3 tools/coop_net_test.py OUTDIR
import sys, os, json, subprocess
from playwright.sync_api import sync_playwright
SP = sys.argv[1]; os.makedirs(SP, exist_ok=True)
PORT = 25680
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
        ev(H, "g.createWorld('Coop Test', 'coop-1', 'survival')")
        until(H, "return g.state === 'playing'", 60)
        H.wait_for_timeout(800)
        r = evA(H, f"await D.Net.host(g, {{ port: {info['port']}, token: {json.dumps(info['token'])} }}); g.rules().mobSpawning = false; return !!g.net;")
        ok('host opens', r is True, r)
        until(G, "const b = document.getElementById('btn-lan-served'); return b && !b.hidden ? b.textContent : null", 10)
        G.evaluate("document.getElementById('btn-lan-served').click()")
        st = until(G, "return g.state === 'playing' && g.isGuest ? g.meta.name : null", 90)
        ok('guest joins', st == 'Coop Test', st)
        G.wait_for_timeout(2500)
        # stand side by side
        ev(H, "p.x = Math.floor(p.x) + 0.5; p.z = Math.floor(p.z) + 0.5; p.y = D.findSafeY(w, Math.floor(p.x), Math.floor(p.z)); window.__at = [p.x, p.y, p.z]; return 1")
        at = ev(H, "return window.__at")
        ev(G, f"p.x = {at[0]} + 1.6; p.z = {at[2]}; p.y = {at[1]}; p.vx = p.vy = p.vz = 0; return 1")
        G.wait_for_timeout(2000)
        hud = until(H, "const e = lp.el.querySelector('.party-hud'); return e && e.textContent.includes('Guesty') ? e.textContent : null", 10)
        ok('host party HUD shows the guest', bool(hud), hud)
        hud2 = until(G, "const e = lp.el.querySelector('.party-hud'); return e && e.textContent.includes('Hosty') ? e.textContent : null", 10)
        ok('guest party HUD shows the host', bool(hud2), hud2)
        # the guest goes down; the host sees it and helps them up
        r = ev(G, "p.invuln = 0; lp.hurt(999, { type: 'mob' }); return { down: p.downed, dead: p.dead }")
        ok('guest goes down (not dead)', isinstance(r, dict) and r['down'] > 0 and not r['dead'], r)
        seen = until(H, "const r = g.net.pawns()[0]; return r && r.st && r.st.dn > 0 ? r.st.dn : null", 10)
        ok('host sees the guest down', bool(seen), seen)
        ev(H, "const r = g.net.pawns()[0]; p.yaw = Math.atan2(-(r.x - p.x), -(r.z - p.z)); p.pitch = -0.2; g.input.s.use = true; return 1")
        up = until(G, "return !(p.downed > 0) && !p.dead ? p.health : null", 25)
        ev(H, "g.input.s.use = false; return 1")
        ok('host helps the guest up', bool(up), up)
        # the host goes down; the guest helps them up
        G.wait_for_timeout(1500)
        r = ev(H, "p.invuln = 0; lp.hurt(999, { type: 'mob' }); return { down: p.downed, dead: p.dead }")
        ok('host goes down (not dead)', isinstance(r, dict) and r['down'] > 0 and not r['dead'], r)
        seen = until(G, "const r = g.net.pawns()[0]; return r && r.st && r.st.dn > 0 ? r.st.dn : null", 10)
        ok('guest sees the host down', bool(seen), seen)
        ev(G, "const r = g.net.pawns()[0]; p.yaw = Math.atan2(-(r.x - p.x), -(r.z - p.z)); p.pitch = -0.2; g.input.s.use = true; return 1")
        up = until(H, "return !(p.downed > 0) && !p.dead ? p.health : null", 25)
        ev(G, "g.input.s.use = false; return 1")
        ok('guest helps the host up', bool(up), up)
        # jobs shared both ways
        q = ev(H, "const v = D.PV.debug.rpg.village(); g.meta.day = 4; const q = D.PV.debug.rpg.board(v).find(q => q.kind === 'hunt'); D.questTake(lp, q); window.__q = q; return { id: q.id, fam: q.fam }")
        got = until(G, f"return D.npcStats(p).quests.find(o => o.id === {json.dumps(q['id'])}) ? true : null", 10)
        ok('host shares a job with the guest', got is True, q)
        q2 = ev(G, "const v = D.PV.debug.rpg.village(); const q = D.PV.debug.rpg.board(v).find(q => q.kind === 'fetch'); D.questTake(lp, q); return { id: q.id }")
        got2 = until(H, f"return D.npcStats(p).quests.find(o => o.id === {json.dumps(q2['id'] if isinstance(q2, dict) else '')}) ? true : null", 10)
        ok('guest shares a job with the host', got2 is True, q2)
        # a kill by the host counts for the guest's shared bounty
        ev(H, f"const m = g.addEntity(new D.Mob(g, {json.dumps(q['fam'])}, p.x + 2, p.y + 0.5, p.z)); m.hurt(9999, {{ attacker: lp, weapon: 'iron_sword', type: 'mob' }}); return 1")
        hv = until(G, f"const q = D.npcStats(p).quests.find(o => o.id === {json.dumps(q['id'])}); return q && q.have > 0 ? q.have : null", 10)
        ok("host's kill counts for the guest", bool(hv), hv)
        # the party chest, both ways
        ev(H, "D.PV.debug.together.items()[0] = D.mkStack('diamond', 3); D.PV.debug.together.sync(); return 1")
        gi = until(G, "const s = D.PV.debug.together.items()[0]; return s && s.id === 'diamond' ? s.n : null", 10)
        ok('party chest reaches the guest', gi == 3, gi)
        ev(G, "D.PV.debug.together.items()[1] = D.mkStack('emerald', 5); D.PV.debug.together.sync(); return 1")
        hi = until(H, "const s = g.meta.partyChest && g.meta.partyChest[1]; return s && s.id === 'emerald' ? s.n : null", 10)
        ok('party chest from the guest reaches the host', hi == 5, hi)
        # the guest raises a Stone Guardian
        ev(G, "p.inv.held = D.mkStack('apprentice_staff', 1); p.stats.spells = ['guardian']; p.stats.spell = 0; p.mana = 999; lp.castCd = 0; lp.castSpell(); return 1")
        gd = until(H, "const e = g.entities.find(e => e.guardianOf === 'Guesty' && e.alive); return e ? e.health : null", 10)
        ok("guest's guardian rises on the host", bool(gd), gd)
        H.screenshot(path=f'{SP}/host.png'); G.screenshot(path=f'{SP}/guest.png')
        b.close()
finally:
    relay.terminate()
for t, L in logs.items():
    for l in L[:8]: print('LOGS ' + t + ': ' + l[:300])
print('SUMMARY', sum(results.values()), '/', len(results))
