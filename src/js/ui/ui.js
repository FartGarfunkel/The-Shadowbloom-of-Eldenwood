// ---------------------------------------------------------------------------
// ui/ui.js — the menus everyone shares: title, worlds, loading, pause,
// settings, how to play, players & skins. Per-player screens (HUD, inventory,
// death) live in ui/hud.js and ui/invui.js inside each player's view.
// Menus work with mouse, touch, keyboard and any controller.
// ---------------------------------------------------------------------------

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function ago(t) {
  if (!t) return 'never';
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  return new Date(t).toLocaleDateString();
}
function fmtPlay(sec) { sec = sec || 0; const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60; return h ? `${h} h ${m} min` : `${m} min`; }

const SCREENS = ['title', 'worlds', 'loading', 'pause', 'settings', 'howto', 'players', 'wsettings', 'news'];

class UI {
  constructor(game) {
    this.g = game;
    this.cur = null; this.subReturn = null;
    this.focus = null;
    initTitleScreen(this);
    installHudSprites();
    this.bindMenus();
    this.buildSettings();
  }

  // ---- screens ---------------------------------------------------------------------------
  show(name) {
    if (name === 'pause' && this.cur !== 'pause') this._pauseAt = performance.now();
    for (const s of SCREENS) $('#' + s).hidden = s !== name;
    $('#views').hidden = !(this.g.locals.length && (name === 'game' || name === 'pause' || name === 'settings' || name === 'howto' || name === 'players' || (name === 'wsettings' && this.subReturn === 'pause')));
    this.cur = name;
    if (name === 'title') { pickSplash(); this.newsCheck(); }
    if (name === 'news') this.fillNews();
    if (name === 'worlds') this.refreshWorlds();
    if (name === 'pause') this.pauseInfo();
    if (name === 'players') this.renderProfiles();
    this.setFocus(null);
    if (name !== 'game' && name !== 'loading' && this.g.pads && this.g.pads.connected().length) this.setFocus(this.focusables()[0]);
  }
  openSub(name) { this.subReturn = this.cur; this.show(name); }
  closeSub() { this.show(this.subReturn || 'title'); }
  makeView(lp) {
    const el = $('#tpl-view').content.firstElementChild.cloneNode(true);
    el.dataset.player = lp.index;
    $('#views').appendChild(el);
    return el;
  }

  bindMenus() {
    const g = this.g;
    $('#btn-play').onclick = () => { g.sfx.unlock(); this.show('worlds'); };
    $('#btn-howto').onclick = () => this.openSub('howto');
    $('#version').onclick = () => { this.markNewsSeen(); this.openSub('news'); };
    $('#btn-settings-t').onclick = () => this.openSub('settings');
    $('#btn-players-t').onclick = () => this.openSub('players');
    $('#btn-settings-p').onclick = () => this.openSub('settings');
    $('#btn-players-p').onclick = () => this.openSub('players');
    $('#btn-howto-p').onclick = () => this.openSub('howto');
    for (const b of $$('[data-close]')) b.onclick = () => this.back();
    $('#btn-resume').onclick = () => g.resume();
    $('#btn-quit').onclick = () => g.quitToTitle();
    $('#btn-mode').onclick = () => {
      g.meta.mode = g.creative ? 'survival' : 'creative';
      for (const l of g.locals) { if (!g.creative) l.player.flying = false; l.toast(g.creative ? 'Creative mode: every block in the inventory, double-tap jump to fly' : 'Survival mode', 'good'); }
      g.saveSoon(); this.pauseInfo();
    };
    $('#btn-export').onclick = async () => { await g.saveNow('export'); this.exportWorld(g.meta.id, g.meta.name); };
    // world options when creating a world (game rules, day and night lengths)
    this._nwRead = worldSettingsForm($('#nw-opts'), RULE_DEFAULTS);
    $('#nw-mode').addEventListener('change', () => { const c = $('#nw-opts [data-rule="commands"]'); if (c) c.checked = $('#nw-mode').value === 'creative'; });
    $('#new-world').addEventListener('submit', (e) => {
      e.preventDefault();
      g.sfx.unlock();
      const o = this._nwRead();
      g._campaignChoice = $('#nw-adv') ? ($('#nw-adv').value || null) : undefined;
      g.createWorld($('#nw-name').value, $('#nw-seed').value, $('#nw-mode').value, o.rules).catch(err => this.toastMenu('Could not create the world: ' + err.message));
    });
    // the sheet and the journal from the pause menu (for controllers)
    const fromPause = (fn) => () => { const lp = g.locals[0]; if (!lp) return; g.resume(); setTimeout(() => { if (lp.mode === 'play') fn(lp); }, 60); };
    if ($('#btn-sheet-p')) $('#btn-sheet-p').onclick = fromPause(lp => lp.openDndSheet && lp.openDndSheet());
    if ($('#btn-journal-p')) $('#btn-journal-p').onclick = fromPause(lp => lp.openJournal && lp.openJournal());
    $('#btn-wsettings').onclick = () => this.openWorldSettings(null);
    $('#ws-save').onclick = () => this.saveWorldSettings();
    $('#import-file').addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      const msg = $('#import-msg');
      msg.textContent = 'Importing…';
      try {
        const rec = await g.save.importWorld(await f.text());
        msg.textContent = `Imported “${rec.meta.name}”.`;
        this.refreshWorlds();
      } catch (err) { msg.textContent = err.message; }
    });
    // Esc in a sub-menu goes back
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' || this.cur === 'game' || this.cur === 'loading' || this.cur === 'title') return;
      if (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'range') { e.target.blur(); return; }
      if (this.cur === 'pause') { if (performance.now() - (this._pauseAt || 0) > 400) g.resume(); return; }   // (0.9.0.48) not the press that opened it
      this.back();
    });
  }
  back() {
    const c = this.cur;
    if (c === 'worlds') this.show('title');
    else if (c === 'pause') this.g.resume();
    else if (c === 'settings' || c === 'howto' || c === 'players' || c === 'wsettings' || c === 'news') this.closeSub();
  }

  // ---- what's new: the patch notes are built into the game file -----------------------------
  fillNews() {
    const body = $('#news-body'), tpl = document.getElementById('ember-news');
    if (body.childElementCount || !tpl) return;
    body.appendChild(tpl.content.cloneNode(true));
  }
  markNewsSeen() {
    try { localStorage.setItem('emberwild.seenVersion', GAME_VERSION); } catch (e) { /* private mode */ }
    const tag = $('#version .new-tag'); if (tag) tag.remove();
  }
  // The first time a new version runs, the title screen opens its notes once (players who are
  // new to the game just get the "New" tag on the version line instead).
  newsCheck() {
    if (this._newsChecked) return;
    this._newsChecked = true;
    let seen = null, played = false;
    try { seen = localStorage.getItem('emberwild.seenVersion'); played = !!(localStorage.getItem('emberwild.recent') || localStorage.getItem('emberwild.settings')); } catch (e) { return; }
    if (seen === GAME_VERSION) return;
    const tag = document.createElement('span'); tag.className = 'new-tag'; tag.textContent = 'New';
    $('#version').appendChild(tag);
    if ((seen || played) && !navigator.webdriver) setTimeout(() => { if (this.cur === 'title') { this.markNewsSeen(); this.openSub('news'); } }, 400);
  }

  // ---- controller navigation in menus ----------------------------------------------------------
  focusables() {
    const scr = this.cur && SCREENS.includes(this.cur) ? $('#' + this.cur) : null;
    if (!scr) return [];
    return $$('button:not([disabled]), input, select, label.btn, [data-nav]', scr).filter(el => el.offsetParent !== null && !(el.type === 'file'));
  }
  setFocus(el) {
    if (this.focus) this.focus.classList.remove('padfocus');
    this.focus = el || null;
    if (el) { el.classList.add('padfocus'); if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }
  }
  menuNav(events) {
    if (!events.length) return;
    const g = this.g;
    if (this.cur === 'game' || this.cur === 'loading') return;
    for (const ev of events) {
      if (ev.type === 'start') { if (this.cur === 'pause') { g.resume(); return; } if (this.cur === 'title') { $('#btn-play').click(); return; } }
      if (ev.type === 'back') { if (this.cur === 'title') continue; this.back(); return; }
      const list = this.focusables();
      if (!list.length) continue;
      if (!this.focus || !this.focus.isConnected || !list.includes(this.focus)) { this.setFocus(list[0]); if (ev.type === 'move') continue; }
      const f = this.focus;
      if (ev.type === 'move') {
        if (f.type === 'range' && ev.dx) { f.value = Number(f.value) + Number(f.step || 1) * ev.dx; f.dispatchEvent(new Event('input')); f.dispatchEvent(new Event('change')); continue; }
        this.setFocus(this.nearest(list, f, ev.dx, ev.dy) || f);
        g.sfx.play('tick');
      } else if (ev.type === 'ok') {
        g.sfx.unlock();
        if (f.type === 'checkbox') { f.checked = !f.checked; f.dispatchEvent(new Event('change')); }
        else if (f.tagName === 'INPUT' && f.type !== 'range') f.focus();
        else if (f.tagName === 'SELECT') { f.selectedIndex = (f.selectedIndex + 1) % f.options.length; f.dispatchEvent(new Event('change')); }
        else f.click();
        g.sfx.play('click');
      }
    }
  }
  nearest(list, from, dx, dy) {
    const a = from.getBoundingClientRect(), cx = a.left + a.width / 2, cy = a.top + a.height / 2;
    let best = null, bd = Infinity;
    for (const el of list) {
      if (el === from) continue;
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
      const along = x * dx + y * dy;
      if (along <= 1) continue;
      const d = along + Math.abs(dx ? y : x) * 2.5;
      if (d < bd) { bd = d; best = el; }
    }
    return best;
  }

  // ---- storage & worlds ---------------------------------------------------------------------------
  storeReady() {
    const s = this.g.save;
    const local = s.local.name === 'memory' ? 'This browser blocks storage — download a backup before you leave' : (/Electron\//.test(navigator.userAgent) ? 'Worlds save automatically in the game folder' : 'Worlds save automatically in this browser');
    const cloud = s.cloud.enabled ? ' · Cloud backup on' : '';
    $('#store-status').textContent = local + cloud;
    if (this.cur === 'worlds') this.refreshWorlds();
  }
  syncStatus(status, n) {
    this.cloudState = { status, n };
    const el = $('#sync-note');
    if (el && this.cur === 'worlds') el.textContent = this.syncText();
  }
  syncText() {
    const s = this.g.save;
    if (!s.cloud.enabled) return s.cloud.status === 'error' ? `Cloud backup stopped (${s.cloud.lastError}). Worlds still save in this browser.` : `Worlds are stored in this browser (${s.backendName}). Use Backup to keep a copy as a file.`;
    const st = this.cloudState || { status: 'synced', n: 0 };
    if (st.status === 'syncing' && st.n) return `Backing up to your cloud save… ${st.n} left`;
    if (st.status === 'waiting') return 'Cloud backup paused for a moment, it will resume on its own';
    return 'Saved in this browser and backed up to your cloud save, so worlds follow you to other devices.';
  }
  async refreshWorlds() {
    const g = this.g;
    const list = $('#world-list');
    $('#sync-note').textContent = this.syncText();
    if (!g.save.local) { list.innerHTML = '<p class="world-empty">Opening save storage…</p>'; return; }
    const worlds = await g.save.listWorlds();
    if (!worlds.length) { list.innerHTML = '<p class="world-empty">No worlds yet. Name one and press Create world.</p>'; return; }
    list.innerHTML = '';
    for (const w of worlds) {
      const m = w.rec.meta || {};
      const dim = w.rec.player ? DIM_NAME[w.rec.player.dim || 0] : 'Overworld';
      const lvl = w.rec.player ? w.rec.player.level || 0 : 0;
      const el = document.createElement('div');
      el.className = 'world';
      el.innerHTML = `<div class="wname">${esc(m.name || 'World')}</div>
        <span class="badge ${w.cloud ? 'cloud' : ''}">${w.cloud && w.local ? 'Device + cloud' : w.cloud ? 'Cloud' : 'This device'}</span>
        <div class="wmeta"><span>${esc(dim)}</span><span>Level ${lvl}</span><span>Played ${fmtPlay(m.playTime)}</span><span>Last saved ${ago(w.rec.savedAt)}</span><span>Seed ${esc(m.seedText ?? m.seed)}</span></div>
        <div class="wactions"><button class="btn primary tiny" data-a="play">Play</button><button class="btn tiny" data-a="edit">Settings</button><button class="btn tiny" data-a="backup">Backup file</button><button class="btn tiny danger" data-a="del">Delete</button></div>`;
      el.querySelector('[data-a=play]').onclick = () => { g.sfx.unlock(); g.openWorld(w.rec.id); };
      el.querySelector('[data-a=backup]').onclick = () => this.exportWorld(w.rec.id, m.name);
      el.querySelector('[data-a=edit]').onclick = () => this.openWorldSettings(w.rec);
      el.querySelector('[data-a=del]').onclick = () => {
        if (el.querySelector('.confirm')) return;
        const c = document.createElement('div'); c.className = 'confirm';
        c.innerHTML = `<span>Delete “${esc(m.name)}” for good?</span><button class="btn tiny danger" data-a="yes">Delete</button><button class="btn tiny" data-a="no">Keep</button>`;
        c.querySelector('[data-a=no]').onclick = () => c.remove();
        c.querySelector('[data-a=yes]').onclick = async () => { await g.save.deleteWorld(w.rec.id); this.refreshWorlds(); };
        el.appendChild(c);
      };
      list.appendChild(el);
    }
  }
  // World settings: rename, game mode, rules, day/night — for a world in the list (rec) or the one being played (null).
  openWorldSettings(rec) {
    const g = this.g, live = !rec, meta = live ? g.meta : rec.meta;
    if (!meta) return;
    this._wsRec = rec;
    $('#ws-title').textContent = live ? 'World settings' : 'Settings — ' + (meta.name || 'World');
    this._wsRead = worldSettingsForm($('#ws-body'), live ? g.rules() : Object.assign({}, RULE_DEFAULTS, { commands: meta.mode === 'creative' }, meta.rules || {}), { name: meta.name || 'World', mode: meta.mode || 'survival' });
    // older terrain can be brought up to date: everything you built (every chunk that was changed) stays as it is
    const ex = $('#ws-extra');
    const gv = meta.genVersion || 1;
    if (gv < GEN_VERSION) {
      ex.innerHTML = `<div class="ws-upgrade"><b>Terrain from an older version</b><p>Land you haven't changed still generates the way it did when this world was made. Upgrade to get the newest biomes, caves and features in every place you haven't touched yet. Everything you built or changed stays exactly as it is (there may be seams at the edges). Download a backup first if you're unsure.</p><button class="btn" id="ws-upgrade" type="button">Upgrade terrain to version ${GEN_VERSION}</button></div>`;
      $('#ws-upgrade').onclick = () => { meta.genVersion = GEN_VERSION; this._wsUpgraded = true; $('#ws-upgrade').disabled = true; $('#ws-upgrade').textContent = 'Will upgrade when you save'; };
    } else ex.innerHTML = live ? '' : `<p class="hint">Terrain is up to date (version ${gv}).</p>`;
    this._wsUpgraded = false;
    this.openSub('wsettings');
  }
  async saveWorldSettings() {
    const g = this.g, rec = this._wsRec, o = this._wsRead();
    if (!rec) {
      Object.assign(g.rules(), o.rules);
      if (o.name) g.meta.name = o.name;
      if (o.mode && o.mode !== g.meta.mode) { g.meta.mode = o.mode; for (const l of g.locals) if (!g.creative) l.player.flying = false; }
      if (this._wsUpgraded) { g.world.genVersion = GEN_VERSION; g.world.gen = makeWorldGen(g.meta.seed, g.dim, GEN_VERSION); for (const l of g.locals) l.toast('Terrain upgraded: new land generates the new way from now on', 'good'); }
      g.saveSoon(); this.closeSub(); this.pauseInfo(); return;
    }
    rec.meta.rules = o.rules; if (o.name) rec.meta.name = o.name; if (o.mode) rec.meta.mode = o.mode;
    try { await g.save.saveWorld(rec, []); this.toastMenu('World settings saved'); } catch (e) { this.toastMenu('Could not save: ' + e.message); }
    this.closeSub();
  }
  async exportWorld(id, name) {
    const g = this.g;
    try {
      const text = await g.save.exportWorld(id);
      const filename = (name || 'world').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() + '-emberwild-backup.json';
      let done = false;
      if (window.claude && window.claude.use) {
        const dl = await window.claude.use('downloads').catch(() => null);
        if (dl) {
          try { await dl.save({ filename, data: text }); done = true; this.toastAny('Backup saved'); }
          catch (e) { if (e && e.code === 'declined') { this.toastAny('Backup not saved'); return; } }
        }
      }
      if (!done) {
        const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        this.toastAny('Backup file created');
      }
    } catch (e) { this.toastAny('Backup failed: ' + e.message); }
  }
  toastAny(msg) { if (this.g.inWorld() && this.g.local) { this.g.local.toast(msg, 'good'); const p = $('#pause-info'); if (p && this.cur === 'pause') p.textContent = msg; } else this.toastMenu(msg); }
  toastMenu(msg) { const m = $('#import-msg'); if (m) m.textContent = msg; $('#store-status').textContent = msg; }
  loading(text, frac) { $('#loading-text').textContent = text; $('#loadfill').style.width = Math.round(clamp(frac, 0, 1) * 100) + '%'; }

  // ---- pause: who is playing ------------------------------------------------------------------------
  pauseInfo() {
    const g = this.g;
    const saved = g.lastSave ? 'Last saved ' + ago(g.lastSave) + '.' : '';
    $('#pause-info').textContent = [g.meta.name, DIM_NAME[g.dim], g.creative ? 'Creative' : 'Survival', saved, g.save.cloud.enabled ? 'Cloud backup is on.' : ''].filter(Boolean).join(' · ');
    $('#btn-mode').textContent = g.creative ? 'Switch to Survival' : 'Switch to Creative';
    $('#btn-mode').hidden = !!g.isGuest;
    const box = $('#pause-party');
    const rows = g.locals.map(l => `<div class="party-row"><span class="pdot p${l.index + 1}"></span><span class="pn">${esc(l.name)}</span><span class="pdev">${l.useKb ? (g.input.touchMode ? 'Touch' : 'Keyboard & mouse') : ''}${l.pads.size ? (l.useKb ? ' + ' : '') + 'Controller' : ''}</span>${l.index > 0 ? `<button class="btn tiny" data-rm="${l.index}">Leave</button>` : ''}</div>`).join('');
    const more = g.locals.length < 4 ? `<p class="party-hint">${g.pads.connected().length > g.locals.reduce((n, l) => n + l.pads.size, 0) ? 'A free controller is connected — press <b>Start</b> on it to join.' : 'Split-screen: plug in another controller and press <b>Start</b> on it to join.'}</p>` : '';
    box.innerHTML = `<div class="party-title">On this screen</div>${rows}${more}`;
    for (const b of $$('[data-rm]', box)) b.onclick = () => { const lp = g.locals.find(l => l.index === Number(b.dataset.rm)); if (lp) g.removeLocal(lp); this.pauseInfo(); };
  }

  // ---- players & skins --------------------------------------------------------------------------------
  renderProfiles() {
    const g = this.g, box = $('#profiles');
    box.innerHTML = '';
    g.profiles.forEach((pr, i) => {
      const el = document.createElement('div');
      el.className = 'profile';
      el.innerHTML = `<div class="pf-head"><span class="pdot p${i + 1}"></span>Player ${i + 1}${i === 0 ? '' : ' <small>controller</small>'}</div>
        <canvas width="64" height="128" class="pf-skin" aria-label="Skin preview"></canvas>
        <label class="pf-name-l">Name<input class="pf-name" maxlength="16" value="${esc(pr.name)}"></label>
        <div class="pf-btns"><label class="btn tiny" data-nav>Choose skin.png<input type="file" accept="image/png" hidden></label><button class="btn tiny ghost" data-reset ${pr.skin ? '' : 'disabled'}>Default</button></div>
        <label class="pf-arms-l">Arms <select class="pf-arms" ${pr.skin ? '' : 'disabled'}><option value="">Work it out</option><option value="classic"${pr.arms === 'classic' ? ' selected' : ''}>Classic (Steve, 4 px)</option><option value="slim"${pr.arms === 'slim' ? ' selected' : ''}>Slim (Alex, 3 px)</option></select></label>
        <div class="pf-hero">${pr.dnd ? `<b>${esc(pr.dnd.name)}</b><span>${esc((DND_SPECIES[pr.dnd.species] || {}).name || '')} ${esc((DND_CLASSES[pr.dnd.cls] || {}).name || '')}</span>` : '<span>No hero yet</span>'}</div>
        <div class="pf-btns"><button class="btn tiny primary" data-hero>${pr.dnd ? 'Edit hero' : 'Create hero'}</button>${pr.dnd ? '<button class="btn tiny ghost" data-forget>Forget</button>' : ''}</div>
        <p class="pf-msg"></p>`;
      drawSkinPreview(el.querySelector('canvas'), skinRef(pr));
      el.querySelector('[data-hero]').onclick = () => this.openHeroCreator(i);
      const fg = el.querySelector('[data-forget]'); if (fg) fg.onclick = () => { pr.dnd = null; g.saveProfiles(); this.renderProfiles(); };
      const arms = el.querySelector('.pf-arms');
      arms.addEventListener('change', () => { pr.arms = arms.value || null; g.saveProfiles(); this.applyProfile(i); this.renderProfiles(); });
      const name = el.querySelector('.pf-name');
      name.addEventListener('change', () => { pr.name = name.value.trim() || 'Player ' + (i + 1); g.saveProfiles(); this.applyProfile(i); });
      name.addEventListener('keydown', (e) => e.stopPropagation());
      const file = el.querySelector('input[type=file]'), msg = el.querySelector('.pf-msg');
      file.addEventListener('change', async () => {
        const f = file.files && file.files[0]; file.value = '';
        if (!f) return;
        try {
          pr.skin = await readSkinFile(f);
          g.saveProfiles(); this.applyProfile(i);
          msg.textContent = 'Skin set.';
          this.renderProfiles();
        } catch (err) { msg.textContent = err.message; }
      });
      el.querySelector('[data-reset]').onclick = () => { pr.skin = null; g.saveProfiles(); this.applyProfile(i); this.renderProfiles(); };
      box.appendChild(el);
    });
  }
  // a hero made ahead of time: it becomes this player's character the next time they enter a new world
  openHeroCreator(i) {
    const g = this.g, pr = g.profiles[i], host = document.createElement('section');
    host.className = 'screen panel-screen hero-screen'; host.style.zIndex = 40;
    document.getElementById('app').appendChild(host);
    const ui = new DndCreator(host, { g, from: pr.dnd || null, title: `Player ${i + 1} · make a hero`, doneLabel: 'Keep this hero',
      onDone: (c, skin, arms, tpl) => { pr.dnd = tpl; pr.skin = skin; pr.arms = arms; pr.name = c.name; g.saveProfiles(); this.applyProfile(i); host.remove(); this.renderProfiles(); } });
    const back = document.createElement('button'); back.className = 'btn ghost hero-close'; back.textContent = 'Cancel'; back.onclick = () => host.remove();
    ui.el.querySelector('.cr-head').appendChild(back);
    const reb = ui.draw.bind(ui); ui.draw = () => { reb(); const h = ui.el.querySelector('.cr-head'); if (h && !h.querySelector('.hero-close')) h.appendChild(back); };
    this._heroUI = ui;
  }
  applyProfile(i) {
    const lp = this.g.locals.find(l => l.index === i);
    if (!lp) return;
    lp.profile = this.g.profiles[i];
    lp.setSkin(lp.profile.skin);   // with its arms (skinRef)
    lp.hud.q('.pname').textContent = lp.name;
  }

  // ---- settings -------------------------------------------------------------------------------------------
  // Resource packs: a Minecraft Java pack (.zip) changes the block and item textures.
  packRow() {
    const g = this.g, row = document.createElement('div'); row.className = 'setting pack-setting';
    const r = PACKS.report, name = PACKS.active;
    const status = !name ? 'Built-in Shadowbloom textures' : r && r.error ? `${name}: ${r.error}` : `${name} — ${r ? r.used : 0} textures${r && r.res ? `, ${r.res}x` : ''}${r && r.sounds ? `, ${r.sounds} sounds` : ''}`;
    row.innerHTML = `<label>Resource pack</label><span class="pack-btns"><label class="btn tiny" data-nav>Choose pack (.zip)…<input type="file" accept=".zip,application/zip" hidden></label><button class="btn tiny ghost" data-builtin ${name ? '' : 'disabled'}>Built-in</button></span>
      <span class="desc"><b class="pack-now"></b><br>Minecraft Java Edition packs for 1.13 to 1.21 work best; 1.6 to 1.12 packs work for most blocks. 16x, 32x and 64x are all fine (32x matches the game). Sounds in a pack are used too. Bedrock .mcpack and pre-1.6 packs aren't supported. The game restarts to load a pack; your world is saved first.</span>`;
    row.querySelector('.pack-now').textContent = status;
    const restart = async (msg) => {
      row.querySelector('.pack-now').textContent = msg;
      if (g.inWorld()) { try { await g.saveNow('pack'); } catch (e) { /* saved as far as it goes */ } }
      setTimeout(() => location.reload(), 400);
    };
    const inp = row.querySelector('input');
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      row.querySelector('.pack-now').textContent = 'Reading ' + f.name + '…';
      try { await installResourcePack(f); await restart('Loading ' + f.name + '…'); }
      catch (e) { row.querySelector('.pack-now').textContent = 'Couldn’t use that pack: ' + (e.message || e); }
    };
    row.querySelector('[data-builtin]').onclick = async () => { await removeResourcePack(); await restart('Back to the built-in textures…'); };
    return row;
  }

  buildSettings() {
    const g = this.g, s = g.settings, box = $('#settings-grid');
    const items = [
      ['renderDist', 'Render distance', 'range', 2, 16, 1, v => v + ' chunks', 'Lower is faster on phones. Split-screen caps this a little.'],
      ['farTerrain', 'Distant terrain', 'select', [[0, 'Off'], [512, '512 blocks'], [1024, '1,024 blocks'], [2048, '2,048 blocks']], 0, 0, null, 'The land beyond your render distance, drawn simply, like Distant Horizons. Off is fastest.'],
      ['scale', 'Resolution', 'range', 0.4, 1, 0.05, v => Math.round(v * 100) + '%', 'Render fewer pixels for smoother play.'],
      ['fov', 'Field of view', 'range', 55, 100, 1, v => v + '°'],
      ['sens', 'Mouse & touch look speed', 'range', 0.2, 3, 0.05, v => v.toFixed(2) + '×'],
      ['padSens', 'Controller look speed', 'range', 0.3, 3, 0.05, v => v.toFixed(2) + '×'],
      ['brightness', 'Brightness', 'range', 0, 1, 0.05, v => Math.round(v * 100) + '%', 'How much you can see in the dark.'],
      ['volume', 'Sound volume', 'range', 0, 1, 0.05, v => Math.round(v * 100) + '%'],
      ['music', 'Music', 'range', 0, 1, 0.05, v => v > 0 ? Math.round(v * 100) + '%' : 'Off', 'Quiet piano pieces now and then, like the old game. A new one every time.'],
      ['ambience', 'Ambient sounds', 'range', 0, 1, 0.05, v => Math.round(v * 100) + '%', 'Wind, birds, crickets, rain, and the sounds of caves.'],
      ['split', 'Two-player split', 'select', [['auto', 'Automatic'], ['vertical', 'Side by side'], ['horizontal', 'Top and bottom']]],
      ['fancyLeaves', 'Fancy leaves', 'check', 0, 0, 0, null, 'See through tree canopies. Costs some speed.'],
      ['plantDetail', '3D plants', 'select', [['near', 'Near you'], ['all', 'Everywhere (slowest)'], ['flat', 'Flat (fastest)']], 0, 0, null, 'Solid 3D grass, flowers and crops. Near you they are 3D and further out flat, which looks the same at a distance.'],
      ['wavingPlants', 'Waving grass, leaves & water', 'check'],
      ['clouds', 'Clouds', 'check', 0, 0, 0, null, 'Big soft clouds drifting with the wind.'],
      ['portalViews', 'See through portals', 'check', 0, 0, 0, null, 'Portals show the other side as you walk up to them, and you step straight through. Costs some speed near a portal.'],
      ['autoJump', 'Auto-jump (touch)', 'check'],
      ['viewBob', 'View bobbing', 'check'],
      ['fpBody', 'See your body in first person', 'check', 0, 0, 0, null, 'Look down to see your chest, legs and armour.'],
      ['invertY', 'Invert look up/down', 'check'],
      ['showFps', 'Show FPS', 'check'],
      ['particles', 'Particles', 'select', [[2, 'All'], [1, 'Fewer'], [0, 'Off']]],
      ['uiScale', 'Interface size', 'range', 0.5, 2, 0.05, v => Math.round(v * 100) + '%', 'Everything on screen that isn\'t the world: menus, windows, the hotbar, conversations, the map. Ctrl and + / − change it anywhere; Ctrl+0 is 100%.'],
      ['fpsLimit', 'Frame rate limit', 'select', [[0, 'Unlimited (smoothest)'], [60, '60 fps'], [30, '30 fps (saves battery)']]],
      ['padLayout', 'Controller buttons', 'select', [['xbox', 'Xbox (A jumps)'], ['playstation', 'PlayStation (✕ jumps)'], ['nintendo', 'Nintendo (B jumps, A/B swapped)']]],
      ['toggleSneak', 'Toggle sneak', 'check', 0, 0, 0, null, 'Press sneak once to crouch, again to stand.'],
      ['toggleSprint', 'Toggle sprint', 'check', 0, 0, 0, null, 'Sprint stays on while you move forward.'],
      ['screenShake', 'Screen shake', 'check', 0, 0, 0, null, 'Explosions and boss slams shake the view.'],
      ['hurtTilt', 'Damage tilt', 'check', 0, 0, 0, null, 'The view tilts a little when you are hurt.'],
      ['heldSway', 'Held item sway', 'check', 0, 0, 0, null, 'What you hold lags a touch behind when you turn, like Better Than Adventure.'],
    ];
    box.innerHTML = '';
    box.appendChild(this.packRow());
    if (this.controlsRow) box.appendChild(this.controlsRow());
    if (this.padRow) box.appendChild(this.padRow());
    for (const [key, label, type, min, max, step, fmt, desc] of items) {
      const row = document.createElement('div'); row.className = 'setting';
      const id = 'set-' + key;
      if (type === 'range') {
        row.innerHTML = `<label for="${id}">${label}</label><output for="${id}">${fmt(s[key])}</output><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${s[key]}">${desc ? `<span class="desc">${desc}</span>` : ''}`;
        const inp = row.querySelector('input'), out = row.querySelector('output');
        inp.oninput = () => { if (key === 'uiScale') { out.textContent = fmt(Number(inp.value)); return; } s[key] = Number(inp.value); out.textContent = fmt(s[key]); g.applySettingsLight(); };
        inp.onchange = () => { if (key === 'uiScale') s[key] = Number(inp.value); g.applySettings(); };   // (alpha 6) the interface's size changes when you let go, not under your pointer
      } else if (type === 'select') {
        row.innerHTML = `<label for="${id}">${label}</label><select id="${id}">${min.map(([v, l]) => `<option value="${v}" ${String(s[key]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>${desc ? `<span class="desc">${desc}</span>` : ''}`;
        const sel = row.querySelector('select');
        sel.onchange = () => { s[key] = typeof min[0][0] === 'number' ? Number(sel.value) : sel.value; g.applySettings(); for (const l of g.locals) l.hud.layout(); };
      } else {
        row.innerHTML = `<label for="${id}">${label}</label><input type="checkbox" id="${id}" ${s[key] ? 'checked' : ''}>${desc ? `<span class="desc">${desc}</span>` : ''}`;
        const inp = row.querySelector('input');
        inp.onchange = () => { s[key] = inp.checked; g.applySettings(); };
      }
      box.appendChild(row);
    }
  }
}
