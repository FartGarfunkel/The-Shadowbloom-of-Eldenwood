// Updates from GitHub Releases (0.9.0.40).
//
// The launcher looks at the newest release of a GitHub repository ("owner/repo"):
//   dokuquest.html   the game. A newer one is installed at once into the game folder, the same
//                    place "Install update…" puts it, so no new app download is needed.
//   app.json         which desktop app goes with it: { launcherId, linux: {tag, name, size, sha256},
//                    windows: {…} }. When its launcherId differs from this app's, the launcher
//                    offers to update the app itself: on Linux the AppImage is swapped in place
//                    (same file name, so shortcuts keep working); on Windows the new zip is
//                    unpacked over this folder after the app closes.
// tools/publish.sh makes such releases. Worlds are never touched: they live in the profile folder.
//
// Kept apart from main.js (and free of Electron) so tools/updater_test.js can run it in plain Node.
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const UA = 'Shadowbloom-launcher';
const GAME_MAX = 64 << 20, APP_MAX = 1 << 30;
class UpdErr extends Error {}

function createUpdater(o) {
  // o: { fetch, userData, pkg, verOf, cmpVer, current: () => game version now, gameTarget: () => path,
  //      gameSource: () => update source named by the installed game file, apiBase?, platform?,
  //      appImage?, execPath?, downloads?, tmp? }
  const base = (o.apiBase || 'https://api.github.com').replace(/\/+$/, '');
  const cfgFile = path.join(o.userData, 'updates.json');
  const srcOk = (s) => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100}$/.test(String(s || ''));

  function readCfg() {
    let c = {};
    try { c = JSON.parse(fs.readFileSync(cfgFile, 'utf8')) || {}; } catch (e) { /* none yet */ }
    return { source: typeof c.source === 'string' ? c.source : '', auto: c.auto !== false, token: typeof c.token === 'string' ? c.token : '' };
  }
  function writeCfg(patch) {
    const c = readCfg();
    if (patch && typeof patch.source === 'string') {
      const s = patch.source.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/, '').replace(/\/+$/, '');
      if (s && !srcOk(s)) throw new UpdErr('Write the repository as owner/name, like dokufan/dokuquest.');
      c.source = s;
    }
    if (patch && typeof patch.auto === 'boolean') c.auto = patch.auto;
    if (patch && typeof patch.token === 'string') c.token = patch.token.trim();
    fs.mkdirSync(path.dirname(cfgFile), { recursive: true });
    fs.writeFileSync(cfgFile, JSON.stringify(c, null, 2));
    return c;
  }
  // the repository to use: the one typed in the options, else the one the game file names, else the app's own
  const source = () => readCfg().source || (srcOk(o.gameSource && o.gameSource()) ? o.gameSource() : '') || (srcOk(o.pkg.updateSource) ? o.pkg.updateSource : '');
  const config = () => { const c = readCfg(); return { source: c.source, auto: c.auto, hasToken: !!c.token, using: source(), launcherId: o.pkg.launcherId || '' }; };

  const hdr = (json) => {
    const h = { 'User-Agent': UA, Accept: json ? 'application/vnd.github+json' : 'application/octet-stream', 'X-GitHub-Api-Version': '2022-11-28' };
    const t = readCfg().token; if (t) h.Authorization = 'Bearer ' + t;
    return h;
  };
  async function api(src, p) {
    let r;
    try { r = await o.fetch(`${base}/repos/${src}${p}`, { headers: hdr(true) }); }
    catch (e) { throw new UpdErr('Could not reach GitHub. Are you online?'); }
    if (r.status === 404) throw new UpdErr(p.includes('/tags/') ? 'That release is gone from ' + src + '.' : `No releases on ${src} yet (or it is private: add an access token).`);
    if (r.status === 401) throw new UpdErr('GitHub did not accept the access token.');
    if (r.status === 403 || r.status === 429) throw new UpdErr('GitHub asks us to wait a while (too many checks). Try again later.');
    if (!r.ok) throw new UpdErr('GitHub answered ' + r.status + '.');
    return r.json();
  }
  // Streams an asset into a file (dest) or into memory (no dest), checking its size and, when known, its SHA-256.
  async function download(asset, { dest, max, sha256, onProgress } = {}) {
    if (asset.size > max) throw new UpdErr(asset.name + ' is unexpectedly large.');
    const tok = readCfg().token;
    const url = tok && asset.url ? asset.url : asset.browser_download_url;
    let r;
    try { r = await o.fetch(url, { headers: tok && asset.url ? hdr(false) : { 'User-Agent': UA }, redirect: 'follow' }); }
    catch (e) { throw new UpdErr('The download was cut off. Try again.'); }
    if (!r.ok || !r.body) throw new UpdErr('Could not download ' + asset.name + ' (' + r.status + ').');
    const total = asset.size || Number(r.headers.get('content-length')) || 0;
    const hash = crypto.createHash('sha256'), chunks = [];
    const fd = dest ? fs.openSync(dest, 'w') : null;
    let got = 0, lastTick = 0;
    try {
      const reader = r.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        got += value.length;
        if (got > max) throw new UpdErr(asset.name + ' is unexpectedly large.');
        hash.update(value);
        if (fd !== null) fs.writeSync(fd, value); else chunks.push(Buffer.from(value));
        const now = Date.now();
        if (onProgress && total && now - lastTick > 150) { lastTick = now; onProgress(got / total); }
      }
    } finally { if (fd !== null) fs.closeSync(fd); }
    if (asset.size && got !== asset.size) throw new UpdErr('The download of ' + asset.name + ' was incomplete. Try again.');
    if (sha256 && hash.digest('hex') !== String(sha256).toLowerCase()) throw new UpdErr(asset.name + ' did not match its checksum, so it was not used.');
    if (onProgress) onProgress(1);
    return fd !== null ? dest : Buffer.concat(chunks);
  }

  const plat = () => (o.platform || process.platform) === 'win32' ? 'windows' : (o.platform || process.platform) === 'linux' ? 'linux' : '';
  let lastApp = null;   // what the last check found for the app, used by updateApp()

  // Looks at the newest release. Installs a newer game file straight away; reports a newer app.
  async function check() {
    const src = source();
    if (!src) return { ok: false, none: true, msg: 'No update source set. Type the GitHub repository (owner/name) above.' };
    try {
      const rel = await api(src, '/releases/latest');
      const assets = rel.assets || [];
      const out = { ok: true, source: src, release: rel.tag_name || '', current: o.current() };
      // the game
      const ga = assets.find(a => a.name === 'shadowbloom.html') || assets.find(a => /^(shadowbloom|dokuquest).*\.html$/i.test(a.name));
      let meta = null;
      const ma = assets.find(a => a.name === 'app.json');
      if (ma) { try { meta = JSON.parse((await download(ma, { max: 1 << 20 })).toString('utf8')); } catch (e) { meta = null; } }
      const known = meta && meta.game && meta.game.version;
      if (known) out.latest = known;
      if (ga && !(known && o.cmpVer(known, o.current()) <= 0)) {   // app.json says which game it is, so no download when it isn't newer
        const want = meta && meta.game && meta.game.sha256;
        const html = (await download(ga, { max: GAME_MAX, sha256: want })).toString('utf8');
        const v = o.verOf(html);
        if (!v || !/Emberwild|Shadowbloom|Shadowbloom/.test(html)) throw new UpdErr('The release\'s shadowbloom.html is not a Shadowbloom game file.');
        out.latest = v;
        if (o.cmpVer(v, o.current()) > 0) {
          const f = o.gameTarget();
          fs.mkdirSync(path.dirname(f), { recursive: true });
          fs.writeFileSync(f + '.part', html); fs.renameSync(f + '.part', f);
          out.installed = v; out.current = v;
        }
      }
      // the desktop app
      lastApp = null;
      const p = plat(), info = meta && p && meta[p];
      if (info && info.name && meta.launcherId && meta.launcherId !== o.pkg.launcherId) {
        lastApp = { src, info, launcherId: meta.launcherId, version: meta.appVersion || '' };
        out.app = { size: info.size || 0, name: info.name, version: lastApp.version };
      }
      return out;
    } catch (e) {
      return { ok: false, msg: e instanceof UpdErr ? e.message : 'Update check failed: ' + e.message };
    }
  }

  // Downloads the app found by check(). Linux AppImage: swapped in place, restart to use it.
  // Windows: returns a script that unpacks it over this folder once the app has closed.
  async function updateApp(onProgress) {
    if (!lastApp) return { ok: false, msg: 'Check for updates first.' };
    const { src, info } = lastApp;
    try {
      const rel = await api(src, '/releases/tags/' + encodeURIComponent(info.tag));
      const asset = (rel.assets || []).find(a => a.name === info.name);
      if (!asset) throw new UpdErr(info.name + ' is missing from release ' + info.tag + '.');
      const p = plat();
      if (p === 'linux' && o.appImage && fs.existsSync(o.appImage)) {
        const part = o.appImage + '.part';
        try {
          await download(asset, { dest: part, max: APP_MAX, sha256: info.sha256, onProgress });
          const head = Buffer.alloc(4); const fd = fs.openSync(part, 'r'); fs.readSync(fd, head, 0, 4, 0); fs.closeSync(fd);
          if (!head.equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46]))) throw new UpdErr('The download is not an AppImage.');
          fs.chmodSync(part, 0o755);
          fs.renameSync(part, o.appImage);   // the running copy keeps working until it closes
        } catch (e) { try { fs.unlinkSync(part); } catch (e2) { /* gone */ } throw e; }
        return { ok: true, restart: 'linux', file: o.appImage };
      }
      const dl = o.downloads || o.userData;
      fs.mkdirSync(dl, { recursive: true });
      const dest = path.join(dl, info.name);
      await download(asset, { dest: dest + '.part', max: APP_MAX, sha256: info.sha256, onProgress });
      fs.renameSync(dest + '.part', dest);
      if (p === 'windows' && o.execPath) {
        const script = winScript({ zip: dest, app: path.dirname(o.execPath), exe: o.execPath, tmp: path.join(o.tmp || dl, 'Shadowbloom-update'), log: path.join(o.userData, 'update-log.txt') });
        const ps1 = path.join(o.tmp || o.userData, 'dokuquest-update.ps1');
        fs.writeFileSync(ps1, script);
        return { ok: true, restart: 'windows', script: ps1, file: dest };
      }
      return { ok: true, saved: dest, msg: 'Saved the new app to ' + dest + '.' };
    } catch (e) {
      return { ok: false, msg: e instanceof UpdErr ? e.message : 'The app update failed: ' + e.message };
    }
  }

  return { config, setConfig: (p) => { try { writeCfg(p); return { ok: true, config: config() }; } catch (e) { return { ok: false, msg: e.message, config: config() }; } }, check, updateApp, source };
}

// PowerShell, run hidden after the app closes: wait for it, unzip, copy over the app folder, start it again.
// If anything goes wrong the old app starts as it was and the zip is shown in Explorer.
function winScript({ zip, app, exe, tmp, log }) {
  const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
  return [
    "$ErrorActionPreference = 'Stop'",
    `$zip = ${q(zip)}; $app = ${q(app)}; $exe = ${q(exe)}; $tmp = ${q(tmp)}; $log = ${q(log)}`,
    "function Log($m) { try { Add-Content -LiteralPath $log -Value ((Get-Date -Format s) + ' ' + $m) } catch {} }",
    'try {',
    '  for ($i = 0; $i -lt 120; $i++) { if (-not (Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $exe })) { break }; Start-Sleep -Milliseconds 500 }',
    '  if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Recurse -Force }',
    '  Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force',
    "  $src = Join-Path $tmp 'Shadowbloom'",
    "  if (-not (Test-Path -LiteralPath (Join-Path $src 'Shadowbloom.exe'))) { throw 'the download is not a Shadowbloom app' }",
    '  robocopy $src $app /E /R:10 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null',
    '  if ($LASTEXITCODE -ge 8) { throw ("copying failed, robocopy " + $LASTEXITCODE) }',
    '  Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue',
    "  Log 'updated the app'",
    "} catch { Log ('update failed: ' + $_); Start-Process explorer.exe -ArgumentList ('/select,\"' + $zip + '\"') }",
    'Start-Process -FilePath $exe',
    '',
  ].join('\r\n');
}

module.exports = { createUpdater, winScript };
