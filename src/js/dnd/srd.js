// ---------------------------------------------------------------------------
// dnd/srd.js — the rules data: abilities, skills, species, classes, backgrounds,
// the level table and spell slots.
//
// This work includes material from the System Reference Document 5.2 ("SRD 5.2")
// by Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document.
// The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International
// License, available at https://creativecommons.org/licenses/by/4.0/legalcode.
//
// Real-time play bends a few rules: a "round" is about 6 seconds, distances are
// in blocks (1 block = 5 feet), and abilities that cost an action are bound to keys.
// ---------------------------------------------------------------------------

const DND_ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const DND_ABILITY_NAMES = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
const DND_ABILITY_SHORT = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

const DND_SKILLS = {
  acrobatics: { name: 'Acrobatics', ab: 'dex' }, animal: { name: 'Animal Handling', ab: 'wis' }, arcana: { name: 'Arcana', ab: 'int' },
  athletics: { name: 'Athletics', ab: 'str' }, deception: { name: 'Deception', ab: 'cha' }, history: { name: 'History', ab: 'int' },
  insight: { name: 'Insight', ab: 'wis' }, intimidation: { name: 'Intimidation', ab: 'cha' }, investigation: { name: 'Investigation', ab: 'int' },
  medicine: { name: 'Medicine', ab: 'wis' }, nature: { name: 'Nature', ab: 'int' }, perception: { name: 'Perception', ab: 'wis' },
  performance: { name: 'Performance', ab: 'cha' }, persuasion: { name: 'Persuasion', ab: 'cha' }, religion: { name: 'Religion', ab: 'int' },
  sleight: { name: 'Sleight of Hand', ab: 'dex' }, stealth: { name: 'Stealth', ab: 'dex' }, survival: { name: 'Survival', ab: 'wis' },
};
const DND_SKILL_ORDER = Object.keys(DND_SKILLS);

// XP to reach each level (index = level), and the proficiency bonus by level
const DND_XP = [0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
const DND_MAX_LEVEL = 20;
function dndProf(level) { return 2 + Math.floor((Math.max(1, level) - 1) / 4); }
function dndMod(score) { return Math.floor(((score || 10) - 10) / 2); }
function dndSigned(n) { return (n >= 0 ? '+' : '−') + Math.abs(n); }
function dndLevelForXp(xp) { let l = 1; while (l < DND_MAX_LEVEL && xp >= DND_XP[l + 1]) l++; return l; }

// Spell slots for full casters (Bard, Cleric, Druid, Sorcerer, Wizard), by level, slots of spell level 1..9
const DND_SLOTS_FULL = [null,
  [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
// half casters (Paladin, Ranger) in SRD 5.2 cast from level 1
const DND_SLOTS_HALF = [null,
  [2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2],
  [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]];
// Warlock pact magic: [slots, slot level]
const DND_PACT = [null, [1, 1], [2, 1], [2, 2], [2, 2], [2, 3], [2, 3], [2, 4], [2, 4], [2, 5], [2, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [3, 5], [4, 5], [4, 5], [4, 5], [4, 5]];
function dndSlotsFor(cls, level) {
  const C = DND_CLASSES[cls]; if (!C || !C.caster) return [];
  if (C.caster === 'pact') { const [n, l] = DND_PACT[level]; const a = []; a[l - 1] = n; for (let i = 0; i < l - 1; i++) a[i] = 0; return a; }
  return (C.caster === 'full' ? DND_SLOTS_FULL : DND_SLOTS_HALF)[level].slice();
}
function dndMaxSpellLevel(cls, level) { const s = dndSlotsFor(cls, level); for (let i = s.length - 1; i >= 0; i--) if (s[i] > 0) return i + 1; return 0; }

// ---- species ----------------------------------------------------------------
// speed in feet (30 = normal walking pace); size 'small' shrinks the body a little.
// look: the creator's starting point for this species (skin tones, extras it may show).
const DND_SPECIES = {
  human: { name: 'Human', speed: 30, size: 'medium', dark: 0,
    traits: [['Resourceful', 'You wake from a long rest with Heroic Inspiration: your next failed d20 is rerolled.'], ['Skillful', 'Proficiency in one extra skill of your choice.'], ['Versatile', 'Humans pick up anything: +10% experience.']],
    extraSkill: 1, xpBonus: 0.1, inspireOnRest: true,
    look: { skins: ['#f1d2b6', '#e0b48c', '#c68e64', '#a06a44', '#7a4a2c', '#4e2e1c'] } },
  elf: { name: 'Elf', speed: 30, size: 'medium', dark: 60,
    traits: [['Darkvision', 'You see in dim light out to 60 feet as if it were bright.'], ['Fey Ancestry', 'Advantage on saves against being charmed; magic can\'t put you to sleep.'], ['Keen Senses', 'Proficiency in Perception.'], ['Trance', 'A long rest takes you half the time.']],
    skills: ['perception'], lineages: { high: { name: 'High Elf', cantrip: 'light' }, wood: { name: 'Wood Elf', speed: 35 }, drow: { name: 'Drow', dark: 120, cantrip: 'dancing_lights' } },
    sleepImmune: true, look: { skins: ['#f6e0c8', '#e8c8a4', '#c89a70', '#8a6a9a', '#5a4a6a', '#3a3040'], ears: 'pointed' } },
  dwarf: { name: 'Dwarf', speed: 30, size: 'medium', short: true, dark: 120,
    traits: [['Darkvision', 'You see in the dark out to 120 feet.'], ['Dwarven Resilience', 'Resistance to poison damage; advantage on saves against poison.'], ['Dwarven Toughness', '+1 hit point every level.'], ['Stonecunning', 'You sense the stone: veins of ore nearby glint for a moment (species feature key).']],
    resist: ['poison'], hpPerLevel: 1, look: { skins: ['#f0ccaa', '#d8a882', '#b47e58', '#8a5a3a', '#5e3a24'], beard: true } },
  halfling: { name: 'Halfling', speed: 30, size: 'small', dark: 0,
    traits: [['Brave', 'Advantage on saves against being frightened.'], ['Halfling Nimbleness', 'You slip past creatures larger than you.'], ['Luck', 'When you roll a 1 on a d20, reroll it.'], ['Naturally Stealthy', 'You hide well behind bigger folk: proficiency in Stealth.']],
    lucky: true, skills: ['stealth'], look: { skins: ['#f4d4b4', '#e0b48c', '#c08a60', '#8a5a3a', '#5a3a24'] } },
  gnome: { name: 'Gnome', speed: 30, size: 'small', dark: 60,
    traits: [['Darkvision', 'You see in dim light out to 60 feet.'], ['Gnomish Cunning', 'Advantage on Intelligence, Wisdom and Charisma saving throws.'], ['Gnomish Lineage', 'Forest gnomes know Minor Illusion; rock gnomes Mending and Prestidigitation.']],
    cunning: true, lineages: { forest: { name: 'Forest Gnome', cantrip: 'minor_illusion' }, rock: { name: 'Rock Gnome', cantrip: 'mending' } },
    look: { skins: ['#f6dcc0', '#e4bc96', '#c6946a', '#9a6a46', '#6a4a30'], ears: 'small' } },
  dragonborn: { name: 'Dragonborn', speed: 30, size: 'medium', dark: 60,
    traits: [['Draconic Ancestry', 'Your dragon kin decides your breath and your resistance.'], ['Breath Weapon', 'Exhale destructive energy in a cone (Z): 1d10, rising with level. Uses equal to your proficiency bonus per long rest.'], ['Damage Resistance', 'Resistance to your ancestry\'s damage type.'], ['Darkvision', '60 feet.']],
    breath: true, lineages: { red: { name: 'Red', dmg: 'fire' }, blue: { name: 'Blue', dmg: 'lightning' }, green: { name: 'Green', dmg: 'poison' }, white: { name: 'White', dmg: 'cold' }, black: { name: 'Black', dmg: 'acid' }, gold: { name: 'Gold', dmg: 'fire' }, silver: { name: 'Silver', dmg: 'cold' }, bronze: { name: 'Bronze', dmg: 'lightning' }, copper: { name: 'Copper', dmg: 'acid' }, brass: { name: 'Brass', dmg: 'fire' } },
    look: { skins: ['#b83a2a', '#2a5ab8', '#2a8a4a', '#e8eef4', '#2a2a30', '#d8a830', '#b8c0c8', '#a8763a', '#c07040', '#d8b060'], scales: true, snout: true } },
  orc: { name: 'Orc', speed: 30, size: 'medium', dark: 120,
    traits: [['Adrenaline Rush', 'Dash as a bonus action (Z) and gain temporary hit points equal to your proficiency bonus.'], ['Darkvision', '120 feet.'], ['Relentless Endurance', 'Once per long rest, when you drop to 0 hit points you drop to 1 instead.']],
    relentless: true, rush: true, look: { skins: ['#8aa070', '#6a8a5a', '#7a8a6a', '#5a6a4a', '#9a8a7a', '#6a5a4a'], tusks: true } },
  tiefling: { name: 'Tiefling', speed: 30, size: 'medium', dark: 60,
    traits: [['Darkvision', '60 feet.'], ['Fiendish Legacy', 'Abyssal, Chthonic or Infernal: a resistance and a cantrip.'], ['Otherworldly Presence', 'You know Thaumaturgy.']],
    lineages: { infernal: { name: 'Infernal', dmg: 'fire', cantrip: 'fire_bolt' }, abyssal: { name: 'Abyssal', dmg: 'poison', cantrip: 'poison_spray' }, chthonic: { name: 'Chthonic', dmg: 'necrotic', cantrip: 'chill_touch' } },
    look: { skins: ['#c84a4a', '#a83a5a', '#8a4a8a', '#5a4a8a', '#e0b48c', '#c68e64'], horns: true, tail: true } },
  goliath: { name: 'Goliath', speed: 35, size: 'medium', tall: true, dark: 0,
    traits: [['Giant Ancestry', 'Stone, Hill, Frost, Fire, Cloud or Storm: a gift of the giants (Z), proficiency-bonus uses per long rest.'], ['Large Form', 'From 5th level you can grow huge for a minute.'], ['Powerful Build', 'You carry more and break free of grapples easily.']],
    lineages: { stone: { name: "Stone's Endurance", gift: 'endure' }, hill: { name: "Hill's Tumble", gift: 'tumble' }, frost: { name: "Frost's Chill", gift: 'chill' }, fire: { name: "Fire's Burn", gift: 'burn' }, cloud: { name: "Cloud's Jaunt", gift: 'jaunt' }, storm: { name: "Storm's Thunder", gift: 'thunder' } },
    look: { skins: ['#b8b0a8', '#a09890', '#c8b8a0', '#8a8a8a', '#d8c8b8'], marks: true } },
};
const DND_SPECIES_ORDER = ['human', 'elf', 'dwarf', 'halfling', 'gnome', 'dragonborn', 'orc', 'tiefling', 'goliath'];

// ---- backgrounds --------------------------------------------------------------
// SRD 5.2 gives four; the rest are Eldenwood's own, written for this game.
const DND_BACKGROUNDS = {
  acolyte: { name: 'Acolyte', abs: ['int', 'wis', 'cha'], skills: ['insight', 'religion'], feat: 'Magic Initiate (Cleric)', gold: 8, kit: ['book', 'candle_kit'], desc: 'You served in a temple, tending rites and reading old scripture.' },
  criminal: { name: 'Criminal', abs: ['dex', 'con', 'int'], skills: ['sleight', 'stealth'], feat: 'Alert', gold: 16, kit: ['thieves_tools'], desc: 'You lived outside the law, and you know the city\'s shadows.' },
  sage: { name: 'Sage', abs: ['con', 'int', 'wis'], skills: ['arcana', 'history'], feat: 'Magic Initiate (Wizard)', gold: 8, kit: ['book', 'paper'], desc: 'You spent years among books and scholars.' },
  soldier: { name: 'Soldier', abs: ['str', 'dex', 'con'], skills: ['athletics', 'intimidation'], feat: 'Savage Attacker', gold: 14, kit: ['healers_kit'], desc: 'You trained for war, and you have seen battle.' },
  woodwarden: { name: 'Woodwarden', abs: ['dex', 'wis', 'con'], skills: ['nature', 'survival'], feat: 'Tough', gold: 10, kit: ['rope', 'healers_kit'], desc: 'You kept the forest paths and know the wild by its sounds.' },
  wayfarer: { name: 'Wayfarer', abs: ['dex', 'wis', 'cha'], skills: ['insight', 'stealth'], feat: 'Lucky', gold: 12, kit: ['campfire_kit'], desc: 'You grew up on the road, trading and talking your way along.' },
  noble_born: { name: 'Highborn', abs: ['str', 'int', 'cha'], skills: ['history', 'persuasion'], feat: 'Skilled', gold: 25, kit: ['signet_ring'], desc: 'You were raised to wealth and expected to lead.' },
  minstrel: { name: 'Minstrel', abs: ['str', 'dex', 'cha'], skills: ['acrobatics', 'performance'], feat: 'Musician', gold: 11, kit: ['lute'], desc: 'You sang for your supper in every tavern from here to the coast.' },
  hermit_bg: { name: 'Recluse', abs: ['con', 'wis', 'cha'], skills: ['medicine', 'religion'], feat: 'Healer', gold: 8, kit: ['healers_kit', 'herbalism_kit'], desc: 'You lived apart, seeking something only silence could teach.' },
  artisan: { name: 'Artisan', abs: ['str', 'dex', 'int'], skills: ['investigation', 'persuasion'], feat: 'Crafter', gold: 32, kit: ['smiths_tools'], desc: 'You learned a trade at a master\'s bench.' },
};
const DND_BACKGROUND_ORDER = ['acolyte', 'criminal', 'sage', 'soldier', 'woodwarden', 'wayfarer', 'noble_born', 'minstrel', 'hermit_bg', 'artisan'];
// origin feats, kept small and real-time friendly
const DND_FEATS = {
  'Alert': 'Add your proficiency bonus to initiative: you are never caught flat-footed, and ambushers don\'t get a free first strike.',
  'Magic Initiate (Cleric)': 'You know the Guidance and Sacred Flame cantrips, and Bless once per long rest.',
  'Magic Initiate (Wizard)': 'You know the Fire Bolt and Light cantrips, and Magic Missile once per long rest.',
  'Savage Attacker': 'Once per turn, roll your weapon\'s damage dice twice and use the higher.',
  'Tough': 'Your hit point maximum rises by 2 for every level.',
  'Lucky': 'Three Luck points per long rest: each turns a failed d20 into a reroll.',
  'Skilled': 'Proficiency in three skills of your choice (given at random from those you lack).',
  'Musician': 'After a rest you play for the party: everyone gains Heroic Inspiration.',
  'Healer': 'Your healer\'s kit restores 1d6 + 4 + your level, once per creature per rest.',
  'Crafter': 'Twenty percent off at every shop, and you smith gear faster.',
};

// ---- classes ------------------------------------------------------------------
// kit: starting equipment as [itemKey, count] (items defined in dnd/items.js, or the base game's).
// armor: what the class may wear without penalty ('light' | 'medium' | 'heavy' | 'shield').
// signature: the class feature on the ability key (Q); second: the bonus-action feature (Z) when the species has none.
const DND_CLASSES = {
  barbarian: { name: 'Barbarian', hd: 12, primary: ['str'], saves: ['str', 'con'], armor: ['light', 'medium', 'shield'], skillsFrom: ['animal', 'athletics', 'intimidation', 'nature', 'perception', 'survival'], skillN: 2,
    unarmored: ['dex', 'con'], color: '#c0402a', icon: 'greataxe',
    desc: 'A fierce warrior of primal rage. Heavy blows, thick skin, no fear.',
    signature: 'rage', features: { 1: ['Rage', 'Unarmored Defense', 'Weapon Mastery'], 2: ['Danger Sense', 'Reckless Attack'], 3: ['Primal Path: Berserker'], 5: ['Extra Attack', 'Fast Movement'], 7: ['Feral Instinct'], 9: ['Brutal Strike'] },
    kit: [['greataxe', 1], ['handaxe', 4], ['explorers_pack', 1]], gold: 15 },
  bard: { name: 'Bard', hd: 8, primary: ['cha'], saves: ['dex', 'cha'], armor: ['light'], skillsFrom: DND_SKILL_ORDER, skillN: 3, caster: 'full', castAb: 'cha', color: '#c060c0', icon: 'lute',
    desc: 'A magician of song and story who inspires friends and unravels foes.',
    signature: 'inspiration', cantrips: ['vicious_mockery', 'dancing_lights'], spells: ['healing_word', 'command', 'charm_person', 'thunderwave', 'faerie_fire', 'shatter', 'hold_person', 'invisibility', 'hypnotic_pattern'],
    features: { 1: ['Bardic Inspiration', 'Spellcasting'], 2: ['Expertise', 'Jack of All Trades'], 3: ['College of Lore'], 5: ['Font of Inspiration'], 6: ['Countercharm'] },
    kit: [['leather_armor', 1], ['dagger', 2], ['lute', 1], ['entertainers_pack', 1]], gold: 19 },
  cleric: { name: 'Cleric', hd: 8, primary: ['wis'], saves: ['wis', 'cha'], armor: ['light', 'medium', 'shield'], skillsFrom: ['history', 'insight', 'medicine', 'persuasion', 'religion'], skillN: 2, caster: 'full', castAb: 'wis', color: '#e8c040', icon: 'holy_symbol',
    desc: 'A priestly champion who wields divine magic in service of a higher power.',
    signature: 'channel', cantrips: ['sacred_flame', 'guidance', 'light'], spells: ['cure_wounds', 'healing_word', 'bless', 'guiding_bolt', 'shield_of_faith', 'spiritual_weapon', 'aid', 'lesser_restoration', 'spirit_guardians', 'revivify', 'mass_healing_word'],
    features: { 1: ['Divine Order: Protector', 'Spellcasting'], 2: ['Channel Divinity'], 3: ['Life Domain'], 5: ['Sear Undead'], 7: ['Blessed Strikes'] },
    kit: [['chain_shirt', 1], ['shield', 1], ['mace', 1], ['holy_symbol', 1], ['priests_pack', 1]], gold: 7 },
  druid: { name: 'Druid', hd: 8, primary: ['wis'], saves: ['int', 'wis'], armor: ['light', 'shield'], skillsFrom: ['arcana', 'animal', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'], skillN: 2, caster: 'full', castAb: 'wis', color: '#4aa040', icon: 'druid_staff',
    desc: 'A priest of the Old Faith, wielding the powers of nature and taking animal forms.',
    signature: 'wild_shape', cantrips: ['produce_flame', 'shillelagh', 'guidance'], spells: ['cure_wounds', 'entangle', 'thunderwave', 'faerie_fire', 'healing_word', 'moonbeam', 'barkskin', 'spike_growth', 'call_lightning', 'plant_growth', 'sleet_storm'],
    features: { 1: ['Druidic', 'Primal Order: Warden', 'Spellcasting'], 2: ['Wild Shape', 'Wild Companion'], 3: ['Circle of the Land'], 5: ['Wild Resurgence'] },
    kit: [['leather_armor', 1], ['shield', 1], ['sickle', 1], ['druid_staff', 1], ['explorers_pack', 1], ['herbalism_kit', 1]], gold: 9 },
  fighter: { name: 'Fighter', hd: 10, primary: ['str', 'dex'], saves: ['str', 'con'], armor: ['light', 'medium', 'heavy', 'shield'], skillsFrom: ['acrobatics', 'animal', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'], skillN: 2, color: '#a0a8b8', icon: 'longsword',
    desc: 'A master of martial combat, skilled with a variety of weapons and armour.',
    signature: 'second_wind', features: { 1: ['Fighting Style: Defense', 'Second Wind', 'Weapon Mastery'], 2: ['Action Surge', 'Tactical Mind'], 3: ['Champion: Improved Critical'], 5: ['Extra Attack', 'Tactical Shift'], 9: ['Indomitable'] },
    kit: [['chain_mail', 1], ['longsword', 1], ['shield', 1], ['shortbow', 1], ['arrow', 20], ['dungeoneers_pack', 1]], gold: 4 },
  monk: { name: 'Monk', hd: 8, primary: ['dex', 'wis'], saves: ['str', 'dex'], armor: [], skillsFrom: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'], skillN: 2, unarmored: ['dex', 'wis'], martial: true, color: '#40a0c0', icon: 'quarterstaff',
    desc: 'A master of martial arts, harnessing the power of the body and the spirit.',
    signature: 'flurry', features: { 1: ['Martial Arts', 'Unarmored Defense'], 2: ['Monk\'s Focus', 'Unarmored Movement', 'Uncanny Metabolism'], 3: ['Deflect Attacks', 'Warrior of the Open Hand'], 4: ['Slow Fall'], 5: ['Extra Attack', 'Stunning Strike'] },
    kit: [['spear', 1], ['dagger', 5], ['explorers_pack', 1]], gold: 11 },
  paladin: { name: 'Paladin', hd: 10, primary: ['str', 'cha'], saves: ['wis', 'cha'], armor: ['light', 'medium', 'heavy', 'shield'], skillsFrom: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'], skillN: 2, caster: 'half', castAb: 'cha', color: '#f0e0a0', icon: 'longsword',
    desc: 'A holy warrior bound to a sacred oath.',
    signature: 'lay_on_hands', cantrips: [], spells: ['divine_smite', 'bless', 'cure_wounds', 'shield_of_faith', 'heroism', 'aid', 'lesser_restoration', 'magic_weapon', 'revivify', 'daylight'],
    features: { 1: ['Lay on Hands', 'Spellcasting', 'Weapon Mastery'], 2: ['Fighting Style: Defense', 'Paladin\'s Smite'], 3: ['Channel Divinity', 'Oath of Devotion'], 5: ['Extra Attack', 'Faithful Steed'], 6: ['Aura of Protection'] },
    kit: [['chain_mail', 1], ['shield', 1], ['longsword', 1], ['javelin', 6], ['holy_symbol', 1], ['priests_pack', 1]], gold: 9 },
  ranger: { name: 'Ranger', hd: 10, primary: ['dex', 'wis'], saves: ['str', 'dex'], armor: ['light', 'medium', 'shield'], skillsFrom: ['animal', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'], skillN: 3, caster: 'half', castAb: 'wis', color: '#6a8a3a', icon: 'longbow',
    desc: 'A warrior of the wilderness who hunts with bow, blade and nature\'s magic.',
    signature: 'hunters_mark', cantrips: [], spells: ['hunters_mark', 'cure_wounds', 'longstrider', 'fog_cloud', 'goodberry', 'pass_without_trace', 'spike_growth', 'lesser_restoration', 'conjure_animals'],
    features: { 1: ['Favored Enemy', 'Spellcasting', 'Weapon Mastery'], 2: ['Deft Explorer', 'Fighting Style: Archery'], 3: ['Hunter'], 5: ['Extra Attack'], 6: ['Roving'] },
    kit: [['studded_leather', 1], ['scimitar', 1], ['shortsword', 1], ['longbow', 1], ['arrow', 20], ['explorers_pack', 1]], gold: 7 },
  rogue: { name: 'Rogue', hd: 8, primary: ['dex'], saves: ['dex', 'int'], armor: ['light'], skillsFrom: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleight', 'stealth'], skillN: 4, color: '#5a5a6a', icon: 'dagger',
    desc: 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies.',
    signature: 'cunning', features: { 1: ['Expertise', 'Sneak Attack', 'Thieves\' Cant', 'Weapon Mastery'], 2: ['Cunning Action'], 3: ['Steady Aim', 'Thief'], 5: ['Cunning Strike', 'Uncanny Dodge'], 7: ['Evasion', 'Reliable Talent'] },
    kit: [['leather_armor', 1], ['dagger', 2], ['shortsword', 1], ['shortbow', 1], ['arrow', 20], ['thieves_tools', 1], ['burglars_pack', 1]], gold: 8 },
  sorcerer: { name: 'Sorcerer', hd: 6, primary: ['cha'], saves: ['con', 'cha'], armor: [], skillsFrom: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'], skillN: 2, caster: 'full', castAb: 'cha', color: '#e04a4a', icon: 'arcane_focus',
    desc: 'A spellcaster who draws on inherent magic from a gift or bloodline.',
    signature: 'innate_sorcery', cantrips: ['fire_bolt', 'ray_of_frost', 'shocking_grasp', 'light'], spells: ['magic_missile', 'burning_hands', 'shield', 'chromatic_orb', 'sleep', 'scorching_ray', 'misty_step', 'hold_person', 'fireball', 'lightning_bolt', 'haste'],
    features: { 1: ['Innate Sorcery', 'Spellcasting'], 2: ['Font of Magic', 'Metamagic'], 3: ['Draconic Sorcery'], 5: ['Sorcerous Restoration'] },
    kit: [['spear', 1], ['dagger', 2], ['arcane_focus', 1], ['dungeoneers_pack', 1]], gold: 28 },
  warlock: { name: 'Warlock', hd: 8, primary: ['cha'], saves: ['wis', 'cha'], armor: ['light'], skillsFrom: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'], skillN: 2, caster: 'pact', castAb: 'cha', color: '#8a3ac0', icon: 'arcane_focus',
    desc: 'A wielder of magic derived from a bargain with an extraplanar entity.',
    signature: 'pact_blast', cantrips: ['eldritch_blast', 'chill_touch'], spells: ['hex', 'hellish_rebuke', 'charm_person', 'misty_step', 'hold_person', 'darkness', 'fireball', 'counterspell'],
    features: { 1: ['Eldritch Invocations', 'Pact Magic'], 2: ['Magical Cunning'], 3: ['Fiend Patron'], 5: ['More Invocations'] },
    kit: [['leather_armor', 1], ['sickle', 1], ['dagger', 2], ['arcane_focus', 1], ['book', 1], ['scholars_pack', 1]], gold: 15 },
  wizard: { name: 'Wizard', hd: 6, primary: ['int'], saves: ['int', 'wis'], armor: [], skillsFrom: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'], skillN: 2, caster: 'full', castAb: 'int', color: '#4a6ae0', icon: 'spellbook',
    desc: 'A scholarly magic-user capable of manipulating the structures of reality.',
    signature: 'arcane_recovery', cantrips: ['fire_bolt', 'ray_of_frost', 'light', 'mage_hand'], spells: ['magic_missile', 'shield', 'sleep', 'burning_hands', 'mage_armor', 'thunderwave', 'misty_step', 'scorching_ray', 'hold_person', 'web', 'fireball', 'lightning_bolt', 'counterspell', 'haste'],
    features: { 1: ['Ritual Adept', 'Spellcasting', 'Arcane Recovery'], 2: ['Scholar'], 3: ['Evoker'], 5: ['Memorize Spell'] },
    kit: [['quarterstaff', 1], ['spellbook', 1], ['dagger', 2], ['scholars_pack', 1]], gold: 5 },
};
const DND_CLASS_ORDER = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];

// the class signature abilities (Q). uses: per short rest ('sr') or long rest ('lr').
const DND_SIGNATURES = {
  rage: { name: 'Rage', desc: 'For a minute: +2 melee damage (more later), resistance to bludgeoning, piercing and slashing, advantage on Strength checks.', uses: (lvl) => lvl < 3 ? 2 : lvl < 6 ? 3 : lvl < 12 ? 4 : 5, rest: 'lr', regainSr: 1 },
  inspiration: { name: 'Bardic Inspiration', desc: 'Give the nearest ally (or yourself in solo play) a die to add to their next failed roll: d6, d8 at 5th, d10 at 10th.', uses: (lvl, c) => Math.max(1, dndMod(c.ab.cha)), rest: (lvl) => lvl >= 5 ? 'sr' : 'lr' },
  channel: { name: 'Channel Divinity: Divine Spark', desc: 'A burst of divine light: heals you and allies within 6 blocks for 1d8 + Wisdom, or sears undead around you.', uses: (lvl) => lvl < 2 ? 1 : lvl < 6 ? 2 : 3, rest: 'sr' },
  wild_shape: { name: 'Wild Shape', desc: 'Turn into a beast for an hour (wolf). Temporary hit points equal to your druid level; claws and teeth.', uses: (lvl) => lvl < 2 ? 1 : lvl < 6 ? 2 : 3, rest: 'sr' },
  second_wind: { name: 'Second Wind', desc: 'Regain 1d10 + your fighter level hit points.', uses: (lvl) => lvl < 4 ? 2 : lvl < 10 ? 3 : 4, rest: 'lr', regainSr: 1 },
  flurry: { name: 'Flurry of Blows', desc: 'Two quick unarmed strikes at once. Costs 1 Focus point (Focus from 2nd level; at 1st, once per short rest).', uses: (lvl) => Math.max(1, lvl), rest: 'sr' },
  lay_on_hands: { name: 'Lay on Hands', desc: 'A healing touch: restore 5 hit points from your pool (5 × paladin level) to yourself or the ally you look at.', uses: (lvl) => lvl, rest: 'lr' },
  hunters_mark: { name: 'Hunter\'s Mark', desc: 'Mark the creature you look at: +1d6 damage to it from your attacks for an hour. Free uses equal to your Wisdom modifier.', uses: (lvl, c) => Math.max(1, dndMod(c.ab.wis)), rest: 'lr' },
  cunning: { name: 'Shadowstep', desc: 'Vanish into shadow for 6 seconds: creatures lose track of you, and your next hit is a Sneak Attack. (Cunning Action from 2nd level.)', uses: (lvl) => lvl < 2 ? 2 : 4, rest: 'sr' },
  innate_sorcery: { name: 'Innate Sorcery', desc: 'For a minute: +1 to your spell save DC and advantage on your spell attack rolls.', uses: () => 2, rest: 'lr' },
  pact_blast: { name: 'Curse of the Pact', desc: 'Curse the creature you look at: +1d6 necrotic damage from your attacks, and it has disadvantage on checks of one ability.', uses: () => 1, rest: 'sr' },
  arcane_recovery: { name: 'Arcane Recovery', desc: 'Once per day after a short rest, recover spell slots worth up to half your wizard level.', uses: () => 1, rest: 'lr' },
};

// ---- creatures' armour class and attack bonus (for the d20 against your AC) ----------
// Anything not listed gets a value from its hit points (tougher things are better armoured).
const DND_MOB_AC = {
  rabbit: 13, chicken: 10, deer: 13, boar: 11, cow: 10, pig: 10, sheep: 10, ghoul: 8, charred_ghoul: 10, skeleton: 13, stray: 13, husk: 9, drowned: 9,
  spider: 12, cave_spider: 13, wolf: 13, bear: 11, wraith: 13, ogre: 11, werewolf: 12, marauder: 13, bog_witch: 12, crocodile: 12, shark: 12,
  cinder_golem: 17, warden: 18, dragon: 18, enderman: 14, slime: 8, magma_slime: 10, stone_mite: 13, scorpion: 14, lion: 12, tiger: 12,
};
function dndMobAC(m) {
  if (m && m.T && m.T.ac) return m.T.ac;
  const t = m && m.type;
  if (t && DND_MOB_AC[t] != null) return DND_MOB_AC[t];
  const hp = (m && (m.maxHealth || (m.T && m.T.hp))) || 10;
  return Math.max(8, Math.min(19, Math.round(9 + Math.log2(Math.max(2, hp)) * 1.1)));
}
function dndMobAttack(m) {
  if (m && m.T && m.T.toHit != null) return m.T.toHit;
  const hp = (m && (m.maxHealth || (m.T && m.T.hp))) || 10;
  return Math.max(2, Math.min(14, Math.round(1 + Math.log2(Math.max(2, hp)) * 1.05)));
}
// experience for defeating a creature, by its toughness (CR-like), when it has none of its own
function dndMobXp(m) {
  if (m && m.T && m.T.dndXp) return m.T.dndXp;
  const hp = (m && (m.maxHealth || (m.T && m.T.hp))) || 4;
  if (!(m && m.T && m.T.hostile)) return Math.round(hp * 0.6);
  return Math.round(hp * hp * 0.07 + hp * 1.6);
}
