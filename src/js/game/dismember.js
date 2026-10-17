// ---------------------------------------------------------------------------
// game/dismember.js — where a blow lands, and what it takes off.
//
// A hit is traced to the part of the creature it struck (the ray from your
// eyes for a swing, the arrow's flight for a shot). Sharp, heavy weapons are
// more likely to take a limb: an axe more than a sword, a sword more than a
// pickaxe, fists never. A ghoul without a leg crawls after you on its arms;
// a spider short of legs slows down and stops leaping; a skeleton that loses
// its bow arm drops the bow; anything that drops a weapon tries to grab it
// back with the other hand. Severed parts tumble away and lie a while.
// ---------------------------------------------------------------------------

const SEVER_CHANCE = { axe: 0.3, sword: 0.2, arrow: 0.12, explosion: 0.35, trident: 0.16, hoe: 0.08, pickaxe: 0.06, shovel: 0.04 };
const GIB_PARTICLE = { skeleton: 'skel_bone', slime: 'slime_skin', cinder_golem: 'golem_rock', fuseling: 'fuse_moss' };

Object.assign(Mob.prototype, {
  // Work out the pose right now (the creature may not have been drawn this frame).
  poseNow() {
    const M = MODELS[this.T.model];
    if (!M || !M.def.rig) return null;
    const base = Mat4.create();
    if (this.baby) Mat4.scale(base, 0.55, 0.55, 0.55);
    Mat4.rotateY(base, this.yaw);
    this.orient(base);
    rigMatrices(this, M, base);
    return M;
  },
  // Which part did this blow land on? Falls back to a guess from height if there's no ray.
  hitPart(src) {
    const M = this.poseNow();
    if (!M) return null;
    if (src.ray) { const r = src.ray; const part = rigHitPart(this, r[0], r[1], r[2], r[3], r[4], r[5]); if (part) return part; }
    const parts = M.parts.filter(p => p.limb && this._mats[p.name]);
    return parts.length ? parts[Math.floor(Math.random() * parts.length)] : null;
  },
  tryDismember(src, dealt) {
    if (!dealt || this.ghost || this.T.noSever) return;
    const kind = src.type === 'explosion' ? 'explosion' : src.tool;
    let ch = SEVER_CHANCE[kind] || 0;
    if (!ch) return;
    const part = this.hitPart(src);
    if (!part || !part.limb) return;
    ch *= clamp(dealt / 4, 0.5, 1.6) * (this.T.sever ?? 1);
    if (part.limb === 'head') { if (this.health > this.maxHealth * 0.4) return; ch *= 0.5; }
    if (this.lost && this.lost.size >= 4) return;
    if (Math.random() > ch) return;
    this.sever(part, src);
  },
  sever(part, src) {
    const g = this.game;
    this.lost = this.lost || new Set();
    // the part and everything hanging from it
    const M = MODELS[this.T.model], gone = [part.name];
    for (const p of M.parts) if (p.parent && gone.includes(p.parent)) gone.push(p.name);
    const mats = this._mats;
    for (const name of gone) {
      const p = M.parts.find(q => q.name === name), m = mats && mats[name];
      if (p && m) g.addEntity(new Gib(g, this, p, m));
      this.lost.add(name);
    }
    const tex = GIB_PARTICLE[this.type] || 'blood_particle';
    g.burst(this.x, this.y + this.h * 0.55, this.z, tex, 10, 0.8);
    g.sfx.playAt(this.type === 'skeleton' ? 'rattle' : 'hit', this.x, this.y, this.z);
    if (src.attacker && src.attacker.floatText) src.attacker.floatText(this.x, this.y + this.h + 0.5, this.z, 'Severed!', '#ff9a7a');
    // what losing it means
    const L = part.limb;
    if (L === 'head') { if (this.health > 0) { this.health = 0; this.die(src); } return; }
    if (/^leg[LR]$/.test(L) && M.def.rig === 'biped') { this.crawling = true; this.h = Math.min(this.h, 0.8); }
    if (/^leg[FB][LR]$/.test(L)) this.limp = (this.limp || 0) + 1;
    if (/^wing/.test(L)) this.T = Object.assign({}, this.T, { floaty: false });
    if (L === 'armR' && this.heldItem) this.dropWeapon('heldItem');
    if (L === 'armL' && this.offItem) this.dropWeapon('offItem');
  },
  // Let go of a weapon; with a hand still free, the creature will try to pick it back up.
  dropWeapon(slot) {
    const g = this.game, id = this[slot];
    this[slot] = null;
    if (!id) return;
    const it = g.dropItem(mkStack(id, 1), this.x, this.y + 1, this.z, true);
    if (!this.lost.has('armL') && !this.lost.has('foreL') && this.T.regrab !== false) this.regrab = { id, item: it || null, t: 8 };
  },
  // Going after a dropped weapon. Returns a move, or null when there's nothing to fetch.
  fetchWeapon(dt) {
    const r = this.regrab;
    if (!r) return null;
    r.t -= dt;
    let it = r.item;
    if (!it || it.remove) it = r.item = this.game.entities.find(e => e instanceof DroppedItem && !e.remove && e.stack && e.stack.id === r.id && Math.hypot(e.x - this.x, e.z - this.z) < 8) || null;
    if (!it || r.t <= 0) { this.regrab = null; return null; }
    const d = Math.hypot(it.x - this.x, it.z - this.z);
    if (d < 1.1 && Math.abs(it.y - this.y) < 1.5) {
      it.remove = true; this.offItem = r.id; this.regrab = null;
      this.game.sfx.playAt('pop', this.x, this.y, this.z);
      return null;
    }
    return { want: this.T.speed * (this.crawling ? 0.35 : 1), dir: this.navDir(it.x, it.y, it.z, dt) ?? Math.atan2(-(it.x - this.x), -(it.z - this.z)) };
  },
});

// Wrap hurt: after the damage, see whether something comes off.
{
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const dealt = baseHurt.call(this, amount, src);
    if (dealt > 0) this.tryDismember(src, dealt);
    return dealt;
  };
}

// A severed part, tumbling away and lying on the ground for a while.
class Gib extends Entity {
  constructor(game, mob, part, m) {
    super(game, mob.x + m[12], mob.y + m[13], mob.z + m[14]);
    this.mesh = part.mesh; this.w = 0.12; this.h = 0.12;
    // keep the part's turn, drop its position (we move it ourselves)
    this.rot = new Float32Array(m); this.rot[12] = this.rot[13] = this.rot[14] = 0;
    const a = Math.random() * TAU;
    this.vx = Math.cos(a) * 2 + (mob.vx || 0); this.vz = Math.sin(a) * 2 + (mob.vz || 0); this.vy = 3 + Math.random() * 2;
    this.spinX = (Math.random() - 0.5) * 12; this.spinZ = (Math.random() - 0.5) * 12; this.ax = 0; this.az = 0;
    this.tint = mob.T.tint || null; this.life = 25;
  }
  update(dt) {
    const w = this.game.world;
    this.age += dt;
    if (this.age > this.life) { this.remove = true; return; }
    if (!this.rest) {
      this.vy -= 20 * dt;
      const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt, nz = this.z + this.vz * dt;
      if (T_SOLID[w.getBlock(Math.floor(nx), Math.floor(this.y + 0.05), Math.floor(nz))]) { this.vx *= -0.3; this.vz *= -0.3; }
      else { this.x = nx; this.z = nz; }
      if (this.vy < 0 && T_SOLID[w.getBlock(Math.floor(this.x), Math.floor(ny - 0.02), Math.floor(this.z))]) {
        this.y = Math.floor(ny - 0.02) + 1.01; this.vy *= -0.25; this.vx *= 0.6; this.vz *= 0.6; this.spinX *= 0.5; this.spinZ *= 0.5;
        if (Math.abs(this.vy) < 0.8) { this.rest = true; this.vy = 0; }
      } else this.y = ny;
      this.ax += this.spinX * dt; this.az += this.spinZ * dt;
    }
  }
  draws(out) {
    const l = this.game.world.getLight(Math.floor(this.x), Math.floor(this.y + 0.2), Math.floor(this.z));
    const m = Mat4.create();
    Mat4.translate(m, 0, 0.08, 0); Mat4.rotateX(m, this.ax); Mat4.rotateZ(m, this.az);
    Mat4.multiply(m, m, this.rot);
    const fade = this.age > this.life - 2 ? 1 - (this.life - this.age) / 2 : 0;
    out.push({ mesh: this.mesh, m, px: this.x, py: this.y, pz: this.z, light: [l >> 4, l & 15], tint: fade ? [0, 0, 0, fade * 0.6] : this.tint, noCull: true });
  }
}
