// ---------------------------------------------------------------------------
// game/townlife.js — (alpha 3) living towns.
//
// Cloth that moves in the wind: flags (they stream out the way the wind blows), banners that hang and ripple, bunting
// strung across the square and between the market stalls, washing hung out on lines between the houses, and shop signs
// swinging on their brackets over the doors. All of it is part of the world's blocks (you can take them down, craft
// your own and put them up at home), and all of it moves on the graphics card, so a town full of flags costs nothing.
// The towns put them up as they're built (version 6 terrain: new worlds, or older ones upgraded in the world settings):
// a flag on every tower of the walls and on the watchtowers, the town's banners on the square's poles and either side of
// every gate, bunting over the square, washing lines in the lanes, and signs over the shops.
// ---------------------------------------------------------------------------

// a colour's flag or banner for a block of wool ('red_wool' → 'red_flag')
function clothKey(wool, kind) {
  const c = !wool || wool === 'wool' ? 'white' : String(wool).replace(/_wool$/, '');
  const k = c + '_' + kind;
  return B[k] !== undefined ? k : 'white_' + kind;
}
// ---- the shapes (pixels): facing f is the way a flag streams out; a banner's face; a line's run; the wall a sign hangs from
const CLOTH_PALETTE = ['red_wool', 'yellow_wool', 'blue_wool', 'wool', 'green_wool', 'orange_wool', 'light_blue_wool', 'magenta_wool'];
function clothBoxes(def, meta) {
  const t = def.clothTex, out = [];
  if (def.cloth === 'flag') {
    // eight strips from the pole (at the south edge) out to the tip, a hem along the top
    for (let i = 0; i < 8; i++) out.push({ b: [7.6, 5, 14 - i * 2, 8.4, 15, 16 - i * 2], side: t, end: t, k: 'len' });
    out.push({ b: [7.5, 14.5, 12, 8.5, 15.2, 16], side: t, end: t, k: 'len' });
  } else if (def.cloth === 'banner') {
    const low = !!(meta & 4);
    if (!low) out.push({ b: [0, 14.5, 7, 16, 16, 9], side: 'spruce_log_side', end: 'spruce_log_top', k: 'none' });
    const top = low ? 16 : 14.5, bot = low ? 3 : 0;
    const n = 6, h = (top - bot) / n;
    for (let i = 0; i < n; i++) out.push({ b: [2, top - (i + 1) * h, 7.6, 14, top - i * h, 8.4], side: t, end: t, k: 'depth' });
    if (low) { out.push({ b: [3, 1.5, 7.6, 13, 3, 8.4], side: t, end: t, k: 'depth' }); out.push({ b: [5, 0, 7.6, 11, 1.5, 8.4], side: t, end: t, k: 'depth' }); }
  } else if (def.cloth === 'bunting' || def.cloth === 'line') {
    const sag = -((meta >> 2) & 15) * 0.5;
    out.push({ b: [0, 14, 7.8, 16, 14.5, 8.2], side: 'rope', end: 'rope', k: 'rope', lift: sag });
    if (def.cloth === 'bunting') {
      for (let j = 0; j < 2; j++) {
        const x0 = 1 + j * 8, c = CLOTH_PALETTE[(j + (meta >> 6 & 3) * 2) % CLOTH_PALETTE.length], tt = B[c] !== undefined ? BLOCKS[B[c]].tex : 'wool';
        const tex = typeof tt === 'string' ? tt : 'wool';
        out.push({ b: [x0, 11.5, 7.85, x0 + 6, 14, 8.15], side: tex, end: tex, k: 'pen', lift: sag }, { b: [x0 + 1, 9.5, 7.85, x0 + 5, 11.5, 8.15], side: tex, end: tex, k: 'pen', lift: sag }, { b: [x0 + 2, 7.5, 7.85, x0 + 4, 9.5, 8.15], side: tex, end: tex, k: 'pen', lift: sag });
      }
    } else {
      // a shirt and a sheet (or a pair of breeches), pegged out
      const v = (meta >> 6) & 3, A = ['wool', 'light_blue_wool', 'yellow_wool', 'pink_wool'][v], Bc = ['light_blue_wool', 'wool', 'brown_wool', 'wool'][v];
      const ta = B[A] !== undefined ? A : 'wool', tb = B[Bc] !== undefined ? Bc : 'wool';
      out.push({ b: [2, 7, 7.85, 8, 14, 8.15], side: ta, end: ta, k: 'pen', lift: sag }, { b: [1, 11.5, 7.85, 2, 14, 8.15], side: ta, end: ta, k: 'pen', lift: sag }, { b: [8, 11.5, 7.85, 9, 14, 8.15], side: ta, end: ta, k: 'pen', lift: sag });
      out.push({ b: [10, 4, 7.85, 15, 14, 8.15], side: tb, end: tb, k: 'pen', lift: sag });
    }
  } else if (def.cloth === 'shopsign') {
    // a bracket out from the wall (at the north edge), two short chains, a board hanging between them
    out.push({ b: [7.5, 14.5, 0, 8.5, 16, 14], side: 'spruce_log_side', end: 'spruce_log_side', k: 'none' });
    out.push({ b: [7.6, 15.5, 0, 8.4, 16.5, 2], side: 'spruce_log_side', end: 'spruce_log_side', k: 'none' });
    out.push({ b: [7.75, 11.5, 3, 8.25, 14.5, 3.5], side: 'chain', end: 'chain', k: 'hang' }, { b: [7.75, 11.5, 12, 8.25, 14.5, 12.5], side: 'chain', end: 'chain', k: 'hang' });
    out.push({ b: [7.4, 3, 2, 8.6, 11.5, 14], side: 'spruce_planks', end: 'spruce_planks', k: 'hang' });
    out.push({ b: [7.2, 4, 3.5, 8.8, 10.5, 12.5], side: 'dark_oak_planks', end: 'dark_oak_planks', k: 'hang' });
  }
  return out;
}
// the static shapes (for picking a block out, breaking it, and its picture in your bag)
for (const b of BLOCKS) if (b.cloth) SHAPES[b.shape] = clothBoxes(b, 0).map(x => ({ b: x.b.slice(), side: x.side, end: x.end }));
// ---- in the mesh: each vertex learns how far it is from what holds it, and the terrain shader moves it in the wind
// (sway codes 48..63: flaps across z, 64..79: across x, by how far out; 4..15: swings on its hook)
{
  const baseEmit = emitShape;
  emitShape = function (mb, ri, id, x, y, z, meta) {
    const def = BLOCKS[id];
    if (!def.cloth) return baseEmit(mb, ri, id, x, y, z, meta);
    const rf = meta & 3, sk = R_SKY[ri] * 17, bl = Math.max(R_BL[ri], T_LIGHT[id]) * 17;
    for (const box of clothBoxes(def, meta)) {
      const v0 = mb.vcount;
      addShapeBox(mb, rf ? Object.assign({}, box, { b: rotBox(box.b, rf) }) : box, x, y, z, 1 / 16, sk, bl, box.lift || 0, rf);
      clothSway(mb, v0, mb.vcount, box.k, rf, x, y, z, meta, def);
    }
  };
}
function clothSway(mb, v0, v1, k, rf, x, y, z, meta, def) {
  if (k === 'none') return;
  for (let v = v0; v < v1; v++) {
    const o = v * 7, vx = mb.f[o] - x, vy = mb.f[o + 1] - y, vz = mb.f[o + 2] - z;
    let s = 0;
    if (k === 'len') {
      // the flag: nothing at the pole, most at the tip; which way it flaps by which way it streams
      const d = rf === 0 ? 1 - vz : rf === 1 ? vx : rf === 2 ? vz : 1 - vx;
      s = (rf & 1 ? 48 : 64) + Math.round(clamp(d, 0, 1) * 15);
    } else if (k === 'depth') {
      const d = (meta & 4) ? 0.45 + (1 - vy) * 0.55 : (1 - vy) * 0.45;
      s = (rf & 1 ? 64 : 48) + Math.round(clamp(d, 0, 1) * 15);
    } else if (k === 'pen') {
      const d = clamp((14 / 16 - vy) / 0.55, 0, 1) * 0.85 + 0.1;
      s = (rf & 1 ? 64 : 48) + Math.round(d * 15);
    } else if (k === 'rope') s = SWAY.HANG + 1;
    else if (k === 'hang') s = SWAY.HANG + Math.round(clamp((1 - vy) * 1.1, 0, 1) * 11);
    mb.u8[v * VSTRIDE + 23] = s;
  }
}
// ---- your own: wool and sticks -------------------------------------------------------------------------------------
for (const [c] of COLORS) {
  const wool = c === 'white' ? 'wool' : c + '_wool';
  if (B[c + '_flag'] === undefined || B[wool] === undefined) continue;
  RECIPES.push({ out: c + '_flag', n: 2, shape: ['SWW', 'SWW', 'S  '], key: { W: wool, S: 'stick' }, group: 'deco' });
  RECIPES.push({ out: c + '_banner', n: 1, shape: ['SSS', 'WWW', 'WWW'], key: { W: wool, S: 'stick' }, group: 'deco' });
}
RECIPES.push({ out: 'bunting', n: 6, shape: ['SSS', 'ABC'], key: { S: 'string', A: 'red_wool', B: 'yellow_wool', C: 'blue_wool' }, group: 'deco' });
RECIPES.push({ out: 'washing_line', n: 3, shape: ['SSS', 'W W'], key: { S: 'string', W: 'wool' }, group: 'deco' });
RECIPES.push({ out: 'hanging_shop_sign', n: 1, shape: ['LLL', ' C ', ' P '], key: { L: 'stick', C: 'chain', P: 'spruce_planks' }, group: 'deco' });

// placing them yourself: a flag streams out the way the wind blows; a banner faces you; a line runs the way you look;
// a sign hangs off the wall you put it against (and a banner under a banner hangs on as its lower half)
{
  const basePlace = LocalPlayer.prototype.placement;
  if (basePlace) LocalPlayer.prototype.placement = function (hit, bid) {
    const def = BLOCKS[bid];
    if (!def || !def.cloth) return basePlace.call(this, hit, bid);
    const r = basePlace.call(this, hit, bid);
    try {
      const look = this.lookDir(), g = this.g;
      let m = 0;
      if (def.cloth === 'flag') m = townWindOf(g.world.gen);
      else if (def.cloth === 'banner') { m = (look + 2) & 3; if (r) { const below = g.world.getBlock(r.x, r.y + 1, r.z); if (BLOCKS[below] && BLOCKS[below].cloth === 'banner') m = (g.world.getMeta(r.x, r.y + 1, r.z) & 3) | 4; } }
      else if (def.cloth === 'shopsign') m = hit && hit.face != null ? [2, 0, 3, 1, 0, 0][hit.face] ?? look : look;
      else m = look & 1;
      if (r && typeof r === 'object') { r.meta = m; return r; }
    } catch (e) { /* the default way */ }
    return r;
  };
}

// ---- the towns put them up ---------------------------------------------------------------------------------------------
{
  const basePlan = WorldGen.prototype.planVillage;
  WorldGen.prototype.planVillage = function (rx, rz, F) {
    const plan = basePlan.call(this, rx, rz, F);
    if (plan && plan.tier && (this.genVersion || 1) >= 6) try { townLifePlan(this, plan); } catch (e) { console.warn('town life', e); }
    return plan;
  };
}
function townLifePlan(gen, v) {
  const L = v.life = { lines: [], signs: [], bunting: [] };
  const rnd = mulberry32(hash32(v.seed, 61, 3, 9));
  const streets = v.roads.concat(v.streets || []);
  const rectOf = (S) => { const ax = DXL[S.d], az = DZL[S.d], ex = [S.ox + ax * S.t0 - Math.abs(az) * S.hw, S.oz + az * S.t0 - Math.abs(ax) * S.hw], ey = [S.ox + ax * S.L + Math.abs(az) * S.hw, S.oz + az * S.L + Math.abs(ax) * S.hw]; return [Math.min(ex[0], ey[0]), Math.min(ex[1], ey[1]), Math.max(ex[0], ey[0]), Math.max(ex[1], ey[1])]; };
  const rects = streets.map(rectOf);
  const onStreet = (x, z) => rects.some(r => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]);
  const inBld = (x, z, m) => v.blds.some(b => x >= b.x0 - m && x <= b.x1 + m && z >= b.z0 - m && z <= b.z1 + m);
  const doors = v.blds.map(b => vWorld(b, (b.W - 1) / 2, 0, -1));
  const nearDoor = (x, z) => doors.some(d => Math.abs(d[0] - x) + Math.abs(d[2] - z) <= 2);
  const lampNear = (x, z) => v.lamps.some(l => Math.abs(l[0] - x) + Math.abs(l[1] - z) <= 1);
  const inWalls = (x, z) => !v.wall || (x > v.wall.x0 + 2 && x < v.wall.x1 - 2 && z > v.wall.z0 + 2 && z < v.wall.z1 - 2);
  const plaza = (x, z) => Math.abs(x - v.x) <= v.P + 1 && Math.abs(z - v.z) <= v.P + 1;
  // washing lines in the lanes, where a heap of barrels or hay would have gone
  const maxLines = v.tier === 'village' ? 2 : v.tier === 'town' ? 3 : 4;
  const keep = [];
  for (const d of v.decor) {
    const [x, z] = d;
    if (L.lines.length >= maxLines || rnd() > 0.45) { keep.push(d); continue; }
    const S = streets.find((S, i) => { const r = rects[i]; return x >= r[0] - 2 && x <= r[2] + 2 && z >= r[1] - 2 && z <= r[3] + 2; });
    if (!S) { keep.push(d); continue; }
    const ax = Math.abs(DXL[S.d]), az = Math.abs(DZL[S.d]), h0 = gen.column(x, z).h;
    let ok = true;
    for (let j = -2; j <= 2 && ok; j++) {
      const cx = x + ax * j, cz = z + az * j;
      if (inBld(cx, cz, 0) || onStreet(cx, cz) || nearDoor(cx, cz) || lampNear(cx, cz) || !inWalls(cx, cz) || plaza(cx, cz) || Math.abs(gen.column(cx, cz).h - h0) > 0) ok = false;
      if (keep.some(q => q[0] === cx && q[1] === cz)) ok = false;
    }
    if (!ok) { keep.push(d); continue; }
    L.lines.push({ x, z, ax, az, y: h0, v: Math.floor(rnd() * 4) });
  }
  v.decor = keep;
  // shop signs over the doors of the places with something to sell
  const SHOPS = new Set(['smithy', 'store', 'tavern', 'hall', 'library', 'sage', 'stable', 'market', 'workshop', 'chapel']);
  for (const b of v.blds) {
    if (!SHOPS.has(b.type) || (b.H || 5) < 4) continue;
    const dx = (b.W - 1) / 2 - 2, [x, y, z] = vWorld(b, dx, 3, -1);
    L.signs.push([x, y, z, (2 + b.r) & 3]);
  }
  // bunting: over the square from pole to pole, and between the market stalls
  if (v.banners && v.banners.length >= 4) {
    for (const zz of [v.z + v.hw + 3, v.z - v.hw - 3]) L.bunting.push({ x0: v.x - (v.P - 2), x1: v.x + (v.P - 2), z: zz, y: v.y + 7, ax: 1 });
  }
  const pairs = {};
  for (const s of v.stalls || []) (pairs[s.f + ':' + s.z] = pairs[s.f + ':' + s.z] || []).push(s);
  for (const P of Object.values(pairs)) if (P.length >= 2) {
    P.sort((a, b) => a.x - b.x);
    const a = P[0], b = P[P.length - 1];
    if (b.x - a.x >= 6) L.bunting.push({ x0: a.x + 2, x1: b.x - 2, z: a.z + 1, y: v.y + 3, ax: 1 });
  }
}
{
  const baseInto = WorldGen.prototype.buildVillageInto;
  WorldGen.prototype.buildVillageInto = function (ch, v) {
    const r = baseInto.call(this, ch, v);
    if (v && v.tier && v.life && (this.genVersion || 1) >= 6) try { townLifeBuild(this, ch, v); } catch (e) { console.warn('town life build', e); }
    return r;
  };
}
function townLifeBuild(gen, ch, v) {
  const bx = ch.cx * 16, bz = ch.cz * 16, st = v.st, L = v.life;
  const inC = (x, z) => x >= bx && x < bx + 16 && z >= bz && z < bz + 16;
  const put = (x, y, z, key, meta = 0) => { if (!inC(x, z) || y < 1 || y >= CH) return; const id = key ? B[key] : 0; if (id === undefined) return; const i = cidx(x - bx, y, z - bz); ch.blocks[i] = id; ch.meta[i] = meta; ch.blockEntities.delete(i); };
  const get = (x, y, z) => inC(x, z) && y >= 0 && y < CH ? ch.blocks[cidx(x - bx, y, z - bz)] : -1;
  const air = (x, y, z) => get(x, y, z) === 0;
  const wind = townWindOf(gen);
  const cols = (st.banner || ['red_wool']).map(w => w);
  const y0 = v.y;
  // the square's poles: the town's banners hang beside them, top and bottom
  for (const [x, z] of v.banners || []) for (const dx of [1, -1]) {
    const xx = x + dx; if (!inC(xx, z) || Math.abs(xx - v.x) >= v.P) continue;
    const key = clothKey(cols[(dx + 1) / 2 % cols.length], 'banner');
    put(xx, y0 + 4, z, 0); put(xx, y0 + 5, z, key, 0 | 4); put(xx, y0 + 6, z, key, 0);
  }
  // bunting: from one end to the other, sagging in the middle
  for (const bu of L.bunting) {
    const n = bu.x1 - bu.x0;
    for (let x = bu.x0; x <= bu.x1; x++) {
      if (!inC(x, bu.z) || !air(x, bu.y, bu.z)) continue;
      const u = n ? ((x - bu.x0) / n) * 2 - 1 : 0, sag = Math.round(7 * (1 - u * u));
      put(x, bu.y, bu.z, 'bunting', 0 | (sag << 2) | ((x & 3) << 6));
    }
  }
  // washing lines: a post at each end, the line between
  for (const ln of L.lines) {
    const fence = st.fence || 'oak_fence';
    for (let j = -2; j <= 2; j++) {
      const x = ln.x + ln.ax * j, z = ln.z + ln.az * j, y = ln.y;
      if (!inC(x, z)) continue;
      if (Math.abs(j) === 2) { for (let k = 1; k <= 3; k++) if (air(x, y + k, z) || BLOCKS[get(x, y + k, z)].render === RENDER.CROSS) put(x, y + k, z, fence); }
      else { for (let k = 1; k <= 2; k++) if (get(x, y + k, z) > 0 && BLOCKS[get(x, y + k, z)].render === RENDER.CROSS) put(x, y + k, z, 0); if (air(x, y + 3, z)) put(x, y + 3, z, 'washing_line', (ln.ax ? 0 : 1) | ((Math.abs(j) === 1 ? 2 : 3) << 2) | (((ln.v + j + 4) & 3) << 6)); }
    }
  }
  // shop signs: only against a wall, into open air
  for (const [x, y, z, rf] of L.signs) {
    if (!inC(x, z) || !air(x, y, z)) continue;
    const wx = x + DIRX[rf], wz = z + DIRZ[rf];
    if (!inC(wx, wz) || !T_SOLID[get(wx, y, wz)]) continue;
    if (!air(x, y - 1, z)) continue;
    put(x, y, z, 'hanging_shop_sign', rf);
  }
  // the walls: a flag on every tower, the town's banners either side of every gate
  if (v.wall) {
    const W = v.wall, stone = W.kind === 'stone', H = W.h, TH = H + 4, ground = (x, z) => Math.max(gen.column(x, z).h, SEA);
    const towers = [[W.x0, W.z0], [W.x1, W.z0], [W.x0, W.z1], [W.x1, W.z1]];
    for (const r of v.roads) {
      const g = r.hw + (stone ? 4 : 3);
      if (r.d === 0) towers.push([v.x - g, W.z0], [v.x + g, W.z0]); else if (r.d === 2) towers.push([v.x - g, W.z1], [v.x + g, W.z1]);
      else if (r.d === 1) towers.push([W.x1, v.z - g], [W.x1, v.z + g]); else towers.push([W.x0, v.z - g], [W.x0, v.z + g]);
    }
    const flagKey = clothKey(cols[0], 'flag'), fence = 'spruce_fence' in B ? 'spruce_fence' : (st.fence || 'oak_fence');
    for (const [tx, tz] of towers) {
      const h = ground(tx, tz), top = stone ? h + TH + 1 : h + TH + 4;
      const px = tx + (stone ? (tx < v.x ? 1 : -1) : 0), pz = tz;
      if (!inC(px, pz)) continue;
      for (let y = top; y <= top + 2; y++) if (air(px, y, pz)) put(px, y, pz, fence);
      const fx = px + DIRX[wind], fz = pz + DIRZ[wind];
      if (inC(fx, fz) && air(fx, top + 2, fz)) put(fx, top + 2, fz, flagKey, wind);
    }
    for (const r of v.roads) {
      const g = r.hw + (stone ? 4 : 3), R = stone ? 2 : 1, d = r.d;
      const along = d === 0 || d === 2, line = d === 0 ? W.z0 : d === 2 ? W.z1 : d === 1 ? W.x1 : W.x0;
      const outX = d === 1 ? 1 : d === 3 ? -1 : 0, outZ = d === 0 ? -1 : d === 2 ? 1 : 0;
      for (const sd of [-1, 1]) {
        const tx = along ? v.x + sd * g : line, tz = along ? line : v.z + sd * g;
        const x = tx + outX * (R + 1), z = tz + outZ * (R + 1), h = ground(tx, tz);
        if (!inC(x, z)) continue;
        const key = clothKey(cols[(sd + 1) / 2 % cols.length], 'banner'), rf = along ? 0 : 1;
        const yt = h + H - 1;
        if (air(x, yt, z) && air(x, yt - 1, z)) { put(x, yt, z, key, rf); put(x, yt - 1, z, key, rf | 4); }
      }
    }
  }
}
