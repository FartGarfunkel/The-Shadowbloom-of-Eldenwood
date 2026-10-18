# Casts every spell in the game (free, at a pair of ghouls in front of you) and reports any that throw or refuse.
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from a3lib import *
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b, pg, logs = open_game(p)
    campaign_world(pg, 'Spells', 'spell-test')
    ev = pg.evaluate
    keys = ev("Object.keys(window.__dnd.spells || {})") or []
    if not keys:
        ev("window.__dnd.spells = window.__dnd.spells || null")
    keys = ev("Object.keys(window.__dnd.spells)")
    print('spells', len(keys), flush=True)
    res = {}
    for i, k in enumerate(keys):
        logs.clear()
        r = ev("""(k) => {
          const g = __game, lp = g.locals[0], p = lp.player, c = p.stats.dnd;
          lp._castCd = 0; c.slots = [9,9,9,9,9,9,9,9,9]; c.conc = null; p.health = p.maxHealth;
          if (lp.npcUI && lp.npcUI.close) try { lp.npcUI.close(); } catch (e) {}
          document.querySelectorAll('.way-view').forEach(e => e.remove()); lp.npcUI = null; lp.mode = 'play';
          // two ghouls in front, one ally... the look straight ahead
          for (const e of g.entities) if (e instanceof g.dev.Mob && (e.type === 'ghoul' || e.dndSummonBy)) e.remove = true;
          for (const wl of g._dndWalls || []) for (const [x, y, z] of wl.blocks) g.world.setBlock(x, y, z, 0); g._dndWalls = []; g._timeStopT = 0;
          p.pitch = -0.05;
          const lk = [-Math.sin(p.yaw), 0, -Math.cos(p.yaw)];
          for (const d of [4, 6]) { const m = g.addEntity(new g.dev.Mob(g, 'ghoul', p.x + lk[0] * d, p.y, p.z + lk[2] * d)); m.ai = false; }
          const msgs = []; const t0 = lp.toast; lp.toast = (m, kind) => { msgs.push(m); return t0.call(lp, m, kind); };
          try { const ok = window.__dnd.cast(lp, k, { free: true }); return ok ? 'ok' : 'refused: ' + msgs.join(' / '); } catch (e) { return 'THROW ' + (e && e.stack || e); } finally { lp.toast = t0; }
        }""", k)
        pg.wait_for_timeout(250)
        errs = [l for l in logs if 'pageerror' in l or '[error]' in l]
        res[k] = r if not errs else (r + ' | ERR ' + errs[0][:200])
        if r != 'ok' or errs: print(f'{k}: {res[k][:300]}', flush=True)
    json.dump(res, open(os.path.join(OUT, 'spells.json'), 'w'), indent=1)
    ok = sum(1 for v in res.values() if v == 'ok')
    print('ok', ok, 'of', len(res))
    b.close()
