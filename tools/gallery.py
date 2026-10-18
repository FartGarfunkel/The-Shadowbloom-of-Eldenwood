# The pictures for the GitHub page: the menu and the hero maker, your hero and a party of others, Stonebridge from the air
# and on its streets, the inn, the smithy, the apothecary and the library, a conversation and a fight.
# Usage: python3 tools/gallery.py OUTDIR [--pack GeruDoku.zip] [--only name,name]
import sys, os, json, time
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else 'screenshots'
PACK = sys.argv[sys.argv.index('--pack') + 1] if '--pack' in sys.argv else None
ONLY = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
os.makedirs(OUT, exist_ok=True)
logs = []
def want(n): return not ONLY or n in ONLY
# the hero on the title: a wizard with a long white beard
HERO = dict(name='Aldric Greymantle', species='human', cls='wizard')
LOOK = dict(hair='long', hairCol='#e8e8e8', beard='wizard', beardCol='#f0f0ea', hat='wizard', cloak=True, outfit='archrobe', body='broad', skin='#e8bf9a', eyes='round', eyeCol='#3a5ab0', mouth='smile', marks='none')
PARTY = [
  dict(species='human', outfit='surcoat', hair='short', hairCol='#6a4020', beard='short', cloak=True, armor=['plate_helmet', 'plate_chestplate', 'plate_leggings', 'plate_boots'], helm='hide'),
  dict(species='elf', outfit='leafrobe', hair='long', hairCol='#d8b060', hat='circlet', ears='long'),
  dict(species='tiefling', outfit='pact', hair='tail', hairCol='#141414', horns='curled', hornCol='#d8c8a8', tail=True, cloak=True, skin='#b04a4a'),
  dict(species='orc', outfit='furs', hair='wild', hairCol='#2a1a10', tusks=True, skin='#7a9a5a'),
  dict(species='dwarf', outfit='gambeson', hair='mohawk', hairCol='#8a2a14', beard='braided', armor=[None, 'chain_chestplate', None, 'chain_boots']),
  dict(species='halfling', outfit='doublet', hair='curly', hairCol='#b07a3a', hat='feather'),
  dict(species='human', outfit='ranger', hair='braids', hairCol='#8a5a2a', hood=True, cloak=True, armor=[None, 'leather_chestplate', 'leather_leggings', 'leather_boots']),
  dict(species='dragonborn', outfit='silks', hair='bald', snout=True, scales=True, tail=True, horns='straight', skin='#3a6a9a'),
]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"])
    pg = b.new_context(viewport={'width': 1280, 'height': 720}).new_page(); pg.set_default_timeout(90000)
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error',) and 'TUNNEL' not in m.text and 'GL Driver' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 5, scale: 0.8, farTerrain: 1, fpBody: false}))"); pg.reload(); pg.wait_for_timeout(3000)
    if PACK:
        data = open(PACK, 'rb').read()
        pg.route('https://pack.local/pack.zip', lambda route: route.fulfill(status=200, body=data, headers={'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/zip'}))
        pg.evaluate("(async () => { const b = await (await fetch('https://pack.local/pack.zip')).arrayBuffer(); await window.__game.dev.installResourcePack(new File([b], 'GeruDoku.zip')); })()")
        pg.wait_for_timeout(1500); pg.reload(); pg.wait_for_timeout(8000)
    # ---- the hero maker, with our wizard ----
    pg.click('#btn-play'); pg.wait_for_timeout(1500)
    pg.evaluate("""([H, L]) => { const ui = window.__game.ui._heroUI; if (!ui) return; ui.setSpecies(H.species); ui.setClass(H.cls); Object.assign(ui.s.look, L); ui.s.look.cols = window.__dnd.LOOK_OUTFITS[L.outfit].cols.slice(); ui.s.name = H.name; ui.s._named = true; ui._hyTurned = true; ui.s.step = 5; ui.draw(); }""", [HERO, LOOK])
    pg.wait_for_timeout(1200)
    pg.evaluate("() => { const ui = window.__game.ui._heroUI; if (ui && ui._hyFig) ui._hyFig.turn(-10); }")
    pg.wait_for_timeout(600)
    if want('hero-maker'): pg.screenshot(path=f'{OUT}/hero-maker.png')
    pg.evaluate("() => { const ui = window.__game.ui._heroUI; ui.s.step = 6; ui.draw(); }"); pg.wait_for_timeout(400)
    pg.evaluate("() => document.querySelector('[data-done]').click()"); pg.wait_for_timeout(1500)
    # back to the title for the menu picture
    pg.evaluate("() => window.__game.ui.show('title')"); pg.wait_for_timeout(5000)
    pg.evaluate("() => { const f = document.querySelector('#hy-hero .hy-fig'); if (f) { f.classList.remove('spin'); f.style.setProperty('--ry', '-28deg'); } }"); pg.wait_for_timeout(400)
    if want('menu'): pg.screenshot(path=f'{OUT}/menu.png')
    pg.evaluate("() => window.__game.ui.show('worlds')"); pg.wait_for_timeout(800)
    pg.evaluate("() => { document.querySelector('#nw-name').value = 'Eldenwood'; document.querySelector('#nw-seed').value = 'eldenwood'; document.querySelector('#new-world button[type=submit]').click(); }")
    t0 = time.time()
    while time.time() - t0 < 150:
        if pg.evaluate('window.__game && window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(4000)
    if want('intro'): pg.screenshot(path=f'{OUT}/intro.png')
    for i in range(12):
        if not pg.evaluate("!!document.querySelector('.camp-narr')"): break
        pg.evaluate("() => { const n = document.querySelector('.camp-narr-next'); if (n) n.click(); }"); pg.wait_for_timeout(300)
    pg.evaluate("() => { document.querySelectorAll('.camp-narr, .book-ui').forEach(e => e.remove()); const lp = __game.locals[0], p = lp.player; p.invuln = 1e9; lp.mode = 'play'; __game.meta.time = 4000; lp.handState = () => null; Object.defineProperty(lp, 'target', { get: () => null, set: () => {}, configurable: true }); if (__game.state !== 'playing' && __game.resume) __game.resume(); }")
    def hud(on): pg.evaluate(f"() => {{ const lp = __game.locals[0]; lp.el.classList.toggle('nohud', {'false' if on else 'true'}); document.querySelectorAll('.toast, .toasts').forEach(e => e.style.display = {json.dumps('' if on else 'none')}); }}")
    def go(x, y, z, yaw, pitch, wait=9000, name=None, view=0):
        pg.evaluate(f"() => {{ const lp = __game.locals[0], p = lp.player; lp.viewMode = {view}; p.x = {x}; p.y = {y}; p.z = {z}; p.vx = p.vy = p.vz = 0; p.yaw = {yaw}; p.pitch = {pitch}; p.flying = true; lp.mode = 'play'; }}")
        t1 = time.time()
        while time.time() - t1 < wait / 1000:
            pg.evaluate(f"() => {{ const g = __game, p = g.locals[0].player; if (g.state !== 'playing' && g.resume) g.resume(); g.meta.time = 1500; p.x = {x}; p.y = {y}; p.z = {z}; p.vx = p.vy = p.vz = 0; p.yaw = {yaw}; p.pitch = {pitch}; }}")
            pg.wait_for_timeout(400)
        if name: pg.screenshot(path=f'{OUT}/{name}.png')
    hud(False)
    info = pg.evaluate("""() => { const v = __dnd.camp.town('stonebridge'); const V = __game.world.gen.villageAt(Math.floor(v.x / 352), Math.floor(v.z / 352)); return { x: V.x, y: V.y, z: V.z, r: V.r, P: V.P }; }""")
    X, Y, Z, R = info['x'], info['y'], info['z'], info['r']
    print('stonebridge', json.dumps(info), flush=True)
    if want('town'):
        go(X + 0.5, Y + 4, Z + 0.5, 0, 0, 25000)                                   # let the town load around you first
        go(X + R * 0.35, Y + 30, Z + R * 0.5, 0.6, -0.72, 35000, 'town')
    def inside(kind, lx, lz, look, name, ly=1.6, nth=0, pitch=-0.2):
        if not want(name): return
        r = pg.evaluate(f"""() => {{ const v = __game.world.gen.villageAt(Math.floor({X} / 352), Math.floor({Z} / 352)); const bl = v.blds.filter(b => b.type === '{kind}')[{nth}]; if (!bl) return null;
          const rot = (r, x, z) => r === 0 ? [x, z] : r === 1 ? [-z, x] : r === 2 ? [-x, -z] : [z, -x]; const [a, c] = rot(bl.r, {lx}, {lz}); const [la, lc] = rot(bl.r, {look[0]}, {look[1]});
          const yaw = Math.atan2(-(la - a), -(lc - c)); return [bl.ox + a + 0.5, bl.y + {ly}, bl.oz + c + 0.5, yaw]; }}""")
        if not r: print('no', kind); return
        go(r[0], r[1], r[2], r[3], pitch, 7000, name)
    inside('hall', 2, 7.5, (2, 1), 'inn', 2.7, 0, -0.42)
    inside('smithy', 4, -1, (4, 5), 'smithy', 1.8)
    inside('library', 4, 1, (4, 7), 'apothecary', 1.6, 0)
    inside('library', 4, 1, (4, 7), 'library', 1.6, 1)
    # the square, with a party of heroes in every kind of gear standing about it
    if want('heroes') or want('square'):
        pg.evaluate("""(party) => { const g = __game, D = g.dev, G = window.__gear, LO = window.__dnd.LOOK_OUTFITS, sb = __dnd.camp.town('stonebridge');
          const V = g.world.gen.villageAt(Math.floor(sb.x / 352), Math.floor(sb.z / 352)); G.CAMPAIGNS.__gallery = { npcs: {} };
          window.__party = party.map((l, i) => { const id = 'gal' + i; G.NPC_JOBS[id] = { title: 'Adventurer', campaign: id, work: 'idle' }; G.CAMPAIGNS.__gallery.npcs[id] = { look: Object.assign({ cols: LO[l.outfit].cols.slice() }, l, { armor: undefined }) };
            const a = (i - (party.length - 1) / 2) * 1.6, x = V.x + 0.5 + a, z = V.z + 3.2 + Math.abs(a) * 0.3;
            const e = new D.Mob(g, 'villager', x, V.y + 1, z); e.npc = { v: 'none', i: 0, n: ['Sir Brannoc', 'Elowen', 'Vesper', 'Durg', 'Thrain', 'Milo', 'Wren', 'Arzhan'][i], j: id, s: 900 + i, p: 0 }; e.yaw = Math.PI; e.npcArmor = l.armor || null; g.addEntity(e); return e; }); }""", PARTY)
        pg.wait_for_timeout(1500)
        if want('heroes'): go(X + 0.5, Y + 2.3, Z + 8.6, 0, -0.1, 12000, 'heroes')
        if want('square'):
            pg.evaluate("() => { for (const e of window.__party || []) e.remove = true; }")
            go(X + 0.5, Y + 3, Z + info['P'] - 1, 0, -0.05, 9000, 'square')
    # a word with someone who matters: the first person the story sends you to
    if want('talk'):
        post = pg.evaluate("__dnd.camp.post('eldon')")
        if post:
            go(post[0] + 0.5, post[1], post[2] + 2.6, 0, -0.08, 6000)
            pg.evaluate("() => __dnd.camp.talk('eldon')"); pg.wait_for_timeout(1500)
            hud(True); pg.screenshot(path=f'{OUT}/talk.png'); hud(False)
            pg.evaluate("() => { const lp = __game.locals[0]; if (lp.npcUI) try { lp.npcUI.close(); } catch (e) { lp.npcUI = null; } lp.mode = 'play'; }")
    # out in the wild, in a fight: you (from behind), a spell on the way, stalkers and goblins coming at you
    if want('fight'):
        pg.evaluate("() => { const p = __game.locals[0].player; }")
        fx, fz = X + 4, Z + R + 34
        go(fx + 0.5, Y + 30, fz + 0.5, 0, 0.12, 14000)                     # let the ground load first
        y = pg.evaluate(f"__dnd.findSafeY(__game.world, {fx}, {fz})")
        print('fight ground', y, flush=True)
        go(fx + 0.5, (y or Y) + 0.0, fz + 0.5, 0, 0.12, 6000, None, view=2)
        pg.evaluate(f"""() => {{ const g = __game, D = g.dev, p = g.locals[0].player; p.flying = false; window.__foes = [];
          for (const [t, dx, dz] of [['bloom_stalker', -2, -6], ['bloom_stalker', 2.5, -7], ['goblin', 0, -9], ['goblin', -4, -10], ['ash_hound', 4.5, -9.5]]) {{ const y = __dnd.findSafeY(g.world, Math.floor(p.x + dx), Math.floor(p.z + dz)); const m = new D.Mob(g, t, p.x + dx, y || p.y, p.z + dz); g.addEntity(m); window.__foes.push(m); }} }}""")
        pg.wait_for_timeout(2500)
        pg.evaluate("() => { const lp = __game.locals[0]; try { lp.player.swing = 0.35; } catch (e) {} try { if (typeof lp.castSpell === 'function') lp.castSpell(); } catch (e) {} }")
        pg.wait_for_timeout(200)
        hud(True); pg.screenshot(path=f'{OUT}/fight.png'); hud(False)
        pg.evaluate("() => { for (const m of window.__foes || []) m.remove = true; }")
    # Oakhaven, the next town down the road
    if want('oakhaven'):
        oi = pg.evaluate("""() => { const v = __dnd.camp.town('oakhaven'); if (!v) return null; const V = __game.world.gen.villageAt(Math.floor(v.x / 352), Math.floor(v.z / 352)); return V ? { x: V.x, y: V.y, z: V.z, r: V.r } : null; }""")
        if oi:
            go(oi['x'] + 0.5, oi['y'] + 4, oi['z'] + 0.5, 0, 0, 25000)
            go(oi['x'] - oi['r'] * 0.5, oi['y'] + 26, oi['z'] + oi['r'] * 0.6, -0.7, -0.45, 30000, 'oakhaven')
    b.close()
for l in logs[:30]: print(l)
