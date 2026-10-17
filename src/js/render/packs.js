// ---------------------------------------------------------------------------
// render/packs.js — resource packs, the way Minecraft does them. Pick a pack
// (.zip, Java Edition layout: assets/minecraft/textures/block and /item, or
// the old textures/blocks and /items) in Settings; its textures replace the
// built-in ones wherever a matching picture exists, everything else keeps the
// game's own painting. Grass, leaves and water stay biome-coloured, animated
// strips (water, lava, fire, portals...) animate, 16x, 32x and 64x all work.
// The pack is kept in this browser / app's storage, never sent anywhere.
// ---------------------------------------------------------------------------

const PACKS = { active: null, report: null };

// ---- the tiny bit of ZIP we need ------------------------------------------------------------
function zipIndex(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf), files = new Map();
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('That file isn’t a .zip');
  const n = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const td = new TextDecoder();
  for (let k = 0; k < n && off + 46 <= buf.byteLength; k++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true);
    const nlen = dv.getUint16(off + 28, true), elen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true), lho = dv.getUint32(off + 42, true);
    const name = td.decode(u8.subarray(off + 46, off + 46 + nlen));
    if (!name.endsWith('/')) files.set(name, { method, csize, lho });
    off += 46 + nlen + elen + clen;
  }
  const read = async (name) => {
    const f = files.get(name); if (!f) return null;
    const ln = dv.getUint16(f.lho + 26, true), le = dv.getUint16(f.lho + 28, true), start = f.lho + 30 + ln + le;
    const data = u8.subarray(start, start + f.csize);
    if (f.method === 0) return data;
    if (f.method !== 8 || typeof DecompressionStream === 'undefined') return null;
    const s = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  };
  return { files, read };
}

// ---- keeping the chosen pack --------------------------------------------------------------------
const packDB = () => new Promise((res, rej) => {
  let r; try { r = indexedDB.open('dokuquest-packs', 1); } catch (e) { rej(e); return; }
  r.onupgradeneeded = () => r.result.createObjectStore('packs');
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
async function packGet() {
  try { const db = await packDB(); return await new Promise((res) => { const q = db.transaction('packs').objectStore('packs').get('active'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }
  catch (e) { return null; }
}
async function packPut(rec) {
  const db = await packDB();
  await new Promise((res, rej) => { const t = db.transaction('packs', 'readwrite'); if (rec) t.objectStore('packs').put(rec, 'active'); else t.objectStore('packs').delete('active'); t.oncomplete = res; t.onerror = () => rej(t.error); });
}

// ---- our tile names -> the pack's picture names -----------------------------------------------------
// Most names are the same as Minecraft's; these are the ones that differ. A list means "the first one found".
const PACK_BLOCK_NAMES = {
  grass_top: 'grass_block_top', grass_side: 'grass_block_side', snowy_grass_side: 'grass_block_snow', planks: 'oak_planks', log_side: 'oak_log', log_top: 'oak_log_top',
  leaves: 'oak_leaves', sapling: 'oak_sapling', wool: 'white_wool', table_top: 'crafting_table_top', table_side: ['crafting_table_front', 'crafting_table_side'],
  furnace_front_lit: 'furnace_front_on', smoker_front_lit: 'smoker_front_on', blast_furnace_front_lit: 'blast_furnace_front_on',
  water: 'water_still', lava: 'lava_still', fire: 'fire_0', soul_fire: 'soul_fire_0', ember_portal: 'nether_portal',
  flower_red: 'poppy', flower_yellow: 'dandelion', tall_grass: ['short_grass', 'grass'], tall_grass_double_upper: 'tall_grass_top', tall_grass_double_lower: 'tall_grass_bottom',
  large_fern_upper: 'large_fern_top', large_fern_lower: 'large_fern_bottom',
  slate: 'deepslate', cobbled_slate: 'cobbled_deepslate', polished_slate: 'polished_deepslate', slate_bricks: 'deepslate_bricks', slate_tiles: 'deepslate_tiles',
  emberstone: 'netherrack', quartz_ore: 'nether_quartz_ore', quartz_block: ['quartz_block_side', 'quartz_block_top'], basalt: 'basalt_side',
  sandstone_side: 'sandstone', red_sandstone_side: 'red_sandstone', magma_block: 'magma', hay_side: 'hay_block_side', hay_top: 'hay_block_top',
  sugar_cane: 'sugar_cane', berry_bush: 'sweet_berry_bush_stage3', berry_bush_empty: 'sweet_berry_bush_stage1',
  mushroom_stem: 'mushroom_stem', red_mushroom_block: 'red_mushroom_block', brown_mushroom_block: 'brown_mushroom_block',
  // trees the pack won't know: borrow their nearest cousins
  pine_planks: 'spruce_planks', pine_log_side: 'spruce_log', pine_log_top: 'spruce_log_top', pine_needles: 'spruce_leaves', pine_sapling: 'spruce_sapling',
  aspen_planks: 'birch_planks', aspen_log_side: 'birch_log', aspen_log_top: 'birch_log_top', aspen_leaves: 'birch_leaves', aspen_sapling: 'birch_sapling',
  stripped_pine_log_side: 'stripped_spruce_log', stripped_pine_log_top: 'stripped_spruce_log_top', stripped_aspen_log_side: 'stripped_birch_log', stripped_aspen_log_top: 'stripped_birch_log_top',
  pine_door_upper: 'spruce_door_top', pine_door_lower: 'spruce_door_bottom', aspen_door_upper: 'birch_door_top', aspen_door_lower: 'birch_door_bottom',
  pine_trapdoor: 'spruce_trapdoor', aspen_trapdoor: 'birch_trapdoor',
  limestone: 'smooth_sandstone', marble: 'calcite', skystone: 'smooth_stone',
};
// Older packs (1.12 and before) used different names in textures/blocks.
const PACK_LEGACY = {
  grass_block_top: 'grass_top', grass_block_side: 'grass_side', grass_block_side_overlay: 'grass_side_overlay', grass_block_snow: 'grass_side_snowed',
  oak_planks: 'planks_oak', spruce_planks: 'planks_spruce', birch_planks: 'planks_birch', jungle_planks: 'planks_jungle', acacia_planks: 'planks_acacia', dark_oak_planks: 'planks_big_oak',
  oak_log: 'log_oak', oak_log_top: 'log_oak_top', spruce_log: 'log_spruce', spruce_log_top: 'log_spruce_top', birch_log: 'log_birch', birch_log_top: 'log_birch_top',
  jungle_log: 'log_jungle', jungle_log_top: 'log_jungle_top', acacia_log: 'log_acacia', acacia_log_top: 'log_acacia_top', dark_oak_log: 'log_big_oak', dark_oak_log_top: 'log_big_oak_top',
  oak_leaves: 'leaves_oak', spruce_leaves: 'leaves_spruce', birch_leaves: 'leaves_birch', jungle_leaves: 'leaves_jungle', acacia_leaves: 'leaves_acacia', dark_oak_leaves: 'leaves_big_oak',
  stone_bricks: 'stonebrick', mossy_stone_bricks: 'stonebrick_mossy', cracked_stone_bricks: 'stonebrick_cracked', chiseled_stone_bricks: 'stonebrick_carved',
  mossy_cobblestone: 'cobblestone_mossy', bricks: 'brick', water_still: 'water_still', lava_still: 'lava_still', nether_portal: 'portal',
  crafting_table_top: 'crafting_table_top', crafting_table_front: 'crafting_table_front', furnace_front_on: 'furnace_front_on',
  poppy: 'flower_rose', dandelion: 'flower_dandelion', short_grass: 'tallgrass', grass: 'tallgrass', oak_sapling: 'sapling_oak', fern: 'fern',
  white_wool: 'wool_colored_white', netherrack: 'netherrack', smooth_stone: 'stone_slab_top', magma: 'magma', granite: 'stone_granite', diorite: 'stone_diorite', andesite: 'stone_andesite',
  red_sand: 'red_sand', sandstone: 'sandstone_normal', sandstone_top: 'sandstone_top', tnt_side: 'tnt_side', bookshelf: 'bookshelf',
};
const PACK_ITEM_NAMES = {
  raw_meat: 'beef', cooked_meat: 'cooked_beef', venison: 'mutton', cooked_venison: 'cooked_mutton', berries: 'sweet_berries',
  // 0.8.3/0.8.4 things with a close Minecraft cousin
  cinder_rod: 'blaze_rod', ogre_club: 'mace', croc_scale: ['turtle_scute', 'scute'], pelt: 'rabbit_hide', ectoplasm: 'phantom_membrane',
};
// Pictures whose layout in a pack doesn't match how this game draws the block: leave them be.
const PACK_SKIP = new Set(['lantern', 'soul_lantern', 'lantern_cap', 'chain', 'bell', 'bell_frame', 'chest_top', 'chest_side', 'chest_front', 'trapped_chest_top', 'trapped_chest_side', 'trapped_chest_front', 'ender_chest_top', 'ender_chest_side', 'ender_chest_front', 'cauldron_side', 'cauldron_top', 'cauldron_inner',
  'campfire_log', 'campfire_log_end', 'campfire_embers', 'compass', 'clock', 'flower_pot', 'flower_pot_top']);
// Tinted by the biome in this game (the pack draws them in grey, as Minecraft's are)
const PACK_TINTED_SRC = new Set(['grass_block_top', 'grass_block_side_overlay', 'short_grass', 'grass', 'fern', 'tall_grass_top', 'tall_grass_bottom', 'large_fern_top', 'large_fern_bottom',
  'oak_leaves', 'jungle_leaves', 'acacia_leaves', 'dark_oak_leaves', 'mangrove_leaves', 'birch_leaves', 'spruce_leaves', 'vine', 'lily_pad', 'sugar_cane',
  'grass_top', 'grass_side_overlay', 'tallgrass', 'leaves_oak', 'leaves_jungle', 'leaves_acacia', 'leaves_big_oak', 'leaves_birch', 'leaves_spruce', 'waterlily', 'reeds']);
// Minecraft's fixed colours for the leaves it doesn't tint by biome
const PACK_FIXED = { spruce_leaves: [97, 153, 97], birch_leaves: [128, 167, 85], leaves_spruce: [97, 153, 97], leaves_birch: [128, 167, 85],
  leather_helmet: [160, 101, 64], leather_chestplate: [160, 101, 64], leather_leggings: [160, 101, 64], leather_boots: [160, 101, 64] };

function packCandidates(name, isItem) {
  const out = [];
  const add = (v) => { if (!v) return; for (const s of [].concat(v)) if (!out.includes(s)) out.push(s); };
  if (isItem) {
    add(PACK_ITEM_NAMES[name]);
    let n = name.replace(/_item$/, '');
    n = n.replace(/^wood_(pickaxe|axe|shovel|sword|hoe)$/, 'wooden_$1').replace(/^gold_(pickaxe|axe|shovel|sword|hoe|helmet|chestplate|leggings|boots)$/, 'golden_$1');
    add(n); add(name);
    return out;
  }
  add(PACK_BLOCK_NAMES[name]);
  let m;
  if ((m = name.match(/^(\w+)_door_upper$/))) add(m[1] + '_door_top');
  if ((m = name.match(/^(\w+)_door_lower$/))) add(m[1] + '_door_bottom');
  if ((m = name.match(/^(crimson|warped)_log_(side|top)$/))) add(m[1] + '_stem' + (m[2] === 'top' ? '_top' : ''));
  if ((m = name.match(/^stripped_(crimson|warped)_log_(side|top)$/))) add('stripped_' + m[1] + '_stem' + (m[2] === 'top' ? '_top' : ''));
  if ((m = name.match(/^(\w+)_log_side$/))) add(m[1] + '_log');
  if ((m = name.match(/^stripped_(\w+)_log_side$/))) add('stripped_' + m[1] + '_log');
  if ((m = name.match(/^wheat_crop_stage(\d)$/))) add('wheat_stage' + m[1]);
  if ((m = name.match(/^(carrot|potato|beetroot)_crop_stage(\d)$/))) add({ carrot: 'carrots', potato: 'potatoes', beetroot: 'beetroots' }[m[1]] + '_stage' + m[2]);
  if ((m = name.match(/^(sunflower|lilac|rose_bush|peony)_(upper|lower)$/))) add(m[1] + (m[2] === 'upper' ? '_top' : '_bottom'));
  if (name === 'sunflower_upper') add('sunflower_front');
  add(name);
  return out;
}

// ---- reading pictures out of the pack ----------------------------------------------------------------
async function packImage(bytes) {
  const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bmp, 0, 0);
  return x.getImageData(0, 0, bmp.width, bmp.height);
}
// one square frame of a picture (frame f of a vertical strip), cropped to `crop` of its width,
// brought to `res` pixels: smaller ones doubled up, bigger ones averaged down
function packFrame(img, f, res, crop = 1) {
  const W = img.width, S = Math.round(W * crop), k = S / res, d = img.data, out = new Uint8ClampedArray(res * res * 4);
  // does it use see-through shades (water, glass, ice), or only clean cut-outs (leaves, flowers)?
  let soft = 0, seen = 0;
  for (let i = 3; i < W * W * 4; i += 28) { seen++; if (d[i] > 8 && d[i] < 247) soft++; }
  const cut = soft < seen * 0.03;
  for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) {
    const x0 = Math.floor(x * k), y0 = Math.floor(y * k), x1 = Math.max(x0 + 1, Math.floor((x + 1) * k)), y1 = Math.max(y0 + 1, Math.floor((y + 1) * k));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = ((yy + f * W) * W + xx) * 4, al = d[i + 3];
      n++; a += al; r += d[i] * al; g += d[i + 1] * al; b += d[i + 2] * al;
    }
    const o = (y * res + x) * 4;
    if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
    const A = a / n; out[o + 3] = cut ? (A >= 128 ? 255 : 0) : A;
  }
  return out;
}

// ---- applying a pack to the atlas ------------------------------------------------------------------------
async function applyResourcePack(rec) {
  rec = rec || await packGet();
  if (!rec || !rec.data) return null;
  const report = { name: rec.name, used: 0, items: 0, animated: 0, res: 0, missing: [] };
  let Z;
  try { Z = zipIndex(rec.data); } catch (e) { report.error = e.message; PACKS.report = report; return report; }
  // find the textures folder (the zip may wrap everything in a folder of its own)
  let root = null, legacy = false;
  for (const name of Z.files.keys()) {
    const i = name.indexOf('assets/minecraft/textures/');
    if (i >= 0) { root = name.slice(0, i) + 'assets/minecraft/textures/'; break; }
  }
  if (!root) for (const name of Z.files.keys()) { const i = name.indexOf('textures/blocks/'); if (i >= 0) { root = name.slice(0, i) + 'textures/'; legacy = true; break; } }
  if (!root) { report.error = 'No textures in that pack (looked for assets/minecraft/textures)'; PACKS.report = report; return report; }
  const blockDirs = legacy ? ['blocks/'] : ['block/', 'blocks/'], itemDirs = legacy ? ['items/'] : ['item/', 'items/'];
  const find = (dirs, base) => {
    for (const d of dirs) {
      const p = root + d + base + '.png'; if (Z.files.has(p)) return { path: p, base };
      const lb = PACK_LEGACY[base]; if (lb && Z.files.has(root + d + lb + '.png')) return { path: root + d + lb + '.png', base: lb };
    }
    return null;
  };
  const meta = async (path) => { const b = await Z.read(path + '.mcmeta'); if (!b) return null; try { return JSON.parse(new TextDecoder().decode(b)); } catch (e) { return null; } };
  const items = ATLAS.items || new Set();
  const cache = new Map();
  const load = async (path) => { if (!cache.has(path)) { const b = await Z.read(path); cache.set(path, b ? await packImage(b).catch(() => null) : null); } return cache.get(path); };

  for (const [name, idx] of Object.entries(ATLAS.tile)) {
    if (PACK_SKIP.has(name) || name.startsWith('crack_')) continue;
    const isItem = items.has(name);
    let hit = null;
    for (const c of packCandidates(name, isItem)) { hit = find(isItem ? itemDirs : blockDirs, c); if (hit) break; }
    if (!hit) continue;
    const img = await load(hit.path);
    if (!img || img.width < 8 || img.height < img.width) continue;
    const res = clamp(img.width >= 32 ? TILE : img.width, 8, TILE);
    const flow = /_flow$/.test(hit.base);
    const crop = flow ? 0.5 : 1;                                // flowing liquids are drawn at double size
    const nFrames = Math.floor(img.height / img.width);
    const tinted = (ATLAS.tinted || []).some(([i]) => i === idx);
    const fixed = !tinted && PACK_FIXED[hit.base];
    const fix = (px) => {
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] === 253) px[i + 3] = 252;               // 253 is the game's own "tint me" marker
        if (fixed && px[i + 3] > 0) { px[i] = px[i] * fixed[0] / 255; px[i + 1] = px[i + 1] * fixed[1] / 255; px[i + 2] = px[i + 2] * fixed[2] / 255; }
        if (tinted && PACK_TINTED_SRC.has(hit.base) && px[i + 3] >= 128) px[i + 3] = 253;
        if ((name === 'water' || name === 'water_flow') && px[i + 3] === 255) px[i + 3] = 180;
      }
      return px;
    };
    let px = fix(packFrame(img, 0, res, crop));
    // the grassy side: Minecraft draws a grey fringe over the dirt as a second layer
    if (name === 'grass_side') {
      const ov = find(blockDirs, 'grass_block_side_overlay'), oimg = ov && await load(ov.path);
      if (oimg && oimg.width === img.width) {
        const o = packFrame(oimg, 0, res);
        for (let i = 0; i < o.length; i += 4) if (o[i + 3] >= 128) { px[i] = o[i]; px[i + 1] = o[i + 1]; px[i + 2] = o[i + 2]; px[i + 3] = 253; }
      }
    }
    const full = toTileSize(px, res);
    ATLAS.ctx.putImageData(new ImageData(full, TILE, TILE), (idx % ATLAS_TILES) * TILE, Math.floor(idx / ATLAS_TILES) * TILE);
    ATLAS.res[idx] = res;
    (ATLAS.packed || (ATLAS.packed = new Set())).add(idx);     // (0.9.0.15) this picture is the pack's
    report.used++; if (isItem) report.items++; if (name === 'stone' || (!report.res && !flow && nFrames === 1)) report.res = img.width;
    // animation: the pack's frames replace the game's own (or stop it, if the pack's picture is still)
    const ai = ANIMS.findIndex(a => a.tile === idx);
    if (nFrames > 1 || ai >= 0) {
      const mm = nFrames > 1 ? await meta(hit.path) : null, an = (mm && mm.animation) || {};
      const order = Array.isArray(an.frames) ? an.frames.map(f => typeof f === 'number' ? f : f.index).filter(f => f < nFrames) : [...Array(nFrames).keys()];
      const frames = order.map(f => new Uint8Array(toTileSize(fix(packFrame(img, f, res, crop)), res).buffer.slice(0)));
      const fps = 20 / Math.max(1, an.frametime || 1);
      if (ai >= 0) ANIMS.splice(ai, 1);
      if (frames.length > 1) { ANIMS.push({ tile: idx, frames, fps, phase: 0, cur: -1 }); report.animated++; }
    }
  }
  // the pack's creatures (render/packmobs.js)
  try { report.mobs = await packMobSkins(Z, root, legacy, load); } catch (e) { console.warn('pack mobs', e); }
  // armour in the pack's own pictures (render/packarmor.js)
  try { if (typeof packArmor === 'function') report.armor = await packArmor(Z, root, legacy, load); } catch (e) { console.warn('pack armour', e); }
  // chests are drawn from the pack's chest model picture
  try { report.chests = await packChests(Z, root, legacy, load); } catch (e) { console.warn('pack chests', e); }
  finishAtlas();
  try { report.sounds = await packSounds(Z, root.replace(/textures\/$/, ''), legacy); } catch (e) { console.warn('pack sounds', e); }
  // the pack's own menu buttons, if it has them (1.20.2+ sprites, or the older widgets sheet)
  try {
    const url = async (path, crop) => { const b = await Z.read(path); if (!b) return null; const img = await packImage(b); const c = document.createElement('canvas'); const [sx, sy, sw, sh] = crop || [0, 0, img.width, img.height]; c.width = sw; c.height = sh; const tmp = document.createElement('canvas'); tmp.width = img.width; tmp.height = img.height; tmp.getContext('2d').putImageData(img, 0, 0); c.getContext('2d').drawImage(tmp, sx, sy, sw, sh, 0, 0, sw, sh); return c.toDataURL(); };
    let btn = await url(root + 'gui/sprites/widget/button.png'), hi = btn && await url(root + 'gui/sprites/widget/button_highlighted.png');
    if (!btn && Z.files.has(root + 'gui/widgets.png')) {
      const b = await Z.read(root + 'gui/widgets.png'), img = b && await packImage(b), k = img ? img.width / 256 : 1;
      if (img) { btn = await url(root + 'gui/widgets.png', [0, 66 * k, 200 * k, 20 * k]); hi = await url(root + 'gui/widgets.png', [0, 86 * k, 200 * k, 20 * k]); }
    }
    if (btn) PACKS.gui = { btn, hi };
  } catch (e) { console.warn('pack gui', e); }
  PACKS.active = rec.name; PACKS.report = report;
  return report;
}

// Check a chosen file is a usable pack, then keep it (the game restarts to load it).
async function installResourcePack(file) {
  const data = await file.arrayBuffer();
  const Z = zipIndex(data);
  const has = [...Z.files.keys()].some(n => /(assets\/minecraft\/(textures\/(block|item|entity)s?\/|sounds\/)|textures\/(blocks|items|entity)\/).+\.(png|ogg)$/.test(n));
  if (!has) throw new Error('No block, item or creature textures (or sounds) found in that pack');
  let desc = '';
  const mc = [...Z.files.keys()].find(n => /(^|\/)pack\.mcmeta$/.test(n));
  if (mc) { try { const j = JSON.parse(new TextDecoder().decode(await Z.read(mc))); const d = j.pack && j.pack.description; desc = typeof d === 'string' ? d : (d && d.text) || ''; } catch (e) { /* no description */ } }
  await packPut({ name: file.name.replace(/\.zip$/i, ''), desc: desc.replace(/§./g, ''), size: data.byteLength, added: Date.now(), data });
}
async function removeResourcePack() { await packPut(null); }

// ---- sounds from a pack -----------------------------------------------------------------------------
// Which of the pack's sound events (Java names) stand in for which of the game's sounds, and the
// files Minecraft uses for them when a pack replaces the files without a sounds.json of its own.
const PACK_SOUND_EVENTS = {};
{
  const mats = { grass: 'grass', dirt: 'gravel', gravel: 'gravel', sand: 'sand', snow: 'snow', stone: 'stone', wood: 'wood', wool: 'wool', glass: 'glass', metal: 'metal', leaves: 'grass', mud: 'mud', slime: 'slime_block', ladder: 'ladder' };
  const files = { grass: 'grass', gravel: 'gravel', sand: 'sand', snow: 'snow', stone: 'stone', wood: 'wood', wool: 'cloth', glass: 'stone', metal: 'stone', mud: 'mud', slime_block: 'slime', ladder: 'ladder' };
  for (const [ours, mc] of Object.entries(mats)) {
    const f = files[mc] || mc;
    PACK_SOUND_EVENTS[ours + '.step'] = ['block.' + mc + '.step', [1, 2, 3, 4, 5, 6].map(n => 'step/' + f + n)];
    PACK_SOUND_EVENTS[ours + '.dig'] = ['block.' + mc + '.hit', [1, 2, 3, 4, 5, 6].map(n => 'step/' + f + n)];
    PACK_SOUND_EVENTS[ours + '.break'] = ['block.' + mc + '.break', [1, 2, 3, 4].map(n => 'dig/' + f + n)];
    PACK_SOUND_EVENTS[ours + '.place'] = ['block.' + mc + '.place', [1, 2, 3, 4].map(n => 'dig/' + f + n)];
  }
  PACK_SOUND_EVENTS['glass.break'] = ['block.glass.break', [1, 2, 3].map(n => 'random/glass' + n)];
  const fx = { door_open: ['block.wooden_door.open', ['random/door_open']], door_close: ['block.wooden_door.close', ['random/door_close']],
    chest: ['block.chest.open', ['random/chestopen']], chest_close: ['block.chest.close', ['random/chestclosed']], eat: ['entity.generic.eat', ['random/eat1', 'random/eat2', 'random/eat3']],
    splash: ['entity.generic.splash', ['random/splash']], swim: ['entity.player.swim', [1, 2, 3, 4].map(n => 'liquid/swim' + n)], bucket: ['item.bucket.fill', [1, 2, 3].map(n => 'item/bucket/fill' + n)],
    pop: ['entity.item.pickup', ['random/pop']], hurt: ['entity.player.hurt', [1, 2, 3].map(n => 'damage/hit' + n)], explode: ['entity.generic.explode', [1, 2, 3, 4].map(n => 'random/explode' + n)],
    ignite: ['item.flintandsteel.use', ['fire/ignite']], fizz: ['block.fire.extinguish', ['random/fizz']], bow: ['entity.arrow.shoot', ['random/bow']], arrow_hit: ['entity.arrow.hit', [1, 2, 3, 4].map(n => 'random/bowhit' + n)],
    levelup: ['entity.player.levelup', ['random/levelup']], xp: ['entity.experience_orb.pickup', ['random/orb']], click: ['ui.button.click', ['random/click']], fire_crackle: ['block.fire.ambient', ['fire/fire']],
    lava_pop: ['block.lava.pop', ['liquid/lavapop']], fell: ['entity.player.big_fall', ['damage/fallbig']], thud: ['entity.player.small_fall', ['damage/fallsmall']], burp: ['entity.player.burp', ['random/burp']] };
  for (const [k, v] of Object.entries(fx)) PACK_SOUND_EVENTS['fx.' + k] = v;
  // creatures: our voice -> Minecraft's mob, and how many of each call its files run to
  const n = (pre, k) => [...Array(k).keys()].map(i => pre + (i + 1));
  const mobs = {
    ghoul: ['zombie', n('mob/zombie/say', 3), n('mob/zombie/hurt', 2), ['mob/zombie/death']],
    husk: ['husk', n('mob/husk/idle', 3), n('mob/husk/hurt', 2), n('mob/husk/death', 2)],
    drowned: ['drowned', n('mob/drowned/idle', 5), n('mob/drowned/hurt', 3), n('mob/drowned/death', 2)],
    rattle: ['skeleton', n('mob/skeleton/say', 3), n('mob/skeleton/hurt', 4), ['mob/skeleton/death']],
    stray: ['stray', n('mob/stray/idle', 4), n('mob/stray/hurt', 4), n('mob/stray/death', 2)],
    spider: ['spider', n('mob/spider/say', 4), n('mob/spider/say', 4), ['mob/spider/death']],
    fuseling: ['creeper', null, n('mob/creeper/say', 4), ['mob/creeper/death']],
    squish: ['slime', n('mob/slime/big', 4), n('mob/slime/big', 4), n('mob/slime/big', 4)],
    witch: ['witch', n('mob/witch/ambient', 5), n('mob/witch/hurt', 3), n('mob/witch/death', 3)],
    raider: ['vindicator', n('mob/vindication_illager/idle', 5), n('mob/vindication_illager/hurt', 3), n('mob/vindication_illager/death', 2)],
    wisp: ['blaze', n('mob/blaze/breathe', 4), n('mob/blaze/hit', 4), ['mob/blaze/death']],
    mite: ['silverfish', n('mob/silverfish/say', 4), n('mob/silverfish/hit', 3), ['mob/silverfish/kill']],
    moo: ['cow', n('mob/cow/say', 4), n('mob/cow/hurt', 3), n('mob/cow/hurt', 3)],
    oink: ['pig', n('mob/pig/say', 3), n('mob/pig/say', 3), ['mob/pig/death']],
    baa: ['sheep', n('mob/sheep/say', 3), n('mob/sheep/say', 3), n('mob/sheep/say', 3)],
    cluck: ['chicken', n('mob/chicken/say', 3), n('mob/chicken/hurt', 2), n('mob/chicken/hurt', 2)],
    wolf: ['wolf', n('mob/wolf/bark', 3), n('mob/wolf/hurt', 3), ['mob/wolf/death']],
  };
  for (const [ours, [mc, say, hurt, death]] of Object.entries(mobs)) {
    if (say) PACK_SOUND_EVENTS['mob.' + ours] = ['entity.' + mc + '.ambient', say];
    PACK_SOUND_EVENTS['mob.' + ours + '_hurt'] = ['entity.' + mc + '.hurt', hurt];
    PACK_SOUND_EVENTS['mob.' + ours + '_death'] = ['entity.' + mc + '.death', death];
  }
  PACK_SOUND_EVENTS['mob.hiss'] = ['entity.creeper.primed', ['random/fuse']];
  PACK_SOUND_EVENTS['mob.wolf_angry'] = ['entity.wolf.growl', n('mob/wolf/growl', 3)];
  PACK_SOUND_EVENTS['mob.wolf_howl'] = ['entity.wolf.howl', n('mob/wolf/howl', 2)];
  PACK_SOUND_EVENTS['mob.squish'][0] = 'entity.slime.squish';
}
const PACK_SOUND_BYTES = new Map();     // our key -> [Uint8Array...] waiting for the audio to start
async function packSounds(Z, base, legacy) {
  if (legacy) return 0;
  const sroot = base + 'sounds/';
  let table = {};
  const sj = await Z.read(base + 'sounds.json');
  if (sj) { try { table = JSON.parse(new TextDecoder().decode(sj)); } catch (e) { table = {}; } }
  let n = 0;
  for (const [ours, [event, defaults]] of Object.entries(PACK_SOUND_EVENTS)) {
    let names = defaults;
    const e = table[event];
    if (e && Array.isArray(e.sounds)) names = e.sounds.map(x => typeof x === 'string' ? x : x.name).filter(Boolean).map(x => x.replace(/^minecraft:/, ''));
    const got = [];
    for (const nm of names) { const b = await Z.read(sroot + nm + '.ogg'); if (b) got.push(b.slice()); }
    if (got.length) { PACK_SOUND_BYTES.set(ours, got); n++; }
  }
  return n;
}
// Once there's sound, decode the pack's recordings and hand them to the synth.
function packDecodeSounds(ctx) {
  for (const [key, list] of PACK_SOUND_BYTES) {
    Promise.all(list.map(b => ctx.decodeAudioData(b.buffer.slice(0)).catch(() => null))).then(bufs => { const ok = bufs.filter(Boolean); if (ok.length) SND.packs.set(key, ok); });
  }
}

// Minecraft draws chests as a model with a 64x64 picture (entity/chest/normal.png): a lid box 14x5x14 above a
// base box 14x10x14, and a little latch. This game's chest is an ordinary block, so its top, side and front
// pictures are put together from the pieces: the lid's top, and the lid's side above the base's side (with
// the latch on the front). Packs for 1.15 and later store those sides upside down.
async function packChests(Z, root, legacy, load) {
  let fmt = 0;
  try {
    const mpath = root.replace(/assets\/minecraft\/textures\/$/, '').replace(/textures\/$/, '') + 'pack.mcmeta';
    const b = await Z.read(mpath); if (b) fmt = (JSON.parse(new TextDecoder().decode(b)).pack || {}).pack_format || 0;
  } catch (e) { /* no format: assume modern unless it's an old-style pack */ }
  const flip = !legacy && (fmt === 0 || fmt >= 5);
  let n = 0;
  for (const [pic, prefix] of [['normal', 'chest'], ['trapped', 'trapped_chest'], ['ender', 'ender_chest']]) {
    const tTop = ATLAS.tile[prefix + '_top'], tSide = ATLAS.tile[prefix + '_side'], tFront = ATLAS.tile[prefix + '_front'];
    if (tTop === undefined && tSide === undefined) continue;
    const img = await load(root + 'entity/chest/' + pic + '.png');
    if (!img || img.width < 64 || img.height < 64) continue;
    const k = img.width / 64, d = img.data, W = img.width;
    const get = (u, v) => { const sx = Math.min(W - 1, Math.floor(u * k)), sy = Math.min(img.height - 1, Math.floor(v * k)), i = (sy * W + sx) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
    const put = (idx, fn) => {
      if (idx === undefined) return;
      const px = new Uint8ClampedArray(TILE * TILE * 4);
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const c = fn((x + 0.5) / TILE, (y + 0.5) / TILE), o = (y * TILE + x) * 4; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; px[o + 3] = 255; }
      ATLAS.ctx.putImageData(new ImageData(px, TILE, TILE), (idx % ATLAS_TILES) * TILE, Math.floor(idx / ATLAS_TILES) * TILE);
      ATLAS.res[idx] = TILE;
    };
    // a strip of a box's side, read the right way up
    const strip = (u, v, w, h, fx, fy) => get(u + fx * w, v + (flip ? 1 - fy : fy) * h);
    const side = (fu, fx, fy) => fy < 5 / 15 ? strip(fu, 14, 14, 5, fx, fy * 3) : strip(fu, 33, 14, 10, fx, (fy - 5 / 15) * 1.5);
    put(tTop, (fx, fy) => get(14 + fx * 14, 0 + fy * 14));
    put(tSide, (fx, fy) => side(0, fx, fy));
    put(tFront, (fx, fy) => {
      // the latch, in the middle where lid meets base
      if (fx > 7 / 16 && fx < 9 / 16 && fy > 3 / 16 && fy < 7.5 / 16) { const c = get(1 + (fx - 7 / 16) * 16, 1 + (fy - 3 / 16) / (4.5 / 16) * 4); if (c[3] > 128) return c; }
      return side(14, fx, fy);
    });
    n++;
  }
  return n;
}
