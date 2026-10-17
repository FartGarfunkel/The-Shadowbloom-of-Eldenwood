# Usage: python3 tools/profile.py OUTDIR [seconds] [walk|stand]
# Opens a new world, lets it load, then walks (sprinting, turning) or stands for a while with the JS profiler on.
# Prints where the JS time goes (self and inclusive, by function), frames drawn, and GL counts per frame.
# Env: RD (render distance, default 5), W/H (viewport), MODE (survival/creative), SCALE (render scale)
import sys, os, json
from collections import defaultdict
from playwright.sync_api import sync_playwright
URL = 'file://' + os.path.abspath('dist/emberwild.html')
OUT = sys.argv[1]
SECS = float(sys.argv[2]) if len(sys.argv) > 2 else 12
SCEN = sys.argv[3] if len(sys.argv) > 3 else 'walk'
RD = int(os.environ.get('RD', 5))
os.makedirs(OUT, exist_ok=True)
SETUP = r"""(() => { const g = window.__game, lp = g.local; g.meta.time = 300; const ri = lp.readInput.bind(lp);
  if (WALK) { lp.readInput = function () { const i = ri(); i.mz = -1; i.sprint = true; return i; }; g._turn = setInterval(() => { lp.player.yaw += 0.02; }, 50); }
  const gl = g.renderer.gl, st = g._gls = { calls: {}, tris: 0, bytes: 0, by: {} };
  for (const k of ['drawElements', 'drawArrays', 'bufferData', 'bufferSubData', 'texSubImage2D', 'texImage2D', 'useProgram', 'bindVertexArray', 'uniformMatrix4fv']) {
    const f = gl[k]; gl[k] = function (...a) { st.calls[k] = (st.calls[k] || 0) + 1; if (k === 'drawElements') st.tris += a[1] / 3; if (k === 'drawArrays') st.tris += a[2] / 3;
      if ((k === 'bufferData' || k === 'bufferSubData') && a[1] && a[1].byteLength) { st.bytes += a[1].byteLength; const w = (new Error().stack.split('\n')[2] || '').trim().split(' ')[1]; st.by[w] = (st.by[w] || 0) + a[1].byteLength; }
      return f.apply(gl, a); };
  }
  const bf = g.frame.bind(g); g._ft = [];
  g.frame = function (dt) { const t = performance.now(); const r = bf(dt); g._ft.push(performance.now() - t); return r; };
  g._frames = 0; const fr = () => { g._frames++; g._raf = requestAnimationFrame(fr); }; fr(); g._t0 = performance.now(); })()"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={'width': int(os.environ.get('W', 960)), 'height': int(os.environ.get('H', 540))})
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: %d, scale: %s}))" % (RD, os.environ.get('SCALE', '0.6')))
    pg.reload(); pg.wait_for_timeout(2500)
    pg.evaluate("window.__game.createWorld('Prof', 'probe-1', %s)" % json.dumps(os.environ.get('MODE', 'creative')))
    for i in range(240):
        if pg.evaluate('window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    # until the world around is fully loaded and meshed (then the profile shows play, not loading)
    for i in range(int(os.environ.get('SETTLE', 600))):
        if pg.evaluate('(() => { const w = window.__game.world; return w.meshSet.size === 0 && (!w.genList || !w.genList.length); })()'): break
        pg.wait_for_timeout(1000)
    pg.wait_for_timeout(3000)
    pg.evaluate(SETUP.replace('WALK', 'true' if SCEN == 'walk' else 'false'))
    cdp = ctx.new_cdp_session(pg)
    ALLOC = os.environ.get('ALLOC')
    if ALLOC: cdp.send('HeapProfiler.enable'); cdp.send('HeapProfiler.startSampling', {'samplingInterval': 8192, 'includeObjectsCollectedByMajorGC': True, 'includeObjectsCollectedByMinorGC': True})
    cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 200}); cdp.send('Profiler.start')
    pg.wait_for_timeout(int(SECS * 1000))
    prof = cdp.send('Profiler.stop')['profile']
    if ALLOC:
        hp = cdp.send('HeapProfiler.stopSampling')['profile']
        agg = defaultdict(float)
        def walk(n):
            cf = n['callFrame']; agg[(cf['functionName'] or '(anon)') + ':' + str(cf['lineNumber'] + 1)] += n['selfSize']
            for c in n.get('children', []): walk(c)
        walk(hp['head'])
        tot = sum(agg.values()) or 1
        print('--- allocation (sampled, live at end + recent) ---')
        for k, v in sorted(agg.items(), key=lambda kv: -kv[1])[:25]: print('%6.1f%%  %8.0f KB  %s' % (100 * v / tot, v / 1024, k))
    stats = pg.evaluate("""(() => { const g = window.__game; cancelAnimationFrame(g._raf); clearInterval(g._turn);
      const dt = (performance.now() - g._t0) / 1000, n = g._ft.length || 1, st = g._gls;
      const by = Object.entries(st.by).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ' ' + Math.round(v / n / 1024) + 'KB');
      return { frames: n, fps: +(g._frames / dt).toFixed(2), frameMs: +(g._ft.reduce((s, v) => s + v, 0) / n).toFixed(1), tris: Math.round(st.tris / n),
        calls: Object.fromEntries(Object.entries(st.calls).map(([k, v]) => [k, Math.round(v / n)])), bufKB: Math.round(st.bytes / n / 1024), bufBy: by,
        chunks: g.world.chunks.size, entities: g.entities.length, particles: g.particles.list.length, pos: [g.player.x | 0, g.player.y | 0, g.player.z | 0] }; })()""")
    b.close()
nodes = {n['id']: n for n in prof['nodes']}
parent = {}
for n in prof['nodes']:
    for c in n.get('children', []): parent[c] = n['id']
dts = prof.get('timeDeltas', [])
key = lambda cf: (cf['functionName'] or '(anon)') + ':' + str(cf['lineNumber'] + 1)
self_t, incl = defaultdict(float), defaultdict(float)
total = 0
for sid, dt in zip(prof['samples'], dts):
    k = key(nodes[sid]['callFrame']); self_t[k] += dt; total += dt
    seen, nid = set(), sid
    while nid is not None:
        kk = key(nodes[nid]['callFrame'])
        if kk not in seen: incl[kk] += dt; seen.add(kk)
        nid = parent.get(nid)
skip = lambda k: k.startswith('(program)') or k.startswith('(idle)') or k.startswith('(root)')
js = sum(v for k, v in self_t.items() if not skip(k))
print('stats', json.dumps(stats))
print('errors', errs[:5])
print('JS %.0f ms of %.0f ms sampled; per frame %.1f ms' % (js / 1000, total / 1000, js / 1000 / max(1, stats['frames'])))
print('--- self ---')
for k, v in sorted(self_t.items(), key=lambda kv: -kv[1])[:30]:
    if not skip(k): print('%6.1f%%  %8.1f ms  %s' % (100 * v / max(1, js), v / 1000, k))
print('--- inclusive ---')
for k, v in sorted(incl.items(), key=lambda kv: -kv[1])[:40]:
    if not skip(k): print('%6.1f%%  %8.1f ms  %s' % (100 * v / max(1, js), v / 1000, k))
json.dump(prof, open(os.path.join(OUT, 'profile.cpuprofile'), 'w'))
