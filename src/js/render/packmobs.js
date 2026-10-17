// ---------------------------------------------------------------------------
// render/packmobs.js — a resource pack's creature skins on our creatures.
//
// Minecraft paints each mob as one picture laid out box by box: for a box of
// w×h×d texels at (u, v) the top sits at (u+d, v), the bottom beside it, and
// the right side, front, left side and back run along the row below. Our
// creatures are boxes too, so each face of each part takes its patch of the
// pack's picture (resampled to a tile). Arms and legs that bend in two are cut
// across the middle; bodies that Minecraft builds standing up and tips over
// (cows, pigs, sheep, wolves, chickens) are turned to match; overlay layers
// (a zombie's hat, a stray's rags) are laid over the base. Bits of ours that
// have no counterpart in the pack's mob are put away while the pack is on.
// ---------------------------------------------------------------------------

// [u, v, w, h, d] in texels of a picture `W` texels wide.
const PM = (u, v, w, h, d) => [u, v, w, h, d];
// A humanoid: head, body, arms and legs (left ones mirrored unless given).
function pmBiped(o) {
  const out = [['head', o.head, { over: o.hat }], ['body', o.body, { over: o.jacket }]];
  for (const S of ['R', 'L']) {
    const L = S === 'L', arm = L && o.armL ? o.armL : o.arm, leg = L && o.legL ? o.legL : o.leg, mir = L && !o.armL, mirL = L && !o.legL;
    const ao = L ? o.sleeveL || (o.armL ? null : o.sleeve) : o.sleeve, lo = L ? o.pantL || (o.legL ? null : o.pant) : o.pant;
    out.push(['arm' + S, arm, { upper: true, mirror: mir, over: ao }], ['fore' + S, arm, { lower: true, mirror: mir, over: ao }]);
    out.push(['leg' + S, leg, { upper: true, mirror: mirL, over: lo }], ['shin' + S, leg, { lower: true, mirror: mirL, over: lo }]);
  }
  return out;
}
// Four legs (each split at the knee when it's tall), a body lying along its length.
function pmQuad(o) {
  const out = [['head', o.head, { over: o.headOver }], ['body', o.body, { lying: true }]];
  for (const n of ['FR', 'FL', 'BR', 'BL']) { out.push(['leg' + n, o.leg, { upper: true, whole: true }], ['shin' + n, o.leg, { lower: true }]); }
  return out;
}

const PACK_MOBS = {
  // (0.9.0.10) the iron golem: Minecraft's picture is 128 texels wide
  iron_golem: {
    tex: ['entity/iron_golem/iron_golem', 'entity/iron_golem'], texW: 128, hide: ['brow', 'shoulders'],
    parts: [['head', PM(0, 0, 8, 10, 8)], ['nose', PM(24, 0, 2, 4, 2)], ['body', PM(0, 40, 18, 12, 11)], ['waist', PM(0, 70, 9, 5, 6)],
      ['armR', PM(60, 21, 4, 30, 6), { upper: true }], ['foreR', PM(60, 21, 4, 30, 6), { lower: true }], ['armL', PM(60, 58, 4, 30, 6), { upper: true }], ['foreL', PM(60, 58, 4, 30, 6), { lower: true }],
      ['legR', PM(37, 0, 6, 16, 5), { upper: true }], ['shinR', PM(37, 0, 6, 16, 5), { lower: true }], ['legL', PM(60, 0, 6, 16, 5), { upper: true, mirror: true }], ['shinL', PM(60, 0, 6, 16, 5), { lower: true, mirror: true }]],
  },
  ghoul: { tex: ['entity/zombie/zombie'], parts: pmBiped({ head: PM(0, 0, 8, 8, 8), hat: PM(32, 0, 8, 8, 8), body: PM(16, 16, 8, 12, 4), arm: PM(40, 16, 4, 12, 4), leg: PM(0, 16, 4, 12, 4) }) },
  husk: { tex: ['entity/zombie/husk'], parts: pmBiped({ head: PM(0, 0, 8, 8, 8), hat: PM(32, 0, 8, 8, 8), body: PM(16, 16, 8, 12, 4), arm: PM(40, 16, 4, 12, 4), leg: PM(0, 16, 4, 12, 4) }) },
  drowned: {
    tex: ['entity/zombie/drowned'], overlay: 'entity/zombie/drowned_outer_layer', hide: ['eyes'],
    parts: pmBiped({ head: PM(0, 0, 8, 8, 8), hat: PM(32, 0, 8, 8, 8), body: PM(16, 16, 8, 12, 4), arm: PM(40, 16, 4, 12, 4), armL: PM(32, 48, 4, 12, 4), leg: PM(0, 16, 4, 12, 4), legL: PM(16, 48, 4, 12, 4) }),
  },
  skeleton: { tex: ['entity/skeleton/skeleton'], hide: ['spine'], parts: pmBiped({ head: PM(0, 0, 8, 8, 8), body: PM(16, 16, 8, 12, 4), arm: PM(40, 16, 2, 12, 2), leg: PM(0, 16, 2, 12, 2) }) },
  stray: {
    tex: ['entity/skeleton/stray'], overlay: 'entity/skeleton/stray_overlay', hide: ['spine', 'cloak'],
    parts: pmBiped({ head: PM(0, 0, 8, 8, 8), body: PM(16, 16, 8, 12, 4), arm: PM(40, 16, 2, 12, 2), leg: PM(0, 16, 2, 12, 2) }),
  },
  raider: {
    tex: ['entity/illager/vindicator'], hide: ['hood'],
    parts: [['head', PM(0, 0, 8, 10, 8)], ['body', PM(16, 20, 8, 12, 6)],
      ['armR', PM(40, 46, 4, 12, 4), { upper: true }], ['foreR', PM(40, 46, 4, 12, 4), { lower: true }], ['armL', PM(40, 46, 4, 12, 4), { upper: true, mirror: true }], ['foreL', PM(40, 46, 4, 12, 4), { lower: true, mirror: true }],
      ['legR', PM(0, 22, 4, 12, 4), { upper: true }], ['shinR', PM(0, 22, 4, 12, 4), { lower: true }], ['legL', PM(0, 22, 4, 12, 4), { upper: true, mirror: true }], ['shinL', PM(0, 22, 4, 12, 4), { lower: true, mirror: true }]],
  },
  witch: {
    tex: ['entity/witch'], hide: ['hood', 'herbs'],
    parts: [['head', PM(0, 0, 8, 10, 8)], ['body', PM(16, 20, 8, 12, 6)], ['skirt', PM(0, 38, 8, 18, 6)],
      ['armR', PM(44, 22, 4, 8, 4), { upper: true }], ['foreR', PM(44, 22, 4, 8, 4), { lower: true }], ['armL', PM(44, 22, 4, 8, 4), { upper: true, mirror: true }], ['foreL', PM(44, 22, 4, 8, 4), { lower: true, mirror: true }],
      ['legR', PM(0, 22, 4, 12, 4), { upper: true }], ['shinR', PM(0, 22, 4, 12, 4), { lower: true }], ['legL', PM(0, 22, 4, 12, 4), { upper: true, mirror: true }], ['shinL', PM(0, 22, 4, 12, 4), { lower: true, mirror: true }]],
  },
  fuseling: {
    tex: ['entity/creeper/creeper'], hide: ['cracks', 'slits', 'jaw', 'crown', /^frond/, /^thorn/],
    parts: [['head', PM(0, 0, 8, 8, 8)], ['body', PM(16, 16, 8, 12, 4)], ...['FR', 'FL', 'BR', 'BL'].map(n => ['leg' + n, PM(0, 16, 4, 6, 4)])],
  },
  spider: { tex: ['entity/spider/spider'], eyes: 'entity/spider_eyes', parts: pmSpider() },
  cave_spider: { tex: ['entity/spider/cave_spider'], eyes: 'entity/spider_eyes', parts: pmSpider() },
  slime: { tex: ['entity/slime/slime'], parts: [['cube', PM(0, 0, 8, 8, 8)], ['core', PM(0, 16, 6, 6, 6), { slimeFace: true }]] },
  cinder_wisp: { tex: ['entity/blaze'], parts: [['core', PM(0, 0, 8, 8, 8)], ...[0, 1, 2, 3, 4, 5].map(i => ['rod' + i, PM(0, 16, 2, 8, 2)])] },
  stone_mite: {
    tex: ['entity/silverfish'],
    parts: [['head', PM(0, 0, 3, 2, 2)], ['seg1', PM(0, 4, 4, 3, 2)], ['seg2', PM(0, 9, 6, 4, 3)], ['seg3', PM(0, 16, 3, 3, 3)], ['seg4', PM(0, 22, 2, 2, 3)], ['seg5', PM(11, 0, 2, 1, 2)]],
  },
  cow: {
    tex: ['entity/cow/temperate_cow', 'entity/cow/cow'],
    parts: [...pmQuad({ head: PM(0, 0, 8, 8, 6), body: PM(18, 4, 12, 18, 10), leg: PM(0, 16, 4, 12, 4) }), ['hornR', PM(22, 0, 1, 3, 1)], ['hornL', PM(22, 0, 1, 3, 1), { mirror: true }],
      ['udder', PM(52, 0, 4, 6, 1), { lying: true }], ['tail', PM(0, 16, 4, 12, 4)]],
  },
  pig: {
    tex: ['entity/pig/temperate_pig', 'entity/pig/pig'],
    parts: [...pmQuad({ head: PM(0, 0, 8, 8, 8), body: PM(28, 8, 10, 16, 8), leg: PM(0, 16, 4, 6, 4) }), ['snout', PM(16, 16, 4, 3, 1)], ['tail', PM(0, 16, 4, 6, 4)]],
  },
  sheep: {
    tex: ['entity/sheep/sheep'], wool: 'entity/sheep/sheep_fur',
    parts: [...pmQuad({ head: PM(0, 0, 6, 6, 8), body: PM(28, 8, 8, 16, 6), leg: PM(0, 16, 4, 12, 4) }), ['tail', PM(0, 16, 4, 12, 4)],
      ['wool', PM(28, 8, 8, 16, 6), { lying: true, from: 'wool' }], ['cap', PM(0, 0, 6, 6, 6), { from: 'wool' }],
      ...['FL', 'FR', 'BL', 'BR'].map(n => ['legWool' + n, PM(0, 16, 4, 6, 4), { from: 'wool' }])],
  },
  chicken: {
    tex: ['entity/chicken/temperate_chicken', 'entity/chicken'],
    parts: [['head', PM(0, 0, 4, 6, 3)], ['beak', PM(14, 0, 4, 2, 2)], ['wattle', PM(14, 4, 2, 2, 2)], ['body', PM(0, 9, 6, 8, 6), { lying: true }],
      ['legR', PM(26, 0, 3, 5, 3)], ['legL', PM(26, 0, 3, 5, 3), { mirror: true }], ['wingR', PM(24, 13, 1, 4, 6)], ['wingL', PM(24, 13, 1, 4, 6), { mirror: true }]],
  },
  wolf: {
    tex: ['entity/wolf/wolf'],
    parts: [...pmQuad({ head: PM(0, 0, 6, 6, 4), body: PM(18, 14, 6, 9, 6), leg: PM(0, 18, 2, 8, 2) }), ['mane', PM(21, 0, 8, 6, 7), { lying: true }], ['snout', PM(0, 10, 3, 3, 4)],
      ['earR', PM(16, 14, 2, 2, 1)], ['earL', PM(16, 14, 2, 2, 1), { mirror: true }], ['tail', PM(9, 18, 2, 8, 2)]],
  },
};
function pmSpider() {
  const out = [['head', PM(32, 4, 8, 8, 8)], ['thorax', PM(0, 0, 6, 6, 6)], ['abdomen', PM(0, 12, 10, 8, 12)]];
  for (let i = 0; i < 4; i++) for (const S of ['R', 'L']) out.push(['sleg' + S + i, PM(18, 0, 16, 2, 2), { legStrip: 0 }], ['sshin' + S + i, PM(18, 0, 16, 2, 2), { legStrip: 1 }]);
  return out;
}

// ---- cutting the pictures up ------------------------------------------------------------------------
// Each face's patch, as [u, v, w, h] in texels, for faces [+x (its right), -x, top, bottom, back, front].
function pmRegions(box) {
  const [u, v, w, h, d] = box;
  return [[u, v + d, d, h], [u + d + w, v + d, d, h], [u + d, v, w, d], [u + d + w, v, w, d], [u + d + w + d, v + d, w, h], [u + d, v + d, w, h]];
}
// How a face of ours looks up its patch: our tile (x, y in 0..1) to the patch's (x, y).
const PM_XF = {
  id: (x, y) => [x, y], flipX: (x, y) => [1 - x, y], rot180: (x, y) => [1 - x, 1 - y],
  cw: (x, y) => [y, 1 - x], ccw: (x, y) => [1 - y, x],
};
function pmPatch(img, k, reg, xf, out, slice) {
  const [u, v, w, h] = reg, s0 = slice ? slice[0] : 0, s1 = slice ? slice[1] : 1, d = img.data, W = img.width, H = img.height, f = PM_XF[xf] || PM_XF.id;
  const px = out || new Uint8ClampedArray(TILE * TILE * 4);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    let [mx, my] = f((x + 0.5) / TILE, (y + 0.5) / TILE);
    my = s0 + my * (s1 - s0);
    const sx = Math.min(W - 1, Math.floor((u + mx * w) * k)), sy = Math.min(H - 1, Math.floor((v + my * h) * k)), i = (sy * W + sx) * 4, o = (y * TILE + x) * 4;
    const a = d[i + 3];
    if (out) { if (a >= 128) { px[o] = d[i]; px[o + 1] = d[i + 1]; px[o + 2] = d[i + 2]; px[o + 3] = 255; } }
    else { px[o] = d[i]; px[o + 1] = d[i + 1]; px[o + 2] = d[i + 2]; px[o + 3] = a >= 128 ? 255 : 0; }
  }
  return px;
}
// The six faces of one part: which patch, turned which way, sliced how.
function pmFaces(box, o) {
  const R = pmRegions(box);
  let faces;
  if (o.lying) {
    // Minecraft's body box stands up and is tipped forward: its back becomes our top, its front
    // our belly, its top our chest, its bottom our rump, and the sides turn a quarter.
    faces = [[R[0], 'cw'], [R[1], 'ccw'], [R[4], 'id'], [R[5], 'id'], [R[3], 'id'], [R[2], 'id']];
  } else faces = [[R[0], 'id'], [R[1], 'id'], [R[2], 'rot180'], [R[3], 'id'], [R[4], 'id'], [R[5], 'id']];
  if (o.mirror) {
    // the mirrored limb: right and left patches change places, and everything flips
    faces = [[faces[1][0], 'flipX'], [faces[0][0], 'flipX'], [faces[2][0], faces[2][1] === 'rot180' ? 'flipYonly' : 'flipX'], [faces[3][0], 'flipX'], [faces[4][0], 'flipX'], [faces[5][0], 'flipX']];
  }
  // an arm or leg in two pieces: the upper takes the top half of the sides, the lower the rest
  const sl = o.upper && !o.whole ? [0, 0.5] : o.lower ? [0.5, 1] : null;
  return faces.map(([reg, xf], f) => ({ reg, xf, slice: f === 2 || f === 3 ? null : sl }));
}
PM_XF.flipYonly = (x, y) => [x, 1 - y];

// Make the tiles for every creature the pack has a picture for.
async function packMobSkins(Z, root, legacy, load) {
  const ent = root + 'entity/';
  if (![...Z.files.keys()].some(n => n.startsWith(ent))) return 0;
  const made = new Map();
  let mobs = 0;
  const newTile = (key, px) => {
    if (made.has(key)) return made.get(key);
    if (ATLAS.count >= ATLAS_TILES * ATLAS_TILES - 8) return null;
    const idx = ATLAS.count++, name = 'pk:' + key;
    for (let i = 3; i < px.length; i += 4) if (px[i] === 253) px[i] = 252;
    ATLAS.ctx.putImageData(new ImageData(px, TILE, TILE), (idx % ATLAS_TILES) * TILE, Math.floor(idx / ATLAS_TILES) * TILE);
    ATLAS.res[idx] = TILE; ATLAS.tile[name] = idx; made.set(key, name);
    return name;
  };
  const pic = async (rel) => { if (!rel) return null; const img = await load(root + rel + '.png'); return img && img.width >= 16 ? img : null; };
  for (const [model, spec] of Object.entries(PACK_MOBS)) {
    const def = MODEL_DEFS[model];
    if (!def || !def.parts) continue;
    let img = null, rel = null;
    for (const t of spec.tex) { img = await pic('entity/' + t.replace(/^entity\//, '')); if (img) { rel = t; break; } }
    if (!img) continue;
    const k = img.width / (spec.texW || 64);
    const over = await pic(spec.overlay), wool = await pic(spec.wool), eyes = await pic(spec.eyes);
    const byName = Object.fromEntries(def.parts.map(p => [p.name, p])), empty = new Set();
    for (let [pname, box, o = {}] of spec.parts) {
      const part = byName[pname];
      if (!part) continue;
      const src = o.from === 'wool' ? wool : img;
      if (!src) continue;
      const kk = src.width / (o.from === 'wool' ? 64 : spec.texW || 64);
      // a leg with a knee: the thigh takes the top half; one without takes it all
      if (o.whole && byName[pname.replace(/^leg/, 'shin')]) o = Object.assign({}, o, { whole: false });
      const names = [];
      for (const [f, F] of pmFaces(box, o).entries()) {
        let reg = F.reg, xf = F.xf;
        if (o.legStrip !== undefined) { reg = [box[0] + box[4], box[1] + box[4], box[2], box[3]]; xf = o.legStrip ? 'cw' : 'id'; }
        const px = pmPatch(src, kk, reg, xf, null, F.slice);
        if (o.over) pmPatch(src, kk, pmFaces(o.over, o)[f].reg, xf, px, F.slice);
        if (over && o.from !== 'wool') pmPatch(over, over.width / 64, reg, xf, px, F.slice);
        if (o.slimeFace && f === 5) {   // the slime's eyes and mouth are little boxes of their own in front of the core
          for (const [eu, ev, ew, eh, cx, cy] of [[34, 2, 2, 2, 0.1, 0.18], [34, 6, 2, 2, 0.6, 0.18], [33, 9, 1, 1, 0.45, 0.62]]) {
            const tmp = pmPatch(src, kk, [eu, ev, ew, eh], 'id');
            const x0 = Math.floor(cx * TILE), y0 = Math.floor(cy * TILE), sz = Math.floor(ew / 6 * TILE);
            for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) { const si = (Math.floor(y / sz * TILE) * TILE + Math.floor(x / sz * TILE)) * 4, oi = ((y0 + y) * TILE + x0 + x) * 4; if (tmp[si + 3]) { px[oi] = tmp[si]; px[oi + 1] = tmp[si + 1]; px[oi + 2] = tmp[si + 2]; px[oi + 3] = 255; } }
          }
        }
        let any = false; for (let i = 3; i < px.length; i += 4) if (px[i]) { any = true; break; }
        names.push(any ? newTile(rel + '|' + pname + '|' + f + '|' + (o.from || ''), px) : false);
      }
      if (names.some(Boolean)) part.tex = names; else empty.add(pname);
    }
    // glowing eyes: the pack's own eye layer on the spider's face
    if (byName.eyes) {
      if (eyes && model.includes('spider')) {
        const px = pmPatch(eyes, eyes.width / 64, pmRegions(PM(32, 4, 8, 8, 8))[5], 'id');
        // the classic game adds the eye layer on top (black adds nothing), so many packs leave it on black: let the face show through
        for (let i = 0; i < px.length; i += 4) { const m = Math.max(px[i], px[i + 1], px[i + 2]); if (m < 40) px[i + 3] = 0; }
        byName.eyes.tex = [false, false, false, false, false, newTile(rel + '|eyes', px)];
      } else empty.add('eyes');
    }
    // put away what the pack's creature doesn't have (and any part its picture leaves blank)
    const hide = spec.hide || [], gone = new Set();
    for (const p of def.parts) if (empty.has(p.name) || hide.some(h => h instanceof RegExp ? h.test(p.name) : h === p.name) || (p.parent && gone.has(p.parent))) gone.add(p.name);
    if (gone.size) def.parts = def.parts.filter(p => !gone.has(p.name));
    def.packSkin = rel;
    mobs++;
  }
  return mobs;
}
