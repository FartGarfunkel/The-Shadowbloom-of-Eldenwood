// ---------------------------------------------------------------------------
// game/arcana.js — 0.9.0.26: arcana.
//
// More magic. Four new robe sets, each with a proper pointed wizard's hat, and
// each its own school: the Pyromancer (fire), the Frostweaver (frost), the
// Druid (life: healing and the creatures you call) and the Stormcaller (storm
// and the swift arts). The whole set makes that school's spells a third
// stronger; the Archmage's set (its hood now a hat too) helps every spell a
// little. Six new spells: Arcane Missiles, Regrowth, Haste, Fireball, Ice Nova
// and Stone Guardian. Four new potions: Clarity (mana), Fortune (ore), Haste
// (digging) and Warding (a shield). Six new enchantments: Vampirism and Frost
// Aspect on blades, Smelting Touch on tools, Volley on bows, Swiftness on
// boots and Insight on helmets.
// ---------------------------------------------------------------------------

// ---- spells ------------------------------------------------------------------------------------------------
const SCHOOL_OF = { firebolt: 'fire', fireball: 'fire', frost: 'frost', icenova: 'frost', heal: 'life', regrowth: 'life', ward: 'life', familiar: 'life', guardian: 'life', lightning: 'storm', haste: 'storm', blink: 'storm', levitate: 'storm' };
Object.assign(SPELLS, {
  missiles: { name: 'Arcane Missiles', mana: 6, lvl: 8, col: '#c88cff', fx: 'mana_arcane', desc: 'Three bolts of pure magic that seek out the nearest foe in front of you.' },
  regrowth: { name: 'Regrowth', mana: 12, lvl: 22, col: '#7aff8a', fx: 'mana_heal', desc: 'You and everyone near you heal over the next ten seconds.' },
  haste: { name: 'Haste', mana: 10, lvl: 25, col: '#ffe86a', fx: 'mana_light', desc: 'Quick feet and a light step for forty seconds.' },
  fireball: { name: 'Fireball', mana: 14, lvl: 28, col: '#ff5a1a', fx: 'mana_fire', desc: 'A ball of fire that bursts where it lands, burning all around.' },
  icenova: { name: 'Ice Nova', mana: 18, lvl: 35, col: '#a8f0ff', fx: 'mana_frost', desc: 'A ring of frost bursts out from you, hurting and slowing every foe nearby.' },
  guardian: { name: 'Stone Guardian', mana: 24, lvl: 40, col: '#c8b898', fx: 'mana_stone', desc: 'Raises a guardian of stone to fight beside you for a minute.' },
});
for (const k of ['missiles', 'regrowth', 'haste', 'fireball', 'icenova', 'guardian']) {
  if (!SPELL_ORDER.includes(k)) SPELL_ORDER.push(k);
  const s = SPELLS[k];
  defItem('tome_' + k, { name: 'Tome: ' + s.name, maxStack: 1, desc: s.desc + ` (Magic ${s.lvl})`, rarity: s.lvl >= 20 ? 'epic' : 'rare', tome: k });
}
// a bolt that bursts (fireball) or seeks (missiles)
class ArcBolt extends SpellBolt {
  constructor(game, x, y, z, vx, vy, vz, spell, caster, dmg, target) { super(game, x, y, z, vx, vy, vz, spell, caster, dmg); this.target = target || null; }
  update(dt) {
    const t = this.target;
    if (t && t.alive && this.spell === 'missiles') {
      const sp = Math.hypot(this.vx, this.vy, this.vz) || 18, dx = t.x - this.x, dy = t.y + t.h * 0.6 - this.y, dz = t.z - this.z, l = Math.hypot(dx, dy, dz) || 1, k = Math.min(1, dt * 7);
      this.vx += (dx / l * sp - this.vx) * k; this.vy += (dy / l * sp - this.vy) * k; this.vz += (dz / l * sp - this.vz) * k;
    }
    return super.update(dt);
  }
  hit(e) {
    const g = this.game;
    if (this.spell !== 'fireball') {
      // a missile: a small burst, arcane, no element
      this.remove = true;
      spellFx(g, this.x, this.y, this.z, 'mana_arcane', 18, 1.8, { life: 0.4, size: 0.09 });
      g.sfx.playAt('spell_hit', this.x, this.y, this.z);
      if (e && !this.visual) { const src = { type: 'magic', attacker: this.caster, knock: 0.5 }; if (g.isGuest && g.net) g.net.sendHit(e, this.dmg, src); else e.hurt(this.dmg, src); }
      return;
    }
    // the fireball bursts: everything near it burns
    this.remove = true;
    spellFx(g, this.x, this.y, this.z, 'mana_fire', 70, 5, { life: 0.7, size: 0.14 });
    spellRing(g, this.x, this.y, this.z, 'mana_fire', 0.3, 30, { speed: 6, life: 0.5, size: 0.1 });
    for (let i = 0; i < 14; i++) g.flame(this.x + (Math.random() - 0.5) * 3, this.y + (Math.random() - 0.5), this.z + (Math.random() - 0.5) * 3);
    g.sfx.playAt('explode', this.x, this.y, this.z, 40);
    if (this.visual) return;
    for (const m of g.entities) {
      if (!(m instanceof Mob) || !m.alive || (m.npc && !m.T.hostile) || m.owner) continue;
      const d = Math.hypot(m.x - this.x, m.y + m.h / 2 - this.y, m.z - this.z); if (d > 3.4) continue;
      const dmg = Math.round(this.dmg * (1 - d / 5)), src = { type: 'magic', attacker: this.caster, element: 'fire', knock: 3 };
      if (g.isGuest && g.net) g.net.sendHit(m, dmg, src); else { m.hurt(dmg, src); if (!m.T.fireImmune) m.burn = Math.max(m.burn || 0, 5); }
    }
  }
}
// the new spells, cast the way the old ones are (mana, cooldown, the circle, experience)
{
  const NEW = new Set(['missiles', 'regrowth', 'haste', 'fireball', 'icenova', 'guardian']);
  const baseCast = LocalPlayer.prototype.castSpell;
  LocalPlayer.prototype.castSpell = function () {
    const st = this.heldStaff(), k = this.activeSpell();
    if (!st || !k) return baseCast.apply(this, arguments);
    // a set of robes for the spell's school makes it stronger (for the length of this cast)
    const mul = robeBoost(this.player, k);
    if (!NEW.has(k)) { if (mul === 1) return baseCast.apply(this, arguments); st.power *= mul; try { return baseCast.apply(this, arguments); } finally { st.power /= mul; } }
    const g = this.g, p = this.player, S = SPELLS[k];
    if ((this.castCd || 0) > 0) return true;
    if (p.mana === undefined) p.mana = manaMax(p);
    if (p.mana < S.mana && !g.creative) { this.toast('Not enough mana', 'warn'); g.sfx.play('spell_fizzle'); this.castCd = 0.4; return true; }
    const lv = skillLv(p, 'magic');
    const power = st.power * mul * (1 + (lv - 1) / 98 * 0.6) * (1 + gearBonus(p.inv.held, 0.2)) * (1 + 0.15 * (typeof enchLv === 'function' ? enchLv(p.inv.held, 'arcane') : 0));
    const look = lookVector(p.yaw, p.pitch), ex = p.x, ey = p.y + 1.55, ez = p.z;
    let ok = true, cd = 0.6;
    const foes = (r) => g.entities.filter(e => e instanceof Mob && e.alive && !(e.npc && !e.T.hostile) && !e.owner && !e.tamed && Math.hypot(e.x - p.x, e.z - p.z) < r);
    switch (k) {
      case 'missiles': {
        // the nearest foe in front of you
        let best = null, bs = -1;
        for (const e of foes(24)) { const dx = e.x - p.x, dz = e.z - p.z, l = Math.hypot(dx, dz) || 1, dot = (dx * look[0] + dz * look[2]) / l; if (dot > 0.6 && dot - l / 60 > bs) { bs = dot - l / 60; best = e; } }
        for (let i = 0; i < 3; i++) {
          const a = (i - 1) * 0.35, sp = 18, vx = (look[0] * Math.cos(a) - look[2] * Math.sin(a)) * sp, vz = (look[2] * Math.cos(a) + look[0] * Math.sin(a)) * sp;
          const b = new ArcBolt(g, ex + look[0] * 0.6, ey - 0.2, ez + look[2] * 0.6, vx, look[1] * sp + 1.5, vz, 'missiles', this, Math.round(2.6 * power), best);
          g.addEntity(b);
        }
        g.sfx.playAt('spell_blink', ex, ey, ez); cd = 0.7; break;
      }
      case 'fireball': {
        const sp = 20, b = new ArcBolt(g, ex + look[0] * 0.6, ey + look[1] * 0.6 - 0.25, ez + look[2] * 0.6, look[0] * sp, look[1] * sp, look[2] * sp, 'fireball', this, Math.round(8 * power * (st.fire || 1)));
        g.addEntity(b); g.sfx.playAt('spell_fire', ex, ey, ez); cd = 1.6; break;
      }
      case 'icenova': {
        const dmg = Math.round(5 * power * (st.frost || 1));
        for (const e of foes(6.5)) { const src = { type: 'magic', attacker: this, element: 'frost', knock: 4 }; if (g.isGuest && g.net) g.net.sendHit(e, dmg, src); else { e.hurt(dmg, src); e.slowT = Math.max(e.slowT || 0, 6); } }
        for (let r = 0.5; r <= 6; r += 1.1) spellRing(g, p.x, p.y + 0.3, p.z, 'mana_frost', r, Math.round(10 + r * 6), { speed: 2, life: 0.6, flat: true, size: 0.09 });
        g.sfx.playAt('spell_frost', p.x, p.y + 1, p.z); g.sfx.playAt('spell_zap', p.x, p.y + 1, p.z, 30); cd = 2.5; break;
      }
      case 'regrowth': {
        const secs = Math.round(8 + 4 * power), lvR = power >= 1.8 ? 1 : 0;
        const ps = (g.pawns ? g.pawns() : g.locals.map(l => l.player)).filter(q => !q.dead && Math.hypot(q.x - p.x, q.z - p.z) < 9);
        for (const q of ps) { const who = g.locals.find(l => l.player === q) || q; giveEffect(who, 'regen', secs, lvR); spellSpiral(g, q.x, q.y + 0.1, q.z, 'mana_heal', 30, { r: 0.7, h: 2, turns: 2.5, life: 1 }); }
        p.heal(2); g.sfx.play('spell_heal'); cd = 1.2; break;
      }
      case 'haste': {
        giveEffect(this, 'speed', Math.round(30 + 10 * power), 1); giveEffect(this, 'jump', Math.round(30 + 10 * power), 0);
        spellSpiral(g, p.x, p.y + 0.1, p.z, 'mana_light', 40, { r: 0.6, h: 2, turns: 3, life: 0.9 }); g.sfx.play('spell_ward'); cd = 1; break;
      }
      case 'guardian': {
        if (g.isGuest) { this.toast('Only the host can raise a guardian (for now)', ''); ok = false; break; }
        for (const o of g.entities.filter(e => e.guardianOf === this.name && e.alive)) { o.remove = true; o.alive = false; }
        const fx = p.x + look[0] * 2, fz = p.z + look[2] * 2;
        const m = g.addEntity(new Mob(g, 'iron_golem', fx, p.y + 0.2, fz));
        if (m) {
          m.owner = this.name; m.tamed = true; m.kept = false; m.guardianOf = this.name; m.spiritT = 50 + 15 * power;
          m.T = Object.assign({}, m.T, { spirit: true, drops: [], xp: 0, golem: false, hostile: false });   // (0.9.0.31) not a village golem: those stand about   // a spirit of stone: it goes when its time is up, and leaves nothing behind
          m.maxHealth = m.health = Math.round(60 * power);
          for (let i = 0; i < 40; i++) { const a = Math.random() * TAU; spellSpark(g, fx + Math.cos(a), p.y + Math.random() * 2.5, fz + Math.sin(a), 'mana_stone', { vy: 1.4, life: 0.9, size: 0.09 }); }
          g.sfx.playAt('break_stone', fx, p.y + 1, fz);
        }
        cd = 3; break;
      }
    }
    if (!ok) { this.castCd = 0.3; return true; }
    if (!g.creative) {
      p.mana -= S.mana;
      // (0.9.0.31) Thrift and Archmage for these too (rpg.js's hook only sees the older spells)
      if (hasPerk(p, 'magic', 90) && Math.random() < 0.1) { p.mana += S.mana; this.floatText(p.x, p.y + 2.1, p.z, 'Free!', '#c8a0ff'); }
      else if (hasPerk(p, 'magic', 60)) p.mana += S.mana * 0.15;
    }
    this.castCd = cd;
    this.swingArm(); this.wearHeld(1);
    skillGain(this, 'magic', S.mana * 6);
    gearGain(this, p.inv.held, 2);
    spellFx(g, ex + look[0] * 0.8, ey + look[1] * 0.8 - 0.2, ez + look[2] * 0.8, S.fx, 14, 0.8, { life: 0.4 });
    castCircle(g, p.x, p.y, p.z, S);
    if (g.net) g.net[g.isGuest ? 'send' : 'all']({ t: 'adv', k: 'cast', s: k, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), b: 0 });
    return true;
  };
  // they don't fight their maker
  const baseTarget = Mob.prototype.aiTarget;
  if (baseTarget) Mob.prototype.aiTarget = function (p) { if (this.guardianOf) { const own = this.game.locals.find(l => l.name === this.guardianOf); if (own && (p === own.player || p === own)) return null; } return baseTarget.call(this, p); };
  // (0.9.0.31) the guardian goes looking for trouble near its maker, instead of waiting to be told
  const baseCtlG = Mob.prototype.controlAI;
  Mob.prototype.controlAI = function (dt, p, dist, dyp, toPlayer) {
    if (this.guardianOf && !this.ghost && this.alive && (this._gScan = (this._gScan || 0) - dt) <= 0) {
      this._gScan = 0.6;
      const f = this.petFoe;
      if (!f || f.remove || f.alive === false) {
        const o = this.ownerPawn ? this.ownerPawn() : null, cx = o ? o.x : this.x, cz = o ? o.z : this.z;
        let best = null, bd = 14;
        for (const e of this.game.entities) {
          if (!(e instanceof Mob) || e === this || !e.alive || e.remove || !e.T || !e.T.hostile || e.owner || e.tamed || e.ghost) continue;
          const d = Math.hypot(e.x - cx, e.z - cz); if (d < bd && Math.abs(e.y - this.y) < 6) { bd = d; best = e; }
        }
        this.petFoe = best;
      }
    }
    return baseCtlG.call(this, dt, p, dist, dyp, toPlayer);
  };
  // spells that don't repeat when you hold the button
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    if (repeat && !fromOff && this.heldStaff && this.heldStaff() && ['regrowth', 'haste', 'guardian', 'icenova'].includes(this.activeSpell())) return;
    return baseUse.call(this, repeat, inp, fromOff);
  };
}

// ---- robes and wizard hats -------------------------------------------------------------------------------------
const SCHOOL_ROBES = {
  pyromancer: { label: 'Pyromancer', school: 'fire', mat: 'red_wool', gem: 'ruby', pts: [2, 4, 3, 1], dur: 18, mana: 6, regen: 0.25, cols: ['#b8301a', '#5a120a', '#ffb040'], names: ['Hat', 'Robe', 'Skirts', 'Shoes'] },
  frostweaver: { label: 'Frostweaver', school: 'frost', mat: 'light_blue_wool', gem: 'sapphire', pts: [2, 4, 3, 1], dur: 18, mana: 6, regen: 0.25, cols: ['#4a9ae0', '#1a3a6a', '#eaf8ff'], names: ['Hat', 'Robe', 'Skirts', 'Shoes'] },
  druid: { label: 'Druid', school: 'life', mat: 'green_wool', gem: 'emerald', pts: [2, 4, 3, 1], dur: 18, mana: 6, regen: 0.3, cols: ['#4a7a2a', '#22400e', '#e8d070'], names: ['Hat', 'Robe', 'Skirts', 'Shoes'] },
  stormcaller: { label: 'Stormcaller', school: 'storm', mat: 'gray_wool', gem: 'lapis_lazuli', pts: [2, 4, 3, 1], dur: 18, mana: 6, regen: 0.25, cols: ['#4a4e6a', '#1e2030', '#f0e070'], names: ['Hat', 'Robe', 'Skirts', 'Shoes'] },
};
{
  for (const [mk, m] of Object.entries(SCHOOL_ROBES)) {
    ARMOR_MATS[mk] = { label: m.label, mat: m.mat, pts: m.pts, dur: m.dur };
    ARMOR_COLORS[mk] = m.cols.map(hexRGB);
    ARMOR_PIECES.forEach((pc, i) => {
      defItem(mk + '_' + pc.key, { name: m.label + ' ' + m.names[i], maxStack: 1, icon: mk + '_' + pc.key, armor: { slot: pc.slot, points: m.pts[pc.slot], durability: m.dur * pc.durMul, mana: m.mana, regen: m.regen }, hat: pc.slot === 0 ? mk : undefined, school: m.school, desc: `+${m.mana} mana · the whole set: ${m.school} spells a third stronger` });
      const shape = [['MGM', 'M M'], ['M M', 'MGM', 'MMM'], ['MGM', 'M M', 'M M'], ['M M', 'G G']][pc.slot];
      RECIPES.push({ out: mk + '_' + pc.key, n: 1, shape, key: { M: m.mat, G: m.gem }, group: 'armor' });
    });
  }
  // the archmage's hood is a hat now; the set helps every spell a little
  if (ITEMS.archmage_helmet) { ITEMS.archmage_helmet.hat = 'archmage'; ITEMS.archmage_helmet.name = 'Archmage Hat'; }
  if (typeof NPC_SHOPS !== 'undefined') {
    NPC_SHOPS.librarian.buy.push(['tome_missiles', 1, 10, 1], ['tome_regrowth', 1, 18, 2], ['tome_haste', 1, 18, 2]);
    NPC_SHOPS.cleric.buy.push(['druid_helmet', 1, 10, 2], ['druid_chestplate', 1, 16, 2]);
  }
  if (typeof DUNGEON_LOOT !== 'undefined') {
    DUNGEON_LOOT.rare.push(['tome_missiles', 1, 1, 0.12], ['tome_fireball', 1, 1, 0.1], ['tome_regrowth', 1, 1, 0.08], ['tome_haste', 1, 1, 0.08]);
    DUNGEON_LOOT.boss.push(['tome_icenova', 1, 1, 0.25], ['tome_guardian', 1, 1, 0.2], ['tome_fireball', 1, 1, 0.25], ['pyromancer_helmet', 1, 1, 0.12], ['frostweaver_helmet', 1, 1, 0.12], ['stormcaller_helmet', 1, 1, 0.12]);
  }
  if (typeof STRUCT_LOOT !== 'undefined') for (const k of Object.keys(STRUCT_LOOT)) if (/tower|mage|library/.test(k)) STRUCT_LOOT[k].push(['tome_icenova', 1, 1, 0.12], ['tome_guardian', 1, 1, 0.1], ['tome_missiles', 1, 1, 0.2], ['tome_fireball', 1, 1, 0.15]);
}
// how much a set of robes helps a spell
function robeBoost(p, spell) {
  const worn = p.inv.armor.slots.map(s => s && itemDef(s.id)).filter(Boolean);
  if (worn.length < 4) return 1;
  const sets = new Set(worn.map(d => (d.icon || d.key || '').split('_')[0]));
  if (sets.size !== 1) return 1;
  const mk = [...sets][0];
  if (mk === 'archmage') return 1.12;
  const R = SCHOOL_ROBES[mk];
  return R && SCHOOL_OF[spell] === R.school ? 1.33 : 1;
}
// the wizard's hat: a brim, a tall crown leaning back to a point, a band round it
const HAT_MESHES = {};
function hatMesh(gl, mk) {
  if (HAT_MESHES[mk] !== undefined) return HAT_MESHES[mk];
  const cloth = tilesOf('armor_' + mk), band = tilesOf('hatband_' + mk), mb = new MeshBuilder(64);
  const box = (a, b, t) => addBox(mb, a.map(v => v * PX), b.map(v => v * PX), t);
  box([-6.6, 7.4, -6.6], [6.6, 8.3, 6.6], cloth);
  box([-4.5, 8.3, -4.5], [4.5, 9.3, 4.5], band);
  box([-4.3, 9.3, -4.1], [4.3, 11.2, 4.5], cloth);
  box([-3.4, 11.2, -3.0], [3.4, 13.2, 4.0], cloth);
  box([-2.5, 13.2, -1.6], [2.5, 15.0, 3.6], cloth);
  box([-1.6, 15.0, -0.2], [1.6, 16.6, 3.4], cloth);
  box([-0.9, 16.6, 1.4], [0.9, 18.0, 3.4], cloth);
  box([-0.5, 17.6, 2.6], [0.5, 18.6, 4.4], cloth);
  const r = mb.result();
  return (HAT_MESHES[mk] = makeVAO(gl, r.verts, r.idx));
}
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    for (const [mk, cols] of Object.entries(Object.assign({}, Object.fromEntries(Object.entries(SCHOOL_ROBES).map(([k, m]) => [k, m.cols])), { archmage: ['#6a2a9a', '#3a1258', '#e8c8ff'] }))) {
      const [c, d, l] = cols.map(H);
      if (SCHOOL_ROBES[mk]) {
        const cloth = (p) => { p.noise(c, 0.1); for (let y = 0; y < 16; y += 3) for (let x = 0; x < 16; x++) if (p.rand() < 0.3) p.set(x, y, shade(c, 0.9)); for (let x = 0; x < 16; x++) { p.set(x, 15, l); p.set(x, 14, d); } for (let k = 0; k < 4; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 13), shade(l, 0.9)); };
        addTile('armor_' + mk, cloth);
        addTile('armor_' + mk + '_face', p => { cloth(p); for (let y = 3; y < 15; y++) for (let x = 3; x < 13; x++) p.set(x, y, [0, 0, 0], 0); });
      }
      addTile('hatband_' + mk, p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y < 3 || y > 12 ? d : shade(l, 0.85 + p.rand() * 0.2)); for (let x = 6; x < 10; x++) for (let y = 5; y < 11; y++) p.set(x, y, shade(l, 1.25)); });
      // the hat as an item: a pointed crown leaning back over a wide brim
      addItem(mk + '_helmet', p => p.art([
        '................', '..........aa....', '.........aAa....', '........aAAa....', '.......aAAAa....', '.......aAALa....', '......aAAALa....', '......aAAAAa....',
        '.....aAAAALa....', '.....aAAAAAa....', '....aBBBBBBBa...', '....aBBBBBBBa...', '.aaaAAAAAAAAAaa.', 'aAAAAAAAAAAAAAAa', '.aaaaaaaaaaaaaa.', '................',
      ], { A: c, a: d, L: shade(c, 1.3), B: l }));
    }
  };
  // drawn in place of the box helmet (render/skins.js asks hatMesh for a helmet whose item has .hat)
}

// ---- potions ------------------------------------------------------------------------------------------------------
Object.assign(EFFECTS, {
  clarity: { name: 'Clarity', col: '#6a8aff' },
  fortune: { name: 'Fortune', col: '#3ad07a' },
  haste: { name: 'Haste', col: '#e8d04a' },
  warding: { name: 'Warding', col: '#ffe08a' },
});
{
  const NEWP = {
    clarity: { name: 'Clarity', col: '#6a8aff', fx: [['clarity', 120]], long: [['clarity', 300]], strong: [['clarity', 60, 1]], ing: 'lapis_lazuli' },
    fortune: { name: 'Fortune', col: '#3ad07a', fx: [['fortune', 180]], long: [['fortune', 420]], strong: [['fortune', 90, 1]], ing: 'emerald' },
    haste: { name: 'Haste', col: '#e8d04a', fx: [['haste', 180]], long: [['haste', 420]], strong: [['haste', 90, 1]], ing: 'iron_nugget' },
    warding: { name: 'Warding', col: '#ffe08a', fx: [['warding', 60]], long: [['warding', 150]], strong: [['warding', 40, 1]], ing: 'gold_ingot' },
  };
  const link = (a, ing, b) => { (BREW[a] || (BREW[a] = {}))[ing] = b; BREW_INGS.add(ing); };
  for (const [P, D] of Object.entries(NEWP)) {
    POTIONS[P] = D;
    const vars = [[null, D.fx]]; if (D.long) vars.push(['long', D.long]); if (D.strong) vars.push(['strong', D.strong]);
    for (const splash of [false, true]) for (const [v, fx] of vars) {
      const key = potKey(P, v, splash), nm = (splash ? 'Splash Potion of ' : 'Potion of ') + D.name + (v === 'strong' ? ' II' : '');
      defItem(key, { name: nm, maxStack: 1, drink: 'milk', splash, icon: (splash ? 'splash_ico_' : 'potion_ico_') + P, potion: { P, v, fx: fx || [], col: D.col, splash }, desc: splash ? 'Use to throw it.' : 'Use to drink it.' });
    }
    link('potion_awkward', D.ing, potKey(P));
    if (D.long) link(potKey(P), 'redstone', potKey(P, 'long'));
    if (D.strong) link(potKey(P), 'glowstone_dust', potKey(P, 'strong'));
    for (const v of [null, 'long', 'strong']) { const k = potKey(P, v); if (!ITEMS[k]) continue; link(k, 'gunpowder', 'splash_' + k); for (const [ing, to] of Object.entries(BREW[k] || {})) if (ITEMS['splash_' + to]) link('splash_' + k, ing, 'splash_' + to); }
  }
  // (0.9.0.31) players joined over the network feel them too
  for (const k of Object.keys(NEWP)) { REMOTE_FX.add('fx_' + k); REMOTE_FX.add('fxl_' + k); }
  // what they do
  const baseRegen = manaRegen;
  manaRegen = function (p) { return baseRegen(p) * (p.fx_clarity > 0 ? 1.8 + 0.4 * (p.fxl_clarity | 0) : 1); };
  const baseTime = LocalPlayer.prototype.breakTime;
  LocalPlayer.prototype.breakTime = function (id, hit) { const t = baseTime.call(this, id, hit), p = this.player; return p.fx_haste > 0 && isFinite(t) && t > 0.05 ? Math.max(0.05, t / (1.25 + 0.2 * (p.fxl_haste | 0))) : t; };
  const baseGive = giveEffect;
  giveEffect = function (q, eff, secs, lv = 0, src) {
    const r = baseGive(q, eff, secs, lv, src);
    if (eff === 'warding' && q && !(typeof RemotePawn === 'function' && q instanceof RemotePawn)) { const p = q.player || q; p.ward = Math.max(p.ward || 0, 6 * (lv + 1)); p._wardGot = true; }
    return r;
  };
  // a guest's Warding arrives as the effect alone: the ward comes up with it, once per potion
  const baseWUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const p = this.player;
    if (p.fx_warding > 0) { if (!p._wardGot) { p._wardGot = true; p.ward = Math.max(p.ward || 0, 6 * ((p.fxl_warding | 0) + 1)); } }
    else if (p._wardGot) p._wardGot = false;
    return baseWUpd.call(this, dt, inp);
  };
  const baseBreak = LocalPlayer.prototype.breakBlock;
  LocalPlayer.prototype.breakBlock = function (x, y, z) {
    const g = this.g, w = g.world, p = this.player, id = w.getBlock(x, y, z), b = BLOCKS[id];
    const placed = typeof placedAt === 'function' && placedAt(w, x, y, z), sk = id && typeof blockSkill === 'function' ? blockSkill(b) : null, harvest = id && this.canHarvest(id);
    // Smelting Touch: what drops comes out smelted
    const held = p.inv.held, smelt = held && enchLv(held, 'smelt');
    let r;
    if (smelt) {
      const baseDrop = g.dropItem, own = Object.prototype.hasOwnProperty.call(g, 'dropItem');
      const own1 = b && (b.drop || b.key);   // (0.9.0.31) only the block's own drop: not what spills out of a broken chest
      g.dropItem = function (s, ...a) { if (s && (s.id === own1 || (b && s.id === b.key)) && SMELTING[s.id] && ITEMS[SMELTING[s.id]]) { s = mkStack(SMELTING[s.id], s.n); if (Math.random() < 0.3) g.burst(x + 0.5, y + 0.5, z + 0.5, 'flame', 4, 0.4); } return baseDrop.call(this, s, ...a); };
      try { r = baseBreak.call(this, x, y, z); } finally { if (own) g.dropItem = baseDrop; else delete g.dropItem; }
    } else r = baseBreak.call(this, x, y, z);
    if (p.fx_fortune > 0 && sk && sk[2] && harvest && !placed && !g.creative && w.getBlock(x, y, z) !== id && b.drop && Math.random() < 0.25 + 0.15 * (p.fxl_fortune | 0)) g.dropItem(mkStack(b.drop, 1), x + 0.5, y + 0.5, z + 0.5, true);
    return r;
  };
}

// ---- enchantments --------------------------------------------------------------------------------------------------
Object.assign(ENCH, {
  vamp: { name: 'Vampirism', max: 2, on: ['sword', 'axe'], w: 2, minP: 12, treasure: false, desc: 'Heals you a little with every blow' },
  frostasp: { name: 'Frost Aspect', max: 2, on: ['sword'], w: 2, minP: 10, excl: ['fire'], desc: 'Slows what you hit' },
  smelt: { name: 'Smelting Touch', max: 1, on: ENCH_TOOLS, w: 1, minP: 16, group: 'drop', desc: 'What you dig up comes out smelted' },
  volley: { name: 'Volley', max: 1, on: ['bow'], w: 1, minP: 18, desc: 'Each shot looses three arrows (for one)' },
  swiftboots: { name: 'Swiftness', max: 3, on: ['boots'], w: 3, desc: 'You walk and run faster' },
  insight: { name: 'Insight', max: 3, on: ['helmet'], w: 3, desc: 'More experience from everything' },
});
ENCH.fire.excl = (ENCH.fire.excl || []).concat(['frostasp']);
{
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const a = src.attacker, lp = a instanceof LocalPlayer ? a : null, held = lp && src.weapon ? lp.player.inv.held : null;
    const dealt = baseHurt.call(this, amount, src);
    if (held && dealt > 0) {
      const v = enchLv(held, 'vamp'); if (v) lp.player.heal(dealt * 0.04 * v);
      const f = enchLv(held, 'frostasp'); if (f && this.alive) { this.slowT = Math.max(this.slowT || 0, 2 + 2 * f); spellFx(this.game, this.x, this.y + this.h * 0.6, this.z, 'mana_frost', 6, 0.8, { life: 0.5 }); }
    }
    return dealt;
  };
  const baseShoot = LocalPlayer.prototype.shootArrow;
  LocalPlayer.prototype.shootArrow = function (power) {
    const g = this.g, p = this.player, before = new Set(g.entities);
    const r = baseShoot.call(this, power);
    const bow = p.inv.held, a = g.entities.find(e => e instanceof Arrow && !before.has(e) && e.owner === this);
    if (a && bow && enchLv(bow, 'volley')) for (const s of [-1, 1]) {
      const ang = s * 0.12, c = Math.cos(ang), sn = Math.sin(ang);
      const b = new Arrow(g, a.x, a.y, a.z, a.vx * c - a.vz * sn, a.vy, a.vz * c + a.vx * sn, this, a.damage, false);
      g.addEntity(b);
    }
    return r;
  };
  const baseMove = Player.prototype.move;
  Player.prototype.move = function (world, inp, dt, opts) {
    const boots = this.inv && this.inv.armor && this.inv.armor.slots[3], lv = boots ? enchLv(boots, 'swiftboots') : 0;
    if (lv && !this.flying) opts = Object.assign({}, opts, { slow: (opts && opts.slow || 1) * (1 + 0.06 * lv) });
    return baseMove.call(this, world, inp, dt, opts);
  };
  const baseXP = LocalPlayer.prototype.grantXP;
  LocalPlayer.prototype.grantXP = function (n, x, y, z) {
    const helm = this.player.inv.armor.slots[0], lv = helm ? enchLv(helm, 'insight') : 0;
    return baseXP.call(this, lv ? Math.round(n * (1 + 0.15 * lv)) : n, x, y, z);
  };
}
PV.debug.arcana = { robeBoost: (p, s) => robeBoost(p, s), hatMesh: (mk) => !!hatMesh(GAME.renderer.gl, mk) };
