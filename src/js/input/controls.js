// ---------------------------------------------------------------------------
// input/controls.js — Settings → Controls: change what every key, mouse
// button and controller button does. Click a key box and press the new key
// (Backspace clears it, Esc cancels); click a controller box and press the
// new button on the pad. Clashes show in red. Saved with the settings.
// ---------------------------------------------------------------------------

function keyName(code) {
  if (!code) return '—';
  const M = { Mouse0: 'Left click', Mouse1: 'Middle click', Mouse2: 'Right click', Mouse3: 'Mouse Back', Mouse4: 'Mouse Forward', Space: 'Space', ShiftLeft: 'L Shift', ShiftRight: 'R Shift',
    ControlLeft: 'L Ctrl', ControlRight: 'R Ctrl', AltLeft: 'L Alt', AltRight: 'R Alt', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', NumpadEnter: 'Num Enter',
    Slash: '/', Backslash: '\\', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Backquote: '`', Tab: 'Tab', CapsLock: 'Caps Lock' };
  if (M[code]) return M[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad\d$/.test(code)) return 'Num ' + code.slice(6);
  return code;
}

// settings changes reach the input handlers
{
  const base = Game.prototype.applySettingsLight;
  Game.prototype.applySettingsLight = function () {
    base.call(this);
    if (this.input) this.input.binds = keyBinds(this.settings.keyBinds);
    if (this.pads) this.pads.binds = null;
  };
}

UI.prototype.controlsRow = function () {
  const row = document.createElement('div'); row.className = 'setting pack-setting';
  row.innerHTML = `<label>Controls</label><span class="pack-btns"><button class="btn tiny" data-controls>Change controls…</button></span><span class="desc">Choose the key, mouse button or controller button for every action.</span>`;
  row.querySelector('[data-controls]').onclick = () => this.buildControls();
  return row;
};

UI.prototype.buildControls = function () {
  const g = this.g, S = g.settings, box = $('#settings-grid');
  const kb = keyBinds(S.keyBinds), pb = padBinds(S.padBinds);
  box.innerHTML = '';
  const top = document.createElement('div'); top.className = 'ctl-top';
  top.innerHTML = `<button class="btn tiny" data-back>‹ Back to settings</button><button class="btn tiny ghost" data-reset>Reset all to default</button>`;
  box.appendChild(top);
  top.querySelector('[data-back]').onclick = () => this.buildSettings();
  top.querySelector('[data-reset]').onclick = () => { S.keyBinds = null; S.padBinds = null; g.applySettings(); this.buildControls(); };
  // which codes / buttons are used more than once
  const kUse = {}, pUse = {};
  for (const id in kb) for (const c of kb[id]) (kUse[c] = kUse[c] || []).push(id);
  for (const id in pb) for (const c of pb[id]) (pUse[c] = pUse[c] || []).push(id);
  const table = document.createElement('div'); table.className = 'ctl-table';
  table.innerHTML = '<div class="ctl-h">Action</div><div class="ctl-h">Keyboard & mouse</div><div class="ctl-h">Controller</div>';
  const padRows = new Map(PAD_ACTIONS.map(a => [a[0], a]));
  const ids = KEY_ACTIONS.map(a => a[0]);
  for (const a of PAD_ACTIONS) if (!ids.includes(a[0])) ids.push(a[0]);
  for (const id of ids) {
    const ka = KEY_ACTIONS.find(a => a[0] === id), pa = padRows.get(id);
    const label = (ka || pa)[1];
    const lab = document.createElement('div'); lab.className = 'ctl-label'; lab.textContent = label;
    table.appendChild(lab);
    // keyboard cell
    const kc = document.createElement('button'); kc.className = 'btn tiny ghost ctl-key';
    if (ka) {
      const codes = kb[id] || [];
      kc.textContent = codes.length ? codes.map(keyName).join(' / ') : '—';
      if (codes.some(c => kUse[c].length > 1 && !(id.startsWith('slot') && false))) kc.classList.add('clash');
      kc.onclick = () => this.captureKey(id, kc);
    } else { kc.disabled = true; kc.textContent = ''; }
    table.appendChild(kc);
    // controller cell
    const pc = document.createElement('button'); pc.className = 'btn tiny ghost ctl-key';
    if (pa) {
      const ks = pb[id] || [];
      pc.textContent = ks.length ? ks.map(k => PAD_BUTTON_NAMES[k] || ('Button ' + k)).join(' / ') : '—';
      if (ks.some(k => pUse[k].length > 1)) pc.classList.add('clash');
      pc.onclick = () => this.capturePad(id, pc);
    } else { pc.disabled = true; pc.textContent = ''; }
    table.appendChild(pc);
  }
  box.appendChild(table);
  const note = document.createElement('p'); note.className = 'desc ctl-note';
  note.textContent = 'Esc always pauses and can’t be changed. Red means two actions share a key: both will happen. On a controller, tap sneak twice to crawl. A controller with mixed-up buttons? Set it up first (Settings → Controller), then change actions here.';
  box.appendChild(note);
  this.setFocus(top.querySelector('[data-back]'));
};

UI.prototype.captureKey = function (id, cell) {
  const g = this.g, inp = g.input;
  cell.textContent = 'Press a key… (Backspace clears, Esc cancels)'; cell.classList.add('listening');
  const done = (code) => {
    inp.capture = null; window.removeEventListener('mousedown', onMouse, true);
    if (code === 'Escape') { this.buildControls(); return; }
    const kb = Object.assign({}, g.settings.keyBinds || {});
    kb[id] = code === 'Backspace' || code === 'Delete' ? [] : [code];
    g.settings.keyBinds = kb; g.applySettings(); this.buildControls();
  };
  const onMouse = (e) => { if (e.target === cell) return; e.preventDefault(); e.stopPropagation(); done('Mouse' + e.button); };
  setTimeout(() => { inp.capture = (code) => done(code); window.addEventListener('mousedown', onMouse, true); }, 50);
};

UI.prototype.capturePad = function (id, cell) {
  const g = this.g, pads = g.pads;
  cell.textContent = 'Press a button on the controller…'; cell.classList.add('listening');
  pads.setupActive = true;
  const prev = new Map();
  for (const pad of pads.list()) prev.set(pad.index, padLayout(pad, false).b);
  const t0 = performance.now();
  const tick = () => {
    if (performance.now() - t0 > 10000) { pads.setupActive = false; this.buildControls(); return; }
    for (const pad of pads.list()) {
      const b = padLayout(pad, false).b, was = prev.get(pad.index) || [];
      const k = b.findIndex((v, i) => v && !was[i] && i < 16);
      prev.set(pad.index, b);
      if (k >= 0) {
        const pb = Object.assign({}, g.settings.padBinds || {});
        pb[id] = [k];
        g.settings.padBinds = pb; g.applySettings();
        setTimeout(() => { pads.setupActive = false; this.buildControls(); }, 250);   // let go before the menu reads it
        return;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
