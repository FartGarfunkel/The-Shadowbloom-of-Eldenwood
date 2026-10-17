// ---------------------------------------------------------------------------
// game/farming.js — 0.9.0.27: the kitchen garden.
//
// Seven new crops: tomatoes, onions, cabbages, corn, peppers, strawberries
// and rice. Their seeds turn up when you cut long grass, and the farmers sell
// them. Rice wants farmland beside water. A watering can (fill it at water)
// brings on the crops around where you pour. And a cook's worth of new dishes,
// some of which do you good beyond the healing: garden salad, vegetable stew,
// tomato soup, roasted corn, cooked rice and sushi, stuffed peppers,
// strawberry tarts and pizza.
// ---------------------------------------------------------------------------
const NEW_CROPS = {
  tomato_crop: { produce: 'tomato', seed: 'tomato_seeds', cols: ['#d8322a', '#7a1410'], tall: 0.85 },
  onion_crop: { produce: 'onion', cols: ['#b06a9a', '#e8d8c8'], tall: 0.5, bulb: true },
  cabbage_crop: { produce: 'cabbage', seed: 'cabbage_seeds', cols: ['#7ac04a', '#3a7a22'], tall: 0.45, head: true },
  corn_crop: { produce: 'corn', seed: 'corn_seeds', cols: ['#f0d040', '#9a8a2a'], tall: 1, cob: true },
  pepper_crop: { produce: 'pepper', seed: 'pepper_seeds', cols: ['#e0401a', '#3a8a2a'], tall: 0.7 },
  strawberry_crop: { produce: 'strawberry', cols: ['#e8283a', '#ffffff'], tall: 0.35, low: true },
  rice_crop: { produce: 'rice', cols: ['#e8d890', '#b8a050'], tall: 0.75, grain: true, wet: true },
};
// what the wild grass gives up now and then
function wildSeed() {
  const pool = ['tomato_seeds', 'cabbage_seeds', 'corn_seeds', 'pepper_seeds', 'onion', 'strawberry', 'rice'];
  const k = pool[Math.floor(Math.random() * pool.length)];
  return ITEMS[k] ? k : null;
}
{
  // the produce and the seeds
  const F = (k, o) => { if (!ITEMS[k]) defItem(k, o); };
  F('tomato', { name: 'Tomato', food: { heal: 2 } });
  F('tomato_seeds', { name: 'Tomato Seeds', block: 'tomato_crop', icon: 'tomato_seeds' });
  F('onion', { name: 'Onion', food: { heal: 1 }, plants: 'onion_crop' });
  F('cabbage', { name: 'Cabbage', food: { heal: 2 } });
  F('cabbage_seeds', { name: 'Cabbage Seeds', block: 'cabbage_crop', icon: 'cabbage_seeds' });
  F('corn', { name: 'Ear of Corn', food: { heal: 2 } });
  F('corn_seeds', { name: 'Corn Seeds', block: 'corn_crop', icon: 'corn_seeds' });
  F('pepper', { name: 'Pepper', food: { heal: 1 }, desc: 'Hot! Warms you through.' });
  F('pepper_seeds', { name: 'Pepper Seeds', block: 'pepper_crop', icon: 'pepper_seeds' });
  F('strawberry', { name: 'Strawberry', food: { heal: 2 }, plants: 'strawberry_crop' });
  F('rice', { name: 'Rice', plants: 'rice_crop', desc: 'Plant on farmland beside water. Cook it in a furnace.' });
  // the dishes (an effect is a few seconds of something good, on top of the healing)
  F('cooked_rice', { name: 'Cooked Rice', food: { heal: 4 } });
  F('roasted_corn', { name: 'Roasted Corn', food: { heal: 6 } });
  F('tomato_soup', { name: 'Tomato Soup', food: { heal: 7 }, maxStack: 1, bowl: true });
  F('garden_salad', { name: 'Garden Salad', food: { heal: 8, effect: ['regen', 6, 0] }, maxStack: 1, bowl: true, desc: 'Fresh. Keeps healing for a moment.' });
  F('vegetable_stew', { name: 'Vegetable Stew', food: { heal: 10, effect: ['regen', 10, 0] }, maxStack: 1, bowl: true, desc: 'Hearty. Keeps healing for a while.' });
  F('sushi', { name: 'Sushi', food: { heal: 5, effect: ['water', 30, 0] }, desc: 'You breathe a little longer under water after.' });
  F('stuffed_pepper', { name: 'Stuffed Pepper', food: { heal: 10, effect: ['fireres', 30, 0] }, desc: 'So hot that fire hardly touches you for a while.' });
  F('strawberry_tart', { name: 'Strawberry Tart', food: { heal: 8, effect: ['speed', 25, 0] }, desc: 'Sweet. A spring in your step after.' });
  F('pizza', { name: 'Pizza', food: { heal: 12, effect: ['strength', 20, 0] }, desc: 'A feast. You feel strong after.' });
  F('watering_can', { name: 'Watering Can', maxStack: 1, wateringCan: true, desc: 'Fill it at water, then pour it on your crops to bring them on.' });
  RECIPES.push(
    { out: 'tomato_seeds', n: 2, items: ['tomato'] },
    { out: 'cabbage_seeds', n: 2, items: ['cabbage'] },
    { out: 'corn_seeds', n: 3, items: ['corn'] },
    { out: 'pepper_seeds', n: 2, items: ['pepper'] },
    { out: 'tomato_soup', n: 1, items: ['tomato', 'tomato', 'tomato', 'bowl'] },
    { out: 'garden_salad', n: 1, items: ['cabbage', 'tomato', 'onion', 'bowl'] },
    { out: 'vegetable_stew', n: 1, items: ['potato', 'carrot', 'onion', 'cabbage', 'bowl'] },
    { out: 'sushi', n: 2, items: ['cooked_rice', 'cod', 'dried_kelp'] },
    { out: 'sushi', n: 2, items: ['cooked_rice', 'salmon', 'dried_kelp'] },
    { out: 'stuffed_pepper', n: 1, items: ['pepper', 'cooked_rice', 'cooked_beef'] },
    { out: 'strawberry_tart', n: 2, items: ['strawberry', 'strawberry', 'wheat', 'sugar', 'egg'] },
    { out: 'pizza', n: 1, items: ['bread', 'tomato', 'onion', 'pepper', 'cooked_porkchop'] },
    { out: 'watering_can', n: 1, shape: ['I  ', 'IBI', ' I '], key: { I: 'iron_ingot', B: 'bowl' } },
  );
  Object.assign(SMELTING, { rice: 'cooked_rice', corn: 'roasted_corn' });
  if (typeof NPC_SHOPS !== 'undefined') {
    NPC_SHOPS.farmer.buy.push(['tomato_seeds', 8, 1, 0], ['cabbage_seeds', 8, 1, 0], ['onion', 6, 1, 0], ['corn_seeds', 8, 1, 1], ['pepper_seeds', 6, 1, 1], ['strawberry', 6, 1, 1], ['rice', 8, 1, 1], ['watering_can', 1, 4, 1]);
    NPC_SHOPS.farmer.sell.push(['tomato', 20, 1, 0], ['cabbage', 12, 1, 0], ['corn', 16, 1, 1], ['pepper', 14, 1, 1], ['strawberry', 24, 1, 1]);
    if (NPC_SHOPS.innkeeper) NPC_SHOPS.innkeeper.buy.push(['vegetable_stew', 1, 3, 1], ['pizza', 1, 4, 2], ['strawberry_tart', 2, 3, 2]);
    if (NPC_SHOPS.butcher) NPC_SHOPS.butcher.buy.push(['stuffed_pepper', 2, 3, 2]);
  }
  if (typeof NPC_ERRANDS !== 'undefined') {
    (NPC_ERRANDS.farmer || []).push(['tomato', [8, 16], 'Tomatoes for the market. Ours caught the blight.']);
    (NPC_ERRANDS.innkeeper || []).push(['onion', [6, 12], 'Onions for the stew pot.'], ['corn', [6, 12], 'Corn for the harvest supper.']);
  }
}
// rice wants water beside its farmland
{
  const basePlant = LocalPlayer.prototype.plantItem;
  LocalPlayer.prototype.plantItem = function (def, hit, held) {
    if (def && def.plants === 'rice_crop' && hit) {
      const w = this.g.world, [x, y, z] = this.placeTarget(hit);
      const wet = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([a, b]) => T_LIQUID[w.getBlock(x + a, y - 1, z + b)] === 1);
      if (!wet && w.getBlock(x, y - 1, z) === B.farmland) { this.toast('Rice needs water right beside its farmland', ''); return true; }
    }
    return basePlant.call(this, def, hit, held);
  };
}
// the watering can
{
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const p = this.player, held = p.inv.held, d = held && itemDef(held.id);
    if (!d || !d.wateringCan || fromOff) return baseUse.call(this, repeat, inp, fromOff);
    const g = this.g, w = g.world, [dx, dy, dz] = p.look();
    const hit = raycastBlocks(w, p.x, p.y + p.eye, p.z, dx, dy, dz, REACH, true);
    if (!hit) return;
    if (T_LIQUID[hit.id] === 1) { if (!repeat) { held.water = 24; g.sfx.play('bucket'); this.toast('The can is full', ''); this.swingArm(); } return; }
    if (!(held.water > 0)) { if (!repeat) this.toast('The can is empty: fill it at water', ''); return; }
    if ((this._canT || 0) > 0) return;
    this._canT = 0.5;
    held.water--; this.swingArm();
    let grew = 0;
    for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) for (let oy = -1; oy <= 1; oy++) {
      const x = hit.x + ox, y = hit.y + oy, z = hit.z + oz, id = w.getBlock(x, y, z), b = BLOCKS[id];
      if (b && b.crop) { const m = w.getMeta(x, y, z) & 15; if (m < b.crop.stages - 1 && Math.random() < 0.4) { w.setBlock(x, y, z, id, (w.getMeta(x, y, z) & ~15) | (m + 1)); grew++; } }
    }
    for (let i = 0; i < 16; i++) g.burst(hit.x + 0.5 + (Math.random() - 0.5) * 2.4, hit.y + 1.4, hit.z + 0.5 + (Math.random() - 0.5) * 2.4, 'water', 1, 0.6);
    g.sfx.playAt('splash_small', hit.x + 0.5, hit.y + 1, hit.z + 0.5, 12);
    if (grew && typeof skillGain === 'function') skillGain(this, 'farming', 3 * grew);
  };
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) { if (this._canT > 0) this._canT -= dt; return baseUpd.call(this, dt, inp); };
  const baseInfo = itemInfoHTML;
  itemInfoHTML = function (s) { let h = baseInfo(s); const d = s && itemDef(s.id); if (d && d.wateringCan) h += `<div class="ts">Water: ${s.water || 0} / 24</div>`; return h; };
  const baseNorm = normalizeStack;
  normalizeStack = function (s) { const o = baseNorm(s); if (o && s && s.water > 0) o.water = Math.floor(s.water); return o; };
  const baseHas = itemHasUse;
  itemHasUse = function (d) { return !!(d && d.wateringCan) || baseHas(d); };
}
// ---- the pictures --------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB, G = H('#4a8a2a'), GL = H('#6ab040'), GD = H('#2e5a1a');
    // the crops, stage by stage
    for (const [k, C] of Object.entries(NEW_CROPS)) {
      const b = BLOCKS[B[k]]; if (!b || !b.crop) continue;
      const n = b.crop.stages, c0 = H(C.cols[0]), c1 = H(C.cols[1]);
      for (let s = 0; s < n; s++) addTile(k + '_stage' + s, p => {
        const t = (s + 1) / n, ripe = s === n - 1;
        if (C.low) {
          // strawberries: a low spread of leaves, berries under them when ripe
          for (let i = 0; i < 5 + s * 2; i++) p.blob(2 + Math.floor(p.rand() * 12), 15 - Math.floor(p.rand() * (3 + s)), 1, shade(G, 0.8 + p.rand() * 0.4), 0.2);
          if (s >= n - 2) for (let i = 0; i < (ripe ? 6 : 3); i++) { const x = 2 + Math.floor(p.rand() * 12), y = 11 + Math.floor(p.rand() * 4); p.set(x, y, ripe ? c0 : H('#f0f0e0')); p.set(x + 1, y, ripe ? shade(c0, 0.8) : H('#e0e0d0')); if (ripe) p.set(x, y - 1, GL); }
          return;
        }
        if (C.head) {
          // cabbages: a ring of leaves round a head that swells
          for (let i = 0; i < 8; i++) { const x = 1 + i * 2; for (let y = 15; y > 15 - 2 - s; y--) p.set(x, y, shade(GD, 0.9 + p.rand() * 0.3)); }
          const r = 1 + s * 1.3; p.blob(7.5, 14 - r * 0.6, r, ripe ? c0 : shade(c0, 0.85), 0.25);
          if (ripe) for (let i = 0; i < 4; i++) p.set(5 + i * 2, Math.round(14 - r * 0.9), shade(c0, 1.2));
          return;
        }
        // the rest: stalks, then fruit, ears or bulbs
        const stalks = C.grain ? 7 : C.cob ? 3 : 5, h = Math.max(2, Math.round(t * 15 * C.tall));
        for (let i = 0; i < stalks; i++) {
          const x = 1 + Math.floor(i * (14 / stalks)) + Math.floor(p.rand() * 2);
          for (let y = 15; y > 15 - h; y--) p.set(x, y, shade(C.grain && ripe ? H('#c8b860') : G, 0.85 + p.rand() * 0.3));
          if (C.cob) { for (let y = 15 - h + 2; y < 15; y += 3) { p.set(x - 1, y, GL); p.set(x + 1, y + 1, GL); } if (s >= n - 2) for (let y = 15 - Math.round(h * 0.7); y < 15 - Math.round(h * 0.7) + 3; y++) { p.set(x + 1, y, ripe ? c0 : H('#c8d870')); } }
          else if (C.grain) { if (s >= n - 2) { p.set(x, 15 - h, c0); p.set(x + 1, 16 - h, c0); p.set(x, 16 - h, shade(c0, 0.85)); } }
          else if (C.bulb) { if (ripe) { p.set(x, 15, c0); p.set(x + 1, 15, c0); p.set(x, 14, shade(c0, 1.15)); } }
          else { p.set(x - 1, 15 - Math.round(h * 0.5), GL); p.set(x + 1, 15 - Math.round(h * 0.7), GL); if (s >= n - 2) { const y = 15 - Math.round(h * 0.55); p.set(x + 1, y, ripe ? c0 : H('#7ab040')); p.set(x + 1, y + 1, ripe ? shade(c0, 0.8) : H('#6aa030')); if (ripe && C.produce === 'tomato') p.set(x - 1, y + 2, c0); } }
        }
      });
    }
    // the produce and the seeds
    const fruit = (p, c, r, top) => { p.blob(7.5, 9, r, c, 0.12); p.set(6, 7, shade(c, 1.4)); p.set(7, 6, shade(c, 1.25)); if (top) { p.set(7, 9 - r, GD); p.set(8, 8 - r, GL); p.set(6, 9 - r, GL); } };
    addItem('tomato', p => fruit(p, H('#d8322a'), 4.5, true));
    addItem('onion', p => { fruit(p, H('#a0607a'), 4, false); for (let y = 2; y < 6; y++) p.set(7 + (y % 2), y, H('#c8b090')); });
    addItem('cabbage', p => { p.blob(7.5, 9, 5, H('#7ac04a'), 0.18); for (let i = 0; i < 5; i++) p.set(5 + i, 8 + (i % 2), H('#a8e070')); p.set(7, 5, H('#a8e070')); });
    addItem('corn', p => { for (let y = 2; y < 14; y++) for (let x = 6; x < 10; x++) p.set(x, y, shade(H('#f0d040'), (x + y) % 2 ? 0.9 : 1.1)); for (let y = 6; y < 15; y++) { p.set(5, y, GL); p.set(10, y, G); } p.set(7, 14, GD); p.set(8, 15, GD); });
    addItem('roasted_corn', p => { for (let y = 2; y < 14; y++) for (let x = 6; x < 10; x++) p.set(x, y, shade(H('#d8a030'), (x + y) % 2 ? 0.8 : 1.05)); for (let i = 0; i < 6; i++) p.set(6 + Math.floor(p.rand() * 4), 3 + Math.floor(p.rand() * 10), H('#6a3a10')); });
    addItem('pepper', p => { for (let y = 4; y < 14; y++) { const w = y < 6 ? 2 : y > 11 ? 1 : 3; for (let x = 7 - Math.floor(w / 2); x < 7 - Math.floor(w / 2) + w + 1; x++) p.set(x, y, shade(H('#e0401a'), x === 7 ? 1.25 : 0.95)); } p.set(7, 3, GD); p.set(8, 2, GD); });
    addItem('strawberry', p => { p.blob(7.5, 9.5, 4, H('#e8283a'), 0.1); for (const [x, y] of [[6, 8], [9, 9], [7, 11], [8, 7], [6, 11]]) p.set(x, y, H('#f8e080')); for (let x = 5; x < 11; x++) p.set(x, 5, x % 2 ? GL : G); });
    addItem('rice', p => { for (let i = 0; i < 14; i++) { const x = 3 + Math.floor(p.rand() * 10), y = 5 + Math.floor(p.rand() * 8); p.set(x, y, H('#f4ecd0')); p.set(x + 1, y, H('#d8ccaa')); } });
    addItem('cooked_rice', p => { p.blob(7.5, 9, 5, H('#fafaf0'), 0.06); for (let x = 3; x < 13; x++) { p.set(x, 13, H('#8a5a3a')); p.set(x, 14, H('#6a4028')); } });
    const seeds = (p, c) => { for (let i = 0; i < 7; i++) { const x = 4 + Math.floor(p.rand() * 8), y = 5 + Math.floor(p.rand() * 7); p.set(x, y, c); p.set(x + 1, y, shade(c, 0.75)); } };
    addItem('tomato_seeds', p => seeds(p, H('#e8d8a0')));
    addItem('cabbage_seeds', p => seeds(p, H('#6a5a3a')));
    addItem('corn_seeds', p => seeds(p, H('#f0c830')));
    addItem('pepper_seeds', p => seeds(p, H('#f0e8b0')));
    const bowl = (p, c, bits) => { for (let x = 2; x < 14; x++) { p.set(x, 9, shade(c, 1.1)); p.set(x, 10, c); } for (let y = 10; y < 14; y++) for (let x = 2 + (y - 10); x < 14 - (y - 10); x++) p.set(x, y, H(y === 10 ? '#8a5a3a' : '#6a4028')); for (const [x, y, col] of bits) p.set(x, y, H(col)); };
    addItem('tomato_soup', p => bowl(p, H('#c83020'), [[5, 9, '#f06040'], [9, 9, '#f06040']]));
    addItem('garden_salad', p => bowl(p, H('#6ab040'), [[4, 8, '#7ac04a'], [6, 8, '#d8322a'], [9, 8, '#a8e070'], [11, 9, '#a0607a'], [7, 7, '#7ac04a']]));
    addItem('vegetable_stew', p => bowl(p, H('#a8682a'), [[5, 9, '#f0841c'], [8, 9, '#c8a060'], [10, 9, '#7ac04a']]));
    addItem('sushi', p => { for (let y = 6; y < 12; y++) for (let x = 4; x < 12; x++) p.set(x, y, y < 8 ? H('#f08a6a') : H('#fafaf0')); for (let x = 4; x < 12; x++) p.set(x, 9, H('#1e3a1e')); });
    addItem('stuffed_pepper', p => { for (let y = 4; y < 14; y++) for (let x = 4; x < 12; x++) if (Math.hypot(x - 7.5, y - 9) < 5) p.set(x, y, shade(H('#d83818'), 0.9 + p.rand() * 0.2)); for (let x = 5; x < 11; x++) p.set(x, 5, H('#fafaf0')); p.set(7, 3, GD); });
    addItem('strawberry_tart', p => { for (let x = 2; x < 14; x++) for (let y = 9; y < 13; y++) p.set(x, y, H(y === 9 ? '#e8c070' : '#c89040')); for (const x of [4, 7, 10]) { p.set(x, 8, H('#e8283a')); p.set(x + 1, 8, H('#c8182a')); p.set(x, 7, H('#e8283a')); } });
    addItem('pizza', p => { for (let y = 2; y < 15; y++) for (let x = 2; x < 15; x++) { const d = Math.hypot(x - 8, y - 8); if (d < 6.5) p.set(x, y, d > 5.5 ? H('#c8903a') : H('#e8b040')); } for (const [x, y] of [[6, 6], [10, 7], [7, 10], [10, 11], [5, 9]]) { p.set(x, y, H('#b8281a')); p.set(x + 1, y, H('#981810')); } });
    addItem('watering_can', p => { for (let y = 6; y < 13; y++) for (let x = 4; x < 11; x++) p.set(x, y, shade(H('#9aa8b0'), x === 4 || y === 12 ? 0.75 : 1)); for (let i = 0; i < 4; i++) p.set(11 + i, 8 - i, H('#7a8890')); p.set(15, 4, H('#5a6870')); for (let x = 5; x < 10; x++) p.set(x, 4, H('#7a8890')); p.set(4, 5, H('#7a8890')); p.set(10, 5, H('#7a8890')); });
  };
}
PV.debug.farm = { wildSeed: () => wildSeed() };
