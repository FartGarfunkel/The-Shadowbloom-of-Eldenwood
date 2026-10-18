// ---------------------------------------------------------------------------
// campaign/sb_act2.js — Act II: Echoes of Corruption.
//
//   Scene 1  The Sigil's Shadow: Oakhaven, Mira, the sigil in the Razorwood, the stalkers.
//   Scene 2  The Vault of Old Greystone: Fate's letter, Borin's cart, the echo chamber, the five chimes.
//   Scene 3  The Whispering Marshes: Nico's deception; the first Resonance Anchor carries you home.
//   Scene 4  The Ember at Mount Cinder: Mara, Zephyr, the Fractured Vault, the Cindermelt Horror.
//   Scene 5  The Verdant Vale's Heart: the Whisperers, the Hollowed Guardian, Lyra's page three.
//   Scene 6  The Druidic Circle of Echoes: Lyra's ritual echo, her page four, the way to the Willow.
//   Scene 7  The Weeping Willow: the memory chorus, the Root of Grief, the Sealed Echo Seed.
//   Scene 8  The Song Restored: back at the Circle, the seventh tone; the Rootsong is whole.
//   Scene 9  The Shadowfell Forest: the backward lullaby, the Echo Gate, the Resonant Cage, the Mirrorroot.
// Between scenes the party returns to Stonebridge (by anchor or on foot) for Eldon's debrief and a night's rest,
// and the dreams come with the rest.
// ---------------------------------------------------------------------------

// Fate turns up where you weren't expecting her, hands you a letter, and is gone when you look up
function sbFate(id, where, cond, letter, line) {
  return Object.assign({
    name: 'Fate', title: 'Courier', seek: true, hail: 'You again!', unlisted: true, if: cond,
    look: SB_LOOK('human', { skin: '#e8c4a0', hair: 'wild', hairCol: '#8a5a2a', eyes: 'wide', eyeCol: '#7a6a3a', mouth: 'grin', marks: 'freckles', outfit: 'traveller', cols: ['#7a7a6a', '#3a6a3a', '#4a4a3a', '#3a2414'], cloak: true }),
    talk: { start: 'start', nodes: {
      start: { say: line + ' Got something I\'m supposed to deliver — your hands only.', do: [{ letter }], opts: [{ t: 'Read it', do: [{ read: letter }, { leave: id }], end: true }, { t: 'Who are you really, Fate?', go: 'who' }], bye: false },
      who: { say: '(She winks.) “Somebody who remembers where everybody is supposed to be. Read your letter.”', opts: [{ t: 'Read it', do: [{ read: letter }, { leave: id }], end: true }], bye: false },
    } },
  }, where);
}

// ---- Scene 1: Oakhaven ---------------------------------------------------------------------------------------------------
Object.assign(SB.npcs, {
  mira: {
    name: 'Mira', title: "Ember's Grandmother", place: 'oak_circle', offset: [2, 2],
    look: SB_LOOK('human', { skin: '#d8a888', hair: 'bun', hairCol: '#e8e8e8', eyes: 'round', eyeCol: '#3a7a4a', eyeCol2: '#6a4a2a', mouth: 'plain', outfit: 'leafrobe', cols: ['#6a7a4a', '#8a6a3a', '#4a4a32', '#4a3424'] }),
    about: 'Ember\'s grandmother. Wary at first, then wise and full of grief. She gathers herbs at the Sacred Stone Circle.',
    talk: { start: [
      { if: { quest: 'q2', stage: 'mira' }, node: 'first' }, { if: { quest: 'q2', stage: 'ask' }, node: 'first' },
      { if: { quest: 'q2', stage: 'back' }, node: 'back' },
      { if: { quest: 'q3', stage: 'fate' }, node: 'evening' },
      { if: { quest: 'q13', done: true }, node: 'after' },
    ], nodes: {
      start: { say: ['The stones still hum for her, you know. I come up here to listen.', 'Find her. That\'s all I ask of the world anymore.'], opts: [] },
      first: { say: 'Another stranger come to stare at the old woman whose granddaughter went strange?', do: [{ flag: 'know_mira' }], opts: [
        { t: 'Eldon the Wise sent us. We want to help Ember.', go: 'open' },
        { t: '[Persuasion] Gently: we\'re not here to stare. We\'re here to listen.', check: { skill: 'persuasion', dc: 12, pass: 'open', fail: 'wary', xp: 50 } },
        { t: '[Insight] She\'s not angry. She\'s afraid.', check: { skill: 'insight', dc: 13, pass: 'open', fail: 'wary', xp: 50 } },
      ], bye: false },
      wary: { say: '(She studies you a long time.) “…Eldon\'s friends, then. Very well.”', opts: [{ t: 'What happened to Ember?', go: 'open' }], bye: false },
      open: { say: 'She vanished chasing a "silver leaf that sang". When she came back, she was changed — quiet, fixated. She drew the sigil over and over: in the hearth ash, in the dirt, even in her dreams. She said the sigil was a door. And that the tree told her how to listen.', opts: [{ t: 'Where did she go?', go: 'cloth' }], bye: false },
      cloth: { say: 'Her trail ends in the Razorwood, east of here, at a great tree. I kept this — a cloth she marked. Take it. (She presses it into your hands.) If you find her again… please… bring her home. If she\'s still in there.',
        do: [{ give: 'ember_sigil_cloth' }, { flag: 'mira_told' }, { reveal: ['razorwood'] }], opts: [{ t: 'We\'ll find her.', end: true }], bye: false },
      back: { say: 'Something opened her eyes in there. Pray it hasn\'t taken the rest of her.', opts: [{ t: 'Do you have any idea where Ember might be, or where she could have gone?', go: 'vault' }] },
      vault: { say: 'She spoke of a place once — before the forest took her. She called it "the Vault where stone remembers". I thought it was just a child\'s dream. But maybe she meant the ruins in the old hills. There\'s a place past the western ridge, north-west of here, where the old ones built deep. We call it Greystone. No one goes there anymore — not after the last collapse. If she followed the voice that sings in trees… maybe that\'s where she went. Or maybe… it called her back.',
        do: [{ flag: 'greystone_lead' }, { reveal: ['greystone'] }], opts: [{ t: 'Then that\'s where we go.', end: true }], bye: false },
      evening: { say: 'You\'re leaving at first light? Then eat. (She sets fresh bread beside you, and quietly a small bundle.) Her locket. It started glowing the day you went into the Razorwood.',
        do: [{ give: 'ember_locket', if: { not: 'has_locket' } }, { flag: 'has_locket' }], opts: [{ t: 'Thank you, Mira.', end: true }], bye: false },
      after: { say: 'She\'s home. She sleeps through the night now, and hums in the mornings — just ordinary songs. (She takes your hands.) Thank you. Thank you.', opts: [] },
    } },
  },
  lendel: {
    name: 'Lendel', title: 'Shopkeeper of the Trade Post', town: 'oakhaven', post: 'store#0',
    look: SB_LOOK('human', { skin: '#e0b896', hair: 'short', hairCol: '#6a4020', beard: 'short', eyes: 'round', eyeCol: '#5a8ab0', mouth: 'smile', outfit: 'traveller', cols: ['#5a6a4a', '#8a6a3a', '#4a4a3a', '#3a2414'] }),
    about: 'Oakhaven\'s shopkeeper: friendly, but cautious.',
    wares: [['rations', 5, 1, 0], ['rope', 1, 1, 0], ['torch', 8, 1, 0], ['arrow', 16, 1, 0], ['potion_healing', 1, 12, 0], ['healers_kit', 1, 2, 0]],
    buys: [['planar_blood', 1, 3, 0], ['sigil_shard', 1, 2, 0], ['resonant_pollen', 4, 1, 0]],
    talk: { start: 'start', nodes: { start: { say: ['Welcome to the Trade Post. We\'ve a bit of everything and not enough of anything.', 'Travellers! We don\'t get many, lately.'],
      opts: [
        { t: 'What happened to Ember?', if: { quest: 'q2', undone: true }, reply: '“Mira, her gran, gathers herbs up at the Sacred Stone Circle on the eastern hill most days. Ember used to sit by the shrine there and draw in the ash. Some folk think she came back from the Razorwood with… something inside her.”', do: [{ flag: 'know_mira' }, { reveal: ['oak_circle'] }], go: 'start' },
        { t: 'Let me see your stock.', shop: true },
      ] } } },
  },
  oak_children: {
    name: 'Children on the Green', title: 'Oakhaven', town: 'oakhaven', post: [-3, 4], unlisted: true,
    look: SB_LOOK('halfling', { skin: '#f0c8a0', hair: 'braids', hairCol: '#b07a3a', eyes: 'wide', eyeCol: '#3a7a4a', mouth: 'smile', marks: 'freckles', outfit: 'peasant', cols: ['#8a9a6a', '#6a5a3a', '#5a4a3a', '#3a2a1a'] }),
    talk: { start: 'start', nodes: {
      start: { say: '(They whisper and giggle.) “Ember saw trees that talked! She said they were sad.”', opts: [
        { t: '[Persuasion] Where did Ember live?', check: { skill: 'persuasion', dc: 12, pass: 'hut', fail: 'shy' } },
        { t: '[Insight] Watch where they keep glancing', check: { skill: 'insight', dc: 13, pass: 'hut', fail: 'shy' } },
      ] },
      hut: { say: '“The hut by the stream, at the edge of the trees! Her gran lives there. But she\'s never home, she\'s always up at the old stones.”', do: [{ flag: 'know_mira' }, { reveal: ['oak_circle'] }], opts: [] },
      shy: { say: '(They scatter, shrieking with laughter.)', opts: [] },
    } },
  },
  ember_hearth: {
    name: 'The Cold Hearth', title: 'The Streamside Hut', town: 'oakhaven', post: 'house_s#0', bpos: [2, 3], prop: 'cauldron', glyph: '♨', until: 'hearth_searched',
    talk: { start: 'start', nodes: {
      start: { say: 'An overgrown hut at the forest\'s edge. Scorched drawings fill the cold hearth. Personal things everywhere say a child and her grandmother were close here — two cups, two stools, a basket of herbs, a note: "Gone up to the stones."',
        opts: [{ t: '[Arcana] Study the drawings in the ash', check: { skill: 'arcana', dc: 14, pass: 'ash', fail: 'search', xp: 50 } }, { t: 'Search the hut', go: 'search' }], bye: false },
      ash: { say: 'Harmonic sigil remnants: the same pattern drawn over and over until the lines became grooves. Not a child\'s scribble. A notation.', opts: [{ t: 'Search the hut', go: 'search' }], bye: false },
      search: { say: 'Tucked under a loose stone in the hearth: a small locket, inscribed "E.M.".', do: [{ give: 'ember_locket' }, { flag: 'has_locket' }, { flag: 'know_mira' }, { flag: 'hearth_searched' }, { reveal: ['oak_circle'] }], opts: [{ t: 'Take it to Mira', end: true }], bye: false },
    } },
  },
  barn_beam: {
    name: 'A Scratched Beam', title: "The Watcher's Barn", place: 'watchers_barn', offset: [0, 2], prop: 'hay_bale', glyph: '♪',
    talk: { start: 'start', nodes: { start: { say: 'Hand-shaped scorch marks on the floorboards. Strange feathered scales in the hay. And a child\'s song scratched into a beam:\n\n"The bloom is red, the root is black, it grows where night won\'t take it back."', do: [{ flag: 'barn_song' }], opts: [{ t: '[Nature] The scales…', once: true, check: { skill: 'nature', dc: 13, pass: 'scales', fail: 'noscale', xp: 100 } }] },
      scales: { say: 'They came off nothing that lives in Oakhaven\'s woods. Half feather, half scale, black at the root. Something Bloomtouched slept here, next to her.', opts: [] },
      noscale: { say: 'Feathers? Scales? Both, somehow.', opts: [] } } },
  },
  razor_sigil: {
    name: 'The Sigil', title: 'The Razorwood Thicket', place: 'razorwood', offset: [3, 2], prop: 'crying_obsidian', glyph: '✺',
    talk: { start: [{ if: 'sigil_vision', node: 'after' }], nodes: {
      start: { say: 'One thick root coils up and over the earth like a serpent — and there, burned deep into its bark, is the sigil. It pulses faintly, not with heat or light, but with resonance. Like a plucked string echoing across the planes.',
        opts: [
          { t: '[Arcana] Study the pattern', once: true, check: { skill: 'arcana', dc: 14, pass: 'lore', fail: 'nolore', xp: 100 } },
          { t: '[Investigation] Study the pattern', once: true, check: { skill: 'investigation', dc: 14, pass: 'lore', fail: 'nolore', xp: 100 } },
          { t: 'Hold Ember\'s sigil cloth up to it', if: { has: 'ember_sigil_cloth' }, reply: 'The ash lines on the cloth match the burned glyph exactly. The cloth grows warm in your hands, and the sigil brightens, as if it knows her.', go: 'start' },
          { t: 'Touch the sigil and listen (commune)', go: 'vision' },
        ], bye: false },
      lore: { say: 'It vibrates at a harmonic frequency tied to the Veil, the barrier between planes. The pattern isn\'t just a glyph — it\'s part of a larger system. A key. A resonance seal. And this one has been recently disturbed… or tuned.', do: [{ flag: 'sigil_studied' }], opts: [{ t: 'Touch the sigil and listen (commune)', go: 'vision' }], bye: false },
      nolore: { say: 'The pattern swims when you look at it. You can\'t hold it in your head.', opts: [{ t: 'Touch the sigil and listen (commune)', go: 'vision' }], bye: false },
      vision: { say: 'Sound disappears. Color fades.', do: [{ narrate: [
        { title: 'Vision', text: `You're not in Razorwood anymore — but not gone either. It's like standing in two versions of the same forest. One is cold, twisted, and alive with quiet malice. The other is a hollow echo of itself, wrapped in perpetual twilight.\n\nA woman stands at the sigil. Young. Half-Elf. One green eye, one brown. Hair windswept, cloak frayed, and in her hand — the Harmonic Tuner, its crystal glowing.` },
        { title: 'Vision', text: `She presses the Tuner to the sigil and adjusts the dial, eyes closed, listening. Music plays — except it's not heard through ears. It shapes the landscape. The branches arc backward. The roots bend into patterns. For a moment, the Veil parts…\n\nAnd through it, you see shadows that walk like men… watching her.` },
        { title: 'Vision', text: `She writes something in a journal, then turns. You can't follow her. Instead, you hear one phrase echo, spoken in her voice:\n\n"Greystone holds the first answer."\n\nThen the vision snaps — and somewhere out in the trees, something growls. Not near. Not far. Both.` },
      ], title: 'The Sigil' }, { flag: 'sigil_vision' }, { flag: 'lyra_word' }], opts: [{ t: 'Draw your weapon.', end: true }], bye: false },
      after: { say: 'The sigil pulses once more, then goes dormant. Whatever it had to say, it has said.', opts: [] },
    } },
  },
  wenna: {
    name: 'Wenna Hallowbrook', title: 'Milkmaid of the Hallowbrook Dairy', town: 'oakhaven', post: 'farm#0',
    look: SB_LOOK('human', { skin: '#f0d0b0', hair: 'braids', hairCol: '#d8b060', eyes: 'round', eyeCol: '#5a8ab0', mouth: 'smile', marks: 'freckles', outfit: 'peasant', cols: ['#a08a6a', '#e8e0c8', '#5a4a3a', '#3a2a1a'] }),
    about: 'Thorn Hallowbrook\'s sister, keeper of the dairy and of Buttercup, a cow with faintly glowing milk.',
    talk: { start: [{ if: { quest: 'sq_milk', done: true }, node: 'after' }], nodes: {
      start: { say: ['Have you seen Buttercup? White as moonlight, she is. Glows a bit at night.', 'The goblins took her! Thorn says they\'re in the hollow to the south.'], opts: [
        { t: 'We\'ll bring Buttercup home.', if: { quest: 'sq_milk', notStarted: true }, do: [{ quest: 'sq_milk' }, { reveal: ['goblin_warren'] }], reply: '“Oh, would you? Mind them — they\'ve gone strange since the black flowers came. South of the town, in the hollow.”', end: true },
        { t: 'The goblins are dealt with.', if: { all: [{ quest: 'sq_milk', active: true }, { cleared: 'goblin_warren' }] }, do: [{ complete: 'sq_milk' }], go: 'after' },
      ] },
      after: { say: 'Buttercup found her own way home the moment those goblins stopped shouting. Here — her milk mends what ails you. Take it, take it!', opts: [] },
    } },
  },
  merion: {
    name: 'Elder Merion Willowcloak', title: 'Elder of Oakhaven', town: 'oakhaven', post: 'council#0', held: 'druid_staff',
    look: SB_LOOK('elf', { skin: '#e8d0b8', hair: 'long', hairCol: '#9a9a9a', beard: 'long', beardCol: '#9a9a9a', eyes: 'narrow', eyeCol: '#3a7a4a', mouth: 'stern', outfit: 'leafrobe', cols: ['#4a6a2a', '#8a6a3a', '#3a4a22', '#4a3424'], hat: 'circlet', cloak: true }),
    about: 'Oakhaven\'s leader, a retired druid who keeps the balance between progress and tradition.',
    talk: { start: 'start', nodes: { start: { say: ['The woods are not what they were. Neither am I.', 'Welcome to Oakhaven. Mind the old ways and the old ways will mind you.'],
      alt: [{ if: { quest: 'q2', done: true }, say: 'Felled timber from the forest edge has started to hum. I\'ve closed the Sawtooth Mill until we know why.' }],
      opts: [
        { t: 'What happened to Ember?', if: { quest: 'q2', undone: true }, reply: '“The child went into the Razorwood after a singing leaf and came back with a sigil in her head. Then she went again, and did not come back. Her grandmother Mira sits with the old stones on the eastern hill. Speak to her — gently.”', do: [{ flag: 'know_mira' }, { reveal: ['oak_circle'] }], go: 'start' },
        { t: 'Tell me about the old ways.', reply: '“Druidic rites at every season\'s turning. Wooden charms against the dark. And a promise our grandparents made to the trees: we take only what we\'re given.”', go: 'start' },
      ] } } },
  },
  calla: {
    name: 'Calla Fernroot', title: 'Head Herbalist of Greenroot Remedies', town: 'oakhaven', post: 'store#1',
    look: SB_LOOK('elf', { skin: '#f0d8c0', hair: 'long', hairCol: '#2a8a6a', eyes: 'round', eyeCol: '#3a7a4a', mouth: 'smile', outfit: 'leafrobe', cols: ['#3a7a4a', '#c8a040', '#2a4a22', '#4a3424'] }),
    about: 'Knows forest medicine and fey curses. Her stronger brews are only rumoured.',
    wares: [['potion_healing', 2, 11, 0], ['poultice', 2, 6, 0], ['herbalism_kit', 1, 3, 0], ['potion_greater_healing', 1, 28, 0]],
    buys: [['resonant_pollen', 4, 1, 0], ['verdant_heartwood', 1, 10, 0], ['deadroot_resin', 1, 4, 0], ['mandrake_root', 1, 12, 0]],
    talk: { start: 'start', nodes: { start: { say: ['Salves, teas, tinctures. And questions about where you\'ve been.', 'You smell of the Razorwood. Sit. Drink this.'], opts: [{ t: 'Show me your remedies.', shop: true }, { t: 'Tell me about fey curses.', reply: '“A curse is a song stuck in the wrong key. Break the rhythm and you break the hold. That\'s all the old women\'s remedies ever were — counter-melodies.”', go: 'start' }] } } },
  },
  thorn: {
    name: 'Thorn Hallowbrook', title: 'Captain of the Oakhaven Garrison', town: 'oakhaven', post: 'tower#0', held: 'spear',
    look: SB_LOOK('human', { body: 'broad', skin: '#c8906a', hair: 'crop', hairCol: '#2a1a10', beard: 'stubble', eyes: 'narrow', eyeCol: '#6a4a2a', mouth: 'stern', outfit: 'gambeson', cols: ['#6a5a3a', '#3a6a3a', '#4a3a2a', '#3a2414'] }),
    about: 'Suspicious of outsiders, fiercely loyal to Oakhaven.',
    talk: { start: 'start', nodes: { start: { say: ['Outsiders. State your business.', 'Keep your weapons sheathed in town.'], alt: [{ if: { quest: 'q2', done: true }, say: 'You went into the Razorwood and came back. That counts for something here.' }],
      opts: [{ t: 'Anything stirring in the woods?', reply: '“Animated wood near the mill. Goblins in the south hollow, gone strange — took my sister\'s cow. And lights in the Razorwood at night, moving like they\'re looking for something.”', go: 'start' }] } } },
  },
  hemlock: {
    name: 'Old Man Hemlock', title: 'Provisions', town: 'oakhaven', post: 'store#2',
    look: SB_LOOK('human', { skin: '#d8b090', hair: 'sides', hairCol: '#e8e8e8', beard: 'long', beardCol: '#e8e8e8', eyes: 'narrow', eyeCol: '#6a4a2a', mouth: 'stern', outfit: 'peasant', cols: ['#6a5a4a', '#4a3a2a', '#4a3a2a', '#2a1a10'] }),
    about: 'Gruff but sharp-minded elder who knows old stories and forest legends.',
    wares: [['rations', 6, 1, 0], ['bread', 4, 1, 0], ['candle', 4, 1, 0], ['lantern', 1, 2, 0], ['bed', 1, 2, 0]],
    talk: { start: 'start', nodes: { start: { say: ['Buy something or stop letting the warm out.', 'Hmph.'], opts: [{ t: 'What do you sell?', shop: true }, { t: 'Tell me a legend.', reply: [
      '“Deep in the oak wood there are trees that walk. Treefolk. Whisperers, the druids called them. They went quiet when the black flowers came.”',
      '“There\'s a vault under the old hills where stone remembers every sound ever made in it. My granda said if you shouted in it, you\'d hear yourself answer a year later.”',
      '“The Willow that weeps. East, past the Vale. They say a girl\'s buried under it who gave up her name to save us all. Nobody remembers her name. That\'s the point.”',
    ][0], go: 'start' }] } } },
  },
});
Object.assign(SB.places.razorwood, { onClear: [{ give: 'sigil_razorwood' }, { toast: 'The wolves dissolve into ash and light. The forest sighs. The sigil pulses once more, then goes dormant.', kind: 'epic' }] });

// ---- Scene 2: the road to Greystone, and the Vault --------------------------------------------------------------------------------
Object.assign(SB.npcs, {
  fate_oak: sbFate('fate_oak', { town: 'oakhaven', post: 'plaza' }, { quest: 'q3', stage: 'fate' }, 'fate_greystone', 'There you are. Been looking for you.'),
  borin_body: {
    name: 'The Body by the Cart', title: 'The Broken Cart', place: 'borin_cart', offset: [1, 3], prop: 'brown_wool', glyph: '✝', if: { cleared: 'borin_cart' }, until: 'borin_found',
    talk: { start: 'start', nodes: {
      start: { say: 'A man slumps beside the wreckage, mid-travel, his face frozen mid-fear. Blood stains the journal still clutched in one hand. His pack holds a broken tuning fork, a bag of crushed chalk, a burned spellbook fragment, an intact sigil shard, and charred parchment covered in musical notes that resemble the Razorwood sigil.',
        do: [{ letter: 'borin_journal' }, { give: 'sigil_shard', n: 2 }, { flag: 'borin_found' }, { flag: 'lyra_word' }],
        opts: [{ t: 'Read his journal', do: [{ read: 'borin_journal' }], end: true }, { t: '[Religion] Bury him and say the words', do: [{ xp: 100, why: 'A burial on the ridge' }], reply: 'You lay him in the soft earth by the trail, his journal in your pack. Someone, somewhere, will want to know where Borin rests.', end: true }], bye: false },
    } },
  },
  wind_stones: {
    name: 'The Humming Stones', title: 'The Ridge Trail', place: 'resonant_wind', offset: [0, 1], prop: 'chiseled_stone_bricks', glyph: '≋',
    talk: { start: [{ if: 'wind_synced', node: 'done' }], nodes: {
      start: { say: 'The air shifts. Not a breeze — something deeper. A wind that hums. As it moves through the stones, it makes a low harmonic tone, like the vibration of a massive tuning fork.', opts: [
        { t: '[Arcana] Sync with the hum', check: { skill: 'arcana', dc: 13, pass: 'sync', fail: 'strain', xp: 150 } },
        { t: '[Performance] Hum along and harmonize it', check: { skill: 'performance', dc: 14, pass: 'sync', fail: 'strain', xp: 150 } },
      ] },
      sync: { say: 'The wind fades peacefully, revealing faint glyphs on the stone: seven rings, each keyed to a tone. Resonance as interaction. You\'ll remember this.', do: [{ flag: 'wind_synced' }, { flag: 'grey_freq' }], opts: [] },
      strain: { say: 'The resonance claws at your thoughts — a mild pulse of the Bloom\'s influence.', do: [{ hurt: [1, 4], type: 'psychic', why: 'The hum drills into your skull' }], opts: [] },
      done: { say: 'The stones are quiet now, the glyphs still faintly visible.', opts: [] },
    } },
  },
  grey_pedestal: {
    name: 'The Pedestal in the Echo Chamber', title: 'The Vault of Old Greystone', dungeon: 'greystone', room: 'hall#0', offset: [0, 0], prop: 'chiseled_stone_bricks', glyph: '◎',
    talk: { start: 'start', nodes: {
      start: { say: 'A vast circular chamber, its walls arcing like the inside of a bell. Glyphs spiral across every surface in seven concentric rings. At the centre, a stone pedestal with a shallow channel, perfectly shaped to hold a tuning fork or a crystal device. Every sound you make here comes back to you, out of order.', opts: [
        { t: 'Touch the pedestal', go: 'vision' },
        { t: '[Investigation] Look for marks', once: true, check: { skill: 'investigation', dc: 13, pass: 'chalk', fail: 'nochalk', xp: 100 } },
        { t: '[Arcana] Read the glyph rings', once: true, check: { skill: 'arcana', dc: 14, pass: 'freq', fail: 'nofreq', xp: 100 } },
      ] },
      chalk: { say: 'Scratches and notes in chalk, in Dwarvish and Elvish — Lyra\'s dual heritage.', do: [{ letter: 'lyra_chalk' }, { flag: 'grey_chalk' }, { flag: 'lyra_word' }], opts: [] },
      nochalk: { say: 'Dust and old scratches.', opts: [] },
      freq: { say: 'The rings are frequency-locked: each glyph wakes to a different tone. Root, stone, river… and two that don\'t belong: a sun, and a bloom.', do: [{ flag: 'grey_freq' }], opts: [] },
      nofreq: { say: 'The rings make your eyes water.', opts: [] },
      vision: { say: 'A pulse of harmonic energy surges through the pedestal.', do: [{ narrate: [
        { title: 'Echo', text: `For a moment, your vision flickers. You see Lyra, standing just where you are, one green eye glowing faintly as she aligns the Harmonic Tuner into the pedestal.\n\n"It's not just a key," she mutters. "It's a language."\n\nGlyphs swirl in the air around her. She tunes the device, and with each note, roots retract from the walls, the ground reshapes, and one of the sigil rings glows blue.` },
        { title: 'Echo', text: `Then something disrupts her. She looks sharply behind, her expression hardening.\n\n"No time. I have to go… before it finishes tuning without me."\n\nShe vanishes. In her place, a faint blue glyph remains etched in the air.` },
      ], title: 'The Echo Chamber' }, { flag: 'grey_echo' }, { flag: 'lyra_word' }], opts: [{ t: 'Go on, deeper.', end: true }], bye: false },
    } },
  },
  grey_chimes: {
    name: 'The Sealed Vault Door', title: 'The Vault of Old Greystone', dungeon: 'greystone', room: 'boss', offset: [0, -3], prop: 'bell', glyph: '♫', until: { any: ['grey_seal_open', 'grey_warden'] },
    talk: { start: 'start', nodes: {
      start: { say: 'A sealed vault door: smooth stone, no keyhole. Five chimes are embedded in it, each etched with a glyph — a root, a stone, a river, a sun and a bloom. An inscription reads: "Three truths form the seal. One lies. One sings too loud."', opts: [
        { t: '[Arcana] Discern the true tones', check: { skill: 'arcana', dc: 14, pass: 'open', fail: 'false', adv: false } },
        { t: '[Performance] Strike the triad from Lyra\'s chalk notes', if: 'grey_chalk', check: { skill: 'performance', dc: 12, pass: 'open', fail: 'false' } },
        { t: 'Strike the chimes yourself, one at a time', go: 'c1' },
        { t: '[Athletics] Force the door open', go: 'force' },
      ], bye: false },
      c1: { say: 'Which chime first?', opts: [{ t: 'The root', go: 'c2' }, { t: 'The stone', go: 'silence' }, { t: 'The river', go: 'silence' }, { t: 'The sun', go: 'false' }, { t: 'The bloom', go: 'loud' }], bye: false },
      c2: { say: 'The root chime rings low and true. One of the rings on the door glows. Which next?', opts: [{ t: 'The stone', go: 'c3' }, { t: 'The river', go: 'silence' }, { t: 'The sun', go: 'false' }, { t: 'The bloom', go: 'loud' }], bye: false },
      c3: { say: 'Root to stone. A second ring glows. Which last?', opts: [{ t: 'The river', go: 'open' }, { t: 'The sun', go: 'false' }, { t: 'The bloom', go: 'loud' }], bye: false },
      silence: { say: 'The chime rings true — but out of order. The rings go dark again. The door waits.', do: [{ flag: 'grey_f3', if: 'grey_f2' }, { flag: 'grey_warden', if: 'grey_f2' }, { flag: 'grey_f2', if: 'grey_f1' }, { flag: 'grey_f1' }], opts: [{ t: 'Try again', go: 'start', if: '!grey_warden' }, { t: '…', go: 'woke', if: 'grey_warden' }], bye: false },
      false: { say: 'A false tone! Echo backlash slams through the chamber.', do: [{ hurt: [1, 6], type: 'psychic', why: 'Echo backlash!' }, { flag: 'grey_f3', if: 'grey_f2' }, { flag: 'grey_warden', if: 'grey_f2' }, { flag: 'grey_f2', if: 'grey_f1' }, { flag: 'grey_f1' }], opts: [{ t: 'Try again', go: 'start', if: '!grey_warden' }, { t: '…', go: 'woke', if: 'grey_warden' }], bye: false },
      loud: { say: 'The bloom chime over-resonates — a ringing that fills your skull. (A bloom only spreads when it hears its name.)', do: [{ hurt: 2, type: 'thunder', why: 'Your ears ring' }, { flag: 'grey_f3', if: 'grey_f2' }, { flag: 'grey_warden', if: 'grey_f2' }, { flag: 'grey_f2', if: 'grey_f1' }, { flag: 'grey_f1' }], opts: [{ t: 'Try again', go: 'start', if: '!grey_warden' }, { t: '…', go: 'woke', if: 'grey_warden' }], bye: false },
      force: { say: 'You set your shoulder to the door. Stone grinds. And from the walls, sound shivers like breaking glass.', do: [{ flag: 'grey_warden' }], opts: [{ t: '…', go: 'woke' }], bye: false },
      woke: { say: 'A humanoid shape rises from the walls — formed of suspended glyphs, sonic pulses and half-seen light. Its eyes are like glass tuning forks burning with harmonic fire. The Echobound Warden has woken.', opts: [{ t: 'Fight!', end: true }], bye: false },
      open: { say: 'Root to stone, stone to river. The three true tones ring out together, and the seal unlocks — not with a click, but with a chord.', do: [{ flag: 'grey_seal_open' }, { clear: 'greystone' }], opts: [{ t: 'Enter the vault', end: true }], bye: false },
    } },
  },
  lyra_satchel: {
    name: "A Satchel Behind a Fallen Stone", title: 'The Vault of Old Greystone', dungeon: 'greystone', room: 'loot#0', offset: [0, 2], prop: 'brown_wool', glyph: '⚒', until: 'satchel_found',
    talk: { start: 'start', nodes: { start: { say: 'Wedged behind a fallen stone: a worn satchel, chalk-dusted. Inside, a set of precision chisels, a rune-etched forging hammer that is far too fine to abandon, and a scrap of paper in Lyra\'s hand: "Back for these. Promise."',
      do: [{ give: 'lyra_chisels' }, { give: 'rune_hammer' }, { flag: 'satchel_found' }, { flag: 'lyra_word' }], opts: [{ t: 'Grom will want these.', end: true }], bye: false } } },
  },
  fate_grey: sbFate('fate_grey', { place: 'greystone', offset: [9, 14] }, { quest: 'q3', stage: 'surface' }, 'fate_poem', 'There you are. You look like you\'ve been inside a bell.'),
});
Object.assign(SB.places.greystone, { onClear: [{ give: 'sigil_greystone' }, { give: 'sigil_map' }, { give: 'echo_glyph' }, { narrate: [{ title: 'The Vault of Old Greystone', text: `Inside the vault: a library of glyphs naming every sigil and its counterpoint, and a map fragment marking hidden vaults across Eldenwood. It glows faintly near active sigils.\n\nThe final glyph dims. Dust swirls in the silence. The hum in the air fades — but never fully disappears. As you climb back toward the surface, the wind howls again, but this time it sounds… melodic. A whisper, almost like Lyra's voice:\n\n"Find me before it does."` }] }] });

// ---- Scene 3: the Whispering Marshes ----------------------------------------------------------------------------------------------
Object.assign(SB.npcs, {
  marsh_satchel: {
    name: 'A Half-Buried Satchel', title: 'The Whispering Marshes', place: 'marsh_cache', offset: [1, 1], prop: 'brown_wool', glyph: '✉', until: 'marsh_cache',
    talk: { start: 'start', nodes: { start: { say: 'A half-buried satchel caught on a thornbush. Inside: dried petals glowing faintly, a broken vial labelled "PHX-F3", and a letter addressed to Nico.', do: [{ letter: 'cult_letter' }],
      opts: [{ t: '[Insight] Think about what the ingredients really do', check: { skill: 'insight', dc: 14, pass: 'truth', fail: 'take', xp: 150 } }, { t: 'Take the letter', go: 'take' }], bye: false },
      truth: { say: 'You turn the petals over. Dragon\'s blood as a binder, phoenix feather to carry heat, mandrake for the Shadowfell note. They don\'t suppress sigil energy. They amplify it.', do: [{ flag: 'marsh_cache' }, { flag: 'potion_truth' }], opts: [] },
      take: { say: 'You pocket the letter.', do: [{ flag: 'marsh_cache' }], opts: [] } } },
  },
  sigil_pool_prop: {
    name: 'The Sigil Pool', title: 'The Whispering Marshes', place: 'sigil_pool', offset: [0, 2], prop: 'mossy_stone_bricks', glyph: '◌',
    talk: { start: [{ if: 'marsh_pool', node: 'done' }], nodes: {
      start: { say: 'A shallow, black-mirrored pool. A moss-covered stone floats at its centre, a glyph glowing faintly just beneath the waterline.', opts: [
        { t: '[Arcana] Sense what\'s wrong here', check: { skill: 'arcana', dc: 13, pass: 'arc', fail: 'touch', xp: 150 } },
        { t: 'Touch the glyph', go: 'touch' },
      ] },
      arc: { say: 'Planar distortion. Minor leakage from the Shadowfell, steady as a dripping tap. This is a tuning field — a corrupted one.', do: [{ flag: 'marsh_pool' }], opts: [{ t: 'Take a sample of the sigil-imbued root', do: [{ give: 'harmonic_dust', n: 3 }], end: true }] },
      touch: { say: 'A pulse of resonance ripples out. Nearby frogs and plants wither as it passes.', do: [{ flag: 'marsh_pool' }, { hurt: [1, 4], type: 'necrotic' }], opts: [] },
      done: { say: 'The pool lies still, the glyph dim.', opts: [] },
    } },
  },
  marsh_robe_prop: {
    name: 'A Tattered Robe', title: 'The Whispering Marshes', place: 'marsh_robe', offset: [0, 1], prop: 'purple_wool', glyph: '⚚', until: 'marsh_robe',
    talk: { start: 'start', nodes: { start: { say: 'A tattered robe caught in a tree. The inside is stitched with the sigil of the Bloomed Circle — a half-open flower. A small stitched symbol at the hem matches the patch on Nico\'s old shoulderbag. Nearby: spilled reagents, and a cracked mirror shard that flickers with residual harmonics.',
      do: [{ flag: 'marsh_robe' }, { xp: 150, why: 'The Bloomed Circle\'s robe' }], opts: [{ t: 'Nico…', end: true }], bye: false } } },
  },
  nico_marsh: {
    name: 'Nico Silverhands', title: 'In the Sunken Ruin', dungeon: 'marsh_ruin', room: 'hall#0', offset: [1, 1], if: { all: ['gave_ingredients', { quest: 'q4', stage: 'nico' }] }, unlisted: true,
    look: SB_LOOK('gnome', { skin: '#e0c0a0', hair: 'wild', hairCol: '#d8d8e8', beard: 'moustache', beardCol: '#d8d8e8', eyes: 'wide', eyeCol: '#a060e0', mouth: 'plain', outfit: 'pact', cols: ['#3a2a4a', '#8a3ac0', '#1e1428', '#141018'], nose: true }),
    talk: { start: 'start', nodes: {
      start: { say: '(Nico stands among bubbling reagents and Bloomed Circle papers, the finished potion in his hand. He looks exhausted.) You don\'t understand — the Tuner was never broken. It just needed the right fuel. And thanks to you… I have it.', opts: [
        { t: '[Insight] Did he truly believe he was helping?', once: true, check: { skill: 'insight', dc: 15, pass: 'believed', fail: 'start', xp: 150 } },
        { t: '[Persuasion] Put the potion down, Nico. You\'re coming with us.', check: { skill: 'persuasion', dc: 15, pass: 'captured', fail: 'fled', xp: 200 } },
        { t: '[Intimidation] Drop it. Now.', check: { skill: 'intimidation', dc: 16, pass: 'captured', fail: 'fled', xp: 200 } },
        { t: 'Then you\'ll answer for it.', go: 'fight' },
      ], bye: false },
      believed: { say: '(He did. He still does, a little. His hands won\'t stop shaking.) “It was meant to stabilise it. She said it would tune peace into the roots…”', opts: [{ t: 'Who is "she"?', reply: '“Seraphina. The Mistress. She said the girl was dangerous. She said…” (He looks at the crystal in his hand — the same glow as the Tuner.) “She lied to me, too.”', go: 'start' }], bye: false },
      captured: { say: '(He sets the potion down. He shakes, staring at his hands.) “It wasn\'t supposed to… It was meant to stabilize it. She said it would tune peace into the roots… She lied to me, too.” (He goes quietly. Aric\'s watch will hold him.)',
        do: [{ flag: 'nico_captured' }, { flag: 'nico_resolved' }, { give: 'cultist_concoction' }, { letter: 'nico_journal' }, { leave: 'nico_marsh' }], opts: [{ t: 'Search the rest of the ruin.', end: true }], bye: false },
      fled: { say: '(He hurls a vial at your feet — smoke, violet and choking — and when it clears, he\'s gone. His voice echoes from somewhere in the ruin.) “It\'s already begun. The next song plays soon.”',
        do: [{ flag: 'nico_fled' }, { flag: 'nico_resolved' }, { letter: 'nico_journal' }, { leave: 'nico_marsh' }], opts: [{ t: 'After him — and whatever else is down here.', end: true }], bye: false },
      fight: { say: '(He laughs, high and frightened, and the potion in his hand flares violet.) “Fine! FINE! Let\'s see the Tuner\'s fuel at work!”', do: [{ flag: 'nico_resolved' }, { flag: 'nico_fought' }, { spawn: 'nico_hex', n: 1 }, { leave: 'nico_marsh' }], opts: [{ t: 'Fight!', end: true }], bye: false },
    } },
  },
  nico_desk: {
    name: "Nico's Work Table", title: 'The Sunken Ruin', dungeon: 'marsh_ruin', room: 'hall#0', offset: [1, 1], prop: 'brewing_stand', glyph: '⚗', if: { all: ['!gave_ingredients', { quest: 'q4', past: 'ruin' }] }, until: 'nico_resolved',
    talk: { start: 'start', nodes: { start: { say: 'Alchemical equipment. Arcane glyphs scrawled in blood on the wall. A resonant echo chamber where your voice twists into a new tone. Nico\'s plans, many torn or burned — but legible enough to reveal one thing: the potion was never meant to save anyone. It\'s an amplifier. Designed to "calibrate" the Harmonic Tuner. To make the Bloom permanent. His journal and gear remain. He does not.',
      do: [{ letter: 'nico_journal' }, { flag: 'nico_resolved' }, { flag: 'nico_fled' }], opts: [{ t: 'Read his journal', do: [{ read: 'nico_journal' }], end: true }], bye: false } } },
  },
  nico_cell: {
    name: 'Nico Silverhands', title: 'Prisoner of the Watch', town: 'stonebridge', post: 'tower#0', bpos: [1, 2], if: 'nico_captured', unlisted: true,
    look: SB_LOOK('gnome', { skin: '#d8b898', hair: 'wild', hairCol: '#d8d8e8', beard: 'stubble', beardCol: '#d8d8e8', eyes: 'round', eyeCol: '#a060e0', mouth: 'plain', outfit: 'peasant', cols: ['#6a6a6a', '#4a4a4a', '#3a3a3a', '#2a2a2a'], nose: true }),
    talk: { start: [{ if: { quest: 'q13', active: true }, node: 'finale' }], nodes: {
      start: { say: ['I didn\'t mean to help them. I was trying to undo it.', 'Is the girl… is she alive? Tell me she\'s alive.', 'The Bloom already wrote me into its song. I can hear it at night.'], opts: [{ t: 'What do you know about Seraphina?', reply: '“Pale. Polite. She never raises her voice, and she never leaves footprints. She talks about the Veil like it\'s a door that\'s been rudely shut in her face. She wants the girl for the song — a living prism, she says, to carry it across.”', go: 'start' }] },
      finale: { say: 'You\'re going after her. The Mistress. (He grips the bars.) Listen: the counter-potion was a key, yes. But a key turns both ways. If Lyra sets the Tuner to its first setting and you sing over the top of the Bloom\'s song… the potion\'s resonance will fold back on itself. Take this. My last honest work.',
        do: [{ give: 'echo_flame_bloom', if: { not: 'nico_helped' } }, { flag: 'nico_helped' }], opts: [{ t: 'Thank you, Nico.', end: true }], bye: false },
    } },
  },
});
Object.assign(SB.places.marsh_ruin, { onClear: [{ give: 'sigil_marsh' }, { give: 'distorted_compass' }, { narrate: [{ title: 'Return Through the Resonance', text: `As you trudge out through the fading corruption, the Sending Crystal begins to hum. A pulsing blue glow radiates from a stone half-buried in the muck: a Resonance Anchor, humming in sync with the crystal.\n\nAnd faintly, through the crystal, a woman's voice you have only heard in visions:\n\n"There's no time. Another sigil sings. Meet me — Verdant Vale. — Lyra."\n\nThe Distorted Compass in your pack has begun to glow.` }] }] });

// ---- Scene 4: Mount Cinder -----------------------------------------------------------------------------------------------------
Object.assign(SB.npcs, {
  mara: {
    name: 'Mara Teldan', title: 'Injured Herbalist', at: [332, -302], if: { quest: 'q5', active: true }, until: 'mara_helped',
    look: SB_LOOK('human', { skin: '#e0b896', hair: 'tail', hairCol: '#4a2c18', eyes: 'round', eyeCol: '#3a7a4a', mouth: 'plain', outfit: 'ranger', cols: ['#4a6a3a', '#6a4a2a', '#4a3a2a', '#3a2414'] }),
    about: 'An herbalist who followed "a girl with two-colored eyes" into the highlands and was caught in a tremor.',
    talk: { start: 'start', nodes: {
      start: { say: '(She\'s slumped against a fallen tree, her leg bent wrong.) Oh, thank the roots — people. I followed a girl with two-colored eyes up into the highlands days ago. Then the ground shook and I fell.', opts: [
        { t: '[Medicine] Set her leg', check: { skill: 'medicine', dc: 13, pass: 'healed', fail: 'hurtmore' } },
        { t: 'Give her a healing potion', if: { has: 'potion_healing' }, do: [{ take: 'potion_healing' }], go: 'healed' },
        { t: 'Use your healer\'s kit on her', if: { has: 'healers_kit' }, go: 'healed' },
      ], bye: false },
      hurtmore: { say: '(She cries out.) “Gently! Gods — try again, or leave me something to drink.”', opts: [{ t: '[Medicine] Try again', check: { skill: 'medicine', dc: 13, pass: 'healed', fail: 'hurtmore' } }, { t: 'Give her a healing potion', if: { has: 'potion_healing' }, do: [{ take: 'potion_healing' }], go: 'healed' }], bye: false },
      healed: { say: 'That\'s… better. Thank you. Here — I drew this on the way up. There\'s an outcrop shaped like a tuning fork near the trail, and a rock that sings. The girl went past both.',
        do: [{ reveal: ['singing_rock', 'smoldering_pass', 'fractured_vault'] }, { xp: 200, why: 'Helping Mara Teldan' }], opts: [{ t: '[Insight] You\'re not telling us everything.', check: { skill: 'insight', dc: 13, pass: 'more', fail: 'bye' } }, { t: 'Safe travels, Mara.', go: 'bye' }], bye: false },
      more: { say: '(She hesitates.) “…I saw her. Near the molten rock, surrounded by flickering light. She was arguing with it. With the light. And it was answering in her own voice.”', do: [{ flag: 'lyra_word' }], opts: [{ t: 'Safe travels.', go: 'bye' }], bye: false },
      bye: { say: 'I\'ll limp home to Stonebridge. Mind the gas in the ravines.', do: [{ flag: 'mara_helped' }], opts: [{ t: 'Farewell.', end: true }], bye: false },
    } },
  },
  singing_rock_prop: {
    name: 'The Singing Rock', title: 'Mount Cinder', place: 'singing_rock', offset: [0, 0], propUp: 0, prop: 'basalt', glyph: '♬',
    talk: { start: [{ if: 'rock_sung', node: 'done' }], nodes: {
      start: { say: 'A naturally hollow boulder sits at the centre of the windy pass. It hums a deep chord when struck. When you hum near it, the note rises and splits into overtones.', opts: [
        { t: '[Performance] Harmonize with it', check: { skill: 'performance', dc: 14, pass: 'vision', fail: 'nothing', xp: 200 } },
        { t: '[Arcana] Attune to the chord', check: { skill: 'arcana', dc: 14, pass: 'vision', fail: 'nothing', xp: 200 } },
      ] },
      vision: { say: 'A brief vision: Lyra standing near the mountain, arms raised, trying to control the resonance. Your Sending Crystal flares and realigns — pointing straight up the slope, to an obsidian wall halfway up the mountain.', do: [{ flag: 'rock_sung' }, { reveal: ['fractured_vault', 'ember_vault'] }], opts: [] },
      nothing: { say: 'The rock hums. The wind steals it.', opts: [] },
      done: { say: 'The rock hums softly. Your crystal points up the slope.', opts: [] },
    } },
  },
  pass_corpses: {
    name: 'Fused Corpses', title: 'The Smoldering Pass', place: 'smoldering_pass', offset: [2, 2], prop: 'obsidian', glyph: '☠',
    talk: { start: 'start', nodes: { start: { say: 'The remains of a small expedition, burned into the stone, bodies half-fused into the cliff. Chalk glyphs and partial sigil notations surround them.', opts: [{ t: '[Arcana] What happened here?', once: true, check: { skill: 'arcana', dc: 14, pass: 'arc', fail: 'no', xp: 200 } }] },
      arc: { say: 'A failed resonance reaction — a tuning attempt gone wrong. The chalk is Lyra\'s: she tried to stabilise the region, and failed. Whatever is under this mountain doesn\'t want harmony.', do: [{ flag: 'lyra_word' }], opts: [] },
      no: { say: 'Heat, but not fire. Sound, maybe.', opts: [] } } },
  },
  cinder_pillars: {
    name: 'The Veil Seal', title: 'The Fractured Vault', place: 'fractured_vault', offset: [0, -2], prop: 'crying_obsidian', glyph: '⟁', until: 'cinder_seal_open',
    talk: { start: 'start', nodes: {
      start: { say: 'A cracked obsidian wall, a jagged sigil glowing red at its heart: one of the ancient Veil Seals. Three basalt pillars surround it, each emitting a distinct tone when touched. Lyra\'s chalk symbols are smeared across them. Your Sending Crystal pulses in time with the hum.', opts: [
        { t: '[Arcana] Read Lyra\'s chalk symbols for the sequence', check: { skill: 'arcana', dc: 15, pass: 'open', fail: 'wrong' } },
        { t: '[Insight] Feel which tone she struck first', check: { skill: 'insight', dc: 14, pass: 'open', fail: 'wrong' } },
        { t: '[Performance] Mimic the triad she attempted', check: { skill: 'performance', dc: 13, pass: 'open', fail: 'wrong' } },
        { t: '[Investigation] Match the etchings to the pools\' echoes', check: { skill: 'investigation', dc: 13, pass: 'open', fail: 'wrong' } },
        { t: '[Athletics] With the guardians broken, force the seal', if: 'cinder_atronachs', check: { skill: 'athletics', dc: 12, pass: 'open', fail: 'wrong' } },
      ], bye: false },
      wrong: { say: 'The wrong sequence! A resonance backlash shakes the mountain.', do: [{ hurt: [2, 6], type: 'fire', why: 'The mountain shudders!' }, { spawn: 'emberborn_atronach', n: 2, if: '!cinder_atronachs' }, { flag: 'cinder_atronachs' }], opts: [{ t: 'Defend yourselves!', end: true }, { t: 'Try again', go: 'start' }], bye: false },
      open: { say: 'Three tones, struck in dissonance — Cinder rejects harmony — and the door splits. Heat floods outward. The way down into the Ember Vault is open.', do: [{ flag: 'cinder_seal_open' }, { xp: 400, why: 'The Veil Seal' }], opts: [{ t: 'Descend.', end: true }], bye: false },
    } },
  },
  ember_pedestal: {
    name: 'The Broken Pedestal', title: 'The Ember Vault', dungeon: 'ember_vault', room: 'boss', offset: [0, -3], prop: 'magma_block', glyph: '♨', if: { cleared: 'ember_vault' }, until: 'cinder_page',
    talk: { start: 'start', nodes: { start: { say: 'A broken pedestal holds a fractured resonance core. The glyph beneath it glows faintly — identical to the one in the Razorwood. Lyra\'s chalk marks surround it; she was trying to stabilise the sigil but ran out of time. A burned journal page lies half-buried beneath the slag. And from the western wall, behind a sealed collapse, a low hum: something deeper.',
      do: [{ give: 'sigil_cinder' }, { give: 'tuning_crystal' }, { letter: 'lyra_cinder' }, { flag: 'cinder_page' }, { flag: 'lyra_word' }], opts: [{ t: 'Read the page', do: [{ read: 'lyra_cinder' }], end: true }], bye: false } } },
  },
  fate_cinder: sbFate('fate_cinder', { place: 'ember_vault', offset: [-8, 18] }, { quest: 'q5', stage: 'fate' }, 'eldon_crystal', '(Sweaty, winded, and still somehow grinning.) You again! Thought I might catch you here.'),
  bandit_prisoner: {
    name: 'A Branded Prisoner', title: 'The Watchtower Cells', town: 'stonebridge', post: 'tower#0', bpos: [3, 2], if: { quest: 'q5', done: true }, until: 'jail_talked', unlisted: true,
    look: SB_LOOK('human', { skin: '#c8a080', hair: 'sides', hairCol: '#2a1a10', beard: 'stubble', eyes: 'narrow', eyeCol: '#6a4a2a', mouth: 'stern', marks: 'scar', outfit: 'peasant', cols: ['#5a4a3a', '#3a2a1a', '#3a3a32', '#1a1a14'] }),
    talk: { start: 'start', nodes: {
      start: { say: '(A bandit captured outside Oakhaven. A scar shaped like a flower is burned into the back of his neck.) What do you want? I don\'t remember anything. Not the last month. Nothing.', opts: [
        { t: '[Intimidation] Remember harder.', check: { skill: 'intimidation', dc: 14, pass: 'talk', fail: 'shut' } },
        { t: '[Persuasion] We can get that brand looked at. Help us.', check: { skill: 'persuasion', dc: 14, pass: 'talk', fail: 'shut' } },
        { t: '[Insight] He\'s not lying. Something took the month from him.', check: { skill: 'insight', dc: 14, pass: 'talk', fail: 'shut' } },
      ], bye: false },
      shut: { say: '(He turns to the wall and hums something tuneless. Over and over.)', opts: [] },
      talk: { say: '(Pieces come back to him in a rush.) “Supply runs. Silvered cages, tuning rods, heavy black stones, carried north by the coast road and into the trees. A ‘flower merchant’ with jars of ash. And her — the Mistress. She came to the camp once. Pale. Polite. She asked about ‘the Resonance-Walkers’. She meant you.”', do: [{ flag: 'jail_talked' }, { xp: 600, why: 'The branded prisoner' }], opts: [] },
    } },
  },
});

// ---- Scene 5: the Verdant Vale ---------------------------------------------------------------------------------------------------
Object.assign(SB.npcs, {
  vale_arch_prop: {
    name: 'A Dormant Sigil in the Arch', title: 'The Forgotten Archway', place: 'vale_arch', offset: [0, 1], prop: 'chiseled_stone_bricks', glyph: '❦',
    talk: { start: [{ if: 'arch_woke', node: 'done' }], nodes: {
      start: { say: 'An ancient stone arch choked with ivy. A dormant sigil in the keystone pulses faintly as you pass.', opts: [
        { t: '[Arcana] Wake it with a harmonic hum', check: { skill: 'arcana', dc: 14, pass: 'woke', fail: 'no', xp: 300 } },
        { t: '[Performance] Wake it with a harmonic hum', check: { skill: 'performance', dc: 14, pass: 'woke', fail: 'no', xp: 300 } },
      ] },
      woke: { say: 'A memory echo: an elven priestess whispering warnings about "roots singing false names", and a Tuner-born flame swallowing the Vale. The vision leaves a warmth behind your eyes.', do: [{ flag: 'arch_woke' }, { inspire: true }], opts: [] },
      no: { say: 'The sigil stays dark.', opts: [] },
      done: { say: 'The arch is quiet.', opts: [] },
    } },
  },
  pilgrim: {
    name: 'A Lost Pilgrim of the Circle', title: 'Pilgrim', at: [598, 188], if: { quest: 'q6', active: true }, until: { quest: 'q6', done: true },
    look: SB_LOOK('elf', { skin: '#e8d0b8', hair: 'long', hairCol: '#d8b060', eyes: 'narrow', eyeCol: '#3a7a4a', mouth: 'plain', marks: 'paint', outfit: 'leafrobe', cols: ['#3a5a2a', '#6a8a3a', '#2a3a1a', '#3a2414'], hood: true }),
    about: 'A disoriented elf cloaked in ceremonial vines, blindfolded. He wandered from the Circle of Echoes when "the rhythm broke".',
    talk: { start: 'start', nodes: {
      start: { say: '(He stumbles from the brush, blindfolded.) The rhythm broke. I came out of the Circle seeking balance and the rhythm broke. Can you hear it? No. No one hears it anymore.', opts: [
        { t: 'Is there a way into the Vale?', go: 'law' },
        { t: '[Insight] Something is wrong with him', check: { skill: 'insight', dc: 15, pass: 'bloom', fail: 'start' } },
      ] },
      law: { say: 'The guardians at the Vale\'s edge will ask for the First Law of the Circle. Tell them: "Take only the note you are given." Tell them, and they\'ll let you pass. Tell them, and… and…', do: [{ flag: 'first_law' }], opts: [{ t: 'Thank you, pilgrim.', end: true }] },
      bloom: { say: '(Under the blindfold, faint violet light. He\'s slowly becoming something else — Bloomtouched. Not yet. Not yet.)', opts: [{ t: 'Rest, pilgrim. Is there a way into the Vale?', go: 'law' }] },
    } },
  },
  vale_guardians: {
    name: 'The Vale Guardians', title: 'The Verdant Vale', at: [662, 204], prop: 'moss_block', glyph: '♣',
    talk: { start: [{ if: 'vale_passage', node: 'done' }], nodes: {
      start: { say: 'Two sentient trees with hollow faces lean from the forest wall, speaking in druidic tones that hum in your teeth. "Speak the First Law of the Circle, or turn back."', opts: [
        { t: '"Take only the note you are given."', if: 'first_law', go: 'pass' },
        { t: '[Nature] Answer as the druids would', check: { skill: 'nature', dc: 15, pass: 'pass', fail: 'warn' } },
        { t: 'We carry no law. Let us through.', go: 'warn' },
      ] },
      pass: { say: 'The trees groan aside. "Walk gently. The Vale is listening."', do: [{ flag: 'vale_passage' }, { xp: 300, why: 'The First Law' }], opts: [] },
      warn: { say: '"None who carry the Tuner walk here unchanged…" (They do not stop you. That is somehow worse.)', opts: [] },
      done: { say: 'The guardians are still, watching.', opts: [] },
    } },
  },
  kthura: {
    name: "K'thura, the Living Chorus", title: 'A Verdant Whisperer', place: 'singing_grove', offset: [0, 4], prop: 'moss_block', glyph: '❧',
    talk: { start: [{ if: 'whisper_phrase', node: 'awake' }], nodes: {
      start: { say: 'Three immense treefolk lie fused into living rock, each encased in vines and moss. Soft music sounds from their hollow chests — tones so low they vibrate your bones. One of them, the eldest, still seems… close to waking.', opts: [
        { t: 'Hold up the Sending Crystal to its heart', if: { has: 'sending_crystal' }, go: 'wake' },
        { t: 'Speak the druidic words of awakening', if: { cls: 'druid' }, go: 'wake' },
        { t: '[Arcana] Wake it with resonance', check: { skill: 'arcana', dc: 15, pass: 'wake', fail: 'sleep' } },
        { t: '[Performance] Sing to it', check: { skill: 'performance', dc: 15, pass: 'wake', fail: 'sleep' } },
      ], bye: false },
      sleep: { say: 'The Whisperer stirs, then sinks back into its dreaming.', opts: [] },
      wake: { say: 'Its bark creaks open like an ancient gate. "She came, the one with two-colored eyes. But her song was crooked. The Vale wept for her." (Its voice is many voices.) "And a child came before her. Her presence opened a path not meant to open."', opts: [{ t: 'Can you help us stabilise the sigil?', go: 'triad' }], bye: false },
      triad: { say: '"Listen." Each of the three Whisperers hums a root-tone. "Align them, little ones. A natural harmony. Then take what we give."', opts: [
        { t: '[Performance] Align the three tones', check: { skill: 'performance', dc: 13, pass: 'phrase', fail: 'watchers' } },
        { t: '[Insight] Feel where each tone wants to settle', check: { skill: 'insight', dc: 13, pass: 'phrase', fail: 'watchers' } },
        { t: 'Just give us the phrase.', go: 'phrase2' },
      ], bye: false },
      watchers: { say: 'The tones clash. Something in the grove wakes that should not — Bloomtouched watchers slither from the flowering trees!', do: [{ spawn: 'grove_beast', n: 2 }], opts: [{ t: 'Fight, then listen again', go: 'phrase2' }], bye: false },
      phrase: { say: 'The three tones settle into one chord, and the grove sighs. "Well sung." The Whisperer gives you a phrase — part of the harmonic key — and the first verse of the old song.', do: [{ flag: 'whisper_phrase' }, { flag: 'vale_triad' }, { flag: 'vale_verse' }, { letter: 'rootsong_1' }, { xp: 400, why: 'The Whisperers\' chord' }], opts: [{ t: 'Where is Lyra?', go: 'awake' }], bye: false },
      phrase2: { say: '"Take it, then." The Whisperer gives you a phrase — part of the harmonic key — and the first verse of the old song.', do: [{ flag: 'whisper_phrase' }, { flag: 'vale_verse' }, { letter: 'rootsong_1' }], opts: [{ t: 'Where is Lyra?', go: 'awake' }], bye: false },
      awake: { say: '"Below. Beneath the roots, where one of us has gone hollow and sick. The sigil is buried there. Lyra tried. The roots screamed back. Go gently, and carry the child\'s sigil — the hollow one may remember her."', opts: [] },
    } },
  },
  root_conduits: {
    name: 'Three Conduit Roots', title: 'The Root Hollow', dungeon: 'root_hollow', room: 'boss', offset: [0, -3], prop: 'stripped_mangrove_log', glyph: '⌇', if: { cleared: 'root_hollow' }, until: 'vale_fragment',
    talk: { start: 'start', nodes: {
      start: { say: 'Beneath the Hollowed Guardian\'s roots, a sealed vault in living rock. Three conduit roots emit distinct tones. Align the right chord and the vault will open.', opts: [
        { t: 'Sing the Whisperers\' phrase into the roots', if: 'whisper_phrase', check: { skill: 'performance', dc: 12, pass: 'open', fail: 'snare' } },
        { t: '[Arcana] Find the chord', check: { skill: 'arcana', dc: 15, pass: 'open', fail: 'snare' } },
        { t: '[Performance] Find the chord', check: { skill: 'performance', dc: 15, pass: 'open', fail: 'snare' } },
      ], bye: false },
      snare: { say: 'Wrong! Defensive roots lash out and shadow spores burst — something skitters down from the ceiling.', do: [{ hurt: [2, 6], type: 'piercing', why: 'Roots lash at you!' }, { spawn: 'bloom_widow', n: 1 }], opts: [{ t: 'Try again', go: 'start' }], bye: false },
      open: { say: 'The chord resolves. The vault opens: inside lie the fifth sigil fragment, a burned and sap-stained journal page, a strip of bark that hums, and a seed — green, warm, alive with harmony. Light pulses from a crack in the rootstone above: a Resonance Anchor, waking.',
        do: [{ give: 'sigil_vale' }, { give: 'resonant_seed' }, { give: 'verdant_bark' }, { letter: 'lyra_page3' }, { flag: 'vale_fragment' }, { flag: 'lyra_word' }], opts: [{ t: 'Read the page', do: [{ read: 'lyra_page3' }], end: true }], bye: false },
    } },
  },
  fate_vale: sbFate('fate_vale', { place: 'root_hollow', offset: [-6, 16] }, { quest: 'q6', stage: 'fate' }, 'eldon_vale', '(Mud on her boots, leaves in her hair.) You again! Honestly didn\'t think I\'d catch you before sundown.'),
});

// ---- Scene 6–8: the Circle and the Willow ------------------------------------------------------------------------------------------
Object.assign(SB.npcs, {
  cairn_prop: {
    name: 'The Overgrown Cairn', title: 'The Echoing Path', place: 'overgrown_cairn', offset: [0, 0], prop: 'mossy_cobblestone', glyph: '⊚',
    talk: { start: [{ if: 'cairn_read', node: 'done' }], nodes: {
      start: { say: 'A crumbled druidic cairn overtaken by moss and vines. Inside: carvings of the Harmonic Tuner in an early form, beside two intersecting circles — one of stone, one of bark.', opts: [
        { t: '[Investigation] Read the carvings', check: { skill: 'investigation', dc: 13, pass: 'read', fail: 'no', xp: 300 } },
        { t: '[Religion] Read the carvings', check: { skill: 'religion', dc: 15, pass: 'read', fail: 'no', xp: 300 } },
      ] },
      read: { say: 'The Circle of Echoes: "singers of the First Harmonic". One word remains intact in Druidic: "Remembrance". When your Sending Crystal comes near, the cairn hums.', do: [{ flag: 'cairn_read' }, { reveal: ['echo_circle'] }], opts: [] },
      no: { say: 'Moss has eaten most of it.', opts: [] },
      done: { say: '"Remembrance."', opts: [] },
    } },
  },
  root_gate_prop: {
    name: 'The Root Gate', title: 'The Echoing Path', place: 'root_gate', offset: [0, 1], prop: 'stripped_mangrove_log', glyph: '⌇',
    talk: { start: [{ if: 'root_gate_open', node: 'done' }], nodes: {
      start: { say: 'Intertwined roots block the path, inscribed with faded sigils. When touched, they sing faint tones.', opts: [
        { t: '[Insight] Hear the sequence', check: { skill: 'insight', dc: 14, pass: 'open', fail: 'backlash', xp: 300 } },
        { t: '[Arcana] Work out the sequence', check: { skill: 'arcana', dc: 14, pass: 'open', fail: 'backlash', xp: 300 } },
        { t: '[Performance] Play the sequence', check: { skill: 'performance', dc: 14, pass: 'open', fail: 'backlash', xp: 300 } },
      ] },
      open: { say: 'The roots part with a sigh. A blessing of balance settles on you.', do: [{ flag: 'root_gate_open' }, { inspire: true }], opts: [] },
      backlash: { say: 'Resonance backlash! Your head spins.', do: [{ hurt: [1, 6], type: 'psychic' }], opts: [] },
      done: { say: 'The roots stand apart, the path open.', opts: [] },
    } },
  },
  echo_stones: {
    name: 'The Echo Stones', title: 'The Druidic Circle of Echoes', place: 'echo_circle', offset: [3, 0], prop: 'chiseled_stone_bricks', glyph: '◉',
    talk: { start: [{ if: 'circle_echo', node: 'done' }], nodes: {
      start: { say: 'Seven stones, each humming a different tone — dissonant, yet familiar. One is dead quiet: the note that was lost. Moss-covered totems ring the glade, some cracked, some overgrown.', opts: [
        { t: '[Arcana] Find the Rootsong in the tones', check: { skill: 'arcana', dc: 14, pass: 'align', fail: 'rush' } },
        { t: '[Nature] Find the Rootsong in the tones', check: { skill: 'nature', dc: 14, pass: 'align', fail: 'rush' } },
        { t: 'Sense the buried ritual pattern (druid)', if: { cls: 'druid' }, go: 'align' },
        { t: 'Touch three stones, quickly', go: 'rush' },
      ], bye: false },
      rush: { say: 'The tones clash. The Veil ripples — and a failed echo spirit, twisted by corruption, tears itself out of the air!', do: [{ spawn: 'echo_guardian', n: 1, if: '!circle_guardian' }, { flag: 'circle_guardian' }], opts: [{ t: 'Fight, then try again', go: 'start' }], bye: false },
      align: { say: 'Three aligned stones answer one another. A harmonic pulse runs through the Circle. Colour drains. Sound shifts. The world stills.', do: [{ narrate: [
        { title: "Lyra's Ritual Echo", text: `You see Lyra, breathless and focused, standing at the circle's centre. Her eyes shimmer — one green, one brown. She holds the Harmonic Tuner in both hands, tuning it to match the hum of the roots.\n\nAround her, ghostly shapes of the Circle Elders watch in silence. One whispers: "Too soon. Not yet harmonized."` },
        { title: "Lyra's Ritual Echo", text: `Lyra turns the dial once more — and the trees groan. The roots twist. The light fractures. A voice — Ember's — calls faintly across the Veil.\n\nThen Lyra stops. Turns. And whispers:\n\n"I'll follow it... but not here."\n\nThe vision fades, leaving a single glowing glyph on the ground.` },
      ], title: 'The Circle of Echoes' }, { flag: 'circle_echo' }, { flag: 'lyra_word' }, { xp: 600, why: "Lyra's ritual echo" }], opts: [{ t: 'Search where she stood.', end: true }], bye: false },
      done: { say: 'The stones hum, six of seven. The seventh is silent.', opts: [] },
    } },
  },
  lyra_site: {
    name: "Lyra's Ritual Site", title: 'The Druidic Circle of Echoes', place: 'echo_circle', offset: [-2, 2], prop: 'brown_wool', glyph: '✎', if: 'circle_echo', until: 'circle_page4',
    talk: { start: 'start', nodes: { start: { say: 'Her gear is scattered and burnt. A cracked tuner shell lies buried under leaves, and beneath a collapsed resonance stone, a weather-stained satchel with a journal page inside. A strip of bark parchment from the Circle Elders lies beside it, carved with a rough map. And carved into the stone itself: "To follow her, I must break rhythm and descend into silence."',
      do: [{ letter: 'lyra_page4' }, { letter: 'elder_bark' }, { give: 'bloom_bark' }, { flag: 'circle_page4' }, { reveal: ['weeping_willow', 'mourning_stone'] }], opts: [{ t: 'Read her page', do: [{ read: 'lyra_page4' }], end: true }], bye: false } } },
  },
  fate_circle: sbFate('fate_circle', { place: 'echo_circle', offset: [3, 12] }, { quest: 'q7', stage: 'fate' }, 'circle_echo_letter', '(Hair leaf-tangled, satchel clinking with spilled ink.) You\'re harder to find every time. Trees tried to close behind me this time.'),
  withered_prop: {
    name: 'The Withered Grove', title: 'Beyond the Vale', place: 'withered_grove', offset: [0, 0], prop: 'stripped_dark_oak_log', glyph: '☙',
    talk: { start: [{ if: 'resin_taken', node: 'done' }], nodes: {
      start: { say: 'Trees lean inward, branches brittle and cracked. Faint black sap beads along the bark. A squirrel skull impaled on a branch glows with a long-faded sigil.', opts: [{ t: '[Nature] Read the grove', check: { skill: 'nature', dc: 13, pass: 'resin', fail: 'resin2', xp: 300 } }, { t: '[Arcana] Read the grove', check: { skill: 'arcana', dc: 13, pass: 'resin', fail: 'resin2', xp: 300 } }] },
      resin: { say: 'The trees are reacting to a corrupted resonance pulse — the Bloom\'s. You carefully draw off the black sap: Deadroot Resin, for anti-Bloom elixirs, or for luring Bloomtouched things.', do: [{ give: 'deadroot_resin', n: 3 }, { flag: 'resin_taken' }], opts: [] },
      resin2: { say: 'You scrape off some sap. It stings.', do: [{ give: 'deadroot_resin', n: 1 }, { flag: 'resin_taken' }], opts: [] },
      done: { say: 'Black sap, and silence.', opts: [] },
    } },
  },
  mourning_prop: {
    name: 'The Mourning Stone', title: 'Beyond the Vale', place: 'mourning_stone', offset: [0, 1], prop: 'mossy_stone_bricks', glyph: '✧',
    talk: { start: [{ if: 'token_left', node: 'done' }], nodes: {
      start: { say: 'A great upright stone carved with spirals and a woman\'s name, eroded by time. Flowers never grow here, yet a faint melodic breeze clings to its base.', opts: [
        { t: '[History] Whose stone is this?', once: true, check: { skill: 'history', dc: 14, pass: 'grave', fail: 'start', xp: 200 } },
        { t: 'Leave a token, a name, or a melody', go: 'token' },
      ] },
      grave: { say: 'A grave-marker for the original seed-bearer of the Weeping Willow. Whoever she was, she was young.', opts: [{ t: 'Leave a token, a name, or a melody', go: 'token' }] },
      token: { say: 'You leave something of yourself at the stone. For a moment, at the edge of hearing, someone hums back — gratefully, and very far away.', do: [{ flag: 'token_left' }, { inspire: true }], opts: [] },
      done: { say: 'Your token rests at the stone\'s foot.', opts: [] },
    } },
  },
  willow_tree: {
    name: 'The Weeping Willow', title: 'A Harmonic Binder', place: 'weeping_willow', offset: [2, 0], prop: 'stripped_dark_oak_wood', glyph: '❦',
    talk: { start: [{ if: 'willow_echo', node: 'after' }], nodes: {
      start: { say: 'A single massive willow, sunk in a bowl of ancient stone. Its bark drips dark amber sap that glows as it falls. Its leaves do not rustle. They weep. Pools of sap-ringed water at its feet show distorted reflections — not of you, but of someone you\'ve lost, or forgotten.', opts: [
        { t: 'Sit beneath it and listen (meditate)', go: 'echo' },
        { t: 'Hold up a sigil fragment to the bark', if: { any: [{ has: 'sigil_vale' }, { has: 'sigil_razorwood' }] }, go: 'echo' },
        { t: '[Arcana] Read the bark sigils', once: true, check: { skill: 'arcana', dc: 15, pass: 'bark', fail: 'start', xp: 300 } },
        { t: '[Nature] Read the bark sigils', once: true, check: { skill: 'nature', dc: 15, pass: 'bark', fail: 'start', xp: 300 } },
        { t: 'Dig at the roots for what it keeps', go: 'grab' },
      ], bye: false },
      bark: { say: 'Glyphs etched by the Circle centuries ago: harmonic phrases used to repress the Bloom. The stones in the half-ring by its base are the roots of an unfinished melody.', opts: [{ t: 'Sit and listen', go: 'echo' }], bye: false },
      grab: { say: 'The bark sigils flare red-violet. Shadowy figures of druids twisted by failed seals rise from the ground!', do: [{ spawn: 'bloom_wraith', n: 3, if: '!willow_wraiths' }, { flag: 'willow_wraiths' }], opts: [{ t: 'Fight!', end: true }], bye: false },
      echo: { say: 'The wind stops. Sound folds inward.', do: [{ narrate: [
        { title: 'The Memory Chorus', text: `You're standing where the tree now grows — but the tear is open. Roots whip and scream. The forest shakes with resonance overload.\n\nFive druids are locked in a ritual, their voices overlapping, each singing a different tone. The sixth, younger and weeping, clutches a crystalline seed.` },
        { title: 'The Memory Chorus', text: `She steps forward. Places it into the ground.\n\n"Let my memory keep the seal. Let my root forget my name."\n\nA flash of light. A scream. Then silence.\n\nWhen the echo fades… the tree weeps again. And at its roots, the earth has softened, as if something has been offered to you.` },
      ], title: 'The Weeping Willow' }, { flag: 'willow_echo' }, { xp: 600, why: 'The Memory Chorus' }], opts: [{ t: 'Kneel at the roots.', end: true }], bye: false },
      after: { say: 'The Willow weeps. It remembers you now.', opts: [] },
    } },
  },
  willow_roots: {
    name: 'The Willow\'s Roots', title: 'The Weeping Willow', place: 'weeping_willow', offset: [-2, 2], prop: 'rooted_dirt', glyph: '❀', if: 'willow_echo', until: 'willow_fragment',
    talk: { start: 'start', nodes: { start: { say: 'The roots part — not in protest, but in memory. Nestled in a cradle of amber sap: a sigil fragment glowing green-gold, a sealed seed humming with a single held note, a strip of memory bark, and a sap-written stanza of an old lullaby.',
      do: [{ give: 'sigil_willow' }, { give: 'sealed_echo_seed' }, { give: 'willow_bark' }, { letter: 'rootsong_2' }, { flag: 'willow_fragment' }, { flag: 'willow_verse' }], opts: [{ t: 'Read the stanza', do: [{ read: 'rootsong_2' }], end: true }], bye: false } } },
  },
  fate_willow: sbFate('fate_willow', { place: 'weeping_willow', offset: [5, 13] }, { quest: 'q8', stage: 'fate' }, 'eldon_willow', '(Brushing sap off her gloves, with a tired smirk.) Wasn\'t sure I\'d make it through the grove this time. Something in there doesn\'t like being remembered.'),
  muted_birds: {
    name: 'The Silent Birds', title: 'The Meadow of Muted Birds', place: 'muted_glade', offset: [0, 0], prop: 'flowering_azalea', glyph: '♪',
    talk: { start: [{ if: 'feather_got', node: 'done' }], nodes: {
      start: { say: 'Dozens of small birds in the fruit trees, beaks open, wings fluttering — and no sound leaving them.', opts: [
        { t: '[Arcana] What holds them silent?', check: { skill: 'arcana', dc: 14, pass: 'field', fail: 'no', xp: 300 } },
        { t: '[Performance] Hum a note to them', check: { skill: 'insight', dc: 13, pass: 'sing', fail: 'no', xp: 300 } },
      ] },
      field: { say: 'A residual harmonic field, as if a tuning fork was struck here and held, freezing every natural tone in place. You hum, and one bird chirps back in perfect pitch, and drops a feather that hums.', do: [{ give: 'resonant_feather' }, { flag: 'feather_got' }], opts: [] },
      sing: { say: 'One bird chirps back, briefly, in perfect pitch — and drops a feather that hums.', do: [{ give: 'resonant_feather' }, { flag: 'feather_got' }], opts: [] },
      no: { say: 'Silence. Uncanny, complete silence.', opts: [] },
      done: { say: 'The birds watch you, silent.', opts: [] },
    } },
  },
  tone_guardian: {
    name: 'The Guardian of the Forgotten Tone', title: 'The Rootroad', place: 'tone_statue', offset: [0, 1], prop: 'amethyst_cluster', glyph: '◈',
    talk: { start: [{ if: 'tone_restored', node: 'done' }, { if: 'tone_broken', node: 'gone' }], nodes: {
      start: { say: 'A massive stone druid, seated, its face broken. In its chest cavity: a dried flower and a crystal vibrating in dissonant rhythm.', opts: [
        { t: '[Arcana] Re-align the crystal\'s tone', check: { skill: 'arcana', dc: 15, pass: 'fix', fail: 'fail', xp: 400 } },
        { t: '[Performance] Sing it back into tune', check: { skill: 'performance', dc: 15, pass: 'fix', fail: 'fail', xp: 400 } },
        { t: 'Sing a Rootsong verse to it', if: { any: ['vale_verse', 'willow_verse'] }, go: 'fix' },
      ] },
      fix: { say: 'The statue hums. A line on your sigil map repairs itself, and warmth fills you.', do: [{ flag: 'tone_restored' }, { inspire: true }], opts: [] },
      fail: { say: 'The statue shudders once, and collapses into stone dust. The moment is lost.', do: [{ flag: 'tone_broken' }], opts: [] },
      done: { say: 'The guardian hums, at peace.', opts: [] },
      gone: { say: 'Only dust and a dried flower.', opts: [] },
    } },
  },
  circle_altar: {
    name: 'The Resonance Altar', title: 'The Druidic Circle of Echoes', place: 'echo_circle', offset: [0, 0], propUp: 0, prop: 'budding_amethyst', glyph: '⚘', if: { quest: 'q9', active: true }, until: 'rootsong_whole',
    talk: { start: [{ if: 'circle_aligned', node: 'seventh' }], nodes: {
      start: { say: 'The altar\'s base is cracked, its runes dulled. Six stones hum around you; the seventh is silent. The Rootsong can only be restored by aligning the six, then giving the seventh its tone.', opts: [
        { t: '[Performance] Sing the six tones into line', check: { skill: 'performance', dc: 14, pass: 'aligned', fail: 'voice', adv: false } },
        { t: '[Arcana] Tune the six stones', check: { skill: 'arcana', dc: 14, pass: 'aligned', fail: 'voice' } },
        { t: 'Sing both verses you carry, Vale and Willow', if: { all: ['vale_verse', 'willow_verse'] }, go: 'aligned' },
      ], bye: false },
      aligned: { say: 'Six stones sing as one. The silent seventh waits.', do: [{ flag: 'circle_aligned' }], opts: [{ t: 'Give the seventh its tone', go: 'seventh' }], bye: false },
      seventh: { say: 'The seventh stone is dead quiet: the note that was lost. Not silenced — stolen. Not forgotten — buried.', opts: [
        { t: 'Plant the Sealed Echo Seed in the silent stone', if: { has: 'sealed_echo_seed' }, go: 'whole' },
        { t: 'Speak with the roots, as a druid does', if: { cls: 'druid' }, go: 'whole' },
        { t: '[Performance] Improvise the missing note', check: { skill: 'performance', dc: 17, pass: 'whole', fail: 'voice' } },
      ], bye: false },
      voice: { say: 'The song fails — the Veil ripples, and the Lost Voice manifests: a choral phantom of failed Echo druids, with one shadowed thread of Lyra\'s resonance in it.', do: [{ spawn: 'lost_voice', n: 1, if: '!lost_voice_woke' }, { flag: 'lost_voice_woke' }], opts: [{ t: 'Fight — and try again', end: true }], bye: false },
      whole: { say: 'The final tone rises — and the forest, as if it had been waiting for that note all along, exhales.', do: [{ take: 'sealed_echo_seed' }, { narrate: [
        { title: 'The Song Restored', text: `Light ripples outward from the altar. The stones vibrate in unison. The circle breathes. The seven stones sing a last line together, and you will never forget it:\n\n"Let no song end unspoken."\n\nBeneath the altar, roots shift aside — not torn, but moved, as if with intention — and a Resonance Anchor rises, glowing silver-blue with leaf-shaped glyphs.` },
        { title: 'The Song Restored', text: `You turn, half expecting a courier. But Fate is already gone, her footprint still fresh in the moss.\n\nIn her place: a letter, marked with Eldon's seal. And the scent of salt air and ash.` },
      ], title: 'The Circle of Echoes' }, { give: 'sigil_circle' }, { letter: 'rootsong_3' }, { letter: 'eldon_circle' }, { letter: 'rootsong_whole' }, { flag: 'rootsong_whole' }, { flag: 'circle_line' }, { xp: 2000, why: 'The Rootsong restored' }], opts: [{ t: 'Read Eldon\'s letter', do: [{ read: 'eldon_circle' }], end: true }], bye: false },
    } },
  },
});

// ---- Scene 9: the Shadowfell Forest ------------------------------------------------------------------------------------------------
Object.assign(SB.npcs, {
  spiral_glyph_prop: {
    name: 'The Spiral Glyph', title: "The Veil's Edge", place: 'spiral_glyph', offset: [0, 0], prop: 'crying_obsidian', glyph: '@',
    talk: { start: [{ if: 'rootsong_reversed', node: 'done' }], nodes: {
      start: { say: 'A massive spiral glyph carved into a shallow sinkhole, ringed by dark willow roots. It resonates — and screeches when touched without harmony.', opts: [
        { t: '[Arcana] Harmonize with it', check: { skill: 'arcana', dc: 15, pass: 'vision', fail: 'screech' } },
        { t: '[Performance] Harmonize with it', check: { skill: 'performance', dc: 15, pass: 'vision', fail: 'screech' } },
        { t: 'Sing the last line of the Rootsong to it', if: 'rootsong_whole', go: 'vision' },
      ], bye: false },
      screech: { say: 'A painful screech of resonance!', do: [{ hurt: [2, 6], type: 'thunder', why: 'The glyph screams!' }], opts: [{ t: 'Try again', go: 'start' }], bye: false },
      vision: { say: 'A sharp resonance splits the air like a thread pulled taut.', do: [{ narrate: [
        { title: 'The Backward Lullaby', text: `The world doesn't vanish. It simply fades, washed of colour, time and gravity. The trees remain, but their bark is smooth as mirrors, and each root hums like a harp string beneath the soil.\n\nYou are standing in the Veil Between Worlds. Ahead: a clearing of black-silver grass. At its centre, her back to you, a girl. Small. Barefoot. Still. Humming — a song that is haunting and familiar, but reversed, like a broken music box.` },
        { title: 'The Backward Lullaby', text: `"Where root runs deep, the bloom can't grow…\nBut backward breath, the song must sow."\n\nShe turns. Her eyes are empty, but you know they are Ember's. She opens her mouth, and what escapes is a sigil, not speech: a spiral of glyphs unravelling into the sky. Behind her, a door — wooden, cracked, embedded in the air itself.` },
        { title: 'The Backward Lullaby', text: `"Don't sing it forward… it's how they hear you… they only answer what was never meant to be said."\n\nYour Sending Crystal flares, imprinting the final phrase into your memory — backward. Only spoken in reverse will it align the Veil's nodes.\n\nYou blink back into the world. The glyph in the sinkhole is dormant.` },
      ], title: "The Veil's Edge" }, { flag: 'rootsong_reversed' }, { letter: 'rootsong_rev' }, { xp: 1500, why: 'The Backward Lullaby' }, { reveal: ['echo_gate', 'spiral_hollow'] }], opts: [{ t: 'Go deeper.', end: true }], bye: false },
      done: { say: 'The spiral is dormant.', opts: [] },
    } },
  },
  silent_names_prop: {
    name: 'The Tree of Silent Names', title: 'The Shadowfell Forest', place: 'silent_names', offset: [1, 1], prop: 'birch_log', glyph: '✍',
    talk: { start: 'start', nodes: { start: { say: 'A tall white tree whose bark is covered in etched names. Some of them are yours. Others… haven\'t been spoken yet.', opts: [{ t: '[Insight] Read the names', once: true, check: { skill: 'insight', dc: 15, pass: 'read', fail: 'blur', xp: 500 } }] },
      read: { say: 'Names appear after you read them, as though the tree writes them as you look. Near the top: Lyra Stonehand. Just below it, so faint it is almost not there: Ember. And one name that the bark refuses to hold — it writes itself, and smooths away, again and again. Druidic carved at the root: "Names remembered, names rewritten. The echo chooses who."', opts: [] },
      blur: { say: 'The letters slide away from your eyes.', opts: [] } } },
  },
  spiral_hollow_prop: {
    name: "Ember's Spiral", title: 'The Spiral Hollow', place: 'spiral_hollow', offset: [0, 0], prop: 'crying_obsidian', glyph: '@',
    talk: { start: [{ if: 'hollow_traced', node: 'done' }], nodes: { start: { say: 'A sinkhole rimmed with silver roots, glowing faintly. Ember\'s spiral glyph is carved at its centre.', opts: [{ t: 'Speak the Backward Lullaby into it', if: 'rootsong_reversed', go: 'trace' }] },
      trace: { say: 'The spiral turns once beneath your feet. For a breath you can see her footprints — small, bare — leading south through the trees, toward a gate of living rootstone, and past it.', do: [{ flag: 'hollow_traced' }, { xp: 500, why: "Ember's trail" }, { reveal: ['echo_gate', 'echo_grove'] }], opts: [] },
      done: { say: 'The footprints have faded.', opts: [] } } },
  },
  echo_gate_prop: {
    name: 'The Echo Gate', title: 'The Shadowfell Forest', place: 'echo_gate', offset: [0, 0], prop: 'reinforced_deepslate', glyph: '⛩', until: 'gate_open',
    talk: { start: 'start', nodes: {
      start: { say: 'A gate-like arch of living rootstone blocks the path. No lock. No sigil. Only silence. To open it, the Rootsong must be sung in reverse: the Vale\'s verse, the Willow\'s, the Circle\'s last line, and Ember\'s backward breath.', opts: [
        { t: 'Sing the Rootsong in reverse', if: { all: ['rootsong_whole', 'rootsong_reversed'] }, check: { skill: 'performance', dc: 14, pass: 'open', fail: 'despair' } },
        { t: '[Arcana] Weave the reversed song as a spell', if: { all: ['rootsong_whole', 'rootsong_reversed'] }, check: { skill: 'arcana', dc: 15, pass: 'open', fail: 'despair' } },
        { t: 'You don\'t know the song yet.', if: { not: 'rootsong_reversed' }, reply: 'The gate is silent. You need the whole Rootsong, and Ember\'s backward breath.', end: true },
      ], bye: false },
      despair: { say: 'Out of tune. You relive a moment you failed to act, or lost something — and it weighs on you.', do: [{ hurt: [2, 6], type: 'psychic', why: 'The dissonance cuts deep' }], opts: [{ t: 'Try again', go: 'start' }], bye: false },
      open: { say: 'The last reversed note leaves your lips. The gate parts with a discordant sigh, and the trees shift inward like watching eyes. Ahead lies not the Shadowfell, but its reflection in your memory. And somewhere across layers of mist and melody, Ember is still humming. Not for rescue. As a warning.', do: [{ flag: 'gate_open' }, { xp: 1500, why: 'The Echo Gate' }, { reveal: ['echo_grove'] }], opts: [{ t: 'Step through.', end: true }], bye: false },
    } },
  },
  resonant_cage: {
    name: 'The Resonant Cage', title: 'The Bloomed Echo Grove', place: 'echo_grove', offset: [0, 2], prop: 'amethyst_cluster', glyph: '❂', if: 'gate_open', until: { any: ['cage_solved', 'cage_broken'] },
    talk: { start: 'start', nodes: {
      start: { say: 'At the grove\'s heart, a weeping ash hollowed into a cradle. Inside, a phantom child shape, humming softly: Ember\'s echo. A ring of glowing sigils turns around her in a rhythmic triad — a cage, not of iron, but of feeling. Too much force breaks the projection. Too little, and the Bloom spreads.', opts: [
        { t: '[Arcana] Unpick the Bloom\'s false tones, gently', check: { skill: 'arcana', dc: 15, pass: 'free', fail: 'broke' } },
        { t: '[Insight] Hear which part of the song is hers', check: { skill: 'insight', dc: 15, pass: 'free', fail: 'broke' } },
        { t: '[Performance] Sing the true lines over the false ones', check: { skill: 'performance', dc: 15, pass: 'free', fail: 'broke' } },
        { t: 'Hold Ember\'s sigil cloth to the cage, and sing', if: { has: 'ember_sigil_cloth' }, check: { skill: 'performance', dc: 12, pass: 'free', fail: 'broke' } },
        { t: 'Smash the sigils', go: 'broke' },
      ], bye: false },
      broke: { say: 'The grove screams. Roots retract. Trees wither. The light implodes inward — and from the centre rises the Echoing Bloom: a massive child-shaped silhouette of vines and shadow petals, humming every line of the Rootsong backward.', do: [{ flag: 'cage_broken' }], opts: [{ t: 'Fight!', end: true }], bye: false },
      free: { say: 'Note by note, the false tones fall away. The cage loosens without breaking. Ember\'s echo stops humming, turns its face toward you — and dissolves, gently, like breath on glass. The Bloom recedes: not slain, but unwoven.', do: [{ flag: 'cage_solved' }, { clear: 'echo_grove' }, { xp: 2000, why: 'The Resonant Cage' }], opts: [{ t: 'Search the Cradle Tree.', end: true }], bye: false },
    } },
  },
  zephyr_veil: {
    name: 'Zephyr', title: 'Travelling Merchant', place: 'veilwood_clearing', offset: [3, 3], if: { quest: 'q10', active: true }, unlisted: true,
    look: SB_LOOK('dwarf', { body: 'broad', skin: '#c89a78', hair: 'wild', hairCol: '#8a8a8a', beard: 'long', beardCol: '#9a9a9a', eyes: 'glow', eyeCol: '#c0c0e8', mouth: 'grin', outfit: 'traveller', cols: ['#6a5a3a', '#8a3a2a', '#4a4a3a', '#3a2414'], hood: true }),
    wares: [['mirrorroot_powder', 2, 8, 0], ['sealed_crystal_bloom', 1, 10, 0], ['potion_greater_healing', 2, 26, 0], ['harp_string', 1, 20, 0]],
    buys: [['veil_bone', 1, 8, 0], ['glassfeather', 1, 4, 0], ['harmonic_dust', 4, 2, 0]],
    talk: { start: 'start', nodes: {
      start: { say: 'Well now… wasn\'t expectin\' to see your shadows curled this far from sunlight. The Veil\'s teeth are sharp here. Good thing I brought a few salves, stories… and sins in bottles.', opts: [
        { t: 'Let\'s trade.', shop: true },
        { t: 'Tell him a story you haven\'t told anyone', once: true, do: [{ give: 'mirrorroot_powder' }], reply: '(He listens without interrupting, and at the end he nods slowly.) “Worth a powder, that one. Here.”', go: 'start' },
        { t: 'Show him Lyra\'s final note', if: { has: 'lore_lyra_final' }, reply: '“She was always ahead of the bloom, but too close to its rhythm. That final chord… I think she tried to become the lock. Might be why her voice is still half-singing through the Cradle Trees. Don\'t let the Tuner tune you instead.”', go: 'start' },
        { t: 'Seen a girl humming backward?', reply: '“One eye like frost, the other like fire? I hear her in the wind some nights. That\'s all. That\'s enough.”', go: 'start' },
      ] },
    } },
  },
});
Object.assign(SB.places.echo_grove, { onClear: [{ give: 'sigil_bloomroot' }, { give: 'echo_flame_bloom' }, { letter: 'lyra_final' }, { reveal: ['mirrorroot'] }, { narrate: [{ title: 'The Grove That Remembers', text: `The grove exhales for the first time since the song began. The sigils pulse once more — this time in harmony.\n\nNear the Cradle Tree lies a page, frayed and singed with planar heat, the ink still shifting as if trying to change the words: Lyra's final note.\n\nAnd you understand, at last, what the grove has been showing you. Ember is not wholly trapped, nor fully lost. She is being used as a resonant prism to hold the breach open. Her humming is a loop, seeded by Lyra's failed tuning. And she is not here — but beneath the world. Beneath the Sigil Lattice. In a place the druids called the Mirrorroot.` }] }] });

// ---- Eldon's debriefs between the scenes ----------------------------------------------------------------------------------------
SB.npcs.eldon.talk.start.unshift(
  { if: { quest: 'q4', stage: 'eldon' }, node: 'd_marsh' },
  { if: { quest: 'q5', stage: 'eldon' }, node: 'd_cinder' },
  { if: { quest: 'q6', stage: 'eldon' }, node: 'd_vale' },
  { if: { quest: 'q8', stage: 'eldon' }, node: 'd_willow' },
  { if: { quest: 'q9', stage: 'eldon' }, node: 'd_circle' },
  { if: { quest: 'q10', stage: 'eldon' }, node: 'd_shadow' },
);
Object.assign(SB.npcs.eldon.talk.nodes, {
  d_marsh: { say: 'I knew the moment the Anchor flared to life… That means you\'ve found one. Good. They\'re working. Those Anchors aren\'t just for travel. They\'re stabilizers — harmonic keystones linked to the ley lines. Lyra and I planted them long ago, meant for emergencies, for calling heroes home. But every time one wakes, the Veil thins… just enough to see more clearly.',
    alt: [{ if: 'nico_captured', say: 'I knew the moment the Anchor flared… And you brought Nico back in irons. I should have listened to my doubts. Those Anchors aren\'t just for travel — they\'re stabilizers, harmonic keystones linked to the ley lines. Lyra and I planted them long ago. Every time one wakes, the Veil thins, just enough to see more clearly.' }],
    opts: [{ t: 'Nico\'s potion was an amplifier. And Lyra\'s voice spoke through the crystal: "Meet me — Verdant Vale."', go: 'd_marsh2' }] },
  d_marsh2: { say: '(He listens gravely.) Then the Bloomed Circle is accelerating. The ritual sites are converging on something — Mount Cinder, the Vale, or something worse. Rest tonight. The crystal will tell us where to go in the morning; it always has, with Lyra.', do: [{ flag: 'eldon_marsh' }], opts: [{ t: 'We\'ll rest.', end: true }] },
  d_cinder: { say: 'You felt it, didn\'t you? The Vault\'s pulse — it was older than the seal. Do you still have Lyra\'s journal page?', opts: [{ t: 'Hand him Lyra\'s page', go: 'd_cinder2' }] },
  d_cinder2: { say: '(He reads in silence, frowning at the last lines.) "The vault is only the mouth… the forge is deeper…" The Crystal Caverns. She went deeper than I thought. And the Tuner… it wasn\'t built — it was born. And the Forest beyond the Veil: the Shadowfell Forest, from the old druidic tomes. Nico\'s potion was never containment. It was meant to widen the breach.',
    opts: [{ t: 'What now?', go: 'd_cinder3' }] },
  d_cinder3: { say: 'We need to find Lyra. But more than that — we need to understand what\'s bleeding into our world. Her page points east: the Verdant Vale. "The root remembers." The Vale may be singing, but it\'s not singing alone. (And Aric has bandits in his cells with flowers burned into their skin. Ask him, if you\'ve a moment.)', do: [{ flag: 'eldon_cinder' }, { reveal: ['vale_arch', 'singing_grove'] }], opts: [{ t: 'To the Vale.', end: true }] },
  d_vale: { say: 'They called to me. The Whisperers. Not in words… in tone. Through you. That hasn\'t happened in decades. The Vale was more than a cradle. It was a vault. And Ember\'s echo… she didn\'t just pass through that sigil, she became part of it. What did you bring back?', opts: [
    { t: "Lyra's Journal, Page 3", reply: '(He takes it as though it might crumble.) “So she did try again… even after Mount Cinder. She never forgave herself for that. These aren\'t verses. They\'re confessions. She speaks of the forest across the Veil as if she saw it. If the forest remembers her… then she\'s further than I feared. And yet… closer than we think.”', go: 'd_vale' },
    { t: 'The Resonant Seed', reply: '“Harmonic life. Crystallized potential. It may stabilize a corrupted sigil — or awaken something we\'re not ready for. Whatever takes root… may remember you.”', go: 'd_vale' },
    { t: 'The Verdant Memory Bark', reply: '(The chimes in the room ring unprompted.) “It remembers. Not just places, or people… but frequency. This is a relic. But also a voice. One that\'s been waiting for someone to listen.”', go: 'd_vale' },
    { t: 'The Sigil Map', reply: '“You\'ve reconnected the pattern. These junctions weren\'t active before. It\'s forming a chord. Dissonant, incomplete — but unmistakable.”', go: 'd_vale' },
    { t: 'Where next?', go: 'd_vale2' },
  ] },
  d_vale2: { say: 'The Druidic Circle holds what Lyra couldn\'t finish — the shaping of the full harmonic phrase. The Rootsong. And the Shadowfell Forest… the Veil is beginning to resonate on its own. In dissonance. Rest tonight. I\'ll stay up with the crystal.', do: [{ flag: 'eldon_vale' }], opts: [{ t: 'We\'ll rest.', end: true }] },
  d_willow: { say: 'The Willow let you go. That means… it remembers you. Or perhaps forgives you. (He sets the fragment on his map; silver threads stretch to the Vale, the Circle… and south.) The forest doesn\'t weep for the dead. It weeps for the ones who buried themselves to hold the world together. The Sealed Echo Seed — that is a note in seed form. It may be the tone the Circle is missing.', opts: [{ t: 'Then we take it to the Circle.', go: 'd_willow2' }] },
  d_willow2: { say: 'Yes. But rest first. Fate says the winds are shifting — that the Veil no longer echoes. It responds.', do: [{ flag: 'eldon_willow' }], opts: [{ t: 'We\'ll rest.', end: true }] },
  d_circle: { say: 'I heard it. All of it. You completed the Rootsong. You gave the Circle its final phrase. (Glyphs hang suspended in harmonic strands around him.) There\'s something I haven\'t told you. This isn\'t just harmonic energy. It\'s memory. The world\'s memory — recorded not in ink, but resonance. And when frequency is shaped by emotion, by trauma, by sacrifice… it becomes projection.', opts: [{ t: 'You mean we\'ve been reliving the past?', go: 'd_circle2' }] },
  d_circle2: { say: 'More than that. You\'ve been tuning it. And the truth is worse: the Veil listens too. If the Bloom begins to project — to overwrite real places with its version of the past — it won\'t just reshape the Veil. It will rewrite the world. (He takes down a folded cloak that shimmers with anchor-light.) Take this; I wove it from the anchors\' light. You\'ll need it in the Shadowfell, south of the Vale. And if you want to see what we sealed beneath this tower… ask me about the archives.',
    do: [{ give: 'feedback_cloak', party: true }, { flag: 'eldon_circle' }, { flag: 'archives_offered' }, { reveal: ['spiral_glyph'] }], opts: [{ t: 'Thank you, Eldon.', end: true }] },
  d_shadow: { say: '(He reads Lyra\'s note, frowns, then hums a single note — and the overwriting glyphs fade a little.) She encoded the final lines in inverted root-harmony. Brilliant… but dangerous. This part… this is a glyph of self-removal. She tried to tune herself out of the lattice. I believe she\'s still echoing. If we find the Mirrorroot, we may find her… or the last memory of her.',
    do: [{ flag: 'eldon_shadow' }, { reveal: ['mirrorroot', 'memory_crossing', 'forgotten_camp'] }], opts: [{ t: 'We go to the Mirrorroot.', end: true }] },
});
// the Stonebridge archives (the Deep Notes), once the Circle sings
SB.npcs.eldon.talk.nodes.start.opts.push({ t: 'Can you open the archives?', if: { all: ['archives_offered', '!archives_seen'] }, go: 'archives' });
Object.assign(SB.npcs.eldon.talk.nodes, {
  archives: { say: 'I thought I\'d never hear someone ask that again. They were sealed at the end of the Bloomlight Convergence. We lost good people. Not to death… to dissonance. Some just stopped speaking. Others began humming songs that never ended. (He places his palm on a sigil in the back wall. The stone resonates, and slides open on a stair of obsidian-glass.)', opts: [{ t: 'Descend.', go: 'archives2' }] },
  archives2: { say: 'A domed library shaped like a blooming spiral. Scroll-capsules line the walls between root-strands; a Resonant Table of stone veined with silver sits at the centre. “This is what we called the Deep Notes. Not histories. Records of resonance itself. And this table… is where Lyra stood, once.”', opts: [
    { t: '[Performance] Sing a single note into the dome', check: { skill: 'performance', dc: 12, pass: 'archives_echo', fail: 'archives3' } },
    { t: 'Touch the Resonant Table with a sigil fragment', if: { any: [{ has: 'sigil_circle' }, { has: 'sigil_vale' }] }, go: 'archives_echo' },
    { t: 'Read the records', go: 'archives3' },
  ] },
  archives_echo: { say: 'A swirl of silver-blue dust lifts from the table. Lyra, young and alert, places the Harmonic Tuner on the table; it spins. “We tried to balance it. The Veil isn\'t a wall — it\'s a rhythm. A breath held between worlds. I couldn\'t save her. Not yet. But she hears me… Ember hears me.” She turns, as if noticing you. “Seven won\'t be enough. There were always more. Find the Veil\'s heart. Not where it breaks… but where it listens.”',
    do: [{ flag: 'veil_heart_hint' }], opts: [{ t: 'Read the records', go: 'archives3' }] },
  archives3: { say: '“We were never meant to forget… but we weren\'t ready to remember.” (He reseals the door behind you.) “When you\'re ready, choose your next echo. The Veil is still listening.”', do: [{ letter: 'deep_notes' }, { flag: 'archives_seen' }, { xp: 1000, why: 'The Deep Notes' }], opts: [] },
});

// ---- Act II: the quest line ------------------------------------------------------------------------------------------------------
Object.assign(SB.quests, {
  q2: { title: "The Sigil's Shadow", main: true, order: 2, summary: 'Follow Ember\'s trail from Oakhaven into the Razorwood, and understand the sigil she drew.',
    stages: {
      oak: { goal: 'Travel east to Oakhaven, Ember\'s village', obj: { reach: 'oakhaven' }, at: 'oakhaven', next: 'ask' },
      ask: { goal: 'Find out what happened to Ember', text: 'The villagers are polite but reserved. The children on the green, Lendel at the Trade Post, or the hut by the stream might tell you something.', obj: { flag: 'know_mira' }, at: 'oakhaven', next: 'mira' },
      mira: { goal: 'Find Ember\'s grandmother, Mira, at the Sacred Stone Circle on the eastern hill', obj: { flag: 'mira_told' }, at: 'mira', next: 'razor' },
      razor: { goal: 'Follow Ember\'s trail east into the Razorwood Thicket', obj: { reach: 'razorwood', r: 20 }, at: 'razorwood', next: 'sigil' },
      sigil: { goal: 'Study the sigil burned into the great tree', obj: { flag: 'sigil_vision' }, at: 'razorwood', next: 'stalkers' },
      stalkers: { goal: 'Survive the Bloomtouched stalkers', obj: { clear: 'razorwood' }, at: 'razorwood', next: 'back' },
      back: { goal: 'Return to Mira in Oakhaven', hint: 'A Resonance Anchor has woken by the great tree.', obj: { flag: 'greystone_lead' }, at: 'mira' },
    },
    reward: { xp: 150, gold: 30 }, onDone: [{ milestone: 3, why: "The Sigil's Shadow" }, { quest: 'q3' }, { flag: 'lyra_word' }] },
  q3: { title: 'The Vault of Old Greystone', main: true, order: 3, summary: '"Greystone holds the first answer." The ruins north-west of Oakhaven, sealed after the Veil Wars.',
    stages: {
      fate: { goal: 'Rest and resupply in Oakhaven. Someone is looking for you.', text: 'The Bellowing Boar has beds, Mira will want to see you, and a courier is somewhere in the square.', obj: { read: 'fate_greystone' }, at: 'oakhaven', next: 'trail' },
      trail: { goal: 'Take the hill road north-west toward Greystone', obj: { reach: 'borin_cart', r: 18 }, at: 'borin_cart', next: 'stalker' },
      stalker: { goal: 'Deal with the wounded stalker by the cart', obj: { clear: 'borin_cart' }, at: 'borin_cart', next: 'search' },
      search: { goal: 'Search the broken cart and the body', obj: { flag: 'borin_found' }, at: 'borin_cart', next: 'vault' },
      vault: { goal: 'Find the Vault of Old Greystone in the cliffs', obj: { reach: 'greystone', r: 28 }, at: 'greystone', next: 'echo' },
      echo: { goal: 'Descend into the Vault and find what Lyra left in the Echo Chamber', obj: { flag: 'grey_echo' }, at: 'greystone', next: 'seal' },
      seal: { goal: 'Open the harmonic seal of the inner vault (the five chimes)', hint: '"Three truths form the seal. One lies. One sings too loud." Fate\'s letter warned: trust no light that does not flicker; a bloom only spreads when it hears its name.', obj: { any: [{ flag: 'grey_seal_open' }, { clear: 'greystone' }] }, at: 'greystone', next: 'surface' },
      surface: { goal: 'Climb back to the surface', obj: { read: 'fate_poem' }, at: 'greystone' },
    },
    reward: { xp: 300, gold: 60 }, onDone: [{ milestone: 4, why: 'The Vault of Old Greystone' }, { flag: 'nico_gone' }, { fail: 'sq_nico', if: { quest: 'sq_nico', active: true } }, { quest: 'q4' }, { reveal: ['marsh_ruin', 'sigil_pool'] }] },
  q4: { title: 'The Whispering Marshes', main: true, order: 4, summary: 'Nico\'s shop is shut. Fate\'s poem speaks of a silvered tongue. The Marshes, where Nico gathered his ingredients, may hold the truth.',
    stages: {
      go: { goal: 'Travel south-west into the Whispering Marshes', obj: { reach: 'sigil_pool', r: 80 }, at: 'sigil_pool', next: 'search' },
      search: { goal: 'Search the marsh for signs of Nico (the satchel, the pool, the robe)', obj: { flags: ['marsh_cache', 'marsh_pool', 'marsh_robe'], n: 2 }, at: 'sigil_pool', next: 'ruin' },
      ruin: { goal: 'Find the sunken ruin where the lanterns flicker', obj: { reach: 'marsh_ruin', r: 28 }, at: 'marsh_ruin', next: 'nico' },
      nico: { goal: 'Uncover the truth of Nico\'s "cure" inside the ruin', obj: { flag: 'nico_resolved' }, at: 'marsh_ruin', next: 'aberration' },
      aberration: { goal: 'Destroy what guards the ruin', obj: { clear: 'marsh_ruin' }, at: 'marsh_ruin', next: 'home' },
      home: { goal: 'Use the Resonance Anchor (or your Sending Crystal) to return to Stonebridge', obj: { reach: 'stonebridge', r: 45 }, at: 'stonebridge', next: 'eldon' },
      eldon: { goal: 'Tell Eldon what you found', obj: { flag: 'eldon_marsh' }, at: 'eldon', next: 'rest' },
      rest: { goal: 'Rest the night in Stonebridge', text: 'Take a room at the Gilded Griffin, or Eldon\'s cot.', obj: { flag: 'interlude1' }, at: 'stonebridge' },
    },
    reward: { xp: 400, gold: 80 }, onDone: [{ milestone: 5, why: 'The Whispering Marshes' }, { quest: 'q5' }] },
  q5: { title: 'The Ember at Mount Cinder', main: true, order: 5, summary: 'A symbol etched itself into the Sending Crystal: a mountain crest, split by flame. A disrupted Veil Seal lies beneath Mount Cinder.',
    stages: {
      go: { goal: 'Climb to the Smoldering Pass on Mount Cinder', text: 'The road runs north-east through the foothills to the ashen highlands. Zephyr still trades at the Cinderfall camp.', obj: { reach: 'smoldering_pass', r: 22 }, at: 'smoldering_pass', next: 'seal' },
      seal: { goal: 'Unlock the Fractured Vault: the Veil Seal in the obsidian wall', obj: { flag: 'cinder_seal_open' }, at: 'fractured_vault', next: 'vault' },
      vault: { goal: 'Descend into the Ember Vault', obj: { reach: 'ember_vault', r: 30 }, at: 'ember_vault', next: 'horror' },
      horror: { goal: 'Face what stirs in the lava pit', obj: { clear: 'ember_vault' }, at: 'ember_vault', next: 'core' },
      core: { goal: 'Search the broken pedestal', obj: { flag: 'cinder_page' }, at: 'ember_vault', next: 'fate' },
      fate: { goal: 'Someone is coming up the trail…', obj: { read: 'eldon_crystal' }, at: 'ember_vault', next: 'eldon' },
      eldon: { goal: 'Return to Eldon in Stonebridge', obj: { flag: 'eldon_cinder' }, at: 'eldon' },
    },
    reward: { xp: 500, gold: 120 }, onDone: [{ milestone: 6, why: 'The Ember at Mount Cinder' }, { quest: 'q6' }] },
  q6: { title: "The Verdant Vale's Heart", main: true, order: 6, summary: '"The root remembers. The bloom forgets." Lyra went next to the Verdant Vale, where the Whisperers hum.',
    stages: {
      go: { goal: 'Follow Lyra\'s trail east to the Verdant Vale', text: 'Past the Forgotten Archway. A lost pilgrim may know the way past the Vale\'s guardians.', obj: { reach: 'singing_grove', r: 40 }, at: 'singing_grove', next: 'grove' },
      grove: { goal: 'Awaken a Verdant Whisperer in the Singing Grove', obj: { flag: 'whisper_phrase' }, at: 'singing_grove', next: 'hollow' },
      hollow: { goal: 'Descend into the Root Hollow and face the Hollowed Guardian', hint: 'The Whisperer said the hollow one may remember Ember. Carry her sigil cloth.', obj: { clear: 'root_hollow' }, at: 'root_hollow', next: 'roots' },
      roots: { goal: 'Open the sealed vault beneath the Guardian\'s roots', obj: { flag: 'vale_fragment' }, at: 'root_hollow', next: 'fate' },
      fate: { goal: 'Fate, mud on her boots, is pushing through the undergrowth…', obj: { read: 'eldon_vale' }, at: 'root_hollow', next: 'eldon' },
      eldon: { goal: 'Return to Eldon in Stonebridge', obj: { flag: 'eldon_vale' }, at: 'eldon', next: 'rest' },
      rest: { goal: 'Rest the night in Stonebridge', obj: { flag: 'dream_ember' }, at: 'stonebridge' },
    },
    reward: { xp: 600, gold: 150 }, onDone: [{ milestone: 7, why: "The Verdant Vale's Heart" }, { quest: 'q7' }] },
  q7: { title: 'The Druidic Circle of Echoes', main: true, order: 7, summary: 'Lyra turned toward the Circle, where the druids once kept the Rootsong.',
    stages: {
      go: { goal: 'Travel the old rootroad to the Druidic Circle of Echoes, east-south-east of Stonebridge where the Vale meets the Shadowfell', obj: { reach: 'echo_circle', r: 26 }, at: 'echo_circle', next: 'stones' },
      stones: { goal: 'Listen to the echo stones', obj: { flag: 'circle_echo' }, at: 'echo_circle', next: 'site' },
      site: { goal: 'Search the remains of Lyra\'s ritual', obj: { flag: 'circle_page4' }, at: 'echo_circle', next: 'fate' },
      fate: { goal: 'A courier, again…', obj: { read: 'circle_echo_letter' }, at: 'echo_circle' },
    },
    reward: { xp: 2500, gold: 50 }, onDone: [{ quest: 'q8' }, { letter: 'eldon_willow_note' }] },
  q8: { title: 'The Weeping Willow', main: true, order: 8, summary: '"I left the last note inside the Willow." The Circle\'s missing tone is buried with a girl who gave up her name.',
    stages: {
      go: { goal: 'Seek the Weeping Willow, east beyond the Verdant Vale', obj: { reach: 'weeping_willow', r: 26 }, at: 'weeping_willow', next: 'chorus' },
      chorus: { goal: 'Listen to the Willow\'s memory', obj: { flag: 'willow_echo' }, at: 'weeping_willow', next: 'roots' },
      roots: { goal: 'Take what the Willow keeps beneath its roots, gently', obj: { flag: 'willow_fragment' }, at: 'weeping_willow', next: 'fate' },
      fate: { goal: 'Fate, brushing sap off her gloves…', obj: { read: 'eldon_willow' }, at: 'weeping_willow', next: 'eldon' },
      eldon: { goal: 'Return to Eldon in Stonebridge', obj: { flag: 'eldon_willow' }, at: 'eldon', next: 'rest' },
      rest: { goal: 'Rest the night in Stonebridge', obj: { flag: 'dream_root' }, at: 'stonebridge' },
    },
    reward: { xp: 800, gold: 100 }, onDone: [{ milestone: 8, why: 'The Weeping Willow' }, { quest: 'q9' }] },
  q9: { title: 'The Song Restored', main: true, order: 9, summary: 'With the Sealed Echo Seed, the Circle\'s seventh stone can sing again.',
    stages: {
      go: { goal: 'Return to the Circle of Echoes with the Sealed Echo Seed', obj: { reach: 'echo_circle', r: 24 }, at: 'echo_circle', next: 'song' },
      song: { goal: 'Complete the Rootsong at the Circle\'s altar', obj: { flag: 'rootsong_whole' }, at: 'echo_circle', next: 'eldon' },
      eldon: { goal: 'Bring the news to Eldon', obj: { flag: 'eldon_circle' }, at: 'eldon' },
    },
    reward: { xp: 1500, gold: 150 }, onDone: [{ quest: 'q10' }] },
  q10: { title: 'The Shadowfell Forest', main: true, order: 10, summary: 'South of the Vale lies the Shadowfell Forest: not a place, but a thinning. Ember may be calling from the other side.',
    stages: {
      go: { goal: 'Travel south into the Shadowfell Forest, to the spiral at the Veil\'s edge', obj: { reach: 'spiral_glyph', r: 22 }, at: 'spiral_glyph', next: 'glyph' },
      glyph: { goal: 'Harmonize the spiral glyph at the Veil\'s edge', obj: { flag: 'rootsong_reversed' }, at: 'spiral_glyph', next: 'gate' },
      gate: { goal: 'Open the Echo Gate: sing the Rootsong in reverse', obj: { flag: 'gate_open' }, at: 'echo_gate', next: 'grove' },
      grove: { goal: 'Enter the Bloomed Echo Grove', obj: { reach: 'echo_grove', r: 24 }, at: 'echo_grove', next: 'cage' },
      cage: { goal: 'Free Ember\'s echo from the Resonant Cage', obj: { any: [{ flag: 'cage_solved' }, { clear: 'echo_grove' }] }, at: 'echo_grove', next: 'note' },
      note: { goal: 'Read what Lyra left by the Cradle Tree', obj: { read: 'lyra_final' }, at: 'echo_grove', next: 'eldon' },
      eldon: { goal: 'Return to Eldon with Lyra\'s note', obj: { flag: 'eldon_shadow' }, at: 'eldon' },
    },
    reward: { xp: 1000, gold: 200 }, onDone: [{ milestone: 9, why: 'The Shadowfell Forest' }, { quest: 'q11' }] },
  sq_milk: { title: "The Milkmaid's Charm", order: 24, summary: 'Wenna Hallowbrook\'s magical cow, Buttercup, was taken by Bloom-touched goblins.',
    stages: { warren: { goal: 'Drive the goblins out of the hollow south of Oakhaven', obj: { clear: 'goblin_warren' }, at: 'goblin_warren', next: 'back' }, back: { goal: 'Tell Wenna at the Hallowbrook Dairy', obj: { flag: '_never' }, at: 'wenna' } },
    reward: { xp: 200, gold: 25, items: [['buttercup_milk', 4]] } },
});

// ---- dreams and the mornings after ---------------------------------------------------------------------------------------------------
Object.assign(SB.triggers, {
  dreamfall: { rest: true, if: { all: [{ quest: 'q3', active: true }, 'borin_found'] }, do: [{ narrate: [{ title: 'Dreamfall Glade', text: `That night your campfire burns strangely — flickering blue at its edges. Sleep comes easily. Too easily.\n\nIn the dream you stand in a stone chamber. Lyra stands across the room, reflected in an obsidian mirror. She tunes the Harmonic Tuner in reverse; every twist unravels glowing lines in the walls. A shadow looms behind her. Not touching. Not present. But watching.\n\nHer reflection turns toward you, eyes wide, and whispers: "Don't open the wrong seal."\n\nYou wake with a burning chill across your hand — a fading sigil of frost.` }] }] },
  interlude1: { rest: true, if: { quest: 'q4', stage: 'rest' }, do: [{ narrate: [
    { title: 'The Stone of Echoes', text: `Night falls gently over Stonebridge. Candles flicker in the windows, and the sound of the river lulls you into calm. As you settle into rest, a faint harmonic pulse echoes from the Sending Crystal:\n\n"A new glyph stirs. The next door… is almost open."` },
    { title: 'The Pull of Resonance', text: `In the morning Eldon is waiting. "The crystal's signal has shifted. A glyph just activated — far from here."\n\nA symbol begins to etch itself into the Sending Crystal's surface: unfamiliar, jagged, glowing faintly red. Like a mountain crest… split by flame.\n\nMount Cinder. Where Lyra went before the Vale.` },
  ] }, { flag: 'interlude1' }, { reveal: ['smoldering_pass', 'cinderfall_camp'] }] },
  dream_ember: { rest: true, if: { quest: 'q6', stage: 'rest' }, do: [{ narrate: [
    { title: "Ember's Voice Across the Veil", text: `Roots. You float above them — a vast canopy turned upside down, roots stretching into starless soil, pulsing faintly red like a forgotten heartbeat.\n\nA child stands in the middle of the rootweb, barefoot, hair glowing faintly like embers in the wind. She is not afraid. She holds out her hand, and you hear a hum — not from her lips, but from her bones.\n\n"I followed the song because it knew my name. It didn't want me to be alone. But the song isn't right anymore. It's sick. It forgot how to end."` },
    { title: "Ember's Voice Across the Veil", text: `"The trees won't talk to me here. They're scared too. Lyra tried to help. But the tune broke her, just a little." A tear slides down her cheek and turns to ash.\n\n"They want to use me to finish the song."\n\nA shadow moves behind her, tall and thin and wrong. "Don't let them sing through me. Don't let her… open the rest. If you find Lyra, tell her I remember the circle. I remember the tree that weeps with two songs."\n\nThe roots flare red. You wake with a gasp. The fire has gone out. Your Sending Crystal glows faintly.` },
  ] }, { flag: 'dream_ember' }] },
  dream_root: { rest: true, if: { quest: 'q8', stage: 'rest' }, do: [{ narrate: [
    { title: 'The Root Beneath the Veil', text: `You stand once again beneath the Weeping Willow — but it's not the same. The ground pulses with amber light. Ahead, a child sits with her back to you, fingers pressed to the dirt, humming tones without words. Tuning. Failing. Starting again.\n\nAnd just as she finds the right pitch, the Veil tears. Through the crack you see twisted trees, lifeless; roots hanging like nooses; a sky like an unmoving grey-black mirror.` },
    { title: 'The Root Beneath the Veil', text: `The girl lifts her head. One green eye. One brown. Her lips move, but her voice doesn't come through — only the hum of your Sending Crystal, two tones overlapping now.\n\nBefore the dream fades, a glyph blazes in the earth beneath her: a bloom, split by a crack; roots curling down, not up; a small spiral. A returning.\n\nYou wake with your hand clenched. When you open it, there's nothing there. But the smell of willow sap lingers.` },
  ] }, { flag: 'dream_root' }] },
  lyra_whisper: { rest: true, if: { all: [{ quest: 'q9', done: true }, { quest: 'q10', undone: true }] }, do: [{ narrate: [{ title: 'Resonant Rest', text: `The stones beneath Stonebridge seem to hum with distant tones. Your dreams drift with fragments of old songs and places you haven't seen. A voice — familiar now — echoes just beyond the veil of sleep:\n\n"She's not alone. But the Bloom sings louder now… and its song is out of tune."` }] }] },
  dreamlight: { rest: true, near: 'spiral_glyph', r: 160, if: { quest: 'q10', active: true }, do: [{ narrate: [{ title: 'Dissonant Dreamlight', text: `The stars vanish. Ripples of light drift overhead like luminous fish beneath a black lake, and a tune of three overlapping tones plays at the edge of hearing.\n\nIn the dream, a phantom version of yourself — shadowed, flickering — sits across the fire and offers you a bargain: forget what you lost, and it will stop hurting.\n\nYou refuse. When you wake, you remember a line of the Rootsong you have never heard, sung backward.` }] }] },
  bloomwatcher: { reach: 'vale_arch', r: 30, night: true, if: { quest: 'q6', active: true }, do: [{ toast: 'At dusk, a figure watches from a distant ridge — cloaked in living vines, eyes dimly glowing. When you look again, it is gone.', kind: 'warn' }] },
  owls: { reach: 'overgrown_cairn', r: 40, night: true, if: { quest: 'q7', active: true }, do: [{ toast: 'Three pale owls follow you silently. At midnight they speak in Ember\'s voice: “Don\'t open the wrong one.”', kind: 'warn' }] },
  sb_return_cinder: { reach: 'stonebridge', r: 40, if: { quest: 'q5', stage: 'eldon' }, do: [{ toast: 'The skies are dimmer over Stonebridge, and a wind from the east carries a strange, metallic tang.', kind: '' }] },
});
