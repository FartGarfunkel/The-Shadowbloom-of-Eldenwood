// ---------------------------------------------------------------------------
// dnd/abilities.js — class features (B, d-pad right) and species features (N, right stick click).
// ---------------------------------------------------------------------------

function dndSpend(c, key) { if ((c.res[key] || 0) <= 0) return false; c.res[key]--; return true; }
function dndUseSignature(lp) {
  const c = dndLive(lp); if (!c) return;
  const g = lp.g, p = lp.player, C = DND_CLASSES[c.cls], S = DND_SIGNATURES[C.signature]; if (!S) return;
  if ((lp._abCd || 0) > g.time) return;
  lp._abCd = g.time + 0.6;
  const none = () => { lp.toast(`No ${S.name} left — rest to recover`, 'warn'); g.sfx.play('spell_fizzle'); };
  dndDerive(c, p.inv);
  switch (C.signature) {
    case 'rage':
      if (c.conds.rage > 0) { delete c.conds.rage; lp.toast('You let your rage go', ''); break; }
      if (!dndSpend(c, 'sig')) return none();
      c.conds.rage = 60; giveEffect(lp, 'strength', 60);
      g.burst(p.x, p.y + 1, p.z, 'flame', 20, 1.2); g.sfx.play('crit');
      lp.toast(`RAGE! +${c.d.rageDmg} damage, half damage from blows, for a minute`, 'epic');
      break;
    case 'inspiration': {
      if (!dndSpend(c, 'sig')) return none();
      const die = c.level >= 15 ? 12 : c.level >= 10 ? 10 : c.level >= 5 ? 8 : 6;
      let ally = dndLookTarget(lp, 18, { allies: true });
      const L = ally ? g.locals.find(l => l === ally || l.player === ally.player) : null;
      const who = L || (g.locals.find(l => l !== lp && Math.hypot(l.player.x - p.x, l.player.z - p.z) < 18)) || lp;
      const cc = dndOf(who.player); if (cc) cc.conds.bardic = die;
      if (!L && ally && ally.send) ally.send({ t: 'adv', k: 'dndbardic', d: die });
      spellSpiral(g, who.player.x, who.player.y, who.player.z, 'mana_arcane', 30, { r: 0.6, h: 2, turns: 2, life: 0.8 });
      if (typeof babble === 'function') try { babble(g.sfx, 'la la la', { pitch: 260, formant: 1, wave: 'triangle', seed: 3 }, { vol: 0.4, max: 6 }); } catch (e) { /* no voice */ }
      lp.toast(`Bardic Inspiration (d${die}) for ${who === lp ? 'yourself' : who.name}`, 'good');
      if (who !== lp) who.toast(`${c.name} inspires you: +d${die} on your next check`, 'good');
      break;
    }
    case 'channel': {
      if (!dndSpend(c, 'sig')) return none();
      const undead = dndHostilesNear(g, p.x, p.y + 1, p.z, 8, lp).filter(e => dndMobTakes(e, 'radiant') > 1);
      if (undead.length) {
        const n = dndRoll(Math.max(1, Math.ceil(c.level / 5)) * 2, 8).total;
        for (const e of undead) { const sv = dndMobSave(e, 'con', c.d.spellDC); dndSpellHit(lp, e, sv.ok ? Math.floor(n / 2) : n, 'radiant', { knock: 2 }); if (!sv.ok && c.level >= 2) { e.panicT = 6; e.fleeFrom = p; } }
        lp.toast('Divine light sears the undead!', 'epic');
      } else {
        const n = dndRoll(1, 8).total + Math.max(1, c.d.mods.wis) + (c.level >= 7 ? c.level : 0);
        for (const L of g.locals) if (Math.hypot(L.player.x - p.x, L.player.z - p.z) < 8) dndHeal(L, n);
        for (const r of g.pawns()) if (!g.locals.includes(r) && r.send && Math.hypot(r.x - p.x, r.z - p.z) < 8) r.send({ t: 'adv', k: 'dndheal', n });
        lp.toast(`Divine Spark: +${n} hit points for everyone near`, 'good');
      }
      dndSpellBurst(g, p.x, p.y + 1, p.z, 'mana_light', 80, 3); g.sfx.play('spell_heal');
      break;
    }
    case 'wild_shape':
      if (c.conds.wild > 0) { dndWildEnd(lp); break; }
      if (!dndSpend(c, 'sig')) return none();
      c.conds.wild = Math.max(60, c.level * 60); c.tempHp = Math.max(c.tempHp || 0, c.level * 3 + 4);
      giveEffect(lp, 'speed', c.conds.wild); giveEffect(lp, 'jump', c.conds.wild);
      g.burst(p.x, p.y + 1, p.z, 'leaves' in ATLAS.tile ? 'leaves' : 'sparkle', 30, 1.2);
      lp.toast(`Wild Shape: a wolf's speed, teeth and claws (${c.level * 3 + 4} temporary HP). B again to change back.`, 'epic');
      break;
    case 'second_wind': {
      if (!dndSpend(c, 'sig')) return none();
      const n = dndRoll(1, 10, c.level).total;
      dndHeal(lp, n); lp.toast(`Second Wind: +${n} HP`, 'good'); g.sfx.play('heal');
      break;
    }
    case 'flurry': {
      if (c.level >= 2 ? !dndSpend(c, 'focus') : !dndSpend(c, 'sig')) return none();
      const e = dndLookTarget(lp, 3);
      if (!e) { lp.toast('Nobody in reach', ''); c.level >= 2 ? c.res.focus++ : c.res.sig++; return; }
      for (let i = 0; i < 2; i++) setTimeout(() => { p.attackCd = 0; const h = p.inv.held; p.inv.held = null; try { lp.attackEntity(e); } finally { p.inv.held = h; } }, i * 160);
      lp.toast('Flurry of Blows!', 'good');
      break;
    }
    case 'lay_on_hands': {
      if ((c.res.pool || 0) <= 0) return none();
      const ally = dndLookTarget(lp, 3, { allies: true });
      const L = ally ? g.locals.find(l => l === ally || l.player === ally.player) : lp;
      const n = Math.min(5, c.res.pool);
      if (L) { if (L.player.health >= L.player.maxHealth && !(L.player.downed > 0)) { lp.toast('They need no healing', ''); return; } dndHeal(L, n); L.player.poison = 0; }
      else if (ally && ally.send) ally.send({ t: 'adv', k: 'dndheal', n });
      c.res.pool -= n; spellSpiral(g, (L || ally).player ? (L || ally).player.x : ally.x, p.y, (L || ally).player ? (L || ally).player.z : ally.z, 'mana_heal', 40, { r: 0.7, h: 2, turns: 3, life: 1 });
      lp.toast(`Lay on Hands: +${n} HP (${c.res.pool} left in your pool)`, 'good');
      break;
    }
    case 'hunters_mark':
      if (!dndSpend(c, 'sig')) return none();
      if (!dndCast(lp, 'hunters_mark', { free: true })) c.res.sig++;
      break;
    case 'cunning':
      if (!dndSpend(c, 'sig')) return none();
      c.conds.hidden = 6; giveEffect(lp, 'invis', 6);
      for (const e of g.entities) if (e instanceof Mob && (e.foe === p || e.foe === lp) && Math.hypot(e.x - p.x, e.z - p.z) < 20) { e.foe = null; e.huntT = 0; }
      g.burst(p.x, p.y + 1, p.z, 'smoke', 24, 1);
      lp.toast('You melt into the shadows: your next hit is a Sneak Attack', 'good');
      break;
    case 'innate_sorcery':
      if (!dndSpend(c, 'sig')) return none();
      c.conds.innate = 60; spellSpiral(g, p.x, p.y, p.z, 'mana_fire', 50, { r: 0.8, h: 2.2, turns: 3, life: 1 });
      lp.toast('Innate Sorcery: +1 spell save DC and advantage on spell attacks for a minute', 'epic');
      break;
    case 'pact_blast':
      if (!dndSpend(c, 'sig')) return none();
      if (!dndCast(lp, 'hex', { free: true })) c.res.sig++;
      break;
    case 'arcane_recovery': {
      if (!dndSpend(c, 'sig')) return none();
      let budget = Math.ceil(c.level / 2), got = [];
      for (let i = Math.min(5, c.slotsMax.length) - 1; i >= 0; i--) while (budget >= i + 1 && c.slots[i] < c.slotsMax[i]) { c.slots[i]++; budget -= i + 1; got.push(i + 1); }
      lp.toast(got.length ? `Arcane Recovery: regained slots ${got.join(', ')}` : 'Your slots are already full', got.length ? 'good' : '');
      if (!got.length) c.res.sig++;
      break;
    }
  }
  dndHudDirty(lp);
}
function dndWildEnd(lp) { const c = dndOf(lp.player); if (!c) return; delete c.conds.wild; c.tempHp = 0; lp.player.fx_speed = 0; lp.player.fx_jump = 0; lp.toast('You return to your own shape', ''); dndHudDirty(lp); }
// wild shape: claws and teeth (unarmed blows hit as a d8 + Wisdom)
{
  const base = dndWeaponOf;
  dndWeaponOf = function (stack) {
    const W = base(stack);
    return W;
  };
  const baseWA = dndWeaponAttack;
  dndWeaponAttack = function (c, W) {
    const A = baseWA(c, W);
    if (c.conds && c.conds.wild > 0 && W.unarmed) { A.dice = [2, 6]; const m = Math.max(dndMod(c.ab.wis), dndMod(c.ab.str)); A.toHit = dndProf(c.level) + m; A.dmg = m; }
    return A;
  };
}

// ---- species features --------------------------------------------------------------------------------------------------
function dndRacialName(c) {
  const Sp = DND_SPECIES[c.species];
  if (Sp.breath) return 'Breath Weapon';
  if (Sp.rush) return 'Adrenaline Rush';
  if (c.species === 'goliath') { const L = Sp.lineages[c.lineage || 'stone']; return L ? L.name : 'Giant Ancestry'; }
  if (c.species === 'dwarf') return 'Stonecunning';
  return Sp.traits[0][0];
}
function dndUseRacial(lp) {
  const c = dndLive(lp); if (!c) return;
  const g = lp.g, p = lp.player, Sp = DND_SPECIES[c.species];
  if ((lp._raCd || 0) > g.time) return;
  lp._raCd = g.time + 0.6;
  dndDerive(c, p.inv);
  const DC = 8 + c.d.mods.con + c.d.prof;
  if (Sp.breath) {
    if (!dndSpend(c, 'racial')) { lp.toast('No breath left — rest to recover', 'warn'); return; }
    const L = Sp.lineages[c.lineage || 'red'] || { dmg: 'fire' }, n = c.level >= 17 ? 4 : c.level >= 11 ? 3 : c.level >= 5 ? 2 : 1;
    const fake = { name: 'Breath Weapon', kind: 'cone', save: 'dex', dice: [n, 10], dmg: L.dmg, range: 4, fx: L.dmg === 'fire' ? 'mana_fire' : L.dmg === 'cold' ? 'mana_frost' : L.dmg === 'lightning' ? 'mana_light' : 'mana_heal', col: DND_DMG_COL[L.dmg], lvl: 0, scale: 0 };
    DND_SPELLS.__breath = fake;
    const look = lookVector(p.yaw, p.pitch), hits = [];
    for (const e of dndHostilesNear(g, p.x, p.y + 1, p.z, 5.5, lp)) { const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1; if ((dx * look[0] + dz * look[2]) / d / (Math.hypot(look[0], look[2]) || 1) > 0.7) hits.push(e); }
    for (let i = 0; i < 90; i++) { const a = (Math.random() - 0.5) * 1.2, sp = 5 + Math.random() * 5, lx = look[0] * Math.cos(a) - look[2] * Math.sin(a), lz = look[0] * Math.sin(a) + look[2] * Math.cos(a); spellSpark(g, p.x + look[0] * 0.6, p.y + p.eye - 0.2, p.z + look[2] * 0.6, fake.fx, { vx: lx * sp, vy: look[1] * sp, vz: lz * sp, life: 0.55, size: 0.1 }); if (L.dmg === 'fire' && i % 5 === 0) g.flame(p.x + lx * Math.random() * 4, p.y + 1.4, p.z + lz * Math.random() * 4); }
    const dmg = dndRoll(n, 10).total;
    for (const e of hits) { const sv = dndMobSave(e, 'dex', DC); dndSpellHit(lp, e, sv.ok ? Math.floor(dmg / 2) : dmg, L.dmg, { burn: L.dmg === 'fire' }); }
    g.sfx.play(L.dmg === 'fire' ? 'spell_fire' : 'spell_zap');
    lp.toast(`Breath Weapon: ${n}d10 ${L.dmg}`, 'good');
  } else if (Sp.rush) {
    if (!dndSpend(c, 'racial')) { lp.toast('Spent — rest to recover', 'warn'); return; }
    giveEffect(lp, 'speed', 6, 1); c.tempHp = Math.max(c.tempHp || 0, c.d.prof);
    g.burst(p.x, p.y + 1, p.z, 'smoke', 14, 1); lp.toast(`Adrenaline Rush: you dash (+${c.d.prof} temporary HP)`, 'good');
  } else if (c.species === 'goliath') {
    if (!dndSpend(c, 'racial')) { lp.toast('Spent — rest to recover', 'warn'); return; }
    const gift = (Sp.lineages[c.lineage || 'stone'] || {}).gift;
    if (gift === 'jaunt') { const S = DND_SPELLS.misty_step; dndUtility(lp, c, S, 'misty_step', 2); }
    else if (gift === 'endure') { c.tempHp = Math.max(c.tempHp || 0, dndRoll(1, 12).total + c.d.mods.con); lp.toast("Stone's Endurance: the next blows glance off", 'good'); }
    else if (gift === 'burn') { c.conds.smite = { dice: [1, 10], dmg: 'fire', name: "Fire's Burn", burn: true, fx: 'mana_fire', t: 12 }; lp.toast("Fire's Burn: your next hit scorches (+1d10 fire)", 'good'); }
    else if (gift === 'chill') { c.conds.smite = { dice: [1, 6], dmg: 'cold', name: "Frost's Chill", fx: 'mana_frost', t: 12, root: 1 }; lp.toast("Frost's Chill: your next hit freezes (+1d6 cold)", 'good'); }
    else if (gift === 'tumble') { c.conds.smite = { dice: [1, 4], dmg: 'bludgeoning', name: "Hill's Tumble", fx: 'mana_stone', t: 12, root: 1.5 }; lp.toast("Hill's Tumble: your next hit knocks them down", 'good'); }
    else { const n = dndRoll(1, 8).total; for (const e of dndHostilesNear(g, p.x, p.y + 1, p.z, 3.5, lp)) dndSpellHit(lp, e, n, 'thunder', { knock: 2 }); dndSpellBurst(g, p.x, p.y + 1, p.z, 'mana_light', 50, 2); lp.toast("Storm's Thunder!", 'good'); }
  } else if (c.species === 'dwarf') {
    // stonecunning: the ores and hollows nearby glint for a moment
    if ((lp._stoneCd || 0) > g.time) { lp.toast('Your stone-sense needs a moment', ''); return; }
    lp._stoneCd = g.time + 10;
    const w = g.world, ores = [];
    for (let i = 0; i < 2500 && ores.length < 40; i++) { const x = Math.floor(p.x + (Math.random() - 0.5) * 24), y = Math.floor(p.y + (Math.random() - 0.5) * 16), z = Math.floor(p.z + (Math.random() - 0.5) * 24); const id = w.getBlock(x, y, z); if (id && /_ore$/.test(BLOCKS[id].key)) ores.push([x, y, z]); }
    for (const [x, y, z] of ores) for (let k = 0; k < 6; k++) spellSpark(g, x + 0.5 + (Math.random() - 0.5), y + 0.5 + (Math.random() - 0.5), z + 0.5 + (Math.random() - 0.5), 'mana_light', { life: 3, size: 0.09 });
    lp.toast(ores.length ? `Stonecunning: you sense ${ores.length} veins of ore nearby` : 'Stonecunning: only plain stone around you', '');
  } else {
    const t = Sp.traits.map(x => x[0]).join(', ');
    lp.toast(`${Sp.name}: ${t} (always on)`, '');
  }
  dndHudDirty(lp);
}
{
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv' && m.k === 'dndbardic') { for (const l of this.g.locals) { const c = dndOf(l.player); if (c && (l.index || 0) === (m.li || 0)) { c.conds.bardic = m.d; l.toast(`You feel inspired: +d${m.d} on your next check`, 'good'); } } return; }
    return baseGuest.call(this, m);
  };
}
