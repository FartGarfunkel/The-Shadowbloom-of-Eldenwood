// ---------------------------------------------------------------------------
// game/sanity.js — (alpha 4) one bad number used to break the view for good.
//
// If where you are or where you're looking ever became NaN (a division by a zero distance somewhere), it stayed that
// way: the camera, the compass needle and the first-person body all ease toward it, so the screen went wrong and the
// frame rate collapsed until the game was reloaded. Now it's caught the moment it happens and put back to the last good
// value, and reported once in the console.
// ---------------------------------------------------------------------------
{
  const KEYS = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch'];
  const SMOOTH = ['_bodyYaw', '_lastFwd', '_accLean', '_lastBody', '_turnLean'];
  const fix = (lp) => {
    const p = lp.player; if (!p) return;
    const good = lp._good || (lp._good = {});
    let bad = null;
    for (const k of KEYS) {
      const v = p[k];
      if (typeof v !== 'number') continue;
      if (Number.isFinite(v)) good[k] = v;
      else { (bad || (bad = [])).push(k); p[k] = good[k] ?? 0; }
    }
    for (const k of ['bob', 'bobAmt']) if (typeof p[k] === 'number' && !Number.isFinite(p[k])) p[k] = 0;
    for (const k of SMOOTH) if (typeof lp[k] === 'number' && !Number.isFinite(lp[k])) lp[k] = (k === '_bodyYaw' || k === '_lastBody') ? p.yaw : 0;
    if (bad && !lp._nanSaid) { lp._nanSaid = 1; console.warn('(sanity) player state was not a number, put back:', bad.join(', ')); }
  };
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    fix(this);
    const r = baseUpd.call(this, dt, inp);
    try { fix(this); } catch (e) { /* only a guard */ }
    return r;
  };
}
// the same for creatures: one with a broken position or heading used to vanish, or hang in the air, for good
{
  const KEYS = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw'];
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    const r = baseUpd.call(this, dt);
    try {
      const good = this._good || (this._good = {});
      for (const k of KEYS) { const v = this[k]; if (typeof v !== 'number') continue; if (Number.isFinite(v)) good[k] = v; else this[k] = good[k] ?? (k === 'y' ? 80 : 0); }
    } catch (e) { /* only a guard */ }
    return r;
  };
}
