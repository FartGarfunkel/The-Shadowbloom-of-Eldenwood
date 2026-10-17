// ---------------------------------------------------------------------------
// game/quarrels.js — monsters that behave more like Minecraft's.
//
//   quarrels    a stray arrow or a careless blow starts a fight: a ghoul a
//               skeleton shot turns on the skeleton, and the skeleton (once
//               hit back) on the ghoul, until one of them is dead. Hit one
//               yourself and it turns back on you. Marauders and witches are
//               one band and don't fall out; fuselings never fight back.
//   calling     hurt a ghoul and the ghouls nearby hear it and come for you
//   noticing    the generic night crowd has to see you (or hear a friend) to
//               start hunting, then remembers you a while (game/monsters.js)
//   sunlight    skeletons and strays caught burning look for shade
//   wariness    skeletons keep away from wolves (wolves hunt them), fuselings
//               from cats and ocelots
// ---------------------------------------------------------------------------

Object.assign(Mob.prototype, {
  aiTarget(p) {
    const q = this.quarrel;
    if (q) {
      if (!q.alive || q.remove || !(this.quarrelT > 0) || Math.hypot(q.x - this.x, q.z - this.z) > 32 || Math.abs(q.y - this.y) > 16) this.quarrel = null;
      else if (this.T.special || (this.T.hostile && !this.T.ai)) return q;
    }
    return p;
  },
  takeQuarrel(a) {
    const T = this.T;
    if (!(T.hostile || T.retaliates) || T.ai || T.boss || this.type === 'fuseling') return;
    if (T.faction && T.faction === a.T.faction) return;
    this.quarrel = a; this.quarrelT = 30; this.huntT = 10;
  },
  // Burning in the sun: somewhere shady nearby, or water.
  findShade() {
    const w = this.game.world, x0 = Math.floor(this.x), y0 = Math.floor(this.y), z0 = Math.floor(this.z);
    let best = null, bd = 1e9;
    for (let k = 0; k < 24; k++) {
      const x = x0 + Math.floor(Math.random() * 17) - 8, z = z0 + Math.floor(Math.random() * 17) - 8;
      for (let y = y0 + 3; y >= y0 - 4; y--) {
        if (T_SOLID[w.getBlock(x, y - 1, z)] && !T_SOLID[w.getBlock(x, y, z)] && !T_SOLID[w.getBlock(x, y + 1, z)]) {
          const water = T_LIQUID[w.getBlock(x, y, z)] === 1;
          if (water || (w.getLight(x, y + 1, z) >> 4) < 14) { const d = Math.hypot(x - x0, z - z0); if (d < bd) { bd = d; best = { x: x + 0.5, y, z: z + 0.5 }; } }
          break;
        }
      }
    }
    return best;
  },
});

// Hurt: who did it?
{
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const dealt = baseHurt.call(this, amount, src);
    const a = src.attacker;
    if (dealt > 0 && this.alive && a && a !== this) {
      if (a instanceof Mob) { if (a.alive) this.takeQuarrel(a); }
      else {
        this.quarrel = null; this.huntT = 10;    // a player: forget any squabble, it's you now
        if (this.T.family) for (const e of this.game.entities)
          if (e !== this && e instanceof Mob && e.alive && e.T.family === this.T.family && Math.hypot(e.x - this.x, e.z - this.z) < 16) { e.alertT = 20; e.huntT = 10; }
      }
    }
    return dealt;
  };
  const baseUpdate = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (this.quarrelT > 0) this.quarrelT -= dt;
    if (this.alertT > 0) this.alertT -= dt;
    // a spider in a fight is angry even by day
    if (this.quarrel && (this.type === 'spider' || this.type === 'cave_spider')) this.panicT = Math.max(this.panicT, 0.5);
    baseUpdate.call(this, dt);
  };
}

// The outer layer of every special creature's thinking: get out of the sun, keep away from what hunts you.
{
  const base = Mob.prototype.specialAI;
  Mob.prototype.specialAI = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game, T = this.T;
    // skeletons and strays caught in the sun look for shade
    if (T.fleesSun && this.burn > 0 && g.dim === 0 && g.env.day > 0.6 && !this.inWater && !this.quarrel) {
      this.shadeT = (this.shadeT || 0) - dt;
      if (!this.shade || this.shadeT <= 0) { this.shade = this.findShade(); this.shadeT = 3; }
      const s = this.shade;
      if (s && Math.hypot(s.x - this.x, s.z - this.z) > 0.6) return { want: T.speed * 1.2, dir: this.navDir(s.x, s.y, s.z, dt) ?? Math.atan2(this.x - s.x, this.z - s.z) };
    } else this.shade = null;
    // keep away from what hunts you
    const wary = this.type === 'skeleton' || this.type === 'stray' ? ['wolf'] : this.type === 'fuseling' ? ['ocelot', 'cat'] : null;
    if (wary) {
      this._waryT = (this._waryT || 0) - dt;
      if (this._waryT <= 0) { this._waryT = 0.5; this._wary = g.entities.find(e => e instanceof Mob && e.alive && wary.includes(e.type) && !e.baby && Math.hypot(e.x - this.x, e.z - this.z) < 6) || null; }
      const f = this._wary;
      if (f && f.alive && !this.quarrel) { this.fuse = 0; return { want: T.speed * 1.3, dir: Math.atan2(-(this.x - f.x), -(this.z - f.z)) + Math.sin(this.age * 2) * 0.3 }; }
    }
    return base.call(this, dt, p, dist, dyp, toPlayer);
  };
}
