// ---------------------------------------------------------------------------
// dnd/items.js — the weapons, armour and adventuring gear of the tabletop rules.
//
// Every weapon carries its dice (dnd: { dice, dmg, props }). Weapons from the base
// game get dice too, by kind and tier, so a sword you craft is a longsword and an
// iron axe is a battleaxe. Finer metals count as magic weapons (+1, +2, +3).
//
// Armour: every armour material has a type (light, medium, heavy) and the AC a full
// set gives. A part-set counts by piece (chest most). A shield is +2.
// ---------------------------------------------------------------------------

// props: finesse, light, heavy, two (two-handed), versatile [n, d], thrown, reach, ammo, range (blocks)
const DND_WEAPONS = {
  club:        { name: 'Club', cat: 'simple', dice: [1, 4], dmg: 'bludgeoning', props: ['light'], cost: 0.1, art: 'club', cols: ['#8a5a2e', '#5a3a1a', '#b07a42'] },
  dagger:      { name: 'Dagger', cat: 'simple', dice: [1, 4], dmg: 'piercing', props: ['finesse', 'light', 'thrown'], range: 4, cost: 2, art: 'dagger', cols: ['#d8d8e0', '#8a8a94', '#ffffff'] },
  greatclub:   { name: 'Greatclub', cat: 'simple', dice: [1, 8], dmg: 'bludgeoning', props: ['two'], cost: 0.2, art: 'club', cols: ['#7a4a22', '#4a2a10', '#a06a3a'] },
  handaxe:     { name: 'Handaxe', cat: 'simple', dice: [1, 6], dmg: 'slashing', props: ['light', 'thrown'], range: 4, cost: 5, art: 'axe', cols: ['#c8c8d0', '#7a7a84', '#f0f0f8'] },
  javelin:     { name: 'Javelin', cat: 'simple', dice: [1, 6], dmg: 'piercing', props: ['thrown'], range: 6, cost: 0.5, art: 'spear', cols: ['#b8b8c0', '#6a6a74', '#e8e8f0'] },
  mace:        { name: 'Mace', cat: 'simple', dice: [1, 6], dmg: 'bludgeoning', props: [], cost: 5, art: 'mace', cols: ['#a8a8b4', '#5a5a64', '#e0e0e8'] },
  quarterstaff:{ name: 'Quarterstaff', cat: 'simple', dice: [1, 6], dmg: 'bludgeoning', props: ['versatile'], ver: [1, 8], cost: 0.2, art: 'staff', cols: ['#9a6a3a', '#5a3a1a', '#c08a52'] },
  sickle:      { name: 'Sickle', cat: 'simple', dice: [1, 4], dmg: 'slashing', props: ['light'], cost: 1, art: 'sickle', cols: ['#c8c8d0', '#7a7a84', '#f0f0f8'] },
  spear:       { name: 'Spear', cat: 'simple', dice: [1, 6], dmg: 'piercing', props: ['thrown', 'versatile'], ver: [1, 8], range: 4, cost: 1, art: 'spear', cols: ['#c8c8d0', '#7a7a84', '#f0f0f8'] },
  battleaxe:   { name: 'Battleaxe', cat: 'martial', dice: [1, 8], dmg: 'slashing', props: ['versatile'], ver: [1, 10], cost: 10, art: 'axe', cols: ['#d0d0d8', '#80808a', '#ffffff'] },
  flail:       { name: 'Flail', cat: 'martial', dice: [1, 8], dmg: 'bludgeoning', props: [], cost: 10, art: 'mace', cols: ['#9a9aa4', '#4a4a54', '#d0d0d8'] },
  glaive:      { name: 'Glaive', cat: 'martial', dice: [1, 10], dmg: 'slashing', props: ['heavy', 'two', 'reach'], cost: 20, art: 'polearm', cols: ['#d0d0d8', '#80808a', '#ffffff'] },
  greataxe:    { name: 'Greataxe', cat: 'martial', dice: [1, 12], dmg: 'slashing', props: ['heavy', 'two'], cost: 30, art: 'greataxe', cols: ['#d0d0d8', '#70707a', '#ffffff'] },
  greatsword:  { name: 'Greatsword', cat: 'martial', dice: [2, 6], dmg: 'slashing', props: ['heavy', 'two'], cost: 50, art: 'greatsword', cols: ['#e0e0e8', '#80808a', '#ffffff'] },
  longsword:   { name: 'Longsword', cat: 'martial', dice: [1, 8], dmg: 'slashing', props: ['versatile'], ver: [1, 10], cost: 15, art: 'sword', cols: ['#e6e6ee', '#8a8a94', '#ffffff'] },
  maul:        { name: 'Maul', cat: 'martial', dice: [2, 6], dmg: 'bludgeoning', props: ['heavy', 'two'], cost: 10, art: 'hammer', cols: ['#9a9aa4', '#4a4a54', '#d0d0d8'] },
  morningstar: { name: 'Morningstar', cat: 'martial', dice: [1, 8], dmg: 'piercing', props: [], cost: 15, art: 'mace', cols: ['#b0b0ba', '#5a5a64', '#e8e8f0'] },
  rapier:      { name: 'Rapier', cat: 'martial', dice: [1, 8], dmg: 'piercing', props: ['finesse'], cost: 25, art: 'rapier', cols: ['#e8e8f0', '#8a8a94', '#ffffff'] },
  scimitar:    { name: 'Scimitar', cat: 'martial', dice: [1, 6], dmg: 'slashing', props: ['finesse', 'light'], cost: 25, art: 'scimitar', cols: ['#e0e0e8', '#8a8a94', '#ffffff'] },
  shortsword:  { name: 'Shortsword', cat: 'martial', dice: [1, 6], dmg: 'piercing', props: ['finesse', 'light'], cost: 10, art: 'shortsword', cols: ['#e0e0e8', '#8a8a94', '#ffffff'] },
  warhammer:   { name: 'Warhammer', cat: 'martial', dice: [1, 8], dmg: 'bludgeoning', props: ['versatile'], ver: [1, 10], cost: 15, art: 'hammer', cols: ['#b8b8c2', '#5a5a64', '#e8e8f0'] },
  whip:        { name: 'Whip', cat: 'martial', dice: [1, 4], dmg: 'slashing', props: ['finesse', 'reach'], cost: 2, art: 'whip', cols: ['#8a5a32', '#5a3a1e', '#b07a4a'] },
};
// bows are the base game's bow; the stack remembers which kind it is
const DND_BOWS = { shortbow: { name: 'Shortbow', dice: [1, 6], dmg: 'piercing', cat: 'simple' }, longbow: { name: 'Longbow', dice: [1, 8], dmg: 'piercing', cat: 'martial', heavy: true } };

// base-game weapons get dice by kind; tiers past iron are magic
const DND_KIND_DICE = { sword: [[1, 8], 'slashing', ['versatile'], [1, 10]], axe: [[1, 8], 'slashing', ['versatile'], [1, 10]], pickaxe: [[1, 8], 'piercing', []], shovel: [[1, 4], 'bludgeoning', []], hoe: [[1, 4], 'slashing', []], staff: [[1, 6], 'bludgeoning', ['versatile'], [1, 8]] };
const DND_TIER_BONUS = { wood: 0, stone: 0, copper: 0, bronze: 0, iron: 0, gold: 0, silver: 0, steel: 1, diamond: 1, mithril: 2, cinderite: 2, adamantite: 3 };
const DND_TIER_DICE = { wood: [1, 4], stone: [1, 6] };   // a wooden sword is a club, a stone one is crude

// armour by material: [type, full-set AC]
const DND_ARMOR_TYPE = {
  leather: ['light', 11], studded: ['light', 12], padded: ['light', 11],
  hide: ['medium', 12], chainshirt: ['medium', 13], copper: ['medium', 13], scale: ['medium', 14], bronze: ['medium', 14], gold: ['medium', 13], silver: ['medium', 15], dragonscale: ['medium', 16], halfplate: ['medium', 15],
  ringmail: ['heavy', 14], iron: ['heavy', 16], chain: ['heavy', 16], chainmail: ['heavy', 16], steel: ['heavy', 17], splint: ['heavy', 17], diamond: ['heavy', 18], plate: ['heavy', 18],
  mithril: ['heavy', 19, { noStr: true, noStealth: true }], cinderite: ['heavy', 19], adamantite: ['heavy', 20],
};
const DND_ARMOR_STR = { heavy: 13, plate: 15, diamond: 15, adamantite: 15, steel: 15 };
const DND_PIECE_WEIGHT = [0.12, 0.52, 0.26, 0.1];   // helmet, chest, legs, boots
// the new armour sets: textures are tinted plates like the rest
const DND_NEW_ARMOR = {
  padded: { label: 'Padded', mat: 'wool', pts: [1, 2, 2, 1], dur: 5, cols: ['#d8ccb0', '#8a7a5a', '#f0e8d0'] },
  studded: { label: 'Studded Leather', mat: 'leather', pts: [1, 4, 3, 1], dur: 8, cols: ['#7a4a2a', '#4a2a14', '#c8b080'] },
  hide: { label: 'Hide', mat: 'pelt', pts: [1, 4, 3, 1], dur: 7, cols: ['#a8885a', '#6a5030', '#d0b888'] },
  chainshirt: { label: 'Chain Shirt', mat: 'iron_nugget', pts: [1, 5, 3, 1], dur: 12, cols: ['#a8acb4', '#5a5e66', '#d8dce4'] },
  scale: { label: 'Scale Mail', mat: 'iron_ingot', pts: [2, 5, 4, 2], dur: 13, cols: ['#9a9a8a', '#5a5a4a', '#cacab8'] },
  chain: { label: 'Chain Mail', mat: 'iron_ingot', pts: [2, 6, 5, 2], dur: 15, cols: ['#b0b4bc', '#62666e', '#e0e4ec'] },
  plate: { label: 'Plate', mat: 'steel_ingot', pts: [3, 8, 6, 3], dur: 30, cols: ['#c8ccd4', '#6a6e78', '#f4f6fa'] },
};

// the kits' armour names, as whole sets of four pieces
const DND_KIT_SETS = {};
// adventuring gear: kits and packs and focuses
const DND_GEAR = {
  shield: { name: 'Shield', desc: 'Hold it in your off hand: +2 AC.', shield: 2, art: 'shield', cols: ['#8a5a2e', '#5a3a1a', '#c0c0c8'] },
  holy_symbol: { name: 'Holy Symbol', desc: 'An amulet or emblem: a spellcasting focus for clerics and paladins.', focus: 'divine', art: 'amulet', cols: ['#f0d060', '#a07a20', '#fff4b0'] },
  arcane_focus: { name: 'Arcane Focus', desc: 'A crystal orb: a spellcasting focus for sorcerers, warlocks and wizards.', focus: 'arcane', art: 'orb', cols: ['#a080ff', '#4a2aa0', '#f0e8ff'] },
  druid_staff: { name: 'Druidic Staff', desc: 'A staff of living wood: a quarterstaff and a druidic focus.', focus: 'druidic', weapon: 'quarterstaff', art: 'staff', cols: ['#6a8a3a', '#3a5a1a', '#a0c060'] },
  spellbook: { name: 'Spellbook', desc: 'Your spells, written in your own hand. Hold it to read your spells.', focus: 'arcane', book: true, art: 'book', cols: ['#4a6ae0', '#22346e', '#e8c040'] },
  lute: { name: 'Lute', desc: 'A musical instrument: a spellcasting focus for bards. Use it to play.', focus: 'bard', art: 'lute', cols: ['#b07a42', '#6a4220', '#e8d0a0'] },
  thieves_tools: { name: "Thieves' Tools", desc: 'Picks and files: open locked chests and doors (Dexterity check).', tools: 'thieves', art: 'tools', cols: ['#a8a8b0', '#5a5a64', '#e0e0e8'] },
  healers_kit: { name: "Healer's Kit", desc: 'Bandages and salves: use on a fallen ally to stabilise them, or on yourself to heal 1d4 + Wisdom. Ten uses.', kit: 'healer', uses: 10, art: 'satchel', cols: ['#e8e0d0', '#a09080', '#e04040'] },
  herbalism_kit: { name: 'Herbalism Kit', desc: 'Pouches and clippers: craft healing draughts from flowers and mushrooms.', tools: 'herbalism', art: 'satchel', cols: ['#6a8a3a', '#3a5a1a', '#e8d070'] },
  smiths_tools: { name: "Smith's Tools", desc: 'Hammer and tongs: repair arms and armour at an anvil for less.', tools: 'smith', art: 'tools', cols: ['#7a7a84', '#3a3a44', '#c0c0c8'] },
  signet_ring: { name: 'Signet Ring', desc: 'Your family\'s seal. Nobles and guards treat you with respect (advantage on Persuasion with them).', art: 'ring', cols: ['#f0d060', '#a07a20', '#e04040'] },
  candle_kit: { name: 'Prayer Candles', desc: 'Five candles and incense, for the rites of your faith.', art: 'candle', cols: ['#f0e8c8', '#a09068', '#ffcf5a'] },
  explorers_pack: { name: "Explorer's Pack", desc: 'Open it (use) for a bedroll, rations, a tinderbox, torches, rope and a waterskin.', pack: ['explorer'], art: 'pack', cols: ['#8a6a42', '#5a4220', '#b8986a'] },
  dungeoneers_pack: { name: "Dungeoneer's Pack", desc: 'Open it (use) for a crowbar, torches, rations, rope and a tinderbox.', pack: ['dungeoneer'], art: 'pack', cols: ['#6a6a5a', '#3a3a2a', '#9a9a8a'] },
  priests_pack: { name: "Priest's Pack", desc: 'Open it (use) for a blanket, candles, rations and a waterskin.', pack: ['priest'], art: 'pack', cols: ['#d8ccb0', '#8a7a5a', '#e8c040'] },
  scholars_pack: { name: "Scholar's Pack", desc: 'Open it (use) for a book, ink, parchment and a little bag of sand.', pack: ['scholar'], art: 'pack', cols: ['#4a5a8a', '#22304e', '#d0c090'] },
  burglars_pack: { name: "Burglar's Pack", desc: 'Open it (use) for ball bearings, string, a crowbar, candles, rations and a lantern.', pack: ['burglar'], art: 'pack', cols: ['#3a3a44', '#1a1a20', '#7a7a84'] },
  entertainers_pack: { name: "Entertainer's Pack", desc: 'Open it (use) for costumes, candles, rations and a bedroll.', pack: ['entertainer'], art: 'pack', cols: ['#c060c0', '#6a2a6a', '#f0d060'] },
  rations: { name: 'Rations', desc: 'Dried meat, hard biscuits and nuts. Eat to regain a little.', food: 4, sat: 4, art: 'ration', cols: ['#a07a4a', '#6a4a2a', '#d0b080'], stack: 16 },
  potion_healing: { name: 'Potion of Healing', desc: 'Drink to regain 2d4 + 2 hit points.', heal: [2, 4, 2], art: 'potion', cols: ['#e02a4a', '#7a0a1a', '#ff9aa8'], stack: 8 },
  potion_greater_healing: { name: 'Potion of Greater Healing', desc: 'Drink to regain 4d4 + 4 hit points.', heal: [4, 4, 4], rarity: 'rare', art: 'potion', cols: ['#ff3a6a', '#8a0a2a', '#ffc0d0'], stack: 8 },
  gold_coin: { name: 'Gold Piece', desc: 'Coin of the realm. Merchants take it, and so do the greedy.', art: 'coin', cols: ['#f0d060', '#a07a20', '#fff4b0'], stack: 999 },
  silver_coin: { name: 'Silver Piece', desc: 'Ten make a gold piece.', art: 'coin', cols: ['#d8dce4', '#7a7e86', '#ffffff'], stack: 999 },
};
// what each pack holds, as base-game items where they fit
const DND_PACKS = {
  explorer: [['rations', 10], ['torch', 10], ['rope', 1], ['campfire_kit', 1], ['bed', 1]],
  dungeoneer: [['rations', 10], ['torch', 10], ['rope', 1], ['iron_pickaxe', 1]],
  priest: [['rations', 7], ['candle', 10], ['wool', 1]],
  scholar: [['book', 1], ['paper', 10], ['ink_sac', 1], ['feather', 1]],
  burglar: [['rations', 5], ['lantern', 1], ['string', 4], ['rope', 1], ['candle', 5]],
  entertainer: [['rations', 5], ['candle', 5], ['bed', 1]],
};

// 16×16 pictures (palette: A main, a dark, L light, s/S/P the base game's handle colours, k outline)
const DND_ART = {
  club: ['................', '................', '...........aAa..', '..........aAAAa.', '.........aAALAa.', '........aAALAa..', '.......aAAAAa...', '......aAAAa.....', '.....aAAa.......', '....sSa.........', '...sSs..........', '..sSs...........', '.PSs............', '.PP.............', '................', '................'],
  mace: ['................', '..........L.L...', '.........aAAAL..', '........LAALAAa.', '.........AAAAa..', '........aaAAa.L.', '.......sSa......', '......sSs.......', '.....sSs........', '....sSs.........', '...sSs..........', '..sSs...........', '.PSs............', '.PP.............', '................', '................'],
  staff: ['................', '............LA..', '...........LAa..', '..........sSa...', '.........sSs....', '........sSs.....', '.......sSs......', '......sSs.......', '.....sSs........', '....sSs.........', '...sSs..........', '..sSs...........', '.sSs............', '.Ps.............', '................', '................'],
  sickle: ['................', '......LLLA......', '....LAa..aAa....', '...La......Aa...', '...A........A...', '...........aA...', '..........aA....', '.........sS.....', '........sS......', '.......sS.......', '......sS........', '.....sS.........', '....PS..........', '................', '................', '................'],
  spear: ['................', '.............LA.', '............LAa.', '...........LAa..', '..........sAa...', '.........sSs....', '........sSs.....', '.......sSs......', '......sSs.......', '.....sSs........', '....sSs.........', '...sSs..........', '..sSs...........', '.PSs............', '.PP.............', '................'],
  polearm: ['..........LLA...', '.........LAAa...', '..........LAAa..', '...........aAa..', '..........sSa...', '.........sSs....', '........sSs.....', '.......sSs......', '......sSs.......', '.....sSs........', '....sSs.........', '...sSs..........', '..sSs...........', '.PSs............', '.PP.............', '................'],
  greataxe: ['................', '.......LLAAa....', '......LAAAAAa...', '.....LAAAAAAAa..', '.....LAAAsSAAa..', '......LAsSsAa...', '.......sSsa.....', '......sSs.......', '.....sSs........', '....sSs.........', '...sSs..........', '..sSs...........', '.PSs............', '.PP.............', '................', '................'],
  greatsword: ['..............LA', '.............LAa', '............LAa.', '...........LAa..', '..........LAa...', '.........LAa....', '........LAa.....', '.......LAa......', '..k...LAa.......', '...k.LAa........', '....kAa.........', '....sgk.........', '...sSs.k........', '..sSs...........', '.PS.............', '................'],
  sword: ['................', '.............LA.', '............LAa.', '...........LAa..', '..........LAa...', '.........LAa....', '........LAa.....', '.......LAa......', '..k...LAa.......', '...k.LAa........', '....kAa.........', '....sgk.........', '...sSs.k........', '..sSs...........', '.PS.............', '................'],
  shortsword: ['................', '................', '................', '...........LA...', '..........LAa...', '.........LAa....', '........LAa.....', '.......LAa......', '..k...LAa.......', '...k.LAa........', '....kAa.........', '....sgk.........', '...sSs.k........', '..sSs...........', '.PS.............', '................'],
  rapier: ['................', '..............L.', '.............LA.', '............LA..', '...........LA...', '..........LA....', '.........LA.....', '........LA......', '.......LA.......', '...kk.LA........', '..k..kA.........', '..k.sgk.........', '...sSk..........', '..sSs...........', '.PS.............', '................'],
  scimitar: ['................', '..............L.', '............LLA.', '..........LLAa..', '.........LAAa...', '........LAAa....', '.......LAAa.....', '.......LAa......', '..k...LAa.......', '...k.LAa........', '....kAa.........', '....sgk.........', '...sSs.k........', '..sSs...........', '.PS.............', '................'],
  axe: ['................', '................', '.........LAAa...', '........LAAAAa..', '........LAAsSa..', '.........LsSa...', '.........sSs....', '........sSs.....', '.......sSs......', '......sSs.......', '.....sSs........', '....sSs.........', '...sSs..........', '..PSs...........', '..PP............', '................'],
  hammer: ['................', '.........kLLAk..', '........kLAAAak.', '.........kAAAk..', '.........ksSk...', '.........sSs....', '........sSs.....', '.......sSs......', '......sSs.......', '.....sSs........', '....sSs.........', '...sSs..........', '..sSs...........', '.PSs............', '.PP.............', '................'],
  whip: ['................', '..........AAA...', '........AA...A..', '.......A......A.', '......A.......A.', '.....A.......A..', '.....A......A...', '......A....A....', '.......AAAA.....', '......sS........', '.....sS.........', '....sS..........', '...PS...........', '................', '................', '................'],
  dagger: ['................', '................', '................', '................', '...........LA...', '..........LAa...', '.........LAa....', '........LAa.....', '..g....LAa......', '...g..LAa.......', '....gLAa........', '....sgg.........', '...sSs.g........', '..sSs...........', '.PS.............', '................'],
  shield: ['................', '..kkkkkkkkkkkk..', '..kLLLLAAAAAAk..', '..kLAAAAaaaaak..', '..kLAAALLaaaak..', '..kLAALLLLaaak..', '..kLAAALLaaaak..', '..kLAAAAaaaaak..', '..kLAAAAaaaaak..', '...kLAAAaaaak...', '...kLAAAaaaak...', '....kLAAaaak....', '.....kLAaak.....', '......kLak......', '.......kk.......', '................'],
  amulet: ['................', '....a......a....', '.....a....a.....', '......a..a......', '.......aa.......', '......LAAL......', '.....LAAAAL.....', '....LAALLAAL....', '....AALAALAA....', '....LAALLAAL....', '.....LAAAAL.....', '......LAAL......', '.......aa.......', '................', '................', '................'],
  orb: ['................', '................', '................', '......aaaa......', '....aaAAAAaa....', '...aAALLAAAAa...', '...aALLLLAAAa...', '..aAALLLAAAAAa..', '..aAAAAAAAAAAa..', '..aAAAAAAAAAAa..', '...aAAAAAAAAa...', '...aAAAAAAAAa...', '....aaAAAAaa....', '......sSSs......', '.....PSSSSP.....', '................'],
  book: ['................', '................', '...kkkkkkkkkk...', '..kAAAAAAAAAak..', '..kALLLLLLLAak..', '..kAAAAAAAAAak..', '..kAALLLLLAAak..', '..kAAAALAAAAak..', '..kAAALLLAAAak..', '..kAAAALAAAAak..', '..kAAAAAAAAAak..', '..kAAAAAAAAAak..', '..kaaaaaaaaaak..', '...kkkkkkkkkk...', '................', '................'],
  lute: ['................', '.............sP.', '............sSP.', '...........Ss...', '..........sS....', '.........sS.....', '....aAAAsS......', '...aAAAAAAa.....', '..aAALLLAAAa....', '..AALkkkLAAa....', '..AALkkkLAAa....', '..aAALLLAAAa....', '...aAAAAAAa.....', '....aaAAaa......', '................', '................'],
  tools: ['................', '................', '...LA.......LA..', '...AA......LAa..', '...AA.....LAa...', '...AA....LAa....', '...AA...LAa.....', '...AA..LAa......', '...sS.kAa.......', '...sS..k........', '...sS...........', '...sS...........', '...PS...........', '................', '................', '................'],
  satchel: ['................', '................', '.....kkkkkk.....', '....k......k....', '...kkkkkkkkkk...', '..kAAAAAAAAAAk..', '..kALLLLLLLLAk..', '..kAAAALLAAAAk..', '..kAAALLLLAAAk..', '..kAAAALLAAAAk..', '..kAAAAAAAAAAk..', '..kaaaaaaaaaak..', '...kkkkkkkkkk...', '................', '................', '................'],
  ring: ['................', '................', '................', '......LLLL......', '.....LkkkkL.....', '......LkkL......', '.....aA..Aa.....', '....aA....Aa....', '....A......A....', '....A......A....', '....aA....Aa....', '.....aAAAAa.....', '................', '................', '................', '................'],
  candle: ['................', '.......L........', '......LAL.......', '.......A........', '.......k........', '......LLA.......', '......LLA.......', '......LLa.......', '......LLa.......', '......LAa.......', '......LAa.......', '.....aaaaa......', '....kkkkkkk.....', '................', '................', '................'],
  pack: ['................', '................', '.....kkkkkk.....', '....kLAAAAAk....', '...kLAAAAAAAk...', '...kAAAAAAAAk...', '...kaaaaaaaak...', '...kAAALLAAAk...', '...kAAALLAAAk...', '...kAAAAAAAAk...', '...kAAAAAAAAk...', '...kaaaaaaaak...', '....kkkkkkkk....', '................', '................', '................'],
  ration: ['................', '................', '................', '................', '....kkkkkkkk....', '...kLLLLLLLLk...', '...kLAAAAAALk...', '...kAAaAAaAAk...', '...kAAAAAAAAk...', '...kAaAAaAAAk...', '...kaaaaaaaak...', '....kkkkkkkk....', '................', '................', '................', '................'],
  potion: ['................', '.......kk.......', '......kPPk......', '.......kk.......', '......kLLk......', '.....kL..Lk.....', '....kLAAAAAk....', '...kLAAAAAAAk...', '...kAALAAAAAk...', '...kAAAAAAAAk...', '...kAAAAAAaAk...', '....kAAAAAak....', '.....kkkkkk.....', '................', '................', '................'],
  coin: ['................', '................', '................', '.....kkkkkk.....', '....kLLLLLAk....', '...kLLAAAAAak...', '...kLAALLAAak...', '...kLAALAAAak...', '...kLAALLAAak...', '...kLAAAAAAak...', '....kAaaaaak....', '.....kkkkkk.....', '................', '................', '................', '................'],
};

function dndPaintArt(p, art, cols) {
  const [c, d, l] = cols.map(hexRGB);
  const pal = Object.assign({ A: c, a: d, L: l, k: hexRGB('#1a1410'), g: hexRGB('#c8a040') }, STICK_PAL);
  const rows = DND_ART[art] || DND_ART.pack;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const ch = rows[y][x]; if (ch !== '.' && pal[ch]) p.set(x, y, pal[ch]); }
}

{
  // ---- weapons ----
  for (const [k, w] of Object.entries(DND_WEAPONS)) {
    const avg = w.dice[0] * (w.dice[1] + 1) / 2;
    defItem(k, { name: w.name, maxStack: w.props.includes('thrown') && k !== 'spear' ? 8 : 1, icon: 'dnd_' + k,
      tool: { type: 'sword', tier: 3, speed: w.props.includes('heavy') ? 0.8 : w.props.includes('light') ? 1.25 : 1, damage: avg, durability: 400 },
      dnd: { dice: w.dice, dmg: w.dmg, props: w.props, ver: w.ver, range: w.range, cat: w.cat },
      desc: `${w.dice[0]}d${w.dice[1]} ${w.dmg}${w.props.length ? ' · ' + w.props.map(p => p === 'two' ? 'two-handed' : p === 'versatile' ? `versatile (${w.ver[0]}d${w.ver[1]})` : p).join(', ') : ''}` });
  }
  // ---- gear ----
  for (const [k, g] of Object.entries(DND_GEAR)) {
    const props = { name: g.name, maxStack: g.stack || (g.pack ? 1 : 1), icon: 'dnd_' + k, desc: g.desc, dndGear: g, rarity: g.rarity };
    if (g.weapon) { const w = DND_WEAPONS[g.weapon]; props.tool = { type: 'sword', tier: 3, speed: 1, damage: 3.5, durability: 600 }; props.dnd = { dice: w.dice, dmg: w.dmg, props: w.props, ver: w.ver, cat: w.cat }; }
    if (g.food) props.food = { heal: g.food };
    defItem(k, props);
  }
  // ---- armour sets ----
  for (const [mk, m] of Object.entries(DND_NEW_ARMOR)) {
    ARMOR_MATS[mk] = { label: m.label, mat: m.mat, pts: m.pts, dur: m.dur };
    if (typeof ARMOR_COLORS !== 'undefined') ARMOR_COLORS[mk] = m.cols.map(hexRGB);
    ARMOR_PIECES.forEach((pc) => {
      defItem(mk + '_' + pc.key, { name: m.label + ' ' + pc.label, maxStack: 1, icon: mk + '_' + pc.key, armor: { slot: pc.slot, points: m.pts[pc.slot], durability: m.dur * pc.durMul } });
      if (ITEMS[m.mat] || B[m.mat] !== undefined) RECIPES.push({ out: mk + '_' + pc.key, n: 1, shape: ARMOR_SHAPES[pc.slot], key: { M: m.mat }, group: 'armor' });
    });
  }
  // the kits' armour names, as whole sets (kit entries expand to all four pieces)
  Object.assign(DND_KIT_SETS, { leather_armor: 'leather', studded_leather: 'studded', padded_armor: 'padded', hide_armor: 'hide', chain_shirt: 'chainshirt', scale_mail: 'scale', chain_mail: 'chain', plate_armor: 'plate' });
  // ---- recipes for the new weapons and gear ----
  const R = (out, shape, key, n = 1) => RECIPES.push({ out, n, shape, key, group: 'tools' });
  R('dagger', [' I', 'S '], { I: 'iron_ingot', S: 'stick' });
  R('shortsword', ['  I', ' I ', 'S  '], { I: 'iron_ingot', S: 'stick' });
  R('longsword', [' I', ' I', ' S'], { I: 'steel_ingot', S: 'stick' });
  R('greatsword', [' I ', ' I ', 'ISI'], { I: 'steel_ingot', S: 'stick' });
  R('rapier', ['  I', ' N ', 'S  '], { I: 'iron_ingot', N: 'iron_nugget', S: 'stick' });
  R('scimitar', [' II', ' I ', 'S  '], { I: 'iron_ingot', S: 'stick' });
  R('handaxe', ['I ', 'S '], { I: 'iron_ingot', S: 'stick' });
  R('battleaxe', ['II', 'IS', ' S'], { I: 'iron_ingot', S: 'stick' });
  R('greataxe', ['III', 'ISI', ' S '], { I: 'iron_ingot', S: 'stick' });
  R('mace', [' I', ' S'], { I: 'iron_block', S: 'stick' });
  R('warhammer', ['III', ' S ', ' S '], { I: 'iron_ingot', S: 'stick' });
  R('maul', ['III', 'III', ' S '], { I: 'iron_ingot', S: 'stick' });
  R('flail', ['  I', ' T ', 'S  '], { I: 'iron_block', T: 'string', S: 'stick' });
  R('morningstar', ['NIN', ' S ', ' S '], { I: 'iron_ingot', N: 'iron_nugget', S: 'stick' });
  R('spear', ['  I', ' S ', 'S  '], { I: 'flint', S: 'stick' });
  R('javelin', ['  I', ' S ', 'S  '], { I: 'iron_nugget', S: 'stick' }, 4);
  R('glaive', [' II', ' S ', 'S  '], { I: 'iron_ingot', S: 'stick' });
  R('quarterstaff', ['  S', ' S ', 'S  '], { S: 'stick' });
  R('club', [' L', ' S'], { L: 'log', S: 'stick' });
  R('greatclub', ['LL', 'LS', ' S'], { L: 'log', S: 'stick' });
  R('sickle', [' I', 'S '], { I: 'iron_nugget', S: 'stick' });
  R('whip', ['  L', ' L ', 'S  '], { L: 'leather', S: 'stick' });
  R('shield', ['PIP', 'PPP', ' P '], { P: 'planks', I: 'iron_ingot' });
  R('healers_kit', ['WPW', 'PRP'], { W: 'wool', P: 'paper', R: 'red_dye' });
  R('potion_healing', ['B', 'R', 'G'], { B: 'red_mushroom', R: 'berries', G: 'glass_bottle' });
  R('rations', ['MBM'], { M: 'cooked_meat', B: 'bread' }, 4);
  for (const k of Object.keys(DND_GEAR)) if (ITEMS[k]) ITEMS[k].dndGear = DND_GEAR[k];
}

// the pictures, painted with the rest of the items when the atlas is built
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    for (const [k, w] of Object.entries(DND_WEAPONS)) addItem('dnd_' + k, p => dndPaintArt(p, w.art, w.cols));
    for (const [k, g] of Object.entries(DND_GEAR)) addItem('dnd_' + k, p => dndPaintArt(p, g.art, g.cols));
    // the new armour as worn: quilting, studs, fur, rings, scales and plates
    const H = hexRGB;
    for (const [mk, m] of Object.entries(DND_NEW_ARMOR)) {
      const [c, d, l] = m.cols.map(H);
      const paint = (p) => {
        p.noise(c, mk === 'hide' ? 0.22 : 0.1);
        if (mk === 'padded') for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 4 === 0 || (x - y + 16) % 4 === 0) p.set(x, y, d);
        if (mk === 'studded') { for (let y = 2; y < 16; y += 4) for (let x = 2; x < 16; x += 4) { p.set(x, y, l); p.set(x + 1, y, shade(l, 0.8)); } }
        if (mk === 'hide') for (let k = 0; k < 40; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), p.rand() < 0.5 ? d : l);
        if (mk === 'chainshirt' || mk === 'chain') for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, (x + (y % 2)) % 2 ? d : (y % 2 ? c : l));
        if (mk === 'scale') for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const u = (x + (Math.floor(y / 2) % 2) * 2) % 4; p.set(x, y, y % 2 === 1 && u !== 0 ? d : u === 2 ? l : c); }
        if (mk === 'plate') { for (let x = 0; x < 16; x++) { p.set(x, 0, l); p.set(x, 15, d); p.set(x, 5, d); p.set(x, 10, d); } for (let y = 0; y < 16; y++) { p.set(0, y, l); p.set(15, y, d); } for (const [x, y] of [[2, 2], [13, 2], [2, 7], [13, 7], [2, 12], [13, 12]]) p.set(x, y, l); }
        else { for (let x = 0; x < 16; x++) { p.set(x, 0, l); p.set(x, 15, d); } for (let y = 0; y < 16; y++) { p.set(0, y, l); p.set(15, y, d); } }
      };
      if (typeof addTile === 'function') {
        addTile('armor_' + mk, paint);
        addTile('armor_' + mk + '_face', p => { paint(p); for (let y = 4; y < 15; y++) for (let x = 3; x < 13; x++) p.set(x, y, [0, 0, 0], 0); });
      }
    }
  };
}

// the dice a held stack hits with: [count, sides, type, magic bonus, props]
function dndWeaponOf(stack) {
  if (!stack) return { dice: [1, 1], dmg: 'bludgeoning', bonus: 0, props: ['unarmed'], unarmed: true, name: 'Unarmed strike' };
  const d = itemDef(stack.id); if (!d) return dndWeaponOf(null);
  if (d.bow || /^bow/.test(stack.id)) { const b = DND_BOWS[stack.dk] || DND_BOWS.shortbow; return { dice: b.dice, dmg: b.dmg, bonus: stack.plus || 0, props: ['ammo', 'ranged'], ranged: true, name: b.name, cat: b.cat }; }
  if (d.dnd) return { dice: d.dnd.dice, dmg: d.dnd.dmg, bonus: (stack.plus || 0) + (d.dnd.bonus || 0), props: d.dnd.props || [], ver: d.dnd.ver, name: d.name, cat: d.dnd.cat };
  if (d.tool && DND_KIND_DICE[d.tool.type]) {
    const tierKey = String(stack.id).split('_')[0], K = DND_KIND_DICE[d.tool.type];
    const dice = (d.tool.type === 'sword' && DND_TIER_DICE[tierKey]) || K[0];
    let bonus = DND_TIER_BONUS[tierKey] || 0;
    if (d.rarity === 'epic') bonus = Math.max(bonus, 3); else if (d.rarity === 'rare') bonus = Math.max(bonus, 2);
    return { dice, dmg: K[1], bonus: bonus + (stack.plus || 0), props: K[2], ver: K[3], name: d.name, cat: 'martial', element: d.tool.element, tool: d.tool.type !== 'sword' && d.tool.type !== 'staff' };
  }
  if (d.tool && d.tool.damage) return { dice: [1, Math.max(2, Math.round(d.tool.damage * 1.2))], dmg: 'bludgeoning', bonus: 0, props: [], name: d.name, cat: 'simple', improvised: true };
  return { dice: [1, 4], dmg: 'bludgeoning', bonus: 0, props: [], name: d.name, improvised: true };
}

// the shops stock the tabletop gear (prices in the shop's own units: a quarter of the gold they cost)
if (typeof NPC_SHOPS !== 'undefined') {
  const add = (job, list) => { if (NPC_SHOPS[job]) NPC_SHOPS[job].buy.push(...list.filter(l => ITEMS[l[0]])); };
  add('weaponsmith', [['dagger', 1, 1, 0], ['handaxe', 1, 2, 0], ['mace', 1, 2, 0], ['quarterstaff', 1, 1, 0], ['spear', 1, 1, 0], ['javelin', 4, 2, 0], ['shortsword', 1, 3, 0], ['scimitar', 1, 6, 1], ['rapier', 1, 6, 1], ['longsword', 1, 4, 0], ['battleaxe', 1, 3, 0], ['warhammer', 1, 4, 0], ['morningstar', 1, 4, 1], ['flail', 1, 3, 1], ['greataxe', 1, 8, 1], ['greatsword', 1, 12, 2], ['maul', 1, 3, 1], ['glaive', 1, 5, 1], ['whip', 1, 1, 0], ['shield', 1, 3, 0], ['arrow', 20, 1, 0]]);
  add('armorer', [['padded_chestplate', 1, 2, 0], ['studded_chestplate', 1, 6, 0], ['studded_leggings', 1, 4, 0], ['hide_chestplate', 1, 3, 0], ['chainshirt_chestplate', 1, 6, 0], ['scale_chestplate', 1, 8, 1], ['chain_chestplate', 1, 10, 1], ['chain_helmet', 1, 4, 1], ['chain_leggings', 1, 6, 1], ['chain_boots', 1, 3, 1], ['plate_chestplate', 1, 30, 3], ['plate_helmet', 1, 12, 3], ['shield', 1, 3, 0]]);
  add('merchant', [['potion_healing', 1, 12, 0], ['rations', 4, 1, 0], ['healers_kit', 1, 2, 0], ['rope', 1, 1, 0], ['torch', 8, 1, 0], ['explorers_pack', 1, 3, 0], ['thieves_tools', 1, 6, 1]]);
  add('cleric', [['potion_healing', 1, 12, 0], ['potion_greater_healing', 1, 30, 2], ['holy_symbol', 1, 2, 0], ['healers_kit', 1, 2, 0], ['candle_kit', 1, 1, 0]]);
  add('librarian', [['spellbook', 1, 12, 1], ['arcane_focus', 1, 3, 0], ['paper', 8, 1, 0]]);
  if (NPC_SHOPS.innkeeper) add('innkeeper', [['rations', 4, 1, 0], ['bread', 2, 1, 0], ['lute', 1, 9, 1]]);
}
