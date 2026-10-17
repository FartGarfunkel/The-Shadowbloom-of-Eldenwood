import sys, os, json
from playwright.sync_api import sync_playwright
URL = 'file://' + os.path.abspath('dist/emberwild.html')
SP = sys.argv[1]
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': 1100, 'height': 640}).new_page()
    pg.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: logs.append(m.type + ' ' + m.text) if m.type == 'error' and 'TUNNEL' not in m.text else None)
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.6, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(3000)
    pg.evaluate("window.__game.createWorld('Showcase', 'showcase-1')")
    for i in range(200):
        if pg.evaluate('window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(1000)
    r = pg.evaluate("""(() => { const g = window.__game, w = g.world, D = g.dev, B = D.B, p = g.player;
      g.meta.mode = 'creative'; g.meta.time = 300;
      const X = Math.floor(p.x) + 3, Z = Math.floor(p.z) - 4, Y = Math.floor(p.y);
      // flatten a 16x12 pad
      for (let x = X - 8; x < X + 22; x++) for (let z = Z - 14; z < Z + 16; z++) { for (let y = Y - 1; y < Y + 24; y++) w.setBlock(x, y, z, y === Y - 1 ? B.grass : 0, 0, { quiet: true }); for (let y = Y - 4; y < Y - 1; y++) w.setBlock(x, y, z, B.dirt, 0, { quiet: true }); }
      const S = (dx, dy, dz, k, m = 0) => w.setBlock(X + dx, Y + dy, Z + dz, B[k], m, { quiet: true });
      // stairs: a straight run, an outer corner and an inner corner
      S(0, 0, 0, 'oak_stairs', 0); S(1, 0, 0, 'oak_stairs', 0); S(2, 0, 0, 'oak_stairs', 0); S(3, 0, 0, 'oak_stairs', 3); S(3, 0, 1, 'oak_stairs', 3);
      S(0, 0, -3, 'stone_brick_stairs', 2); S(1, 0, -3, 'stone_brick_stairs', 2); S(2, 0, -3, 'stone_brick_stairs', 1); S(2, 0, -4, 'stone_brick_stairs', 1);
      S(0, 1, -5, 'cobblestone_stairs', 4); S(1, 1, -5, 'cobblestone_stairs', 4);
      // slabs: bottom, top, vertical, double; a lantern sitting on a bottom slab
      S(5, 0, 0, 'stone_slab', 0); S(6, 1, 0, 'stone_slab', 1); S(7, 0, 0, 'stone_slab', 2); S(8, 0, 0, 'stone_slab', 5); S(9, 0, 0, 'stone_slab', 6);
      S(5, 1, 0, 'lantern', 0); S(5, 0, -1, 'oak_slab', 0); S(5, 1, -1, 'torch', 0);
      // fences, gate, walls, panes, iron bars
      for (let i = 0; i < 4; i++) S(i, 0, 3, 'oak_fence'); S(4, 0, 3, 'oak_fence_gate', 1); S(5, 0, 3, 'oak_fence'); S(5, 0, 4, 'oak_fence');
      for (let i = 7; i < 11; i++) S(i, 0, 3, 'cobblestone_wall'); S(10, 0, 4, 'cobblestone_wall'); S(10, 1, 3, 'cobblestone_wall');
      for (let i = 12; i < 15; i++) S(i, 0, 3, 'glass_pane'), S(i, 1, 3, 'blue_stained_glass_pane'); S(12, 0, 2, 'iron_bars'); S(12, 1, 2, 'iron_bars');
      // a little house wall with a door, trapdoor, ladder, wall torches
      for (let i = 0; i < 5; i++) for (let h = 0; h < 4; h++) S(i, h, -7, h === 3 ? 'stone_bricks' : i === 0 || i === 4 ? 'log' : 'plaster', i === 0 || i === 4 ? 0 : 0);
      S(2, 0, -7, 'oak_door', 0); S(2, 1, -7, 'oak_door', 16);
      S(1, 1, -6, 'torch', 3); S(3, 1, -6, 'torch', 3); S(4, 0, -6, 'ladder', 0); S(4, 1, -6, 'ladder', 0);
      S(6, 0, -7, 'spruce_door', 4 | 8); S(6, 1, -7, 'spruce_door', 4 | 8 | 16);
      S(8, 0, -6, 'oak_trapdoor', 0); S(9, 0, -6, 'iron_trapdoor', 4);
      // bed, campfire, chain + hanging lantern, cauldron, bell, flower pot, carpets
      S(11, 0, -2, 'bed', 0); S(11, 0, -3, 'bed', 4); S(13, 0, -2, 'blue_bed', 1); S(14, 0, -2, 'blue_bed', 1 | 4);
      S(13, 0, 0, 'campfire'); S(7, 3, -4, 'stone'); S(7, 2, -4, 'chain'); S(7, 1, -4, 'lantern', 1);
      S(9, 0, -3, 'cauldron', 3); S(10, 0, -4, 'bell'); S(11, 0, 1, 'flower_pot'); w.setEntity(X + 11, Y, Z + 1, { type: 'pot', plant: 'flower_red' });
      for (let i = 0; i < 3; i++) S(14 - i, 0, -5, ['red_carpet', 'yellow_carpet', 'light_blue_carpet'][i]);
      // waterlogged stairs and a slab in a little pool
      for (let x = 13; x < 16; x++) for (let z = 4; z < 6; z++) { S(x, -1, z, 'water'); }
      S(13, -1, 4, 'oak_stairs', 1 | 0x80); S(14, -1, 5, 'stone_slab', 0 | 0x80);
      // stone and colour samples
      const samples = ['granite', 'diorite', 'andesite', 'slate_bricks', 'marble_bricks', 'limestone_bricks', 'red_wool', 'lime_concrete', 'cyan_terracotta', 'orange_glazed_terracotta', 'timber_frame_cross', 'thatch', 'roof_tiles', 'copper_block', 'amethyst_block', 'bookshelf'];
      samples.forEach((k, i) => S(-2 + (i % 8) * 1, i < 8 ? 0 : 1, -9 + 1, k));
      // a sign with text
      S(12, 0, -7, 'oak_sign', 4); w.setEntity(X + 12, Y, Z - 7, { type: 'sign', lines: ['Welcome to', 'Emberwild', 'v0.5', ''] });
      for (const c of w.chunks.values()) { c.needsMesh = true; w.meshSet.add(c); }
      p.x = X + 6.5; p.z = Z + 9.5; p.y = Y + 4; p.yaw = 0; p.pitch = -0.38; p.flying = true; p.vx = p.vy = p.vz = 0;
      return [X, Y, Z]; })()""")
    print('placed at', r)
    X, Y, Z = r
    VIEWS = [
      ('c1_stairs', 1.5, 2.6, 4.5, 0.27, -0.55, 300),
      ('c2_slabs', 7.0, 2.2, 3.8, 0.03, -0.45, 300),
      ('c3_fences', 7.5, 2.4, 9.0, 0.03, -0.3, 300),
      ('c4_house', 3.0, 1.9, -1.0, 0.03, -0.12, 300),
      ('c5_beds', 12.5, 3.2, 3.5, 0.03, -0.62, 300),
      ('c6_pool', 14.5, 1.6, 8.5, 0.03, -0.45, 300),
      ('c7_sign', 12.5, 1.6, -4.2, 0.03, -0.15, 300),
      ('c8_house_night', 3.0, 1.9, -1.0, 0.03, -0.12, 900),
    ]
    only = os.environ.get('VIEWS')
    for name, dx, dy, dz, yaw, pitch, t in VIEWS:
        if only is not None and name not in only.split(','): continue
        pg.evaluate(f"(() => {{ const g = window.__game, p = g.player; g.meta.time = {t}; p.x = {X}+{dx}; p.y = {Y}+{dy}; p.z = {Z}+{dz}; p.yaw = {yaw}; p.pitch = {pitch}; p.flying = true; p.vx = p.vy = p.vz = 0; }})()")
        pg.wait_for_timeout(2500)
        pg.screenshot(path=f'{SP}/{name}.png')
    if os.environ.get('LINEPROBE'):
        pg.evaluate(f"(() => {{ const g = window.__game, p = g.player; g.meta.time = 300; p.x = {X}+12.5; p.y = {Y}+3.2; p.z = {Z}+3.5; p.yaw = 0; p.pitch = -0.62; }})()")
        pg.wait_for_timeout(1500)
        pg.evaluate("(() => { const r = window.__game.renderer; for (const [ch, m] of r.chunkMeshes) m.water = null; })()")
        pg.wait_for_timeout(300); pg.screenshot(path=f'{SP}/probe/c5_nowater.png')
        for mode in []:
            pg.evaluate("(mode) => { const r = window.__game.renderer; if (!r._orig) r._orig = r.render; r.render = function (S, rect) { if (mode === 'nodraws') S.drawList = []; if (mode === 'noparts') S.particles = []; if (mode === 'notarget') S.target = null; if (mode === 'nohand') S.hand = null; return r._orig.call(this, S, rect); }; }", mode)
            pg.wait_for_timeout(400); pg.screenshot(path=f'{SP}/probe/c5_{mode}.png'); print(mode, flush=True)
        pg.evaluate(f"(() => {{ const g = window.__game, w = g.world, B = g.dev.B; for (let x = {X}-1; x < {X}+8; x++) for (let y = {Y}; y < {Y}+4; y++) w.setBlock(x, y, {Z}-8, B.red_wool, 0); g.meta.time = 300; const p = g.player; p.x = {X}+3; p.y = {Y}+1.9; p.z = {Z}-1; p.yaw = 0.03; p.pitch = -0.12; }})()")
        pg.wait_for_timeout(2500); pg.screenshot(path=f'{SP}/probe/redback.png')
        for i, (ddy, dyaw) in enumerate([]):
            pg.evaluate(f"(() => {{ const g = window.__game, p = g.player; p.x = {X}+12.5; p.y = {Y}+3.2+{ddy}; p.z = {Z}+3.5; p.yaw = {dyaw}; p.pitch = -0.62; }})()")
            pg.wait_for_timeout(500); pg.screenshot(path=f'{SP}/probe/nudge{i}.png')
    if os.environ.get('NOHAND'):
        print('\n'.join(logs[:20])); b.close(); sys.exit(0)
    # hand items
    pg.evaluate("""(() => { const g = window.__game, D = g.dev, lp = g.local; const inv = lp.player.inv.main;
      const keys = ['oak_door', 'oak_fence', 'glass_pane', 'oak_stairs', 'stone_slab', 'lantern', 'torch', 'cobblestone_wall', 'red_bed'];
      keys.forEach((k, i) => { inv.slots[i] = D.mkStack(k, 1); }); lp.player.inv.selected = 0; })()""")
    for i, k in enumerate(['door', 'fence', 'pane']):
        pg.evaluate(f"(() => {{ const g = window.__game; g.local.player.inv.selected = {i}; g.meta.time = 300; }})()")
        pg.wait_for_timeout(1200)
        pg.screenshot(path=f'{SP}/h_{k}.png')
    pg.evaluate("window.__game.local.openInventory('inventory')"); pg.wait_for_timeout(1200)
    pg.screenshot(path=f'{SP}/s4_creative_inv.png')
    print('\n'.join(logs[:20]))
    b.close()
