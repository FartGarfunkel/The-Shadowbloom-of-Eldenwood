# The Shadowbloom of Eldenwood, together: a host and a guest over the LAN server, plus a second player
# on the host's screen. Checks the campaign reaches guests (the same towns in the same places), heroes'
# looks reach everyone, a guest's conversation moves the shared story on, and split-screen heroes.
# Usage: python3 tools/dnd_coop_test.py OUTDIR
import sys, os, json, subprocess
from playwright.sync_api import sync_playwright
SP = sys.argv[1] if len(sys.argv) > 1 else '.'; os.makedirs(SP, exist_ok=True)
PORT = 25660
relay = subprocess.Popen(['node', 'tools/lan_relay.js', str(PORT)], stdout=subprocess.PIPE, text=True)
info = json.loads(relay.stdout.readline())
HOST_URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
GUEST_URL = f'http://127.0.0.1:{info["port"]}/'
INIT = """
window.__pads = [];
navigator.getGamepads = () => window.__pads;
window.__mkpad = (i) => ({ index: i, id: 'Test pad ' + i, connected: true, mapping: 'standard', buttons: Array.from({length: 17}, () => ({ pressed: false, value: 0 })), axes: [0, 0, 0, 0] });
"""
logs = {'H': [], 'G': []}
results = {}
def ok(name, cond, extra=None):
    if isinstance(cond, str) and cond.startswith('ERROR'): cond = False
    results[name] = bool(cond)
    print(('PASS ' if cond else 'FAIL ') + name + ('' if extra is None else ' ' + json.dumps(extra)[:400]), flush=True)
PRE = "const g = window.__game, D = window.__dnd, w = g.world, lp = g.locals[0];"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        def page(tag, url, name):
            ctx = b.new_context(viewport={'width': 900, 'height': 560}); ctx.add_init_script(INIT)
            pg = ctx.new_page()
            pg.on('pageerror', lambda e: logs[tag].append('PAGEERROR ' + str(e)))
            pg.on('console', lambda m: logs[tag].append(m.type + ' ' + m.text) if m.type in ('error', 'warning') and 'TUNNEL' not in m.text and 'GL Driver' not in m.text and 'willReadFrequently' not in m.text else None)
            pg.goto(url); pg.wait_for_timeout(400)
            pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.5, farTerrain: 0}))")
            pg.evaluate(f"localStorage.setItem('emberwild.profiles', JSON.stringify([{{name: {json.dumps(name)}, skin: null}}, {{name: 'Couchy', skin: null}}]))")
            pg.reload(); pg.wait_for_timeout(2500)
            return pg
        def ev(pg, js):
            try: return pg.evaluate("(() => { " + PRE + " " + js + " })()")
            except Exception as e: return 'ERROR ' + str(e)[:300]
        def evA(pg, js):
            try: return pg.evaluate("(async () => { " + PRE + " " + js + " })()")
            except Exception as e: return 'ERROR ' + str(e)[:300]
        def until(pg, js, secs=30):
            for i in range(int(secs * 4)):
                r = ev(pg, js)
                if r and not (isinstance(r, str) and r.startswith('ERROR')): return r
                pg.wait_for_timeout(250)
            return ev(pg, js)
        H = page('H', HOST_URL, 'Hosty')
        G = page('G', GUEST_URL, 'Guesty')
        ev(H, "g._campaignChoice = 'shadowbloom'; g.createWorld('Co-op Eldenwood', 'coop-1', 'survival')")
        until(H, "return g.state === 'playing'", 60)
        r = until(H, "return lp.creatorUI ? true : null", 10)
        ok('host creator opens', r is True, r)
        # the host's hero: an elf wizard
        r = ev(H, """const c = D.dndNewChar({ name: 'Hosty', species: 'elf', lineage: 'high', cls: 'wizard', bg: 'sage', ab: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }, bgPlus: { int: 2, con: 1 }, skills: ['arcana', 'investigation'] });
          const look = c.look || null; D.dndApplyChar(lp, c, D.dndSkinURL({ species: 'elf' }), 'slim', null); lp.creatorUI.done = true; lp.creatorUI.close(); return { lvl: c.level, hp: lp.player.health, spells: c.spells.length };""")
        ok('host hero', isinstance(r, dict) and r['hp'] > 0, r)
        H.wait_for_timeout(2500)
        r = ev(H, "const n = document.querySelector('.camp-narr'); return n ? true : null")
        ok('intro narration', r is True, r)
        ev(H, "const n = document.querySelector('.camp-narr'); if (n) for (let i = 0; i < 10 && document.querySelector('.camp-narr'); i++) document.querySelector('.camp-narr-next').click(); return 1;")
        r = until(H, "return g.meta.camp && g.meta.camp.quests.q_arrival ? g.meta.camp.quests.q_arrival.stage : null", 10)
        ok('first quest begins', r == 'talk', r)
        # a second player on the host's screen: a pad presses Start
        ev(H, "window.__pads[1] = window.__mkpad(1); return 1")
        H.wait_for_timeout(300)
        ev(H, "window.__pads[1].buttons[9] = { pressed: true, value: 1 }; return 1"); H.wait_for_timeout(250); ev(H, "window.__pads[1].buttons[9] = { pressed: false, value: 0 }; return 1")
        r = until(H, "return g.locals.length === 2 ? true : null", 8)
        ok('split screen player joins', r is True, r)
        r = until(H, "const l2 = g.locals[1]; return l2 && l2.creatorUI ? l2.creatorUI.el.className : null", 8)
        ok('split screen creator (compact)', r and 'compact' in r, r)
        H.screenshot(path=f'{SP}/co1_split_creator.png')
        # drive it with the pad: RB to the class page, then A on a class, then finish
        def pad(btn):
            ev(H, f"window.__pads[1].buttons[{btn}] = {{ pressed: true, value: 1 }}; return 1"); H.wait_for_timeout(120)
            ev(H, f"window.__pads[1].buttons[{btn}] = {{ pressed: false, value: 0 }}; return 1"); H.wait_for_timeout(120)
        pad(5)
        r = ev(H, "return g.locals[1].creatorUI.s.step")
        ok('pad RB turns the page', r == 1, r)
        pad(13); pad(0)
        r = ev(H, "return g.locals[1].creatorUI.s.cls")
        ok('pad picks a class', isinstance(r, str), r)
        ev(H, "g.locals[1].creatorUI.finish(); return 1")
        r = until(H, "const c = g.locals[1].player.stats.dnd; return c ? { n: c.name, cls: c.cls, hp: g.locals[1].player.health } : null", 5)
        ok('split screen hero made', r and r['hp'] > 0, r)
        # open to the network
        r = evA(H, f"await g.dev.Net.host(g, {{ port: {info['port']}, token: {json.dumps(info['token'])} }}); g.rules().mobSpawning = false; return !!g.net;")
        ok('host opens', r is True, r)
        served = until(G, "const b = document.getElementById('btn-lan-served'); return b && !b.hidden ? b.textContent : null", 10)
        G.evaluate("document.getElementById('btn-lan-served').click()")
        st = until(G, "return g.state === 'playing' && g.isGuest ? g.meta.name : null", 60)
        ok('guest joins', st == 'Co-op Eldenwood', st)
        r = until(G, "return g.meta.campaign && g.meta.camp ? { c: g.meta.campaign, started: !!g.meta.camp.started, q: Object.keys(g.meta.camp.quests) } : null", 10)
        ok('guest has the campaign', r and r['c'] == 'shadowbloom' and r['started'], r)
        r = until(G, "return lp.creatorUI ? true : null", 10)
        ok('guest creator opens', r is True, r)
        G.screenshot(path=f'{SP}/co2_guest_creator.png')
        r = ev(G, """const c = D.dndNewChar({ name: 'Guesty', species: 'tiefling', lineage: 'infernal', cls: 'warlock', bg: 'criminal', ab: { str: 8, dex: 14, con: 13, int: 10, wis: 12, cha: 15 }, bgPlus: { dex: 2, con: 1 }, skills: ['deception', 'arcana'] });
          D.dndApplyChar(lp, c, D.dndSkinURL({ species: 'tiefling', horns: 'ram' }), 'classic', null); lp.creatorUI.done = true; lp.creatorUI.close(); return { hp: lp.player.health, cls: c.cls };""")
        ok('guest hero', isinstance(r, dict) and r['hp'] > 0, r)
        r = until(H, "const r = g.net.pawns().find(p => p.name === 'Guesty'); return r && r.skinURL && r.skinURL.startsWith('data:') ? r.name : null", 10)
        ok('host sees the guest hero looks', r == 'Guesty', r)
        r = until(G, "const r = g.net.pawns().find(p => /Hosty/.test(p.name)); return r && r.skinURL && r.skinURL.startsWith('data:') ? r.name : null", 10)
        ok('guest sees the host hero looks', r is not None and 'Hosty' in str(r), r)
        # the same town where the story put it, on both
        town = ev(H, "return D.camp.town('brookhollow')")
        ok('town on host', town and town.get('name') == 'Brookhollow', town)
        gtown = until(G, "const t = D.camp.town('brookhollow'); return t && t.name", 10)
        ok('town on guest', gtown == 'Brookhollow', gtown)
        # both walk to the inn; the guest talks to Mira
        ev(H, "const v = D.camp.town('brookhollow'); for (const l of g.locals) { l.player.x = v.x + 0.5; l.player.z = v.z + 3.5; l.player.y = 120; l.player.flying = true; l.player.vy = 0; } return 1")
        ev(G, "const v = D.camp.town('brookhollow'); lp.player.x = v.x + 1.5; lp.player.z = v.z + 3.5; lp.player.y = 120; lp.player.flying = true; return 1")
        H.wait_for_timeout(5000)
        ev(H, "for (const l of g.locals) { const y = D.findSafeY(w, Math.floor(l.player.x), Math.floor(l.player.z)); l.player.flying = false; if (y > 0) l.player.y = y + 0.2; l.player.vy = 0; l.player.fallStart = null; } return 1")
        ev(G, "const y = D.findSafeY(w, Math.floor(lp.player.x), Math.floor(lp.player.z)); lp.player.flying = false; if (y > 0) lp.player.y = y + 0.2; lp.player.vy = 0; lp.player.fallStart = null; return 1")
        mira = until(G, "const e = g.entities.find(e => e.npc && e.npc.cid === 'mira'); return e ? [+e.x.toFixed(1), +e.z.toFixed(1)] : null", 25)
        ok('guest sees Mira', mira, mira)
        r = ev(G, "const e = g.entities.find(e => e.npc && e.npc.cid === 'mira'); lp.player.x = e.x + 1.2; lp.player.z = e.z; lp.player.y = e.y; lp.mode = 'play'; lp.openNpcUI(() => new D.NpcTalk(lp, e)); return !!lp.npcUI")
        ok('guest talks to Mira', r is True, r)
        G.wait_for_timeout(1500)
        opts = ev(G, "return [...document.querySelectorAll('.nt-opt')].map(b => b.textContent)")
        ok('campaign dialogue on guest', isinstance(opts, list) and any('look' in o for o in opts), opts)
        G.screenshot(path=f'{SP}/co3_guest_talk.png')
        ev(G, "document.querySelectorAll('.nt-opt')[0].click(); return 1"); G.wait_for_timeout(800)
        ev(G, "const b = [...document.querySelectorAll('.nt-opt')].find(b => /Consider/.test(b.textContent)); if (b) b.click(); return 1")
        r = until(H, "const q = g.meta.camp.quests; return q.q_cellar ? { arrival: q.q_arrival && q.q_arrival.done, cellar: q.q_cellar.stage } : null", 10)
        ok('guest moves the shared story (host)', r and r['cellar'] == 'go', r)
        r = until(G, "const q = g.meta.camp.quests; return q.q_cellar ? q.q_cellar.stage : null", 10)
        ok('story syncs back to guest', r == 'go', r)
        # guest's d20 swings land on the host's creature
        r = evA(G, """const e = g.entities.find(m => m instanceof D.Mob && m.npc && m.npc.cid === 'mira'); return 1""")
        H.screenshot(path=f'{SP}/co4_host.png'); G.screenshot(path=f'{SP}/co5_guest.png')
        print('host logs:', '\n'.join(logs['H'][:12]))
        print('guest logs:', '\n'.join(logs['G'][:12]))
        b.close()
finally:
    relay.terminate()
print(f"{sum(results.values())}/{len(results)} passed")
