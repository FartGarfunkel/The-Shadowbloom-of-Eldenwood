// ---------------------------------------------------------------------------
// game/hearth.js — 0.9.0.32: hearth and home.
//
// Armour sets: wear all four pieces of one metal (or leather, or dragonscale)
//   and the set gives something of its own: Ironclad stands firmer, Mithril is
//   light on the feet, Dragonscale closes your wounds. Shown on the pieces and
//   on your character sheet.
// The missing: now and then the quest board asks after a villager who went out
//   and never came back. Find them (they wave), take them by the hand, and walk
//   them home.
// A house: become a village's Hero and the elder has the village build you a
//   house at its edge, with a bed that's your spawn and a chest of gifts.
// The dragon again: craft End Crystals and set four round the exit portal, and
//   the Ender Dragon comes back for another fight.
// ---------------------------------------------------------------------------

// ---- 1. armour sets ------------------------------------------------------------------------------------------------
const ARMOR_SETS = {
  leather: { name: "Ranger's Ease", text: 'a little quicker on your feet, and falls hurt a quarter less', speed: 0.05, fall: 0.25 },
  copper: { name: 'Copper Hum', text: 'mana comes back a fifth faster', mana: 0.2 },
  bronze: { name: 'Bulwark', text: '4% less harm, and half the knockback', harm: 0.04, knock: 0.5 },
  iron: { name: 'Ironclad', text: '5% less harm, and 40% less knockback', harm: 0.05, knock: 0.4 },
  gold: { name: 'Gilded', text: 'a fifth more experience from everything', xp: 0.2 },
  silver: { name: 'Moonsilver', text: 'the undead take a quarter more from your blows; 4% less harm', undead: 0.25, harm: 0.04 },
  steel: { name: 'Steelguard', text: '7% less harm, blows 5% harder, 40% less knockback', harm: 0.07, dmg: 0.05, knock: 0.4 },
  diamond: { name: 'Brilliance', text: '8% less harm, and the set wears a third slower', harm: 0.08, wear: 0.33 },
  cinderite: { name: 'Emberheart', text: 'fire and lava hurt half as much and flames die quickly; 8% less harm', harm: 0.08, fire: 0.5, burn: true },
  mithril: { name: 'Featherlight', text: '8% quicker on your feet, 9% less harm, falls hurt half', speed: 0.08, harm: 0.09, fall: 0.5 },
  dragonscale: { name: 'Wyrmblood', text: '10% less harm, fire hurts half, and wounds slowly close', harm: 0.1, fire: 0.5, regen: true },
  adamantite: { name: 'Unbreakable', text: '12% less harm, no knockback, and the set wears half as fast', harm: 0.12, knock: 1, wear: 0.5 },
};
for (const k of Object.keys(ARMOR_SETS)) if (!ITEMS[k + '_helmet']) delete ARMOR_SETS[k];
for (const [mk, S] of Object.entries(ARMOR_SETS)) {
  S.key = mk; S.label = (ARMOR_MATS[mk] && ARMOR_MATS[mk].label) || mk;
  for (const pc of ARMOR_PIECES) { const d = ITEMS[mk + '_' + pc.key]; if (d) d.desc = (d.desc ? d.desc + ' · ' : '') + `Full set: ${S.name} (${S.text})`; }
}
function armorSetOf(p) {
  const a = p && p.inv && p.inv.armor && p.inv.armor.slots; if (!a || !a[0]) return null;
  const id0 = a[0].id; if (!id0.endsWith('_helmet')) return null;
  const mk = id0.slice(0, -7), S = ARMOR_SETS[mk]; if (!S) return null;
  for (let i = 1; i < 4; i++) if (!a[i] || a[i].id !== mk + '_' + ARMOR_PIECES[i].key) return null;
  return S;
}
const UNDEAD_RE = /ghoul|skeleton|stray|husk|drowned|wraith|zombie|wight|lich|revenant/;
{
  // which set you're in, looked at now and then (the hooks below read p._set)
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const p = this.player;
    if ((this._setT = (this._setT || 0) - dt) <= 0) {
      this._setT = 0.4;
      const S = armorSetOf(p), k = S ? S.key : null;
      if (k !== p._setK) {
        const had = p._setK !== undefined; p._setK = k; p._set = S;
        if (S && had) this.toast(`Full ${S.label} set — ${S.name}: ${S.text}`, 'good');
      }
    }
    const S = p._set;
    if (S && !p.dead) {
      if (S.regen && p.health < p.maxHealth && (this._wyrmT = (this._wyrmT || 0) + dt) >= 8) { this._wyrmT = 0; p.heal(1); }
      if (S.burn && p.burn > 1.2) p.burn = 1.2;
    }
    return baseUpd.call(this, dt, inp);
  };
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const S = this.player._set;
    if (S && amount > 0 && src && !src.bypass) {
      let k = 1;
      if (S.harm && !src.bypassArmor) k *= 1 - S.harm;
      if (S.fire && (src.element === 'fire' || src.type === 'lava' || src.type === 'burn')) k *= 1 - S.fire;
      if (S.fall && src.type === 'fall') k *= 1 - S.fall;
      amount *= k;
      if (S.knock && src.attacker && src.knock !== 0) src = Object.assign({}, src, { knock: S.knock >= 1 ? 0 : (src.knock || 5) * (1 - S.knock) });
    }
    return baseHurt.call(this, amount, src);
  };
  const baseKnock = LocalPlayer.prototype.knock;
  LocalPlayer.prototype.knock = function (vx, vy, vz) {
    const S = this.player._set, k = S && S.knock ? 1 - Math.min(1, S.knock) : 1;
    return baseKnock.call(this, vx * k, vy, vz * k);
  };
  const baseMove = Player.prototype.move;
  Player.prototype.move = function (world, inp, dt, opts) {
    const S = this._set;
    if (S && S.speed && !this.flying) opts = Object.assign({}, opts, { slow: (opts && opts.slow || 1) * (1 + S.speed) });
    return baseMove.call(this, world, inp, dt, opts);
  };
  const baseXP = LocalPlayer.prototype.grantXP;
  LocalPlayer.prototype.grantXP = function (n, x, y, z) {
    const S = this.player._set;
    return baseXP.call(this, S && S.xp && n > 0 ? Math.round(n * (1 + S.xp)) : n, x, y, z);
  };
  const baseMobHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    if (this.lostQ && this.npc) return 0;   // the missing villager: nobody's to be hurt on the way home
    const a = src && src.attacker, S = a instanceof LocalPlayer ? a.player._set : null;
    if (S && amount > 0 && !src._cleave) {
      if (S.dmg) amount *= 1 + S.dmg;
      if (S.undead && this.T && (this.T.undead || UNDEAD_RE.test(this.type))) amount *= 1 + S.undead;
    }
    return baseMobHurt.call(this, amount, src);
  };
  const baseWear = Player.prototype.wearArmor;
  Player.prototype.wearArmor = function () {
    const S = this._set;
    if (S && S.wear && Math.random() < S.wear) return;
    return baseWear.call(this);
  };
  const baseRegen = manaRegen;
  manaRegen = function (p) { const S = p && p._set; return baseRegen(p) * (S && S.mana ? 1 + S.mana : 1); };
  // on the character sheet, and in what it says your armour turns aside
  const baseProt = protection;
  protection = function (p) { const r = baseProt(p), S = p._set; return S && S.harm ? 1 - (1 - r) * (1 - S.harm) : r; };
  const baseSheet = sheetHTML;
  sheetHTML = function (lp) {
    const html = baseSheet(lp), S = lp.player._set || armorSetOf(lp.player);
    return S ? html + `<div class="sh-set" title="${esc(S.text)}">${esc(S.label)} set · <b>${esc(S.name)}</b><span>${esc(S.text)}</span></div>` : html;
  };
}

// (the two skills added in 0.9.0.25 had no short names on the sheet: it read 'undefined')
if (typeof SKILL_SHORT !== 'undefined') { SKILL_SHORT.exploring = SKILL_SHORT.exploring || 'Expl'; SKILL_SHORT.alchemy = SKILL_SHORT.alchemy || 'Alch'; }

// ---- 2. the missing -------------------------------------------------------------------------------------------------
const LOST = { t: 0, wants: new Map() };
const LOST_WHY = ['went out to gather mushrooms', 'went looking for a lost goat', 'set off to visit a cousin', 'went to cut firewood', 'went hunting', 'followed a strange light', 'went to pick berries'];
{
  const base = boardQuests;
  boardQuests = function (g, v) {
    const out = base(g, v);
    if (g.dim !== 0) return out;
    const day = npcDay(g), period = Math.floor(day / 2), r = mulberry32(eliteMix(v.seed, period, 41));
    if (r() > 0.55) return out;
    const seed = Math.floor(r() * 99999), name = npcName(seed), why = LOST_WHY[Math.floor(r() * LOST_WHY.length)];
    const a = r() * TAU, d = 90 + r() * 120, x = Math.round(v.x + Math.cos(a) * d), z = Math.round(v.z + Math.sin(a) * d);
    const dirs = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'], dir = dirs[(Math.round(a / (Math.PI / 4)) + 8) % 8];
    out.push({ id: v.id + ':lost:' + period, vid: v.id, giver: -1, from: 'Quest Board', kind: 'rescue', lname: name, ls: seed, at: [x, z], need: 1,
      title: 'Missing: ' + name, text: `${name} ${why} and hasn't come back. Last seen some ${Math.round(d / 10) * 10} blocks to the ${dir} (near x ${x}, z ${z}). Find them and walk them home.`,
      reward: { em: 8, xp: 100, rep: 15, skill: ['exploring', 600] } });
    return out;
  };
  const baseHave = questHave;
  questHave = function (lp, q) { return q.kind === 'rescue' ? (q.have || 0) : baseHave(lp, q); };
}
function lostTick(g, dt) {
  if (g.dim !== 0 || !g.meta || !g.world) return;
  if ((LOST.t -= dt) > 0) return;
  LOST.t = 1.5;
  const near = (l, q) => Math.hypot(l.player.x - q.at[0], l.player.z - q.at[1]) < 48;
  if (g.isGuest) {
    if (g.net) for (const l of g.locals) for (const q of npcStats(l.player).quests) if (q.kind === 'rescue' && !q.have && q.at && near(l, q)) g.net.send({ t: 'adv', k: 'lostat', li: l.index, q: { id: q.id, vid: q.vid, lname: q.lname, ls: q.ls, at: q.at } });
    return;
  }
  for (const l of g.locals) for (const q of npcStats(l.player).quests) if (q.kind === 'rescue' && !q.have && q.at && near(l, q)) lostSpawn(g, q, l);
  const now = performance.now();
  for (const [id, w] of LOST.wants) { if (now - w.t > 8000) LOST.wants.delete(id); else lostSpawn(g, w.q, w.r); }
  // the ones on their way home
  for (const e of g.entities) {
    if (!e.lostQ || !e.alive || e.remove) continue;
    const v = villageById(g, e.npc && e.npc.v);
    if (v && Math.hypot(v.x - e.x, v.z - e.z) < 14) lostHome(g, e, v);
  }
}
function lostSpawn(g, q, who) {
  const M = g.meta.lost || (g.meta.lost = {});
  if (M[q.id] || g.entities.some(e => e.lostQ === q.id && e.alive && !e.remove)) return;
  const qx = Math.floor(+q.at[0]), qz = Math.floor(+q.at[1]);
  if (!g.world.isLoaded(qx, qz)) return;
  let sx = qx, sz = qz, y = findSafeY(g.world, qx, qz);
  for (let k = 0; y < 1 && k < 24; k++) { const a = k * 0.9, r = 3 + k; sx = Math.floor(qx + Math.cos(a) * r); sz = Math.floor(qz + Math.sin(a) * r); if (g.world.isLoaded(sx, sz)) y = findSafeY(g.world, sx, sz); }
  if (y == null || y < 1) return;
  const e = new Mob(g, 'villager', sx + 0.5, y, sz + 0.5);
  const seed = (+q.ls || 0) % 100000;
  e.npc = { v: q.vid, i: 300, n: String(q.lname || npcName(seed)).slice(0, 30), j: 'none', s: seed, p: 0 };
  e.lostQ = q.id; e.persistent = true; e.kept = false; e.follow = null;
  g.addEntity(e);
  // and what's keeping them there
  const night = g.env && g.env.day < 0.3, n = 2 + (night ? 2 : 0) + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, r = 5 + Math.random() * 4, x = sx + Math.cos(a) * r, z = sz + Math.sin(a) * r;
    if (!g.world.isLoaded(Math.floor(x), Math.floor(z))) continue;
    const my = findSafeY(g.world, Math.floor(x), Math.floor(z)); if (my < 1) continue;
    const type = ['ghoul', 'skeleton', 'spider', 'ghoul'][i % 4]; if (!MOB_TYPES[type]) continue;
    const m = g.addEntity(new Mob(g, type, Math.floor(x) + 0.5, my, Math.floor(z) + 0.5)); if (m) m.huntT = 30;
  }
  if (who && who.toast) who.toast(`Someone is calling for help nearby!`, 'warn');
}
function lostHome(g, e, v) {
  const M = g.meta.lost || (g.meta.lost = {}); M[e.lostQ] = 'home';
  const name = e.npc.n, id = e.lostQ;
  for (const l of g.locals) {
    for (const q of npcStats(l.player).quests) if (q.id === id && !q.have) { q.have = 1; questHud(l); }
    if (Math.hypot(l.player.x - e.x, l.player.z - e.z) < 80) l.toast(`${name} is home safe in ${v.name}! Back to the board for your reward.`, 'epic');
  }
  if (g.net) for (const p of g.net.pawns()) if (Math.hypot(p.x - e.x, p.z - e.z) < 80) p.send({ t: 'adv', k: 'lostin', q: id, n: name, vn: v.name });
  for (let i = 0; i < 24; i++) spellSpark(g, e.x + (Math.random() - 0.5), e.y + Math.random() * 1.8, e.z + (Math.random() - 0.5), 'mana_light', { vy: 1.2, life: 0.8, size: 0.06 });
  g.sfx.play('levelup');
  e.remove = true;
}
// a lost villager: waits and waves; once you take their hand, keeps close behind you
function lostAI(e, dt) {
  const g = e.game, N = e.npc; N.p = 0;
  let f = e.follow;
  if (f && (f.dead || !g.pawns().includes(f))) f = e.follow = null;
  if (f) {
    const d = Math.hypot(f.x - e.x, f.z - e.z);
    if (d > 56) { e.follow = null; const l = g.locals.find(q => q.player === f) || f; if (l.toast) l.toast(`${N.n} lost sight of you, and waits where they are`, 'warn'); return { want: 0, dir: e.yaw }; }
    if ((d > 18 || Math.abs(f.y - e.y) > 8) && (f.player || f).onGround !== false && e.teleportNear && e.teleportNear(f)) return { want: 0, dir: e.yaw };
    if (d > 2.4) return { want: d > 7 ? e.T.speed * 1.9 : e.T.speed * 1.3, dir: e.goToward(f.x, f.y, f.z, dt) };
    return { want: 0, dir: heading(e.x, e.z, f.x, f.z) };
  }
  for (const q of g.pawns()) if (!q.dead && Math.hypot(q.x - e.x, q.z - e.z) < 14) { N.p |= NPC_P.wave; e.yaw = turnTo(e.yaw, heading(e.x, e.z, q.x, q.z), dt * 4); break; }
  return { want: 0, dir: e.yaw };
}
function lostTake(g, e, pawn, tell) {
  if (!e || !e.lostQ || !e.npc || !e.alive) return;
  e.follow = pawn;
  const v = villageById(g, e.npc.v);
  if (tell) tell(`${e.npc.n}: "Oh, thank the stars! Take me home${v ? ' to ' + v.name : ''}, please. I'll stay close."`);
}
{
  // (e.lostQ, not e.lost: Mob.lost is the set of limbs a creature has lost, game/dismember.js)
  const baseSnap = Mob.prototype.snap;
  Mob.prototype.snap = function () { const s = baseSnap.call(this); if (this.lostQ) s.lq = this.lostQ; return s; };
  const baseApply = Mob.prototype.applySnap;
  Mob.prototype.applySnap = function (o) { baseApply.call(this, o); if (o.lq) this.lostQ = o.lq; };
  const baseCtl = Mob.prototype.controlAI;
  Mob.prototype.controlAI = function (dt, p, dist, dyp, toPlayer) {
    if (this.lostQ && this.npc && !this.ghost) return lostAI(this, dt);
    return baseCtl.call(this, dt, p, dist, dyp, toPlayer);
  };
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const e = this.targetEnt;
    if (!repeat && !fromOff && e && e.lostQ && e.npc && e.alive) {
      this.swingArm();
      if (this.g.isGuest) { if (this.g.net) this.g.net.send({ t: 'adv', k: 'lostfollow', id: e.id, li: this.index || 0 }); this.toast(`${e.npc ? e.npc.n : 'They'}: "Oh, thank the stars! Take me home, please."`, 'good'); }
      else lostTake(this.g, e, this, (m) => this.toast(m, 'good'));   // (pawns() are the LocalPlayers themselves)
      return;
    }
    // an End Crystal set down round the exit portal
    const held = this.player.inv.held;
    if (!repeat && !fromOff && held && held.id === 'end_crystal' && this.g.dim === DIM.END) { endCrystalPlace(this, held); return; }
    return baseUse.call(this, repeat, inp, fromOff);
  };
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) {
    try { lostTick(this, dt); homeTick(this, dt); ritualTick(this, dt); } catch (e) { if (!LOST.warned) { LOST.warned = true; console.warn('hearth', e); } }
    return baseUpd.call(this, dt);
  };
}

// ---- 3. a house of your own ------------------------------------------------------------------------------------------
const HOME = { t: 0, pending: [] };
function homesOf(p) { const st = p.stats || (p.stats = {}); return st.homes || (st.homes = {}); }
function isHero(lp, vid) { const S = npcStats(lp.player); return standingOf(S.vrep[vid] || 0).k >= NPC_STANDING.length - 1; }
// a 7 x 6 village house (VTEMPLATES.house_m) on the flattest open ground just outside the village, its door to the square
function homeSite(g, v) {
  const w = g.world, others = Object.values(g.meta.homeSites || {});
  const box = (r, ox, oz) => { const c = [[-1, -2], [7, -2], [-1, 7], [7, 7]].map(([x, z]) => { const [a, b] = vRot(r, x, z); return [ox + a, oz + b]; }); return [Math.min(...c.map(q => q[0])), Math.min(...c.map(q => q[1])), Math.max(...c.map(q => q[0])), Math.max(...c.map(q => q[1]))]; };
  let best = null;
  for (let ring = 0; ring < 7 && !best; ring++) {
    const dist = v.r + 4 + ring * 4;
    for (let k = 0; k < 20; k++) {
      const a = (k / 20) * TAU + ring * 0.4, cx = Math.round(v.x + Math.cos(a) * dist), cz = Math.round(v.z + Math.sin(a) * dist);
      // the door (local -z) looks back toward the square
      const tx = v.x - cx, tz = v.z - cz, r = Math.abs(tx) > Math.abs(tz) ? (tx > 0 ? 1 : 3) : (tz < 0 ? 0 : 2);
      const [dx, dz] = vRot(r, 3, 3), ox = cx - dx, oz = cz - dz;
      const bb = box(r, ox, oz);
      if (v.blds && v.blds.some(b => b.x1 + 2 >= bb[0] && b.x0 - 2 <= bb[2] && b.z1 + 2 >= bb[1] && b.z0 - 2 <= bb[3])) continue;
      if (others.some(o => o[0] + 10 >= bb[0] && o[0] - 10 <= bb[2] && o[2] + 10 >= bb[1] && o[2] - 10 <= bb[3])) continue;
      let ok = true; const hs = [];
      for (let x = bb[0]; x <= bb[2] && ok; x++) for (let z = bb[1]; z <= bb[3] && ok; z++) {
        if (!w.isLoaded(x, z)) { ok = false; break; }
        const y = findSafeY(w, x, z); if (y < 1) { ok = false; break; }
        const top = w.getBlock(x, y - 1, z); if (T_LIQUID[top] || (BLOCKS[top] && (BLOCKS[top].leaves || BLOCKS[top].isLog))) { ok = false; break; }
        hs.push(y - 1);
      }
      if (!ok) continue;
      hs.sort((p, q) => p - q);
      const Y = hs[hs.length >> 1];
      if (hs[0] < Y - 3 || hs[hs.length - 1] > Y + 3) continue;
      // (0.9.0.33) never on anything someone built, a chest, a portal, or a place
      if (w.gen.structsNear && w.gen.structsNear((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2, 12).some(S => S.x1 + 2 >= bb[0] && S.x0 - 2 <= bb[2] && S.z1 + 2 >= bb[1] && S.z0 - 2 <= bb[3])) continue;
      let built = false;
      for (let x = bb[0] - 1; x <= bb[2] + 1 && !built; x++) for (let z = bb[1] - 1; z <= bb[3] + 1 && !built; z++) for (let y = Y - 3; y <= Math.min(CH - 1, Y + 14); y++) {
        const id = w.getBlock(x, y, z);
        if (id && (placedAt(w, x, y, z) || T_PORTAL[id] || w.getEntity(x, y, z) || (BLOCKS[id] && (BLOCKS[id].container || BLOCKS[id].bed)))) { built = true; break; }
      }
      if (built) continue;
      best = { r, ox, oz, y: Y, bb };
      break;
    }
  }
  return best;
}
function homeBuild(g, v, site, owner) {
  const w = g.world, st = VSTYLE[v.style] || VSTYLE.plains, { r, ox, oz, y: Y, bb } = site;
  const b = { type: 'house_m', r, ox, oz, y: Y, x0: bb[0], z0: bb[1], x1: bb[2], z1: bb[3], seed: hash32(v.seed, ox, oz, 4243), job: null, beds: [], work: null, bedCol: (v.seed >>> 3) & 3 };
  const T = VTEMPLATES.house_m, ground = st.flat ? 'sand' : 'grass';
  const inside = (lx, lz) => lx >= 0 && lx <= 6 && lz >= 0 && lz <= 5;
  // the ground made ready: cleared above, a footing below, the yard levelled
  for (let lz = -2; lz <= 7; lz++) for (let lx = -1; lx <= 7; lx++) {
    const [a, c] = vRot(r, lx, lz), x = ox + a, z = oz + c;
    for (let yy = Y + 1; yy <= Math.min(CH - 1, Y + 13); yy++) if (w.getBlock(x, yy, z)) w.setBlock(x, yy, z, 0);
    const fill = inside(lx, lz) ? B[st.stone] : B[ground] ?? B.grass;
    w.setBlock(x, Y, z, fill);
    for (let yy = Y - 1; yy > 1 && !T_SOLID[w.getBlock(x, yy, z)]; yy--) w.setBlock(x, yy, z, inside(lx, lz) ? B[st.stone] : B.dirt);
  }
  // the house itself, raised with the village's own plans (vStamp's helpers, writing into the live world)
  const S = vStamp({ cx: 0, cz: 0, blocks: [], meta: [], blockEntities: new Map() }, b, st);
  const at = (lx, ly, lz) => { const [a, c] = vRot(r, lx, lz); return [ox + a, Y + ly, oz + c]; };
  S.set = (lx, ly, lz, key, meta = 0) => {
    const [x, y, z] = at(lx, ly, lz); if (y < 1 || y >= CH) return -1;
    const id = key === 0 || key === 'air' ? 0 : B[key]; if (id === undefined) return -1;
    w.setBlock(x, y, z, id, meta); return 1;
  };
  S.get = (lx, ly, lz) => { const [x, y, z] = at(lx, ly, lz); return w.getBlock(x, y, z); };
  const gifts = [['emerald', 16], ['bread', 8], ['cooked_beef', 8], ['torch', 24], ['golden_apple', 1], ['flower_pot', 2], ['oak_sapling', 2], ['wheat_seeds', 8]].filter(([k]) => ITEMS[k]);
  S.chest = (lx, ly, lz, f) => {
    if (S.set(lx, ly, lz, 'chest', (S.d(f) + 2) & 3) < 0) return;
    const [x, y, z] = at(lx, ly, lz), e = w.getEntity(x, y, z, () => ({ type: 'chest', items: new Array(27).fill(null) }));
    e.items = new Array(27).fill(null); gifts.forEach(([k, n], i) => { e.items[i] = mkStack(k, n); }); g.entityChanged(x, y, z);
  };
  T.build(S);
  const bed = at(1, 1, 3), door = at(3, 1, -1);
  return { bed, door, name: v.name };
}
function homeGive(g, v, who) {
  const key = v.id + ':' + (who && who.name || 'host'), built = g.meta.homeBuilt || (g.meta.homeBuilt = {});
  if (built[key]) return built[key];          // (0.9.0.33) one house each (asking again only tells you where it is)
  const site = homeSite(g, v);
  if (!site) return null;
  const h = homeBuild(g, v, site, who);
  built[key] = h;
  const sites = g.meta.homeSites || (g.meta.homeSites = {}); sites[key] = [site.ox, site.y, site.oz];
  g.sfx.play('levelup');
  return h;
}
function homeSettle(lp, vid, h) {
  const p = lp.player; homesOf(p)[vid] = { bed: h.bed, door: h.door, name: h.name };
  p.spawn = [h.bed[0] + 0.5, h.bed[1] + 0.6, h.bed[2] + 0.5]; p.spawnDim = DIM.OVERWORLD;
  lp.toast(`Your house in ${h.name} is ready! Its bed is your spawn now, and there's a chest of gifts inside.`, 'epic');
}
// the builders try again now and then if there was no ground ready when asked
function homeTick(g, dt) {
  if (g.isGuest || g.dim !== 0 || !HOME.pending.length || (HOME.t -= dt) > 0) return;
  HOME.t = 4;
  for (const P of HOME.pending.slice()) {
    const v = villageById(g, P.vid); if (!v) { HOME.pending.splice(HOME.pending.indexOf(P), 1); continue; }
    const h = homeGive(g, v, P.who);
    if (!h) {
      // a few tries, then the builders give up until asked again (the search isn't free)
      if ((P.tries = (P.tries || 0) + 1) >= 6) { HOME.pending.splice(HOME.pending.indexOf(P), 1); const t = P.lp || P.who; if (t && t.toast) t.toast(`The builders of ${v.name} couldn't find good open ground. Ask the elder again another time.`, 'warn'); }
      continue;
    }
    HOME.pending.splice(HOME.pending.indexOf(P), 1);
    if (P.lp) homeSettle(P.lp, P.vid, h);
    else if (P.who && P.who.send) P.who.send({ t: 'adv', k: 'housed', v: P.vid, h });
  }
}
{
  const baseHome = NpcTalk.prototype.home;
  NpcTalk.prototype.home = function (text) {
    baseHome.call(this, text);
    const g = this.g, v = this.v, lp = this.lp;
    if (this.job !== 'elder' || !v || g.dim !== 0) return;
    const mine = homesOf(lp.player)[v.id];
    if (!mine && !isHero(lp, v.id)) return;
    const o = this.el.querySelector('.nt-opts');
    const b = document.createElement('button'); b.className = 'btn nt-opt';
    b.innerHTML = `<i>⌂</i>${mine ? 'About my house…' : 'You wanted a word?'}`;
    b.onclick = () => {
      g.sfx.play('click'); b.remove();
      if (mine) { const d = mine.door; this.say(`It's yours for as long as ${v.name} stands. You'll find it at the edge of the village, near x ${d[0]}, z ${d[2]}. The bed is made.`); return; }
      if (HOME.pending.some(P => P.vid === v.id && (P.lp === lp))) { this.say('The builders are on it. Give them a little while.'); return; }
      this.say(`Hero of ${v.name}… you've done more for us than we can repay. But we can give you a home. The builders will raise you a house at the edge of the village, right away.`);
      if (g.isGuest) { if (g.net) g.net.send({ t: 'adv', k: 'house', v: v.id, li: lp.index || 0 }); return; }
      const h = homeGive(g, v, lp);
      if (h) homeSettle(lp, v.id, h); else { HOME.pending.push({ vid: v.id, lp, who: lp }); lp.toast('The builders are looking for good ground. Your house will be ready soon.', ''); }
    };
    o.insertBefore(b, o.lastChild);
  };
  // the village marks it on your maps
  const baseMarkers = mapMarkers;
  mapMarkers = function (g, m, lp) {
    const out = baseMarkers(g, m, lp);
    if (m.dim !== 0 || !lp) return out;
    const s = 1 << m.scale;
    for (const h of Object.values(homesOf(lp.player))) {
      const u = (h.door[0] - m.x0) / s, w = (h.door[2] - m.z0) / s; if (u < 0 || w < 0 || u > MAP_N || w > MAP_N) continue;
      out.push({ cell: 13, u, v: w, rot: 0, label: 'Your house in ' + h.name });
    }
    return out;
  };
}

// ---- 4. the dragon again --------------------------------------------------------------------------------------------
defItem('end_crystal', { name: 'End Crystal', rarity: 'rare', desc: 'Set four round the exit portal in The End to call the Ender Dragon back.' });
if (ITEMS.ender_eye && ITEMS.aether_crystal) RECIPES.push({ out: 'end_crystal', n: 1, shape: ['GGG', 'GEG', 'GAG'], key: { G: 'glass', E: 'ender_eye', A: 'aether_crystal' }, group: 'misc' });
function endCrystalPlace(lp, held) {
  const g = lp.g, hit = lp.target;
  if (g.isGuest) { lp.toast('Only the host can call the dragon back (for now)', ''); return; }
  const E = endRec(g), fy = g.world.gen.endFountainY();
  if (!E.slain) { lp.toast('The dragon still lives', ''); return; }
  if (g.entities.some(e => e.type === 'ender_dragon' && e.alive)) { lp.toast('The dragon is already here!', 'warn'); return; }
  if (!hit || hit.ny !== 1) return;
  const d = Math.hypot(hit.x + 0.5, hit.z + 0.5);
  if (d > 5 || d < 2 || Math.abs(hit.y - fy) > 1) { lp.toast('Set it on the stone round the exit portal', ''); return; }
  if (g.entities.some(e => e.ritual && e.alive && Math.hypot(e.x - hit.x - 0.5, e.z - hit.z - 0.5) < 1.5)) return;
  const c = g.addEntity(new Mob(g, 'end_crystal', hit.x + 0.5, hit.y + 1, hit.z + 0.5));
  c.ritual = true; c.kept = false; c.noGrav = true;
  held.n--; if (held.n <= 0) lp.player.inv.held = null;
  lp.swingArm(); g.sfx.playAt('spell_blink', hit.x + 0.5, hit.y + 1, hit.z + 0.5);
  const n = g.entities.filter(e => e.ritual && e.alive && !e.remove).length;
  lp.toast(n >= 4 ? 'The crystals hum together… something stirs in the dark' : `End Crystal ${n} of 4`, n >= 4 ? 'epic' : '');
}
function ritualTick(g, dt) {
  if (g.isGuest || g.dim !== DIM.END || !g.meta || !g.world) return;
  if (!g._ritT && (g._ritScan = (g._ritScan || 0) - dt) > 0) return;
  g._ritScan = 0.5;
  const cs = g.entities.filter(e => e.ritual && e.alive && !e.remove);
  if (cs.length < 4) { g._ritT = 0; return; }
  g._ritT = (g._ritT || 0) + dt;
  const fy = g.world.gen.endFountainY();
  for (const c of cs) if (Math.random() < dt * 8) spellSpark(g, c.x, c.y + 1, c.z, 'end_mote', { vx: -c.x * 0.4, vy: (fy + 12 - c.y) * 0.3, vz: -c.z * 0.4, life: 1.4, size: 0.12 });
  if (g._ritT < 5) return;
  g._ritT = 0;
  for (const c of cs) c.remove = true;
  const E = endRec(g); E.again = 1; E.crystalsGone = []; E.dragonHp = 0;
  g.sfx.playAt('dragon_roar', 0, fy + 30, 0, 300);
  for (const l of g.locals) l.toast('The Ender Dragon returns! The crystals on the pillars burn again', 'epic');
}

PV.debug.hearth = { setOf: (p) => armorSetOf(p), sets: () => Object.keys(ARMOR_SETS), site: (vid) => { const v = vid ? villageById(GAME, vid) : riftSpawnVillage(GAME); return v ? homeSite(GAME, v) : null; }, give: (lp, vid) => { const v = vid ? villageById(GAME, vid) : riftSpawnVillage(GAME); const h = v && homeGive(GAME, v, lp); if (h) homeSettle(lp, v.id, h); return h; }, lostTake: (e, p) => lostTake(GAME, e, p, null) };

// the host's own copy of a board job a guest says they hold (its id says the village and the period)
const BOARD_JOBS = new Map();
function boardJob(g, id, kind) {
  const k = kind + '|' + id; if (BOARD_JOBS.has(k)) return BOARD_JOBS.get(k);
  const m = /^(v-?\d+_-?\d+):(el|lost):(\d+)$/.exec(String(id)); if (!m || !g.meta || g.dim !== 0) return null;
  const v = villageById(g, m[1]); if (!v) return null;
  const d0 = g.meta.day; g.meta.day = +m[3] * (m[2] === 'el' ? 3 : 2);
  let q = null;
  try { q = boardQuests(g, v).find(o => o.id === id && o.kind === kind) || null; } finally { g.meta.day = d0; }
  if (BOARD_JOBS.size > 200) BOARD_JOBS.clear();
  BOARD_JOBS.set(k, q);
  return q;
}
// ---- playing together -------------------------------------------------------------------------------------------------
{
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && (m.k === 'lostat' || m.k === 'lostfollow' || m.k === 'house')) {
      const g = this.g, r = this.remotes.get('g' + from + ':' + (m.li || 0));
      if (!r) return;
      if (m.k === 'lostat' && m.q && typeof m.q.id === 'string') {
        const q = boardJob(g, m.q.id, 'rescue');
        if (q && Math.hypot(r.x - q.at[0], r.z - q.at[1]) < 64 && (LOST.wants.has(q.id) || LOST.wants.size < 16)) LOST.wants.set(q.id, { q, r, t: performance.now() });
      } else if (m.k === 'lostfollow') {
        const e = g.entities.find(o => o.id === m.id && o.lostQ && o.alive);
        if (e && Math.hypot(e.x - r.x, e.z - r.z) < 8) lostTake(g, e, r, null);
      } else if (m.k === 'house' && typeof m.v === 'string' && g.dim === 0) {
        const v = villageById(g, m.v); if (!v) return;
        const h = homeGive(g, v, r);
        if (h) r.send({ t: 'adv', k: 'housed', v: v.id, h }); else if (!HOME.pending.some(P => P.vid === v.id && P.who && P.who.name === r.name)) HOME.pending.push({ vid: v.id, who: r });
      }
      return;
    }
    return baseHost.call(this, from, m);
  };
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv' && m.k === 'lostin') {
      for (const l of this.g.locals) { for (const q of npcStats(l.player).quests) if (q.id === m.q && !q.have) { q.have = 1; questHud(l); } l.toast(`${m.n} is home safe in ${m.vn}! Back to the board for your reward.`, 'epic'); }
      return;
    }
    if (m && m.t === 'adv' && m.k === 'housed' && m.h && Array.isArray(m.h.bed)) { const l = this.g.locals[m.li || 0] || this.g.locals[0]; homeSettle(l, m.v, m.h); return; }
    return baseGuest.call(this, m);
  };
}
