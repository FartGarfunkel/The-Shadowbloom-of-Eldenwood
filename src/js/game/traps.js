// ---------------------------------------------------------------------------
// game/traps.js — (alpha 3) traps and locks in the dungeons, and the skill checks that go with them.
//
// Some corridors in every dungeon are trapped: darts from the walls, a pit under loose flagstones, a jet of fire, a
// weighted net. Whoever has the sharpest eyes (passive Perception) may spot one before stepping on it: it glints, and
// you're told. A spotted trap can be stepped round carefully (sneak across it), or disarmed: sneak and use it with
// thieves' tools (Sleight of Hand). Miss by a lot and it goes off. If it catches you, a Dexterity save halves the harm.
// The chests in a dungeon's treasure rooms are locked: thieves' tools pick them (Sleight of Hand), or you can force them
// (Athletics), and a bad try jams them for a moment. The checks show what you rolled.
// ---------------------------------------------------------------------------

const TRAP_KINDS = {
  dart: { name: 'a dart trap', dmg: [2, 6], type: 'piercing', poison: true, save: 'dex', line: 'Darts hiss out of the walls!' },
  pit: { name: 'a pit trap', dmg: [2, 6], type: 'bludgeoning', save: 'dex', slow: 3, line: 'The flagstones give way under you!' },
  fire: { name: 'a fire jet', dmg: [3, 6], type: 'fire', save: 'dex', burn: true, line: 'Fire roars out of the floor!' },
  net: { name: 'a net trap', dmg: [1, 4], type: 'bludgeoning', save: 'str', slow: 5, line: 'A weighted net drops on you!' },
};
function trapsOf(plan) {
  if (!plan || !plan.corridors) return [];
  if (plan._traps) return plan._traps;
  const out = [], ks = Object.keys(TRAP_KINDS);
  plan.corridors.forEach(([a, b], i) => {
    if (!a || !b) return;
    const h = hash32(plan.seed | 0, i, 77, 13);
    if ((h % 100) >= 45) return;
    const t = 0.35 + ((h >>> 8) % 30) / 100;
    out.push({ key: plan.id + ':' + i, x: Math.floor(a.x + (b.x - a.x) * t), z: Math.floor(a.z + (b.z - a.z) * t), y: a.y, kind: ks[(h >>> 12) % ks.length], dc: 12 + ((h >>> 16) % 4) + (plan.place ? 1 : 0) });
  });
  return (plan._traps = out);
}
function trapRec(g) { return g.meta.traps || (g.meta.traps = {}); }
function dndCheck(lp, skill, dc, label) {
  const c = dndOf(lp.player); const bonus = c ? (DND_SKILLS[skill] ? dndSkillBonus(c, skill) : dndMod(c.ab[skill] || 10)) : 0;
  const roll = dndRoll(1, 20).total, total = roll + bonus, ok = total >= dc;
  lp.toast(`${label}: ${roll} ${bonus >= 0 ? '+' : '−'} ${Math.abs(bonus)} = ${total} vs ${dc} · ${ok ? 'success' : 'failure'}`, ok ? 'good' : 'warn');
  return { ok, by: total - dc };
}
const TRAP_RT = { t: 0 };
function trapsTick(g, dt) {
  if (g.isGuest || g.dim !== 0 || !g.world || !g.world.gen.dungeonsNear) return;
  if ((TRAP_RT.t -= dt) > 0) return;
  TRAP_RT.t = 0.2;
  const R = trapRec(g);
  for (const l of g.locals) {
    const p = l.player; if (p.dead) continue;
    for (const d of g.world.gen.dungeonsNear(p.x, p.z, 4)) {
      if (Math.abs(p.y - d.y) > 8) continue;
      for (const T of trapsOf(d)) {
        const st = R[T.key]; if (st === 'disarmed' || st === 'sprung') continue;
        const dist = Math.hypot(p.x - (T.x + 0.5), p.z - (T.z + 0.5)), K = TRAP_KINDS[T.kind];
        // spotting it: passive Perception, once, from a few steps off
        if (!T.spotted && dist < 6) {
          T.looked = T.looked || {};
          if (!T.looked[l.name]) { T.looked[l.name] = 1; const c = dndOf(p), pp = c ? 10 + dndSkillBonus(c, 'perception') : 10; if (pp >= T.dc) { T.spotted = true; l.toast(`You spot ${K.name} in the floor ahead. Sneak to step round it, or sneak and use it with thieves' tools to disarm`, 'good'); } }
        }
        if (T.spotted && dist < 8 && Math.random() < 0.3) spellSpark(g, T.x + 0.5 + (Math.random() - 0.5) * 0.8, T.y + 0.1, T.z + 0.5 + (Math.random() - 0.5) * 0.8, 'mana_fire', { life: 0.5, size: 0.05 });
        // stepping on it
        if (dist < 0.8 && Math.abs(p.y - (T.y + 1)) < 1.6 && !(T.spotted && p.sneaking)) trapSpring(g, l, T);
      }
    }
  }
}
function trapSpring(g, l, T) {
  const K = TRAP_KINDS[T.kind], p = l.player, c = dndOf(p);
  trapRec(g)[T.key] = 'sprung';
  l.toast(K.line, 'warn');
  let dmg = dndRoll(K.dmg[0], K.dmg[1]).total;
  if (c) { const sv = dndRoll(1, 20).total + dndMod(c.ab[K.save]) + (c.d && c.d.saves && c.d.saves[K.save] ? c.d.saves[K.save] - dndMod(c.ab[K.save]) : 0); if (sv >= T.dc) { dmg = Math.floor(dmg / 2); l.toast(`${K.save === 'dex' ? 'Dexterity' : 'Strength'} save ${sv} vs ${T.dc}: half harm`, 'good'); } }
  l.hurt(dmg, { type: K.type, trap: true });
  if (K.poison && typeof giveEffect === 'function') giveEffect(l, 'poison', 4, 0);
  if (K.burn) p.burn = Math.max(p.burn || 0, 3);
  if (K.slow && typeof giveEffect === 'function') giveEffect(l, 'slowness', K.slow, 1);
  g.sfx.playAt(T.kind === 'fire' ? 'spell_fire' : 'dig_gravel', T.x + 0.5, T.y + 1, T.z + 0.5, 16);
  if (T.kind === 'fire') for (let i = 0; i < 30; i++) g.flame(T.x + 0.5 + (Math.random() - 0.5), T.y + 1 + Math.random() * 1.5, T.z + 0.5 + (Math.random() - 0.5));
}
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { trapsTick(this, dt); } catch (e) { console.warn('traps', e); } return baseUpd.call(this, dt); };
  // disarming (sneak + use near a spotted trap with thieves' tools), and the locked chests
  const baseUse = LocalPlayer.prototype.useBlockAt;
  LocalPlayer.prototype.useBlockAt = function (hit, held, def) {
    try {
      const g = this.g, p = this.player;
      if (g.dim === 0 && g.world.gen.dungeonsNear && hit) {
        const near = g.world.gen.dungeonsNear(p.x, p.z, 4).filter(d => Math.abs(p.y - d.y) < 10);
        if (near.length && p.sneaking) {
          for (const d of near) for (const T of trapsOf(d)) {
            if (!T.spotted || trapRec(g)[T.key] || Math.hypot(hit.x - T.x, hit.z - T.z) > 1.5) continue;
            if (!p.inv.count('thieves_tools') && !(p.inv.held && p.inv.held.id === 'thieves_tools')) { this.toast('You need thieves\' tools to disarm it', 'warn'); return true; }
            const r = dndCheck(this, 'sleight', T.dc, 'Disarm (Sleight of Hand)');
            if (r.ok) { trapRec(g)[T.key] = 'disarmed'; this.toast(`${TRAP_KINDS[T.kind].name} is disarmed`, 'good'); if (this.grantXP) this.grantXP(15, T.x, T.y + 1, T.z); }
            else if (r.by <= -5) trapSpring(g, this, T);
            return true;
          }
        }
        const id = hit.id, b = BLOCKS[id];
        if (near.length && b && b.key === 'chest') {
          const key = 'c' + hit.x + ',' + hit.y + ',' + hit.z, R = trapRec(g);
          const d = near.find(d => d.rooms && d.rooms.some(r => r.kind === 'loot' && Math.abs(r.x - hit.x) <= r.R + 1 && Math.abs(r.z - hit.z) <= r.R + 1));
          if (d && !R[key]) {
            if ((this._jamT || 0) > g.time) { this.toast('The lock is jammed. Give it a moment', 'warn'); return true; }
            const dc = 13 + (d.place ? 2 : 0), tools = p.inv.count('thieves_tools') > 0 || (p.inv.held && p.inv.held.id === 'thieves_tools');
            const r = tools ? dndCheck(this, 'sleight', dc, 'Pick the lock (Sleight of Hand)') : dndCheck(this, 'athletics', dc + 2, 'Force the lock (Athletics)');
            if (!r.ok) { this._jamT = g.time + 6; g.sfx.playAt('door_iron' in (typeof SND_FX !== 'undefined' ? SND_FX : {}) ? 'door_iron' : 'click', hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, 12); return true; }
            R[key] = 1; this.toast('The lock gives', 'good');
          }
        }
      }
    } catch (e) { /* a plain use */ }
    return baseUse.call(this, hit, held, def);
  };
}
