# Writing a campaign

A campaign is one file, `src/js/campaign/<name>.js`, that calls `campaignDefine({...})`. Positions are
`[x, z]` in blocks from the world's middle (1 block = 5 feet). Rebuild with `node tools/build.js`;
a new world made with that adventure picked uses the new data (towns and places are fixed when the
world is made, so make a fresh world to test placement changes).

```js
campaignDefine({
  id: 'shadowbloom', title: 'The Shadowbloom of Eldenwood',
  start: { town: 'brookhollow' },            // or { at: [x, z] }
  firstQuest: 'q_arrival',
  intro: [{ title, text }, ...],             // narration pages; blank lines split paragraphs
  ending: [{ title, text }],                 // or endings: { good: [...], bad: [...], default: [...] }
  towns: { id: { name, at: [x, z], style: 'plains'|'taiga'|'snowy'|'desert'|'savanna', size: 'small'|'medium'|'large',
                 buildings: ['hall', 'smithy', 'house_m', 'library', 'house_s', 'farm', 'pen', 'workshop'], desc } },
  places: { id: { name, kind: 'dungeon', at, theme: 'crypt'|'nest'|'hollow'|<custom>, boss: creatureId, mobs: [...], rooms: 7, desc, onClear: [effects] }
          | { name, kind: 'camp'|'ruin'|'tomb'|'shrine'|'standing_stones'|'grove'|'tower'|'cave'|'mine'|'manor'|'farmstead'|'cabin'|'bridge',
              at, boss, minions: [[type, n]], loot: 'ruin'|'tower'|..., lectern: letterId, bossIf: cond, desc } },
  creatures: { id: { name, base: 'ghoul'|'skeleton'|'spider'|'wolf'|'ogre'|..., hp, ac, toHit, damage, xp, boss, undead, tint: [r, g, b, a], drops: [[item, min, max, chance]] } },
  items: { id: { name, base: 'longsword'|..., plus: 1, extra: [1, 6, 'radiant'], art: 'gem'|'sword'|'amulet'|..., cols: [main, dark, light], desc, quest: true } },
  letters: { id: { title, text } },          // given with { letter: id }; read from the journal
  npcs: { id: { name, title, town, post: 'hall'|'smithy'|'library'|'plaza'|'board'|'house_m#1'|[dx, dz], at: [x, z] (outside towns),
                look: { species, body, skin, hair, hairCol, beard, eyes, eyeCol, mouth, marks, horns, ears, outfit, cols: [4 colours], hood, cloak, hat },
                held: itemId, about: 'journal note', if: cond (appears when), until: cond (gone when), mortal: false, wares: [[item, n, price, standing]],
                talk: { start: 'nodeId' | [{ if: cond, node: 'nodeId' }, ...], nodes: { id: node } } } },
  quests: { id: { title, main: true, order: 0, summary, stages: { id: stage }, first: 'stageId', reward: { xp, gold, items: [[id, n]] }, onDone: [effects] } },
  triggers: { id: { reach: placeOrTown, r: 20, if: cond, do: [effects] } },
});
```

**Dialogue nodes:** `{ say: 'text' | ['one of', 'these'], alt: [{ if: cond, say }], do: [effects], opts: [option, ...] }`.
`{p}` is the speaker's character name, `{cls}` class, `{species}` species, `{v}` the town.

**Options:** `{ t: 'label', go: 'node', if: cond, do: [effects], once: true, end: true, reply: 'one line then end',
shop: true, check: { skill: 'persuasion' | ability: 'str' | save: 'wis', dc: 13, pass: 'node', fail: 'node', passDo, failDo, xp } }`.

**Stages:** `{ goal: 'short HUD line', text: 'journal text', hint, at: placeOrTown (map marker), obj, next: 'stageId', onStart: [effects], onDone: [effects] }`.
Objectives (`obj`): `{ talk: npc }`, `{ reach: place, r }`, `{ clear: place }`, `{ kill: type | [types], n, near: place, r }`,
`{ have: item, n }`, `{ flag: name }`, `{ read: letter }`, `{ any: [obj, ...] }`. A stage with no `next` completes the quest.

**Conditions:** `'flag'`, `'!flag'`, `{ flag, not, quest, stage, done: true, active: true, notStarted: true, past: stageId, has: item, n, cls, species, met: npc, cleared: place, any: [...], all: [...] }`.

**Effects:** `{ flag }`, `{ unflag }`, `{ quest: id }`, `{ stage: 'quest:stage' }`, `{ complete: id }`, `{ fail: id }`, `{ give: item, n, party }`,
`{ take: item, n }`, `{ gold: n }`, `{ xp: n }`, `{ letter: id }`, `{ read: id }`, `{ note: 'log line' }`, `{ follow: npc }`, `{ stay: npc }`,
`{ leave: npc }`, `{ back: npc }`, `{ narrate: [pages], title }`, `{ toast, kind }`, `{ spawn: creature, n, at }`, `{ tp: place }`,
`{ heal: 'party' }`, `{ rest: 'short'|'long' }`, `{ rep: town, n }`, `{ learn: spell }`, `{ time: 0..1 }`, `{ end: 'good'|'default' }`. Any effect may carry `if`.
