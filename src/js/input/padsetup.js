// ---------------------------------------------------------------------------
// input/padsetup.js — make every controller work the same.
// Browsers know the layout of common pads ("standard" mapping); for the rest
// (some 8BitDo modes, generic Bluetooth pads, DirectInput pads on Linux) the
// buttons come out in an order of the pad's own. Settings → Controller → Set
// up buttons asks you to press each button and move each stick once, then
// remembers that pad (by its name) for good: after that it has the same
// layout as every other controller. Also: menus scroll with the right stick.
// ---------------------------------------------------------------------------

// What to press, in the order of the standard layout (button numbers 0..15), then the stick axes.
const PAD_STEPS = [
  ['b', 0, 'the BOTTOM face button', 'A on Xbox · ✕ on PlayStation · B on Nintendo'],
  ['b', 1, 'the RIGHT face button', 'B on Xbox · ◯ on PlayStation · A on Nintendo'],
  ['b', 2, 'the LEFT face button', 'X on Xbox · ▢ on PlayStation · Y on Nintendo'],
  ['b', 3, 'the TOP face button', 'Y on Xbox · △ on PlayStation · X on Nintendo'],
  ['b', 4, 'the left shoulder button', 'LB · L1 · L'],
  ['b', 5, 'the right shoulder button', 'RB · R1 · R'],
  ['b', 6, 'the left trigger', 'LT · L2 · ZL'],
  ['b', 7, 'the right trigger', 'RT · R2 · ZR'],
  ['b', 8, 'the small left button', 'View / Back · Share / Select · −'],
  ['b', 9, 'the small right button', 'Menu / Start · Options · +'],
  ['b', 10, 'the left stick, pressed in', 'L3'],
  ['b', 11, 'the right stick, pressed in', 'R3'],
  ['b', 12, 'the d-pad UP', ''],
  ['b', 13, 'the d-pad DOWN', ''],
  ['b', 14, 'the d-pad LEFT', ''],
  ['b', 15, 'the d-pad RIGHT', ''],
  ['a', 0, 'the LEFT stick to the RIGHT', 'push it all the way, then let go'],
  ['a', 1, 'the LEFT stick DOWN', 'push it all the way, then let go'],
  ['a', 2, 'the RIGHT stick to the RIGHT', 'push it all the way, then let go'],
  ['a', 3, 'the RIGHT stick DOWN', 'push it all the way, then let go'],
];

// Read a pad through its saved map: the standard button list and the four stick axes.
function padFromMap(pad, map) {
  const raw = pad.buttons.map(x => (x && (x.pressed || x.value > 0.5)) ? 1 : 0), axes = pad.axes || [];
  const val = (src) => {
    if (!src) return 0;
    if (src.b !== undefined) return raw[src.b] || 0;
    const a = axes[src.a]; if (a === undefined) return 0;
    // a hat switch (one axis for the whole d-pad, resting outside -1..1) needs a tight match
    const hat = Math.abs(src.base) > 1.05 || Math.abs(Math.abs(src.v) - 1) >= 0.06;
    const tol = hat ? 0.12 : Math.abs(src.v - src.base) * 0.5;
    return Math.abs(a - src.v) < tol ? 1 : 0;
  };
  const b = new Array(17).fill(false);
  for (let i = 0; i < 16; i++) b[i] = !!val(map.b[i]);
  const ax = [0, 1, 2, 3].map(i => { const s = map.ax[i]; if (!s) return 0; const a = axes[s.a]; return a === undefined ? 0 : clamp((a - (s.base || 0)) * s.s, -1, 1); });
  return { b, ax };
}

// The layout function now prefers a saved map for this pad.
{
  const base = padLayout;
  padLayout = function (pad, swapNintendo) {
    const maps = (window.__game && window.__game.settings.padMaps) || null, map = maps && maps[pad.id];
    if (!map) return base(pad, swapNintendo);
    let { b, ax } = padFromMap(pad, map);
    if (swapNintendo) { b = b.slice(); [b[0], b[1]] = [b[1], b[0]]; [b[2], b[3]] = [b[3], b[2]]; }
    return { b, ax };
  };
}

// While the setup runs, the pads don't drive the game or the menus.
{
  const basePoll = Gamepads.prototype.poll;
  Gamepads.prototype.poll = function (dt) {
    if (this.setupActive) { this.st.clear(); return; }
    basePoll.call(this, dt);
    // right stick up/down scrolls whatever menu is open
    for (const pad of this.list()) {
      const { ax } = padLayout(pad, false);
      const ry = ax[3] || 0;
      if (Math.abs(ry) > 0.25) this.events.push({ pad: pad.index, type: 'scroll', dy: Math.sign(ry) * (Math.abs(ry) - 0.25) / 0.75 * 900 * dt });
    }
  };
  // a pad the browser doesn't know: suggest setting it up (once per pad)
  const baseConnect = Gamepads.prototype.onConnect;
  Gamepads.prototype.onConnect = function (pad) {
    const fresh = !this.known.has(pad.index);
    baseConnect.call(this, pad);
    const g = this.g, maps = g.settings.padMaps || {};
    if (fresh && pad.mapping !== 'standard' && !maps[pad.id] && g.local) g.local.toast('New controller: if any buttons feel wrong, set it up in Settings → Controller', '');
  };
}

// Menus: scroll events, and a d-pad press with nothing further that way scrolls too.
{
  const scroller = (ui) => {
    const scr = ui.cur && SCREENS.includes(ui.cur) ? $('#' + ui.cur) : null; if (!scr) return null;
    const isScroll = (el) => { if (!el || el === document.body) return false; const st = getComputedStyle(el); return /(auto|scroll)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 2; };
    let el = ui.focus && scr.contains(ui.focus) ? ui.focus.parentElement : null;
    while (el && el !== scr.parentElement) { if (isScroll(el)) return el; el = el.parentElement; }
    return [...scr.querySelectorAll('*')].find(isScroll) || (isScroll(scr) ? scr : null);
  };
  const baseNav = UI.prototype.menuNav;
  UI.prototype.menuNav = function (events) {
    const rest = [];
    for (const ev of events) {
      if (ev.type === 'scroll') { const s = scroller(this); if (s) s.scrollTop += ev.dy; continue; }
      if (ev.type === 'move' && ev.dy && this.focus && this.focus.isConnected) {
        const list = this.focusables();
        if (list.includes(this.focus) && !this.nearest(list, this.focus, ev.dx, ev.dy)) { const s = scroller(this); if (s) { s.scrollTop += ev.dy * 160; continue; } }
      }
      rest.push(ev);
    }
    if (rest.length) baseNav.call(this, rest);
  };
}

// ---- the setup screen ---------------------------------------------------------------------------------
UI.prototype.padSetup = function () {
  const g = this.g, pads = g.pads;
  if (pads.setupActive) return;
  const box = document.createElement('div');
  box.id = 'padsetup';
  box.innerHTML = `<div class="ps-card"><h3>Set up a controller</h3><p class="ps-step"></p><p class="ps-hint"></p><div class="ps-bar"><i></i></div><p class="ps-pad"></p>
    <div class="ps-btns"><button class="btn tiny ghost" data-skip>Skip this one</button><button class="btn tiny ghost" data-cancel>Cancel</button></div></div>`;
  document.body.appendChild(box);
  pads.setupActive = true;
  const $s = (q) => box.querySelector(q);
  let padIndex = null, padId = '', step = 0, base = null, rest = null, waitRelease = false, idleT = 0, lastT = performance.now();
  const map = { b: new Array(16).fill(null), ax: [null, null, null, null] };
  const snap = (pad) => ({ b: pad.buttons.map(x => (x && (x.pressed || x.value > 0.5)) ? 1 : 0), a: (pad.axes || []).slice() });
  const getPad = () => { try { return [...navigator.getGamepads()].find(p => p && (padIndex === null || p.index === padIndex)) || null; } catch (e) { return null; } };
  const show = () => {
    const S = PAD_STEPS[step];
    $s('.ps-step').innerHTML = S[0] === 'a' ? `Move <b>${S[2]}</b>` : `Press <b>${S[2]}</b>`;
    $s('.ps-hint').textContent = S[3] || '';
    $s('.ps-bar i').style.width = (step / PAD_STEPS.length * 100) + '%';
    $s('.ps-pad').textContent = padId ? padId : 'Use the controller you want to set up.';
  };
  const finish = (save) => {
    pads.setupActive = false; box.remove(); cancelAnimationFrame(raf);
    if (save && padId) {
      g.settings.padMaps = Object.assign({}, g.settings.padMaps || {}, { [padId]: map });
      g.applySettings();
      if (g.local) g.local.toast('Controller set up', 'good');
    }
    if (this.cur === 'settings') this.buildSettings();
  };
  const next = () => { step++; base = null; waitRelease = true; idleT = 0; if (step >= PAD_STEPS.length) finish(true); else show(); };
  $s('[data-skip]').onclick = () => next();
  $s('[data-cancel]').onclick = () => finish(false);
  let raf = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const now = performance.now(), dt = (now - lastT) / 1000; lastT = now;
    if (padIndex === null) {
      // the first pad that does anything is the one we set up
      let list = []; try { list = [...navigator.getGamepads()].filter(Boolean); } catch (e) { list = []; }
      for (const p of list) { const s = snap(p); if (s.b.some(Boolean)) { padIndex = p.index; padId = p.id; rest = s.a.slice(); base = { b: new Array(s.b.length).fill(0), a: rest }; break; } }
      if (padIndex === null) return;
    }
    const pad = getPad(); if (!pad) return;
    const s = snap(pad);
    // let go of everything first: buttons up, sticks, triggers and the d-pad back where they rest
    if (waitRelease) { if (!s.b.some(Boolean) && s.a.every((v, i) => Math.abs(v - (rest[i] ?? 0)) < 0.3)) { waitRelease = false; base = { b: s.b, a: rest }; } return; }
    if (!base) base = s;
    const S = PAD_STEPS[step];
    idleT += dt; if (idleT > 12) { next(); return; }                                       // nothing happened: skip it
    if (S[0] === 'b') {
      const bi = s.b.findIndex((v, i) => v && !base.b[i]);
      if (bi >= 0 && !Object.values(map.b).some(m => m && m.b === bi)) { map.b[S[1]] = { b: bi }; g.sfx.play('click'); next(); return; }
      for (let i = 0; i < s.a.length; i++) {
        const d = s.a[i] - base.a[i];
        if (Math.abs(d) > 0.6) { map.b[S[1]] = { a: i, v: Math.round(s.a[i] * 1000) / 1000, base: base.a[i] }; g.sfx.play('click'); next(); return; }
      }
    } else {
      for (let i = 0; i < s.a.length; i++) {
        const d = s.a[i] - base.a[i];
        if (Math.abs(d) > 0.7 && Math.abs(base.a[i]) < 0.3) { map.ax[S[1]] = { a: i, s: Math.sign(d), base: Math.round(base.a[i] * 100) / 100 }; g.sfx.play('click'); next(); return; }
      }
    }
  };
  show();
  raf = requestAnimationFrame(tick);
};
UI.prototype.padForget = function () { this.g.settings.padMaps = {}; this.g.applySettings(); };

// Settings: the controller row
UI.prototype.padRow = function () {
  const g = this.g, row = document.createElement('div'); row.className = 'setting pack-setting';
  const n = Object.keys(g.settings.padMaps || {}).length;
  row.innerHTML = `<label>Controller</label><span class="pack-btns"><button class="btn tiny" data-setup>Set up buttons…</button><button class="btn tiny ghost" data-forget ${n ? '' : 'disabled'}>Reset</button></span>
    <span class="desc">${n ? n + ' controller' + (n > 1 ? 's' : '') + ' set up by hand. ' : ''}If a controller's buttons are mixed up, press each one when asked and it will work like any other. The right stick scrolls menus.</span>`;
  row.querySelector('[data-setup]').onclick = () => this.padSetup();
  row.querySelector('[data-forget]').onclick = () => { this.padForget(); this.buildSettings(); };
  return row;
};
