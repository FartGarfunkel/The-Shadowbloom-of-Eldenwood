// ---------------------------------------------------------------------------
// game/villagers.js — 0.9: the people of the villages.
//
// Villagers are folk like you: the same body as a player, each with a face,
// hair and clothes of their own painted from a seed and their work. They keep
// a day: up at dawn, off to work (the farmer to the fields, the smith to the
// anvil, the baker and the merchant to their stalls), out and about in the
// afternoon, chatting when they meet, on the benches in the evening and in
// their own beds at night, opening and shutting their doors as they go. They
// look round and wave when you come by.
//
// Talk to one (use them) for a conversation: shopkeepers sell and buy (in
// emeralds; better prices as the village comes to trust you), anyone with a
// job for you has a ! over their head (a ? when you can hand it in), and
// everyone has something to say. The quest board on the plaza has the
// village's bounties. Guards in armour walk the roads and the plaza day and
// night, and a village of any size has an iron golem; both go after
// monsters, and after anyone who hurts the villagers.
//
// They speak in the babble of Animal Crossing or the traders of Vintage
// Story: every letter a little sound in their own voice.
//
// The villagers aren't saved: they come when someone comes near the village
// and go when everyone has left. What lasts is in the world's meta (who has
// died, the pens filled) and in each player's stats (standing with each
// village, quests, what the shops have left today).
// ---------------------------------------------------------------------------

// ---- who they are -------------------------------------------------------------------------------------
const NPC_JOBS = {
  farmer: { title: 'Farmer', held: 'iron_hoe', shirt: '#7a6a3a', apron: '#a8946a', hat: 'straw', work: 'hoe' },
  fisherman: { title: 'Fisher', held: 'fishing_rod', shirt: '#3a6a8a', hat: 'bucket', hatCol: '#c8a040', work: 'idle' },
  shepherd: { title: 'Shepherd', held: 'shears', shirt: '#e8e0d0', apron: '#8a6a4a', work: 'idle' },
  fletcher: { title: 'Fletcher', held: 'bow', shirt: '#4a6a3a', hat: 'cap', hatCol: '#3a5a2a', feather: true, work: 'hammer' },
  librarian: { title: 'Librarian', held: 'book', shirt: '#8a2a2a', robe: true, glasses: true, work: 'read' },
  cartographer: { title: 'Cartographer', held: 'compass', shirt: '#2a5a3a', robe: true, monocle: true, work: 'read' },
  cleric: { title: 'Healer', held: null, shirt: '#6a3a8a', robe: true, hood: '#5a2a7a', work: 'idle' },
  armorer: { title: 'Armourer', held: 'iron_pickaxe', shirt: '#4a4a4a', apron: '#2a2a2a', work: 'hammer', soot: true },
  weaponsmith: { title: 'Weaponsmith', held: 'iron_sword', shirt: '#5a3a2a', apron: '#2a2a2a', work: 'hammer', soot: true },
  toolsmith: { title: 'Toolsmith', held: 'iron_pickaxe', shirt: '#6a5a3a', apron: '#2a2a2a', work: 'hammer', soot: true },
  butcher: { title: 'Butcher', held: 'iron_axe', shirt: '#e8e8e8', apron: '#d8d0c8', blood: true, work: 'hammer' },
  mason: { title: 'Mason', held: 'stone_pickaxe', shirt: '#8a8478', apron: '#5a5448', work: 'hammer' },
  jeweller: { title: 'Jeweller', held: 'emerald', shirt: '#5a2a6a', robe: true, gold: true, work: 'read' },
  merchant: { title: 'Merchant', held: null, shirt: '#2a4a8a', vest: '#c8a040', hat: 'cap', hatCol: '#8a2a2a', work: 'idle' },
  baker: { title: 'Baker', held: 'bread', shirt: '#e8e0d0', apron: '#ffffff', hat: 'chef', work: 'idle' },
  innkeeper: { title: 'Innkeeper', held: null, shirt: '#7a3a2a', apron: '#e8e0d0', work: 'idle' },
  elder: { title: 'Village Elder', held: 'stick', shirt: '#e8e4d8', robe: true, elder: true, work: 'idle' },
  none: { title: 'Villager', held: null, work: 'idle' },
  guard: { title: 'Guard', held: 'iron_sword', shirt: '#2a3a6a', tabard: true, work: 'idle' },
};
const NPC_FIRST = ['Ada', 'Bram', 'Cora', 'Dell', 'Edda', 'Finn', 'Greta', 'Hob', 'Ilsa', 'Jory', 'Kit', 'Lena', 'Mara', 'Ned', 'Orla', 'Piet', 'Quill', 'Rosa', 'Sten', 'Tilda', 'Ulf', 'Vera', 'Wim', 'Yana', 'Zeb', 'Alder', 'Bess', 'Cael', 'Dora', 'Emmet', 'Fern', 'Gil', 'Hattie', 'Ivo', 'June', 'Kell', 'Lark', 'Milo', 'Nell', 'Oswin', 'Pip', 'Rook', 'Sage', 'Tam', 'Wren'];
function npcName(seed) { return NPC_FIRST[seed % NPC_FIRST.length]; }

// (Shadowbloom) the coin of the realm: gold pieces in a tabletop world, emeralds otherwise
const COIN = () => (typeof GAME !== 'undefined' && GAME && GAME.meta && GAME.meta.dnd && ITEMS.gold_coin) ? 'gold_coin' : 'emerald';
const COIN_NAME = (n) => COIN() === 'gold_coin' ? 'gold' : 'emerald' + (n > 1 ? 's' : '');
// What the shopkeepers sell (buy: you pay emeralds) and want (sell: they pay you).
// [item, how many, emeralds, standing needed (0 stranger .. 3 honoured)]
const NPC_SHOPS = {
  farmer: { buy: [['bread', 6, 1, 0], ['apple', 4, 1, 0], ['wheat_seeds', 16, 1, 0], ['pumpkin_pie', 3, 1, 1], ['cake', 1, 3, 1], ['golden_carrot', 3, 3, 2], ['golden_apple', 1, 10, 3]], sell: [['wheat', 20, 1, 0], ['carrot', 22, 1, 0], ['potato', 24, 1, 0], ['beetroot', 15, 1, 0], ['pumpkin', 6, 1, 1], ['melon_slice', 16, 1, 1]] },
  fisherman: { buy: [['cooked_cod', 6, 1, 0], ['fishing_rod', 1, 2, 0], ['campfire', 1, 2, 1], ['cooked_salmon', 6, 2, 1]], sell: [['string', 20, 1, 0], ['coal', 10, 1, 0], ['cod', 15, 1, 0], ['salmon', 13, 1, 1], ['tropical_fish', 6, 1, 2]] },
  shepherd: { buy: [['wool', 4, 1, 0], ['bed', 1, 3, 0], ['shears', 1, 2, 0], ['white_carpet', 8, 1, 1], ['painting', 1, 3, 2]], sell: [['wool', 18, 1, 0], ['white_dye', 12, 1, 1], ['black_dye', 12, 1, 1], ['brown_dye', 12, 1, 1]] },
  fletcher: { buy: [['arrow', 16, 1, 0], ['bow', 1, 2, 0], ['flint', 10, 1, 0], ['crossbow', 1, 3, 1], ['spectral_arrow', 8, 2, 2]], sell: [['stick', 32, 1, 0], ['flint', 26, 1, 0], ['string', 14, 1, 0], ['feather', 24, 1, 1]] },
  librarian: { buy: [['book', 1, 1, 0], ['lantern', 1, 1, 0], ['glass', 4, 1, 0], ['bookshelf', 1, 6, 1], ['compass', 1, 4, 1], ['clock', 1, 5, 1], ['name_tag', 1, 12, 2], ['writable_book', 1, 2, 2]], sell: [['paper', 24, 1, 0], ['book', 4, 1, 0], ['ink_sac', 5, 1, 1], ['feather', 20, 1, 1]] },
  cartographer: { buy: [['empty_map', 1, 5, 0], ['compass', 1, 5, 0], ['spyglass', 1, 6, 1], ['white_banner', 1, 3, 2]], sell: [['paper', 24, 1, 0], ['glass_pane', 11, 1, 0], ['compass', 1, 1, 1]] },
  cleric: { buy: [['redstone', 2, 1, 0], ['lapis_lazuli', 1, 1, 0], ['glowstone_dust', 4, 2, 1], ['experience_bottle', 1, 3, 1], ['ender_pearl', 1, 5, 2], ['golden_apple', 1, 12, 3]], sell: [['rotten_flesh', 32, 1, 0], ['gold_ingot', 3, 1, 0], ['bone', 16, 1, 0], ['spider_eye', 8, 1, 1]] },
  armorer: { buy: [['iron_helmet', 1, 5, 0], ['iron_boots', 1, 4, 0], ['iron_leggings', 1, 7, 1], ['iron_chestplate', 1, 9, 1], ['silver_chestplate', 1, 14, 2], ['steel_helmet', 1, 10, 2], ['steel_chestplate', 1, 18, 3]], sell: [['coal', 15, 1, 0], ['iron_ingot', 4, 1, 0], ['silver_ingot', 3, 1, 1], ['lava_bucket', 1, 1, 1]] },
  weaponsmith: { buy: [['iron_axe', 1, 3, 0], ['iron_sword', 1, 4, 0], ['silver_sword', 1, 8, 1], ['steel_sword', 1, 12, 2], ['steel_axe', 1, 12, 2], ['mithril_sword', 1, 30, 3]], sell: [['coal', 15, 1, 0], ['iron_ingot', 4, 1, 0], ['flint', 24, 1, 1]] },
  toolsmith: { buy: [['stone_pickaxe', 1, 1, 0], ['stone_axe', 1, 1, 0], ['iron_shovel', 1, 2, 0], ['iron_pickaxe', 1, 5, 1], ['silver_pickaxe', 1, 8, 1], ['steel_pickaxe', 1, 12, 2], ['mithril_pickaxe', 1, 30, 3]], sell: [['coal', 15, 1, 0], ['iron_ingot', 4, 1, 0], ['flint', 30, 1, 1]] },
  butcher: { buy: [['cooked_porkchop', 5, 1, 0], ['cooked_chicken', 8, 1, 0], ['cooked_beef', 4, 1, 1], ['cooked_mutton', 5, 1, 1], ['rabbit_stew', 1, 1, 2]], sell: [['chicken', 14, 1, 0], ['porkchop', 7, 1, 0], ['beef', 10, 1, 0], ['mutton', 7, 1, 1], ['rabbit', 4, 1, 1], ['coal', 15, 1, 0]] },
  mason: { buy: [['bricks', 10, 1, 0], ['stone_bricks', 8, 1, 0], ['chiseled_stone_bricks', 4, 1, 1], ['smooth_stone', 4, 1, 1], ['white_terracotta', 4, 1, 2], ['quartz_bricks', 2, 1, 3]], sell: [['clay_ball', 10, 1, 0], ['stone', 20, 1, 0], ['granite', 16, 1, 1], ['andesite', 16, 1, 1]] },
  jeweller: { buy: [['ruby', 1, 6, 0], ['sapphire', 1, 6, 0], ['emerald_block', 1, 11, 1], ['diamond', 1, 12, 1], ['amethyst_shard', 4, 1, 2]], sell: [['ruby', 1, 3, 0], ['sapphire', 1, 3, 0], ['silver_ingot', 3, 1, 0], ['gold_ingot', 3, 1, 0], ['diamond', 1, 8, 1], ['mithril_ingot', 1, 6, 2], ['adamantite_ingot', 1, 12, 3]] },
  merchant: { buy: [['torch', 16, 1, 0], ['lantern', 1, 1, 0], ['ladder', 8, 1, 0], ['bucket', 1, 2, 0], ['lead', 1, 3, 1], ['saddle', 1, 6, 1], ['spyglass', 1, 6, 2], ['backpack', 1, 8, 2]], sell: [['leather', 6, 1, 0], ['iron_ingot', 5, 1, 0], ['gold_ingot', 4, 1, 0], ['honeycomb', 6, 1, 1], ['diamond', 1, 6, 2]] },
  baker: { buy: [['bread', 6, 1, 0], ['cookie', 12, 1, 0], ['pumpkin_pie', 3, 1, 0], ['cake', 1, 3, 1], ['honey_bottle', 2, 1, 1]], sell: [['wheat', 20, 1, 0], ['sugar', 16, 1, 0], ['egg', 16, 1, 0], ['milk_bucket', 1, 1, 1], ['cocoa_beans', 12, 1, 2]] },
  innkeeper: { buy: [['bread', 6, 1, 0], ['cooked_beef', 4, 1, 0], ['mushroom_stew', 1, 1, 0], ['honey_bottle', 2, 1, 1], ['golden_apple', 1, 14, 3]], sell: [['sweet_berries', 12, 1, 0], ['apple', 10, 1, 0], ['honey_bottle', 2, 1, 1]] },
};
// standing with a village
const NPC_STANDING = [[-1e9, 'Distrusted'], [-5, 'Stranger'], [5, 'Visitor'], [15, 'Friend'], [35, 'Trusted'], [70, 'Honoured'], [120, 'Hero']];
function standingOf(rep) { let k = 0; for (let i = 0; i < NPC_STANDING.length; i++) if (rep >= NPC_STANDING[i][0]) k = i; return { k, name: NPC_STANDING[k][1], tier: k <= 2 ? 0 : Math.min(3, k - 2), next: NPC_STANDING[k + 1] ? NPC_STANDING[k + 1][0] : null }; }
const TIER_NAME = ['Stranger', 'Friend', 'Trusted', 'Honoured'];

// ---- the bodies -------------------------------------------------------------------------------------------
Object.assign(MOB_TYPES, {
  villager: { model: 'raider', label: 'a villager', hp: 20, w: 0.3, h: 1.8, speed: 2.4, npc: true, passiveXp: true, voice: 'villager', noDismember: true },
  village_guard: { model: 'raider', label: 'a guard', hp: 34, w: 0.3, h: 1.8, speed: 4.0, npc: true, guard: true, passiveXp: true, voice: 'villager', damage: 6, noDismember: true },
  iron_golem: { model: 'iron_golem', label: 'an iron golem', hp: 100, w: 0.7, h: 2.85, speed: 2.6, golem: true, passiveXp: true, damage: 10, noDismember: true, drops: [['iron_ingot', 3, 5, 1], ['flower_red', 0, 2, 0.6]] },
});
{
  // the iron golem: a big iron body, long arms, a vine or two
  const D = MODEL_DEFS;
  D.iron_golem = bipedRig({
    head: [8, 10, 8], body: [18, 12, 11], arm: [4, 28, 6], leg: [6, 16, 5], armX: 11, legX: 4.5, heavy: true,
    tex: { head: { all: 'golem_iron', front: 'golem_iface' }, body: { all: 'golem_iron', front: 'golem_ichest' }, arm: 'golem_iron', leg: 'golem_iron', shin: 'golem_iron' },
    extras: [['nose', 'head', [0, 2, -4], [-1, -1, -2, 1, 3, 0], 'golem_iron'], ['brow', 'head', [0, 7, -4], [-4.2, 0, -1, 4.2, 1.5, 0.5], 'golem_iron'],
      ['waist', 'body', [0, 0, 0], [-4.5, -5, -3, 4.5, 0.5, 3], 'golem_iron'], ['shoulders', 'body', [0, 12, 0], [-9.5, -3, -5.8, 9.5, 0.5, 5.8], 'golem_iron']],
  });
  D.iron_golem.scale = 1.15;
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB, tone = (p, c, k = 0.12) => shade(H(c), 1 + (p.rand() - 0.5) * k);
    const iron = (p) => {
      p.noise(H('#c8c4bc'), 0.1); p.speck(H('#a8a49c'), 0.15); p.speck(H('#e8e4dc'), 0.06);
      for (let k = 0; k < 3; k++) { const x = Math.floor(p.rand() * 14), y = Math.floor(p.rand() * 14); p.set(x, y, H('#8a6a4a')); p.set(x + 1, y, H('#a07a50')); p.set(x, y + 1, H('#7a5a3a')); }   // rust
      for (let k = 0; k < 2; k++) { let x = Math.floor(p.rand() * 16); for (let y = 0; y < 6 + p.rand() * 8; y++) { p.set(x & 15, y, tone(p, '#3a7a2a')); if (p.rand() < 0.3) x += p.rand() < 0.5 ? 1 : -1; } }   // vines
    };
    addTile('golem_iron', iron);
    addTile('golem_ichest', p => { iron(p); for (let x = 3; x < 13; x++) { p.set(x, 3, H('#8a8680')); p.set(x, 12, H('#8a8680')); } });
    addTile('golem_iface', p => { p.noise(H('#c8c4bc'), 0.08); p.speck(H('#a8a49c'), 0.12); for (const x of [3, 4, 11, 12]) { p.set(x, 6, H('#2a1a1a')); p.set(x, 7, H('#2a1a1a')); } p.set(4, 6, H('#c83a2a')); p.set(11, 6, H('#c83a2a')); for (let x = 2; x < 14; x++) p.set(x, 4, H('#8a8680')); });
  };
}

// ---- their skins: a face, hair and the clothes of their work -----------------------------------------------
const NPC_SKIN_TONES = ['#f2d3b8', '#e8bf9a', '#dcae88', '#c99670', '#b07a52', '#8e5a38', '#6e4228', '#52301c'];
const NPC_HAIR = ['#2a1a10', '#3a2416', '#4a2c18', '#6a4020', '#8a5a2a', '#a8743a', '#c89a4a', '#e0c070', '#8a2a14', '#b04a20', '#9a9a9a', '#d8d8d8', '#141414'];
const NPC_EYES = ['#3a5ab0', '#3a7a4a', '#6a4a2a', '#2a2a2a', '#5a8ab0', '#7a6a3a'];
function npcSkinCanvas(seed, job) {
  const J = NPC_JOBS[job] || NPC_JOBS.none;
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  const R = mulberry32(seed * 2654435761 >>> 0);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const put = (x, y, c, v = 0.07) => { if (!c) return; const k = 1 + (R() - 0.5) * v; g.fillStyle = `rgb(${clamp(c[0] * k, 0, 255) | 0},${clamp(c[1] * k, 0, 255) | 0},${clamp(c[2] * k, 0, 255) | 0})`; g.fillRect(x, y, 1, 1); };
  const box = (u, v, w, h, d, fn) => {
    const faces = { top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, h], front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + d + w + d, v + d, w, h] };
    for (const [f, [x0, y0, fw, fh]] of Object.entries(faces)) for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) put(x0 + x, y0 + y, fn(f, x, y, fw, fh));
  };
  const H = hexRGB, dark = (c, k = 0.7) => c.map(q => q * k), light = (c, k = 1.25) => c.map(q => Math.min(255, q * k));
  const old = J.elder || R() < 0.12;
  const skin = H(pick(NPC_SKIN_TONES)), hair = H(old ? pick(['#d8d8d8', '#bcbcbc', '#9a9a9a']) : pick(NPC_HAIR)), eye = H(pick(NPC_EYES));
  const style = J.hood ? 4 : Math.floor(R() * 5);      // 0 short, 1 long, 2 cropped, 3 tied back, 4 hood
  const beard = J.elder || R() < 0.3 ? Math.floor(R() * 3) + 1 : 0;   // 1 stubble, 2 short, 3 long
  const shirt = H(J.shirt || pick(['#6a8a5a', '#8a6a4a', '#5a6a8a', '#8a5a5a', '#7a7a5a', '#5a7a7a'])), shirtD = dark(shirt, 0.78);
  const trousers = H(pick(['#4a3a2a', '#3a3a4a', '#5a4a3a', '#2a2a2a', '#4a4a3a'])), boots = H(pick(['#3a2414', '#2a1a10', '#4a3424']));
  const mouth = dark(skin, 0.62), nose = dark(skin, 0.86), white = [240, 240, 236];
  // the head
  box(0, 0, 8, 8, 8, (f, x, y) => {
    if (f === 'top') return style === 2 ? (R() < 0.5 ? hair : dark(skin, 0.9)) : hair;
    if (f === 'bottom') return beard >= 2 ? hair : skin;
    if (f === 'back') return style === 1 || style === 3 ? hair : y < (style === 2 ? 3 : 6) ? hair : skin;
    if (f === 'front') {
      if (y < 2 - (style === 2 ? 1 : 0)) return hair;
      if (y === 2) return (x === 0 || x === 7) && style !== 2 ? hair : (x === 1 || x === 2 || x === 5 || x === 6) && R() < 0.85 ? dark(hair, 0.85) : skin;   // brows
      if (y === 3) return x === 1 || x === 6 ? white : x === 2 || x === 5 ? eye : skin;
      if (y === 4) return x === 3 || x === 4 ? nose : beard === 1 && (x === 0 || x === 7) ? dark(hair, 1.1) : skin;
      if (y === 5) return beard >= 2 && (x <= 1 || x >= 6) ? hair : x >= 2 && x <= 5 ? (beard >= 2 && (x === 2 || x === 5) ? hair : mouth) : beard === 1 && R() < 0.4 ? dark(hair, 1.2) : skin;
      if (y >= 6) return beard >= 2 && (beard === 3 || y === 6 || (x > 0 && x < 7)) ? (y === 7 && beard === 2 && (x < 2 || x > 5) ? skin : hair) : beard === 1 && R() < 0.4 ? dark(hair, 1.2) : skin;
      return skin;
    }
    // the sides: hair over the ears, longer for long hair
    const longH = style === 1 ? 8 : style === 3 ? 4 : style === 2 ? 2 : 4;
    if (y < longH && (f === 'right' ? x < 5 : x > 2)) return hair;
    if (beard >= 2 && y >= 5 && (f === 'right' ? x < 3 : x > 4)) return hair;
    return y < 2 ? hair : skin;
  });
  // the hat layer: hoods, caps, straw hats, the chef's hat, glasses
  const hatCol = J.hatCol ? H(J.hatCol) : null;
  if (J.hood) { const hc = H(J.hood); box(32, 0, 8, 8, 8, (f, x, y) => f === 'front' ? (y < 2 || x === 0 || x === 7 ? hc : null) : f === 'bottom' ? null : hc); }
  else if (J.hat === 'straw') { const s = H('#d8b860'); box(32, 0, 8, 8, 8, (f, x, y) => f === 'top' ? (R() < 0.8 ? s : dark(s, 0.85)) : f === 'bottom' ? null : y < 2 ? (y === 1 && f === 'front' ? H('#8a3a2a') : s) : null); }
  else if (J.hat === 'cap' || J.hat === 'bucket') { const c = hatCol || H('#5a4a3a'); box(32, 0, 8, 8, 8, (f, x, y) => f === 'top' ? c : f === 'bottom' ? null : y < (J.hat === 'bucket' ? 3 : 2) ? (J.feather && f === 'right' && y === 0 && x === 3 ? H('#e84a2a') : c) : null); }
  else if (J.hat === 'chef') { const c = [250, 250, 248]; box(32, 0, 8, 8, 8, (f, x, y) => f === 'bottom' ? null : f === 'top' ? c : y < 2 ? c : null); }
  if (J.glasses) for (const x of [1, 2, 5, 6]) put(32 + 8 + x, 8 + 3, H('#2a2a2a'));   // spectacles over the eyes (hat layer front)
  if (J.monocle) { put(32 + 8 + 5, 8 + 3, H('#c8a040')); put(32 + 8 + 6, 8 + 3, H('#c8a040')); }
  if (J.elder) for (let y = 5; y < 8; y++) for (let x = 1; x < 7; x++) put(32 + 8 + x, 8 + y, hair);   // a long white beard hanging over the chin
  // the body: shirt, belt, apron or robe
  const tab = J.tabard ? H('#2a4a8a') : null;
  box(16, 16, 8, 12, 4, (f, x, y, w, h) => {
    if (f === 'top') return shirt;
    if (f === 'bottom') return J.robe ? shirt : trousers;
    if (y === h - 3 && !J.robe) return H('#3a2a1a');          // the belt
    if (f === 'front' && y === 0 && (x === 3 || x === 4)) return J.robe || tab ? shirtD : skin;   // the open collar
    if (J.vest && f === 'front' && (x < 2 || x > 5) && y < h - 3) return H(J.vest);
    if (J.gold && f === 'front' && x === 3 && y % 3 === 1) return H('#e8c040');
    return y === h - 1 ? shirtD : shirt;
  });
  // the jacket layer: aprons, tabards, a robe's front
  if (J.apron) { const a = H(J.apron); box(16, 32, 8, 12, 4, (f, x, y) => f === 'front' && x >= 1 && x <= 6 && y >= 3 ? (J.blood && R() < 0.12 ? H('#8a2a1a') : J.soot && R() < 0.15 ? dark(a, 0.6) : a) : f === 'front' && y === 2 && (x === 1 || x === 6) ? a : null); }
  if (tab) box(16, 32, 8, 12, 4, (f, x, y) => (f === 'front' || f === 'back') && x >= 2 && x <= 5 ? (y === 4 && (x === 3 || x === 4) ? H('#e8c040') : tab) : null);
  // arms: sleeves, then hands
  const sleeve = J.robe ? 10 : R() < 0.5 ? 4 : 6;
  const arm = (f, x, y) => f === 'top' ? shirt : f === 'bottom' ? skin : y < sleeve ? (y === sleeve - 1 ? shirtD : shirt) : skin;
  box(40, 16, 4, 12, 4, arm); box(32, 48, 4, 12, 4, arm);
  // legs: trousers and boots, or the robe down to the ankles
  const leg = (f, x, y) => f === 'top' ? (J.robe ? shirt : trousers) : f === 'bottom' ? boots : y >= 10 ? boots : J.robe ? (y === 9 ? shirtD : shirt) : trousers;
  box(0, 16, 4, 12, 4, leg); box(16, 48, 4, 12, 4, leg);
  if (J.apron && !J.robe) { const a = H(J.apron); for (const [u, v] of [[0, 32], [0, 48]]) box(u, v, 4, 12, 4, (f, x, y) => f === 'front' && y < 7 ? a : null); }
  // (alpha 2) what they wear in 3D: hair, beard, hat, hood, robe, apron, tabard (render/gear3d.js)
  if (typeof gearWrite === 'function') gearWrite(cv, {
    species: 'human', hair: ['short', 'long', 'crop', 'tail', 'short'][style] || 'short', hairCol: hair, beard: J.elder ? 'long' : ['none', 'stubble', 'short', 'long'][beard] || 'none', skin,
    hood: !!J.hood, hat: ['straw', 'cap', 'bucket', 'chef'].includes(J.hat) ? J.hat : 'none', feather: !!J.feather, robe: !!J.robe, apron: !!(J.apron && !J.robe), tabard: !!J.tabard, elder: !!J.elder,
    cols: [shirt, shirtD, trousers, boots], extra: J.apron ? H(J.apron) : J.hood ? H(J.hood) : J.tabard ? H('#2a4a8a') : shirtD,
    hatCol: J.hat === 'straw' ? H('#d8b860') : J.hat === 'chef' ? [250, 250, 248] : hatCol || H('#5a4a3a'), ears: 'round', horns: 'none', outfit: null,
  });
  return cv;
}
const NPC_SKINS = new Map();
function npcSkin(gl, seed, job) {
  const key = 'npc:' + seed + ':' + job;
  let s = NPC_SKINS.get(key);
  if (s) return s;
  const canvas = npcSkinCanvas(seed, job), px = canvas.getContext('2d').getImageData(0, 0, 64, 64).data;   // read before it goes to the GPU
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  s = { key, canvas, tex, slim: false, legacy: false, px, parts: buildSkinParts(gl, false, false, px), ready: true, face: { eye: 3, mouth: 5, mx: [2, 6] } };   // (0.9.0.12) its own 3D layers, and a face that moves
  NPC_SKINS.set(key, s);
  return s;
}
// the face, big, for the conversation window
function npcPortrait(seed, job, size = 64) {
  const src = npcSkinCanvas(seed, job), cv = document.createElement('canvas');
  cv.width = cv.height = size; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(src, 8, 8, 8, 8, 0, 0, size, size); g.drawImage(src, 40, 8, 8, 8, 0, 0, size, size);
  return cv;
}

// ---- new moves for the shared body: waving, working, talking, arms folded, the head turning ----------------
{
  const base = avatarAnim;
  avatarAnim = function (pose) {
    const A = base(pose), t = pose.time || 0;
    if (pose.headYaw) { A.head[1] += pose.headYaw; }
    if (pose.wave > 0) { const k = Math.min(1, pose.wave * 3); A.armR = [2.7 * k, 0, 0.35 * k + Math.sin(t * 14) * 0.35 * k]; A.foreR = [0.2, 0, 0]; }
    else if (pose.talk) { A.armR[0] += 0.5 + Math.sin(t * 3.1) * 0.25; A.foreR[0] += 0.6 + Math.sin(t * 2.3) * 0.3; A.armL[0] += 0.35 + Math.sin(t * 2.7 + 1) * 0.2; A.foreL[0] += 0.5; A.head[0] += Math.sin(t * 4.3) * 0.06; }
    else if (pose.fold && !pose.walkAmt) { A.armR = [0.95, 0.35, -0.55]; A.foreR = [1.25, 0, 0]; A.armL = [0.95, -0.35, 0.55]; A.foreL = [1.25, 0, 0]; }
    if (pose.read) { A.armR = [0.85, -0.25, 0]; A.foreR = [0.7, 0, 0]; A.armL = [0.85, 0.25, 0]; A.foreL = [0.7, 0, 0]; A.head[0] += 0.35; }
    if (pose.hoe > 0) { const k = Math.sin(pose.hoe * Math.PI); A.armR = [0.6 + k * 1.2, 0, 0]; A.armL = [0.6 + k * 1.1, 0, 0]; A.body[0] -= k * 0.25; }
    return A;
  };
}

// ---- their voices: a babble, a sound for every letter ------------------------------------------------------
const BABBLE_V = { a: [800, 1200], e: [520, 1850], i: [320, 2300], o: [520, 900], u: [360, 720], y: [380, 2100] };
const BABBLE_MAP = 'aeiou';
function babbleVowel(ch) {
  ch = ch.toLowerCase();
  if (BABBLE_V[ch]) return [ch, false];
  const code = ch.charCodeAt(0);
  if (!(code >= 97 && code <= 122)) return [null, false];
  return [BABBLE_MAP[code % 5], 'bdgkpt'.includes(ch) ? 'stop' : 'szfhxc'.includes(ch) ? 'hiss' : 'nasal'];
}
// say a line: starts now, one blip per letter; returns its length in seconds
function babble(sfx, text, voice, opts = {}) {
  const ctx = sfx && sfx.ctx;
  if (!ctx || !sfx.master || sfx.volume <= 0) return 0;
  const rate = opts.rate || 22, vol = (opts.vol ?? 0.5), t0 = ctx.currentTime + 0.02;
  const out = ctx.createGain(); out.gain.value = vol; out.connect(sfx.master);
  let t = t0, k = 0, n = 0;
  const ques = /\?\s*$/.test(text);
  for (let i = 0; i < text.length && n < (opts.max || 90); i++) {
    const c = text[i];
    if (c === ' ') { t += 0.6 / rate; continue; }
    if (/[.,!?;:]/.test(c)) { t += (c === ',' ? 2 : 3.2) / rate; continue; }
    const [v, cons] = babbleVowel(c);
    if (!v) continue;
    if (k++ % 2 && !BABBLE_V[c.toLowerCase()]) { t += 0.25 / rate; continue; }   // half the consonants fold into the vowels
    n++;
    const prog = i / Math.max(1, text.length);
    const pitch = voice.pitch * (1 + Math.sin(i * 1.7 + voice.seed) * 0.07 + (ques && prog > 0.75 ? (prog - 0.75) * 1.4 : 0) - prog * 0.06);
    const len = 0.07;
    const osc = ctx.createOscillator(); osc.type = voice.wave || 'sawtooth';
    osc.frequency.setValueAtTime(pitch * 1.06, t); osc.frequency.exponentialRampToValueAtTime(pitch, t + len * 0.6);
    const [f1, f2] = BABBLE_V[v];
    const sh = voice.formant || 1;
    const b1 = ctx.createBiquadFilter(); b1.type = 'bandpass'; b1.frequency.value = f1 * sh; b1.Q.value = 5;
    const b2 = ctx.createBiquadFilter(); b2.type = 'bandpass'; b2.frequency.value = f2 * sh; b2.Q.value = 7;
    const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(0.9, t + 0.008); env.gain.setValueAtTime(0.9, t + len * 0.55); env.gain.exponentialRampToValueAtTime(0.001, t + len);
    const g2 = ctx.createGain(); g2.gain.value = 0.55;
    osc.connect(b1); osc.connect(b2); b1.connect(env); b2.connect(g2); g2.connect(env); env.connect(out);
    osc.start(t); osc.stop(t + len + 0.02);
    if (cons === 'stop' || cons === 'hiss') {
      const src = ctx.createBufferSource(); src.buffer = sfx.noise;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = cons === 'hiss' ? 3500 : 1800;
      const ne = ctx.createGain(); ne.gain.setValueAtTime(cons === 'hiss' ? 0.25 : 0.4, t); ne.gain.exponentialRampToValueAtTime(0.001, t + (cons === 'hiss' ? 0.04 : 0.015));
      src.connect(hp); hp.connect(ne); ne.connect(out); src.start(t, Math.random() * 0.5); src.stop(t + 0.05);
    }
    t += 1 / rate;
  }
  setTimeout(() => { try { out.disconnect(); } catch (e) { /* gone */ } }, (t - ctx.currentTime + 0.5) * 1000);
  return t - t0;
}
function npcVoice(seed) { const r = mulberry32(seed ^ 0x51ed); return { pitch: 150 + r() * 170, formant: 0.85 + r() * 0.35, wave: r() < 0.35 ? 'triangle' : 'sawtooth', seed: seed % 97 }; }

// ---- the village's day, and the people in it (host) ---------------------------------------------------------
const NPC = {
  active: new Map(),   // village id -> { v, ents: [] }
  tickT: 0,
};
const npcDay = (g) => g.meta.day || 0;
function villageRec(g, vid) { const m = g.meta.villages || (g.meta.villages = {}); return m[vid] || (m[vid] = { dead: {} }); }
function villageById(g, vid) { const m = /^[vt](-?\d+)_(-?\d+)$/.exec(vid); return m && g.world && g.world.gen.villageAt ? g.world.gen.villageAt(+m[1], +m[2]) : null; }
function villageAtPos(g, x, z, pad = 0) { if (g.dim !== 0 || !g.world || !g.world.gen.villagesNear) return null; const l = g.world.gen.villagesNear(x, z, pad); return l[0] || null; }
function npcSeedOf(v, i) { return hash32(v.seed, i, 77, 5) % 100000; }

function npcSpawn(g, v, i, kind) {
  const f = kind === 'folk' ? v.folk[i] : null;
  const job = kind === 'guard' ? 'guard' : kind === 'golem' ? 'golem' : f.job;
  const night = npcNight(g);
  let at;
  if (kind === 'golem') at = [v.x + 3.5, v.y + 1, v.z + 3.5];
  else if (kind === 'guard') at = [v.x + (i % 2 ? -3.5 : 3.5), v.y + 1, v.z + (i < 2 ? 3.5 : -3.5)];
  else if (night) at = [f.home.at[0] + 0.5, f.home.at[1], f.home.at[2] + 0.5];
  else if (f.work) at = [f.work.at[0] + 0.5, f.work.at[1], f.work.at[2] + 0.5];
  else at = [f.home.at[0] + 0.5, f.home.at[1], f.home.at[2] + 0.5];
  const type = kind === 'golem' ? 'iron_golem' : kind === 'guard' ? 'village_guard' : 'villager';
  const e = new Mob(g, type, at[0], at[1], at[2]);
  const seed = kind === 'golem' ? 0 : npcSeedOf(v, kind === 'guard' ? 100 + i : i);
  e.npc = { v: v.id, i: kind === 'guard' ? 100 + i : kind === 'golem' ? 200 + i : i, n: kind === 'golem' ? 'Iron Golem' : npcName(seed), j: job, s: seed, p: 0 };
  if (kind === 'guard') { e.heldItem = 'iron_sword'; e.npcArmor = ['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots']; }
  else if (kind !== 'golem') e.heldItem = (NPC_JOBS[job] || {}).held || null;
  if (e.heldItem && !ITEMS[e.heldItem]) e.heldItem = null;
  g.addEntity(e);
  e.kept = false;
  return e;
}
function npcNight(g) { const ph = (g.meta.time || 0) / DAY_LEN; return ph > 0.53 && ph < 0.985; }
function npcPhase(g) { return (g.meta.time || 0) / DAY_LEN; }
// (alpha 3) bed between ten and eleven at night, each to their own hour (a campaign's held evening keeps them up with you)
function npcBedtime(N) { return 0.665 + ((N.s >> 3) % 6) * 0.012; }
// where someone spends this evening: a seat at the tavern or the inn, a bench on the square, or home
function npcEvening(g, v, e, day) {
  const N = e.npc;
  if (!v._evening || v._evening.day !== day) {
    if (!v._tavern) {
      const tv = [], bench = [];
      for (const b of v.blds || []) if ((b.type === 'tavern' || b.type === 'hall') && b.seats) tv.push(...b.seats);
      for (const s of v.seats || []) if (s.length === 4) bench.push(s);
      v._tavern = tv; v._bench = bench;
      const ch = (v.blds || []).find(b => b.type === 'chapel'); v._chapel = ch ? vWorld(ch, (ch.W - 1) / 2, 1, -1) : null;
      if (v._chapel) v._chapel = [v._chapel[0] + 0.5, v._chapel[1], v._chapel[2] + 0.5];
    }
    v._evening = { day, seats: new Map(), usedT: 0, usedB: 0 };
  }
  const E = v._evening;
  if (E.seats.has(N.i)) return E.seats.get(N.i);
  const r = hashFloat(N.s, day, 17, 3);
  let out;
  if (r < 0.55 && E.usedT < v._tavern.length) out = { seat: v._tavern[E.usedT++] };
  else if (r < 0.75 && E.usedB < v._bench.length) out = { seat: v._bench[E.usedB++] };
  else out = { home: true };
  E.seats.set(N.i, out);
  return out;
}

// bring villages to life near players, and let them go when everyone leaves
function npcTick(g, dt) {
  if (g.isGuest || g.dim !== 0 || !g.world || !g.world.gen.villagesNear) return;
  if ((NPC.tickT -= dt) > 0) return;
  NPC.tickT = 1.2;
  const ps = g.pawns().filter(p => !p.dead);
  const want = new Map();
  for (const p of ps) for (const v of g.world.gen.villagesNear(p.x, p.z, 72)) want.set(v.id, v);
  for (const [id, a] of NPC.active) {
    if (want.has(id)) continue;
    const far = ps.every(p => Math.hypot(p.x - a.v.x, p.z - a.v.z) > a.v.r + 110);
    if (far) { for (const e of a.ents) e.remove = true; NPC.active.delete(id); }
  }
  for (const [id, v] of want) {
    let a = NPC.active.get(id);
    // only once the middle of the village is there to stand on
    const ch = g.world.chunkAt(v.x >> 4, v.z >> 4);
    if (!ch || !ch.mesh) continue;
    if (!a) { a = { v, ents: [] }; NPC.active.set(id, a); }
    const rec = villageRec(g, id), day = npcDay(g);
    a.ents = a.ents.filter(e => !e.remove);
    const has = new Set(a.ents.map(e => e.npc.i));
    v.folk.forEach((f, i) => {
      if (has.has(i)) return;
      if (rec.dead[i] !== undefined && day - rec.dead[i] < 2) return;      // someone new moves in after a couple of days
      const hc = g.world.chunkAt(f.home.at[0] >> 4, f.home.at[2] >> 4);
      if (!hc || !hc.mesh) return;
      delete rec.dead[i];
      a.ents.push(npcSpawn(g, v, i, 'folk'));
    });
    for (let i = 0; i < v.guards; i++) if (!has.has(100 + i) && !(rec.dead[100 + i] !== undefined && day - rec.dead[100 + i] < 1)) { delete rec.dead[100 + i]; a.ents.push(npcSpawn(g, v, i, 'guard')); }
    for (let i = 0; i < v.golems; i++) if (!has.has(200 + i) && !(rec.dead[200 + i] !== undefined && day - rec.dead[200 + i] < 3)) { delete rec.dead[200 + i]; a.ents.push(npcSpawn(g, v, i, 'golem')); }
    // the pens get their animals, once
    if (!rec.penned) {
      rec.penned = 1;
      for (const b of v.blds) if (b.type === 'pen' && MOB_TYPES[b.animals]) for (let k = 0; k < 3; k++) { const m = g.addEntity(new Mob(g, b.animals, b.mid[0] + 0.5 + (k - 1) * 1.2, b.mid[1], b.mid[2] + 0.5)); m.kept = true; m.fed = true; }
    }
  }
}

// ---- finding the way, doors and all ------------------------------------------------------------------------
const NPC_DOOR = new Uint8Array(MAX_BLOCKS);
for (const b of BLOCKS) if ((b.door && !/iron/.test(b.key)) || T_SHAPE[b.id] === SHAPE.GATE) NPC_DOOR[b.id] = 1;
function npcPath(w, sx, sy, sz, tx, ty, tz, maxNodes = 900) {
  const H = 2, R = 48;
  if (Math.abs(tx - sx) > R - 2 || Math.abs(tz - sz) > R - 2) return null;
  const pass = (x, y, z) => { const id = w.getBlock(x, y, z); return (!T_SOLID[id] || NPC_DOOR[id]) && !NAV_DANGER[id]; };
  const clear = (x, y, z) => pass(x, y, z) && pass(x, y + 1, z);
  const ground = (x, y, z) => { const id = w.getBlock(x, y - 1, z); return T_SOLID[id] && !NAV_NOSTAND[id] && !NAV_DANGER[id] && !NPC_DOOR[id] || T_LIQUID[id] === 1; };
  const stand = (x, y, z) => y > 0 && y < CH - H && clear(x, y, z) && ground(x, y, z);
  const key = (x, y, z) => ((x - sx + R) | ((z - sz + R) << 7) | (y << 14));
  const hfn = (x, y, z) => { const dx = Math.abs(x - tx), dz = Math.abs(z - tz); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz) + Math.abs(y - ty) * 0.6; };
  const open = new NavHeap(), seen = new Map();
  const start = { x: sx, y: sy, z: sz, g: 0, f: hfn(sx, sy, sz), p: null };
  open.push(start); seen.set(key(sx, sy, sz), start);
  let best = start, bestH = start.f, n = 0;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (open.size && n++ < maxNodes) {
    const c = open.pop();
    if (c.closed) continue;
    c.closed = true;
    const hc = hfn(c.x, c.y, c.z);
    if (hc < bestH) { bestH = hc; best = c; }
    if (c.x === tx && c.z === tz && Math.abs(c.y - ty) <= 1) { best = c; break; }
    for (const [dx, dz] of DIRS) {
      const nx = c.x + dx, nz = c.z + dz;
      if (Math.abs(nx - sx) >= R || Math.abs(nz - sz) >= R) continue;
      if (dx && dz && (!clear(c.x + dx, c.y, c.z) || !clear(c.x, c.y, c.z + dz) || NPC_DOOR[w.getBlock(c.x + dx, c.y, c.z)] || NPC_DOOR[w.getBlock(c.x, c.y, c.z + dz)])) continue;
      let ny = -1, cost = dx && dz ? 1.414 : 1;
      if (stand(nx, c.y, nz)) ny = c.y;
      else if (!dx || !dz) {
        if (pass(c.x, c.y + H, c.z) && stand(nx, c.y + 1, nz)) { ny = c.y + 1; cost += 0.6; }
        else if (clear(nx, c.y, nz)) { for (let d = 1; d <= 3; d++) if (stand(nx, c.y - d, nz)) { ny = c.y - d; cost += 0.3 * d; break; } else if (!pass(nx, c.y - d, nz)) break; }
      }
      if (ny < 0) continue;
      const fid = w.getBlock(nx, ny - 1, nz);
      if (fid === B.farmland) cost += 4;                       // keep off the crops
      if (T_LIQUID[w.getBlock(nx, ny, nz)]) cost += 3;
      const k = key(nx, ny, nz), g2 = c.g + cost;
      const old = seen.get(k);
      if (old && (old.closed || old.g <= g2)) continue;
      const node = { x: nx, y: ny, z: nz, g: g2, f: g2 + hfn(nx, ny, nz) * 1.1, p: c };
      seen.set(k, node); open.push(node);
    }
  }
  if (best === start) return null;
  const out = [];
  for (let c = best; c && c !== start; c = c.p) out.push([c.x, c.y, c.z]);
  return out.reverse();
}
Object.assign(Mob.prototype, {
  // walk to a spot: a path that goes through doors (opening them, and shutting them behind)
  npcGo(tx, ty, tz, dt, speed) {
    const d = Math.hypot(tx - this.x, tz - this.z);
    if (d < 0.45 && Math.abs(ty - this.y) < 1.5) { this.path = null; return null; }
    this.navT = (this.navT || 0) - dt;
    const ng = this.navGoal;
    if (this.navT <= 0 || !this.path || !ng || Math.hypot(tx - ng[0], tz - ng[2]) > 1) {
      this.navT = 2 + Math.random();
      this.path = npcPath(this.game.world, Math.floor(this.x), Math.floor(this.y + 0.45), Math.floor(this.z), Math.floor(tx), Math.floor(ty + 0.45), Math.floor(tz));
      this.pathI = 0; this.navGoal = [tx, ty, tz];
      if (!this.path) { this.stuckGo = (this.stuckGo || 0) + 1; return { want: speed * 0.6, dir: Math.atan2(-(tx - this.x), -(tz - this.z)) }; }
    }
    const P = this.path;
    while (this.pathI < P.length) {
      const nd = P[this.pathI];
      if (Math.hypot(nd[0] + 0.5 - this.x, nd[2] + 0.5 - this.z) < 0.4 && Math.abs(nd[1] - this.y) < 1.2) this.pathI++;
      else break;
    }
    if (this.pathI >= P.length) return { want: d < 0.45 ? 0 : speed * 0.5, dir: Math.atan2(-(tx - this.x), -(tz - this.z)) };
    const nd = P[this.pathI];
    if (nd[1] - this.y > 0.55 && this.onGround) this.wantJump = true;            // only a real step up: no hopping along the paths
    // a closed door on the way: open it
    for (const k of [this.pathI, this.pathI + 1]) {
      const q = P[k]; if (!q) continue;
      const w = this.game.world, id = w.getBlock(q[0], q[1], q[2]);
      if (NPC_DOOR[id] && Math.hypot(q[0] + 0.5 - this.x, q[2] + 0.5 - this.z) < 2.2) this.npcOpen(q[0], q[1], q[2]);
    }
    const prog = Math.hypot(this.x - (this._navX ?? this.x), this.z - (this._navZ ?? this.z));
    this._navX = this.x; this._navZ = this.z;
    this._stuckT = prog < dt * 0.25 ? (this._stuckT || 0) + dt : 0;
    if (this._stuckT > 1.5) { this._stuckT = 0; this.navT = 0; if (this.stepAhead()) this.wantJump = true; else this.sideStepT = 0.6; this.stuckGo = (this.stuckGo || 0) + 1; }
    // blocked by someone in the way: step round them for a moment instead of jumping
    if (this.sideStepT > 0) { this.sideStepT -= dt; return { want: speed * 0.7, dir: Math.atan2(-(nd[0] + 0.5 - this.x), -(nd[2] + 0.5 - this.z)) + (this.id % 2 ? 1.2 : -1.2) }; }
    return { want: speed, dir: Math.atan2(-(nd[0] + 0.5 - this.x), -(nd[2] + 0.5 - this.z)) };
  },
  npcOpen(x, y, z) {
    const w = this.game.world, id = w.getBlock(x, y, z), b = BLOCKS[id];
    let m = w.getMeta(x, y, z);
    if (b.door) {
      const lower = m & 16 ? y - 1 : y; m = w.getMeta(x, lower, z);
      if (m & 4) return;
      w.setBlock(x, lower, z, id, (m | 4) & ~16); w.setBlock(x, lower + 1, z, id, m | 4 | 16);
      this.game.sfx.playAt(doorSound(b, true), x + 0.5, lower + 1, z + 0.5);
      (this.npcDoors || (this.npcDoors = [])).push([x, lower, z, this.game.time]);
    } else if (T_SHAPE[id] === SHAPE.GATE && !(m & 4)) {
      w.setBlock(x, y, z, id, m | 4); this.game.sfx.playAt(doorSound(b, true), x + 0.5, y + 0.5, z + 0.5);
      (this.npcDoors || (this.npcDoors = [])).push([x, y, z, this.game.time]);
    }
  },
  npcShutDoors() {
    if (!this.npcDoors || !this.npcDoors.length) return;
    const w = this.game.world;
    this.npcDoors = this.npcDoors.filter(([x, y, z, t]) => {
      if (this.game.time - t < 1.2 || (Math.abs(this.x - x - 0.5) < 1.3 && Math.abs(this.z - z - 0.5) < 1.3 && Math.abs(this.y - y) < 2)) return true;
      if (this.game.pawns().some(p => Math.abs(p.x - x - 0.5) < 0.9 && Math.abs(p.z - z - 0.5) < 0.9 && Math.abs(p.y - y) < 2)) return true;
      const id = w.getBlock(x, y, z), b = BLOCKS[id], m = w.getMeta(x, y, z);
      if (b.door && (m & 4)) { w.setBlock(x, y, z, id, m & ~4); w.setBlock(x, y + 1, z, id, (m & ~4) | 16); this.game.sfx.playAt(doorSound(b, false), x + 0.5, y + 1, z + 0.5); }
      else if (T_SHAPE[id] === SHAPE.GATE && (m & 4)) { w.setBlock(x, y, z, id, m & ~4); this.game.sfx.playAt(doorSound(b, false), x + 0.5, y + 0.5, z + 0.5); }
      return false;
    });
  },
});

// ---- the mind of a villager ----------------------------------------------------------------------------------
const NPC_P = { sleep: 1, sit: 2, wave: 4, talk: 8, work: 16, read: 32, fold: 64, hoe: 128 };
function npcPickSpot(g, v, e, kind) {
  const r = Math.random;
  if (kind === 'plaza') { const lo = (v.fr || 1) + 2, a = r() * TAU, d = lo + r() * Math.max(1.5, (v.P || 7) - 2 - lo); return [v.x + 0.5 + Math.cos(a) * d, v.y + 1, v.z + 0.5 + Math.sin(a) * d]; }
  // somewhere along a road
  const road = v.roads[Math.floor(r() * v.roads.length)];
  const c = road.cells[Math.floor(r() * road.cells.length)];
  return [c[0] + 0.5, c[2] + 1, c[1] + 0.5];
}
function npcBrain(e, dt, p, dist) {
  const g = e.game, N = e.npc, v = villageById(g, N.v);
  if (!v) return { want: 0, dir: e.yaw };
  const T = e.T, ph = npcPhase(g), night = npcNight(g);
  const folk = N.i < 100 ? v.folk[N.i] : null;
  e.npcShutDoors();
  N.p = 0; e.pinned = false;
  if (e.waveT > 0) { e.waveT -= dt; N.p |= NPC_P.wave; }
  if (e.holdT > 0) {                                       // talking with someone: stand and face them
    e.holdT -= dt;
    const who = e.holdBy && (e.holdBy.player || e.holdBy);
    if (who) e.yaw = turnTo(e.yaw, Math.atan2(-(who.x - e.x), -(who.z - e.z)), dt * 8);
    N.p |= NPC_P.talk;
    return { want: 0, dir: e.yaw };
  }
  // hurt: run away from whoever did it
  if (e.panicT > 0 && !T.guard && !T.golem) {
    e.panicT -= dt;
    const f = e.fleeFrom;
    const away = f ? Math.atan2(-(e.x - f.x), -(e.z - f.z)) : e.yaw;
    return { want: T.speed * 1.5, dir: away + Math.sin(e.age * 2) * 0.3 };
  }
  // guards and golems: monsters (or whoever hurt the villagers) first
  if (T.guard || T.golem) {
    if (e.confront && !e.foe) { const m = npcConfront(e, dt); if (m) return m; }
    const foe = npcFoe(e, v);
    if (foe) return npcFight(e, foe, dt);
    // on watch: walk between the plaza and the ends of the roads; stop and look about now and then
    if (!e.goal || e.goalT <= 0 || Math.hypot(e.goal[0] - e.x, e.goal[2] - e.z) < 0.8) {
      if (e.goal && !e.lookT) { e.lookT = 2 + Math.random() * 4; }
      if (e.lookT > 0) { e.lookT -= dt; N.p |= T.guard ? NPC_P.fold : 0; if (e.lookT > 0) return { want: 0, dir: e.yaw }; e.lookT = 0; }
      if (T.golem) e.goal = npcPickSpot(g, v, e, 'plaza');
      else { const rd = v.roads[Math.floor(Math.random() * v.roads.length)], t = Math.min(rd.L, 6 + Math.floor(Math.random() * rd.L)); e.goal = Math.random() < 0.35 ? npcPickSpot(g, v, e, 'plaza') : [v.x + DXL[rd.d] * t + 0.5, v.y + 1, v.z + DZL[rd.d] * t + 0.5]; }
      e.goalT = 40;
    }
    e.goalT -= dt;
    const m = e.npcGo(e.goal[0], e.goal[1], e.goal[2], dt, T.speed * (T.golem ? 0.45 : 0.4));
    if (e.stuckGo > 6) { e.stuckGo = 0; e.goal = null; }
    return m || { want: 0, dir: e.yaw };
  }
  // ---- the day of a villager ----
  const J = NPC_JOBS[N.j] || NPC_JOBS.none, shop = !!NPC_SHOPS[N.j];
  let goal = null, act = null;
  // (alpha 3) a day with a shape: up at dawn, work (a day off a week each, chapel on the seventh day, the market on the
  // fourth), then the evening at the tavern, on the square's benches or at home, and bed late
  const day = Math.floor(g.meta.day || 0), wk = (day + (N.s % 7)) % 7, eve = npcEvening(g, v, e, day);
  const bed = folk && (ph >= 0.985 || (ph >= 0.5 && ph >= npcBedtime(N)));
  e._seat = null;
  if (bed) { goal = folk.home.at; act = 'sleep'; }
  else if (ph < 0.04) { goal = null; act = 'idle'; }
  else if (day % 7 === 6 && ph >= 0.05 && ph < 0.17 && v._chapel && N.j !== 'none' && (N.s % 3) !== 0) { goal = v._chapel; act = 'social'; e.goal = v._chapel; e.goalT = 5; }
  else if (folk && folk.work && wk !== 0 && (ph < 0.3 || (shop && ph < 0.46)) && !(day % 7 === 3 && !shop && ph > 0.18)) { goal = folk.work.at; act = 'work'; }
  else if (ph >= 0.43 && eve && eve.seat) {
    const s = e._seat = eve.seat;
    goal = s[4] ? [s[4][0], s[1], s[4][1]] : [s[0] + DXL[s[3]], s[1], s[2] + DZL[s[3]]]; act = 'sit';        // walk up to the bench (or the chair), then sit down on it
  } else if (ph >= 0.5 && eve && eve.home && folk) { goal = folk.home.at; act = 'home'; }
  else act = 'social';
  if (act === 'social') {
    if (!e.goal || e.goalT <= 0) { e.goal = npcPickSpot(g, v, e, Math.random() < 0.55 ? 'plaza' : 'road'); e.goalT = 25 + Math.random() * 25; }
    e.goalT -= dt; goal = e.goal;
  }
  // someone you know walking by: look at them, and wave the first time
  if (p && dist < 6 && !(p.player || p).dead && act !== 'sleep') {
    const key = (p.name || 'p');
    e.greeted = e.greeted || {};
    if (!e.greeted[key] || g.time - e.greeted[key] > 240) { e.greeted[key] = g.time; e.waveT = 1.4; if (dist < 5) npcMutter(e, NPC_HELLO); }
  }
  if (goal) {
    const d = Math.hypot(goal[0] + (act === 'social' ? 0 : 0.5) - e.x, goal[2] + (act === 'social' ? 0 : 0.5) - e.z);
    const gx = act === 'social' ? goal[0] : goal[0] + 0.5, gz = act === 'social' ? goal[2] : goal[2] + 0.5;
    const seated = act === 'sit' && (() => { const s = e._seat || v.seats[N.i % v.seats.length]; return Math.hypot(s[0] + 0.5 - e.x, s[2] + 0.5 - e.z) < 0.35 && Math.abs(e.y - s[1] - 0.25) < 0.3; })();
    if (d > 0.6 && !seated) {
      // stuck for a long time and nobody about to see it: step there (villagers know their way home)
      if (e.stuckGo > 8 && !g.pawns().some(q => Math.hypot(q.x - e.x, q.z - e.z) < 24)) { e.x = gx; e.y = goal[1] + 0.01; e.z = gz; e.stuckGo = 0; e.path = null; return { want: 0, dir: e.yaw }; }
      if (e.stuckGo > 10 && act === 'social') { e.goal = null; e.stuckGo = 0; }
      const m = e.npcGo(gx, goal[1], gz, dt, T.speed * (act === 'sleep' ? 0.55 : 0.42));
      if (m) return m;
    }
    e.stuckGo = 0;
    if (act === 'sleep') {
      const f = folk.home.f;
      e.x = goal[0] + 0.5 + DXL[f] * 0.5; e.z = goal[2] + 0.5 + DZL[f] * 0.5; e.y = goal[1] + 0.5625;
      e.yaw = Math.atan2(-DXL[f], -DZL[f]); N.p |= NPC_P.sleep; e.vx = e.vz = e.vy = 0; e.pinned = true;
      return { want: 0, dir: e.yaw };
    }
    // (0.9.0.11) on the seat the way you sit on one: half a block up, held still (no physics fighting the stair)
    if (act === 'sit') { const s = e._seat || v.seats[N.i % v.seats.length]; e.sitHeld = s[5] || null; e.x = s[0] + 0.5; e.z = s[2] + 0.5; e.y = s[1] + 0.25; e.vx = e.vy = e.vz = 0; e.yaw = Math.atan2(-DXL[s[3]], -DZL[s[3]]); N.p |= NPC_P.sit; e.pinned = true; e.path = null; return { want: 0, dir: e.yaw }; }
    if (act === 'work') {
      const f = folk.work.face; e.yaw = turnTo(e.yaw, Math.atan2(-DXL[f], -DZL[f]), dt * 6);
      if (J.work === 'read') N.p |= NPC_P.read;
      else if (J.work === 'hammer' || J.work === 'hoe') { e.workT = (e.workT || 0) - dt; if (e.workT <= 0) { e.workT = 1.1 + Math.random() * 0.8; e.swingT = 0.3; npcWorkSound(e); } }
      else if (p && dist < 5) e.yaw = turnTo(e.yaw, Math.atan2(-(p.x - e.x), -(p.z - e.z)), dt * 4);
      else N.p |= NPC_P.fold;
      return { want: 0, dir: e.yaw };
    }
  }
  // standing about: chat with a neighbour, or look at you
  if (p && dist < 5) { e.yaw = turnTo(e.yaw, Math.atan2(-(p.x - e.x), -(p.z - e.z)), dt * 4); return { want: 0, dir: e.yaw }; }
  const mate = e.chatMate && e.chatMate.alive && e.chatT > 0 ? e.chatMate : null;
  if (mate) { e.chatT -= dt; e.yaw = turnTo(e.yaw, Math.atan2(-(mate.x - e.x), -(mate.z - e.z)), dt * 5); N.p |= NPC_P.talk; if (Math.random() < dt * 0.3 && dist < 14) npcMutter(e, NPC_CHAT); return { want: 0, dir: e.yaw }; }
  if (Math.random() < dt * 0.15) {
    const o = g.entities.find(o => o !== e && o.npc && o.npc.v === N.v && !o.T.guard && !o.T.golem && Math.hypot(o.x - e.x, o.z - e.z) < 2.6 && !(o.chatT > 0));
    if (o) { e.chatMate = o; o.chatMate = e; e.chatT = o.chatT = 5 + Math.random() * 6; e.goal = o.goal = null; }
  }
  N.p |= NPC_P.fold;
  return { want: 0, dir: e.yaw };
}
function turnTo(a, b, k) { const d = ((b - a + Math.PI * 3) % TAU) - Math.PI; return a + d * Math.min(1, k); }
function npcWorkSound(e) {
  const j = e.npc.j;
  if (/smith|armorer|mason/.test(j)) e.game.sfx.playAt('anvil', e.x, e.y + 1, e.z);
  else if (j === 'farmer') e.game.sfx.playAt('dig_gravel', e.x, e.y + 0.5, e.z);
}
// guards and golems: a monster near the village, or someone who hurt the villagers
function npcFoe(e, v) {
  const g = e.game;
  if (e.foe && (!e.foe.alive && e.foe.alive !== undefined || e.foe.dead || e.foe.remove || e.foeT <= 0)) e.foe = null;
  if (e.foe) return e.foe;
  if ((e.scanT = (e.scanT || 0) - 0.05) > 0) return null;
  e.scanT = 0.6;
  let best = null, bd = e.T.golem ? 18 : 16;
  for (const m of g.entities) {
    if (!(m instanceof Mob) || !m.alive || !m.T.hostile || m.T.boss || m.remove) continue;
    const d = Math.hypot(m.x - e.x, m.z - e.z);
    if (d < bd && Math.hypot(m.x - v.x, m.z - v.z) < v.r + 20 && Math.abs(m.y - e.y) < 8) { bd = d; best = m; }
  }
  if (best) { e.foe = best; e.foeT = 30; }
  return best;
}
function npcFight(e, foe, dt) {
  const T = e.T, dx = foe.x - e.x, dz = foe.z - e.z, d = Math.hypot(dx, dz), dy = foe.y - e.y;
  e.foeT -= dt;
  const reach = T.golem ? 2.2 : 1.6;
  if (d < reach + (foe.w || 0.3) && Math.abs(dy) < 2.2 && e.attackCd <= 0) {
    e.attackCd = T.golem ? 1.4 : 0.9; e.swingT = 0.3;
    const dmg = T.golem ? 7 + Math.floor(Math.random() * 8) : T.damage;
    foe.hurt(dmg, { type: 'mob', attacker: e, knock: T.golem ? 2 : 1 });
    if (T.golem && foe.vy !== undefined && !foe.player) foe.vy = 7;
    if (T.golem) e.game.sfx.playAt('anvil_land', e.x, e.y + 1.5, e.z);
  }
  const toFoe = Math.atan2(-dx, -dz);
  if (d < reach * 0.8) return { want: 0, dir: toFoe };
  return { want: T.speed * (T.golem ? 0.8 : 1), dir: (d > 2.5 ? e.navDir(foe.x, foe.y, foe.z, dt) : null) ?? toFoe };
}
// a few words under their breath when you pass (a short babble from where they stand)
const NPC_HELLO = ['Hello!', 'Oh, hi there!', 'Lovely day.', 'Welcome!', 'Hm-hm!', 'Good to see you.', 'Ah, a traveller!'];
const NPC_CHAT = ['Did you hear?', 'Mm-hm, mm-hm.', 'No! Really?', 'The harvest, you know...', 'Ha ha!', 'Well I never.'];
function npcMutter(e, lines) {
  const g = e.game, lp = g.local;
  if (!lp || g.isGuest && false) return;
  const P = lp.player, d = Math.hypot(P.x - e.x, P.z - e.z);
  if (d > 14 || (e.mutterT && g.time - e.mutterT < 6)) return;
  e.mutterT = g.time;
  babble(g.sfx, lines[Math.floor(Math.random() * lines.length)], npcVoice(e.npc.s), { vol: 0.35 / (1 + d / 4), max: 10 });
}

// hooks: the brain runs in place of any other, and they're drawn as people
{
  const baseCtl = Mob.prototype.controlAI;
  Mob.prototype.controlAI = function (dt, p, dist, dyp, toPlayer) {
    if (this.npc && !this.ghost) return npcBrain(this, dt, p, dist);
    if (this.T.golem && !this.ghost) return { want: 0, dir: this.yaw };
    return baseCtl.call(this, dt, p, dist, dyp, toPlayer);
  };
  const baseDraws = Mob.prototype.draws;
  Mob.prototype.draws = function (out, viewer) {
    if (!this.npc || this.T.golem) return baseDraws.call(this, out, viewer);
    const gl = this.game.renderer.gl, N = this.npc;
    const skin = npcSkin(gl, N.s, N.j);
    const l = this.game.world.getLight(Math.floor(this.x), Math.floor(this.y + 1), Math.floor(this.z));
    const P = N.p || 0, sleep = !!(P & NPC_P.sleep);
    const look = this.lookAt || viewer;
    let headYaw = 0, headPitch = 0;
    if (look && !sleep) {
      const lx = (look.player || look).x - this.x, lz = (look.player || look).z - this.z, ly = (look.player || look).y + 1.5 - (this.y + 1.6), d = Math.hypot(lx, lz);
      if (d < 8) { const want = Math.atan2(-lx, -lz); headYaw = clamp(((want - this.yaw + Math.PI * 3) % TAU) - Math.PI, -1.1, 1.1); headPitch = clamp(-Math.atan2(ly, d), -0.5, 0.5); }
    }
    this.hy = (this.hy || 0) + (headYaw - (this.hy || 0)) * 0.15;
    const pose = {
      x: this.x, y: this.y - (P & NPC_P.sit ? 0.45 : 0), z: this.z, yaw: this.yaw, headPitch, headYaw: this.hy,
      walk: this.walk * 1.4, walkAmt: Math.min(1, this.walkAmt || 0), swing: this.swingT > 0 ? 1 - this.swingT / 0.3 : 0,
      held: sleep || (P & NPC_P.read && N.j !== 'librarian') ? null : (P & NPC_P.sit) && this.sitHeld ? this.sitHeld : this.heldItem, sit: !!(P & NPC_P.sit), sleep, time: this.game.time + (N.s % 50),
      light: [l >> 4, l & 15], deathT: this.deathTime > 0 ? Math.min(1, this.deathTime * 2) : 0, tint: this.hurtTime > 0 ? [1, 0.15, 0.1, 0.4] : null,
      armor: this.npcArmor || null, wave: P & NPC_P.wave ? 1 : 0, talk: !!(P & NPC_P.talk), fold: !!(P & NPC_P.fold), read: !!(P & NPC_P.read),
    };
    if (sleep) { pose.y -= 0.2; pose.headPitch = 0; pose.headYaw = 0; }
    avatarDraws(out, gl, skin, pose);
  };
  // what's sent to other players: who they are and what they're doing
  const baseSnap = Mob.prototype.snap;
  Mob.prototype.snap = function () { const s = baseSnap.call(this); if (this.npc) { s.np = this.npc; s.na = this.npcArmor || 0; } return s; };
  const baseApply = Mob.prototype.applySnap;
  Mob.prototype.applySnap = function (o) { baseApply.call(this, o); if (o.np) { this.npc = o.np; this.npcArmor = o.na || null; } };
  // hurt: the guards and the golem come for whoever did it; the village remembers
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    if ((this.npc || this.T.golem) && src.attacker && src.attacker.npc && src.attacker.npc.v === (this.npc && this.npc.v)) return 0;   // no friendly fire
    const a = src.attacker, who = a && (a instanceof LocalPlayer || (typeof RemotePawn === 'function' && a instanceof RemotePawn)) ? a : null;
    const dealt = baseHurt.call(this, amount, src);
    if (dealt > 0 && (this.npc || this.T.golem) && who && !this.game.isGuest) {
      const g = this.game, vid = this.npc ? this.npc.v : (villageAtPos(g, this.x, this.z, 16) || {}).id;
      const defender = this.T.guard || this.T.golem;
      if (!defender) { this.panicT = 4; this.fleeFrom = who.player || who; }
      this.holdT = 0;
      if (vid) npcOffend(g, who, vid, this, !this.alive);
    }
    return dealt;
  };
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const r = baseDie.call(this, src);
    const g = this.game;
    if (this.npc && !g.isGuest) {
      const rec = villageRec(g, this.npc.v); rec.dead[this.npc.i] = npcDay(g);
      for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 40) l.toast(this.npc.n + (this.T.guard ? ' the guard' : '') + ' has died', 'warn');
    }
    // monsters slain: bounties, and the village's thanks for one killed near it
    const a = src && src.attacker;
    if (this.T.hostile && a && !g.isGuest) {
      if (a instanceof LocalPlayer) questKill(a, this.type);
      else if (typeof RemotePawn === 'function' && a instanceof RemotePawn) a.send({ t: 'adv', k: 'kill', m: this.type });
      const v = villageAtPos(g, this.x, this.z, 24);
      if (v && (a instanceof LocalPlayer || (typeof RemotePawn === 'function' && a instanceof RemotePawn))) npcRep(g, a, v.id, 1, 'defend');
    }
    return r;
  };
  // monsters don't come into being inside a village (they still walk in from outside)
  for (const k of ['spawnMobs', 'spawnMonsters']) {
    const base = Game.prototype[k];
    if (!base) continue;
    Game.prototype[k] = function (...a) { this._natSpawn = true; try { return base.apply(this, a); } finally { this._natSpawn = false; } };
  }
  const baseAdd = Game.prototype.addEntity;
  Game.prototype.addEntity = function (e) {
    if (this._natSpawn && e instanceof Mob && e.T.hostile && this.dim === 0 && e.y > SEA - 6) {
      for (const a of NPC.active.values()) if (Math.hypot(e.x - a.v.x, e.z - a.v.z) < a.v.r + 6) { e.remove = true; return e; }
    }
    return baseAdd.call(this, e);
  };
  // the villages wake as you come near
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { npcTick(this, dt); } catch (err) { console.warn('npc', err); } return baseUpd.call(this, dt); };
  // a different world: nobody carries over
  const baseLoad = Game.prototype.loadDimension;
  Game.prototype.loadDimension = function (dim) { if (!this._ctxBuild) NPC.active.clear(); return baseLoad.call(this, dim); };
}

// ---- accidents happen: a warning first, the sword second ---------------------------------------------------
// Hit a villager (or a guard, or the golem) and the nearest guard comes over to have a word: say sorry and
// that's the end of it. Do it again while they still remember (a couple of minutes), hurt the guard who's
// talking to you, or kill someone, and the guards and the golem fight you.
NPC.offence = new Map();
function npcOffend(g, who, vid, victim, killed) {
  const key = (who.name || 'p') + '|' + vid, now = g.time;
  const o = NPC.offence.get(key) || { strikes: 0, warnT: -1e9 };
  NPC.offence.set(key, o);
  const remembered = now - o.warnT < 150;
  const onDuty = victim && (victim.T.guard || victim.T.golem) && (victim.confront === who || victim.foe === who);
  const defenders = g.entities.filter(e => e.npc && e.T && (e.T.guard || e.T.golem) && e.alive && e.npc.v === vid && Math.hypot(e.x - victim.x, e.z - victim.z) < 40);
  if (killed || remembered || onDuty) {
    // that's no accident
    npcRep(g, who, vid, killed ? -30 : -4);
    for (const d of defenders) { d.foe = who; d.foeT = 30; d.confront = null; }
    o.strikes++; o.warnT = now; o.hostile = true;
    if (who instanceof LocalPlayer) { if (who.npcUI) who.npcUI.close(); who.toast(killed ? 'The guards are coming for you!' : 'That\'s it! The guards attack!', 'warn'); }
    else if (typeof RemotePawn === 'function' && who instanceof RemotePawn) who.send({ t: 'adv', k: 'confront', id: 0, hostile: 1 });
    return;
  }
  // the first time: someone comes to have a word (and saying sorry makes up for it)
  npcRep(g, who, vid, -1);
  o.strikes++; o.warnT = now; o.hostile = false; o.victim = victim.npc ? victim.npc.n : 'the golem'; o.victimGuard = !!victim.T.guard;
  const guards = defenders.filter(d => d.T.guard).sort((a, b) => Math.hypot(a.x - who.x, a.z - who.z) - Math.hypot(b.x - who.x, b.z - who.z));
  const speaker = guards[0] || null;
  if (speaker) { speaker.confront = who; speaker.confrontT = 30; speaker.confrontSaid = false; speaker.confrontVictim = o.victim; speaker.foe = null; }
  // the golem (with no guard about) just comes and looms
  else for (const d of defenders) if (d.T.golem) { d.confront = who; d.confrontT = 8; d.confrontSaid = false; }
  if (victim.npc && !victim.T.guard && !victim.T.golem && (who instanceof LocalPlayer)) babble(g.sfx, 'Ow! Hey!', npcVoice(victim.npc.s), { vol: 0.5 });
}
function npcForgive(g, who, vid) {
  const key = (who.name || 'p') + '|' + vid, o = NPC.offence.get(key);
  if (o) { o.forgiven = true; }
  for (const e of g.entities) if (e.npc && e.T && (e.T.guard || e.T.golem) && e.npc.v === vid && (e.confront === who || (who.player && e.confront === who))) { e.confront = null; e.goal = null; }
}
// a guard walking over to talk: returns a move, or null when there's nothing to do
function npcConfront(e, dt) {
  const who = e.confront, g = e.game;
  if (!who || who.dead || (who.player && who.player.dead) || (e.confrontT -= dt) <= 0) { e.confront = null; return null; }
  const P = who.player || who, d = Math.hypot(P.x - e.x, P.z - e.z);
  if (d > 28) { e.confront = null; return null; }
  const face = Math.atan2(-(P.x - e.x), -(P.z - e.z));
  if (d > 2.6) return e.npcGo(P.x, P.y, P.z, dt, e.T.speed * 0.7) || { want: e.T.speed * 0.6, dir: face };
  e.yaw = turnTo(e.yaw, face, dt * 6);
  if (!e.confrontSaid) {
    e.confrontSaid = true;
    if (e.T.golem) { if (who instanceof LocalPlayer) who.toast('The iron golem stares you down. Don\'t do that again.', 'warn'); e.confrontT = 3; }
    else if (who instanceof LocalPlayer) {
      if (who.mode === 'play') who.openNpcUI(() => new NpcTalk(who, e, { confront: true }));
      else who.toast(`${e.npc.n} the guard: "Hey! I saw that. Watch yourself."`, 'warn');
    } else if (typeof RemotePawn === 'function' && who instanceof RemotePawn) who.send({ t: 'adv', k: 'confront', id: e.id, victim: e.confrontVictim || '' });
  }
  e.npc.p |= e.T.golem ? 0 : NPC_P.fold;
  return { want: 0, dir: e.yaw };
}

// ---- standing with a village (each player their own) --------------------------------------------------------
function npcStats(p) { const s = p.stats || (p.stats = {}); s.vrep = s.vrep || {}; s.quests = s.quests || []; s.vstock = s.vstock || {}; s.qdone = s.qdone || {}; return s; }
function npcRep(g, who, vid, n, why) {
  if (!vid || !n) return;
  if (typeof RemotePawn === 'function' && who instanceof RemotePawn) { who.send({ t: 'adv', k: 'rep', v: vid, n, w: why || '' }); return; }
  const lp = who instanceof LocalPlayer ? who : null; if (!lp) return;
  const S = npcStats(lp.player), day = npcDay(g);
  if (why === 'defend' || why === 'trade') {          // a little at a time from these
    const k = why + ':' + vid; S.vcap = S.vcap || {};
    if (S.vcap[k] && S.vcap[k][0] === day && S.vcap[k][1] >= (why === 'trade' ? 6 : 4)) return;
    S.vcap[k] = S.vcap[k] && S.vcap[k][0] === day ? [day, S.vcap[k][1] + 1] : [day, 1];
  }
  const before = standingOf(S.vrep[vid] || 0);
  S.vrep[vid] = (S.vrep[vid] || 0) + n;
  const after = standingOf(S.vrep[vid]);
  const v = villageById(g, vid);
  if (after.k > before.k) lp.toast(`${v ? v.name : 'The village'} now counts you a ${after.name}`, after.k >= 5 ? 'epic' : 'good');
  else if (after.k < before.k) lp.toast(`${v ? v.name : 'The village'} trusts you less (${after.name})`, 'warn');
}

// ---- quests ---------------------------------------------------------------------------------------------------
const HUNT_FAMILIES = { ghoul: ['ghoul', 'husk', 'drowned', 'charred_ghoul'], skeleton: ['skeleton', 'stray'], spider: ['spider', 'cave_spider'], fuseling: ['fuseling'], slime: ['slime', 'magma_slime'], raider: ['raider', 'witch'] };
const HUNT_NAMES = { ghoul: 'ghouls', skeleton: 'skeletons', spider: 'spiders', fuseling: 'fuselings', slime: 'slimes', raider: 'marauders' };
// errands each kind of worker might ask of you: [item, count range, why]
const NPC_ERRANDS = {
  farmer: [['bone_meal', [6, 12], 'The soil is tired. Bone meal would help.'], ['wheat_seeds', [16, 32], 'The crows took my seed.'], ['bucket', [1, 1], 'My bucket sprang a leak.']],
  fisherman: [['string', [6, 10], 'My nets are torn to bits.'], ['stick', [8, 16], 'I need new rods.']],
  shepherd: [['wheat', [8, 16], 'The flock needs feeding.'], ['shears', [1, 1], 'I lost my shears in the meadow.']],
  fletcher: [['feather', [8, 16], 'Feathers for fletching, please.'], ['flint', [6, 12], 'I am out of flint for arrowheads.']],
  librarian: [['paper', [12, 24], 'I have run out of paper to copy the old books.'], ['feather', [4, 8], 'Quills! I need quills.']],
  cartographer: [['paper', [8, 16], 'Maps need paper, and lots of it.'], ['compass', [1, 1], 'My compass spins. I need a new one.']],
  cleric: [['spider_eye', [3, 6], 'For a tonic. Do not ask.'], ['bone', [6, 12], 'Bones, for the remedies.']],
  armorer: [['iron_ingot', [6, 12], 'The guards need new mail.'], ['coal', [12, 24], 'The forge is going cold.']],
  weaponsmith: [['iron_ingot', [6, 10], 'Swords for the guards. I need iron.'], ['coal', [12, 24], 'More coal for the forge!']],
  toolsmith: [['iron_ingot', [4, 8], 'Iron for new tools.'], ['coal', [12, 20], 'The forge eats coal.']],
  butcher: [['coal', [8, 16], 'For the smoker.'], ['porkchop', [4, 8], 'Pork. The tavern wants a feast.']],
  mason: [['stone', [32, 64], 'Stone for the new wall.'], ['clay_ball', [8, 16], 'Clay for bricks.']],
  jeweller: [['gold_ingot', [3, 6], 'Gold, for a ring.'], ['silver_ingot', [3, 6], 'Silver, for the settings.']],
  merchant: [['leather', [6, 10], 'Leather goods sell well.'], ['torch', [16, 32], 'The road is dark at night.']],
  baker: [['wheat', [16, 32], 'Flour for the ovens!'], ['egg', [6, 12], 'Eggs for the cakes.'], ['sugar', [6, 12], 'Something sweet is missing.']],
  innkeeper: [['sweet_berries', [12, 24], 'Berries for the pies.'], ['apple', [8, 12], 'Apples for the cider.']],
  none: [['bread', [3, 6], 'We are a bit short this week.'], ['log', [16, 32], 'Firewood for the winter.'], ['cobblestone', [32, 48], 'To fix the well.']],
  elder: [['emerald', [3, 5], 'For the village chest. Times are hard.']],
};
function questRand(...k) { return mulberry32(hash32(...k)); }
// today's work from one villager (or null)
function npcQuestFor(g, v, i) {
  const f = v.folk[i]; if (!f) return null;
  const day = npcDay(g), r = questRand(v.seed, i, day, 31);
  if (r() > 0.55) return null;
  const list = (NPC_ERRANDS[f.job] || NPC_ERRANDS.none).filter(q => ITEMS[q[0]]);
  if (!list.length) return null;
  const [item, [a, b], why] = list[Math.floor(r() * list.length)];
  const need = a + Math.floor(r() * (b - a + 1));
  const seed = npcSeedOf(v, i), name = npcName(seed);
  const em = 2 + Math.floor(r() * 3) + (need > 20 ? 1 : 0);
  return { id: v.id + ':' + i + ':' + day, vid: v.id, giver: i, from: name, kind: 'fetch', item, need, title: `${name}'s errand`, text: why + ` Bring ${need} ${itemDef(item).name}.`, reward: { em, xp: 15 + need, rep: 5 } };
}
// today's bounties on the board
function boardQuests(g, v) {
  const day = npcDay(g), out = [];
  for (let k = 0; k < 3; k++) {
    const r = questRand(v.seed, k, day, 32);
    if (k < 2) {
      const fams = Object.keys(HUNT_FAMILIES).filter(f => f !== 'raider' || r() < 0.3);
      const fam = fams[Math.floor(r() * fams.length)], need = fam === 'fuseling' ? 3 + Math.floor(r() * 3) : fam === 'raider' ? 3 + Math.floor(r() * 3) : 5 + Math.floor(r() * 8);
      out.push({ id: v.id + ':b' + k + ':' + day, vid: v.id, giver: -1, from: 'Quest Board', kind: 'hunt', fam, need, title: 'Bounty: ' + HUNT_NAMES[fam], text: `Monsters have been seen near ${v.name}. Slay ${need} ${HUNT_NAMES[fam]}.`, reward: { em: 2 + Math.ceil(need / 2), xp: 20 + need * 6, rep: 6, skill: ['melee', need * 25] } });
    } else {
      const list = [['log', 24, 48], ['cobblestone', 48, 64], ['iron_ingot', 6, 12], ['bread', 8, 16], ['coal', 16, 32], ['torch', 24, 48], ['wool', 8, 16], ['cooked_beef', 6, 12]].filter(q => ITEMS[q[0]]);
      const [item, a, b] = list[Math.floor(r() * list.length)], need = a + Math.floor(r() * (b - a + 1));
      out.push({ id: v.id + ':b' + k + ':' + day, vid: v.id, giver: -1, from: 'Quest Board', kind: 'fetch', item, need, title: 'Supplies: ' + itemDef(item).name, text: `${v.name} needs supplies for the stores. Bring ${need} ${itemDef(item).name}.`, reward: { em: 3 + Math.floor(need / 12), xp: 20 + need, rep: 6 } });
    }
  }
  return out;
}
function questHave(lp, q) {
  if (q.kind === 'hunt') return q.have || 0;
  const inv = lp.player.inv;
  return q.item === 'log' ? inv.countTag('#log') : inv.count(q.item);
}
function questReady(lp, q) { return questHave(lp, q) >= q.need; }
function questTake(lp, q) {
  const S = npcStats(lp.player);
  if (S.quests.length >= 5) { lp.toast('You already have five jobs — finish one first', 'warn'); return false; }
  if (S.quests.some(o => o.id === q.id) || S.qdone[q.id]) return false;
  S.quests.push(Object.assign({ have: 0, taken: npcDay(lp.g) }, q));
  lp.g.sfx.play('map_paper');
  lp.toast('Quest taken: ' + q.title, 'good');
  questHud(lp);
  return true;
}
function questFinish(lp, q) {
  const S = npcStats(lp.player), g = lp.g, p = lp.player;
  if (!questReady(lp, q)) return false;
  if (q.kind === 'fetch') { if (q.item === 'log') p.inv.removeTag('#log', q.need); else p.inv.remove(q.item, q.need); }
  S.quests = S.quests.filter(o => o.id !== q.id);
  S.qdone[q.id] = 1;
  // keep the done list short
  const ks = Object.keys(S.qdone); if (ks.length > 120) for (const k of ks.slice(0, ks.length - 120)) delete S.qdone[k];
  const R = q.reward || {};
  if (R.em) { const left = lp.give(mkStack(COIN(), R.em)); if (left > 0) g.dropItem(mkStack(COIN(), left), p.x, p.y + 1, p.z, true); }
  if (R.item && ITEMS[R.item[0]]) { const left = lp.give(mkStack(R.item[0], R.item[1])); if (left > 0) g.dropItem(mkStack(R.item[0], left), p.x, p.y + 1, p.z, true); }
  if (R.xp) lp.grantXP(R.xp, p.x, p.y + 1, p.z);
  if (R.skill && typeof skillGain === 'function') skillGain(lp, R.skill[0], R.skill[1]);
  npcRep(g, lp, q.vid, R.rep || 5);
  g.sfx.play('levelup');
  lp.toast(`Quest complete: ${q.title} (+${R.em || 0} ${COIN_NAME(R.em)})`, 'epic');
  S.questsDone = (S.questsDone || 0) + 1;
  questHud(lp);
  return true;
}
function questKill(lp, type) {
  const S = npcStats(lp.player);
  let hit = false;
  for (const q of S.quests) if (q.kind === 'hunt' && (HUNT_FAMILIES[q.fam] || []).includes(type) && (q.have || 0) < q.need) {
    q.have = (q.have || 0) + 1; hit = true;
    if (q.have >= q.need) lp.toast(`${q.title}: done — back to ${villageById(lp.g, q.vid) ? villageById(lp.g, q.vid).name : 'the village'} for the reward`, 'good');
  }
  if (hit) questHud(lp);
}
// the list of your jobs, top right
function questHud(lp) {
  if (!lp.el) return;
  let el = lp.el.querySelector('.quest-track');
  const S = npcStats(lp.player);
  if (!S.quests.length) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'quest-track'; lp.el.appendChild(el); }
  el.innerHTML = S.quests.slice(0, 5).map(q => {
    const have = Math.min(q.need, questHave(lp, q)), done = have >= q.need;
    return `<div class="qt${done ? ' done' : ''}"><b>${esc(q.title)}</b><span>${have}/${q.need}${done ? ' ✓' : ''}</span></div>`;
  }).join('');
}

// ---- talking with them: the conversation window -----------------------------------------------------------------
const NPC_GREET = {
  morning: ['Good morning!', 'Up early, are we?', 'Morning! The bread is still warm.'],
  day: ['Hello there!', 'Lovely weather.', 'What brings you to {v}?', 'Busy, busy, busy!'],
  evening: ['Good evening.', 'Long day, eh?', 'The lamps are lit. Stay a while.'],
  night: ['Zzz... oh! It is late, you know.', 'It is dangerous out at night!', 'Mmh? Come back in the morning.'],
};
const NPC_TALK = {
  any: ['The old roads go further than anyone remembers.', 'Folk say there are ruins under the hills.', 'Mind the fuselings. Nasty things.', 'The guards keep us safe at night.', 'The golem? Gentle as a lamb. With us.', 'I hear the deep caves glow with strange ores.', 'Have you seen the floating islands? My cousin swears they are real.'],
  farmer: ['Rain soon, I can feel it in my knees.', 'Bone meal makes the wheat sing.'],
  librarian: ['Books are windows to other worlds.', 'Some tomes in the old towers hold real magic, they say.'],
  cartographer: ['There is always more beyond the edge of the map.', 'Fill a map as you walk. It is half the fun.'],
  armorer: ['Steel is iron that has learned patience.', 'Bring me iron and coal and I will make you something sturdy.'],
  weaponsmith: ['Silver bites the undead. Remember that.', 'A good blade is a friend for life.'],
  toolsmith: ['Mithril lies deep, very deep.', 'Look after your tools and they look after you.'],
  guard: ['All quiet. For now.', 'Move along, citizen. Kindly.', 'I have seen things out past the lamps at night.'],
  elder: ['I have watched over {v} for many winters.', 'Strange lights in the sky lately... I do not like it.', 'Something watches from the edge of the world. I have seen him.'],
  innkeeper: ['Rooms are full, but the stew is hot!', 'Travellers bring the best stories.'],
  merchant: ['Everything has a price, friend.', 'Fresh from the road!'],
  baker: ['Bread! Pies! Cake for special days!'],
  jeweller: ['Rubies and sapphires lie in the same deep rock as iron.', 'A gem is just a stone that shines.'],
};
class NpcTalk {
  constructor(lp, e, opts = {}) {
    this.lp = lp; this.g = lp.g; this.e = e; const N = e.npc; this.opts = opts;
    this.v = villageById(this.g, N.v);
    this.job = N.j; this.J = NPC_JOBS[N.j] || NPC_JOBS.none; this.voice = npcVoice(N.s);
    const el = this.el = document.createElement('div');
    el.className = 'npc-talk';
    el.innerHTML = `<div class="nt-card"><div class="nt-face"></div><div class="nt-main"><div class="nt-name"><b>${esc(N.n)}</b><span>${esc(this.J.title)}${this.v ? ' of ' + esc(this.v.name) : ''}</span><em class="nt-stand"></em></div><div class="nt-text"></div><div class="nt-opts"></div></div></div>`;
    el.querySelector('.nt-face').appendChild(npcPortrait(N.s, N.j, 72));
    el.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); if (ev.target === el) this.close(); });
    this.onKey = (ev) => {
      if (ev.code === 'Escape' || ev.code === 'KeyE') { ev.preventDefault(); ev.stopPropagation(); this.close(); return; }
      const n = /^Digit([1-9])$/.exec(ev.code); if (n) { const b = this.el.querySelectorAll('.nt-opts button')[+n[1] - 1]; if (b) { ev.preventDefault(); ev.stopPropagation(); b.click(); } }
    };
    window.addEventListener('keydown', this.onKey, true);
    lp.el.appendChild(el);
    this.sel = 0;
    this.hold();
    if (opts.confront) this.confront(); else this.home();
  }
  // a guard having a word about what you just did
  confront() {
    const victim = this.opts.victim || this.e.confrontVictim || 'one of ours', mine = this.opts.victim === 'me' || victim === this.e.npc.n;
    this.say(mine ? 'Whoa! Watch where you swing that! Do that again and we\'ll have a problem.' : `Hey! I saw that. What do you think you're doing, hitting ${victim}?`);
    const sorry = (line) => () => {
      if (this.g.isGuest) { if (this.g.net) this.g.net.send({ t: 'adv', k: 'sorry', v: this.e.npc.v, li: this.lp.index || 0 }); }
      else { npcForgive(this.g, this.lp, this.e.npc.v); npcRep(this.g, this.lp, this.e.npc.v, 1); }
      this.say(line);
      this.options([['Thanks. It won\'t happen again.', () => this.close()]]);
    };
    this.options([
      ['Sorry! It was an accident.', sorry('Alright. Accidents happen. Just be more careful around here.')],
      ['I didn\'t mean to, I\'ll be careful.', sorry('Hmph. Fine. I\'ll be keeping an eye on you.')],
      ['Mind your own business.', () => { this.say('Watch yourself, stranger. Next time you\'ll answer to my sword.'); this.options([['…', () => this.close()]]); }],
    ]);
  }
  stand() { const S = npcStats(this.lp.player); return standingOf(this.v ? S.vrep[this.v.id] || 0 : 0); }
  hold() { const e = this.e, g = this.g; if (g.isGuest) { if (g.net) g.net.send({ t: 'adv', k: 'hold', id: e.id }); } else { e.holdT = 3; e.holdBy = this.lp; } }
  say(text) {
    const t = this.el.querySelector('.nt-text');
    text = text.replace(/\{v\}/g, this.v ? this.v.name : 'the village').replace(/\{p\}/g, this.lp.name || 'friend');
    t.textContent = ''; this.full = text; this.shown = 0; this.typing = true;
    babble(this.g.sfx, text, this.voice, { rate: 26 });
    this.el.querySelector('.nt-stand').textContent = this.v ? this.stand().name : '';
  }
  options(list) {
    const o = this.el.querySelector('.nt-opts');
    o.innerHTML = '';
    list.forEach(([label, fn, cls], i) => { const b = document.createElement('button'); b.className = 'btn nt-opt' + (cls ? ' ' + cls : ''); b.innerHTML = `<i>${i + 1}</i>${label}`; b.onclick = () => { this.g.sfx.play('click'); fn(); }; o.appendChild(b); });
    this.sel = 0; this.mark();
  }
  mark() { this.el.querySelectorAll('.nt-opt').forEach((b, i) => b.classList.toggle('sel', i === this.sel)); }
  greeting() {
    const ph = npcPhase(this.g), k = ph < 0.12 ? 'morning' : ph < 0.42 ? 'day' : ph < 0.53 ? 'evening' : 'night';
    const s = this.stand();
    if (s.k === 0) return 'Hmph. We remember what you did. What do you want?';
    const list = NPC_GREET[k];
    let line = list[Math.floor(Math.random() * list.length)];
    if (s.k >= 5) line = ['Our hero! ', 'Ah, my friend! ', 'Welcome back, friend! '][Math.floor(Math.random() * 3)] + line;
    return line;
  }
  home(text) {
    const lp = this.lp, N = this.e.npc, v = this.v;
    this.say(text || this.greeting());
    const opts = [];
    if (NPC_SHOPS[this.job]) opts.push(['Let me see your wares', () => this.shop()]);
    // their errand, or handing it in
    const S = npcStats(lp.player);
    const mine = v && S.quests.find(q => q.vid === v.id && q.giver === N.i);
    const offer = v && N.i < 100 ? npcQuestFor(this.g, v, N.i) : null;
    const boardDone = v && S.quests.filter(q => q.vid === v.id && q.giver === -1 && questReady(lp, q));
    if (mine) opts.push([questReady(lp, mine) ? `Here's what you asked for (${esc(mine.title)})` : `About your errand…`, () => this.errand(mine)], );
    else if (offer && !S.qdone[offer.id]) opts.push(['Any work for me?', () => this.offer(offer)]);
    if (this.job === 'guard' || this.job === 'elder') if (boardDone && boardDone.length) opts.push([`I've done a bounty (${boardDone.length})`, () => { for (const q of boardDone) questFinish(lp, q); this.home('Well done! The village thanks you.'); }]);
    opts.push(['What news?', () => this.news()]);
    if (this.job === 'elder') opts.push(['Tell me about this place', () => this.home(`This is ${v ? v.name : 'our village'}. We are simple folk: farmers, smiths, traders. Help us and we will help you. The board by the well has work for brave hands.`)]);
    opts.push(['Goodbye', () => this.close()]);
    this.options(opts);
  }
  news() {
    const list = (NPC_TALK[this.job] || []).concat(NPC_TALK.any);
    let line = list[Math.floor(Math.random() * list.length)];
    // sometimes a pointer to another village
    if (Math.random() < 0.3 && this.v) {
      const gen = this.g.world.gen; let best = null, bd = 1e9;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { if (!dx && !dz) continue; const o = gen.villageAt(this.v.rx + dx, this.v.rz + dz); if (o) { const d = Math.hypot(o.x - this.v.x, o.z - this.v.z); if (d < bd) { bd = d; best = o; } } }
      if (best) { const ang = Math.atan2(best.z - this.v.z, best.x - this.v.x), dirs = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']; line = `${best.name} lies some ${Math.round(bd / 50) * 50} blocks to the ${dirs[(Math.round(ang / (Math.PI / 4)) + 8) % 8]}. Good folk there.`; }
    }
    this.home(line);
  }
  offer(q) {
    const R = q.reward;
    this.say(q.text + ` I can pay ${R.em} ${COIN_NAME(R.em)}.`);
    this.options([['I\'ll do it', () => { if (questTake(this.lp, q)) this.home('Thank you! Come back when you have it.'); }], ['Not right now', () => this.home('Maybe another time, then.')]]);
  }
  errand(q) {
    const lp = this.lp, have = questHave(lp, q);
    if (questReady(lp, q)) { questFinish(lp, q); this.home('Wonderful! Just what I needed. Here, take this.'); return; }
    this.say(`I still need ${q.need} ${itemDef(q.item).name}. You have ${have}.`);
    this.options([['I\'ll get them', () => this.home('Thank you!')], ['I can\'t do it after all', () => { const S = npcStats(lp.player); S.quests = S.quests.filter(o => o.id !== q.id); questHud(lp); this.home('Oh. Never mind, then.'); }]]);
  }
  shop(tab) {
    this.tab = tab || this.tab || 'buy';
    new NpcShop(this);
  }
  frame(dt, inp) {
    if (!this.el.isConnected) return;
    if (this.typing) {
      this.shown = Math.min(this.full.length, this.shown + dt * 26);
      this.el.querySelector('.nt-text').textContent = this.full.slice(0, Math.floor(this.shown));
      if (this.shown >= this.full.length) this.typing = false;
    }
    this.hold();
    const P = this.lp.player;
    if (!this.e.alive || this.e.remove || Math.hypot(P.x - this.e.x, P.z - this.e.z) > 7) { this.close(); return; }
    if (this.shopEl) { if (this.shopUI) this.shopUI.frame(dt, inp); return; }
    if (inp.padB || inp.padStart || inp.inventory) { this.close(); return; }
    const n = this.el.querySelectorAll('.nt-opt').length;
    if (inp.navY) { this.sel = (this.sel + (inp.navY > 0 ? 1 : n - 1)) % n; this.mark(); }
    if (inp.padA) { const b = this.el.querySelectorAll('.nt-opt')[this.sel]; if (b) b.click(); }
  }
  close() {
    const lp = this.lp, g = this.g;
    window.removeEventListener('keydown', this.onKey, true);
    if (this.shopUI) this.shopUI.close(true);
    this.el.remove();
    if (lp.npcUI === this) lp.npcUI = null;
    if (lp.mode === 'npc') lp.mode = 'play';
    if (!g.isGuest) this.e.holdT = 0.5;
    if (lp.useKb && !g.input.touchMode && g.state === 'playing') g.input.requestLock();
  }
}
// the shop: what they sell, and what they'll buy from you
class NpcShop {
  constructor(talk) {
    this.t = talk; talk.shopUI = this;
    const el = this.el = talk.shopEl = document.createElement('div');
    el.className = 'npc-shop';
    talk.el.querySelector('.nt-card').appendChild(el);
    talk.el.classList.add('shopping');
    this.sel = 0;
    this.draw();
  }
  lines() {
    const t = this.t, sh = NPC_SHOPS[t.job], st = t.stand(), list = sh[t.tab] || [];
    const disc = st.k >= 6 ? 0.8 : st.k >= 5 ? 0.9 : 1;
    return list.filter(l => ITEMS[l[0]]).map((l, i) => ({ i, id: l[0], n: l[1], price: Math.max(1, Math.round(l[2] * (COIN() === 'gold_coin' ? 4 : 1) * (t.tab === 'buy' ? disc : 1))), tier: l[3], locked: l[3] > st.tier, key: t.tab + i }));
  }
  stockOf(line) {
    const t = this.t, S = npcStats(t.lp.player), k = (t.v ? t.v.id : 'camp:' + (t.e.npc.cid || '')) + ':' + t.e.npc.i, day = npcDay(t.g);   // (Shadowbloom) a merchant on the road has no village
    const rec = S.vstock[k] && S.vstock[k].d === day ? S.vstock[k] : (S.vstock[k] = { d: day, u: {} });
    return { left: 12 - (rec.u[line.key] || 0), rec };
  }
  draw() {
    const t = this.t, inv = t.lp.player.inv, em = inv.count(COIN());
    const L = this.lines();
    const ico = (id) => `<i class="ico" style="background-position:${iconPos(id)}"></i>`;
    const rows = L.map((l, k) => {
      const { left } = this.stockOf(l);
      const can = !l.locked && left > 0 && (t.tab === 'buy' ? em >= l.price : (l.id === 'log' ? inv.countTag('#log') : inv.count(l.id)) >= l.n);
      const give = t.tab === 'buy' ? `${ico(COIN())}<b>${l.price}</b>` : `${ico(l.id)}<b>${l.n}</b>`;
      const get = t.tab === 'buy' ? `${ico(l.id)}<b>${l.n}</b> <span>${esc(itemDef(l.id).name)}</span>` : `${ico(COIN())}<b>${l.price}</b> <span>for ${esc(itemDef(l.id).name)}</span>`;
      return `<button class="sh-row${can ? '' : ' no'}${l.locked ? ' locked' : ''}${k === this.sel ? ' sel' : ''}" data-k="${k}"><span class="sh-give">${give}</span><em>→</em><span class="sh-get">${get}</span><small>${l.locked ? TIER_NAME[l.tier] + ' only' : left > 0 ? left + ' left' : 'sold out'}</small></button>`;
    }).join('');
    this.el.innerHTML = `<div class="sh-head"><button class="btn tiny${t.tab === 'buy' ? ' on' : ''}" data-tab="buy">Buy</button><button class="btn tiny${t.tab === 'sell' ? ' on' : ''}" data-tab="sell">Sell</button><span class="sh-em">${ico(COIN())}${em}</span><button class="btn tiny" data-back="1">Back</button></div><div class="sh-list">${rows || '<p>Nothing today.</p>'}</div><div class="sh-hint">${esc(t.stand().name)} prices · they restock each morning</div>`;
    this.el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { t.tab = b.dataset.tab; this.sel = 0; t.g.sfx.play('click'); this.draw(); });
    this.el.querySelector('[data-back]').onclick = () => this.close();
    this.el.querySelectorAll('.sh-row').forEach(b => b.onclick = () => this.trade(L[+b.dataset.k]));
    // (alpha 3) keep the row the controller is on in view: long lists scroll with it
    const sel = this.el.querySelector('.sh-row.sel'); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
  }
  trade(l) {
    const t = this.t, lp = t.lp, p = lp.player, inv = p.inv, g = t.g;
    if (!l || l.locked) { if (l) t.say(`I keep that for my ${TIER_NAME[l.tier].toLowerCase()}s. Help the village and we'll see.`); return; }
    const { left, rec } = this.stockOf(l);
    if (left <= 0) { t.say('All gone for today. Come back tomorrow!'); return; }
    if (t.tab === 'buy') {
      if (inv.count(COIN()) < l.price) { t.say(`That's ${l.price} ${COIN_NAME(l.price)}. You haven't enough.`); g.sfx.play('click_off'); return; }
      inv.remove(COIN(), l.price);
      const left2 = lp.give(mkStack(l.id, l.n)); if (left2 > 0) g.dropItem(mkStack(l.id, left2), p.x, p.y + 1, p.z, true);
    } else {
      const have = l.id === 'log' ? inv.countTag('#log') : inv.count(l.id);
      if (have < l.n) { t.say(`I need ${l.n} of those.`); g.sfx.play('click_off'); return; }
      if (l.id === 'log') inv.removeTag('#log', l.n); else inv.remove(l.id, l.n);
      const left2 = lp.give(mkStack(COIN(), l.price)); if (left2 > 0) g.dropItem(mkStack(COIN(), left2), p.x, p.y + 1, p.z, true);
    }
    rec.u[l.key] = (rec.u[l.key] || 0) + 1;
    npcRep(g, lp, t.v.id, 1, 'trade');
    if (typeof skillGain === 'function') skillGain(lp, 'taming', 0);
    g.sfx.play('pickup');
    babble(g.sfx, ['Pleasure!', 'Thank you!', 'Deal!', 'Ooh, good choice.', 'Hm-hm!'][Math.floor(Math.random() * 5)], t.voice, { rate: 26, vol: 0.4 });
    this.draw();
  }
  frame(dt, inp) {
    if (inp.padB || inp.padStart || inp.inventory) { this.close(); return; }
    const n = this.el.querySelectorAll('.sh-row').length;
    if (inp.navY && n) { this.sel = (this.sel + (inp.navY > 0 ? 1 : n - 1)) % n; this.draw(); }
    if (inp.navX) { this.t.tab = this.t.tab === 'buy' ? 'sell' : 'buy'; this.sel = 0; this.draw(); }
    if (inp.padA) { const L = this.lines(); this.trade(L[this.sel]); }
  }
  close(quiet) {
    const t = this.t;
    this.el.remove(); t.shopEl = null; t.shopUI = null; t.el.classList.remove('shopping');
    if (!quiet) t.home('Anything else?');
  }
}
// the quest board on the plaza
class QuestBoard {
  constructor(lp, v) {
    this.lp = lp; this.g = lp.g; this.v = v;
    const el = this.el = document.createElement('div');
    el.className = 'quest-board';
    el.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); if (ev.target === el) this.close(); });
    this.onKey = (ev) => { if (ev.code === 'Escape' || ev.code === 'KeyE') { ev.preventDefault(); ev.stopPropagation(); this.close(); } };
    window.addEventListener('keydown', this.onKey, true);
    lp.el.appendChild(el);
    this.sel = 0;
    this.draw();
    this.g.sfx.play('map_paper');
  }
  draw() {
    const lp = this.lp, v = this.v, S = npcStats(lp.player), st = standingOf(S.vrep[v.id] || 0);
    const posted = boardQuests(this.g, v);
    const card = (q, mine) => {
      const have = mine ? Math.min(q.need, questHave(lp, q)) : 0, ready = mine && have >= q.need, done = S.qdone[q.id];
      const btn = done ? '<em>Done</em>' : ready ? `<button class="btn tiny primary" data-fin="${esc(q.id)}">Hand in</button>` : mine ? `<em>${have}/${q.need}</em>` : `<button class="btn tiny" data-take="${esc(q.id)}">Take it</button>`;
      return `<div class="qb-note${q.kind === 'hunt' ? ' hunt' : ''}${done ? ' done' : ''}"><b>${esc(q.title)}</b><p>${esc(q.text)}</p><div class="qb-rew"><i class="ico" style="background-position:${iconPos(COIN())}"></i>${q.reward.em} · ${q.reward.xp} xp</div>${btn}</div>`;
    };
    const mineHere = S.quests.filter(q => q.vid === v.id);
    this.el.innerHTML = `<div class="qb-card"><div class="qb-head"><b>${esc(v.name)} — Quest Board</b><span>You are a ${esc(st.name)} here (${S.vrep[v.id] || 0}${st.next !== null ? ' / ' + st.next : ''})</span></div>
      <div class="qb-grid">${posted.map(q => { const m = S.quests.find(o => o.id === q.id); return card(m || q, !!m); }).join('')}</div>
      ${mineHere.filter(q => q.giver >= 0).length ? `<div class="qb-sub">Errands for the folk of ${esc(v.name)}</div><div class="qb-grid">${mineHere.filter(q => q.giver >= 0).map(q => card(q, true)).join('')}</div>` : ''}
      <div class="qb-hint">New bounties every morning · villagers with a <b>!</b> over their heads have errands · E to close</div></div>`;
    this.el.querySelectorAll('[data-take]').forEach(b => b.onclick = () => { const q = posted.find(o => o.id === b.dataset.take); if (q) questTake(lp, q); this.draw(); });
    this.el.querySelectorAll('[data-fin]').forEach(b => b.onclick = () => {
      const q = S.quests.find(o => o.id === b.dataset.fin);
      if (q && q.giver >= 0) { lp.toast(`Take it to ${q.from} yourself`, ''); return; }
      if (q) questFinish(lp, q); this.draw();
    });
  }
  frame(dt, inp) {
    if (inp.padB || inp.padStart || inp.inventory) { this.close(); return; }
    const bs = [...this.el.querySelectorAll('.qb-note button')];
    if (inp.navX || inp.navY) { this.sel = (this.sel + ((inp.navX || inp.navY) > 0 ? 1 : bs.length - 1)) % Math.max(1, bs.length); bs.forEach((b, i) => b.classList.toggle('sel', i === this.sel)); if (bs[this.sel] && bs[this.sel].scrollIntoView) bs[this.sel].scrollIntoView({ block: 'nearest' }); }
    if (inp.padA && bs[this.sel]) bs[this.sel].click();
  }
  close() {
    const lp = this.lp, g = this.g;
    window.removeEventListener('keydown', this.onKey, true);
    this.el.remove();
    if (lp.npcUI === this) lp.npcUI = null;
    if (lp.mode === 'npc') lp.mode = 'play';
    if (lp.useKb && !g.input.touchMode && g.state === 'playing') g.input.requestLock();
  }
}
Object.assign(LocalPlayer.prototype, {
  openNpcUI(make) {
    if (this.mode !== 'play' || this.npcUI) return;
    this.mode = 'npc'; this.mining = null;
    if (this.useKb) this.g.input.releaseLock(true);
    this.npcUI = make();
  },
});
{
  // using a villager talks with them; using the board reads it
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const e = this.targetEnt, p = this.player;
    if (!repeat && !fromOff && e && e.npc && !e.T.golem && e.alive && !p.carrying && !p.sneaking) {
      if (e.npc.p & NPC_P.sleep) { this.toast(e.npc.n + ' is fast asleep', ''); return; }
      this.swingArm();
      this.openNpcUI(() => new NpcTalk(this, e));
      return;
    }
    if (!repeat && !fromOff && e && e.T.golem && e.alive) { this.toast('The iron golem looks at you, and offers you a flower… almost.', ''); return; }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  const baseUseBlock = LocalPlayer.prototype.useBlockAt;
  LocalPlayer.prototype.useBlockAt = function (hit, held, def) {
    const b = hit && BLOCKS[hit.id];
    if (b && b.questBoard && !this.player.sneaking) {
      const v = villageAtPos(this.g, hit.x, hit.z, 8);
      if (!v) { this.toast('The notes are blank — this board belongs to no village', ''); return true; }
      this.openNpcUI(() => new QuestBoard(this, v));
      this.swingArm();
      return true;
    }
    return baseUseBlock.call(this, hit, held, def);
  };
  const baseUpdate = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    if (this.mode === 'npc') {
      if (!this.npcUI) this.mode = 'play';
      else { this.npcUI.frame(dt, inp); inp = InputManager.blankState(); }
    }
    const r = baseUpdate.call(this, dt, inp);
    if (this.player.dead && this.npcUI) this.npcUI.close();
    // the quest list keeps up with what you carry, and a welcome the first time you walk into a village
    this._qhT = (this._qhT || 0) - dt;
    if (this._qhT <= 0) {
      this._qhT = 1;
      questHud(this);
      const g = this.g, P = this.player;
      if (g.dim === 0 && g.state === 'playing') {
        const v = villageAtPos(g, P.x, P.z, 0);
        if (v && Math.hypot(P.x - v.x, P.z - v.z) < v.r * 0.75) {
          const S = npcStats(P); S.vseen = S.vseen || {};
          if (!S.vseen[v.id]) { S.vseen[v.id] = 1; this.toast(`You have found ${v.name}`, 'epic'); if (!S.vtip) { S.vtip = 1; setTimeout(() => this.toast('Use a villager to talk, trade and find work. The board by the well has bounties.', ''), 3000); } }
        }
      }
    }
    return r;
  };
  // names over their heads up close, and ! or ? over anyone with work for you
  const baseTags = Hud.prototype.nameTags;
  Hud.prototype.nameTags = function (cam) {
    baseTags.call(this, cam);
    const g = this.g, lp = this.lp;
    let box = this.q('.npc-tags');
    if (!box) { box = document.createElement('div'); box.className = 'npc-tags'; this.q('.tags').after(box); }
    const S = npcStats(lp.player), list = [];
    for (const e of g.entities) {
      if (!e.npc || !e.alive || e.T.golem || (e.npc.p & NPC_P.sleep)) continue;
      const d = Math.hypot(e.x - cam.x, e.z - cam.z);
      if (d > 24) continue;
      const v = villageById(g, e.npc.v);
      let mark = '';
      if (v && e.npc.i < 100) {
        const mine = S.quests.find(q => q.vid === v.id && q.giver === e.npc.i);
        if (mine) mark = questReady(lp, mine) ? '?' : '';
        else { const q = npcQuestFor(g, v, e.npc.i); if (q && !S.qdone[q.id]) mark = '!'; }
      }
      if (d > 8 && !mark) continue;
      const s = this.project(e.x, e.y + (e.npc.p & NPC_P.sleep ? 0.9 : 2.15), e.z, cam);
      if (s) list.push([s, d <= 8 ? e.npc.n : '', d <= 8 ? (NPC_JOBS[e.npc.j] || NPC_JOBS.none).title : '', mark]);
    }
    while (box.children.length < list.length) { const d = document.createElement('div'); d.className = 'npc-tag'; box.appendChild(d); }
    [...box.children].forEach((el, i) => {
      const o = list[i];
      if (!o) { el.hidden = true; return; }
      el.hidden = false; el.style.left = o[0][0] + 'px'; el.style.top = o[0][1] + 'px';
      const html = (o[3] ? `<em class="${o[3] === '?' ? 'q' : 'x'}">${o[3]}</em>` : '') + (o[1] ? `<b>${esc(o[1])}</b><span>${esc(o[2])}</span>` : '');
      if (el._h !== html) { el._h = html; el.innerHTML = html; }
    });
  };
}

// ---- playing together: kills, standing and skills reach the guest who earned them -----------------------------------
{
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv') {
      if (m.k === 'hold') { const e = this.entById(m.id); if (e && e.npc) { e.holdT = 3; e.holdBy = null; } }
      if (m.k === 'sorry') { const who = this.remotes.get('g' + from + ':' + (m.li || 0)); if (who) { npcForgive(this.g, who, m.v); npcRep(this.g, who, m.v, 1); } }
      return;
    }
    return baseHost.call(this, from, m);
  };
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv') {
      const g = this.g, lp = g.locals[m.li || 0] || g.locals[0];
      if (!lp) return;
      if (m.k === 'kill') questKill(lp, m.m);
      else if (m.k === 'rep') npcRep(g, lp, m.v, m.n, m.w || undefined);
      else if (m.k === 'skill' && typeof skillGain === 'function') skillGain(lp, m.s, m.n);
      else if (m.k === 'confront') {
        if (m.hostile) { if (lp.npcUI) lp.npcUI.close(); lp.toast('That\'s it! The guards attack!', 'warn'); }
        else { const e = this.entById(m.id); if (e && e.npc && lp.mode === 'play') lp.openNpcUI(() => new NpcTalk(lp, e, { confront: true, victim: m.victim })); else lp.toast('A guard: "Hey! I saw that. Watch yourself."', 'warn'); }
      }
      return;
    }
    return baseGuest.call(this, m);
  };
  // guests' blows land on the host: send their skill experience back to them
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const dealt = baseHurt.call(this, amount, src);
    const a = src.attacker;
    if (dealt > 0 && typeof RemotePawn === 'function' && a instanceof RemotePawn && !this.T.passiveXp) a.send({ t: 'adv', k: 'skill', s: src.type === 'arrow' ? 'archery' : 'melee', n: Math.round(dealt * 4 + (this.alive ? 0 : (this.T.hp || 10))) });
    return dealt;
  };
}

// ---- the villager voice for the old sounds (hurt, death) ---------------------------------------------------------
if (typeof VOX !== 'undefined') {
  const vp = (r, a) => 1 + (r() - 0.5) * a;
  VOX.villager = {
    say: [0.5, 0.6, (b, v, r) => { const p = vp(r, 0.3); b.throat(0, 0.18, { f: [[0, 220 * p], [1, 250 * p]], v: 'ae', k: 1.1, breath: 0.15, att: 0.01, rel: 0.4 }); b.throat(0.22, 0.2, { f: [[0, 260 * p], [1, 200 * p]], v: 'ou', k: 1.1, breath: 0.15, att: 0.01, rel: 0.4 }); }],
    hurt: [0.4, 0.8, (b, v, r) => { const p = vp(r, 0.2); b.throat(0, 0.25, { f: [[0, 330 * p], [0.2, 380 * p], [1, 240 * p]], v: 'ao', k: 1.1, breath: 0.3, att: 0.005, rel: 0.5 }); }],
    death: [0.9, 0.8, (b, v, r) => { b.throat(0, 0.8, { f: [[0, 300], [0.3, 330], [1, 150]], v: 'aou', k: 1.05, breath: 0.3, att: 0.01, rel: 0.5 }); }],
  };
}
