// ---------------------------------------------------------------------------
// game/aquatic.js — 0.8.4: squid swim any way up, and anything that lives in
// the water flops about when it's stranded, until it gets back in or runs
// out of breath.
//
// A squid points its mantle the way it's going, its arms trailing, and rolls
// a little as it turns. It drifts back toward upright when it slows. On land,
// squid, fish, dolphins and sharks lie on their sides and flop, hopping
// toward water if any is close. Every flop is weaker than the one before, and
// in the end they suffocate (fish soonest, dolphins last).
// ---------------------------------------------------------------------------

// ---- squid: point the way you swim ----------------------------------------------------------------
{
  const SQUID_FWD = -1;     // a negative turn about x tips the mantle toward the front (-z)
  RIG_ANIM.squid = function (m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), wet = m.inWater || m.ghost;
    const now = m.age || 0, dt = clamp(now - (m._sqAge ?? now), 0, 0.1); m._sqAge = now;
    if (wet) {
      const hs = m.speedNow ?? Math.hypot(m.vx || 0, m.vz || 0), vy = m.vy || 0, s = Math.hypot(hs, vy);
      // still: nearly upright, swaying; moving: the mantle leads, whichever way that is
      const k = clamp((s - 0.2) / 0.9, 0, 1), rest = 0.18 + Math.sin(t * 0.37) * 0.12;
      const want = rest + (Math.atan2(hs, vy) - rest) * k;
      m._tilt = m._tilt ?? rest; m._tilt += (want - m._tilt) * Math.min(1, dt * 2.2);
      // roll into turns, and a slow drifting roll of its own
      const yaw = m.yaw || 0, dy = Math.atan2(Math.sin(yaw - (m._sqYaw ?? yaw)), Math.cos(yaw - (m._sqYaw ?? yaw))); m._sqYaw = yaw;
      const turn = dt > 0 ? clamp(dy / dt, -3, 3) : 0;
      m._sqRoll = (m._sqRoll || 0) + ((-turn * 0.35 + Math.sin(t * 0.23) * 0.25) - (m._sqRoll || 0)) * Math.min(1, dt * 1.5);
      // the arms open and snap shut with each push; streamlined when going fast
      const pulse = (Math.sin(t * 2.6) + 1) / 2, open = (0.1 + pulse * 0.55) * (1 - 0.45 * k);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, wob = Math.sin(t * 3.1 + i * 1.7) * 0.06; P['tent' + i] = [-open * Math.sin(a) + wob, 0, open * Math.cos(a) + wob]; }
      R.pitch = SQUID_FWD * m._tilt; R.roll = m._sqRoll;
      return;
    }
    // stranded: lying on its side, arms writhing, the mantle heaving
    m._tilt = 0; m._sqRoll = 0;
    const side = m._flopSide || 1, weak = clamp(1 - (m.dryT || 0) / 16, 0.15, 1), fl = m.flopT > 0 ? m.flopT / 0.35 : 0;
    R.roll = side * (Math.PI / 2 - fl * 0.5); R.lift = -12 * RPX * (d.scale || 1) + fl * 0.05;
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, w = Math.sin(t * (5 + i * 0.4) + i * 1.3) * 0.35 * weak; P['tent' + i] = [-0.15 * Math.sin(a) + w, Math.cos(t * 3 + i) * 0.2 * weak, 0.15 * Math.cos(a) + w * 0.6]; }
  };
}

// ---- fish and dolphins: on their side the whole time they're out (in the air between flops too) -------
{
  const baseFish = RIG_ANIM.fish;
  RIG_ANIM.fish = function (m, d, P, R) {
    baseFish(m, d, P, R);
    if (m.inWater || m.ghost) return;
    const t = (m.age || 0) + (m.id || 0) * 0.37, weak = clamp(1 - (m.dryT || 0) / 14, 0.2, 1), fl = m.flopT > 0 ? m.flopT / 0.35 : 0;
    if (!d.flukes) {
      R.roll = (m._flopSide || 1) * Math.PI / 2;
      P.body = [0, Math.sin(t * 22) * 0.35 * weak + fl * 0.4 * (m._flopSide || 1), 0];
      P.tail = [0, Math.sin(t * 22 + 1) * 0.6 * weak, 0];
    } else {
      // a dolphin on its belly, arching and slapping its tail
      R.pitch = -fl * 0.35;
      P.tail = [Math.sin(t * 10) * 0.5 * weak, 0, 0];
    }
  };
}

// ---- stranded: flop, toward water if it's near, weaker each time, then suffocate -----------------------
function strandedFlop(mob, dt, opts) {
  const g = mob.game, w = g.world;
  mob.dryT = (mob.dryT || 0) + dt; mob.noGrav = false;
  if (!mob._flopSide) mob._flopSide = Math.random() < 0.5 ? -1 : 1;
  if (mob.flopT > 0) mob.flopT -= dt;
  const weak = clamp(1 - mob.dryT / opts.air, 0.25, 1);
  // look for water close by now and then
  if (!(mob._seekT > 0)) {
    mob._seekT = 1.2; mob._waterTo = null;
    const bx = Math.floor(mob.x), by = Math.floor(mob.y), bz = Math.floor(mob.z); let best = 30;
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) for (let dy = -2; dy <= 1; dy++) {
      if (T_LIQUID[w.getBlock(bx + dx, by + dy, bz + dz)] !== 1) continue;
      const dd = dx * dx + dz * dz + dy * dy * 2; if (dd < best) { best = dd; mob._waterTo = [bx + dx + 0.5, bz + dz + 0.5]; }
    }
  }
  mob._seekT -= dt;
  if (mob.onGround && Math.random() < dt * (0.8 + 1.8 * weak)) {
    mob.vy = (2.4 + Math.random() * 1.6) * (0.55 + 0.45 * weak) * (opts.heavy ? 0.8 : 1);
    if (mob._waterTo && Math.random() < 0.75) {
      const a = heading(mob.x, mob.z, mob._waterTo[0], mob._waterTo[1]), sp = 1.6 + weak;
      mob.vx = -Math.sin(a) * sp; mob.vz = -Math.cos(a) * sp; mob.yaw = a + (Math.random() - 0.5) * 0.8;
    } else { mob.vx += (Math.random() - 0.5) * 2.6 * weak; mob.vz += (Math.random() - 0.5) * 2.6 * weak; mob.yaw += (Math.random() - 0.5) * 2; }
    if (Math.random() < 0.35) mob._flopSide = -mob._flopSide;
    mob.flopT = 0.35;
    g.sfx.playAt('flop', mob.x, mob.y, mob.z, 14);
  }
  // out of breath: a little hurt every couple of seconds, until it's back in the water or gone
  if (mob.dryT > opts.air) { mob.dryT -= opts.every; mob.hurt(opts.dmg || 1, { type: 'drown', bypassArmor: true }); }
}
{
  const baseSwim = Mob.prototype.swimmerAI;
  Mob.prototype.swimmerAI = function (dt, p, dist, dyp, toPlayer) {
    if (this.inWater) { this.flopT = 0; return baseSwim.call(this, dt, p, dist, dyp, toPlayer); }
    const T = this.T;
    strandedFlop(this, dt, T.needsAir ? { air: 50, every: 2, heavy: true } : T.sound === 'squid' ? { air: 14, every: 1.5 } : { air: 10, every: 1.5 });
    return { want: 0, dir: this.yaw };
  };
  if (typeof MONSTER_AI !== 'undefined' && MONSTER_AI.shark) {
    const baseShark = MONSTER_AI.shark;
    MONSTER_AI.shark = function (dt, p, dist, dyp, toPlayer) {
      if (this.inWater) { this.flopT = 0; return baseShark.call(this, dt, p, dist, dyp, toPlayer); }
      strandedFlop(this, dt, { air: 8, every: 1.5, dmg: 2, heavy: true });
      return { want: 0, dir: this.yaw };
    };
  }
}

// a wet slap on the ground
SND_FX.flop = [0.3, 0.6, (b, v, r) => {
  b.noise(0, 0.03, 'bp', 1100 + r() * 500, 0.9, 0.9, { att: 0.001 });
  b.noise(0, 0.12, 'lp', 700, 0.8, 0.5, { att: 0.003 });
  b.thump(0, 140 + r() * 40, 60, 0.09, 0.6);
  for (let k = 0; k < 3; k++) b.modes(0.02 + r() * 0.1, [[500 + r() * 700, 0.008, 1]], 0.18, { droop: -0.5 });
}];
