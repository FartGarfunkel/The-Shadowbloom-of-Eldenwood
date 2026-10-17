// ---------------------------------------------------------------------------
// dnd/character.js — a character sheet: made in the creator, kept with the player.
//
//   c = dndNewChar({ name, species, lineage, cls, bg, ab: {str..cha}, bgPlus: {ab: n}, skills: [...], look })
//   dndDerive(c, inv)      → fills c.d with what follows from the sheet and the gear worn:
//                            level, prof, mods, maxHp, ac, saves, skills, attack bonuses, spell DC, speed...
//   dndGainXp(c, n)        → levels gained (each brings hit points and features)
//   dndRest(c, 'short'|'long')
//
// The sheet is plain data (JSON) so it saves with the player and travels over the network.
// ---------------------------------------------------------------------------

const DND_POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const DND_STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

function dndNewChar(o) {
  const C = DND_CLASSES[o.cls] || DND_CLASSES.fighter, Sp = DND_SPECIES[o.species] || DND_SPECIES.human, Bg = DND_BACKGROUNDS[o.bg] || DND_BACKGROUNDS.soldier;
  const ab = {}; for (const a of DND_ABILITIES) ab[a] = Math.min(20, (o.ab && o.ab[a] || 10) + ((o.bgPlus && o.bgPlus[a]) || 0));
  const skills = new Set([...(o.skills || []), ...Bg.skills, ...(Sp.skills || [])]);
  const c = {
    v: 1, name: (o.name || 'Adventurer').slice(0, 24), species: o.species || 'human', lineage: o.lineage || null, cls: o.cls || 'fighter', bg: o.bg || 'soldier',
    base: Object.assign({}, o.ab), bgPlus: Object.assign({}, o.bgPlus), ab, skills: [...skills], expertise: o.expertise || [],
    level: 1, xp: 0, hp: 0, tempHp: 0, hitDice: 1, deathS: 0, deathF: 0,
    slots: dndSlotsFor(o.cls, 1), slotsMax: dndSlotsFor(o.cls, 1), res: {}, inspiration: !!Sp.inspireOnRest, luck: Bg.feat === 'Lucky' ? 3 : 0,
    spells: dndStartSpells(o.cls, o.species, o.lineage, Bg), prepared: null, look: o.look || null, gold: (C.gold || 0) + (Bg.gold || 0),
    feats: [Bg.feat], made: Date.now(), conds: {},
  };
  c.hp = dndMaxHp(c);
  dndResetResources(c);
  return c;
}
function dndStartSpells(cls, species, lineage, Bg) {
  const C = DND_CLASSES[cls], out = [];
  if (C && C.cantrips) out.push(...C.cantrips.slice(0, C.caster === 'full' ? 3 : 2));
  if (C && C.spells) out.push(...C.spells.filter(k => DND_SPELLS[k] && DND_SPELLS[k].lvl === 1).slice(0, cls === 'wizard' ? 6 : 4));
  const Sp = DND_SPECIES[species], L = Sp && Sp.lineages && lineage && Sp.lineages[lineage];
  if (L && L.cantrip && DND_SPELLS[L.cantrip] && !out.includes(L.cantrip)) out.push(L.cantrip);
  if (species === 'tiefling' && !out.includes('thaumaturgy')) out.push('thaumaturgy');
  if (Bg && /Cleric/.test(Bg.feat)) for (const k of ['guidance', 'sacred_flame']) if (!out.includes(k)) out.push(k);
  if (Bg && /Wizard/.test(Bg.feat)) for (const k of ['fire_bolt', 'light']) if (!out.includes(k)) out.push(k);
  return out;
}
// spells a class learns when it reaches a level (it picks up every spell of each new spell level it can cast)
function dndLearnSpells(c) {
  const C = DND_CLASSES[c.cls]; if (!C || !C.spells) return [];
  const maxL = dndMaxSpellLevel(c.cls, c.level), got = [];
  for (const k of C.spells) { const S = DND_SPELLS[k]; if (S && S.lvl <= maxL && !c.spells.includes(k)) { c.spells.push(k); got.push(k); } }
  if (C.cantrips && (c.level === 4 || c.level === 10)) for (const k of C.cantrips) if (!c.spells.includes(k)) { c.spells.push(k); got.push(k); break; }
  return got;
}

function dndMaxHp(c) {
  const C = DND_CLASSES[c.cls], Sp = DND_SPECIES[c.species], con = dndMod(c.ab.con);
  let hp = C.hd + con + (c.level - 1) * (Math.floor(C.hd / 2) + 1 + con);
  if (Sp.hpPerLevel) hp += Sp.hpPerLevel * c.level;
  if (c.feats.includes('Tough')) hp += 2 * c.level;
  if (c.conds && c.conds.aid) hp += c.conds.aid;
  return Math.max(1, hp);
}
function dndResetResources(c) {
  const C = DND_CLASSES[c.cls], sig = C && DND_SIGNATURES[C.signature];
  c.res = c.res || {};
  if (sig) c.res.sig = sig.uses(c.level, c);
  c.res.sigMax = sig ? sig.uses(c.level, c) : 0;
  const Sp = DND_SPECIES[c.species];
  if (Sp.breath || Sp.rush || (Sp.lineages && c.species === 'goliath')) { c.res.racial = dndProf(c.level); c.res.racialMax = dndProf(c.level); }
  if (Sp.relentless) c.res.relentless = 1;
  if (c.cls === 'fighter' && c.level >= 2) c.res.surge = c.level >= 17 ? 2 : 1;
  if (c.cls === 'monk') c.res.focus = c.level >= 2 ? c.level : 0;
  if (c.cls === 'paladin') c.res.pool = 5 * c.level;
  if (c.cls === 'barbarian') c.res.rageMax = sig.uses(c.level, c);
  if (c.feats.includes('Lucky')) c.luck = dndProf(c.level);
}

// AC from what you wear (inv: the player's inventory) and what you are
function dndArmorClass(c, inv) {
  const dex = dndMod(c.ab.dex), C = DND_CLASSES[c.cls];
  let worn = 0, sum = 0, type = null, heaviest = 0;
  const RANK = { light: 1, medium: 2, heavy: 3 };
  const slots = (inv && inv.armor && inv.armor.slots) || [];
  for (let i = 0; i < 4; i++) {
    const s = slots[i]; if (!s) continue;
    const mat = String(s.id).split('_')[0], A = DND_ARMOR_TYPE[mat];
    const d = itemDef(s.id); if (!d || !d.armor) continue;
    worn++;
    const [t, full] = A || ['light', 10 + Math.min(8, Math.round(((ARMOR_MATS[mat] && ARMOR_MATS[mat].pts.reduce((a, b) => a + b, 0)) || 6) * 0.35))];
    sum += (full - 10) * DND_PIECE_WEIGHT[i];
    if (RANK[t] > heaviest) { heaviest = RANK[t]; type = t; }
  }
  let ac;
  if (!worn) {
    ac = 10 + dex;
    if (C.unarmored) ac = 10 + dndMod(c.ab[C.unarmored[0]]) + dndMod(c.ab[C.unarmored[1]]);
    if (c.conds.mage_armor) ac = Math.max(ac, 13 + dex);
  } else {
    const base = 10 + Math.round(sum);
    ac = type === 'heavy' ? base : type === 'medium' ? base + Math.min(2, dex) : base + dex;
  }
  const off = inv && inv.offhand, od = off && itemDef(off.id);
  const shield = od && od.dndGear && od.dndGear.shield;
  if (shield) ac += shield + (off.plus || 0);
  if (c.cls === 'fighter' || (c.cls === 'paladin' && c.level >= 2)) { if (worn) ac += 1; }   // Fighting Style: Defense
  if (c.conds.shield_of_faith) ac += 2;
  if (c.conds.shield) ac += 5;
  if (c.conds.haste) ac += 2;
  if (c.conds.barkskin) ac = Math.max(ac, 17);
  return { ac, type, worn, shield: !!shield, untrained: type && !C.armor.includes(type) };
}

function dndSkillBonus(c, k) {
  const S = DND_SKILLS[k], prof = dndProf(c.level);
  let b = dndMod(c.ab[S.ab]);
  if (c.skills.includes(k)) b += prof;
  else if (c.cls === 'bard' && c.level >= 2) b += Math.floor(prof / 2);   // Jack of All Trades
  if (c.expertise.includes(k)) b += prof;
  return b;
}
function dndSaveBonus(c, a) {
  const C = DND_CLASSES[c.cls];
  let b = dndMod(c.ab[a]) + (C.saves.includes(a) ? dndProf(c.level) : 0);
  if (c.conds.aura) b += Math.max(1, c.conds.aura);
  return b;
}
function dndCastMod(c) { const C = DND_CLASSES[c.cls]; return C.castAb ? dndMod(c.ab[C.castAb]) : Math.max(dndMod(c.ab.int), dndMod(c.ab.wis), dndMod(c.ab.cha)); }
function dndSpellDC(c) { return 8 + dndProf(c.level) + dndCastMod(c) + (c.conds.innate ? 1 : 0); }
function dndSpellAttack(c) { return dndProf(c.level) + dndCastMod(c); }
// the attack bonus and damage bonus for a weapon (from dndWeaponOf)
function dndWeaponAttack(c, W) {
  const C = DND_CLASSES[c.cls], str = dndMod(c.ab.str), dex = dndMod(c.ab.dex);
  let ab = W.ranged ? dex : (W.props.includes('finesse') || (C.martial && (W.unarmed || W.cat === 'simple'))) ? Math.max(str, dex) : str;
  if (c.conds.shillelagh && (W.name === 'Quarterstaff' || W.name === 'Club' || W.name === 'Druidic Staff')) ab = Math.max(ab, dndCastMod(c));
  let prof = dndProf(c.level);
  const martialOk = !W.cat || W.cat === 'simple' || ['barbarian', 'fighter', 'paladin', 'ranger'].includes(c.cls) || (c.cls === 'rogue' && (W.props.includes('finesse') || W.props.includes('light'))) || (c.cls === 'monk' && W.props.includes('light')) || (c.cls === 'bard' && W.props.includes('finesse'));
  if (W.improvised || (W.tool && !['barbarian', 'fighter'].includes(c.cls)) || !martialOk) prof = 0;
  if (W.unarmed) prof = dndProf(c.level);
  let toHit = ab + prof + (W.bonus || 0), dmg = ab + (W.bonus || 0);
  if (W.ranged && c.cls === 'ranger' && c.level >= 2) toHit += 2;   // Fighting Style: Archery
  let dice = W.dice;
  if (W.unarmed) dice = C.martial ? [1, c.level < 5 ? 6 : c.level < 11 ? 8 : c.level < 17 ? 10 : 12] : [1, 1];
  if (c.conds.shillelagh && (W.name === 'Quarterstaff' || W.name === 'Club' || W.name === 'Druidic Staff')) dice = [1, 8];
  if (c.conds.magic_weapon && !W.unarmed) { toHit += 1; dmg += 1; }
  if (W.unarmed && !C.martial) dmg = Math.max(0, 1 + str) - 1;   // 1 + Strength
  return { toHit, dice, dmg, ab };
}
function dndCritRange(c) { return c.cls === 'fighter' && c.level >= 3 ? 19 : 20; }
function dndAttacksPerTurn(c) { const extra = ['barbarian', 'fighter', 'monk', 'paladin', 'ranger'].includes(c.cls) && c.level >= 5; return 1 + (extra ? 1 : 0) + (c.cls === 'fighter' && c.level >= 11 ? 1 : 0); }
function dndSpeed(c) {
  const Sp = DND_SPECIES[c.species], L = Sp.lineages && c.lineage && Sp.lineages[c.lineage];
  let ft = (L && L.speed) || Sp.speed;
  if (c.cls === 'monk' && c.level >= 2) ft += c.level < 6 ? 10 : c.level < 10 ? 15 : 20;
  if (c.cls === 'barbarian' && c.level >= 5) ft += 10;
  if (c.conds.longstrider) ft += 10;
  if (c.conds.haste) ft *= 2;
  return ft;
}
function dndDarkvision(c) { const Sp = DND_SPECIES[c.species], L = Sp.lineages && c.lineage && Sp.lineages[c.lineage]; return (L && L.dark) || Sp.dark || 0; }
function dndResistances(c) {
  const Sp = DND_SPECIES[c.species], L = Sp.lineages && c.lineage && Sp.lineages[c.lineage], out = new Set(Sp.resist || []);
  if (L && L.dmg && (c.species === 'dragonborn' || c.species === 'tiefling')) out.add(L.dmg);
  if (c.conds.rage) { out.add('bludgeoning'); out.add('piercing'); out.add('slashing'); }
  return out;
}

function dndDerive(c, inv) {
  if (!c) return null;
  c.level = Math.max(1, Math.min(DND_MAX_LEVEL, c.level || 1));
  const d = c.d || (c.d = {});
  d.prof = dndProf(c.level);
  d.mods = {}; for (const a of DND_ABILITIES) d.mods[a] = dndMod(c.ab[a]);
  d.maxHp = dndMaxHp(c);
  if (c.hp > d.maxHp) c.hp = d.maxHp;
  const A = dndArmorClass(c, inv); d.ac = A.ac; d.armorType = A.type; d.untrained = A.untrained; d.shield = A.shield;
  d.saves = {}; for (const a of DND_ABILITIES) d.saves[a] = dndSaveBonus(c, a);
  d.skills = {}; for (const k of DND_SKILL_ORDER) d.skills[k] = dndSkillBonus(c, k);
  d.passive = 10 + d.skills.perception;
  d.speed = dndSpeed(c); d.dark = dndDarkvision(c); d.resist = [...dndResistances(c)];
  d.spellDC = dndSpellDC(c); d.spellAtk = dndSpellAttack(c);
  d.crit = dndCritRange(c); d.attacks = dndAttacksPerTurn(c);
  d.initiative = d.mods.dex + (c.feats.includes('Alert') ? d.prof : 0);
  d.xpNext = c.level < DND_MAX_LEVEL ? DND_XP[c.level + 1] : null;
  d.sneak = c.cls === 'rogue' ? Math.ceil(c.level / 2) : 0;
  d.rageDmg = c.cls === 'barbarian' ? (c.level < 9 ? 2 : c.level < 16 ? 3 : 4) : 0;
  return d;
}

// returns the levels gained, and what each brought
function dndGainXp(c, n) {
  const Sp = DND_SPECIES[c.species];
  n = Math.round(n * (1 + (Sp.xpBonus || 0)));
  c.xp = (c.xp || 0) + Math.max(0, n);
  const ups = [];
  while (c.level < DND_MAX_LEVEL && c.xp >= DND_XP[c.level + 1]) {
    const before = dndMaxHp(c);
    c.level++;
    const after = dndMaxHp(c);
    c.hp += after - before; c.hitDice = (c.hitDice || 0) + 1;
    const oldMax = c.slotsMax || [];
    c.slotsMax = dndSlotsFor(c.cls, c.level);
    c.slots = c.slotsMax.map((m, i) => Math.max(0, Math.min(m, (c.slots[i] || 0) + m - (oldMax[i] || 0))));
    const learned = dndLearnSpells(c);
    // ability score improvement at 4, 8, 12, 16, 19: +2 to the class's main ability (+1 +1 if it is at 20)
    let asi = null;
    if ([4, 8, 12, 16, 19].includes(c.level)) {
      const C = DND_CLASSES[c.cls], main = C.primary.find(a => c.ab[a] < 20) || DND_ABILITIES.find(a => c.ab[a] < 20);
      if (main) { const before2 = c.ab[main]; c.ab[main] = Math.min(20, c.ab[main] + 2); asi = [main, c.ab[main] - before2]; }
      if (main === 'con') c.hp = Math.min(dndMaxHp(c), c.hp + c.level);
    }
    dndResetResources(c);
    const C = DND_CLASSES[c.cls];
    ups.push({ level: c.level, hp: after - before, features: (C.features[c.level] || []).slice(), spells: learned, asi });
  }
  return ups;
}

function dndRest(c, kind) {
  const C = DND_CLASSES[c.cls], sig = DND_SIGNATURES[C.signature];
  if (kind === 'long') {
    c.hp = dndMaxHp(c); c.tempHp = 0; c.hitDice = Math.min(c.level, (c.hitDice || 0) + Math.max(1, Math.floor(c.level / 2)));
    c.slots = dndSlotsFor(c.cls, c.level); c.slotsMax = c.slots.slice();
    dndResetResources(c);
    if (DND_SPECIES[c.species].inspireOnRest) c.inspiration = true;
    c.deathS = 0; c.deathF = 0;
    for (const k of Object.keys(c.conds)) if (!['aid', 'mage_armor'].includes(k)) delete c.conds[k];
    return { healed: true };
  }
  // short rest: spend hit dice (up to half), regain short-rest features
  let healed = 0;
  const want = dndMaxHp(c) - c.hp;
  while (want > healed && c.hitDice > 0) { c.hitDice--; healed += Math.max(1, dndDie(C.hd) + dndMod(c.ab.con)); }
  c.hp = Math.min(dndMaxHp(c), c.hp + healed);
  const rest = sig && (typeof sig.rest === 'function' ? sig.rest(c.level) : sig.rest);
  if (rest === 'sr') c.res.sig = sig.uses(c.level, c);
  else if (sig && sig.regainSr) c.res.sig = Math.min(sig.uses(c.level, c), (c.res.sig || 0) + sig.regainSr);
  if (C.caster === 'pact') c.slots = dndSlotsFor(c.cls, c.level);
  if (c.cls === 'monk') c.res.focus = c.level >= 2 ? c.level : 0;
  if (c.cls === 'fighter' && c.level >= 2) c.res.surge = c.level >= 17 ? 2 : 1;
  if (c.cls === 'wizard' && c.res.recovery !== 0) c.res.recoverReady = true;
  return { healed };
}

// a one-line summary: "Thorin, Dwarf Fighter 3"
function dndSummary(c) {
  if (!c) return '';
  const Sp = DND_SPECIES[c.species], L = Sp.lineages && c.lineage && Sp.lineages[c.lineage];
  return `${c.name}, ${L && c.species === 'elf' || L && c.species === 'gnome' ? L.name : Sp.name} ${DND_CLASSES[c.cls].name} ${c.level}`;
}
