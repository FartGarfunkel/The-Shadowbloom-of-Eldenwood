# Draws chosen atlas tiles side by side, zoomed, with their names, to look at textures closely.
# Usage: python3 tools/tilesheet.py OUT.png name1,name2,... [zoom] [columns]
#        (a name ending in * takes every tile whose name starts with it)
import sys, os, base64
from playwright.sync_api import sync_playwright
out, names = sys.argv[1], sys.argv[2].split(',')
zoom = int(sys.argv[3]) if len(sys.argv) > 3 else 4
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 8
URL = 'file://' + os.path.abspath('dist/emberwild.html')
JS = """([names, zoom, cols]) => {
  const all = Object.keys(window.ATLAS_DEBUG.tile);
  const list = [];
  for (const n of names) { if (n.endsWith('*')) { for (const k of all) if (k.startsWith(n.slice(0, -1))) list.push(k); } else if (window.ATLAS_DEBUG.tile[n] !== undefined) list.push(n); }
  const T = window.ATLAS_DEBUG.TILE, S = T * zoom, pad = 18;
  const rows = Math.ceil(list.length / cols);
  const c = document.createElement('canvas'); c.width = cols * (S + 8); c.height = rows * (S + pad + 8);
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, c.width, c.height);
  list.forEach((n, i) => {
    const t = window.ATLAS_DEBUG.tile[n], x = (i % cols) * (S + 8) + 4, y = Math.floor(i / cols) * (S + pad + 8) + 4;
    g.fillStyle = '#ff00ff'; g.fillRect(x, y, S, S);
    g.clearRect(x, y, S, S); g.fillStyle = ((i % 2) ? '#555' : '#4a4a4a'); g.fillRect(x, y, S, S);
    g.drawImage(window.ATLAS_DEBUG.canvas, (t % 64) * T, Math.floor(t / 64) * T, T, T, x, y, S, S);
    g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(n + (window.ATLAS_DEBUG.res[t] ? ' ' + window.ATLAS_DEBUG.res[t] : ''), x, y + S + 13);
  });
  return c.toDataURL('image/png');
}"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_context(viewport={'width': 800, 'height': 600}).new_page()
    pg.goto(URL); pg.wait_for_timeout(2500)
    url = pg.evaluate(JS, [names, zoom, cols])
    open(out, 'wb').write(base64.b64decode(url.split(',')[1]))
    b.close()
