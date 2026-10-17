# DokuQuest — the Adventure plan (0.9 and beyond)

The direction (from the players): a Minecraft/Hytale core sandbox that grows into an RPG adventure —
Vintage Story's craft and dread, RuneScape's skills, Skyrim's magic, WoW's mounts and pets — played in co-op.
Balance and pacing matter more than any one feature: nobody should get strong too fast.

## Pillars
1. **Skills that grow with use (RuneScape-style, to level 99).** Mining, Woodcutting, Farming, Fishing, Smithing,
   Cooking, Combat styles (Swords, Axes, Archery), Magic schools, Taming, Exploring. XP curve like RS (slow past 70).
   Small, felt bonuses: mining speed, better yield (extra ore/gems at high level), crit chance, mana regen.
   No single class: everyone can level everything; your playstyle is your class.
2. **Gear that grows too.** Tools, weapons and armour gain XP when used and keep it through repairs.
   Item levels unlock modest stat gains (damage, speed, yield). Repair at the anvil keeps the level.
3. **Magic (Skyrim + Hytale).** Mana bar; spells learned from tomes (found in libraries/dungeons, bought in
   villages). Schools: Destruction (fire/frost/shock), Restoration, Alteration (light, levitate, stoneskin),
   Conjuration (summon familiar). Casting raises the school's skill. Staffs/wands, wizard robes and hats are gear
   with their own levels. Enchanting and brewing tie in.
4. **Villages and quests.** Villages with traders (emerald economy) and a quest board / elder. Quest types:
   clear a dungeon, fetch materials, escort, build/repair, hunt a beast, deliver. Reputation per village.
5. **The Herobrine arc: the Temporal Incursion** (the players' design, kept as written):
   - Phase 1, Quiet Observer: before any village is found he only watches from far ridges, leaves 2x1 redstone-torch
     shrines, stripped trees, strange notes. Co-op paranoia: one player sees him, the other doesn't.
   - Phase 2, Catalyst: finding the first village opens a silent rift in its square (a window onto his bruised
     purple realm). The elder gives the main quest: find the temporal keys guarded by mini-bosses.
   - Phase 3, Temporal Gauntlet: each mini-boss gives a Realm Fragment; each one makes the boundary thinner.
     World Temporal Stability falls (100% → 0%) and his behaviour escalates:
     - High (100–75): distant watching, torch shrines, stripped logs.
     - Medium (74–40): in doorways and huts (vanishes with a static whisper and a light flicker when approached),
       reflections in glass/water, doors opened, signs ("WE ARE WATCHING", "IT BREAKS").
     - Low (39–15): micro-rifts (steps out, stares 2–3 s with a Dread screen effect, steps back), opens rifts that
       let 2–3 rift-corrupted mobs through, wears a co-op friend's skin with white eyes.
     - Critical (<15): phantom sounds (chest, block break, explosion) with him standing where it "happened",
       the 2-second time-freeze stare, quest dialogue glitching into his warnings, warped skies, reversed audio,
       floating blocks near villages.
   - Phase 4, Threshold: with all fragments the rift becomes a stable gateway; the party enters his realm together
     for a hand-built raid and the final fight. Winning seals the rift: peaceful villages, legendary gear, his
     realm's blocks.
   - His realm (the user, 15 Oct): a much larger dimension, like a corrupted version of his own pocket dimension.
     So: the pocket room's glowing walls gone wrong (cracked, flickering, bleeding purple), stretched to an
     enormous scale, rooms and halls that repeat and twist, floating broken pieces of the overworld.
   - Rules: he is event-driven (stability timer + proximity to players/villages), never ordinary mob spawning;
     he despawns into a rift when hit, approached within 2 blocks, or watched for 4 s; harmless until the raid.
     Pocket dimensions are safe from him unless someone builds another portal inside one.
6. **Dungeons and places worth finding.** Several dungeon kinds (crypts, mines, sunken temples, mage towers),
   mini-bosses, loot with gold and gear; mimic chests; libraries with lore and spell tomes; labyrinths, ruins,
   desert and ocean temples, shipwrecks, strongholds. The Deep Dark (sculk, the Warden) in the deep Overworld.
7. **Dragons.** A boss dragon per biome (forest, desert, snow, swamp, sea, volcanic/Depths, sky), each a real
   fight; beaten or hatched from its egg, it can be tamed and ridden. Mounts and pets can be summoned and
   dismissed (WoW-style whistle/collection), kept safe when not out.
8. **Ores, metals and tiers.** Copper → bronze (tin) → iron → steel (iron + coal at a bloomery) → mithril →
   adamant/cinderite; emerald, ruby/sapphire gems; matching tools and armour for each tier; smithing at anvils.
9. **Travel and camping.** Ropes you can climb, a grappling hook, a backpack with gear slots (rope, hook,
   sleeping bag that sets your spawn for the night, a portable campfire, lantern), more pockets per tier.
10. **Everything placeable and 3D (Vintage Story style).** Real 3D models for items set down: a bucket,
    a bowl, ingots stacking in criss-crossed layers ingot by ingot, arrows bundled, food as itself, tools leaning
    on walls or lying on tables. Hytale-style chunky 3D for items, tools and creatures.
11. **The End and Endermen** (with the ender pearl / eye path to a stronghold), elytra from End cities.
12. **Movement feel**: smoother, less stiff in third person (Hytale): acceleration curves, turning, landing.

## The world (a later world-generation update)
- Stacked world: the Ember Depths far below the Overworld (dig down far enough and you break through into it),
  the Skylands high above (fall off an island and you fall all the way to the Overworld; a flying mount can climb
  up to it). Portals stay as fast travel. Needs: taller worlds (vertical chunk sections) and streaming by height.
- Real flowing rivers; Create-style machines (windmills, water wheels, shafts, gears, belts) to go with them.
- Immersive portals: windows you see through and walk through with no loading screen (render the other side's
  chunks to a texture from a matching camera; walk-through hands the player to the other dimension without
  unloading). Shares its groundwork with "each player in their own dimension" (several dimensions live at once).
- The Pocket Dimension key: an animation of turning the key in an invisible lock that opens a walk-through rift;
  use it from inside to let a friend in.

## Saving across devices
The game already has cloud sync code (a per-user store). Signing in with Google is possible in a browser and on
Android; in the desktop app it needs the system browser for the sign-in (Google blocks embedded sign-in) and a
small hosted backend (e.g. Firebase). Play Games services are Android-only. A simpler first step: a sync code /
export to a file or a cloud folder you already use.

## Order (proposed)
- 0.8.7: online play (invite code), per-player dimensions (portals on your own), summonable mounts/pets.
- 0.9 Adventure part 1: villages + traders + quest board, dungeons + mini-bosses + loot, ores/tiers/smithing,
  skills to 99 with gear levels, the Herobrine arc phases 1–3.
- 0.9.x Adventure part 2: magic (mana, schools, tomes, staffs, robes), enchanting/brewing, dragons + taming,
  ropes/grappling/backpack gear, 3D placeable items, the Herobrine raid (phase 4), End + Endermen, Deep Dark.
- 1.0 World: stacked dimensions, rivers + machines, immersive portals, cloud saves.
