// ---------------------------------------------------------------------------
// dnd/ranged.js — (alpha 3) throwing and shooting with the tabletop's weapons.
//
//   · Thrown weapons (dagger, handaxe, javelin, spear, light hammer, dart, trident): hold use to wind up, let go to
//     throw. The weapon flies as itself, lands its attack, and drops where it falls for you to pick up again (a
//     returning weapon comes back to your hand).
//   · Crossbows, slings, blowguns, pistols and muskets: use to shoot. A weapon with the loading property has to be
//     reloaded after each shot (it does so by itself, taking a moment, and uses ammunition from your pack).
// The attack is the weapon's own: its dice, your Dexterity (or Strength for a thrown weapon that isn't finesse), your
// proficiency, and everything else that rides on a blow (Sneak Attack, Hunter's Mark...).
// ---------------------------------------------------------------------------

const DND_THROWN = new Set(['dagger', 'handaxe', 'javelin', 'spear', 'light_hammer', 'dart', 'trident']);
function dndThrowable(stack) {
  if (!stack) return false;
  const d = itemDef(stack.id);
  if (!d) return false;
  if (DND_THROWN.has(stack.id)) return true;
  if (d.modelOf && DND_THROWN.has(d.modelOf)) return true;
  return !!(d.dnd && d.dnd.props && d.dnd.props.includes('thrown') && !d.dndRanged);
}
function dndShooter(stack) { const d = stack && itemDef(stack.id); return d && (d.dndRanged || (d.modelOf && ITEMS[d.modelOf] && ITEMS[d.modelOf].dndRanged)) || null; }

// ---- the missile: a thrown weapon, a bolt, a bullet or a needle ------------------------------------------------------
class DndMissile extends Entity {
  constructor(game, x, y, z, v, owner, stack, W, o = {}) {
    super(game, x, y, z);
    this.vx = v[0]; this.vy = v[1]; this.vz = v[2]; this.owner = owner; this.stack = stack; this.W = W; this.o = o;
    this.w = 0.1; this.h = 0.1; this.spin = o.spin ?? (o.thrown ? 14 : 0); this.netLocalOnly = true;
    this.yaw = Math.atan2(-this.vx, -this.vz); this.pitch = 0;
  }
  update(dt) {
    const g = this.game, w = g.world;
    this.age += dt;
    if (this.age > 8) { this.land(null); return; }
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      const h = dt / steps;
      this.vy -= (this.o.grav ?? 16) * h;
      const nx = this.x + this.vx * h, ny = this.y + this.vy * h, nz = this.z + this.vz * h;
      for (const e of g.entities) {
        if (!(e instanceof Mob) || !e.alive || e.tamed || e.dndSummonBy || (e.npc && !(e.T && e.T.hostile))) continue;
        if (nx > e.x - e.w - 0.15 && nx < e.x + e.w + 0.15 && nz > e.z - e.w - 0.15 && nz < e.z + e.w + 0.15 && ny > e.y - 0.05 && ny < e.y + e.h + 0.1) { this.strike(e); return; }
      }
      if (T_SOLID[w.getBlock(Math.floor(nx), Math.floor(ny), Math.floor(nz))]) { this.land(null); return; }
      this.x = nx; this.y = ny; this.z = nz;
    }
    const sp = Math.hypot(this.vx, this.vz);
    this.yaw = Math.atan2(-this.vx, -this.vz); this.pitch = Math.atan2(this.vy, sp || 1);
  }
  strike(e) {
    const lp = this.owner, g = this.game;
    if (lp && lp.player && dndLive(lp)) {
      const res = dndAttack(lp, e, this.W, { ranged: true });
      if (res && res.hit) {
        const L = this.o.firearm ? 'bang' : 'hit';
        e.hurt(res.dmg, { attacker: lp, knock: this.o.thrown ? 2.5 : 1.8, tool: 'dndmissile', dnd: true, type: 'projectile' });
        lp.floatText(e.x, e.y + e.h + 0.2, e.z, String(res.dmg), '#ffffff');
        if (res.crit) lp.floatText(e.x, e.y + e.h + 0.6, e.z, 'CRITICAL!', '#ffe060');
        if (res.parts && res.parts.length) lp.floatText(e.x, e.y + e.h + 0.9, e.z, res.parts.join(' · '), '#c8a8ff');
        g.sfx.playAt(L === 'bang' ? 'hit' : 'hit', e.x, e.y, e.z);
        const c = dndOf(lp.player); if (c && c.conds.hidden > 0) delete c.conds.hidden;
      }
    } else if (e.hurt) e.hurt(Math.max(1, Math.round(this.W.dice[0] * (this.W.dice[1] + 1) / 2)), { attacker: this.owner, tool: 'dndmissile', type: 'projectile' });
    this.land(e);
  }
  land(hit) {
    const g = this.game; this.remove = true;
    if (!this.o.thrown || !this.stack) { if (!hit) g.sfx.playAt('arrow_hit', this.x, this.y, this.z); return; }
    // a returning weapon flies back to the hand that threw it
    const d = itemDef(this.stack.id), lp = this.owner;
    if (d && d.returning && lp && lp.player && !lp.player.dead) {
      const left = lp.give ? lp.give(this.stack) : lp.player.inv.add(this.stack);
      if (left) g.dropItem(Object.assign(cloneStack(this.stack), { n: left }), lp.player.x, lp.player.y + 1, lp.player.z);
      lp.toast(`${d.name} returns to your hand`, '');
      return;
    }
    g.dropItem(this.stack, this.x - this.vx * 0.02, Math.max(this.y, Math.floor(this.y) + 0.2), this.z - this.vz * 0.02);
    if (!hit) g.sfx.playAt('arrow_hit', this.x, this.y, this.z);
  }
  snap() { return null; }
  draws(out) {
    const gl = this.game.renderer.gl;
    const m = Mat4.create();
    Mat4.rotateY(m, this.yaw + Math.PI / 2); Mat4.rotateZ(m, this.pitch);
    if (this.o.thrown && this.spin) Mat4.rotateZ(m, -this.age * this.spin);
    else Mat4.rotateZ(m, -Math.PI / 4);
    const s = this.o.thrown ? 0.75 : 0.45;
    Mat4.scale(m, s, s, s);
    const key = this.o.thrown ? this.stack.id : (this.o.ammo || 'arrow');
    let im = null; try { im = itemMesh(gl, key); } catch (e) { im = null; }
    if (!im) return;
    out.push({ mesh: im.mesh, m, px: this.x, py: this.y, pz: this.z, light: this.lightAt(0) });
  }
}

// ---- throwing ------------------------------------------------------------------------------------------------------
function dndThrow(lp, power) {
  const g = lp.g, p = lp.player, held = p.inv.held; if (!held) return;
  const d = itemDef(held.id);
  const W = dndWeaponOf(held); W.ranged = true; W.thrown = true;
  const one = Object.assign(cloneStack(held), { n: 1 });
  if (!g.creative) { held.n--; if (held.n <= 0) p.inv.held = null; }
  const look = lookVector(p.yaw, p.pitch), sp = 14 + power * 10;
  g.addEntity(new DndMissile(g, p.x + look[0] * 0.5, p.y + p.eye - 0.2 + look[1] * 0.5, p.z + look[2] * 0.5, [look[0] * sp, look[1] * sp + 1.5, look[2] * sp], lp, one, W, { thrown: true, spin: /dagger|dart|javelin|spear|trident/.test(held.id) ? 0 : 14 }));
  g.sfx.play('swish'); lp.swingArm();
  lp.toast(`${d ? d.name : 'Weapon'} thrown`, '');
}

// ---- shooting ------------------------------------------------------------------------------------------------------
function dndAmmoCount(lp, ammo) { const inv = lp.player.inv; return (inv.offhand && inv.offhand.id === ammo ? inv.offhand.n : 0) + inv.count(ammo); }
function dndUseAmmo(lp, ammo) {
  const inv = lp.player.inv;
  if (lp.g.creative) return true;
  if (inv.offhand && inv.offhand.id === ammo) { inv.offhand.n--; if (inv.offhand.n <= 0) inv.offhand = null; return true; }
  if (inv.count(ammo) > 0) { inv.remove(ammo, 1); return true; }
  // a sling makes do with a pebble
  if (ammo === 'sling_bullet' && inv.count('cobblestone') > 0) { inv.remove('cobblestone', 1); return true; }
  return false;
}
function dndShoot(lp) {
  const g = lp.g, p = lp.player, held = p.inv.held, R = dndShooter(held); if (!R) return;
  const st = held;
  if (R.props.includes('loading') && st.unloaded) { lp.toast('Reloading…', ''); return; }
  if (!dndUseAmmo(lp, R.ammo)) { lp.toast(`You need ${itemDef(R.ammo) ? itemDef(R.ammo).name.toLowerCase() + 's' : 'ammunition'}`, ''); return; }
  const W = dndWeaponOf(held); W.ranged = true;
  const look = lookVector(p.yaw, p.pitch), sp = R.firearm ? 70 : R.ammo === 'sling_bullet' ? 30 : R.ammo === 'blowgun_needle' ? 34 : 50;
  g.addEntity(new DndMissile(g, p.x + look[0] * 0.6, p.y + p.eye - 0.18 + look[1] * 0.6, p.z + look[2] * 0.6, [look[0] * sp, look[1] * sp, look[2] * sp], lp, null, W, { ammo: R.ammo, firearm: R.firearm, grav: R.firearm ? 2 : R.ammo === 'sling_bullet' ? 14 : 8 }));
  lp.swingArm();
  if (R.firearm) {
    g.sfx.play('rift_boom' in SND_FX ? 'rift_boom' : 'explode');
    for (let i = 0; i < 10; i++) g.particles.add({ x: p.x + look[0] * 1.1, y: p.y + p.eye - 0.2 + look[1] * 1.1, z: p.z + look[2] * 1.1, vx: look[0] * 2 + (Math.random() - 0.5), vy: 0.6 + Math.random() * 0.4, vz: look[2] * 2 + (Math.random() - 0.5), life: 0.9, max: 0.9, size: 0.12, uv: tileUV(ATLAS.tile.white_wool ?? ATLAS.tile.white ?? 0), light: 0xC0, grav: -0.5 });
  } else g.sfx.play('bow_shoot' in SND_FX ? 'bow_shoot' : 'swish');
  if (R.props.includes('loading')) {
    // the reload: quicker with a hand crossbow, slower with a heavy one or a musket
    st.unloaded = 1;
    const t = R.firearm ? (st.id === 'musket' ? 2.2 : 1.6) : st.id === 'heavy_crossbow' ? 1.8 : st.id === 'hand_crossbow' ? 0.8 : st.id === 'blowgun' ? 0.6 : 1.2;
    const c = dndOf(p);
    const fast = c && c.feats && c.feats.includes('Crossbow Expert') ? 0.5 : 1;
    setTimeout(() => { st.unloaded = 0; if (lp.player && lp.player.inv.held === st) { lp.toast('Loaded', ''); g.sfx.play('click'); } }, t * 1000 * fast);
  }
}

// use: throw (hold to wind up) or shoot
{
  const baseTools = LocalPlayer.prototype.updateHeldTools;
  LocalPlayer.prototype.updateHeldTools = function (dt, inp) {
    const r = baseTools.call(this, dt, inp);
    try {
      const p = this.player, held = p.inv.held, playing = this.mode === 'play' && !p.dead && !p.carrying;
      if (!playing || !held || !dndLive(this)) { this._throwT = 0; return r; }
      if (dndShooter(held)) { if (inp.usePressed && (this._shootCd || 0) <= this.g.time) { dndShoot(this); this._shootCd = this.g.time + 0.35; } return r; }
      if (dndThrowable(held)) {
        // pressing use on a door, a chest or someone does that, not a throw
        if (inp.usePressed) { const hit = this.target, b = hit && BLOCKS[hit.id]; this._noThrow = !!(this.targetEnt || (b && (b.container || b.table || b.furnace || b.pile || b.placedBackpack)) || (this._usedBlockT && this.g.time - this._usedBlockT < 0.2)); }
        if (!inp.use) { if (this._noThrow) { this._noThrow = false; this._throwT = 0; return r; } }
        if (this._noThrow) return r;
        if (inp.use) this._throwT = Math.min(1, (this._throwT || 0) + dt * 1.6);
        else if (this._throwT > 0) { if (this._throwT > 0.15) dndThrow(this, this._throwT); this._throwT = 0; }
      } else this._throwT = 0;
    } catch (e) { console.warn('dnd ranged', e); }
    return r;
  };
}

{
  const baseUBA = LocalPlayer.prototype.useBlockAt;
  if (baseUBA) LocalPlayer.prototype.useBlockAt = function (...a) { const r = baseUBA.apply(this, a); if (r) { this._usedBlockT = this.g.time; this._noThrow = true; } return r; };
}
