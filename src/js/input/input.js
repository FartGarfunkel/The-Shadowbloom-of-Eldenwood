// ---------------------------------------------------------------------------
// input/input.js — one input state, fed by keyboard + mouse OR touch.
// Gameplay code only reads `Input.state`; it never asks which device is used.
// ---------------------------------------------------------------------------

// ---- what each key does (Settings → Controls changes these) ---------------------------------------
// Keys are KeyboardEvent.code names; mouse buttons are Mouse0 (left), Mouse1 (middle), Mouse2 (right).
const KEY_ACTIONS = [
  ['forward', 'Walk forward', ['KeyW', 'ArrowUp']], ['back', 'Walk back', ['KeyS', 'ArrowDown']],
  ['left', 'Strafe left', ['KeyA', 'ArrowLeft']], ['right', 'Strafe right', ['KeyD', 'ArrowRight']],
  ['jump', 'Jump / climb', ['Space']], ['sneak', 'Sneak', ['ShiftLeft', 'ShiftRight']], ['sprint', 'Sprint', ['ControlLeft', 'ControlRight']],
  ['crawl', 'Crawl', ['KeyC']],
  ['attack', 'Attack / mine', ['Mouse0']], ['use', 'Use / place', ['Mouse2']], ['pick', 'Pick block', ['Mouse1']],
  ['inventory', 'Inventory', ['KeyE']], ['drop', 'Drop item (Ctrl: stack)', ['KeyQ']], ['swap', 'Swap hands', ['KeyF']], ['place', 'Placing mode (slabs, stairs)', ['KeyR']],
  ['view', 'Camera: first / shoulder / behind / front', ['F5', 'KeyV']], ['shoulder', 'Camera: swap shoulder', ['KeyX']],
  ['chat', 'Chat', ['KeyT', 'Enter', 'NumpadEnter']], ['command', 'Command', ['Slash']],
  ['hideHud', 'Hide the HUD', ['F1']], ['screenshot', 'Screenshot', ['F2']], ['debug', 'Debug info', ['F3']],
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ['slot' + n, 'Hotbar slot ' + n, ['Digit' + n]]),
];
const KEY_DEFAULTS = Object.fromEntries(KEY_ACTIONS.map(([id, , k]) => [id, k]));
function keyBinds(custom) {
  const out = {};
  for (const [id] of KEY_ACTIONS) out[id] = (custom && Array.isArray(custom[id])) ? custom[id] : KEY_DEFAULTS[id];
  return out;
}

class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.touchRoot = null;
    this.joy = { active: false };
    this.look = new Map();
    this.keys = new Set();
    this.binds = keyBinds(null);
    this.touchMode = false;
    this.enabled = false;           // true only while in-game (not in menus)
    this.sens = 1;                  // look sensitivity multiplier
    this.invertY = false;
    this.locked = false;
    this.s = this.blank();
    this.onModeChange = null;
    this.onPauseRequest = null;
    this.onAnyGesture = null;
    this.bindDesktop();
    // Pick the starting mode from the device, then follow whatever the player
    // actually touches: a finger switches to touch controls, a mouse switches back.
    const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0 && !(window.matchMedia && matchMedia('(pointer: fine)').matches);
    this.setTouchMode(!!coarse);
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') this.setTouchMode(true);
      else if (e.pointerType === 'mouse') this.setTouchMode(false);
    }, true);
  }
  blank() { return InputManager.blankState(); }
  static blankState() {
    return {
      mx: 0, mz: 0, jump: false, sneak: false, sprint: false,
      lookX: 0, lookY: 0,
      attack: false, attackPressed: false, use: false, usePressed: false,
      slot: -1, wheel: 0, drop: false, dropAll: false, inventory: false, pause: false, debug: false, pick: false, swap: false, place: false, chat: null, hideHud: false, screenshot: false, view: false, shoulder: false, crawl: false, crawlHeld: false,
      // gamepad-only: menu/inventory navigation and face buttons (edges)
      navX: 0, navY: 0, padA: false, padB: false, padX: false, padY: false, padLB: false, padRB: false, padStart: false, fromPad: false,
    };
  }
  // Called once per frame by the game after reading; clears one-shot events.
  endFrame() {
    const s = this.s;
    s.lookX = 0; s.lookY = 0; s.attackPressed = false; s.usePressed = false;
    s.slot = -1; s.wheel = 0; s.drop = false; s.dropAll = false; s.inventory = false; s.pause = false; s.debug = false; s.pick = false; s.swap = false; s.place = false; s.chat = null; s.hideHud = false; s.screenshot = false; s.view = false; s.shoulder = false; s.crawl = false;
  }
  setTouchMode(on) {
    if (this.touchMode === on) return;
    this.touchMode = on;
    document.documentElement.classList.toggle('touch', on);
    if (this.onModeChange) this.onModeChange(on);
  }
  // is any key (or mouse button) bound to this action down?
  held(action) { const b = this.binds[action]; if (!b) return false; for (const c of b) if (this.keys.has(c)) return true; return false; }
  actionsFor(code) { const out = []; for (const id in this.binds) if (this.binds[id].includes(code)) out.push(id); return out; }
  updateMoveFromKeys() {
    if (this.touchMode && this.joy.active) return;
    let x = 0, z = 0;
    if (this.held('forward')) z -= 1;
    if (this.held('back')) z += 1;
    if (this.held('left')) x -= 1;
    if (this.held('right')) x += 1;
    const l = Math.hypot(x, z) || 1;
    this.s.mx = x / l; this.s.mz = z / l;
    this.s.jump = this.held('jump');
    this.s.sneak = this.toggleSneak ? !!this._sneakLatch : this.held('sneak');
    this.s.crawlHeld = this.held('crawl');
    if (this.toggleSprint && this.held('sprint')) this._sprintLatch = true;
    this.s.sprint = this.held('sprint') || this._doubleW || (this.toggleSprint && this._sprintLatch && this.held('forward'));
    if (!this.held('forward')) { this._doubleW = false; this._sprintLatch = false; }
    this.s.attack = this.held('attack') || !!this._touchAttack;
    this.s.use = this.held('use') || !!this._touchUse;
  }
  // a key or mouse button went down: the one-shot actions bound to it
  pressCode(code, e) {
    const s = this.s, acts = this.actionsFor(code);
    for (const a of acts) {
      if (a === 'forward') { const now = performance.now(); if (this._lastW && now - this._lastW < 280) this._doubleW = true; this._lastW = now; }
      else if (a === 'sneak') this._sneakLatch = !this._sneakLatch;
      else if (a === 'attack') s.attackPressed = true;
      else if (a === 'use') s.usePressed = true;
      else if (a === 'pick') s.pick = true;
      else if (a === 'inventory') s.inventory = true;
      else if (a === 'drop') { if (e && e.ctrlKey) s.dropAll = true; else s.drop = true; }
      else if (a === 'swap') s.swap = true;
      else if (a === 'place') s.place = true;
      else if (a === 'view') s.view = true;
      else if (a === 'shoulder') s.shoulder = true;
      else if (a === 'crawl') s.crawl = true;
      else if (a === 'chat') s.chat = '';
      else if (a === 'command') { s.chat = '/'; if (e) e.preventDefault(); }
      else if (a === 'hideHud') { s.hideHud = true; if (e) e.preventDefault(); }
      else if (a === 'screenshot') { s.screenshot = true; if (e) e.preventDefault(); }
      else if (a === 'debug') { s.debug = true; if (e) e.preventDefault(); }
      else if (a.startsWith('slot')) s.slot = Number(a.slice(4)) - 1;
    }
    return acts.length > 0;
  }

  // ---- desktop -----------------------------------------------------------------
  bindDesktop() {
    window.addEventListener('keydown', (e) => {
      // typing in a box on screen is typing, not playing (a box left focused on a closed screen isn't)
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.offsetParent !== null) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) e.target.blur();
      if (this.onAnyGesture) this.onAnyGesture();
      if (this.capture) { const f = this.capture; f(e.code, e); e.preventDefault(); e.stopImmediatePropagation(); return; }   // Settings → Controls is listening
      this.keys.add(e.code);
      const s = this.s;
      if (!e.repeat) this.pressCode(e.code, e);
      if (e.code === 'F3' || e.code === 'F5' || e.code === 'F1' || e.code === 'F2') e.preventDefault();
      // (0.9.0.48) Esc with the mouse held: the browser lets the mouse go, and that opens the pause menu (below); counting
      // the key as well paused and then unpaused at once. (If the mouse somehow stays held, the key still pauses.)
      if (e.code === 'Escape') {
        if (this.locked || performance.now() - (this._unlockAt || 0) < 400) { clearTimeout(this._escT); this._escT = setTimeout(() => { if (this.locked) s.pause = true; }, 250); }
        else s.pause = true;
      }
      if (this.enabled && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.ctrlKey && e.code === 'KeyW' && this.enabled) e.preventDefault();
      if (/^(Key|Arrow|Space)/.test(e.code)) this.setTouchMode(false);
      this.updateMoveFromKeys();
    });
    window.addEventListener('keyup', (e) => { this.keys.delete(e.code); this.updateMoveFromKeys(); });
    window.addEventListener('blur', () => { this.keys.clear(); this.updateMoveFromKeys(); });

    const c = this.canvas;
    c.addEventListener('mousedown', (e) => {
      if (this.touchMode) return; // compatibility mouse events from a finger
      if (this.onAnyGesture) this.onAnyGesture();
      if (!this.enabled) return;
      if (!this.locked) { this.requestLock(true); }
      const code = 'Mouse' + e.button;
      this.keys.add(code); this.pressCode(code, e); this.updateMoveFromKeys();
      if (e.button === 1) e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => { this.keys.delete('Mouse' + e.button); this.updateMoveFromKeys(); });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (!this.enabled || this.touchMode) return;
      if (this.locked || this._noLockFallback) {
        this.s.lookX += e.movementX * 0.0025 * this.sens;
        this.s.lookY += e.movementY * 0.0025 * this.sens * (this.invertY ? -1 : 1);
      }
    });
    // the wheel picks a hotbar slot wherever the pointer is over the game (the hotbar too), not only the
    // bare picture; lists and menus on screen still scroll as lists
    window.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      const t = e.target;
      if (t !== c && t.closest && t.closest('.inv, .chat, .panel, .settings-grid, .lan-body, .death, .mapview')) return;
      if (t !== c && t.closest && !t.closest('#views') && !this.locked) return;
      e.preventDefault();
      this.wheelSeen = (this.wheelSeen || 0) + 1;     // (for the F3 screen)
      const n = wheelNotches(this, e);
      if (n) { this.s.wheel += n; this.wheelSteps = (this.wheelSteps || 0) + Math.abs(n); }
    }, { passive: false });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === c;
      if (was && !this.locked && !this._suppressPause) this._unlockAt = performance.now();   // the browser let it go (Esc), not the game
      if (this.locked) { this._noLockFallback = false; this.needClick = false; }   // held again: back to the normal way
      if (was && !this.locked && this.enabled && this.onPauseRequest && !this._suppressPause) this.onPauseRequest();
      this._suppressPause = false;
    });
    document.addEventListener('pointerlockerror', () => { this.needClick = true; });
  }
  // (0.9.0.48) a browser only holds the mouse after a click (not after Esc, and not just after letting go of it): asked at
  // other times and refused, the game says "Click to play" rather than going on with a loose mouse for good
  requestLock(fromClick) {
    if (this.touchMode) return;
    if (!this.canvas.requestPointerLock) { this._noLockFallback = true; return; }
    const fail = () => { if (fromClick) { this._clickFails = (this._clickFails || 0) + 1; if (this._clickFails >= 3) this._noLockFallback = true; } else this.needClick = true; };
    try {
      const p = this.canvas.requestPointerLock();
      if (p && p.then) p.then(() => { this._clickFails = 0; }, fail);
    } catch (e) { fail(); }
  }
  releaseLock(silent) {
    if (document.pointerLockElement) { this._suppressPause = !!silent; document.exitPointerLock(); }
  }

  // ---- touch -----------------------------------------------------------------------
  // Touch controls live in the first player's view; the HUD calls this once it exists.
  bindTouch(root) {
    if (this.touchRoot) return;
    this.touchRoot = root;
    this.joy = { active: false, id: null, ox: 0, oy: 0 };
    this.look = new Map(); // pointerId -> {x, y, t0, moved, longFired}
    const joyBase = root.querySelector('.joy-base'), joyKnob = root.querySelector('.joy-knob');
    const zone = root.querySelector('.touch-zone');
    const R = () => Math.max(46, Math.min(70, window.innerWidth * 0.09));

    zone.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      e.preventDefault();
      if (this.onAnyGesture) this.onAnyGesture();
      this.setTouchMode(true);
      if (!this.enabled) return;
      zone.setPointerCapture(e.pointerId);
      const zr = zone.getBoundingClientRect();
      const leftSide = e.clientX - zr.left < zr.width * 0.42;
      if (leftSide && !this.joy.active) {
        this.joy = { active: true, id: e.pointerId, ox: e.clientX, oy: e.clientY };
        joyBase.style.left = e.clientX + 'px'; joyBase.style.top = e.clientY + 'px';
        joyKnob.style.transform = 'translate(-50%,-50%)';
        joyBase.hidden = false;
      } else {
        this.look.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), moved: false, mining: false });
      }
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') return;
      if (this.joy.active && e.pointerId === this.joy.id) {
        let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
        const r = R(), l = Math.hypot(dx, dy);
        if (l > r) { dx = dx / l * r; dy = dy / l * r; }
        joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        const m = Math.min(1, l / r);
        this.s.mx = (dx / r); this.s.mz = (dy / r);
        this.s.sprint = m > 0.97 && dy < -r * 0.7;
        return;
      }
      const L = this.look.get(e.pointerId);
      if (!L) return;
      const dx = e.clientX - L.x, dy = e.clientY - L.y;
      L.x = e.clientX; L.y = e.clientY;
      if (Math.hypot(e.clientX - L.sx, e.clientY - L.sy) > 10) L.moved = true;
      this.s.lookX += dx * 0.0062 * this.sens;
      this.s.lookY += dy * 0.0062 * this.sens * (this.invertY ? -1 : 1);
    });
    const end = (e) => {
      if (this.joy.active && e.pointerId === this.joy.id) {
        this.joy.active = false; this.s.mx = 0; this.s.mz = 0; this.s.sprint = false;
        joyBase.hidden = true;
        return;
      }
      const L = this.look.get(e.pointerId);
      if (!L) return;
      this.look.delete(e.pointerId);
      // A quick tap without dragging = use/place.
      if (!L.moved && !L.mining && performance.now() - L.t0 < 260 && e.type === 'pointerup') { this.s.usePressed = true; }
      if (L.mining) { this._touchAttack = this.s.attack = this.mineButtonHeld || false; }
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    // Long-press without dragging = mine (like holding the mouse button).
    setInterval(() => {
      for (const L of this.look.values()) {
        if (!L.moved && !L.mining && performance.now() - L.t0 > 330) { L.mining = true; this._touchAttack = this.s.attack = true; this.s.attackPressed = true; }
        if (L.moved && L.mining && !this.mineButtonHeld) { L.mining = false; this._touchAttack = this.s.attack = false; }
      }
    }, 50);

    // Buttons
    const hold = (sel, down, up) => {
      const el = root.querySelector(sel);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (this.onAnyGesture) this.onAnyGesture(); this.setTouchMode(e.pointerType !== 'mouse' || this.touchMode); el.setPointerCapture(e.pointerId); el.classList.add('on'); down(); });
      const u = (e) => { el.classList.remove('on'); up && up(); };
      el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u);
    };
    hold('[data-t="jump"]', () => { this.s.jump = true; }, () => { this.s.jump = false; });
    hold('[data-t="mine"]', () => { this.mineButtonHeld = true; this._touchAttack = this.s.attack = true; this.s.attackPressed = true; }, () => { this.mineButtonHeld = false; this._touchAttack = this.s.attack = false; });
    hold('[data-t="use"]', () => { this._touchUse = this.s.use = true; this.s.usePressed = true; }, () => { this._touchUse = this.s.use = false; });
    hold('[data-t="sneak"]', () => { this.sneakToggle = !this.sneakToggle; this.s.sneak = this.sneakToggle; root.querySelector('[data-t="sneak"]').classList.toggle('latched', this.sneakToggle); }, null);
    hold('[data-t="inv"]', () => { this.s.inventory = true; }, null);
    hold('[data-t="chat"]', () => { this.s.chat = ''; }, null);
    hold('[data-t="pause"]', () => { this.s.pause = true; }, null);
    hold('[data-t="drop"]', () => { this.s.drop = true; }, null);
    hold('[data-t="swap"]', () => { this.s.swap = true; }, null);
    hold('[data-t="mode"]', () => { this.s.place = true; }, null);
  }
}

// ---- (alpha 7) the mouse wheel: one hotbar slot per notch -------------------------------------------------------------
// The old way guessed where one notch ended and the next began from how far apart the events came, and learnt a notch's
// size from the bursts (and kept it). Turned quickly, notches ran together and every other one was lost; a size learnt
// from a quick spin made the next notches count only every second or third. Now each event says how much it turned:
//  - lines (Firefox) and pages: an event is a notch, or the fraction of one a fine wheel sends
//  - Chromium (the desktop app, Chrome, Edge) and Firefox also say it in notches, as 120ths ("wheelDelta"): an ordinary
//    wheel sends 120 a notch, a high-resolution or free-spinning one a share of it
//  - only pixels: a hundred to a notch (Windows), and a touchpad's many small ones add up
// Whole notches step at once; what's left over waits (a moment) toward the next. Nothing is timed but the pause that
// forgets a half-turned notch, and a twin event a driver sends a few milliseconds after the first.
function wheelNotches(st, e) {
  const now = performance.now();
  const mode = e.deltaMode;   // read first: Firefox then gives an ordinary wheel's notches as lines, not pixels
  let raw = e.deltaY, legacy = e.wheelDeltaY;
  if (!raw && e.shiftKey) { raw = e.deltaX; legacy = e.wheelDeltaX; }   // shift turns some wheels sideways (sneaking with a wheel)
  if (!raw || !isFinite(raw)) return 0;
  const dir = Math.sign(raw);
  // f: how many notches this event turned; clean: it came in whole notches (an ordinary wheel), not a share of one
  let f, clean;
  if (mode === 2) { f = dir; clean = true; }
  else if (mode === 1) { f = dir * Math.min(1, Math.abs(raw)); clean = Math.abs(raw) >= 1; }
  else if (typeof legacy === 'number' && legacy && isFinite(legacy)) { f = dir * Math.abs(legacy) / 120; clean = Math.abs(legacy) % 120 === 0; }   // deltaY says which way (some setups flip only one of the two)
  else { f = raw / 100; clean = false; }
  f = Math.max(-3, Math.min(3, f));
  const W = st._wh || (st._wh = { acc: 0, dir: 0, t: -1e9, lastStep: -1e9, lastWhole: -1e9, lastDir: 0, unit: 0 });
  if (!(now >= W.t)) W.t = W.lastStep = W.lastWhole = -1e9;            // a clock that went backwards: start afresh
  const alone = now - W.t > 120;                                          // nothing just before it: not part of a stream
  // a pause, or a turn the other way, forgets a half-turned notch
  if (dir !== W.dir || now - W.t > 450) W.acc = 0;
  W.dir = dir; W.t = now;
  if (clean && Math.abs(f) >= 1) {
    // an ordinary wheel's notch steps at once; a twin of the one just before (a few drivers send each twice) doesn't
    if (now - W.lastWhole < 6 && W.lastDir === dir) return 0;
    W.lastWhole = now; W.lastDir = dir; W.acc = 0; W.lastStep = now;
    return Math.round(f);
  }
  // a wheel that reports its notches as a share of 120 (pixels in some browsers): a good-sized event on its own is a notch,
  // and the same size again, a notch again (a touchpad's stream of small, uneven pieces never looks like that)
  if (!clean && mode === 0) {
    const a = Math.abs(f);
    let snap = false;
    if (alone && a >= 0.4 && a < 0.95) { W.unit = a; snap = true; }
    else if (W.unit && a >= 0.4 && a < 0.95 && Math.abs(a - W.unit) <= W.unit * 0.15) snap = true;
    if (snap) { W.acc = 0; if (now - W.lastStep < 25) return 0; W.lastStep = now; return dir; }
  }
  W.acc += f;
  if (Math.abs(W.acc) < 0.95) return 0;
  // a fine wheel or a touchpad: a step for each whole notch's worth, but no faster than a quick hand turns a notched
  // wheel (a touchpad flick sends hundreds of pixels in a moment)
  if (now - W.lastStep < 45) { W.acc = dir * Math.min(Math.abs(W.acc), 1.9); return 0; }
  const n = Math.trunc(W.acc + dir * 0.05);
  W.acc -= n; W.lastStep = now;
  return Math.max(-1, Math.min(1, n));
}
