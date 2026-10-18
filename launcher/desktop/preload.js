// The few things the launcher page may ask the desktop app to do.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('emberLauncher', {
  version: process.argv.find(a => a.startsWith('--ember-version='))?.slice(16) || '',
  play: (opts) => ipcRenderer.send('ember:play', opts || {}),
  server: () => ipcRenderer.send('ember:play', { server: true, back: true }),   // 0.9.0.29: the dedicated server screen
  openFolder: () => ipcRenderer.send('ember:folder'),
  quit: () => ipcRenderer.send('ember:quit'),
  gameVersion: () => ipcRenderer.invoke('ember:version'),
  installUpdate: () => ipcRenderer.invoke('ember:update'),
  // (alpha 2) the GeruDoku resource pack, fetched by the app from its official GitHub release
  fetchPack: (url) => ipcRenderer.invoke('ember:fetchPack', url),
  news: () => ipcRenderer.invoke('ember:news'),
  // 0.9.0.40: updates from GitHub Releases
  updates: {
    config: (patch) => ipcRenderer.invoke('ember:updcfg', patch || null),
    check: () => ipcRenderer.invoke('ember:checkUpdate'),
    updateApp: () => ipcRenderer.invoke('ember:updateApp'),
    restart: (r) => ipcRenderer.invoke('ember:restart', r),
    onProgress: (cb) => { ipcRenderer.removeAllListeners('ember:updprog'); ipcRenderer.on('ember:updprog', (e, f) => cb(f)); },
  },
  // 0.8.6: open your world to the home network, and find worlds others have opened
  lan: {
    open: (o) => ipcRenderer.invoke('lan:open', o),
    close: () => ipcRenderer.invoke('lan:close'),
    scan: () => ipcRenderer.invoke('lan:scan'),
    scanStop: () => ipcRenderer.invoke('lan:scanStop'),
    probe: (address, port) => ipcRenderer.invoke('lan:probe', address, port),
  },
});
