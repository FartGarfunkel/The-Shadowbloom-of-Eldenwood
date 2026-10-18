// ---------------------------------------------------------------------------
// dnd/equipment.js — (alpha 3) the rest of the SRD 5.2 arms and armour.
//
// Weapons: light hammer, dart, sling and light crossbow (simple); halberd, lance, pike, trident, war pick, blowgun,
// hand and heavy crossbow, pistol and musket (martial); and, from the campaign notes, the light mace, the heavy mace
// and the falchion. Their ammunition: crossbow bolts, sling bullets, blowgun needles, firearm bullets.
// Armour: breastplate and half plate (medium), ring mail and splint (heavy).
// Throwing, crossbows, slings, blowguns and firearms are in dnd/ranged.js.
//
// This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
// licensed under CC BY 4.0.
// ---------------------------------------------------------------------------

// pictures drawn from strokes: [x0, y0, x1, y1, letter, width] on a 16×16 grid (x right, y down)
function dndArtLines(strokes) {
  const G = Array.from({ length: 16 }, () => Array(16).fill('.'));
  for (const [x0, y0, x1, y1, ch, w = 1] of strokes) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      for (let dy = 0; dy < w; dy++) for (let dx = 0; dx < w; dx++) { const X = Math.round(x + dx - (w - 1) / 2), Y = Math.round(y + dy - (w - 1) / 2); if (X >= 0 && Y >= 0 && X < 16 && Y < 16) G[Y][X] = ch; }
    }
  }
  return G.map(r => r.join(''));
}
Object.assign(DND_ART, {
  lhammer: dndArtLines([[2, 13, 9, 6, 'S', 2], [1, 14, 2, 13, 'P'], [8, 3, 12, 7, 'A', 3], [8, 3, 9, 4, 'L'], [12, 7, 12, 8, 'a']]),
  dart: dndArtLines([[5, 10, 10, 5, 'S'], [10, 5, 13, 2, 'A', 2], [13, 2, 14, 1, 'L'], [2, 13, 5, 10, 'L', 2], [3, 11, 4, 12, 'a']]),
  sling: dndArtLines([[3, 3, 8, 9, 'a'], [12, 3, 8, 9, 'a'], [6, 9, 10, 12, 'A', 3], [7, 10, 8, 11, 'L'], [2, 2, 3, 3, 'S'], [12, 2, 13, 3, 'S']]),
  crossbow: dndArtLines([[2, 13, 10, 5, 'S', 2], [1, 14, 2, 13, 'P', 2], [6, 2, 13, 9, 'A', 2], [6, 2, 9, 7, 'L'], [13, 9, 9, 7, 'L'], [9, 7, 12, 4, 'a'], [4, 11, 5, 12, 'k']]),
  halberd: dndArtLines([[1, 14, 11, 4, 'S'], [11, 4, 14, 1, 'L'], [8, 2, 12, 6, 'A', 3], [8, 2, 9, 3, 'L'], [12, 7, 13, 8, 'a']]),
  lance: dndArtLines([[1, 14, 4, 11, 'S', 2], [3, 9, 6, 12, 'a', 2], [5, 10, 14, 1, 'A', 2], [6, 9, 12, 3, 'L']]),
  pike: dndArtLines([[1, 14, 12, 3, 'S'], [12, 3, 14, 1, 'A', 2], [13, 2, 14, 1, 'L']]),
  trident: dndArtLines([[1, 14, 9, 6, 'S'], [7, 6, 11, 10, 'A'], [7, 6, 10, 3, 'A'], [9, 8, 13, 4, 'A'], [11, 10, 14, 7, 'A'], [10, 3, 11, 2, 'L'], [13, 4, 14, 3, 'L'], [14, 7, 15, 6, 'L']]),
  warpick: dndArtLines([[2, 13, 9, 6, 'S', 2], [1, 14, 2, 13, 'P'], [7, 5, 10, 8, 'A', 2], [9, 6, 13, 2, 'A'], [13, 2, 14, 2, 'L'], [7, 5, 6, 6, 'a', 2]]),
  blowgun: dndArtLines([[1, 14, 14, 1, 'S', 2], [3, 12, 4, 11, 'a', 2], [8, 7, 9, 6, 'a', 2], [12, 3, 13, 2, 'a', 2]]),
  pistol: dndArtLines([[3, 12, 6, 7, 'S', 3], [5, 7, 14, 4, 'A', 2], [6, 6, 13, 4, 'L'], [6, 8, 7, 10, 'a'], [5, 5, 6, 4, 'a']]),
  musket: dndArtLines([[1, 14, 6, 9, 'S', 3], [6, 9, 10, 5, 'S', 2], [6, 8, 14, 1, 'A'], [7, 7, 13, 1, 'L'], [8, 9, 8, 10, 'a']]),
  bolt: dndArtLines([[3, 12, 11, 4, 'S'], [11, 4, 13, 2, 'A', 2], [2, 13, 4, 11, 'L', 2]]),
  bullet: dndArtLines([[6, 8, 9, 8, 'A', 3], [6, 7, 7, 7, 'L'], [9, 10, 10, 9, 'a']]),
  needle: dndArtLines([[3, 12, 12, 3, 'A'], [12, 3, 13, 2, 'L'], [2, 13, 3, 12, 'a', 2]]),
});

const DND_WEAPONS_MORE = {
  light_hammer:   { name: 'Light Hammer', cat: 'simple', dice: [1, 4], dmg: 'bludgeoning', props: ['light', 'thrown'], range: 4, cost: 2, art: 'lhammer', cols: ['#b8b8c2', '#5a5a64', '#e8e8f0'] },
  dart:           { name: 'Dart', cat: 'simple', dice: [1, 4], dmg: 'piercing', props: ['finesse', 'thrown'], range: 4, cost: 0.05, art: 'dart', cols: ['#c8c8d0', '#6a6a74', '#f0f0f8'], stack: 16 },
  sling:          { name: 'Sling', cat: 'simple', dice: [1, 4], dmg: 'bludgeoning', props: ['ammo', 'ranged'], ammo: 'sling_bullet', range: 6, cost: 0.1, art: 'sling', cols: ['#8a5a32', '#4a2a14', '#c09060'] },
  light_crossbow: { name: 'Light Crossbow', cat: 'simple', dice: [1, 8], dmg: 'piercing', props: ['ammo', 'loading', 'two', 'ranged'], ammo: 'crossbow_bolt', range: 16, cost: 25, art: 'crossbow', cols: ['#8a8a94', '#4a4a54', '#d0d0d8'] },
  halberd:        { name: 'Halberd', cat: 'martial', dice: [1, 10], dmg: 'slashing', props: ['heavy', 'two', 'reach'], cost: 20, art: 'halberd', cols: ['#d0d0d8', '#80808a', '#ffffff'] },
  lance:          { name: 'Lance', cat: 'martial', dice: [1, 10], dmg: 'piercing', props: ['heavy', 'reach', 'two'], cost: 10, art: 'lance', cols: ['#c0b090', '#6a5a3a', '#e8e0c0'] },
  pike:           { name: 'Pike', cat: 'martial', dice: [1, 10], dmg: 'piercing', props: ['heavy', 'two', 'reach'], cost: 5, art: 'pike', cols: ['#c8c8d0', '#7a7a84', '#f0f0f8'] },
  trident:        { name: 'Trident', cat: 'martial', dice: [1, 8], dmg: 'piercing', props: ['thrown', 'versatile'], ver: [1, 10], range: 4, cost: 5, art: 'trident', cols: ['#9ab8c0', '#4a6a74', '#d8f0f8'] },
  war_pick:       { name: 'War Pick', cat: 'martial', dice: [1, 8], dmg: 'piercing', props: ['versatile'], ver: [1, 10], cost: 5, art: 'warpick', cols: ['#b0b0ba', '#5a5a64', '#e8e8f0'] },
  blowgun:        { name: 'Blowgun', cat: 'martial', dice: [1, 1], dmg: 'piercing', props: ['ammo', 'loading', 'ranged'], ammo: 'blowgun_needle', range: 10, cost: 10, art: 'blowgun', cols: ['#a07a4a', '#5a3a1a', '#d0b080'] },
  hand_crossbow:  { name: 'Hand Crossbow', cat: 'martial', dice: [1, 6], dmg: 'piercing', props: ['ammo', 'light', 'loading', 'ranged'], ammo: 'crossbow_bolt', range: 12, cost: 75, art: 'crossbow', cols: ['#4a4a54', '#22222a', '#9a9aa4'] },
  heavy_crossbow: { name: 'Heavy Crossbow', cat: 'martial', dice: [1, 10], dmg: 'piercing', props: ['ammo', 'heavy', 'loading', 'two', 'ranged'], ammo: 'crossbow_bolt', range: 20, cost: 50, art: 'crossbow', cols: ['#6a4a2a', '#3a2a14', '#b08a5a'] },
  pistol:         { name: 'Pistol', cat: 'martial', dice: [1, 10], dmg: 'piercing', props: ['ammo', 'loading', 'ranged'], ammo: 'firearm_bullet', range: 12, cost: 250, art: 'pistol', cols: ['#5a5a64', '#2a2a30', '#a8a8b0'], firearm: true },
  musket:         { name: 'Musket', cat: 'martial', dice: [1, 12], dmg: 'piercing', props: ['ammo', 'loading', 'two', 'ranged'], ammo: 'firearm_bullet', range: 18, cost: 500, art: 'musket', cols: ['#5a5a64', '#2a2a30', '#a8a8b0'], firearm: true },
  // from the campaign notes: lighter and heavier maces, and the falchion
  light_mace:     { name: 'Light Mace', cat: 'simple', dice: [1, 4], dmg: 'bludgeoning', props: ['light'], cost: 3, art: 'mace', cols: ['#b8b8c2', '#5a5a64', '#e8e8f0'] },
  heavy_mace:     { name: 'Heavy Mace', cat: 'martial', dice: [1, 10], dmg: 'bludgeoning', props: ['heavy', 'two'], cost: 15, art: 'mace', cols: ['#8a8a94', '#3a3a44', '#c8c8d0'] },
  falchion:       { name: 'Falchion', cat: 'martial', dice: [2, 4], dmg: 'slashing', props: ['heavy', 'two'], cost: 30, art: 'scimitar', cols: ['#d8d8e0', '#80808a', '#ffffff'] },
};
const DND_AMMO = {
  crossbow_bolt:  { name: 'Crossbow Bolt', art: 'bolt', cols: ['#8a8a94', '#4a4a54', '#e8e8e8'], desc: 'For crossbows. Twenty to a case.' },
  sling_bullet:   { name: 'Sling Bullet', art: 'bullet', cols: ['#8a8a94', '#4a4a54', '#c8c8d0'], desc: 'A lead shot for a sling. A smooth stone will do too.' },
  blowgun_needle: { name: 'Blowgun Needle', art: 'needle', cols: ['#c8c8d0', '#6a6a74', '#ffffff'], desc: 'A fine needle for a blowgun.' },
  firearm_bullet: { name: 'Firearm Bullet', art: 'bullet', cols: ['#6a6a74', '#2a2a30', '#a8a8b0'], desc: 'Shot and powder for a pistol or musket.' },
};
Object.assign(DND_WEAPONS, DND_WEAPONS_MORE);
{
  for (const [k, w] of Object.entries(DND_WEAPONS_MORE)) {
    const avg = w.dice[0] * (w.dice[1] + 1) / 2, ranged = w.props.includes('ranged');
    defItem(k, { name: w.name, maxStack: w.stack || (w.props.includes('thrown') && k !== 'trident' ? 8 : 1), icon: 'dnd_' + k,
      tool: ranged ? { type: 'hand', tier: 0, speed: 1, damage: 1, durability: 500 } : { type: /axe|halberd|glaive/.test(k) ? 'axe' : 'sword', tier: 3, speed: w.props.includes('heavy') ? 0.8 : w.props.includes('light') ? 1.25 : 1, damage: avg, durability: 400 },
      dnd: { dice: w.dice, dmg: w.dmg, props: w.props, ver: w.ver, range: w.range, cat: w.cat, ammo: w.ammo, firearm: w.firearm },
      dndRanged: ranged ? w : null,
      desc: `${w.dice[0]}d${w.dice[1]} ${w.dmg}${w.props.length ? ' · ' + w.props.filter(p => p !== 'ranged').map(p => p === 'two' ? 'two-handed' : p === 'versatile' ? `versatile (${w.ver[0]}d${w.ver[1]})` : p === 'ammo' ? 'ammunition' : p).join(', ') : ''}${w.props.includes('thrown') ? ' · use to throw' : ranged ? ' · use to shoot' : ''}` });
  }
  for (const [k, a] of Object.entries(DND_AMMO)) defItem(k, { name: a.name, maxStack: 64, icon: 'dnd_' + k, desc: a.desc, dndAmmo: true });
  // the new armour: tinted plates, like the rest
  const NEW_ARMOR = {
    breastplate: { label: 'Breastplate', mat: 'steel_ingot', pts: [2, 6, 4, 2], dur: 20, cols: ['#c0c4cc', '#62666e', '#eef0f4'] },
    halfplate: { label: 'Half Plate', mat: 'steel_ingot', pts: [2, 7, 5, 2], dur: 25, cols: ['#b8bcc4', '#5a5e66', '#e8eaf0'] },
    ringmail: { label: 'Ring Mail', mat: 'iron_ingot', pts: [2, 5, 4, 2], dur: 13, cols: ['#a0a4ac', '#565a62', '#d0d4dc'] },
    splint: { label: 'Splint', mat: 'steel_ingot', pts: [3, 7, 6, 3], dur: 28, cols: ['#a8acb4', '#4a4e56', '#dcdee6'] },
  };
  Object.assign(DND_ARMOR_TYPE, { breastplate: ['medium', 14], halfplate: ['medium', 15], ringmail: ['heavy', 14], splint: ['heavy', 17] });
  Object.assign(DND_ARMOR_STR, { splint: 15 });
  Object.assign(DND_NEW_ARMOR, NEW_ARMOR);
  for (const [mk, m] of Object.entries(NEW_ARMOR)) {
    ARMOR_MATS[mk] = { label: m.label, mat: m.mat, pts: m.pts, dur: m.dur };
    if (typeof ARMOR_COLORS !== 'undefined') ARMOR_COLORS[mk] = m.cols.map(hexRGB);
    ARMOR_PIECES.forEach((pc) => {
      defItem(mk + '_' + pc.key, { name: m.label + ' ' + pc.label, maxStack: 1, icon: mk + '_' + pc.key, armor: { slot: pc.slot, points: m.pts[pc.slot], durability: m.dur * pc.durMul } });
      if (ITEMS[m.mat] || B[m.mat] !== undefined) RECIPES.push({ out: mk + '_' + pc.key, n: 1, shape: ARMOR_SHAPES[pc.slot], key: { M: m.mat }, group: 'armor' });
    });
  }
  Object.assign(DND_KIT_SETS, { breastplate: 'breastplate', half_plate: 'halfplate', ring_mail: 'ringmail', splint_armor: 'splint' });
  // recipes for the new weapons
  const R = (out, shape, key, n = 1) => RECIPES.push({ out, n, shape, key, group: 'tools' });
  R('light_hammer', ['II', ' S'], { I: 'iron_ingot', S: 'stick' });
  R('dart', [' N', 'F '], { N: 'iron_nugget', F: 'feather' }, 4);
  R('sling', ['L L', ' L '], { L: 'leather' });
  R('light_crossbow', ['ISI', 'TST', ' S '], { I: 'iron_ingot', S: 'stick', T: 'string' });
  R('hand_crossbow', ['ITI', ' S '], { I: 'iron_ingot', S: 'stick', T: 'string' });
  R('heavy_crossbow', ['ISI', 'TST', 'PSP'], { I: 'steel_ingot', S: 'stick', T: 'string', P: 'planks' });
  R('halberd', [' II', ' SI', 'S  '], { I: 'iron_ingot', S: 'stick' });
  R('pike', ['  I', ' S ', 'S  '], { I: 'iron_ingot', S: 'stick' });
  R('lance', ['  I', ' P ', 'S  '], { I: 'iron_ingot', P: 'planks', S: 'stick' });
  R('trident', ['III', ' S ', ' S '], { I: 'iron_nugget', S: 'stick' });
  R('war_pick', ['II ', ' SI', ' S '], { I: 'iron_ingot', S: 'stick' });
  R('blowgun', ['  B', ' B ', 'B  '], { B: 'bamboo' });
  R('light_mace', ['I', 'S'], { I: 'iron_ingot', S: 'stick' });
  R('heavy_mace', [' B ', ' S ', ' S '], { B: 'iron_block', S: 'stick' });
  R('falchion', [' II', ' I ', 'S  '], { I: 'steel_ingot', S: 'stick' });
  R('crossbow_bolt', ['N', 'S', 'F'], { N: 'iron_nugget', S: 'stick', F: 'feather' }, 8);
  R('sling_bullet', ['N'], { N: 'iron_nugget' }, 4);
  R('blowgun_needle', ['N', 'N'], { N: 'iron_nugget' }, 8);
  for (const r of RECIPES) if (r.out && DND_WEAPONS_MORE[r.out] || DND_AMMO[r.out]) for (const v of Object.values(r.key)) if (!ITEMS[v] && B[v] === undefined) r.bad = true;
  for (let i = RECIPES.length - 1; i >= 0; i--) if (RECIPES[i].bad) RECIPES.splice(i, 1);
}
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    for (const [k, w] of Object.entries(DND_WEAPONS_MORE)) addItem('dnd_' + k, p => dndPaintArt(p, w.art, w.cols));
    for (const [k, a] of Object.entries(DND_AMMO)) addItem('dnd_' + k, p => dndPaintArt(p, a.art, a.cols));
    const H = hexRGB;
    for (const mk of ['breastplate', 'halfplate', 'ringmail', 'splint']) {
      const m = DND_NEW_ARMOR[mk], [c, d, l] = m.cols.map(H);
      const paint = (p) => {
        p.noise(c, 0.08);
        if (mk === 'ringmail') for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x % 3 === 0) || (y % 3 === 0)) p.set(x, y, (x + y) % 2 ? d : l);
        if (mk === 'splint') for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) { p.set(x, y, d); p.set(x + 1, y, l); }
        if (mk === 'breastplate' || mk === 'halfplate') { for (let x = 0; x < 16; x++) { p.set(x, 0, l); p.set(x, 15, d); p.set(x, 7, d); } for (let y = 0; y < 16; y++) { p.set(0, y, l); p.set(15, y, d); } for (const [x, y] of [[3, 3], [12, 3], [3, 11], [12, 11]]) p.set(x, y, l); }
        if (mk === 'halfplate') for (let y = 9; y < 15; y += 2) for (let x = 1; x < 15; x++) if ((x + y) % 4 === 0) p.set(x, y, d);
      };
      if (typeof addTile === 'function') { addTile('armor_' + mk, paint); addTile('armor_' + mk + '_face', p => { paint(p); for (let y = 4; y < 15; y++) for (let x = 3; x < 13; x++) p.set(x, y, [0, 0, 0], 0); }); }
    }
  };
}
// the shops: the new arms where arms are sold
if (typeof NPC_SHOPS !== 'undefined') {
  const add = (job, list) => { if (NPC_SHOPS[job]) NPC_SHOPS[job].buy.push(...list.filter(l => ITEMS[l[0]])); };
  add('weaponsmith', [['light_hammer', 1, 1, 0], ['dart', 8, 1, 0], ['sling', 1, 1, 0], ['sling_bullet', 16, 1, 0], ['light_crossbow', 1, 7, 1], ['crossbow_bolt', 16, 2, 0], ['war_pick', 1, 2, 0], ['trident', 1, 2, 0], ['halberd', 1, 6, 1], ['pike', 1, 2, 1], ['lance', 1, 3, 1], ['light_mace', 1, 1, 0], ['heavy_mace', 1, 4, 1], ['falchion', 1, 8, 2], ['hand_crossbow', 1, 19, 2], ['heavy_crossbow', 1, 13, 2], ['blowgun', 1, 3, 1], ['blowgun_needle', 16, 1, 0]]);
  add('armorer', [['breastplate_chestplate', 1, 18, 2], ['halfplate_chestplate', 1, 30, 3], ['ringmail_chestplate', 1, 5, 1], ['splint_chestplate', 1, 25, 3], ['breastplate_helmet', 1, 4, 1], ['splint_leggings', 1, 12, 3]]);
}

// ---- (alpha 3) the adventuring packs: worn on your back as backpacks, and packed with their gear -------------------------
// Use one to open it (its kit is inside, ready to take out); wear it in the backpack slot for its extra slots.
const DND_PACK_SLOTS = { explorers_pack: 18, dungeoneers_pack: 18, burglars_pack: 15, priests_pack: 12, scholars_pack: 12, entertainers_pack: 12 };
for (const [k, n] of Object.entries(DND_PACK_SLOTS)) if (ITEMS[k]) {
  const G = DND_GEAR[k], kit = (DND_PACKS[G.pack[0]] || []).filter(([id]) => ITEMS[id]).map(([id, c]) => `${c > 1 ? c + ' ' : ''}${ITEMS[id].name.toLowerCase()}`).join(', ');
  ITEMS[k].backpack = n;
  ITEMS[k].desc = `A backpack: wear it on your back for ${n} extra slots. Use it to open it. Packed with ${kit}.`;
}
function dndFillPack(stack) {
  if (!stack || stack.c) return;
  const n = DND_PACK_SLOTS[stack.id]; if (!n) return;
  const G = DND_GEAR[stack.id], list = (DND_PACKS[G.pack[0]] || []).filter(([id]) => ITEMS[id]);
  stack.c = new Array(n).fill(null);
  list.forEach(([id, cnt], i) => { if (i < n) stack.c[i] = mkStack(id, Math.min(cnt, itemDef(id).maxStack || 64)); });
}
{
  const baseSlots = PlayerInventory.prototype.backpackSlots;
  PlayerInventory.prototype.backpackSlots = function () { const b = this.back && this.back.slots[0]; if (b && DND_PACK_SLOTS[b.id]) dndFillPack(b); return baseSlots.call(this); };
  const baseOpen = LocalPlayer.prototype.openInventory;
  LocalPlayer.prototype.openInventory = function (mode, opts = {}) {
    try { const p = this.player; if (opts && opts.held && p && p.inv.held && DND_PACK_SLOTS[p.inv.held.id]) dndFillPack(p.inv.held); } catch (e) { /* later */ }
    return baseOpen.call(this, mode, opts);
  };
}
