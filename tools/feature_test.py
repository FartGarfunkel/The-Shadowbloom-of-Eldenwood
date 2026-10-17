import sys, time, json, os

def skin_file(folder, h):
    # a plain test skin (64x64 modern or 64x32 legacy), made on the spot
    import struct, zlib, os
    path = os.path.join(folder, 'test_skin_%d.png' % h)
    if not os.path.exists(path):
        raw = b''.join(b'\x00' + bytes([(x * 4) % 256, (y * 4) % 256, 160, 255]) * 1 for y in range(h) for x in range(64) for _ in [0]) if False else b''.join(b'\x00' + b''.join(bytes([(x * 4) % 256, (y * 4) % 256, 160, 255]) for x in range(64)) for y in range(h))
        def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
        png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 64, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
        open(path, 'wb').write(png)
    return path
from playwright.sync_api import sync_playwright
SP = sys.argv[1]
URL = 'file://' + os.path.abspath('dist/emberwild.html')
logs = []
def wait_state(pg, s, t=120):
    for i in range(t * 2):
        if pg.evaluate('window.__game && window.__game.state') == s: return True
        pg.wait_for_timeout(500)
    return False
def shot(pg, path):
    try: pg.screenshot(path=path, timeout=60000)
    except Exception as e: print('SCREENSHOT FAILED', path, str(e)[:200])
def ev(pg, js):
    try: return pg.evaluate(js)
    except Exception as e: print('EVAL ERROR', str(e)[:500]); return None
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={'width': 1100, 'height': 640})
    pg = ctx.new_page()
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error',) else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
    pg.goto(URL); pg.wait_for_timeout(800)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.5, farTerrain: 0}))")
    pg.reload(); pg.wait_for_timeout(2500)
    ev(pg, "window.__game.createWorld('Features', 'forest walk')")
    print('playing', wait_state(pg, 'playing'))
    pg.wait_for_timeout(1500)
    # --- find a tree and fell it
    r = ev(pg, '''() => { const g = window.__game, w = g.world, p = g.player, D = g.dev;
      for (let r = 2; r < 40; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = Math.floor(p.x) + dx, z = Math.floor(p.z) + dz;
        for (let y = 100; y > 40; y--) { const id = w.getBlock(x, y, z); if (id && D.BLOCKS[id].isLog && !D.BLOCKS[w.getBlock(x, y - 1, z)].isLog && w.getBlock(x, y-1, z)) {
          p.x = x + 2.5; p.z = z + 0.5; p.y = D.findSafeY(w, x + 2, z) + 0.01;
          const tree = g.local.scanTree(x, y, z);
          if (!tree) continue;
          g.local.breakBlock(x, y, z);
          return { at: [x, y, z], logs: tree.logs.length, leaves: tree.leaves.length };
        } }
      }
      return null; }''')
    print('felled', json.dumps(r))
    pg.wait_for_timeout(6000)
    r2 = ev(pg, '''() => { const g = window.__game, w = g.world;
      const items = g.entities.filter(e => e instanceof g.dev.DroppedItem);
      const buried = items.filter(e => { const id = w.getBlock(Math.floor(e.x), Math.floor(e.y + 0.05), Math.floor(e.z)); return g.dev.BLOCKS[id].solid; });
      return { items: items.length, buried: buried.length, falling: g.entities.filter(e => e.constructor.name === 'FallingTree').length, sample: items.slice(0, 3).map(e => [e.stack.id, e.x.toFixed(1), e.y.toFixed(2), e.z.toFixed(1)]) }; }''')
    print('tree drops', json.dumps(r2))
    shot(pg, f'{SP}/f1_tree.png')
    # --- ground storage + backpack
    r3 = ev(pg, '''() => { const g = window.__game, lp = g.local, p = lp.player, w = g.world, D = g.dev;
      p.inv.main.slots[0] = D.mkStack('iron_ingot', 5); p.inv.selected = 0; p.pitch = -1.0; lp.updateTarget();
      const t = lp.target; if (!t) return 'no target';
      lp.putDown(t, p.inv.held);
      const pile = w.getBlock(t.x, t.y + 1, t.z) === D.B.item_pile;
      p.inv.back.slots[0] = D.mkStack('leather_backpack', 1);
      const bp = p.inv.backpackSlots();
      p.inv.add(D.mkStack('dirt', 64 * 36));
      return { pile, bpSlots: bp && bp.length, bpUsed: bp && bp.filter(Boolean).length }; }''')
    print('ground storage + backpack', json.dumps(r3))
    pg.wait_for_timeout(600)
    shot(pg, f'{SP}/f2_pile.png')
    ev(pg, "(() => { const lp = window.__game.local; lp.openInventory('inventory'); })()")
    pg.wait_for_timeout(500)
    shot(pg, f'{SP}/f3_inv_backpack.png')
    ev(pg, "window.__game.local.closeInventory()")
    # --- pocket dimension
    ev(pg, "(() => { const g = window.__game, p = g.player; p.inv.main.slots.fill(null); p.inv.main.slots[0] = g.dev.mkStack('pocket_key', 1); p.inv.selected = 0; g.travelPocket(g.local); })()")
    pg.wait_for_timeout(1500)
    print('pocket', wait_state(pg, 'playing', 60), ev(pg, "[window.__game.dim, window.__game.player.x.toFixed(1), window.__game.player.y.toFixed(1)]"))
    pg.wait_for_timeout(1500)
    shot(pg, f'{SP}/f4_pocket.png')
    ev(pg, "window.__game.travelPocket(window.__game.local)")
    pg.wait_for_timeout(1500)
    print('back', wait_state(pg, 'playing', 60), ev(pg, "window.__game.dim"))
    # --- wildlife census after a while
    pg.wait_for_timeout(5000)
    print('wildlife', ev(pg, "JSON.stringify({ mobs: window.__game.entities.filter(e => e.T).map(e => e.type), critters: window.__game.fauna.list.map(c => c.kind) })"))
    # --- players & skins screen, settings
    ev(pg, "window.__game.pause()"); pg.wait_for_timeout(300)
    ev(pg, "document.querySelector('#btn-players-p').click()"); pg.wait_for_timeout(500)
    shot(pg, f'{SP}/f5_players.png')
    pg.set_input_files('#profiles .profile:nth-child(2) input[type=file]', skin_file(SP, 64)); pg.wait_for_timeout(1200)
    pg.set_input_files('#profiles .profile:nth-child(1) input[type=file]', skin_file(SP, 32)); pg.wait_for_timeout(1200)
    print('skins', ev(pg, "window.__game.profiles.map(p => !!p.skin)"), ev(pg, "[...document.querySelectorAll('.pf-msg')].map(e => e.textContent)"), ev(pg, "window.__game.local.skin.legacy"))
    shot(pg, f'{SP}/f5b_players_skins.png')
    ev(pg, "window.__game.ui.back()"); ev(pg, "document.querySelector('#btn-settings-p').click()"); pg.wait_for_timeout(400)
    shot(pg, f'{SP}/f6_settings.png')
    ev(pg, "window.__game.ui.back()"); ev(pg, "window.__game.resume()")
    print('\n'.join(l for l in logs if 'TUNNEL' not in l)[:4000])
    b.close()
