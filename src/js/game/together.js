// ---------------------------------------------------------------------------
// game/together.js — 0.9.0.34: together.
//
// For playing as two (or more), on one screen or over the network:
// - Your party down the left of the screen: each partner's health, how far
//   away they are and which way, and where they are if it's another layer.
// - Downed, not dead: with a partner up and about in the same place, a blow
//   that would kill you puts you on the ground instead. Hold Use on a downed
//   partner for a few seconds to get them back on their feet. Nobody comes in
//   time (or you hold Sneak to give up) and it's death as usual. Creatures
//   leave someone who's down alone. A world rule turns it off.
// - Jobs shared: take one and your partners get it too; kills for a shared
//   bounty count for everyone in the party who's near.
// - A party chest: every party chest in the world opens onto the same 27
//   slots, for everyone. The house a village gives its Hero is the party's
//   house: two beds, one each, and a party chest in it.
// - And the two things only the host could do: a guest can raise the Stone
//   Guardian, and set End Crystals round the exit portal.
// ---------------------------------------------------------------------------
const PARTY = { downFor: 30, reviveFor: 3, sharing: false };

// ---- who's playing ------------------------------------------------------------------------------------------------
// everyone but `me`: the others on this screen, and everyone over the network (in any layer)
function partyOthers(g, me) {
  const out = [];
  for (const l of (g.allLocals ? g.allLocals() : g.locals)) {
    if (l === me || l.serverPawn) continue;
    const p = l.player;
    out.push({ who: l, local: true, name: l.name, dim: p.dim ?? g.dim, x: p.x, y: p.y, z: p.z, hp: p.health, mhp: p.maxHealth, dead: !!p.dead, down: p.downed > 0 ? p.downed : 0 });
  }
  if (g.net) for (const r of g.net.remotes.values()) {
    if (!r.placed || !r.st) continue;
    out.push({ who: r, local: false, name: r.name, dim: r.dim, x: r.x, y: r.y, z: r.z, hp: r.st.hp ?? 20, mhp: r.st.mhp || 20, dead: !!r.st.dead, down: r.st.dn || 0 });
  }
  return out;
}
const dimOfLocal = (g, l) => (l.player.dim ?? g.dim);
// a pawn on the ground (a LocalPlayer, or a RemotePawn whose state says so)
const pawnDown = (q) => q.st ? q.st.dn > 0 : !!(q.player && q.player.downed > 0);
// is anyone else up and about where `lp` is (so going down is worth it)
function partyUpNear(g, lp) {
  const d = dimOfLocal(g, lp);
  return partyOthers(g, lp).some(o => o.dim === d && !o.dead && !o.down);
}

// ---- downed, not dead -----------------------------------------------------------------------------------------------
{
  const baseDie = LocalPlayer.prototype.die;
  LocalPlayer.prototype.die = function (src = {}) {
    const g = this.g, p = this.player;
    const rules = g.rules ? g.rules() : {};
    if (!p.downed && rules.downed !== false && !g.creative && src.type !== 'void' && !src.finish && g.state === 'playing' && partyUpNear(g, this)) {
      p.downed = PARTY.downFor; p.downSrc = { type: src.type, attacker: src.attacker }; p.health = 1; p.dead = false;
      p.vx = p.vz = 0; p.crawling = true; this.mining = null; this._giveUp = 0;
      if (this.mode === 'inv') this.closeInventory();
      g.sfx.play('hurt');
      this.toast('You\'re down! A partner can help you up: hold Use on you', 'warn');
      for (const o of partyOthers(g, this)) if (o.local) o.who.toast(`${this.name} is down! Hold Use on them to help them up`, 'warn');
      if (g.net) { if (g.isGuest) g.net.send({ t: 'adv', k: 'downsay', li: this.index || 0, n: this.name }); else g.net.all({ t: 'toast', m: `${this.name} is down! Hold Use on them to help them up`, k: 'warn' }); }
      return;
    }
    p.downed = 0;
    return baseDie.call(this, src);
  };
  // while down: the blows that land only take time off the clock
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const p = this.player;
    if (p.downed > 0) { if (amount > 0 && !(p.invuln > 0)) { p.downed -= amount * 1.5; p.invuln = 0.5; p.hurtFlash = 1; } return 0; }
    return baseHurt.call(this, amount, src);
  };
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const p = this.player, g = this.g;
    if (p.downed > 0 && !p.dead) {
      // look around, call for help; nothing else
      const keep = inp || InputManager.blankState();
      const blank = InputManager.blankState(); blank.lookX = keep.lookX; blank.lookY = keep.lookY; blank.pause = keep.pause; blank.chat = keep.chat; blank.hideHud = keep.hideHud; blank.screenshot = keep.screenshot;
      const up = partyUpNear(g, this);
      p.downed -= dt * (up ? 1 : 4);
      p.crawling = true; p.vx *= 0.5; p.vz *= 0.5;
      this._giveUp = keep.sneak ? (this._giveUp || 0) + dt : 0;
      downedHud(this);
      if (p.downed <= 0 || this._giveUp > 1.6) { p.downed = 0; downedHud(this); const s = Object.assign({}, p.downSrc || {}, { finish: true }); p.health = 0; this.die(s); return; }
      return baseUpd.call(this, dt, blank);
    }
    if (this._downEl) downedHud(this);
    // helping someone up: hold Use looking at them
    if (inp && inp.use && this.mode === 'play' && !p.dead) {
      const t = reviveTarget(this);
      if (t) {
        inp = Object.assign({}, inp, { use: false, usePressed: false });
        this._revT = (this._revT || 0) + dt; this._revWho = t.name;
        if (this._revT >= PARTY.reviveFor) { this._revT = 0; reviveSend(this, t); }
      } else this._revT = 0;
    } else this._revT = 0;
    reviveHud(this);
    return baseUpd.call(this, dt, inp);
  };
  // lying on the ground
  const basePose = LocalPlayer.prototype.pose;
  LocalPlayer.prototype.pose = function () { const ps = basePose.call(this); if (this.player.downed > 0) { ps.sleep = true; ps.downed = 1; } return ps; };
  // creatures leave someone who's down alone
  const baseNear = Game.prototype.nearestPawn;
  Game.prototype.nearestPawn = function (x, y, z, maxD) {
    const r = baseNear.call(this, x, y, z, maxD);
    if (!r || !pawnDown(r)) return r;
    let best = null, bd = maxD ?? 64;
    for (const q of this.pawns()) {
      if (q.dead || pawnDown(q)) continue;
      const d = Math.hypot(q.x - x, q.y - y, q.z - z); if (d < bd) { bd = d; best = q; }
    }
    return best;
  };
  // what everyone else sees: how you're doing, and whether you're down
  const baseStates = Net.prototype.localStates;
  Net.prototype.localStates = function () {
    const out = baseStates.call(this), L = this.g.locals;
    for (const s of out) { const l = L.find(q => q.index === s.i) || L[0]; if (!l) continue; s.mhp = l.player.maxHealth; if (l.player.downed > 0) s.dn = Math.ceil(l.player.downed); }
    return out;
  };
  Object.defineProperty(RemotePawn.prototype, 'downed', { get() { return !!(this.st && this.st.dn > 0); }, configurable: true });
}
function reviveTarget(lp) {
  const g = lp.g, p = lp.player, d = dimOfLocal(g, lp), look = lookVector(p.yaw, p.pitch);
  let best = null, bd = 2.8;
  for (const o of partyOthers(g, lp)) {
    if (!o.down || o.dead || o.dim !== d) continue;
    const dx = o.x - p.x, dz = o.z - p.z, dist = Math.hypot(dx, dz);
    if (dist > bd || Math.abs(o.y - p.y) > 2) continue;
    if (dist > 0.8 && (dx * look[0] + dz * look[2]) / dist < 0.35) continue;
    bd = dist; best = o;
  }
  return best;
}
function reviveSend(lp, o) {
  const g = lp.g;
  if (o.local) reviveLocal(o.who, lp.name);
  else if (!g.isGuest) o.who.send({ t: 'adv', k: 'revived', by: lp.name });
  else if (g.net) g.net.send({ t: 'adv', k: 'revive', key: o.who.key, by: lp.name });
  lp.toast(`You helped ${o.name} back up`, 'good');
  lp.swingArm(); g.sfx.play('heal');
}
function reviveLocal(l, by) {
  const p = l.player; if (!(p.downed > 0) || p.dead) return;
  p.downed = 0; p.crawling = false; p.health = Math.max(6, Math.round(p.maxHealth * 0.3)); p.invuln = 2.5; p.downSrc = null;
  downedHud(l);
  l.toast(`${by || 'Someone'} got you back on your feet!`, 'good');
  l.g.sfx.play('heal');
}
{
  // up again at your bed: no longer down
  const baseRespawn = LocalPlayer.prototype.respawn;
  LocalPlayer.prototype.respawn = function () { const p = this.player; p.downed = 0; p.downSrc = null; p.crawling = false; downedHud(this); return baseRespawn.apply(this, arguments); };
}
// ---- the screens: down on the ground; helping someone up; the party ------------------------------------------------------
function downedHud(lp) {
  const p = lp.player, on = p.downed > 0 && !p.dead;
  if (!on) { if (lp._downEl) { lp._downEl.remove(); lp._downEl = null; } return; }
  let el = lp._downEl;
  if (!el) { el = lp._downEl = document.createElement('div'); el.className = 'downed-ov'; el.innerHTML = '<div class="dn-box"><b>You\'re down</b><span class="dn-t"></span><i><u></u></i><em>A partner can help you up by holding Use on you · hold Sneak to give up</em></div>'; lp.el.appendChild(el); }
  const t = Math.max(0, p.downed), c = p.stats && p.stats.dnd;
  if (c && t > 600) {
    // (Shadowbloom) the dice decide: death saving throws
    el.querySelector('.dn-t').textContent = `Death saves — successes ${'●'.repeat(c.deathS || 0)}${'○'.repeat(Math.max(0, 3 - (c.deathS || 0)))} · failures ${'✖'.repeat(Math.min(3, c.deathF || 0))}${'·'.repeat(Math.max(0, 3 - (c.deathF || 0)))}`;
    el.querySelector('u').style.width = Math.round((3 - Math.min(3, c.deathF || 0)) / 3 * 100) + '%';
    el.querySelector('em').textContent = 'A friend can hold Use on you, or heal you · hold Sneak to give up';
    return;
  }
  el.querySelector('.dn-t').textContent = partyUpNear(lp.g, lp) ? `${Math.ceil(t)} s` : 'Nobody is up to help you…';
  el.querySelector('u').style.width = Math.round(t / PARTY.downFor * 100) + '%';
}
function reviveHud(lp) {
  const on = lp._revT > 0;
  let el = lp._revEl;
  if (!on) { if (el) { el.remove(); lp._revEl = null; } return; }
  if (!el) { el = lp._revEl = document.createElement('div'); el.className = 'revive-bar'; el.innerHTML = '<span></span><i><u></u></i>'; lp.el.appendChild(el); }
  el.querySelector('span').textContent = 'Helping ' + (lp._revWho || 'them') + ' up…';
  el.querySelector('u').style.width = Math.round(Math.min(1, lp._revT / PARTY.reviveFor) * 100) + '%';
}
const DIM_NAMES = { 0: 'Overworld', 1: 'Ember Depths', 2: 'Skylands' };
function partyHud(lp) {
  const g = lp.g, others = partyOthers(g, lp);
  let el = lp.el.querySelector('.party-hud');
  if (!others.length || g.settings.partyHud === false) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.className = 'party-hud'; lp.el.appendChild(el); }
  const p = lp.player, d = dimOfLocal(g, lp);
  el.innerHTML = others.slice(0, 6).map(o => {
    const pct = Math.max(0, Math.min(100, Math.round(o.hp / (o.mhp || 20) * 100)));
    let where = '';
    if (o.dim !== d) where = (typeof DIM !== 'undefined' && o.dim === DIM.END) ? 'The End' : (typeof DIM !== 'undefined' && o.dim === DIM.REALM) ? 'his realm' : (DIM_NAMES[o.dim] || 'elsewhere');
    else { const dist = Math.round(Math.hypot(o.x - p.x, o.z - p.z)), rel = heading(p.x, p.z, o.x, o.z) - p.yaw; where = `<i class="pa" style="transform:rotate(${(-rel).toFixed(2)}rad)">▲</i>${dist} m`; }
    const state = o.dead ? '<em class="dead">fallen</em>' : o.down ? `<em class="down">${o.down > 600 ? 'dying' : 'down ' + Math.ceil(o.down) + 's'}</em>` : '';
    return `<div class="pm${o.down ? ' isdown' : ''}${o.dead ? ' isdead' : ''}"><div class="pn"><b>${esc(o.name)}</b><span>${where}</span></div><div class="pb"><div class="ph"><u style="width:${pct}%"></u></div>${state}</div></div>`;
  }).join('');
}
{
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    if ((this._partyT = (this._partyT || 0) - dt) <= 0) { this._partyT = 0.25; try { partyHud(this); } catch (e) { /* the HUD is only a help */ } }
    return baseUpd.call(this, dt, inp);
  };
}

// ---- jobs shared -----------------------------------------------------------------------------------------------------
function questClone(q) { try { return JSON.parse(JSON.stringify(Object.assign({}, q, { have: q.kind === 'fetch' ? undefined : 0, party: 1 }))); } catch (e) { return null; } }
function questShareLocal(l, q, by) {
  const S = npcStats(l.player);
  if (!q || S.quests.some(o => o.id === q.id) || S.qdone[q.id] || S.quests.length >= 5) return false;
  PARTY.sharing = true;
  try { if (questTake(l, questClone(q))) { l.toast(`${by} shared a job with you: ${q.title}`, 'good'); questHud(l); return true; } } finally { PARTY.sharing = false; }
  return false;
}
{
  const baseTake = questTake;
  questTake = function (lp, q) {
    const ok = baseTake(lp, q);
    if (!ok || PARTY.sharing || !q) return ok;
    const mine = npcStats(lp.player).quests.find(o => o.id === q.id); if (mine) mine.party = 1;
    const g = lp.g;
    for (const o of partyOthers(g, lp)) if (o.local) questShareLocal(o.who, q, lp.name);
    if (g.net) { const m = { t: 'adv', k: 'qshare', q: questClone(q), by: lp.name }; if (g.isGuest) g.net.send(m); else g.net.all(m); }
    return ok;
  };
}
// a kill for a shared bounty counts for everyone in the party who's near
function questKillParty(lp, type) {
  const S = npcStats(lp.player); let hit = false;
  for (const q of S.quests) if (q.party && q.kind === 'hunt' && (HUNT_FAMILIES[q.fam] || []).includes(type) && (q.have || 0) < q.need) {
    q.have = (q.have || 0) + 1; hit = true;
    if (q.have >= q.need) lp.toast(`${q.title}: done (with your party) — back to the village for the reward`, 'good');
  }
  if (hit) questHud(lp);
}
{
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const r = baseDie.call(this, src), g = this.game, a = src && src.attacker;
    if (g.isGuest || !this.T || !this.T.hostile || !a) return r;
    const isLocal = a instanceof LocalPlayer, isRemote = typeof RemotePawn === 'function' && a instanceof RemotePawn;
    if (!isLocal && !isRemote) return r;
    for (const l of (g.allLocals ? g.allLocals() : g.locals)) if (l !== a && dimOfLocal(g, l) === g.dim && Math.hypot(l.player.x - this.x, l.player.z - this.z) < 64) questKillParty(l, this.type);
    if (g.net) for (const p of g.net.pawns()) if (p !== a && Math.hypot(p.x - this.x, p.z - this.z) < 64) p.send({ t: 'adv', k: 'pkill', m: this.type });
    return r;
  };
}

// ---- the party chest -------------------------------------------------------------------------------------------------
function partyItems(g) {
  if (g.isGuest) return g._partyItems || (g._partyItems = new Array(27).fill(null));
  const m = g.meta; if (!m) return new Array(27).fill(null);
  if (!Array.isArray(m.partyChest) || m.partyChest.length !== 27) m.partyChest = Object.assign(new Array(27).fill(null), Array.isArray(m.partyChest) ? m.partyChest.slice(0, 27) : []);
  return m.partyChest;
}
const cleanStacks = (a) => Array.from({ length: 27 }, (_, i) => { const s = a && a[i]; return s && typeof s.id === 'string' && ITEMS[s.id] && s.n > 0 ? cloneStack(s) : null; });
function partySync(g, except) {
  if (!g.net) return;
  const items = partyItems(g).map(s => s ? cloneStack(s) : null);
  if (g.isGuest) { partySendOps(g); return; }
  // (0.9.0.57) with which of each guest's changes it includes, so a guest never takes old news for the chest as it is
  g.net.all({ t: 'adv', k: 'party', items, ack: g.net.partyAck || {} }, except);
}
// (0.9.0.57) a guest sends only the slots it changed, as "this was X, now it's Y": the host applies each one to the chest as
// it is by then, so two people using it at once can't undo each other's taking and putting (the whole chest used to be
// sent, and the last one sent won)
const partySame = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
const partyKind = (a, b) => { if (!a || !b) return false; const x = Object.assign({}, a, { n: 0 }), y = Object.assign({}, b, { n: 0 }); return partySame(x, y); };
function partySendOps(g) {
  const P = partyItems(g), base = g._partyBase || new Array(27).fill(null), ops = [];
  for (let i = 0; i < 27; i++) if (!partySame(P[i], base[i])) ops.push([i, base[i] ? cloneStack(base[i]) : null, P[i] ? cloneStack(P[i]) : null]);
  g._partyBase = P.map(s => s ? cloneStack(s) : null);
  if (!ops.length) return;
  const q = g._partySeq = (g._partySeq || 0) + 1; g._partyPend = q;
  g.net.send({ t: 'adv', k: 'partyop', ops, q });
}
function partyApplyOp(P, op, who) {
  const i = op && op[0] | 0; if (!(i >= 0 && i < 27)) return;
  const one = (s) => cleanStacks([s])[0], old = one(op[1]), nw = one(op[2]), cur = P[i];
  if (partySame(cur, old)) { P[i] = nw; return; }
  // the slot changed meanwhile (someone else was in the chest too): what they took comes out, what they put goes in
  let took = null, put = null;
  if (old && nw && partyKind(old, nw)) { const d = nw.n - old.n; if (d > 0) put = Object.assign(cloneStack(nw), { n: d }); else if (d < 0) took = Object.assign(cloneStack(old), { n: -d }); }
  else { took = old; put = nw; }
  if (took && cur && partyKind(cur, took)) { cur.n -= Math.min(cur.n, took.n); if (cur.n <= 0) P[i] = null; }
  if (put) {
    let left = put.n;
    const merge = (j) => { const c = P[j]; if (left > 0 && c && canMerge(c, put)) { const k = Math.min(maxStackOf(c.id) - c.n, left); if (k > 0) { c.n += k; left -= k; } } };
    merge(i); for (let j = 0; j < 27; j++) if (j !== i) merge(j);
    if (left > 0 && !P[i]) { P[i] = Object.assign(cloneStack(put), { n: left }); left = 0; }
    for (let j = 0; j < 27 && left > 0; j++) if (!P[j]) { P[j] = Object.assign(cloneStack(put), { n: left }); left = 0; }
    if (left > 0 && who && who.give) who.give(Object.assign(cloneStack(put), { n: left }));   // no room at all: back to whoever put it
  }
}
function partyRefresh(g) {
  for (const l of (g.allLocals ? g.allLocals() : g.locals)) if (l.mode === 'inv' && l.inv && l.inv.opts && l.inv.opts.party && l.inv.render) l.inv.render();
}
{
  const baseCont = InvUI.prototype.container;
  InvUI.prototype.container = function () {
    if (this.opts && this.opts.party) return { title: 'Party Chest', items: partyItems(this.g) };
    return baseCont.call(this);
  };
  const baseChanged = InvUI.prototype.changed;
  InvUI.prototype.changed = function (group) {
    const r = baseChanged.call(this, group);
    if (group === 'cont' && this.opts && this.opts.party) { partySync(this.g); partyRefresh(this.g); }
    return r;
  };
  const baseUseBlock = LocalPlayer.prototype.useBlockAt;
  LocalPlayer.prototype.useBlockAt = function (hit, held, def) {
    const b = hit && BLOCKS[hit.id];
    if (b && b.partyChest && !this.player.sneaking) {
      this.swingArm(); this.g.sfx.play('chest');
      if (this.g.isGuest && this.g.net) this.g.net.send({ t: 'adv', k: 'partyget' });
      this.openInventory('container', { party: true });
      return true;
    }
    return baseUseBlock.call(this, hit, held, def);
  };
}
RECIPES.push({ out: 'party_chest', n: 1, shape: ['PPP', 'PGP', 'PPP'], key: { P: '#planks', G: 'gold_ingot' } });
if (ITEMS.party_chest) ITEMS.party_chest.desc = 'Every party chest in the world opens onto the same 27 slots, for everyone playing.';
{
  // its looks: warm wood, a gold band, a gold clasp with two hearts
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB, W1 = H('#8a4a2a'), W2 = H('#6a3418'), GOLD = H('#e8b030');
    const wood = (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(y % 4 === 3 ? W2 : W1, 0.9 + p.rand() * 0.2)); for (let i = 0; i < 16; i++) { p.set(i, 0, GOLD); p.set(i, 15, shade(GOLD, 0.8)); p.set(0, i, shade(GOLD, 0.85)); p.set(15, i, shade(GOLD, 0.85)); } };
    addTile('party_chest_top', p => { wood(p); for (let i = 2; i < 14; i++) { p.set(i, 7, shade(GOLD, 0.9)); p.set(i, 8, shade(GOLD, 0.75)); } });
    addTile('party_chest_side', p => { wood(p); for (let x = 1; x < 15; x++) { p.set(x, 5, GOLD); p.set(x, 6, shade(GOLD, 0.7)); } });
    addTile('party_chest_front', p => {
      wood(p); for (let x = 1; x < 15; x++) { p.set(x, 5, GOLD); p.set(x, 6, shade(GOLD, 0.7)); }
      for (let y = 4; y < 10; y++) for (let x = 5; x < 11; x++) p.set(x, y, shade(GOLD, y === 4 ? 1.15 : 0.95));
      for (const [x, y] of [[6, 6], [7, 6], [6, 7], [7, 7], [7, 8], [8, 7], [8, 6], [9, 6], [9, 7], [8, 8]]) p.set(x, y, H(x < 8 ? '#e83a5a' : '#c82a4a'));
    });
  };
}

// ---- the Hero's house is the party's house -----------------------------------------------------------------------------
{
  const baseBuild = homeBuild;
  homeBuild = function (g, v, site, owner) {
    const h = baseBuild(g, v, site, owner);
    // the second bed, and the chest made a party chest
    const { r, ox, oz, y: Y } = site, at = (lx, ly, lz) => { const [a, c] = vRot(r, lx, lz); return [ox + a, Y + ly, oz + c]; };
    h.bed2 = at(5, 1, 3);
    const [cx, cy, cz] = at(5, 1, 1), w = g.world;
    if (B.party_chest !== undefined && w.getBlock(cx, cy, cz) === B.chest) {
      const e = w.getEntity(cx, cy, cz), items = e && e.items ? e.items.filter(Boolean) : [], meta = w.getMeta(cx, cy, cz);
      w.setBlock(cx, cy, cz, B.party_chest, meta);
      const P = partyItems(g); for (const s of items) { const i = P.indexOf(null); if (i < 0) break; P[i] = s; }
      partySync(g);
    }
    return h;
  };
  const baseGive = homeGive;
  homeGive = function (g, v, who) {
    const h = baseGive(g, v, who);
    if (!h || !h.bed2 || h.shared) return h;
    h.shared = 1;
    // everyone else playing moves in too (the second bed is theirs)
    const firstFor = who && who.name;
    for (const l of (g.allLocals ? g.allLocals() : g.locals)) if (l.name !== firstFor && !homesOf(l.player)[v.id]) { homeSettle(l, v.id, Object.assign({}, h, { bed: h.bed2 })); l.toast(`${firstFor || 'Your partner'}'s new house in ${v.name} is yours too`, 'good'); }
    if (g.net) for (const r of g.net.remotes.values()) if (r.name !== firstFor && r.send && !String(r.key).startsWith('h:')) r.send({ t: 'adv', k: 'housed', v: v.id, h: Object.assign({}, h, { bed: h.bed2 }) });
    return h;
  };
}

// ---- what only the host could do: the Stone Guardian, the End Crystals --------------------------------------------------
{
  const baseCast = LocalPlayer.prototype.castSpell;
  LocalPlayer.prototype.castSpell = function () {
    const g = this.g, k = this.activeSpell && this.activeSpell(), st = this.heldStaff && this.heldStaff(), p = this.player;
    if (!(g.isGuest && k === 'guardian' && st && g.net)) return baseCast.apply(this, arguments);
    const S = SPELLS[k];
    if ((this.castCd || 0) > 0) return true;
    if (p.mana === undefined) p.mana = manaMax(p);
    if (p.mana < S.mana && !g.creative) { this.toast('Not enough mana', 'warn'); g.sfx.play('spell_fizzle'); this.castCd = 0.4; return true; }
    const power = st.power * robeBoost(p, k) * (1 + (skillLv(p, 'magic') - 1) / 98 * 0.6);
    const look = lookVector(p.yaw, p.pitch);
    g.net.send({ t: 'adv', k: 'guardian', li: this.index || 0, pw: +power.toFixed(2), x: +(p.x + look[0] * 2).toFixed(2), y: +(p.y + 0.2).toFixed(2), z: +(p.z + look[2] * 2).toFixed(2) });
    if (!g.creative) p.mana -= S.mana;
    this.castCd = 3; this.swingArm(); this.wearHeld(1);
    skillGain(this, 'magic', S.mana * 6); castCircle(g, p.x, p.y, p.z, S);
    return true;
  };
  const basePlace = endCrystalPlace;
  endCrystalPlace = function (lp, held) {
    const g = lp.g, hit = lp.target;
    if (!g.isGuest) return basePlace(lp, held);
    if (!hit || hit.ny !== 1 || !g.net) return;
    g.net.send({ t: 'adv', k: 'crystal', li: lp.index || 0, x: hit.x, y: hit.y, z: hit.z });
    held.n--; if (held.n <= 0) lp.player.inv.held = null;
    lp.swingArm();
  };
}
// a guardian for a player joined over the network (theirs: it follows them, and leaves when its time is up)
function guardianFor(g, r, m) {
  for (const o of g.entities.filter(e => e.guardianOf === r.name && e.alive)) { o.remove = true; }
  const x = Math.hypot(+m.x - r.x, +m.z - r.z) < 6 ? +m.x : r.x, z = Math.hypot(+m.x - r.x, +m.z - r.z) < 6 ? +m.z : r.z;
  const power = clamp(+m.pw || 1, 0.5, 4);
  const e = g.addEntity(new Mob(g, 'iron_golem', x, r.y + 0.2, z)); if (!e) return;
  e.owner = r.name; e.tamed = true; e.kept = false; e.guardianOf = r.name; e.spiritT = 50 + 15 * power;
  e.T = Object.assign({}, e.T, { spirit: true, drops: [], xp: 0, golem: false, hostile: false });
  e.maxHealth = e.health = Math.round(60 * power);
  for (let i = 0; i < 30; i++) { const a = Math.random() * TAU; spellSpark(g, x + Math.cos(a), r.y + Math.random() * 2.5, z + Math.sin(a), 'mana_stone', { vy: 1.4, life: 0.9, size: 0.09 }); }
  g.sfx.playAt('break_stone', x, r.y + 1, z);
}

// ---- over the network ------------------------------------------------------------------------------------------------
{
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (!m || m.t !== 'adv') return baseHost.call(this, from, m);
    const g = this.g, r = this.remotes.get('g' + from + ':' + (m.li || 0));
    switch (m.k) {
      case 'revive': {
        const key = String(m.key || ''), by = String(m.by || 'Someone').slice(0, 30);
        if (key.startsWith('h:')) { const l = (g.allLocals ? g.allLocals() : g.locals).find(q => q.index === +key.slice(2)); if (l) reviveLocal(l, by); }
        else { const t = this.remotes.get(key); if (t && t.send) t.send({ t: 'adv', k: 'revived', by }); }
        return;
      }
      case 'downsay': { const t = `${String(m.n || 'Someone').slice(0, 30)} is down! Hold Use on them to help them up`; this.all({ t: 'toast', m: t, k: 'warn' }, from); for (const l of (g.allLocals ? g.allLocals() : g.locals)) l.toast(t, 'warn'); return; }
      case 'qshare': {
        const q = m.q; if (!q || typeof q.id !== 'string' || typeof q.title !== 'string') return;
        for (const l of (g.allLocals ? g.allLocals() : g.locals)) questShareLocal(l, q, String(m.by || 'A partner').slice(0, 30));
        this.all({ t: 'adv', k: 'qshare', q, by: m.by }, from);
        return;
      }
      case 'party': {
        if (!Array.isArray(m.items)) return;
        const P = partyItems(g), clean = cleanStacks(m.items); for (let i = 0; i < 27; i++) P[i] = clean[i];
        partySync(g, from); partyRefresh(g);
        return;
      }
      case 'partyget': { const items = partyItems(g).map(s => s ? cloneStack(s) : null); this.to(from, { t: 'adv', k: 'party', items, ack: this.partyAck || {} }); return; }
      case 'partyop': {
        if (!Array.isArray(m.ops)) return;
        const P = partyItems(g), who = [...this.remotes.values()].find(q => q.gid === from) || null;
        for (const op of m.ops.slice(0, 27)) partyApplyOp(P, op, who);
        (this.partyAck || (this.partyAck = {}))[from] = +m.q || 0;
        partySync(g); partyRefresh(g);
        return;
      }
      case 'guardian': if (r) guardianFor(g, r, m); return;
      case 'crystal': {
        if (!r || g.dim !== DIM.END) { if (r) r.send({ t: 'adv', k: 'crystalback' }); return; }
        const fake = { g, name: r.name, player: { inv: { held: { id: 'end_crystal', n: 1 } } }, target: { x: m.x | 0, y: m.y | 0, z: m.z | 0, ny: 1 }, toast: (t, k) => r.send({ t: 'toast', m: t, k }), swingArm() {} };
        const before = g.entities.filter(e => e.ritual && e.alive).length;
        if (Math.hypot(r.x - m.x, r.z - m.z) < 8) basePlaceForGuest(fake);
        if (g.entities.filter(e => e.ritual && e.alive).length === before) r.send({ t: 'adv', k: 'crystalback' });
        return;
      }
    }
    return baseHost.call(this, from, m);
  };
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (!m || m.t !== 'adv') return baseGuest.call(this, m);
    const g = this.g, lp = g.locals[m.li || 0] || g.locals[0];
    switch (m.k) {
      case 'revived': if (lp) reviveLocal(lp, String(m.by || 'Someone').slice(0, 30)); return;
      case 'qshare': if (m.q && typeof m.q.id === 'string') for (const l of g.locals) questShareLocal(l, m.q, String(m.by || 'A partner').slice(0, 30)); return;
      case 'pkill': for (const l of g.locals) questKillParty(l, String(m.m)); return;
      case 'party': if (Array.isArray(m.items)) {
        // (0.9.0.57) news that doesn't include our own latest change yet is old news: the next one will
        const pend = g._partyPend || 0, got = (m.ack && this.myId !== undefined && m.ack[this.myId]) || 0;
        if (pend && got < pend) return;
        g._partyPend = 0;
        const P = partyItems(g), clean = cleanStacks(m.items); for (let i = 0; i < 27; i++) P[i] = clean[i];
        g._partyBase = clean.map(s => s ? cloneStack(s) : null);
        partyRefresh(g);
      } return;
      case 'crystalback': if (lp) { const left = lp.give(mkStack('end_crystal', 1)); if (left > 0) lp.toast('Your End Crystal fell to the ground', ''); lp.toast('The crystal won\'t take there: set it on the stone round the exit portal', ''); } return;
    }
    return baseGuest.call(this, m);
  };
}
// the host placing a crystal for a guest goes through the same checks as its own
function basePlaceForGuest(fake) {
  const g = fake.g, hit = fake.target, E = endRec(g), fy = g.world.gen.endFountainY();
  if (!E.slain || g.entities.some(e => e.type === 'ender_dragon' && e.alive)) return;
  const d = Math.hypot(hit.x + 0.5, hit.z + 0.5);
  if (d > 5 || d < 2 || Math.abs(hit.y - fy) > 1) return;
  if (g.entities.some(e => e.ritual && e.alive && Math.hypot(e.x - hit.x - 0.5, e.z - hit.z - 0.5) < 1.5)) return;
  const c = g.addEntity(new Mob(g, 'end_crystal', hit.x + 0.5, hit.y + 1, hit.z + 0.5));
  c.ritual = true; c.kept = false; c.noGrav = true;
  g.sfx.playAt('spell_blink', hit.x + 0.5, hit.y + 1, hit.z + 0.5);
  const n = g.entities.filter(e => e.ritual && e.alive && !e.remove).length;
  for (const l of g.locals) l.toast(n >= 4 ? 'The crystals hum together… something stirs in the dark' : `End Crystal ${n} of 4`, n >= 4 ? 'epic' : '');
}

PV.debug.together = { others: (lp) => partyOthers(GAME, lp).map(o => ({ name: o.name, dim: o.dim, hp: o.hp, down: o.down })), revive: (l) => reviveLocal(l, 'test'), items: () => partyItems(GAME), sync: () => partySync(GAME), target: (lp) => { const t = reviveTarget(lp); return t ? t.name : null; } };
