# Compare chunk generation of the 0.4 build (artifact HTML) against this build's genVersion-1 generator.
import sys, os, json
from playwright.sync_api import sync_playwright
OLD = sys.argv[1]; NEW = 'file://' + os.path.abspath('dist/emberwild.html'); SEED = sys.argv[2] if len(sys.argv) > 2 else 'compare-1'
SIG = """(([cx0, cz0, R]) => { const g = window.__game, D = g.dev, w = g.world; const out = {};
  for (let cz = cz0 - R; cz <= cz0 + R; cz++) for (let cx = cx0 - R; cx <= cx0 + R; cx++) {
    const ch = w.chunkAt(cx, cz); if (!ch) { out[cx + ',' + cz] = null; continue; }
    let h = 2166136261; const pal = new Map();
    for (let i = 0; i < ch.blocks.length; i++) { const k = D.BLOCKS[ch.blocks[i]].key; let v = pal.get(k); if (v === undefined) { v = 0; for (const c of k) v = (v * 31 + c.charCodeAt(0)) | 0; pal.set(k, v); } h = Math.imul(h ^ v, 16777619) ^ ch.meta[i]; }
    out[cx + ',' + cz] = h >>> 0; }
  return out; })"""
def run(url, seed, patch=None):
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
        pg = b.new_context(viewport={'width': 800, 'height': 500}).new_page()
        pg.goto(url); pg.wait_for_timeout(500)
        pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.5, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(2500)
        if patch: pg.evaluate(patch)
        pg.evaluate(f"window.__game.createWorld('Cmp', {json.dumps(seed)})")
        for i in range(200):
            if pg.evaluate('window.__game.state') == 'playing': break
            pg.wait_for_timeout(500)
        c = pg.evaluate("[Math.floor(window.__game.player.x) >> 4, Math.floor(window.__game.player.z) >> 4, window.__game.meta.genVersion]")
        sig = pg.evaluate(SIG, [c[0], c[1], 2])
        b.close()
        return c, sig
oc, osig = run('file://' + os.path.abspath(OLD), SEED)
# new build: force genVersion 1 for the created world
nc, nsig = run(NEW, SEED, "(() => { const g = window.__game; const orig = g.createWorld.bind(g); g.save._origSave = g.save.saveWorld.bind(g.save); g.save.saveWorld = (rec, ch) => { if (rec.meta) rec.meta.genVersion = 1; return g.save._origSave(rec, ch); }; })()")
print('old', oc, 'new', nc)
same = [k for k in osig if osig[k] is not None and osig[k] == nsig.get(k)]
diff = [k for k in osig if osig[k] is not None and nsig.get(k) is not None and osig[k] != nsig[k]]
print('same', len(same), 'diff', len(diff), diff[:10])
