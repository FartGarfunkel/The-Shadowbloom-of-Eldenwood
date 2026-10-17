// ---------------------------------------------------------------------------
// campaign/engine.js — a tabletop campaign, played in the voxel world.
//
// A campaign is data (campaign/<name>.js calls campaignDefine): its towns, the people
// in them and what they say, the places to find, the creatures and items of its story,
// letters and books, and the quests that carry the tale from its first scene to its end.
//
// The engine puts the towns and places into a new world at the spots the campaign
// names, brings its people to life, runs their conversations (with skill checks on
// the dice), keeps the party's progress (one story per world, shared by everyone
// playing it, at one screen or over the network), and writes it all into the journal.
//
//   meta.campaign = campaign id        (set when the world is made; fixes where things are)
//   meta.camp = { started, flags, quests: { id: { stage, done, n } }, met, seen, letters, log, kills, ended }
// ---------------------------------------------------------------------------

const CAMPAIGNS = {};
const CAMP_RT = { tickT: 0, npcT: 0, ents: new Map(), narrating: null, hudT: 0 };

// ---- defining one -------------------------------------------------------------------------------------------
function campaignDefine(C) {
  C.towns = C.towns || {}; C.npcs = C.npcs || {}; C.places = C.places || {}; C.quests = C.quests || {};
  C.creatures = C.creatures || {}; C.items = C.items || {}; C.letters = C.letters || {}; C.lore = C.lore || {};
  // creatures: copies of the game's own, renamed and retuned
  for (const [k, c] of Object.entries(C.creatures)) {
    const base = MOB_TYPES[c.base] || MOB_TYPES.ghoul;
    const T = Object.assign({}, base, {
      label: c.name, hp: c.hp ?? base.hp, damage: c.damage ?? base.damage, speed: c.speed ?? base.speed, xp: c.xpGame ?? base.xp,
      hostile: c.hostile ?? base.hostile, boss: !!c.boss || !!base.boss && c.boss !== false, mini: !!c.mini, tint: c.tint || base.tint,
      ac: c.ac, toHit: c.toHit, dndXp: c.xp, fireImmune: c.fireImmune ?? base.fireImmune, undead: c.undead ?? base.undead,
      drops: c.drops || base.drops || [], campaign: true, scale: c.scale, element: c.element || base.element, knockResist: c.knockResist ?? base.knockResist,
      desc: c.desc, resist: c.resist, minion: c.minion || base.minion,
    });
    if (c.w) T.w = c.w; if (c.h) T.h = c.h;
    MOB_TYPES[k] = T;
    if (typeof MONSTER_AI !== 'undefined' && MONSTER_AI[c.base] && !MONSTER_AI[k]) MONSTER_AI[k] = MONSTER_AI[c.base];
    if (typeof MODEL_OF !== 'undefined' && MODEL_OF[c.base] && !MODEL_OF[k]) MODEL_OF[k] = MODEL_OF[c.base];
  }
  // items: the story's named things
  for (const [k, it] of Object.entries(C.items)) {
    const base = it.base && ITEMS[it.base];
    const props = Object.assign({}, base ? { tool: base.tool && Object.assign({}, base.tool), armor: base.armor && Object.assign({}, base.armor), dnd: base.dnd && Object.assign({}, base.dnd), icon: base.icon, food: base.food, bow: base.bow, staff: base.staff, dndGear: base.dndGear } : {}, {
      name: it.name, maxStack: it.stack || 1, desc: it.desc, rarity: it.rarity || (it.plus >= 2 ? 'epic' : it.plus ? 'rare' : undefined), campaign: true, quest: !!it.quest,
    });
    if (it.icon) props.icon = it.icon;
    if (!props.icon) props.icon = 'dnd_' + (it.art || 'pack');
    if (it.dice && props.dnd) props.dnd.dice = it.dice;
    if (it.plus && props.dnd) props.dnd.bonus = (props.dnd.bonus || 0) + it.plus;
    if (it.dmg && props.dnd) props.dnd.dmg = it.dmg;
    if (it.extra) props.dndExtra = it.extra;   // [n, d, type]: more damage of a kind
    if (it.ac) props.dndAcBonus = it.ac;
    if (it.letter) props.lore = it.letter;
    defItem(k, props);
    if (it.art && !it.icon && !base) CAMP_ICONS.push([k, it.art, it.cols || ['#c8a060', '#6a4a2a', '#f0d8a0']]);
  }
  // letters and books: readable, never loot
  for (const [k, L] of Object.entries(C.letters)) {
    LORE[k] = [L.title, L.text];
    if (!ITEMS['lore_' + k]) defItem('lore_' + k, { name: L.title, maxStack: 1, icon: 'lore_book', lore: k, desc: L.desc || 'A letter. Use it to read.', campaign: true });
  }
  // people: a job for each (their title, what they hold), so every player's game draws them alike
  for (const [k, n] of Object.entries(C.npcs)) {
    NPC_JOBS['c_' + k] = Object.assign({ title: n.title || 'Traveller' }, n.job || {}, { held: n.held || (n.job && n.job.held) || null, campaign: k });
    if (n.shop && NPC_SHOPS[n.shop]) NPC_SHOPS['c_' + k] = NPC_SHOPS[n.shop];
    if (n.wares) NPC_SHOPS['c_' + k] = { buy: n.wares, sell: n.buys || [] };
  }
  // dungeon looks
  if (C.themes) for (const [k, th] of Object.entries(C.themes)) { th.wall = th.wall.filter(b => B[b] !== undefined); th.floor = th.floor.filter(b => B[b] !== undefined); DTHEME[k] = th; }
  CAMPAIGNS[C.id] = C;
  return C;
}
const CAMP_ICONS = [];
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () { base(); for (const [k, art, cols] of CAMP_ICONS) addItem('dnd_c_' + k, p => dndPaintArt(p, art, cols)); };
  // campaign items without an icon of their own wear their picture under dnd_c_<key>
  const baseIcons = typeof buildIcons === 'function' ? buildIcons : null;
  if (baseIcons) buildIcons = function () { for (const [k] of CAMP_ICONS) if (ITEMS[k] && ITEMS[k].icon === 'dnd_' + (C_ART_OF[k] || 'pack')) ITEMS[k].icon = 'dnd_c_' + k; return baseIcons(); };
}
const C_ART_OF = {};

function campOfMeta(meta) { return meta && meta.campaign ? CAMPAIGNS[meta.campaign] || null : null; }
function campDef(g) { return campOfMeta(g && g.meta); }
function campState(g) {
  const M = g.meta; if (!M) return null;
  const s = M.camp || (M.camp = { started: 0, flags: {}, quests: {}, met: {}, seen: {}, letters: [], log: [], kills: {}, cleared: {}, follow: {}, gone: {} });
  for (const k of ['flags', 'quests', 'met', 'seen', 'kills', 'cleared', 'follow', 'gone']) if (!s[k]) s[k] = {};
  for (const k of ['letters', 'log']) if (!s[k]) s[k] = [];
  return s;
}
// the campaign of the world being generated (the generator has no game to ask)
function campGenDef() { return typeof VILLAGE_CTX !== 'undefined' && VILLAGE_CTX && VILLAGE_CTX.meta ? campOfMeta(VILLAGE_CTX.meta) : (CAMP_RT.genCampaign ? CAMPAIGNS[CAMP_RT.genCampaign] : null); }

// ---- where things are -----------------------------------------------------------------------------------------
// positions in the data are [x, z] blocks from the world's middle (where the story starts)
function campPos(C, ref) {
  if (!ref) return null;
  if (Array.isArray(ref)) return ref;
  if (C.towns[ref]) return C.towns[ref].at;
  if (C.places[ref]) return C.places[ref].at;
  if (C.npcs[ref]) { const n = C.npcs[ref]; return n.at || campPos(C, n.town || n.place); }
  return null;
}
WorldGen.prototype.campaignTownAt = function (rx, rz) {
  if (this.dim !== 0) return null;
  const C = campGenDef(); if (!C) return null;
  for (const [id, T] of Object.entries(C.towns)) {
    const [x, z] = T.at;
    if (Math.floor(x / VREG) === rx && Math.floor(z / VREG) === rz) return { x, z, name: T.name, style: T.style, want: T.buildings, town: id, roadLen: T.roadLen || (T.size === 'small' ? 18 : T.size === 'large' ? 40 : 28), small: T.size === 'small' || !!T.buildings };
  }
  return null;
};
WorldGen.prototype.campaignTownsNear = function (x, z, r) {
  if (this.dim !== 0) return false;
  const C = campGenDef(); if (!C) return false;
  return Object.values(C.towns).some(T => Math.hypot(T.at[0] - x, T.at[1] - z) < r);
};
WorldGen.prototype.campaignDungeonAt = function (rx, rz) {
  if (this.dim !== 0) return null;
  const C = campGenDef(); if (!C) return null;
  for (const [id, P] of Object.entries(C.places)) {
    if (P.kind !== 'dungeon') continue;
    const [x, z] = P.at;
    if (Math.floor(x / DREG) === rx && Math.floor(z / DREG) === rz) return { x, z, theme: P.theme, boss: P.boss, mobs: P.mobs, name: P.name, rooms: P.rooms, deep: P.deep, place: id };
  }
  return null;
};
WorldGen.prototype.campaignPlacesNear = function (x, z, r) {
  const C = campGenDef(); if (!C) return false;
  return Object.values(C.places).some(P => Math.hypot(P.at[0] - x, P.at[1] - z) < r) || Object.values(C.towns).some(T => Math.hypot(T.at[0] - x, T.at[1] - z) < r + 60);
};
function campTownVillage(g, townId) {
  const C = campDef(g), T = C && C.towns[townId]; if (!T || !g.world || g.dim !== 0) return null;
  const gen = g.world.gen; return gen.villageAt ? gen.villageAt(Math.floor(T.at[0] / VREG), Math.floor(T.at[1] / VREG)) : null;
}
function campDungeon(g, placeId) {
  const C = campDef(g), P = C && C.places[placeId]; if (!P || P.kind !== 'dungeon' || !g.world || g.dim !== 0) return null;
  const gen = g.world.gen; return gen.dungeonAt ? gen.dungeonAt(Math.floor(P.at[0] / DREG), Math.floor(P.at[1] / DREG)) : null;
}

// the start: the party wakes where the story says
{
  const basePlace = Game.prototype.placeAtSpawn;
  Game.prototype.placeAtSpawn = function (...a) {
    const C = campDef(this);
    if (C && this.meta && !this.meta.spawn && this.dim === 0 && C.start) {
      const at = campPos(C, C.start.at || C.start.town) || [0, 0];
      let [x, z] = at;
      if (C.start.offset) { x += C.start.offset[0]; z += C.start.offset[1]; }
      const v = C.start.town ? campTownVillage(this, C.start.town) : null;
      if (v && !C.start.offset && v.roads && v.roads.length) { const r = v.roads[0], c = r.cells[r.cells.length - 4] || r.cells[0]; x = c[0]; z = c[1]; }
      const h = this.world.gen.column(Math.floor(x), Math.floor(z)).h;
      this.meta.spawn = [Math.floor(x) + 0.5, Math.max(h, SEA) + 1, Math.floor(z) + 0.5];
    }
    return basePlace.apply(this, a);
  };
}

// ---- conditions and effects -------------------------------------------------------------------------------------
// cond: a flag name, '!flag', or { flag, not, quest, stage, done, notStarted, has, n, cls, species, any:[...], all:[...] }
function campTest(g, cond, lp) {
  if (cond == null) return true;
  const S = campState(g);
  if (typeof cond === 'string') return cond[0] === '!' ? !S.flags[cond.slice(1)] : !!S.flags[cond];
  if (Array.isArray(cond)) return cond.every(c => campTest(g, c, lp));
  if (cond.any) return cond.any.some(c => campTest(g, c, lp));
  if (cond.all && !cond.all.every(c => campTest(g, c, lp))) return false;
  if (cond.flag && !S.flags[cond.flag]) return false;
  if (cond.not && S.flags[cond.not]) return false;
  if (cond.quest) {
    const Q = S.quests[cond.quest];
    if (cond.done && !(Q && Q.done)) return false;
    if (cond.notStarted && Q) return false;
    if (cond.active && !(Q && !Q.done)) return false;
    if (cond.stage && !(Q && !Q.done && Q.stage === cond.stage)) return false;
    if (cond.past && !(Q && (Q.done || (Q.passed || []).includes(cond.past)))) return false;
  }
  if (cond.has) { const n = cond.n || 1; const who = lp ? [lp] : g.locals; if (!who.some(l => l.player.inv.count(cond.has) >= n)) return false; }
  if (cond.cls || cond.species) { const c = lp && lp.player.stats && lp.player.stats.dnd; if (!c) return false; if (cond.cls && ![].concat(cond.cls).includes(c.cls)) return false; if (cond.species && ![].concat(cond.species).includes(c.species)) return false; }
  if (cond.met && !S.met[cond.met]) return false;
  if (cond.cleared && !S.cleared[cond.cleared]) return false;
  return true;
}

// every pawn in the party (players here and those joined over the network)
function campParty(g) { return g.pawns ? g.pawns().filter(p => p) : g.locals.map(l => l.player); }
function campLocalOf(g, pawn) { return g.locals.find(l => l.player === pawn || l === pawn) || null; }

// effects run where the world is kept (the host); a guest asks the host to run them
function campDo(g, fx, lp, ctx = {}) {
  if (!fx) return;
  const list = Array.isArray(fx) ? fx : [fx];
  if (g.isGuest) {
    // what belongs to this player (their own inventory, a narration on their screen) happens here; the rest at the host
    const mine = [], theirs = [];
    for (const e of list) (e.give || e.take || e.gold || e.letter || e.narrate || e.read || e.learn ? mine : theirs).push(e);
    if (theirs.length && g.net) g.net.send({ t: 'adv', k: 'campfx', fx: theirs, li: lp ? lp.index || 0 : 0, npc: ctx.npc });
    list.length = 0; list.push(...mine);
  }
  const S = campState(g), C = campDef(g);
  for (const e of list) {
    try {
      if (e.if && !campTest(g, e.if, lp)) continue;
      if (e.flag) for (const f of [].concat(e.flag)) S.flags[f] = 1;
      if (e.unflag) for (const f of [].concat(e.unflag)) delete S.flags[f];
      if (e.quest) campQuestStart(g, e.quest, lp);
      if (e.stage) { const [q, st] = String(e.stage).split(':'); campQuestStage(g, q, st, lp); }
      if (e.complete) campQuestComplete(g, e.complete, lp);
      if (e.fail) { const Q = S.quests[e.fail]; if (Q && !Q.done) { Q.done = 1; Q.failed = 1; campLog(g, `Quest failed: ${(C.quests[e.fail] || {}).title || e.fail}`); } }
      if (e.give) campGive(g, lp, e.give, e.n || 1, e.party);
      if (e.take) { const who = lp || g.locals[0]; if (who) who.player.inv.remove(e.take, e.n || 1); }
      if (e.gold) campGive(g, lp, 'gold_coin', e.gold, e.party !== false);
      if (e.xp) campXp(g, e.xp, e.why || 'the story');
      if (e.letter) { if (!S.letters.includes(e.letter)) S.letters.push(e.letter); campGive(g, lp, 'lore_' + e.letter, 1); }
      if (e.read && lp) new BookUI(lp, e.read);
      if (e.note) campLog(g, e.note);
      if (e.follow) { S.follow[e.follow] = 1; delete S.gone[e.follow]; }
      if (e.stay) delete S.follow[e.stay];
      if (e.leave) { S.gone[e.leave] = 1; delete S.follow[e.leave]; const ent = CAMP_RT.ents.get(e.leave); if (ent) { g.burst(ent.x, ent.y + 1, ent.z, 'smoke', 12, 0.6); ent.remove = true; CAMP_RT.ents.delete(e.leave); } }
      if (e.back) delete S.gone[e.back];
      if (e.narrate) campNarrate(g, [].concat(e.narrate), e.title);
      if (e.toast) for (const l of g.locals) l.toast(e.toast, e.kind || '');
      if (e.spawn) campSpawn(g, e.spawn, e.n || 1, e.at, lp);
      if (e.tp) campTeleport(g, e.tp);
      if (e.heal) for (const p of campParty(g)) { const L = campLocalOf(g, p); if (L) dndHealFull(L); }
      if (e.rest) for (const L of g.locals) dndDoRest(L, e.rest);
      if (e.rep && typeof npcRep === 'function') { const v = campTownVillage(g, e.rep); if (v) for (const L of g.locals) npcRep(g, L, v.id, e.n || 10, 'story'); }
      if (e.learn && lp) { const c = lp.player.stats && lp.player.stats.dnd; if (c && !c.spells.includes(e.learn)) { c.spells.push(e.learn); lp.toast(`You learn ${DND_SPELLS[e.learn] ? DND_SPELLS[e.learn].name : e.learn}`, 'epic'); } }
      if (e.end) campEnd(g, e.end);
      if (e.weather && typeof g.setWeather === 'function') g.setWeather(e.weather);
      if (e.time != null && g.meta) g.meta.time = e.time * DAY_LEN;
      if (e.music && typeof playMood === 'function') playMood(e.music);
    } catch (err) { console.warn('campaign effect', e, err); }
  }
  campChanged(g);
}
function campGive(g, lp, id, n, party) {
  if (!ITEMS[id]) { console.warn('campaign: no item', id); return; }
  const who = party ? campParty(g) : [lp ? lp.player : (g.locals[0] && g.locals[0].player)];
  for (const p of who) {
    if (!p) continue;
    const L = campLocalOf(g, p);
    const st = mkStack(id, n);
    if (L) { const left = L.give(st); L.toast(`Received: ${itemDef(id).name}${n > 1 ? ' ×' + n : ''}`, 'good'); if (left) g.dropItem(mkStack(id, left), p.x, p.y + 1, p.z); }
    else if (p.give) { p.give(st); if (p.toast) p.toast(`Received: ${itemDef(id).name}${n > 1 ? ' ×' + n : ''}`, 'good'); }
  }
}
function campXp(g, n, why) {
  if (!n) return;
  for (const p of campParty(g)) {
    const L = campLocalOf(g, p);
    if (L) dndAwardXp(L, n, why);
    else if (p.send) p.send({ t: 'adv', k: 'campxp', n, why });
  }
}
function campLog(g, text) {
  const S = campState(g);
  S.log.push({ d: npcDay(g), t: text });
  if (S.log.length > 200) S.log.splice(0, S.log.length - 200);
}
function campSpawn(g, type, n, at, lp) {
  if (g.isGuest || !MOB_TYPES[type]) return;
  const C = campDef(g);
  let pos = at ? campPos(C, at) : null, y = null;
  const near = lp ? lp.player : g.locals[0] ? g.locals[0].player : null;
  if (!pos && near) { const a = Math.random() * TAU; pos = [near.x + Math.cos(a) * 6, near.z + Math.sin(a) * 6]; }
  if (!pos) return;
  for (let i = 0; i < n; i++) {
    const x = pos[0] + (Math.random() - 0.5) * 4, z = pos[1] + (Math.random() - 0.5) * 4;
    const sy = findSafeY ? findSafeY(g.world, Math.floor(x), Math.floor(z)) : null;
    y = sy != null ? sy : (near ? near.y : 70);
    const m = g.addEntity(new Mob(g, type, x, y, z)); m.persistent = true; m.huntT = 30; m.campSpawned = true;
    g.burst(x, y + 1, z, 'smoke', 14, 0.8);
  }
}
function campTeleport(g, ref) {
  const C = campDef(g), at = campPos(C, ref); if (!at || g.isGuest) return;
  for (const l of g.locals) { const p = l.player, h = g.world.gen.column(Math.floor(at[0]), Math.floor(at[1])).h; p.x = at[0] + 0.5; p.z = at[1] + 0.5; p.y = Math.max(h, SEA) + 1.2; p.vx = p.vy = p.vz = 0; }
  if (g.net) for (const p of g.net.pawns()) p.send({ t: 'adv', k: 'camptp', at });
}

// ---- quests ----------------------------------------------------------------------------------------------------
function campQuestStart(g, qid, lp) {
  const C = campDef(g), Q = C && C.quests[qid], S = campState(g);
  if (!Q || S.quests[qid]) return;
  const first = Q.first || Object.keys(Q.stages)[0];
  S.quests[qid] = { stage: first, done: 0, n: 0, passed: [], began: npcDay(g) };
  for (const l of g.locals) { l.toast(`${Q.main ? 'Main quest' : 'New quest'}: ${Q.title}`, Q.main ? 'epic' : 'good'); }
  if (g.net) g.net.all({ t: 'adv', k: 'camptoast', m: `${Q.main ? 'Main quest' : 'New quest'}: ${Q.title}`, kind: Q.main ? 'epic' : 'good' });
  campLog(g, `Began: ${Q.title}`);
  const st = Q.stages[first]; if (st && st.onStart) campDo(g, st.onStart, lp);
  campChanged(g);
}
function campQuestStage(g, qid, stage, lp) {
  const C = campDef(g), Q = C && C.quests[qid], S = campState(g);
  if (!Q) return;
  if (!S.quests[qid]) campQuestStart(g, qid, lp);
  const R = S.quests[qid]; if (R.done) return;
  if (R.stage === stage) return;
  if (R.stage && !R.passed.includes(R.stage)) R.passed.push(R.stage);
  R.stage = stage; R.n = 0; R.at = npcDay(g);
  const st = Q.stages[stage];
  if (!st) { campQuestComplete(g, qid, lp); return; }
  const msg = st.goal || st.text;
  for (const l of g.locals) l.toast(`${Q.title}: ${msg}`, 'good');
  if (g.net) g.net.all({ t: 'adv', k: 'camptoast', m: `${Q.title}: ${msg}`, kind: 'good' });
  if (g.sfx) g.sfx.play('levelup');
  if (st.onStart) campDo(g, st.onStart, lp);
  campChanged(g);
}
function campQuestComplete(g, qid, lp) {
  const C = campDef(g), Q = C && C.quests[qid], S = campState(g);
  if (!Q) return;
  const R = S.quests[qid] || (S.quests[qid] = { stage: null, passed: [], n: 0 });
  if (R.done) return;
  if (R.stage && !R.passed.includes(R.stage)) R.passed.push(R.stage);
  R.done = 1; R.stage = null; R.ended = npcDay(g);
  for (const l of g.locals) l.toast(`Quest complete: ${Q.title}`, 'epic');
  if (g.net) g.net.all({ t: 'adv', k: 'camptoast', m: `Quest complete: ${Q.title}`, kind: 'epic' });
  campLog(g, `Completed: ${Q.title}`);
  const W = Q.reward || {};
  if (W.xp) campXp(g, W.xp, Q.title);
  if (W.gold) campGive(g, lp, 'gold_coin', W.gold, true);
  if (W.items) for (const [id, n] of W.items) campGive(g, lp, id, n || 1, false);
  if (Q.onDone) campDo(g, Q.onDone, lp);
  campChanged(g);
}
// the objective of a quest stage: is it done yet?
function campObjDone(g, qid, R, st) {
  const O = st.obj; if (!O) return false;
  const C = campDef(g), S = campState(g);
  if (O.flag) return !!S.flags[O.flag];
  if (O.kill) { const types = [].concat(O.kill); return (R.n || 0) >= (O.n || 1) || false; }
  if (O.have) return g.locals.some(l => l.player.inv.count(O.have) >= (O.n || 1)) || (campParty(g).some(p => p.st && p.st.campHave && p.st.campHave[O.have] >= (O.n || 1)));
  if (O.reach) {
    if (S.cleared[O.reach]) return true;
    const at = campPos(C, O.reach), r = O.r || (C.towns[O.reach] ? 40 : C.places[O.reach] ? C.places[O.reach].r || 24 : 12);
    if (!at || g.dim !== (O.dim || 0)) return false;
    return campParty(g).some(p => !p.dead && Math.hypot(p.x - at[0], p.z - at[1]) < r);
  }
  if (O.clear) return !!S.cleared[O.clear];
  if (O.talk) return !!(R.talked && R.talked[O.talk]);
  if (O.read) return !!(S.read && S.read[O.read]);
  if (O.any) return O.any.some(o => campObjDone(g, qid, R, { obj: o }));
  return false;
}
function campQuestTick(g) {
  const C = campDef(g), S = campState(g); if (!C || g.isGuest) return;
  for (const [qid, R] of Object.entries(S.quests)) {
    for (let hop = 0; hop < 6; hop++) {
      if (R.done || !R.stage) break;
      const Q = C.quests[qid], st = Q && Q.stages[R.stage]; if (!st) break;
      if (!campObjDone(g, qid, R, st)) break;
      const was = R.stage, next = st.next;
      if (st.onDone) campDo(g, st.onDone);
      if (R.stage !== was || R.done) continue;   // the effects moved it on already
      if (next) campQuestStage(g, qid, next); else campQuestComplete(g, qid);
    }
  }
  // triggers: things that happen when the party gets somewhere, or a flag is set
  for (const [k, T] of Object.entries(C.triggers || {})) {
    if (S.flags['_t_' + k]) continue;
    if (T.if && !campTest(g, T.if)) continue;
    let fire = false;
    if (T.reach) { const at = campPos(C, T.reach), r = T.r || 20; fire = !!at && g.dim === 0 && campParty(g).some(p => !p.dead && Math.hypot(p.x - at[0], p.z - at[1]) < r); }
    else if (T.after) fire = (g.meta.playTime || 0) > T.after;
    else fire = true;
    if (fire) { S.flags['_t_' + k] = 1; campDo(g, T.do); }
  }
  // places found
  for (const [pid, P] of Object.entries(C.places)) {
    if (S.seen[pid] || g.dim !== 0) continue;
    if (campParty(g).some(p => Math.hypot(p.x - P.at[0], p.z - P.at[1]) < (P.r || 26))) { S.seen[pid] = npcDay(g) + 1; campChanged(g); for (const l of g.locals) l.toast(`Discovered: ${P.name}`, 'epic'); if (g.net) g.net.all({ t: 'adv', k: 'camptoast', m: `Discovered: ${P.name}`, kind: 'epic' }); if (P.xp) campXp(g, P.xp, P.name); if (P.onFind) campDo(g, P.onFind); }
  }
  for (const [tid, T] of Object.entries(C.towns)) {
    if (S.seen[tid] || g.dim !== 0) continue;
    if (campParty(g).some(p => Math.hypot(p.x - T.at[0], p.z - T.at[1]) < 34)) { S.seen[tid] = npcDay(g) + 1; campChanged(g); for (const l of g.locals) l.toast(`${T.name}`, 'epic'); if (g.net) g.net.all({ t: 'adv', k: 'camptoast', m: T.name, kind: 'epic' }); if (T.onFind) campDo(g, T.onFind); }
  }
}
// a creature falls: count it for the quests that want it, and note the great ones
{
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const r = baseDie.call(this, src);
    const g = this.game;
    try {
      const C = campDef(g);
      if (C && !g.isGuest) {
        const S = campState(g); S.kills[this.type] = (S.kills[this.type] || 0) + 1;
        for (const [qid, R] of Object.entries(S.quests)) {
          if (R.done || !R.stage) continue;
          const st = C.quests[qid] && C.quests[qid].stages[R.stage], O = st && st.obj;
          if (O && O.kill && [].concat(O.kill).includes(this.type) && (!O.near || Math.hypot(this.x - campPos(C, O.near)[0], this.z - campPos(C, O.near)[1]) < (O.r || 60))) {
            R.n = (R.n || 0) + 1;
            const need = O.n || 1;
            if (need > 1) for (const l of g.locals) l.toast(`${C.quests[qid].title}: ${Math.min(R.n, need)} of ${need}`, '');
          }
        }
        // a campaign boss: its place is cleared
        if (this.campPlace) { S.cleared[this.campPlace] = npcDay(g) + 1; const P = C.places[this.campPlace]; if (P && P.onClear) campDo(g, P.onClear); }
        if (this.dungeon) { const d = dungeonById(g, this.dungeon); if (d && d.place) { S.cleared[d.place] = npcDay(g) + 1; const P = C.places[d.place]; if (P && P.onClear) campDo(g, P.onClear); } }
        if (this.T.campaign && this.T.onDeath) campDo(g, this.T.onDeath);
        campChanged(g);
      }
    } catch (e) { console.warn('campaign die', e); }
    return r;
  };
}

// ---- sites: the places that aren't dungeons, built from a few kinds ------------------------------------------------
// kind: camp, ruin, shrine, grove, tower, cave, standing_stones, manor, bridge, farmstead, tomb, mine
const CAMP_SITE = defStruct({ key: 'camp_site', name: 'a place', reg: 1 << 20, chance: 0, margin: 0, dims: [0], plan: () => null, build: (P, S) => campBuildSite(P, S) });
WorldGen.prototype.campSites = function () {
  if (this.dim !== 0) return [];
  const C = campGenDef(); if (!C) return [];
  if (this._campSites && this._campSitesFor === C.id) return this._campSites;
  const out = [];
  for (const [id, P] of Object.entries(C.places)) {
    if (P.kind === 'dungeon') continue;
    const [x, z] = P.at, R = P.size || (P.kind === 'tower' || P.kind === 'manor' ? 9 : P.kind === 'camp' ? 8 : 7);
    const h = this.column(x, z).h;
    out.push({ k: CAMP_SITE.idx, kind: 'camp_site', site: P.kind, place: id, id: 'cs_' + id, name: P.name, x, z, y: Math.max(h, SEA + 1), R, x0: x - R - 3, x1: x + R + 3, z0: z - R - 3, z1: z + R + 3, seed: hash32(x, z, 777, this.seed), boss: null, P });
  }
  this._campSitesFor = C.id;
  return (this._campSites = out);
};
{
  const baseSNK = WorldGen.prototype.structsNearKind;
  WorldGen.prototype.structsNearKind = function (k, x, z, pad = 0) {
    if (k !== CAMP_SITE.idx) return baseSNK.call(this, k, x, z, pad);
    return this.campSites().filter(S => x >= S.x0 - pad && x <= S.x1 + pad && z >= S.z0 - pad && z <= S.z1 + pad);
  };
}
function campBuildSite(P, S) {
  const { x, z, y, R } = S, kind = S.site, A = S.P || {};
  const pal = A.blocks || {};
  const stone = pal.stone || 'cobblestone', moss = pal.moss || 'mossy_cobblestone', brick = pal.brick || 'stone_bricks', wood = pal.wood || 'planks', log = pal.log || 'log';
  const ground = (gx, gz) => P.ground(gx, gz);
  const clear = (r, h = 6) => { for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (dx * dx + dz * dz > r * r + 1) continue; const gx = x + dx, gz = z + dz, gh = ground(gx, gz); for (let yy = y; yy <= Math.max(gh, y) + h; yy++) P.put(gx, yy, gz, 'air'); for (let yy = Math.min(gh, y) - 1; yy < y; yy++) P.put(gx, yy, gz, yy === y - 1 ? (pal.floor || 'grass') : 'dirt'); } };
  const ring = (r, fn) => { for (let a = 0; a < 64; a++) { const t = a / 64 * TAU; fn(x + Math.round(Math.cos(t) * r), z + Math.round(Math.sin(t) * r)); } };
  if (kind === 'camp') {
    clear(R, 5);
    P.put(x, y, z, 'campfire');
    for (const [dx, dz] of [[4, 0], [-4, 1], [1, 4], [-1, -4]]) { // tents of wool on fences
      const tx = x + dx, tz = z + dz, col = P.pick(['wool', 'brown_wool', 'green_wool', 'gray_wool'].filter(b => B[b] !== undefined), tx, y, tz);
      for (let i = -1; i <= 1; i++) { P.put(tx + i, y, tz - 1, col); P.put(tx + i, y, tz + 1, col); P.put(tx + i, y + 1, tz, col); }
    }
    for (const [dx, dz] of [[2, 2], [-2, -2]]) P.put(x + dx, y, z + dz, 'barrel');
    P.chest(x - 2, y, z + 2, 0, A.loot || 'ruin');
  } else if (kind === 'ruin' || kind === 'tomb') {
    clear(R, 4);
    for (let dz = -R + 1; dz <= R - 1; dz++) for (let dx = -R + 1; dx <= R - 1; dx++) {
      const edge = Math.abs(dx) === R - 1 || Math.abs(dz) === R - 1;
      P.put(x + dx, y - 1, z + dz, P.pick([brick, moss, stone, 'gravel'], x + dx, y, z + dz));
      if (edge) { const hh = Math.floor(P.h(x + dx, 0, z + dz) * 4); for (let k = 0; k < hh; k++) P.put(x + dx, y + k, z + dz, P.pick([brick, moss, 'cracked_stone_bricks'], x + dx, y + k, z + dz)); }
    }
    if (kind === 'tomb') { P.fill(x - 1, y, z - 2, x + 1, y, z + 2, 'stone_bricks'); P.put(x, y + 1, z - 2, 'skull' in B ? 'skull' : 'stone_brick_slab'); }
    P.chest(x + 1, y, z + 1, 2, A.loot || 'ruin');
  } else if (kind === 'shrine' || kind === 'standing_stones') {
    clear(R, 6);
    ring(R - 2, (gx, gz) => { if (P.h(gx, 1, gz) < 0.3) return; const hh = 2 + Math.floor(P.h(gx, 2, gz) * 3); for (let k = 0; k < hh; k++) P.put(gx, y + k, gz, kind === 'shrine' ? brick : P.pick([stone, moss, 'andesite'].filter(b => B[b] !== undefined), gx, y + k, gz)); });
    P.put(x, y, z, kind === 'shrine' ? 'chiseled_stone_bricks' : 'mossy_cobblestone'); P.put(x, y + 1, z, A.altar || 'candle');
    if (A.lectern) P.lectern(x, y, z + 2, 2, A.lectern);
  } else if (kind === 'grove') {
    clear(R, 8);
    ring(R - 1, (gx, gz) => { if (P.h(gx, 3, gz) < 0.82) return; for (let k = 0; k < 5; k++) P.put(gx, y + k, gz, log); for (let dy = 3; dy <= 6; dy++) for (let ox = -2; ox <= 2; ox++) for (let oz = -2; oz <= 2; oz++) if (Math.abs(ox) + Math.abs(oz) + (dy - 4) * (dy - 4) < 5 && !P.get(gx + ox, y + dy, gz + oz)) P.put(gx + ox, y + dy, gz + oz, pal.leaves || 'leaves'); });
    for (let k = 0; k < 18; k++) { const a = P.h(k, 4, 0) * TAU, r = P.h(k, 5, 0) * (R - 2); const gx = x + Math.round(Math.cos(a) * r), gz = z + Math.round(Math.sin(a) * r); P.put(gx, y, gz, P.pick(VFLOWERS.filter(b => B[b] !== undefined), gx, y, gz)); }
    if (A.altar) P.put(x, y, z, A.altar);
  } else if (kind === 'tower') {
    clear(R, 4);
    const H = A.height || 18, r = 4;
    for (let yy = y - 1; yy < y + H; yy++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const d = Math.hypot(dx, dz); if (d > r + 0.3) continue;
      const shell = d > r - 0.8, floorY = (yy - y) % 6 === 5 || yy === y - 1;
      if (shell) P.put(x + dx, yy, z + dz, (yy - y) % 6 === 2 && (dx === 0 || dz === 0) ? 'glass_pane' : P.pick([brick, brick, moss, 'cracked_stone_bricks'], x + dx, yy, z + dz));
      else P.put(x + dx, yy, z + dz, floorY && !(dx === 2 && dz === 2) ? wood : 'air');
    }
    for (let yy = y; yy < y + H - 1; yy++) P.put(x + 2, yy, z + 2, 'ladder', 2);
    P.put(x, y, z - r, 'air'); P.put(x, y + 1, z - r, 'air');
    for (let k = 0; k * 6 < H - 6; k++) { P.chest(x - 2, y + k * 6, z + 1, 1, A.loot || 'tower'); P.put(x, y + k * 6 + 1, z, 'lantern'); }
    if (A.lectern) P.lectern(x - 1, y + Math.max(0, H - 12), z - 1, 2, A.lectern);
  } else if (kind === 'cave') {
    // a mouth in the ground and a short winding cave
    const len = A.length || 26; let cx = x, cy = y, cz = z, a = (A.dir || 0) * Math.PI / 2;
    for (let i = 0; i < len; i++) {
      const rr = 2 + (P.h(i, 9, 0) < 0.3 ? 1 : 0);
      for (let dz = -rr; dz <= rr; dz++) for (let dy = -1; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) if (dx * dx + dy * dy + dz * dz <= rr * rr + 1) P.put(Math.round(cx) + dx, Math.round(cy) + dy, Math.round(cz) + dz, 'air');
      cx += Math.cos(a); cz += Math.sin(a); if (i > 3) cy -= 0.45; a += (P.h(i, 7, 1) - 0.5) * 0.5;
      if (i % 9 === 4) P.put(Math.round(cx), Math.round(cy) - 2, Math.round(cz), 'old_torch' in B ? 'torch' : 'torch');
    }
    P.chest(Math.round(cx), Math.round(cy) - 1, Math.round(cz), 0, A.loot || 'mineshaft');
    S.bossAt = [Math.round(cx), Math.round(cy) - 1, Math.round(cz)];
  } else if (kind === 'manor' || kind === 'farmstead' || kind === 'cabin') {
    clear(R, 9);
    const W = kind === 'manor' ? 6 : 4, D = kind === 'manor' ? 5 : 4, Hh = kind === 'manor' ? 5 : 4;
    for (let yy = y - 1; yy <= y + Hh; yy++) for (let dz = -D; dz <= D; dz++) for (let dx = -W; dx <= W; dx++) {
      const edge = Math.abs(dx) === W || Math.abs(dz) === D;
      if (yy === y - 1) P.put(x + dx, yy, z + dz, kind === 'manor' ? brick : wood);
      else if (yy === y + Hh) P.put(x + dx, yy, z + dz, pal.roof || (kind === 'manor' ? 'dark_oak_planks' in B ? 'dark_oak_planks' : wood : wood));
      else if (edge) P.put(x + dx, yy, z + dz, (Math.abs(dx) === W && Math.abs(dz) === D) ? log : (yy === y + 1 && (dx % 3 === 0) && Math.abs(dz) === D) ? 'glass_pane' : kind === 'manor' && yy === y ? brick : wood);
      else P.put(x + dx, yy, z + dz, 'air');
    }
    P.put(x, y, z - D, 'air'); P.put(x, y + 1, z - D, 'air');
    P.chest(x + W - 1, y, z + D - 1, 3, A.loot || 'ruin'); P.put(x - W + 1, y, z + D - 1, 'crafting_table'); P.put(x, y + Hh - 1, z, 'lantern');
    if (A.lectern) P.lectern(x - W + 1, y, z - D + 1, 1, A.lectern);
  } else if (kind === 'bridge') {
    const L = A.length || 14, ax = A.dir === 1 || A.dir === 3 ? 0 : 1, az = 1 - ax;
    for (let t = -L; t <= L; t++) for (let s = -1; s <= 1; s++) { const gx = x + ax * t + az * s, gz = z + az * t + ax * s; P.put(gx, y, gz, wood); if (Math.abs(s) === 1) P.put(gx, y + 1, gz, 'oak_fence' in B ? 'oak_fence' : 'fence'); for (let yy = y + 2; yy < y + 6; yy++) P.put(gx, yy, gz, 'air'); }
  } else if (kind === 'mine') {
    clear(R, 5);
    for (let yy = y; yy < y + 4; yy++) { P.put(x - 2, yy, z, log); P.put(x + 2, yy, z, log); }
    for (let dx = -2; dx <= 2; dx++) P.put(x + dx, y + 4, z, log);
    for (let t = 0; t < 30; t++) for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy < 3; dy++) P.put(x + dx, y - Math.floor(t / 2) + dy, z + t, 'air');
    P.chest(x + 1, y - 14, z + 29, 0, A.loot || 'mineshaft');
    S.bossAt = [x, y - 14, z + 28];
  } else {
    clear(R, 5); P.put(x, y, z, 'campfire');
  }
  if (A.boss && !S.bossAt) S.bossAt = [x, y, z + 2];
}
// a site's keeper wakes when someone comes close; its fall clears the place
function campSiteTick(g) {
  const C = campDef(g); if (!C || g.isGuest || g.dim !== 0 || !g.world) return;
  const S = campState(g), gen = g.world.gen; if (!gen.campSites) return;
  const ps = g.pawns().filter(p => !p.dead);
  for (const site of gen.campSites()) {
    const P = site.P; if (!P.boss || S.cleared[site.place]) continue;
    if (P.bossIf && !campTest(g, P.bossIf)) continue;
    const at = site.bossAt || [site.x, site.y, site.z + 2];
    const live = g.entities.some(e => e.campPlace === site.place && e.alive && !e.remove);
    if (live) continue;
    const near = ps.some(p => Math.hypot(p.x - at[0], p.z - at[2]) < (P.wake || 14) && Math.abs(p.y - at[1]) < 12);
    if (!near || !MOB_TYPES[P.boss] || !g.world.isLoaded(at[0], at[2])) continue;
    const m = g.addEntity(new Mob(g, P.boss, at[0] + 0.5, at[1], at[2] + 0.5));
    m.campPlace = site.place; m.persistent = true; m.huntT = 60;
    g.burst(at[0] + 0.5, at[1] + 1, at[2] + 0.5, 'smoke', 30, 1.2);
    if (P.minions) for (const [type, n] of P.minions) for (let i = 0; i < n; i++) { const a = Math.random() * TAU; const mm = g.addEntity(new Mob(g, type, at[0] + Math.cos(a) * 3, at[1], at[2] + Math.sin(a) * 3)); mm.persistent = true; mm.huntT = 40; }
    for (const l of g.locals) if (Math.hypot(l.player.x - at[0], l.player.z - at[2]) < 40) l.toast(P.bossLine || `${MOB_TYPES[P.boss].label} appears!`, 'warn');
  }
}

// ---- the people of the story ----------------------------------------------------------------------------------
function campNpcPost(g, C, id, N) {
  if (N.at) { const [x, z] = N.at; return [x + 0.5, null, z + 0.5]; }
  const S = campState(g);
  if (S.follow[id]) return null;
  if (N.town) {
    const v = campTownVillage(g, N.town); if (!v) return null;
    const post = N.post || 'plaza';
    if (Array.isArray(post)) return [v.x + post[0] + 0.5, v.y + 1, v.z + post[1] + 0.5];
    if (post === 'plaza') { const k = (hash32(id.length, id.charCodeAt(0), 3, 9) % 8) / 8 * TAU; return [v.x + Math.cos(k) * 4 + 0.5, v.y + 1, v.z + Math.sin(k) * 4 + 0.5]; }
    if (post === 'board' && v.board) return [v.board[0] - 1.5, v.y + 1, v.board[2] + 1.5];
    const [type, nth] = String(post).split('#');
    const blds = v.blds.filter(b => b.type === type), b = blds[(+nth || 0) % Math.max(1, blds.length)];
    if (b) { const w = b.work ? b.work.at : b.elderAt ? b.elderAt.at : vWorld(b, (b.W - 1) / 2, 1, 2); return [w[0] + 0.5, w[1], w[2] + 0.5]; }
    return [v.x + 2.5, v.y + 1, v.z + 2.5];
  }
  if (N.place) { const P = C.places[N.place]; if (P) { const o = N.offset || [3, 3]; return [P.at[0] + o[0] + 0.5, null, P.at[1] + o[1] + 0.5]; } }
  return null;
}
function campNpcTick(g, dt) {
  const C = campDef(g); if (!C || g.isGuest || g.dim !== 0 || !g.world) return;
  if ((CAMP_RT.npcT -= dt) > 0) return;
  CAMP_RT.npcT = 1;
  const S = campState(g), ps = g.pawns().filter(p => !p.dead);
  let i = 0;
  for (const [id, N] of Object.entries(C.npcs)) {
    i++;
    const ent = CAMP_RT.ents.get(id);
    const want = !S.gone[id] && (!N.if || campTest(g, N.if)) && !(N.until && campTest(g, N.until));
    if (ent && (!ent.alive || ent.remove || !g.entities.includes(ent))) { CAMP_RT.ents.delete(id); if (!ent.alive && N.mortal) S.gone[id] = 1; continue; }
    if (!want) { if (ent) { ent.remove = true; CAMP_RT.ents.delete(id); } continue; }
    if (ent) {
      // gone too far from everyone: let them go (they come back when you do), unless they travel with you
      if (!S.follow[id] && !ps.some(p => Math.hypot(p.x - ent.x, p.z - ent.z) < 120)) { ent.remove = true; CAMP_RT.ents.delete(id); }
      continue;
    }
    let at;
    if (S.follow[id]) { const p = ps[0]; if (!p) continue; at = [p.x + 1.5, p.y, p.z + 1.5]; }
    else at = campNpcPost(g, C, id, N);
    if (!at) continue;
    if (!ps.some(p => Math.hypot(p.x - at[0], p.z - at[2]) < 80)) continue;
    if (!g.world.isLoaded(Math.floor(at[0]), Math.floor(at[2]))) continue;
    if (at[1] == null || g.world.getBlock(Math.floor(at[0]), Math.floor(at[1]), Math.floor(at[2])) && T_SOLID[g.world.getBlock(Math.floor(at[0]), Math.floor(at[1]), Math.floor(at[2]))]) {
      const y = findSafeY(g.world, Math.floor(at[0]), Math.floor(at[2])); if (y == null) continue; at[1] = y;
    }
    const seed = hash32(id.length * 977, id.charCodeAt(0), id.charCodeAt(id.length - 1), 31) % 100000;
    const v = N.town ? campTownVillage(g, N.town) : null;
    const e = new Mob(g, N.guard ? 'village_guard' : 'villager', at[0], at[1], at[2]);
    e.npc = { v: v ? v.id : 'camp', i: 400 + i, n: N.name, j: 'c_' + id, s: seed, p: 0, cid: id };
    e.heldItem = N.held && ITEMS[N.held] ? N.held : null;
    if (N.armor) e.npcArmor = N.armor;
    e.persistent = true; e.campPost = [at[0], at[1], at[2]]; e.kept = false;
    if (N.hp) { e.health = e.maxHealth = N.hp; }
    g.addEntity(e);
    CAMP_RT.ents.set(id, e);
  }
}
// what they do: keep to their post, turn to whoever comes near, and walk with the party when asked
{
  const baseAI = Mob.prototype.controlAI;
  Mob.prototype.controlAI = function (dt, ...rest) {
    const N = this.npc;
    if (!N || !N.cid || !this.game || this.game.isGuest) return baseAI.call(this, dt, ...rest);
    const g = this.game, S = campState(g);
    if (this.holdT > 0) { this.holdT -= dt; const p = this.holdBy && this.holdBy.player; if (p) this.yaw = Math.atan2(-(p.x - this.x), -(p.z - this.z)); this.wanderOn = false; this.goal = null; N.p = (N.p & ~64) | 64; return; }
    N.p &= ~64;
    const ps = g.pawns().filter(p => !p.dead);
    let target = null;
    if (S.follow[N.cid]) {
      let best = null, bd = 1e9; for (const p of ps) { const d = Math.hypot(p.x - this.x, p.z - this.z); if (d < bd) { bd = d; best = p; } }
      if (best && bd > 40) { this.x = best.x + 1; this.z = best.z + 1; this.y = best.y; }
      else if (best && bd > 3.2) target = [best.x, best.y, best.z];
    } else if (this.campPost) {
      const [px, py, pz] = this.campPost, d = Math.hypot(px - this.x, pz - this.z);
      if (d > 2.5) target = [px, py, pz];
    }
    if (target) {
      if (typeof this.npcGo === 'function') { try { this.npcGo(target[0], target[1], target[2], dt); return; } catch (e) { /* fall back */ } }
      const a = Math.atan2(target[0] - this.x, target[2] - this.z); this.yaw = Math.atan2(-(target[0] - this.x), -(target[2] - this.z));
      this.vx = Math.sin(a) * 2.2; this.vz = Math.cos(a) * 2.2; this.walkAmt = 1;
      return;
    }
    this.vx *= 0.6; this.vz *= 0.6; this.walkAmt = 0;
    let near = null, nd = 7; for (const p of ps) { const d = Math.hypot(p.x - this.x, p.z - this.z); if (d < nd) { nd = d; near = p; } }
    if (near) this.yaw = Math.atan2(-(near.x - this.x), -(near.z - this.z));
  };
  // the story's people don't wander off with the villagers' errands
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    if (this.npc && this.npc.cid) { const N = campDef(this.game) && campDef(this.game).npcs[this.npc.cid]; if (!N || !N.mortal) return 0; }
    return baseHurt.call(this, amount, src);
  };
}
// their faces and clothes, from the look the campaign gives them
{
  const basePaint = npcSkinCanvas;
  npcSkinCanvas = function (seed, job) {
    const J = NPC_JOBS[job];
    if (J && J.campaign) {
      for (const C of Object.values(CAMPAIGNS)) { const N = C.npcs[J.campaign]; if (N && N.look && typeof dndPaintSkin === 'function') return dndPaintSkin(Object.assign({ seed }, N.look)); }
    }
    return basePaint(seed, job);
  };
}

// ---- conversations ----------------------------------------------------------------------------------------------
// npc.talk = { start: node | [ { if, node } ... ], nodes: { id: { say, alt: [{ if, say }], opts: [...] , do } } }
// an option: { t, go, if, do, check: { skill | ability | save, dc, pass, fail, adv }, end, shop, once }
{
  const baseHome = NpcTalk.prototype.home;
  NpcTalk.prototype.home = function (text) {
    const N = this.e.npc;
    const C = campDef(this.g);
    if (N && N.cid && C && C.npcs[N.cid]) { if (text) { this.say(text); this.campOpts(this._campNode || 'start'); return; } return this.campStart(); }
    return baseHome.call(this, text);
  };
  NpcTalk.prototype.campStart = function () {
    const C = campDef(this.g), id = this.e.npc.cid, D = C.npcs[id], T = D.talk || {}, S = campState(this.g);
    if (!S.met[id]) { S.met[id] = npcDay(this.g) + 1; campChanged(this.g); }
    // the quests that wanted a word with them
    for (const [qid, R] of Object.entries(S.quests)) { const st = !R.done && C.quests[qid] && C.quests[qid].stages[R.stage]; if (st && st.obj && st.obj.talk === id) { R.talked = R.talked || {}; R.talked[id] = 1; } }
    if (this.g.isGuest && this.g.net) this.g.net.send({ t: 'adv', k: 'campmet', id });
    let start = T.start || 'start';
    if (Array.isArray(start)) { const hit = start.find(s => campTest(this.g, s.if, this.lp)); start = hit ? hit.node : 'start'; }
    this.campNode(start);
  };
  NpcTalk.prototype.campNode = function (nid) {
    const C = campDef(this.g), id = this.e.npc.cid, D = C.npcs[id], T = D.talk || {}, nodes = T.nodes || {};
    const node = nodes[nid] || nodes.start || { say: D.greet || 'Well met, traveller.', opts: [] };
    this._campNode = nid;
    let text = node.say;
    if (node.alt) { const a = node.alt.find(x => campTest(this.g, x.if, this.lp)); if (a) text = a.say; }
    if (Array.isArray(text)) text = text[Math.floor(Math.random() * text.length)];
    if (node.do) campDo(this.g, node.do, this.lp, { npc: id });
    this.say(campFill(this, text || '…'));
    this.campOpts(nid);
  };
  NpcTalk.prototype.campOpts = function (nid) {
    const C = campDef(this.g), id = this.e.npc.cid, D = C.npcs[id], T = D.talk || {}, nodes = T.nodes || {};
    const node = nodes[nid] || {};
    const S = campState(this.g), used = S.flags;
    const opts = [];
    for (const [k, o] of (node.opts || []).entries()) {
      if (o.if && !campTest(this.g, o.if, this.lp)) continue;
      const onceKey = '_o_' + id + '_' + nid + '_' + k;
      if (o.once && used[onceKey]) continue;
      let label = esc(campFill(this, o.check ? String(o.t).replace(/^\[[^\]]+\]\s*/, '') : o.t));
      if (o.check) { const ck = o.check, nm = ck.skill ? DND_SKILLS[ck.skill].name : ck.save ? DND_ABILITY_NAMES[ck.save] + ' save' : DND_ABILITY_NAMES[ck.ability]; label = `<span class="nt-check">[${nm}${ck.showDc === false ? '' : ' DC ' + ck.dc}]</span> ` + label; }
      opts.push([label, () => {
        if (o.once) { used[onceKey] = 1; campChanged(this.g); }
        if (o.check) { this.campCheck(o); return; }
        if (o.do) campDo(this.g, o.do, this.lp, { npc: id });
        if (o.shop) { this.job = o.shop === true ? 'c_' + id : o.shop; this.shop(); return; }
        if (o.end || (!o.go && !o.reply)) { if (o.reply) { this.say(campFill(this, o.reply)); this.options([['Goodbye', () => this.close()]]); return; } this.close(); return; }
        if (o.reply) { this.say(campFill(this, o.reply)); this._campNode = o.go; this.campOpts(o.go); return; }
        this.campNode(o.go);
      }]);
    }
    if (!opts.length || node.bye !== false) {
      const has = opts.some(([l]) => /Goodbye|Farewell|Leave/.test(l));
      if (!has) opts.push([nid === 'start' || !T.nodes || !T.nodes.start ? 'Farewell' : 'Something else…', () => nid === 'start' ? this.close() : this.campNode(T.back || 'start')]);
      if (nid !== 'start' && !has && T.nodes && T.nodes.start) opts.push(['Farewell', () => this.close()]);
    }
    this.options(opts);
  };
  NpcTalk.prototype.campCheck = function (o) {
    const ck = o.check, lp = this.lp, c = lp.player.stats && lp.player.stats.dnd;
    let mod = 0, label = '';
    if (c) {
      dndDerive(c, lp.player.inv);
      if (ck.skill) { mod = c.d.skills[ck.skill]; label = DND_SKILLS[ck.skill].name; }
      else if (ck.save) { mod = c.d.saves[ck.save]; label = DND_ABILITY_NAMES[ck.save] + ' saving throw'; }
      else if (ck.ability) { mod = c.d.mods[ck.ability]; label = DND_ABILITY_NAMES[ck.ability] + ' check'; }
    } else label = ck.skill ? DND_SKILLS[ck.skill].name : 'Check';
    const bonus = dndCheckBonus(lp, true);
    const opts = this.el.querySelector('.nt-opts'); if (opts) opts.innerHTML = '';
    dndRollShow(lp.el, { label: label + ' check'.replace(/ check check$/, ' check'), mod, dc: ck.dc, adv: ck.adv || (c && c.conds.advNext), dis: ck.dis, lucky: c && DND_SPECIES[c.species].lucky, bonus }).then((res) => {
      if (!this.el.isConnected) return;
      const ok = res.ok;
      const branch = ok ? (ck.pass || o.go) : (ck.fail || o.go);
      if (ok && ck.passDo) campDo(this.g, ck.passDo, lp, { npc: this.e.npc.cid });
      if (!ok && ck.failDo) campDo(this.g, ck.failDo, lp, { npc: this.e.npc.cid });
      if (o.do) campDo(this.g, o.do, lp, { npc: this.e.npc.cid });
      if (ok && ck.xp) campXp(this.g, ck.xp, label);
      if (branch) this.campNode(branch); else this.close();
    });
  };
}
// {p} the speaker's name, {cls} their class, {species}, {v} the town
function campFill(talk, text) {
  const c = talk.lp.player.stats && talk.lp.player.stats.dnd;
  return String(text).replace(/\{p\}/g, c ? c.name : (talk.lp.name || 'friend')).replace(/\{cls\}/g, c ? DND_CLASSES[c.cls].name.toLowerCase() : 'adventurer').replace(/\{species\}/g, c ? DND_SPECIES[c.species].name.toLowerCase() : 'traveller').replace(/\{v\}/g, talk.v ? talk.v.name : 'here');
}

// ---- narration: the storyteller's voice, over everyone's screens -----------------------------------------------------
function campNarrate(g, pages, title, then) {
  if (!pages || !pages.length) { if (then) then(); return; }
  const host = document.getElementById('app') || document.body;
  const old = document.querySelector('.camp-narr'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'camp-narr';
  el.innerHTML = `<div class="camp-narr-card"><div class="camp-narr-title"></div><div class="camp-narr-text"></div><div class="camp-narr-foot"><span class="camp-narr-n"></span><button class="btn primary camp-narr-next">Continue</button></div></div>`;
  host.appendChild(el);
  let i = 0;
  const T = el.querySelector('.camp-narr-text'), N = el.querySelector('.camp-narr-n'), btn = el.querySelector('.camp-narr-next');
  const show = () => {
    const pg = pages[i], txt = typeof pg === 'string' ? pg : pg.text, ttl = typeof pg === 'string' ? title : (pg.title || title);
    el.querySelector('.camp-narr-title').textContent = ttl || '';
    T.innerHTML = String(txt).split(/\n\n+/).map(p => `<p>${esc(p)}</p>`).join('');
    T.classList.remove('in'); void T.offsetWidth; T.classList.add('in');
    N.textContent = pages.length > 1 ? `${i + 1} / ${pages.length}` : '';
    btn.textContent = i < pages.length - 1 ? 'Continue' : 'Begin';
  };
  const next = () => { i++; if (i >= pages.length) { finish(); return; } show(); };
  const finish = () => { el.remove(); window.removeEventListener('keydown', key, true); CAMP_RT.narrating = null; if (then) then(); };
  const key = (e) => { if (['Enter', 'Space', 'KeyE', 'Escape'].includes(e.code)) { e.preventDefault(); e.stopPropagation(); if (e.code === 'Escape') finish(); else next(); } };
  btn.onclick = () => { if (g.sfx) g.sfx.play('click'); next(); };
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  window.addEventListener('keydown', key, true);
  CAMP_RT.narrating = { next, finish, el };
  if (g.input && g.input.exitLock) try { g.input.exitLock(); } catch (e) { /* not locked */ }
  else if (document.exitPointerLock) try { document.exitPointerLock(); } catch (e) { /* not locked */ }
  show();
}

// ---- the start and the end -----------------------------------------------------------------------------------------
function campBegin(g) {
  const C = campDef(g), S = campState(g); if (!C || S.started) return;
  S.started = Date.now();
  campChanged(g);
  const go = () => { if (C.onStart) campDo(g, C.onStart, g.locals[0]); if (C.firstQuest) campQuestStart(g, C.firstQuest, g.locals[0]); };
  if (C.intro && C.intro.length) campNarrate(g, C.intro, C.title, go); else go();
  if (g.net) g.net.all({ t: 'adv', k: 'campintro' });
}
function campEnd(g, how) {
  const C = campDef(g), S = campState(g); if (!C || S.ended) return;
  S.ended = Date.now(); campChanged(g);
  const pages = (C.endings && (C.endings[how] || C.endings.default)) || C.ending || [{ title: 'The End', text: 'Your tale is told.' }];
  const credits = { title: C.title, text: `${C.credits || 'A campaign for The Shadowbloom of Eldenwood.'}\n\nThe world is yours to keep exploring: the towns still stand, and their people still have work for brave hands.` };
  campNarrate(g, [...pages, credits], C.title);
  if (g.net) g.net.all({ t: 'adv', k: 'campend', how });
}

// ---- keeping everyone in step (the host's story is the story) --------------------------------------------------------
function campChanged(g) {
  if (!g || g.isGuest || !g.net || !g.meta || !g.meta.camp) return;
  clearTimeout(CAMP_RT.syncT);
  CAMP_RT.syncT = setTimeout(() => { try { g.net.all({ t: 'adv', k: 'camp', c: g.meta.campaign, s: g.meta.camp }); } catch (e) { /* closed */ } }, 120);
}
{
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && typeof m.k === 'string' && m.k.startsWith('camp')) {
      const g = this.g, pawn = this.remotes && this.remotes.get('g' + from + ':' + (m.li || 0));
      if (m.k === 'campfx') { const L = { player: pawn ? pawn.player : null, index: m.li || 0, toast: (t, k) => pawn && pawn.toast(t, k), give: (s) => pawn ? pawn.give(s) : s.n, name: pawn ? pawn.name : 'Player', el: null }; campDo(g, m.fx, null, { npc: m.npc }); }
      else if (m.k === 'campmet') { const S = campState(g); if (!S.met[m.id]) { S.met[m.id] = npcDay(g) + 1; } const C = campDef(g); if (C) for (const [qid, R] of Object.entries(S.quests)) { const st = !R.done && C.quests[qid] && C.quests[qid].stages[R.stage]; if (st && st.obj && st.obj.talk === m.id) { R.talked = R.talked || {}; R.talked[m.id] = 1; } } campChanged(g); }
      else if (m.k === 'campread') { const S = campState(g); S.read = S.read || {}; S.read[m.id] = 1; campChanged(g); }
      return;
    }
    return baseHost.call(this, from, m);
  };
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv' && typeof m.k === 'string' && m.k.startsWith('camp')) {
      const g = this.g;
      if (m.k === 'camp') { g.meta.campaign = m.c; g.meta.camp = m.s; }
      else if (m.k === 'camptoast') for (const l of g.locals) l.toast(m.m, m.kind || '');
      else if (m.k === 'campxp') for (const l of g.locals) if (m.li == null || (l.index || 0) === m.li) dndAwardXp(l, m.n, m.why);
      else if (m.k === 'campintro') { const C = campDef(g); if (C && C.intro && !CAMP_RT.introSeen) { CAMP_RT.introSeen = true; campNarrate(g, C.intro, C.title); } }
      else if (m.k === 'campend') { const C = campDef(g); if (C) { const pages = (C.endings && (C.endings[m.how] || C.endings.default)) || C.ending || []; campNarrate(g, pages, C.title); } }
      else if (m.k === 'camptp') for (const l of g.locals) { const p = l.player, at = m.at, h = g.world.gen.column(Math.floor(at[0]), Math.floor(at[1])).h; p.x = at[0] + 0.5; p.z = at[1] + 0.5; p.y = Math.max(h, SEA) + 1.2; p.vx = p.vy = p.vz = 0; }
      return;
    }
    return baseGuest.call(this, m);
  };
  // a guest joining hears the story so far (and which campaign shapes the land) before the land is made
  const baseWelcome = Net.prototype.welcome;
  if (baseWelcome) Net.prototype.welcome = function (...a) {
    const r = baseWelcome.apply(this, a);
    try { const g = this.g; if (g.meta && g.meta.campaign) setTimeout(() => this.all({ t: 'adv', k: 'camp', c: g.meta.campaign, s: campState(g) }), 50); } catch (e) { /* later */ }
    return r;
  };
}

// ---- the tick ----------------------------------------------------------------------------------------------------------
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) {
    try {
      if (this.state === 'playing' && campDef(this) && !this._pass) {
        if (!this.isGuest) {
          const S = campState(this);
          if (!S.started && this.locals.length && this.locals.every(l => !l.creatorUI && (!dndOn(this) || dndOf(l.player) || l.serverPawn)) && (this.time || 0) > 1.5) campBegin(this);
          campNpcTick(this, dt);
          if ((CAMP_RT.tickT -= dt) <= 0) { CAMP_RT.tickT = 1; campQuestTick(this); campSiteTick(this); }
        }
        if ((CAMP_RT.hudT -= dt) <= 0) { CAMP_RT.hudT = 1.5; for (const l of this.locals) questHud(l); }
      }
    } catch (e) { if (!CAMP_RT.warned) { CAMP_RT.warned = true; console.warn('campaign', e); } }
    return baseUpd.call(this, dt);
  };
  // reading a letter counts
  const baseBook = BookUI;
  BookUI = function (lp, key, o) {
    const g = lp.g, C = campDef(g);
    if (C && C.letters[key]) { const S = campState(g); S.read = S.read || {}; if (!S.read[key]) { S.read[key] = 1; if (g.isGuest && g.net) g.net.send({ t: 'adv', k: 'campread', id: key }); campChanged(g); } }
    return new baseBook(lp, key, o);
  };
  BookUI.prototype = baseBook.prototype;
}

// ---- the story in the journal, the quest tracker and the map -----------------------------------------------------------
function campQuestRows(g) {
  const C = campDef(g), S = campState(g); if (!C) return [];
  const rows = [];
  for (const [qid, Q] of Object.entries(C.quests)) {
    const R = S.quests[qid]; if (!R) continue;
    const st = R.stage && Q.stages[R.stage];
    let goal = st ? (st.goal || st.text) : Q.summary || '';
    if (st && st.obj && st.obj.kill && (st.obj.n || 1) > 1) goal += ` (${Math.min(R.n || 0, st.obj.n)}/${st.obj.n})`;
    rows.push({ id: qid, Q, R, st, title: Q.title, goal, main: !!Q.main, done: !!R.done, failed: !!R.failed, order: Q.order ?? 99 });
  }
  rows.sort((a, b) => (a.done - b.done) || (b.main - a.main) || (a.order - b.order));
  return rows;
}
{
  const baseHud = questHud;
  questHud = function (lp) {
    baseHud(lp);
    const g = lp.g; if (!campDef(g) || !lp.el) return;
    const rows = campQuestRows(g).filter(r => !r.done).slice(0, 3);
    let el = lp.el.querySelector('.quest-track');
    if (!rows.length) { if (el) el.querySelectorAll('.qt.camp').forEach(x => x.remove()); return; }
    if (!el) { el = document.createElement('div'); el.className = 'quest-track'; lp.el.appendChild(el); }
    el.querySelectorAll('.qt.main:not(.camp)').forEach(x => x.remove());
    const html = rows.map(r => `<div class="qt camp${r.main ? ' main' : ''}"><b>${esc(r.title)}</b><span>${esc(r.goal)}</span></div>`).join('');
    const box = el.querySelector('.qt-camp-box');
    if (box) { if (box.innerHTML !== html) box.innerHTML = html; }
    else el.insertAdjacentHTML('afterbegin', `<div class="qt-camp-box">${html}</div>`);
  };
  // the journal's chapters are the campaign's quests
  const baseStory = storyOf;
  storyOf = function (lp) {
    const g = lp.g, C = campDef(g);
    if (!C) {
      // free play: the sandbox's own milestones, without the old watcher story
      const r = baseStory(lp);
      r.ch = r.ch.filter(c => !/Tear in the Square|The Keepers|The Gateway|His Realm|The Seal/.test(c.t));
      r.cur = r.ch.find(c => !c.done && !c.side && !c.epi) || r.ch.find(c => !c.done && c.side) || r.ch.find(c => !c.done) || null;
      return r;
    }
    const ch = campQuestRows(g).map(r => ({ t: r.title, goal: r.goal, hint: r.st ? (r.st.hint || r.st.text || '') : '', done: r.done, side: !r.main }));
    const cur = ch.find(c => !c.done && !c.side) || ch.find(c => !c.done) || null;
    return { ch, cur };
  };
  const baseMarkers = mapMarkers;
  mapMarkers = function (g, m, lp) {
    const out = baseMarkers(g, m, lp);
    const C = campDef(g); if (!C || m.dim !== 0) return out;
    const s = 1 << m.scale, S = campState(g);
    const add = (at, label, cell) => { if (!at) return; const u = (at[0] - m.x0) / s, v = (at[1] - m.z0) / s; if (u < 0 || v < 0 || u > MAP_N || v > MAP_N) return; out.push({ cell, u, v, rot: 0, label }); };
    for (const r of campQuestRows(g)) if (!r.done && r.st) { const at = r.st.at ? campPos(C, r.st.at) : r.st.obj && (r.st.obj.reach || r.st.obj.clear || r.st.obj.talk) ? campPos(C, r.st.obj.reach || r.st.obj.clear || r.st.obj.talk) : null; add(at, r.title + ': ' + r.goal, 13); }
    for (const [tid, T] of Object.entries(C.towns)) if (S.seen[tid] || T.known) add(T.at, T.name, 13);
    for (const [pid, P] of Object.entries(C.places)) if (S.seen[pid] || P.known) add(P.at, P.name, 13);
    return out;
  };
}

// the journal: the tale so far, the people met, letters, places
Object.assign(LocalPlayer.prototype, {
  openCampJournal(tab) {
    const g = this.g, C = campDef(g), S = campState(g);
    if (this.journalEl) this.closeJournal();
    const el = this.journalEl = document.createElement('div');
    el.className = 'skills-view journal-view camp-journal';
    tab = tab || this._jTab || 'quests'; this._jTab = tab;
    const c = this.player.stats && this.player.stats.dnd;
    const rows = campQuestRows(g);
    let body = '';
    if (tab === 'quests') {
      body = rows.length ? rows.map(r => {
        const Q = r.Q, passed = (r.R.passed || []).map(k => Q.stages[k]).filter(Boolean);
        return `<div class="jn-ch ${r.done ? 'done' : r.main ? 'cur' : ''}${r.main ? '' : ' side'}"><div class="jn-t"><span class="jn-mark">${r.failed ? '✗' : r.done ? '✓' : r.main ? '★' : '·'}</span>${esc(r.title)}${r.main ? '' : ' <i>(side quest)</i>'}</div>
          ${!r.done && r.st ? `<div class="jn-g">${esc(r.goal)}</div>${r.st.text && r.st.text !== r.goal ? `<div class="jn-h">${esc(r.st.text)}</div>` : ''}${r.st.hint ? `<div class="jn-h">${esc(r.st.hint)}</div>` : ''}` : ''}
          ${passed.length ? `<div class="jn-past">${passed.map(p => `<div>✓ ${esc(p.goal || p.text)}</div>`).join('')}</div>` : ''}</div>`;
      }).join('') : `<p class="jn-empty">Nothing yet. ${esc(C.hint || 'Speak with the people around you.')}</p>`;
    } else if (tab === 'people') {
      const met = Object.keys(S.met).filter(k => C.npcs[k]);
      body = met.length ? met.map(k => { const N = C.npcs[k]; return `<div class="jn-person"><b>${esc(N.name)}</b> <span>${esc(N.title || '')}${N.town && C.towns[N.town] ? ' · ' + esc(C.towns[N.town].name) : ''}</span>${N.about ? `<div class="jn-h">${esc(N.about)}</div>` : ''}</div>`; }).join('') : '<p class="jn-empty">You haven\'t met anyone of note yet.</p>';
    } else if (tab === 'letters') {
      body = S.letters.length ? S.letters.map(k => `<button class="btn jn-letter" data-letter="${esc(k)}">✉ ${esc((C.letters[k] || {}).title || k)}</button>`).join('') : '<p class="jn-empty">No letters.</p>';
    } else if (tab === 'places') {
      const list = [...Object.entries(C.towns).filter(([k]) => S.seen[k]).map(([k, T]) => [T.name, T.desc]), ...Object.entries(C.places).filter(([k]) => S.seen[k]).map(([k, P]) => [P.name + (S.cleared[k] ? ' ✓' : ''), P.desc])];
      body = list.length ? list.map(([n, d]) => `<div class="jn-person"><b>${esc(n)}</b>${d ? `<div class="jn-h">${esc(d)}</div>` : ''}</div>`).join('') : '<p class="jn-empty">Nowhere of note yet.</p>';
    } else if (tab === 'log') {
      body = S.log.length ? S.log.slice().reverse().map(e => `<div class="jn-r"><span>Day ${e.d + 1}</span><b>${esc(e.t)}</b></div>`).join('') : '<p class="jn-empty">Nothing written yet.</p>';
    }
    const tabs = [['quests', 'Quests'], ['people', 'People'], ['places', 'Places'], ['letters', 'Letters'], ['log', 'Log']];
    el.innerHTML = `<div class="sk-card jn-card"><div class="sk-head"><span class="sk-title">${esc(C.title)}</span><span class="sk-total">${c ? esc(dndSummary(c)) : esc(this.name)}</span></div>
      <div class="jn-tabs">${tabs.map(([k, n]) => `<button class="btn tiny${k === tab ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
      <div class="jn-body">${body}</div><div class="sk-hint">J to close · C for your character sheet</div></div>`;
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target === el) { this.closeJournal(); return; }
      const t = e.target.closest('[data-tab]'); if (t) { this.openCampJournal(t.dataset.tab); return; }
      const L = e.target.closest('[data-letter]'); if (L) { this.closeJournal(); new BookUI(this, L.dataset.letter); }
    });
    this.el.appendChild(el);
    this.g.sfx.play('map_paper');
  },
});
{
  const baseOpen = LocalPlayer.prototype.openJournal;
  LocalPlayer.prototype.openJournal = function () { if (campDef(this.g)) return this.openCampJournal(); return baseOpen.call(this); };
}

PV.debug.camp = {
  state: () => GAME.meta && GAME.meta.camp, def: () => campDef(GAME), begin: () => campBegin(GAME), stage: (q, s) => campQuestStage(GAME, q, s, GAME.locals[0]),
  start: (q) => campQuestStart(GAME, q, GAME.locals[0]), complete: (q) => campQuestComplete(GAME, q, GAME.locals[0]), flag: (f) => campDo(GAME, { flag: f }), tick: () => { campQuestTick(GAME); campSiteTick(GAME); },
  npcs: () => [...CAMP_RT.ents.entries()].map(([k, e]) => [k, +e.x.toFixed(1), +e.y.toFixed(1), +e.z.toFixed(1)]), town: (t) => { const v = campTownVillage(GAME, t); return v && { id: v.id, name: v.name, x: v.x, z: v.z, blds: v.blds.map(b => b.type) }; },
  dungeon: (p) => { const d = campDungeon(GAME, p); return d && { id: d.id, name: d.name, ent: d.ent, boss: d.boss, place: d.place }; },
  do: (fx) => campDo(GAME, fx, GAME.locals[0]), pos: (r) => campPos(campDef(GAME), r),
};

// handles for automated play-tests
try { window.__dnd = { dndDerive, dndCast, dndOf, dndAttack, dndWeaponOf, dndNewChar, dndApplyChar, dndAwardXp, dndDoRest, dndPaintSkin, dndSkinURL, DND_CLASSES, DND_SPECIES, DND_SPELLS, CAMP_RT, CAMPAIGNS, campState, campDo, Mob, NpcTalk, findSafeY, MOB_TYPES, ITEMS, mkStack, DndCreator, camp: PV.debug.camp }; } catch (e) { console.warn('dnd debug', e); }
try { window.__dnd_use_sig = (lp) => dndUseSignature(lp); window.__dnd_use_racial = (lp) => dndUseRacial(lp); window.__dnd_end_conc = (lp) => dndEndConc(lp); } catch (e) { /* no window */ }
