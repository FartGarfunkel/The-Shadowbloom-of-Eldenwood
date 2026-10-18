// ---------------------------------------------------------------------------
// game/crime.js — (alpha 8) crime in town, the way Skyrim does it.
//
// Take what isn't yours from a house, a shop or a farm in a town (out of its chests and barrels, or by breaking it
// out of the walls), and if anyone sees, the town remembers: a bounty. The nearest guard comes for you. Not with his
// sword: he stops you and says his piece. Pay the fine and hand back what you took, talk your way out of it, or own up
// that you can't pay and lose what you took and what gold you have. Refuse, walk off, or do it a third time while they
// still remember, and the guards come with steel.
//
// Nobody sees, nobody knows: a house with no one in it, a dark corner, a good Stealth roll while you sneak. What
// belongs to you (your own house, what you built) is yours to take, and so are the story's own things.
// ---------------------------------------------------------------------------
const CRIME = { book: new Map(), t: 0 };
const CRIME_MEMORY = 600;          // seconds of game time a town remembers your strikes
function crimeRec(who, vid) {
  const k = (who.name || 'p') + '|' + vid;
  let o = CRIME.book.get(k);
  if (!o) CRIME.book.set(k, o = { bounty: 0, items: [], strikes: 0, lastT: -1e9, walked: 0 });
  return o;
}
// the town building (not your own) a spot is in, if any
function crimeTownAt(g, x, y, z) {
  if (g.dim !== 0 || !g.world || typeof villageAtPos !== 'function') return null;
  const v = villageAtPos(g, x, z, 0); if (!v || !v.blds) return null;
  const b = v.blds.find(b => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && (b.y == null || y >= b.y - 2));
  return b ? { v, b } : null;
}
// what something is worth, in gold (roughly: the tabletop's prices where they have them)
function crimeValue(id, n) {
  const d = itemDef(id); if (!d) return 0;
  const R = { common: 5, uncommon: 50, rare: 250, very_rare: 1000, legendary: 4000 };
  let v = d.cost != null ? d.cost : (d.dndGear && d.dndGear.cost) != null ? d.dndGear.cost : d.rarity && R[d.rarity] ? R[d.rarity] : null;
  if (v == null) v = id === 'gold_coin' ? 1 : id === 'silver_coin' ? 0.1 : /emerald|diamond|ruby|sapphire/.test(id) ? 5 : d.armor || d.tool || d.weapon ? 6 : d.food ? 0.4 : 0.25;
  return v * n;
}
// who sees it happen: townsfolk and guards of that town, awake, close enough, looking, with nothing in the way
function crimeWitnesses(g, who, v, x, y, z) {
  const p = who.player || who, sneak = !!p.sneaking, R = sneak ? 8 : 16, out = [];
  for (const e of g.entities) {
    if (!e.npc || !e.alive || e.remove || e.npc.v !== v.id || (typeof NPC_P !== 'undefined' && (e.npc.p & NPC_P.sleep))) continue;
    const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz);
    if (d > R || Math.abs(p.y - e.y) > 6) continue;
    if (d > 3.5) { const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw); if ((dx * fx + dz * fz) / (d || 1) < -0.2) continue; }   // behind them
    // a clear line from their eyes to yours
    const ex = e.x, ey = e.y + 1.6, ez = e.z, tx = p.x, ty = p.y + 1.4, tz = p.z, L = Math.hypot(tx - ex, ty - ey, tz - ez);
    let clear = true;
    for (let t = 0.7; t < L - 0.5; t += 0.5) { const id = g.world.getBlock(Math.floor(ex + (tx - ex) * t / L), Math.floor(ey + (ty - ey) * t / L), Math.floor(ez + (tz - ez) * t / L)); if (T_OPAQUE[id]) { clear = false; break; } }
    if (clear) out.push(e);
  }
  return out;
}
function crimeGuardsOf(g, v) { return g.entities.filter(e => e.npc && e.alive && !e.remove && e.T && e.T.guard && e.npc.v === v.id); }
// the guards draw steel
function crimeHostile(g, lp, v, why) {
  const o = crimeRec(lp, v.id);
  for (const d of g.entities) if (d.npc && d.alive && d.T && (d.T.guard || d.T.golem) && d.npc.v === v.id && Math.hypot(d.x - lp.player.x, d.z - lp.player.z) < 60) { d.foe = lp; d.foeT = 45; d.confront = null; d.crimeOf = null; }
  if (typeof npcRep === 'function') npcRep(g, lp, v.id, -8);
  o.walked = 0;
  if (lp.npcUI && lp.npcUI.close) lp.npcUI.close();
  lp.toast(why || 'The guards are coming for you!', 'warn');
}
// a guard comes over to have a word about it
function crimeSendGuard(g, lp, v) {
  const P = lp.player, gs = crimeGuardsOf(g, v).filter(e => !e.foe && Math.hypot(e.x - P.x, e.z - P.z) < 64).sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z));
  const e = gs[0]; if (!e) return false;
  e.confront = lp; e.confrontT = 45; e.confrontSaid = false; e.confrontVictim = null; e.crimeOf = lp; e.foe = null;
  return true;
}
// it happened: if anyone saw, it's a crime
function crimeCommit(g, lp, where, kind, items) {
  if (g.isGuest || g.creative || !lp || !(lp instanceof LocalPlayer)) return;
  const { v } = where, P = lp.player;
  const W = crimeWitnesses(g, lp, v, P.x, P.y, P.z);
  if (!W.length) return;
  if (P.sneaking && typeof dndCheck === 'function' && dndCheck(lp, 'stealth', 10 + 2 * W.length, 'Stealth (unseen?)').ok) return;
  const o = crimeRec(lp, v.id);
  if (g.time - o.lastT > CRIME_MEMORY) o.strikes = 0;
  // one spree is one strike: more taken while a guard is already on his way (or within a few seconds) adds to the
  // bounty, not to the count that ends in swords
  const spree = g.time - o.lastT < 15 || g.entities.some(e => e.crimeOf === lp);
  o.lastT = g.time;
  const worth = items.reduce((s, [id, n]) => s + crimeValue(id, n), 0) + (kind === 'vandal' ? 1 : 0);
  o.bounty += Math.max(kind === 'vandal' ? 3 : 8, Math.round(worth * 1.5));
  for (const [id, n] of items) { const it = o.items.find(q => q[0] === id); if (it) it[1] += n; else o.items.push([id, n]); }
  if (!spree || !o.strikes) o.strikes++;
  // the one who saw it calls out
  const w0 = W[0];
  if (w0 && !w0.T.guard && typeof babble === 'function') babble(g.sfx, 'Thief!', npcVoice(w0.npc.s), { vol: 0.6 });
  if (o.strikes >= 3) { crimeHostile(g, lp, v, `Again?! "That's it, thief!" The guards of ${v.name} draw their swords.`); return; }
  if (spree && g.entities.some(e => e.crimeOf === lp)) { lp.toast(`Seen again. The fine grows: ${o.bounty} gold.`, 'warn'); return; }
  if (crimeSendGuard(g, lp, v)) lp.toast(kind === 'vandal' ? `${w0.npc.n} saw you. A guard is coming.` : `"Thief!" ${w0.npc.n} saw you take it. A guard is coming.`, 'warn');
  else lp.toast(`${w0.npc.n} saw you. ${v.name} will remember (a bounty of ${o.bounty} gold).`, 'warn');
}
// pay up: the fine, and what you took (whatever of it you still have)
function crimeConfiscate(lp, o) {
  const inv = lp.player.inv; let back = 0;
  for (const [id, n] of o.items) { const k = Math.min(n, inv.count(id)); if (k > 0) { inv.remove(id, k); back += k; } }
  return back;
}
function crimeClear(g, lp, vid) {
  const o = crimeRec(lp, vid); o.bounty = 0; o.items = []; o.walked = 0;
  for (const e of g.entities) if (e.crimeOf === lp) { e.crimeOf = null; e.confront = null; e.goal = null; }
}

// ---- the guard's word -----------------------------------------------------------------------------------------------
{
  const baseConfront = NpcTalk.prototype.confront;
  NpcTalk.prototype.confront = function () {
    const e = this.e, g = this.g, lp = this.lp, v = this.v;
    const o = v && CRIME.book.get((lp.name || 'p') + '|' + v.id);
    if (!v || !o || o.bounty <= 0 || e.crimeOf !== lp) return baseConfront.call(this);
    this.crimeTalk = true;
    const fine = o.bounty, gold = lp.player.inv.count('gold_coin');
    const opener = o.strikes >= 2
      ? `You again! I warned you. ${fine} gold, and everything you took, right now. Do it once more and we're done talking.`
      : o.walked ? `Don't you walk away from me. ${fine} gold and the stolen goods, or you answer to my sword.`
        : `Stop right there, criminal! You've broken the law of ${v.name}. Pay the fine, ${fine} gold, and hand over what you took. Or it's the sword.`;
    this.say(opener);
    const done = (line) => { this.crimeTalk = false; this.say(line); this.options([['…', () => this.close()]]); };
    const opts = [];
    if (gold >= fine) opts.push([`Pay the fine (${fine} gold) and hand it over.`, () => {
      lp.player.inv.remove('gold_coin', fine); const back = crimeConfiscate(lp, o); crimeClear(g, lp, v.id);
      if (typeof npcRep === 'function') npcRep(g, lp, v.id, -2);
      g.sfx.play('coins' in (typeof SND_FX !== 'undefined' ? SND_FX : {}) ? 'coins' : 'click');
      done(back ? 'Good. The goods go back to their owners. Keep your hands to yourself in ' + v.name + '.' : 'Good. Now keep your hands to yourself.');
    }]);
    if (!o.talked) opts.push(['[Persuasion] A misunderstanding! I was going to put it back.', () => {
      o.talked = true;
      const r = typeof dndCheck === 'function' ? dndCheck(lp, 'persuasion', 14 + 2 * (o.strikes - 1), 'Persuasion') : { ok: false };
      if (r.ok) { crimeConfiscate(lp, o); crimeClear(g, lp, v.id); done('…Fine. I\'ll take that back to its owner, and we\'ll say no more about it. This once.'); }
      else { this.say('Nice try. The fine, and the goods. Now.'); this.options(opts.filter(q => !/Persuasion/.test(q[0]))); }
    }]);
    if (gold < fine) opts.push([`I can't pay that. (lose what you took, and all ${gold} gold you carry)`, () => {
      if (gold > 0) lp.player.inv.remove('gold_coin', gold);
      crimeConfiscate(lp, o); crimeClear(g, lp, v.id);
      if (typeof npcRep === 'function') npcRep(g, lp, v.id, -6);
      done('Then you\'ll hand over what you stole, and every coin on you. Get out of my sight.');
    }]);
    opts.push(['Never. (resist)', () => { this.crimeTalk = false; crimeHostile(g, lp, v, '"Then you\'ll pay in blood!" The guards attack!'); }]);
    this.options(opts);
  };
  // walking off mid-sentence: he comes after you once; the second time, steel
  const baseClose = NpcTalk.prototype.close;
  NpcTalk.prototype.close = function () {
    const r = baseClose.call(this);
    try {
      if (this.crimeTalk && this.v) {
        this.crimeTalk = false;
        const g = this.g, lp = this.lp, o = crimeRec(lp, this.v.id);
        if (o.bounty > 0) {
          o.walked++;
          if (o.walked >= 2) crimeHostile(g, lp, this.v, '"Resisting arrest, then!" The guards attack!');
          else { const e = this.e; e.confront = lp; e.confrontT = 45; e.confrontSaid = false; e.crimeOf = lp; lp.toast('The guard follows you: "I wasn\'t finished."', 'warn'); }
        }
      }
    } catch (err) { console.warn('crime', err); }
    return r;
  };
}

// a guard come to arrest you waits while you're busy (in a chest, a menu) rather than shouting once and standing there
{
  const baseConf = npcConfront;
  npcConfront = function (e, dt) {
    const who = e.confront;
    // coming from across town (the assault code only walks over from close by)
    if (e.crimeOf && who === e.crimeOf && who.player && !who.player.dead) {
      const P = who.player, d = Math.hypot(P.x - e.x, P.z - e.z);
      if (d > 26 && d < 90 && (e.confrontT -= dt) > 0) { const face = Math.atan2(-(P.x - e.x), -(P.z - e.z)); return e.npcGo(P.x, P.y, P.z, dt, e.T.speed * 0.9) || { want: e.T.speed * 0.8, dir: face }; }
    }
    if (e.crimeOf && who === e.crimeOf && who instanceof LocalPlayer && who.mode !== 'play' && !e.confrontSaid) {
      const P = who.player, d = Math.hypot(P.x - e.x, P.z - e.z);
      if (d <= 2.6) { e.yaw = turnTo(e.yaw, Math.atan2(-(P.x - e.x), -(P.z - e.z)), dt * 6); e.confrontT = Math.max(e.confrontT, 10); return { want: 0, dir: e.yaw }; }
    }
    return baseConf(e, dt);
  };
}

// ---- what counts ----------------------------------------------------------------------------------------------------
// out of a town's chest, barrel or shelf: what's gone from it when you close it (what you put in counts against it)
{
  const baseOpen = InvUI.prototype.open, baseClose = InvUI.prototype.close;
  InvUI.prototype.open = function (mode, opts = {}) {
    const r = baseOpen.call(this, mode, opts);
    this._crime = null;
    try {
      if (mode === 'container' && opts.pos && !this.g.isGuest && !this.g.creative) {
        const [x, y, z] = opts.pos, where = crimeTownAt(this.g, x, y, z);
        if (where && !(typeof placedAt === 'function' && placedAt(this.g.world, x, y, z))) {
          const c = this.container(), before = {};
          if (c) for (const s of c.items) if (s) before[s.id] = (before[s.id] || 0) + s.n;
          this._crime = { where, before, pos: opts.pos };
        }
      }
    } catch (err) { this._crime = null; }
    return r;
  };
  InvUI.prototype.close = function () {
    const C = this._crime;
    let after = null;
    try { if (C) { const c = this.container(); after = {}; if (c) for (const s of c.items) if (s) after[s.id] = (after[s.id] || 0) + s.n; } } catch (err) { after = null; }
    const r = baseClose.call(this);
    this._crime = null;
    try {
      if (C && after) {
        const taken = [];
        for (const [id, n] of Object.entries(C.before)) { const k = n - (after[id] || 0); const d = itemDef(id); if (k > 0 && !(d && d.quest)) taken.push([id, k]); }
        if (taken.length) crimeCommit(this.g, this.lp, C.where, 'theft', taken);
      }
    } catch (err) { console.warn('crime', err); }
    return r;
  };
}
// breaking it out of the walls: a town's building, its door, its crops, its chests (and what's in them)
{
  const baseBreak = LocalPlayer.prototype.breakBlock;
  LocalPlayer.prototype.breakBlock = function (x, y, z) {
    const g = this.g, w = g.world;
    let where = null, items = null;
    try {
      if (!g.isGuest && !g.creative) {
        where = crimeTownAt(g, x, y, z);
        if (where && typeof placedAt === 'function' && placedAt(w, x, y, z)) where = null;
        if (where) {
          const id = w.getBlock(x, y, z), b = BLOCKS[id];
          if (!id || (b && (b.render === RENDER.CROSS && !b.crop) && !b.container)) where = null;   // a weed or a flower in the yard
          else {
            items = [];
            const ent = w.getEntity(x, y, z);
            if (ent && Array.isArray(ent.items)) for (const s of ent.items) if (s && !(itemDef(s.id) && itemDef(s.id).quest)) items.push([s.id, s.n]);
          }
        }
      }
    } catch (err) { where = null; }
    const r = baseBreak.call(this, x, y, z);
    try { if (where && !w.getBlock(x, y, z)) crimeCommit(g, this, where, items && items.length ? 'theft' : 'vandal', items || []); } catch (err) { console.warn('crime', err); }
    return r;
  };
}
// a guard who sees someone with a bounty on them comes over (now and then), wherever in town it happened
function crimeTick(g, dt) {
  if (g.isGuest || g.dim !== 0 || !g.world || (CRIME.t -= dt) > 0) return;
  CRIME.t = 2;
  for (const lp of g.locals) {
    const P = lp.player; if (P.dead || lp.mode !== 'play') continue;
    const v = typeof villageAtPos === 'function' ? villageAtPos(g, P.x, P.z, 24) : null; if (!v) continue;
    const o = CRIME.book.get((lp.name || 'p') + '|' + v.id); if (!o || o.bounty <= 0) continue;
    // a guard who lost you (you ran, or he gave up waiting) forgets he was after you: the next one to see you comes
    for (const e of g.entities) if (e.crimeOf === lp && !e.confront) e.crimeOf = null;
    if (g.entities.some(e => e.crimeOf === lp || e.foe === lp)) continue;
    const seen = crimeWitnesses(g, lp, v, P.x, P.y, P.z).filter(e => e.T && e.T.guard);
    if (seen.length) { seen[0].confront = lp; seen[0].confrontT = 45; seen[0].confrontSaid = false; seen[0].crimeOf = lp; seen[0].foe = null; }
  }
}
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { crimeTick(this, dt); } catch (e) { console.warn('crime', e); } return baseUpd.call(this, dt); };
}
try { window.__crime = { book: CRIME.book, townAt: (x, y, z) => crimeTownAt(GAME, x, y, z), value: crimeValue, commit: (kind, items) => { const lp = GAME.locals[0], P = lp.player; const w = crimeTownAt(GAME, P.x, P.y, P.z); if (w) crimeCommit(GAME, lp, w, kind, items); return !!w; } }; } catch (e) { /* no window */ }
