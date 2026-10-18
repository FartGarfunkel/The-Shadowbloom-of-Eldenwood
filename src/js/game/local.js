// ---------------------------------------------------------------------------
// game/local.js — one person playing on this device.
//
// A LocalPlayer owns a Player (body, health, inventory), its input devices
// (keyboard/mouse/touch and/or gamepads), its slice of the screen, its HUD and
// inventory screens, and every rule about what happens when it mines, builds,
// eats, attacks, carries or travels. Split-screen is simply several of these.
// It also acts as a "pawn" for creatures: they can see it, hurt it, and hand
// it items.
// ---------------------------------------------------------------------------

const REACH = 5;
const CARRY_SLOW = 0.75;

class LocalPlayer {
  constructor(game, index, profile) {
    this.g = game; this.index = index;
    this.profile = profile || { name: 'Player ' + (index + 1), skin: null };
    this.player = new Player();
    this.useKb = index === 0;
    this.pads = new Set();
    this.view = { x: 0, y: 0, w: 1, h: 1 };
    this.mode = 'play';            // 'play' | 'inv' | 'dead'
    this.placeMode = 0;            // 0 normal, 1 vertical slabs / upside-down stairs
    this.riding = null;            // the boat we're sitting in
    this.sleeping = null;
    this.mining = null; this.target = null; this.targetEnt = null;
    this.useRepeat = 0; this.breakCd = 0; this.shakeAmt = 0;
    this.el = game.ui.makeView(this);
    this.hud = new Hud(this);
    this.inv = new InvUI(this);
    this.skin = getSkin(game.renderer.gl, skinRef(this.profile));
  }
  setSkin(dataURL) { this.profile.skin = dataURL; this.skin = getSkin(this.g.renderer.gl, skinRef(this.profile)); }

  // ---- pawn interface -----------------------------------------------------------------
  get x() { return this.player.x; } get y() { return this.player.y; } get z() { return this.player.z; }
  get vx() { return this.player.vx; } get vz() { return this.player.vz; } get eye() { return this.player.eye; }
  get dead() { return this.player.dead; } get sneaking() { return this.player.sneaking; } get carrying() { return this.player.carrying; }
  get name() { return this.profile.name; }
  look() { return this.player.look(); }
  knock(vx, vy, vz) { const p = this.player; p.vx += vx; p.vz += vz; if (vy) p.vy = Math.max(p.vy, vy); }
  ignite(t) { this.player.burn = Math.max(this.player.burn, t); }
  give(stack) {
    const n0 = stack.n;
    const left = this.player.inv.add(stack);
    if (left < n0) { this.g.sfx.play('pop'); this.hud.pickup(stack.id, n0 - left); }
    return left;
  }
  floatText(x, y, z, text, color) { this.hud.floatText(x, y, z, text, color); }
  toast(msg, kind) { this.hud.toast(msg, kind); }
  grantXP(n, x, y, z) {
    const p = this.player;
    const ups = p.addXP(n);
    if (x !== undefined) this.floatText(x, y, z, '+' + n + ' XP', '#b6f06a');
    if (ups) { this.g.sfx.play('levelup'); this.toast(`Level ${p.level}!`, 'good'); }
  }
  hurt(amount, src = {}) {
    const g = this.g, p = this.player;
    if (p.dead || g.state === 'loading') return;
    if (g.creative && src.type !== 'void') return;
    const r = g.rules();
    if ((src.type === 'fall' && !r.fallDamage) || (src.type === 'drown' && !r.drowning) || ((src.type === 'lava' || src.type === 'burn') && !r.fireDamage)) return;
    p._lastHurtT = g.time;
    if (this.sleeping) this.sleeping = null;
    const dealt = p.hurt(amount, src);
    if (!dealt) return;
    g.sfx.play('hurt');
    if (this.pads.size) g.pads.rumble(this, Math.min(1, 0.25 + dealt * 0.08), 140);
    if (src.attacker && src.knock !== 0) {
      // (alpha 4) an attacker given as a player's controller (spells) has its position on .player: without it this was NaN
      const A = Number.isFinite(src.attacker.x) ? src.attacker : (src.attacker.player || src.attacker);
      const kx = p.x - A.x, kz = p.z - A.z, l = Math.hypot(kx, kz) || 1;
      const k = src.knock || 5;
      if (Number.isFinite(kx) && Number.isFinite(kz)) { p.vx += kx / l * k; p.vz += kz / l * k; }
      p.vy = Math.max(p.vy, 4);
    }
    if (src.element === 'fire' && src.type !== 'burn') p.burn = Math.max(p.burn, 2);
    if (p.health <= 0) this.die(src);
  }
  shake(a) { if (this.g.settings.screenShake === false) return; this.shakeAmt = Math.max(this.shakeAmt, a); }
  // Breath runs out with your head under water; then you start to drown, a heart a second.
  breathe(dt) {
    const g = this.g, p = this.player, c = p.contacts || {};
    p.recalcMax();
    if (p.refundHearts) {
      this.give(mkStack('heart_crystal', p.refundHearts));
      this.toast('Hearts no longer come from levels — your ' + p.refundHearts + ' extra became Heart Crystals. Eat one for a heart that stays.', 'rare');
      p.refundHearts = 0;
    }
    if (c.eyeWater && !g.creative && !p.dead) {
      p.air -= dt / (1 + p.inv.charmBonus('breath'));
      if (Math.random() < dt * (p.air <= 0 ? 6 : 1.2)) {
        const [lx, , lz] = p.look();
        g.particles.add({ x: p.x + lx * 0.3, y: p.y + p.eye - 0.1, z: p.z + lz * 0.3, vx: (Math.random() - 0.5) * 0.2, vy: 1.2, vz: (Math.random() - 0.5) * 0.2, life: 1.2, max: 1.2, size: 0.05, uv: tileUV(ATLAS.tile.bubble_particle ?? ATLAS.tile.white), light: 0xFF, grav: -0.4 });
      }
      if (p.air <= 0) {
        p.air = 0; p._drownT = (p._drownT || 0) + dt;
        if (p._drownT >= 1) { p._drownT = 0; this.hurt(2, { type: 'drown', bypassArmor: true }); }
      }
    } else { p.air = Math.min(AIR_MAX, p.air + dt * 6); p._drownT = 0; }
    // optional slow healing, half a heart every few seconds once you've been safe for a while
    if (g.rules().naturalRegen && !p.dead && p.health < p.maxHealth && g.time - (p._lastHurtT || 0) > 8) {
      p._regenT = (p._regenT || 0) + dt;
      if (p._regenT > 4) { p._regenT = 0; p.heal(1); }
    }
  }

  // ---- input --------------------------------------------------------------------------
  readInput() {
    const g = this.g;
    const s = InputManager.blankState();
    if (this.useKb) mergeInput(s, g.input.s);
    for (const pi of this.pads) { const ps = g.pads.state(pi); if (ps) mergeInput(s, ps); }
    return s;
  }

  // ---- per-frame update ---------------------------------------------------------------
  update(dt, inp) {
    const g = this.g, p = this.player, w = g.world;
    if (this.mode === 'inv') { this.inv.frame(dt, inp); inp = InputManager.blankState(); }
    if (this.mode === 'sign') { if ((inp.padB || inp.padA || inp.padStart) && this._signClose) this._signClose(); return; }
    if (this.mode === 'chat') { if (inp.padB || inp.padStart) this.closeChat(); return; }
    if (p.dead) return;
    if (inp.pause) { g.pause(); return; }
    if (inp.chat !== null && inp.chat !== undefined && this.mode === 'play' && this.useKb) { this.openChat(inp.chat); return; }
    if (inp.hideHud) this.el.classList.toggle('nohud');
    if (inp.screenshot) g.screenshot(this);
    if (inp.view) { this.viewMode = ((this.viewMode || 0) + 1) % 4; this.toast(['First person', 'Over the shoulder', 'Third person (behind)', 'Third person (in front)'][this.viewMode], ''); }
    if (inp.shoulder) { this.shoulderSide = -(this.shoulderSide || 1); if (this.viewMode !== 1) { this.viewMode = 1; } this.toast(this.shoulderSide > 0 ? 'Right shoulder' : 'Left shoulder', ''); }
    if (inp.inventory && this.mode === 'play') { this.openInventory(); return; }
    if (inp.debug) this.hud.debugOn = !this.hud.debugOn;
    p.yaw -= inp.lookX; p.pitch -= inp.lookY;
    p.pitch = clamp(p.pitch, -1.55, 1.55);
    if (inp.place) {
      this.placeMode ^= 1; this.toast(this.placeMode ? 'Placing: vertical slabs · upside-down stairs and trapdoors' : 'Placing: normal', ''); g.sfx.play('tick');
      if (this.useKb) { const mb = document.querySelector('[data-t="mode"]'); if (mb) mb.classList.toggle('latched', !!this.placeMode); }
    }
    if (inp.pick && this.target && !p.carrying) this.pickBlock(this.target);
    if (this.sleeping) {
      // lying in bed until morning (or until you get up)
      if (inp.jump || inp.sneak || inp.attackPressed) { this.sleeping = null; this.toast('You got out of bed', ''); }
      else { p.vx = p.vz = 0; this.updateTarget(); return; }
    }
    if (this.riding) {
      const b = this.riding;
      this.boatInput = { mx: inp.mx, mz: inp.mz, jump: inp.jump, sprint: inp.sprint };
      if (inp.sneak && !this._sneakWas) { b.dismount(this); this._sneakWas = true; return; }
      this._sneakWas = inp.sneak;
    // creative: double-tap jump to fly
    if (g.creative && inp.jump && !this._jumpWas) { if (g.time - (this._lastJump || 0) < 0.3) { p.flying = !p.flying; this._lastJump = 0; } else this._lastJump = g.time; }
    this._jumpWas = inp.jump;
    if (!g.creative) p.flying = false;
      if (!p.carrying) { if (inp.slot >= 0) p.inv.selected = inp.slot; if (inp.wheel) p.inv.selected = (((p.inv.selected + inp.wheel) % 9) + 9) % 9; }
      p.contacts = sampleContacts(w, p);
      if (p.invuln > 0) p.invuln -= dt;
      if (p.hurtFlash > 0) p.hurtFlash = Math.max(0, p.hurtFlash - dt * 2.5);
      if (p.swinging || p.swing > 0) { p.swing += dt * 3.6; if (p.swing >= 1) p.swing = 0; }
      p.swinging = false; p.bobAmt *= 0.9;
      this.updateTarget();
      this.interact(dt, inp);
      this.updateHeldTools(dt, inp);
      return;
    }
    this._sneakWas = inp.sneak;
    // creative: double-tap jump to fly
    if (g.creative && inp.jump && !this._jumpWas) { if (g.time - (this._lastJump || 0) < 0.3) { p.flying = !p.flying; this._lastJump = 0; } else this._lastJump = g.time; }
    this._jumpWas = inp.jump;
    if (!g.creative) p.flying = false;
    if (!p.carrying) {
      if (inp.slot >= 0) p.inv.selected = inp.slot;
      if (inp.wheel) p.inv.selected = (((p.inv.selected + inp.wheel) % 9) + 9) % 9;
      if (inp.swap) { const a = p.inv.held; p.inv.held = p.inv.offhand; p.inv.offhand = a; g.sfx.play('swap'); p.equip = 0.4; }
    }
    p.contacts = sampleContacts(w, p);
    const wasHang = !!p.hang, wasClimb = !!p.climb;
    const mv = p.move(w, inp, dt, { autoJump: g.settings.autoJump && (this.useKb && g.input.touchMode), slow: p.carrying ? CARRY_SLOW : 1, noLedge: !!p.carrying });
    if (inp.crawl) this.toast(p.crawlWant ? 'Crawling' : 'Standing up', '');
    if (p.hang && !wasHang) { g.sfx.material('stone', 'step'); if (!this._ledgeTip) { this._ledgeTip = true; this.toast('Hanging on — jump to climb up, sneak to drop', ''); } }
    if (p.climb && !wasClimb) g.sfx.material('stone', 'step');
    p.contacts = sampleContacts(w, p);
    const c = p.contacts;
    if (p.onGround && mv.horizSpeed > 1) {
      p.stepAcc += mv.horizSpeed * dt;
      if (p.stepAcc > 2.2) { p.stepAcc = 0; const id = w.getBlock(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z)); if (id) g.sfx.material(BLOCKS[id].sound, 'step'); }
      if (!c.water && (p._dustAcc = (p._dustAcc || 0) + dt) > (p.sprinting ? 0.06 : 0.22)) { p._dustAcc = 0; g.footDust(p, mv.horizSpeed); }
    }
    if (!p.onGround && !c.water && !c.lava) { if (p.fallStart === null || p.y > p.fallStart) p.fallStart = Math.max(p.fallStart ?? p.y, p.y); }
    if (c.water || c.lava) p.fallStart = null;
    if (this._landT > 0) this._landT -= dt;
    if (p.onGround && p.fallStart !== null) {
      const fall = p.fallStart - p.y;
      p.fallStart = null;
      if (fall > 1.2) this._landT = 0.2;   // a little crouch on landing (third person and first-person body)
      const land = BLOCKS[w.getBlock(Math.floor(p.x), Math.floor(p.y - 0.2), Math.floor(p.z))];
      // beds, hay, slime and honey break a fall
      const soft = (land.bed || land.bouncy || land.sticky ? 0 : land.key.startsWith('hay') ? 0.2 : 1) * (1 - p.inv.charmBonus('fall'));
      const dmg = Math.floor((fall - 3) * soft);
      if (fall > 3.4 && !g.creative && dmg > 0) { this.hurt(dmg, { type: 'fall', bypassArmor: true }); g.sfx.play('thud'); }
    }
    // hitting the water
    if (c.water && !p._wasWater && p.vy < -2.5) { g.sfx.play('splash'); g.splash(p.x, Math.floor(p.y + 0.5) + 0.9, p.z, p.vy < -9); }
    p._wasWater = c.water;
    this.breathe(dt);
    if (c.lava) { this.hurt(4, { type: 'lava' }); p.burn = 7; }
    if (p.burn > 0) {
      p.burn -= dt;
      if (c.water) { p.burn = 0; g.sfx.play('fizz'); }
      p._burnT = (p._burnT || 0) + dt;
      if (p._burnT > 1) { p._burnT = 0; this.hurt(1, { type: 'burn' }); }
    }
    if (c.cactus) this.hurt(1, { type: 'cactus' });
    if (c.fire && !c.water) p.burn = Math.max(p.burn, 3);
    if (c.hot && !p.sneaking) { p._hotT = (p._hotT || 0) + dt; if (p._hotT > 1) { p._hotT = 0; this.hurt(1, { type: 'burn' }); } }
    if (p.y < -32) this.hurt(4, { type: 'void', bypassArmor: true, bypass: true });
    if (p.invuln > 0) p.invuln -= dt;
    if (p.hurtFlash > 0) p.hurtFlash = Math.max(0, p.hurtFlash - dt * 2.5);
    if (p.slow > 0) p.slow -= dt;
    if (p.brokeSomething) { this.toast('Your ' + p.brokeSomething + ' broke', 'warn'); g.sfx.play('hit'); p.brokeSomething = null; }
    if (p.portalCooldown > 0) p.portalCooldown -= dt;
    if (c.portal && p.portalCooldown <= 0) {
      p.portalTime += dt;
      // walking through takes you straight away; standing still in it, a moment longer
      if (p.portalTime > (Math.hypot(p.vx, p.vz) > 1.2 ? 0.25 : 1.2)) { p.portalTime = 0; p.portalCooldown = 4; g.travelPortal(c.portal); }
    } else p.portalTime = Math.max(0, p.portalTime - dt * 2);
    if (p.equip < 1) p.equip = Math.min(1, p.equip + dt * 5);
    if (p.eatAnim > 0) p.eatAnim -= dt;
    if (p.swinging || p.swing > 0) { p.swing += dt * 3.6; if (p.swing >= 1) p.swing = 0; }
    p.swinging = false;
    this.updateTarget();
    this.interact(dt, inp);
    this.updateHeldTools(dt, inp);
    if (inp.drop && !p.carrying) this.dropHeld(false);
    if (inp.dropAll && !p.carrying) this.dropHeld(true);
  }
  swingArm() { const p = this.player; if (p.swing === 0 || p.swing > 0.6) p.swing = 0.0001; }

  updateTarget() {
    const p = this.player, w = this.g.world;
    let [dx, dy, dz] = p.look();
    const ox = p.x, oy = p.y + p.eye, oz = p.z;
    // over the shoulder: aim at whatever is under the crosshair, as seen from the camera
    if (this.viewMode === 1 && this.cam && this._shoulderCam) {
      const c = this.cam, ch = raycastBlocks(w, c.x, c.y, c.z, dx, dy, dz, 10, false), t = ch ? ch.dist : 10;
      const px = c.x + dx * t - ox, py = c.y + dy * t - oy, pz = c.z + dz * t - oz, l = Math.hypot(px, py, pz);
      if (l > 0.3) { dx = px / l; dy = py / l; dz = pz / l; }
    }
    const reach = REACH + (this.useKb && this.g.input.touchMode ? 0.5 : 0);
    const hit = raycastBlocks(w, ox, oy, oz, dx, dy, dz, reach, false);
    let ent = null, ed = hit ? hit.dist : reach;
    for (const e of this.g.entities) {
      if (!(e instanceof Mob || e.isVehicle) || !e.alive || e === this.riding) continue;
      const pad = e.isBoat ? 0.45 : 0.1, hh = e.isBoat ? 0.9 : e.h;
      const t = rayAABB(ox, oy, oz, dx, dy, dz, e.x - e.w - pad, e.y, e.z - e.w - pad, e.x + e.w + pad, e.y + hh, e.z + e.w + pad);
      if (t >= 0 && t < ed && t < (e.isVehicle ? 4.5 : 3.8)) { ed = t; ent = e; }
    }
    this.target = hit; this.targetEnt = ent;
    this.targetPoint = hit ? [ox + dx * hit.dist, oy + dy * hit.dist, oz + dz * hit.dist] : null;
  }
  // which quarter of a block top the crosshair is on (0..3), for setting things down
  targetQuarter() {
    const t = this.targetPoint, h = this.target; if (!t || !h) return -1;
    const fx = t[0] - h.x, fz = t[2] - h.z;
    return (fx >= 0.5 ? 1 : 0) + (fz >= 0.5 ? 2 : 0);
  }

  // ---- mining / attacking / using --------------------------------------------------------
  interact(dt, inp) {
    const p = this.player;
    if (this.breakCd > 0) this.breakCd -= dt;
    if (p.attackCd > 0) p.attackCd -= dt;
    if (p.carrying) {
      this.mining = null;
      if (inp.usePressed) this.placeCarried();
      return;
    }
    const wand = p.inv.held && p.inv.held.id === 'we_wand';
    if (wand) { if (inp.attackPressed) this.weClick(1); if (inp.usePressed) this.weClick(2); this.mining = null; return; }
    if (inp.attackPressed && this.targetEnt) { this.attackEntity(this.targetEnt); this.mining = null; return; }
    if (inp.attackPressed && !this.target) this.swingArm();
    if (inp.attack && this.target && !this.targetEnt) {
      const t = this.target;
      if (!this.mining || this.mining.x !== t.x || this.mining.y !== t.y || this.mining.z !== t.z || this.mining.id !== t.id) {
        // a block you gave up on keeps its cracks for a while (and slowly mends)
        if (this.mining) this.g.rememberDamage(this.mining);
        this.mining = { x: t.x, y: t.y, z: t.z, id: t.id, progress: this.g.damageFor(t.x, t.y, t.z, t.id), time: this.breakTime(t.id, t), pt: 0 };
      }
      const m = this.mining;
      p.swinging = true; if (p.swing === 0) p.swing = 0.0001;
      if (this.breakCd <= 0 && m.time !== Infinity) {
        m.progress += m.time <= 0 ? 1 : dt / m.time;
        m.pt += dt;
        if (m.pt > 0.22) { m.pt = 0; this.g.sfx.material(BLOCKS[t.id].sound, 'dig'); this.g.burst(t.x + 0.5 + t.nx * 0.52, t.y + 0.5 + t.ny * 0.52, t.z + 0.5 + t.nz * 0.52, BLOCKS[t.id].key, 2, 0.6); }
        if (m.progress >= 1) { this.breakBlock(t.x, t.y, t.z); this.g.forgetDamage(t.x, t.y, t.z); this.mining = null; this.breakCd = 0.18; }
      }
    } else { if (this.mining) this.g.rememberDamage(this.mining); this.mining = null; }
    if (inp.usePressed) { this.useRepeat = 0.28; this.use(false, inp); }
    else if (inp.use) { this.useRepeat -= dt; if (this.useRepeat <= 0) { this.useRepeat = 0.22; this.use(true, inp); } }
  }

  heldTool() { const h = this.player.inv.held; const d = h && itemDef(h.id); return d ? d.tool : null; }
  breakTime(id, hit) {
    const b = BLOCKS[id];
    if (b.hardness < 0) return Infinity;
    if (this.g.creative) return 0.05;
    if (b.hardness === 0) return 0;
    const tool = this.heldTool();
    const right = tool && b.tool && tool.type === b.tool;
    const harvest = !b.tier || (right && tool.tier >= b.tier);
    let t = b.hardness * (harvest ? 1.5 : 5) / (right ? tool.speed : 1);
    if (tool && tool.type === 'sword' && b.isLeaves) t /= 3;
    if (b.isLog && !this.player.sneaking && hit) {
      const tree = this.scanTree(hit.x, hit.y, hit.z);
      if (tree) t *= Math.min(3, 1 + 0.1 * (tree.logs.length - 1));
    }
    if (this.player.contacts.eyeWater) t *= 3;
    return Math.max(0.05, t);
  }
  canHarvest(id) {
    const b = BLOCKS[id];
    if (!b.tier) return true;
    const tool = this.heldTool();
    return !!(tool && tool.type === b.tool && tool.tier >= b.tier);
  }

  breakBlock(x, y, z) {
    const g = this.g, w = g.world, p = this.player;
    const id = w.getBlock(x, y, z), b = BLOCKS[id];
    if (!id) return;
    if (b.isLog && !p.sneaking) {
      const tree = this.scanTree(x, y, z);
      if (tree) { this.fellTree(x, y, z, tree); return; }
    }
    const harvest = this.canHarvest(id);
    const meta = w.getMeta(x, y, z);
    const ent = w.getEntity(x, y, z);
    if (ent) g.spillEntity(ent, x, y, z);
    if (b.mech) g.mech.removed(x, y, z);
    w.setBlock(x, y, z, 0);
    this.afterBreak(x, y, z, id, meta);
    g.sfx.material(b.sound, 'break');
    g.burst(x + 0.5, y + 0.5, z + 0.5, b.key, 14, 1.2);
    if (harvest && !(this.g.creative)) g.dropBlockItems(x, y, z, id, false, meta, this.heldTool());
    if (harvest && b.xp) this.grantXP(b.xp, x + 0.5, y + 0.8, z + 0.5);
    this.wearHeld(b.hardness > 0 ? 1 : 0);
    p.stats.blocksMined++;
  }
  wearHeld(n) {
    if (!n) return;
    const p = this.player, s = p.inv.held;
    if (!s) return;
    const d = itemDef(s.id);
    if (!d || !d.tool) return;
    s.d = (s.d || 0) + n;
    if (s.d >= d.tool.durability) { p.inv.held = null; this.toast('Your ' + d.name + ' broke', 'warn'); this.g.sfx.play('hit'); }
  }

  // ---- tree felling (Tree Capitator) --------------------------------------------------
  scanTree(x, y, z) {
    const w = this.g.world;
    const logs = [], seen = new Set(), q = [[x, y, z]];
    while (q.length && logs.length < 140) {
      const [a, b, c] = q.pop();
      const k = posKey(a, b, c);
      if (seen.has(k)) continue;
      seen.add(k);
      const id = w.getBlock(a, b, c);
      if (!BLOCKS[id].isLog) continue;
      logs.push([a, b, c, id]);
      for (let dy = 0; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy && !dz) continue;
        const nx = a + dx, ny = b + dy, nz = c + dz;
        if (ny < y || Math.abs(nx - x) > 7 || Math.abs(nz - z) > 7) continue;
        q.push([nx, ny, nz]);
      }
    }
    if (logs.length < 2) return null;
    const leaves = [], ls = new Set();
    for (const [a, b, c] of logs) {
      for (let dy = -1; dy <= 3; dy++) for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const nx = a + dx, ny = b + dy, nz = c + dz;
        const k = posKey(nx, ny, nz);
        if (ls.has(k)) continue;
        const id = w.getBlock(nx, ny, nz);
        if (BLOCKS[id].isLeaves) { ls.add(k); leaves.push([nx, ny, nz, id]); }
      }
    }
    if (leaves.length < 4 && !(logs.length >= 3 && this.g.world.gen.dim === 0 && leaves.length === 0 && this.isBareTree(logs))) return null;
    return { logs, leaves };
  }
  // Leafless "watcher" trees still fall as trees: a single straight trunk on soil.
  isBareTree(logs) {
    const w = this.g.world;
    const xs = new Set(logs.map(l => l[0] + ',' + l[2]));
    if (xs.size !== 1) return false;
    const minY = Math.min(...logs.map(l => l[1]));
    const g = w.getBlock(logs[0][0], minY - 1, logs[0][2]);
    return g === B.grass || g === B.dirt || g === B.snowy_grass;
  }
  fellTree(x, y, z, tree) {
    const g = this.g, w = g.world, p = this.player;
    const counts = {};
    const blocks = [];
    for (const [a, b, c, id] of tree.logs) { counts[BLOCKS[id].key] = (counts[BLOCKS[id].key] || 0) + 1; blocks.push({ x: a, y: b, z: c, id }); }
    const extras = {};
    for (const [a, b, c, id] of tree.leaves) {
      if (blocks.length < 360) blocks.push({ x: a, y: b, z: c, id });
      // the sapling of the tree it came from, so every kind can be grown back
      if (Math.random() < 0.05) { const sp = BLOCKS[id].sapling || 'sapling'; extras[sp] = (extras[sp] || 0) + 1; }
      if (id === B.leaves && Math.random() < 0.02) extras.apple = (extras.apple || 0) + 1;
      if (Math.random() < 0.015) extras.stick = (extras.stick || 0) + 1;
    }
    for (const [a, b, c] of tree.logs) w.setBlock(a, b, c, 0, 0, { quiet: true });
    for (const [a, b, c] of tree.leaves) w.setBlock(a, b, c, 0, 0, { quiet: true });
    for (const ch of w.meshSet) w.urgent.add(ch);
    const drops = [];
    for (const [k, n] of Object.entries(counts)) { let left = n; while (left > 0) { const s = Math.min(64, left); drops.push(mkStack(k, s)); left -= s; } }
    for (const [k, n] of Object.entries(extras)) drops.push(mkStack(k, n));
    const dirYaw = Math.atan2(-(x + 0.5 - p.x), -(z + 0.5 - p.z)); // fall away from the chopper
    g.fellTree(blocks, [x, y, z], dirYaw, drops);
    g.sfx.material('wood', 'break');
    this.wearHeld(Math.ceil(tree.logs.length / 2));
    p.stats.blocksMined += tree.logs.length;
    this.toast('Timber! ' + tree.logs.length + ' logs', 'good');
  }

  attackEntity(e) {
    const g = this.g, p = this.player;
    this.swingArm();
    if (e.isVehicle) { e.hurt(1, { attacker: this }); return; }
    if (p.attackCd > 0) return;
    const tool = this.heldTool();
    let dmg = tool ? tool.damage : 1;
    const crit = (!p.onGround && p.vy < 0) || !!(this._luckyCrit && this._luckyCrit());   // (0.9.0.25) Keen Edge: now and then on your feet too
    if (crit) dmg = Math.ceil(dmg * 1.5);
    const element = tool ? tool.element : undefined;
    // where the blow lands (for taking limbs off) and what it was struck with
    const [ldx, ldy, ldz] = p.look();
    const dealt = e.hurt(dmg, { attacker: this, element, knock: 5, tool: tool ? tool.type : null, weapon: p.inv.held ? p.inv.held.id : null, ray: [p.x, p.y + p.eye, p.z, ldx, ldy, ldz] });
    p.attackCd = tool && tool.type === 'sword' ? 0.45 : 0.6;
    if (dealt > 0) {
      g.sfx.play(crit ? 'crit' : 'hit');
      this.floatText(e.x, e.y + e.h + 0.2, e.z, (crit ? '✦' : '') + Math.round(dealt * 10) / 10, element === 'fire' ? '#ffb070' : element === 'frost' ? '#9fe8ff' : crit ? '#ffe07a' : '#ffffff');
      if (element === 'frost') g.sfx.play('frost');
      this.wearHeld(tool ? (tool.type === 'sword' ? 1 : 2) : 0);
      g.burst(e.x, e.y + e.h * 0.6, e.z, element === 'fire' ? 'fireball' : element === 'frost' ? 'frost_bolt' : 'white', crit ? 8 : 4, 0.8);
      if (crit && typeof critStars === 'function') critStars(g, e);
    }
  }

  useOffhand(repeat, inp) {
    const inv = this.player.inv, sel = inv.selected, main = inv.main.slots[sel];
    inv.main.slots[sel] = inv.offhand; inv.offhand = null;
    try { this.use(repeat, inp, true); }
    finally { inv.offhand = inv.main.slots[sel]; inv.main.slots[sel] = main; }
  }
  use(repeat, inp, fromOff) {
    const g = this.g, p = this.player, w = g.world;
    const hit = this.target;
    const held = p.inv.held;
    const def = held ? itemDef(held.id) : null;
    // Carry On: sneak + use with an empty hand picks up containers, stations and animals.
    if (!fromOff && !repeat && this.targetEnt && this.targetEnt.isBoat && !p.sneaking && !this.riding) { this.targetEnt.mount(this); return; }
    if (!fromOff && !repeat && this.targetEnt && this.targetEnt.isCart && !p.sneaking && this.targetEnt.use(this, held, def)) return;
    if (!fromOff && !repeat && this.targetEnt && this.useOnAnimal(this.targetEnt, held, def)) return;
    if (!fromOff && !repeat && p.sneaking && !held) {
      if (this.targetEnt && this.targetEnt.T && this.targetEnt.T.carry && this.targetEnt.alive) { this.pickUpMob(this.targetEnt); return; }
      if (hit && BLOCKS[hit.id].carry) { this.pickUpBlock(hit.x, hit.y, hit.z); return; }
    }
    if (hit && !repeat && !fromOff) {
      const b = BLOCKS[hit.id];
      // ground storage and placed backpacks
      if (b.pile) { this.usePile(hit, held); return; }
      if (b.placedBackpack) {
        if (p.sneaking && !held) { this.pickUpBackpackBlock(hit.x, hit.y, hit.z); return; }
        this.openInventory('container', { pos: [hit.x, hit.y, hit.z] }); return;
      }
      const sneakPlace = p.sneaking && def && (def.block || def.backpack);
      if (!sneakPlace) {
        if (this.useBlockAt(hit, held, def)) return;
        if (b.container) { this.swingArm(); g.sfx.play('chest'); this.openInventory('container', { pos: [hit.x, hit.y, hit.z] }); return; }
        if (b.table) { this.swingArm(); this.openInventory('table'); return; }
        if (b.furnace) { this.swingArm(); this.openInventory('furnace', { pos: [hit.x, hit.y, hit.z] }); return; }
        if (b.harvest) {
          this.swingArm(); g.sfx.material('grass', 'dig');
          g.dropItem(mkStack(b.harvest, 2 + (Math.random() < 0.5 ? 1 : 0)), hit.x + 0.5, hit.y + 0.6, hit.z + 0.5, true);
          w.setBlock(hit.x, hit.y, hit.z, B.berry_bush_empty);
          return;
        }
      }
    }
    // Nothing useful in the main hand: the off hand acts (place a torch while holding a pickaxe).
    if ((!held || (def && !itemHasUse(def))) && p.inv.offhand && !fromOff) { this.useOffhand(repeat, inp); return; }
    if (!held || !def) return;
    if (repeat && !def.block) return;
    // Sneak + use with an item that isn't a block sets it down on the ground.
    if (!repeat && p.sneaking && hit && hit.ny === 1 && !def.block) {
      if (def.backpack) { this.placeBackpack(hit, held); return; }
      if (this.putDown(hit, held)) return;
    }
    if (def.drink === 'milk') { this.drinkMilk(held); return; }
    if (def.heartCrystal) {
      if (repeat) return;
      if (p.heartCrystals >= 10) { this.toast('You can\'t hold any more hearts', ''); return; }
      p.heartCrystals++; p.recalcMax(); p.heal(2);
      held.n--; if (held.n <= 0) p.inv.held = null;
      g.sfx.play('levelup'); this.toast('One more heart — ' + p.maxHealth / 2 + ' in all', 'epic'); this.swingArm();
      return;
    }
    if (def.plants && hit && this.plantItem(def, hit, held)) return;
    if (def.food) {
      if (p.health >= p.maxHealth) { if (!repeat && !def.block) this.toast('You are already at full health', ''); if (!def.block) return; }
      else if ((p.foodCd || 0) > 0) { if (!repeat && !this._chewTip) { this._chewTip = true; this.toast('Still chewing — food heals over a few seconds', ''); } return; }
      else {
      p._eating = true; let healed; try { healed = p.heal(def.food.heal); } finally { p._eating = false; }
      held.n--; if (held.n <= 0) p.inv.held = null;
      p.eatAnim = 0.45; g.sfx.play('eat'); setTimeout(() => g.sfx.play('heal'), 260);
      const lv = p.look();
      g.burst(p.x + lv[0] * 0.4, p.y + p.eye - 0.25, p.z + lv[2] * 0.4, def.icon, 8, 0.6);
      this.floatText(p.x + lv[0] * 1.2, p.y + p.eye + 0.1, p.z + lv[2] * 1.2, '+' + healed / 2 + ' ♥', '#ff8a8a');
      if (def.bowl || def.returns) { const bw = mkStack(def.returns || 'bowl', 1); if (!p.inv.held) p.inv.held = bw; else this.give(bw); }
      return;
      }
    }
    if (def.backpack) { this.openInventory('container', { held: true }); return; }
    if (def.bucket) { if (!this.bucketWaterlog(def, held)) this.useBucket(def, held); return; }
    if (def.igniter === 'flint') { this.useFlint(hit, held); return; }
    if (def.boat) { this.placeBoat(def, held); return; }
    if (def.cart) { if (!repeat) this.placeCartItem(def, held, hit); return; }
    if (def.bonemeal && hit) { this.useBonemeal(hit, held); return; }
    if (def.igniter) {
      if (hit && tryIgnitePortal(w, hit, 'ember')) { g.sfx.play('portal'); this.toast('The portal roars open', 'boss'); this.swingArm(); }
      else if (!repeat) this.toast('Use the igniter on the inside of an obsidian frame (at least 2 wide, 3 tall)', '');
      return;
    }
    if (def.pocketKey) { g.travelPocket(this); return; }
    if (def.summon) {
      if (!hit || hit.ny !== 1) { this.toast('Place the effigy on top of a block', ''); return; }
      if (g.entities.some(e => e.type === 'cinder_golem' && e.alive)) { this.toast('A Cinder Golem already walks this world', 'boss'); return; }
      if (g.dim === DIM.OVERWORLD && g.env && g.env.day > 0.45) { this.toast('The effigy lies cold. It only stirs at night', ''); return; }   // (0.9.0.24) as it says
      held.n--; if (held.n <= 0) p.inv.held = null;
      g.summonGolem(hit.x + 0.5, hit.y + 1, hit.z + 0.5, this);
      return;
    }
    if (def.cape) {
      const cur = p.inv.cape.slots[0];
      p.inv.cape.slots[0] = held; p.inv.held = cur;
      g.sfx.play('equip'); this.toast('Wearing ' + def.name, 'good');
      return;
    }
    if (def.armor) {
      const slot = def.armor.slot, cur = p.inv.armor.slots[slot];
      p.inv.armor.slots[slot] = held; p.inv.held = cur;
      g.sfx.play('equip'); this.toast('Equipped ' + def.name, 'good');
      return;
    }
    if (def.block && hit) this.placeBlock(hit, def, held);
  }

  // Where a placed block would go when using on face `hit`.
  placeTarget(hit) {
    let x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
    if (T_REPLACEABLE[hit.id] && !T_LIQUID[hit.id]) { x = hit.x; y = hit.y; z = hit.z; }
    return [x, y, z];
  }
  blockedByBody(x, y, z) {
    const hitsBox = (e) => x + 1 > e.x - e.w && x < e.x + e.w && y + 1 > e.y && y < e.y + e.h && z + 1 > e.z - e.w && z < e.z + e.w;
    for (const l of this.g.pawns()) if (!l.dead && hitsBox({ x: l.x, y: l.y, z: l.z, w: PLAYER_W, h: PLAYER_H })) return true;
    for (const e of this.g.entities) if (e instanceof Mob && e.alive && hitsBox(e)) return true;
    return false;
  }
  facingMeta() {
    const p = this.player;
    const f = [-Math.sin(p.yaw), -Math.cos(p.yaw)];
    return Math.abs(f[0]) > Math.abs(f[1]) ? (f[0] > 0 ? 3 : 1) : (f[1] > 0 ? 2 : 0);
  }
  // ---- Carry On ------------------------------------------------------------------------
  pickUpBlock(x, y, z) {
    const g = this.g, w = g.world, p = this.player;
    const id = w.getBlock(x, y, z), meta = w.getMeta(x, y, z);
    const ent = cloneStack(w.getEntity(x, y, z));
    p.carrying = { kind: 'block', id: id === B.lit_furnace ? B.furnace : id, key: BLOCKS[id === B.lit_furnace ? B.furnace : id].key, meta, ent };
    w.setBlock(x, y, z, 0, 0, { keepEntity: false });
    g.entityChanged(x, y, z);
    g.sfx.material(BLOCKS[id].sound || 'wood', 'place'); this.swingArm();
    this.toast('Carrying ' + BLOCKS[id].name + ' — use to set it down', 'good');
  }
  pickUpMob(m) {
    const g = this.g, p = this.player;
    p.carrying = { kind: 'mob', type: m.type, hp: m.health, stag: m.stag, color: m.color, sheared: m.sheared, baby: m.baby ? m.growT : 0, variant: m.variant || null };
    if (m.ghost) g.net && g.net.sendRemoveEntity(m.id);
    m.remove = true;
    g.sfx.play(m.type === 'boar' ? 'boar' : 'pop'); this.swingArm();
    this.toast('Carrying a ' + m.type + ' — use to set it down', 'good');
  }
  placeCarried() {
    const g = this.g, w = g.world, p = this.player, c = p.carrying;
    const hit = this.target;
    if (!hit) { this.toast('Look at the ground to set it down', ''); return; }
    const [x, y, z] = this.placeTarget(hit);
    if (!T_REPLACEABLE[w.getBlock(x, y, z)] || y < 0 || y >= CH) return;
    if (c.kind === 'block') {
      if (this.blockedByBody(x, y, z)) return;
      const key = c.key || BLOCKS[c.id].key;
      const bid = B[key] ?? c.id;
      w.setBlock(x, y, z, bid, BLOCKS[bid].tex && BLOCKS[bid].tex.front ? this.facingMeta() : c.meta || 0);
      if (c.ent) { w.setEntity(x, y, z, c.ent); g.entityChanged(x, y, z); }
      g.sfx.material(BLOCKS[bid].sound, 'place');
    } else {
      const m = new Mob(g, c.type, x + 0.5, y, z + 0.5);
      if (c.hp) m.health = c.hp; m.stag = !!c.stag; m.yaw = p.yaw;
      if (c.color) m.color = c.color; m.sheared = !!c.sheared; if (c.baby) { m.makeBaby(); m.growT = c.baby; }
      if (c.variant) m.variant = c.variant;
      if (m.T.farm) m.kept = true;
      g.addEntity(m);
      g.sfx.play('pop');
    }
    p.carrying = null;
    this.swingArm();
  }

  // ---- ground storage: set any item down ---------------------------------------------
  putDown(hit, held) {
    const g = this.g, w = g.world, p = this.player;
    const x = hit.x, y = hit.y + 1, z = hit.z;
    if (!T_SOLID[hit.id]) return false;
    const cur = w.getBlock(x, y, z);
    if (cur !== 0 && !(T_REPLACEABLE[cur] && !T_LIQUID[cur])) return false;
    w.setBlock(x, y, z, B.item_pile);
    // where you point, turned the way you face (like Vintage Story's ground storage)
    const items = [null, null, null, null], rot = [0, 0, 0, 0], q = Math.max(0, this.targetQuarter());
    items[q] = held; rot[q] = Math.round(-p.yaw / (Math.PI / 8)) * (Math.PI / 8);
    w.setEntity(x, y, z, { type: 'pile', items, rot });
    g.entityChanged(x, y, z);
    p.inv.held = null;
    this.swingArm(); g.sfx.material('wood', 'place');
    return true;
  }
  usePile(hit, held) {
    const g = this.g, w = g.world, p = this.player;
    const e = w.getEntity(hit.x, hit.y, hit.z);
    if (!e) { w.setBlock(hit.x, hit.y, hit.z, 0); return; }
    if (held && p.sneaking) {
      // add to the pile: the spot you point at first, then merge or take any free spot
      const q = this.targetQuarter(), here = q >= 0 ? e.items[q] : undefined;
      e.rot = e.rot || [0, 0, 0, 0];
      if (q >= 0 && here && canMerge(here, held) && here.n < maxStackOf(here.id)) { const k = Math.min(maxStackOf(here.id) - here.n, held.n); here.n += k; held.n -= k; if (!held.n) p.inv.held = null; g.entityChanged(hit.x, hit.y, hit.z); this.swingArm(); g.sfx.material('wood', 'place'); return; }
      if (q >= 0 && !here) { e.items[q] = held; e.rot[q] = Math.round(-p.yaw / (Math.PI / 8)) * (Math.PI / 8); p.inv.held = null; g.entityChanged(hit.x, hit.y, hit.z); this.swingArm(); g.sfx.material('wood', 'place'); return; }
      for (let i = 0; i < 4; i++) {
        const s = e.items[i];
        if (s && canMerge(s, held) && s.n < maxStackOf(s.id)) { const k = Math.min(maxStackOf(s.id) - s.n, held.n); s.n += k; held.n -= k; if (!held.n) p.inv.held = null; g.entityChanged(hit.x, hit.y, hit.z); this.swingArm(); return; }
      }
      const free = e.items.findIndex(s => !s);
      if (free >= 0) { e.items[free] = held; p.inv.held = null; g.entityChanged(hit.x, hit.y, hit.z); this.swingArm(); g.sfx.material('wood', 'place'); }
      else this.toast('This pile is full', '');
      return;
    }
    // take back the stack you point at (or the most recent one)
    const tq = this.targetQuarter();
    for (const i of (tq >= 0 && e.items[tq] ? [tq] : [3, 2, 1, 0])) {
      if (e.items[i]) {
        const s = e.items[i]; e.items[i] = null;
        const left = this.give(s);
        if (left > 0) { s.n = left; e.items[i] = s; this.toast('No room to pick that up', 'warn'); }
        break;
      }
    }
    if (!e.items.some(Boolean)) w.setBlock(hit.x, hit.y, hit.z, 0);
    g.entityChanged(hit.x, hit.y, hit.z);
    this.swingArm();
  }
  placeBackpack(hit, held) {
    const g = this.g, w = g.world, p = this.player;
    const x = hit.x, y = hit.y + 1, z = hit.z;
    if (!T_REPLACEABLE[w.getBlock(x, y, z)]) return;
    w.setBlock(x, y, z, B.backpack_block);
    w.setEntity(x, y, z, { type: 'backpack', stack: held, yaw: p.yaw });
    g.entityChanged(x, y, z);
    p.inv.held = null;
    this.swingArm(); g.sfx.material('wool', 'place');
  }
  pickUpBackpackBlock(x, y, z) {
    const g = this.g, w = g.world, p = this.player;
    const e = w.getEntity(x, y, z);
    const st = e && e.stack ? e.stack : mkStack('leather_backpack', 1);
    if (!p.inv.held) p.inv.held = st; else if (p.inv.add(st) > 0) { this.toast('No room for the backpack', 'warn'); return; }
    w.setBlock(x, y, z, 0);
    g.entityChanged(x, y, z);
    g.sfx.material('wool', 'break'); this.swingArm();
  }

  useBucket(def, held) {
    const g = this.g, p = this.player, w = g.world;
    const [dx, dy, dz] = p.look();
    if (def.bucket === 'empty') {
      const hit = raycastBlocks(w, p.x, p.y + p.eye, p.z, dx, dy, dz, REACH, true);
      if (!hit || !T_LIQUID[hit.id]) return;
      if ((w.getMeta(hit.x, hit.y, hit.z) & 15) !== 0) return;
      w.setBlock(hit.x, hit.y, hit.z, 0);
      const full = mkStack(T_LIQUID[hit.id] === 1 ? 'water_bucket' : 'lava_bucket', 1);
      held.n--; if (held.n <= 0) p.inv.held = full; else if (p.inv.add(full) > 0) g.dropItem(full, p.x, p.y + 1, p.z, false);
      g.sfx.play('bucket'); this.swingArm();
      return;
    }
    const hit = this.target;
    if (!hit) return;
    if (def.bucket === 'water' && tryIgnitePortal(w, hit, 'sky')) {
      p.inv.held = mkStack('bucket', 1); g.sfx.play('portal'); this.toast('Light pours through — the Skylands await', 'rare'); return;
    }
    const [x, y, z] = this.placeTarget(hit);
    const cur = w.getBlock(x, y, z);
    if (!T_REPLACEABLE[cur] && cur !== 0) return;
    if (def.bucket === 'water' && g.dim === 1) { g.sfx.play('fizz'); g.burst(x + 0.5, y + 0.5, z + 0.5, 'white', 10, 0.6, 0.1); p.inv.held = mkStack('bucket', 1); return; }
    w.setBlock(x, y, z, def.bucket === 'water' ? B.water : B.lava, 0);
    p.inv.held = mkStack('bucket', 1);
    g.sfx.play('bucket'); this.swingArm();
  }
  dropHeld(all) {
    const p = this.player, s = p.inv.held;
    if (!s) return;
    const n = all ? s.n : 1;
    const out = Object.assign(cloneStack(s), { n });
    s.n -= n; if (s.n <= 0) p.inv.held = null;
    this.throwStack(out);
  }
  throwStack(stack) {
    const p = this.player, [dx, dy, dz] = p.look();
    this.g.dropItem(stack, p.x + dx * 0.4, p.y + p.eye - 0.3, p.z + dz * 0.4, false, 0, [dx * 6, dy * 6 + 1.5, dz * 6], 1.5);
    this.swingArm();
  }

  // Middle click: find this block in the bag and put it in hand (creative: take one).
  pickBlock(hit) {
    const p = this.player, inv = p.inv;
    const b = BLOCKS[hit.id];
    let key = itemDef(b.key) ? b.key : (b.drop && itemDef(b.drop) ? b.drop : null);
    if (b.unlit) key = b.unlit;
    if (b.key === 'lit_furnace') key = 'furnace';
    if (!key) return;
    const hot = inv.main.slots.findIndex((s, i) => i < 9 && s && s.id === key);
    if (hot >= 0) { inv.selected = hot; return; }
    const at = inv.main.slots.findIndex(s => s && s.id === key);
    if (at >= 0) { const t = inv.main.slots[inv.selected]; inv.main.slots[inv.selected] = inv.main.slots[at]; inv.main.slots[at] = t; this.g.sfx.play('click'); return; }
    if (this.g.creative) {
      const free = inv.main.slots.findIndex((s, i) => i < 9 && !s);
      if (free >= 0) inv.selected = free;
      inv.held = mkStack(key, maxStackOf(key));
    }
  }

  // ---- screens ---------------------------------------------------------------------------
  openInventory(mode = 'inventory', opts = {}) {
    if (this.mode !== 'play') return;
    this.mode = 'inv'; this.mining = null;
    if (this.useKb) this.g.input.releaseLock(true);
    this.inv.open(mode, opts);
  }
  closeInventory() {
    this.inv.close();
    this.mode = 'play';
    if (this.useKb && !this.g.input.touchMode && this.g.state === 'playing') this.g.input.requestLock();
  }

  // ---- death ----------------------------------------------------------------------------
  die(src) {
    const g = this.g, p = this.player;
    p.dead = true; p.stats.deaths++;
    g.sfx.play('death');
    const causes = { drown: 'You drowned', fall: 'You fell from a high place', lava: 'You tried to swim in lava', burn: 'You burned to death', void: 'You fell out of the world', cactus: 'You hugged a cactus', projectile: 'You were struck by a fireball' };
    let cause = causes[src.type] || 'You died';
    if (src.attacker && src.attacker.type) cause = 'You were slain by ' + (src.attacker.type === 'cinder_golem' ? 'the Cinder Golem' : (src.attacker.T && src.attacker.T.label) || 'a ' + src.attacker.type.replace(/_/g, ' '));
    else if (src.type === 'arrow') cause = 'You were shot';
    else if (src.type === 'explosion') cause = 'You were blown up';
    const rules = g.rules();
    if (!rules.keepInventory) {
      const all = [...p.inv.main.slots, ...p.inv.armor.slots, ...p.inv.back.slots, ...p.inv.off.slots, ...p.inv.hook.slots, ...p.inv.charm.slots].filter(s => s && s.id !== 'death_compass');
      // into a grave (with a compass that finds it), or scattered where you fell
      const grave = rules.graves && !g.isGuest ? g.makeGrave(this, all.map(cloneStack)) : null;
      if (grave) p.grave = grave;
      else for (const s of all) g.dropItem(cloneStack(s), p.x, p.y + 1, p.z, true, 6);
      for (const c of [p.inv.main, p.inv.armor, p.inv.back, p.inv.off, p.inv.hook, p.inv.charm]) c.slots.fill(null);
      if (grave) p.inv.main.slots[0] = mkStack('death_compass', 1);
      p.xp = 0;
    }
    if (p.carrying) { this.dropCarried(); }
    if (this.mode === 'inv') this.closeInventory();
    this.mode = 'dead'; this.mining = null;
    if (this.useKb) g.input.releaseLock(true);
    this.hud.showDeath(cause, p.level);
    g.saveSoon();
  }
  dropCarried() {
    const g = this.g, p = this.player, c = p.carrying;
    if (c.kind === 'block') {
      g.dropItem(mkStack(c.key || BLOCKS[c.id].key, 1), p.x, p.y + 1, p.z, true);
      if (c.ent) g.spillEntity(c.ent, Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));
    } else {
      const m = new Mob(g, c.type, p.x, p.y, p.z); if (c.hp) m.health = c.hp; g.addEntity(m);
    }
    p.carrying = null;
  }
  async respawn() {
    const g = this.g, p = this.player;
    p.dead = false; p.health = p.maxHealth; p.burn = 0; p.invuln = 2; p.fallStart = null;
    this.hud.hideDeath();
    this.mode = 'play';
    // back to your bed, if it's still there
    if (p.spawn && (p.spawnDim || 0) === g.dim) {
      const [bx, by, bz] = p.spawn, w = g.world;
      for (const [cx, cz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) w.ensureChunk((Math.floor(bx) >> 4) + cx, (Math.floor(bz) >> 4) + cz);
      if (BLOCKS[w.getBlock(Math.floor(bx), Math.floor(by), Math.floor(bz))].bed) {
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [0, 0]]) {
          const x = Math.floor(bx) + dx, z = Math.floor(bz) + dz, y = Math.floor(by);
          if (!collides(w, x + 0.2, y, z + 0.2, x + 0.8, y + 1.8, z + 0.8) && T_SOLID[w.getBlock(x, y - 1, z)]) { p.x = x + 0.5; p.y = y; p.z = z + 0.5; p.vx = p.vy = p.vz = 0; if (this.useKb && !g.input.touchMode) g.input.requestLock(); return; }
        }
        p.x = bx; p.y = by + 0.6; p.z = bz; return;
      }
      this.toast('Your bed was missing or blocked', 'warn'); p.spawn = null;
    }
    if (g.dim !== DIM.OVERWORLD) {
      // the whole party goes home only if everyone is down or alone
      if (g.locals.length === 1 && !g.net) { await g.changeDimension(DIM.OVERWORLD, () => g.placeAtSpawn(p, false)); return; }
      g.placeNear(p, g.locals.find(l => l !== this && !l.dead) || null);
    } else g.placeAtSpawn(p, false);
    if (this.useKb && !g.input.touchMode) g.input.requestLock();
  }

  // ---- camera & first-person view ------------------------------------------------------
  camera(dt) {
    const g = this.g, p = this.player;
    let bx = 0, by = 0, roll = 0;
    // (0.9.0.48) view bobbing the Minecraft way, softer: one gentle dip with each step (two to each sway, not four), a sway
    // from side to side, a touch of roll and a little nod; smooth curves all through, so no jolt as a foot lands
    let nod = 0;
    if (g.settings.viewBob && p.bobAmt > 0.01) {
      const ph = p.bob * 1.1, sn = Math.sin(ph), a = p.bobAmt;
      bx = sn * 0.03 * a; by = -sn * sn * 0.05 * a; roll = sn * 0.0055 * a; nod = sn * sn * 0.006 * a;
    }
    if (p.hurtTilt && this.g.settings.hurtTilt === false) p.hurtTilt = 0;
    if (p.hurtTilt) { roll += p.hurtTilt; p.hurtTilt *= Math.max(0, 1 - dt * 8); if (Math.abs(p.hurtTilt) < 0.002) p.hurtTilt = 0; }
    let sx = 0, sy = 0;
    if (this.shakeAmt > 0) { sx = (Math.random() - 0.5) * this.shakeAmt * 0.4; sy = (Math.random() - 0.5) * this.shakeAmt * 0.4; this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.5); }
    const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    let fov = g.settings.fov + (p.sprinting ? 6 : 0);
    if (this.spyglassOn) fov = 14; else if (this.bowPull > 0) fov -= Math.min(1, this.bowPull) * 10;
    this._fov = (this._fov || fov) + (fov - (this._fov || fov)) * Math.min(1, dt * 8);
    let ey = p.eye;
    if (this.sleeping) ey = 0.45;
    else if (this.ridingSeated()) ey = 1.0;
    // (0.9.0.48) crouching, standing and swimming move your eyes smoothly (down quickly, up a little slower), and
    // stepping up onto a slab, a path or a block, the view rises smoothly instead of snapping up
    if (this._ey === undefined || this.sleeping || this.ridingSeated() || p.dead || Math.abs(ey - this._ey) > 1.5) this._ey = ey;
    else this._ey += (ey - this._ey) * Math.min(1, dt * (ey < this._ey ? 18 : 11));
    let baseY = p.y + this._ey;
    if (this._camY !== undefined && p.onGround && !p.flying && baseY > this._camY && baseY - this._camY < 1.05 && !this.riding) baseY = this._camY + (baseY - this._camY) * Math.min(1, dt * 14);
    this._camY = baseY;
    this.cam = { x: p.x + rx * bx + sx, y: baseY + by + sy, z: p.z + rz * bx, yaw: p.yaw, pitch: p.pitch - nod, roll: p.dead ? 0.6 : roll + (this.riding ? (this.riding.heel || 0) * 0.6 : 0), fov: this._fov };
    // over the shoulder (like Hytale): behind and off to one side, smoothly following
    if (this.viewMode === 1 && !p.dead) {
      const [lx, ly, lz] = p.look(), side = this.shoulderSide || 1;
      const hx = this.cam.x, hy = p.y + (this.ridingSeated() ? 1.2 : p.eye) + 0.12, hz = this.cam.z;
      // first step out to the side (not through a wall), then back
      const sideHit = raycastBlocks(g.world, hx, hy, hz, rx * side, 0, rz * side, 0.85, false);
      const so = Math.max(0, (sideHit ? sideHit.dist : 0.75) - 0.2);
      const ox = hx + rx * side * so, oz = hz + rz * side * so;
      const backHit = raycastBlocks(g.world, ox, hy, oz, -lx, -ly, -lz, 2.9, false);
      const dist = Math.max(0.4, (backHit ? backHit.dist : 2.6) - 0.25);
      const tx = ox - lx * dist, ty = hy - ly * dist, tz = oz - lz * dist;
      const k = this._shoulderCam ? Math.min(1, dt * 14) : 1;
      const c = this._shoulderCam = this._shoulderCam || { x: tx, y: ty, z: tz };
      c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.z += (tz - c.z) * k;
      // never let the smoothing drag it into a wall
      if (backHit && Math.hypot(c.x - ox, c.y - hy, c.z - oz) > dist + 0.05) { c.x = tx; c.y = ty; c.z = tz; }
      this.cam.x = c.x; this.cam.y = c.y; this.cam.z = c.z; this.cam.roll = 0;
      return this.cam;
    }
    this._shoulderCam = null;
    // third person (F5): pull the camera back (or round to the front), stopping short of walls
    if (this.viewMode && !p.dead) {
      const front = this.viewMode === 3;
      const [lx, ly, lz] = p.look();
      const d = front ? 1 : -1, hx = this.cam.x, hy = p.y + (this.ridingSeated() ? 1.2 : p.eye), hz = this.cam.z;
      const hit = raycastBlocks(g.world, hx, hy, hz, lx * d, ly * d, lz * d, 4.2, false);
      // (0.9.0.21) pulled in at once when a wall comes between, eased back out after
      const want = Math.max(0.6, (hit ? hit.dist : 4) - 0.25);
      const dist = this._tpDist = Math.min(want, (this._tpDist ?? want) + (want - (this._tpDist ?? want)) * Math.min(1, dt * 5));
      this.cam.x = hx + lx * d * dist; this.cam.y = hy + ly * d * dist; this.cam.z = hz + lz * d * dist;
      if (front) { this.cam.yaw = p.yaw + Math.PI; this.cam.pitch = -p.pitch; }
      this.cam.roll = 0;
    }
    return this.cam;
  }
  handState() {
    const g = this.g, p = this.player, gl = g.renderer.gl;
    if (p.dead) return null;
    const held = p.inv.held;
    const key = p.carrying ? 'carry' : held ? held.id : null;
    if (key !== p.lastHeldKey) { p.equip = 0; p.lastHeldKey = key; }
    const draws = [];
    this._tips = [];
    const swing = p.swing;
    const s1 = Math.sin(swing * Math.PI), s2 = Math.sin(Math.sqrt(swing) * Math.PI);
    const eq = 1 - p.equip;
    const bob = g.settings.viewBob ? p.bobAmt : 0;
    // what you hold lags a little behind when you turn, and swings back
    let sx0 = 0, sy0 = 0;
    if (g.settings.heldSway !== false) {
      const dyaw = ((p.yaw - (this._hy ?? p.yaw) + Math.PI * 3) % TAU) - Math.PI, dpit = p.pitch - (this._hp ?? p.pitch);
      this._hy = p.yaw; this._hp = p.pitch;
      this._hsx = ((this._hsx || 0) + clamp(dyaw, -0.2, 0.2) * 0.5) * 0.85; this._hsy = ((this._hsy || 0) - clamp(dpit, -0.2, 0.2) * 0.5) * 0.85;
      sx0 = clamp(this._hsx, -0.08, 0.08); sy0 = clamp(this._hsy, -0.06, 0.06);
    }
    const hsn = Math.sin(p.bob * 1.1), bx = hsn * 0.025 * bob + sx0, by = -hsn * hsn * 0.03 * bob + sy0;   // (0.9.0.48) in step with the view, as smooth
    const eat = p.eatAnim > 0 ? Math.sin(Math.min(1, p.eatAnim / 0.45) * Math.PI) : 0;
    const base = () => {
      const m = Mat4.create();
      Mat4.translate(m, 0.52 + bx - s2 * 0.28 - eat * 0.3, -0.5 + by - eq * 0.55 + Math.sin(Math.sqrt(swing) * TAU) * 0.12 + eat * 0.18, -0.72 - s1 * 0.18 + eat * 0.12);
      return m;
    };
    const l = g.world.getLight(Math.floor(p.x), Math.floor(p.y + p.eye), Math.floor(p.z));
    const light = [(l >> 4) / 15, Math.max(l & 15, this.carriedLevel()) / 15];
    const skin = this.skin && this.skin.ready ? this.skin : null;
    const arm = (m, side) => {
      if (skin) { const am = Mat4.create(); am.set(m); Mat4.translate(am, 0, 0.3, 0); const ch = p.inv.armor.slots[1]; fpArmDraws(draws, gl, skin, side, am, ch ? (ch.col ? ch.id + '#' + ch.col.slice(1) : ch.id) : null); }
      else for (const part of MODELS.player_arm.parts) draws.push({ mesh: part.mesh, m });
    };
    if (p.hang || p.climb) {
      // hanging from a ledge (or hauling yourself up): both hands up on the edge in front of you
      const k = p.climb ? Math.min(1, p.climb.t / 0.55) : 0;
      for (const side of [-1, 1]) {
        // arms come up from the lower corners, hands gripping the edge just above your eyes
        const a = Mat4.create();
        Mat4.translate(a, side * 0.42, -0.2 - k * 0.35 + Math.sin(g.time * 2 + side) * 0.008, -0.38);
        Mat4.rotateZ(a, -side * (0.35 - k * 0.2)); Mat4.rotateX(a, Math.PI - 0.15 - k * 0.9);
        arm(a, side);
      }
      return { draws, light };
    }
    if (p.carrying) {
      // Carry On: whatever you hold sits in both arms in front of you
      const c = p.carrying;
      const m = Mat4.create();
      Mat4.translate(m, 0 + bx, -0.62 + by - eq * 0.5, -0.95);
      if (c.kind === 'block') {
        const im = itemMesh(gl, c.key || BLOCKS[c.id].key);
        const bm = Mat4.create(); bm.set(m); Mat4.rotateY(bm, 0.1); Mat4.scale(bm, 0.62, 0.62, 0.62);
        draws.push({ mesh: im.mesh, m: bm });
      } else {
        const M = MODELS[c.variant || MOB_TYPES[c.type].model];
        const sc = MOB_TYPES[c.type].carryScale || (c.type === 'deer' ? 0.45 : c.type === 'rabbit' ? 1 : 0.7);
        const pm = Mat4.create(); pm.set(m); Mat4.translate(pm, 0, -0.25, 0); Mat4.scale(pm, sc, sc, sc); Mat4.rotateY(pm, Math.PI / 2);
        for (const d of modelStillDraws(M, pm, { stag: c.stag })) draws.push(d);
      }
      for (const side of [-1, 1]) {
        const a = Mat4.create(); Mat4.translate(a, side * 0.5 + bx, -0.5 + by - eq * 0.5, -0.62); Mat4.rotateY(a, side * 0.28); Mat4.rotateX(a, 1.72);
        arm(a, side);
      }
      return { draws, light };
    }
    // Minecraft's first-person swing, turned about the fist: the item chops forward and down and
    // eases back (an empty hand punches instead).
    const mcSwing = (am, side, sp, empty) => {
      const r = Math.sqrt(sp), f = Math.sin(sp * sp * Math.PI), f1 = Math.sin(r * Math.PI), D = Math.PI / 180;
      // turn about the shoulder end, so the fist sweeps through the arc and the arm stays out of your face
      const k = empty ? -0.3 : 0.35, px = am[4] * k + am[12], py = am[5] * k + am[13], pz = am[6] * k + am[14];
      const S = Mat4.create();
      if (empty) {
        // a punch: forward and in toward the middle, up a touch, then back
        Mat4.translate(S, side * -0.3 * f1, 0.1 * Math.sin(r * TAU) + 0.05 * f1, -0.38 * Math.sin(sp * Math.PI));
      } else {
        Mat4.translate(S, side * -0.4 * f1, 0.2 * Math.sin(r * TAU), -0.2 * Math.sin(sp * Math.PI));
        Mat4.translate(S, px, py, pz);
        Mat4.rotateY(S, side * f * -20 * D); Mat4.rotateZ(S, side * f1 * -20 * D); Mat4.rotateX(S, f1 * -58 * D);
        Mat4.translate(S, -px, -py, -pz);
      }
      const out = Mat4.create(); Mat4.multiply(out, S, am); return out;
    };
    // What you hold sits in your fist, with your arm reaching in from the side to hold it (the same
    // grip as seen in third person). An empty main hand shows the forearm alone, like the classic game.
    const holdIn = (side, id, lift) => {
      const im = itemMesh(gl, id), tool = im.kind !== 'block' && isHandheld(id);
      const sw = 0, e = side > 0 ? eat : 0;
      const pitch = 1.62 + e * 0.35, yaw = side * 0.32;
      let am = Mat4.create();
      Mat4.translate(am, side * (FP_HAND.x + (side > 0 ? bx - e * 0.32 : -bx * 0.6)), FP_HAND.y + by - (side > 0 ? eq * 0.55 : eq * 0.3) + lift + (side > 0 ? e * 0.2 : Math.sin(g.time * 1.3) * 0.006), FP_HAND.z + e * 0.12);
      Mat4.rotateY(am, yaw);
      Mat4.rotateX(am, pitch);
      if (side > 0 && swing > 0) am = mcSwing(am, 1, swing, false);
      // winding back to cast a line
      if (side > 0 && this.castWind > 0) { const k = Math.sin((1 - this.castWind / 0.3) * Math.PI / 2); Mat4.translate(am, 0, 0.12 * k, 0.1 * k); Mat4.rotateX(am, -0.85 * k); }
      arm(am, side);
      // the fist, turned back to face the way you look
      const m = Mat4.create(); m.set(am);
      Mat4.translate(m, 0, 0.3 - 0.6, -0.02);
      Mat4.rotateX(m, -pitch); Mat4.rotateY(m, -yaw);
      if (im.kind === 'block' && im.torch3d) {
        // a torch: held upright in the fist like the ones on the wall, leaning a little away
        Mat4.translate(m, -side * 0.02, 0.05, -0.05);
        Mat4.rotateX(m, -0.3 - sw * 0.7); Mat4.rotateZ(m, side * 0.2); Mat4.rotateY(m, side * 0.6);
        Mat4.scale(m, 0.46, 0.46, 0.46); Mat4.translate(m, 0, 0.6, 0);
      } else if (typeof isShieldId === 'function' && isShieldId(id)) {
        // (alpha 3) a shield, held like one: upright, its face to the front; raised and brought across when you block
        const b = this._blockE || 0;
        Mat4.translate(m, side * (0.06 - 0.26 * b), 0.02 + 0.12 * b, -0.2 - 0.1 * b);
        Mat4.rotateY(m, side * (-0.35 + 0.3 * b)); Mat4.rotateX(m, 0.05 - 0.08 * b);
        Mat4.scale(m, 0.52 + 0.06 * b, 0.52 + 0.06 * b, 0.52 + 0.06 * b);
      } else if (im.kind === 'block') {
        Mat4.translate(m, -side * 0.03, 0.1, -0.06);
        Mat4.rotateX(m, -sw * 0.4); Mat4.rotateY(m, side * 0.78 - sw * 0.3); Mat4.scale(m, 0.4, 0.4, 0.4);
      } else {
        Mat4.rotateY(m, side * (-1.5 + 0.35));
        Mat4.rotateX(m, -sw * 0.9);
        Mat4.rotateZ(m, side * 0.42);
        Mat4.scale(m, 0.68, 0.68, 0.68);
        // the grip goes in the fist: the handle end of a tool, the bottom of anything else
        if (tool) Mat4.translate(m, 0.3 * side, 0.28, 0); else Mat4.translate(m, 0, 0.3, 0);
        if (side < 0) Mat4.scale(m, -1, 1, 1);
      }
      const hs = side > 0 ? p.inv.held : p.inv.offhand;
      draws.push({ mesh: im.mesh, m, noCull: im.kind !== 'block', glint: hs && (hs.en || hs.id === 'enchanted_book' || hs.id === 'experience_bottle') ? 1 : 0 });
      this.noteTip(id, m, im.kind);
    };
    const bowDraw = held && held.id === 'bow' && (this.bowPull > 0 || this.bowKick > 0) && typeof bowStage === 'function';
    if (bowDraw) {
      // both hands on the bow: held out in the left, the string drawn back with the right (game/bows.js)
      this.fpBow(draws, arm, gl, bx, by);
    } else if (held && itemDef(held.id)) holdIn(1, held.id === 'fishing_rod' && this.fishing ? 'fishing_rod_cast' : held.id, 0);
    else {
      // empty hand: the forearm reaches in from the lower right, like the classic game
      let m = Mat4.create();
      Mat4.translate(m, 0.5 + bx, -0.39 + by - eq * 0.55 - eat * 0.1, -0.5);
      Mat4.rotateY(m, 0.33);
      Mat4.rotateX(m, 1.9);
      if (swing > 0) m = mcSwing(m, 1, swing, true);
      arm(m, 1);
    }
    // the off hand, mirrored on the left
    const off = p.inv.offhand;
    if (off && itemDef(off.id)) holdIn(-1, off.id, -0.02);
    return { draws, light };
  }
  // Where the tip of a torch you hold is, in hand space, so its flame and smoke come off the right spot.
  noteTip(id, m, kind) {
    if (!FLAME_ITEMS[id]) return;
    let x = 0, y = 0.27;                                 // the 3D torch: the top of its stick
    if (kind !== 'block') { const t = iconTip(id); if (!t) return; [x, y] = t; }
    const v = [m[0] * x + m[4] * y + m[12], m[1] * x + m[5] * y + m[13], m[2] * x + m[6] * y + m[14]];
    (this._tips || (this._tips = [])).push({ id, v, t: this.g.time });
  }
  // How others see this player (split-screen partners, LAN players).
  pose() {
    const p = this.player;
    const l = this.g.world.getLight(Math.floor(p.x), Math.floor(p.y + 1), Math.floor(p.z));
    return {
      x: p.x, y: p.y - (this.ridingSeated() ? 0.45 : 0), z: p.z, yaw: p.yaw, headPitch: p.pitch * 0.8, walk: p.bob * 1.4, walkAmt: p.bobAmt, swing: p.swing, sneak: p.sneaking && !p.swimming, sit: this.ridingSeated(), sleep: !!this.sleeping, swim: p.swimming || p.crawling, swimPitch: p.swimming ? p.pitch : 0, hang: !!p.hang, climb: p.climb ? Math.min(1, p.climb.t / 0.55) : 0,
      held: p.carrying ? null : (p.inv.held ? (p.inv.held.id === 'bow' && this.bowPull > 0 ? bowStage(Math.min(1, this.bowPull)) : p.inv.held.id) : null), carry: p.carrying, light: [l >> 4, l & 15], deathT: p.dead ? 1 : 0,
      tint: p.hurtFlash > 0.5 ? [1, 0.15, 0.1, 0.4] : null, back: p.inv.back.slots[0] ? p.inv.back.slots[0].id : null,
      air: !p.onGround && !p.flying && !(p.contacts && p.contacts.water) && !this.riding, vy: p.vy, sprint: !!p.sprinting, land: this._landT || 0,
      bow: this.bowPull > 0 ? this.bowPull : 0, eat: p.eatAnim > 0 ? p.eatAnim : 0, time: this.g.time, armor: p.inv.armor.slots.map(s => s ? (s.col ? s.id + '#' + s.col.slice(1) : s.id) : null),
      off: p.inv.offhand ? p.inv.offhand.id : null, hook: p.inv.hook.slots[0] ? p.inv.hook.slots[0].id : null,
      // (0.9.0.15) out of your depth (more than a block of water): swimming, arms and legs going
      paddle: this.paddling() ? 1 : 0, swimPh: p.swimPh || 0, swimMv: Math.min(1, Math.hypot(p.vx, p.vz) / 2.2),
    };
  }
  // treading water or swimming along, upright: in water deeper than about a block, not flying, not doing the fast swim
  paddling() {
    const p = this.player, c = p.contacts;
    if (!c || !c.water || p.swimming || p.flying || p.dead || this.riding || p.hang || p.climb) return false;
    if (c.eyeWater) return true;
    const id = this.g.world.getBlock(Math.floor(p.x), Math.floor(p.y + 1.1), Math.floor(p.z));
    return T_LIQUID[id] === 1 || (!p.onGround && T_LIQUID[this.g.world.getBlock(Math.floor(p.x), Math.floor(p.y + 0.5), Math.floor(p.z))] === 1);
  }
  // ---- carried light (torch or lantern in a hand, on the belt or the backpack) ----------
  carriedLevel() { return this.player.dead ? 0 : this.player.inv.carriedLight(); }
  lightSource() {
    const lv = this.carriedLevel();
    if (!lv) return null;
    const p = this.player, t = this.g.time + this.index * 1.7;
    // torches flicker, lanterns hold steady
    const torchy = [p.inv.held, p.inv.offhand, p.inv.hook.slots[0]].some(s => s && s.id === 'torch') && lv <= 14;
    const flick = torchy ? Math.sin(t * 9.1) * 0.25 + Math.sin(t * 23.7) * 0.15 : 0;
    return [p.x, p.y + 1.25, p.z, lv + flick];
  }
}

// Items that do something when used; anything else lets the off hand act instead.
function itemHasUse(d) { return !!(d.cape || d.block || d.heartCrystal || d.cart || d.boat || d.food || d.backpack || d.bucket || d.igniter || d.pocketKey || d.summon || d.armor || d.bow || d.spyglass || d.bonemeal || d.plants || d.disc || d.bottle || d.drink); }

// Where the first-person arms sit (hand space: x right, y up, -z ahead).
const FP_HAND = { x: 0.56, y: -0.5, z: -0.72 };

// Combine two input states (e.g. keyboard + a gamepad driving the same player).
function mergeInput(a, b) {
  if (Math.hypot(b.mx, b.mz) > Math.hypot(a.mx, a.mz)) { a.mx = b.mx; a.mz = b.mz; }
  a.lookX += b.lookX; a.lookY += b.lookY; a.wheel += b.wheel;
  if (b.chat !== null && b.chat !== undefined) a.chat = b.chat;
  for (const k of ['jump', 'sneak', 'sprint', 'attack', 'attackPressed', 'use', 'usePressed', 'drop', 'dropAll', 'inventory', 'pause', 'debug', 'pick', 'swap', 'place', 'hideHud', 'screenshot', 'view',
    'padA', 'padB', 'padX', 'padY', 'padLB', 'padRB', 'padStart', 'fromPad']) a[k] = a[k] || b[k];
  if (b.navX) a.navX = b.navX; if (b.navY) a.navY = b.navY;
  if (b.slot >= 0) a.slot = b.slot;
  return a;
}
