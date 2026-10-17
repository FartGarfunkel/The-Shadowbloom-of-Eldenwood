// ---------------------------------------------------------------------------
// dnd/spelldata.js — the spells, as data. Each has a level (0 = cantrip), a school,
// what it does in real time (kind), its dice and how they grow, and the save or
// attack it uses. dnd/spells.js turns these into bolts, bursts, heals and buffs.
//
// Spell names and effects from the System Reference Document 5.2 (CC BY 4.0),
// shortened for real-time play.
//
// kind:
//   bolt     a projectile; attack roll against AC (or a save, with save:)
//   missile  darts that never miss
//   ray      a beam that hits the first creature in line (attack roll)
//   touch    melee spell attack on the creature in front of you
//   cone     a cone in front of you; save for half
//   burst    a sphere where you look (or around you, self:true); save for half
//   line     a line from you; save for half
//   target   the creature you look at makes a save
//   heal     you or the ally you look at
//   buff     a timed effect on you (or allies, party:true)
//   summon   a spirit that fights for you
//   utility  everything else (light, misty step...)
// scale: 'cantrip' adds a die at levels 5, 11 and 17; a number adds that many dice per slot level above the base.
// ---------------------------------------------------------------------------

const DND_SPELLS = {
  // ---- cantrips ----
  fire_bolt: { name: 'Fire Bolt', lvl: 0, school: 'Evocation', kind: 'bolt', dice: [1, 10], dmg: 'fire', range: 24, scale: 'cantrip', fx: 'mana_fire', col: '#ff7a2a', desc: 'A mote of fire streaks at a creature: 1d10 fire on a hit, and it may catch alight.' },
  ray_of_frost: { name: 'Ray of Frost', lvl: 0, school: 'Evocation', kind: 'ray', dice: [1, 8], dmg: 'cold', range: 12, scale: 'cantrip', slow: 3, fx: 'mana_frost', col: '#8ad8ff', desc: 'A frigid beam: 1d8 cold and the target slows.' },
  shocking_grasp: { name: 'Shocking Grasp', lvl: 0, school: 'Evocation', kind: 'touch', dice: [1, 8], dmg: 'lightning', scale: 'cantrip', adv: 'metal', knock: 1.2, fx: 'mana_light', col: '#c8e0ff', desc: 'Lightning leaps from your hand: 1d8 lightning, and it can\'t strike back for a moment.' },
  eldritch_blast: { name: 'Eldritch Blast', lvl: 0, school: 'Evocation', kind: 'bolt', dice: [1, 10], dmg: 'force', range: 24, beams: 'cantrip', fx: 'mana_arcane', col: '#c060ff', desc: 'A beam of crackling energy: 1d10 force. More beams at levels 5, 11 and 17.' },
  sacred_flame: { name: 'Sacred Flame', lvl: 0, school: 'Evocation', kind: 'target', save: 'dex', dice: [1, 8], dmg: 'radiant', range: 12, scale: 'cantrip', fx: 'mana_light', col: '#ffe08a', desc: 'Radiance descends on a creature you can see: Dexterity save or 1d8 radiant.' },
  vicious_mockery: { name: 'Vicious Mockery', lvl: 0, school: 'Enchantment', kind: 'target', save: 'wis', dice: [1, 6], dmg: 'psychic', range: 12, scale: 'cantrip', weaken: 6, fx: 'mana_arcane', col: '#e080e0', desc: 'A string of insults laced with enchantment: Wisdom save or 1d6 psychic, and its next attack is at disadvantage.' },
  chill_touch: { name: 'Chill Touch', lvl: 0, school: 'Necromancy', kind: 'touch', dice: [1, 10], dmg: 'necrotic', scale: 'cantrip', noHeal: 6, fx: 'mana_frost', col: '#80e0c0', desc: 'Ghostly cold: 1d10 necrotic, and it can\'t regain hit points for a while.' },
  produce_flame: { name: 'Produce Flame', lvl: 0, school: 'Conjuration', kind: 'bolt', dice: [1, 8], dmg: 'fire', range: 12, scale: 'cantrip', light: true, fx: 'mana_fire', col: '#ffa040', desc: 'A flame in your palm lights the way; hurl it for 1d8 fire.' },
  poison_spray: { name: 'Poison Spray', lvl: 0, school: 'Necromancy', kind: 'ray', dice: [1, 12], dmg: 'poison', range: 6, scale: 'cantrip', fx: 'mana_heal', col: '#8ad040', desc: 'A spray of toxic mist: 1d12 poison.' },
  shillelagh: { name: 'Shillelagh', lvl: 0, school: 'Transmutation', kind: 'buff', buff: 'shillelagh', dur: 60, fx: 'mana_heal', col: '#7ad04a', desc: 'Your club or staff becomes a d8 weapon that strikes with your spellcasting ability, for a minute.' },
  guidance: { name: 'Guidance', lvl: 0, school: 'Divination', kind: 'buff', buff: 'guidance', dur: 60, party: true, fx: 'mana_light', col: '#fff0a0', desc: 'You and nearby allies add 1d4 to your next ability check.' },
  light: { name: 'Light', lvl: 0, school: 'Evocation', kind: 'utility', util: 'light', dur: 600, fx: 'mana_light', col: '#fff0a0', desc: 'A glowing light that follows you for an hour.' },
  dancing_lights: { name: 'Dancing Lights', lvl: 0, school: 'Illusion', kind: 'utility', util: 'light', dur: 60, fx: 'mana_arcane', col: '#c0a0ff', desc: 'Floating lights that follow you about for a minute.' },
  mage_hand: { name: 'Mage Hand', lvl: 0, school: 'Conjuration', kind: 'utility', util: 'hand', fx: 'mana_arcane', col: '#a0c0ff', desc: 'A spectral hand that pulls the lever, opens the door or takes the item you look at, up to 6 blocks away.' },
  minor_illusion: { name: 'Minor Illusion', lvl: 0, school: 'Illusion', kind: 'utility', util: 'decoy', fx: 'mana_arcane', col: '#c0a0ff', desc: 'A sound or an image that draws creatures where you look.' },
  mending: { name: 'Mending', lvl: 0, school: 'Transmutation', kind: 'utility', util: 'mend', fx: 'mana_light', col: '#e0d0a0', desc: 'Repairs a little wear on the item in your hand.' },
  thaumaturgy: { name: 'Thaumaturgy', lvl: 0, school: 'Transmutation', kind: 'utility', util: 'thaumaturgy', fx: 'mana_fire', col: '#ff8040', desc: 'Your voice booms, flames flicker, the ground trembles: a minor wonder.' },
  // ---- 1st level ----
  magic_missile: { name: 'Magic Missile', lvl: 1, school: 'Evocation', kind: 'missile', darts: 3, dice: [1, 4], plus: 1, dmg: 'force', range: 24, scale: 1, fx: 'mana_arcane', col: '#a080ff', desc: 'Three glowing darts that always hit: 1d4 + 1 force each. One more dart per higher slot.' },
  burning_hands: { name: 'Burning Hands', lvl: 1, school: 'Evocation', kind: 'cone', save: 'dex', dice: [3, 6], dmg: 'fire', range: 3, scale: 1, fx: 'mana_fire', col: '#ff6a20', desc: 'A 15-foot cone of flame: Dexterity save, 3d6 fire (half on a success).' },
  thunderwave: { name: 'Thunderwave', lvl: 1, school: 'Evocation', kind: 'burst', self: true, save: 'con', dice: [2, 8], dmg: 'thunder', range: 3, scale: 1, knock: 2.5, fx: 'mana_light', col: '#d0e0ff', desc: 'A wave of thunder sweeps out from you: Constitution save, 2d8 thunder and pushed away (half, not pushed, on a success).' },
  guiding_bolt: { name: 'Guiding Bolt', lvl: 1, school: 'Evocation', kind: 'bolt', dice: [4, 6], dmg: 'radiant', range: 24, scale: 1, mark: 'guided', fx: 'mana_light', col: '#ffe060', desc: 'A flash of light: 4d6 radiant on a hit, and the next attack against it has advantage.' },
  chromatic_orb: { name: 'Chromatic Orb', lvl: 1, school: 'Evocation', kind: 'bolt', dice: [3, 8], dmg: 'chosen', range: 18, scale: 1, fx: 'mana_arcane', col: '#ff60c0', desc: 'A sphere of energy of a type you choose (G to change): 3d8 on a hit.' },
  command: { name: 'Command', lvl: 1, school: 'Enchantment', kind: 'target', save: 'wis', range: 12, fear: 6, fx: 'mana_arcane', col: '#c080ff', desc: 'A one-word command — "Flee!": the creature you look at makes a Wisdom save or runs from you.' },
  hellish_rebuke: { name: 'Hellish Rebuke', lvl: 1, school: 'Evocation', kind: 'target', save: 'dex', dice: [2, 10], dmg: 'fire', range: 12, scale: 1, reaction: true, fx: 'mana_fire', col: '#ff4020', desc: 'The creature that hurt you last is wreathed in flames: Dexterity save, 2d10 fire.' },
  healing_word: { name: 'Healing Word', lvl: 1, school: 'Abjuration', kind: 'heal', dice: [2, 4], addMod: true, range: 12, scale: 1, bonus: true, fx: 'mana_heal', col: '#7aff8a', desc: 'A word of power heals you or the ally you look at: 2d4 + your spellcasting modifier.' },
  cure_wounds: { name: 'Cure Wounds', lvl: 1, school: 'Abjuration', kind: 'heal', dice: [2, 8], addMod: true, range: 2, scale: 2, fx: 'mana_heal', col: '#7aff8a', desc: 'A touch that heals 2d8 + your spellcasting modifier.' },
  bless: { name: 'Bless', lvl: 1, school: 'Enchantment', kind: 'buff', buff: 'bless', dur: 60, party: true, conc: true, fx: 'mana_light', col: '#fff0a0', desc: 'You and up to two allies add 1d4 to attack rolls and saving throws for a minute.' },
  shield_of_faith: { name: 'Shield of Faith', lvl: 1, school: 'Abjuration', kind: 'buff', buff: 'shield_of_faith', dur: 600, conc: true, ally: true, fx: 'mana_light', col: '#ffe08a', desc: '+2 AC to you or the ally you look at, for ten minutes.' },
  shield: { name: 'Shield', lvl: 1, school: 'Abjuration', kind: 'buff', buff: 'shield', dur: 6, reaction: true, fx: 'mana_arcane', col: '#a0c0ff', desc: 'An invisible barrier: +5 AC until your next turn (6 seconds).' },
  mage_armor: { name: 'Mage Armor', lvl: 1, school: 'Abjuration', kind: 'buff', buff: 'mage_armor', dur: 28800, fx: 'mana_arcane', col: '#80a0ff', desc: 'Without armour, your AC becomes 13 + Dexterity for eight hours.' },
  sleep: { name: 'Sleep', lvl: 1, school: 'Enchantment', kind: 'burst', save: 'wis', range: 2, sleep: 12, at: 18, fx: 'mana_arcane', col: '#c0a0ff', desc: 'Creatures in a 5-foot sphere where you look must make a Wisdom save or fall asleep for a while.' },
  charm_person: { name: 'Charm Person', lvl: 1, school: 'Enchantment', kind: 'target', save: 'wis', charm: 60, humanoid: true, range: 6, fx: 'mana_arcane', col: '#ff80c0', desc: 'A humanoid you look at makes a Wisdom save or is charmed: it won\'t attack you, and villagers like you better (advantage on Charisma checks with it).' },
  entangle: { name: 'Entangle', lvl: 1, school: 'Conjuration', kind: 'burst', save: 'str', range: 2, at: 18, root: 8, conc: true, fx: 'mana_heal', col: '#5ac03a', desc: 'Grasping weeds sprout in a 20-foot square: Strength save or held fast.' },
  faerie_fire: { name: 'Faerie Fire', lvl: 1, school: 'Evocation', kind: 'burst', save: 'dex', range: 2, at: 18, mark: 'outlined', dur: 60, conc: true, fx: 'mana_arcane', col: '#c080ff', desc: 'Creatures where you look glow (Dexterity save): attacks against them have advantage, and they can\'t hide.' },
  hunters_mark: { name: 'Hunter\'s Mark', lvl: 1, school: 'Divination', kind: 'target', mark: 'hunted', extra: [1, 6], range: 18, dur: 3600, conc: true, bonus: true, fx: 'mana_heal', col: '#80c040', desc: 'You mark a creature as your quarry: +1d6 damage to it from your weapon attacks.' },
  hex: { name: 'Curse of the Pact', lvl: 1, school: 'Enchantment', kind: 'target', mark: 'hexed', extra: [1, 6], extraDmg: 'necrotic', range: 18, dur: 3600, conc: true, bonus: true, fx: 'mana_arcane', col: '#8a3ac0', desc: 'A curse: +1d6 necrotic damage to it from your attacks.' },
  divine_smite: { name: 'Divine Smite', lvl: 1, school: 'Evocation', kind: 'buff', buff: 'smite', dice: [2, 8], dmg: 'radiant', dur: 12, scale: 1, bonus: true, fx: 'mana_light', col: '#ffe060', desc: 'Your next weapon hit within a few seconds deals an extra 2d8 radiant (1d8 more against undead and fiends).' },
  fog_cloud: { name: 'Fog Cloud', lvl: 1, school: 'Conjuration', kind: 'utility', util: 'fog', dur: 60, fx: 'mana_frost', col: '#d0d8e0', desc: 'A sphere of fog where you look: creatures inside lose sight of you.' },
  goodberry: { name: 'Goodberry', lvl: 1, school: 'Conjuration', kind: 'utility', util: 'goodberry', fx: 'mana_heal', col: '#e04060', desc: 'Ten magical berries, each healing 1 hit point and filling you for a day.' },
  longstrider: { name: 'Longstrider', lvl: 1, school: 'Transmutation', kind: 'buff', buff: 'longstrider', dur: 3600, ally: true, fx: 'mana_heal', col: '#c0e080', desc: 'You or an ally moves faster for an hour (+10 feet).' },
  heroism: { name: 'Heroism', lvl: 1, school: 'Enchantment', kind: 'buff', buff: 'heroism', dur: 60, ally: true, conc: true, fx: 'mana_light', col: '#ffe060', desc: 'Bravery fills you or an ally: no fear, and temporary hit points equal to your modifier every round.' },
  // ---- 2nd level ----
  misty_step: { name: 'Misty Step', lvl: 2, school: 'Conjuration', kind: 'utility', util: 'blink', range: 6, bonus: true, fx: 'mana_arcane', col: '#c0c0ff', desc: 'Silvery mist: you teleport up to 30 feet to where you look.' },
  scorching_ray: { name: 'Scorching Ray', lvl: 2, school: 'Evocation', kind: 'bolt', rays: 3, dice: [2, 6], dmg: 'fire', range: 24, scaleRays: 1, fx: 'mana_fire', col: '#ff6020', desc: 'Three rays of fire, each an attack: 2d6 fire on a hit.' },
  shatter: { name: 'Shatter', lvl: 2, school: 'Evocation', kind: 'burst', save: 'con', dice: [3, 8], dmg: 'thunder', range: 2, at: 18, scale: 1, breaks: true, fx: 'mana_light', col: '#d0e0ff', desc: 'A ringing noise bursts where you look: Constitution save, 3d8 thunder. It cracks glass and loose stone.' },
  hold_person: { name: 'Hold Person', lvl: 2, school: 'Enchantment', kind: 'target', save: 'wis', hold: 10, humanoid: true, range: 18, conc: true, fx: 'mana_arcane', col: '#a0a0ff', desc: 'A humanoid you look at makes a Wisdom save or is paralysed: hits against it are critical.' },
  spiritual_weapon: { name: 'Spiritual Weapon', lvl: 2, school: 'Evocation', kind: 'summon', summon: 'spirit_blade', dur: 60, dice: [1, 8], dmg: 'force', addMod: true, scale: 1, bonus: true, fx: 'mana_light', col: '#ffe08a', desc: 'A floating spectral weapon fights beside you for a minute: 1d8 + your modifier force.' },
  moonbeam: { name: 'Moonbeam', lvl: 2, school: 'Evocation', kind: 'burst', save: 'con', dice: [2, 10], dmg: 'radiant', range: 1, at: 24, linger: 60, conc: true, scale: 1, fx: 'mana_light', col: '#d8e8ff', desc: 'A silvery beam of pale light where you look: creatures in it take 2d10 radiant (Constitution save for half).' },
  barkskin: { name: 'Barkskin', lvl: 2, school: 'Transmutation', kind: 'buff', buff: 'barkskin', dur: 3600, bonus: true, ally: true, fx: 'mana_heal', col: '#8a6a3a', desc: 'Skin like bark: your AC can\'t be less than 17 for an hour.' },
  spike_growth: { name: 'Spike Growth', lvl: 2, school: 'Transmutation', kind: 'burst', dice: [2, 4], dmg: 'piercing', range: 4, at: 18, linger: 60, slow: 2, conc: true, fx: 'mana_heal', col: '#6a8a3a', desc: 'The ground where you look sprouts thorns: 2d4 piercing for every few steps through it.' },
  aid: { name: 'Aid', lvl: 2, school: 'Abjuration', kind: 'buff', buff: 'aid', dur: 28800, party: true, scale: 5, fx: 'mana_light', col: '#fff0a0', desc: 'You and two allies gain 5 hit points (maximum and current) for eight hours.' },
  lesser_restoration: { name: 'Lesser Restoration', lvl: 2, school: 'Abjuration', kind: 'heal', cleanse: true, range: 2, bonus: true, fx: 'mana_heal', col: '#a0ffc0', desc: 'Ends poison, blindness, deafness or paralysis on you or an ally.' },
  invisibility: { name: 'Invisibility', lvl: 2, school: 'Illusion', kind: 'buff', buff: 'invisible', dur: 60, conc: true, fx: 'mana_arcane', col: '#e0e0ff', desc: 'You turn invisible for a minute, or until you attack or cast.' },
  darkness: { name: 'Darkness', lvl: 2, school: 'Evocation', kind: 'utility', util: 'darkness', dur: 60, conc: true, fx: 'mana_arcane', col: '#302040', desc: 'Magical darkness fills a 15-foot sphere where you look.' },
  web: { name: 'Web', lvl: 2, school: 'Conjuration', kind: 'burst', save: 'dex', range: 3, at: 18, root: 10, places: 'cobweb', conc: true, fx: 'mana_arcane', col: '#e0e0e0', desc: 'Thick sticky webbing where you look: Dexterity save or restrained.' },
  magic_weapon: { name: 'Magic Weapon', lvl: 2, school: 'Transmutation', kind: 'buff', buff: 'magic_weapon', dur: 3600, bonus: true, fx: 'mana_arcane', col: '#a0c0ff', desc: 'Your weapon becomes a +1 weapon for an hour.' },
  pass_without_trace: { name: 'Pass without Trace', lvl: 2, school: 'Abjuration', kind: 'buff', buff: 'pass_trace', dur: 3600, party: true, conc: true, fx: 'mana_frost', col: '#c0d0c0', desc: 'A veil of shadows: +10 to Stealth for you and nearby allies; creatures notice you far later.' },
  // ---- 3rd level ----
  fireball: { name: 'Fireball', lvl: 3, school: 'Evocation', kind: 'burst', save: 'dex', dice: [8, 6], dmg: 'fire', range: 4, at: 30, scale: 1, ignite: true, fx: 'mana_fire', col: '#ff5010', desc: 'A bright streak blossoms into an explosion of flame: Dexterity save, 8d6 fire in a 20-foot sphere.' },
  lightning_bolt: { name: 'Lightning Bolt', lvl: 3, school: 'Evocation', kind: 'line', save: 'dex', dice: [8, 6], dmg: 'lightning', range: 20, scale: 1, fx: 'mana_light', col: '#e0f0ff', desc: 'A stroke of lightning 100 feet long: Dexterity save, 8d6 lightning.' },
  counterspell: { name: 'Counterspell', lvl: 3, school: 'Abjuration', kind: 'utility', util: 'counter', reaction: true, fx: 'mana_arcane', col: '#a0a0ff', desc: 'Interrupt a creature casting a spell; also ends a magical effect on the creature you look at.' },
  haste: { name: 'Haste', lvl: 3, school: 'Transmutation', kind: 'buff', buff: 'haste', dur: 60, conc: true, ally: true, fx: 'mana_arcane', col: '#ffe0a0', desc: 'Doubled speed, +2 AC and quicker attacks for a minute; you\'re sluggish for a moment when it ends.' },
  spirit_guardians: { name: 'Spirit Guardians', lvl: 3, school: 'Conjuration', kind: 'buff', buff: 'guardians', dice: [3, 8], dmg: 'radiant', dur: 600, conc: true, scale: 1, fx: 'mana_light', col: '#ffe0a0', desc: 'Spirits flit around you: enemies near you are slowed and take 3d8 radiant (Wisdom save for half) each round.' },
  revivify: { name: 'Revivify', lvl: 3, school: 'Necromancy', kind: 'heal', revive: true, range: 2, fx: 'mana_heal', col: '#c0ffa0', desc: 'Return a fallen ally to life with 1 hit point. (Uses 300 gp of diamonds in the rules; here, a diamond.)', cost: 'diamond' },
  hypnotic_pattern: { name: 'Hypnotic Pattern', lvl: 3, school: 'Illusion', kind: 'burst', save: 'wis', range: 4, at: 18, sleep: 10, conc: true, fx: 'mana_arcane', col: '#ff80ff', desc: 'A twisting pattern of colours: creatures in it make a Wisdom save or stand dazed.' },
  call_lightning: { name: 'Call Lightning', lvl: 3, school: 'Conjuration', kind: 'burst', save: 'dex', dice: [3, 10], dmg: 'lightning', range: 1, at: 30, scale: 1, storm: true, fx: 'mana_light', col: '#e8f0ff', desc: 'A bolt from a storm cloud strikes where you look: Dexterity save, 3d10 lightning.' },
  plant_growth: { name: 'Plant Growth', lvl: 3, school: 'Transmutation', kind: 'utility', util: 'grow', fx: 'mana_heal', col: '#5ac03a', desc: 'Plants around you grow wildly: crops ripen and saplings shoot up.' },
  mass_healing_word: { name: 'Mass Healing Word', lvl: 3, school: 'Abjuration', kind: 'heal', party: true, dice: [1, 4], addMod: true, range: 12, scale: 1, bonus: true, fx: 'mana_heal', col: '#7aff8a', desc: 'You and every ally in sight regain 1d4 + your spellcasting modifier.' },
  daylight: { name: 'Daylight', lvl: 3, school: 'Evocation', kind: 'utility', util: 'daylight', dur: 3600, fx: 'mana_light', col: '#fff8c0', desc: 'A 60-foot sphere of bright light where you look, for an hour. It burns away magical darkness.' },
  conjure_animals: { name: 'Conjure Animals', lvl: 3, school: 'Conjuration', kind: 'summon', summon: 'spirit_wolves', n: 2, dur: 600, conc: true, fx: 'mana_heal', col: '#8ad0ff', desc: 'Spirit wolves appear and fight at your side for ten minutes.' },
  sleet_storm: { name: 'Sleet Storm', lvl: 3, school: 'Conjuration', kind: 'burst', save: 'dex', range: 5, at: 24, linger: 60, slow: 3, root: 2, conc: true, fx: 'mana_frost', col: '#c0e0ff', desc: 'Freezing rain and sleet where you look: creatures slip and slow, and fires go out.' },
};
const DND_DMG_TYPES = ['fire', 'cold', 'lightning', 'acid', 'poison', 'thunder', 'force', 'radiant', 'necrotic', 'psychic', 'slashing', 'piercing', 'bludgeoning'];
const DND_DMG_COL = { fire: '#ff7a2a', cold: '#8ad8ff', lightning: '#e0f0ff', acid: '#a0e040', poison: '#7ac040', thunder: '#c0c8ff', force: '#c080ff', radiant: '#ffe060', necrotic: '#60a080', psychic: '#ff80e0', slashing: '#ffffff', piercing: '#ffffff', bludgeoning: '#ffffff' };
