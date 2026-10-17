// ---------------------------------------------------------------------------
// launcher/desktop/lan.js — 0.8.6: play together on the home network.
//
// When you open your world to LAN, the desktop app starts a small server:
//   - http://<your address>:<port>/      the game itself, so a phone, tablet or
//                                         another computer's browser can just open it
//   - ws://<your address>:<port>/play    where guests connect
//   - ws://127.0.0.1:<port>/host?k=...   where your own game connects (with a secret)
// The server only passes messages along: your game runs the world, and everyone
// else's game talks to it through here. It also says "a world is open here" on the
// network now and then, so other copies of the app can list it without typing an
// address. No packages: the WebSocket protocol is written out below.
// ---------------------------------------------------------------------------
'use strict';
const http = require('http');
const crypto = require('crypto');
const dgram = require('dgram');
const os = require('os');
const fs = require('fs');

const DISCOVERY_PORT = 25581;
const FIRST_PORT = 25580;

// ---- WebSocket (RFC 6455), server side --------------------------------------------------------------
class WsConn {
  constructor(socket, onMessage, onClose) {
    this.s = socket; this.buf = Buffer.alloc(0); this.frags = []; this.fragOp = 0; this.open = true;
    this.onMessage = onMessage; this.onClose = onClose;
    socket.setNoDelay(true);
    socket.on('data', (d) => { this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d; this.parse(); });
    socket.on('close', () => this.closed());
    socket.on('error', () => this.closed());
  }
  closed() { if (!this.open) return; this.open = false; try { this.s.destroy(); } catch (e) { /* gone */ } if (this.onClose) this.onClose(); }
  parse() {
    for (;;) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = b[0] & 0x80, op = b[0] & 0x0f, masked = b[1] & 0x80;
      let len = b[1] & 0x7f, at = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); at = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); at = 10; }
      if (len > 64 * 1024 * 1024) { this.closed(); return; }
      const need = at + (masked ? 4 : 0) + len;
      if (b.length < need) return;
      let data = b.subarray(at + (masked ? 4 : 0), need);
      if (masked) { const k = b.subarray(at, at + 4); data = Buffer.from(data); for (let i = 0; i < data.length; i++) data[i] ^= k[i & 3]; }
      this.buf = b.subarray(need);
      if (op === 0x8) { this.sendRaw(0x8, Buffer.alloc(0)); this.closed(); return; }
      if (op === 0x9) { this.sendRaw(0xA, data); continue; }
      if (op === 0xA) continue;
      if (op === 0x1 || op === 0x2) { this.fragOp = op; this.frags = [data]; }
      else if (op === 0x0) this.frags.push(data);
      else continue;
      if (fin) {
        const whole = this.frags.length === 1 ? this.frags[0] : Buffer.concat(this.frags);
        const text = this.fragOp === 0x1;
        this.frags = [];
        if (this.onMessage) this.onMessage(text ? whole.toString('utf8') : whole, text);
      }
    }
  }
  sendRaw(op, payload) {
    if (!this.open || (this.closingSent && op !== 0x8)) return;   // (0.9.0.57) nothing more after saying goodbye
    const n = payload.length;
    let head;
    if (n < 126) { head = Buffer.alloc(2); head[1] = n; }
    else if (n < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(n, 2); }
    else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
    head[0] = 0x80 | op;
    try { this.s.write(head); this.s.write(payload); } catch (e) { this.closed(); }
  }
  send(msg) { if (typeof msg === 'string') this.sendRaw(0x1, Buffer.from(msg, 'utf8')); else this.sendRaw(0x2, msg); }
  close(code = 1000, why = '') { if (this.closingSent) return; const b = Buffer.alloc(2 + Buffer.byteLength(why)); b.writeUInt16BE(code, 0); b.write(why, 2); this.sendRaw(0x8, b); this.closingSent = true; setTimeout(() => this.closed(), 200); }
  get buffered() { return this.s.writableLength || 0; }
}
function wsAccept(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key || String(req.headers.upgrade || '').toLowerCase() !== 'websocket') { socket.destroy(); return false; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  return true;
}

// ---- this computer's addresses on the home network ---------------------------------------------------
function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' && a.family !== 4) continue;
      if (a.internal) continue;
      if (/^(docker|br-|veth|virbr|vmnet|vboxnet|tun|tap|zt|tailscale)/i.test(name)) continue;
      out.push({ name, address: a.address, netmask: a.netmask });
    }
  }
  // the usual home ranges first
  const rank = (ip) => /^192\.168\./.test(ip) ? 0 : /^10\./.test(ip) ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3;
  return out.sort((a, b) => rank(a.address) - rank(b.address));
}
const broadcastOf = (ip, mask) => ip.split('.').map((o, i) => (+o & +mask.split('.')[i]) | (~+mask.split('.')[i] & 255)).join('.');

// ---- the server ----------------------------------------------------------------------------------------
// opts: { gameFile() -> path of the game to serve, world, host, version, port? }
class LanServer {
  constructor(opts) {
    this.opts = opts; this.token = crypto.randomBytes(16).toString('hex');
    this.hostConn = null; this.guests = new Map(); this.nextId = 1; this.port = 0; this.server = null; this.udp = null; this.timer = null;
  }
  info() { return { world: this.opts.world || 'A world', host: this.opts.host || 'Someone', version: this.opts.version || '', players: this.guests.size + 1, port: this.port }; }
  async start() {
    const tryPort = (p) => new Promise((res) => {
      const srv = http.createServer((req, res2) => this.http(req, res2));
      srv.on('upgrade', (req, socket) => this.upgrade(req, socket));
      srv.once('error', () => res(null));
      srv.listen(p, '0.0.0.0', () => res(srv));
    });
    const first = this.opts.port || FIRST_PORT;
    for (let p = first; p < first + 10; p++) { const s = await tryPort(p); if (s) { this.server = s; this.port = p; break; } }
    if (!this.server) throw new Error('No free port between ' + first + ' and ' + (first + 9));
    this.announce();
    const out = { port: this.port, token: this.token, addresses: lanAddresses().map(a => a.address) };
    // 0.9.0.29: a dedicated server can ask the router to open its port to the internet
    if (this.opts.upnp) {
      const r = await Promise.race([upnpOpen(this.port, 'Shadowbloom ' + (this.opts.world || 'server')).catch(e => ({ ok: false, msg: e.message })), new Promise(res => setTimeout(() => res({ ok: false, msg: 'The router did not answer (no UPnP).' }), 7000))]);
      if (r.ok) { this.upnp = r; out.public = r.external; out.upnpMsg = 'The router opened port ' + this.port + ' to the internet.'; }
      else out.upnpMsg = 'The router did not open the port by itself' + (r.msg ? ' (' + r.msg + ')' : '') + '. For friends over the internet, forward TCP port ' + this.port + ' to this computer.';
    }
    return out;
  }
  http(req, res) {
    const url = (req.url || '/').split('?')[0];
    if (url === '/lan.json') {
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify(Object.assign({ shadowbloom: 1 }, this.info())));
      return;
    }
    if (url === '/' || url === '/index.html') {
      fs.readFile(this.opts.gameFile(), (err, data) => {
        if (err) { res.writeHead(500); res.end('The game file could not be read.'); return; }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(data);
      });
      return;
    }
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not here.');
  }
  upgrade(req, socket) {
    const u = new URL(req.url || '/', 'http://x');
    if (u.pathname === '/host') {
      const local = /^(::ffff:)?127\.|^::1$/.test(socket.remoteAddress || '');
      if (!local || u.searchParams.get('k') !== this.token || this.hostConn) { socket.destroy(); return; }
      if (!wsAccept(req, socket)) return;
      this.hostConn = new WsConn(socket, (m, text) => this.fromHost(m, text), () => this.hostGone());
      return;
    }
    if (u.pathname === '/play') {
      if (!this.hostConn) { socket.destroy(); return; }
      if (this.guests.size >= (this.opts.maxGuests || 7)) { socket.destroy(); return; }
      if (!wsAccept(req, socket)) return;
      const id = this.nextId++;
      const addr = String(socket.remoteAddress || '').replace(/^::ffff:/, '');
      const c = new WsConn(socket, (m, text) => this.fromGuest(id, m, text), () => this.guestGone(id));
      this.guests.set(id, c);
      this.hostConn.send('0|' + JSON.stringify({ t: '_join', id, addr }));
      return;
    }
    socket.destroy();
  }
  // host -> "to|payload": to is a guest id, * for everyone, or *-id for everyone else
  fromHost(m, text) {
    if (!text) return;
    const bar = m.indexOf('|'); if (bar < 0) return;
    const to = m.slice(0, bar), payload = m.slice(bar + 1);
    if (to === 'kick') { const id = +payload; const g = this.guests.get(id); if (g) g.close(4000, 'kicked'); return; }
    if (to[0] === '*') {
      const except = to.length > 2 ? +to.slice(2) : 0;
      for (const [id, g] of this.guests) if (id !== except) g.send(payload);
    } else { const g = this.guests.get(+to); if (g) g.send(payload); }
  }
  fromGuest(id, m, text) { if (text && this.hostConn) this.hostConn.send(id + '|' + m); }
  guestGone(id) { if (!this.guests.delete(id)) return; if (this.hostConn) this.hostConn.send('0|' + JSON.stringify({ t: '_leave', id })); }
  hostGone() { this.hostConn = null; for (const g of this.guests.values()) g.close(4001, 'host left'); this.guests.clear(); }
  // "a world is open here", every second and a half, to every network this computer is on
  announce() {
    try {
      this.udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      this.udp.on('error', () => { /* no broadcast on this network */ });
      this.udp.bind(0, () => {
        try { this.udp.setBroadcast(true); } catch (e) { /* not allowed */ }
        const tick = () => {
          const msg = Buffer.from(JSON.stringify(Object.assign({ shadowbloom: 1 }, this.info())));
          const targets = new Set(['255.255.255.255']);
          for (const a of lanAddresses()) if (a.netmask) targets.add(broadcastOf(a.address, a.netmask));
          for (const t of targets) this.udp.send(msg, DISCOVERY_PORT, t, () => {});
        };
        tick(); this.timer = setInterval(tick, 1500);
      });
    } catch (e) { /* no UDP: joining by address still works */ }
  }
  stop() {
    clearInterval(this.timer); this.timer = null;
    try { if (this.udp) this.udp.close(); } catch (e) { /* closed */ }
    this.udp = null;
    if (this.hostConn) this.hostConn.close(1001, 'closed');
    for (const g of this.guests.values()) g.close(4001, 'host closed the world');
    this.guests.clear();
    if (this.server) this.server.close();
    this.server = null;
    if (this.upnp) { upnpClose(this.upnp).catch(() => {}); this.upnp = null; }
  }
}

// ---- UPnP (0.9.0.29): asking the home router to let the internet in --------------------------------------
// Finds the router (SSDP), then asks its WAN connection service to forward our port to this computer, and
// what its address on the internet is. Nothing is needed from the player if the router allows it.
function upnpFind(timeout = 2500) {
  return new Promise((res) => {
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true }), found = [];
    const done = () => { try { sock.close(); } catch (e) { /* closed */ } res(found); };
    sock.on('error', done);
    sock.on('message', (buf) => { const m = /^location:\s*(.+)$/im.exec(buf.toString()); if (m && !found.includes(m[1].trim())) found.push(m[1].trim()); });
    sock.bind(0, () => {
      for (const st of ['urn:schemas-upnp-org:device:InternetGatewayDevice:1', 'urn:schemas-upnp-org:service:WANIPConnection:1', 'urn:schemas-upnp-org:service:WANIPConnection:2', 'urn:schemas-upnp-org:service:WANPPPConnection:1']) {
        const msg = Buffer.from('M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: ' + st + '\r\n\r\n');
        sock.send(msg, 1900, '239.255.255.250', () => {});
      }
      setTimeout(done, timeout);
    });
  });
}
function httpText(url, opts = {}, body) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    const req = http.request({ host: u.hostname, port: u.port || 80, path: u.pathname + u.search, method: opts.method || 'GET', headers: opts.headers || {}, timeout: 4000 }, (r) => {
      let t = ''; r.setEncoding('utf8'); r.on('data', d => { t += d; }); r.on('end', () => res({ status: r.statusCode, text: t, local: r.socket && r.socket.localAddress }));
    });
    req.on('timeout', () => req.destroy(new Error('timed out'))); req.on('error', rej);
    if (body) req.write(body); req.end();
  });
}
async function upnpService() {
  for (const loc of await upnpFind()) {
    try {
      const r = await httpText(loc), xml = r.text;
      const services = xml.split(/<service>/i).slice(1);
      for (const sv of services) {
        const type = (/<serviceType>([^<]+)<\/serviceType>/i.exec(sv) || [])[1] || '';
        if (!/WAN(IP|PPP)Connection/.test(type)) continue;
        const ctl = (/<controlURL>([^<]+)<\/controlURL>/i.exec(sv) || [])[1]; if (!ctl) continue;
        const base = (/<URLBase>([^<]+)<\/URLBase>/i.exec(xml) || [])[1] || loc;
        return { type, control: new URL(ctl, base).toString(), local: r.local };
      }
    } catch (e) { /* the next one */ }
  }
  return null;
}
async function upnpCall(svc, action, args) {
  const body = '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:' + action + ' xmlns:u="' + svc.type + '">' +
    Object.entries(args).map(([k, v]) => '<' + k + '>' + v + '</' + k + '>').join('') + '</u:' + action + '></s:Body></s:Envelope>';
  const r = await httpText(svc.control, { method: 'POST', headers: { 'content-type': 'text/xml; charset="utf-8"', SOAPAction: '"' + svc.type + '#' + action + '"', 'content-length': Buffer.byteLength(body) } }, body);
  if (r.status !== 200) throw new Error('the router said no (' + r.status + ')');
  return r.text;
}
async function upnpOpen(port, desc) {
  const svc = await upnpService();
  if (!svc) return { ok: false, msg: 'no UPnP router found' };
  const local = svc.local && /^\d+\.\d+\.\d+\.\d+$/.test(svc.local.replace(/^::ffff:/, '')) ? svc.local.replace(/^::ffff:/, '') : (lanAddresses()[0] || {}).address;
  await upnpCall(svc, 'AddPortMapping', { NewRemoteHost: '', NewExternalPort: port, NewProtocol: 'TCP', NewInternalPort: port, NewInternalClient: local, NewEnabled: 1, NewPortMappingDescription: desc, NewLeaseDuration: 0 });
  let external = '';
  try { external = (/<NewExternalIPAddress>([^<]*)<\/NewExternalIPAddress>/i.exec(await upnpCall(svc, 'GetExternalIPAddress', {})) || [])[1] || ''; } catch (e) { /* no matter */ }
  return { ok: true, svc, port, external };
}
async function upnpClose(u) { await upnpCall(u.svc, 'DeletePortMapping', { NewRemoteHost: '', NewExternalPort: u.port, NewProtocol: 'TCP' }); }

// ---- finding open worlds -------------------------------------------------------------------------------
class LanScanner {
  constructor() { this.found = new Map(); this.sock = null; }
  start() {
    if (this.sock) return;
    try {
      this.sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      this.sock.on('error', () => { /* port taken: typing an address still works */ });
      this.sock.on('message', (buf, rinfo) => {
        try {
          const o = JSON.parse(buf.toString('utf8'));
          if (!o.shadowbloom || !o.port) return;
          const mine = new Set(lanAddresses().map(a => a.address));
          this.found.set(rinfo.address + ':' + o.port, { address: rinfo.address, port: o.port, world: o.world, host: o.host, version: o.version, players: o.players, at: Date.now(), self: mine.has(rinfo.address) });
        } catch (e) { /* not ours */ }
      });
      this.sock.bind(DISCOVERY_PORT);
    } catch (e) { this.sock = null; }
  }
  list() { const now = Date.now(); for (const [k, v] of this.found) if (now - v.at > 5000) this.found.delete(k); return [...this.found.values()]; }
  stop() { try { if (this.sock) this.sock.close(); } catch (e) { /* closed */ } this.sock = null; this.found.clear(); }
}

// Ask an address whether a world is open there (when it was typed in rather than found).
function probe(address, port) {
  return new Promise((res) => {
    const req = http.get({ host: address, port: port || FIRST_PORT, path: '/lan.json', timeout: 2500 }, (r) => {
      let s = ''; r.on('data', d => { s += d; }); r.on('end', () => { try { const o = JSON.parse(s); res(o.shadowbloom ? Object.assign({ address, port: port || FIRST_PORT }, o) : null); } catch (e) { res(null); } });
    });
    req.on('timeout', () => { req.destroy(); res(null); });
    req.on('error', () => res(null));
  });
}

module.exports = { LanServer, LanScanner, probe, lanAddresses, FIRST_PORT, DISCOVERY_PORT, WsConn };
