// ---------------------------------------------------------------------------
// render/rigdefs.js — the creatures' bodies, in skin pixels, with the
// proportions of the classic models (a ghoul is 32 px tall like a zombie,
// skeletons have 2 px limbs, a cow is 12 wide, 10 deep and 18 long...).
// Each replaces the older single-piece model of the same name.
// ---------------------------------------------------------------------------

Object.assign(MODEL_DEFS, {
  ghoul: bipedRig({
    head: [8, 8, 8], body: [8, 12, 4], arm: [4, 12, 4], leg: [4, 12, 4], armsReach: true,
    tex: { head: { all: 'ghoul_skin', front: 'ghoul_face' }, body: 'ghoul_cloth', arm: 'ghoul_skin', leg: 'ghoul_cloth', shin: 'ghoul_shoe' },
  }),
  skeleton: bipedRig({
    head: [8, 8, 8], body: [8, 12, 4], arm: [2, 12, 2], leg: [2, 12, 2], legX: 2, armX: 5, bodyNoCull: true,
    tex: { head: { all: 'skel_head', front: 'skel_face' }, body: { all: 'skel_ribs', top: 'skel_bone', bottom: 'skel_bone' }, arm: 'skel_bone', leg: 'skel_bone' },
    extras: [['spine', 'body', [0, 0, 0.6], [-0.5, 0, -0.5, 0.5, 12, 0.5], 'skel_bone']],
  }),
  spider: spiderRig({ tex: { body: 'spider_fur', back: 'spider_back', head: { all: 'spider_fur', front: 'spider_face' }, leg: 'spider_fur' } }),
  fuseling: finishRig('pod', [
    rpart('body', null, [0, 4.5, 0], [-5, 0, -4.5, 5, 11, 4.5], 'fuse_moss', { role: 'pbody' }),
    rpart('head', 'body', [0, 11, 0], [-4, 0, -4, 4, 6.5, 4], { all: 'fuse_moss', front: 'fuse_face', top: 'fuse_cap' }, { role: 'phead', limb: 'head' }),
    rpart('crown', 'head', [0, 6.5, 0], [-5, 0, -5, 5, 1, 5], 'fuse_cap', { role: 'crown' }),
    rpart('legFL', null, [-3, 4.5, -3], [-1.6, -4.5, -1.6, 1.6, 0, 1.6], 'fuse_cap', { role: 'qleg', front: true, side: -1, limb: 'legFL' }),
    rpart('legFR', null, [3, 4.5, -3], [-1.6, -4.5, -1.6, 1.6, 0, 1.6], 'fuse_cap', { role: 'qleg', front: true, side: 1, limb: 'legFR' }),
    rpart('legBL', null, [-3, 4.5, 3], [-1.6, -4.5, -1.6, 1.6, 0, 1.6], 'fuse_cap', { role: 'qleg', front: false, side: -1, limb: 'legBL' }),
    rpart('legBR', null, [3, 4.5, 3], [-1.6, -4.5, -1.6, 1.6, 0, 1.6], 'fuse_cap', { role: 'qleg', front: false, side: 1, limb: 'legBR' }),
  ]),
  slime: finishRig('slime', [
    // a see-through jelly with a solid little core inside, which has the face
    rpart('cube', null, [0, 0, 0], [-8, 0, -8, 8, 16, 8], 'slime_skin', { role: 'cube', alpha: 0.62, noCull: true }),
    rpart('core', 'cube', [0, 0, 0], [-5, 3, -5, 5, 13, 5], { all: 'slime_core', front: 'slime_face' }, {}),
  ]),
  cow: quadRig({
    body: [12, 10, 18], leg: [4, 12], head: [8, 8, 6], headAt: [3, 0], tail: [1, 9, 1],
    tex: { body: 'cow_hide', head: { all: 'cow_hide', front: 'cow_face' }, leg: 'cow_hide', shin: 'cow_hoof' },
    extras: [
      ['hornL', 'head', [-4.5, 3, -4], [-0.5, 0, -0.5, 0.5, 3, 0.5], 'cow_horn'],
      ['hornR', 'head', [4.5, 3, -4], [-0.5, 0, -0.5, 0.5, 3, 0.5], 'cow_horn'],
      ['udder', 'body', [0, -5, 4], [-2, -1.5, -3, 2, 0, 3], 'pig_skin'],
    ],
  }),
  pig: quadRig({
    body: [10, 8, 16], leg: [4, 6], head: [8, 8, 8], headAt: [1, 0], tail: [1, 2, 1],
    tex: { body: 'pig_skin', head: { all: 'pig_skin', front: 'pig_face' }, leg: 'pig_skin' },
    extras: [['snout', 'head', [0, -1.5, -8], [-2, -1.5, -1, 2, 1.5, 0], 'pig_snout']],
  }),
  sheep: quadRig({
    body: [8, 6, 16], leg: [4, 12], head: [6, 6, 8], headAt: [3, 0], tail: [2, 3, 1],
    tex: { body: 'sheep_skin', head: { all: 'sheep_skin', front: 'sheep_face' }, leg: 'sheep_skin' },
    extras: [
      ['wool', 'body', [0, 0, 0], [-5.75, -4.75, -9.75, 5.75, 4.75, 9.75], 'sheep_wool', { wool: 1, role: 'wool' }],
      ['cap', 'head', [0, 0, 0], [-3.6, -1, -6.5, 3.6, 3.7, 0.4], 'sheep_wool', { wool: 1 }],
      ['legWoolFL', 'legFL', [0, 0, 0], [-2.6, -6, -2.6, 2.6, 0, 2.6], 'sheep_wool', { wool: 1 }],
      ['legWoolFR', 'legFR', [0, 0, 0], [-2.6, -6, -2.6, 2.6, 0, 2.6], 'sheep_wool', { wool: 1 }],
      ['legWoolBL', 'legBL', [0, 0, 0], [-2.6, -6, -2.6, 2.6, 0, 2.6], 'sheep_wool', { wool: 1 }],
      ['legWoolBR', 'legBR', [0, 0, 0], [-2.6, -6, -2.6, 2.6, 0, 2.6], 'sheep_wool', { wool: 1 }],
    ],
  }),
  chicken: birdRig({
    body: [6, 6, 8], head: [4, 6, 3], leg: [1, 5], wing: [1, 4, 6],
    tex: { body: 'chicken_feather', head: { all: 'chicken_feather', front: 'chicken_face' }, leg: 'chicken_legs', wing: 'chicken_feather' },
    extras: [
      ['beak', 'head', [0, 3, -3], [-2, 0, -2, 2, 2, 0], 'chicken_beak'],
      ['wattle', 'head', [0, 1, -3], [-1, 0, -1, 1, 2, 0], 'wattle'],
    ],
  }),
  boar: quadRig({
    body: [10, 9, 16], leg: [3, 7], head: [8, 7, 8], headAt: [1, 0], tail: [1, 5, 1], gallop: true,
    tex: { body: 'boar_hide', head: { all: 'boar_hide', front: 'boar_face' }, leg: 'boar_hide' },
    extras: [
      ['tuskL', 'head', [-3, -2.5, -8], [-0.5, 0, -1, 0.5, 2.5, 0], 'white'],
      ['tuskR', 'head', [3, -2.5, -8], [-0.5, 0, -1, 0.5, 2.5, 0], 'white'],
      ['mane', 'body', [0, 4.5, -1], [-1, 0, -7, 1, 2, 6], 'boar_mane'],
      ['earL', 'head', [-3, 3.5, -2], [-1.5, 0, -0.5, 0.5, 2, 0.5], 'boar_hide', { role: 'ear' }],
      ['earR', 'head', [3, 3.5, -2], [-0.5, 0, -0.5, 1.5, 2, 0.5], 'boar_hide', { role: 'ear' }],
    ],
  }),
  deer: quadRig({
    body: [7, 8, 16], leg: [2, 13], head: [5, 5, 7], neck: [3, 8, 3, 0.45], headAt: [2, 1], tail: [2, 3, 1], gallop: true,
    tex: { body: 'deer_hide', head: { all: 'deer_hide', front: 'deer_face' }, leg: 'deer_hide', tail: 'white' },
    extras: [
      ['earL', 'head', [-2.5, 2, -1.5], [-2.5, -0.5, -0.5, 0, 0.5, 0.5], 'deer_hide', { role: 'ear' }],
      ['earR', 'head', [2.5, 2, -1.5], [0, -0.5, -0.5, 2.5, 0.5, 0.5], 'deer_hide', { role: 'ear' }],
      ['antL', 'head', [-1.3, 2.5, -2], [-0.5, 0, -0.5, 0.5, 6, 0.5], 'antler', { antler: 1, rest: [0.15, 0, 0.25] }],
      ['antL2', 'antL', [0, 4, 0], [-3.5, 0, -0.4, 0, 0.8, 0.4], 'antler', { antler: 1 }],
      ['antL3', 'antL', [0, 6, 0], [-0.4, 0, -2.5, 0.4, 0.8, 0], 'antler', { antler: 1 }],
      ['antR', 'head', [1.3, 2.5, -2], [-0.5, 0, -0.5, 0.5, 6, 0.5], 'antler', { antler: 1, rest: [0.15, 0, -0.25] }],
      ['antR2', 'antR', [0, 4, 0], [0, 0, -0.4, 3.5, 0.8, 0.4], 'antler', { antler: 1 }],
      ['antR3', 'antR', [0, 6, 0], [-0.4, 0, -2.5, 0.4, 0.8, 0], 'antler', { antler: 1 }],
    ],
  }),
  rabbit: quadRig({
    body: [5, 5, 8], leg: [2, 3], head: [4, 4, 4], headAt: [2.5, 1], tail: [2, 2, 1],
    tex: { body: 'rabbit_fur', head: { all: 'rabbit_fur', front: 'rabbit_face' }, leg: 'rabbit_fur', tail: 'white' },
    extras: [
      ['earL', 'head', [-1, 2, -2], [-0.75, 0, -0.5, 0.75, 4, 0.5], 'rabbit_fur', { role: 'ear', rest: [0.2, 0, -0.1] }],
      ['earR', 'head', [1, 2, -2], [-0.75, 0, -0.5, 0.75, 4, 0.5], 'rabbit_fur', { role: 'ear', rest: [0.2, 0, 0.1] }],
    ],
  }),
  cinder_golem: bipedRig({
    head: [12, 12, 12], body: [26, 20, 14], arm: [8, 26, 8], leg: [9, 18, 9], armX: 17, legX: 6.5, heavy: true,
    tex: { head: { all: 'golem_rock', front: 'golem_face' }, body: { all: 'golem_rock', front: 'golem_core' }, arm: 'golem_rock', leg: 'golem_rock' },
  }),
});
