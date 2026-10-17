// ---------------------------------------------------------------------------
// game/server.js — 0.9.0.29: the dedicated server.
//
// "Dedicated Server" (on the title screen, and in the launcher under Play)
// runs one of your worlds as a server: nobody plays on this screen, the world
// just runs, and everyone joins it over the network (the home network, or the
// internet when the router lets them in: the desktop app asks it to with UPnP).
// The server screen shows who's on (kick, message), a live map of the world
// with everyone on it, a live isometric view round any player, the chat and a
// console for commands, the server's settings, and its plugins.
// ---------------------------------------------------------------------------
const SERVER = { on: false, opts: null, at: 0, log: [], tab: 'players', el: null, mapZoom: 2, follow: null, isoR: 26, starting: false, chunkImg: new WeakMap() };
const serverAvailable = () => !!lanApp();
function serverLog(text, kind) {
  SERVER.log.push({ t: Date.now(), text: String(text), kind: kind || '' });
  if (SERVER.log.length > 400) SERVER.log.splice(0, SERVER.log.length - 400);
  if (SERVER.el && SERVER.tab === 'chat') serverRenderChat();
  if (typeof modEmit === 'function') modEmit('log', text, kind);
}
// ---- the title screen button, and ?server=1 from the launcher -----------------------------------------------------------
{
  const baseBind = UI.prototype.bindMenus;
  UI.prototype.bindMenus = function () {
    baseBind.call(this);
    const g = this.g, lanBtn = $('#btn-lan');
    if (lanBtn && !$('#btn-server')) {
      const b = document.createElement('button');
      b.id = 'btn-server'; b.className = 'mcbtn mcbtn-small'; b.textContent = 'Dedicated Server';
      lanBtn.insertAdjacentElement('afterend', b);
      b.onclick = () => { g.sfx.unlock(); serverOpen(g); };
    }
    const q = new URLSearchParams(location.search);
    if (q.get('server') === '1' || location.hash === '#server') setTimeout(() => serverOpen(g), 600);
  };
}
function serverOpen(g) {
  if (SERVER.el) return;
  const el = SERVER.el = document.createElement('div');
  el.className = 'server-view';
  document.body.appendChild(el);
  el.addEventListener('keydown', (e) => e.stopPropagation());
  el.addEventListener('keyup', (e) => e.stopPropagation());
  if (SERVER.on) serverRenderRunning(g); else serverRenderSetup(g);
}
function serverClose() { if (SERVER.el) { SERVER.el.remove(); SERVER.el = null; } }

// ---- setting up -------------------------------------------------------------------------------------------------------------------------
async function serverRenderSetup(g) {
  const el = SERVER.el; if (!el) return;
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('dokuquest.server') || '{}'); } catch (e) { /* fine */ }
  const worlds = g.save && g.save.local ? await g.save.listWorlds() : [];
  const avail = serverAvailable();
  el.innerHTML = `<div class="sv-card">
    <header class="sv-head"><h2>Dedicated Server</h2><button class="btn ghost" data-a="close">Back</button></header>
    ${avail ? '' : '<p class="sv-warn">Running a server needs the Shadowbloom desktop app (it opens the network port). In a browser you can still join servers from Multiplayer.</p>'}
    <div class="sv-setup">
      <div class="sv-col">
        <h3>World</h3>
        <div class="sv-worlds">${worlds.length ? worlds.map((w, i) => `<label class="sv-world"><input type="radio" name="svw" value="${esc(w.rec.id)}" ${saved.world === w.rec.id || (!saved.world && i === 0) ? 'checked' : ''}><b>${esc((w.rec.meta && w.rec.meta.name) || 'World')}</b><span>${esc(fmtPlay((w.rec.meta || {}).playTime))} played</span></label>`).join('') : '<p class="hint">No worlds yet: make one in Singleplayer first (or below).</p>'}</div>
        <details class="sv-new"><summary>Or a new world</summary>
          <label>Name <input id="sv-nw-name" maxlength="32" value="Server World"></label>
          <label>Seed <input id="sv-nw-seed" maxlength="40" placeholder="Random"></label>
          <label>Mode <select id="sv-nw-mode"><option value="survival">Survival</option><option value="creative">Creative</option></select></label>
          <button class="btn" data-a="new">Create it</button>
        </details>
      </div>
      <div class="sv-col">
        <h3>Server</h3>
        <label>Server name <input id="sv-name" maxlength="40" value="${esc(saved.name || 'Shadowbloom Server')}"></label>
        <label>Welcome message <input id="sv-motd" maxlength="120" value="${esc(saved.motd || 'Welcome! Be kind, build big.')}"></label>
        <label>Players at once <input id="sv-max" type="number" min="1" max="16" value="${saved.max || 8}"></label>
        <label>Port <input id="sv-port" type="number" min="1024" max="65535" value="${saved.port || 25580}"></label>
        <label class="sv-check"><input type="checkbox" id="sv-upnp" ${saved.upnp !== false ? 'checked' : ''}> Open to the internet (asks your router with UPnP)</label>
        <label class="sv-check"><input type="checkbox" id="sv-plugins" ${saved.plugins !== false ? 'checked' : ''}> Run plugins</label>
        <p class="hint">Friends on the same network find the server in Multiplayer. Over the internet they type your public address and the port. If your router won't open the port by itself, forward TCP port ${saved.port || 25580} to this computer.</p>
        <button class="btn primary sv-start" data-a="start" ${avail && worlds.length ? '' : 'disabled'}>Start server</button>
        <p class="sv-msg" id="sv-msg"></p>
      </div>
    </div></div>`;
  el.querySelector('[data-a=close]').onclick = () => serverClose();
  el.querySelector('[data-a=new]').onclick = async () => {
    const name = el.querySelector('#sv-nw-name').value.trim() || 'Server World', seed = el.querySelector('#sv-nw-seed').value.trim(), mode = el.querySelector('#sv-nw-mode').value;
    serverStart(g, { create: { name, seed, mode } });
  };
  el.querySelector('[data-a=start]').onclick = () => { const w = el.querySelector('input[name=svw]:checked'); if (w) serverStart(g, { world: w.value }); };
}
async function serverStart(g, how) {
  if (SERVER.starting || SERVER.on) return;
  const el = SERVER.el, v = (id) => el.querySelector('#' + id);
  const opts = { name: v('sv-name').value.trim() || 'Shadowbloom Server', motd: v('sv-motd').value.trim(), max: clamp(+v('sv-max').value || 8, 1, 16), port: clamp(+v('sv-port').value || 25580, 1024, 65535), upnp: v('sv-upnp').checked, plugins: v('sv-plugins').checked, world: how.world };
  try { localStorage.setItem('dokuquest.server', JSON.stringify(opts)); } catch (e) { /* fine */ }
  const msg = (t) => { const m = v('sv-msg'); if (m) m.textContent = t; };
  SERVER.starting = true; SERVER.opts = opts;
  try {
    msg('Opening the world…');
    SERVER.on = true;   // from here the world opens without anyone playing it
    if (how.create) await g.createWorld(how.create.name, how.create.seed, how.create.mode);
    else await g.openWorld(how.world);
    for (let i = 0; i < 600 && g.state !== 'playing'; i++) await new Promise(r => setTimeout(r, 100));
    if (g.state !== 'playing') throw new Error('The world did not open');
    serverPark(g);
    msg('Opening the network…');
    g._lanOpts = { world: opts.name, host: 'Server', port: opts.port, max: opts.max, upnp: opts.upnp };
    g.net = await Net.host(g);
    SERVER.at = Date.now();
    serverLog(`Server "${opts.name}" is up: ${g.meta.name}, port ${(g.net.lanInfo && g.net.lanInfo.port) || opts.port}`, 'good');
    if (g.net.lanInfo && g.net.lanInfo.public) serverLog('Open to the internet at ' + g.net.lanInfo.public + ':' + g.net.lanInfo.port, 'good');
    else if (opts.upnp) serverLog(g.net.lanInfo && g.net.lanInfo.upnpMsg ? g.net.lanInfo.upnpMsg : 'The router did not open the port by itself (or this version of the app can\'t ask it). For friends over the internet, forward TCP port ' + ((g.net.lanInfo && g.net.lanInfo.port) || opts.port) + ' to this computer.', 'warn');
    if (typeof modEmit === 'function') modEmit('serverStart', opts);
    if (!SERVER.el) serverOpen(g); else serverRenderRunning(g);
  } catch (e) {
    console.warn('server', e);
    msg('Could not start: ' + (e.message || e));
    SERVER.on = false;
    if (g.state === 'playing') { try { await g.quitToTitle(); } catch (er) { /* already out */ } }
  } finally { SERVER.starting = false; }
}
// the screen's own player: out of the way, unseen, unhurt, still
function serverPark(g) {
  const lp = g.local; if (!lp) return;
  const p = lp.player;
  p.flying = true; p.invis = true; lp.serverPawn = true; lp.viewMode = 0;
  const s = g.meta.spawn || [p.x, p.y, p.z]; p.x = s[0] + 0.5; p.z = s[2] + 0.5; p.y = Math.max(p.y, (s[1] || 80) + 20);
  g.ui.show('game');
  $('#views').hidden = true;
}
{
  // the server's own player doesn't move, isn't hurt, isn't seen and isn't hunted
  const baseRead = LocalPlayer.prototype.readInput;
  LocalPlayer.prototype.readInput = function () { const i = baseRead.call(this); return SERVER.on && this.serverPawn ? InputManager.blankState() : i; };
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src) { if (SERVER.on && this.serverPawn) return 0; return baseHurt.call(this, amount, src); };
  const basePawns = Game.prototype.pawns;
  Game.prototype.pawns = function () { const r = basePawns.call(this); return SERVER.on ? r.filter(p => !p.serverPawn) : r; };
  const baseStates = Net.prototype.localStates;
  Net.prototype.localStates = function () { return SERVER.on ? [] : baseStates.call(this); };
  // nothing to draw on a server's screen (the map and the isometric view are drawn from the world itself)
  const baseRender = Game.prototype.renderViews;
  Game.prototype.renderViews = function (...a) { if (SERVER.on && !SERVER.preview) return; return baseRender.apply(this, a); };
  // nobody pauses a server
  const basePause = UI.prototype.show;
  UI.prototype.show = function (name) { if (SERVER.on && name === 'pause') return; return basePause.call(this, name); };
  // what goes on, into the server's log
  const baseHostMsg = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (SERVER.on && from === 0 && m && m.t === '_join') serverLog(`A connection from ${m.addr || 'somewhere'}`, '');
    if (SERVER.on && m && m.t === 'chat') { const r = this.remotes.get('g' + from + ':' + (m.li || 0)); const text = String(m.text || '').slice(0, 200); serverLog(`<${r ? r.name : 'Someone'}> ${text}`, 'chat'); if (typeof modEmit === 'function' && modEmit('chat', r ? r.name : 'Someone', text) === false) return; }
    // players beyond the limit are turned away
    if (SERVER.on && m && m.t === 'hello' && SERVER.opts && this.remotes.size >= SERVER.opts.max) { this.to(from, { t: 'refuse', why: 'The server is full (' + SERVER.opts.max + ' players). Try again in a while.' }); this.kick(from); serverLog('Turned away a player: the server is full', 'warn'); return; }
    return baseHostMsg.call(this, from, m);
  };
  const baseDrop = Net.prototype.dropPawn;
  Net.prototype.dropPawn = function (key, left) { const r = this.remotes.get(key); if (SERVER.on && r) { serverLog(r.name + ' left', ''); if (typeof modEmit === 'function') modEmit('leave', r.name); } return baseDrop.call(this, key, left); };
  const baseToast = LocalPlayer.prototype.toast;
  LocalPlayer.prototype.toast = function (msg, kind) {
    if (SERVER.on && this.serverPawn) {
      if (/ joined the game$/.test(msg)) { const name = msg.replace(/ joined the game$/, ''); serverLog(msg, 'good'); if (SERVER.opts && SERVER.opts.motd && this.g.net) setTimeout(() => serverSay(this.g, SERVER.opts.motd), 1500); if (typeof modEmit === 'function') modEmit('join', name); }
      else if (kind === 'epic' || kind === 'boss' || kind === 'warn') serverLog(msg, kind);
      return;
    }
    return baseToast.call(this, msg, kind);
  };
  const baseChat = LocalPlayer.prototype.chatMsg;
  if (baseChat) LocalPlayer.prototype.chatMsg = function (line) { if (SERVER.on && this.serverPawn) { if (!/^</.test(line)) serverLog(line, ''); return; } return baseChat.call(this, line); };
  // quitting the world stops the server
  const baseQuit = Game.prototype.quitToTitle;
  Game.prototype.quitToTitle = async function (...a) { const r = await baseQuit.apply(this, a); if (SERVER.on) { SERVER.on = false; serverLog('Server stopped', ''); if (SERVER.el) serverRenderSetup(this); } return r; };
}
function serverSay(g, text) {
  if (!g.net) return;
  g.net.all({ t: 'chat', from: '[Server]', text: String(text).slice(0, 200) });
  serverLog('[Server] ' + text, 'chat');
}
async function serverStop(g) {
  if (!SERVER.on) return;
  serverSay(g, 'The server is stopping. Thanks for playing!');
  if (typeof modEmit === 'function') modEmit('serverStop');
  await new Promise(r => setTimeout(r, 600));
  try { await g.saveNow('quit'); } catch (e) { /* saved as it went */ }
  await g.quitToTitle();
}

// ---- running ------------------------------------------------------------------------------------------------------------------------------
function serverRenderRunning(g) {
  const el = SERVER.el; if (!el) return;
  const info = (g.net && g.net.lanInfo) || {};
  const tabs = [['players', 'Players'], ['map', 'World map'], ['iso', 'Isometric'], ['chat', 'Chat & console'], ['settings', 'Settings'], ['plugins', 'Plugins']];
  el.innerHTML = `<div class="sv-card sv-run">
    <header class="sv-head"><div><h2>${esc(SERVER.opts.name)}</h2><div class="sv-sub" id="sv-sub"></div></div>
      <div class="sv-headbtns"><button class="btn" data-a="save">Save now</button><button class="btn danger" data-a="stop">Stop server</button></div></header>
    <div class="sv-addr">${(info.addresses || []).map(a => `<code>${esc(a)}:${info.port}</code>`).join(' ')}${info.public ? ` · internet: <code>${esc(info.public)}:${info.port}</code>` : ''}</div>
    <nav class="sv-tabs">${tabs.map(([k, n]) => `<button class="sv-tab${SERVER.tab === k ? ' on' : ''}" data-t="${k}">${n}</button>`).join('')}</nav>
    <div class="sv-body" id="sv-body"></div></div>`;
  el.querySelector('[data-a=stop]').onclick = () => serverStop(g);
  el.querySelector('[data-a=save]').onclick = async () => { await g.saveNow('server'); serverLog('Saved', 'good'); };
  for (const b of el.querySelectorAll('.sv-tab')) b.onclick = () => { SERVER.tab = b.dataset.t; serverRenderRunning(g); };
  serverRenderTab(g);
}
function serverRenderTab(g) {
  const body = SERVER.el && SERVER.el.querySelector('#sv-body'); if (!body) return;
  if (SERVER.tab === 'players') body.innerHTML = '<div id="sv-players"></div>';
  if (SERVER.tab === 'map') body.innerHTML = `<div class="sv-maptools"><label>Zoom <select id="sv-zoom">${[1, 2, 3, 4].map(z => `<option value="${z}" ${SERVER.mapZoom === z ? 'selected' : ''}>${z}×</option>`).join('')}</select></label><label>Centre on <select id="sv-follow"></select></label></div><canvas id="sv-map" width="720" height="480"></canvas>`;
  if (SERVER.tab === 'iso') body.innerHTML = `<div class="sv-maptools"><label>Round <select id="sv-follow"></select></label><label>Size <select id="sv-isor">${[16, 26, 36].map(r => `<option value="${r}" ${SERVER.isoR === r ? 'selected' : ''}>${r * 2} blocks</option>`).join('')}</select></label></div><canvas id="sv-iso" width="900" height="520"></canvas>`;
  if (SERVER.tab === 'chat') { body.innerHTML = `<div class="sv-log" id="sv-log"></div><form id="sv-say" class="sv-say"><input id="sv-in" maxlength="200" placeholder="Say something to everyone, or type a /command"><button class="btn primary">Send</button></form>`; serverRenderChat(); body.querySelector('#sv-say').onsubmit = (e) => { e.preventDefault(); const i = body.querySelector('#sv-in'), t = i.value.trim(); i.value = ''; if (t) serverCommand(g, t); }; }
  if (SERVER.tab === 'settings') serverRenderSettings(g, body);
  if (SERVER.tab === 'plugins') { if (typeof modsRender === 'function') modsRender(g, body, 'plugin'); else body.textContent = 'Plugins are not available.'; }
  const zoom = body.querySelector('#sv-zoom'); if (zoom) zoom.onchange = () => { SERVER.mapZoom = +zoom.value; };
  const isor = body.querySelector('#sv-isor'); if (isor) isor.onchange = () => { SERVER.isoR = +isor.value; };
  serverTick(g, true);
}
function serverPlayers(g) { return g.net ? [...g.net.remotes.values()] : []; }
function serverTick(g, now) {
  if (!SERVER.on || !SERVER.el) return;
  const T = SERVER.ticks || (SERVER.ticks = { sub: 0, players: 0, map: 0, iso: 0 }), t = performance.now();
  const sub = SERVER.el.querySelector('#sv-sub');
  if (sub && (now || t - T.sub > 1000)) {
    T.sub = t;
    const up = Math.floor((Date.now() - SERVER.at) / 1000), ps = serverPlayers(g);
    sub.textContent = `${g.meta.name} · ${DIM_NAME[g.dim] || ''} · ${ps.length} of ${SERVER.opts.max} playing · up ${Math.floor(up / 3600)}h ${Math.floor(up / 60) % 60}m · ${Math.round(g._fps || 0)} ticks/s · day ${g.meta.day || 0}`;
  }
  // the follow lists
  const fol = SERVER.el.querySelector('#sv-follow');
  if (fol && (now || t - T.players > 2000)) {
    const names = ['(spawn)', ...serverPlayers(g).map(r => r.name)];
    if (fol.dataset.list !== names.join('|')) { fol.innerHTML = names.map(n => `<option ${SERVER.follow === n ? 'selected' : ''}>${esc(n)}</option>`).join(''); fol.dataset.list = names.join('|'); fol.onchange = () => { SERVER.follow = fol.value === '(spawn)' ? null : fol.value; }; }
  }
  if (SERVER.tab === 'players' && (now || t - T.players > 1000)) { T.players = t; serverRenderPlayers(g); }
  if (SERVER.tab === 'map' && (now || t - T.map > 1500)) { T.map = t; serverDrawMap(g); }
  if (SERVER.tab === 'iso' && (now || t - T.iso > 2500)) { T.iso = t; serverDrawIso(g); }
}
{
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    const r = baseFrame.call(this, dt);
    if (SERVER.on) {
      this._fps = (this._fps || 20) * 0.95 + (dt > 0 ? 1 / dt : 20) * 0.05;
      try { serverTick(this, false); } catch (e) { if (!SERVER.warned) { SERVER.warned = true; console.warn('server ui', e); } }
    }
    return r;
  };
}
function serverRenderPlayers(g) {
  const box = SERVER.el && SERVER.el.querySelector('#sv-players'); if (!box) return;
  const ps = serverPlayers(g);
  if (!ps.length) { box.innerHTML = '<p class="hint">Nobody yet. Friends join from Multiplayer: on this network the server shows up by itself.</p>'; return; }
  const rows = ps.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${esc(DIM_NAME[r.dim ?? g.dim] || '')}</td><td>${Math.round(r.x)}, ${Math.round(r.y)}, ${Math.round(r.z)}</td><td>${r.player && r.player.dead ? 'down' : (Math.round(((r.player && r.player.health) ?? 20) * 5) / 10) + ' ♥'}</td>
    <td><button class="btn tiny" data-m="${esc(r.key)}">Message</button> <button class="btn tiny" data-tp="${esc(r.key)}">To spawn</button> <button class="btn tiny danger" data-k="${esc(r.key)}">Kick</button></td></tr>`).join('');
  box.innerHTML = `<table class="sv-table"><tr><th>Name</th><th>World</th><th>Where</th><th>Health</th><th></th></tr>${rows}</table>`;
  for (const b of box.querySelectorAll('[data-k]')) b.onclick = () => { const r = g.net.remotes.get(b.dataset.k); if (r) { serverSay(g, r.name + ' was asked to leave.'); g.net.kick(r.gid); serverLog('Kicked ' + r.name, 'warn'); } };
  for (const b of box.querySelectorAll('[data-m]')) b.onclick = () => { const r = g.net.remotes.get(b.dataset.m); const t = r && prompt('Message to ' + r.name); if (t && r.send) { r.send({ t: 'toast', m: '[Server] ' + t, k: 'good' }); serverLog('To ' + r.name + ': ' + t, 'chat'); } };
  for (const b of box.querySelectorAll('[data-tp]')) b.onclick = () => { const r = g.net.remotes.get(b.dataset.tp); const s = g.meta.spawn; if (r && s && r.send) { const y = findSafeY(g.world, s[0], s[2]); r.send({ t: 'tp', x: Math.floor(s[0]) + 0.5, y: y > 0 ? y + 0.1 : (s[1] || 80) + 1, z: Math.floor(s[2]) + 0.5 }); serverLog('Sent ' + r.name + ' to spawn', ''); } };
}
function serverRenderChat() {
  const box = SERVER.el && SERVER.el.querySelector('#sv-log'); if (!box) return;
  const tm = (t) => new Date(t).toTimeString().slice(0, 5);
  box.innerHTML = SERVER.log.slice(-200).map(l => `<div class="sv-line ${l.kind}"><span>${tm(l.t)}</span> ${esc(l.text)}</div>`).join('');
  box.scrollTop = box.scrollHeight;
}
function serverCommand(g, text) {
  if (text[0] !== '/') { serverSay(g, text); return; }
  const [name, ...args] = text.slice(1).split(/\s+/);
  if (name === 'say') { serverSay(g, args.join(' ')); return; }
  if (name === 'kick') { const r = serverPlayers(g).find(q => q.name.toLowerCase() === (args[0] || '').toLowerCase()); if (r) { g.net.kick(r.gid); serverLog('Kicked ' + r.name, 'warn'); } else serverLog('Nobody called ' + args[0], 'warn'); return; }
  if (name === 'list') { serverLog('Playing: ' + (serverPlayers(g).map(r => r.name).join(', ') || 'nobody'), ''); return; }
  if (name === 'stop') { serverStop(g); return; }
  if (name === 'save') { g.saveNow('server').then(() => serverLog('Saved', 'good')); return; }
  const C = COMMANDS[name];
  if (!C) { serverLog('No such command: /' + name + ' (try /help)', 'warn'); return; }
  try { const out = C.run(g.local, args); if (out) serverLog(out, ''); } catch (e) { serverLog('That went wrong: ' + e.message, 'warn'); }
}
function serverRenderSettings(g, body) {
  const R = g.rules ? g.rules() : {};
  body.innerHTML = `<div class="sv-settings">
    <label>Welcome message <input id="sv-s-motd" maxlength="120" value="${esc(SERVER.opts.motd || '')}"></label>
    <label>Players at once <input id="sv-s-max" type="number" min="1" max="16" value="${SERVER.opts.max}"></label>
    <div class="sv-row"><span>Time of day</span>${[['Morning', 0.02], ['Noon', 0.25], ['Evening', 0.48], ['Night', 0.6]].map(([n, f]) => `<button class="btn tiny" data-time="${f}">${n}</button>`).join('')}</div>
    <div class="sv-row"><span>Weather</span>${['clear', 'rain', 'storm'].map(w => `<button class="btn tiny" data-w="${w}">${w[0].toUpperCase() + w.slice(1)}</button>`).join('')}</div>
    <div class="sv-row"><span>Game rules</span>${['keepInventory', 'mobSpawning', 'fireSpread'].filter(k => k in R).map(k => `<label class="sv-check"><input type="checkbox" data-rule="${k}" ${R[k] !== false ? 'checked' : ''}> ${k}</label>`).join('')}</div>
    <p class="hint">Changes to the welcome message and the player limit apply at once. Rules are the world's own (the same as World settings).</p>
  </div>`;
  body.querySelector('#sv-s-motd').onchange = (e) => { SERVER.opts.motd = e.target.value; };
  body.querySelector('#sv-s-max').onchange = (e) => { SERVER.opts.max = clamp(+e.target.value || 8, 1, 16); };
  for (const b of body.querySelectorAll('[data-time]')) b.onclick = () => { g.meta.time = DAY_LEN * +b.dataset.time; serverLog('Time set: ' + b.textContent, ''); };
  for (const b of body.querySelectorAll('[data-w]')) b.onclick = () => { const C = COMMANDS.weather; if (C) serverLog(C.run(g.local, [b.dataset.w]) || 'Weather: ' + b.dataset.w, ''); };
  for (const c of body.querySelectorAll('[data-rule]')) c.onchange = () => { const r = g.meta.rules || (g.meta.rules = {}); r[c.dataset.rule] = c.checked; serverLog(`${c.dataset.rule}: ${c.checked ? 'on' : 'off'}`, ''); };
}

// ---- the live map: every loaded chunk, seen from above, with everyone on it -------------------------------------------------------------------
function serverChunkImage(c, top) {
  const cache = SERVER.chunkImg.get(c);
  if (cache && cache.mesh === c.mesh && cache.top === top) return cache.img;
  const img = new ImageData(16, 16), d = img.data, B2 = c.blocks, rgb = [0, 0, 0], skip = MAPS.skip || mapSkipTable();
  for (let lz = 0; lz < 16; lz++) for (let lx = 0; lx < 16; lx++) {
    const col = (lz << 4) | lx;
    let y = Math.min(top, (c.maxY || CH) - 1), id = 0;
    for (; y >= 0; y--) { id = B2[(y << 8) | col]; if (skip[id] !== 1) break; }
    const o = col * 4;
    if (y < 0) { d[o + 3] = 0; continue; }
    const cl = c.climate, t = cl ? cl[col * 2] : 128, hu = cl ? cl[col * 2 + 1] : 128;
    mapRGB(id, ((t >> 4) << 4) | (hu >> 4), rgb);
    const shade = 0.75 + Math.min(1, y / 110) * 0.4;
    d[o] = clamp(rgb[0] * shade, 0, 255); d[o + 1] = clamp(rgb[1] * shade, 0, 255); d[o + 2] = clamp(rgb[2] * shade, 0, 255); d[o + 3] = 255;
  }
  SERVER.chunkImg.set(c, { mesh: c.mesh, top, img });
  return img;
}
function serverCentre(g) {
  const f = SERVER.follow && serverPlayers(g).find(r => r.name === SERVER.follow);
  if (f) return [f.x, f.y, f.z];
  const s = g.meta.spawn || [0, 64, 0]; return [s[0], s[1] || 64, s[2]];
}
function serverDrawMap(g) {
  const cv = SERVER.el && SERVER.el.querySelector('#sv-map'); if (!cv || !g.world) return;
  const ctx = cv.getContext('2d'), Z = SERVER.mapZoom, [cx, cy, cz] = serverCentre(g), W = cv.width, H = cv.height;
  ctx.fillStyle = '#0d1311'; ctx.fillRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;
  const top = MAP_CEILING && MAP_CEILING[g.dim] ? Math.floor(cy) + 2 : CH - 1;
  const tmp = SERVER.tmp || (SERVER.tmp = Object.assign(document.createElement('canvas'), { width: 16, height: 16 })), tc = tmp.getContext('2d');
  for (const c of g.world.chunks.values()) {
    const sx = (c.cx * 16 - cx) * Z + W / 2, sz = (c.cz * 16 - cz) * Z + H / 2;
    if (sx > W || sz > H || sx + 16 * Z < 0 || sz + 16 * Z < 0) continue;
    tc.putImageData(serverChunkImage(c, top), 0, 0);
    ctx.drawImage(tmp, sx, sz, 16 * Z, 16 * Z);
  }
  // spawn, structures nobody's cleared, the players
  const s = g.meta.spawn; if (s) { const x = (s[0] - cx) * Z + W / 2, y = (s[2] - cz) * Z + H / 2; ctx.strokeStyle = '#ffe07a'; ctx.strokeRect(x - 4, y - 4, 8, 8); }
  ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  for (const r of serverPlayers(g)) {
    if ((r.dim ?? g.dim) !== g.dim) continue;
    const x = (r.x - cx) * Z + W / 2, y = (r.z - cz) * Z + H / 2;
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = r.player && r.player.dead ? '#888' : '#ff5a4a'; ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill();
    const yaw = r.yaw || 0; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(yaw) * 9, y - Math.cos(yaw) * 9); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.fillText(r.name, x + 1, y - 8); ctx.fillStyle = '#fff'; ctx.fillText(r.name, x, y - 9);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, H - 20, W, 20); ctx.fillStyle = '#e8dcc4'; ctx.textAlign = 'left';
  ctx.fillText(`Centre ${Math.round(cx)}, ${Math.round(cz)} · ${g.world.chunks.size} chunks loaded · ${DIM_NAME[g.dim] || ''}`, 8, H - 6);
}
// ---- the isometric view: the blocks round a player, as little cubes ---------------------------------------------------------------------------
function serverDrawIso(g) {
  const cv = SERVER.el && SERVER.el.querySelector('#sv-iso'); if (!cv || !g.world) return;
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, R = SERVER.isoR, [cx, cy, cz] = serverCentre(g), w = g.world;
  ctx.fillStyle = '#10161a'; ctx.fillRect(0, 0, W, H);
  const T = Math.max(4, Math.floor(Math.min(W / (R * 2 * 1.05), H / (R * 1.6)))), hw = T / 2, hh = T / 4, vh = T / 2;
  const x0 = Math.floor(cx) - R, z0 = Math.floor(cz) - R, base = Math.floor(cy);
  const top = MAP_CEILING && MAP_CEILING[g.dim] ? base + 6 : CH - 1, skip = MAPS.skip || mapSkipTable(), rgb = [0, 0, 0];
  const col = (r, k) => `rgb(${clamp(r[0] * k, 0, 255) | 0},${clamp(r[1] * k, 0, 255) | 0},${clamp(r[2] * k, 0, 255) | 0})`;
  const ox = W / 2, oy = H / 2 - R * hh * 0.2;
  const heights = [];
  for (let s = 0; s <= 4 * R; s++) for (let i = 0; i <= s; i++) {
    const dx = i, dz = s - i; if (dx > 2 * R || dz > 2 * R) continue;
    const x = x0 + dx, z = z0 + dz, c = w.chunkAt(x >> 4, z >> 4); if (!c) continue;
    const B2 = c.blocks, colIdx = ((z & 15) << 4) | (x & 15);
    let y = Math.min(top, (c.maxY || CH) - 1), id = 0;
    for (; y >= 0; y--) { id = B2[(y << 8) | colIdx]; if (skip[id] !== 1) break; }
    if (y < 0) continue;
    const cl = c.climate, t = cl ? cl[colIdx * 2] : 128, hu = cl ? cl[colIdx * 2 + 1] : 128;
    mapRGB(id, ((t >> 4) << 4) | (hu >> 4), rgb);
    // the column down to its lower neighbours, so cliffs show their sides
    const rel = y - base, px = ox + (dx - dz) * hw, py = oy + (dx + dz - 2 * R) * hh - rel * vh;
    const below = Math.min(y, Math.max(0, y - 6));
    const sideH = (y - below + 1) * vh;
    ctx.fillStyle = col(rgb, 0.62); ctx.beginPath(); ctx.moveTo(px - hw, py); ctx.lineTo(px, py + hh); ctx.lineTo(px, py + hh + sideH); ctx.lineTo(px - hw, py + sideH); ctx.fill();
    ctx.fillStyle = col(rgb, 0.8); ctx.beginPath(); ctx.moveTo(px + hw, py); ctx.lineTo(px, py + hh); ctx.lineTo(px, py + hh + sideH); ctx.lineTo(px + hw, py + sideH); ctx.fill();
    ctx.fillStyle = col(rgb, 1.05); ctx.beginPath(); ctx.moveTo(px, py - hh); ctx.lineTo(px + hw, py); ctx.lineTo(px, py + hh); ctx.lineTo(px - hw, py); ctx.fill();
    heights.push([x, z, y]);
  }
  // the players, standing where they are
  ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  for (const r of serverPlayers(g)) {
    if ((r.dim ?? g.dim) !== g.dim) continue;
    const dx = r.x - x0, dz = r.z - z0; if (dx < 0 || dz < 0 || dx > 2 * R || dz > 2 * R) continue;
    const px = ox + (dx - dz) * hw, py = oy + (dx + dz - 2 * R) * hh - (r.y - base) * vh;
    ctx.fillStyle = '#ff5a4a'; ctx.fillRect(px - hw * 0.3, py - vh * 2, hw * 0.6, vh * 2);
    ctx.fillStyle = '#ffd8b0'; ctx.fillRect(px - hw * 0.3, py - vh * 2.6, hw * 0.6, vh * 0.6);
    ctx.fillStyle = '#000'; ctx.fillText(r.name, px + 1, py - vh * 2.8 + 1); ctx.fillStyle = '#fff'; ctx.fillText(r.name, px, py - vh * 2.8);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, H - 20, W, 20); ctx.fillStyle = '#e8dcc4'; ctx.textAlign = 'left';
  ctx.fillText(`${SERVER.follow || 'Spawn'} · ${R * 2}×${R * 2} blocks · ${heights.length ? 'live' : 'nothing loaded here yet'}`, 8, H - 6);
}
PV.debug.server = { state: () => SERVER, map: () => serverDrawMap(GAME), iso: () => serverDrawIso(GAME) };
{
  // a guest sent somewhere by the server
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'tp') { const l = this.g.locals[m.li || 0] || this.g.locals[0]; if (l) { const p = l.player; p.x = +m.x; p.y = +m.y; p.z = +m.z; p.vx = p.vy = p.vz = 0; p.fallStart = null; l.toast('The server sent you to spawn', ''); } return; }
    return baseGuest.call(this, m);
  };
}
