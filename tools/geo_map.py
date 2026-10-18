# The campaign's land from above: a map of the terrain the world generator makes (water, forests, mountains, marsh, the
# rivers and ravines), with the towns, the places of the story and the roads drawn on it. One picture per geography
# edition, so a redrawn land can be checked against the old one and against the notes.
# Usage: python3 tools/geo_map.py OUTDIR [step=6] [editions=1,2] [x0,z0,x1,z1]
import sys, os, json, base64, time
from playwright.sync_api import sync_playwright
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'
STEP = int(sys.argv[2]) if len(sys.argv) > 2 else 6
EDS = [int(e) for e in (sys.argv[3] if len(sys.argv) > 3 else '1,2').split(',')]
BOX = [int(v) for v in sys.argv[4].split(',')] if len(sys.argv) > 4 else [-1250, -900, 1250, 1150]
URL = 'file://' + os.path.abspath('dist/shadowbloom.html')
os.makedirs(OUT, exist_ok=True)
JS = r"""
async ([ed, step, box, bare]) => {
  const g = __game, D = g.dev, meta = g.meta;
  const keep = meta.camp.geo;
  meta.camp.geo = ed;
  const gen = D.makeWorldGen(meta.seed, 0, meta.genVersion || 6);
  const C = __dnd.camp.def();
  const [x0, z0, x1, z1] = box, W = Math.ceil((x1 - x0) / step), H = Math.ceil((z1 - z0) / step);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H), px = img.data;
  const SEA = 48;
  const BC = { 0: [40, 80, 160], 1: [220, 210, 150], 2: [120, 170, 80], 3: [40, 110, 50], 4: [225, 200, 120], 5: [60, 120, 100], 6: [130, 130, 125] };
  let sea = null;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = x0 + i * step, z = z0 + j * step, c = gen.column(x, z);
      if (sea === null) sea = c.sea || null;
      let col;
      const S = 48;
      if (c.ravine) col = [60, 40, 30];
      else if (c.h < S) { const d = Math.min(1, (S - c.h) / 20); col = [30 + 30 * (1 - d), 70 + 60 * (1 - d), 150 + 60 * (1 - d)]; }
      else {
        col = (BC[c.biome] || [150, 150, 150]).slice();
        const k = Math.max(-0.35, Math.min(0.55, (c.h - S - 6) / 50));
        col = col.map(v => Math.max(0, Math.min(255, v * (1 + k))));
        if (c.h > S + 45) col = [235, 235, 240];
      }
      const o = (j * W + i) * 4; px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
    }
    if (j % 40 === 0) await new Promise(r => setTimeout(r, 0));
  }
  ctx.putImageData(img, 0, 0);
  if (bare) { meta.camp.geo = keep; return cv.toDataURL('image/png'); }
  // the roads
  try {
    const net = __roads.net();
    ctx.strokeStyle = 'rgba(120,80,40,0.9)'; ctx.lineWidth = 1;
    for (const s of (net && net.segs) || []) { ctx.beginPath(); ctx.moveTo((s.a[0] - x0) / step, (s.a[1] - z0) / step); ctx.lineTo((s.b[0] - x0) / step, (s.b[1] - z0) / step); ctx.stroke(); }
  } catch (e) { /* no roads */ }
  // the places and the towns
  ctx.font = '10px sans-serif'; ctx.textBaseline = 'middle';
  for (const [id, P] of Object.entries(C.places)) {
    const X = (P.at[0] - x0) / step, Y = (P.at[1] - z0) / step;
    ctx.fillStyle = P.kind === 'dungeon' ? '#c03030' : '#f0e040'; ctx.fillRect(X - 1.5, Y - 1.5, 3, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillText(id.replace(/_/g, ' '), X + 3, Y + 1);
    ctx.fillStyle = '#fff'; ctx.fillText(id.replace(/_/g, ' '), X + 2, Y);
  }
  ctx.font = 'bold 13px sans-serif';
  for (const [id, T] of Object.entries(C.towns)) {
    const X = (T.at[0] - x0) / step, Y = (T.at[1] - z0) / step;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(X - 4, Y - 4, 8, 8); ctx.fillRect(X - 4, Y - 4, 8, 8);
    ctx.lineWidth = 3; ctx.strokeText(T.name, X + 7, Y); ctx.fillText(T.name, X + 7, Y);
  }
  // a scale bar: 300 blocks (a day on foot)
  ctx.fillStyle = '#000'; ctx.fillRect(10, H - 14, 300 / step, 4); ctx.font = '11px sans-serif'; ctx.fillText('300 blocks', 12, H - 22);
  meta.camp.geo = keep;
  return cv.toDataURL('image/png');
}
"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': 900, 'height': 600}).new_page()
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate("localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 2, scale: 0.5, farTerrain: 0}))"); pg.reload(); pg.wait_for_timeout(3500)
    pg.evaluate("window.__game.createWorld('Geo', 'eldenwood', 'creative')")
    for i in range(240):
        if pg.evaluate('window.__game.state') == 'playing': break
        pg.wait_for_timeout(500)
    pg.wait_for_timeout(1500)
    info = pg.evaluate("() => ({ geo: __game.meta.camp && __game.meta.camp.geo, campaign: __game.meta.campaign, gv: __game.meta.genVersion, walls: Object.fromEntries(['stonebridge', 'oakhaven', 'stillwater', 'thornmere'].map(t => { const P = __roads.plan(t); return [t, P ? { x: P.x, z: P.z, wall: P.wall || null, r: P.r } : null]; })) })")
    print(json.dumps(info), flush=True)
    for ed in EDS:
        t = time.time()
        url = pg.evaluate(JS, [ed, STEP, BOX, bool(os.environ.get('BARE'))])
        open(f'{OUT}/geo_ed{ed}.png', 'wb').write(base64.b64decode(url.split(',', 1)[1]))
        print(f'edition {ed}: {OUT}/geo_ed{ed}.png ({time.time() - t:.0f} s)', flush=True)
    b.close()
