// tools/campaign_play.js — helpers the campaign play-test drives the game with (injected into the page).
(function () {
  const H = window.__dnd, camp = H.camp;
  const G = () => window.__game, LP = () => G().locals[0], C = () => camp.def(), S = () => camp.state();
  const T = window.__cp = {};
  T.closeUI = () => {
    try { if (H.CAMP_RT.narrating) H.CAMP_RT.narrating.finish(); } catch (e) { /* none */ }
    document.querySelectorAll('.book-ui, .camp-narr').forEach(el => el.remove());
    const lp = LP(); if (lp.npcUI) try { lp.npcUI.close(); } catch (e) { lp.npcUI = null; lp.mode = 'play'; }
    lp.mode = 'play';
    const g = G(); if (g.state !== 'playing' && typeof g.resume === 'function') g.resume();
  };
  T.hold = (x, y, z) => { const p = LP().player; p.x = x; p.y = y; p.z = z; p.vx = p.vy = p.vz = 0; p.fallStart = null; p.invuln = 1e9; if (p.health < p.maxHealth) p.health = p.maxHealth; };
  T.loaded = (x, z) => G().world.isLoaded(Math.floor(x), Math.floor(z));
  T.safeY = (x, z) => H.findSafeY(G().world, Math.floor(x), Math.floor(z));
  T.pos = (ref) => camp.pos(ref);
  T.stage = (q) => { const R = S().quests[q]; return R ? (R.done ? 'DONE' : R.stage) : null; };
  T.quest = (q) => C().quests[q];
  // the dialogue (or trigger, or creature) that sets a flag, so the play-test can do what a player would
  const has = (fx, f) => [].concat(fx || []).some(e => e && e.flag && [].concat(e.flag).includes(f));
  T.source = (f) => {
    const D = C(), found = [];
    for (const [id, N] of Object.entries(D.npcs)) {
      const nodes = (N.talk && N.talk.nodes) || {};
      for (const [k, nd] of Object.entries(nodes)) {
        if (has(nd.do, f)) found.push({ kind: 'node', npc: id, node: k });
        for (const [i, o] of (nd.opts || []).entries()) { if (has(o.do, f)) found.push({ kind: 'opt', npc: id, node: k, i }); if (o.check && has(o.check.passDo, f)) found.push({ kind: 'pass', npc: id, node: k, i }); }
      }
    }
    // the one who's actually there now (a person or a thing whose conditions hold), else the first
    if (found.length) { const ok = found.find(s => { const N = D.npcs[s.npc]; try { return (!N.if || camp.test(N.if)) && (!N.until || !camp.test(N.until)); } catch (e) { return false; } }); return ok || found[0]; }
    for (const [k, t] of Object.entries(D.triggers || {})) if (has(t.do, f)) return { kind: 'trigger', id: k, rest: !!t.rest };
    for (const [k, c] of Object.entries(D.creatures)) if (has(c.onDeath, f)) return { kind: 'creature', id: k };
    for (const [k, q] of Object.entries(D.quests)) { if (has(q.onDone, f)) return { kind: 'quest', id: k }; for (const st of Object.values(q.stages)) if (has(st.onStart, f) || has(st.onDone, f)) return { kind: 'quest', id: k }; }
    for (const [k, P] of Object.entries(D.places)) if (has(P.onClear, f) || has(P.onFind, f)) return { kind: 'place', id: k };
    return null;
  };
  // who hands over a letter (a courier, a debrief)
  const hasL = (fx, k) => [].concat(fx || []).some(e => e && e.letter && [].concat(e.letter).includes(k));
  T.letterSource = (k) => {
    const D = C();
    for (const [id, N] of Object.entries(D.npcs)) {
      const nodes = (N.talk && N.talk.nodes) || {};
      for (const [nk, nd] of Object.entries(nodes)) {
        if (hasL(nd.do, k)) return { kind: 'node', npc: id, node: nk };
        for (const [i, o] of (nd.opts || []).entries()) { if (hasL(o.do, k)) return { kind: 'opt', npc: id, node: nk, i }; if (o.check && hasL(o.check.passDo, k)) return { kind: 'pass', npc: id, node: nk, i }; }
      }
    }
    for (const [tk, t] of Object.entries(D.triggers || {})) if (hasL(t.do, k)) return { kind: 'trigger', id: tk, rest: !!t.rest };
    for (const [qk, q] of Object.entries(D.quests)) { if (hasL(q.onDone, k)) return { kind: 'quest', id: qk }; for (const st of Object.values(q.stages)) if (hasL(st.onStart, k) || hasL(st.onDone, k)) return { kind: 'quest', id: qk }; }
    return null;
  };
  T.runSource = (src) => {
    const D = C(), N = D.npcs[src.npc], nd = N.talk.nodes[src.node], lp = LP();
    let fx = src.kind === 'node' ? nd.do : src.kind === 'opt' ? nd.opts[src.i].do : nd.opts[src.i].check.passDo;
    // a node reached from a check: the check passed, and its option's own effects ran too
    H.campDo(G(), fx, lp, { npc: src.npc });
    return true;
  };
  T.npcAt = (id) => { const e = H.CAMP_RT.ents.get(id); return e ? [+e.x.toFixed(1), +e.y.toFixed(1), +e.z.toFixed(1)] : null; };
  T.prop = (id) => S().props[id] || null;
  T.cleared = (p) => !!S().cleared[p];
  T.flag = (f) => !!S().flags[f];
  T.setFlag = (f) => H.campDo(G(), { flag: f }, LP());
  T.tick = () => camp.tick();
  T.read = (k) => { camp.read(k); };
  T.give = (id, n) => { LP().give(H.mkStack(id, n || 1)); };
  T.rest = () => { H.campDo(G(), { rest: 'long' }, LP()); };
  T.spawnKill = (type) => { const g = G(), p = LP().player; const m = g.addEntity(new H.Mob(g, type, p.x + 2, p.y, p.z)); m.health = 1; m.hurt(9999, { type: 'magic', bypass: true, attacker: p, player: p }); if (m.alive) m.die({ attacker: p }); return !m.alive; };
  // the keeper of a place: is it up? kill it
  T.bossOf = (pid) => { const g = G(), P = C().places[pid]; const e = g.entities.find(x => x.alive && !x.remove && (x.campPlace === pid || (x.dungeon && P.kind === 'dungeon' && camp.dungeon(pid) && x.dungeon === camp.dungeon(pid).id && x.T && x.T.boss))); return e ? { type: e.type, hp: e.health, at: [e.x | 0, e.y | 0, e.z | 0] } : null; };
  T.killBoss = (pid) => { const g = G(), P = C().places[pid], d = P.kind === 'dungeon' ? camp.dungeon(pid) : null, p = LP().player; const e = g.entities.find(x => x.alive && !x.remove && (x.campPlace === pid || (d && x.dungeon === d.id && x.T && x.T.boss))); if (!e) return false; for (let i = 0; i < 40 && e.alive; i++) e.hurt(e.maxHealth, { type: 'magic', bypass: true, attacker: p, player: p }); if (e.alive) e.die({ attacker: p }); return !e.alive; };
  T.mobs = () => G().entities.filter(e => e.alive && e.T && e.T.campaign && !e.npc).map(e => e.type);
  T.killAll = () => { const p = LP().player; for (const e of G().entities) if (e.alive && e.T && e.T.hostile && !e.npc && Math.hypot(e.x - p.x, e.z - p.z) < 60) { e.hurt(e.maxHealth * 5, { type: 'magic', bypass: true, attacker: p, player: p }); if (e.alive) e.die({ attacker: p }); } };
  T.anchors = () => Object.keys(S().anchors);
  T.level = () => { const c = H.dndOf(LP().player); return c ? [c.level, c.xp] : null; };
  T.log = () => S().log.slice(-6).map(e => e.t);
  T.blockAt = (x, y, z) => { const id = G().world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)); return id; };
  T.solidAt = (x, y, z) => camp.solidAt(x, y, z);
})();
