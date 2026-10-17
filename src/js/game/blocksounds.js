// ---------------------------------------------------------------------------
// game/blocksounds.js — 0.8.4: wood sounds like wood.
//
// Wood used to ring like a xylophone (a struck note). Real wood is dead and
// fibrous: chopping is the edge biting in, a hollow thock from the weight of
// the log, and fibres tearing. Logs and stems are deeper and duller than
// boards; planks, floors and furniture are hollower. Breaking a log ends in a
// splintering crack and the chunk dropping. Stone is left exactly as it was.
// Also a few blocks that sounded like stone now sound like what they are.
// ---------------------------------------------------------------------------
{
  // one blow of an axe (or a fist) into wood. o: lo = body pitch, the rest are levels
  const chop = (b, r, o) => {
    const lo = o.lo * (0.9 + r() * 0.2);
    b.noise(0, 0.003, 'bp', 2600 + r() * 1400, 0.8, o.click);                        // the edge biting in
    b.noise(0, o.knockLen || 0.045, 'bp', o.mid * (0.85 + r() * 0.3), 1.1, o.knock, { att: 0.0008 });   // a dry, woody knock
    b.noise(0, 0.08, 'lp', 260 + r() * 60, 0.8, o.body, { brown: true, att: 0.001 });   // the weight of it
    b.thump(0, lo * 1.7, lo, 0.07, o.thump);
    b.modes(0, [[lo * 1.15, o.ringLen || 0.012, 1], [lo * 2.45, 0.007, 0.45], [lo * 4.1, 0.004, 0.25]], o.ring);   // hollow, but dead quickly
    if (o.fibres) b.grains(0.003, o.fibreSpan || 0.05, o.fibres, 1300, 5200, 2.2, o.fibreLvl, { front: 1.8, dMax: 0.007 });   // fibres tearing
  };
  const LOG = { lo: 105, mid: 650, click: 0.75, knock: 0.85, body: 0.75, thump: 0.65, ring: 0.18, fibres: 9, fibreLvl: 0.32 };
  const BOARD = { lo: 165, mid: 900, click: 0.55, knock: 0.75, body: 0.45, thump: 0.45, ring: 0.35, ringLen: 0.018, fibres: 5, fibreLvl: 0.22 };
  const with_ = (base, extra) => Object.assign({}, base, extra);
  const breakWood = (b, r, base) => {
    chop(b, r, with_(base, { click: base.click * 1.2, knock: 1, body: 0.9, thump: 0.8, fibres: 0 }));
    // it splits: a run of cracks, the fibres giving way
    b.grains(0.01, 0.2, 34, 1100, 5200, 2.4, 0.42, { front: 1.5, fade: true, dMax: 0.009 });
    for (let k = 0; k < 4; k++) b.noise(0.02 + r() * 0.12, 0.004, 'bp', 1600 + r() * 2200, 1.2, 0.5 + r() * 0.3);
    // and the piece drops
    b.thump(0.12 + r() * 0.04, base.lo * 1.4, base.lo * 0.7, 0.08, 0.45);
    b.noise(0.12, 0.06, 'lp', 400, 0.8, 0.35, { brown: true });
  };
  const placeWood = (b, r, base) => {
    // set down: a solid clunk, no edge
    b.thump(0, base.lo * 1.5, base.lo * 0.8, 0.08, 0.75);
    b.noise(0, 0.05, 'bp', base.mid * 0.8, 1.0, 0.7, { att: 0.001 });
    b.noise(0, 0.07, 'lp', 300, 0.8, 0.55, { brown: true });
    b.modes(0, [[base.lo * 1.2, 0.014, 1], [base.lo * 2.6, 0.007, 0.4]], base.ring * 1.2);
    b.noise(0.002, 0.003, 'bp', 2200, 1.2, 0.25);
  };
  const stepWood = (b, r, base) => {
    // a footstep on boards: a soft hollow knock
    b.thump(0, base.lo * 1.4, base.lo * 0.85, 0.05, 0.5);
    b.noise(0, 0.035, 'bp', base.mid * 0.75, 1.0, 0.5, { att: 0.002 });
    b.modes(0, [[base.lo * 1.3, 0.016, 1], [base.lo * 2.8, 0.008, 0.35]], base.ring * 1.3);
    b.noise(0, 0.003, 'bp', 1800, 1.4, 0.18);
  };
  SND_MAT.wood = {
    step: [0.14, 0.42, (b, v, r) => stepWood(b, r, BOARD)],
    dig: [0.2, 0.85, (b, v, r) => chop(b, r, BOARD)],
    break: [0.36, 1, (b, v, r) => breakWood(b, r, BOARD)],
    place: [0.18, 0.8, (b, v, r) => placeWood(b, r, BOARD)],
  };
  SND_MAT.log = {
    step: [0.14, 0.42, (b, v, r) => stepWood(b, r, with_(LOG, { ring: 0.25 }))],
    dig: [0.2, 0.9, (b, v, r) => chop(b, r, LOG)],
    break: [0.38, 1, (b, v, r) => breakWood(b, r, LOG)],
    place: [0.18, 0.85, (b, v, r) => placeWood(b, r, LOG)],
  };
  SND_MAT.ladder.dig = SND_MAT.wood.dig; SND_MAT.ladder.break = SND_MAT.wood.break; SND_MAT.ladder.place = SND_MAT.wood.place;

  // a resource pack's wood sounds serve logs too
  const baseMat = Sfx.prototype.material;
  Sfx.prototype.material = function (mat, kind) {
    if (mat === 'log' && SND.packs.get('wood.' + kind) && !SND.packs.get('log.' + kind)) mat = 'wood';
    return baseMat.call(this, mat, kind);
  };

  // which blocks are which
  const WOODY = /oak|spruce|birch|jungle|acacia|mangrove|cherry|crimson|warped|bamboo|pale_oak/;
  for (const b of BLOCKS) {
    if (!b || !b.key) continue;
    const k = b.key;
    if (b.sound === 'wood' && /_log$|_wood$|^log|_stem$|hyphae|stripped_/.test(k) && !/planks/.test(k)) b.sound = 'log';
    else if (b.furniture || /chair|stool|bench|shelf|bookcase|cabinet|campfire|beehive|bee_nest|torch$|_button$|pressure_plate/.test(k) && (WOODY.test(k) || /campfire|beehive|bee_nest|torch$/.test(k))) { if (b.sound === 'stone' || !b.sound) b.sound = 'wood'; }
    if (/^pumpkin$|carved_pumpkin|jack_o_lantern|^melon$|mushroom_block|mushroom_stem/.test(k) && b.sound === 'stone') b.sound = 'wood';
    if (/^glowstone$|sea_lantern/.test(k) && b.sound === 'stone') b.sound = 'glass';
    if (k === 'cactus' || (/^cake|sponge/.test(k) && b.sound === 'stone')) b.sound = 'wool';
    if (/^moss_block$|^tnt$|^target$|dried_kelp_block|nether_wart_block|warped_wart_block/.test(k) && b.sound === 'stone') b.sound = 'grass';
  }
}
