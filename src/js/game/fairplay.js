// ---------------------------------------------------------------------------
// game/fairplay.js — 0.9.0.24: fair play.
//
// The full-game pass, part one: the loopholes closed and the numbers evened out.
// A block you put down yourself gives back only itself when you break it (no
// skill experience, no lucky extra ore), so placing and re-mining an ore is no
// longer a mine of its own. Food heals half at once and the rest over a few
// seconds, with a moment between bites, so a stack of steak isn't a second
// health bar. Armour, enchantments and Defence together never stop more than
// four fifths of a blow. And the story's loose ends: the End portal works with
// see-through portals off, one player leaving his realm doesn't drag the rest
// out, LAN guests hear the day and which dungeons are cleared, bounties lapse
// after a week, and shop lists and loot no longer name things that don't exist.
// ---------------------------------------------------------------------------

// ---- 1. what you put there yourself ------------------------------------------------------------------------
const PLACING = { on: false };
function placedAt(w, x, y, z) {
  if (!w || y < 0 || y >= CH) return false;
  const c = w.chunkAt(x >> 4, z >> 4);
  return !!(c && c.placed && c.placed.size && c.placed.has(cidx(x & 15, y, z & 15)));
}
{
  const marks = (b) => !!(b && typeof blockSkill === 'function' && blockSkill(b));
  const baseSet = World.prototype.setBlock;
  World.prototype.setBlock = function (x, y, z, id, meta = 0, opts = {}) {
    const c = y >= 0 && y < CH ? this.chunkAt(x >> 4, z >> 4) : null, i = c ? cidx(x & 15, y, z & 15) : 0, old = c ? c.blocks[i] : 0;
    // the mark goes on first: a block that starts to fall the moment it's set (sand over a gap) carries it with it
    const pl = PLACING.on || !!(opts && opts.placed), mark = !!(c && old !== id && pl && id && marks(BLOCKS[id]));
    if (mark) (c.placed || (c.placed = new Set())).add(i);
    const r = baseSet.call(this, x, y, z, id, meta, opts);
    if (c && old !== id) {
      if (mark) {
        if (c.blocks[i] !== id) c.placed.delete(i);
        else {
          // (0.9.0.31) players joined over the network: the mark goes with the change, so the host (and everyone) keeps it
          const net = this.netGame && this.netGame.net, Q = net && net.blockQ;
          if (Q) for (let k = Q.length - 1; k >= 0 && k >= Q.length - 8; k--) { const b = Q[k]; if (b[0] === x && b[1] === y && b[2] === z && b[3] === id) { b[6] = 1; break; } }
        }
      }
      // (0.9.0.31) a placed block that only changes state in place (redstone ore lighting up, a log stripped, dirt
      // greening) is still the one you put there
      else if (c.placed && c.placed.size && !(id && c.placed.has(i) && marks(BLOCKS[old]) && marks(BLOCKS[id]))) c.placed.delete(i);
    }
    return r;
  };
  // (0.9.0.31) sand and gravel you put down are still yours after they fall, and so is what a piston pushes
  const baseFall = Game.prototype.checkFall;
  Game.prototype.checkFall = function (x, y, z) {
    const pl = !this.isGuest && placedAt(this.world, x, y, z), n = this.entities.length;
    const r = baseFall.call(this, x, y, z);
    if (pl) for (let k = n; k < this.entities.length; k++) if (this.entities[k] instanceof FallingBlock) this.entities[k].placed = true;
    return r;
  };
  const baseFB = FallingBlock.prototype.update;
  FallingBlock.prototype.update = function (dt) {
    if (!this.placed) return baseFB.call(this, dt);
    const was = PLACING.on; PLACING.on = true;
    try { return baseFB.call(this, dt); } finally { PLACING.on = was; }
  };
  const baseCarry = Redstone.prototype.carry;
  Redstone.prototype.carry = function (plan, mv, then, extra, key) {
    const w = this.w, pl = plan && plan.move ? plan.move.map(([x, y, z]) => placedAt(w, x, y, z)) : [];
    const r = baseCarry.call(this, plan, mv, then, extra, key);
    if (pl.some(Boolean)) { const a = this.anims.get(key); if (a) a.placedMoves = pl; }
    return r;
  };
  const baseFinish = PistonAnim.prototype.finish;
  PistonAnim.prototype.finish = function () {
    if (!this.placedMoves || this.remove) return baseFinish.call(this);
    const w = this.game.world, P = this.placedMoves;
    baseFinish.call(this);
    // the blocks are in their new places now: mark the ones that were placed
    for (let k = 0; k < this.pieces.length; k++) if (P[k]) {
      const q = this.pieces[k], c = w.chunkAt(q[3] >> 4, q[5] >> 4);
      if (c && w.getBlock(q[3], q[4], q[5]) === q[6] && marks(BLOCKS[q[6]])) (c.placed || (c.placed = new Set())).add(cidx(q[3] & 15, q[4], q[5] & 15));
    }
  };
  const basePlace = LocalPlayer.prototype.placeBlock;
  LocalPlayer.prototype.placeBlock = function (hit, def, held) {
    PLACING.on = true;
    try { return basePlace.call(this, hit, def, held); } finally { PLACING.on = false; }
  };
  const baseBreak = LocalPlayer.prototype.breakBlock;
  LocalPlayer.prototype.breakBlock = function (x, y, z) {
    this._placedHit = placedAt(this.g.world, x, y, z);
    try { return baseBreak.call(this, x, y, z); } finally { this._placedHit = false; }
  };
  // kept with the chunk
  const baseEnc = encodeChunk;
  encodeChunk = function (ch) {
    const rec = baseEnc(ch);
    if (ch.placed && ch.placed.size) rec.pl = bytesToBase64(new Uint8Array(Uint16Array.from(ch.placed).buffer));
    return rec;
  };
  const baseDec = decodeChunkInto;
  decodeChunkInto = function (ch, rec) {
    baseDec(ch, rec);
    ch.placed = null;
    if (rec && rec.pl) {
      try { const b = base64ToBytes(rec.pl), a = new Uint16Array(b.slice().buffer, 0, b.length >> 1); ch.placed = new Set(a); } catch (e) { ch.placed = null; }
    }
  };
}

// ---- 2. a blow before anything softens it (Player.hurt keeps at least a fifth of it) ----------------------------
{
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    if (src && typeof src === 'object') src._raw = amount;
    return baseHurt.call(this, amount, src);
  };
}

// ---- 3. eating: half at once, the rest over a few seconds; a moment between bites ------------------------------
const FOOD_CD = 2.2;
{
  const baseUse = LocalPlayer.prototype.use;
  LocalPlayer.prototype.use = function (repeat, inp, fromOff) {
    const p = this.player, held = p.inv.held, d = held && itemDef(held.id);
    if (!(d && d.food && !d.block && p.health < p.maxHealth)) return baseUse.call(this, repeat, inp, fromOff);
    // (0.9.0.31) the wait between bites is kept in the eating itself (LocalPlayer.use), so doors, chests, villagers
    // and planting still work with food in hand; a bite is told by the eating animation starting, not the stack
    const e0 = p.eatAnim || 0, h0 = held, n0 = held.n;
    p._bite = true; p.eatAnim = -7;
    try { return baseUse.call(this, repeat, inp, fromOff); }
    finally {
      p._bite = false;
      const ate = p.eatAnim > 0 && (p.inv.held !== h0 || h0.n < n0);   // (0.9.0.33) and the food in hand was eaten (a cake bite isn't the apple's)
      if (!(p.eatAnim > 0)) p.eatAnim = e0;
      if (ate) {
        p.foodCd = FOOD_CD;
        const fx = d.food.effect;
        if (fx && typeof giveEffect === 'function') giveEffect(this, fx[0], fx[1], fx[2] || 0);
      }
    }
  };
  const baseHeal = Player.prototype.heal;
  Player.prototype.heal = function (n) {
    if (this._bite && n > 1) {
      const now = n / 2;
      this.foodPool = (this.foodPool || 0) + (n - now) * (1 + (typeof skillBonus === 'function' ? skillBonus(this, 'cooking', 0.25) : 0));
      return baseHeal.call(this, now);
    }
    return baseHeal.call(this, n);
  };
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseUpd.call(this, dt, inp), p = this.player;
    if (p.foodCd > 0) p.foodCd -= dt;
    if (p.foodPool > 0) {
      if (p.dead || p.health >= p.maxHealth) p.foodPool = 0;
      else { const k = Math.min(p.foodPool, dt * Math.max(1.6, p.foodPool / 2)); p.foodPool -= k; baseHeal.call(p, k); }
    }
    // bounties that have sat a week lapse (they used to fill your list for good)
    if ((this._qT = (this._qT || 0) - dt) <= 0) { this._qT = 8; try { questLapse(this); } catch (e) { /* not in a world */ } }
    return r;
  };
}

// ---- 4. the story: the village by spawn, if no one has found one; one player leaving his realm -----------------
function riftSpawnVillage(g) {
  const gen = g.world && g.world.gen, s = g.meta.spawn || [0, 0, 0];
  if (!gen || !gen.villageAt) return null;
  let best = null, bd = 1e9;
  const rx = Math.floor(s[0] / VREG), rz = Math.floor(s[2] / VREG);
  for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
    const v = gen.villageAt(rx + dx, rz + dz); if (!v) continue;
    const d = Math.hypot(v.x - s[0], v.z - s[2]); if (d < bd) { bd = d; best = v; }
  }
  return best;
}
{
  const baseRT = riftTravel;
  riftTravel = async function (g, to, lp) {
    if (to === DIM.REALM) return baseRT(g, to, lp);
    // over LAN everyone travels together, so everyone has to be at the way out
    if (!g.isGuest && g.net && g.net.peers && g.net.peers.size > 0 && g.dim === DIM.REALM) {
      const outs = RIFT.tears.filter(t => t.kind === 'exit' && !t.remove);
      const far = g.pawns().filter(p => !p.dead && !outs.some(t => Math.hypot(p.x - t.x, p.z - t.z) < 10));
      if (far.length && outs.length) { riftSay(g, 'Everyone has to gather at the way out to leave together', ''); if (g.net) g.net.all({ t: 'chat', from: 'The Rift', text: 'Everyone has to gather at the way out to leave together' }); return; }
    }
    // on one screen, only whoever walked out goes
    const prev = g._actor; if (lp) g._actor = lp;
    try { return baseRT(g, to, lp); } finally { g._actor = prev; }
  };
}

// ---- 5. the End portal without see-through portals, and for LAN guests --------------------------------------------
function endTravel(g, lp) {
  const prev = g._actor; if (lp) g._actor = lp;
  try {
    if (g.dim === 0) {
      g.changeDimension(DIM.END, () => { for (const l of g.locals) { l.player.x = END_PLAT[0] + 0.5 + l.index * 0.6; l.player.y = END_PLAT[1] + 1; l.player.z = END_PLAT[2] + 0.5; } return [END_PLAT[0] + 0.5, END_PLAT[1] + 1, END_PLAT[2] + 0.5]; });
      setTimeout(() => { for (const l of (g.allLocals ? g.allLocals() : g.locals)) if ((l.player.dim ?? g.dim) === DIM.END) endFirstVisit(g, l); }, 3000);
    } else if (g.dim === DIM.END) {
      const s = g.meta.spawn || [0, 80, 0];
      g.changeDimension(0, () => { for (const l of g.locals) g.placeAtSpawn(l.player, false); return [s[0], s[1] || 80, s[2]]; });
    }
  } finally { g._actor = prev; }
}
endPortalFallback = function (g) {
  const lan = !!(g.net && g.net.peers && g.net.peers.size > 0), viewsOff = g.settings.portalViews === false;
  if ((!lan && !viewsOff && !g.isGuest) || g._traveling || g.state !== 'playing') return;
  for (const lp of g.locals) {
    const p = lp.player;
    if (p.dead || g.world.getBlock(Math.floor(p.x), Math.floor(p.y + 0.2), Math.floor(p.z)) !== B.end_portal) continue;
    if (g.isGuest) { const t = performance.now(); if (!(t - (lp._endAsk || 0) < 3000) && g.net) { lp._endAsk = t; g.net.send({ t: 'adv', k: 'endportal' }); } return; }
    endTravel(g, lp);
    return;
  }
};
{
  // guests look for the portal under their own feet (the host's tick only sees the host's players)
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    const r = baseFrame.call(this, dt);
    if (this.isGuest && this.world && (this.dim === 0 || this.dim === DIM.END)) { try { endPortalFallback(this); } catch (e) { /* not yet */ } }
    return r;
  };
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'adv' && m.k === 'endportal') { if (!this.g._traveling) endTravel(this.g, null); return; }
    return baseHost.call(this, from, m);
  };
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv' && m.k === 'dcleared') { if (this.g.meta) { dungeonRec(this.g, m.d).cleared = 1; for (const l of this.g.locals) questHud(l); } return; }
    return baseGuest.call(this, m);
  };
  // the first dragon opens a gateway each way round the island (one alone left most of the outer End out of reach)
  const baseSlain = endDragonSlain;
  endDragonSlain = function (g, e) {
    const r = baseSlain(g, e);
    try { const E = endRec(g); while ((E.gates || 0) < 4) endGatewayOpen(g); } catch (err) { console.warn('gateways', err); }
    return r;
  };
}

// ---- 6. quests: a cleared dungeon counts whoever cleared it; bounties lapse --------------------------------------
{
  const baseHave = questHave;
  questHave = function (lp, q) {
    if (q.kind === 'dungeon' && !q.have && lp.g.meta && dungeonRec(lp.g, q.did).cleared) q.have = 1;
    return baseHave(lp, q);
  };
}
function questLapse(lp) {
  if (!lp.g.meta || typeof npcStats !== 'function') return;
  const S = npcStats(lp.player), day = npcDay(lp.g);
  const old = S.quests.filter(q => q.giver === -1 && q.kind !== 'dungeon' && q.taken !== undefined && day - q.taken >= 7 && !questReady(lp, q));
  if (!old.length) return;
  S.quests = S.quests.filter(q => !old.includes(q));
  for (const q of old) lp.toast(`The bounty "${q.title}" has lapsed`, '');
  questHud(lp);
}

// ---- 7. no names of things that don't exist (shops, errands, loot, taming foods) ---------------------------------
{
  const SUBS = { sweet_berries: 'berries', crossbow: 'bow', spectral_arrow: 'arrow', writable_book: 'book', rabbit_stew: 'mushroom_stew', backpack: 'leather_backpack', map: 'empty_map', name_tag: 'saddle' };
  const known = (id) => typeof id !== 'string' || id.startsWith('#') || !!ITEMS[id];
  const fix = (list) => {
    if (!Array.isArray(list)) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i], id = Array.isArray(e) ? e[0] : e;
      if (known(id)) continue;
      const sub = SUBS[id];
      if (sub && ITEMS[sub] && !list.some(o => (Array.isArray(o) ? o[0] : o) === sub)) { if (Array.isArray(e)) e[0] = sub; else list[i] = sub; }
      else list.splice(i, 1);
    }
  };
  try {
    for (const sh of Object.values(NPC_SHOPS)) { fix(sh.buy); fix(sh.sell); }
    for (const L of Object.values(NPC_ERRANDS)) fix(L);
    if (typeof DUNGEON_LOOT !== 'undefined') for (const L of Object.values(DUNGEON_LOOT)) fix(L);
    if (typeof STRUCT_LOOT !== 'undefined') for (const L of Object.values(STRUCT_LOOT)) fix(L);
    if (typeof TAME_FOOD !== 'undefined') for (const v of Object.values(TAME_FOOD)) fix(v[0]);
  } catch (e) { console.warn('item lists', e); }
}
PV.debug.placedAt = (x, y, z) => placedAt(GAME.world, x, y, z);
PV.debug.fair = { enc: (c) => encodeChunk(c), dec: (c, r) => decodeChunkInto(c, r), skillXp: (lp, k) => (skillsOf(lp.player)[k] || 0), riftStability: () => riftStability(GAME), placed: (x, y, z) => placedAt(GAME.world, x, y, z), asPlaced: (fn) => { PLACING.on = true; try { return fn(); } finally { PLACING.on = false; } } };
