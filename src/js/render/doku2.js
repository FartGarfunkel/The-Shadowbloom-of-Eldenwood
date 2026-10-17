// ---------------------------------------------------------------------------
// render/doku2.js — textures for the rest of the classic block set (0.5):
// bamboo, the nether blocks, more stone, work stations, candles, cake, crops,
// cave plants, the farm animals and the new items. Same Doku painters as
// render/doku.js; everything is generated at start-up.
// ---------------------------------------------------------------------------

// A crack running across a tile (cracked bricks and tiles).
function crackOver(p, col, n = 2) {
  for (let k = 0; k < n; k++) {
    let x = Math.floor(p.rand() * 16), y = 0;
    for (let i = 0; i < 18; i++) { p.set(W16(x), W16(y), col); y++; x += p.rand() < 0.45 ? (p.rand() < 0.5 ? -1 : 1) : 0; if (p.rand() < 0.15) p.set(W16(x + 1), W16(y), col); }
  }
}
// A plain frame: light top-left edge, dark bottom-right edge.
function frameOver(p, hi, lo, w = 1) {
  for (let i = 0; i < 16; i++) for (let k = 0; k < w; k++) { p.set(i, k, hi); p.set(k, i, hi); p.set(i, 15 - k, lo); p.set(15 - k, i, lo); }
}
// Generic crossed-sprite plant painter: n blades/strands from the bottom.
function blades(p, cols, n, hMin, hMax, o = {}) {
  for (let b = 0; b < n; b++) {
    let x = 1 + Math.floor(p.rand() * 14); const h = hMin + Math.floor(p.rand() * (hMax - hMin + 1));
    for (let y = 15; y > 15 - h; y--) {
      p.set(x, y, cols[Math.min(cols.length - 1, Math.floor((15 - y) / h * cols.length))], o.a ?? 255);
      if (p.rand() < (o.wander ?? 0.2)) x = clamp(x + (p.rand() < 0.5 ? -1 : 1), 0, 15);
    }
  }
}
// Hanging strands from the top (weeping vines, roots, cave vines).
function strands(p, cols, n, hMin, hMax, extra) {
  for (let b = 0; b < n; b++) {
    let x = 1 + Math.floor(p.rand() * 14); const h = hMin + Math.floor(p.rand() * (hMax - hMin + 1));
    for (let y = 0; y < h; y++) {
      p.set(x, y, cols[(y + b) % cols.length]);
      if (extra && p.rand() < extra.chance) p.set(clamp(x + (p.rand() < 0.5 ? -1 : 1), 0, 15), y, hexRGB(extra.col));
      if (p.rand() < 0.15) x = clamp(x + (p.rand() < 0.5 ? -1 : 1), 0, 15);
    }
  }
}

function paintDokuBlocks2() {
  const H = hexRGB;
  // ---- bamboo ----
  const BG = ramp('#6a9a28', 6, 0.5), BY = ramp('#d8c060', 7, 0.45), BYS = ramp('#e4d48a', 7, 0.35);
  addTile('bamboo_stalk', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { let v = 0.55 + (x % 3 === 0 ? -0.2 : x % 3 === 1 ? 0.15 : 0) + (p.rand() - 0.5) * 0.08; if (y === 4 || y === 12) v = 0.12; if (y === 5 || y === 13) v = 0.85; p.set(x, y, pick(BG, clamp(v, 0, 0.999))); } });
  addTile('bamboo_stalk_top', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); p.set(x, y, d > 5 ? BG[1] : d > 3.5 ? BG[3] : BY[3]); } });
  const stalks = (p, R, nodeCol) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = x % 4; let v = 0.5 + (c === 0 ? -0.3 : c === 1 ? 0.2 : c === 3 ? -0.12 : 0.05) + (p.rand() - 0.5) * 0.08; if ((y + (Math.floor(x / 4) % 2) * 7) % 8 === 0) v = 0.15; p.set(x, y, pick(R, clamp(v, 0, 0.999))); } };
  addTile('bamboo_block_side', p => stalks(p, BG));
  addTile('stripped_bamboo_block_side', p => stalks(p, BY));
  const rings = (p, outer, inner) => { p.fill(outer[0]); for (const [cx, cy] of [[3.5, 3.5], [11.5, 3.5], [3.5, 11.5], [11.5, 11.5]]) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - cx, y - cy); if (d < 3.6) p.set(x, y, d > 2.4 ? outer[3] : d > 1.5 ? inner[4] : inner[2]); } };
  addTile('bamboo_block_top', p => rings(p, BG, BY));
  addTile('stripped_bamboo_block_top', p => rings(p, BY, BYS));
  addTile('bamboo_planks', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = x % 4; let v = 0.5 + (c === 0 ? -0.32 : c === 1 ? 0.18 : 0) + (p.rand() - 0.5) * 0.1; if ((y + Math.floor(x / 4) * 5) % 16 === 3) v = 0.2; p.set(x, y, pick(BY, clamp(v, 0, 0.999))); } });
  addTile('bamboo_mosaic', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const cell = (Math.floor(x / 8) + Math.floor(y / 4)) % 2; const lx = x % 8, ly = y % 4; let v = 0.5 + (cell ? 0.12 : -0.05) + (p.rand() - 0.5) * 0.08; if (ly === 3 || lx === 7) v = 0.1; if (ly === 0) v += 0.2; p.set(x, y, pick(BY, clamp(v, 0, 0.999))); } });
  const scafFrame = (p, diag) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const edge = x < 2 || x > 13 || y < 2 || y > 13; const d = diag && (Math.abs(x - y) < 1.5 || Math.abs(15 - x - y) < 1.5); if (edge || d) p.set(x, y, pick(BY, clamp(0.5 + (x < 2 || y < 2 ? 0.2 : -0.1) + (p.rand() - 0.5) * 0.1, 0, 0.999))); } for (let i = 0; i < 16; i += 5) { p.set(i, 0, BG[1]); p.set(0, i, BG[1]); } };
  addTile('scaffolding_top', p => { scafFrame(p, false); for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) if ((y % 4) !== 1) p.set(x, y, pick(BY, 0.4 + (p.rand() - 0.5) * 0.1)); });
  addTile('scaffolding_side', p => scafFrame(p, true));
  addTile('scaffolding_bottom', p => scafFrame(p, false));

  // ---- more stone ----
  const TU = ramp('#6d6e60', 7, 0.45), BL = ramp('#2c2830', 7, 0.5), NB = ramp('#4a1c1c', 6, 0.5), QZ = ramp('#ece6dc', 7, 0.3), RS = ramp('#b95c25', 7, 0.4), PU = ramp('#a87aa8', 7, 0.4);
  const SL = ramp('#4d5360', 7, 0.5), DS = ramp('#b07a54', 7, 0.45), DSS = ramp('#d8b48a', 7, 0.35), SVS = ramp('#d0d2cc', 7, 0.3), OB = ramp('#2a1c3a', 7, 0.6), ST = ramp('#86878b', 7, 0.45);
  addTile('polished_tuff', p => pPolished(p, TU));
  addTile('tuff_bricks', p => pBricks(p, TU, H('#3a3b32'), 8, 4, { offset: 4 }));
  addTile('chiseled_tuff', p => { pPolished(p, TU); for (let x = 2; x < 14; x++) { p.set(x, 4, TU[1]); p.set(x, 11, TU[1]); p.set(x, 5, TU[5]); } });
  addTile('chiseled_tuff_bricks', p => { pBricks(p, TU, H('#3a3b32'), 16, 8); for (let y = 2; y < 6; y++) for (let x = 5; x < 11; x++) p.set(x, y, TU[(x + y) % 2 ? 1 : 2]); });
  addTile('smooth_basalt', p => pNatural(p, ramp('#48484e', 6, 0.3), { cracks: 0, grain: 0.08 }));
  addTile('polished_blackstone', p => pPolished(p, BL));
  addTile('cracked_blackstone_bricks', p => { pBricks(p, BL, H('#121014'), 8, 4, { offset: 4 }); crackOver(p, H('#0c0a0e')); });
  addTile('chiseled_polished_blackstone', p => pChiseled(p, BL));
  addTile('gilded_blackstone', p => { paintStone(p, 'blackstone'); for (let k = 0; k < 6; k++) p.blob(2 + Math.floor(p.rand() * 12), 2 + Math.floor(p.rand() * 12), 1, H('#e8b830'), 0.25); });
  addTile('cracked_nether_bricks', p => { pBricks(p, NB, H('#1e0a0a'), 8, 4); crackOver(p, H('#140606')); });
  addTile('chiseled_nether_bricks', p => { pBricks(p, NB, H('#1e0a0a'), 16, 8); for (let y = 3; y < 13; y++) for (let x = 4; x < 12; x++) if (Math.hypot(x - 7.5, y - 7.5) < 3.4) p.set(x, y, NB[Math.hypot(x - 7.5, y - 7.5) < 2 ? 1 : 3]); });
  addTile('smooth_quartz', p => pNatural(p, QZ, { cracks: 0, grain: 0.05, contrast: 0.4 }));
  addTile('chiseled_quartz_block', p => pChiseled(p, QZ));
  addTile('cut_red_sandstone', p => pTiles(p, RS, H('#7a3410'), 16));
  addTile('chiseled_red_sandstone', p => pChiseled(p, RS));
  addTile('purpur_pillar', p => pPillarSide(p, PU));
  addTile('purpur_pillar_top', p => pRings(p, PU));
  addTile('cracked_slate_bricks', p => { pBricks(p, SL, H('#1a1c22'), 8, 4, { offset: 4 }); crackOver(p, H('#101216')); });
  addTile('cracked_slate_tiles', p => { pTiles(p, SL, H('#1a1c22'), 4); crackOver(p, H('#101216')); });
  addTile('chiseled_slate', p => pChiseled(p, SL));
  addTile('desert_cobble', p => pCobble(p, DS, H('#4a2e1a'), 8));
  addTile('desert_stone_block', p => pBricks(p, DS, H('#5a3a26'), 8, 8, { offset: 0 }));
  addTile('desert_sandstone', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const band = y < 3 ? 0.75 : y === 3 ? 0.3 : y % 5 === 2 ? 0.38 : 0.55; p.set(x, y, pick(DSS, clamp(band + (p.rand() - 0.5) * 0.12, 0, 0.999))); } });
  addTile('desert_sandstone_top', p => pSand(p, DSS));
  addTile('desert_sandstone_bricks', p => pBricks(p, DSS, H('#8a6a48'), 8, 4));
  addTile('desert_sandstone_block', p => pBricks(p, DSS, H('#8a6a48'), 8, 8, { offset: 0 }));
  addTile('silver_sandstone', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const band = y < 3 ? 0.75 : y === 3 ? 0.3 : y % 5 === 2 ? 0.38 : 0.55; p.set(x, y, pick(SVS, clamp(band + (p.rand() - 0.5) * 0.12, 0, 0.999))); } });
  addTile('silver_sandstone_top', p => pSand(p, SVS));
  addTile('silver_sandstone_bricks', p => pBricks(p, SVS, H('#8a8c86'), 8, 4));
  addTile('silver_sandstone_block', p => pBricks(p, SVS, H('#8a8c86'), 8, 8, { offset: 0 }));
  addTile('stone_block', p => pBricks(p, ST, H('#3a3a3e'), 8, 8, { offset: 0 }));
  addTile('obsidian_bricks', p => pBricks(p, OB, H('#0a0610'), 8, 4, { offset: 4 }));
  addTile('obsidian_block', p => pBricks(p, OB, H('#0a0610'), 8, 8, { offset: 0 }));

  // ---- the nether set ----
  const NR = ramp('#6e2a2a', 7, 0.55);
  addTile('netherrack', p => { pNatural(p, NR, { cracks: 1, grain: 0.3, contrast: 1.3 }); p.speck(H('#9a3a32'), 0.08); });
  addTile('soul_sand', p => { pSand(p, ramp('#5a4234', 6, 0.45)); for (let k = 0; k < 3; k++) { const x = 2 + Math.floor(p.rand() * 11), y = 2 + Math.floor(p.rand() * 10); p.set(x, y, H('#2a1c14')); p.set(x + 2, y, H('#2a1c14')); p.set(x, y + 2, H('#2a1c14')); p.set(x + 1, y + 3, H('#2a1c14')); p.set(x + 2, y + 2, H('#2a1c14')); } });
  for (const [k, col] of [['crimson_nylium', '#9a1a24'], ['warped_nylium', '#1a8a7a']]) {
    addTile(k + '_top', p => { pNatural(p, ramp(col, 6, 0.5), { cracks: 0, contrast: 1.5 }); p.speck(shade(H(col), 1.5), 0.08); });
    addTile(k + '_side', p => pFringeSide(p, NR, H(col), { tint: false }));
  }
  addTile('shroomlight', p => { pCobble(p, ramp('#f0943a', 6, 0.45), H('#b85a1a'), 7, { mortar: 1.2 }); p.speck(H('#ffe0a0'), 0.07); });
  addTile('nether_gold_ore', p => { pNatural(p, NR, { cracks: 0, grain: 0.3 }); for (let k = 0; k < 9; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 15); p.set(x, y, H('#f6d541')); p.set(x + 1, y, H('#c8a020')); } });
  addTile('ancient_debris_side', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = 0.5 + Math.sin((x * 0.9 + Math.sin(y * 0.6) * 2)) * 0.2 + (p.rand() - 0.5) * 0.1; p.set(x, y, pick(ramp('#5e4234', 6, 0.5), clamp(v, 0, 0.999))); } frameOver(p, H('#7a5a48'), H('#2a1c14')); });
  addTile('ancient_debris_top', p => { pRings(p, ramp('#5e4234', 6, 0.5), true); });
  addTile('bone_block_side', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = 0.6 + Math.sin(x * 1.2) * 0.12 + (p.rand() - 0.5) * 0.08; p.set(x, y, pick(ramp('#e8e2c8', 6, 0.3), clamp(v, 0, 0.999))); } for (let x = 0; x < 16; x++) { p.set(x, 0, H('#c8c0a0')); p.set(x, 15, H('#a8a080')); } });
  addTile('bone_block_top', p => { pRings(p, ramp('#e8e2c8', 6, 0.3)); for (const [x, y] of [[4, 4], [11, 4], [4, 11], [11, 11]]) { p.set(x, y, H('#8a826a')); p.set(x + 1, y, H('#8a826a')); } });
  addTile('redstone_ore', p => pOre(p, ramp('#8b8c90', 7, 0.5), '#e0202a', { n: 6 }));
  addTile('redstone_block', p => { pMetal(p, ramp('#b81a1a', 7, 0.5)); p.speck(H('#ff6a5a'), 0.05); });

  // ---- sticky, bouncy, sweet ----
  addTile('slime_block', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const inner = x > 3 && x < 12 && y > 3 && y < 12; const edge = x === 0 || y === 0 || x === 15 || y === 15; p.set(x, y, edge ? H('#5ab84a') : inner ? shade(H('#4aa83a'), 0.9 + p.rand() * 0.15) : shade(H('#8ae07a'), 0.95 + p.rand() * 0.1), edge ? 230 : inner ? 220 : 160); } for (let i = 4; i < 12; i++) { p.set(i, 4, H('#3a8a2a'), 230); p.set(4, i, H('#3a8a2a'), 230); } });
  addTile('honey_block_side', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const edge = x === 0 || y === 0 || x === 15 || y === 15; p.set(x, y, edge ? H('#c8781a') : shade(H('#f0a82a'), 0.92 + p.rand() * 0.12 + (y < 4 ? 0.1 : 0)), edge ? 240 : 200); } });
  addTile('honey_block_top', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const edge = x === 0 || y === 0 || x === 15 || y === 15; const d = Math.hypot(x - 7.5, y - 7.5); p.set(x, y, edge ? H('#c8781a') : shade(H('#f8b83a'), 0.95 + (d < 4 ? 0.12 : 0) + p.rand() * 0.06), edge ? 240 : 205); } });
  const hexcomb = (p, R, dark) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const row = Math.floor(y / 4), off = (row % 2) * 2, lx = (x + off) % 4, ly = y % 4; const wall = lx === 0 || ly === 0; p.set(x, y, wall ? dark : pick(R, 0.45 + (lx === 1 || ly === 1 ? 0.25 : 0) + (p.rand() - 0.5) * 0.1)); } };
  addTile('honeycomb_block', p => hexcomb(p, ramp('#e8a02a', 6, 0.45), H('#8a5a10')));
  const straw = (p) => { const R = ramp('#d8b04a', 7, 0.45); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, clamp(0.5 + Math.sin(x * 2.3 + y * 0.4) * 0.15 + (y % 4 === 0 ? -0.25 : 0) + (p.rand() - 0.5) * 0.15, 0, 0.999))); };
  addTile('bee_nest_side', p => straw(p));
  addTile('bee_nest_top', p => { straw(p); pRings(p, ramp('#d8b04a', 6, 0.45)); for (let k = 0; k < 5; k++) p.set(4 + Math.floor(p.rand() * 8), 4 + Math.floor(p.rand() * 8), H('#5a3a10')); });
  addTile('bee_nest_bottom', p => { straw(p); for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) p.set(x, y, H('#a87a2a')); });
  addTile('bee_nest_front', p => { straw(p); for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, H('#2a1a08')); for (let x = 5; x < 11; x++) { p.set(x, 5, H('#8a5a20')); p.set(x, 10, H('#f0c860')); } });
  const PL = ramp('#b08a50', 7, 0.5);
  addTile('beehive_side', p => { pPlanks(p, PL); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#d8b04a')); p.set(x, 1, H('#b8902a')); } });
  addTile('beehive_top', p => { pPlanks(p, PL); frameOver(p, H('#d8b04a'), H('#8a6420'), 2); });
  addTile('beehive_front', p => { pPlanks(p, PL); for (let y = 7; y < 10; y++) for (let x = 5; x < 11; x++) p.set(x, y, H('#2a1a08')); for (let x = 4; x < 12; x++) { p.set(x, 6, H('#d8b04a')); p.set(x, 10, H('#d8b04a')); } });

  // ---- ground covers from Luanti and Vintage Story ----
  const DD = ramp('#a8845a', 7, 0.45), DRY = ramp('#c8b060', 6, 0.4);
  addTile('dry_dirt', p => pDirt(p, DD, { pebbles: 4 }));
  addTile('dry_grass_top', p => { pNatural(p, DRY, { cracks: 0, grain: 0.25 }); for (let k = 0; k < 16; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); p.set(x, y, H('#e8d080')); p.set(x, W16(y + 1), H('#9a8040')); } });
  addTile('dry_grass_side', p => pFringeSide(p, ramp('#7a5634', 7, 0.55), H('#c8b060'), { tint: false }));
  addTile('dry_dirt_grass_side', p => pFringeSide(p, DD, H('#c8b060'), { tint: false }));
  addTile('coniferous_litter', p => { pDirt(p, ramp('#5a3e24', 6, 0.5)); for (let k = 0; k < 30; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); const d = p.rand() < 0.5; for (let i = 0; i < 3; i++) p.set(W16(x + (d ? i : 0)), W16(y + (d ? 0 : i)), H(p.rand() < 0.5 ? '#8a5a2a' : '#6a4420')); } });
  addTile('coniferous_litter_side', p => pFringeSide(p, ramp('#7a5634', 7, 0.55), H('#6a4420'), { tint: false }));
  addTile('rainforest_litter', p => { pDirt(p, ramp('#4a3420', 6, 0.5)); for (let k = 0; k < 9; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H(p.rand() < 0.5 ? '#7a5a1a' : '#5a6a1a'), 0.3); });
  addTile('rainforest_litter_side', p => pFringeSide(p, ramp('#7a5634', 7, 0.55), H('#6a5a1a'), { tint: false }));
  addTile('desert_sand', p => pSand(p, ramp('#d89a5a', 6, 0.35)));
  addTile('peat', p => { pDirt(p, ramp('#3a2a1e', 6, 0.5), { clods: 3 }); for (let k = 0; k < 14; k++) { let x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); for (let i = 0; i < 4; i++) { p.set(W16(x), W16(y), H('#5a4630')); x++; } } });
  addTile('budding_amethyst', p => { pGemBlock(p, ramp('#9a6ad0', 7, 0.5)); for (let k = 0; k < 6; k++) { const x = 2 + Math.floor(p.rand() * 12), y = 2 + Math.floor(p.rand() * 12); p.set(x, y, H('#2a1a4a')); p.set(x + 1, y, H('#d8b8ff')); } });
  addTile('copper_grate', p => { const R = ramp('#c87050', 6, 0.45); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const hole = (x % 4 === 1 || x % 4 === 2) && (y % 4 === 1 || y % 4 === 2) && x > 0 && x < 15 && y > 0 && y < 15; if (hole) p.set(x, y, [0, 0, 0], 0); else p.set(x, y, pick(R, 0.5 + (x === 0 || y === 0 ? 0.3 : x === 15 || y === 15 ? -0.3 : 0) + (p.rand() - 0.5) * 0.08)); } });
  addTile('chiseled_copper', p => { pChiseled(p, ramp('#c87050', 7, 0.45)); });
  for (const [k, col, edge] of [['ochre', '#f2d47a', '#c8963a'], ['verdant', '#c8e88a', '#6aa04a'], ['pearlescent', '#f2dce8', '#c89ab8']]) {
    addTile(k + '_froglight_side', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = Math.sin(x * 0.8) * 0.06 + Math.sin(y * 0.5 + x * 0.3) * 0.05; p.set(x, y, shade(H(col), 1 + v + (p.rand() - 0.5) * 0.05)); } frameOver(p, shade(H(col), 1.08), H(edge)); });
    addTile(k + '_froglight_top', p => { pRings(p, ramp(col, 6, 0.3)); frameOver(p, shade(H(col), 1.08), H(edge)); });
  }
  addTile('pebble', p => pNatural(p, ramp('#8a8680', 6, 0.5), { cracks: 0 }));

  // ---- work stations ----
  const DK = ramp('#5e4428', 7, 0.5), IRON = ramp('#9a9aa4', 6, 0.5), DIRT = ramp('#7a5634', 7, 0.55);
  addTile('jukebox_side', p => { pPlanks(p, ramp('#7a4a2a', 7, 0.5)); frameOver(p, DK[4], DK[0], 2); });
  addTile('jukebox_top', p => { pPlanks(p, ramp('#7a4a2a', 7, 0.5)); frameOver(p, DK[4], DK[0], 2); for (let x = 3; x < 13; x++) { p.set(x, 7, H('#141014')); p.set(x, 8, H('#2a2228')); } });
  const EC = ramp('#1e2a2a', 7, 0.6);
  addTile('ender_chest_side', p => { pCobble(p, EC, H('#0a1010'), 8); for (let x = 1; x < 15; x++) { p.set(x, 5, H('#3a5a5a')); p.set(x, 6, H('#0a1414')); } });
  addTile('ender_chest_top', p => { pCobble(p, EC, H('#0a1010'), 8); frameOver(p, H('#3a5a5a'), H('#0a1414')); });
  addTile('ender_chest_front', p => { pCobble(p, EC, H('#0a1010'), 8); for (let x = 1; x < 15; x++) { p.set(x, 5, H('#3a5a5a')); p.set(x, 6, H('#0a1414')); } for (let y = 4; y < 9; y++) for (let x = 6; x < 10; x++) p.set(x, y, H(y === 6 && (x === 7 || x === 8) ? '#40ff9a' : '#2a8a6a')); });
  addTile('smithing_table_top', p => { pMetal(p, ramp('#3a3a42', 6, 0.5)); for (let x = 2; x < 14; x++) { p.set(x, 5, IRON[3]); p.set(x, 10, IRON[3]); } });
  addTile('smithing_table_bottom', p => pPlanks(p, DK));
  addTile('smithing_table_side', p => { pPlanks(p, DK); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#2a2a30')); p.set(x, 1, H('#4a4a54')); p.set(x, 2, H('#2a2a30')); } });
  addTile('smithing_table_front', p => { pPlanks(p, DK); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#2a2a30')); p.set(x, 1, H('#4a4a54')); p.set(x, 2, H('#2a2a30')); } for (let y = 6; y < 12; y++) { p.set(4, y, IRON[4]); p.set(11, y, IRON[4]); } for (let x = 4; x < 12; x++) p.set(x, 8, IRON[2]); });
  addTile('loom_top', p => { pPlanks(p, PL); for (let y = 2; y < 14; y++) for (let x = 3; x < 13; x++) p.set(x, y, (x + y) % 2 ? H('#e8e2d4') : H('#c8c0b0')); });
  addTile('loom_bottom', p => pPlanks(p, PL));
  addTile('loom_side', p => { pPlanks(p, PL); for (let y = 3; y < 13; y++) { p.set(3, y, DK[1]); p.set(12, y, DK[1]); } });
  addTile('loom_front', p => { pPlanks(p, PL); for (let y = 3; y < 12; y++) for (let x = 3; x < 13; x++) p.set(x, y, x % 2 ? H('#e8e2d4') : H('#b8b0a0')); for (let x = 2; x < 14; x++) p.set(x, 12, DK[0]); });
  addTile('cartography_table_top', p => { pPlanks(p, DK); for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) p.set(x, y, shade(H('#e8dcb8'), 0.95 + p.rand() * 0.08)); for (let k = 0; k < 10; k++) p.set(3 + Math.floor(p.rand() * 10), 3 + Math.floor(p.rand() * 10), H(p.rand() < 0.5 ? '#3a7a3a' : '#3a5aa8')); for (let i = 3; i < 13; i++) p.set(i, 9 + Math.round(Math.sin(i) * 1.5), H('#5a4030')); });
  addTile('cartography_table_side', p => { pPlanks(p, DK); for (let x = 0; x < 16; x++) p.set(x, 1, H('#e8dcb8')); });
  addTile('cartography_table_front', p => { pPlanks(p, DK); for (let x = 0; x < 16; x++) p.set(x, 1, H('#e8dcb8')); for (let y = 5; y < 12; y++) for (let x = 4; x < 12; x++) p.set(x, y, shade(H('#e8dcb8'), 0.9)); });
  addTile('fletching_table_top', p => { pPlanks(p, ramp('#c8b080', 7, 0.4)); for (let i = 3; i < 13; i++) { p.set(i, i, H('#4a3420')); p.set(i, 16 - i, H('#4a3420')); } });
  addTile('fletching_table_side', p => { pPlanks(p, ramp('#c8b080', 7, 0.4)); frameOver(p, H('#e0cca0'), H('#6a5a3a')); });
  addTile('fletching_table_front', p => { pPlanks(p, ramp('#c8b080', 7, 0.4)); frameOver(p, H('#e0cca0'), H('#6a5a3a')); p.art(['................', '................', '................', '...........ww...', '..........wwf...', '.........wsf....', '........s.......', '.......s........', '......s.........', '.....s..........', '....s...........', '...g............', '..gg............', '................', '................', '................'], { w: H('#f2f2f2'), f: H('#d8d8d8'), s: H('#6a4a26'), g: H('#3a3a3a') }); });
  addTile('dirt_path_top', p => { pDirt(p, ramp('#9a7a48', 6, 0.4), { pebbles: 6 }); });
  addTile('dirt_path_side', p => { pDirt(p, DIRT); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#9a7a48')); p.set(x, 1, H('#8a6a3a')); } });
  addTile('composter_side', p => { pPlanks(p, PL, { nails: false }); for (let y = 0; y < 16; y++) { p.set(0, y, DK[1]); p.set(15, y, DK[0]); } });
  addTile('composter_top', p => { pPlanks(p, PL, { nails: false }); });
  addTile('composter_bottom', p => pPlanks(p, DK, { nails: false }));
  addTile('compost', p => { pDirt(p, ramp('#5a4a2a', 6, 0.5)); for (let k = 0; k < 12; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H(p.rand() < 0.5 ? '#6a8a2a' : '#8a6a2a')); });
  addTile('compost_ready', p => { pDirt(p, ramp('#5a4a2a', 6, 0.5)); for (let k = 0; k < 22; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#f2ece2')); });
  addTile('lectern_base', p => { pPlanks(p, PL); frameOver(p, PL[5], PL[0]); });
  addTile('lectern_side', p => { pPlanks(p, PL, { nails: false }); for (let y = 0; y < 16; y++) { p.set(0, y, PL[1]); p.set(15, y, PL[0]); } });
  addTile('lectern_top', p => { pPlanks(p, PL); frameOver(p, PL[5], PL[0], 2); });
  const AN = ramp('#45454c', 7, 0.55);
  addTile('anvil', p => pMetal(p, AN));
  addTile('anvil_top', p => { pMetal(p, AN); for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) p.set(x, y, pick(AN, 0.55 + (p.rand() - 0.5) * 0.08)); });
  addTile('chipped_anvil_top', p => { pMetal(p, AN); crackOver(p, H('#202024'), 1); });
  addTile('damaged_anvil_top', p => { pMetal(p, AN); crackOver(p, H('#202024'), 3); });
  addTile('grindstone_round', p => { pNatural(p, ramp('#9a9a9e', 6, 0.35), { cracks: 0 }); for (let x = 0; x < 16; x++) if (x % 3 === 0) for (let y = 0; y < 16; y++) p.set(x, y, H('#7a7a7e')); });
  addTile('grindstone_side', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); p.set(x, y, pick(ramp('#9a9a9e', 6, 0.4), clamp(0.5 + Math.sin(d * 1.4) * 0.12 + (d < 2 ? -0.3 : 0) + (p.rand() - 0.5) * 0.06, 0, 0.999))); } });
  addTile('grindstone_leg', p => pPlanks(p, DK, { nails: false }));
  addTile('grindstone_pivot', p => pMetal(p, IRON));
  addTile('decorated_pot_side', p => { const R = ramp('#a85a3c', 6, 0.4); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, clamp(0.5 + (p.rand() - 0.5) * 0.08, 0, 0.999))); p.art(['................', '................', '................', '................', '...kk......kk...', '..k..k....k..k..', '..k..kkkkkk..k..', '...kk......kk...', '................', '.....kkkkkk.....', '....k......k....', '....k.kkkk.k....', '....k......k....', '.....kkkkkk.....', '................', '................'], { k: H('#3a1a10') }); });
  addTile('decorated_pot_top', p => pRings(p, ramp('#a85a3c', 6, 0.4)));
  addTile('decorated_pot_neck', p => { const R = ramp('#a85a3c', 6, 0.4); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, 0.4 + (p.rand() - 0.5) * 0.1)); });
  addTile('end_rod', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#f4f0ff'), 0.9 + (x % 4 === 1 ? 0.1 : 0) + p.rand() * 0.06)); });
  addTile('lightning_rod', p => pMetal(p, ramp('#d07a52', 6, 0.45)));
  addTile('item_frame', p => { pPlanks(p, PL, { nails: false }); for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) p.set(x, y, shade(H('#a06a3c'), 0.9 + p.rand() * 0.15)); frameOver(p, PL[5], PL[0], 2); });
  addTile('glow_item_frame', p => { pPlanks(p, ramp('#5a8a8a', 7, 0.4), { nails: false }); for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) p.set(x, y, shade(H('#3a6a6a'), 0.9 + p.rand() * 0.15)); frameOver(p, H('#9af0e0'), H('#2a5a5a'), 2); });
  addTile('cake_top', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#f6f0ea'), 0.94 + p.rand() * 0.08)); for (let k = 0; k < 7; k++) { const x = 2 + Math.floor(p.rand() * 12), y = 2 + Math.floor(p.rand() * 12); p.set(x, y, H('#d8202a')); p.set(x + 1, y, H('#ff5a5a')); } });
  addTile('cake_side', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y < 9 ? shade(H('#f6f0ea'), 0.95 + p.rand() * 0.06) : y < 11 ? H('#d8202a') : shade(H('#c88a4a'), 0.9 + p.rand() * 0.15)); for (let x = 0; x < 16; x += 2) p.set(x, 9 - (x % 4 === 0 ? 1 : 0), H('#f6f0ea')); });
  addTile('cake_bottom', p => pPlanks(p, ramp('#c88a4a', 6, 0.4), { nails: false }));
  // candles: plain and in every colour, and the little flame on the wick
  addTile('candle', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#efe2b8'), 0.9 + (x % 2 ? 0.08 : 0) + p.rand() * 0.05)); });
  for (const [c, , hex] of COLORS) addTile(c + '_candle', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H(hex), 0.9 + (x % 2 ? 0.1 : 0) + p.rand() * 0.05)); });
  addAnim('candle_flame', 4, 6, (p, f) => { const pts = [[7, 15], [8, 15], [7, 14], [8, 14], [7, 13], [8, 13], [7, 12], [7 + (f % 2), 11], [7 + ((f >> 1) % 2), 10]]; pts.forEach(([x, y], i) => p.set(x, y, H(i < 2 ? '#ff9a1c' : i < 6 ? '#ffd34a' : '#fff6c8'))); p.set(7, 16 - 1, H('#2a2020')); });
  addTile('sea_pickle', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#6a8a2a'), 0.85 + (x % 3 === 0 ? 0.2 : 0) + p.rand() * 0.1)); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#c8e070')); p.set(x, 1, H('#a8c050')); } });
  for (let s = 0; s < 3; s++) addTile('cocoa_stage' + s, p => { const R = ramp(s < 2 ? '#8aa02a' : '#a8622a', 6, 0.45); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, clamp(0.5 + (x % 3 === 0 ? -0.25 : 0.05) + (p.rand() - 0.5) * 0.1, 0, 0.999))); });
  addTile('pink_petals', p => { for (let k = 0; k < 9; k++) { const cx = 2 + Math.floor(p.rand() * 12), cy = 2 + Math.floor(p.rand() * 12); for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) p.set(cx + dx, cy + dy, H(p.rand() < 0.5 ? '#f2a0c8' : '#e888b8')); p.set(cx, cy, H('#f8e080')); } for (let k = 0; k < 6; k++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); if (!p.alpha(x, y)) p.set(x, y, H('#4a8a2a')); } });
  addTile('glow_lichen', p => { for (let k = 0; k < 7; k++) p.blob(2 + Math.floor(p.rand() * 12), 2 + Math.floor(p.rand() * 12), 2, H('#6ab8a0'), 0.3); p.speck(H('#c8fff0'), 0.03); });

  // ---- crossed plants ----
  const G = H('#3d7a2a');
  addTile('crimson_roots', p => blades(p, ramp('#9a1a2a', 4, 0.5), 7, 5, 11, { wander: 0.3 }));
  addTile('warped_roots', p => blades(p, ramp('#1a8a7a', 4, 0.5), 7, 5, 11, { wander: 0.3 }));
  addTile('nether_sprouts', p => blades(p, ramp('#1aa08a', 4, 0.5), 10, 2, 5, { wander: 0.4 }));
  addTile('weeping_vines', p => strands(p, ramp('#a01a2a', 4, 0.5), 4, 12, 16));
  addTile('twisting_vines', p => blades(p, ramp('#1a9a8a', 4, 0.5), 4, 13, 16, { wander: 0.4 }));
  addTile('hanging_roots', p => strands(p, ramp('#a87a5a', 4, 0.45), 6, 6, 12));
  addTile('spore_blossom', p => { for (let a = 0; a < 6; a++) for (let r = 0; r < 6; r++) p.set(Math.round(7.5 + Math.cos(a) * r), Math.round(3 + Math.sin(a) * r * 0.4 + r * 0.3), H(r < 2 ? '#f8b8d8' : '#d870a8')); for (let y = 6; y < 16; y += 3) p.set(7 + (y % 2), y, H('#d870a8'), 160); });
  addTile('cave_vines', p => strands(p, ramp('#3a7a2a', 4, 0.5), 4, 16, 16));
  addTile('cave_vines_lit', p => strands(p, ramp('#3a7a2a', 4, 0.5), 4, 16, 16, { chance: 0.18, col: '#ffb82a' }));
  addTile('torchflower', p => { stem(p, 7, 8, 15, G); for (const [dx, dy, c] of [[0, -2, '#ffe060'], [-1, -1, '#ff8a2a'], [1, -1, '#ff8a2a'], [0, -1, '#ffb83a'], [-2, 0, '#e8501c'], [2, 0, '#e8501c'], [0, 0, '#ffd03a'], [-1, 0, '#ff8a2a'], [1, 0, '#ff8a2a']]) p.set(7 + dx, 7 + dy, H(c)); });
  addTile('dry_grass', p => blades(p, ramp('#c8a85a', 4, 0.45), 9, 4, 12));
  addTile('marram_grass', p => blades(p, ramp('#8aa86a', 4, 0.45), 10, 7, 15, { wander: 0.1 }));
  addTile('jungle_grass', p => { for (let b = 0; b < 7; b++) { let x = 2 + Math.floor(p.rand() * 12); for (let y = 15; y > 2; y--) { p.set(x, y, grey(0.45 + p.rand() * 0.35), TINTA); p.set(clamp(x + 1, 0, 15), y, grey(0.6), TINTA); if (p.rand() < 0.25) x = clamp(x + (p.rand() < 0.5 ? -1 : 1), 0, 14); } } }, 0, 'grass');
  const bushy = (p, flowers) => { stem(p, 7, 10, 15, H('#6a4a2a')); p.blob(7, 7, 5, H('#4a7a2a'), 0.4); p.blob(4, 8, 3, H('#5a8a32'), 0.3); p.blob(11, 8, 3, H('#3e6a24'), 0.3); if (flowers) for (let k = 0; k < 7; k++) p.set(3 + Math.floor(p.rand() * 10), 3 + Math.floor(p.rand() * 8), H('#d870c8')); };
  addTile('azalea', p => bushy(p, false));
  addTile('flowering_azalea', p => bushy(p, true));
  const bud = (p, h) => { const R = ramp('#a070e0', 4, 0.5); for (const [x, hh] of [[6, h], [9, h - 1], [7, h + 1]]) for (let y = 15; y > 15 - hh; y--) { p.set(x, y, R[2]); p.set(x + 1, y, R[1]); } };
  addTile('small_amethyst_bud', p => bud(p, 3));
  addTile('medium_amethyst_bud', p => bud(p, 5));
  addTile('large_amethyst_bud', p => bud(p, 8));
  const drip = (p, down) => { const R = ramp('#86684e', 5, 0.45); for (let y = 0; y < 16; y++) { const w = Math.max(0, Math.round((down ? 15 - y : y) / 4)); for (let x = 7 - w; x <= 8 + w; x++) p.set(x, y, R[clamp(2 + (x < 8 ? 1 : -1), 0, 4)]); } };
  addTile('pointed_dripstone', p => drip(p, false));
  addTile('pointed_dripstone_down', p => drip(p, true));
  for (const [c, hex] of [['tube', '#3a5ad8'], ['brain', '#d85aa0'], ['bubble', '#a03ad0'], ['fire', '#d83a3a'], ['horn', '#e8c83a']])
    addTile(c + '_coral_fan', p => { const R = ramp(hex, 4, 0.45); for (let a = -3; a <= 3; a++) { let x = 7.5, y = 15; for (let r = 0; r < 9; r++) { p.set(Math.round(x), Math.round(y), R[1 + (r % 3)]); x += a * 0.28; y -= 1; } } });
  addTile('cattail_lower', p => { for (const x of [5, 9]) stem(p, x, 0, 15, H('#5a8a3a')); blades(p, ramp('#4a7a2a', 3, 0.4), 4, 6, 12); });
  addTile('cattail_upper', p => { for (const x of [5, 9]) { stem(p, x, 4, 15, H('#5a8a3a')); for (let y = 5; y < 11; y++) { p.set(x, y, H('#6a3a1a')); p.set(x + 1, y, H('#4a2810')); } p.set(x, 2, H('#8a9a5a')); p.set(x, 3, H('#8a9a5a')); } });
  addTile('pitcher_plant_lower', p => { stem(p, 7, 0, 15, G); p.blob(7, 10, 4, H('#3a7a5a'), 0.3); });
  addTile('pitcher_plant_upper', p => { stem(p, 7, 8, 15, G); for (let y = 2; y < 10; y++) for (let x = 5; x < 11; x++) p.set(x, y, H(y < 4 ? '#6a2a8a' : (x + y) % 3 ? '#4a8aa0' : '#3a6a8a')); });
  // crops
  for (let s = 0; s < 4; s++) addTile('nether_wart_stage' + s, p => { const R = ramp('#9a1a2a', 4, 0.5); for (let b = 0; b < 4; b++) { const x = 2 + b * 4, h = 2 + s * 3; for (let y = 15; y > 15 - h; y--) p.set(x, y, R[1]); if (s > 0) p.blob(x, 15 - h, Math.min(2, s), R[2 + (s > 2 ? 1 : 0)], 0.2); } });
  for (const [k, fruit] of [['pumpkin_stem', '#d8781e'], ['melon_stem', '#5a8a24']]) for (let s = 0; s < 8; s++) addTile(k + '_stage' + s, p => { const h = 3 + s * 1.5, col = s === 7 ? H('#a89a3a') : G; for (let y = 15; y > 15 - h; y--) { p.set(7, y, col); if (y % 3 === 0) p.set(8, y, shade(col, 1.2)); } if (s >= 6) { p.set(6, Math.round(15 - h), H(fruit)); p.set(8, Math.round(16 - h), H(fruit)); } });
}

// ---- farm animals ----------------------------------------------------------------------
function paintAnimalTextures() {
  const H = hexRGB;
  addTile('cow_hide', p => { p.noise(H('#4a3424'), 0.15); for (let k = 0; k < 5; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 2 + Math.floor(p.rand() * 2), H('#e8e2d8'), 0.08); });
  addTile('cow_face', p => { p.noise(H('#4a3424'), 0.12); p.blob(8, 7, 3, H('#e8e2d8'), 0.06); p.art(['................', '................', '................', '................', '...wk......kw...', '................', '................', '................', '................', '....pppppppp....', '....pPkPPkPp....', '....pPPPPPPp....', '....pppppppp....', '................', '................', '................'], { w: H('#f2f2f2'), k: H('#141414'), p: H('#b8888a'), P: H('#d8a8a8') }); });
  addTile('cow_horn', p => p.noise(H('#e8e0c8'), 0.1));
  addTile('pig_skin', p => { p.noise(H('#f0a8a8'), 0.08); p.speck(H('#d88888'), 0.06); });
  addTile('pig_face', p => { p.noise(H('#f0a8a8'), 0.06); p.art(['................', '................', '................', '................', '...wk......kw...', '................', '................', '.....pppppp.....', '.....pkppkp.....', '.....pppppp.....', '................', '................', '................', '................', '................', '................'], { w: H('#f2f2f2'), k: H('#5a2a2a'), p: H('#e88a94') }); });
  addTile('sheep_wool', p => pWool(p, '#ece8e0'));
  addTile('sheep_skin', p => p.noise(H('#d8cca8'), 0.08));
  addTile('sheep_face', p => { p.noise(H('#d8cca8'), 0.06); p.art(['................', '................', '................', '................', '................', '...wk......kw...', '................', '................', '................', '......pppp......', '......pkkp......', '................', '................', '................', '................', '................'], { w: H('#f2f2f2'), k: H('#3a2a2a'), p: H('#e8b8b0') }); });
  addTile('chicken_feather', p => { p.noise(H('#f4f2ec'), 0.06); p.speck(H('#d8d4c8'), 0.1); });
  addTile('chicken_face', p => { p.noise(H('#f4f2ec'), 0.05); p.art(['................', '................', '................', '................', '...k........k...', '................', '................', '.....oooooo.....', '.....oooooo.....', '......rrrr......', '......rrrr......', '................', '................', '................', '................', '................'], { k: H('#141414'), o: H('#f0a020'), r: H('#d8202a') }); });
  addTile('chicken_beak', p => p.noise(H('#f0a020'), 0.06));
  addTile('chicken_legs', p => p.noise(H('#e8a020'), 0.06));
  addTile('heart_particle', p => p.art(['................', '................', '................', '...aaa....aaa...', '..aRRRa..aRRRa..', '.aRLLRRaaRRRRRa.', '.aRLRRRRRRRRRRa.', '.aRRRRRRRRRRRRa.', '..aRRRRRRRRRRa..', '...aRRRRRRRRa...', '....aRRRRRRa....', '.....aRRRRa.....', '......aRRa......', '.......aa.......', '................', '................'], { a: H('#5a0a14'), R: H('#e8303a'), L: H('#ff9a9a') }));
  addTile('arrow_tex', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#8a6438'), 0.9 + p.rand() * 0.15)); });
}

// ---- the new items ------------------------------------------------------------------------
function paintDokuItems2() {
  const H = hexRGB;
  const I = (name, rows, pal) => addItem(name, p => p.art(rows, pal));
  const lump = (c, d, l) => ({ A: H(c), a: H(d), L: H(l) });
  I('bamboo_item', ['................', '..............G.', '............GGg.', '...........sSG..', '..........sSs...', '.........kSs....', '........sSs.....', '.......sSk......', '......sSs.......', '.....sSs........', '....kSs.........', '...sSs..........', '..sSs...........', '.sSs............', '................', '................'], { s: H('#4a7a1a'), S: H('#7ab03a'), k: H('#d8c060'), G: H('#5aa03a'), g: H('#3a7a2a') });
  I('sea_pickle_item', ['................', '................', '................', '.....LL...LL....', '.....GG...GG....', '....gGGg.gGGg...', '....gGGg.gGGg...', '....gGGg.gGGg...', '....gGGg.gGGg...', '....gGGg.gGGg...', '.....gg...gg....', '................', '................', '................', '................', '................'], { L: H('#d8f080'), G: H('#7a9a2a'), g: H('#4a6a1a') });
  I('cake_item', ['................', '................', '................', '................', '....WWWWWWWW....', '...WWrWWWWrWW...', '..WWWWWWWrWWWW..', '..aWWWWWWWWWWa..', '..aRRRRRRRRRRa..', '..aBBBBBBBBBBa..', '..aBBBBBBBBBBa..', '...aaaaaaaaaa...', '................', '................', '................', '................'], { W: H('#f6f0ea'), r: H('#d8202a'), R: H('#d8202a'), B: H('#c88a4a'), a: H('#7a4a24') });
  const candleArt = ['................', '................', '.......f........', '.......F........', '.......k........', '......AAL.......', '......AAL.......', '......AAL.......', '......AAL.......', '......AAL.......', '......AAL.......', '......aaa.......', '................', '................', '................', '................'];
  I('candle_item', candleArt, { f: H('#ffd34a'), F: H('#ff9a1c'), k: H('#2a2020'), A: H('#efe2b8'), L: H('#fff6dc'), a: H('#b8a880') });
  for (const [c, , hex] of COLORS) I(c + '_candle_item', candleArt, { f: H('#ffd34a'), F: H('#ff9a1c'), k: H('#2a2020'), A: H(hex), L: shade(H(hex), 1.3), a: shade(H(hex), 0.6) });
  const frameArt = ['................', '..PPPPPPPPPPPP..', '..PpppppppppPP..', '..PpLLLLLLLLpP..', '..PpLLLLLLLLpP..', '..PpLLLLLLLLpP..', '..PpLLLLLLLLpP..', '..PpLLLLLLLLpP..', '..PpLLLLLLLLpP..', '..PpLLLLLLLLpP..', '..PpLLLLLLLLpP..', '..PpppppppppPP..', '..PPPPPPPPPPPP..', '................', '................', '................'];
  I('item_frame_item', frameArt, { P: H('#8a6438'), p: H('#b08a50'), L: H('#a06a3c') });
  I('glow_item_frame_item', frameArt, { P: H('#3a7a7a'), p: H('#9af0e0'), L: H('#3a6a6a') });
  I('nether_wart_item', ['................', '................', '................', '................', '......aAAa......', '.....aALAAa.....', '....aAAAAAAa....', '....aAALAAAa....', '.....aAAAAa.....', '......aGGa......', '.......GG.......', '.......G........', '................', '................', '................', '................'], { A: H('#b81a2a'), a: H('#6a0a14'), L: H('#ff5a6a'), G: H('#6a3a2a') });
  for (const [k, c, d, l] of [['beef', '#c83a3a', '#7a1a1a', '#f08080'], ['cooked_beef', '#7a4224', '#4a2412', '#a86a3e'], ['porkchop', '#f0a0a0', '#b86a6a', '#ffd0d0'], ['cooked_porkchop', '#c88a4a', '#7a4a20', '#e8b878'],
    ['mutton', '#d84a4a', '#8a2020', '#f08a8a'], ['cooked_mutton', '#8a4a2a', '#4a2412', '#b07a4a']]) I(k, ART.meat, { A: H(c), a: H(d), L: H(l), W: H('#f2ead8') });
  for (const [k, c, d, l] of [['chicken', '#f0c8b0', '#b88a70', '#fff0e0'], ['cooked_chicken', '#c88a3a', '#7a4a18', '#e8b060']])
    I(k, ['................', '................', '................', '........aAAa....', '.......aALAAa...', '......aALAAAa...', '......aAAAAAa...', '.....aAAAAAa....', '....aAAAAAa.....', '...aAAAAAa......', '..WWaAaa........', '.WW.............', '.W..............', '................', '................', '................'], { A: H(c), a: H(d), L: H(l), W: H('#f2ead8') });
  I('cookie', ['................', '................', '................', '................', '.....aaaaaa.....', '....aAAkAAAa....', '...aAAAAAAkAa...', '...aAkAAAAAAa...', '...aAAAAkAAAa...', '...aAAkAAAAAa...', '....aAAAAAka....', '.....aaaaaa.....', '................', '................', '................', '................'], { A: H('#d8964a'), a: H('#8a5a24'), k: H('#3a2010') });
  I('glow_berries', ART.berries, { A: H('#ffb82a'), a: H('#b8701a'), L: H('#fff0a0'), s: H('#3f7a2a'), G: H('#4f9a34') });
  const bottleArt = ['................', '................', '.......cc.......', '......aWWa......', '.......WW.......', '......aWWa......', '.....aWWWWa.....', '....aWAAAAWa....', '....aAAAAAAa....', '....aAALAAAa....', '....aAAAAAAa....', '.....aAAAAa.....', '......aaaa......', '................', '................', '................'];
  I('glass_bottle', bottleArt, { a: H('#9ab8c8'), W: H('#dfeef6'), A: H('#c8dce6'), L: H('#ffffff'), c: H('#8a6438') });
  I('honey_bottle', bottleArt, { a: H('#c8781a'), W: H('#dfeef6'), A: H('#f0a82a'), L: H('#ffe08a'), c: H('#8a6438') });
  I('milk_bucket', ART.bucket, { a: H('#5a5a5a'), A: H('#a8a8a8'), L: H('#d8d8d8'), W: H('#f8f8f4') });
  I('cocoa_beans', ['................', '................', '................', '................', '.....aAa........', '....aALAa.......', '....aAAAa..aAa..', '.....aAa..aALAa.', '..........aAAAa.', '...aAa.....aAa..', '..aALAa.........', '..aAAAa.........', '...aAa..........', '................', '................', '................'], lump('#7a4224', '#3a1e10', '#a86a3e'));
  I('melon_seeds', ['................', '................', '................', '................', '.....A....A.....', '......A.A.......', '...A.....A..A...', '.....A.A........', '....A.....A.....', '.......A....A...', '...A..A.........', '.....A....A.....', '................', '................', '................', '................'], { A: H('#2a2a1a') });
  I('bone', ['................', '................', '.............ww.', '............wWWw', '...........wWWw.', '..........wWw...', '.........wWw....', '........wWw.....', '.......wWw......', '......wWw.......', '.....wWw........', '...wwWw.........', '..wWWw..........', '..wWw...........', '...w............', '................'], { w: H('#c8c0a8'), W: H('#f2ecd8') });
  I('bone_meal', ART.clay, lump('#f2f0e8', '#b8b4a8', '#ffffff'));
  I('feather', ['................', '............wW..', '...........wWW..', '..........wWWw..', '.........wWWw...', '........wWWw....', '.......wWWw.....', '......wWWw......', '.....wWWw.......', '....wWWw........', '....wWw.........', '...sw...........', '..s.............', '.s..............', '................', '................'], { w: H('#c8c8c8'), W: H('#f8f8f8'), s: H('#a8a8a8') });
  I('egg', ['................', '................', '................', '................', '.......aa.......', '......aLAa......', '.....aLAAAa.....', '.....aAAAAa.....', '....aAAAAAAa....', '....aAAAAAAa....', '....aAAAAAAa....', '.....aAAAAa.....', '......aaaa......', '................', '................', '................'], lump('#f0e2c8', '#b8a07a', '#ffffff'));
  I('gunpowder', ART.clay, lump('#5a5a5e', '#2a2a2e', '#8a8a90'));
  I('slime_ball', ART.clay, lump('#6ac85a', '#2a7a1a', '#b8f0a8'));
  I('honeycomb', ['................', '................', '................', '.....aAAa.......', '....aALAAa......', '....aAAAAaAAa...', '.....aAAaALAAa..', '....aAAa.aAAAa..', '...aALAAa.aAa...', '...aAAAAa.......', '....aAAa........', '................', '................', '................', '................', '................'], lump('#f0a82a', '#8a5a10', '#ffe08a'));
  I('iron_nugget', ['................', '................', '................', '................', '................', '......aAa.......', '.....aALAa......', '.....aAAAAa.....', '......aAAAa.....', '.......aaa......', '................', '................', '................', '................', '................', '................'], lump('#d6d6d6', '#8a8a8a', '#ffffff'));
  I('gold_nugget', ['................', '................', '................', '................', '................', '......aAa.......', '.....aALAa......', '.....aAAAAa.....', '......aAAAa.....', '.......aaa......', '................', '................', '................', '................', '................', '................'], lump('#f5d64a', '#b98f15', '#fff2a0'));
  I('nether_brick', ART.brick, lump('#5a2224', '#2a0a0c', '#8a3a3a'));
  I('redstone', ART.clay.map(r => r), lump('#d8202a', '#7a0a10', '#ff7a6a'));
  I('arrow', ['................', '...........LLL..', '...........LAL..', '..........sLLL..', '.........s......', '........s.......', '.......s........', '......s.........', '.....s..........', '....s...........', '..ww............', '.wWw............', '.Ww.............', '................', '................', '................'], { L: H('#5a5a60'), A: H('#c8c8d0'), s: H('#8a6438'), w: H('#c8c8c8'), W: H('#f8f8f8') });
  const bowArt = (pull) => ['................', '.............s..', '...........ssa..', '..........s..a..', '.........s...a..', '........s....a..', '.......s.....a..', '......s......a..', '.....s.......a..', '....s........a..', '...s.........a..', '..s..........a..', '..ss.......aa...', '...aaaaaaaa.....', '................', '................'].map(r => pull ? r : r);
  I('bow', bowArt(false), { s: H('#8a6438'), a: H('#e8e8e8') });
  I('compass', ['................', '................', '.....aaaaaa.....', '....aWWWWWWa....', '...aWWWrWWWWa...', '...aWWWrWWWWa...', '...aWWWrWWWWa...', '...aWWWkWWWWa...', '...aWWWbWWWWa...', '...aWWWbWWWWa...', '...aWWWWWWWWa...', '....aWWWWWWa....', '.....aaaaaa.....', '................', '................', '................'], { a: H('#5a5a64'), W: H('#d8d8e0'), r: H('#d8202a'), b: H('#3a3a44'), k: H('#141414') });
  I('clock', ['................', '................', '.....aaaaaa.....', '....aWWWWWWa....', '...aWWWkWWWWa...', '...aWWWkWWWWa...', '...aWWWkWWWWa...', '...aWWWkkkWWa...', '...aWWWWWWWWa...', '...aWWWWWWWWa...', '...aWWWWWWWWa...', '....aWWWWWWa....', '.....aaaaaa.....', '................', '................', '................'], { a: H('#b98f15'), W: H('#f5e8a0'), k: H('#3a2a10') });
  I('spyglass', ['................', '................', '...........aA...', '..........aAAa..', '.........aCCa...', '........aCCa....', '.......aCCa.....', '......aCCa......', '.....aCCa.......', '....aCCa........', '...aCCa.........', '..aCCa..........', '..aaa...........', '................', '................', '................'], { a: H('#7a3a20'), A: H('#c8a0ff'), C: H('#d07a52') });
  for (const [k, col] of [['music_disc_ember', '#e8641c'], ['music_disc_tide', '#3a8ad8'], ['music_disc_grove', '#4aa83a'], ['music_disc_sun', '#f2c83a']])
    I(k, ['................', '................', '.....kkkkkk.....', '....kKKKKKKk....', '...kKKkkkkKKk...', '...kKkCCCCkKk...', '...kKkCwwCkKk...', '...kKkCwwCkKk...', '...kKkCCCCkKk...', '...kKKkkkkKKk...', '....kKKKKKKk....', '.....kkkkkk.....', '................', '................', '................', '................'], { k: H('#141418'), K: H('#2a2a32'), C: H(col), w: H('#e8e8e8') });
}
