const gen = D.makeWorldGen(12345, 0, 2), genD = D.makeWorldGen(12345, 1, 2);
const counts = {}, countsD = {};
const t0 = performance.now();
let n = 0;
for (let cz = -12; cz <= 12; cz += 3) for (let cx = -40; cx <= 40; cx += 5) {
  const ch = new D.Chunk(0, cx, cz); gen.generate(ch); n++;
  for (let i = 0; i < ch.blocks.length; i++) { const k = D.BLOCKS[ch.blocks[i]].key; counts[k] = (counts[k] || 0) + 1; }
}
const t1 = performance.now();
for (let cz = -3; cz <= 3; cz += 2) for (let cx = -3; cx <= 3; cx += 2) {
  const ch = new D.Chunk(1, cx, cz); genD.generate(ch);
  for (let i = 0; i < ch.blocks.length; i++) { const k = D.BLOCKS[ch.blocks[i]].key; countsD[k] = (countsD[k] || 0) + 1; }
}
const want = ['pine_log', 'aspen_log', 'bamboo', 'cocoa', 'bee_nest', 'dirt_with_dry_grass', 'dirt_with_coniferous_litter', 'dirt_with_rainforest_litter', 'desert_sand', 'silver_sand', 'peat', 'cattail', 'marram_grass', 'loose_stones', 'dry_grass', 'jungle_grass', 'pink_petals', 'sea_pickle', 'glow_lichen', 'hanging_roots', 'pointed_dripstone', 'moss_block', 'cave_vines', 'cave_vines_lit', 'spore_blossom', 'amethyst_block', 'budding_amethyst', 'redstone_ore', 'azalea_leaves', 'pumpkin', 'torchflower'];
const wantD = ['netherrack', 'crimson_nylium', 'warped_nylium', 'soul_sand', 'weeping_vines', 'twisting_vines', 'crimson_roots', 'warped_roots', 'nether_sprouts', 'shroomlight', 'nether_gold_ore', 'ancient_debris', 'gilded_blackstone', 'crimson_stem', 'warped_stem', 'bone_block'];
return { chunks: n, msPerChunk: +((t1 - t0) / n).toFixed(1), over: Object.fromEntries(want.map(k => [k, counts[k] || 0])), depths: Object.fromEntries(wantD.map(k => [k, countsD[k] || 0])) };
