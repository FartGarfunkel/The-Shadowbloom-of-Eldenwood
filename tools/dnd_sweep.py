# Every class, species and spell, once each: no errors, and each does something.
# Usage: python3 tools/dnd_sweep.py
import sys, os, json
from playwright.sync_api import sync_playwright
URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': 900, 'height': 560}).new_page()
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: logs.append(m.type + ' ' + m.text) if m.type == 'error' and 'TUNNEL' not in m.text else None)
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 2, scale: 0.5, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(3000)
    pg.evaluate("__game._campaignChoice = null; __game.createWorld('Sweep', 'sweep')")
    for i in range(160):
        if pg.evaluate("__game.state") == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(2000)
    res = pg.evaluate("""async () => {
      const D = window.__dnd, g = __game, lp = g.locals[0], p = lp.player, out = { classes: {}, species: {}, spells: {}, errors: [] };
      if (lp.creatorUI) { lp.creatorUI.done = true; }
      const wait = (ms) => new Promise(r => setTimeout(r, ms));
      const mk = (cls, species, lineage) => { const c = D.dndNewChar({ name: 'T', species, lineage, cls, bg: 'soldier', ab: { str: 14, dex: 14, con: 14, int: 14, wis: 14, cha: 14 }, bgPlus: { str: 2, con: 1 } }); p.stats.dnd = c; p.inv.armor.slots = [null, null, null, null]; p.recalcMax(); p.health = p.maxHealth; return c; };
      const foe = () => { p.pitch = 0; const L = p.look(); for (const e of g.entities) if (e instanceof D.Mob && !e.npc) e.remove = true; const m = g.addEntity(new D.Mob(g, 'ghoul', p.x + L[0] * 3, p.y, p.z + L[2] * 3)); m.persistent = true; return m; };
      for (const cls of Object.keys(D.DND_CLASSES)) {
        try { const c = mk(cls, 'human'); const m = foe(); lp._abCd = 0; const r0 = JSON.stringify(c.res), h0 = m.health; window.__last = null;
          lp.g.time += 5; D.dndDerive(c, p.inv);
          const before = { tmp: c.tempHp, conds: Object.keys(c.conds).length, slots: c.slots.join() };
          (window.__dnd.use || (() => {}))();
          lp._abCd = 0; window.__dnd_use_sig(lp); await wait(400);
          out.classes[cls] = { res: JSON.stringify(c.res) !== r0, conds: Object.keys(c.conds), tmp: c.tempHp, slots: c.slots.join(), foeHp: [h0, m.health] };
        } catch (e) { out.errors.push(cls + ': ' + e.message); }
      }
      for (const [sp, lin] of [['human'], ['elf', 'high'], ['dwarf'], ['halfling'], ['gnome', 'rock'], ['dragonborn', 'red'], ['orc'], ['tiefling', 'infernal'], ['goliath', 'storm']]) {
        try { const c = mk('fighter', sp, lin); const m = foe(); lp._raCd = 0; lp._stoneCd = 0; const h0 = m.health, r0 = c.res.racial; window.__dnd_use_racial(lp); await wait(300); out.species[sp] = { racial: [r0, c.res.racial], tmp: c.tempHp, foe: [h0, m.health], hp: c.d.maxHp, speed: c.d.speed, resist: c.d.resist };
        } catch (e) { out.errors.push(sp + ': ' + e.message); }
      }
      // every spell, from a wizard-ish caster of level 9 with every slot
      for (const k of Object.keys(D.DND_SPELLS)) {
        if (k.startsWith('__')) continue;
        try { const c = mk('wizard', 'human'); c.level = 9; c.xp = 48000; c.slots = [4, 3, 3, 3, 1]; c.slotsMax = c.slots.slice(); c.spells = [k]; p.health = Math.max(1, p.maxHealth - 5);
          const m = foe(); const h0 = m.health; lp._castCd = 0; g.time += 5; const ok = D.dndCast(lp, k); await wait(k === 'magic_missile' || k === 'scorching_ray' || k === 'eldritch_blast' || k === 'fire_bolt' || k === 'guiding_bolt' || k === 'chromatic_orb' || k === 'produce_flame' ? 700 : 120);
          out.spells[k] = { ok, foe: [h0, Math.round(m.health)], held: (m.dndHeld || 0) > 0 || (m.dndSleep || 0) > 0 || (m.dndCharm || 0) > 0 || (m.panicT || 0) > 0, mark: !!m.dndMark, conds: Object.keys(c.conds), zones: (lp._dndZones || []).length };
          if (c.conc) window.__dnd_end_conc(lp); lp._dndZones = [];
        } catch (e) { out.errors.push(k + ': ' + e.message + ' ' + (e.stack || '').split('\\n')[1]); }
      }
      return out; }""")
    print(json.dumps(res['errors'], indent=1))
    print('classes', json.dumps(res['classes']))
    print('species', json.dumps(res['species']))
    bad = [k for k, v in res['spells'].items() if not v['ok']]
    print('spells cast', len(res['spells']) - len(bad), 'of', len(res['spells']), 'not ok:', bad)
    for k, v in res['spells'].items(): print(' ', k, json.dumps(v))
    print('\n'.join(logs[:20]))
    b.close()
