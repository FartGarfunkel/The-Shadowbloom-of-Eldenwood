// ---------------------------------------------------------------------------
// dnd/spells2.js — (alpha 3) the whole SRD 5.2 spell list, in real time.
//
// The data (dnd/spelldata.js and spells_more1–3.js) describes 339 spells with the fields in
// notes/alpha3-data-spec.md; dnd/spells.js casts the original kinds. This file adds what the rest need:
//   effects on creatures: blinded, stunned, poisoned, confused, petrified, banished, polymorphed, dominated, prone,
//     cursed, silenced; life drain; outright kills (Power Word Kill) and stuns (Power Word Stun); dust (Disintegrate)
//   spells that land on one creature now deal half on a save, as the rules have it (except all-or-nothing ones)
//   extra damage riders (Ice Storm's cold, Flame Strike's radiant, Meteor Swarm's bludgeoning, Disintegrate's +40)
//   walls (stone, ice, fire, force, thorns, wind, light), meteor showers, lingering clouds that block sight
//   buffs: flight, water breathing, darkvision, blur, mirror images, stoneskin, resistance, death ward, fire shield,
//     freedom of movement, greater invisibility, sanctuary, protection from evil, regeneration, heroes' feast,
//     foresight, holy aura, mind blank, shapechange, elemental weapons...
//   summons: undead, elementals, beasts and constructs that fight at your side; steeds; guardians; hands and swords
//   utilities: teleportation and travel, plane shift, revealing magic and traps, scrying the goal of your quest,
//     speaking with the dead, beasts and plants (they tell you something useful), water, food, shelters, locks,
//     weather, earthquakes, time stop, and Wish.
// Costly components are now used up whatever the spell.
// ---------------------------------------------------------------------------

let DND_CUR = null;   // the spell being cast right now (for the hooks below)

// what kind of creature it is (for vsType, Protection from Evil, Turn Undead...)
function dndCType(e) {
  const T = (e && e.T) || {};
  if (T.ctype) return T.ctype;
  if (T.undead || /ghoul|skeleton|stray|husk|drowned|wraith|zombie|wight|ghost|specter|spectre|revenant|lich|banshee|shade/.test(e.type || '')) return 'undead';
  if (T.humanoid || e.npc || /bandit|cultist|raider|witch|warlock|knight|guard|villager|magus|zealot|mage/.test(e.type || '')) return 'humanoid';
  if (/elemental|wisp|mephit|golem/.test(e.type || '')) return /golem/.test(e.type) ? 'construct' : 'elemental';
  if (/dragon|drake|wyvern/.test(e.type || '')) return 'dragon';
  if (/plant|mandrake|shrub|tree|treant|mound/.test(e.type || '')) return 'plant';
  if (T.rift || /rift|veil|shadow|echo|bloom/.test(e.type || '')) return 'aberration';
  if (T.ai || /wolf|bear|boar|deer|cat|spider|snake|croc|shark|lion|tiger|rat|bat|frog|crab|octopus/.test(e.type || '')) return 'beast';
  return 'monstrosity';
}
function dndTypeOk(e, S) { return !S || !S.vsType || S.vsType.includes(dndCType(e)); }

// ---- effects on creatures ----------------------------------------------------------------------------------------------
{
  const baseFx = dndSpellEffects;
  dndSpellEffects = function (lp, e, S, c) {
    if (S.vsType && !dndTypeOk(e, S)) { if (lp && lp.floatText) lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Unaffected', '#c0c0c0'); return; }
    baseFx(lp, e, S, c);
    const boss = e.T && e.T.boss;
    const say = (t, col) => { if (lp && lp.floatText) lp.floatText(e.x, e.y + e.h + 0.45, e.z, t, col); };
    if (S.blind) { e.dndBlind = Math.max(e.dndBlind || 0, S.blind); say('Blinded', '#d0d0d0'); }
    if (S.stun) { e.dndHeld = Math.max(e.dndHeld || 0, boss ? S.stun * 0.4 : S.stun); e.dndStun = e.dndHeld; say('Stunned', '#ffe080'); }
    if (S.poisoned) { e.dndWeak = Math.max(e.dndWeak || 0, S.poisoned); e.poisonT = Math.max(e.poisonT || 0, Math.min(10, S.poisoned)); say('Poisoned', '#8ad040'); }
    if (S.confuse && !boss) { e.dndConfuse = Math.max(e.dndConfuse || 0, S.confuse); say('Confused', '#ff80e0'); }
    if (S.petrify && !(e.T && e.T.ctype === 'construct')) { const t = boss ? Math.min(6, S.petrify * 0.1) : S.petrify; e.dndHeld = Math.max(e.dndHeld || 0, t); e.dndPetrify = Math.max(e.dndPetrify || 0, t); say('Petrified', '#a0a0a0'); }
    if (S.prone) { e.vy = Math.min(e.vy, 0); e.dndHeld = Math.max(e.dndHeld || 0, 1.2); e.dndProne = 1.2; say('Prone', '#e0c080'); }
    if (S.deafen) { e.dndDeaf = Math.max(e.dndDeaf || 0, S.deafen); }
    if (S.curse) { e.dndCurse = Math.max(e.dndCurse || 0, S.curse); e.dndWeak = Math.max(e.dndWeak || 0, S.curse); say('Cursed', '#a040c0'); }
    if (S.silence) { e.dndSilence = Math.max(e.dndSilence || 0, S.silence); e.dndWeak = Math.max(e.dndWeak || 0, Math.min(S.silence, 12)); say('Silenced', '#c0c0ff'); }
    if (S.banish && !boss) dndBanish(lp, e, S.banish);
    if (S.polymorph && !boss) { e.dndPoly = Math.max(e.dndPoly || 0, S.polymorph); e.foe = null; e.huntT = 0; say('Polymorphed!', '#ffffff'); spellFx(e.game, e.x, e.y + 0.6, e.z, 'mana_arcane', 30, 1.2, { life: 0.7 }); }
    if (S.dominate && !boss && lp) { e.dndDominate = Math.max(e.dndDominate || 0, S.dominate); e.dndDomBy = lp; e._domOwner = e.owner || null; e.owner = lp.name; e.tamed = true; e.foe = null; e.huntT = 0; say('Dominated', '#ff80c0'); }
    if (S.kill && e.health <= S.kill && !(boss && e.maxHealth > S.kill * 2)) { say('Power Word: Kill', '#ff4040'); e.dndDust = !!S.dust; e.hurt(e.health + 999, { attacker: lp, type: 'magic', dnd: true, knock: 0 }); }
    if (S.stunIf && e.health <= S.stunIf) { e.dndHeld = Math.max(e.dndHeld || 0, 12); e.dndStun = e.dndHeld; say('Stunned', '#ffe080'); }
  };
}
// gone for a while (a summoned or planar thing doesn't come back)
function dndBanish(lp, e, t) {
  const g = e.game;
  spellFx(g, e.x, e.y + e.h / 2, e.z, 'mana_arcane', 50, 1.5, { life: 0.8 });
  if (e.dndSummonBy || (e.T && (e.T.rift || ['fiend', 'celestial', 'elemental', 'fey', 'aberration'].includes(e.T.ctype)))) { if (lp && lp.floatText) lp.floatText(e.x, e.y + e.h + 0.4, e.z, 'Banished', '#c080ff'); e.dndNoDrops = true; e.remove = true; return; }
  e.dndBanished = Math.max(e.dndBanished || 0, t); e.dndBanishAt = [e.x, e.y, e.z];
  if (lp && lp.floatText) lp.floatText(e.x, e.y + e.h + 0.4, e.z, 'Banished', '#c080ff');
}
{
  const baseAI = Mob.prototype.controlAI;
  Mob.prototype.controlAI = function (dt, p, dist, dyp, toPlayer) {
    const tick = (k) => { if (this[k] > 0) this[k] -= dt; };
    for (const k of ['dndBlind', 'dndConfuse', 'dndPetrify', 'dndProne', 'dndDeaf', 'dndCurse', 'dndSilence', 'dndStun']) tick(k);
    if (this.dndBanished > 0) {
      this.dndBanished -= dt; this.vx = this.vz = 0; this.vy = 0;
      const B0 = this.dndBanishAt; if (B0) { this.x = B0[0]; this.y = B0[1]; this.z = B0[2]; }
      if (this.dndBanished <= 0 && this.game) spellFx(this.game, this.x, this.y + this.h / 2, this.z, 'mana_arcane', 40, 1.4, { life: 0.7 });
      return { want: 0, dir: this.yaw };
    }
    if (this.dndPoly > 0) { this.dndPoly -= dt; this.foe = null; this.wander(dt); const m = this.wanderMove(); m.want *= 0.5; return m; }
    if (this.dndDominate > 0) {
      this.dndDominate -= dt;
      if (this.dndDominate <= 0) { this.owner = this._domOwner; this.tamed = false; this.petFoe = null; this.foe = this.dndDomBy && this.dndDomBy.player; if (this.game && this.dndDomBy) this.dndDomBy.toast(`${(this.T && this.T.label) || 'It'} shakes off your control!`, 'warn'); }
    }
    if (this.dndBlind > 0 || this.dndConfuse > 0) {
      if (Math.random() < dt * 1.5) this.yaw += (Math.random() - 0.5) * 2;
      this.foe = null; this.huntT = 0;
      return { want: (this.T.speed || 1) * (this.dndConfuse > 0 ? 0.9 : 0.4), dir: this.yaw };
    }
    return baseAI.call(this, dt, p, dist, dyp, toPlayer);
  };
  // polymorphed, they look like sheep; petrified, stone-grey; banished, gone
  const baseDraws = Mob.prototype.draws;
  Mob.prototype.draws = function (out) {
    if (this.dndBanished > 0) return;
    if (this.dndPoly > 0 && MOB_TYPES.sheep && this.type !== 'sheep') {
      const t = this.type, T = this.T, h = this.h;
      this.type = 'sheep'; this.T = MOB_TYPES.sheep;
      try { return baseDraws.call(this, out); } finally { this.type = t; this.T = T; this.h = h; }
    }
    const n0 = out.length;
    const r = baseDraws.call(this, out);
    if (this.dndPetrify > 0) for (let i = n0; i < out.length; i++) out[i].tint = [0.52, 0.52, 0.54, 0.78];
    return r;
  };
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    if (this.dndBanished > 0) return 0;
    if (this.dndPoly > 0 && amount > 0) { this.dndPoly = 0; if (this.game) spellFx(this.game, this.x, this.y + 0.6, this.z, 'mana_arcane', 24, 1, { life: 0.6 }); }
    if (this.dndPetrify > 0) amount = Math.max(1, Math.round(amount * 0.5));
    return baseHurt.call(this, amount, src);
  };
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    if (this.dndDust && this.game) { for (let i = 0; i < 40; i++) this.game.particles.add({ x: this.x + (Math.random() - 0.5) * this.w * 2, y: this.y + Math.random() * this.h, z: this.z + (Math.random() - 0.5) * this.w * 2, vx: (Math.random() - 0.5) * 0.6, vy: 0.3 + Math.random() * 0.6, vz: (Math.random() - 0.5) * 0.6, life: 1.4, max: 1.4, size: 0.1, uv: tileUV(ATLAS.tile.gravel ?? 0), light: 0xC0, grav: -0.2 }); }
    if (this.dndNoDrops) this.T = Object.assign({}, this.T, { drops: [] });
    const r = baseDie.call(this, src);
    if (this.dndDust) this.remove = true;
    return r;
  };
}

// ---- damage riders: +flat, a second damage type, life drain, dust -------------------------------------------------------
{
  const baseHit = dndSpellHit;
  dndSpellHit = function (lp, e, dmg, type, extra = {}) {
    const C = DND_CUR;
    if (C && C.S && e && !extra._rider) {
      const S = C.S;
      if (S.dust) e.dndDust = true;
      if (S.plus && S.kind !== 'missile' && dmg > 0) dmg += extra.saved ? Math.floor(S.plus / 2) : S.plus;
      if (S.dmgVs) { const k = S.dmgVs[dndCType(e)]; if (k) dmg = Math.round(dmg * k); }
    }
    const done = baseHit(lp, e, dmg, type, extra);
    if (C && C.S && e && !extra._rider) {
      const S = C.S;
      if (S.extra && S.extraDmg && !S.mark && ['burst', 'cone', 'line', 'bolt', 'ray', 'touch', 'target'].includes(S.kind) && e.alive) {
        const n = dndRoll(S.extra[0], S.extra[1]).total;
        baseHit(lp, e, extra.saved ? Math.floor(n / 2) : n, S.extraDmg, Object.assign({}, extra, { _rider: true, knock: 0 }));
      }
      if (S.drain && done > 0 && lp && lp.player) { const h = Math.max(1, Math.floor(done / 2)); dndHeal(lp, h); lp.floatText(lp.player.x, lp.player.y + 2, lp.player.z, `+${h}`, '#7aff8a'); }
    }
    return done;
  };
}

// ---- casting: the new kinds are routed through dnd/spells.js's own casting (slots, concentration, costs, cooldowns) -----
// by lending it a stand-in spell for the moment of the cast; what's new happens in the utility hook below.
function dndCastTargets(lp, S) {
  const g = lp.g, p = lp.player;
  if (S.party) return [lp, ...g.locals.filter(l => l !== lp && Math.hypot(l.player.x - p.x, l.player.z - p.z) < 10)];
  if (S.ally) { const a = dndLookTarget(lp, 8, { allies: true }); const L = a && g.locals.find(l => l === a || l.player === a.player); return [L || lp]; }
  return [lp];
}
{
  const baseCast = dndCast;
  dndCast = function (lp, k, o = {}) {
    const S = DND_SPELLS[k]; if (!S) return false;
    S.key = k;
    let stand = null;
    if (S.kind === 'target') stand = { kind: 'utility', util: '__target' };
    else if (S.kind === 'summon' && !['spirit_wolves', 'spirit_blade'].includes(S.summon)) stand = { kind: 'utility', util: '__summon' };
    else if (S.wall) stand = { kind: 'utility', util: '__wall' };
    else if (S.kind === 'heal' && S.cleanse && S.dice) stand = { cleanse: false };
    else if (S.kind === 'buff' && S.buff === 'shapechange') stand = { kind: 'utility', util: '__shape' };
    const real = S;
    if (stand) DND_SPELLS[k] = Object.assign({}, S, stand, { _real: S });
    DND_CUR = { lp, S: real, k, o };
    const c = dndLive(lp), slotsBefore = c ? c.slots.slice() : null;
    let r;
    try { r = baseCast(lp, k, o); } finally { DND_SPELLS[k] = real; DND_CUR = null; }
    if (!r) return r;
    try {
      const slotLvl = dndSlotUsed(slotsBefore, c ? c.slots : null) || real.lvl;
      dndAfterCast(lp, real, k, slotLvl);
      if (real.cost && real.kind !== 'heal' && !lp.g.creative && !o.free) lp.player.inv.remove(real.cost, 1);
      // every hostile cast ends Sanctuary
      if (c && c.conds.sanctuary > 0 && ['bolt', 'missile', 'ray', 'touch', 'cone', 'burst', 'line', 'target'].includes(real.kind)) { delete c.conds.sanctuary; lp.toast('Sanctuary ends', ''); }
    } catch (e) { console.warn('after cast', k, e); }
    return r;
  };
}
function dndSlotUsed(before, after) { if (!before || !after) return 0; for (let i = 0; i < after.length; i++) if ((after[i] || 0) < (before[i] || 0)) return i + 1; return 0; }

// what a spell leaves behind once it's cast: buff data, extra bursts, clouds, cleansing
function dndAfterCast(lp, S, k, slotLvl) {
  const g = lp.g, p = lp.player;
  if (S.kind === 'heal' && S.cleanse && S.dice) for (const L of dndCastTargets(lp, Object.assign({ party: S.party }, S))) { const P = L.player; P.poison = 0; P.chill = 0; P.fx_poison = 0; P.fx_slow = 0; P.fx_weak = 0; const cc = dndOf(P); if (cc) for (const q of ['blinded', 'poisoned', 'paralyzed', 'deafened', 'frightened', 'charmed']) delete cc.conds[q]; }
  if (S.kind === 'buff') {
    for (const L of dndCastTargets(lp, S)) {
      const cc = dndOf(L.player); if (!cc) continue;
      const cd = cc.condData || (cc.condData = {});
      const P = L.player;
      switch (S.buff) {
        case 'temp_hp': { const n = (S.dice ? dndRoll(S.dice[0] + (typeof S.scale === 'number' ? S.scale * Math.max(0, slotLvl - S.lvl) : 0), S.dice[1]).total : 5) + (S.plus || 0) + (S.addMod ? dndCastMod(dndOf(p)) : 0); cc.tempHp = Math.max(cc.tempHp || 0, n); L.toast(`+${n} temporary hit points`, 'good'); break; }
        case 'elemental_weapon': cd.elemental_weapon = { dice: S.dice || [1, 4], dmg: S.dmg || 'fire' }; break;
        case 'resist': cd.resist = S.resist === 'all' ? DND_DMG_TYPES.filter(t => !['slashing', 'piercing', 'bludgeoning'].includes(t)) : (S.resist || ['fire']).slice(); break;
        case 'fire_shield': cd.fire_shield = { dmg: S.dmg || 'fire' }; if (!cd.resist) cd.resist = []; cd.resist = [...new Set([...(cd.resist || []), S.dmg === 'cold' ? 'fire' : 'cold'])]; cc.conds.resist = Math.max(cc.conds.resist || 0, S.dur || 600); break;
        case 'mirror_image': cd.images = 3; break;
        case 'darkvision': case 'true_seeing': case 'see_invis': giveEffect(L, 'night_vision', S.dur || 3600); break;
        case 'water_breathing': giveEffect(L, 'water_breathing', S.dur || 3600); giveEffect(L, 'resp', S.dur || 3600); break;
        case 'jump': giveEffect(L, 'jump', S.dur || 60, 1); break;
        case 'greater_invis': giveEffect(L, 'invis', S.dur || 60); cc.conds.invisible = S.dur || 60; break;
        case 'heroes_feast': cc.conds.heroes_feast = 86400; cd.feastHp = dndRoll(2, 10).total; P.recalcMax(); P.health += cd.feastHp; L.toast(`Heroes' Feast: +${cd.feastHp} maximum hit points, no fear and no poison for a day`, 'epic'); break;
        case 'warding_bond': cd.resist = DND_DMG_TYPES.slice(); cc.conds.resist = Math.max(cc.conds.resist || 0, S.dur || 3600); break;
        case 'armor_of_agathys': { const n = 5 * Math.max(1, slotLvl); cc.tempHp = Math.max(cc.tempHp || 0, n); cd.agathys = n; break; }
        case 'gaseous': cd.resist = ['slashing', 'piercing', 'bludgeoning']; cc.conds.resist = Math.max(cc.conds.resist || 0, S.dur || 3600); break;
        case 'stoneskin': break;
        case 'regenerate': if (S.dice) dndHeal(L, dndRoll(S.dice[0], S.dice[1]).total + (S.plus || 0)); break;
      }
      dndHudDirty(L);
    }
  }
  if (S.cloud && S.linger) { const Z = lp._dndZones || []; for (const z of Z) if (z.k === k) z.fog = true; }
  if (S.multi && S.kind === 'burst') {
    const at = dndLookPoint(lp, S.at || 30), c = dndOf(p), dice = dndSpellDice(c, S, slotLvl), dc = dndSpellDC(c);
    for (let i = 1; i < S.multi; i++) setTimeout(() => { if (!lp.player || lp.player.dead) return; const a = i / S.multi * TAU; dndBurstAt(lp, S, at[0] + Math.cos(a) * (S.range || 4) * 1.4, at[1], at[2] + Math.sin(a) * (S.range || 4) * 1.4, dice, dc); }, i * 220);
  }
  if (S.pull) { const at = dndLookPoint(lp, S.at || 18); for (const e of dndHostilesNear(g, at[0], at[1], at[2], (S.range || 4) + 2, lp)) { const dx = at[0] - e.x, dz = at[2] - e.z, l = Math.hypot(dx, dz) || 1; e.vx += dx / l * S.pull * 3; e.vz += dz / l * S.pull * 3; } }
}
// a burst at a point (for Meteor Swarm's other spheres and the like)
function dndBurstAt(lp, S, cx, cy, cz, dice, dc) {
  const g = lp.g, r = S.range || 3, c = dndOf(lp.player);
  dndSpellBurst(g, cx, cy, cz, S.fx, 60, r / 2 + 0.6);
  if (S.ignite) for (let i = 0; i < 10; i++) g.flame(cx + (Math.random() - 0.5) * r * 2, cy, cz + (Math.random() - 0.5) * r * 2);
  g.sfx.playAt(S.dmg === 'fire' ? 'spell_fire' : 'spell_zap', cx, cy, cz, 40);
  const dmg = dice ? dndRoll(...dice).total : 0;
  DND_CUR = { lp, S, k: S.key };
  try {
    for (const e of dndHostilesNear(g, cx, cy, cz, r, lp)) {
      const sv = S.save ? dndMobSave(e, S.save, dc) : { ok: false };
      if (dmg) dndSpellHit(lp, e, sv.ok ? Math.floor(dmg / 2) : dmg, S.dmg, { knock: 0.6, burn: S.ignite, saved: sv.ok });
      if (!sv.ok && c) dndSpellEffects(lp, e, Object.assign({}, S, { sleep: 0 }), c);
    }
  } finally { DND_CUR = null; }
}

// ---- the utility hook: the new utilities, and the kinds lent to it above ------------------------------------------------
{
  const baseUtil = dndUtility;
  dndUtility = function (lp, c, S0, k, slotLvl) {
    const S = S0._real || S0, g = lp.g, p = lp.player;
    switch (S0.util) {
      case '__target': return dndCastTarget(lp, c, S, k, slotLvl);
      case '__summon': return dndCastSummon(lp, c, S, k, slotLvl);
      case '__wall': return dndCastWall(lp, c, S, k, slotLvl);
      case '__shape': return dndCastShape(lp, c, S, k, slotLvl);
    }
    const H = DND_UTIL[S.util];
    if (H) { try { return H(lp, c, S, k, slotLvl) !== false; } catch (e) { console.warn('util', S.util, e); return false; } }
    return baseUtil(lp, c, S0, k, slotLvl);
  };
}

// one creature you look at: an attack-free save, half on a success (unless it's all or nothing), and its effects
function dndCastTarget(lp, c, S, k, slotLvl) {
  const g = lp.g, e = dndLookTarget(lp, S.range || 12);
  if (!e) { lp.toast('Look at a creature to target it', ''); return false; }
  if (S.humanoid && dndCType(e) !== 'humanoid') { lp.toast(`${S.name} only works on humanoids`, ''); return false; }
  const dice = dndSpellDice(c, S, slotLvl), dc = dndSpellDC(c);
  spellSpiral(g, e.x, e.y, e.z, S.fx, 30, { r: 0.6, h: e.h, turns: 2, life: 0.8 });
  g.sfx.playAt('spell_zap', e.x, e.y + 1, e.z, 30);
  if (S.mark && !S.save) { dndMarkOn(e, S.mark, S.dur || 3600, lp, k); lp.floatText(e.x, e.y + e.h + 0.3, e.z, S.name, S.col); if (S.mark === 'hexed' || S.mark === 'hunted') { e.dndMark.hexer = e.dndMark.hexer || (S.mark === 'hexed' ? lp : null); } return true; }
  const sv = S.save ? dndMobSave(e, S.save, dc) : { ok: false };
  const control = S.hold || S.charm || S.fear || S.sleep || S.stun || S.petrify || S.banish || S.polymorph || S.dominate || S.kill || S.stunIf || S.blind || S.confuse;
  if (sv.ok) {
    // control spells are all or nothing; damage spells deal half (Disintegrate: nothing)
    if (dice && !S.dust && !control) { const n = dndRoll(...dice).total; dndSpellHit(lp, e, Math.floor(n / 2), S.dmg, { saved: true }); }
    lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Saved', '#8fe3ff');
    return true;
  }
  if (dice) dndSpellHit(lp, e, dndRoll(...dice).total, S.dmg === 'chosen' ? (lp._orbType || 'fire') : S.dmg);
  dndSpellEffects(lp, e, S, c);
  if (S.hold) lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Held!', '#a0a0ff');
  if (S.charm) lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Charmed', '#ff80c0');
  if (S.fear) lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Frightened', '#c080ff');
  if (S.hold || S.charm || S.dominate) { e.dndMark = e.dndMark || {}; e.dndMark.by = lp; e.dndMark.spell = k; }
  return true;
}

// creatures that fight at your side
const DND_SUMMON_ALIAS = { cat: 'cat', eagle: 'parrot', giant_eagle: 'parrot', bear: 'brown_bear', fire_elemental: 'cinder_wisp', earth_elemental: 'iron_golem', water_elemental: 'drowned', air_elemental: 'cinder_wisp', spider: 'spider', ember_drake: 'ember_drake' };
function dndSummonType(t) { if (MOB_TYPES[t]) return t; const a = DND_SUMMON_ALIAS[t]; return a && MOB_TYPES[a] ? a : 'spirit_wolf'; }
function dndCastSummon(lp, c, S, k, slotLvl) {
  const g = lp.g, p = lp.player;
  if (g.isGuest) { if (g.net) g.net.send({ t: 'adv', k: 'dndsummon', s: k, l: slotLvl }); return true; }
  return dndDoSummon(g, lp, S, k, slotLvl);
}
function dndDoSummon(g, owner, S, k, slotLvl) {
  const P = owner.player || owner, at = [P.x, P.y, P.z];
  const dur = Math.min(S.dur || 600, 3600 * 8);
  if (S.summon === 'steed') {
    const t = MOB_TYPES.horse ? 'horse' : 'spirit_wolf';
    const m = g.addEntity(new Mob(g, t, at[0] + 1.5, at[1], at[2]));
    m.owner = owner.name; m.tamed = true; m.saddled = true; m.dndSummonBy = owner; m.dndSummonT = dur; m.kept = false; m.petName = S.summon === 'steed' && S.name.includes('Phantom') ? 'Phantom Steed' : 'Faithful Steed';
    m.dndTint = [0.75, 0.85, 1, 0.35];
    spellFx(g, m.x, m.y + 1, m.z, S.fx, 40, 1.5, { life: 0.8 });
    if (owner.toast) owner.toast(`${S.name}: your steed is here (ride it)`, 'good');
    return true;
  }
  if (S.summon === 'guardian' || S.summon === 'hand' || S.summon === 'sword') {
    if (!owner._dndZones) return false;
    const c = dndOf(owner.player), dice = dndSpellDice(c, S, slotLvl) || [4, 8];
    owner._dndZones = owner._dndZones.filter(z => z.k !== k);
    if (S.summon === 'guardian') { const pt = dndLookPoint(owner, 12); owner._dndZones.push({ k, x: pt[0], y: pt[1], z: pt[2], r: 3, t: dur, tick: 2, dice, dmg: S.dmg || 'radiant', save: 'dex', dc: dndSpellDC(c), fx: S.fx }); }
    else owner._dndZones.push({ k, follow: owner, r: 8, t: dur, tick: S.summon === 'hand' ? 2 : 1.4, dice, plus: dndCastMod(c), dmg: S.dmg || 'force', attack: true, fx: S.fx, single: true, root: S.summon === 'hand' ? 2 : 0 });
    owner.toast(S.name, 'good');
    return true;
  }
  // creatures: Animate Dead, Conjure Elemental, Giant Insect, Find Familiar...
  const t = dndSummonType(S.mob || 'spirit_wolf');
  let n = S.n || 1;
  if (k === 'animate_dead' || k === 'create_undead') n += Math.max(0, slotLvl - S.lvl) * (k === 'animate_dead' ? 2 : 1);
  const mine = g.entities.filter(e => e.dndSummonBy === owner && e.alive && !e.T.spirit);
  while (mine.length + n > 8) { const o = mine.shift(); o.remove = true; }
  const lvl = slotLvl || S.lvl || 1;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + Math.random() * 0.5, x = at[0] + Math.cos(a) * 1.8, z = at[2] + Math.sin(a) * 1.8;
    const m = g.addEntity(new Mob(g, t, x, at[1] + 0.2, z));
    m.owner = owner.name; m.tamed = true; m.kept = false; m.dndSummonBy = owner; m.dndSummonT = dur; m.yaw = P.yaw || 0;
    if (k === 'find_familiar') { m.maxHealth = m.health = 6; m.familiar = true; }
    else { m.maxHealth = m.health = Math.max(m.maxHealth || 10, Math.round((m.T.hp || 20) * (0.8 + lvl * 0.1))); m.spiritDmg = Math.max(m.T.damage || 3, Math.round(2 + lvl * 1.4)); }
    m.dndTint = S.fx === 'mana_frost' ? [0.6, 0.85, 1, 0.3] : t === 'skeleton' || t === 'ghoul' ? null : [0.8, 0.9, 1, 0.22];
    spellFx(g, x, at[1] + 1, z, S.fx, 30, 1.2, { life: 0.8 });
  }
  if (owner.toast) owner.toast(`${S.name}: ${n > 1 ? n + ' ' : ''}${(MOB_TYPES[t].label || t).replace(/^an? /, '')}${n > 1 ? 's' : ''} at your side`, 'good');
  g.sfx.playAt('spell_heal', at[0], at[1], at[2]);
  return true;
}
{
  // summoned allies: hunt what threatens their caster, fade when the spell ends
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (this.dndSummonBy && !this.ghost && !this.T.spirit) {
      const g = this.game, o = this.dndSummonBy, P = o && o.player;
      this.dndSummonT = (this.dndSummonT ?? 60) - dt;
      if (this.dndSummonT <= 0 || !P || P.dead || Math.hypot(P.x - this.x, P.z - this.z) > 80) {
        for (let i = 0; i < 20; i++) spellSpark(g, this.x + (Math.random() - 0.5), this.y + Math.random() * this.h, this.z + (Math.random() - 0.5), 'mana_arcane', { vy: 1.2, life: 0.6, size: 0.06 });
        this.dndNoDrops = true; this.remove = true; return;
      }
      if ((this._huntT = (this._huntT || 0) - dt) <= 0) {
        this._huntT = 0.5;
        if (!this.petFoe || !this.petFoe.alive) {
          let best = null, bd = 18;
          for (const e of g.entities) if (e instanceof Mob && e !== this && e.alive && e.T.hostile && !e.owner && !e.npc && !e.dndSummonBy) { const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; best = e; } }
          this.petFoe = best;
        }
      }
    }
    if (this.dndDominate > 0 && this.dndDomBy && (this._huntT = (this._huntT || 0) - dt) <= 0) {
      this._huntT = 0.5;
      if (!this.petFoe || !this.petFoe.alive) { let best = null, bd = 16; for (const e of this.game.entities) if (e instanceof Mob && e !== this && e.alive && e.T.hostile && !e.owner && !e.npc) { const d = Math.hypot(e.x - this.x, e.z - this.z); if (d < bd) { bd = d; best = e; } } this.petFoe = best; }
    }
    return baseUpd.call(this, dt);
  };
  const baseBite = Mob.prototype.bite;
  if (baseBite) Mob.prototype.bite = function (f, dmg) { return baseBite.call(this, f, this.dndSummonBy && this.spiritDmg ? this.spiritDmg : dmg); };
  const baseDraws = Mob.prototype.draws;
  Mob.prototype.draws = function (out) { const n0 = out.length; const r = baseDraws.call(this, out); if (this.dndTint && !(this.dndPetrify > 0)) for (let i = n0; i < out.length; i++) if (!out[i].tint) out[i].tint = this.dndTint; return r; };
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'dndsummon') { const who = this.remotes.get('g' + from + ':' + (m.li || 0)); const S = DND_SPELLS[m.s]; if (who && S) { who._dndZones = who._dndZones || null; dndDoSummon(this.g, who, S, m.s, +m.l || S.lvl); } return; }
    return baseHost.call(this, from, m);
  };
}

// walls: stone, ice, fire, force, thorns, light; wind just pushes
const DND_WALL_BLOCK = { stone: 'stone', ice: 'packed_ice', force: 'light_blue_stained_glass', thorns: 'sweet_berry_bush', fire: 'magma_block', light: 'glowstone' };
function dndCastWall(lp, c, S, k, slotLvl) {
  const g = lp.g, p = lp.player, w = g.world;
  const at = dndLookPoint(lp, S.at || S.range || 24), look = lookVector(p.yaw, 0);
  const ax = -look[2], az = look[0], len = S.len || 6, hgt = S.hgt || 3, dur = S.dur || 600;
  const dice = dndSpellDice(c, S, slotLvl), placed = [];
  const blockKey = DND_WALL_BLOCK[S.wall];
  const id = blockKey && B[blockKey] !== undefined ? B[blockKey] : null;
  if (!g.isGuest && id !== null && S.wall !== 'wind') {
    for (let i = -Math.floor(len / 2); i <= Math.floor(len / 2); i++) {
      const bx = Math.floor(at[0] + ax * i), bz = Math.floor(at[2] + az * i);
      // stand it on the ground under the point
      let by = Math.floor(at[1]); for (let d = 0; d < 6 && !T_SOLID[w.getBlock(bx, by - 1, bz)]; d++) by--;
      for (let h = 0; h < hgt; h++) { const y = by + h; const cur = w.getBlock(bx, y, bz); if (cur === 0 || T_REPLACEABLE[cur]) { w.setBlock(bx, y, bz, id); placed.push([bx, y, bz]); } }
    }
    if (placed.length) (g._dndWalls || (g._dndWalls = [])).push({ t: dur, id, blocks: placed });
  }
  // walls that hurt what passes through
  if (dice && (S.wall === 'fire' || S.wall === 'thorns' || S.wall === 'light' || S.wall === 'wind')) {
    lp._dndZones = (lp._dndZones || []).filter(z => z.k !== k);
    for (let i = -Math.floor(len / 2); i <= Math.floor(len / 2); i += 2) lp._dndZones.push({ k, x: at[0] + ax * i, y: at[1], z: at[2] + az * i, r: 1.6, t: Math.min(dur, 600), tick: 1, dice, dmg: S.dmg || 'fire', save: S.save, dc: dndSpellDC(c), slow: S.wall === 'thorns' ? 2 : 0, fx: S.fx });
  }
  if (S.wall === 'wind') for (const e of dndHostilesNear(g, at[0], at[1], at[2], len / 2 + 1, lp)) { const dx = e.x - p.x, dz = e.z - p.z, l = Math.hypot(dx, dz) || 1; e.vx += dx / l * 9; e.vz += dz / l * 9; e.vy = Math.max(e.vy, 5); }
  for (let i = 0; i < 40; i++) spellSpark(g, at[0] + ax * (Math.random() - 0.5) * len, at[1] + Math.random() * hgt, at[2] + az * (Math.random() - 0.5) * len, S.fx, { life: 0.8, size: 0.09, vy: 0.5 });
  g.sfx.playAt(S.wall === 'stone' ? 'stone' in SND_FX ? 'stone' : 'spell_ward' : 'spell_ward', at[0], at[1], at[2], 40);
  lp.toast(`${S.name} (${dur >= 60 ? Math.round(dur / 60) + ' min' : dur + ' s'})`, 'good');
  return true;
}
{
  // walls fade when their time is up (only blocks they placed, and only if still theirs)
  const baseTick = Game.prototype.advanceTime;
  Game.prototype.advanceTime = function (dt) {
    const r = baseTick.call(this, dt);
    const W = this._dndWalls; if (W && W.length) {
      for (const wl of W) { wl.t -= dt; if (wl.t <= 0) { for (const [x, y, z] of wl.blocks) if (this.world && this.world.getBlock(x, y, z) === wl.id) this.world.setBlock(x, y, z, 0); } }
      this._dndWalls = W.filter(wl => wl.t > 0);
    }
    return r;
  };
}

// Shapechange and the like: a mighty form for a while (the druid's Wild Shape, stronger)
function dndCastShape(lp, c, S, k, slotLvl) {
  const g = lp.g, p = lp.player, dur = S.dur || 3600, form = S.form || 'bear';
  c.conds.wild = dur; c.conds.shape = dur; (c.condData || (c.condData = {})).shape = form;
  c.tempHp = Math.max(c.tempHp || 0, c.level * 6 + 20);
  giveEffect(lp, 'speed', dur, 1); giveEffect(lp, 'jump', dur, 1); giveEffect(lp, 'strength', dur, 1);
  if (form === 'giant_eagle' || form === 'dragon') c.conds.fly = dur;
  g.burst(p.x, p.y + 1, p.z, 'smoke', 30, 1.4);
  lp.toast(`${S.name}: you take the form of ${form === 'giant_eagle' ? 'a giant eagle' : form === 'dragon' ? 'a dragon' : 'a great bear'} (${c.level * 6 + 20} temporary HP)`, 'epic');
  return true;
}

// ---- the utilities ---------------------------------------------------------------------------------------------------
const DND_UTIL = {
  water(lp, c, S) {
    const g = lp.g, at = dndLookPoint(lp, 12), x = Math.floor(at[0]), y = Math.floor(at[1]), z = Math.floor(at[2]);
    if (g.isGuest) { lp.toast('The water answers the host\'s world only', ''); return false; }
    let removed = 0;
    for (let dx = -2; dx <= 2; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -2; dz <= 2; dz++) { const id = g.world.getBlock(x + dx, y + dy, z + dz); if (T_LIQUID[id] === 1) { g.world.setBlock(x + dx, y + dy, z + dz, 0); removed++; } }
    if (removed) { lp.toast('The water vanishes', ''); return true; }
    if (B.water !== undefined && !T_SOLID[g.world.getBlock(x, y, z)]) { g.world.setBlock(x, y, z, B.water); lp.toast('Clean water wells up', ''); }
    return true;
  },
  food(lp, c, S) { const n = 6; const left = lp.give(mkStack(ITEMS.rations ? 'rations' : 'bread', n)); if (left) lp.g.dropItem(mkStack(ITEMS.rations ? 'rations' : 'bread', left), lp.player.x, lp.player.y + 1, lp.player.z); lp.toast('Food and water for the whole party', 'good'); },
  purify(lp) { const p = lp.player; p.poison = 0; p.fx_poison = 0; p.fx_hunger = 0; lp.toast('Purified: the poison is gone from you and your food', 'good'); },
  message(lp, c, S) {
    const hint = dndQuestHint(lp);
    if (lp.g.locals.length > 1 || lp.g.net) lp.g.toastAll(`${lp.name}'s voice carries to you on the wind`, '');
    lp.toast(hint ? `A whisper returns: “${hint}”` : 'Your words carry to your allies, wherever they are.', '');
  },
  speak(lp, c, S) {
    const hint = dndQuestHint(lp), who = S.with === 'dead' ? 'The dead' : S.with === 'animals' ? 'The beasts' : S.with === 'plants' ? 'The roots and leaves' : S.with === 'stone' ? 'The stones' : 'They';
    lp.toast(hint ? `${who} speak: “${hint}”` : `${who} have nothing to tell you here.`, hint ? 'good' : '');
  },
  scry(lp, c, S) {
    const goal = dndQuestGoal(lp);
    if (!goal) { lp.toast('The vision shows nothing you seek', ''); return; }
    const p = lp.player, dx = goal.at[0] - p.x, dz = goal.at[1] - p.z, d = Math.round(Math.hypot(dx, dz));
    const ang = Math.atan2(dx, -dz), dir = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
    lp.toast(`A vision: ${goal.name} lies ${d} blocks ${dir}.`, 'good');
    const g = lp.g; for (let i = 0; i < 24; i++) spellSpark(g, p.x + dx / (d || 1) * (1 + i * 0.25), p.y + 1.5, p.z + dz / (d || 1) * (1 + i * 0.25), 'mana_light', { life: 2, size: 0.09 });
  },
  reveal(lp, c, S) {
    const g = lp.g, p = lp.player, r = S.range || 24, what = S.what || 'creatures';
    let n = 0;
    if (what === 'ore' && typeof dndStonecunningFx === 'function') return dndStonecunningFx(lp);
    for (const e of g.entities) {
      if (!(e instanceof Mob) || !e.alive || Math.hypot(e.x - p.x, e.z - p.z) > r) continue;
      const t = dndCType(e);
      const ok = what === 'creatures' || what === 'invisible' || (what === 'evil' && ['undead', 'fiend', 'aberration', 'celestial', 'elemental', 'fey'].includes(t)) || (what === 'poison' && (e.T.onHit && e.T.onHit.poison));
      if (!ok) continue;
      dndMarkOn(e, 'outlined', S.dur || 60, lp, S.key); n++;
    }
    if (what === 'magic' || what === 'object' || what === 'hidden') for (const e of g.entities) if (e instanceof DroppedItem && Math.hypot(e.x - p.x, e.z - p.z) < r) { for (let i = 0; i < 6; i++) spellSpark(g, e.x, e.y + 0.4, e.z, 'mana_arcane', { life: 3, size: 0.08 }); n++; }
    if (what === 'traps' && typeof dndRevealTraps === 'function') n += dndRevealTraps(lp, r);
    if (what === 'magic') { const held = p.inv.held, d = held && itemDef(held.id); if (d && (d.rarity || d.magic)) lp.toast(`${d.name} glows with magic (${d.rarity || 'magic'})`, ''); }
    lp.toast(n ? `You sense ${n} ${what === 'traps' ? 'trap' : what === 'magic' ? 'magical thing' : 'presence'}${n === 1 ? '' : 's'} nearby` : 'You sense nothing of the kind nearby', '');
  },
  identify(lp) {
    const held = lp.player.inv.held, d = held && itemDef(held.id);
    if (!d) { lp.toast('Hold the item you want to know', ''); return false; }
    held.ident = 1;
    lp.toast(`${d.name}${d.rarity ? ' · ' + d.rarity.replace('_', ' ') : ''}${d.attune ? ' · requires attunement' : ''}: ${d.desc || 'nothing magical about it.'}`, 'good');
  },
  disguise(lp, c, S) { c.conds.disguise = S.dur || 3600; lp.toast('You look like someone else entirely. Guards and gossips won\'t know you.', 'good'); },
  illusion(lp, c, S) {
    const at = dndLookPoint(lp, S.at || 24), g = lp.g;
    for (const e of dndHostilesNear(g, at[0], at[1], at[2], S.range || 14, lp)) { e.foe = null; e.goal = [at[0], at[1], at[2]]; e.panicT = 0; e.huntT = 0; e.dndBlind = Math.max(e.dndBlind || 0, 2); }
    spellFx(g, at[0], at[1] + 0.8, at[2], S.fx, 50, 1.6, { life: 1.2 });
    lp.toast('An illusion draws their eyes', '');
  },
  open(lp) {
    const g = lp.g, t = lp.target;
    if (typeof dndUnlockAt === 'function' && t && dndUnlockAt(lp, t.x, t.y, t.z, true)) return true;
    if (t && BLOCKS[t.id] && BLOCKS[t.id].door) { lp.useBlockAt && lp.useBlockAt(t, null, null); }
    lp.toast('Click! Whatever was locked is open', '');
  },
  lock(lp) { const t = lp.target; if (!t || typeof dndLockAt !== 'function') { lp.toast('Look at a door or chest to seal it', ''); return false; } dndLockAt(lp, t.x, t.y, t.z); lp.toast('Arcane Lock: only you can open it now', 'good'); },
  shelter(lp, c, S) {
    const p = lp.player, g = lp.g, dur = Math.min(S.dur || 28800, 28800);
    lp._dndZones = (lp._dndZones || []).filter(z => z.k !== S.key);
    lp._dndZones.push({ k: S.key, x: p.x, y: p.y + 1, z: p.z, r: 4, t: dur, tick: 0.25, shelter: true, fx: S.fx });
    g._dndShelter = { x: p.x, y: p.y, z: p.z, r: 4, until: g.time + dur };
    spellRing(g, p.x, p.y + 0.1, p.z, S.fx, 4, 80, { speed: 0.2, life: 2, flat: true });
    lp.toast(`${S.name}: a safe place to rest. Nothing hostile can come in.`, 'good');
  },
  demiplane(lp, c, S) { return DND_UTIL.shelter(lp, c, Object.assign({}, S, { dur: Math.min(S.dur || 3600, 3600) })); },
  teleport(lp, c, S) { return dndTravelMenu(lp, S); },
  transport(lp, c, S) { return dndTravelMenu(lp, S); },
  gate(lp, c, S) { return dndTravelMenu(lp, S); },
  plane_shift(lp, c, S) {
    if (typeof campPlaneShift === 'function') return campPlaneShift(lp, S);
    lp.toast('The way across will not open for you yet. Something on the other side is holding it shut.', 'warn');
    return false;
  },
  weather(lp, c, S) {
    const g = lp.g; if (!g.weather || !g.weather.set) return false;
    const now = g.weather.kind || 'clear', order = ['clear', 'rain', 'storm', 'snow'];
    const next = S.set && now !== S.set ? S.set : order[(order.indexOf(now) + 1) % order.length];
    try { g.weather.set(next); } catch (e) { return false; }
    lp.toast(`The sky obeys: ${next}`, 'good');
  },
  earthquake(lp, c, S) {
    const g = lp.g, p = lp.player, r = S.range || 20, dice = S.dice || [5, 6], dc = dndSpellDC(c);
    if (typeof g.shake === 'function') g.shake(1.5);
    for (const L of g.locals) if (L.shakeT !== undefined) L.shakeT = 2;
    DND_CUR = { lp, S, k: S.key };
    try { for (const e of dndHostilesNear(g, p.x, p.y, p.z, r, lp)) { const sv = dndMobSave(e, 'dex', dc); const n = dndRoll(...dice).total; dndSpellHit(lp, e, sv.ok ? Math.floor(n / 2) : n, 'bludgeoning', { knock: 1.2, saved: sv.ok }); if (!sv.ok) { e.dndHeld = Math.max(e.dndHeld || 0, 1.5); e.dndProne = 1.5; } } } finally { DND_CUR = null; }
    for (let i = 0; i < 120; i++) g.particles.add({ x: p.x + (Math.random() - 0.5) * r * 2, y: p.y + 0.2, z: p.z + (Math.random() - 0.5) * r * 2, vx: 0, vy: 1 + Math.random() * 2, vz: 0, life: 1, max: 1, size: 0.12, uv: tileUV(ATLAS.tile.dirt ?? 0), light: 0xC0 });
    g.sfx.play('rift_boom' in SND_FX ? 'rift_boom' : 'explode');
  },
  time_stop(lp, c, S) {
    const g = lp.g, p = lp.player, t = S.dur || 12;
    for (const e of g.entities) if (e instanceof Mob && e.alive && !e.dndSummonBy && Math.hypot(e.x - p.x, e.z - p.z) < 64) { e.dndHeld = Math.max(e.dndHeld || 0, t); e.dndTimeStop = t; }
    g._timeStopT = t;
    lp.toast(`Time stops. ${t} seconds are yours alone.`, 'epic');
  },
  forcecage(lp, c, S) { const e = dndLookTarget(lp, S.range || 20); if (!e) { lp.toast('Look at a creature to cage it', ''); return false; } e.dndHeld = Math.max(e.dndHeld || 0, (e.T && e.T.boss) ? 6 : S.dur || 60); spellFx(lp.g, e.x, e.y + e.h / 2, e.z, S.fx, 50, 1.6, { life: 1 }); lp.floatText(e.x, e.y + e.h + 0.4, e.z, 'Caged', '#a0c0ff'); },
  maze(lp, c, S) { const e = dndLookTarget(lp, S.range || 20); if (!e) { lp.toast('Look at a creature to banish it into the maze', ''); return false; } dndBanish(lp, e, (e.T && e.T.boss) ? 8 : S.dur || 60); },
  simulacrum(lp, c, S) { return dndDoSummon(lp.g, lp, Object.assign({}, S, { summon: 'mob', mob: MOB_TYPES.knight ? 'knight' : MOB_TYPES.village_guard ? 'village_guard' : 'spirit_wolf', n: 1, dur: Math.min(S.dur || 3600, 3600) }), S.key, 7); },
  clone(lp, c, S) { const p = lp.player; (c.condData || (c.condData = {})).clone = [p.x, p.y, p.z]; c.conds.clone = 864000; lp.toast('Your clone waits, sealed and sleeping. If you die, you wake in it here.', 'epic'); },
  contingency(lp, c, S) { c.conds.contingency = S.dur || 86400; lp.toast('Contingency: if you fall badly hurt, healing magic triggers on its own', 'good'); },
  wish(lp, c, S) {
    const g = lp.g;
    for (const L of g.locals) { const cc = dndOf(L.player); if (!cc) continue; dndHeal(L, 999); const P = L.player; P.poison = 0; P.fx_poison = 0; cc.conds.resist = 28800; (cc.condData || (cc.condData = {})).resist = DND_DMG_TYPES.slice(); for (const q of ['blinded', 'poisoned', 'paralyzed', 'frightened', 'charmed']) delete cc.conds[q]; dndHudDirty(L); }
    for (const r of g.pawns()) if (!g.locals.includes(r) && r.send) r.send({ t: 'adv', k: 'dndheal', n: 999 });
    spellFx(g, lp.player.x, lp.player.y + 2, lp.player.z, 'mana_light', 120, 4, { life: 1.5 });
    lp.toast('Wish: the whole party is restored, and resists every harm for eight hours', 'epic');
  },
};
// where the campaign's current goal is, and a hint toward it
function dndQuestGoal(lp) { try { if (typeof campCurrentGoal === 'function') return campCurrentGoal(lp.g); } catch (e) { /* no campaign */ } return null; }
function dndQuestHint(lp) { try { if (typeof campCurrentHint === 'function') return campCurrentHint(lp.g); } catch (e) { /* no campaign */ } return null; }
function dndTravelMenu(lp, S) {
  const g = lp.g, p = lp.player;
  if (typeof WayMenu !== 'function' || typeof waysOf !== 'function') return false;
  const ways = Object.entries(waysOf(p)).filter(([, r]) => (r.dim ?? 0) === (p.dim ?? g.dim));
  if (!ways.length) { lp.toast('You know no place to go yet. Touch a Resonance Anchor first.', 'warn'); return false; }
  const from = [p.x, p.y, p.z];
  lp.openNpcUI(() => {
    const M = new WayMenu(lp, null);
    M.title = S.name; M.sub = 'Choose where to go'; M.hint = 'Everyone at your side comes with you';
    M.onGo = () => {
      for (const l of g.locals) if (l !== lp && Math.hypot(l.player.x - from[0], l.player.z - from[2]) < 8) { l.player.x = p.x + 1; l.player.y = p.y; l.player.z = p.z + 1; l.player.vx = l.player.vy = l.player.vz = 0; l.player.fallStart = null; }
      if (g.net && !g.isGuest) for (const q of g.net.pawns()) if (Math.hypot(q.x - from[0], q.z - from[2]) < 8) q.send({ t: 'adv', k: 'camptpxyz', x: p.x + 1, y: p.y, z: p.z - 1 });
    };
    M.draw();
    return M;
  });
  return true;
}

// ---- buffs on you: what each does from moment to moment ------------------------------------------------------------------
{
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseUpd.call(this, dt, inp);
    try {
      const c = dndLive(this); if (!c) return r;
      const p = this.player, C = c.conds, D = c.condData || {};
      // flight: hold jump to rise, sneak to sink, and you glide where you'd fall
      if ((C.fly > 0 || C.gaseous > 0) && !p.onGround && !p.inWater && inp) {
        const up = inp.jump ? (C.gaseous > 0 ? 2.5 : 5.5) : inp.sneak ? -4 : -0.6;
        p.vy += (up - p.vy) * Math.min(1, dt * 6); p.fallStart = null;
        const sp = C.gaseous > 0 ? 3 : 7.5, mx = (inp.mx || 0), mz = (inp.mz || 0);
        if (mx || mz) { const s = Math.sin(p.yaw), co = Math.cos(p.yaw); const vx = (mx * co + mz * s) * sp, vz = (-mx * s + mz * co) * sp; p.vx += (vx - p.vx) * Math.min(1, dt * 4); p.vz += (vz - p.vz) * Math.min(1, dt * 4); }
      } else if ((C.fly > 0) && p.onGround && inp && inp.jump && !this._flyJumpWas) p.vy = Math.max(p.vy, 7);
      if (inp) this._flyJumpWas = inp.jump;
      if (C.feather_fall > 0 && p.vy < -5) { p.vy = -5; p.fallStart = null; }
      if (C.spider_climb > 0 && p.hitWall && inp && (inp.mz || 0) < 0) { p.vy = Math.max(p.vy, 3.2); p.fallStart = null; }
      if (C.water_breathing > 0 && p.air !== undefined) p.air = Math.max(p.air, 10);
      if (C.freedom > 0) { p.fx_slow = 0; p.chill = 0; p.webbed = 0; }
      if (C.greater_invis > 0) { if ((p.fx_invis || 0) < 1) giveEffect(this, 'invis', 2); C.invisible = Math.max(C.invisible || 0, 1); }
      if (C.regenerate > 0) { this._regT = (this._regT || 0) + dt; if (this._regT >= 6) { this._regT = 0; if (p.health < p.maxHealth) dndHeal(this, 1); } }
      if (C.heroes_feast > 0) { p.poison = 0; p.fx_poison = 0; }
      // the clone: if you died, you wake in it
      if (p.dead && C.clone > 0 && D.clone && !this._cloneUsed) { this._cloneUsed = true; setTimeout(() => { try { if (p.dead && this.respawn) { this.respawn(); p.x = D.clone[0]; p.y = D.clone[1]; p.z = D.clone[2]; delete C.clone; this.toast('You wake in your clone', 'epic'); } } catch (e) { /* later */ } this._cloneUsed = false; }, 1500); }
      // time stop: the world is frozen until it runs out
      const g = this.g;
      if (g._timeStopT > 0 && this === g.locals[0]) { g._timeStopT -= dt; if (g._timeStopT <= 0) for (const e of g.entities) if (e.dndTimeStop) { e.dndTimeStop = 0; e.dndHeld = 0; } }
      // shelters keep monsters out
      const Sh = g._dndShelter;
      if (Sh && g.time < Sh.until && this === g.locals[0]) for (const e of g.entities) if (e instanceof Mob && e.alive && e.T.hostile && !e.tamed && !e.dndSummonBy) { const dx = e.x - Sh.x, dz = e.z - Sh.z, d = Math.hypot(dx, dz); if (d < Sh.r + 0.5) { e.x = Sh.x + dx / (d || 1) * (Sh.r + 0.6); e.z = Sh.z + dz / (d || 1) * (Sh.r + 0.6); e.vx = dx / (d || 1) * 3; e.vz = dz / (d || 1) * 3; e.foe = null; } }
    } catch (e) { console.warn('dnd buffs', e); }
    return r;
  };
}
// resistance from spells
{
  const baseRes = dndResistances;
  dndResistances = function (c) {
    const out = baseRes(c), C = c.conds || {}, D = c.condData || {};
    if (C.resist > 0 && D.resist) for (const t of D.resist) out.add(t);
    if (C.stoneskin > 0 || C.gaseous > 0) { out.add('bludgeoning'); out.add('piercing'); out.add('slashing'); }
    if (C.mind_blank > 0) out.add('psychic');
    if (C.holy_aura > 0 || C.ethereal > 0) for (const t of DND_DMG_TYPES) out.add(t);
    if (C.protect_poison > 0 || C.heroes_feast > 0) out.add('poison');
    return out;
  };
  const baseMax = dndMaxHp;
  dndMaxHp = function (c) { const D = c.condData || {}; return baseMax(c) + (c.conds && c.conds.heroes_feast > 0 && D.feastHp ? D.feastHp : 0); };
}
// what reaches you: sanctuary, blur, mirror images, protection from evil, foresight, death ward, fire shield, contingency
{
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const c = dndLive(this), p = this.player;
    if (!c || p.dead || amount <= 0) return baseHurt.call(this, amount, src);
    const C = c.conds, D = c.condData || (c.condData = {}), a = src.attacker, fromMob = a && a instanceof Mob;
    const say = (t, col) => this.floatText(p.x, p.y + 2, p.z, t, col);
    if (fromMob) {
      if (C.sanctuary > 0 && Math.random() < 0.75) { a.foe = null; a.huntT = 0; a.panicT = 1; say('Sanctuary', '#ffe8a0'); return; }
      if (D.images > 0 && C.mirror_image > 0 && Math.random() < 0.5) { D.images--; say(D.images ? `An image shatters (${D.images} left)` : 'Your last image shatters', '#c0c0ff'); return; }
      let dodge = 0;
      if (C.blur > 0) dodge += 0.25;
      if (C.foresight > 0) dodge += 0.3;
      if (C.protect_evil > 0 && ['undead', 'fiend', 'aberration', 'celestial', 'elemental', 'fey'].includes(dndCType(a))) dodge += 0.3;
      if (C.holy_aura > 0 && ['undead', 'fiend'].includes(dndCType(a))) { a.dndBlind = Math.max(a.dndBlind || 0, 6); }
      if (dodge && Math.random() < dodge) { say('Missed you!', '#8fe3ff'); p.invuln = Math.max(p.invuln || 0, 0.3); return; }
      if (C.fire_shield > 0 && D.fire_shield && Math.hypot(a.x - p.x, a.z - p.z) < 3) { const n = dndRoll(2, 8).total; dndSpellHit(this, a, n, D.fire_shield.dmg || 'fire', { knock: 0.5 }); }
      if (D.agathys > 0 && (c.tempHp || 0) > 0 && Math.hypot(a.x - p.x, a.z - p.z) < 3) dndSpellHit(this, a, D.agathys, 'cold', { knock: 0.3 });
    }
    const hpBefore = p.health;
    const r = baseHurt.call(this, amount, src);
    if (!p.dead && p.health <= 0 && C.death_ward > 0) { p.health = 1; delete C.death_ward; say('Death Ward!', '#ffe060'); }
    if (C.contingency > 0 && p.health > 0 && p.health < p.maxHealth * 0.25 && hpBefore >= p.maxHealth * 0.25) { delete C.contingency; const n = dndRoll(4, 8).total + 4; dndHeal(this, n); say(`Contingency: +${n}`, '#7aff8a'); }
    return r;
  };
  // your weapon's riders: Elemental Weapon, Crusader's Mantle, Enlarge
  const baseAtk = dndAttack;
  dndAttack = function (lp, e, W, o = {}) {
    const res = baseAtk(lp, e, W, o);
    if (!res || !res.hit) return res;
    const c = dndOf(lp.player); if (!c) return res;
    const C = c.conds, D = c.condData || {};
    if (C.elemental_weapon > 0 && D.elemental_weapon) { const ew = D.elemental_weapon; res.dmg += Math.round(dndRoll(ew.dice[0] * (res.crit ? 2 : 1), ew.dice[1]).total * dndMobTakes(e, ew.dmg)); (res.parts || (res.parts = [])).push(ew.dmg); }
    if (C.enlarge > 0 && !W.ranged) res.dmg += dndRoll(1, 4).total;
    if (C.crusader > 0) res.dmg += dndRoll(1, 4).total;
    if (C.sanctuary > 0) { delete C.sanctuary; lp.toast('Sanctuary ends', ''); }
    return res;
  };
}
// a guest's summons come from the host's world; a guest's shelter only on its own screen
try { window.__dnd = window.__dnd || {}; window.__dnd.cast = (lp, k, o) => dndCast(lp, k, o); } catch (e) { /* no window */ }
// summoned and dominated creatures are the spell's, not companions for your stable
{
  const baseST = stableTick;
  stableTick = function (m, dt) { if (m && (m.dndSummonBy || m.dndDominate > 0 || m.familiar)) return; return baseST(m, dt); };
}
