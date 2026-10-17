// ---------------------------------------------------------------------------
// dnd/dice.js — rolling dice, and showing the roll.
//
//   dndRoll(n, d)                         → { total, rolls }
//   dndD20({ mod, adv, dis, lucky })      → { roll, rolls, total, nat20, nat1 }
//   dndRollShow(el, opts)                 → Promise: a d20 tumbles in the player's view and lands
//   dndFloat(el, text, cls)               → a short line that rises from the crosshair (hits, misses, damage)
//
// Rolls are made where the game state lives (the host); guests are shown the result.
// ---------------------------------------------------------------------------

function dndDie(d) { return 1 + Math.floor(Math.random() * d); }
function dndRoll(n, d, plus = 0) { const rolls = []; let total = plus; for (let i = 0; i < n; i++) { const r = dndDie(d); rolls.push(r); total += r; } return { total, rolls }; }
function dndRollMax(n, d, plus = 0) { return n * d + plus; }
function dndD20(o = {}) {
  const one = () => { let r = dndDie(20); if (r === 1 && o.lucky) r = dndDie(20); return r; };
  const a = one(), b = (o.adv || o.dis) && !(o.adv && o.dis) ? one() : null;
  const roll = b == null ? a : o.adv ? Math.max(a, b) : Math.min(a, b);
  const mod = o.mod || 0, bonus = o.bonus || 0;
  return { roll, rolls: b == null ? [a] : [a, b], mod, bonus, total: roll + mod + bonus, nat20: roll === 20, nat1: roll === 1, adv: !!o.adv && !o.dis, dis: !!o.dis && !o.adv };
}
function dndDiceText(n, d, plus) { return `${n}d${d}${plus ? (plus > 0 ? ' + ' + plus : ' − ' + (-plus)) : ''}`; }

// ---- the big roll: a die in the middle of the view, for checks and saves ----
// opts: { label, ab, mod, dc, adv, dis, result (a dndD20 result, or made here), sub, onDone }
function dndRollShow(el, opts = {}) {
  return new Promise((resolve) => {
    const res = opts.result || dndD20({ mod: opts.mod, adv: opts.adv, dis: opts.dis, lucky: opts.lucky, bonus: opts.bonus });
    if (!el) { resolve(res); return; }
    const box = document.createElement('div');
    box.className = 'dnd-roll';
    const ok = opts.dc == null ? null : (res.nat20 || (res.total >= opts.dc && !res.nat1));
    box.innerHTML = `<div class="dnd-roll-label"></div><div class="dnd-die"><svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,4 93,28 93,72 50,96 7,72 7,28" class="d20-out"/><polygon points="50,22 78,66 22,66" class="d20-in"/><line x1="50" y1="4" x2="50" y2="22"/><line x1="93" y1="28" x2="78" y2="66"/><line x1="7" y1="28" x2="22" y2="66"/><line x1="93" y1="72" x2="78" y2="66"/><line x1="7" y1="72" x2="22" y2="66"/><line x1="50" y1="96" x2="50" y2="66"/></svg><span class="dnd-die-n">?</span></div><div class="dnd-roll-sum"></div><div class="dnd-roll-out"></div>`;
    box.querySelector('.dnd-roll-label').textContent = opts.label || 'Roll';
    el.appendChild(box);
    const nEl = box.querySelector('.dnd-die-n'), sum = box.querySelector('.dnd-roll-sum'), out = box.querySelector('.dnd-roll-out'), die = box.querySelector('.dnd-die');
    let t = 0; const steps = 11;
    const tick = () => {
      t++;
      if (t < steps) { nEl.textContent = String(dndDie(20)); die.style.transform = `rotate(${(Math.random() - 0.5) * 50}deg) scale(${0.9 + Math.random() * 0.2})`; setTimeout(tick, 45 + t * 9); return; }
      die.style.transform = '';
      nEl.textContent = String(res.roll);
      if (res.nat20) box.classList.add('crit'); else if (res.nat1) box.classList.add('fumble');
      const parts = [];
      if (res.rolls.length > 1) parts.push(`<span class="dnd-two">${res.rolls.join(' / ')} ${res.adv ? 'advantage' : 'disadvantage'}</span>`);
      parts.push(`${res.roll} ${dndSigned(res.mod || 0)}${res.bonus ? ' ' + dndSigned(res.bonus) : ''} = <b>${res.total}</b>`);
      if (opts.dc != null) parts.push(`<span class="dnd-dc">DC ${opts.dc}</span>`);
      sum.innerHTML = parts.join(' ');
      if (ok != null) { out.textContent = res.nat20 ? 'Critical success!' : res.nat1 ? 'Critical failure' : ok ? 'Success' : 'Failure'; out.className = 'dnd-roll-out ' + (ok ? 'good' : 'bad'); }
      else if (opts.sub) out.textContent = opts.sub;
      if (typeof dndSound === 'function') dndSound(ok === false ? 'fail' : res.nat20 ? 'crit' : 'land');
      setTimeout(() => { box.classList.add('gone'); setTimeout(() => box.remove(), 350); resolve(Object.assign(res, { ok })); if (opts.onDone) opts.onDone(res); }, opts.hold || 1300);
    };
    if (typeof dndSound === 'function') dndSound('roll');
    tick();
  });
}

// ---- the small floating lines near the crosshair ----
function dndFloat(el, text, cls = '') {
  if (!el) return;
  const f = document.createElement('div');
  f.className = 'dnd-float ' + cls;
  f.textContent = text;
  f.style.left = (50 + (Math.random() - 0.5) * 8) + '%';
  el.appendChild(f);
  setTimeout(() => f.remove(), 1400);
}

// a tiny synthesised clatter for the dice (no sound files)
let DND_AC = null;
function dndSound(kind) {
  try {
    const ctx = (typeof SND !== 'undefined' && SND.ctx) || DND_AC || (DND_AC = new (window.AudioContext || window.webkitAudioContext)());
    const now = ctx.currentTime, out = ctx.createGain(); out.gain.value = 0.18; out.connect(ctx.destination);
    const click = (t, f, len, v) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, now + t); o.frequency.exponentialRampToValueAtTime(f * 0.6, now + t + len); g.gain.setValueAtTime(v, now + t); g.gain.exponentialRampToValueAtTime(0.001, now + t + len); o.connect(g); g.connect(out); o.start(now + t); o.stop(now + t + len + 0.02); };
    if (kind === 'roll') for (let i = 0; i < 9; i++) click(i * 0.06 + Math.random() * 0.03, 900 + Math.random() * 900, 0.04, 0.5);
    else if (kind === 'land') { click(0, 520, 0.12, 0.8); click(0.05, 780, 0.1, 0.4); }
    else if (kind === 'crit') { [523, 659, 784, 1047].forEach((f, i) => click(i * 0.08, f, 0.25, 0.6)); }
    else if (kind === 'fail') { click(0, 220, 0.3, 0.7); click(0.12, 180, 0.35, 0.5); }
    else if (kind === 'level') { [392, 523, 659, 784, 1047].forEach((f, i) => click(i * 0.11, f, 0.4, 0.55)); }
  } catch (e) { /* no audio */ }
}
