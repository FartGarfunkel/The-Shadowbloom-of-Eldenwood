// ---------------------------------------------------------------------------
// dnd/rules.js — the tabletop rules, wired into the game.
//
// With a character made (player.stats.dnd), a player plays by the d20:
//   • hit points are the character's (1 HP = half a heart: the hearts row becomes an HP bar)
//   • every swing and every arrow is an attack roll against the creature's armour class;
//     a natural 20 is a critical hit (the dice twice), a 1 always misses
//   • every creature's blow is its attack roll against your armour class
//   • weapons deal their dice plus your Strength (or Dexterity, for finesse and ranged)
//   • rogues sneak-attack, barbarians rage, paladins smite... (dnd/abilities.js), casters cast (dnd/spells.js)
//   • at 0 hit points you fall and make death saving throws; a friend (or a healing spell) brings you back
//   • experience from creatures and quests raises your level (to 20), with more hit points and features
//   • short rests (P: your sheet) spend hit dice; a night in a bed is a long rest
// The game's own crafting skills (mining, smithing, cooking...) stay as they are.
// ---------------------------------------------------------------------------

function dndOf(p) { const P = p && (p.player || p); return P && P.stats ? P.stats.dnd || null : null; }
function dndOn(g) { return !!(g && g.meta && g.meta.dnd !== false); }
function dndLive(lp) { return dndOn(lp.g) ? dndOf(lp.player) : null; }
// is this whoever stands at this screen (a LocalPlayer), with a character
const dndLP = (a) => a instanceof LocalPlayer && dndLive(a) ? a : null;

// ---- hit points ----------------------------------------------------------------------------------------------
{
  const baseMax = Player.prototype.recalcMax;
  Player.prototype.recalcMax = function () {
    const c = this.stats && this.stats.dnd;
    if (!c || (typeof GAME !== 'undefined' && GAME && !dndOn(GAME))) return baseMax.call(this);
    // heart crystals still help: each one is two more hit points (an amulet of health, near enough)
    const m = dndMaxHp(c) + 2 * Math.min(10, this.heartCrystals || 0) + 2 * (this.inv && this.inv.charmBonus ? this.inv.charmBonus('hearts') : 0);
    if (m !== this.maxHealth) { this.maxHealth = m; if (this.health > m) this.health = m; }
  };
}
function dndHealFull(lp) { const p = lp.player; p.recalcMax(); p.health = p.maxHealth; p.downed = 0; }
function dndHeal(lp, n, from) {
  const p = lp.player; if (!p || p.dead) return 0;
  if (p.downed > 0) { p.downed = 0; p.health = 0; p.crawling = false; const c = dndOf(p); if (c) { c.deathS = 0; c.deathF = 0; } lp.toast('You are back on your feet', 'good'); if (typeof downedHud === 'function') downedHud(lp); }
  const h = p.heal(n);
  if (h > 0) lp.floatText(p.x, p.y + 2.1, p.z, '+' + h + ' HP', '#7aff8a');
  return h;
}

// ---- experience and levels -----------------------------------------------------------------------------------------
function dndAwardXp(lp, n, why) {
  const c = dndLive(lp); if (!c || !n) return;
  const ups = dndGainXp(c, n);
  lp.floatText(lp.player.x, lp.player.y + 2.3, lp.player.z, '+' + Math.round(n * (1 + (DND_SPECIES[c.species].xpBonus || 0))) + ' XP', '#e2b84f');
  for (const u of ups) {
    lp.player.recalcMax();
    lp.player.health = Math.min(lp.player.maxHealth, lp.player.health + u.hp);
    const parts = [`+${u.hp} HP`];
    if (u.features.length) parts.push(u.features.join(', '));
    if (u.spells.length) parts.push('spells: ' + u.spells.map(k => DND_SPELLS[k].name).join(', '));
    if (u.asi) parts.push(`${DND_ABILITY_SHORT[u.asi[0]]} +${u.asi[1]}`);
    lp.toast(`Level ${u.level}! ${parts.join(' · ')}`, 'epic');
    dndSound('level');
    if (lp.g.burst) lp.g.burst(lp.player.x, lp.player.y + 1, lp.player.z, 'sparkle', 30, 1.4);
  }
  dndHudDirty(lp);
}
// creatures you beat: their experience, shared out among the party nearby
{
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const r = baseDie.call(this, src);
    const g = this.game;
    try {
      if (dndOn(g) && !g.isGuest && this.T && (this.T.hostile || this.T.campaign) && !this.npc && !this.tamed) {
        const xp = dndMobXp(this);
        const near = g.pawns().filter(p => !p.dead && Math.hypot(p.x - this.x, p.z - this.z) < 48);
        const by = src && src.attacker;
        if (!near.length && by) near.push(by);
        const share = Math.max(1, Math.round(xp / Math.max(1, Math.sqrt(near.length))));
        for (const p of near) { const L = g.locals.find(l => l === p || l.player === p); if (L) dndAwardXp(L, share, this.T.label || this.type); else if (p.send) p.send({ t: 'adv', k: 'campxp', n: share, why: this.T.label || this.type }); }
      }
    } catch (e) { console.warn('dnd xp', e); }
    return r;
  };
}

// ---- your blows: attack rolls --------------------------------------------------------------------------------------
function dndCheckBonus(lp, consume) {
  // Bless, Guidance, Bardic Inspiration: dice that join the next roll
  const c = dndOf(lp.player); if (!c) return 0;
  let b = 0;
  if (c.conds.bless) b += dndDie(4);
  if (c.conds.guidance && consume) { b += dndDie(4); delete c.conds.guidance; }
  if (c.conds.bardic && consume) { b += dndDie(c.conds.bardic); delete c.conds.bardic; }
  return b;
}
// the advantage you have against this creature
function dndAdvAgainst(lp, e, c) {
  let adv = false, dis = false;
  if (e.dndMark && (e.dndMark.outlined > 0 || e.dndMark.guided > 0)) adv = true;
  if (e.dndHeld > 0 || e.dndSleep > 0) adv = true;
  if (c.conds.reckless) adv = true;
  if (c.conds.hidden > 0) adv = true;
  if (c.conds.innate && false) adv = true;
  if (e.dndWeak > 0) { /* its own attacks suffer, not yours */ }
  const p = lp.player;
  if (c.d && c.d.untrained) dis = true;
  if (p.fx_invis > 0 || c.conds.invisible > 0) adv = true;
  return { adv, dis };
}
function dndRollDamage(dice, crit, plus = 0) { const n = dice[0] * (crit ? 2 : 1); return dndRoll(n, dice[1], plus).total; }
// a creature's resistance to a kind of harm
function dndMobTakes(e, type) {
  const T = e.T || {};
  if (T.immune && T.immune.includes(type)) return 0;
  if (type === 'fire' && T.fireImmune) return 0;
  if (T.resist && T.resist.includes(type)) return 0.5;
  if (T.vulnerable && T.vulnerable.includes(type)) return 2;
  const undead = T.undead || /ghoul|skeleton|stray|husk|drowned|wraith|zombie|lich|wight|ghost|spectre|revenant/.test(e.type || '');
  if (type === 'radiant' && undead) return 1.5;
  if ((type === 'poison' || type === 'necrotic') && undead) return 0.5;
  if (type === 'cold' && /frost|stray|snow|ice/.test(e.type || '')) return 0.5;
  return 1;
}
// make the attack; returns { hit, crit, total, roll, dmg, text }
function dndAttack(lp, e, W, o = {}) {
  const c = dndLive(lp); if (!c) return null;
  dndDerive(c, lp.player.inv);
  const A = dndWeaponAttack(c, W);
  const ac = dndMobAC(e) + (e.dndAcBonus || 0);
  const { adv, dis } = dndAdvAgainst(lp, e, c);
  const R = dndD20({ mod: A.toHit + (o.toHit || 0), adv: adv || o.adv, dis: dis || o.dis, lucky: DND_SPECIES[c.species].lucky, bonus: dndCheckBonus(lp, false) + (c.conds.bless ? 0 : 0) });
  let crit = R.roll >= c.d.crit || (e.dndHeld > 0 && Math.hypot(lp.player.x - e.x, lp.player.z - e.z) < 2.5);
  const hit = !R.nat1 && (crit || R.total >= ac);
  if (!hit) {
    // Heroic Inspiration or Luck: a reroll on a miss
    if (c.inspiration && !o.noReroll) { c.inspiration = false; lp.toast('Heroic Inspiration: you reroll!', 'good'); return dndAttack(lp, e, W, Object.assign({}, o, { noReroll: true })); }
    if (c.luck > 0 && !o.noReroll && R.total + 5 >= ac) { c.luck--; lp.toast(`Lucky! You reroll (${c.luck} left)`, 'good'); return dndAttack(lp, e, W, Object.assign({}, o, { noReroll: true })); }
    return { hit: false, crit: false, roll: R.roll, total: R.total, ac, dmg: 0 };
  }
  // the damage: the weapon's dice, your modifier, and everything that rides on the blow
  const versatile = W.ver && !lp.player.inv.offhand ? W.ver : null;
  const dice = versatile && !W.unarmed ? versatile : A.dice;
  let dmg = dndRollDamage(dice, crit, A.dmg);
  if (c.feats.includes('Savage Attacker') && !o.ranged) dmg = Math.max(dmg, dndRollDamage(dice, crit, A.dmg));
  const parts = [], d = c.d;
  // the class's extras
  if (c.conds.rage > 0 && !W.ranged) dmg += d.rageDmg;
  if (c.cls === 'rogue' && (W.props.includes('finesse') || W.ranged) && (adv || c.conds.hidden > 0 || dndAllyNear(lp, e)) && !lp._sneakUsed) { const s = dndRoll(d.sneak * (crit ? 2 : 1), 6).total; dmg += s; parts.push('sneak'); lp._sneakUsed = 0.9; delete c.conds.hidden; }
  if (e.dndMark && e.dndMark.hunted > 0 && e.dndMark.hunter === lp) dmg += dndRoll(crit ? 2 : 1, 6).total;
  if (e.dndMark && e.dndMark.hexed > 0 && e.dndMark.hexer === lp) dmg += dndRoll(crit ? 2 : 1, 6).total;
  if (c.conds.smite && !W.ranged) { const S = c.conds.smite; let sd = dndRoll(S.dice[0] * (crit ? 2 : 1), S.dice[1]).total; if (S.dmg === 'radiant' && dndMobTakes(e, 'radiant') > 1) sd += dndRoll(1, 8).total; dmg += sd; parts.push(S.name.toLowerCase()); if (S.root) e.dndHeld = Math.max(e.dndHeld || 0, S.root); if (S.burn) e.burn = Math.max(e.burn || 0, 4); delete c.conds.smite; dndSpellBurst(lp.g, e.x, e.y + e.h * 0.6, e.z, S.fx || 'mana_light', 30); }
  if (c.conds.mantle > 0) dmg += dndRoll(1, 4).total;
  const held = lp.player.inv.held, hd = held && itemDef(held.id);
  if (hd && hd.dndExtra) dmg += dndRoll(hd.dndExtra[0] * (crit ? 2 : 1), hd.dndExtra[1]).total;
  // the creature's resistances
  const k = dndMobTakes(e, W.element === 'fire' ? 'fire' : W.element === 'frost' ? 'cold' : W.dmg);
  dmg = Math.max(k === 0 ? 0 : 1, Math.round(dmg * k));
  if (e.dndMark && e.dndMark.guided > 0) e.dndMark.guided = 0;   // Guiding Bolt's light is spent on the first hit
  return { hit: true, crit, roll: R.roll, total: R.total, ac, dmg, parts };
}
function dndAllyNear(lp, e) { return lp.g.pawns().some(p => p !== lp && p.player !== lp.player && !p.dead && Math.hypot(p.x - e.x, p.z - e.z) < 2.6); }

{
  const baseAttack = LocalPlayer.prototype.attackEntity;
  LocalPlayer.prototype.attackEntity = function (e) {
    const c = dndLive(this);
    if (!c || !e || e.isVehicle || !(e instanceof Mob) || (e.npc && !(e.T && e.T.hostile)) || e.tamed && e.owner === this.name) return baseAttack.call(this, e);
    const p = this.player;
    if (p.attackCd > 0) { this.swingArm(); return; }
    const W = dndWeaponOf(p.inv.held);
    const res = dndAttack(this, e, W);
    if (!res) return baseAttack.call(this, e);
    const g = this.g;
    // how often you can swing: a turn's attacks, spread across it
    const heavy = W.props.includes('heavy') ? 1.2 : W.props.includes('light') || W.unarmed ? 0.8 : 1;
    const cd = 0.9 * heavy / Math.sqrt(c.d.attacks) / (c.conds.haste > 0 ? 1.4 : 1);
    if (!res.hit) {
      this.swingArm(); p.attackCd = cd;
      this.floatText(e.x, e.y + e.h + 0.25, e.z, `Miss (${res.total})`, '#b8b8c0');
      g.sfx.play('swish') ;
      if (c.conds.hidden > 0) delete c.conds.hidden;
      return;
    }
    // land it through the game's own blow (wear, knockback, sounds, limbs), with our damage
    const tool0 = this.heldTool, og = p.onGround, lc = this._luckyCrit;
    const dmg = res.dmg;
    this.heldTool = () => { const t = tool0.call(this); return Object.assign({}, t || { type: 'hand', damage: 1 }, { damage: dmg }); };
    p.onGround = true; this._luckyCrit = () => false;
    this._dndBlow = { crit: res.crit, total: res.total, parts: res.parts };
    try { baseAttack.call(this, e); } finally { this.heldTool = tool0; p.onGround = og; this._luckyCrit = lc; this._dndBlow = null; }
    p.attackCd = cd;
    if (res.crit) { this.floatText(e.x, e.y + e.h + 0.6, e.z, 'CRITICAL!', '#ffe060'); g.sfx.play('crit'); if (typeof critStars === 'function') critStars(g, e); }
    if (res.parts && res.parts.length) this.floatText(e.x, e.y + e.h + 0.9, e.z, res.parts.join(' · '), '#c8a8ff');
    if (c.conds.hidden > 0) delete c.conds.hidden;
    if (c.conds.invisible > 0) delete c.conds.invisible;
  };
  // the blows from any LocalPlayer go to the creature already rolled: the game's combat skills don't multiply them again
  const baseMobHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const lp = dndLP(src.attacker);
    if (lp && !src.dnd && (src.tool === 'arrow' || src.type === 'arrow' || src.type === 'projectile')) {
      // an arrow: the bow's attack roll
      const W = dndWeaponOf(lp.player.inv.held && itemDef(lp.player.inv.held.id) && (itemDef(lp.player.inv.held.id).bow || /^bow/.test(lp.player.inv.held.id)) ? lp.player.inv.held : mkStack('bow', 1));
      W.ranged = true;
      const res = dndAttack(lp, this, W, { ranged: true });
      if (!res || !res.hit) { lp.floatText(this.x, this.y + this.h + 0.25, this.z, res ? `Miss (${res.total})` : 'Miss', '#b8b8c0'); return 0; }
      amount = res.dmg; src = Object.assign({}, src, { dnd: true });
      if (res.crit) lp.floatText(this.x, this.y + this.h + 0.6, this.z, 'CRITICAL!', '#ffe060');
    } else if (lp && lp._dndBlow) src = Object.assign({}, src, { dnd: true });
    return baseMobHurt.call(this, amount, src);
  };
}

// ---- their blows: the creature's attack roll against your AC -----------------------------------------------------------
{
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const c = dndLive(this), p = this.player, g = this.g;
    if (!c || p.dead || g.creative || amount <= 0) return baseHurt.call(this, amount, src);
    const a = src.attacker;
    dndDerive(c, p.inv);
    let dmg = amount;
    const fromMob = a && (a instanceof Mob || (src.at && MOB_TYPES[src.at])) && !src.bypass && src.type !== 'magic' && src.type !== 'explosion';
    if (fromMob && !(p.invuln > 0)) {
      const m = a instanceof Mob ? a : { T: MOB_TYPES[src.at], type: src.at, maxHealth: MOB_TYPES[src.at].hp };
      let adv = false, dis = (m.dndWeak > 0) || (c.conds.dodge > 0) || c.conds.invisible > 0;
      if (c.conds.reckless) adv = true;
      if (p.downed > 0) adv = true;
      const R = dndD20({ mod: dndMobAttack(m), adv, dis });
      const ac = c.d.ac;
      if (R.nat1 || (!R.nat20 && R.total < ac)) {
        this.floatText(p.x, p.y + 2, p.z, `Miss! (${R.total} vs AC ${ac})`, '#8fe3ff');
        p.invuln = Math.max(p.invuln || 0, 0.35);
        if (c.cls === 'monk' && c.level >= 3 && c.res.focus > 0 && Math.random() < 0.15) { /* Deflect Attacks: flourish only */ }
        return;
      }
      // a hit: the blow varies like a die would, and a critical hits twice as hard
      dmg = Math.max(1, Math.round(amount * (0.65 + Math.random() * 0.7)));
      if (R.nat20) { dmg *= 2; this.floatText(p.x, p.y + 2.2, p.z, 'Critical hit!', '#ff6050'); }
    }
    // resistance by kind
    const kind = src.element === 'fire' || src.type === 'lava' || src.type === 'burn' ? 'fire' : src.element === 'frost' ? 'cold' : src.element === 'poison' || src.type === 'poison' ? 'poison' : src.element || (fromMob ? 'slashing' : null);
    if (kind && c.d.resist.includes(kind)) dmg = Math.max(1, Math.round(dmg / 2));
    if (c.conds.rage > 0 && fromMob) dmg = Math.max(1, Math.round(dmg / 2));
    // temporary hit points soak first
    if (c.tempHp > 0) { const t = Math.min(c.tempHp, dmg); c.tempHp -= t; dmg -= t; if (!dmg) { this.floatText(p.x, p.y + 2, p.z, 'Absorbed', '#c8e8ff'); dndHudDirty(this); return; } }
    // concentration: a hit makes you hold on (Constitution save, DC 10 or half the damage)
    if (c.conc && dmg > 0) {
      const dc = Math.max(10, Math.floor(dmg / 2)), R = dndD20({ mod: c.d.saves.con });
      if (R.total < dc && !R.nat20) { this.toast(`You lose your concentration on ${DND_SPELLS[c.conc.k] ? DND_SPELLS[c.conds.concName || c.conc.k].name : 'your spell'}`, 'warn'); dndEndConc(this); }
    }
    // the armour already did its work in the roll: don't let the game take its share again
    const s2 = Object.assign({}, src, { bypassArmor: true, dnd: true });
    const before = p.health;
    const r = baseHurt.call(this, dmg, s2);
    if (p.health < before) { p.wearArmor(); this.floatText(p.x, p.y + 1.9, p.z, '−' + (before - p.health), '#ff7060'); }
    dndHudDirty(this);
    return r;
  };
  // the game's Defence skill doesn't stack on top of your armour class
  const baseP = Player.prototype.hurt;
  Player.prototype.hurt = function (amount, source = {}) {
    if (source.dnd) source = Object.assign({}, source, { bypassArmor: true });
    return baseP.call(this, amount, source);
  };
}

// ---- falling: death saving throws ----------------------------------------------------------------------------------------
{
  const baseDie = LocalPlayer.prototype.die;
  LocalPlayer.prototype.die = function (src = {}) {
    const c = dndLive(this), p = this.player, g = this.g;
    if (c && !p.downed && !g.creative && src.type !== 'void' && !src.finish && g.state === 'playing') {
      // the orc's Relentless Endurance: 1 HP instead, once a day
      if (c.res.relentless > 0) { c.res.relentless = 0; p.health = 1; p.dead = false; this.toast('Relentless Endurance! You refuse to fall.', 'epic'); this.floatText(p.x, p.y + 2, p.z, 'Relentless!', '#ffb050'); return; }
      p.downed = 999; p.downSrc = { type: src.type, attacker: src.attacker }; p.health = 1; p.dead = false;
      p.vx = p.vz = 0; p.crawling = true; this.mining = null; this._giveUp = 0; c.deathS = 0; c.deathF = 0; this._dsT = 2.5;
      if (this.mode === 'inv') this.closeInventory();
      g.sfx.play('hurt');
      this.toast('You fall! Death saving throws: three successes and you rise. A friend or a healing spell brings you back sooner.', 'warn');
      if (typeof partyOthers === 'function') for (const o of partyOthers(g, this)) if (o.local) o.who.toast(`${c.name} is down! Hold Use on them, or heal them`, 'warn');
      if (g.net) { if (g.isGuest) g.net.send({ t: 'adv', k: 'downsay', li: this.index || 0, n: c.name }); else g.net.all({ t: 'toast', m: `${c.name} is down! Hold Use on them, or heal them`, k: 'warn' }); }
      dndHudDirty(this);
      return;
    }
    return baseDie.call(this, src);
  };
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const c = dndLive(this), p = this.player;
    if (c && p.downed > 0 && !p.dead) {
      p.downed = 999;   // the clock is the dice now
      p.health = Math.min(p.health, 1);
      if ((this._dsT = (this._dsT ?? 3) - dt) <= 0) {
        this._dsT = 3.2;
        dndRollShow(this.el, { label: 'Death saving throw', mod: 0, dc: 10, hold: 900 }).then((R) => {
          if (!(p.downed > 0) || p.dead) return;
          if (R.nat20) { p.downed = 0; p.health = 1; p.crawling = false; c.deathS = c.deathF = 0; this.toast('A natural 20! You rise with 1 hit point.', 'epic'); if (typeof downedHud === 'function') downedHud(this); dndHudDirty(this); return; }
          if (R.ok) c.deathS = (c.deathS || 0) + 1; else c.deathF = (c.deathF || 0) + (R.nat1 ? 2 : 1);
          if (c.deathS >= 3) { p.downed = 0; p.health = 1; p.crawling = false; c.deathS = c.deathF = 0; this.toast('Stable. You stagger up with 1 hit point.', 'good'); if (typeof downedHud === 'function') downedHud(this); }
          else if (c.deathF >= 3) { c.deathS = c.deathF = 0; p.downed = 0; const s = Object.assign({}, p.downSrc || {}, { finish: true }); p.health = 0; this.die(s); }
          dndHudDirty(this); if (typeof downedHud === 'function') downedHud(this);
        });
      }
    }
    return baseUpd.call(this, dt, inp);
  };
  // a blow while you're down: a failed save
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const c = dndLive(this), p = this.player;
    if (c && p.downed > 0 && amount > 0 && !(p.invuln > 0)) { c.deathF = (c.deathF || 0) + 1; p.invuln = 1; p.hurtFlash = 1; this.toast(`Struck while down: a failed death save (${c.deathF}/3)`, 'warn'); if (c.deathF >= 3) { c.deathS = c.deathF = 0; p.downed = 0; p.health = 0; this.die(Object.assign({}, src, { finish: true })); } dndHudDirty(this); return 0; }
    return baseHurt.call(this, amount, src);
  };
}

// ---- healing from food is small; rest is the real cure -----------------------------------------------------------------------
{
  const baseUse = LocalPlayer.prototype.useItem || null;
  const baseHeal = Player.prototype.heal;
  Player.prototype.heal = function (n) {
    const c = this.stats && this.stats.dnd;
    if (c && this._eating && typeof GAME !== 'undefined' && dndOn(GAME)) n = Math.max(1, Math.round(n * 0.35));
    return baseHeal.call(this, n);
  };
}

// ---- rests ----------------------------------------------------------------------------------------------------------------------
function dndDoRest(lp, kind) {
  const c = dndLive(lp); if (!c) return false;
  const g = lp.g, p = lp.player;
  if (kind === 'short') {
    const foe = g.entities.some(e => e instanceof Mob && e.alive && e.T.hostile && !e.tamed && Math.hypot(e.x - p.x, e.z - p.z) < 18);
    if (foe) { lp.toast('You can\'t rest with enemies near', 'warn'); return false; }
    const before = p.health, R = dndRest(c, 'short');
    p.health = Math.min(p.maxHealth, p.health + R.healed);
    lp.toast(`Short rest: ${p.health - before ? '+' + (p.health - before) + ' HP (hit dice spent), ' : ''}features recovered`, 'good');
    if (g.meta && !g.isGuest) g.meta.time = ((g.meta.time || 0) + DAY_LEN / 24) % DAY_LEN;
  } else {
    dndRest(c, 'long');
    p.recalcMax(); p.health = p.maxHealth;
    lp.toast('Long rest: hit points, spell slots and features restored', 'good');
  }
  dndHudDirty(lp);
  return true;
}
// a night in bed is a long rest
{
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const was = !!this.sleeping;
    const r = baseUpd.call(this, dt, inp);
    const c = dndLive(this);
    if (c && was && !this.sleeping) {
      const ph = ((this.g.meta && this.g.meta.time) || 0) / DAY_LEN;
      if (ph < 0.2 || ph > 0.97) dndDoRest(this, 'long');
    }
    return r;
  };
}

// ---- the HUD: hit points, armour class, level and resources --------------------------------------------------------------
function dndHudDirty(lp) { if (lp && lp.hud) lp.hud._dndSig = null; }
{
  const baseFrame = Hud.prototype.frame;
  Hud.prototype.frame = function (dt, cam) {
    const r = baseFrame.call(this, dt, cam);
    const lp = this.lp, c = lp && dndLive(lp);
    if (!this.root) return r;
    let el = this._dndEl;
    if (!c) { if (el) { el.remove(); this._dndEl = null; this.root.classList.remove('dnd-on'); } return r; }
    const p = lp.player;
    if (!el || !el.isConnected) {
      el = this._dndEl = document.createElement('div'); el.className = 'dnd-hud';
      el.innerHTML = `<div class="dh-top"><span class="dh-ac" title="Armour class"><b></b><i>AC</i></span><div class="dh-hpwrap"><div class="dh-hp"><i class="dh-fill"></i><i class="dh-temp"></i><span class="dh-hpt"></span></div><div class="dh-xp"><i></i></div></div><span class="dh-lv"></span></div><div class="dh-res"></div>`;
      const bottom = this.root.querySelector('.bottom'); (bottom || this.root).insertBefore(el, bottom ? bottom.firstChild : null);
      this.root.classList.add('dnd-on');
    }
    dndDerive(c, p.inv);
    const conc = c.conc ? (DND_SPELLS[c.conc.k] || {}).name : '';
    const sig = [Math.ceil(p.health), p.maxHealth, c.tempHp, c.d.ac, c.level, c.xp, c.slots.join(','), c.res.sig, c.res.racial, c.res.focus, c.res.pool, c.deathS, c.deathF, p.downed > 0, conc, c.inspiration, c.luck, Object.keys(c.conds).join(','), lp._dndSpell].join('|');
    if (sig !== this._dndSig) {
      this._dndSig = sig;
      const hp = Math.max(0, Math.ceil(p.health)), mx = p.maxHealth;
      el.querySelector('.dh-ac b').textContent = c.d.ac;
      el.querySelector('.dh-fill').style.width = Math.min(100, hp / mx * 100) + '%';
      el.querySelector('.dh-temp').style.width = Math.min(100, (c.tempHp || 0) / mx * 100) + '%';
      el.querySelector('.dh-hpt').textContent = p.downed > 0 ? `Dying · saves ${'●'.repeat(c.deathS || 0)}${'○'.repeat(3 - (c.deathS || 0))} fails ${'✖'.repeat(c.deathF || 0)}${'·'.repeat(3 - Math.min(3, c.deathF || 0))}` : `${hp} / ${mx} HP${c.tempHp ? ' (+' + c.tempHp + ')' : ''}`;
      el.querySelector('.dh-hp').classList.toggle('low', hp <= mx / 4);
      el.querySelector('.dh-hp').classList.toggle('dying', p.downed > 0);
      const next = c.level < DND_MAX_LEVEL ? DND_XP[c.level + 1] : null, prev = DND_XP[c.level];
      el.querySelector('.dh-xp i').style.width = next ? Math.min(100, (c.xp - prev) / (next - prev) * 100) + '%' : '100%';
      el.querySelector('.dh-lv').innerHTML = `<b>${c.level}</b><i>${esc(DND_CLASSES[c.cls].name)}</i>`;
      const C = DND_CLASSES[c.cls], S = DND_SIGNATURES[C.signature];
      const res = [];
      if (S) res.push(`<span class="dh-r" title="${esc(S.desc)}"><kbd>${dndKeyName(lp, 'dndAbility')}</kbd>${esc(S.name)} ${c.cls === 'paladin' ? (c.res.pool || 0) + ' HP' : c.res.sig ?? 0}</span>`);
      if (c.res.racialMax) res.push(`<span class="dh-r"><kbd>${dndKeyName(lp, 'dndRacial')}</kbd>${esc(dndRacialName(c))} ${c.res.racial}</span>`);
      if (c.cls === 'monk' && c.level >= 2) res.push(`<span class="dh-r">Focus ${c.res.focus || 0}</span>`);
      if (C.caster) {
        const sp = lp._dndSpell && DND_SPELLS[lp._dndSpell];
        const slots = c.slots.map((n, i) => n || c.slotsMax[i] ? `<span class="dh-slot" title="Level ${i + 1} slots">${i + 1}:${'◆'.repeat(n || 0)}${'◇'.repeat(Math.max(0, (c.slotsMax[i] || 0) - (n || 0)))}</span>` : '').join('');
        res.push(`<span class="dh-r dh-spell"><kbd>${dndKeyName(lp, 'dndCast')}</kbd>${sp ? esc(sp.name) + (sp.lvl ? ` <em>L${sp.lvl}</em>` : ' <em>cantrip</em>') : 'No spell'}</span>${slots}`);
      } else if (c.spells && c.spells.length) {
        const sp = lp._dndSpell && DND_SPELLS[lp._dndSpell];
        res.push(`<span class="dh-r dh-spell"><kbd>${dndKeyName(lp, 'dndCast')}</kbd>${sp ? esc(sp.name) : 'No spell'}</span>`);
      }
      if (conc) res.push(`<span class="dh-r dh-conc">◎ ${esc(conc)}</span>`);
      if (c.inspiration) res.push('<span class="dh-r dh-insp" title="Heroic Inspiration: your next miss is rerolled">✦ Inspired</span>');
      if (c.conds.rage > 0) res.push('<span class="dh-r dh-rage">RAGE</span>');
      el.querySelector('.dh-res').innerHTML = res.join('');
    }
    return r;
  };
}
function dndKeyName(lp, act) {
  if (lp.pads && lp.pads.size) { const PB = (lp.g.pads && lp.g.pads.binds) || padBinds(lp.g.settings && lp.g.settings.padBinds); const k = PB[act] && PB[act][0]; return k != null ? PAD_BUTTON_NAMES[k] : '?'; }
  const binds = lp.g.input && lp.g.input.binds; const k = binds && binds[act] && binds[act][0];
  return k ? k.replace(/^Key|^Digit/, '') : '?';
}

// ---- the keys: cast, change spell, class feature, species feature, character sheet --------------------------------------------
{
  const NEW = [['dndCast', 'Cast spell', ['KeyZ']], ['dndSpellNext', 'Next spell', ['KeyG']], ['dndAbility', 'Class feature', ['KeyB']], ['dndRacial', 'Species feature', ['KeyN']], ['dndSheet', 'Character sheet', ['KeyP']]];
  const at = KEY_ACTIONS.findIndex(a => a[0] === 'hideHud');
  KEY_ACTIONS.splice(at < 0 ? KEY_ACTIONS.length : at, 0, ...NEW);
  for (const [id, , k] of NEW) KEY_DEFAULTS[id] = k;
  // the old spell key (G) belongs to the tabletop spells now: they share it
  const basePress = InputManager.prototype.pressCode;
  InputManager.prototype.pressCode = function (code, e) { const r = basePress.call(this, code, e); for (const [id] of NEW) if (this.actionsFor(code).includes(id)) this.s[id] = true; return r; };
  const baseEnd = InputManager.prototype.endFrame;
  InputManager.prototype.endFrame = function () { baseEnd.call(this); for (const [id] of NEW) this.s[id] = false; };
  const baseMerge = mergeInput;
  mergeInput = function (a, b) { const r = baseMerge(a, b); for (const [id] of NEW) a[id] = a[id] || b[id]; return r; };
  // controllers: d-pad up casts, d-pad left changes spell, d-pad right is your class feature, right stick click your species'
  const PADNEW = [['dndCast', 'Cast spell', [12]], ['dndSpellNext', 'Next spell', [14]], ['dndAbility', 'Class feature', [15]], ['dndRacial', 'Species feature', [11]]];
  for (const a of PAD_ACTIONS) { if (a[0] === 'place') a[2] = []; if (a[0] === 'prev') a[2] = [4]; if (a[0] === 'next') a[2] = [5]; if (a[0] === 'pick') a[2] = []; }
  PAD_ACTIONS.push(...PADNEW);
  const baseState = Gamepads.prototype.stateFor;
  const prevB = new Map();
  if (Gamepads.prototype.poll) {
    const basePoll = Gamepads.prototype.poll;
    Gamepads.prototype.poll = function (...a) {
      const r = basePoll.apply(this, a);
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const PB = this.binds || padBinds((this.g.settings || {}).padBinds);
        for (const pad of pads) {
          if (!pad) continue;
          const i = pad.index, s = this.st && this.st.get(i); if (!s) continue;
          const { b } = padLayout(pad, this.g.settings && this.g.settings.swapNintendo);
          const pb = prevB.get(i) || [];
          for (const [id] of PADNEW) s[id] = (PB[id] || []).some(k => b[k] && !pb[k]);
          prevB.set(i, b.slice());
        }
      } catch (e) { /* no pads */ }
      return r;
    };
  }
}

// ---- the sheet (P) ---------------------------------------------------------------------------------------------------------------
Object.assign(LocalPlayer.prototype, {
  openDndSheet() {
    const c = dndLive(this); if (!c) return;
    if (this.dndSheetEl) { this.closeDndSheet(); return; }
    if (this.journalEl) this.closeJournal();
    dndDerive(c, this.player.inv);
    const d = c.d, C = DND_CLASSES[c.cls], Sp = DND_SPECIES[c.species], Bg = DND_BACKGROUNDS[c.bg], L = Sp.lineages && c.lineage && Sp.lineages[c.lineage];
    const el = this.dndSheetEl = document.createElement('div');
    el.className = 'skills-view dnd-sheet';
    const abil = DND_ABILITIES.map(a => `<div class="ds-ab"><span>${DND_ABILITY_SHORT[a]}</span><b>${dndSigned(d.mods[a])}</b><i>${c.ab[a]}</i><em class="${C.saves.includes(a) ? 'prof' : ''}">save ${dndSigned(d.saves[a])}</em></div>`).join('');
    const skills = DND_SKILL_ORDER.map(k => `<div class="ds-sk${c.skills.includes(k) ? ' prof' : ''}${c.expertise.includes(k) ? ' exp' : ''}"><span>${c.skills.includes(k) ? '●' : '○'} ${esc(DND_SKILLS[k].name)} <i>${DND_ABILITY_SHORT[DND_SKILLS[k].ab]}</i></span><b>${dndSigned(d.skills[k])}</b></div>`).join('');
    const feats = [];
    for (let l = 1; l <= c.level; l++) for (const f of (C.features[l] || [])) feats.push(`<li><b>${esc(f)}</b> <i>(${l})</i></li>`);
    for (const [n, t] of Sp.traits) feats.push(`<li><b>${esc(n)}</b> — ${esc(t)}</li>`);
    for (const f of c.feats) feats.push(`<li><b>${esc(f)}</b> — ${esc(DND_FEATS[f] || '')}</li>`);
    const W = dndWeaponOf(this.player.inv.held), A = dndWeaponAttack(c, W);
    const spells = c.spells.length ? c.spells.map(k => { const S = DND_SPELLS[k]; return S ? `<li class="${lpSpell(this) === k ? 'on' : ''}" data-spell="${k}"><b>${esc(S.name)}</b> <i>${S.lvl ? 'level ' + S.lvl : 'cantrip'} · ${esc(S.school)}</i><div>${esc(S.desc)}</div></li>` : ''; }).join('') : '<li>No spells.</li>';
    const sig = DND_SIGNATURES[C.signature];
    el.innerHTML = `<div class="sk-card ds-card">
      <div class="sk-head"><span class="sk-title">${esc(c.name)}</span><span class="sk-total">${esc(L && (c.species === 'elf' || c.species === 'gnome') ? L.name : Sp.name)} ${esc(C.name)} ${c.level} · ${esc(Bg.name)}</span></div>
      <div class="ds-top">
        <div class="ds-big"><b>${d.ac}</b><span>Armour class</span></div>
        <div class="ds-big"><b>${Math.ceil(this.player.health)}/${this.player.maxHealth}</b><span>Hit points</span></div>
        <div class="ds-big"><b>${dndSigned(d.initiative)}</b><span>Initiative</span></div>
        <div class="ds-big"><b>${d.speed} ft</b><span>Speed</span></div>
        <div class="ds-big"><b>${dndSigned(d.prof)}</b><span>Proficiency</span></div>
        <div class="ds-big"><b>${d.passive}</b><span>Passive Perception</span></div>
        <div class="ds-big"><b>${c.hitDice}d${C.hd}</b><span>Hit dice</span></div>
        <div class="ds-big"><b>${c.xp}</b><span>XP${d.xpNext ? ' / ' + d.xpNext : ''}</span></div>
      </div>
      <div class="ds-cols">
        <div class="ds-col"><div class="pk-h">Abilities</div><div class="ds-abs">${abil}</div>
          <div class="pk-h">In hand</div><div class="ds-weap"><b>${esc(W.name)}</b> ${dndSigned(A.toHit)} to hit · ${W.ver && !this.player.inv.offhand ? W.ver[0] + 'd' + W.ver[1] : A.dice[0] + 'd' + A.dice[1]}${A.dmg ? dndSigned(A.dmg) : ''} ${esc(W.dmg)}${d.armorType ? ` · ${d.armorType} armour${d.untrained ? ' (untrained!)' : ''}` : ''}${d.shield ? ' · shield' : ''}</div>
          ${C.caster ? `<div class="pk-h">Spellcasting (${DND_ABILITY_NAMES[C.castAb]})</div><div class="ds-weap">Save DC ${d.spellDC} · spell attack ${dndSigned(d.spellAtk)} · slots ${c.slots.map((n, i) => (i + 1) + ':' + n + '/' + c.slotsMax[i]).join(' ')}</div>` : ''}
          <div class="ds-rest"><button class="btn tiny" data-rest="short">Short rest (1 hour)</button><span>A night in a bed is a long rest.</span></div>
        </div>
        <div class="ds-col"><div class="pk-h">Skills</div><div class="ds-sks">${skills}</div></div>
        <div class="ds-col"><div class="pk-h">Features &amp; traits</div><ul class="ds-feats">${sig ? `<li><b>${esc(sig.name)}</b> (${dndKeyName(this, 'dndAbility')}) — ${esc(sig.desc)}</li>` : ''}${feats.join('')}</ul>
          ${c.spells.length ? `<div class="pk-h">Spells <i>(click to ready)</i></div><ul class="ds-spells">${spells}</ul>` : ''}</div>
      </div>
      <div class="sk-hint">P to close · J for the journal</div></div>`;
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target === el) { this.closeDndSheet(); return; }
      const r = e.target.closest('[data-rest]'); if (r) { if (dndDoRest(this, r.dataset.rest)) { this.closeDndSheet(); } return; }
      const s = e.target.closest('[data-spell]'); if (s) { this._dndSpell = s.dataset.spell; dndHudDirty(this); this.closeDndSheet(); this.openDndSheet(); }
    });
    this.el.appendChild(el);
    this.g.sfx.play('map_paper');
  },
  closeDndSheet() { if (this.dndSheetEl) { this.dndSheetEl.remove(); this.dndSheetEl = null; } },
});
function lpSpell(lp) { return lp._dndSpell; }
{
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const c = dndLive(this);
    if (c && inp) {
      if (this.dndSheetEl && (inp.dndSheet || inp.pause || inp.padB || inp.inventory)) { this.closeDndSheet(); inp = InputManager.blankState(); }
      else if (inp.dndSheet && this.mode === 'play') this.openDndSheet();
      if (this.mode === 'play' && !this.player.dead && !(this.player.downed > 0)) {
        if (inp.dndSpellNext) { dndNextSpell(this); inp = Object.assign({}, inp, { spell: false }); }
        if (inp.dndCast) dndCastReady(this);
        if (inp.dndAbility) dndUseSignature(this);
        if (inp.dndRacial) dndUseRacial(this);
      }
      // the clocks on conditions and buffs
      dndTickConds(this, dt);
      if (this._sneakUsed > 0) this._sneakUsed -= dt;
      // the species' pace
      const ft = c.d ? c.d.speed : 30;
      this.player._dndSpeed = ft / 30;
    }
    return baseUpd.call(this, dt, inp);
  };
  const baseMove = Player.prototype.move;
  Player.prototype.move = function (world, inp, dt, opts) {
    if (this._dndSpeed && this._dndSpeed !== 1 && !this.flying) opts = Object.assign({}, opts, { slow: (opts && opts.slow || 1) * Math.min(1.6, Math.max(0.7, 1 + (this._dndSpeed - 1) * 0.6)) });
    return baseMove.call(this, world, inp, dt, opts);
  };
}
// timed conditions (seconds): rage, hidden, blessings...
function dndTickConds(lp, dt) {
  const c = dndOf(lp.player); if (!c) return;
  let changed = false;
  for (const [k, v] of Object.entries(c.conds)) {
    if (typeof v !== 'number' || ['aid', 'mage_armor', 'bardic', 'aura'].includes(k)) continue;
    c.conds[k] = v - dt;
    if (c.conds[k] <= 0) { delete c.conds[k]; changed = true; if (k === 'rage') lp.toast('Your rage fades', ''); if (k === 'haste') { lp.toast('A wave of lethargy as the haste ends', 'warn'); } if (k === 'wild') dndWildEnd(lp); }
  }
  if (c.conds.heroism > 0 && (lp._heroT = (lp._heroT || 0) + dt) > 6) { lp._heroT = 0; c.tempHp = Math.max(c.tempHp || 0, Math.max(1, dndCastMod(c))); changed = true; }
  if (c.conc && c.conc.t != null && (c.conc.t -= dt) <= 0) dndEndConc(lp);
  if (changed) dndHudDirty(lp);
}
function dndEndConc(lp) {
  const c = dndOf(lp.player); if (!c || !c.conc) return;
  const k = c.conc.k, S = DND_SPELLS[k];
  if (S && S.buff) delete c.conds[S.buff];
  for (const e of lp.g.entities) if (e.dndMark && e.dndMark.by === lp && e.dndMark.spell === k) { e.dndMark = null; e.dndHeld = 0; }
  if (S && S.summon) for (const e of lp.g.entities) if (e.dndSummonBy === lp) e.remove = true;
  if (lp._dndZones) lp._dndZones = lp._dndZones.filter(z => z.k !== k);
  c.conc = null; dndHudDirty(lp);
}

// ---- making one's way in the world: a name over your head ------------------------------------------------------------------
{
  const baseTag = Net.prototype.localStates;
  if (baseTag) Net.prototype.localStates = function (...a) {
    const out = baseTag.apply(this, a);
    try { for (const s of out || []) { const l = this.g.locals.find(x => (x.index || 0) === (s.idx ?? s.li ?? 0)); const c = l && dndOf(l.player); if (c) s.dn = s.dn || 0, s.dl = c.level, s.dc = c.cls; } } catch (e) { /* keep going */ }
    return out;
  };
}
