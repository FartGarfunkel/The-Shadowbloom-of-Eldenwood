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
