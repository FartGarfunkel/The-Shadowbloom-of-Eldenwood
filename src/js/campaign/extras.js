// ---------------------------------------------------------------------------
// campaign/extras.js — (alpha 2) what a full campaign needs beyond the engine's basics.
//
//   Props          things in the world you talk to like a person: a sigil burned into a tree, a pedestal, five
//                  chimes, a ring of standing stones. They take the same dialogue as the story's people, with
//                  stat checks, and the engine sets their block in the world where the campaign says.
//   Anchors        the old Resonance Anchors: a stone that wakes when a place's story is done (or when the
//                  campaign says), attunes the party, and works like any waystone, free under the d20's rules.
//   The Crystal    an item that calls you home to any anchor you're attuned to, once until your next long rest.
//   Items          trinkets that help just by being carried, and scrolls and charms that cast a spell.
//   Effects        milestone levels (as a DM levels a table), places revealed on the map, places cleared,
//                  anchors attuned. Objectives counted over several flags. Dreams and visions on a long rest.
//   Creatures      tougher with more players, phases at part health, weaker against the right keepsake.
//   The land       made to match the story: a mountain where Mount Cinder stands, a marsh, a still lake, dark
//                  woods; and dry ground under every town and place, whatever the seed.
//   Sites          more kinds of places built into the world (a great sigil tree, a weeping willow, a ring of
//                  echo stones, a dock on a still lake, a drowned altar...).
// ---------------------------------------------------------------------------

const CX_RT = { propT: 0, anchorT: 0, nonce: 0 };
const CAMP_TRINKETS = [];

// ---- items: the campaign's item fields -----------------------------------------------------------------------------
{
  const baseDefine = campaignDefine;
  campaignDefine = function (C) {
    const out = baseDefine(C);
    for (const [k, it] of Object.entries(C.items || {})) {
      const d = ITEMS[k]; if (!d) continue;
      if (it.trinket) { d.trinket = it.trinket; if (!CAMP_TRINKETS.includes(k)) CAMP_TRINKETS.push(k); }
      if (it.recall) d.recall = true;
      if (it.cast) { d.castSpell = it.cast; d.castCharges = it.charges || 'once'; }
      if (it.heal) d.campHeal = it.heal;
    }
    for (const [k, N] of Object.entries(C.npcs || {})) if (N.prop && NPC_JOBS['c_' + k]) NPC_JOBS['c_' + k].title = N.title || 'Curiosity';
    return out;
  };
}
// trinkets: carried, they help
{
  const baseDerive = dndDerive;
  dndDerive = function (c, inv) {
    const d = baseDerive(c, inv);
    if (!d || !inv || !CAMP_TRINKETS.length) return d;
    const seen = [];
    for (const id of CAMP_TRINKETS) {
      if (inv.count(id) <= 0) continue;
      const T = ITEMS[id].trinket; seen.push(id);
      if (T.ac) d.ac += T.ac;
      if (T.save) for (const a of DND_ABILITIES) d.saves[a] += T.save;
      if (T.saves) for (const [a, v] of Object.entries(T.saves)) d.saves[a] += v;
      if (T.skills) for (const [k, v] of Object.entries(T.skills)) if (d.skills[k] != null) d.skills[k] += v;
      if (T.skill) for (const k of Object.keys(d.skills)) d.skills[k] += T.skill;
      if (T.resist) for (const r of T.resist) if (!d.resist.includes(r)) d.resist.push(r);
      if (T.spellDC) { d.spellDC += T.spellDC; d.spellAtk += T.spellDC; }
      if (T.speed) d.speed += T.speed;
    }
    d.passive = 10 + d.skills.perception;
    d.trinkets = seen;
    return d;
  };
}
// using a campaign item: the Sending Crystal, a scroll or charm that casts, a draught that heals
{
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const p = this.player, h = p.inv.held, d = h && itemDef(h.id);
    if (!repeat && !fromOff && d && (d.recall || d.castSpell || d.campHeal) && !this.targetEnt) {
      this.swingArm();
      if (d.recall) { campRecall(this); return; }
      if (d.campHeal) {
        const n = dndRoll(d.campHeal[0], d.campHeal[1], d.campHeal[2] || 0).total;
        p.health = Math.min(p.maxHealth, p.health + n); this.floatText(p.x, p.y + 2, p.z, '+' + n, '#7fe07f'); this.g.sfx.play('drink');
        p.inv.remove(h.id, 1); if (typeof dndHudDirty === 'function') dndHudDirty(this); return;
      }
      if (d.castSpell) {
        const used = p.stats.itemRest || (p.stats.itemRest = {});
        if (d.castCharges === 'long' && used[h.id]) { this.toast(`${d.name} is spent until you take a long rest`, 'warn'); return; }
        const ok = typeof dndCast === 'function' && dndCast(this, d.castSpell, { free: true });
        if (ok) { if (d.castCharges === 'long') used[h.id] = 1; else p.inv.remove(h.id, 1); }
        return;
      }
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  const baseHas = itemHasUse;
  itemHasUse = function (d) { return !!(d && (d.recall || d.castSpell || d.campHeal)) || baseHas(d); };
}
// the Sending Crystal: home to an anchor, once until your next long rest
function campRecall(lp) {
  const g = lp.g, p = lp.player, st = p.stats || (p.stats = {});
  if ((p.dim ?? g.dim) !== 0) { lp.toast('The crystal is silent here. It only hears the anchors of the world above.', 'warn'); return; }
  if (st.recallUsed) { lp.toast('The crystal is dim. It gathers resonance again when you take a long rest.', 'warn'); return; }
  const foe = g.entities.some(e => e instanceof Mob && e.alive && e.T.hostile && !e.tamed && !e.npc && Math.hypot(e.x - p.x, e.z - p.z) < 12 && (e.huntT > 0 || e.lookAt === p));
  if (foe) { lp.toast('Too much dissonance near you. You need a moment of stillness to call the crystal.', 'warn'); return; }
  const ways = Object.entries(waysOf(p)).filter(([, r]) => (r.dim ?? 0) === 0);
  if (!ways.length) { lp.toast('The crystal has no anchor to call to yet. Touch a Resonance Anchor first.', 'warn'); return; }
  const from = [p.x, p.y, p.z];
  lp.openNpcUI(() => {
    const M = new WayMenu(lp, null);
    M.title = 'The Sending Crystal'; M.sub = 'Call yourself home to an anchor'; M.hint = 'Once until your next long rest · it carries everyone at your side';
    M.onGo = () => {
      st.recallUsed = true;
      // the party at your side comes with you (split screen here; over the network, the host carries them)
      for (const l of g.locals) if (l !== lp && Math.hypot(l.player.x - from[0], l.player.z - from[2]) < 6) { l.player.x = p.x + 1; l.player.y = p.y; l.player.z = p.z + 1; l.player.vx = l.player.vy = l.player.vz = 0; l.player.fallStart = null; }
      if (g.net && !g.isGuest) for (const q of g.net.pawns()) if (Math.hypot(q.x - from[0], q.z - from[2]) < 6) q.send({ t: 'adv', k: 'camptpxyz', x: p.x + 1, y: p.y, z: p.z - 1 });
    };
    M.draw();
    return M;
  });
}
{
  const baseRest = dndDoRest;
  dndDoRest = function (lp, kind) {
    const r = baseRest(lp, kind);
    if (r !== false && kind !== 'short') {
      const st = lp.player.stats || {}; st.recallUsed = false; st.itemRest = {};
      const g = lp.g;
      if (campDef(g)) { if (g.isGuest) { if (g.net) g.net.send({ t: 'adv', k: 'camprest', kind }); } else campRestTriggers(g, kind); }
    }
    return r;
  };
}
// dreams, visions and the morning after: triggers that wait for a long rest
function campRestTriggers(g, kind) {
  const C = campDef(g), S = campState(g); if (!C) return;
  if (CX_RT.restAt && Date.now() - CX_RT.restAt < 4000) return;   // one night, however many sleep
  CX_RT.restAt = Date.now();
  for (const [k, T] of Object.entries(C.triggers || {})) {
    if (!T.rest || S.flags['_t_' + k]) continue;
    if (T.if && !campTest(g, T.if)) continue;
    if (T.near) { const at = campPos(C, T.near); if (!at || !campParty(g).some(p => Math.hypot(p.x - at[0], p.z - at[1]) < (T.r || 60))) continue; }
    S.flags['_t_' + k] = 1;
    campDo(g, T.do);
    break;   // one dream a night
  }
  campChanged(g);
}

// ---- effects and objectives ----------------------------------------------------------------------------------------
{
  const baseDo = campDo;
  campDo = function (g, fx, lp, ctx = {}) {
    if (!fx) return;
    const list = Array.isArray(fx) ? fx : [fx];
    const clears = [];
    if (!g.isGuest) {
      for (const e of list) {
        if (!e || (e.if && !campTest(g, e.if, lp))) continue;
        try {
          if (e.milestone) campMilestone(g, e.milestone, e.why);
          if (e.reveal) { const S = campState(g); for (const k of [].concat(e.reveal)) S.known[k] = 1; for (const l of g.locals) l.toast('Your map is marked with new places', 'good'); }
          if (e.clear) clears.push(e.clear);   // (alpha 7) after the rest, so a flag set beside it is seen by onClear
          if (e.attune) campAttuneAll(g, e.attune);
          if (e.unknown) { const S = campState(g); delete S.known[e.unknown]; }
          if (e.hurt) campHurtParty(g, e.hurt, e.type || 'psychic', e.why);
          if (e.inspire) for (const p of campParty(g)) { const L = campLocalOf(g, p), c = L && dndOf(L.player); if (c) { c.inspiration = true; L.toast('Heroic Inspiration: your next blows land keener', 'epic'); } }
          if (e.narrate && g.net) g.net.all({ t: 'adv', k: 'campnarr', pages: [].concat(e.narrate), title: e.title || null, nonce: ctx.nonce || 0 });
        } catch (err) { console.warn('campaign effect', e, err); }
      }
    } else {
      // a story beat on a guest's screen is everyone's story beat
      for (const e of list) if (e && e.narrate && (!e.if || campTest(g, e.if, lp)) && g.net) { const nonce = ++CX_RT.nonce + Math.random(); CX_RT.mine = nonce; g.net.send({ t: 'adv', k: 'campnarrall', pages: [].concat(e.narrate), title: e.title || null, nonce }); }
    }
    const r = baseDo(g, fx, lp, ctx);
    for (const pid of clears) { try { campClearPlace(g, pid); } catch (err) { console.warn('campaign clear', pid, err); } }
    return r;
  };
  const baseObj = campObjDone;
  campObjDone = function (g, qid, R, st) {
    const O = st && st.obj;
    if (O && O.flags) { const S = campState(g); const n = O.flags.filter(f => S.flags[f]).length; R.n = n; return n >= (O.n || O.flags.length); }
    if (O && O.haveAll) { const who = campParty(g); return O.haveAll.every(id => g.locals.some(l => l.player.inv.count(id) > 0)); }
    return baseObj(g, qid, R, st);
  };
}
// harm from the story itself (a backlash, a scream through the stone): local players here, guests at their end
function campHurtParty(g, n, type, why) {
  for (const l of g.locals) { const p = l.player; if (p.dead) continue; const dmg = Array.isArray(n) ? dndRoll(n[0], n[1], n[2] || 0).total : n; l.hurt(dmg, { type: 'magic', element: type, bypass: true }); if (why) l.toast(why, 'warn'); }
}
// levels at the story's milestones: nobody falls behind, whoever did the fighting
function campMilestone(g, lv, why) {
  for (const p of campParty(g)) {
    const L = campLocalOf(g, p);
    if (L) campMilestoneLocal(L, lv, why);
    else if (p.send) p.send({ t: 'adv', k: 'campxp', milestone: lv, why });
  }
}
function campMilestoneLocal(L, lv, why) {
  const c = dndOf(L.player); if (!c || c.level >= lv) return;
  const need = DND_XP[Math.min(DND_MAX_LEVEL, lv)] - (c.xp || 0);
  if (need <= 0) return;
  const bonus = 1 + ((DND_SPECIES[c.species] && DND_SPECIES[c.species].xpBonus) || 0);
  dndAwardXp(L, Math.ceil(need / bonus), why || 'the story');
}
function campClearPlace(g, pid) {
  const C = campDef(g), S = campState(g), P = C && C.places[pid]; if (!P || S.cleared[pid]) return;
  S.cleared[pid] = npcDay(g) + 1;
  if (P.kind === 'dungeon') { const d = campDungeon(g, pid); if (d) { const rec = dungeonRec(g, d.id); rec.cleared = 1; rec.bossUp = 0; for (const e of g.entities) if (e.dungeon === d.id && e.alive) { e.remove = true; g.burst(e.x, e.y + 1, e.z, 'smoke', 20, 1); } } }
  for (const e of g.entities) if (e.campPlace === pid && e.alive) { e.remove = true; g.burst(e.x, e.y + 1, e.z, 'smoke', 20, 1); }
  if (P.onClear) campDo(g, P.onClear);
  campChanged(g);
}
// is a campaign dungeon's keeper allowed to wake yet? (dungeons.js asks)
function campDungeonBossOk(g, d) {
  const C = campDef(g), P = C && C.places[d.place];
  return !P || !P.bossIf || campTest(g, P.bossIf);
}

// ---- the network: what guests hear ---------------------------------------------------------------------------------
{
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv') {
      const g = this.g;
      if (m.k === 'campxp' && m.milestone) { for (const l of g.locals) campMilestoneLocal(l, m.milestone, m.why); return; }
      if (m.k === 'campanchor') { for (const l of g.locals) { const W = waysOf(l.player); if (!W[m.id]) { W[m.id] = { x: m.x, y: m.y, z: m.z, dim: 0, name: m.name }; l.toast(`Attuned to the ${m.name}`, 'good'); } } return; }
      if (m.k === 'camptpxyz') { for (const l of g.locals) { const p = l.player; p.x = m.x; p.y = m.y; p.z = m.z; p.vx = p.vy = p.vz = 0; p.fallStart = null; } return; }
      if (m.k === 'campnarr') { if (m.nonce && m.nonce === CX_RT.mine) return; campNarrate(g, m.pages, m.title); return; }
    }
    return baseGuest.call(this, m);
  };
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'camprest') { campRestTriggers(this.g, m.kind); return; }
    if (m && m.t === 'adv' && m.k === 'campnarrall') { campNarrate(this.g, m.pages, m.title); this.all({ t: 'adv', k: 'campnarr', pages: m.pages, title: m.title, nonce: m.nonce }); return; }
    return baseHost.call(this, from, m);
  };
}

// ---- creatures: more players, more to beat; phases; keepsakes -----------------------------------------------------
{
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (!this._campInit && this.T && this.T.campaign && this.game && !this.game.isGuest && this.alive) {
      this._campInit = true;
      const g = this.game, n = Math.max(1, g.pawns ? g.pawns().filter(p => !p.dead).length : g.locals.length);
      let k = n > 1 ? (this.T.boss ? 1 + 0.6 * (n - 1) : 1 + 0.25 * (n - 1)) : 1;
      if (this.T.weakIf && campDef(g) && campTest(g, this.T.weakIf)) {
        k *= 0.75; this._campWeak = true;
        for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 40) l.toast(this.T.weakLine || `${String(this.T.label).replace(/^the /, 'The ')} falters at what you carry`, 'good');
      }
      if (k !== 1) { this.maxHealth = Math.max(1, Math.round(this.maxHealth * k)); this.health = this.maxHealth; }
    }
    return baseUpd.call(this, dt);
  };
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const f0 = this.maxHealth ? this.health / this.maxHealth : 1;
    const r = baseHurt.call(this, amount, src);
    const P = this.T && this.T.phases;
    if (P && this.alive && this.game && !this.game.isGuest && r > 0) {
      const f1 = this.health / this.maxHealth;
      this._ph = this._ph || {};
      P.forEach((ph, i) => {
        if (this._ph[i] || f0 <= ph.at || f1 > ph.at) return;
        this._ph[i] = 1;
        const g = this.game;
        if (ph.say) for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 48) l.toast(ph.say, 'warn');
        if (ph.spawn && MOB_TYPES[ph.spawn[0]]) for (let k = 0; k < (ph.spawn[1] || 1); k++) { const a = Math.random() * TAU, m = g.addEntity(new Mob(g, ph.spawn[0], this.x + Math.cos(a) * 2.5, this.y + 0.2, this.z + Math.sin(a) * 2.5)); m.huntT = 40; m.persistent = true; g.burst(m.x, m.y + 1, m.z, 'smoke', 16, 1); }
        if (ph.heal) { this.health = Math.min(this.maxHealth, this.health + Math.round(this.maxHealth * ph.heal)); }
        if (ph.shake && g.shake) g.shake(0.5, this);
        if (ph.do && campDef(g)) campDo(g, ph.do);
      });
    }
    return r;
  };
}

// ---- props: things you talk to -------------------------------------------------------------------------------------
function campPropSpot(g, C, id, N) {
  const at = campNpcPost(g, C, id, N); if (!at) return null;
  const x = Math.floor(at[0]), z = Math.floor(at[2]);
  if (!g.world.isLoaded(x, z)) return null;
  let y = at[1] != null ? Math.floor(at[1]) : findSafeY(g.world, x, z);
  if (y == null || y < 1) return null;
  if (N.propUp) y += N.propUp;
  // never inside something solid: up a step or two
  for (let k = 0; k < 4 && T_SOLID[g.world.getBlock(x, y, z)] && g.world.getBlock(x, y, z) !== B[N.prop]; k++) y++;
  return [x, y, z];
}
function campPropTick(g, dt) {
  const C = campDef(g); if (!C || g.isGuest || g.dim !== 0 || !g.world) return;
  if ((CX_RT.propT -= dt) > 0) return;
  CX_RT.propT = 1;
  const S = campState(g), ps = g.pawns().filter(p => !p.dead);
  let changed = false;
  for (const [id, N] of Object.entries(C.npcs)) {
    if (!N.prop) continue;
    const want = !S.gone[id] && (!N.if || campTest(g, N.if)) && !(N.until && campTest(g, N.until));
    const rec = S.props[id], blk = B[N.prop];
    if (blk === undefined) continue;
    if (want) {
      if (rec) {
        if (g.world.isLoaded(rec[0], rec[2]) && g.world.getBlock(rec[0], rec[1], rec[2]) !== blk) { g.world.setBlock(rec[0], rec[1], rec[2], blk, N.propMeta || 0); }
        continue;
      }
      const at0 = campNpcPost(g, C, id, N); if (!at0) continue;
      if (!ps.some(p => Math.hypot(p.x - at0[0], p.z - at0[2]) < 64)) continue;
      const at = campPropSpot(g, C, id, N); if (!at) continue;
      g.world.setBlock(at[0], at[1], at[2], blk, N.propMeta || 0);
      S.props[id] = at; changed = true;
    } else if (rec) {
      if (!g.world.isLoaded(rec[0], rec[2])) continue;
      if (g.world.getBlock(rec[0], rec[1], rec[2]) === blk) { g.world.setBlock(rec[0], rec[1], rec[2], N.leaves ? B[N.leaves] : 0, 0); g.burst(rec[0] + 0.5, rec[1] + 0.5, rec[2] + 0.5, 'smoke', 14, 0.8); }
      delete S.props[id]; changed = true;
    }
  }
  if (changed) campChanged(g);
}
function campPropAt(g, x, y, z) {
  const S = campState(g); if (!S || !S.props) return null;
  for (const [id, r] of Object.entries(S.props)) if (r[0] === x && r[1] === y && r[2] === z) return id;
  return null;
}
function campOpenProp(lp, id) {
  const g = lp.g, C = campDef(g), N = C.npcs[id], at = campState(g).props[id];
  const seed = hash32(id.length * 977, id.charCodeAt(0), id.charCodeAt(id.length - 1), 31) % 100000;
  const ent = { id: -1, x: at[0] + 0.5, y: at[1], z: at[2] + 0.5, alive: true, T: {}, holdT: 0, npc: { v: 'camp', i: 0, n: N.name, j: 'c_' + id, s: seed, p: 0, cid: id } };
  lp.openNpcUI(() => {
    const t = new NpcTalk(lp, ent);
    const face = t.el.querySelector('.nt-face'); if (face) face.innerHTML = `<div class="nt-prop">${esc(N.glyph || '✦')}</div>`;
    return t;
  });
  if (g.sfx) try { g.sfx.play(N.sound || 'enchant'); } catch (e) { /* none */ }
}
{
  const baseUseBlock = LocalPlayer.prototype.useBlockAt;
  LocalPlayer.prototype.useBlockAt = function (hit, held, def) {
    if (hit && campDef(this.g) && !this.player.sneaking) {
      const id = campPropAt(this.g, hit.x, hit.y, hit.z);
      if (id) { this.swingArm(); campOpenProp(this, id); return true; }
    }
    return baseUseBlock.call(this, hit, held, def);
  };
  // a prop can't be dug up while its story needs it
  const baseBreak = LocalPlayer.prototype.breakBlock;
  LocalPlayer.prototype.breakBlock = function (x, y, z) {
    if (campDef(this.g) && campPropAt(this.g, x, y, z)) { this.toast('It will not move. Something holds it here.', ''); return; }
    return baseBreak.call(this, x, y, z);
  };
}

// ---- Resonance Anchors -----------------------------------------------------------------------------------------------
function campAnchorTick(g, dt) {
  const C = campDef(g); if (!C || g.isGuest || g.dim !== 0 || !g.world) return;
  if ((CX_RT.anchorT -= dt) > 0) return;
  CX_RT.anchorT = 1.5;
  const S = campState(g), ps = g.pawns().filter(p => !p.dead);
  for (const [pid, P] of Object.entries(C.places)) {
    if (!P.anchor || S.anchors[pid]) continue;
    const cond = P.anchorIf || { cleared: pid };
    if (!campTest(g, cond)) continue;
    const o = Array.isArray(P.anchor) ? P.anchor : [5, 0], x = P.at[0] + o[0], z = P.at[1] + o[1];
    if (!ps.some(p => Math.hypot(p.x - x, p.z - z) < 56)) continue;
    if (!g.world.isLoaded(x, z)) continue;
    const y = findSafeY(g.world, x, z); if (y == null || y < 1) continue;
    const name = 'Resonance Anchor — ' + P.name, wid = 'a:' + pid;
    g.world.setBlock(x, y, z, B.waystone, 0);
    g.world.setEntity(x, y, z, { type: 'waystone', wayId: wid, name });
    g.entityChanged(x, y, z);
    wayRec(g)[wid] = { x, y, z, dim: 0, name };
    S.anchors[pid] = [x, y, z];
    for (let i = 0; i < 40; i++) spellSpark(g, x + 0.5, y + 0.5 + Math.random() * 2, z + 0.5, 'mana_arcane', { vx: (Math.random() - 0.5) * 3, vy: 1 + Math.random() * 2, vz: (Math.random() - 0.5) * 3, life: 1.1, size: 0.09 });
    if (g.sfx) g.sfx.playAt ? g.sfx.playAt('enchant', x, y, z, 40) : g.sfx.play('enchant');
    campAttuneAll(g, pid, true);
    campChanged(g);
  }
}
// attune the whole party to a place's anchor (or a town's)
function campAttuneAll(g, ref, fresh) {
  const C = campDef(g), S = campState(g);
  let rec = null, wid = null;
  if (C.towns[ref]) {
    const v = campTownVillage(g, ref); if (!v) return;
    wid = 'v:' + v.id; rec = wayRec(g)[wid];
    if (!rec) {
      const s = waySiteFor(g, v); if (!s) return;
      const nm = 'Resonance Anchor of ' + v.name;
      g.world.setBlock(s[0], s[1], s[2], B.waystone, 0); g.world.setEntity(s[0], s[1], s[2], { type: 'waystone', wayId: wid, name: nm }); g.entityChanged(s[0], s[1], s[2]);
      rec = wayRec(g)[wid] = { x: s[0], y: s[1], z: s[2], dim: 0, name: nm };
    }
  } else if (S.anchors[ref]) { wid = 'a:' + ref; const a = S.anchors[ref]; rec = { x: a[0], y: a[1], z: a[2], dim: 0, name: 'Resonance Anchor — ' + C.places[ref].name }; }
  if (!rec) return;
  for (const l of g.locals) { const W = waysOf(l.player); if (!W[wid]) W[wid] = { x: rec.x, y: rec.y, z: rec.z, dim: 0, name: rec.name }; }
  if (g.net) for (const p of g.net.pawns()) p.send({ t: 'adv', k: 'campanchor', id: wid, x: rec.x, y: rec.y, z: rec.z, name: rec.name });
  for (const l of g.locals) l.toast(fresh ? '“The resonance stabilizes. This anchor point is now attuned.”' : `Attuned to the ${rec.name}`, fresh ? 'epic' : 'good');
}

// ---- the tick --------------------------------------------------------------------------------------------------------
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) {
    try { if (this.state === 'playing' && campDef(this)) { campPropTick(this, dt); campAnchorTick(this, dt); } } catch (e) { if (!CX_RT.warned) { CX_RT.warned = true; console.warn('campaign extras', e); } }
    return baseUpd.call(this, dt);
  };
}

// ---- the quest board: the town's own notices, above the bounties -------------------------------------------------
{
  const baseDraw = QuestBoard.prototype.draw;
  QuestBoard.prototype.draw = function () {
    baseDraw.call(this);
    const g = this.g, C = campDef(g); if (!C || !this.v) return;
    const town = Object.entries(C.towns).find(([id]) => { const v = campTownVillage(g, id); return v && v.id === this.v.id; });
    if (!town || !town[1].notices) return;
    const list = town[1].notices.filter(n => !n.if || campTest(g, n.if, this.lp));
    if (!list.length) return;
    const html = `<div class="qb-sub">Notices</div><div class="qb-grid">${list.map(n => `<div class="qb-note notice"><b>${esc(n.title)}</b><p>${esc(n.text)}</p>${n.by ? `<div class="qb-rew">— ${esc(n.by)}</div>` : ''}</div>`).join('')}</div>`;
    const head = this.el.querySelector('.qb-head'); if (head) head.insertAdjacentHTML('afterend', html);
  };
}

// ---- the land, shaped to the story -----------------------------------------------------------------------------------
// C.lands: [{ at, r, fade, kind: 'raise'|'mountain'|'marsh'|'lake'|'basin'|'forest'|'hills', h, floor, level, depth, rim,
//             biome, temp, humid, surface: [blocks], deco: [[block, chance]], crater: { r, depth, lava } }]
// every town and place gets dry ground under it too
const CAMP_BIOME = { ocean: 0, beach: 1, plains: 2, forest: 3, desert: 4, taiga: 5, mountains: 6 };
function campLandsOf(gen) {
  const C = campGenDef(); if (!C) return null;
  if (gen._campLands && gen._campLandsFor === C.id) return gen._campLands;
  const L = [];
  for (const T of Object.values(C.towns)) L.push({ at: T.at, r: T.groundR || (T.size === 'large' ? 100 : T.size === 'small' ? 52 : 72), fade: 36, kind: 'raise', floor: 4, auto: true });
  for (const P of Object.values(C.places)) if (!P.noGround) L.push({ at: P.at, r: P.kind === 'dungeon' ? 34 : (P.size || 9) + 16, fade: 26, kind: 'raise', floor: 3, auto: true });
  for (const l of C.lands || []) L.push(Object.assign({ fade: 30 }, l));
  for (const l of L) { l.R = l.r + l.fade; l.R2 = l.R * l.R; }
  gen._campLands = L; gen._campLandsFor = C.id;
  return L;
}
function campLandW(l, d) { return d <= l.r ? 1 : d >= l.R ? 0 : 1 - smoothstep(l.r, l.R, d); }
{
  const baseCol = WorldGen.prototype.column;
  WorldGen.prototype.column = function (x, z) {
    const c = baseCol.call(this, x, z);
    if (this.dim !== 0) return c;
    const L = campLandsOf(this); if (!L || !L.length) return c;
    let out = null;
    for (const l of L) {
      const dx = x - l.at[0], dz = z - l.at[1], d2 = dx * dx + dz * dz;
      if (d2 >= l.R2) continue;
      const d = Math.sqrt(d2), w = campLandW(l, d);
      if (w <= 0) continue;
      if (!out) out = { h: c.h, biome: c.biome, temp: c.temp, humid: c.humid, river: c.river };
      const n = this.nDetail.noise2(x / 23, z / 23);
      switch (l.kind) {
        case 'raise': { const want = SEA + (l.floor || 3) + (l.noise ? Math.round(n * 1.5) : 0); if (out.h < want) out.h = Math.round(out.h + (want - out.h) * w); break; }
        case 'mountain': {
          const k = Math.max(0, 1 - d / l.R), cone = Math.pow(k, 1.35) * (l.h || 50);
          let h = Math.max(out.h, Math.round(SEA + 6 + cone + n * 3 * k));
          if (l.crater && d < l.crater.r) { const top = Math.round(SEA + 6 + Math.pow(1 - l.crater.r / l.R, 1.35) * (l.h || 50)); h = Math.min(h, top - l.crater.depth + Math.round((d / l.crater.r) * l.crater.depth * 0.6)); }
          out.h = Math.min(CH - 8, h);
          break;
        }
        case 'marsh': { const want = SEA + Math.round(n * 1.6 - 0.2); out.h = Math.round(out.h + (want - out.h) * w); break; }
        case 'lake': { const want = SEA - (l.depth || 5); out.h = Math.round(out.h + (want - out.h) * Math.min(1, w * 1.3)); break; }
        case 'basin': {
          const want = SEA + (l.level || 6) + Math.round(n * 2);
          const rimK = Math.exp(-Math.pow((d - l.r) / 9, 2)) * (l.rim || 0);
          out.h = Math.round(out.h + (want - out.h) * (d < l.r ? 1 : w) + rimK);
          break;
        }
        case 'hills': { const r = 1 - Math.abs(this.nRidge.fbm2(x / 70, z / 70, 2)); out.h = Math.round(Math.max(out.h, SEA + 4) + r * r * (l.h || 20) * w); break; }
        default: break;
      }
      if (l.temp != null) out.temp = out.temp + (l.temp - out.temp) * w;
      if (l.humid != null) out.humid = out.humid + (l.humid - out.humid) * w;
      if (l.biome && w > 0.45 && CAMP_BIOME[l.biome] != null) out.biome = CAMP_BIOME[l.biome];
    }
    if (!out) return c;
    if (out.h < SEA - 1) { if (out.biome !== CAMP_BIOME.forest || !L.some(l => l.kind === 'marsh' && Math.hypot(x - l.at[0], z - l.at[1]) < l.R)) out.biome = BIOME.OCEAN; }
    else if (out.h > SEA + 1 && (out.biome === BIOME.OCEAN || out.biome === BIOME.BEACH)) out.biome = out.temp < -0.3 ? BIOME.TAIGA : BIOME.PLAINS;
    if (out.h > SEA && out.river) out.river = 0;
    return out;
  };
  // the surface: ash on the mountain, mud in the marsh, flowers in the vale; lily pads, cattails, lava in the crater
  const baseGen = WorldGen.prototype.generate;
  WorldGen.prototype.generate = function (ch) {
    const r = baseGen.call(this, ch);
    if (this.dim !== 0) return r;
    try {
      const L = campLandsOf(this); if (!L) return r;
      const bx = ch.cx * 16, bz = ch.cz * 16;
      const near = L.filter(l => !l.auto && (l.surface || l.deco || l.crater || l.lily) && Math.abs(bx + 8 - l.at[0]) < l.R + 12 && Math.abs(bz + 8 - l.at[1]) < l.R + 12);
      if (!near.length) return r;
      const NATURAL = new Set(['grass', 'dirt', 'snowy_grass', 'sand', 'stone', 'gravel', 'coarse_dirt', 'clay', 'podzol', 'sandstone'].map(k => B[k]).filter(v => v !== undefined));
      for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
        const x = bx + lx, z = bz + lz;
        for (const l of near) {
          const d = Math.hypot(x - l.at[0], z - l.at[1]); if (d >= l.R) continue;
          const w = campLandW(l, d), q = hashFloat(x, z, this.seed, 71);
          if (q > w + 0.1) continue;
          const col = this.column(x, z), h = col.h;
          if (h < 1 || h >= CH - 2) continue;
          const i = cidx(lx, h, lz), top = ch.blocks[i];
          if (l.surface && NATURAL.has(top)) { const k = l.surface[Math.floor(hashFloat(x, z, this.seed, 72) * l.surface.length)]; if (B[k] !== undefined) ch.blocks[i] = B[k]; }
          if (l.crater && d < l.crater.r && l.crater.lava) { const lv = h + (l.crater.lava || 2); for (let y = h + 1; y <= lv && y < CH; y++) if (!ch.blocks[cidx(lx, y, lz)]) ch.blocks[cidx(lx, y, lz)] = B.lava; }
          const above = h + 1 < CH ? ch.blocks[cidx(lx, h + 1, lz)] : 1;
          if (l.deco && !above && h >= SEA) for (const [k, chance] of l.deco) { if (B[k] !== undefined && hashFloat(x, z, this.seed, 73 + k.length) < chance * w) { ch.blocks[cidx(lx, h + 1, lz)] = B[k]; break; } }
          if (l.lily && h < SEA && B.lily_pad !== undefined && !ch.blocks[cidx(lx, SEA + 1, lz)] && hashFloat(x, z, this.seed, 79) < l.lily * w) ch.blocks[cidx(lx, SEA + 1, lz)] = B.lily_pad;
          break;
        }
      }
      ch.recomputeMaxY();
    } catch (e) { console.warn('campaign land', e); }
    return r;
  };
}

// ---- more kinds of sites -----------------------------------------------------------------------------------------------
const CAMP_SITE_KINDS = {};
{
  const baseSite = campBuildSite;
  campBuildSite = function (P, S) {
    const fn = CAMP_SITE_KINDS[S.site];
    if (fn) { try { fn(P, S, S.P || {}); } catch (e) { console.warn('site', S.site, e); } if (S.P && S.P.boss && !S.bossAt) S.bossAt = [S.x, S.y, S.z + 3]; return; }
    return baseSite(P, S);
  };
}
function csHas(k) { return B[k] !== undefined; }
function csKey(k, alt) { return csHas(k) ? k : alt; }
function csClear(P, x, y, z, r, h, floor) {
  for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dz * dz > r * r + 1) continue;
    const gx = x + dx, gz = z + dz, gh = P.ground(gx, gz);
    for (let yy = y; yy <= Math.max(gh, y) + h; yy++) P.put(gx, yy, gz, 'air');
    for (let yy = Math.min(gh, y) - 1; yy < y; yy++) P.put(gx, yy, gz, yy === y - 1 ? (floor || 'grass') : 'dirt');
  }
}
function csTree(P, x, y, z, o) {
  // a great tree: a thick trunk, roots fanned out over the ground, a wide crown (or a weeping one)
  const log = o.log || 'log', leaves = o.leaves || 'leaves', H = o.h || 14, T = o.trunk || 1;
  for (let yy = y; yy < y + H; yy++) for (let dz = -T; dz <= T; dz++) for (let dx = -T; dx <= T; dx++) if (Math.abs(dx) + Math.abs(dz) <= T + (yy < y + 3 ? 1 : 0)) P.put(x + dx, yy, z + dz, log);
  for (let a = 0; a < (o.roots || 7); a++) {
    const t = a / (o.roots || 7) * TAU + 0.4, L = 4 + Math.floor(P.h(a, 11, x) * 4);
    for (let k = T; k <= T + L; k++) { const rx = x + Math.round(Math.cos(t) * k), rz = z + Math.round(Math.sin(t) * k); P.put(rx, y + (k < T + 2 ? 1 : 0), rz, log); P.put(rx, y, rz, log); }
  }
  const cy = y + H - 2, R = o.crown || 6;
  for (let dy = -3; dy <= 3; dy++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const dd = dx * dx + dz * dz + dy * dy * 3; if (dd > R * R) continue;
    if (P.h(x + dx, cy + dy, z + dz) < 0.12) continue;
    if (!P.get || !P.get(x + dx, cy + dy, z + dz)) P.put(x + dx, cy + dy, z + dz, leaves);
  }
  if (o.weep) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const dd = Math.hypot(dx, dz); if (dd < R - 2.2 || dd > R + 0.3 || P.h(dx, 13, dz) < 0.35) continue;
    const len = 3 + Math.floor(P.h(dx, 14, dz) * (H - 6));
    for (let k = 1; k <= len; k++) { const yy = cy - 2 - k; if (yy <= y) break; P.put(x + dx, yy, z + dz, o.weep); }
  }
}
// Razorwood's great tree, the sigil burned into a root
CAMP_SITE_KINDS.sigil_tree = (P, S, A) => {
  const { x, y, z, R } = S;
  csClear(P, x, y, z, R, 18, csKey('moss_block', 'grass'));
  csTree(P, x, y, z, { log: csKey('dark_oak_log', 'log'), leaves: csKey('dark_oak_leaves', 'leaves'), h: 16, trunk: 1, roots: 9, crown: 7 });
  // offerings: stacked stones in a hollow, a dead music box
  for (const [dx, dz] of [[-4, 4], [-5, 3], [4, 5]]) { P.put(x + dx, y, z + dz, 'cobblestone_wall' in B ? 'cobblestone_wall' : 'cobblestone'); P.put(x + dx, y + 1, z + dz, csKey('mossy_cobblestone_wall', 'mossy_cobblestone')); }
  P.put(x - 3, y, z + 5, csKey('note_block', 'chest'));
  for (let k = 0; k < 10; k++) { const a = P.h(k, 3, 7) * TAU, r = 3 + P.h(k, 4, 7) * (R - 3); P.put(x + Math.round(Math.cos(a) * r), y, z + Math.round(Math.sin(a) * r), csKey('dead_bush', 'fern')); }
};
// the Weeping Willow in its bowl of old stone, sap pools at its feet, a broken ring of druid stones
CAMP_SITE_KINDS.willow = (P, S, A) => {
  const { x, y, z, R } = S;
  csClear(P, x, y, z, R, 22, csKey('moss_block', 'grass'));
  for (let dz = -R + 1; dz <= R - 1; dz++) for (let dx = -R + 1; dx <= R - 1; dx++) { const d = Math.hypot(dx, dz); if (d > R - 1) continue; if (d > R - 3) P.put(x + dx, y - 1, z + dz, csKey('mossy_stone_bricks', 'mossy_cobblestone')); }
  for (const [dx, dz] of [[4, 2], [-3, 4], [2, -4], [-4, -2]]) { P.put(x + dx, y - 1, z + dz, 'water'); P.put(x + dx + 1, y - 1, z + dz, 'water'); P.put(x + dx, y, z + dz, 'air'); P.put(x + dx + 1, y - 2, z + dz, csKey('orange_stained_glass', 'clay')); }
  csTree(P, x, y, z, { log: csKey('mangrove_log', 'log'), leaves: csKey('mangrove_leaves', 'leaves'), h: 15, trunk: 1, roots: 8, crown: 8, weep: csKey('weeping_vines', 'vine') });
  for (let a = 0; a < 7; a++) { if (a === 2 || a === 5) continue; const t = a / 7 * TAU, sx = x + Math.round(Math.cos(t) * (R - 2)), sz = z + Math.round(Math.sin(t) * (R - 2)); for (let k = 0; k < 2 + (a % 2); k++) P.put(sx, y + k, sz, csKey('mossy_stone_bricks', 'mossy_cobblestone')); }
};
// the Druidic Circle of Echoes: seven standing stones, totems, an altar in the middle
CAMP_SITE_KINDS.echo_circle = (P, S, A) => {
  const { x, y, z, R } = S;
  csClear(P, x, y, z, R, 8, csKey('moss_block', 'grass'));
  for (let a = 0; a < 7; a++) {
    const t = a / 7 * TAU, sx = x + Math.round(Math.cos(t) * (R - 2)), sz = z + Math.round(Math.sin(t) * (R - 2)), hh = a === 6 ? 2 : 4;
    for (let k = 0; k < hh; k++) P.put(sx, y + k, sz, k === hh - 1 ? csKey('chiseled_stone_bricks', 'stone_bricks') : csKey('mossy_stone_bricks', 'mossy_cobblestone'));
    if (a !== 6) P.put(sx, y + hh, sz, csKey('moss_carpet', 'air'));
  }
  for (const [dx, dz] of [[R - 1, R - 1], [-R + 1, R - 1], [R - 1, -R + 1], [-R + 1, -R + 1]]) { for (let k = 0; k < 3; k++) P.put(x + dx, y + k, z + dz, csKey('stripped_oak_log', 'log')); P.put(x + dx, y + 3, z + dz, csKey('jack_o_lantern', 'lantern')); }
  P.put(x, y - 1, z, csKey('chiseled_stone_bricks', 'stone_bricks'));
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) P.put(x + dx, y - 1, z + dz, csKey('cracked_stone_bricks', 'stone_bricks'));
};
// a crumbling arch of living rootstone, standing alone (the Echo Gate)
CAMP_SITE_KINDS.gate = (P, S, A) => {
  const { x, y, z, R } = S;
  csClear(P, x, y, z, R, 10, csKey('podzol', 'grass'));
  const log = csKey('mangrove_log', 'log'), moss = csKey('moss_block', 'mossy_cobblestone');
  for (let k = 0; k < 7; k++) { P.put(x - 3, y + k, z, k % 3 === 2 ? moss : log); P.put(x + 3, y + k, z, k % 3 === 1 ? moss : log); }
  for (let dx = -3; dx <= 3; dx++) { P.put(x + dx, y + 7, z, log); if (Math.abs(dx) < 3) P.put(x + dx, y + 8, z, moss); }
  for (let dx = -2; dx <= 2; dx++) for (let k = 0; k < 7; k++) P.put(x + dx, y + k, z, 'air');
  if (csHas('weeping_vines')) for (let dx = -2; dx <= 2; dx += 2) P.put(x + dx, y + 6, z, 'weeping_vines');
};
// a sinkhole rimmed with pale roots, a glyph at the bottom (the spiral glyphs at the Veil's edge)
CAMP_SITE_KINDS.sinkhole = (P, S, A) => {
  const { x, y, z, R } = S;
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const d = Math.hypot(dx, dz); if (d > R) continue;
    const gx = x + dx, gz = z + dz, gh = P.ground(gx, gz), depth = Math.max(0, Math.round((1 - d / R) * 4));
    for (let yy = y - depth; yy <= Math.max(gh, y) + 6; yy++) P.put(gx, yy, gz, 'air');
    P.put(gx, y - depth - 1, gz, d < 2 ? csKey('calcite', 'stone') : csKey('podzol', 'dirt'));
    if (d > R - 1.2 && P.h(gx, 5, gz) < 0.5) P.put(gx, y - depth, gz, csKey('stripped_birch_log', 'birch_log'));
  }
};
// a wooden pier out over the water, tether stumps along it (Stillwater's docks)
CAMP_SITE_KINDS.dock = (P, S, A) => {
  const { x, z } = S, y = SEA + 1, L = A.length || 14, dir = A.dir || [0, 1];
  for (let t = -2; t <= L; t++) for (let s = -1; s <= 1; s++) {
    const gx = x + dir[0] * t + (dir[1] ? s : 0), gz = z + dir[1] * t + (dir[0] ? s : 0);
    P.put(gx, y - 1, gz, csKey('spruce_planks', 'planks'));
    for (let yy = y; yy < y + 4; yy++) P.put(gx, yy, gz, 'air');
    if (Math.abs(s) === 1 && t % 3 === 0) { for (let yy = y - 6; yy < y - 1; yy++) P.put(gx, yy, gz, csKey('spruce_log', 'log')); P.put(gx, y, gz, csKey('spruce_log', 'log')); P.put(gx, y + 1, gz, csKey('chain', 'oak_fence')); }
  }
};
// an island in a still lake, and under it a dry dome of old stone with an altar (the drowned altar)
CAMP_SITE_KINDS.drowned_altar = (P, S, A) => {
  const { x, z } = S, top = SEA + 1, floor = SEA - 12;
  for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) { if (dx * dx + dz * dz > 17) continue; for (let yy = SEA - 3; yy < top; yy++) P.put(x + dx, yy, z + dz, yy === top - 1 ? csKey('moss_block', 'grass') : 'stone'); }
  // the dome
  const R = 6, prism = csKey('prismarine_bricks', 'stone_bricks'), dark = csKey('dark_prismarine', 'stone_bricks');
  for (let yy = floor - 1; yy <= floor + R; yy++) for (let dz = -R - 1; dz <= R + 1; dz++) for (let dx = -R - 1; dx <= R + 1; dx++) {
    const d = Math.hypot(dx, dz, Math.max(0, yy - floor - 2) * 1.2);
    if (d > R + 1) continue;
    P.put(x + dx, yy, z + dz, d > R || yy === floor - 1 ? (yy === floor - 1 ? dark : prism) : 'air');
  }
  // the stair down from the island
  for (let k = 0; k < top - floor; k++) { const sx = x + 2, sz = z - 2 + (k % 4) - 1; P.put(sx, top - k - 1, z - 2, 'air'); P.put(sx, top - k, z - 2, 'air'); }
  for (let yy = floor; yy < top; yy++) { P.put(x + 2, yy, z - 2, 'air'); P.put(x + 2, yy, z - 3, 'ladder'); }
  P.put(x + 2, top, z - 3, csKey('oak_trapdoor', 'air'));
  P.put(x, floor, z, csKey('chiseled_stone_bricks', 'stone_bricks')); P.put(x, floor + 1, z, csKey('sea_lantern', 'glowstone'));
  for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4]]) P.put(x + dx, floor, z + dz, csKey('sea_lantern', 'glowstone'));
  S.bossAt = [x, floor, z + 3];
};
// a crag-top nest of branches and hay (the phoenix roost)
CAMP_SITE_KINDS.nest = (P, S, A) => {
  const { x, y, z, R } = S;
  csClear(P, x, y, z, R, 8, csKey('coarse_dirt', 'gravel'));
  for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) { const d = Math.hypot(dx, dz); if (d > 4.3) continue; if (d > 3) { P.put(x + dx, y, z + dz, csKey('dark_oak_log', 'log')); if (P.h(dx, 1, dz) < 0.5) P.put(x + dx, y + 1, z + dz, 'hay_bale'); } else P.put(x + dx, y - 1, z + dz, 'hay_bale'); }
  P.put(x, y, z, csKey('magma_block', 'netherrack')); P.put(x + 1, y, z - 1, csKey('magma_block', 'netherrack'));
  P.chest(x - 1, y, z + 1, 0, A.loot || 'ruin');
};
// a broken cart lodged in a ditch by the road
CAMP_SITE_KINDS.cart = (P, S, A) => {
  const { x, y, z } = S;
  csClear(P, x, y, z, 5, 4, 'coarse_dirt' in B ? 'coarse_dirt' : 'dirt');
  const pl = csKey('spruce_planks', 'planks');
  for (let dx = -1; dx <= 2; dx++) for (let dz = 0; dz <= 1; dz++) P.put(x + dx, y, z + dz, pl);
  P.put(x - 1, y + 1, z, csKey('spruce_fence', 'oak_fence')); P.put(x + 2, y + 1, z + 1, 'barrel');
  P.put(x + 3, y, z - 1, csKey('spruce_trapdoor', pl)); P.put(x - 2, y, z + 2, csKey('spruce_slab', pl));
  P.put(x + 1, y, z + 3, 'bone_block' in B ? 'bone_block' : 'gravel');
};
// a vault face in the mountain: an obsidian wall with the seal in it, three basalt pillars before it
CAMP_SITE_KINDS.vault = (P, S, A) => {
  const { x, y, z, R } = S;
  csClear(P, x, y, z, R, 9, csKey('blackstone', 'cobblestone'));
  const ob = csKey('obsidian', 'stone'), cry = csKey('crying_obsidian', ob), bas = csKey('basalt', 'stone');
  for (let dx = -4; dx <= 4; dx++) for (let k = 0; k < 7; k++) P.put(x + dx, y + k, z - 4, (dx === 0 && (k === 2 || k === 3)) ? cry : (Math.abs(dx) === 1 && k === 3 ? csKey('magma_block', ob) : ob));
  for (const [dx, dz] of [[-3, -1], [0, 1], [3, -1]]) for (let k = 0; k < 3; k++) P.put(x + dx, y + k, z + dz, bas);
  for (let k = 0; k < 8; k++) { const a = P.h(k, 2, 9) * TAU, r = 2 + P.h(k, 3, 9) * (R - 2); P.put(x + Math.round(Math.cos(a) * r), y - 1, z + Math.round(Math.sin(a) * r), csKey('magma_block', 'netherrack')); }
};
// the cradle grove: pale trees, an ash tree hollowed into a cradle, flowers and old toys, mirrored glyphs on stones
CAMP_SITE_KINDS.cradle = (P, S, A) => {
  const { x, y, z, R } = S;
  csClear(P, x, y, z, R, 12, csKey('moss_block', 'grass'));
  const pale = csKey('stripped_birch_log', 'birch_log'), cradle = csKey('stripped_dark_oak_log', 'log');
  for (let a = 0; a < 9; a++) { const t = a / 9 * TAU, sx = x + Math.round(Math.cos(t) * (R - 1)), sz = z + Math.round(Math.sin(t) * (R - 1)); for (let k = 0; k < 6; k++) P.put(sx, y + k, sz, pale); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) P.put(sx + dx, y + 6, sz + dz, csKey('azalea_leaves', 'leaves')); }
  for (let dx = -2; dx <= 2; dx++) { P.put(x + dx, y, z + 3, cradle); P.put(x + dx, y + 1, z + 4, cradle); }
  P.put(x - 2, y + 1, z + 3, cradle); P.put(x + 2, y + 1, z + 3, cradle); P.put(x - 2, y + 2, z + 4, cradle); P.put(x + 2, y + 2, z + 4, cradle);
  for (const [dx, dz] of [[-4, -2], [4, -2], [0, -5]]) { P.put(x + dx, y, z + dz, csKey('crying_obsidian', 'obsidian')); }
  for (let k = 0; k < 14; k++) { const a = P.h(k, 6, 3) * TAU, r = 1 + P.h(k, 7, 3) * (R - 2); const gx = x + Math.round(Math.cos(a) * r), gz = z + Math.round(Math.sin(a) * r); P.put(gx, y, gz, k % 4 === 0 ? csKey('candle', 'torch') : P.pick(VFLOWERS.filter(b => B[b] !== undefined), gx, y, gz)); }
};
// a lone standing stone, carved and worn (a grave-marker, a waystone of the old roads)
CAMP_SITE_KINDS.stone = (P, S, A) => {
  const { x, y, z } = S;
  csClear(P, x, y, z, 4, 6, A.floor || 'grass');
  for (let k = 0; k < (A.height || 4); k++) P.put(x, y + k, z, k === 2 ? csKey('chiseled_stone_bricks', 'stone_bricks') : csKey('mossy_stone_bricks', 'mossy_cobblestone'));
};
// a tall white tree, names cut into its bark (the Tree of Silent Names)
CAMP_SITE_KINDS.white_tree = (P, S, A) => {
  const { x, y, z, R } = S;
  csClear(P, x, y, z, R, 16, csKey('podzol', 'grass'));
  csTree(P, x, y, z, { log: csKey('stripped_birch_log', 'birch_log'), leaves: csKey('white_wool', 'wool'), h: 13, trunk: 0, roots: 6, crown: 4 });
};

// ---- a controller everywhere the story puts something on screen (alpha 2) ---------------------------------------------
// A letter opens as a window the controller owns (B closes it, left/right turns its pages), the same as a book from a
// shelf; the narration takes A (or Start) to turn the page and B to skip to its end; the journal takes LB/RB for its
// tabs, the d-pad to pick a letter (or scroll), and A to read it.
function campOpenBook(lp, key) {
  if (!lp) return null;
  // in the middle of a conversation: the letter opens once it's over
  if (lp.npcUI && !(lp.npcUI instanceof BookUI)) {
    const t0 = Date.now(), wait = () => { if (!lp.npcUI && lp.mode === 'play') campOpenBook(lp, key); else if (Date.now() - t0 < 20000) setTimeout(wait, 150); };
    setTimeout(wait, 150); return null;
  }
  if (lp.openNpcUI && lp.mode === 'play' && !lp.npcUI) { lp.openNpcUI(() => new BookUI(lp, key)); return lp.npcUI; }
  const b = new BookUI(lp, key);
  if (!lp.npcUI) { lp.npcUI = b; lp.mode = 'npc'; }
  return b;
}
{
  const baseNav = UI.prototype.menuNav;
  UI.prototype.menuNav = function (events) {
    const N = CAMP_RT.narrating;
    if (N && N.el && N.el.isConnected && events.length) {
      for (const ev of events) {
        if (ev.type === 'ok' || ev.type === 'start') { this.g.sfx.play('click'); N.next(); }
        else if (ev.type === 'back') { this.g.sfx.play('click'); N.finish(); }
        if (!CAMP_RT.narrating) break;
      }
      // the story told, back to the game it paused
      if (!CAMP_RT.narrating && this.g.state === 'paused' && this.g.resume) this.g.resume();
      return;
    }
    return baseNav.call(this, events);
  };
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const N = CAMP_RT.narrating;
    if (N && N.el && N.el.isConnected && inp && inp.fromPad) {
      if (inp.padA || inp.padStart) { this.g.sfx.play('click'); N.next(); }
      else if (inp.padB) { this.g.sfx.play('click'); N.finish(); }
      inp = InputManager.blankState();
    }
    if (this.journalEl && campDef(this.g) && inp && (inp.padLB || inp.padRB || inp.navY || inp.navX || inp.padA)) {
      const tabs = ['quests', 'people', 'places', 'letters', 'log'], cur = this._jnTab || 'quests';
      if (inp.padLB || inp.padRB) { const t = tabs[(tabs.indexOf(cur) + (inp.padRB ? 1 : -1) + tabs.length) % tabs.length]; this._jnSel = 0; this.openCampJournal(t); this.g.sfx.play('tick'); }
      else {
        const L = [...this.journalEl.querySelectorAll('[data-letter]')], body = this.journalEl.querySelector('.jn-body');
        if (L.length && (inp.navY || inp.navX)) { this._jnSel = Math.max(0, Math.min(L.length - 1, (this._jnSel || 0) + (inp.navY || inp.navX))); }
        else if (body && inp.navY) body.scrollTop += inp.navY * 90;
        L.forEach((e, i) => e.classList.toggle('padfocus', i === (this._jnSel || 0)));
        const f = L[this._jnSel || 0]; if (f && f.scrollIntoView) f.scrollIntoView({ block: 'nearest' });
        if (inp.padA && f) { const k = f.dataset.letter; this.closeJournal(); campOpenBook(this, k); }
      }
      inp = InputManager.blankState();
    }
    return baseUpd.call(this, dt, inp);
  };
  // the journal remembers which tab it is on (for LB/RB)
  const baseJ = LocalPlayer.prototype.openCampJournal;
  if (baseJ) LocalPlayer.prototype.openCampJournal = function (tab, ...rest) { this._jnTab = tab || 'quests'; return baseJ.call(this, tab, ...rest); };
}
