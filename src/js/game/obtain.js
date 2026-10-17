// ---------------------------------------------------------------------------
// game/obtain.js — 0.8.6: everything you can hold, you can get.
//
// A check of every item for a way to get it in survival turned up gaps:
// birch and spruce leaves dropped oak saplings, carrots, potatoes and nether
// wart had nowhere to come from, spiders never dropped their eyes nor ghouls
// rotten flesh, bamboo had no doors or fences, and a few decorative blocks
// had no recipe at all. (The recipes added in 0.8.3–0.8.5 — furniture, the
// saddle, the fishing rod, the ship — could not be crafted either; that was
// fixed in core/items.js, where recipes are now prepared whenever they arrive.)
// Ores, grass blocks and the like still come only from the ground, as ever.
// ---------------------------------------------------------------------------
{
  const has = (k) => !!itemDef(k);
  const add = (r) => {
    const keys = r.shape ? Object.values(r.key) : r.items;
    if (!has(r.out) || keys.some(k => !k.startsWith('#') && !has(k))) return;
    if (RECIPES.some(o => o.out === r.out && JSON.stringify(o.shape || o.items) === JSON.stringify(r.shape || r.items))) return;
    RECIPES.push(r);
  };
  // bamboo is a wood like any other
  add({ out: 'bamboo_door', n: 3, shape: ['PP', 'PP', 'PP'], key: { P: 'bamboo_planks' }, group: 'wood' });
  add({ out: 'bamboo_trapdoor', n: 2, shape: ['PPP', 'PPP'], key: { P: 'bamboo_planks' }, group: 'wood' });
  add({ out: 'bamboo_fence', n: 3, shape: ['PSP', 'PSP'], key: { P: 'bamboo_planks', S: 'stick' }, group: 'wood' });
  add({ out: 'bamboo_fence_gate', n: 1, shape: ['SPS', 'SPS'], key: { P: 'bamboo_planks', S: 'stick' }, group: 'wood' });
  add({ out: 'bamboo_sign', n: 3, shape: ['PPP', 'PPP', ' S '], key: { P: 'bamboo_planks', S: 'stick' }, group: 'wood' });
  // blocks the world doesn't grow anywhere yet
  add({ out: 'clay', n: 1, shape: ['CC', 'CC'], key: { C: 'clay_ball' } });
  add({ out: 'cobweb', n: 1, shape: ['S S', ' S ', 'S S'], key: { S: 'string' } });
  add({ out: 'red_mushroom_block', n: 1, shape: ['MM', 'MM'], key: { M: 'red_mushroom' } });
  add({ out: 'brown_mushroom_block', n: 1, shape: ['MM', 'MM'], key: { M: 'brown_mushroom' } });
  add({ out: 'mushroom_stem', n: 2, shape: ['BR', 'RB'], key: { B: 'brown_mushroom', R: 'red_mushroom' } });
  add({ out: 'red_sand', n: 4, shape: ['SS', 'SD'], key: { S: 'sand', D: 'red_dye' } });
  add({ out: 'crying_obsidian', n: 1, items: ['obsidian', 'amethyst_shard'] });
  add({ out: 'prismarine', n: 2, items: ['cobblestone', 'cobblestone', 'lapis_lazuli', 'kelp'] });
  add({ out: 'end_stone', n: 4, shape: ['SS', 'SB'], key: { S: 'sandstone', B: 'bone_meal' } });
  add({ out: 'sponge', n: 1, shape: ['WSW', 'SWS', 'WSW'], key: { W: 'wool', S: 'slime_ball' } });
  add({ out: 'amethyst_cluster', n: 1, shape: [' A ', 'AAA', ' A '], key: { A: 'amethyst_shard' } });
  add({ out: 'small_amethyst_bud', n: 1, items: ['amethyst_shard'] });
  add({ out: 'medium_amethyst_bud', n: 1, items: ['amethyst_shard', 'amethyst_shard'] });
  add({ out: 'large_amethyst_bud', n: 1, items: ['amethyst_shard', 'amethyst_shard', 'amethyst_shard'] });
  // copper ages (bone meal stands in for the years)
  add({ out: 'exposed_copper', n: 1, items: ['copper_block', 'bone_meal'] });
  add({ out: 'weathered_copper', n: 1, items: ['exposed_copper', 'bone_meal'] });
  add({ out: 'oxidized_copper', n: 1, items: ['weathered_copper', 'bone_meal'] });
  // dried out in the furnace
  if (typeof SMELTING !== 'undefined') {
    if (!SMELTING.sapling) SMELTING.sapling = 'dead_bush';
    for (const c of ['tube', 'brain', 'bubble', 'fire', 'horn']) if (has(c + '_coral_block') && !SMELTING[c + '_coral_block']) SMELTING[c + '_coral_block'] = 'dead_coral_block';
  }
  // every kind of leaves drops its own sapling
  for (const b of BLOCKS) {
    if (!b || !b.isLeaves || b.sapling) continue;
    const sp = b.key.replace(/_leaves$/, '_sapling').replace(/_needles$/, '_sapling');
    if (sp !== b.key && B[sp] !== undefined) b.sapling = sp;
  }
  // creatures drop what they always should have
  const drop = (types, d) => { for (const t of types) { const T = MOB_TYPES[t]; if (T && !(T.drops || []).some(x => x[0] === d[0])) (T.drops = T.drops || []).push(d); } };
  drop(['spider', 'cave_spider'], ['spider_eye', 1, 1, 0.34]);   // one in three, like the classic game
  drop(['ghoul', 'husk', 'drowned', 'charred_ghoul'], ['rotten_flesh', 0, 2, 1]);
  drop(['rabbit'], ['rabbit_foot', 1, 1, 0.1]);
  // wild carrots and potatoes in the grass, nether wart among the Depths' roots
  const baseDrops = Game.prototype.dropBlockItems;
  Game.prototype.dropBlockItems = function (x, y, z, id, washed, meta = 0, tool = null) {
    baseDrops.call(this, x, y, z, id, washed, meta, tool);
    if (!this.rules().blockDrops || washed) return;
    const k = BLOCKS[id] && BLOCKS[id].key, r = Math.random, shears = tool && tool.type === 'shears';
    if (!shears && (k === 'tall_grass' || k === 'fern' || k === 'tall_grass_double' || k === 'large_fern')) {
      if (r() < 0.025) this.dropItem(mkStack('carrot', 1), x + 0.5, y + 0.4, z + 0.5, true);
      else if (r() < 0.025) this.dropItem(mkStack('potato', 1), x + 0.5, y + 0.4, z + 0.5, true);
    }
    if (/^(crimson_roots|warped_roots|nether_sprouts|soul_sand|soul_soil)$/.test(k || '') && r() < 0.08 && has('nether_wart_item')) this.dropItem(mkStack('nether_wart_item', 1), x + 0.5, y + 0.6, z + 0.5, true);
  };
}
