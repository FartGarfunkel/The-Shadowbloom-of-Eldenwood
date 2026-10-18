// ---------------------------------------------------------------------------
// game/towns3.js — (alpha 3) living towns.
//
//   · Nobody stays stuck: a townsperson (or one of the story's people) who ends up inside a wall or under the ground —
//     a chunk that loaded late, a door that shut on them — finds their way back to their post, or the surface.
// ---------------------------------------------------------------------------

function npcStuckCheck(m) {
  const g = m.game, w = g && g.world; if (!w || g.isGuest) return;
  const fx = Math.floor(m.x), fz = Math.floor(m.z), fy = Math.floor(m.y + 0.05), hy = Math.floor(m.y + Math.min(1.6, (m.h || 1.8) - 0.2));
  if (w.isLoaded(fx, fz)) {
    const inWall = T_SOLID[w.getBlock(fx, hy, fz)] && T_SOLID[w.getBlock(fx, fy, fz)];
    const post = m.campPost || (m.npc && m.npc.home) || null;
    const under = post && m.y < post[1] - 2.5 && Math.hypot(post[0] - m.x, post[2] - m.z) < 24;
    const voidFall = m.y < 2;
    if (!inWall && !under && !voidFall) { m._stuckN = 0; return; }
    m._stuckN = (m._stuckN || 0) + 1;
    if (m._stuckN < 2) return;   // twice in a row (two seconds), so a moment's squeeze through a doorway doesn't count
    m._stuckN = 0;
    let to = null;
    if (post) to = [post[0], post[1], post[2]];
    if (!to || T_SOLID[w.getBlock(Math.floor(to[0]), Math.floor(to[1] + 0.5), Math.floor(to[2]))]) {
      // up to the first open air above solid ground
      const x = Math.floor(to ? to[0] : m.x), z = Math.floor(to ? to[2] : m.z);
      for (let y = Math.max(1, Math.floor(to ? to[1] : m.y)); y < CH - 2; y++) if (T_SOLID[w.getBlock(x, y - 1, z)] && !T_SOLID[w.getBlock(x, y, z)] && !T_SOLID[w.getBlock(x, y + 1, z)]) { to = [x + 0.5, y, z + 0.5]; break; }
    }
    if (!to) return;
    m.x = to[0]; m.y = to[1] + 0.02; m.z = to[2]; m.vx = m.vy = m.vz = 0; m.fallStart = null;
  }
}
{
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    // the ground under a townsperson that hasn't loaded yet: they wait for it rather than falling through
    if (this.npc && this.game && this.game.world && !this.game.isGuest && !this.game.world.isLoaded(Math.floor(this.x), Math.floor(this.z))) { this.vx = this.vy = this.vz = 0; return; }
    const r = baseUpd.call(this, dt);
    if (this.npc && this.alive && !this.remove) { this._stuckT = (this._stuckT || 0) - dt; if (this._stuckT <= 0) { this._stuckT = 1; try { npcStuckCheck(this); } catch (e) { /* next time */ } } }
    return r;
  };
}

// ---------------------------------------------------------------------------
// The gates (alpha 3). A walled town's gateways have real gates now, and they move: a stone-walled town lets down an
// iron portcullis that rattles up into the arch, a palisade town swings two great timber doors, banded with iron, in
// and back. They stand open by day and shut at dusk with the evening bell, and open again at dawn. Guards keep watch at
// every gate, and at night the watch opens up for you when you come to it (and shuts it again behind you); with no
// guard about you can still open it yourself (use it). Every gate is named for the way it faces, North, East, South or
// West: a board over the arch, and a sign by the road outside and in, saying where the road beyond it goes.
// While a gate is shut its opening is filled with invisible 'gate_barrier' blocks (that's what stops you, and what
// goes over the network); what you see is drawn moving from whether they're there.
// (Worlds from version 6 terrain: new worlds, or older ones upgraded in the world's settings.)
// ---------------------------------------------------------------------------
const GATE_NAMES = ['North Gate', 'East Gate', 'South Gate', 'West Gate'];
const GATE_SHUT = 0.535, GATE_OPEN = 0.985;      // ≈ quarter to seven in the evening, quarter to six in the morning
const GATE_H = 5;                                 // the opening under the arch
function gateNight(g) { const ph = (g.meta.time || 0) / DAY_LEN; return ph >= GATE_SHUT && ph < GATE_OPEN; }
// the gates of a town's plan: per road through the wall, its cells, the way it faces, where it's named
function gatesOfPlan(gen, v) {
  if (!v || !v.wall || !v.roads) return [];
  if (v._gates) return v._gates;
  const W = v.wall, stone = W.kind === 'stone', out = [];
  const ground = (x, z) => Math.max(gen.column(x, z).h, SEA);
  for (const r of v.roads) {
    const g = r.hw + 1, d = r.d, cells = [];
    const along = d === 0 || d === 2;                 // the wall here runs east-west
    const line = d === 0 ? W.z0 : d === 2 ? W.z1 : d === 1 ? W.x1 : W.x0;
    const cx = along ? v.x : line, cz = along ? line : v.z, h0 = ground(cx, cz);
    for (let s = -g; s <= g; s++) {
      const x = along ? v.x + s : line, z = along ? line : v.z + s;
      for (let k = 1; k <= GATE_H; k++) cells.push([x, h0 + k, z]);
    }
    const inX = d === 1 ? -1 : d === 3 ? 1 : 0, inZ = d === 0 ? 1 : d === 2 ? -1 : 0;     // into the town
    out.push({ key: v.id + ':' + d, d, stone, cells, name: GATE_NAMES[d], center: [cx + 0.5, h0 + 1, cz + 0.5], h0, inX, inZ, hw: r.hw, span: 2 * g + 1, cx, cz,
      // where the watch stands, either side of the road just inside
      posts: [-1, 1].map(sd => { const px = cx + (along ? sd * (r.hw + 1.5) : 0) + inX * 2.5, pz = cz + (along ? 0 : sd * (r.hw + 1.5)) + inZ * 2.5; return [px + 0.5, ground(Math.floor(px), Math.floor(pz)) + 1, pz + 0.5]; }) });
  }
  return (v._gates = out);
}
// where the roads beyond a gate go (the names on the campaign's road signs)
function gateDestinations(gen, v, d) {
  const out = [];
  if (v.town && typeof campRoadsOf === 'function') {
    const net = campRoadsOf(gen);
    if (net) for (const s of net.signs) if ((s.back === v.town || s.town === v.town) && s.dir === d) for (const n of s.names) if (!out.includes(n)) out.push(n);
  }
  return out;
}
{
  const baseWall = townWall;
  townWall = function (gen, v, put, get, inC, soft) {
    baseWall(gen, v, put, get, inC, soft);
    if ((gen.genVersion || 1) < 6) return;
    try { townGatesBuild(gen, v, put, get, inC); } catch (e) { console.warn('gates', e); }
  };
}
function townGatesBuild(gen, v, put, get, inC) {
  const signKey = 'oak_sign' in B ? 'oak_sign' : 'spruce_sign';
  const signAt = (x, y, z, meta, lines) => {
    if (!inC(x, z) || y < 1 || y >= CH) return;
    put(x, y, z, signKey, meta);
    const bx = Math.floor(x / 16) * 16, bz = Math.floor(z / 16) * 16;
    VGATE_CH.ch.blockEntities.set(cidx(x - bx, y, z - bz), { type: 'sign', lines: lines.map(l => String(l).slice(0, 16)).concat(['', '', '', '']).slice(0, 4) });
  };
  for (const G of gatesOfPlan(gen, v)) {
    // the opening, shut as it's made (the town opens it in the morning); the road under it made good
    for (const [x, y, z] of G.cells) if (inC(x, z)) {
      const id = get(x, y, z); if (!id || !T_SOLID[id] || T_SHAPE[id] === SHAPE.GATE) put(x, y, z, 'gate_barrier');
      if (y === G.h0 + 1) { const below = get(x, y - 1, z); if (!below || !T_SOLID[below]) put(x, y - 1, z, v.st.path ? v.st.path[0] : 'gravel'); }
    }
    const dest = gateDestinations(gen, v, G.d);
    const cx = G.cx, cz = G.cz, h = G.h0;
    // the board over the arch, outside and in
    const ox = cx - G.inX, oz = cz - G.inZ, ix = cx + G.inX, iz = cz + G.inZ;
    const toWall = (dx, dz) => (dz < 0 ? 0 : dx > 0 ? 1 : dz > 0 ? 2 : 3);
    if (inC(ox, oz) && !get(ox, h + 6, oz)) signAt(ox, h + 6, oz, 16 | toWall(G.inX, G.inZ), ['', G.name, v.name || '', '']);
    if (inC(ix, iz) && !get(ix, h + 6, iz)) signAt(ix, h + 6, iz, 16 | toWall(-G.inX, -G.inZ), ['', G.name, dest[0] ? 'to ' + dest[0] : '', '']);
    // a sign by the road outside, and one inside, at eye height
    const along = G.d === 0 || G.d === 2, rot = along ? 0 : 4, side = G.hw + 1;
    const spots = [[cx + (along ? side : 0) - G.inX * 3, cz + (along ? 0 : side) - G.inZ * 3, [G.name, 'of ' + (v.name || 'the town'), 'Shut dusk-dawn', '']],
      [cx - (along ? side : 0) + G.inX * 3, cz - (along ? 0 : side) + G.inZ * 3, [G.name].concat(dest.length ? dest.slice(0, 3).map((n, i) => (i ? '' : 'to ') + n) : ['the road out', 'of ' + (v.name || 'town')])]];
    for (const [sx, sz, lines] of spots) {
      if (!inC(sx, sz)) continue;
      const gy = Math.max(gen.column(sx, sz).h, SEA);
      let y = gy + 1; while (y < CH - 2 && get(sx, y, sz) && T_SOLID[get(sx, y, sz)] && y < gy + 4) y++;
      if (get(sx, y, sz) || !T_SOLID[get(sx, y - 1, sz)]) continue;
      signAt(sx, y, sz, rot, lines);
    }
  }
}
// (the chunk being built, for the signs' entities: put() doesn't hand back its index)
const VGATE_CH = { ch: null, gv: 1, wind: 1 };
// the way the wind blows in this world (flags stream out that way): mostly from the west
function townWindOf(gen) { const r = hash32(gen.seed | 0, 91, 7, 3) % 10; return r < 6 ? 1 : r < 8 ? 2 : r < 9 ? 0 : 3; }
{
  const baseInto = WorldGen.prototype.buildVillageInto;
  WorldGen.prototype.buildVillageInto = function (ch, v) { VGATE_CH.ch = ch; VGATE_CH.gv = this.genVersion || 1; VGATE_CH.wind = townWindOf(this); try { return baseInto.call(this, ch, v); } finally { VGATE_CH.ch = null; } };
}

// ---- opening and shutting -----------------------------------------------------------------------------------------------
const GATES_RT = { t: 0, seen: new Map(), night: null, held: new Map(), anim: new Map(), mesh: new Map() };
function gateIsShut(w, G) { const [x, y, z] = G.cells[Math.floor(G.cells.length / GATE_H / 2) * GATE_H]; return w.getBlock(x, y, z) === B.gate_barrier; }
// someone (or something) standing in the way: a gate doesn't shut on them
function gateBlocked(g, G) {
  const xs = G.cells.map(c => c[0]), zs = G.cells.map(c => c[2]), x0 = Math.min(...xs) - 0.4, x1 = Math.max(...xs) + 1.4, z0 = Math.min(...zs) - 0.4, z1 = Math.max(...zs) + 1.4, y0 = G.h0 + 0.5, y1 = G.h0 + GATE_H + 1;
  const inside = (o) => o.x > x0 && o.x < x1 && o.z > z0 && o.z < z1 && o.y > y0 - 1 && o.y < y1;
  return g.pawns().some(p => !p.dead && inside(p)) || g.entities.some(e => e.alive && !e.remove && inside(e));
}
function gateSet(g, G, open, sound) {
  const w = g.world; let any = false;
  if (!open && gateBlocked(g, G)) return false;
  for (const [x, y, z] of G.cells) {
    if (!w.isLoaded(x, z)) continue;
    const id = w.getBlock(x, y, z);
    if (open && id === B.gate_barrier) { w.setBlock(x, y, z, 0, 0); any = true; }
    else if (!open && (!id || T_REPLACEABLE[id])) { w.setBlock(x, y, z, B.gate_barrier, 0); any = true; }
  }
  if (any && sound && g.sfx) { const [x, y, z] = G.center; try { g.sfx.playAt(G.stone ? 'door_iron' in (typeof SND_FX !== 'undefined' ? SND_FX : {}) ? 'door_iron' : doorSound(BLOCKS[B.iron_door || B.oak_door], open) : doorSound(BLOCKS[B.oak_door], open), x, y + 2, z, 32); } catch (e) { /* quiet */ } }
  return any;
}
function gatesTick(g, dt) {
  if (g.isGuest || g.dim !== 0 || !g.world || !g.world.gen.villagesNear || (g.world.gen.genVersion || 1) < 6) return;
  if ((GATES_RT.t -= dt) > 0) return;
  GATES_RT.t = 0.5;
  const night = gateNight(g), turned = GATES_RT.night !== null && GATES_RT.night !== night;
  GATES_RT.night = night;
  const pawns = g.pawns().filter(p => !p.dead);
  const seenNow = new Set();
  for (const p of pawns) for (const v of g.world.gen.villagesNear(p.x, p.z, 48)) {
    if (!v.wall) continue;
    for (const G of gatesOfPlan(g.world.gen, v)) {
      const k = G.key; if (seenNow.has(k)) continue; seenNow.add(k);
      const [cx, cy, cz] = G.center;
      if (!g.world.isLoaded(G.cx, G.cz)) continue;
      // an empty town's gates hang open
      if (v.empty) { if (gateIsShut(g.world, G)) gateSet(g, G, true, false); continue; }
      // (alpha 7) a town under lockdown keeps its own gates (campaign/lockdown.js)
      if (typeof GATE_LOCK_HOOK === 'function' && GATE_LOCK_HOOK(g, v, G, pawns)) continue;
      if (!GATES_RT.seen.has(k)) { GATES_RT.seen.set(k, 1); GATES_RT.pending = GATES_RT.pending || new Map(); gateSet(g, G, !night, false) || (!night ? 0 : GATES_RT.pending.set(k, 1)); continue; }
      if (turned) { if (gateSet(g, G, !night, true) && night) gateDuskNews(g, v, G); else if (night) (GATES_RT.pending = GATES_RT.pending || new Map()).set(k, 1); continue; }
      if (GATES_RT.pending && GATES_RT.pending.has(k) && night && !GATES_RT.held.has(k)) { if (gateSet(g, G, false, true)) GATES_RT.pending.delete(k); continue; }
      if (!night) { if (gateIsShut(g.world, G)) gateSet(g, G, true, false); continue; }
      // the watch opens up for the party at night, and shuts it behind them
      const near = pawns.filter(q => Math.hypot(q.x - cx, q.z - cz) < 4.5 + G.hw && Math.abs(q.y - cy) < 4);
      const held = GATES_RT.held.get(k);
      if (near.length) {
        const guard = g.entities.find(e => e.npc && e.T && e.T.guard && e.alive && !e.remove && e.npc.v === v.id && Math.hypot(e.x - cx, e.z - cz) < 16);
        if (!held && guard && gateIsShut(g.world, G)) {
          if (gateSet(g, G, true, true)) {
            GATES_RT.held.set(k, 4);
            for (const l of g.locals) if (near.includes(l.player)) l.toast(`${guard.npc.n} the guard opens the ${G.name} for you`, '');
            guard.yaw = Math.atan2(-(near[0].x - guard.x), -(near[0].z - guard.z));
          }
        } else if (held) GATES_RT.held.set(k, 4);
      } else if (held) {
        const t = held - 0.5;
        if (t <= 0) { if (gateSet(g, G, false, true)) GATES_RT.held.delete(k); else GATES_RT.held.set(k, 1); }
        else GATES_RT.held.set(k, t);
      }
    }
  }
}
// dusk: the bell, and word that the gates are shut (once per town, to whoever's near)
function gateDuskNews(g, v, G) {
  const key = v.id + ':' + Math.floor((g.meta.day || 0));
  if (GATES_RT.lastDusk === key) return;
  GATES_RT.lastDusk = key;
  for (const l of g.locals) if (Math.hypot(l.player.x - v.x, l.player.z - v.z) < (v.r || 60) + 40) l.toast(`The evening bell: the gates of ${v.name} shut for the night`, '');
  try { if (g.sfx) g.sfx.playAt('bell', v.x + 0.5, v.y + 6, v.z + 0.5, 64); } catch (e) { /* quiet */ }
}
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { gatesTick(this, dt); } catch (e) { console.warn('gates', e); } return baseUpd.call(this, dt); };
}
// use a gate to open it or shut it
function gateAt(g, x, y, z) {
  if (g.dim !== 0 || !g.world.gen.villagesNear) return null;
  for (const v of g.world.gen.villagesNear(x, z, 2)) for (const G of gatesOfPlan(g.world.gen, v)) if (G.cells.some(c => c[0] === x && c[2] === z) && y > G.h0 && y <= G.h0 + GATE_H) return G;
  return null;
}
{
  const baseUse = LocalPlayer.prototype.useBlockAt;
  LocalPlayer.prototype.useBlockAt = function (hit, held, def) {
    if (hit && hit.id === B.gate_barrier) {
      const g = this.g, G = gateAt(g, hit.x, hit.y, hit.z);
      if (G) {
        if (g.isGuest) { if (g.net) g.net.send({ t: 'adv', k: 'gate', x: hit.x, y: hit.y, z: hit.z }); }
        else { gateSet(g, G, true, true); if (gateNight(g)) GATES_RT.held.set(G.key, 8); }
        this.swingArm && this.swingArm();
        return true;
      }
    }
    return baseUse.call(this, hit, held, def);
  };
  // shutting it again yourself: use the open gateway's arch from inside or out while sneaking... or simply leave it to the town.
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'gate') { try { const g = this.g || GAME, G = gateAt(g, m.x, m.y, m.z); if (G) { gateSet(g, G, true, true); if (gateNight(g)) GATES_RT.held.set(G.key, 8); } } catch (e) { /* no gate */ } return; }
    return baseHost.call(this, from, m);
  };
}

// ---- what you see: the portcullis rattling up into the arch, the doors swinging in --------------------------------------
function gateMeshes(gl, G) {
  let M = GATES_RT.mesh.get(G.key);
  if (M) return M;
  const T = (n, alt) => ATLAS.tile[n] ?? ATLAS.tile[alt] ?? 0;
  const half = G.span / 2;
  if (G.stone) {
    // the portcullis: a grid of iron bars with spiked feet, in the plane of the wall
    const mb = new MeshBuilder(2048), iron = T('iron_block'), dark = T('anvil_top', 'iron_block');
    for (let x = -half + 0.25; x < half; x += 0.5) { addBox(mb, [x - 0.07, 0.0, -0.07], [x + 0.07, GATE_H, 0.07], [iron, iron, iron, iron, iron, iron]); addBox(mb, [x - 0.04, -0.05, -0.04], [x + 0.04, 0.0, 0.04], [dark, dark, dark, dark, dark, dark]); }
    for (let y = 0.6; y < GATE_H; y += 0.8) addBox(mb, [-half, y - 0.06, -0.09], [half, y + 0.06, 0.09], [dark, dark, dark, dark, dark, dark]);
    const r = mb.result(); M = { bars: makeVAO(gl, r.verts, r.idx) };
  } else {
    // two timber doors: planks, a log frame, iron bands and studs; each built hinge-side at 0, out along +x
    const leaf = () => {
      const mb = new MeshBuilder(4096), pl = T('spruce_planks', 'planks'), lg = T('spruce_log', 'log_side'), ir = T('iron_block');
      for (let x = 0; x < half - 0.01; x += 1) for (let y = 0; y < GATE_H; y += 1) { const x1 = Math.min(half - 0.05, x + 1), y1 = Math.min(GATE_H, y + 1); addBox(mb, [x, y, -0.12], [x1, y1, 0.12], [pl, pl, pl, pl, pl, pl]); }
      addBox(mb, [0, 0, -0.16], [0.28, GATE_H, 0.16], [lg, lg, lg, lg, lg, lg]);
      addBox(mb, [half - 0.3, 0, -0.16], [half - 0.05, GATE_H, 0.16], [lg, lg, lg, lg, lg, lg]);
      addBox(mb, [0, GATE_H - 0.3, -0.16], [half - 0.05, GATE_H, 0.16], [lg, lg, lg, lg, lg, lg]);
      for (const y of [0.9, GATE_H / 2, GATE_H - 1.1]) { addBox(mb, [0, y - 0.09, -0.17], [half - 0.1, y + 0.09, 0.17], [ir, ir, ir, ir, ir, ir]); for (let x = 0.5; x < half - 0.2; x += 0.75) addBox(mb, [x - 0.05, y - 0.05, -0.2], [x + 0.05, y + 0.05, 0.2], [ir, ir, ir, ir, ir, ir]); }
      addBox(mb, [half - 0.55, GATE_H / 2 - 0.55, -0.24], [half - 0.45, GATE_H / 2 - 0.15, -0.16], [ir, ir, ir, ir, ir, ir]);   // a ring to pull
      const r = mb.result(); return makeVAO(gl, r.verts, r.idx);
    };
    M = { leaf: leaf() };
  }
  GATES_RT.mesh.set(G.key, M);
  return M;
}
{
  const baseDraws = blockEntityDraws;
  blockEntityDraws = function (game, out, cam, R) {
    baseDraws(game, out, cam, R);
    try {
      const w = game.world;
      if (game.dim !== 0 || !w.gen.villagesNear || (w.gen.genVersion || 1) < 6) return;
      const gl = game.renderer.gl, now = performance.now() / 1000;
      for (const v of w.gen.villagesNear(cam.x, cam.z, 96)) {
        if (!v.wall) continue;
        for (const G of gatesOfPlan(w.gen, v)) {
          if (!w.isLoaded(G.cx, G.cz) || Math.hypot(G.center[0] - cam.x, G.center[2] - cam.z) > R * 16 + 8) continue;
          // how open: easing toward what the blocks say
          const want = gateIsShut(w, G) ? 0 : 1;
          let A = GATES_RT.anim.get(G.key);
          if (!A) { A = { t: want, last: now }; GATES_RT.anim.set(G.key, A); }
          const dtA = Math.min(0.25, now - A.last); A.last = now;
          const sp = G.stone ? 0.38 : 0.45;
          if (A.t < want) A.t = Math.min(want, A.t + dtA * sp); else if (A.t > want) A.t = Math.max(want, A.t - dtA * sp * 1.4);
          const e = A.t * A.t * (3 - 2 * A.t);
          const M = gateMeshes(gl, G), l = w.getLight(G.cx + G.inX, G.h0 + 2, G.cz + G.inZ), light = [l >> 4, l & 15];
          const rot = G.d === 0 ? 0 : G.d === 2 ? Math.PI : G.d === 1 ? -Math.PI / 2 : Math.PI / 2;
          const px = G.cx, py = G.h0 + 1, pz = G.cz;
          const base = () => { const m = Mat4.create(); Mat4.translate(m, 0.5, 0, 0.5); Mat4.rotateY(m, rot); return m; };
          if (G.stone) { const m = base(); Mat4.translate(m, 0, e * (GATE_H - 0.35), 0); out.push({ mesh: M.bars, m, px, py, pz, light, noCull: true }); }
          else {
            const half = G.span / 2;
            const L = base(); Mat4.translate(L, -half, 0, 0); Mat4.rotateY(L, -e * Math.PI * 0.47); out.push({ mesh: M.leaf, m: L, px, py, pz, light, noCull: true });
            const Rr = base(); Mat4.translate(Rr, half, 0, 0); Mat4.rotateY(Rr, Math.PI + e * Math.PI * 0.47); out.push({ mesh: M.leaf, m: Rr, px, py, pz, light, noCull: true });
          }
        }
      }
    } catch (err) { GATES_RT.err = String(err && err.stack || err); }
  };
}
// the watch at the gates: each guard keeps one, standing either side of the road just inside, looking out; now and then
// they walk the streets and come back
{
  const baseBrain = npcBrain;
  npcBrain = function (e, dt, p, dist) {
    const r = baseBrain(e, dt, p, dist);
    try {
      const N = e.npc, g = e.game;
      if (!N || N.i < 100 || N.i >= 200 || !e.T.guard || e.foe || e.confront || !g.world || (g.world.gen.genVersion || 1) < 6) return r;
      const v = villageById(g, N.v); if (!v || !v.wall) return r;
      const gates = gatesOfPlan(g.world.gen, v); if (!gates.length) return r;
      const gi = N.i - 100, G = gates[gi % gates.length], post = G.posts[Math.floor(gi / gates.length) % 2];
      const dPost = Math.hypot(post[0] - e.x, post[2] - e.z);
      if (e.goal !== e._lastGoal) {
        // the guard's brain has just picked somewhere new to go
        if (e._patrol) { e._patrol = false; e.goal = post; e.goalT = 60; }
        else if ((e._watchT || 0) < (e._watchLen || (e._watchLen = 45 + Math.random() * 75))) { e.goal = post; e.goalT = 60; }
        else { e._watchT = 0; e._watchLen = 45 + Math.random() * 75; e._patrol = true; }
      }
      e._lastGoal = e.goal;
      if (dPost < 1.3) {
        e._watchT = (e._watchT || 0) + dt;
        if (e.lookT > 0 && !(p && dist < 4)) { const out = Math.atan2(G.inX, G.inZ); e.yaw = turnTo(e.yaw, out, dt * 3); return { want: 0, dir: e.yaw }; }
      }
    } catch (err) { /* plain watch */ }
    return r;
  };
}

// ---- which way is which: a compass rose on every map --------------------------------------------------------------
function mapRose(c, x, y, R, paper) {
  c.save(); c.translate(x, y);
  c.lineJoin = 'round';
  // the ring
  c.beginPath(); c.arc(0, 0, R * 0.62, 0, TAU); c.fillStyle = paper ? 'rgba(244,228,188,0.88)' : 'rgba(30,22,12,0.62)'; c.fill();
  c.lineWidth = Math.max(1, R * 0.07); c.strokeStyle = paper ? '#5a4024' : '#e8d4a0'; c.stroke();
  // the points: north dark red, the others ink
  const pt = (a, len, col) => { c.save(); c.rotate(a); c.beginPath(); c.moveTo(0, -len); c.lineTo(R * 0.16, 0); c.lineTo(0, R * 0.1); c.lineTo(-R * 0.16, 0); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = Math.max(0.6, R * 0.035); c.strokeStyle = '#1a1208'; c.stroke(); c.restore(); };
  for (let i = 0; i < 4; i++) pt(i * Math.PI / 2 + Math.PI / 4, R * 0.36, paper ? '#8a6a44' : '#bba070');
  pt(Math.PI / 2, R * 0.55, paper ? '#2a2018' : '#e8d4a0'); pt(Math.PI, R * 0.55, paper ? '#2a2018' : '#e8d4a0'); pt(-Math.PI / 2, R * 0.55, paper ? '#2a2018' : '#e8d4a0');
  pt(0, R * 0.62, '#b0281e');
  // the letters
  c.font = `700 ${Math.max(7, Math.round(R * 0.36))}px "Pixelify Sans", ui-monospace, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const lt = (s, dx, dy, col) => { c.lineWidth = Math.max(1.5, R * 0.09); c.strokeStyle = paper ? 'rgba(244,228,188,0.95)' : 'rgba(20,14,8,0.9)'; c.strokeText(s, dx, dy); c.fillStyle = col; c.fillText(s, dx, dy); };
  lt('N', 0, -R * 0.84, '#c0301e'); lt('S', 0, R * 0.86, paper ? '#2a2018' : '#fff3d6'); lt('E', R * 0.86, 0, paper ? '#2a2018' : '#fff3d6'); lt('W', -R * 0.86, 0, paper ? '#2a2018' : '#fff3d6');
  c.restore();
}
{
  // the map in your hand: the rose drawn into its corner (on a copy: the map's own picture stays clean)
  const baseTex = mapTex;
  mapTex = function (g, m) {
    const cv = mapCanvas(m);
    if (!m._roseCv) { m._roseCv = document.createElement('canvas'); m._roseCv.width = m._roseCv.height = cv.width * 2; m._roseVer = -1; }
    if (m._roseVer !== m.painted || !m.tex) {
      const rc = m._roseCv, c = rc.getContext('2d');
      c.imageSmoothingEnabled = false; c.drawImage(cv, 0, 0, rc.width, rc.height);
      c.imageSmoothingEnabled = true; mapRose(c, rc.width - 30, 30, 26, true);
      m._roseVer = m.painted;
      const r = g.renderer, gl = r.gl;
      if (!m.tex) { m.tex = gl.createTexture(); }
      gl.bindTexture(gl.TEXTURE_2D, m.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, rc);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, r.tex || null);
      m.texVer = m.painted;
    }
    return m.tex;
  };
  // the big map: a rose in the corner of the table
  const baseDraw = MapView.prototype.draw;
  MapView.prototype.draw = function () {
    baseDraw.call(this);
    try { if (!this.el.isConnected) return; const W = this.cv.width, dpr = this.dpr || 1, R = 34 * dpr; mapRose(this.ctx, W - R - 10 * dpr, R + 10 * dpr, R, false); } catch (e) { /* no rose */ }
  };
}
