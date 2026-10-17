# Usage: python3 tools/jsprobe.py OUTDIR script.js [seed]
# script.js holds steps separated by lines like "//@ wait 1500" or "//@ shot name".
# Each step is a JS arrow-function body run with (g, D, B, w, p, lp) bound; its return value is printed.
import sys, os, json, re
from playwright.sync_api import sync_playwright
URL = 'file://' + os.path.abspath('dist/emberwild.html')
SP, SCRIPT = sys.argv[1], sys.argv[2]
SEED = sys.argv[3] if len(sys.argv) > 3 else 'probe-1'
MODE = os.environ.get('MODE', 'survival')
logs = []
src = open(SCRIPT).read()
parts = re.split(r'^//@ (.*)$', src, flags=re.M)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': int(os.environ.get('W', 1100)), 'height': int(os.environ.get('H', 640))}).new_page()
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: logs.append(m.type + ' ' + m.text) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: %s, scale: 0.6, farTerrain: %s}))" % (os.environ.get('RD', '3'), os.environ.get('FAR', '0'))); pg.reload(); pg.wait_for_timeout(2500)
    PACK = os.environ.get('PACK')
    if PACK:
        # a resource pack: installed the way the Options screen does it, then the game restarts with it
        data = open(PACK, 'rb').read()
        pg.route('https://pack.local/pack.zip', lambda route: route.fulfill(status=200, body=data, headers={'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/zip'}))
        pg.evaluate("(async () => { const b = await (await fetch('https://pack.local/pack.zip')).arrayBuffer(); await window.__game.dev.installResourcePack(new File([b], 'GeruDoku.zip')); })()")
        pg.reload(); pg.wait_for_timeout(6000)
        print('pack', json.dumps(pg.evaluate("window.PACKS_DEBUG && window.PACKS_DEBUG() && (({name, used, items, armor, error}) => ({name, used, items, armor, error}))(window.PACKS_DEBUG())")), flush=True)
    pg.evaluate(f"window.__game.createWorld('Probe', {json.dumps(SEED)}, {json.dumps(MODE)})")
    for i in range(200):
        if pg.evaluate('window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(1000)
    def run(code):
        code = code.strip()
        if not code: return
        js = "(() => { const g = window.__game, D = g.dev, B = D.B, w = g.world, lp = g.local, p = g.player; " + code + " })()"
        try: r = pg.evaluate(js)
        except Exception as e: r = 'ERROR ' + str(e)[:400]
        if r is not None: print(json.dumps(r) if not isinstance(r, str) else r, flush=True)
    run(parts[0])
    for i in range(1, len(parts), 2):
        cmd = parts[i].split()
        if cmd[0] == 'wait': pg.wait_for_timeout(int(cmd[1]))
        elif cmd[0] == 'shot': pg.screenshot(path=f'{SP}/{cmd[1]}.png', timeout=120000)
        elif cmd[0] == 'key': pg.keyboard.press(cmd[1])
        elif cmd[0] == 'allocprof':
            # //@ allocprof <ms> [top]: which functions allocate the most memory while the game runs (sampled)
            cdp = pg.context.new_cdp_session(pg); cdp.send('HeapProfiler.enable'); cdp.send('HeapProfiler.startSampling', {'samplingInterval': 4096, 'includeObjectsCollectedByMajorGC': True, 'includeObjectsCollectedByMinorGC': True})
            pg.wait_for_timeout(int(cmd[1]))
            prof = cdp.send('HeapProfiler.stopSampling')['profile']; acc = {}
            def walk(n, stack):
                cf = n['callFrame']; k = (cf['functionName'] or '(anon)') + ' :' + str(cf['lineNumber'] + 1)
                if n.get('selfSize'): acc[k] = acc.get(k, 0) + n['selfSize']
                for c in n.get('children', []): walk(c, stack)
            walk(prof['head'], [])
            tot = sum(acc.values()) or 1
            print('allocprof total %.1f MB in %d ms' % (tot / 1e6, int(cmd[1])), flush=True)
            for k, v in sorted(acc.items(), key=lambda kv: -kv[1])[:int(cmd[2]) if len(cmd) > 2 else 30]: print('  %6.1f%%  %8.2f MB  %s' % (100 * v / tot, v / 1e6, k), flush=True)
        elif cmd[0] == 'cpuprof':
            # //@ cpuprof <ms> [top]: sample the page's JavaScript for a while, print where the time went (self time, by function)
            cdp = pg.context.new_cdp_session(pg); cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 500}); cdp.send('Profiler.start')
            pg.wait_for_timeout(int(cmd[1]))
            prof = cdp.send('Profiler.stop')['profile']; nodes = {n['id']: n for n in prof['nodes']}
            dts = prof.get('timeDeltas', []); samples = prof.get('samples', []); self_t = {}
            for sid, dt in zip(samples, dts[1:] + [0]):
                cf = nodes[sid]['callFrame']; k = (cf['functionName'] or '(anon)') + ' :' + str(cf['lineNumber'] + 1)
                self_t[k] = self_t.get(k, 0) + dt
            tot = sum(self_t.values()) or 1
            top = sorted(self_t.items(), key=lambda kv: -kv[1])[:int(cmd[2]) if len(cmd) > 2 else 30]
            print('cpuprof total %.0f ms' % (tot / 1000), flush=True)
            for k, v in top: print('  %6.1f%%  %8.1f ms  %s' % (100 * v / tot, v / 1000, k), flush=True)
        elif cmd[0] == 'until':
            # //@ until <ms> <condition>: wait until the condition holds (or the time runs out)
            cond = parts[i].split(None, 2)[2]
            for _ in range(int(cmd[1]) // 500):
                try:
                    if pg.evaluate("(() => { const g = window.__game, D = g.dev, lp = g.local, p = g.player; return !!(" + cond + "); })()"): break
                except Exception: pass
                pg.wait_for_timeout(500)
        run(parts[i + 1])
    for l in logs[:30]: print(l)
    b.close()
