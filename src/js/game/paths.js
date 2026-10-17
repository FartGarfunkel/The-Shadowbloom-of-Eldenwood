// ---------------------------------------------------------------------------
// game/paths.js — 0.9.0.37: paths and schools.
//
// Paths: at combat level 20 you can choose a path, Knight, Ranger or Mage,
//   from a village guard, fletcher, librarian or elder. Each gives something
//   from the start, and a small tree of talents (two to a tier, three tiers):
//   a point when you choose and one every six combat levels after, six in
//   all. The second tier opens once two points are spent, the third after
//   four. Changing your mind costs 20 emeralds.
// Schools of magic: every spell belongs to a school (fire, frost, life, storm,
//   arcane), and each school has its own level from casting its spells. A
//   school's spells grow stronger with it (half a percent a level), and from
//   level 50 they cost a sixth less mana.
// ---------------------------------------------------------------------------
const PATHS = {
  knight: { name: 'Knight', col: '#e8c060', skill: 'melee', blurb: 'Steel and nerve.', base: 'Two more hearts · Melee experience +10%',
    tiers: [[['shieldwall', 'Shield Wall', '8% less harm from everything'], ['heavy', 'Heavy Blows', 'Melee blows 10% harder']],
      [['ironwill', 'Iron Will', 'Half the knockback, and slowness can\'t touch you'], ['arc', 'Cleaving Arc', 'Every melee blow also strikes every foe within two blocks for a quarter']],
      [['unbreak', 'Unbreakable', 'Once every two minutes a killing blow leaves you on half a heart instead'], ['warlord', 'Warlord', 'Every foe you fell heals you a heart']]] },
  ranger: { name: 'Ranger', col: '#7ad07a', skill: 'archery', blurb: 'The bow, the wild and the long way round.', base: 'Arrows 10% harder · Archery experience +10%',
    tiers: [[['eagle', 'Eagle Eye', 'Arrows 15% harder still'], ['fleet', 'Fleet Foot', '8% quicker on your feet']],
      [['quiver', 'Quiver Master', 'Three arrows in ten aren\'t used up'], ['poison', 'Poisoned Tips', 'Your arrows poison what they hit']],
      [['deadeye', 'Deadeye', 'Arrows from more than 20 blocks strike half again as hard'], ['beast', 'Beast Friend', 'Your creatures take 30% less harm and strike 30% harder']]] },
  mage: { name: 'Mage', col: '#a88cff', skill: 'magic', blurb: 'Study, patience, and a great deal of fire.', base: '20 more mana · Spells cost 10% less · Magic experience +10%',
    tiers: [[['well', 'Deep Well', '25 more mana'], ['swift', 'Swift Casting', 'Spells ready again a fifth sooner']],
      [['focus', 'Elemental Focus', 'Fire and frost strike 15% harder'], ['shield', 'Mana Shield', 'A third of the harm you take is paid in mana while you have it']],
      [['flow', 'Archmage\'s Flow', 'Mana comes back half again as fast'], ['overload', 'Overload', 'Now and then (15%) a spell strikes twice as hard']]] },
};
const PATH_AT = 20;
function pathOf(p) { const st = p && p.stats; return st && st.path && PATHS[st.path.k] ? st.path : null; }
function hasTal(p, t) { const P = pathOf(p); return !!(P && P.t && P.t[t]); }
function onPath(p, k) { const P = pathOf(p); return !!(P && P.k === k); }
function pathPoints(p) { const cl = combatLevel(p); return cl < PATH_AT ? 0 : Math.min(6, 1 + Math.floor((cl - PATH_AT) / 6)); }
function pathSpent(p) { const P = pathOf(p); return P && P.t ? Object.keys(P.t).length : 0; }
const lpOfPlayer = (src) => src && (src instanceof LocalPlayer ? src : null);

// ---- what a path gives ----------------------------------------------------------------------------------------------------
{
  // (the same sum as Player.recalcMax, with the Knight's two hearts in it, so health isn't trimmed on the way)
  Player.prototype.recalcMax = function () {
    const m = 20 + 2 * Math.min(10, this.heartCrystals || 0) + 2 * this.inv.charmBonus('hearts') + (onPath(this, 'knight') ? 4 : 0);
    if (m !== this.maxHealth) { this.maxHealth = m; if (this.health > m) this.health = m; }
  };
  const baseGain = skillGain;
  skillGain = function (lp, k, xp) { const P = lp && lp.player && pathOf(lp.player); return baseGain(lp, k, P && PATHS[P.k].skill === k ? Math.round(xp * 1.1) : xp); };
  const baseMana = manaMax;
  manaMax = function (p) { return baseMana(p) + (onPath(p, 'mage') ? 20 : 0) + (hasTal(p, 'well') ? 25 : 0); };
  const baseRegen = manaRegen;
  manaRegen = function (p) { return baseRegen(p) * (hasTal(p, 'flow') ? 1.5 : 1); };
  const baseMove = Player.prototype.move;
  Player.prototype.move = function (world, inp, dt, opts) {
    if (!this.flying && this.stats && hasTal(this, 'fleet')) opts = Object.assign({}, opts, { slow: (opts && opts.slow || 1) * 1.08 });
    return baseMove.call(this, world, inp, dt, opts);
  };
  const baseGive = giveEffect;
  giveEffect = function (q, eff, secs, lv, src) { const p = q && (q.player || q); if (eff === 'slow' && p && p.stats && hasTal(p, 'ironwill')) return; return baseGive(q, eff, secs, lv, src); };
  // the blows you take
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const p = this.player;
    if (amount > 0 && src && !src.bypass && pathOf(p)) {
      if (hasTal(p, 'shieldwall') && !src.bypassArmor) amount *= 0.92;
      if (hasTal(p, 'ironwill') && src.attacker && src.knock !== 0) src = Object.assign({}, src, { knock: (src.knock || 5) * 0.5 });
      if (hasTal(p, 'shield') && (p.mana || 0) > 0) { const part = amount / 3, cost = Math.min(p.mana, part); p.mana -= cost; amount -= cost; }
    }
    return baseHurt.call(this, amount, src);
  };
  const baseKnock = LocalPlayer.prototype.knock;
  LocalPlayer.prototype.knock = function (vx, vy, vz) { const k = hasTal(this.player, 'ironwill') ? 0.5 : 1; return baseKnock.call(this, vx * k, vy, vz * k); };
  // Unbreakable: one killing blow in two minutes is turned aside
  const baseDie = LocalPlayer.prototype.die;
  LocalPlayer.prototype.die = function (src = {}) {
    const p = this.player, now = this.g.time;
    if (hasTal(p, 'unbreak') && !src.finish && src.type !== 'void' && !(p._ubAt > now - 120)) {
      p._ubAt = now; p.health = 1; p.dead = false; p.invuln = 1.5;
      this.toast('Unbreakable! You stand, on half a heart', 'epic'); this.g.sfx.play('levelup');
      return;
    }
    return baseDie.call(this, src);
  };
  // the blows you give
  const baseMobHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const a = src && src.attacker, lp = a instanceof LocalPlayer ? a : null, p = lp && lp.player;
    if (p && pathOf(p) && amount > 0) {
      const arrow = src.tool === 'arrow' || src.type === 'arrow', magic = src.type === 'magic' || src.type === 'spell', melee = !arrow && !magic && !src._cleave && src.type !== 'cleave';
      if (onPath(p, 'ranger') && arrow) { amount *= 1.1; if (hasTal(p, 'eagle')) amount *= 1.15; if (hasTal(p, 'deadeye') && Math.hypot(p.x - this.x, p.z - this.z) > 20) amount *= 1.5; if (hasTal(p, 'poison') && !(this.T && this.T.undead)) this.poisonT = Math.max(this.poisonT || 0, 4); }
      if (melee && hasTal(p, 'heavy')) amount *= 1.1;
      if (magic && hasTal(p, 'focus') && (src.element === 'fire' || src.element === 'frost')) amount *= 1.15;
      if (magic && hasTal(p, 'overload') && Math.random() < 0.15) { amount *= 2; lp.floatText(this.x, this.y + this.h + 0.5, this.z, 'Overload!', '#c8a0ff'); }
    }
    // Beast Friend: a ranger's creatures
    const owner = (o) => o && o.owner ? this.game.locals.find(l => l.name === o.owner) : null;
    const mine = owner(this); if (mine && hasTal(mine.player, 'beast')) amount *= 0.7;
    const pet = a instanceof Mob ? owner(a) : null; if (pet && hasTal(pet.player, 'beast')) amount *= 1.3;
    const dealt = baseMobHurt.call(this, amount, src);
    // Cleaving Arc
    if (p && dealt > 0 && hasTal(p, 'arc') && src.weapon && !src._cleave && src.type !== 'cleave' && src.tool !== 'arrow') {
      for (const e of this.game.entities) {
        if (e === this || !(e instanceof Mob) || !e.alive || !e.T || !e.T.hostile || e.owner || Math.hypot(e.x - this.x, e.z - this.z) > 2.2 || Math.abs(e.y - this.y) > 2) continue;
        e.hurt(dealt * 0.25, { attacker: lp, _cleave: true, type: 'cleave', knock: 1.5 });
      }
    }
    return dealt;
  };
  // Warlord
  const baseMobDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const r = baseMobDie.call(this, src), a = src && src.attacker;
    if (a instanceof LocalPlayer && this.T && this.T.hostile && hasTal(a.player, 'warlord')) a.player.heal(2);
    return r;
  };
  // Quiver Master
  const baseShoot = LocalPlayer.prototype.shootArrow;
  LocalPlayer.prototype.shootArrow = function (power) {
    const p = this.player, cnt = () => p.inv.count('arrow') + (p.inv.offhand && p.inv.offhand.id === 'arrow' ? p.inv.offhand.n : 0), n0 = cnt();
    const r = baseShoot.call(this, power);
    if (hasTal(p, 'quiver') && cnt() < n0 && Math.random() < 0.3) this.give(mkStack('arrow', 1));
    return r;
  };
}

// ---- schools of magic ----------------------------------------------------------------------------------------------------------
const SCHOOLS = [['fire', 'Fire', '#ff7a2a'], ['frost', 'Frost', '#8ad8ff'], ['life', 'Life', '#7aff8a'], ['storm', 'Storm', '#f0e070'], ['arcane', 'Arcane', '#c88cff']];
const SCHOOL_MORE = { light: 'arcane', missiles: 'arcane', stoneskin: 'life' };
function schoolOfSpell(k) { return (typeof SCHOOL_OF !== 'undefined' && SCHOOL_OF[k]) || SCHOOL_MORE[k] || 'arcane'; }
function schoolsOf(p) { const st = p.stats || (p.stats = {}); return st.schools || (st.schools = {}); }
function schoolLv(p, s) { return skillLevel(schoolsOf(p)[s] || 0); }
{
  const baseCast = LocalPlayer.prototype.castSpell;
  LocalPlayer.prototype.castSpell = function () {
    const p = this.player, k = this.activeSpell && this.activeSpell(), st = this.heldStaff && this.heldStaff();
    if (!k || !st) return baseCast.apply(this, arguments);
    const sc = schoolOfSpell(k), lv = schoolLv(p, sc), mul = 1 + (lv - 1) * 0.005;
    const m0 = p.mana, cd0 = this.castCd || 0;
    st.power *= mul;
    let r;
    try { r = baseCast.apply(this, arguments); } finally { st.power /= mul; }
    const spent = (m0 ?? 0) - (p.mana ?? 0);
    if (spent > 0) {
      const S = SPELLS[k], before = lv;
      schoolsOf(p)[sc] = (schoolsOf(p)[sc] || 0) + (S ? S.mana : spent) * 6;
      const after = schoolLv(p, sc);
      if (after > before) { this.toast(`${SCHOOLS.find(q => q[0] === sc)[1]} magic level ${after}!`, 'good'); if (after === 50) this.toast(`${SCHOOLS.find(q => q[0] === sc)[1]} spells now cost a sixth less mana`, 'epic'); }
      let back = 0;
      if (onPath(p, 'mage')) back += spent * 0.1;
      if (lv >= 50) back += spent / 6;
      if (back > 0 && !this.g.creative) p.mana = Math.min(manaMax(p), p.mana + back);
      if (hasTal(p, 'swift') && (this.castCd || 0) > cd0) this.castCd *= 0.8;
    }
    return r;
  };
}

// ---- training: a village guard, fletcher, librarian or elder ---------------------------------------------------------------
class PathUI {
  constructor(lp, hint) {
    this.lp = lp; this.g = lp.g; this.hint = hint; this.sel = 0;
    this.el = document.createElement('div'); this.el.className = 'path-view';
    this.el.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); if (ev.target === this.el) this.close(); });
    this.onKey = (ev) => { if (ev.code === 'Escape' || ev.code === 'KeyE') { ev.preventDefault(); ev.stopPropagation(); this.close(); } };
    window.addEventListener('keydown', this.onKey, true);
    lp.el.appendChild(this.el);
    this.draw();
  }
  draw() {
    const lp = this.lp, p = lp.player, P = pathOf(p), pts = pathPoints(p), spent = pathSpent(p), cl = combatLevel(p);
    let html;
    if (!P) {
      html = `<div class="path-head"><b>Choose your path</b><span>Combat level ${cl}${cl < PATH_AT ? ` · paths open at ${PATH_AT}` : ''}</span></div>
        <div class="path-pick">${Object.entries(PATHS).map(([k, D]) => `<div class="pp${this.hint === k ? ' hint' : ''}"><b style="color:${D.col}">${D.name}</b><i>${esc(D.blurb)}</i><span>${esc(D.base)}</span><ul>${D.tiers.flat().map(t => `<li><b>${esc(t[1])}</b> ${esc(t[2])}</li>`).join('')}</ul><button class="btn tiny${cl >= PATH_AT ? ' primary' : ''}" data-pick="${k}" ${cl >= PATH_AT ? '' : 'disabled'}>Walk the ${D.name}'s path</button></div>`).join('')}</div>`;
    } else {
      const D = PATHS[P.k], left = pts - spent;
      const tier = (row, i) => `<div class="pt-tier${spent >= i * 2 ? '' : ' locked'}"><div class="pt-tn">${['First', 'Second', 'Third'][i]} tier${spent >= i * 2 ? '' : ` · opens after ${i * 2} talents`}</div>${row.map(([id, n, d]) => {
        const got = P.t && P.t[id], can = !got && left > 0 && spent >= i * 2;
        return `<div class="pt${got ? ' got' : ''}"><b>${esc(n)}</b><span>${esc(d)}</span>${got ? '<em>Learned</em>' : `<button class="btn tiny${can ? ' primary' : ''}" data-tal="${id}" ${can ? '' : 'disabled'}>Learn</button>`}</div>`;
      }).join('')}</div>`;
      html = `<div class="path-head"><b style="color:${D.col}">The ${D.name}'s path</b><span>Combat level ${cl} · ${left > 0 ? `${left} talent point${left > 1 ? 's' : ''} to spend` : pts < 6 ? `next point at combat level ${PATH_AT + Math.max(0, pts) * 6}` : 'every point spent'}</span></div>
        <div class="path-base">${esc(D.base)}</div>${D.tiers.map(tier).join('')}
        <div class="path-foot"><button class="btn tiny" data-forget="1">Forget it all (20 emeralds)</button></div>`;
    }
    this.el.innerHTML = `<div class="path-card">${html}<div class="way-hint">E to close</div></div>`;
    this.el.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
      const k = b.dataset.pick; if (combatLevel(p) < PATH_AT) return;
      p.stats.path = { k, t: {} }; p.recalcMax();
      lp.toast(`You walk the ${PATHS[k].name}'s path. ${PATHS[k].base}`, 'epic'); this.g.sfx.play('levelup'); this.draw();
    });
    this.el.querySelectorAll('[data-tal]').forEach(b => b.onclick = () => {
      const id = b.dataset.tal, P2 = pathOf(p); if (!P2) return;
      const i = PATHS[P2.k].tiers.findIndex(row => row.some(t => t[0] === id));
      if (i < 0 || pathSpent(p) < i * 2 || pathPoints(p) - pathSpent(p) <= 0) return;
      P2.t[id] = 1; p.recalcMax(); this.g.sfx.play('enchant');
      lp.toast(`Learned: ${PATHS[P2.k].tiers[i].find(t => t[0] === id)[1]}`, 'good'); this.draw();
    });
    const f = this.el.querySelector('[data-forget]');
    if (f) f.onclick = () => {
      if (p.inv.count('emerald') < 20) { lp.toast('That takes 20 emeralds', 'warn'); return; }
      p.inv.remove('emerald', 20); p.stats.path = null; p.recalcMax();
      lp.toast('You set your path aside. Choose again when you\'re ready.', ''); this.draw();
    };
  }
  frame(dt, inp) {
    if (inp.padB || inp.padStart || inp.inventory) { this.close(); return; }
    const bs = [...this.el.querySelectorAll('button:not([disabled])')];
    if (inp.navX || inp.navY) { this.sel = (this.sel + ((inp.navX || inp.navY) > 0 ? 1 : bs.length - 1)) % Math.max(1, bs.length); bs.forEach((b, i) => b.classList.toggle('sel', i === this.sel)); }
    if (inp.padA && bs[this.sel]) bs[this.sel].click();
  }
  close() {
    const lp = this.lp, g = this.g;
    window.removeEventListener('keydown', this.onKey, true);
    this.el.remove();
    if (lp.npcUI === this) lp.npcUI = null;
    if (lp.mode === 'npc') lp.mode = 'play';
    if (lp.useKb && !g.input.touchMode && g.state === 'playing') g.input.requestLock();
  }
}
const TRAINS = { guard: 'knight', fletcher: 'ranger', librarian: 'mage', elder: null };
{
  const baseHome = NpcTalk.prototype.home;
  NpcTalk.prototype.home = function (text) {
    baseHome.call(this, text);
    if (!(this.job in TRAINS)) return;
    const lp = this.lp, p = lp.player, P = pathOf(p), want = TRAINS[this.job];
    const o = this.el.querySelector('.nt-opts'); if (!o) return;
    const b = document.createElement('button'); b.className = 'btn nt-opt';
    const left = P ? pathPoints(p) - pathSpent(p) : 0;
    b.innerHTML = `<i>⚔</i>${P ? `My path${left > 0 ? ` (${left} to spend)` : ''}…` : want ? `Teach me the ${PATHS[want].name}'s ways…` : 'About the paths…'}`;
    b.onclick = () => {
      this.g.sfx.play('click');
      if (!P && combatLevel(p) < PATH_AT) { this.say(`Come back when you've seen more fighting. (Paths open at combat level ${PATH_AT}; you're ${combatLevel(p)}.) ${want ? `When you do, I'll show you the ${PATHS[want].name}'s ways.` : 'Our guards, fletchers and librarians train Knights, Rangers and Mages.'}`); b.remove(); return; }
      this.close();
      lp.openNpcUI(() => new PathUI(lp, want));
    };
    o.insertBefore(b, o.lastChild);
  };
  // the moment a path opens to you
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    if ((this._pathT = (this._pathT || 0) - dt) <= 0) {
      this._pathT = 5;
      const p = this.player, st = p.stats || {};
      if (!st.pathTold && combatLevel(p) >= PATH_AT && !pathOf(p)) { st.pathTold = 1; this.toast('You could walk a path now: Knight, Ranger or Mage. Any village guard, fletcher, librarian or elder can train you.', 'epic'); }
      p.recalcMax();   // (a Knight's hearts, also after loading)
      const P = pathOf(p);
      if (P) { const pts = pathPoints(p); if ((st.pathPts || 0) < pts) { if (st.pathPts !== undefined && pts > st.pathPts) this.toast('A new talent point for your path (talk to a village trainer)', 'good'); st.pathPts = pts; } }
    }
    return baseUpd.call(this, dt, inp);
  };
  // on the skills screen: your path, and your schools of magic
  const baseOpen = LocalPlayer.prototype.openSkills;
  LocalPlayer.prototype.openSkills = function () {
    baseOpen.call(this);
    const el = this.skillsEl; if (!el) return;
    const p = this.player, P = pathOf(p), card = el.querySelector('.sk-card'), hint = el.querySelector('.sk-hint');
    const box = document.createElement('div'); box.className = 'pk-list path-sk';
    let h = '';
    if (P) { const D = PATHS[P.k], got = D.tiers.flat().filter(t => P.t && P.t[t[0]]).map(t => t[1]); h += `<div class="pk-h">Path · <b style="color:${D.col}">${D.name}</b></div><div class="pk-d">${esc(D.base)}${got.length ? ' · ' + got.map(esc).join(', ') : ''}${pathPoints(p) > pathSpent(p) ? ` · <b>${pathPoints(p) - pathSpent(p)} point(s) to spend</b>` : ''}</div>`; }
    else h += `<div class="pk-h">Path</div><div class="pk-d">${combatLevel(p) >= PATH_AT ? 'Choose Knight, Ranger or Mage from a village guard, fletcher, librarian or elder.' : `Paths open at combat level ${PATH_AT} (you're ${combatLevel(p)}).`}</div>`;
    const sch = schoolsOf(p);
    if (Object.keys(sch).length) h += `<div class="pk-h" style="margin-top:6px">Schools of magic</div><div class="sch-grid">${SCHOOLS.map(([k, n, col]) => { const xp = sch[k] || 0, L = skillLevel(xp), a = SKILL_XP[L], b2 = SKILL_XP[Math.min(99, L + 1)], pr = L >= 99 ? 1 : (xp - a) / (b2 - a); return `<div class="sk"><span class="sk-n" style="color:${col}">${n}</span><span class="sk-l">${L}</span><div class="sk-bar"><i style="width:${Math.round(pr * 100)}%;background:${col}"></i></div></div>`; }).join('')}</div>`;
    box.innerHTML = h;
    if (card) card.insertBefore(box, hint);
  };
}
PV.debug.paths = { set: (lp, k, tals) => { lp.player.stats.path = { k, t: Object.fromEntries((tals || []).map(t => [t, 1])) }; lp.player.recalcMax(); }, points: (lp) => [pathPoints(lp.player), pathSpent(lp.player)], open: (lp) => lp.openNpcUI(() => new PathUI(lp, null)), school: (lp, s) => schoolLv(lp.player, s) };
