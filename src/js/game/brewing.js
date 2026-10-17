// ---------------------------------------------------------------------------
// game/brewing.js — 0.9.0.10: brewing, potions and what they do to you.
//
// Fill glass bottles at water (or a cauldron), set up to three on a brewing
// stand with cinder powder to keep it burning, and add nether wart to make an
// awkward potion — the base for nearly everything else:
//   sugar → Swiftness           rabbit's foot → Leaping     cinder powder → Strength
//   honeycomb → Regeneration    spider eye → Poison          magma cream → Fire Resistance
//   pufferfish → Water Breathing  golden carrot → Night Vision  feather → Slow Falling
//   turtle scute → the Turtle Master   glistering melon → Healing   amethyst shard → Mana
// Then redstone makes one last longer, glowstone dust makes it stronger, a
// fermented spider eye turns it (swiftness to slowness, healing to harming,
// night vision to invisibility, plain water to weakness) and gunpowder makes
// it a splash potion to throw. Milk washes every effect away.
// ---------------------------------------------------------------------------

// ---- the effects --------------------------------------------------------------------------------------------
const EFFECTS = {
  speed: { name: 'Speed', col: '#7cc8ff' },
  slow: { name: 'Slowness', col: '#6a7c91', bad: true },
  jump: { name: 'Jump Boost', col: '#4cff6c' },
  strength: { name: 'Strength', col: '#ffb020' },
  weak: { name: 'Weakness', col: '#6a706a', bad: true },
  regen: { name: 'Regeneration', col: '#e86ab8' },
  poison: { name: 'Poison', col: '#87a363', bad: true },
  fireres: { name: 'Fire Resistance', col: '#ff8a20' },
  water: { name: 'Water Breathing', col: '#5ac8e8' },
  night: { name: 'Night Vision', col: '#3a5aff' },
  invis: { name: 'Invisibility', col: '#c8ccd8' },
  slowfall: { name: 'Slow Falling', col: '#f6e0c8' },
  resist: { name: 'Resistance', col: '#9a56f0' },
};
// [name, colour, effects as [effect, seconds, level] (instant: heal/harm/mana with an amount), long, strong, ingredient]
const POTIONS = {
  water: { name: 'Water Bottle', col: '#3a6ad8' },
  awkward: { name: 'Awkward Potion', col: '#4a72d8' },
  swift: { name: 'Swiftness', col: '#7cc8ff', fx: [['speed', 180]], long: [['speed', 480]], strong: [['speed', 90, 1]], ing: 'sugar' },
  leap: { name: 'Leaping', col: '#4cff6c', fx: [['jump', 180]], long: [['jump', 480]], strong: [['jump', 90, 1]], ing: 'rabbit_foot' },
  strength: { name: 'Strength', col: '#ffb020', fx: [['strength', 180]], long: [['strength', 480]], strong: [['strength', 90, 1]], ing: 'cinder_powder' },
  regen: { name: 'Regeneration', col: '#e86ab8', fx: [['regen', 45]], long: [['regen', 90]], strong: [['regen', 22, 1]], ing: 'honeycomb' },
  poison: { name: 'Poison', col: '#87a363', fx: [['poison', 45]], long: [['poison', 90]], strong: [['poison', 21, 1]], ing: 'spider_eye' },
  fireres: { name: 'Fire Resistance', col: '#ff8a20', fx: [['fireres', 180]], long: [['fireres', 480]], ing: 'magma_cream' },
  breath: { name: 'Water Breathing', col: '#5ac8e8', fx: [['water', 180]], long: [['water', 480]], ing: 'pufferfish' },
  night: { name: 'Night Vision', col: '#3a5aff', fx: [['night', 180]], long: [['night', 480]], ing: 'golden_carrot' },
  slowfall: { name: 'Slow Falling', col: '#f6e0c8', fx: [['slowfall', 90]], long: [['slowfall', 240]], ing: 'feather' },
  turtle: { name: 'the Turtle Master', col: '#7a8a5a', fx: [['resist', 20, 2], ['slow', 20, 3]], long: [['resist', 40, 2], ['slow', 40, 3]], strong: [['resist', 20, 3], ['slow', 20, 5]], ing: 'turtle_scute' },
  heal: { name: 'Healing', col: '#f83a3a', fx: [['heal', 8]], strong: [['heal', 16]], ing: 'glistering_melon_slice' },
  mana: { name: 'Mana', col: '#4a7aff', fx: [['mana', 20]], strong: [['mana', 40]], ing: 'amethyst_shard' },
  // only by turning another with a fermented spider eye
  slow: { name: 'Slowness', col: '#6a7c91', fx: [['slow', 90]], long: [['slow', 240]], strong: [['slow', 20, 3]] },
  weak: { name: 'Weakness', col: '#6a706a', fx: [['weak', 90]], long: [['weak', 240]] },
  harm: { name: 'Harming', col: '#8a3a4a', fx: [['harm', 6]], strong: [['harm', 12]] },
  invis: { name: 'Invisibility', col: '#c8ccd8', fx: [['invis', 180]], long: [['invis', 480]] },
};
const CORRUPT = { swift: 'slow', leap: 'slow', heal: 'harm', poison: 'harm', night: 'invis', water: 'weak' };
const BREW_TIME = 12;
const potKey = (P, v, splash) => (splash ? 'splash_potion_' : 'potion_') + P + (v ? '_' + v : '');
function potionInfo(id) { const d = itemDef(id); return d && d.potion ? d.potion : null; }
function fmtTime(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
const fxRoman = (lv) => lv ? ' ' + (ROMAN[lv + 1] || lv + 1) : '';

// ---- items ---------------------------------------------------------------------------------------------------
defItem('glowstone_dust', { name: 'Glowstone Dust', desc: 'Makes a potion stronger (and shorter).' });
defItem('cinder_powder', { name: 'Cinder Powder', desc: 'Keeps a brewing stand burning (20 brews), or brews Strength.' });
defItem('fermented_spider_eye', { name: 'Fermented Spider Eye', desc: 'Turns a potion to its opposite.' });
defItem('glistering_melon_slice', { name: 'Glistering Melon Slice', desc: 'Brews Healing.' });
defItem('golden_carrot', { name: 'Golden Carrot', food: { heal: 6 }, desc: 'Brews Night Vision. Good eating, too.' });
const BREW = {};            // from potion -> { ingredient: to potion }
const BREW_INGS = new Set(['nether_wart_item', 'redstone', 'glowstone_dust', 'fermented_spider_eye', 'gunpowder']);
for (const [P, D] of Object.entries(POTIONS)) {
  const vars = [[null, D.fx]];
  if (D.long) vars.push(['long', D.long]);
  if (D.strong) vars.push(['strong', D.strong]);
  for (const splash of [false, true]) for (const [v, fx] of vars) {
    const key = potKey(P, v, splash);
    const nm = P === 'water' || P === 'awkward' ? (splash ? 'Splash ' : '') + D.name : (splash ? 'Splash Potion of ' : 'Potion of ') + D.name + (v === 'strong' ? ' II' : '');
    defItem(key, { name: nm, maxStack: 1, drink: 'milk', splash, icon: (splash ? 'splash_ico_' : 'potion_ico_') + P, potion: { P, v, fx: fx || [], col: D.col, splash }, desc: splash ? 'Use to throw it.' : 'Use to drink it.' });
  }
}
{
  const link = (a, ing, b) => { (BREW[a] || (BREW[a] = {}))[ing] = b; BREW_INGS.add(ing); };
  link('potion_water', 'nether_wart_item', 'potion_awkward');
  for (const [P, D] of Object.entries(POTIONS)) {
    if (D.ing) link('potion_awkward', D.ing, potKey(P));
    if (D.long) link(potKey(P), 'redstone', potKey(P, 'long'));
    if (D.strong) link(potKey(P), 'glowstone_dust', potKey(P, 'strong'));
    const C = CORRUPT[P];
    if (C) for (const v of [null, 'long', 'strong']) {
      const from = potKey(P, v); if (!ITEMS[from]) continue;
      const to = ITEMS[potKey(C, v)] ? potKey(C, v) : potKey(C);
      link(from, 'fermented_spider_eye', to);
    }
  }
  // every drinkable can be made a splash potion, and splash potions brew on like the rest
  for (const k of Object.keys(ITEMS)) if (k.startsWith('potion_')) {
    link(k, 'gunpowder', 'splash_' + k);
    for (const [ing, to] of Object.entries(BREW[k] || {})) if (ITEMS['splash_' + to]) link('splash_' + k, ing, 'splash_' + to);
  }
}
function brewResult(from, ing) { const t = BREW[from]; return t ? t[ing] || null : null; }
ITEMS.glass_bottle.desc = 'Use it at water (or a cauldron) to fill it.';
RECIPES.push(
  { out: 'brewing_stand', n: 1, shape: [' R ', 'CCC'], key: { R: 'cinder_rod', C: '#stone_tool' } },
  { out: 'cinder_powder', n: 2, items: ['cinder_rod'] },
  { out: 'fermented_spider_eye', n: 1, items: ['spider_eye', 'brown_mushroom', 'sugar'] },
  { out: 'glistering_melon_slice', n: 1, shape: ['NNN', 'NMN', 'NNN'], key: { N: 'gold_nugget', M: 'melon_slice' } },
  { out: 'golden_carrot', n: 1, shape: ['NNN', 'NCN', 'NNN'], key: { N: 'gold_nugget', C: 'carrot' } },
  { out: 'glowstone_dust', n: 4, items: ['glowstone'] },
  { out: 'glowstone', n: 1, shape: ['DD', 'DD'], key: { D: 'glowstone_dust' } },
);
ITEMS.brewing_stand.desc = 'Up to three bottles, an ingredient on top, cinder powder to burn.';
{
  // the cleric deals in brewing things; witches carry them
  const cl = NPC_SHOPS.cleric;
  if (cl) { cl.buy.push(['nether_wart_item', 4, 2, 0], ['cinder_powder', 2, 3, 1], ['fermented_spider_eye', 2, 2, 1], ['potion_heal', 1, 4, 1], ['potion_night', 1, 5, 2]); }
  const wt = MOB_TYPES.witch;
  if (wt) wt.drops = (wt.drops || []).concat([['glass_bottle', 0, 2, 0.6], ['glowstone_dust', 0, 2, 0.4], ['sugar', 0, 2, 0.4], ['redstone', 0, 2, 0.4], ['spider_eye', 0, 1, 0.3], ['gunpowder', 0, 2, 0.3], ['potion_heal', 1, 1, 0.08], ['potion_fireres', 1, 1, 0.05]]);
  if (typeof DUNGEON_LOOT !== 'undefined') { DUNGEON_LOOT.common.push(['potion_heal', 1, 1, 0.12], ['potion_swift', 1, 1, 0.08], ['glowstone_dust', 2, 6, 0.2], ['nether_wart_item', 2, 5, 0.15]); DUNGEON_LOOT.rare.push(['potion_heal_strong', 1, 2, 0.2], ['potion_regen', 1, 1, 0.15], ['splash_potion_harm', 1, 2, 0.1]); }
  if (typeof STRUCT_LOOT !== 'undefined') {
    if (STRUCT_LOOT.tower) STRUCT_LOOT.tower.push(['potion_mana', 1, 2, 0.35], ['potion_night', 1, 1, 0.15], ['enchanted_book', 1, 1, 0.3], ['nether_wart_item', 2, 6, 0.3], ['brewing_stand', 1, 1, 0.1]);
    if (STRUCT_LOOT.archmage) STRUCT_LOOT.archmage.push(['potion_mana_strong', 1, 3, 0.5], ['enchanted_book', 1, 2, 0.6]);
    if (STRUCT_LOOT.temple) STRUCT_LOOT.temple.push(['enchanted_book', 1, 1, 0.25], ['potion_fireres', 1, 1, 0.15]);
    if (STRUCT_LOOT.ocean) STRUCT_LOOT.ocean.push(['potion_breath', 1, 2, 0.3], ['enchanted_book', 1, 1, 0.3]);
  }
}

// ---- pictures: bottles in every colour, the stand ------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    const bottle = (p, col, splash) => {
      const c = H(col), lite = shade(c, 1.35), dark = shade(c, 0.6), gl = H('#e8f4ff'), ol = H('#22283a'), cork = H('#8a6a4a');
      const rows = splash
        ? ['................', '......kkk.......', '.....kkkkk......', '......oGo.......', '......oGo.......', '.....oGGGo......', '....oGLLLGo.....', '...oGLLcccGo....', '...oGLccccGo....', '...oGccccdGo....', '...oGcccddGo....', '....oGcddGo.....', '.....ooooo......', '................', '................', '................']
        : ['................', '.......kk.......', '.......kk.......', '......oGGo......', '......oGGo......', '.....oGGGGo.....', '....oGLLccGo....', '...oGLLccccGo...', '...oGLccccdGo...', '...oGccccddGo...', '...oGcccdddGo...', '....oGccddGo....', '.....oooooo.....', '................', '................', '................'];
      p.art(rows, { k: cork, o: ol, G: gl, L: lite, c, d: dark });
    };
    for (const [P, D] of Object.entries(POTIONS)) {
      addItem('potion_ico_' + P, p => bottle(p, D.col, false));
      addItem('splash_ico_' + P, p => bottle(p, D.col, true));
    }
    for (const [k, E] of Object.entries(EFFECTS)) addTile('fxmote_' + k, p => { const c = H(E.col); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 6) p.set(x, y, shade(c, 1.25 - d * 0.06), d < 4 ? 255 : 160); } });
    const I = (name, rows, pal) => addItem(name, p => p.art(rows, pal));
    I('glowstone_dust', ['................', '................', '.....y..........', '....yYy...y.....', '.....y...yWy....', '...y......y.....', '..yWy..yy.......', '...y..yYWy......', '......yYYy..y...', '.......yy..yWy..', '...y........y...', '..yYy...y.......', '...y...yWy......', '........y.......', '................', '................'], { y: H('#c89a2a'), Y: H('#f6d050'), W: H('#fff8c0') });
    I('cinder_powder', ['................', '................', '................', '......r.........', '.....rOr...r....', '......r...rYr...', '...r.......r....', '..rOr..rr.......', '...r..rOYr......', '......rYOr..r...', '.......rr..rOr..', '...r........r...', '..rYr...r.......', '...r...rOr......', '........r.......', '................'], { r: H('#8a2a0a'), O: H('#ff7a1c'), Y: H('#ffd050') });
    I('fermented_spider_eye', ['................', '................', '.....bbbbb......', '....bRRRRRb.....', '...bRRmRRRRb....', '...bRmMmRRRb....', '...bRRmRRkRb....', '...bRRRRRkkb....', '...bRRRRkkRb....', '....bRRRRRb.....', '.....bbbbb......', '......bmb.......', '.....bmMmb......', '......bbb.......', '................', '................'], { b: H('#2a0a14'), R: H('#8a2a3a'), m: H('#a87a5a'), M: H('#d8b090'), k: H('#3a0a14') });
    I('glistering_melon_slice', ['................', '................', '................', '................', '..G...........G.', '..GRRRRRRRRRRG..', '...GRkRYRRkRG...', '....GRRRkRYG....', '.....GRYRRG.....', '......GRRG......', '.......GG.......', '................', '................', '................', '................', '................'], { G: H('#e8c040'), R: H('#e84a4a'), k: H('#1a1a1a'), Y: H('#fff0a0') });
    I('golden_carrot', ['................', '..........ggg...', '.........gGg....', '........gGgg....', '.......oOO......', '......oOYO......', '.....oOOYo......', '....oOYOo.......', '...oOOOo........', '...oYOo.........', '..oOOo..........', '..oOo...........', '..oo............', '................', '................', '................'], { o: H('#a87a10'), O: H('#f0c030'), Y: H('#fff0a0'), g: H('#3a8a2a'), G: H('#6ad850') });
    I('brewing_stand_item', ['................', '.......aa.......', '.......rr.......', '.......rr.......', '..bb...rr...bb..', '..bLb..rr..bLb..', '..bcb..rr..bcb..', '..bcb..rr..bcb..', '...b...rr...b...', '.......rr.......', '.....rrrrrr.....', '...sssssssssss..', '..sSSSs...sSSSs.', '..sssss...sssss.', '................', '................'], { a: H('#ffd050'), r: H('#d8a040'), b: H('#22283a'), L: H('#e8f4ff'), c: H('#e84a8a'), s: H('#4a4a4e'), S: H('#8a8a8e') });
    addTile('brew_base', p => { p.noise(H('#6a6a6e'), 0.2); for (let i = 0; i < 16; i++) { p.set(i, 0, H('#3a3a3e')); p.set(0, i, H('#3a3a3e')); } });
    addTile('brew_rod', p => { p.noise(H('#d8a040'), 0.15); for (let y = 0; y < 16; y++) p.set(7, y, H('#f6d070')); });
    addTile('brew_bubble', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 5.5 && d > 3.8) p.set(x, y, H('#e8f4ff'), 220); else if (d <= 3.8) p.set(x, y, H('#c8e0ff'), 70); } p.set(6, 5, H('#ffffff')); });
  };
}
SHAPES.brewing_stand = [
  { b: [7, 0, 7, 9, 14, 9], side: 'brew_rod', end: 'brew_rod' },
  { b: [10, 0, 5, 15, 2, 11], side: 'brew_base', end: 'brew_base' },
  { b: [1, 0, 1, 6, 2, 7], side: 'brew_base', end: 'brew_base' },
  { b: [1, 0, 9, 6, 2, 15], side: 'brew_base', end: 'brew_base' },
  { b: [9, 11, 7.5, 12.5, 12, 8.5], side: 'brew_rod', end: 'brew_rod' },
  { b: [4, 11, 7.5, 7, 12, 8.5], side: 'brew_rod', end: 'brew_rod' },
  { b: [3.5, 11, 4, 4.5, 12, 12], side: 'brew_rod', end: 'brew_rod' },
];

// ---- effects on a player: kept as fx_<effect> (seconds left) and fxl_<effect> (level - 1) ----------------------
for (const k of Object.keys(EFFECTS)) { REMOTE_FX.add('fx_' + k); REMOTE_FX.add('fxl_' + k); }
for (const k of ['fx_instheal', 'fx_instmana']) REMOTE_FX.add(k);
// Give a pawn (a player here, or one in another game) an effect. Instant ones: heal / harm / mana with an amount.
function giveEffect(q, eff, secs, lv = 0, src) {
  if (!q || q.dead) return;
  const remote = typeof RemotePawn === 'function' && q instanceof RemotePawn;
  const p = q.player || q;
  if (eff === 'heal') { if (remote) q.send({ t: 'fxp', f: { fx_instheal: secs } }); else if (q.player) q.player.heal(secs); return; }
  if (eff === 'mana') { if (remote) q.send({ t: 'fxp', f: { fx_instmana: secs } }); else { const max = typeof manaMax === 'function' ? manaMax(p) : 20; p.mana = Math.min(max, (p.mana ?? max) + secs); } return; }
  if (eff === 'harm') { if (q.hurt) q.hurt(secs, { type: 'magic', attacker: src, bypassArmor: true, knock: 0 }); return; }
  if (!EFFECTS[eff]) return;
  if (remote) { q.send({ t: 'fxp', f: { ['fx_' + eff]: secs, ['fxl_' + eff]: lv } }); return; }
  if ((p['fx_' + eff] || 0) > secs && (p['fxl_' + eff] || 0) >= lv) return;
  p['fx_' + eff] = Math.max(secs, (p['fxl_' + eff] || 0) > lv ? 0 : p['fx_' + eff] || 0); p['fxl_' + eff] = lv;
  if (eff === 'poison') p.poison = Math.max(p.poison || 0, secs);
}
function clearEffects(p) { for (const k of Object.keys(EFFECTS)) { p['fx_' + k] = 0; p['fxl_' + k] = 0; } p.poison = 0; }
function effectsOn(p) { const out = []; for (const k of Object.keys(EFFECTS)) if (p['fx_' + k] > 0) out.push([k, p['fx_' + k], p['fxl_' + k] || 0]); return out; }
// What an effect does to a creature (a splash potion, a tipped blade...)
function mobEffect(e, eff, secs, lv, src) {
  if (!e || !e.alive) return;
  const undead = e.T && (e.T.undead || /ghoul|skeleton|stray|husk|drowned|wraith|zombie|wight/.test(e.type));
  if (eff === 'heal' || eff === 'harm') {
    const hurts = (eff === 'harm') !== !!undead;
    if (hurts) e.hurt(secs * (undead ? 1 : 1), { type: 'magic', attacker: src, knock: 0 });
    else { e.health = Math.min(e.maxHealth, e.health + secs); }
    return;
  }
  if (eff === 'poison' && !undead) e.poisonT = Math.max(e.poisonT || 0, secs);
  if (eff === 'slow') e.slowT = Math.max(e.slowT || 0, secs);
  if (eff === 'regen' || eff === 'resist' || eff === 'strength') e.health = Math.min(e.maxHealth, e.health + 2);
}

{
  // drinking, throwing, filling bottles, milk
  const baseMilk = LocalPlayer.prototype.drinkMilk;
  LocalPlayer.prototype.drinkMilk = function (held) {
    const d = held && itemDef(held.id), g = this.g, p = this.player;
    if (d && d.potion) {
      if (d.potion.splash) { this.throwPotion(held, d); return; }
      for (const [eff, t, lv] of d.potion.fx) giveEffect(this, eff, t, lv || 0, this);
      if (p.inv.held === held) { held.n--; if (held.n <= 0) p.inv.held = mkStack('glass_bottle', 1); else this.give(mkStack('glass_bottle', 1)); }
      p.eatAnim = 0.45; g.sfx.play('drink');
      const lv = p.look();
      g.burst(p.x + lv[0] * 0.4, p.y + p.eye - 0.25, p.z + lv[2] * 0.4, 'fxmote_' + ((d.potion.fx[0] && EFFECTS[d.potion.fx[0][0]]) ? d.potion.fx[0][0] : 'water'), 8, 0.6);
      if (d.potion.fx.length) this.toast(d.name.replace(/^Potion of /, ''), 'good');
      return;
    }
    if (d && d.drink === 'milk' && held.id === 'milk_bucket') clearEffects(p);
    return baseMilk.call(this, held);
  };
  LocalPlayer.prototype.throwPotion = function (held, d) {
    const g = this.g, p = this.player, [lx, ly, lz] = p.look(), sp = 11;
    held.n--; if (held.n <= 0) p.inv.held = null;
    const f = new HexFlask(g, p.x + lx * 0.5, p.y + p.eye - 0.1 + ly * 0.5, p.z + lz * 0.5, lx * sp, ly * sp + 2.5, lz * sp, this, 'pot:' + held.id);
    g.addEntity(f);
    this.swingArm(); g.sfx.play('bow');
  };
  // a glass bottle at water fills; a water bottle tops a cauldron up
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const g = this.g, p = this.player, w = g.world, held = p.inv.held, hit = this.target;
    if (!repeat && !fromOff && held && (held.id === 'glass_bottle' || held.id === 'potion_water')) {
      const b = hit && BLOCKS[hit.id];
      if (b && b.cauldron) {
        const m = w.getMeta(hit.x, hit.y, hit.z), lvl = m & 3;
        if (held.id === 'glass_bottle' && lvl > 0) { w.setBlock(hit.x, hit.y, hit.z, hit.id, (m & ~3) | (lvl - 1)); this.fillBottle(held); return; }
        if (held.id === 'potion_water' && lvl < 3) { w.setBlock(hit.x, hit.y, hit.z, hit.id, (m & ~3) | (lvl + 1)); p.inv.held = mkStack('glass_bottle', 1); g.sfx.play('splash_small'); this.swingArm(); return; }
      }
      if (held.id === 'glass_bottle' && !(b && (b.hive || b.key === 'bee_nest' || b.key === 'beehive'))) {
        const [dx, dy, dz] = p.look(), wh = raycastBlocks(w, p.x, p.y + p.eye, p.z, dx, dy, dz, REACH, true);
        if (wh && T_LIQUID[wh.id] === 1) { this.fillBottle(held); return; }
      }
    }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  LocalPlayer.prototype.fillBottle = function (held) {
    const p = this.player, full = mkStack('potion_water', 1);
    held.n--; if (held.n <= 0) p.inv.held = full; else this.give(full);
    this.g.sfx.play('bucket'); this.swingArm();
  };
}
// a thrown potion: it arcs, breaks, and whatever's close gets some of it
{
  const baseUpd = HexFlask.prototype.update;
  HexFlask.prototype.update = function (dt) {
    if (!(typeof this.kind === 'string' && this.kind.startsWith('pot:')) || this.ghost) return baseUpd.call(this, dt);
    const g = this.game, w = g.world;
    this.age += dt;
    if (this.age > 8) { this.remove = true; return; }
    for (let s = 0; s < 3; s++) {
      const h = dt / 3; this.vy -= 20 * h;
      this.x += this.vx * h; this.y += this.vy * h; this.z += this.vz * h;
      const grace = this.age < 0.3;
      for (const q of g.pawns()) if (!q.dead && !(grace && q === this.owner) && Math.abs(q.x - this.x) < 0.5 && Math.abs(q.z - this.z) < 0.5 && this.y > q.y && this.y < q.y + 1.9) return this.smash();
      for (const e of g.entities) if (e instanceof Mob && e.alive && !(grace && e === this.owner) && Math.abs(e.x - this.x) < e.w + 0.2 && Math.abs(e.z - this.z) < e.w + 0.2 && this.y > e.y && this.y < e.y + e.h) return this.smash();
      if (T_SOLID[w.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))]) return this.smash();
    }
  };
  const baseSmash = HexFlask.prototype.smash;
  HexFlask.prototype.smash = function () {
    if (!(typeof this.kind === 'string' && this.kind.startsWith('pot:'))) return baseSmash.call(this);
    const g = this.game, x = this.x, y = this.y, z = this.z, d = itemDef(this.kind.slice(4)), P = d && d.potion;
    this.remove = true;
    g.sfx.playAt('glass_break', x, y, z, 24);
    if (!P) return;
    const col = P.fx[0] && EFFECTS[P.fx[0][0]] ? P.fx[0][0] : null;
    for (let k = 0; k < 40; k++) { const a = Math.random() * TAU, sp = 1 + Math.random() * 3; spellSpark(g, x, y + 0.1, z, col ? 'fxmote_' + col : 'brew_bubble', { vx: Math.cos(a) * sp, vy: 1 + Math.random() * 2, vz: Math.sin(a) * sp, life: 0.7 + Math.random() * 0.5, size: 0.08, grav: 3 }); }
    if (g.net && g.net.role === 'host') g.net.burstAt(x, y, z, 'white', 12, 1.5);
    // water puts out fire
    if (P.P === 'water') {
      for (const q of g.pawns()) if (Math.hypot(q.x - x, q.y + 0.9 - y, q.z - z) < 4) { const pl = q.player || q; if (pl.burn > 0) pl.burn = 0; }
      for (const e of g.entities) if (e instanceof Mob && e.alive && Math.hypot(e.x - x, e.z - z) < 4) e.burn = 0;
      return;
    }
    for (const q of g.pawns()) {
      if (q.dead) continue;
      const dist = Math.hypot(q.x - x, q.y + 0.9 - y, q.z - z); if (dist > 4) continue;
      const k = q === this.owner && dist < 1.5 ? 1 : 1 - dist / 4;
      for (const [eff, t, lv] of P.fx) giveEffect(q, eff, ['heal', 'harm', 'mana'].includes(eff) ? Math.max(1, Math.round(t * k)) : t * 0.75 * k, lv || 0, this.owner);
    }
    for (const e of g.entities) {
      if (!(e instanceof Mob) || !e.alive) continue;
      const dist = Math.hypot(e.x - x, e.y + e.h / 2 - y, e.z - z); if (dist > 4) continue;
      const k = 1 - dist / 4;
      for (const [eff, t, lv] of P.fx) mobEffect(e, eff, ['heal', 'harm', 'mana'].includes(eff) ? Math.max(1, Math.round(t * k)) : t * 0.75 * k, lv || 0, this.owner);
      if (P.fx.some(f => f[0] === 'harm' || f[0] === 'poison' || f[0] === 'slow' || f[0] === 'weak') && this.owner && e.provoke && e.T && !e.T.hostile && this.owner.player) { /* animals just run */ e.panicT = 4; }
    }
  };
  const baseGlow = HexFlask.prototype.glow;
  HexFlask.prototype.glow = function (out) {
    if (!(typeof this.kind === 'string' && this.kind.startsWith('pot:'))) return baseGlow.call(this, out);
    const d = itemDef(this.kind.slice(4)), t = d && ATLAS.tile[d.icon];
    const l = this.game.world.getLight(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
    out.push({ x: this.x, y: this.y, z: this.z, size: 0.36, uv: tileUV(t ?? ATLAS.tile.hex_flask), light: l });
  };
}

// ---- what the effects do ---------------------------------------------------------------------------------------
{
  // ticking down, regeneration, water breathing, slow falling, instant gifts from another game, the motes around you
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseUpd.call(this, dt, inp);
    const p = this.player, g = this.g;
    if (p.dead) { clearEffects(p); return r; }
    if (p.fx_instheal > 0) { p.heal(p.fx_instheal); p.fx_instheal = 0; }
    if (p.fx_instmana > 0) { const max = typeof manaMax === 'function' ? manaMax(p) : 20; p.mana = Math.min(max, (p.mana ?? max) + p.fx_instmana); p.fx_instmana = 0; }
    let any = null;
    for (const k of Object.keys(EFFECTS)) {
      const t = p['fx_' + k]; if (!(t > 0)) continue;
      p['fx_' + k] = t - dt; any = any || k;
      if (p['fx_' + k] <= 0) { p['fx_' + k] = 0; p['fxl_' + k] = 0; }
    }
    if (p.fx_regen > 0) { p._regT = (p._regT || 0) + dt; const every = p.fxl_regen ? 1.2 : 2.5; if (p._regT >= every) { p._regT = 0; p.heal(1); } }
    if (p.fx_poison > 0 && !(p.poison > 0.5)) p.poison = p.fx_poison;
    if (p.fx_slowfall > 0 && !p.onGround && p.vy < 0 && !p.flying) { p.slowFallT = Math.max(p.slowFallT || 0, 0.25); if (p.vy < -2.2) p.vy += (-2.2 - p.vy) * Math.min(1, dt * 8); }
    if (p.fx_fireres > 0 && p.burn > 0) p.burn = Math.min(p.burn, 0.3);
    // swirling motes in the effect's colour (thinner in first person so they don't cloud your view)
    if (any && Math.random() < dt * (this.viewMode ? 6 : 2.5) && !(p.fx_invis > 0)) {
      const list = effectsOn(p), k = list[Math.floor(Math.random() * list.length)][0], a = Math.random() * TAU, rr = 0.45 + Math.random() * 0.2;
      spellSpark(g, p.x + Math.cos(a) * rr, p.y + 0.2 + Math.random() * 1.5, p.z + Math.sin(a) * rr, 'fxmote_' + k, { vy: 0.5 + Math.random() * 0.4, life: 0.9, size: 0.06 });
    }
    return r;
  };
  const baseBreathe = LocalPlayer.prototype.breathe;
  LocalPlayer.prototype.breathe = function (dt) { const r = baseBreathe.call(this, dt), p = this.player; if (p.fx_water > 0) { p.air = AIR_MAX; p._drownT = 0; } return r; };
  // speed, slowness, leaping
  const baseMove = Player.prototype.move;
  Player.prototype.move = function (w, inp, dt, opts = {}) {
    let k = 1;
    if (this.fx_speed > 0) k *= 1 + 0.2 * ((this.fxl_speed | 0) + 1);
    if (this.fx_slow > 0) k *= Math.max(0.1, 1 - 0.15 * ((this.fxl_slow | 0) + 1));
    if (k !== 1) opts = Object.assign({}, opts, { slow: (opts.slow || 1) * k });
    const ground = this.onGround, vy0 = this.vy;
    const r = baseMove.call(this, w, inp, dt, opts);
    if (this.fx_jump > 0 && ground && inp && inp.jump && vy0 <= 0.5 && this.vy > 5) this.vy *= 1 + 0.2 * ((this.fxl_jump | 0) + 1);
    return r;
  };
  // fire resistance, resistance, leaping softens falls
  const baseHurt = Player.prototype.hurt;
  Player.prototype.hurt = function (amount, source = {}) {
    const t = source.type;
    if (this.fx_fireres > 0 && (t === 'lava' || t === 'burn' || source.element === 'fire' || t === 'fire')) return 0;
    if (t === 'fall' && this.fx_jump > 0) { amount -= (this.fxl_jump | 0) + 1; if (amount <= 0) return 0; }
    if (this.fx_resist > 0 && t !== 'void') amount *= Math.max(0, 1 - 0.2 * ((this.fxl_resist | 0) + 1));
    if (amount <= 0) return 0;
    return baseHurt.call(this, amount, source);
  };
  // strength and weakness
  const baseTool = LocalPlayer.prototype.heldTool;
  LocalPlayer.prototype.heldTool = function () {
    const t = baseTool.call(this), p = this.player;
    if (!(p.fx_strength > 0 || p.fx_weak > 0)) return t;
    // (0.9.0.24) a share of the blow, not a flat bonus (a wooden sword with Strength II out-hit adamantite)
    const k = (p.fx_strength > 0 ? 1 + 0.2 * ((p.fxl_strength | 0) + 1) : 1) * (p.fx_weak > 0 ? 0.7 : 1);
    if (!t) return k > 1 ? { type: 'hand', tier: 0, speed: 1, damage: Math.max(1, Math.round(k * 2) / 2) } : t;
    return Object.assign({}, t, { damage: Math.max(0.5, Math.round(t.damage * k * 2) / 2) });
  };
  // invisible players are hard to see: creatures only notice them close by
  const baseTarget = Mob.prototype.aiTarget;
  Mob.prototype.aiTarget = function (p) {
    const t = baseTarget.call(this, p);
    if (!t || !(this.T && this.T.hostile)) return t;
    const inv = (t.player && t.player.fx_invis > 0) || (t.st && t.st.pose && t.st.pose.invis);
    if (inv && Math.hypot(t.x - this.x, t.z - this.z) > 3.5 && !(this.hurtTime > 0)) return null;
    return t;
  };
  const basePose = LocalPlayer.prototype.pose;
  LocalPlayer.prototype.pose = function () { const ps = basePose.call(this); if (this.player.fx_invis > 0) ps.invis = 1; return ps; };
  // night vision
  const baseEnv = Game.prototype.computeEnv;
  Game.prototype.computeEnv = function (dim, fixedT) {
    const e = baseEnv.call(this, dim, fixedT);
    let nv = 0;
    for (const l of this.locals || []) { const t = l.player && l.player.fx_night; if (t > 0) nv = Math.max(nv, t > 10 ? 1 : (Math.sin(t * 8) > 0 ? 1 : 0.4)); }
    if (nv) e.minLight = Math.max(e.minLight, 0.62 * nv);
    return e;
  };
  // effects are kept in the save
  const baseJSON = Player.prototype.toJSON;
  Player.prototype.toJSON = function () { const o = baseJSON.call(this), fx = {}; for (const [k, t, lv] of effectsOn(this)) fx[k] = [Math.round(t), lv]; if (Object.keys(fx).length) o.fx = fx; return o; };
  const baseLoad = Player.prototype.load;
  Player.prototype.load = function (o) { baseLoad.call(this, o); if (o && o.fx) for (const [k, v] of Object.entries(o.fx)) if (EFFECTS[k] && Array.isArray(v)) { this['fx_' + k] = +v[0] || 0; this['fxl_' + k] = +v[1] || 0; } };
  // a little row of what you're under, top right
  const baseFrame = Hud.prototype.frame;
  Hud.prototype.frame = function (dt, cam) {
    const r = baseFrame.call(this, dt, cam);
    const p = this.lp.player; let row = this._fxRow;
    if (!row) { row = this._fxRow = document.createElement('div'); row.className = 'fx-row'; this.root.appendChild(row); }
    const list = p.dead ? [] : effectsOn(p);
    const key = list.map(([k, t, lv]) => k + lv + ':' + Math.ceil(t)).join('|');
    if (key !== this._fxKey) {
      this._fxKey = key;
      row.innerHTML = list.map(([k, t, lv]) => {
        const pk = Object.keys(POTIONS).find(P => POTIONS[P].fx && POTIONS[P].fx[0][0] === k) || 'water';
        return `<div class="fx-chip${EFFECTS[k].bad ? ' bad' : ''}${t < 10 ? ' ending' : ''}" title="${esc(EFFECTS[k].name)}"><i class="ico" style="background-position:${iconPos('potion_' + pk)}"></i><span>${esc(EFFECTS[k].name)}${fxRoman(lv)}<b>${fmtTime(t)}</b></span></div>`;
      }).join('');
    }
    return r;
  };
  // the tooltip says what's in the bottle
  const baseInfo = itemInfoHTML;
  itemInfoHTML = function (s) {
    let h = baseInfo(s);
    const P = s && potionInfo(s.id);
    if (P && P.fx.length) {
      const lines = P.fx.map(([eff, t, lv]) => ['heal', 'harm', 'mana'].includes(eff)
        ? `<div class="ts ${eff === 'harm' ? 'bad' : ''}">${eff === 'heal' ? 'Heals ' + t / 2 + ' hearts' : eff === 'harm' ? 'Harms ' + t / 2 + ' hearts' : 'Restores ' + t + ' mana'}${P.splash ? ' (less at the edge)' : ''}</div>`
        : `<div class="ts ${EFFECTS[eff].bad ? 'bad' : ''}">${esc(EFFECTS[eff].name)}${fxRoman(lv)} (${fmtTime(P.splash ? t * 0.75 : t)})</div>`).join('');
      const i = h.indexOf('</div>'); h = h.slice(0, i + 6) + lines + h.slice(i + 6);
    }
    const ing = s && BREW_INGS.has(s.id) ? Object.entries(BREW).find(([, m]) => m[s.id]) : null;
    if (ing && !P) h += `<div class="td">A brewing ingredient</div>`;
    return h;
  };
}

// ---- the brewing stand ----------------------------------------------------------------------------------------------
function brewEntity(w, x, y, z) {
  const e = w.getEntity(x, y, z, () => ({ type: 'brew', items: [null, null, null, null, null], fuel: 0, t: 0 }));
  if (!e.items || e.items.length !== 5) e.items = Object.assign([null, null, null, null, null], e.items || []);
  return e;
}
function tickBrew(g, e, dt, x, y, z) {
  const it = e.items, ing = it[3];
  const outs = [0, 1, 2].map(i => it[i] && ing ? brewResult(it[i].id, ing.id) : null);
  const can = !!ing && outs.some(Boolean);
  let changed = false;
  if (can && !(e.fuel > 0) && it[4] && it[4].id === 'cinder_powder') { e.fuel = 20; it[4].n--; if (it[4].n <= 0) it[4] = null; changed = true; }
  if (can && e.fuel > 0) {
    if (!(e.t > 0) || e.ing !== ing.id) { e.t = BREW_TIME; e.ing = ing.id; changed = true; }
    e.t -= dt;
    if (Math.random() < dt * 0.8) g.sfx.playAt('brew_bubble', x + 0.5, y + 0.5, z + 0.5, 10);
    if (e.t <= 0) {
      for (let i = 0; i < 3; i++) if (outs[i]) it[i] = mkStack(outs[i], 1);
      ing.n--; if (ing.n <= 0) it[3] = null;
      e.fuel--; e.t = 0; e.ing = null; changed = true;
      g.sfx.playAt('brew_done', x + 0.5, y + 0.5, z + 0.5, 14);
    }
  } else if (e.t > 0) { e.t = 0; e.ing = null; changed = true; }
  return changed;
}
{
  const baseTick = Game.prototype.tickFurnaces;
  Game.prototype.tickFurnaces = function (dt) {
    baseTick.call(this, dt);
    const w = this.world;
    for (const ch of w.chunks.values()) {
      if (!ch.blockEntities.size) continue;
      for (const [i, e] of ch.blockEntities) {
        if (e.type !== 'brew' || ch.blocks[i] !== B.brewing_stand) continue;
        const x = ch.cx * 16 + (i & 15), z = ch.cz * 16 + ((i >> 4) & 15), y = i >> 8;
        if (!e.items || e.items.length !== 5) e.items = Object.assign([null, null, null, null, null], e.items || []);
        if (tickBrew(this, e, dt, x, y, z)) this.entityChanged(x, y, z);
      }
    }
  };
  // the panel
  const isBrew = (ui) => ui.mode === 'brew';
  const baseOpen = LocalPlayer.prototype.openInventory;
  LocalPlayer.prototype.openInventory = function (mode = 'inventory', opts = {}) {
    if (mode === 'station' && opts.kind === 'brew') { brewEntity(this.g.world, ...opts.pos); mode = 'brew'; }
    return baseOpen.call(this, mode, opts);
  };
  InvUI.prototype.brewEnt = function () { const p = this.opts.pos; return p && this.g.world.getBlock(p[0], p[1], p[2]) === B.brewing_stand ? brewEntity(this.g.world, p[0], p[1], p[2]) : null; };
  const baseArr = InvUI.prototype.arr;
  InvUI.prototype.arr = function (group) { if (group === 'brew') { const e = this.brewEnt(); return e ? e.items : []; } return baseArr.call(this, group); };
  const baseAccepts = InvUI.prototype.accepts;
  InvUI.prototype.accepts = function (group, i, s) {
    if (group === 'brew') {
      if (i < 3) return !!potionInfo(s.id);
      if (i === 3) return BREW_INGS.has(s.id);
      return s.id === 'cinder_powder';
    }
    return baseAccepts.call(this, group, i, s);
  };
  const baseChanged = InvUI.prototype.changed;
  InvUI.prototype.changed = function (group) { if (group === 'brew') { const p = this.opts.pos; if (p) this.g.entityChanged(p[0], p[1], p[2]); } return baseChanged.call(this, group); };
  const baseBuild = InvUI.prototype.build;
  InvUI.prototype.build = function () {
    baseBuild.call(this);
    if (!isBrew(this)) return;
    const panel = this.root.querySelector('.ipanel');
    if (panel && !panel.querySelector('.ip-title')) panel.insertAdjacentHTML('afterbegin', '<div class="ip-title">Brewing Stand</div>');
    this.root.querySelector('.ip-top').innerHTML = `<div class="brew"><div class="brew-l"><div class="fslot bfuel"></div><div class="brew-fuel"><i></i></div></div>
      <div class="brew-c"><div class="fslot bing"></div><div class="brew-tube"><i></i></div><div class="brew-bottles"><div class="fslot b0"></div><div class="fslot b1"></div><div class="fslot b2"></div></div></div></div><div class="mach-status"></div>`;
    this.layout();
  };
  const baseLayout = InvUI.prototype.layout;
  InvUI.prototype.layout = function () {
    baseLayout.call(this);
    if (!isBrew(this)) return;
    const v = this.lp.view, bpRows = Math.ceil((this.lp.player.inv.backpackSlots() || []).length / 9);
    const rows = 4.4 + 6.1 + (bpRows ? bpRows + 0.65 : 0) + 0.55;
    this.root.style.setProperty('--is', Math.floor(clamp(Math.min((v.w - 28) / 9.9, (v.h - 28) / rows), 16, 44)) + 'px');
  };
  InvUI.prototype.brewBars = function () {
    const e = this.brewEnt(); if (!e) return;
    const R = this.root, f = R.querySelector('.brew-fuel i'), t = R.querySelector('.brew-tube i'), st = R.querySelector('.mach-status');
    if (f) f.style.width = Math.min(100, (e.fuel || 0) / 20 * 100) + '%';
    if (t) t.style.height = (e.t > 0 ? (1 - e.t / BREW_TIME) * 100 : 0) + '%';
    if (st) {
      const it = e.items, ing = it[3], ok = ing && [0, 1, 2].some(i => it[i] && brewResult(it[i].id, ing.id));
      const txt = e.t > 0 ? 'Brewing…' : !it[0] && !it[1] && !it[2] ? 'Bottles of water below, an ingredient on top (nether wart first)' : !ing ? 'Add an ingredient on top' : !ok ? 'That does nothing to these' : !(e.fuel > 0) && !(it[4] && it[4].id === 'cinder_powder') ? 'Needs cinder powder to burn' : '';
      if (st.textContent !== txt) st.textContent = txt;
    }
  };
  const baseRender = InvUI.prototype.render;
  InvUI.prototype.render = function () {
    baseRender.call(this);
    if (!isBrew(this) || !this.mode) return;
    const R = this.root, it = this.arr('brew');
    const set = (cls, i, ph) => { const el = R.querySelector('.fslot.' + cls); if (el) el.innerHTML = this.slotHTML('brew', i, it[i], '', ph); };
    set('b0', 0, 'potion_water'); set('b1', 1, 'potion_water'); set('b2', 2, 'potion_water'); set('bing', 3, 'nether_wart_item'); set('bfuel', 4, 'cinder_powder');
    this.brewBars();
    if (this.focus) { const f = this.refind(this.focus); if (f) this.setFocus(f); }
    this.renderCursor();
  };
  const baseFrame = InvUI.prototype.frame;
  InvUI.prototype.frame = function (dt, inp) {
    if (isBrew(this) && !this.brewEnt()) { this.lp.closeInventory(); return; }
    if (isBrew(this)) this.brewBars();
    return baseFrame.call(this, dt, inp);
  };
  const baseExt = InvUI.prototype.externalChange;
  InvUI.prototype.externalChange = function (x, y, z) { if (isBrew(this) && !this.brewEnt()) { this.lp.closeInventory(); return; } return baseExt.call(this, x, y, z); };
  const baseQuick = InvUI.prototype.quickMove;
  InvUI.prototype.quickMove = function (group, i) {
    if (isBrew(this) && (group === 'main' || group === 'bp')) {
      const a = this.arr(group), s = a[i], b = this.arr('brew');
      if (potionInfo(s.id)) { const k = [0, 1, 2].find(j => !b[j]); if (k !== undefined) { b[k] = s; a[i] = null; } }
      else for (const k of [3, 4]) {
        if (!this.accepts('brew', k, s)) continue;
        if (!b[k]) { b[k] = s; a[i] = null; break; }
        if (b[k].id === s.id) { const mv = Math.min(maxStackOf(s.id) - b[k].n, s.n); b[k].n += mv; s.n -= mv; if (!s.n) a[i] = null; break; }
      }
      this.changed('brew');
      return;
    }
    return baseQuick.call(this, group, i);
  };
  // the stand: bottles standing on their pads, bubbling while it works
  const baseBE = blockEntityDraws;
  blockEntityDraws = function (game, out, cam, R) {
    baseBE(game, out, cam, R);
    const w = game.world, gl = game.renderer.gl, pcx = Math.floor(cam.x) >> 4, pcz = Math.floor(cam.z) >> 4;
    for (const ch of w.chunks.values()) {
      if (!ch.blockEntities.size || Math.abs(ch.cx - pcx) > 2 || Math.abs(ch.cz - pcz) > 2) continue;
      for (const [i, e] of ch.blockEntities) {
        if (e.type !== 'brew' || ch.blocks[i] !== B.brewing_stand || !e.items) continue;
        const x = ch.cx * 16 + (i & 15), z = ch.cz * 16 + ((i >> 4) & 15), y = i >> 8;
        const l = w.getLight(x, y, z), light = [l >> 4, Math.max(1, l & 15)];
        const pads = [[12.5, 8, Math.PI / 2], [3.5, 4, -Math.PI / 4 * 3], [3.5, 12, -Math.PI / 4]];
        for (let k = 0; k < 3; k++) {
          const s = e.items[k]; if (!s || !itemDef(s.id)) continue;
          const im = itemMesh(gl, s.id), m = Mat4.create(), [px, pz, ry] = pads[k];
          Mat4.translate(m, px / 16, 2 / 16 + 0.2, pz / 16); Mat4.rotateY(m, ry); Mat4.scale(m, 0.42, 0.42, 0.42);
          out.push({ mesh: im.mesh, m, px: x, py: y, pz: z, light, noCull: true });
          if (e.t > 0 && Math.random() < 0.08) spellSpark(game, x + px / 16, y + 0.45, z + pz / 16, 'brew_bubble', { vy: 0.5, life: 0.6, size: 0.04 });
        }
        if (e.t > 0 && Math.random() < 0.05) spellSpark(game, x + 0.5, y + 0.95, z + 0.5, 'brew_bubble', { vy: 0.3, life: 0.8, size: 0.05 });
      }
    }
  };
}
SND_FX.drink = [0.8, 0.55, (b, v, r) => { for (let k = 0; k < 3; k++) { const t = k * 0.22 + r() * 0.03; b.thump(t, 340 + r() * 60, 180, 0.1, 0.5); b.noise(t, 0.08, 'lp', 700, 0.8, 0.25); } }];
SND_FX.brew_bubble = [0.6, 0.35, (b, v, r) => { for (let k = 0; k < 6; k++) b.modes(r() * 0.4, [[500 + r() * 900, 0.012, 1]], 0.3, { droop: -0.7 }); }];
SND_FX.brew_done = [1.0, 0.45, (b, v, r) => { b.modes(0, [[880, 0.4, 1], [1320, 0.3, 0.5]], 0.2); b.modes(0.12, [[1175, 0.4, 1], [1760, 0.25, 0.4]], 0.18); for (let k = 0; k < 6; k++) b.modes(0.1 + r() * 0.4, [[700 + r() * 800, 0.015, 1]], 0.2, { droop: -0.6 }); }];
