# Notes digest for alpha 3: what the campaign notes contain that the game lacks

Source: `/home/claude/notes-in/notes_compact.txt` (4,872 lines, read in full). `L123` = line number in that file.
Conventions: **(inferred)** = my own suggestion or reading, not in the notes. **CONTRADICTION** = the notes give two or more versions; all are listed.
**[src]** = the name already appears somewhere in `src/js/campaign` or `src/js/game` (checked by grep only; how deeply it is built was not checked). Everything without [src] was not found in the source.

## 0. What the notes are, and what they don't contain

- **Layout of the file:**
  - L1–3095: the main quest, scene by scene: Acts 1–2, then Act 3 Scene 1 (the Mirrorroot).
  - L3096–3597: the Stillwater trail, the Stillwater Nexus, the return interlude, Nico's lab and three branch hooks.
  - L3598–4099: a world gazetteer: regions, bodies of water and a map layout. **Most of the material on new regions is here, and it is short.**
  - L4100–4320: handouts: the prologue, a second version of Eldon's letter, a bandit journal, the cult's letter to Nico, Lyra's journal pages and Eldon's lore dialogue bank.
  - L4322–4481: creature lists.
  - L4482–4557: custom items.
  - L4558–4693: a shop price list.
  - L4694–4820: spell cards with "Visual:" lines.
  - L4821–4872: the Sending Crystal recall mechanic.
- **Coverage of the new regions is thin.** The notes say this much about each:
  - Redrock Haven: one line.
  - Duskwood: one line.
  - Sunken Village of Aethel: about 12 lines, plus the Shiverdeep Trench and the Sunken Forest.
  - Crystal Caves of Lumina: about 30 scattered lines.
  - Plains of Silent Stones: about 20 lines.
  - Saltwind Coast and the Isle of Whispers: about 50 lines in all.
  - Most of the "detail" in section 1 is therefore the full extent of what the notes say. Building these regions well will need invention, marked (inferred).
- **Not in the notes at all:** player characters, PC arcs, original species, classes, subclasses, backgrounds and feats. Player housing is also absent. Searches for "species", "subclass", "feat", class names, "companion", "hireling", "faceless" and "white eye" turn up nothing relevant.
- **The rules flavour is D&D 3.5 / Pathfinder 1e, not 5e.**
  - Spells: Daze, Flare, Read Magic, Glitterdust, Bull's Strength, Cat's Grace.
  - Gear: falchion 75 gp, guisarme, ranseur, repeating crossbows, "Cure Light Wounds" potion, heavy/light shields.
  - The Sending Crystal uses a "Will save".
  - This conflicts with the SRD 5.2-only rule in `alpha3-data-spec.md`; map these to 5.2 equivalents.
- **Already-built main-quest material** (Stonebridge to Seraphina) takes up roughly 70% of the file. It is only summarised here where it feeds new content.

---

## 1. New regions

### 1.1 Sunken Village of Aethel (with the Shiverdeep Trench and the Sunken Forest)

**What the notes say**
- **Gazetteer (L3953–3959):** "A submerged village filled with cursed waters and sea creatures."
  - It "holds ancient secrets and serves as a critical location for the players' exploration."
  - Its deep waters "contain cursed entities and relics."
  - Key location: **Sunken Relics**, "items of power sealed beneath the village's dark waters, waiting to be uncovered."
- **Location list (L1933):** "Drowned settlement whispered to house an underwater sigil beneath corrupted waters."
- **Placeholder sites (L1880):** "Smugglers' Cove / Sunken Village – Fragmented leyline paths possible."
- **Smugglers' Cove** is "On the way to the Sunken Village" (L1941).
- **Sigil Fragment #9, "Coral Bloom" (L2798–2801):** at "The Sunken Village / Coral Vault". "Preserved near underwater ruins and drowned resonance crystals."
- **Map layout (L4084–4088):** West/Southwest: "Saltwind Coast, Smuggler's Cove, Sunken Village – Coastal ruins and underwater corruption."
  - "The Echo of Ancients and sea-based sigils were discovered here."
  - "Bordered by Thornmere and Oakhaven along the old trade routes."
  - CONTRADICTION: elsewhere the Echo of Ancients comes from Grom's Runaway Apprentice questline (L4514).
- **Shiverdeep Trench (L3772–3781):** "A deep, oceanic rift connected to the Sunken Village of Aethel."
  - Unexplored. Holds "ancient relics that were sealed away after the planar wars."
  - Only sailors and deep-sea adventurers have seen parts of it. They "speak of strange creatures and an eerie, oppressive atmosphere."
  - "Deep, cold waters that plunge into an unexplored abyss", home to dangerous sea creatures.
  - **Shiverdeep Relic:** "An ancient relic sealed within the trench, said to hold immense power over planar energies."
  - **Unmapped Relic Seals:** "Fragments of the past buried deep in the rift, where sailors and explorers have met their end searching for powerful artifacts."
- **Sunken Forest (L3660–3666):** "A flooded forest south of Saltwind Coast, submerged due to magical disturbances."
  - "The water is cursed, mutating the plants and creatures within the forest." Dark magic, strange creatures.
  - Key location: **The Sunken Glades**, submerged areas "where dark secrets and magical artifacts can be found."
  - Map placement (L4099): "Between the Saltwind and Stillwater; corrupted and drowned."
- **Related clues:**
  - Archive tome (L3100): "This sigil was overwritten in the Second Veil Collapse. Its echo persists in coastal stone… and bone."
  - Rumor (L928): "Fisherfolk near the southern cliffs say the sea sings at dawn."
  - The Blackwater Gulf's **Drowned Graveyard** has "submerged ruins near the Gulf's edge, home to the remains of a long-lost civilization" (L4047). It could be the same place or a sister site (inferred).
- **Creatures named for these waters:** "cursed entities", "sea creatures", "corrupted sea creatures", "strange creatures". There are no stat blocks. See also the Leviathan in 1.4.

**Ties to Seraphina, the Bloom and the Tuner**
- The notes only say: an underwater sigil (fragment #9) on the expanded lattice, and relics sealed after the planar wars with "power over planar energies."

**Build notes (inferred)**
- A drowned voxel village with a Coral Vault dungeon holding fragment #9 and "drowned resonance crystals".
- A Resonance Anchor on the shore.
- Water breathing via potion or the `water_breathing` buff.
- The Shiverdeep Trench as a deep, dark late-game dive for the Shiverdeep Relic.
- Reach it through Smugglers' Cove ("on the way").
- The "sea sings at dawn" rumor works as the first hook.

### 1.2 Crystal Caverns / Crystal Caves of Lumina

**CONTRADICTION: where they are**
- (a) Beneath **Mount Cinder**, under the Ember Vault (L1107, L1116, L1144, L1931, L4194–4206).
- (b) "Beneath the **Plains of Silent Stones**" (L3759).

**CONTRADICTION: names**
- "Crystal Caverns" (beneath Mount Cinder), "Crystal Caves of Lumina" (fragment #12), "The Crystal Caves" (gazetteer) and "Crystal Caverns of Lumina" (creature list).

**What the notes say**
- **Gazetteer (L3758–3764):** "Glimmering caves… filled with crystals that resonate with both magic and sound."
  - The formations are "sensitive to vibrations and magic, amplifying any nearby energies."
  - "Lyra Stonehand discovered the first fragments of the Harmonic Tuner theory within these caves."
  - Key location: **Crystal Resonance Chambers**, "key to understanding the Harmonic Tuner's functions" and to "the nature of planar resonance."
- **Location list (L1931):** "Birthplace of the Harmonic Tuner—currently inaccessible without tools or power."
- **Eldon's crystal message after Cinder (L1106–1110):**
  - "Her journal—page two—I think it refers to the Crystal Caverns, deep beneath the vault… She sealed the descent. For good reason."
  - "I believe the Tuner was born there, or at least reforged."
- **Eldon in Stonebridge (L1140–1145):**
  - "The vault is only the mouth… the forge is deeper... the Crystal Caves..."
  - "the Tuner… it wasn't built—it was born."
  - He suspects "the Tuner's final harmonization took place there, inside a place of harmonic convergence."
- **Lyra's journal, Ember Vault fragment II (L4194–4200):**
  - "Beneath the slag. Beneath the glass veins. I heard it down there once—the resonance so clear it bled through stone. The forge. The first forge. I couldn't reach it. I had to seal the descent—it was collapsing under its own dissonance… the vault is only the mouth. The song lies deeper. But without the Tuner, or a path through the flowstone, you won't survive the descent."
  - GM note (L4202–4206): the **western wall of the Ember Vault** hides the sealed collapse. Investigation DC 15 or Arcana DC 14 reveals humming. "Excavation or external access will be required to return later."
  - It is set up as a "mid- to late-game optional dungeon, providing origin lore, a major upgrade site, or even a late-campaign echo of Lyra's presence."
- **Rumors (L1186–1188):**
  - "There's a place beneath the mountain where the earth sings… It hurts to listen to it."
  - "A miner once found a path under the forge tunnels. Came back raving—said the crystals were alive. Said they whispered about 'tuning the wrong world.'"
  - "There's a buried forge chamber, deeper than the vault. The stone glows blue there, not red. You ever seen cold fire?"
- **Bulletin board (L1004–1005):** Fate "is delivering something big. Eldon says it concerns the Crystal Caves."
- **Exits:**
  - After Cinder, players may "begin gathering tools and knowledge to one day enter the Crystal Caverns beneath Mount Cinder (currently sealed)" (L1116).
  - The Stonebridge option is to "prepare for reentering the Crystal Caverns" (L1175).
- **Stillwater's Archive Spiral (L3325)** links Stillwater → Shadowfell Forest → Crystal Caverns on the sigil map.
- **Sigil Fragment #12, "Crystalline Resonance" (L2810–2813):** "Possibly tied to the Harmonic Tuner's origin or amplification point."
- **The vision of the Tuner's third setting (L2633)** takes place in "a resonance chamber of deep crystal and black-veined stone." That could be this place (inferred).
- **Seraphina's interest (bandit journal, L4132–4144):**
  - "The Mistress says the crystal harvest is better than we thought… That Tuner thing… it'll juice 'em up like lightning in a bottle."
  - "she needs some crystal thing, a prism… hidden in the old temple."
  - "The crystals... they're like pipes, leading to something darker."

**The Lumina Collective and other cave life** (L4441–4446, L4479–4481)
- **The Lumina Collective:** "Sentient crystal entities communicating via resonance." There is no other detail and no stance is given (ally or enemy is open; inferred).
- **Crystalline Sentinels:** "Golem-like constructs guarding the Crystal Caves."
- **Crystal Dragons:** "Ancient, sentient dragons with faceted scales."
- **Cave-Adapted Creatures:** "Blind echolocating bats, crystal-armored insects."
- **Corrupted Earth Elementals:** "Whispers from ancient stones drive dwarves mad." This suits Grom and dwarven miners (inferred).
- **Dark Crystal Shards:** "corrupted crystal growths that might spawn beings or environmental hazards."
- **The Heart of Lumina:** "The massive pulsating crystal may be defended by an unlisted elemental, guardian, or resonance-based sentinel." That is all the notes say about the Heart.

**Lyra's Tuner research there**
- She found "the first fragments of the Harmonic Tuner theory" here (Plains version).
- Or the Tuner was "born" or "reforged" at "the first forge" deep below the Ember Vault (Cinder version).
- Eldon (L4307): "Lyra recovered it—or rebuilt it, depending on what documents you believe."

**Nearby Cinder resources** (could carry over; inferred)
- Arcane Dust Veins, which yield Harmonic Dust; Volcanic Resonance Ore; Echo Pools of singing molten glass.

**Build notes (inferred)**
- Blue "cold fire" crystal caverns below the red Cinder vault.
- Entry by excavating the Ember Vault's west wall, or by a second entrance from the Plains. That would reconcile both locations.
- The Heart of Lumina as the boss chamber, a Tuner upgrade site and the place for Lyra's echo.
- Sentinels as constructs. The Collective speaks only through tones, so a puzzle NPC.

### 1.3 Plains of Silent Stones

**What the notes say**
- **Location list (L1935):** "Bone-strewn landscape, haunted by failed harmonic experiments—silent and cursed."
- **Gazetteer (L3646–3652):** "Barren stone plains where ancient cultists once performed powerful rituals."
  - "Still haunted by the energies of past rituals, with ancient stones marking significant locations." "A quiet, eerie place filled with the remnants of forgotten magic."
  - Key location: **Ritual Sites**, "Stone circles or lone monoliths used for ancient, planar rituals. These sites may hold ancient knowledge about Seraphina's goals."
- **Sigil Fragment #10, "Silent Echo" (L2802–2805):** "Carried by **nomads who hold an oral Rootsong variant**."
  - Those two words, plus the beast entries below, are everything the notes say about the nomads.
- **Corrupted beast:**
  - "Corrupted Beast – Attacks livestock in the Plains of Silent Stones" (L4431).
  - "Corrupted Beast of the Plains – A great shadow-wolf or blight-infused predator stalking the nomads, described but not yet encountered" (L4472).
- **Other threats (L4473–4474):**
  - **Stone Guardians**: "Resonance-woken constructs or spirits tied to the ancient monoliths."
  - "Predatory Sandworms / Giant Scorpions / Wild Dog Packs."
- **The Crystal Caves lie "beneath" the Plains** in one version (see 1.2).
- **The town suffering unnatural silence is Stillwater** (L3987–3992): "A town near the Plains of Silent Stones suffering from an unnatural silence and shadowed dreams."
  - "A place where the effects of planar rifts are keenly felt. It holds significance in the campaign's final stages."
  - Key location: **The Silent Stones**, "Ancient ritual sites used by cultists." The entry ends with a stray "Duidic Circle" (sic).
  - **CONTRADICTION:** Act 3 Stillwater is an empty, frozen lakeside town with no people, clock stopped at 3:33 (L3210–3221). The gazetteer's town is inhabited and "suffering". The map puts Stillwater in the "Southwest Corner (far)" (L4089).
- **Related:**
  - Eldon (L235): "if you hear silence—true silence—know that the Veil is thinning."
  - The Stillwater sigil "must be harmonized with silence, not sound—a silent verse is required in the Rootsong" (L3196).
  - The Scourgestinger of the Bloom (giant scorpion, 6) lives at a "Salt Road desert ambush site or Mount Cinder's outer dune". It fits the plains' scorpion entry (inferred).
  - Not to be confused with **Silent Stones Cemetery** in Stonebridge (section 3).

**Build notes (inferred)**
- An open, bone-strewn steppe of standing monoliths that grow quiet as you approach (a silence aura).
- A nomad camp whose elders sing the oral Rootsong variant and give fragment #10 once their beast is killed.
- The Corrupted Beast as a roaming shadow-wolf boss that raids livestock.
- Stone Guardians wake when monoliths are disturbed.
- Stillwater sits at the plains' edge as the "silent town".

### 1.4 Saltwind Coast / Saltwind Harbor, Smugglers' Cove, the Leviathan, the port town, the Isle of Whispers

**Saltwind Coast (L3890–3896)**
- "A coastal region with smuggling operations controlled by Seraphina's cultists."
- "Hidden coves, corrupted sea creatures, and cultist smugglers."
- Quests: "tracking down cultist activities or dealing with corrupted sea creatures."
- **The port town is "Ironhold or Fellmoor (choose one)"**, "with ties to the cult's smuggling network. The players may infiltrate the town to gather information or stop smuggling activities." It is otherwise undescribed.
- **"Saltwind Harbor"** appears only in "Leviathan of Saltwind Harbor" (L4449). Whether harbor equals the port town is open (inferred).
- **Sea of Eldenwood (L3995–4000):** the coastal waters around the region. Murky, with creatures changing under the Bloom. Its key location is the Saltwind Coast's smuggling coves.
- **Map:**
  - Saltwind is West/Southwest (L4084).
  - "Thornmere – Northwest of Saltwind Coast; a sleepy town with hidden cultist ties" (L4098).
  - The Sunken Forest is south of Saltwind (L3661).

**Smugglers' Cove (L4015–4023; L1940–1941)**
- "A secretive cove tucked away along the coastline, often hidden by the shifting tides and fog."
- The hub for the cult's smuggling: "hidden docks and underground caves used to store illicit goods."
- "Corrupted sea creatures, drawn to the dark energy of Seraphina's cult, now infest the waters around the cove."
- "Access to the cove is well-guarded, with only a few hidden entryways known to the cultists."
- **Cultist Hideout:** "A large underground complex that serves as the center of smuggling operations, with multiple chambers and hidden rooms."
- **Corrupted Sea Creatures** "guarding the cove's entrance."
- Also (L1941): "On the way to the Sunken Village. Cult activity, strange shipments, hidden sigil markings."

**The Leviathan (L4449)**
- "Leviathan of Saltwind Harbor – A sea creature corrupted by the Bloom, emits psychic waves." That is the only line.

**Isle of Whispers**
- **Location list (L1945):** "Surrounded by harmonic fog. Travelers go missing—or return hearing songs only they remember."
- **Gazetteer, entry 1 (L3667–3673):** "A small, isolated island surrounded by unsettling echoes of planar energy… ancient ruins and dark forces… ghost stories about lost souls trapped there."
  - **Echoing Ruins**: "contain echoes from other realms, revealing lost knowledge or sinister warnings."
- **Gazetteer, entry 2 (L3980–3986):** "Echoing Ruins: Contain clues to **Seraphina's true origins**."
- **Sigil Fragment #11, "Whispered Isle" (L2806–2809):** "Might be held by **spectral archivists**—requires resonance translation."
- **Act 3 branch hook, "Where the Veil First Sang" (L3542–3551):**
  - Theme "Forbidden Harmony, Sacrifice, and the Bloom's First Voice". Tone "isolated myth, tidal memory, sunken knowledge".
  - Goal: "Reach the Isle that **appears only during resonance alignment**. Discover what was silenced… and who still sings there."
  - Hook: "Elara's hearth mirror briefly flickers with the image of the isle—though no one has spoken its name aloud in years."
  - Features: "Time-warped island, where echoes loop until corrected."
  - "Players encounter **versions of themselves who never left Stonebridge**."
  - "A **Resonant Choir trapped mid-song**—frozen for centuries."
  - Reward: "a Bloom-Rooted Sigil Fragment forged from memory and sacrifice."
- **Direction (L3570):** "To the west, past coastal cliffs and silver reeds, a song drifts from an isle no map recalls."
- **From Stillwater (L3337, L3330):** "seek the lost harmonic core". "A new sigil line is beginning to form—toward the Weeping Tree or the Isle of Whispers."
- **Related:** Elara's inn mirror shows a new sigil in condensation at twilight (L3101).

**The Sipping Serpent (CONTRADICTION)**
- (a) Rumor (L1191): "the Sipping Serpent inn on the coast? It's gone. Burned flat. But no bodies. Just petals. Black, smoking petals."
- (b) Gazetteer (L3788): "The Sipping Serpent Tavern: A secret cultist hub **within Stonebridge**."
- Items (L4502) say Seraphina's Research Notes are found "by infiltrating the Sipping Serpent Tavern."
- One reconciliation: it was a coastal smugglers' inn, now burned, possibly after the party exposed it (inferred).

**Other waters useful for a coast update**
- **Tidewater Bay (L4024–4035):** the central waterway south of Stonebridge.
  - Calm, a trade route, rich marine life with some glowing or mutated fish.
  - "Hidden Islands" with hermits, pirates or cultists.
  - "Harbor Towns… including Saltwind Coast and a hidden town potentially linked to Seraphina's plans."
  - **Stonebridge Port** is "just north of Tidewater Bay… heavily trafficked dock area."
  - **Whispering Pines Dock**, on the west shore, is "where ships travel in and out of the dangerous marshes."
  - **The Tidewater Isles** have ruins or caves, possibly cult-linked.
- **Blackwater Gulf (L4036–4047),** west, beyond the Blackroot Forest:
  - Black, foggy, cursed algae-bloom waters, a "Pirate Haven", planar rifts and corrupted sea life.
  - **Blackwater Port**: "A grim, decaying town… hub for illicit trade, but also a place where some residents hope to escape the curse."
  - **Blackroot Reef**: underwater caves, "occasional appearance of shadow creatures."
  - **Drowned Graveyard**: submerged ruins of a long-lost civilization.
- **Stormwrack Bay (L4048–4059),** east, toward the Whispering Pines and Razorwood:
  - Violent storms "believed to be connected to planar anomalies… or the Shadowfell's influence", shipwrecks, pirates and cult coves, submerged ruins.
  - **The Tempest Isle**: an island at its heart with "an ancient artifact or magical relic connected to Seraphina's plans."
  - **The Stormwrack Archipelago**: pirate hideouts, "cursed treasures and shadowed beasts."
  - **The Lost Lighthouse**, on the north shore: abandoned. Its light "now flickers erratically, drawing more ships to their doom."
- **CONTRADICTION: Stonebridge's water.**
  - Act 1: a river town on the Blackroot River (L12).
  - Gazetteer: the Almer River (L3866).
  - Also "Stonebridge Port" on Tidewater Bay, Aric's guardpost "overlooking the docks… salt and iron" (L3400) and "distant waves in the river" (L1469).

**Build notes (inferred)**
- A salt-marsh coast with a port town (pick Fellmoor or Ironhold) where smugglers move cult goods: silvered cages, tuning rods, black stones and jars of ash, from Fate's rumors.
- A Smugglers' Cove cave complex.
- The Leviathan as a sea boss whose psychic waves cause screen distortion and confusion.
- The Isle of Whispers reachable only during a "resonance alignment" (a night or event), with a frozen choir puzzle and Seraphina-origin lore.

### 1.5 Redrock Haven

- **The whole entry (L4459):** "Desert Raiders under Pollen Influence – Driven mad by corrupted spores near Redrock Haven."
- **Related desert material:**
  - The Scourgestinger of the Bloom: "Salt Road desert ambush site or Mount Cinder's outer dune" (L4330).
  - "Predatory Sandworms / Giant Scorpions" on the Plains (L4474).
  - `alpha3-data-spec.md` already has a `desert` region tag.
- **Build notes (inferred):** a red-rock desert settlement on the Salt Road. Raiders whose minds are taken by Bloom pollen (spore clouds, a `confuse` effect) attack caravans. The Scourgestinger is the local apex predator.

### 1.6 Duskwood

- **The whole entry (L4454):** "Corrupted Fey – Found in Duskwood, now use illusions and chaos to spread the blight."
- **Related fey material:**
  - Oakhaven: "Rumors persist that the deeper parts of the surrounding forest hold hidden fey ruins, ancient dryads, or even tree-guardians who have gone silent since the corruption began" (L3944).
  - The Scribe's Oak holds "ancient fey lore". Calla Fernroot knows "fey curses".
  - The Weeping Willow approach is a "semi-fey grove fringe" (L1960).
  - "Disguised Bloomtouched sprites and animated thorns" ambush on the Circle trail (L1573).
  - Illusion-forests: the Shadowed Woods ("illusions that distort time and space", L3657), the Shroudwoods (voices lead astray) and Mirkwood (dark spirits).
- **Build notes (inferred):** a twilight forest of corrupted sprites, dryads and illusion traps, reached from Oakhaven. Calla's fey-curse knowledge is the key, and the silent tree-guardians are worth waking.

### 1.7 Other regions the game lacks (brief)

- **Frosthollow Reach (L3696–3703):**
  - A snow-covered northern region "locked in an unnatural, perpetual winter". Once home to nomadic tribes, now sparse. Strange creatures and ancient spirits.
  - **Aurora Watchtower**: on a peak, "ancient scholars watch the stars and observe planar rifts"; "high importance for planar research".
  - The **Glacial Gate** (L1949): "Mentioned in a resonance map. Possibly holds an isolated frost-tuned sigil."
- **Stormshroud Highlands (L3765–3771):**
  - A plateau "perpetually cloaked in thunderstorms and lightning."
  - **Ancient Observatories** that tracked planar anomalies. They hold "vital clues about redirecting the energies of the Harmonic Tuner and understanding how to control planar rifts."
- **Scorched Cliffs (L3704–3711):**
  - A volcanic region of tremors, eruptions and glowing red cracks. Elemental cults "used the volcanic energy to fuel their magic" before Seraphina.
  - **Ancient Temples** and **Leyline Fissures** ("planar rifts leaking energy from below").
  - Overlaps heavily with "The Peaks of Mount Cinder… Elemental Temples" (L3618–3624). Probably the same zone (inferred).
  - Nico's Dragon's Blood is "From the volcanic cliffs—preferably still warm" (L144).
- **Blackroot Forest (L3674–3680, L1947–1948, L4001–4007):**
  - "Unnatural stillness and secrecy". "Hidden settlements and cultist enclaves, shielded by illusions." "Trees… grown with the blood of ancient sacrifices."
  - **Secretive Settlement**: a hidden cultist outpost "near the river… dark rituals… under the cover of illusions."
  - **Blackroot River**: dark, misty; travellers "hear whispers or see strange visions". CONTRADICTION: Act 1 says Stonebridge sits on the Blackroot River.
  - "Deep magic and decay. Thought to contain a fragment or early leyline fracture."
  - **Fragment #14 "Rootbound"**: "Guarded by **Rootward cult remnants**; tied to ancient sealing rites."
  - Mandrake Root source: "Haunted Glen or Blackroot Forest" (L325).
- **Shroudwoods (L3681–3687, L1942–1943):**
  - "Perpetually misted forest filled with shifting paths. Ancient sigil carved into moving trees." Voices lead travellers astray. Cultist gatherings.
  - **Shrouded Grove**: a hidden ritual clearing.
  - **Fragment #13 "Forgotten Bloom"**: "Hidden deep within planar illusions—may require a memory catalyst."
- **Mirkwood. CONTRADICTION:**
  - (a) "Former elven city and archive—hidden in the trees, possibly still containing the **First Harmonist records**" (L1937–1938). Eldon also cites "the Archives of Mirkwood" (L4304, L4318).
  - (b) "A vast forest stretching along the borders of Eldenwood… haven for dark spirits". **Ancient Groves** where cultists perform rituals (L3632–3638).
- **Shadowed Woods (L3653–3659):** corrupted, with shadow creatures and time/space illusions. **The Bandit Camp** is here, where "cultists and rogue forces plot." This is a candidate for Aric's bandit plot (inferred).
- **Thornmere Valley (L3712–3718):** "A quiet, verdant valley… once fertile farmland". Strange growths, vanishing wildlife. **Druidic Glade** with druids resisting corruption.
  - CONTRADICTION: Thornmere is also a misty marsh town (L3719ff, in game) and an "Ancient ruined town tied to early Harmonists" (L1930). Fragment #15 "Thorn-Sealed": "Ruins overtaken by twisted bramble magic; partially corrupted."
- **The Lake of Whispers and the Hidden Refuge (L3974–3979, L4008–4014):** "A dark lake where whispers of the past and future seem to emanate." "Some say the lake is a gateway to the Shadowfell."
  - The **Hidden Refuge** on its shore: "A safe haven for those resisting the Shadowed Bloom… where the resistance gathers and shares intelligence."
- **Echo Spire (L1951–1952):** "Obsidian tower built atop a collapsed leyline. Its chimes are heard only during eclipses."
- **Circle of Ashen Roots (L1172–1173):** "Investigate the primal druids' abandoned circle. Rumors of twisted rituals and corrupted guardians." It is offered as an Act 2 choice and never written up.
- **Smaller named places:**
  - Skyreach or a "sacred peak", phoenix nesting ground "north of Eldonwood" (L145, L324).
  - The Haunted Glen (Mandrake Root).
  - The eastern hills bandit country (L990).
  - The **Stillwater outpost** ("silence… for months", Aric, L3402).
  - The Old Waystone Path (L3102).
  - The Salt Road (L4330).
  - The Whispering Pines (trail fork and dock).
  - "Rootbound Realms" east (L4074).
  - The Veilwood Clearing (L2658).
- **Map layout (L4060–4099):**
  - Stonebridge at the centre, ringed by standing stones.
  - North/NW: Shadowfell Forest and Veilwood.
  - East: Verdant Vale, Weeping Willow, Rootbound Realms.
  - South/SE: the Mirrorroot.
  - West/SW: Saltwind, Smugglers' Cove, Sunken Village.
  - Far SW: Stillwater.
  - Mount Cinder NE of the Vale. The Circle on the Vale/Shadowfell border.
  - CONTRADICTION: the Shadowfell Forest is also "South of the Vale" (L2317, L1524) and "northeast" (L3568). The Weeping Willow is "east of Verdant Vale" (L1892), "near the edge of the Shadowfell Forest" (L1876) and "to the south" (L3569).

---

## 2. Oakhaven in full

**Two versions in the notes: the Act 2 investigation (L436–505, L586–606) and the gazetteer (L3897–3944).**
- Setting: "nestled in the gentle bend of the river and framed by tall birches", east of Stonebridge on the road to Razorwood.
- Layout: "Wooden cottages, cobbled paths, a central square, quiet stream, dense forest."
- Tone: "Quiet, rustic, slightly unnerved". Mist, eyes behind shutters, a story "people are afraid to tell."
- Greystone is 1–2 days northwest (L605, L635), "past the western ridge" (Mira, L580).
- CONTRADICTION: the gazetteer says Ember was "Recently rescued, she holds knowledge of the cult's activities" (L3933). The main quest keeps her lost across the Veil.

**Act 2 locations**
- **Village Green:** central square with benches, a well and an old druidic statue.
  - Children whisper that Ember saw "trees that talked".
  - The rumor board is blank because recent postings were torn down.
  - Insight DC 13 or Persuasion DC 12 points to the streamside hut.
- **Streamside Hut:** overgrown, at the forest edge.
  - Ember's scorched drawings in the hearth (Arcana DC 14: harmonic sigil remnants).
  - A hidden locket inscribed **"E.M."** It was Mira's home. Ember's family "lived by the streamside hut".
- **Trade Post & Supplies:** Lendel [src], friendly but cautious.
  - Mira gathers herbs near the Sacred Stone Circle. Ember sat by the shrine drawing in ash.
  - "Some think Ember returned from Razorwood with something inside her."
- **Sacred Stone Circle (Eastern Hill):** an old druidic site half-swallowed by nature, where Mira is found.
- **Watcher's Barn** [src] (optional): Ember was seen here after her return.
  - Hand-shaped scorch marks. "Strange feathered scales in the hay".
  - A child's song scratched into a beam: **"The bloom is red, the root is black, it grows where night won't take it back."**
- **Oakhaven Tavern** (unnamed in Act 2): a free round "in honor of your bravery".
  - A bard sings of "a vault locked with wind and stone".
  - An elder tells of Old Greystone, "once a mountain stronghold sealed after the Veil Wars".
  - Mira brings bread and leaves Ember's locket, now glowing faintly.

**Gazetteer locations (L3912–3930)**
- **The Acorn Green:** an open-air market under towering oaks: produce, wooden crafts, herbal remedies. Probably the same place as the Village Green (inferred).
- **Elderwood Hall:** local governance and meetings, "Covered in living vines and ancient carvings."
- **Grove of Whispering Leaves:** a sacred grove where "druids and clerics perform rituals and seek communion with forest spirits."
- **The Bellowing Boar** [src]: a lively tavern, boar heads on the walls, "hearty stew and forest tales."
- **The Weary Wanderers' Rest:** a cozy inn "Built from reclaimed oak and mossy stones."
- **Old Man Hemlock's Provisions** [src]: "strange odds and ends", run by "a grumpy but sharp-minded elder."
- **Riverwood Traders:** "run by a half-elf couple who barter in rare forest goods and rumors." The couple is unnamed.
- **Ironbark Forge** [src]: "sturdy tools and unique wooden-metal hybrid weapons."
- **Greenroot Remedies:** apothecary, "potent salves and teas. Also rumored to make stronger brews in secret." Run by Calla Fernroot.
- **The Scribe's Oak:** "A library built around and within a massive hollow oak tree, housing nature texts and ancient fey lore."
- **The Chestnut Corral:** stable "tended by a kind-hearted dwarf who sings to horses." The dwarf is unnamed.
- **Oakhaven Garrison:** "modest but vigilant guard post keeping watch on forest disturbances." Captain Thorn Hallowbrook.
- **Silent Glade:** "A serene cemetery where the wind through leaves sounds like whispered prayer."
- **Root Tunnels:** "An old sewer and escape route system beneath Oakhaven, now overgrown and partially forgotten."
- **Sawtooth Mill** [src]: "A lumber mill at the town's edge. Recently plagued by rumors of cursed wood and flickering lights."
- **The Whittle and Chisel:** "Workshop for artisan woodworkers, producing religious totems and ceremonial instruments." These could be resonance instruments or tuning forks for the Rootsong puzzles (inferred).
- **The River's Landing:** "A dock where small boats drift to and from neighboring river communities."
- **The River's Catch:** "A small fishing area for local food supply."

**NPCs**
- **Elder Merion Willowcloak** [src]: "Town leader and a retired druid who maintains balance between progress and tradition."
- **Old Man Hemlock** [src]: "Gruff but wise storekeeper who knows old stories and forest legends."
- **Calla Fernroot** [src]: "Head herbalist of Greenroot Remedies, knowledgeable in forest medicine and fey curses."
- **Thorn Hallowbrook** [src]: "Captain of the Oakhaven Garrison, suspicious of outsiders but fiercely loyal."
- **Mira** [in game]: Ember's grandmother. Wary, then wise and emotional.
  - Gives the **ash cloth** (key item) and later Ember's locket.
  - Quotes: "She said the sigil was a door. And that the tree told her how to listen." / "If you find her again… please… bring her home. If she's still in there." / "Something opened her eyes in there. Pray it hasn't taken the rest of her." / Ember called Greystone "the Vault where stone remembers."
- **Lendel** [src]: shopkeeper (above).
- Unnamed: the Riverwood half-elf couple, the singing dwarf at the Chestnut Corral, the tavern barkeep, a bard, an elder, the children.

**Quests and dangers (L3937–3940)**
- **The Lost Child of Oakhaven (Ember):** "drawn into the woods by strange whispers. Her drawings of a sigil help uncover the cult's dark ritual."
  - Steps: Investigation Progression Table (L485–497). Talk to children or elders → streamside hut → trade post → Sacred Circle (meet Mira, ash cloth) → optional Watcher's Barn.
- **Oakhaven's Lumber Corruption:** "Trees felled from the forest have begun exhibiting signs of corruption. Some **animated wood constructs** have appeared near the mill."
- **Cultist Activity:** "Forest-dwelling cultists are subtly influencing Oakhaven's woods. Some townsfolk report dreams, missing time, or hearing voices at night."
- Aric is "investigating bandits captured outside Oakhaven" (L1158).
- The Sending Crystal can recall to "Oakhaven if that's their current 'safe hub'" (L4826).

**Culture**
- "Druidic rituals are commonly performed during seasonal festivals."
- "Many residents wear wooden charms said to ward off the forest's darkness."
- Fey ruins, dryads and silent tree-guardians are rumored deeper in the forest.

---

## 3. Stonebridge extras

**Town facts**
- "Medium-sized frontier town", population 1,500–2,500 (L3792–3794), at the "eastern edge of Eldenwood".
- CONTRADICTION: "wooden palisade walls" (L12) vs "strong stone architecture" (L3848).
- CONTRADICTION: river is the Blackroot (L12) vs the Almer (L3866). There is also a port and docks (1.4).
- **Lady Thalara**, the founder: a large statue at the centre of Stoneheart Plaza (L3855).
- **Thalara's Bridge**: "The original 'Stone Bridge'… partially cracked, reinforced with steel."
- **Culture (L3880–3884):**
  - "Most residents wear greenstone charms believed to protect from forest spirits."
  - Weekly market days in Stoneheart Plaza.
  - "Bells are rung every dawn and dusk to 'ward away the mists.'"
  - "Eldenwood was once a source of trade—herbs, wood, and beast parts—but now all forest harvesting is banned."
  - Trade goods: "salted fish and riverglass" (L4106).
- **Threats (L3875–3879):**
  - "Cultist Infiltration… They use the Shadowed Mug, the Underways, and trade caravans for smuggling and communication."
  - "Black roots and corrupted rats" in the Underways.
  - Disappearances "near the cemetery or the southern edge of town."
  - "Council Division" (below).
- **Passive checks (L27–29):**
  - DC 13: "a robed figure ducking into an alley near The Shadowed Mug."
  - DC 15+: "the town layout feels too… neat. Almost like someone is trying to funnel attention away from something."
- **Night encounter (L206–211):** "A long-limbed silhouette glides across a rooftop. You hear claws on slate." Perception DC 15. Arcana DC 14 detects corruption.
  - Mug rumor: "There's a creature that walks the rooftops. Tall. Smells like iron."

**Places not yet in the game list**
- **The Underways:** "Old sewer and tunnel system… rumored to connect to deeper tunnels and cultist routes." Black roots, corrupted rats, "Whispering voices are heard in the dark."
- **Silent Stones Cemetery:** "Peaceful graveyard on the outskirts… increasingly uneasy place as corruption causes strange phenomena. Whispers are sometimes heard at night." People vanish near it.
- **The Wishing Wall:** "A crumbling garden wall at the edge of town where townsfolk leave prayers and tokens. Sometimes, these vanish mysteriously."
- **The Hearthstone Shrine:** "dedicated to the local deity of protection and community." Rumor: "Someone's been stealing from the shrine again…" (L926).
- **The Elder's Hall:** "domed granite structure". The council is "divided between a faction that wants to flee and another that wants to fight. Eldon is the voice of moderation."
- **The Bridle & Bit Stables:** "Mount care, travel services, rentals." Act 1 adds: "Rows of mounts, some restless as if sensing coming change."
- **The jail**, at the Watchtower: captured bandits can be questioned (L1161).
- **The Stonebridge Archives / "Deep Notes"** (L1782–1874, L2710–2745): a sealed vault beneath Eldon's tower that only a fragment-carrier can open. Contents:
  - a domed spiral library, a **Resonant Table**, the Fragmented Resonance Map (13 fragments), Druidic Tuning Records, the Ciphered Scroll of the First Harmonist, an Ampoule of Memory-Inked Glass;
  - the Glyph of the Tenth Bloom, the Harmonic Primer, the Eldenwood Expansion Theory map (9 vs 14 points), the "Whispers in the Veil" bard journal, and Rootbound Letters (dream-leaves, one signed "Lyra").
- **Resonance Anchor location in Stonebridge. CONTRADICTION:** "central fountain" (L876), "ancient rune-stone in the Stonebridge plaza" (L896), "Stonebridge Resonance Obelisk, just outside town" (L1124) and "the Stonebridge circle, beneath the old standing stones" (L3040).

**Shops and NPCs**
- **Tilda Gembright** [name in villagers.js only]: Jeweler/Goldsmith. "Sells precious metals, gems, and jewelry." No personality given.
- **Elion Varrastel** [src]: Bookstore/Mapmaker. "Sells books, maps, local lore documents." Possibly the "map seller… asking questions about ancient roots and standing stones before heading east" (L1166) (inferred).
- **Velthra Duskgild** [src]: Pawn Shop. "Sells and loans goods, potential shady dealings." A natural fence for cult goods (inferred).
- **Etta Narlane** [src]: "High Scribe at the Scribe's Quill. Has vague knowledge of the Harmonic Tuner and ancient magic texts."
  - The Scribe's Quill is "A tall, spire-like library of stone and oak… Maintained by a group of scribes under Eldon."
  - Phenomena over the campaign: ink bleeding and pages humming; "ghost harmonics heard on the riverbank"; a blank humming tome; "journals singing in the night—one page burns the moment it's read aloud."
- **Thorin Stoneshield** [src]: "Tavernkeeper at The Gilded Griffin" (L3844). CONTRADICTION: everywhere else Elara runs the Griffin.
- **Kael Ryn**: "Manager of the Shadowed Mug. Has quiet cultist ties and may be encountered in later betrayal arcs" (L3873).
- **Kael Dorne** [src]: "Smooth, tight-lipped, secretly involved with cultists", at the Shadowed Mug (L190).
- **Jonric Vane** [src]: the gazetteer line reads "The Shadowed Mug Jonric Vane" (L3811), presumably its keeper.
- CONTRADICTION: the Mug is run by three different people: Kael Dorne, Kael Ryn or Jonric Vane.
- **Kael, apothecary of "Kael's Curatives"** [src] (L3392–3398), "formerly Nico's Arcane Emporium". The old "Arcane Emporium" sign is "partially scorched".
  - Wary. Stillwater "shakes something personal in him. He's hiding more than he admits." This is a third Kael.
- **Greenleaf Remedies** [src] (L916–919, L2414): Anti-Corruption Poultices, Harmonic Dust ("can resonate with active sigils"), Odd Charms ("rumored to resist whispers in the veil"). Later: "Rootsong-stabilizing elixirs and 'sorrow salves' brewed from Weeping Willow sap". No proprietor is named.
- **The Rusty Lantern Inn** (L920–925): "Elara Hearthwood welcomes the party." 1 gp/night. A bard sings: "Where ash and flame dance, the mountain speaks back…" CONTRADICTION with the Gilded Griffin.
- "Visit Elara at the Shadowed Mug" (L1155): a third CONTRADICTION for Elara. "She's heard whispers of the Vale stirring, and is nervous about her family roots in the region."
- **Bartholomew** [src]: "Dry-humored, watchful, hears everything." "I've sold more oil and fire powder this week than I have all year. People are preparing to burn things. Or someone." Later stocks Weeping Willow Sap and Dissonance Snuffers. There is a bell above his shop.

**The Shadowed Mug / Sipping Serpent intrigue**
- The Shadowed Mug is "Quiet rival tavern, subtly wrong in atmosphere (DM hint: cultist front)" (L17), a "known cultist meeting place and central to an intrigue arc" (L3857).
- Every evening "a warm glow spills from the Shadowed Mug Tavern like a ward against the oncoming dusk" (L4106).
- Rumors need Insight DC 13 or clever talk:
  - "The cult doesn't worship the Bloom. They feed it."
  - "There's a vault beneath Old Greystone. Sealed by resonance."
  - "The Bloom isn't coming from the woods. It's already underneath us."
  - "Townies vanish. Ask too many questions? You're next."
  - "The scouts weren't killed. They were turned."
  - "Old Greystone hides a vault. Only a Tuner can open it."
- Resting there is "Suspicious, may lead to eavesdropping or ambush" (L214). It is a place to tail a suspicious figure (L205).
- Watchtower notice (L994–996): "A few shady figures were dragged out of the Shadowed Mug by the guard last night. Rumors swirl of a **secret basement and a map marked with veils and bloom symbols**."
- Starting hook (L3889): "The Shadowed Mug's Secrets: Investigate cultist recruitment happening right under the party's nose."
- **"The Gossiping Tavern Keeper's Rival"** is named only in the item entries. Seraphina's Research Notes (and the Network Map within them) are "Found during the The Gossiping Tavern Keeper's Rival quest, or by infiltrating the Sipping Serpent Tavern" (L4502, L4508). No steps are given.
  - Reading (inferred): the gossiping tavern keeper is Elara (Gilded Griffin). The rival is the Shadowed Mug's keeper (or the Sipping Serpent's), whose basement holds the notes and map.
- **Sipping Serpent:** see 1.4. Either an in-town cult hub or a coastal inn burned to "black, smoking petals".

**Bulletin board (L987–1014)**
- Aric: "WANTED – Bandit Leader Still At Large!", eastern hills. The amulet is recovered "but darker ties to cult activity have emerged."
- Anonymous: "Nico's Shop Was Closed for Days…", glowing late, voices.
- Watchtower: Mug patrons questioned (above).
- Grom: "Apprentice Still Missing Tools": Lyra "still owes me a set of precision chisels and my rune-etched forging hammer. She's not in trouble—just bring word."
- A farmer: "Our cabbages turned black overnight. Deer come with eyes glowing like coals."
- Tavern talk: Fate is delivering something about the Crystal Caves.
- The Scribe's Quill: old tomes unstable.
- Dock traders: "Zephyr's Yak-Lizard Spooked… 'Lyra didn't tell the mountain goodbye.'"
- A faded note: "The Moonlight Walkers Are Stirring. They walk the marshes only on moonless nights. Listen for the flute—if it plays, it's already too late." [src]

---

## 4. People

**Possible travelling companions and hirelings** (the notes never use either word)
- **Junior guard** (L162): Aric offers "Potentially a junior guard as backup (if convinced)." This is the only hireling-like offer. Unnamed.
- **Lost Pilgrim of the Circle** [src] (L1229–1234, L1274): a blindfolded elven man in ceremonial vines.
  - "Can guide the party partway, but becomes agitated when near corrupted ground."
  - Insight DC 15: he is "slowly becoming a **Bloomtouched Oracle**—dangerous but knowledgeable."
  - "If kept with the party, he may react violently to sigils or strong resonance." The most explicit companion in the notes.
- **Zephyr** [in game]: a travelling dwarf merchant on a yak-lizard that "can carry up to 500 lbs of goods or two passengers."
  - "Hidden agenda: Zephyr is connected to Eldon and secretly assessing the party's resonance exposure" (L1047).
  - Not described as a companion, but he shows up in the field (Cinder trail, Veilwood).
- **Ilsa the Candlemaid** [src] (L3746): "A mute child who wanders the town lighting lanterns that never go out" (Thornmere).
  - Not described as a companion. She is a possible fit for the "Lantern Bearer… who will light the forgotten path" prophecy (L3757) (inferred).
- **Mara Teldan** [src] (L961–963): an injured herbalist with a broken leg on the Cinder trail. Can be aided or escorted (inferred).
- **Fate** [src]: a recurring courier, never a companion.
- **Local boy** (L71): leads the party to Eldon "for a copper coin" (passive Perception 13+). A guide hireling (inferred).
- **Eldon** explicitly stays behind: "I'll stay. I have to… someone must listen while the rest of you walk the silence" (L1535).
- **Lyra and Ember** are rescue and recovery targets. If recovered, Lyra is the natural companion (inferred).

**Stonebridge**
- **Eldon the Wise** [in game]: an aging elf, silvery braided hair, eyes glowing faintly.
  - Planted the Resonance Anchors with Lyra years ago. Sealed the Archives after the "Bloomlight Convergence".
  - Quotes: "Something watches… and it knows you're coming." / "The Bloom is not a sickness. It is a signal." / "If you hear whispers that sound like music… run." / "…make sure it's the last thing it touches."
- **Elara Hearthwood** [in game]: kind, observant, well connected. Lodging 1 g/night.
  - Her grandmother said "Stillwater was named for what it hid, not what it showed."
  - Has family roots in the Vale. Fate, "the girl in the green cloak", visits her.
- **Grom Ironstout** [in game]: a gruff dwarf, "protective of his past". Silvered weapon upgrades 25–50 g.
  - Later shapes the Resonant Seed and Echo Fragment and reforges Tuner fragments.
  - "There's something… under the stone. I hear it at night."
- **Captain Aric Vellor** [in game]: tired, loyal, stretched thin.
  - His father "served during the last Bloomlight breach. Said some songs you don't sing unless you're willing to vanish with them."
  - Secret hook: "Then it's time I show you something I swore I'd never pass on. Come to the watchtower tonight. Alone." (L3408). Never resolved in the notes.
- **Nico Silverhands** [in game]: flamboyant alchemist, the traitor. CONTRADICTION over his motive:
  - (a) A true cultist: "the Tuner was never broken. It just needed the right fuel."
  - (b) Duped: "She lied to me, too." / "They told me it was a cure… I think the Bloom already wrote me into its song."
  - His fate is open: captured, escaped, dead, or "taken or forced to leave" (boot prints too large to be his, L3431).
  - A mirror shows "A reflection of Nico—bloody, eyes wild… But it isn't his timeline. He places a finger to his lips" (L3460–3462).
- **Bartholomew** [src], **Kael Dorne** [src], **Kael Ryn**, **Jonric Vane** [src], **Kael the apothecary** [src], **Etta Narlane** [src], **Tilda Gembright**, **Elion Varrastel** [src], **Velthra Duskgild** [src], **Thorin Stoneshield** [src]: see section 3.
- **Fate** [src]: "breathless woman, cloaked in a patchy courier's sash and wind-chapped boots."
  - Leaves no footprints. Vanishes "like mist". "Seemed oddly calm… like she knew you'd be here."
  - CONTRADICTION: "travel-worn gray" cloak (L612) vs "the girl in the green cloak" (L3391).
  - Her own seal is "a crescent quill pressed into a circle of thread" (L3579). Catchphrase: "Got something I'm supposed to deliver—your hands only."
  - Her letters are signed "—F" and carry odd seals: a half-open flower, the Bloomed Circle emblem (L379); "a crescent bloom cradling a black sun" (L615).
  - Her true nature is never explained. Candidate for a higher power or a Veil entity (inferred).
- **Lady Thalara**: founder (statue, bridge).
- **Unnamed townsfolk:**
  - the tinker's boy, who "found a pendant in the woods. Now he won't speak and draws spirals in the dirt";
  - the girl who is "Lyra's friend" (L899);
  - the Scribe's Quill clerk; the farmer; a bard.

**Oakhaven:** see section 2. Mira, Ember, Lendel, Merion, Hemlock, Calla, Thorn Hallowbrook and the unnamed others.

**On the trails**
- **Mara Teldan** [src]: injured herbalist. "She tried to follow 'a girl with two-colored eyes' into the highlands."
  - Gives a map fragment marking a tuning-fork-shaped outcrop.
  - Insight DC 13: "she saw Lyra surrounded by flickering light near molten rock."
- **The dead explorer** on the Greystone trail. His journal: "Saw her again—Half-Elf girl, one green eye, one brown. Northbound. Compass glowing… Going alone. I must hear the song for myself."
- **Zephyr** [in game]: "Well now… wasn't expectin' to see your shadows curled this far from sunlight." "Don't let the Tuner tune you instead." Trades one free item "in exchange for a story you haven't told yet."

**Druids, spirits and the old orders**
- **The Circle Elders**: ghostly watchers in Lyra's echo. "Too soon. Not yet harmonized."
- **An elven priestess** (vision, L1227): warns of "roots singing false names" and "a Tuner-born flame swallowing the Vale."
- **The seed-bearer** of the Weeping Willow: a young weeping druid who planted a crystalline seed. "Let my memory keep the seal. Let my root forget my name."
  - Her name is eroded on the Mourning Stone.
  - CONTRADICTION: she is "the sixth" of six druids at the Willow (L2025–2026), but "the seventh druid sacrificed their name to hold back the first bloom" at the Circle (L2264).
- **K'thura. CONTRADICTION:**
  - (a) An individual Whisperer who "shut its heart" to Lyra (L4213).
  - (b) The ancient name of all the Verdant Whisperers: "K'thura, The Living Chorus" (L4351).
- **The First Harmonist and the Harmonists**: pre-Circle resonance scholars. The Ciphered Scroll opens only to "a Veil-borne resonance."
- **The unnamed bard** of the "Whispers in the Veil" journal: "The song is trying to end us. Or remake us."
- **The Bloomtouched Druid spirit** trapped in a tree, singing the Rootsong backward (L1978).

**Thornmere** (town in game; most NPCs [src])
- **Mother Aldwyn** [src]: elder priestess of the Pale Flame, keeper of cleansing rites.
- **Rook Thalen** [in game]: captain of the Mirewatch.
- **Ilsa the Candlemaid** [src]: see above.
- **Harlan Brimm** [src]: tavernkeeper of the Hollow Hearth, a "former cultist seeking redemption."
- **Sister Wren** [src]: herbalist "who trades in secrets more than coin."
- **The pale alchemist** of Wyrdroot Remedies, who "claims to speak with the dead through smoke and herbs" (unnamed).
- The paranoid gloved scribes of the Whispering Archive.
- The cursed noble family hiding in the marsh, "half-corrupted".

**Cult, bandits and suspicious figures**
- **Seraphina**: names and descriptions across the notes:
  - "Lady Seraphina"; "the Mistress" (bandit journal); signs "—† S".
  - "a woman in midnight robes who walks without leaving footprints" (L4108).
  - "a cloaked woman… who made the shadows flicker when she walked past" (L1167).
  - Possibly "quiet, polite, pale as bone", who "Asked me where the 'Resonance-Walkers' went" (L1201) (inferred).
- **The flower merchant** (L1200): "Had no flowers. Just jars of ash and bags that smelled like copper. Creepy eyes."
- **The man up north** (L1199): Fate delivers "silvered cages, tuning rods, heavy black stones" to him. "He never speaks. Pays in old coins… pre-Collapse mint."
- **The map seller** who asked about "ancient roots and standing stones before heading east" (L1166).
- **The bandit leader**: still at large in the eastern hills.
- **The bandit with a flower-shaped scar** on his back, no memory of the past month (L1190).
- **The journal-writing bandit** who serves "the Mistress" (handout, L4126).
- **The Bloomwatcher** [src] (see 6).

**Animals with names**
- **Buttercup** [src]: magical cow. **Zephyr's yak-lizard** [in game].

---

## 5. Side quests and hooks

1. **Ingredients of Unnatural Origin** (Nico).
   - "There's a brew I can make… something that resists planar bleed."
   - **Dragon's Blood**: "From the volcanic cliffs—preferably still warm." Item version: "blood from a corrupted dragon."
   - **Phoenix Feathers**: "From a nesting ground north of Eldonwood. Careful—they don't like visitors." Also "Sacred peak or Skyreach". "Feathers from a phoenix that can stabilize dying creatures."
   - **Mandrake Root**: "Real mandrake. Screaming, soul-sucking, Shadowfell-touched." From the "Haunted Glen or Blackroot Forest". Item version has "healing properties".
   - Twist: the potion is an amplifier or key for the Tuner. "Climax Possibility: The ingredients may amplify the Tuner's power if misused."
   - Choices: fight or pursue Nico, salvage the potion, use Lyra to re-tune it, destroy or wield the Tuner.
   - CONTRADICTION over what the potion does: amplifier/key (L410, L821) vs "resonance destabilizer, meant to suppress sigil fragments and turn them inward" (L3428) vs a genuine counter to the Bloom (L4530, L4543).
2. **Aric's Lost Amulet.** CONTRADICTION over the amulet and how it was lost:
   - (a) "lost… during the last patrol", near the Razorwood. "Silver ringed, Stonebridge crest." Trust needs Persuasion or Insight DC 13 (L166–168).
   - (b) Stolen by bandits. "A golden amulet with a family crest and inherited gem… red gemstone… gem occasionally glows faintly" (L4494–4498). "His stolen amulet leads the players into their first real encounter with the cult" (L3870).
   - Steps (L1158–1162): Aric names "a known bandit trailhead in the foothills". The party questions captured bandits at the jail (Intimidation, Persuasion or Insight), which "could reveal ties to Seraphina's supply line."
   - Rewards: "upgraded local favor and unique relic gear" (L1206). As a "favor token, granting the party limited aid from Aric's allies" (L4497).
   - The bulletin says the amulet is recovered and the bandit leader still at large.
3. **WANTED: Bandit Leader** (eastern hills). Likely leads to the Shadowed Woods Bandit Camp (inferred). The bandit journal handout (Seraphina's plan) is the payoff document.
4. **Grom's Runaway Apprentice.** Find Lyra; uncover the Harmonic Tuner.
   - Items tied to it: **Borin's Journal** [src] (clues to the Temple of Seraphina's seals) and the **Echo of Ancients** [src].
   - **Grom's missing tools** (precision chisels, rune-etched forging hammer) are a fetch sub-hook.
5. **The Gossiping Tavern Keeper's Rival.** Name only. Leads to Seraphina's Research Notes and Network Map. See section 3.
6. **The Shadowed Mug's Secrets.** Cult recruitment, the secret basement, the veil-and-bloom map, tailing the robed figure.
7. **The Milkmaid's Charm** [src]: Buttercup "rescued from the corrupted goblins". Shows "how corruption is affecting normally docile creatures."
8. **Oakhaven's Lumber Corruption:** corrupted felled trees and animated wood constructs at the Sawtooth Mill.
9. **The Lost Child of Oakhaven:** see section 2.
10. **Mara Teldan** (Cinder trail): aid her, get the map fragment.
11. **The Lost Pilgrim:** guide or Oracle; risky escort.
12. **The Moonlight Walkers** [src]: moonless marsh nights, a flute. No further detail.
13. **The Stonebridge Archives:** ask Eldon to open them. Lore and an echo-memory event.
14. **Nico's Abandoned Lab** (L3412–3463), a root-cellar under the apothecary. Clues and loot:
    - notes on the counter-potion: "Phase I complete. Ember's sigil leads to deeper roots. If tuned wrong—she may hum herself open."
    - oversized boot tracks;
    - a hidden vial, "Memory Anchor Test #7 – DO NOT DRINK" (Perception DC 15);
    - Nico's final note; a resonance echo of Nico ("What if the Rootsong isn't a ward? What if it's a door?");
    - rewards: Vial of Stabilized Echo-Glass, Fragmented Research Scroll, Sigil-Scorched Worktable Fragment.
15. **Aric's secret:** "Come to the watchtower tonight. Alone." Unwritten.
16. **Fate's Signal Letter** (L3575–3597): found under a lantern post. "You've heard it too, haven't you? The chord that answers back… I've left you something. Follow the pull."
    - May "activate the next resonance gate, uncover hidden layers in the Sealed Archives, or synchronize with the Echo in Lyra's chamber beneath Stillwater."
17. **Sigil Fragments #8–15** (the expanded lattice, L2789–2828). Each is a region quest:
    - #8 Shadowed Reflection: Shadowfell / Mirrorroot.
    - #9 Coral Bloom: Sunken Village / Coral Vault.
    - #10 Silent Echo: Plains nomads.
    - #11 Whispered Isle: spectral archivists.
    - #12 Crystalline Resonance: Caves of Lumina.
    - #13 Forgotten Bloom: Shroudwoods, memory catalyst.
    - #14 Rootbound: Blackroot, Rootward cult remnants.
    - #15 Thorn-Sealed: Thornmere bramble ruins.
    - Also the "Sorrowbound Sigil Fragment" (Weeping Tree branch, L3541) and the "Glyph of the Tenth Bloom" (L2722).
18. **The Resonance Anchor network.** Attune an anchor at each site for recall and fast travel. The players' "own anchor net" lets them "begin pulling threads of self. Alternate selves, echoes unchosen" (L3514).
19. **Restore the Harmonic Primer:** collect harmonic fragments to rebuild the full Rootsong. Unlocks "Act 3's true sigil unlock code" and "a Tuner attunement form that Lyra never finished" (L2739–2743).
20. **Thornmere hooks** (L3749–3757):
    - **Lantern Wraiths** from the Stillwater Graves, "luring travelers with glowing lights" [src].
    - **Echoes Beneath the Rootways**: "Strange sounds and claw marks."
    - **The Cursed Bloodline**: the old noble family, half-corrupted in the marsh.
    - **Cultist Fragmentation**: cult cells feuding "beneath Seraphina's shadow".
    - **The Lantern Bearer prophecy**.
21. **Circle of Ashen Roots:** abandoned primal-druid circle, twisted rituals, corrupted guardians.
22. **Elemental Temples** of Mount Cinder / Scorched Cliffs: artifacts or knowledge against Seraphina.
23. **Weeping Willow Grove reagents:** "Magical herbs and sap that play a role in countering corruption or aiding in alchemical recipes" (L3973).
24. **Rumor seeds with no quest yet:**
    - shrine thefts; the tinker's boy's pendant; the flower-scarred bandit;
    - "Lanterns drifting in Eldenwood… people follow them and vanish";
    - the patrol lost in the Vale ("no bodies were ever found");
    - the spiral-glyph monolith in the Vale "changes if you stare at it too long";
    - hollow laughter in the Vale under a waning moon;
    - "Elven ghostwalkers used to protect the borderlands. They stopped patrolling years ago. Some say they were pulled in";
    - "They're recruiting in the marshes—offering food and 'a place to belong'";
    - lights atop Mount Cinder; owls flying loops eastward; Aric found new sigils outside the old watchtower;
    - Stonebridge Veil-thinning: "mirrored puddles, people repeating sentences they haven't spoken" (L3076).

---

## 6. Creatures

Stats are given only where the notes give them. [src] = name found in source.

**Bloomtouched (corrupted wildlife)**
- **Bloomtouched Stalker** [in game], corrupted wolf.
  - "flickering between this world and the Shadowfell". Phase in and out (Displacement / Ethereal Step). Hunts in coordinated packs that react to harmonic vibrations.
  - A sigil scar on the flank. Paws "leave trails of withering grass". Dissolves "into ash and light."
  - Drops: Planar-Infused Blood, Shadowchoked Seeds, Fragmented Sigil Shards.
  - **Wounded variant:** Phase Step (15 ft blink, 1/round). Necrotic Bite 1d8, plus WIS save or 1d4 psychic next round. Emits a harmonic frequency near sigils. Targets resonance objects. A sigil fragment is fused in its ribcage.
- **Bloomtouched Elk:** "antlers wrapped in red-black vines, eyes glowing dimly… movements twitch unnaturally". Comes with 2 corrupted wolves or boars. Its vines pulse, then crumble to ash.
- **Bloomtouched Grove Beasts** [Vale]: "Strange elk with flowered antlers and spiral-split hides."
  - Attack only if the party carries corrupted sigils or unbalanced harmonic gear. Low droning hum. Drop **Resonant Pollen**.
  - CONTRADICTION: elsewhere they "slither from flowering trees—venom causes dreams of other sigil sites" (L1275).
- **Bloomtouched Hollow Elk + Shadow Larks** (Shadowfell trail): antlers "tangled with silver roots", eyes "black-violet".
  - "weeps violet sap"; "Echoes of past hunters rise if it's slain (psychic backlash)". Antlers yield **Veil-threaded Bone**.
- **Bloomtouched Watchers / Echo Fauna:** "deer-like creatures with moss-matted fur, flowered antlers, and mirrored eyes."
  - "mimic your movements with perfect delay, but never approach". "tied to emotion, not hunger". Footprints bloom for seconds, then fade.
- **Hollow-Eyed Birds**: Tiny aberration / magical beast. Role "Watchers / Scouts of the Bloom".
  - Silent, always in threes, "not watching the players… but listening". Memory mimicry.
  - Scatter "in reverse flight", leaving a root-marked feather that pulses with warmth.
- **Whispering Owls**: three pale owls, "spirit-touched familiars—watchers, not predators" / "echoes. Observers sent by something tied to the resonance you now carry."
  - At midnight they mimic Ember: "Don't open the wrong one." Leave a sigil feather. Following them (Survival or Arcana DC 15) finds a buried **sealed song seed**.
- **Resonance-Lashed Swarmbeaks** [src]: black-plumed birds repeating a warped Vale tune. Killing them releases a pulse pointing to the Willow's glade. Drop **Glassfeather Plumes**.
- **Bloomtouched sprites and animated thorns** (disguised as wildflowers): grasping vines make difficult terrain.
  - Wounded: harmonic distortion, CHA DC 12 or disadvantage on spell saves for 1 round. On death they bloom uncorrupted, then wither. Drop a **Bloomcore Petal**.
- **Bloomtouched Widow** [src], corrupted spider: violet-glowing webs; venom causes hallucinations of whispers and phantom shapes.
  - **Harmonic Lure**: sigil-patterned webs attract corrupted fauna and disorient with echoing voices. Guards a corrupted grove in the Verdant Vale.
- **Scourgestinger of the Bloom**, corrupted scorpion: burrows, leaves crystalline sigils in sand; tail crackles with resonance; claws glisten with spores.
  - **Sigil Detonation**: erupts in a glyph-marked blast zone, "disrupting magic and causing radiant corruption damage". Lives at the Salt Road desert or Mount Cinder's outer dune.
- **Corrupted deer** with "eyes glowing like coals" (farmer).
- **Corrupted rats** (the Underways).
- **Corrupted goblins** (they stole Buttercup).
- **Sap-Drenched Creatures**: "soaked in corrosive, corrupting black sap" (Willow Grove).
- **Corrupted Treants**: "Twisted guardians of the Weeping Willow Grove."
- **Bog Crawlers** [src]: "Giant amphibians with venomous fangs."
- **Whisperwings**: "Bat-like insects that emit disorienting screeches."
- **Murk Stalkers**: "Stealth predators blending into shadows and vegetation."
- **Spectral Leeches**: "Drain life and phase between physical and incorporeal states."
- **Corrupted Wildlife**: generic.
- **Corrupted Beast of the Plains**: "A great shadow-wolf or blight-infused predator stalking the nomads"; attacks livestock.
- **Predatory Sandworms, Giant Scorpions, Wild Dog Packs** (Plains).
- **Shadowbloom Vines**: "trap-creature hybrids that drain life from entangled victims" (Marshes).
- **Carnivorous Plants**: "Giant pitcher plants and mutated flytraps… animated terrain" (Marshes).

**Elementals and constructs**
- **Emberborn Atronach** [src]: Medium elemental, CR 4. "obsidian armor and inner molten cores"; "body hums like a tuning fork".
  - On death, explodes in a 10 ft radius unless calmed by resonance. Weak to cold and bludgeoning.
  - **Harmonic Vulnerability**: staggered by resonance magic. **Resonant Pulse**: weakens magic resistance and ignites volatile ingredients. Lives in the Mount Cinder caldera.
- **Cindermelt Horror** [src]: boss, CR 6–7, HP 120, AC 17. A lava mass with ember tendrils and scorched sigil brands.
  - **Lava Surge**: 30 ft cone, DEX DC 15, 4d8 fire.
  - **Resonant Howl**: deafens and shatters mundane items, CON DC 14.
  - **Magmatic Spawn**: splits into 2 CR 2 minions at 50% HP.
  - **Molten Grip**: grapple, restrained, plus 2d8 fire ongoing.
  - Broken resonance conduits and cooling vents can damage or restrain it.
- **Echobound Warden** [src]: CR 4–5, AC 16, HP ~60, speed 30 ft. Made of "suspended glyphs, sonic pulses… Eyes like glass tuning forks."
  - Resistant to necrotic and thunder. Immune to psychic, silence and charm. Vulnerable to radiant and musical spells (shatter).
  - **Harmonic Burst** (recharge 5–6): 30 ft cone, 3d8 thunder, CON DC 14 for half.
  - **Resonant Fade**: bonus action, phases out for 1 round.
  - **Tuning Lash**: 1d10 + WIS sonic, WIS DC 12 or disoriented.
  - Drops: Warden's Core, Fragmented Sigil Map Segment, Echo-charged Glyph.
- **Crystalline Sentinels**: golem-like guards of the Crystal Caves.
- **Crystal Dragons**: ancient, sentient, faceted scales.
- **Cave-Adapted Creatures**: blind echolocating bats, crystal-armored insects.
- **The Lumina Collective**: sentient crystal entities speaking through resonance.
- **Dark Crystal Shards**: corrupted growths that may spawn beings or hazards.
- **Heart of Lumina guardian**: unnamed "elemental, guardian, or resonance-based sentinel".
- **Corrupted Earth Elementals**: "Whispers from ancient stones drive dwarves mad."
- **Corrupted Water Elemental** (Whispering Marshes).
- **Stone Guardians**: resonance-woken constructs or spirits of the Plains monoliths.
- **Greystone Guardians**: "cursed spirits or animated statues" (L3964).
- **Guardian of the Forgotten Tone** (non-combat): a seated stone druid with a broken face. A crystal vibrates in its chest. Re-tune it or it crumbles.
- **Animated wood constructs** (Sawtooth Mill).
- **Obsidian Gargoyles**: fire-immune volcanic guardians.
- **Lava Elementals**: tied to corrupted ley lines.
- **Magma Worms**: spit lava, radiate heat.
- **Corrupted Phoenix**: "wreathed in shadowflame, with an aura of despair and sonic cry attacks". With **Phoenix's Brood**: small, volatile flame-birds.
- **Corrupted dragon**: the Dragon's Blood source (implied).

**Treefolk**
- **Verdant Whisperers**: druid name; formerly "Leshkin Treefolk"; cult name **"The Rootbound Choir"**; ancient name **"K'thura, The Living Chorus"**.
  - Ancient sentient treefolk grown from druid-planted saplings to guard the Veil (especially the Shadowfell boundary).
  - "In stillness, they commune with the spirits of the Vale, recording echoes of time. When the forest is threatened, their limbs creak open like ancient gates."
  - Some dormant in "Resonance Hollows". A Whisperer probably reached out to Ember in the Razorwood.
  - Each carries part of a harmonic phrase, the "song of awakening".
- **Bloomtouched Verdant / Hollowed Guardian** [src]: CR 6–7. Bark "splintered, glowing from within with amber ichor".
  - **Resonant Roar**: disadvantage on concentration, stuns casters.
  - **Sap Burst / Sap Bombs**: poison area and root snare, spore clouds.
  - **Corrupted Roots**: pull targets toward hollows.
  - **Echoed Memories**: sings Ember's lullaby mid-fight.
  - Weak to, or hesitates at: Ember's drawing, druidic chants, Lyra's tuning phrase, uncorrupted sigils, an awakened Whisperer.
- **Vale Guardians**: "Two sentient trees with hollow faces". They grant passage for the "First Law of the Circle". "None who carry the Tuner walk here unchanged…"
- **The Rotted Choir**: treefolk "frozen mid-motion… a failed resonance choir, trapped mid-note."
- **Hollow-faced grove**: barkless trees with "hollow oval 'faces'" that listen.

**Spirits, echoes and Veil things**
- **Bloomtouched Echo Guardian**: a failed echo spirit.
  - **Reverberate Pulse**: repeat your last action involuntarily.
  - **Harmonic Fracture**: CON DC 14 psychic backlash if you cast last round.
  - **Bloom Veil**: Shadowfell whispers.
- **Bloom-Resonant Wraiths**: druids "twisted by failed Bloom seals", red-violet.
  - **Rootlash Grasp**: STR DC 14 or entangled.
  - **Echo Howl**: WIS save or disadvantage, reliving a failure.
  - **Harmonic Despair**: lose a spell slot or bardic resource, 1/day.
- **The Lost Voice** [src]: "choral phantom of failed Echo druids and one shadowed fragment of Lyra's resonance signature".
  - **Unfinished Lament**: psychic area. **Echo Fragment Shard**: ranged sonic. **Veil-Wrapped Grasp**: pulls a target into a Shadowfell overlay.
  - Weakened by singing the correct Rootsong live.
- **Whisperbound Shade**: an echo of a soul that resisted the Bloom. "Icy trails of harmonic static."
  - **Haunting Chorus**: WIS saves or stunned or frightened. Lives at a shrine beneath the Circle or ruins near the Vale.
- **The Weeping Widow**: "A powerful ghost haunting the Weeping Willow Grove." No other detail. Possibly the seed-bearer (inferred).
- **Restless Spirits** (marshes, groves). **Lantern Wraiths** [src] (Thornmere). **The Moonlight Walkers** (marsh, flute). **Elven ghostwalkers** ("pulled in").
- **Veil-Stalked Bloomling**: "A twisted childlike silhouette… mimicking Ember's voice."
  - Unwarded approach makes it unfold "into a many-armed, sigil-split abomination." Killing it "restores one safe camp zone".
- **The Echoing Bloom** (grove form and "Anchorform" boss): a child-shaped mass of vines and shadow petals that hums the Rootsong backward.
  - Abilities: Reverse Requiem, Memory Loop, Petalstorm Echo / Memory Deletion, Bloom Pulse (detonates memory-linked items).
  - Ember's true voice surfaces in the final phase.
- **Echoguard Warden** [src], elite Bloomtouched: mirror shards, vines and bark; speaks as Lyra or Ember.
  - **Memory Loop**; **Sigil Scatter** (suppresses one school of magic for 1 turn); **Reflective Bloom** (CHA save).
- **Mirror Echo**: a wrong-orb identity duel.
- **Echo of the Drowned Self** [src]: CR ~5. A soaked copy of a PC with one twisted class feature. "You didn't drown here. But she might have…"
- **A phantom version of yourself** offering a bargain (failed WIS DC 15 at Dissonant Dreamlight, L2443).
- **Petal-storm child**: humming backward; leaves a cracked sigil stone.
- **Bloomwatcher** [src]: "cloaked in living vines, eyes dimly glowing… something wearing a person's memory."
- **Rooftop creature**: long-limbed, "Tall. Smells like iron," claws on slate.
- **Shadowy Entities & Veil Creatures**, **Nightmare Echo-Beasts** ("cultist-summoned beings that haunt rituals involving Ember"), **Sentient Shadows** ("Shadows that move on their own"), **mirror-creatures** (L1549).
- **The Whispers**: "Sentient or magical phenomena causing madness and illusions"; "A mysterious sentient or psychic force, yet to be fully revealed or confronted" (Marshes).
- **Leviathan of Saltwind Harbor**: Bloom-corrupted, psychic waves.
- **Corrupted Fey** (Duskwood): illusions and chaos.

**Humanoids**
- **Bloomtouched Cultists** [in game]: hooded, eyes glowing "sickly purple". Vines pulse through their bodies; voices "like detuned instruments".
  - They cast twisted healing and nature spells that inflict decay, and leak hissing black ichor.
- **Lady Seraphina's Cultists**; **Bandits Corrupted by the Blight**; **Desert Raiders under Pollen Influence** (Redrock Haven).
- **Marsh Aberration** [in game]: mud, bone and vine; "sings in a voice half-human, half-harmonic screech". Shifts between solid and fluid, speaks in the party's voices.
  - Immune to charm, resistant to magic, weak to radiant and sound.
- **Mutated miners**; a "crystal-empowered mini-boss (herald of the Bloom)" at Cinder (L288–289).

**Friendly beasts**
- **Zephyr's Yak-Lizard** [in game] (creature card, L4416–4426):
  - "stout, broad-bodied beast with shaggy yak fur along its neck and shoulders… lower body and limbs are scaled like a monitor lizard, with long clawed toes and a swaying lizard tail… Two gently curved horns".
  - "heat-resistant"; "nostrils glowing faintly violet" (L2663); a harmonic chime hangs at its neck.
  - Temperament: skittish around resonance, especially Mount Cinder. Bonded to Zephyr, temperamental with others.
  - "Instinct Memory: Can sense places of prior trauma or powerful magic." Carries 500 lb or two passengers.
- **Buttercup** [src]: "shimmering, faintly glowing white fur". Her milk heals, helps track corruption, "may be used to reverse or purify magical corruption."

---

## 7. Items and artifacts

**Artifacts from the item list (L4484–4557)**
- **Harmonic Tuner** [in game]. CONTRADICTION over its form:
  - (a) "A powerful obsidian orb, veined with glowing runes and crystalline structures inside… surface occasionally ripples."
  - (b) In visions, a hand device with a glowing crystal and a dial that Lyra "presses… to the sigil" or slots into a pedestal. It has a **third setting**, "not meant for us… Don't finish the phrase… unless you're ready to become it."
  - Effect: "Manipulates resonance frequencies… stabilize or open planar rifts when activated by specific sequences. If used improperly, it may worsen the Shadowed Bloom."
  - Eldon: "It tunes to resonance. Not just in magic—but in people. Emotions. Memory. Pain."
- **Borin's Journal** [src]: from Grom's Apprentice questline. "crucial clues about the Temple of Seraphina, its magical seals." Lets you navigate the temple and break its seals.
- **Captain Aric's Amulet**: see quest 2. A favor token.
- **Seraphina's Research Notes**: "diagrams, notes about planar rifts, and the cult's rituals." Gives "the ritual details required to stop Seraphina's use of the Harmonic Tuner" and a map of cult activity.
- **Seraphina's Network Map** [src]: "crumpled, hand-drawn map with cultist locations, including towns, hidden cells, and underground hideouts. **Red markings indicate key ritual sites**… blood-red ink." Used to plan infiltrations and disrupt cells.
- **Echo of Ancients** [src], a crystalline prism: "glows with a faint inner light… disrupt magical rituals and create protective barriers… weakening or negating magical effects, especially those tied to the Shadowfell."
  - Possibly the "prism" Seraphina seeks "hidden in the old temple" (bandit journal) (inferred). Also "Ember… a resonant prism" (L2594).
- **Ancient Texts**: found in the Shadowfell Forest (Ember's Sigil line). Explain the Tuner's original function; "potential solutions to stabilize or sever the planar rift."
- **Counter-Potion Ingredients**: see quest 1.
- **Buttercup the Magical Cow**: see 6.
- **Seraphina's Sigil Pendant** [src]: "blackened pendant shaped like a twisted spiral… eerie shadowy glow in darkness."
  - "protect the wearer from minor planar shifts… makes the wearer more susceptible to cultist influence."
  - A key to infiltrating cult areas. Found on cult leaders or in the Temple.
- **The Obsidian Blade** [src]: "sleek, black obsidian sword, with faint cracks filled with glowing blue veins… hums with the sound of distorted resonance."
  - "capable of cutting through magical defenses and planar barriers… effective against shadow creatures." From a cult leader or a hoard.

**Gifts and main-quest tools**
- **Protective Charm** (Eldon): "wards off 1 instance of planar corruption."
- **Map of Eldenwood**: vague corruption zones, ley lines.
- **Sending Crystal** [in game]: one-way message to Eldon, later recall (section 8).
- **Resonance sensor** (Nico, 30 g): "glows faintly near corruption."
- **Distorted Compass** [src]: "points toward sigil frequency, not direction."
- **Harmonic Compass**: a crafting project by Eldon to track sigil resonance.
- **Cultist Concoction**: the false counter-potion, testable.
- **Nico's Field Journal**; **Lyra's Journal Pages** I–IV and her Final Note (quotes in 9); **Lyra's Marked Map**.
- **Ember's locket "E.M."** (glows later); **ash cloth** with the sigil; **Ember's shawl**; **Ember's Sigil Drawing**.
- **Fate's Signal Letter**; **Eldon's crystal tablet**.

**Resonance loot**
- **Fragments:** Fragmented Sigil Shards, Intact Sigil Shard, Sigil Map Fragment / Segment (glows near active sigils), Half-Sigil Fragment, Bloom-Rooted Sigil Fragment, numbered Sigil Fragments 1–15, Echo Sigil Fragment.
- **Planar-Infused Blood**: for arcane analysis and tuning.
- **Shadowchoked Seeds**: used by cultists.
- **Warden's Core**: upgrades the Tuner.
- **Echo-charged Glyph**: a one-time sound trap or ritual boost.
- **Broken Tuning Fork**; charred parchment of notes.
- **Elementally Tainted Tuning Crystal**: one use; casts Heat Metal, Shatter or Absorb Elements once.
- **Volcanic Resonance Ore**: forge into a resonance weapon, or Eldon upgrades the Tuner.
- **Harmonic Dust**: mined from Arcane Dust Veins, sold at Greenleaf. Resonates with active sigils; used for crafting and forging.
- **Verdant Memory Bark** [src]: "contact with sleeping Whisperers elsewhere"; "remembers… frequency."
- **Resonant Seed** [src]: "Once per day: stabilize corrupted zone or purify Bloomtouched creature." Grom can shape it into an accessory or focus.
- **Resonant Pollen** (Vale crafting); **Bloomcore Petal** (Circle rituals, sigil tuning).
- **Bloom-Stained Bark**: "alchemically refined to resist Veil-induced madness."
- **Rootsong Linework**: stabilizes or re-tunes corrupted sigils.
- **Elder's Journal Bark**: a map to the Weeping Tree.
- **Sigil feather** (owls); **root-marked feather** (birds); **Resonant Feather**: "absorb one sonic attack or be used in a ritual."
- **Resonance Memory Fragment**: advantage on the next Arcana or Performance check at the Circle.
- **Memory Glyph**: activates the Circle's anchor.
- **Deadroot Resin**: "crafting anti-Bloom elixirs or luring Bloomtouched creatures"; reads dream-leaves safely.
- **Sealed song seed** (owls' jar, used at the Willow); **Glassfeather Plumes**: ritual tools.
- **Sealed Echo Seed**: "contain the Bloom's frequency—can suppress a corruption zone or unlock the Shadowfell boundary." Supplies the Circle's 7th tone.
- **Memory Bark** [src]: "When burned during a ritual, lets you speak with the dead harmonists for 1 minute."
- **Harmonic Lullaby, Parts I & II**: Rootsong stanzas.
- **Final Rootsong Glyph**: "activate Veil Portals safely (or seal them with risk)."
- **Veil-threaded Bone**: tunes veiled sigils or crafts veil-resistant items.
- **Veil Shards**: storm glass from the Fractured Tempest, for sigil tuning or crafting.
- **Echo-Flame Bloom**: "absorb one projected memory or redirect a Bloom echo (1 use)."
- **Harp string etched with sigil runes**: resists Bloom dissonance and harmonizes Veil nodes.
- **Ember's Humming Stone**: reveals a gate's pattern. **Ember's Signal Bloom**: stabilizes the next gate.
- **Root-Shard Armor Fragment**: "partial resistance to memory bleed."
- **Mirrorroot Memory Orb**: bypasses the resonance cage. **True Harmonic Core**: Ember's resonance anchor.
- **Vial of Stabilized Echo-Glass**: resists one psychic or echo effect.
- **Fragmented Research Scroll**: reconstructs the Tuner's third setting.
- **Sigil-Scorched Worktable Fragment**: "locate hidden tuning forks left across the region."
- **Resonant Feedback Cloak**: "Resistance to thunder for 1 hour after Resonance Anchor use."
- **"Memory Anchor Test #7 – DO NOT DRINK"**: an unknown decoy potion.

**Zephyr's wares (L2673–2685)**
- **Mirrorroot Powder** (1 use): shields from memory projection or dissonant feedback for 1 hour.
- **Lyra's Marked Map**: glyph paths across the Sigil Lattice.
- **Bone-Reed Flute**: near rifts "reveals hidden paths or anchor signatures."
- **Half-Spoken Locket**: "communication with Ember's echo (1 use, unstable)."
- **Sealed Crystal Bloom**: absorbs one magical attack or resonance effect, then shatters.
- Earlier stock (L1045): heat-resistant gear, resonance-charged tools, tuning crystals.

**Shop consumables**
- Anti-Corruption Poultices; Odd Charms; Rootsong-stabilizing elixirs; sorrow salves; Weeping Willow Sap (rituals and healing draughts); **Dissonance Snuffers** ("charms that resist Veil-based dreams").
- Greenstone charms (Stonebridge), wooden charms (Oakhaven), thorn charms and herb bundles (Thornmere).

**Boons** (not items)
- Harmonic Blessing (+1 Performance/Insight in ritual spaces).
- Blessing of balance (1 reroll on a WIS save today).
- +1 to saves vs. illusions (archway sigil).
- "Harmony Boon" from Eldon: insight, protection or a lore shard.

**Recipes**
- **The counter-potion**: Dragon's Blood + Phoenix Feathers + Mandrake Root, brewed by Nico. Its true effect is contradictory (quest 1).
- No other recipes are given. Several reagents above are flagged "for crafting" without a formula.

---

## 8. Homebrew rules, spells, species, classes, subclasses, backgrounds, feats

- **Species, classes, subclasses, backgrounds, feats, player characters: none in the notes.**
  - The only racial descriptions are of NPCs: Eldon is an elf; Grom and Zephyr are dwarves; Lyra is a half-elf with "Dwarvish and Elvish (Lyra's dual heritage)" chalk notes (L718). The surname Stonehand plus Dwarvish suggests partly dwarven upbringing or ancestry (inferred).
  - Bards and druids get special puzzle roles: Performance checks, "a Bard's improvisation (Performance DC 17)", "Casting Speak With Plants or Commune with Nature", druid or bard attunement of fragments.
- **Sending Crystal: recall (L4821–4867)**
  - Once per long rest. Concentrate 1 full round. You and up to 5 willing creatures within 10 ft, with gear and familiars, teleport to the last attuned Resonance Anchor.
  - Return only. Not mid-combat or in anomaly zones. "Requires a Stable Surface and Stillness."
  - Attune by pressing the crystal to an anchor. "Only one anchor may be active at a time" — but anchors are also called fast-travel nodes. CONTRADICTION in spirit.
  - In unstable zones: "Will save (DC 15)". On failure the crystal burns out until Eldon or Lyra restore it.
  - Upgrades: multiple charges and points; becomes a "planar resonance beacon" to escape the Shadowfell.
- **Resonance Anchors:** stones or obelisks at each sigil site. "they attune you. Every time one is activated, the Veil thins… just enough to see more clearly" (L909).
- **Rest bonuses (L213–215):**
  - Gilded Griffin: +1 temp HP next day.
  - Eldon's residence: advantage on one save vs. corruption.
  - The Shadowed Mug: risk of eavesdropping or ambush.
- **Puzzle rules:**
  - **Five chimes**: "Three truths form the seal. One lies. One sings too loud."
    - A false tone deals 1d6 psychic to all (CON DC 13 halves).
    - An over-resonant tone gives disadvantage on Perception for 10 minutes.
    - Three failures summon the guardian.
  - **Three-tone triads** (Cinder pillars, Whisperers, conduit roots).
  - **The seven-stone Rootsong** (the 7th tone missing).
  - **Reverse-sung Rootsong gates**.
  - **The dock tether notes "A – B – F – D – G"** played in reverse Rootsong order (Stillwater).
  - **The Stillwater "silent verse"**.
- **Environmental rules:**
  - Cinder heat (exhaustion), toxic smoke (CON DC 12), magma fissures (DEX DC 14, 2d6 fire).
  - Echo Hollows (WIS DC 13 or 1d4 psychic).
  - Shadowfell: **Echo Gravity** (words echo before spoken), **Resonance Drift** (hear your past words), **Lightless Reflection** (pools show emotions or future choices).
  - **Planar Bleed Variant "Resonance Shear"**: WIS DC 15 each hour or forget a prepared spell, skill proficiency or minor memory for 1 hour.
  - **Hazardous Weather "The Fractured Tempest"**: DEX DC 14 or "retrocharge", where you repeat your last save or attack and take its reversed result. Leaves Veil Shards.
  - **Stillwater**: time compressed; resonance dampened within 30 ft of the lake; loud voices echo backward.
- **Status-like effects used repeatedly** (good candidates for game conditions):
  - Memory Loop (repeat your last action), Reverse Requiem (undo or cancel the last action), Memory Deletion (lose a spell or skill until long rest), Disoriented (disadvantage on the next spell or check), Displacement Pulse (swap with your mirrored self).
  - Hoarse voice (disadvantage on Performance and verbal casting for 1 hour, after humming Lyra's note).
  - Frost sigil on the hand for 1 hour (dream); vulnerability to charm or fear for 1 hour (failed Echo Gate).
- **Spells with "Visual:" lines (L4694–4820):** all standard 3.5e/PF-style spells, none original.
  - Cantrips: Acid Splash, Dancing Lights, Daze, Detect Magic, Flare, Light, Mage Hand, Ray of Frost, Read Magic, Resistance.
  - 1st: Burning Hands, Charm Person, Color Spray, Enlarge Person, Expeditious Retreat, Identify, Mage Armor, Magic Missile, Ray of Enfeeblement, Sleep.
  - 2nd: Acid Arrow, Blindness/Deafness, Blur, Bull's Strength, Cat's Grace, Darkness, Glitterdust, Invisibility, Mirror Image, Scorching Ray.
  - 3rd: Fireball, Fly, Haste, Hold Person, Lightning Bolt, Magic Weapon, Protection from Energy, Slow, Stinking Cloud, Vampiric Touch.
  - The "Visual:" text is usable as VFX direction. Examples: Magic Missile, "Glowing, blue or white projectiles"; Fly, "Wings of shimmering energy sprout from the target's back"; Haste, "A golden aura"; Slow, "A sluggish, gray aura"; Hold Person, "Bands of glowing energy wrap around the target."
  - Daze, Flare, Read Magic, Glitterdust, Bull's Strength and Cat's Grace are not SRD 5.2. Map them (e.g. Glitterdust → Faerie Fire, Bull's Strength/Cat's Grace → Enhance Ability) (inferred).
  - The notes reference other spells in passing: Displacement/Ethereal Step, Shatter, Heat Metal, Absorb Elements, Speak with Plants, Commune with Nature.

---

## 9. Endings, the antagonist, what lies behind Seraphina, and the watcher

**Seraphina**
- Main antagonist. "The Mistress". Signs "† S" with the motto **"Only through dissonance does harmony evolve."**
- Promises followers "your place among the Harmonized… your discord will be resolved."
- The bandit journal: "she ain't just trying to control the town. She wants to change everything… The crystals... they're like pipes, leading to something darker."
  - "**The old gods are dead, she says. Her time is coming.**"
  - "she needs some crystal thing, a prism… hidden in the old temple."
- **Temple of Seraphina**: "A hidden underground structure in Eldenwood, where dark rituals are conducted to merge the material world with the Shadowfell." The entry mentions "the Corrupted Heart, where the ancient temple lies" (L3609–3610). It has "magical seals" (Borin's Journal).
- **Her origins:** "Echoing Ruins [Isle of Whispers]: Contain clues to Seraphina's true origins." That is the only origin pointer.
- She "lied" to Nico: "She said it would tune peace into the roots" (L854).
- Ember: "Don't let her… open the rest" (L1497).

**What the Bloom is and what waits beyond**
- Eldon: "The Bloom is not a sickness. It is a signal. A blooming of something ancient… something that remembers what the world once was, and what it could become again—if we fail."
- "**the Bloom doesn't want to open the gate. It wants to be what waits on the other side.**" (L1682–1683)
- "The Bloom didn't begin in Eldenwood. It was only remembered there." (L3052)
- "The Bloom does not only corrupt. It remembers. It repeats what it consumes. And I fear it has begun repeating Ember." (L2320)
- "If the Bloom begins to project—to overwrite real places with its version of the past… It will rewrite the world." (L2398–2400)
- "The Shadowfell was once part of this plane. The Veil was never a wall—it was a filter, keeping certain memories and beings out of alignment." (L2537)
- "**The Seals weren't just to lock away the Shadowfell. They were to keep something in… us.**" (L2734)
- "Glyphs here no longer act as locks, but keys." "The Mirrorroot is not a place. It's the Bloom's first echo…"
- Bard journal: "the Shadowfell is not separate, but a second verse of the material plane… The song is trying to end us. Or remake us."
- "Tear that filter, and echoes become action. Dreams become form. And things... start to remember their names." (L4315)
- "A bloom only spreads when it hears its name." (Fate)
- Lore of the sealing:
  - The Veil Wars; the seven (or 13 / 14 / 15) sigils;
  - "shadow tones… unremembered. Suppressed" in a flawed twelve-note scale;
  - Stillwater "was meant to hide one of the tones from the Bloom";
  - the Bloomlight Convergence / breach (past disaster); the Second Veil Collapse; "pre-Collapse" coins.
- **The Rootsong / Worldtone:** "every living thing sang a note into the Veil."

**The watcher. Every hint that could feed a faceless, white-eyed watcher** (the notes never describe such a figure; these are the closest)
- Eldon: "**Tread carefully. Something watches… and it knows you're coming.**"
- Prologue: "beyond the veil of waking thought, in a place where reflection has weight and sound holds memory, **something listens. Waiting.**"
- Razorwood vision: "through it, you see **shadows that walk like men… watching her**."
- Dreamfall Glade: "A shadow looms behind her. Not touching. Not present. But… watching."
- Ember dream: "**A shadow shape moves behind her, tall and thin and wrong.**"
- The third-setting vision: "A shadow behind her rises from the wall, whispering the melody backward."
- Lyra at Cinder: "Something inside the seal is leaking—a presence I don't understand. **A watcher?** No, more like a memory left to burn…"
- The Mirrorroot: "through it, the Bloom watches back." The Shadowfell trees "shift inward like watching eyes."
- Rooftop creature: "Tall. Smells like iron," long-limbed.
- The Bloomwatcher: "something wearing a person's memory".
- Watcher animals: owls that "do not blink"; Hollow-Eyed Birds; Echo Fauna with mirrored eyes.
- Faces and eyes:
  - Ember's eyes in the Veil: "**not glowing. They are empty.**"
  - Lyra in Stillwater: one eye "closed. Not by choice."
  - Faceless stone druid (broken face); barkless "hollow oval faces"; Vale Guardians "with hollow faces".
  - "pale as bone" woman; elven ghostwalkers "pulled in".
- Reading (inferred): a tall, thin, faceless figure with white or empty eyes fits "what waits on the other side", the shadow behind Lyra and Ember, and the thing the Seals "keep in… us". It could be the Bloom's true self, with Seraphina its herald ("Her time is coming").

**Endings and choices the notes set up**
- Destroy or wield the Tuner (L416).
- At Greystone, "unlock powerful artifact… or seal it again".
- Sigil fragments "might open the Veil again—or seal it completely" (Eldon).
- **Finish the Rootsong or not. CONTRADICTION:**
  - "Don't finish the phrase… unless you're ready to become it" / "Don't finish the Rootsong unless you're ready to hear the answer."
  - vs Lyra Page IV: "If you find this… don't try to fix it. Finish it."
- **Lyra tried "to become the lock"** (Zephyr). "a glyph of self-removal. She tried to tune herself out of the lattice" (Eldon). So becoming the lock is a possible sacrifice ending (inferred).
- **Ember's role. CONTRADICTION:**
  - A prism "used… to hold the breach open" / "singing it open".
  - vs "the anchor preventing it from collapsing further" (L2995).
- **The Tuner's third setting**: unknown effect; the endgame lever.
- **The Veil's heart:** "Find the Veil's heart. Not where it breaks… but where it listens." (Lyra echo)
- The final Bloom breach is stabilised with the Harmonic Lullaby Part II "later in Act 3".
- Act 3 title. CONTRADICTION: "The Breaking of the Veil" (L345) vs "The Bloom Unleashed" (L423).
- The Ancient Texts offer ways "to stabilize or sever the planar rift." The Research Notes give "ritual details required to stop Seraphina."
- "Lantern Bearer who will light the forgotten path" (Thornmere prophecy).
- Eldon: "Do not let the Bloom teach the Veil to sing. Let the Veil teach you to listen."
- Branch hooks still open after Stillwater: Shadowfell ("False Lyra or Echoborn projection of Ember", "Veil Root Convergence"), Weeping Tree ("Sentient plantlife that remembers being human", the Sorrowbound Fragment, a Harmonist who sealed the First Bloom), Isle of Whispers.

**Player-character arcs**
- None are written. The notes use generic identity themes instead:
  - the Tree of Silent Names and the Hall of Hollow Names ("names you might have been"; "A version of yourself… caught mid-bloom");
  - future selves on the trail; "Who are you without what you forgot?";
  - doubles who never left Stonebridge; a phantom self offering a bargain.

---

## 10. Factions

- **The Bloomed Circle / the cult of the Shadowed Bloom** ("Lady Seraphina's Cultists"; members are "the Harmonized"):
  - Emblem: a half-open flower (L379). Other symbols: "crescent bloom cradling a black sun" (L615), a black sun behind a sealed door (Greystone mural), a flower-shaped brand, Seraphina's twisted-spiral pendant, "a blooming, dark crystal" (bandit journal).
  - **Creed:** "The cult doesn't worship the Bloom. They feed it." "The Bloom will not root in resistance. It must be invited."
  - **Goals:** grow the Bloom deliberately; "reshaping reality"; complete the Tuner; use Ember as a vessel "to complete the song". The Marshes are "a staging ground for a coming wave."
  - **Recruitment:** in the marshes, "offering food and 'a place to belong'"; scouts "turned".
  - **Known cells and fronts:**
    - the Shadowed Mug; the Sipping Serpent; the Underways; trade caravans;
    - Saltwind smugglers, Smugglers' Cove and the Ironhold/Fellmoor port;
    - Whispering Marshes hideouts and alchemists;
    - the Blackroot Secretive Settlement; the Shroudwoods' Shrouded Grove; Mirkwood's Ancient Groves; the Shadowed Woods Bandit Camp;
    - Thornmere's feuding cells; the Tidewater "hidden town"; Oakhaven forest cultists.
  - **Associated:** "Rootward cult remnants" (Blackroot); "The Rootbound Choir" (cult name for the Whisperers); bandits under "the Mistress"; Desert Raiders (pollen).
- **Bandits** of the eastern hills: Seraphina's supply line; the crystal harvest; corrupted guardians.
- **Druidic Circle of Echoes**: "a now-vanished druidic order who mastered harmonic memory".
  - "guardians of the Worldtone"; "singers of the First Harmonic"; shaped the Tuner "as a resonant covenant with the world."
  - Seven stones. The **First Law of the Circle** passes the Vale Guardians, but its text is never given.
  - The Circle Elders (ghosts).
- **The Harmonists / the First Harmonist**: older resonance scholars. Believed "once the world forgot the melody of balance… it should not remember lightly."
- **The Verdant Whisperers**: treefolk guardians of the Vale (6).
- **Living druids:**
  - "druids resisting the corruption" in the Razorwood;
  - the Thornmere Valley Druidic Glade; the Vale's Druidic Circle "resists the spread";
  - the Circle of Ashen Roots (abandoned primal druids);
  - Oakhaven's Grove of Whispering Leaves (druids and clerics); Elder Merion is a retired druid.
- **Elven ghostwalkers**: border protectors who "stopped patrolling years ago".
- **The elemental cults** of Mount Cinder and the Scorched Cliffs (pre-Seraphina).
- **Stonebridge:**
  - the Council in the Elder's Hall, split into flee and fight factions with Eldon as moderator;
  - the Watch (Aric); the scribes under Eldon (Etta);
  - "Stonebridge – Town Hub of the Resistance" (L893); a "Scribe's Guild" (L3072).
- **The resistance at the Hidden Refuge** (Lake of Whispers).
- **Oakhaven:** Elderwood Hall (Merion) and the Garrison (Thorn Hallowbrook).
- **Thornmere:** the Pale Flame priesthood (Mother Aldwyn), the Mirewatch rangers (Rook Thalen), the Whispering Archive scribes, the cursed noble bloodline.
- **Pirates**: the Blackwater Gulf and Stormwrack Bay.
- **The Lumina Collective**: crystal entities.
- **The Plains nomads**: keepers of an oral Rootsong variant.
- **Aurora Watchtower scholars** (Frosthollow).
- **Guilds:** only the "Scribe's Guild" is named.

---

## 11. Housing, mounts, crafting, downtime

**Housing**
- No player homes in the notes.
- Lodging:
  - Stonebridge: Gilded Griffin 1 g/night (+1 temp HP); Rusty Lantern 1 gp; Eldon's residence free; Elara later "on the house".
  - Oakhaven: Weary Wanderers' Rest.
  - Thornmere: Willow's End Inn ("each room has a protective charm over the doorway").
  - Safe camp zones restored by killing the Bloomling.
  - The Archive Spiral as a rest spot.
- Eldon's "demiplane"-like sealed archive is the nearest thing to a base (inferred).

**Mounts and stables**
- Stonebridge: Stables / the Bridle & Bit ("mounts, some restless").
- Oakhaven: the Chestnut Corral (a dwarf "who sings to horses").
- Thornmere: Witch's Run Stable ("Few animals… rumored to be blessed with second sight").
- **Zephyr's yak-lizard** (full card in 6): 500 lb or two riders; heat-resistant; senses trauma and magic; refuses Mount Cinder.
- Price list: Donkey or Mule 8 gp, Horse (light) 75 gp, Horse (heavy) 200 gp, Saddle (riding) 20 gp.

**Crafting and upgrades named in the notes**
- Grom: silvered weapon upgrades (25–50 g); shape the Resonant Seed into an accessory or focus; shape the Echo Fragment into a "stabilized sigil plate—capable of opening sealed warded doors or ruins"; "reforged old Tuner fragments into potential resonance-bound weapons."
- Eldon: forge a **Harmonic Compass**; upgrade the Tuner with Volcanic Resonance Ore or the Warden's Core; translate notes; reconstruct the third setting from the Fragmented Research Scroll.
- Gather Harmonic Dust from Arcane Dust Veins (needs tools).
- Ingredient uses:
  - Deadroot Resin: anti-Bloom elixirs or a lure.
  - Resonant Pollen: Vale crafting.
  - Glassfeather Plumes: ritual tools.
  - Veil-threaded Bone and Veil Shards: veil-resistant items.
  - Bloom-Stained Bark: an anti-madness refinement.
  - Weeping Willow sap: healing draughts and sorrow salves.
  - Weeping Willow Grove "Reagents of Power".
- **The counter-potion** (Nico).
- **Restoring the Harmonic Primer** from fragments (a meta-craft).
- **Thorn & Steel** (Thornmere): "silver-inlaid weapons and tools made for 'defense against the unnatural.'"

**Shops** (beyond the in-game ones)
- Stonebridge: Tilda (gems), Elion (books, maps), Velthra (pawn), Greenleaf Remedies, Kael's Curatives, the Bridle & Bit.
- Oakhaven: Hemlock's Provisions, Riverwood Traders, Ironbark Forge, Greenroot Remedies, the Whittle and Chisel.
- Thornmere: Murkmire Market ("Only active on the 7th day of each moon… rare herbs, bones, and charm trinkets"), Wyrdroot Remedies, Thorn & Steel.
- Zephyr (travelling).
- **Price list (L4558–4693):** a full 3.5/PF table. Examples:
  - Dagger 2 gp, Longsword 15 gp, Greatsword 50 gp, Falchion 75 gp, Longbow 75 gp, Repeating Heavy Crossbow 250 gp.
  - Leather 10 gp, Chain Shirt 100 gp, Breastplate 200 gp, Full Plate 1,500 gp.
  - Healer's Kit 50 gp, Thieves' Tools 30 gp, Alchemist's Lab (Portable) 350 gp.
  - Potions (Cure Light Wounds, Enlarge Person, Reduce Person, Shield of Faith +1) 50 gp each. Alchemist's Fire 20 gp, Antitoxin 50 gp.
  - Rations 5 sp/day, Torch 1 cp, Rope 50 ft 1 gp.

**Downtime and town phase**
- The notes repeat a "Town Phase" pattern after every anchor return:
  - debrief with Eldon (hand over items for reactions);
  - shop; rumors from Elara / the bulletin board / Fate; rest;
  - "Identify new items; Update maps, journals, or sigil logs";
  - "Receive short 'echo flashes' of other sigils";
  - gain 1 Harmony Boon; open the Archives; visit Nico's lab; Aric's side quest.
- Stonebridge reacts to the party's growing reputation: whispering crowds, a dog whining, the bell pausing.
- Weekly market days (Stonebridge). Seasonal druidic festivals (Oakhaven). Monthly Murkmire Market (Thornmere).
- Night dreams and "personal echoes" during rests (a sigil on the palm, Lyra's shadow tuning, the Rootsong backward in your own voice) are a downtime-event system.

---

## Quotes worth keeping (short)

- "The bloom is red, the root is black, it grows where night won't take it back." (barn beam)
- "If you hear whispers that sound like music… run. Do not answer. Do not follow. The Tuner sings to those it wishes to claim." (Eldon)
- "But if you hear silence—true silence—know that the Veil is thinning." (Eldon)
- "A bloom only spreads when it hears its name." (Fate)
- "Trust no light that does not flicker." (Fate)
- "The root remembers. The bloom forgets." (Cinder vault voice)
- "Don't open the wrong seal." / "Don't open the wrong one." (Lyra / owls)
- "Find me before it does." (Lyra)
- "I followed the song because it knew my name." / "It forgot how to end." / "Don't let them sing through me." (Ember)
- "Only through dissonance does harmony evolve." (Seraphina)
- "The old gods are dead, she says. Her time is coming." (bandit)
- "Let my memory keep the seal. Let my root forget my name." (seed-bearer)
- "Who are you without what you forgot?" (Mirrorroot)
- "Let no song end unspoken." (Circle)
- "Don't let the Tuner tune you instead." (Zephyr)
- "She didn't tell the mountain goodbye." (Zephyr)
- "Listen for the flute—if it plays, it's already too late." (Moonlight Walkers)
- "Stillwater was named for what it hid, not what it showed." (Elara's grandmother)
