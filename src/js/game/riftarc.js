// ---------------------------------------------------------------------------
// game/riftarc.js — 0.9: the Temporal Incursion (the players' story).
//
//   Phase 1, the quiet observer: he watches from far off (game/haunt.js).
//   Phase 2, the catalyst: some while after you find your first village a
//     rift tears open in its square, a window onto his bruised purple realm.
//     The elder knows the old tale: the keepers of the deep places (the
//     dungeon mini-bosses) hold the keys of time. Bring four Realm Fragments.
//   Phase 3, the temporal gauntlet: every fragment thins the boundary. The
//     world's stability falls and he grows bolder: standing in doorways and
//     vanishing with a whisper of static when you come near, leaving signs,
//     stepping out of little rifts to stare (the Dread), letting corrupted
//     creatures through, and at the end freezing time to look at you, noises
//     where nothing happened, villagers' words breaking into his, the sky
//     going wrong. He never hurts you, and goes when you hit him, come close
//     or look at him too long.
//   Phase 4, the threshold: give the rift its four fragments and it steadies
//     into a gateway. Beyond it is his realm: a corrupted copy of his own
//     pocket dimension at an enormous scale, hall after hall of cracked,
//     glowing rift stone, broken pieces of the overworld floating in the air,
//     corrupted creatures, and at the end, him. Win and the rift is sealed:
//     no more haunting, the villages at peace, his blade and his staff yours,
//     and the realm's stone and crystal to build with.
//
// /rift (a cheat) moves the story along for testing: open, frag, gate, go, seal.
// ---------------------------------------------------------------------------
DIM.REALM = 4;
DIM_NAME[4] = "Herobrine's Realm";
const RIFT_HALL = 112, RIFT_HALLS = 5, RIFT_FLOOR = 40, RIFT_CEIL = 82;
const RIFT_NEED = 4;
// (Shadowbloom) the old Temporal Incursion story is retired: the rift never opens, no fragments drop. The code stays
// so the portal and world systems that grew around it keep working; the campaign lives in campaign/*.
const RIFT_OFF = true;

defItem('realm_fragment', { name: 'Realm Fragment', rarity: 'epic', maxStack: 16, desc: 'A shard of his realm, warm and humming. The rift wants it.' });
defItem('watcher_blade', { name: "Watcher's Blade", rarity: 'epic', maxStack: 1, holy: true, tool: { type: 'sword', tier: 6, speed: 1, damage: 11, durability: 5200 }, desc: 'Taken from the one who watched. Bites the undead.' });
defItem('rift_staff', { name: 'Rift Staff', rarity: 'epic', maxStack: 1, staff: { name: 'Rift Staff', power: 2.2, regen: 0.8, gem: '#c040ff' }, tool: { type: 'staff', tier: 0, speed: 1, damage: 4, durability: 4800 }, desc: 'Use to cast your spell · G to change spell' });

// ---- the corrupted ones, and him -------------------------------------------------------------------------
{
  const T = (from, o) => Object.assign({}, MOB_TYPES[from] || {}, { special: true, base: from, rift: true, tint: [0.65, 0.2, 0.95, 0.35] }, o);
  Object.assign(MOB_TYPES, {
    rift_ghoul: T('ghoul', { label: 'a rift ghoul', hp: 32, damage: 5, speed: 3.2 }),
    rift_skeleton: T('skeleton', { label: 'a rift skeleton', hp: 28 }),
    rift_spider: T('spider', { label: 'a rift spider', hp: 26, damage: 4 }),
    herobrine: { model: 'herobrine', label: 'Herobrine', hp: 360, w: 0.3, h: 1.8, speed: 4.4, hostile: true, special: true, boss: true, mini: true, damage: 7, knockResist: 0.95, xp: 600, fireImmune: true, drops: [] },
  });
  for (const k of ['rift_ghoul', 'rift_skeleton', 'rift_spider']) MONSTER_AI[k] = function (dt, p, dist, dyp, toPlayer) {
    if (Math.random() < dt * 6) spellSpark(this.game, this.x + (Math.random() - 0.5) * 0.6, this.y + Math.random() * this.h, this.z + (Math.random() - 0.5) * 0.6, 'mana_arcane', { vy: 0.4, life: 0.6, size: 0.05 });
    const f = MONSTER_AI[this.T.base];
    return this.asType(this.T.base, () => (f || MONSTER_AI.__base).call(this, dt, p, dist, dyp, toPlayer));
  };
}

// ---- the realm: hall after hall, along +x ------------------------------------------------------------------
WorldGen.prototype.realmIslands = function (hi) {
  const key = 'ri' + hi;
  let l = this.colCache.get(key);
  if (l) return l;
  l = [];
  if (hi >= 1 && hi <= 3) {
    const r = mulberry32(hash32(this.seed, hi, 4, 4444));
    for (let k = 0; k < 5; k++) l.push({ x: hi * RIFT_HALL + 14 + r() * 68, y: 52 + r() * 20, z: -34 + r() * 68, r: 4 + r() * 4, tree: r() < 0.5 });
  }
  this.colCache.set(key, l);
  return l;
};
WorldGen.prototype.generateRealm = function (ch) {
  const bx = ch.cx * 16, bz = ch.cz * 16;
  const W = B.rift_wall, G = B.rift_glass, C = B.rift_crystal;
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
    const wx = bx + lx, wz = bz + lz;
    const hi = Math.floor((wx + 2) / RIFT_HALL), x0 = hi * RIFT_HALL, x1 = x0 + 95, hx = wx - x0;
    if (hi < 0 || hi >= RIFT_HALLS) continue;
    const set = (y, id) => { if (y > 0 && y < CH) ch.blocks[cidx(lx, y, lz)] = id; };
    const hf = (s) => hashFloat(wx, wz, this.seed, s);
    const inHallX = wx >= x0 && wx <= x1, inHallZ = wz >= -48 && wz <= 47;
    const shellX = wx >= x0 - 2 && wx <= x1 + 2, shellZ = wz >= -50 && wz <= 49;
    const corr = hi < RIFT_HALLS - 1 && wx > x1 && wx <= x1 + 17;          // the passage to the next hall
    const corrIn = corr && wz >= -4 && wz <= 3, corrShell = corr && wz >= -6 && wz <= 5;
    const door = (wx >= x1 + 1 || wx <= x0 - 1) && wz >= -4 && wz <= 3;   // the openings in the hall's end walls
    if (inHallX && inHallZ) {
      // the floor: rift stone, cracked through with glass and crystal; the ceiling far above
      for (let y = RIFT_FLOOR - 2; y <= RIFT_FLOOR; y++) set(y, W);
      const q = hf(1);
      if (q < 0.035) set(RIFT_FLOOR, C); else if (q < 0.1) { set(RIFT_FLOOR, G); set(RIFT_FLOOR - 1, C); }
      set(RIFT_CEIL, W); set(RIFT_CEIL + 1, W);
      // crystals hanging from the ceiling
      if (hf(2) < 0.025) { const n = 1 + Math.floor(hf(8) * 5); for (let y = RIFT_CEIL - n; y < RIFT_CEIL; y++) set(y, C); }
      // pillars, each hall's grid turned a little from the last
      const px = ((hx + 7 + hi * 5) % 24 + 24) % 24, pz = ((wz + 51 + hi * 9) % 24 + 24) % 24;
      if (px < 3 && pz < 3 && hi < RIFT_HALLS - 1) { for (let y = RIFT_FLOOR + 1; y < RIFT_CEIL; y++) set(y, (y % 13 === 0 && px === 1) ? C : W); }
      // the last hall: his arena, a ring of crystal and a dais
      if (hi === RIFT_HALLS - 1) {
        const d = Math.hypot(hx - 48, wz);
        if (d > 20 && d < 21.5) set(RIFT_FLOOR + 1, C);
        if (d < 3.5) set(RIFT_FLOOR + 1, W);
        if (d > 30 && d < 31 && hf(3) < 0.4) for (let y = RIFT_FLOOR + 1; y < RIFT_FLOOR + 1 + Math.floor(hf(4) * 18); y++) set(y, W);
      }
      // broken pieces of the overworld, hanging in the air
      for (const is of this.realmIslands(hi)) {
        const dx = wx + 0.5 - is.x, dz = wz + 0.5 - is.z, rr = (dx * dx + dz * dz) / (is.r * is.r);
        if (rr >= 1) continue;
        const k = Math.sqrt(1 - rr), top = Math.floor(is.y + k * 1.5), bot = Math.floor(is.y - k * is.r * 1.1 - hf(5) * 2);
        for (let y = bot; y <= top; y++) set(y, y === top ? B.grass : y >= top - 2 ? B.dirt : (hf(6 + y) < 0.06 ? B.coal_ore : B.stone));
        if (is.tree && Math.abs(dx) < 0.6 && Math.abs(dz) < 0.6) for (let y = top + 1; y <= top + 4; y++) set(y, B.log);
        if (is.tree && Math.abs(dx) < 2.6 && Math.abs(dz) < 2.6 && Math.hypot(dx, dz) > 0.6) for (let y = top + 3; y <= top + 5; y++) if (hf(30 + y) < 0.8) set(y, B.leaves);
      }
    } else if (shellX && shellZ && !(door && corrIn)) {
      // the walls: rift stone with glowing veins, opened where the passages run
      const openDoor = door && wz >= -4 && wz <= 3;
      for (let y = RIFT_FLOOR - 2; y <= RIFT_CEIL + 1; y++) {
        if (openDoor && y > RIFT_FLOOR && y <= RIFT_FLOOR + 10 && ((wx > x1 && hi < RIFT_HALLS - 1) || (wx < x0 && hi > 0))) continue;
        set(y, hashFloat(wx, y, wz, this.seed) < 0.03 ? C : W);
      }
    }
    if (corrShell && !(inHallX && inHallZ)) {
      for (let y = RIFT_FLOOR - 2; y <= RIFT_FLOOR + 12; y++) {
        const inside = corrIn && y > RIFT_FLOOR && y <= RIFT_FLOOR + 10;
        set(y, inside ? 0 : (y === RIFT_FLOOR && corrIn && hf(7) < 0.15 ? G : hashFloat(wx, y, wz, this.seed) < 0.04 ? C : W));
      }
    }
  }
  ch.recomputeMaxY();
};
{
  const baseGen = WorldGen.prototype.generate;
  WorldGen.prototype.generate = function (ch) {
    if (this.dim === DIM.REALM) { this.fillClimate(ch); return this.generateRealm(ch); }
    return baseGen.call(this, ch);
  };
  // the realm's sky: a bruised purple dark; and the overworld's going wrong near the end
  const baseEnv = Game.prototype.computeEnv;
  Game.prototype.computeEnv = function (dim, fixedT) {
    const e = baseEnv.call(this, dim, fixedT);
    const rgb = (h) => hexRGB(h).map(v => v / 255);
    if (dim === DIM.REALM) {
      e.day = 0.3; e.zenith = rgb('#14041e'); e.horizon = rgb('#4a0e5a'); e.fog = rgb('#2c0838'); e.fogStart = 0.35; e.stars = 0; e.voidBelow = true; e.showSun = false;
      e.minLight = Math.max(e.minLight || 0, 0.06);
    } else if (dim === 0 && fixedT === undefined && this.meta && riftStability(this) < 15 && !(this.meta.rift || {}).sealed) {
      const k = 0.35, mixc = (a, b) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
      e.zenith = mixc(e.zenith, rgb('#3a0a5a')); e.horizon = mixc(e.horizon, rgb('#8a2aa0')); e.fog = mixc(e.fog, rgb('#4a1a5a'));
    }
    return e;
  };
}

// ---- the look of it ---------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('rift_wall', p => {
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.set(x, y, shade(H('#2a1438'), 0.85 + p.rand() * 0.3));
      for (let k = 0; k < 5; k++) { let x = Math.floor(p.rand() * 32), y = Math.floor(p.rand() * 32); for (let i = 0; i < 14; i++) { p.set(x & 31, y & 31, mix(H('#ff60ff'), H('#9a30d0'), p.rand())); x += p.rand() < 0.5 ? 1 : 0; y += p.rand() < 0.6 ? 1 : -1; } }
      for (let k = 0; k < 30; k++) p.set(Math.floor(p.rand() * 32), Math.floor(p.rand() * 32), H('#160a20'));
    }, 0, undefined, GR);
    addTile('rift_glass', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const edge = x === 0 || y === 0 || x === 15 || y === 15; p.set(x, y, edge ? H('#e080ff') : H('#7a2aa0'), edge ? 230 : 110); } });
    addTile('rift_crystal', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const f = Math.abs(((x + y) % 8) - 4) / 4; p.set(x, y, mix(H('#ffd0ff'), H('#b040e0'), f * 0.8 + p.rand() * 0.2)); } });
    addTile('rift_tear', p => {
      for (let y = 0; y < 16; y++) {
        const half = 1.2 + Math.sin(y / 15 * Math.PI) * 6 + (p.rand() - 0.5) * 1.6;
        for (let x = 0; x < 16; x++) {
          const d = Math.abs(x - 7.5) - half;
          if (d > 1.6) { p.set(x, y, [0, 0, 0], 0); continue; }
          p.set(x, y, d > 0 ? H('#ff70ff') : d > -1.2 ? H('#c040ff') : mix(H('#0a0010'), H('#3a0a50'), p.rand() * 0.6), d > 0 ? Math.round(255 * (1 - d / 1.6)) : 255);
        }
      }
    });
    addItem('realm_fragment', p => { for (const [x, y, c] of [[7, 3, '#ffd0ff'], [8, 4, '#e080ff'], [6, 5, '#c040ff'], [7, 5, '#ff80ff'], [8, 5, '#a020e0'], [9, 6, '#c040ff'], [6, 7, '#7a10b0'], [7, 7, '#e080ff'], [8, 7, '#c040ff'], [7, 9, '#a020e0'], [8, 9, '#7a10b0'], [6, 8, '#c040ff'], [9, 8, '#e080ff'], [7, 11, '#7a10b0'], [8, 10, '#c040ff'], [7, 6, '#ffffff'], [7, 8, '#ff80ff'], [8, 8, '#ff80ff'], [8, 6, '#ffd0ff']]) p.set(x, y, H(c)); });
    addItem('watcher_blade', p => { for (let i = 0; i < 10; i++) { p.set(4 + i, 11 - i, H('#e8e8f0')); p.set(5 + i, 11 - i, H('#a8a8c0')); p.set(4 + i, 10 - i, H('#ffffff')); } for (const [x, y] of [[2, 11], [3, 12], [4, 13], [5, 12], [3, 10]]) p.set(x, y, H('#3a2a4a')); p.set(1, 14, H('#e8e8f0')); p.set(2, 13, H('#2a1a3a')); p.set(13, 2, H('#ffffff')); p.set(12, 3, H('#c040ff')); });
    addItem('rift_staff', p => { for (let i = 0; i < 11; i++) { p.set(2 + i, 13 - i, H('#2a1a3a')); p.set(3 + i, 13 - i, H('#4a2a5a')); } for (const [x, y, c] of [[12, 1, '#ffffff'], [13, 2, '#e080ff'], [12, 2, '#c040ff'], [13, 3, '#a020e0'], [14, 2, '#7a10b0'], [11, 2, '#7a10b0']]) p.set(x, y, H(c)); });
  };
}
Object.assign(SND_FX, {
  rift_hum: [2.5, 0.5, (b, v, r) => { b.modes(0, [[55, 1.2, 0.6], [82.5, 1, 0.4], [110.3, 0.9, 0.25], [164, 0.6, 0.1]], 0.6, { droop: -0.02 }); b.noise(0, 2.2, 'bp', 400, 4, 0.12, { att: 0.6 }); }],
  rift_open: [2.0, 0.85, (b, v, r) => { b.noise(0, 1.6, 'bp', 200, 0.8, 0.9, { sweep: 8, att: 0.3 }); b.noise(0.4, 1.2, 'hp', 3000, 0.7, 0.3, { att: 0.2 }); b.thump(0.9, 90, 30, 0.9, 0.8); }],
  rift_static: [0.8, 0.6, (b, v, r) => { for (let i = 0; i < 18; i++) b.noise(r() * 0.7, 0.01 + r() * 0.04, 'hp', 2000 + r() * 4000, 0.6, 0.5 + r() * 0.5, { att: 0.001 }); }],
  rift_whisper: [1.4, 0.4, (b, v, r) => { for (let i = 0; i < 5; i++) b.noise(i * 0.22 + r() * 0.05, 0.18, 'bp', [800, 1400, 2400, 1100, 1900][i], 6, 0.6, { att: 0.04 }); b.noise(0, 1.3, 'hp', 4500, 0.7, 0.15, { att: 0.3 }); }],
  rift_boom: [3.0, 0.9, (b, v, r) => { b.thump(0, 70, 22, 2.4, 1); b.noise(0, 2.6, 'lp', 260, 0.7, 0.8, { brown: true, att: 0.01, curve: 0.5 }); b.noise(0.1, 1.5, 'bp', 1200, 0.6, 0.25, { sweep: 0.3 }); }],
});

// ---- the story's state --------------------------------------------------------------------------------------
function riftOf(g) { return g.meta.rift || (g.meta.rift = { stage: 0, frags: 0 }); }
function riftStability(g) {
  const R = g.meta && g.meta.rift;
  if (!R || R.sealed || !R.stage) return 100;
  if (R.stage >= 3) return 5;
  return Math.max(8, 100 - 26 * Math.min(RIFT_NEED, R.frags || 0));   // (0.9.0.24) one fragment already wakes him (was 78%: nothing until the second)
}
function riftChanged(g) { if (g.net && !g.isGuest) g.net.all({ t: 'adv', k: 'rift', r: g.meta.rift }); g.saveSoon && g.saveSoon(); }
function riftSay(g, msg, kind, near) { for (const l of g.locals) if (!near || Math.hypot(l.player.x - near[0], l.player.z - near[2]) < 64) l.toast(msg, kind || ''); }

// ---- the tear itself -------------------------------------------------------------------------------------------
class RiftTear extends Entity {
  dispose() { if (this.mesh) { freeVAO(this.game.renderer.gl, this.mesh); this.mesh = null; } }
  constructor(game, x, y, z, kind, yaw) {
    super(game, x, y, z); this.netLocalOnly = true; this.kind = kind; this.yaw = yaw || 0; this.t = 0; this.mesh = null; this.open = kind === 'micro' ? 0 : 1; this.life = kind === 'micro' ? 6 : 1e9;
    this.humT = 0;
  }
  size() {
    const R = riftOf(this.game);
    if (this.kind === 'micro') return [0.9 * this.open, 2.2 * this.open];
    if (this.kind === 'gate' || this.kind === 'exit') return [2.6, 4.2];
    return [1 + Math.min(RIFT_NEED, R.frags || 0) * 0.22, 2.6 + Math.min(RIFT_NEED, R.frags || 0) * 0.2];
  }
  update(dt) {
    const g = this.game;
    this.t += dt; this.age += dt;
    if (this.kind === 'micro') { this.life -= dt; this.open = Math.min(1, this.t * 2, Math.max(0, this.life)); if (this.life <= 0) { this.remove = true; return; } }
    const [w, h] = this.size();
    // motes drawn into it, sparks off its edges
    const fx = -Math.cos(this.yaw), fz = Math.sin(this.yaw);   // along its face
    for (let k = 0; k < (this.kind === 'gate' || this.kind === 'exit' ? 4 : 2); k++) {
      const a = Math.random() * TAU, r = 1.5 + Math.random() * 2.5;
      const sx = this.x + Math.cos(a) * r, sy = this.y + h / 2 + Math.sin(a) * r * 0.8, sz = this.z + Math.sin(a * 1.3) * r * 0.6;
      spellSpark(g, sx, sy, sz, 'mana_arcane', { vx: (this.x - sx) * 1.2, vy: (this.y + h / 2 - sy) * 1.2, vz: (this.z - sz) * 1.2, life: 0.8, size: 0.06 });
    }
    if (Math.random() < dt * 8) { const s = (Math.random() - 0.5) * w, yy = this.y + Math.random() * h; spellSpark(g, this.x + fx * s, yy, this.z + fz * s, 'mana_arcane', { vx: (Math.random() - 0.5), vy: 0.5, vz: (Math.random() - 0.5), life: 0.6, size: 0.05 }); }
    // its hum
    if (g.locals.length && (this.humT -= dt) <= 0) { this.humT = 2.4; const d = Math.min(...g.locals.map(l => Math.hypot(l.player.x - this.x, l.player.z - this.z))); if (d < 28) g.sfx.playAt('rift_hum', this.x, this.y + h / 2, this.z); }
    // stepping through
    if (this.kind === 'gate' || this.kind === 'exit') {
      for (const l of g.locals) {
        const p = l.player; if (p.dead || l.riftCd > 0) continue;
        const dx = p.x - this.x, dz = p.z - this.z, along = dx * fx + dz * fz, across = -dx * fz + dz * fx;
        if (Math.abs(along) < w / 2 && Math.abs(across) < 0.6 && p.y > this.y - 0.5 && p.y < this.y + h) { l.riftCd = 3; riftTravel(g, this.kind === 'gate' ? DIM.REALM : 0, l); }
      }
    }
  }
  draws(out) {
    if (!this.mesh) {
      const mb = new MeshBuilder(24), t = tilesOf('rift_tear');
      addBox(mb, [-0.5, 0, -0.02], [0.5, 1, 0.02], t);
      const r = mb.result(); this.mesh = makeVAO(this.game.renderer.gl, r.verts, r.idx);
    }
    const [w, h] = this.size(), m = Mat4.create(), wob = 1 + Math.sin(this.t * 3) * 0.04;
    Mat4.rotateY(m, this.yaw); Mat4.scale(m, w * wob, h * (2 - wob), 1);
    out.push({ mesh: this.mesh, m, px: this.x, py: this.y, pz: this.z, light: [15, 15], unlit: true, noCull: true });
  }
  glow(out) {
    const [w, h] = this.size(), uv = tileUV(ATLAS.tile.mana_arcane ?? ATLAS.tile.white);
    for (let k = 0; k < 4; k++) out.push({ x: this.x, y: this.y + h * (0.2 + k * 0.2), z: this.z, size: w * 0.9 + Math.sin(this.t * 2 + k) * 0.1, uv, light: 0xFF });
  }
}

// ---- his realm's door: going through ------------------------------------------------------------------------------
async function riftTravel(g, to, lp) {
  if (g.isGuest) { if (g.net) g.net.send({ t: 'adv', k: 'gate', to }); return; }
  const R = riftOf(g);
  if (to === DIM.REALM && R.stage < 3) return;
  await g.changeDimension(to, () => {
    if (to === DIM.REALM) { for (const l of g.locals) { l.player.x = 10.5 + l.index; l.player.y = RIFT_FLOOR + 1; l.player.z = 0.5; l.player.yaw = -Math.PI / 2; } return [10.5, RIFT_FLOOR + 1, 0.5]; }
    const at = R.at || [g.meta.spawn[0], 90, g.meta.spawn[2]];
    for (const l of g.locals) { l.player.x = at[0] + 2.5 + l.index * 0.6; l.player.y = at[1] + 0.2; l.player.z = at[2] + 0.5; }
    return [at[0] + 2.5, at[1] + 0.2, at[2] + 0.5];
  });
  if (to === DIM.REALM) {
    riftSay(g, R.sealed ? 'His realm, quiet now' : 'His realm. Somewhere far down these halls, he waits', R.sealed ? '' : 'warn');
    for (const l of g.locals) { const S = l.player.stats || (l.player.stats = {}); if (!S.realmSeen) { S.realmSeen = 1; l.grantXP(80); } }
  }
}

// ---- the story moving on (host), and his doings ---------------------------------------------------------------------
const RIFT = { tickT: 0, eventT: 120, tears: [], dreadT: 0, frozenT: 0 };
function riftTick(g, dt) {
  if (!g.meta || !g.world || g.state !== 'playing') return;
  const R = riftOf(g), lp = g.local;
  // the tears this machine draws
  RIFT.tears = RIFT.tears.filter(t => !t.remove && g.entities.includes(t));
  const want = [];
  if (g.dim === 0 && R.stage >= 1 && R.at) want.push([R.stage >= 3 ? 'gate' : 'window', R.at, R.yaw || 0]);   // (0.9.0.24) sealed, the gateway stays: his realm can be visited again, quiet
  if (g.dim === DIM.REALM) { want.push(['exit', [3.5, RIFT_FLOOR + 1, 0.5], Math.PI / 2]); if (R.sealed) want.push(['exit', [(RIFT_HALLS - 1) * RIFT_HALL + 48.5, RIFT_FLOOR + 2, 0.5], Math.PI / 2]); }
  for (const [kind, at, yaw] of want) {
    if (RIFT.tears.some(t => t.kind === kind && Math.abs(t.x - at[0]) < 1 && Math.abs(t.z - at[2]) < 1)) continue;
    if (!g.world.isLoaded(Math.floor(at[0]), Math.floor(at[2]))) continue;
    const t = new RiftTear(g, at[0], at[1], at[2], kind, yaw); g.entities.push(t); RIFT.tears.push(t);
  }
  for (const t of RIFT.tears) if (t.kind !== 'micro' && !want.some(([k]) => k === t.kind)) t.remove = true;
  for (const l of g.locals) if (l.riftCd > 0) l.riftCd -= dt;
  // the Dread: the screen closing in while he stares
  // (0.9.0.24) each player has their own: RIFT.dreadT (everyone here) and l.dreadT (only the one he looked at)
  if (RIFT.dreadT > 0) RIFT.dreadT -= dt;
  for (const l of g.locals) {
    if (l.dreadT > 0) l.dreadT -= dt;
    if (!l.el) continue;
    let fx = l.el.querySelector('.fx-dread');
    if (!fx) { fx = document.createElement('div'); fx.className = 'fx fx-dread'; l.el.prepend(fx); }
    const k = Math.min(1, Math.max(0, RIFT.dreadT, l.dreadT || 0) / 0.6);
    fx.style.opacity = k.toFixed(2); fx.hidden = k <= 0;
  }
  if (g.isGuest) return;
  const TK = RIFT.tickD || (RIFT.tickD = {});
  if ((TK[g.dim] = (TK[g.dim] ?? 1) - dt) > 0) return;
  TK[g.dim] = 1;
  // ---- the catalyst: a while after the first village is found, the rift opens in its square ----
  if (!RIFT_OFF && !R.stage && g.dim === 0 && (g.meta.playTime || 0) > 900) {
    // (0.9.0.24) the story begins even with "He is here" off (that only sends his scares away), and with any village found
    // by anyone here; failing that, after a while, the village by the world's spawn
    let vid = null;
    for (const l of g.allLocals ? g.allLocals() : g.locals) { const S = l.player.stats || {}; if (S.vseen) { vid = Object.keys(S.vseen)[0]; break; } }
    if (!vid && g.meta.vfound) vid = g.meta.vfound;
    if (!vid) for (const r of riftRemotes(g)) { const vv = villageAtPos(g, r.x, r.z, 8); if (vv) { vid = vv.id; g.meta.vfound = vid; break; } }   // (0.9.0.46) a guest in a village counts too
    let v = vid && villageById(g, vid);
    if (!v && (g.meta.playTime || 0) > 1500 && typeof riftSpawnVillage === 'function') v = riftSpawnVillage(g) || riftNearVillage(g);
    if (v) {
      Object.assign(R, { stage: 1, frags: R.frags || 0, village: v.id, at: [v.x + 0.5, v.y + 1, v.z + 5.5], yaw: 0, opened: npcDay(g) });
      riftChanged(g);
      const near = g.locals.some(l => Math.hypot(l.player.x - v.x, l.player.z - v.z) < 90);
      if (near) { g.sfx.playAt('rift_open', v.x, v.y + 2, v.z, 80); riftSay(g, `Something tears open in the square of ${v.name}…`, 'warn'); }
      else riftSay(g, `Far away, in ${v.name}, the air tears with a sound like cloth. The elder will know more.`, 'warn');
    }
  }
  if (g.dim === DIM.REALM) { realmTick(g); return; }
  if (!hauntDimOk(g) || !R.stage || R.sealed || !lp || g.rules().haunting === false) return;   // (0.9.0.50) every land, not only the Overworld
  // (0.9.0.46) everyone playing here: the players at this machine (none on a dedicated server) and those joined
  const live = (typeof SERVER !== 'undefined' && SERVER.on ? [] : g.locals.filter(l => !l.player.dead)).concat(riftRemotes(g));
  if (!live.length) return;
  // ---- the gauntlet: his doings, bolder as the boundary thins ----
  const st = riftStability(g);
  if (st >= 75) return;
  RIFT.eventT -= 1 * (st < 15 ? 2.2 : st < 40 ? 1.6 : 1);
  if (g.haunt && g.haunt.active && !g.haunt.active.remove && (g.time - (g.haunt.active.born || 0) > 90 || !g.entities.includes(g.haunt.active))) g.haunt.active.remove = true;   // (0.9.0.47) one left behind
  if (RIFT.eventT > 0 || hauntBossFight(g, riftRemotes(g)) || (g.haunt && g.haunt.active && !g.haunt.active.remove)) return;
  RIFT.eventT = 160 + Math.random() * 220;
  const r = Math.random(), who = live[Math.floor(Math.random() * live.length)];
  const ev = st < 15 && r < 0.3 ? 'freeze' : st < 15 && r < 0.55 ? 'phantom' : st < 40 && r < 0.75 ? 'micro' : 'door';
  const mon = ev === 'micro' && Math.random() < (g.env.day < 0.45 ? 0.45 : 0.2);
  if (who instanceof RemotePawn) g.net.toPawn(who, { t: 'adv', k: 'haunt', ev, mon: mon ? 1 : 0, i: who.idx });
  else riftEvent(g, who, ev, mon);
}
function riftEvent(g, lp, ev, mon) {
  if (g.dim === DIM.POCKET) { if (g.haunt) g.haunt.forceSighting(); return; }   // (0.9.0.50) in a pocket dimension he only ever comes through its portal
  if (ev === 'freeze') riftFreeze(g, lp);
  else if (ev === 'phantom') riftPhantom(g, lp);
  else if (ev === 'micro') riftMicro(g, lp, mon);
  else riftDoorway(g, lp);
}
// the players joined over the network who are in the overworld, as the host sees them
function riftRemotes(g) {
  if (!g.net || g.net.role !== 'host') return [];
  return [...g.net.remotes.values()].filter(r => (r.dim ?? 0) === g.dim && r.placed !== false && !r.dead);
}
// what comes through a little rift (the host makes them, wherever the rift opened)
function riftMobs(g, x, y, z) {
  for (let k = 0; k < 2 + Math.floor(Math.random() * 2); k++) { const type = ['rift_ghoul', 'rift_skeleton', 'rift_spider'][Math.floor(Math.random() * 3)]; const m = g.addEntity(new Mob(g, type, x + (Math.random() - 0.5), y, z + (Math.random() - 0.5))); if (m) m.huntT = 30; }
}
// (0.9.0.46) failing a village by the spawn: the nearest one to anyone playing
function riftNearVillage(g) {
  const gen = g.world && g.world.gen; if (!gen || !gen.villageAt) return null;
  const spots = g.locals.map(l => [l.player.x, l.player.z]).concat(riftRemotes(g).map(r => [r.x, r.z]));
  let best = null, bd = 1e9;
  for (const [x, z] of spots) {
    const rx = Math.floor(x / VREG), rz = Math.floor(z / VREG);
    for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const v = gen.villageAt(rx + dx, rz + dz); if (!v) continue; const d = Math.hypot(v.x - x, v.z - z); if (d < bd) { bd = d; best = v; } }
  }
  return best;
}
// in a doorway of the village you're in, or somewhere at the edge of sight
function riftDoorway(g, lp) {
  const p = lp.player, v = g.dim === 0 ? villageAtPos(g, p.x, p.z, 16) : null;
  if (v) {
    const doors = v.blds.filter(b => VTEMPLATES[b.type].H > 3).map(b => vWorld(b, (b.W - 1) / 2, 1, 0)).filter(d => { const dd = Math.hypot(d[0] - p.x, d[2] - p.z); return dd > 10 && dd < 34 && Math.abs(d[1] - p.y) < 8; });   // (0.9.0.49) not a doorway far above you, down a mine
    if (doors.length) {
      const d = doors[Math.floor(Math.random() * doors.length)];
      const w = new Watcher(g, d[0] + 0.5, d[1], d[2] + 0.5, 'peek'); w.riftDoor = true;
      g.entities.push(w); if (g.haunt) g.haunt.active = w;
      // and now and then, a door left open
      if (!g.isGuest && Math.random() < 0.4) { const b = v.blds[Math.floor(Math.random() * v.blds.length)]; if (VTEMPLATES[b.type].H > 3) { const q = vWorld(b, (b.W - 1) / 2, 1, 0), id = g.world.getBlock(q[0], q[1], q[2]); if (BLOCKS[id].door && !(g.world.getMeta(q[0], q[1], q[2]) & 4)) { const m = g.world.getMeta(q[0], q[1], q[2]); g.world.setBlock(q[0], q[1], q[2], id, m | 4); g.world.setBlock(q[0], q[1] + 1, q[2], id, m | 4 | 16); g.sfx.playAt(doorSound(BLOCKS[id], true), q[0], q[1] + 1, q[2]); } } }
      return;
    }
  }
  if (g.haunt) g.haunt.forceSighting();
}
// (0.9.0.49) somewhere to stand near the player's own level: ground beneath and room for him, the nearest first. (It used
// to start four blocks up and work down, which in a tunnel or a cave starts inside the rock and never finds the floor.)
function riftStandY(w, x, z, py) {
  const fx = Math.floor(x), fz = Math.floor(z), y0 = Math.floor(py + 0.01);
  for (const dy of [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, -6]) {
    const y = y0 + dy;
    if (y < 1 || y > CH - 3) continue;
    if (T_SOLID[w.getBlock(fx, y - 1, fz)] && !T_SOLID[w.getBlock(fx, y, fz)] && !T_SOLID[w.getBlock(fx, y + 1, fz)] && !T_LIQUID[w.getBlock(fx, y, fz)]) return y;
  }
  return null;
}
// a little rift opens in front of you; he steps out and stares, or they come through
function riftMicro(g, lp, monsters) {
  const p = lp.player, w = g.world, dim0 = g.dim;
  // in front of you and in sight; failing that (a winding cave), nearer and wider; failing that, he shows himself some other way
  for (let i = 0; i < 28; i++) {
    const wide = i >= 14, ang = p.yaw + (Math.random() - 0.5) * (wide ? 2.4 : 0.9), d = wide ? 5 + Math.random() * 6 : 9 + Math.random() * 5;
    const x = Math.floor(p.x - Math.sin(ang) * d) + 0.5, z = Math.floor(p.z - Math.cos(ang) * d) + 0.5;
    if (!w.isLoaded(x, z)) continue;
    const y = riftStandY(w, x, z, p.y);
    if (y === null) continue;
    const dd = Math.hypot(x - p.x, y + 1.6 - (p.y + p.eye), z - p.z);
    if (!Watcher.prototype.lineOfSight.call({ x, y, z, game: g }, p, dd)) continue;
    const t = new RiftTear(g, x, y, z, 'micro', Math.atan2(-(p.x - x), -(p.z - z)) + Math.PI / 2);
    g.entities.push(t); RIFT.tears.push(t);
    g.sfx.playAt('rift_open', x, y + 1, z, 30);
    const w0 = g.world;
    setTimeout(() => {
      if (t.remove || g.dim !== dim0 || g.world !== w0 || !g.meta) return;       // (0.9.0.54) not into a world quit since
      if (monsters) {
        if (g.isGuest) { if (g.net) g.net.send({ t: 'adv', k: 'riftmobs', x, y, z }); }
        else riftMobs(g, x, y, z);
        riftSay(g, 'Something comes through the rift!', 'warn');
      } else {
        const wt = new Watcher(g, x, y, z, 'peek'); wt.stare = 2.6; wt.riftDoor = true; g.entities.push(wt); if (g.haunt) g.haunt.active = wt;
        lp.dreadT = 2.8; g.sfx.play('rift_whisper');
        setTimeout(() => { if (!wt.remove && g.meta && g.world === w0) wt.vanish(); }, 2800);
      }
    }, 900);
    return;
  }
  if (g.haunt) g.haunt.forceSighting();
}
// a sound behind you, and him standing where it happened
function riftPhantom(g, lp) {
  const p = lp.player, ang = p.yaw + Math.PI + (Math.random() - 0.5), d = 7 + Math.random() * 6;
  const x = p.x - Math.sin(ang) * d, z = p.z - Math.cos(ang) * d;
  const snd = ['chest_open', 'break_stone', 'explode', 'door_open'][Math.floor(Math.random() * 4)];
  g.sfx.playAt(snd, x, p.y + 1, z);
  const w = g.world, y = riftStandY(w, x, z, p.y);
  if (y === null) { if (g.haunt) g.haunt.forceSighting(); return; }   // nowhere to stand there (a wall behind you): some other way
  const wt = new Watcher(g, Math.floor(x) + 0.5, y, Math.floor(z) + 0.5, 'behind'); wt.riftDoor = true; g.entities.push(wt); if (g.haunt) g.haunt.active = wt;
}
// time stops; he is right in front of you
function riftFreeze(g, lp) {
  const p = lp.player, d = 3.2;
  const x = p.x - Math.sin(p.yaw) * d, z = p.z - Math.cos(p.yaw) * d;
  if (T_SOLID[g.world.getBlock(Math.floor(x), Math.floor(p.y), Math.floor(z))]) { riftPhantom(g, lp); return; }
  const wt = new Watcher(g, x, p.y, z, 'peek'); wt.riftDoor = true; wt.stare = 2; g.entities.push(wt); if (g.haunt) g.haunt.active = wt;
  RIFT.frozenT = 2; lp.dreadT = 2.4;
  g.sfx.play('rift_static');
  const w0 = g.world;
  setTimeout(() => { if (!g.meta || g.world !== w0) return; if (!wt.remove) wt.vanish(); g.sfx.play('rift_whisper'); }, 2000);
}
{
  // the freeze: nothing moves, you can't either
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) {
    // (0.9.0.54) once a frame, with player 1's layer (as the sightings are): in split screen across layers each pass
    // used to clear away the other's
    if (!this._pass) try { riftTick(this, dt); } catch (err) { console.warn('rift', err); }
    if (RIFT.frozenT > 0) { if (!this._pass) RIFT.frozenT -= dt; return; }
    return baseUpd.call(this, dt);
  };
  const baseLP = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    if (RIFT.frozenT > 0 && this.mode === 'play') { inp = InputManager.blankState(); this.player.vx = this.player.vz = 0; }
    return baseLP.call(this, dt, inp);
  };
  // his vanishing, once the boundary thins: a whisper of static and the lights flickering
  const baseVanish = Watcher.prototype.vanish;
  Watcher.prototype.vanish = function () {
    const g = this.game;
    if (riftStability(g) < 75 && !this.remove) {
      g.sfx.playAt('rift_static', this.x, this.y + 1, this.z);
      const lp = g.local; if (lp && lp.el) { const f = lp.el.querySelector('.fx-dread'); if (f) { RIFT.dreadT = Math.max(RIFT.dreadT, 0.5); } }
      for (let i = 0; i < 20; i++) spellSpark(g, this.x + (Math.random() - 0.5) * 0.6, this.y + Math.random() * 1.8, this.z + (Math.random() - 0.5) * 0.6, 'mana_arcane', { vy: 0.6, life: 0.6, size: 0.06 });
    }
    return baseVanish.call(this);
  };
  // a stare lasts as long as it lasts, then he goes
  const baseWUpd = Watcher.prototype.update;
  Watcher.prototype.update = function (dt) {
    if (this.stare > 0) { this.stare -= dt; const p = this.game.player; if (p) this.faceAt(p); return; }
    return baseWUpd.call(this, dt);
  };
  // the haunting grows bolder as the boundary thins; once sealed, he's gone
  const baseHaunt = Haunt.prototype.update;
  Haunt.prototype.update = function (dt) {
    const g = this.g, R = g.meta && g.meta.rift;
    if (R && R.sealed) return;
    const st = riftStability(g);
    return baseHaunt.call(this, dt * (st < 15 ? 3 : st < 40 ? 2.2 : st < 75 ? 1.6 : 1));
  };
  // his signs say other things now
  const baseSign = Haunt.prototype.placeSign;
  if (baseSign) Haunt.prototype.placeSign = function () {
    if (riftStability(this.g) < 75 && HAUNT_SIGNS) {
      const extra = [['WE ARE', 'WATCHING', '', ''], ['', 'IT BREAKS', '', ''], ['The keys', 'are mine', '', ''], ['', 'Do not', 'open it', '']];
      const keep = HAUNT_SIGNS.slice(); HAUNT_SIGNS.length = 0; HAUNT_SIGNS.push(...extra);
      try { return baseSign.call(this); } finally { HAUNT_SIGNS.length = 0; HAUNT_SIGNS.push(...keep); }
    }
    return baseSign.call(this);
  };
}

// ---- fragments: the keepers carry them; the rift takes them ------------------------------------------------------------
{
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const r = baseDie.call(this, src);
    const g = this.game;
    if (RIFT_OFF) { /* no fragments */ }
    else if (this.dungeon && !g.isGuest && !riftOf(g).sealed && (riftOf(g).stage || 0) >= 3) { if (ITEMS.rift_crystal) g.dropItem(mkStack('rift_crystal', 2), this.x, this.y + 1, this.z, true); }   // (0.9.0.31) the gate is open: no more fragments
    else if (this.dungeon && !g.isGuest && !riftOf(g).sealed) {
      g.dropItem(mkStack('realm_fragment', 1), this.x, this.y + 1, this.z, true);
      const R = riftOf(g); R.frags = (R.frags || 0) + 1; riftChanged(g);
      if (R.stage >= 1 && R.stage < 3) setTimeout(() => riftSay(g, R.frags >= RIFT_NEED ? 'The boundary is paper-thin. Take the fragments to the rift.' : `The world shudders. (${Math.min(RIFT_NEED, R.frags)} of ${RIFT_NEED} fragments)`, 'warn'), 2500);
    }
    if (this.type === 'herobrine' && !g.isGuest) riftSeal(g, this);
    return r;
  };
  // using the rift with the fragments in hand
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const g = this.g, p = this.player, R = riftOf(g);
    if (!RIFT_OFF && !repeat && !fromOff && g.dim === 0 && R.stage >= 1 && R.stage < 3 && R.at && Math.hypot(p.x - R.at[0], p.z - R.at[2]) < 3.5 && Math.abs(p.y - R.at[1]) < 3) {
      const have = p.inv.count('realm_fragment');
      if (have >= RIFT_NEED) {
        p.inv.remove('realm_fragment', RIFT_NEED);
        if (g.isGuest) { if (g.net) g.net.send({ t: 'adv', k: 'riftgate' }); }
        else riftOpenGate(g);
      } else this.toast(have ? `The rift pulls at the fragment in your hand, but it wants ${RIFT_NEED}. You have ${have}.` : 'The rift hums. Beyond it, something is looking back.', '');
      this.swingArm();
      return;
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
}
function riftOpenGate(g) {
  const R = riftOf(g); R.stage = 3; riftChanged(g);
  const at = R.at || [0, 0, 0];
  g.sfx.playAt('rift_boom', at[0], at[1] + 2, at[2], 120);
  for (let i = 0; i < 120; i++) spellSpark(g, at[0] + (Math.random() - 0.5) * 6, at[1] + Math.random() * 5, at[2] + (Math.random() - 0.5) * 6, 'mana_arcane', { vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 4, life: 1.4, size: 0.1 });
  riftSay(g, 'The fragments sink into the rift. It steadies into a gateway. Beyond it: his realm.', 'epic');
}

// ---- the realm: the corrupted ones, and him at the end ------------------------------------------------------------------
function realmTick(g) {
  const R = riftOf(g), ps = g.pawns().filter(p => !p.dead);
  // each hall has its waiting crowd, woken when someone walks in
  R.halls = R.halls || {};
  for (const p of ps) {
    const hi = Math.floor((p.x + 2) / RIFT_HALL);
    if (hi >= 1 && hi <= 3 && !R.halls[hi] && !R.sealed) {
      R.halls[hi] = 1;
      for (let k = 0; k < 3 + hi * 2; k++) {
        const x = hi * RIFT_HALL + 20 + Math.random() * 60, z = -30 + Math.random() * 60;
        const type = ['rift_ghoul', 'rift_skeleton', 'rift_spider'][Math.floor(Math.random() * 3)];
        const m = g.addEntity(new Mob(g, type, x, RIFT_FLOOR + 1, z)); if (m) m.huntT = 40;
      }
    }
    // the last hall: him
    if (hi === RIFT_HALLS - 1 && !R.sealed && !g.entities.some(e => e.type === 'herobrine' && e.alive) && p.x > (RIFT_HALLS - 1) * RIFT_HALL + 12) {
      const cx = (RIFT_HALLS - 1) * RIFT_HALL + 48.5;
      const m = g.addEntity(new Mob(g, 'herobrine', cx, RIFT_FLOOR + 2, 0.5));
      m.huntT = 999; m.calls = 0;
      g.sfx.play('rift_boom');
      // (0.9.0.31) he keeps most of the wounds he took last time (falling to him meant starting him over from full)
      const hp0 = +R.heroHp || 0;
      if (hp0 > 0 && hp0 < m.maxHealth) {
        m.health = Math.round(Math.min(m.maxHealth, hp0 + (m.maxHealth - hp0) * 0.25));
        const f = m.health / m.maxHealth; m.calls = f < 0.33 ? 2 : f < 0.66 ? 1 : 0;
        setTimeout(() => riftSay(g, 'He still bears the wounds you gave him.', 'warn'), 2200);
      }
      riftSay(g, 'Herobrine', 'epic');
      RIFT.dreadT = 2;
    }
  }
  if (!ps.length) R.halls = {};
}
class RiftBolt extends Entity {
  constructor(game, x, y, z, vx, vy, vz, owner) { super(game, x, y, z); this.vx = vx; this.vy = vy; this.vz = vz; this.owner = owner; this.w = 0.2; this.h = 0.3; }
  update(dt) {
    const g = this.game;
    if (this.ghost) return;
    this.age += dt; if (this.age > 3) { this.remove = true; return; }
    for (let s = 0; s < 3; s++) {
      this.x += this.vx * dt / 3; this.y += this.vy * dt / 3; this.z += this.vz * dt / 3;
      for (const p of g.pawns()) if (!p.dead && Math.abs(p.x - this.x) < 0.5 && Math.abs(p.z - this.z) < 0.5 && this.y > p.y - 0.2 && this.y < p.y + 1.9) { p.hurt((this.owner && this.owner.T && this.owner.T.boltDmg) || 5, { type: 'magic', attacker: this.owner, knock: 2 }); this.burst(); return; }
      if (T_SOLID[g.world.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))]) { this.burst(); return; }
    }
    spellFx(g, this.x, this.y, this.z, 'mana_arcane', 3, 0.3, { life: 0.4, size: 0.1 });
  }
  burst() { this.remove = true; spellFx(this.game, this.x, this.y, this.z, 'mana_arcane', 30, 2.4, { life: 0.5, size: 0.1 }); this.game.sfx.playAt('spell_hit', this.x, this.y, this.z); }
  snap() { return Object.assign({ i: this.id, k: 'p', kd: 'rift' }, NET_POS(this)); }
  draws() {}
  glow(out) { out.push({ x: this.x, y: this.y, z: this.z, size: 0.4, uv: tileUV(ATLAS.tile.mana_arcane ?? ATLAS.tile.white), light: 0xFF }); }
}
MONSTER_AI.herobrine = function (dt, p, dist, dyp, toPlayer) {
  const g = this.game, T = this.T;
  if (!p) return { want: 0, dir: this.yaw };
  const frac = this.health / this.maxHealth;
  if (g.meta && g.meta.rift && !g.isGuest) g.meta.rift.heroHp = this.health;
  this.tpT = (this.tpT ?? 3) - dt; this.boltT = (this.boltT ?? 2) - dt; this.freezeT = (this.freezeT ?? 12) - dt;
  if (Math.random() < dt * 10) spellSpark(g, this.x + (Math.random() - 0.5) * 0.5, this.y + Math.random() * 1.8, this.z + (Math.random() - 0.5) * 0.5, 'mana_arcane', { vy: 0.5, life: 0.5, size: 0.05 });
  // calls his corrupted at two thirds and one third
  if ((frac < 0.66 && this.calls < 1) || (frac < 0.33 && this.calls < 2)) {
    this.calls++;
    for (let k = 0; k < 3 + this.calls; k++) { const a = Math.random() * TAU, m = g.addEntity(new Mob(g, ['rift_ghoul', 'rift_skeleton', 'rift_spider'][k % 3], this.x + Math.cos(a) * 4, this.y + 0.2, this.z + Math.sin(a) * 4)); if (m) m.huntT = 60; }
    g.sfx.play('rift_open'); riftSay(g, 'He calls them through!', 'warn');
  }
  // steps through space to somewhere near you
  if (this.tpT <= 0) {
    this.tpT = (frac < 0.33 ? 2.2 : 3.5) + Math.random() * 2;
    const a = Math.random() * TAU, d = 4 + Math.random() * 4, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
    if (!T_SOLID[g.world.getBlock(Math.floor(x), Math.floor(this.y), Math.floor(z))] && T_SOLID[g.world.getBlock(Math.floor(x), Math.floor(this.y) - 1, Math.floor(z))]) {
      spellFx(g, this.x, this.y + 1, this.z, 'mana_arcane', 30, 1.6, { life: 0.6, spread: 0.8 });
      this.x = x; this.z = z; this.vx = this.vz = 0;
      spellFx(g, this.x, this.y + 1, this.z, 'mana_arcane', 30, 1.6, { life: 0.6, spread: 0.8 });
      g.sfx.playAt('spell_blink', this.x, this.y + 1, this.z);
    }
  }
  // bolts of his realm
  if (this.boltT <= 0 && dist < 30) {
    this.boltT = frac < 0.33 ? 1.1 : 2;
    const sx = this.x, sy = this.y + 1.5, sz = this.z, tx = p.x - sx, ty = p.y + 1 - sy, tz = p.z - sz, l = Math.hypot(tx, ty, tz) || 1, sp = 16;
    g.addEntity(new RiftBolt(g, sx, sy, sz, tx / l * sp, ty / l * sp, tz / l * sp, this));
    this.swingT = 0.3;
  }
  // the stare: time stops for whoever he looks at
  if (frac < 0.5 && this.freezeT <= 0 && dist < 20 && g.locals.some(l => l.player === p || l === p)) { this.freezeT = 14; RIFT.frozenT = 1.4; const lw = g.locals.find(l => l.player === p || l === p); if (lw) lw.dreadT = 1.8; g.sfx.play('rift_static'); }
  else if (this.freezeT <= 0) this.freezeT = 6;
  if (dist < 1.8 + this.w && Math.abs(dyp) < 2 && this.attackCd <= 0) { this.attackCd = 1; this.swingT = 0.3; p.hurt(T.damage, { type: 'mob', attacker: this, knock: 3 }); }
  return { want: dist < 1.2 ? 0 : T.speed * 0.8, dir: (dist > 2.5 ? this.navDir(p.x, p.y, p.z, dt) : null) ?? toPlayer };
};
function riftSeal(g, boss) {
  const R = riftOf(g);
  if (R.sealed) return;
  R.sealed = 1; R.stage = 5; riftChanged(g);
  g.sfx.play('rift_boom');
  for (let i = 0; i < 160; i++) spellSpark(g, boss.x + (Math.random() - 0.5) * 3, boss.y + Math.random() * 3, boss.z + (Math.random() - 0.5) * 3, i % 2 ? 'mana_arcane' : 'mana_light', { vx: (Math.random() - 0.5) * 6, vy: Math.random() * 5, vz: (Math.random() - 0.5) * 6, life: 1.6, size: 0.1 });
  for (const [id, n] of [['watcher_blade', 1], ['rift_staff', 1], ['heart_crystal', 2], ['emerald', 32], ['rift_crystal', 16]]) if (ITEMS[id]) g.dropItem(mkStack(id, n), boss.x, boss.y + 1, boss.z, true);
  riftSay(g, 'Herobrine is defeated. The rift is sealed, and the watching is over.', 'epic');
  setTimeout(() => riftSay(g, 'The villages will hear of this. A way home has opened in the arena.', 'good'), 3500);
  for (const l of g.locals) { l.grantXP(400, boss.x, boss.y + 1, boss.z); if (R.village) npcRep(g, l, R.village, 60); }
}

// ---- the elder knows the tale; the quest line at the top of your list ---------------------------------------------------------
{
  const baseHome = NpcTalk.prototype.home;
  NpcTalk.prototype.home = function (text) {
    baseHome.call(this, text);
    const g = this.g, R = riftOf(g);
    if (this.job !== 'elder' || !R.stage || (text && !this._greetLine)) return;
    const o = this.el.querySelector('.nt-opts');
    const b = document.createElement('button'); b.className = 'btn nt-opt';
    b.innerHTML = `<i>★</i>${R.sealed ? 'About the rift…' : R.stage >= 3 ? 'The gateway…' : 'The rift in the square…'}`;
    b.onclick = () => {
      g.sfx.play('click');
      const n = Math.min(RIFT_NEED, R.frags || 0);
      const lines = R.sealed ? 'You did it. The square is quiet, the nights are only nights again. We will sing of this for a hundred winters.'
        : R.stage >= 3 ? 'The gateway stands open. He waits beyond it, at the end of his halls. Go together, go ready, and end this.'
          : `It opened when you came. Something old is pressing on our world from the other side. The old tales say the keepers of the deep places hold the keys of time. Find the dungeons, defeat their keepers, bring their Realm Fragments to the rift. Four of them. ${n ? 'You have found ' + n + ' so far.' : ''}`;
      this.say(lines);
      b.remove();
    };
    o.insertBefore(b, o.lastChild);
  };
  const baseSay = NpcTalk.prototype.say;
  NpcTalk.prototype.say = function (text) {
    if (!(this.g.meta && this.g.meta.campaign) && riftStability(this.g) < 15 && Math.random() < 0.18 && this.job !== 'elder') { text = ['He sees you through our eyes.', 'IT BREAKS. IT BREAKS. IT BREAKS.', 'Why did you open it?', 'There is no village. There never was.'][Math.floor(Math.random() * 4)]; this.g.sfx.play('rift_static'); }
    return baseSay.call(this, text);
  };
  const baseHud = questHud;
  questHud = function (lp) {
    baseHud(lp);
    const g = lp.g, R = g.meta && g.meta.rift;
    if (!R || !R.stage || !lp.el || R.campaign || g.meta.campaign) return;   // (alpha 4) a campaign tells this part as its own quest
    let el = lp.el.querySelector('.quest-track');
    if (!el) { if (R.sealed) return; el = document.createElement('div'); el.className = 'quest-track'; lp.el.appendChild(el); }
    if (R.sealed && !(lp.player.stats && lp.player.stats.realmSeen === 1 && g.dim === DIM.REALM)) return;
    const n = Math.min(RIFT_NEED, R.frags || 0);
    const t = R.sealed ? ['The rift is sealed', '✓'] : R.stage >= 3 ? ['Enter the rift and face him', ''] : ['The Temporal Keys: Realm Fragments', n + '/' + RIFT_NEED];
    const html = `<div class="qt main${R.sealed ? ' done' : ''}"><b>${t[0]}</b><span>${t[1]}</span></div>`;
    if (!el.querySelector('.qt.main')) el.insertAdjacentHTML('afterbegin', html); else el.querySelector('.qt.main').outerHTML = html;
  };
}

// ---- playing together: the story's state reaches everyone; guests can open the gate and go through ------------------------------
{
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'gate') { const R = riftOf(this.g); if (m.to === DIM.REALM ? R.stage >= 3 : true) riftTravel(this.g, m.to, null); return; }
    if (m && m.t === 'adv' && m.k === 'riftgate') { const R = riftOf(this.g); if (R.stage >= 1 && R.stage < 3) riftOpenGate(this.g); return; }
    if (m && m.t === 'adv' && m.k === 'riftmobs') {
      // (0.9.0.46) only near the guest who asked, while the story is going, and not too often
      const g = this.g, R = riftOf(g), me = riftRemotes(g).find(r => r.gid === from), now = g.time;
      const T = this._riftMobT || (this._riftMobT = {});
      if (me && R.stage >= 1 && !R.sealed && hauntDimOk(g) && Math.hypot(me.x - m.x, me.z - m.z) < 24 && !(T[from] > now)) { T[from] = now + 60; riftMobs(g, +m.x, +m.y, +m.z); }
      return;
    }
    return baseHost.call(this, from, m);
  };
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv' && m.k === 'rift') { if (this.g.meta) this.g.meta.rift = m.r; return; }
    if (m && m.t === 'adv' && m.k === 'haunt') {
      const g = this.g, lp = g.locals.find(l => l.index === m.i) || g.local;
      if (lp && !lp.player.dead && hauntDimOk(g) && g.state === 'playing' && g.rules().haunting !== false) riftEvent(g, lp, String(m.ev), !!m.mon);   // (0.9.0.54) every land, as the host's are
      return;
    }
    return baseGuest.call(this, m);
  };
  const baseWelcome = Net.prototype.welcome;
  if (baseWelcome) Net.prototype.welcome = function (peer, m) { const r = baseWelcome.call(this, peer, m); if (this.g.meta && this.g.meta.rift) setTimeout(() => this.all({ t: 'adv', k: 'rift', r: this.g.meta.rift }), 1500); return r; };
}

// ---- /rift: move the story along (a cheat, for testing) ----------------------------------------------------------------------------
COMMANDS.rift = { cheat: true, usage: '<open|frag|gate|go|seal|reset>', desc: 'Move the rift story along', run(lp, a) {
  const g = lp.g, R = riftOf(g), p = lp.player;
  switch (a[0]) {
    case 'open': {
      const v = villageAtPos(g, p.x, p.z, 200) || (() => { let best = null; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const o = g.world.gen.villageAt(Math.floor(p.x / VREG) + dx, Math.floor(p.z / VREG) + dz); if (o && (!best || Math.hypot(o.x - p.x, o.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z))) best = o; } return best; })();
      if (!v) return 'No village near enough';
      Object.assign(R, { stage: 1, village: v.id, at: [v.x + 0.5, v.y + 1, v.z + 5.5], yaw: 0 }); riftChanged(g); return `The rift opens in ${v.name} (x ${v.x}, z ${v.z + 5})`;
    }
    case 'frag': lp.give(mkStack('realm_fragment', 1)); R.frags = (R.frags || 0) + 1; riftChanged(g); return 'Fragments: ' + R.frags + ' · stability ' + riftStability(g);
    case 'gate': if (!R.stage) return 'Open it first'; riftOpenGate(g); return 'The gateway is open';
    case 'go': riftTravel(g, g.dim === DIM.REALM ? 0 : DIM.REALM, lp); return 'Through the rift';
    case 'seal': R.sealed = 1; R.stage = 5; riftChanged(g); return 'Sealed';
    case 'reset': g.meta.rift = { stage: 0, frags: 0 }; riftChanged(g); return 'The story starts over';
  }
  return 'Stage ' + R.stage + ' · fragments ' + (R.frags || 0) + ' · stability ' + riftStability(g) + (R.sealed ? ' · sealed' : '');
} };
