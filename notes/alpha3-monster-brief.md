# Monster brief (alpha 3)

You are adding D&D monsters to "The Shadowbloom of Eldenwood", a real-time voxel D&D game built on DokuQuest
(plain JavaScript; every file in `tools/build.js` ORDER is concatenated into one IIFE). Repo: `/home/claude/dq-src`.
The game's look is Hytale-like: creatures are rigs of several shaped boxes with bending joints, chunky but
characterful, with painted 16×16 textures (2–4 tones of noise, a few highlight pixels, clear faces with glowing
or dark eyes). Not Minecraft reskins: each new creature gets its own silhouette.

## Read first
- `notes/alpha3-data-spec.md` (the "Monsters" section: the D&D fields every MOB_TYPES entry carries).
- `src/js/render/rigs.js` — the rig API: `rpart(name, parent, at, box, tex, extra)`, `finishRig(kind, parts, extra)`,
  `bipedRig`, `quadRig`, `spiderRig`, `birdRig`, and the animation kinds in `RIG_ANIM` (biped, quad, spider, bird,
  slime, pod, …). Pixels: 1 px = 1/16 block, front faces −z. Parts can use roles that the animation drives.
- `src/js/render/rigdefs.js`, `src/js/render/rigdefs2.js` — many examples (wolves, bears, golems, drakes…).
- `src/js/render/monstex.js` — how textures are painted (`addTile(name, p => { p.noise(...); p.speck(...); p.art(rows, pal); p.set(x, y, rgb) })`
  inside a wrapper of `paintMonsterTiles`). `hexRGB`, `shade` helpers.
- `src/js/game/monsters.js` — MOB_TYPES entries (hp, w, h, speed, damage, hostile, flyer, swims, ranged, held, drops, onHit, voice…)
  and `MONSTER_AI[type] = function (dt, p, dist, dyp, toPlayer) {…}` custom behaviour; `src/js/game/dungeons.js` (mimic) and
  `src/js/game/dragons.js` for bigger custom AIs (breath, charge). `src/js/game/mobai.js` for the shared AI.
- `src/js/dnd/srd.js` bottom: how AC/to-hit/XP are read from `T.ac`, `T.toHit`, `T.dndXp`.

## What to write
One file (yours only — see your list below), structured as:
1. A header comment listing the creatures.
2. `defItem(...)` for any new drops (monster parts used in crafting: e.g. `owlbear_feather`, `troll_blood`, `griffon_feather`,
   `elemental_core_fire`; keep a few per creature at most; give each a `desc`). Their icons: pick an existing item icon via
   `icon: '<existing item key>'` or paint a 16×16 item picture with `addItem('<key>', p => …)` inside your paintMonsterTiles wrapper.
3. The textures, in a `paintMonsterTiles` wrapper:
   ```js
   { const base = paintMonsterTiles; paintMonsterTiles = function () { base(); const H = hexRGB; addTile('owlbear_fur', p => {...}); ... }; }
   ```
   Prefix every tile name with the creature key to avoid clashes.
4. The rigs: `Object.assign(MODEL_DEFS, { owlbear: bipedRig({...}), ... })` (or finishRig with custom parts). Use extras for beaks,
   horns, manes, wings, tails, crests, claws, weapons-in-hand. A tiny creature (pixie) is small boxes; a huge one (purple worm, roc,
   leviathan) uses `scale` in the rig extra and a big `w`/`h` in MOB_TYPES.
5. `Object.assign(MOB_TYPES, { owlbear: { model: 'owlbear', label: 'an owlbear', hp, w, h, speed, damage, hostile: true, special: true,
   xp, drops: [[item, min, max, chance]], ac, toHit, dndXp, cr, ctype, region: [...], night/day, resist/immune/vulnerable, humanoid/undead, ... } })`.
   Use the SRD 5.2 stat block for AC, HP (average), CR, XP, damage resistances/immunities, speeds (flyer/swims) and its signature
   abilities. Damage per hit: roughly the SRD average of its main attack, but scaled to the game: the game's player has ~10 hp at
   level 1 and ~100+ at level 12, so use `damage ≈ SRD average damage of one attack` (the engine already rolls attacks vs AC).
   Filter drops to items that exist: `MOB_TYPES[k].drops = MOB_TYPES[k].drops.filter(([id]) => ITEMS[id])` after the defItems.
6. Behaviour: give each creature its signature move with `MONSTER_AI.<key>` when the shared AI isn't enough (look at existing ones):
   breath weapons (cone of fire with particles: `spellFx`, `g.flame`, damage via the same paths the existing dragons/wisps use),
   a troll regenerating unless hit by fire/acid, a gelatinous cube engulfing (holds you), an ankheg bursting from the ground,
   a harpy's luring song (pulls you toward it), a banshee's wail (fear), an ettercap's webs, a will-o'-wisp's invisibility flicker,
   a griffon's dive, a gargoyle that looks like a statue until you come near, a rust monster that damages your held metal tool, etc.
   Keep it robust: guard every access, no exceptions in the hot loop, and keep per-frame cost small.
7. Voices: if there's an existing voice that fits (see `src/js/game/voices3.js` / `sounds2.js` keys used by other MOB_TYPES), set `voice:`.

Do NOT spawn them in the world yourself: spawning (by region, day/night, in lairs and dungeons) is wired separately from the
`region`, `night`, `day`, `boss` fields you set. Do not edit any file other than your own (other agents are editing other files at the same time).

## Check your work
1. Syntax: `node -e "new Function(require('fs').readFileSync('src/js/game/<yourfile>.js','utf8'))"`.
2. Build into your own folder (never into dist/, which other agents use): `DQ_OUT=<your scratch dir> node tools/build.js` from the repo root.
3. Look at every creature: write a Playwright script in your scratch dir (based on `tools/gear_shot.py`: Chromium with
   `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, open `file://<your scratch dir>/shadowbloom.html`,
   `localStorage.setItem('emberwild.settings', JSON.stringify({renderDist: 3, scale: 0.8, farTerrain: 0}))`, reload,
   `__game.createWorld('Zoo', 'gear-flat-7', 'creative')`, wait for `__game.state === 'playing'`, dismiss the hero creator as
   gear_shot.py does, set `__game.meta.time = 1500` for daylight). Spawn each creature with
   `const g = __game, M = g.dev.Mob; const m = g.addEntity(new M(g, 'owlbear', x, y, z)); m.ai = false` (or set its `T.hostile=false`
   temporarily / freeze it) in a row in front of the camera, turn the player to face them (`lp.player.yaw`, `lp.player.pitch`),
   and screenshot from the front and the side. Look at the screenshots with the Read tool and fix anything that looks wrong
   (floating parts, inside-out boxes, wrong facing, legs through the ground, unreadable textures, wrong scale vs the player who is
   ~1.8 blocks tall). Also let one of each walk/attack for a few seconds to make sure nothing throws (collect `pageerror` and console errors).
4. Iterate until every creature looks good and there are no console errors.

When done, reply with: the creature keys you added (one line each: key — label — CR — region — signature move), the new item keys,
any problems you couldn't solve, and paths to 2–3 of your best screenshots.
