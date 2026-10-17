# Full-game pass (after 0.9.0.23)

Audit 2026-10-16 (three read-only reviews: progression, balance, RPG systems). The story plays start to finish:
spawn by a village -> rift opens (15 min + village found) -> 4 dungeon keepers drop Realm Fragments -> use the rift
with 4 -> gate -> realm halls -> Herobrine (360 HP) -> seal. Focused run ~2-3.5 h; fast ~1-1.5 h; +5 h for
dragons/End/exploring.

## Bugs / exploits to fix
- Place-and-remine ore/logs: skill bonus drops + XP on player-placed blocks (skills.js:99-107). Mark placed blocks.
- Defence/armour XP on every hurt call even when no damage (skills.js:150-157): cactus / lava + fire res farm.
- Smithing XP loop via ingot<->block (skills.js:196).
- Archery never trains: arrows send {tool:'arrow'} (blocks2.js:138) but skills check src.type; spells (type 'magic') train Melee + get melee bonus.
- Overkill XP (4 x damage past remaining HP) (skills.js:144).
- "He is here" off disables the main quest (riftarc.js:291).
- End portal does nothing with "See through portals" off (portalview.js:160 / theend.js:458 fallback only with LAN guests); LAN guests can't use the fallback (theend.js:461).
- Rift opens only from host locals' found villages (riftarc.js:293).
- Fragment HUD counts kills not fragments; fragments burn in lava (entities.js:520 fireproof list).
- After sealing the realm can't be re-entered (riftarc.js:270).
- Realm exit: one player (or a LAN guest) leaving pulls everyone (riftarc.js:247/607, worlds.js:257 _actor unset).
- Elder's main-quest button vanishes when riftlore supplies a greeting (riftlore.js:118 vs riftarc.js:568).
- Guests: day / cleared dungeons not sent on welcome (net.js:312); board quests can't be abandoned or expire (villagers.js:860, 1029).
- Rift arc single-local: g.local / locals[0] in riftarc.js:218,266-316,545; haunt.js:37; timers tick per layer.
- Stability: 1 fragment leaves 78% (nothing happens until the 2nd); fragments keep dropping after the seal.
- Breeding XP to nearest local (skills.js:173); Night Vision shared across split views (brewing.js:382).
- Unknown item ids in loot/shops: map (stronghold.js:12), name_tag (dungeons.js:28), painting, crossbow, spectral_arrow, writable_book, white_banner, rabbit_stew, lead, backpack, sweet_berries.
- Only one End gateway ever (dragon never respawns).
- sheet.js:102 labels mithril "cinderite", adamantite unlabeled.

## Balance
- Eating: no cooldown (local.js:508-519) -> unlosable fights. Eating channel + cooldown, golden apple 20 -> 8 + regen.
- Defence stacking to ~95% (player.js:239 x Protection x Defence skill). Protection 0.04 -> 0.02/level, total cap 80%.
- Armour caps at diamond (0.04/pt, cap 0.8): 0.035/pt so mithril/adamantite matter.
- Magic skill factor 1.2 -> 0.5; Lightning 11 -> 8, cd 2.5 s, 16 mana; spells tagged magic.
- Fire-element melee does 0 to fire-immune (entities.js:91): cinderite sword, Ember Blade, Fire Aspect useless vs bosses/Depths. Fire immunity should only block burning.
- Cinder Golem farm: heart crystal first kill only; Ember Blade 9 -> 7; effigy needs a cinder core.
- Strength flat +3/+6 -> +15%/+30%.
- Warden boom 10 ignoring armour -> 7 with Protection.
- Emerald block arbitrage at Hero standing (villagers.js:69, 1075).
- Ogre Club 8 -> 6. Copper = stone, bronze = iron.
- Fishing and Taming bonuses never implemented; Taming XP only from breeding.

## RPG expansion (ranked)
1. Main quest chain through the stacked world (extend rift stages; elder + tracker).
2. Perks at skill milestones 10/25/50/75/99.
3. Exploring skill + Adventure Journal.
4. More quest types (deliver, escort, repair, explore) + abandon/expiry.
5. Named elites / bounties; structure bosses + dragons can be fragment keepers.
6. Gear set bonuses.
7. Magic schools (per-spell school XP; staff level boosts spells).
8. Village events (raids by stability, a house at Hero standing, peace after the seal).
