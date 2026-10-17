# CPU profile of chunk meshing alone: meshes every loaded chunk a few times.
# Usage: python3 tools/meshprof.py [seed] [repeats]
import sys, os, json, collections
from playwright.sync_api import sync_playwright
URL = 'file://' + os.path.abspath('dist/emberwild.html')
SEED = sys.argv[1] if len(sys.argv) > 1 else 'hello'; REP = int(sys.argv[2]) if len(sys.argv) > 2 else 3
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': 800, 'height': 500}).new_page()
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 4, scale: 0.5, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(2500)
    pg.evaluate(f"window.__game.createWorld('Prof', {json.dumps(SEED)})")
    for i in range(200):
        if pg.evaluate('window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(4000)
    cdp = pg.context.new_cdp_session(pg)
    cdp.send('Profiler.enable'); cdp.send('Profiler.setSamplingInterval', {'interval': 200}); cdp.send('Profiler.start')
    r = pg.evaluate("""(rep) => { const g = window.__game, w = g.world, D = g.dev; const list = [...w.chunks.values()].filter(c => w.hasAllNeighbours(c));
      const t0 = performance.now(); let n = 0, verts = 0;
      for (let k = 0; k < rep; k++) for (const c of list) { const d = D.meshChunk(c, (x, z) => w.chunkAt(x, z), { fancyLeaves: g.settings.fancyLeaves }); n++; }
      return { chunks: list.length, meshes: n, msPer: (performance.now() - t0) / n }; }""", REP)
    prof = cdp.send('Profiler.stop')['profile']
    print(r)
    nodes = {n['id']: n for n in prof['nodes']}
    counts = collections.Counter(prof['samples'])
    self_t = collections.Counter()
    for nid, c in counts.items():
        cf = nodes[nid]['callFrame']; self_t[(cf['functionName'] or '(anon)') + ':' + str(cf['lineNumber'])] += c
    total = sum(counts.values())
    for k, v in self_t.most_common(int(os.environ.get('TOP', 30))): print(f'{100*v/total:5.1f}%  {k}')
    b.close()
