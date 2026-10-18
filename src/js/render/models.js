// ---------------------------------------------------------------------------
// render/models.js — box-built creature models and 3D item meshes
// (blocks become little cubes, flat items are extruded pixel by pixel).
// Model space: +y up, front faces -z, units in blocks.
// ---------------------------------------------------------------------------

// Box geometry (faces [+x,-x,+y,-y,+z,-z]) with one tile per face.
function addBox(mb, min, max, tiles, shadeMul = 1) {
  for (let f = 0; f < 6; f++) {
    const F = FACES[f];
    if (tiles[f] < 0) continue;            // a face left open (a hood around a face)
    const uv = tileUV(tiles[f]);
    const vs = [];
    for (let k = 0; k < 4; k++) {
      const c = F.c[k], t = FACE_UV[k];
      vs.push(mb.vert(c[0] ? max[0] : min[0], c[1] ? max[1] : min[1], c[2] ? max[2] : min[2],
        t[0] ? uv[2] : uv[0], t[1] ? uv[3] : uv[1], 255, 0, Math.round(Math.min(1, F.shade * shadeMul + 0.08) * 255)));
    }
    mb.quad(vs[0], vs[1], vs[2], vs[3], false);
  }
}
function tilesOf(spec) {
  const T = (n) => ATLAS.tile[n] ?? 0;
  if (typeof spec === 'string') { const t = T(spec); return [t, t, t, t, t, t]; }
  if (Array.isArray(spec)) return spec.map(n => n == null || n === false ? -1 : T(n));     // one per face [+x, -x, +y, -y, +z, -z]
  const side = T(spec.side || spec.all), top = spec.top ? T(spec.top) : side, bot = spec.bottom ? T(spec.bottom) : side;
  const front = spec.front === false ? -1 : spec.front ? T(spec.front) : side, back = spec.back ? T(spec.back) : side;
  return [side, side, top, bot, back, front];
}

// ---- creature definitions --------------------------------------------------
// Each part: box relative to its pivot; animation rotates parts around pivots.
const MODEL_DEFS = {
  boar: {
    scale: 1,
    parts: [
      { name: 'body', pivot: [0, 0.75, 0], min: [-0.32, -0.32, -0.45], max: [0.32, 0.22, 0.5], tex: 'boar_hide' },
      { name: 'head', pivot: [0, 0.78, -0.45], min: [-0.26, -0.26, -0.42], max: [0.26, 0.2, 0.02], tex: { all: 'boar_hide', front: 'boar_face' } },
      { name: 'legFL', pivot: [-0.2, 0.43, -0.3], min: [-0.09, -0.43, -0.09], max: [0.09, 0, 0.09], tex: 'boar_hide', swing: 1 },
      { name: 'legFR', pivot: [0.2, 0.43, -0.3], min: [-0.09, -0.43, -0.09], max: [0.09, 0, 0.09], tex: 'boar_hide', swing: -1 },
      { name: 'legBL', pivot: [-0.2, 0.43, 0.35], min: [-0.09, -0.43, -0.09], max: [0.09, 0, 0.09], tex: 'boar_hide', swing: -1 },
      { name: 'legBR', pivot: [0.2, 0.43, 0.35], min: [-0.09, -0.43, -0.09], max: [0.09, 0, 0.09], tex: 'boar_hide', swing: 1 },
    ],
  },
  ghoul: {
    scale: 1,
    parts: [
      { name: 'legL', pivot: [-0.13, 0.75, 0], min: [-0.12, -0.75, -0.12], max: [0.12, 0, 0.12], tex: 'ghoul_cloth', swing: 1 },
      { name: 'legR', pivot: [0.13, 0.75, 0], min: [-0.12, -0.75, -0.12], max: [0.12, 0, 0.12], tex: 'ghoul_cloth', swing: -1 },
      { name: 'body', pivot: [0, 0.75, 0], min: [-0.25, 0, -0.14], max: [0.25, 0.75, 0.14], tex: 'ghoul_cloth' },
      { name: 'armL', pivot: [-0.37, 1.4, 0], min: [-0.11, -0.7, -0.11], max: [0.11, 0.05, 0.11], tex: 'ghoul_skin', reach: 1, swing: -0.4 },
      { name: 'armR', pivot: [0.37, 1.4, 0], min: [-0.11, -0.7, -0.11], max: [0.11, 0.05, 0.11], tex: 'ghoul_skin', reach: 1, swing: 0.4 },
      { name: 'head', pivot: [0, 1.5, 0], min: [-0.25, 0, -0.25], max: [0.25, 0.5, 0.25], tex: { all: 'ghoul_skin', front: 'ghoul_face' }, look: 1 },
    ],
  },
  cinder_golem: {
    scale: 1,
    parts: [
      { name: 'legL', pivot: [-0.42, 1.1, 0], min: [-0.3, -1.1, -0.3], max: [0.3, 0, 0.3], tex: 'golem_rock', swing: 0.6 },
      { name: 'legR', pivot: [0.42, 1.1, 0], min: [-0.3, -1.1, -0.3], max: [0.3, 0, 0.3], tex: 'golem_rock', swing: -0.6 },
      { name: 'body', pivot: [0, 1.1, 0], min: [-0.8, 0, -0.45], max: [0.8, 1.3, 0.45], tex: { all: 'golem_rock', front: 'golem_core' } },
      { name: 'armL', pivot: [-1.05, 2.25, 0], min: [-0.26, -1.5, -0.26], max: [0.26, 0.1, 0.26], tex: 'golem_rock', swing: -0.5, slam: 1 },
      { name: 'armR', pivot: [1.05, 2.25, 0], min: [-0.26, -1.5, -0.26], max: [0.26, 0.1, 0.26], tex: 'golem_rock', swing: 0.5, slam: 1 },
      { name: 'head', pivot: [0, 2.4, -0.1], min: [-0.4, 0, -0.4], max: [0.4, 0.75, 0.4], tex: { all: 'golem_rock', front: 'golem_face' }, look: 1 },
    ],
  },
  deer: {
    parts: [
      { name: 'body', pivot: [0, 0.98, 0], min: [-0.22, -0.22, -0.52], max: [0.22, 0.2, 0.5], tex: 'deer_hide' },
      { name: 'neck', pivot: [0, 1.08, -0.42], min: [-0.09, -0.05, -0.12], max: [0.09, 0.42, 0.08], tex: 'deer_hide', look: 0.5 },
      { name: 'head', pivot: [0, 1.48, -0.5], min: [-0.13, -0.1, -0.34], max: [0.13, 0.16, 0.04], tex: { all: 'deer_hide', front: 'deer_face' }, look: 1 },
      { name: 'earL', pivot: [-0.13, 1.6, -0.48], min: [-0.12, -0.03, -0.02], max: [0, 0.05, 0.03], tex: 'deer_hide', look: 1 },
      { name: 'earR', pivot: [0.13, 1.6, -0.48], min: [0, -0.03, -0.02], max: [0.12, 0.05, 0.03], tex: 'deer_hide', look: 1 },
      { name: 'antL', pivot: [-0.07, 1.64, -0.52], min: [-0.03, 0, -0.03], max: [0.03, 0.34, 0.03], tex: 'antler', look: 1, antler: 1 },
      { name: 'antR', pivot: [0.07, 1.64, -0.52], min: [-0.03, 0, -0.03], max: [0.03, 0.34, 0.03], tex: 'antler', look: 1, antler: 1 },
      { name: 'antL2', pivot: [-0.07, 1.82, -0.52], min: [-0.2, 0, -0.025], max: [0, 0.05, 0.025], tex: 'antler', look: 1, antler: 1 },
      { name: 'antR2', pivot: [0.07, 1.82, -0.52], min: [0, 0, -0.025], max: [0.2, 0.05, 0.025], tex: 'antler', look: 1, antler: 1 },
      { name: 'tail', pivot: [0, 1.1, 0.5], min: [-0.05, -0.12, 0], max: [0.05, 0.04, 0.08], tex: 'white' },
      { name: 'legFL', pivot: [-0.14, 0.78, -0.4], min: [-0.055, -0.78, -0.055], max: [0.055, 0, 0.055], tex: 'deer_hide', swing: 1 },
      { name: 'legFR', pivot: [0.14, 0.78, -0.4], min: [-0.055, -0.78, -0.055], max: [0.055, 0, 0.055], tex: 'deer_hide', swing: -1 },
      { name: 'legBL', pivot: [-0.14, 0.78, 0.38], min: [-0.055, -0.78, -0.055], max: [0.055, 0, 0.055], tex: 'deer_hide', swing: -1 },
      { name: 'legBR', pivot: [0.14, 0.78, 0.38], min: [-0.055, -0.78, -0.055], max: [0.055, 0, 0.055], tex: 'deer_hide', swing: 1 },
    ],
  },
  rabbit: {
    parts: [
      { name: 'body', pivot: [0, 0.2, 0], min: [-0.12, -0.11, -0.18], max: [0.12, 0.12, 0.18], tex: 'rabbit_fur' },
      { name: 'head', pivot: [0, 0.3, -0.17], min: [-0.1, -0.07, -0.16], max: [0.1, 0.1, 0.02], tex: { all: 'rabbit_fur', front: 'rabbit_face' }, look: 1 },
      { name: 'earL', pivot: [-0.05, 0.4, -0.22], min: [-0.025, 0, -0.02], max: [0.025, 0.2, 0.02], tex: 'rabbit_fur', look: 1 },
      { name: 'earR', pivot: [0.05, 0.4, -0.22], min: [-0.025, 0, -0.02], max: [0.025, 0.2, 0.02], tex: 'rabbit_fur', look: 1 },
      { name: 'tail', pivot: [0, 0.24, 0.18], min: [-0.05, -0.05, 0], max: [0.05, 0.05, 0.07], tex: 'white' },
      { name: 'legBL', pivot: [-0.09, 0.1, 0.1], min: [-0.04, -0.1, -0.09], max: [0.04, 0, 0.05], tex: 'rabbit_fur', hop: 1 },
      { name: 'legBR', pivot: [0.09, 0.1, 0.1], min: [-0.04, -0.1, -0.09], max: [0.04, 0, 0.05], tex: 'rabbit_fur', hop: 1 },
      { name: 'legFL', pivot: [-0.07, 0.1, -0.13], min: [-0.03, -0.1, -0.03], max: [0.03, 0, 0.03], tex: 'rabbit_fur', hop: -1 },
      { name: 'legFR', pivot: [0.07, 0.1, -0.13], min: [-0.03, -0.1, -0.03], max: [0.03, 0, 0.03], tex: 'rabbit_fur', hop: -1 },
    ],
  },
  cow: {
    parts: [
      { name: 'body', pivot: [0, 1.0, 0], min: [-0.3, -0.35, -0.5], max: [0.3, 0.25, 0.5], tex: 'cow_hide' },
      { name: 'head', pivot: [0, 1.12, -0.5], min: [-0.22, -0.22, -0.34], max: [0.22, 0.22, 0.02], tex: { all: 'cow_hide', front: 'cow_face' }, look: 1 },
      { name: 'hornL', pivot: [-0.22, 1.3, -0.62], min: [-0.1, 0, -0.03], max: [0, 0.06, 0.03], tex: 'cow_horn', look: 1 },
      { name: 'hornR', pivot: [0.22, 1.3, -0.62], min: [0, 0, -0.03], max: [0.1, 0.06, 0.03], tex: 'cow_horn', look: 1 },
      { name: 'legFL', pivot: [-0.18, 0.65, -0.35], min: [-0.1, -0.65, -0.1], max: [0.1, 0, 0.1], tex: 'cow_hide', swing: 1 },
      { name: 'legFR', pivot: [0.18, 0.65, -0.35], min: [-0.1, -0.65, -0.1], max: [0.1, 0, 0.1], tex: 'cow_hide', swing: -1 },
      { name: 'legBL', pivot: [-0.18, 0.65, 0.35], min: [-0.1, -0.65, -0.1], max: [0.1, 0, 0.1], tex: 'cow_hide', swing: -1 },
      { name: 'legBR', pivot: [0.18, 0.65, 0.35], min: [-0.1, -0.65, -0.1], max: [0.1, 0, 0.1], tex: 'cow_hide', swing: 1 },
    ],
  },
  pig: {
    parts: [
      { name: 'body', pivot: [0, 0.62, 0], min: [-0.3, -0.25, -0.45], max: [0.3, 0.25, 0.45], tex: 'pig_skin' },
      { name: 'head', pivot: [0, 0.72, -0.42], min: [-0.24, -0.24, -0.4], max: [0.24, 0.24, 0.02], tex: { all: 'pig_skin', front: 'pig_face' }, look: 1 },
      { name: 'snout', pivot: [0, 0.72, -0.42], min: [-0.1, -0.12, -0.46], max: [0.1, 0.02, -0.4], tex: { all: 'pig_skin', front: 'pig_face' }, look: 1 },
      { name: 'legFL', pivot: [-0.18, 0.37, -0.3], min: [-0.09, -0.37, -0.09], max: [0.09, 0, 0.09], tex: 'pig_skin', swing: 1 },
      { name: 'legFR', pivot: [0.18, 0.37, -0.3], min: [-0.09, -0.37, -0.09], max: [0.09, 0, 0.09], tex: 'pig_skin', swing: -1 },
      { name: 'legBL', pivot: [-0.18, 0.37, 0.3], min: [-0.09, -0.37, -0.09], max: [0.09, 0, 0.09], tex: 'pig_skin', swing: -1 },
      { name: 'legBR', pivot: [0.18, 0.37, 0.3], min: [-0.09, -0.37, -0.09], max: [0.09, 0, 0.09], tex: 'pig_skin', swing: 1 },
    ],
  },
  sheep: {
    parts: [
      { name: 'wool', pivot: [0, 0.95, 0], min: [-0.3, -0.28, -0.48], max: [0.3, 0.3, 0.48], tex: 'sheep_wool', wool: 1 },
      { name: 'skin', pivot: [0, 0.95, 0], min: [-0.22, -0.22, -0.42], max: [0.22, 0.22, 0.42], tex: 'sheep_skin', skin: 1 },
      { name: 'head', pivot: [0, 1.12, -0.46], min: [-0.15, -0.18, -0.34], max: [0.15, 0.17, 0.02], tex: { all: 'sheep_skin', front: 'sheep_face' }, look: 1 },
      { name: 'cap', pivot: [0, 1.12, -0.46], min: [-0.18, 0.02, -0.28], max: [0.18, 0.21, 0.04], tex: 'sheep_wool', look: 1, wool: 1 },
      { name: 'legFL', pivot: [-0.16, 0.66, -0.32], min: [-0.08, -0.66, -0.08], max: [0.08, 0, 0.08], tex: 'sheep_skin', swing: 1 },
      { name: 'legFR', pivot: [0.16, 0.66, -0.32], min: [-0.08, -0.66, -0.08], max: [0.08, 0, 0.08], tex: 'sheep_skin', swing: -1 },
      { name: 'legBL', pivot: [-0.16, 0.66, 0.32], min: [-0.08, -0.66, -0.08], max: [0.08, 0, 0.08], tex: 'sheep_skin', swing: -1 },
      { name: 'legBR', pivot: [0.16, 0.66, 0.32], min: [-0.08, -0.66, -0.08], max: [0.08, 0, 0.08], tex: 'sheep_skin', swing: 1 },
    ],
  },
  chicken: {
    parts: [
      { name: 'body', pivot: [0, 0.42, 0], min: [-0.15, -0.14, -0.2], max: [0.15, 0.14, 0.2], tex: 'chicken_feather' },
      { name: 'head', pivot: [0, 0.5, -0.17], min: [-0.1, 0, -0.1], max: [0.1, 0.28, 0.05], tex: { all: 'chicken_feather', front: 'chicken_face' }, look: 1 },
      { name: 'beak', pivot: [0, 0.5, -0.17], min: [-0.06, 0.12, -0.16], max: [0.06, 0.19, -0.1], tex: 'chicken_beak', look: 1 },
      { name: 'wingL', pivot: [-0.15, 0.52, 0], min: [-0.03, -0.18, -0.15], max: [0, 0, 0.15], tex: 'chicken_feather', flap: -1 },
      { name: 'wingR', pivot: [0.15, 0.52, 0], min: [0, -0.18, -0.15], max: [0.03, 0, 0.15], tex: 'chicken_feather', flap: 1 },
      { name: 'legL', pivot: [-0.06, 0.28, 0.02], min: [-0.02, -0.28, -0.02], max: [0.02, 0, 0.02], tex: 'chicken_legs', swing: 1 },
      { name: 'legR', pivot: [0.06, 0.28, 0.02], min: [-0.02, -0.28, -0.02], max: [0.02, 0, 0.02], tex: 'chicken_legs', swing: -1 },
    ],
  },
  // The watcher. Never attacks, never touches anything.
  herobrine: {
    scale: 1,
    parts: [
      { name: 'legL', pivot: [-0.125, 0.75, 0], min: [-0.125, -0.75, -0.125], max: [0.125, 0, 0.125], tex: 'hb_pants', swing: 1 },
      { name: 'legR', pivot: [0.125, 0.75, 0], min: [-0.125, -0.75, -0.125], max: [0.125, 0, 0.125], tex: 'hb_pants', swing: -1 },
      { name: 'body', pivot: [0, 0.75, 0], min: [-0.25, 0, -0.125], max: [0.25, 0.75, 0.125], tex: 'hb_shirt' },
      { name: 'armL', pivot: [-0.375, 1.5, 0], min: [-0.125, -0.75, -0.125], max: [0.125, 0, 0.125], tex: 'hb_arm', swing: -1 },
      { name: 'armR', pivot: [0.375, 1.5, 0], min: [-0.125, -0.75, -0.125], max: [0.125, 0, 0.125], tex: 'hb_arm', swing: 1 },
      { name: 'head', pivot: [0, 1.5, 0], min: [-0.25, 0, -0.25], max: [0.25, 0.5, 0.25], tex: { all: 'hb_head_side', front: 'hb_face', top: 'hb_hair', back: 'hb_hair' }, look: 1 },
      { name: 'eyes', pivot: [0, 1.5, 0], min: [-0.19, 0.25, -0.256], max: [0.19, 0.3125, -0.251], tex: 'white', look: 1, unlit: true, eyes: true },
    ],
  },
  player_arm: {
    scale: 1,
    parts: [
      { name: 'sleeve', pivot: [0, 0, 0], min: [-0.125, 0.0, -0.125], max: [0.125, 0.42, 0.125], tex: 'sleeve' },
      { name: 'hand', pivot: [0, 0, 0], min: [-0.12, -0.33, -0.12], max: [0.12, 0.0, 0.12], tex: 'skin' },
    ],
  },
};

const MODELS = {}; // built lazily per GL context
function buildModels(gl) {
  for (const [key, def] of Object.entries(MODEL_DEFS)) {
    const parts = def.parts.map(p => {
      const mb = new MeshBuilder(64);
      if (p.eyes) {
        // two pupil-less eyes, slightly proud of the face so they read in the dark
        const t = tilesOf(p.tex);
        addBox(mb, [-0.19, p.min[1], p.min[2]], [-0.065, p.max[1], p.max[2]], t);
        addBox(mb, [0.065, p.min[1], p.min[2]], [0.19, p.max[1], p.max[2]], t);
      } else addBox(mb, p.min, p.max, tilesOf(p.tex));
      let r = mb.result();
      if (!r) { addBox(mb, [0, 0, 0], [0.001, 0.001, 0.001], tilesOf('white')); r = mb.result(); }   // nothing to draw: a speck, so it still has a mesh
      return Object.assign({}, p, { mesh: makeVAO(gl, r.verts, r.idx) });
    });
    MODELS[key] = { def, parts };
  }
}

// ---- item meshes -----------------------------------------------------------
const ITEM_MESHES = {};
function itemMesh(gl, key) {
  if (ITEM_MESHES[key]) return ITEM_MESHES[key];
  const def = itemDef(key);
  const mb = new MeshBuilder(256);
  let kind = 'flat';
  if (def && def.block) {
    const b = BLOCKS[B[def.block]];
    const flat = !def.icon.startsWith('block:');
    if (!flat && (b.render === RENDER.CUBE || b.render === RENDER.CUTOUT)) {
      kind = 'block';
      addBox(mb, [-0.5, -0.5, -0.5], [0.5, 0.5, 0.5], BLOCK_FACES[b.id]);
    } else if (!flat && b.render === RENDER.MODEL && SHAPES[b.shape]) {
      kind = 'block'; // small shaped blocks are drawn a little larger so they read like a held block
      for (const box of SHAPES[b.shape]) addShapeBox(mb, box, -0.8, -0.6, -0.8, 1.6 / 16, 255, 0);
    } else if (!flat && b.render === RENDER.SHAPE) {
      kind = 'block';
      for (const bx of shapeItemBoxes(b.id)) addPxBox(mb, bx, BLOCK_FACES[b.id], -0.5, -0.5, -0.5, 1 / 16);
    } else extrudeTile(mb, ATLAS.tile[def.icon] ?? BLOCK_FACES[b.id][0]);
  } else if (def) {
    extrudeTile(mb, ATLAS.tile[def.icon] ?? 0);
  }
  const r = mb.result();
  ITEM_MESHES[key] = { mesh: makeVAO(gl, r.verts, r.idx), kind };
  return ITEM_MESHES[key];
}
// How a shaped block looks in the hand and in the inventory: stairs facing
// away, slabs on the bottom, fences and walls with arms out to both sides.
function shapeItemBoxes(id) {
  const k = T_SHAPE[id];
  const arms = k === SHAPE.FENCE || k === SHAPE.WALL || k === SHAPE.PANE;
  const nb = (dx, dy, dz) => (arms && dy === 0 && dz === 0 && dx !== 0) ? id : 0;
  const nm = () => 0;
  return shapeBoxes(id, 0, nb, nm, 0) || [[0, 0, 0, 16, 16, 16]];
}
// A box given in 1/16 pixels; each face samples the part of its tile it covers.
function addPxBox(mb, b, faces, ox, oy, oz, unit) {
  const side = b[6] !== undefined ? ATLAS.tile[b[6]] ?? faces[0] : faces[0];
  const top = b[7] !== undefined ? ATLAS.tile[b[7]] ?? faces[2] : (b[6] !== undefined ? side : faces[2]);
  const bot = b[7] !== undefined ? top : (b[6] !== undefined ? side : faces[3]);
  for (let f = 0; f < 6; f++) {
    if (b.only && b.only.indexOf(f) < 0) continue;
    const F = FACES[f];
    const tile = b.faces ? (ATLAS.tile[b.faces[f]] ?? side) : f === 2 ? top : f === 3 ? bot : f === 4 && b[6] === undefined ? faces[4] : side;
    const uv = tileUV(tile), du = (uv[2] - uv[0]) / 16, dv = (uv[3] - uv[1]) / 16;
    const vs = [];
    for (let q = 0; q < 4; q++) {
      const c = F.c[q];
      const X = c[0] ? b[3] : b[0], Y = c[1] ? b[4] : b[1], Z = c[2] ? b[5] : b[2];
      const [S, T] = SHAPE_ST[f](X, Y, Z);
      vs.push(mb.vert(ox + X * unit, oy + Y * unit, oz + Z * unit, uv[0] + clamp(S, 0, 16) * du, uv[1] + clamp(T, 0, 16) * dv, 255, 0, Math.round(Math.min(1, F.shade + 0.08) * 255)));
    }
    mb.quad(vs[0], vs[1], vs[2], vs[3], false);
  }
}

// ---- inventory icons for blocks, rendered in 3D ----------------------------------
// Every block item is drawn once at start-up with the real block geometry
// (so stairs look like stairs and fences like fences) from the classic
// three-quarter view, and written into the icon sheet.
function renderBlockIcons(renderer) {
  const gl = renderer.gl, P = renderer.prog.model;
  const keys = Object.keys(ITEMS).filter(k => ITEMS[k].icon.startsWith('block:'));
  if (!keys.length || !ICONS.canvas) return;
  const S = ICONS.size, cols = 32, rows = Math.ceil(keys.length / cols);
  const W = cols * S, H = rows * S;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const depth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, W, H);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  gl.viewport(0, 0, W, H);
  gl.disable(gl.SCISSOR_TEST);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.disable(gl.BLEND);
  gl.useProgram(P.p);
  const E = 0.84, proj = new Float32Array([1 / E, 0, 0, 0, 0, 1 / E, 0, 0, 0, 0, -0.2, 0, 0, 0, 0, 1]);
  gl.uniformMatrix4fv(P.u.uProj, false, proj);
  gl.uniformMatrix4fv(P.u.uView, false, Mat4.create());
  gl.uniform1i(P.u.uTex, 0); gl.uniform1f(P.u.uDay, 1); gl.uniform3f(P.u.uFog, 0, 0, 0); gl.uniform2f(P.u.uFogRange, 1000, 2000);
  gl.uniform1f(P.u.uMinLight, 0); gl.uniform2f(P.u.uLight, 1, 0); gl.uniform4f(P.u.uTint, 0, 0, 0, 0); gl.uniform1f(P.u.uUnlit, 0); gl.uniform1f(P.u.uAlpha, 1);
  if (P.u.uDynN) gl.uniform1i(P.u.uDynN, 0);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, renderer.tex);
  gl.enable(gl.SCISSOR_TEST);
  keys.forEach((key, i) => {
    const cx = i % cols, cy = Math.floor(i / cols);
    gl.viewport(cx * S, cy * S, S, S); gl.scissor(cx * S, cy * S, S, S);
    const im = itemMesh(gl, key);
    const m = Mat4.create();
    Mat4.translate(m, 0, -0.02, 0);
    Mat4.rotateX(m, Math.PI / 6); Mat4.rotateY(m, Math.PI / 4);
    const b = BLOCKS[B[ITEMS[key].block]];
    const sc = b.render === RENDER.MODEL ? 0.95 : 1;
    Mat4.scale(m, sc, sc, sc);
    gl.uniformMatrix4fv(P.u.uModel, false, m);
    gl.bindVertexArray(im.mesh.vao); gl.drawElements(gl.TRIANGLES, im.mesh.count, gl.UNSIGNED_INT, 0);
  });
  gl.disable(gl.SCISSOR_TEST);
  const px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fb); gl.deleteRenderbuffer(depth); gl.deleteTexture(tex);
  gl.bindVertexArray(null);
  // rows come back bottom-up: flip into a canvas, then copy each icon into the sheet
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  const tg = tmp.getContext('2d', { willReadFrequently: true }), img = tg.createImageData(W, H);
  for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  tg.putImageData(img, 0, 0);
  const g = ICONS.canvas.getContext('2d');
  keys.forEach((key, i) => {
    const cx = i % cols, cy = Math.floor(i / cols), j = ICONS.index[key];
    const ox = (j % ICONS.cols) * S, oy = Math.floor(j / ICONS.cols) * S;
    g.clearRect(ox, oy, S, S);
    g.drawImage(tmp, cx * S, H - (cy + 1) * S, S, S, ox, oy, S, S);
  });
  ICONS.dirty = true;
}

// Flat sprite with 1/16-thick pixel edges, centred on the origin (x,y in -0.5..0.5).
function extrudeTile(mb, tile) {
  const uv = tileUV(tile);
  const tx = (tile % ATLAS_TILES) * TILE, ty = Math.floor(tile / ATLAS_TILES) * TILE;
  const P = ATLAS.pixels.data, W = ATLAS_SIZE, R = ATLAS.res[tile] || 16, st = TILE / R;   // pixels across the painting
  const A = (i, j) => (i < 0 || j < 0 || i >= R || j >= R) ? 0 : P[((ty + j * st) * W + tx + i * st) * 4 + 3];
  const d = 1 / 32, du = (uv[2] - uv[0]) / R, dv = (uv[3] - uv[1]) / R;
  // front (+z) and back (-z)
  const f = (a, b, c, e, sh) => { const vs = [a, b, c, e].map(p => mb.vert(p[0], p[1], p[2], p[3], p[4], 255, 0, sh)); mb.quad(vs[0], vs[1], vs[2], vs[3], false); };
  f([-0.5, -0.5, d, uv[0], uv[3]], [0.5, -0.5, d, uv[2], uv[3]], [0.5, 0.5, d, uv[2], uv[1]], [-0.5, 0.5, d, uv[0], uv[1]], 255);
  f([0.5, -0.5, -d, uv[2], uv[3]], [-0.5, -0.5, -d, uv[0], uv[3]], [-0.5, 0.5, -d, uv[0], uv[1]], [0.5, 0.5, -d, uv[2], uv[1]], 200);
  for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
    if (A(i, j) < 128) continue;
    const x0 = -0.5 + i / R, x1 = x0 + 1 / R, y1 = 0.5 - j / R, y0 = y1 - 1 / R;
    const u = uv[0] + (i + 0.5) * du, v = uv[1] + (j + 0.5) * dv;
    if (A(i - 1, j) < 128) f([x0, y0, -d, u, v], [x0, y0, d, u, v], [x0, y1, d, u, v], [x0, y1, -d, u, v], 180);
    if (A(i + 1, j) < 128) f([x1, y0, d, u, v], [x1, y0, -d, u, v], [x1, y1, -d, u, v], [x1, y1, d, u, v], 180);
    if (A(i, j - 1) < 128) f([x0, y1, d, u, v], [x1, y1, d, u, v], [x1, y1, -d, u, v], [x0, y1, -d, u, v], 235);
    if (A(i, j + 1) < 128) f([x1, y0, d, u, v], [x0, y0, d, u, v], [x0, y0, -d, u, v], [x1, y0, -d, u, v], 140);
  }
}
