// ---------------------------------------------------------------------------
// net/net.js — 0.8.6: playing together on the home network.
//
// One computer hosts (the desktop app, "Open to LAN" in the pause menu): its
// game runs the world as always, with mobs, time, weather, fluids, furnaces
// and saving. Everyone else's game is a guest: it builds the same terrain from
// the seed and is sent the chunks that were changed. It is told about every
// block that changes and sees the host's creatures, items, arrows, boats and
// carts as "ghosts" that glide to where the host says they are. Each player
// moves their own body and keeps their own inventory; the host remembers it in
// the world (by name), so you pick up where you left off next time.
//
// Messages are small JSON objects over a WebSocket. The desktop app's server
// (launcher/desktop/lan.js) passes them between the host and the guests:
//   host -> server   "to|{...}"   to = guest id, * (everyone) or *-id (everyone else)
//   server -> host   "from|{...}" from = guest id, 0 for the server's own news
//   guest <-> server "{...}"
// ---------------------------------------------------------------------------

const NET_PROTO = 1;
const NET_SEND = { me: 1 / 15, ents: 1 / 10, env: 1, chunks: 0.2, save: 8, own: 1 / 15 };
const NET_ENT_RANGE = 96;      // how far from a guest the host tells it about creatures and things
const lanApp = () => (typeof window !== 'undefined' && window.emberLauncher && window.emberLauncher.lan) || null;
const chunkHash = (c) => { let h = 2166136261 >>> 0; const b = c.blocks, m = c.meta; for (let i = 0; i < b.length; i++) { h = Math.imul(h ^ b[i], 16777619); if (m[i]) h = Math.imul(h ^ (m[i] << 16), 16777619); } return h >>> 0; };
const nameKey = (n) => String(n || '').trim().toLowerCase();
const NET_SILENT = 30000;      // (0.9.0.57) half a minute without a word: the other side has gone
// (0.9.0.57) what everyone on this device carries, in short: when it changes, the host is told soon
function netInvSig(g) {
  let s = '';
  for (const l of g.locals) {
    const inv = l.player.inv;
    for (const k of Object.keys(inv)) { const v = inv[k]; if (v && Array.isArray(v.slots)) for (const it of v.slots) s += it ? it.id + '*' + it.n + (it.c ? '+' + JSON.stringify(it.c).length : '') + ',' : '-,'; }
    s += '|' + (l.player.xp || 0) + '|' + (l.player.level || 0) + ';';
  }
  return s;
}

// ---- someone playing on another device ------------------------------------------------------------
// On the host these are full "pawns": creatures see them, chase them and hurt them, items fly to them,
// and whatever happens to them is passed on to their own game. Everywhere, they're drawn with their skin.
const REMOTE_FX = new Set(['poison', 'slow', 'chill', 'burn']);
class RemotePawn {
  constructor(net, key, info) {
    this.net = net; this.g = net.g; this.key = key; this.gid = info.gid ?? 0; this.idx = info.idx ?? 0;
    this.name = info.name || 'Player'; this.skinURL = info.skin || null;
    this.skin = getSkin(this.g.renderer.gl, this.skinURL);
    this.x = info.x ?? 0; this.y = info.y ?? 0; this.z = info.z ?? 0; this.yaw = 0; this.pitch = 0;
    this.tx = this.x; this.ty = this.y; this.tz = this.z; this.tyaw = 0;
    this.vx = 0; this.vy = 0; this.vz = 0; this.dim = info.dim ?? 0; this.eye = 1.62; this.w = 0.3; this.h = 1.8;
    this.st = { pose: {} }; this.free = true; this.seen = 0; this.hurtFlash = 0;
    const self = this;
    // what creatures read and write on a player (writes of venom, frost and fire go to their game)
    const slots = (n) => ({ slots: new Array(n).fill(null), add: (s) => s.n });
    this.player = new Proxy({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: true, inWater: false, sneaking: false, health: 20, maxHealth: 20, dead: false, contacts: {}, stats: { mobsKilled: 0 }, effects: {},
      inv: { held: null, offhand: null, main: slots(36), armor: slots(4), back: slots(1), hook: slots(1), off: slots(1), add: (s) => s.n, carriedLight: () => 0 } }, {
      get(t, k) { if (k === 'x') return self.x; if (k === 'y') return self.y; if (k === 'z') return self.z; return t[k]; },
      set(t, k, v) { if (REMOTE_FX.has(k) && v > (t[k] || 0)) self.send({ t: 'fxp', f: { [k]: v } }); t[k] = v; return true; },
    });
  }
  get dead() { return !!this.st.dead; }
  get sneaking() { return !!this.st.sn; }
  get carrying() { return this.st.cr ? {} : null; }
  get inWater() { return !!this.st.iw; }
  look() { return lookVector(this.yaw, this.pitch); }
  send(m) { m.li = this.idx; this.net.toPawn(this, m); }
  apply(s) {
    this.tx = s.x; this.ty = s.y; this.tz = s.z; this.tyaw = s.r; this.pitch = s.p || 0; this.dim = s.d ?? this.dim;
    this.vx = s.vx || 0; this.vy = s.vy || 0; this.vz = s.vz || 0;
    if (s.hp !== undefined && this.st.hp !== undefined && s.hp < this.st.hp) this.hurtFlash = 0.6;
    this.st = s; this.seen = this.g.time;
    const P = this.player; P.onGround = !!s.og; P.inWater = !!s.iw; P.sneaking = !!s.sn; P.health = s.hp ?? 20; P.dead = !!s.dead; P.inv.held = s.pose && s.pose.held ? { id: s.pose.held, n: 1 } : null;
    if (!this.placed) { this.placed = true; this.x = s.x; this.y = s.y; this.z = s.z; this.yaw = s.r; }
  }
  update(dt) {
    const k = Math.min(1, dt * 14);
    if (Math.hypot(this.tx - this.x, this.tz - this.z) > 8) { this.x = this.tx; this.y = this.ty; this.z = this.tz; }
    this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.z += (this.tz - this.z) * k;
    const d = ((this.tyaw - this.yaw + Math.PI * 3) % TAU) - Math.PI; this.yaw += d * k;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
  }
  pose() {
    const p = Object.assign({}, this.st.pose || {});
    const w = this.g.world, l = w ? w.getLight(Math.floor(this.x), Math.floor(this.y + 1), Math.floor(this.z)) : 0xF0;
    p.x = this.x; p.y = this.y - (p.sit ? 0.45 : 0); p.z = this.z; p.yaw = this.yaw; p.light = [l >> 4, l & 15]; p.time = this.g.time;
    p.tint = this.hurtFlash > 0.3 ? [1, 0.15, 0.1, 0.4] : null; p.deathT = this.dead ? 1 : 0;
    return p;
  }
  lightSource() {
    if (this.dead) return null;
    const P = this.st.pose || {}, lv = Math.max(...[P.held, P.off, P.hook].map(id => (id && itemLight(id)) || 0));
    return lv ? [this.x, this.y + 1.25, this.z, lv] : null;
  }
  // ---- what the host's world does to them, passed on ----
  hurt(amount, src = {}) {
    if (this.dead || this.g.creative && false) return 0;
    const a = src.attacker;
    this.send({ t: 'hurt', a: amount, s: { type: src.type, element: src.element, knock: src.knock, bypass: src.bypass, bypassArmor: src.bypassArmor, noEffect: src.noEffect, ai: a && a.id !== undefined && !(a instanceof RemotePawn) ? a.id : undefined, at: a && a.T ? a.type : undefined, ax: a ? +a.x.toFixed(2) : undefined, az: a ? +a.z.toFixed(2) : undefined } });
    this.hurtFlash = 0.6;
    return amount;
  }
  knock(vx, vy, vz) { this.send({ t: 'knock', v: [+vx.toFixed(2), +(vy || 0).toFixed(2), +vz.toFixed(2)] }); }
  ignite(t) { this.send({ t: 'fxp', f: { burn: t } }); }
  give(stack) {
    if (!this.free || this.dead) return stack.n;
    this.send({ t: 'give', s: cloneStack(stack) });
    return 0;
  }
  floatText(x, y, z, text, color) { this.send({ t: 'float', x, y, z, text, color }); }
  toast(msg, kind) { this.send({ t: 'toast', m: msg, k: kind }); }
  grantXP(n, x, y, z) { this.send({ t: 'xp', n, x, y, z }); }
  shake() {}
  swingArm() {}
  get index() { return this.idx; }
}

// ---- the connection ----------------------------------------------------------------------------------
class Net {
  constructor(game, role) {
    this.g = game; this.role = role; this.ws = null; this.open = false; this.closing = false;
    this.inbox = []; this.waiters = [];
    this.remotes = new Map();          // pawn key ('h:0', 'g3:1') -> RemotePawn
    this.peers = new Map();            // host: guest id -> peer record
    this.ghosts = new Map();           // guest: host entity id -> ghost
    this.blockQ = []; this.beQ = new Map(); this.sndQ = []; this.fxQ = [];
    this.t = { me: 0, ents: 0, env: 0, chunks: 0, save: 0, rt: 0, own: 0 };
    this.stale = new Set(); this.sums = new Map(); this.records = null;
    this.owned = new Map();            // guest: entities it's driving (id -> entity); host: id -> guest id
    game.sfx.netGame = game;
  }
  get guestCount() { return this.peers.size; }

  // ---- transport ----
  // A hidden or minimised window stops drawing frames, but the world must go on for everyone else:
  // when frames stop coming, step the game from a timer instead.
  keepAlive() {
    if (this._alive) return;
    const g = this.g;
    this._alive = setInterval(() => {
      if (!this.open) return;
      const now = performance.now();
      // (0.9.0.57) a guest that hasn't heard from the host for half a minute (the laptop slept, the Wi-Fi went) has lost it,
      // even if the connection hasn't noticed yet
      if (this.role === 'client' && this.lastHeard && now - this.lastHeard > NET_SILENT && !this.closing) {
        this.closing = true; this.open = false;
        try { this.ws && this.ws.close(); } catch (e) { /* gone */ }
        this.lost({ code: 1006 });
        return;
      }
      if (now - (g._lastFrameAt || 0) < 150) return;
      const raf = window.requestAnimationFrame;
      window.requestAnimationFrame = () => 0;
      g._timerTick = true;
      try { g.loop(now); } catch (e) { console.warn(e); } finally { window.requestAnimationFrame = raf; g._timerTick = false; }
    }, 50);
  }
  connect(url) {
    this.keepAlive();
    return new Promise((res, rej) => {
      let ws;
      try { ws = new WebSocket(url); } catch (e) { rej(e); return; }
      this.ws = ws;
      // (0.9.0.55) a busy moment (the world still loading) can hold the "connected" news back past the timer: still
      // connecting when the time's up, it gets a little longer, once
      let timer = 0, extended = false;
      const giveUp = () => {
        if (ws.readyState === 0 && !extended) { extended = true; timer = setTimeout(giveUp, 8000); return; }
        if (ws.readyState === 1) { this.open = true; res(); return; }
        try { ws.close(); } catch (e) { /* gone */ } rej(new Error('No answer from that address'));
      };
      timer = setTimeout(giveUp, 8000);
      ws.onopen = () => { clearTimeout(timer); this.open = true; res(); };
      ws.onerror = () => { clearTimeout(timer); if (!this.open) rej(new Error('Could not connect to that address')); };
      ws.onclose = (ev) => { clearTimeout(timer); const was = this.open; this.open = false; if (was && !this.closing) this.lost(ev); };
      ws.onmessage = (ev) => this.receive(ev.data);
    });
  }
  receive(data) {
    if (typeof data !== 'string') return;
    let from = 0, s = data;
    if (this.role === 'host') { const i = data.indexOf('|'); if (i < 0) return; from = +data.slice(0, i); s = data.slice(i + 1); }
    let m; try { m = JSON.parse(s); } catch (e) { return; }
    // (0.9.0.57) the heartbeat: who's been heard from, and a ping answered straight away
    const now = performance.now();
    if (this.role === 'host') { const peer = this.peers.get(from); if (peer) peer.lastHeard = now; }
    else {
      this.lastHeard = now;
      if (m.t === 'ping') { this.send({ t: 'pong' }); return; }
      if (m.t === 'flush') { try { this.sendMe(); } catch (e) { /* not in the world yet */ } return; }   // at once, not at the next frame
    }
    if (m.t === 'pong') return;
    for (const w of this.waiters.slice()) if (w.t === m.t) { this.waiters.splice(this.waiters.indexOf(w), 1); w.res(m); }
    this.inbox.push([from, m]);
    // the world must keep up even while the page is in the background or loading
    if (this.inbox.length > 4000) this.pump();
  }
  raw(s) { if (this.ws && this.open) this.ws.send(s); }
  send(m) { this.raw(JSON.stringify(m)); }
  to(id, m) { this.raw(id + '|' + JSON.stringify(m)); }
  all(m, except) { if (!this.peers.size) return; this.raw((except ? '*-' + except : '*') + '|' + JSON.stringify(m)); }
  get busy() { return this.ws && this.ws.bufferedAmount > 2e6; }
  waitFor(t, ms) {
    return new Promise((res, rej) => {
      const w = { t, res }; this.waiters.push(w);
      setTimeout(() => { const i = this.waiters.indexOf(w); if (i >= 0) { this.waiters.splice(i, 1); rej(new Error('The host did not answer')); } }, ms);
    });
  }
  close() {
    this.closing = true;
    clearInterval(this._alive); this._alive = null;
    if (this.role === 'client') { try { this.sendMe(); this.send({ t: 'bye' }); } catch (e) { /* gone */ } }
    if (this.role === 'host') { const L = lanApp(); if (L && !this.testRelay) L.close(); }
    setTimeout(() => { try { this.ws && this.ws.close(); } catch (e) { /* gone */ } }, 120);
    for (const e of this.g.entities || []) if (e.ghost && this.role === 'host') e.ghost = false;
    this.remotes.clear(); this.peers.clear(); this.ghosts.clear();
  }
  lost(ev) {
    const g = this.g;
    if (this.role === 'client') {
      const why = ev && ev.code === 4000 ? 'The host removed you from the world.' : ev && (ev.code === 4001 || ev.code === 1001) ? 'The host closed the world.' : 'Lost the connection to the host.';
      g.net = null; clearInterval(this._alive);
      // (0.9.0.57) on a loading screen too (arriving, or through a portal): never left playing a copy of the host's world
      if (g.inWorld() || (g.meta && this.welcomeMsg && g.meta === this.welcomeMsg.meta)) { g.leaveGuestWorld(why); }
    } else {
      g.net = null; clearInterval(this._alive);
      for (const e of g.entities) if (e.ghost) e.ghost = false;
      if (g.local) g.local.toast('The LAN server stopped; your world is just yours again', 'warn');
    }
  }

  // ---- shared hooks the game calls ----
  pawns() { const d = this.g.dim, out = []; for (const r of this.remotes.values()) if (r.dim === d && r.placed) out.push(r); return out; }
  draws(out) {
    const gl = this.g.renderer.gl, d = this.g.dim;
    for (const r of this.remotes.values()) if (r.dim === d && r.placed) avatarDraws(out, gl, r.skin, r.pose());
  }
  streamCenters() {
    if (this.role !== 'host') return [];
    const out = [];
    for (const r of this.remotes.values()) if (r.dim === this.g.dim && r.placed) out.push([r.x, r.z, true]);
    return out;
  }
  blockChanged() { /* World.setBlock reports every change itself (see netsync.js) */ }

  update(dt) {
    this.pump();
    for (const r of this.remotes.values()) r.update(dt);
    if (!this.open) return;
    if (this.role === 'host') this.hostTick(dt); else this.guestTick(dt);
  }
  pump() {
    const q = this.inbox; this.inbox = [];
    for (const [from, m] of q) {
      try { if (this.role === 'host') this.hostMsg(from, m); else this.guestMsg(m); }
      catch (e) { console.warn('net message', m && m.t, e); }
    }
  }
  // the state of each person on this device, for everyone else
  localStates() {
    const all = this.g.allLocals ? this.g.allLocals() : this.g.locals;   // (0.9.0.57) everyone at this screen, whichever land they're in
    return all.map(l => {
      const p = l.player, pose = l.pose();
      delete pose.light; delete pose.time; delete pose.tint; delete pose.x; delete pose.y; delete pose.z; delete pose.yaw;
      if (pose.carry) pose.carry = { kind: pose.carry.kind, type: pose.carry.type, id: pose.carry.id, color: pose.carry.color, baby: pose.carry.baby, variant: pose.carry.variant, key: pose.carry.key };
      for (const k of Object.keys(pose)) { const v = pose[k]; if (typeof v === 'number') pose[k] = Math.round(v * 1000) / 1000; }
      return { i: l.index, n: l.name, x: +p.x.toFixed(3), y: +(p.y).toFixed(3), z: +p.z.toFixed(3), r: +p.yaw.toFixed(3), p: +p.pitch.toFixed(3), d: p.dim ?? this.g.dim,
        vx: +p.vx.toFixed(2), vy: +p.vy.toFixed(2), vz: +p.vz.toFixed(2), og: p.onGround ? 1 : 0, iw: p.contacts && p.contacts.water ? 1 : 0, sn: p.sneaking ? 1 : 0, cr: p.carrying ? 1 : 0,
        hp: Math.round(p.health * 10) / 10, dead: p.dead ? 1 : 0, pose };
    });
  }

  // =====================================================================================================
  // host
  // =====================================================================================================
  static async host(game, relay) {
    let info = relay;
    if (!info) {
      const L = lanApp();
      if (!L) throw new Error('Hosting needs the Shadowbloom desktop app');
      info = await L.open(Object.assign({ world: game.meta.name, host: game.local.name, version: GAME_VERSION }, game._lanOpts || {}));   // (0.9.0.29) a server's port, player limit and UPnP
      if (!info || !info.ok) throw new Error((info && info.msg) || 'Could not open the world to LAN');
    }
    const net = new Net(game, 'host');
    net.lanInfo = info; net.testRelay = !!relay;
    await net.connect('ws://127.0.0.1:' + info.port + '/host?k=' + info.token);
    game.net = net;
    game.world.isGuest = false;
    return net;
  }
  hostMsg(from, m) {
    const g = this.g;
    if (from === 0) {
      if (m.t === '_join') this.peers.set(m.id, { id: m.id, addr: m.addr, hello: false, ready: false, inRange: new Set(), sent: new Map(), ckQ: [], keys: [], lastHeard: performance.now() });
      else if (m.t === '_leave') this.peerLeft(m.id);
      return;
    }
    const peer = this.peers.get(from); if (!peer) return;
    if (m.t === 'hello') { this.welcome(peer, m); return; }
    if (!peer.hello) return;
    const pawnOf = (li) => this.remotes.get('g' + from + ':' + (li || 0));
    switch (m.t) {
      case 'me': {
        peer.free = m.fs !== 0;
        const keys = [];
        for (const s of m.ps || []) {
          const key = 'g' + from + ':' + s.i; keys.push(key);
          let r = this.remotes.get(key);
          if (!r) { r = new RemotePawn(this, key, { gid: from, idx: s.i, name: s.n, skin: (peer.skins || [])[s.i], dim: s.d }); this.remotes.set(key, r); this.all({ t: 'peer', k: key, n: r.name, skin: r.skinURL }, from); g.local.toast(r.name + ' joined the game', 'good'); }
          r.free = peer.free; r.apply(s);
        }
        for (const k of peer.keys) if (!keys.includes(k)) this.dropPawn(k);
        peer.keys = keys; peer.ready = true;
        this.all({ t: 'pl', l: m.ps.map(s => Object.assign({ k: 'g' + from + ':' + s.i }, s)) }, from);
        break;
      }
      case 'blk': for (const [x, y, z, id, meta, pl] of m.l) if (g.world.isLoaded(x, z)) g.world.setBlock(x, y, z, id, meta, { netFrom: from, placed: !!pl }); else this.offline(x, y, z, id, meta, pl); break;
      case 'be': this.applyBE(m, from); break;
      case 'drop': g.dropItem(m.s, m.x, m.y, m.z, m.sc, m.sp, m.v, m.dl); break;
      case 'hit': {
        const e = this.entById(m.id), who = pawnOf(m.li);
        if (e && e.hurt && !e.ghost) { const src = Object.assign({}, m.s, { attacker: who }); if (src.ray) delete src.ray; e.hurt(m.a, src); }
        break;
      }
      case 'spawn': this.spawnFor(m, from, pawnOf(m.li)); break;
      case 'rm': { const e = this.entById(m.id); if (e) e.remove = true; break; }
      case 'mobset': { const e = this.entById(m.id); if (e) applyMobFields(e, m.f); break; }
      case 'fell': if (typeof FallingTree === 'function') g.addEntity(new FallingTree(g, m.b, m.p, m.y, [])); this.all({ t: 'fell', b: m.b, p: m.p, y: m.y }, from); break;
      case 'portal': g.travelPortal(m.dim, { x: m.x, y: m.y, z: m.z }); break;
      case 'ride': this.grantRide(peer, m); break;
      case 'eu': { const e = this.entById(m.id); if (e && e.netOwner === from) applyOwnedState(e, m.s, true); break; }
      case 'unown': { const e = this.entById(m.id); if (e && e.netOwner === from) { applyOwnedState(e, m.s, false); e.netOwner = 0; e.ghost = false; } break; }
      case 'save': {
        peer.savedAt = performance.now();
        g.meta.netPlayers = g.meta.netPlayers || {};
        for (const p of m.ps || []) if (p.n && p.data) g.meta.netPlayers[nameKey(p.n)] = Object.assign({ name: p.n, at: Date.now() }, p.data);
        // (guests now send soon after anything they carry changes: the world itself is still saved every few seconds at most)
        if (performance.now() - (g._netSaveAt || 0) > 8000) { g._netSaveAt = performance.now(); g.saveSoon(); }
        break;
      }
      case 'need': this.queueChunk(peer, m.k, true); break;
      case 'chat': { const r = pawnOf(m.li); const text = String(m.text || '').slice(0, 200); for (const l of g.locals) l.chatMsg('<' + (r ? r.name : 'Someone') + '> ' + text); this.all({ t: 'chat', from: r ? r.name : 'Someone', text }, from); break; }
      // (0.9.0.57) leaving: their last save came just before this; nothing more is handed to them after it
      case 'bye': this.peerLeft(from); break;
    }
  }
  welcome(peer, m) {
    const g = this.g;
    if (m.proto !== NET_PROTO || m.version !== GAME_VERSION) { this.to(peer.id, { t: 'refuse', why: 'The host is playing version ' + GAME_VERSION.replace('-alpha', '') + ' and you have ' + String(m.version || '?').replace('-alpha', '') + '. Update so you both have the same one, or open the host\'s address in a web browser.' }); return; }
    const names = (m.locals || []).map(l => l.name);
    // (0.9.0.57) a name already playing here: the same person back from the same computer (a laptop that slept, a Wi-Fi blip)
    // takes over from their old connection; anyone else picks another name. Players still joining count too.
    for (const other of [...this.peers.values()]) {
      if (other === peer || !other.hello) continue;
      const theirs = (other.names || []).concat(other.keys.map(k => this.remotes.get(k)).filter(Boolean).map(r => r.name));
      const clash = theirs.find(n => names.some(x => nameKey(x) === nameKey(n)));
      if (!clash) continue;
      if (other.addr && other.addr === peer.addr) { this.kick(other.id); this.peerLeft(other.id); continue; }
      this.to(peer.id, { t: 'refuse', why: 'Someone called ' + clash + ' is already playing here. Pick another name in Players & Skins.' }); return;
    }
    for (const l of g.locals) if (names.some(n => nameKey(n) === nameKey(l.name))) { this.to(peer.id, { t: 'refuse', why: 'The host is called ' + l.name + ' too. Pick another name in Players & Skins.' }); return; }
    peer.hello = true; peer.names = names; peer.skins = (m.locals || []).map(l => l.skin || null); peer.R = clamp(m.R || 6, 2, 12);
    const M = g.meta, lead = g.locals[0].player;
    const meta = { id: 'lan-' + M.id, name: M.name, seed: M.seed, seedText: M.seedText, genVersion: M.genVersion, mode: M.mode, rules: M.rules, time: M.time, weather: M.weather, spawn: M.spawn, flags: {}, createdAt: M.createdAt, playTime: 0, lanHost: g.local.name,
      day: M.day || 0, dungeons: M.dungeons, rift: M.rift, villageBook: M.villageBook, villageFlat: M.villageFlat, dungeonBook: M.dungeonBook, lairBook: M.lairBook, structBook: M.structBook, dnd: M.dnd, campaign: M.campaign, camp: M.camp };   // build the same places the host does (and the same campaign)
    const saved = names.map(n => (M.netPlayers || {})[nameKey(n)] || null);
    // (0.9.0.31) a dedicated server's own body hangs above spawn: newcomers start on the ground at spawn
    const here = g.locals[0].serverPawn ? (() => { const s = M.spawn || [0, 80, 0], y = findSafeY(g.world, s[0], s[2]); return [Math.floor(s[0]) + 0.5, y > 0 ? y + 0.1 : (s[1] || 80) + 1, Math.floor(s[2]) + 0.5]; })() : [lead.x + 1.2, lead.y + 0.2, lead.z + 0.6];
    peer.lastHeard = performance.now();
    this.to(peer.id, { t: 'welcome', proto: NET_PROTO, id: peer.id, meta, dim: g.dim, at: here, players: saved,
      others: [...(g.allLocals ? g.allLocals() : g.locals).map(l => ({ k: 'h:' + l.index, n: l.name, skin: skinRef(l.profile) })), ...[...this.remotes.values()].map(r => ({ k: r.key, n: r.name, skin: r.skinURL }))] });
    // the changed chunks round where they'll start come straight away
    const sp = saved[0] && saved[0].dim === g.dim ? [saved[0].x, saved[0].z] : here;
    peer.pos = sp;
    this.updateRange(peer, sp[0], sp[2] ?? sp[1], true);
    this.to(peer.id, { t: 'ckdone', n: peer.ckQ.length });
    this.flushChunks(peer, 1e9);
  }
  peerLeft(id) {
    const peer = this.peers.get(id); if (!peer) return;
    this.peers.delete(id);
    for (const k of peer.keys) { const r = this.remotes.get(k); if (r) r.free = false; }   // nothing more handed to them
    for (const k of peer.keys) this.dropPawn(k, true);
    for (const e of this.g.entities) if (e.netOwner === id) { e.netOwner = 0; e.ghost = false; }
  }
  dropPawn(key, left) {
    const r = this.remotes.get(key); if (!r) return;
    this.remotes.delete(key);
    this.all({ t: 'gone', k: key });
    if (left && this.g.local) this.g.local.toast(r.name + ' left the game', '');
  }
  kick(gid) { this.raw('kick|' + gid); }
  // (0.9.0.57) everyone's game sends its latest save now (before the host quits, stops sharing, or removes someone),
  // and this waits until they have (or a moment has passed): what they carry is never older than what's in the chests
  flushGuests(ms = 1500, only) {
    const want = [...this.peers.values()].filter(p => p.hello && (!only || p.id === only));
    if (!want.length) return Promise.resolve();
    const t0 = performance.now();
    for (const p of want) { p.flushAt = t0; p.savedAt = 0; this.to(p.id, { t: 'flush' }); }
    return new Promise((res) => {
      const check = () => {
        this.pump();
        if (want.every(p => !this.peers.has(p.id) || p.savedAt >= t0) || performance.now() - t0 > ms) { res(); return; }
        setTimeout(check, 30);
      };
      check();
    });
  }
  toPawn(r, m) { if (this.role === 'host') this.to(r.gid, m); }
  // keep everyone's latest bags in the world, so they come back with them
  storeRemotePlayers(meta) { /* guests send their own (see 'save') */ }
  entById(id) { for (const e of this.g.entities) if (e.id === id) return e; return null; }

  hostTick(dt) {
    const g = this.g, T = this.t;
    // (0.9.0.57) a ping every few seconds; someone not heard from for half a minute has gone (their pawn and their
    // place are let go, so they can join again)
    if ((T.ping = (T.ping || 0) + dt) >= 4) {
      T.ping = 0;
      if (this.peers.size) this.all({ t: 'ping' });
      const now = performance.now();
      for (const p of [...this.peers.values()]) if (now - (p.lastHeard || now) > NET_SILENT) { this.kick(p.id); this.peerLeft(p.id); }
    }
    // the host's own people, for everyone else
    if ((T.me += dt) >= NET_SEND.me) { T.me = 0; if (this.peers.size) this.all({ t: 'pl', l: this.localStates().map(s => Object.assign({ k: 'h:' + s.i }, s)) }); }
    if (this.blockQ.length) this.flushBlocks();
    if (this.beQ.size) { for (const [k, v] of this.beQ) this.all(v.m, v.from); this.beQ.clear(); }
    if (this.sndQ.length || this.fxQ.length) this.flushEffects();
    if ((T.chunks += dt) >= NET_SEND.chunks) {
      T.chunks = 0;
      for (const peer of this.peers.values()) {
        if (!peer.ready) continue;
        const r = this.remotes.get(peer.keys[0]); if (!r || r.dim !== g.dim) continue;
        this.updateRange(peer, r.x, r.z, false);
        this.flushChunks(peer, 10);
      }
    }
    if ((T.ents += dt) >= NET_SEND.ents) { T.ents = 0; for (const peer of this.peers.values()) if (peer.ready && !this.busy) this.sendEntities(peer); }
    if ((T.env += dt) >= NET_SEND.env) { T.env = 0; this.all({ t: 'env', time: g.meta.time, day: g.meta.day || 0, w: g.meta.weather ? { kind: g.meta.weather.kind, left: g.meta.weather.left, front: g.meta.weather.front || null, trail: g.meta.weather.trail || null, mist: g.meta.weather.mist || 0, seaFog: g.meta.weather.seaFog || 0, rainbowT: g.meta.weather.rainbowT || 0 } : null }); }
    // crops grow and grass spreads round them too
    if ((T.rt += dt) >= 1) { T.rt = 0; for (const r of this.remotes.values()) if (r.dim === g.dim && r.placed) g.world.randomTicks(r.x, r.z, g.rand); }
  }
  // a change to a chunk nobody has loaded here: write it into the saved record
  offline(x, y, z, id, meta, pl) {
    const w = this.g.world; w.ensureChunk(x >> 4, z >> 4); w.setBlock(x, y, z, id, meta, { quiet: true, placed: !!pl });
  }
  flushBlocks() {
    // (0.9.0.57) everyone gets the changes as the host's world has them, whoever made them: a guest's own change comes
    // back too, so one that crossed with the host's (water flowing in as a hole was plugged) ends the same for both.
    // Each list says which land it's in.
    const byDim = new Map();
    for (const b of this.blockQ) { const d = b[7] ?? this.g.dim; if (!byDim.has(d)) byDim.set(d, []); byDim.get(d).push(b[6] ? [b[0], b[1], b[2], b[3], b[4], 1] : b.slice(0, 5)); }
    this.blockQ.length = 0;
    for (const [d, l] of byDim) this.all({ t: 'blk', l, d });
  }
  applyBE(m, from) {
    const g = this.g, w = g.world, k = m.x + ',' + m.y + ',' + m.z;
    if (m.q) { const A = this.beAck || (this.beAck = new Map()), a = A.get(k) || {}; a[from] = m.q; A.set(k, a); }   // (0.9.0.57) taken in
    if (!w.isLoaded(m.x, m.z)) return;
    w.setEntity(m.x, m.y, m.z, m.e || null);
    for (const l of g.locals) if (l.mode === 'inv') l.inv.externalChange(m.x, m.y, m.z);
    // (0.9.0.57) to everyone, the one who changed it too: what it is now, and which changes of each guest's it includes
    this.beQ.set(k, { m: { t: 'be', x: m.x, y: m.y, z: m.z, e: m.e || null, d: g.dim, a: this.beAck && this.beAck.get(k) }, from: 0 });
  }
  blockEntityChanged(x, y, z) {
    const g = this.g, e = g.world.getEntity(x, y, z), k = x + ',' + y + ',' + z;
    const m = { t: 'be', x, y, z, e: e ? JSON.parse(JSON.stringify(e)) : null };
    if (this.role === 'host') { m.d = g.dim; m.a = this.beAck && this.beAck.get(k); this.beQ.set(k, { m, from: 0 }); }
    else if (!this._applyingBE) {
      // (0.9.0.57) numbered: until the host's copy includes this change, older news of this chest from the host is ignored
      m.q = this.beSeq = (this.beSeq || 0) + 1;
      (this.bePend || (this.bePend = new Map())).set(k, m.q);
      this.send(m);
    }
  }
  // which chunks a guest needs from here: the changed ones, as they come into range
  updateRange(peer, x, z, first) {
    const g = this.g, w = g.world, R = Math.min(peer.R || 6, 12) + 1;
    const pcx = Math.floor(x) >> 4, pcz = Math.floor(z) >> 4, now = new Set();
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dz * dz > (R + 0.5) * (R + 0.5)) continue;
      const k = chunkKey(g.dim, pcx + dx, pcz + dz); now.add(k);
      if (!peer.inRange.has(k)) this.queueChunk(peer, k, false, pcx + dx, pcz + dz, dx * dx + dz * dz);
    }
    peer.inRange = now;
    if (first) peer.ckQ.sort((a, b) => a.d - b.d);
  }
  queueChunk(peer, k, force, cx, cz, d = 0) {
    if (cx === undefined) { const p = String(k).split('~'); cx = +p[1]; cz = +p[2]; }
    if (!peer.ckQ.some(q => q.k === k)) peer.ckQ.push({ k, cx, cz, force, d });
  }
  flushChunks(peer, max) {
    const w = this.g.world, keep = [];
    let n = 0;
    for (const q of peer.ckQ) {
      if (n >= max || this.busy) { keep.push(q); continue; }
      const c = w.chunkAt(q.cx, q.cz);
      if (c && c.modified) { this.to(peer.id, { t: 'ck', k: q.k, r: encodeChunk(c) }); n++; continue; }
      const rec = w.records.get(q.k);
      if (!c && rec) { this.to(peer.id, { t: 'ck', k: q.k, r: rec }); n++; continue; }
      if (c && !c.modified) { if (q.force) this.to(peer.id, { t: 'ck', k: q.k, r: encodeChunk(c) }); else this.to(peer.id, { t: 'cs', k: q.k, h: chunkHash(c) }); continue; }
      if (q.force && !c) { keep.push(q); continue; }   // asked for, not loaded here yet: send it once it is
      // untouched and not loaded here: their game makes it from the seed just like this one would
    }
    peer.ckQ = keep;
  }
  sendEntities(peer) {
    const g = this.g, r = this.remotes.get(peer.keys[0]); if (!r) return;
    const list = [], seen = new Set(), now = g.time;
    for (const e of g.entities) {
      if (e.remove && !(e instanceof Mob && e.deathTime > 0)) continue;
      if (Math.abs(e.x - r.x) > NET_ENT_RANGE || Math.abs(e.z - r.z) > NET_ENT_RANGE) continue;
      if (e.netOwner === peer.id) { seen.add(e.id); continue; }   // they're driving it
      const s = netSnap(e); if (!s) continue;
      seen.add(e.id);
      const js = JSON.stringify(s), prev = peer.sent.get(e.id);
      if (prev && prev.js === js && now - prev.at < 2) continue;
      peer.sent.set(e.id, { js, at: now });
      list.push(s);
    }
    const gone = [];
    for (const id of peer.sent.keys()) if (!seen.has(id)) { gone.push(id); peer.sent.delete(id); }
    if (list.length || gone.length) this.to(peer.id, { t: 'es', l: list, g: gone, d: g.dim });
  }
  entityRemoved(e) { /* the next 'es' says it's gone */ }
  // sounds and puffs of dust that happen near a guest
  soundAt(name, x, y, z, range) { if (this.peers.size && this.sndQ.length < 60) this.sndQ.push([name, +x.toFixed(1), +y.toFixed(1), +z.toFixed(1), range || 28]); }
  burstAt(x, y, z, key, n, sp, up) { if (this.peers.size && this.fxQ.length < 60) this.fxQ.push([+x.toFixed(2), +y.toFixed(2), +z.toFixed(2), key, n, sp, up]); }
  flushEffects() {
    for (const peer of this.peers.values()) {
      const r = this.remotes.get(peer.keys[0]); if (!r) continue;
      const s = this.sndQ.filter(q => Math.hypot(q[1] - r.x, q[2] - r.y, q[3] - r.z) < q[4]);
      const f = this.fxQ.filter(q => Math.hypot(q[0] - r.x, q[1] - r.y, q[2] - r.z) < 48);
      if (s.length || f.length) this.to(peer.id, { t: 'efx', s, f });
    }
    this.sndQ.length = 0; this.fxQ.length = 0;
  }
  spawnFor(m, from, who) {
    const g = this.g, s = m.s;
    const e = netMake(g, s, false, who);
    if (!e) return;
    if (s.vx !== undefined) { e.vx = s.vx; e.vy = s.vy; e.vz = s.vz; }
    g.addEntity(e);
  }
  grantRide(peer, m) {
    const e = this.entById(m.id);
    const busy = !e || e.netOwner || (e.riders && e.riders.some(r => r && !(r instanceof RemotePawn))) || (e.riddenBy && !(e.riddenBy instanceof RemotePawn));
    if (busy) { this.to(peer.id, { t: 'deny', id: m.id }); return; }
    e.netOwner = peer.id; e.ghost = true; e.tx = e.x; e.ty = e.y; e.tz = e.z; e.tyaw = e.yaw;
    this.to(peer.id, { t: 'own', id: m.id, s: ownedState(e) });
  }
  hostTraveled(to, pos) {
    for (const peer of this.peers.values()) { peer.inRange = new Set(); peer.sent = new Map(); peer.ckQ = []; }
    this.all({ t: 'dim', to, at: pos });
  }

  // =====================================================================================================
  // guest
  // =====================================================================================================
  static async join(game, url, onStatus) {
    const net = new Net(game, 'client');
    onStatus && onStatus('Connecting…', 0.05);
    await net.connect(url);
    const locals = [{ name: game.profiles[0].name, skin: skinRef(game.profiles[0]) || null }];   // (0.9.0.53) with its arms (slim or classic), as the host's own go
    net.send({ t: 'hello', proto: NET_PROTO, version: GAME_VERSION, locals, R: game.settings.renderDist });
    onStatus && onStatus('Joining…', 0.1);
    const w = await Promise.race([net.waitFor('welcome', 15000), net.waitFor('refuse', 15000)]);
    if (w.t === 'refuse') { net.closing = true; try { net.ws.close(); } catch (e) { /* gone */ } throw new Error(w.why); }
    // the changed chunks round where we'll start
    onStatus && onStatus('Getting the world…', 0.2);
    try { await net.waitFor('ckdone', 15000); } catch (e) { /* carry on with what came */ }
    net.records = new Map();
    const t0 = performance.now();
    while (performance.now() - t0 < 4000) {
      const q = net.inbox.filter(([, m]) => m.t === 'ck').length;
      await new Promise(r => setTimeout(r, 60));
      if (net.inbox.filter(([, m]) => m.t === 'ck').length === q) break;
    }
    // take in the chunks before the world exists, so they're there from the start
    net.inbox = net.inbox.filter(([, m]) => { if (m.t === 'ck') { net.records.set(m.k, m.r); return false; } if (m.t === 'cs') { net.sums.set(m.k, m.h); return false; } return true; });
    net.welcomeMsg = w;
    if (!net.open) throw new Error('Lost the connection to the host.');   // (0.9.0.57) not into a world nobody's hosting any more
    net.myId = w.id;
    return net;
  }
  enterAsGuest() {
    if (!this.open) throw new Error('Lost the connection to the host.');
    const g = this.g, w = this.welcomeMsg, meta = w.meta;
    g.net = this;
    g.nextEntityId = 1e9;
    const rec = w.players[0] ? Object.assign({}, w.players[0]) : null;
    const sameDim = rec && rec.dim === w.dim;
    if (rec) rec.dim = w.dim;
    g.enterWorld(meta, this.records, rec, null);
    const lp = g.locals[0];
    if (!sameDim) { lp.player.x = w.at[0]; lp.player.y = w.at[1]; lp.player.z = w.at[2]; lp.player.vx = lp.player.vy = lp.player.vz = 0; lp.player.fallStart = null; }
    for (const o of w.others) this.addRemote(o);
    lp.toast('Joined ' + meta.name + ' (hosted by ' + (meta.lanHost || 'someone') + ')', 'good');
  }
  addRemote(o) {
    if (this.remotes.has(o.k)) return this.remotes.get(o.k);
    const r = new RemotePawn(this, o.k, { name: o.n, skin: o.skin });
    this.remotes.set(o.k, r);
    return r;
  }
  sendMe() {
    if (this.role !== 'client' || !this.open) return;
    this.send({ t: 'save', ps: this.g.locals.map(l => ({ n: l.name, data: l.player.toJSON() })) });
  }
  sendDrop(stack, x, y, z, scatter, vel, delay) { this.send({ t: 'drop', s: cloneStack(stack), x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), sc: !!scatter, v: vel || undefined, dl: delay || undefined }); }
  sendHit(e, amount, src = {}) {
    const a = src.attacker;
    this.send({ t: 'hit', id: e.id, a: amount, li: a && a.index !== undefined ? a.index : 0, s: { type: src.type, element: src.element, knock: src.knock, tool: src.tool, weapon: src.weapon } });
  }
  sendRemoveEntity(id) { this.send({ t: 'rm', id }); }
  sendFell(blocks, pivot, dirYaw) { if (this.role === 'client') this.send({ t: 'fell', b: blocks, p: pivot, y: dirYaw }); else this.all({ t: 'fell', b: blocks, p: pivot, y: dirYaw }); }
  sendPortal(dim) { const p = this.g.locals[0].player; this.send({ t: 'portal', dim, x: p.x, y: p.y, z: p.z }); }

  guestTick(dt) {
    const g = this.g, T = this.t;
    if ((T.me += dt) >= NET_SEND.me) {
      T.me = 0;
      const free = g.locals.some(l => l.player.inv.main.slots.some(s => !s));
      this.send({ t: 'me', ps: this.localStates(), fs: free ? 1 : 0 });
    }
    if (this.blockQ.length) { this.send({ t: 'blk', l: this.blockQ.map(b => b[6] ? [b[0], b[1], b[2], b[3], b[4], 1] : b.slice(0, 5)) }); this.blockQ.length = 0; }
    if ((T.own += dt) >= NET_SEND.own) { T.own = 0; for (const e of this.owned.values()) if (!e.remove) this.send({ t: 'eu', id: e.id, s: ownedState(e) }); }
    if ((T.save += dt) >= NET_SEND.save) { T.save = 0; this.sendMe(); }
    // (0.9.0.57) what you carry changed: the host hears about it within a second, not up to eight later
    if ((T.inv = (T.inv || 0) + dt) >= 0.5) {
      T.inv = 0;
      const sig = netInvSig(g);
      if (this._invSig !== undefined && sig !== this._invSig) this._saveDue = this._saveDue || performance.now() + 700;
      this._invSig = sig;
    }
    if (this._saveDue && performance.now() >= this._saveDue) { this._saveDue = 0; T.save = 0; this.sendMe(); }
  }
  guestMsg(m) {
    const g = this.g, w = g.world;
    const lpOf = (li) => g.locals[li || 0] || g.locals[0];
    switch (m.t) {
      case 'pl': {
        for (const s of m.l) { const r = this.addRemote({ k: s.k, n: s.n }); r.name = s.n || r.name; r.apply(s); }
        // (0.9.0.57) the host's own players: one who's no longer listed has gone
        if (m.l.length && m.l.every(s => String(s.k).startsWith('h:'))) { const keep = new Set(m.l.map(s => s.k)); for (const k of [...this.remotes.keys()]) if (k.startsWith('h:') && !keep.has(k)) this.remotes.delete(k); }
        break;
      }
      case 'peer': { const r = this.addRemote(m); if (g.local && !m.q) g.local.toast(r.name + ' joined the game', 'good'); break; }
      case 'gone': { const r = this.remotes.get(m.k); if (r) { this.remotes.delete(m.k); if (g.local && !m.q) g.local.toast(r.name + ' left the game', ''); } break; }
      case 'flush': this._saveDue = 0; this.t.save = 0; this.sendMe(); break;   // (0.9.0.57) the host wants our latest now
      case 'ck': {
        if (!w) break;
        w.records.set(m.k, m.r); this.stale.delete(m.k);
        const p = String(m.k).split('~'), c = w.chunkAt(+p[1], +p[2]);
        if (c && +p[0] === g.dim) { decodeChunkInto(c, m.r); w.gen.fillClimate && w.gen.fillClimate(c); c.lightReady = false; w.markRemesh(c, 8, 8, false); for (const l of g.locals) if (l.mode === 'inv') l.inv.externalChange(); }
        break;
      }
      case 'cs': {
        const p = String(m.k).split('~'), c = w && w.chunkAt(+p[1], +p[2]);
        if (c && !c.modified && +p[0] === g.dim) { if (chunkHash(c) !== m.h) this.send({ t: 'need', k: m.k }); }
        else this.sums.set(m.k, m.h);
        break;
      }
      case 'blk': {
        if (!w) break;
        // (0.9.0.57) changes in another land than the one we're in (on the way through a portal): those chunks are
        // fetched fresh when we get there, never written into this one
        const d = m.d ?? g.dim, here = d === g.dim && !g._traveling;
        for (const [x, y, z, id, meta, pl] of m.l) {
          if (here && w.isLoaded(x, z)) w.setBlock(x, y, z, id, meta, { fromNet: true, placed: !!pl });
          else { const k = chunkKey(d, x >> 4, z >> 4); this.stale.add(k); w.records.delete(k); }
        }
        break;
      }
      case 'be': {
        if (!w) break;
        const d = m.d ?? g.dim;
        if (d !== g.dim || g._traveling) { const k = chunkKey(d, m.x >> 4, m.z >> 4); this.stale.add(k); w.records.delete(k); break; }
        if (!w.isLoaded(m.x, m.z)) break;
        // (0.9.0.57) a change of ours the host hasn't taken in yet: its older news of this chest is ignored until it has
        const bk = m.x + ',' + m.y + ',' + m.z, pend = this.bePend && this.bePend.get(bk);
        if (pend) { const got = m.a && m.a[this.myId]; if (!(got >= pend)) break; this.bePend.delete(bk); }
        this._applyingBE = true;
        try { w.setEntity(m.x, m.y, m.z, m.e || null); for (const l of g.locals) if (l.mode === 'inv') l.inv.externalChange(m.x, m.y, m.z); }
        finally { this._applyingBE = false; }
        break;
      }
      case 'es': if (!g._traveling && (m.d === undefined || m.d === g.dim)) this.applyEntities(m); break;   // (0.9.0.57) only this land's
      case 'own': this.takeOwnership(m); break;
      case 'deny': { const e = this.ghosts.get(m.id); if (e) e._wantRide = null; if (g.local) g.local.toast('Someone else is using that', ''); break; }
      case 'hurt': {
        const lp = lpOf(m.li), s = m.s || {};
        let attacker = s.ai !== undefined ? this.ghosts.get(s.ai) : null;
        if (!attacker && s.ax !== undefined) attacker = { x: s.ax, y: lp.player.y, z: s.az, type: s.at, T: s.at ? MOB_TYPES[s.at] : null };
        lp.hurt(m.a, Object.assign({}, s, { attacker }));
        break;
      }
      case 'knock': lpOf(m.li).knock(m.v[0], m.v[1], m.v[2]); break;
      case 'fxp': { const p = lpOf(m.li).player; for (const [k, v] of Object.entries(m.f || {})) if (REMOTE_FX.has(k)) p[k] = Math.max(p[k] || 0, v); break; }
      case 'give': {
        const lp = lpOf(m.li), left = lp.give(m.s);
        if (left > 0) { const s = cloneStack(m.s); s.n = left; g.dropItem(s, lp.player.x, lp.player.y + 0.5, lp.player.z, false, 0, null, 1.5); }
        break;
      }
      case 'toast': lpOf(m.li).toast(m.m, m.k); break;
      case 'float': lpOf(m.li).floatText(m.x, m.y, m.z, m.text, m.color); break;
      case 'xp': lpOf(m.li).grantXP(m.n, m.x, m.y, m.z); break;
      case 'env': {
        if (!g.meta) break;
        // our clock runs on between updates; only a real jump (a night slept through) snaps it
        const d = Math.abs(m.time - g.meta.time);
        if (d > 40 && d < DAY_LEN - 40) g.meta.time = m.time; else g.meta.time += ((m.time - g.meta.time + DAY_LEN * 1.5) % DAY_LEN - DAY_LEN / 2) * 0.5;
        if (m.w) g.meta.weather = Object.assign(g.meta.weather || {}, m.w);
        if (m.day !== undefined) g.meta.day = m.day;   // (0.9.0.24) the day (for shops and quests) is the host's
        break;
      }
      case 'efx':
        for (const s of m.s || []) g.sfx.playAt(s[0], s[1], s[2], s[3], s[4]);
        for (const f of m.f || []) g.burst(f[0], f[1], f[2], f[3], f[4], f[5], f[6]);
        break;
      case 'fell': if (typeof FallingTree === 'function') g.addEntity(new FallingTree(g, m.b, m.p, m.y, [])); break;
      case 'dim': this.followDim(m); break;
      case 'chat': for (const l of g.locals) l.chatMsg('<' + m.from + '> ' + m.text); break;
    }
  }
  applyEntities(m) {
    const g = this.g;
    for (const s of m.l) {
      let e = this.ghosts.get(s.i);
      if (e && e.remove) { this.ghosts.delete(s.i); e = null; }
      if (e && !e.ghost) continue;                     // ours to drive right now
      if (!e) { e = netMake(g, s, true); if (!e) continue; this.ghosts.set(s.i, e); g.entities.push(e); }
      else netApply(e, s);
    }
    for (const id of m.g || []) { const e = this.ghosts.get(id); if (e && e.ghost) { e.remove = true; this.ghosts.delete(id); } }
  }
  // the host let us drive it: it's ours until we get off
  takeOwnership(m) {
    const e = this.ghosts.get(m.id); if (!e) return;
    applyOwnedState(e, m.s, false);
    e.ghost = false; e.netMine = true; this.owned.set(e.id, e);
    const want = e._wantRide; e._wantRide = null;
    if (want) want();
  }
  release(e) {
    if (!e.netMine) return;
    this.send({ t: 'unown', id: e.id, s: ownedState(e) });
    e.netMine = false; e.ghost = true; e.tx = e.x; e.ty = e.y; e.tz = e.z; e.tyaw = e.yaw;
    this.owned.delete(e.id);
  }
  async followDim(m) {
    const g = this.g;
    for (const e of this.owned.values()) this.release(e);
    this.ghosts.clear(); this.stale.clear();
    await g.changeDimension(m.to, () => {
      this.ghosts.clear();      // (0.9.0.57) any made on the way belonged to the world just left
      for (const l of g.locals) { l.player.x = m.at[0] + 1 + l.index * 0.6; l.player.y = m.at[1]; l.player.z = m.at[2] + 0.5; }
      return m.at;
    });
  }
  // a chunk just made here: check it matches the host's, or ask for theirs
  chunkLoaded(c) {
    if (this.stale.has(c.key)) { this.stale.delete(c.key); this.send({ t: 'need', k: c.key }); return; }
    const h = this.sums.get(c.key);
    if (h !== undefined) { this.sums.delete(c.key); if (!c.modified && chunkHash(c) !== h) this.send({ t: 'need', k: c.key }); }
  }
}
