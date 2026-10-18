// ---------------------------------------------------------------------------
// campaign/watcher.js — (alpha 3) Act IV: He Who Watches.
//
// The notes never name what waits on the other side of the Veil, only that something watches: "shadows that walk like
// men, watching her", "a shadow shape behind her, tall and thin and wrong", "the Bloom doesn't want to open the gate.
// It wants to be what waits on the other side." In this game it has a name the players will know: Herobrine, the Watcher.
// Seraphina thought she was opening the door for the Bloom. She was opening it for him.
//
//   · Foreshadowing: from the Mirrorroot on (q8 done) he starts to appear at the edge of sight, leaves his tunnels and
//     signs, the way he always has. The Echoing Ruins on the Isle of Whispers say it outright.
//   · When the song is sung at the Veil's heart, the story doesn't end: the Veil closes on the Bloom, and in the moment it
//     closes he steps through the last gap. His realm begins to bleed into Eldenwood: violet stone breaking through the
//     ground in the wilds, his corrupted creatures at night. A tear opens above the Corrupted Heart: the way to his realm.
//   · At the end of his halls, the Watcher. Defeat him, and choose what becomes of the Veil: seal it as it was (the
//     song's ending, with Lyra's choice as you made it), retune it so the Shadowfell may come home in time, or take up
//     his watch yourself.
// ---------------------------------------------------------------------------

// (alpha 4 balance) the last fight of the campaign: a party reaches him around level 12-14, with tempered weapons, so he
// stands up to them longer than Seraphina (620) or the Heart Guardian (420), and his blows and bolts are the hardest yet
if (MOB_TYPES.herobrine) Object.assign(MOB_TYPES.herobrine, { label: 'Herobrine, the Watcher', hp: 840, damage: 12, ac: 18, toHit: 9, boltDmg: 9, dndXp: 12000 });
Object.assign(SB.quests, {
  q14: { title: 'He Who Watches', main: true, order: 14, summary: 'The Veil closed on the Bloom, and something stepped through as it closed. Herobrine, the Watcher, the one Seraphina truly served. His realm is bleeding into Eldenwood.',
    stages: {
      tear: { goal: 'Find the tear in the sky above the Corrupted Heart and cross into his realm', obj: { flag: 'realm_entered' }, at: 'temple_gate', next: 'end' },
      end: { goal: 'Reach the end of his halls and face the Watcher', obj: { flag: 'watcher_fallen' }, next: 'choose' },
      choose: { goal: 'Decide what becomes of the Veil', obj: { flag: '_never' } },
    } },
});
Object.assign(SB.endings, {
  retuned: [
    { title: 'The Second Verse', text: `You do not seal it. You tune it.\n\nThe Veil was never a wall, Eldon said. It was a filter. So you set it the way the first Harmonists meant it to be set: closed to the hunger on the other side, open to the memory. The Shadowfell is not a second world. It is a second verse.\n\nIn the years that follow, the grey forest softens. Things that were lost come back to Eldenwood, a few at a time, and remember their names.` },
    { title: 'Home', text: `Ember draws birds now, and sometimes, with Mira watching, the birds she draws are ones nobody has seen in a hundred years, and then, a week later, they are in the trees.\n\nOn the table where you sleep the first night home, a letter waits. No courier came.\n\n“Your hands only. The last one. You let the song keep its second verse. Thank you. —F.”` },
  ],
  watcher: [
    { title: 'The Watch', text: `Someone has to stand at the edge of things and listen. He did, for a long time, and it made him hungry.\n\nYou take his place at the end of the halls, where the Veil is thinnest, and you listen instead. You do not hunger. Not yet. You see Eldenwood the way he saw it: every road, every lit window, every child humming in the dark.\n\nNow and then a traveller on a ridge sees a figure at the edge of their sight, and when they look straight at it, it is gone. The figure is not watching them. It is watching over them.` },
    { title: 'Remembered', text: `Grom keeps a chair at the forge empty. Eldon writes your name at the top of a new record in the Deep Notes, and under it: "Still here."\n\nAnd on a ridge above Stonebridge, on clear nights, the guards on the east gate swear they see someone looking down at the town. They wave. It doesn't wave back. But the mist never comes over the walls again.` },
  ],
});
// the song sung: not the end, the turn
{
  const N = SB.npcs.veil_heart && SB.npcs.veil_heart.talk && SB.npcs.veil_heart.talk.nodes;
  const turn = (how) => [{ flag: 'veil_way_' + how }, { flag: 'watcher_awake' }, { narrate: [
    { title: 'The Last Gap', text: `The song resolves. The Veil breathes in, and holds — and in the instant before it closes, something steps through the last narrow gap.\n\nTall. Thin. A hooded robe the colour of dusk, veined black with the Bloom. A face as pale as bone, and eyes that are only white light.\n\nSeraphina's last words come back to you: "Someone will always sing." She was wrong about who. She never opened the door for the Bloom.` },
    { title: 'Herobrine', text: `He looks at you for a long moment, the way he has always looked at you — from a ridge, from the end of a tunnel, from behind a tree in the corner of your eye.\n\nThen he is gone, and above the Corrupted Heart the sky tears open, violet, and does not close.\n\nAll over Eldenwood, the ground begins to shimmer.` },
  ], title: 'He Who Watches' }, { quest: 'q14' }];
  if (N && N.good) N.good.do = N.good.do.filter(e => !e.end).concat(turn('good'));
  if (N && N.lyra) for (const o of N.lyra.opts) if (o.do && o.do.some(e => e.end)) o.do = o.do.filter(e => !e.end).concat(turn('lyra'));
}
// Fate's farewell ("Now they are") waits until he's gone too, if he came through
if (SB.npcs.fate_end) SB.npcs.fate_end.if = { all: [{ quest: 'q13', done: true }, { any: [{ quest: 'q14', done: true }, '!watcher_awake'] }] };
// the tear above the Corrupted Heart: the rift's gateway (game/riftarc.js), opened by the story
function watcherOpenTear(g) {
  const C = campDef(g); if (!C || g.dim !== 0) return;
  const R = riftOf(g); if (R.stage >= 3) return;
  const P = C.places.temple_gate; if (!P) return;
  const x = P.at[0] + 6, z = P.at[1] + 6;
  if (!g.world.isLoaded(x, z)) return;
  const y = findSafeY(g.world, x, z);
  R.at = [x + 0.5, y + 1, z + 0.5]; R.yaw = 0; R.stage = 3; R.campaign = 1;
  riftChanged(g);
}
// the bleed: his stone breaking through out in the wilds, his creatures at night
const WATCH_RT = { t: 30 };
function watcherTick(g, dt) {
  const C = campDef(g); if (!C || g.isGuest || g.dim !== 0 || g.state !== 'playing') return;
  const S = campState(g); if (!S.flags.watcher_awake || S.flags.watcher_fallen) return;
  watcherOpenTear(g);
  if ((WATCH_RT.t -= dt) > 0) return;
  WATCH_RT.t = 70 + Math.random() * 80;
  const ps = g.pawns().filter(p => !p.dead); if (!ps.length) return;
  const p = ps[Math.floor(Math.random() * ps.length)];
  if (Object.values(C.towns).some(T => Math.hypot(T.at[0] - p.x, T.at[1] - p.z) < campTownR(T) + 30)) return;
  const a = Math.random() * TAU, d = 28 + Math.random() * 22, x = Math.floor(p.x + Math.sin(a) * d), z = Math.floor(p.z + Math.cos(a) * d);
  if (!g.world.isLoaded(x, z)) return;
  const y = findSafeY(g.world, x, z); if (y < SEA) return;
  const w = g.world, wall = B.rift_wall, glass = B.rift_glass, crys = B.rift_crystal;
  if (wall === undefined) return;
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { if (dx * dx + dz * dz > 10 || Math.random() < 0.25) continue; const gy = findSafeY(w, x + dx, z + dz) - 1; if (gy > 1 && T_SOLID[w.getBlock(x + dx, gy, z + dz)]) w.setBlock(x + dx, gy, z + dz, Math.random() < 0.15 ? glass : wall, 0); }
  // a broken piece of somewhere else, floating
  const fy = y + 4 + Math.floor(Math.random() * 4);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!w.getBlock(x + dx, fy, z + dz)) w.setBlock(x + dx, fy, z + dz, Math.abs(dx) + Math.abs(dz) === 0 && crys !== undefined ? crys : wall, 0);
  for (const l of g.locals) if (Math.hypot(l.player.x - x, l.player.z - z) < 80) l.toast('Nearby, the ground shimmers violet: his realm, bleeding through', 'warn');
  const night = g.env && g.env.day < 0.4;
  if (night) for (let k = 0; k < 2; k++) { const t = ['rift_ghoul', 'rift_skeleton', 'rift_spider'][Math.floor(Math.random() * 3)]; if (MOB_TYPES[t]) { const m = new Mob(g, t, x + 0.5 + k, y, z + 0.5); g.addEntity(m); } }
}
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { watcherTick(this, dt); } catch (e) { console.warn('watcher', e); } return baseUpd.call(this, dt); };
}
// entering his realm counts for the story; and once he has fallen, the choice keeps being offered until it is made
{
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseUpd.call(this, dt, inp);
    try {
      const g = this.g;
      if (g.meta.campaign && !g.isGuest && this === g.locals[0]) {
        const S = campState(g);
        if (g.dim === DIM.REALM && S.flags.watcher_awake && !S.flags.realm_entered) campDo(g, [{ flag: 'realm_entered' }, { milestone: 13, why: 'His realm' }, { narrate: [{ title: 'His Realm', text: 'Violet stone. Broken pieces of Eldenwood hanging in the dark: a well, half a cottage, the Stonebridge fountain with no town around it. Everything you have ever seen out of the corner of your eye, kept here.\n\nAt the end of the halls, someone is waiting. He has always been waiting.' }] }], this);
        // (alpha 4) closed the choice without choosing, or left the world before it: it asks again
        if (S.flags.watcher_fallen && !S.ended && !S.flags.veil_seal && !S.flags.veil_retune && !S.flags.veil_watch && !WATCH_RT.open) {
          if (WATCH_RT.reask == null) WATCH_RT.reask = g.time + 15;
          else if (g.time > WATCH_RT.reask && this.mode === 'play' && !this.npcUI && !(CAMP_RT.narrating && CAMP_RT.narrating.el && CAMP_RT.narrating.el.isConnected)) { WATCH_RT.reask = null; watcherChoice(g, true); }
        }
      }
    } catch (e) { /* not yet */ }
    return r;
  };
}
// the seal: the choice
{
  const baseSeal = riftSeal;
  riftSeal = function (g, boss) {
    baseSeal(g, boss);
    try {
      const S = g.meta.campaign && campState(g);
      if (S && S.flags.watcher_awake && !S.flags.watcher_fallen) {
        WATCH_RT.open = true;
        campDo(g, [{ flag: 'watcher_fallen' }, { xp: 8000, why: 'Herobrine, the Watcher' }], g.locals[0]);
        setTimeout(() => watcherChoice(g), 5000);
      }
    } catch (e) { console.warn('watcher seal', e); }
  };
}
function watcherChoice(g, again) {
  const lp = g.locals[0]; if (!lp) { WATCH_RT.open = false; return; }
  const S = campState(g); if (S.ended) { WATCH_RT.open = false; return; }
  const sung = S.flags.veil_way_lyra ? 'lyra' : 'good';
  WATCH_RT.open = true;
  const ask = () => {
    let picked = false;
    const P = dndOpenPicker(lp, {
      title: 'What becomes of the Veil?', status: 'This is the end of the tale',
      rows: () => [
        { id: 'seal', label: 'Seal it, as the song set it', sub: sung === 'lyra' ? 'The Veil closes for good, and Lyra\'s voice stays in it.' : 'The Veil closes for good, whole and sung.' },
        { id: 'retune', label: 'Retune it: let the Shadowfell come home, slowly', sub: 'Closed to the hunger, open to the memory. The second verse returns.' },
        { id: 'watch', label: 'Take up his watch', sub: 'Someone has to stand at the edge and listen. You will.' },
      ],
      pick: (r) => {
        picked = true; WATCH_RT.open = false;
        campDo(g, [{ flag: 'veil_' + r.id }, { complete: 'q14' }, { milestone: 14, why: 'The Veil' }], lp);
        campEnd(g, r.id === 'seal' ? sung : r.id === 'retune' ? 'retuned' : 'watcher');
        return true;
      },
      onClose: () => { if (!picked) { WATCH_RT.open = false; WATCH_RT.reask = g.time + 12; lp.toast('The Veil waits for your hand. It will ask again in a moment', ''); } },
      hint: 'A to choose',
    });
    if (!P) { WATCH_RT.open = false; WATCH_RT.reask = g.time + 3; }
  };
  if (again) { ask(); return; }
  campNarrate(g, [{ title: 'The Watcher Falls', text: 'He does not fall the way the others fell. He comes apart like a reflection in disturbed water, and for a moment, between the pieces, you see the Veil itself: thin as breath, humming, waiting for a hand on it.\n\nIt can be set three ways. Lyra knew. Eldon knew. Now you do.' }], 'He Who Watches', ask);
}

// ---- (alpha 5) his realm, in the campaign: what he kept ------------------------------------------------------------------
// "Broken pieces of Eldenwood hanging in the dark: a well, half a cottage, the Stonebridge fountain with no town around
// it." The halls you walk through hold them now, on the floor where you pass: half a cottage in the first hall and a
// village well; the Stonebridge fountain, its lamps still lit, in the second; a market stall, a bench under a lamp and a
// grave with fresh flowers in the third. Only in a campaign world, and only in the parts of his realm not yet seen.
const REALM_PIECES = (() => {
  const K = (k, alt) => (B[k] !== undefined ? k : alt);
  const P = {};
  const add = (name, fn) => { const L = []; fn((x, y, z, k) => { if (k && B[k] !== undefined) L.push([x, y, z, B[k]]); }); let h = 0, x0 = 0, x1 = 0, z0 = 0, z1 = 0; for (const [x, y, z] of L) { h = Math.max(h, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } P[name] = { L, h, box: [x0, z0, x1, z1] }; };
  const PL = K('spruce_planks', 'planks'), LOG = K('spruce_log', 'log');
  add('cottage', (put) => {
    for (let x = 0; x <= 7; x++) for (let z = 0; z <= 5; z++) put(x, -1, z, PL);
    for (let x = 0; x <= 7; x++) for (let y = 0; y <= 3; y++) put(x, y, 0, (x === 0 || x === 7) ? LOG : (y >= 1 && y <= 2 && (x === 3 || x === 4)) ? 'glass_pane' : PL);
    for (let z = 1; z <= 5; z++) for (let y = 0; y <= 3; y++) put(0, y, z, z === 5 ? LOG : (y >= 1 && y <= 2 && (z === 2 || z === 3)) ? 'glass_pane' : PL);
    put(7, 0, 1, 'cobblestone'); put(7, 1, 1, PL); put(6, 0, 3, 'cobblestone');                  // the wall that isn't there any more
    for (let x = 1; x <= 2; x++) for (let y = 0; y <= 2 - x; y++) put(x, y, 5, PL);
    for (let x = 0; x <= 6; x++) for (let z = 0; z <= 2; z++) if ((x * 7 + z * 3) % 5 !== 0) put(x, 4, z, 'spruce_slab');   // half a roof
    put(1, 0, 1, 'crafting_table'); put(1, 0, 2, 'barrel'); put(6, 0, 1, 'bookshelf'); put(6, 1, 1, 'bookshelf');
    put(3, 0, 2, 'oak_stairs'); put(4, 0, 2, 'oak_fence'); put(4, 1, 2, 'flower_pot'); put(3, 3, 1, 'chain'); put(3, 2, 1, 'lantern');
    put(2, 0, 3, 'red_carpet'); put(3, 0, 3, 'red_carpet');
  });
  add('well', (put) => {
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) { if (x || z) put(x, 0, z, 'cobblestone'); else { put(0, -1, 0, 'water'); put(0, -2, 0, 'water'); put(0, 0, 0, 'water'); } }
    for (const x of [-1, 1]) { put(x, 1, 0, 'oak_fence'); put(x, 2, 0, 'oak_fence'); }
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) put(x, 3, z, 'spruce_slab');
    put(0, 2, 0, 'chain');
    for (let a = 0; a < 8; a++) { const x = Math.round(Math.cos(a) * 3), z = Math.round(Math.sin(a) * 3); put(x, -1, z, 'gravel'); }
  });
  add('fountain', (put) => {
    for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) if (x * x + z * z <= 40) put(x, -1, z, (x * 3 + z * 5) % 4 === 0 ? 'mossy_stone_bricks' : 'stone_bricks');
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) { const m = Math.max(Math.abs(x), Math.abs(z)); if (m === 3) put(x, 0, z, 'stone_bricks'); else if (m >= 1) put(x, 0, z, 'water'); }
    for (let y = 0; y <= 2; y++) put(0, y, 0, 'stone_bricks'); put(0, 3, 0, 'stone_brick_slab'); put(0, 4, 0, 'lantern');
    for (const [x, z] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { for (let y = 0; y <= 2; y++) put(x, y, z, 'oak_fence'); put(x, 3, z, 'lantern'); }
    put(0, 0, -5, 'spruce_stairs'); put(-1, 0, -5, 'spruce_stairs'); put(0, 0, 5, 'spruce_stairs'); put(1, 0, 5, 'spruce_stairs');
    put(-5, 0, 0, 'red_banner'); put(5, 0, 0, 'red_banner');
  });
  add('market', (put) => {
    for (const [x, z] of [[0, 0], [4, 0], [0, 2], [4, 2]]) for (let y = 0; y <= 2; y++) put(x, y, z, 'oak_fence');
    for (let x = 0; x <= 4; x++) for (let z = 0; z <= 2; z++) put(x, 3, z, x % 2 ? 'wool' : 'red_wool');
    for (let x = 1; x <= 3; x++) put(x, 0, 0, 'barrel'); put(2, 1, 0, 'flower_pot'); put(1, 0, 2, 'chest');
  });
  add('bench', (put) => {
    for (let x = 0; x <= 2; x++) put(x, 0, 0, 'spruce_stairs');
    for (let y = 0; y <= 2; y++) put(4, y, 0, 'oak_fence'); put(4, 3, 0, 'lantern');
    put(-2, -1, 1, 'dirt_path'); put(-1, -1, 1, 'dirt_path'); put(0, -1, 1, 'dirt_path'); put(1, -1, 1, 'dirt_path'); put(2, -1, 1, 'dirt_path'); put(3, -1, 1, 'dirt_path');
  });
  add('grave', (put) => {
    for (let x = -1; x <= 1; x++) for (let z = -1; z <= 2; z++) put(x, -1, z, 'podzol');
    put(0, 0, -1, 'stone_bricks'); put(0, 1, -1, 'stone_brick_slab');
    put(-1, 0, 1, 'flower_red'); put(1, 0, 1, 'flower_red'); put(0, 0, 2, 'candle');
  });
  return P;
})();
// where they stand: [hall, piece, x from the hall's start, z]
const REALM_LAYOUT = [[1, 'cottage', 28, -26], [1, 'well', 66, 22], [2, 'fountain', 48, 0], [3, 'market', 24, 20], [3, 'bench', 64, -22], [3, 'grave', 46, -32]];
{
  const baseRealm = WorldGen.prototype.generateRealm;
  WorldGen.prototype.generateRealm = function (ch) {
    const r = baseRealm.call(this, ch);
    try {
      const C = typeof campGenDef === 'function' ? campGenDef() : null;
      if (!C || C.id !== 'shadowbloom') return r;
      const bx = ch.cx * 16, bz = ch.cz * 16, F = RIFT_FLOOR + 1;
      for (const [hi, name, ox, oz] of REALM_LAYOUT) {
        const Pc = REALM_PIECES[name]; if (!Pc) continue;
        const wx0 = hi * RIFT_HALL + ox, wz0 = oz, [x0, z0, x1, z1] = Pc.box;
        if (wx0 + x1 + 1 < bx || wx0 + x0 - 1 > bx + 15 || wz0 + z1 + 1 < bz || wz0 + z0 - 1 > bz + 15) continue;
        // room for it: nothing in the way from the floor to a little above its top
        for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= z1 + 1; z++) {
          const lx = wx0 + x - bx, lz = wz0 + z - bz; if (lx < 0 || lx > 15 || lz < 0 || lz > 15) continue;
          for (let y = F; y <= F + Pc.h + 3; y++) ch.blocks[cidx(lx, y, lz)] = 0;
        }
        for (const [x, y, z, id] of Pc.L) {
          const lx = wx0 + x - bx, lz = wz0 + z - bz; if (lx < 0 || lx > 15 || lz < 0 || lz > 15) continue;
          ch.blocks[cidx(lx, F + y, lz)] = id;
        }
      }
    } catch (e) { console.warn('realm pieces', e); }
    return r;
  };
}

// ---- (alpha 5) the Watcher's own fight, in the campaign ------------------------------------------------------------------
// On top of what he does anywhere (stepping through space, his bolts, calling his corrupted, the stare that stops time):
// at four fifths he shows you yourself (memory shades), past half the Bloom answers him (Veil stalkers), and at the last
// every eye you ever felt on your back opens: the light goes, and the mirror-echoes come.
{
  const baseAI = MONSTER_AI.herobrine;
  const PHASES = [
    { at: 0.8, say: 'He shows you yourself.', mobs: ['memory_shade', 'memory_shade'] },
    { at: 0.55, say: 'The Bloom answers him. Black petals open across the floor.', mobs: ['veil_stalker', 'veil_stalker'] },
    { at: 0.3, say: 'Every eye you ever felt on your back opens at once.', mobs: ['mirror_echo', 'mirror_echo'], dark: true },
  ];
  MONSTER_AI.herobrine = function (dt, p, ...rest) {
    const res = baseAI.call(this, dt, p, ...rest);
    try {
      const g = this.game;
      if (!g.isGuest && g.meta && g.meta.campaign && p) {
        const S = campState(g);
        if (S.flags.watcher_awake && !S.flags.watcher_fallen) {
          const frac = this.health / this.maxHealth;
          this.cPhase = this.cPhase || 0;
          while (this.cPhase < PHASES.length && frac < PHASES[this.cPhase].at) {
            const Ph = PHASES[this.cPhase++];
            riftSay(g, Ph.say, 'epic');
            for (let k = 0; k < Ph.mobs.length; k++) {
              const t = MOB_TYPES[Ph.mobs[k]] ? Ph.mobs[k] : 'rift_ghoul'; if (!MOB_TYPES[t]) continue;
              const a = Math.random() * TAU, m = g.addEntity(new Mob(g, t, this.x + Math.cos(a) * 5, this.y + 0.2, this.z + Math.sin(a) * 5)); if (m) m.huntT = 60;
            }
            if (Ph.dark) for (const l of g.locals) { if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 40) { l.darkT = Math.max(l.darkT || 0, 7); l.dreadT = 2.5; } }
            g.sfx.play('rift_static');
          }
        }
      }
    } catch (e) { /* the fight goes on */ }
    return res;
  };
}

// ---- (alpha 5) after the tale: Eldenwood remembers how you set the Veil ------------------------------------------------
{
  const done = (f) => ({ all: [{ quest: 'q14', done: true }, f] });
  const L = [
    ['eldon', 'veil_seal', 'I\'ve closed the Deep Notes. Not finished: closed. A good book knows when to stop. (He taps the cover.) Your name is the last entry. I left room under it, in case.'],
    ['eldon', 'veil_retune', 'A filter, I always said. You set it the way the first Harmonists meant it. (He shows you a page.) Three songbirds this week that the records say died out a century ago. I\'ve started a new book just for the things coming home.'],
    ['eldon', 'veil_watch', 'The guards on the east gate say someone stands on the ridge at night. They wave. (He doesn\'t look at you.) I keep a lamp in my window now. Just so you know where I am.'],
    ['grom', 'veil_seal', 'Quiet forge. Good forge. (He turns a blade in the light.) Best thing about the end of the world not ending: people want horseshoes again.'],
    ['grom', 'veil_retune', 'Strangest thing. Ore from the old Shadowfell seams, clean as new. Rings like a bell when I strike it. Lyra would\'ve loved it.'],
    ['grom', 'veil_watch', 'Kept your chair. (He nods at it.) Nobody sits in it. Even the cat won\'t.'],
    ['mira', 'veil_seal', 'Ember sleeps through every night now. Every single night. I didn\'t know how tired I was until I wasn\'t.'],
    ['mira', 'veil_retune', 'The grey trees past the river have buds on them. Grey buds, mind. But buds. Ember says they\'re remembering how.'],
    ['mira', 'veil_watch', 'Ember leaves a cup of milk on the sill at night. For the one on the hill, she says. In the morning it\'s always gone, and the cup is washed.'],
    ['pip', 'veil_seal', 'They\'re writing a song about you down at the Mug. It\'s terrible. I love it.'],
    ['pip', 'veil_retune', 'Did you hear? Somebody saw a white stag by the Silent Stones. A WHITE STAG. Those aren\'t even real.'],
    ['pip', 'veil_watch', 'I waved at the ridge last night. I think it waved back. Nobody believes me. (Quieter.) Did it?'],
    ['elara', 'veil_seal', 'The mists haven\'t come in since. I still ring the dawn bell, though. Habit. And thanks.'],
    ['elara', 'veil_retune', 'The council asked me what to do about the things wandering in from the old forest. I said: welcome them. They were here first.'],
    ['elara', 'veil_watch', 'The watch reports a figure on the ridge every clear night. I\'ve ordered them to leave it be. (A pause.) And to salute.'],
    ['aldwyn', 'veil_seal', 'The lanterns burn steady now. The dead sleep, and so do I. The Pale Flame thanks you, child.'],
    ['aldwyn', 'veil_retune', 'Some of the lanterns have started to sing, very softly. Not the old wrong song. A new one. I think it\'s a lullaby.'],
    ['aldwyn', 'veil_watch', 'I lit a lantern for you on the chapel step. I hope you can see it from wherever you stand.'],
  ];
  for (const [npc, f, say] of L) if (SB.npcs[npc]) sbAlt(npc, done(f), say);
}
// the watch kept: on clear nights near Stonebridge, a figure on the high ground, facing the town; look at it, or come
// close, and it's gone (the haunting's own figure, but it never follows and leaves nothing behind)
class WatchOver extends Watcher {
  faceAt() { const C = campDef(this.game), T = C && C.towns.stonebridge; if (T) this.yaw = Math.atan2(-(T.at[0] - this.x), -(T.at[1] - this.z)); }
  vanish() { this.remove = true; WATCH_OVER.active = null; WATCH_OVER.next = this.game.time + 240 + Math.random() * 300; }
  // the "He is here" rule sends the haunting away; this isn't the haunting, so it doesn't apply
  update(dt) {
    const g = this.game, own = Object.prototype.hasOwnProperty.call(g, 'rules'), R = g.rules;
    g.rules = function () { return Object.assign({}, R.call(g), { haunting: true }); };
    try { super.update(dt); } finally { if (own) g.rules = R; else delete g.rules; }
  }
}
const WATCH_OVER = { active: null, next: 0 };
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) {
    try {
      const g = this, S = g.meta && g.meta.campaign && campState(g);
      if (S && S.flags.veil_watch && g.dim === 0 && g.state === 'playing' && g.env && g.env.day < 0.35 && !WATCH_OVER.active && g.time > WATCH_OVER.next) {
        WATCH_OVER.next = g.time + 30;
        const C = campDef(g), T = C.towns.stonebridge, p = g.player;
        if (T && p && Math.hypot(p.x - T.at[0], p.z - T.at[1]) < 170 && Math.random() < 0.5) {
          let best = null;
          for (let k = 0; k < 14; k++) {
            const a = Math.random() * TAU, d = 55 + Math.random() * 30, x = Math.floor(p.x + Math.sin(a) * d), z = Math.floor(p.z + Math.cos(a) * d);
            if (!g.world.isLoaded(x, z) || Math.hypot(x - T.at[0], z - T.at[1]) < campTownR(T) + 8) continue;
            const y = findSafeY(g.world, x, z); if (y < SEA + 2) continue;
            if (!best || y > best[1]) best = [x + 0.5, y, z + 0.5];
          }
          if (best) { const w = new WatchOver(g, best[0], best[1], best[2], 'far'); w.life = 60 + Math.random() * 60; WATCH_OVER.active = w; g.entities.push(w); }
        }
      }
      if (WATCH_OVER.active && (WATCH_OVER.active.remove || !this.entities.includes(WATCH_OVER.active))) WATCH_OVER.active = null;
    } catch (e) { /* only a sight */ }
    return baseUpd.call(this, dt);
  };
}
