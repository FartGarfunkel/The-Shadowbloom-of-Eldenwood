// ---------------------------------------------------------------------------
// input/gamepad.js — controllers (standard mapping: Xbox / PlayStation /
// Switch Pro / most USB pads). Each pad produces the same input state the
// keyboard does, so a pad can drive any local player.
//
//   Left stick  move (click = sprint)     Right stick  look
//   RT  mine / attack    LT  use / place    LB / RB  hotbar
//   A  jump    B  sneak    X  drop    Y  inventory
//   D-pad left/right  hotbar   D-pad down  swap hands   Start  pause / join
// In menus and the inventory: d-pad or stick moves, A selects, B goes back.
// ---------------------------------------------------------------------------

const PAD_DEAD = 0.17;

// What each controller button does (standard layout numbers; Settings → Controls changes these).
//  0 A/bottom  1 B/right  2 X/left  3 Y/top  4 LB  5 RB  6 LT  7 RT  8 Back/Select  9 Start
// 10 L3  11 R3  12 d-pad up  13 down  14 left  15 right
const PAD_ACTIONS = [
  ['jump', 'Jump / climb', [0]], ['sneak', 'Sneak (tap twice: crawl)', [1]], ['sprint', 'Sprint', [10]],
  ['attack', 'Attack / mine', [7]], ['use', 'Use / place', [6]], ['pick', 'Pick block', [11]],
  ['inventory', 'Inventory', [3]], ['drop', 'Drop item', [2]], ['swap', 'Swap hands', [13]], ['place', 'Placing mode (slabs, stairs)', [12]],
  ['prev', 'Hotbar left', [4, 14]], ['next', 'Hotbar right', [5, 15]],
  ['view', 'Camera (hold: swap shoulder)', [8]], ['pause', 'Pause', [9]],
];
const PAD_BUTTON_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Back', 'Start', 'L3', 'R3', 'D-pad ↑', 'D-pad ↓', 'D-pad ←', 'D-pad →'];
function padBinds(custom) {
  const out = {};
  for (const [id, , d] of PAD_ACTIONS) out[id] = (custom && Array.isArray(custom[id])) ? custom[id] : d;
  return out;
}

// Every browser should hand us the "standard" layout, but some (Firefox on Linux and macOS,
// older DirectInput pads) don't. Rebuild it from the raw buttons and axes so any pad works.
function padLayout(pad, swapNintendo) {
  const raw = pad.buttons.map(x => !!x && (x.pressed || x.value > 0.5));
  let b = raw, ax = (pad.axes || []).slice();
  if (pad.mapping !== 'standard' && raw.length < 16) {
    const id = (pad.id || '').toLowerCase();
    const ps = /054c|playstation|dualshock|dualsense|wireless controller/.test(id);
    b = new Array(17).fill(false);
    if (ps) { [b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9], b[16], b[10], b[11]] = [raw[0], raw[1], raw[3], raw[2], raw[4], raw[5], raw[6], raw[7], raw[8], raw[9], raw[10], raw[11], raw[12]]; }
    else { [b[0], b[1], b[2], b[3], b[4], b[5], b[8], b[9], b[16], b[10], b[11]] = [raw[0], raw[1], raw[2], raw[3], raw[4], raw[5], raw[6], raw[7], raw[8], raw[9], raw[10]]; }
    // triggers and the right stick often arrive as axes: LX LY LT RX RY RT (dpad X Y)
    if (ax.length >= 6) { b[6] = b[6] || ax[2] > 0.2; b[7] = b[7] || ax[5] > 0.2; ax = [ax[0], ax[1], ax[3], ax[4], ...ax.slice(6)]; }
    const dx = ax.length >= 6 ? ax[4] : undefined, dy = ax.length >= 6 ? ax[5] : undefined;
    if (dx !== undefined) { b[14] = dx < -0.5; b[15] = dx > 0.5; b[12] = dy < -0.5; b[13] = dy > 0.5; }
    // a single "hat" axis (some DirectInput pads): -1 up, going clockwise in steps of 2/7
    const hat = pad.axes.length > 9 ? pad.axes[9] : undefined;
    if (hat !== undefined && hat >= -1.01 && hat <= 1.01 && Math.abs(hat) > 0.01 && hat < 1.2) {
      const k = Math.round((hat + 1) / (2 / 7));
      b[12] = k === 0 || k === 1 || k === 7; b[15] = k >= 1 && k <= 3; b[13] = k >= 3 && k <= 5; b[14] = k >= 5 && k <= 7;
    }
  }
  if (swapNintendo) { b = b.slice(); [b[0], b[1]] = [b[1], b[0]]; [b[2], b[3]] = [b[3], b[2]]; }
  return { b, ax };
}

class Gamepads {
  constructor(game) {
    this.g = game;
    this.prev = new Map();     // pad index -> previous button states
    this.st = new Map();       // pad index -> input state for this frame
    this.nav = new Map();      // pad index -> stick-repeat timers
    this.sprint = new Map();   // pad index -> sprint latched by stick click
    this.events = [];          // menu events this frame
    this.sneakTap = new Map(); this.viewHold = new Map();
    this.known = new Set();
    window.addEventListener('gamepadconnected', (e) => this.onConnect(e.gamepad));
    window.addEventListener('gamepaddisconnected', (e) => this.onDisconnect(e.gamepad));
  }
  list() {
    let pads = [];
    try { pads = navigator.getGamepads ? [...navigator.getGamepads()] : []; } catch (e) { pads = []; }
    return pads.filter(p => p && p.connected !== false);
  }
  connected() { return this.list().map(p => p.index); }
  state(i) { return this.st.get(i) || null; }
  menuEvents() { return this.events; }
  endFrame() { this.events = []; }
  onConnect(pad) {
    if (this.known.has(pad.index)) return;
    this.known.add(pad.index);
    const g = this.g;
    if (g.state === 'playing' && g.local) {
      const owned = g.locals.some(l => l.pads.has(pad.index));
      if (!owned) g.local.toast(g.local.pads.size ? 'Controller connected — press Start on it to join' : 'Controller connected — press A to play with it, or Start to join as a new player', 'good');
    }
  }
  onDisconnect(pad) {
    this.known.delete(pad.index);
    const g = this.g;
    for (const l of g.locals) if (l.pads.delete(pad.index)) l.toast('Controller disconnected', 'warn');
    this.st.delete(pad.index); this.prev.delete(pad.index);
  }
  rumble(lp, strength = 0.4, ms = 120) {
    for (const i of lp.pads) {
      const pad = this.list().find(p => p.index === i);
      const act = pad && pad.vibrationActuator;
      if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 }).catch(() => {});
    }
  }

  poll(dt) {
    const g = this.g, S = g.settings;
    this.st.clear();
    for (const pad of this.list()) {
      const i = pad.index;
      if (!this.known.has(i)) this.onConnect(pad);
      const { b, ax } = padLayout(pad, S.padLayout === 'nintendo');
      const prev = this.prev.get(i) || [];
      const edge = (k) => !!b[k] && !prev[k];
      const stick = (x, y) => { const m = Math.hypot(x || 0, y || 0); if (m < PAD_DEAD) return [0, 0]; const k = Math.min(1, (m - PAD_DEAD) / (1 - PAD_DEAD)) / m; return [x * k, y * k]; };
      const [lx, ly] = stick(ax[0], ax[1]), [rx, ry] = stick(ax[2], ax[3]);
      const s = InputManager.blankState();
      s.fromPad = true;
      s.mx = lx; s.mz = ly;
      const sens = (S.padSens || 1) * 2.8 * dt;
      s.lookX = rx * Math.abs(rx) * sens * 1.15;
      s.lookY = ry * Math.abs(ry) * sens * (S.invertY ? -1 : 1);
      if ((this.binds || (this.binds = padBinds(S.padBinds))).sprint.some(k => edge(k))) this.sprint.set(i, !this.sprint.get(i));
      if (Math.hypot(lx, ly) < 0.3) this.sprint.set(i, false);
      s.sprint = !!this.sprint.get(i);
      const PB = this.binds || (this.binds = padBinds(S.padBinds));
      const on = (act) => PB[act].some(k => !!b[k]), hit = (act) => PB[act].some(k => edge(k));
      s.jump = on('jump'); s.sneak = on('sneak');
      s.attack = on('attack'); s.attackPressed = hit('attack');
      s.use = on('use'); s.usePressed = hit('use');
      s.wheel = (hit('next') ? 1 : 0) - (hit('prev') ? 1 : 0);
      s.drop = hit('drop'); s.inventory = hit('inventory'); s.swap = hit('swap'); s.pause = hit('pause'); s.place = hit('place'); s.pick = hit('pick');
      // sneak tapped twice quickly: crawl
      if (hit('sneak')) { const now = performance.now(), last = this.sneakTap.get(i) || 0; if (now - last < 320) s.crawl = true; this.sneakTap.set(i, now); }
      // camera: tap to change view, hold to swap shoulders
      const vt = this.viewHold.get(i) || 0;
      if (on('view')) { this.viewHold.set(i, vt + dt); if (vt < 0.45 && vt + dt >= 0.45) s.shoulder = true; }
      else { if (vt > 0 && vt < 0.45) s.view = true; this.viewHold.set(i, 0); }
      s.padA = edge(0); s.padB = edge(1); s.padX = edge(2); s.padY = edge(3); s.padLB = edge(4); s.padRB = edge(5); s.padStart = edge(9);
      // navigation: d-pad edges, or the left stick with key-repeat
      let nx = (edge(15) ? 1 : 0) - (edge(14) ? 1 : 0), ny = (edge(13) ? 1 : 0) - (edge(12) ? 1 : 0);
      const n = this.nav.get(i) || { t: 0, dir: '' };
      const sx = Math.abs(lx) > 0.6 ? Math.sign(lx) : 0, sy = Math.abs(ly) > 0.6 ? Math.sign(ly) : 0;
      const dir = sx + ',' + sy;
      if ((sx || sy) && !nx && !ny) {
        if (dir !== n.dir) { n.dir = dir; n.t = 0.38; nx = sx; ny = Math.abs(sx) ? 0 : sy; }
        else { n.t -= dt; if (n.t <= 0) { n.t = 0.11; nx = sx; ny = Math.abs(sx) ? 0 : sy; } }
      } else if (!sx && !sy) n.dir = '';
      this.nav.set(i, n);
      s.navX = nx; s.navY = ny;
      this.st.set(i, s);
      this.prev.set(i, b);
      // menu events
      if (nx || ny) this.events.push({ pad: i, type: 'move', dx: nx, dy: ny });
      if (s.padA) this.events.push({ pad: i, type: 'ok' });
      if (s.padB) this.events.push({ pad: i, type: 'back' });
      if (s.padStart) this.events.push({ pad: i, type: 'start' });
      if (s.padLB || s.padRB) this.events.push({ pad: i, type: 'tab', dir: s.padRB ? 1 : -1 });
      this.claim(i, s);
    }
  }
  // A pad nobody owns: A hands it to a lone keyboard player, Start joins a new player.
  claim(i, s) {
    const g = this.g;
    if (g.state !== 'playing' || !g.locals.length || g.locals.some(l => l.pads.has(i))) return;
    if (s.padStart) {
      s.pause = false;
      const lp = g.addLocal(i);
      if (!lp) g.local.toast('Four players is the most that fit on one screen', 'warn');
      return;
    }
    if (s.padA && g.locals.length === 1 && !g.local.pads.size) { g.local.pads.add(i); g.local.toast('Controller ready', 'good'); }
  }
}
