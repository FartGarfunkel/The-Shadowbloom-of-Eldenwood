// ---------------------------------------------------------------------------
// game/camping.js — 0.9.0.11: travel and camping.
//
//  · Campfires, reworked: a thick column of smoke that climbs high into the
//    sky (higher still over a hay bale: a signal fire), crackling flames,
//    sparks and embers drifting up, now and then a pop. A shovel or water
//    puts one out (just smouldering ash and logs); flint and steel lights it
//    again. Set up to four pieces of raw food on a lit one to cook them.
//    Step on it and you'll burn.
//  · The campfire kit: a campfire you carry. Sneak and use it with an empty
//    hand to pack it up again.
//  · Rope: use it on a ledge, a ceiling or the end of another rope and it
//    hangs down to the ground; climb it like a ladder. Cut one and everything
//    below comes down with it.
//  · The grappling hook: throw it at a wall or a cliff top and it reels you in;
//    hang there, and jump, sneak or use it again to let go.
//  · The sleeping bag: lay it down anywhere and sleep the night through. It's
//    your spawn for that night only; in the morning your bed is home again.
//  · The explorer's backpack: three rows of pockets, and your gear shows on
//    it: a coil of rope at the side, the hook, a cooking pot.
// ---------------------------------------------------------------------------

// ---- campfires: lit or out, light and ash --------------------------------------------------------------
const CAMPFIRE_OUT = 8, CAMPFIRE_KIT = 16, CAMP_COOK = 24;
{
  for (const k of ['campfire', 'soul_campfire']) if (B[k] !== undefined) T_LMETA[B[k]] = 1;
  const baseML = metaLight;
  metaLight = function (id, meta) {
    if (id === B.campfire || id === B.soul_campfire) return meta & CAMPFIRE_OUT ? 0 : BLOCKS[id].light;
    return baseML(id, meta);
  };
  SHAPES.campfire_out = SHAPES.campfire.slice(0, 4).concat([{ b: [5, 0, 3, 11, 1, 13], side: 'campfire_ash' }]);
}
const isCampfire = (id) => id === B.campfire || id === B.soul_campfire;
function campfireLit(w, x, y, z) { const id = w.getBlock(x, y, z); return isCampfire(id) && !(w.getMeta(x, y, z) & CAMPFIRE_OUT); }
// The smoke, the flames, the sparks (called for each campfire near you by game/blockfx.js).
function campfireFx(g, x, y, z, id, meta, step) {
  if (meta & CAMPFIRE_OUT) return;
  const soul = id === B.soul_campfire, w = g.world, P = g.particles, r = Math.random;
  const signal = w.getBlock(x, y - 1, z) === B.hay_bale;
  const [wx, wz] = g.windDrift();
  // (0.9.0.11) a fire in a hearth sends its smoke up the chimney: it comes out of the top of the stack
  const flue = campFlue(w, x, y, z);
  const sx = flue ? flue[0] : x, sy = flue ? flue[1] : y + 0.55, sz = flue ? flue[2] : z;
  const sky = w.getLight(sx, Math.floor(sy) + 1, sz) & 0xF0, smokeLight = flue ? sky | 3 : sky | 8;      // lit a little by the fire beneath
  // a column of smoke, rising and spreading
  for (let n = 0; n < 3; n++) if (r() < step * (signal ? 6 : 4.5) / 3) {
    const life = signal ? 11 + r() * 4 : 6 + r() * 3, s = (flue ? 0.3 : 0.26) + r() * 0.12;
    P.add({ x: sx + 0.5 + (r() - 0.5) * 0.4, y: sy, z: sz + 0.5 + (r() - 0.5) * 0.4, vx: (r() - 0.5) * 0.12, vy: (signal ? 1.9 : 1.25) + r() * 0.4, vz: (r() - 0.5) * 0.12, life, max: life, size: s, size0: s, grow: 2.8, uv: tileUV(ATLAS.tile.campfire_smoke ?? ATLAS.tile.smoke ?? 0), light: smokeLight, grav: -0.03, rise: true, windX: wx * (signal ? 1.2 : 2), windZ: wz * (signal ? 1.2 : 2) });
  }
  // in the hearth itself only thin wisps curl up into the flue
  if (flue && r() < step * 2) { const life = 0.8 + r() * 0.5; P.add({ x: x + 0.3 + r() * 0.4, y: y + 0.5, z: z + 0.3 + r() * 0.4, vx: 0, vy: 0.45, vz: 0, life, max: life, size: 0.1, size0: 0.1, grow: 0.8, uv: tileUV(ATLAS.tile.smoke_puff ?? ATLAS.tile.smoke ?? 0), light: (w.getLight(x, y, z) & 0xF0) | 10, grav: -0.02, rise: true }); }
  // flames licking up from the logs
  if (r() < step * 7) { const life = 0.3 + r() * 0.25; P.add({ x: x + 0.3 + r() * 0.4, y: y + 0.3 + r() * 0.2, z: z + 0.3 + r() * 0.4, vx: 0, vy: 0.9 + r() * 0.6, vz: 0, life, max: life, size: 0.07, size0: 0.07, shrink: true, uv: tileUV(ATLAS.tile[soul ? 'soul_flame' : 'flame'] ?? 0), light: 0xFF, grav: 0 }); }
  // sparks and glowing embers drifting up
  if (r() < step * 3.5) { const life = 0.9 + r() * 1.2; P.add({ x: x + 0.35 + r() * 0.3, y: y + 0.5, z: z + 0.35 + r() * 0.3, vx: (r() - 0.5) * 0.7, vy: flue ? 0.5 + r() * 0.6 : 1.5 + r() * 1.8, vz: (r() - 0.5) * 0.7, life, max: life, size: 0.022, size0: 0.026, shrink: true, uv: tileUV(ATLAS.tile[soul ? 'soul_flame' : 'ember_spark'] ?? 0), light: 0xFF, grav: 0.35, flutter: 0.4, ph: r() * 6 }); }
  // a pop: a little burst of sparks
  if (r() < step * 0.25) {
    for (let k = 0; k < 5 + Math.floor(r() * 5); k++) { const life = 0.6 + r() * 0.6, a = r() * TAU; P.add({ x: x + 0.5, y: y + 0.45, z: z + 0.5, vx: Math.cos(a) * (0.6 + r()), vy: flue ? 0.8 + r() : 2 + r() * 2.5, vz: Math.sin(a) * (0.6 + r()), life, max: life, size: 0.02, size0: 0.024, shrink: true, uv: tileUV(ATLAS.tile.ember_spark ?? 0), light: 0xFF, grav: 4 }); }
    g.sfx.playAt('campfire_pop', x + 0.5, y + 0.5, z + 0.5, 14);
  }
  if (r() < step * 0.7) g.sfx.playAt('fire_crackle', x + 0.5, y + 0.5, z + 0.5, 12);
  // food on it sizzles
  const e = w.getEntity(x, y, z);
  if (e && e.items && e.items.some(Boolean) && r() < step * 3) { const k = [0, 1, 2, 3].filter(i => e.items[i])[0]; const [ox, oz] = CAMP_SPOTS[k]; P.add({ x: x + ox, y: y + 0.5, z: z + oz, vx: 0, vy: 0.5, vz: 0, life: 1.4, max: 1.4, size: 0.06, size0: 0.06, grow: 1.5, uv: tileUV(ATLAS.tile.smoke_puff ?? ATLAS.tile.smoke ?? 0), light: smokeLight, grav: -0.05, rise: true }); }
}
const CAMP_SPOTS = [[0.28, 0.2], [0.72, 0.2], [0.72, 0.8], [0.28, 0.8]];     // on the top logs, round the edge
// (0.9.0.11) smoke you can see from far off: past the near emitters (about two chunks), every lit
// campfire in sight still sends up a slow column of big, long-lived puffs (no flames, sparks or sound)
{
  const base = Game.prototype.emitterParticles;
  Game.prototype.emitterParticles = function (dt) {
    base.call(this, dt);
    const w = this.world; if (!w || !this.particles) return;
    this._farAcc = (this._farAcc || 0) + dt;
    if (this._farAcc < 0.25) return;
    const step = this._farAcc; this._farAcc = 0;
    const centers = this.locals.map(l => l.player), far = Math.min(this.renderDist() * 16 + 8, 200);
    const fires = [];
    for (const ch of w.chunks.values()) {
      if (!ch.emitters || !ch.emitters.length) continue;
      const mx = ch.cx * 16 + 8, mz = ch.cz * 16 + 8;
      let dmin = 1e9, near = false;
      for (const p of centers) { const dx = Math.abs(mx - p.x), dz = Math.abs(mz - p.z); if (dx < 28 && dz < 28) near = true; dmin = Math.min(dmin, Math.hypot(dx, dz)); }
      if (near || dmin > far) continue;
      for (const e of ch.emitters) if ((e[3] === B.campfire || e[3] === B.soul_campfire) && !(e[4] & CAMPFIRE_OUT)) fires.push([ch.cx * 16 + e[0], e[1], ch.cz * 16 + e[2], e[3], dmin]);
    }
    fires.sort((a, b) => a[4] - b[4]);
    const [wx, wz] = this.windDrift(), P = this.particles, r = Math.random, uvS = tileUV(ATLAS.tile.campfire_smoke ?? ATLAS.tile.smoke ?? 0);
    for (const [x, y, z, id] of fires.slice(0, 16)) {
      const signal = w.getBlock(x, y - 1, z) === B.hay_bale;
      if (r() > step * (signal ? 1.6 : 1.1)) continue;
      const flue = campFlue(w, x, y, z);
      const sx = flue ? flue[0] : x, sy = flue ? flue[1] : y + 0.6, sz = flue ? flue[2] : z;
      const sky = w.getLight(sx, Math.floor(sy) + 1, sz) & 0xF0;
      const life = signal ? 16 + r() * 5 : 11 + r() * 4, s = 0.42 + r() * 0.18;
      P.add({ x: sx + 0.5 + (r() - 0.5) * 0.3, y: sy, z: sz + 0.5 + (r() - 0.5) * 0.3, vx: (r() - 0.5) * 0.1, vy: (signal ? 2.0 : 1.4) + r() * 0.4, vz: (r() - 0.5) * 0.1, life, max: life, size: s, size0: s, grow: 3.4, uv: uvS, light: sky | 6, grav: -0.02, rise: true, windX: wx * 1.6, windZ: wz * 1.6 });
    }
  };
}

// A fire with something solid right over it, beside (or under) a solid stack at least three blocks
// taller than the fire, is in a hearth: its smoke comes out of the top of the tallest such stack.
// Looked up again every few seconds, so building or breaking a chimney takes effect.
const CAMP_FLUE = new Map();
function campFlue(w, x, y, z) {
  const k = x + ',' + y + ',' + z, now = performance.now(), c = CAMP_FLUE.get(k);
  if (c && now - c.t < 4000) return c.f;
  let f = null;
  const solid = (X, Y, Z) => { const id = w.getBlock(X, Y, Z); return !!id && T_SOLID[id] && !T_LIQUID[id]; };
  if (solid(x, y + 1, z)) {
    let best = y + 3;
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Z = z + dz;
      let Y = dx || dz ? y : y + 1;
      if (!solid(X, Y, Z) && !solid(X, ++Y, Z)) continue;           // a stack beside the fire starts at the fire or just above it
      while (Y < CH - 1 && solid(X, Y + 1, Z)) Y++;
      if (Y > best && Y + 1 < CH && w.getBlock(X, Y + 1, Z) === 0) { best = Y; f = [X, Y + 1.05, Z]; }
    }
  }
  if (CAMP_FLUE.size > 400) CAMP_FLUE.clear();
  CAMP_FLUE.set(k, { t: now, f });
  return f;
}

// ---- items and blocks ----------------------------------------------------------------------------------------
defItem('rope', { name: 'Rope', block: 'rope', icon: 'rope_item', desc: 'Use it on a ledge, a ceiling or another rope: it hangs down to the ground. Climb it like a ladder.' });
defItem('grappling_hook', { name: 'Grappling Hook', maxStack: 1, grapple: true, tool: { type: 'hook', tier: 0, speed: 1, damage: 2, durability: 240 }, desc: 'Throw it at a ledge, a wall or a ceiling: it catches and a rope drops to the ground. Climb up, then use the hook or its rope to take it back.' });
defItem('campfire_kit', { name: 'Campfire Kit', maxStack: 8, campKit: true, desc: 'A campfire you carry. Set it down anywhere; sneak and use it with an empty hand to pack it up again.' });
defItem('explorer_backpack', { name: "Explorer's Backpack", maxStack: 1, backpack: 27, desc: 'Wear it in the backpack slot for 27 extra slots, and straps for your sleeping bag, a campfire and your grappling hook. What you carry shows on it.' });
if (ITEMS.sleeping_bag) ITEMS.sleeping_bag.desc = 'Lay it down and sleep anywhere. Your spawn for that night only.';
RECIPES.push(
  { out: 'rope', n: 4, shape: ['S', 'S', 'S'], key: { S: 'string' } },
  { out: 'rope', n: 2, shape: ['T', 'T', 'T'], key: { T: 'straw' } },
  { out: 'grappling_hook', n: 1, shape: ['I I', ' I ', ' R '], key: { I: 'iron_ingot', R: 'rope' }, group: 'tools' },
  { out: 'campfire_kit', n: 1, items: ['campfire', 'leather', 'string'] },
  { out: 'sleeping_bag', n: 1, shape: ['WWW', 'LLL'], key: { W: '#wool', L: 'leather' } },
  { out: 'explorer_backpack', n: 1, shape: ['RGR', 'LBL', 'LLL'], key: { R: 'rope', G: 'gold_ingot', L: 'leather', B: 'reinforced_backpack' } },
);
if (NPC_SHOPS.merchant) NPC_SHOPS.merchant.buy.push(['rope', 8, 1, 0], ['campfire_kit', 1, 2, 0], ['sleeping_bag', 1, 3, 1], ['grappling_hook', 1, 6, 2]);
SHAPES.rope = [{ b: [7.25, 0, 7.25, 8.75, 16, 8.75], side: 'rope', end: 'rope_end' }];
SHAPES.sleeping_bag = [
  { b: [1.5, 0, 0.5, 14.5, 2.5, 15.5], side: 'bag_side', end: 'bag_top' },
  { b: [2.5, 2.5, 0.5, 13.5, 3.2, 11], side: 'bag_side', end: 'bag_top' },
  { b: [2.5, 2.5, 11.5, 13.5, 4.5, 15.2], side: 'bag_pillow', end: 'bag_pillow' },
];
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('campfire_ash', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, p.rand() < 0.08 ? H('#8a3a1a') : shade(H('#5a5652'), 0.75 + p.rand() * 0.45)); });
    addTile('campfire_smoke', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) + Math.sin(x * 1.3 + y * 0.7) * 0.8; if (d < 7.2) p.set(x, y, shade(H('#d8d4d0'), 0.82 + p.rand() * 0.18), Math.round(150 * Math.min(1, (7.2 - d) / 3.5))); } });
    addTile('rope', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const tw = ((x + y * 2) % 6) < 3; p.set(x, y, shade(H(tw ? '#c8a46a' : '#a8844a'), 0.9 + p.rand() * 0.15)); } });
    addTile('rope_end', p => { p.noise(H('#b8945a'), 0.15); p.blob(7, 7, 3, H('#8a6a3a'), 0.1); });
    addTile('bag_side', p => { p.noise(H('#3a6a4a'), 0.1); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#2a4a32')); p.set(x, 15, H('#2a4a32')); } for (let x = 1; x < 16; x += 3) p.set(x, 8, H('#c8a040')); });
    addTile('bag_top', p => { p.noise(H('#4a7a5a'), 0.1); for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) p.set(x, y, H('#3a6a4a')); for (let y = 0; y < 16; y++) { p.set(1, y, H('#c8a040')); } });
    addTile('bag_pillow', p => { p.noise(H('#e8e0d0'), 0.06); for (let i = 0; i < 16; i++) { p.set(i, 0, H('#c8bca8')); p.set(i, 15, H('#c8bca8')); } });
    addTile('hook_metal', p => { p.noise(H('#9aa4ae'), 0.15); p.set(4, 4, H('#e0e8f0')); p.set(5, 4, H('#e0e8f0')); });
    for (const [k, c] of [['pack_body_e', '#5a6a3a'], ['pack_flap_e', '#3a4a2a'], ['pack_roll_e', '#8a3a2a']]) addTile(k, p => { p.noise(H(c), 0.12); for (let x = 0; x < 16; x += 5) for (let y = 0; y < 16; y++) if (p.rand() < 0.5) p.set(x, y, shade(H(c), 0.8)); });
    addTile('pot_iron', p => { p.noise(H('#3a3a3e'), 0.2); for (let x = 0; x < 16; x++) p.set(x, 1, H('#6a6a70')); });
    const I = (name, rows, pal) => addItem(name, p => p.art(rows, pal));
    I('rope_item', ['................', '....rrrrrr......', '...rRRRRRRr.....', '..rRrrrrrrRr....', '..rRr....rRr....', '..rRr....rRr....', '..rRrrrrrrRr....', '...rRRRRRRrr....', '....rrrrrrRr....', '.........rRr....', '.........rRr....', '..........rRr...', '...........rr...', '................', '................', '................'], { r: H('#6a4a2a'), R: H('#c8a46a') });
    I('grappling_hook', ['................', '..M.........M...', '..MM..mmm..MM...', '...MM.mMm.MM....', '....MMMMMMM.....', '......mMm.......', '......mMm.......', '.......r........', '......r.........', '.......r........', '........r.......', '.......r........', '......r.........', '.......rr.......', '................', '................'], { M: H('#c8d0d8'), m: H('#6a727a'), r: H('#b8945a') });
    I('campfire_kit', ['................', '................', '.....kkkkk......', '....kKKKKKk.....', '....kKkkkKk.....', '.ll.kkkkkkk.ll..', '.lLlllllllllLl..', '.lLLLLLLLLLLLl..', '..lllllllllll...', '..s.s.s.s.s.s...', '.lLlllllllllLl..', '.lLLLLLLLLLLLl..', '..lllllllllll...', '................', '................', '................'], { k: H('#2a2a2e'), K: H('#5a5a62'), l: H('#4a3420'), L: H('#8a6a40'), s: H('#c8a46a') });
    I('sleeping_bag', ['................', '................', '................', '..pppbbbbbbbbb..', '.pWWWbGGGGGGGGb.', '.pWWWbGgGGGgGGb.', '.pWWWbGGGGGGGGb.', '.pWWWbGGgGGGgGb.', '.pWWWbGGGGGGGGb.', '..pppbbbbbbbbb..', '................', '................', '................', '................', '................', '................'], { p: H('#a89a88'), W: H('#f0e8d8'), b: H('#2a4a32'), G: H('#4a7a5a'), g: H('#c8a040') });
    I('explorer_backpack', ['................', '....rrrrrrrr....', '...rRRRRRRRRr...', '...bbbbbbbbbb...', '..bBBBBBBBBBBb..', '..bBffffffffBb..', '.cbBffffYfffBbc.', '.cbBBBBBBBBBBbc.', '.cbBBBBBBBBBBbc.', '..bBBBBBBBBBBb..', '..bBBpppppBBBb..', '..bBBpBBBpBBBb..', '..bBBpppppBBBb..', '...bbbbbbbbbb...', '................', '................'], { r: H('#5a1a10'), R: H('#8a3a2a'), b: H('#2a3418'), B: H('#5a6a3a'), f: H('#3a4a2a'), Y: H('#c8a040'), c: H('#b8945a'), p: H('#3a4a2a') });
  };
}
if (typeof PACK_LOOK !== 'undefined') PACK_LOOK.explorer_backpack = { body: 'pack_body_e', flap: 'pack_flap_e', metal: 'pack_brass', roll: 'pack_roll_e', big: 1 };
SND_FX.campfire_pop = [0.25, 0.4, (b, v, r) => { b.noise(0, 0.03, 'bp', 1800 + r() * 1200, 1.5, 0.8, { att: 0.0005 }); b.modes(0.002, [[900 + r() * 600, 0.01, 1]], 0.25); }];
SND_FX.hook_throw = [0.5, 0.45, (b, v, r) => { b.noise(0, 0.35, 'bp', 1800, 0.8, 0.5, { att: 0.02, sweep: 0.5 }); }];
SND_FX.hook_clank = [0.6, 0.55, (b, v, r) => { b.modes(0, [[1250 + r() * 200, 0.08, 1], [2900, 0.04, 0.5], [640, 0.12, 0.6]], 0.5); b.noise(0, 0.02, 'hp', 3000, 0.8, 0.4); }];
SND_FX.hook_reel = [0.4, 0.3, (b, v, r) => { b.grains(0, 0.35, 14, 1500, 3500, 2, 0.35); }];
SND_FX.rope_place = [0.4, 0.4, (b, v, r) => { b.noise(0, 0.3, 'bp', 700, 0.8, 0.5, { att: 0.02 }); b.grains(0.05, 0.25, 8, 400, 1200, 1.5, 0.3); }];

// ---- using things: the campfire, rope, the hook, the bag, the kit ------------------------------------------------------
{
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const g = this.g, w = g.world, p = this.player, held = p.inv.held, def = held ? itemDef(held.id) : null, hit = this.target;
    // the grappling hook in hand: throw it, or let go
    if (!repeat && !fromOff && def && def.grapple) { this.grappleUse(); return; }
    if (!repeat && !fromOff && hit && isCampfire(hit.id)) {
      const meta = w.getMeta(hit.x, hit.y, hit.z), out = meta & CAMPFIRE_OUT, x = hit.x, y = hit.y, z = hit.z;
      const tool = def && def.tool && def.tool.type;
      // put it out: a shovel or water
      if (!out && (tool === 'shovel' || (def && def.bucket === 'water'))) {
        w.setBlock(x, y, z, hit.id, meta | CAMPFIRE_OUT);
        g.sfx.playAt('fizz', x + 0.5, y + 0.5, z + 0.5);
        for (let k = 0; k < 14; k++) g.particles.add({ x: x + 0.3 + Math.random() * 0.4, y: y + 0.4, z: z + 0.3 + Math.random() * 0.4, vx: (Math.random() - 0.5) * 0.4, vy: 1 + Math.random(), vz: (Math.random() - 0.5) * 0.4, life: 2, max: 2, size: 0.18, size0: 0.18, grow: 1.5, uv: tileUV(ATLAS.tile.campfire_smoke ?? ATLAS.tile.smoke), light: 0xF8, grav: -0.1, rise: true });
        if (tool === 'shovel') this.wearHeld(1); else if (def.bucket === 'water' && !g.creative) p.inv.held = mkStack('bucket', 1);
        this.dropCampFood(x, y, z, false);
        this.swingArm(); return;
      }
      // light it again
      if (out && def && (def.igniter || held.id === 'fire_charge')) {
        w.setBlock(x, y, z, hit.id, meta & ~CAMPFIRE_OUT); g.sfx.playAt('ignite', x + 0.5, y + 0.5, z + 0.5); if (def.tool) this.wearHeld(1); this.swingArm(); return;
      }
      // pack a kit back up
      if (!held && p.sneaking && (meta & CAMPFIRE_KIT)) {
        this.dropCampFood(x, y, z, true);
        w.setBlock(x, y, z, 0); this.give(mkStack('campfire_kit', 1)); g.sfx.material('wood', 'break'); this.swingArm(); return;
      }
      // food on to cook
      const cooked = held && SMELTING[held.id], cdef = cooked && itemDef(cooked);
      if (!out && cdef && cdef.food && def && def.food) {
        const e = w.getEntity(x, y, z, () => ({ type: 'campfire', items: [null, null, null, null], t: [0, 0, 0, 0] }));
        e.items = e.items || [null, null, null, null]; e.t = e.t || [0, 0, 0, 0];
        const k = e.items.findIndex(s => !s);
        if (k < 0) { this.toast('There\'s no more room on the fire', ''); return; }
        e.items[k] = mkStack(held.id, 1); e.t[k] = 0;
        if (!g.creative) { held.n--; if (held.n <= 0) p.inv.held = null; }
        g.entityChanged(x, y, z); g.sfx.playAt('fizz', x + 0.5, y + 0.6, z + 0.5, 10); this.swingArm(); return;
      }
    }
    // rope: hang it down from here
    if (!repeat && !fromOff && held && held.id === 'rope' && hit) { if (this.hangRope(hit, held)) return; }
    // the campfire kit sets down a campfire you can pack up again
    if (!repeat && !fromOff && def && def.campKit && hit && hit.ny === 1) {
      const [x, y, z] = this.placeTarget(hit);
      if (!w.getBlock(x, y, z) && T_SOLID[w.getBlock(x, y - 1, z)] && !this.blockedByBody(x, y, z)) {
        w.setBlock(x, y, z, B.campfire, CAMPFIRE_KIT); g.sfx.material('wood', 'place');
        if (!g.creative) { held.n--; if (held.n <= 0) p.inv.held = null; }
        this.swingArm(); return;
      }
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  Object.assign(LocalPlayer.prototype, {
    // whatever's cooking comes off (into your bag, or onto the ground)
    dropCampFood(x, y, z, give) {
      const g = this.g, e = g.world.getEntity(x, y, z);
      if (!e || !e.items) return;
      for (let k = 0; k < 4; k++) if (e.items[k]) { if (give) this.give(e.items[k]); else g.dropItem(e.items[k], x + 0.5, y + 0.6, z + 0.5, true); e.items[k] = null; }
      g.entityChanged(x, y, z);
    },
    hangRope(hit, held) {
      const g = this.g, w = g.world, p = this.player;
      // on a rope: add to its bottom end
      let x, y, z;
      if (hit.id === B.rope) { x = hit.x; z = hit.z; y = hit.y; while (w.getBlock(x, y - 1, z) === B.rope) y--; y--; }
      else [x, y, z] = this.placeTarget(hit);
      if (w.getBlock(x, y, z) && !(T_REPLACEABLE[w.getBlock(x, y, z)] && !T_LIQUID[w.getBlock(x, y, z)])) return false;
      // it needs something to hang from (or to stand on)
      if (hit.id !== B.rope && hit.ny !== -1 && !T_SOLID[w.getBlock(x, y + 1, z)] && !T_SOLID[w.getBlock(x, y - 1, z)] && hit.ny !== 0) return false;
      let n = 0;
      const have = g.creative ? 64 : held.n;
      while (n < have && n < 32 && y > 0 && (!w.getBlock(x, y, z) || (T_REPLACEABLE[w.getBlock(x, y, z)] && !T_LIQUID[w.getBlock(x, y, z)]))) {
        w.setBlock(x, y, z, B.rope, 0); n++; y--;
        if (T_SOLID[w.getBlock(x, y, z)]) break;
      }
      if (!n) return false;
      if (!g.creative) { held.n -= n; if (held.n <= 0) p.inv.held = null; }
      g.sfx.playAt('rope_place', x + 0.5, y + 1, z + 0.5); this.swingArm();
      if (n > 1) this.toast(`The rope hangs ${n} blocks down`, '');
      return true;
    },
  });
  // cut a rope and the rest below comes down too
  const baseAfter = LocalPlayer.prototype.afterBreak;
  LocalPlayer.prototype.afterBreak = function (x, y, z, id, meta) {
    const r = baseAfter.call(this, x, y, z, id, meta), g = this.g, w = g.world;
    if (id === B.rope) {
      let n = 0, yy = y - 1;
      while (w.getBlock(x, yy, z) === B.rope) { w.setBlock(x, yy, z, 0, 0, { quiet: true }); n++; yy--; }
      if (n && !g.creative) g.dropItem(mkStack('rope', n), x + 0.5, yy + 1.5, z + 0.5, true);
    }
    if (isCampfire(id)) { const e = g.world.getEntity(x, y, z); if (e && e.items) for (const s of e.items) if (s) g.dropItem(s, x + 0.5, y + 0.5, z + 0.5, true); }
    // the sleeping bag's spawn goes with it
    if (id === B.sleeping_bag) { const p = this.player; if (p.spawn && Math.floor(p.spawn[0]) === x && Math.floor(p.spawn[2]) === z && Math.abs(p.spawn[1] - y) < 1.5) { const b = p.bagRestore; p.spawn = b ? b.spawn : null; p.spawnDim = b ? b.dim : p.spawnDim; p.bagRestore = null; } }
    return r;
  };
  // a portable campfire gives its kit back; a sleeping bag is a single block
  const baseDrops = Game.prototype.dropBlockItems;
  Game.prototype.dropBlockItems = function (x, y, z, id, washed, meta = 0, tool = null) {
    if (isCampfire(id) && (meta & CAMPFIRE_KIT) && this.rules().blockDrops) { this.dropItem(mkStack('campfire_kit', 1), x + 0.5, y + 0.4, z + 0.5, true); return; }
    return baseDrops.call(this, x, y, z, id, washed, meta, tool);
  };
  // stepping on a lit fire burns
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseUpd.call(this, dt, inp), p = this.player, g = this.g;
    if (!p.dead && !g.creative && p.onGround) {
      const bx = Math.floor(p.x), by = Math.floor(p.y - 0.1), bz = Math.floor(p.z);
      if (campfireLit(g.world, bx, by, bz) || campfireLit(g.world, bx, Math.floor(p.y), bz)) { p._campT = (p._campT || 0) + dt; if (p._campT > 0.8) { p._campT = 0; this.hurt(1, { type: 'burn' }); } }
    }
    // the sleeping bag was only for the night
    if (p.bagRestore && (g.meta.day || 0) > p.bagRestore.day && !this.sleeping) { p.spawn = p.bagRestore.spawn; p.spawnDim = p.bagRestore.dim; p.bagRestore = null; this.toast('You roll up your sleeping bag. Your bed is home again.', ''); }
    return r;
  };
  // sleeping in the bag: spawn for the night
  const baseSleep = LocalPlayer.prototype.sleep;
  LocalPlayer.prototype.sleep = function (x, y, z, meta) {
    const g = this.g, p = this.player, bag = g.world.getBlock(x, y, z) === B.sleeping_bag;
    if (bag && g.dim !== DIM.OVERWORLD) { this.toast('You can\'t settle down to sleep here', 'warn'); return; }
    if (bag && !(g.env.day < 0.45)) { this.toast('You can only sleep at night', ''); return; }
    if (bag && !p.bagRestore) p.bagRestore = { spawn: p.spawn && !(Math.floor(p.spawn[0]) === x && Math.floor(p.spawn[2]) === z) ? p.spawn : null, dim: p.spawnDim, day: g.meta.day || 0 };
    const r = baseSleep.call(this, x, y, z, meta);
    if (bag && !this.sleeping) { const b = p.bagRestore; if (b) { p.spawn = b.spawn; p.spawnDim = b.dim; p.bagRestore = null; } }
    return r;
  };
  const baseJSON = Player.prototype.toJSON;
  Player.prototype.toJSON = function () { const o = baseJSON.call(this); if (this.bagRestore) o.bagRestore = this.bagRestore; return o; };
  const baseLoad = Player.prototype.load;
  Player.prototype.load = function (o) { baseLoad.call(this, o); if (o && o.bagRestore) this.bagRestore = o.bagRestore; };
}

// ---- cooking on the fire (host) and what's on it -----------------------------------------------------------------------
{
  const baseTick = Game.prototype.tickFurnaces;
  Game.prototype.tickFurnaces = function (dt) {
    baseTick.call(this, dt);
    const w = this.world;
    for (const ch of w.chunks.values()) {
      if (!ch.blockEntities.size) continue;
      for (const [i, e] of ch.blockEntities) {
        if (e.type !== 'campfire' || !e.items || !isCampfire(ch.blocks[i]) || (ch.meta[i] & CAMPFIRE_OUT)) continue;
        const x = ch.cx * 16 + (i & 15), z = ch.cz * 16 + ((i >> 4) & 15), y = i >> 8;
        e.t = e.t || [0, 0, 0, 0];
        for (let k = 0; k < 4; k++) {
          const s = e.items[k]; if (!s) continue;
          e.t[k] += dt;
          if (e.t[k] >= CAMP_COOK) {
            const out = SMELTING[s.id]; e.items[k] = null; e.t[k] = 0;
            if (out) this.dropItem(mkStack(out, 1), x + CAMP_SPOTS[k][0], y + 0.7, z + CAMP_SPOTS[k][1], false, 0, [(CAMP_SPOTS[k][0] - 0.5) * 2, 3, (CAMP_SPOTS[k][1] - 0.5) * 2]);
            this.sfx.playAt('pop', x + 0.5, y + 0.6, z + 0.5);
            this.entityChanged(x, y, z);
          }
        }
      }
    }
  };
  const baseBE = blockEntityDraws;
  blockEntityDraws = function (game, out, cam, R) {
    baseBE(game, out, cam, R);
    const w = game.world, gl = game.renderer.gl, pcx = Math.floor(cam.x) >> 4, pcz = Math.floor(cam.z) >> 4;
    for (const ch of w.chunks.values()) {
      if (!ch.blockEntities.size || Math.abs(ch.cx - pcx) > 2 || Math.abs(ch.cz - pcz) > 2) continue;
      for (const [i, e] of ch.blockEntities) {
        if (e.type !== 'campfire' || !e.items || !isCampfire(ch.blocks[i])) continue;
        const x = ch.cx * 16 + (i & 15), z = ch.cz * 16 + ((i >> 4) & 15), y = i >> 8;
        const l = w.getLight(x, y + 1, z), light = [l >> 4, Math.max(10, l & 15)];
        for (let k = 0; k < 4; k++) {
          const s = e.items[k]; if (!s || !itemDef(s.id)) continue;
          const im = itemMesh(gl, s.id), m = Mat4.create(), [ox, oz] = CAMP_SPOTS[k];
          Mat4.translate(m, ox, 7.3 / 16, oz); Mat4.rotateY(m, (k < 2 ? 0 : Math.PI) + (k % 2 ? 0.3 : -0.3)); Mat4.rotateX(m, -Math.PI / 2); Mat4.scale(m, 0.4, 0.4, 0.4);
          out.push({ mesh: im.mesh, m, px: x, py: y, pz: z, light, noCull: true });
        }
      }
    }
  };
}

// ---- the grappling hook ---------------------------------------------------------------------------------------------------
// Throw it at a ledge, a wall or a ceiling: it catches, and a rope drops from it to the ground. Climb up, then use the hook
// (or the rope) to take it back. On the top of a block it catches the edge nearest you; on a wall it slides up to the lip if
// that's close.
const HOOK_RANGE = 30, HOOK_ROPE = 1;      // (rope meta bit 1: it belongs to a hook, and goes when the hook does)
class GrappleHook extends Entity {
  constructor(game, lp, x, y, z, vx, vy, vz, stack) { super(game, x, y, z); this.lp = lp; this.vx = vx; this.vy = vy; this.vz = vz; this.w = 0.1; this.h = 0.1; this.netLocalOnly = true; this.back = false; this.stack = stack; }
  update(dt) {
    const g = this.game, w = g.world, lp = this.lp, p = lp && lp.player;
    if (!p) { this.remove = true; return; }
    this.age += dt;
    if (this.back || Math.hypot(this.x - p.x, this.y - p.y - 1.4, this.z - p.z) > HOOK_RANGE || this.age > 4) {
      // nothing caught: it comes back to you
      this.back = true;
      const tx = p.x - this.x, ty = p.y + 1.2 - this.y, tz = p.z - this.z, l = Math.hypot(tx, ty, tz) || 1;
      if (l < 1.2 || this.age > 9) { this.remove = true; if (lp.grapple === this) lp.grapple = null; lp.give(this.stack); return; }
      this.x += tx / l * 24 * dt; this.y += ty / l * 24 * dt; this.z += tz / l * 24 * dt;
      return;
    }
    for (let s = 0; s < 4; s++) {
      const h = dt / 4; this.vy -= 12 * h;
      const ox = Math.floor(this.x), oy = Math.floor(this.y), oz = Math.floor(this.z);
      const nx = this.x + this.vx * h, ny = this.y + this.vy * h, nz = this.z + this.vz * h;
      const bx = Math.floor(nx), by = Math.floor(ny), bz = Math.floor(nz), id = w.getBlock(bx, by, bz);
      if (T_SOLID[id] && !BLOCKS[id].climb) {
        // which face it struck: the way it came in from
        const n = ox !== bx ? [Math.sign(ox - bx), 0, 0] : oz !== bz ? [0, 0, Math.sign(oz - bz)] : [0, Math.sign(oy - by) || 1, 0];
        g.sfx.playAt('hook_clank', nx, ny, nz, 20);
        g.burst(nx, ny, nz, BLOCKS[id].key, 6, 0.6);
        if (lp.grappleLodge(this, bx, by, bz, n)) { this.remove = true; if (lp.grapple === this) lp.grapple = null; }
        else { this.back = true; lp.toast('The hook found nothing to catch on', ''); }
        return;
      }
      this.x = nx; this.y = ny; this.z = nz;
    }
  }
  draws(out) {
    const g = this.game, gl = g.renderer.gl, lp = this.lp, p = lp && lp.player;
    if (!p) return;
    const m = Mat4.create(); Mat4.rotateY(m, Math.atan2(-(this.x - p.x), -(this.z - p.z)) + Math.PI);
    out.push({ mesh: grappleMesh(gl), m, px: this.x, py: this.y, pz: this.z, light: this.lightAt(0) });
    // the rope paying out behind it, from your hand
    const [lx, ly, lz] = p.look(), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    const tip = !lp.viewMode ? [p.x + lx * 0.7 + rx * 0.35, p.y + p.eye + ly * 0.7 - 0.25, p.z + lz * 0.7 + rz * 0.35] : [p.x + rx * 0.4, p.y + 1.2, p.z + rz * 0.4];
    const end = [this.x, this.y, this.z], D = Math.hypot(end[0] - tip[0], end[1] - tip[1], end[2] - tip[2]);
    const sag = 0.05 + D * 0.04, N = 10, line = lineMesh(gl), light = this.lightAt(0);
    let prev = tip;
    for (let i = 1; i <= N; i++) {
      const t = i / N, q = [tip[0] + (end[0] - tip[0]) * t, tip[1] + (end[1] - tip[1]) * t - sag * 4 * t * (1 - t), tip[2] + (end[2] - tip[2]) * t];
      const dx = q[0] - prev[0], dy = q[1] - prev[1], dz = q[2] - prev[2], h = Math.hypot(dx, dz), L = Math.hypot(dx, dy, dz);
      const sm = Mat4.create(); Mat4.translate(sm, prev[0] - this.x, prev[1] - this.y, prev[2] - this.z); Mat4.rotateY(sm, Math.atan2(-dz, dx)); Mat4.rotateZ(sm, Math.atan2(dy, h)); Mat4.scale(sm, L, 1.6, 1.6);
      out.push({ mesh: line, m: sm, px: this.x, py: this.y, pz: this.z, light });
      prev = q;
    }
  }
  hurt() { return 0; }
  snap() { return null; }
}
let GRAPPLE_MESH = null;
function grappleMesh(gl) {
  if (GRAPPLE_MESH) return GRAPPLE_MESH;
  const mb = new MeshBuilder(64), t = tilesOf('hook_metal');
  addBox(mb, [-0.03, -0.03, -0.12], [0.03, 0.03, 0.12], t);
  for (const s of [1, -1]) { addBox(mb, [s > 0 ? 0 : -0.14, -0.025, -0.14], [s > 0 ? 0.14 : 0, 0.025, -0.1], t); addBox(mb, [s > 0 ? 0.1 : -0.14, -0.025, -0.14], [s > 0 ? 0.14 : -0.1, 0.025, -0.04], t); }
  const r = mb.result(); return (GRAPPLE_MESH = makeVAO(gl, r.verts, r.idx));
}
// the hook caught on a lip: claws over the edge toward the wall (facing f), its shank hanging down
SHAPES.grapple_anchor = [
  { b: [7, 2, 7, 9, 12, 9], side: 'hook_metal', end: 'hook_metal' },
  { b: [7, 11, 0, 9, 13, 9], side: 'hook_metal', end: 'hook_metal' },
  { b: [4, 11, 0, 12, 13, 2], side: 'hook_metal', end: 'hook_metal' },
  { b: [4, 9, 0, 6, 13, 2], side: 'hook_metal', end: 'hook_metal' }, { b: [10, 9, 0, 12, 13, 2], side: 'hook_metal', end: 'hook_metal' },
  { b: [7.25, 0, 7.25, 8.75, 2, 8.75], side: 'rope', end: 'rope_end' },
];
Object.assign(LocalPlayer.prototype, {
  grappleUse() {
    const g = this.g, p = this.player, held = p.inv.held;
    if (this.grapple && !this.grapple.remove) return;
    const [lx, ly, lz] = p.look(), sp = 30;
    const stack = cloneStack(held); stack.d = (stack.d || 0) + 1;
    p.inv.held = null;
    const def = itemDef(stack.id); if (def && def.tool && stack.d >= def.tool.durability) { this.toast('Your grappling hook broke', 'warn'); g.sfx.play('hit'); return; }
    const h = new GrappleHook(g, this, p.x + lx * 0.6, p.y + p.eye - 0.1 + ly * 0.6, p.z + lz * 0.6, lx * sp, ly * sp + 2, lz * sp, stack);
    g.entities.push(h); this.grapple = h;
    g.sfx.play('hook_throw'); this.swingArm();
  },
  // it hit something: find where it can catch, and hang the rope down from there
  grappleLodge(h, hx, hy, hz, n) {
    const g = this.g, w = g.world, p = this.player;
    const air = (x, y, z) => { const id = w.getBlock(x, y, z); return !id || (T_REPLACEABLE[id] && !T_LIQUID[id]); };
    const solid = (x, y, z) => T_SOLID[w.getBlock(x, y, z)];
    let A, rx, rz, top, f;
    if (n[1] === 1) {
      // on top of a block: over the edge nearest you
      const dx = p.x - (hx + 0.5), dz = p.z - (hz + 0.5);
      const sx = Math.abs(dx) >= Math.abs(dz) ? Math.sign(dx) : 0, sz = sx ? 0 : Math.sign(dz) || 1;
      if (!air(hx, hy + 1, hz) || !air(hx + sx, hy, hz + sz)) return false;
      A = [hx, hy + 1, hz]; rx = hx + sx; rz = hz + sz; top = hy;
      f = sx > 0 ? 3 : sx < 0 ? 1 : sz > 0 ? 0 : 2;                        // the claws grip back over the block, away from the drop
    } else if (n[1] === -1) {
      if (!air(hx, hy - 1, hz)) return false;
      A = [hx, hy - 1, hz]; rx = hx; rz = hz; top = hy - 2; f = 0;
    } else {
      // a wall: hang from the cell in front of it, sliding up to the lip if that's close
      let ay = hy;
      const ax = hx + n[0], az = hz + n[2];
      if (!air(ax, ay, az)) return false;
      for (let k = 0; k < 3; k++) { if (solid(hx, ay + 1, hz) && air(ax, ay + 1, az)) ay++; else break; }
      A = [ax, ay, az]; rx = ax; rz = az; top = ay - 1;
      f = n[0] > 0 ? 3 : n[0] < 0 ? 1 : n[2] > 0 ? 0 : 2;                    // facing the wall
    }
    w.setBlock(A[0], A[1], A[2], B.grapple_anchor, f);
    let y = top, k = 0;
    while (y > 0 && k < 48 && air(rx, y, rz)) { w.setBlock(rx, y, rz, B.rope, HOOK_ROPE); y--; k++; }
    w.setEntity(A[0], A[1], A[2], { type: 'grapple', stack: h.stack, col: [rx, rz, top, y + 1] });
    g.entityChanged(A[0], A[1], A[2]);
    g.sfx.playAt('rope_place', rx + 0.5, top, rz + 0.5, 20);
    if (k > 1) this.toast(`The hook catches. ${k} blocks of rope drop to the ground`, 'good');
    return true;
  },
  // take the hook back (from its block or any of its rope): the rope comes with it
  grappleTake(ax, ay, az, give) {
    const g = this.g, w = g.world, e = w.getEntity(ax, ay, az);
    if (e && e.col) { const [rx, rz, top, bot] = e.col; for (let y = top; y >= bot; y--) if (w.getBlock(rx, y, rz) === B.rope && (w.getMeta(rx, y, rz) & HOOK_ROPE)) w.setBlock(rx, y, rz, 0, 0, { quiet: true }); }
    const stack = e && e.stack ? e.stack : mkStack('grappling_hook', 1);
    if (w.getBlock(ax, ay, az) === B.grapple_anchor) w.setBlock(ax, ay, az, 0);
    if (give) this.give(stack); else g.dropItem(stack, ax + 0.5, ay + 0.3, az + 0.5, true);
    g.sfx.playAt('rope_place', ax + 0.5, ay + 0.5, az + 0.5, 16);
  },
  // the anchor a hook rope hangs from
  grappleFind(x, y, z) {
    const w = this.g.world;
    if (w.getBlock(x, y, z) === B.grapple_anchor) return [x, y, z];
    let yy = y; while (w.getBlock(x, yy + 1, z) === B.rope) yy++;
    for (const [dx, dy, dz] of [[0, 1, 0], [1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1], [1, 2, 0], [-1, 2, 0], [0, 2, 1], [0, 2, -1]]) if (w.getBlock(x + dx, yy + dy, z + dz) === B.grapple_anchor) return [x + dx, yy + dy, z + dz];
    return null;
  },
});
{
  // using the hook's block or its rope takes it back
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const hit = this.target, w = this.g.world;
    if (!repeat && !fromOff && hit && (hit.id === B.grapple_anchor || (hit.id === B.rope && (w.getMeta(hit.x, hit.y, hit.z) & HOOK_ROPE)))) {
      const a = this.grappleFind(hit.x, hit.y, hit.z);
      if (a) { this.grappleTake(a[0], a[1], a[2], true); this.swingArm(); return; }
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  // breaking the hook drops it, and its rope goes; a hook's rope cut lower down doesn't drop rope
  const baseAfter = LocalPlayer.prototype.afterBreak;
  LocalPlayer.prototype.afterBreak = function (x, y, z, id, meta) {
    if (id === B.rope && (meta & HOOK_ROPE)) { const w = this.g.world; let yy = y - 1; while (w.getBlock(x, yy, z) === B.rope && (w.getMeta(x, yy, z) & HOOK_ROPE)) { w.setBlock(x, yy, z, 0, 0, { quiet: true }); yy--; } return; }
    return baseAfter.call(this, x, y, z, id, meta);
  };
  // breaking the hook's block: it drops (with the block's record), and its rope comes down
  const baseBreak = LocalPlayer.prototype.breakBlock;
  LocalPlayer.prototype.breakBlock = function (x, y, z) {
    const w = this.g.world;
    if (w.getBlock(x, y, z) !== B.grapple_anchor) return baseBreak.call(this, x, y, z);
    const e = w.getEntity(x, y, z), col = e && e.col;
    baseBreak.call(this, x, y, z);
    if (col) { const [rx, rz, top, bot] = col; for (let yy = top; yy >= bot; yy--) if (w.getBlock(rx, yy, rz) === B.rope && (w.getMeta(rx, yy, rz) & HOOK_ROPE)) w.setBlock(rx, yy, rz, 0, 0, { quiet: true }); }
  };
  const baseDrops = Game.prototype.dropBlockItems;
  Game.prototype.dropBlockItems = function (x, y, z, id, washed, meta = 0, tool = null) {
    if (id === B.grapple_anchor || (id === B.rope && (meta & HOOK_ROPE))) return;
    return baseDrops.call(this, x, y, z, id, washed, meta, tool);
  };
}

// ---- the explorer's backpack shows what's in it ----------------------------------------------------------------------
{
  const basePose = LocalPlayer.prototype.pose;
  LocalPlayer.prototype.pose = function () {
    const ps = basePose.call(this), inv = this.player.inv, bp = inv.back.slots[0];
    if (bp && ps.back) {
      const c = (bp.c || []).filter(Boolean).map(s => s.id), gs = bp.gs || [];
      let gear = '';
      if (c.includes('rope')) gear += 'r';
      if (gs[2] || c.includes('grappling_hook')) gear += 'h';
      if (gs[1] || c.includes('campfire_kit')) gear += 'k';
      if (gs[0] || c.includes('sleeping_bag')) gear += 'b';
      if (gear) ps.gear = gear;
    }
    return ps;
  };
}

// ---- (0.9.0.12) the explorer's backpack: straps for the sleeping bag, the campfire and the grappling hook --------
// Three slots of their own, under the pockets. What's strapped on shows on the pack (the bedroll on top, the
// bundle of firewood and the pot underneath, the hook at the side), like a lantern on its hook.
const PACK_GEAR = [['sleeping_bag'], ['campfire_kit', 'campfire'], ['grappling_hook']];
const PACK_GEAR_TIP = ['Sleeping bag — rolled up on top of the pack', 'Campfire — a bundle of firewood and the pot, strapped underneath', 'Grappling hook — hung at the side'];
function packGear(inv) {
  const b = inv.back.slots[0];
  if (!b || b.id !== 'explorer_backpack') return null;
  if (!Array.isArray(b.gs) || b.gs.length !== 3) b.gs = [null, null, null];
  return b.gs;
}
{
  const baseNorm = normalizeStack;
  normalizeStack = function (s) { const out = baseNorm(s); if (out && s && Array.isArray(s.gs)) out.gs = s.gs.map(x => x ? normalizeStack(x) : null); return out; };
  const P = InvUI.prototype, baseArr = P.arr, baseAcc = P.accepts, baseRender = P.render, baseQuick = P.quickMove;
  P.arr = function (group) { return group === 'gear' ? (packGear(this.lp.player.inv) || []) : baseArr.call(this, group); };
  P.accepts = function (group, i, s) { return group === 'gear' ? !!(PACK_GEAR[i] && PACK_GEAR[i].includes(s.id)) : baseAcc.call(this, group, i, s); };
  P.render = function () {
    baseRender.call(this);
    if (!this.mode || !this.root) return;
    const area = this.root.querySelector('.bp-area'); if (!area) return;
    let row = area.querySelector('.bp-gear');
    const gs = packGear(this.lp.player.inv);
    if (!gs) { if (row) row.remove(); return; }
    if (!row) { row = document.createElement('div'); row.className = 'bp-gear'; area.insertBefore(row, area.querySelector('.grid9.bp')); }
    row.innerHTML = '<span class="bp-gear-l">Strapped on</span>' + PACK_GEAR.map((ks, i) => this.slotHTML('gear', i, gs[i], ' eq', ks[0])).join('');
    row.querySelectorAll('.slot').forEach((el, i) => { el.title = PACK_GEAR_TIP[i]; });
  };
  P.quickMove = function (group, i) {
    const a = this.arr(group), s = a[i], gs = packGear(this.lp.player.inv);
    if (s && gs && group !== 'gear') { const k = PACK_GEAR.findIndex(ks => ks.includes(s.id)); if (k >= 0 && !gs[k]) { gs[k] = s; a[i] = null; this.g.sfx.play('equip'); return; } }
    if (s && group === 'gear') { const left = this.lp.player.inv.main.add(s); if (left <= 0) a[i] = null; else s.n = left; return; }
    return baseQuick.call(this, group, i);
  };
}
