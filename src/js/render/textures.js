// ---------------------------------------------------------------------------
// render/textures.js — every texture in the game is painted here at startup,
// pixel by pixel, from code. No image files.
//
// Produces:
//   ATLAS.canvas   2048x2048 (64x64 tiles of 32px) used by WebGL. Tiles are painted at 16 or 32
//                  pixels; 16-pixel paintings are doubled up so both sit side by side
//   ATLAS.tile[name] -> tile index
//   ATLAS.pixels   ImageData for CPU-side lookups (item extrusion, particles)
//   ICONS          UI sprite sheet (32px icons, one per item)
// ---------------------------------------------------------------------------

const TILE = 32, ATLAS_TILES = 64, ATLAS_SIZE = TILE * ATLAS_TILES;
const ATLAS = { canvas: null, ctx: null, tile: {}, count: 0, pixels: null, res: [] };

function hexRGB(h) { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function shade(c, f) { return [clamp(Math.round(c[0] * f), 0, 255), clamp(Math.round(c[1] * f), 0, 255), clamp(Math.round(c[2] * f), 0, 255)]; }
function mix(a, b, t) { return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))]; }

// A 16x16 RGBA paint buffer with helpers.
// A square RGBA paint buffer with helpers: 16 pixels across (the classic size) or 32 (Faithful).
class Px {
  constructor(seed, w = 16) { this.w = w; this.d = new Uint8ClampedArray(w * w * 4); this.rand = mulberry32(seed); }
  set(x, y, c, a = 255) {
    const W = this.w;
    if (x < 0 || y < 0 || x >= W || y >= W) return;
    const i = (y * W + x) * 4; this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = a;
  }
  get(x, y) { const i = (y * this.w + x) * 4; return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]]; }
  alpha(x, y) { return this.d[(y * this.w + x) * 4 + 3]; }
  fill(c, a = 255) { const W = this.w; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) this.set(x, y, c, a); }
  noise(c, v, a = 255) { const W = this.w; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) this.set(x, y, shade(c, 1 + (this.rand() - 0.5) * v), a); }
  speck(c, chance, v = 0.15) { const W = this.w; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (this.rand() < chance) this.set(x, y, shade(c, 1 + (this.rand() - 0.5) * v)); }
  blob(cx, cy, r, c, v = 0.2) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + this.rand() * r) this.set(cx + x, cy + y, shade(c, 1 + (this.rand() - 0.5) * v));
  }
  // Char-art: rows of 16 chars; palette maps char -> [r,g,b] (or null)
  art(rows, pal, oy = 0) {
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = pal[row[x]]; if (c) this.set(x, y + oy, c); } });
  }
  // copy another painting in, resized (nearest pixel) if it was painted at another size
  copyFrom(other) {
    if (other.w === this.w) { this.d.set(other.d); return; }
    const W = this.w, k = other.w / W;
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const o = (Math.floor(y * k) * other.w + Math.floor(x * k)) * 4, i = (y * W + x) * 4; for (let c = 0; c < 4; c++) this.d[i + c] = other.d[o + c]; }
  }
}
// A painting's pixels at full atlas size (16-pixel paintings doubled up).
function toTileSize(d, w) {
  if (w === TILE) return d;
  const out = new Uint8ClampedArray(TILE * TILE * 4), k = TILE / w;
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const o = (Math.floor(y / k) * w + Math.floor(x / k)) * 4, i = (y * TILE + x) * 4; out[i] = d[o]; out[i + 1] = d[o + 1]; out[i + 2] = d[o + 2]; out[i + 3] = d[o + 3]; }
  return out;
}

// Paints a tile and registers it under a name (painting the same name again replaces it).
// res: 16 for the classic size, 32 for Faithful detail.
function addTile(name, painter, seedExtra = 0, tintKind, res = 16) {
  if (tintKind) (ATLAS.tinted || (ATLAS.tinted = [])).push([ATLAS.count, tintKind]);
  const idx = ATLAS.count++;
  const px = new Px(seedFromString(name) + seedExtra, res);
  painter(px);
  ATLAS.res[idx] = res;
  const img = new ImageData(toTileSize(px.d, res), TILE, TILE);
  ATLAS.ctx.putImageData(img, (idx % ATLAS_TILES) * TILE, Math.floor(idx / ATLAS_TILES) * TILE);
  ATLAS.tile[name] = idx;
  ATLAS._px[name] = px;
  return idx;
}

// ---- palettes ---------------------------------------------------------------
const C = {
  stone: hexRGB('#8a8a8c'), dirt: hexRGB('#86603d'), grass: hexRGB('#6aa33e'), grassDark: hexRGB('#4f8a2e'),
  sand: hexRGB('#dccf98'), wood: hexRGB('#a8834f'), woodDark: hexRGB('#7b5c33'), bark: hexRGB('#6b5032'),
  leaves: hexRGB('#4b8f2b'), water: hexRGB('#3f6fd8'), lava: hexRGB('#e8641c'), snow: hexRGB('#f2f6fa'),
  birch: hexRGB('#d9d6cc'), spruceBark: hexRGB('#4e3a24'), spruceLeaves: hexRGB('#30603a'), birchLeaves: hexRGB('#6a9e45'),
  cobble: hexRGB('#7c7c7e'), iron: hexRGB('#d8af93'), gold: hexRGB('#f6d541'), diamond: hexRGB('#5ee6e0'), coal: hexRGB('#2b2b2b'),
};

function paintPlanks(p, base) {
  p.noise(base, 0.12);
  for (let y = 0; y < 16; y++) {
    if (y % 4 === 3) for (let x = 0; x < 16; x++) p.set(x, y, shade(base, 0.68));
    const off = (Math.floor(y / 4) % 2) * 8 + 3;
    if (y % 4 !== 3) p.set((off) % 16, y, shade(base, 0.75));
  }
  for (let i = 0; i < 10; i++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); if (y % 4 !== 3) p.set(x, y, shade(base, 0.85)); }
}
function paintCobble(p, base) {
  p.fill(shade(base, 0.55));
  const stones = [[3, 3, 3], [10, 2, 3], [6, 8, 3], [13, 9, 3], [2, 12, 3], [9, 13, 3], [14, 15, 2], [0, 7, 2]];
  for (const [x, y, r] of stones) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        const lit = (dx + dy < -1) ? 1.18 : (dx + dy > 1) ? 0.88 : 1;
        p.set((x + dx + 16) % 16, (y + dy + 16) % 16, shade(base, lit * (0.92 + p.rand() * 0.16)));
      }
    }
  }
}
function paintOre(p, oreColor, oreDark) {
  p.noise(C.stone, 0.16);
  const spots = 4 + Math.floor(p.rand() * 2);
  for (let i = 0; i < spots; i++) {
    const cx = 2 + Math.floor(p.rand() * 12), cy = 2 + Math.floor(p.rand() * 12);
    const n = 2 + Math.floor(p.rand() * 3);
    for (let j = 0; j < n; j++) {
      const x = cx + Math.floor(p.rand() * 3) - 1, y = cy + Math.floor(p.rand() * 3) - 1;
      p.set(x, y, oreColor); p.set(x + 1, y, shade(oreColor, 0.85)); p.set(x, y + 1, oreDark);
    }
  }
}
function paintLogSide(p, bark, dark) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const stripe = (x * 7 + Math.floor(y / 5) * 3) % 5 === 0 ? 0.72 : 1;
    p.set(x, y, shade(bark, stripe * (0.9 + p.rand() * 0.18)));
  }
  for (let i = 0; i < 6; i++) { const x = Math.floor(p.rand() * 16); const y = Math.floor(p.rand() * 14); p.set(x, y, dark); p.set(x, y + 1, dark); }
}
function paintLogTop(p, inner, bark) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.5) p.set(x, y, shade(bark, 0.9 + p.rand() * 0.15));
    else { const ring = Math.floor(d) % 2 === 0 ? 1 : 0.85; p.set(x, y, shade(inner, ring * (0.94 + p.rand() * 0.1))); }
  }
}
function paintLeaves(p, base, holes = 0.18) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (p.rand() < holes) continue;
    p.set(x, y, shade(base, 0.7 + p.rand() * 0.5));
  }
}
function paintCross(p, rows, pal) { p.art(rows, pal); }

// ---- item art ---------------------------------------------------------------
const ART = {
  pickaxe: [
    '................',
    '...hHHHHh.......',
    '..hHHHHHHHh.....',
    '...hh...hHHh....',
    '........sShHh...',
    '.......sSs.hHh..',
    '......sSs...hHh.',
    '.....sSs.....hH.',
    '....sSs......hH.',
    '...sSs........h.',
    '..sSs...........',
    '.sSs............',
    '.Ss.............',
    '................', '................', '................'],
  // the head sits on the left of the handle with its blade facing out, as in the classic game
  axe: [
    '................',
    '.....hhh........',
    '....hHHHh.......',
    '...hHHHHHh......',
    '..hHHHHsSsh.....',
    '..hHHHsSsh......',
    '..hHHsSs........',
    '...hsSs.........',
    '...sSs..........',
    '..sSs...........',
    '.sSs............',
    '.Ss.............',
    '................', '................', '................', '................'],
  shovel: [
    '................',
    '...........hHh..',
    '..........hHHHh.',
    '.........hHHHHh.',
    '..........HHHh..',
    '.........sSh....',
    '........sSs.....',
    '.......sSs......',
    '......sSs.......',
    '.....sSs........',
    '....sSs.........',
    '...sSs..........',
    '..sSs...........',
    '..Ss............',
    '................', '................'],
  sword: [
    '..............hH',
    '.............hHh',
    '............hHh.',
    '...........hHh..',
    '..........hHh...',
    '.........hHh....',
    '........hHh.....',
    '.......hHh......',
    '..g...hHh.......',
    '...g.hHh........',
    '....gHh.........',
    '....sgg.........',
    '...sSs.g........',
    '..sSs...........',
    '.PS.............',
    '................'],
  helmet: [
    '................', '................', '................', '................',
    '....LAAAAAAa....',
    '...LAAAAAAAAa...',
    '...AAAAAAAAAa...',
    '...AAa....aAa...',
    '...AAa....aAa...',
    '...aa......aa...',
    '................', '................', '................', '................', '................', '................'],
  chestplate: [
    '................', '................',
    '...LAa....LAa...',
    '..LAAAa..LAAAa..',
    '..AAAAAAAAAAAa..',
    '..AAAAAAAAAAAa..',
    '...aAAAAAAAAa...',
    '....AAAAAAAAa...',
    '....AAAAAAAAa...',
    '....AAAAAAAAa...',
    '....AAAAAAAAa...',
    '....aaaaaaaaa...',
    '................', '................', '................', '................'],
  leggings: [
    '................', '................',
    '....LAAAAAAa....',
    '....AAAAAAAa....',
    '....AAAaAAAa....',
    '....AAa.LAAa....',
    '....AAa.LAAa....',
    '....AAa.LAAa....',
    '....AAa.LAAa....',
    '....AAa.LAAa....',
    '....AAa.LAAa....',
    '....aaa.aaaa....',
    '................', '................', '................', '................'],
  boots: [
    '................', '................', '................', '................', '................', '................',
    '...LAa....LAa...',
    '...AAa....AAa...',
    '...AAa....AAa...',
    '..LAAa...LAAa...',
    '.LAAAa..LAAAa...',
    '.aaaaa..aaaaa...',
    '................', '................', '................', '................'],
  stick: [
    '................', '................', '................',
    '...........sS...', '..........sS....', '.........sS.....', '........sS......', '.......sS.......',
    '......sS........', '.....sS.........', '....sS..........', '...sS...........',
    '................', '................', '................', '................'],
  ingot: [
    '................', '................', '................', '................', '................',
    '.....LLLLLLL....',
    '....LAAAAAAAa...',
    '...LAAAAAAAAAa..',
    '..LAAAAAAAAAAAa.',
    '..aaaaaaaaaaaaa.',
    '................', '................', '................', '................', '................', '................'],
  lump: [
    '................', '................', '................', '................',
    '......aAAa......',
    '....aALAAAa.....',
    '...aALLAAAAa....',
    '...aAAAAaAAAa...',
    '..aAAAAAAAAAa...',
    '..aAAaAAAAAAa...',
    '...aAAAAAALa....',
    '....aaAAAAa.....',
    '......aaa.......',
    '................', '................', '................'],
  gem: [
    '................', '................', '................',
    '.....LLLLLL.....',
    '....LAAAAAAa....',
    '...LALLAAAAAa...',
    '..LAAAAAAAAAAa..',
    '...aAAAAAAAAa...',
    '....aAAAAAAa....',
    '.....aAAAAa.....',
    '......aAAa......',
    '.......aa.......',
    '................', '................', '................', '................'],
  apple: [
    '................', '................',
    '........s.......', '.......sG.......', '.....LAsAAa.....', '....LAAAAAAa....', '...LALAAAAAAa...',
    '...AAAAAAAAAa...', '...AAAAAAAAAa...', '...AAAAAAAAAa...', '...aAAAAAAAaa...', '....aAAAAAAa....',
    '.....aaaaaa.....', '................', '................', '................'],
  berries: [
    '................', '................', '................', '.......G........', '......GGs.......',
    '.....LA.sLA.....', '....LAAasAAa....', '....AAaLAaAa....', '.....aLAAa......', '....LAAAAa.LA...',
    '....AAAaa.LAAa..', '.....aa....aa...', '................', '................', '................', '................'],
  meat: [
    '................', '................', '................',
    '........aAAAa...', '......aAAALLAa..', '....aAAAAAAAAa..', '...aAAALAAAAAa..', '..aAAAAAAAAAa...',
    '..aAAAAAAAAa....', '..WWaAAAAaa.....', '.WW..aaaa.......', '.W..............',
    '................', '................', '................', '................'],
  bread: [
    '................', '................', '................', '................', '................',
    '.....aLLLLLa....', '...aLAAAAAAAa...', '..aALALALAAAAa..', '..aAAAAAAAAAAa..', '..aAAAAAAAAAAa..',
    '...aaaaaaaaaa...', '................', '................', '................', '................', '................'],
  bucket: [
    '................', '................', '................',
    '...aaaaaaaaaa...', '..a.LLLLLLLL.a..', '..aLWWWWWWWWLa..', '...aAAAAAAAAa...', '...aAAAAAAAAa...',
    '...aAAAAAAAAa...', '....aAAAAAAa....', '....aAAAAAAa....', '.....aaaaaa.....',
    '................', '................', '................', '................'],
  leather: [
    '................', '................', '................',
    '...aA......Aa...', '...AAAAAAAAAA...', '....AAALAAAAa...', '....AAAAAAAAa...', '....AAAAAAAAa...',
    '....AAAAALAAa...', '...AAAAAAAAAA...', '...aA......Aa...',
    '................', '................', '................', '................', '................'],
  backpack: [
    '................', '................',
    '......aaaa......', '.....a....a.....', '...aAAAAAAAAa...', '..aALLLLLLLLAa..', '..aAAAAAAAAAAa..', '..aAAaGGGGaAAa..',
    '..aAAaGWWGaAAa..', '..aAAaGGGGaAAa..', '..aAAAAAAAAAAa..', '..aAAAAAAAAAAa..', '...aaaaaaaaaa...',
    '................', '................', '................'],
  effigy: [
    '................',
    '......aGGa......', '.....aGWWGa.....', '.....aGGGGa.....', '......aAAa......',
    '....aaAAAAaa....', '...aAALAAAAAa...', '....aaAAAAaa....', '......aAAa......', '......aAAa......',
    '.....aAAAAa.....', '....aAAAAAAa....', '....aaaaaaaa....',
    '................', '................', '................'],
  orb: [
    '................', '................', '................', '......aaaa......', '....aaAAAAaa....',
    '...aAALLAAAAa...', '...aALWWLAAAa...', '..aAALWLAAAAAa..', '..aAAAAAAAGAAa..', '..aAAAAAAGAAAa..',
    '...aAAAGGAAAa...', '...aAAAAAAAAa...', '....aaAAAAaa....', '......aaaa......', '................', '................'],
  shard: [
    '................', '................', '..........LA....', '.........LAa....', '........LAAa....',
    '.......LAAa.....', '......LAAAa.....', '.....LALAa......', '....LAAAa.......', '....AAAa........',
    '...aAAa.........', '...aAa..........', '...aa...........', '................', '................', '................'],
  dagger: [
    '................', '................', '................', '................',
    '...........LA...', '..........LAa...', '.........LAa....', '........LAa.....',
    '..g....LAa......', '...g..LAa.......', '....gLAa........', '....sgg.........',
    '...sSs.g........', '..sSs...........', '.PS.............', '................'],
  clay: [
    '................', '................', '................', '................', '................',
    '......aAAa......', '.....aALAAa.....', '....aALAAAAa....', '....aAAAAAAa....', '.....aAAAAa.....',
    '......aaaa......', '................', '................', '................', '................', '................'],
  brick: [
    '................', '................', '................', '................', '................', '................',
    '...LLLLLLLLLL...', '..LAAAAAAAAAAa..', '..AAAAAAAAAAAa..', '..aaaaaaaaaaaa..',
    '................', '................', '................', '................', '................', '................'],
};

const TOOL_TIER_COLORS = {
  wood: [hexRGB('#b08a56'), hexRGB('#7a5a33')], stone: [hexRGB('#9a9a9a'), hexRGB('#5e5e5e')],
  iron: [hexRGB('#e6e6e6'), hexRGB('#9a9a9a')], gold: [hexRGB('#fbe25b'), hexRGB('#c19a1c')],
  diamond: [hexRGB('#7af3ec'), hexRGB('#2aa59f')], cinderite: [hexRGB('#ff8a3d'), hexRGB('#a8300e')],
};
const ARMOR_COLORS = {
  leather: [hexRGB('#a06a3c'), hexRGB('#6e4524'), hexRGB('#c48a58')], iron: [hexRGB('#d6d6d6'), hexRGB('#8f8f8f'), hexRGB('#ffffff')],
  gold: [hexRGB('#f5d64a'), hexRGB('#b98f15'), hexRGB('#fff2a0')], diamond: [hexRGB('#5ee6e0'), hexRGB('#21928c'), hexRGB('#c8fffb')],
  cinderite: [hexRGB('#e8641c'), hexRGB('#7a2410'), hexRGB('#ffcf5a')],
};
const STICK_PAL = { s: hexRGB('#6b4a26'), S: hexRGB('#a37a45'), P: hexRGB('#5a3d1f') };

function buildAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = ATLAS_SIZE;
  ATLAS.canvas = canvas;
  ATLAS.ctx = canvas.getContext('2d', { willReadFrequently: true });
  ATLAS._px = {};

  // --- terrain: every block, painted in the Doku style (render/doku.js) ---
  paintDokuBlocks();
  paintDokuBlocks2();
  paintDokuBlocks3();
  paintDokuBlocks4();
  paintMobTiles();
  paintMonsterTiles();
  paintWeatherTiles();
  paintCapeTiles();

  // --- mining cracks (10 stages) ---
  const crackLines = [];
  { const r = mulberry32(99); for (let i = 0; i < 40; i++) { let x = 7 + Math.floor(r() * 3) - 1, y = 7 + Math.floor(r() * 3) - 1; const dx = r() < 0.5 ? -1 : 1, dy = r() < 0.5 ? -1 : 1; const seg = []; for (let k = 0; k < 3 + i / 6; k++) { seg.push([x, y]); if (r() < 0.6) x += dx; else y += dy; } crackLines.push(seg); } }
  for (let s = 0; s < 10; s++) {
    addTile('crack_' + s, p => {
      const n = Math.floor((s + 1) * 4);
      for (let i = 0; i < n; i++) for (const [x, y] of crackLines[i]) p.set(x, y, [20, 20, 20], 200);
    });
  }

  // --- items ---
  addItem('stick', p => p.art(ART.stick, STICK_PAL));
  for (const [tk, cols] of Object.entries(TOOL_TIER_COLORS)) {
    for (const kind of ['pickaxe', 'axe', 'shovel', 'sword']) {
      addItem(tk + '_' + kind, p => p.art(ART[kind], Object.assign({ H: cols[0], h: cols[1], g: hexRGB('#5a3d1f') }, STICK_PAL)));
    }
  }
  for (const [mk, cols] of Object.entries(ARMOR_COLORS)) {
    for (const piece of ['helmet', 'chestplate', 'leggings', 'boots']) {
      addItem(mk + '_' + piece, p => p.art(ART[piece], { A: cols[0], a: cols[1], L: cols[2] }));
    }
  }
  const lump = (c, d, l) => ({ A: c, a: d, L: l });
  addItem('coal', p => p.art(ART.lump, lump(hexRGB('#2d2d2d'), hexRGB('#141414'), hexRGB('#5a5a5a'))));
  addItem('charcoal', p => p.art(ART.lump, lump(hexRGB('#3a2c22'), hexRGB('#1c140e'), hexRGB('#6a5444'))));
  addItem('iron_ingot', p => p.art(ART.ingot, { A: hexRGB('#d6d6d6'), a: hexRGB('#8a8a8a'), L: hexRGB('#ffffff') }));
  addItem('gold_ingot', p => p.art(ART.ingot, { A: hexRGB('#f5d64a'), a: hexRGB('#b98f15'), L: hexRGB('#fff2a0') }));
  addItem('brick', p => p.art(ART.brick, { A: hexRGB('#a8553e'), a: hexRGB('#6e2f20'), L: hexRGB('#c87a5e') }));
  addItem('diamond', p => p.art(ART.gem, { A: hexRGB('#5ee6e0'), a: hexRGB('#1d9a95'), L: hexRGB('#d2fffc') }));
  addItem('leather', p => p.art(ART.leather, { A: hexRGB('#9a6232'), a: hexRGB('#6a3f1c'), L: hexRGB('#c08850') }));
  addItem('clay_ball', p => p.art(ART.clay, { A: hexRGB('#a4aab6'), a: hexRGB('#727884'), L: hexRGB('#d0d6e0') }));
  addItem('cinder_core', p => p.art(ART.orb, { A: hexRGB('#e8641c'), a: hexRGB('#5a1e0a'), L: hexRGB('#ffb22e'), W: hexRGB('#fff3c0'), G: hexRGB('#3a1206') }));
  addItem('apple', p => p.art(ART.apple, { A: hexRGB('#d42a2a'), a: hexRGB('#8a1414'), L: hexRGB('#ff7a6a'), s: hexRGB('#5a3d1f'), G: hexRGB('#4f9a34') }));
  addItem('golden_apple', p => p.art(ART.apple, { A: hexRGB('#f2cf3a'), a: hexRGB('#b0870e'), L: hexRGB('#fff5b0'), s: hexRGB('#5a3d1f'), G: hexRGB('#4f9a34') }));
  addItem('berries', p => p.art(ART.berries, { A: hexRGB('#c8203a'), a: hexRGB('#7a1022'), L: hexRGB('#ff7a8a'), s: hexRGB('#3f7a2a'), G: hexRGB('#4f9a34') }));
  addItem('raw_meat', p => p.art(ART.meat, { A: hexRGB('#e07a7a'), a: hexRGB('#a84a4a'), L: hexRGB('#f6b0a8'), W: hexRGB('#f2ead8') }));
  addItem('venison', p => p.art(ART.meat, { A: hexRGB('#c0504a'), a: hexRGB('#7e2a26'), L: hexRGB('#e8857a'), W: hexRGB('#f2ead8') }));
  addItem('cooked_venison', p => p.art(ART.meat, { A: hexRGB('#7a4224'), a: hexRGB('#4a2412'), L: hexRGB('#a86a3e'), W: hexRGB('#f2ead8') }));
  addItem('rabbit', p => p.art(ART.lump, { A: hexRGB('#e6a0a0'), a: hexRGB('#b06a6a'), L: hexRGB('#ffd0c8') }));
  addItem('cooked_rabbit', p => p.art(ART.lump, { A: hexRGB('#b07a42'), a: hexRGB('#6e4420'), L: hexRGB('#d8a868') }));
  addItem('cooked_meat', p => p.art(ART.meat, { A: hexRGB('#9a5a2e'), a: hexRGB('#5e3214'), L: hexRGB('#c88850'), W: hexRGB('#f2ead8') }));
  addItem('bread', p => p.art(ART.bread, { A: hexRGB('#c9923f'), a: hexRGB('#7e5420'), L: hexRGB('#e8c070') }));
  const bucketPal = (fill) => ({ a: hexRGB('#5a5a5a'), A: hexRGB('#a8a8a8'), L: hexRGB('#d8d8d8'), W: fill });
  addItem('bucket', p => p.art(ART.bucket, bucketPal(hexRGB('#3a3a3a'))));
  addItem('water_bucket', p => p.art(ART.bucket, bucketPal(hexRGB('#3f6fd8'))));
  addItem('lava_bucket', p => p.art(ART.bucket, bucketPal(hexRGB('#f0841c'))));
  addItem('leather_backpack', p => p.art(ART.backpack, { A: hexRGB('#9a6232'), a: hexRGB('#5a3518'), L: hexRGB('#c08850'), G: hexRGB('#6e4524'), W: hexRGB('#d8c890') }));
  addItem('reinforced_backpack', p => p.art(ART.backpack, { A: hexRGB('#8a5a30'), a: hexRGB('#3a2a1a'), L: hexRGB('#cfcfcf'), G: hexRGB('#9a9a9a'), W: hexRGB('#f2f2f2') }));
  addItem('ember_effigy', p => p.art(ART.effigy, { A: hexRGB('#3a2a24'), a: hexRGB('#140c08'), L: hexRGB('#6a4a3a'), G: hexRGB('#e8641c'), W: hexRGB('#ffd34a') }));
  addItem('ember_blade', p => p.art(ART.sword, Object.assign({ H: hexRGB('#ff8a3d'), h: hexRGB('#b0300e'), g: hexRGB('#3a2a24') }, STICK_PAL, { P: hexRGB('#ffd34a') })));
  addItem('cinderite_shard', p => p.art(ART.shard, { A: hexRGB('#ff8a3d'), a: hexRGB('#a8300e'), L: hexRGB('#ffe08a') }));
  addItem('aether_crystal', p => p.art(ART.gem, { A: hexRGB('#9be0ff'), a: hexRGB('#4a8ad8'), L: hexRGB('#ffffff') }));
  addItem('ember_igniter', p => p.art(ART.effigy, { A: hexRGB('#8a8a8a'), a: hexRGB('#3a3a3a'), L: hexRGB('#d8d8d8'), G: hexRGB('#e8641c'), W: hexRGB('#ffd34a') }));
  addItem('pocket_key', p => p.art([
    '................', '................', '....aAAAa.......', '...aAWWWAa......', '...AW...WA......', '...AW...WA......', '...aAWWWAa......', '....aAAAa.......',
    '......AA........', '......AA........', '......AAAA......', '......AA........', '......AAA.......', '......AA........', '................', '................'],
    { A: hexRGB('#9be0ff'), a: hexRGB('#4a8ad8'), W: hexRGB('#f2d64a') }));
  addItem('frost_shard', p => p.art(ART.shard, { A: hexRGB('#8fe3ff'), a: hexRGB('#2f86b8'), L: hexRGB('#e8fbff') }));
  addItem('frostbite_dagger', p => p.art(ART.dagger, Object.assign({ A: hexRGB('#8fe3ff'), a: hexRGB('#2f86b8'), L: hexRGB('#e8fbff'), g: hexRGB('#d8d8d8') }, STICK_PAL)));

  // new items, and Doku-style replacements
  paintDokuItems();
  paintDokuItems2();
  paintDokuItems3();
  paintDokuItems4();
  paintMobItems();

  // --- entities & sky ---
  addTile('skin', p => { p.noise(hexRGB('#d9a07a'), 0.06); });
  addTile('sleeve', p => { p.noise(hexRGB('#2f7a76'), 0.1); for (let x = 0; x < 16; x++) p.set(x, 15, hexRGB('#1f5452')); });
  addTile('boar_hide', p => { p.noise(hexRGB('#7a5236'), 0.2); p.speck(hexRGB('#4a3020'), 0.15); });
  addTile('boar_face', p => {
    p.noise(hexRGB('#7a5236'), 0.15);
    p.art(['................', '................', '................', '................', '...ww......ww...', '...wk......kw...', '................', '................',
      '.....pppppp.....', '....pPPPPPPp....', '....pPkPPkPp....', '....pPPPPPPp....', '.....pppppp.....', '..t..........t..', '..t..........t..', '................'],
      { w: hexRGB('#f2f2f2'), k: hexRGB('#1a1a1a'), p: hexRGB('#c47c6c'), P: hexRGB('#e8a090'), t: hexRGB('#efe6d0') });
  });
  paintAnimalTextures();
  addTile('ghoul_skin', p => { p.noise(hexRGB('#6f8a6a'), 0.18); p.speck(hexRGB('#4f6a4a'), 0.1); });
  addTile('ghoul_face', p => {
    p.noise(hexRGB('#6f8a6a'), 0.15);
    p.art(['................', '................', '................', '................', '................', '...kkk....kkk...', '...kRk....kRk...', '...kkk....kkk...',
      '................', '.......aa.......', '................', '....kkkkkkkk....', '....k.k.k.kk....', '................', '................', '................'],
      { k: hexRGB('#1a1a1a'), R: hexRGB('#ff4040'), a: hexRGB('#4f6a4a') });
  });
  addTile('ghoul_cloth', p => { p.noise(hexRGB('#3a4a7a'), 0.25); for (let i = 0; i < 10; i++) p.set(Math.floor(p.rand() * 16), 15 - Math.floor(p.rand() * 2), [0, 0, 0], 0); });
  // (alpha 3) the Watcher: an original look. Ash-pale and gaunt, long black hair, a hooded robe of dusk-violet veined
  // with the Bloom's black, a silver clasp; white eyes with no pupils, as ever.
  const HB = { H: hexRGB('#141018'), h: hexRGB('#0a080e'), S: hexRGB('#b8b4bc'), s: hexRGB('#8e8a96'), W: hexRGB('#ffffff'), N: hexRGB('#9a96a2'), M: hexRGB('#4a3a4e'), R: hexRGB('#3a2a4a'), r: hexRGB('#281c36'), V: hexRGB('#0e0a12') };
  const up2 = (rows) => rows.flatMap(r => { const w = r.split('').map(c => c + c).join(''); return [w, w]; });
  addTile('hb_face', p => p.art(up2(['RRRRRRRR', 'RHHHHHHR', 'HHsSSsHH', 'HSWWSWWS', 'HsSNNSsH', 'HSsMMsSH', 'HHSssSHH', 'HHHSSHHH']), HB));
  addTile('hb_head_side', p => p.art(up2(['RRRRRRRR', 'RRRRRRRR', 'RRRHHHHH', 'RRHHHHSS', 'RRHHHSSS', 'RHHHHSSs', 'RHHHHHSs', 'rHHHHHHH']), HB));
  addTile('hb_hair', p => { p.noise(hexRGB('#3a2a4a'), 0.18); for (let y = 10; y < 16; y++) for (let x = 2; x < 14; x++) if (p.rand() < 0.7) p.set(x, y, hexRGB('#141018')); });
  addTile('hb_shirt', p => {
    p.noise(hexRGB('#3a2a4a'), 0.12);
    for (let i = 0; i < 5; i++) { let x = Math.floor(p.rand() * 16), y = 15; for (let k = 0; k < 9; k++) { p.set(x, y, hexRGB('#0e0a12')); x += p.rand() < 0.5 ? 1 : -1; y -= 1; if (x < 0 || x > 15 || y < 0) break; } }
    for (let y = 0; y < 16; y++) { p.set(7, y, hexRGB('#281c36')); p.set(8, y, hexRGB('#281c36')); }
    p.set(7, 2, hexRGB('#d8d8e8')); p.set(8, 2, hexRGB('#d8d8e8')); p.set(7, 3, hexRGB('#a0a0b8')); p.set(8, 3, hexRGB('#a0a0b8'));
  });
  addTile('hb_arm', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y < 12 ? shade(hexRGB('#3a2a4a'), 0.9 + p.rand() * 0.14) : y < 13 ? hexRGB('#281c36') : shade(hexRGB('#b8b4bc'), 0.92 + p.rand() * 0.1)); for (let k = 0; k < 6; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 11), hexRGB('#0e0a12')); });
  addTile('hb_pants', p => { p.noise(hexRGB('#2e2238'), 0.12); for (let x = 0; x < 16; x++) { if (p.rand() < 0.6) p.set(x, 15, [0, 0, 0], 0); p.set(x, 13, hexRGB('#1c1424')); } });
  addTile('golem_rock', p => {
    p.noise(hexRGB('#3a3434'), 0.3);
    for (let i = 0; i < 5; i++) { let x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); for (let k = 0; k < 6; k++) { p.set(x, y, hexRGB(k % 2 ? '#ff8a3d' : '#e8641c')); x += p.rand() < 0.5 ? 1 : -1; y += 1; } }
  });
  addTile('golem_face', p => {
    p.noise(hexRGB('#3a3434'), 0.3);
    p.art(['................', '................', '................', '................', '..kkkkk..kkkkk..', '..kYYYk..kYYYk..', '..kYWYk..kYWYk..', '..kkkkk..kkkkk..',
      '................', '................', '...OOOOOOOOOO...', '...OYYYYYYYYO...', '...OOOOOOOOOO...', '................', '................', '................'],
      { k: hexRGB('#140c08'), Y: hexRGB('#ffb22e'), W: hexRGB('#fff3c0'), O: hexRGB('#e8641c') });
  });
  addTile('golem_core', p => { p.noise(hexRGB('#ff8a3d'), 0.3); p.speck(hexRGB('#fff3c0'), 0.15); });
  addTile('fireball', p => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d < 7.5) p.set(x, y, mix(hexRGB('#fff3c0'), hexRGB('#e8641c'), clamp(d / 7.5 + (p.rand() - 0.5) * 0.3, 0, 1)), d > 6 ? 160 : 255);
    }
  });
  addTile('frost_bolt', p => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d < 7.5) p.set(x, y, mix(hexRGB('#ffffff'), hexRGB('#4fb8e8'), clamp(d / 7.5, 0, 1)), d > 6 ? 150 : 255);
    }
  });
  addTile('sun', p => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      if (d < 4.5) p.set(x, y, hexRGB('#fff8d8')); else if (d < 7.5) p.set(x, y, hexRGB('#ffd86a'), Math.round(200 - (d - 4.5) * 60));
    }
  });
  addTile('moon', p => {
    for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) p.set(x, y, shade(hexRGB('#dfe4ec'), 0.9 + p.rand() * 0.1));
    for (const [x, y] of [[5, 5], [6, 5], [9, 9], [10, 9], [9, 10], [5, 10], [11, 4]]) p.set(x, y, hexRGB('#aeb6c4'));
  });
  addTile('white', p => p.fill([255, 255, 255]));
  addTile('pocket_wall', p => {
    p.noise(hexRGB('#241d33'), 0.12);
    for (let i = 0; i < 16; i++) { p.set(i, 0, hexRGB('#3a2f55')); p.set(0, i, hexRGB('#3a2f55')); p.set(i, 15, hexRGB('#150f22')); p.set(15, i, hexRGB('#150f22')); }
    for (let i = 0; i < 5; i++) p.set(2 + Math.floor(p.rand() * 12), 2 + Math.floor(p.rand() * 12), hexRGB('#8a7ac8'));
  });
  // wildlife
  addTile('deer_hide', p => { p.noise(hexRGB('#a8743e'), 0.14); for (let i = 0; i < 9; i++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 10), hexRGB('#f0e2c8')); for (let x = 0; x < 16; x++) for (let y = 12; y < 16; y++) p.set(x, y, shade(hexRGB('#e8d6b8'), 0.95 + p.rand() * 0.1)); });
  addTile('deer_face', p => {
    p.noise(hexRGB('#a8743e'), 0.12);
    p.art(['................', '................', '................', '................', '..kk........kk..', '..kk........kk..', '................', '................',
      '................', '.....wwwwww.....', '.....wwwwww.....', '.....wwkkww.....', '.....wwwwww.....', '................', '................', '................'],
      { k: hexRGB('#1a1410'), w: hexRGB('#e8d6b8') });
  });
  addTile('antler', p => p.noise(hexRGB('#d8c8a0'), 0.1));
  addTile('rabbit_fur', p => { p.noise(hexRGB('#9a8a78'), 0.16); p.speck(hexRGB('#6e6052'), 0.12); });
  addTile('rabbit_face', p => {
    p.noise(hexRGB('#9a8a78'), 0.12);
    p.art(['................', '................', '................', '................', '................', '...kk......kk...', '...kk......kk...', '................',
      '.......pp.......', '.......pp.......', '......wwww......', '................', '................', '................', '................', '................'],
      { k: hexRGB('#140c08'), p: hexRGB('#e8a0a0'), w: hexRGB('#f2f2f2') });
  });
  for (const [k, c1, c2] of [['bird_blue', '#3a78d8', '#e8eef8'], ['bird_red', '#d02a2a', '#3a1a1a'], ['bird_brown', '#8a6a48', '#e0d0b8']]) {
    addTile(k, p => { p.noise(hexRGB(c1), 0.12); for (let x = 0; x < 16; x++) for (let y = 10; y < 16; y++) p.set(x, y, shade(hexRGB(c2), 0.95 + p.rand() * 0.1)); p.set(3, 4, [10, 10, 10]); p.set(12, 4, [10, 10, 10]); });
  }
  addTile('beak', p => p.fill(hexRGB('#e8a020')));
  for (const [k, c1, c2] of [['butterfly_orange', '#ff8a1c', '#1a1a1a'], ['butterfly_blue', '#3aa0ff', '#0a1a3a'], ['butterfly_yellow', '#f8e04a', '#5a4a10'], ['butterfly_white', '#f4f4f0', '#6a6a6a']]) {
    addTile(k, p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const dx = (x - 7.5) / 8, dy = (y - 7.5) / 8;
        const inWing = dx * dx * 1.1 + dy * dy < 0.9 && !(Math.abs(dy) < 0.12 && Math.abs(dx) > 0.75);
        if (!inWing) continue;
        const edge = dx * dx * 1.1 + dy * dy > 0.6;
        p.set(x, y, edge ? hexRGB(c2) : shade(hexRGB(c1), 0.9 + p.rand() * 0.2));
      }
      for (let y = 4; y < 12; y++) p.set(15, y, hexRGB('#1a1a1a'));
    });
  }
  addTile('firefly', p => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d < 7.5) p.set(x, y, mix(hexRGB('#f6ff9a'), hexRGB('#b8e83a'), d / 7.5), Math.round(255 * Math.max(0, 1 - d / 7.5)));
    }
  });
  addTile('fish_koi', p => { p.noise(hexRGB('#ff7a2a'), 0.12); for (let i = 0; i < 5; i++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 2, hexRGB('#f8f2e8'), 0.05); });
  addTile('fish_silver', p => { p.noise(hexRGB('#a8b8c4'), 0.12); for (let x = 0; x < 16; x++) p.set(x, 7, hexRGB('#6a8aa8')); });
  addTile('flame', p => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const w = (16 - y) / 16 * 6;
      const d = Math.abs(x - 7.5 + Math.sin(y * 0.8) * 1.2);
      if (d < w * (0.6 + p.rand() * 0.5)) p.set(x, y, mix(hexRGB('#ffe08a'), hexRGB('#e8641c'), y / 16 < 0.4 ? 0.8 : 0.2), 230);
    }
  });

  // --- the 32-pixel Gerudoku-style repaint (render/gerudoku.js) replaces the classic paintings ---
  paintGerudoku();

  finishAtlas();
}
// Done painting (or a resource pack changed some tiles): keep a copy of the pixels for lookups and
// a pre-tinted copy for menus and icons.
function finishAtlas() {
  ATLAS.pixels = ATLAS.ctx.getImageData(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  // A pre-tinted copy for menus and icons (default temperate colours).
  const ic = document.createElement('canvas'); ic.width = ic.height = ATLAS_SIZE;
  const icx = ic.getContext('2d', { willReadFrequently: true }); icx.drawImage(ATLAS.canvas, 0, 0);
  const tints = { grass: [124, 191, 72], foliage: [94, 160, 60] };
  for (const [idx, kind] of ATLAS.tinted || []) {
    const x0 = (idx % ATLAS_TILES) * TILE, y0 = Math.floor(idx / ATLAS_TILES) * TILE;
    const d = icx.getImageData(x0, y0, TILE, TILE), t = tints[kind];
    for (let i = 0; i < d.data.length; i += 4) if (d.data[i + 3] === 253) { for (let c = 0; c < 3; c++) d.data[i + c] = Math.min(255, d.data[i + c] * t[c] / 255 * 1.3); d.data[i + 3] = 255; }
    icx.putImageData(d, x0, y0);
  }
  ATLAS.iconCanvas = ic;
}

// Tile UV rect (in 0..1) for a tile index.
// Texture coordinates of an atlas tile. Cached: the mesher asks for these hundreds of thousands
// of times, and callers only ever read them.
const UV_CACHE = [];
function tileUV(idx) {
  const c = UV_CACHE[idx];
  if (c) return c;
  // (0.9.0.19) a hair inside the tile's edges, so a face seen edge-on never picks up a pixel of the next tile
  const u = (idx % ATLAS_TILES) / ATLAS_TILES, v = Math.floor(idx / ATLAS_TILES) / ATLAS_TILES, e = 0.03 / ATLAS_SIZE;
  return (UV_CACHE[idx] = [u + e, v + e, u + 1 / ATLAS_TILES - e, v + 1 / ATLAS_TILES - e]);
}
// Per-block face tile indices: [px, nx, py, ny, pz, nz] (+x, -x, +y top, -y bottom, +z, -z)
// "front" faces -Z by default (we orient furnaces/chests using block meta later).
const BLOCK_FACES = [];
function resolveBlockTextures() {
  for (const b of BLOCKS) {
    const t = b.tex;
    let f = [0, 0, 0, 0, 0, 0];
    if (typeof t === 'string') { const i = ATLAS.tile[t] ?? 0; f = [i, i, i, i, i, i]; }
    else if (t) {
      const side = ATLAS.tile[t.side] ?? 0, top = ATLAS.tile[t.top] ?? side, bot = ATLAS.tile[t.bottom] ?? side;
      const front = t.front ? ATLAS.tile[t.front] : side;
      f = [side, side, top, bot, front, side];
    }
    if (b.facing6) {
      const T = (n, d) => (n !== undefined ? ATLAS.tile[n] : undefined) ?? d;
      const side = T(t.side, 0);
      b.f6 = { front: T(t.front, side), frontV: T(t.frontV ?? t.front, side), back: T(t.back, T(t.top, side)), backOn: T(t.backOn ?? t.back, T(t.top, side)), side, top: T(t.top, side) };
      // the item icon shows it facing up (pistons) or facing you (observers, dispensers)
      f = b.sideAll ? [side, side, b.f6.front, b.f6.back, side, side] : [side, side, b.f6.top, b.f6.top, b.f6.front, side];
    }
    BLOCK_FACES[b.id] = f;
    if (b.texUpper) b.upperTile = ATLAS.tile[b.texUpper] ?? f[0];
    if (b.crop) b.stageTiles = Array.from({ length: b.crop.stages }, (_, i) => ATLAS.tile[b.key + '_stage' + i] ?? f[0]);
  }
}

// ---- UI icon sheet ------------------------------------------------------------
const ICONS = { url: '', cols: 16, rows: 0, index: {}, size: 32 };
function buildIcons() {
  const keys = Object.keys(ITEMS);
  const cols = ICONS.cols, S = ICONS.size;
  const rows = Math.ceil(keys.length / cols);
  const cv = document.createElement('canvas');
  cv.width = cols * S; cv.height = rows * S;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  keys.forEach((key, i) => {
    const def = ITEMS[key];
    const ox = (i % cols) * S, oy = Math.floor(i / cols) * S;
    ICONS.index[key] = i;
    if (def.icon.startsWith('block:')) {
      const b = BLOCKS[B[def.block]];
      drawIsoBlock(g, ox, oy, BLOCK_FACES[b.id]);
    } else {
      const t = ATLAS.tile[def.icon];
      if (t === undefined) return;
      g.drawImage(ATLAS.iconCanvas, (t % ATLAS_TILES) * TILE, Math.floor(t / ATLAS_TILES) * TILE, TILE, TILE, ox, oy, S, S);
    }
  });
  ICONS.rows = rows;
  ICONS.canvas = cv;
  ICONS.url = cv.toDataURL();
}
function drawIsoBlock(g, ox, oy, faces) {
  // Each face is drawn into a scratch canvas with an affine transform, shaded,
  // then composited, so shading never bleeds onto neighbouring faces.
  const tmp = drawIsoBlock._tmp || (drawIsoBlock._tmp = Object.assign(document.createElement('canvas'), { width: 32, height: 32 }));
  const tg = tmp.getContext('2d'); tg.imageSmoothingEnabled = false;
  const face = (t, m, dark) => {
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.clearRect(0, 0, 32, 32);
    tg.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    tg.drawImage(ATLAS.iconCanvas, (t % ATLAS_TILES) * TILE, Math.floor(t / ATLAS_TILES) * TILE, TILE, TILE, 0, 0, 16.3, 16.3);
    if (dark > 0) { tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = `rgba(0,0,0,${dark})`; tg.fillRect(-2, -2, 20, 20); tg.globalCompositeOperation = 'source-over'; }
    g.drawImage(tmp, ox, oy);
  };
  face(faces[0], [13 / 16, 6.5 / 16, 0, 15 / 16, 3, 8.5], 0.22);       // left side
  face(faces[4], [13 / 16, -6.5 / 16, 0, 15 / 16, 16, 15], 0.42);       // right side (front)
  face(faces[2], [13 / 16, -6.5 / 16, 13 / 16, 6.5 / 16, 3, 8.5], 0);   // top
}
// Icons use one shared stylesheet rule for the sheet image; each element only
// carries its background-position.
function installIconCSS() {
  let st = document.getElementById('vx-icon-css');
  if (!st) { st = document.createElement('style'); st.id = 'vx-icon-css'; document.head.appendChild(st); }
  st.textContent = `.ico{background-image:url(${ICONS.url});background-size:${ICONS.cols * 100}% ${ICONS.rows * 100}%;background-repeat:no-repeat;image-rendering:pixelated}`;
  // UI panels are cut from the game's own textures (stone for panels, planks for signs)
  const tileURL = (name, k) => {
    const idx = ATLAS.tile[name]; if (idx === undefined || !ATLAS.canvas) return null;
    const c = document.createElement('canvas'); c.width = c.height = TILE;
    const x = c.getContext('2d');
    x.drawImage(ATLAS.canvas, (idx % ATLAS_TILES) * TILE, Math.floor(idx / ATLAS_TILES) * TILE, TILE, TILE, 0, 0, TILE, TILE);
    if (k) { x.globalCompositeOperation = 'multiply'; x.fillStyle = k; x.fillRect(0, 0, TILE, TILE); }
    try { return c.toDataURL(); } catch (e) { return null; }
  };
  const root = document.documentElement.style;
  const panel = tileURL('stone', '#6b5a4a'), planks = tileURL('planks', '#d8c8b0');
  if (panel) root.setProperty('--tex-panel', `url(${panel})`);
  if (planks) root.setProperty('--tex-planks', `url(${planks})`);
}
function iconPos(key) {
  const i = ICONS.index[key];
  if (i === undefined) return '0% 0%';
  const c = i % ICONS.cols, r = Math.floor(i / ICONS.cols);
  const px = ICONS.cols > 1 ? (c / (ICONS.cols - 1)) * 100 : 0;
  const py = ICONS.rows > 1 ? (r / (ICONS.rows - 1)) * 100 : 0;
  return `${px}% ${py}%`;
}
