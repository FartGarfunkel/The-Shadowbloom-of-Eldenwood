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
      // (0.9.0.48) one slot per notch, whatever the wheel. An ordinary wheel sends one big step a notch; touchpads,
      // high-resolution wheels and smooth scrolling (Linux) send a burst of small ones, which count once they add up
      // to most of a notch. Shift (sneaking) no longer turns the wheel sideways and loses it.
      // (0.9.0.50) timed by the game's own clock only: an event's own timestamp can come from another clock (on Linux
      // especially), and one stamped in the future held the wheel up, ignoring every notch until the clock caught up.
      const raw = e.deltaY || (e.shiftKey ? e.deltaX : 0);
      const dy = raw * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1), dir = Math.sign(dy);
      if (!dy) return;
      const now = performance.now();
      this.wheelSeen = (this.wheelSeen || 0) + 1;     // (for the F3 screen)
      // nothing remembered from the future (a clock that jumped): forget it
      if (!(this._wheelLock <= now)) this._wheelLock = -1e9;
      if (!(this._wheelT <= now)) this._wheelT = -1e9;
      const step = () => { this.s.wheel += dir; this._wheelAcc = 0; this._wheelLock = now; this._wheelDir = dir; this.wheelSteps = (this.wheelSteps || 0) + 1; };
      // (0.9.0.54) big and small events go through the same bursts: a notch that arrives as two big pieces (a
      // high-resolution wheel at a low frame rate) steps once, not twice
      const big = Math.abs(dy) >= 40;
      // a pause (or a change of direction) starts a new notch, which counts as soon as most of a notch has added up
      // (an ordinary wheel's one big event a notch counts at once); after that, only a whole notch more steps again (so
      // turning slowly through one notch is one slot), however long it takes. How much a notch adds up to is learnt from
      // this wheel's own bursts. A half notch is kept a moment.
      const gap = now - this._wheelT; this._wheelT = now;
      if (dir !== this._wheelSd || gap > 40) {
        // the burst before, if it stood well apart from the others, was one notch: that's how big a notch is here
        const Bp = this._burst;
        if (Bp && Bp.sum >= 45 && Bp.t1 - Bp.t0 < 250 && Bp.before > 120 && gap > 120) {
          const H = this._notchH || (this._notchH = []); H.push(Bp.sum); if (H.length > 8) H.shift();
          const so = H.slice().sort((a, b) => a - b); this._notch = Math.max(45, Math.min(160, so[so.length >> 1]));
          try { localStorage.setItem('dokuquest.wheelNotch', String(Math.round(this._notch))); } catch (er) { /* private mode */ }
        }
        this._burst = { t0: now, t1: now, sum: 0, steps: 0, before: gap, dir };
      }
      const Bu = this._burst; Bu.t1 = now; Bu.sum += Math.abs(dy);
      if (dir !== this._wheelSd || gap > 250) this._wheelAcc = 0;
      this._wheelSd = dir;
      this._wheelAcc = (this._wheelAcc || 0) + dy;
      if (this._notch === undefined) { let v = 0; try { v = +localStorage.getItem('dokuquest.wheelNotch') || 0; } catch (er) { v = 0; } this._notch = v >= 20 && v <= 160 ? v : 0; }
      const N = this._notch || (big ? Math.max(90, Math.abs(dy)) : 90);
      // a fresh notch: nothing stepped in this burst, nor in the last quarter second (pieces of one notch turned slowly
      // come a little apart, and count together)
      if (!Bu.steps && now - this._wheelLock > 250) {
        // the first of a notch: an ordinary wheel's big event at once (unless it's a doubled event from some drivers)
        if (big ? !(now - this._wheelLock < 25 && dir === this._wheelDir) : Math.abs(this._wheelAcc) >= Math.min(45, N * 0.8)) { step(); Bu.steps++; }
        else if (!big) {
          // (0.9.0.54) a lone small notch that never adds up to the usual amount (a slow wheel, a low scroll speed) still
          // counts once it's over, if it stood on its own
          clearTimeout(this._wheelTimer);
          this._wheelTimer = setTimeout(() => {
            const B2 = this._burst;
            if (B2 === Bu && !B2.steps && B2.before > 250 && B2.sum >= 24 && performance.now() - B2.t1 >= 60 && this.enabled) {
              this.s.wheel += B2.dir; this._wheelAcc = 0; this._wheelLock = performance.now(); this._wheelDir = B2.dir; this.wheelSteps = (this.wheelSteps || 0) + 1; B2.steps++;
              // and that's how big a notch is on this wheel, so turning it steadily counts every notch too
              const H = this._notchH || (this._notchH = []); H.push(B2.sum); if (H.length > 8) H.shift();
              const so = H.slice().sort((a, b) => a - b); this._notch = Math.max(20, Math.min(160, so[so.length >> 1]));
              try { localStorage.setItem('dokuquest.wheelNotch', String(Math.round(this._notch))); } catch (er) { /* private mode */ }
            }
          }, 90);
        }
      } else if (Math.abs(this._wheelAcc) >= N * 0.9 && now - this._wheelLock >= 30) { step(); Bu.steps++; }
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
