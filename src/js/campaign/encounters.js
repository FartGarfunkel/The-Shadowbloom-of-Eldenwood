// ---------------------------------------------------------------------------
// campaign/encounters.js — (alpha 3) things that happen on the road.
//
// Out between the towns, now and then, something happens, and it doesn't come out of nowhere. First there are signs:
// fresh tracks across the road and a howl off in the trees, smoke rising from a camp over the next rise, an overturned
// cart with its goods spilled, a frightened traveller running the other way, black blooms where no flower should be, a
// cold breath and a groan in the dark. Whoever in the party has the sharpest eyes (passive Perception) may read them in
// time: then you come on them unawares, at their camp, and choose how to go in. Miss the signs (or travel at night,
// carelessly) and it's an ambush, from the trees on either side. Sometimes it's only a traveller with news of the road
// ahead (and the news is often a warning). The roads are safer than the wilds, the night worse than the day, and the
// further from Stonebridge, the harder the road.
// ---------------------------------------------------------------------------

const ENC_RT = { t: 0, cool: 90, active: null, placed: [], dist: 0, last: null };
// each: where it happens, when, how often (w), who (first type that exists), how many, the signs, and what's said
const ENCOUNTERS = [
  { id: 'wolves', where: 'wild', w: 3, mobs: [['dire_wolf', 'wolf'], 3, 5], signs: ['tracks', 'howl'], tracks: 'Fresh wolf tracks cross your path, a lot of them, heading the same way.', near: 'A howl, close now, then another answering it.' },
  { id: 'bandits', where: 'road', w: 3, mobs: [['bandit', 'raider'], 3, 4], lead: ['bandit_captain', 'raider'], signs: ['cart', 'fleeing'], flee: '“Turn back! There\'s brigands at the cart up the road. They took everything!”', near: 'Too quiet. The birds have stopped.' },
  { id: 'brigand_camp', where: 'any', w: 2, mobs: [['bandit', 'raider'], 3, 5], lead: ['bandit_captain', 'raider'], signs: ['smoke'], camp: true, smoke: 'Smoke rises over the next rise: a camp, and not a careful one.', near: 'Voices round a fire, and the clink of a bottle.' },
  { id: 'goblins', where: 'wild', w: 2, mobs: [['goblin', 'raider'], 4, 6], lead: ['hobgoblin', 'goblin'], signs: ['smoke', 'chatter'], camp: true, smoke: 'A thin smoke above the trees, and a smell of burnt meat.', near: 'High voices squabbling in a tongue like breaking sticks.' },
  { id: 'undead', where: 'any', night: true, w: 2.5, mobs: [['ghoul', 'zombie', 'skeleton'], 3, 5], signs: ['cold'], near: 'The air turns cold. Something ahead groans, and the groan is answered.' },
  { id: 'cultists', where: 'any', w: 2, after: 'q1', mobs: [['bloom_cultist', 'cultist', 'raider'], 2, 4], lead: ['bloom_hexer', 'bloom_cultist'], signs: ['blooms'], blooms: 'Black-veined blooms push up beside the path, pulsing faintly. They weren\'t planted. They were left.', near: 'Low chanting, in a rhythm that sets your teeth on edge.' },
  { id: 'bear', where: 'wild', w: 1, mobs: [['brown_bear', 'bear'], 1, 1], signs: ['tracks'], tracks: 'Claw marks score a tree trunk higher than your head, and the bark is still weeping sap.', near: 'Something big is breathing in the brush.' },
  { id: 'spiders', where: 'wild', w: 1, mobs: [['giant_spider', 'spider'], 2, 4], signs: ['webs'], webs: 'Webs between the trees, thick as rope, with something wrapped in one.', near: 'A dry skittering, all around and above.' },
  // peaceful: a traveller, with news (often of what's ahead)
  { id: 'traveller', where: 'road', w: 2, peaceful: true },
];
const ENC_TRAVEL_LINES = [
  'Watch the road east of here. Wolves took a cart two nights back.', 'If you\'re going past the old stones, go by daylight. Folk hear singing there.',
  'The bridges are sound, but the wilds aren\'t. Stay on the road after dark.', 'Bandits on the Oakhaven road, they say. A whole cart, gone.',
  'There\'s black flowers growing by the ditches now. My gran says don\'t touch them.', 'Stonebridge shuts its gates at dusk. Don\'t get caught outside.',
  'Fine weather for it. Mind the marsh road, it eats boots.', 'Seen lights in the hills at night. Not lanterns.',
];
// (alpha 4 balance) how much a fight should hold, by the D&D encounter budget: the party's levels and numbers set it,
// the land's danger leans on it (easy by day on the roads near Stonebridge, hard in the far wilds at night)
const ENC_CR_XP = [[0, 10], [0.125, 25], [0.25, 50], [0.5, 100], [1, 200], [2, 450], [3, 700], [4, 1100], [5, 1800], [6, 2300], [7, 2900], [8, 3900], [9, 5000], [10, 5900], [11, 7200], [12, 8400], [13, 10000], [14, 11500], [15, 13000], [16, 15000], [17, 18000], [18, 20000], [19, 22000], [20, 25000], [21, 33000], [22, 41000], [23, 50000], [24, 62000], [30, 155000]];
const ENC_MEDIUM = [0, 50, 100, 150, 250, 500, 600, 750, 1000, 1100, 1200, 1600, 2000, 2200, 2500, 2800, 3200, 3900, 4200, 4900, 5700];
function encXpOf(type) {
  const T = MOB_TYPES[type]; if (!T) return 50;
  if (T.cr != null) { let xp = 10; for (const [c, v] of ENC_CR_XP) if (c <= T.cr) xp = v; return xp; }
  if (T.dndXp) return T.dndXp;
  const hp = T.hp || 10; return Math.round(hp * hp * 0.07 + hp * 1.6);
}
function encMult(n) { return n <= 1 ? 1 : n === 2 ? 1.5 : n <= 6 ? 2 : n <= 10 ? 2.5 : 3; }
function encBudget(g, k) {
  const lv = Math.max(1, ...g.locals.map(l => (dndOf(l.player) || { level: 1 }).level));
  const n = Math.max(1, g.pawns().filter(p => !p.dead).length);
  return (ENC_MEDIUM[Math.min(20, lv)] || 50) * n * (k || 1);
}
// the strongest of the listed kinds the budget allows, and how many
function encPick(g, E, danger) {
  const budget = encBudget(g, Math.max(0.6, Math.min(2.2, (danger || 1) * 1.6)));
  const list = [].concat(E.mobs[0]).filter(k => k && MOB_TYPES[k]);
  if (!list.length) return null;
  for (const t of list) {
    const xp = encXpOf(t);
    let n = 0; for (let k = E.mobs[2]; k >= 1; k--) if (xp * k * encMult(k) <= budget) { n = k; break; }
    if (n >= Math.min(E.mobs[1], 2)) {
      const L = E.lead && encType(E.lead), lead = L && L !== t && (xp * n + encXpOf(L)) * encMult(n + 1) <= budget * 1.15 ? L : null;
      return { type: t, n, lead };
    }
  }
  const t = list.reduce((a, k) => encXpOf(k) < encXpOf(a) ? k : a, list[0]);   // too much for them even in pairs: the weakest kind
  return { type: t, n: encXpOf(t) * 3 <= budget ? 2 : 1, lead: null };
}
function encType(list) { for (const k of [].concat(list)) if (k && MOB_TYPES[k]) return k; return null; }
// how dangerous the land is here: further from the hub is harder; the night adds; the road takes some away
function encDanger(C, x, z, onRoad, night) {
  const hub = C.towns[(C.start && C.start.town) || Object.keys(C.towns)[0]];
  const d = hub ? Math.hypot(x - hub.at[0], z - hub.at[1]) : 300;
  return Math.min(1.6, 0.35 + d / 900) * (night ? 1.5 : 1) * (onRoad ? 0.6 : 1);
}
function encPartyPerception(g) {
  let best = 10;
  for (const l of g.locals) { const c = dndOf(l.player); if (c) best = Math.max(best, 10 + dndSkillBonus(c, 'perception') + (c.feats && c.feats.includes('watchful') ? 5 : 0)); }
  return best;
}
function encTick(g, dt) {
  const C = campDef(g);
  if (!C || g.isGuest || g.dim !== 0 || !g.world || g.state !== 'playing') return;
  if (g.rules && g.rules().encounters === false) return;
  if (ENC_RT.world !== g.meta.id) { ENC_RT.world = g.meta.id; ENC_RT.active = null; ENC_RT.last = null; ENC_RT.dist = 0; ENC_RT.cool = 90; }
  const ps = g.pawns().filter(p => !p.dead); if (!ps.length) return;
  const lead = ps[0];
  // how far the party has gone since the last thing that happened
  if (ENC_RT.last) ENC_RT.dist += Math.min(8, Math.hypot(lead.x - ENC_RT.last[0], lead.z - ENC_RT.last[1]));
  ENC_RT.last = [lead.x, lead.z];
  if (ENC_RT.active) { encRun(g, C, ENC_RT.active, dt); return; }
  ENC_RT.cool -= dt;
  if ((ENC_RT.t -= dt) > 0) return;
  ENC_RT.t = 4;
  if (ENC_RT.cool > 0 || ENC_RT.dist < 140) return;
  // not in a town, not by a place of the story, not asleep
  if (Object.values(C.towns).some(T => Math.hypot(T.at[0] - lead.x, T.at[1] - lead.z) < campTownR(T) + 40)) return;
  if (Object.values(C.places).some(P => Math.hypot(P.at[0] - lead.x, P.at[1] - lead.z) < (P.size || 10) + 30)) return;
  if (g.locals.some(l => l.sleeping) || g.lateHeld && g.lateHeld() && g.locals.some(l => l.sleeping)) return;
  const net = campRoadsOf(g.world.gen), R = net ? campRoadNear(net, Math.floor(lead.x), Math.floor(lead.z)) : null, onRoad = !!(R && R.d < 5);
  const night = g.env && g.env.day < 0.4;
  const danger = encDanger(C, lead.x, lead.z, onRoad, night);
  // about one encounter in every few minutes of travel, more in the dark and the far places
  if (Math.random() > 0.11 * danger) return;
  const S = campState(g);
  const pool = ENCOUNTERS.filter(E => (E.where === 'any' || (E.where === 'road') === onRoad || (E.where === 'wild' && !onRoad)) && (!E.night || night) && (!E.after || (S.quests[E.after] && S.quests[E.after].done)) && (E.peaceful || encType(E.mobs[0])));
  if (!pool.length) return;
  let r = Math.random() * pool.reduce((a, E) => a + E.w, 0), E = pool[0];
  for (const e of pool) if ((r -= e.w) <= 0) { E = e; break; }
  encStart(g, C, E, lead, danger, night);
}
// pick the spot ahead, the way the party is heading (or off to the side of the road)
function encStart(g, C, E, lead, danger, night) {
  const w = g.world, vx = lead.x - (ENC_RT.prev ? ENC_RT.prev[0] : lead.x - Math.sin(lead.yaw || 0)), vz = lead.z - (ENC_RT.prev ? ENC_RT.prev[1] : lead.z - Math.cos(lead.yaw || 0));
  let a = Math.atan2(-Math.sin(lead.yaw || 0), -Math.cos(lead.yaw || 0));
  if (Math.hypot(vx, vz) > 0.5) a = Math.atan2(vx, vz);
  const dist = E.peaceful ? 34 : E.camp ? 52 : 40;
  let at = null;
  for (let k = 0; k < 8 && !at; k++) {
    const aa = a + (Math.random() - 0.5) * (0.6 + k * 0.2), x = Math.floor(lead.x + Math.sin(aa) * dist), z = Math.floor(lead.z + Math.cos(aa) * dist);
    if (!w.isLoaded(x, z)) continue;
    const y = findSafeY(w, x, z); if (y < SEA || T_LIQUID[w.getBlock(x, y - 1, z)]) continue;
    at = [x, y, z];
  }
  if (!at) return;
  ENC_RT.dist = 0; ENC_RT.cool = 150 + Math.random() * 150;
  const spotted = encPartyPerception(g) >= 12 + Math.round(danger * 4) + (night ? 3 : 0) + Math.floor(Math.random() * 6);
  ENC_RT.active = { E, at, t: 0, phase: 'signs', spotted, danger, night, mobs: [], placed: [], said: {} };
  encSigns(g, ENC_RT.active, lead);
}
function encSay(g, A, k, text, kind) { if (!text || A.said[k]) return; A.said[k] = 1; for (const l of g.locals) if (Math.hypot(l.player.x - A.at[0], l.player.z - A.at[2]) < 90) l.toast(text, kind || ''); }
function encPut(g, A, x, y, z, key, meta = 0) { const w = g.world; if (B[key] === undefined || w.getBlock(x, y, z)) return false; w.setBlock(x, y, z, B[key], meta); A.placed.push([x, y, z, B[key]]); return true; }
function encSound(g, name, x, y, z, r) { try { if (g.sfx) g.sfx.playAt(name, x, y, z, r || 64); } catch (e) { /* quiet */ } }
// the signs that something's ahead
function encSigns(g, A, lead) {
  const E = A.E, [x, y, z] = A.at;
  if (E.peaceful) return;
  for (const s of E.signs) {
    if (s === 'tracks') encSay(g, A, 'tracks', E.tracks);
    if (s === 'howl') encSound(g, 'wolf_howl', x, y + 2, z, 96);
    if (s === 'smoke' || E.camp) { encPut(g, A, x, y, z, 'campfire'); encSay(g, A, 'smoke', E.smoke); }
    if (s === 'blooms') { for (let k = 0; k < 6; k++) { const bx = x + Math.round((Math.random() - 0.5) * 10), bz = z + Math.round((Math.random() - 0.5) * 10), by = findSafeY(g.world, bx, bz); if (by > SEA) encPut(g, A, bx, by, bz, B.shadow_bloom !== undefined ? 'shadow_bloom' : 'wither_rose'); } encSay(g, A, 'blooms', E.blooms); }
    if (s === 'webs') { for (let k = 0; k < 7; k++) { const bx = x + Math.round((Math.random() - 0.5) * 12), bz = z + Math.round((Math.random() - 0.5) * 12), by = findSafeY(g.world, bx, bz) + Math.floor(Math.random() * 3); encPut(g, A, bx, by, bz, 'cobweb'); } encSay(g, A, 'webs', E.webs); }
    if (s === 'cart') {
      // an overturned cart across the road, its goods spilled
      const w = g.world;
      encPut(g, A, x, y, z, 'barrel'); encPut(g, A, x + 1, y, z, 'spruce_slab'); encPut(g, A, x - 1, y, z + 1, 'spruce_slab'); encPut(g, A, x + 1, y + 1, z, 'spruce_trapdoor', 4);
      if (encPut(g, A, x, y, z + 1, 'item_pile')) try { w.setEntity(x, y, z + 1, { type: 'pile', items: [{ id: 'bread', n: 2 }, { id: 'arrow', n: 4 }, ITEMS.wheat ? { id: 'wheat', n: 3 } : null, null], rot: [0.4, -0.3, 0.9, 0] }); } catch (err) { /* no goods */ }
      encSay(g, A, 'cart', 'An overturned cart lies across the way ahead, its goods spilled in the mud. No horse. No driver.');
    }
    if (s === 'fleeing' && MOB_TYPES.villager) {
      // someone running from it, toward you
      const m = new Mob(g, 'villager', x + 0.5, y, z + 0.5); m.encFlee = { to: [lead.x, lead.z], t: 14, line: E.flee }; m.kept = false; g.addEntity(m); A.mobs.push(m);
    }
  }
}
function encRun(g, C, A, dt) {
  A.t += dt;
  const ps = g.pawns().filter(p => !p.dead), [x, y, z] = A.at, E = A.E;
  const nearest = ps.reduce((b, p) => Math.min(b, Math.hypot(p.x - x, p.z - z)), 1e9);
  // the party went another way: it waits a little, then it's over
  if (nearest > 140 || A.t > 300) { encEnd(g, A); return; }
  if (A.phase === 'signs') {
    if (E.peaceful) { if (nearest < 46) encTraveller(g, A); return; }
    if (E.signs.includes('howl') && !A.said.howl2 && A.t > 9) { A.said.howl2 = 1; encSound(g, 'wolf_howl', x, y + 2, z, 96); }
    const close = A.spotted ? 30 : 22;
    if (nearest < close || A.t > (A.spotted ? 120 : 45)) {
      encSay(g, A, 'near', E.near, 'warn');
      if (A.spotted && E.camp) encSpawn(g, A, 'camp');
      else if (A.spotted) { encSpawn(g, A, 'ahead'); for (const l of g.locals) l.toast('You see them before they see you.', 'good'); }
      else encSpawn(g, A, 'ambush');
      A.phase = 'fight';
    }
    return;
  }
  if (A.phase === 'fight') {
    const alive = A.mobs.filter(m => m.alive && !m.remove && !m.encFlee);
    if (!alive.length && A.t > 3) { if (!A.peace) for (const l of g.locals) if (Math.hypot(l.player.x - x, l.player.z - z) < 80) l.toast('The road is quiet again.', 'good'); A.peace = true; A.phase = 'after'; A.afterT = 0; }
    return;
  }
  if (A.phase === 'after') { if ((A.afterT += dt) > 40 || nearest > 60) encEnd(g, A); }
}
function encSpawn(g, A, how) {
  const E = A.E, w = g.world, [x, y, z] = A.at, ps = g.pawns().filter(p => !p.dead);
  const pk = encPick(g, E, A.danger); if (!pk) return;
  const type = pk.type, n = pk.n;
  const lead = ps.reduce((b, p) => (!b || Math.hypot(p.x - x, p.z - z) < Math.hypot(b.x - x, b.z - z) ? p : b), null);
  const spots = [];
  for (let i = 0; i < n + (pk.lead ? 1 : 0); i++) {
    let sx, sz;
    if (how === 'ambush' && lead) {
      // out of the trees on either side, and one behind
      const a = Math.atan2(x - lead.x, z - lead.z), side = (i % 2 ? 1 : -1) * (Math.PI / 2) + (i === n - 1 ? Math.PI / 2 : 0) + (Math.random() - 0.5) * 0.5, r = 11 + Math.random() * 5;
      sx = lead.x + Math.sin(a + side) * r; sz = lead.z + Math.cos(a + side) * r;
    } else { const a = (i / n) * TAU + Math.random() * 0.4, r = how === 'camp' ? 3 + Math.random() * 2 : 2 + Math.random() * 4; sx = x + Math.sin(a) * r; sz = z + Math.cos(a) * r; }
    if (!w.isLoaded(Math.floor(sx), Math.floor(sz))) continue;
    const sy = findSafeY(w, sx, sz); if (sy < 1) continue;
    spots.push([sx, sy, sz]);
  }
  spots.forEach(([sx, sy, sz], i) => {
    const t = i === spots.length - 1 && pk.lead ? pk.lead : type;
    const m = new Mob(g, t, sx, sy, sz);
    m.encOf = E.id; m.kept = false;
    if (how === 'camp') { m.yaw = Math.atan2(-(x - sx), -(z - sz)); m.encCalm = 1; }
    g.addEntity(m); A.mobs.push(m);
  });
  if (how === 'ambush') for (const l of g.locals) l.toast('Ambush!', 'warn');
}
function encTraveller(g, A) {
  if (A.met) return; A.met = true;
  const [x, y, z] = A.at;
  if (!MOB_TYPES.villager) { encEnd(g, A); return; }
  const m = new Mob(g, 'villager', x + 0.5, y, z + 0.5); m.kept = false; m.encWalk = { t: 60 }; g.addEntity(m); A.mobs.push(m);
  const line = ENC_TRAVEL_LINES[Math.floor(Math.random() * ENC_TRAVEL_LINES.length)];
  A.phase = 'after'; A.afterT = -30; A.line = line;
  m.encLine = line;
}
function encEnd(g, A) {
  const w = g.world, ps = g.pawns().filter(p => !p.dead);
  // what was put down comes away when nobody's watching (the camp's ashes stay a while)
  for (const [x, y, z, id] of A.placed) if (w.isLoaded(x, z) && w.getBlock(x, y, z) === id && !ps.some(p => Math.hypot(p.x - x, p.z - z) < 24)) w.setBlock(x, y, z, 0, 0);
  for (const m of A.mobs) if (m.alive && !m.remove && !ps.some(p => Math.hypot(p.x - m.x, p.z - m.z) < 32)) m.remove = true;
  ENC_RT.active = null;
}
{
  // the frightened traveller runs past and is gone; the peaceful one tells you the news when you come near
  const baseAI = Mob.prototype.controlAI;
  Mob.prototype.controlAI = function (dt, ...rest) {
    const F = this.encFlee;
    if (F) {
      const ps = this.game.pawns().filter(p => !p.dead), near = ps.reduce((b, p) => (!b || Math.hypot(p.x - this.x, p.z - this.z) < Math.hypot(b.x - this.x, b.z - this.z) ? p : b), null);
      const a = F.said || !near ? (near ? Math.atan2(this.x - near.x, this.z - near.z) : 0) : Math.atan2(near.x - this.x, near.z - this.z);
      return { want: 4.2, dir: Math.atan2(-Math.sin(a), -Math.cos(a)) };
    }
    return baseAI.call(this, dt, ...rest);
  };
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    if (this.encFlee) {
      const F = this.encFlee; F.t -= dt;
      const g = this.game, ps = g.pawns().filter(p => !p.dead), near = ps.find(p => Math.hypot(p.x - this.x, p.z - this.z) < 7);
      if (near && F.line && !F.said) { F.said = true; for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 16) l.toast(`A frightened traveller: ${F.line}`, 'warn'); }
      if (F.t <= 0 && !ps.some(p => Math.hypot(p.x - this.x, p.z - this.z) < 30 && (typeof campSeen !== 'function' || campSeen(g, this)))) { this.remove = true; return; }
    }
    if (this.encLine) {
      const g = this.game, l = g.locals.find(l => Math.hypot(l.player.x - this.x, l.player.z - this.z) < 5);
      if (l && !this.encSaid) { this.encSaid = true; for (const q of g.locals) if (Math.hypot(q.player.x - this.x, q.player.z - this.z) < 12) q.toast(`A traveller on the road: “${this.encLine}”`, ''); this.yaw = Math.atan2(-(l.player.x - this.x), -(l.player.z - this.z)); }
    }
    return baseUpd.call(this, dt);
  };
}
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { encTick(this, dt); } catch (e) { console.warn('encounters', e); } return baseUpd.call(this, dt); };
}
RULE_DEFAULTS.encounters = true;
RULE_TOGGLES.push(['encounters', 'Travel encounters', 'Campaign worlds: things happen on the road between towns (with signs beforehand: tracks, smoke, a frightened traveller)']);
if (typeof window !== 'undefined') window.__enc = { rt: ENC_RT, start: (id) => { const g = GAME, C = campDef(g), E = ENCOUNTERS.find(e => e.id === id); const lead = g.locals[0].player; ENC_RT.prev = [lead.x - Math.sin(lead.yaw), lead.z - Math.cos(lead.yaw)]; encStart(g, C, E, lead, 1, false); return !!ENC_RT.active; }, hire: (vid) => hireOpen(GAME.locals[0], vid), hires: () => GAME.meta.hires };
