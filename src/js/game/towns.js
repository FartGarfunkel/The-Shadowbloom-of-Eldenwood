// ---------------------------------------------------------------------------
// game/towns.js — (alpha 2, terrain version 5) towns like a fantasy RPG's.
//
// Three sizes of settlement: a village (a green with a well, thatched cottages, farms and a windmill on the edge),
// a town (a paved market square with a fountain, cobbled main streets and side streets, timber-framed houses,
// an inn, a temple, a smithy, a palisade), and a city (all of that, bigger, inside stone walls with towers and
// gatehouses). Houses are half-timbered: a stone ground floor, plastered upper floors between dark beams jettied
// out over the street, steep tiled or thatched roofs, chimneys, shutters and window boxes.
//
// The insides are furnished, and lived in: the inn's tables carry mugs of ale, bowls of stew and bread, and the
// villagers sit down at them in the evening; the apothecary's shelves are lined with potions and dried herbs; the
// library's bookcases are full; the smithy has weapons hung on its walls and armour on stands.
//
// Worlds made before terrain version 5 keep their old villages (game/villages.js); this replaces the plan and the
// builder for new ones. The plan keeps the old shape (roads, buildings with beds and workplaces, the plaza's board,
// bell, stalls and seats), so the villagers, the quest board and the campaign all work the same.
// ---------------------------------------------------------------------------
const TOWN_TIERS = {
  village: { P: 8, hw: 1, L: [34, 46], sides: 0, cap: 16, folk: 14, guards: 2, fr: 0, gap: [2, 4] },
  town: { P: 11, hw: 2, L: [52, 60], sides: 2, sideLen: [20, 28], cap: 34, folk: 20, guards: 3, fr: 3, gap: [1, 3] },
  city: { P: 13, hw: 2, L: [64, 74], sides: 3, sideLen: [22, 30], cap: 50, folk: 26, guards: 4, fr: 4, gap: [1, 2] },
};
// the look of each style's buildings (checked against the blocks this build has)
{
  const M = {
    plains: { plaster: 'plaster', timber: ['timber_frame', 'timber_frame_cross', 'timber_frame_diagonal'], frame: 'dark_oak_log', beamH: 'stripped_dark_oak_log', base2: 'cobblestone', base3: 'stone_bricks',
      roofs: [['roof_tile_stairs', 'roof_tile_slab'], ['dark_roof_tile_stairs', 'dark_roof_tile_slab'], ['dark_oak_stairs', 'dark_oak_slab']], thatch: ['thatch_stairs', 'thatch_slab'], leaves: 'leaves', banner: ['red_wool', 'yellow_wool'], fwood: 'oak' },
    savanna: { plaster: 'cob', timber: null, frame: 'acacia_log', beamH: 'stripped_acacia_log', base2: 'mud_bricks', base3: 'terracotta',
      roofs: [['thatch_stairs', 'thatch_slab'], ['roof_tile_stairs', 'roof_tile_slab']], thatch: ['thatch_stairs', 'thatch_slab'], leaves: 'acacia_leaves', banner: ['orange_wool', 'red_wool'], fwood: 'acacia' },
    taiga: { plaster: 'plaster', timber: ['timber_frame', 'timber_frame_cross'], frame: 'spruce_log', beamH: 'stripped_spruce_log', base2: 'cobblestone', base3: 'stone_bricks',
      roofs: [['dark_roof_tile_stairs', 'dark_roof_tile_slab'], ['slate_tile_stairs', 'slate_tile_slab'], ['spruce_stairs', 'spruce_slab']], thatch: ['thatch_stairs', 'thatch_slab'], leaves: 'spruce_leaves', banner: ['green_wool', 'yellow_wool'], fwood: 'spruce' },
    snowy: { plaster: 'plaster', timber: ['timber_frame'], frame: 'spruce_log', beamH: 'stripped_spruce_log', base2: 'stone_bricks', base3: 'stone_bricks',
      roofs: [['slate_tile_stairs', 'slate_tile_slab'], ['dark_roof_tile_stairs', 'dark_roof_tile_slab']], thatch: ['spruce_stairs', 'spruce_slab'], leaves: 'spruce_leaves', banner: ['blue_wool', 'wool'], fwood: 'spruce' },
    desert: { plaster: 'smooth_sandstone', timber: null, frame: 'cut_sandstone', beamH: 'cut_sandstone', base2: 'sandstone', base3: 'cut_sandstone',
      roofs: [['sandstone_stairs', 'smooth_sandstone_slab']], thatch: ['sandstone_stairs', 'smooth_sandstone_slab'], leaves: 'jungle_leaves', banner: ['cyan_wool', 'orange_wool'], fwood: 'jungle' },
  };
  const ok = (k) => k && B[k] !== undefined;
  for (const [k, m] of Object.entries(M)) {
    const st = VSTYLE[k]; if (!st) continue;
    for (const f of ['plaster', 'frame', 'beamH', 'base2', 'base3', 'leaves']) st[f] = ok(m[f]) ? m[f] : (f === 'plaster' ? st.planks : f === 'frame' ? st.log : f === 'beamH' ? (st.beam || st.log) : f === 'leaves' ? 'leaves' : st.stone);
    st.timber = (m.timber || []).filter(ok);
    st.roofs = m.roofs.filter(([a, b]) => ok(a) && ok(b)); if (!st.roofs.length) st.roofs = [[st.stairs, st.slab]];
    st.thatch = ok(m.thatch[0]) && ok(m.thatch[1]) ? m.thatch : st.roofs[0];
    st.banner = m.banner.filter(ok); if (!st.banner.length) st.banner = ['wool'];
    st.fwood = ok(m.fwood + '_table') ? m.fwood : 'oak';
  }
}
const TOWN_PAVE = {
  town: ['cobblestone', 'cobblestone', 'cobblestone', 'gravel', 'stone_bricks', 'andesite', 'dirt_path'],
  city: ['stone_bricks', 'stone_bricks', 'stone_bricks', 'polished_andesite', 'cobblestone', 'cracked_stone_bricks', 'andesite'],
  desert: ['smooth_sandstone', 'smooth_sandstone', 'sandstone', 'cut_sandstone'],
};
for (const k of Object.keys(TOWN_PAVE)) TOWN_PAVE[k] = TOWN_PAVE[k].filter(b => B[b] !== undefined);

// what's on the tables and the shelves (filtered to the items this build has, the first time they're wanted)
const TOWN_DECOR = {
  food: ['ale_mug', 'ale_mug', 'ale_mug', 'bread', 'vegetable_stew', 'tomato_soup', 'mushroom_stew', 'cooked_chicken', 'cooked_beef', 'apple', 'cooked_mutton', 'pumpkin_pie', 'cooked_cod', 'beetroot_soup', 'honey_bottle'],
  drink: ['ale_mug', 'ale_mug', 'honey_bottle', 'glass_bottle', 'potion_awkward'],
  potions: ['potion_healing', 'potion_greater_healing', 'potion_heal', 'potion_regen', 'potion_mana', 'potion_swift', 'potion_strength', 'potion_fireres', 'potion_night', 'potion_clarity', 'potion_warding', 'potion_awkward', 'potion_invis', 'potion_fortune', 'glass_bottle', 'honey_bottle'],
  herbs: ['red_mushroom', 'brown_mushroom', 'sweet_berries', 'glow_berries', 'wheat', 'resonant_pollen', 'harmonic_dust', 'bone_meal', 'sugar', 'herbalism_kit', 'kelp', 'poultice'],
  books: ['book', 'book', 'book', 'enchanted_book', 'book', 'writable_book'],
  desk: ['paper', 'paper', 'ink_sac', 'feather', 'book', 'empty_map', 'compass', 'candle'],
  weapons: ['longsword', 'battleaxe', 'warhammer', 'mace', 'spear', 'greataxe', 'handaxe', 'dagger', 'shortsword', 'scimitar', 'rapier', 'greatsword', 'iron_sword', 'steel_sword'],
  shields: ['shield'],
  chest: ['plate_chestplate', 'chain_chestplate', 'scale_chestplate', 'iron_chestplate', 'steel_chestplate', 'studded_chestplate'],
  helm: ['plate_helmet', 'chain_helmet', 'iron_helmet', 'steel_helmet', 'scale_helmet'],
  goods: ['bread', 'apple', 'torch', 'string', 'coal', 'bowl', 'leather', 'rope', 'carrot', 'potato', 'rations', 'candle', 'wheat', 'egg', 'iron_ingot'],
  tools: ['iron_pickaxe', 'iron_shovel', 'iron_axe', 'iron_hoe', 'shears', 'iron_ingot', 'coal', 'gold_ingot'],
  temple: ['candle', 'book', 'holy_symbol', 'gold_ingot'],
  magic: ['potion_mana', 'potion_clarity', 'amethyst_shard', 'ender_pearl', 'book', 'enchanted_book', 'glowstone_dust', 'compass', 'clock'],
};
const TOWN_DECOR_OK = {};
function townDecor(kind) { return TOWN_DECOR_OK[kind] || (TOWN_DECOR_OK[kind] = (TOWN_DECOR[kind] || []).filter(k => ITEMS[k])); }

// a mug of ale: drunk at the inn, carried by the villagers in the evening
{
  defItem('ale_mug', { name: 'Mug of Ale', maxStack: 16, icon: 'ale_mug', food: { heal: 3 }, desc: 'Foamy, brown and very welcome after a long road.' });
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addItem('ale_mug', p => {
      const wood = ['#8a5a32', '#7a4c28', '#6a4020'], band = H('#4a4a52'), foam = [H('#f4ecd8'), H('#e8dcc0')];
      for (let y = 5; y <= 14; y++) for (let x = 3; x <= 10; x++) p.set(x, y, H(wood[(x + (y >> 2)) % 3]));
      for (let x = 3; x <= 10; x++) { p.set(x, 6, band); p.set(x, 12, band); }
      for (let x = 3; x <= 10; x++) { p.set(x, 3, foam[x & 1]); p.set(x, 4, foam[(x + 1) & 1]); }
      p.set(4, 2, foam[0]); p.set(7, 2, foam[1]); p.set(9, 2, foam[0]);
      for (let y = 7; y <= 11; y++) { p.set(12, y, H(wood[1])); } p.set(11, 7, H(wood[1])); p.set(11, 11, H(wood[1]));
      for (let y = 5; y <= 14; y++) { p.set(2, y, H('#3a2414')); p.set(11, y, y >= 7 && y <= 11 ? H(wood[2]) : H('#3a2414')); }
    });
  };
  // a tankard in the world: a banded wooden mug, a handle, foam on top (render/sculpt.js builds it)
  M3D.mug = function (mb, info) {
    const woodP = spriteCommon(info, p => p.r > p.b + 10 && p.lum > 40 && p.lum < 170) || spriteCommon(info);
    const bandP = spriteBest(info, p => -Math.abs(p.r - p.b) - p.lum * 0.2, p => p.lum > 30 && p.lum < 110) || woodP;
    const foamP = spriteBest(info, p => p.lum, p => p.lum > 190) || woodP;
    cring(mb, -0.5, -0.44, 0.25, bandP);
    cring(mb, -0.44, -0.3, 0.24, woodP);
    cring(mb, -0.3, -0.25, 0.255, bandP);
    cring(mb, -0.25, -0.06, 0.24, woodP);
    cring(mb, -0.06, -0.01, 0.255, bandP);
    cring(mb, -0.01, 0.06, 0.21, foamP);
    cbox(mb, 0.24, -0.36, -0.035, 0.36, -0.31, 0.035, woodP); cbox(mb, 0.31, -0.36, -0.035, 0.36, -0.06, 0.035, woodP); cbox(mb, 0.24, -0.11, -0.035, 0.36, -0.06, 0.035, woodP);
    return { stand: true, depth: 0.3 };
  };
  const baseKind = modelKind;
  modelKind = function (key, def) { return key === 'ale_mug' ? 'mug' : baseKind(key, def); };
}

// ---- building helpers -----------------------------------------------------------------------------------
// a seat for the villagers' evenings: [x, y, z, facing, [x, z] to walk up to, what they hold while sitting]
function vSeat(b, lx, lz, f, ax, az, held, ly = 1) { const w = vWorld(b, lx, ly, lz), a = vWorld(b, ax, ly, az); return [w[0], w[1], w[2], (f + b.r) & 3, [a[0], a[2]], held || null]; }
const vPickOf = (b, list, k) => list.length ? list[hash32(b.seed, k, 77, 3) % list.length] : null;
{
  const baseStamp = vStamp;
  vStamp = function (ch, b, st) {
    const S = baseStamp(ch, b, st);
    const ent = (i, e) => { if (i >= 0) ch.blockEntities.set(i, e); return i; };
    const stack = (id) => (id && ITEMS[id] ? { id, n: 1 } : null);
    let salt = 0;
    const pick = (kind) => vPickOf(b, townDecor(kind), salt++);
    const fw = st.fwood || 'oak';
    Object.assign(S, {
      pick,
      // things set down on a surface (a table, a counter, a pedestal): up to four, one in each quarter
      pile(lx, ly, lz, ids) {
        const items = [0, 1, 2, 3].map(k => stack(ids[k]));
        if (!items.some(Boolean)) return;
        const i = S.set(lx, ly, lz, 'item_pile');
        ent(i, { type: 'pile', items, rot: items.map((_, k) => ((hash32(b.seed, lx, lz, k) & 15) - 8) * Math.PI / 16) });
      },
      // a wall shelf (three spots), a standing shelf (six), a bookcase (six books); f = the way its front faces
      shelf(lx, ly, lz, f, ids) { const i = S.set(lx, ly, lz, VB(fw + '_shelf', 'oak_shelf'), (S.d(f) + 2) & 3); ent(i, { type: 'shelf', items: [0, 1, 2].map(k => stack(ids[k])) }); },
      standShelf(lx, lz, f, ids, ly = 1) { const i = S.set(lx, ly, lz, VB(fw + '_standing_shelf', 'oak_standing_shelf'), (S.d(f) + 2) & 3); ent(i, { type: 'shelf', items: [0, 1, 2, 3, 4, 5].map(k => stack(ids[k])) }); },
      bookcase(lx, ly, lz, f, n = 6) { const i = S.set(lx, ly, lz, VB(fw + '_bookcase', 'bookshelf'), (S.d(f) + 2) & 3); if (BLOCKS[ch.blocks[i]] && BLOCKS[ch.blocks[i]].bookcase) ent(i, { type: 'bookcase', items: [0, 1, 2, 3, 4, 5].map(k => (k < n ? stack(pick('books')) : null)) }); },
      // something hung on a wall: a sword on the smithy's wall, a map in the town hall
      hang(lx, ly, lz, f, id, rot = 0) { if (!id) return; const i = S.set(lx, ly, lz, 'item_frame', (S.d(f) + 2) & 3); ent(i, { type: 'frame', item: { id, n: 1 }, rot }); },
      book(lx, ly, lz, f) { const i = S.set(lx, ly, lz, 'lectern', (S.d(f) + 2) & 3); ent(i, { type: 'lectern', book: true }); },
      table(lx, lz, ly = 1) { S.set(lx, ly, lz, VB(fw + '_table', st.slab)); },
      chair(lx, lz, f, ly = 1) { S.face(lx, ly, lz, VB(fw + '_chair', st.stairs), f); },
      stool(lx, lz, ly = 1) { S.set(lx, ly, lz, VB(fw + '_stool', st.slab)); },
      bedAt(lx, ly, lz, f, key) { const m = S.d(f); S.set(lx, ly, lz, key, m); S.set(lx + DXL[f], ly, lz + DZL[f], key, m | 4); },
      rug(x0, z0, x1, z1, key, ly = 1) { if (B[key] === undefined) return; for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (S.get(x, ly, z) === 0) S.set(x, ly, z, key); },
      plant(lx, ly, lz) { S.set(lx, ly, lz, VB(['flowering_azalea', 'azalea', 'flower_pot'][hash32(b.seed, lx, lz, 9) % 3], 'flower_pot')); },
      // an armour stand: a post with a chestplate and a helmet set on top
      armourStand(lx, lz) { S.set(lx, 1, lz, VB('polished_andesite_slab', st.stoneSlab)); S.set(lx, 2, lz, VB(fw + '_fence', st.fence)); S.pile(lx, 3, lz, [pick('chest'), pick('helm'), null, null]); },
      // a gable roof, ridge front to back over z0..z1, eaves all round; the gables filled, a beam up the middle
      roofG(W, z0, z1, ly0, rs, rsl, fill, frame) {
        let top = ly0;
        for (let k = 0; ; k++) {
          const L = k - 1, R = W - k, ly = ly0 + k;
          if (L > R) break;
          top = ly;
          for (let lz = z0 - 1; lz <= z1 + 1; lz++) { if (L === R) S.set(L, ly, lz, rsl, 0); else { S.stairs(L, ly, lz, rs, 1); S.stairs(R, ly, lz, rs, 3); } }
          if (k >= 1) for (let lx = L + 1; lx < R; lx++) for (const lz of [z0, z1]) { if (frame && lx === (W - 1) / 2) S.log(lx, ly, lz, frame, 0); else S.set(lx, ly, lz, fill); }
          if (L === R) break;
        }
        if (W >= 5) for (const lz of [z0, z1]) S.set((W - 1) / 2 + (frame ? 1 : 0), ly0 + 2, lz, 'glass_pane');
        return top;
      },
      // a pyramid roof (towers, the windmill): square rings of stairs shrinking to a point
      hipRoof(cx, cz, r0, ly0, rs, rsl, core) {
        let ly = ly0;
        for (let r = r0; r >= 0; r--, ly++) {
          if (r === 0) { S.set(cx, ly, cz, rsl, 0); break; }
          for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
            const ax = Math.abs(dx), az = Math.abs(dz);
            if (ax !== r && az !== r) { if (core) S.set(cx + dx, ly, cz + dz, core); continue; }
            if (ax === r && az === r) { const full = rs.replace('_stairs', ''); S.set(cx + dx, ly, cz + dz, core || (B[full] !== undefined ? full : rsl)); }
            else if (ax === r) S.stairs(cx + dx, ly, cz + dz, rs, dx < 0 ? 1 : 3);
            else S.stairs(cx + dx, ly, cz + dz, rs, dz < 0 ? 2 : 0);
          }
        }
        return ly;
      },
      win(lx, ly, lz, out, glass) {
        S.set(lx, ly, lz, glass || 'glass_pane');
        if (st.flat) return;
        const ox = DXL[out], oz = DZL[out], tx = oz ? 1 : 0, tz = ox ? 1 : 0;
        for (const s of [-1, 1]) if (S.get(lx + ox + tx * s, ly, lz + oz + tz * s) === 0) S.shutter(lx + ox + tx * s, ly, lz + oz + tz * s, (out + 2) & 3);
      },
    });
    return S;
  };
}
// a half-timbered house: a stone ground floor (or a stone footing), plastered storeys framed in dark beams, the upper
// storeys jettied out over the street, a steep roof of tiles or thatch, a chimney. Returns where the roof starts and ends.
function vHouse(S, o) {
  const st = S.st, b = S.b, W = o.W, D = o.D, n = o.floors || 1, J = !!o.jetty && n > 1 && !st.flat;
  const frame = o.frame || st.frame || st.log, beam = o.beam || st.beamH || st.beam || st.log;
  const fill = o.fill || st.plaster || st.planks, stone = o.stone || st.base2 || st.stone, corner = o.corner || st.base3 || stone;
  const timber = !o.fill && st.timber && st.timber.length ? st.timber : null;
  const roof = o.roof || (o.thatch ? st.thatch : st.roofs[(b.roofI || 0) % st.roofs.length]);
  const zfOf = (f) => (f > 0 && J ? -1 : 0);
  S.floor(W, D, o.floorKey || st.floor);
  let yb = 0;
  for (let f = 0; f < n; f++) {
    const zf = zfOf(f), allStone = (f === 0 && o.stoneGround) || o.allStone;
    for (let ly = yb + 1; ly <= yb + 3; ly++) for (let lz = zf; lz < D; lz++) for (let lx = 0; lx < W; lx++) {
      const ex = lx === 0 || lx === W - 1, ez = lz === zf || lz === D - 1;
      if (!ex && !ez) { S.set(lx, ly, lz, 0); continue; }
      if (allStone) {
        if (ex && ez && !o.allStone && !st.flat) S.log(lx, ly, lz, frame, 0);
        else S.set(lx, ly, lz, ex && ez ? corner : (o.allStone ? stone : (o.stone || st.base3 || stone)));
        continue;
      }
      const post = (ex && ez) || (ez && lx % 3 === 0) || (ex && (lz - zf) % 3 === 0);
      if (post) { if (st.flat) S.set(lx, ly, lz, corner); else S.log(lx, ly, lz, frame, 0); continue; }
      if (f === 0 && ly === 1 && !o.noFooting) { S.set(lx, ly, lz, stone); continue; }
      let key = fill;
      if (timber && ly === yb + 2 && ((lx * 7 + lz * 3 + f * 5 + (b.seed & 7)) % 5 === 0)) key = timber[(lx + lz + f) % timber.length];
      S.set(lx, ly, lz, key);
    }
    yb += 4;
    const last = f === n - 1, z0 = Math.min(zf, last ? zf : zfOf(f + 1));
    for (let lz = z0; lz < D; lz++) for (let lx = 0; lx < W; lx++) {
      const ex = lx === 0 || lx === W - 1, ez = lz === z0 || lz === D - 1;
      if (ex || ez) { if (st.flat || o.allStone) S.set(lx, yb, lz, corner); else S.log(lx, yb, lz, beam, ez ? 1 : 2); }
      else S.set(lx, yb, lz, !last || o.attic ? st.floor : 0);
    }
  }
  // a ladder up through the floors, against the back wall
  if (n > 1 || o.attic) { const [lx, lz] = o.ladder || [W - 2, D - 2]; const topY = o.attic ? 4 * n : 4 * (n - 1); for (let ly = 1; ly <= topY; ly++) S.set(lx, ly, lz, 'ladder', S.d(2)); }
  // windows (the ground floor's front has the door in the middle)
  for (let f = 0; f < n; f++) {
    const zf = zfOf(f), ly = f * 4 + 2;
    const fronts = o.winFront || (W >= 9 ? [1, (W - 1) / 2 - 2, (W - 1) / 2 + 2, W - 2] : [1, W - 2]);
    for (const lx of fronts) S.win(lx, ly, zf, 0, o.glass);
    if (f > 0 && W >= 7) S.win((W - 1) / 2, ly, zf, 0, o.glass);
    for (const lz of o.winSide || [2, D - 3]) { const z = Math.max(zf + 1, Math.min(D - 2, lz)); if (!(o.noWinWest && f === 0)) S.win(0, ly, z, 3, o.glass); if (!(o.noWinEast && f === 0)) S.win(W - 1, ly, z, 1, o.glass); }
    for (const lx of o.winBack || [1, W - 2]) if (o.chimney == null || Math.abs(lx - o.chimney) > 1) S.win(lx, ly, D - 1, 2, o.glass);
  }
  // the roof
  const zr0 = zfOf(n - 1);
  let top;
  if (st.flat) {
    S.fill(0, yb, zr0, W - 1, yb, D - 1, st.roof);
    for (let lz = zr0; lz < D; lz++) for (let lx = 0; lx < W; lx++) if (lx === 0 || lz === zr0 || lx === W - 1 || lz === D - 1) S.set(lx, yb + 1, lz, st.rim, 0);
    top = yb + 1;
  } else top = S.roofG(W, zr0, D - 1, yb, roof[0], roof[1], fill === stone ? stone : fill, o.allStone ? null : frame);
  if (o.chimney != null && !st.flat) S.chimney(o.chimney, D, top, W);
  return { top, yb, J };
}
const VT_TIER = (b) => b.tier || 'town';

// ---- the buildings -----------------------------------------------------------------------------------------
Object.assign(VTEMPLATES, {
  // a cottage: one storey, a thatched roof in a village, a fireplace, a bed, a table with supper on it
  house_s: {
    W: 7, D: 6, H: 11,
    plan(b, rnd) { b.beds.push(vBed(b, 5, 3, 2)); b.bedCol = Math.floor(rnd() * 4); },
    build(S) {
      const st = S.st, b = S.b;
      vHouse(S, { W: 7, D: 6, floors: 1, thatch: VT_TIER(b) === 'village', chimney: 3, winBack: [1, 5] });
      S.door(3, 0, st.door);
      S.bed(5, 3, 2, st.bed[b.bedCol % st.bed.length]);
      S.set(1, 1, 1, 'crafting_table');
      if (b.station) S.face(1, 1, 2, b.station, 1);
      S.chest(1, 1, 4, 1, 'house');
      S.table(5, 1); S.chair(4, 1, 1); S.pile(5, 2, 1, [S.pick('food'), null, S.pick('food'), null]);
      S.shelf(1, 2, 3, 1, [S.pick('goods'), 'bowl', S.pick('food')]);
      S.rug(2, 2, 4, 2, ['red_carpet', 'brown_carpet', 'green_carpet', 'blue_carpet'][b.bedCol % 4]);
      S.torch(2, 3, 4, 2); S.torch(4, 3, 1, 0);
      S.porch(3); S.flower(0, -1); S.flower(6, -1);
    },
  },
  workshop: {
    W: 7, D: 6, H: 11,
    plan(b, rnd) { b.beds.push(vBed(b, 5, 3, 2)); b.job = WORKSHOP_JOBS[Math.floor(rnd() * WORKSHOP_JOBS.length)]; b.station = JOB_STATION[b.job]; b.work = vWork(b, 2, 2, 3); b.bedCol = Math.floor(rnd() * 4); },
    build(S) {
      VTEMPLATES.house_s.build(S);
      const st = S.st;
      // the trade spills outside: barrels and a crate by the wall, a lantern on a post
      S.set(7, 1, 1, 'barrel'); S.set(7, 1, 2, 'barrel'); S.set(7, 2, 1, 'barrel'); S.pile(7, 1, 3, [S.pick('tools'), S.pick('goods'), null, null]);
      S.set(-1, 1, 1, st.fence); S.set(-1, 2, 1, 'lantern');
    },
  },
  // a townhouse: a stone ground floor, a jettied upper storey
  house_m: {
    W: 7, D: 8, H: 15,
    plan(b, rnd) { b.beds.push(vBed(b, 5, 2, 2), vBed(b, 5, 5, 2)); b.bedCol = Math.floor(rnd() * 4); },
    build(S) {
      const st = S.st, b = S.b, village = VT_TIER(b) === 'village';
      vHouse(S, { W: 7, D: 8, floors: 2, jetty: !village, stoneGround: !village, chimney: 3, ladder: [1, 6], winBack: [1, 5] });
      S.door(3, 0, st.door);
      S.bed(5, 2, 2, st.bed[b.bedCol % st.bed.length]); S.bed(5, 5, 2, st.bed[(b.bedCol + 1) % st.bed.length]);
      S.set(1, 1, 1, 'crafting_table'); S.chest(1, 1, 2, 1, 'house');
      S.table(3, 4); S.chair(2, 4, 1); S.chair(4, 4, 3); S.pile(3, 2, 4, [S.pick('food'), S.pick('drink'), S.pick('food'), null]);
      S.standShelf(1, 4, 1, [S.pick('goods'), 'bowl', S.pick('food'), S.pick('goods'), null, S.pick('drink')]);
      S.torch(2, 3, 6, 2); S.torch(4, 3, 1, 0);
      // upstairs: a bedroom and a little study
      S.bedAt(5, 5, 1, 2, st.bed[(b.bedCol + 2) % st.bed.length]); S.chest(5, 5, 5, 3, 'house');
      S.bookcase(3, 5, 6, 0, 4); S.table(2, 2, 5); S.pile(2, 6, 2, [S.pick('desk'), null, 'candle', null]); S.chair(2, 3, 0, 5);
      S.rug(2, 0, 4, 4, ['red_carpet', 'brown_carpet', 'green_carpet', 'blue_carpet'][(b.bedCol + 1) % 4], 5);
      S.torch(1, 7, 2, 3); S.torch(5, 7, 4, 1);
      S.porch(3); S.flower(0, -1); S.flower(6, -1);
    },
  },
  // a tall townhouse for a city street: three storeys
  house_l: {
    W: 7, D: 8, H: 19,
    plan(b, rnd) { b.beds.push(vBed(b, 5, 2, 2), vBed(b, 5, 5, 2)); b.bedCol = Math.floor(rnd() * 4); },
    build(S) {
      const st = S.st, b = S.b;
      vHouse(S, { W: 7, D: 8, floors: 3, jetty: true, stoneGround: true, chimney: 3, ladder: [1, 6], winBack: [1, 5] });
      S.door(3, 0, st.door);
      S.bed(5, 2, 2, st.bed[b.bedCol % st.bed.length]); S.bed(5, 5, 2, st.bed[(b.bedCol + 1) % st.bed.length]);
      S.set(1, 1, 1, 'crafting_table'); S.chest(1, 1, 2, 1, 'house');
      S.table(3, 4); S.chair(2, 4, 1); S.chair(4, 4, 3); S.pile(3, 2, 4, [S.pick('food'), S.pick('drink'), null, S.pick('food')]);
      S.torch(2, 3, 6, 2);
      S.bedAt(5, 5, 1, 2, st.bed[(b.bedCol + 2) % st.bed.length]); S.bookcase(3, 5, 6, 0, 5); S.standShelf(5, 4, 3, [S.pick('goods'), S.pick('goods'), null, S.pick('drink'), 'bowl', null], 5);
      S.table(2, 2, 5); S.chair(2, 3, 0, 5); S.pile(2, 6, 2, [S.pick('desk'), 'candle', null, null]); S.torch(1, 7, 2, 3);
      S.set(5, 9, 5, 'barrel'); S.set(5, 9, 4, 'barrel'); S.set(5, 10, 5, 'barrel'); S.chest(3, 9, 6, 0, 'house'); S.set(2, 9, 1, 'hay_bale'); S.torch(1, 11, 2, 3);
      S.porch(3); S.flower(0, -1); S.flower(6, -1);
    },
  },
  // the inn: a common room with a bar, a fire, tables laid with ale and stew; rooms upstairs
  hall: {
    W: 11, D: 11, H: 17,
    plan(b, rnd) {
      b.beds.push(vBed(b, 1, 8, 2), vBed(b, 3, 8, 2)); b.work = vWork(b, 8, 6, 3); b.elderAt = vWork(b, 5, 4, 0); b.bedCol = Math.floor(rnd() * 4);
      const F = ['ale_mug', 'ale_mug', 'bread', 'vegetable_stew', 'cooked_chicken', 'ale_mug'];
      b.seats = [vSeat(b, 1, 2, 1, 1, 1, F[0]), vSeat(b, 3, 2, 3, 3, 1, F[1]), vSeat(b, 1, 5, 1, 1, 4, F[2]), vSeat(b, 3, 5, 3, 3, 4, F[3]), vSeat(b, 4, 7, 1, 4, 6, F[4]), vSeat(b, 6, 7, 3, 6, 6, F[5])];
    },
    build(S) {
      const st = S.st, b = S.b;
      vHouse(S, { W: 11, D: 11, floors: 2, jetty: true, stoneGround: true, chimney: 5, ladder: [9, 1], winBack: [1, 9], winSide: [2, 5] });
      S.set(9, 1, 1, 0); for (let ly = 1; ly <= 4; ly++) S.set(9, ly, 1, 'ladder', S.d(1));
      S.door(5, 0, st.door);
      // the bar down the east side, the kegs behind it, bottles on the shelves above
      const slab = VB(st.fwood + '_slab', st.slab);
      for (let z = 4; z <= 8; z++) if (z !== 6) S.set(7, 1, z, slab, 1);
      S.face(7, 1, 6, st.trapdoor || slab, 3);
      for (let z = 4; z <= 8; z++) { S.set(9, 1, z, 'barrel'); if (z % 2 === 0) S.set(9, 2, z, 'barrel'); }
      S.shelf(9, 3, 5, 3, [S.pick('drink'), S.pick('drink'), S.pick('drink')]); S.shelf(9, 3, 7, 3, ['honey_bottle', S.pick('drink'), 'glass_bottle']);
      S.pile(7, 2, 4, ['ale_mug', 'ale_mug', null, 'ale_mug']); S.pile(7, 2, 8, ['bowl', null, 'ale_mug', 'bread']); S.pile(7, 2, 5, [null, 'ale_mug', null, null]);
      // three tables laid for supper
      for (const [x, z] of [[2, 2], [2, 5], [5, 7]]) { S.table(x, z); S.pile(x, 2, z, [S.pick('food'), S.pick('drink'), S.pick('food'), S.pick('drink')]); }
      S.chair(1, 2, 1); S.chair(3, 2, 3); S.chair(1, 5, 1); S.chair(3, 5, 3); S.chair(4, 7, 1); S.chair(6, 7, 3);
      // the kitchen corner by the hearth, and the innkeepers' beds
      S.set(4, 1, 9, 'cauldron'); S.face(6, 1, 9, 'smoker', 0); S.pile(6, 2, 9, ['cooked_beef', 'bread', null, null]);
      S.bed(1, 8, 2, st.bed[b.bedCol % st.bed.length]); S.bed(3, 8, 2, st.bed[(b.bedCol + 2) % st.bed.length]);
      S.chest(1, 1, 7, 1, 'tavern'); S.shelf(1, 3, 3, 1, ['bread', 'apple', 'bowl']);
      S.rug(4, 1, 6, 5, 'red_carpet');
      for (const [x, z, wl] of [[1, 4, 3], [5, 9, 2], [6, 1, 0], [4, 1, 0]]) S.torch(x, 3, z, wl);
      S.set(5, 3, 3, 'lantern', 1); S.set(2, 3, 7, 'lantern', 1);
      // upstairs: rooms for travellers
      for (const [x, z] of [[1, 0], [1, 4], [9, 4], [9, 7]]) S.bedAt(x, 5, z, 2, st.bed[(b.bedCol + x + z) % st.bed.length]);
      for (const [x, z] of [[3, 1], [3, 5], [7, 5]]) { S.table(x, z, 5); S.set(x, 6, z, 'candle'); }
      S.chest(1, 5, 8, 1, 'tavern'); S.chest(5, 5, 9, 0, 'house'); S.rug(4, 0, 6, 8, 'brown_carpet', 5);
      for (const [x, z, wl] of [[1, 2, 3], [9, 2, 1], [5, 9, 2]]) S.torch(x, 7, z, wl);
      S.porch(5); S.flower(1, -1); S.flower(9, -1); S.set(-1, 1, 3, 'barrel'); S.set(-1, 1, 4, 'barrel'); S.set(11, 1, 3, 'hay_bale');
    },
  },
  // a darker tavern: blackened timber, few windows, a hatch behind the bar
  tavern: {
    W: 9, D: 9, H: 15,
    plan(b, rnd) {
      b.work = vWork(b, 4, 5, 0); b.beds.push(vBed(b, 7, 6, 2)); b.bedCol = Math.floor(rnd() * 4);
      b.seats = [vSeat(b, 1, 2, 1, 1, 1, 'ale_mug'), vSeat(b, 3, 2, 3, 3, 1, 'ale_mug'), vSeat(b, 5, 2, 1, 5, 1, 'bread'), vSeat(b, 7, 2, 3, 7, 1, 'ale_mug')];
    },
    build(S) {
      const st = S.st, b = S.b, dk = VB('dark_oak_planks', st.planks), dl = VB('dark_oak_log', st.log);
      vHouse(S, { W: 9, D: 9, floors: 2, fill: dk, frame: dl, beam: VB('stripped_dark_oak_log', dl), roof: [VB('dark_roof_tile_stairs', st.stairs), VB('dark_roof_tile_slab', st.slab)], ladder: [1, 7], winFront: [2, 6], winSide: [3], winBack: [] , floorKey: VB('spruce_planks', st.planks) });
      S.door(4, 0, VB('dark_oak_door', st.door));
      const slab = VB('dark_oak_slab', st.slab);
      for (let x = 2; x <= 6; x++) if (x !== 4) S.set(x, 1, 4, slab, 1);
      S.face(4, 1, 4, VB('dark_oak_trapdoor', st.trapdoor || slab), 0);
      S.pile(2, 2, 4, ['ale_mug', null, 'ale_mug', null]); S.pile(5, 2, 4, [null, 'ale_mug', null, 'glass_bottle']);
      S.set(2, 1, 6, 'barrel'); S.set(3, 1, 6, 'barrel'); S.set(2, 2, 6, 'barrel'); S.set(2, 1, 7, 'barrel'); S.set(3, 1, 7, 'barrel');
      S.shelf(3, 3, 7, 0, [S.pick('drink'), 'glass_bottle', S.pick('drink')]); S.shelf(5, 3, 7, 0, ['honey_bottle', S.pick('drink'), null]);
      S.set(5, 0, 6, VB('dark_oak_trapdoor', st.trapdoor || st.planks), 0);
      S.bed(7, 6, 2, st.bed[b.bedCol % st.bed.length]);
      for (const [x, z] of [[2, 2], [6, 2]]) { S.table(x, z); S.pile(x, 2, z, [S.pick('drink'), 'ale_mug', null, S.pick('food')]); }
      S.chair(1, 2, 1); S.chair(3, 2, 3); S.chair(5, 2, 1); S.chair(7, 2, 3);
      S.set(4, 3, 2, 'lantern', 1); S.torch(1, 3, 4, 3); S.torch(7, 3, 4, 1);
      S.chest(1, 1, 5, 1, 'tavern');
      S.bedAt(6, 5, 2, 2, st.bed[(b.bedCol + 1) % st.bed.length]); S.table(3, 3, 5); S.set(3, 6, 3, 'candle'); S.chest(6, 5, 6, 3, 'tavern'); S.torch(4, 7, 7, 2);
      vFrontPath(S, 4); S.set(3, 2, -1, 'lantern', 1); S.set(5, 2, -1, 'lantern', 1);
    },
  },
  // a shop: a counter across the front room, goods on the shelves; upstairs the shopkeeper lives
  store: {
    W: 7, D: 8, H: 15,
    plan(b, rnd) { b.work = vWork(b, 3, 4, 0); b.beds.push(vBed(b, 5, 5, 2)); b.bedCol = Math.floor(rnd() * 4); },
    build(S) {
      const st = S.st, b = S.b, apo = b.decor === 'apothecary';
      vHouse(S, { W: 7, D: 8, floors: 2, jetty: VT_TIER(b) !== 'village', stoneGround: true, chimney: 3, ladder: [4, 6], winBack: [1, 5] });
      S.door(3, 0, st.door);
      const slab = VB(st.fwood + '_slab', st.slab);
      for (const x of [1, 2, 4, 5]) S.set(x, 1, 3, slab, 1);
      S.face(3, 1, 3, st.trapdoor || slab, 0);
      const goods = apo ? 'potions' : 'goods', more = apo ? 'herbs' : 'goods';
      S.standShelf(1, 1, 1, [S.pick(goods), S.pick(goods), S.pick(more), S.pick(goods), S.pick(more), S.pick(goods)]);
      S.standShelf(5, 1, 3, [S.pick(more), S.pick(goods), S.pick(goods), S.pick(goods), S.pick(goods), S.pick(more)]);
      S.standShelf(1, 5, 1, [S.pick(goods), S.pick(goods), S.pick(goods), S.pick(more), S.pick(goods), S.pick(goods)]);
      S.standShelf(1, 6, 1, [S.pick(more), S.pick(more), S.pick(goods), S.pick(goods), S.pick(more), S.pick(goods)]);
      S.set(2, 1, 6, 'barrel'); S.bed(5, 5, 2, st.bed[b.bedCol % st.bed.length]);
      if (apo) {
        S.set(2, 1, 3, VB('brewing_stand', slab)); S.pile(1, 2, 3, [S.pick('potions'), S.pick('herbs'), S.pick('potions'), null]); S.pile(5, 2, 3, [S.pick('herbs'), null, S.pick('potions'), S.pick('potions')]);
        for (const [x, z] of [[2, 1], [4, 1], [2, 4], [4, 4]]) if (B.hanging_roots !== undefined) S.set(x, 3, z, 'hanging_roots');
        S.plant(-1, 1, 1); S.plant(7, 1, 1); S.set(4, 1, 5, 'cauldron');
      } else {
        S.pile(1, 2, 3, [S.pick('goods'), 'gold_coin', null, S.pick('goods')]); S.pile(5, 2, 3, [S.pick('goods'), null, S.pick('goods'), null]);
        S.set(-1, 1, 1, 'barrel'); S.set(-1, 1, 2, 'hay_bale'); S.set(7, 1, 1, 'barrel'); S.pile(7, 1, 2, [S.pick('goods'), S.pick('goods'), null, null]);
      }
      S.torch(1, 3, 2, 3); S.torch(5, 3, 2, 1); S.set(3, 3, 1, 'lantern', 1);
      // the awning over the shop window
      const aw = st.awning && st.awning.length ? st.awning : ['wool'];
      if (!st.flat) for (let x = 0; x <= 6; x++) S.set(x, 3, -1, aw[x % aw.length]);
      vFrontPath(S, 3);
      // upstairs
      S.bedAt(1, 5, 1, 2, st.bed[(b.bedCol + 1) % st.bed.length]); S.table(4, 2, 5); S.chair(5, 2, 3, 5); S.pile(4, 6, 2, [S.pick('food'), 'candle', null, null]);
      S.chest(5, 5, 5, 3, 'house'); S.shelf(1, 6, 4, 1, [S.pick(goods), S.pick(more), null]); S.torch(3, 7, 6, 2);
    },
  },
  // the library (or, with decor 'apothecary', an alchemist's: potions where the books would be)
  library: {
    W: 9, D: 9, H: 15,
    plan(b) { b.job = 'librarian'; b.work = vWork(b, 4, 5, 2); },
    build(S) {
      const st = S.st, b = S.b, apo = b.decor === 'apothecary', sb = VB('stone_bricks', st.stone);
      vHouse(S, { W: 9, D: 9, floors: 2, allStone: true, stone: apo ? (st.base2 || sb) : sb, fill: apo ? (st.base2 || sb) : sb, corner: VB('chiseled_stone_bricks', sb), ladder: [7, 7], winFront: [2, 6], winSide: [4], winBack: [2, 6], glass: apo ? VB('green_stained_glass_pane', 'glass_pane') : 'glass_pane' });
      S.door(4, 0, st.door);
      if (!apo) {
        for (const z of [2, 3, 5, 6]) { S.bookcase(1, 1, z, 1); S.bookcase(1, 2, z, 1, 5); }
        for (let z = 2; z <= 6; z++) { S.bookcase(7, 1, z, 3); S.bookcase(7, 2, z, 3, 4); }
        S.book(4, 1, 6, 0);
        S.table(3, 2); S.table(5, 2); S.chair(3, 3, 0); S.chair(5, 3, 0);
        S.pile(3, 2, 2, [S.pick('desk'), S.pick('desk'), null, 'book']); S.pile(5, 2, 2, ['candle', S.pick('desk'), S.pick('desk'), null]);
        S.rug(4, 1, 4, 4, 'blue_carpet');
        S.chest(1, 1, 7, 1, 'library');
      } else {
        // Nico's kind of shop: rows of bottles, dried herbs hanging, a cauldron bubbling, brewing stands on the bench
        for (const z of [2, 3, 5, 6]) S.standShelf(1, z, 1, [S.pick('potions'), S.pick('potions'), S.pick('herbs'), S.pick('potions'), S.pick('herbs'), S.pick('potions')]);
        for (let z = 2; z <= 6; z++) S.standShelf(7, z, 3, [S.pick('potions'), S.pick('herbs'), S.pick('potions'), S.pick('potions'), S.pick('potions'), S.pick('herbs')]);
        for (const z of [2, 3, 5, 6]) S.shelf(1, 3, z, 1, [S.pick('herbs'), S.pick('potions'), S.pick('herbs')]);
        S.book(4, 1, 6, 0);
        S.table(3, 2); S.table(5, 2); S.set(3, 2, 2, VB('brewing_stand', 'cauldron')); S.pile(5, 2, 2, [S.pick('potions'), S.pick('herbs'), S.pick('potions'), S.pick('magic')]);
        S.set(6, 1, 6, 'cauldron'); S.set(2, 1, 7, VB('decorated_pot', 'flower_pot')); S.plant(6, 1, 1); S.plant(2, 1, 1);
        if (B.hanging_roots !== undefined) for (const [x, z] of [[2, 3], [6, 3], [3, 5], [5, 5], [4, 2]]) S.set(x, 3, z, 'hanging_roots');
        S.rug(4, 1, 4, 4, 'purple_carpet');
        S.chest(1, 1, 7, 1, 'library');
      }
      for (const [x, z, wl] of [[2, 1, 0], [6, 1, 0], [4, 7, 2]]) S.torch(x, 3, z, wl);
      // upstairs: the reading room or the stillroom
      if (!apo) { for (const z of [1, 3, 5]) { S.bookcase(1, 5, z, 1); S.bookcase(7, 5, z, 3); } S.table(4, 4, 5); S.pile(4, 6, 4, [S.pick('desk'), 'candle', S.pick('desk'), null]); S.chair(4, 5, 0, 5); S.book(4, 5, 1, 2); }
      else { for (const z of [1, 3, 5]) { S.standShelf(1, z, 1, [S.pick('herbs'), S.pick('potions'), S.pick('herbs'), S.pick('herbs'), null, S.pick('potions')], 5); } S.table(4, 4, 5); S.set(4, 6, 4, VB('brewing_stand', 'candle')); S.chest(7, 5, 3, 3, 'library'); }
      S.torch(4, 7, 7, 2); S.torch(4, 7, 1, 0);
      vFrontPath(S, 4); S.flower(1, -1); S.flower(7, -1);
    },
  },
  // the smithy: an open forge under a big roof; weapons hung on the walls, armour on stands
  smithy: {
    W: 9, D: 8, H: 12,
    plan(b, rnd) { b.job = ['armorer', 'weaponsmith', 'toolsmith'][Math.floor(rnd() * 3)]; b.work = vWork(b, 4, 3, 0); },
    build(S) {
      const st = S.st, b = S.b, stone = st.base3 || st.stone, rough = st.base2 || st.stone;
      S.floor(9, 8, rough);
      for (let ly = 1; ly <= 3; ly++) {
        for (let lz = 1; lz < 8; lz++) { S.set(0, ly, lz, lz === 7 ? stone : rough); S.set(8, ly, lz, lz === 7 ? stone : rough); }
        for (let lx = 1; lx < 8; lx++) S.set(lx, ly, 7, rough);
        S.log(0, ly, 0, st.frame || st.log, 0); S.log(8, ly, 0, st.frame || st.log, 0);
        for (let lx = 1; lx < 8; lx++) for (let lz = 0; lz < 7; lz++) S.set(lx, ly, lz, 0);
      }
      for (let lz = 0; lz <= 7; lz++) for (let lx = 0; lx <= 8; lx++) if (lx === 0 || lx === 8 || lz === 0 || lz === 7) S.log(lx, 4, lz, st.beamH || st.log, lz === 0 || lz === 7 ? 1 : 2);
      const roof = st.roofs[(b.roofI || 0) % st.roofs.length];
      const top = st.flat ? (S.fill(0, 4, 0, 8, 4, 7, st.roof), 5) : S.roofG(9, 0, 7, 4, roof[0], roof[1], rough, null);
      S.chimney(2, 8, top, 9);
      // the forge: furnaces, a lava trough under a grate, the anvil, the quenching barrel
      S.face(3, 1, 6, 'furnace', 0); S.face(4, 1, 6, 'furnace', 0); S.face(5, 1, 6, VB('blast_furnace', 'furnace'), 0);
      S.set(6, 0, 6, 'lava'); S.set(6, 1, 6, 'iron_bars');
      S.set(4, 1, 2, 'anvil'); S.face(7, 1, 3, JOB_STATION[b.job] || 'smithing_table', 3); S.set(7, 1, 5, 'barrel'); S.set(6, 1, 4, 'cauldron'); S.set(2, 1, 4, VB('grindstone', 'stonecutter'));
      S.chest(1, 1, 1, 1, 'smithy');
      // weapons on the walls, shields and helms over the forge
      for (const z of [3, 4, 5]) S.hang(1, 2, z, 1, S.pick('weapons'), 2);
      for (const z of [3, 4, 5, 6]) S.hang(1, 3, z, 1, S.pick('weapons'), 2);
      for (const x of [3, 4, 5]) S.hang(x, 3, 6, 0, x === 4 ? S.pick('shields') : S.pick('helm'), 0);
      for (const z of [4, 5]) S.hang(7, 2, z, 3, S.pick('weapons'), 2);
      // armour on stands, a table of blades
      S.armourStand(7, 1); S.armourStand(7, 2);
      S.table(5, 2); S.pile(5, 2, 2, [S.pick('weapons'), S.pick('weapons'), S.pick('weapons'), S.pick('tools')]);
      S.torch(1, 3, 2, 3); S.torch(5, 3, 6, 2);
      S.set(-1, 1, 2, 'hay_bale'); S.set(9, 1, 1, st.log, 1); S.set(9, 1, 2, st.log, 1); S.set(9, 2, 1, st.log, 1);
      vFrontPath(S, 4);
    },
  },
  // the temple: a stone nave under a steep roof, a bell tower over the door, coloured glass, pews, an altar
  chapel: {
    W: 9, D: 13, H: 21,
    plan(b) { b.work = vWork(b, 4, 10, 0); },
    build(S) {
      const st = S.st, b = S.b, sb = VB('stone_bricks', st.stone), ch = VB('chiseled_stone_bricks', sb), mo = VB('mossy_stone_bricks', sb);
      S.floor(9, 13, sb);
      for (let ly = 1; ly <= 6; ly++) for (let lz = 0; lz < 13; lz++) for (let lx = 0; lx < 9; lx++) {
        const ex = lx === 0 || lx === 8, ez = lz === 0 || lz === 12;
        if (!ex && !ez) { S.set(lx, ly, lz, 0); continue; }
        S.set(lx, ly, lz, ex && ez ? ch : ((lx * 3 + lz + ly) % 9 === 0 ? mo : sb));
      }
      const roof = st.roofs.find(r => /slate|dark_roof/.test(r[0])) || st.roofs[0];
      const top = st.flat ? (S.fill(0, 7, 0, 8, 7, 12, st.roof), 8) : S.roofG(9, 0, 12, 7, roof[0], roof[1], sb, null);
      void top;
      // stained glass down both sides and a rose window over the altar
      const glass = ['yellow_stained_glass_pane', 'blue_stained_glass_pane', 'red_stained_glass_pane', 'purple_stained_glass_pane'].filter(k => B[k] !== undefined);
      for (const z of [4, 7, 10]) for (let ly = 2; ly <= 4; ly++) { S.set(0, ly, z, glass[(z + ly) % glass.length] || 'glass_pane'); S.set(8, ly, z, glass[(z + ly + 1) % glass.length] || 'glass_pane'); }
      for (const [x, y] of [[4, 4], [3, 5], [5, 5], [4, 6], [4, 5]]) S.set(x, y, 12, glass[(x + y) % glass.length] || 'glass_pane');
      // the bell tower, standing on the front wall
      for (let ly = 1; ly <= 6; ly++) { S.set(3, ly, 1, sb); S.set(5, ly, 1, sb); }
      for (let ly = 7; ly <= 15; ly++) for (let lz = 0; lz <= 2; lz++) for (let lx = 3; lx <= 5; lx++) {
        if (lx === 4 && lz === 1) { S.set(lx, ly, lz, 0); continue; }
        const open = ly >= 13 && ly <= 14 && (lx === 4 || lz === 1);
        S.set(lx, ly, lz, open ? 0 : sb);
      }
      S.fill(3, 7, 0, 5, 7, 2, sb); S.set(4, 7, 1, sb); S.set(4, 12, 1, sb); S.set(4, 13, 1, 'bell');
      S.hipRoof(4, 1, 2, 16, roof[0], roof[1], sb);
      S.set(4, 19, 1, VB('end_rod', st.fence)); S.set(4, 20, 1, 'lantern');
      S.door(4, 0, st.door);
      // pews facing the altar, candles, the altar itself
      const pew = VB(st.fwood + '_bench', st.stairs);
      for (const z of [4, 6, 8]) for (const x of [1, 2, 3, 5, 6, 7]) S.face(x, 1, z, pew, 2);
      S.set(4, 1, 11, ch); S.set(4, 2, 11, 'candle'); S.set(3, 1, 11, 'candle'); S.set(5, 1, 11, 'candle');
      S.pile(4, 3, 11, [null, 'book', null, null]);
      S.rug(4, 2, 4, 10, 'red_carpet');
      // banners either side of the altar
      const ban = st.banner;
      for (let ly = 2; ly <= 5; ly++) { S.set(2, ly, 11, ban[0]); S.set(6, ly, 11, ban[ban.length - 1]); }
      for (const [x, z, wl] of [[1, 3, 3], [7, 3, 1], [1, 9, 3], [7, 9, 1]]) S.torch(x, 4, z, wl);
      S.torch(4, 3, 11, 2);
      S.plant(1, 1, 11); S.plant(7, 1, 11);
      S.porch(4);
    },
  },
  // the town hall: a council chamber with a long table, an archive upstairs, a clock tower over the door
  council: {
    W: 11, D: 11, H: 21,
    plan(b) { b.work = vWork(b, 5, 9, 0); },
    build(S) {
      const st = S.st, b = S.b, sb = VB('stone_bricks', st.stone);
      vHouse(S, { W: 11, D: 11, floors: 2, stoneGround: true, ladder: [9, 9], winSide: [3, 7], winBack: [2, 8], winFront: [2, 8] });
      S.door(5, 0, st.door);
      for (let z = 3; z <= 7; z++) { S.table(5, z); S.chair(4, z, 1); S.chair(6, z, 3); }
      S.chair(5, 8, 0);
      for (const z of [3, 5, 7]) S.pile(5, 2, z, [S.pick('desk'), S.pick('desk'), null, S.pick('desk')]);
      S.pile(5, 2, 4, ['candle', null, null, 'book']); S.pile(5, 2, 6, [null, 'paper', 'candle', null]);
      S.rug(2, 1, 2, 9, 'red_carpet'); S.rug(8, 1, 8, 9, 'red_carpet');
      for (const x of [1, 3, 7]) S.bookcase(x, 1, 9, 0);
      const ban = st.banner;
      for (let ly = 2; ly <= 3; ly++) for (const z of [2, 5, 8]) { S.set(1, ly, z, ban[0]); S.set(9, ly, z, ban[ban.length - 1]); }
      S.hang(5, 3, 9, 0, ITEMS.empty_map ? 'empty_map' : 'paper');
      for (const [x, z, wl] of [[1, 1, 3], [9, 1, 1], [5, 9, 2]]) S.torch(x, 3, z, wl);
      S.set(5, 3, 2, 'lantern', 1); S.set(5, 3, 6, 'lantern', 1);
      // the archive upstairs
      for (const x of [1, 3, 7]) { S.bookcase(x, 5, 9, 0); S.bookcase(x, 6, 9, 0, 4); }
      S.chest(1, 5, 1, 1, 'library'); S.chest(9, 5, 1, 3, 'library'); S.table(5, 4, 5); S.pile(5, 6, 4, [S.pick('desk'), S.pick('desk'), 'candle', null]); S.torch(5, 7, 1, 0);
      // the clock tower over the front gable
      for (let ly = 9; ly <= 16; ly++) for (let lz = 0; lz <= 2; lz++) for (let lx = 4; lx <= 6; lx++) if (lx !== 5 || lz !== 1) S.set(lx, ly, lz, sb);
      S.set(5, 14, 0, VB('chiseled_quartz_block', 'glowstone')); S.set(4, 14, 0, VB('quartz_block', sb)); S.set(6, 14, 0, VB('quartz_block', sb)); S.set(5, 15, 0, VB('quartz_block', sb)); S.set(5, 13, 0, VB('quartz_block', sb));
      S.set(5, 12, 1, 'bell');
      const roof = st.roofs[(b.roofI || 0) % st.roofs.length];
      if (!st.flat) S.hipRoof(5, 1, 2, 17, roof[0], roof[1], sb);
      S.porch(5); S.flower(1, -1); S.flower(9, -1);
    },
  },
  // a watchtower and barracks: crenellated, arrow slits, a ladder to the top, weapons racked inside
  tower: {
    W: 7, D: 7, H: 18,
    plan(b) { b.work = vWork(b, 3, 3, 0); },
    build(S) {
      const st = S.st, b = S.b, sb = VB('stone_bricks', st.stone), cr = VB('cracked_stone_bricks', sb), slit = VB('iron_bars', 'glass_pane');
      S.floor(7, 7, st.base2 || st.stone);
      for (let ly = 1; ly <= 14; ly++) for (let lz = 0; lz < 7; lz++) for (let lx = 0; lx < 7; lx++) {
        const edge = lx === 0 || lx === 6 || lz === 0 || lz === 6;
        if (!edge) { S.set(lx, ly, lz, ly === 5 || ly === 10 ? st.planks : 0); continue; }
        const isSlit = (ly === 7 || ly === 12) && (lx === 3 || lz === 3);
        S.set(lx, ly, lz, isSlit ? slit : ((lx + ly + lz) % 7 === 0 ? cr : sb));
      }
      S.door(3, 0, st.door);
      S.fill(-1, 15, -1, 7, 15, 7, sb);
      for (let lz = -1; lz <= 7; lz++) for (let lx = -1; lx <= 7; lx++) if (lx === -1 || lx === 7 || lz === -1 || lz === 7) { S.set(lx, 16, lz, (lx + lz) % 2 === 0 ? sb : 0); S.set(lx, 14, lz, VB('stone_brick_stairs', sb), 0); }
      for (let ly = 1; ly <= 15; ly++) S.set(3, ly, 5, 'ladder', S.d(2));
      S.set(3, 16, 5, 0);
      // the guardroom
      for (const z of [1, 2, 3]) S.hang(5, 2, z, 3, z === 2 ? S.pick('shields') : S.pick('weapons'), 2);
      S.set(5, 1, 5, 'barrel'); S.set(5, 2, 5, 'barrel'); S.chest(1, 1, 5, 1, 'smithy'); S.set(5, 1, 4, 'crafting_table');
      S.table(1, 4); S.pile(1, 2, 4, ['paper', S.pick('weapons'), null, 'ale_mug']);
      S.torch(1, 3, 3, 3); S.torch(5, 3, 3, 1); S.torch(3, 3, 1, 0);
      // bunks upstairs, the armoury above that
      S.bedAt(1, 6, 1, 2, st.bed[0]); S.bedAt(5, 6, 1, 2, st.bed[0]); S.chest(1, 6, 5, 1, 'smithy'); S.torch(1, 8, 3, 3);
      for (const z of [1, 2, 3]) S.hang(1, 12, z, 1, S.pick('weapons'), 2);
      S.set(5, 11, 4, 'barrel'); S.set(5, 11, 5, 'barrel'); S.torch(5, 13, 3, 1);
      // the lookout: lanterns and the town's banner
      S.set(1, 16, 1, 'lantern'); S.set(5, 16, 5, 'lantern');
      S.set(5, 16, 1, st.fence); S.set(5, 17, 1, st.fence); S.set(5, 18, 1, st.fence);
      if (typeof VGATE_CH !== 'undefined' && VGATE_CH.gv >= 6) { const wd = VGATE_CH.wind, ld = (wd - S.r + 4) & 3; S.set(5, 19, 1, st.fence); S.set(5 + DXL[ld], 19, 1 + DZL[ld], clothKey(st.banner[0], 'flag'), wd); }   // (alpha 3) a flag in the wind
      else { S.set(6, 18, 1, st.banner[0]); S.set(6, 17, 1, st.banner[0]); }
      vFrontPath(S, 3);
    },
  },
  // the sage's tower: an eight-sided stone tower under a pointed roof, books to the rafters, chimes and ivy outside
  sage: {
    W: 7, D: 7, H: 20,
    plan(b) { b.work = vWork(b, 3, 3, 0); },
    build(S) {
      const st = S.st, b = S.b, sb = VB('stone_bricks', st.stone), mo = VB('mossy_stone_bricks', sb);
      const wall = (lx, lz) => (lx === 0 || lx === 6) ? lz >= 2 && lz <= 4 : (lz === 0 || lz === 6) ? lx >= 2 && lx <= 4 : (lx === 1 || lx === 5) && (lz === 1 || lz === 5);
      const inside = (lx, lz) => lx >= 1 && lx <= 5 && lz >= 1 && lz <= 5 && !wall(lx, lz);
      S.fill(1, 0, 1, 5, 0, 5, sb); S.fill(0, 0, 2, 6, 0, 4, sb); S.fill(2, 0, 0, 4, 0, 6, sb);
      for (let ly = 1; ly <= 10; ly++) for (let lz = 0; lz < 7; lz++) for (let lx = 0; lx < 7; lx++) {
        if (wall(lx, lz)) S.set(lx, ly, lz, (lx * 5 + lz * 3 + ly) % 4 === 0 ? mo : sb);
        else if (inside(lx, lz)) S.set(lx, ly, lz, ly === 5 ? st.planks : 0);
      }
      S.door(3, 0, st.door);
      for (const [x, z, o] of [[0, 3, 3], [6, 3, 1], [3, 6, 2]]) { S.win(x, 2, z, o); S.win(x, 7, z, o); }
      S.win(3, 7, 0, 0);
      const rs = VB('dark_prismarine_stairs', VB('prismarine_brick_stairs', st.roofs[0][0])), rsl = VB('dark_prismarine_slab', VB('prismarine_brick_slab', st.roofs[0][1]));
      S.hipRoof(3, 3, 4, 11, rs, rsl, null);
      S.set(3, 16, 3, VB('end_rod', 'lantern')); S.set(3, 17, 3, VB('amethyst_cluster', 'lantern'));
      for (let ly = 1; ly <= 5; ly++) S.set(3, ly, 5, 'ladder', S.d(2));
      // the study: shelves of books, a table of crystals, the enchanting table, the lectern
      for (const [x, z, f] of [[1, 2, 1], [1, 4, 1], [5, 2, 3], [5, 4, 3], [2, 5, 0], [4, 5, 0]]) { S.bookcase(x, 1, z, f); S.bookcase(x, 2, z, f, 4); }
      S.set(3, 1, 4, VB('enchanting_table', 'lectern'));
      S.book(1, 1, 3, 1); S.standShelf(5, 3, 3, [S.pick('magic'), S.pick('potions'), S.pick('magic'), S.pick('potions'), S.pick('magic'), S.pick('potions')]);
      S.set(2, 1, 1, VB('amethyst_cluster', 'candle')); S.set(4, 1, 1, 'candle');
      S.set(3, 4, 3, 'lantern', 1);
      // upstairs: his cot, star charts on the walls, a crystal on the desk
      S.bedAt(1, 6, 2, 2, st.bed[0]); S.table(5, 3, 6); S.pile(5, 7, 3, [S.pick('magic'), 'candle', S.pick('desk'), null]); S.chair(4, 3, 1, 6);
      S.hang(3, 7, 5, 0, ITEMS.empty_map ? 'empty_map' : 'paper'); S.hang(5, 8, 3, 3, ITEMS.clock ? 'clock' : 'compass');
      S.set(3, 9, 3, 'lantern', 1); S.chest(4, 6, 1, 0, 'library');
      // chimes and ivy outside
      for (const [x, z] of [[-1, 3], [7, 3], [3, -1], [3, 7]]) { S.set(x, 10, z, 'chain'); S.set(x, 9, z, VB('amethyst_cluster', 'lantern')); }
      if (B.vine !== undefined) for (const [x, z] of [[-1, 2], [-1, 4], [7, 2], [7, 4], [2, 7], [4, 7]]) for (let ly = 2; ly <= 8; ly++) if ((ly + x + z) % 3) S.set(x, ly, z, 'vine', 0);
      S.porch(3);
    },
  },
  // a farm plot: fenced, a water channel down the middle, crops, a scarecrow in the corner
  farm: {
    W: 9, D: 9, H: 5,
    plan(b, rnd) { b.job = 'farmer'; b.work = vWork(b, 4, -1, 2); b.crop = ['wheat_crop', 'carrot_crop', 'potato_crop', 'beetroot_crop'][Math.floor(rnd() * 4)]; b.crop2 = rnd() < 0.5 ? 'wheat_crop' : b.crop; },
    build(S) {
      const st = S.st, b = S.b;
      for (let lz = 0; lz < 9; lz++) for (let lx = 0; lx < 9; lx++) {
        const edge = lx === 0 || lx === 8 || lz === 0 || lz === 8;
        if (edge) { S.set(lx, 0, lz, 'dirt'); if (!(lz === 0 && lx === 4)) S.set(lx, 1, lz, st.fence); continue; }
        if (lz === 4) { S.set(lx, 0, lz, 'water'); S.set(lx, -1, lz, 'dirt'); continue; }
        S.set(lx, 0, lz, 'farmland', 0);
        const crop = lx < 4 ? b.crop : b.crop2, def = BLOCKS[B[crop]], stages = def && def.crop ? def.crop.stages : 4;
        S.set(lx, 1, lz, crop, Math.min(stages - 1, Math.floor(S.rnd() * stages)));
      }
      S.face(4, 1, 0, st.gate, 0);
      // the scarecrow
      S.set(1, 1, 1, st.fence); S.set(1, 2, 1, 'hay_bale'); S.set(1, 3, 1, VB('jack_o_lantern', 'hay_bale'), S.d(2) & 3);
      S.set(7, 1, 7, 'composter'); S.set(7, 1, 1, 'hay_bale');
    },
  },
  // a paddock with a shelter at the back
  pen: {
    W: 9, D: 7, H: 6,
    plan(b, rnd) { b.animals = ['sheep', 'cow', 'pig', 'chicken'][Math.floor(rnd() * 4)]; b.mid = vWorld(b, 4, 1, 2); },
    build(S) {
      const st = S.st;
      S.fill(0, 0, 0, 8, 0, 6, 'grass');
      for (let lz = 0; lz < 7; lz++) for (let lx = 0; lx < 9; lx++) if (lx === 0 || lz === 0 || lx === 8 || lz === 6) S.set(lx, 1, lz, st.fence);
      S.face(4, 1, 0, st.gate, 0);
      for (const x of [1, 7]) { S.log(x, 1, 5, st.log, 0); S.log(x, 2, 5, st.log, 0); }
      S.fill(0, 3, 4, 8, 3, 6, st.slab);
      S.set(2, 1, 5, 'hay_bale'); S.set(3, 1, 5, 'hay_bale'); S.set(2, 2, 5, 'hay_bale'); S.set(6, 1, 5, 'cauldron');
      S.set(-1, 1, 1, st.fence); S.set(-1, 2, 1, 'lantern');
    },
  },
  // a stable: an open-fronted barn with stalls, hay and tack
  stable: {
    W: 9, D: 7, H: 11,
    plan() {},
    build(S) {
      const st = S.st, b = S.b;
      S.floor(9, 7, st.planks);
      for (let ly = 1; ly <= 3; ly++) {
        for (let lz = 0; lz < 7; lz++) { S.set(0, ly, lz, lz % 3 === 0 ? st.log : st.planks); S.set(8, ly, lz, lz % 3 === 0 ? st.log : st.planks); }
        for (let lx = 1; lx < 8; lx++) S.set(lx, ly, 6, lx % 3 === 0 ? st.log : st.planks);
        for (let lx = 1; lx < 8; lx++) for (let lz = 0; lz < 6; lz++) S.set(lx, ly, lz, 0);
      }
      for (const x of [3, 5]) for (let lz = 2; lz <= 5; lz++) S.set(x, 1, lz, st.fence);
      for (const x of [1, 4, 7]) { S.set(x, 1, 5, 'hay_bale'); S.set(x, 1, 1, 'cauldron'); }
      S.set(2, 1, 5, 'hay_bale'); S.set(2, 2, 5, 'hay_bale');
      const roof = st.thatch;
      for (let lz = 0; lz <= 6; lz++) for (let lx = 0; lx <= 8; lx++) if (lx === 0 || lx === 8 || lz === 0 || lz === 6) S.log(lx, 4, lz, st.beamH || st.log, lz === 0 || lz === 6 ? 1 : 2);
      if (!st.flat) S.roofG(9, 0, 6, 4, roof[0], roof[1], st.planks, st.frame); else S.fill(0, 4, 0, 8, 4, 6, st.roof);
      S.hang(4, 3, 5, 0, ITEMS.saddle ? 'saddle' : ITEMS.lead ? 'lead' : 'leather'); S.set(4, 3, 3, 'lantern', 1);
    },
  },
  // a windmill on the edge of a village
  windmill: {
    W: 7, D: 7, H: 17,
    plan() {},
    build(S) {
      const st = S.st, sb = st.base2 || st.stone;
      const wall = (lx, lz) => (lx === 0 || lx === 6) ? lz >= 2 && lz <= 4 : (lz === 0 || lz === 6) ? lx >= 2 && lx <= 4 : (lx === 1 || lx === 5) && (lz === 1 || lz === 5);
      const inside = (lx, lz) => lx >= 1 && lx <= 5 && lz >= 1 && lz <= 5 && !wall(lx, lz);
      S.fill(1, 0, 1, 5, 0, 5, sb); S.fill(0, 0, 2, 6, 0, 4, sb); S.fill(2, 0, 0, 4, 0, 6, sb);
      for (let ly = 1; ly <= 10; ly++) for (let lz = 0; lz < 7; lz++) for (let lx = 0; lx < 7; lx++) {
        if (wall(lx, lz)) S.set(lx, ly, lz, ly <= 6 ? sb : st.planks);
        else if (inside(lx, lz)) S.set(lx, ly, lz, ly === 5 ? st.planks : 0);
      }
      S.door(3, 0, st.door);
      for (let ly = 1; ly <= 5; ly++) S.set(3, ly, 5, 'ladder', S.d(2));
      S.win(0, 3, 3, 3); S.win(6, 3, 3, 1); S.win(3, 8, 0, 0);
      const roof = st.thatch; S.hipRoof(3, 3, 4, 11, roof[0], roof[1], null);
      // the sails: a hub on the front, four arms with their cloth
      S.log(3, 9, -1, st.log, 2);
      for (let k = 1; k <= 3; k++) { S.set(3, 9 + k, -1, st.fence); S.set(3, 9 - k, -1, st.fence); S.set(3 + k, 9, -1, st.fence); S.set(3 - k, 9, -1, st.fence); }
      for (let k = 1; k <= 3; k++) { S.set(4, 9 + k, -1, 'wool'); S.set(2, 9 - k, -1, 'wool'); S.set(3 - k, 10, -1, 'wool'); S.set(3 + k, 8, -1, 'wool'); }
      S.set(2, 1, 2, 'hay_bale'); S.set(4, 1, 2, 'barrel'); S.set(2, 1, 4, 'barrel'); S.set(3, 1, 3, VB('stonecutter', 'barrel'));
      S.pile(4, 1, 4, ['wheat', 'bread', 'wheat', null]);
      vFrontPath(S, 3);
    },
  },
  // a covered market hall: stone columns, a big roof, stalls of everything under it
  market: {
    W: 11, D: 7, H: 12,
    plan() {},
    build(S) {
      const st = S.st, b = S.b, sb = VB('stone_bricks', st.stone);
      S.floor(11, 7, st.base2 || st.stone);
      for (let ly = 1; ly <= 3; ly++) for (let lz = 0; lz < 7; lz++) for (let lx = 0; lx < 11; lx++) S.set(lx, ly, lz, 0);
      for (const [x, z] of [[0, 0], [5, 0], [10, 0], [0, 3], [10, 3], [0, 6], [5, 6], [10, 6]]) for (let ly = 1; ly <= 3; ly++) S.set(x, ly, z, sb);
      for (let lz = 0; lz <= 6; lz++) for (let lx = 0; lx <= 10; lx++) if (lx === 0 || lx === 10 || lz === 0 || lz === 6) S.log(lx, 4, lz, st.beamH || st.log, lz === 0 || lz === 6 ? 1 : 2);
      const roof = st.roofs[(b.roofI || 0) % st.roofs.length];
      if (!st.flat) S.roofG(11, 0, 6, 4, roof[0], roof[1], st.plaster || st.planks, st.frame); else S.fill(0, 4, 0, 10, 4, 6, st.roof);
      const slab = VB(st.fwood + '_slab', st.slab);
      for (const [x0, kind] of [[2, 'food'], [7, 'goods']]) {
        for (let x = x0; x <= x0 + 2; x++) { S.set(x, 1, 2, slab, 1); S.set(x, 1, 4, 'barrel'); }
        S.pile(x0, 2, 2, [S.pick(kind), S.pick(kind), S.pick(kind), null]); S.pile(x0 + 2, 2, 2, [S.pick(kind), null, S.pick(kind), S.pick(kind)]);
        S.set(x0 + 1, 2, 4, 'hay_bale');
      }
      S.pile(5, 1, 3, ['apple', 'carrot', 'potato', 'bread']);
      S.set(5, 3, 3, 'lantern', 1); S.set(2, 3, 3, 'lantern', 1); S.set(8, 3, 3, 'lantern', 1);
    },
  },
});

// ---- planning a town --------------------------------------------------------------------------------------------
{
  const basePlan = WorldGen.prototype.planVillage;
  const OUTSKIRTS = new Set(['farm', 'pen', 'windmill', 'stable']);
  const WANT = {
    village: ['hall', 'smithy', 'farm', 'house_m', 'workshop', 'house_s', 'farm', 'pen', 'windmill', 'house_s', 'store', 'workshop', 'house_m', 'stable', 'farm'],
    town: ['hall', 'chapel', 'smithy', 'store', 'library', 'council', 'tower', 'tavern', 'store', 'workshop', 'stable', 'house_m', 'house_l', 'market', 'house_m', 'workshop', 'house_s'],
    city: ['hall', 'council', 'chapel', 'smithy', 'library', 'store', 'store', 'tavern', 'tower', 'sage', 'market', 'stable', 'tower', 'workshop', 'house_l', 'house_l', 'house_m', 'workshop', 'store', 'house_m', 'library'],
  };
  const FILL = {
    village: [['house_s', 35], ['house_m', 18], ['workshop', 15], ['farm', 18], ['pen', 8], ['stable', 6]],
    town: [['house_m', 30], ['house_s', 14], ['house_l', 16], ['workshop', 16], ['store', 12], ['stable', 4], ['pen', 4], ['farm', 4]],
    city: [['house_l', 32], ['house_m', 26], ['workshop', 14], ['store', 16], ['house_s', 6], ['stable', 3], ['tavern', 3]],
  };
  const weighted = (list, q) => { let t = list.reduce((a, [, w]) => a + w, 0) * q; for (const [k, w] of list) { if ((t -= w) <= 0) return k; } return list[0][0]; };

  WorldGen.prototype.planVillage = function (rx, rz, F) {
    if ((this.genVersion || 1) < 5) return basePlan.call(this, rx, rz, F);
    if (!F && this.campaignTownAt) F = this.campaignTownAt(rx, rz);
    if (!F && this.campaignTownsNear && this.campaignTownsNear(rx * VREG + VREG / 2, rz * VREG + VREG / 2, VREG * 1.1)) return null;
    const rnd = mulberry32(hash32(this.seed, rx, rz, 4242));
    if (rnd() > 0.66 && !F) return null;
    const q = rnd();
    const tier = F ? (F.tier || 'town') : q < 0.12 ? 'city' : q < 0.46 ? 'town' : 'village';
    const TT = TOWN_TIERS[tier], P = TT.P, hw = TT.hw;
    const m = tier === 'city' ? 140 : tier === 'town' ? 112 : 84;
    let cx = rx * VREG + m + Math.floor(rnd() * (VREG - 2 * m)), cz = rz * VREG + m + Math.floor(rnd() * (VREG - 2 * m));
    if (F) { cx = F.x; cz = F.z; }
    const c = this.column(cx, cz);
    if (!F) {
      if (![BIOME.PLAINS, BIOME.FOREST, BIOME.TAIGA, BIOME.DESERT].includes(c.biome)) return null;
      if (c.h <= SEA || c.h > SEA + 30) return null;
      let lo = c.h, hi = c.h, wet = 0;
      const rings = tier === 'village' ? [14, 28] : [16, 32, 48];
      for (let a = 0; a < 12; a++) for (const d of rings) {
        const qq = this.column(cx + Math.round(Math.cos(a / 12 * TAU) * d), cz + Math.round(Math.sin(a / 12 * TAU) * d));
        lo = Math.min(lo, qq.h); hi = Math.max(hi, qq.h); if (qq.h <= SEA) wet++;
      }
      if (hi - lo > (tier === 'village' ? 11 : 14) || wet > (tier === 'village' ? 4 : 6)) return null;
    }
    const style = (F && F.style && VSTYLE[F.style]) ? F.style : c.biome === BIOME.DESERT ? 'desert' : c.biome === BIOME.TAIGA ? (c.temp < -0.38 ? 'snowy' : 'taiga') : (c.temp > 0.28 && c.humid < 0.02 ? 'savanna' : 'plains');
    const st = VSTYLE[style];
    let name = VSYL[0][Math.floor(rnd() * VSYL[0].length)] + VSYL[1][Math.floor(rnd() * VSYL[1].length)];
    if (F && F.name) name = F.name;
    const y0 = F ? Math.max(SEA + 1, c.h) : c.h;
    const fr = F && F.fountain ? Math.max(3, TT.fr) : TT.fr;
    const plan = { id: 't' + rx + '_' + rz, rx, rz, name, style, st, tier, P, hw, fr, x: cx, z: cz, y: y0, roads: [], streets: [], blds: [], lamps: [], decor: [], banners: [], trees: [],
      x0: cx - P - 1, z0: cz - P - 1, x1: cx + P + 1, z1: cz + P + 1, seed: hash32(this.seed, rx, rz, 4244), town: F ? F.town : null };
    const taken = [[cx - P - 1, cz - P - 1, cx + P + 1, cz + P + 1]];
    const free = (a) => !taken.some(t => a[0] <= t[2] && a[2] >= t[0] && a[1] <= t[3] && a[3] >= t[1]);
    const grow = (a) => { plan.x0 = Math.min(plan.x0, a[0]); plan.z0 = Math.min(plan.z0, a[1]); plan.x1 = Math.max(plan.x1, a[2]); plan.z1 = Math.max(plan.z1, a[3]); };
    const cellsOf = (ox, oz, d, t0, t1, w) => { const out = [], ax = DXL[d], az = DZL[d]; for (let t = t0; t <= t1; t++) for (let s = -w; s <= w; s++) { const x = ox + ax * t + (-az) * s, z = oz + az * t + ax * s; out.push([x, z, this.column(x, z).h]); } return out; };
    const rectOf = (S, pad = 0) => { const ax = DXL[S.d], az = DZL[S.d], ex = [S.ox + ax * S.t0 - Math.abs(az) * S.hw, S.oz + az * S.t0 - Math.abs(ax) * S.hw], ey = [S.ox + ax * S.L + Math.abs(az) * S.hw, S.oz + az * S.L + Math.abs(ax) * S.hw]; return [Math.min(ex[0], ey[0]) - pad, Math.min(ex[1], ey[1]) - pad, Math.max(ex[0], ey[0]) + pad, Math.max(ex[1], ey[1]) + pad]; };
    // the main streets out of the square
    const skip = F ? (F.skipRoad != null ? F.skipRoad : -1) : (tier === 'village' && rnd() < 0.25 ? Math.floor(rnd() * 4) : -1);
    for (let d = 0; d < 4; d++) {
      if (d === skip) continue;
      const L = (F && F.roadLen) ? F.roadLen + Math.floor(rnd() * 6) : TT.L[0] + Math.floor(rnd() * (TT.L[1] - TT.L[0] + 1));
      const road = { d, L, hw, ox: cx, oz: cz, t0: P + 1, cells: [] };
      plan.roads.push(road); taken.push(rectOf(road));
    }
    // side streets off the main streets (a town's back lanes)
    if (TT.sides) for (const road of plan.roads) for (let k = 0; k < TT.sides; k++) {
      const tb = P + 13 + k * 20; if (tb + 10 > road.L) break;
      for (const side of [1, -1]) {
        if (rnd() < 0.15) continue;
        const d2 = (road.d + (side > 0 ? 1 : 3)) & 3, ox = cx + DXL[road.d] * tb, oz = cz + DZL[road.d] * tb;
        const len = TT.sideLen[0] + Math.floor(rnd() * (TT.sideLen[1] - TT.sideLen[0] + 1));
        const S = { d: d2, L: len, hw: 1, ox, oz, t0: hw + 1, side: true, cells: [] };
        plan.streets.push(S); taken.push(rectOf(S));
      }
    }
    // the lots: along both sides of every street, nearest the square first
    const slots = [];
    for (const S of plan.roads.concat(plan.streets)) for (const side of [1, -1]) slots.push({ S, side, t: S.side ? S.t0 + 1 : P + 2 });
    const fit = (slot, T) => {
      const S = slot.S, ax = DXL[S.d], az = DZL[S.d], nx = -az * slot.side, nz = ax * slot.side, front = S.hw + 2;
      for (let t = slot.t, tries = 0; t + T.W - 1 <= S.L - 1 && tries < 40; t += 2, tries++) {
        const tc = t + (T.W - 1) / 2, doorX = S.ox + ax * tc + nx * front, doorZ = S.oz + az * tc + nz * front;
        const r = vDirOf(-nx, -nz), [ddx, ddz] = vRot(r, (T.W - 1) / 2, 0), ox = doorX - ddx, oz = doorZ - ddz;
        const cs = [[0, 0], [T.W - 1, 0], [0, T.D - 1], [T.W - 1, T.D - 1]].map(([lx, lz]) => { const [a, b2] = vRot(r, lx, lz); return [ox + a, oz + b2]; });
        const box = [Math.min(...cs.map(p => p[0])), Math.min(...cs.map(p => p[1])), Math.max(...cs.map(p => p[0])), Math.max(...cs.map(p => p[1]))];
        if (!free([box[0] - 1, box[1] - 1, box[2] + 1, box[3] + 1])) continue;
        if (!F) { let bad = false; for (const [qx, qz] of cs) { const h = this.column(qx, qz).h; if (h <= SEA - 1 || Math.abs(h - y0) > 10) { bad = true; break; } } if (bad) continue; }
        return { t, r, ox, oz, box };
      }
      return null;
    };
    const signs = (F && F.want && F.signs) ? F.signs : null, decors = (F && F.decors) ? F.decors : null;
    const place = (type, wi) => {
      const T = VTEMPLATES[type]; if (!T) return null;
      const out = OUTSKIRTS.has(type);
      let best = null;
      for (const slot of slots) {
        const f = fit(slot, T); if (!f) continue;
        const mx = (f.box[0] + f.box[2]) / 2 - cx, mz = (f.box[1] + f.box[3]) / 2 - cz, d = Math.hypot(mx, mz) + (slot.S.side ? 4 : 0);
        const score = out ? -d : d;
        if (!best || score < best.score) best = { slot, f, score };
      }
      if (!best) return null;
      const { f, slot } = best;
      const mid = this.column((f.box[0] + f.box[2]) >> 1, (f.box[1] + f.box[3]) >> 1);
      const b = { type, r: f.r, ox: f.ox, oz: f.oz, W: T.W, D: T.D, H: T.H, y: F ? y0 : mid.h, x0: f.box[0], z0: f.box[1], x1: f.box[2], z1: f.box[3], seed: hash32(this.seed, f.ox, f.oz, 4243), job: null, beds: [], work: null, tier, roofI: 0, seats: [] };
      b.roofI = hash32(b.seed, 3, 1, 7) % st.roofs.length;
      if (wi != null && signs && signs[wi]) b.sign = signs[wi];
      if (wi != null && decors && decors[wi]) b.decor = decors[wi];
      if (T.plan) T.plan(b, rnd, st);
      plan.blds.push(b); taken.push(f.box); grow([f.box[0] - 3, f.box[1] - 3, f.box[2] + 3, f.box[3] + 3]);
      slot.t = f.t + T.W + TT.gap[0] + Math.floor(rnd() * (TT.gap[1] - TT.gap[0] + 1));
      return b;
    };
    const want = (F && F.want && F.want.length) ? F.want : WANT[tier];
    want.forEach((k, i) => place(k, F ? i : null));
    if (!(F && F.noFill)) for (let k = plan.blds.length, tries = 0; k < TT.cap && tries < TT.cap * 2; tries++) { if (place(weighted(FILL[tier], rnd()), null)) k++; }
    if (plan.blds.length < 3 && !F) return null;
    // the streets end where the town does (and run on a little past its walls)
    let bx0 = cx - P, bz0 = cz - P, bx1 = cx + P, bz1 = cz + P;
    for (const b of plan.blds) { bx0 = Math.min(bx0, b.x0); bz0 = Math.min(bz0, b.z0); bx1 = Math.max(bx1, b.x1); bz1 = Math.max(bz1, b.z1); }
    for (const S of plan.streets) { const r = rectOf(S); bx0 = Math.min(bx0, r[0]); bz0 = Math.min(bz0, r[1]); bx1 = Math.max(bx1, r[2]); bz1 = Math.max(bz1, r[3]); }
    const wallKind = F ? (F.walls || (F.palisade ? 'wood' : null)) : tier === 'city' ? 'stone' : tier === 'town' && rnd() < 0.6 ? 'wood' : null;
    const mg = 4;
    if (wallKind) plan.wall = { kind: wallKind, x0: bx0 - mg, z0: bz0 - mg, x1: bx1 + mg, z1: bz1 + mg, h: wallKind === 'stone' ? 6 : 5 };
    const edge = plan.wall || { x0: bx0 - 2, z0: bz0 - 2, x1: bx1 + 2, z1: bz1 + 2 };
    for (const road of plan.roads) {
      const reach = road.d === 0 ? cz - edge.z0 : road.d === 1 ? edge.x1 - cx : road.d === 2 ? edge.z1 - cz : cx - edge.x0;
      road.L = Math.max(P + 4, reach + (plan.wall ? 10 : 4));
      road.cells = cellsOf(cx, cz, road.d, P + 1, road.L, hw);
      grow(rectOf(road, 2));
    }
    for (const S of plan.streets) { S.cells = cellsOf(S.ox, S.oz, S.d, S.t0, S.L, 1); grow(rectOf(S, 2)); }
    if (plan.wall) grow([plan.wall.x0 - 4, plan.wall.z0 - 4, plan.wall.x1 + 4, plan.wall.z1 + 4]);
    // lamps and wayside things
    const doors = plan.blds.filter(b => b.H > 4).map(b => vWorld(b, (b.W - 1) / 2, 0, -1));
    const inBld = (x, z) => plan.blds.some(b => x >= b.x0 - 1 && x <= b.x1 + 1 && z >= b.z0 - 1 && z <= b.z1 + 1);
    const onStreet = (x, z) => plan.roads.concat(plan.streets).some(S => { const r = rectOf(S); return x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]; });
    for (const S of plan.roads.concat(plan.streets)) {
      const ax = DXL[S.d], az = DZL[S.d], o = S.hw + 1, t0 = S.side ? S.t0 + 3 : P + 4;
      for (let t = t0, i = 0; t < S.L - 1; t += S.side ? 9 : 8, i++) { const s = i % 2 ? o : -o; plan.lamps.push([S.ox + ax * t + (-az) * s, S.oz + az * t + ax * s]); }
      for (let t = t0 + 2; t < S.L - 1; t += 2 + Math.floor(rnd() * 4)) if (rnd() < 0.35) { const s = rnd() < 0.5 ? o : -o; plan.decor.push([S.ox + ax * t + (-az) * s, S.oz + az * t + ax * s, Math.floor(rnd() * 9)]); }
    }
    const nearDoor = ([x, z]) => doors.some(d => Math.abs(d[0] - x) + Math.abs(d[2] - z) <= 2);
    plan.lamps = plan.lamps.filter(q2 => !nearDoor(q2) && !inBld(q2[0], q2[1]) && !onStreetCross(q2));
    function onStreetCross(q2) { return plan.roads.concat(plan.streets).filter(S => { const r = rectOf(S); return q2[0] >= r[0] && q2[0] <= r[2] && q2[1] >= r[1] && q2[1] <= r[3]; }).length > 0; }
    plan.decor = plan.decor.filter(q2 => !nearDoor(q2) && !inBld(q2[0], q2[1]) && !onStreet(q2[0], q2[1]) && !plan.lamps.some(l => Math.abs(l[0] - q2[0]) + Math.abs(l[1] - q2[1]) <= 1));
    // the market square's furniture
    plan.board = [cx + 4, y0 + 2, cz - (P - 1)];
    plan.bell = [cx - 4, y0 + 1, cz - (P - (tier === 'city' ? 2 : 2))];
    plan.seats = [];
    if (fr) {
      for (const dz of [-1, 0, 1]) { plan.seats.push([cx - (fr + 3), y0 + 1, cz + dz, 1]); plan.seats.push([cx + fr + 3, y0 + 1, cz + dz, 3]); }
      plan.waySpot = [cx, cz - fr - 3];
    } else for (const dz of [-3, -4, -5]) plan.seats.push([cx - 6, y0 + 1, cz + dz, 1]);
    if (tier === 'village') plan.stalls = [{ x: cx + 4, z: cz + 5, wares: 'merchant', f: 0 }, { x: cx - 4, z: cz + 5, wares: 'baker', f: 0 }];
    else {
      const sx = P - 5, sz = P - 4;
      plan.stalls = [{ x: cx + sx, z: cz + sz, wares: 'merchant', f: 0 }, { x: cx - sx, z: cz + sz, wares: 'baker', f: 0 }, { x: cx + sx, z: cz - sz - 2, deco: true, f: 2 }, { x: cx - sx, z: cz - sz - 2, deco: true, f: 2 }];
      if (tier === 'city') plan.stalls.push({ x: cx + sx - 4, z: cz + sz, deco: true, f: 0 }, { x: cx - sx + 4, z: cz + sz, deco: true, f: 0 });
      plan.trees = tier === 'city' ? [[fr + 3, fr + 3], [-(fr + 3), fr + 3], [fr + 3, -(fr + 3)], [-(fr + 3), -(fr + 3)]].map(([a, b2]) => [cx + a, cz + b2]) : [];
      plan.banners = [[cx + P - 1, cz + hw + 3], [cx - (P - 1), cz + hw + 3], [cx + P - 1, cz - hw - 3], [cx - (P - 1), cz - hw - 3]];
    }
    // the evening seats inside (the inn's chairs) after the square's benches
    for (const b of plan.blds) for (const s of b.seats || []) plan.seats.push(s);
    // the people: a bed is a home; the workplaces give the jobs
    const beds = []; for (const b of plan.blds) for (const bd of b.beds) beds.push(bd);
    const jobs = [];
    const hall = plan.blds.find(b => b.type === 'hall');
    if (hall) jobs.push(['elder', hall.elderAt], ['innkeeper', hall.work]);
    for (const s of plan.stalls) if (!s.deco) jobs.push([s.wares, { at: [s.x, y0 + 1, s.z + 1], face: 0 }]);
    for (const b of plan.blds) if (b.job && b.type !== 'hall') jobs.push([b.job, b.work]);
    plan.folk = beds.slice(0, TT.folk).map((home, i) => ({ home, job: i < jobs.length ? jobs[i][0] : 'none', work: i < jobs.length ? jobs[i][1] : null }));
    if (!hall && plan.folk.length) plan.folk[plan.folk.length - 1].job = 'elder';
    plan.guards = TT.guards; plan.golems = 0;
    plan.r = Math.max(plan.x1 - cx, cx - plan.x0, plan.z1 - cz, cz - plan.z0);
    if (F && F.town) {
      for (const f of plan.folk) if (f.job === 'elder' || f.job === 'innkeeper' || (F.noJobs && F.noJobs.includes(f.job))) f.job = 'none';
      if (F.empty) { plan.folk = []; plan.guards = 0; plan.empty = true; plan.stalls = plan.stalls.map(s => Object.assign({}, s, { deco: true })); }
      if (F.fountain) plan.fountain = F.fountain;
      if (F.guards != null) plan.guards = F.guards;
    }
    return plan;
  };
}

// ---- building it into a chunk -------------------------------------------------------------------------------------
{
  const baseInto = WorldGen.prototype.buildVillageInto;
  WorldGen.prototype.buildVillageInto = function (ch, v) {
    if (!v.tier) return baseInto.call(this, ch, v);
    const bx = ch.cx * 16, bz = ch.cz * 16, st = v.st;
    const inC = (x, z) => x >= bx && x < bx + 16 && z >= bz && z < bz + 16;
    const soft = (id) => !id || !T_SOLID[id] || T_LIQUID[id] || BLOCKS[id].render === RENDER.CROSS || /leaves|log|snow_layer/.test(BLOCKS[id].key);
    const put = (x, y, z, key, meta = 0) => { if (!inC(x, z) || y < 1 || y >= CH) return; const id = key ? B[key] : 0; if (id === undefined) return; const i = cidx(x - bx, y, z - bz); ch.blocks[i] = id; ch.meta[i] = meta; ch.blockEntities.delete(i); };
    const get = (x, y, z) => ch.blocks[cidx(x - bx, y, z - bz)];
    const pave = v.style === 'desert' ? TOWN_PAVE.desert : v.tier === 'village' ? st.path : TOWN_PAVE[v.tier];
    const lanePave = v.style === 'desert' ? TOWN_PAVE.desert : v.tier === 'city' ? TOWN_PAVE.town : st.path;
    const paveAt = (x, z, list) => list[Math.floor(hashFloat(x, z, v.seed, 7) * list.length)] || st.path[0];
    const faceMeta = (f) => (f + 2) & 3;
    const y0 = v.y, P = v.P;
    // the streets: following the land, bridged over water
    for (const road of v.roads.concat(v.streets || [])) {
      const list = road.side ? lanePave : pave;
      for (const [x, z, h] of road.cells) {
        if (!inC(x, z)) continue;
        if (h < SEA) { put(x, SEA, z, st.planks === 'smooth_sandstone' ? 'jungle_planks' : st.planks); for (let y = SEA + 1; y <= SEA + 3; y++) put(x, y, z, 0); continue; }
        put(x, h, z, paveAt(x, z, list));
        for (let y = h + 1; y <= h + 5; y++) if (soft(get(x, y, z))) put(x, y, z, 0);
        if (get(x, h - 1, z) === 0 || T_LIQUID[get(x, h - 1, z)]) put(x, h - 1, z, 'dirt');
      }
    }
    // the square: level and paved, a stone kerb round it
    for (let dz = -P; dz <= P; dz++) for (let dx = -P; dx <= P; dx++) {
      const x = v.x + dx, z = v.z + dz;
      if (!inC(x, z) || Math.abs(dx) + Math.abs(dz) > P * 2 - 3) continue;
      const rim = Math.max(Math.abs(dx), Math.abs(dz)) === P && !(Math.abs(dx) <= v.hw || Math.abs(dz) <= v.hw);
      put(x, y0, z, rim ? (st.base3 || st.stone) : paveAt(x, z, pave));
      for (let y = y0 + 1; y <= y0 + 8; y++) put(x, y, z, 0);
      for (let y = y0 - 1; y > 1 && soft(get(x, y, z)); y--) put(x, y, z, 'dirt');
    }
    const fr = v.fr;
    if (fr) {
      // the fountain: a broad basin, a statue on a column in the middle
      const sb = 'stone_bricks' in B ? 'stone_bricks' : st.stone;
      for (let dz = -fr; dz <= fr; dz++) for (let dx = -fr; dx <= fr; dx++) {
        const x = v.x + dx, z = v.z + dz;
        if (!inC(x, z) || Math.abs(dx) + Math.abs(dz) > fr * 2 - 1) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dz)), rim = d === fr || Math.abs(dx) + Math.abs(dz) === fr * 2 - 1, mid = d === 0;
        put(x, y0 - 2, z, sb); put(x, y0 - 1, z, rim || mid ? sb : 'water'); put(x, y0, z, rim || mid ? sb : 'water');
        if (rim) put(x, y0 + 1, z, 'stone_brick_slab' in B ? 'stone_brick_slab' : st.stoneSlab);
        if (mid) {
          put(x, y0 + 1, z, 'chiseled_stone_bricks' in B ? 'chiseled_stone_bricks' : sb);
          for (let y = y0 + 2; y <= y0 + 3; y++) put(x, y, z, 'polished_andesite' in B ? 'polished_andesite' : sb);
          put(x, y0 + 4, z, 'chiseled_quartz_block' in B ? 'chiseled_quartz_block' : 'chiseled_stone_bricks');
          put(x, y0 + 5, z, 'lantern');
        }
        if (d === 1 && fr >= 4 && Math.abs(dx) + Math.abs(dz) === 2) put(x, y0, z, sb);
      }
    } else {
      // the well
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const x = v.x + dx, z = v.z + dz;
        if (!inC(x, z)) continue;
        const rim = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        for (let y = y0 - 4; y <= y0; y++) put(x, y, z, rim ? st.stone : 'water');
        put(x, y0 - 5, z, st.stone);
        if (rim) put(x, y0 + 1, z, st.stoneSlab);
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) { put(x, y0 + 1, z, st.stone); put(x, y0 + 2, z, st.fence); put(x, y0 + 3, z, st.fence); }
        const roof = st.thatch || [st.stairs, st.slab];
        put(x, y0 + 4, z, roof[1]);
        if (dx === 0 && dz === 0) { put(x, y0 + 4, z, st.planks); put(x, y0 + 3, z, 'lantern', 1); }
      }
    }
    // the quest board under its little roof, the bell, the benches
    for (const k of [3, 4]) { const x = v.x + k, z = v.board[2]; put(x, y0 + 1, z, st.log); put(x, y0 + 2, z, 'quest_board', faceMeta(2)); put(x, y0 + 3, z, st.slab); }
    for (const k of [2, 5]) { put(v.x + k, y0 + 1, v.board[2], st.fence); put(v.x + k, y0 + 2, v.board[2], 'lantern'); }
    put(v.bell[0], y0 + 1, v.bell[2], st.log); put(v.bell[0], y0 + 2, v.bell[2], 'bell');
    for (const s of v.seats) if (s.length === 4) put(s[0], y0 + 1, s[2], VB(st.fwood + '_bench', st.stairs), (s[3] + 2) & 3);
    // market stalls round the square
    v.stalls.forEach((s, si) => {
      const aw = si % 2 ? st.awning2 : st.awning, f = s.f || 0;
      for (let k = 0; k <= 2; k++) for (let dx = -1; dx <= 1; dx++) {
        const dz = f === 2 ? 2 - k : k, x = s.x + dx, z = s.z + dz;
        if (Math.abs(dx) === 1 && (k === 0 || k === 2)) { put(x, y0 + 1, z, st.fence); put(x, y0 + 2, z, st.fence); }
        else if (k === 0) put(x, y0 + 1, z, st.slab, 1);
        else if (k === 2) put(x, y0 + 1, z, 'barrel');
        put(x, y0 + 3, z, (aw && aw[(dx + 1) % aw.length]) || st.planks);
      }
      // goods on the counter
      const zc = s.z + (f === 2 ? 2 : 0), goods = s.wares === 'baker' ? ['bread', 'pumpkin_pie', 'bread', 'apple'] : s.wares === 'merchant' ? ['bowl', 'candle', 'string', 'apple'] : (hash32(v.seed, si, 3, 1) & 1 ? townDecor('food') : townDecor('goods'));
      if (inC(s.x, zc)) { const i = cidx(s.x - bx, y0 + 2, zc - bz); ch.blocks[i] = B.item_pile; ch.meta[i] = 0; ch.blockEntities.set(i, { type: 'pile', items: [0, 1, 2, 3].map(k => { const id = goods[(k + si) % goods.length]; return id && ITEMS[id] ? { id, n: 1 } : null; }), rot: [0.3, -0.4, 0.8, 0.1] }); }
    });
    // trees in planters, banners on poles, lamps at the corners
    const leaves = st.leaves || 'leaves';
    for (const [x, z] of v.trees || []) {
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (inC(x + dx, z + dz)) { put(x + dx, y0, z + dz, dx || dz ? (st.base3 || st.stone) : 'grass'); if (dx || dz) put(x + dx, y0 + 1, z + dz, 'stone_brick_slab' in B ? 'stone_brick_slab' : st.stoneSlab); }
      for (let y = y0 + 1; y <= y0 + 4; y++) put(x, y, z, st.log);
      for (let dy = 4; dy <= 6; dy++) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy - 5) < 4 && !(dx === 0 && dz === 0 && dy === 4) && inC(x + dx, z + dz) && get(x + dx, y0 + dy, z + dz) === 0) put(x + dx, y0 + dy, z + dz, leaves);
    }
    for (const [x, z] of v.banners || []) { if (!inC(x, z)) continue; for (let y = y0 + 1; y <= y0 + 6; y++) put(x, y, z, st.fence); put(x, y0 + 7, z, 'lantern'); }
    for (const [x, z] of v.banners || []) for (const [dx, dz] of [[1, 0], [-1, 0]]) { const xx = x + dx; if (!inC(xx, z) || Math.abs(xx - v.x) >= P) continue; for (let y = y0 + 4; y <= y0 + 6; y++) put(xx, y, z, st.banner[(y + dx + 4) % st.banner.length]); }
    for (const [dx, dz] of [[P - 2, P - 2], [-(P - 2), P - 2], [-(P - 2), -(P - 2)], [P - 2, -(P - 2)]]) { const x = v.x + dx, z = v.z + dz; if (Math.abs(dx) + Math.abs(dz) > P * 2 - 3) continue; put(x, y0 + 1, z, st.lampPost); put(x, y0 + 2, z, st.lampPost); put(x, y0 + 3, z, st.lampPost); put(x, y0 + 4, z, 'lantern'); }
    for (const [x, z] of v.lamps) {
      if (!inC(x, z)) continue;
      const y = this.column(x, z).h; if (y < SEA) continue;
      put(x, y, z, st.base3 || st.stone); put(x, y + 1, z, st.lampPost); put(x, y + 2, z, st.lampPost); put(x, y + 3, z, st.lampPost); put(x, y + 4, z, 'lantern');
      for (let yy = y + 5; yy <= y + 6; yy++) if (soft(get(x, yy, z))) put(x, yy, z, 0);
    }
    for (const [x, z, k] of v.decor) {
      if (!inC(x, z)) continue;
      const y = this.column(x, z).h; if (y < SEA) continue;
      for (let yy = y + 1; yy <= y + 3; yy++) if (soft(get(x, yy, z))) put(x, yy, z, 0);
      if (k <= 1) { put(x, y + 1, z, 'hay_bale'); if (k === 0) put(x, y + 2, z, 'hay_bale'); }
      else if (k <= 3) { put(x, y + 1, z, 'barrel'); if (k === 2) put(x, y + 2, z, 'barrel'); }
      else if (k === 4) put(x, y + 1, z, v.tier === 'village' ? 'composter' : VB('azalea', 'barrel'));
      else if (k === 5) { put(x, y + 1, z, st.fence); put(x, y + 2, z, VB(st.fwood + '_slab', st.slab)); }
      else { put(x, y, z, v.style === 'desert' ? 'sand' : 'grass'); put(x, y + 1, z, v.style === 'desert' ? 'dead_bush' : k === 8 ? 'rose_bush' : VFLOWERS[(x * 7 + z) & 7]); }
    }
    // the buildings: ground cleared, a foundation, the building, a sign by the door
    for (const b of v.blds) {
      if (b.x1 + 3 < bx || b.x0 - 3 > bx + 15 || b.z1 + 3 < bz || b.z0 - 3 > bz + 15) continue;
      const T = VTEMPLATES[b.type];
      const found = T === VTEMPLATES.farm || T === VTEMPLATES.pen ? 'dirt' : (st.base2 || st.stone);
      for (let z = Math.max(b.z0 - 1, bz); z <= Math.min(b.z1 + 1, bz + 15); z++) for (let x = Math.max(b.x0 - 1, bx); x <= Math.min(b.x1 + 1, bx + 15); x++) {
        const inside = x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
        for (let y = b.y + 1; y <= Math.min(CH - 1, b.y + T.H + 1); y++) if (inside || soft(get(x, y, z))) put(x, y, z, 0);
        if (!inside) continue;
        put(x, b.y, z, found);
        for (let y = b.y - 1; y > 1 && soft(get(x, y, z)); y--) put(x, y, z, found);
      }
      const S = vStamp(ch, b, st);
      T.build(S);
      if (b.sign) {
        const dx = (b.W - 1) / 2 + 2, [wx] = vRot(b.r, 0, -1);
        const i = S.set(dx, 1, -1, 'oak_sign' in B ? 'oak_sign' : 'spruce_sign', wx !== 0 ? 4 : 0);
        if (i >= 0) { ch.blockEntities.set(i, { type: 'sign', lines: [].concat(b.sign).slice(0, 4).concat(['', '', '', '']).slice(0, 4) }); const below = S.get(dx, 0, -1); if (below === 0 || (below > 0 && !T_SOLID[below])) S.set(dx, 0, -1, st.path[0]); }
      }
    }
    if (v.wall) townWall(this, v, put, get, inC, soft);
  };
}
// the town's wall: stone with a walkway, crenels, corner towers and gatehouses (or a palisade of logs with watchtowers)
function townWall(gen, v, put, get, inC, soft) {
  const W = v.wall, stone = W.kind === 'stone', st = v.st;
  const sb = 'stone_bricks' in B ? 'stone_bricks' : st.stone, mixes = ['stone_bricks', 'stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks', 'stone_bricks'].filter(k => B[k] !== undefined);
  const log = 'spruce_log' in B ? 'spruce_log' : st.log, fence = 'spruce_fence' in B ? 'spruce_fence' : st.fence, planks = 'spruce_planks' in B ? 'spruce_planks' : st.planks;
  const wb = (x, y, z) => mixes[Math.floor(hashFloat(x * 3 + y, z, v.seed, 11) * mixes.length)] || sb;
  const ground = (x, z) => Math.max(gen.column(x, z).h, SEA);
  const gate = (x, z) => v.roads.some(r => {
    const g = r.hw + 1;
    if (r.d === 0) return z === W.z0 && Math.abs(x - v.x) <= g; if (r.d === 2) return z === W.z1 && Math.abs(x - v.x) <= g;
    if (r.d === 1) return x === W.x1 && Math.abs(z - v.z) <= g; return x === W.x0 && Math.abs(z - v.z) <= g;
  });
  const H = W.h;
  const wallAt = (x, z, ix, iz) => {
    if (!inC(x, z)) return;
    const h = ground(x, z);
    for (let y = h; y > h - 4 && soft(get(x, y, z)); y--) put(x, y, z, stone ? sb : 'dirt');
    if (gate(x, z)) {
      // the gateway: an arch over the road
      if (stone) { for (let y = h + 6; y <= h + H + 1; y++) put(x, y, z, wb(x, y, z)); if ((x + z) % 2 === 0) put(x, h + H + 2, z, sb); }
      else { put(x, h + 6, z, log, (W.x0 === x || W.x1 === x) ? 0 : 1); }
      return;
    }
    if (stone) {
      for (let y = h + 1; y <= h + H; y++) put(x, y, z, wb(x, y, z));
      if ((x + z) % 2 === 0) put(x, h + H + 1, z, wb(x, h + H + 1, z));
      // the walkway behind the parapet
      const xi = x + ix, zi = z + iz;
      if (inC(xi, zi)) { const hi = ground(xi, zi); for (let y = hi + 1; y <= h + H - 1; y++) put(xi, y, zi, wb(xi, y, zi)); }
    } else {
      for (let y = h + 1; y <= h + H; y++) put(x, y, z, log);
      if ((x + z) % 2 === 0) put(x, h + H + 1, z, fence);
    }
  };
  for (let x = W.x0; x <= W.x1; x++) { wallAt(x, W.z0, 0, 1); wallAt(x, W.z1, 0, -1); }
  for (let z = W.z0 + 1; z < W.z1; z++) { wallAt(W.x0, z, 1, 0); wallAt(W.x1, z, -1, 0); }
  // towers at the corners, and either side of every gate
  const towers = [[W.x0, W.z0], [W.x1, W.z0], [W.x0, W.z1], [W.x1, W.z1]];
  for (const r of v.roads) {
    const g = r.hw + (stone ? 4 : 3);
    if (r.d === 0) towers.push([v.x - g, W.z0], [v.x + g, W.z0]); else if (r.d === 2) towers.push([v.x - g, W.z1], [v.x + g, W.z1]);
    else if (r.d === 1) towers.push([W.x1, v.z - g], [W.x1, v.z + g]); else towers.push([W.x0, v.z - g], [W.x0, v.z + g]);
  }
  for (const [tx, tz] of towers) {
    const h = ground(tx, tz), R = stone ? 2 : 1, TH = stone ? H + 4 : H + 4;
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const x = tx + dx, z = tz + dz; if (!inC(x, z)) continue;
      const edge = Math.abs(dx) === R || Math.abs(dz) === R;
      for (let y = h; y > h - 4 && soft(get(x, y, z)); y--) put(x, y, z, stone ? sb : 'dirt');
      if (stone) {
        for (let y = h + 1; y <= h + TH; y++) put(x, y, z, edge ? wb(x, y, z) : (y === h + H ? planks : 0));
        put(x, h + TH, z, sb);
        if (edge && (dx + dz) % 2 === 0) put(x, h + TH + 1, z, sb);
        if (edge && (dx === 0 || dz === 0) && dx !== dz) put(x, h + H - 2, z, 'iron_bars' in B ? 'iron_bars' : 'glass_pane');
      } else {
        const post = Math.abs(dx) === R && Math.abs(dz) === R;
        for (let y = h + 1; y <= h + TH + 2; y++) put(x, y, z, post ? log : y === h + TH - 1 ? planks : 0);
        if (edge && !post) put(x, h + TH, z, fence);
        put(x, h + TH + 3, z, 'spruce_slab' in B ? 'spruce_slab' : st.slab);
      }
    }
    // a way in from the town side, a ladder up to the top
    const ix = tx < v.x ? 1 : -1, iz = tz < v.z ? 1 : -1, sideX = Math.abs(tx - v.x) > Math.abs(tz - v.z);
    const dx0 = sideX ? ix * R : 0, dz0 = sideX ? 0 : iz * R;
    if (inC(tx + dx0, tz + dz0)) { put(tx + dx0, h + 1, tz + dz0, 0); put(tx + dx0, h + 2, tz + dz0, 0); }
    if (stone && inC(tx, tz - dz0 / R * 0 - (sideX ? 0 : 0))) {
      const lx = tx - (sideX ? ix : 0), lz = tz - (sideX ? 0 : iz);
      if (inC(lx, lz)) for (let y = h + 1; y <= h + TH; y++) put(lx, y, lz, 'ladder', sideX ? (ix > 0 ? 3 : 1) : (iz > 0 ? 0 : 2));
    }
    if (inC(tx, tz)) put(tx, h + TH + (stone ? 1 : 0), tz, 'lantern');
  }
}

// a waystone (and the campaign's Resonance Anchors) stands in the square, where the plan keeps a spot for it
{
  const baseSite = waySiteFor;
  waySiteFor = function (g, v) {
    if (v && v.waySpot) {
      const [x, z] = v.waySpot, w = g.world;
      if (!w.isLoaded(x, z)) return null;
      const y = findSafeY(w, x, z);
      if (y >= 1 && Math.abs(y - (v.y + 1)) <= 3 && !w.getBlock(x, y, z) && !w.getBlock(x, y + 1, z)) return [x, y, z];
    }
    return baseSite(g, v);
  };
}
