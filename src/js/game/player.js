// ---------------------------------------------------------------------------
// game/player.js — the player: movement, swimming, health (no hunger!), air,
// XP levels, armor, and save data.
//
// Health is the classic ten hearts. More only come from Heart Crystals (a boss's
// reward, eaten for one more heart for good) and from a charm worn on the belt.
// ---------------------------------------------------------------------------

const PLAYER_W = 0.3, PLAYER_H = 1.8, EYE = 1.62, EYE_SNEAK = 1.45;
const GRAVITY = 28, JUMP_V = 8.6;
const WALK = 4.3, SPRINT = 5.7, SNEAK = 1.4, SWIM = 4.4;
const AIR_MAX = 15;               // seconds of breath (ten bubbles)
const SWIM_H = 0.6, SWIM_EYE = 0.42;

function xpForLevel(level) { return 12 + level * 6; }

// (0.9.0.41) Ledges by the blocks' real heights. The top of the ledge in cell (x, cy, z) is the top of that block's
// own collision boxes, plus anything thin lying on it (snow, a carpet, a bottom slab). null when there's nothing
// there to get your fingers over: no solid block, or one too low (a snow layer or a carpet by itself, a slab's
// lower half), so walking past a patch of snow on a path can never count as finding a ledge.
function blockTopAt(world, x, y, z, id) {
  if (!T_SHAPE[id] && !(BLOCKS[id].shape && SHAPES[BLOCKS[id].shape])) return 1;
  const bs = worldBoxes(world, x, y, z, id, 1);
  if (!bs) return 1;
  let m = 0; for (const b of bs) m = Math.max(m, b[4] / 16);
  return m;
}
function ledgeSurface(world, x, cy, z) {
  const id = world.getBlockPhys(x, cy, z);
  if (!T_SOLID[id] || BLOCKS[id].scaffold) return null;
  const h = blockTopAt(world, x, cy, z, id);
  if (h < 0.75) return null;
  let s = cy + h;
  if (h <= 1 + 1e-6) {
    const up = world.getBlockPhys(x, cy + 1, z);
    if (T_SOLID[up] && !BLOCKS[up].scaffold) { const hu = blockTopAt(world, x, cy + 1, z, up); if (hu > 0 && hu <= 0.5) s = cy + 1 + hu; }
  }
  return s;
}
// Room to stand on top of a ledge whose surface is at s.
function ledgeRoom(world, bx, bz, s, w) {
  const r = w - 0.01;
  return !collides(world, bx + 0.5 - r, s + 0.02, bz + 0.5 - r, bx + 0.5 + r, s + PLAYER_H, bz + 0.5 + r);
}

class Player {
  constructor() {
    this.x = 0.5; this.y = 80; this.z = 0.5;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.w = PLAYER_W; this.h = PLAYER_H; this.eye = EYE;
    this.yaw = 0; this.pitch = 0;
    this.onGround = false;
    this.health = 20; this.maxHealth = 20;
    this.heartCrystals = 0;        // permanent extra hearts (max 10)
    this.air = AIR_MAX;
    this.swimming = false; this.crawling = false;
    this.xp = 0; this.level = 0;
    this.inv = new PlayerInventory();
    this.fuel = 0;                 // furnace heat banked from burned fuel
    this.dim = 0;
    this.spawn = null;             // per-player spawn (world spawn if null)
    this.pocketReturn = null;
    this.invuln = 0; this.hurtFlash = 0; this.hurtTilt = 0;
    this.burn = 0; this.slow = 0;
    this.fallStart = null;
    this.dead = false;
    this.contacts = {};
    this.portalTime = 0; this.portalCooldown = 0;
    this.sneaking = false; this.sprinting = false;
    // animation
    this.bob = 0; this.bobAmt = 0; this.swing = 0; this.swinging = false;
    this.equip = 1; this.lastHeldKey = null; this.eatAnim = 0;
    this.stepAcc = 0;
    this.stats = { blocksMined: 0, mobsKilled: 0, bossesKilled: 0, deaths: 0 };
    this.carrying = null;          // Carry On: {kind:'block'|'mob', ...}
    this.spawnDim = 0;
    this.flying = false;           // creative flight
    this.lastSafe = null;          // last solid ground stood on (for graves)
    this.grave = null;             // where our last grave is: {dim,x,y,z}
  }

  get eyeY() { return this.y + this.eye; }
  look() { return lookVector(this.yaw, this.pitch); }

  // ---- movement -------------------------------------------------------------------
  move(world, inp, dt, opts) {
    this.sneaking = inp.sneak;
    const c = this.contacts;
    const inWater = c.water, inLava = c.lava;
    // ---- body actions (like the More Body Actions add-on): hang from a ledge, pull yourself up ----
    const jumpEdge = inp.jump && !this._jumpHeld; this._jumpHeld = inp.jump;
    if (inp.crawl) this.crawlWant = !this.crawlWant;
    if (this.crawlWant && (inWater || this.flying)) this.crawlWant = false;
    if (this.climb) return this.climbStep(world, dt);
    if (this.hang) {
      const H = this.hang;
      H.t += dt;
      // the ledge is still there (a little snow settling on it is fine) with room on top
      const S = ledgeSurface(world, H.bx, H.cy ?? H.top - 1, H.bz);
      if (S !== null && Math.abs(S - H.surf) <= 0.13 && ledgeRoom(world, H.bx, H.bz, S, this.w)) H.surf = S;
      if (this.flying || inWater || S === null || H.surf !== S) this.hang = null;
      else if (inp.sneak || inp.mz > 0.4) { this.hang = null; this.vy = -1; this.fallStart = this.y; }        // let go
      else if (jumpEdge || (inp.jump && H.t > 0.3) || (inp.mz < -0.4 && H.t > 0.6)) {
        // pull up and over onto the ledge
        const tx = H.dx ? H.bx + 0.5 - H.dx * 0.15 : this.x, tz = H.dz ? H.bz + 0.5 - H.dz * 0.15 : this.z;
        this.climb = { t: 0, from: [this.x, this.y, this.z], to: [tx, H.surf, tz], up: H.surf + 0.02 };
        this.hang = null;
        return this.climbStep(world, 0);
      } else {
        this.vx = this.vy = this.vz = 0; this.y = H.surf - 1.75; this.x = H.x; this.z = H.z;
        this.fallStart = null; this.onGround = false; this.crawling = false; this.h = PLAYER_H; this.eye = EYE;
        this.bobAmt *= 0.9;
        return { horizSpeed: 0, landed: false };
      }
    }
    // modern swimming: sprint forward with your head under water and you swim like a fish,
    // lying flat (you fit through one-block gaps) and going wherever you look
    if (inWater && !this.flying && !this.sneaking && inp.sprint && inp.mz < -0.3 && (c.eyeWater || this.swimming)) this.swimming = true;
    else if (this.swimming && (!inWater || inp.mz > -0.2 || this.flying)) {
      this.swimming = false;
      // no room to stand up: keep low and crawl
      if (collides(world, this.x - this.w, this.y, this.z - this.w, this.x + this.w, this.y + PLAYER_H, this.z + this.w)) this.crawling = true;
    }
    // crawl when you ask to (C, or sneak tapped twice on a pad), or sneak into a gap one block high
    if (this.crawlWant && this.onGround && !inWater && !this.flying) this.crawling = true;
    if ((this.sneaking || inp.crawlHeld) && this.onGround && !inWater && !this.flying && !this.crawling && (Math.abs(inp.mx) + Math.abs(inp.mz)) > 0.3) {
      const s0 = Math.sin(this.yaw), c0 = Math.cos(this.yaw);
      const dx = (c0 * inp.mx + s0 * inp.mz), dz = (-s0 * inp.mx + c0 * inp.mz), dl = Math.hypot(dx, dz) || 1;
      const ax = Math.floor(this.x + dx / dl * (this.w + 0.35)), az = Math.floor(this.z + dz / dl * (this.w + 0.35)), fy = Math.floor(this.y + 0.05);
      if (!T_SOLID[world.getBlockPhys(ax, fy, az)] && T_SOLID[world.getBlockPhys(ax, fy + 1, az)]) { this.crawling = true; this._crawlHold = 0.5; }
    }
    if (this._crawlHold > 0) this._crawlHold -= dt;
    if (this.crawling && !this.swimming && !this.crawlWant && !(this._crawlHold > 0) && !collides(world, this.x - this.w, this.y, this.z - this.w, this.x + this.w, this.y + PLAYER_H, this.z + this.w)) this.crawling = false;
    this.h = this.swimming || this.crawling ? SWIM_H : PLAYER_H;
    let speed = this.flying ? (inp.sprint ? 18 : 10) : this.sneaking ? SNEAK : (inp.sprint && inp.mz < -0.3 ? SPRINT : WALK);
    if (this.flying) this.sneaking = false;
    this.sprinting = speed === SPRINT && !this.swimming;
    if (this.crawling) speed = SNEAK * 1.1;
    if (this.swimming) speed = SWIM;
    else if (inWater) speed *= 0.46;
    if (inLava) speed *= 0.4;
    if (c.web) speed *= 0.2;
    if (this.slow > 0) speed *= 0.55;
    speed *= opts.slow || 1;
    const under = world.getBlock(Math.floor(this.x), Math.floor(this.y - 0.1), Math.floor(this.z));
    // soul sand and honey drag at your feet
    if (this.onGround && !this.flying && BLOCKS[under] && BLOCKS[under].slow) speed *= BLOCKS[under].slow;
    // desired horizontal velocity in world space
    const s = Math.sin(this.yaw), co = Math.cos(this.yaw);
    const fx = -s, fz = -co, rx = co, rz = -s;
    let tx = (rx * inp.mx - fx * inp.mz) * speed, tz = (rz * inp.mx - fz * inp.mz) * speed;
    const slippery = this.onGround && BLOCKS[under] && BLOCKS[under].slippery;
    const accel = this.flying ? 8 : this.onGround ? (slippery ? 2 : 14) : (inWater || inLava ? 6 : 3);
    const k = Math.min(1, accel * dt);
    this.vx += (tx - this.vx) * k; this.vz += (tz - this.vz) * k;

    // vertical
    if (this.swimming) {
      // along the look direction, up and down included
      const [lx, ly, lz] = this.look();
      const want = inp.mz < -0.3 ? -inp.mz : 0;
      this.vx += (lx * SWIM * want - this.vx) * Math.min(1, 5 * dt);
      this.vz += (lz * SWIM * want - this.vz) * Math.min(1, 5 * dt);
      // at the surface you skim along it rather than leaping out (jump to come up for air)
      const up = !c.eyeWater && ly > 0 && !inp.jump ? Math.min(ly, 0.05) : ly;
      this.vy += (up * SWIM * want + (inp.jump ? 2 : 0) - this.vy) * Math.min(1, 5 * dt);
    } else if (inWater || inLava) {
      // the classic game's water: you sink slowly, kick up with jump, dive with sneak, and the water
      // drags at every move so nothing is sudden (it also takes the speed out of a fall)
      const drag = Math.pow(inLava ? 0.5 : 0.8, 20 * dt);
      this.vy -= (inLava ? 8 : 2) * dt;
      if (inp.jump) this.vy += 16 * dt;
      else if (this.sneaking) this.vy -= 16 * dt;
      this.vy *= drag;
      // hop out at the edge of a pool
      if (inp.jump && this.hitWallLast) this.vy = Math.max(this.vy, 5.5);
    } else if (c.ladder) {
      // ladders and vines: push into them or hold jump to climb, sneak to hang on
      this.vy -= GRAVITY * dt;
      this.vy = Math.max(this.vy, -2.4);
      if (inp.jump || (inp.mz < -0.3 && this.hitWallLast) || (inp.mz < -0.3 && !this.onGround)) this.vy = 2.6;
      if (this.sneaking && this.vy < 0) this.vy = c.scaffold ? -2.2 : 0;
      this.fallStart = null;
    } else {
      this.vy -= GRAVITY * dt;
      if (this.vy < -60) this.vy = -60;
      if (c.web) this.vy = Math.max(this.vy, -1);
      if (inp.jump && this.onGround) { this.vy = JUMP_V * (BLOCKS[under] && BLOCKS[under].sticky ? 0.55 : 1); if (this.sprinting) { this.vx *= 1.15; this.vz *= 1.15; } }
    }
    if (this.flying) { this.vy = (inp.jump ? 7.5 : 0) - (inp.sneak ? 7.5 : 0); this.fallStart = null; }
    // auto-jump (touch): walking into a 1-block step
    if (opts.autoJump && this.onGround && !inWater && (Math.abs(tx) + Math.abs(tz)) > 0.5) {
      const ahead = 0.45;
      const nx = this.x + (tx / speed) * ahead, nz = this.z + (tz / speed) * ahead;
      const fy = Math.floor(this.y + 0.05);
      if (T_SOLID[world.getBlockPhys(Math.floor(nx), fy, Math.floor(nz))] && !T_SOLID[world.getBlockPhys(Math.floor(nx), fy + 1, Math.floor(nz))] && !T_SOLID[world.getBlockPhys(Math.floor(nx), fy + 2, Math.floor(nz))]
        && !T_SOLID[world.getBlockPhys(Math.floor(this.x), fy + 2, Math.floor(this.z))]) this.vy = JUMP_V;
    }

    const ox = this.x, oz = this.z, wasGround = this.onGround, vyBefore = this.vy;
    // (0.9.0.41) a moment after stepping off a little lip (snow on a path, a carpet's edge) you can still step over the
    // next one, instead of stubbing your toe on it in mid-air
    this.airStep = !this.onGround && !this.flying && !inWater && !inLava && !c.ladder && this.vy <= 0.5 && (this._airT || 0) < 0.25 ? 0.26 : 0;
    moveEntity(world, this, dt);
    // slime blocks throw you back up (sneak to land softly)
    if (!wasGround && this.onGround && vyBefore < -2.5 && !this.sneaking) {
      const ub = BLOCKS[world.getBlock(Math.floor(this.x), Math.floor(this.y - 0.1), Math.floor(this.z))];
      if (ub && ub.bouncy) { this.vy = -vyBefore * 0.82; this.onGround = false; this.fallStart = null; this.bounced = true; }
    }
    if (this.flying && this.onGround && !inp.jump) this.flying = false;
    this.hitWallLast = this.hitWall;
    // jumped into a wall: catch the top edge if it's in reach (a ledge up to three blocks above your feet)
    // (0.9.0.41) measured by the blocks' real heights, so a snow layer or a carpet is never taken for a ledge
    // a block up, and only where your body has room to hang (it used to drop you into the ground on snowy paths)
    if (!this.onGround && !this.flying && !inWater && !inLava && !c.ladder && !this.crawling && !this.swimming && this.hitWall && inp.mz < -0.3 && this.vy < 5 && !this.sneaking && !opts.noLedge) {
      const [lx, , lz] = this.look();
      let dx = 0, dz = 0; if (Math.abs(lx) > Math.abs(lz)) dx = Math.sign(lx); else dz = Math.sign(lz);
      const bx = Math.floor(this.x + dx * (this.w + 0.2)), bz = Math.floor(this.z + dz * (this.w + 0.2));
      for (let cy = Math.floor(this.y); cy <= Math.floor(this.y + 2.7); cy++) {
        const S = ledgeSurface(world, bx, cy, bz);
        if (S === null) continue;
        const reach = S - this.y;
        if (reach < 1.0 || reach > 2.7) continue;
        // room on top to climb onto, and in your own column from where you'll hang up to standing height on the ledge
        if (!ledgeRoom(world, bx, bz, S, this.w)) continue;
        const hy = S - 1.75, w = this.w - 0.01;
        if (collides(world, this.x - w, Math.min(this.y, hy) + 0.001, this.z - w, this.x + w, S + PLAYER_H, this.z + w)) continue;
        this.hang = { bx, bz, cy, top: cy + 1, surf: S, dx, dz, t: 0, x: this.x, z: this.z };
        this.vx = this.vy = this.vz = 0; this.y = hy; this.fallStart = null; this.justGrabbed = true;
        break;
      }
    }
    // sneaking keeps you from walking off edges
    if (this.sneaking && wasGround && this.vy <= 0) {
      const supported = (x, z) => collides(world, x - this.w + 0.05, this.y - 0.6, z - this.w + 0.05, x + this.w - 0.05, this.y - 0.01, z + this.w - 0.05);
      if (!supported(this.x, this.z)) {
        if (supported(ox, this.z)) this.x = ox;
        else if (supported(this.x, oz)) this.z = oz;
        else { this.x = ox; this.z = oz; }
        this.onGround = true; this.vy = 0;
      }
    }
    this.eye = this.swimming || this.crawling ? SWIM_EYE : this.sneaking ? EYE_SNEAK : EYE;
    if (this.onGround && !this.contacts.lava && T_SOLID[world.getBlock(Math.floor(this.x), Math.floor(this.y - 0.1), Math.floor(this.z))]) this.lastSafe = [this.x, this.y, this.z];

    // view bob
    const hs = Math.hypot(this.vx, this.vz);
    this.bobAmt += ((this.onGround ? Math.min(1, hs / WALK) : 0) - this.bobAmt) * Math.min(1, dt * 8);
    this.bob += hs * dt * 1.6;
    // (0.9.0.15) the stroke of your arms and legs in the water: an easy rhythm, a little quicker as you go faster
    this.swimPh = ((this.swimPh || 0) + dt * (this.contacts.water ? 2.4 + hs * 0.5 : 1.2)) % 628.3;
    return { horizSpeed: hs, landed: !wasGround && this.onGround };
  }

  // Pulling up onto a ledge: up the wall first, then over onto the top.
  climbStep(world, dt) {
    const C = this.climb, D = 0.55;
    C.t += dt;
    const k = Math.min(1, C.t / D), up = Math.min(1, k / 0.6), over = Math.max(0, (k - 0.55) / 0.45);
    const e = (v) => v * v * (3 - 2 * v);
    this.y = C.from[1] + (C.up - C.from[1]) * e(up);
    this.x = C.from[0] + (C.to[0] - C.from[0]) * e(over);
    this.z = C.from[2] + (C.to[2] - C.from[2]) * e(over);
    this.vx = this.vy = this.vz = 0; this.fallStart = null; this.onGround = false;
    this.h = PLAYER_H; this.eye = EYE;
    if (k >= 1) { this.climb = null; this.y = C.to[1]; this.onGround = true; if (collides(world, this.x - this.w, this.y, this.z - this.w, this.x + this.w, this.y + PLAYER_H, this.z + this.w)) { this.crawling = true; this.h = SWIM_H; this.eye = SWIM_EYE; } }
    return { horizSpeed: 0, landed: k >= 1 };
  }

  // ---- health --------------------------------------------------------------------
  // amount in half-hearts. source: {type, element, attacker}
  hurt(amount, source = {}) {
    if (this.dead || amount <= 0) return 0;
    if (this.invuln > 0 && !source.bypass) return 0;
    let dmg = amount;
    // (0.9.0.24) 3.5% a point, so every tier up to adamantite still helps; and armour, enchantments and skill together
    // never take more than 80% of a blow (source._raw is the blow before any of them, set where it lands)
    if (!source.bypassArmor) dmg *= 1 - Math.min(0.8, this.inv.armorPoints() * 0.032);   // (0.9.0.25) iron 48%, diamond 64%, mithril 70%, dragonscale 74%, adamantite 80%
    if (source._raw && !source.bypassArmor && !(this.fx_resist > 0)) dmg = Math.max(dmg, source._raw * 0.2);
    if (source.element === 'fire' || source.type === 'lava' || source.type === 'burn') dmg *= 1 - this.inv.fireResist();
    dmg = Math.max(0.5, Math.round(dmg * 2) / 2);
    this.health = Math.max(0, this.health - dmg);
    this.invuln = source.type === 'burn' || source.type === 'lava' ? 0.45 : 0.6;
    this.hurtFlash = 1; this.hurtTilt = (Math.random() < 0.5 ? -1 : 1) * 0.12;
    if (!source.bypassArmor) this.wearArmor();
    return dmg;
  }
  wearArmor() {
    const a = this.inv.armor.slots;
    for (let i = 0; i < 4; i++) {
      const s = a[i]; if (!s) continue;
      const d = itemDef(s.id); if (!d || !d.armor) continue;
      s.d = (s.d || 0) + 1;
      if (s.d >= d.armor.durability) { a[i] = null; this.brokeSomething = itemName(s); }
    }
  }
  heal(n) { const before = this.health; this.health = Math.min(this.maxHealth, this.health + n); return this.health - before; }
  // Ten hearts, plus Heart Crystals eaten, plus whatever the belt charm gives.
  recalcMax() {
    const m = 20 + 2 * Math.min(10, this.heartCrystals) + 2 * this.inv.charmBonus('hearts');
    if (m !== this.maxHealth) { this.maxHealth = m; if (this.health > m) this.health = m; }
  }
  // Levels count up as you gain experience (they'll power enchanting); they no longer add hearts.
  addXP(n) {
    this.xp += n;
    let ups = 0;
    while (this.xp >= xpForLevel(this.level)) { this.xp -= xpForLevel(this.level); this.level++; ups++; }
    return ups;
  }

  toJSON() {
    return {
      dim: this.dim, x: this.x, y: this.y, z: this.z, yaw: this.yaw, pitch: this.pitch,
      health: this.health, maxHealth: this.maxHealth, xp: this.xp, level: this.level, hv: 2, heartCrystals: this.heartCrystals, air: this.air,
      inv: this.inv.toJSON(), fuel: this.fuel, spawn: this.spawn, pocketReturn: this.pocketReturn, stats: this.stats,
      carrying: this.carrying, grave: this.grave, spawnDim: this.spawnDim,
    };
  }
  load(o) {
    if (!o) return;
    for (const k of ['dim', 'x', 'y', 'z', 'yaw', 'pitch', 'health', 'maxHealth', 'xp', 'level', 'fuel']) if (typeof o[k] === 'number' && isFinite(o[k])) this[k] = o[k];
    this.inv.load(o.inv);
    this.spawn = o.spawn || null;
    this.pocketReturn = o.pocketReturn || null;
    if (o.stats) Object.assign(this.stats, o.stats);
    this.carrying = o.carrying || null;
    this.grave = o.grave || null;
    this.spawnDim = o.spawnDim || 0;
    // Before 0.7, levels raised max health. Those hearts come back as Heart Crystals to use (or not).
    if (o.hv !== 2 && o.maxHealth > 20) this.refundHearts = Math.round((Math.min(40, o.maxHealth) - 20) / 2);
    this.heartCrystals = clamp(o.heartCrystals | 0, 0, 10);
    this.air = typeof o.air === 'number' ? clamp(o.air, 0, AIR_MAX) : AIR_MAX;
    this.maxHealth = 0; this.recalcMax();
    this.health = clamp(this.health, 0, this.maxHealth);
    if (this.health <= 0) this.health = this.maxHealth;
  }
}
