// ---------------------------------------------------------------------------
// game/magic.js — 0.9: magic.
//
// Spells are learned from tomes (the librarian sells the simpler ones; the
// rest lie in dungeons) and cast with a staff: use the staff to cast your
// chosen spell, G (or sneak and use) to change spell. Casting takes mana, the
// blue bar under your experience; it comes back by itself, faster in robes.
// The Magic skill makes every spell stronger, and the deeper tomes need a
// trained hand before you can learn them.
//
//   Firebolt (Magic 1)       a bolt of fire that sets things alight
//   Frost Shard (1)          a shard of ice that slows what it hits
//   Witchlight (3)           a floating light that follows you
//   Mend (5)                 heals you
//   Levitate (10)            float: jump to rise, sneak to sink
//   Stoneskin (12)           you take a third less harm for a minute
//   Blink (15)               step through space to where you look
//   Spirit Wolf (18)         a spirit wolf fights at your side for a while
//   Ward (20)                a shield of light that soaks up harm
//   Call Lightning (30)      lightning strikes where you look
//
// Staffs: apprentice (emerald), ruby (fire burns hotter), sapphire (frost,
// and mana comes back faster), mithril (strongest). Robes: apprentice robes
// (wool and lapis-blue) and archmage robes (purple wool and sapphires), each
// piece adding mana.
// ---------------------------------------------------------------------------
const SPELLS = {
  firebolt: { name: 'Firebolt', mana: 4, lvl: 1, col: '#ff7a2a', fx: 'mana_fire', desc: 'A bolt of fire that sets things alight.' },
  frost: { name: 'Frost Shard', mana: 4, lvl: 1, col: '#8ad8ff', fx: 'mana_frost', desc: 'A shard of ice that slows what it hits.' },
  light: { name: 'Witchlight', mana: 3, lvl: 3, col: '#fff0a0', fx: 'mana_light', desc: 'A floating light that follows you about for two minutes.' },
  heal: { name: 'Mend', mana: 8, lvl: 5, col: '#7aff8a', fx: 'mana_heal', desc: 'Closes your wounds.' },
  levitate: { name: 'Levitate', mana: 6, lvl: 10, col: '#c8e8ff', fx: 'mana_frost', desc: 'Float on the air for a while: jump to rise, sneak to sink.' },
  stoneskin: { name: 'Stoneskin', mana: 8, lvl: 12, col: '#c8b898', fx: 'mana_stone', desc: 'Your skin hardens like stone: a third less harm, and you hardly get knocked back, for a minute.' },
  blink: { name: 'Blink', mana: 6, lvl: 15, col: '#c88cff', fx: 'mana_arcane', desc: 'Step through space to where you look.' },
  familiar: { name: 'Spirit Wolf', mana: 12, lvl: 18, col: '#8ad0ff', fx: 'mana_frost', desc: 'Calls a spirit wolf to fight at your side for a while.' },
  ward: { name: 'Ward', mana: 8, lvl: 20, col: '#ffe08a', fx: 'mana_light', desc: 'A shield of light that soaks up harm for a while.' },
  lightning: { name: 'Call Lightning', mana: 16, lvl: 30, col: '#e8f0ff', fx: 'mana_light', desc: 'Lightning strikes where you look.' },
};
const SPELL_ORDER = Object.keys(SPELLS);
const STAFFS = {
  apprentice_staff: { name: 'Apprentice Staff', power: 1, gem: '#3ad07a', mat: 'emerald' },
  ruby_staff: { name: 'Ruby Staff', power: 1.3, fire: 1.5, gem: '#e02a4a', mat: 'ruby' },
  sapphire_staff: { name: 'Sapphire Staff', power: 1.3, frost: 1.5, regen: 0.5, gem: '#2a6ae0', mat: 'sapphire' },
  mithril_staff: { name: 'Mithril Staff', power: 1.75, regen: 0.4, gem: '#c8f0ff', mat: 'mithril_ingot' },
};
const ROBES = {
  mage: { label: 'Apprentice', mat: 'blue_wool', pts: [1, 3, 2, 1], dur: 8, mana: 4, regen: 0.15, cols: ['#3a5ab8', '#22346e', '#e8c040'], names: ['Hood', 'Robe', 'Skirts', 'Shoes'] },
  archmage: { label: 'Archmage', mat: 'purple_wool', gem: 'sapphire', pts: [2, 4, 3, 1], dur: 18, mana: 8, regen: 0.3, cols: ['#6a2a9a', '#3a1258', '#e8c8ff'], names: ['Hood', 'Robe', 'Skirts', 'Shoes'] },
};
{
  for (const [k, s] of Object.entries(SPELLS)) defItem('tome_' + k, { name: 'Tome: ' + s.name, maxStack: 1, desc: s.desc + ` (Magic ${s.lvl})`, rarity: s.lvl >= 20 ? 'epic' : s.lvl >= 5 ? 'rare' : undefined, tome: k });
  for (const [k, s] of Object.entries(STAFFS)) {
    defItem(k, { name: s.name, maxStack: 1, staff: s, tool: { type: 'staff', tier: 0, speed: 1, damage: 3, durability: Math.round(240 * s.power * s.power) }, desc: 'Use to cast your spell · G to change spell' });
    if (ITEMS[s.mat] || B[s.mat] !== undefined) RECIPES.push({ out: k, n: 1, shape: ['  G', ' S ', 'S  '], key: { G: s.mat, S: k === 'mithril_staff' ? 'sapphire' : 'stick' }, group: 'tools' });
  }
  for (const [mk, m] of Object.entries(ROBES)) {
    ARMOR_MATS[mk] = { label: m.label, mat: m.mat, pts: m.pts, dur: m.dur };
    ARMOR_PIECES.forEach((pc, i) => {
      defItem(mk + '_' + pc.key, { name: m.label + ' ' + m.names[i], maxStack: 1, icon: mk + '_' + pc.key, armor: { slot: pc.slot, points: m.pts[pc.slot], durability: m.dur * pc.durMul, mana: m.mana, regen: m.regen }, desc: `+${m.mana} mana` });
      const shape = m.gem ? [['MGM', 'M M'], ['M M', 'MGM', 'MMM'], ['MGM', 'M M', 'M M'], ['M M', 'G G']][pc.slot] : ARMOR_SHAPES[pc.slot];
      if (ITEMS[m.mat] || B[m.mat] !== undefined) RECIPES.push({ out: mk + '_' + pc.key, n: 1, shape, key: m.gem ? { M: m.mat, G: m.gem } : { M: m.mat }, group: 'armor' });
    });
  }
  // the librarian's and the healer's shelves
  if (typeof NPC_SHOPS !== 'undefined') {
    NPC_SHOPS.librarian.buy.push(['tome_firebolt', 1, 8, 0], ['tome_frost', 1, 8, 1], ['tome_light', 1, 6, 0], ['tome_heal', 1, 10, 1], ['apprentice_staff', 1, 6, 0], ['tome_levitate', 1, 14, 2], ['tome_stoneskin', 1, 15, 2], ['tome_blink', 1, 16, 2], ['tome_ward', 1, 18, 3]);
    NPC_SHOPS.cleric.buy.push(['mage_helmet', 1, 4, 0], ['mage_chestplate', 1, 7, 0], ['mage_leggings', 1, 6, 1], ['mage_boots', 1, 3, 1], ['tome_heal', 1, 9, 1]);
  }
}
// ---- the pictures ------------------------------------------------------------------------------------------
{
  for (const [mk, m] of Object.entries(ROBES)) ARMOR_COLORS[mk] = m.cols.map(hexRGB);
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    // tomes: a thick book in its spell's colour with a glowing rune
    for (const [k, s] of Object.entries(SPELLS)) addItem('tome_' + k, p => {
      const c = H(s.col), d = shade(c, 0.45), m = shade(c, 0.75);
      for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) p.set(x, y, x === 3 ? d : y === 3 || y === 13 ? m : shade(m, 0.9 + p.rand() * 0.1));
      for (let y = 4; y < 13; y++) { p.set(12, y, H('#e8e0c8')); p.set(13, y, H('#c8c0a8')); }
      for (const [x, y] of [[7, 6], [8, 7], [7, 8], [8, 9], [6, 7], [9, 8], [7, 10]]) p.set(x, y, shade(c, 1.6));
      p.set(5, 4, H('#e8c040')); p.set(5, 12, H('#e8c040'));
    });
    // staffs: a long shaft, a gem at the head in a claw
    for (const [k, s] of Object.entries(STAFFS)) addItem(k, p => {
      const wood = k === 'mithril_staff' ? H('#b8c8d8') : H('#7a5230'), woodL = shade(wood, 1.3), gem = H(s.gem);
      for (let i = 0; i < 11; i++) { p.set(2 + i, 13 - i, wood); p.set(3 + i, 13 - i, woodL); }
      for (const [x, y] of [[12, 1], [13, 1], [14, 2], [14, 3], [11, 2], [13, 4]]) p.set(x, y, shade(wood, 0.8));
      for (const [x, y, k2] of [[12, 2, 1.4], [13, 2, 1.1], [12, 3, 1], [13, 3, 0.8]]) p.set(x, y, shade(gem, k2));
    });
    // robes as worn: soft cloth with a trim
    for (const [mk, m] of Object.entries(ROBES)) {
      const [c, d, l] = m.cols.map(H);
      const cloth = (p) => { p.noise(c, 0.1); for (let y = 0; y < 16; y += 3) for (let x = 0; x < 16; x++) if (p.rand() < 0.3) p.set(x, y, shade(c, 0.9)); for (let x = 0; x < 16; x++) { p.set(x, 15, l); p.set(x, 14, d); } if (mk === 'archmage') for (let k = 0; k < 5; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 13), l); };
      addTile('armor_' + mk, cloth);
      addTile('armor_' + mk + '_face', p => { cloth(p); for (let y = 3; y < 15; y++) for (let x = 3; x < 13; x++) p.set(x, y, [0, 0, 0], 0); });
    }
    // spell sparks
    // soft round glows: a white-hot middle fading out through the spell's colour
    for (const [k, c] of [['mana_fire', '#ff8a2a'], ['mana_frost', '#7ad8ff'], ['mana_heal', '#5aff6a'], ['mana_arcane', '#b87aff'], ['mana_light', '#ffe08a'], ['mana_stone', '#b8a080']]) addTile(k, p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 7.5; p.set(x, y, mix(H('#ffffff'), H(c), clamp(d * 1.6, 0, 1)), d < 1 ? Math.round(255 * Math.pow(1 - d, 1.3)) : 0); } });
  };
}
// ---- sounds -------------------------------------------------------------------------------------------------
Object.assign(SND_FX, {
  spell_fire: [0.6, 0.6, (b, v, r) => { b.noise(0, 0.5, 'bp', 900, 0.7, 0.8, { sweep: 0.5, att: 0.01 }); b.noise(0, 0.35, 'lp', 400, 0.7, 0.6, { brown: true, att: 0.005 }); b.grains(0.02, 0.4, 16, 1500, 5000, 1.2, 0.25, { fade: true }); }],
  spell_frost: [0.6, 0.55, (b, v, r) => { b.noise(0, 0.4, 'hp', 3500, 0.8, 0.5, { sweep: 1.6, att: 0.01 }); b.modes(0.02, [[2100, 0.12, 0.4], [3170, 0.09, 0.3], [4410, 0.06, 0.2]], 0.5); b.grains(0.05, 0.3, 10, 3000, 7000, 2, 0.2); }],
  spell_heal: [1.0, 0.5, (b, v, r) => { for (let i = 0; i < 4; i++) b.modes(i * 0.09, [[523 * Math.pow(1.26, i), 0.35, 0.5], [1046 * Math.pow(1.26, i), 0.2, 0.2]], 0.45); b.noise(0, 0.8, 'hp', 5000, 0.7, 0.08, { att: 0.2 }); }],
  spell_blink: [0.5, 0.6, (b, v, r) => { b.noise(0, 0.35, 'bp', 600, 2, 0.8, { sweep: 6, att: 0.005 }); b.thump(0.18, 300, 60, 0.15, 0.6); }],
  spell_ward: [0.9, 0.5, (b, v, r) => { b.modes(0, [[392, 0.5, 0.4], [587, 0.4, 0.3], [784, 0.35, 0.25], [1175, 0.25, 0.15]], 0.5); b.noise(0, 0.6, 'bp', 2400, 3, 0.15, { att: 0.15 }); }],
  spell_zap: [1.2, 0.85, (b, v, r) => { b.noise(0, 0.08, 'hp', 2000, 0.7, 1, { att: 0.0005 }); b.noise(0.02, 1.1, 'lp', 300, 0.7, 0.9, { brown: true, att: 0.01, curve: 0.6 }); b.thump(0, 120, 40, 0.6, 0.8); }],
  spell_fizzle: [0.3, 0.45, (b, v, r) => { b.noise(0, 0.25, 'bp', 1200, 1, 0.5, { sweep: 0.4 }); }],
  spell_hit: [0.4, 0.55, (b, v, r) => { b.noise(0, 0.3, 'bp', 700, 0.8, 0.8, { att: 0.002 }); b.thump(0, 200, 80, 0.12, 0.5); }],
});

// ---- mana -----------------------------------------------------------------------------------------------------
function magicOf(p) { const s = p.stats || (p.stats = {}); s.spells = s.spells || []; return s; }
function manaMax(p) {
  let m = 20 + Math.floor((typeof skillLv === 'function' ? skillLv(p, 'magic') : 1) / 2);
  for (const s of p.inv.armor.slots) { const d = s && itemDef(s.id); if (d && d.armor && d.armor.mana) m += d.armor.mana; }
  return m;
}
function manaRegen(p) {
  let r = 0.5;
  for (const s of p.inv.armor.slots) { const d = s && itemDef(s.id); if (d && d.armor && d.armor.regen) r += d.armor.regen; }
  const h = p.inv.held, d = h && itemDef(h.id); if (d && d.staff && d.staff.regen) r += d.staff.regen;
  return r;
}
function spellFx(g, x, y, z, tile, n, speed, o = {}) {
  const uv = tileUV(ATLAS.tile[tile] ?? ATLAS.tile.white);
  for (let i = 0; i < n; i++) {
    const life = (o.life || 0.5) * (0.6 + Math.random() * 0.8), size = (o.size || 0.08) * (0.7 + Math.random() * 0.6);
    g.particles.add({ x: x + (Math.random() - 0.5) * (o.spread || 0.3), y: y + (Math.random() - 0.5) * (o.spread || 0.3), z: z + (Math.random() - 0.5) * (o.spread || 0.3),
      vx: (Math.random() - 0.5) * 2 * speed + (o.vx || 0), vy: (Math.random() - 0.5) * 2 * speed + (o.vy || 0), vz: (Math.random() - 0.5) * 2 * speed + (o.vz || 0),
      life, max: life, size, size0: size, uv, light: 0xFF, grav: o.grav ?? 0, shrink: !o.grow, grow: o.grow || 0, flutter: o.flutter || 0, ph: Math.random() * 6 });
  }
}
// one spark, placed exactly
function spellSpark(g, x, y, z, tile, o = {}) {
  const life = o.life || 0.5, size = o.size || 0.08;
  g.particles.add({ x, y, z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, life, max: life, size, size0: size, uv: tileUV(ATLAS.tile[tile] ?? ATLAS.tile.white), light: 0xFF, grav: o.grav ?? 0, shrink: !o.grow, grow: o.grow || 0, flat: !!o.flat, flutter: o.flutter || 0, ph: Math.random() * 6 });
}
// a ring of light on the ground (or in the air), spreading out
function spellRing(g, x, y, z, tile, r, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, c = Math.cos(a), s = Math.sin(a), sp = o.speed ?? 1.2;
    spellSpark(g, x + c * r, y, z + s * r, tile, { vx: c * sp, vy: o.vy || 0, vz: s * sp, life: o.life || 0.6, size: o.size || 0.09, flat: o.flat });
  }
}
// a spiral of motes rising round a body
function spellSpiral(g, x, y, z, tile, n, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU * (o.turns || 3), r = o.r || 0.7, h = i / n * (o.h || 2);
    spellSpark(g, x + Math.cos(a) * r, y + h, z + Math.sin(a) * r, tile, { vx: -Math.sin(a) * 0.8, vy: o.vy ?? 0.9, vz: Math.cos(a) * 0.8, life: (o.life || 0.9) * (0.7 + Math.random() * 0.6), size: o.size || 0.08 });
  }
}
// the circle under your feet as you cast
function castCircle(g, x, y, z, S) {
  spellRing(g, x, y + 0.06, z, S.fx, 0.95, 28, { speed: 0.25, life: 0.7, size: 0.1, flat: true });
  spellRing(g, x, y + 0.06, z, 'mana_arcane', 0.55, 14, { speed: -0.2, life: 0.6, size: 0.07, flat: true });
  for (let i = 0; i < 10; i++) { const a = Math.random() * TAU; spellSpark(g, x + Math.cos(a) * 0.9, y + 0.1, z + Math.sin(a) * 0.9, S.fx, { vy: 1.6 + Math.random(), life: 0.6, size: 0.06 }); }
}
// ---- a bolt in flight --------------------------------------------------------------------------------------------
class SpellBolt extends Entity {
  constructor(game, x, y, z, vx, vy, vz, spell, caster, dmg) {
    super(game, x, y, z); this.netLocalOnly = true; this.vx = vx; this.vy = vy; this.vz = vz; this.spell = spell; this.caster = caster; this.dmg = dmg; this.w = 0.2; this.h = 0.3;
  }
  update(dt) {
    const g = this.game, S = SPELLS[this.spell];
    this.age += dt;
    if (this.age > 2.4) { this.remove = true; return; }
    for (let s = 0; s < 4; s++) {
      this.x += this.vx * dt / 4; this.y += this.vy * dt / 4; this.z += this.vz * dt / 4;
      for (const e of g.entities) {
        if (!(e instanceof Mob) || !e.alive || e.ghost && !g.isGuest || e === this.caster) continue;
        if (e.npc && !e.T.hostile) continue;
        if (Math.abs(e.x - this.x) < e.w + 0.25 && Math.abs(e.z - this.z) < e.w + 0.25 && this.y > e.y - 0.1 && this.y < e.y + e.h + 0.1) { this.hit(e); return; }
      }
      if (T_SOLID[g.world.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))]) { this.hit(null); return; }
    }
    // the trail: a bright core, two strands twisting round it, and the spell's own leavings
    const v = Math.hypot(this.vx, this.vy, this.vz) || 1, ux = this.vx / v, uy = this.vy / v, uz = this.vz / v;
    const px = -uz, pz = ux, a = this.age * 26;
    spellFx(g, this.x, this.y, this.z, S.fx, 3, 0.25, { life: 0.3, size: 0.12, spread: 0.12 });
    for (const k of [0, Math.PI]) { const c = Math.cos(a + k) * 0.22, sn = Math.sin(a + k) * 0.22; spellSpark(g, this.x + px * c, this.y + sn, this.z + pz * c, k ? 'mana_arcane' : S.fx, { life: 0.45, size: 0.06, vx: -ux * 0.6, vy: -uy * 0.6, vz: -uz * 0.6 }); }
    if (this.spell === 'firebolt') { if (Math.random() < 0.8) spellSpark(g, this.x, this.y, this.z, 'mana_fire', { vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 0.5, vz: (Math.random() - 0.5) * 1.5, grav: 4, life: 0.7, size: 0.05 }); if (Math.random() < 0.5) g.flame(this.x, this.y, this.z); }
    else spellSpark(g, this.x + (Math.random() - 0.5) * 0.3, this.y + (Math.random() - 0.5) * 0.3, this.z + (Math.random() - 0.5) * 0.3, 'mana_frost', { vy: -0.4, grav: 0.4, life: 1.1, size: 0.05, flutter: 1.2 });
  }
  hit(e) {
    const g = this.game, S = SPELLS[this.spell];
    this.remove = true;
    if (this.visual) e = null;
    spellFx(g, this.x, this.y, this.z, S.fx, 34, 2.6, { life: 0.55, size: 0.11 });
    spellFx(g, this.x, this.y, this.z, 'mana_arcane', 12, 1.2, { life: 0.8, size: 0.07 });
    spellRing(g, this.x, this.y, this.z, S.fx, 0.2, 18, { speed: 3, life: 0.4, size: 0.08 });
    for (let i = 0; i < 8; i++) spellSpark(g, this.x + (Math.random() - 0.5), this.y + (Math.random() - 0.5), this.z + (Math.random() - 0.5), S.fx, { vy: 0.3, life: 1.4, size: 0.05, flutter: 0.8 });
    if (this.spell === 'firebolt') for (let i = 0; i < 6; i++) g.flame(this.x + (Math.random() - 0.5) * 0.6, this.y + (Math.random() - 0.5) * 0.6, this.z + (Math.random() - 0.5) * 0.6);
    g.sfx.playAt('spell_hit', this.x, this.y, this.z);
    if (!e) return;
    const src = { type: 'magic', attacker: this.caster, element: this.spell === 'firebolt' ? 'fire' : 'frost', knock: 1 };
    if (g.isGuest && g.net) g.net.sendHit(e, this.dmg, src);
    else {
      e.hurt(this.dmg, src);
      if (this.spell === 'firebolt' && !e.T.fireImmune) e.burn = Math.max(e.burn || 0, 4);
      if (this.spell === 'frost') e.slowT = Math.max(e.slowT || 0, 4);
    }
  }
  snap() { return null; }
  draws() {}
  glow(out) { const uv = tileUV(ATLAS.tile[SPELLS[this.spell].fx] ?? ATLAS.tile.white); out.push({ x: this.x, y: this.y, z: this.z, size: 0.34 + Math.sin(this.age * 40) * 0.05, uv, light: 0xFF }); out.push({ x: this.x, y: this.y, z: this.z, size: 0.55, uv: tileUV(ATLAS.tile.mana_arcane ?? ATLAS.tile.white), light: 0xFF }); }
}

// ---- casting ---------------------------------------------------------------------------------------------------------
Object.assign(LocalPlayer.prototype, {
  heldStaff() { const h = this.player.inv.held, d = h && itemDef(h.id); return d && d.staff ? d.staff : null; },
  activeSpell() { const M = magicOf(this.player); if (!M.spells.length) return null; M.spell = M.spell % M.spells.length || 0; return M.spells[M.spell]; },
  cycleSpell() {
    const M = magicOf(this.player);
    if (!M.spells.length) { this.toast('You know no spells yet — read a spell tome', ''); return; }
    M.spell = ((M.spell || 0) + 1) % M.spells.length;
    this.toast(SPELLS[M.spells[M.spell]].name, '');
    this.g.sfx.play('click');
  },
  learnTome(k, s) {
    const p = this.player, M = magicOf(p), S = SPELLS[k];
    if (M.spells.includes(k)) { this.toast(`You already know ${S.name}`, ''); return; }
    const lv = typeof skillLv === 'function' ? skillLv(p, 'magic') : 99;
    if (lv < S.lvl) { this.toast(`The words swim on the page. You need Magic ${S.lvl} to learn ${S.name}`, 'warn'); return; }
    M.spells.push(k); M.spell = M.spells.length - 1;
    if (!this.g.creative) { s.n--; if (s.n <= 0) p.inv.held = null; }
    this.toast(`You have learned ${S.name}!${M.spells.length === 1 ? ' Hold a staff and use it to cast' : ''}`, 'epic');
    this.g.sfx.play('levelup');
    if (typeof skillGain === 'function') skillGain(this, 'magic', 40 * S.lvl);
    spellSpiral(this.g, p.x, p.y, p.z, S.fx, 70, { r: 0.9, h: 2.6, turns: 4, life: 1.3 });
    spellFx(this.g, p.x, p.y + 1.2, p.z, 'mana_arcane', 30, 1.2, { life: 1.2, size: 0.06, flutter: 1 });
  },
  castSpell() {
    const g = this.g, p = this.player, st = this.heldStaff(), k = this.activeSpell();
    if (!st) return false;
    if (!k) { this.toast('You know no spells yet — read a spell tome', ''); return true; }
    if ((this.castCd || 0) > 0) return true;
    const S = SPELLS[k];
    if (p.mana === undefined) p.mana = manaMax(p);
    if (p.mana < S.mana && !g.creative) { this.toast('Not enough mana', 'warn'); g.sfx.play('spell_fizzle'); this.castCd = 0.4; return true; }
    const lv = typeof skillLv === 'function' ? skillLv(p, 'magic') : 1;
    const power = st.power * (1 + (lv - 1) / 98 * 0.6) * (1 + (typeof gearBonus === 'function' ? gearBonus(p.inv.held, 0.2) : 0));   // (0.9.0.24) the skill counts for less (it out-scaled melee 3 to 1); a well-used staff counts too
    const look = lookVector(p.yaw, p.pitch), ex = p.x, ey = p.y + 1.55, ez = p.z;
    let ok = true;
    switch (k) {
      case 'firebolt': case 'frost': {
        const mul = k === 'firebolt' ? st.fire || 1 : st.frost || 1, sp = 26;
        const bolt = new SpellBolt(g, ex + look[0] * 0.6, ey + look[1] * 0.6 - 0.25, ez + look[2] * 0.6, look[0] * sp, look[1] * sp, look[2] * sp, k, this, Math.round((k === 'firebolt' ? 6 : 4.5) * power * mul));
        g.addEntity(bolt); this._bolt = [bolt.x, bolt.y, bolt.z, bolt.vx, bolt.vy, bolt.vz].map(v => +v.toFixed(2));
        g.sfx.playAt(k === 'firebolt' ? 'spell_fire' : 'spell_frost', ex, ey, ez);
        break;
      }
      case 'heal': {
        if (p.health >= p.maxHealth) { this.toast('You are not hurt', ''); ok = false; break; }
        p.heal(Math.round(5 * power));
        spellSpiral(g, p.x, p.y + 0.1, p.z, S.fx, 48, { r: 0.75, h: 2.1, turns: 3, life: 1.1 });
        spellFx(g, p.x, p.y + 1, p.z, S.fx, 20, 0.5, { life: 1.4, vy: 0.9, spread: 1.1, size: 0.06, flutter: 1 });
        spellRing(g, p.x, p.y + 0.06, p.z, S.fx, 0.3, 24, { speed: 2.2, life: 0.6, flat: true });
        g.sfx.play('spell_heal');
        break;
      }
      case 'blink': {
        const w = g.world, max = 10 + Math.round(4 * power);
        let best = null;
        for (let d = 1.5; d <= max; d += 0.5) {
          const x = ex + look[0] * d, y = ey + look[1] * d, z = ez + look[2] * d;
          if (T_SOLID[w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))]) break;
          // somewhere to stand at or below this point
          for (let fy = Math.floor(y - 1.4); fy >= Math.floor(y - 3); fy--) {
            if (T_SOLID[w.getBlock(Math.floor(x), fy - 1, Math.floor(z))] && !T_SOLID[w.getBlock(Math.floor(x), fy, Math.floor(z))] && !T_SOLID[w.getBlock(Math.floor(x), fy + 1, Math.floor(z))]) { best = [Math.floor(x) + 0.5, fy, Math.floor(z) + 0.5]; break; }
          }
        }
        if (!best) { this.toast('Nowhere to blink to', ''); ok = false; break; }
        // a vortex where you were, a streak of light along the way, a burst where you land
        for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, r = 1.1, hh = Math.random() * 2; spellSpark(g, p.x + Math.cos(a) * r, p.y + hh, p.z + Math.sin(a) * r, S.fx, { vx: -Math.cos(a) * 2 - Math.sin(a) * 2, vy: 0.2, vz: -Math.sin(a) * 2 + Math.cos(a) * 2, life: 0.5, size: 0.08 }); }
        const fx0 = p.x, fy0 = p.y + 1, fz0 = p.z, L = Math.hypot(best[0] - fx0, best[1] + 1 - fy0, best[2] - fz0);
        for (let t = 0; t <= L; t += 0.35) { const k = t / L; spellSpark(g, fx0 + (best[0] - fx0) * k, fy0 + (best[1] + 1 - fy0) * k, fz0 + (best[2] - fz0) * k, k > 0.5 ? S.fx : 'mana_arcane', { life: 0.5 + k * 0.3, size: 0.07, vy: 0.2 }); }
        p.x = best[0]; p.y = best[1]; p.z = best[2]; p.vx = p.vy = p.vz = 0; p.fallStart = null;
        spellFx(g, p.x, p.y + 1, p.z, S.fx, 40, 2, { life: 0.6, spread: 0.6 });
        spellRing(g, p.x, p.y + 0.06, p.z, S.fx, 0.3, 24, { speed: 2.6, life: 0.5, flat: true });
        g.sfx.play('spell_blink');
        break;
      }
      case 'light': {
        p.lightT = Math.round(100 + 40 * power);
        spellSpiral(g, p.x, p.y + 0.4, p.z, S.fx, 30, { r: 0.5, h: 1.6, turns: 2, life: 0.8 });
        g.sfx.play('spell_heal'); this.toast('A witchlight follows you', 'good');
        break;
      }
      case 'levitate': {
        p.levT = Math.round(10 + 6 * power); p.fallStart = null;
        spellRing(g, p.x, p.y + 0.06, p.z, S.fx, 0.4, 28, { speed: 2, life: 0.7, flat: true });
        spellFx(g, p.x, p.y + 0.3, p.z, 'mana_arcane', 24, 0.8, { life: 0.8, vy: 1.5, spread: 0.8 });
        g.sfx.play('spell_ward'); this.toast(`Levitating (${p.levT} s) · jump to rise, sneak to sink`, 'good');
        break;
      }
      case 'stoneskin': {
        p.stoneT = Math.round(45 + 15 * power);
        for (let i = 0; i < 40; i++) { const a = Math.random() * TAU, hh = Math.random() * 1.9; spellSpark(g, p.x + Math.cos(a) * 0.9, p.y + hh, p.z + Math.sin(a) * 0.9, S.fx, { vx: -Math.cos(a) * 1.4, vz: -Math.sin(a) * 1.4, life: 0.45, size: 0.08 }); }
        g.burst(p.x, p.y + 1, p.z, 'stone', 12, 1.2);
        g.sfx.play('spell_ward'); this.toast(`Stoneskin (${p.stoneT} s)`, 'good');
        break;
      }
      case 'familiar': {
        if (typeof summonFamiliar === 'function') summonFamiliar(this, power);
        g.sfx.play('spell_heal');
        break;
      }
      case 'ward': {
        p.ward = Math.round(6 * power); p.wardT = 30;
        for (let i = 0; i < 60; i++) { const a = Math.random() * TAU, b = Math.acos(Math.random() * 2 - 1), r = 1.1; spellSpark(g, p.x + Math.sin(b) * Math.cos(a) * r, p.y + 1 + Math.cos(b) * r, p.z + Math.sin(b) * Math.sin(a) * r, S.fx, { vx: Math.sin(b) * Math.cos(a) * 0.4, vy: Math.cos(b) * 0.4, vz: Math.sin(b) * Math.sin(a) * 0.4, life: 0.9, size: 0.07 }); }
        spellRing(g, p.x, p.y + 0.06, p.z, S.fx, 1.2, 30, { speed: -0.8, life: 0.8, flat: true });
        g.sfx.play('spell_ward'); this.toast(`Warded (${p.ward} harm)`, 'good');
        break;
      }
      case 'lightning': {
        // the first thing along your gaze, out to 40 blocks
        const w = g.world; let at = null;
        for (let d = 2; d <= 40 && !at; d += 0.5) {
          const x = ex + look[0] * d, y = ey + look[1] * d, z = ez + look[2] * d;
          for (const e of g.entities) if (e instanceof Mob && e.alive && !(e.npc && !e.T.hostile) && Math.abs(e.x - x) < e.w + 0.4 && Math.abs(e.z - z) < e.w + 0.4 && y > e.y - 0.2 && y < e.y + e.h + 0.3) { at = [e.x, e.y, e.z]; break; }
          if (!at && T_SOLID[w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))]) at = [x, Math.floor(y) + 1, z];
        }
        if (!at) { this.toast('Nothing there to strike', ''); ok = false; break; }
        if (typeof LightningBolt === 'function') g.addEntity(new LightningBolt(g, at[0], at[1], at[2]));
        g.sfx.playAt('spell_zap', at[0], at[1], at[2], 80);
        if (g.weather) g.weather.flashT = 0.25;
        const dmg = Math.round(9 * power);
        for (const e of g.entities) if (e instanceof Mob && e.alive && !(e.npc && !e.T.hostile) && Math.hypot(e.x - at[0], e.z - at[2]) < 2.6 && Math.abs(e.y - at[1]) < 3) {
          const src = { type: 'magic', attacker: this, element: 'lightning', knock: 2 };
          if (g.isGuest && g.net) g.net.sendHit(e, dmg, src); else { e.hurt(dmg, src); e.burn = Math.max(e.burn || 0, 3); }
        }
        spellFx(g, at[0], at[1] + 0.5, at[2], 'mana_light', 50, 3.5, { life: 0.5 });
        spellFx(g, at[0], at[1] + 0.2, at[2], 'mana_arcane', 30, 2, { life: 1, size: 0.06, grav: 3 });
        spellRing(g, at[0], at[1] + 0.06, at[2], 'mana_light', 0.4, 32, { speed: 4, life: 0.5, flat: true });
        for (let i = 0; i < 8; i++) g.flame(at[0] + (Math.random() - 0.5) * 1.5, at[1] + 0.2, at[2] + (Math.random() - 0.5) * 1.5);
        break;
      }
    }
    if (!ok) { this.castCd = 0.3; return true; }
    if (!g.creative) p.mana -= S.mana;
    this.castCd = k === 'lightning' ? 2.2 : 0.45;
    this.swingArm();
    this.wearHeld(1);
    if (typeof skillGain === 'function') skillGain(this, 'magic', S.mana * 6);
    if (typeof gearGain === 'function') gearGain(this, p.inv.held, 2);
    spellFx(g, ex + look[0] * 0.8, ey + look[1] * 0.8 - 0.2, ez + look[2] * 0.8, S.fx, 14, 0.8, { life: 0.4 });
    castCircle(g, p.x, p.y, p.z, S);
    if (g.net) g.net[g.isGuest ? 'send' : 'all']({ t: 'adv', k: 'cast', s: k, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), b: this._bolt || 0 });
    this._bolt = null;
    return true;
  },
});
{
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const p = this.player, h = p.inv.held, d = h && itemDef(h.id);
    if (!fromOff && d && d.tome) { if (!repeat) this.learnTome(d.tome, h); return; }
    if (!fromOff && d && d.staff && !(this.targetEnt && this.targetEnt.npc)) {
      if (repeat) { if ((this.castCd || 0) <= 0 && this.activeSpell() && !['heal', 'blink', 'ward', 'light', 'levitate', 'stoneskin', 'familiar'].includes(this.activeSpell())) this.castSpell(); return; }
      if (p.sneaking) { this.cycleSpell(); return; }
      const hit = this.target, b = hit && BLOCKS[hit.id];
      if (b && (b.container || b.table || b.door || b.station || b.questBoard || b.bed)) return baseUse.call(this, repeat, inp, fromOff);
      this.castSpell(); return;
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  const baseHas = itemHasUse;
  itemHasUse = function (d) { return !!(d && (d.staff || d.tome)) || baseHas(d); };
  // the ward soaks up harm before your health does
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const p = this.player;
    if (p.ward > 0 && amount > 0 && !src.bypass) {
      const soak = Math.min(p.ward, amount); p.ward -= soak; amount -= soak;
      if (src._raw) src._raw = Math.max(0, src._raw - soak);   // (0.9.0.31) the fifth that always gets through is of what the ward let past
      spellFx(this.g, p.x, p.y + 1, p.z, 'mana_light', 10, 1.2, { life: 0.4, spread: 1 });
      if (p.ward <= 0) { p.ward = 0; this.toast('Your ward breaks', ''); }
      if (amount <= 0) return;
    }
    return baseHurt.call(this, amount, src);
  };
  // the G key: change spell
  const at = KEY_ACTIONS.findIndex(a => a[0] === 'hideHud');
  KEY_ACTIONS.splice(at < 0 ? KEY_ACTIONS.length : at, 0, ['spell', 'Change spell', ['KeyG']]);
  KEY_DEFAULTS.spell = ['KeyG'];
  const basePress = InputManager.prototype.pressCode;
  InputManager.prototype.pressCode = function (code, e) { const r = basePress.call(this, code, e); if (this.actionsFor(code).includes('spell')) this.s.spell = true; return r; };
  const baseEnd = InputManager.prototype.endFrame;
  InputManager.prototype.endFrame = function () { baseEnd.call(this); this.s.spell = false; };
  const baseMerge = mergeInput;
  mergeInput = function (a, b) { const r = baseMerge(a, b); a.spell = a.spell || b.spell; return r; };
  // mana comes back; the bar
  const baseUpdate = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    if (inp.spell && this.mode === 'play') this.cycleSpell();
    const r = baseUpdate.call(this, dt, inp);
    const p = this.player, M = magicOf(p);
    if (this.castCd > 0) this.castCd -= dt;
    const max = manaMax(p);
    if (p.mana === undefined) p.mana = max;
    if (p.mana < max) p.mana = Math.min(max, p.mana + manaRegen(p) * dt);
    if (p.mana > max) p.mana = max;
    if (p.wardT > 0) { p.wardT -= dt; if (p.wardT <= 0) p.ward = 0; }
    const g = this.g;
    if (p.ward > 0 && g.state === 'playing') for (let k = 0; k < 2; k++) { const a = g.time * 3 + k * Math.PI + Math.random() * 0.3, b = g.time * 1.7 + k; spellSpark(g, p.x + Math.cos(a) * 0.8, p.y + 1 + Math.sin(b) * 0.8, p.z + Math.sin(a) * 0.8, 'mana_light', { life: 0.35, size: 0.05 }); }
    const stf = this.heldStaff();
    if (stf && g.state === 'playing' && !p.dead && Math.random() < dt * 14) {
      // motes round the head of the staff: in first person at the tip of the staff as drawn in your hand,
      // otherwise where the hand holds it up, on the right
      const k = this.activeSpell(), tile = k ? SPELLS[k].fx : 'mana_arcane', tip = this._staffTip;
      if (!this.viewMode && tip && g.time - tip.t < 0.5) {
        // just above and around the gem, so the staff itself (drawn over the world) doesn't hide them
        const a = Math.random() * TAU, r = 0.05 + Math.random() * 0.05;
        const [tx, ty, tz] = handTipWorld(this, [tip.v[0] + Math.cos(a) * r, tip.v[1] + 0.05 + Math.sin(a) * r * 0.6, tip.v[2]]);
        spellSpark(g, tx, ty, tz, tile, { vy: 0.18, life: 0.55, size: 0.022, flutter: 0.25 });
      } else if (this.viewMode) {
        const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw), fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), j = () => (Math.random() - 0.5) * 0.12;
        spellSpark(g, p.x + rx * 0.38 + fx * 0.3 + j(), p.y + (p.sneaking ? 1.3 : 1.6) + j(), p.z + rz * 0.38 + fz * 0.3 + j(), tile, { vy: 0.35, life: 0.45, size: 0.035, flutter: 0.6 });
      }
    }
    // the bar, shown once you know magic
    const show = M.spells.length > 0 || !!this.heldStaff();
    let el = this._manaEl;
    if (show && !el && this.el) {
      const row = this.el.querySelector('.xprow');
      if (row) { el = this._manaEl = document.createElement('div'); el.className = 'manarow'; el.innerHTML = '<div class="manabar"><div class="manafill"></div></div><span class="spellname"></span>'; row.after(el); }
    }
    if (el) {
      el.hidden = !show;
      const k = this.activeSpell(), txt = (k ? SPELLS[k].name : 'No spells') + ` · ${Math.floor(p.mana)}/${max}` + (p.ward > 0 ? ` · ward ${p.ward}` : '');
      const w = Math.round(p.mana / max * 1000) / 10 + '%';
      if (el._w !== w) { el._w = w; el.firstChild.firstChild.style.width = w; }
      if (el._t !== txt) { el._t = txt; el.lastChild.textContent = txt; el.lastChild.style.color = k ? SPELLS[k].col : ''; }
    }
    return r;
  };
}

// ---- playing together: everyone sees everyone's magic ---------------------------------------------------------
function remoteCast(g, m) {
  const S = SPELLS[m.s]; if (!S || !g.world) return;
  castCircle(g, m.x, m.y, m.z, S);
  if (m.b && (m.s === 'firebolt' || m.s === 'frost')) { const b = new SpellBolt(g, m.b[0], m.b[1], m.b[2], m.b[3], m.b[4], m.b[5], m.s, null, 0); b.visual = true; g.addEntity(b); g.sfx.playAt(m.s === 'firebolt' ? 'spell_fire' : 'spell_frost', m.x, m.y + 1.5, m.z); }
  if (m.s === 'heal' || m.s === 'light') spellSpiral(g, m.x, m.y + 0.1, m.z, S.fx, 40, { r: 0.75, h: 2.1, turns: 3, life: 1.1 });
  if (m.s === 'stoneskin') g.burst(m.x, m.y + 1, m.z, 'stone', 12, 1.2);
}
{
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'cast') { remoteCast(this.g, m); this.all(m, from); return; }
    return baseHost.call(this, from, m);
  };
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv' && m.k === 'cast') { remoteCast(this.g, m); return; }
    return baseGuest.call(this, m);
  };
}

// ---- the Alteration spells at work: witchlight, levitation, stoneskin --------------------------------------------
{
  // the witchlight drifts after you, over your shoulder
  const witchAt = (lp) => {
    const p = lp.player, t = lp.g.time, a = p.yaw + Math.PI * 0.72;
    const want = [p.x - Math.sin(a) * 0.75, p.y + 2.05 + Math.sin(t * 2.1) * 0.12, p.z - Math.cos(a) * 0.75];
    const o = lp._witch || (lp._witch = want.slice());
    for (let i = 0; i < 3; i++) o[i] += (want[i] - o[i]) * 0.12;
    return o;
  };
  const baseLight = LocalPlayer.prototype.lightSource;
  LocalPlayer.prototype.lightSource = function () {
    const r = baseLight.call(this), p = this.player;
    if (!(p.lightT > 0) || p.dead || !this._witch) return r;
    const lv = 14.5 + Math.sin(this.g.time * 3.1) * 0.3, o = this._witch;
    return r && r[3] >= lv ? r : [o[0], o[1], o[2], lv];
  };
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const p = this.player;
    if (p.stoneT > 0 && amount > 0 && !src.bypass && src.type !== 'starve' && src.type !== 'void') {
      amount = amount * 0.66; if (src.knock !== undefined) src.knock *= 0.25; else src.knock = 1;
      this.g.burst(p.x, p.y + 1, p.z, 'stone', 4, 1);
    }
    return baseHurt.call(this, amount, src);
  };
  const baseUpdate = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseUpdate.call(this, dt, inp);
    const g = this.g, p = this.player;
    if (g.state !== 'playing') return r;
    if (p.dead) { p.lightT = p.levT = p.stoneT = 0; return r; }
    if (p.lightT > 0) {
      p.lightT -= dt;
      const o = witchAt(this);
      spellSpark(g, o[0], o[1], o[2], 'mana_light', { life: 0.07, size: 0.3 });
      spellSpark(g, o[0], o[1], o[2], 'mana_light', { life: 0.05, size: 0.14 });
      if (Math.random() < dt * 14) spellSpark(g, o[0] + (Math.random() - 0.5) * 0.3, o[1] + (Math.random() - 0.5) * 0.3, o[2] + (Math.random() - 0.5) * 0.3, 'mana_light', { vy: -0.3, life: 0.6, size: 0.04, flutter: 1 });
      if (p.lightT <= 0) { this._witch = null; this.toast('Your witchlight fades', ''); }
    }
    if (p.levT > 0) {
      p.levT -= dt; p.fallStart = null;
      const want = inp && inp.jump ? 3.4 : p.sneaking ? -2.6 : 0;
      if (!p.onGround || want > 0) p.vy = want + GRAVITY * dt;
      if (Math.random() < dt * 24) spellSpark(g, p.x + (Math.random() - 0.5) * 0.8, p.y - 0.05, p.z + (Math.random() - 0.5) * 0.8, Math.random() < 0.5 ? 'mana_frost' : 'mana_arcane', { vy: -0.8, life: 0.5, size: 0.05 });
      if (p.levT <= 0) { p.slowFallT = Math.max(p.slowFallT || 0, 5); this.toast('Your levitation fades — the air lets you down gently', ''); }
    }
    if (p.stoneT > 0) {
      p.stoneT -= dt;
      if (Math.random() < dt * 6) spellSpark(g, p.x + (Math.random() - 0.5) * 0.9, p.y + Math.random() * 1.8, p.z + (Math.random() - 0.5) * 0.9, 'mana_stone', { vy: -0.4, life: 0.5, size: 0.05 });
      if (p.stoneT <= 0) this.toast('Your stoneskin crumbles away', '');
    }
    return r;
  };
}

// ---- where the head of the staff in your hand is (0.9.0.10) ------------------------------------------------------
// The hand is drawn with its own lens, so its spot is found in hand space and carried into the world.
function handTipWorld(l, v) {
  const cam = l.cam, k = Math.tan((cam.fov || 70) * Math.PI / 360) / Math.tan(35 * Math.PI / 180);
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const fx = -sy * cp, fy = sp, fz = -cy * cp, rx = cy, rz = -sy, ux = sy * sp, uy = cp, uz = cy * sp;
  const lx = v[0] * k, ly = v[1] * k, lz = -v[2];
  return [cam.x + rx * lx + ux * ly + fx * lz, cam.y + uy * ly + fy * lz, cam.z + rz * lx + uz * ly + fz * lz];
}
{
  const baseNote = LocalPlayer.prototype.noteTip;
  LocalPlayer.prototype.noteTip = function (id, m, kind) {
    baseNote.call(this, id, m, kind);
    const d = itemDef(id); if (!d || !d.staff) return;
    const t = iconTip(id); if (!t) return;
    const [x, y] = t;
    this._staffTip = { v: [m[0] * x + m[4] * y + m[12], m[1] * x + m[5] * y + m[13], m[2] * x + m[6] * y + m[14]], t: this.g.time };
  };
}
