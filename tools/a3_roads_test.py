# Alpha 3: roads between the campaign's places, town gates (open by day, shut at night, the watch lets you in), signs, map rose.
import sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))
from a3lib import open_game, campaign_world
from playwright.sync_api import sync_playwright

OUT = os.environ.get('OUT', '/tmp/a3roads')
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b, pg, logs = open_game(p)
    pg.set_default_timeout(600000)
    campaign_world(pg, 'Roads', 'eldenwood', timeout=400)
    info = pg.evaluate("""() => {
      const net = __roads.net(); const g = __game;
      const roads = net.segs.filter(s => s.kind === 'road').length, trails = net.segs.filter(s => s.kind === 'trail').length;
      const exits = {}; for (const [k, v] of Object.entries(net.exits)) exits[k] = v.map(e => e.dir + '@' + e.end.map(Math.round).join(','));
      const sb = __roads.plan('stonebridge');
      return { gv: g.world.gen.genVersion, roads, trails, signs: net.signs.length, exits, wall: sb && sb.wall, roadsSB: sb && sb.roads.map(r => [r.d, r.L]), gates: (__roads.gates('stonebridge') || []).map(G => [G.name, G.center.map(Math.round), G.cells.length]),
        signs1: net.signs.slice(0, 8).map(s => [s.at.map(Math.round), s.names, s.dir, s.back || s.town || '']) };
    }""")
    print(json.dumps(info, indent=1))
    # a point on the road between Stonebridge and Oakhaven, far from both
    pt = pg.evaluate("""() => { const net = __roads.net(); const s = net.segs.filter(s => s.kind === 'road' && s.near.includes('oakhaven') && s.near.includes('stonebridge')); const q = s[Math.floor(s.length / 2)]; return q ? [Math.round(q.a[0]), Math.round(q.a[1])] : null; }""")
    print('road point', pt)
    if pt:
        pg.evaluate("([x, z]) => { const P = __game.locals[0].player; P.x = x + 0.5; P.z = z + 0.5; P.y = 120; P.vy = 0; __game.meta.time = 200; }", pt)
        for i in range(60):
            pg.wait_for_timeout(1000)
            ok = pg.evaluate("([x, z]) => __game.world.isLoaded(x, z) && __game.world.isLoaded(x + 20, z + 20)", pt)
            if ok: break
        pg.wait_for_timeout(3000)
        col = pg.evaluate("""([x, z]) => { const w = __game.world, out = []; for (let dx = -4; dx <= 4; dx++) { let y = 127; while (y > 1 && (!w.getBlock(x + dx, y, z) || !T_SOLID_OK(w.getBlock(x + dx, y, z)))) y--; out.push([dx, y, BLOCKS_KEY(w.getBlock(x + dx, y, z))]); } return out;
          function T_SOLID_OK(id) { return __game.dev.BLOCKS[id] && __game.dev.BLOCKS[id].solid !== false && __game.dev.BLOCKS[id].render !== 3; } function BLOCKS_KEY(id) { return __game.dev.BLOCKS[id].key; } }""", pt)
        print('road cross-section', col)
        P = pg.evaluate("([x, z]) => { const P = __game.locals[0].player; let y = 127; const w = __game.world; while (y > 1 && !w.getBlock(x, y, z)) y--; P.y = y + 1.1; P.pitch = -0.35; P.yaw = 0; return y; }", pt)
        pg.wait_for_timeout(2500)
        pg.screenshot(path=f'{OUT}/road.png')
    # Stonebridge's gates
    g0 = pg.evaluate("() => { const G = __roads.gates('stonebridge'); return G.map(g => ({ name: g.name, c: g.center, inX: g.inX, inZ: g.inZ, cells: g.cells.slice(0, 3) })); }")
    print('gates', json.dumps(g0))
    if g0:
        G = g0[1] if len(g0) > 1 else g0[0]
        pg.evaluate("(G) => { const P = __game.locals[0].player; P.x = G.c[0] - G.inX * 9; P.z = G.c[2] - G.inZ * 9; P.y = G.c[1] + 1; P.yaw = Math.atan2(-G.inX, -G.inZ); P.pitch = -0.05; __game.meta.time = 300; }", G)
        for i in range(60):
            pg.wait_for_timeout(1000)
            if pg.evaluate("(G) => __game.world.isLoaded(Math.floor(G.c[0]), Math.floor(G.c[2]))", G): break
        pg.wait_for_timeout(3000)
        pg.evaluate("(G) => { const P = __game.locals[0].player, w = __game.world; let y = 127; const x = Math.floor(P.x), z = Math.floor(P.z); while (y > 1 && !w.getBlock(x, y, z)) y--; P.y = y + 1.05; }", G)
        st = pg.evaluate("(G) => { __roads.tick(1); const w = __game.world; return G.cells.map(([x, y, z]) => [__game.dev.BLOCKS[w.getBlock(x, y, z)].key, w.getMeta(x, y, z)]); }", G)
        print('gate cells by day', st)
        pg.wait_for_timeout(2000)
        pg.screenshot(path=f'{OUT}/gate_day.png')
        # dusk
        pg.evaluate("() => { __game.meta.time = 0.54 * 1200; }")
        pg.wait_for_timeout(1500); pg.evaluate("() => __roads.tick(1)")
        st = pg.evaluate("(G) => { const w = __game.world; return G.cells.map(([x, y, z]) => [__game.dev.BLOCKS[w.getBlock(x, y, z)].key, w.getMeta(x, y, z)]); }", G)
        print('gate cells at dusk', st)
        pg.wait_for_timeout(1500)
        pg.screenshot(path=f'{OUT}/gate_dusk.png')
        # walk up to it: the watch (if there) lets you in
        guards = pg.evaluate("() => __game.entities.filter(e => e.npc && e.T && e.T.guard).map(e => [e.npc.n, Math.round(e.x), Math.round(e.z)])")
        print('guards', guards)
        pg.evaluate("(G) => { const P = __game.locals[0].player; P.x = G.c[0] - G.inX * 3; P.z = G.c[2] - G.inZ * 3; }", G)
        pg.wait_for_timeout(1200); pg.evaluate("() => { __roads.tick(1); }")
        st = pg.evaluate("(G) => { const w = __game.world; return G.cells.map(([x, y, z]) => w.getMeta(x, y, z) & 4); }", G)
        print('gate open for party?', st)
        signs = pg.evaluate("""(G) => { const w = __game.world, out = []; const [cx, cy, cz] = G.c; for (let dz = -8; dz <= 8; dz++) for (let dx = -8; dx <= 8; dx++) for (let y = Math.floor(cy) - 3; y < cy + 9; y++) { const x = Math.floor(cx) + dx, z = Math.floor(cz) + dz, id = w.getBlock(x, y, z); if (__game.dev.BLOCKS[id].sign) { const e = w.getEntity(x, y, z); out.push([x, y, z, w.getMeta(x, y, z), e && e.lines]); } } return out; }""", G)
        print('signs near gate', json.dumps(signs))
    # the map with its rose
    pg.evaluate("() => { const lp = __game.locals[0]; lp.player.inv.main.slots[0] = __game.dev.mkStack('map', 1); lp.player.inv.sel = 0; }")
    print('\n'.join(logs[-20:]))
    b.close()
