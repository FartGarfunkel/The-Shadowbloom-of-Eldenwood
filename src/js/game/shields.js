// ---------------------------------------------------------------------------
// game/shields.js — (alpha 3) shields you block with.
//
// A shield in your off hand (or your main hand) is held like a shield. Hold Use (right mouse, or the left trigger)
// while your main hand has nothing else to do with it (a weapon, or empty) and you raise it: you move slowly, and blows,
// claws and arrows from in front of you are mostly stopped (three quarters of the harm, and the knockback), with a
// thud of wood and iron.
// ---------------------------------------------------------------------------
function isShieldId(id) { if (!id) return false; if (/(^|_)shield(_\d+|_\w+_shield)?$/.test(id) || /^shield/.test(id)) return !/spell|guardian|of_faith/.test(id); const d = itemDef(id); return !!(d && (d.shield || (d.dndMagic && d.dndMagic.slot === 'shield'))); }
function shieldHeld(p) { const off = p.inv.offhand, h = p.inv.held; return isShieldId(off && off.id) ? 'off' : isShieldId(h && h.id) ? 'main' : null; }
{
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const p = this.player, where = p && !p.dead ? shieldHeld(p) : null;
    let want = false;
    if (where && inp && inp.use && this.mode === 'play' && !this.riding) {
      const h = p.inv.held, d = h ? itemDef(h.id) : null;
      want = where === 'main' || !h || !d || !itemHasUse(d) || !!(d.tool && d.tool.type !== 'staff') || isShieldId(h.id);
      if (want && this.target && this.target.id && (BLOCKS[this.target.id].door || T_SHAPE[this.target.id] === SHAPE.GATE || BLOCKS[this.target.id].chest || BLOCKS[this.target.id].sign)) want = false;
    }
    this.blocking = want;
    this._blockE = Math.max(0, Math.min(1, (this._blockE || 0) + (want ? dt * 7 : -dt * 5)));
    if (want && inp) { inp = Object.assign({}, inp, { use: false, usePressed: false, mx: (inp.mx || 0) * 0.45, mz: (inp.mz || 0) * 0.45, sprint: false }); }
    return baseUpd.call(this, dt, inp);
  };
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    if (this.blocking && amount > 0 && src) {
      const a = src.attacker && src.attacker.x !== undefined ? src.attacker : (src.projectile || src.from || null), p = this.player;
      if (a && a !== p) {
        const dx = a.x - p.x, dz = a.z - p.z, d = Math.hypot(dx, dz) || 1, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
        if ((dx * fx + dz * fz) / d > 0.35) {
          amount = Math.max(0, Math.round(amount * 0.25 * 10) / 10);
          src = Object.assign({}, src, { knock: (src.knock ?? 1) * 0.2, blocked: true });
          try { this.g.sfx.playAt('hit_wood' in (typeof SND_FX !== 'undefined' ? SND_FX : {}) ? 'hit_wood' : 'anvil', p.x, p.y + 1, p.z, 16); } catch (e) { /* quiet */ }
          this._blockE = 0.75;
          if (amount <= 0) return 0;
        }
      }
    }
    return baseHurt.call(this, amount, src);
  };
  // others see the shield raised
  const basePose = LocalPlayer.prototype.pose;
  LocalPlayer.prototype.pose = function () { const P = basePose.call(this); if (this.blocking) P.blocking = 1; return P; };
}
