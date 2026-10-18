// ---------------------------------------------------------------------------
// campaign/lockdown.js — (alpha 7) The Missing Watch: the opening of the tale, as the campaign's printed notes have it.
//
// You wake dazed on the road outside Stonebridge, and the town is under lockdown: three of the watch gone in three
// nights, folk missing from their beds, and Captain Aric's orders that anyone may come in but no one goes out, and
// everyone is indoors at the curfew bell. The gates stay barred to anyone leaving, and after dark the streets are empty
// but for the watch, and something long-limbed moving across the rooftops.
//
// The thing on the roofs is one of the missing: Sergeant Garrick Dunmore, made a beast by the Bloom cult's ritual in
// the tunnels under the Shadowed Mug, where Kael's people do their business. Through a hatch in the Mug's floor, the old
// sewers: the other two missing watchmen, held there; the cult's altar; and Garrick, cornered at the end of it. Bring the
// three Moonlamps of the Hearthstone Shrine (the shrine keeps one, Nico has the second, the cult took the third) and
// light them round him to break the curse; or fight him and put him down. Either way, Aric lifts the lockdown and the
// curfew, and the road out of Stonebridge is open.
// ---------------------------------------------------------------------------

// ---- the sewers under the town, and what lives there ------------------------------------------------------------------
Object.assign(SB.themes, {
  sewer: { wall: ['stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks', 'cobblestone', 'mossy_cobblestone'], floor: ['mossy_cobblestone', 'cobblestone', 'gravel', 'mossy_stone_bricks'], pillar: 'stone_bricks',
    mobs: ['sewer_rat', 'mug_cultist'], bosses: ['garrick_beast'], stairs: 'stone_brick_stairs', slab: 'stone_brick_slab', light: 'torch', name: 'Sewers' },
});
Object.assign(SB.places, {
  // its way in is a hatch in the middle of the Shadowed Mug's floor, wherever the Mug stands in this world's Stonebridge
  stonebridge_sewers: { name: 'The Sewers Beneath Stonebridge', kind: 'dungeon', at: [20, 20], hidden: true, theme: 'sewer', boss: 'garrick_beast', mobs: ['sewer_rat', 'mug_cultist'], rooms: 7,
    entBld: { town: 'stonebridge', sign: 'The Shadowed Mug' }, bossIf: 'garrick_fight',
    desc: 'Old brick tunnels under the town, older than the palisade. The Bloom cult has been using them.',
    onClear: [{ flag: 'garrick_slain', if: '!garrick_saved' }, { if: '!garrick_saved', narrate: [{ title: 'Garrick', text: 'The beast goes down in the filth and does not get up. As it dies the Bloom goes out of it, the black veins fading, the long limbs folding back into a man\'s: Sergeant Garrick Dunmore of the Stonebridge watch, his tabard still knotted round his waist.\n\nHe looks at you once, and you think he knows you did the only thing left. Then nothing.' }] }] },
});
Object.assign(SB.creatures, {
  garrick_beast: { name: 'Garrick, the Beast of the Sewers', base: 'werewolf', boss: true, scale: 1.05, tint: [0.18, 0.05, 0.22, 0.45], hp: 46, ac: 12, toHit: 4, damage: 4, xp: 450,
    phases: [{ at: 0.5, say: 'Garrick howls, and for a moment it sounds like a man screaming. The rats come pouring out of the walls!', spawn: ['sewer_rat', 2] }] },
  sewer_rat: { name: 'a sewer rat', base: 'giant_rat', tint: [0.25, 0.2, 0.2, 0.25], hp: 6, ac: 11, toHit: 3, damage: 2, xp: 25 },
  mug_cultist: { name: 'a cultist from the Mug', base: 'cultist', tint: [0.3, 0.1, 0.35, 0.3], hp: 11, ac: 11, toHit: 3, damage: 3, xp: 50, drops: [['gold_coin', 1, 4, 0.6], ['shadowchoked_seeds', 1, 1, 0.3]] },
});
Object.assign(SB.items, {
  moonlamp: { name: 'Moonlamp of the Hearthstone Shrine', art: 'candle', cols: ['#d8e4f0', '#5a6a8a', '#ffffff'], quest: true, stack: 3, desc: 'One of three silver lamps from the Hearthstone Shrine. Lit together round one the moon has taken, the old prayers say, they give back what it took.' },
  watch_whistle: { name: 'Corporal Hadley\'s Whistle', art: 'coin', cols: ['#c8c8d0', '#5a5a6a', '#ffffff'], quest: true, desc: 'A watchman\'s brass whistle on a cord, found in the Shadowed Mug.' },
});
const SB_WATCH_LOOK = (o) => SB_LOOK('human', Object.assign({ outfit: 'surcoat', cols: ['#c8c8d0', '#3a5a9a', '#6a6a74', '#3a3a44'] }, o));
Object.assign(SB.npcs, {
  // the two found alive in the tunnels (afterwards, back at the Watchtower)
  hadley: { name: 'Corporal Wil Hadley', title: 'The Watch · bound in the sewers', dungeon: 'stonebridge_sewers', room: 'hall#0', offset: [1, 1], unlisted: true,
    if: { quest: 'q_watch', active: true }, until: 'hadley_found',
    look: SB_WATCH_LOOK({ skin: '#e0b898', hair: 'short', hairCol: '#8a5a2a', eyes: 'round', eyeCol: '#4a6a8a', mouth: 'plain', marks: 'freckles' }),
    talk: { start: 'start', nodes: { start: { say: '(A young watchman, wrists raw from the rope, blinking at your light.) "You came. Gods, you actually came." (You cut him loose.) "They took me out of the Mug. I saw the hatch, I went to tell the Captain, and Kael\'s people had a sack over my head before I reached the door. They\'ve had Garrick longer. They did something to him. Sang over him, cut him with black thorns. He\'s not Garrick any more. He\'s the thing on the roofs."',
      do: [{ flag: 'hadley_found' }], opts: [
        { t: 'Can he be saved?', reply: '"Senna would know. She\'s chapel-raised. She kept saying the moon lamps, the moon lamps, before they took her deeper." (He gets unsteadily to his feet.) "I\'ll find my way up. Find her. And be careful of him. He still knows our names."', do: [{ leave: 'hadley' }], end: true },
        { t: 'Get out of here. Tell the Captain.', reply: '"Aye. Be careful down here."', do: [{ leave: 'hadley' }], end: true },
      ], bye: false } } } },
  senna: { name: 'Watchwoman Senna Price', title: 'The Watch · caged in the sewers', dungeon: 'stonebridge_sewers', room: 'loot#0', offset: [-1, 1], unlisted: true,
    if: { quest: 'q_watch', active: true }, until: 'senna_found',
    look: SB_WATCH_LOOK({ skin: '#8a5a3a', hair: 'braids', hairCol: '#1a1a1a', eyes: 'narrow', eyeCol: '#3a2a1a', mouth: 'stern' }),
    talk: { start: 'start', nodes: { start: { say: '(She has been working at the lock of her cage with a bent nail for some time, by the look of her fingers.) "About time. Get this open." (It opens.) "Listen. Garrick is down at the end of the tunnels. They turned him with the Bloom, and the moon, and something Kael called the Song. But it can be undone. The Hearthstone Shrine has three Moonlamps. My grandmother told the story: light all three round one the moon has taken and it gives them back."',
      do: [{ flag: 'senna_found' }], opts: [
        { t: 'Where are the lamps?', reply: '"One\'s still in the shrine, if Brother Tamsin has any sense. One went to Nico for mending, and the cult took the third. It\'s on their altar down here, I saw it. Three lamps and he lives. Without them..." (She doesn\'t finish.) "I\'m going up. The Captain needs to hear this."', do: [{ leave: 'senna' }], end: true },
      ], bye: false } } } },
  // the shrine keeps the first lamp
  tamsin: { name: 'Brother Tamsin', title: 'Keeper of the Hearthstone Shrine', town: 'stonebridge', post: 'chapel',
    look: SB_LOOK('human', { skin: '#e8c8a8', hair: 'bald', eyes: 'round', eyeCol: '#6a6a4a', mouth: 'plain', beard: 'short', beardCol: '#9a9a9a', outfit: 'vestments', cols: ['#d8c8a0', '#8a6a3a', '#5a4a32', '#3a2a1a'], hood: true }),
    about: 'An old, patient keeper of the shrine. Rings the dawn and dusk bells, and lately the curfew bell.',
    talk: { start: 'start', nodes: { start: { say: ['The Hearth keeps us. Even now.', 'Come in out of the street, child. Curfew\'s at the bell.', 'I ring the bells. Lately, more of them than I\'d like.'],
      alt: [{ if: { all: [{ quest: 'q_watch', done: true }, 'garrick_saved'] }, say: 'Three lamps lit in the dark and a man came home. I have rung that bell every day since. I will ring it as long as I can lift the rope.' }],
      opts: [
        { t: 'Senna Price says the shrine has the Moonlamps.', if: { all: [{ quest: 'q_watch', active: true }, 'senna_found', '!tamsin_lamp'] }, go: 'lamps' },
        { t: 'Why the curfew bell?', reply: '"The Captain\'s orders. Three of his watch gone, and folk missing from their beds besides. Something walks the roofs at night. I ring, and the town bolts its doors."', go: 'start' },
      ] },
      lamps: { say: '(He goes very still.) "So it\'s the moon\'s work. I prayed it wasn\'t." (He unlocks a niche behind the altar.) "Three there were. One I kept. One went to Nico for its silverwork, and he has been slow returning it. The third was stolen a fortnight ago, the night Sergeant Dunmore went missing." (He puts the lamp in your hands.) "Light all three round him at once. The old words say the moon will give back what it took."',
        do: [{ give: 'moonlamp', n: 1 }, { flag: 'tamsin_lamp' }], opts: [{ t: 'Thank you, Brother.', end: true }], bye: false },
    } } },
  // Garrick, cornered at the end of the tunnels: the choice
  garrick_cornered: { name: 'Something in the Dark', title: 'The Sewers · the end of the tunnels', dungeon: 'stonebridge_sewers', room: 'boss', offset: [0, 2], prop: 'iron_bars', glyph: '☾',
    if: { quest: 'q_watch', active: true }, until: { any: ['garrick_saved', 'garrick_fight', 'garrick_slain'] },
    talk: { start: 'start', nodes: {
      start: { say: 'At the end of the tunnels, where the water pools black, something crouches with its back to the wall: long-limbed, grey-furred, its jaws too wide, black veins pulsing under the skin. Round its waist, knotted, the rags of a Stonebridge watch tabard. It sees you. It does not attack. Not yet.',
        opts: [
          { t: 'Set the three Moonlamps round him and light them', if: { has: 'moonlamp', n: 3 }, go: 'ritual' },
          { t: '[Persuasion] "Garrick. It\'s over. You know us. Come home."', check: { skill: 'persuasion', dc: 13, pass: 'hears', fail: 'snarl' } },
          { t: 'Draw your weapon.', go: 'fight' },
          { t: 'Back away slowly. (Come back with the lamps.)', end: true },
        ], bye: false },
      hears: { say: '(The great head tilts. For a moment the eyes are a man\'s eyes, brown and frightened, and he makes a sound that might be your name.) Then the Bloom pulls him back and he shudders, claws scraping stone. Whatever is left of Garrick is holding on. It will not hold forever. The lamps, Senna said. All three.', opts: [{ t: 'Hold on, Garrick. We\'ll be back.', end: true }, { t: 'Draw your weapon.', go: 'fight' }], bye: false },
      snarl: { say: '(It snarls, and spit hangs from its jaws, and it is no use talking to it. But it still does not come at you.)', opts: [{ t: 'Back away.', end: true }, { t: 'Draw your weapon.', go: 'fight' }], bye: false },
      fight: { say: '(It sees the steel, and whatever was holding it back lets go.)', do: [{ flag: 'garrick_fight' }], opts: [{ t: 'Fight!', end: true }], bye: false },
      ritual: { say: 'You set the lamps in a triangle round him, slowly, and he lets you, trembling. Three wicks; three flames. The light that comes off them is not firelight. It is moonlight, cold and white, and where it touches the black veins they smoke and shrivel.',
        do: [{ take: 'moonlamp', n: 3 }, { flag: 'garrick_saved' }, { clear: 'stonebridge_sewers' }, { xp: 450, why: 'Garrick, saved' }, { narrate: [{ title: 'The Moonlamps', text: 'He howls once, and the howl breaks in the middle into a man\'s voice, and then there is only a big, grey-bearded watch sergeant lying in the filth in what is left of his tabard, shaking, alive.\n\n"I could hear you," Garrick Dunmore says, when he can say anything. "The whole time. On the roofs. I could see the town, every window. I wanted to come home and I couldn\'t find the way." He holds on to your arm like a drowning man. "Kael\'s people did this. Under the Mug. Tell Aric."' }] }],
        opts: [{ t: 'Help him up. Take him home.', end: true }], bye: false },
    } } },
  // the cult's altar, and the stolen lamp
  cult_altar: { name: 'The Cult\'s Altar', title: 'The Sewers · a shrine of black thorns', dungeon: 'stonebridge_sewers', room: 'spawner#0', offset: [2, -1], prop: 'candle', glyph: '✢',
    if: { quest: 'q_watch', active: true }, until: 'altar_lamp',
    talk: { start: 'start', nodes: { start: { say: 'A table of black-veined wood, crusted with candle wax. Thorny cuttings in jars. A crude moon chalked on the wall, crossed out, and a bloom drawn over it. And in the middle of it all, wrapped in a stained cloth as though they couldn\'t bear to look at it: a silver lamp.',
      opts: [{ t: 'Take the Moonlamp', do: [{ give: 'moonlamp', n: 1 }, { flag: 'altar_lamp' }], reply: 'The lamp is cold, and heavier than it looks. Somewhere far down the tunnels, something howls.', end: true }, { t: 'Leave it.', end: true }], bye: false } } } },
  // afterwards, at the Watchtower
  garrick: { name: 'Sergeant Garrick Dunmore', title: 'The Watch', town: 'stonebridge', post: 'tower', bpos: [2, 3], if: { all: [{ quest: 'q_watch', done: true }, 'garrick_saved'] },
    look: SB_WATCH_LOOK({ body: 'broad', skin: '#d8b090', hair: 'short', hairCol: '#7a7a7a', beard: 'long', beardCol: '#8a8a8a', eyes: 'narrow', eyeCol: '#6a4a2a', mouth: 'smile', marks: 'scar' }),
    about: 'Sergeant of the watch. Bloom-touched for a fortnight, and brought back by three lamps and a stubborn party.',
    talk: { start: 'start', nodes: { start: { say: ['I still wake up on the roof sometimes. In my head. Then I hear the bell and I\'m home.', 'Anything you need from the watch, you ask me. Anything.', 'Full moons, I sit up with the lamps lit. Tamsin says that\'s wise. I say it\'s comfortable.'], opts: [] } } } },
  hadley_home: { name: 'Corporal Wil Hadley', title: 'The Watch', town: 'stonebridge', post: 'tower', bpos: [3, 2], if: { quest: 'q_watch', done: true },
    look: SB_WATCH_LOOK({ skin: '#e0b898', hair: 'short', hairCol: '#8a5a2a', eyes: 'round', eyeCol: '#4a6a8a', mouth: 'smile', marks: 'freckles' }),
    talk: { start: 'start', nodes: { start: { say: ['They gave me my whistle back. Turns out you had it. Thanks for that.', 'I don\'t go in the Mug any more. Not even for the cheap ale.', 'The Captain made me corporal again. I\'d never stopped being one, he said, I was just mislaid.'], opts: [] } } } },
  senna_home: { name: 'Watchwoman Senna Price', title: 'The Watch', town: 'stonebridge', post: 'tower', bpos: [1, 4], if: { quest: 'q_watch', done: true },
    look: SB_WATCH_LOOK({ skin: '#8a5a3a', hair: 'braids', hairCol: '#1a1a1a', eyes: 'narrow', eyeCol: '#3a2a1a', mouth: 'plain' }),
    talk: { start: 'start', nodes: { start: { say: ['My grandmother\'s stories. Who knew.', 'Next time the cult takes me I\'m bringing a better nail.', 'If you find more of Kael\'s holes in the ground, you tell me first.'], opts: [] } } } },
});
Object.assign(SB.quests, {
  q_watch: { title: 'The Missing Watch', main: true, order: 0.5, summary: 'Stonebridge is under lockdown: three of the watch vanished in three nights, folk gone from their beds, a curfew at the evening bell, and something on the rooftops after dark.',
    stages: {
      aric: { goal: 'Report to Captain Aric at the Watchtower', text: 'A runner from the watch found you: the Captain wants a word.', obj: { talk: 'aric' }, at: 'aric', next: 'search' },
      search: { goal: 'Find out where the missing watch went', text: 'Corporal Hadley was last seen at the Shadowed Mug. Sergeant Garrick walked the rooftops on night patrol. Ask at the Mug, or keep watch after the curfew bell.', obj: { flags: ['watch_mug', 'watch_roof', 'sewer_found'], n: 1 }, at: 'jonric', next: 'sewer' },
      sewer: { goal: 'Find the hatch in the Shadowed Mug\'s floor and go down into the sewers', text: 'In the middle of the taproom floor. Open it, and take a light.', obj: { flag: 'sewer_found' }, at: 'jonric', next: 'guards' },
      guards: { goal: 'Find the missing watchmen in the sewers', obj: { flags: ['hadley_found', 'senna_found'], n: 2 }, next: 'garrick' },
      garrick: { goal: 'Free Garrick with the three Moonlamps, or put him down', text: 'Brother Tamsin keeps one at the Hearthstone Shrine; Nico has the second; the cult took the third to their altar below. Light all three round him at once, or face him with steel.', obj: { any: [{ flag: 'garrick_saved' }, { flag: 'garrick_slain' }] }, next: 'report' },
      report: { goal: 'Report to Captain Aric at the Watchtower', obj: { flag: 'lockdown_lifted' }, at: 'aric' },
    },
    reward: { xp: 300, gold: 25 }, onDone: [{ milestone: 2, why: 'The Missing Watch' }] },
});
// Whispers in Stonebridge: after Eldon, the lockdown has to be lifted before the road out is open
{
  const Q = SB.quests.q1;
  Q.stages.meet.next = 'watch';
  Q.stages.watch = { goal: 'Stonebridge is sealed: help Captain Aric find his missing watch so the lockdown is lifted', text: 'No one leaves the town until the missing watch are found.', obj: { flag: 'lockdown_lifted' }, at: 'aric', next: 'prepare' };
}
Object.assign(SB.triggers, {
  // at the gate, the first time: the lockdown
  lockdown_gate: { reach: 'stonebridge', r: 120, if: { all: ['lockdown_era', '!lockdown_seen', '!lockdown_lifted', { any: [{ quest: 'q1', notStarted: true }, { quest: 'q1', active: true }] }] },
    do: [{ flag: 'lockdown_seen' }, { narrate: [{ title: 'Stonebridge, Sealed', text: '"Halt!" A guard steps out of the gatehouse with a spear and a lantern, though it\'s broad day. He looks you over: the dust, the dazed eyes. "Another one stumbling in off the road. You\'re lucky it\'s daylight."\n\n"Stonebridge is under lockdown. Three of the watch gone in three nights, and folk missing from their beds besides. Captain Aric\'s orders: anyone may come in, nobody goes out, and everyone\'s indoors at the curfew bell." He jerks his head at the gate. "In you go. Mind the bell."' }] }] },
  // after Eldon, a runner from the Watchtower
  watch_runner: { reach: 'stonebridge', r: 200, if: { all: ['lockdown_era', { quest: 'q1', stage: 'watch' }, { quest: 'q_watch', notStarted: true }] },
    do: [{ narrate: [{ title: 'A Runner from the Watch', text: 'A boy in an oversized watch tabard catches up with you, out of breath. "You\'re the ones Eldon vouched for? The Captain wants you at the Watchtower. Says Eldon told him you\'re the sort who finds things."' }] }, { quest: 'q_watch' }] },
});
// the old one-line rooftop event is this now
delete SB.triggers.rooftops;
// the notices on the square's board
{
  const T = SB.towns.stonebridge, N = T.notices || (T.notices = []);
  const scouts = N.find(n => /Scouts/.test(n.title || '')); if (scouts) scouts.if = 'lockdown_lifted';
  N.unshift(
    { title: 'Lockdown and Curfew', text: 'By order of the Watch: Stonebridge is sealed. No one leaves the town until further notice. All residents indoors at the evening bell.\n\nMissing: Corporal Wil Hadley. Watchwoman Senna Price. Sergeant Garrick Dunmore. Anyone with word of them, come to the Watchtower.', by: 'Captain Aric Vellor', if: { all: ['lockdown_era', '!lockdown_lifted', { any: [{ quest: 'q1', notStarted: true }, { quest: 'q1', active: true }] }] } },
    { title: 'Lockdown Lifted', text: 'The lockdown is lifted and the curfew ended, by order of the Watch. The gates are open.\n\n(Underneath, in chalk: THANK YOU.)', by: 'Captain Aric Vellor', if: { quest: 'q_watch', done: true } },
  );
}
// people talk about it
sbAlt('elara', { all: ['lockdown_era', { quest: 'q_watch', notStarted: true }, '!lockdown_lifted'] }, 'Lockdown, curfew, and the watch three short. Old Wim\'s lad didn\'t come home Tuesday, and the Harrow girl the night before. I keep the Griffin\'s doors shut at the bell and I count my regulars.');
sbAlt('elara', { quest: 'q_watch', active: true }, 'You\'re helping the Captain? Then listen: something walks the rooftops after the bell. Tall. Long arms. I heard it on my own slates last night, and I don\'t sleep easy any more.');
sbAlt('pip', { quest: 'q_watch', active: true }, 'I saw it! On the roofs! It had a watchman\'s tabard on, all torn. Mam says I dreamt it. I didn\'t dream it.');
sbAlt('bartholomew', { quest: 'q_watch', active: true }, 'Bolts, bars and lamp oil, that\'s all anyone buys this week. Lamp oil especially. Folk want the windows lit.');
sbAlt('jonric', { quest: 'q_watch', active: true }, 'We close at the bell like everyone else. Kael\'s orders. Don\'t know anything about any watchmen.');
sbOpt('jonric', { t: '[Insight] A watchman came in here asking questions. What happened to him?', if: { all: [{ quest: 'q_watch', active: true }, '!watch_mug'] }, check: { skill: 'insight', dc: 11, pass: 'watchtell', fail: 'no' } });
SB.npcs.jonric.talk.nodes.watchtell = { say: '(He doesn\'t look at you. He looks at the floor, at the middle of the taproom, and then away.) "Hadley. Nice lad. Asked about the hatch." (Quieter.) "They took him down it. He never came up. I didn\'t see anything. You didn\'t hear it from me." (A brass whistle on a cord, from under the bar.) "He dropped this."',
  do: [{ flag: 'watch_mug' }, { give: 'watch_whistle', n: 1 }], opts: [], bye: true };
sbOpt('nico', { t: 'Brother Tamsin says you have the shrine\'s Moonlamp.', if: { all: [{ quest: 'q_watch', active: true }, '!nico_lamp', 'tamsin_lamp'] }, go: 'moonlamp' });
Object.assign(SB.npcs.nico.talk.nodes, {
  moonlamp: { say: '"The Moonlamp! Yes, yes, the silverwork. Exquisite. Repaired, polished, re-wicked… and not yet paid for." (He holds it just out of reach.) "Fifteen gold. Or a very good reason."', opts: [
    { t: 'Pay fifteen gold', if: { has: 'gold_coin', n: 15 }, do: [{ take: 'gold_coin', n: 15 }, { give: 'moonlamp', n: 1 }, { flag: 'nico_lamp' }], reply: '"A pleasure. Do mind the silver."', end: true },
    { t: '[Persuasion] It\'s to save a man\'s life, Nico.', check: { skill: 'persuasion', dc: 11, pass: 'moonfree', fail: 'moonno' } },
  ], bye: false },
  moonfree: { say: '(The flourish fades. For a moment he just looks tired.) "Take it. Take it, and don\'t tell anyone I did anything nice."', do: [{ give: 'moonlamp', n: 1 }, { flag: 'nico_lamp' }], opts: [], bye: true },
  moonno: { say: '"Lives are saved every day! Silverwork is forever. Fifteen gold."', opts: [{ t: 'Pay fifteen gold', if: { has: 'gold_coin', n: 15 }, do: [{ take: 'gold_coin', n: 15 }, { give: 'moonlamp', n: 1 }, { flag: 'nico_lamp' }], end: true }, { t: 'Later.', end: true }], bye: false },
});
// Captain Aric: the briefing, and the end of it
{
  const A = SB.npcs.aric.talk.nodes;
  A.start.alt = [
    { if: { quest: 'q_watch', stage: 'aric' }, say: '(The Captain looks like he hasn\'t slept in three days, because he hasn\'t.) "Eldon says you\'re useful. I need useful. Three of my watch gone in three nights: Corporal Wil Hadley, last seen going into the Shadowed Mug; Watchwoman Senna Price, off the river wall; and Sergeant Garrick Dunmore, my best man, on the rooftop patrol. Folk are missing from their beds besides. So the town is sealed, and the curfew stands, until I know what\'s taking them." (He meets your eyes.) "Find my people. Then I open the gates."' },
    { if: { quest: 'q_watch', stage: 'report' }, say: '(He is on his feet before you reach the table.) "Well?"' },
  ].concat(A.start.alt || []);
  A.start.opts.unshift({ t: 'Your watch are found.', if: { quest: 'q_watch', stage: 'report' }, go: 'watch_end' });
  A.watch_end = { say: '"Hadley and Senna came up an hour ago, filthy and swearing. Tell me about Garrick."',
    alt: [
      { if: 'garrick_saved', say: '(Garrick Dunmore is sitting by the fire wrapped in a blanket, and the Captain cannot stop looking at him.) "Three lamps and a stubborn party. Tamsin\'s been ringing the bell for a quarter of an hour." (He clears his throat.) "Kael\'s cellar and Kael\'s tunnels. I\'ll have the Mug watched, and when I can prove it, I\'ll have him in irons."' },
      { if: 'garrick_slain', say: '(He listens to all of it without a word.) "He\'d have wanted it done by someone who looked him in the face. Thank you for that." (A long breath.) "Kael\'s cellar and Kael\'s tunnels. I can\'t prove it yet. I will."' },
    ],
    opts: [{ t: 'And the lockdown?', do: [{ flag: 'lockdown_lifted' }, { complete: 'q_watch' }, { narrate: [{ title: 'The Gates Open', text: 'That evening the curfew bell does not ring. Instead the shrine bell rings, long and slow, and then the gates of Stonebridge swing open one by one, and people come out of their houses into the street and stand there as if they had forgotten what an evening looks like.\n\nCaptain Aric\'s notice goes up on the board in the square: the lockdown is lifted, the curfew ended, by order of the Watch. Under it someone has chalked: THANK YOU.' }] }], end: true }],
    bye: false };
}

// ---- the rules of the lockdown -------------------------------------------------------------------------------------------
// only a tale begun with this version is locked down: an older world's Stonebridge was built without the sewers under it
{
  const baseBegin = campBegin;
  campBegin = function (g) {
    const S = campState(g), fresh = S && !S.started, C = campDef(g);
    const r = baseBegin(g);
    if (fresh && C && C.id === 'shadowbloom') { S.flags.lockdown_era = 1; campChanged(g); }
    return r;
  };
}
function lockdownOn(g) {
  if (!g || !g.meta || !g.meta.campaign) return false;
  const C = campDef(g); if (!C || C.id !== 'shadowbloom') return false;
  const S = campState(g); if (!S || !S.flags.lockdown_era || S.flags.lockdown_lifted || S.ended) return false;
  const q1 = S.quests.q1;
  if (!q1) return true;
  if (q1.done) return false;
  return ['fate', 'read', 'find', 'meet', 'watch'].includes(q1.stage);
}
const LOCK_RT = { said: new Map(), held: new Map(), night: null, roofT: 0, roof: null, sewerT: 0 };
// the gates: barred to anyone leaving; the watch lets you in
function GATE_LOCK_HOOK(g, v, G, pawns) {
  if (v.town !== 'stonebridge' || !lockdownOn(g)) return false;
  const [cx, cy, cz] = G.center, dGate = Math.hypot(cx - v.x, cz - v.z);
  const outside = pawns.filter(q => Math.hypot(q.x - cx, q.z - cz) < 9 + G.hw && Math.abs(q.y - cy) < 5 && Math.hypot(q.x - v.x, q.z - v.z) > dGate + 0.5);
  const inside = pawns.filter(q => Math.hypot(q.x - cx, q.z - cz) < 6 + G.hw && Math.abs(q.y - cy) < 5 && Math.hypot(q.x - v.x, q.z - v.z) < dGate - 0.5);
  const k = G.key;
  if (outside.length) {
    if (gateIsShut(g.world, G)) gateSet(g, G, true, true);
    LOCK_RT.held.set(k, 4);
    for (const l of g.locals) if (outside.includes(l) || outside.includes(l.player)) { const sk = 'in:' + k + ':' + l.name; if (!LOCK_RT.said.get(sk)) { LOCK_RT.said.set(sk, 1); l.toast(`The watch opens the ${G.name} and waves you through: "In, quick. You'll not be going back out."`, ''); } }
    return true;
  }
  const held = LOCK_RT.held.get(k) || 0;
  if (held > 0) { LOCK_RT.held.set(k, held - 0.5); return true; }
  if (!gateIsShut(g.world, G)) gateSet(g, G, false, true);
  if (inside.length) for (const l of g.locals) if (inside.includes(l) || inside.includes(l.player)) {
    const sk = 'out:' + k + ':' + l.name, t = LOCK_RT.said.get(sk) || 0;
    if (g.time > t) { LOCK_RT.said.set(sk, g.time + 25); l.toast(`The ${G.name} stays barred: "No one leaves Stonebridge until the missing watch are found. Captain's orders."`, 'warn'); }
  }
  return true;
}
// the curfew: at the evening bell, the townsfolk go home
{
  const baseEve = npcEvening;
  npcEvening = function (g, v, e, day) {
    if (v && v.town === 'stonebridge' && lockdownOn(g)) return { home: true };
    return baseEve(g, v, e, day);
  };
}

// ---- after the bell: the thing on the rooftops ------------------------------------------------------------------------
// a figure on a roof near you, watching; then it bounds away over the slates and is gone (it can't be hurt, and doesn't
// fight: not yet)
{
  const baseAI = Mob.prototype.controlAI;
  Mob.prototype.controlAI = function (dt, ...rest) {
    if (this.roofShade) {
      const R = this.roofShade, L = this.game.locals.reduce((b, l) => !b || Math.hypot(l.player.x - this.x, l.player.z - this.z) < Math.hypot(b.player.x - this.x, b.player.z - this.z) ? l : b, null), p = L && L.player;
      R.t += dt;
      if (R.t < 2.4 && p) { const a = Math.atan2(-(p.x - this.x), -(p.z - this.z)); return { want: 0, dir: a }; }
      if (!R.jumped) { R.jumped = true; this.vy = 9; const a = R.away; this.vx = -Math.sin(a) * 7; this.vz = -Math.cos(a) * 7; try { this.game.sfx.playAt('dig_gravel', this.x, this.y, this.z, 30); } catch (e) { /* quiet */ } }
      return { want: 6, dir: R.away };
    }
    return baseAI.call(this, dt, ...rest);
  };
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src, ...a) { if (this.roofShade) return 0; return baseHurt.call(this, amount, src, ...a); };
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (this.roofShade && (this.roofShade.t > 6.5 || (this.roofShade.jumped && this.roofShade.t > 3.6 && !this.onGround && Math.random() < dt * 2))) {
      try { this.game.burst(this.x, this.y + 1, this.z, 'smoke', 12, 0.8); } catch (e) { /* quiet */ }
      this.remove = true; LOCK_RT.roof = null; return;
    }
    return baseUpd.call(this, dt);
  };
}
function lockdownRoofSighting(g, v, lp) {
  const p = lp.player, w = g.world;
  let best = null;
  for (let k = 0; k < 24; k++) {
    const a = Math.random() * TAU, d = 12 + Math.random() * 14, x = Math.floor(p.x + Math.sin(a) * d), z = Math.floor(p.z + Math.cos(a) * d);
    if (!w.isLoaded(x, z) || Math.hypot(x - v.x, z - v.z) > (v.r || 70) - 6) continue;
    let y = Math.min(CH - 2, v.y + 22); while (y > v.y && !T_SOLID[w.getBlock(x, y, z)]) y--;
    if (y < v.y + 5 || w.getBlock(x, y + 1, z) || w.getBlock(x, y + 2, z)) continue;   // a roof, with room on top
    if (!best || y > best[1]) best = [x + 0.5, y + 1, z + 0.5, a];
  }
  if (!best) return false;
  const type = MOB_TYPES.werewolf ? 'werewolf' : 'zombie';   // not the boss itself: no name over it, no boss bar, not yet
  const m = new Mob(g, type, best[0], best[1], best[2]);
  m.roofShade = { t: 0, away: best[3] + Math.PI * (Math.random() < 0.5 ? 0.5 : -0.5) + Math.PI }; m.kept = false; m.persistent = false; m.huntT = 0;
  g.addEntity(m); LOCK_RT.roof = m;
  const S = campState(g), first = !S.flags.saw_roof;
  campDo(g, [{ flag: 'saw_roof' }].concat(S.quests.q_watch && !S.quests.q_watch.done ? [{ flag: 'watch_roof' }] : []), lp);
  if (first) campNarrate(g, [{ title: 'On the Rooftops', text: 'Claws on slate. Above you, on the ridge of a roof, something long-limbed stands against the night: too tall, arms too long, crouched like a dog and watching you like a man. Round its waist, flapping, the torn colours of a Stonebridge watch tabard.\n\nThen it is gone, over the roofs, toward the Shadowed Mug.' }], 'The Missing Watch');
  else lp.toast('Claws on slate, somewhere above. A long shape on the roofs, watching, and gone.', 'warn');
  return true;
}
// the lockdown's own clock: the curfew bell, the rooftops, finding the sewers
function lockdownTick(g, dt) {
  if (g.isGuest || g.dim !== 0 || !g.world || g.state !== 'playing' || !g.meta || !g.meta.campaign) return;
  const C = campDef(g); if (!C || C.id !== 'shadowbloom') return;
  if ((LOCK_RT.t = (LOCK_RT.t || 0) - dt) > 0) return;
  LOCK_RT.t = 1;
  const S = campState(g), v = campTownVillage(g, 'stonebridge'); if (!v) return;
  const night = g.env && g.env.day < 0.42;
  // the sewers: down through the hatch, under the Mug
  if (!S.flags.sewer_found) {
    const d = campDungeon(g, 'stonebridge_sewers');
    if (d) for (const l of g.locals) { const p = l.player; if (p.x >= d.x0 && p.x <= d.x1 && p.z >= d.z0 && p.z <= d.z1 && p.y < v.y - 6 && p.y > d.y - 3) {
      campDo(g, [{ flag: 'sewer_found' }, { reveal: ['stonebridge_sewers'] }, { narrate: [{ title: 'The Sewers Beneath Stonebridge', text: 'Brick tunnels, older than the palisade, older than the town. Water runs black in the channels. The air smells of rot, and copper, and something sweet that you have smelled before, on the black flowers by the road.\n\nSomewhere ahead, voices chanting low. And under them, a sound like breathing.' }] }], l); break; } }
  }
  // an older world reaching the lockdown's step of the tale: there's no lockdown to lift, so it's lifted
  if (!S.flags.lockdown_era && !S.flags.lockdown_lifted && S.quests.q1 && S.quests.q1.stage === 'watch') campDo(g, [{ flag: 'lockdown_lifted' }], g.locals[0]);
  if (!lockdownOn(g)) return;
  // the curfew bell, once a night, to whoever is in town
  if (LOCK_RT.night !== night) {
    const turned = LOCK_RT.night !== null; LOCK_RT.night = night;
    if (turned && night) for (const l of g.locals) if (Math.hypot(l.player.x - v.x, l.player.z - v.z) < (v.r || 70) + 20) l.toast('The curfew bell: shutters bang closed all down the street, bolts slide home. Only the watch walk Stonebridge after dark.', 'warn');
    LOCK_RT.roofT = night ? 20 + Math.random() * 30 : 0;
  }
  // the rooftops after dark
  if (night && !LOCK_RT.roof && !S.flags.garrick_saved && !S.flags.garrick_slain && !S.flags.garrick_fight) {
    LOCK_RT.roofT -= 1;
    if (LOCK_RT.roofT <= 0) {
      LOCK_RT.roofT = 90 + Math.random() * 120;
      const lp = g.locals.find(l => !l.player.dead && Math.hypot(l.player.x - v.x, l.player.z - v.z) < (v.r || 70) - 4 && l.player.y > v.y - 3);
      if (lp && !lockdownRoofSighting(g, v, lp)) LOCK_RT.roofT = 15;
    }
  }
}
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { lockdownTick(this, dt); } catch (e) { console.warn('lockdown', e); } return baseUpd.call(this, dt); };
}

// ---- the hatch in the Shadowed Mug's floor ------------------------------------------------------------------------------
// built after the town (which builds over the sewers' shaft): a trapdoor in the middle of the taproom, a ladder down
{
  const baseGen = WorldGen.prototype.generate;
  WorldGen.prototype.generate = function (ch) {
    const r = baseGen.call(this, ch);
    if (this.dim !== 0) return r;
    try {
      const C = campGenDef(); const P = C && C.id === 'shadowbloom' && C.places.stonebridge_sewers; if (!P) return r;
      const F = this.campaignDungeonAt(Math.floor(P.at[0] / DREG), Math.floor(P.at[1] / DREG)); if (!F || !F.ent) return r;
      const [ex, ez, fy] = F.ent, bx = ch.cx * 16, bz = ch.cz * 16;
      if (ex < bx || ex >= bx + 16 || ez < bz || ez >= bz + 16) return r;
      const d = this.dungeonsNear(ex, ez, 0).find(q => q.place === 'stonebridge_sewers'); if (!d) return r;
      const lx = ex - bx, lz = ez - bz, hatch = B.dark_oak_trapdoor !== undefined ? B.dark_oak_trapdoor : B.oak_trapdoor, ladder = B.ladder;
      for (let y = d.y; y < fy; y++) { const i = cidx(lx, y, lz); ch.blocks[i] = ladder; ch.meta[i] = 2; }
      // something solid behind the ladder all the way up
      if (lz > 0) for (let y = d.y; y < fy; y++) { const j = cidx(lx, y, lz - 1); if (!ch.blocks[j] || !T_SOLID[ch.blocks[j]]) ch.blocks[j] = B.stone_bricks; }
      { const i = cidx(lx, fy, lz); ch.blocks[i] = hatch; ch.meta[i] = 0; }
      for (let y = fy + 1; y <= fy + 2; y++) { const i = cidx(lx, y, lz); if (ch.blocks[i] && !T_SOLID[ch.blocks[i]]) ch.blocks[i] = 0; }
    } catch (e) { console.warn('sewer hatch', e); }
    return r;
  };
}
// handles for the play-tests
try { window.__lock = { rt: LOCK_RT, on: () => lockdownOn(GAME), tick: (dt) => lockdownTick(GAME, dt || 1.01), roof: () => lockdownRoofSighting(GAME, campTownVillage(GAME, 'stonebridge'), GAME.locals[0]) }; } catch (e) { /* no window */ }
