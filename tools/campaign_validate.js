// tools/campaign_validate.js — every connection in a campaign, checked against the game it runs in.
// Run in the page (tools/campaign_check.py): returns { errors, warnings, stats }.
(function validateCampaign(H, id) {
  const C = H.CAMPAIGNS[id], E = [], W = [];
  const err = (m) => E.push(m), warn = (m) => W.push(m);
  const item = (k) => !!H.ITEMS[k];
  const readObjs = [], setFlags = new Map(), testFlags = new Map(), startedQuests = new Set([C.firstQuest]), givenLetters = new Set(), clearFx = new Set(), endings = new Set();
  const note = (map, k, where) => { if (!map.has(k)) map.set(k, []); map.get(k).push(where); };
  const deferred = [];
  // flags the game's code sets (campaign/watcher.js: entering his realm, his fall)
  for (const f of ['realm_entered', 'watcher_fallen']) setFlags.set(f, ['code']);
  const FX_KEYS = new Set(['flag', 'unflag', 'quest', 'stage', 'complete', 'fail', 'give', 'take', 'gold', 'xp', 'letter', 'read', 'note', 'follow', 'stay', 'leave', 'back', 'narrate', 'toast', 'spawn', 'tp', 'heal', 'rest', 'rep', 'learn', 'end', 'weather', 'time', 'music', 'milestone', 'reveal', 'clear', 'attune', 'unknown', 'hurt', 'inspire', 'if', 'n', 'party', 'why', 'title', 'kind', 'type', 'at',
    // (alpha 3) effects handled by campaign/companions.js: houses, stables, Grom's forge
    'house', 'price', 'mount', 'forge', 'needs', 'max', 'name']);
  const COND_KEYS = new Set(['any', 'all', 'flag', 'not', 'quest', 'done', 'notStarted', 'active', 'undone', 'stage', 'past', 'has', 'n', 'lacks', 'cls', 'species', 'met', 'cleared']);
  const placeOrTown = (k) => C.places[k] || C.towns[k];
  const refOk = (k) => Array.isArray(k) || placeOrTown(k) || C.npcs[k];
  const quest = (q) => C.quests[q];
  function cond(c, where) {
    if (c == null) return;
    if (typeof c === 'string') { const f = c[0] === '!' ? c.slice(1) : c; note(testFlags, f, where); return; }
    if (Array.isArray(c)) { c.forEach(x => cond(x, where)); return; }
    for (const k of Object.keys(c)) if (!COND_KEYS.has(k)) warn(`${where}: unknown condition key "${k}"`);
    if (c.any) c.any.forEach(x => cond(x, where));
    if (c.all) c.all.forEach(x => cond(x, where));
    if (c.flag) note(testFlags, c.flag, where);
    if (c.not) note(testFlags, c.not, where);
    if (c.quest) {
      const Q = quest(c.quest); if (!Q) { err(`${where}: condition on unknown quest "${c.quest}"`); return; }
      for (const s of ['stage', 'past']) if (c[s] && !Q.stages[c[s]]) err(`${where}: quest ${c.quest} has no stage "${c[s]}"`);
    }
    if (c.has && !item(c.has)) err(`${where}: condition has unknown item "${c.has}"`);
    if (c.lacks && !item(c.lacks)) err(`${where}: condition lacks unknown item "${c.lacks}"`);
    if (c.cls) for (const x of [].concat(c.cls)) if (!H.DND_CLASSES[x]) err(`${where}: unknown class "${x}"`);
    if (c.cleared && !C.places[c.cleared]) err(`${where}: cleared unknown place "${c.cleared}"`);
    if (c.met && !C.npcs[c.met]) err(`${where}: met unknown npc "${c.met}"`);
  }
  function fx(list, where) {
    if (!list) return;
    for (const e of [].concat(list)) {
      if (!e || typeof e !== 'object') { err(`${where}: bad effect ${JSON.stringify(e)}`); continue; }
      for (const k of Object.keys(e)) if (!FX_KEYS.has(k)) warn(`${where}: unknown effect key "${k}"`);
      if (e.if) cond(e.if, where);
      if (e.flag) for (const f of [].concat(e.flag)) note(setFlags, f, where);
      if (e.quest) { if (!quest(e.quest)) err(`${where}: starts unknown quest "${e.quest}"`); startedQuests.add(e.quest); }
      if (e.stage) { const [q, s] = String(e.stage).split(':'); if (!quest(q)) err(`${where}: stage of unknown quest "${q}"`); else if (!quest(q).stages[s]) err(`${where}: quest ${q} has no stage "${s}"`); startedQuests.add(q); }
      if (e.complete && !quest(e.complete)) err(`${where}: completes unknown quest "${e.complete}"`);
      if (e.fail && !quest(e.fail)) err(`${where}: fails unknown quest "${e.fail}"`);
      for (const k of ['give', 'take']) if (e[k] && !item(e[k])) err(`${where}: ${k} unknown item "${e[k]}"`);
      if (e.letter) { if (!C.letters[e.letter]) err(`${where}: unknown letter "${e.letter}"`); givenLetters.add(e.letter); }
      if (e.read && !C.letters[e.read] && !H.LORE_OK) err(`${where}: reads unknown letter "${e.read}"`);
      for (const k of ['follow', 'stay', 'leave', 'back']) if (e[k] && !C.npcs[e[k]]) err(`${where}: ${k} unknown npc "${e[k]}"`);
      if (e.spawn && !H.MOB_TYPES[e.spawn]) err(`${where}: spawns unknown creature "${e.spawn}"`);
      if (e.tp && !refOk(e.tp)) err(`${where}: tp to unknown "${e.tp}"`);
      if (e.reveal) for (const r of [].concat(e.reveal)) if (!placeOrTown(r)) err(`${where}: reveals unknown place "${r}"`);
      if (e.clear) { if (!C.places[e.clear]) err(`${where}: clears unknown place "${e.clear}"`); clearFx.add(e.clear); }
      if (e.attune && !placeOrTown(e.attune)) err(`${where}: attunes unknown "${e.attune}"`);
      if (e.end) { endings.add(e.end); if (!(C.endings && C.endings[e.end])) err(`${where}: unknown ending "${e.end}"`); }
      if (e.narrate) for (const pg of [].concat(e.narrate)) if (!(typeof pg === 'string' || (pg && pg.text))) err(`${where}: narration page without text`);
      if (e.learn && !H.DND_SPELLS[e.learn]) err(`${where}: learns unknown spell "${e.learn}"`);
      if (e.milestone && !(e.milestone >= 1 && e.milestone <= 20)) err(`${where}: bad milestone ${e.milestone}`);
      if (e.rep && !C.towns[e.rep]) err(`${where}: rep in unknown town "${e.rep}"`);
    }
  }
  // ---- people and props ----
  const ROOMS = (n) => { const out = ['entry', 'boss'], kinds = ['hall', 'loot', 'spawner', 'hall', 'library', 'spawner', 'loot', 'hall', 'loot', 'spawner']; for (let i = 0; i < n - 2; i++) out.push(kinds[i % kinds.length]); return out; };
  const LOOKS = { hair: H.LOOK_HAIR, beard: H.LOOK_BEARD, eyes: H.LOOK_EYES, mouth: H.LOOK_MOUTH, marks: H.LOOK_MARKS, horns: H.LOOK_HORNS, ears: H.LOOK_EARS };
  for (const [nid, N] of Object.entries(C.npcs)) {
    const where = `npc ${nid}`;
    const locs = ['at', 'town', 'place', 'dungeon'].filter(k => N[k]);
    if (locs.length !== 1) err(`${where}: needs exactly one of at/town/place/dungeon (has ${locs.join(',') || 'none'})`);
    if (N.town) {
      const T = C.towns[N.town]; if (!T) err(`${where}: unknown town "${N.town}"`);
      else if (typeof N.post === 'string' && !['plaza', 'board', 'gate'].includes(N.post)) {
        const [type, nth] = N.post.split('#'), have = (T.buildings || []).map(b => typeof b === 'string' ? b : b.t).filter(t => t === type).length;
        if (!have) err(`${where}: town ${N.town} has no "${type}" building`); else if ((+nth || 0) >= have) err(`${where}: town ${N.town} has only ${have} "${type}" (wants #${nth})`);
      }
    }
    if (N.place && !C.places[N.place]) err(`${where}: unknown place "${N.place}"`);
    if (N.dungeon) {
      const P = C.places[N.dungeon]; if (!P || P.kind !== 'dungeon') err(`${where}: "${N.dungeon}" is not a campaign dungeon`);
      else { const [kind, nth] = String(N.room || 'boss').split('#'), have = ROOMS(P.rooms || 8).filter(r => r === kind).length; if (typeof N.room !== 'number' && (+nth || 0) >= have) err(`${where}: dungeon ${N.dungeon} has ${have} "${kind}" rooms (wants #${nth || 0})`); }
    }
    if (N.prop && H.B[N.prop] === undefined) err(`${where}: prop block "${N.prop}" does not exist`);
    if (N.leaves && H.B[N.leaves] === undefined) err(`${where}: leaves block "${N.leaves}" does not exist`);
    if (N.held && !item(N.held)) err(`${where}: holds unknown item "${N.held}"`);
    for (const [k, list] of [['wares', N.wares], ['buys', N.buys]]) for (const r of list || []) if (!item(r[0])) err(`${where}: ${k} unknown item "${r[0]}"`);
    if (N.look) {
      const L = N.look;
      if (L.outfit && !H.LOOK_OUTFITS[L.outfit]) err(`${where}: unknown outfit "${L.outfit}"`);
      for (const [k, opts] of Object.entries(LOOKS)) if (L[k] && opts && !opts.some(o => o[0] === L[k])) err(`${where}: unknown ${k} "${L[k]}"`);
      if (L.species && !H.DND_SPECIES[L.species]) err(`${where}: unknown species "${L.species}"`);
    } else if (!N.prop) warn(`${where}: no look`);
    cond(N.if, where + ' (if)'); cond(N.until, where + ' (until)');
    const T = N.talk; if (!T) { if (!N.prop) warn(`${where}: no talk`); continue; }
    const nodes = T.nodes || {};
    const starts = Array.isArray(T.start) ? T.start : [{ node: T.start || 'start' }];
    if (!nodes.start) err(`${where}: no "start" node`);
    for (const s of starts) { if (!nodes[s.node]) err(`${where}: start points at missing node "${s.node}"`); cond(s.if, where + ' start'); }
    const reached = new Set(starts.map(s => s.node).concat(['start']));
    for (const [k, nd] of Object.entries(nodes)) {
      const w = `${where}.${k}`;
      if (nd.say == null && !(nd.alt && nd.alt.length)) err(`${w}: no say`);
      for (const a of nd.alt || []) cond(a.if, w + ' alt');
      fx(nd.do, w);
      for (const [i, o] of (nd.opts || []).entries()) {
        const wo = `${w}[${i}] "${String(o.t).slice(0, 40)}"`;
        for (const kk of Object.keys(o)) if (!['t', 'go', 'if', 'do', 'check', 'end', 'shop', 'once', 'reply'].includes(kk)) warn(`${wo}: unknown option key "${kk}"`);
        cond(o.if, wo); fx(o.do, wo);
        if (o.go) { if (!nodes[o.go]) err(`${wo}: goes to missing node "${o.go}"`); reached.add(o.go); }
        if (o.check) {
          const ck = o.check;
          if (ck.skill && !H.DND_SKILLS[ck.skill]) err(`${wo}: unknown skill "${ck.skill}"`);
          if (ck.save && !H.DND_ABILITY_NAMES[ck.save]) err(`${wo}: unknown save "${ck.save}"`);
          if (ck.ability && !H.DND_ABILITY_NAMES[ck.ability]) err(`${wo}: unknown ability "${ck.ability}"`);
          if (!ck.skill && !ck.save && !ck.ability) err(`${wo}: check without skill/save/ability`);
          if (!(ck.dc > 0)) err(`${wo}: check without dc`);
          for (const b of ['pass', 'fail']) if (ck[b]) { if (!nodes[ck[b]]) err(`${wo}: check ${b} goes to missing node "${ck[b]}"`); reached.add(ck[b]); }
          fx(ck.passDo, wo); fx(ck.failDo, wo);
        }
        if (o.shop && o.shop === true && !N.wares && !N.shop) err(`${wo}: shop without wares`);
        if (!o.go && !o.end && !o.reply && !o.check && !o.shop && !o.do) warn(`${wo}: option does nothing but close`);
      }
    }
    for (const k of Object.keys(nodes)) if (!reached.has(k) && !(T.back === k)) warn(`${where}: node "${k}" is never reached`);
  }
  // ---- places, creatures, items, letters ----
  const BUILTIN_SITES = ['camp', 'ruin', 'tomb', 'shrine', 'standing_stones', 'grove', 'tower', 'cave', 'manor', 'farmstead', 'cabin', 'bridge', 'mine'];
  for (const [pid, P] of Object.entries(C.places)) {
    const where = `place ${pid}`;
    if (!Array.isArray(P.at) || P.at.length !== 2) err(`${where}: bad at`);
    if (P.kind === 'dungeon') { if (P.theme && !H.DTHEME[P.theme]) err(`${where}: unknown theme "${P.theme}"`); for (const m of P.mobs || []) if (!H.MOB_TYPES[m]) err(`${where}: unknown mob "${m}"`); }
    else if (!BUILTIN_SITES.includes(P.kind) && !H.CAMP_SITE_KINDS[P.kind]) err(`${where}: unknown site kind "${P.kind}"`);
    if (P.boss && !H.MOB_TYPES[P.boss]) err(`${where}: unknown boss "${P.boss}"`);
    for (const [m] of P.minions || []) if (!H.MOB_TYPES[m]) err(`${where}: unknown minion "${m}"`);
    cond(P.bossIf, where + ' bossIf'); cond(P.anchorIf, where + ' anchorIf');
    fx(P.onClear, where + ' onClear'); fx(P.onFind, where + ' onFind');
    for (const b of Object.values(P.blocks || {})) if (H.B[b] === undefined) warn(`${where}: palette block "${b}" missing`);
  }
  // places too close to each other or to towns
  const allPts = [...Object.entries(C.places).map(([k, P]) => [k, P.at, P.kind === 'dungeon' ? 30 : (P.size || 7) + 3]), ...Object.entries(C.towns).map(([k, T]) => [k, T.at, T.size === 'large' ? 100 : T.size === 'small' ? 52 : 75])];
  for (let i = 0; i < allPts.length; i++) for (let j = i + 1; j < allPts.length; j++) { const [a, pa, ra] = allPts[i], [b, pb, rb] = allPts[j]; const d = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]); if (d < ra + rb) warn(`overlap: ${a} and ${b} are ${d.toFixed(0)} apart (want ${ra + rb})`); }
  // dungeons share a dungeon region? towns share a town region?
  const reg = (at, R) => Math.floor(at[0] / R) + ',' + Math.floor(at[1] / R);
  const dr = {}; for (const [k, P] of Object.entries(C.places)) if (P.kind === 'dungeon') { const r = reg(P.at, 288); if (dr[r]) err(`dungeons ${dr[r]} and ${k} share a dungeon region`); dr[r] = k; }
  const tr = {}; for (const [k, T] of Object.entries(C.towns)) { const r = reg(T.at, 352); if (tr[r]) err(`towns ${tr[r]} and ${k} share a town region`); tr[r] = k; }
  for (const [k, c] of Object.entries(C.creatures)) {
    const where = `creature ${k}`;
    if (!H.MOB_TYPES[c.base] || C.creatures[c.base]) err(`${where}: base "${c.base}" is not a game creature`);
    for (const d of c.drops || []) if (!item(d[0])) err(`${where}: drops unknown item "${d[0]}"`);
    for (const ph of c.phases || []) { if (ph.spawn && !H.MOB_TYPES[ph.spawn[0]]) err(`${where}: phase spawns unknown "${ph.spawn[0]}"`); fx(ph.do, where + ' phase'); }
    if (c.minion && !H.MOB_TYPES[c.minion]) err(`${where}: unknown minion "${c.minion}"`);
    cond(c.weakIf, where + ' weakIf'); fx(c.onDeath, where + ' onDeath');
    if (!(c.hp > 0)) warn(`${where}: no hp`);
  }
  for (const [k, it] of Object.entries(C.items)) {
    const where = `item ${k}`;
    if (it.base && !H.ITEMS[it.base]) err(`${where}: unknown base "${it.base}"`);
    if (it.cast && !H.DND_SPELLS[it.cast]) err(`${where}: casts unknown spell "${it.cast}"`);
    if (it.trinket && it.trinket.skills) for (const s of Object.keys(it.trinket.skills)) if (!H.DND_SKILLS[s]) err(`${where}: trinket unknown skill "${s}"`);
    if (!H.ITEMS[k]) err(`${where}: not defined in the game`);
  }
  // ---- quests ----
  for (const [qid, Q] of Object.entries(C.quests)) {
    const where = `quest ${qid}`;
    deferred.push(() => { if (!startedQuests.has(qid)) err(`${where}: never started`); });   // after the triggers, which start some
    const ks = Object.keys(Q.stages || {}); if (!ks.length) err(`${where}: no stages`);
    if (Q.first && !Q.stages[Q.first]) err(`${where}: first stage "${Q.first}" missing`);
    for (const [sid, st] of Object.entries(Q.stages)) {
      const w = `${where}.${sid}`;
      if (st.next && !Q.stages[st.next]) err(`${w}: next "${st.next}" missing`);
      if (st.at && !refOk(st.at)) err(`${w}: at "${st.at}" unknown`);
      fx(st.onStart, w + ' onStart'); fx(st.onDone, w + ' onDone');
      const objs = st.obj ? (st.obj.any ? st.obj.any : [st.obj]) : []; if (!st.obj) err(`${w}: no objective`);
      for (const O of objs) {
        if (O.flag && O.flag !== '_never') note(testFlags, O.flag, w + ' obj');
        if (O.flags) O.flags.forEach(f => note(testFlags, f, w + ' obj'));
        if (O.reach && !refOk(O.reach)) err(`${w}: reach unknown "${O.reach}"`);
        if (O.clear) { const P = C.places[O.clear]; if (!P) err(`${w}: clear unknown place "${O.clear}"`); else if (!P.boss && !clearFx.has(O.clear)) warn(`${w}: ${O.clear} has no boss (needs a clear effect)`); }
        if (O.read) { if (!C.letters[O.read]) err(`${w}: read unknown letter "${O.read}"`); else readObjs.push([w, O.read]); }
        if (O.kill) for (const m of [].concat(O.kill)) if (!H.MOB_TYPES[m]) err(`${w}: kill unknown "${m}"`);
        if (O.have && !item(O.have)) err(`${w}: have unknown item "${O.have}"`);
        for (const h of O.haveAll || []) if (!item(h)) err(`${w}: haveAll unknown item "${h}"`);
        if (O.talk && !C.npcs[O.talk]) err(`${w}: talk unknown npc "${O.talk}"`);
      }
    }
    fx(Q.onDone, where + ' onDone');
    for (const [i] of (Q.reward && Q.reward.items) || []) if (!item(i)) err(`${where}: reward unknown item "${i}"`);
  }
  // ---- triggers, towns, the start ----
  for (const [k, T] of Object.entries(C.triggers || {})) {
    const where = `trigger ${k}`;
    for (const r of ['reach', 'far', 'near']) if (T[r] && !refOk(T[r])) err(`${where}: ${r} unknown "${T[r]}"`);
    cond(T.if, where); fx(T.do, where);
  }
  for (const [k, T] of Object.entries(C.towns)) {
    for (const n of T.notices || []) cond(n.if, `town ${k} notice`);
    for (const b of T.buildings || []) { const t = typeof b === 'string' ? b : b.t; if (H.VTEMPLATES && !H.VTEMPLATES[t]) err(`town ${k}: unknown building "${t}"`); }
  }
  if (!C.towns[C.start.town]) err(`start town "${C.start.town}" unknown`);
  // the same building wanted twice for a person? (two people on one spot)
  const spots = {}; for (const [nid, N] of Object.entries(C.npcs)) if (N.town && !N.at) { const key = N.town + ':' + JSON.stringify(N.post || 'plaza') + ':' + JSON.stringify(N.bpos || null); (spots[key] = spots[key] || []).push(nid); }
  for (const [key, ids] of Object.entries(spots)) if (ids.length > 1) warn(`shared spot ${key}: ${ids.join(', ')} (fine if never at once)`);
  for (const k of Object.keys(C.letters)) if (!givenLetters.has(k)) warn(`letter ${k} is never given`);
  for (const [w, k] of readObjs) if (!givenLetters.has(k)) err(`${w}: letter "${k}" is never given`);
  // ---- flags ----
  for (const d of deferred) d();
  for (const [f, ws] of testFlags) if (!setFlags.has(f) && !f.startsWith('_')) err(`flag "${f}" is tested but never set (${ws.slice(0, 3).join('; ')})`);
  const stats = { npcs: Object.keys(C.npcs).length, quests: Object.keys(C.quests).length, places: Object.keys(C.places).length, creatures: Object.keys(C.creatures).length, items: Object.keys(C.items).length, letters: Object.keys(C.letters).length, triggers: Object.keys(C.triggers || {}).length, flags: setFlags.size, endings: [...endings] };
  return { errors: E, warnings: W, stats };
})
