// ---------------------------------------------------------------------------
// campaign/companions.js — (alpha 3) sellswords for hire.
//
// Every innkeeper knows someone looking for work: ask them (talk, "Hire a sellsword…") and pick from who's in town today:
// a shield-bearer, a bowman or a hedge-healer, each with a name and a manner. They follow you, fight what threatens you,
// a healer patches you up, and they ask their wage at every long rest (gold pieces, by their level). Can't pay, and they
// leave. Talk to them to send them home, tell them to wait here or follow again. Up to two at once.
// ---------------------------------------------------------------------------

const HIRE_KINDS = {
  shield: { title: 'Shield-bearer', base: 'village_guard', held: 'iron_sword', armor: ['iron_helmet', 'iron_chestplate', 'iron_leggings', 'iron_boots'], hp: 30, damage: 5, wage: 4, blurb: 'Steady, stubborn, hard to knock down.' },
  bow: { title: 'Bowman', base: 'village_guard', held: 'bow', armor: ['leather_helmet', 'leather_chestplate', 'leather_leggings', 'leather_boots'], hp: 22, damage: 4, ranged: true, wage: 4, blurb: 'Keeps back and keeps shooting.' },
  healer: { title: 'Hedge-healer', base: 'village_guard', held: 'druid_staff', armor: ['leather_helmet', null, null, 'leather_boots'], hp: 18, damage: 2, heals: true, wage: 5, blurb: 'Knows herbs, and a little of the old words.' },
};
const HIRE_FIRST = ['Brann', 'Tamsin', 'Oswin', 'Rhea', 'Corvin', 'Elsbet', 'Hadric', 'Mirela', 'Dunstan', 'Yara', 'Fennick', 'Isolde', 'Garrow', 'Wren', 'Torvald', 'Saoirse'];
const HIRE_LAST = ['Oakshield', 'Greyfletch', 'Marrow', 'Ashdown', 'Brightwater', 'Holloway', 'Thistle', 'Stonebrook', 'Vane', 'Larkspur'];
const HIRE_LINES = { hello: ['Coin first, then we talk.', 'Need a blade? I\'m cheaper than a funeral.', 'I\'ve walked every road from here to Thornmere.'], join: ['Lead on.', 'Right behind you.', 'Let\'s earn my keep.'], paid: ['Fair pay. On we go.', 'That\'ll do.'], unpaid: ['No coin, no company. Good luck out there.'] };
{
  for (const k of Object.keys(HIRE_KINDS)) { const K = HIRE_KINDS[k], base = MOB_TYPES[K.base] || MOB_TYPES.raider || {}; MOB_TYPES['hire_' + k] = Object.assign({}, base, { label: 'a ' + K.title.toLowerCase(), npc: false, guard: false, hostile: false, hp: K.hp, damage: K.damage, special: true, hireling: k, noDismember: true }); }
}
function hireState(g) { const M = g.meta; return M.hires || (M.hires = { list: [], day: -1 }); }
// who's in this town today (changes each day)
function hireOffers(g, vid) {
  const day = Math.floor(g.meta.day || 0), out = [], ks = Object.keys(HIRE_KINDS), lv = Math.max(1, ...g.locals.map(l => (dndOf(l.player) || { level: 1 }).level));
  for (let i = 0; i < 3; i++) {
    const h = hash32(String(vid).length * 97 + i, day, 31, 7);
    const kind = ks[(h >>> 3) % ks.length], name = HIRE_FIRST[(h >>> 7) % HIRE_FIRST.length] + ' ' + HIRE_LAST[(h >>> 13) % HIRE_LAST.length];
    out.push({ id: vid + ':' + day + ':' + i, kind, name, level: Math.max(1, lv - 1 + ((h >>> 17) % 2)) });
  }
  return out.filter(o => !hireState(g).list.some(x => x.id === o.id));
}
function hireWage(o) { return HIRE_KINDS[o.kind].wage + o.level * 2; }
function goldCount(p) { let n = 0; for (const s of p.inv.main.slots) if (s && s.id === 'gold_coin') n += s.n; return n; }
function hireSpawn(g, lp, o, at) {
  const K = HIRE_KINDS[o.kind], P = lp.player;
  const m = new Mob(g, 'hire_' + o.kind, (at ? at[0] : P.x + 1.2), at ? at[1] : P.y, at ? at[2] : P.z + 1.2);
  m.owner = lp.name; m.tamed = true; m.kept = true; m.petName = o.name; m.hireId = o.id;
  m.heldItem = K.held && ITEMS[K.held] ? K.held : null; m.npcArmor = K.armor.map(a => a && ITEMS[a] ? a : null);
  m.maxHealth = m.health = K.hp + o.level * 5;
  g.addEntity(m);
  return m;
}
// the innkeeper's offer
{
  const baseHome = NpcTalk.prototype.home;
  NpcTalk.prototype.home = function (text) {
    baseHome.call(this, text);
    try {
      if (!(this.job === 'innkeeper' || this.job === 'barkeep' || (this.e && this.e.npc && /inn|tavern/.test(String(this.e.npc.j))))) return;
      const g = this.g, lp = this.lp, o = this.el.querySelector('.nt-opts'); if (!o) return;
      const b = document.createElement('button'); b.className = 'btn nt-opt'; b.innerHTML = '<i>⚔</i>Hire a sellsword…';
      b.onclick = () => { g.sfx.play('click'); this.close(); hireOpen(lp, this.e.npc.v); };
      o.insertBefore(b, o.lastChild);
    } catch (e) { /* no offer */ }
  };
}
function hireOpen(lp, vid) {
  const g = lp.g, S = hireState(g), offers = hireOffers(g, vid);
  dndOpenPicker(lp, {
    title: 'Sellswords in town today', status: () => `With you: ${S.list.length}/2 · you carry ${goldCount(lp.player)} gp`,
    rows: () => offers.map(o => { const K = HIRE_KINDS[o.kind]; return { id: o.id, label: `${o.name}, ${K.title} (level ${o.level})`, sub: `${K.blurb} ${hireWage(o)} gp a day, paid at every long rest; the first day up front.` }; }),
    pick: (r) => {
      const o = offers.find(x => x.id === r.id); if (!o) return false;
      if (S.list.length >= 2) { lp.toast('Two sellswords is all the road will feed', 'warn'); return false; }
      const w = hireWage(o);
      if (goldCount(lp.player) < w) { lp.toast(`${o.name}: “${w} gold up front. Come back when you have it.”`, 'warn'); return false; }
      lp.player.inv.remove('gold_coin', w);
      S.list.push(Object.assign({ owner: lp.name }, o));
      hireSpawn(g, lp, o);
      lp.toast(`${o.name}: “${HIRE_LINES.join[Math.floor(Math.random() * 3)]}”`, 'good');
      return true;
    },
    hint: 'A to hire · B to leave',
  });
}
// following, fighting, healing; coming back after a load; waiting when told
{
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (this.T && this.T.hireling && !this.game.isGuest) {
      const g = this.game, o = this.ownerPawn && this.ownerPawn(), K = HIRE_KINDS[this.T.hireling];
      if ((this._hT = (this._hT || 0) - dt) <= 0 && o) {
        this._hT = 0.5;
        if (!this.petFoe || !this.petFoe.alive) {
          let best = null, bd = 16;
          for (const e of g.entities) if (e instanceof Mob && e !== this && e.alive && e.T.hostile && !e.owner && !e.npc && !e.dndSummonBy) { const d = Math.hypot(e.x - o.x, e.z - o.z); if (d < bd) { bd = d; best = e; } }
          this.petFoe = best;
        }
        // the bowman shoots from where he stands
        if (K.ranged && this.petFoe && Math.hypot(this.petFoe.x - this.x, this.petFoe.z - this.z) < 18 && (this._shotT = (this._shotT || 0) - 0.5) <= 0) {
          this._shotT = 1.6; const f = this.petFoe, d = Math.hypot(f.x - this.x, f.z - this.z);
          try { if (typeof Arrow === 'function') { const a = new Arrow(g, this.x, this.y + 1.5, this.z, (f.x - this.x) / d * 1.6, 0.18 + d * 0.012, (f.z - this.z) / d * 1.6, this, K.damage + 1, false); g.addEntity(a); g.sfx.playAt('bow', this.x, this.y + 1, this.z); } else f.hurt(K.damage, { attacker: this }); } catch (e) { f.hurt(K.damage, { attacker: this }); }
        }
        // the healer mends whoever's hurt worst
        if (K.heals && (this._healT = (this._healT || 0) - 0.5) <= 0) {
          let w = null, wf = 0.7;
          for (const l of g.locals) { const p = l.player; if (!p.dead && Math.hypot(p.x - this.x, p.z - this.z) < 10 && p.health / p.maxHealth < wf) { wf = p.health / p.maxHealth; w = l; } }
          if (w) { this._healT = 9; dndHeal(w, dndRoll(1, 8).total + 2); spellFx(g, w.player.x, w.player.y + 1, w.player.z, 'mana_heal', 20, 1); w.toast(`${this.petName} patches you up`, 'good'); }
        }
      }
      if (K.ranged && this.petFoe && Math.hypot(this.petFoe.x - this.x, this.petFoe.z - this.z) < 12) { const r = baseUpd.call(this, dt); this.vx *= 0.3; this.vz *= 0.3; return r; }
    }
    return baseUpd.call(this, dt);
  };
  // pay day: at every long rest
  if (typeof dndDoRest === 'function') {
    const baseRest = dndDoRest;
    dndDoRest = function (lp, kind, ...a) {
      const r = baseRest(lp, kind, ...a);
      try {
        if (kind === 'long' || kind === 'camp') {
          const g = lp.g, S = hireState(g), day = Math.floor(g.meta.day || 0);
          if (S.day !== day && lp === g.locals[0]) {
            S.day = day;
            for (const o of S.list.slice()) {
              const owner = g.locals.find(l => l.name === o.owner) || lp, w = hireWage(o);
              if (goldCount(owner.player) >= w) { owner.player.inv.remove('gold_coin', w); owner.toast(`${o.name} takes ${w} gp: “${HIRE_LINES.paid[day % 2]}”`, ''); }
              else { S.list.splice(S.list.indexOf(o), 1); const m = g.entities.find(e => e.hireId === o.id); if (m) m.remove = true; owner.toast(`${o.name}: “${HIRE_LINES.unpaid[0]}”`, 'warn'); }
            }
          }
        }
      } catch (e) { /* no pay day */ }
      return r;
    };
  }
  // after a load (or a long way away), they catch up with you
  const baseEU = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) {
    try {
      if (!this.isGuest && this.meta && this.meta.hires && (this._hireT = (this._hireT || 0) - dt) <= 0) {
        this._hireT = 3;
        for (const o of this.meta.hires.list) {
          const lp = this.locals.find(l => l.name === o.owner); if (!lp || lp.player.dead) continue;
          const m = this.entities.find(e => e.hireId === o.id && e.alive && !e.remove);
          if (!m) { if (this.world.isLoaded(Math.floor(lp.player.x), Math.floor(lp.player.z))) hireSpawn(this, lp, o); }
        }
      }
    } catch (e) { /* later */ }
    return baseEU.call(this, dt);
  };
  // fallen in battle: gone for good
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    if (this.hireId && this.game.meta.hires) { const S = this.game.meta.hires; S.list = S.list.filter(o => o.id !== this.hireId); for (const l of this.game.locals) l.toast(`${this.petName} has fallen`, 'warn'); }
    return baseDie.call(this, src);
  };
}
// talking to one: wait, follow, or part ways
{
  const baseUse = LocalPlayer.prototype.petUse;
  LocalPlayer.prototype.petUse = function (e, ...a) {
    if (e && e.hireId && e.owner === this.name && !this.player.sneaking) {
      e.stay = !e.stay; this.toast(`${e.petName}: “${e.stay ? 'I\'ll hold here.' : 'Right behind you.'}”`, ''); return true;
    }
    if (e && e.hireId && e.owner === this.name && this.player.sneaking) {
      const S = hireState(this.g); S.list = S.list.filter(o => o.id !== e.hireId); e.remove = true; this.toast(`${e.petName}: “Good working with you.” (dismissed)`, ''); return true;
    }
    return baseUse.call(this, e, ...a);
  };
}

// ---- (alpha 3) a house of your own: buy one from the town's clerk in Stonebridge, Oakhaven or Saltwind Harbor --------
// (the town builds it at its edge: a bed that's your spawn, and a chest; game/hearth.js). An effect: { house: townId, price }
{
  const baseDo = campDo;
  campDo = function (g, fx, lp, ctx = {}) {
    const list = fx ? (Array.isArray(fx) ? fx : [fx]) : [];
    const rest = [];
    for (const e of list) {
      if (e && e.house && !g.isGuest) {
        try {
          const who = lp || g.locals[0], price = e.price || 200, v = campTownPlan(g.world.gen, e.house);
          if (!v) { who.toast('No plot to be had here just now', 'warn'); continue; }
          const built = g.meta.homeBuilt && g.meta.homeBuilt[v.id + ':' + who.name];
          if (built) { who.toast(`You already have a house in ${built.name}`, ''); continue; }
          if (goldCount(who.player) < price) { who.toast(`A house here is ${price} gp. You carry ${goldCount(who.player)}`, 'warn'); continue; }
          who.player.inv.remove('gold_coin', price);
          const h = homeGive(g, v, who); if (h) homeSettle(who, v.id, h); else { who.player.inv.add(mkStack('gold_coin', price)); who.toast('There\'s no room for a house just now', 'warn'); }
        } catch (err) { console.warn('house', err); }
      } else rest.push(e);
    }
    return rest.length ? baseDo(g, rest, lp, ctx) : undefined;
  };
}
