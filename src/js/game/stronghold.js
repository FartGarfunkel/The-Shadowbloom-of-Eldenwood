// ---------------------------------------------------------------------------
// game/stronghold.js — 0.9.0.19: strongholds.
//
// Three of them, deep under the Overworld, in a ring some seven hundred to a
// thousand blocks from the world's middle. Eyes of Ender fly towards the
// nearest. Inside: stone-brick halls, a library with an old book about the
// End, a storeroom, and the portal room, where twelve frames ring a pool of
// lava. Set an eye in every frame and the portal opens (game/theend.js).
// ---------------------------------------------------------------------------
STRUCT_LOOT.stronghold = [['ender_pearl', 1, 2, 0.45], ['iron_ingot', 1, 5, 0.5], ['gold_ingot', 1, 3, 0.3], ['bread', 1, 3, 0.5], ['apple', 1, 3, 0.4], ['redstone', 4, 9, 0.3],
  ['diamond', 1, 3, 0.15], ['iron_sword', 1, 1, 0.12], ['iron_pickaxe', 1, 1, 0.12], ['iron_chestplate', 1, 1, 0.1], ['golden_apple', 1, 1, 0.08], ['ender_eye', 1, 2, 0.15], ['cinder_powder', 1, 3, 0.25]];
STRUCT_LOOT.stronghold_library = [['book', 1, 5, 0.7], ['paper', 2, 8, 0.6], ['ender_pearl', 1, 1, 0.2], ['tome_blink', 1, 1, 0.12], ['tome_ward', 1, 1, 0.1], ['tome_levitate', 1, 1, 0.1], ['experience_bottle', 1, 3, 0.25], ['compass', 1, 1, 0.15], ['map', 1, 1, 0.12]];
const STRONGHOLD = defStruct({ key: 'stronghold', name: 'a stronghold', reg: 1 << 20, chance: 0, margin: 0, dims: [0], plan: () => null, build: (P, S) => buildStronghold(P, S) });
// where they are: chosen once for each world (clear of any land already changed) and kept
WorldGen.prototype.strongholds = function () {
  if (this.dim !== 0) return [];
  if (this._sh) return this._sh;
  const ctx = typeof VILLAGE_CTX !== 'undefined' ? VILLAGE_CTX : null, meta = ctx && ctx.meta;
  let list = meta && meta.strongholds;
  if (!list) {
    list = [];
    const rnd = mulberry32(this.seed ^ 0x57A0D), a0 = rnd() * TAU, rec = ctx && ctx.records;
    for (let k = 0; k < 3; k++) {
      let pos = null;
      for (let t = 0; t < 12 && !pos; t++) {
        const a = a0 + k * TAU / 3 + (t ? (rnd() - 0.5) * 0.9 : 0), r = 720 + rnd() * 360;
        const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
        let clear = true;
        if (rec && rec.size) for (let cz = (z - 42) >> 4; cz <= (z + 12) >> 4 && clear; cz++) for (let cx = (x - 20) >> 4; cx <= (x + 20) >> 4; cx++) if (rec.has(chunkKey(0, cx, cz))) { clear = false; break; }
        if (!clear) continue;
        const h = this.column(x, z).h;
        pos = [x, clamp(h - 30, 12, 34), z, h];
      }
      if (pos) list.push(pos);
    }
    if (meta) meta.strongholds = list; else return list.map((c, i) => this.strongholdRec(c, i));
  }
  return (this._sh = list.map((c, i) => this.strongholdRec(c, i)));
};
WorldGen.prototype.strongholdRec = function (c, i) {
  const [cx, cy, cz, h] = c;
  return { k: STRONGHOLD.idx, kind: 'stronghold', id: 'sh_' + i, name: 'a Stronghold', cx, cy, cz, top: h || 64, y: cy, x0: cx - 19, x1: cx + 19, z0: cz - 39, z1: cz + 9,
    seed: hash32(cx, cy, cz, this.seed), spawners: [{ at: [cx, cy + 1, cz + 6], mob: 'cave_spider' }], portal: [cx + 0.5, cy + 3, cz + 2.5] };
};
WorldGen.prototype.nearestStronghold = function (x, z) {
  let best = null, bd = Infinity;
  for (const S of this.strongholds()) { const d = Math.hypot(S.portal[0] - x, S.portal[2] - z); if (d < bd) { bd = d; best = S.portal; } }
  return best;
};
{
  const baseSNK = WorldGen.prototype.structsNearKind;
  WorldGen.prototype.structsNearKind = function (k, x, z, pad = 0) {
    if (k !== STRONGHOLD.idx) return baseSNK.call(this, k, x, z, pad);
    if (this.dim !== 0) return [];
    return this.strongholds().filter(S => x >= S.x0 - pad && x <= S.x1 + pad && z >= S.z0 - pad && z <= S.z1 + pad);
  };
}
function buildStronghold(P, S) {
  const { cx, cy, cz } = S;
  const wallK = (x, y, z) => P.pick(['stone_bricks', 'stone_bricks', 'stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks'], x, y, z, 3);
  // the rooms and halls (inside measurements); each gets a shell of brick, then they're hollowed out together
  const rooms = [
    [cx - 4, cy + 1, cz - 7, cx + 4, cy + 8, cz + 7],        // the portal room
    [cx - 1, cy + 1, cz - 24, cx + 1, cy + 4, cz - 8],       // the hall from it
    [cx - 4, cy + 1, cz - 33, cx + 4, cy + 6, cz - 25],      // the crossing
    [cx + 5, cy + 1, cz - 30, cx + 12, cy + 4, cz - 28],     // east hall
    [cx - 12, cy + 1, cz - 30, cx - 5, cy + 4, cz - 28],     // west hall
    [cx - 18, cy + 1, cz - 37, cx - 13, cy + 7, cz - 21],    // the library
    [cx + 13, cy + 1, cz - 34, cx + 17, cy + 4, cz - 24],    // the storeroom
  ];
  for (const [x0, y0, z0, x1, y1, z1] of rooms) P.fill(x0 - 1, y0 - 1, z0 - 1, x1 + 1, y1 + 1, z1 + 1, wallK);
  for (const [x0, y0, z0, x1, y1, z1] of rooms) P.fill(x0, y0, z0, x1, y1, z1, 'air');
  // ---- the portal room: a raised dais, the frames round a pool of lava, a cage of spiders behind ----
  P.fill(cx - 3, cy + 1, cz - 1, cx + 3, cy + 2, cz + 5, 'stone_bricks');
  P.fill(cx - 1, cy + 1, cz - 2, cx + 1, cy + 1, cz - 2, 'stone_brick_slab');
  const pz = cz + 2, fy = cy + 3;
  for (let i = -1; i <= 1; i++) for (const [x, z] of [[cx + i, pz - 2], [cx + i, pz + 2], [cx - 2, pz + i], [cx + 2, pz + i]]) P.put(x, fy, z, P.h(x, fy, z, 11) < 0.1 ? 'end_portal_frame_eye' : 'end_portal_frame');
  P.fill(cx - 1, fy - 1, pz - 1, cx + 1, fy - 1, pz + 1, 'lava');
  P.fill(cx - 1, fy, pz - 1, cx + 1, fy, pz + 1, 'air');
  P.put(cx, cy + 1, cz + 6, 'monster_spawner');
  for (const [x, z] of [[cx - 4, cz - 7], [cx + 4, cz - 7], [cx - 4, cz + 7], [cx + 4, cz + 7]]) P.put(x, cy + 1, z, 'lantern');
  // iron bars in the walls looking in from the halls
  for (const x of [cx - 3, cx + 3]) P.fill(x, cy + 2, cz - 8, x, cy + 3, cz - 8, 'iron_bars');
  // ---- the crossing: lanterns and a fountain of stone ----
  for (const [x, z] of [[cx - 4, cz - 33], [cx + 4, cz - 33], [cx - 4, cz - 25], [cx + 4, cz - 25]]) P.put(x, cy + 1, z, 'lantern');
  P.fill(cx - 1, cy + 1, cz - 30, cx + 1, cy + 1, cz - 28, 'stone_brick_slab');
  P.put(cx, cy + 2, cz - 29, 'chiseled_stone_bricks');
  // ---- the library: walls of books, an old book on its stand, a chest ----
  for (let z = cz - 37; z <= cz - 21; z++) for (let y = cy + 1; y <= cy + 5; y++) {
    P.put(cx - 18, y, z, P.h(cx - 18, y, z, 5) < 0.12 ? 'cobweb' : 'bookshelf');
    if (z < cz - 31 || z > cz - 27) P.put(cx - 13, y, z, 'bookshelf');
  }
  P.fill(cx - 17, cy + 6, cz - 37, cx - 14, cy + 6, cz - 21, 'planks');
  for (let z = cz - 35; z <= cz - 23; z += 4) P.put(cx - 15, cy + 5, z, 'lantern');
  P.lectern(cx - 15, cy + 1, cz - 33, 2, 'end');
  P.chest(cx - 16, cy + 1, cz - 24, 2, 'stronghold_library');
  // ---- the storeroom ----
  P.chest(cx + 17, cy + 1, cz - 33, 3, 'stronghold');
  P.chest(cx + 17, cy + 1, cz - 25, 3, 'stronghold');
  for (const [x, z] of [[cx + 13, cz - 34], [cx + 16, cz - 30], [cx + 14, cz - 26]]) P.put(x, cy + 1, z, 'barrel');
  P.put(cx + 15, cy + 1, cz - 29, 'lantern');
  for (const [x, y, z] of [[cx + 13, cy + 4, cz - 24], [cx + 17, cy + 4, cz - 34], [cx + 16, cy + 4, cz - 29]]) P.put(x, y, z, 'cobweb');
  // ---- a stair up: a narrow shaft with a ladder, from the crossing towards the surface (it stops short) ----
  const top = Math.min((S.top || 64) - 7, cy + 32);
  if (top > cy + 9) {
    P.fill(cx + 1, cy + 6, cz - 33, cx + 3, top + 1, cz - 31, wallK);
    P.fill(cx + 2, cy + 7, cz - 32, cx + 2, top, cz - 32, 'air');
    P.put(cx + 2, cy + 6, cz - 32, 'air');
    P.ladder(cx + 2, cy + 1, top, cz - 32, 0);
    for (let y = cy + 1; y <= cy + 6; y++) P.put(cx + 2, y, cz - 33, wallK(cx + 2, y, cz - 33));
  }
}
