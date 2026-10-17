// ---------------------------------------------------------------------------
// ui/title.js — the title screen in the classic style: the name built from
// stone blocks, a yellow splash line that bounces, and grey buttons laid out
// like the old game (and Better Than Adventure), over the turning world.
// ---------------------------------------------------------------------------

const SPLASHES = [
  'Roll for initiative!', 'Built on DokuQuest!', 'Natural 20!', 'The Shadowbloom spreads...', 'Bring a cleric!', 'Split the party? Never!', 'Now with weather!', 'Listen to the caves...', 'Wear a cape!', 'Pet the wolf!', 'Mind the puddles!', 'Now with redstone!', 'Minecarts!', 'Swim like a fish!', 'Lanterns sway in the wind!',
  'Hearts, not hunger!', 'Graves keep your stuff!', 'Pistons push!', 'Saplings plant themselves!', 'Grass creeps!',
  'Also try Mineclonia!', 'Also try VoxeLibre!', 'Also try Vintage Story!', 'Also try Veloren!', 'Also try Cube World!',
  'Made with WebGL!', '100% voxels!', 'Alpha!', 'The Ember Depths await!', '//wand!', 'Now as an AppImage!',
  'Dragons are coming!', 'Better than adventure?', 'Punch a tree!', 'Notch-style grass!', 'Water flows by itself!',
  'Works offline!', 'Couch co-op!', 'Sail the seas!', 'Windmills!', 'Mind the Cinder Golem!', 'Splash!',
];

// Five-row letters, '#' is a block.
const LOGO_FONT = {
  E: ['#####', '#....', '####.', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  B: ['####.', '#...#', '####.', '#...#', '####.'],
  R: ['####.', '#...#', '####.', '#..#.', '#...#'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  L: ['#....', '#....', '#....', '#....', '#####'],
  D: ['####.', '#...#', '#...#', '#...#', '####.'],
  O: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  K: ['#...#', '#..#.', '###..', '#..#.', '#...#'],
  U: ['#...#', '#...#', '#...#', '#...#', '.###.'],
  Q: ['.###.', '#...#', '#.#.#', '#..#.', '.##.#'],
  S: ['.####', '#....', '.###.', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..'],
  H: ['#...#', '#...#', '#####', '#...#', '#...#'],
  A: ['.###.', '#...#', '#####', '#...#', '#...#'],
  F: ['#####', '#....', '####.', '#....', '#....'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#'],
  ' ': ['..', '..', '..', '..', '..'],
};

// Draws the name in blocks with a dark 3D edge, like the old logo: "Doku" in mossy cobblestone,
// "Quest" in stone, both cut from the game's own textures.
function drawTitleLogo(canvas) {
  // The Shadowbloom of Eldenwood: SHADOWBLOOM in dark stone and amethyst, OF ELDENWOOD below in mossy stone
  const LINES = [{ word: 'SHADOWBLOOM', S: 16, mat: (i) => i < 6 ? 'dark' : 'bloom' }, { word: 'OF ELDENWOOD', S: 9, mat: () => 'moss' }];
  const S = 16, DEPTH = 9;
  const cells = []; let widest = 0, oy = 0;
  for (const L of LINES) {
    let cx = 0; const lc = [];
    for (let i = 0; i < L.word.length; i++) {
      const g = LOGO_FONT[L.word[i]];
      for (let y = 0; y < 5; y++) for (let x = 0; x < g[y].length; x++) if (g[y][x] === '#') lc.push({ x: cx + x, y, mat: L.mat(i), S: L.S, oy });
      cx += g[0].length + 1;
    }
    L.w = (cx - 1) * L.S; L.cells = lc; widest = Math.max(widest, L.w); oy += 5 * L.S + 8;
  }
  for (const L of LINES) { const off = Math.round((widest - L.w) / 2); for (const c of L.cells) { c.px = off + c.x * c.S; c.py = c.oy + c.y * c.S; cells.push(c); } }
  canvas.width = widest + DEPTH + 4; canvas.height = oy - 8 + DEPTH + 4;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const filled = new Set(cells.map(c => c.oy + ':' + c.x + ',' + c.y));
  const has = (c, x, y) => filled.has(c.oy + ':' + x + ',' + y);
  // the stone picture for a block face, from the game's own textures
  const tileOf = (key) => {
    const t = ATLAS.tile[key]; if (t === undefined || !ATLAS.pixels) return null;
    const tx = (t % ATLAS_TILES) * TILE, ty = Math.floor(t / ATLAS_TILES) * TILE, out = [];
    const st = TILE / 16;
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const o = ((ty + j * st) * ATLAS_SIZE + tx + i * st) * 4; out.push([ATLAS.pixels.data[o], ATLAS.pixels.data[o + 1], ATLAS.pixels.data[o + 2]]); }
    return out;
  };
  const stone = tileOf('stone') || tileOf('cobblestone'), moss = tileOf('mossy_cobblestone') || stone;
  const dark = tileOf('deepslate') || tileOf('cobbled_deepslate') || tileOf('blackstone') || stone, bloom = tileOf('amethyst_block') || tileOf('budding_amethyst') || stone;
  const MAT = { moss, dark, bloom };
  const img = ctx.createImageData(canvas.width, canvas.height), D = img.data;
  const put = (x, y, r, g, b) => { if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return; const o = (y * canvas.width + x) * 4; D[o] = r; D[o + 1] = g; D[o + 2] = b; D[o + 3] = 255; };
  const px = (c, i, j) => {
    const t = MAT[c.mat] || stone, k = 16 / c.S;
    const v = t ? t[(Math.floor(j * k) % 16) * 16 + (Math.floor(i * k) % 16)] : [128, 128, 128];
    if (c.mat === 'dark' && t === stone) return [v[0] * 0.45, v[1] * 0.42, v[2] * 0.5];
    if (c.mat === 'bloom' && t === stone) return [v[0] * 0.8, v[1] * 0.5, v[2] * 1.1];
    return [v[0], v[1], v[2]];
  };
  // the dark sides first (down and to the right), then the faces over them
  for (let k = DEPTH; k >= 1; k--) for (const c of cells) { const kk = Math.round(k * c.S / S); for (let j = 0; j < c.S; j++) for (let i = 0; i < c.S; i++) {
    const [r, g, b] = px(c, i, j), f = 0.22 + 0.16 * (1 - k / DEPTH);
    put(2 + c.px + i + Math.round(kk * 0.35), 2 + c.py + j + kk, r * f, g * f, b * f);
  } }
  for (const c of cells) for (let j = 0; j < c.S; j++) for (let i = 0; i < c.S; i++) {
    let [r, g, b] = px(c, i, j);
    // light catches the top and left edges of each letter, shadow on the bottom and right
    let f = 1;
    if (j < 2 && !has(c, c.x, c.y - 1)) f = 1.35; else if (i < 2 && !has(c, c.x - 1, c.y)) f = 1.22;
    else if (j >= c.S - 2 && !has(c, c.x, c.y + 1)) f = 0.7; else if (i >= c.S - 2 && !has(c, c.x + 1, c.y)) f = 0.78;
    put(2 + c.px + i, 2 + c.py + j, Math.min(255, r * f), Math.min(255, g * f), Math.min(255, b * f));
  }
  // a thin black outline round everything
  const W = canvas.width, H = canvas.height, solid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) solid[i] = D[i * 4 + 3] ? 1 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (solid[y * W + x]) continue;
    if ((x > 0 && solid[y * W + x - 1]) || (x < W - 1 && solid[y * W + x + 1]) || (y > 0 && solid[(y - 1) * W + x]) || (y < H - 1 && solid[(y + 1) * W + x])) put(x, y, 12, 10, 8);
  }
  ctx.putImageData(img, 0, 0);
}

// The menus wear the game's own textures (a resource pack's, when one is loaded): stone buttons
// that light up when picked, dark earth behind the panels, planks across their tops. A pack's own
// button pictures are used when it has them.
function tileURL(name, bright = 1, tint = null) {
  const t = ATLAS.tile[name]; if (t === undefined || !ATLAS.canvas) return null;
  const c = document.createElement('canvas'); c.width = c.height = TILE;
  const x = c.getContext('2d');
  x.drawImage(ATLAS.iconCanvas || ATLAS.canvas, (t % ATLAS_TILES) * TILE, Math.floor(t / ATLAS_TILES) * TILE, TILE, TILE, 0, 0, TILE, TILE);
  if (bright !== 1 || tint) {
    const d = x.getImageData(0, 0, TILE, TILE);
    for (let i = 0; i < d.data.length; i += 4) { for (let k = 0; k < 3; k++) d.data[i + k] = Math.min(255, d.data[i + k] * bright * (tint ? tint[k] : 1)); d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
  }
  return `url(${c.toDataURL()})`;
}
function makeButtonTextures() {
  const root = document.documentElement.style, G = (typeof PACKS !== 'undefined' && PACKS.gui) || {};
  const set = (k, v) => { if (v) root.setProperty(k, v); };
  if (G.btn) { set('--mc-btn', `url(${G.btn})`); set('--mc-btn-hi', `url(${G.hi || G.btn})`); document.documentElement.classList.add('pack-buttons'); }
  else { set('--mc-btn', tileURL('gui_button', 0.85)); set('--mc-btn-hi', tileURL('gui_button', 1.05, [0.85, 0.92, 1.25])); }
  set('--menu-bg', tileURL('dirt', 0.3));
  set('--menu-head', tileURL('planks', 0.42));
  set('--menu-edge', tileURL('stone_bricks', 0.55));
}

function pickSplash() {
  const el = document.getElementById('mc-splash');
  if (el) el.textContent = SPLASHES[Math.floor(Math.random() * SPLASHES.length)];
}

function initTitleScreen(ui) {
  try { drawTitleLogo(document.getElementById('mc-logo')); } catch (e) { console.warn('logo', e); }
  makeButtonTextures();
  pickSplash();
  document.getElementById('version').textContent = 'Shadowbloom Alpha v' + GAME_VERSION.replace('-alpha', '') + ' · What\'s new';
  // the half-width button next to Options: Quit in the desktop app, Full Screen in a browser
  const desktop = /Electron\//.test(navigator.userAgent);
  const quit = document.getElementById('btn-quit-app'), fs = document.getElementById('btn-fullscreen');
  if (desktop) { quit.hidden = false; quit.onclick = () => { if (window.emberLauncher && window.emberLauncher.quit) window.emberLauncher.quit(); else window.close(); }; }
  else if (document.fullscreenEnabled) {
    fs.hidden = false;
    const label = () => { fs.textContent = document.fullscreenElement ? 'Leave Full Screen' : 'Full Screen'; };
    fs.onclick = () => { ui.g.sfx.unlock(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else document.documentElement.requestFullscreen().catch(() => {}); };
    document.addEventListener('fullscreenchange', label); label();
  }
  // every menu button clicks, like the classic game
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.mcbtn'); if (b && !b.disabled) ui.g.sfx.play('click'); }, true);
}
