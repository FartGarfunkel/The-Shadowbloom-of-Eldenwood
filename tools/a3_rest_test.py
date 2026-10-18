# The day ends when you rest: the clock holds late in the evening in a campaign world, the chip shows, and making camp brings the morning.
import sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from a3lib import *
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
os.makedirs(OUT, exist_ok=True)
fails = []
def check(ok, m):
    print(('ok   ' if ok else 'FAIL ') + m, flush=True)
    if not ok: fails.append(m)
with sync_playwright() as p:
    b, pg, logs = open_game(p)
    campaign_world(pg)
    ev = pg.evaluate
    check(ev("__game.restDayOn()") is True, 'rest-ends-day is on in a campaign world')
    ev("__game.meta.time = DAY_LEN_T * 0.64".replace('DAY_LEN_T', '1200'))
    ev("__game.rules().nightMinutes = 0.5; __game.rules().dayMinutes = 0.5")
    pg.wait_for_timeout(9000)
    ph = ev("__game.meta.time / 1200")
    check(abs(ph - 0.65) < 0.002, f'clock held at 0.65 (is {ph:.4f})')
    check(ev("__game.lateHeld()") is True, 'night is held')
    check(ev("!!document.querySelector('.late-chip') && !document.querySelector('.late-chip').hidden"), 'late chip shown')
    pg.screenshot(path=os.path.join(OUT, 'late.png'))
    # kill anything near so camp is allowed
    ev("__game.entities.forEach(e => { if (e instanceof __game.dev.Mob && e.T.hostile) e.remove = true; })")
    pg.wait_for_timeout(300)
    day0 = ev("__game.meta.day || 0")
    ev("__game.locals[0].player.health = 3")
    r = ev("(() => { const lp = __game.locals[0]; return window.__dnd && window.__dnd.dndDoRest ? window.__dnd.dndDoRest(lp, 'camp') : 'n/a'; })()")
    check(r is True, f'make camp accepted ({r})')
    pg.wait_for_timeout(4000)
    ph2 = ev("__game.meta.time / 1200")
    check(ph2 < 0.1, f'morning after camp (phase {ph2:.3f})')
    check(ev("__game.meta.day || 0") == day0 + 1, 'a new day')
    hp = ev("[__game.locals[0].player.health, __game.locals[0].player.maxHealth]")
    check(hp[0] == hp[1], f'long rest healed ({hp})')
    check(ev("__game.lateHeld()") is False, 'hold released')
    # the option off: the clock runs past 0.65
    ev("__game.rules().restEndsDay = false; __game.meta.time = 1200 * 0.645")
    pg.wait_for_timeout(6000)
    ph3 = ev("__game.meta.time / 1200")
    check(ph3 > 0.652, f'option off: clock runs on ({ph3:.4f})')
    errs = [l for l in logs if 'pageerror' in l or '[error]' in l]
    check(not errs, f'no errors ({errs[:3]})')
    b.close()
print('FAILS', len(fails))
sys.exit(1 if fails else 0)
