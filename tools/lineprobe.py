import sys, os
from playwright.sync_api import sync_playwright
URL = 'file://' + os.path.abspath('dist/emberwild.html')
SP = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': 1100, 'height': 640}).new_page()
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.6, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(3000)
    pg.evaluate("window.__game.createWorld('Probe', 'showcase-1')")
    for i in range(200):
        if pg.evaluate('window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(1000)
    print(pg.evaluate("""(() => { const g = window.__game, w = g.world, B = g.dev.B, p = g.player;
      g.meta.time = 300; const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y);
      for (let x = X - 10; x < X + 10; x++) for (let z = Z - 14; z < Z + 4; z++) { for (let y = Y - 1; y < Y + 24; y++) w.setBlock(x, y, z, y === Y - 1 ? B.grass : 0, 0, { quiet: true }); }
      for (let x = X - 3; x < X + 3; x++) for (let y = Y; y < Y + 3; y++) w.setBlock(x, y, Z - 8, B.plaster, 0, { quiet: true });
      p.x = X + 0.5; p.z = Z + 0.5; p.y = Y + 1.2; p.yaw = 0; p.pitch = -0.2; p.flying = true;
      window.__probe = { X, Y, Z };
      return [X, Y, Z]; })()"""))
    pg.wait_for_timeout(3000)
    pg.screenshot(path=f'{SP}/probe/a_normal.png')
    # hide water/translucent meshes
    pg.evaluate("(() => { const r = window.__game.renderer; r._wsave = []; for (const [ch, m] of r.chunkMeshes) { r._wsave.push([m, m.water]); m.water = null; } })()")
    pg.wait_for_timeout(400)
    pg.screenshot(path=f'{SP}/probe/b_nowater.png')
    print(pg.evaluate("(() => { const g = window.__game; return { parts: (g.particles||[]).length, ents: g.world.entities ? g.world.entities.length : null, stats: g.renderer.stats }; })()"))
    b.close()
