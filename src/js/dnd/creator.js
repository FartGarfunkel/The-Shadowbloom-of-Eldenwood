// ---------------------------------------------------------------------------
// dnd/creator.js — making a character: species, class, origin, ability scores,
// skills, looks and name, with the hero standing beside it as you go.
//
// It opens in each player's own view the first time they enter a world without a
// character (split-screen players each make theirs with their own controller), and
// from the title screen's Heroes button to make one ahead of time. Mouse, keyboard
// and controller all work: d-pad / stick up and down to move, left and right to
// change a value, A to press, LB / RB to change page, B to go back a page.
// ---------------------------------------------------------------------------

const CR_STEPS = [['species', 'Species'], ['class', 'Class'], ['origin', 'Origin'], ['abilities', 'Abilities'], ['skills', 'Skills'], ['looks', 'Looks'], ['name', 'Name']];
// the abilities each class leans on, best first (for the suggested array)
const CR_PRIORITY = {
  barbarian: ['str', 'con', 'dex', 'wis', 'cha', 'int'], bard: ['cha', 'dex', 'con', 'wis', 'int', 'str'], cleric: ['wis', 'con', 'str', 'cha', 'dex', 'int'], druid: ['wis', 'con', 'dex', 'int', 'cha', 'str'],
  fighter: ['str', 'con', 'dex', 'wis', 'cha', 'int'], monk: ['dex', 'wis', 'con', 'str', 'int', 'cha'], paladin: ['str', 'cha', 'con', 'wis', 'dex', 'int'], ranger: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
  rogue: ['dex', 'con', 'int', 'wis', 'cha', 'str'], sorcerer: ['cha', 'con', 'dex', 'wis', 'int', 'str'], warlock: ['cha', 'con', 'dex', 'wis', 'int', 'str'], wizard: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
};
const CR_BG_FOR = { barbarian: 'woodwarden', bard: 'minstrel', cleric: 'acolyte', druid: 'woodwarden', fighter: 'soldier', monk: 'hermit_bg', paladin: 'noble_born', ranger: 'woodwarden', rogue: 'criminal', sorcerer: 'wayfarer', warlock: 'sage', wizard: 'sage' };

class DndCreator {
  constructor(host, o = {}) {
    this.o = o; this.lp = o.lp || null; this.g = o.g || (this.lp && this.lp.g) || GAME; this.host = host;
    const prev = o.from || null;
    this.s = prev ? JSON.parse(JSON.stringify(prev)) : { species: 'human', lineage: null, cls: 'fighter', bg: 'soldier', method: 'array', vals: DND_STANDARD_ARRAY.slice(), buy: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }, plus: null, skills: [], name: dndRandomName('human'), look: null, step: 0 };
    if (!this.s.look) this.s.look = dndDefaultLook(this.s.species, this.s.cls);
    if (!this.s.assign) this.suggest();
    if (!this.s.plus) this.defaultPlus();
    this.view = 0; this.sel = 0;
    const el = this.el = document.createElement('div');
    el.className = 'dnd-creator' + (o.compact ? ' compact' : '');
    el.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    el.addEventListener('keydown', (ev) => ev.stopPropagation());
    host.appendChild(el);
    this.draw();
  }
  // ---- the numbers ----
  suggest() {
    const pr = CR_PRIORITY[this.s.cls] || DND_ABILITIES, vals = (this.s.method === 'roll' && this.s.rolled ? this.s.rolled : DND_STANDARD_ARRAY).slice().sort((a, b) => b - a);
    this.s.assign = {}; pr.forEach((a, i) => { this.s.assign[a] = vals[i]; });
  }
  defaultPlus() {
    const Bg = DND_BACKGROUNDS[this.s.bg], pr = CR_PRIORITY[this.s.cls] || DND_ABILITIES;
    const order = Bg.abs.slice().sort((a, b) => pr.indexOf(a) - pr.indexOf(b));
    this.s.plus = { [order[0]]: 2, [order[1]]: 1 };
  }
  base() {
    if (this.s.method === 'buy') return Object.assign({}, this.s.buy);
    return Object.assign({}, this.s.assign);
  }
  final() { const b = this.base(), out = {}; for (const a of DND_ABILITIES) out[a] = Math.min(20, (b[a] || 8) + (this.s.plus[a] || 0)); return out; }
  pointsLeft() { return 27 - DND_ABILITIES.reduce((n, a) => n + DND_POINT_COST[this.s.buy[a]], 0); }
  skillSlots() { const C = DND_CLASSES[this.s.cls], Sp = DND_SPECIES[this.s.species]; return C.skillN + (Sp.extraSkill || 0); }
  fixedSkills() { const Bg = DND_BACKGROUNDS[this.s.bg], Sp = DND_SPECIES[this.s.species]; return [...new Set([...Bg.skills, ...(Sp.skills || [])])]; }
  pruneSkills() { const fixed = this.fixedSkills(), C = DND_CLASSES[this.s.cls]; this.s.skills = this.s.skills.filter(k => !fixed.includes(k) && (C.skillsFrom.includes(k) || DND_SPECIES[this.s.species].extraSkill)).slice(0, this.skillSlots()); }
  autoSkills() {
    const C = DND_CLASSES[this.s.cls], fixed = this.fixedSkills(), ab = this.final();
    const pool = C.skillsFrom.filter(k => !fixed.includes(k)).sort((a, b) => ab[DND_SKILLS[b].ab] - ab[DND_SKILLS[a].ab]);
    this.s.skills = pool.slice(0, this.skillSlots());
  }
  preview() { return dndNewChar({ name: this.s.name, species: this.s.species, lineage: this.s.lineage, cls: this.s.cls, bg: this.s.bg, ab: this.base(), bgPlus: this.s.plus, skills: this.s.skills, look: this.s.look }); }
  // ---- drawing ----
  draw() {
    const s = this.s, step = CR_STEPS[s.step][0];
    const tabs = CR_STEPS.map(([k, n], i) => `<button class="cr-tab${i === s.step ? ' on' : ''}" data-step="${i}">${i + 1}. ${n}</button>`).join('');
    let body = '';
    if (step === 'species') body = this.drawSpecies();
    else if (step === 'class') body = this.drawClass();
    else if (step === 'origin') body = this.drawOrigin();
    else if (step === 'abilities') body = this.drawAbilities();
    else if (step === 'skills') body = this.drawSkills();
    else if (step === 'looks') body = this.drawLooks();
    else body = this.drawName();
    const c = this.preview(); dndDerive(c, null);
    const C = DND_CLASSES[s.cls], Sp = DND_SPECIES[s.species];
    const title = this.o.title || (this.lp ? `${esc(this.lp.name)} · create your character` : 'Create a hero');
    this.el.innerHTML = `<div class="cr-card">
      <div class="cr-head"><b>${title}</b><span class="cr-tabs">${tabs}</span></div>
      <div class="cr-main"><div class="cr-body">${body}</div>
        <div class="cr-side"><canvas class="cr-doll" width="150" height="250"></canvas>
          <div class="cr-rot"><button class="btn tiny" data-rot="-1">⟲</button><button class="btn tiny" data-rand="1">Random look</button><button class="btn tiny" data-rot="1">⟳</button></div>
          <div class="cr-sum"><b>${esc(s.name)}</b><span>${esc(Sp.name)} ${esc(C.name)} · ${esc(DND_BACKGROUNDS[s.bg].name)}</span>
          <div class="cr-stats"><span>HP <b>${c.d.maxHp}</b></span><span>AC <b>${this.kitAC(c)}</b></span><span>Speed <b>${c.d.speed}</b></span><span>Init <b>${dndSigned(c.d.initiative)}</b></span></div>
          <div class="cr-abs">${DND_ABILITIES.map(a => `<span><i>${DND_ABILITY_SHORT[a]}</i><b>${c.ab[a]}</b><em>${dndSigned(dndMod(c.ab[a]))}</em></span>`).join('')}</div></div>
        </div></div>
      <div class="cr-foot"><button class="btn" data-prev="1" ${s.step === 0 ? 'disabled' : ''}>◀ Back</button><span class="cr-hint">${(this.lp && this.lp.pads && this.lp.pads.size) || (!this.lp && this.o.g && this.o.g.pads && this.o.g.pads.connected().length) ? 'D-pad: move · ◀ ▶ change · A choose · LB/RB page · B back · Start: finish' : 'Click to choose · Tab pages with the buttons below'}</span>
        ${s.step < CR_STEPS.length - 1 ? '<button class="btn" data-quick="1">Quick start</button><button class="btn primary" data-next="1">Next ▶</button>' : `<button class="btn primary" data-done="1">${esc(this.o.doneLabel || 'Begin the adventure')}</button>`}</div></div>`;
    this.paintDoll();
    this.bind();
    this.focusables(); this.mark();
  }
  kitAC(c) {
    // the armour class this kit gives at the start
    const C = DND_CLASSES[c.cls], d = dndMod(c.ab.dex), kit = C.kit.map(k => k[0]);
    let ac = 10 + d;
    if (C.unarmored) ac = 10 + dndMod(c.ab[C.unarmored[0]]) + dndMod(c.ab[C.unarmored[1]]);
    const set = kit.find(k => DND_KIT_SETS[k]);
    if (set) { const [t, full] = DND_ARMOR_TYPE[DND_KIT_SETS[set]]; ac = t === 'heavy' ? full : t === 'medium' ? full + Math.min(2, d) : full + d; if (c.cls === 'fighter' || (c.cls === 'paladin' && c.level >= 2)) ac += 1; }
    if (kit.includes('shield')) ac += 2;
    return ac;
  }
  paintDoll() {
    const cv = this.el.querySelector('.cr-doll'); if (!cv) return;
    const skin = dndPaintSkin(this.s.look);
    this._skin = skin;
    dndDrawDoll(cv, skin, this.view, this.s.look.body === 'slim');
  }
  row(label, value, key, extra = '') { return `<div class="cr-row" data-cyc="${key}"><span class="cr-l">${label}</span><button class="btn tiny" data-dec="${key}">◀</button><span class="cr-v">${value}</span><button class="btn tiny" data-inc="${key}">▶</button>${extra}</div>`; }
  drawSpecies() {
    const s = this.s, Sp = DND_SPECIES[s.species];
    const cards = DND_SPECIES_ORDER.map(k => { const S = DND_SPECIES[k]; return `<button class="cr-pick${k === s.species ? ' on' : ''}" data-species="${k}"><b>${S.name}</b><i>${S.speed} ft${S.dark ? ' · darkvision' : ''}${S.size === 'small' ? ' · small' : ''}</i></button>`; }).join('');
    const lin = Sp.lineages ? `<div class="cr-sub"><span>${s.species === 'dragonborn' ? 'Draconic ancestry' : s.species === 'goliath' ? 'Giant ancestry' : s.species === 'tiefling' ? 'Fiendish legacy' : 'Lineage'}</span>${Object.entries(Sp.lineages).map(([k, L]) => `<button class="btn tiny${(s.lineage || Object.keys(Sp.lineages)[0]) === k ? ' on' : ''}" data-lineage="${k}">${esc(L.name)}${L.dmg ? ' (' + L.dmg + ')' : ''}</button>`).join('')}</div>` : '';
    return `<div class="cr-grid">${cards}</div>${lin}<ul class="cr-traits">${Sp.traits.map(([n, t]) => `<li><b>${esc(n)}.</b> ${esc(t)}</li>`).join('')}</ul>`;
  }
  drawClass() {
    const s = this.s, C = DND_CLASSES[s.cls], sig = DND_SIGNATURES[C.signature];
    const cards = DND_CLASS_ORDER.map(k => { const D = DND_CLASSES[k]; return `<button class="cr-pick${k === s.cls ? ' on' : ''}" data-cls="${k}" style="--cc:${D.color}"><b>${D.name}</b><i>d${D.hd} · ${D.primary.map(a => DND_ABILITY_SHORT[a]).join('/')}</i></button>`; }).join('');
    const kit = C.kit.map(([k, n]) => (ITEMS[k] ? ITEMS[k].name : DND_KIT_SETS[k] ? (ARMOR_MATS[DND_KIT_SETS[k]] || {}).label + ' armour' : k) + (n > 1 ? ' ×' + n : '')).join(', ');
    const sp = C.caster ? `<li><b>Spellcasting.</b> ${esc(DND_ABILITY_NAMES[C.castAb])}. Starts with ${dndStartSpells(s.cls, s.species, s.lineage, DND_BACKGROUNDS[s.bg]).map(k => DND_SPELLS[k].name).join(', ')}.</li>` : '';
    return `<div class="cr-grid">${cards}</div><p class="cr-desc">${esc(C.desc)}</p><ul class="cr-traits">
      <li><b>Hit points.</b> ${C.hd} + Constitution at 1st level; d${C.hd} per level after.</li>
      <li><b>Saving throws.</b> ${C.saves.map(a => DND_ABILITY_NAMES[a]).join(', ')}. <b>Armour:</b> ${C.armor.length ? C.armor.join(', ') : 'none'}.</li>
      ${sig ? `<li><b>${esc(sig.name)}</b> (class feature key). ${esc(sig.desc)}</li>` : ''}${sp}
      <li><b>Level 1.</b> ${(C.features[1] || []).join(', ')}.</li>
      <li><b>Starting gear.</b> ${esc(kit)}, ${C.gold + DND_BACKGROUNDS[s.bg].gold} gold.</li></ul>`;
  }
  drawOrigin() {
    const s = this.s, Bg = DND_BACKGROUNDS[s.bg];
    const cards = DND_BACKGROUND_ORDER.map(k => { const D = DND_BACKGROUNDS[k]; return `<button class="cr-pick${k === s.bg ? ' on' : ''}" data-bg="${k}"><b>${D.name}</b><i>${D.skills.map(x => DND_SKILLS[x].name).join(', ')}</i></button>`; }).join('');
    return `<div class="cr-grid">${cards}</div><p class="cr-desc">${esc(Bg.desc)}</p><ul class="cr-traits">
      <li><b>Skills.</b> ${Bg.skills.map(x => DND_SKILLS[x].name).join(', ')}.</li>
      <li><b>Ability scores.</b> +2 and +1 (or +1 to each) among ${Bg.abs.map(a => DND_ABILITY_NAMES[a]).join(', ')} — set on the next page.</li>
      <li><b>Feat: ${esc(Bg.feat)}.</b> ${esc(DND_FEATS[Bg.feat] || '')}</li></ul>`;
  }
  drawAbilities() {
    const s = this.s, Bg = DND_BACKGROUNDS[s.bg], b = this.base(), f = this.final();
    const meth = `<div class="cr-sub"><span>Method</span>${[['array', 'Standard array'], ['buy', 'Point buy'], ['roll', 'Roll 4d6']].map(([k, n]) => `<button class="btn tiny${s.method === k ? ' on' : ''}" data-method="${k}">${n}</button>`).join('')}${s.method === 'roll' ? '<button class="btn tiny" data-reroll="1">🎲 Roll</button>' : ''}${s.method !== 'buy' ? '<button class="btn tiny" data-suggest="1">Suggest</button>' : `<em class="cr-pts">${this.pointsLeft()} points left</em>`}</div>`;
    const rows = DND_ABILITIES.map(a => {
      const v = b[a], p = s.plus[a] || 0;
      const ctl = s.method === 'buy' ? `<button class="btn tiny" data-buy="${a}:-1">−</button><b class="cr-score">${v}</b><button class="btn tiny" data-buy="${a}:1">+</button>` : `<button class="btn tiny" data-swap="${a}:1">▲</button><b class="cr-score">${v}</b><button class="btn tiny" data-swap="${a}:-1">▼</button>`;
      const bg = Bg.abs.includes(a) ? `<span class="cr-plus">${[0, 1, 2].map(n => `<button class="btn tiny${p === n ? ' on' : ''}" data-plus="${a}:${n}">+${n}</button>`).join('')}</span>` : '<span class="cr-plus"></span>';
      return `<div class="cr-ab" data-ab="${a}"><span class="cr-l">${DND_ABILITY_NAMES[a]}</span>${ctl}${bg}<span class="cr-fin">${f[a]} <i>(${dndSigned(dndMod(f[a]))})</i></span></div>`;
    }).join('');
    const sum = Object.values(s.plus).reduce((x, y) => x + y, 0), ok = sum === 3 && Object.values(s.plus).every(v => v <= 2) && (Object.values(s.plus).filter(v => v === 2).length <= 1);
    return `${meth}<div class="cr-abs-list">${rows}</div><p class="cr-desc">${s.method === 'buy' ? 'Scores from 8 to 15; higher scores cost more points.' : 'Swap scores between abilities with ▲ ▼.'} Your origin adds +2/+1 or +1/+1/+1 among ${Bg.abs.map(a => DND_ABILITY_SHORT[a]).join(', ')}${ok ? '.' : ' — <b class="bad">pick exactly +2 and +1, or +1 three times</b>.'}</p>`;
  }
  drawSkills() {
    const s = this.s, C = DND_CLASSES[s.cls], fixed = this.fixedSkills(), n = this.skillSlots(), c = this.preview(); dndDerive(c, null);
    const list = DND_SKILL_ORDER.map(k => {
      const fx = fixed.includes(k), on = fx || s.skills.includes(k), can = C.skillsFrom.includes(k) || DND_SPECIES[s.species].extraSkill;
      return `<button class="cr-skill${on ? ' on' : ''}${fx ? ' fixed' : ''}" data-skill="${k}" ${fx || (!can && !on) ? 'disabled' : ''}><span>${on ? '●' : '○'} ${esc(DND_SKILLS[k].name)} <i>${DND_ABILITY_SHORT[DND_SKILLS[k].ab]}</i></span><b>${dndSigned(c.d.skills[k])}</b></button>`;
    }).join('');
    return `<div class="cr-sub"><span>Choose ${n} from your class (${s.skills.length}/${n})</span><button class="btn tiny" data-autoskill="1">Suggest</button></div><div class="cr-skills">${list}</div><p class="cr-desc">Filled circles: proficient. Your origin's and species' skills are already yours.</p>`;
  }
  drawLooks() {
    const L = this.s.look, nm = (list, v) => (list.find(x => x[0] === v) || list[0])[1];
    const sw = (key, cols, cur) => `<div class="cr-row cr-sw" data-swrow="${key}"><span class="cr-l">${{ skin: 'Skin', hairCol: 'Hair colour', beardCol: 'Beard colour', eyeCol: 'Eyes', hornCol: 'Horns', c0: 'Main colour', c1: 'Trim', c2: 'Legs', c3: 'Boots' }[key]}</span>${cols.map(c => `<button class="cr-swatch${c.toLowerCase() === String(cur).toLowerCase() ? ' on' : ''}" data-sw="${key}:${c}" style="background:${c}"></button>`).join('')}</div>`;
    const Sp = DND_SPECIES[this.s.species], skins = [...new Set([...(Sp.look.skins || []), ...NPC_SKIN_TONES])].slice(0, 14);
    const palette = ['#2a2a32', '#5a4030', '#8a6a42', '#c8a060', '#e8e0c8', '#e8e8f0', '#9a9aa4', '#4a4a54', '#8a2a2a', '#c04a2a', '#e8c040', '#4a7a2a', '#2a5a3a', '#2a3a8a', '#4a6ae0', '#6a2a8a', '#a02a6a', '#3a2414'];
    return `<div class="cr-looks">
      ${this.row('Body', L.body === 'slim' ? 'Slender' : 'Broad', 'body')}
      ${sw('skin', skins, L.skin)}
      ${this.row('Hair', nm(LOOK_HAIR, L.hair), 'hair')}${sw('hairCol', LOOK_HAIR_COLS, L.hairCol)}
      ${this.row('Beard', nm(LOOK_BEARD, L.beard), 'beard')}${L.beard !== 'none' ? sw('beardCol', LOOK_HAIR_COLS, L.beardCol || L.hairCol) : ''}
      ${this.row('Eyes', nm(LOOK_EYES, L.eyes), 'eyes')}${sw('eyeCol', LOOK_EYE_COLS, L.eyeCol)}
      ${this.row('Mouth', nm(LOOK_MOUTH, L.mouth), 'mouth')}
      ${this.row('Markings', nm(LOOK_MARKS, L.marks), 'marks')}
      ${this.row('Ears', nm(LOOK_EARS, L.ears), 'ears')}
      ${this.row('Horns', nm(LOOK_HORNS, L.horns), 'horns')}${L.horns !== 'none' ? sw('hornCol', LOOK_HORN_COLS, L.hornCol) : ''}
      ${this.row('Outfit', LOOK_OUTFITS[L.outfit].name, 'outfit')}
      ${sw('c0', palette, L.cols[0])}${sw('c1', palette, L.cols[1])}${sw('c2', palette, L.cols[2])}${sw('c3', palette, L.cols[3])}
      ${this.row('Headwear', { none: 'None', wizard: 'Wizard\'s hat', feather: 'Feathered cap', circlet: 'Leaf circlet', crown: 'Circlet of gold', hood: 'Hood' }[L.hood ? 'hood' : L.hat] || 'None', 'hat')}
      ${this.row('Cloak', L.cloak ? 'Yes' : 'No', 'cloak')}
      ${this.row('Helmet', L.helm === 'hide' ? 'Hidden (still worn)' : 'Shown', 'helm')}
      ${this.row('Features', [L.tusks && 'tusks', L.snout && 'snout', L.scales && 'scales', L.tail && 'tail', L.nose && 'big nose'].filter(Boolean).join(', ') || 'None', 'feat')}
    </div>`;
  }
  drawName() {
    const s = this.s, C = DND_CLASSES[s.cls], c = this.preview(); dndDerive(c, null);
    return `<div class="cr-namebox"><label class="cr-l">Name</label><input class="cr-name" maxlength="24" value="${esc(s.name)}"><button class="btn tiny" data-rname="1">🎲 Random</button></div>
      <ul class="cr-traits"><li><b>${esc(s.name)}</b>, ${esc(DND_SPECIES[s.species].name)} ${esc(C.name)}, ${esc(DND_BACKGROUNDS[s.bg].name)}.</li>
      <li>Hit points ${c.d.maxHp}, armour class ${this.kitAC(c)}, speed ${c.d.speed} ft, proficiency ${dndSigned(c.d.prof)}.</li>
      <li>Skills: ${c.skills.map(k => DND_SKILLS[k].name).join(', ')}.</li>
      ${c.spells.length ? `<li>Spells: ${c.spells.map(k => DND_SPELLS[k].name).join(', ')}.</li>` : ''}
      <li>You begin with your class's gear and ${C.gold + DND_BACKGROUNDS[s.bg].gold} gold pieces.</li></ul>`;
  }
  // ---- changing things ----
  cyc(key, d) {
    const L = this.s.look, step = (list, v) => list[(list.findIndex(x => x[0] === v) + d + list.length) % list.length][0];
    if (key === 'body') L.body = L.body === 'slim' ? 'broad' : 'slim';
    else if (key === 'hair') L.hair = step(LOOK_HAIR, L.hair);
    else if (key === 'beard') L.beard = step(LOOK_BEARD, L.beard);
    else if (key === 'eyes') L.eyes = step(LOOK_EYES, L.eyes);
    else if (key === 'mouth') L.mouth = step(LOOK_MOUTH, L.mouth);
    else if (key === 'marks') L.marks = step(LOOK_MARKS, L.marks);
    else if (key === 'ears') L.ears = step(LOOK_EARS, L.ears);
    else if (key === 'horns') L.horns = step(LOOK_HORNS, L.horns);
    else if (key === 'outfit') { const ks = Object.keys(LOOK_OUTFITS); L.outfit = ks[(ks.indexOf(L.outfit) + d + ks.length) % ks.length]; L.cols = LOOK_OUTFITS[L.outfit].cols.slice(); }
    else if (key === 'hat') { const hs = ['none', 'hood', 'wizard', 'feather', 'circlet', 'crown'], cur = L.hood ? 'hood' : L.hat || 'none', nx = hs[(hs.indexOf(cur) + d + hs.length) % hs.length]; L.hood = nx === 'hood'; L.hat = nx === 'hood' ? 'none' : nx; }
    else if (key === 'cloak') L.cloak = !L.cloak;
    else if (key === 'helm') L.helm = L.helm === 'hide' ? 'show' : 'hide';
    else if (key === 'feat') { const sets = [{}, { tusks: true }, { snout: true, scales: true }, { tail: true }, { nose: true }, { scales: true }]; const cur = sets.findIndex(o => JSON.stringify(o) === JSON.stringify(Object.fromEntries(['tusks', 'snout', 'scales', 'tail', 'nose'].filter(k => L[k]).map(k => [k, true])))); const nx = sets[(Math.max(0, cur) + d + sets.length) % sets.length]; for (const k of ['tusks', 'snout', 'scales', 'tail', 'nose']) L[k] = !!nx[k]; }
    this.draw();
  }
  setSpecies(k) {
    const s = this.s; if (s.species === k) return;
    s.species = k; s.lineage = DND_SPECIES[k].lineages ? Object.keys(DND_SPECIES[k].lineages)[0] : null;
    const keep = s.look; s.look = dndDefaultLook(k, s.cls); s.look.outfit = keep.outfit; s.look.cols = keep.cols; s.look.body = keep.body;
    if (DND_NAMES[k] && (!s._named)) s.name = dndRandomName(k);
    this.pruneSkills(); this.draw();
  }
  setClass(k) {
    const s = this.s; if (s.cls === k) return;
    s.cls = k; if (!s._bgPicked) { s.bg = CR_BG_FOR[k] || s.bg; this.defaultPlus(); }
    const o = LOOK_CLASS_OUTFIT[k]; if (o) { s.look.outfit = o; s.look.cols = LOOK_OUTFITS[o].cols.slice(); s.look.hat = k === 'wizard' ? 'wizard' : k === 'bard' ? 'feather' : k === 'druid' ? 'circlet' : 'none'; s.look.cloak = ['ranger', 'wizard', 'warlock', 'paladin', 'druid'].includes(k); s.look.hood = false; if (k === 'wizard' && !['elf', 'dragonborn', 'tiefling'].includes(s.species) && ['none', 'stubble', 'short', 'long'].includes(s.look.beard)) s.look.beard = 'wizard'; s.look.helm = s.look.hat !== 'none' ? 'hide' : 'show'; }
    if (s.method !== 'buy') this.suggest();
    this.s.skills = []; this.autoSkills(); this.draw();
  }
  bind() {
    const q = (sel, fn) => this.el.querySelectorAll(sel).forEach(b => b.onclick = (ev) => { ev.preventDefault(); if (this.g && this.g.sfx) this.g.sfx.play('click'); fn(b); });
    q('[data-step]', b => { this.s.step = +b.dataset.step; this.sel = 0; this.draw(); });
    q('[data-next]', () => this.go(1)); q('[data-prev]', () => this.go(-1));
    q('[data-species]', b => this.setSpecies(b.dataset.species));
    q('[data-lineage]', b => { this.s.lineage = b.dataset.lineage; if (this.s.species === 'dragonborn') { const i = Object.keys(DND_SPECIES.dragonborn.lineages).indexOf(b.dataset.lineage); this.s.look.skin = DND_SPECIES.dragonborn.look.skins[i] || this.s.look.skin; } this.draw(); });
    q('[data-cls]', b => this.setClass(b.dataset.cls));
    q('[data-bg]', b => { this.s.bg = b.dataset.bg; this.s._bgPicked = true; this.defaultPlus(); this.pruneSkills(); if (this.s.skills.length < this.skillSlots()) this.autoSkills(); this.draw(); });
    q('[data-method]', b => { this.s.method = b.dataset.method; if (this.s.method === 'roll' && !this.s.rolled) this.roll(); else if (this.s.method !== 'buy') this.suggest(); this.draw(); });
    q('[data-reroll]', () => { this.roll(); this.draw(); });
    q('[data-suggest]', () => { this.suggest(); this.draw(); });
    q('[data-swap]', b => { const [a, d] = b.dataset.swap.split(':'), A = this.s.assign, vals = Object.values(A).slice().sort((x, y) => x - y), cur = A[a], i = vals.indexOf(cur), j = Math.max(0, Math.min(vals.length - 1, i + (+d))); if (i === j) return; const other = DND_ABILITIES.find(x => x !== a && A[x] === vals[j]); if (other) { A[other] = cur; A[a] = vals[j]; } this.draw(); });
    q('[data-buy]', b => { const [a, d] = b.dataset.buy.split(':'), v = this.s.buy[a] + (+d); if (v < 8 || v > 15) return; const old = this.s.buy[a]; this.s.buy[a] = v; if (this.pointsLeft() < 0) this.s.buy[a] = old; this.draw(); });
    q('[data-plus]', b => { const [a, n] = b.dataset.plus.split(':'), P = this.s.plus; P[a] = +n; if (!+n) delete P[a]; const sum = Object.values(P).reduce((x, y) => x + y, 0); if (sum > 3) for (const k of Object.keys(P)) if (k !== a && sum > 3) { P[k] = Math.max(0, P[k] - (sum - 3)); if (!P[k]) delete P[k]; break; } if (+n === 2) for (const k of Object.keys(P)) if (k !== a && P[k] === 2) P[k] = 1; this.draw(); });
    q('[data-skill]', b => { const k = b.dataset.skill, S = this.s.skills; if (S.includes(k)) S.splice(S.indexOf(k), 1); else if (S.length < this.skillSlots()) S.push(k); else { S.shift(); S.push(k); } this.draw(); });
    q('[data-autoskill]', () => { this.autoSkills(); this.draw(); });
    q('[data-dec]', b => this.cyc(b.dataset.dec, -1)); q('[data-inc]', b => this.cyc(b.dataset.inc, 1));
    q('[data-sw]', b => { const [k, c] = b.dataset.sw.split(':'), L = this.s.look; if (/^c\d$/.test(k)) L.cols[+k[1]] = c; else L[k] = c; this.draw(); });
    q('[data-rot]', b => { this.view = (this.view + (+b.dataset.rot) + 4) % 4; this.paintDoll(); });
    q('[data-rand]', () => { const o = this.s.look.outfit, cols = this.s.look.cols; this.s.look = dndDefaultLook(this.s.species, this.s.cls); if (Math.random() < 0.5) { this.s.look.outfit = o; this.s.look.cols = cols; } this.draw(); });
    q('[data-rname]', () => { this.s.name = dndRandomName(this.s.species); this.draw(); });
    q('[data-quick]', () => { this.autoSkills(); this.finish(); });
    q('[data-done]', () => this.finish());
    const nm = this.el.querySelector('.cr-name');
    if (nm) { nm.oninput = () => { this.s.name = nm.value.slice(0, 24) || 'Adventurer'; this.s._named = true; const b = this.el.querySelector('.cr-sum b'); if (b) b.textContent = this.s.name; }; nm.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') this.finish(); }; }
  }
  roll() {
    const vals = [];
    for (let i = 0; i < 6; i++) { const r = [dndDie(6), dndDie(6), dndDie(6), dndDie(6)].sort((a, b) => a - b); vals.push(r[1] + r[2] + r[3]); }
    this.s.rolled = vals; this.suggest();
    if (this.host && typeof dndSound === 'function') dndSound('roll');
  }
  go(d) {
    const s = this.s;
    if (d > 0 && CR_STEPS[s.step][0] === 'abilities') { const sum = Object.values(s.plus).reduce((x, y) => x + y, 0); if (sum !== 3) { this.flash('Set your origin bonuses first: +2 and +1, or +1 three times'); return; } if (s.method === 'buy' && this.pointsLeft() > 0) { /* fine: leftover points */ } }
    if (d > 0 && CR_STEPS[s.step][0] === 'skills' && s.skills.length < this.skillSlots()) this.autoSkills();
    s.step = Math.max(0, Math.min(CR_STEPS.length - 1, s.step + d)); this.sel = 0; this.draw();
  }
  flash(t) { const h = this.el.querySelector('.cr-hint'); if (h) { h.textContent = t; h.classList.add('bad'); } }
  finish() {
    const s = this.s;
    const sum = Object.values(s.plus).reduce((x, y) => x + y, 0); if (sum !== 3) this.defaultPlus();
    if (s.skills.length < this.skillSlots()) this.autoSkills();
    const c = dndNewChar({ name: s.name, species: s.species, lineage: s.lineage, cls: s.cls, bg: s.bg, ab: this.base(), bgPlus: s.plus, skills: s.skills, look: s.look });
    if (c.cls === 'rogue' || c.cls === 'bard') c.expertise = c.skills.slice(0, 2);
    const skinURL = dndSkinURL(s.look);
    const tpl = JSON.parse(JSON.stringify(s)); tpl.step = 0;
    if (this.o.onDone) this.o.onDone(c, skinURL, s.look.body === 'slim' ? 'slim' : 'classic', tpl);
  }
  // ---- controllers ----
  // (controller) the page's first choice, rather than the page tabs
  selBody() { const F = this._f || this.focusables(), i = F.findIndex(b => b.closest('.cr-body')); if (i >= 0) { this.sel = i; this.mark(); } }
  focusables() { this._f = [...this.el.querySelectorAll('button:not([disabled]), input')].filter(b => b.offsetParent !== null || b.getClientRects().length); return this._f; }
  mark() { const F = this._f || this.focusables(); const pad = this._padUsed || (this.lp && this.lp.pads && this.lp.pads.size); F.forEach((b, i) => b.classList.toggle('padfocus', !!pad && i === this.sel)); const b = F[this.sel]; if (b && b.scrollIntoView && this._padUsed) b.scrollIntoView({ block: 'nearest' }); }
  frame(dt, inp) {
    if (!this.el.isConnected || !inp) return;
    if (inp.padLB || inp.padRB) { this.s.step = Math.max(0, Math.min(CR_STEPS.length - 1, this.s.step + (inp.padRB ? 1 : -1))); this.sel = 0; this.draw(); this.selBody(); return; }
    // Start: to the last page, its finish button picked out
    if (inp.padStart) { this._padUsed = true; this.s.step = CR_STEPS.length - 1; this.sel = 0; this.draw(); const d = (this._f || []).findIndex(b => b.matches('[data-done]')); if (d >= 0) { this.sel = d; this.mark(); } return; }
    if (inp.padB) { if (this.s.step > 0) this.go(-1); return; }
    // the first touch of the d-pad lights up the page's first choice
    if (!this._padUsed && (inp.navX || inp.navY)) { this._padUsed = true; this.selBody(); return; }
    const F = this._f || this.focusables(); if (!F.length) return;
    if (inp.navY) { this._padUsed = true; this.sel = this.nearest(F, inp.navY > 0 ? 'down' : 'up'); this.mark(); }
    if (inp.navX) {
      this._padUsed = true;
      const cur = F[this.sel], row = cur && cur.closest('[data-cyc]');
      if (row) { this.cyc(row.dataset.cyc, inp.navX > 0 ? 1 : -1); return; }
      this.sel = this.nearest(F, inp.navX > 0 ? 'right' : 'left'); this.mark();
    }
    if (inp.padA) { const b = F[this.sel]; if (b) { if (b.tagName === 'INPUT') { this.s.name = dndRandomName(this.s.species); this.draw(); } else b.click(); } }
  }
  nearest(F, dir) {
    const cur = F[this.sel]; if (!cur) return 0;
    const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let best = this.sel, bd = Infinity;
    F.forEach((b, i) => {
      if (i === this.sel) return;
      const q = b.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2, dx = x - cx, dy = y - cy;
      const ok = dir === 'down' ? dy > 4 : dir === 'up' ? dy < -4 : dir === 'right' ? dx > 4 && Math.abs(dy) < r.height : dx < -4 && Math.abs(dy) < r.height;
      if (!ok) return;
      const d = dir === 'down' || dir === 'up' ? Math.abs(dy) + Math.abs(dx) * 0.4 : Math.abs(dx) + Math.abs(dy) * 3;
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }
  close() { this.el.remove(); }
}

// ---- giving a new character their life ----------------------------------------------------------------------------------------
function dndKitFor(c) {
  const C = DND_CLASSES[c.cls], Bg = DND_BACKGROUNDS[c.bg], out = [];
  for (const [k, n] of C.kit) {
    if (DND_KIT_SETS[k]) { const m = DND_KIT_SETS[k]; out.push({ armor: ['helmet', 'chestplate', 'leggings', 'boots'].map(p => m + '_' + p).filter(id => ITEMS[id]) }); continue; }
    if (k === 'shortbow' || k === 'longbow') { out.push({ stack: mkStack('bow', 1, { dk: k, nm: DND_BOWS[k].name }) }); continue; }
    if (ITEMS[k]) out.push({ stack: mkStack(k, n) });
  }
  for (const k of Bg.kit || []) if (ITEMS[k]) out.push({ stack: mkStack(k, 1) });
  out.push({ stack: mkStack('potion_healing', 2) }, { stack: mkStack('rations', 5) }, { stack: mkStack('torch', 8) });
  const gold = (C.gold || 0) + (Bg.gold || 0);
  if (gold) out.push({ stack: mkStack('gold_coin', gold) });
  return out;
}
function dndApplyChar(lp, c, skinURL, arms, tpl) {
  const p = lp.player, g = lp.g;
  p.stats = p.stats || {};
  p.stats.dnd = c;
  // the profile keeps the looks (and the hero, to make again in another world)
  lp.profile.skin = skinURL; lp.profile.arms = arms; lp.profile.name = c.name; lp.profile.dnd = tpl;
  try { lp.hud.q('.pname').textContent = c.name; } catch (e) { /* no hud yet */ }
  try { g.saveProfiles(); } catch (e) { /* storage full */ }
  if (typeof lp.setSkin === 'function') lp.setSkin(skinRef(lp.profile)); else lp.skin = getSkin(g.renderer.gl, skinRef(lp.profile));
  // the kit
  const inv = p.inv, give = [];
  for (const it of dndKitFor(c)) {
    if (it.armor) { it.armor.forEach((id, i) => { const slot = ['helmet', 'chestplate', 'leggings', 'boots'].findIndex(s => id.endsWith('_' + s)); if (slot >= 0 && !inv.armor.slots[slot]) inv.armor.slots[slot] = mkStack(id, 1); else give.push(mkStack(id, 1)); }); continue; }
    const st = it.stack, d = itemDef(st.id);
    if (d && d.dndGear && d.dndGear.shield && !inv.offhand) { inv.offhand = st; continue; }
    give.push(st);
  }
  // the main weapon first in the hotbar
  give.sort((a, b) => { const wa = itemDef(a.id), wb = itemDef(b.id); const sa = (wa && (wa.dnd || wa.bow) ? 0 : 1), sb = (wb && (wb.dnd || wb.bow) ? 0 : 1); return sa - sb; });
  for (const st of give) { const left = inv.add(st); if (left) g.dropItem(mkStack(st.id, left), p.x, p.y + 1, p.z); }
  inv.selected = 0;
  p.recalcMax(); p.health = p.maxHealth;
  lp._dndSpell = (c.spells || [])[0] || null;
  dndHudDirty(lp);
  // tell everyone else what you look like now
  if (g.net) {
    if (g.isGuest) g.net.send({ t: 'adv', k: 'dndskin', li: lp.index || 0, skin: skinRef(lp.profile), n: c.name });
    else g.net.all({ t: 'adv', k: 'dndskin', key: 'h:' + (lp.index || 0), skin: skinRef(lp.profile), n: c.name });
  }
  lp.toast(`${dndSummary(c)} — ${DND_CLASSES[c.cls].signature ? `class feature: ${DND_SIGNATURES[DND_CLASSES[c.cls].signature].name} (${dndKeyName(lp, 'dndAbility')})` : ''}${c.spells.length ? ` · cast: ${dndKeyName(lp, 'dndCast')}, change spell: ${dndKeyName(lp, 'dndSpellNext')}` : ''} · sheet: ${dndKeyName(lp, 'dndSheet')}`, 'epic');
}
{
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'dndskin') {
      const key = 'g' + from + ':' + (m.li || 0), r = this.remotes.get(key), peer = this.peers.get(from);
      if (peer) { peer.skins = peer.skins || []; peer.skins[m.li || 0] = m.skin; }
      if (r) { r.skinURL = m.skin; r.skin = getSkin(this.g.renderer.gl, m.skin); if (m.n) r.name = m.n; }
      this.all({ t: 'adv', k: 'dndskin', key, skin: m.skin, n: m.n }, from);
      return;
    }
    return baseHost.call(this, from, m);
  };
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv' && m.k === 'dndskin') { const r = this.remotes.get(m.key); if (r) { r.skinURL = m.skin; r.skin = getSkin(this.g.renderer.gl, m.skin); if (m.n) r.name = m.n; } return; }
    return baseGuest.call(this, m);
  };
}

// a player without a character in a tabletop world makes one first
Object.assign(LocalPlayer.prototype, {
  openCreator(force) {
    if (this.creatorUI) return;
    if (this.mode !== 'play') { this.mode = 'play'; if (this.npcUI) this.npcUI.close(); }
    const lp = this, g = this.g;
    const tpl = this.profile && this.profile.dnd;
    const compact = g.locals.length > 1;
    this.openNpcUI(() => {
      const ui = new DndCreator(lp.el, { lp, g, from: tpl && !force ? Object.assign({}, tpl, { step: CR_STEPS.length - 1 }) : null, compact, onDone: (c, skin, arms, t) => { dndApplyChar(lp, c, skin, arms, t); ui.done = true; ui.close(); } });
      lp.creatorUI = ui; lp.creatorEl = ui.el;
      const baseClose = ui.close.bind(ui);
      ui.close = () => { if (!ui.done && !dndOf(lp.player)) return; baseClose(); lp.creatorUI = null; lp.creatorEl = null; if (lp.npcUI === ui) lp.npcUI = null; if (lp.mode === 'npc') lp.mode = 'play'; if (lp.useKb && !g.input.touchMode && g.state === 'playing') g.input.requestLock(); };
      return ui;
    });
  },
});
{
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const g = this.g;
    if (dndOn(g) && g.state === 'playing' && !this.serverPawn && !dndOf(this.player) && !this.creatorUI && !this.player.dead) {
      if (!this._crAt) this._crAt = performance.now();
      if (performance.now() - this._crAt > 700 && this.mode === 'play') this.openCreator();
    }
    // nothing hurts you while you're still making yourself
    if (this.creatorUI) { this.player.invuln = 1; this.player.vx *= 0.5; this.player.vz *= 0.5; }
    return baseUpd.call(this, dt, inp);
  };
}
// new worlds play by the tabletop rules
{
  const baseCreate = Game.prototype.createWorld;
  Game.prototype.createWorld = function (name, seed, mode, rules, ...rest) {
    this._newDnd = true;
    return baseCreate.call(this, name, seed, mode, rules, ...rest);
  };
  const baseEnter = Game.prototype.enterWorld;
  Game.prototype.enterWorld = function (meta, ...rest) {
    if (meta && this._newDnd) { meta.dnd = true; if (meta.campaign === undefined && this._campaignChoice !== null) meta.campaign = this._campaignChoice || DEFAULT_CAMPAIGN; this._newDnd = false; }
    if (meta && meta.campaign) CAMP_RT.genCampaign = meta.campaign;
    return baseEnter.call(this, meta, ...rest);
  };
}

