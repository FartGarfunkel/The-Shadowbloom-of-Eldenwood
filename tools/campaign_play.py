# The campaign, played start to finish by a script: every main quest stage is done the way a player would do it
# (go there, talk to whoever sets it in motion, fight what guards it, read the letter, rest the night), and the test
# checks the story moves on, the people and things are where they should be, and the bosses wake and fall.
# Usage: python3 tools/campaign_play.py OUTDIR [--side]
import sys, os, json, time
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
SIDE = '--side' in sys.argv
URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
HELP = open(os.path.join(os.path.dirname(__file__), 'campaign_play.js')).read()
os.makedirs(OUT, exist_ok=True)
logs, problems, notes = [], [], []
def prob(m): problems.append(m); print('  !!', m, flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"])
    pg = b.new_context(viewport={'width': 1100, 'height': 680}).new_page()
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') and 'GL Driver' not in m.text and 'TUNNEL' not in m.text and 'willReadFrequently' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.5, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(3500)
    pg.click('#btn-play'); pg.wait_for_timeout(1200)
    # no hero on the profile yet: the hero maker opens first; take the default hero and go on to the worlds
    if pg.evaluate("!!document.querySelector('.cr-tab[data-step]')"):
        pg.evaluate("() => document.querySelector('.cr-tab[data-step=\"6\"]').click()"); pg.wait_for_timeout(500)
        pg.evaluate("() => document.querySelector('[data-done]').click()"); pg.wait_for_timeout(1200)
    print('screen', pg.evaluate("[...document.querySelectorAll('.screen')].filter(e => !e.hidden).map(e => e.id).join(',')"), flush=True)
    pg.evaluate("() => { document.querySelector('#nw-name').value = 'Campaign Play'; document.querySelector('#nw-seed').value = 'eldenwood'; document.querySelector('#new-world button[type=submit]').click(); }")
    t0 = time.time()
    while time.time() - t0 < 120:
        if pg.evaluate('window.__game && window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(2500)
    print('creator', pg.evaluate("() => { const ui = __game.locals[0].creatorUI; if (!ui) return 'none'; ui.autoSkills(); ui.finish(); return 'done'; }"))
    pg.wait_for_timeout(2500)
    pg.evaluate(HELP)
    ev = lambda js: pg.evaluate(js)
    W = lambda ms: pg.wait_for_timeout(ms)
    ev("__cp.closeUI()")
    def goto(x, z, y=None, settle=2500, timeout=45):
        t1 = time.time()
        while time.time() - t1 < timeout:
            ev(f"__cp.hold({x} + 0.5, {y if y is not None else 150}, {z} + 0.5)")
            if ev(f"__cp.loaded({x}, {z}) && __cp.loaded({x} + 20, {z} + 20) && __cp.loaded({x} - 20, {z} - 20)"): break
            W(500)
        else: prob(f'chunks never loaded at {x},{z}')
        if y is None:
            sy = ev(f"__cp.safeY({x}, {z})")
            y = sy if sy and sy > 0 else 80
        t2 = time.time()
        while time.time() - t2 < settle / 1000:
            ev(f"__cp.hold({x} + 0.5, {y} + 0.05, {z} + 0.5)"); W(300)
        return y
    def goto_ref(ref, **kw):
        at = ev(f"__cp.pos({json.dumps(ref)})")
        if not at: prob(f'no position for {ref}'); return None
        return goto(int(at[0]), int(at[1]), **kw)
    def where_npc(nid):
        N = ev(f"(() => {{ const N = __dnd.camp.def().npcs[{json.dumps(nid)}]; return {{ town: N.town, place: N.place, dungeon: N.dungeon, at: N.at, prop: !!N.prop, room: N.room }}; }})()")
        post = ev(f"__dnd.camp.post({json.dumps(nid)})")
        return N, post
    def visit_npc(nid):
        N, post = where_npc(nid)
        if N['dungeon']:
            if not post: goto_ref(N['dungeon']); post = ev(f"__dnd.camp.post({json.dumps(nid)})")
            if not post: prob(f'{nid}: no dungeon spot'); return
            goto(int(post[0]), int(post[2]), y=int(post[1]), settle=3000)
        elif post: goto(int(post[0]), int(post[2]), y=int(post[1]) if post[1] else None, settle=3000)
        else:
            ref = N['town'] or N['place'] or N['at']
            if ref: goto_ref(ref if not isinstance(ref, list) else ref)
            post = ev(f"__dnd.camp.post({json.dumps(nid)})")
            if post: goto(int(post[0]), int(post[2]), y=int(post[1]) if post[1] else None, settle=3000)
        for _ in range(12):
            if (N['prop'] and ev(f"__cp.prop({json.dumps(nid)})")) or (not N['prop'] and ev(f"__cp.npcAt({json.dumps(nid)})")): return True
            W(500)
        shown = ev(f"__dnd.camp.test(__dnd.camp.def().npcs[{json.dumps(nid)}].if || null) && !(__dnd.camp.def().npcs[{json.dumps(nid)}].until && __dnd.camp.test(__dnd.camp.def().npcs[{json.dumps(nid)}].until))")
        prob(f"{nid} ({'prop' if N['prop'] else 'npc'}) did not appear (conditions {'met' if shown else 'NOT met'}) post={post}")
        return False
    def clear_place(pid):
        P = ev(f"(() => {{ const P = __dnd.camp.def().places[{json.dumps(pid)}]; return {{ kind: P.kind, boss: P.boss, bossIf: P.bossIf || null }}; }})()")
        if ev(f"__cp.cleared({json.dumps(pid)})"): return
        # a keeper that only wakes once something has happened (a conversation that ends in a fight): make it happen
        if P['boss'] and isinstance(P['bossIf'], str) and P['bossIf'] != '_never' and not P['bossIf'].startswith('!') and not ev(f"__dnd.camp.test({json.dumps(P['bossIf'])})"):
            do_flag(P['bossIf'])
        if P['boss'] and ev(f"__dnd.camp.test({json.dumps(P['bossIf'])})"):
            if P['kind'] == 'dungeon':
                goto_ref(pid, settle=1500)
                spot = ev(f"__dnd.camp.spot({json.dumps(pid)}, 'boss')")
                if not spot: prob(f'{pid}: no boss room'); return
                goto(int(spot[0]), int(spot[2]), y=int(spot[1]), settle=3500)
            else:
                site = next((s for s in ev("__dnd.camp.sites()") if s['place'] == pid), None)
                if not site: prob(f'{pid}: no site'); return
                ba = site['bossAt'] or [site['x'], site['y'], site['z'] + 2]
                goto(int(ba[0]) + 3, int(ba[2]), y=int(ba[1]), settle=3500)
            for _ in range(16):
                if ev(f"__cp.bossOf({json.dumps(pid)})"): break
                W(500)
            boss = ev(f"__cp.bossOf({json.dumps(pid)})")
            if not boss: prob(f'{pid}: boss {P["boss"]} never woke'); ev(f"__dnd.camp.do({{ clear: {json.dumps(pid)} }})"); return
            notes.append(f'{pid}: {boss["type"]} woke ({boss["hp"]} hp)')
            ev(f"__cp.killBoss({json.dumps(pid)})"); W(1500); ev("__cp.tick()")
            if not ev(f"__cp.cleared({json.dumps(pid)})"): prob(f'{pid}: boss died but the place is not cleared')
        else:
            # a place cleared by what you do there (a seal solved, a cage freed)
            src = ev(f"""(() => {{ const D = __dnd.camp.def(); for (const [id, N] of Object.entries(D.npcs)) for (const [k, nd] of Object.entries((N.talk && N.talk.nodes) || {{}})) if ([].concat(nd.do || []).some(e => e && e.clear === {json.dumps(pid)})) return {{ npc: id, node: k }}; return null; }})()""")
            if src:
                visit_npc(src['npc'])
                ev(f"__dnd.camp.do(__dnd.camp.def().npcs[{json.dumps(src['npc'])}].talk.nodes[{json.dumps(src['node'])}].do)")
            else: prob(f'{pid}: no boss awake (bossIf {P["bossIf"]}) and nothing clears it'); ev(f"__dnd.camp.do({{ clear: {json.dumps(pid)} }})")
    def do_flag(f):
        if ev(f"__cp.flag({json.dumps(f)})"): return
        src = ev(f"__cp.source({json.dumps(f)})")
        if not src: prob(f'flag {f}: nothing sets it'); ev(f"__cp.setFlag({json.dumps(f)})"); return
        k = src['kind']
        if k in ('node', 'opt', 'pass'):
            visit_npc(src['npc'])
            ev(f"__cp.runSource({json.dumps(src)})")
            W(800); ev("__cp.closeUI()")
            if ev("__cp.mobs().length"): ev("__cp.killAll()"); W(800)
        elif k == 'trigger':
            if src['rest']:
                ev("__cp.rest()"); W(2500); ev("__cp.closeUI()")
            else: ev("__cp.tick()"); W(1500)
        elif k == 'creature':
            ev(f"__cp.spawnKill({json.dumps(src['id'])})"); W(1200)
        else: W(1500)
        ev("__cp.tick()"); W(600)
        if not ev(f"__cp.flag({json.dumps(f)})"): prob(f'flag {f} still unset after {src}'); ev(f"__cp.setFlag({json.dumps(f)})")
    def satisfy(q, sid, obj):
        objs = obj.get('any') or [obj]
        o = objs[0]
        if o.get('flag') and o['flag'] != '_never': do_flag(o['flag'])
        elif o.get('flags'): [do_flag(f) for f in o['flags'][:o.get('n', len(o['flags']))]]
        elif o.get('reach'): goto_ref(o['reach'], settle=2500)
        elif o.get('clear'): clear_place(o['clear'])
        elif o.get('read'):
            if not ev(f"__dnd.camp.state().letters.includes({json.dumps(o['read'])})"):
                # a courier or a friend hands it over: go and find them
                src = ev(f"__cp.letterSource({json.dumps(o['read'])})")
                if src and src['kind'] in ('node', 'opt', 'pass'):
                    visit_npc(src['npc']); ev(f"__cp.runSource({json.dumps(src)})"); W(800); ev("__cp.closeUI()")
                elif src and src['kind'] == 'trigger': ev("__cp.tick()"); W(1500)
            if not ev(f"__dnd.camp.state().letters.includes({json.dumps(o['read'])})"): prob(f'{q}.{sid}: letter {o["read"]} not in hand when needed')
            ev(f"__cp.read({json.dumps(o['read'])})"); W(400); ev("__cp.closeUI()")
        elif o.get('talk'): visit_npc(o['talk']); ev(f"__dnd.camp.talk({json.dumps(o['talk'])})"); W(500); ev("__cp.closeUI()")
        elif o.get('haveAll'): [ev(f"__cp.give({json.dumps(i)})") for i in o['haveAll']]
        elif o.get('kill'): [ev(f"__cp.spawnKill({json.dumps(o['kill'] if isinstance(o['kill'], str) else o['kill'][0])})") for _ in range(o.get('n', 1))]
        elif o.get('flag') == '_never': return 'manual'
        else: prob(f'{q}.{sid}: unknown objective {o}')
    def play(q):
        if ev(f"__cp.stage({json.dumps(q)})") is None:
            src = ev(f"""(() => {{ const D = __dnd.camp.def(); for (const [id, N] of Object.entries(D.npcs)) for (const [k, nd] of Object.entries((N.talk && N.talk.nodes) || {{}})) {{ if ([].concat(nd.do || []).some(e => e && e.quest === {json.dumps(q)})) return {{ kind: 'node', npc: id, node: k }}; for (const [i, o] of (nd.opts || []).entries()) if ([].concat(o.do || []).some(e => e && e.quest === {json.dumps(q)})) return {{ kind: 'opt', npc: id, node: k, i }}; }} return null; }})()""")
            if src: visit_npc(src['npc']); ev(f"__cp.runSource({json.dumps(src)})"); W(800); ev("__cp.closeUI()")
            if ev(f"__cp.stage({json.dumps(q)})") is None: prob(f'{q}: could not start'); return
        print(f'== {q} {ev(f"__cp.quest({json.dumps(q)}).title")}', flush=True)
        for _ in range(16):
            sid = ev(f"__cp.stage({json.dumps(q)})")
            if sid == 'DONE': break
            obj = ev(f"__cp.quest({json.dumps(q)}).stages[{json.dumps(sid)}].obj")
            print(f'   {sid}: {json.dumps(obj)}', flush=True)
            r = satisfy(q, sid, obj or {})
            if r == 'manual':
                # finished by talking to the giver (Wenna, Mother Aldwyn…): find the option that completes it
                src = ev(f"""(() => {{ const D = __dnd.camp.def(); for (const [id, N] of Object.entries(D.npcs)) for (const [k, nd] of Object.entries((N.talk && N.talk.nodes) || {{}})) {{ if ([].concat(nd.do || []).some(e => e && (e.complete === {json.dumps(q)} || (e.stage && e.stage.startsWith({json.dumps(q)} + ':'))))) return {{ kind: 'node', npc: id, node: k }}; for (const [i, o] of (nd.opts || []).entries()) if ([].concat(o.do || []).some(e => e && e.complete === {json.dumps(q)})) return {{ kind: 'opt', npc: id, node: k, i }}; }} return null; }})()""")
                if src: visit_npc(src['npc']); ev(f"__cp.runSource({json.dumps(src)})")
                else: prob(f'{q}.{sid}: nothing completes it')
            W(700); ev("__cp.closeUI()"); ev("__cp.tick()"); W(900); ev("__cp.tick()")
            now = ev(f"__cp.stage({json.dumps(q)})")
            if now == sid:
                W(2000); ev("__cp.tick()"); now = ev(f"__cp.stage({json.dumps(q)})")
                if now == sid:
                    prob(f'{q}.{sid}: did not advance'); nxt = ev(f"__cp.quest({json.dumps(q)}).stages[{json.dumps(sid)}].next")
                    ev(f"__dnd.camp.{'stage' if nxt else 'complete'}({json.dumps(q)}{', ' + json.dumps(nxt) if nxt else ''})")
        print(f'   -> {ev(f"__cp.stage({json.dumps(q)})")} · level {ev("__cp.level()")} · anchors {len(ev("__cp.anchors()"))}', flush=True)
    MAIN = ['q1', 'q_flame', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13']
    SIDEQ = ['sq_aric', 'sq_nico', 'sq_mug', 'sq_grom', 'sq_milk', 'sq_thornmere']
    if SIDE:
        play('q1'); play('q_flame'); play('q2')
        for q in SIDEQ: play(q)
    else:
        for q in MAIN: play(q)
    st = ev("({ ended: !!__dnd.camp.state().ended, flags: Object.keys(__dnd.camp.state().flags).length, cleared: Object.keys(__dnd.camp.state().cleared), anchors: Object.keys(__dnd.camp.state().anchors), level: __cp.level() })")
    print('final', json.dumps(st))
    pg.screenshot(path=f'{OUT}/final.png')
    b.close()
print(f'\n{len(problems)} problems')
for m in problems: print('  -', m)
print('\nnotes'); [print('  ', n) for n in notes]
errs = [l for l in logs if 'pageerror' in l or '[error]' in l]
print(f'\n{len(errs)} errors in the console')
for l in errs[:30]: print('  ', l)
warns = [l for l in logs if 'campaign' in l.lower()]
for l in warns[:20]: print('  ', l)
