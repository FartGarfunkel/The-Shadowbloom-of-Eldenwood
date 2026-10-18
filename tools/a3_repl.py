# A long-lived test session: makes a campaign world once, then runs JS from /tmp/a3repl/cmd.js (result to out.txt).
# "SHOT name" as the whole command saves /tmp/a3repl/name.png. "QUIT" ends it.
import sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))
from a3lib import open_game, campaign_world
from playwright.sync_api import sync_playwright
D = '/tmp/a3repl'; os.makedirs(D, exist_ok=True)
for f in ('cmd.js', 'out.txt'):
    try: os.remove(f'{D}/{f}')
    except FileNotFoundError: pass
with sync_playwright() as p:
    b, pg, logs = open_game(p)
    pg.set_default_timeout(900000)
    if os.environ.get('WORLD_ID'):
        pg.evaluate("(id) => __game.openWorld(id)", os.environ['WORLD_ID'])
        for i in range(1800):
            if pg.evaluate("window.__game && __game.state") in ('playing', 'paused'): break
            pg.wait_for_timeout(500)
        pg.wait_for_timeout(3000)
        pg.evaluate("(id) => localStorage.setItem('a3_world', id)", os.environ['WORLD_ID'])
    else: campaign_world(pg, os.environ.get('WNAME', 'Repl'), os.environ.get('SEED', 'eldenwood'), timeout=900)
    # helpers: tp(x, z) puts you on the ground there safely (waits for the chunk); no fall damage while testing
    HELPERS = """() => { window.tp = async (x, z, yaw) => { const P = __game.locals[0].player, w = __game.world; P.x = x + 0.5; P.z = z + 0.5; P.y = 125; P.vy = 0;
        for (let i = 0; i < 240 && !w.isLoaded(Math.floor(x), Math.floor(z)); i++) { P.y = 125; P.vy = 0; P.fallStart = null; await new Promise(r => setTimeout(r, 250)); }
        let y = 126; while (y > 1 && (!w.getBlock(Math.floor(x), y, Math.floor(z)) || !__game.dev.BLOCKS[w.getBlock(Math.floor(x), y, Math.floor(z))].solid)) y--; P.y = y + 1.02; P.vy = 0; P.fallStart = null; if (yaw != null) P.yaw = yaw; return y; };
      const lp = __game.locals[0]; lp.player.hp = lp.player.maxHp || 20; setInterval(() => { if (__game.state === 'paused' && __game.resume) __game.resume(); const P = __game.locals[0].player; P.fallStart = null; if (P.hp < 6) P.hp = 20; }, 200); }"""
    pg.evaluate(HELPERS)
    open(f'{D}/ready', 'w').write('1')
    while True:
        if os.path.exists(f'{D}/cmd.js'):
            src = open(f'{D}/cmd.js').read(); os.remove(f'{D}/cmd.js')
            if src.strip() == 'QUIT': break
            try:
                if src.strip() == 'RELOAD':
                    wid = pg.evaluate("localStorage.getItem('a3_world')"); pg.reload(); pg.wait_for_timeout(5000)
                    pg.evaluate("(id) => __game.openWorld(id)", wid)
                    for i in range(1800):
                        if pg.evaluate("window.__game && __game.state") in ('playing', 'paused'): break
                        pg.wait_for_timeout(500)
                    pg.wait_for_timeout(3000); pg.evaluate(HELPERS); res = 'reloaded'
                elif src.startswith('SHOT '): pg.screenshot(path=f'{D}/{src.split()[1]}.png'); res = 'ok'
                else: res = json.dumps(pg.evaluate(src), default=str)[:20000]
            except Exception as e: res = 'ERR ' + str(e)[:3000]
            res += '\n--logs--\n' + '\n'.join(logs[-12:]); logs.clear()
            open(f'{D}/out.tmp', 'w').write(res); os.rename(f'{D}/out.tmp', f'{D}/out.txt')
        time.sleep(0.3)
    b.close()
