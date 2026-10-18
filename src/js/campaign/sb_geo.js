// ---------------------------------------------------------------------------
// campaign/sb_geo.js — (alpha 8) the land redrawn from the campaign notes: the second edition of Eldenwood's geography.
//
// Worlds begun from this version on are made with it; older worlds keep the land they were made with (campaign/engine.js
// campEdition). Here: lands, rivers, ravines and places marked geo: 2 (only in the new land), until: 2 (only in the old),
// or carrying ed2: { ... } (what changes in the new land).
//
// What the notes say, and what that makes here (L = a line of the notes):
//  · Stonebridge stands on the Blackroot at the eastern edge of Eldenwood (L12, L3848), its arched stone bridge at the
//    gate (L13, L3866), a port just north of Tidewater Bay (L4025, L4033): the river runs along the south wall, the road
//    out of the south gate crosses it on an arched stone bridge, and the river runs out south into the bay. The river
//    from Oakhaven's bend (the Almer, L3866) meets it by the town.
//  · Eldenwood begins at the town's western outskirts; beyond it the darker Blackroot Forest, out of which the river comes.
//  · East: hills between Stonebridge and Oakhaven, rising north to Greystone's cliffs ("cliffs rise like teeth"); Oakhaven
//    at the edge of a vast oak wood, in a bend of the river, the Eastern Hill with its stone circle beside it.
//  · North-east: Mount Cinder a range of volcanic peaks above ashen highlands, a cleft of fire on its flank.
//  · East-south-east: the Verdant Vale, a lush valley around the cliff-ringed basin with the Heart Tree at its centre;
//    the Circle of Echoes on a rise at its edge, facing the Shadowfell; the Weeping Willow past its eastern rim.
//  · South-west: the Whispering Pines on a rise above the bay, the marshes below them, Mirror Lake, the hill before
//    Stillwater, and Stillwater's vast still lake.
//  · South-east, beyond and beneath the Shadowfell: hollow-rooted uplands and the fog-drenched ravine of the Memory-Touched
//    Crossing, then the dip down to the Mirrorroot.
// ---------------------------------------------------------------------------
SB.geoLatest = 2;
{
  // place a land just before another one in the list (the broad one first, so the one inside it wins)
  const at = (x, z) => SB.lands.findIndex(l => l.at[0] === x && l.at[1] === z);
  const before = (x, z, ...L) => { const i = at(x, z); if (i < 0) SB.lands.push(...L); else SB.lands.splice(i, 0, ...L); };
  const old = (x, z, ed2) => { const l = SB.lands[at(x, z)]; if (l) { if (ed2 === 'gone') l.until = 2; else l.ed2 = ed2; } };

  // ---- the heartland: dry ground everywhere the notes have land (no random seas between the towns), and no desert ----
  SB.lands.unshift({ at: [-120, 120], r: 990, fade: 160, kind: 'raise', floor: 2, noise: true, fix: { desert: 'plains', beach: 'plains', ocean: 'plains' }, geo: 2 });

  // the farmland round Stonebridge: no crag looming over the walls
  SB.lands.splice(1, 0, { at: [0, 0], r: 170, fade: 110, kind: 'soften', top: 16, keep: 0.3, fix: { mountains: 'plains', taiga: 'forest' }, geo: 2 });
  // ---- Stonebridge: the bay to the south, its mouth, the open sea, two small isles --------------------------------------
  SB.lands.push(
    { at: [40, 420], r: 190, fade: 50, kind: 'lake', depth: 12, biome: 'ocean', surface: ['sand', 'sand', 'gravel', 'clay'], geo: 2 },   // Tidewater Bay
    { at: [70, 720], r: 220, fade: 60, kind: 'lake', depth: 16, biome: 'ocean', geo: 2 },                                              // its mouth, opening south
    { at: [120, 1060], r: 300, fade: 60, kind: 'lake', depth: 20, biome: 'ocean', geo: 2 },                                            // the southern sea
    { at: [-30, 470], r: 12, fade: 10, kind: 'raise', floor: 2, surface: ['sand', 'grass'], geo: 2 },                                  // the Tidewater Isles
    { at: [130, 540], r: 9, fade: 8, kind: 'raise', floor: 2, surface: ['sand', 'gravel'], geo: 2 },
    { at: [255, 600], r: 45, fade: 30, kind: 'raise', floor: 12, surface: ['stone', 'grass', 'gravel'], geo: 2 },                     // the southern cliffs (L928)
  );
  // ---- Eldenwood up to the town's western farms, and the Blackroot Forest beyond it ------------------------------------
  before(-390, -60,
    { at: [-430, -70], r: 250, fade: 70, kind: 'forest', biome: 'forest', temp: 0.0, humid: 0.35, deco: [['fern', 0.04]], trees: { density: 1.15, types: { oak: 0.5, birch: 0.15, dark_oak: 0.2 } }, geo: 2 },
    { at: [-760, -60], r: 170, fade: 50, kind: 'forest', biome: 'forest', temp: -0.05, humid: 0.5, surface: ['podzol', 'coarse_dirt', 'podzol', 'grass'], deco: [['fern', 0.03], ['dead_bush', 0.02]], trees: { density: 1.3, types: { dark_oak: 0.55, spruce: 0.2 } }, geo: 2 },
  );
  // ---- the eastern hills: the ridge the east road crosses, the ridge trail, the old hills under Greystone, Cinder's foothills
  old(160, -370, 'gone');
  SB.lands.push(
    { at: [250, -40], r: 55, fade: 40, kind: 'hills', h: 14, region: ['hills'], geo: 2 },
    { at: [255, -170], r: 65, fade: 40, kind: 'hills', h: 20, region: ['hills'], geo: 2 },
    { at: [200, -300], r: 75, fade: 45, kind: 'hills', h: 24, biome: 'taiga', temp: -0.35, region: ['hills'], trees: { density: 0.7, types: { pine: 0.6, spruce: 0.4 } }, geo: 2 },   // "still pines"
    { at: [380, -330], r: 70, fade: 45, kind: 'hills', h: 18, surface: ['stone', 'gravel', 'coarse_dirt', 'grass'], region: ['hills'], geo: 2 },
    // Greystone: a crag, its cliffs like teeth, the vault's door on its southern flank
    { at: [165, -395], r: 35, fade: 45, kind: 'mountain', h: 40, biome: 'mountains', temp: -0.35, surface: ['stone', 'andesite', 'stone', 'gravel', 'mossy_cobblestone'], geo: 2 },
  );
  // ---- Oakhaven: the oak and birch wood, the Eastern Hill ---------------------------------------------------------------
  before(600, -40,
    { at: [520, 40], r: 160, fade: 50, kind: 'forest', biome: 'forest', temp: 0.12, humid: 0.12, deco: [['fern', 0.03], ['lily_of_the_valley', 0.01]], trees: { types: { oak: 0.6, birch: 0.4 } }, geo: 2 },
  );
  SB.lands.push({ at: [535, 50], r: 16, fade: 24, kind: 'raise', floor: 12, geo: 2 });   // the Eastern Hill
  // ---- Mount Cinder: a range above the ashen highlands; Skyreach a true peak ---------------------------------------------
  before(600, -560,
    { at: [560, -480], r: 190, fade: 70, kind: 'raise', floor: 12, temp: 0.2, humid: -0.3, surface: ['gravel', 'coarse_dirt', 'tuff', 'basalt', 'gravel', 'magma_block'], deco: [['dead_bush', 0.03]], trees: { density: 0.3 }, geo: 2 },
  );
  SB.lands.push(
    { at: [720, -650], r: 55, fade: 70, kind: 'mountain', h: 40, biome: 'mountains', temp: 0.25, humid: -0.35, surface: ['basalt', 'blackstone', 'tuff', 'gravel'], geo: 2 },
    { at: [470, -680], r: 50, fade: 60, kind: 'mountain', h: 34, biome: 'mountains', temp: 0.2, humid: -0.3, surface: ['basalt', 'tuff', 'gravel', 'stone'], geo: 2 },
  );
  old(-120, -470, { r: 26, fade: 50, h: 55, temp: -0.2 });
  // ---- the Verdant Vale: a lush valley around the basin; the arch on a hill; the Circle on a rise -----------------------
  before(740, 230,
    { at: [640, 270], r: 210, fade: 60, kind: 'forest', biome: 'forest', temp: 0.3, humid: 0.45, deco: [['flower_red', 0.02], ['cornflower', 0.02], ['azure_bluet', 0.02], ['allium', 0.01]], region: ['vale'], geo: 2 },
  );
  SB.lands.push(
    { at: [560, 168], r: 16, fade: 22, kind: 'raise', floor: 10, geo: 2 },   // the Forgotten Archway "on the hill ahead"
    { at: [424, 332], r: 16, fade: 30, kind: 'raise', floor: 10, geo: 2 },   // the Circle: "the trees thin as the trail rises"
  );
  // ---- the Weeping Willow past the Vale's eastern rim, and the Shadowfell reaching south of the Vale --------------------
  SB.lands.push(
    { at: [875, 320], r: 90, fade: 40, kind: 'forest', biome: 'plains', temp: 0.1, humid: 0.3, deco: [['dead_bush', 0.01]], trees: { density: 2.2, types: { dark_oak: 0.5, oak: 0.5 }, bare: 0.35 }, region: ['forest'], geo: 2 },   // the Woundwood: far apart, drooping
    { at: [905, 335], r: 26, fade: 30, kind: 'basin', level: 2, rim: 0, geo: 2 },                                                // the ground dips into the hollow
    { at: [868, 205], r: 30, fade: 25, kind: 'hills', h: 10, region: ['hills'], geo: 2 },                                        // Songbird Ridge
    { at: [800, 520], r: 110, fade: 40, kind: 'forest', biome: 'forest', temp: -0.22, humid: 0.2, region: ['shadowfell'], surface: ['podzol', 'coarse_dirt', 'grass', 'podzol'], deco: [['dead_bush', 0.05], ['cobweb', 0.008]], trees: { types: { aspen: 0.5, birch: 0.5 }, bare: 0.3 }, geo: 2 },
  );
  // the Shadowfell's grey, silver-dead canopy (the old forest too, in the new land)
  old(580, 650, { trees: { types: { aspen: 0.5, birch: 0.5 }, bare: 0.3 } });
  // ---- south-west: the Whispering Pines above the bay, Mirror Lake, the hill before Stillwater, the vast lake -----------
  before(40, 420,
    { at: [-180, 215], r: 70, fade: 40, kind: 'raise', floor: 9, biome: 'forest', temp: -0.05, humid: 0.2, surface: ['grass', 'dirt_with_coniferous_litter', 'podzol', 'grass'], deco: [['fern', 0.05]], trees: { density: 1.1, types: { pine: 0.65, spruce: 0.35 } }, geo: 2 },
  );
  SB.lands.push(
    { at: [-430, 496], r: 9, fade: 5, kind: 'lake', depth: 3, geo: 2 },                     // Mirror Lake: a perfectly still pool
    { at: [-560, 490], r: 50, fade: 35, kind: 'hills', h: 10, region: ['hills'], geo: 2 },  // the low hill the road crests before Stillwater
    { at: [-680, 785], r: 125, fade: 25, kind: 'lake', depth: 7, biome: 'ocean', geo: 2 },  // Stillwater's lake, vast and still
  );
  old(-680, 720, 'gone');
  // the marshes: warm enough for mangroves, the trees thin and twisted
  old(-330, 330, { temp: 0.25, trees: { density: 0.5, types: { dark_oak: 0.5 } } });
  // ---- the Mirrorroot: hollow-rooted uplands, then the dip ----------------------------------------------------------------
  SB.lands.push({ at: [690, 820], r: 60, fade: 40, kind: 'raise', floor: 10, geo: 2 });
  // ---- Duskwood (its place is the game's own: the notes give none) moves out of the bay, south-east across the water -----
  old(150, 360, 'gone');
  SB.lands.push({ at: [330, 470], r: 95, fade: 35, kind: 'forest', biome: 'forest', temp: 0.0, humid: 0.6, region: ['duskwood'], surface: ['podzol', 'moss_block', 'grass'], deco: [['fern', 0.06], ['red_mushroom', 0.01], ['brown_mushroom', 0.01]], trees: { density: 1.3 }, geo: 2 });
}

// ---- the rivers --------------------------------------------------------------------------------------------------------
SB.rivers[0].until = 2;
SB.rivers.push(
  // the Blackroot: out of the Blackroot Forest, through Eldenwood, along Stonebridge's south wall, out south into the bay
  { name: 'Blackroot River', w: 7, depth: 4, pts: [[-920, -160], [-780, -80], [-620, -45], [-480, -30], [-380, -20], [-250, 30], [-150, 70], [-92, 86], [0, 86], [72, 86], [98, 92], [106, 140], [82, 190], [62, 214]], geo: 2 },
  // the Almer: from the Vale's edge, round the south of Oakhaven, west to meet the Blackroot by Stonebridge
  { name: 'the Almer', w: 6, depth: 3, pts: [[980, 100], [760, 120], [620, 98], [540, 118], [512, 146], [465, 158], [380, 156], [330, 125], [290, 108], [200, 98], [140, 93], [98, 92]], geo: 2 },
);
// ---- the ravines ---------------------------------------------------------------------------------------------------------
SB.ravines = [
  // the fog-drenched ravine under the Memory-Touched Crossing's rope bridge, a stream at its bottom
  { name: 'the Memory Ravine', w: 7, depth: 16, floor: 'water', pts: [[556, 777], [620, 781], [692, 775]], geo: 2 },
  // a cleft of fire in Mount Cinder's flank (the deep volcanic ravine of the notes)
  { name: 'the Smoldering Cleft', w: 6, depth: 20, floor: 'lava', pts: [[640, -428], [700, -478], [728, -545]], geo: 2 },
];

// ---- the places that move, and the new ones ------------------------------------------------------------------------
// (by the water on purpose: the land checks leave these be)
for (const k of ['aethel', 'isle_whispers', 'sawtooth_mill']) if (SB.places[k]) SB.places[k].shore = true;
for (const k of ['stonebridge', 'stillwater', 'thornmere', 'saltwind']) if (SB.towns[k]) SB.towns[k].shore = true;
Object.assign(SB.places.oak_circle, { ed2: { at: [535, 50] } });                // up on the Eastern Hill
Object.assign(SB.places.wishing_wall, { ed2: { at: [86, -86] } });              // at the edge of town, not out in the fields
Object.assign(SB.places.bandit_camp, { ed2: { at: [330, -120] } });             // in the eastern hills
Object.assign(SB.places.duskwood_glade, { ed2: { at: [330, 470] } });           // across the bay
Object.assign(SB.places.weeping_willow, { ed2: { at: [905, 335] } });           // just past the Vale's eastern rim
Object.assign(SB.places.withered_grove, { ed2: { at: [845, 250] } });
Object.assign(SB.places.swarm_ridge, { ed2: { at: [868, 205] } });
Object.assign(SB.places.mourning_stone, { ed2: { at: [880, 290] } });
Object.assign(SB.places.watchers_barn, { ed2: { at: [400, 190] } });             // the river swings round the south of Oakhaven
Object.assign(SB.places.sawtooth_mill, { ed2: { at: [530, 162] } });            // on the bank below the town
Object.assign(SB.towns.oakhaven, { ed2: { style: 'plains' } });                // built of oak, at the edge of the oak wood
Object.assign(SB.places, {
  heart_tree: { name: 'The Heart Tree', kind: 'heart_tree', at: [740, 230], size: 15, geo: 2, desc: 'At the heart of the Verdant Vale, a tree older than the Vale itself: roots like walls, two crowns of flowering leaves, lights hanging in them like lanterns. The druids say the Vale grew out of it, not the other way round.' },
  stonebridge_port: { name: 'Stonebridge Port', kind: 'dock', at: [34, 186], length: 16, dir: [0, 1], noGround: true, geo: 2, desc: 'Where the Blackroot meets Tidewater Bay: the town\'s docks, busy with fishing boats and traders from up and down the coast.' },
});
