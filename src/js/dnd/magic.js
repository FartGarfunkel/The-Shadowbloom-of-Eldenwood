// ---------------------------------------------------------------------------
// dnd/magic.js — (alpha 3) magic items: rarity, attunement, charges, potions, scrolls and loot.
//
// The items themselves are data (dnd/magicitems.js, from the SRD 5.2). Here they become things in the world:
//   · Rarity: common, uncommon, rare, very rare, legendary, artifact — coloured in tooltips, and the deeper you go and
//     the tougher the foe, the rarer what it drops.
//   · Attunement: an item that needs it works once you attune to it (use it: you spend a quiet moment with it).
//     Three at once, as at the table. Use it again to let it go.
//   · Weapons work in your hand, armour when worn, shields in your off hand, rings, cloaks, boots, belts and the rest
//     whenever you carry them (attuned if they need it). Wands, staffs and rods spend charges and recharge at dawn
//     (your long rest). Potions are drunk. A Bag of Holding is worn on your back.
//   · Spell scrolls: one for every spell in the game. Anyone whose class has the spell reads it freely; anyone else
//     tries an Arcana check.
// ---------------------------------------------------------------------------

const DND_RARITY = ['common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact'];
const DND_RARITY_NAME = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', very_rare: 'Very rare', legendary: 'Legendary', artifact: 'Artifact' };
const DND_ANY_WEAPON = { any: 'longsword', any_sword: 'longsword', any_axe: 'battleaxe', any_blade: 'scimitar', any_bludgeon: 'warhammer', any_ranged: 'longbow' };
const DND_ANY_ARMOR = { any: 'chain', any_light_armor: 'studded', any_medium_armor: 'halfplate', any_heavy_armor: 'plate' };
const DND_ATTUNE_MAX = 3;
const DND_MAGIC_KEY = {};          // magic item key → the item's key in the game (armour keys start with their material)
function dndMagicKey(k) { return DND_MAGIC_KEY[k] || k; }

{
  for (const [k, M] of Object.entries(DND_MAGIC_ITEMS)) {
    const icon = 'dnd_m_' + k;
    const props = { name: M.name, maxStack: M.stack || 1, desc: M.desc, rarity: M.rarity, dndMagic: M, attune: M.attune || false, magic: true, art: M.art, icon };
    let key = k;
    switch (M.slot) {
      case 'weapon': case 'staff': {
        let base = DND_ANY_WEAPON[M.base] || M.base;
        if (M.slot === 'staff' && !base) base = 'quarterstaff';
        if (base === 'longbow' || base === 'shortbow') {
          Object.assign(props, { bow: true, magicBow: base, tool: Object.assign({}, ITEMS.bow ? ITEMS.bow.tool : { type: 'bow', tier: 0, speed: 1, damage: 1, durability: 384 }), modelOf: 'bow' });
        } else if (base && ITEMS[base]) {
          const B0 = ITEMS[base];
          Object.assign(props, { tool: B0.tool && Object.assign({}, B0.tool), dnd: B0.dnd && Object.assign({}, B0.dnd, { bonus: (M.plus || 0) }), modelOf: base, dndRanged: B0.dndRanged || null });
          if (B0.dndGear && B0.dndGear.focus) props.dndGear = Object.assign({}, B0.dndGear);
          if (M.plus) props.dndPlus = M.plus;
        }
        if (M.extra) props.dndExtraT = M.extra;
        if (M.slot === 'staff' || M.castList || M.cast) props.dndCharged = true;
        break;
      }
      case 'armor': {
        const mat = DND_ANY_ARMOR[M.armorSet] || M.armorSet || 'chain';
        key = (ARMOR_MATS[mat] ? mat : 'chain') + '_' + k;
        const m = ARMOR_MATS[mat] || ARMOR_MATS.iron;
        Object.assign(props, { armor: { slot: 1, points: m.pts[1] + (M.plus || 0), durability: (m.dur || 15) * 20 }, icon: (ARMOR_MATS[mat] ? mat : 'chain') + '_chestplate', dndArmorPlus: M.plus || 0 });
        break;
      }
      case 'shield': Object.assign(props, { dndGear: Object.assign({}, DND_GEAR.shield, { shield: 2 + (M.shieldPlus || 0) }), modelOf: 'shield' }); break;
      case 'potion': props.dndPotion = true; break;
      case 'ammo': props.dndAmmo = true; props.maxStack = 64; break;
      case 'wand': case 'rod': props.dndCharged = true; break;
    }
    if (M.bag) props.backpack = M.bag;
    if (M.cast || M.castList || M.summonMob) props.dndCharged = true;
    DND_MAGIC_KEY[k] = key;
    defItem(key, props);
  }
  // a scroll for every spell
  const SCROLL_RARITY = [, 'common', 'uncommon', 'uncommon', 'rare', 'rare', 'very_rare', 'very_rare', 'very_rare', 'legendary'];
  for (const [k, S] of Object.entries(DND_SPELLS)) {
    defItem('scroll_' + k, { name: `Spell Scroll: ${S.name}`, maxStack: 8, icon: 'dnd_scroll_' + Math.min(9, S.lvl), rarity: S.lvl ? SCROLL_RARITY[S.lvl] : 'common', art: 'scroll', dndScroll: k, magic: true,
      desc: `${S.lvl ? 'Level ' + S.lvl : 'Cantrip'} ${S.school.toLowerCase()} spell. Use to read it: ${S.desc}` });
  }
}
// the pictures: each item's own, and a scroll for each spell level
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    for (const [k, M] of Object.entries(DND_MAGIC_ITEMS)) addItem('dnd_m_' + k, p => dndPaintArt(p, M.art && DND_ART[M.art] ? M.art : 'gem', M.cols || ['#a080ff', '#3a1a8a', '#f0e8ff']));
    const SC = ['#e8dcc0', '#d8c8a0', '#c8e0ff', '#a0d0ff', '#c0a0ff', '#e0a0ff', '#ffa0c0', '#ffc080', '#ffe080', '#ffffa0'];
    for (let l = 0; l <= 9; l++) addItem('dnd_scroll_' + l, p => dndPaintArt(p, DND_ART.scroll ? 'scroll' : 'book', ['#e8dcc0', '#8a7a5a', SC[l]]));
  };
}

// ---- what's in effect: attuned and worn things -------------------------------------------------------------------------
function dndAllStacks(inv) {
  const out = [];
  const take = (C) => { if (C && C.slots) for (const s of C.slots) if (s) out.push(s); };
  take(inv.main); take(inv.armor); take(inv.back); take(inv.hook); take(inv.charm);
  if (inv.offhand) out.push(inv.offhand);
  const bp = inv.back && inv.back.slots && inv.back.slots[0] && inv.back.slots[0].c; if (bp) for (const s of bp) if (s) out.push(s);
  return out;
}
const DND_ONE_OF = { cloak: 1, boots: 1, gloves: 1, belt: 1, helm: 1, bracers: 1, eyes: 1, amulet: 1, ring: 2 };
function dndMagicActive(c, inv) {
  const act = [], seenSlot = {};
  if (!inv) return act;
  const att = c.attuned || (c.attuned = []);
  // attunement lapses for things you no longer carry
  const carried = new Set();
  for (const s of dndAllStacks(inv)) carried.add(s.id);
  c.attuned = att.filter(id => carried.has(id));
  const held = inv.held, off = inv.offhand;
  for (const s of dndAllStacks(inv)) {
    const d = itemDef(s.id), M = d && d.dndMagic; if (!M) continue;
    if (M.attune && !c.attuned.includes(s.id)) continue;
    if (M.slot === 'weapon' || M.slot === 'staff' || M.slot === 'wand' || M.slot === 'rod') { if (s !== held && !(M.slot === 'wand' || M.slot === 'rod' || M.slot === 'staff') ) continue; if ((M.slot === 'staff') && s !== held) continue; }
    if (M.slot === 'armor' && !(inv.armor && inv.armor.slots.includes(s))) continue;
    if (M.slot === 'shield' && s !== off) continue;
    if (M.slot === 'potion' || M.slot === 'ammo' || M.slot === 'scroll') continue;
    if (DND_ONE_OF[M.slot]) { seenSlot[M.slot] = (seenSlot[M.slot] || 0) + 1; if (seenSlot[M.slot] > DND_ONE_OF[M.slot]) continue; }
    if (act.some(a => a.id === s.id) && M.slot !== 'ring') continue;
    act.push({ id: s.id, M, s });
  }
  return act;
}
{
  const baseDerive = dndDerive;
  dndDerive = function (c, inv) {
    if (!c) return null;
    const act = inv ? dndMagicActive(c, inv) : [];
    // abilities set or raised by items count for everything derived from them
    const ab0 = c.ab, abE = Object.assign({}, c.ab), D = c.condData || {};
    for (const { M } of act) { const W = M.wear || {}; if (W.setAb) for (const [a, v] of Object.entries(W.setAb)) abE[a] = Math.max(abE[a], v); if (W.ab) for (const [a, v] of Object.entries(W.ab)) abE[a] = Math.min(30, abE[a] + v); }
    if (c.conds && D.potionAb && c.conds.potion_ab > 0) for (const [a, v] of Object.entries(D.potionAb)) abE[a] = Math.max(abE[a], v);
    c.ab = abE;
    let d;
    try { d = baseDerive(c, inv); } finally { c.ab = ab0; }
    if (!d) return d;
    d.mods = {}; for (const a of DND_ABILITIES) d.mods[a] = dndMod(abE[a]);
    const mg = { fly: false, regen: 0, waterBreathing: false, featherFall: false, light: false, climb: false, freedom: false, truesight: false, hp: 0, immune: [], adv: [], speed: 0 };
    for (const { M, s } of act) {
      const W = M.wear || {};
      if (W.ac) d.ac += W.ac;
      if (W.save) for (const a of DND_ABILITIES) d.saves[a] += W.save;
      if (W.saves) for (const [a, v] of Object.entries(W.saves)) d.saves[a] = (d.saves[a] || 0) + v;
      if (W.skills) for (const [k, v] of Object.entries(W.skills)) if (d.skills[k] != null) d.skills[k] += v;
      if (W.adv) { for (const k of W.adv) { mg.adv.push(k); if (d.skills[k] != null) d.skills[k] += 3; } }
      if (W.resist) for (const r of W.resist) if (!d.resist.includes(r)) d.resist.push(r);
      if (M.resist && (M.slot === 'armor' || M.slot === 'shield')) for (const r of M.resist) if (!d.resist.includes(r)) d.resist.push(r);
      if (W.immune) for (const r of W.immune) { mg.immune.push(r); if (!d.resist.includes(r) && DND_DMG_TYPES.includes(r)) d.resist.push(r); }
      if (W.speed) { d.speed += W.speed; mg.speed += W.speed; }
      if (W.spellDC) d.spellDC += W.spellDC;
      if (W.spellAttack) d.spellAtk += W.spellAttack;
      if (W.darkvision) d.dark = Math.max(d.dark || 0, W.darkvision);
      if (W.fly) mg.fly = true;
      if (W.regen) mg.regen += W.regen;
      if (W.waterBreathing || W.swim) mg.waterBreathing = true;
      if (W.featherFall) mg.featherFall = true;
      if (W.light || M.light) mg.light = true;
      if (W.climb) mg.climb = true;
      if (W.freedom) mg.freedom = true;
      if (W.truesight) mg.truesight = true;
      if (W.hp) mg.hp += W.hp;
      if (W.prof) d.prof += W.prof;
      if (W.jump) mg.jump = Math.max(mg.jump || 0, W.jump);
      if (M.slot === 'armor' && M.plus) d.ac += M.plus;
    }
    d.passive = 10 + d.skills.perception;
    d.magic = act.map(a => a.id);
    c._magic = mg;
    return d;
  };
  const baseMax = dndMaxHp;
  dndMaxHp = function (c) { return baseMax(c) + ((c._magic && c._magic.hp) || 0); };
}
// a weapon's magic: a +N, an extra die of something, a bane of a kind of creature, keen edges
{
  const baseOf = dndWeaponOf;
  dndWeaponOf = function (stack) {
    const W = baseOf(stack);
    const d = stack && itemDef(stack.id);
    if (d && d.magicBow) { const b = DND_BOWS[d.magicBow] || DND_BOWS.longbow; Object.assign(W, { dice: b.dice, dmg: b.dmg, cat: b.cat, name: d.name }); W.bonus = (W.bonus || 0) + ((d.dndMagic && d.dndMagic.plus) || 0); }
    if (d && d.dndMagic) W.magic = d.dndMagic;
    return W;
  };
  const baseAtk = dndAttack;
  dndAttack = function (lp, e, W, o = {}) {
    const res = baseAtk(lp, e, W, o);
    if (!res || !res.hit || !W || !W.magic) return res;
    const M = W.magic, c = dndOf(lp.player);
    if (M.attune && c && !(c.attuned || []).includes((lp.player.inv.held || {}).id)) return res;   // its magic sleeps until you attune
    if (M.extra) { const n = dndRoll(M.extra[0] * (res.crit ? 2 : 1), M.extra[1]).total; res.dmg += Math.round(n * dndMobTakes(e, M.extra[2] || W.dmg)); (res.parts || (res.parts = [])).push(M.extra[2] || 'magic'); }
    if (M.extraVs && M.extraVs.types && M.extraVs.types.includes(dndCType(e))) { const dv = M.extraVs.dice; const n = dndRoll(dv[0] * (res.crit ? 2 : 1), dv[1]).total; res.dmg += Math.round(n * dndMobTakes(e, dv[2] || W.dmg)); (res.parts || (res.parts = [])).push('bane'); }
    if (M.slayer && dndCType(e) === M.slayer) { res.dmg += dndRoll(3 * (res.crit ? 2 : 1), 6).total; (res.parts || (res.parts = [])).push('slayer'); }
    if (M.vorpal && res.crit && !(e.T && e.T.boss) && e.health <= res.dmg * 3) { res.dmg = Math.max(res.dmg, e.health + 1); (res.parts || (res.parts = [])).push('vorpal'); }
    if (M.drain || (M.wear && M.wear.drain)) { const h = Math.max(1, Math.floor(res.dmg / 3)); dndHeal(lp, h); }
    return res;
  };
  // keen and vicious edges crit more
  const baseCrit = dndCritChance;
  dndCritChance = function (c, adv, dis) {
    let ch = baseCrit(c, adv, dis);
    try { const lp = GAME && GAME.locals && GAME.locals.find(l => dndOf(l.player) === c); const h = lp && lp.player.inv.held, M = h && itemDef(h.id) && itemDef(h.id).dndMagic; if (M && (M.keen || M.vicious)) ch += 0.05 * (M.keen ? 1 : 2); } catch (e) { /* no game */ }
    return ch;
  };
  // magic armour's +N
  const baseAC = dndArmorClass;
  dndArmorClass = function (c, inv) {
    const A = baseAC(c, inv);
    const off = inv && inv.offhand, od = off && itemDef(off.id);
    if (od && od.dndMagic && od.dndMagic.shieldPlus && od.dndGear && od.dndGear.shield === 2) A.ac += od.dndMagic.shieldPlus;
    return A;
  };
}

// ---- moment to moment: flight, regeneration, water breathing, light -----------------------------------------------------
{
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseUpd.call(this, dt, inp);
    try {
      const c = dndLive(this); if (!c || !c._magic) return r;
      const mg = c._magic, p = this.player;
      if (mg.fly) c.conds.fly = Math.max(c.conds.fly || 0, 1);
      if (mg.featherFall) c.conds.feather_fall = Math.max(c.conds.feather_fall || 0, 1);
      if (mg.climb) c.conds.spider_climb = Math.max(c.conds.spider_climb || 0, 1);
      if (mg.freedom) c.conds.freedom = Math.max(c.conds.freedom || 0, 1);
      if (mg.waterBreathing && p.air !== undefined) p.air = Math.max(p.air, 10);
      if (mg.light) p.lightT = Math.max(p.lightT || 0, 2);
      if (mg.jump) { if ((p.fx_jump || 0) < 1) giveEffect(this, 'jump', 3, 1); }
      if (mg.regen > 0) { this._mRegT = (this._mRegT || 0) + dt; const every = 60 / mg.regen; if (this._mRegT >= every) { this._mRegT = 0; if (p.health < p.maxHealth && p.health > 0) dndHeal(this, 1); } }
      // derive now and then so attunement and gear changes show up
      if ((this._mDerT = (this._mDerT || 0) - dt) <= 0) { this._mDerT = 1; dndDerive(c, p.inv); }
    } catch (e) { console.warn('magic tick', e); }
    return r;
  };
}

// ---- using a magic item: attune, drink, cast from charges, read a scroll -----------------------------------------------
function dndCanAttune(c, M) {
  if (!M.attune || M.attune === true) return true;
  const allowed = String(M.attune).split(',').map(s => s.trim());
  return allowed.includes(c.cls) || Object.keys(c.mc || {}).some(k => allowed.includes(k)) || allowed.includes(c.species);
}
function dndAttune(lp, s) {
  const c = dndLive(lp), d = itemDef(s.id), M = d && d.dndMagic; if (!c || !M || !M.attune) return false;
  const att = c.attuned || (c.attuned = []);
  if (att.includes(s.id)) { c.attuned = att.filter(x => x !== s.id); lp.toast(`You end your attunement to ${d.name}`, ''); dndDerive(c, lp.player.inv); dndHudDirty(lp); return true; }
  if (!dndCanAttune(c, M)) { lp.toast(`${d.name} only answers to a ${String(M.attune).replace(/,/g, ', ')}`, 'warn'); return true; }
  if (att.length >= DND_ATTUNE_MAX) { lp.toast(`You're attuned to three things already (${att.map(id => itemDef(id).name).join(', ')}). Use one of them to let it go.`, 'warn'); return true; }
  const g = lp.g, p = lp.player;
  if (g.entities.some(e => e instanceof Mob && e.alive && e.T.hostile && !e.tamed && Math.hypot(e.x - p.x, e.z - p.z) < 14)) { lp.toast('Attuning takes a quiet moment: not with enemies near', 'warn'); return true; }
  att.push(s.id);
  spellSpiral(g, p.x, p.y, p.z, 'mana_arcane', 40, { r: 0.7, h: 2.1, turns: 3, life: 1 });
  g.sfx.play('spell_ward');
  lp.toast(`Attuned to ${d.name} (${att.length}/${DND_ATTUNE_MAX})`, 'epic');
  dndDerive(c, p.inv); dndHudDirty(lp);
  return true;
}
function dndCharges(s, M) { if (s.ch === undefined) s.ch = typeof M.charges === 'number' ? M.charges : M.castList ? 10 : 1; return s.ch; }
function dndDrink(lp, s, d) {
  const M = d.dndMagic, D = M.drink || {}, c = dndLive(lp), p = lp.player, g = lp.g;
  if (D.heal) { const n = dndRoll(D.heal[0], D.heal[1], D.heal[2] || 0).total; dndHeal(lp, n); lp.floatText(p.x, p.y + 2, p.z, '+' + n, '#7fe07f'); }
  if (D.cleanse) { p.poison = 0; p.fx_poison = 0; p.fx_slow = 0; if (c) for (const q of ['blinded', 'poisoned', 'paralyzed', 'frightened', 'charmed']) delete c.conds[q]; }
  if (c) {
    const cd = c.condData || (c.condData = {});
    if (D.buff) { c.conds[D.buff] = Math.max(c.conds[D.buff] || 0, D.dur || 3600); if (D.buff === 'invisible') giveEffect(lp, 'invis', D.dur || 3600); if (D.buff === 'haste') giveEffect(lp, 'speed', D.dur || 60, 1); if (D.buff === 'temp_hp' && D.dice) c.tempHp = Math.max(c.tempHp || 0, dndRoll(D.dice[0], D.dice[1]).total + (D.plus || 0)); if (D.buff === 'water_breathing') giveEffect(lp, 'resp', D.dur || 3600); if (D.buff === 'darkvision') giveEffect(lp, 'night_vision', D.dur || 3600); if (D.buff === 'enlarge') { c.conds.enlarge = D.dur || 600; } if (D.buff === 'heroism') { c.conds.heroism = D.dur || 3600; c.tempHp = Math.max(c.tempHp || 0, 10); } }
    if (D.resist) { cd.resist = [...new Set([...(c.conds.resist > 0 ? cd.resist || [] : []), ...D.resist])]; c.conds.resist = Math.max(c.conds.resist || 0, D.dur || 3600); }
    if (D.setAb) { cd.potionAb = Object.assign({}, D.setAb); c.conds.potion_ab = D.dur || 3600; }
    if (D.ab) { for (const [a, v] of Object.entries(D.ab)) { c.ab[a] = Math.min(30, (c.ab[a] || 10) + v); } lp.toast(`Your ${Object.keys(D.ab).map(a => DND_ABILITY_NAMES[a]).join(' and ')} rises for good`, 'epic'); }
    if (D.dice && D.dmg) { const n = dndRoll(D.dice[0], D.dice[1]).total; lp.hurt(n, { type: 'magic', bypass: true }); if (D.poisoned) p.poison = Math.max(p.poison || 0, D.poisoned); }
    dndDerive(c, p.inv); dndHudDirty(lp);
  }
  g.sfx.play('drink');
  spellSpiral(g, p.x, p.y, p.z, 'mana_heal', 24, { r: 0.6, h: 2, turns: 2, life: 0.8 });
  if (!g.creative) { s.n--; if (s.n <= 0) p.inv.held = null; }
  if (!D.ab) lp.toast(`You drink the ${d.name.replace(/^Potion of /, 'potion of ')}`, 'good');
}
function dndUseCharged(lp, s, d) {
  const M = d.dndMagic, c = dndLive(lp), g = lp.g;
  if (M.attune && c && !(c.attuned || []).includes(s.id)) return dndAttune(lp, s);
  const ch = dndCharges(s, M);
  if (ch <= 0) { lp.toast(`${d.name} is out of charges. It recharges at dawn.`, 'warn'); return true; }
  if (M.summonMob) {
    const S = { name: d.name, summon: 'mob', mob: M.summonMob, n: 1, dur: M.dur || 3600, fx: 'mana_arcane', lvl: 3 };
    if (typeof dndCastSummon === 'function' && dndCastSummon(lp, c, S, 'item_' + s.id, 3)) { s.ch--; lp.toast(`${d.name} (${s.ch} charge${s.ch === 1 ? '' : 's'} left)`, ''); }
    return true;
  }
  const list = M.castList || (M.cast ? [M.cast] : []); if (!list.length) return false;
  s.sel = (s.sel || 0) % list.length;
  if (lp.player.sneaking && list.length > 1) { s.sel = (s.sel + 1) % list.length; const S = DND_SPELLS[list[s.sel]]; lp.toast(`${d.name}: ${S ? S.name : list[s.sel]} ready (sneak + use to change)`, ''); return true; }
  const k = list[s.sel], S = DND_SPELLS[k]; if (!S) { lp.toast(`${d.name} hums, but nothing happens`, ''); return true; }
  const cost = Math.max(1, M.castList ? S.lvl || 1 : 1);
  if (s.ch < cost) { lp.toast(`${S.name} needs ${cost} charges (${s.ch} left)`, 'warn'); return true; }
  // the item casts at its own power: its spell level, and a DC of 15 (or yours, if better)
  const ok = dndCast(lp, k, { free: true, item: true });
  if (ok) { s.ch -= cost; lp.toast(`${d.name}: ${S.name} (${s.ch} charge${s.ch === 1 ? '' : 's'} left${list.length > 1 ? ' · sneak + use for another spell' : ''})`, ''); }
  return true;
}
function dndReadScroll(lp, s, d) {
  const k = d.dndScroll, S = DND_SPELLS[k], c = dndLive(lp), g = lp.g, p = lp.player; if (!S) return false;
  const onList = c && ((S.classes || []).includes(c.cls) || Object.keys(c.mc || {}).some(cl => (S.classes || []).includes(cl)));
  if (!onList) {
    const dc = 10 + S.lvl, R = dndD20({ mod: c ? dndSkillBonus(c, 'arcana') : 0 });
    if (R.total < dc) { lp.toast(`Arcana ${R.total} against DC ${dc}: the words slip away and the scroll crumbles.`, 'warn'); if (!g.creative) { s.n--; if (s.n <= 0) p.inv.held = null; } return true; }
    lp.toast(`Arcana ${R.total} against DC ${dc}: you puzzle out the words…`, '');
  }
  const ok = dndCast(lp, k, { free: true, scroll: true });
  if (ok && !g.creative) { s.n--; if (s.n <= 0) p.inv.held = null; }
  return true;
}
{
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const p = this.player, h = p.inv.held, d = h && itemDef(h.id);
    if (!repeat && !fromOff && d && dndLive(this) && !this.targetEnt) {
      try {
        if (d.dndScroll) { this.swingArm(); if (dndReadScroll(this, h, d)) return; }
        const M = d.dndMagic;
        if (M) {
          if (d.dndPotion || M.drink) { this.swingArm(); dndDrink(this, h, d); return; }
          if (d.dndCharged && (M.cast || M.castList || M.summonMob)) { this.swingArm(); if (dndUseCharged(this, h, d)) return; }
          if (M.attune && !d.armor && !d.backpack && !(d.dndGear && d.dndGear.shield) && !d.tool) { if (dndAttune(this, h)) return; }
          if (M.attune && (d.tool || d.armor || (d.dndGear && d.dndGear.shield) || d.bow) && p.sneaking) { if (dndAttune(this, h)) return; }
        }
      } catch (e) { console.warn('magic use', e); }
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  const baseHas = itemHasUse;
  itemHasUse = function (d) { return !!(d && (d.dndScroll || d.dndPotion || d.dndCharged || (d.dndMagic && d.dndMagic.attune))) || baseHas(d); };
}
// weapons, armour and shields that need attunement: sneak + use, or a long rest attunes them if a slot is free
{
  const baseRest = dndDoRest;
  dndDoRest = function (lp, kind) {
    const r = baseRest(lp, kind);
    if (r !== false && kind !== 'short' && kind !== 'camp') {
      try {
        const c = dndLive(lp), inv = lp.player.inv; if (!c) return r;
        // dawn: wands, staffs and rods recharge
        for (const s of dndAllStacks(inv)) { const d = itemDef(s.id), M = d && d.dndMagic; if (M && (M.cast || M.castList || M.summonMob)) { const max = typeof M.charges === 'number' ? M.charges : M.castList ? 10 : 1; s.ch = max; } }
        // things you wear or wield that want attuning, while you have room
        const att = c.attuned || (c.attuned = []);
        const want = [inv.held, inv.offhand, ...(inv.armor ? inv.armor.slots : [])].filter(Boolean);
        for (const s of want) { const d = itemDef(s.id), M = d && d.dndMagic; if (M && M.attune && !att.includes(s.id) && att.length < DND_ATTUNE_MAX && dndCanAttune(c, M)) { att.push(s.id); lp.toast(`While you rested, you attuned to ${d.name}`, 'good'); } }
        dndDerive(c, inv);
      } catch (e) { console.warn('rest magic', e); }
    }
    return r;
  };
}

// ---- tooltips: rarity, attunement, charges ----------------------------------------------------------------------------
{
  const baseTip = itemInfoHTML;
  itemInfoHTML = function (s) {
    let html = baseTip(s);
    const d = itemDef(s.id); if (!d || !(d.dndMagic || d.dndScroll)) return html;
    const M = d.dndMagic, bits = [];
    if (d.rarity && DND_RARITY_NAME[d.rarity]) bits.push(DND_RARITY_NAME[d.rarity] + (M && M.slot ? ' ' + (M.slot === 'wondrous' ? 'wondrous item' : M.slot) : d.dndScroll ? ' scroll' : ''));
    if (M && M.attune) {
      const lp = GAME && GAME.locals && GAME.locals[0], c = lp && dndOf(lp.player);
      const on = c && (c.attuned || []).includes(s.id);
      bits.push(on ? '<b class="att-on">Attuned</b>' : `Requires attunement${M.attune !== true ? ' by a ' + String(M.attune).replace(/,/g, ', ') : ''} (${d.tool || d.armor || d.bow || (d.dndGear && d.dndGear.shield) ? 'sneak + use, or a long rest' : 'use to attune'})`);
    }
    if (M && (M.cast || M.castList || M.summonMob)) bits.push(`Charges ${s.ch ?? (typeof M.charges === 'number' ? M.charges : M.castList ? 10 : 1)} · recharges at dawn`);
    if (bits.length) html = html.replace('</div>', `</div><div class="ts magic">${bits.join(' · ')}</div>`);
    return html;
  };
}

// ---- what drops: by how tough the foe was, and how deep the place ------------------------------------------------------
const DND_DROP_WEIGHTS = {
  cr0_4: { common: 35, uncommon: 55, rare: 10 },
  cr5_10: { uncommon: 45, rare: 42, very_rare: 13 },
  cr11_16: { rare: 45, very_rare: 43, legendary: 12 },
  cr17: { very_rare: 55, legendary: 45 },
};
function dndCrOf(e) {
  const T = (e && e.T) || {};
  if (T.cr != null) return +T.cr;
  const xp = typeof dndMobXp === 'function' ? dndMobXp(e) : 50;
  const table = [[10, 0], [25, 0.125], [50, 0.25], [100, 0.5], [200, 1], [450, 2], [700, 3], [1100, 4], [1800, 5], [2300, 6], [2900, 7], [3900, 8], [5000, 9], [5900, 10], [7200, 11], [8400, 12], [10000, 13], [11500, 14], [13000, 15], [15000, 16], [18000, 17], [20000, 18], [22000, 19], [25000, 20]];
  let cr = 0; for (const [x, c] of table) if (xp >= x) cr = c; return cr;
}
function dndLootBand(cr) { return cr <= 4 ? 'cr0_4' : cr <= 10 ? 'cr5_10' : cr <= 16 ? 'cr11_16' : 'cr17'; }
function dndRollMagic(cr, rand = Math.random) {
  const band = dndLootBand(cr), W = DND_DROP_WEIGHTS[band], T = DND_LOOT_TABLES[band] || {};
  let tot = 0; for (const v of Object.values(W)) tot += v;
  let r = rand() * tot, rar = 'uncommon';
  for (const [k, v] of Object.entries(W)) { r -= v; if (r <= 0) { rar = k; break; } }
  const list = (T[rar] || []).filter(k => ITEMS[dndMagicKey(k)]);
  if (!list.length) return null;
  return dndMagicKey(list[Math.floor(rand() * list.length)]);
}
function dndRollScroll(cr, rand = Math.random) {
  const maxL = Math.max(0, Math.min(9, Math.round(cr / 2) + 1));
  const keys = Object.keys(DND_SPELLS).filter(k => DND_SPELLS[k].lvl <= maxL && DND_SPELLS[k].lvl >= Math.max(0, maxL - 3));
  return keys.length ? 'scroll_' + keys[Math.floor(rand() * keys.length)] : null;
}
{
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const r = baseDie.call(this, src);
    try {
      const g = this.game;
      if (g && !g.isGuest && dndOn(g) && this.T && this.T.hostile && !this.npc && !this.tamed && !this.dndSummonBy && !this.dndNoDrops && src && (src.attacker || src.dnd)) {
        const cr = dndCrOf(this), boss = this.T.boss;
        const chance = boss ? 1 : Math.min(0.25, 0.025 + cr * 0.012);
        if (Math.random() < chance) { const k = dndRollMagic(cr); if (k) g.dropItem(mkStack(k, 1), this.x, this.y + 0.5, this.z, true); }
        if (Math.random() < (boss ? 0.6 : Math.min(0.12, 0.02 + cr * 0.008))) { const k = dndRollScroll(cr); if (k && ITEMS[k]) g.dropItem(mkStack(k, 1), this.x, this.y + 0.5, this.z, true); }
      }
    } catch (e) { console.warn('magic drop', e); }
    return r;
  };
}
// the shops: potions and trinkets at the apothecaries and temples, scrolls and wands at the arcane shops
if (typeof NPC_SHOPS !== 'undefined') {
  const S = DND_LOOT_TABLES.shop || {};
  const price = (k) => { const M = DND_MAGIC_ITEMS[k]; const r = M ? M.rarity : 'common'; return r === 'common' ? 6 : r === 'uncommon' ? 22 : 60; };
  const tier = (k) => { const M = DND_MAGIC_ITEMS[k]; return M && M.rarity === 'uncommon' ? 2 : 1; };
  const add = (job, keys) => { if (!NPC_SHOPS[job]) return; for (const k of keys || []) { const id = dndMagicKey(k); if (ITEMS[id] && !NPC_SHOPS[job].buy.some(b => b[0] === id)) NPC_SHOPS[job].buy.push([id, 1, price(k), tier(k)]); } };
  add('cleric', S.temple); add('cleric', (S.apothecary || []).slice(0, 6));
  add('merchant', S.general); add('librarian', S.arcane); add('weaponsmith', (S.smith || []).filter(k => DND_MAGIC_ITEMS[k] && DND_MAGIC_ITEMS[k].slot === 'weapon'));
  add('armorer', (S.smith || []).filter(k => DND_MAGIC_ITEMS[k] && DND_MAGIC_ITEMS[k].slot !== 'weapon'));
  if (NPC_SHOPS.librarian) for (const k of ['scroll_magic_missile', 'scroll_cure_wounds', 'scroll_shield', 'scroll_detect_magic', 'scroll_identify', 'scroll_misty_step', 'scroll_lesser_restoration', 'scroll_fireball', 'scroll_dispel_magic', 'scroll_revivify']) if (ITEMS[k]) NPC_SHOPS.librarian.buy.push([k, 1, DND_SPELLS[k.slice(7)].lvl * 6 + 4, Math.min(3, DND_SPELLS[k.slice(7)].lvl)]);
}
