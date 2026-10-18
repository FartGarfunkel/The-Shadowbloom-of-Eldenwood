// ---------------------------------------------------------------------------
// dnd/spells.js — casting the tabletop spells in real time.
//
// The spell you have ready shows on the HUD; Z casts it (d-pad up), G picks the next
// (d-pad left). Cantrips are free; a levelled spell spends a slot of its level (or the
// lowest higher one, which makes it stronger). Bolts and rays make a spell attack roll
// against armour class; bursts, cones and lines ask for a saving throw against your
// spell save DC (half damage on a success). Spells marked concentration last while you
// hold them: casting another such spell, or failing the save when hit, ends them.
// ---------------------------------------------------------------------------

function dndKnown(c) { return (c.spells || []).filter(k => DND_SPELLS[k]); }
function dndNextSpell(lp) {
  const c = dndLive(lp); if (!c) return;
  const list = dndKnown(c); if (!list.length) { lp.toast('You know no spells', ''); return; }
  const i = list.indexOf(lp._dndSpell);
  lp._dndSpell = list[(i + 1) % list.length];
  const S = DND_SPELLS[lp._dndSpell];
  lp.toast(`${S.name} — ${S.lvl ? 'level ' + S.lvl : 'cantrip'}${S.conc ? ' · concentration' : ''}`, '');
  lp.g.sfx.play('click'); dndHudDirty(lp);
}
// the slot a levelled spell would use (index into c.slots), or -1
function dndSlotFor(c, lvl) { for (let i = lvl - 1; i < c.slots.length; i++) if (c.slots[i] > 0) return i; return -1; }
function dndCantripDice(c, dice) { const n = c.level >= 17 ? 4 : c.level >= 11 ? 3 : c.level >= 5 ? 2 : 1; return [dice[0] * n, dice[1]]; }
function dndSpellDice(c, S, slotLvl) {
  if (!S.dice) return null;
  if (S.scale === 'cantrip') return dndCantripDice(c, S.dice);
  if (typeof S.scale === 'number' && slotLvl > S.lvl) return [S.dice[0] + S.scale * (slotLvl - S.lvl), S.dice[1]];
  return S.dice;
}

// what's in front of you: the nearest creature near your gaze, within range
function dndLookTarget(lp, range, o = {}) {
  const g = lp.g, p = lp.player, look = lookVector(p.yaw, p.pitch), ex = p.x, ey = p.y + p.eye, ez = p.z;
  let best = null, bs = Infinity;
  const pool = o.allies ? g.pawns().filter(q => q !== lp && q.player !== p && !q.dead) : g.entities.filter(e => e instanceof Mob && e.alive && !e.remove && (o.any || !(e.npc && !e.T.hostile)) && !(e.tamed && e.owner === lp.name) && !e.dndSummonBy);
  for (const e of pool) {
    const h = e.h || 1.8, dx = e.x - ex, dy = e.y + h * 0.55 - ey, dz = e.z - ez, d = Math.hypot(dx, dy, dz);
    if (d > range || d < 0.3) continue;
    const dot = (dx * look[0] + dy * look[1] + dz * look[2]) / d;
    const tol = Math.max(0.94, 1 - 0.9 / Math.max(1.5, d));
    if (dot < tol) continue;
    // nothing solid in between
    let blocked = false;
    for (let t = 0.8; t < d - 1.2; t += 0.5) if (T_SOLID[g.world.getBlock(Math.floor(ex + dx / d * t), Math.floor(ey + dy / d * t), Math.floor(ez + dz / d * t))]) { blocked = true; break; }
    if (blocked) continue;
    const score = (1 - dot) * 40 + d * 0.05;
    if (score < bs) { bs = score; best = e; }
  }
  return best;
}
// the point where your gaze meets a block (or a creature), out to range
function dndLookPoint(lp, range) {
  const g = lp.g, p = lp.player, look = lookVector(p.yaw, p.pitch), ex = p.x, ey = p.y + p.eye, ez = p.z;
  const e = dndLookTarget(lp, range);
  if (e) return [e.x, e.y + 0.1, e.z];
  for (let d = 1; d <= range; d += 0.4) {
    const x = ex + look[0] * d, y = ey + look[1] * d, z = ez + look[2] * d;
    if (T_SOLID[g.world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))]) return [x - look[0] * 0.5, y - look[1] * 0.5, z - look[2] * 0.5];
  }
  return [ex + look[0] * range, ey + look[1] * range, ez + look[2] * range];
}
function dndHostilesNear(g, x, y, z, r, lp) { return g.entities.filter(e => e instanceof Mob && e.alive && !e.remove && !(e.npc && !e.T.hostile) && !(e.tamed) && !e.dndSummonBy && Math.hypot(e.x - x, e.z - z) < r + e.w && Math.abs(e.y + e.h / 2 - y) < r + e.h); }

// a creature's saving throw against your DC
function dndMobSave(e, ab, dc) {
  const T = e.T || {}, hp = e.maxHealth || T.hp || 10;
  let mod = Math.round(Math.log2(Math.max(2, hp)) * 0.7) - 1;
  if (T.saves && T.saves[ab] != null) mod = T.saves[ab];
  if (T.boss) mod += 2;
  if ((ab === 'wis' || ab === 'int' || ab === 'cha') && /ghoul|zombie|slime|husk|drowned/.test(e.type || '')) mod -= 2;
  if (ab === 'dex' && (e.dndHeld > 0 || e.dndSleep > 0)) return { ok: false, total: 0 };
  const R = dndD20({ mod });
  return { ok: R.total >= dc, total: R.total, nat1: R.nat1 };
}
// harm from a spell (on a guest's screen it goes to the host to land)
function dndSpellHit(lp, e, dmg, type, extra = {}) {
  const g = lp.g;
  const k = dndMobTakes(e, type);
  dmg = Math.round(dmg * k);
  const src = { type: 'magic', attacker: lp, element: type === 'fire' ? 'fire' : type === 'cold' ? 'frost' : type === 'lightning' ? 'lightning' : type, knock: extra.knock ?? 0.6, dnd: true };
  if (k === 0) { lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Immune', '#ffb070'); return 0; }
  const col = DND_DMG_COL[type] || '#ffffff';
  if (dmg > 0) lp.floatText(e.x, e.y + e.h + 0.3, e.z, `${dmg} ${type}`, col);
  if (g.isGuest && g.net) g.net.sendHit(e, dmg, src); else if (dmg > 0) e.hurt(dmg, src);
  if (extra.burn && !e.T.fireImmune) e.burn = Math.max(e.burn || 0, 4);
  if (extra.slow) e.slowT = Math.max(e.slowT || 0, extra.slow);
  return dmg;
}
function dndSpellBurst(g, x, y, z, fx, n = 30, r = 1) {
  spellFx(g, x, y, z, fx, n, 2.2 * r, { life: 0.6, size: 0.1 });
  spellRing(g, x, y + 0.1, z, fx, 0.3 * r, 24, { speed: 3 * r, life: 0.5, flat: true });
}
function dndMarkOn(e, kind, t, lp, spell) { e.dndMark = e.dndMark || {}; e.dndMark[kind] = t; e.dndMark.by = lp; e.dndMark.spell = spell; if (kind === 'hunted') e.dndMark.hunter = lp; if (kind === 'hexed') e.dndMark.hexer = lp; }

// ---- the bolt ---------------------------------------------------------------------------------------------------------
class DndBolt extends Entity {
  constructor(game, x, y, z, v, spell, caster, o) {
    super(game, x, y, z); this.netLocalOnly = true; this.vx = v[0]; this.vy = v[1]; this.vz = v[2]; this.spell = spell; this.caster = caster; this.o = o; this.w = 0.2; this.h = 0.3;
    this.S = DND_SPELLS[spell]; this.fx = this.S.fx; this.home = o.home || null;
  }
  update(dt) {
    const g = this.game; this.age += dt;
    if (this.age > 2.5) { this.remove = true; return; }
    if (this.home && this.home.alive) { const sp = Math.hypot(this.vx, this.vy, this.vz) || 20, dx = this.home.x - this.x, dy = this.home.y + this.home.h * 0.6 - this.y, dz = this.home.z - this.z, d = Math.hypot(dx, dy, dz) || 1, k = Math.min(1, dt * 7); this.vx += (dx / d * sp - this.vx) * k; this.vy += (dy / d * sp - this.vy) * k; this.vz += (dz / d * sp - this.vz) * k; }
    for (let s = 0; s < 4; s++) {
      this.x += this.vx * dt / 4; this.y += this.vy * dt / 4; this.z += this.vz * dt / 4;
      for (const e of g.entities) {
        if (!(e instanceof Mob) || !e.alive || e === this.caster || e.dndSummonBy || (e.npc && !e.T.hostile) || e.tamed) continue;
        if (Math.abs(e.x - this.x) < e.w + 0.25 && Math.abs(e.z - this.z) < e.w + 0.25 && this.y > e.y - 0.1 && this.y < e.y + e.h + 0.1) { this.hit(e); return; }
      }
      if (T_SOLID[g.world.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))]) { this.hit(null); return; }
    }
    spellFx(g, this.x, this.y, this.z, this.fx, 3, 0.25, { life: 0.3, size: 0.12, spread: 0.12 });
    if (this.S.dmg === 'fire' && Math.random() < 0.5) g.flame(this.x, this.y, this.z);
  }
  hit(e) {
    const g = this.game; this.remove = true;
    dndSpellBurst(g, this.x, this.y, this.z, this.fx, 26, 0.8);
    g.sfx.playAt('spell_hit', this.x, this.y, this.z);
    if (!e || !this.o.land) return;
    this.o.land(e);
  }
  snap() { return null; }
  draws() {}
  glow(out) { const uv = tileUV(ATLAS.tile[this.fx] ?? ATLAS.tile.white); out.push({ x: this.x, y: this.y, z: this.z, size: 0.34 + Math.sin(this.age * 40) * 0.05, uv, light: 0xFF }); out.push({ x: this.x, y: this.y, z: this.z, size: 0.55, uv: tileUV(ATLAS.tile.mana_arcane ?? ATLAS.tile.white), light: 0xFF }); }
}

// a spell that reaches a creature lands (alpha 2: live action); now and then it strikes true and hits twice as hard
function dndSpellAttackRoll(lp, c, e) {
  const { adv, dis } = dndAdvAgainst(lp, e, c);
  const crit = Math.random() < dndCritChance(c, adv || c.conds.innate > 0, dis);
  if (e.dndMark && e.dndMark.guided > 0) e.dndMark.guided = 0;
  return { hit: true, crit };
}
function dndRollSpellDmg(dice, crit, plus = 0) { return dndRoll(dice[0] * (crit ? 2 : 1), dice[1], plus).total; }
// a creature's effects from a spell that landed
function dndSpellEffects(lp, e, S, c) {
  if (S.slow) e.slowT = Math.max(e.slowT || 0, S.slow);
  if (S.mark) dndMarkOn(e, S.mark, S.dur || 60, lp, S.key);
  if (S.weaken) e.dndWeak = S.weaken;
  if (S.noHeal) e.dndNoHeal = S.noHeal;
  if (S.fear) { e.panicT = Math.max(e.panicT || 0, S.fear); e.fleeFrom = lp.player; e.foe = null; }
  if (S.hold) e.dndHeld = Math.max(e.dndHeld || 0, S.hold);
  if (S.root) e.dndHeld = Math.max(e.dndHeld || 0, S.root);
  if (S.sleep) e.dndSleep = Math.max(e.dndSleep || 0, S.sleep);
  if (S.charm) e.dndCharm = Math.max(e.dndCharm || 0, S.charm);
  if (S.knock) { const kx = e.x - lp.player.x, kz = e.z - lp.player.z, l = Math.hypot(kx, kz) || 1; e.vx += kx / l * S.knock * 3; e.vz += kz / l * S.knock * 3; e.vy = Math.max(e.vy, 4); }
}

// ---- casting ----------------------------------------------------------------------------------------------------------
function dndCastReady(lp) {
  const c = dndLive(lp); if (!c) return;
  if (!lp._dndSpell || !c.spells.includes(lp._dndSpell)) lp._dndSpell = dndKnown(c)[0];
  const k = lp._dndSpell; if (!k) { lp.toast('You know no spells. (Your class may not cast — try your class feature, ' + dndKeyName(lp, 'dndAbility') + ')', ''); return; }
  dndCast(lp, k);
}
function dndCast(lp, k, o = {}) {
  const g = lp.g, p = lp.player, c = dndLive(lp), S = DND_SPELLS[k]; if (!c || !S) return false;
  S.key = k;
  if ((lp._castCd || 0) > g.time) return false;
  dndDerive(c, p.inv);
  // the slot
  let slotLvl = 0, slotI = -1;
  if (S.lvl > 0 && !o.free) {
    slotI = dndSlotFor(c, S.lvl);
    if (slotI < 0) { lp.toast(`No spell slots left for ${S.name}. Rest to recover them.`, 'warn'); g.sfx.play('spell_fizzle'); lp._castCd = g.time + 0.4; return false; }
    slotLvl = slotI + 1;
  } else slotLvl = S.lvl;
  if (S.cost && !g.creative && !o.free) { if (p.inv.count(S.cost) < 1) { lp.toast(`${S.name} needs a ${itemDef(S.cost).name} to cast`, 'warn'); return false; } }
  const look = lookVector(p.yaw, p.pitch), ex = p.x + look[0] * 0.6, ey = p.y + p.eye - 0.25 + look[1] * 0.6, ez = p.z + look[2] * 0.6;
  const dice = dndSpellDice(c, S, slotLvl), mod = dndCastMod(c), dc = dndSpellDC(c);
  let ok = true;
  const dmgType = S.dmg === 'chosen' ? (lp._orbType || 'fire') : S.dmg;
  switch (S.kind) {
    case 'bolt': case 'missile': {
      const target = dndLookTarget(lp, S.range || 24);
      let n = 1;
      if (S.beams === 'cantrip') n = c.level >= 17 ? 4 : c.level >= 11 ? 3 : c.level >= 5 ? 2 : 1;
      if (S.rays) n = S.rays + (slotLvl - S.lvl) * (S.scaleRays || 0);
      if (S.kind === 'missile') n = S.darts + (slotLvl - S.lvl) * (S.scale || 0);
      const sp = S.kind === 'missile' ? 18 : 30;
      const land = (e) => {
        if (S.kind === 'missile') { dndSpellHit(lp, e, dndRoll(S.dice[0], S.dice[1], S.plus || 0).total, dmgType); return; }
        if (S.save) { const sv = dndMobSave(e, S.save, dc); if (sv.ok) { lp.floatText(e.x, e.y + e.h + 0.6, e.z, 'Saved', '#8fe3ff'); return; } dndSpellHit(lp, e, dndRollSpellDmg(S.beams || S.rays ? S.dice : dice, false), dmgType); dndSpellEffects(lp, e, S, c); return; }
        const A = dndSpellAttackRoll(lp, c, e); if (!A.hit) return;
        const dd = S.beams || S.rays ? S.dice : dice;
        dndSpellHit(lp, e, dndRollSpellDmg(dd, A.crit) + (S.beams && c.cls === 'warlock' && c.level >= 2 ? Math.max(0, mod) : 0), dmgType, { burn: dmgType === 'fire' && Math.random() < 0.5 });
        if (A.crit) lp.floatText(e.x, e.y + e.h + 0.7, e.z, 'CRITICAL!', '#ffe060');
        dndSpellEffects(lp, e, S, c);
      };
      for (let i = 0; i < n; i++) setTimeout(() => {
        if (!lp.player || lp.player.dead) return;
        const lk = lookVector(p.yaw + (n > 1 ? (i - (n - 1) / 2) * 0.05 : 0), p.pitch);
        const b = new DndBolt(g, p.x + lk[0] * 0.6, p.y + p.eye - 0.25 + lk[1] * 0.6, p.z + lk[2] * 0.6, [lk[0] * sp, lk[1] * sp, lk[2] * sp], k, lp, { land, home: S.kind === 'missile' ? target : null });
        g.addEntity(b);
        g.sfx.playAt(dmgType === 'fire' ? 'spell_fire' : dmgType === 'cold' ? 'spell_frost' : 'spell_zap', p.x, p.y + 1.5, p.z);
      }, i * 140);
      break;
    }
    case 'ray': case 'touch': {
      const e = dndLookTarget(lp, S.kind === 'touch' ? 4 : (S.range || 12));
      // the beam, there and back
      const to = e ? [e.x, e.y + e.h * 0.6, e.z] : dndLookPoint(lp, S.kind === 'touch' ? 2 : S.range || 12);
      const L = Math.hypot(to[0] - ex, to[1] - ey, to[2] - ez);
      for (let t = 0; t <= L; t += 0.3) { const q = t / L; spellSpark(g, ex + (to[0] - ex) * q, ey + (to[1] - ey) * q, ez + (to[2] - ez) * q, S.fx, { life: 0.35, size: 0.07 }); }
      g.sfx.playAt(dmgType === 'cold' ? 'spell_frost' : 'spell_zap', p.x, p.y + 1.5, p.z);
      if (!e) { lp.toast('Nothing there', ''); ok = S.kind === 'ray'; break; }
      const A = dndSpellAttackRoll(lp, c, e);
      if (A.hit) { dndSpellHit(lp, e, dndRollSpellDmg(dice, A.crit), dmgType, { knock: S.knock || 0.4 }); dndSpellEffects(lp, e, S, c); if (S.adv === 'metal') e.dndWeak = 3; }
      break;
    }
    case 'cone': case 'line': case 'burst': {
      let cx, cy, cz, r = S.range || 3;
      if (S.kind === 'burst' && !S.self) [cx, cy, cz] = dndLookPoint(lp, S.at || 18);
      else { cx = p.x; cy = p.y + 1; cz = p.z; }
      const hits = [];
      if (S.kind === 'cone') {
        for (const e of dndHostilesNear(g, p.x, p.y + 1, p.z, r + 1.5, lp)) { const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1; if ((dx * look[0] + dz * look[2]) / d / Math.hypot(look[0], look[2]) > 0.72) hits.push(e); }
        for (let i = 0; i < 70; i++) { const a = (Math.random() - 0.5) * 1.3, sp = 4 + Math.random() * 5, lx = look[0] * Math.cos(a) - look[2] * Math.sin(a), lz = look[0] * Math.sin(a) + look[2] * Math.cos(a); spellSpark(g, ex, ey, ez, S.fx, { vx: lx * sp, vy: look[1] * sp + (Math.random() - 0.5), vz: lz * sp, life: r / sp + 0.15, size: 0.09 }); if (dmgType === 'fire' && i % 4 === 0) g.flame(ex + lx * Math.random() * r, ey, ez + lz * Math.random() * r); }
      } else if (S.kind === 'line') {
        for (const e of dndHostilesNear(g, p.x, p.y + 1, p.z, r + 1, lp)) { const dx = e.x - ex, dy = e.y + e.h / 2 - ey, dz = e.z - ez, t = dx * look[0] + dy * look[1] + dz * look[2]; if (t < 0 || t > r) continue; const px2 = ex + look[0] * t - e.x, py2 = ey + look[1] * t - e.y - e.h / 2, pz2 = ez + look[2] * t - e.z; if (Math.hypot(px2, py2, pz2) < 1.4) hits.push(e); }
        for (let t = 0; t < r; t += 0.25) { spellSpark(g, ex + look[0] * t + (Math.random() - 0.5) * 0.3, ey + look[1] * t + (Math.random() - 0.5) * 0.3, ez + look[2] * t + (Math.random() - 0.5) * 0.3, S.fx, { life: 0.5, size: 0.08 }); }
        if (g.weather) g.weather.flashT = 0.15;
      } else {
        for (const e of dndHostilesNear(g, cx, cy, cz, r, lp)) hits.push(e);
        dndSpellBurst(g, cx, cy, cz, S.fx, 60, r / 2 + 0.6);
        if (S.storm && typeof LightningBolt === 'function') g.addEntity(new LightningBolt(g, cx, cy, cz));
        if (S.ignite) for (let i = 0; i < 14; i++) g.flame(cx + (Math.random() - 0.5) * r * 2, cy, cz + (Math.random() - 0.5) * r * 2);
        if (S.places && !g.isGuest && B[S.places] !== undefined) for (let i = 0; i < 8; i++) { const bx = Math.floor(cx + (Math.random() - 0.5) * r * 2), bz = Math.floor(cz + (Math.random() - 0.5) * r * 2), by = Math.floor(cy); if (!g.world.getBlock(bx, by, bz)) g.world.setBlock(bx, by, bz, B[S.places]); }
      }
      g.sfx.playAt(dmgType === 'fire' ? 'spell_fire' : dmgType === 'thunder' || dmgType === 'lightning' ? 'spell_zap' : 'spell_ward', cx, cy, cz, 40);
      // sleep: weakest first, by hit points
      if (S.sleep && !S.save) { let pool = S.dice ? dndRoll(...dice).total : 5 + slotLvl * 8; for (const e of hits.sort((a, b) => a.health - b.health)) { if (e.health > pool) break; pool -= e.health; e.dndSleep = S.sleep; lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Asleep', '#c0a0ff'); } }
      const dmg = dice ? dndRoll(...dice).total : 0;
      for (const e of hits) {
        const sv = S.save ? dndMobSave(e, S.save, dc) : { ok: false };
        if (S.save && e.T.immune && e.T.immune.includes(S.sleep ? 'sleep' : '')) continue;
        if (dmg) dndSpellHit(lp, e, sv.ok ? Math.floor(dmg / 2) : dmg, dmgType, { knock: S.knock && !sv.ok ? S.knock : 0.4, burn: S.ignite });
        if (!sv.ok) { if (S.sleep && S.save && !(e.T.boss)) { e.dndSleep = S.sleep; lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Dazed', '#c0a0ff'); } else dndSpellEffects(lp, e, Object.assign({}, S, { sleep: 0 }), c); }
        else if (!dmg) lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Saved', '#8fe3ff');
      }
      if (S.linger) { lp._dndZones = (lp._dndZones || []).filter(z => z.k !== k); lp._dndZones.push({ k, x: cx, y: cy, z: cz, r, t: S.linger, tick: 2, dice, dmg: dmgType, save: S.save, slow: S.slow, root: S.root, fx: S.fx, dc }); }
      if (S.breaks && !g.isGuest) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) { const bx = Math.floor(cx) + dx, by = Math.floor(cy) + dy, bz = Math.floor(cz) + dz, id = g.world.getBlock(bx, by, bz); if (id && /glass|ice/.test(BLOCKS[id].key)) g.world.setBlock(bx, by, bz, 0); }
      break;
    }
    case 'target': {
      const e = dndLookTarget(lp, S.range || 12);
      if (!e) { lp.toast('Look at a creature to target it', ''); ok = false; break; }
      if (S.humanoid && !(e.npc || /ghoul|skeleton|marauder|witch|bandit|guard|cultist|human|elf|orc|goblin|villager|knight|thug/.test(e.type) || (e.T && e.T.humanoid))) { lp.toast(`${S.name} only works on humanoids`, ''); ok = false; break; }
      spellSpiral(g, e.x, e.y, e.z, S.fx, 30, { r: 0.6, h: e.h, turns: 2, life: 0.8 });
      g.sfx.playAt('spell_zap', e.x, e.y + 1, e.z, 30);
      if (S.mark && !S.save) { dndMarkOn(e, S.mark, S.dur || 3600, lp, k); lp.floatText(e.x, e.y + e.h + 0.3, e.z, S.name, S.col); break; }
      const sv = S.save ? dndMobSave(e, S.save, dc) : { ok: false };
      if (sv.ok) { lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Saved', '#8fe3ff'); break; }
      if (dice) dndSpellHit(lp, e, dndRoll(...dice).total, dmgType);
      dndSpellEffects(lp, e, S, c);
      if (S.hold) lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Held!', '#a0a0ff');
      if (S.charm) lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Charmed', '#ff80c0');
      if (S.fear) lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Frightened', '#c080ff');
      if (S.hold || S.charm) { e.dndMark = e.dndMark || {}; e.dndMark.by = lp; e.dndMark.spell = k; }
      break;
    }
    case 'heal': {
      const ally = S.party ? null : (S.range > 2 ? dndLookTarget(lp, S.range, { allies: true }) : dndLookTarget(lp, 3, { allies: true }));
      const targets = S.party ? [lp, ...g.pawns().filter(q => q !== lp && q.player !== p && !q.dead && Math.hypot(q.x - p.x, q.z - p.z) < S.range)] : [ally || lp];
      let did = false;
      for (const t of targets) {
        const L = g.locals.find(l => l === t || l.player === t) || null;
        if (S.revive) { if (L && L.player.downed > 0) { dndHeal(L, 1); did = true; } else if (L && L.player.dead) { lp.toast('Too late for that', ''); } else if (!L && t.st && t.st.dn) { t.send({ t: 'adv', k: 'dndheal', n: 1 }); did = true; } continue; }
        if (S.cleanse) { const P = L ? L.player : null; if (P) { P.poison = 0; P.chill = 0; P.fx_poison = 0; P.fx_slow = 0; } else if (t.send) t.send({ t: 'adv', k: 'dndheal', n: 0, cleanse: 1 }); did = true; continue; }
        const n = dndRoll(...dice).total + (S.addMod ? mod : 0) + (c.cls === 'cleric' && c.level >= 3 ? 2 + slotLvl : 0);
        if (L) { const wasDown = L.player.downed > 0; if (L.player.health < L.player.maxHealth || wasDown) { dndHeal(L, n); did = true; } } else if (t.send) { t.send({ t: 'adv', k: 'dndheal', n }); did = true; }
        const P = L ? L.player : t;
        spellSpiral(g, P.x, P.y + 0.1, P.z, S.fx, 40, { r: 0.75, h: 2.1, turns: 3, life: 1.1 });
      }
      if (!did && !S.revive) { lp.toast('Nobody here needs it', ''); ok = false; }
      if (S.revive && !did) { lp.toast('Look at a fallen friend to bring them back', ''); ok = false; }
      if (ok && S.cost && !g.creative) p.inv.remove(S.cost, 1);
      g.sfx.play('spell_heal');
      break;
    }
    case 'buff': {
      if (S.conc && c.conc) dndEndConc(lp);
      const self = !S.ally || !dndLookTarget(lp, 8, { allies: true });
      const targets = S.party ? [lp, ...g.locals.filter(l => l !== lp && Math.hypot(l.player.x - p.x, l.player.z - p.z) < 10)] : [self ? lp : g.locals.find(l => l.player === dndLookTarget(lp, 8, { allies: true }).player) || lp];
      for (const L of targets) {
        const cc = dndOf(L.player); if (!cc) continue;
        if (S.buff === 'smite') cc.conds.smite = { dice, dmg: S.dmg, name: S.name, root: S.root, burn: S.burn, fx: S.fx, t: S.dur };
        else if (S.buff === 'aid') { cc.conds.aid = 5 * (slotLvl - 1); L.player.recalcMax(); L.player.health += 5 * (slotLvl - 1); }
        else if (S.buff === 'guardians') { lp._dndZones = (lp._dndZones || []).filter(z => z.k !== k); lp._dndZones.push({ k, follow: lp, r: 3, t: S.dur, tick: 2, dice, dmg: S.dmg, save: 'wis', slow: 2, fx: S.fx, dc }); cc.conds.guardians = S.dur; }
        else if (S.buff === 'invisible') { cc.conds.invisible = S.dur; giveEffect(L, 'invis', S.dur); }
        else if (S.buff === 'haste') { cc.conds.haste = S.dur; giveEffect(L, 'speed', S.dur, 1); }
        else if (S.buff === 'longstrider') { cc.conds.longstrider = S.dur; }
        else cc.conds[S.buff] = S.dur;
        const P = L.player;
        spellRing(g, P.x, P.y + 0.06, P.z, S.fx, 0.5, 30, { speed: 1.6, life: 0.7, flat: true });
        spellSpiral(g, P.x, P.y + 0.1, P.z, S.fx, 30, { r: 0.6, h: 2, turns: 2, life: 0.8 });
        dndHudDirty(L);
      }
      if (S.conc) c.conc = { k, t: S.dur };
      g.sfx.play('spell_ward');
      lp.toast(`${S.name}${S.dur >= 60 ? ` (${S.dur >= 3600 ? Math.round(S.dur / 3600) + ' h' : Math.round(S.dur / 60) + ' min'})` : ''}`, 'good');
      break;
    }
    case 'summon': {
      if (S.conc && c.conc) dndEndConc(lp);
      if (S.summon === 'spirit_wolves' && typeof summonFamiliar === 'function') { for (let i = 0; i < (S.n || 1); i++) summonFamiliar(lp, 1 + slotLvl * 0.25); }
      else { lp._dndZones = (lp._dndZones || []).filter(z => z.k !== k); lp._dndZones.push({ k, follow: lp, r: 6, t: S.dur, tick: 1.6, dice, plus: mod, dmg: S.dmg, attack: true, fx: S.fx, single: true }); }
      if (S.conc) c.conc = { k, t: S.dur };
      g.sfx.play('spell_heal'); lp.toast(S.name, 'good');
      break;
    }
    case 'utility': {
      ok = dndUtility(lp, c, S, k, slotLvl);
      break;
    }
  }
  if (!ok) { lp._castCd = g.time + 0.3; return false; }
  if (slotI >= 0) c.slots[slotI]--;
  if (S.conc && !c.conc && (S.kind !== 'buff' && S.kind !== 'summon')) { if (c.conc) dndEndConc(lp); c.conc = { k, t: S.dur || S.linger || 60 }; }
  if (c.conds.invisible > 0 && S.kind !== 'buff') { delete c.conds.invisible; lp.player.fx_invis = 0; }
  lp._castCd = g.time + (S.bonus ? 0.6 : S.lvl ? 1.2 : 0.9);
  lp.swingArm();
  spellFx(g, ex, ey, ez, S.fx, 14, 0.8, { life: 0.4 });
  if (g.net) g.net[g.isGuest ? 'send' : 'all']({ t: 'adv', k: 'dndcast', s: k, x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) });
  dndHudDirty(lp);
  return true;
}
function dndUtility(lp, c, S, k, slotLvl) {
  const g = lp.g, p = lp.player;
  switch (S.util) {
    case 'light': p.lightT = Math.max(p.lightT || 0, Math.min(S.dur, 600)); spellSpiral(g, p.x, p.y + 0.4, p.z, S.fx, 30, { r: 0.5, h: 1.6, turns: 2, life: 0.8 }); lp.toast('A light follows you', 'good'); return true;
    case 'daylight': p.lightT = Math.max(p.lightT || 0, 1200); spellFx(g, p.x, p.y + 1.5, p.z, S.fx, 80, 3, { life: 1 }); lp.toast('Daylight shines around you', 'good'); return true;
    case 'blink': {
      const w = g.world, look = lookVector(p.yaw, p.pitch), ex = p.x, ey = p.y + 1.55, ez = p.z; let best = null;
      for (let d = 1.5; d <= (S.range || 6); d += 0.5) {
        const x = ex + look[0] * d, y = ey + look[1] * d, z = ez + look[2] * d;
        if (T_SOLID[w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))]) break;
        for (let fy = Math.floor(y - 1.4); fy >= Math.floor(y - 3); fy--) if (T_SOLID[w.getBlock(Math.floor(x), fy - 1, Math.floor(z))] && !T_SOLID[w.getBlock(Math.floor(x), fy, Math.floor(z))] && !T_SOLID[w.getBlock(Math.floor(x), fy + 1, Math.floor(z))]) { best = [Math.floor(x) + 0.5, fy, Math.floor(z) + 0.5]; break; }
      }
      if (!best) { lp.toast('Nowhere to step to', ''); return false; }
      spellFx(g, p.x, p.y + 1, p.z, S.fx, 30, 1.5, { life: 0.6 });
      p.x = best[0]; p.y = best[1]; p.z = best[2]; p.vx = p.vy = p.vz = 0; p.fallStart = null;
      spellFx(g, p.x, p.y + 1, p.z, S.fx, 40, 2, { life: 0.6, spread: 0.6 });
      g.sfx.play('spell_blink'); return true;
    }
    case 'hand': {
      let n = 0; for (const e of g.entities) if (e instanceof DroppedItem && Math.hypot(e.x - p.x, e.z - p.z) < 8) { e.x += (p.x - e.x) * 0.8; e.z += (p.z - e.z) * 0.8; e.y = p.y + 1; n++; }
      spellFx(g, p.x, p.y + 1.2, p.z, S.fx, 20, 1, { life: 0.6 });
      lp.toast(n ? 'The spectral hand gathers things to you' : 'A spectral hand appears and waves', ''); return true;
    }
    case 'mend': { const h = p.inv.held; if (!h || !h.d) { lp.toast('Hold something worn to mend it', ''); return false; } h.d = Math.max(0, h.d - 40); lp.toast('Mended', 'good'); spellFx(g, p.x, p.y + 1.2, p.z, S.fx, 20, 1, { life: 0.6 }); return true; }
    case 'decoy': { const at = dndLookPoint(lp, 18); for (const e of dndHostilesNear(g, at[0], at[1], at[2], 12, lp)) { e.foe = null; e.goal = [at[0], at[1], at[2]]; e.panicT = 0; e.huntT = 0; } spellFx(g, at[0], at[1] + 0.5, at[2], S.fx, 40, 1.2, { life: 1 }); lp.toast('An illusion draws their eyes', ''); return true; }
    case 'thaumaturgy': { spellFx(g, p.x, p.y + 1.8, p.z, S.fx, 50, 2.5, { life: 0.8 }); g.sfx.play('rift_boom' in SND_FX ? 'rift_boom' : 'spell_zap'); for (const e of dndHostilesNear(g, p.x, p.y + 1, p.z, 6, lp)) if (!e.T.boss && Math.random() < 0.4) { e.panicT = 3; e.fleeFrom = p; } return true; }
    case 'fog': { const at = dndLookPoint(lp, 18); lp._dndZones = (lp._dndZones || []).filter(z => z.k !== k); lp._dndZones.push({ k, x: at[0], y: at[1], z: at[2], r: 4, t: S.dur, tick: 0.5, fog: true, fx: S.fx }); return true; }
    case 'darkness': { const at = dndLookPoint(lp, 18); lp._dndZones = (lp._dndZones || []).filter(z => z.k !== k); lp._dndZones.push({ k, x: at[0], y: at[1], z: at[2], r: 3, t: S.dur, tick: 0.5, fog: true, dark: true, fx: S.fx }); return true; }
    case 'goodberry': { const left = lp.give(mkStack(ITEMS.goodberry ? 'goodberry' : 'berries', 10)); if (left) g.dropItem(mkStack(ITEMS.goodberry ? 'goodberry' : 'berries', left), p.x, p.y + 1, p.z); return true; }
    case 'counter': { const e = dndLookTarget(lp, 18); if (e) { e.dndMark = null; e.dndHeld = 0; e.dndCharm = 0; spellFx(g, e.x, e.y + 1, e.z, S.fx, 30, 1.5, { life: 0.6 }); lp.floatText(e.x, e.y + e.h + 0.3, e.z, 'Dispelled', '#a0a0ff'); } else { for (const [kk] of Object.entries(c.conds)) if (['slow'].includes(kk)) delete c.conds[kk]; lp.toast('The magic around you unravels', ''); } return true; }
    case 'grow': { if (typeof tryBonemeal === 'function') { for (let i = 0; i < 30; i++) try { tryBonemeal(g, Math.floor(p.x + (Math.random() - 0.5) * 16), Math.floor(p.y - 1), Math.floor(p.z + (Math.random() - 0.5) * 16)); } catch (e) { /* not a plant */ } } spellFx(g, p.x, p.y + 0.3, p.z, S.fx, 80, 3, { life: 1 }); lp.toast('The plants around you surge with life', 'good'); return true; }
  }
  return true;
}
// the lingering spells: clouds of fire, thorns, guardian spirits...
function dndTickZones(lp, dt) {
  const Z = lp._dndZones; if (!Z || !Z.length) return;
  const g = lp.g;
  for (const z of Z) {
    z.t -= dt;
    const x = z.follow ? z.follow.player.x : z.x, y = z.follow ? z.follow.player.y + 1 : z.y, zz = z.follow ? z.follow.player.z : z.z;
    if (Math.random() < dt * 20) spellSpark(g, x + (Math.random() - 0.5) * z.r * 2, y + Math.random() * 0.8, zz + (Math.random() - 0.5) * z.r * 2, z.fx, { life: 0.8, size: z.dark ? 0.2 : 0.07, vy: 0.4 });
    if (z.fog) { for (const e of dndHostilesNear(g, x, y, zz, z.r, lp)) { if (e.foe === lp || e.foe === lp.player) e.foe = null; e.huntT = 0; } }
    if ((z.tick2 = (z.tick2 ?? 0.5) - dt) > 0) continue;
    z.tick2 = z.tick;
    const foes = dndHostilesNear(g, x, y, zz, z.r, lp);
    if (z.single) { const e = foes.sort((a, b) => Math.hypot(a.x - x, a.z - zz) - Math.hypot(b.x - x, b.z - zz))[0]; if (e) { const c = dndOf(lp.player); const A = c ? dndSpellAttackRoll(lp, c, e) : { hit: true }; if (A.hit) dndSpellHit(lp, e, dndRoll(z.dice[0] * (A.crit ? 2 : 1), z.dice[1], z.plus || 0).total, z.dmg); spellFx(g, e.x, e.y + 1, e.z, z.fx, 16, 1.2, { life: 0.4 }); } continue; }
    for (const e of foes) {
      if (z.slow) e.slowT = Math.max(e.slowT || 0, z.slow);
      if (z.root && Math.random() < 0.3) e.dndHeld = Math.max(e.dndHeld || 0, z.root);
      if (z.dice) { const n = dndRoll(...z.dice).total; const sv = z.save ? dndMobSave(e, z.save, z.dc) : { ok: false }; dndSpellHit(lp, e, sv.ok ? Math.floor(n / 2) : n, z.dmg, { knock: 0.1 }); }
    }
  }
  lp._dndZones = Z.filter(z => z.t > 0);
}
{
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) { const r = baseUpd.call(this, dt, inp); try { if (dndLive(this)) dndTickZones(this, dt); } catch (e) { console.warn('zones', e); } return r; };
}

// ---- what spells do to creatures: held, asleep, charmed, frightened -----------------------------------------------------
{
  const baseAI = Mob.prototype.controlAI;
  Mob.prototype.controlAI = function (dt, ...rest) {
    if (this.dndHeld > 0) { this.dndHeld -= dt; this.vx *= 0.3; this.vz *= 0.3; this.walkAmt = 0; if (Math.random() < dt * 4 && this.game) spellSpark(this.game, this.x + (Math.random() - 0.5) * 0.6, this.y + Math.random() * this.h, this.z + (Math.random() - 0.5) * 0.6, 'mana_arcane', { life: 0.6, size: 0.05 }); return; }
    if (this.dndSleep > 0) { this.dndSleep -= dt; this.vx *= 0.3; this.vz *= 0.3; this.walkAmt = 0; if (this.hurtTime > 0.3) this.dndSleep = 0; if (Math.random() < dt * 1.5 && this.game) spellSpark(this.game, this.x, this.y + this.h + 0.3, this.z, 'mana_arcane', { life: 1.2, size: 0.06, vy: 0.5 }); return; }
    if (this.dndCharm > 0) { this.dndCharm -= dt; if (this.hurtTime > 0.3) this.dndCharm = 0; this.foe = null; this.huntT = 0; this.vx *= 0.8; this.vz *= 0.8; return; }
    if (this.dndWeak > 0) this.dndWeak -= dt;
    if (this.dndNoHeal > 0) this.dndNoHeal -= dt;
    if (this.dndMark) for (const k of ['outlined', 'guided', 'hunted', 'hexed']) if (this.dndMark[k] > 0) this.dndMark[k] -= dt;
    return baseAI.call(this, dt, ...rest);
  };
  const baseGlow = Mob.prototype.glow;
  Mob.prototype.glow = function (out) {
    if (baseGlow) baseGlow.call(this, out);
    if (this.dndMark && this.dndMark.outlined > 0 && typeof tileUV === 'function') out.push({ x: this.x, y: this.y + this.h * 0.5, z: this.z, size: this.h * 0.9, uv: tileUV(ATLAS.tile.mana_arcane ?? ATLAS.tile.white), light: 0xFF });
  };
}
// a guest healed by a friend over the network
{
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv' && m.k === 'dndheal') { for (const l of this.g.locals) if ((l.index || 0) === (m.li || 0)) { if (m.cleanse) { l.player.poison = 0; l.player.fx_poison = 0; } else dndHeal(l, m.n || 1); } return; }
    if (m && m.t === 'adv' && m.k === 'dndcast') { const S = DND_SPELLS[m.s]; if (S && this.g.world) spellFx(this.g, m.x, m.y + 1.5, m.z, S.fx, 14, 0.8, { life: 0.4 }); return; }
    return baseGuest.call(this, m);
  };
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'dndcast') { const S = DND_SPELLS[m.s]; if (S && this.g.world) spellFx(this.g, m.x, m.y + 1.5, m.z, S.fx, 14, 0.8, { life: 0.4 }); this.all({ t: 'adv', k: 'dndcast', s: m.s, x: m.x, y: m.y, z: m.z }); return; }
    if (m && m.t === 'adv' && m.k === 'dndheal') { const pawn = this.remotes && [...this.remotes.values()].find(r => r.gid === m.to); if (pawn) pawn.send(m); return; }
    return baseHost.call(this, from, m);
  };
}
defItem('goodberry', { name: 'Goodberry', maxStack: 16, icon: 'berries', food: { heal: 2 }, desc: 'A magical berry: heals 1 hit point.', rarity: 'rare' });
