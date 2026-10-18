// ---------------------------------------------------------------------------
// ui/hymenu.js — (alpha 2) the main menu and the hero, the Hytale way.
//
// The title is a scene: the world turning behind, the name top-left, big menu entries down the left, and your
// hero standing on the right, a 3D figure turning slowly, with their name, species, class and level. You make your
// hero before you make a world: Play with no hero opens the hero maker first; Play with one goes straight to your
// worlds, and every new world starts with that hero (no character sheet in the way). The hero maker itself is a
// stage: the figure big in the middle (drag it round), the pages down the left, the choices on the right.
//
// The 3D figure is CSS: each limb a box of six faces cut from the skin, so it's as sharp as the skin itself.
// ---------------------------------------------------------------------------

// ---- the figure ----------------------------------------------------------------------------------------------------
function hySkinModel(host, url, o = {}) {
  const S = o.scale || 8, slim = !!o.slim, legacy = !!o.legacy, aw = slim ? 3 : 4;
  host.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'hy-fig' + (o.spin === false ? '' : ' spin');
  host.appendChild(root);
  const box = (cls, w, h, d, u, v, x, y, z, over, mirror) => {
    const b = document.createElement('div');
    b.className = 'hy-box ' + cls + (over ? ' over' : '');
    b.style.transform = `translate3d(${x * S}px, ${y * S}px, ${z * S}px)` + (over ? ' scale3d(1.12, 1.07, 1.14)' : '') + (mirror ? ' scaleX(-1)' : '');
    const F = [
      [w, h, u + d, v + d, `translateZ(${d * S / 2}px)`],
      [w, h, u + 2 * d + w, v + d, `rotateY(180deg) translateZ(${d * S / 2}px)`],
      [d, h, u, v + d, `rotateY(-90deg) translateZ(${w * S / 2}px)`],
      [d, h, u + d + w, v + d, `rotateY(90deg) translateZ(${w * S / 2}px)`],
      [w, d, u + d, v, `rotateX(90deg) translateZ(${h * S / 2}px)`],
      [w, d, u + d + w, v, `rotateX(-90deg) translateZ(${h * S / 2}px)`],
    ];
    for (const [fw, fh, tu, tv, tr] of F) {
      const f = document.createElement('i');
      f.style.cssText = `width:${fw * S}px;height:${fh * S}px;margin:${-fh * S / 2}px 0 0 ${-fw * S / 2}px;transform:${tr};background-image:url("${url}");background-size:${64 * S}px ${64 * S}px;background-position:${-tu * S}px ${-tv * S}px`;
      b.appendChild(f);
    }
    root.appendChild(b);
    return b;
  };
  const limb = (cls, x, y, u, v, ou, ov, w, mirror) => {
    const g = document.createElement('div'); g.className = 'hy-limb ' + cls; g.style.transform = `translate3d(${x * S}px, ${y * S}px, 0)`; root.appendChild(g);
    const mk = (...a) => { const b2 = box(...a); g.appendChild(b2); return b2; };
    mk('', w, 12, 4, u, v, 0, 6, 0, false, mirror);
    if (!legacy) mk('', w, 12, 4, ou, ov, 0, 6, 0, true, mirror);
    return g;
  };
  // head (and hat), body (and jacket), arms (and sleeves), legs (and trousers): the hips are the middle
  const head = document.createElement('div'); head.className = 'hy-limb head'; head.style.transform = `translate3d(0, ${-12 * S}px, 0)`; root.appendChild(head);
  head.appendChild(box('', 8, 8, 8, 0, 0, 0, -4, 0)); head.appendChild(box('', 8, 8, 8, 32, 0, 0, -4, 0, true));
  box('body', 8, 12, 4, 16, 16, 0, -6, 0); if (!legacy) box('body', 8, 12, 4, 16, 32, 0, -6, 0, true);
  limb('arm r', -(4 + aw / 2), -12, 40, 16, 40, 32, aw, false);
  limb('arm l', 4 + aw / 2, -12, legacy ? 40 : 32, legacy ? 16 : 48, 48, 48, aw, legacy);
  limb('leg r', -2, 0, 0, 16, 0, 32, 4, false);
  limb('leg l', 2, 0, legacy ? 0 : 16, legacy ? 16 : 48, 0, 48, 4, legacy);
  // drag to turn
  let ry = o.yaw || 0, drag = null;
  const set = () => root.style.setProperty('--ry', ry + 'deg');
  set();
  host.onpointerdown = (e) => { drag = { x: e.clientX, ry }; root.classList.remove('spin'); try { host.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } };
  host.onpointermove = (e) => { if (!drag) return; ry = drag.ry + (e.clientX - drag.x) * 0.6; set(); };
  host.onpointerup = host.onpointercancel = () => { drag = null; };
  return { turn: (d) => { root.classList.remove('spin'); ry += d; set(); }, root };
}
// a skin (a data URL, or nothing for the default) as a 64×64 picture the figure can use: [url, slim, legacy]
function hySkinSource(ref, cb) {
  const [src, arms] = skinArms(ref);
  if (!src) { const cv = paintDefaultSkin(); cb(cv.toDataURL(), false, false); return; }
  const img = new Image();
  img.onload = () => { try { const n = normalizeSkinImage(img); cb(n.canvas.toDataURL(), arms ? arms === 'slim' : n.slim, n.legacy); } catch (e) { cb(src, arms === 'slim', false); } };
  img.onerror = () => { const cv = paintDefaultSkin(); cb(cv.toDataURL(), false, false); };
  img.src = src;
}

// ---- the title: the hero on the right ---------------------------------------------------------------------------------
function hyHeroCard(ui) {
  const g = ui.g, pr = g.profiles && g.profiles[0], box = document.getElementById('hy-hero');
  if (!box || !pr) return;
  const T = pr.dnd, stage = box.querySelector('.hy-stage'), card = box.querySelector('.hy-hero-card');
  const key = (pr.skin || '') + '|' + (pr.arms || '') + '|' + (T ? T.name : '');
  if (stage._key !== key) {
    stage._key = key;
    hySkinSource(skinRef(pr), (url, slim, legacy) => { stage._fig = hySkinModel(stage, url, { scale: Math.max(6, Math.min(11, Math.floor(window.innerHeight / 75))), slim, legacy, yaw: -24, spin: false }); });
  }
  const Sp = T && DND_SPECIES[T.species], C = T && DND_CLASSES[T.cls], Bg = T && DND_BACKGROUNDS[T.bg];
  card.innerHTML = T
    ? `<span class="hy-hero-k">Your hero</span><b>${esc(T.name)}</b><span class="hy-hero-sub">${esc(Sp ? Sp.name : '')} ${esc(C ? C.name : '')}${Bg ? ' · ' + esc(Bg.name) : ''}</span>
       <div class="hy-hero-btns"><button class="hybtn-s" data-hy="edit">Customize</button><button class="hybtn-s" data-hy="heroes">All heroes</button></div>`
    : `<span class="hy-hero-k">No hero yet</span><b>${esc(pr.name || 'Wanderer')}</b><span class="hy-hero-sub">Make the hero you'll play in every world</span>
       <div class="hy-hero-btns"><button class="hybtn-s primary" data-hy="edit">Create your hero</button></div>`;
  card.querySelector('[data-hy="edit"]').onclick = () => ui.openHeroCreator(0);
  const hb = card.querySelector('[data-hy="heroes"]'); if (hb) hb.onclick = () => ui.openSub('players');
}

{
  const baseBind = UI.prototype.bindMenus;
  UI.prototype.bindMenus = function () {
    baseBind.call(this);
    const g = this.g;
    // Play: your hero first, then your worlds
    const play = document.getElementById('btn-play');
    if (play) play.onclick = () => {
      g.sfx.unlock();
      const pr = g.profiles && g.profiles[0];
      if (pr && !pr.dnd) this.openHeroCreator(0, () => this.show('worlds'));
      else this.show('worlds');
    };
    // the menu entries click like the rest of the game's buttons
    document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.hybtn, .hybtn-s'); if (b && !b.disabled) g.sfx.play('click'); }, true);
    const srv = document.getElementById('btn-server');
    if (srv) { srv.className = 'hybtn hybtn-small'; srv.innerHTML = '<span>Dedicated Server</span><small>Host a world for friends</small>'; }
  };
  const baseShow = UI.prototype.show;
  UI.prototype.show = function (name) {
    const r = baseShow.call(this, name);
    try {
      if (name === 'title') hyHeroCard(this);
      if (name === 'worlds') hyWorldsHero(this);
    } catch (e) { console.warn('hero card', e); }
    return r;
  };
  // the hero maker from the title, as a stage (and Play goes on to the worlds once it's done)
  const baseHero = UI.prototype.openHeroCreator;
  UI.prototype.openHeroCreator = function (i, then) {
    baseHero.call(this, i);
    const ui = this._heroUI; if (!ui) return;
    const host = ui.host;
    host.classList.add('hy-hero-screen');
    ui.el.classList.add('hy');
    ui.o.hy = true;
    ui.o.title = i === 0 ? 'Your hero' : `Player ${i + 1} · your hero`;
    ui.o.doneLabel = then ? 'Continue to your worlds ▶' : 'Keep this hero';
    const baseDone = ui.o.onDone;
    ui.o.onDone = (...a) => { baseDone(...a); hyHeroCard(this); if (this.cur === 'players') this.renderProfiles(); if (then) then(); };
    ui.draw();
  };
}
// the worlds screen says who you're playing
function hyWorldsHero(ui) {
  const g = ui.g, pr = g.profiles && g.profiles[0], head = document.querySelector('#worlds .panel-head'); if (!head || !pr) return;
  let chip = head.querySelector('.hy-chip');
  if (!chip) { chip = document.createElement('button'); chip.className = 'hy-chip btn ghost'; head.insertBefore(chip, head.querySelector('[data-close]')); }
  const T = pr.dnd;
  chip.innerHTML = T ? `Playing as <b>${esc(T.name)}</b> · ${esc((DND_SPECIES[T.species] || {}).name || '')} ${esc((DND_CLASSES[T.cls] || {}).name || '')} <i>change</i>` : 'No hero yet · <i>create one</i>';
  chip.onclick = () => ui.openHeroCreator(0, () => hyWorldsHero(ui));
}

// ---- the hero maker: the figure big in the middle --------------------------------------------------------------------
{
  const basePaint = DndCreator.prototype.paintDoll;
  DndCreator.prototype.paintDoll = function () {
    // (the in-game hero maker too: the figure in 3D, its gear and all, rather than a flat picture)
    const side = this.el.querySelector('.cr-side'); if (!side) return basePaint.call(this);
    const cv = side.querySelector('.cr-doll'); if (cv) cv.remove();
    let stage = side.querySelector('.hy-stage');
    if (!stage) { stage = document.createElement('div'); stage.className = 'hy-stage ' + (this.o.hy ? 'big' : 'small'); side.insertBefore(stage, side.firstChild); }
    const skin = dndPaintSkin(this.s.look);
    this._skin = skin;
    const url = skin.toDataURL ? skin.toDataURL() : skin;
    const keep = this._hyFig && this._hyFig.root && this._hyFig.root.style.getPropertyValue('--ry');
    // (room above the head for a tall hat)
    const sc = this.o.hy ? Math.max(5, Math.min(11, Math.floor(Math.min(window.innerHeight * 0.6, stage.clientHeight || 1e9) / 46))) : Math.max(4, Math.min(7, Math.floor((stage.clientHeight || 260) / 46)));
    this._hyFig = hySkinModel(stage, url, { scale: sc, slim: this.s.look.body === 'slim', spin: false, yaw: keep ? parseFloat(keep) : -20 });
    // the turn buttons turn the figure
    for (const b of this.el.querySelectorAll('[data-rot]')) b.onclick = (e) => { e.stopPropagation(); this._hyTurned = true; this._hyFig.turn(+b.dataset.rot * 45); };
  };
}
// a hero made ahead of time is simply who you are in a new world: no character sheet in the way
{
  const baseOpen = LocalPlayer.prototype.openCreator;
  LocalPlayer.prototype.openCreator = function (force) {
    const tpl = this.profile && this.profile.dnd;
    if (tpl && !force && !this.creatorUI && !dndOf(this.player)) {
      const lp = this, g = this.g;
      try {
        const tmp = new DndCreator(document.createElement('div'), { lp, g, from: Object.assign({}, tpl), onDone: (c, skin, arms, t) => dndApplyChar(lp, c, skin, arms, t) });
        tmp.finish();
        if (dndOf(lp.player)) { lp.toast(`${dndOf(lp.player).name} sets out`, 'good'); return; }
      } catch (e) { console.warn('hero', e); }
    }
    return baseOpen.call(this, force);
  };
}

// ---- the GeruDoku resource pack, one click away -------------------------------------------------------------------------
// The game is made to be played in GeruDoku (sybenx's pack for Minecraft, after Doku's and Gerudo Rivera's), which covers
// its blocks, items, armour and the 3D gear's cloth, leather and metal. Its art isn't ours to ship inside the game, so the
// game fetches it from the pack's own GitHub release: the desktop app does that by itself the first time it starts (and
// any time from Settings); in a browser the release page opens and you choose the .zip you downloaded.
const GERUDOKU = { page: 'https://github.com/sybenx/GeruDoku/releases/tag/1.19.3.v1', zip: 'https://github.com/sybenx/GeruDoku/releases/download/1.19.3.v1/GeruDoku.1.19.3.v1.zip', name: 'GeruDoku.1.19.3.v1.zip' };
const GERU_KEY = 'shadowbloom.gerudoku';
function geruPref(v) { try { if (v !== undefined) localStorage.setItem(GERU_KEY, v); return localStorage.getItem(GERU_KEY) || ''; } catch (e) { return ''; } }
async function geruFetch() {
  let buf;
  if (window.emberLauncher && window.emberLauncher.fetchPack) buf = await window.emberLauncher.fetchPack(GERUDOKU.zip);
  else { const r = await fetch(GERUDOKU.zip); if (!r.ok) throw new Error('download failed (' + r.status + ')'); buf = await r.arrayBuffer(); }
  return new File([buf], GERUDOKU.name, { type: 'application/zip' });
}
async function geruInstall(status) {
  const say = (t) => { try { if (status) status(t); } catch (e) { /* fine */ } };
  say('Fetching GeruDoku from its GitHub release…');
  const f = await geruFetch();
  say('Installing GeruDoku…');
  await installResourcePack(f);
  geruPref('on');
  say('GeruDoku installed: the game restarts with it…');
  setTimeout(() => location.reload(), 600);
}
{
  const baseRow = UI.prototype.packRow;
  UI.prototype.packRow = function () {
    const row = baseRow.call(this);
    try {
      const btns = row.querySelector('.pack-btns'), now = row.querySelector('.pack-now');
      const b = document.createElement('button'); b.className = 'btn tiny'; b.textContent = /gerudoku/i.test(PACKS.active || '') ? 'GeruDoku ✓' : 'Get GeruDoku';
      b.title = 'Download the GeruDoku resource pack from its GitHub release (' + GERUDOKU.page + ')';
      b.onclick = async () => {
        b.disabled = true;
        try { await geruInstall((t) => { now.textContent = t; }); }
        catch (e) {
          // a browser can't fetch GitHub's release files: open the page instead, and the zip goes in through "Choose pack"
          now.textContent = 'Opening the GeruDoku release page: download ' + GERUDOKU.name + ', then press "Choose pack (.zip)…" and pick it.';
          try { window.open(GERUDOKU.page, '_blank', 'noopener'); } catch (er) { /* blocked */ }
          b.disabled = false;
        }
      };
      btns.insertBefore(b, btns.firstChild);
      // going back to the built-in pictures means it: the app won't fetch GeruDoku again by itself
      const bi = row.querySelector('[data-builtin]'); if (bi) bi.addEventListener('click', () => geruPref('off'), true);
    } catch (e) { console.warn('gerudoku row', e); }
    return row;
  };
  // the desktop app gets GeruDoku by itself the first time (unless you've chosen the built-in pictures)
  const baseShow = UI.prototype.show;
  UI.prototype.show = function (name) {
    const r = baseShow.call(this, name);
    if (name === 'title' && !geruPref() && !PACKS.active && window.emberLauncher && window.emberLauncher.fetchPack && !UI._geruTried) {
      UI._geruTried = true;
      const st = document.getElementById('store-status');
      geruInstall((t) => { if (st) st.textContent = t; }).catch((e) => { if (st) st.textContent = 'Couldn’t fetch GeruDoku (' + (e.message || e) + '); Settings → Resource pack can try again.'; });
    }
    return r;
  };
}

// ---- a controller in the hero maker opened from the menus ------------------------------------------------------------
// The menus' controller events drive the hero maker while it's open: the d-pad (or left stick) moves between choices
// and changes a looks row with left/right, A chooses, LB/RB turn the pages, B goes back a page (or, on the first page,
// cancels), and Start jumps to the last page with its Continue button.
{
  const baseNav = UI.prototype.menuNav;
  UI.prototype.menuNav = function (events) {
    const H = this._heroUI;
    if (!(H && H.el && H.el.isConnected) || !events.length) return baseNav.call(this, events);
    for (const ev of events) {
      if (!H.el.isConnected) break;
      const inp = InputManager.blankState();
      inp.fromPad = true;
      if (ev.type === 'move') { inp.navX = ev.dx || 0; inp.navY = ev.dy || 0; }
      else if (ev.type === 'ok') inp.padA = true;
      else if (ev.type === 'tab') { if (ev.dir > 0) inp.padRB = true; else inp.padLB = true; }
      else if (ev.type === 'back') {
        if (H.s.step === 0) { const c = H.el.querySelector('.hero-close') || (H.host && H.host.querySelector('.hero-close')); if (c) c.click(); else if (H.host) H.host.remove(); this.g.sfx.play('click'); continue; }
        inp.padB = true;
      } else if (ev.type === 'start') inp.padStart = true;
      else continue;
      try { H.frame(0, inp); } catch (e) { console.warn('hero maker pad', e); }
      H._padUsed = true;
      if (inp.navX || inp.navY) this.g.sfx.play('tick'); else this.g.sfx.play('click');
    }
  };
}
