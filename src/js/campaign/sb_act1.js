// ---------------------------------------------------------------------------
// campaign/sb_act1.js — Act I: Whispers in Stonebridge.
//
// The party wakes on the road outside Stonebridge. Fate finds them with Eldon's letter; they find Eldon; Eldon gives
// them two leads (the mines of Mount Cinder, and the child Ember's sigil in Oakhaven) and the tools of the road; they
// prepare in town and Eldon sees them off at the gate. The town's people and its side stories live here too: Aric's
// lost amulet, Nico's ingredients, the Shadowed Mug's secrets, Grom's runaway apprentice.
// ---------------------------------------------------------------------------

SB.npcs = SB.npcs || {};
SB.quests = SB.quests || {};
SB.triggers = SB.triggers || {};

// ---- the people of Stonebridge ------------------------------------------------------------------------------------------
Object.assign(SB.npcs, {
  // Fate, the courier: she finds you; she is gone when you look up
  fate_sb: {
    name: 'Fate', title: 'Courier', town: 'stonebridge', post: 'plaza', seek: true, hail: 'There you are!', unlisted: true,
    if: { quest: 'q1', stage: 'fate' },
    look: SB_LOOK('human', { skin: '#e8c4a0', hair: 'wild', hairCol: '#8a5a2a', eyes: 'wide', eyeCol: '#7a6a3a', mouth: 'grin', marks: 'freckles', outfit: 'traveller', cols: ['#7a7a6a', '#3a6a3a', '#4a4a3a', '#3a2414'], hood: false, cloak: true }),
    about: 'A breathless courier in a patchy sash and wind-chapped boots. She always seems to know where you\'ll be.',
    talk: { start: 'start', nodes: {
      start: { say: 'There you are! I\'ve been looking all morning. Let\'s see here… a letter from Eldon the Wise. Must be urgent. That\'s all I\'ve got — take care.', do: [{ letter: 'eldon_letter' }, { flag: 'got_eldon_letter' }],
        opts: [
          { t: 'Who are you?', go: 'who' },
          { t: '[Insight] Something about her…', check: { skill: 'insight', dc: 10, pass: 'calm', fail: 'bye', xp: 25 } },
          { t: '[Arcana] Examine the seal before she goes', check: { skill: 'arcana', dc: 13, pass: 'seal', fail: 'bye', xp: 25 } },
          { t: 'Thank you.', go: 'bye' },
        ], bye: false },
      who: { say: 'Fate. I deliver things. Your hands only, see? (She flashes a knowing smile.)', opts: [{ t: '[Perception] Watch her go', check: { skill: 'perception', dc: 15, pass: 'prints', fail: 'bye', xp: 25 } }, { t: 'Safe roads, Fate.', go: 'bye' }], bye: false },
      calm: { say: '(She seems oddly calm. Like she knew you\'d be here.) “Don\'t look at me like that. It\'s a small town.”', opts: [{ t: 'Thank you.', go: 'bye' }], bye: false },
      seal: { say: '(The letter carries a faint magical residue. It\'s been protected — warded so only the one it\'s meant for can break the seal.) “Careful with that one.”', opts: [{ t: 'Thank you.', go: 'bye' }], bye: false },
      prints: { say: '(She spins on her heel and is gone into the crowd like mist. She didn\'t leave any footprints.)', do: [{ leave: 'fate_sb' }], opts: [{ t: '…', end: true }], bye: false },
      bye: { say: '(She spins on her heel and disappears into the crowd like mist.)', do: [{ leave: 'fate_sb' }], opts: [{ t: 'Read the letter', end: true }], bye: false },
    } },
  },

  // Eldon the Wise: an aging elf, braided silver hair, eyes faintly glowing; a tower-house by the river
  eldon: {
    name: 'Eldon the Wise', title: 'Sage', town: 'stonebridge', post: 'sage', held: 'druid_staff',
    look: SB_LOOK('elf', { skin: '#e8d0b8', hair: 'braids', hairCol: '#e8e8e8', beard: 'long', beardCol: '#d8d8d8', eyes: 'glow', eyeCol: '#8ab0ff', mouth: 'stern', outfit: 'archrobe', cols: ['#2a3a6a', '#c8b060', '#1e2a4a', '#2a1a10'], cloak: true, hat: 'none' }),
    about: 'An aging elven scholar of planar phenomena. Mentor, voice of caution on the Council, and keeper of more than he says.',
    talk: { start: [
      { if: { quest: 'q1', stage: 'find' }, node: 'first' }, { if: { quest: 'q1', stage: 'meet' }, node: 'first' },
      { if: { quest: 'q1', stage: 'prepare' }, node: 'prepared' },
      { if: { quest: 'q_flame', stage: 'report' }, node: 'flame_report' },
    ], nodes: {
      start: { say: ['The leylines hum like plucked strings stretched too tight. Ask what you will.', 'Tread carefully out there. Something watches.', 'Ah — come in. Mind the floating books.'],
        alt: [{ if: { quest: 'q13', done: true }, say: 'The Veil holds. I still can\'t quite believe it. Sit — have some tea that isn\'t humming.' }],
        opts: [
          { t: 'Tell me about the Verdant Vale.', reply: '“The Vale wasn\'t merely a place — it was a barrier. A harmonic buffer between our world and what lies beyond. The trees grew around resonance wells, shaping their roots to bind the flow. That\'s why the druids built there, and why the Whisperers still hum. Lately… they\'re growing louder.”', go: 'start' },
          { t: 'What are ley lines?', reply: '“The earth\'s bloodstream — currents of arcane potential tied to both the material and the planar layers. Resonance is how those lines vibrate when something stirs them. Think of them as harp strings. If one is plucked, the others shiver in reply.”', go: 'start' },
          { t: 'What are the sigils?', reply: '“Ancient seals, harmonic locks placed at convergence points during the Veil Wars to keep the planes from bleeding together. Each fragment is like a tuning fork, still holding part of the original resonance. Alone, they do little. Gathered… they might open the Veil again, or seal it completely.”', go: 'start', if: 'eldon_briefed' },
          { t: 'What is the Harmonic Tuner?', reply: '“A device never meant to exist in our world. Not just an instrument — a key. A conductor\'s baton tied to the root frequencies of creation. It tunes to resonance: not just magic, but people. Emotion. Memory. Pain. Lyra recovered it, or rebuilt it. She never finished learning to control it.”', go: 'start', if: 'eldon_briefed' },
          { t: 'What is the Veil?', reply: '“Not a wall. A filter — keeping us from seeing what\'s always been just beyond. Tear that filter, and echoes become action. Dreams become form. And things… start to remember their names.”', go: 'start', if: { quest: 'q2', done: true } },
          { t: 'Can I rest here?', reply: '“Of course. My spare cot is under the star charts.” (You rest the night.)', do: [{ rest: 'long' }], go: 'start' },
        ] },
      first: { say: 'You came. Good. The forest grows darker by the day… and I can\'t face it alone.', do: [{ flag: 'eldon_dir' }], opts: [{ t: 'What\'s happening to Eldenwood?', go: 'bloom' }] },
      bloom: { say: 'What you\'ve seen is only the beginning. The Shadowed Bloom is feeding on something beneath Eldenwood. My visions point to Mount Cinder. Something awoke there. The crystals the miners found — they hum in resonance with old magic.', opts: [{ t: 'Go on.', go: 'more' }] },
      more: { say: 'But there\'s more. A sigil, seen by a child named Ember, in Oakhaven. A harmonic pattern… one I\'ve not seen since the Veil Wars. I believe this is tied to the Shadowfell. The corruption is planar — it doesn\'t belong here.',
        opts: [
          { t: 'Who is Seraphina?', go: 'seraphina' },
          { t: 'What do you know of Lyra Stonehand and Nico Silverhands?', go: 'lyranico' },
          { t: 'Where do we start?', go: 'paths' },
        ] },
      seraphina: { say: 'A name I hear in the wrong places. Whispered by people who then forget they said it. I don\'t know her face. I know her hand is in this.', opts: [{ t: 'And Lyra and Nico?', go: 'lyranico' }, { t: 'Where do we start?', go: 'paths' }] },
      lyranico: { say: 'Lyra is Grom\'s apprentice at the Stalwart Smithy — half-elf, brilliant, stubborn. One green eye, one brown. She went chasing a hum in the old ruins weeks ago and hasn\'t come back. Nico keeps the Arcane Emporium. He\'s been… helpful. Very helpful.',
        opts: [{ t: '[Insight] Read his face', check: { skill: 'insight', dc: 13, pass: 'nicodoubt', fail: 'paths', xp: 25 } }, { t: 'Where do we start?', go: 'paths' }] },
      nicodoubt: { say: '(There is something guarded in how he says "helpful". He catches you noticing.) “Forgive an old man his suspicions. Nico has asked me a great many questions about the Tuner lately. That is all.”', opts: [{ t: 'Where do we start?', go: 'paths' }] },
      paths: { say: 'Both threads lead to the same tapestry… but we must choose where to start unravelling. One shows its claws. The other hides in the dark.',
        opts: [
          { t: 'The mines of Mount Cinder: the Path of Flame', do: [{ flag: 'path_flame' }], go: 'gifts' },
          { t: 'Oakhaven and the Razorwood, where Ember saw the sigil', do: [{ flag: 'path_echoes' }], go: 'gifts' },
        ], bye: false },
      gifts: { say: 'Then take these. A Protective Charm, against the worst of the corruption. My map of Eldenwood, such as it is. And this: a Sending Crystal. It is bound to the old Resonance Anchors Lyra and I set long ago. Hold it still and it will call you home to any anchor you\'ve touched — the one in our square, for a start. Whichever road you take first, you\'ll walk the other in time.',
        do: [{ give: 'protective_charm', party: true }, { letter: 'eldenwood_map' }, { give: 'sending_crystal', party: true }, { attune: 'stonebridge' }, { reveal: ['oakhaven', 'cinderfall_camp'] }, { quest: 'q2' }, { quest: 'q_flame' }, { flag: 'eldon_briefed' }],
        opts: [{ t: 'Thank you, Eldon.', reply: '“Prepare well — Grom has steel, Bartholomew supplies, Elara rumours. I\'ll see you at the gate. Tread carefully. Something watches… and it knows you\'re coming.”', end: true }], bye: false },
      prepared: { say: 'Go on — Grom will have steel, Bartholomew supplies, Elara rumours. Captain Aric looks like a man who needs help. I\'ll be at the east gate when you\'re ready to leave.', opts: [] },
      flame_report: { say: 'You went down into Cinderfall? And came back. Show me.', opts: [{ t: 'Hand him the crystal and the Herald\'s orders', if: { has: 'cinder_crystal' }, go: 'flame_crystal' }, { t: 'Tell him what you found', go: 'flame_crystal' }] },
      flame_crystal: { say: '(He turns the crystal in the light; it hums, and his chimes answer.) “Resonance-cut. Someone has been harvesting these to feed something. And this — ‘the Oakhaven child is the key’. Ember. Whatever is under that mountain, the road to it runs through the Razorwood first. Go east, to Oakhaven.”',
        do: [{ take: 'cinder_crystal' }, { flag: 'flame_reported' }, { reveal: ['oakhaven'] }], opts: [{ t: 'We\'ll go to Oakhaven.', end: true }], bye: false },
    } },
  },
  // Eldon at the gate, for the farewell
  eldon_gate: {
    name: 'Eldon the Wise', title: 'Sage', town: 'stonebridge', post: 'gate', dir: 1, held: 'druid_staff', unlisted: true,
    if: { quest: 'q1', stage: 'prepare' },
    look: SB_LOOK('elf', { skin: '#e8d0b8', hair: 'braids', hairCol: '#e8e8e8', beard: 'long', beardCol: '#d8d8d8', eyes: 'glow', eyeCol: '#8ab0ff', mouth: 'stern', outfit: 'archrobe', cols: ['#2a3a6a', '#c8b060', '#1e2a4a', '#2a1a10'], cloak: true }),
    talk: { start: 'start', nodes: {
      start: { say: 'Stonebridge may be the last light you see for a while…', opts: [{ t: 'We\'re ready.', do: [{ narrate: [
        { title: 'The Departure', text: `"Beyond these gates lies a world unraveling. The songs of balance — between nature and arcana, between flesh and spirit — they've begun to twist. I've heard the leylines hum like plucked strings stretched too tight.\n\nWhichever path you follow — be it flame in the mountains, shadow in the trees, or whispers in the mire — you walk not just toward danger… but into stories already being written by hands not your own."` },
        { title: 'The Departure', text: `"The Bloom is not a sickness. It is a signal. A blooming of something ancient… something that remembers what the world once was, and what it could become again — if we fail.\n\nIf you hear whispers that sound like music… run. Do not answer. Do not follow. The Tuner sings to those it wishes to claim. But if you hear silence — true silence — know that the Veil is thinning."` },
        { title: 'The Departure', text: `He places a hand on your shoulder.\n\n"May whatever light you carry be enough to hold the dark at bay. And should the bloom reach you… make sure it's the last thing it touches."\n\nBehind you, the gates of Stonebridge creak shut. Before you lies open road. Whatever awaits, your journey has begun.` },
      ], title: 'The Departure' }, { flag: 'departed' }, { leave: 'eldon_gate' }], end: true }, { t: 'Not yet.', end: true }], bye: false },
    } },
  },

  elara: {
    name: 'Elara Hearthwood', title: 'Innkeeper of the Gilded Griffin', town: 'stonebridge', post: 'hall',
    look: SB_LOOK('human', { skin: '#f0d0b0', hair: 'tail', hairCol: '#c84a1a', eyes: 'round', eyeCol: '#3a7a4a', mouth: 'smile', marks: 'blush', outfit: 'peasant', cols: ['#7a3a2a', '#e8e0c8', '#4a3a2a', '#3a2414'] }),
    about: 'Warm but sharp keeper of the Gilded Griffin. Full of rumours, and keeps a close eye on strange travellers.',
    wares: [['rations', 4, 1, 0], ['bread', 3, 1, 0], ['cooked_beef', 2, 1, 0], ['honey_bottle', 1, 1, 0], ['lute', 1, 9, 0], ['candle', 4, 1, 0]],
    talk: { start: 'start', nodes: {
      start: { say: ['Welcome to the Gilded Griffin! Warm beds, warmer stew, and the best gossip this side of the river.', 'Sit, sit. You look like the road chewed on you.', 'Back again? Good. Nobody tells a story like folk who\'ve been somewhere.'],
        alt: [
          { if: { quest: 'q13', done: true }, say: 'A round on the house — for all of you, forever, probably. Don\'t tell my accountant.' },
          { if: { quest: 'q12', done: true }, say: 'So… the lake really was holding something back. My grandmother used to say Stillwater was named for what it hid, not what it showed.' },
          { if: { quest: 'q8', done: true }, say: 'You\'ve brought something back with you. I can smell it. Old sorrow. Sit by the fire.' },
          { if: { quest: 'q6', done: true }, say: 'Food and a room are on the house, as long as you\'re chasing the girl and the music.' },
        ],
        opts: [
          { t: 'Do you know where Eldon the Wise lives?', if: { quest: 'q1', stage: 'find' }, reply: '“Eldon? His tower-house is down by the river, at the edge of town. Ivy on the walls, chimes under the eaves that sound like whispering reeds. Tell him Elara says he still owes me for the wine.”', do: [{ flag: 'eldon_dir' }], go: 'start' },
          { t: 'Any rumours?', go: 'rumour' },
          { t: 'Let me see what you\'re serving.', shop: true },
          { t: 'Take a room for the night (1 gold)', if: { has: 'gold_coin' }, do: [{ take: 'gold_coin', n: 1 }, { rest: 'long' }], reply: '“Top of the stairs, second door. Sleep well.” (A night in the Griffin: a long rest.)', end: true },
          { t: 'A room, on the house?', if: { quest: 'q6', done: true }, do: [{ rest: 'long' }], reply: '“Top of the stairs. Sleep well, hero.”', end: true },
          { t: 'Tell me about the Shadowed Mug.', if: { quest: 'sq_mug', notStarted: true }, go: 'mug' },
          { t: 'About Kael\'s tavern…', if: { quest: 'sq_mug', stage: 'report' }, go: 'mug_done' },
        ] },
      rumour: { say: [
        '“Grom\'s apprentice Lyra vanished chasing some ancient noise… claimed something was calling her from Old Greystone.”',
        '“Some miners whisper about a device that ‘tunes’ the world. Harmonic… something. Sounds like fantasy.”',
        '“That poor girl Ember, out in Oakhaven — she said she saw shadows moving with purpose in the Razorwood. Drew a sigil in ash. Eldon nearly fainted when he saw it.”',
        '“They\'re recruiting in the Marshes. Offering food and ‘a place to belong’.”',
        '“Captain Aric\'s been quiet. Lost something personal — something he\'s not ready to talk about.”',
        '“Lanterns drifting in Eldenwood — people follow them and vanish.”',
      ], alt: [
        { if: { quest: 'q4', done: true }, say: ['“A merchant saw lights flicker atop Mount Cinder.”', '“Grom says Lyra headed east, toward the Verdant Vale.”', '“Someone\'s been stealing from the shrine again.”', '“Fisherfolk near the southern cliffs say the sea sings at dawn.”'] },
        { if: { quest: 'q9', done: true }, say: ['“The owls have been flying strange loops again… always south.”', '“The Scribe\'s Quill claims the ink in old journals is singing. Not joking.”', '“Captain Aric found new sigils marked outside the old watchtower.”'] },
      ], opts: [{ t: 'Another?', go: 'rumour' }] },
      mug: { say: 'Kael Dorne\'s place, across the square. A quiet crowd. Too quiet. Folk go in and come out… not quite themselves. And I\'ve seen crates go in the back that never come out the front. If you\'ve a mind to look into it, I\'d be grateful. Quietly.', opts: [{ t: 'I\'ll look into it.', do: [{ quest: 'sq_mug' }], end: true }, { t: 'Not now.', go: 'start' }] },
      mug_done: { say: 'A cellar? Maps? Gods. Take it to Captain Aric, before Kael knows what you\'ve seen.', opts: [] },
    } },
  },
  thorin: {
    name: 'Thorin Stoneshield', title: 'Cook at the Gilded Griffin', town: 'stonebridge', post: 'hall', bpos: [2, 6],
    look: SB_LOOK('dwarf', { body: 'broad', skin: '#d8a888', hair: 'crop', hairCol: '#6a4020', beard: 'braided', eyes: 'narrow', eyeCol: '#6a4a2a', mouth: 'grin', outfit: 'peasant', cols: ['#e8e0d0', '#8a5a3a', '#5a4a3a', '#3a2414'] }),
    about: 'Elara\'s cook. Built like a barrel, sings while he stirs.',
    wares: [['cooked_beef', 3, 1, 0], ['bread', 4, 1, 0], ['pumpkin_pie', 2, 1, 0], ['rations', 6, 1, 0]],
    talk: { start: 'start', nodes: { start: { say: ['Stew\'s on. Stew is always on.', 'Mind the pot, it bites.', 'You eat before you go out there. That\'s an order.'], opts: [{ t: 'What\'s cooking?', shop: true }] } } },
  },
  pip: {
    name: 'Pip', title: 'A Local Boy', town: 'stonebridge', post: [2, 7], unlisted: true,
    look: SB_LOOK('halfling', { skin: '#f0c8a0', hair: 'curly', hairCol: '#4a2c18', eyes: 'wide', eyeCol: '#3a5ab0', mouth: 'grin', marks: 'freckles', outfit: 'peasant', cols: ['#8a6a4a', '#5a7a5a', '#5a4a3a', '#3a2a1a'] }),
    talk: { start: 'start', nodes: {
      start: { say: ['Oi! You lost? I know everyone. Everyone.', 'Wanna race to the bridge? I\'ll win.'],
        opts: [
          { t: 'Do you know where Eldon the Wise lives?', if: { quest: 'q1', stage: 'find' }, go: 'eldon' },
          { t: 'Seen anything strange?', reply: '“The bells don\'t ring right at dusk anymore. Like they\'re a bit… flat. And Mister Kael gave me a sweet that tasted like copper. I spat it out.”', go: 'start' },
        ] },
      eldon: { say: 'The old elf with the floaty books? Course I do. I\'ll tell you for a coin.', opts: [
        { t: 'Here\'s a coin (1 gold)', if: { has: 'gold_coin' }, do: [{ take: 'gold_coin', n: 1 }, { flag: 'eldon_dir' }], reply: '“Down by the river, edge of town! Ivy, chimes, runes on the door. Don\'t touch the runes, they tingle.”', end: true },
        { t: '[Persuasion] For free?', check: { skill: 'persuasion', dc: 10, pass: 'free', fail: 'nope' } },
      ], bye: false },
      free: { say: '“…Fine. Down by the river, edge of town. Ivy, chimes. You owe me one.”', do: [{ flag: 'eldon_dir' }], opts: [] },
      nope: { say: '“Nothing\'s free, mister. Ask Elara, she talks for nothing.”', opts: [] },
    } },
  },
  kael: {
    name: 'Kael Dorne', title: 'Keeper of the Shadowed Mug', town: 'stonebridge', post: 'tavern', until: 'mug_raided',
    look: SB_LOOK('human', { skin: '#d8b090', hair: 'short', hairCol: '#141414', beard: 'stubble', eyes: 'narrow', eyeCol: '#2a2a2a', mouth: 'plain', outfit: 'shadow', cols: ['#2a2a32', '#6a2a3a', '#1e1e24', '#141418'] }),
    about: 'Smooth and tight-lipped keeper of the Shadowed Mug. Quiet ties to cultists, if the whispers are true.',
    wares: [['rations', 4, 1, 0], ['bread', 2, 1, 0], ['candle', 4, 1, 0]],
    talk: { start: 'start', nodes: {
      start: { say: ['Drink? Sit. Don\'t stare.', 'The Mug keeps its own counsel. So should you.', 'Strangers. How… refreshing.'],
        opts: [
          { t: 'What\'s on the menu?', shop: true },
          { t: 'Heard any news?', go: 'rumour' },
          { t: '[Insight] Watch the room while he talks', if: { quest: 'sq_mug', active: true }, check: { skill: 'insight', dc: 13, pass: 'hatch', fail: 'nothing', xp: 50 } },
        ] },
      rumour: { say: [
        '“The cult doesn\'t worship the Bloom. They feed it.” (He says it like a joke. Nobody laughs.)',
        '“There\'s a vault beneath Old Greystone. Sealed by resonance — whatever that means.”',
        '“The Bloom isn\'t coming from the woods. It\'s already underneath us.”',
        '“Townies vanish. Ask too many questions? You\'re next.” (He smiles.) “Just a saying.”',
        '“The scouts weren\'t killed. They were turned.”',
        '“There\'s a creature that walks the rooftops. Tall. Smells like iron.”',
      ], opts: [{ t: 'Another?', go: 'rumour' }] },
      hatch: { say: '(As he talks, his eyes keep flicking to the back of the room — to a stack of barrels by the far wall, and the boards beneath them, which are newer than the rest. Someone comes up from behind the barrels, dusting off their knees, and Kael\'s smile does not move at all.)', do: [{ flag: 'mug_hatch_seen' }], opts: [{ t: 'Nice place.', end: true }], bye: false },
      nothing: { say: '(He talks about the weather, the river, the price of barley. Nothing. Exactly nothing, perfectly.)', opts: [] },
    } },
  },
  jonric: {
    name: 'Jonric Vane', title: 'Barkeep of the Shadowed Mug', town: 'stonebridge', post: 'tavern', bpos: [6, 5], until: 'mug_raided',
    look: SB_LOOK('human', { skin: '#c8a080', hair: 'sides', hairCol: '#3a2a1a', beard: 'short', eyes: 'round', eyeCol: '#6a4a2a', mouth: 'stern', outfit: 'peasant', cols: ['#4a3a32', '#2a2a2a', '#3a3a32', '#1a1a14'] }),
    about: 'The Shadowed Mug\'s barkeep. Hears everything and repeats a carefully chosen fraction of it.',
    talk: { start: 'start', nodes: { start: { say: ['What\'ll it be.', 'Kael don\'t like questions.', 'Drink or leave, friend.'], opts: [{ t: '[Persuasion] A coin for a word?', if: { quest: 'sq_mug', active: true }, check: { skill: 'persuasion', dc: 14, pass: 'word', fail: 'no' } }] },
      word: { say: '(He leans in.) “Crates go down the back hatch at night. Black seeds, smells like copper. A woman comes sometimes — pale, polite, never leaves footprints in the sawdust. Kael calls her the Mistress. You didn\'t hear it from me.”', do: [{ flag: 'mug_hatch_seen' }], opts: [] },
      no: { say: '“I pour drinks. That\'s all I do.”', opts: [] } } },
  },
  mug_cellar: {
    name: 'Barrels by the Back Wall', title: 'The Shadowed Mug', town: 'stonebridge', post: 'tavern', bpos: [6, 6], prop: 'barrel', glyph: '⛁', until: 'mug_secrets',
    talk: { start: 'start', nodes: {
      start: { say: 'A stack of barrels by the back wall. The boards beneath them are newer than the rest of the floor.',
        opts: [
          { t: 'Shift the barrels aside (you know what to look for)', if: 'mug_hatch_seen', go: 'down' },
          { t: '[Perception] Look closer', check: { skill: 'perception', dc: 15, pass: 'down', fail: 'nothing' } },
          { t: 'Leave them be.', end: true },
        ], bye: false },
      nothing: { say: 'Just barrels. Probably.', opts: [] },
      down: { say: 'Under the barrels, a hatch. You slip down into a low cellar: crates of black seeds, a table of candles, and papers weighted with a skull. Maps marked with veils and bloom symbols. You take what you can and climb back up before anyone notices.',
        do: [{ letter: 'seraphina_notes' }, { letter: 'seraphina_map' }, { flag: 'mug_secrets' }, { give: 'shadowchoked_seeds', n: 3 }], opts: [{ t: 'Get out quietly.', end: true }], bye: false },
    } },
  },
  bartholomew: {
    name: 'Bartholomew', title: 'Merchant', town: 'stonebridge', post: 'store#0',
    look: SB_LOOK('human', { body: 'broad', skin: '#e0b896', hair: 'bald', hairCol: '#9a9a9a', beard: 'moustache', beardCol: '#9a9a9a', eyes: 'narrow', eyeCol: '#5a8ab0', mouth: 'smile', outfit: 'traveller', cols: ['#6a5a3a', '#8a3a2a', '#4a4a3a', '#3a2414'] }),
    about: 'Dry-humoured, watchful, hears everything. Goods for sale, rumours for free.',
    wares: [['torch', 8, 1, 0], ['rope', 1, 1, 0], ['rations', 5, 1, 0], ['healers_kit', 1, 2, 0], ['explorers_pack', 1, 3, 0], ['dungeoneers_pack', 1, 3, 0], ['potion_healing', 1, 12, 0], ['lantern', 1, 2, 0], ['bed', 1, 2, 0], ['arrow', 16, 1, 0], ['thieves_tools', 1, 6, 0]],
    buys: [['planar_blood', 1, 3, 0], ['sigil_shard', 1, 2, 0], ['harmonic_dust', 4, 1, 0], ['glassfeather', 1, 3, 0], ['veil_bone', 1, 5, 0], ['verdant_heartwood', 1, 8, 0], ['resonant_pollen', 4, 1, 0]],
    talk: { start: 'start', nodes: { start: { say: ['Goods for sale, rumours for free.', 'Buying, selling, or just warming your hands?'],
      alt: [{ if: { quest: 'q8', done: true }, say: 'Got something new in: Weeping Willow sap, and charms that keep the Veil out of your dreams. Don\'t ask how I get it.' }],
      opts: [{ t: 'Show me your goods.', shop: true }, { t: 'Any news?', reply: '“I\'ve sold more oil and fire powder this week than I have all year. People are preparing to burn things. Or someone.”', go: 'start' }] } } },
  },
  nico: {
    name: 'Nico Silverhands', title: 'Arcane Emporium', town: 'stonebridge', post: 'library#0', until: 'nico_gone',
    look: SB_LOOK('gnome', { skin: '#f0d0b0', hair: 'wild', hairCol: '#d8d8e8', beard: 'moustache', beardCol: '#d8d8e8', eyes: 'wide', eyeCol: '#a060e0', mouth: 'grin', outfit: 'silks', cols: ['#5a3a8a', '#d0c0e8', '#3a2a4a', '#2a1a10'], hat: 'feather', nose: true }),
    about: 'A flamboyant, arcane-minded alchemist. Potions, scrolls, magical reagents, tuning trinkets. Outwardly very helpful.',
    wares: [['potion_healing', 1, 12, 0], ['potion_greater_healing', 1, 30, 0], ['arcane_focus', 1, 3, 0], ['spellbook', 1, 12, 0], ['resonance_sensor', 1, 8, 0], ['holy_symbol', 1, 2, 0], ['paper', 8, 1, 0]],
    buys: [['planar_blood', 1, 4, 0], ['sigil_shard', 1, 3, 0], ['harmonic_dust', 4, 1, 0], ['shadowchoked_seeds', 2, 1, 0]],
    talk: { start: 'start', nodes: {
      start: { say: ['Welcome, welcome! Mind the bubbling one, it\'s moody.', 'Ah, adventurers! The aether brightens!', 'Looking for something that glows? Everything here glows.'],
        opts: [
          { t: 'Do you know where Eldon the Wise lives?', if: { quest: 'q1', stage: 'find' }, reply: '“Eldon? He\'s been quiet lately, but likely still in his tower-house near the river. Tell him Nico asks after the… well. He\'ll know.”', do: [{ flag: 'eldon_dir' }], go: 'start' },
          { t: 'Show me your wares.', shop: true },
          { t: 'Anything strange in the aether?', reply: '“There\'s a low hum under the town. My arcane readings are spiking. The magical field here is shifting — like something underneath is… tuning up.”', go: 'start' },
          { t: 'Is there a way to fight the corruption?', if: { quest: 'sq_nico', notStarted: true }, go: 'brew' },
          { t: 'About those ingredients…', if: { quest: 'sq_nico', active: true }, go: 'ingredients' },
        ] },
      brew: { say: 'There\'s a brew I can make… something that resists planar bleed. But I need three rare components — ones I can\'t collect alone. Dragon\'s Blood, from the volcanic cliffs, preferably still warm. Phoenix Feathers, from a nesting ground north of Eldenwood — careful, they don\'t like visitors. And Mandrake Root. Real mandrake. Screaming, soul-sucking, Shadowfell-touched.',
        opts: [{ t: 'I\'ll gather them.', do: [{ quest: 'sq_nico' }, { reveal: ['skyreach_roost', 'drake_scar', 'mandrake_glen'] }], reply: '“Bring me these, and I\'ll make something that fights the Bloom itself. Maybe even stops it.”', end: true }, { t: '[Insight] Why can\'t you go yourself?', check: { skill: 'insight', dc: 15, pass: 'nicotell', fail: 'brew2' } }] },
      nicotell: { say: '(For a heartbeat his smile slips. He is frightened — of what, you can\'t tell — and he covers it with a flourish.) “Me? In the woods? Ha! I\'d last a minute. You, though… you have that look.”', opts: [{ t: 'I\'ll gather them.', do: [{ quest: 'sq_nico' }, { reveal: ['skyreach_roost', 'drake_scar', 'mandrake_glen'] }], end: true }, { t: 'Maybe later.', end: true }] },
      brew2: { say: '“Hands like these were made for stirring, not climbing volcanoes!” (He wiggles his fingers.)', opts: [{ t: 'I\'ll gather them.', do: [{ quest: 'sq_nico' }, { reveal: ['skyreach_roost', 'drake_scar', 'mandrake_glen'] }], end: true }] },
      ingredients: { say: 'Do you have them? All three?', opts: [
        { t: 'Hand over the Dragon\'s Blood, Phoenix Feathers and Mandrake Root', if: { all: [{ has: 'dragons_blood' }, { has: 'phoenix_feather' }, { has: 'mandrake_root' }] },
          do: [{ take: 'dragons_blood' }, { take: 'phoenix_feather' }, { take: 'mandrake_root' }, { flag: 'gave_ingredients' }, { complete: 'sq_nico' }], reply: '“Perfect. Perfect! It\'ll take time to brew it right. Come back when the moon turns.” (His hands are shaking as he takes them.)', end: true },
        { t: 'Not yet.', end: true },
      ] },
    } },
  },
  grom: {
    name: 'Grom Ironstout', title: 'Blacksmith of the Stalwart Smithy', town: 'stonebridge', post: 'smithy',
    look: SB_LOOK('dwarf', { body: 'broad', skin: '#c8906a', hair: 'bald', hairCol: '#5a3a1a', beard: 'braided', beardCol: '#5a3a1a', eyes: 'narrow', eyeCol: '#5a4a2a', mouth: 'stern', marks: 'scar', outfit: 'furs', cols: ['#5a3a2a', '#3a2a1a', '#4a3424', '#2a1a10'] }),
    about: 'Gruff dwarven blacksmith, traditional, protective of his past. Lyra Stonehand was his apprentice.',
    wares: [['dagger', 1, 1, 0], ['handaxe', 1, 2, 0], ['mace', 1, 2, 0], ['spear', 1, 1, 0], ['shortsword', 1, 3, 0], ['scimitar', 1, 6, 0], ['rapier', 1, 6, 0], ['longsword', 1, 4, 0], ['battleaxe', 1, 3, 0], ['warhammer', 1, 4, 0], ['greataxe', 1, 8, 0], ['greatsword', 1, 12, 0], ['shield', 1, 3, 0],
      ['studded_chestplate', 1, 6, 0], ['chainshirt_chestplate', 1, 6, 0], ['scale_chestplate', 1, 8, 0], ['chain_chestplate', 1, 10, 0], ['chain_helmet', 1, 4, 0], ['chain_leggings', 1, 6, 0], ['chain_boots', 1, 3, 0], ['plate_chestplate', 1, 30, 0],
      ['silvered_dagger', 1, 8, 0], ['silvered_shortsword', 1, 10, 0], ['silvered_longsword', 1, 12, 0], ['silvered_battleaxe', 1, 12, 0]],
    buys: [['verdant_heartwood', 1, 10, 0], ['veil_bone', 1, 6, 0]],
    talk: { start: 'start', nodes: {
      start: { say: ['Steel or stories? I sell one of them.', 'Mind the forge. It bites harder than I do.', 'Hmph. Adventurers.'],
        alt: [{ if: { quest: 'q13', done: true }, say: 'Lyra\'s back at the anvil. Burned my good apron already. Best day I\'ve had in years.' }, { if: { quest: 'q8', done: true }, say: 'That stone you\'re carrying\'s got a hum I don\'t like. Sounds like something… remembering too loud.' }, { if: { quest: 'q6', done: true }, say: 'There\'s something under the stone of this town. I hear it at night.' }],
        opts: [
          { t: 'Show me your steel.', shop: true },
          { t: 'Silvered weapons?', reply: '“Silver bites what shadow touches. I\'ve a few on the rack — dagger, shortsword, longsword, battleaxe. Not cheap. Neither is a funeral.”', go: 'start' },
          { t: 'Tell me about your apprentice.', if: { quest: 'sq_grom', notStarted: true }, go: 'lyra' },
          { t: 'About Lyra…', if: { quest: 'sq_grom', active: true }, go: 'lyra_news' },
          { t: 'I have something from the Cindermelt Horror\'s heart. (Volcanic Resonance Ore)', if: { has: 'volcanic_ore' }, go: 'forge' },
        ] },
      lyra: { say: 'My apprentice Lyra disappeared weeks ago. Heard something calling from the ruins. Said it hummed. Like it was alive… She took my rune-etched forging hammer and a set of precision chisels. I don\'t care about the tools. Much. If you find her, bring word.', opts: [{ t: 'I\'ll look for her.', do: [{ quest: 'sq_grom' }], end: true }] },
      lyra_news: { say: 'Well? Anything?', opts: [
        { t: 'Hand him Lyra\'s chisels and his hammer', if: { all: [{ has: 'lyra_chisels' }, { has: 'rune_hammer' }] }, do: [{ take: 'lyra_chisels' }, { take: 'rune_hammer' }, { complete: 'sq_grom' }], go: 'tools' },
        { t: 'She was at Greystone, and she\'s still following the song.', if: 'lyra_word', reply: '“Stubborn girl. She always did follow a sound until it ended. Find her tools, at least — she\'d never leave them unless she meant to come back for them.”', go: 'start' },
        { t: 'Nothing yet.', end: true },
      ] },
      tools: { say: '(He turns the hammer over, thumb on the runes, and doesn\'t say anything for a long time.) “She left them behind. That means she meant to come back for them.” (He clears his throat, hard.) “Here. Take your pick of the silvered rack. No — I insist.”', opts: [
        { t: 'The silvered longsword', do: [{ give: 'silvered_longsword' }], end: true }, { t: 'The silvered battleaxe', do: [{ give: 'silvered_battleaxe' }], end: true }, { t: 'The silvered shortsword', do: [{ give: 'silvered_shortsword' }], end: true }, { t: 'The silvered dagger', do: [{ give: 'silvered_dagger' }], end: true },
      ], bye: false },
      forge: { say: '(He hefts the ore. It\'s warm, and it rings faintly when he taps it.) “That\'s resonance ore, that is. I can forge you something that sings when it strikes. Fifty gold for the work, and the ore.”', opts: [
        { t: 'A longsword (50 gold)', if: { has: 'gold_coin', n: 50 }, do: [{ take: 'volcanic_ore' }, { take: 'gold_coin', n: 50 }, { give: 'resonant_blade' }], reply: '“Listen to her ring.”', end: true },
        { t: 'A battleaxe (50 gold)', if: { has: 'gold_coin', n: 50 }, do: [{ take: 'volcanic_ore' }, { take: 'gold_coin', n: 50 }, { give: 'resonant_axe' }], reply: '“Listen to her ring.”', end: true },
        { t: 'A rapier (50 gold)', if: { has: 'gold_coin', n: 50 }, do: [{ take: 'volcanic_ore' }, { take: 'gold_coin', n: 50 }, { give: 'resonant_rapier' }], reply: '“Light as a song.”', end: true },
        { t: 'A focus for spellcasting (50 gold)', if: { has: 'gold_coin', n: 50 }, do: [{ take: 'volcanic_ore' }, { take: 'gold_coin', n: 50 }, { give: 'resonant_focus' }], reply: '“Not my usual work. It hums when you think hard near it.”', end: true },
        { t: 'Not now.', end: true },
      ], bye: false },
    } },
  },
  aric: {
    name: 'Captain Aric Vellor', title: 'Commander of the Watch', town: 'stonebridge', post: 'tower', held: 'longsword',
    look: SB_LOOK('human', { body: 'broad', skin: '#d8b090', hair: 'crop', hairCol: '#2a1a10', beard: 'short', eyes: 'narrow', eyeCol: '#3a5ab0', mouth: 'stern', marks: 'scar', outfit: 'surcoat', cols: ['#c8c8d0', '#3a5a9a', '#6a6a74', '#3a3a44'] }),
    about: 'Head of the town guard, proud and lawful, tired and emotionally stretched. His father served in the last Bloomlight breach.',
    talk: { start: 'start', nodes: {
      start: { say: ['Stay out of trouble and we\'ll get along.', 'Patrol maps, missing scout reports, and no sleep. What do you need?', 'Make it quick.'],
        alt: [{ if: { quest: 'sq_aric', done: true }, say: 'You. Good. The watch owes you, and so do I.' }],
        opts: [
          { t: 'Any news from the roads?', reply: '“Three of my scouts disappeared near Razorwood. The one who made it back wouldn\'t speak. Just scribbled circles in the dirt.”', go: 'start' },
          { t: 'You look like you\'ve lost something.', if: { quest: 'sq_aric', notStarted: true }, go: 'trust' },
          { t: 'About your amulet…', if: { quest: 'sq_aric', active: true }, go: 'amulet' },
          { t: 'I found something in the Shadowed Mug\'s cellar.', if: { all: ['mug_secrets', { quest: 'sq_mug', active: true }] }, go: 'mug' },
        ] },
      trust: { say: 'Lost something? (He looks at you for a long moment.)', opts: [
        { t: '[Persuasion] We can help, Captain. Let us.', check: { skill: 'persuasion', dc: 13, pass: 'amulet_ask', fail: 'brush' } },
        { t: '[Insight] It\'s personal, isn\'t it?', check: { skill: 'insight', dc: 13, pass: 'amulet_ask', fail: 'brush' } },
      ], bye: false },
      brush: { say: '“My troubles are my own. The town\'s are yours, if you want them.”', opts: [] },
      amulet_ask: { say: 'I lost something… during the last patrol. A family amulet. Silver ringed, Stonebridge crest, a red stone my grandmother set. Bandits jumped us in the eastern hills past the Razorwood. If you find it… I\'d be grateful.', opts: [{ t: 'We\'ll find it.', do: [{ quest: 'sq_aric' }, { reveal: ['bandit_camp'] }], end: true }] },
      amulet: { say: 'Any sign of it?', opts: [
        { t: 'Give him the amulet', if: { has: 'aric_amulet' }, do: [{ take: 'aric_amulet' }, { complete: 'sq_aric' }], go: 'thanks' },
        { t: 'Not yet.', end: true },
      ] },
      thanks: { say: '(He closes his fist around it, and for a moment the captain is gone and there\'s just a tired man.) “My father wore this through the Bloomlight. Thank you. And that journal you found on the bandit — show it to Eldon. If they\'re tied to a cult, this is bigger than bandits.”', opts: [] },
      mug: { say: 'Maps of ritual sites? Seeds? In Kael\'s cellar, under my nose. (His jaw sets.) We\'ll raid it tonight. Quietly. Thank you.', do: [{ complete: 'sq_mug' }], opts: [] },
    } },
  },
  etta: {
    name: 'Etta Narlane', title: 'High Scribe of the Scribe\'s Quill', town: 'stonebridge', post: 'library#1',
    look: SB_LOOK('human', { skin: '#e8c8a8', hair: 'bun', hairCol: '#9a9a9a', eyes: 'round', eyeCol: '#5a8ab0', mouth: 'plain', outfit: 'vestments', cols: ['#4a5a8a', '#d0c090', '#3a3a4a', '#2a1a10'] }),
    about: 'High Scribe of the Scribe\'s Quill. Vague knowledge of the Harmonic Tuner and very definite opinions about ink.',
    wares: [['paper', 8, 1, 0], ['book', 1, 1, 0], ['spellbook', 1, 12, 0], ['scholars_pack', 1, 3, 0]],
    talk: { start: 'start', nodes: { start: { say: ['Quiet, please. The books are listening.', 'Lore, copying, research. Do not lick the parchment.'],
      alt: [{ if: { quest: 'q9', done: true }, say: 'A new tome on the shelf began resonating the moment you returned. Blank pages, humming. As if it was waiting.' }, { if: { quest: 'q6', done: true }, say: 'Elders speak of ghost harmonics heard on the riverbank at night. And one of our books pulses when that bark of yours comes near.' }],
      opts: [{ t: 'What do you know about the Harmonic Tuner?', reply: '“Old texts call it a ‘conductor of the root frequencies’. Some say it was born, not built — in a forge of crystal under a mountain. Most of those texts were burned after the Veil Wars. The rest, Eldon keeps.”', go: 'start' }, { t: 'Browse your shelves.', shop: true }] } } },
  },
  greenleaf: {
    name: 'Marigold Greenleaf', title: 'Greenleaf Remedies', town: 'stonebridge', post: 'store#1',
    look: SB_LOOK('halfling', { skin: '#e8c0a0', hair: 'long', hairCol: '#d8b060', eyes: 'round', eyeCol: '#3a7a4a', mouth: 'smile', outfit: 'leafrobe', cols: ['#5a8a3a', '#a07a4a', '#3a4a22', '#4a3424'], hat: 'circlet' }),
    about: 'Herbalist of Greenleaf Remedies: poultices, salves and odd charms.',
    wares: [['poultice', 2, 6, 0], ['potion_healing', 1, 12, 0], ['healers_kit', 1, 2, 0], ['herbalism_kit', 1, 3, 0], ['harmonic_dust', 2, 2, 0]],
    buys: [['resonant_pollen', 2, 1, 0], ['deadroot_resin', 1, 3, 0], ['mandrake_root', 1, 10, 0]],
    talk: { start: 'start', nodes: { start: { say: ['Anti-corruption poultices, fresh this morning!', 'Smell that? Sage and moonroot. Good for what ails you.'],
      alt: [{ if: { quest: 'q8', done: true }, say: 'I\'ve started brewing sorrow salves from Willow sap. Strong stuff.' }],
      opts: [{ t: 'Show me your remedies.', shop: true }, { t: 'Sorrow salves?', if: { quest: 'q8', done: true }, do: [{ give: 'sorrow_salve', n: 2 }], once: true, reply: '“Here, take two. For what you\'ve been carrying.”', go: 'start' }] } } },
  },
  elion: {
    name: 'Elion Varrastel', title: 'Bookseller & Mapmaker', town: 'stonebridge', post: 'house_m#1',
    look: SB_LOOK('elf', { skin: '#f0d8c0', hair: 'long', hairCol: '#141414', eyes: 'narrow', eyeCol: '#3a7a4a', mouth: 'plain', outfit: 'noble', cols: ['#3a5a4a', '#c8a040', '#2a2a3a', '#1a1a1a'] }),
    about: 'Sells books, maps and local lore. For a price, he\'ll mark your map.',
    talk: { start: 'start', nodes: { start: { say: ['Maps! Lore! Maps of lore!', 'Every road out of Stonebridge, inked and true. Mostly true.'],
      opts: [
        { t: 'A map of the eastern roads (5 gold)', if: { has: 'gold_coin', n: 5 }, once: true, do: [{ take: 'gold_coin', n: 5 }, { reveal: ['oakhaven', 'razorwood', 'oak_circle', 'vale_arch'] }], reply: '“Oakhaven, the Razorwood, the old arch on the Vale road. Don\'t go into the Razorwood at night.”', go: 'start' },
        { t: 'A map of the northern hills (5 gold)', if: { has: 'gold_coin', n: 5 }, once: true, do: [{ take: 'gold_coin', n: 5 }, { reveal: ['greystone', 'skyreach_roost', 'cinderfall_camp', 'thornmere'] }], reply: '“Greystone, Skyreach, Cinderfall, and Thornmere in its fogs. Mind the cliffs.”', go: 'start' },
        { t: 'A map of the south and west (5 gold)', if: { has: 'gold_coin', n: 5 }, once: true, do: [{ take: 'gold_coin', n: 5 }, { reveal: ['marsh_ruin', 'echo_circle', 'stillwater'] }], reply: '“The Marshes, the old druid circle, and Stillwater — though nobody\'s heard from Stillwater in months.”', go: 'start' },
      ] } } },
  },
  velthra: {
    name: 'Velthra Duskgild', title: 'Pawnbroker', town: 'stonebridge', post: 'house_s#1',
    look: SB_LOOK('tiefling', { skin: '#a05a6a', hair: 'long', hairCol: '#2a1a3a', eyes: 'glow', eyeCol: '#c8a020', mouth: 'grin', horns: 'curled', outfit: 'noble', cols: ['#4a1a3a', '#c8a040', '#2a1a2a', '#1a1a1a'], tail: true }),
    about: 'Sells and loans goods. Asks no questions; prices accordingly.',
    wares: [['potion_healing', 1, 13, 0], ['thieves_tools', 1, 6, 0], ['signet_ring', 1, 8, 0]],
    buys: [['planar_blood', 1, 4, 0], ['sigil_shard', 1, 3, 0], ['shadowchoked_seeds', 2, 2, 0], ['glassfeather', 1, 4, 0], ['veil_bone', 1, 6, 0], ['bloomcore_petal', 1, 6, 0], ['harmonic_dust', 4, 2, 0], ['deadroot_resin', 1, 3, 0]],
    talk: { start: 'start', nodes: { start: { say: ['Everything has a price, darling. Even curiosities.', 'Buying or selling? I do both. I do it well.'], opts: [{ t: 'Let\'s trade.', shop: true }] } } },
  },
});

// ---- Act I: the quest line ------------------------------------------------------------------------------------------------
Object.assign(SB.quests, {
  q1: { title: 'Whispers in Stonebridge', main: true, order: 0, summary: 'A letter from Eldon the Wise, and a town that trembles at the edge of Eldenwood.',
    stages: {
      fate: { goal: 'Find your bearings in Stonebridge', text: 'You woke on the road outside the palisade with no memory of how you got there. Walk into town. Someone is looking for you.', obj: { flag: 'got_eldon_letter' }, at: 'stonebridge', next: 'read' },
      read: { goal: 'Read the letter from Eldon the Wise', hint: 'Use the letter in your hands, or open your journal (J) and look under Letters.', obj: { read: 'eldon_letter' }, next: 'find' },
      find: { goal: 'Find Eldon the Wise\'s residence in Stonebridge', text: 'Ask around: Elara at the Gilded Griffin, Nico at his Arcane Emporium, or a local boy by the fountain might know the way.', obj: { flag: 'eldon_dir' }, at: 'stonebridge', next: 'meet' },
      meet: { goal: 'Speak with Eldon the Wise at his tower-house by the river', obj: { flag: 'eldon_briefed' }, at: 'eldon', next: 'prepare' },
      prepare: { goal: 'Prepare for the road, then leave Stonebridge by the east gate', text: 'Grom sells steel, Bartholomew supplies, Elara rumours (and a bed: a long rest). Captain Aric looks like a man who has lost something. Eldon will see you off at the gate.', obj: { flag: 'departed' }, at: 'eldon_gate' },
    },
    reward: { xp: 50 }, onDone: [{ milestone: 2, why: 'Act I: Whispers in Stonebridge' }] },
  // the Path of Flame: Eldon's first lead, the mines of Mount Cinder (low level; the Ember Vault above them comes later)
  q_flame: { title: 'Embers in the Deep', main: true, order: 1, summary: 'Eldon\'s visions point to the mines of Mount Cinder, where the miners found glowing crystals.',
    stages: {
      go: { goal: 'Travel north-east to the Cinderfall mining camp at the foot of Mount Cinder', obj: { reach: 'cinderfall_camp', r: 22 }, at: 'cinderfall_camp', next: 'investigate' },
      investigate: { goal: 'Find out what happened to the miners', text: 'The camp was abandoned in a hurry. Look around: the foreman kept a ledger.', obj: { flag: 'foreman_read' }, at: 'cinderfall_camp', next: 'mine' },
      mine: { goal: 'Descend into the Cinderfall Mine and stop what is mutating the beasts', obj: { clear: 'cinderfall_mine' }, at: 'cinderfall_mine', next: 'report' },
      report: { goal: 'Bring what you found to Eldon in Stonebridge', hint: 'Your Sending Crystal can call you home to Stonebridge\'s anchor.', obj: { flag: 'flame_reported' }, at: 'eldon' },
    },
    reward: { xp: 150, gold: 40 }, onDone: [{ milestone: 3, why: 'Embers in the Deep' }] },
});

// ---- side stories in Stonebridge -----------------------------------------------------------------------------------------------
Object.assign(SB.quests, {
  sq_aric: { title: "Aric's Lost Amulet", order: 20, summary: 'Captain Aric lost his family amulet when bandits ambushed his patrol in the eastern hills past the Razorwood.',
    stages: {
      find: { goal: 'Find the bandit camp in the eastern hills, north of the Razorwood', obj: { have: 'aric_amulet' }, at: 'bandit_camp', next: 'back' },
      back: { goal: 'Return the amulet to Captain Aric at the Watchtower', obj: { flag: '_never' }, at: 'aric' },
    },
    reward: { xp: 300, gold: 50 } },
  sq_nico: { title: 'Ingredients of Unnatural Origin', order: 21, summary: 'Nico Silverhands can brew something that resists planar bleed, if you bring him three rare components.',
    stages: {
      gather: { goal: 'Gather Dragon\'s Blood, Phoenix Feathers and Mandrake Root', text: 'Dragon\'s Blood from the Drake\'s Scar on Mount Cinder\'s cliffs; Phoenix Feathers from Skyreach Roost, north of Eldenwood; Mandrake Root from the Haunted Glen in the Razorwood.', obj: { haveAll: ['dragons_blood', 'phoenix_feather', 'mandrake_root'] }, next: 'deliver' },
      deliver: { goal: 'Bring the three ingredients to Nico at his Emporium', obj: { flag: 'gave_ingredients' }, at: 'nico' },
    },
    reward: { xp: 300, gold: 75 } },
  sq_mug: { title: "The Shadowed Mug's Secrets", order: 22, summary: 'Elara thinks something is wrong at Kael Dorne\'s tavern across the square.',
    stages: {
      look: { goal: 'Look into the Shadowed Mug without being noticed', text: 'Watch Kael, buy a drink, ask the barkeep. Something comes and goes behind the barrels at the back.', obj: { flag: 'mug_secrets' }, at: 'kael', next: 'report' },
      report: { goal: 'Take what you found to Captain Aric', obj: { flag: '_never' }, at: 'aric' },
    },
    reward: { xp: 300, gold: 40 }, onDone: [{ flag: 'mug_raided' }] },
  sq_grom: { title: 'The Runaway Apprentice', order: 23, summary: 'Grom\'s apprentice Lyra vanished chasing a hum in the ruins, with his rune-etched hammer and her chisels.',
    stages: {
      search: { goal: 'Find word of Lyra Stonehand, and her tools', text: 'Grom wants word of Lyra. She would never leave her tools unless she meant to come back for them.', obj: { flag: '_never' }, at: 'grom' },
    },
    reward: { xp: 400, gold: 30 } },
});

Object.assign(SB.triggers, {
  // Eldon's words follow you out, if you leave without saying goodbye
  farewell: { far: 'stonebridge', r: 150, if: { quest: 'q1', stage: 'prepare' }, do: [{ narrate: [{ title: 'The Departure', text: `As Stonebridge falls behind you, Eldon's last words echo in your thoughts:\n\n"Tread carefully. Something watches… and it knows you're coming. If you hear whispers that sound like music — run. And if you hear silence, true silence, know that the Veil is thinning."\n\nWhatever awaits, your journey has begun.` }] }, { flag: 'departed' }] },
  // a long-limbed silhouette on the rooftops, the first night in town
  rooftops: { reach: 'stonebridge', r: 50, night: true, if: { quest: 'q1', past: 'meet' }, do: [{ toast: 'A long-limbed silhouette glides across a rooftop. Claws on slate. Then… silence.', kind: 'warn' }] },
  // Fate: the road back from the Cinderfall camp tells you where to go if Eldon has not
  ledger_hint: { flag: true, if: 'foreman_read', do: [{ reveal: ['cinderfall_mine'] }] },
});

// the Cinderfall camp's foreman's ledger, and the camp's merchant
Object.assign(SB.npcs, {
  foreman_ledger_prop: {
    name: "The Foreman's Ledger", title: 'Cinderfall Mining Camp', place: 'cinderfall_camp', offset: [2, -2], prop: 'lectern', glyph: '📖',
    talk: { start: 'start', nodes: {
      start: { say: 'A ledger lies open on a lectern under a tattered awning, its last pages hurried and smeared.', opts: [{ t: 'Read it', do: [{ letter: 'foreman_ledger' }, { read: 'foreman_ledger' }, { flag: 'foreman_read' }], end: true }] },
    } },
  },
  fused_miners_prop: {
    name: 'Bodies Fused into the Rock', title: 'Cinderfall Mining Camp', place: 'cinderfall_camp', offset: [-5, 3], prop: 'magma_block', glyph: '☠',
    talk: { start: 'start', nodes: {
      start: { say: 'The remains of two miners, half-fused into a boulder of glassy black stone, as though the rock melted around them and set.', opts: [
        { t: '[Arcana] What did this?', check: { skill: 'arcana', dc: 14, pass: 'arc', fail: 'nope', xp: 50 } },
        { t: '[Religion] Say a few words for them', check: { skill: 'religion', dc: 10, pass: 'pray', fail: 'pray' } },
      ] },
      arc: { say: 'A failed resonance reaction — a tuning attempt gone wrong. Faint chalk glyphs on the stone nearby, the same hand as on the Razorwood sigil, someone said. Someone tried to stabilise this place, and failed.', do: [{ flag: 'lyra_word' }], opts: [] },
      nope: { say: 'Heat, certainly. But not fire. Something else.', opts: [] },
      pray: { say: 'You speak the old words. The wind drops, for a moment.', opts: [] },
    } },
  },
  zephyr: {
    name: 'Zephyr', title: 'Travelling Merchant', place: 'cinderfall_camp', offset: [5, 4],
    look: SB_LOOK('dwarf', { body: 'broad', skin: '#c89a78', hair: 'wild', hairCol: '#8a8a8a', beard: 'long', beardCol: '#9a9a9a', eyes: 'glow', eyeCol: '#c0c0e8', mouth: 'grin', outfit: 'traveller', cols: ['#6a5a3a', '#8a3a2a', '#4a4a3a', '#3a2414'], hood: true }),
    about: 'A wandering dwarf merchant who rides a flame-resistant yak-lizard. He always seems to know where the path less travelled goes.',
    wares: [['potion_healing', 2, 12, 0], ['tuning_crystal', 1, 10, 0], ['rations', 6, 1, 0], ['rope', 1, 1, 0], ['torch', 8, 1, 0]],
    buys: [['planar_blood', 1, 4, 0], ['sigil_shard', 1, 3, 0], ['harmonic_dust', 4, 2, 0], ['cinder_crystal', 1, 8, 0]],
    talk: { start: 'start', nodes: {
      start: { say: ['Well now. Wasn\'t expectin\' company this close to the mountain.', 'My yak-lizard won\'t go any further up. Smart beast.'],
        opts: [
          { t: 'What are you selling?', shop: true },
          { t: 'Seen anyone come through?', reply: '“A half-elf, weeks ago. Muttering about ‘a forge that still remembers’. Then cloaked folk with crates, going up where the miners wouldn\'t. My beast won\'t go near the mountain since. Says Lyra didn\'t tell the mountain goodbye.”', do: [{ flag: 'lyra_word' }], go: 'start' },
          { t: '[Insight] Who are you, really?', check: { skill: 'insight', dc: 15, pass: 'who', fail: 'start', xp: 50 } },
        ] },
      who: { say: '(He\'s been watching you as closely as you\'ve watched him — the way your gear catches the light, the hum of your crystal.) “Old friend of Eldon\'s. He asked me to keep an eye on whoever he sent. You\'re carryin\' more resonance than you know, friend.”', opts: [] },
    } },
  },
});
