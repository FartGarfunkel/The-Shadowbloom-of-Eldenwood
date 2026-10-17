# The Shadowbloom of Eldenwood: a play-test of the tabletop layer and the campaign.
# Usage: python3 tools/dnd_test.py OUTDIR
# New world -> character creator -> intro -> HUD and sheet -> combat rolls -> NPC talk -> quest -> dungeon boss -> ending.
import sys, time, json, os
from playwright.sync_api import sync_playwright
SP = sys.argv[1] if len(sys.argv) > 1 else '.'
URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
logs = []
def shot(pg, name): pg.screenshot(path=f'{SP}/{name}.png')
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"])
    pg = b.new_context(viewport={'width': 1200, 'height': 720}).new_page()
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') and 'GL Driver' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.5, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(3500)
    pg.click('#btn-play'); pg.wait_for_timeout(600)
    pg.fill('#nw-name', 'Eldenwood Test'); pg.fill('#nw-seed', 'shadow')
    pg.click('#new-world button[type=submit]')
    PRE = "const {dndDerive, dndCast, dndOf, CAMP_RT, Mob, NpcTalk, findSafeY} = window.__dnd;"
    ev = lambda code: pg.evaluate(code.replace("/*PRE*/", PRE))
    t0 = time.time()
    while time.time() - t0 < 120:
        if pg.evaluate('window.__game && window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    print('playing after', round(time.time() - t0, 1), 's')
    pg.wait_for_timeout(2500)
    shot(pg, '10_creator')
    st = ev("""() => { /*PRE*/ const g = __game, lp = g.locals[0]; return { creator: !!lp.creatorUI, meta: { dnd: g.meta.dnd, campaign: g.meta.campaign }, pos: [lp.player.x|0, lp.player.y|0, lp.player.z|0] }; }""")
    print('creator', json.dumps(st))
    # walk through the pages
    for step in range(7):
        ev(f"""() => {{ /*PRE*/ const ui = __game.locals[0].creatorUI; if (ui) {{ ui.s.step = {step}; ui.draw(); }} }}""")
        pg.wait_for_timeout(250)
        shot(pg, f'11_creator_{step}')
    # a dwarf cleric, then finish
    ev("""() => { /*PRE*/ const ui = __game.locals[0].creatorUI; ui.setSpecies('dwarf'); ui.setClass('cleric'); ui.s.step = 6; ui.draw(); }""")
    pg.wait_for_timeout(300); shot(pg, '12_creator_name')
    pg.click('.dnd-creator [data-done]'); pg.wait_for_timeout(1500)
    info = ev("""() => { /*PRE*/ const g = __game, lp = g.locals[0], p = lp.player, c = p.stats.dnd; dndDerive(c, p.inv);
      return { name: c.name, cls: c.cls, sp: c.species, lvl: c.level, hp: p.health, max: p.maxHealth, ac: c.d.ac, spells: c.spells, slots: c.slots, armor: p.inv.armor.slots.map(s => s && s.id), off: p.inv.offhand && p.inv.offhand.id,
        hot: p.inv.main.slots.slice(0, 9).map(s => s && s.id + 'x' + s.n), camp: g.meta.camp && { started: !!g.meta.camp.started, quests: g.meta.camp.quests }, narr: !!document.querySelector('.camp-narr') }; }""")
    print('char', json.dumps(info))
    pg.wait_for_timeout(1500); shot(pg, '13_intro')
    # through the intro
    for i in range(8):
        if not pg.evaluate("!!document.querySelector('.camp-narr')"): break
        pg.click('.camp-narr-next'); pg.wait_for_timeout(400)
    pg.wait_for_timeout(1200); shot(pg, '14_hud')
    q = ev("""() => ({ quests: __game.meta.camp.quests, track: [...document.querySelectorAll('.quest-track .qt')].map(x => x.textContent) })""")
    print('quests', json.dumps(q))
    # the sheet and the journal
    pg.evaluate("__game.locals[0].openDndSheet()"); pg.wait_for_timeout(500); shot(pg, '15_sheet'); pg.evaluate("__game.locals[0].closeDndSheet()")
    pg.evaluate("__game.locals[0].openJournal()"); pg.wait_for_timeout(500); shot(pg, '16_journal'); pg.evaluate("__game.locals[0].closeJournal()")
    # the town and Mira
    town = pg.evaluate("() => __dnd.camp.town('brookhollow')")
    print('town', json.dumps(town))
    ev("""() => { /*PRE*/ const g = __game, lp = g.locals[0], v = __dnd.camp.town('brookhollow'); lp.player.x = v.x + 0.5; lp.player.z = v.z + 4.5; lp.player.y = findSafeY(g.world, Math.floor(v.x), Math.floor(v.z + 4)) + 0.2; }""")
    t0 = time.time()
    while time.time() - t0 < 30:
        n = pg.evaluate("() => __dnd.camp.npcs()")
        if n: break
        pg.wait_for_timeout(700)
    print('npcs', json.dumps(n))
    pg.wait_for_timeout(1500); shot(pg, '17_town')
    talk = ev("""() => { /*PRE*/ const g = __game, lp = g.locals[0], e = CAMP_RT.ents.get('mira'); if (!e) return 'no mira'; lp.player.x = e.x + 1.2; lp.player.z = e.z; lp.player.y = e.y; lp.mode = 'play'; lp.openNpcUI(() => new NpcTalk(lp, e)); return lp.npcUI ? lp.npcUI.el.querySelector('.nt-text') && 'open' : 'none'; }""")
    print('talk', talk)
    pg.wait_for_timeout(2500); shot(pg, '18_talk')
    opts = pg.evaluate("() => [...document.querySelectorAll('.nt-opt')].map(b => b.textContent)")
    print('opts', opts)
    # take the first option, then the persuasion check
    pg.evaluate("() => document.querySelectorAll('.nt-opt')[0].click()"); pg.wait_for_timeout(1500)
    opts2 = pg.evaluate("() => [...document.querySelectorAll('.nt-opt')].map(b => b.textContent)")
    print('opts2', opts2)
    pg.evaluate("() => { const b = [...document.querySelectorAll('.nt-opt')].find(b => /Persuasion/.test(b.textContent)); if (b) b.click(); }"); pg.wait_for_timeout(600); shot(pg, '19_check')
    pg.wait_for_timeout(2500)
    print('after check', json.dumps(pg.evaluate("() => ({ q: __game.meta.camp.quests, gold: __game.locals[0].player.inv.count('gold_coin') })")))
    pg.evaluate("() => { const lp = __game.locals[0]; if (lp.npcUI) lp.npcUI.close(); }")
    # fight: a ghoul in front of us, swing at it until it dies
    fight = ev("""async () => { /*PRE*/ const g = __game, lp = g.locals[0], p = lp.player; const m = g.addEntity(new Mob(g, 'ghoul', p.x + 1.5, p.y, p.z)); const log = [];
      for (let i = 0; i < 30 && m.alive; i++) { p.attackCd = 0; const h0 = m.health; lp.attackEntity(m); log.push(Math.round((h0 - m.health) * 10) / 10); await new Promise(r => setTimeout(r, 50)); }
      return { dead: !m.alive, hits: log, xp: p.stats.dnd.xp }; }""")
    print('fight', json.dumps(fight))
    # take blows: AC rolls
    blows = ev("""() => { /*PRE*/ const g = __game, lp = g.locals[0], p = lp.player, m = new Mob(g, 'ghoul', p.x + 1, p.y, p.z); const out = []; for (let i = 0; i < 20; i++) { p.invuln = 0; const h = p.health; lp.hurt(3, { type: 'mob', attacker: m }); out.push(h - p.health); p.health = p.maxHealth; } return out; }""")
    print('blows', blows)
    # a spell
    cast = ev("""() => { /*PRE*/ const g = __game, lp = g.locals[0], p = lp.player, c = p.stats.dnd; const L = p.look(); p.pitch = 0; const L2 = p.look(); const m = g.addEntity(new Mob(g, 'ghoul', p.x + L2[0] * 5, p.y, p.z + L2[2] * 5)); lp._dndSpell = 'sacred_flame'; lp._castCd = 0; const h0 = m.health; const ok = dndCast(lp, 'sacred_flame'); lp._castCd = 0; const ok2 = dndCast(lp, 'cure_wounds'); return { ok, ok2, hp0: h0, hp: m.health, slots: c.slots }; }""")
    print('cast', json.dumps(cast))
    pg.wait_for_timeout(800); shot(pg, '20_cast')
    # the crypt: find it, beat its keeper
    d = pg.evaluate("() => __dnd.camp.dungeon('crypt')")
    print('crypt', json.dumps(d))
    pg.evaluate("() => __dnd.camp.do({ flag: 'test' })")
    if d:
        ev(f"""() => {{ /*PRE*/ const g = __game, lp = g.locals[0], p = lp.player; p.x = {d['ent'][0]} + 0.5; p.z = {d['ent'][1]} + 0.5; p.y = 140; p.vy = 0; p.flying = true; }}""")
        pg.wait_for_timeout(5000)
        ev(f"""() => {{ /*PRE*/ const g = __game, p = g.locals[0].player; const y = findSafeY(g.world, {d['ent'][0]}, {d['ent'][1]}); p.flying = false; if (y > 0) p.y = y + 0.2; p.fallStart = null; return y; }}""")
        pg.wait_for_timeout(1000)
        pg.evaluate("() => __dnd.camp.tick()")
        print('found', json.dumps(pg.evaluate("() => ({ q: __game.meta.camp.quests.q_cellar, pos: [__game.locals[0].player.x|0, __game.locals[0].player.y|0, __game.locals[0].player.z|0], dead: __game.locals[0].player.dead })")))
        boss = ev(f"""() => {{ /*PRE*/ const g = __game, lp = g.locals[0], p = lp.player, b = {json.dumps(d['boss'])}; const m = g.addEntity(new Mob(g, b.type, p.x + 2, p.y, p.z)); m.dungeon = {json.dumps(d['id'])}; m.hurt(9999, {{ attacker: lp }}); return !m.alive; }}""")
        print('boss down', boss)
        pg.wait_for_timeout(1500)
        pg.evaluate("() => __dnd.camp.tick()")
        print('after boss', json.dumps(pg.evaluate("() => __game.meta.camp.quests.q_cellar")))
    shot(pg, '21_end')
    print('\n'.join(logs[:40]))
    b.close()
