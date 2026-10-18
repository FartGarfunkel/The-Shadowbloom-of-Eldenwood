// ---------------------------------------------------------------------------
// ui/uiscale.js — (alpha 6) the interface at any size.
//
// Settings → Interface size is a slider now, from 50% to 200%, and it sizes everything that isn't the world: the
// hotbar and health, the quest tracker, toasts, the inventory and every window in the game, conversations, the story's
// pages, the journal, the map, and all the menus. (It used to be three presets that only touched the hotbar.) Ctrl and
// + / − change it anywhere, Ctrl+0 puts it back to 100%. Behind it: CSS zoom on each piece of interface, and everything
// placed in screen pixels by the game (names over heads, damage numbers, the item under your cursor, the map's pins)
// is put back into the interface's own pixels.
// ---------------------------------------------------------------------------
const UIZ = { v: 1 };
function uiZoom() { return UIZ.v; }
function uiZoomApply(g) {
  const s = g && g.settings; if (!s) return;
  // the old presets become the slider's value once, and stop scaling the hotbar on their own
  if (s.uiScale == null || !isFinite(Number(s.uiScale))) { s.uiScale = { small: 0.85, large: 1.2 }[s.guiScale] || 1; s.guiScale = 'auto'; }
  if (s.guiScale !== 'auto') s.guiScale = 'auto';
  const v = Math.max(0.5, Math.min(2, Number(s.uiScale) || 1));
  if (v === UIZ.v && document.documentElement.style.getPropertyValue('--uiz')) return;
  UIZ.v = v;
  document.documentElement.style.setProperty('--uiz', String(v));
  try { for (const l of g.locals || []) { if (l.hud && l.hud.layout) l.hud.layout(); if (l.inv && l.inv.layout && l.inv.mode) l.inv.layout(); } } catch (e) { /* laid out on the next resize */ }
}
{
  const baseLight = Game.prototype.applySettingsLight;
  Game.prototype.applySettingsLight = function () { const r = baseLight.call(this); try { uiZoomApply(this); } catch (e) { console.warn('ui scale', e); } return r; };
  // the layouts that fit things to a player's slice of the screen fit them to that slice at the interface's size
  const scaled = (lp, fn) => { const z = uiZoom(); if (z === 1 || !lp || !lp.view) return fn(); const v = lp.view; lp.view = Object.assign({}, v, { w: v.w / z, h: v.h / z }); try { return fn(); } finally { lp.view = v; } };
  const baseHud = Hud.prototype.layout;
  Hud.prototype.layout = function () { return scaled(this.lp, () => baseHud.call(this)); };
  const baseInv = InvUI.prototype.layout;
  InvUI.prototype.layout = function () { return scaled(this.lp, () => baseInv.call(this)); };
  // a point in the world, on screen, in the interface's pixels (names over heads, damage numbers)
  const baseProj = Hud.prototype.project;
  Hud.prototype.project = function (...a) { const s = baseProj.apply(this, a); const z = uiZoom(); return s && z !== 1 ? [s[0] / z, s[1] / z] : s; };
  // Ctrl and + / − / 0, anywhere
  window.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const g = typeof GAME !== 'undefined' && GAME ? GAME : window.__game; if (!g || !g.settings) return;
    let v = Number(g.settings.uiScale) || 1;
    if (e.code === 'Equal' || e.code === 'NumpadAdd') v += 0.1;
    else if (e.code === 'Minus' || e.code === 'NumpadSubtract') v -= 0.1;
    else if (e.code === 'Digit0' || e.code === 'Numpad0') v = 1;
    else return;
    e.preventDefault(); e.stopPropagation();
    g.settings.uiScale = Math.round(Math.max(0.5, Math.min(2, v)) * 20) / 20;
    g.applySettings();
    const sl = document.getElementById('set-uiScale'); if (sl) { sl.value = g.settings.uiScale; const o = sl.parentNode.querySelector('output'); if (o) o.textContent = Math.round(g.settings.uiScale * 100) + '%'; }
    const msg = `Interface size ${Math.round(g.settings.uiScale * 100)}%`;
    if (g.locals && g.locals.length && g.locals[0].toast) g.locals[0].toast(msg, ''); else uiScaleNote(msg);
  }, true);
}
// a brief note when there's no game to toast in (the menus)
function uiScaleNote(msg) {
  let el = document.getElementById('uiz-note');
  if (!el) { el = document.createElement('div'); el.id = 'uiz-note'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('on');
  clearTimeout(uiScaleNote.t); uiScaleNote.t = setTimeout(() => el.classList.remove('on'), 1400);
}
