// ---------------------------------------------------------------------------
// game/villageflat.js — (0.9.0.11, terrain version 4) villages on level ground.
//
// The land under a village (the plaza, its roads and every building's lot) is
// levelled to the plaza's height, and blends back into the hills around it over
// a few blocks. Roads run flat from door to door, and every doorway opens onto
// the path at the height of its floor.
//
// Old worlds keep their villages as they were. After "Upgrade terrain", any
// village whose ground hasn't been changed yet comes out level too; one where
// someone has already built, dug or opened a door stays as it was (so nothing
// is ever cut in half).
// ---------------------------------------------------------------------------
{
  const VF_R = 10;                         // how far the level ground blends back into the land
  const baseCol = WorldGen.prototype.column;
  const baseAt = WorldGen.prototype.villageAt;

  // level, or as it was? Decided once per village, and remembered in the world
  function vFlatDecide(gen, v) {
    if (gen.dim !== 0 || (gen.genVersion || 1) < 4) return false;
    const ctx = typeof VILLAGE_CTX !== 'undefined' ? VILLAGE_CTX : null;
    const meta = ctx && ctx.meta;
    if (!meta || (meta.seed | 0) !== gen.seed) return true;        // the title screen's world, or a fresh one
    const fb = meta.villageFlat || (meta.villageFlat = {});
    if (fb[v.id] === undefined) {
      let clear = true;
      const rec = ctx.records, m = VF_R + 2;
      if (rec && rec.size) {
        for (let cz = (v.z0 - m) >> 4; cz <= (v.z1 + m) >> 4 && clear; cz++)
          for (let cx = (v.x0 - m) >> 4; cx <= (v.x1 + m) >> 4; cx++) if (rec.has(chunkKey(0, cx, cz))) { clear = false; break; }
      }
      fb[v.id] = clear ? 1 : 0;
    }
    return !!fb[v.id];
  }

  // a level village: every building on the plaza's height, the roads too
  function vFlatten(gen, v) {
    v.flat = vFlatDecide(gen, v);
    if (!v.flat) return;
    const y0 = v.y, P = v.P || VPLAZA;
    v.biome = baseCol.call(gen, v.x, v.z).biome;
    const R = v.flatRects = [[v.x - P - 2, v.z - P - 2, v.x + P + 2, v.z + P + 2]];
    for (const road of v.roads.concat(v.streets || [])) {
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
      for (const c of road.cells) { c[2] = y0; x0 = Math.min(x0, c[0]); z0 = Math.min(z0, c[1]); x1 = Math.max(x1, c[0]); z1 = Math.max(z1, c[1]); }
      if (x0 <= x1) R.push([x0 - 2, z0 - 2, x1 + 2, z1 + 2]);
    }
    const moved = new Set();
    const shift = (o, dy) => { if (o && Array.isArray(o.at) && !moved.has(o)) { moved.add(o); o.at[1] += dy; } };
    for (const b of v.blds) {
      const dy = y0 - b.y;
      if (dy) {
        for (const bd of b.beds) shift(bd, dy);
        shift(b.work, dy); shift(b.elderAt, dy);
        if (Array.isArray(b.mid) && !moved.has(b.mid)) { moved.add(b.mid); b.mid[1] += dy; }
        for (const s of b.seats || []) if (!moved.has(s)) { moved.add(s); s[1] += dy; }
        b.y = y0;
      }
      R.push([b.x0 - 2, b.z0 - 2, b.x1 + 2, b.z1 + 2]);
    }
    // (alpha 2) a town's walls stand on level ground too
    if (v.wall) { const W = v.wall, m = 3; R.push([W.x0 - m, W.z0 - m, W.x1 + m, W.z0 + m], [W.x0 - m, W.z1 - m, W.x1 + m, W.z1 + m], [W.x0 - m, W.z0 - m, W.x0 + m, W.z1 + m], [W.x1 - m, W.z0 - m, W.x1 + m, W.z1 + m]); }
    let fx0 = 1e9, fz0 = 1e9, fx1 = -1e9, fz1 = -1e9;
    for (const r of R) { fx0 = Math.min(fx0, r[0]); fz0 = Math.min(fz0, r[1]); fx1 = Math.max(fx1, r[2]); fz1 = Math.max(fz1, r[3]); }
    v.fb = [fx0 - VF_R - 1, fz0 - VF_R - 1, fx1 + VF_R + 1, fz1 + VF_R + 1];
  }
  // how strongly this column is pulled to the village's level (1 = right on it)
  function vFlatWeight(v, x, z) {
    const f = v.fb;
    if (!f || x < f[0] || x > f[2] || z < f[1] || z > f[3]) return 0;
    let d = 1e9;
    for (const r of v.flatRects) {
      const dx = Math.max(r[0] - x, 0, x - r[2]), dz = Math.max(r[1] - z, 0, z - r[3]);
      if (dx === 0 && dz === 0) return 1;
      d = Math.min(d, Math.hypot(dx, dz));
    }
    return d >= VF_R ? 0 : 1 - smoothstep(0, VF_R, d);
  }

  WorldGen.prototype.villageAt = function (rx, rz) {
    const cache = this.vilCache, key = rx + ',' + rz;
    if (cache && cache.has(key)) return cache.get(key);
    this._vplan = (this._vplan || 0) + 1;                       // planning reads the land as it lies
    let v = null;
    try { v = baseAt.call(this, rx, rz); } finally { this._vplan--; }
    if (v && v.flat === undefined) vFlatten(this, v);
    return v;
  };

  // the level villages whose ground reaches into this chunk
  function vFlatNear(gen, x, z) {
    const cx = x >> 4, cz = z >> 4, key = (cx + 32768) * 65536 + (cz + 32768);
    const cache = gen._vfCache || (gen._vfCache = new Map());
    let list = cache.get(key);
    if (list) return list;
    list = [];
    const bx = cx * 16, bz = cz * 16;
    for (const v of gen.villagesNear(bx + 8, bz + 8, 8 + VF_R + 4)) {
      if (!v.flat || !v.fb) continue;
      if (v.fb[2] < bx || v.fb[0] > bx + 15 || v.fb[3] < bz || v.fb[1] > bz + 15) continue;
      list.push(v);
    }
    if (cache.size > 4000) cache.clear();
    cache.set(key, list);
    return list;
  }

  WorldGen.prototype.column = function (x, z) {
    const c = baseCol.call(this, x, z);
    if (this.dim !== 0 || this._vplan || (this.genVersion || 1) < 4) return c;
    const list = vFlatNear(this, x, z);
    if (!list.length) return c;
    let best = 0, bv = null;
    for (const v of list) { const w = vFlatWeight(v, x, z); if (w > best) { best = w; bv = v; } }
    if (!bv) return c;
    const h = Math.round(c.h + (bv.y - c.h) * best);
    if (h === c.h) return c;
    const out = { h, biome: c.biome, temp: c.temp, humid: c.humid };
    if (c.river && h <= SEA) out.river = c.river;
    if (h > SEA + 1 && (c.biome === BIOME.OCEAN || c.biome === BIOME.BEACH)) out.biome = bv.biome;
    return out;
  };
}
