// ---------------------------------------------------------------------------
// campaign/sb_act3.js — Act III: The Bloom's First Root.
//
//   Scene 1  The Mirrorroot: the Root Spiral, the Petal of Preservation, the Chamber of Mirrors, the Broken Cradle.
//   Interlude  The Song That Follows Silence: Stonebridge, Eldon restores Lyra's final note. "Find me in… Stillwater."
//   Scene 2  Stillwater: the Repeating Path, Mirror Lake, the Silent Streets, the Tether Docks, the Archive Spiral.
//   Interlude  The Chord That Remembers: Nico's lab, Fate's signal, Kael's new shop, Aric's secret.
//   Scene 3  The Veil's Heart (the campaign's end): the Echo of Ancients, Lyra woken beneath the lake, Kael at the
//            Corrupted Heart, Seraphina in the Temple of the Bloom, and Ember in the cradle of the Veil.
// Side: Thornmere and the Lantern Bearer. Epilogue: Ember home with Mira, Lyra home at Grom's anvil.
// ---------------------------------------------------------------------------

// a line to say instead, once the story has moved on (added to someone already written)
function sbAlt(npc, cond, say, node = 'start') {
  const N = SB.npcs[npc] && SB.npcs[npc].talk && SB.npcs[npc].talk.nodes[node]; if (!N) return;
  (N.alt = N.alt || []).unshift({ if: cond, say });
}
function sbOpt(npc, opt, node = 'start') {
  const N = SB.npcs[npc] && SB.npcs[npc].talk && SB.npcs[npc].talk.nodes[node]; if (!N) return;
  (N.opts = N.opts || []).push(opt);
}
const SB_LYRA_LOOK = SB_LOOK('elf', { ears: 'round', skin: '#e8c8a8', hair: 'wild', hairCol: '#6a4020', eyes: 'round', eyeCol: '#3a7a4a', eyeCol2: '#6a4a2a', mouth: 'plain', marks: 'freckles', outfit: 'traveller', cols: ['#5a6a7a', '#c8a040', '#3a3a4a', '#3a2414'], cloak: true });
const SB_EMBER_LOOK = SB_LOOK('human', { skin: '#f0d0b0', hair: 'long', hairCol: '#c84a1a', eyes: 'wide', eyeCol: '#3a7a4a', eyeCol2: '#6a4a2a', mouth: 'smile', marks: 'freckles', outfit: 'peasant', cols: ['#8a9a6a', '#c86a3a', '#5a4a3a', '#3a2a1a'] });

// ---- Scene 1: the road to the Mirrorroot, and the Mirrorroot ---------------------------------------------------------------
Object.assign(SB.npcs, {
  crossing_prop: {
    name: 'The Rope Bridge', title: 'The Memory-Touched Crossing', place: 'memory_crossing', offset: [0, -11], prop: 'oak_fence', glyph: '⇋',
    talk: { start: [{ if: 'crossing_heard', node: 'done' }], nodes: {
      start: { say: 'A fog-drenched ravine splits the trail, crossed only by a weathered rope bridge. Halfway across, a strange shimmer takes hold. Shadows ripple backward. You see yourselves — ghostly doubles — moving in reverse, mouths forming Rootsong syllables you\'ve not yet spoken.', opts: [
        { t: '[Wisdom save] Hold onto now', check: { save: 'wis', dc: 14, pass: 'held', fail: 'loop' } },
        { t: 'Listen to what the doubles are singing', go: 'loop' },
      ], bye: false },
      held: { say: 'You keep hold of yourself. And in the moment of holding, you hear it: a Rootsong interval you\'ve never encountered, sung by a version of you that has already crossed.', do: [{ flag: 'crossing_heard' }, { xp: 700, why: 'The Memory-Touched Crossing' }], opts: [] },
      loop: { say: 'Time stutters. For a long breath you are standing in Eldon\'s tower again, hearing him say "something watches… and it knows you\'re coming". Then you\'re on the bridge, and you have heard a new harmonic variation you can\'t quite remember learning.', do: [{ flag: 'crossing_heard' }, { hurt: [2, 6], type: 'psychic', why: 'A memory loop' }, { xp: 700, why: 'The Memory-Touched Crossing' }], opts: [] },
      done: { say: 'The bridge sways. Your doubles are gone.', opts: [] },
    } },
  },
  druid_camp: {
    name: 'Petal-Shaped Tents', title: 'The Forgotten Encampment', place: 'forgotten_camp', offset: [-2, 2], prop: 'lectern', glyph: '❁',
    talk: { start: [{ if: 'camp_searched', node: 'done' }], nodes: {
      start: { say: 'A lost druidic camp, its tents shaped like petals and woven from root and bark. Journals lie scorched by planar heat. A carved bowl sits empty beside a cold firepit.', opts: [
        { t: '[Arcana] Read the scorched journals', check: { skill: 'arcana', dc: 15, pass: 'journal', fail: 'bowl' } },
        { t: '[Investigation] Read the scorched journals', check: { skill: 'investigation', dc: 15, pass: 'journal', fail: 'bowl' } },
        { t: 'Fill the carved bowl with water', go: 'bowl' },
      ] },
      journal: { say: 'The final line of one entry, still legible: "The Mirrorroot is not a place. It\'s the Bloom\'s first echo…" A druid\'s pouch is tucked behind the journals.', do: [{ flag: 'camp_searched' }, { give: 'mirrorroot_powder', n: 2 }, { xp: 700, why: 'The Forgotten Encampment' }], opts: [{ t: 'Fill the carved bowl', go: 'bowl' }] },
      bowl: { say: 'The water in the bowl goes still, and for a moment it shows a scene from somewhere ahead of you: a temple of black stone, a child in a cradle of light, and your own hands, shaking. Then only water.', do: [{ flag: 'camp_searched' }, { flag: 'bowl_seen' }], opts: [] },
      done: { say: 'The tents rustle. Nobody has slept here in a long time.', opts: [] },
    } },
  },
  root_wards: {
    name: 'The Rootsong Wards', title: 'The Mirrorroot · the Root Spiral', dungeon: 'mirrorroot', room: 'entry', offset: [2, 0], prop: 'crying_obsidian', glyph: '@', until: 'mirror_wards',
    talk: { start: 'start', nodes: {
      start: { say: 'A root-carved door, marked with Ember\'s spiral glyph, and beyond it a tight spiralling corridor lit by inner-vein sigil glow. Sigils block the path. Echoes twist in time; your words repeat before you speak them. A voice — your own, but wrong — whispers: "Who are you without what you forgot?"', opts: [
        { t: 'Harmonize the wards in reverse Rootsong order', if: 'rootsong_reversed', check: { skill: 'performance', dc: 14, pass: 'open', fail: 'flash' } },
        { t: '[Insight] Hear the correct tonal sequence', check: { skill: 'insight', dc: 16, pass: 'open', fail: 'flash' } },
        { t: '[Performance] Find the tonal sequence', check: { skill: 'performance', dc: 16, pass: 'open', fail: 'flash' } },
      ], bye: false },
      flash: { say: 'Wrong order. A vision floods you — a scene that never happened, but could have — and your mirrored self briefly stands where you stood.', do: [{ hurt: [2, 8], type: 'psychic', why: 'Dissonant feedback' }], opts: [{ t: 'Try again', go: 'start' }], bye: false },
      open: { say: 'Each stanza alters the corridor\'s form, the walls sliding like a vault. The last ward folds open, and in the hollow behind it lies a smooth stone that hums with a child\'s voice: Ember\'s Humming Stone. It knows the pattern of the gates ahead.', do: [{ give: 'humming_stone' }, { flag: 'mirror_wards' }, { xp: 1500, why: 'The Root Spiral' }], opts: [{ t: 'Go deeper.', end: true }], bye: false },
    } },
  },
  preservation_petal: {
    name: 'The Petal of Preservation', title: 'The Mirrorroot · the Bloomed Lattice Grove', dungeon: 'mirrorroot', room: 'hall#0', offset: [0, 1], prop: 'pink_petals', propUp: 0, glyph: '❀', if: 'mirror_wards', until: 'warden_down',
    talk: { start: [{ if: 'petal_woke', node: 'again' }], nodes: {
      start: { say: 'Petrified trees and glowing sigils; moss pathways; stillness layered with a deceptive peace. At the grove\'s heart: a crystalline bloom housing a latent echo of Ember. It hums the way she hummed in your dreams.', opts: [
        { t: 'Touch the bloom', go: 'wake' },
        { t: 'Hold up Ember\'s Humming Stone first', if: { has: 'humming_stone' }, reply: 'The stone and the bloom hum in unison. Whatever guards this place is going to wake when you touch it — but you\'ll see it coming.', go: 'start' },
      ], bye: false },
      wake: { say: 'The moment your fingers brush the crystal, the grove inhales. Mirror shards, vines and bark lift from the floor and knit themselves into a guardian: the Echoguard Warden. It speaks in the voices of Lyra and Ember at once — "Don\'t. Don\'t finish it. Don\'t—" — and attacks.', do: [{ flag: 'petal_woke' }, { spawn: 'echoguard_warden', n: 1 }], opts: [{ t: 'Fight!', end: true }], bye: false },
      again: { say: 'The bloom pulses. Somewhere in the grove, the Warden is still knitting itself back together.', opts: [{ t: 'Touch the bloom again', do: [{ spawn: 'echoguard_warden', n: 1 }], reply: 'Mirror shards rise from the moss…', end: true }] },
    } },
  },
  memory_orbs: {
    name: 'The Orbs Over the Chasm', title: 'The Mirrorroot · the Chamber of Mirrors That Never Were', dungeon: 'mirrorroot', room: 'library#0', offset: [0, 1], prop: 'glass', glyph: '◍', if: 'warden_down', until: 'mirror_door',
    talk: { start: 'start', nodes: {
      start: { say: 'Floating memory orbs hang over a chasm of shimmering roots. Each one holds an alternate version of you: the one who stayed in Stonebridge; the one who answered the Bloom\'s whisper; the one who never woke on that road at all. Only one carries your true harmonic resonance.', opts: [
        { t: '[Insight] Find the one that resonates with the Rootsong as you carry it now', check: { skill: 'insight', dc: 15, pass: 'true', fail: 'false' } },
        { t: '[Arcana] Find the one that resonates with the Rootsong as you carry it now', check: { skill: 'arcana', dc: 15, pass: 'true', fail: 'false' } },
        { t: 'Let Ember\'s Humming Stone choose', if: { has: 'humming_stone' }, check: { skill: 'insight', dc: 11, pass: 'true', fail: 'false' } },
        { t: 'Reach for the brightest', go: 'false' },
      ], bye: false },
      false: { say: 'Wrong. The orb cracks, and the version of you inside steps out of it — a Mirror Echo, with your face and none of your doubt.', do: [{ hurt: [2, 6], type: 'psychic', why: 'Psychic backlash' }, { spawn: 'mirror_echo', n: 1 }], opts: [{ t: 'Fight it — then choose again', end: true }], bye: false },
      true: { say: 'Your hand closes around an orb that feels like you: tired, stubborn, still here. It goes quiet in your palm, and one of the others whispers in Lyra\'s voice as it fades: "Good. Now don\'t trust anything that sings back." At the chamber\'s far side, a door of black petals opens on the Broken Cradle.',
        do: [{ give: 'memory_orb' }, { flag: 'mirror_door' }, { xp: 1500, why: 'The Chamber of Mirrors' }], opts: [{ t: 'Into the Broken Cradle.', end: true }], bye: false },
    } },
  },
  ember_core: {
    name: "Ember's Harmonic Core", title: 'The Mirrorroot · the Broken Cradle', dungeon: 'mirrorroot', room: 'boss', offset: [0, 0], prop: 'amethyst_block', glyph: '✧', if: { cleared: 'mirrorroot' }, until: 'core_heard',
    talk: { start: 'start', nodes: {
      start: { say: 'The cradle at the basin\'s centre has opened. Inside: a softly glowing bloom — Ember\'s core, preserved in resonance crystal. It pulses once… twice…', opts: [{ t: 'Reach out to it', go: 'core' }], bye: false },
      core: { say: 'It cracks. But the voice that rises is not Ember\'s.', do: [{ narrate: [
        { title: 'The Last Chord Isn\'t Yours', text: `It's Lyra's.\n\n"If you've found this… I'm already inside. Don't finish the Rootsong unless you're ready to hear the answer."\n\nAnd you understand, at last, what the Bloom was guarding. Ember is not the source of the Veil's corruption. She is the anchor preventing it from collapsing further.` },
        { title: 'The Anchor Beneath the Cradle', text: `Ember's Harmonic Core hums one last time — and then shatters. Not violently. Like a tone resolving at the end of a symphony.\n\nWhere it hovered, the roots part, revealing a glyph beneath the cradle's floor: a Resonance Anchor, marked with the sigil of a place not yet known. Your Sending Crystal rises from your pack and floats toward it on its own, three tones in harmony echoing from within.\n\nA voice — not Lyra's, not Ember's — speaks without sound:\n\n"The root remembers what the bloom forgets."` },
      ], title: 'The Broken Cradle' }, { flag: 'core_heard' }, { flag: 'lyra_word' }, { reveal: ['stillwater'] }, { xp: 2000, why: 'Ember\'s Harmonic Core' }], opts: [{ t: 'Touch the anchor, and go home.', end: true }], bye: false },
    } },
  },
});
Object.assign(SB.creatures.echoguard_warden, { onDeath: [{ flag: 'warden_down' }, { toast: 'The Warden comes apart into mirror shards and moss. In the wreckage: a bloom, and a fragment of root-shard armour.', kind: 'epic' }] });
Object.assign(SB.places.mirrorroot, { onClear: [{ narrate: [{ title: 'The Echoing Bloom', text: `The Echo dissolves, its melody severed by harmonic truth. In its last phase you heard her — Ember's true voice, fragmented and out of time, singing along with you instead of against you.\n\nThe petals around the cradle retract slowly, curling back like fingers unclenching after centuries. The crystalline bloom at its centre glows faintly — not with light, but with resonance. A pulse. A beat. A memory.` }] }] });

// ---- Interlude: the song that follows silence ------------------------------------------------------------------------------
SB.npcs.eldon.talk.start.unshift(
  { if: { quest: 'q11', stage: 'eldon' }, node: 'd_mirror' },
  { if: { quest: 'q12', stage: 'eldon' }, node: 'd_still' },
  { if: { quest: 'q13', stage: 'ready' }, node: 'd_ready' },
);
Object.assign(SB.npcs.eldon.talk.nodes, {
  d_mirror: { say: '(He holds no surprise in his expression.) I felt it when the Crystal stilled. Not broken… but quieted. You brought back something that was never meant to return.', opts: [
    { t: 'Show him the Mirrorroot Memory Orb', if: { has: 'memory_orb' }, go: 'd_mirror2' },
    { t: 'Tell him what the core said', go: 'd_mirror2' },
  ] },
  d_mirror2: { say: '(He cups it in both hands.) This… this isn\'t a fragment. It\'s the first chord. The root of the root. The Bloom didn\'t begin in Eldenwood. It was only remembered there. (He touches a spiral within a spiral on his half-faded mural.) And now… the water waits. Give me tonight with Lyra\'s note and the core\'s echo. I think I can finish the translation.',
    do: [{ letter: 'lyra_final_restored' }, { flag: 'eldon_mirror' }, { reveal: ['stillwater', 'repeating_path', 'mirror_lake'] }], opts: [{ t: 'Read the restored note', do: [{ read: 'lyra_final_restored' }], end: true }] },
  d_still: { say: 'It\'s awake now. The line between Stillwater and the Mirrorroot. The pulse completed it. I didn\'t expect it to return. Place what you carry on the resonance table.', opts: [
    { t: 'Set down the Half-Sigil Fragment', if: { has: 'half_sigil' }, go: 'd_still2' },
    { t: 'Tell him about Lyra\'s echo in the archive', go: 'd_still2' },
  ] },
  d_still2: { say: '(The carved lines vibrate; a tone sounds in a minor key.) It\'s inverted. Folded. Just like the Mirrorroot echoes. Stillwater was never a resonance node — it was a containment site. It was meant to hide one of the tones from the Bloom. Shadow tones, the old scholars called them. Not evil — just unremembered. (He opens Lyra\'s silver-threaded journal. A sealed page has come unlocked.) "If I forget the note, will I forget the melody?" She was already slipping. Even then. But if Lyra still sings, even broken… she hasn\'t been unmade.',
    opts: [{ t: 'Then where is she?', go: 'd_still3' }] },
  d_still3: { say: 'Beneath the lake. "That\'s where I left her name," she told you — Ember\'s name, hidden where Seraphina can\'t sing it. And she told you how to wake her: bring her bloom, sing the silence. (He looks very old for a moment.) Everything points to the heart of Eldenwood now. The old temple. Rest. Speak to the town. Then come back to me: there are things I should have told you long ago.',
    do: [{ flag: 'eldon_still' }, { reveal: ['temple_gate', 'drowned_altar'] }], opts: [{ t: 'We\'ll rest.', end: true }] },
  d_ready: { alt: [{ if: 'prism_got', say: 'You have the key, the prism and the song. (He sets his staff against the table.) When Lyra and I sealed the Bloomlight breach, we did it beneath Eldenwood, in the temple where the Circle first sang. The third setting of the Tuner was how we did it — and it cost us a scholar\'s voice. Lyra\'s mother\'s. I never told her. (He takes your hands.) Wake Lyra. She will know what to do with the Tuner. And when the prism must stand where the child stands… let it. Not a voice. Never again a voice.' }],
    say: 'You have the key and the song. (He sets his staff against the table.) When Lyra and I sealed the Bloomlight breach, we did it beneath Eldenwood, in the temple where the Circle first sang. The third setting of the Tuner was how we did it — and it cost us a scholar\'s voice. Lyra\'s mother\'s. I never told her. (He takes your hands.) Wake Lyra. She will know what to do with the Tuner. Lyra was making something, before she left — something to stand where the child stands, so that no voice has to. Grom would know. Not a voice. Never again a voice.',
    do: [{ flag: 'eldon_ready' }], opts: [{ t: 'We\'ll bring them home.', end: true }] },
});

// ---- Scene 2: the road to Stillwater, and Stillwater -----------------------------------------------------------------------
Object.assign(SB.npcs, {
  repeating_fork: {
    name: 'The Fork in the Road', title: 'The Repeating Path', place: 'repeating_path', offset: [0, 0], prop: 'oak_sign', glyph: '⑂', until: 'path_true',
    talk: { start: 'start', nodes: {
      start: { say: 'A fork in the road beneath the whispering pines. You take the left path… and find yourselves approaching this same fork from behind. Again.', opts: [
        { t: '[Survival] Find the fold in the path', check: { skill: 'survival', dc: 15, pass: 'fix', fail: 'loop' } },
        { t: '[Arcana] Find the fold in the path', check: { skill: 'arcana', dc: 15, pass: 'fix', fail: 'loop' } },
        { t: 'Sing part of the Rootsong aloud', if: 'rootsong_whole', go: 'fix' },
      ], bye: false },
      loop: { say: 'You walk on. The fork appears ahead of you again, a little older. Try something else.', opts: [{ t: 'Try again', go: 'start' }], bye: false },
      fix: { say: 'The final note leaves your lips and drifts outward. The trees tremble — not from wind, but from memory re-aligning.', do: [{ narrate: [{ title: 'Echoes That Walk Ahead', text: `The forked trail collapses into a single clear path, as if the world had always known where you were going.\n\nAnd then you see yourselves. Just ahead, walking the trail, is you. Not reflections. These versions wear different armour. Bear different scars. One turns slightly, glancing back, and their eyes carry a weight of knowing your current self does not yet.\n\nEach pauses at a bend where a silver leaf falls from nowhere, kneels, touches the leaf, whispers a single line of Rootsong — and vanishes.\n\n"The resonance didn't show what will be. It showed what the world may become — if you keep singing the song you've begun."` }], title: 'The Repeating Path' }, { flag: 'path_true' }, { xp: 1500, why: 'The Repeating Path' }], opts: [{ t: 'Walk on.', end: true }], bye: false },
    } },
  },
  mirror_pool: {
    name: 'The Mirror-Still Pool', title: 'Mirror Lake Edge', place: 'mirror_lake', offset: [0, 2], prop: 'blue_ice', glyph: '◯',
    talk: { start: [{ if: 'silent_verse', node: 'done' }], nodes: {
      start: { say: 'A perfectly still, glasslike pool. No ripples, even when disturbed. Looking into it shows your group standing somewhere else, unmoving.', opts: [
        { t: '[Insight] What is this?', once: true, check: { skill: 'insight', dc: 16, pass: 'lens', fail: 'start' } },
        { t: '[Arcana] What is this?', once: true, check: { skill: 'arcana', dc: 16, pass: 'lens', fail: 'start' } },
        { t: 'Touch the water', go: 'vision' },
      ], bye: false },
      lens: { say: 'A mirror-locked memory projection. Whatever it is holding, it is holding it on purpose.', opts: [{ t: 'Touch the water', go: 'vision' }], bye: false },
      vision: { say: 'You fall without falling.', do: [{ narrate: [
        { title: 'The Song Beneath Stillwater', text: `You stand beneath a lake. No weight, no breath held; the water here does not smother, it suspends. The roots of the world hang like strands of hair above you, glowing with faded resonance.\n\nAnd beneath them: Lyra. Kneeling. Her robes soaked, her braid unravelling, her hands pressed to a circle of sigils on a half-sunken stone altar.\n\nShe is singing. Not to summon. Not to seal. To remember. With every note, her hands bleed, and the sigils drink it in.` },
        { title: 'The Song Beneath Stillwater', text: `Her voice cracks: "I didn't tune it wrong… it changed when it touched her."\n\nOne eye turns toward you — green, but dulled. The other is closed. Not by choice. She looks at you not with recognition, but relief, as if your presence proves time hasn't collapsed completely.\n\nThen you're back. And you know something you didn't: the Stillwater sigil must be harmonized with silence, not sound. The Rootsong has a silent verse.` },
      ], title: 'Mirror Lake' }, { flag: 'silent_verse' }, { flag: 'lyra_word' }, { xp: 1500, why: 'The Song Beneath Stillwater' }], opts: [{ t: 'Breathe.', end: true }], bye: false },
      done: { say: 'The pool shows you standing elsewhere, waiting.', opts: [] },
    } },
  },
  choir_ring: {
    name: 'The Withered Choir', title: 'A Ring of Dead Trees', place: 'choir_stump', offset: [0, 0], prop: 'stripped_oak_wood', glyph: '♩',
    talk: { start: [{ if: 'choir_sung', node: 'done' }], nodes: {
      start: { say: 'A ring of dead trees, each hollow and marked with musical runes.', opts: [
        { t: '[Performance] Play the Rootsong here', check: { skill: 'performance', dc: 15, pass: 'echo', fail: 'no' } },
        { t: '[Religion] Speak the old words', check: { skill: 'religion', dc: 15, pass: 'echo', fail: 'no' } },
      ] },
      echo: { say: 'The song echoes back from beneath you, like a stage below ground. A resonance burst cracks a glyph stone at the ring\'s centre, and through the crack you feel it: Stillwater\'s resonance source is beneath its lake, and it is holding its breath.', do: [{ flag: 'choir_sung' }, { inspire: true }, { give: 'glassfeather', n: 2 }], opts: [] },
      no: { say: 'The hollow trunks swallow the sound.', opts: [] },
      done: { say: 'The choir is silent again.', opts: [] },
    } },
  },
  still_table: {
    name: 'A Letter on a Table', title: 'Stillwater · the Silent Streets', town: 'stillwater', post: 'house_m#0', bpos: [2, 2], prop: 'lectern', glyph: '✉', until: 'still_letter',
    talk: { start: 'start', nodes: { start: { say: 'Buildings locked in stillness. A cup of tea, long cold but unspoiled. Ghost-like footprints loop through the room — your own, you realise. And on the table, a letter to "Lyra", dated two weeks from now. The ink is still moving across the page.',
      do: [{ letter: 'stillwater_letter' }, { flag: 'still_letter' }], opts: [{ t: 'Read it', do: [{ read: 'stillwater_letter' }], end: true }], bye: false } } },
  },
  still_bell: {
    name: 'The Bell of Echoing Chimes', title: 'Stillwater · the Bell Tower', town: 'stillwater', post: 'tower#0', bpos: [1, 1], prop: 'bell', glyph: '🔔', until: 'still_bell',
    talk: { start: 'start', nodes: {
      start: { say: 'The tower clock is frozen at 3:33. Faint glyphs are carved around the bell\'s rim; they shimmer, humming, when you come near.', opts: [
        { t: '[Performance] Sing a Rootsong phrase into the bell', check: { skill: 'performance', dc: 16, pass: 'ring', fail: 'dull' } },
        { t: 'Sing the Backward Lullaby into the bell', if: 'rootsong_reversed', go: 'ring' },
        { t: 'Strike it', go: 'dull' },
      ], bye: false },
      dull: { say: 'The bell gives a flat, swallowed note. The lake beyond the window does not move.', opts: [{ t: 'Try again', go: 'start' }], bye: false },
      ring: { say: 'The bell rings once, though no one pulls its rope — and the tower carries the tone straight down, beneath the lake. Every chime brings a memory from somewhere in the town, and the last one speaks: "She\'s still below. But she\'s not singing to us anymore…"', do: [{ flag: 'still_bell' }, { xp: 1500, why: 'The Bell of Echoing Chimes' }], opts: [] },
    } },
  },
  tether_stumps: {
    name: 'Five Tether Stumps', title: 'Stillwater · the Tether Docks', place: 'stillwater_docks', offset: [1, 6], prop: 'stripped_spruce_log', glyph: '⚓', if: { quest: 'q12', past: 'streets' }, until: 'drowned_down',
    talk: { start: [{ if: 'mooring_done', node: 'again' }], nodes: {
      start: { say: 'Five tether stumps, each tied with spectral rope that loops into the water and disappears. Each hums faintly with a note: A – B – F – D – G. Play them in reverse Rootsong order, and a sixth will rise.', opts: [
        { t: '[Performance] Play the harmonic sequence', check: { skill: 'performance', dc: 15, pass: 'rise', fail: 'jar' } },
        { t: '[Arcana] Work out the reverse order', check: { skill: 'arcana', dc: 15, pass: 'rise', fail: 'jar' } },
        { t: 'Play it as Ember hummed it: backward', if: 'rootsong_reversed', go: 'rise' },
      ], bye: false },
      jar: { say: 'The ropes snap taut and the dock shudders.', do: [{ hurt: [2, 6], type: 'thunder' }], opts: [{ t: 'Try again', go: 'start' }], bye: false },
      rise: { say: 'The dock shimmers, revealing a sixth tether stump buried in the water. You touch it — and a flickering copy of one of you rises from the lake, barefoot, soaked, humming part of the Rootsong backward.', do: [{ flag: 'mooring_done' }, { spawn: 'drowned_self', n: 1 }], opts: [{ t: 'Fight!', end: true }], bye: false },
      again: { say: 'The sixth tether sways. The water is waiting for you to touch it again.', opts: [{ t: 'Touch the tether', do: [{ spawn: 'drowned_self', n: 1 }], reply: 'Something rises from the lake…', end: true }] },
    } },
  },
  lyra_echo: {
    name: 'Lyra Stonehand', title: 'A Mirrorbound Echo', dungeon: 'archive_spiral', room: 'hall#0', offset: [1, 1], if: { quest: 'q12', past: 'docks' }, until: { quest: 'q12', done: true }, unlisted: true,
    look: Object.assign({}, SB_LYRA_LOOK, { eyes: 'glow', eyeCol: '#9ad8c0', eyeCol2: '#b0a090' }),
    talk: { start: [{ if: 'lyra_echo_met', node: 'later' }], nodes: {
      start: { say: '(She doesn\'t blink. Doesn\'t breathe. She turns pages in a book she\'s never read. When you speak, she hums in your cadence.) You\'re here again… aren\'t you? Or did you come last time? I can\'t finish it. Not without her voice.', opts: [
        { t: 'Sing her a completed Rootsong phrase', if: 'rootsong_whole', go: 'aware' },
        { t: 'Offer her Ember\'s Signal Bloom', if: { has: 'signal_bloom' }, go: 'bloom' },
        { t: '[Arcana] Help her realign her last memory', check: { skill: 'arcana', dc: 15, pass: 'name', fail: 'drift' } },
        { t: '[Insight] Help her realign her last memory', check: { skill: 'insight', dc: 15, pass: 'name', fail: 'drift' } },
      ], bye: false },
      aware: { say: '(For a moment her eyes focus. One green, one brown, both too bright.) “You finished the song. You finished it. Then you can hear the silence too.”', opts: [{ t: 'Where are you, Lyra?', go: 'name' }], bye: false },
      bloom: { say: '(She takes it in both hands. Her voice is a whisper.) “The lake heard her… before I did.”', opts: [{ t: 'Where are you, Lyra?', go: 'name' }], bye: false },
      drift: { say: '(She hums, and the page she is reading writes itself backward.)', opts: [{ t: 'Try again', go: 'start' }], bye: false },
      name: { say: '(She points through the archive wall, toward the lake.) “That\'s where I left her name. Under the water, where the song can\'t reach it. Where she can\'t sing it.” (She turns a page, and is reading again, and doesn\'t see you.)', do: [{ flag: 'lyra_echo_met' }, { letter: 'lyra_mirror' }, { reveal: ['drowned_altar'] }], opts: [{ t: 'We\'ll find you.', end: true }], bye: false },
      later: { say: '(She turns pages. She hums your cadence back at you.) “…bring her bloom. Sing the silence. Then wake me.”', opts: [] },
    } },
  },
  archive_node: {
    name: 'The Central Pillar', title: 'Stillwater · the Archive Spiral', dungeon: 'archive_spiral', room: 'boss', offset: [0, -2], prop: 'lapis_block', glyph: '⟲', if: 'lyra_echo_met', until: 'archive_solved',
    talk: { start: 'start', nodes: {
      start: { say: 'A circular chamber, its walls rotating in uneven spirals of shelves: scrolls, sigil-etched vials, resonant crystals. The central pillar has a node shaped like half a sigil, and mirrored memory glyphs circle it, slightly out of true.', opts: [
        { t: 'Insert the Half-Sigil Fragment, and recite a stanza in reverse', if: { has: 'half_sigil' }, check: { skill: 'performance', dc: 14, pass: 'solved', fail: 'feedback' } },
        { t: '[Arcana] Align the glyphs by their harmonic progression', if: { has: 'half_sigil' }, check: { skill: 'arcana', dc: 16, pass: 'solved', fail: 'feedback' } },
        { t: '[Insight] Pick out the memories that don\'t belong', if: { has: 'half_sigil' }, check: { skill: 'insight', dc: 13, pass: 'solved', fail: 'feedback' } },
        { t: 'You need the Half-Sigil Fragment from the docks.', if: { not: 'drowned_down' }, end: true },
      ], bye: false },
      feedback: { say: 'Feedback screams through the shelves; scrolls rewind themselves.', do: [{ hurt: [2, 6], type: 'psychic' }], opts: [{ t: 'Try again', go: 'start' }], bye: false },
      solved: { say: 'The centre pulses, and reveals a Resonance Sigil Map: lines connecting Stillwater, the Mirrorroot, the Shadowfell — and one more line, burning, running into the heart of Eldenwood. A faint echo of Lyra\'s voice: "The lake could only store half. The rest is still buried… beneath the Veil." Behind a fallen resonance gate, a stone slab lifts on a cracked, still-living Resonance Anchor.',
        do: [{ flag: 'archive_solved' }, { clear: 'archive_spiral' }, { reveal: ['temple_gate'] }, { xp: 2000, why: 'The Archive Spiral' }], opts: [{ t: 'Touch the anchor.', end: true }], bye: false },
    } },
  },
});
Object.assign(SB.creatures.drowned_self, { onDeath: [{ flag: 'drowned_down' }, { toast: '“You didn\'t drown here. But she might have…”', kind: 'epic' }] });

// ---- Interlude: the chord that remembers (Stonebridge, after Stillwater) -----------------------------------------------------
// Kael Dorne sold the Shadowed Mug (or slipped the raid) and took over Nico's empty shop: a front, and a watch on you
SB.npcs.kael.until = { any: ['mug_raided', { quest: 'q10', done: true }] };
Object.assign(SB.npcs, {
  kael_shop: {
    name: 'Kael Dorne', title: "Kael's Curatives", town: 'stonebridge', post: 'library#0', if: { all: ['nico_gone', { quest: 'q10', done: true }] }, until: { any: [{ quest: 'q13', active: true }, { quest: 'q13', done: true }] },
    look: SB_LOOK('human', { skin: '#d8b090', hair: 'short', hairCol: '#141414', beard: 'stubble', eyes: 'narrow', eyeCol: '#2a2a2a', mouth: 'plain', outfit: 'shadow', cols: ['#3a3a42', '#6a2a3a', '#1e1e24', '#141418'] }),
    about: 'Kael Dorne, once of the Shadowed Mug, now selling herbs and tinctures from what was Nico\'s Arcane Emporium. The old sign is still there, half-scorched.',
    wares: [['potion_healing', 2, 12, 0], ['potion_greater_healing', 1, 28, 0], ['poultice', 2, 6, 0], ['candle', 4, 1, 0]],
    buys: [['harmonic_dust', 4, 2, 0], ['glassfeather', 1, 4, 0], ['veil_bone', 1, 6, 0]],
    talk: { start: 'start', nodes: { start: { say: ['Herbs and tinctures. Nothing that glows. Not anymore.', 'Curatives. For what ails you.'],
      alt: [{ if: { quest: 'q12', done: true }, say: 'Stillwater? You went to Stillwater? …And came back… whole? That place hasn\'t spoken in years. If it\'s answering again, you\'ve either corrected something ancient… or disturbed something that should\'ve stayed buried.' }],
      opts: [
        { t: 'Let me see your stock.', shop: true },
        { t: '[Insight] He\'s hiding something', once: true, check: { skill: 'insight', dc: 14, pass: 'hid', fail: 'calm' } },
      ] },
      hid: { say: '(He isn\'t scared of you. He\'s scared of what it means — resonance coming back to dead places. And when he thinks you aren\'t looking, his eyes go to the west window, toward Eldenwood, the way a man looks at a clock.)', do: [{ flag: 'kael_suspect' }], opts: [] },
      calm: { say: '(He adjusts a loose jar behind the counter, and says nothing at all.)', opts: [] } } },
  },
  nico_lab: {
    name: "The Hatch to Nico's Lab", title: "Kael's Curatives (once Nico's Arcane Emporium)", town: 'stonebridge', post: 'library#0', bpos: [1, 4], prop: 'cauldron', glyph: '⚗', if: { all: ['nico_gone', { quest: 'q11', done: true }] }, until: 'nico_lab_seen',
    talk: { start: 'start', nodes: {
      start: { say: 'The back hatch to Nico\'s laboratory is ajar. Below: tables overturned, vials shattered, some mixtures calcified into resinous sigil formations. The diagram on the back wall has been scratched through and overwritten with inverted Bloom glyphs. The centre cauldron holds a viscous black fluid with threads of colour dancing beneath the surface.', opts: [
        { t: '[Investigation] Search his working notes', check: { skill: 'investigation', dc: 14, pass: 'notes', fail: 'crumpled' } },
        { t: '[Insight] Look at the floor', once: true, check: { skill: 'insight', dc: 13, pass: 'boots', fail: 'start' } },
        { t: 'Search the room', go: 'crumpled' },
      ], bye: false },
      boots: { say: 'A trail of boots, far too large to be Nico\'s, through the dust and out by the hatch. Recent. Someone else uses this cellar.', do: [{ flag: 'kael_suspect' }], opts: [{ t: 'Search the room', go: 'crumpled' }], bye: false },
      notes: { say: '“Phase I complete. Ember\'s sigil leads to deeper roots. If tuned wrong — she may hum herself open.” Under the notes, a hidden alcove holds an unshattered vial labelled "Memory Anchor Test #7 — DO NOT DRINK".', do: [{ give: 'sealed_crystal_bloom' }], opts: [{ t: 'Keep searching', go: 'crumpled' }], bye: false },
      crumpled: { say: 'A crumpled, unfinished note in Nico\'s hand. As you read it, a resonance mirror on the wall flickers: a reflection of Nico, bloody, eyes wild — but not in this timeline. He places a finger to his lips, and disappears.', do: [{ letter: 'nico_final' }, { flag: 'nico_lab_seen' }], opts: [{ t: 'Read the note', do: [{ read: 'nico_final' }], end: true }], bye: false },
    } },
  },
  lantern_post: {
    name: 'A Leaning Lantern Post', title: 'Stonebridge', town: 'stonebridge', post: [9, -3], prop: 'lantern', glyph: '✉', if: { quest: 'q12', past: 'archive' }, until: 'fate_signal_got',
    talk: { start: 'start', nodes: { start: { say: 'The lantern\'s glass flickers, dim… then flares with a silent pulse of resonance. At its base, caught between the stones and the moss, is a folded parchment sealed with a crescent quill pressed into a circle of thread. Fate\'s mark. No courier. Just the letter, as if it had always been waiting.',
      do: [{ letter: 'fate_signal' }, { flag: 'fate_signal_got' }], opts: [{ t: 'Read it', do: [{ read: 'fate_signal' }, { narrate: [{ title: 'Resonance Flare', text: `As you read, a faint harmonic thread spirals into the air and vanishes. For a heartbeat, each of you hears a different phrase, in a voice that might be your own:\n\n"She didn't want to forget."\n\n"You're not who you were when this started."\n\n"The Veil is just a mouth waiting to speak."\n\n"You were chosen before the song was written."` }] }], end: true }], bye: false } } },
  },
});
// the town after Stillwater
sbAlt('elara', { quest: 'q12', done: true }, 'So… the lake really was holding something back. My grandmother used to say Stillwater was named for what it hid, not what it showed. (She polishes a glass that doesn\'t need it.) And the girl in the green cloak was here again. Left nothing behind but a whisper and a cold cup of tea.');
sbAlt('elara', { quest: 'q11', done: true }, 'You\'re back. (Warm cider, with shaking hands.) Something in you has changed, you know. Sit by the fire.');
sbAlt('aric', { quest: 'q12', done: true }, 'We\'ve had silence from the Stillwater outpost for months. I didn\'t expect the next word to come from you. If these sigils are waking up, it\'s not just a cult. It\'s something older.');
sbAlt('grom', { quest: 'q12', done: true }, 'Got a strongbox here with Lyra\'s mark on it. Told myself I\'d never open it while she was alive. Come and talk to me when you\'re ready.');
sbAlt('bartholomew', { quest: 'q12', done: true }, 'Folk keep repeating sentences they haven\'t said yet. Puddles in the square show the sky upside down. Buy something. It helps me think.');

// ---- Scene 3: the Veil's Heart ------------------------------------------------------------------------------------------------
SB.npcs.aric.talk.start = [{ if: { quest: 'q13', stage: 'aric' }, node: 'key' }];
Object.assign(SB.npcs.aric.talk.nodes, {
  key: { say: '(The watchtower, after dark. He has a locked box on the table, and he does not open it straight away.) My father served during the last Bloomlight breach. Said some songs you don\'t sing unless you\'re willing to vanish with them. Then it\'s time I show you something I swore I\'d never pass on.', opts: [{ t: 'Show us.', go: 'key2' }] },
  key2: { say: '(Inside: a heavy key of old gold, and a journal in a soldier\'s hand.) The Thalara seal-key. My father carried it out of the temple under Eldenwood and swore on his blade it would never go back. (He pushes it across the table.) He also wrote: better a Vellor holds the door than no one. I can\'t leave the town. So you hold it.',
    do: [{ give: 'bloomlight_key' }, { letter: 'aric_father' }, { flag: 'aric_key' }], opts: [{ t: 'Read his father\'s journal', do: [{ read: 'aric_father' }], end: true }, { t: 'We\'ll bring it back, Captain.', end: true }] },
});
SB.npcs.grom.talk.start = [{ if: { all: [{ quest: 'q13', active: true }, '!prism_got'] }, node: 'prism' }];
Object.assign(SB.npcs.grom.talk.nodes, {
  prism: { say: '(He drags out a small iron strongbox with Lyra\'s chisel-mark on the lid.) She left this with me the night before she went. Said: "If I don\'t come back, give it to whoever brings back my chisels." Well.', alt: [{ if: { quest: 'sq_grom', undone: true }, say: '(He drags out a small iron strongbox with Lyra\'s chisel-mark on the lid.) She left this with me the night before she went. Said to give it to whoever brought her tools back. Nobody did — but you\'re the ones still looking for her, and that\'s close enough for me.' }],
    opts: [{ t: 'Open it', go: 'prism2' }] },
  prism2: { say: 'Inside, wrapped in felt: a crystalline prism that hums with an ancient resonance. She cut it on my anvil, a hundred nights running, with those chisels. Wouldn\'t tell me what it was for. Said a song needs somewhere to stand that isn\'t a person. (He clears his throat, hard.) Take it to her. And bring her back to my forge, or don\'t come back yourselves.',
    do: [{ give: 'echo_of_ancients' }, { flag: 'prism_got' }], opts: [{ t: 'We will, Grom.', end: true }] },
});
Object.assign(SB.npcs, {
  lyra_sleeping: {
    name: 'Lyra, Beneath the Lake', title: 'The Drowned Altar', place: 'drowned_altar', offset: [-2, 0], siteY: -13, prop: 'light_blue_wool', glyph: '☾', if: 'eldon_still', until: 'lyra_woken',
    talk: { start: 'start', nodes: {
      start: { say: 'Beneath the still lake, in a dry dome of old stone: Lyra Stonehand, kneeling at the altar exactly as you saw her in the vision, as if no time at all has passed for her. Her hands rest on the sigils. Her eyes are closed. She is not breathing, and she is not dead. "Bring her bloom. Sing the silence. Then wake me."', opts: [
        { t: 'Place Ember\'s Signal Bloom in her hands', if: { has: 'signal_bloom' }, go: 'bloom' },
        { t: 'You don\'t have Ember\'s Signal Bloom. (The Echoguard Warden in the Mirrorroot carried one.)', if: { lacks: 'signal_bloom' }, end: true },
      ], bye: false },
      bloom: { say: 'The bloom opens in her hands, petal by petal, and hums with a child\'s voice. Now the silence.', do: [{ take: 'signal_bloom' }, { flag: 'lyra_bloom' }], opts: [
        { t: 'Sing the silent verse: stop singing, and hold the rest', if: 'silent_verse', go: 'wake' },
        { t: '[Performance] Find the rest between the notes', check: { skill: 'performance', dc: 18, pass: 'wake', fail: 'noise' } },
        { t: '[Wisdom] Be still. Truly still.', check: { ability: 'wis', dc: 16, pass: 'wake', fail: 'noise' } },
      ], bye: false },
      noise: { say: 'You hum, and it is noise. The water above you does not move. (The pool at Mirror Lake\'s edge might teach you the silence.)', opts: [{ t: 'Try again', go: 'bloom' }], bye: false },
      wake: { say: 'You stop. You all stop. And in the rest between the notes, the lake breathes out for the first time in months.', do: [{ narrate: [{ title: 'Where the Water Never Sings', text: `Lyra's hands lift from the sigils. The cuts on them close. She opens her eyes — one green, one brown — and looks at you, and for once there is no echo in her voice at all.\n\n"You came. You actually came." She laughs, and it cracks. "I've been singing the same four bars for a month so she wouldn't be alone. Ember. Seraphina has her at the heart of Eldenwood, under the old temple. She's using her as a prism, to sing the Bloom through into everything."\n\nShe stands, unsteadily, and the Harmonic Tuner rolls from her lap into your hands. "You carry it. I don't trust myself with the third setting anymore. Come on. I'm not leaving her one more night."` }], title: 'The Drowned Altar' },
        { flag: 'lyra_woken' }, { follow: 'lyra' }, { give: 'harmonic_tuner' }, { xp: 3000, why: 'Lyra, woken' }], opts: [{ t: 'To Eldenwood.', end: true }], bye: false },
    } },
  },
  lyra: {
    name: 'Lyra Stonehand', title: "Grom's Apprentice", place: 'drowned_altar', offset: [-2, 0], siteY: -13, if: 'lyra_woken', until: { quest: 'q13', done: true },
    look: SB_LYRA_LOOK,
    about: 'Grom\'s apprentice: half-elf, brilliant, stubborn. One green eye, one brown. She recovered the Harmonic Tuner, and spent a month beneath Stillwater singing so Ember would not be alone.',
    talk: { start: 'start', nodes: {
      start: { say: ['Keep moving. I can hear her from here.', 'Don\'t let me near the third setting. I mean it.', 'Grom\'s going to kill me about the hammer.'],
        alt: [{ if: { quest: 'q13', past: 'kael' }, say: 'She\'s below us. I can feel the Tuner pulling. Whatever happens down there — don\'t let the song have a voice.' }],
        opts: [
          { t: 'Tell me about the Tuner\'s settings.', reply: '“The first steadies. The second seals. The third binds a voice to the lattice — whoever finishes the phrase becomes the phrase. That\'s how they closed the Bloomlight breach, last time. That\'s what Seraphina wants Ember for.”', go: 'start' },
          { t: 'What is the Echo of Ancients?', if: { has: 'echo_of_ancients' }, reply: '(Her face crumples, then steadies.) “Grom kept it. Of course he did.” “It\'s a prism. A made one. Cut to Ember\'s frequency off the notes I took at the Circle. If it stands in the cradle where she stands, the song has somewhere to go that isn\'t a child. That was the whole plan. I just… couldn\'t get to her to finish it.”', go: 'start' },
          { t: 'Who is Seraphina, really?', reply: '“A scholar, once. Eldon\'s student, I think — he won\'t say. She believes the Veil is a filter, and filters can be retuned. She\'s not wrong. She just doesn\'t care what comes through.”', go: 'start' },
          { t: 'Ember dreamed of you.', reply: '(She looks away.) “I know. I heard her the whole time. She kept telling me she remembered the circle, and the tree that weeps with two songs. She was keeping me together, not the other way round.”', go: 'start' },
          { t: 'Is there a way to free Ember without… the third setting?', if: { not: 'prism_got' }, reply: '“There was a prism. A made one, cut to her frequency — I was cutting it on Grom\'s anvil for a hundred nights. I don\'t know what became of it when I left.” (She looks toward Stonebridge.) “Grom might.”', go: 'start' },
          { t: 'Wait here a moment.', do: [{ stay: 'lyra' }], reply: '“Don\'t be long.”', end: true },
          { t: 'Come with us.', do: [{ follow: 'lyra' }], reply: '“Lead on.”', end: true },
        ] },
    } },
  },
  kael_temple: {
    name: 'Kael Dorne', title: 'Hand of the Bloom', place: 'temple_gate', offset: [0, 4], if: { all: [{ quest: 'q13', stage: 'kael' }, '!kael_fight'] },
    look: SB_LOOK('human', { skin: '#c8a080', hair: 'short', hairCol: '#141414', beard: 'stubble', eyes: 'glow', eyeCol: '#a040c0', mouth: 'grin', outfit: 'pact', cols: ['#1e1428', '#8a3ac0', '#141018', '#0a0a0a'], hood: true }),
    talk: { start: 'start', nodes: {
      start: { say: '(Kael Dorne waits among the black blooms at the ruin\'s heart, robed now in violet, eyes glowing faintly.) Strangers. How… refreshing. I wondered which of you would come. The Mistress said all of you. She\'s rarely wrong.', alt: [{ if: 'mug_raided', say: '(Kael Dorne waits among the black blooms, robed in violet.) You cost me a good tavern. I\'d say no hard feelings, but the Mistress says I should be honest now that it doesn\'t matter.' }], opts: [
        { t: 'Where is Ember?', reply: '“Below. Singing. It\'s beautiful, you know. You\'ll hear it soon enough — everyone will.”', go: 'start' },
        { t: '[Insight] He\'s terrified', once: true, check: { skill: 'insight', dc: 15, pass: 'fear', fail: 'start' } },
        { t: '[Persuasion] Kael, it\'s over. Step aside.', check: { skill: 'persuasion', dc: 17, pass: 'shaken', fail: 'fight' } },
        { t: '[Intimidation] Step aside, or fall.', check: { skill: 'intimidation', dc: 17, pass: 'shaken', fail: 'fight' } },
        { t: 'Then we go through you.', go: 'fight' },
      ], bye: false },
      fear: { say: '(Under the glow, his hands are shaking. He hears it too — the song below — and he is afraid it will not stop when it is finished.)', opts: [{ t: '[Persuasion] You hear it too. It won\'t stop, Kael.', check: { skill: 'persuasion', dc: 14, pass: 'shaken', fail: 'fight' } }, { t: 'Then we go through you.', go: 'fight' }], bye: false },
      shaken: { say: '(For a moment he falters, and you see the tavern keeper again — tired, frightened, small.) “I can\'t. She\'s in my head. She\'s— ” (His eyes flare violet, and it is not his voice that finishes.) “Only through dissonance does harmony evolve.”', do: [{ flag: 'kael_shaken' }, { flag: 'kael_fight' }, { leave: 'kael_temple' }], opts: [{ t: 'Fight!', end: true }], bye: false },
      fight: { say: '(He smiles, and the black blooms around him open all at once.) “Then let me show you the song.”', do: [{ flag: 'kael_fight' }, { leave: 'kael_temple' }], opts: [{ t: 'Fight!', end: true }], bye: false },
    } },
  },
  veil_heart: {
    name: 'The Cradle of the Veil', title: 'The Temple of the Bloom', dungeon: 'seraphina_temple', room: 'boss', offset: [0, 0], prop: 'end_rod', glyph: '❂', if: { cleared: 'seraphina_temple' }, until: 'veil_sung',
    talk: { start: 'start', nodes: {
      start: { say: 'At the temple\'s heart, where the Veil listens: a cradle of light and black petals, and in it Ember, small and barefoot, humming. Her eyes are closed. The Bloom\'s song pours through her into every root in Eldenwood. Seraphina\'s ritual is broken, but the song does not stop by itself. It has to be finished.', opts: [
        { t: 'Set the Echo of Ancients in the cradle beside her', if: { has: 'echo_of_ancients' }, go: 'prism' },
        { t: 'Lyra steps forward without a word', if: { lacks: 'echo_of_ancients' }, go: 'lyra' },
      ], bye: false },
      prism: { say: 'The prism catches the light of the cradle and begins, very softly, to hum Ember\'s note. Lyra turns the Harmonic Tuner to its first setting — the one meant for us — and looks at you. "Sing. All of it."', opts: [
        { t: 'Sing the whole Rootsong: Vale, Willow, the backward breath, the silence, and the last line', if: { all: ['rootsong_whole', 'rootsong_reversed', 'silent_verse'] }, go: 'good' },
        { t: '[Performance] Sing what you know of it', check: { skill: 'performance', dc: 16, pass: 'good', fail: 'falter' } },
      ], bye: false },
      falter: { say: 'The song catches. The prism flickers. Lyra keeps the Tuner steady: "Again. From the root."', opts: [{ t: 'Again, from the root', go: 'prism' }], bye: false },
      good: { say: 'You sing.', do: [{ take: 'echo_of_ancients' }, { flag: 'ending_good' }, { flag: 'veil_sung' }, { complete: 'q13' }, { end: 'good' }], opts: [], bye: false },
      lyra: { say: 'Without a prism, the song has nowhere to go but through a voice. (Lyra\'s hand is already on the Tuner\'s third setting.) “Don\'t,” you start — and she smiles at Ember the way Mira does. “Don\'t finish the phrase,” she told you once, “unless you\'re ready to become it.” She was ready.', opts: [
        { t: 'Let her.', do: [{ flag: 'ending_lyra' }, { flag: 'veil_sung' }, { complete: 'q13' }, { end: 'lyra' }], end: true },
        { t: 'Wait — there must be another way. (Grom has something of hers.)', if: { not: 'prism_got' }, reply: 'Lyra lowers her hand, trembling. “Then be quick. She can\'t hold it forever. Use your crystal — go, and come back.”', end: true },
      ], bye: false },
    } },
  },
});
// the Corrupted Heart wakes when Kael chooses to fight; and falters if you shook him
Object.assign(SB.places.temple_gate, { bossIf: 'kael_fight', onClear: [{ narrate: [{ title: 'The Corrupted Heart', text: `Kael Dorne falls among the black blooms, and the violet goes out of his eyes. "It doesn't stop," he whispers. "When it's finished. It doesn't stop." Then nothing.\n\nBeneath the ruin, a door of black stone carries a lock shaped like a twisting key. The Thalara seal-key turns in it as if it remembers the hand that last turned it. Stairs spiral down into the dark, and from below comes singing — a child's voice, and a woman's, perfectly in tune.` }] }, { flag: 'temple_open' }] });
Object.assign(SB.creatures.kael_hand, { weakIf: 'kael_shaken', weakLine: 'Kael fights like a man arguing with himself' });
Object.assign(SB.places.seraphina_temple, { onClear: [{ narrate: [{ title: 'The Harmonized', text: `Seraphina falls to her knees in the centre of her ritual, and still she is smiling.\n\n"You think this ends it? The Veil is a filter. Filters can be retuned. Someone will always sing." The light leaves her pendant first, then her eyes.\n\nThe temple goes quiet except for one sound: a child, humming, in the cradle at the heart of the Veil. The song doesn't stop by itself. It has to be finished.` }] }] });

// the epilogue: everyone where they belong
Object.assign(SB.npcs, {
  ember: {
    name: 'Ember', title: 'Home', town: 'oakhaven', post: 'house_s#0', bpos: [2, 4], if: { quest: 'q13', done: true },
    look: SB_EMBER_LOOK,
    about: 'Mira\'s granddaughter. She sleeps through the night now, and hums ordinary songs in the mornings.',
    talk: { start: 'start', nodes: { start: { say: ['Gran says I\'m not allowed to draw sigils anymore. I draw birds now. Look.', 'The trees talk again. Not words. Just… happy noises.', 'You sang it right. I heard you.'],
      alt: [{ if: 'ending_lyra', say: 'Lyra was singing with me the whole time, you know. She still is, a bit. When the wind goes through the stones.' }], opts: [] } } },
  },
  lyra_home: {
    name: 'Lyra Stonehand', title: 'Smith of the Stalwart Smithy', town: 'stonebridge', post: 'smithy', bpos: [1, 2], if: { all: [{ quest: 'q13', done: true }, 'ending_good'] },
    look: Object.assign({}, SB_LYRA_LOOK, { outfit: 'furs', cols: ['#5a3a2a', '#c8a040', '#4a3424', '#2a1a10'] }),
    about: 'Back at Grom\'s anvil, burning his good apron.',
    talk: { start: 'start', nodes: { start: { say: ['Grom says I owe him a hundred nights of sweeping. Worth it.', 'I\'m making Ember a chime. A plain one. One note, the right one.', 'You know the strangest thing? It\'s quiet. Properly quiet. I\'d forgotten.'], opts: [] } } },
  },
  fate_end: {
    name: 'Fate', title: 'Courier', town: 'stonebridge', post: 'plaza', if: { quest: 'q13', done: true }, until: 'fate_farewell', unlisted: true,
    look: SB_LOOK('human', { skin: '#e8c4a0', hair: 'wild', hairCol: '#8a5a2a', eyes: 'wide', eyeCol: '#7a6a3a', mouth: 'smile', marks: 'freckles', outfit: 'traveller', cols: ['#7a7a6a', '#3a6a3a', '#4a4a3a', '#3a2414'], cloak: true }),
    talk: { start: 'start', nodes: { start: { say: '(She\'s sitting on the fountain\'s edge with no satchel at all.) No letters today. First time in… well. In a long time. (She looks at her hands, which are fading a little at the edges, the way ink does.) I remembered where everybody was supposed to be. Now they are. Thank you for remembering what I couldn\'t.',
      do: [{ flag: 'fate_farewell' }], opts: [{ t: 'Who were you, Fate?', reply: '(She smiles.) “The seventh singer. The youngest. The one who forgot her name so the Willow could keep it.” (When you blink, the fountain\'s edge is empty, and warm.)', do: [{ leave: 'fate_end' }], end: true }, { t: 'Goodbye, Fate.', do: [{ leave: 'fate_end' }], end: true }], bye: false } } },
  },
});
sbAlt('mira', { all: [{ quest: 'q13', done: true }, 'ending_lyra'] }, 'She\'s home. She sleeps through the night now. (She takes your hands.) And the half-elf girl — Ember tells me she sings with the stones. I put flowers up at the Circle for her, every morning.', 'after');

// ---- Thornmere: the Lantern Bearer --------------------------------------------------------------------------------------------
Object.assign(SB.npcs, {
  aldwyn: {
    name: 'Mother Aldwyn', title: 'Elder Priestess of the Pale Flame', town: 'thornmere', post: 'chapel', held: 'holy_symbol',
    look: SB_LOOK('human', { skin: '#e8d0b8', hair: 'long', hairCol: '#e8e8e8', eyes: 'narrow', eyeCol: '#9a9ab0', mouth: 'stern', outfit: 'vestments', cols: ['#e8e8f0', '#9ab0d0', '#7a7a84', '#4a4a54'], hood: true }),
    about: 'Keeper of Thornmere\'s ancient cleansing rites. She has not slept properly since the lanterns began to walk.',
    talk: { start: [{ if: { quest: 'sq_thornmere', stage: 'back' }, node: 'back' }, { if: { quest: 'sq_thornmere', done: true }, node: 'after' }], nodes: {
      start: { say: ['The Pale Flame does not go out. Neither do we.', 'Mind the thorns over the door, child. They are there for a reason.'], opts: [
        { t: 'What troubles Thornmere?', if: { quest: 'sq_thornmere', notStarted: true }, go: 'lanterns' },
        { t: 'Bless us against the dark.', if: { quest: 'sq_thornmere', notStarted: true }, reply: '“Light my lanterns first, and I will.”', go: 'start' },
      ] },
      lanterns: { say: 'The Lantern Wraiths. Spirits from the Stillwater Graves, outside the town — the drowned town\'s dead, brought here when the water stopped. They carry lights and lure travellers into the bog. Last night little Ilsa, our candlemaid, followed them. She never speaks, and she never goes out at night. She did last night.', opts: [{ t: 'We\'ll bring her back.', do: [{ quest: 'sq_thornmere' }, { reveal: ['thornmere_graves'] }], reply: '“The prophecy by the Sunken Shrine speaks of a Lantern Bearer who will light the forgotten path. I never thought it would be a child. Go. Before the moon is full.”', end: true }], bye: false },
      back: { say: 'Ilsa! (She gathers the girl into her robes.) The lanterns in the graves have gone out — all but hers. The Lantern Bearer, lighting the forgotten path home. (She lights a slender candle from the chapel\'s flame and presses it into your hand.) The Pale Flame goes with you now. And Rook\'s archive has something you should see.', do: [{ complete: 'sq_thornmere' }], opts: [] },
      after: { say: 'The Pale Flame burns steadier since you came. So does Ilsa.', opts: [] },
    } },
  },
  rook: {
    name: 'Rook Thalen', title: 'Captain of the Mirewatch', town: 'thornmere', post: 'tower', held: 'bow',
    look: SB_LOOK('human', { body: 'broad', skin: '#b8885a', hair: 'crop', hairCol: '#3a2a1a', beard: 'stubble', eyes: 'narrow', eyeCol: '#5a6a4a', mouth: 'stern', marks: 'scar', outfit: 'ranger', cols: ['#3a4a32', '#6a4a2a', '#3a3a2a', '#2a1a10'], hood: true }),
    about: 'Tired and grim, one of the last defenders of Thornmere\'s light.',
    talk: { start: 'start', nodes: { start: { say: ['Mirewatch. State your business and keep to the boards; the bog keeps what it takes.', 'Cultists in the marsh, beasts in the mire, ghosts in the graves. Pick one.'],
      opts: [
        { t: 'Any word of the cult?', reply: '“They feud with each other now — who serves the Mistress best. One lot goes east to the old temple in the heart of Eldenwood. Every one that goes, doesn\'t come back.”', do: [{ reveal: ['temple_gate'] }], go: 'start' },
        { t: 'Aldwyn says your archive has something for us.', if: { quest: 'sq_thornmere', done: true }, once: true, do: [{ letter: 'thornmere_overlays' }], reply: '“The scribes\' overlays. Gloves on — the ink bites. Lay them over any map and every line bends the same way. East. To the temple.”', go: 'start' },
      ] } } },
  },
  harlan: {
    name: 'Harlan Brimm', title: 'Keeper of the Hollow Hearth', town: 'thornmere', post: 'hall',
    look: SB_LOOK('human', { body: 'broad', skin: '#d0a080', hair: 'bald', hairCol: '#3a2a1a', beard: 'long', beardCol: '#5a4a3a', eyes: 'round', eyeCol: '#6a4a2a', mouth: 'plain', marks: 'tattoo', outfit: 'peasant', cols: ['#5a4a3a', '#3a2a1a', '#3a3a32', '#1a1a14'] }),
    about: 'A former cultist seeking redemption over blackbrew mead.',
    wares: [['rations', 4, 1, 0], ['bread', 4, 1, 0], ['bed', 1, 2, 0]],
    talk: { start: 'start', nodes: { start: { say: ['Blackbrew? It\'s mostly mead. Mostly.', 'Sit. Whisper. That\'s how it\'s done here.'],
      opts: [
        { t: 'A room for the night.', reply: '“Thorn charm over every door. You\'ll sleep.” (You rest the night.)', do: [{ rest: 'long' }], go: 'start' },
        { t: 'Something to eat.', shop: true },
        { t: '[Insight] That flower brand on your wrist…', once: true, check: { skill: 'insight', dc: 13, pass: 'past', fail: 'start' } },
      ] },
      past: { say: '(He pulls his sleeve down, then up again, slowly.) “I sang with them, once. Before the Mistress came. Back then it was all candles and talk of harmony.” “Listen: she means to sing the Bloom through a child, in the temple under Eldenwood. Kael Dorne, the Stonebridge tavern keeper, is her Hand. If you go in, go in with the light at your back. The Pale Flame burns them.”', do: [{ flag: 'harlan_told' }, { reveal: ['temple_gate'] }], opts: [] } } },
  },
  wren: {
    name: 'Sister Wren', title: 'Wyrdroot Remedies', town: 'thornmere', post: 'store',
    look: SB_LOOK('elf', { skin: '#e0e0d8', hair: 'long', hairCol: '#141414', eyes: 'glow', eyeCol: '#9ad8c0', mouth: 'smile', outfit: 'leafrobe', cols: ['#2a3a32', '#8a9a8a', '#1e2a24', '#141810'], hood: true }),
    about: 'A mysterious herbalist who trades in secrets more than coin.',
    wares: [['potion_greater_healing', 2, 26, 0], ['poultice', 2, 6, 0], ['sorrow_salve', 1, 9, 0], ['mirrorroot_powder', 1, 9, 0]],
    buys: [['deadroot_resin', 1, 4, 0], ['veil_bone', 1, 7, 0], ['glassfeather', 1, 4, 0], ['harmonic_dust', 4, 2, 0]],
    talk: { start: 'start', nodes: { start: { say: ['A secret for a secret. Or coin, if you\'re dull.', 'Smoke and herbs. The dead talk, if you let them.'],
      opts: [
        { t: 'Trade.', shop: true },
        { t: 'Tell her a secret', once: true, do: [{ give: 'sorrow_salve', n: 2 }], reply: '(She listens, and smiles as if you\'ve paid well.) “The drowned town\'s dead whisper a name at night, under the lake. Not yours. A child\'s. Take these.”', go: 'start' },
      ] } } },
  },
  ilsa: {
    name: 'Ilsa the Candlemaid', title: 'Among the Graves', place: 'thornmere_graves', offset: [2, -2], if: { all: [{ quest: 'sq_thornmere', active: true }, { cleared: 'thornmere_graves' }] }, unlisted: true,
    look: SB_LOOK('halfling', { skin: '#f0d8c0', hair: 'braids', hairCol: '#f0e0a0', eyes: 'wide', eyeCol: '#5a8ab0', mouth: 'plain', outfit: 'peasant', cols: ['#e8e0c8', '#c8a040', '#7a6a50', '#4a3424'] }),
    talk: { start: [{ if: { quest: 'sq_thornmere', stage: 'back' }, node: 'walk' }], nodes: { walk: { say: '(She holds your hand tightly, and her lantern does not flicker.)', opts: [] }, start: { say: '(A small girl kneels among the stones with a lantern that never goes out, lighting the last of the graves one by one. She doesn\'t speak. When she has lit the last one, she takes your hand, and points home.)', do: [{ stage: 'sq_thornmere:back' }, { follow: 'ilsa' }], opts: [{ t: 'Let\'s get you home.', end: true }], bye: false } } },
  },
});
Object.assign(SB.places.thornmere_graves, { onClear: [{ toast: 'The Lantern Matron gutters out. Among the stones, one light keeps burning — small, steady, and carried by a child.', kind: 'epic' }] });

// ---- Act III: the quest line ------------------------------------------------------------------------------------------------------
Object.assign(SB.quests, {
  q11: { title: 'The Mirrorroot', main: true, order: 11, summary: '"The Mirrorroot is not a place. It\'s the Bloom\'s first echo." Ember\'s true resonance anchor lies beneath the Shadowfell.',
    stages: {
      go: { goal: 'Travel south through the Shadowfell to the Mirrorroot', text: 'Across the Memory-Touched Crossing, past the Forgotten Encampment, down to where the trees twist inward.', obj: { reach: 'mirrorroot', r: 32 }, at: 'mirrorroot', next: 'wards' },
      wards: { goal: 'Descend and harmonize the Rootsong wards of the Root Spiral', obj: { flag: 'mirror_wards' }, at: 'mirrorroot', next: 'petal' },
      petal: { goal: 'Find the Petal of Preservation, and survive what guards it', obj: { flag: 'warden_down' }, at: 'mirrorroot', next: 'mirrors' },
      mirrors: { goal: 'Choose your true self in the Chamber of Mirrors That Never Were', obj: { flag: 'mirror_door' }, at: 'mirrorroot', next: 'cradle' },
      cradle: { goal: 'Face the Echoing Bloom in the Broken Cradle', obj: { clear: 'mirrorroot' }, at: 'mirrorroot', next: 'core' },
      core: { goal: 'Listen to Ember\'s Harmonic Core', obj: { flag: 'core_heard' }, at: 'mirrorroot', next: 'home' },
      home: { goal: 'Return to Stonebridge (the anchor beneath the cradle will carry you)', obj: { reach: 'stonebridge', r: 45 }, at: 'stonebridge', next: 'eldon' },
      eldon: { goal: 'Bring what you found to Eldon', obj: { flag: 'eldon_mirror' }, at: 'eldon' },
    },
    reward: { xp: 2500, gold: 250 }, onDone: [{ milestone: 10, why: 'The Mirrorroot' }, { quest: 'q12' }] },
  q12: { title: 'Stillwater', main: true, order: 12, summary: '"Find me where the song ends, where the water never sings." Lyra\'s final note points to Stillwater, the town that went silent.',
    stages: {
      go: { goal: 'Travel west past the Marshes to Stillwater', text: 'The road loops strangely beneath the pines. Mirror Lake lies on the way; touch nothing you can\'t let go of.', obj: { reach: 'stillwater', r: 50 }, at: 'stillwater', next: 'streets' },
      streets: { goal: 'Search the Silent Streets and the Bell Tower', obj: { flags: ['still_letter', 'still_bell'], n: 2 }, at: 'stillwater', next: 'docks' },
      docks: { goal: 'Solve the Harmonic Mooring at the Tether Docks', obj: { flag: 'drowned_down' }, at: 'stillwater_docks', next: 'archive' },
      archive: { goal: 'Find Lyra\'s echo in the Archive Spiral beneath the old town', obj: { flag: 'lyra_echo_met' }, at: 'archive_spiral', next: 'node' },
      node: { goal: 'Wake the archive\'s resonance node with the Half-Sigil Fragment', obj: { flag: 'archive_solved' }, at: 'archive_spiral', next: 'eldon' },
      eldon: { goal: 'Return to Eldon in Stonebridge', obj: { flag: 'eldon_still' }, at: 'eldon' },
    },
    reward: { xp: 3000, gold: 300 }, onDone: [{ milestone: 11, why: 'Stillwater' }, { quest: 'q13' }] },
  q13: { title: "The Veil's Heart", main: true, order: 13, summary: 'Seraphina means to sing the Bloom into the world through Ember, in the temple at the heart of Eldenwood. Wake Lyra. Free Ember. Finish the song.',
    stages: {
      aric: { goal: 'Meet Captain Aric at the Stonebridge Watchtower', text: '"Come to the watchtower tonight. Alone." Kael\'s new shop, Nico\'s old lab and a leaning lantern post in the square might be worth a look first.', obj: { flag: 'aric_key' }, at: 'aric', next: 'ready' },
      ready: { goal: 'Speak with Eldon before you go', text: 'Grom said he had a strongbox with Lyra\'s mark on it.', obj: { flag: 'eldon_ready' }, at: 'eldon', next: 'lake' },
      lake: { goal: 'Wake Lyra at the Drowned Altar beneath Stillwater\'s lake', hint: '"Bring her bloom. Sing the silence. Then wake me." There\'s a way down from the island in the lake. (Have you asked Grom what Lyra left with him?)', obj: { flag: 'lyra_woken' }, at: 'drowned_altar', next: 'kael' },
      kael: { goal: 'Go to the Corrupted Heart, deep in Eldenwood, with Lyra', obj: { clear: 'temple_gate' }, at: 'temple_gate', next: 'heart' },
      heart: { goal: 'Descend into the Temple of the Bloom and stop Seraphina', obj: { clear: 'seraphina_temple' }, at: 'seraphina_temple', next: 'song' },
      song: { goal: 'Free Ember: finish the song at the cradle of the Veil', obj: { flag: 'veil_sung' }, at: 'seraphina_temple' },
    },
    reward: { xp: 5000, gold: 500 }, onDone: [{ milestone: 12, why: "The Veil's Heart" }, { stay: 'lyra' }] },
  sq_thornmere: { title: 'The Lantern Bearer', order: 25, summary: 'Thornmere\'s mute candlemaid followed the Lantern Wraiths into the Stillwater Graves.',
    stages: {
      graves: { goal: 'Go to the Stillwater Graves outside Thornmere and put out the false lanterns', obj: { clear: 'thornmere_graves' }, at: 'thornmere_graves', next: 'ilsa' },
      ilsa: { goal: 'Find Ilsa among the graves', obj: { flag: '_never' }, at: 'thornmere_graves', next: 'back' },
      back: { goal: 'Bring Ilsa home to Mother Aldwyn at the Chapel of the Pale Flame', obj: { flag: '_never' }, at: 'aldwyn' },
    },
    reward: { xp: 1800, gold: 120, items: [['pale_flame', 1]] }, onDone: [{ stay: 'ilsa' }, { leave: 'ilsa' }] },
});

// ---- the dreams of Act III -----------------------------------------------------------------------------------------------------
Object.assign(SB.triggers, {
  descent: { reach: 'mirrorroot', r: 26, if: { quest: 'q11', stage: 'go' }, do: [{ narrate: [
    { title: 'Act III · The Bloom\'s First Root', text: `The trail ends at a stone platform half-consumed by root and shadow. The trees here twist inward — reaching, folding. Beneath a layer of roots, a staircase of petrified vines spirals down. Carved above it: a sigil you haven't seen before, yet one that feels achingly familiar.\n\nThe Veil here is so thin that sound and memory bleed together.` },
    { title: 'Where Roots Remember What We Forget', text: `Petrified roots spiral downward, ancient timber calcified into bone-like stone. The air grows colder — not with chill, but with absence. As you step past the threshold, your Sending Crystal pulses: not with urgency, but rhythm. A heartbeat. One you know doesn't belong to you.\n\nThe Mirrorroot is not a place. It is a self you left behind. And it remembers you.` },
  ] }] },
  watchers: { reach: 'forgotten_camp', r: 60, night: true, if: { quest: 'q11', active: true }, do: [{ toast: 'At the tree line: deer-like shapes with moss-matted fur, flowered antlers and mirrored eyes. They copy your every movement, a heartbeat late, and never come closer.', kind: 'warn' }] },
  petal_storm: { rest: true, near: 'memory_crossing', r: 220, if: { quest: 'q11', active: true }, do: [{ narrate: [{ title: 'The Petal Storm', text: `A midnight wind rises, carrying petals the colour of dried blood.\n\nAt its centre: a flickering child-shaped figure, humming backward, arms outstretched. When you reach for it, it vanishes, leaving a cracked stone at your feet pulsing faintly with mirrored light.\n\nBy morning the petals are gone. The stone is not.` }] }, { give: 'sigil_shard', n: 2 }] },
  personal_echo: { rest: true, if: { all: [{ quest: 'q11', done: true }, { quest: 'q12', stage: 'go' }] }, do: [{ narrate: [
    { title: 'The Song That Follows Silence', text: `That night, sleep brings no rest, only warnings.\n\nOne of you hears the Rootsong — in your own voice, sung backward. Another sees Lyra's shadow tuning the Tuner, frantic and afraid. A third wakes with a sigil on their palm, gone by morning.\n\nThese are not dreams.` },
    { title: 'The Song Isn\'t Over', text: `Before morning, the Sending Crystal pulses one final time.\n\nNot three tones. Not harmony. Just one note. Low. Distorted. Beckoning.\n\nFrom far across the land, where the water does not move and no voice echoes: Stillwater waits.` },
  ] }] },
  marshfire: { rest: true, near: 'mirror_lake', r: 200, if: { quest: 'q12', stage: 'go' }, do: [{ narrate: [{ title: 'The Marshfire Hollow', text: `You camp near a blackwater spring. At night, glowing mist rolls in, mimicking voices — and one of them is someone you love, calling your name from the water.\n\nIn the morning there are footprints at the water's edge. Yours. Leading in, and back out again. Beside them, half-sunk in the mud, a stone inscribed with half a sigil.` }] }, { give: 'harmonic_dust', n: 4 }] },
  stillwater_arrival: { reach: 'stillwater', r: 60, if: { quest: 'q12', active: true }, do: [{ narrate: [{ title: 'Where the Water Refuses to Sing', text: `The trees thin. The air lightens. The birds do not follow.\n\nBelow you lies Stillwater. A silver lake stretches out like polished glass. Not a ripple mars its face. It reflects nothing — not clouds, not sun, not you. The town on the shore seems preserved in amber: doors ajar, signs swaying on unbroken hinges, and not a soul in the streets.\n\nThe only thing you hear is your own heartbeat. And beneath it, the faintest vibration, like a song that wants to exist.` }] }] },
  eve_of_war: { rest: true, if: { quest: 'q13', stage: 'aric' }, do: [{ narrate: [{ title: 'The Road That Remembers You', text: `Dawn in Stonebridge. Pale mist on the cobbles. The town does not say goodbye: no cheers, no banners.\n\nJust Elara, brushing flour from her apron. Kael's shutters, closed early. Aric, tightening the straps on his armour, watching the wind instead of you. And Eldon, by the glyph-carved stone at the centre of town, his palm on the Resonance Map.\n\n"Whichever path you take," he says, without looking up, "it will remember the shape of your choice."` }] }] },
  temple_arrival: { reach: 'temple_gate', r: 46, if: { quest: 'q13', stage: 'kael' }, do: [{ narrate: [{ title: 'The Corrupted Heart', text: `Deep in Eldenwood the black blooms grow so thick they crowd out the moss. Petals open as you pass, turning to follow you like faces. Somewhere below the ground, a child is humming, and the whole forest is humming with her, a half-step out of tune.\n\nLyra grips your arm. "That's her. That's Ember."` }] }] },
});
