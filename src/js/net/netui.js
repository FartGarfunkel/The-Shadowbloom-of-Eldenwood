// ---------------------------------------------------------------------------
// net/netui.js — 0.8.6: the LAN menus.
//
// Title → Multiplayer: worlds open on the home network (the desktop app hears
// them announce themselves) and a box for the address the host's screen shows.
// A page that was loaded from a host (a phone or a browser opening
// http://192.168.x.x:25580) offers to join that world straight away.
// Pause → Open to LAN (desktop app): starts the server, shows the address,
// who's playing (with a button to remove someone), and what to do if the
// computer's firewall is in the way.
// ---------------------------------------------------------------------------

SCREENS.push('lanjoin', 'lanhost');
const LANUI = { served: null, scanT: null, joining: false };
const FIREWALL_CMD = 'sudo firewall-cmd --permanent --add-port=25580-25589/tcp --add-port=25581/udp && sudo firewall-cmd --reload';

// ---- joining ------------------------------------------------------------------------------------------
function lanParseAddress(text) {
  let s = String(text || '').trim().replace(/^(https?|wss?):\/\//i, '').replace(/\/.*$/, '');
  if (!s) return null;
  let host = s, port = 25580;
  const m = s.match(/^\[?([^\]]+?)\]?:(\d+)$/);
  if (m) { host = m[1]; port = +m[2]; }
  return { host, port };
}
async function lanJoin(game, host, port, label) {
  if (LANUI.joining) return;
  const ui = game.ui;
  // a browser that's never been given a name: ask for one, so two "Player 1"s don't meet
  const pr = game.profiles[0];
  if (!lanApp() && pr && /^Player \d$/.test(pr.name || '')) {
    let n = null;
    try { n = window.prompt('Your name in ' + (label || 'this world') + ':', ''); } catch (e) { n = null; }
    if (n && n.trim()) { pr.name = n.trim().slice(0, 16); game.saveProfiles(); }
  }
  LANUI.joining = true;
  lanStopScan();
  game.sfx.unlock();
  ui.show('loading'); ui.loading('Joining ' + (label || host) + '…', 0.05);
  const secure = location.protocol === 'https:' && LANUI.served;
  const url = (secure ? 'wss://' : 'ws://') + host + ':' + port + '/play';
  try {
    const net = await Net.join(game, url, (t, f) => ui.loading(t, f));
    net.enterAsGuest();
  } catch (e) {
    console.warn(e);
    ui.show('lanjoin'); lanRenderJoin(game);
    const msg = $('#lan-msg');
    if (msg) msg.textContent = (e && e.message ? e.message : 'Could not join') + (/connect|answer/i.test(e && e.message || '') ? ' — check the address, that you\'re on the same network, and the host\'s firewall (see below).' : '');
  } finally { LANUI.joining = false; }
}

// ---- Multiplayer screen ---------------------------------------------------------------------------------
function lanRenderJoin(game) {
  const app = lanApp(), list = $('#lan-found'), help = $('#lan-help');
  if (!list) return;
  const found = LANUI.found || [];
  let html = '';
  if (LANUI.served) {
    const s = LANUI.served;
    html += `<div class="lan-world served"><div><b>${esc(s.world)}</b><span>hosted by ${esc(s.host)} · ${s.players} playing</span></div><button class="btn primary" data-join-served>Join</button></div>`;
  }
  for (const f of found) html += `<div class="lan-world"><div><b>${esc(f.world)}</b><span>hosted by ${esc(f.host)} · ${f.players} playing · ${esc(f.address)}${f.self ? ' (this computer)' : ''}</span></div><button class="btn primary" data-join="${esc(f.address)}:${f.port}" data-label="${esc(f.world)}">Join</button></div>`;
  if (!html) html = app ? '<p class="lan-empty">Looking for worlds on your network… (on the host: pause → Open to LAN)</p>' : '';
  list.innerHTML = html;
  for (const b of list.querySelectorAll('[data-join]')) b.onclick = () => { const a = lanParseAddress(b.dataset.join); lanJoin(game, a.host, a.port, b.dataset.label); };
  const sv = list.querySelector('[data-join-served]');
  if (sv) sv.onclick = () => lanJoin(game, location.hostname, +location.port || 80, LANUI.served.world);
  if (help) help.innerHTML = app
    ? 'Worlds opened to LAN on your home network show up here by themselves. If the list stays empty, type the address the host\'s screen shows — the firewall may be hiding the list (<code>sudo firewall-cmd --add-port=25581/udp</code> lets it through).'
    : LANUI.served ? 'This page came from the host\'s computer, so you can join their world right here.'
      : 'From a browser: open the address the host\'s screen shows (like <code>http://192.168.1.23:25580</code>) in the address bar, and the game loads from their computer ready to join. Or type it here. Hosting a world needs the desktop app.';
}
function lanStartScan(game) {
  lanStopScan();
  const app = lanApp();
  LANUI.found = [];
  lanRenderJoin(game);
  if (!app) return;
  const tick = async () => { try { LANUI.found = await app.scan(); } catch (e) { LANUI.found = []; } if (game.ui.cur === 'lanjoin') lanRenderJoin(game); };
  tick(); LANUI.scanT = setInterval(tick, 1000);
}
function lanStopScan() { if (LANUI.scanT) { clearInterval(LANUI.scanT); LANUI.scanT = null; const app = lanApp(); if (app && app.scanStop) app.scanStop(); } }

// ---- Open to LAN screen (host) ----------------------------------------------------------------------------
function lanRenderHost(game) {
  const body = $('#lanhost-body'); if (!body) return;
  const net = game.net, app = lanApp();
  if (!net || net.role !== 'host') {
    body.innerHTML = app
      ? `<p>Let others on your home network play in <b>${esc(game.meta.name)}</b> with you. Your computer runs the world: creatures, time and saving. Everyone keeps their own things, and your world remembers them for next time.</p>
         <p>They can join from Shadowbloom on another computer (Multiplayer), or from any phone, tablet or computer browser, nothing to install.</p>
         <button class="btn primary" id="lan-start">Open to LAN</button><p class="hint" id="lan-host-msg"></p>`
      : `<p>Hosting a world for others needs the Shadowbloom desktop app (the AppImage): a web page can't be a server.</p><p>You can still join someone else's world from here: Title → Multiplayer.</p>`;
    const st = $('#lan-start');
    if (st) st.onclick = async () => {
      st.disabled = true; $('#lan-host-msg').textContent = 'Starting…';
      try { await Net.host(game); lanRenderHost(game); game.ui.pauseInfo(); }
      catch (e) { st.disabled = false; $('#lan-host-msg').textContent = e.message || String(e); }
    };
    return;
  }
  const info = net.lanInfo || {}, port = info.port || 25580;
  const addrs = (info.addresses || []).map(a => `<li><code>http://${esc(a)}:${port}</code></li>`).join('') || '<li>No network found on this computer.</li>';
  const people = [...net.peers.values()].map(p => {
    const names = p.keys.map(k => net.remotes.get(k)).filter(Boolean).map(r => esc(r.name)).join(', ') || 'joining…';
    return `<div class="party-row"><span class="pdot net"></span><span class="pn">${names}</span><span class="pdev">${esc(p.addr || '')}</span><button class="btn tiny" data-kick="${p.id}">Remove</button></div>`;
  }).join('') || '<p class="party-hint">Nobody has joined yet.</p>';
  body.innerHTML = `<p><b>${esc(game.meta.name)}</b> is open to your home network.</p>
    <p class="lan-how">On a phone, tablet or any browser: open</p><ul class="lan-addrs">${addrs}</ul>
    <p class="lan-how">On another computer with Shadowbloom: <b>Multiplayer</b> on the title screen — your world shows up there.</p>
    <div class="lan-people"><div class="party-title">Playing with you</div>${people}</div>
    <details class="lan-fw"><summary>They can't connect?</summary>
      <p>Be on the same Wi-Fi or network. openSUSE's firewall blocks people joining until you allow it once. Open a terminal and run:</p>
      <div class="lan-cmd"><code id="lan-fw-cmd">${esc(FIREWALL_CMD)}</code><button class="btn tiny" id="lan-copy">Copy</button></div>
      <p class="hint">It asks for your password. Then try joining again. Other Linux systems: allow TCP ports 25580–25589 and UDP 25581.</p>
    </details>
    <button class="btn" id="lan-stop">Stop sharing this world</button>`;
  for (const b of body.querySelectorAll('[data-kick]')) b.onclick = async () => { const id = +b.dataset.kick; b.disabled = true; await net.flushGuests(700, id); net.kick(id); net.peerLeft(id); game.saveSoon(); setTimeout(() => lanRenderHost(game), 300); };
  $('#lan-copy').onclick = async () => { try { await navigator.clipboard.writeText(FIREWALL_CMD); $('#lan-copy').textContent = 'Copied'; } catch (e) { const r = document.createRange(); r.selectNodeContents($('#lan-fw-cmd')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); } };
  // (0.9.0.57) before anyone's let go, their game sends its latest save, so what they carry and what's in the chests agree
  $('#lan-stop').onclick = async () => { await net.flushGuests(); net.close(); game.net = null; game.saveSoon(); for (const l of game.locals) l.toast('Your world is just yours again', ''); lanRenderHost(game); game.ui.pauseInfo(); };
}

// ---- wiring --------------------------------------------------------------------------------------------------
{
  const baseBind = UI.prototype.bindMenus;
  UI.prototype.bindMenus = function () {
    baseBind.call(this);
    const g = this.g;
    $('#btn-lan').onclick = () => { g.sfx.unlock(); this.openSub('lanjoin'); };
    $('#lan-addr').addEventListener('submit', (e) => {
      e.preventDefault();
      const a = lanParseAddress($('#lan-ip').value);
      if (!a) { $('#lan-msg').textContent = 'Type the address the host\'s screen shows, like 192.168.1.23:25580'; return; }
      try { localStorage.setItem('dokuquest.lanAddr', $('#lan-ip').value.trim()); } catch (er) { /* fine */ }
      lanJoin(g, a.host, a.port);
    });
    $('#lan-ip').addEventListener('keydown', (e) => e.stopPropagation());
    try { const last = localStorage.getItem('dokuquest.lanAddr'); if (last) $('#lan-ip').value = last; } catch (er) { /* fine */ }
    $('#btn-lan-open').onclick = () => this.openSub('lanhost');
    const sv = $('#btn-lan-served');
    if (sv) sv.onclick = () => lanJoin(g, location.hostname, +location.port || 80, LANUI.served && LANUI.served.world);
  };
  // Back (and Escape) leave the LAN screens too
  const baseBack = UI.prototype.back;
  UI.prototype.back = function () {
    if (this.cur === 'lanjoin' || this.cur === 'lanhost') { this.closeSub(); return; }
    return baseBack.call(this);
  };
  const baseShow = UI.prototype.show;
  UI.prototype.show = function (name) {
    if (this.cur === 'lanjoin' && name !== 'lanjoin') lanStopScan();
    // leaving the menus for the game: nothing typed-into stays focused, so keys and the wheel reach the game
    if (name === 'game' && document.activeElement && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(document.activeElement.tagName)) document.activeElement.blur();
    baseShow.call(this, name);
    if (name === 'lanjoin') { $('#lan-msg').textContent = ''; lanStartScan(this.g); }
    if (name === 'lanhost') lanRenderHost(this.g);
    if (name === 'lanhost' || name === 'lanjoin') $('#views').hidden = !(this.g.locals.length && name === 'lanhost');
  };
  const basePause = UI.prototype.pauseInfo;
  UI.prototype.pauseInfo = function () {
    basePause.call(this);
    const g = this.g, guest = g.isGuest, net = g.net;
    for (const id of ['btn-wsettings', 'btn-export']) { const b = $('#' + id); if (b) b.hidden = guest; }
    $('#btn-quit').textContent = guest ? 'Leave ' + (g.meta && g.meta.name ? g.meta.name : 'the world') : 'Save and Quit to Title';
    const lb = $('#btn-lan-open');
    lb.hidden = guest;
    lb.textContent = net && net.role === 'host' ? 'LAN: ' + (net.remotes.size ? net.remotes.size + ' joined' : 'open, nobody yet') + ' · ' + ((net.lanInfo && net.lanInfo.addresses && net.lanInfo.addresses[0]) || '') : 'Open to LAN';
    // who's playing over the network
    if (net && net.remotes.size) {
      const box = $('#pause-party');
      const rows = [...net.remotes.values()].map(r => `<div class="party-row"><span class="pdot net"></span><span class="pn">${esc(r.name)}</span><span class="pdev">${r.key[0] === 'h' ? 'Host' : 'Network'}</span></div>`).join('');
      box.insertAdjacentHTML('beforeend', `<div class="party-title">Over the network</div>${rows}`);
    }
    if (guest) $('#pause-info').textContent = [g.meta.name, 'hosted by ' + (g.meta.lanHost || 'someone'), DIM_NAME[g.dim], g.creative ? 'Creative' : 'Survival'].join(' · ');
  };
  // the guest's quit is "leave"
  const baseQuit = Game.prototype.quitToTitle;
  Game.prototype.quitToTitle = async function () {
    // (0.9.0.57) the host quitting: everyone's latest save first, so it's kept with the world as it's saved
    if (!this.isGuest && this.net && this.net.role === 'host' && this.net.peers.size) { this.ui.show('loading'); this.ui.loading('Saving…', 0.4); try { await this.net.flushGuests(); } catch (e) { /* save anyway */ } }
    if (this.isGuest) { this.ui.show('loading'); this.ui.loading('Leaving…', 0.5); if (this.net) this.net.sendMe(); await new Promise(r => setTimeout(r, 150)); return this.leaveGuestWorld(''); }
    return baseQuit.call(this);
  };
  // chat goes to everyone
  const baseChat = LocalPlayer.prototype.submitChat;
  LocalPlayer.prototype.submitChat = function (text) {
    baseChat.call(this, text);
    const net = this.g.net;
    if (!net || !text || text.startsWith('/')) return;
    if (net.role === 'host') net.all({ t: 'chat', from: this.name, text: String(text).slice(0, 200) });
    else net.send({ t: 'chat', text: String(text).slice(0, 200), li: this.index });
  };
  // (0.9.0.57) a split-screen partner leaving the host: guests see them go, and the ones after them keep their own skins
  const baseRemoveLocal = Game.prototype.removeLocal;
  Game.prototype.removeLocal = function (lp) {
    const at = lp ? lp.index : 0, before = this.locals.map(l => l.index);
    const r = baseRemoveLocal.call(this, lp);
    if (this.net && this.net.role === 'host' && lp && at > 0 && !this.locals.includes(lp)) {
      for (const i of before) if (i >= at) this.net.all({ t: 'gone', k: 'h:' + i, q: i === at ? 0 : 1 });
      for (const l of this.locals) if (l.index >= at) this.net.all({ t: 'peer', k: 'h:' + l.index, n: l.name, skin: skinRef(l.profile), q: 1 });
    }
    return r;
  };
  // hosts' split-screen partners appear to guests with their skins
  const baseAddLocal = Game.prototype.addLocal;
  Game.prototype.addLocal = function (...a) {
    const lp = baseAddLocal.apply(this, a);
    if (this.net && this.net.role === 'host' && lp) this.net.all({ t: 'peer', k: 'h:' + lp.index, n: lp.name, skin: skinRef(lp.profile) });
    return lp;
  };
}

// ---- a page loaded from a host's computer offers to join straight away ----------------------------------------
async function lanCheckServed(game) {
  if (!/^https?:$/.test(location.protocol) || !location.port) return;
  try {
    const r = await fetch('/lan.json', { cache: 'no-store' });
    if (!r.ok) return;
    const o = await r.json();
    if (!o || !o.shadowbloom) return;
    LANUI.served = o;
    const b = $('#btn-lan-served');
    if (b) { b.hidden = false; b.textContent = 'Join ' + o.world + ' (' + o.host + ')'; }
  } catch (e) { /* an ordinary web page */ }
}
