// ---------------------------------------------------------------------------
// dnd/origins.js — (alpha 3) Eldenwood's own folk, subclasses, and the towns' backgrounds.
//
//   · Six species of the campaign's lands, beside the SRD's nine: the Sunmane of the Plains of Silent Stones, the
//     Kestrin of Skyreach, the Mossborn (the Verdant Whisperers' kin), the Lumini of Lumina, the Tidecursed of drowned
//     Aethel, and the Veilborn, touched by the Shadowfell. Each with traits that work in play and a feature on N.
//   · Subclasses: at 3rd level in a class you choose one of three, the SRD's own and two of Eldenwood's. Each grows at
//     3rd, 6th, 10th and 14th level (some at 7th, 11th, 15th, as their class has it). Characters past 3rd level from
//     before alpha 3 are asked to choose one.
//   · Four backgrounds from the towns: a Stonebridge guard, an Oakhaven woodcutter, a Stillwater fisher, a Cinderfall miner.
// ---------------------------------------------------------------------------

Object.assign(DND_SPECIES, {
  sunmane: { name: 'Sunmane', speed: 35, size: 'medium', dark: 60, origin: 'the Plains of Silent Stones',
    traits: [['Darkvision', '60 feet.'], ['Feline Agility', 'Fleet and sure: 35 feet of speed, and falls hurt you less.'], ['Hunter\'s Senses', 'Proficiency in Perception and Stealth.'], ['Sun-Mane Roar', 'Roar (N): foes within 10 feet make a Wisdom save or flee in fear for a few seconds. Proficiency-bonus uses per long rest.']],
    skills: ['perception', 'stealth'], feature: 'roar', wear: { jump: 1 }, look: { skins: ['#d8a050', '#c08038', '#e8c070', '#a86a30', '#f0d8a0', '#7a5030'], tail: true } },
  kestrin: { name: 'Kestrin', speed: 30, size: 'medium', dark: 0, origin: 'Skyreach Roost',
    traits: [['Hollow Bones', 'You never take falling damage, and you drift down gently.'], ['Keen Sight', 'Proficiency in Perception; advantage on sight-based checks.'], ['Talons', 'Your unarmed strikes deal 1d6 slashing.'], ['Updraft', 'Leap skyward on a gust (N), and glide down. Proficiency-bonus uses per long rest.']],
    skills: ['perception'], feature: 'updraft', wear: { featherFall: true, adv: ['perception'] }, talons: true, look: { skins: ['#c8b8a0', '#8a7a6a', '#e8e0d0', '#6a5a4a', '#b89870'] } },
  mossborn: { name: 'Mossborn', speed: 25, size: 'medium', dark: 0, origin: 'the Verdant Vale',
    traits: [['Barkskin Hide', 'Your skin is living bark: +1 Armour Class.'], ['Rootsong', 'You know Druidcraft, and plants answer you: proficiency in Nature.'], ['Photosynthesis', 'In daylight you slowly mend (a hit point every few seconds out of combat).'], ['Rooted Stance', 'Plant yourself (N): for a short while, you can\'t be knocked back and your next blows entangle. Proficiency-bonus uses per long rest.']],
    skills: ['nature'], feature: 'rooted', freeSpells: ['druidcraft'], wear: { ac: 1, resist: ['poison'] }, sunHeal: true, look: { skins: ['#6a8a4a', '#8a7a4a', '#5a6a3a', '#7a6a4a', '#4a5a3a'] } },
  lumini: { name: 'Lumini', speed: 30, size: 'medium', dark: 60, origin: 'Lumina, the crystal city',
    traits: [['Inner Light', 'You glow softly, lighting the dark around you; you know the Light cantrip.'], ['Crystal Body', 'Resistance to radiant damage.'], ['Darkvision', '60 feet.'], ['Prismatic Flash', 'Flash (N): a cone of searing light, 1d10 radiant rising with level (Dexterity save halves). Proficiency-bonus uses per long rest.']],
    feature: 'flash', freeSpells: ['light'], wear: { light: true, resist: ['radiant'] }, look: { skins: ['#c8d8f0', '#e0c8f0', '#c0f0e0', '#f0e8c0', '#a8b8e8'] } },
  tidecursed: { name: 'Tidecursed', speed: 30, size: 'medium', dark: 60, origin: 'drowned Aethel',
    traits: [['Amphibious', 'You breathe water as easily as air, and swim like a seal.'], ['Cold-Blooded', 'Resistance to cold damage.'], ['Darkvision', '60 feet.'], ['Undertow', 'Call the tide (N): a surge of water knocks foes around you back and slows them. Proficiency-bonus uses per long rest.']],
    feature: 'undertow', wear: { waterBreathing: true, resist: ['cold'] }, look: { skins: ['#5a8a9a', '#4a7a8a', '#6a9a8a', '#3a6a7a', '#7aa0a8'] } },
  veilborn: { name: 'Veilborn', speed: 30, size: 'medium', dark: 120, origin: 'the edge of the Shadowfell',
    traits: [['Superior Darkvision', '120 feet.'], ['Shadow-Touched', 'Resistance to necrotic damage; proficiency in Stealth.'], ['Between Worlds', 'Advantage on saves against being frightened.'], ['Shadow Step', 'Step through the dark (N) to a spot you can see nearby. Proficiency-bonus uses per long rest.']],
    skills: ['stealth'], feature: 'shadowstep', freeSpells: ['minor_illusion'], wear: { resist: ['necrotic'] }, look: { skins: ['#8a8a96', '#6a6a7a', '#a0a0aa', '#5a5a6a', '#b8b8c0'] } },
});
DND_SPECIES_ORDER.push('sunmane', 'kestrin', 'mossborn', 'lumini', 'tidecursed', 'veilborn');
// their looks
{
  const baseLook = dndDefaultLook;
  dndDefaultLook = function (species, cls, seed) {
    const L = baseLook(species, cls, seed);
    const R = mulberry32((((seed ?? 7) * 31) >>> 0) || 3), pick = (a) => a[Math.floor(R() * a.length)];
    if (species === 'sunmane') Object.assign(L, { hair: pick(['wild', 'long', 'curly']), hairCol: pick(['#c8781a', '#e0a040', '#8a4a1a', '#f0c870']), eyes: 'slit', eyeCol: pick(['#d8a020', '#7ac040', '#e8c040']), beard: 'none', tail: true, ears: 'round' });
    else if (species === 'kestrin') Object.assign(L, { hair: 'mohawk', hairCol: pick(['#6a4a2a', '#2a2a2a', '#c8b8a0', '#8a3a1a']), eyes: 'round', eyeCol: pick(['#e8b020', '#c86a10']), beard: 'none', hornCol: '#d8a030' });
    else if (species === 'mossborn') Object.assign(L, { hair: pick(['wild', 'long', 'braids']), hairCol: pick(['#4a7a2a', '#6a8a3a', '#3a5a2a', '#8a9a4a']), beard: R() < 0.4 ? 'long' : 'none', eyes: 'round', eyeCol: '#c8e060', marks: 'none' });
    else if (species === 'lumini') Object.assign(L, { hair: pick(['bald', 'short', 'crop']), hairCol: '#e8f0ff', beard: 'none', eyes: 'glow', eyeCol: pick(['#a0e0ff', '#e0a0ff', '#a0ffd0']), hornCol: pick(['#a0d8ff', '#d8a0ff', '#a0ffe0']) });
    else if (species === 'tidecursed') Object.assign(L, { hair: pick(['long', 'braids', 'tail']), hairCol: pick(['#2a4a4a', '#1a3a4a', '#3a5a5a', '#c8d8d0']), beard: 'none', eyes: 'wide', eyeCol: pick(['#40c0c0', '#2a8aa0']), marks: 'scar' });
    else if (species === 'veilborn') Object.assign(L, { hair: pick(['long', 'wild', 'sides']), hairCol: pick(['#1a1a24', '#e8e8f0', '#3a3a4a']), beard: 'none', eyes: 'glow', eyeCol: pick(['#c0c0ff', '#e8e8f0', '#a080ff']) });
    return L;
  };
}
// the freebies and the always-on: through the same path as magic items' powers
{
  const baseFree = dndFreeSpells;
  dndFreeSpells = function (c) {
    const out = baseFree(c), Sp = DND_SPECIES[c.species];
    if (Sp && Sp.freeSpells) for (const k of Sp.freeSpells) if (DND_SPELLS[k] && !out.includes(k)) out.push(k);
    for (const k of dndSubSpells(c)) if (!out.includes(k)) out.push(k);
    return out;
  };
  const baseActive = dndMagicActive;
  dndMagicActive = function (c, inv) {
    const out = baseActive(c, inv), Sp = DND_SPECIES[c.species];
    if (Sp && Sp.wear) out.push({ M: { wear: Sp.wear, slot: 'trait' }, s: null });
    for (const F of dndSubFeatures(c)) { if (F.wear && (!F.when || dndSubWhen(c, F.when))) out.push({ M: { wear: F.wear, slot: 'feature' }, s: null }); }
    return out;
  };
}
function dndSubWhen(c, w) { return w === 'rage' ? c.conds.rage > 0 : w === 'unarmored' ? !(c.d && c.d.armorType) : w === 'hp_half' ? (c._hpFrac || 1) < 0.5 : true; }

// ---- the species' features (N) -------------------------------------------------------------------------------------------
{
  const baseName = dndRacialName;
  dndRacialName = function (c) {
    const Sp = DND_SPECIES[c.species];
    return Sp && Sp.feature ? ({ roar: 'Sun-Mane Roar', updraft: 'Updraft', rooted: 'Rooted Stance', flash: 'Prismatic Flash', undertow: 'Undertow', shadowstep: 'Shadow Step' })[Sp.feature] : baseName(c);
  };
  const baseUse = dndUseRacial;
  dndUseRacial = function (lp) {
    const c = dndLive(lp), Sp = c && DND_SPECIES[c.species];
    if (!Sp || !Sp.feature) return baseUse(lp);
    const g = lp.g, p = lp.player;
    if ((lp._raCd || 0) > g.time) return;
    lp._raCd = g.time + 0.6;
    dndDerive(c, p.inv);
    if (!dndSpend(c, 'racial')) { lp.toast('Spent: rest to recover it', 'warn'); return; }
    const DC = 8 + c.d.mods.con + c.d.prof, n = c.level >= 17 ? 4 : c.level >= 11 ? 3 : c.level >= 5 ? 2 : 1;
    if (Sp.feature === 'roar') {
      let k = 0;
      for (const e of dndHostilesNear(g, p.x, p.y + 1, p.z, 3.5, lp)) if (!dndMobSave(e, 'wis', DC).ok) { e.dndFear = { from: p, t: 4 + c.d.prof }; k++; }
      g.sfx.playAt('roar', p.x, p.y + 1, p.z, 32); dndSpellBurst(g, p.x, p.y + 1, p.z, 'mana_fire', 40, 1.6);
      lp.toast(k ? `Sun-Mane Roar: ${k} flee in fear` : 'Sun-Mane Roar: they stand their ground', k ? 'good' : '');
    } else if (Sp.feature === 'updraft') {
      p.vy = 13; p.fallStart = null; lp._glideT = 6; g.burst(p.x, p.y, p.z, 'cloud', 20, 1.2); lp.toast('Updraft: you ride the wind up', 'good');
    } else if (Sp.feature === 'rooted') {
      c.conds.rooted = 12; c.conds.smite = { dice: [1, 6], dmg: 'piercing', name: 'Rooted Stance', fx: 'mana_heal', t: 12, root: 2 };
      g.burst(p.x, p.y + 0.2, p.z, 'leaf', 20, 1); lp.toast('Rooted Stance: you can\'t be moved, and your next blow entangles', 'good');
    } else if (Sp.feature === 'flash') {
      const look = lookVector(p.yaw, p.pitch), hits = [];
      for (const e of dndHostilesNear(g, p.x, p.y + 1, p.z, 5.5, lp)) { const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1; if ((dx * look[0] + dz * look[2]) / d / (Math.hypot(look[0], look[2]) || 1) > 0.7) hits.push(e); }
      for (let i = 0; i < 60; i++) { const a = (Math.random() - 0.5) * 1.2, sp = 6 + Math.random() * 5, lx = look[0] * Math.cos(a) - look[2] * Math.sin(a), lz = look[0] * Math.sin(a) + look[2] * Math.cos(a); spellSpark(g, p.x + look[0] * 0.6, p.y + p.eye - 0.2, p.z + look[2] * 0.6, 'mana_light', { vx: lx * sp, vy: look[1] * sp, vz: lz * sp, life: 0.45, size: 0.1 }); }
      const dmg = dndRoll(n, 10).total;
      for (const e of hits) { const sv = dndMobSave(e, 'dex', DC); dndSpellHit(lp, e, sv.ok ? Math.floor(dmg / 2) : dmg, 'radiant'); if (!sv.ok) e.dndBlindT = 2; }
      g.sfx.play('spell_zap'); lp.toast(`Prismatic Flash: ${n}d10 radiant`, 'good');
    } else if (Sp.feature === 'undertow') {
      for (const e of dndHostilesNear(g, p.x, p.y + 1, p.z, 4, lp)) { const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1; if (!dndMobSave(e, 'str', DC).ok) { e.vx += dx / d * 9; e.vz += dz / d * 9; e.vy += 3; e.slowT = Math.max(e.slowT || 0, 4); dndSpellHit(lp, e, dndRoll(n, 6).total, 'bludgeoning', { knock: 1.4 }); } }
      g.burst(p.x, p.y + 0.5, p.z, 'splash', 60, 2.4); g.sfx.playAt('splash', p.x, p.y, p.z, 24); lp.toast('Undertow: the tide surges round you', 'good');
    } else if (Sp.feature === 'shadowstep') {
      const S = DND_SPELLS.misty_step; if (S) dndUtility(lp, c, S, 'misty_step', 2); g.burst(p.x, p.y + 1, p.z, 'smoke', 20, 0.6);
    }
    dndHudDirty(lp);
  };
}
{
  // fear: away from what frightened them; blinded by the flash: they stumble
  const baseAI = Mob.prototype.controlAI;
  Mob.prototype.controlAI = function (dt, ...rest) {
    const F = this.dndFear;
    if (F && (F.t -= dt) > 0 && !(this.T && this.T.boss)) { const a = Math.atan2(this.x - F.from.x, this.z - F.from.z); return { want: (this.T.speed || 3) * 1.1, dir: Math.atan2(-Math.sin(a), -Math.cos(a)) }; }
    if (F && F.t <= 0) this.dndFear = null;
    if (this.dndBlindT > 0) { this.dndBlindT -= dt; return { want: (this.T.speed || 3) * 0.3, dir: this.yaw + Math.sin(this.age * 3) }; }
    return baseAI.call(this, dt, ...rest);
  };
  // the Mossborn mend in daylight; the Kestrin glide; rooted can't be knocked
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseUpd.call(this, dt, inp);
    try {
      const c = dndOf(this.player), Sp = c && DND_SPECIES[c.species], p = this.player, g = this.g;
      if (Sp && Sp.sunHeal && !p.dead && g.env && g.env.day > 0.6 && g.dim === 0) { this._sunT = (this._sunT || 0) + dt; if (this._sunT > 6 && !(this.lastHurtT > g.time - 8)) { this._sunT = 0; if (p.health < p.maxHealth) dndHeal(this, 1); } }
      if (this._glideT > 0) { this._glideT -= dt; if (p.vy < -2.2) p.vy = -2.2; p.fallStart = null; }
      if (Sp && c.species === 'kestrin') p.fallStart = null;
      if (c && c.conds.rooted > 0) { c.conds.rooted -= dt; p.vx *= 0.2; p.vz *= 0.2; }
    } catch (e) { /* no sheet */ }
    return r;
  };
  const baseKnock = LocalPlayer.prototype.knock;
  if (baseKnock) LocalPlayer.prototype.knock = function (vx, vy, vz) { const c = dndOf(this.player); if (c && c.conds.rooted > 0) return; return baseKnock.call(this, vx, vy, vz); };
}

// ---- subclasses --------------------------------------------------------------------------------------------------------
// a feature: { lv, name, desc, wear: {derived extras}, when: 'rage'|'unarmored', crit, rider: { dice, type, when, slow, burn, heal, perHit },
//              onKill: { temp, heal }, hurt: { reduce, when }, spells: [always prepared, by level], aura: { heal } }
const SUB = (name, src, blurb, feats) => ({ name, src, blurb, feats });
const DND_SUBCLASSES = {
  barbarian: {
    berserker: SUB('Path of the Berserker', 'SRD', 'Rage made into a storm of blows.', [
      { lv: 3, name: 'Frenzy', desc: 'While raging, your first hit each moment deals an extra 1d6 per rage damage bonus.', rider: { dice: [2, 6], when: 'rage', perSec: 1 } },
      { lv: 6, name: 'Mindless Rage', desc: 'You can\'t be charmed or frightened while raging.', wear: { immune: ['charmed', 'frightened'] }, when: 'rage' },
      { lv: 10, name: 'Retaliation', desc: 'When something hurts you up close, you strike back.', hurt: { retaliate: true } },
      { lv: 14, name: 'Intimidating Presence', desc: 'Your rage frightens the weak: foes near you sometimes flee.', aura: { fear: 3 } }]),
    rootbound: SUB('Path of the Rootbound', 'Eldenwood', 'The old roots rage with you, holding fast what you strike.', [
      { lv: 3, name: 'Grasping Roots', desc: 'While raging, your hits slow foes as roots coil round their feet, and you gain +1 AC.', rider: { slow: 2, when: 'rage' }, wear: { ac: 1 }, when: 'rage' },
      { lv: 6, name: 'Deep Sap', desc: 'While raging you mend a hit point every few seconds.', wear: { regen: 1 }, when: 'rage' },
      { lv: 10, name: 'Heartwood', desc: 'Resistance to poison, and you can\'t be moved by force.', wear: { resist: ['poison'] } },
      { lv: 14, name: 'The Forest Answers', desc: 'Your hits while raging deal an extra 1d8 piercing as thorns burst from the ground.', rider: { dice: [1, 8], type: 'piercing', when: 'rage' } }]),
    ember: SUB('Path of the Ember Heart', 'Eldenwood', 'Your fury burns like Mount Cinder\'s heart.', [
      { lv: 3, name: 'Kindled Rage', desc: 'While raging your blows deal an extra 1d6 fire and set foes alight; resistance to fire.', rider: { dice: [1, 6], type: 'fire', when: 'rage', burn: true }, wear: { resist: ['fire'] } },
      { lv: 6, name: 'Ashwalker', desc: 'Lava and burning ground hold no fear: immunity to fire while raging.', wear: { immune: ['fire'] }, when: 'rage' },
      { lv: 10, name: 'Searing Retort', desc: 'Those who strike you while you rage are burned.', hurt: { burnBack: true, when: 'rage' } },
      { lv: 14, name: 'Cinderstorm', desc: 'Your fire rider grows to 2d6.', rider: { dice: [1, 6], type: 'fire', when: 'rage' } }]),
  },
  bard: {
    lore: SUB('College of Lore', 'SRD', 'You know a little of everything, and a lot of the rest.', [
      { lv: 3, name: 'Bonus Proficiencies', desc: '+2 to three skills of your choice (Arcana, History, Insight).', wear: { skills: { arcana: 2, history: 2, insight: 2 } } },
      { lv: 3, name: 'Cutting Words', desc: 'Your mockery saps foes: those you hit with a spell deal less harm.', rider: { weaken: true, spell: true } },
      { lv: 6, name: 'Magical Discoveries', desc: 'Two spells from any list, always prepared.', spells: ['counterspell', 'fireball'] },
      { lv: 14, name: 'Peerless Skill', desc: '+3 to every skill check.', wear: { skills: { all: 3 } } }]),
    rootsong: SUB('College of the Rootsong', 'Eldenwood', 'You sing the old song that binds the realms.', [
      { lv: 3, name: 'Harmonic Verse', desc: 'Your songs mend: allies near you heal a little when you inspire them; Healing Word always prepared.', spells: ['healing_word', 'entangle'], aura: { heal: 1 } },
      { lv: 6, name: 'Resonant Chord', desc: 'Your spells deal an extra 1d6 thunder.', rider: { dice: [1, 6], type: 'thunder', spell: true } },
      { lv: 10, name: 'Song of the Roots', desc: 'Plant Growth and Speak with Plants always prepared; resistance to thunder.', spells: ['plant_growth', 'speak_with_plants'], wear: { resist: ['thunder'] } },
      { lv: 14, name: 'The Whole Song', desc: 'Once a long rest, Mass Healing Word heals everyone near you fully (Mass Healing Word prepared).', spells: ['mass_healing_word'] }]),
    masks: SUB('College of Masks', 'Eldenwood', 'A face for every room, and a blade behind each.', [
      { lv: 3, name: 'A Thousand Faces', desc: 'Disguise Self always prepared; +3 Deception and Persuasion.', spells: ['disguise_self', 'charm_person'], wear: { skills: { deception: 3, persuasion: 3 } } },
      { lv: 6, name: 'Unseen Cue', desc: 'Your first weapon hit each moment deals an extra 2d6 psychic.', rider: { dice: [2, 6], type: 'psychic', perSec: 1 } },
      { lv: 10, name: 'Mirror Mask', desc: 'Mirror Image and Invisibility always prepared.', spells: ['mirror_image', 'invisibility'] },
      { lv: 14, name: 'Curtain Call', desc: 'Foes you defeat leave you unseen for a moment (temporary HP equal to your level).', onKill: { temp: 'level' } }]),
  },
  cleric: {
    life: SUB('Life Domain', 'SRD', 'The power of life, mending what is broken.', [
      { lv: 3, name: 'Disciple of Life', desc: 'Bless, Cure Wounds, Lesser Restoration, Spiritual Weapon always prepared; your healing spells heal more.', spells: ['bless', 'cure_wounds', 'lesser_restoration', 'spiritual_weapon', 'mass_healing_word', 'revivify', 'death_ward', 'guardian_of_faith', 'mass_cure_wounds', 'raise_dead'], healBonus: 2 },
      { lv: 6, name: 'Blessed Healer', desc: 'Healing others heals you a little too.', healSelf: 2 },
      { lv: 10, name: 'Divine Strike', desc: 'Your weapon hits deal an extra 1d8 radiant.', rider: { dice: [1, 8], type: 'radiant', perSec: 1 } },
      { lv: 14, name: 'Supreme Healing', desc: 'Your healing spells heal the most they can.', healMax: true }]),
    resonance: SUB('Resonance Domain', 'Eldenwood', 'You hear the Veil hum, and answer it.', [
      { lv: 3, name: 'Tuned Soul', desc: 'Shatter, Thunderwave, Silence, Sending always prepared; resistance to thunder.', spells: ['thunderwave', 'shatter', 'silence', 'sending', 'banishment', 'telekinesis'], wear: { resist: ['thunder'] } },
      { lv: 6, name: 'Harmonic Ward', desc: '+1 to all saving throws.', wear: { save: 1 } },
      { lv: 10, name: 'Dissonant Strike', desc: 'Your weapon hits deal an extra 1d8 thunder.', rider: { dice: [1, 8], type: 'thunder', perSec: 1 } },
      { lv: 14, name: 'The Veil\'s Echo', desc: 'You can\'t be charmed or frightened; truesight.', wear: { immune: ['charmed', 'frightened'], truesight: true } }]),
    lantern: SUB('Lantern Domain', 'Eldenwood', 'A light kept burning in the long dark.', [
      { lv: 3, name: 'Keeper of the Flame', desc: 'Light, Faerie Fire, Daylight, Guiding Bolt always prepared; you glow.', spells: ['light', 'faerie_fire', 'guiding_bolt', 'daylight', 'wall_of_fire', 'dawn'], wear: { light: true } },
      { lv: 6, name: 'Warding Glow', desc: 'Resistance to necrotic damage; undead near you burn.', wear: { resist: ['necrotic'] }, aura: { radiantVsUndead: 3 } },
      { lv: 10, name: 'Searing Blessing', desc: 'Your spells deal an extra 1d8 radiant to undead and fiends.', rider: { dice: [1, 8], type: 'radiant', spell: true, vs: ['undead', 'fiend'] } },
      { lv: 14, name: 'Unfailing Lantern', desc: 'Once a day, when you would fall, you stand at half your hit points instead.', deathWard: true }]),
  },
  druid: {
    land: SUB('Circle of the Land', 'SRD', 'Keeper of the old places and their magic.', [
      { lv: 3, name: 'Circle Spells', desc: 'Blur, Hold Person, Lightning Bolt, Blight always prepared.', spells: ['hold_person', 'spike_growth', 'lightning_bolt', 'blight', 'tree_stride'] },
      { lv: 6, name: 'Land\'s Stride', desc: 'Difficult ground and plants don\'t slow you; +10 speed.', wear: { speed: 10, freedom: true } },
      { lv: 10, name: 'Nature\'s Ward', desc: 'Resistance to poison; immunity to being poisoned.', wear: { resist: ['poison'], immune: ['poisoned'] } },
      { lv: 14, name: 'Nature\'s Sanctuary', desc: 'Beasts and plants hesitate to harm you: +2 AC.', wear: { ac: 2 } }]),
    bloomwarden: SUB('Circle of the Bloomwarden', 'Eldenwood', 'You tend the wild, and burn out the Bloom\'s rot.', [
      { lv: 3, name: 'Wardens\' Blooms', desc: 'Goodberry, Entangle, Lesser Restoration always prepared; your spells deal +1d6 radiant to aberrations.', spells: ['goodberry', 'entangle', 'lesser_restoration', 'plant_growth', 'freedom_of_movement'], rider: { dice: [1, 6], type: 'radiant', spell: true, vs: ['aberration', 'plant'] } },
      { lv: 6, name: 'Cleansing Sap', desc: 'Immune to disease and poison.', wear: { immune: ['poisoned'], resist: ['poison'] } },
      { lv: 10, name: 'Living Shield', desc: 'Barkskin always on: +2 AC.', wear: { ac: 2 } },
      { lv: 14, name: 'Heart of the Vale', desc: 'You regenerate steadily.', wear: { regen: 2 } }]),
    moonmarsh: SUB('Circle of the Moonlit Marsh', 'Eldenwood', 'The mist and the moon answer you.', [
      { lv: 3, name: 'Mire Magic', desc: 'Fog Cloud, Misty Step, Stinking Cloud always prepared; darkvision 60.', spells: ['fog_cloud', 'misty_step', 'stinking_cloud', 'blight'], wear: { darkvision: 60 } },
      { lv: 6, name: 'Marsh-Walker', desc: 'You breathe underwater and wade without slowing.', wear: { waterBreathing: true, freedom: true } },
      { lv: 10, name: 'Moonlit Venom', desc: 'Your spells deal an extra 1d8 poison.', rider: { dice: [1, 8], type: 'poison', spell: true } },
      { lv: 14, name: 'One with the Mist', desc: 'Resistance to cold and necrotic.', wear: { resist: ['cold', 'necrotic'] } }]),
  },
  fighter: {
    champion: SUB('Champion', 'SRD', 'Raw might honed to deadly perfection.', [
      { lv: 3, name: 'Improved Critical', desc: 'You crit on a 19 or 20.', crit: 19 },
      { lv: 7, name: 'Remarkable Athlete', desc: '+3 Athletics and Acrobatics; +5 speed.', wear: { skills: { athletics: 3, acrobatics: 3 }, speed: 5 } },
      { lv: 10, name: 'Heroic Warrior', desc: 'Defense: +1 AC.', wear: { ac: 1 } },
      { lv: 15, name: 'Superior Critical', desc: 'You crit on an 18, 19 or 20.', crit: 18 }]),
    watch: SUB('Warden of the Watch', 'Eldenwood', 'Stonebridge\'s watch: shield to the wall, eyes on the road.', [
      { lv: 3, name: 'Shield Wall', desc: '+1 AC; allies near you take less harm.', wear: { ac: 1 }, aura: { guard: 1 } },
      { lv: 7, name: 'Night Watch', desc: 'Darkvision 60 and +3 Perception.', wear: { darkvision: 60, skills: { perception: 3 } } },
      { lv: 10, name: 'Hold the Line', desc: 'You can\'t be knocked back; reduce every hit you take by 2.', hurt: { reduce: 2 } },
      { lv: 15, name: 'Captain\'s Command', desc: 'Your first hit each moment deals an extra 2d6.', rider: { dice: [2, 6], perSec: 1 } }]),
    runeblade: SUB('Runeblade', 'Eldenwood', 'Grom\'s craft: runes cut into steel, and into you.', [
      { lv: 3, name: 'Etched Steel', desc: 'Your weapon hits deal an extra 1d4 force.', rider: { dice: [1, 4], type: 'force' } },
      { lv: 7, name: 'Warding Rune', desc: 'Resistance to force and thunder.', wear: { resist: ['force', 'thunder'] } },
      { lv: 10, name: 'Rune of Return', desc: 'Defeating a foe gives you temporary HP equal to your level.', onKill: { temp: 'level' } },
      { lv: 15, name: 'Master Rune', desc: 'Your rune rider grows to 2d6.', rider: { dice: [2, 6], type: 'force' } }]),
  },
  monk: {
    openhand: SUB('Warrior of the Open Hand', 'SRD', 'Master of the unarmed strike.', [
      { lv: 3, name: 'Open Hand Technique', desc: 'Your hits knock foes off their feet (knockback) and slow them.', rider: { slow: 1.5, knock: 1 } },
      { lv: 6, name: 'Wholeness of Body', desc: 'You mend steadily.', wear: { regen: 1 } },
      { lv: 11, name: 'Fleet Step', desc: '+10 speed.', wear: { speed: 10 } },
      { lv: 17, name: 'Quivering Palm', desc: 'Your first hit each moment deals an extra 3d10 force.', rider: { dice: [3, 10], type: 'force', perSec: 1 } }]),
    stillwater: SUB('Way of the Still Water', 'Eldenwood', 'Calm as the lake that would not move.', [
      { lv: 3, name: 'Still Mind', desc: '+2 to Wisdom saves; you can\'t be frightened.', wear: { saves: { wis: 2 }, immune: ['frightened'] } },
      { lv: 6, name: 'Flowing Guard', desc: 'Reduce every hit you take by 2 while unarmored.', hurt: { reduce: 2, when: 'unarmored' } },
      { lv: 11, name: 'Water Breath', desc: 'You breathe water and move freely.', wear: { waterBreathing: true, freedom: true } },
      { lv: 17, name: 'The Lake Remembers', desc: 'Your hits deal an extra 2d8 cold.', rider: { dice: [2, 8], type: 'cold' } }]),
    echostep: SUB('Way of the Echo Step', 'Eldenwood', 'You move a heartbeat ahead of yourself.', [
      { lv: 3, name: 'Echo Strike', desc: 'Your first hit each moment strikes twice (an extra 1d6 force).', rider: { dice: [1, 6], type: 'force', perSec: 1 } },
      { lv: 6, name: 'Afterimage', desc: '+1 AC and +5 speed.', wear: { ac: 1, speed: 5 } },
      { lv: 11, name: 'Phase Step', desc: 'Misty Step always prepared.', spells: ['misty_step'] },
      { lv: 17, name: 'Echo of Ages', desc: 'Defeating a foe heals you 2d8.', onKill: { heal: [2, 8] } }]),
  },
  paladin: {
    devotion: SUB('Oath of Devotion', 'SRD', 'Honesty, courage, compassion, honour, duty.', [
      { lv: 3, name: 'Oath Spells', desc: 'Protection from Evil and Good, Sanctuary, Lesser Restoration, Zone of Truth always prepared.', spells: ['protection_from_evil_and_good', 'sanctuary', 'lesser_restoration', 'zone_of_truth', 'beacon_of_hope', 'dispel_magic'] },
      { lv: 7, name: 'Aura of Devotion', desc: 'You can\'t be charmed.', wear: { immune: ['charmed'] } },
      { lv: 15, name: 'Smite of Protection', desc: '+1 AC.', wear: { ac: 1 } },
      { lv: 3, name: 'Sacred Weapon', desc: 'Your weapon shines: +1d4 radiant on hits.', rider: { dice: [1, 4], type: 'radiant' } }]),
    veil: SUB('Oath of the Veil', 'Eldenwood', 'You swore to keep the Veil whole.', [
      { lv: 3, name: 'Veil Spells', desc: 'Protection from Evil and Good, Misty Step, Counterspell, Banishment always prepared.', spells: ['protection_from_evil_and_good', 'misty_step', 'counterspell', 'banishment'] },
      { lv: 7, name: 'Aura of the Threshold', desc: 'Resistance to necrotic and psychic.', wear: { resist: ['necrotic', 'psychic'] } },
      { lv: 15, name: 'Sealbreaker\'s Bane', desc: 'Your hits deal an extra 2d6 radiant to aberrations, fiends and undead.', rider: { dice: [2, 6], type: 'radiant', vs: ['aberration', 'fiend', 'undead'] } },
      { lv: 3, name: 'Truesight of the Sworn', desc: 'You see the hidden: +3 Insight and Perception.', wear: { skills: { insight: 3, perception: 3 } } }]),
    hearth: SUB('Oath of the Hearth', 'Eldenwood', 'For the farms, the inns, the little lights.', [
      { lv: 3, name: 'Hearth Spells', desc: 'Cure Wounds, Shield of Faith, Aid, Create Food and Water always prepared.', spells: ['cure_wounds', 'shield_of_faith', 'aid', 'create_food_and_water'] },
      { lv: 7, name: 'Aura of Warmth', desc: 'Allies near you mend slowly; resistance to cold.', aura: { heal: 1 }, wear: { resist: ['cold'] } },
      { lv: 15, name: 'Home Ground', desc: '+2 AC.', wear: { ac: 2 } },
      { lv: 3, name: 'Hearthfire', desc: 'Your hits deal an extra 1d4 fire.', rider: { dice: [1, 4], type: 'fire' } }]),
  },
  ranger: {
    hunter: SUB('Hunter', 'SRD', 'A guardian against the terrors of the wild.', [
      { lv: 3, name: 'Colossus Slayer', desc: 'Your first hit each moment on a wounded foe deals an extra 1d8.', rider: { dice: [1, 8], perSec: 1, wounded: true } },
      { lv: 7, name: 'Defensive Tactics', desc: '+1 AC.', wear: { ac: 1 } },
      { lv: 11, name: 'Volley', desc: 'Your arrows strike harder: +1d6.', rider: { dice: [1, 6], ranged: true } },
      { lv: 15, name: 'Superior Defense', desc: 'Reduce every hit you take by 3.', hurt: { reduce: 3 } }]),
    thornstalker: SUB('Thornstalker', 'Eldenwood', 'You hunt in the Razorwood\'s bramble.', [
      { lv: 3, name: 'Barbed Shots', desc: 'Your hits slow foes; Hail of Thorns always prepared.', rider: { slow: 2 }, spells: ['hail_of_thorns', 'ensnaring_strike'] },
      { lv: 7, name: 'Bramble Cloak', desc: '+3 Stealth; plants don\'t slow you.', wear: { skills: { stealth: 3 }, freedom: true } },
      { lv: 11, name: 'Thornburst', desc: 'Your hits deal an extra 1d8 piercing.', rider: { dice: [1, 8], type: 'piercing' } },
      { lv: 15, name: 'Heart of the Thicket', desc: 'Resistance to poison and piercing.', wear: { resist: ['poison', 'piercing'] } }]),
    beastbond: SUB('Beastbond', 'Eldenwood', 'A beast walks with you, and you with it.', [
      { lv: 3, name: 'Animal Companion', desc: 'Find Familiar and Find Steed always prepared; +3 Animal Handling.', spells: ['find_familiar', 'find_steed'], wear: { skills: { animal: 3 } } },
      { lv: 7, name: 'Pack Tactics', desc: 'Your hits deal an extra 1d6 when an ally is near.', rider: { dice: [1, 6], ally: true } },
      { lv: 11, name: 'Shared Senses', desc: 'Darkvision 60, +3 Perception.', wear: { darkvision: 60, skills: { perception: 3 } } },
      { lv: 15, name: 'Unbreakable Bond', desc: 'Reduce every hit you take by 2.', hurt: { reduce: 2 } }]),
  },
  rogue: {
    thief: SUB('Thief', 'SRD', 'Quick hands, quicker feet.', [
      { lv: 3, name: 'Fast Hands', desc: '+3 Sleight of Hand; you climb as fast as you walk.', wear: { skills: { sleight: 3 }, climb: true } },
      { lv: 9, name: 'Supreme Sneak', desc: '+5 Stealth.', wear: { skills: { stealth: 5 } } },
      { lv: 13, name: 'Use Magic Device', desc: 'You can attune to a fourth magic item.', attune: 1 },
      { lv: 17, name: 'Thief\'s Reflexes', desc: '+10 speed and +1 AC.', wear: { speed: 10, ac: 1 } }]),
    shadowmarked: SUB('Shadowmarked', 'Eldenwood', 'The Shadowfell left its mark on you, and you use it.', [
      { lv: 3, name: 'Shade-Step', desc: 'Darkvision 120; Darkness and Misty Step always prepared.', wear: { darkvision: 120 }, spells: ['misty_step', 'darkness'] },
      { lv: 9, name: 'Umbral Strike', desc: 'Your sneak attacks deal an extra 2d6 necrotic.', rider: { dice: [2, 6], type: 'necrotic', sneak: true } },
      { lv: 13, name: 'Veil-Touched', desc: 'Resistance to necrotic and psychic.', wear: { resist: ['necrotic', 'psychic'] } },
      { lv: 17, name: 'One with Shadow', desc: 'Defeating a foe leaves you unseen (temporary HP equal to your level).', onKill: { temp: 'level' } }]),
    smuggler: SUB('Smuggler of Saltwind', 'Eldenwood', 'Every cove has a secret, and you know them all.', [
      { lv: 3, name: 'Silver Tongue, Quick Blade', desc: '+3 Deception and Persuasion; 10% off at every shop.', wear: { skills: { deception: 3, persuasion: 3 } }, discount: 0.1 },
      { lv: 9, name: 'Sea Legs', desc: 'You breathe water and swim freely; +5 speed.', wear: { waterBreathing: true, speed: 5 } },
      { lv: 13, name: 'Dirty Fighting', desc: 'Your first hit each moment deals an extra 2d6.', rider: { dice: [2, 6], perSec: 1 } },
      { lv: 17, name: 'Contraband', desc: '+1 AC; resistance to poison.', wear: { ac: 1, resist: ['poison'] } }]),
  },
  sorcerer: {
    draconic: SUB('Draconic Sorcery', 'SRD', 'Dragon blood sings in your veins.', [
      { lv: 3, name: 'Draconic Resilience', desc: '+1 hit point per level; +1 AC (scales).', wear: { ac: 1 }, hpPerLevel: 1 },
      { lv: 6, name: 'Elemental Affinity', desc: 'Your spells deal an extra 1d6 fire; resistance to fire.', rider: { dice: [1, 6], type: 'fire', spell: true }, wear: { resist: ['fire'] } },
      { lv: 14, name: 'Dragon Wings', desc: 'You can fly.', wear: { fly: true } },
      { lv: 18, name: 'Dragon Companion', desc: 'Summon Dragon always prepared.', spells: ['summon_dragon'] }]),
    bloomtouched: SUB('Bloom-Touched Sorcery', 'Eldenwood', 'The Bloom brushed you, and you took something back.', [
      { lv: 3, name: 'Black Petals', desc: 'Your spells deal an extra 1d4 necrotic; resistance to necrotic.', rider: { dice: [1, 4], type: 'necrotic', spell: true }, wear: { resist: ['necrotic'] } },
      { lv: 6, name: 'Draining Bloom', desc: 'Your spells heal you a little when they hurt.', drain: true },
      { lv: 14, name: 'Thornheart', desc: 'Those who strike you are pricked by thorns.', hurt: { thorns: [1, 6] } },
      { lv: 18, name: 'Full Bloom', desc: 'Your necrotic rider grows to 2d8.', rider: { dice: [2, 8], type: 'necrotic', spell: true } }]),
    crystal: SUB('Crystal Sorcery', 'Eldenwood', 'Lumina\'s crystal grows in you.', [
      { lv: 3, name: 'Faceted Skin', desc: '+1 AC; resistance to radiant; you glow.', wear: { ac: 1, resist: ['radiant'], light: true } },
      { lv: 6, name: 'Prism', desc: 'Your spells deal an extra 1d6 radiant.', rider: { dice: [1, 6], type: 'radiant', spell: true } },
      { lv: 14, name: 'Refraction', desc: 'Reduce every hit you take by 3.', hurt: { reduce: 3 } },
      { lv: 18, name: 'Crystal Heart', desc: 'Prismatic Spray always prepared.', spells: ['prismatic_spray'] }]),
  },
  warlock: {
    fiend: SUB('Fiend Patron', 'SRD', 'A pact with a lord of the lower planes.', [
      { lv: 3, name: 'Dark One\'s Blessing', desc: 'Defeating a foe gives you temporary HP equal to your level; Burning Hands, Command, Scorching Ray always prepared.', onKill: { temp: 'level' }, spells: ['burning_hands', 'command', 'scorching_ray', 'fireball', 'fire_shield'] },
      { lv: 6, name: 'Dark One\'s Own Luck', desc: '+2 to all saving throws.', wear: { save: 2 } },
      { lv: 10, name: 'Fiendish Resilience', desc: 'Resistance to fire and poison.', wear: { resist: ['fire', 'poison'] } },
      { lv: 14, name: 'Hurl Through Hell', desc: 'Your spells deal an extra 2d10 fire.', rider: { dice: [2, 10], type: 'fire', spell: true, perSec: 2 } }]),
    watcher: SUB('The Watcher', 'Eldenwood', 'The white-eyed one who is always just out of sight. He sees you. You see a little of what he sees.', [
      { lv: 3, name: 'Eyes in the Dark', desc: 'Darkvision 120; See Invisibility and Detect Thoughts always prepared.', wear: { darkvision: 120 }, spells: ['see_invisibility', 'detect_thoughts', 'clairvoyance', 'arcane_eye'] },
      { lv: 6, name: 'Unblinking', desc: 'Truesight; you can\'t be surprised.', wear: { truesight: true } },
      { lv: 10, name: 'He Is Behind You', desc: 'Your spells deal an extra 2d6 psychic.', rider: { dice: [2, 6], type: 'psychic', spell: true } },
      { lv: 14, name: 'Gone When You Look', desc: 'Defeating a foe heals you 3d8.', onKill: { heal: [3, 8] } }]),
    verdant: SUB('The Verdant Whisperers', 'Eldenwood', 'The ancient treefolk lend you their slow, terrible strength.', [
      { lv: 3, name: 'Bark Pact', desc: '+1 AC; Entangle, Barkskin, Plant Growth always prepared.', wear: { ac: 1 }, spells: ['entangle', 'barkskin', 'plant_growth', 'grasping_vine'] },
      { lv: 6, name: 'Sap of Ages', desc: 'You mend steadily.', wear: { regen: 1 } },
      { lv: 10, name: 'Root and Branch', desc: 'Resistance to poison and bludgeoning.', wear: { resist: ['poison', 'bludgeoning'] } },
      { lv: 14, name: 'Wrath of the Wilds', desc: 'Your spells deal an extra 2d8 piercing as thorns burst from the ground.', rider: { dice: [2, 8], type: 'piercing', spell: true, slow: 2 } }]),
  },
  wizard: {
    evoker: SUB('Evoker', 'SRD', 'Magic as raw force.', [
      { lv: 3, name: 'Potent Cantrip', desc: 'Your cantrips hit harder (+1d6).', rider: { dice: [1, 6], spell: true, cantrip: true } },
      { lv: 6, name: 'Sculpt Spells', desc: '+1 to your spell save DC.', wear: { spellDC: 1 } },
      { lv: 10, name: 'Empowered Evocation', desc: 'Your spells deal extra damage equal to your Intelligence modifier.', rider: { intMod: true, spell: true } },
      { lv: 14, name: 'Overchannel', desc: '+1 to spell attacks and DC.', wear: { spellDC: 1, spellAttack: 1 } }]),
    resonance: SUB('School of Resonance', 'Eldenwood', 'Lyra\'s art: magic as sound, sound as the Veil.', [
      { lv: 3, name: 'Tuning', desc: 'Your spells deal an extra 1d6 thunder; Thunderwave and Shatter always prepared.', rider: { dice: [1, 6], type: 'thunder', spell: true }, spells: ['thunderwave', 'shatter'] },
      { lv: 6, name: 'Counter-Harmony', desc: 'Counterspell and Dispel Magic always prepared; +1 spell DC.', spells: ['counterspell', 'dispel_magic'], wear: { spellDC: 1 } },
      { lv: 10, name: 'Resonant Ward', desc: 'Resistance to thunder and force.', wear: { resist: ['thunder', 'force'] } },
      { lv: 14, name: 'The Harmonic Tuner', desc: 'Your thunder rider grows to 2d8.', rider: { dice: [2, 8], type: 'thunder', spell: true } }]),
    wardcraft: SUB('School of Wardcraft', 'Eldenwood', 'Seals, sigils and the art of keeping things shut.', [
      { lv: 3, name: 'Arcane Ward', desc: 'A ward soaks harm: reduce every hit you take by 2; Shield and Alarm always prepared.', hurt: { reduce: 2 }, spells: ['shield', 'alarm', 'glyph_of_warding'] },
      { lv: 6, name: 'Projected Ward', desc: 'Allies near you take less harm.', aura: { guard: 1 } },
      { lv: 10, name: 'Sealwright', desc: '+1 AC and +2 to all saves.', wear: { ac: 1, save: 2 } },
      { lv: 14, name: 'Spell Resistance', desc: 'Resistance to force and psychic; reduce hits by 4.', wear: { resist: ['force', 'psychic'] }, hurt: { reduce: 2 } }]),
  },
};
// the subclasses someone has, and the features they've grown into
function dndSubsOf(c) { return c.subs || (c.subs = {}); }
function dndSubFeatures(c) {
  const out = [], subs = c.subs || {};
  for (const [cls, id] of Object.entries(subs)) {
    const S = DND_SUBCLASSES[cls] && DND_SUBCLASSES[cls][id]; if (!S) continue;
    const lv = typeof dndClassLevel === 'function' ? dndClassLevel(c, cls) : c.level;
    for (const F of S.feats) if (lv >= F.lv) out.push(F);
  }
  return out;
}
function dndSubSpells(c) {
  const out = [], subs = c.subs || {};
  for (const [cls, id] of Object.entries(subs)) {
    const S = DND_SUBCLASSES[cls] && DND_SUBCLASSES[cls][id]; if (!S) continue;
    const lv = typeof dndClassLevel === 'function' ? dndClassLevel(c, cls) : c.level;
    const half = cls === 'paladin' || cls === 'ranger', none = ['barbarian', 'fighter', 'monk', 'rogue'].includes(cls);
    const maxL = none ? Math.min(4, Math.floor((lv - 1) / 4)) : half ? Math.min(5, Math.ceil(lv / 4)) : Math.min(9, Math.ceil(lv / 2));
    for (const F of S.feats) if (lv >= F.lv && F.spells) for (const k of F.spells) { const sp = DND_SPELLS[k]; if (sp && sp.lvl <= maxL) out.push(k); }
  }
  return out;
}
{
  // crits, hit points, attunement slots, shop discounts, from the features
  const baseDerive = dndDerive;
  dndDerive = function (c, inv) {
    const d = baseDerive(c, inv); if (!d) return d;
    for (const F of dndSubFeatures(c)) {
      if (F.crit) d.crit = Math.min(d.crit || 20, F.crit);
      if (F.discount) d.discount = Math.max(d.discount || 0, F.discount);
    }
    return d;
  };
  const baseHp = dndMaxHp;
  dndMaxHp = function (c) {
    let hp = baseHp(c);
    for (const F of dndSubFeatures(c)) if (F.hpPerLevel) hp += F.hpPerLevel * (typeof dndClassLevel === 'function' ? dndClassLevel(c, Object.keys(c.subs || {}).find(k => DND_SUBCLASSES[k][c.subs[k]].feats.includes(F)) || c.cls) : c.level);
    return hp;
  };
  if (typeof DND_ATTUNE_MAX !== 'undefined' && typeof dndCanAttune === 'function') {
    const baseCan = dndCanAttune;
    dndCanAttune = function (c, ...a) { const extra = dndSubFeatures(c).some(F => F.attune); if (!extra) return baseCan(c, ...a); const was = c.attuned; if (was && was.length === DND_ATTUNE_MAX) { c.attuned = was.slice(1); try { return baseCan(c, ...a); } finally { c.attuned = was; } } return baseCan(c, ...a); };
  }
  // the riders on your hits
  const baseAtk = dndAttack;
  dndAttack = function (lp, e, W, o = {}) {
    const res = baseAtk(lp, e, W, o);
    if (!res || !res.hit) return res;
    try { dndSubRiders(lp, e, res, false, W); } catch (err) { /* plain hit */ }
    return res;
  };
  // and on your spells
  const baseSpellHit = dndSpellHit;
  dndSpellHit = function (lp, e, dmg, type, extra = {}) {
    if (lp && lp.player && dmg > 0 && !extra._sub) {
      try { const res = { dmg, crit: false, parts: [] }; dndSubRiders(lp, e, res, true, null, type); dmg = res.dmg; } catch (err) { /* plain */ }
    }
    const r = baseSpellHit(lp, e, dmg, type, extra);
    try { const c = dndOf(lp.player); if (c && r > 0 && dndSubFeatures(c).some(F => F.drain)) dndHeal(lp, Math.max(1, Math.floor(r / 4))); } catch (err) { /* no drain */ }
    return r;
  };
}
function dndSubRiders(lp, e, res, spell, W, stype) {
  const c = dndOf(lp.player); if (!c) return;
  const g = lp.g, now = g.time;
  for (const F of dndSubFeatures(c)) {
    const R = F.rider; if (!R) continue;
    if (!!R.spell !== spell) continue;
    if (R.when && !dndSubWhen(c, R.when)) continue;
    if (R.cantrip && !(lp._dndSpell && DND_SPELLS[lp._dndSpell] && DND_SPELLS[lp._dndSpell].lvl === 0)) continue;
    if (R.vs && !R.vs.includes(dndCType(e))) continue;
    if (R.ranged && !(W && W.ranged)) continue;
    if (R.wounded && !(e.health < (e.maxHealth || e.T.hp || 1))) continue;
    if (R.ally && !(typeof dndAllyNear === 'function' && dndAllyNear(lp, e))) continue;
    if (R.sneak && !(res.parts || []).includes('sneak')) continue;
    if (R.perSec) { const k = '_subT_' + F.name; if ((lp[k] || 0) > now) continue; lp[k] = now + R.perSec; }
    let add = 0;
    if (R.dice) add += dndRoll(R.dice[0] * (res.crit ? 2 : 1), R.dice[1]).total;
    if (R.intMod && c.d) add += Math.max(0, c.d.mods.int);
    if (add) { const t = R.type || (W && W.dmg) || stype || 'force'; res.dmg += Math.round(add * dndMobTakes(e, t)); (res.parts || (res.parts = [])).push(F.name); }
    if (R.slow) e.slowT = Math.max(e.slowT || 0, R.slow);
    if (R.burn && !(e.T && e.T.fireImmune)) e.burn = Math.max(e.burn || 0, 3);
    if (R.knock) { const p = lp.player, dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1; e.vx += dx / d * 6 * R.knock; e.vz += dz / d * 6 * R.knock; e.vy += 2.5 * R.knock; }
    if (R.weaken) e.dndWeakT = 6;
  }
}
{
  // what happens when you're hit
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    try {
      const c = dndOf(this.player);
      if (c && amount > 0) {
        let red = 0;
        for (const F of dndSubFeatures(c)) {
          const H = F.hurt; if (!H) continue;
          if (H.when && !dndSubWhen(c, H.when)) continue;
          if (H.reduce) red += H.reduce;
          const at = src.attacker && src.attacker instanceof Mob ? src.attacker : null;
          if (at && Math.hypot(at.x - this.player.x, at.z - this.player.z) < 3) {
            if (H.retaliate) dndSpellHit(this, at, dndRoll(1, 8).total + (c.d ? c.d.mods.str : 0), 'slashing', { _sub: true });
            if (H.burnBack) { at.burn = Math.max(at.burn || 0, 3); dndSpellHit(this, at, dndRoll(1, 6).total, 'fire', { _sub: true }); }
            if (H.thorns) dndSpellHit(this, at, dndRoll(H.thorns[0], H.thorns[1]).total, 'piercing', { _sub: true });
          }
        }
        if (src.dndFromWeak) red += 2;
        if (red) amount = Math.max(1, amount - red);
        // the Lantern's last light
        if (dndSubFeatures(c).some(F => F.deathWard) && this.player.health - amount <= 0 && !(c._lanternDay === Math.floor(this.g.meta.day || 0))) { c._lanternDay = Math.floor(this.g.meta.day || 0); this.player.health = Math.ceil(this.player.maxHealth / 2); this.toast('Unfailing Lantern: the light holds you up', 'epic'); return 0; }
      }
    } catch (e) { /* plain harm */ }
    return baseHurt.call(this, amount, src);
  };
  // defeating a foe
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    try {
      const lp = src && src.attacker && src.attacker.player ? src.attacker : null, c = lp && dndOf(lp.player);
      if (c) for (const F of dndSubFeatures(c)) {
        if (!F.onKill) continue;
        if (F.onKill.temp) c.tempHp = Math.max(c.tempHp || 0, F.onKill.temp === 'level' ? c.level : F.onKill.temp);
        if (F.onKill.heal) dndHeal(lp, dndRoll(F.onKill.heal[0], F.onKill.heal[1]).total);
      }
    } catch (e) { /* no reward */ }
    return baseDie.call(this, src);
  };
  // auras: heal allies, guard them, frighten foes, burn undead (every two seconds)
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseUpd.call(this, dt, inp);
    try {
      this._auraT = (this._auraT || 0) - dt;
      if (this._auraT <= 0) {
        this._auraT = 2;
        const c = dndOf(this.player), g = this.g, p = this.player;
        if (c && !p.dead) {
          c._hpFrac = p.health / (p.maxHealth || 1);
          // someone of 3rd level or more without a subclass is asked to choose one
          if (typeof dndClassesOf === 'function') for (const cls of dndClassesOf(c)) if (DND_SUBCLASSES[cls] && dndClassLevel(c, cls) >= 3 && !(c.subs && c.subs[cls]) && !(c.pending || []).some(P => P.type === 'subclass' && P.cls === cls)) { (c.pending || (c.pending = [])).push({ type: 'subclass', cls, level: dndClassLevel(c, cls) }); this.toast('A new choice: your subclass (your sheet, P)', 'epic'); dndHudDirty(this); }
          for (const F of dndSubFeatures(c)) {
            const A = F.aura; if (!A) continue;
            if (A.heal) for (const l of g.locals) if (l !== this && !l.player.dead && Math.hypot(l.player.x - p.x, l.player.z - p.z) < 6 && l.player.health < l.player.maxHealth) dndHeal(l, A.heal);
            if (A.fear && c.conds.rage > 0) for (const e of dndHostilesNear(g, p.x, p.y + 1, p.z, A.fear, this)) if (Math.random() < 0.25 && !dndMobSave(e, 'wis', 8 + c.d.prof + c.d.mods.cha).ok) e.dndFear = { from: p, t: 3 };
            if (A.radiantVsUndead) for (const e of dndHostilesNear(g, p.x, p.y + 1, p.z, A.radiantVsUndead, this)) if (dndCType(e) === 'undead') dndSpellHit(this, e, dndRoll(1, 6).total, 'radiant', { _sub: true });
            if (A.guard) for (const l of g.locals) if (l !== this && Math.hypot(l.player.x - p.x, l.player.z - p.z) < 5) l._guardedT = 2.5;
          }
        }
      }
      if (this._guardedT > 0) this._guardedT -= dt;
    } catch (e) { /* no aura */ }
    return r;
  };
  const baseHurt2 = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) { if (this._guardedT > 0 && amount > 1) amount -= 1; if (src.attacker && src.attacker.dndWeakT > 0 && amount > 1) amount = Math.max(1, amount - 2); return baseHurt2.call(this, amount, src); };
  const baseMU = Mob.prototype.update;
  Mob.prototype.update = function (dt) { if (this.dndWeakT > 0) this.dndWeakT -= dt; return baseMU.call(this, dt); };
}
// the healing domain's extra
{
  const baseHeal = dndHeal;
  dndHeal = function (lp, n, from) {
    try {
      if (!(from && from.player) && DND_CUR && DND_CUR.lp) from = DND_CUR.lp;
      const c = from && from.player ? dndOf(from.player) : null;
      if (c && n > 0) { for (const F of dndSubFeatures(c)) { if (F.healBonus) n += F.healBonus + (lp !== from ? 1 : 0); } if (lp !== from) for (const F of dndSubFeatures(c)) if (F.healSelf) baseHeal(from, F.healSelf); }
    } catch (e) { /* plain healing */ }
    return baseHeal(lp, n, from);
  };
}
// choosing one
function dndOpenSubclass(lp, P) {
  const c = dndLive(lp); if (!c) return;
  const list = DND_SUBCLASSES[P.cls]; if (!list) { c.pending.shift(); return; }
  dndOpenPicker(lp, {
    title: `${DND_CLASSES[P.cls].name}: choose your subclass`, status: 'This shapes the rest of your path in the class',
    rows: () => Object.entries(list).map(([k, S]) => ({ id: k, label: `${S.name}${S.src === 'SRD' ? '' : ' ✦'}`, sub: S.blurb + ' ' + S.feats.slice().sort((a, b) => a.lv - b.lv).map(F => `${F.lv}: ${F.name}, ${F.desc}`).join(' · ') })),
    pick: (r) => {
      dndSubsOf(c)[P.cls] = r.id; c.pending.shift();
      dndDerive(c, lp.player.inv); lp.player.recalcMax && lp.player.recalcMax(); dndHudDirty(lp);
      lp.toast(`You follow the ${list[r.id].name}`, 'epic');
      return true;
    },
    hint: '✦ Eldenwood\'s own · A to choose · B to decide later',
    onClose: () => setTimeout(() => lp.mode === 'play' && !lp.npcUI && lp.openDndSheet && lp.openDndSheet(), 30),
  });
}
// on the sheet: your subclasses and what they give you
{
  const baseOpen = LocalPlayer.prototype.openDndSheet;
  if (baseOpen) LocalPlayer.prototype.openDndSheet = function (...a) {
    const r = baseOpen.apply(this, a);
    try {
      const c = dndOf(this.player), el = this.el && this.el.querySelector('.dnd-sheet .ds-prog');
      if (c && el && c.subs && Object.keys(c.subs).length && !this.el.querySelector('.ds-subs')) {
        const div = document.createElement('div'); div.className = 'ds-subs';
        div.innerHTML = Object.entries(c.subs).map(([cls, id]) => { const S = DND_SUBCLASSES[cls] && DND_SUBCLASSES[cls][id]; if (!S) return ''; const lv = dndClassLevel(c, cls); return `<div class="ds-sub"><b>${S.name}</b> <span class="muted">(${DND_CLASSES[cls].name})</span><div class="muted">${S.feats.slice().sort((x, y) => x.lv - y.lv).map(F => `<span class="${lv >= F.lv ? 'ds-on' : 'ds-off'}">${F.lv}: ${F.name}</span>`).join(' · ')}</div></div>`; }).join('');
        el.after(div);
      }
    } catch (e) { /* plain sheet */ }
    return r;
  };
}

// ---- the towns' backgrounds ------------------------------------------------------------------------------------------------
Object.assign(DND_BACKGROUNDS, {
  stonebridge_guard: { name: 'Stonebridge Guard', abs: ['str', 'con', 'wis'], skills: ['athletics', 'perception'], feat: 'Alert', gold: 12, kit: ['healers_kit'], desc: 'You stood the palisade watch at Stonebridge, and you know every face that passes the east gate.' },
  oakhaven_woodcutter: { name: 'Oakhaven Woodcutter', abs: ['str', 'dex', 'con'], skills: ['athletics', 'nature'], feat: 'Tough', gold: 10, kit: ['rope'], desc: 'You felled oak at the forest\'s edge, and learned which trees to leave standing.' },
  stillwater_fisher: { name: 'Stillwater Fisher', abs: ['dex', 'con', 'wis'], skills: ['survival', 'insight'], feat: 'Lucky', gold: 9, kit: ['fishing_rod'], desc: 'You fished the still lake before it went quiet. You were away the day it happened.' },
  cinderfall_miner: { name: 'Cinderfall Miner', abs: ['str', 'con', 'int'], skills: ['athletics', 'investigation'], feat: 'Crafter', gold: 14, kit: ['iron_pickaxe'], desc: 'You dug the glowing seams at Cinderfall until the crystals started to sing.' },
});
DND_BACKGROUND_ORDER.push('stonebridge_guard', 'oakhaven_woodcutter', 'stillwater_fisher', 'cinderfall_miner');

// ---- conditions on the HUD: every one you're under, with how long it has left -------------------------------------------
const DND_COND_SHOW = {
  rage: ['🔥', 'Raging'], bless: ['✚', 'Blessed'], bane: ['✖', 'Baned'], haste: ['»', 'Hasted'], slow: ['«', 'Slowed'], slowed: ['«', 'Slowed'],
  poisoned: ['☠', 'Poisoned'], frightened: ['!', 'Frightened'], charmed: ['♥', 'Charmed'], stunned: ['✷', 'Stunned'], blinded: ['◌', 'Blinded'],
  prone: ['▁', 'Prone'], restrained: ['⛓', 'Restrained'], paralyzed: ['✷', 'Paralyzed'], invisible: ['◇', 'Invisible'], hidden: ['◐', 'Hidden'],
  barkskin: ['❦', 'Barkskin'], shield: ['⛨', 'Shield'], mage_armor: ['⛨', 'Mage Armor'], shield_of_faith: ['⛨', 'Shield of Faith'], sanctuary: ['☼', 'Sanctuary'],
  smite: ['⚔', 'Strike ready'], bardic: ['♪', 'Inspired'], rooted: ['❦', 'Rooted'], fly: ['⇡', 'Flying'], gaseous: ['☁', 'Gaseous'], blur: ['≋', 'Blurred'],
  mirror_image: ['⧉', 'Mirror images'], heroism: ['★', 'Heroism'], aid: ['✚', 'Aided'], protect_evil: ['☼', 'Warded'], freedom: ['∞', 'Free movement'],
  water_breathing: ['≈', 'Water breathing'], darkvision: ['◑', 'Darkvision'], see_invis: ['◎', 'See invisible'], death_ward: ['☥', 'Death Ward'], exhaustion: ['z', 'Exhausted'],
  dodge: ['↯', 'Dodging'], hunted: ['◎', 'Hunter\'s Mark'], hexed: ['✦', 'Hex'], deafened: ['∅', 'Deafened'], grappled: ['✊', 'Grappled'], incapacitated: ['✷', 'Incapacitated'],
};
const DND_COND_BAD = new Set(['bane', 'slow', 'slowed', 'poisoned', 'frightened', 'charmed', 'stunned', 'blinded', 'prone', 'restrained', 'paralyzed', 'exhaustion', 'deafened', 'grappled', 'incapacitated']);
{
  const baseFrame = Hud.prototype.frame;
  Hud.prototype.frame = function (dt, cam) {
    const r = baseFrame.call(this, dt, cam);
    try {
      if ((this._condT = (this._condT || 0) - dt) > 0) return r;
      this._condT = 0.25;
      const lp = this.lp, c = lp && dndOf(lp.player), host = this._dndEl; if (!c || !host) return r;
      let el = this._condEl;
      if (!el || !el.isConnected) { el = this._condEl = document.createElement('div'); el.className = 'dh-conds'; host.appendChild(el); }
      const out = [];
      for (const [k, v] of Object.entries(c.conds || {})) {
        if (!v || k.startsWith('_') || k === 'potion_ab') continue;
        const [ic, name] = DND_COND_SHOW[k] || ['•', k.replace(/_/g, ' ').replace(/^./, m => m.toUpperCase())];
        const t = typeof v === 'number' ? v : (v && typeof v.t === 'number' ? v.t : null);
        out.push(`<span class="dh-cond${DND_COND_BAD.has(k) ? ' bad' : ''}" title="${name}"><i>${ic}</i>${name}${t != null && t < 600 ? ` <em>${Math.ceil(t)}s</em>` : ''}</span>`);
      }
      const html = out.join('');
      if (html !== this._condHtml) { this._condHtml = html; el.innerHTML = html; }
    } catch (e) { /* no chips */ }
    return r;
  };
}
