# The 3D gear on heroes and townsfolk: a line of figures in every outfit, seen from the front, the side and behind.
# Usage: python3 tools/gear_shot.py OUTDIR [--pack PACK.zip]
import sys, os, json, time
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
PACK = sys.argv[sys.argv.index('--pack') + 1] if '--pack' in sys.argv else None
URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
os.makedirs(OUT, exist_ok=True)
logs = []
LOOKS = [
  dict(species='human', cls='wizard', outfit='archrobe', hair='long', hairCol='#e8e8e8', beard='wizard', hat='wizard', cloak=True),
  dict(species='human', cls='paladin', outfit='surcoat', hair='short', hairCol='#6a4020', beard='short', cloak=True, armor=['plate_helmet', 'plate_chestplate', 'plate_leggings', 'plate_boots'], helm='show'),
  dict(species='elf', cls='druid', outfit='leafrobe', hair='long', hairCol='#d8b060', hat='circlet', ears='long'),
  dict(species='tiefling', cls='warlock', outfit='pact', hair='tail', hairCol='#141414', horns='curled', tail=True, hood=False, cloak=True),
  dict(species='orc', cls='barbarian', outfit='furs', hair='wild', hairCol='#2a1a10', tusks=True, beard='none'),
  dict(species='dwarf', cls='fighter', outfit='gambeson', hair='mohawk', hairCol='#8a2a14', beard='braided', armor=[None, 'chain_chestplate', None, 'chain_boots']),
  dict(species='dragonborn', cls='sorcerer', outfit='silks', hair='bald', snout=True, scales=True, tail=True, horns='straight'),
  dict(species='halfling', cls='bard', outfit='doublet', hair='curly', hairCol='#b07a3a', hat='feather'),
  dict(species='human', cls='rogue', outfit='shadow', hair='short', hairCol='#141414', hood=True),
  dict(species='human', cls='ranger', outfit='ranger', hair='braids', hairCol='#8a5a2a', cloak=True, armor=[None, 'leather_chestplate', 'leather_leggings', 'leather_boots']),
  dict(species='gnome', cls='cleric', outfit='vestments', hair='bun', hairCol='#c84a1a', beard='forked'),
  dict(species='goliath', cls='monk', outfit='wraps', hair='bald', beard='none'),
]
VILL = ['farmer', 'baker', 'guard', 'librarian', 'elder', 'butcher', 'cleric', 'fisherman', 'merchant', 'innkeeper']
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': 1100, 'height': 640}).new_page()
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') and 'GL Driver' not in m.text and 'willReadFrequently' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.8, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(3000)
    if PACK:
        data = open(PACK, 'rb').read()
        pg.route('https://pack.local/pack.zip', lambda route: route.fulfill(status=200, body=data, headers={'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/zip'}))
        pg.evaluate("(async () => { const b = await (await fetch('https://pack.local/pack.zip')).arrayBuffer(); await window.__game.dev.installResourcePack(new File([b], 'GeruDoku.zip')); })()")
        pg.wait_for_timeout(1500); pg.reload(); pg.wait_for_timeout(8000)
        print('pack', pg.evaluate("window.PACKS_DEBUG ? JSON.stringify((({name, used, items, armor, error}) => ({name, used, items, armor, error}))(window.PACKS_DEBUG() || {})) : 'n/a'"), flush=True)
    pg.evaluate("window.__game.createWorld('Gear', 'gear-flat-7', 'creative')")
    for i in range(200):
        if pg.evaluate('window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(2500)
    for i in range(30):
        if pg.evaluate("!!__game.locals[0].creatorUI"): break
        pg.wait_for_timeout(500)
    pg.evaluate("() => { const lp = __game.locals[0]; if (lp.creatorUI) { lp.creatorUI.autoSkills(); lp.creatorUI.finish(); } }")
    pg.wait_for_timeout(1500)
    pg.evaluate("() => { const lp = __game.locals[0]; document.querySelectorAll('.camp-narr, .book-ui, .dnd-creator').forEach(e => e.remove()); lp.creatorUI = null; lp.mode = 'play'; lp.handState = () => null; __game.meta.time = 1500; if (__game.state !== 'playing' && __game.resume) __game.resume(); }")
    pg.wait_for_timeout(1500)
    setup = """(args) => {
      const [looks, vill] = args;
      const g = __game, lp = g.locals[0], p = lp.player, D = g.dev, G = window.__gear;
      p.flying = true; p.invuln = 1e9;
      const x0 = Math.floor(p.x), z0 = Math.floor(p.z);
      // a stage: flat stone floor, open sky
      const y0 = Math.floor(p.y) + 6;
      for (let x = x0 - 18; x <= x0 + 18; x++) for (let z = z0 - 12; z <= z0 + 14; z++) { g.world.setBlock(x, y0 - 1, z, D.B.smooth_stone || D.B.stone); for (let y = y0; y < y0 + 8; y++) g.world.setBlock(x, y, z, 0); }
      G.CAMPAIGNS.__geartest = { npcs: {} };
      const mk = (job, x, z, armor) => { const e = new D.Mob(g, 'villager', x + 0.5, y0, z + 0.5); e.npc = { v: 'none', i: 0, n: 'Test', j: job, s: 1234 + Math.round(x * 7 + z * 13), p: 0 }; e.yaw = 0; e.npcArmor = armor || null; g.addEntity(e); return e; };
      const ents = [];
      looks.forEach((l, i) => {
        const look = Object.assign(window.__dnd.dndPaintSkin ? {} : {}, l); const base = (() => { try { return null; } catch (e) { return null; } })();
        const id = 'gt' + i; G.NPC_JOBS[id] = { title: 'Hero', campaign: id, work: 'idle' };
        const LO = window.__dnd.LOOK_OUTFITS; G.CAMPAIGNS.__geartest.npcs[id] = { look: Object.assign({ cols: LO[l.outfit] ? LO[l.outfit].cols.slice() : undefined }, l, { armor: undefined }) };
        ents.push(mk(id, x0 - 11 + (i % 6) * 4.4, z0 + (i < 6 ? 0 : 5), l.armor));
      });
      vill.forEach((j, i) => ents.push(mk(j, x0 - 11 + (i % 5) * 5.5, z0 + 10, j === 'guard' ? ['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots'] : null)));
      window.__gt = { ents, x0, z0, y0 };
      return { n: ents.length, y0 };
    }"""
    # fill in each look from the species/class defaults so they're whole
    looks = pg.evaluate("""(L) => L.map(l => { const d = window.__dnd; const base = (typeof dndDefaultLook === 'function') ? null : null; return l; })""", LOOKS)
    pg.evaluate("(l) => { window.__wiz = l; }", LOOKS[0])
    pg.evaluate("() => document.querySelectorAll('.hud, #hud, .hotbar').forEach(e => e.style.visibility = 'hidden')")
    print('setup', pg.evaluate(setup, [LOOKS, VILL]), flush=True)
    pg.wait_for_timeout(2500)
    def view(x, y, z, yaw, pitch, name, wait=900):
        pg.evaluate(f"() => {{ const p = __game.locals[0].player, T = window.__gt; p.x = T.x0 + {x}; p.y = T.y0 + {y}; p.z = T.z0 + {z}; p.vx = p.vy = p.vz = 0; p.flying = true; p.fallStart = null; p.yaw = {yaw}; p.pitch = {pitch}; for (const e of T.ents) {{ e.vx = e.vz = 0; }} }}")
        pg.wait_for_timeout(wait)
        if name == 'row_front': print('pos', pg.evaluate("() => { const p = __game.locals[0].player, T = window.__gt, e = T.ents[0]; return { p: [p.x, p.y, p.z, p.flying, __game.meta.mode], e: [e.x, e.y, e.z, e.alive, !!e.remove], T: [T.x0, T.y0, T.z0], floor: __game.world.getBlock(T.x0, T.y0 - 1, T.z0), mode: __game.locals[0].mode, state: __game.state }; }"), flush=True)
        pg.screenshot(path=f'{OUT}/{name}.png')
    # yaw 0 looks toward -z; the figures face -z (yaw 0), so stand at +z... figures at z0..z0+10; camera south of them looking north
    for e_yaw, tag in [(0, 'front'), (1.5708, 'side'), (3.14159, 'back')]:
        pg.evaluate(f"() => {{ for (const e of window.__gt.ents) e.yaw = {e_yaw}; }}")
        view(-1, 1.6, -9.5, 3.14159, -0.1, f'row_{tag}')
    pg.evaluate("() => { for (const e of window.__gt.ents) e.yaw = 0.0; }")
    # close-ups of the first heroes
    for i in range(12):
        x = -11 + (i % 6) * 4.4 + 0.5; z = (0 if i < 6 else 5) + 0.5
        view(x - 1.1, 0.15, z - 3.0, 3.14159 + 0.35, 0.02, f'hero_{i}', 700)
    view(0, 1.4, 6.5, 3.14159, -0.15, 'villagers')
    # walking: the wizard, the druid and the warlock stride toward the camera (skirts swing with the legs, cloaks stream out)
    pg.evaluate("""() => { const T = window.__gt; window.__walkers = [0, 2, 3, 1].map((i, k) => { const e = T.ents[i]; e.home = [T.x0 - 4.5 + k * 3, T.z0 + 2]; e.x = e.home[0]; e.z = e.home[1]; e.yaw = 0; e.controlAI = () => ({ want: 1, dir: 0 }); return e; });
      for (const [i, e] of T.ents.entries()) if (!window.__walkers.includes(e)) e.remove = true;
      clearInterval(window.__walkI); window.__walkI = setInterval(() => { for (const e of window.__walkers) { e.yaw = 0; if (e.z < e.home[1] - 3) { e.z = e.home[1]; e.x = e.home[0]; } } }, 30); }""")
    for k, (cx, cz, yaw, nm) in enumerate([(0, -5.5, 3.14159, 'walk_front'), (-6, -1.5, 3.14159 + 1.2, 'walk_side'), (1, 6, 0, 'walk_back')]):
        pg.evaluate(f"() => {{ const p = __game.locals[0].player, T = window.__gt; p.x = T.x0 + {cx}; p.z = T.z0 + {cz}; p.y = T.y0 + 0.4; p.vx = p.vy = p.vz = 0; p.flying = true; p.yaw = {yaw}; p.pitch = 0.05; }}")
        for f in range(3):
            pg.wait_for_timeout(260 if f else 900); pg.screenshot(path=f'{OUT}/{nm}{f}.png')
    pg.evaluate("() => clearInterval(window.__walkI)")
    st = pg.evaluate("() => ({ tex: window.__gear.GEAR_TEX.size, mesh: window.__gear.GEAR_MESH.size, looks: window.__gt.ents.map(e => { const s = __game.dev.npcSkin(__game.renderer.gl, e.npc.s, e.npc.j); const L = window.__gear.gearLookOf(s); return L ? L.hair + '/' + L.beard + '/' + (L.outfit || (L.robe ? 'robe' : L.apron ? 'apron' : '-')) : null; }) })")
    print(json.dumps(st), flush=True)
    b.close()
for l in logs[:30]: print(l)
