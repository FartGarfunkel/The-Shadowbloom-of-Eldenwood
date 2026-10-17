// ---------------------------------------------------------------------------
// game/skills.js — 0.9: skills that grow with use, and gear that grows with you.
//
// RuneScape-style: twelve skills, each levelled from 1 to 99 by doing it (the
// same experience curve, so the last levels take real time). There's no class
// to pick: what you do is what you get good at, and you can level all of them.
// The rewards are small and felt, so nobody gets strong overnight:
//   Mining, Woodcutting, Excavation — faster with the right tool, and more often
//     an extra ore, log or flint from what you break
//   Farming — extra crops from a ripe harvest       Fishing — bites come sooner
//   Melee — harder hits     Archery — harder arrows     Defence — blows hurt less
//   Smithing — tools and armour you make last longer   Cooking — food heals more
//   Taming — breeding and taming come easier         Magic — a bigger, faster mana pool
// Your tools, weapons and armour level too (to 50) as you use them, and keep
// their level when you mend them at the anvil: a well-worn pickaxe digs faster
// and finds more ore, an old sword hits harder, old armour turns more of a blow.
// Press K to see your skills.
// ---------------------------------------------------------------------------

const SKILLS = [
  ['mining', 'Mining', '#9aa4b0'], ['woodcutting', 'Woodcutting', '#8a6a3a'], ['excavation', 'Excavation', '#b89a6a'], ['farming', 'Farming', '#6ab04a'],
  ['fishing', 'Fishing', '#4a8ad8'], ['melee', 'Melee', '#d84a3a'], ['archery', 'Archery', '#6ac08a'], ['defence', 'Defence', '#7a8ad0'],
  ['smithing', 'Smithing', '#d8a04a'], ['cooking', 'Cooking', '#e07a3a'], ['taming', 'Taming', '#d88ab0'], ['magic', 'Magic', '#9a6ad8'],
];
const SKILL_NAME = Object.fromEntries(SKILLS.map(s => [s[0], s[1]]));
// the classic curve: level 2 at 83 xp, level 50 at 101,333, level 99 at 13,034,431
const SKILL_XP = (() => { const t = [0, 0]; let pts = 0; for (let L = 1; L < 99; L++) { pts += Math.floor(L + 300 * Math.pow(2, L / 7)); t.push(Math.floor(pts / 4)); } return t; })();
function skillLevel(xp) { let L = 1; while (L < 99 && xp >= SKILL_XP[L + 1]) L++; return L; }
function skillsOf(p) { const s = p.stats || (p.stats = {}); return s.skills || (s.skills = {}); }
function skillLv(p, k) { return skillLevel(skillsOf(p)[k] || 0); }
// a skill's bonus: 0 at level 1, `max` at 99
function skillBonus(p, k, max) { return (skillLv(p, k) - 1) / 98 * max; }

// ---- gear levels (to 50) ----------------------------------------------------------------------------
const GEAR_MAX = 50;
function gearLevel(gx) { return Math.min(GEAR_MAX, 1 + Math.floor(Math.sqrt((gx || 0) / 30))); }
function gearXpFor(L) { return (L - 1) * (L - 1) * 30; }
function gearGain(lp, s, n) {
  if (!s || !n) return;
  const d = itemDef(s.id); if (!d || !(d.tool || d.armor || d.bow)) return;
  const before = gearLevel(s.gx);
  s.gx = (s.gx || 0) + n;
  const after = gearLevel(s.gx);
  if (after > before && lp && lp.toast) { lp.toast(d.name + ' is now level ' + after, 'good'); lp.g.sfx.play('xp'); }
}
// how much a piece of gear's level adds (0 at level 1, up to `max` at 50)
const gearBonus = (s, max) => s && s.gx ? (gearLevel(s.gx) - 1) / (GEAR_MAX - 1) * max : 0;

// ---- earning experience ------------------------------------------------------------------------------
function skillGain(lp, k, xp) {
  if (!lp || !lp.player || !xp || lp.g.creative) return;
  const p = lp.player, S = skillsOf(p), before = skillLevel(S[k] || 0);
  S[k] = Math.min(200000000, (S[k] || 0) + xp);
  const after = skillLevel(S[k]);
  skillPop(lp, k, xp);
  if (after > before) {
    lp.toast(SKILL_NAME[k] + ' level ' + after + '!', after % 10 === 0 || after === 99 ? 'epic' : 'good');
    lp.g.sfx.play('levelup');
    if (!p.stats.skillHint) { p.stats.skillHint = true; setTimeout(() => lp.toast('Press K to see your skills', ''), 2500); }
  }
}
function skillPop(lp, k, xp) {
  let box = lp.el.querySelector('.skill-pops');
  if (!box) { box = document.createElement('div'); box.className = 'skill-pops'; lp.el.appendChild(box); }
  const last = box.lastElementChild;
  // runs of the same skill add up rather than stacking a column of little numbers
  if (last && last.dataset.k === k && performance.now() - Number(last.dataset.t) < 1200) {
    last.dataset.xp = Number(last.dataset.xp) + xp; last.dataset.t = performance.now();
    last.textContent = '+' + Math.round(Number(last.dataset.xp)) + ' ' + SKILL_NAME[k];
    last.style.animation = 'none'; void last.offsetWidth; last.style.animation = '';
    return;
  }
  const el = document.createElement('div');
  el.dataset.k = k; el.dataset.xp = xp; el.dataset.t = performance.now();
  el.style.color = SKILLS.find(s => s[0] === k)[2];
  el.textContent = '+' + Math.round(xp) + ' ' + SKILL_NAME[k];
  box.appendChild(el);
  while (box.children.length > 4) box.firstElementChild.remove();
  setTimeout(() => el.remove(), 2400);
}
// what a block is worth, and to which skill
const ORE_XP = { coal_ore: 18, copper_ore: 16, tin_ore: 16, iron_ore: 32, silver_ore: 40, gold_ore: 45, lapis_ore: 30, redstone_ore: 30, emerald_ore: 70, diamond_ore: 80, ruby_ore: 75, sapphire_ore: 75,
  mithril_ore: 95, adamantite_ore: 130, mese_ore: 60, quartz_ore: 20, nether_gold_ore: 20, cinderite_ore: 110, aether_crystal_ore: 50 };
function blockSkill(b) {
  const k = b.key;
  if (ORE_XP[k]) return ['mining', ORE_XP[k], true];
  if (b.isLog) return ['woodcutting', 12, false];
  if (b.tool === TOOL.PICK) return ['mining', Math.max(1, Math.round(b.hardness * 2)), false];
  if (b.tool === TOOL.SHOVEL) return ['excavation', b.key === 'gravel' || b.key === 'clay' ? 6 : 3, false];
  if (b.tool === TOOL.AXE) return ['woodcutting', 3, false];
  return null;
}
{
  const baseBreak = LocalPlayer.prototype.breakBlock;
  LocalPlayer.prototype.breakBlock = function (x, y, z) {
    const g = this.g, w = g.world, id = w.getBlock(x, y, z), b = BLOCKS[id], meta = w.getMeta(x, y, z), harvest = id && this.canHarvest(id), held = this.player.inv.held;
    const r = baseBreak.call(this, x, y, z);
    if (!id || w.getBlock(x, y, z) === id || g.creative) return r;
    const sk = blockSkill(b);
    // (0.9.0.24) a block you put there yourself gives nothing back but itself
    if (sk && harvest && !this._placedHit) {
      skillGain(this, sk[0], sk[1]);
      gearGain(this, held, sk[2] ? 4 : 1);
      // a skilled hand (and a well-used tool) turns up an extra one now and then
      if (sk[2] || sk[0] !== 'mining') {
        const chance = skillBonus(this.player, sk[0], 0.25) + gearBonus(held, 0.15);
        if (Math.random() < chance && b.drop) g.dropItem(mkStack(b.drop, 1), x + 0.5, y + 0.5, z + 0.5, true);
      }
    }
    // a ripe harvest
    if (b.crop && meta >= b.crop.stages - 1) {
      skillGain(this, 'farming', 10);
      if (Math.random() < skillBonus(this.player, 'farming', 0.4) && b.crop.drop) g.dropItem(mkStack(b.crop.drop, 1), x + 0.5, y + 0.5, z + 0.5, true);
    }
    return r;
  };
  const baseFell = LocalPlayer.prototype.fellTree;
  LocalPlayer.prototype.fellTree = function (x, y, z, tree) {
    const held = this.player.inv.held, n = tree && tree.logs ? tree.logs.filter(l => !placedAt(this.g.world, l[0], l[1], l[2])).length : 0;
    const r = baseFell.call(this, x, y, z, tree);
    if (n) { skillGain(this, 'woodcutting', n * 12); gearGain(this, held, n); }
    return r;
  };
  // faster with practice, and with a tool you know well
  const baseTime = LocalPlayer.prototype.breakTime;
  LocalPlayer.prototype.breakTime = function (id, hit) {
    const t = baseTime.call(this, id, hit);
    if (!isFinite(t) || t <= 0.05) return t;
    const b = BLOCKS[id], sk = blockSkill(b), held = this.player.inv.held;
    const k = 1 + (sk ? skillBonus(this.player, sk[0], 0.4) : 0) + gearBonus(held && itemDef(held.id) && itemDef(held.id).tool ? held : null, 0.35);
    return Math.max(0.05, t / k);
  };
  // fights: experience for the damage done; skill and a weapon's level add to it
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const a = src.attacker, lp = a instanceof LocalPlayer ? a : null;
    let kind = null;
    if (lp) {
      // (0.9.0.24) arrows train Archery (they're sent as tool 'arrow'); spells train Magic when cast, not here
      kind = src._cleave || src.type === 'magic' || src.type === 'spell' ? null : src.type === 'arrow' || src.tool === 'arrow' || src.type === 'projectile' && src.weapon === 'bow' ? 'archery' : 'melee';
      const held = lp.player.inv.held;
      if (kind && !src.dnd) amount *= 1 + skillBonus(lp.player, kind, 0.2) + (kind === 'melee' ? gearBonus(held, 0.25) : 0);   // (Shadowbloom) a d20 blow is already what it is
    }
    const hp0 = Math.max(0, this.health || 0);
    const dealt = baseHurt.call(this, amount, src);
    if (lp && kind && dealt > 0 && !this.T.passiveXp) {
      // experience for the damage that landed, not for overkill
      skillGain(lp, kind, Math.round(Math.min(dealt, hp0) * 4 + (this.alive ? 0 : (this.T.hp || 10))));
      if (kind === 'melee') gearGain(lp, lp.player.inv.held, Math.ceil(dealt));
    }
    return dealt;
  };
  const baseLPHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const p = this.player, worn = p.inv.armor.slots.filter(Boolean);
    if (worn.length && amount > 0 && !src.dnd && !(src.type === 'fall' || src.type === 'void' || src.type === 'drown' || src.type === 'starve')) {
      amount *= 1 - skillBonus(p, 'defence', 0.12) - worn.reduce((k, s) => k + gearBonus(s, 0.02), 0);
      const hp0 = p.health, r = baseLPHurt.call(this, amount, src), took = Math.max(0, hp0 - p.health);
      // (0.9.0.24) only a blow that actually lands teaches you anything (no farming cactus or lava with fire resistance)
      if (took > 0) { skillGain(this, 'defence', Math.round(took * 3)); for (const s of worn) gearGain(this, s, Math.ceil(took)); }
      return r;
    }
    return baseLPHurt.call(this, amount, src);
  };
  // fishing
  const baseFish = LocalPlayer.prototype.endFishing;
  LocalPlayer.prototype.endFishing = function (reel) {
    const b = this.fishing, caught = !!(b && reel && b.state === 'float' && b.biteT > 0);
    const r = baseFish.call(this, reel);
    if (caught) { const c = b.catch; skillGain(this, 'fishing', c && c.kind === 'treasure' ? 80 : c && c.kind === 'fish' ? 40 : 15); gearGain(this, this.player.inv.held, 3); }
    return r;
  };
  // breeding and taming
  const baseBreed = Mob.prototype.breedWith;
  Mob.prototype.breedWith = function (mate) {
    const r = baseBreed.call(this, mate);
    const lp = this.game.locals.find(l => Math.hypot(l.player.x - this.x, l.player.z - this.z) < 16);
    if (lp) skillGain(lp, 'taming', 25);
    return r;
  };
  // eating: a good cook gets more out of food
  const baseHeal = Player.prototype.heal;
  Player.prototype.heal = function (n) { return baseHeal.call(this, this._eating ? n * (1 + skillBonus(this, 'cooking', 0.25)) : n); };
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const held = this.player.inv.held, d = held && itemDef(held.id);
    if (d && d.food) this.player._eating = true;
    try { return baseUse.call(this, repeat, inp, fromOff); } finally { this.player._eating = false; }
  };
}
// crafting: metal tools and armour train Smithing (and come out a little tougher from a skilled hand)
{
  const baseTake = InvUI.prototype.takeOutput;
  InvUI.prototype.takeOutput = function (shift) {
    const r0 = this.grid ? matchGrid(this.grid, this.W) : null, d = r0 && itemDef(r0.out);
    const before = this.cursor ? this.cursor.n : 0;
    const res = baseTake.call(this, shift);
    if (!d) return res;
    const metal = (d.tool || d.armor) && !/^(wood|leather|stone)_/.test(r0.out);
    // (0.9.0.24) alloys train Smithing; turning ingots into blocks or nuggets and back does not
    const ins = r0.shape ? Object.values(r0.key) : (r0.items || []);
    const ingot = /_ingot$|_blend$/.test(r0.out) && new Set(ins).size > 1 && /iron|gold|copper|tin|bronze|steel|silver|mithril|adamantite/.test(r0.out);
    if (metal || ingot) {
      const made = shift ? 1 : Math.max(1, (this.cursor ? this.cursor.n : 0) - before);
      skillGain(this.lp, 'smithing', (metal ? 40 : 8) * made);
    }
    return res;
  };
}
// taking from a furnace: cooked food trains Cooking, metal trains Smithing
{
  const baseClick = InvUI.prototype.slotClick;
  InvUI.prototype.slotClick = function (group, i, button, shift) {
    const isOut = group === 'furn' && i === 2, a = isOut ? this.arr(group) : null, s = a && a[i], id = s && s.id, n0 = s ? s.n : 0;
    const r = baseClick.call(this, group, i, button, shift);
    if (isOut && id) {
      const n = n0 - (a[i] && a[i].id === id ? a[i].n : 0), d = itemDef(id);
      if (n > 0 && d) { if (d.food) skillGain(this.lp, 'cooking', 12 * n); else if (/_ingot$|^(iron|gold|copper)_nugget$/.test(id)) skillGain(this.lp, 'smithing', 10 * n); }
    }
    return r;
  };
}
// a skilled smith's tools last longer (applied as a head start against wear)
{
  const baseWear = LocalPlayer.prototype.wearHeld;
  LocalPlayer.prototype.wearHeld = function (n) { if (n > 0 && Math.random() < skillBonus(this.player, 'smithing', 0.3)) n = 0; return baseWear.call(this, n); };
}
// the gear level and progress keep with the stack
{
  const baseNorm = normalizeStack;
  normalizeStack = function (s) { const o = baseNorm(s); if (o && s && s.gx > 0) o.gx = Math.floor(s.gx); return o; };
  const baseInfo = itemInfoHTML;
  itemInfoHTML = function (s) {
    let h = baseInfo(s);
    const d = s && itemDef(s.id);
    if (d && (d.tool || d.armor || d.bow)) {
      const L = gearLevel(s.gx), nx = gearXpFor(L + 1), pr = L >= GEAR_MAX ? 1 : ((s.gx || 0) - gearXpFor(L)) / (nx - gearXpFor(L));
      h += `<div class="ts">Level ${L}${L >= GEAR_MAX ? ' (max)' : ''}</div><div class="gearbar"><i style="width:${Math.round(pr * 100)}%"></i></div>`;
    }
    return h;
  };
}

// ---- the skills screen (K) -----------------------------------------------------------------------------
{
  const at = KEY_ACTIONS.findIndex(a => a[0] === 'hideHud');
  KEY_ACTIONS.splice(at < 0 ? KEY_ACTIONS.length : at, 0, ['skills', 'Skills', ['KeyK']]);
  KEY_DEFAULTS.skills = ['KeyK'];
  const basePress = InputManager.prototype.pressCode;
  InputManager.prototype.pressCode = function (code, e) { const r = basePress.call(this, code, e); if (this.actionsFor(code).includes('skills')) this.s.skills = true; return r; };
  const baseEnd = InputManager.prototype.endFrame;
  InputManager.prototype.endFrame = function () { baseEnd.call(this); this.s.skills = false; };
  const baseMerge = mergeInput;
  mergeInput = function (a, b) { const r = baseMerge(a, b); a.skills = a.skills || b.skills; return r; };
  const baseUpdate = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    if (this.skillsEl && (inp.skills || inp.pause || inp.padB || inp.inventory)) { this.closeSkills(); inp = InputManager.blankState(); }
    else if (inp.skills && this.mode === 'play') { this.openSkills(); }
    return baseUpdate.call(this, dt, inp);
  };
}
Object.assign(LocalPlayer.prototype, {
  openSkills() {
    if (this.skillsEl) return;
    const p = this.player, S = skillsOf(p);
    const el = this.skillsEl = document.createElement('div');
    el.className = 'skills-view';
    let total = 0;
    const rows = SKILLS.map(([k, name, col]) => {
      const xp = S[k] || 0, L = skillLevel(xp); total += L;
      const a = SKILL_XP[L], b = SKILL_XP[Math.min(99, L + 1)], pr = L >= 99 ? 1 : (xp - a) / (b - a);
      return `<div class="sk" title="${Math.floor(xp).toLocaleString()} xp${L < 99 ? ' · ' + Math.ceil(b - xp).toLocaleString() + ' to level ' + (L + 1) : ''}"><span class="sk-n" style="color:${col}">${name}</span><span class="sk-l">${L}</span><div class="sk-bar"><i style="width:${Math.round(pr * 100)}%;background:${col}"></i></div></div>`;
    }).join('');
    el.innerHTML = `<div class="sk-card"><div class="sk-head"><span class="sk-title">Skills</span><span class="sk-total">Total level ${total}</span></div><div class="sk-grid">${rows}</div><div class="sk-hint">Skills grow by doing. Hover for experience · K to close</div></div>`;
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (e.target === el) this.closeSkills(); });
    this.el.appendChild(el);
    this.g.sfx.play('swap');
  },
  closeSkills() { if (this.skillsEl) { this.skillsEl.remove(); this.skillsEl = null; } },
});
