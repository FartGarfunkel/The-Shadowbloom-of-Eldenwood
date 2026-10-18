# Alpha 3 data spec: spells, magic items, monsters

This is the contract between the data files and the game code. The game code implements every field listed
here; data files must only use these fields (plus the ones the existing data already uses). If a spell or item
truly needs something not listed, use the closest field and add a `todo: '...'` note on that entry.

Everything is real time: 1 round ≈ 6 seconds, 1 block = 5 feet, durations in seconds
(1 minute = 60, 10 minutes = 600, 1 hour = 3600, 8 hours = 28800). Ranges and radii in blocks.

Licence: only material in the **SRD 5.2** (CC BY 4.0). Use SRD 5.2 names (Acid Arrow, not Melf's Acid Arrow;
Arcane Hand, Black Tentacles, Hideous Laughter, Tiny Hut, Resilient Sphere, Arcane Sword, Instant Summons,
Irresistible Dance, Telepathic Bond, Arcanist's Magic Aura...). No product-identity names or creatures
(no beholders, mind flayers, displacer beasts, githyanki, etc.).

## Spells (`DND_SPELLS`)

Existing entries in `src/js/dnd/spelldata.js` show the style. Each spell:

```
key: { name, lvl (0–9), school, kind, classes: ['wizard', ...], desc, fx, col, ...fields }
```

- `classes`: every SRD 5.2 class whose spell list has it (bard, cleric, druid, paladin, ranger, sorcerer, warlock, wizard).
- `fx`: one of `mana_fire`, `mana_frost`, `mana_light`, `mana_arcane`, `mana_heal` (particle tile). `col`: a hex colour.
- `desc`: one or two short sentences saying what it does **in this game** (real time), like the existing ones.
- `conc: true` for concentration. `ritual: true` for rituals. `bonus: true` for bonus-action spells. `reaction: true` for reactions.
- `cost: 'diamond'` (or another existing item key such as `gold_ingot`, `emerald`, `amethyst_shard`) when the
  spell consumes a costly material component.

### kinds and their fields (existing)
| kind | fields |
|---|---|
| `bolt` | `dice [n, d]`, `dmg` (type), `range`, `scale` (number or 'cantrip'), `rays` + `scaleRays`, `beams: 'cantrip'`, `save` (instead of an attack) |
| `missile` | `darts`, `dice`, `plus`, `dmg`, `scale` |
| `ray`, `touch` | `dice`, `dmg`, `range`, `scale` |
| `cone`, `line` | `save`, `dice`, `dmg`, `range` (length), `scale`, `knock` |
| `burst` | `save`, `dice`, `dmg`, `range` (radius), `at` (how far away it can be placed), `self: true` (centred on you), `scale`, `linger` (seconds it stays and ticks), `ignite`, `storm`, `places` (a block key, e.g. 'cobweb'), `breaks` |
| `target` | `save`, `range`, `dice`, `dmg`, `humanoid: true` (only humanoids), plus effects below |
| `heal` | `dice`, `addMod`, `range`, `party: true`, `revive: true`, `cleanse: true`, `scale` |
| `buff` | `buff` (key), `dur`, `party: true` (you + allies near), `ally: true` (you or the ally you look at) |
| `summon` | `summon` (key), `n`, `dur`, `dice`, `dmg` |
| `utility` | `util` (key), `dur`, `range` |

Effects usable on `target`, `bolt`, `ray`, `touch`, `cone`, `line`, `burst` (applied when the creature fails/is hit):
`slow` (s), `hold` (s, paralysed), `root` (s, restrained), `sleep` (s), `charm` (s), `fear` (s), `weaken` (s),
`noHeal` (s), `mark` ('outlined' | 'guided' | 'hunted' | 'hexed', with `dur`), `knock` (push strength).

### new fields the game will implement for alpha 3
Effects (same places as above):
- `blind: s` — it can't see you; it wanders and attacks at disadvantage.
- `stun: s` — stunned (like hold, but also drops its guard: hits on it crit more).
- `poisoned: s` — weaker attacks.
- `confuse: s` — moves randomly, may attack its friends.
- `petrify: s` — turned to stone (held, greyed, resistant to damage). Use a long value (e.g. 600) for permanent-feeling.
- `banish: s` — vanishes for that long (it's gone, then comes back; a summoned/planar thing doesn't come back).
- `polymorph: s` — it becomes a harmless animal (a sheep) for that long; damage to the animal ends it.
- `dominate: s` — it fights on your side for that long.
- `drain: true` — you regain hit points equal to half the damage dealt.
- `kill: hp` — it dies outright if it has this many hit points or fewer (Power Word Kill: 100). `stunIf: hp` likewise for stun.
- `dust: true` — if the damage kills it, it crumbles to dust (no corpse).
- `prone: true` — knocked down for a moment.
- `deafen: s`, `curse: s` (disadvantage on everything), `silence: s` (it can't cast).
- `vsType: ['undead', 'fiend']` — extra effect only against these creature types; `dmgVs: { undead: 2 }` — damage multiplier vs types.

Burst/area extras:
- `multi: n` — that many bursts scattered around the point (Meteor Swarm: 4).
- `wall: 'stone' | 'ice' | 'fire' | 'force' | 'thorns' | 'wind' | 'light'`, with `len` (blocks long), `hgt` (blocks high), `dur` — a temporary wall where you look. Fire/thorns/light walls hurt creatures passing through (use `dice`, `dmg`).
- `pull: strength` — drags creatures toward the centre (Black Tentacles uses `root`; a whirlwind uses `pull`).
- `cloud: true` — a lingering cloud that blocks sight (use with `linger`).

Buff keys (`buff:` value; the game adds each to the target's conditions for `dur`):
`fly`, `water_breathing`, `darkvision`, `see_invis`, `true_seeing`, `blur`, `mirror_image`, `stoneskin`,
`freedom` (immune to hold/slow/root), `foresight`, `death_ward`, `protect_evil`, `sanctuary`, `enlarge`, `reduce`,
`gaseous`, `ethereal`, `greater_invis`, `jump`, `feather_fall`, `spider_climb`, `regenerate`, `temp_hp` (with `dice`),
`resist` (with `resist: ['fire', ...]` or `'all'`), `elemental_weapon` (with `dmg` and `dice`), `holy_aura`,
`mind_blank`, `nondetection`, `beacon` (heals are maximised), `warding_bond`, `crusader` (allies' weapons +1d4 radiant),
`armor_of_agathys` (temp hp + cold damage to attackers, with `dice`), `fire_shield` (with `dmg`), `shapechange`
(you become a strong beast, like Wild Shape: `form: 'bear' | 'wolf' | 'dragon' | 'giant_eagle'`), `heroes_feast`,
`haste`, `invisible`, `longstrider`, `heroism`, `aid`, `bless`, `shield`, `mage_armor`, `barkskin`, `magic_weapon`, `shillelagh`, `guidance`, `pass_trace`.
Anything else: pick the closest and add `todo`.

Summon keys (`summon:` value):
- `spirit_wolves` (existing), `spirit_blade` (existing, a floating weapon).
- `mob` with `mob: '<MOB_TYPES key>'`, `n`, `dur`: spawns allies of that creature type (e.g. 'skeleton', 'ghoul',
  'wolf', 'bear', 'iron_golem', 'fire_elemental', 'earth_elemental', 'water_elemental', 'air_elemental', 'eagle').
  Monster agents are adding elementals and more; use the names listed in the monster section below.
- `steed` — a spectral or loyal horse you can ride (Find Steed, Phantom Steed).
- `hand` — a big force hand that grapples or punches (Arcane Hand).
- `sword` — a spectral sword that attacks (Arcane Sword); same as spirit_blade but stronger dice.
- `guardian` — a stationary guardian that attacks foes near it (Guardian of Faith).

Utility keys (`util:` value):
existing: `light`, `daylight`, `blink` (short teleport, `range`), `hand`, `mend`, `decoy`, `thaumaturgy`, `fog`, `darkness`, `goodberry`, `counter`, `grow`.
new:
- `teleport` — go to a town or Resonance Anchor you know (menu). `circle: true` for Teleportation Circle (party comes too).
- `plane_shift` — the party crosses between the world and the other side (story use) or returns home.
- `reveal` with `what: 'magic' | 'invisible' | 'traps' | 'creatures' | 'evil' | 'poison' | 'hidden' | 'ore' | 'object'` and `range` — highlights those things around you for `dur`.
- `scry` — shows where your current quest goal is (Locate Creature/Object, Scrying, Clairvoyance, Find the Path).
- `speak` with `with: 'animals' | 'plants' | 'dead' | 'stone' | 'any'` — the nearest one tells you something useful.
- `water` (create or destroy water: places or removes water where you look), `food` (Create Food and Water: rations), `purify`.
- `open` (Knock: opens the locked door or chest you look at), `lock` (Arcane Lock), `identify` (reveals the item in your hand).
- `weather` with `set: 'clear' | 'rain' | 'storm' | 'snow'`.
- `shelter` (Tiny Hut, Rope Trick, Magnificent Mansion: a safe place to rest; monsters can't reach you).
- `time_stop` with `dur` — everything but you freezes.
- `earthquake` — the ground shakes: damage and knock-down in a big radius (`dice`, `range`).
- `wish` — a menu of the strongest choices (heal the party fully, a spell of 8th level or lower, resistance...).
- `gate` — opens a portal to a place you know, for the party.
- `message` (Sending, Message, Telepathic Bond, Dream: a word to an ally or a hint), `disguise` (Disguise Self / Alter Self / Seeming: villagers and guards don't recognise you), `illusion` (Silent Image / Major Image / Mirage Arcane / Phantasmal Force: a decoy that draws creatures, bigger), `transport` (Transport via Plants, Tree Stride, Wind Walk: travel to a town or anchor; same as teleport but themed), `contingency`, `clone`, `simulacrum` (a copy of you that fights for a while), `forcecage` (traps the creature you look at: long `root`), `maze` (banishes the creature you look at for `dur`), `demiplane` (a door to a safe room where you can store things and rest).

Damage types: fire, cold, lightning, acid, poison, thunder, force, radiant, necrotic, psychic, slashing, piercing, bludgeoning.

## Magic items (`DND_MAGIC_ITEMS`)

```
key: { name, rarity: 'common'|'uncommon'|'rare'|'very_rare'|'legendary'|'artifact', attune: true | 'wizard' | 'cleric,paladin' | false,
       slot: 'weapon'|'armor'|'shield'|'ring'|'amulet'|'cloak'|'boots'|'gloves'|'belt'|'helm'|'bracers'|'eyes'|'wand'|'staff'|'rod'|'potion'|'scroll'|'wondrous'|'ammo',
       art (a DND_ART picture: club, mace, staff, sickle, spear, polearm, greataxe, greatsword, sword, shortsword, rapier, scimitar, axe, hammer, whip, dagger, shield, amulet, orb, book, lute, tools, satchel, ring, candle, pack, ration, potion, gem, coin;
            new ones the game adds: wand, rod, cloak, boots, gloves, belt, helm, bracers, scroll, bag, horn, cube, stone, eye, feather, figurine, carpet, lantern, key, crystal),
       cols: [main, dark, light] (hex), desc, ...effect fields }
```

Weapons: `base: '<DND weapon key>'` (longsword, dagger, greatsword, ... see DND_WEAPONS, or 'longbow'/'shortbow'), `plus: 1–3`,
`extra: [n, d, 'type']` (extra damage on a hit), `extraVs: { types: ['undead'], dice: [2, 6, 'radiant'] }`, `vorpal: true`,
`keen: true` (crits on 19–20), `returning: true` (thrown and comes back), `light: true` (sheds light), `slayer: 'dragon'|'giant'|'undead'|...`.
Armour: `armorSet: '<armour key>'` (leather, studded, padded, hide, chainshirt, scale, breastplate, halfplate, ringmail, chain, splint, plate) or `armorSet: 'any'`, `plus: 1–3`, `resist: ['fire']`.
Shields: `shieldPlus: 1–3`. Ammo: `ammo: 'arrow'`, `plus`, `extra`.

Worn/carried effects (`wear: {...}`; active while worn in its slot — or carried for `wondrous` — and attuned if `attune`):
`ac` (+n), `save` (+n to all saves), `saves: { dex: 1 }`, `skills: { stealth: 2 }`, `adv: ['stealth', 'perception', 'con_save', 'charm', 'fear', 'poison']`,
`resist: ['fire']`, `immune: ['poison', 'charm', 'fear']`, `setAb: { str: 21 }` (sets an ability score), `ab: { con: 2 }` (raises it),
`speed` (+feet), `jump` (multiplier), `fly: true` (or `flyDur` seconds per day), `waterBreathing: true`, `swim: true`, `darkvision: 60`,
`spellDC` (+n), `spellAttack` (+n), `regen` (hp per minute), `invisible: 'use'` (you can turn invisible at will), `featherFall: true`,
`climb: true`, `carry` (+slots), `light: true`, `truesight: true`, `noSleep: true`, `freedom: true`, `luck: true`, `hp` (+max hp), `prof` (+n to proficiency).

Use effects:
- `cast: '<DND_SPELLS key>'` with `charges: n` (and `recharge: 'dawn'`), or `charges: 'long'` (once per long rest). `castLvl` for the slot level it casts at.
- `castList: ['fireball', 'lightning_bolt', ...]` with `charges` — a staff or wand with several spells (use cycles through them).
- Potions: `drink: { heal: [n, d, plus] }` or `drink: { buff: '<buff key>', dur, ...fields }` or `drink: { cleanse: true }` or `drink: { setAb: { str: 21 }, dur }` or `drink: { resist: ['fire'], dur }`.
- Scrolls: `scroll: '<DND_SPELLS key>'` (one use). The game will generate a scroll for every spell automatically, so only add special ones.
- Containers: `bag: n` (extra inventory slots it gives).
- `summonMob: '<MOB key>'` with `charges` (figurines of wondrous power).
- `todo: '...'` for anything that doesn't fit.

## Monsters

New creatures are added to `MOB_TYPES` (see `src/js/game/monsters.js`), with a Hytale-style rig in `MODEL_DEFS`
(see `src/js/render/rigs.js`, `rigdefs.js`, `rigdefs2.js`) and painted textures (see `src/js/render/monstex.js`,
painted inside a wrapper of `paintMonsterTiles`). Each gets D&D stats in its MOB_TYPES entry:
`ac`, `toHit`, `dndXp` (SRD XP for its CR), `cr`, `saves: { dex: 2, ... }` (optional), `resist`, `immune`, `vulnerable` (damage-type arrays),
`humanoid: true` where it is one, `undead: true`, `ctype: 'beast'|'monstrosity'|'undead'|'fiend'|'fey'|'elemental'|'construct'|'dragon'|'giant'|'aberration'|'ooze'|'plant'|'humanoid'|'celestial'`,
`region: [...]` (where it belongs: 'farms', 'hills', 'forest', 'crypt', 'mountain', 'marsh', 'vale', 'shadowfell', 'coast', 'sea', 'plains', 'caverns', 'duskwood', 'desert', 'peaks', 'underdark'),
`night: true` (night spawn only), `day: true` (day only), `boss: true` for lair bosses.
Names monster files use (so spells and campaign data can refer to them): see the lists in each monster brief.
