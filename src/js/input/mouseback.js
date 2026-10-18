// ---------------------------------------------------------------------------
// input/mouseback.js — (alpha 5) the mouse's side buttons never take you out of the game.
//
// The back button on a mouse is the browser's Back: in a browser tab it left the game, and in the desktop app it went
// back to the launcher, both without saving. Now neither side button navigates anywhere. Back works like Esc does in
// the game's own screens and windows (closes the inventory, a conversation, the map, a settings page; from the pause
// menu, back to the game) and does nothing at all while you're simply playing, unless you give it an action in
// Settings → Controls, where both side buttons can be bound ("Mouse Back" and "Mouse Forward").
// A keyboard's Alt+Left, or anything else that asks the page to go back, is caught too.
// ---------------------------------------------------------------------------
{
  const SIDE = (e) => e.button === 3 || e.button === 4;
  // nothing open: the button is only what Controls says it is
  const plainPlay = () => {
    const g = typeof GAME !== 'undefined' && GAME ? GAME : window.__game;
    if (!g) return false;
    if (g.state !== 'playing') return false;
    if (typeof CAMP_RT !== 'undefined' && CAMP_RT.narrating && CAMP_RT.narrating.el && CAMP_RT.narrating.el.isConnected) return false;
    return (g.locals || []).every(l => l.mode === 'play' && !l.npcUI && !l.journalEl && !l.dndSheetEl);
  };
  const escape = () => {
    const t = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body;
    for (const type of ['keydown', 'keyup']) t.dispatchEvent(new KeyboardEvent(type, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
  };
  const block = (e) => { if (!SIDE(e)) return; e.preventDefault(); };
  window.addEventListener('mousedown', block, true);
  window.addEventListener('pointerup', block, true);
  window.addEventListener('auxclick', block, true);
  window.addEventListener('mouseup', (e) => {
    if (!SIDE(e)) return;
    e.preventDefault();
    const g = typeof GAME !== 'undefined' && GAME ? GAME : window.__game;
    if (g && g.input && g.input.capture) return;          // Settings → Controls is listening for a button
    if (e.button === 3 && !plainPlay()) escape();
  }, true);
  // and the page's own history: one step of it is kept in hand, so "back" lands on the game again
  try {
    history.pushState({ sbStay: 1 }, '');
    window.addEventListener('popstate', () => { try { history.pushState({ sbStay: 1 }, ''); } catch (e) { /* not allowed here */ } });
  } catch (e) { /* not allowed here (some sandboxes) */ }
}
