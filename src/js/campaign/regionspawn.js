// ---------------------------------------------------------------------------
// campaign/regionspawn.js — (alpha 3) the creatures of each land, where they belong.
//
// Each creature of the SRD (game/dnd_monsters1-3.js) names the lands it lives in (`region`): farms, plains, hills, forest,
// vale, duskwood, marsh, mountain, peaks, caverns, coast, sea, desert, shadowfell, crypt. Out in a campaign world, every
// few seconds, the land you're standing in is worked out (the campaign's own lands first: the Razorwood is forest, the
// Marshes marsh, the Shadowfell Forest the Shadowfell, the Plains of Silent Stones plains; then the ground itself: sea,
// beach, desert, mountains, underground), and one of its creatures may come: never in town, never where you can see it
// appear, not too many at once, nocturnal ones at night and day-walkers by day, and none far beyond the party (the
// challenge rating follows your level). Bosses (`boss`) only come where the story puts them.
// ---------------------------------------------------------------------------

const RSPAWN = { t: 4, pools: null };
function rspawnPools() {
  if (RSPAWN.pools) return RSPAWN.pools;
  const P = {};
  for (const [k, T] of Object.entries(MOB_TYPES)) {
    if (!T || !T.region || T.boss || !T.hostile && !T.neutralBeast) continue;
    for (const r of [].concat(T.region)) (P[r] || (P[r] = [])).push(k);
  }
  return (RSPAWN.pools = P);
}
// the lands of the story, tagged: by kind and where they lie
function rspawnLandRegion(l) {
  if (l.region) return l.region;
  const at = l.at;
  if (l.kind === 'mountain') return (l.h || 30) > 40 ? ['mountain', 'peaks'] : ['mountain'];
  if (l.kind === 'marsh') return ['marsh'];
  if (l.kind === 'basin') return ['vale'];
  if (l.kind === 'hills') return ['hills'];
  if (l.kind === 'lake') return ['sea'];
  if (l.kind === 'forest') {
    if (l.temp != null && l.temp < -0.1) return ['shadowfell'];
    if (l.humid >= 0.6 && Math.abs(at[0] - 150) < 30 && Math.abs(at[1] - 360) < 30) return ['duskwood'];
    return ['forest'];
  }
  if (l.biome === 'desert') return ['desert'];
  if (l.biome === 'plains') return ['plains'];
  return null;
}
function rspawnRegionAt(g, x, y, z) {
  const gen = g.world.gen, C = campDef(g);
  const col = gen.column(Math.floor(x), Math.floor(z));
  if (y < col.h - 12) return ['caverns'];
  const L = C && campLandsOf(gen);
  // (alpha 8) the most particular land here decides: the vale's basin inside the lowland around it, a heart inside a wood
  if (L) { let best = null, bestR = Infinity; for (const l of L) { if (l.auto || l.r >= bestR || (l.bx0 !== undefined && !campLandIn(l, x, z))) continue; const d = campLandD(l, x, z); if (d < l.r + (l.fade || 0) * 0.5) { const r = rspawnLandRegion(l); if (r) { best = r; bestR = l.r; } } } if (best) return best; }
  if (col.h < SEA - 1) return ['sea'];
  if (col.biome === BIOME.BEACH) return ['coast'];
  if (col.biome === BIOME.DESERT) return ['desert'];
  if (col.biome === BIOME.MOUNTAINS) return col.h > SEA + 40 ? ['peaks', 'mountain'] : ['mountain', 'hills'];
  if (col.biome === BIOME.FOREST || col.biome === BIOME.TAIGA) return ['forest'];
  if (C && Object.values(C.towns).some(T => Math.hypot(T.at[0] - x, T.at[1] - z) < campTownR(T) + 160)) return ['farms', 'plains'];
  return ['plains', 'hills'];
}
function rspawnTick(g, dt) {
  const C = campDef(g);
  if (!C || g.isGuest || g.dim !== 0 || !g.world || g.state !== 'playing') return;
  if (g.rules && g.rules().regionSpawns === false) return;
  if ((RSPAWN.t -= dt) > 0) return;
  RSPAWN.t = 6;
  const ps = g.pawns().filter(p => !p.dead); if (!ps.length) return;
  const P = ps[Math.floor(Math.random() * ps.length)];
  if (Object.values(C.towns).some(T => Math.hypot(T.at[0] - P.x, T.at[1] - P.z) < campTownR(T) + 20)) return;
  const night = g.env && g.env.day < 0.4;
  const near = g.entities.filter(e => e instanceof Mob && e.alive && e.T.hostile && e._rspawn && Math.hypot(e.x - P.x, e.z - P.z) < 64).length;
  if (near >= (night ? 6 : 3)) return;
  if (Math.random() > (night ? 0.55 : 0.3)) return;
  const regs = rspawnRegionAt(g, P.x, P.y, P.z), pools = rspawnPools();
  if (regs[0] === 'caverns') return;          // under the ground the dungeons and caves keep their own
  // (alpha 4 balance) by the D&D encounter budget for the party, not a fixed fraction of the level: a lone level-12
  // hero met CR 9 creatures (a deadly fight for four); now about CR 5 alone, CR 7 for two
  const budget = typeof encBudget === 'function' ? encBudget(g, night ? 1.15 : 0.9) : 200;
  let cands = [];
  for (const r of regs) for (const k of pools[r] || []) { const T = MOB_TYPES[k]; if ((typeof encXpOf === 'function' ? encXpOf(k) : 100) > budget) continue; if (T.night && T.night === true && !night) continue; if (T.day === true && night) continue; cands.push(k); }
  cands = [...new Set(cands)]; if (!cands.length) return;
  // weaker creatures are commoner
  const pick = () => { let tot = 0; const w = cands.map(k => { const v = 1 / (1 + (MOB_TYPES[k].cr ?? 1)); tot += v; return v; }); let r = Math.random() * tot; for (let i = 0; i < cands.length; i++) if ((r -= w[i]) <= 0) return cands[i]; return cands[0]; };
  const type = pick(), T = MOB_TYPES[type], sea = regs.includes('sea');
  let n = (T.cr ?? 1) <= 0.25 ? 1 + Math.floor(Math.random() * 3) : (T.cr ?? 1) <= 1 ? 1 + (Math.random() < 0.4 ? 1 : 0) : 1;
  if (typeof encXpOf === 'function') while (n > 1 && encXpOf(type) * n * encMult(n) > budget) n--;
  for (let tries = 0; tries < 6; tries++) {
    const a = Math.random() * TAU, d = 26 + Math.random() * 16, x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d;
    if (!g.world.isLoaded(Math.floor(x), Math.floor(z))) continue;
    const y = findSafeY(g.world, x, z); if (y < 1) continue;
    const inWater = T_LIQUID[g.world.getBlock(Math.floor(x), y - 1, Math.floor(z))] || T_LIQUID[g.world.getBlock(Math.floor(x), y, Math.floor(z))];
    if (!!T.swims !== !!(sea && inWater) && (T.swims || inWater)) continue;
    if (Object.values(C.towns).some(Tn => Math.hypot(Tn.at[0] - x, Tn.at[1] - z) < campTownR(Tn) + 10)) continue;
    const probe = { x, y, z, h: T.h || 1.8 };
    if (typeof campSeen === 'function' && campSeen(g, probe)) continue;
    for (let i = 0; i < n; i++) { const m = new Mob(g, type, x + (i % 2) * 1.2, y, z + Math.floor(i / 2) * 1.2); m._rspawn = 1; m.kept = false; g.addEntity(m); }
    return;
  }
}
{
  const baseUpd = Game.prototype.updateEntities;
  Game.prototype.updateEntities = function (dt) { try { rspawnTick(this, dt); } catch (e) { console.warn('region spawns', e); } return baseUpd.call(this, dt); };
}
RULE_DEFAULTS.regionSpawns = true;
RULE_TOGGLES.push(['regionSpawns', 'Creatures of the land', 'Campaign worlds: the SRD\'s creatures roam the lands they belong to (wolves in the woods, scorpions in the desert, the dead in the dark)']);
