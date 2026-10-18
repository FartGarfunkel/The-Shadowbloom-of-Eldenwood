# The Shadowbloom of Eldenwood: campaign bible

Generated from the game's campaign data (src/js/campaign/sb_*.js) by tools/campaign_bible.py. Spoilers throughout.

## Opening narration

> The story begins not with a trumpet's call, but with a whisper lost on the wind.
> 
> A bloom unseen, a breath unnoticed, a shadow stretching long before the sun has set. In the far corners of Eldenwood, where moss smothers stone and roots twist deeper than memory, something ancient stirs.

> Long before the first roads were carved or town banners flown, these lands were shaped by resonance: subtle hums of harmony that threaded through soil and soul alike. The druids of old called it the Rootsong, a living chorus that bound realms together.
> 
> Forgotten by most, distorted by some, that song now quivers with dissonance.

> In the quiet trade town of Stonebridge, nestled between misted glens and aging hills, life carries on unaware of the corruption gathering beneath its feet. But the night watch grow restless. Patrols vanish without a trace. Plants bloom out of season, their petals black-veined and pulsing faintly with light.
> 
> The elders call it nonsense. The wise call it old magic. The cult calls it The Bloom.

> You awaken dazed, not sure how or where you are. As your eyes adjust and come back into focus, the wooden palisade walls of Stonebridge come into view, perched beside the gently flowing Blackroot River.
> 
> Carts creak along the road. The scent of baked bread drifts on the wind with the distant clang of a hammer on steel. Guards stand at the gate, more watchful than a quiet town should need.
> 
> Something beneath the surface is shifting. And somewhere in that town, someone has been looking for you.

## Towns

- **Stonebridge** (`stonebridge`) · large
- **Oakhaven** (`oakhaven`) · medium
- **Stillwater** (`stillwater`) · medium
- **Thornmere** (`thornmere`) · small

## Places

- **Cinderfall Mining Camp** (`cinderfall_camp`, camp)
- **Cinderfall Mine** (`cinderfall_mine`, mine)
- **The Drake's Scar** (`drake_scar`, cave)
- **The Sacred Stone Circle** (`oak_circle`, standing_stones)
- **The Watcher's Barn** (`watchers_barn`, farmstead)
- **The Razorwood Thicket** (`razorwood`, sigil_tree)
- **The Haunted Glen** (`mandrake_glen`, grove)
- **Bandit Camp in the Eastern Hills** (`bandit_camp`, camp)
- **Goblin Warren** (`goblin_warren`, camp)
- **The Broken Cart** (`borin_cart`, cart)
- **The Humming Stones** (`resonant_wind`, stone)
- **The Vault of Old Greystone** (`greystone`, dungeon)
- **Skyreach Roost** (`skyreach_roost`, nest)
- **A Half-Buried Satchel** (`marsh_cache`, camp)
- **The Sigil Pool** (`sigil_pool`, shrine)
- **The Drowned Robe** (`marsh_robe`, ruin)
- **The Sunken Ruin** (`marsh_ruin`, dungeon)
- **The Smoldering Pass** (`smoldering_pass`, stone)
- **The Singing Rock** (`singing_rock`, stone)
- **The Fractured Vault** (`fractured_vault`, vault)
- **The Ember Vault** (`ember_vault`, dungeon)
- **The Forgotten Archway** (`vale_arch`, gate)
- **The Singing Grove** (`singing_grove`, grove)
- **The Root Hollow** (`root_hollow`, dungeon)
- **The Overgrown Cairn** (`overgrown_cairn`, ruin)
- **The Root Gate** (`root_gate`, gate)
- **The Muted Meadow** (`thorn_meadow`, grove)
- **The Druidic Circle of Echoes** (`echo_circle`, echo_circle)
- **The Meadow of Muted Birds** (`muted_glade`, grove)
- **The Guardian of the Forgotten Tone** (`tone_statue`, stone)
- **The Withered Grove** (`withered_grove`, grove)
- **The Mourning Stone** (`mourning_stone`, stone)
- **The Songbird Ridge** (`swarm_ridge`, camp)
- **The Weeping Willow** (`weeping_willow`, willow)
- **The Spiral at the Veil’s Edge** (`spiral_glyph`, sinkhole)
- **The Spiral Hollow** (`spiral_hollow`, sinkhole)
- **The Tree of Silent Names** (`silent_names`, white_tree)
- **The Echo Gate** (`echo_gate`, gate)
- **The Veilwood Clearing** (`veilwood_clearing`, camp)
- **The Bloomling's Hollow** (`bloomling_hollow`, grove)
- **The Bloomed Echo Grove** (`echo_grove`, cradle)
- **The Memory-Touched Crossing** (`memory_crossing`, bridge)
- **The Forgotten Encampment** (`forgotten_camp`, camp)
- **The Mirrorroot** (`mirrorroot`, dungeon)
- **The Repeating Path** (`repeating_path`, stone)
- **Mirror Lake Edge** (`mirror_lake`, shrine)
- **The Withered Choir** (`choir_stump`, standing_stones)
- **The Tether Docks** (`stillwater_docks`, dock)
- **The Archive Spiral** (`archive_spiral`, dungeon)
- **The Drowned Altar** (`drowned_altar`, drowned_altar)
- **The Stillwater Graves** (`thornmere_graves`, tomb)
- **The Corrupted Heart** (`temple_gate`, ruin)
- **The Temple of the Bloom** (`seraphina_temple`, dungeon)

## Quests

### Whispers in Stonebridge (`q1`)

1. **Find your bearings in Stonebridge** (`fate`) — You woke on the road outside the palisade with no memory of how you got there. Walk into town. Someone is looking for you.
1. **Read the letter from Eldon the Wise** (`read`)
1. **Find Eldon the Wise's residence in Stonebridge** (`find`) — Ask around: Elara at the Gilded Griffin, Nico at his Arcane Emporium, or a local boy by the fountain might know the way.
1. **Speak with Eldon the Wise at his tower-house by the river** (`meet`)
1. **Prepare for the road, then leave Stonebridge by the east gate** (`prepare`) — Grom sells steel, Bartholomew supplies, Elara rumours (and a bed: a long rest). Captain Aric looks like a man who has lost something. Eldon will see you off at the gate.

### Embers in the Deep (`q_flame`)

1. **Travel north-east to the Cinderfall mining camp at the foot of Mount Cinder** (`go`)
1. **Find out what happened to the miners** (`investigate`) — The camp was abandoned in a hurry. Look around: the foreman kept a ledger.
1. **Descend into the Cinderfall Mine and stop what is mutating the beasts** (`mine`)
1. **Bring what you found to Eldon in Stonebridge** (`report`)

### Aric's Lost Amulet (`sq_aric`)

1. **Find the bandit camp in the eastern hills, north of the Razorwood** (`find`)
1. **Return the amulet to Captain Aric at the Watchtower** (`back`)

### Ingredients of Unnatural Origin (`sq_nico`)

1. **Gather Dragon's Blood, Phoenix Feathers and Mandrake Root** (`gather`) — Dragon's Blood from the Drake's Scar on Mount Cinder's cliffs; Phoenix Feathers from Skyreach Roost, north of Eldenwood; Mandrake Root from the Haunted Glen in the Razorwood.
1. **Bring the three ingredients to Nico at his Emporium** (`deliver`)

### The Shadowed Mug's Secrets (`sq_mug`)

1. **Look into the Shadowed Mug without being noticed** (`look`) — Watch Kael, buy a drink, ask the barkeep. Something comes and goes behind the barrels at the back.
1. **Take what you found to Captain Aric** (`report`)

### The Runaway Apprentice (`sq_grom`)

1. **Find word of Lyra Stonehand, and her tools** (`search`) — Grom wants word of Lyra. She would never leave her tools unless she meant to come back for them.

### The Sigil's Shadow (`q2`)

1. **Travel east to Oakhaven, Ember's village** (`oak`)
1. **Find out what happened to Ember** (`ask`) — The villagers are polite but reserved. The children on the green, Lendel at the Trade Post, or the hut by the stream might tell you something.
1. **Find Ember's grandmother, Mira, at the Sacred Stone Circle on the eastern hill** (`mira`)
1. **Follow Ember's trail east into the Razorwood Thicket** (`razor`)
1. **Study the sigil burned into the great tree** (`sigil`)
1. **Survive the Bloomtouched stalkers** (`stalkers`)
1. **Return to Mira in Oakhaven** (`back`)

### The Vault of Old Greystone (`q3`)

1. **Rest and resupply in Oakhaven. Someone is looking for you.** (`fate`) — The Bellowing Boar has beds, Mira will want to see you, and a courier is somewhere in the square.
1. **Take the hill road north-west toward Greystone** (`trail`)
1. **Deal with the wounded stalker by the cart** (`stalker`)
1. **Search the broken cart and the body** (`search`)
1. **Find the Vault of Old Greystone in the cliffs** (`vault`)
1. **Descend into the Vault and find what Lyra left in the Echo Chamber** (`echo`)
1. **Open the harmonic seal of the inner vault (the five chimes)** (`seal`)
1. **Climb back to the surface** (`surface`)

### The Whispering Marshes (`q4`)

1. **Travel south-west into the Whispering Marshes** (`go`)
1. **Search the marsh for signs of Nico (the satchel, the pool, the robe)** (`search`)
1. **Find the sunken ruin where the lanterns flicker** (`ruin`)
1. **Uncover the truth of Nico's "cure" inside the ruin** (`nico`)
1. **Destroy what guards the ruin** (`aberration`)
1. **Use the Resonance Anchor (or your Sending Crystal) to return to Stonebridge** (`home`)
1. **Tell Eldon what you found** (`eldon`)
1. **Rest the night in Stonebridge** (`rest`) — Take a room at the Gilded Griffin, or Eldon's cot.

### The Ember at Mount Cinder (`q5`)

1. **Climb to the Smoldering Pass on Mount Cinder** (`go`) — The road runs north-east through the foothills to the ashen highlands. Zephyr still trades at the Cinderfall camp.
1. **Unlock the Fractured Vault: the Veil Seal in the obsidian wall** (`seal`)
1. **Descend into the Ember Vault** (`vault`)
1. **Face what stirs in the lava pit** (`horror`)
1. **Search the broken pedestal** (`core`)
1. **Someone is coming up the trail…** (`fate`)
1. **Return to Eldon in Stonebridge** (`eldon`)

### The Verdant Vale's Heart (`q6`)

1. **Follow Lyra's trail east to the Verdant Vale** (`go`) — Past the Forgotten Archway. A lost pilgrim may know the way past the Vale's guardians.
1. **Awaken a Verdant Whisperer in the Singing Grove** (`grove`)
1. **Descend into the Root Hollow and face the Hollowed Guardian** (`hollow`)
1. **Open the sealed vault beneath the Guardian's roots** (`roots`)
1. **Fate, mud on her boots, is pushing through the undergrowth…** (`fate`)
1. **Return to Eldon in Stonebridge** (`eldon`)
1. **Rest the night in Stonebridge** (`rest`)

### The Druidic Circle of Echoes (`q7`)

1. **Travel the old rootroad to the Druidic Circle of Echoes, south-east of Stonebridge** (`go`)
1. **Listen to the echo stones** (`stones`)
1. **Search the remains of Lyra's ritual** (`site`)
1. **A courier, again…** (`fate`)

### The Weeping Willow (`q8`)

1. **Seek the Weeping Willow, east beyond the Verdant Vale** (`go`)
1. **Listen to the Willow's memory** (`chorus`)
1. **Take what the Willow keeps beneath its roots, gently** (`roots`)
1. **Fate, brushing sap off her gloves…** (`fate`)
1. **Return to Eldon in Stonebridge** (`eldon`)
1. **Rest the night in Stonebridge** (`rest`)

### The Song Restored (`q9`)

1. **Return to the Circle of Echoes with the Sealed Echo Seed** (`go`)
1. **Complete the Rootsong at the Circle's altar** (`song`)
1. **Bring the news to Eldon** (`eldon`)

### The Shadowfell Forest (`q10`)

1. **Travel south into the Shadowfell Forest, to the spiral at the Veil's edge** (`go`)
1. **Harmonize the spiral glyph at the Veil's edge** (`glyph`)
1. **Open the Echo Gate: sing the Rootsong in reverse** (`gate`)
1. **Enter the Bloomed Echo Grove** (`grove`)
1. **Free Ember's echo from the Resonant Cage** (`cage`)
1. **Read what Lyra left by the Cradle Tree** (`note`)
1. **Return to Eldon with Lyra's note** (`eldon`)

### The Milkmaid's Charm (`sq_milk`)

1. **Drive the goblins out of the hollow south of Oakhaven** (`warren`)
1. **Tell Wenna at the Hallowbrook Dairy** (`back`)

### The Mirrorroot (`q11`)

1. **Travel south through the Shadowfell to the Mirrorroot** (`go`) — Across the Memory-Touched Crossing, past the Forgotten Encampment, down to where the trees twist inward.
1. **Descend and harmonize the Rootsong wards of the Root Spiral** (`wards`)
1. **Find the Petal of Preservation, and survive what guards it** (`petal`)
1. **Choose your true self in the Chamber of Mirrors That Never Were** (`mirrors`)
1. **Face the Echoing Bloom in the Broken Cradle** (`cradle`)
1. **Listen to Ember's Harmonic Core** (`core`)
1. **Return to Stonebridge (the anchor beneath the cradle will carry you)** (`home`)
1. **Bring what you found to Eldon** (`eldon`)

### Stillwater (`q12`)

1. **Travel west past the Marshes to Stillwater** (`go`) — The road loops strangely beneath the pines. Mirror Lake lies on the way; touch nothing you can't let go of.
1. **Search the Silent Streets and the Bell Tower** (`streets`)
1. **Solve the Harmonic Mooring at the Tether Docks** (`docks`)
1. **Find Lyra's echo in the Archive Spiral beneath the old town** (`archive`)
1. **Wake the archive's resonance node with the Half-Sigil Fragment** (`node`)
1. **Return to Eldon in Stonebridge** (`eldon`)

### The Veil's Heart (`q13`)

1. **Meet Captain Aric at the Stonebridge Watchtower** (`aric`) — "Come to the watchtower tonight. Alone." Kael's new shop, Nico's old lab and a leaning lantern post in the square might be worth a look first.
1. **Speak with Eldon before you go** (`ready`) — Grom said he had a strongbox with Lyra's mark on it.
1. **Wake Lyra at the Drowned Altar beneath Stillwater's lake** (`lake`)
1. **Go to the Corrupted Heart, deep in Eldenwood, with Lyra** (`kael`)
1. **Descend into the Temple of the Bloom and stop Seraphina** (`heart`)
1. **Free Ember: finish the song at the cradle of the Veil** (`song`)

### The Lantern Bearer (`sq_thornmere`)

1. **Go to the Stillwater Graves outside Thornmere and put out the false lanterns** (`graves`)
1. **Find Ilsa among the graves** (`ilsa`)
1. **Bring Ilsa home to Mother Aldwyn at the Chapel of the Pale Flame** (`back`)

## People

- **Fate**, Courier (`fate_sb`, stonebridge): A breathless courier in a patchy sash and wind-chapped boots. She always seems to know where you'll be.
- **Eldon the Wise**, Sage (`eldon`, stonebridge): An aging elven scholar of planar phenomena. Mentor, voice of caution on the Council, and keeper of more than he says.
- **Eldon the Wise**, Sage (`eldon_gate`, stonebridge)
- **Elara Hearthwood**, Innkeeper of the Gilded Griffin (`elara`, stonebridge): Warm but sharp keeper of the Gilded Griffin. Full of rumours, and keeps a close eye on strange travellers.
- **Thorin Stoneshield**, Cook at the Gilded Griffin (`thorin`, stonebridge): Elara's cook. Built like a barrel, sings while he stirs.
- **Pip**, A Local Boy (`pip`, stonebridge)
- **Kael Dorne**, Keeper of the Shadowed Mug (`kael`, stonebridge): Smooth and tight-lipped keeper of the Shadowed Mug. Quiet ties to cultists, if the whispers are true.
- **Jonric Vane**, Barkeep of the Shadowed Mug (`jonric`, stonebridge): The Shadowed Mug's barkeep. Hears everything and repeats a carefully chosen fraction of it.
- **Barrels by the Back Wall**, The Shadowed Mug (`mug_cellar`, stonebridge)
- **Bartholomew**, Merchant (`bartholomew`, stonebridge): Dry-humoured, watchful, hears everything. Goods for sale, rumours for free.
- **Nico Silverhands**, Arcane Emporium (`nico`, stonebridge): A flamboyant, arcane-minded alchemist. Potions, scrolls, magical reagents, tuning trinkets. Outwardly very helpful.
- **Grom Ironstout**, Blacksmith of the Stalwart Smithy (`grom`, stonebridge): Gruff dwarven blacksmith, traditional, protective of his past. Lyra Stonehand was his apprentice.
- **Captain Aric Vellor**, Commander of the Watch (`aric`, stonebridge): Head of the town guard, proud and lawful, tired and emotionally stretched. His father served in the last Bloomlight breach.
- **Etta Narlane**, High Scribe of the Scribe's Quill (`etta`, stonebridge): High Scribe of the Scribe's Quill. Vague knowledge of the Harmonic Tuner and very definite opinions about ink.
- **Marigold Greenleaf**, Greenleaf Remedies (`greenleaf`, stonebridge): Herbalist of Greenleaf Remedies: poultices, salves and odd charms.
- **Elion Varrastel**, Bookseller & Mapmaker (`elion`, stonebridge): Sells books, maps and local lore. For a price, he'll mark your map.
- **Velthra Duskgild**, Pawnbroker (`velthra`, stonebridge): Sells and loans goods. Asks no questions; prices accordingly.
- **The Foreman's Ledger**, Cinderfall Mining Camp (`foreman_ledger_prop`, cinderfall_camp)
- **Bodies Fused into the Rock**, Cinderfall Mining Camp (`fused_miners_prop`, cinderfall_camp)
- **Zephyr**, Travelling Merchant (`zephyr`, cinderfall_camp): A wandering dwarf merchant who rides a flame-resistant yak-lizard. He always seems to know where the path less travelled goes.
- **Mira**, Ember's Grandmother (`mira`, oak_circle): Ember's grandmother. Wary at first, then wise and full of grief. She gathers herbs at the Sacred Stone Circle.
- **Lendel**, Shopkeeper of the Trade Post (`lendel`, oakhaven): Oakhaven's shopkeeper: friendly, but cautious.
- **Children on the Green**, Oakhaven (`oak_children`, oakhaven)
- **The Cold Hearth**, The Streamside Hut (`ember_hearth`, oakhaven)
- **A Scratched Beam**, The Watcher's Barn (`barn_beam`, watchers_barn)
- **The Sigil**, The Razorwood Thicket (`razor_sigil`, razorwood)
- **Wenna Hallowbrook**, Milkmaid of the Hallowbrook Dairy (`wenna`, oakhaven): Thorn Hallowbrook's sister, keeper of the dairy and of Buttercup, a cow with faintly glowing milk.
- **Elder Merion Willowcloak**, Elder of Oakhaven (`merion`, oakhaven): Oakhaven's leader, a retired druid who keeps the balance between progress and tradition.
- **Calla Fernroot**, Head Herbalist of Greenroot Remedies (`calla`, oakhaven): Knows forest medicine and fey curses. Her stronger brews are only rumoured.
- **Thorn Hallowbrook**, Captain of the Oakhaven Garrison (`thorn`, oakhaven): Suspicious of outsiders, fiercely loyal to Oakhaven.
- **Old Man Hemlock**, Provisions (`hemlock`, oakhaven): Gruff but sharp-minded elder who knows old stories and forest legends.
- **Fate**, Courier (`fate_oak`, oakhaven)
- **The Body by the Cart**, The Broken Cart (`borin_body`, borin_cart)
- **The Humming Stones**, The Ridge Trail (`wind_stones`, resonant_wind)
- **The Pedestal in the Echo Chamber**, The Vault of Old Greystone (`grey_pedestal`, greystone)
- **The Sealed Vault Door**, The Vault of Old Greystone (`grey_chimes`, greystone)
- **A Satchel Behind a Fallen Stone**, The Vault of Old Greystone (`lyra_satchel`, greystone)
- **Fate**, Courier (`fate_grey`, greystone)
- **A Half-Buried Satchel**, The Whispering Marshes (`marsh_satchel`, marsh_cache)
- **The Sigil Pool**, The Whispering Marshes (`sigil_pool_prop`, sigil_pool)
- **A Tattered Robe**, The Whispering Marshes (`marsh_robe_prop`, marsh_robe)
- **Nico Silverhands**, In the Sunken Ruin (`nico_marsh`, marsh_ruin)
- **Nico's Work Table**, The Sunken Ruin (`nico_desk`, marsh_ruin)
- **Nico Silverhands**, Prisoner of the Watch (`nico_cell`, stonebridge)
- **Mara Teldan**, Injured Herbalist (`mara`): An herbalist who followed "a girl with two-colored eyes" into the highlands and was caught in a tremor.
- **The Singing Rock**, Mount Cinder (`singing_rock_prop`, singing_rock)
- **Fused Corpses**, The Smoldering Pass (`pass_corpses`, smoldering_pass)
- **The Veil Seal**, The Fractured Vault (`cinder_pillars`, fractured_vault)
- **The Broken Pedestal**, The Ember Vault (`ember_pedestal`, ember_vault)
- **Fate**, Courier (`fate_cinder`, ember_vault)
- **A Branded Prisoner**, The Watchtower Cells (`bandit_prisoner`, stonebridge)
- **A Dormant Sigil in the Arch**, The Forgotten Archway (`vale_arch_prop`, vale_arch)
- **A Lost Pilgrim of the Circle**, Pilgrim (`pilgrim`): A disoriented elf cloaked in ceremonial vines, blindfolded. He wandered from the Circle of Echoes when "the rhythm broke".
- **The Vale Guardians**, The Verdant Vale (`vale_guardians`)
- **K'thura, the Living Chorus**, A Verdant Whisperer (`kthura`, singing_grove)
- **Three Conduit Roots**, The Root Hollow (`root_conduits`, root_hollow)
- **Fate**, Courier (`fate_vale`, root_hollow)
- **The Overgrown Cairn**, The Echoing Path (`cairn_prop`, overgrown_cairn)
- **The Root Gate**, The Echoing Path (`root_gate_prop`, root_gate)
- **The Echo Stones**, The Druidic Circle of Echoes (`echo_stones`, echo_circle)
- **Lyra's Ritual Site**, The Druidic Circle of Echoes (`lyra_site`, echo_circle)
- **Fate**, Courier (`fate_circle`, echo_circle)
- **The Withered Grove**, Beyond the Vale (`withered_prop`, withered_grove)
- **The Mourning Stone**, Beyond the Vale (`mourning_prop`, mourning_stone)
- **The Weeping Willow**, A Harmonic Binder (`willow_tree`, weeping_willow)
- **The Willow's Roots**, The Weeping Willow (`willow_roots`, weeping_willow)
- **Fate**, Courier (`fate_willow`, weeping_willow)
- **The Silent Birds**, The Meadow of Muted Birds (`muted_birds`, muted_glade)
- **The Guardian of the Forgotten Tone**, The Rootroad (`tone_guardian`, tone_statue)
- **The Resonance Altar**, The Druidic Circle of Echoes (`circle_altar`, echo_circle)
- **The Spiral Glyph**, The Veil's Edge (`spiral_glyph_prop`, spiral_glyph)
- **The Tree of Silent Names**, The Shadowfell Forest (`silent_names_prop`, silent_names)
- **Ember's Spiral**, The Spiral Hollow (`spiral_hollow_prop`, spiral_hollow)
- **The Echo Gate**, The Shadowfell Forest (`echo_gate_prop`, echo_gate)
- **The Resonant Cage**, The Bloomed Echo Grove (`resonant_cage`, echo_grove)
- **Zephyr**, Travelling Merchant (`zephyr_veil`, veilwood_clearing)
- **The Rope Bridge**, The Memory-Touched Crossing (`crossing_prop`, memory_crossing)
- **Petal-Shaped Tents**, The Forgotten Encampment (`druid_camp`, forgotten_camp)
- **The Rootsong Wards**, The Mirrorroot · the Root Spiral (`root_wards`, mirrorroot)
- **The Petal of Preservation**, The Mirrorroot · the Bloomed Lattice Grove (`preservation_petal`, mirrorroot)
- **The Orbs Over the Chasm**, The Mirrorroot · the Chamber of Mirrors That Never Were (`memory_orbs`, mirrorroot)
- **Ember's Harmonic Core**, The Mirrorroot · the Broken Cradle (`ember_core`, mirrorroot)
- **The Fork in the Road**, The Repeating Path (`repeating_fork`, repeating_path)
- **The Mirror-Still Pool**, Mirror Lake Edge (`mirror_pool`, mirror_lake)
- **The Withered Choir**, A Ring of Dead Trees (`choir_ring`, choir_stump)
- **A Letter on a Table**, Stillwater · the Silent Streets (`still_table`, stillwater)
- **The Bell of Echoing Chimes**, Stillwater · the Bell Tower (`still_bell`, stillwater)
- **Five Tether Stumps**, Stillwater · the Tether Docks (`tether_stumps`, stillwater_docks)
- **Lyra Stonehand**, A Mirrorbound Echo (`lyra_echo`, archive_spiral)
- **The Central Pillar**, Stillwater · the Archive Spiral (`archive_node`, archive_spiral)
- **Kael Dorne**, Kael's Curatives (`kael_shop`, stonebridge): Kael Dorne, once of the Shadowed Mug, now selling herbs and tinctures from what was Nico's Arcane Emporium. The old sign is still there, half-scorched.
- **The Hatch to Nico's Lab**, Kael's Curatives (once Nico's Arcane Emporium) (`nico_lab`, stonebridge)
- **A Leaning Lantern Post**, Stonebridge (`lantern_post`, stonebridge)
- **Lyra, Beneath the Lake**, The Drowned Altar (`lyra_sleeping`, drowned_altar)
- **Lyra Stonehand**, Grom's Apprentice (`lyra`, drowned_altar): Grom's apprentice: half-elf, brilliant, stubborn. One green eye, one brown. She recovered the Harmonic Tuner, and spent a month beneath Stillwater singing so Ember would not be alone.
- **Kael Dorne**, Hand of the Bloom (`kael_temple`, temple_gate)
- **The Cradle of the Veil**, The Temple of the Bloom (`veil_heart`, seraphina_temple)
- **Ember**, Home (`ember`, oakhaven): Mira's granddaughter. She sleeps through the night now, and hums ordinary songs in the mornings.
- **Lyra Stonehand**, Smith of the Stalwart Smithy (`lyra_home`, stonebridge): Back at Grom's anvil, burning his good apron.
- **Fate**, Courier (`fate_end`, stonebridge)
- **Mother Aldwyn**, Elder Priestess of the Pale Flame (`aldwyn`, thornmere): Keeper of Thornmere's ancient cleansing rites. She has not slept properly since the lanterns began to walk.
- **Rook Thalen**, Captain of the Mirewatch (`rook`, thornmere): Tired and grim, one of the last defenders of Thornmere's light.
- **Harlan Brimm**, Keeper of the Hollow Hearth (`harlan`, thornmere): A former cultist seeking redemption over blackbrew mead.
- **Sister Wren**, Wyrdroot Remedies (`wren`, thornmere): A mysterious herbalist who trades in secrets more than coin.
- **Ilsa the Candlemaid**, Among the Graves (`ilsa`, thornmere_graves)

## Letters and pages

- A Letter from Eldon the Wise (`eldon_letter`)
- Eldon's Map of Eldenwood (`eldenwood_map`)
- Orders Found on the Herald (`herald_orders`)
- The Cinderfall Foreman's Ledger (`foreman_ledger`)
- Bandit's Journal: Whispers of the Crystalline Bloom (`bandit_journal`)
- A Letter Sealed with a Crescent Bloom (`fate_greystone`)
- Borin's Journal (`borin_journal`)
- Lyra's Chalk Notes (copied) (`lyra_chalk`)
- A Letter Sealed with a Half-Open Flower (`fate_poem`)
- A Letter to Nico: "The Final Mix" (`cult_letter`)
- Nico's Field Journal (`nico_journal`)
- Eldon's Message (crystal tablet) (`eldon_crystal`)
- Lyra's Journal: The Ember Vault (`lyra_cinder`)
- Lyra's Journal: Page 3 (`lyra_page3`)
- Eldon's Letter: "Return to the Circle" (`eldon_vale`)
- The Rootsong: Verse I (from the Whisperers) (`rootsong_1`)
- Eldon's Message at the Circle (`circle_echo_letter`)
- Lyra's Journal: Page IV (`lyra_page4`)
- An Elder's Journal Bark (`elder_bark`)
- A Note from Eldon (on your breakfast table) (`eldon_willow_note`)
- The Rootsong: Verse II (the Harmonic Lullaby) (`rootsong_2`)
- Eldon's Letter at the Weeping Willow (`eldon_willow`)
- The Rootsong: The Last Line (`rootsong_3`)
- Letter from Eldon the Wise (left at the altar) (`eldon_circle`)
- The Backward Lullaby (Ember's gift) (`rootsong_rev`)
- Lyra's Final Note (partly overwritten) (`lyra_final`)
- Lyra's Final Note (restored by Eldon) (`lyra_final_restored`)
- A Letter to "Lyra" (still being written) (`stillwater_letter`)
- Lyra's Mirrored Journal (Archive Spiral) (`lyra_mirror`)
- Nico's Final Note (crumpled) (`nico_final`)
- Fate's Signal Letter (`fate_signal`)
- Captain Halden Vellor's Journal (`aric_father`)
- Seraphina's Research Notes (`seraphina_notes`)
- Seraphina's Network Map (`seraphina_map`)
- The Rootsong (whole) (`rootsong_whole`)
- The Deep Notes (from the Stonebridge Archives) (`deep_notes`)
- Thornmere's Leyline Overlays (`thornmere_overlays`)

## Creatures

- a crystal crawler (`crystal_crawler`): 18 hp, AC 13
- an ash-mad hound (`ash_hound`): 20 hp, AC 12
- the Crystal-Bound Herald (`crystal_herald`): 75 hp, AC 14 · boss
- a Bloomtouched stalker (`bloom_stalker`): 26 hp, AC 13
- the Stalker Alpha (`stalker_alpha`): 80 hp, AC 14 · boss
- a Bloom-branded bandit (`bloom_bandit`): 24 hp, AC 13
- Grist the Bloom-Branded (`bandit_lieutenant`): 90 hp, AC 15 · boss
- a Bloom-touched goblin (`goblin`): 14 hp, AC 13
- Snagtooth, the goblin boss (`goblin_boss`): 55 hp, AC 14 · boss
- a shrieking mandrake (`shrieking_mandrake`): 50 hp, AC 12 · boss
- a phoenix's brood (`brood_hatchling`): 22 hp, AC 13
- the Ashen Broodmother (`ashen_broodmother`): 95 hp, AC 14 · boss
- a corrupted cinder drake (`cinder_drake`): 110 hp, AC 15 · boss
- a wounded Bloomtouched stalker (`wounded_stalker`): 36 hp, AC 13 · boss
- a Greystone revenant (`grey_revenant`): 24 hp, AC 13
- a hollow-eyed delver (`grey_delver`): 26 hp, AC 10
- the Echobound Warden (`echobound_warden`): 140 hp, AC 16 · boss
- a Bloomtouched cultist (`bloom_cultist`): 32 hp, AC 13
- a Bloomed Circle hexer (`bloom_hexer`): 30 hp, AC 12
- a bog crawler (`bog_crawler`): 44 hp, AC 12
- the Marsh Aberration (`marsh_aberration`): 170 hp, AC 13 · boss
- Nico Silverhands (`nico_hex`): 100 hp, AC 13 · boss
- an ember wisp (`ember_wisp`): 24 hp, AC 13
- a fused miner (`fused_miner`): 34 hp, AC 11
- a magmatic spawn (`magmatic_spawn`): 34 hp, AC 12
- an Emberborn Atronach (`emberborn_atronach`): 80 hp, AC 15
- the Cindermelt Horror (`cindermelt_horror`): 250 hp, AC 17 · boss
- a Bloomtouched grove elk (`grove_beast`): 46 hp, AC 13
- a Bloomtouched widow (`bloom_widow`): 56 hp, AC 14
- the Hollowed Guardian (`hollowed_guardian`): 300 hp, AC 16 · boss
- an animated thorn (`animated_thorn`): 22 hp, AC 12
- the Bloomcore Matron (`thorn_mother`): 120 hp, AC 14 · boss
- a Bloomtouched echo guardian (`echo_guardian`): 110 hp, AC 15 · boss
- a bloom-resonant wraith (`bloom_wraith`): 55 hp, AC 14
- a resonance-lashed swarmbeak (`swarmbeak`): 28 hp, AC 13
- the Swarmbeak Matriarch (`swarmbeak_matriarch`): 110 hp, AC 14 · boss
- the Lost Voice (`lost_voice`): 230 hp, AC 16 · boss
- a Bloomtouched hollow elk (`hollow_elk`): 72 hp, AC 14
- a veil-touched stalker (`veil_stalker`): 56 hp, AC 14
- the Veil-Stalked Bloomling (`veil_bloomling`): 130 hp, AC 15 · boss
- the Echoing Bloom (`echoing_bloom`): 350 hp, AC 16 · boss
- a mirror-shard sentinel (`mirror_shard`): 64 hp, AC 16
- a memory shade (`memory_shade`): 52 hp, AC 14
- the Echoguard Warden (`echoguard_warden`): 270 hp, AC 17 · boss
- a mirror echo (`mirror_echo`): 80 hp, AC 15
- the Echoing Bloom, Anchorform (`anchorform`): 430 hp, AC 17 · boss
- a drowned echo (`drowned_echo`): 60 hp, AC 14
- the Echo of the Drowned Self (`drowned_self`): 300 hp, AC 16 · boss
- a lantern wraith (`lantern_wraith`): 42 hp, AC 13
- the Lantern Matron (`lantern_matron`): 140 hp, AC 15 · boss
- a Bloom zealot (`bloom_zealot`): 64 hp, AC 15
- a Harmonized magus (`bloom_magus`): 58 hp, AC 14
- Kael Dorne, Hand of the Bloom (`kael_hand`): 250 hp, AC 15 · boss
- Lady Seraphina, the Harmonized (`seraphina`): 620 hp, AC 18 · boss

## Story triggers

`farewell`, `rooftops`, `ledger_hint`, `dreamfall`, `interlude1`, `dream_ember`, `dream_root`, `lyra_whisper`, `dreamlight`, `bloomwatcher`, `owls`, `sb_return_cinder`, `descent`, `watchers`, `petal_storm`, `personal_echo`, `marshfire`, `stillwater_arrival`, `eve_of_war`, `temple_arrival`
