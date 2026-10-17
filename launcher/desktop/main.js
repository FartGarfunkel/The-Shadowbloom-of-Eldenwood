// Shadowbloom desktop launcher (Electron). (The game was called Emberwild before 0.8.1.)
//
// Opens the game in its own window: no browser, no address bar. Worlds are
// kept in this app's own profile folder, so they stay put between runs and
// when you replace the app with a newer version:
//   Linux    ~/.config/Shadowbloom
//   Windows  %APPDATA%\Shadowbloom
//   macOS    ~/Library/Application Support/Shadowbloom
// (until 0.9.0.43 it was called Emberwild; the old folder is moved across by itself)
// It starts on the launcher (news, your name, options), and Play opens the game.
// F11 or Alt+Enter toggles full screen. Ctrl+Shift+I opens the developer tools.

const { app, BrowserWindow, Menu, shell, session, ipcMain, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs');
const pkg = require('./package.json');

app.setName('Shadowbloom');
// (0.9.0.43) The profile folder is called Shadowbloom now. The old Emberwild one (worlds, settings, installed
// updates) is moved across the first time, before anything has it open; if it can't be moved (the old app still
// running, say), it's used where it is, so worlds are never left behind.
// (Shadowbloom) its own profile folder: it never touches a DokuQuest or Emberwild install's worlds
function profileDir() { return path.join(app.getPath('appData'), 'Shadowbloom'); }
app.setPath('userData', profileDir());
// Many Linux drivers are on Chromium's GPU block list; the game needs WebGL 2.
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
// Keep the game running at full speed when the window is behind another one (co-op, music).
app.commandLine.appendSwitch('disable-renderer-backgrounding');

if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 400,
    title: 'Shadowbloom',
    backgroundColor: '#0d1311',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false,
      preload: path.join(__dirname, 'preload.js'),
      additionalArguments: ['--ember-version=' + (pkg.fullVersion || pkg.version)],
    },
  });
  Menu.setApplicationMenu(null);
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'launcher.html'));

  // Links to web pages open in your normal browser, not inside the game.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
  });

  // Closing the window saves the world you're in first (at most a few seconds).
  let closing = false;
  win.on('close', (e) => {
    if (closing) return;
    e.preventDefault(); closing = true;
    const save = `(async () => { const g = window.__game; if (!g || !g.inWorld || !g.inWorld()) return;
      for (let i = 0; i < 60 && g.saving; i++) await new Promise(r => setTimeout(r, 50));
      await g.saveNow('quit'); })()`;
    Promise.race([win.webContents.executeJavaScript(save).catch(() => {}), new Promise(r => setTimeout(r, 4000))])
      .finally(() => { if (!win.isDestroyed()) win.destroy(); });
  });

  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.control && input.shift && (input.key === 'I' || input.key === 'i')) { win.webContents.toggleDevTools(); e.preventDefault(); }
  });
}

// Game updates without a new download of the whole app: "Install update…" in the launcher takes a
// newer emberwild.html and keeps it in the game folder; Play then runs whichever version is newest.
const verOf = (html) => (String(html).match(/GAME_VERSION = '([^']+)'/) || [])[1] || '';
const cmpVer = (a, b) => {
  const pa = String(a).split(/[.-]/).map(n => parseInt(n, 10) || 0), pb = String(b).split(/[.-]/).map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d; }
  return 0;
};
const bundledVersion = pkg.fullVersion || pkg.version;
const updatePath = () => path.join(app.getPath('userData'), 'game', 'index.html');
function installedUpdate() {
  try { const html = fs.readFileSync(updatePath(), 'utf8'); const v = verOf(html); if (v && cmpVer(v, bundledVersion) > 0) return { file: updatePath(), version: v }; } catch (e) { /* none */ }
  return null;
}
ipcMain.handle('ember:version', () => { const u = installedUpdate(); return u ? u.version : bundledVersion; });
// The news comes from the game file that Play will run, so an installed update brings its own notes.
ipcMain.handle('ember:news', () => {
  const u = installedUpdate();
  try {
    const html = fs.readFileSync(u ? u.file : path.join(__dirname, 'index.html'), 'utf8');
    const m = html.match(/<template id="ember-news">([\s\S]*?)<\/template>/);
    return m ? m[1] : '';
  } catch (e) { return ''; }
});
ipcMain.handle('ember:update', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Choose the new shadowbloom.html', filters: [{ name: 'Shadowbloom game', extensions: ['html'] }], properties: ['openFile'] });
  if (r.canceled || !r.filePaths[0]) return { ok: false };
  try {
    const html = fs.readFileSync(r.filePaths[0], 'utf8'), v = verOf(html);
    if (!v || !/Emberwild|Shadowbloom|Shadowbloom/.test(html)) return { ok: false, msg: 'That file is not a Shadowbloom game file.' };
    const cur = installedUpdate() ? installedUpdate().version : bundledVersion;
    if (cmpVer(v, cur) <= 0) return { ok: false, msg: `That is version ${v}; you already have ${cur}.` };
    fs.mkdirSync(path.dirname(updatePath()), { recursive: true });
    fs.writeFileSync(updatePath(), html);
    return { ok: true, version: v };
  } catch (e) { return { ok: false, msg: 'Could not install it: ' + e.message }; }
});

// ---- Updates from GitHub Releases (0.9.0.40, see updater.js) ---------------------------------------
// The repository comes from the options, else from the game file (UPDATE_SOURCE in it), else from this app.
const os = require('os');
const { createUpdater } = require('./updater.js');
const gameNowHtml = () => { try { return fs.readFileSync(installedUpdate() ? updatePath() : path.join(__dirname, 'index.html'), 'utf8'); } catch (e) { return ''; } };
const updater = createUpdater({
  fetch: (url, opts) => net.fetch(url, opts),
  userData: app.getPath('userData'), pkg,
  verOf, cmpVer,
  current: () => { const u = installedUpdate(); return u ? u.version : bundledVersion; },
  gameTarget: updatePath,
  gameSource: () => (gameNowHtml().match(/UPDATE_SOURCE = '([^']*)'/) || [])[1] || '',
  apiBase: process.env.DQ_UPDATE_API || undefined,   // for tests only
  appImage: process.env.APPIMAGE || '', execPath: process.execPath,
  downloads: (() => { try { return app.getPath('downloads'); } catch (e) { return os.homedir(); } })(), tmp: os.tmpdir(),
});
ipcMain.handle('ember:updcfg', (e, patch) => patch ? updater.setConfig(patch) : { ok: true, config: updater.config() });
ipcMain.handle('ember:checkUpdate', () => updater.check());
ipcMain.handle('ember:updateApp', (e) => updater.updateApp((f) => { if (!e.sender.isDestroyed()) e.sender.send('ember:updprog', f); }));
let pendingRestart = null;
ipcMain.handle('ember:restart', (e, r) => {
  if (!r || !r.restart) return false;
  pendingRestart = r;
  app.quit();
  return true;
});
app.on('will-quit', () => {
  const r = pendingRestart; if (!r) return;
  pendingRestart = null;
  if (r.restart === 'linux' && process.env.APPIMAGE) app.relaunch({ execPath: process.env.APPIMAGE, args: process.argv.slice(1).filter(a => a !== '--no-sandbox') });
  else if (r.restart === 'windows' && r.script) {
    require('child_process').spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', r.script], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  }
});

// ---- LAN (0.8.6): your world, open to the home network --------------------------------------------
// The server (lan.js) serves whichever game file Play runs, so a browser on a phone or another
// computer gets the same version you're playing.
const { LanServer, LanScanner, probe, lanAddresses } = require('./lan.js');
let lan = null, scanner = null;
const gameFileNow = () => { const u = installedUpdate(); return u ? u.file : path.join(__dirname, 'index.html'); };
ipcMain.handle('lan:open', async (e, o = {}) => {
  if (lan) { Object.assign(lan.opts, { world: o.world || lan.opts.world, host: o.host || lan.opts.host }); return { ok: true, port: lan.port, token: lan.token, addresses: lanAddresses().map(a => a.address) }; }
  lan = new LanServer({ gameFile: gameFileNow, world: o.world, host: o.host, version: o.version, port: o.port, maxGuests: o.max, upnp: !!o.upnp });
  try { return Object.assign({ ok: true }, await lan.start()); }
  catch (err) { lan = null; return { ok: false, msg: err.message }; }
});
ipcMain.handle('lan:close', () => { if (lan) lan.stop(); lan = null; return true; });
ipcMain.handle('lan:scan', () => { if (!scanner) { scanner = new LanScanner(); scanner.start(); } return scanner.list().filter(f => !(lan && f.self && f.port === lan.port)); });
ipcMain.handle('lan:scanStop', () => { if (scanner) scanner.stop(); scanner = null; return true; });
ipcMain.handle('lan:probe', (e, address, port) => probe(address, port));
app.on('before-quit', () => { if (lan) lan.stop(); if (scanner) scanner.stop(); });

// Launcher -> game, and back again when you quit the game (if that option is on).
let backToLauncher = true;
ipcMain.on('ember:play', (e, opts) => {
  if (!win) return;
  backToLauncher = opts.back !== false;
  if (opts.fullscreen) win.setFullScreen(true);
  const u = installedUpdate();
  win.loadFile(u ? u.file : path.join(__dirname, 'index.html'), opts.server ? { search: 'server=1' } : undefined);   // 0.9.0.29: straight to the server screen
});
ipcMain.on('ember:quit', () => {
  if (lan) { lan.stop(); lan = null; }
  if (!win) return;
  if (backToLauncher) { win.setFullScreen(false); win.loadFile(path.join(__dirname, 'launcher.html')); } else win.close();
});
ipcMain.on('ember:folder', () => shell.openPath(app.getPath('userData')));

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  // Saves, screenshots and world backups ask where to go, starting in Downloads.
  session.defaultSession.on('will-download', (e, item) => {
    item.setSaveDialogOptions({ defaultPath: path.join(app.getPath('downloads'), item.getFilename()) });
  });
  // Gamepads, pointer lock and full screen are all the game ever asks for.
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(['pointerLock', 'fullscreen', 'clipboard-sanitized-write'].includes(permission)));
  createWindow();
  // 0.9.0.29: "Shadowbloom --server" starts on the server screen (for a computer that only runs the server)
  if (process.argv.includes('--server')) win.webContents.once('did-finish-load', () => { const u = installedUpdate(); win.loadFile(u ? u.file : path.join(__dirname, 'index.html'), { search: 'server=1' }); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => app.quit());
