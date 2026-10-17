// ---------------------------------------------------------------------------
// campaign/shadowbloom.js — The Shadowbloom of Eldenwood.
//
// PLACEHOLDER: a short test chain so the engine can be played start to finish while
// the real campaign (towns, people and quest line from the campaign notes) is written in.
// ---------------------------------------------------------------------------
const DEFAULT_CAMPAIGN = 'shadowbloom';

campaignDefine({
  id: 'shadowbloom',
  title: 'The Shadowbloom of Eldenwood',
  credits: 'The Shadowbloom of Eldenwood — a campaign by FartGarfunkel.',
  hint: 'Speak with the people of the town.',
  start: { town: 'brookhollow' },
  firstQuest: 'q_arrival',
  intro: [
    { title: 'The Shadowbloom of Eldenwood', text: 'This is a placeholder opening while the campaign is being written in.\n\nYou arrive at the edge of the Eldenwood, where a strange dark flower has begun to spread.' },
  ],
  ending: [{ title: 'The End', text: 'The placeholder tale is done. The real ending will be written from the campaign notes.' }],

  towns: {
    brookhollow: { name: 'Brookhollow', at: [40, 30], style: 'plains', size: 'medium', buildings: ['hall', 'smithy', 'house_m', 'library', 'house_s', 'farm', 'house_m', 'workshop'], desc: 'A quiet farming town at the edge of the Eldenwood.' },
  },
  npcs: {
    mira: { name: 'Mira Thornwell', title: 'Innkeeper', town: 'brookhollow', post: 'hall', held: null,
      look: { species: 'human', body: 'slim', skin: '#e0b48c', hair: 'tail', hairCol: '#8a2a14', beard: 'none', eyes: 'round', eyeCol: '#3a7a4a', mouth: 'smile', outfit: 'peasant', cols: ['#8a5a3a', '#e8e0c8', '#4a3a2a', '#3a2414'] },
      about: 'Runs the inn at Brookhollow. Knows everyone.',
      talk: { start: [{ if: { quest: 'q_arrival', stage: 'talk' }, node: 'first' }, { if: { quest: 'q_cellar', done: true }, node: 'after' }], nodes: {
        start: { say: 'Welcome back, {p}. What can I do for you?', opts: [{ t: 'Any work?', go: 'work', if: { quest: 'q_cellar', notStarted: true } }, { t: 'Rent a room (1 gold)', do: [{ take: 'gold_coin', n: 1 }, { rest: 'long' }], reply: 'Sleep well. You look like you needed it.', if: { has: 'gold_coin' } }] },
        first: { say: 'A {species} {cls}! We don\'t see many adventurers in Brookhollow. Something has been growing in my cellar — black petals, and a smell like a grave.', do: [{ stage: 'q_arrival:done' }], opts: [{ t: 'I\'ll take a look.', go: 'work' }] },
        work: { say: 'Down the stairs behind the bar... no, wait, it\'s spread to the old crypt past the hill. Clear it out and I\'ll pay you well.', opts: [{ t: 'Consider it done.', do: [{ quest: 'q_cellar' }], end: true }, { t: '[Persuasion] Twenty gold, up front.', check: { skill: 'persuasion', dc: 12, pass: 'paid', fail: 'nopay' } }] },
        paid: { say: 'Fine, fine. Here.', do: [{ gold: 20 }, { quest: 'q_cellar' }], opts: [{ t: 'Pleasure doing business.', end: true }] },
        nopay: { say: 'Ha! You\'ll be paid when the job is done.', do: [{ quest: 'q_cellar' }], opts: [{ t: 'Fair enough.', end: true }] },
        after: { say: 'The town is in your debt, {p}.', opts: [] },
      } } },
  },
  places: {
    crypt: { name: 'The Bloomrot Crypt', kind: 'dungeon', at: [220, -60], theme: 'crypt', boss: 'bloom_wight', mobs: ['ghoul', 'skeleton'], rooms: 7, desc: 'An old crypt where the black flowers grow thickest.' },
  },
  creatures: {
    bloom_wight: { name: 'the Bloom Wight', base: 'grave_warden', hp: 60, ac: 14, toHit: 5, damage: 6, xp: 450, boss: true, undead: true, tint: [0.5, 0.2, 0.8, 0.35] },
  },
  items: {
    shadowbloom_petal: { name: 'Shadowbloom Petal', art: 'gem', cols: ['#6a2a9a', '#2a0a4a', '#c88cff'], stack: 16, desc: 'A black petal that drinks the light.', quest: true },
  },
  letters: {},
  quests: {
    q_arrival: { title: 'Arrival', main: true, order: 0, stages: { talk: { goal: 'Speak with Mira at the inn in Brookhollow', obj: { talk: 'mira' }, at: 'brookhollow' } }, reward: { xp: 50 } },
    q_cellar: { title: 'Rot Beneath the Hill', main: true, order: 1, giver: 'mira', stages: {
      go: { goal: 'Find the Bloomrot Crypt', obj: { reach: 'crypt' }, next: 'clear', at: 'crypt' },
      clear: { goal: 'Defeat the Bloom Wight', obj: { clear: 'crypt' }, next: 'back', at: 'crypt' },
      back: { goal: 'Return to Mira', obj: { talk: 'mira' }, at: 'brookhollow' },
    }, reward: { xp: 300, gold: 40 }, onDone: [{ end: 'default' }] },
  },
});
