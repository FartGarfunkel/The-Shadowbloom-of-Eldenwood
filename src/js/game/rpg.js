// ---------------------------------------------------------------------------
// game/rpg.js — 0.9.0.25: the long road.
//
// The full-game pass, part two: the RPG side.
//   Two new skills: Exploring (finding villages, dungeons, ruins, new lands and
//     other worlds, and simply covering ground) and Alchemy (brewing and enchanting).
//   Perks: every skill gives a named perk at levels 30, 60 and 90: Keen Edge,
//     Cleave, Prospector, Green Thumb, Mana Flow, Wayfarer… (press K to see them).
//   The Realm Fragments come not only from dungeon keepers but from the first
//     of each great foe you beat: the Cinder Golem, the Hollow Archmage, the
//     Minotaur, each of the dragons, the Warden and the Ender Dragon.
//   The Journal (J): the story as chapters, what to do next and where to look,
//     with your records (places found, foes beaten, distance walked).
//   New work on the boards: scout a ruin or tower nearby, and carry word to a
//     neighbouring village.
// ---------------------------------------------------------------------------

// ---- two new skills ---------------------------------------------------------------------------------------
SKILLS.push(['exploring', 'Exploring', '#6ad0c8'], ['alchemy', 'Alchemy', '#c06ad8']);
SKILL_NAME.exploring = 'Exploring'; SKILL_NAME.alchemy = 'Alchemy';

// ---- perks at 30, 60 and 90 ---------------------------------------------------------------------------------
const PERKS = {
  mining: [[30, 'Prospector', 'One ore in ten gives an extra'], [60, 'Stonebreaker', 'Stone and ore break a fifth faster'], [90, 'Motherlode', 'One ore in twenty gives three']],
  woodcutting: [[30, 'Forester', 'A felled tree always leaves a sapling'], [60, 'Lumberjack', 'A fifth more logs from every tree'], [90, 'Heartwood', 'Felling trees wears your axe half as much']],
  excavation: [[30, 'Keen Eye', 'Digging turns up flint, clay and gold now and then'], [60, 'Treasure Hunter', 'Now and then, an emerald or a bone in the dirt'], [90, 'Earthmover', 'Dirt, sand and gravel go a quarter faster']],
  farming: [[30, 'Green Thumb', 'Crops near you grow faster'], [60, 'Bountiful', 'A ripe harvest gives one more, a quarter of the time'], [90, 'Replanter', 'A ripe crop you harvest replants itself from your seeds']],
  fishing: [[30, 'Patient Angler', 'A bite stays on the hook half again as long'], [60, 'Double Catch', 'Now and then, two fish at once'], [90, 'Sea\'s Favour', 'Treasure comes up three times as often']],
  melee: [[30, 'Keen Edge', 'One blow in sixteen is a critical hit'], [60, 'Cleave', 'Your blows catch one foe beside your target for a third'], [90, 'Bloodthirst', 'Heal a twentieth of the melee damage you deal']],
  archery: [[30, 'Steady Aim', 'Arrows fly faster and hit harder'], [60, 'Retrieval', 'One arrow in three isn\'t used up'], [90, 'Eagle Eye', 'Arrows from far off (20+ blocks) hit a quarter harder']],
  defence: [[30, 'Thick Skin', 'Small blows (2 or less) hurt half a heart less'], [60, 'Second Wind', 'Once every five minutes, near death, you rally for 3 hearts'], [90, 'Unbreakable', 'Armour wears half as fast']],
  smithing: [[30, 'Fine Work', 'Metal tools and armour you make start at level 3'], [60, 'Masterwork', '…at level 6'], [90, 'Legendary Smith', '…at level 10']],
  cooking: [[30, 'Hearty', 'Food heals a tenth more'], [60, 'Quick Bite', 'Less of a wait between bites'], [90, 'Feast', 'Eating gives a few seconds of Regeneration']],
  taming: [[30, 'Bonded', 'Your creatures take a quarter less harm'], [60, 'Pack Leader', 'Your creatures hit a third harder'], [90, 'Beast Master', 'Taming always works the first time']],
  magic: [[30, 'Mana Flow', 'Mana comes back a quarter faster'], [60, 'Thrift', 'Spells cost 15% less mana'], [90, 'Archmage', 'One spell in ten costs nothing']],
  exploring: [[30, 'Pathfinder', 'You walk and run 5% faster'], [60, 'Surefooted', 'Falls hurt a third less'], [90, 'Wayfarer', 'Another 5% faster on your feet']],
  alchemy: [[30, 'Steeped', 'Potions you drink last a fifth longer'], [60, 'Distiller', 'A brew sometimes makes an extra potion'], [90, 'Philosopher', 'Enchanting costs a level less']],
};
function hasPerk(p, k, lvl) { return !!p && typeof skillLv === 'function' && skillLv(p, k) >= lvl; }
{
  // a toast when one comes
  const baseGain = skillGain;
  skillGain = function (lp, k, xp) {
    const p = lp && lp.player, before = p ? skillLv(p, k) : 0;
    const r = baseGain(lp, k, xp);
    if (p && PERKS[k]) { const after = skillLv(p, k); for (const [L, name, desc] of PERKS[k]) if (before < L && after >= L) setTimeout(() => { lp.toast(`Perk: ${name} — ${desc}`, 'epic'); lp.g.sfx.play('levelup'); }, 1800); }
    return r;
  };
  // the skills screen lists them
  const baseOpen = LocalPlayer.prototype.openSkills;
  LocalPlayer.prototype.openSkills = function () {
    baseOpen.call(this);
    const el = this.skillsEl; if (!el) return;
    const p = this.player, have = [], next = [];
    for (const [k, name, col] of SKILLS) {
      const L = skillLv(p, k), ps = PERKS[k] || [];
      for (const [lv, pn, desc] of ps) (L >= lv ? have : next).push({ k, name, col, lv, pn, desc });
    }
    next.sort((a, b) => (a.lv - skillLv(p, a.k)) - (b.lv - skillLv(p, b.k)));
    const row = (o, got) => `<div class="pk${got ? ' got' : ''}"><b style="color:${o.col}">${esc(o.pn)}</b> <span class="pk-s">${o.name} ${o.lv}</span><div class="pk-d">${esc(o.desc)}</div></div>`;
    const box = document.createElement('div'); box.className = 'pk-list';
    box.innerHTML = `<div class="pk-h">Perks${have.length ? ` · ${have.length} of ${have.length + next.length}` : ''}</div>${have.map(o => row(o, true)).join('')}${next.slice(0, have.length ? 4 : 6).map(o => row(o, false)).join('')}`;
    const card = el.querySelector('.sk-card'), hint = el.querySelector('.sk-hint');
    if (card) card.insertBefore(box, hint);
    if (hint) hint.innerHTML = 'Skills grow by doing. Hover for experience · K to close · J for your journal';
  };
}
// ---- the perks at work ----------------------------------------------------------------------------------
{
  // mining, woodcutting, excavation, farming
  const baseBreak = LocalPlayer.prototype.breakBlock;
  LocalPlayer.prototype.breakBlock = function (x, y, z) {
    const g = this.g, w = g.world, p = this.player, id = w.getBlock(x, y, z), b = BLOCKS[id], meta = w.getMeta(x, y, z);
    const placed = typeof placedAt === 'function' && placedAt(w, x, y, z), harvest = id && this.canHarvest(id), sk = id && typeof blockSkill === 'function' ? blockSkill(b) : null;
    const r = baseBreak.call(this, x, y, z);
    if (!id || w.getBlock(x, y, z) === id || g.creative || placed) return r;
    const drop = (k, n = 1) => { if (ITEMS[k]) g.dropItem(mkStack(k, n), x + 0.5, y + 0.5, z + 0.5, true); };
    if (sk && harvest && sk[2] && b.drop) {
      if (hasPerk(p, 'mining', 90) && Math.random() < 0.05) drop(b.drop, 2);
      else if (hasPerk(p, 'mining', 30) && Math.random() < 0.1) drop(b.drop, 1);
    }
    if (sk && sk[0] === 'excavation' && harvest) {
      if (hasPerk(p, 'excavation', 60) && Math.random() < 0.012) drop(Math.random() < 0.5 ? 'emerald' : 'bone');
      else if (hasPerk(p, 'excavation', 30) && Math.random() < 0.04) drop(['flint', 'clay_ball', 'gold_nugget'][Math.floor(Math.random() * 3)]);
    }
    if (b.crop && meta >= b.crop.stages - 1) {
      if (hasPerk(p, 'farming', 60) && Math.random() < 0.25 && b.crop.drop) drop(b.crop.drop);
      // the seed goes straight back in
      if (hasPerk(p, 'farming', 90)) {
        const seed = (b.crop.seed && ITEMS[b.crop.seed] ? b.crop.seed : null) || Object.keys(ITEMS).find(k => ITEMS[k].plants === b.key || (ITEMS[k].block === b.key && !ITEMS[k].food)) || null;
        if (seed && p.inv.count(seed) > 0 && w.getBlock(x, y, z) === 0 && w.getBlock(x, y - 1, z) === B.farmland) { w.setBlock(x, y, z, id, 0); p.inv.remove(seed, 1); }
      }
    }
    return r;
  };
  const baseTime = LocalPlayer.prototype.breakTime;
  LocalPlayer.prototype.breakTime = function (id, hit) {
    const t = baseTime.call(this, id, hit), b = BLOCKS[id], p = this.player;
    if (!isFinite(t) || t <= 0.05 || !b) return t;
    if (b.tool === TOOL.PICK && hasPerk(p, 'mining', 60)) return Math.max(0.05, t / 1.2);
    if (b.tool === TOOL.SHOVEL && hasPerk(p, 'excavation', 90)) return Math.max(0.05, t / 1.25);
    return t;
  };
  const baseFell = LocalPlayer.prototype.fellTree;
  LocalPlayer.prototype.fellTree = function (x, y, z, tree) {
    const p = this.player, g = this.g, leaf = tree && tree.leaves && tree.leaves[0];
    // (0.9.0.31) only logs that grew there count (three placed logs on dirt are a 'tree' too)
    const logs = tree && tree.logs ? tree.logs.filter(q => !placedAt(g.world, q[0], q[1], q[2])).length : 0;
    const lightly = hasPerk(p, 'woodcutting', 90);
    const baseWear = this.wearHeld; if (lightly) this.wearHeld = (n) => baseWear.call(this, Math.ceil(n / 2));
    let r;
    try { r = baseFell.call(this, x, y, z, tree); } finally { if (lightly) delete this.wearHeld; }
    if (!g.creative && logs) {
      const kind = tree.logs[0] && BLOCKS[tree.logs[0][3]];
      if (hasPerk(p, 'woodcutting', 60) && kind) { const n = Math.round(logs * 0.2 + Math.random() * 0.6); if (n > 0) g.dropItem(mkStack(kind.key, n), x + 0.5, y + 0.5, z + 0.5, true); }
      if (hasPerk(p, 'woodcutting', 30) && leaf && logs >= 3) { const sp = BLOCKS[leaf[3]].sapling || 'sapling'; if (ITEMS[sp]) g.dropItem(mkStack(sp, 1), x + 0.5, y + 1, z + 0.5, true); }
    }
    return r;
  };
  // fishing: a longer bite, two at once, more treasure
  const baseCatch = fishingCatch;
  fishingCatch = function (g, x, z) {
    const lp = g.locals.find(l => l.fishing && Math.hypot(l.fishing.x - x, l.fishing.z - z) < 1);
    if (lp && hasPerk(lp.player, 'fishing', 90) && Math.random() < 0.08) { let c = baseCatch(g, x, z); for (let i = 0; i < 40 && c.kind !== 'treasure'; i++) c = baseCatch(g, x, z); return c; }
    return baseCatch(g, x, z);
  };
  const baseBobUpd = Bobber.prototype.update;
  Bobber.prototype.update = function (dt) {
    const before = this.biteT;
    const r = baseBobUpd.call(this, dt);
    if (this.lp && hasPerk(this.lp.player, 'fishing', 30) && before <= 0 && this.biteT > 0) this.biteT *= 1.5;
    return r;
  };
  const baseEndFish = LocalPlayer.prototype.endFishing;
  LocalPlayer.prototype.endFishing = function (reel) {
    const b = this.fishing, caught = !!(b && reel && b.state === 'float' && b.biteT > 0 && b.catch && b.catch.kind === 'fish');
    const id = caught ? b.catch.id : null;
    const r = baseEndFish.call(this, reel);
    if (caught && ITEMS[id] && hasPerk(this.player, 'fishing', 60) && Math.random() < 0.15) { const left = this.give(mkStack(id, 1)); if (left > 0) this.g.dropItem(mkStack(id, left), this.player.x, this.player.y + 1, this.player.z, true); this.toast('Two at once!', 'good'); }
    return r;
  };
  // melee: a lucky critical (local.js asks _luckyCrit), cleave, bloodthirst; archery: from afar; taming: your creatures
  LocalPlayer.prototype._luckyCrit = function () { return hasPerk(this.player, 'melee', 30) && Math.random() < 1 / 16; };
  const baseMobHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const a = src.attacker, lp = a instanceof LocalPlayer ? a : null, p = lp && lp.player;
    if (p && src.tool === 'arrow' && hasPerk(p, 'archery', 90) && Math.hypot(p.x - this.x, p.z - this.z) > 20) amount *= 1.25;
    // a creature that's someone's: Bonded and Pack Leader
    const owner = (o) => o && o.owner && this.game.locals.find(l => l.name === o.owner);
    const mine = owner(this); if (mine && hasPerk(mine.player, 'taming', 30)) amount *= 0.75;
    const pet = a && a instanceof Mob ? owner(a) : null; if (pet && hasPerk(pet.player, 'taming', 60)) amount *= 1.33;
    const dealt = baseMobHurt.call(this, amount, src);
    if (p && dealt > 0 && src.weapon && !src._cleave) {
      if (hasPerk(p, 'melee', 90)) p.heal(dealt * 0.05);
      if (hasPerk(p, 'melee', 60)) {
        const o = this.game.entities.find(e => e !== this && e instanceof Mob && e.alive && e.T && e.T.hostile && !e.owner && Math.hypot(e.x - this.x, e.z - this.z) < 2.6 && Math.abs(e.y - this.y) < 2);
        if (o) o.hurt(dealt / 3, Object.assign({}, src, { _cleave: true, knock: 2, weapon: undefined, tool: undefined, type: 'cleave' }));   // (0.9.0.31) the skill bonus is in 'dealt' already
      }
    }
    return dealt;
  };
  // archery: faster arrows, and some not used up
  const baseShoot = LocalPlayer.prototype.shootArrow;
  LocalPlayer.prototype.shootArrow = function (power) {
    const p = this.player, g = this.g, n0 = p.inv.count('arrow') + (p.inv.offhand && p.inv.offhand.id === 'arrow' ? p.inv.offhand.n : 0);
    const before = new Set(g.entities);
    const r = baseShoot.call(this, power);
    const a = g.entities.find(e => e instanceof Arrow && !before.has(e) && e.owner === this);
    if (a && hasPerk(p, 'archery', 30)) { a.vx *= 1.15; a.vy *= 1.15; a.vz *= 1.15; }
    const n1 = p.inv.count('arrow') + (p.inv.offhand && p.inv.offhand.id === 'arrow' ? p.inv.offhand.n : 0);
    if (a && n1 < n0 && hasPerk(p, 'archery', 60) && Math.random() < 1 / 3) { this.give(mkStack('arrow', 1)); if (a) a.pickup = false; }
    return r;
  };
  // defence: thick skin, second wind, unbreakable
  const baseLPHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const p = this.player;
    if (amount > 0 && amount <= 2 && hasPerk(p, 'defence', 30) && src.type !== 'fall' && src.type !== 'void') amount = Math.max(0.5, amount - 0.5);
    const r = baseLPHurt.call(this, amount, src);
    if (!p.dead && p.health > 0 && p.health < p.maxHealth * 0.25 && hasPerk(p, 'defence', 60) && !((p.secondWindT || 0) > 0)) {
      p.secondWindT = 300; p.heal(6); this.toast('Second wind!', 'good'); this.g.sfx.play('heal');
      this.g.burst(p.x, p.y + 1, p.z, 'sparkle', 14, 1.2);
    }
    return r;
  };
  const baseWear = Player.prototype.wearArmor;
  Player.prototype.wearArmor = function () { if (hasPerk(this, 'defence', 90) && Math.random() < 0.5) return; return baseWear.call(this); };
  // smithing: what you make starts with some wear-in
  const baseTake = InvUI.prototype.takeOutput;
  InvUI.prototype.takeOutput = function (shift) {
    const r0 = this.grid ? matchGrid(this.grid, this.W) : null, d = r0 && itemDef(r0.out), p = this.lp.player;
    const L = hasPerk(p, 'smithing', 90) ? 10 : hasPerk(p, 'smithing', 60) ? 6 : hasPerk(p, 'smithing', 30) ? 3 : 0;
    const metal = d && (d.tool || d.armor) && !/^(wood|leather|stone|gold)_/.test(r0.out) && !d.staff;
    const seen = metal && L ? new Set([...p.inv.main.slots, p.inv.offhand, this.cursor].filter(Boolean)) : null;
    const res = baseTake.call(this, shift);
    if (seen) for (const s of [this.cursor, ...p.inv.main.slots, p.inv.offhand]) if (s && s.id === r0.out && !seen.has(s) && !(s.gx > 0)) s.gx = gearXpFor(L);
    return res;
  };
  // cooking: hearty, quick bite, feast
  const baseHeal = Player.prototype.heal;
  Player.prototype.heal = function (n) { return baseHeal.call(this, this._bite && hasPerk(this, 'cooking', 30) ? n * 1.1 : n); };
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const p = this.player, cd0 = p.foodCd || 0;
    const r = baseUse.call(this, repeat, inp, fromOff);
    if ((p.foodCd || 0) > cd0 + 0.5) {
      if (hasPerk(p, 'cooking', 60)) p.foodCd *= 0.55;
      if (hasPerk(p, 'cooking', 90) && typeof giveEffect === 'function') giveEffect(this, 'regen', 4, 0);
    }
    return r;
  };
  // magic: flow, thrift, archmage
  const baseRegen = manaRegen;
  manaRegen = function (p) { return baseRegen(p) * (hasPerk(p, 'magic', 30) ? 1.25 : 1); };
  const baseCast = LocalPlayer.prototype.castSpell;
  LocalPlayer.prototype.castSpell = function () {
    const p = this.player, m0 = p.mana;
    const r = baseCast.apply(this, arguments);
    const spent = (m0 ?? 0) - (p.mana ?? 0);
    if (spent > 0 && !this.g.creative) {
      if (hasPerk(p, 'magic', 90) && Math.random() < 0.1) { p.mana += spent; this.floatText(p.x, p.y + 2.1, p.z, 'Free!', '#c8a0ff'); }
      else if (hasPerk(p, 'magic', 60)) p.mana += spent * 0.15;
    }
    return r;
  };
  // exploring: quicker feet, surer falls
  const baseMove = Player.prototype.move;
  Player.prototype.move = function (world, inp, dt, opts) {
    if (!this.flying && this.stats && (hasPerk(this, 'exploring', 30))) opts = Object.assign({}, opts, { slow: (opts && opts.slow || 1) * (hasPerk(this, 'exploring', 90) ? 1.1 : 1.05) });
    return baseMove.call(this, world, inp, dt, opts);
  };
  const baseHurt2 = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    if (src.type === 'fall' && hasPerk(this.player, 'exploring', 60)) amount = Math.floor(amount * 0.67 * 2) / 2;
    return baseHurt2.call(this, amount, src);
  };
  // alchemy: longer potions, and Philosopher (in the enchanting hook below)
  const baseGive = giveEffect;
  giveEffect = function (q, eff, secs, lv, src) {
    const p = q && (q.player || q);
    if (p && p.stats && eff !== 'heal' && eff !== 'mana' && eff !== 'harm' && !(EFFECTS[eff] && EFFECTS[eff].bad) && hasPerk(p, 'alchemy', 30) && typeof secs === 'number') secs *= 1.2;
    return baseGive(q, eff, secs, lv, src);
  };
}
// farming: green thumb (a crop near you grows a stage now and then)
function greenThumb(lp, dt) {
  const p = lp.player, w = lp.g.world;
  if (!hasPerk(p, 'farming', 30) || !w) return;
  if ((lp._gtT = (lp._gtT || 0) - dt) > 0) return;
  lp._gtT = 1.5;
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(p.x + (Math.random() - 0.5) * 14), z = Math.floor(p.z + (Math.random() - 0.5) * 14), y = Math.floor(p.y + (Math.random() - 0.5) * 4);
    const id = w.getBlock(x, y, z), b = BLOCKS[id];
    if (!b || !b.crop) continue;
    const m = w.getMeta(x, y, z) & 15;
    if (m < b.crop.stages - 1 && Math.random() < 0.35) { w.setBlock(x, y, z, id, (w.getMeta(x, y, z) & ~15) | (m + 1)); lp.g.burst(x + 0.5, y + 0.6, z + 0.5, 'happy', 2, 0.3); }
  }
}

// ---- Exploring experience: places found, new lands, other worlds, ground covered --------------------------------
function exploreTick(lp, dt) {
  const g = lp.g, p = lp.player, st = p.stats || (p.stats = {});
  if (g.creative || !g.world || p.dead) return;
  if ((lp._exT = (lp._exT || 0) - dt) > 0) return;
  lp._exT = 2;
  const E = st.explore || (st.explore = { v: 0, d: 0, s: 0, dims: {}, biomes: {}, walked: 0, at: null });
  const n = (o) => o ? Object.keys(o).length : 0;
  let xp = 0;
  const nv = n(st.vseen), nd = n(st.dseen), ns = n(st.sseen);
  xp += Math.max(0, nv - E.v) * 150 + Math.max(0, nd - E.d) * 120 + Math.max(0, ns - E.s) * 100;
  E.v = nv; E.d = nd; E.s = ns;
  const dim = p.dim ?? g.dim;
  if (!E.dims[dim]) { E.dims[dim] = 1; if (dim !== 0) { xp += 400; lp.toast('A new world: ' + (DIM_LABEL[dim] || 'somewhere else'), 'good'); } }
  if (dim === 0 && g.world.gen && g.world.gen.biomeAt) {
    let bn = null; try { bn = BIOME_NAME[g.world.gen.biomeAt(p.x, p.z)]; } catch (e) { /* no biome here */ }
    if (bn && !E.biomes[bn]) { E.biomes[bn] = 1; if (Object.keys(E.biomes).length > 1) { xp += 60; lp.toast('New land: ' + bn, ''); } }
  }
  if (E.at && E.at[3] === dim) { const d = Math.hypot(p.x - E.at[0], p.z - E.at[2]); if (d < 60) E.walked += d; }
  E.at = [p.x, p.y, p.z, dim];
  const steps = Math.floor(E.walked / 64); if (steps > 0) { E.walked -= steps * 64; xp += steps * 4; st.walkedKm = (st.walkedKm || 0) + steps * 0.064; }
  if (xp > 0) skillGain(lp, 'exploring', xp);
}
const DIM_LABEL = { 1: 'the Ember Depths', 2: 'the Skylands', 3: 'your pocket dimension', 4: 'his realm', 5: 'the End' };

// ---- Alchemy experience: brews and enchantments ---------------------------------------------------------------
{
  const baseTick = tickBrew;
  tickBrew = function (g, e, dt, x, y, z) {
    const busy = e.t > 0, before = e.items.slice(0, 3).map(s => s && s.id);
    const r = baseTick(g, e, dt, x, y, z);
    if (busy && !(e.t > 0) && r) {
      const made = e.items.slice(0, 3).filter((s, i) => s && s.id !== before[i]).length;
      if (made) {
        const lp = g.locals.filter(l => !l.player.dead).sort((a, b) => Math.hypot(a.player.x - x, a.player.z - z) - Math.hypot(b.player.x - x, b.player.z - z))[0];
        if (lp && Math.hypot(lp.player.x - x, lp.player.z - z) < 12) {
          skillGain(lp, 'alchemy', 35 * made);
          if (hasPerk(lp.player, 'alchemy', 60) && Math.random() < 0.25) { const s = e.items.slice(0, 3).find(Boolean); if (s) g.dropItem(mkStack(s.id, 1), x + 0.5, y + 1, z + 0.5, true); }
        }
      }
    }
    return r;
  };
  const baseCut = InvUI.prototype.cutPick;
  InvUI.prototype.cutPick = function (i, all) {
    const p = this.lp.player, n0 = (p.stats && p.stats.enchanted) || 0, lv0 = p.level;
    const r = baseCut.call(this, i, all);
    const n1 = (p.stats && p.stats.enchanted) || 0;
    if (n1 > n0) {
      const spent = Math.max(1, lv0 - p.level);
      skillGain(this.lp, 'alchemy', 40 + spent * 30);
      if (hasPerk(p, 'alchemy', 90) && spent > 0 && !this.g.creative) p.level += 1;
    }
    return r;
  };
}

// ---- Realm Fragments from the great foes (the first of each kind) ---------------------------------------------
const FRAG_FOES = { cinder_golem: 'the Cinder Golem', hollow_archmage: 'the Hollow Archmage', minotaur: 'the Minotaur', warden: 'the Warden', ender_dragon: 'the Ender Dragon' };
{
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    const r = baseDie.call(this, src);
    const g = this.game;
    if (!RIFT_OFF && !g.isGuest && g.meta && !this.dungeon && (FRAG_FOES[this.type] || (this.lair && /_dragon$/.test(this.type)))) {
      const R = riftOf(g), F = g.meta.flags || (g.meta.flags = {}), got = F.fragFoes || (F.fragFoes = {});
      // (0.9.0.31) once the gate stands open the fragments have done their work: a great foe's first fall gives rift crystal instead
      if (!R.sealed && !got[this.type] && (R.stage || 0) >= 3) { got[this.type] = 1; if (ITEMS.rift_crystal) g.dropItem(mkStack('rift_crystal', 3), this.x, this.y + 1, this.z, true); }
      else if (!R.sealed && !got[this.type]) {
        got[this.type] = 1;
        g.dropItem(mkStack('realm_fragment', 1), this.x, this.y + 1, this.z, true);
        R.frags = (R.frags || 0) + 1; riftChanged(g);
        setTimeout(() => riftSay(g, `A Realm Fragment falls from ${FRAG_FOES[this.type] || (this.T.label || 'it')}. (${Math.min(RIFT_NEED, R.frags)} of ${RIFT_NEED})`, 'epic'), 1800);
      }
    }
    return r;
  };
}

// ---- the story, as chapters -----------------------------------------------------------------------------------
function storyOf(lp) {
  const g = lp.g, p = lp.player, st = p.stats || (p.stats = {}), R = (g.meta && g.meta.rift) || {}, E = (g.meta && g.meta.end) || {};
  const S = st.story || (st.story = {});
  const keys = (o) => o ? Object.keys(o).length : 0;
  const dims = (st.explore && st.explore.dims) || {};
  const frags = Math.min(RIFT_NEED, R.frags || 0), sealed = !!R.sealed;
  const lairs = g.meta && g.meta.dragons ? Object.values(g.meta.dragons).filter(l => l && l.slain).length : 0;
  const ancient = st.sseen ? Object.values(st.sseen).some(v => Array.isArray(v) && /Ancient City/i.test(v[2] || '')) : false;
  const iron = S.iron || false;
  const ch = [
    { t: 'A Village at the Edge', goal: 'Find a village and walk into its square.', hint: 'Your journey starts beside one. Talk to the villagers, trade with them, and look at the board by the well.', done: keys(st.vseen) > 0 },
    { t: 'Iron and Fire', goal: 'Make yourself an iron pickaxe or better, and some armour.', hint: 'Iron ore is common below about y 60. Smelt it in a furnace. Copper and tin make bronze on the way.', done: iron },
    { t: 'The Tear in the Square', goal: 'A while after you arrive, something tears open in the village square. Speak to the elder.', hint: 'Keep playing: it opens on its own a quarter of an hour in.', done: (R.stage || 0) >= 1 },
    { t: 'The Keepers', goal: `Win four Realm Fragments (${frags} of ${RIFT_NEED}).`, hint: 'Every dungeon keeper carries one (the quest board points to the nearest dungeon). So does the first of each great foe: the Cinder Golem (an Ember Effigy at night), the Hollow Archmage and the Minotaur in their towers and mazes, each of the dragons, the Warden, the Ender Dragon.', done: frags >= RIFT_NEED || (R.stage || 0) >= 3, prog: frags / RIFT_NEED },
    { t: 'Fire Below', goal: 'Reach the Ember Depths.', hint: 'Beat the Cinder Golem for its core, make an Ember Igniter, and light an obsidian frame (2 wide, 3 tall inside). Or dig down far enough to break through.', done: !!dims[1], side: true },
    { t: 'Above the Clouds', goal: 'Reach the Skylands.', hint: 'Light a glowstone frame with water, or fly up on a mount. Watch for the storm dragon.', done: !!dims[2], side: true },
    { t: 'The Gateway', goal: 'Bring four fragments to the rift and use it.', hint: 'Stand by the tear in the square with the fragments and use it.', done: (R.stage || 0) >= 3 },
    { t: 'His Realm', goal: 'Step through the gateway.', hint: 'Go together and go ready: good armour, food, potions. In co-op, everyone is drawn in.', done: !!st.realmSeen || sealed },
    { t: 'The Seal', goal: 'Find Herobrine at the end of his halls and defeat him.', hint: 'Five halls. His bolts hurt; he steps through space; below half health his stare stops time.', done: sealed },
    { t: 'The End Beneath', goal: 'Slay the Ender Dragon.', hint: 'Eyes of ender (an ender pearl and cinder powder) fly toward a stronghold. Or break through the void crust at the very bottom of the Depths.', done: (E.slain || 0) > 0, epi: true },
    { t: 'The Deep Dark', goal: 'Find an Ancient City.', hint: 'Far below some lands the stone turns to slate and sculk. Tread softly.', done: ancient, epi: true },
    { t: 'Dragonslayer', goal: `Slay the seven dragons of the world (${lairs} of 7).`, hint: 'Each land has its dragon: forest, frost, sand, tide, ember (the Depths), storm (the Skylands), and one more. Their eggs hatch into drakes you can ride.', done: lairs >= 7, prog: lairs / 7, epi: true },
  ];
  const cur = ch.find(c => !c.done && !c.side && !c.epi) || ch.find(c => !c.done && c.side) || ch.find(c => !c.done);
  return { ch, cur };
}
// a better-than-iron pickaxe noted the first time you hold one
function storyTick(lp) {
  const p = lp.player, st = p.stats || (p.stats = {}), S = st.story || (st.story = {});
  if (!S.iron) {
    const all = [...p.inv.main.slots, p.inv.offhand, ...p.inv.armor.slots].filter(Boolean);
    const pick = all.some(s => { const d = itemDef(s.id); return d && d.tool && d.tool.type === 'pickaxe' && d.tool.tier >= 3; });
    const arm = all.some(s => { const d = itemDef(s.id); return d && d.armor && !/^leather/.test(s.id); });
    if (pick && arm) { S.iron = 1; lp.toast('Journal: Iron and Fire — done', 'good'); }
  }
}

// ---- the journal (J) --------------------------------------------------------------------------------------------
{
  const at = KEY_ACTIONS.findIndex(a => a[0] === 'hideHud');
  KEY_ACTIONS.splice(at < 0 ? KEY_ACTIONS.length : at, 0, ['journal', 'Journal', ['KeyJ']]);
  KEY_DEFAULTS.journal = ['KeyJ'];
  const basePress = InputManager.prototype.pressCode;
  InputManager.prototype.pressCode = function (code, e) { const r = basePress.call(this, code, e); if (this.actionsFor(code).includes('journal')) this.s.journal = true; return r; };
  const baseEnd = InputManager.prototype.endFrame;
  InputManager.prototype.endFrame = function () { baseEnd.call(this); this.s.journal = false; };
  const baseMerge = mergeInput;
  mergeInput = function (a, b) { const r = baseMerge(a, b); a.journal = a.journal || b.journal; return r; };
  const baseUpdate = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    if (this.journalEl && (inp.journal || inp.pause || inp.padB || inp.inventory || inp.skills)) { this.closeJournal(); inp = InputManager.blankState(); }
    else if (inp.journal && this.mode === 'play' && !this.skillsEl) { this.openJournal(); }
    const r = baseUpdate.call(this, dt, inp);
    try { if (this.player.secondWindT > 0) this.player.secondWindT -= dt; exploreTick(this, dt); greenThumb(this, dt); if ((this._stT = (this._stT || 0) - dt) <= 0) { this._stT = 3; storyTick(this); questHud(this); } } catch (e) { if (!this._rpgWarn) { this._rpgWarn = true; console.warn('rpg', e); } }
    return r;
  };
}
Object.assign(LocalPlayer.prototype, {
  openJournal() {
    if (this.journalEl) return;
    const g = this.g, p = this.player, st = p.stats || {}, { ch, cur } = storyOf(this);
    const keys = (o) => o ? Object.keys(o).length : 0;
    const el = this.journalEl = document.createElement('div');
    el.className = 'skills-view journal-view';
    const row = (c) => {
      const state = c.done ? 'done' : c === cur ? 'cur' : '';
      const pr = c.prog !== undefined && !c.done ? `<div class="sk-bar"><i style="width:${Math.round(Math.min(1, c.prog) * 100)}%"></i></div>` : '';
      return `<div class="jn-ch ${state}${c.side ? ' side' : ''}${c.epi ? ' epi' : ''}"><div class="jn-t"><span class="jn-mark">${c.done ? '✓' : c === cur ? '➤' : '·'}</span>${esc(c.t)}${c.side ? ' <i>(the long way round)</i>' : c.epi ? ' <i>(after)</i>' : ''}</div><div class="jn-g">${esc(c.goal)}</div>${c === cur || (!c.done && (c.side || c.epi)) ? `<div class="jn-h">${esc(c.hint)}</div>` : ''}${pr}</div>`;
    };
    const R = (g.meta && g.meta.rift) || {};
    const foes = Object.keys((g.meta && g.meta.flags && g.meta.flags.fragFoes) || {}).map(k => FRAG_FOES[k] || (MOB_TYPES[k] && MOB_TYPES[k].label) || k);
    const rec = [
      ['Villages found', keys(st.vseen)], ['Dungeons found', keys(st.dseen)], ['Places found', keys(st.sseen)],
      ['Lands seen', keys(st.explore && st.explore.biomes)], ['Worlds visited', keys(st.explore && st.explore.dims)],
      ['Walked', (st.walkedKm || 0).toFixed(1) + ' km'], ['Creatures beaten', st.mobsKilled || 0], ['Quests done', st.questsDone || 0],
      ...(RIFT_OFF ? [] : [['Realm Fragments', Math.min(RIFT_NEED, R.frags || 0) + ' of ' + RIFT_NEED]]), ['Play time', Math.floor((g.meta.playTime || 0) / 3600) + 'h ' + Math.floor((g.meta.playTime || 0) / 60 % 60) + 'm'],
    ];
    el.innerHTML = `<div class="sk-card jn-card"><div class="sk-head"><span class="sk-title">Journal</span><span class="sk-total">${esc(this.name)}</span></div>
      <div class="jn-cols"><div class="jn-story">${ch.map(row).join('')}</div>
      <div class="jn-rec"><div class="pk-h">Records</div>${rec.map(([k, v]) => `<div class="jn-r"><span>${k}</span><b>${v}</b></div>`).join('')}${foes.length ? `<div class="pk-h" style="margin-top:8px">Great foes beaten</div><div class="jn-foes">${foes.map(f => esc(f[0].toUpperCase() + f.slice(1))).join(' · ')}</div>` : ''}</div></div>
      <div class="sk-hint">J to close · K for your skills and perks</div></div>`;
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (e.target === el) this.closeJournal(); });
    this.el.appendChild(el);
    this.g.sfx.play('map_paper');
  },
  closeJournal() { if (this.journalEl) { this.journalEl.remove(); this.journalEl = null; } },
});
{
  // before the rift opens, the quest tracker shows the journal's next step
  const baseHud = questHud;
  questHud = function (lp) {
    baseHud(lp);
    const g = lp.g, R = g.meta && g.meta.rift;
    if (!lp.el || (R && R.stage) || !g.meta) return;
    const { cur } = storyOf(lp); if (!cur) return;
    let el = lp.el.querySelector('.quest-track');
    if (!el) { el = document.createElement('div'); el.className = 'quest-track'; lp.el.appendChild(el); }
    const html = `<div class="qt main"><b>${esc(cur.t)}</b><span>J</span></div>`;
    if (!el.querySelector('.qt.main')) el.insertAdjacentHTML('afterbegin', html); else if (el.querySelector('.qt.main').outerHTML !== html) el.querySelector('.qt.main').outerHTML = html;
  };
  // the elder tells of every kind of keeper now
  const baseSay = NpcTalk.prototype.say;
  NpcTalk.prototype.say = function (text) {
    if (typeof text === 'string' && text.startsWith('It opened when you came.')) text = text.replace('Find the dungeons, defeat their keepers, bring their Realm Fragments to the rift. Four of them.', 'Find the dungeons and defeat their keepers. The great beasts of the world carry them too: the golem of cinders, the archmage in his tower, the beast of the maze, the dragons. Bring four Realm Fragments to the rift.');
    return baseSay.call(this, text);
  };
}

// ---- new work on the boards: scout a place, carry word to a neighbour ---------------------------------------------
{
  const base = boardQuests;
  boardQuests = function (g, v) {
    const out = base(g, v);
    const gen = g.world && g.world.gen, day = npcDay(g);
    if (!gen || g.dim !== 0) return out;
    const r = questRand(v.seed, 7, day, 33);
    // a place nobody here has found yet, within a few hundred blocks
    try {
      const seen = new Set(); for (const l of g.locals) for (const k of Object.keys((l.player.stats && l.player.stats.sseen) || {})) seen.add(k);
      let best = null, bd = 480;
      for (let k = 0; k < STRUCTS.length; k++) {
        const T = STRUCTS[k]; if (!T.dims.includes(0) || T.key === 'stronghold' || T.key === 'ancient_city' || !T.reg || T.reg > 4096) continue;
        const rx = Math.floor(v.x / T.reg), rz = Math.floor(v.z / T.reg), span = Math.max(1, Math.ceil(480 / T.reg));
        for (let dz = -span; dz <= span; dz++) for (let dx = -span; dx <= span; dx++) {
          const S = gen.structAt(k, rx + dx, rz + dz); if (!S || seen.has(S.id)) continue;
          const d = Math.hypot((S.x0 + S.x1) / 2 - v.x, (S.z0 + S.z1) / 2 - v.z);
          if (d < bd && d > 40) { bd = d; best = S; }
        }
      }
      if (best && r() < 0.8) {
        const cx = Math.round((best.x0 + best.x1) / 2), cz = Math.round((best.z0 + best.z1) / 2), ang = Math.atan2(cz - v.z, cx - v.x);
        const dirs = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'], dir = dirs[(Math.round(ang / (Math.PI / 4)) + 8) % 8];
        out.push({ id: v.id + ':sc:' + best.id, vid: v.id, giver: -1, from: 'Quest Board', kind: 'scout', sid: best.id, need: 1, at: [cx, cz],
          title: 'Scout: ' + best.name.replace(/^(an?|the) /i, (m) => '').replace(/^./, c => c.toUpperCase()), text: `Travellers speak of ${/^The /.test(best.name) ? best.name.replace(/^The/, 'the') : /^an? /i.test(best.name) ? best.name : 'a ' + best.name} some ${Math.round(bd / 10) * 10} blocks to the ${dir} (near x ${cx}, z ${cz}). Go and see it with your own eyes.`,
          reward: { em: 5 + Math.round(bd / 80), xp: 60, rep: 8, skill: ['exploring', 300] } });
      }
    } catch (e) { console.warn('scout quest', e); }
    // a neighbouring village to carry word to
    try {
      let nb = null, nd = 1e9;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { if (!dx && !dz) continue; const o = gen.villageAt(v.rx + dx, v.rz + dz); if (o) { const d = Math.hypot(o.x - v.x, o.z - v.z); if (d < nd) { nd = d; nb = o; } } }
      if (nb && nd < 1100 && r() < 0.7) {
        const ang = Math.atan2(nb.z - v.z, nb.x - v.x), dirs = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'], dir = dirs[(Math.round(ang / (Math.PI / 4)) + 8) % 8];
        out.push({ id: v.id + ':wd:' + nb.id + ':' + Math.floor(day / 3), vid: nb.id, from: 'Quest Board', fromV: v.id, giver: -1, kind: 'word', need: 1, at: [nb.x, nb.z],
          title: 'Word to ' + nb.name, text: `Carry ${v.name}'s news to ${nb.name}, some ${Math.round(nd / 50) * 50} blocks to the ${dir} (near x ${nb.x}, z ${nb.z}). Speak to their elder or a guard there.`,
          reward: { em: 4 + Math.round(nd / 120), xp: 50, rep: 10, skill: ['exploring', 250] } });
      }
    } catch (e) { console.warn('word quest', e); }
    return out;
  };
  const baseHave = questHave;
  questHave = function (lp, q) {
    if (q.kind === 'scout') return lp.player.stats && lp.player.stats.sseen && lp.player.stats.sseen[q.sid] ? 1 : 0;
    if (q.kind === 'word') { if (!q.have) { const v = villageById(lp.g, q.vid), p = lp.player; if (v && lp.g.dim === 0 && Math.hypot(p.x - v.x, p.z - v.z) < 40) q.have = 1; } return q.have || 0; }
    return baseHave(lp, q);
  };
}
PV.debug.rpg = { storyOf: (lp) => storyOf(lp), hasPerk: (p, k, l) => hasPerk(p, k, l), gain: (lp, k, xp) => skillGain(lp, k, xp), board: (v) => boardQuests(GAME, v), village: () => riftSpawnVillage(GAME), xp: (lp, k) => (skillsOf(lp.player)[k] || 0) };
