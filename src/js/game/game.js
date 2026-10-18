// ---------------------------------------------------------------------------
// game/game.js — the game: world lifecycle, the frame loop, the people
// playing on this device (split-screen), creatures, saving, dimensions.
// Per-player rules (mining, building, eating...) live in game/local.js.
// ---------------------------------------------------------------------------

const DAY_LEN = 1200; // seconds per full day

const DEFAULT_SETTINGS = (() => {
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  return {
    renderDist: coarse ? 4 : 6, sens: 1, padSens: 1, fov: 72, scale: coarse ? 0.75 : 1, fancyLeaves: !coarse, plantDetail: 'near', wavingPlants: true,
    autoJump: coarse, volume: 0.6, music: 0.5, ambience: 0.7, invertY: false, showFps: false, fpBody: true, viewBob: true, brightness: 0.35, split: 'auto',
    particles: 2, guiScale: 'auto', uiScale: null, toggleSneak: false, toggleSprint: false, screenShake: true, hurtTilt: true, fpsLimit: 0, padLayout: 'xbox', heldSway: true, clouds: true, portalViews: true,
    farTerrain: coarse ? 0 : 1024,
  };
})();
function loadSettings() {
  try { const s = JSON.parse(localStorage.getItem('emberwild.settings') || '{}'); return Object.assign({}, DEFAULT_SETTINGS, s); }
  catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
}
function storeSettings(s) { try { localStorage.setItem('emberwild.settings', JSON.stringify(s)); } catch (e) { /* private mode */ } }
function loadProfiles() {
  let p = [];
  try { p = JSON.parse(localStorage.getItem('emberwild.profiles') || '[]'); } catch (e) { p = []; }
  for (let i = 0; i < 4; i++) if (!p[i]) p[i] = { name: i === 0 ? 'Wanderer' : 'Player ' + (i + 1), skin: null };
  return p;
}
function storeProfiles(p) { try { localStorage.setItem('emberwild.profiles', JSON.stringify(p)); } catch (e) { /* quota: skins are large */ } }

// (0.9.0.54) a list of entities being let go (a world left, a layer closed): the ones with GPU meshes of their own free them
function disposeEntities(list) { if (list) for (const e of list) if (e && e.dispose) { try { e.dispose(); } catch (er) { /* only tidying */ } } }
class Game {
  constructor() {
    this.canvas = document.getElementById('gl');
    this.settings = loadSettings();
    this.profiles = loadProfiles();
    this.state = 'boot';
    this.world = null; this.meta = null; this.dim = 0;
    this.locals = [];
    this.entities = []; this.nextEntityId = 1;
    this.particles = new Particles();
    this.env = { day: 1 };
    this.time = 0; this.tickAcc = 0; this.spawnAcc = 0; this.randAcc = 0; this.saveAcc = 0; this.furnAcc = 0;
    this.rand = Math.random;
    this.fps = 60; this._fpsAcc = 0; this._fpsN = 0;
    this.lastSave = 0; this.saving = false;
    this.net = null;
    this.ui = null;
  }
  get player() { return this.locals[0] ? this.locals[0].player : null; }
  get local() { return this.locals[0] || null; }
  get isGuest() { return !!(this.net && this.net.role === 'client'); }
  get creative() { return !!(this.meta && this.meta.mode === 'creative'); }

  // ---- boot --------------------------------------------------------------------------
  async boot(hotData) {
    buildAtlas();
    try { await applyResourcePack(); } catch (e) { console.warn('resource pack', e); }   // render/packs.js
    resolveBlockTextures(); buildIcons();
    this.renderer = new Renderer(this.canvas);
    try { renderBlockIcons(this.renderer); } catch (e) { console.warn('3D icons unavailable', e); }
    installIconCSS();
    this.input = new InputManager(this.canvas);
    this.input.onPauseRequest = () => { if (this.state === 'playing' && !this.input.touchMode && this.local && this.local.mode === 'play') this.pause(); };
    this.input.onAnyGesture = () => this.sfx.unlock();
    this.input.onModeChange = () => { for (const l of this.locals) l.hud.applyTouch(); };
    this.pads = new Gamepads(this);
    this.sfx = new Sfx(); this.sfx.listeners = () => this.locals.map(l => l.cam || l.player);
    this.ambience = new Ambience(this);
    this.music = new Music(this);
    this.fauna = new Fauna(this);
    this.mech = new Mechanics(this);
    this.rs = new Redstone(this);
    this.wind = new Wind(1234);
    this.save = new SaveManager();
    this.ui = new UI(this);
    this.applySettings();
    this.save.cloud.onStatus = (s, n) => this.ui.syncStatus(s, n);
    const ready = this.save.init().then(() => this.ui.storeReady());
    this.startPanorama();
    this.last = performance.now();
    requestAnimationFrame(t => this.loop(t));
    window.addEventListener('resize', () => this.layoutViews());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.inWorld()) this.saveNow('hidden'); });
    window.addEventListener('pagehide', () => { if (this.inWorld()) this.saveNow('pagehide'); });
    await ready;
    if (hotData && hotData.pending) {
      try { await this.save.saveWorld(hotData.pending.rec, hotData.pending.chunks); } catch (e) { console.warn(e); }
    }
    if (hotData && hotData.resume) this.openWorld(hotData.resume);
    else this.ui.show('title');
    if (typeof NetSession !== 'undefined') NetSession.autoDetect(this);
  }
  inWorld() { return !!(this.meta && this.locals.length && (this.state === 'playing' || this.state === 'paused')); }
  applySettingsLight() {
    const s = this.settings;
    this.input.sens = s.sens; this.input.invertY = s.invertY;
    this.input.toggleSneak = !!s.toggleSneak; this.input.toggleSprint = !!s.toggleSprint;
    this.sfx.setVolume(s.volume);
    if (this.ambience) this.ambience.setLevels(s.ambience, s.music);
    if (this.music) this.music.setVolume(s.music ?? 0.5);
  }
  applySettings() {
    const s = this.settings;
    this.applySettingsLight();
    storeSettings(s);
    if (this.world && this._leaves !== undefined && (this._leaves !== s.fancyLeaves || this._plants !== s.plantDetail)) {
      for (const c of this.world.chunks.values()) { c.needsMesh = true; this.world.meshSet.add(c); }
    }
    this._leaves = s.fancyLeaves; this._plants = s.plantDetail;
    this.layoutViews();
  }
  saveProfiles() { storeProfiles(this.profiles); }

  // Slowly orbiting view of a demo world behind the title menu.
  startPanorama() {
    this.panorama = { world: new World(0, seedFromString('emberwild-title'), new Map(), GEN_VERSION), yaw: 0.6 };
    this.panorama.world.onChunkUnload = (c) => this.renderer.freeChunk(c);
    let top = SEA;
    for (let dz = -40; dz <= 40; dz += 8) for (let dx = -40; dx <= 40; dx += 8) top = Math.max(top, this.panorama.world.gen.surfaceEstimate(8 + dx, 8 + dz));
    this.panorama.y = top + 10;
    this.state = 'title';
  }
  stopPanorama() {
    if (!this.panorama) return;
    this.panorama.world.unloadAll();
    this.renderer.freeAll();
    this.panorama = null;
  }

  // ---- people on this device -------------------------------------------------------------
  addLocal(padIndex) {
    if (this.locals.length >= 4) return null;
    const i = this.locals.length;
    const lp = new LocalPlayer(this, i, this.profiles[i]);
    if (padIndex !== undefined && padIndex !== null) { for (const l of this.locals) l.pads.delete(padIndex); lp.pads.add(padIndex); lp.useKb = i === 0; }
    this.locals.push(lp);
    // newcomers join next to the first player, with any saved inventory they had here
    if (i > 0 && this.meta) {
      const saved = this.meta.coPlayers && this.meta.coPlayers[i];
      if (saved && saved.dim === this.dim) lp.player.load(saved);
      else { lp.player.dim = this.dim; this.placeNear(lp.player, this.locals[0].player); }
      lp.hud.toast(lp.name + ' joined', 'good');
    }
    this.layoutViews();
    return lp;
  }
  removeLocal(lp) {
    if (lp.index === 0) return;
    if (this.meta) { this.meta.coPlayers = this.meta.coPlayers || {}; this.meta.coPlayers[lp.index] = lp.player.toJSON(); }
    lp.el.remove();
    this.locals = this.locals.filter(l => l !== lp);
    this.locals.forEach((l, i) => { l.index = i; });
    this.layoutViews();
    this.saveSoon();
  }
  // Split the screen: 1 = full, 2 = side by side (or stacked), 3-4 = quarters.
  layoutViews() {
    const W = window.innerWidth, H = window.innerHeight, n = this.locals.length;
    const mode = this.settings.split === 'auto' ? (W > H * 1.2 ? 'vertical' : 'horizontal') : this.settings.split;
    const rects = [];
    if (n <= 1) rects.push([0, 0, W, H]);
    else if (n === 2) {
      if (mode === 'vertical') rects.push([0, 0, W / 2, H], [W / 2, 0, W / 2, H]);
      else rects.push([0, 0, W, H / 2], [0, H / 2, W, H / 2]);
    } else {
      rects.push([0, 0, W / 2, H / 2], [W / 2, 0, W / 2, H / 2], [0, H / 2, W / 2, H / 2], [W / 2, H / 2, W / 2, H / 2]);
      if (n === 3) rects[2] = [0, H / 2, W, H / 2];
    }
    this.locals.forEach((l, i) => {
      const [x, y, w, h] = rects[i];
      l.view = { x, y, w, h };
      Object.assign(l.el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      l.el.classList.toggle('split', n > 1);
      l.hud.layout();
    });
  }

  // ---- world lifecycle --------------------------------------------------------------------
  async createWorld(name, seedText, mode, rules) {
    const seed = seedText && seedText.trim() ? seedFromString(seedText) : (Math.random() * 2 ** 31) | 0;
    const id = 'w' + uid();
    const meta = { id, name: name.trim() || 'New World', seed, seedText: seedText || String(seed), genVersion: GEN_VERSION, createdAt: Date.now(), playTime: 0, time: 60, spawn: null, flags: {}, coPlayers: {}, netPlayers: {}, mode: mode === 'creative' ? 'creative' : 'survival' };
    if (rules) meta.rules = Object.assign({}, RULE_DEFAULTS, rules, { _v: 1 });
    const rec = { id, format: SAVE_FORMAT, meta, player: null, savedAt: Date.now() };
    await this.save.saveWorld(rec, []);
    return this.openWorld(id);
  }
  async openWorld(id) {
    this.ui.show('loading'); this.ui.loading('Opening world…', 0.05);
    let data;
    try { data = await this.save.openWorld(id, (msg) => this.ui.loading(msg, 0.1)); }
    catch (e) { console.error(e); this.ui.show('worlds'); this.ui.toastMenu('That world could not be opened: ' + e.message); return; }
    this.enterWorld(data.rec.meta, data.records, data.rec.player, data.rec);
  }
  // Shared by local worlds and LAN guests (who get meta/records from the host).
  enterWorld(meta, records, playerRec, worldRec) {
    this.stopPanorama();
    this.meta = meta;
    this.meta.flags = this.meta.flags || {};
    this.records = records;
    this.worldRec = worldRec || null;
    for (const l of this.locals) l.el.remove();
    this.locals = [];
    const lp = this.addLocal();
    if (playerRec) lp.player.load(playerRec);
    for (const pi of this.pads.connected()) if (![...this.locals].some(l => l.pads.has(pi))) { lp.pads.add(pi); break; }
    disposeEntities(this.entities); this.entities = []; this.particles.list = []; this.fauna.clear();
    this.haunt = new Haunt(this);
    this.loadDimension(lp.player.dim);
    if (!playerRec) this.placeAtSpawn(lp.player, true);
    this.state = 'loading';
    this.loadingTarget = Math.min(this.settings.renderDist, 3);
    this.ui.loading('Generating terrain…', 0.15);
  }
  loadDimension(dim) {
    // a world made ready ahead of time (game/seamless.js: the stacked worlds) is taken over as it is,
    // and the one being left can be kept, drawn on in the background, for the way back
    const pre = this._preWorld && this._preWorld.dim === dim ? this._preWorld : null, keep = this._keepWorld;
    this._preWorld = null; this._keepWorld = null;
    if (this.world && this.world !== keep) this.world.unloadAll();
    if (!pre) this.renderer.freeAll();
    this.mech.clear();
    this.dim = dim;
    this.world = pre || new World(dim, this.meta.seed, this.records, this.meta.genVersion || 1);
    if (pre) worldFluidRules(dim);
    this.world.onChunkUnload = (c) => this.renderer.freeChunk(c);
    this.world.onBlockChanged = (x, y, z, o, n, opts) => this.onBlockChanged(x, y, z, o, n, opts);
    this.rs.clear(); this.damage = null;
    this.world.onAnyChange = (x, y, z, o, n) => this.rs.changed(x, y, z, o, n);
    this.world.onFluidReact = (x, y, z) => { this.sfx.playAt('fizz', x, y, z); this.burst(x + 0.5, y + 0.8, z + 0.5, 'white', 6, 0.5, 0.1); };
    this.world.onFluidWash = (x, y, z, id) => { this.dropBlockItems(x, y, z, id, true); };
    this.world.onGrowExtra = (x, y, z, id, meta, rnd) => this.growExtra(x, y, z, id, meta, rnd);
    this.world.onSurfaceTick = (x, y, z, id, rnd) => this.grassTick(x, y, z, id, rnd);
    this.world.isGuest = this.isGuest;
    // boats wait where they were left
    const boats = (this.meta.boats && this.meta.boats[dim]) || [];
    for (const b of boats) if (BOAT_TYPES[b.type]) { const bt = new Boat(this, b.type, b.x, b.y, b.z, b.yaw); bt.sail = b.sail ?? 0.6; this.addEntity(bt); if (typeof boatPetFromSnap === 'function') boatPetFromSnap(this, b, bt); }
    this.loadCarts(dim);
    // and the animals that were kept here
    const kept = (this.meta.animals && this.meta.animals[dim]) || [];
    for (const a of kept) {
      if (!MOB_TYPES[a.t]) continue;
      const m = new Mob(this, a.t, a.x, a.y, a.z);
      m.yaw = a.r || 0; m.kept = true; if (a.h) m.health = a.h; if (a.c) m.color = a.c; m.sheared = !!a.s; m.stag = !!a.g;
      if (a.b) { m.makeBaby(); m.growT = a.b; }
      if (a.v && MODELS[a.v]) m.variant = a.v;
      if (a.o) m.owner = a.o; if (a.n) m.petName = a.n;
      if (typeof applyPetFields === 'function') applyPetFields(m, a);   // saddles, stay orders, slime sizes (game/pets.js)
      this.addEntity(m);
    }
    this.wind = this.wind || new Wind(this.meta.seed);
    for (const l of this.locals) {
      const p = l.player;
      const pcx = Math.floor(p.x) >> 4, pcz = Math.floor(p.z) >> 4;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.world.ensureChunk(pcx + dx, pcz + dz);
    }
  }
  placeAtSpawn(p, initial) {
    const w = this.world;
    if (!this.meta.spawn) {
      let sx = 0, sz = 0;
      outer: for (let r = 0; r < 4000; r += 16) {
        for (let a = 0; a < 8; a++) {
          const x = Math.round(Math.cos(a / 8 * TAU) * r), z = Math.round(Math.sin(a / 8 * TAU) * r);
          if (w.gen.goodSpawn(x, z)) { sx = x; sz = z; break outer; }
        }
      }
      this.meta.spawn = [sx + 0.5, 0, sz + 0.5];
    }
    const [sx, , sz] = this.meta.spawn;
    p.x = sx; p.z = sz;
    const pcx = Math.floor(sx) >> 4, pcz = Math.floor(sz) >> 4;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) w.ensureChunk(pcx + dx, pcz + dz);
    const y = findSafeY(w, sx, sz);
    p.y = y > 0 ? y : 90;
    p.vx = p.vy = p.vz = 0;
    if (initial) { p.yaw = Math.random() * TAU; p.pitch = -0.1; }
  }
  placeNear(p, other) {
    if (!other) { this.placeAtSpawn(p, false); return; }
    p.x = other.x + 1; p.z = other.z; p.y = other.y + 0.5; p.vx = p.vy = p.vz = 0; p.yaw = other.yaw; p.fallStart = null;
  }

  saveSoon() { clearTimeout(this._soon); this._soon = setTimeout(() => this.saveNow('soon'), 400); }
  async saveNow(reason) {
    if (!this.meta || !this.locals.length || !this.world) return;
    if (this.isGuest) { if (this.net) this.net.sendMe(); return; }
    if (this.saving) { this._saveAgain = true; return; }
    this.saving = true;
    this.local.hud.saving(true);
    try {
      const chunks = this.world.collectDirty();
      if (this.shadow && this.shadow.world) chunks.push(...this.shadow.world.collectDirty());
      const rec = this.worldRecord();
      await this.save.saveWorld(rec, chunks);
      this.lastSave = Date.now();
    } catch (e) {
      console.error('Save failed', e);
      this.local.hud.toast('Saving to this browser failed. Use "Download world backup" in the pause menu to keep a copy.', 'warn');
    } finally {
      this.saving = false; if (this.local) this.local.hud.saving(false);
      if (this._saveAgain) { this._saveAgain = false; this.saveNow('again'); }
    }
  }
  storeBoats() {
    if (!this.meta) return;
    this.meta.boats = this.meta.boats || {};
    this.meta.boats[this.dim] = this.entities.filter(e => e.isBoat && !e.remove).map(e => e.snap());
  }
  // Animals someone fed, bred, sheared or carried are kept: they stay put and are saved.
  storeAnimals() {
    if (!this.meta) return;
    this.meta.animals = this.meta.animals || {};
    this.meta.animals[this.dim] = this.entities.filter(e => e instanceof Mob && e.kept && e.alive && !e.remove && !e.ghost)
      .map(e => ({ t: e.type, x: +e.x.toFixed(2), y: +e.y.toFixed(2), z: +e.z.toFixed(2), r: +e.yaw.toFixed(2), h: e.health, c: e.color, s: e.sheared ? 1 : 0, b: e.baby ? Math.round(e.growT) : 0, g: e.stag ? 1 : 0, v: e.variant || undefined, o: e.owner || undefined, n: e.petName || undefined }));
  }
  worldRecord() {
    this.storeBoats();
    this.storeCarts();
    this.storeAnimals();
    this.meta.coPlayers = this.meta.coPlayers || {};
    for (const l of this.locals) if (l.index > 0) this.meta.coPlayers[l.index] = l.player.toJSON();
    if (this.net && this.net.role === 'host') this.net.storeRemotePlayers(this.meta);
    return { id: this.meta.id, format: SAVE_FORMAT, meta: this.meta, player: this.locals[0].player.toJSON(), savedAt: Date.now() };
  }
  hotSnapshot() {
    if (!this.inWorld() || this.isGuest) return {};
    try { return { resume: this.meta.id, pending: { rec: this.worldRecord(), chunks: this.world.collectDirty().concat(this.shadow && this.shadow.world ? this.shadow.world.collectDirty() : []) } }; }
    catch (e) { return { resume: this.meta.id }; }
  }
  async quitToTitle() {
    this.ui.show('loading'); this.ui.loading('Saving…', 0.5);
    await this.saveNow('quit');
    if (this.net) { this.net.close(); this.net = null; }
    this.world.unloadAll(); this.renderer.freeAll();
    for (const l of this.locals) l.el.remove();
    disposeEntities(this.entities); this.world = null; this.meta = null; this.locals = []; this.entities = [];
    this.fauna.clear(); this.ambience.stopAll();
    this.input.enabled = false; this.input.releaseLock(true);
    this.startPanorama();
    this.ui.show('title');
  }

  // ---- state changes ----------------------------------------------------------------------
  startPlaying() {
    this.state = 'playing';
    this.ui.show('game');
    // a short list of recent worlds for the desktop launcher's side panel
    try {
      if (this.meta && !this.isGuest) {
        const r = JSON.parse(localStorage.getItem('emberwild.recent') || '[]').filter(w => w.id !== this.meta.id);
        r.unshift({ id: this.meta.id, name: this.meta.name, mode: this.meta.mode, at: Date.now() });
        localStorage.setItem('emberwild.recent', JSON.stringify(r.slice(0, 8)));
      }
    } catch (e) { /* storage full or blocked */ }
    this.input.enabled = true;
    if (!this.input.touchMode && this.local.mode === 'play') this.input.requestLock();
    for (const l of this.locals) l.hud.dimName(DIM_NAME[this.dim]);
    this.layoutViews();
  }
  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused'; this.input.enabled = false; this.input.releaseLock(true);
    this.ui.show('pause');
    this.saveNow('pause');
  }
  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing'; this.ui.show('game');
    this.input.enabled = true; this.input.s.attack = false; this.input.s.use = false; this.input.endFrame();
    if (!this.input.touchMode && this.local.mode === 'play') this.input.requestLock();
  }

  // ---- main loop -------------------------------------------------------------------------------
  loop(t) {
    requestAnimationFrame(tt => this.loop(tt));
    // frame rate limit (saves battery): skip frames that come too soon
    const lim = this.settings.fpsLimit;
    if (lim && t - this.last < 1000 / lim - 2) return;
    let dt = (t - this.last) / 1000; this.last = t;
    if (dt > 0.1) dt = 0.1;
    if (dt <= 0) dt = 0.001;
    this.time += dt;
    this._fpsAcc += dt; this._fpsN++;
    if (this._fpsAcc > 0.5) { this.fps = this._fpsN / this._fpsAcc; this._fpsAcc = 0; this._fpsN = 0; }
    try { this.pads.poll(dt); this.frame(dt); if (this.music) this.music.update(dt); }
    catch (e) { console.error(e); if (!this._errShown) { this._errShown = true; if (this.local) this.local.hud.toast('Something went wrong: ' + e.message, 'warn'); } }
    this.input.endFrame();
    this.pads.endFrame();
  }
  frame(dt) {
    const R = this.renderDist();
    if (this.panorama && (this.state === 'title' || this.state === 'boot')) {
      const P = this.panorama;
      P.yaw += dt * 0.04;
      P.world.stream([[8, 8]], Math.min(R, 4), 6, (c) => this.meshInto(P.world, c));
      const cam = { x: 8 + Math.sin(P.yaw) * 6, y: P.y, z: 8 + Math.cos(P.yaw) * 6, yaw: P.yaw + Math.PI, pitch: -0.28, fov: 70 };
      this.env = this.computeEnv(0, 0.18);
      this.renderer.beginFrame(this.settings.scale, this.env);
      this.renderer.render(this.panoramaState(cam, Math.min(R, 4)), null);
      this.ui.menuNav(this.pads.menuEvents());
      return;
    }
    if (this.state !== 'playing' && this.state !== 'paused' && this.state !== 'loading') { this.ui.menuNav(this.pads.menuEvents()); return; }
    if (!this.world) return;
    const centers = this.locals.map(l => [l.player.x, l.player.z]).concat(this.net ? this.net.streamCenters() : []);
    if (this.state === 'loading') {
      const res = this.world.stream(centers, R, 30, (c) => this.meshInto(this.world, c));
      const need = this.loadingTarget; let have = 0, tot = 0;
      for (const l of this.locals) {
        const pcx = Math.floor(l.player.x) >> 4, pcz = Math.floor(l.player.z) >> 4;
        for (let dz = -need; dz <= need; dz++) for (let dx = -need; dx <= need; dx++) {
          if (dx * dx + dz * dz > need * need) continue;
          tot++; const c = this.world.chunkAt(pcx + dx, pcz + dz); if (c && c.mesh) have++;
        }
      }
      this.ui.loading(this.loadingText || 'Generating terrain…', 0.15 + 0.85 * have / Math.max(1, tot));
      if (have >= tot || res.pending === 0) { this.loadingText = null; this.startPlaying(); }
      this.env = this.computeEnv(this.dim);
      if (this.net) this.net.update(dt);
      return;
    }
    const running = this.state === 'playing' || (this.state === 'paused' && this.net);
    if (this.state === 'paused') this.ui.menuNav(this.pads.menuEvents());
    if (running) {
      for (const l of this.locals) {
        const inp = this.state === 'playing' ? l.readInput() : InputManager.blankState();
        if (l.mode === 'dead') { if (inp.usePressed || inp.jump || inp.attackPressed) l.hud.deathButtonFocus(); l.hud.deathInput(inp); continue; }
        l.update(dt, inp);
      }
      this.updateEntities(dt);
      if (!this.isGuest) {
        this.tickAcc += dt;
        while (this.tickAcc >= 0.05) { this.tickAcc -= 0.05; this.world.tickNo++; this.world.tickFluids(); this.rs.step(); }
        this.randAcc += dt; if (this.randAcc > 1) { this.randAcc = 0; for (const l of this.locals) this.world.randomTicks(l.player.x, l.player.z, this.rand); }
        this.spawnAcc += dt; if (this.spawnAcc > 1) { this.spawnAcc = 0; this.spawnMobs(); }
        this.furnAcc += dt; if (this.furnAcc > 0.25) { this.tickFurnaces(this.furnAcc); this.furnAcc = 0; }
        if (this.dim === 0) this.advanceTime(dt);
      }
      this.fauna.update(dt);
      if (!this._pass) this.wind.update(dt);
      this.mech.update(dt);
      this.jukeAcc = (this.jukeAcc || 0) + dt; if (this.jukeAcc > 0.5) { this.jukeAcc = 0; this.updateJukeboxes(); }
      this.emitterParticles(dt);
      this.ambientParticles(dt);
      this.world.dayLight = this.env.day;
      if (this.haunt && !this._pass) this.haunt.update(dt);
      if (!this._pass) { this.meta.playTime = (this.meta.playTime || 0) + dt; this.saveAcc += dt; if (this.saveAcc > 25) { this.saveAcc = 0; this.saveNow('auto'); } }
    }
    if (this.net && !this._pass) this.net.update(dt);   // (0.9.0.57) once a frame, with player 1's land (split screen across lands sent the other's to guests)
    this.particles.update(dt, this.world);
    const budget = this.fps < 40 ? 4 : 8;
    this.world.stream(centers, R, budget, (c) => this.meshInto(this.world, c), this.net ? (c) => meshChunk(c, (x, z) => this.world.chunkAt(x, z), { lightOnly: true }) : null);
    this.env = this.computeEnv(this.dim);
    if (!this._pass) { this.ambience.update(dt); this.renderer.animateTextures(this.time); }
    this.renderViews(dt, R);
  }
  renderDist() {
    const n = this.locals.length;
    return n >= 3 ? Math.min(this.settings.renderDist, 4) : n === 2 ? Math.min(this.settings.renderDist, 6) : this.settings.renderDist;
  }
  meshInto(world, c) {
    MESH_RIVER = world.gen && world.gen.riverFlow && world.dim === 0 ? (x, z) => world.gen.riverFlow(x, z) : null;
    const data = meshChunk(c, (x, z) => world.chunkAt(x, z), { fancyLeaves: this.settings.fancyLeaves });
    MESH_RIVER = null;
    this.renderer.uploadChunk(c, data);
  }

  // ---- environment (sky, light, fog) per dimension -----------------------------------------------
  computeEnv(dim, fixedT) {
    const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    const rgb = (h) => hexRGB(h).map(v => v / 255);
    const e = { fogStart: 0.55, minLight: 0.025 + this.settings.brightness * 0.07, stars: 0, showSun: false, sunDir: [0, 1, 0], sunGlow: [0, 0, 0], voidBelow: false, wind: this.settings.wavingPlants ? 0.45 + (this.wind ? this.wind.strength : 0.5) * 0.9 : 0 };
    if (dim === 0) {
      const t = fixedT !== undefined ? fixedT : this.meta.time / DAY_LEN;
      const ang = t * TAU;
      const sh = Math.sin(ang);
      const dayF = smoothstep(-0.2, 0.25, sh);
      const sunset = clamp(1 - Math.abs(sh) / 0.32, 0, 1);
      e.day = 0.2 + 0.8 * dayF;
      e.zenith = mixc(rgb('#03060f'), rgb('#4f8ee8'), dayF);
      e.horizon = mixc(mixc(rgb('#0b1222'), rgb('#b9d6f5'), dayF), rgb('#ff8c4a'), sunset * 0.65);
      e.fog = mixc(mixc(rgb('#0a101c'), rgb('#b3d0ee'), dayF), rgb('#e88a5a'), sunset * 0.4);
      e.stars = 1 - dayF;
      e.showSun = true;
      const l = Math.hypot(Math.cos(ang), sh, 0.25);
      e.sunDir = [Math.cos(ang) / l, sh / l, 0.25 / l];
      e.sunGlow = [sunset * 0.9, sunset * 0.45, sunset * 0.15];
    } else if (dim === 1) {
      e.day = 0.22; e.zenith = rgb('#1e0604'); e.horizon = rgb('#4a1408'); e.fog = rgb('#3a1006'); e.fogStart = 0.25; e.minLight = Math.max(e.minLight, 0.07);
    } else if (dim === 2) {
      e.day = 1; e.zenith = rgb('#7ab4f8'); e.horizon = rgb('#f2f8ff'); e.fog = rgb('#e2f0fc'); e.showSun = true; e.voidBelow = this.settings.clouds === false;   // (0.9.0.15) below: the clouds over the Overworld, not a dark pit
      const l = Math.hypot(0.5, 0.8, 0.25); e.sunDir = [0.5 / l, 0.8 / l, 0.25 / l];
    } else {
      e.day = 0.7; e.zenith = rgb('#0e0820'); e.horizon = rgb('#2a1a4a'); e.fog = rgb('#1b1132'); e.stars = 1; e.voidBelow = true;
    }
    return e;
  }
  viewEnv(lp) {
    const c = lp.player.contacts || {};
    if (!c.eyeWater && !c.eyeLava) return this.env;
    const e = Object.assign({}, this.env);
    if (c.eyeWater) e.fog = [0.09, 0.23, 0.48]; else e.fog = [1, 0.35, 0.04];
    e.fogStart = 0; e.underwater = true;
    return e;
  }
  panoramaState(cam, R) {
    return { camera: cam, renderDist: R, env: this.env, time: this.time, drawList: [], decals: [], particles: [], lights: [], target: null, crack: -1, hand: null };
  }
  renderViews(dt, R) {
    const r = this.renderer;
    r.beginFrame(this.settings.scale, this.env);
    // things everyone sees, built once
    const shared = [], glows = [], decals = [];
    for (const e of this.entities) { e.draws(shared, this.local); if (e.glow) e.glow(glows); if (e.telegraphDecal) { const d = e.telegraphDecal(); if (d) decals.push(d); } }
    this.fauna.draws(shared, glows);
    if (this.locals[0]) this.mech.draws(shared, this.locals[0].player);
    if (this.net) this.net.draws(shared);
    const parts = glows.length ? this.particles.list.concat(glows) : this.particles.list;
    // carried lights: torches and lanterns in hands, on belts and backpacks, and glowing things on the ground
    const lights = [];
    for (const l of this.locals) { const ls = l.lightSource(); if (ls) lights.push(ls); }
    if (this.net) for (const r of this.net.pawns()) if (r.lightSource) { const ls = r.lightSource(); if (ls) lights.push(ls); }
    for (const e of this.entities) {
      if (e instanceof DroppedItem) { const lv = itemLight(e.stack.id); if (lv) lights.push([e.x, e.y + 0.4, e.z, lv - 1]); }
      else if (e instanceof PrimedTNT) lights.push([e.x, e.y + 0.5, e.z, 8]);
      else if (e instanceof Projectile && e.kind === 'fireball') lights.push([e.x, e.y, e.z, 10]);
    }
    const dpr = r.canvas.width / Math.max(1, window.innerWidth);
    for (const l of this.locals) {
      const cam = l.camera(dt);
      const draws = shared.slice();
      blockEntityDraws(this, draws, cam, Math.min(R, 4));
      for (const o of this.locals) {
        if (o !== l || (l.viewMode && !l.player.dead)) avatarDraws(draws, r.gl, o.skin, o.pose());
        // your own body and legs when you look down (first person)
        else if (!l.viewMode && !l.player.dead && this.settings.fpBody !== false && !l.sleeping) { const ps = o.pose(); ps.fp = true; ps.fpLeftArm = !l.player.inv.offhand && !l.player.carrying && !l.player.hang && !l.player.climb && !(l.bowPull > 0 || l.bowKick > 0); avatarDraws(draws, r.gl, o.skin, ps); }
      }
      for (const o of this.locals) if (o.fishing) o.fishing.draws(draws, glows);
      let crack = -1;
      if (l.mining && l.mining.progress > 0) crack = Math.min(9, Math.floor(l.mining.progress * 10));
      const cracks = this.damageCracks(cam);
      const boxes = l.weBoxes ? l.weBoxes() : null;
      const v = l.view;
      const rect = { x: Math.round(v.x * dpr), y: Math.round((window.innerHeight - v.y - v.h) * dpr), w: Math.round(v.w * dpr), h: Math.round(v.h * dpr) };
      r.render({
        camera: cam, renderDist: R, env: this.viewEnv(l), time: this.time, dim: this.dim, clouds: this.cloudScene ? this.cloudScene() : null, distant: this.distantFor ? this.distantFor(l, R) : null, portals: this.portalScene ? this.portalScene(l) : null,
        drawList: draws, decals, particles: parts, lights,
        target: this.state === 'playing' && l.mode === 'play' && l.target && !l.targetEnt && !l.player.carrying ? l.target : null, crack, cracks, boxes,
        hand: l.mode !== 'dead' && !l.viewMode ? l.handState() : null,
      }, rect);
      l.vp = r.vp.slice();
      l.hud.frame(dt, cam);
    }
    if (this._shotReq) { const lp = this._shotReq; this._shotReq = null; this.saveScreenshot(lp); }
  }

  // ---- creatures, items & block entities ------------------------------------------------------------
  pawns() {
    const out = [];
    for (const l of this.locals) out.push(l);
    if (this.net) for (const r of this.net.pawns()) out.push(r);
    return out;
  }
  nearestPawn(x, y, z, maxD = 64) {
    let best = null, bd = maxD;
    for (const p of this.pawns()) {
      if (p.dead) continue;
      const d = Math.hypot(p.x - x, p.y - y, p.z - z);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  addEntity(e) { this.entities.push(e); return e; }
  updateEntities(dt) {
    const L = this.entities, w = this.world;
    for (const e of L) {
      // nothing moves in a chunk that isn't there (it would fall out of the world)
      const ch = w.chunkAt(Math.floor(e.x) >> 4, Math.floor(e.z) >> 4);
      if ((!ch || !(ch.mesh || ch.lightReady)) && !e.ghost && !e.alwaysTick && !(e.isVehicle && e.riders && e.riders.some(Boolean))) continue;
      e.update(dt);
    }
    for (let i = L.length - 1; i >= 0; i--) if (L[i].remove) { if (this.net && !L[i].ghost) this.net.entityRemoved(L[i]); if (L[i].dispose) { try { L[i].dispose(); } catch (e) { /* only tidying */ } } L.splice(i, 1); }   // (0.9.0.54) dispose: an entity's own GPU mesh goes with it
    if (!this.isGuest && (this._mergeT = (this._mergeT || 0) + dt) > 1) {
      this._mergeT = 0;
      const items = L.filter(e => e instanceof DroppedItem && !e.remove);
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        if (a.remove || b.remove || !canMerge(a.stack, b.stack)) continue;
        if (Math.abs(a.x - b.x) < 0.8 && Math.abs(a.y - b.y) < 0.8 && Math.abs(a.z - b.z) < 0.8 && a.stack.n + b.stack.n <= maxStackOf(a.stack.id)) { a.stack.n += b.stack.n; b.remove = true; }
      }
    }
  }
  dropItem(stack, x, y, z, scatter, speed, vel, delay) {
    if (!stack || stack.n <= 0) return;
    if (this.isGuest) { this.net.sendDrop(stack, x, y, z, scatter, vel, delay); return; }
    const e = new DroppedItem(this, stack, x, y, z);
    if (!scatter) { e.vx *= 0.3; e.vz *= 0.3; e.vy = 2; }
    if (speed) { e.vx *= speed / 2; e.vz *= speed / 2; }
    if (vel) { e.vx = vel[0]; e.vy = vel[1]; e.vz = vel[2]; }
    if (delay) e.pickupDelay = delay;
    this.addEntity(e);
    return e;
  }
  dropBlockItems(x, y, z, id, washed, meta = 0, tool = null) {
    const b = BLOCKS[id];
    if (!this.rules().blockDrops) return;
    const r = Math.random;
    const out = [];
    const shears = tool && tool.type === 'shears';
    if (b.crop) {
      const ripe = (meta & 15) >= b.crop.stages - 1;
      if (b.key === 'wheat_crop') { out.push(mkStack('wheat_seeds', ripe ? 1 + Math.floor(r() * 3) : 1)); if (ripe) out.push(mkStack('wheat', 1)); }
      else if (b.key === 'beetroot_crop') { out.push(mkStack('beetroot_seeds', ripe ? 1 + Math.floor(r() * 3) : 1)); if (ripe) out.push(mkStack('beetroot', 1)); }
      else if (b.crop.seed) { out.push(mkStack(b.crop.seed, ripe ? 1 + Math.floor(r() * 2) : 1)); if (ripe) out.push(mkStack(b.crop.drop, 1 + Math.floor(r() * 3))); }
      else out.push(mkStack(b.crop.drop, ripe ? 2 + Math.floor(r() * 3) : 1));
    } else if (b.isLeaves) {
      if (shears) out.push(mkStack(b.key, 1));
      else {
        if (r() < 0.06) out.push(mkStack(b.sapling || 'sapling', 1));
        if ((id === B.leaves || id === B.dark_oak_leaves) && r() < 0.025) out.push(mkStack('apple', 1));
        if (r() < 0.02) out.push(mkStack('stick', 1));
      }
    } else if (id === B.tall_grass || id === B.fern || id === B.tall_grass_double || id === B.large_fern) {
      if (shears) out.push(mkStack(id === B.tall_grass_double ? 'tall_grass_double' : b.key, 1));
      else { if (r() < 0.12) out.push(mkStack('wheat_seeds', 1)); if (r() < 0.18) out.push(mkStack('straw', 1)); if (r() < 0.05 && typeof wildSeed === 'function') { const ws = wildSeed(); if (ws) out.push(mkStack(ws, 1)); } }   // (0.9.0.27) and now and then a garden seed
    } else if (id === B.vine || id === B.seagrass || id === B.cobweb) {
      if (shears) out.push(mkStack(b.key, 1)); else if (id === B.cobweb) out.push(mkStack('string', 1));
    } else if (id === B.gravel) {
      out.push(mkStack(r() < 0.1 ? 'flint' : 'gravel', 1));
    } else if (T_SHAPE[id] === SHAPE.SLAB && (meta & 7) === 6) {
      out.push(mkStack(b.key, 2));
    } else if (T_SHAPE[id] === SHAPE.CANDLE) {
      out.push(mkStack(b.key, (meta & 3) + 1));
    } else if (b.leafy || id === B.glow_lichen || id === B.hanging_roots || id === B.weeping_vines || id === B.twisting_vines || id === B.cave_vines || id === B.nether_sprouts) {
      if (shears || id === B.weeping_vines || id === B.twisting_vines) out.push(mkStack(b.key, 1));
    } else if (id === B.cave_vines_lit) {
      out.push(mkStack('glow_berries', 1));
    } else if (id === B.dry_grass || id === B.marram_grass || id === B.jungle_grass) {
      if (shears) out.push(mkStack(b.key, 1)); else if (r() < 0.15) out.push(mkStack('straw', 1));
    } else if (id === B.gilded_blackstone) {
      out.push(r() < 0.3 ? mkStack('gold_nugget', 2 + Math.floor(r() * 4)) : mkStack('gilded_blackstone', 1));
    } else if (id === B.bee_nest || id === B.beehive) {
      out.push(mkStack(b.key, 1)); if ((meta & 0x0c) === 0x0c) out.push(mkStack('honeycomb', 1));
    } else if (b.door || b.bed || b.double) {
      if (!(b.double && b.drop === null)) out.push(mkStack(b.key, 1));
    } else if (b.extraDrops) {
      for (const [k, ch, a, bb] of b.extraDrops) if (r() < ch) out.push(mkStack(k, a + Math.floor(r() * (bb - a + 1))));
    } else if (b.dropFn) {
      for (const s of b.dropFn(this.world.getMeta(x, y, z), r)) out.push(s);
    } else if (b.drop && (b.dropChance === undefined || r() < b.dropChance)) {
      const n = b.dropCount ? b.dropCount[0] + Math.floor(r() * (b.dropCount[1] - b.dropCount[0] + 1)) : 1;
      if (itemDef(b.drop)) out.push(mkStack(b.drop, n));
    }
    for (const s of out) this.dropItem(s, x + 0.5, y + 0.4, z + 0.5, true);
  }
  // Container contents scatter when their block is broken.
  spillEntity(ent, x, y, z) {
    const stacks = [];
    if (ent.items) for (const s of ent.items) if (s) stacks.push(s);
    if (ent.stack) stacks.push(ent.stack);
    if (ent.item) stacks.push(ent.item);                       // item frames
    if (ent.disc) { stacks.push(mkStack(ent.disc, 1)); this.stopDisc(x, y, z); }  // jukeboxes
    if (ent.book) stacks.push(mkStack('book', 1));             // lecterns
    for (const s of stacks) this.dropItem(cloneStack(s), x + 0.5, y + 0.5, z + 0.5, true);
  }
  entityChanged(x, y, z) {
    this.world.touchEntity(x, z);
    if (this.net) this.net.blockEntityChanged(x, y, z);
    for (const l of this.locals) if (l.mode === 'inv') l.inv.externalChange(x, y, z);
  }
  fellTree(blocks, pivot, dirYaw, drops) {
    this.addEntity(new FallingTree(this, blocks, pivot, dirYaw, this.isGuest ? [] : drops));
    if (this.isGuest) for (const s of drops) this.net.sendDrop(s, pivot[0] + 0.5, pivot[1] + 1, pivot[2] + 0.5, true);
    if (this.net) this.net.sendFell(blocks, pivot, dirYaw);
  }

  // Furnaces, smokers and blast furnaces keep working whenever their chunk is loaded (host only).
  tickFurnaces(dt) {
    const w = this.world;
    for (const ch of w.chunks.values()) {
      if (!ch.blockEntities.size) continue;
      for (const [i, e] of ch.blockEntities) {
        if (e.type !== 'furnace') continue;
        const x = ch.cx * 16 + (i & 15), z = ch.cz * 16 + ((i >> 4) & 15), y = i >> 8;
        const id = ch.blocks[i], d = BLOCKS[id];
        if (!d.furnace) continue;
        if (tickFurnace(e, dt, d.furnace)) this.entityChanged(x, y, z);
        const lit = e.burn > 0;
        const unlitKey = d.unlit || (d.key === 'lit_furnace' ? 'furnace' : d.key), litKey = unlitKey === 'furnace' ? 'lit_furnace' : 'lit_' + unlitKey;
        if (lit && id === B[unlitKey]) w.setBlock(x, y, z, B[litKey], ch.meta[i], { keepEntity: true, noFluid: true });
        else if (!lit && id === B[litKey]) w.setBlock(x, y, z, B[unlitKey], ch.meta[i], { keepEntity: true, noFluid: true });
      }
    }
  }

  // ---- reactions to world changes ---------------------------------------------------------------------
  onBlockChanged(x, y, z, oldId, newId, opts) {
    const w = this.world;
    if (this.net && !opts.fromNet) this.net.blockChanged(x, y, z, newId, w.getMeta(x, y, z));
    if (this.isGuest && !opts.fromNet) return; // the host settles follow-up effects
    if (BLOCKS[oldId].mech || BLOCKS[newId].mech) this.mech.dirty = true;
    if (!T_SOLID[newId] || T_SHAPE[newId]) {
      // things that stood on it
      const above = w.getBlock(x, y + 1, z), am = w.getMeta(x, y + 1, z);
      const hangs = T_RENDER[above] === RENDER.TORCH ? (am & 7) !== 0 : (BLOCKS[above].attached && (T_RS[above] === RS.HOOK || (am & 7) !== 0)) ? true : (BLOCKS[above].shape === 'lantern' || BLOCKS[above].shape === 'soul_lantern') ? (am & 0x7f) === 1
        : BLOCKS[above].hangs || BLOCKS[above].cocoa || BLOCKS[above].frame || (BLOCKS[above].altTile && (am & 1)) ? true : false;
      if (above && BLOCKS[above].needsSupport && !hangs && !BLOCKS[above].alwaysWet && !T_SOLID[newId]) {
        const d = BLOCKS[above];
        const keep = d.door && (am & 16);
        if (!keep) { w.setBlock(x, y + 1, z, d.alwaysWet ? B.water : (T_WLOG[above] && (am & WLOG) ? B.water : 0)); this.dropBlockItems(x, y + 1, z, above, true, am); }
      }
      if (above && BLOCKS[above].falls && !T_SOLID[newId]) this.checkFall(x, y + 1, z);
      // things that hung from it
      const below = w.getBlock(x, y - 1, z), bm = w.getMeta(x, y - 1, z);
      if ((BLOCKS[below].shape === 'lantern' || BLOCKS[below].shape === 'soul_lantern') && (bm & 0x7f) === 1 && !T_SOLID[newId] && BLOCKS[newId].shape !== 'chain') {
        w.setBlock(x, y - 1, z, bm & WLOG ? B.water : 0); this.dropBlockItems(x, y - 1, z, below, true);
      }
      // vines, roots and dripstone hanging from it
      const bd = BLOCKS[below];
      if ((bd.hangs || (bd.altTile && (bm & 1))) && !T_SOLID[newId] && !(BLOCKS[newId].hangs && BLOCKS[newId].stackPlant && bd.stackPlant)) {
        w.setBlock(x, y - 1, z, T_WLOG[below] && (bm & WLOG) ? B.water : 0); this.dropBlockItems(x, y - 1, z, below, true, bm);
      }
      if (!T_SOLID[newId]) {
        // torches, ladders, signs and vines fixed to its sides
        for (let d = 0; d < 4; d++) {
          const nx = x - DIRX[d], nz = z - DIRZ[d], nid = w.getBlock(nx, y, nz), nm = w.getMeta(nx, y, nz), nd = BLOCKS[nid];
          let attached = false;
          if (T_RENDER[nid] === RENDER.TORCH) attached = (nm & 7) === [3, 2, 4, 1][d];
          else if (T_SHAPE[nid] === SHAPE.LADDER) attached = (nm & 3) === d;
          else if (nd.sign && (nm & 16)) attached = (nm & 3) === d;
          else if (nd.cocoa) attached = ((nm >> 4) & 3) === d;
          else if (nd.frame) attached = (nm & 3) === d;
          if (attached && nd.frame) { const fe = w.getEntity(nx, y, nz); if (fe) this.spillEntity(fe, nx, y, nz); }
          if (attached) { w.setBlock(nx, y, nz, T_WLOG[nid] && (nm & WLOG) ? B.water : 0); if (nid !== B.vine) this.dropBlockItems(nx, y, nz, nid, true, nm); }
        }
      }
    }
    // levers, buttons and tripwire hooks lose what they were fixed to; pistons lose their other half
    if (!T_SOLID[newId] || T_SHAPE[newId]) this.dropAttached(x, y, z);
    if (!opts.piston && (BLOCKS[oldId].pistonHead || BLOCKS[oldId].extended)) this.pistonPartBroken(x, y, z, oldId);
    if (BLOCKS[newId].falls) this.checkFall(x, y, z);
    if (oldId === B.obsidian || oldId === B.glowstone || T_PORTAL[oldId]) collapsePortalNear(w, x, y, z);
    if (newId === B.water || T_LIQUID[newId] === 1) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]]) if (BLOCKS[w.getBlock(x + dx, y + dy, z + dz)].hardensTo) this.checkHarden(x + dx, y + dy, z + dz);
  }

  // ---- dimensions --------------------------------------------------------------------------------------
  async travelPortal(portalDim) {
    if (this.isGuest) { this.net.sendPortal(portalDim); return; }
    const kind = portalDim === DIM.DEPTHS ? 'ember' : 'sky';
    const to = this.dim === DIM.OVERWORLD ? portalDim : DIM.OVERWORLD;
    const lead = this.locals[0].player;
    await this.changeDimension(to, () => {
      const pos = arrivePortal(this.world, lead.x, lead.z, kind);
      for (const l of this.locals) { l.player.x = pos[0] + l.index * 0.6; l.player.y = pos[1]; l.player.z = pos[2]; }
      return pos;
    });
  }
  async travelPocket(lp) {
    if (this.net) { lp.toast('Pocket dimensions are single-device only for now', ''); return; }
    const p = lp.player;
    if (this.dim === DIM.POCKET) {
      const r = p.pocketReturn || { dim: 0, x: this.meta.spawn[0], y: 90, z: this.meta.spawn[2] };
      await this.changeDimension(r.dim, () => { for (const l of this.locals) { const rr = l.player.pocketReturn || r; l.player.x = rr.x; l.player.y = rr.y; l.player.z = rr.z; } });
    } else {
      for (const l of this.locals) l.player.pocketReturn = { dim: this.dim, x: l.player.x, y: l.player.y, z: l.player.z };
      await this.changeDimension(DIM.POCKET, () => {
        for (const l of this.locals) { const c = this.world.gen.pocketCenter(l.index); l.player.x = c[0] + (l === lp ? 0 : 0); l.player.y = c[1]; l.player.z = c[2]; }
      });
      lp.toast('Your pocket dimension — build and store anything here', 'rare');
    }
  }
  async changeDimension(to, place) {
    if (this._traveling) return;
    this._traveling = true;
    const fade = document.getElementById('fx-fade');
    fade.hidden = false; requestAnimationFrame(() => fade.classList.add('on'));
    this.sfx.play('portal');
    for (const l of this.locals) if (l.riding) l.riding.dismount(l);
    const meta0 = this.meta;
    await this.saveNow('travel');
    await new Promise(r => setTimeout(r, 380));
    // (0.9.0.57) the world was left meanwhile (a lost connection, quitting): no trip
    if (!this.meta || this.meta !== meta0) { this._traveling = false; fade.classList.remove('on'); fade.hidden = true; return; }
    disposeEntities(this.entities); this.entities = []; this.particles.list = []; this.fauna.clear();
    for (const l of this.locals) { l.mining = null; l.player.dim = to; }
    this.loadDimension(to);
    const pos = place();
    for (const l of this.locals) {
      const p = l.player;
      const pcx = Math.floor(p.x) >> 4, pcz = Math.floor(p.z) >> 4;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) this.world.ensureChunk(pcx + dx, pcz + dz);
      p.vx = p.vy = p.vz = 0; p.fallStart = null; p.portalCooldown = 4;
    }
    if (this.net && this.net.role === 'host') this.net.hostTraveled(to, pos || [this.player.x, this.player.y, this.player.z]);
    this.state = 'loading';
    this.loadingTarget = 2;
    this.loadingText = 'Traveling to ' + DIM_NAME[to] + '…';
    this.ui.show('loading'); this.ui.loading(this.loadingText, 0.2);
    fade.classList.remove('on'); setTimeout(() => { fade.hidden = true; }, 400);
    this._traveling = false;
    const f = this.meta.flags;
    if (to === DIM.SKYLANDS && !f.skyVisited) { f.skyVisited = true; for (const l of this.locals) l.grantXP(40); }
    if (to === DIM.DEPTHS && !f.depthsVisited) { f.depthsVisited = true; for (const l of this.locals) l.grantXP(40); }
  }

  // ---- spawning --------------------------------------------------------------------------------------
  spawnMobs() {
    const w = this.world;
    if (!this.rules().mobSpawning) return;
    const ps = this.pawns().filter(p => !p.dead);
    if (!ps.length) return;
    const p = ps[Math.floor(Math.random() * ps.length)];
    let animals = 0, hostiles = 0;
    for (const e of this.entities) if (e instanceof Mob) { if (e.T.hostile) { if (!e.T.boss) hostiles++; } else animals++; }
    const r = Math.random;
    const cap = 8 + ps.length * 2;
    const surfaceAt = (x, z) => {
      const ch = w.chunkAt(x >> 4, z >> 4);
      if (!ch || !ch.mesh) return -1;
      for (let y = Math.min(CH - 2, ch.maxY); y > 1; y--) {
        const id = w.getBlock(x, y, z);
        if (id === 0 || BLOCKS[id].render === RENDER.CROSS || BLOCKS[id].render === RENDER.MODEL) continue;
        return T_SOLID[id] ? y + 1 : -1;
      }
      return -1;
    };
    const ring = (a, b) => { const ang = r() * TAU, d = a + r() * (b - a); return [Math.floor(p.x + Math.cos(ang) * d), Math.floor(p.z + Math.sin(ang) * d)]; };
    if ((this.dim === DIM.OVERWORLD || this.dim === DIM.SKYLANDS) && animals < cap && r() < 0.3) {
      const [x, z] = ring(22, 46);
      const y = surfaceAt(x, z);
      const ground = y > 0 ? w.getBlock(x, y - 1, z) : 0;
      if (y > 0 && (ground === B.grass || ground === B.sky_grass || ground === B.snowy_grass) && (w.getLight(x, y, z) >> 4) >= 13) {
        const biome = this.dim === 0 ? w.gen.biomeAt(x, z) : -1;
        let type = 'boar';
        const roll = r();
        if (this.dim === DIM.SKYLANDS) type = roll < 0.55 ? 'aerbunny' : 'moa';
        else if (biome === BIOME.FOREST) type = roll < 0.35 ? 'deer' : roll < 0.5 ? 'rabbit' : roll < 0.65 ? 'boar' : roll < 0.8 ? 'pig' : 'chicken';
        else if (biome === BIOME.TAIGA) type = roll < 0.4 ? 'deer' : roll < 0.55 ? 'rabbit' : roll < 0.75 ? 'sheep' : 'cow';
        else if (biome === BIOME.PLAINS) type = roll < 0.25 ? 'sheep' : roll < 0.45 ? 'cow' : roll < 0.6 ? 'pig' : roll < 0.75 ? 'chicken' : roll < 0.85 ? 'boar' : roll < 0.93 ? 'rabbit' : 'deer';
        else type = roll < 0.4 ? 'rabbit' : roll < 0.7 ? 'boar' : 'chicken';
        if (!MOB_TYPES[type]) type = 'boar';
        const n = type === 'deer' || type === 'sheep' || type === 'cow' ? 2 + Math.floor(r() * 3) : 1 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) this.addEntity(new Mob(this, type, x + 0.5 + r() - 0.5, y, z + 0.5 + r() - 0.5));
      }
    }
    if (this.dim === DIM.OVERWORLD && hostiles < cap) {
      // the classic night crowd: ghouls, skeletons, spiders and fuselings; slimes only deep down
      const pick = (y) => { const q = r(); if (y !== undefined && y < 40 && q < 0.14) return 'slime'; return q < 0.34 ? 'ghoul' : q < 0.58 ? 'skeleton' : q < 0.8 ? 'spider' : 'fuseling'; };
      const spawnOne = (t, x, y, z) => { const m = this.addEntity(new Mob(this, t, x + 0.5, y, z + 0.5)); if (t === 'slime') m.setSize(r() < 0.6 ? 2 : 1); return m; };
      if (this.env.day < 0.42 && r() < 0.6) {
        const [x, z] = ring(20, 40);
        const y = surfaceAt(x, z);
        if (y > 0 && !T_LIQUID[w.getBlock(x, y - 1, z)] && (w.getLight(x, y, z) & 15) < 7) spawnOne(pick(), x, y, z);
      }
      if (r() < 0.35) {
        const [x, z] = ring(14, 30);
        const y0 = Math.floor(p.y) + Math.floor(r() * 24) - 12;
        for (let y = y0; y > y0 - 8 && y > 2; y--) {
          if (T_SOLID[w.getBlock(x, y - 1, z)] && w.getBlock(x, y, z) === 0 && w.getBlock(x, y + 1, z) === 0) {
            const l = w.getLight(x, y, z);
            if ((l >> 4) * this.env.day < 6 && (l & 15) < 7 && (l >> 4) < 12) spawnOne(pick(y), x, y, z);
            break;
          }
        }
      }
    }
    if (this.dim === DIM.DEPTHS) {
      if (hostiles < 7 && r() < 0.5) {
        const [x, z] = ring(16, 34);
        const y0 = Math.floor(p.y) + Math.floor(r() * 24) - 12;
        for (let y = y0; y > y0 - 10 && y > 2; y--) {
          if (T_SOLID[w.getBlock(x, y - 1, z)] && w.getBlock(x, y, z) === 0 && w.getBlock(x, y + 1, z) === 0) {
            if ((w.getLight(x, y, z) & 15) < 11) this.addEntity(new Mob(this, 'charred_ghoul', x + 0.5, y, z + 0.5));
            break;
          }
        }
      }
      if (!this.entities.some(e => e.type === 'cinder_golem') && r() < 0.004) {
        const [x, z] = ring(20, 30);
        for (let y = Math.floor(p.y) + 8; y > p.y - 8; y--) {
          if (T_SOLID[w.getBlock(x, y - 1, z)] && !w.getBlock(x, y, z) && !w.getBlock(x, y + 1, z) && !w.getBlock(x, y + 2, z)) { this.summonGolem(x + 0.5, y, z + 0.5, p); break; }
        }
      }
    }
  }
  summonGolem(x, y, z, near) {
    const g = new Mob(this, 'cinder_golem', x, y, z);
    g.state = 'spawning'; g.stateT = 2.2; g.invulnT = 2.2;
    if (near) g.yaw = Math.atan2(-(near.x - x), -(near.z - z));
    this.addEntity(g);
    this.sfx.playAt('roar', x, y, z, 60); this.shake(0.5, g);
    this.toastAll('The Cinder Golem awakens!', 'boss');
    for (let i = 0; i < 30; i++) this.flame(x + (Math.random() - 0.5) * 2, y + Math.random() * 3, z + (Math.random() - 0.5) * 2);
  }
  onBossDefeated(mob) {
    for (const l of this.locals) l.player.stats.bossesKilled++;
    this.sfx.play('victory');
    this.toastAll('The Cinder Golem crumbles. Its core is yours.', 'boss');
    this.shake(0.4, mob);
    for (let i = 0; i < 40; i++) this.burst(mob.x + (Math.random() - 0.5) * 2, mob.y + Math.random() * 3, mob.z + (Math.random() - 0.5) * 2, 'golem_rock', 1, 1.5);
    this.saveSoon();
  }

  // ---- effects helpers --------------------------------------------------------------------------------
  burst(x, y, z, tileName, n, speed, grav = 14) {
    const tile = B[tileName] !== undefined ? BLOCK_FACES[B[tileName]][0] : (ATLAS.tile[tileName] ?? ATLAS.tile.white);
    const uv0 = tileUV(tile);
    const l = this.world ? this.world.getLight(Math.floor(x), Math.floor(y), Math.floor(z)) : 0xF0;
    for (let i = 0; i < n; i++) {
      const su = Math.floor(Math.random() * 12) / 16, sv = Math.floor(Math.random() * 12) / 16;
      const du = (uv0[2] - uv0[0]), dv = (uv0[3] - uv0[1]);
      const uv = [uv0[0] + su * du, uv0[1] + sv * dv, uv0[0] + (su + 0.25) * du, uv0[1] + (sv + 0.25) * dv];
      const life = 0.4 + Math.random() * 0.5;
      this.particles.add({ x: x + (Math.random() - 0.5) * 0.4, y: y + (Math.random() - 0.5) * 0.4, z: z + (Math.random() - 0.5) * 0.4,
        vx: (Math.random() - 0.5) * 4 * speed, vy: Math.random() * 4 * speed, vz: (Math.random() - 0.5) * 4 * speed,
        life, max: life, size: 0.06 + Math.random() * 0.05, uv, light: l, grav });
    }
  }
  flame(x, y, z) {
    const uv = tileUV(ATLAS.tile.flame);
    const life = 0.35 + Math.random() * 0.3;
    this.particles.add({ x, y, z, vx: (Math.random() - 0.5) * 0.4, vy: 1 + Math.random(), vz: (Math.random() - 0.5) * 0.4, life, max: life, size: 0.12, size0: 0.12, shrink: true, uv, light: 0xFF, grav: -1 });
  }
  shake(a, src) {
    for (const l of this.locals) {
      const d = src ? Math.hypot(l.player.x - src.x, l.player.z - src.z) : 0;
      if (d < 32) l.shake(a * Math.max(0.2, 1 - d / 32));
    }
  }
  toastAll(msg, kind) { for (const l of this.locals) l.toast(msg, kind); }
}

// One furnace step. Returns true when something visible changed.
// Smokers only cook food and blast furnaces only smelt ore, both twice as fast.
function tickFurnace(e, dt, kind) {
  e.items = e.items || [null, null, null];
  const [inp, fuel, out] = e.items;
  let result = inp && SMELTING[inp.id];
  if (kind === 'smoker' && inp && !FOOD_SMELTS.has(inp.id)) result = null;
  if (kind === 'blast' && inp && !ORE_SMELTS.has(inp.id)) result = null;
  if (kind === 'smoker' || kind === 'blast') dt *= 2;
  const canOut = !!result && (!out || (out.id === result && out.n < maxStackOf(result)));
  let changed = false;
  e.burn = e.burn || 0; e.cook = e.cook || 0;
  if (e.burn <= 0 && canOut && fuel && fuelValue(fuel.id) > 0) {
    e.burnMax = e.burn = fuelValue(fuel.id) * SMELT_TIME;
    if (fuel.id === 'lava_bucket') e.items[1] = mkStack('bucket', 1);
    else { fuel.n--; if (fuel.n <= 0) e.items[1] = null; }
    changed = true;
  }
  if (e.burn > 0) {
    e.burn = Math.max(0, e.burn - dt);
    if (canOut) {
      e.cook += dt;
      if (e.cook >= SMELT_TIME) {
        e.cook = 0; inp.n--; if (inp.n <= 0) e.items[0] = null;
        if (out) out.n++; else e.items[2] = mkStack(result, 1);
        changed = true;
      }
    } else e.cook = 0;
    if (e.burn <= 0) changed = true;
  } else if (e.cook > 0) e.cook = Math.max(0, e.cook - dt * 2);
  return changed;
}
