// ---------------------------------------------------------------------------
// game/capes.js — capes. Sixteen colours woven from wool and string, and
// three special ones (ember, frost, royal). Use one (or put it in the Cape
// slot) to wear it; it hangs from your shoulders (under a backpack if you
// wear one, the hem swinging below it), and swings out behind you as you
// run, jump and fall.
// ---------------------------------------------------------------------------

// Recipes added after the main list need the same preparation it had.
function addRecipe(r) {
  r.idx = RECIPES.length;
  if (r.shape) { r.h = r.shape.length; r.w = Math.max(...r.shape.map(x => x.length)); r.shape = r.shape.map(x => x.padEnd(r.w, ' ')); }
  else { r.h = r.w = Math.ceil(Math.sqrt(r.items.length)); }
  RECIPES.push(r);
}

for (const [c, L] of COLORS) {
  defItem(c + '_cape', { name: L + ' Cape', maxStack: 1, cape: c + '_cape', icon: c + '_cape_icon', desc: 'Use it to wear it.' });
  addRecipe({ out: c + '_cape', n: 1, shape: ['S S', 'WWW', 'WWW'], key: { S: 'string', W: c === 'white' ? 'wool' : c + '_wool' } });
}
defItem('ember_cape', { name: 'Ember Cape', maxStack: 1, cape: 'ember_cape', icon: 'ember_cape_icon', rarity: 'rare', desc: 'Woven with a cinderite thread.' });
defItem('frost_cape', { name: 'Frost Cape', maxStack: 1, cape: 'frost_cape', icon: 'frost_cape_icon', rarity: 'rare', desc: 'Cold to the touch.' });
defItem('royal_cape', { name: 'Royal Cape', maxStack: 1, cape: 'royal_cape', icon: 'royal_cape_icon', rarity: 'rare', desc: 'Purple and gold.' });
addRecipe({ out: 'ember_cape', n: 1, items: ['red_cape', 'cinderite_shard'] });
addRecipe({ out: 'frost_cape', n: 1, items: ['light_blue_cape', 'frost_shard'] });
addRecipe({ out: 'royal_cape', n: 1, items: ['purple_cape', 'gold_ingot', 'gold_ingot'] });

// How the cape hangs right now: out behind when moving forward, lifted when falling, flapping a little.
{
  const basePose = LocalPlayer.prototype.pose;
  LocalPlayer.prototype.pose = function () {
    const ps = basePose.call(this), p = this.player, inv = p.inv;
    const c = inv.cape && inv.cape.slots[0];
    if (!c) return ps;
    const now = this.g.time, dt = Math.min(0.1, Math.max(0, now - (this._capeT ?? now))); this._capeT = now;
    const fwd = -(p.vx * Math.sin(p.yaw) + p.vz * Math.cos(p.yaw));
    let want = 0.06 + clamp(fwd, 0, 8) * 0.13 + clamp(-p.vy, 0, 20) * 0.04 + (p.sneaking ? 0.25 : 0);
    if (p.swimming || this.riding) want = 0.3;
    want = Math.min(want, 1.35) + Math.sin(p.bob * 2.2) * 0.04 * p.bobAmt;
    this._capeA = (this._capeA ?? want) + (want - (this._capeA ?? want)) * Math.min(1, dt * 7);
    const side = (p.vx * Math.cos(p.yaw) - p.vz * Math.sin(p.yaw));
    ps.cape = itemDef(c.id) && itemDef(c.id).cape ? c.id : null;
    ps.capeA = this._capeA; ps.capeSway = clamp(-side * 0.05, -0.25, 0.25) + Math.sin(now * 3.1) * 0.02;
    return ps;
  };
}
