// ---------------------------------------------------------------------------
// campaign/sb_regions.js — (alpha 3) the lands beyond the first campaign, from FartGarfunkel's notes.
//
//   West, the Saltwind Coast: Saltwind Harbor (a port with cult smugglers in its cellars), Smugglers' Cove, the sea and
//     the Leviathan that sings in it, drowned Aethel and its Coral Vault, the Isle of Whispers, the Sunken Forest.
//   South-west, past Stillwater, the Plains of Silent Stones: monoliths, the nomads who sing the Rootsong by heart, and
//     the Corrupted Beast that stalks their herds.
//   North-east, under Mount Cinder, the Crystal Caverns of Lumina, where the Harmonic Tuner was born.
//   Far east, on the Salt Road, Redrock Haven, a red-rock desert town plagued by pollen-mad raiders and the Scourgestinger.
//   South of Stonebridge, Duskwood: a twilight wood where corrupted fey spread the blight with illusions.
// Map: x east, z south, blocks from Stonebridge.
// ---------------------------------------------------------------------------

Object.assign(SB.towns, {
  saltwind: {
    name: 'Saltwind Harbor', at: [-940, 120], style: 'plains', size: 'medium', palisade: true, guards: 3,
    buildings: [
      { t: 'hall', sign: ['The', 'Salt & Anchor'] }, { t: 'store', sign: ['Harbormaster\'s', 'Office'] }, { t: 'smithy', sign: ['Tidewright', 'Forge'] },
      { t: 'store', sign: ['Brinewell', 'Fishmonger'] }, { t: 'tavern', sign: ['The Drowned', 'Lantern'] }, { t: 'chapel', sign: ['Shrine of the', 'Calm Sea'] },
      { t: 'library', sign: ['The Chart', 'House'] }, 'house_m', 'house_s', 'workshop', 'house_m', 'house_s', 'house_m', 'workshop',
    ],
    desc: 'A salt-bitten port on the western coast. Its trade runs on fish and rope, and lately on crates nobody will name.',
    notices: [
      { title: 'Harbor Notice', text: 'Ships leaving after dark do so without the Harbormaster\'s leave. Smuggling carries the rope. — Brin Calloway, Harbormaster' },
      { title: 'The Sea Sings', text: 'Fisherfolk near the southern cliffs say the sea sings at dawn. Those who answer it are not seen again.', if: { quest: 'sq_aethel', undone: true } },
      { title: 'Reward', text: 'For the beast in the bay that drowns our boats and fills our heads with whispers. Speak to the Harbormaster.', if: { quest: 'sq_leviathan', undone: true } },
    ],
  },
  redrock: {
    name: 'Redrock Haven', at: [1060, -260], style: 'desert', size: 'small', palisade: true, guards: 2,
    buildings: [{ t: 'hall', sign: ['The Dry', 'Well Inn'] }, { t: 'store', sign: ['Salt Road', 'Traders'] }, { t: 'smithy', sign: ['Sandglass', 'Smithy'] }, { t: 'tower', sign: ['The', 'Lookout'] }, 'house_s', 'house_m', 'house_s'],
    desc: 'A walled stop on the Salt Road, carved from red stone. The caravans are fewer every month.',
    notices: [{ title: 'Caravans Beware', text: 'Raiders in the canyons, eyes yellow as pollen. They don\'t want our goods. They want us to breathe.', if: { quest: 'sq_spores', undone: true } }],
  },
});

Object.assign(SB.places, {
  // the Saltwind Coast
  smugglers_cove: { name: "Smugglers' Cove", kind: 'dungeon', at: [-1010, 290], theme: 'marsh', boss: 'smuggler_captain', mobs: ['cove_smuggler', 'bloom_cultist'], rooms: 7, desc: 'A cove hidden by the tides and fog, with docks and caves where the cult stores its cargo.', onClear: [{ letter: 'smuggler_ledger' }, { flag: 'cove_cleared' }] },
  leviathan_deep: { name: 'The Singing Deep', kind: 'drowned_altar', at: [-1120, 40], size: 10, boss: 'leviathan', wake: 22, bossIf: { quest: 'sq_leviathan', active: true }, noTrail: true, desc: 'Deep water off the harbor, where the sea hums in your teeth.' },
  aethel: { name: 'Sunken Village of Aethel', kind: 'ruin', at: [-1150, 380], size: 12, minions: [['drowned_villager', 4]], noTrail: true, desc: 'A drowned village. Roofs under the waves, doors that open onto water, and something sealed beneath.' },
  coral_vault: { name: 'The Coral Vault', kind: 'dungeon', at: [-1180, 430], theme: 'archive', boss: 'coral_warden', mobs: ['drowned_villager', 'drowned_echo'], rooms: 6, noTrail: true, desc: 'Under Aethel, a vault of coral and drowned resonance crystals.', onClear: [{ give: 'sigil_coral' }, { flag: 'coral_cleared' }] },
  isle_whispers: { name: 'The Isle of Whispers', kind: 'standing_stones', at: [-1300, -80], size: 10, minions: [['echo_shade', 3]], lectern: 'echoing_ruins', noTrail: true, desc: 'A small isle wrapped in harmonic fog. Echoes of other realms loop in its ruins.' },
  sunken_forest: { name: 'The Sunken Forest', kind: 'grove', at: [-860, 520], size: 10, minions: [['drowned_villager', 3], ['bog_lurker', 1]], desc: 'A flooded wood between Saltwind and Stillwater, its trees standing in cursed water.' },
  // the Plains of Silent Stones
  nomad_camp: { name: 'Camp of the Silent Singers', kind: 'camp', at: [-420, 780], size: 9, desc: 'Nomad tents among the monoliths. Their elders sing the Rootsong by heart, an older version than any book holds.' },
  silent_monoliths: { name: 'The Silent Stones', kind: 'standing_stones', at: [-300, 880], size: 11, minions: [['stone_guardian', 2]], desc: 'A ring of monoliths where sound dies. Old rituals were done here; the stones remember them.' },
  beast_lair: { name: "The Beast's Hollow", kind: 'grove', at: [-560, 920], size: 9, boss: 'corrupted_beast', minions: [['shadow_wolf', 3]], wake: 20, bossIf: { quest: 'sq_beast', active: true }, desc: 'Bones and blight. Something huge sleeps here between hunts.' },
  // under Mount Cinder
  lumina_caverns: { name: 'The Crystal Caverns of Lumina', kind: 'dungeon', at: [455, -615], theme: 'lumina', boss: 'heart_guardian', mobs: ['crystal_sentinel', 'crystal_crawler'], rooms: 8, desc: 'Beneath the slag, beneath the glass veins: blue cold-fire caverns where the stone sings. The Tuner was born here.', onClear: [{ give: 'sigil_crystal' }, { flag: 'lumina_cleared' }] },
  // the Salt Road
  raider_canyon: { name: 'Pollen Canyon', kind: 'camp', at: [1150, -170], size: 10, boss: 'raider_chief', minions: [['pollen_raider', 4]], wake: 18, bossIf: { quest: 'sq_spores', active: true }, desc: 'A raiders\' camp in a red canyon, the air thick with drifting yellow spores.' },
  stinger_nest: { name: "The Scourgestinger's Dune", kind: 'nest', at: [980, -380], size: 9, boss: 'scourgestinger', wake: 16, bossIf: { quest: 'sq_stinger', active: true }, desc: 'A sandy hollow ringed with husks. The ground trembles.' },
  // Duskwood
  duskwood_glade: { name: 'The Duskwood Glade', kind: 'grove', at: [150, 360], size: 11, boss: 'thorn_queen', minions: [['blight_sprite', 4]], wake: 18, bossIf: { quest: 'sq_duskwood', active: true }, desc: 'In the twilight wood, a glade where the fey dance still, and the dance has gone wrong.' },
});

SB.lands.push(
  // the western sea, and the coast
  { at: [-1380, 180], r: 330, fade: 60, kind: 'lake', depth: 14, biome: 'ocean' },
  { at: [-1300, -80], r: 22, fade: 14, kind: 'raise', floor: 3, surface: ['sand', 'grass', 'gravel'] },
  { at: [-1150, 380], r: 30, fade: 10, kind: 'lake', depth: 6, biome: 'ocean' },
  { at: [-860, 520], r: 70, fade: 30, kind: 'marsh', biome: 'forest', humid: 0.8, surface: ['mud', 'grass', 'mud'], lily: 0.12, deco: [['cattail', 0.05]] },
  // the Plains of Silent Stones: open, pale, bone-strewn
  { at: [-420, 860], r: 190, fade: 60, kind: 'raise', floor: 4, biome: 'plains', temp: 0.25, humid: -0.25, surface: ['coarse_dirt', 'grass', 'gravel', 'grass', 'dirt_with_dry_grass'], deco: [['dead_bush', 0.02], ['bone_block', 0.002]] },
  // the red desert of the Salt Road
  { at: [1080, -260], r: 200, fade: 70, kind: 'raise', floor: 5, biome: 'desert', temp: 0.8, humid: -0.7, surface: ['red_sand', 'red_sand', 'red_sandstone', 'terracotta', 'sand'], deco: [['dead_bush', 0.03], ['cactus', 0.006]] },
  // Duskwood: dark, close, twilight
  { at: [150, 360], r: 95, fade: 35, kind: 'forest', biome: 'forest', temp: 0.0, humid: 0.6, surface: ['podzol', 'moss_block', 'grass'], deco: [['fern', 0.06], ['red_mushroom', 0.01], ['brown_mushroom', 0.01]] },
);
SB.themes.lumina = { wall: ['calcite', 'amethyst_block', 'smooth_basalt', 'calcite', 'tuff'].filter(b => true), floor: ['calcite', 'smooth_basalt', 'tuff'], pillar: 'amethyst_block', mobs: ['crystal_sentinel'], bosses: ['heart_guardian'], stairs: 'polished_tuff_stairs', slab: 'polished_tuff_slab', light: 'sea_lantern', name: 'Crystal Cavern' };

Object.assign(SB.creatures, {
  cove_smuggler: { name: 'a cove smuggler', base: 'raider', tint: [0.3, 0.4, 0.5, 0.25], hp: 26, ac: 13, toHit: 4, damage: 4, xp: 100, drops: [['gold_coin', 2, 8, 0.8]] },
  smuggler_captain: { name: 'Captain Vessa Marrow', base: 'raider', boss: true, scale: 1.15, tint: [0.2, 0.3, 0.45, 0.3], hp: 110, ac: 15, toHit: 6, damage: 7, xp: 700, drops: [['gold_coin', 20, 40, 1]] },
  leviathan: { name: 'the Leviathan of Saltwind Harbor', base: 'drowned', boss: true, scale: 3.2, tint: [0.15, 0.35, 0.5, 0.55], hp: 520, ac: 16, toHit: 9, damage: 12, xp: 5900, drops: [['leviathan_scale', 2, 4, 1]] },
  drowned_villager: { name: 'a drowned villager of Aethel', base: 'drowned', tint: [0.3, 0.6, 0.6, 0.35], hp: 30, ac: 12, toHit: 4, damage: 4, xp: 100 },
  coral_warden: { name: 'the Coral Warden', base: 'iron_golem', boss: true, scale: 1.2, tint: [0.95, 0.45, 0.5, 0.45], hp: 240, ac: 17, toHit: 8, damage: 10, xp: 2900 },
  echo_shade: { name: 'an echo shade', base: 'wraith', tint: [0.6, 0.6, 0.95, 0.45], hp: 34, ac: 13, toHit: 5, damage: 5, xp: 200 },
  bog_lurker: { name: 'a bog lurker', base: 'crocodile', tint: [0.3, 0.4, 0.2, 0.3], hp: 48, ac: 13, toHit: 5, damage: 6, xp: 300 },
  stone_guardian: { name: 'a stone guardian', base: 'iron_golem', scale: 0.9, tint: [0.6, 0.58, 0.55, 0.4], hp: 70, ac: 16, toHit: 6, damage: 8, xp: 700 },
  shadow_wolf: { name: 'a shadow wolf', base: 'wolf', tint: [0.1, 0.05, 0.15, 0.6], hp: 30, ac: 13, toHit: 5, damage: 5, xp: 200 },
  corrupted_beast: { name: 'the Corrupted Beast of the Plains', base: 'wolf', boss: true, scale: 2.4, tint: [0.12, 0.02, 0.1, 0.65], hp: 260, ac: 15, toHit: 8, damage: 11, xp: 2900, drops: [['beast_fang', 1, 1, 1]] },
  crystal_sentinel: { name: 'a crystalline sentinel', base: 'iron_golem', scale: 0.85, tint: [0.55, 0.75, 1, 0.5], hp: 80, ac: 17, toHit: 7, damage: 8, xp: 1100 },
  heart_guardian: { name: 'the Guardian of the Heart of Lumina', base: 'iron_golem', boss: true, scale: 1.7, tint: [0.5, 0.8, 1, 0.55], hp: 420, ac: 18, toHit: 10, damage: 13, xp: 7200 },
  pollen_raider: { name: 'a pollen-mad raider', base: 'raider', tint: [0.85, 0.75, 0.2, 0.35], hp: 28, ac: 12, toHit: 4, damage: 5, xp: 100, drops: [['gold_coin', 1, 5, 0.6]] },
  raider_chief: { name: 'Sorn the Blooming', base: 'raider', boss: true, scale: 1.2, tint: [0.9, 0.7, 0.15, 0.4], hp: 130, ac: 14, toHit: 6, damage: 8, xp: 1100, drops: [['gold_coin', 15, 30, 1]] },
  scourgestinger: { name: 'the Scourgestinger of the Bloom', base: 'cave_spider', boss: true, scale: 3.0, tint: [0.7, 0.25, 0.15, 0.45], hp: 300, ac: 16, toHit: 8, damage: 11, xp: 2900, drops: [['stinger_barb', 1, 1, 1]] },
  blight_sprite: { name: 'a blight sprite', base: 'cinder_wisp', tint: [0.4, 0.9, 0.3, 0.5], hp: 18, ac: 14, toHit: 5, damage: 3, xp: 100 },
  thorn_queen: { name: 'the Thorn Queen of Duskwood', base: 'hex_matron', boss: true, scale: 1.2, tint: [0.35, 0.6, 0.25, 0.4], hp: 200, ac: 15, toHit: 7, damage: 8, xp: 2300, drops: [['fey_thornheart', 1, 1, 1]] },
});

Object.assign(SB.items, {
  sigil_coral: { name: 'Sigil Fragment: Coral Bloom', art: 'gem', cols: ['#e87a8a', '#5a2a3a', '#ffd0d8'], quest: true, desc: 'The ninth fragment, preserved among drowned resonance crystals under Aethel.' },
  sigil_silent: { name: 'Sigil Fragment: Silent Echo', art: 'gem', cols: ['#d8d0c0', '#5a5040', '#ffffff'], quest: true, desc: 'The tenth fragment. The nomads carried it in a song, not a stone, until now.' },
  sigil_whisper: { name: 'Sigil Fragment: Whispered Isle', art: 'gem', cols: ['#a0a0e8', '#2a2a5a', '#e0e0ff'], quest: true, desc: 'The eleventh fragment, from the spectral archivists of the Isle of Whispers.' },
  sigil_crystal: { name: 'Sigil Fragment: Crystalline Resonance', art: 'crystal', cols: ['#80d0ff', '#1a4a6a', '#e0f8ff'], quest: true, desc: 'The twelfth fragment, from the Heart of Lumina, where the Tuner was born.' },
  leviathan_scale: { name: 'Leviathan Scale', art: 'gem', cols: ['#2a5a6a', '#0a1a2a', '#80c0d0'], desc: 'Cold, heavy and faintly humming. A smith could do something with it.' },
  beast_fang: { name: 'Fang of the Corrupted Beast', art: 'dagger', cols: ['#e8e0d0', '#3a2a3a', '#ffffff'], trinket: { skills: { intimidation: 2 } }, desc: 'Carried: +2 Intimidation. The nomads will know what you did.' },
  stinger_barb: { name: 'Scourgestinger Barb', art: 'dagger', cols: ['#a03a2a', '#3a0a0a', '#ffb0a0'], desc: 'Still dripping. Alchemists pay well.' },
  fey_thornheart: { name: 'Fey Thornheart', art: 'gem', cols: ['#5aa040', '#1a3a10', '#c0ff90'], trinket: { skills: { nature: 2 } }, desc: 'The Thorn Queen\'s heart, cleansed. Carried: +2 Nature.' },
  water_breath_draught: { name: 'Draught of the Deep', art: 'potion', cols: ['#40a0c0', '#104050', '#a0f0ff'], desc: 'Breathe water for a long while. The harbor\'s divers swear by it.' },
});

Object.assign(SB.letters, {
  smuggler_ledger: { title: 'The Cove Ledger', text: `A waterlogged ledger in a careful hand.\n\n"Silvered cages, six. Tuning rods, a dozen. Black stones, wrapped. Jars of ash — do NOT open. All for the Mistress, by the Razorwood road."\n\n"N.S. paid in full. The Mug takes the rest."\n\nOn the last page, a sketch of a drowned village, and an arrow pointing down: "the Coral Vault. She wants what's under it."` },
  echoing_ruins: { title: 'The Echoing Ruins', text: `The ruins speak in borrowed voices. One echo repeats until you listen to the end of it:\n\n"She was one of us once. A Harmonist, the youngest. She heard the song from the other side of the Veil and she answered it, and it answered back. Seraphina, we called her. She did not come home the same."\n\nAnother voice, older, colder, from somewhere behind the first:\n\n"I have watched her a long time. She thinks she opens the door for the Bloom. She opens it for me."` },
  lyra_lumina: { title: "Lyra's Journal: the Descent", text: `"Beneath the slag. Beneath the glass veins. I heard it down there once — the resonance so clear it bled through stone. The forge. The first forge. I couldn't reach it. I had to seal the descent — it was collapsing under its own dissonance… the vault is only the mouth. The song lies deeper."\n\nIn the margin, in Eldon's hand: "West wall. She sealed it from the far side. Mind the cold fire."` },
});

const SB_LOOK_R = (sp, o) => SB_LOOK(sp, o);
Object.assign(SB.npcs, {
  brin: {
    name: 'Brin Calloway', title: 'Harbormaster', town: 'saltwind', post: 'store#0',
    look: SB_LOOK_R('human', { skin: '#c89070', hair: 'short', hairCol: '#5a4a3a', beard: 'short', eyes: 'narrow', eyeCol: '#4a6a8a', mouth: 'stern', marks: 'scar', outfit: 'traveller', cols: ['#2a3a5a', '#c8b890', '#3a3a3a', '#2a1a10'] }),
    about: 'Salt in his beard and a ledger under his arm. He knows every ship in the harbor, and that some of them aren\'t on his books.',
    talk: { start: [{ if: { quest: 'sq_leviathan', done: true }, node: 'after' }], nodes: {
      start: { say: ['Welcome to Saltwind. Mind the nets.', 'Busy day. Or it should be. Half my boats won\'t sail.'], opts: [
        { t: 'Why won\'t they sail?', go: 'why' },
        { t: 'We\'ll clear the cove.', if: { quest: 'sq_smugglers', notStarted: true }, do: [{ quest: 'sq_smugglers' }, { reveal: ['smugglers_cove'] }], reply: '“South along the cliffs, where the fog sits. Bring me proof and the harbor owes you.”', end: true },
        { t: 'The cove is cleared.', if: { all: [{ quest: 'sq_smugglers', active: true }, { cleared: 'smugglers_cove' }] }, do: [{ complete: 'sq_smugglers' }], go: 'beast' },
        { t: 'About that beast in the bay…', if: { all: [{ quest: 'sq_smugglers', done: true }, { quest: 'sq_leviathan', notStarted: true }] }, go: 'beast' },
        { t: 'The Leviathan is dead.', if: { all: [{ quest: 'sq_leviathan', active: true }, { cleared: 'leviathan_deep' }] }, do: [{ complete: 'sq_leviathan' }], go: 'after' },
      ] },
      why: { say: 'Two things. Smugglers in the cove to the south: cult cargo, if you ask me, and nobody does. And something in the deep water that sings. Men who hear it walk off the end of the pier.', opts: [{ t: 'Back.', go: 'start' }] },
      beast: { say: 'Then you\'re the ones for the other job. The thing in the deep. It sank three boats this month, and the crews heard singing first. Take this — the divers swear by it.', do: [{ give: 'water_breath_draught', n: 2 }], opts: [
        { t: 'We\'ll hunt it.', if: { quest: 'sq_leviathan', notStarted: true }, do: [{ quest: 'sq_leviathan' }, { reveal: ['leviathan_deep'] }], reply: '“West of the harbor mouth, where the water goes black. Gods keep you.”', end: true },
        { t: 'Not yet.', end: true }] },
      after: { say: 'The boats are out again. You hear that? Gulls. Just gulls. Drinks are on the harbor at the Salt & Anchor, as long as you\'re in town.', opts: [] },
    } },
  },
  old_moira: {
    name: 'Old Moira', title: 'Net-mender', town: 'saltwind', post: 'plaza',
    look: SB_LOOK_R('human', { skin: '#d8b090', hair: 'bun', hairCol: '#d8d8d0', eyes: 'round', eyeCol: '#6a8a9a', mouth: 'plain', outfit: 'peasant', cols: ['#5a6a7a', '#c8c0a8', '#4a4a4a', '#3a2a1a'] }),
    about: 'She has mended nets on the same step for fifty years, and she remembers Aethel before the water came.',
    talk: { start: [{ if: { quest: 'sq_aethel', done: true }, node: 'after' }], nodes: {
      start: { say: 'The sea sings at dawn, lovey. Always has, since Aethel went under. My gran was born there. Bells under the water, she used to say.', opts: [
        { t: 'What happened to Aethel?', go: 'aethel' },
        { t: 'We\'ll go down to Aethel.', if: { quest: 'sq_aethel', notStarted: true }, do: [{ quest: 'sq_aethel' }, { reveal: ['aethel', 'coral_vault'] }], reply: '“South-west, past the cove, where the roofs show at low tide. There\'s a vault under it, coral-grown. Whatever\'s sealed there, the sea\'s been guarding it a long time.”', end: true },
        { t: 'We found what was under Aethel.', if: { all: [{ quest: 'sq_aethel', active: true }, { has: 'sigil_coral' }] }, do: [{ complete: 'sq_aethel' }], go: 'after' },
      ] },
      aethel: { say: 'The water rose in a night. Not a storm, mind — no wind. The whole village just… went down, singing. Some say the planar wars woke something in the trench beyond. Some say it was the Veil.', opts: [{ t: 'Back.', go: 'start' }] },
      after: { say: 'You\'ve the look of someone who heard the bells. Sit a while. I\'ll mend your cloak.', opts: [] },
    } },
  },
  osha: {
    name: 'Elder Osha', title: 'Singer of the Silent Stones', place: 'nomad_camp', offset: [2, 1],
    look: SB_LOOK_R('sunmane', { skin: '#c08038', hair: 'wild', hairCol: '#e0d8c8', eyes: 'slit', eyeCol: '#d8a020', mouth: 'plain', tail: true, outfit: 'furs', cols: ['#8a6a4a', '#c8b890', '#5a4a3a', '#3a2a1a'] }),
    about: 'The oldest of the nomads. She carries the Rootsong in her memory, a verse older than any book.',
    talk: { start: [{ if: { quest: 'sq_beast', done: true }, node: 'after' }], nodes: {
      start: { say: ['Walk softly. The stones are listening.', 'You come from the towns. You carry their noise.'], opts: [
        { t: 'You sing the Rootsong?', go: 'song' },
        { t: 'What hunts your herds?', go: 'beast' },
        { t: 'The Beast is dead.', if: { all: [{ quest: 'sq_beast', active: true }, { cleared: 'beast_lair' }] }, do: [{ complete: 'sq_beast' }, { give: 'sigil_silent' }], go: 'gift' },
      ] },
      song: { say: 'We sing it as it was sung before the Veil Wars, before anyone wrote it down. There is a verse in it with no sound. Only silence. The towns forgot it. We did not.', opts: [{ t: 'Back.', go: 'start' }] },
      beast: { say: 'A great wolf of shadow. It takes a beast a night and leaves the bones in the hollow to the south. Kill it, and I will give you the verse we have kept.', opts: [
        { t: 'We\'ll kill it.', if: { quest: 'sq_beast', notStarted: true }, do: [{ quest: 'sq_beast' }, { reveal: ['beast_lair'] }], reply: '“Go by day. At night it is the dark itself.”', end: true }, { t: 'Back.', go: 'start' }] },
      gift: { say: 'Then listen. (She sings — and halfway through, she stops, and the silence that follows is part of the song. It settles in your chest like a stone.) That is the Silent Echo. Carry it to whoever is mending the song.', opts: [{ t: 'Thank you, Elder.', end: true }] },
      after: { say: 'The herds sleep again. The stones are quieter for it.', opts: [] },
    } },
  },
  kesh: {
    name: 'Warden Kesh', title: 'Warden of Redrock Haven', town: 'redrock', post: 'tower',
    look: SB_LOOK_R('orc', { skin: '#8a6a4a', hair: 'tail', hairCol: '#1a1a1a', eyes: 'narrow', eyeCol: '#c8a040', mouth: 'stern', tusks: true, outfit: 'ranger', cols: ['#a04a2a', '#d8b890', '#4a3a2a', '#2a1a10'] }),
    about: 'Keeps the walls of Redrock Haven, and the caravans alive when she can.',
    talk: { start: [{ if: { all: [{ quest: 'sq_spores', done: true }, { quest: 'sq_stinger', done: true }] }, node: 'after' }], nodes: {
      start: { say: ['Water\'s two coppers a cup. Information\'s free, today.', 'The Salt Road used to be busy.'], opts: [
        { t: 'Tell us about the raiders.', if: { quest: 'sq_spores', notStarted: true }, go: 'raiders' },
        { t: 'The raiders are finished.', if: { all: [{ quest: 'sq_spores', active: true }, { cleared: 'raider_canyon' }] }, do: [{ complete: 'sq_spores' }], go: 'stinger' },
        { t: 'Anything else out there?', if: { all: [{ quest: 'sq_spores', done: true }, { quest: 'sq_stinger', notStarted: true }] }, go: 'stinger' },
        { t: 'The Scourgestinger is dead.', if: { all: [{ quest: 'sq_stinger', active: true }, { cleared: 'stinger_nest' }] }, do: [{ complete: 'sq_stinger' }], go: 'after' },
      ] },
      raiders: { say: 'Raiders in the canyon east of here. Not normal raiders. Their eyes have gone yellow and they breathe out pollen. They don\'t steal. They try to make you breathe it.', opts: [
        { t: 'We\'ll deal with them.', do: [{ quest: 'sq_spores' }, { reveal: ['raider_canyon'] }], reply: '“Cover your mouths. And if one of you starts smiling for no reason, run.”', end: true }, { t: 'Back.', go: 'start' }] },
      stinger: { say: 'There\'s a scorpion south of here the size of a cart. We call it the Scourgestinger. The black flowers grow where it walks.', opts: [
        { t: 'We\'ll hunt it.', if: { quest: 'sq_stinger', notStarted: true }, do: [{ quest: 'sq_stinger' }, { reveal: ['stinger_nest'] }], reply: '“Its barb is worth a fortune to the right alchemist. Its sting is worth a funeral.”', end: true }, { t: 'Not today.', end: true }] },
      after: { say: 'Caravans again. Dust and bells on the Salt Road. That\'s your doing.', opts: [] },
    } },
  },
});

Object.assign(SB.quests, {
  sq_smugglers: { title: 'The Cove of Fog', order: 40, summary: 'The Harbormaster of Saltwind wants the smugglers in the cove to the south gone.',
    stages: { cove: { goal: "Clear Smugglers' Cove, south of Saltwind", obj: { clear: 'smugglers_cove' }, at: 'smugglers_cove', next: 'back' }, back: { goal: 'Report to Brin Calloway, the Harbormaster', obj: { flag: '_never' }, at: 'brin' } },
    reward: { xp: 900, gold: 60 } },
  sq_leviathan: { title: 'The Song in the Deep', order: 41, summary: 'Something in the deep water off Saltwind sings sailors to their deaths.',
    stages: { hunt: { goal: 'Slay the Leviathan in the Singing Deep, west of the harbor', obj: { clear: 'leviathan_deep' }, at: 'leviathan_deep', next: 'back' }, back: { goal: 'Tell the Harbormaster', obj: { flag: '_never' }, at: 'brin' } },
    reward: { xp: 4000, gold: 150, items: [['leviathan_scale', 2]] } },
  sq_aethel: { title: 'Bells Under the Water', order: 42, summary: 'Old Moira says a vault lies under drowned Aethel, guarded by the sea.',
    stages: { vault: { goal: 'Find the Coral Vault beneath Aethel', obj: { clear: 'coral_vault' }, at: 'coral_vault', next: 'back' }, back: { goal: 'Tell Old Moira in Saltwind', obj: { flag: '_never' }, at: 'old_moira' } },
    reward: { xp: 2500, gold: 80 } },
  sq_isle: { title: 'Where the Veil First Sang', order: 43, summary: 'A song drifts from an isle no map recalls, west past the coastal cliffs.',
    stages: { isle: { goal: 'Reach the Isle of Whispers and hear the Echoing Ruins', obj: { reach: 'isle_whispers' }, at: 'isle_whispers' } },
    reward: { xp: 2000, items: [['sigil_whisper', 1]] }, onDone: [{ letter: 'echoing_ruins' }, { flag: 'seraphina_origin' }] },
  sq_beast: { title: 'The Beast of the Plains', order: 44, summary: 'A shadow-wolf stalks the nomads\' herds on the Plains of Silent Stones.',
    stages: { hunt: { goal: "Kill the Corrupted Beast in its hollow, south of the nomads' camp", obj: { clear: 'beast_lair' }, at: 'beast_lair', next: 'back' }, back: { goal: 'Return to Elder Osha', obj: { flag: '_never' }, at: 'osha' } },
    reward: { xp: 2500, gold: 40 } },
  sq_lumina: { title: 'The First Forge', order: 45, summary: 'Lyra sealed a descent beneath the Ember Vault. The Tuner was born below it.',
    stages: { descend: { goal: 'Enter the Crystal Caverns of Lumina, west of Mount Cinder, and reach the Heart', obj: { clear: 'lumina_caverns' }, at: 'lumina_caverns' } },
    reward: { xp: 6000, gold: 120 } },
  sq_spores: { title: 'Yellow Eyes on the Salt Road', order: 46, summary: 'Raiders maddened by Bloom pollen prey on the caravans near Redrock Haven.',
    stages: { canyon: { goal: 'Break the raiders in Pollen Canyon, east of Redrock Haven', obj: { clear: 'raider_canyon' }, at: 'raider_canyon', next: 'back' }, back: { goal: 'Report to Warden Kesh', obj: { flag: '_never' }, at: 'kesh' } },
    reward: { xp: 1200, gold: 70 } },
  sq_stinger: { title: 'The Scourgestinger', order: 47, summary: 'A scorpion the size of a cart, with black blooms in its tracks.',
    stages: { hunt: { goal: "Slay the Scourgestinger on its dune, south-west of Redrock Haven", obj: { clear: 'stinger_nest' }, at: 'stinger_nest', next: 'back' }, back: { goal: 'Tell Warden Kesh', obj: { flag: '_never' }, at: 'kesh' } },
    reward: { xp: 3000, gold: 90 } },
  sq_duskwood: { title: 'The Thorn Queen', order: 48, summary: 'In Duskwood, south of Stonebridge, the fey have turned, and their glamours spread the blight.',
    stages: { glade: { goal: 'Cleanse the Duskwood Glade', obj: { clear: 'duskwood_glade' }, at: 'duskwood_glade' } },
    reward: { xp: 2300, gold: 60 } },
});

Object.assign(SB.triggers, {
  saltwind_song: { reach: 'saltwind', r: 70, if: { quest: 'sq_isle', notStarted: true }, do: [{ narrate: [{ title: 'Saltwind', text: 'The road comes down to the sea at last: gulls, tar, nets drying on poles, a harbor wall of grey stone.\n\nAnd under the noise of it, so faint you might be imagining it — to the west, past the coastal cliffs and the silver reeds, a song drifts from an isle no map recalls.' }] }, { quest: 'sq_isle' }, { reveal: ['isle_whispers'] }] },
  plains_silence: { reach: 'silent_monoliths', r: 40, if: '!plains_heard', do: [{ flag: 'plains_heard' }, { narrate: [{ title: 'The Silent Stones', text: 'The wind drops. Your footsteps stop making a sound. Eldon\'s words come back to you: "If you hear silence — true silence — know that the Veil is thinning."' }] }] },
  ember_descent: { reach: 'ember_vault', r: 30, if: { all: [{ quest: 'q5', done: true }, { quest: 'sq_lumina', notStarted: true }] }, do: [{ letter: 'lyra_lumina' }, { quest: 'sq_lumina' }, { reveal: ['lumina_caverns'] }] },
  duskwood_edge: { reach: 'duskwood_glade', r: 90, if: { quest: 'sq_duskwood', notStarted: true }, do: [{ narrate: [{ title: 'Duskwood', text: 'Noon turns to dusk between one tree and the next. Lights bob in the undergrowth — sprites, or what used to be sprites. Something laughs, high and wrong, and the path you came by is gone.' }] }, { quest: 'sq_duskwood' }] },
});

// the town clerks, who sell you a house (campaign/companions.js)
const SB_CLERK = (name, town, post, price, look) => ({
  name, title: 'Town Clerk', town, post, look: SB_LOOK('human', look),
  about: 'Keeps the town\'s ledgers, and sells the odd plot of land to people who look like they\'ll stay.',
  talk: { start: 'start', nodes: { start: { say: ['Deeds, taxes, complaints. Which is it?', 'If you\'re staying, you\'ll want a roof.'], opts: [
    { t: `Buy a house here (${price} gp)`, do: [{ house: town, price }], end: true },
    { t: 'Just looking.', end: true }] } } },
});
Object.assign(SB.npcs, {
  clerk_sb: SB_CLERK('Edda Thatchwell', 'stonebridge', 'council', 250, { skin: '#e8c8a8', hair: 'bun', hairCol: '#6a4a2a', eyes: 'narrow', eyeCol: '#5a5a3a', mouth: 'stern', outfit: 'noble', cols: ['#4a3a5a', '#c8b890', '#3a3a3a', '#2a1a10'] }),
  clerk_oak: SB_CLERK('Rowan Birchwhistle', 'oakhaven', 'council', 180, { skin: '#d8b090', hair: 'short', hairCol: '#8a6a3a', beard: 'short', eyes: 'round', eyeCol: '#6a8a4a', mouth: 'smile', outfit: 'peasant', cols: ['#4a6a3a', '#c8b890', '#5a4a3a', '#2a1a10'] }),
  clerk_salt: SB_CLERK('Marla Quayle', 'saltwind', 'library', 200, { skin: '#c89878', hair: 'tail', hairCol: '#2a2a2a', eyes: 'narrow', eyeCol: '#4a6a8a', mouth: 'plain', outfit: 'traveller', cols: ['#2a4a6a', '#c8c0a8', '#3a3a3a', '#2a1a10'] }),
});

// ---- (alpha 3) more of Stonebridge and Oakhaven, from the notes' gazetteer --------------------------------------------
Object.assign(SB.places, {
  silent_cemetery: { name: 'Silent Stones Cemetery', kind: 'tomb', at: [-40, 160], size: 9, minions: [['ghast', 1], ['skeleton', 2]], wake: 12, desc: 'A peaceful graveyard on the outskirts of Stonebridge, grown uneasy. Whispers at night; people vanish near it.' },
  wishing_wall: { name: 'The Wishing Wall', kind: 'shrine', at: [110, -110], size: 6, desc: 'A crumbling garden wall where townsfolk leave prayers and tokens. Sometimes the tokens vanish.' },
  underways: { name: 'The Underways', kind: 'dungeon', at: [-160, 175], theme: 'crypt', boss: 'rat_king', mobs: ['giant_rat', 'bloom_cultist'], rooms: 6, desc: 'Old sewers and tunnels under Stonebridge, rumoured to run to deeper cult routes. Black roots, corrupted rats, whispering voices.', onClear: [{ flag: 'underways_cleared' }] },
  sawtooth_mill: { name: 'Sawtooth Mill', kind: 'farmstead', at: [520, 140], size: 8, boss: 'mill_construct', minions: [['awakened_shrub', 3]], wake: 14, bossIf: { quest: 'sq_mill', active: true }, desc: 'A lumber mill at Oakhaven\'s edge. Cursed wood, flickering lights, and something walking in the lumber yard at night.' },
});
Object.assign(SB.creatures, {
  rat_king: { name: 'the Rat King of the Underways', base: 'giant_rat', boss: true, scale: 2.6, tint: [0.2, 0.1, 0.25, 0.5], hp: 90, ac: 13, toHit: 5, damage: 6, xp: 450, drops: [['gold_coin', 10, 20, 1]] },
  mill_construct: { name: 'a cursed timber construct', base: 'awakened_tree', boss: true, scale: 1.1, tint: [0.35, 0.15, 0.4, 0.4], hp: 110, ac: 13, toHit: 6, damage: 9, xp: 700, drops: [['heartwood', 1, 2, 1]] },
});
Object.assign(SB.npcs, {
  etta: {
    name: 'Etta Narlane', title: "High Scribe of the Scribe's Quill", town: 'stonebridge', post: 'library#1',
    look: SB_LOOK('human', { skin: '#e8d0b8', hair: 'bun', hairCol: '#8a8a8a', eyes: 'round', eyeCol: '#6a5a4a', mouth: 'plain', outfit: 'archrobe', cols: ['#3a4a6a', '#c8b890', '#3a3a3a', '#2a1a10'], hat: 'none' }),
    about: 'Keeps the tall stone-and-oak library under Eldon. She knows a little of the Harmonic Tuner, and the books have started humming at night.',
    talk: { start: 'start', nodes: { start: { say: ['Quiet, please. The books are… restless.', 'Ink bleeding, pages humming. I keep notes on it. Someone should.'],
      alt: [{ if: { quest: 'q5', active: true }, say: 'The tomes on the Tuner have begun to sing. Not loudly. Just one note, over and over, like something tuning up.' }, { if: 'seraphina_origin', say: 'A Harmonist, you say? The youngest of the First? There\'s a name scratched out of our oldest register. I always wondered whose.' }],
      opts: [{ t: 'What do you know of the Harmonic Tuner?', reply: '“Lyra recovered it, or rebuilt it, depending on which documents you believe. It has three settings. The third is in no book I have.”', go: 'start' }, { t: 'Anything strange lately?', reply: '“Ghost harmonics on the riverbank at night. And a blank tome that hums. One page burns the moment it\'s read aloud. I\'ve stopped reading aloud.”', go: 'start' }] } } },
  },
  velthra: {
    name: 'Velthra Duskgild', title: 'Pawnbroker', town: 'stonebridge', post: 'house_m#2',
    look: SB_LOOK('tiefling', { skin: '#8a4a8a', hair: 'long', hairCol: '#1a1a24', horns: 'curled', eyes: 'glow', eyeCol: '#e0a040', mouth: 'smile', outfit: 'silks', cols: ['#5a2a4a', '#c8a040', '#2a2a2a', '#1a1010'] }),
    about: 'Buys and lends, no questions asked. Some of what crosses her counter came from the cult\'s crates.',
    wares: [['thieves_tools', 1, 20, 0], ['rope', 2, 1, 0], ['lantern', 1, 4, 0], ['potion_of_healing', 2, 40, 1], ['dagger', 2, 2, 0]],
    talk: { start: 'start', nodes: { start: { say: ['Everything has a price. Even what you\'re not selling.', 'Looking or lending?'], opts: [{ t: 'Show me what you have.', shop: true },
      { t: 'Any cult goods come through here?', if: 'mug_secrets', reply: '“Silvered cages. Tuning rods. A jar of ash I wouldn\'t open for all the gold in Saltwind. They came by the coast. Ask at the harbor about the cove.”', do: [{ reveal: ['smugglers_cove'] }], go: 'start' }] } } },
  },
  tobin: {
    name: 'Tobin Ashgrove', title: 'Sawyer of the Sawtooth Mill', town: 'oakhaven', post: 'workshop#0',
    look: SB_LOOK('dwarf', { skin: '#d8a882', hair: 'crop', hairCol: '#6a3a1a', beard: 'braided', eyes: 'narrow', eyeCol: '#4a3a2a', mouth: 'stern', outfit: 'peasant', cols: ['#6a4a2a', '#c8b890', '#4a3a2a', '#2a1a10'] }),
    about: 'Runs the mill at the town\'s edge. He won\'t say what he saw in the lumber yard.',
    talk: { start: [{ if: { quest: 'sq_mill', done: true }, node: 'after' }], nodes: {
      start: { say: ['Mill\'s shut. Don\'t ask.', 'The wood from the forest edge hums. And at night, the logs… move.'], opts: [
        { t: 'We\'ll look into it.', if: { quest: 'sq_mill', notStarted: true }, do: [{ quest: 'sq_mill' }, { reveal: ['sawtooth_mill'] }], reply: '“Go at night. That\'s when it walks. And whatever you do, don\'t burn the cursed planks near the river.”', end: true },
        { t: 'The thing in the lumber yard is dead.', if: { all: [{ quest: 'sq_mill', active: true }, { cleared: 'sawtooth_mill' }] }, do: [{ complete: 'sq_mill' }], go: 'after' }] },
      after: { say: 'The saw\'s singing again. The ordinary way. Here, timber for your trouble, the good stuff, from the north woods.', opts: [] },
    } },
  },
});
Object.assign(SB.quests, {
  sq_mill: { title: "Oakhaven's Lumber Corruption", order: 25, summary: 'Wood felled at the forest edge has turned. Something made of it walks the Sawtooth Mill at night.',
    stages: { mill: { goal: 'Destroy what walks in the Sawtooth Mill, east of Oakhaven', obj: { clear: 'sawtooth_mill' }, at: 'sawtooth_mill', next: 'back' }, back: { goal: 'Tell Tobin at the mill', obj: { flag: '_never' }, at: 'tobin' } },
    reward: { xp: 450, gold: 30, items: [['spruce_log', 16]] } },
});
