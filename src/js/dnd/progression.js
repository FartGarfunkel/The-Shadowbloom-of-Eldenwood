// ---------------------------------------------------------------------------
// dnd/progression.js — (alpha 3) growing as the rules have it.
//
//   · Prepared spells: casters know their class's whole list (a wizard, the spells in their spellbook) and prepare as
//     many as the SRD 5.2 table allows for their level; your sheet's "Prepare spells" changes them (not mid-fight).
//     Cantrips are known, a few more as you rise. A wizard copies spells from scrolls into the spellbook (sneak + use
//     the scroll) and adds two spells each level.
//   · Level-up choices: at 4th, 8th, 12th and 16th level, an Ability Score Improvement or a feat; at 19th, an epic boon.
//     They wait on your sheet until you choose (the HUD reminds you).
//   · Multiclassing: from your sheet you can take your next levels in another class, if you meet both classes'
//     ability prerequisites (13 in their main abilities). Hit points, spell slots, spells and features follow.
// The choices use one small picker (DndPicker) that works with a mouse, the keyboard or a controller.
// ---------------------------------------------------------------------------

// prepared spells by class level (SRD 5.2), and cantrips known
const DND_PREP = {
  bard: [0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  cleric: [0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  druid: [0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  sorcerer: [0, 2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  warlock: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  wizard: [0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25],
  paladin: [0, 2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
  ranger: [0, 2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
};
const DND_CANTRIPS_KNOWN = { bard: [2, 3, 4], cleric: [3, 4, 5], druid: [2, 3, 4], sorcerer: [4, 5, 6], warlock: [2, 3, 4], wizard: [3, 4, 5], paladin: [0, 0, 0], ranger: [0, 0, 0] };
function dndCantripsKnown(cls, lvl) { const t = DND_CANTRIPS_KNOWN[cls]; return t ? t[lvl >= 10 ? 2 : lvl >= 4 ? 1 : 0] : 0; }

// ---- class levels, with multiclassing -------------------------------------------------------------------------------
function dndMcSum(c) { let n = 0; for (const v of Object.values(c.mc || {})) n += v; return n; }
function dndClassLevel(c, cls) { if (!c) return 0; if (cls === c.cls) return Math.max(1, c.level - dndMcSum(c)); return (c.mc && c.mc[cls]) || 0; }
function dndClassesOf(c) { const out = [[c.cls, dndClassLevel(c, c.cls)]]; for (const [k, v] of Object.entries(c.mc || {})) if (v > 0) out.push([k, v]); return out; }
// with the class levels swapped in for a moment (so a 5th-level fighter with 3 levels of wizard rages as a fighter of 5)
function dndAsClass(c, cls, fn) {
  const cls0 = c.cls, lvl0 = c.level, sig0 = c.res && c.res.sig, max0 = c.res && c.res.sigMax;
  const secondary = cls !== cls0;
  c.cls = cls; c.level = dndClassLevel(c, cls) || 1;
  if (secondary && c.res) { c.res.sig = c.res.sig2 ?? 0; c.res.sigMax = c.res.sig2Max ?? 0; }
  try { return fn(); } finally {
    if (secondary && c.res) { c.res.sig2 = c.res.sig; c.res.sig2Max = c.res.sigMax; c.res.sig = sig0; c.res.sigMax = max0; }
    c.cls = cls0; c.level = lvl0;
  }
}
// spell slots for a multiclass caster: full casters count whole, paladins and rangers half (rounded up)
function dndMcSlots(c) {
  const casters = dndClassesOf(c).filter(([k]) => DND_CLASSES[k] && DND_CLASSES[k].caster && DND_CLASSES[k].caster !== 'pact');
  let slots;
  if (casters.length <= 1) slots = casters.length ? dndSlotsFor(casters[0][0], casters[0][1]) : [];
  else { let lv = 0; for (const [k, l] of casters) lv += DND_CLASSES[k].caster === 'full' ? l : Math.ceil(l / 2); slots = DND_SLOTS_FULL[Math.max(1, Math.min(20, lv))].slice(); }
  const pact = dndClassesOf(c).find(([k]) => DND_CLASSES[k] && DND_CLASSES[k].caster === 'pact');
  if (pact) { const [n, l] = DND_PACT[pact[1]]; while (slots.length < l) slots.push(0); slots[l - 1] += n; }
  return slots;
}
function dndIsMc(c) { return !!(c && c.mc && dndMcSum(c) > 0); }
{
  const baseMax = dndMaxHp;
  dndMaxHp = function (c) {
    let hp = baseMax(c);
    if (dndIsMc(c)) { const hp0 = Math.floor(DND_CLASSES[c.cls].hd / 2) + 1; for (const [k, v] of Object.entries(c.mc)) hp += v * ((Math.floor(DND_CLASSES[k].hd / 2) + 1) - hp0); }
    if (c.feats && c.feats.includes('Hardy')) hp += 2 * c.level;
    return Math.max(1, hp);
  };
  const baseReset = dndResetResources;
  dndResetResources = function (c) {
    if (!dndIsMc(c)) return baseReset(c);
    dndAsClass(c, c.cls, () => baseReset(c));
    // the second class's own feature (sneak + your class feature key)
    const sec = Object.keys(c.mc).find(k => c.mc[k] > 0);
    if (sec) { const S = DND_SIGNATURES[DND_CLASSES[sec].signature]; c.res.sig2 = S ? S.uses(c.mc[sec], c) : 0; c.res.sig2Max = c.res.sig2; }
    c.slotsMax = dndMcSlots(c);
  };
  const baseRest = dndRest;
  dndRest = function (c, kind) {
    const r = baseRest(c, kind);
    if (dndIsMc(c) && kind === 'long') { c.slotsMax = dndMcSlots(c); c.slots = c.slotsMax.slice(); }
    return r;
  };
  const baseSig = dndUseSignature;
  dndUseSignature = function (lp) {
    const c = dndLive(lp); if (!c || !dndIsMc(c)) return baseSig(lp);
    const sec = Object.keys(c.mc).find(k => c.mc[k] > 0);
    if (lp.player.sneaking && sec) return dndAsClass(c, sec, () => baseSig(lp));
    return dndAsClass(c, c.cls, () => baseSig(lp));
  };
  const baseCastMod = dndCastMod;
  dndCastMod = function (c) {
    if (!dndIsMc(c)) return baseCastMod(c);
    let best = baseCastMod(c);
    for (const [k] of dndClassesOf(c)) { const C = DND_CLASSES[k]; if (C && C.castAb) best = Math.max(best, dndMod(c.ab[C.castAb])); }
    return best;
  };
  const baseMaxSpell = dndMaxSpellLevel;
  dndMaxSpellLevel = function (cls, level) { return baseMaxSpell(cls, level); };
}

// ---- which spells a character can prepare -----------------------------------------------------------------------------
function dndSpellPool(c) {
  const out = new Set();
  for (const [cls, lvl] of dndClassesOf(c)) {
    const C = DND_CLASSES[cls]; if (!C || !C.caster) continue;
    const maxL = dndIsMc(c) ? Math.max(dndMaxSpellLevel(cls, lvl), dndMcSlots(c).reduce((m, n, i) => n > 0 ? i + 1 : m, 0)) : dndMaxSpellLevel(cls, lvl);
    for (const [k, S] of Object.entries(DND_SPELLS)) {
      if (S.lvl === 0 || S.lvl > maxL) continue;
      if (!(S.classes || []).includes(cls) && !(C.spells || []).includes(k)) continue;
      if (cls === 'wizard' && !(c.book || []).includes(k)) continue;
      out.add(k);
    }
  }
  return [...out];
}
function dndCantripPool(c) {
  const out = new Set();
  for (const [cls] of dndClassesOf(c)) { const C = DND_CLASSES[cls]; if (!C || !C.caster) continue; for (const [k, S] of Object.entries(DND_SPELLS)) if (S.lvl === 0 && ((S.classes || []).includes(cls) || (C.cantrips || []).includes(k))) out.add(k); }
  return [...out];
}
function dndPrepMax(c) { let n = 0; for (const [cls, lvl] of dndClassesOf(c)) if (DND_PREP[cls]) n += DND_PREP[cls][Math.min(20, lvl)]; return n; }
function dndCantripMax(c) { let n = 0; for (const [cls, lvl] of dndClassesOf(c)) n += dndCantripsKnown(cls, lvl); return n; }
// spells that come from elsewhere (species, feats, lineage): always yours, never count against the limit
function dndFreeSpells(c) {
  const out = [], Sp = DND_SPECIES[c.species], L = Sp && Sp.lineages && c.lineage && Sp.lineages[c.lineage];
  if (L && L.cantrip) out.push(L.cantrip);
  if (c.species === 'tiefling') out.push('thaumaturgy');
  if (c.feats.includes('Magic Initiate (Cleric)')) out.push('guidance', 'sacred_flame');
  if (c.feats.includes('Magic Initiate (Wizard)')) out.push('fire_bolt', 'light');
  for (const k of (c.freeSpells || [])) out.push(k);
  return out.filter(k => DND_SPELLS[k]);
}
// how good a spell is for someone who isn't choosing by hand: harm and healing first, highest level first
function dndSpellScore(k, C) {
  const S = DND_SPELLS[k]; if (!S) return -99;
  let s = S.lvl * 10;
  if ((C && C.spells || []).includes(k)) s += 40;
  if (['bolt', 'missile', 'ray', 'burst', 'cone', 'line'].includes(S.kind) && S.dice) s += 25;
  if (S.kind === 'heal') s += 22; if (S.kind === 'target' && (S.dice || S.hold)) s += 18; if (S.kind === 'buff') s += 12; if (S.kind === 'summon') s += 14;
  if (S.kind === 'utility') s -= 10; if (S.ritual) s -= 6; if (S.todo) s -= 3;
  return s;
}
// fill the prepared list up to the limit (keeping what's there)
function dndAutoPrepare(c) {
  if (!dndClassesOf(c).some(([k]) => DND_CLASSES[k] && DND_CLASSES[k].caster)) return [];
  const free = new Set(dndFreeSpells(c));
  const pool = new Set(dndSpellPool(c)), cpool = new Set(dndCantripPool(c));
  const cur = c.spells.filter(k => DND_SPELLS[k]);
  let lv = cur.filter(k => DND_SPELLS[k].lvl > 0 && !free.has(k) && pool.has(k));
  let ca = cur.filter(k => DND_SPELLS[k].lvl === 0 && !free.has(k) && cpool.has(k));
  const got = [];
  const C = DND_CLASSES[c.cls];
  const pmax = dndPrepMax(c), cmax = dndCantripMax(c);
  const rank = (list) => list.sort((a, b) => dndSpellScore(b, C) - dndSpellScore(a, C));
  // keep a balance: the newest spell level the character can reach gets a place
  for (const k of rank([...pool].filter(k => !lv.includes(k)))) { if (lv.length >= pmax) break; lv.push(k); got.push(k); }
  for (const k of rank([...cpool].filter(k => !ca.includes(k)))) { if (ca.length >= cmax) break; ca.push(k); got.push(k); }
  if (lv.length > pmax) lv = lv.slice(0, pmax);
  if (ca.length > cmax) ca = ca.slice(0, cmax);
  c.spells = [...new Set([...ca, ...free, ...lv])];
  return got;
}
// the wizard's spellbook: what they started with, and two more each level
function dndBookInit(c) {
  if (c.cls !== 'wizard' && !(c.mc && c.mc.wizard)) return;
  if (!c.book) c.book = [...new Set([...(c.spells || []).filter(k => DND_SPELLS[k] && DND_SPELLS[k].lvl > 0), ...((DND_CLASSES.wizard.spells || []).filter(k => DND_SPELLS[k] && DND_SPELLS[k].lvl === 1))])].slice(0, 8);
}
function dndBookGrow(c, n = 2) {
  dndBookInit(c); if (!c.book) return [];
  const lvl = dndClassLevel(c, 'wizard'), maxL = dndMaxSpellLevel('wizard', lvl);
  const opts = Object.entries(DND_SPELLS).filter(([k, S]) => S.lvl > 0 && S.lvl <= maxL && (S.classes || []).includes('wizard') && !c.book.includes(k)).map(([k]) => k).sort((a, b) => dndSpellScore(b, DND_CLASSES.wizard) - dndSpellScore(a, DND_CLASSES.wizard));
  const got = opts.slice(0, n); c.book.push(...got); return got;
}
{
  // leveling learns by preparing: the new spells are prepared for you, and you can change them on your sheet
  const baseLearn = dndLearnSpells;
  dndLearnSpells = function (c) {
    if (c.cls === 'wizard' || (c.mc && c.mc.wizard)) dndBookGrow(c, 2);
    const before = new Set(c.spells);
    dndAutoPrepare(c);
    return c.spells.filter(k => !before.has(k));
  };
}

// ---- level-up choices: ability scores, feats, epic boons -----------------------------------------------------------------
// SRD 5.2 general feats and fighting styles, a few of Eldenwood's own, and the epic boons
const DND_FEATS_GENERAL = {
  'Ability Score Improvement': { srd: true, desc: '+2 to one ability score, or +1 to two (up to 20).', asi: true, repeat: true },
  'Grappler': { srd: true, desc: 'Your unarmed strikes can hold a creature fast for a moment; +1 Strength or Dexterity.', ab: ['str', 'dex'], prereq: { str: 13 } },
  'Archery': { srd: true, style: true, desc: 'Fighting style: your ranged weapon attacks hit harder (+2).' },
  'Defense': { srd: true, style: true, desc: 'Fighting style: +1 AC while you wear armour.' },
  'Great Weapon Fighting': { srd: true, style: true, desc: 'Fighting style: your two-handed and versatile weapon blows deal +1 damage per die (low rolls count as 3s).' },
  'Two-Weapon Fighting': { srd: true, style: true, desc: 'Fighting style: a light weapon in your off hand strikes along with your main blow.' },
  'Iron Constitution': { desc: '+1 Constitution. Your concentration holds whatever hits you.', ab: ['con'] },
  'Resonant Caster': { desc: '+1 to your spell save DC and spell attacks, and +1 to your spellcasting ability.', castAb: true, prereq: { caster: true } },
  'Fleet-Footed': { desc: '+1 Dexterity. +10 feet of speed.', ab: ['dex'] },
  'Hardy': { desc: '+2 hit points for every level you have (and every level to come).' },
  'Watchful': { desc: '+1 Wisdom. +5 to initiative and passive Perception; ambushers never get the first blow.', ab: ['wis'] },
  'Heavy Hitter': { desc: '+1 Strength. Heavy weapons deal +3 damage.', ab: ['str'] },
  'Bulwark': { desc: 'Your shield gives +1 more AC, and nothing knocks you back while you carry one.', prereq: { shield: true } },
  'Spellbreaker': { desc: '+2 to saving throws against spells, and your blows break a caster\'s concentration (silenced for a moment).' },
  'Mender': { desc: '+1 Wisdom. The healing you give restores 1d6 more.', ab: ['wis'] },
  'Trailwise': { desc: '+1 Wisdom. +2 Survival and Nature; webs, mud and thorns don\'t slow you.', ab: ['wis'] },
  'Silver Tongue': { desc: '+1 Charisma. +2 Persuasion and Deception, and merchants give you a better price.', ab: ['cha'] },
  'Quick Hands': { desc: '+1 Dexterity. +2 Sleight of Hand; you pick locks in half the time and drink potions in a blink.', ab: ['dex'] },
};
const DND_BOONS = {
  'Boon of Combat Prowess': { desc: 'Once a turn, a blow that would have glanced off lands anyway. +1 to any ability (up to 30).' },
  'Boon of Dimensional Travel': { desc: 'You can Misty Step without a spell slot, again and again. +1 to any ability (up to 30).', freeSpell: 'misty_step' },
  'Boon of Fate': { desc: 'Fate bends near you: your saving throws and those of your allies close by are a little better. +1 to any ability (up to 30).' },
  'Boon of Irresistible Offense': { desc: 'Your weapon damage ignores resistance. +1 Strength or Dexterity (up to 30).' },
  'Boon of Spell Recall': { desc: 'Once per long rest you cast a spell without spending its slot. +1 to your spellcasting ability (up to 30).' },
  'Boon of the Night Spirit': { desc: 'In darkness you fade from sight. +1 to any ability (up to 30).' },
  'Boon of Truesight': { desc: 'You see through illusions and invisibility. +1 to any ability (up to 30).' },
};
Object.assign(DND_FEATS, Object.fromEntries(Object.entries(DND_FEATS_GENERAL).map(([k, v]) => [k, v.desc])), Object.fromEntries(Object.entries(DND_BOONS).map(([k, v]) => [k, v.desc])));
function dndFeatOk(c, name) {
  const F = DND_FEATS_GENERAL[name]; if (!F) return true;
  if (!F.repeat && c.feats.includes(name)) return false;
  const P = F.prereq || {};
  for (const a of DND_ABILITIES) if (P[a] && c.ab[a] < P[a]) return false;
  if (P.caster && !dndClassesOf(c).some(([k]) => DND_CLASSES[k] && DND_CLASSES[k].caster)) return false;
  return true;
}
{
  // the level-ups: the automatic ability bump becomes a choice that waits on your sheet
  const baseGain = dndGainXp;
  dndGainXp = function (c, n) {
    const lvl0 = c.level, next = c.nextClass && DND_CLASSES[c.nextClass] && c.nextClass !== c.cls ? c.nextClass : null;
    const ab0 = Object.assign({}, c.ab);
    const ups = baseGain(c, n);
    for (const u of ups) {
      // a level taken in another class
      if (next) { c.mc = c.mc || {}; c.mc[next] = (c.mc[next] || 0) + 1; u.mcClass = next; u.features = (DND_CLASSES[next].features[c.mc[next]] || []).slice(); if (c.mc[next] === 1) u.features.unshift(`Multiclass: ${DND_CLASSES[next].name}`); }
      if (u.asi) { c.ab[u.asi[0]] = ab0[u.asi[0]] + 0; u.asi = null; }
      const clsLvl = dndClassLevel(c, u.mcClass || c.cls);
      if ([4, 8, 12, 16].includes(clsLvl) || (!u.mcClass && c.cls === 'fighter' && [6, 14].includes(clsLvl)) || (!u.mcClass && c.cls === 'rogue' && clsLvl === 10)) (c.pending || (c.pending = [])).push({ type: 'asi', level: u.level });
      if (u.level === 19) (c.pending || (c.pending = [])).push({ type: 'boon', level: 19 });
      if (clsLvl === 3 && typeof DND_SUBCLASSES !== 'undefined' && DND_SUBCLASSES[u.mcClass || c.cls]) (c.pending || (c.pending = [])).push({ type: 'subclass', cls: u.mcClass || c.cls, level: u.level });
      if (u.mcClass && DND_CLASSES[u.mcClass].caster) u.spells = dndLearnSpells(c);
    }
    if (dndIsMc(c)) { const s0 = c.slotsMax || []; c.slotsMax = dndMcSlots(c); c.slots = c.slotsMax.map((m, i) => Math.max(0, Math.min(m, (c.slots[i] || 0) + m - (s0[i] || 0)))); }
    return ups;
  };
}

// ---- the picker -------------------------------------------------------------------------------------------------------
// rows: [{ id, label, sub, on, off (disabled), group }]; max: how many can be on (toggle mode) or 0 (pick one)
class DndPicker {
  constructor(lp, o) {
    this.lp = lp; this.g = lp.g; this.o = o; this.sel = 0;
    const el = this.el = document.createElement('div'); el.className = 'dnd-picker';
    el.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation();
      if (ev.target === el) { this.close(); return; }
      const r = ev.target.closest('[data-i]'); if (r) { this.sel = +r.dataset.i; this.act(); return; }
      if (ev.target.closest('[data-done]')) this.close();
    });
    this.onKey = (ev) => {
      if (ev.code === 'Escape' || ev.code === 'KeyP') { ev.preventDefault(); ev.stopPropagation(); this.close(); }
      else if (ev.code === 'ArrowDown' || ev.code === 'KeyS') { ev.preventDefault(); this.move(1); }
      else if (ev.code === 'ArrowUp' || ev.code === 'KeyW') { ev.preventDefault(); this.move(-1); }
      else if (ev.code === 'Enter' || ev.code === 'Space') { ev.preventDefault(); this.act(); }
    };
    window.addEventListener('keydown', this.onKey, true);
    lp.el.appendChild(el);
    this.draw();
    this.g.sfx.play('map_paper');
  }
  rows() { return this.o.rows(); }
  draw() {
    const R = this.rows(), o = this.o;
    let lastGroup = null;
    const body = R.map((r, i) => { const head = r.group && r.group !== lastGroup ? `<div class="dp-group">${esc(r.group)}</div>` : ''; lastGroup = r.group || lastGroup; return `${head}<button class="dp-row${r.on ? ' on' : ''}${r.off ? ' off' : ''}${i === this.sel ? ' sel' : ''}" data-i="${i}"><b>${r.on ? '☑' : o.max ? '☐' : '›'} ${esc(r.label)}</b>${r.sub ? `<span>${esc(r.sub)}</span>` : ''}</button>`; }).join('');
    this.el.innerHTML = `<div class="dp-card"><div class="dp-head"><b>${esc(o.title)}</b><span>${esc(typeof o.status === 'function' ? o.status() : o.status || '')}</span></div><div class="dp-list">${body || '<div class="dp-empty">Nothing to choose here.</div>'}</div><div class="dp-foot">${esc(o.hint || (o.max ? 'A to choose · B when you\'re done' : 'A to choose · B to go back'))}<button class="btn tiny" data-done>Done</button></div></div>`;
    const s = this.el.querySelector('.dp-row.sel'); if (s && s.scrollIntoView) s.scrollIntoView({ block: 'nearest' });
  }
  move(d) { const n = this.rows().length; if (!n) return; this.sel = (this.sel + d + n) % n; this.draw(); }
  act() { const r = this.rows()[this.sel]; if (!r || r.off) { this.g.sfx.play('click_off'); return; } const close = this.o.pick(r, this); this.g.sfx.play('click'); if (close === true) this.close(); else this.draw(); }
  frame(dt, inp) {
    if (inp.padB || inp.padStart || inp.inventory) { this.close(); return; }
    if (inp.navY) this.move(inp.navY > 0 ? 1 : -1);
    if (inp.navX) this.move(inp.navX > 0 ? 6 : -6);
    if (inp.padA) this.act();
  }
  close() {
    const lp = this.lp;
    window.removeEventListener('keydown', this.onKey, true);
    this.el.remove();
    if (lp.npcUI === this) lp.npcUI = null;
    if (lp.mode === 'npc') lp.mode = 'play';
    if (this.o.onClose) this.o.onClose();
  }
}
function dndOpenPicker(lp, o) {
  if (lp.dndSheetEl) lp.closeDndSheet();
  if (lp.mode !== 'play' || lp.npcUI) return null;
  let P = null;
  lp.openNpcUI(() => (P = new DndPicker(lp, o)));
  return P;
}

// prepare spells
function dndOpenPrepare(lp) {
  const c = dndLive(lp); if (!c) return;
  const g = lp.g, p = lp.player;
  if (g.entities.some(e => e instanceof Mob && e.alive && e.T.hostile && !e.tamed && !e.dndSummonBy && Math.hypot(e.x - p.x, e.z - p.z) < 16 && (e.huntT > 0))) { lp.toast('Not with enemies hunting you: prepare your spells in a quiet moment', 'warn'); return; }
  dndBookInit(c);
  const free = new Set(dndFreeSpells(c));
  const pool = dndSpellPool(c), cpool = dndCantripPool(c);
  const pmax = dndPrepMax(c), cmax = dndCantripMax(c);
  const lvOn = () => c.spells.filter(k => DND_SPELLS[k] && DND_SPELLS[k].lvl > 0 && !free.has(k)).length;
  const caOn = () => c.spells.filter(k => DND_SPELLS[k] && DND_SPELLS[k].lvl === 0 && !free.has(k)).length;
  const sorted = [...cpool.filter(k => !free.has(k)), ...pool.filter(k => !free.has(k))].sort((a, b) => DND_SPELLS[a].lvl - DND_SPELLS[b].lvl || DND_SPELLS[a].name.localeCompare(DND_SPELLS[b].name));
  dndOpenPicker(lp, {
    title: c.cls === 'wizard' ? 'Prepare spells from your spellbook' : 'Prepare spells',
    status: () => `Prepared ${lvOn()}/${pmax}${cmax ? ` · cantrips ${caOn()}/${cmax}` : ''}`,
    max: pmax,
    rows: () => sorted.map(k => { const S = DND_SPELLS[k], on = c.spells.includes(k); return { id: k, label: `${S.name}${S.conc ? ' ◎' : ''}${S.ritual ? ' (ritual)' : ''}`, sub: S.desc, on, group: S.lvl ? `Level ${S.lvl}` : 'Cantrips' }; }),
    pick: (r) => {
      const S = DND_SPELLS[r.id], on = c.spells.includes(r.id);
      if (on) c.spells = c.spells.filter(k => k !== r.id);
      else if (S.lvl === 0 ? caOn() < cmax : lvOn() < pmax) c.spells.push(r.id);
      else { lp.toast(S.lvl === 0 ? `You know ${cmax} cantrips: let one go first` : `You can prepare ${pmax} spells: let one go first`, 'warn'); return false; }
      if (lp._dndSpell === r.id && on) lp._dndSpell = null;
      dndHudDirty(lp);
      return false;
    },
    hint: 'A to prepare or let go · B when you\'re done · ◎ concentration',
    onClose: () => lp.openDndSheet && setTimeout(() => lp.mode === 'play' && !lp.npcUI && lp.openDndSheet(), 30),
  });
}
// a level-up choice
function dndOpenChoice(lp) {
  const c = dndLive(lp); if (!c || !(c.pending && c.pending.length)) return;
  const P = c.pending[0];
  if (P.type === 'subclass' && typeof dndOpenSubclass === 'function') return dndOpenSubclass(lp, P);
  const done = () => { c.pending.shift(); dndDerive(c, lp.player.inv); lp.player.recalcMax && lp.player.recalcMax(); dndHudDirty(lp); };
  if (P.type === 'boon') {
    return dndOpenPicker(lp, {
      title: 'An epic boon (19th level)', status: 'Choose one',
      rows: () => Object.entries(DND_BOONS).map(([k, B]) => ({ id: k, label: k, sub: B.desc })),
      pick: (r) => { c.feats.push(r.id); const best = DND_ABILITIES.slice().sort((a, b) => c.ab[b] - c.ab[a])[0]; c.ab[best] = Math.min(30, c.ab[best] + 1); if (DND_BOONS[r.id].freeSpell) (c.freeSpells || (c.freeSpells = [])).push(DND_BOONS[r.id].freeSpell); done(); lp.toast(`${r.id}!`, 'epic'); return true; },
      onClose: () => setTimeout(() => lp.mode === 'play' && !lp.npcUI && lp.openDndSheet(), 30),
    });
  }
  // an Ability Score Improvement or a feat
  dndOpenPicker(lp, {
    title: `Level ${P.level}: improve yourself`, status: 'An Ability Score Improvement, or a feat',
    rows: () => [
      ...DND_ABILITIES.map(a => ({ id: 'asi2:' + a, label: `+2 ${DND_ABILITY_NAMES[a]} (${c.ab[a]} → ${Math.min(20, c.ab[a] + 2)})`, off: c.ab[a] >= 20, group: 'Ability Score Improvement' })),
      ...Object.entries(DND_FEATS_GENERAL).filter(([k]) => k !== 'Ability Score Improvement').map(([k, F]) => ({ id: 'feat:' + k, label: k + (F.style ? ' (fighting style)' : ''), sub: F.desc, off: !dndFeatOk(c, k), group: 'Feats' })),
    ],
    pick: (r) => {
      if (r.id.startsWith('asi2:')) { const a = r.id.slice(5); c.ab[a] = Math.min(20, c.ab[a] + 2); lp.toast(`${DND_ABILITY_NAMES[a]} rises to ${c.ab[a]}`, 'good'); }
      else { const k = r.id.slice(5), F = DND_FEATS_GENERAL[k]; c.feats.push(k);
        if (F.ab) { const a = F.ab.slice().sort((x, y) => c.ab[x] - c.ab[y])[0]; c.ab[a] = Math.min(20, c.ab[a] + 1); }
        if (F.castAb) { const C = DND_CLASSES[c.cls]; const a = C.castAb || 'int'; c.ab[a] = Math.min(20, c.ab[a] + 1); }
        lp.toast(`New feat: ${k}`, 'good'); }
      done(); return true;
    },
    onClose: () => setTimeout(() => lp.mode === 'play' && !lp.npcUI && lp.openDndSheet(), 30),
  });
}
// take your next levels in another class
function dndOpenMulticlass(lp) {
  const c = dndLive(lp); if (!c) return;
  const ok = (k) => { const C1 = DND_CLASSES[c.cls], C2 = DND_CLASSES[k]; return C1.primary.some(a => c.ab[a] >= 13) && C2.primary.some(a => c.ab[a] >= 13); };
  dndOpenPicker(lp, {
    title: 'Your next levels', status: c.nextClass && c.nextClass !== c.cls ? `Next level: ${DND_CLASSES[c.nextClass].name}` : `Next level: ${DND_CLASSES[c.cls].name}`,
    rows: () => [{ id: c.cls, label: `${DND_CLASSES[c.cls].name} (your class, level ${dndClassLevel(c, c.cls)})`, on: !c.nextClass || c.nextClass === c.cls },
      ...DND_CLASS_ORDER.filter(k => k !== c.cls).map(k => ({ id: k, label: `${DND_CLASSES[k].name}${c.mc && c.mc[k] ? ` (level ${c.mc[k]})` : ''}`, sub: ok(k) ? DND_CLASSES[k].desc : `Needs 13 in ${DND_CLASSES[k].primary.map(a => DND_ABILITY_NAMES[a]).join(' or ')} (and in your own class's main ability)`, off: !ok(k) && !(c.mc && c.mc[k]), on: c.nextClass === k }))],
    pick: (r) => { c.nextClass = r.id === c.cls ? null : r.id; lp.toast(r.id === c.cls ? `Your next level will be ${DND_CLASSES[c.cls].name}` : `Your next level will be in ${DND_CLASSES[r.id].name}`, 'good'); return true; },
    onClose: () => setTimeout(() => lp.mode === 'play' && !lp.npcUI && lp.openDndSheet(), 30),
  });
}

// the sheet: Prepare spells, a waiting choice, Multiclass
{
  const baseOpen = LocalPlayer.prototype.openDndSheet;
  LocalPlayer.prototype.openDndSheet = function () {
    const r = baseOpen.call(this);
    const el = this.dndSheetEl, c = dndLive(this); if (!el || !c) return r;
    const bar = document.createElement('div'); bar.className = 'ds-prog';
    const caster = dndClassesOf(c).some(([k]) => DND_CLASSES[k] && DND_CLASSES[k].caster);
    const mcTxt = dndIsMc(c) ? dndClassesOf(c).map(([k, l]) => `${DND_CLASSES[k].name} ${l}`).join(' / ') : '';
    bar.innerHTML = `${c.pending && c.pending.length ? `<button class="btn tiny primary" data-prog="choice">Level-up choice waiting (${c.pending.length})</button>` : ''}${caster ? `<button class="btn tiny" data-prog="prepare">Prepare spells (${c.spells.filter(k => DND_SPELLS[k] && DND_SPELLS[k].lvl > 0).length}/${dndPrepMax(c)})</button>` : ''}<button class="btn tiny" data-prog="mc">Multiclass…</button>${mcTxt ? `<span>${esc(mcTxt)}</span>` : ''}${c.book ? `<span>Spellbook: ${c.book.length} spells</span>` : ''}`;
    const card = el.querySelector('.ds-card'); if (card) card.insertBefore(bar, card.querySelector('.ds-top'));
    bar.addEventListener('pointerdown', (e) => { e.stopPropagation(); const b = e.target.closest('[data-prog]'); if (!b) return; const k = b.dataset.prog; if (k === 'prepare') dndOpenPrepare(this); else if (k === 'choice') dndOpenChoice(this); else if (k === 'mc') dndOpenMulticlass(this); });
    // multiclass features
    if (dndIsMc(c)) { const ul = el.querySelector('.ds-feats'); if (ul) for (const [k, l] of Object.entries(c.mc)) for (let i = 1; i <= l; i++) for (const f of (DND_CLASSES[k].features[i] || [])) ul.insertAdjacentHTML('beforeend', `<li><b>${esc(f)}</b> <i>(${esc(DND_CLASSES[k].name)} ${i})</i></li>`); }
    // controllers: X prepares spells, Y makes a waiting choice
    this._sheetPad = true;
    return r;
  };
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    if (this.dndSheetEl && inp && inp.fromPad) {
      const c = dndLive(this);
      if (c && inp.padX) { inp = Object.assign({}, inp, { padX: false }); dndOpenPrepare(this); }
      else if (c && inp.padY) { inp = Object.assign({}, inp, { padY: false }); if (c.pending && c.pending.length) dndOpenChoice(this); else dndOpenMulticlass(this); }
    }
    return baseUpd.call(this, dt, inp);
  };
}
// a reminder on the HUD while a choice waits
{
  const baseFrame = Hud.prototype.frame;
  Hud.prototype.frame = function (dt, cam) {
    const r = baseFrame.call(this, dt, cam);
    try {
      const c = this.lp && dndLive(this.lp), on = !!(c && c.pending && c.pending.length);
      let el = this._choiceEl;
      if (on && (!el || !el.isConnected) && this.root) { el = this._choiceEl = document.createElement('div'); el.className = 'choice-chip'; this.root.appendChild(el); }
      if (el) { el.hidden = !on; if (on) { const t = `★ Level-up choice waiting · ${dndKeyName(this.lp, 'dndSheet') === '?' ? 'open your sheet' : 'your sheet (' + dndKeyName(this.lp, 'dndSheet') + ')'}`; if (el.textContent !== t) el.textContent = t; } }
    } catch (e) { /* later */ }
    return r;
  };
}
// a wizard copies a scroll's spell into the spellbook (sneak + use it): 50 gold a level, in the rules; here, the scroll
{
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const p = this.player, h = p.inv.held, d = h && itemDef(h.id), c = dndLive(this);
    if (!repeat && !fromOff && c && d && d.dndScroll && p.sneaking && (c.cls === 'wizard' || (c.mc && c.mc.wizard))) {
      const S = DND_SPELLS[d.dndScroll];
      dndBookInit(c);
      if (!(S.classes || []).includes('wizard') || S.lvl === 0) { this.toast(`${S.name} isn't a wizard's spell`, ''); return; }
      if (c.book.includes(d.dndScroll)) { this.toast(`${S.name} is already in your spellbook`, ''); return; }
      if (S.lvl > dndMaxSpellLevel('wizard', dndClassLevel(c, 'wizard'))) { this.toast(`${S.name} is beyond you for now (level ${S.lvl})`, 'warn'); return; }
      c.book.push(d.dndScroll);
      if (!this.g.creative) { h.n--; if (h.n <= 0) p.inv.held = null; }
      this.toast(`You copy ${S.name} into your spellbook. Prepare it from your sheet.`, 'epic');
      this.g.sfx.play('map_paper');
      return;
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
}
// feats at work
{
  const baseAtk = dndAttack;
  dndAttack = function (lp, e, W, o = {}) {
    const res = baseAtk(lp, e, W, o); if (!res || !res.hit) return res;
    const c = dndOf(lp.player); if (!c) return res;
    const F = c.feats;
    if (F.includes('Archery') && W.ranged) res.dmg += 2;
    if (F.includes('Great Weapon Fighting') && !W.ranged && (W.props.includes('two') || (W.ver && !lp.player.inv.offhand))) res.dmg += (W.ver && !lp.player.inv.offhand ? W.ver : W.dice)[0];
    if (F.includes('Heavy Hitter') && W.props.includes('heavy')) res.dmg += 3;
    if (F.includes('Grappler') && W.unarmed && !(e.T && e.T.boss)) e.dndHeld = Math.max(e.dndHeld || 0, 1.5);
    if (F.includes('Spellbreaker') && e.T && (e.T.ranged || /mage|witch|warlock|hexer|magus|archmage|shaman|priest/.test(e.type || ''))) e.dndSilence = Math.max(e.dndSilence || 0, 3);
    if (F.includes('Two-Weapon Fighting') && !W.ranged) { const off = lp.player.inv.offhand, od = off && itemDef(off.id); if (od && od.dnd && (od.dnd.props || []).includes('light')) res.dmg += dndRoll(od.dnd.dice[0], od.dnd.dice[1]).total; }
    if (F.includes('Boon of Irresistible Offense')) res.dmg = Math.max(res.dmg, Math.round(res.dmg / Math.max(0.5, dndMobTakes(e, W.dmg) || 1)));
    return res;
  };
  const baseDerive = dndDerive;
  dndDerive = function (c, inv) {
    const d = baseDerive(c, inv); if (!d) return d;
    const F = c.feats || [];
    if (F.includes('Defense') && d.armorType && !['fighter', 'paladin'].includes(c.cls)) d.ac += 1;
    if (F.includes('Bulwark') && d.shield) d.ac += 1;
    if (F.includes('Fleet-Footed')) d.speed += 10;
    if (F.includes('Watchful')) { d.initiative += 5; d.passive += 5; }
    if (F.includes('Resonant Caster')) { d.spellDC += 1; d.spellAtk += 1; }
    if (F.includes('Trailwise')) { if (d.skills.survival != null) d.skills.survival += 2; if (d.skills.nature != null) d.skills.nature += 2; }
    if (F.includes('Silver Tongue')) { d.skills.persuasion += 2; d.skills.deception += 2; }
    if (F.includes('Quick Hands')) d.skills.sleight += 2;
    if (F.includes('Spellbreaker')) for (const a of DND_ABILITIES) d.saves[a] += 1;
    if (F.includes('Boon of Fate')) for (const a of DND_ABILITIES) d.saves[a] += 1;
    if (F.includes('Boon of Truesight')) d.dark = Math.max(d.dark || 0, 120);
    return d;
  };
}
