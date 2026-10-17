// Tests launcher/desktop/updater.js against a stand-in for GitHub's API (0.9.0.40).
//   node tools/updater_test.js
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { createUpdater, winScript } = require('../launcher/desktop/updater.js');

const verOf = (html) => (String(html).match(/GAME_VERSION = '([^']+)'/) || [])[1] || '';
const cmpVer = (a, b) => {
  const pa = String(a).split(/[.-]/).map(n => parseInt(n, 10) || 0), pb = String(b).split(/[.-]/).map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
  return 0;
};
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const GAME = Buffer.from("<html><body>Shadowbloom<script>const GAME_VERSION = '0.9.0-alpha.41'; const UPDATE_SOURCE = 'o/r';</script></body></html>");
const APPIMG = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), crypto.randomBytes(200000)]);
const ZIP = Buffer.concat([Buffer.from('PK\x03\x04'), crypto.randomBytes(5000)]);
let hits = {}, lastAuth = {}, appSha = sha(APPIMG), lid = 'new-launcher';

let base = '';
const appJson = () => Buffer.from(JSON.stringify({
  game: { version: '0.9.0-alpha.41', size: GAME.length, sha256: sha(GAME) }, launcherId: lid, appVersion: '0.9.0-alpha.41',
  linux: { tag: 'v0.9.0.40', name: 'Shadowbloom-0.9.0.40-x86_64.AppImage', size: APPIMG.length, sha256: appSha },
  windows: { tag: 'v0.9.0.40', name: 'Shadowbloom-0.9.0.40-windows-x64.zip', size: ZIP.length, sha256: sha(ZIP) },
}));
const asset = (id, name, size) => ({ name, size, browser_download_url: `${base}/dl/${id}`, url: `${base}/api/assets/${id}` });
const blobs = { game: () => GAME, appjson: appJson, appimg: () => APPIMG, zip: () => ZIP };
const server = http.createServer((req, res) => {
  const u = req.url; hits[u] = (hits[u] || 0) + 1; lastAuth[u] = req.headers.authorization || '';
  const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u === '/repos/o/r/releases/latest') return json(200, { tag_name: 'v0.9.0.41', assets: [asset('game', 'dokuquest.html', GAME.length), asset('appjson', 'app.json', appJson().length)] });
  if (u === '/repos/o/r/releases/tags/v0.9.0.40') return json(200, { tag_name: 'v0.9.0.40', assets: [asset('appimg', 'Shadowbloom-0.9.0.40-x86_64.AppImage', APPIMG.length), asset('zip', 'Shadowbloom-0.9.0.40-windows-x64.zip', ZIP.length)] });
  if (u === '/repos/p/private/releases/latest') return req.headers.authorization === 'Bearer sekrit' ? json(200, { tag_name: 'v1', assets: [asset('game', 'dokuquest.html', GAME.length)] }) : json(404, {});
  let m;
  if ((m = u.match(/^\/dl\/(\w+)$/))) { res.writeHead(302, { location: `${base}/blob/${m[1]}` }); return res.end(); }   // like GitHub: a redirect to the file
  if ((m = u.match(/^\/api\/assets\/(\w+)$/))) {
    if (req.headers.accept !== 'application/octet-stream') return json(415, {});
    res.writeHead(302, { location: `${base}/blob/${m[1]}` }); return res.end();
  }
  if ((m = u.match(/^\/blob\/(\w+)$/)) && blobs[m[1]]) { const b = blobs[m[1]](); res.writeHead(200, { 'content-length': b.length }); return res.end(b); }
  json(404, {});
});

let pass = 0, fail = 0;
const ok = (c, name) => { if (c) pass++; else fail++; console.log((c ? 'ok   ' : 'FAIL ') + name); };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dq-upd-'));
  const userData = path.join(root, 'userData'), downloads = path.join(root, 'Downloads');
  let current = '0.9.0-alpha.40', gameSrc = '';
  const target = path.join(userData, 'game', 'index.html');
  const appImage = path.join(root, 'apps', 'Shadowbloom-0.9.0.33-x86_64.AppImage');
  fs.mkdirSync(path.dirname(appImage), { recursive: true }); fs.writeFileSync(appImage, 'old app'); fs.chmodSync(appImage, 0o644);
  const mk = (extra) => createUpdater(Object.assign({
    fetch: (u, o) => fetch(u, o), userData, pkg: { launcherId: 'old-launcher', updateSource: '' }, verOf, cmpVer,
    current: () => current, gameTarget: () => target, gameSource: () => gameSrc, apiBase: base,
    platform: 'linux', appImage, execPath: '/opt/Shadowbloom/Shadowbloom.exe', downloads, tmp: root,
  }, extra || {}));
  let U = mk();

  let r = await U.check();
  ok(!r.ok && r.none, 'no repository set: says so');
  r = U.setConfig({ source: 'not a repo' });
  ok(!r.ok && /owner\/name/.test(r.msg), 'a bad repository name is refused');
  r = U.setConfig({ source: 'https://github.com/o/r.git' });
  ok(r.ok && r.config.source === 'o/r' && r.config.using === 'o/r', 'a GitHub link is trimmed to owner/name');

  r = await U.check();
  ok(r.ok && r.installed === '0.9.0-alpha.41', 'a newer game installs: ' + JSON.stringify(r).slice(0, 120));
  ok(fs.readFileSync(target).equals(GAME) && !fs.existsSync(target + '.part'), 'the game file is in the game folder');
  ok(r.app && r.app.name.endsWith('.AppImage') && r.app.size === APPIMG.length, 'a newer app is offered');
  ok(hits['/dl/game'] === 1 && hits['/blob/game'] === 1, 'downloads follow the redirect');

  current = '0.9.0-alpha.41';
  r = await U.check();
  ok(r.ok && !r.installed && r.latest === '0.9.0-alpha.41', 'the same version: nothing installed');
  ok(hits['/dl/game'] === 1, 'the same version: the game is not downloaded again (app.json said which it is)');

  const progress = [];
  r = await U.updateApp((f) => progress.push(f));
  ok(r.ok && r.restart === 'linux', 'the AppImage update downloads: ' + JSON.stringify(r));
  ok(fs.readFileSync(appImage).equals(APPIMG) && (fs.statSync(appImage).mode & 0o111) && !fs.existsSync(appImage + '.part'), 'the AppImage is swapped in place, executable');
  ok(progress.length && progress[progress.length - 1] === 1, 'progress reaches 100%');

  // a damaged download is never used
  fs.writeFileSync(appImage, 'old app');
  appSha = '0'.repeat(64);
  await U.check(); r = await U.updateApp();
  ok(!r.ok && /checksum/.test(r.msg) && fs.readFileSync(appImage, 'utf8') === 'old app' && !fs.existsSync(appImage + '.part'), 'a bad checksum leaves the old app alone');
  appSha = sha(APPIMG);

  // nothing offered when the app is the same
  lid = 'old-launcher';
  r = await U.check();
  ok(r.ok && !r.app, 'the same app: no app update offered');
  r = await U.updateApp();
  ok(!r.ok, 'updateApp without an offer does nothing');
  lid = 'new-launcher';

  // Windows: the zip goes to Downloads and a script unpacks it after the app closes
  const W = mk({ platform: 'win32' });
  await W.check(); r = await W.updateApp();
  ok(r.ok && r.restart === 'windows' && fs.readFileSync(path.join(downloads, 'Shadowbloom-0.9.0.40-windows-x64.zip')).equals(ZIP), 'Windows: the zip is downloaded');
  const ps = fs.readFileSync(r.script, 'utf8');
  ok(/Expand-Archive/.test(ps) && ps.includes("$app = '/opt/Shadowbloom'") && /robocopy/.test(ps) && /Start-Process -FilePath \$exe/.test(ps), 'Windows: the install script names the right folders');
  ok(winScript({ zip: "C:\\Users\\O'Neil\\x.zip", app: 'a', exe: 'b', tmp: 'c', log: 'd' }).includes("'C:\\Users\\O''Neil\\x.zip'"), 'Windows: quotes in paths are escaped');

  // no AppImage (the plain folder build): saved to Downloads
  const P = mk({ appImage: '' });
  await P.check(); r = await P.updateApp();
  ok(r.ok && r.saved && fs.existsSync(r.saved), 'Linux without an AppImage: saved to Downloads');

  // the game file can name the repository
  U.setConfig({ source: '' });
  gameSrc = 'o/r';
  ok(U.config().using === 'o/r' && U.config().source === '', 'the game file names the repository when none is typed');
  gameSrc = '';

  // private repository with a token
  U.setConfig({ source: 'p/private' });
  r = await U.check();
  ok(!r.ok && /private/.test(r.msg), 'a private repository without a token: says how to fix it');
  U.setConfig({ token: 'sekrit' });
  current = '0.9.0-alpha.40'; fs.rmSync(target);
  r = await U.check();
  ok(r.ok && r.installed && lastAuth['/api/assets/game'] === 'Bearer sekrit', 'a private repository with a token: the game installs through the API');
  ok(U.config().hasToken && !JSON.stringify(U.config()).includes('sekrit'), 'the token is never handed back to the page');

  r = await mk({ apiBase: 'http://127.0.0.1:1' }).check();
  ok(!r.ok && /online/.test(r.msg), 'offline: a plain message');

  server.close(); fs.rmSync(root, { recursive: true, force: true });
  console.log(`SUMMARY ${pass} / ${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
