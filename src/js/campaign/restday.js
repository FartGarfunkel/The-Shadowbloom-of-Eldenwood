// ---------------------------------------------------------------------------
// campaign/restday.js — (alpha 3) the day ends when the party rests.
//
// Like the end of a session at the table: in a campaign world the clock runs as usual through the day, but late in the
// evening (between dusk and midnight) it stops, and the night holds — monsters still about — until the party rests.
// A bed, a room at an inn, or making camp where you stand (your sheet, P) takes everyone to morning, with a long rest.
// In split screen and online it waits for the whole party; if most of the party has turned in, the rest follow after a
// short wait (a majority vote). The story's dreams and visions come on that rest, so every night is a story beat.
//
// The world option "The day ends when you rest" (on by default for campaign worlds) can be turned off for the usual cycle.
// ---------------------------------------------------------------------------

const REST_HOLD = 0.65;        // ≈ half past nine in the evening (0 = six in the morning, 0.5 = six at night, 0.75 = midnight)
const REST_VOTE_WAIT = 20;     // seconds the rest of the party gets once most of it has turned in
const REST_REMIND = 150;       // seconds between reminders while the night holds

RULE_DEFAULTS.restEndsDay = true;   // (campaign worlds only)
RULE_TOGGLES.splice(1, 0, ['restEndsDay', 'The day ends when you rest', 'Campaign worlds: the clock stops late in the evening until the party rests, like the end of a session. Off: the usual day and night']);

Object.assign(Game.prototype, {
  // on for campaign worlds unless someone turned it off
  restDayOn() {
    const m = this.meta; if (!m) return false;
    const r = this.rules();
    return !!m.campaign && r.restEndsDay !== false && r.daylightCycle !== false;
  },
  lateHeld() { return !!this._lateHold; },
  // everyone in the party, wherever they are: [{ name, asleep, local? }]
  restParty() {
    const out = [];
    for (const l of this.locals) if (!l.dead) out.push({ name: l.name, asleep: !!l.sleeping, local: l });
    if (this.net && !this.isGuest) for (const r of this.net.remotes.values()) if (r.placed && !r.dead) out.push({ name: r.name, asleep: !!(r.st && r.st.pose && r.st.pose.sleep) });
    return out;
  },
});

{
  const baseAdvance = Game.prototype.advanceTime;
  Game.prototype.advanceTime = function (dt) {
    if (!this.restDayOn() || !this.meta) { this._lateHold = false; return baseAdvance.call(this, dt); }
    const before = this.meta.time / DAY_LEN;
    if (before >= REST_HOLD && before < 0.985) { restHolding(this, dt); return; }
    baseAdvance.call(this, dt);
    const after = this.meta.time / DAY_LEN;
    if (before < REST_HOLD && after >= REST_HOLD && after < 0.985) { this.meta.time = REST_HOLD * DAY_LEN; restHolding(this, 0); }
    else this._lateHold = false;
  };
}

// the night holds: say so, now and then, and see whether the party has turned in
function restHolding(g, dt) {
  const first = !g._lateHold;
  g._lateHold = true;
  g._lateRemind = (g._lateRemind || 0) - dt;
  if (first || g._lateRemind <= 0) {
    g._lateRemind = REST_REMIND;
    {
      const msg = first ? 'It\'s getting late. The day ends when you rest: a bed, a room at the inn, or make camp (your sheet).' : 'The night holds. Rest to end the day: a bed, the inn, or make camp (your sheet).';
      for (const l of g.locals) l.toast(msg, '');
      if (first && g.sfx) try { g.sfx.play('bell' in (typeof SND_FX !== 'undefined' ? SND_FX : {}) ? 'bell' : 'click'); } catch (e) { /* no sound */ }
    }
  }
  if (!g.isGuest) restCheckParty(g, dt);
}

// the host (or a game without anyone over the network) decides when morning comes
function restCheckParty(g, dt) {
  if (g._restMorningT) return;
  const P = g.restParty(), n = P.length, asleep = P.filter(q => q.asleep).length;
  if (!n || !asleep) { g._restVote = null; return; }
  if (asleep === n) { g._restVote = null; restMorning(g); return; }
  // most of the party is resting: the others get a little while to join them
  if (asleep * 2 > n) {
    if (!g._restVote) {
      g._restVote = { t: REST_VOTE_WAIT };
      const awake = P.filter(q => !q.asleep).map(q => q.name).join(', ');
      for (const l of g.locals) l.toast(`${asleep} of ${n} are resting. Morning comes in ${REST_VOTE_WAIT} seconds unless ${awake} keep${P.filter(q => !q.asleep).length === 1 ? 's' : ''} watch.`, '');
      if (g.net) g.net.all({ t: 'adv', k: 'restvote', a: asleep, n, s: REST_VOTE_WAIT });
    }
    g._restVote.t -= dt;
    if (g._restVote.t <= 0) { g._restVote = null; restMorning(g); }
  } else g._restVote = null;
}

// morning: a fade, the clock to dawn, a new day, and a long rest for everyone
function restMorning(g) {
  if (g._restMorningT) return;
  g._restMorningT = 1;
  const fade = document.getElementById('fx-fade');
  if (fade) { fade.hidden = false; requestAnimationFrame(() => fade.classList.add('on')); }
  const day = (g.meta.day || 0) + 1;
  if (g.net && !g.isGuest) g.net.all({ t: 'adv', k: 'restmorning', day });
  setTimeout(() => {
    g._restMorningT = 0;
    g.meta.time = DAY_LEN * 0.02;
    g.meta.day = day;
    g._lateHold = false; g._lateRemind = 0;
    restWake(g);
    if (fade) { fade.classList.remove('on'); setTimeout(() => { fade.hidden = true; }, 400); }
    if (typeof g.saveSoon === 'function') g.saveSoon();
  }, 1800);
}
function restWake(g) {
  for (const l of g.locals) {
    const was = !!l.sleeping;
    l.sleeping = null;
    // a bed's long rest comes from dnd/rules.js when someone gets up in the morning; everyone else rests here
    if (typeof dndDoRest === 'function' && dndLive(l)) dndDoRest(l, 'long');
    else if (!was && l.player) l.player.health = l.player.maxHealth;
    l.toast(`Good morning. Day ${(g.meta.day || 0) + 1} begins.`, 'good');
    if (typeof dndHudDirty === 'function') dndHudDirty(l);
  }
}
// the bed's own long rest would come a second time on the same morning: once is enough
{
  const baseRest = dndDoRest;
  dndDoRest = function (lp, kind) {
    if (kind !== 'short' && lp) {
      const g = lp.g, day = g && g.meta ? g.meta.day || 0 : 0;
      if (lp._restDay === day && lp._restAt && Date.now() - lp._restAt < 10000) return true;
      const r = baseRest(lp, kind);
      if (r !== false) { lp._restDay = day; lp._restAt = Date.now(); }
      return r;
    }
    return baseRest(lp, kind);
  };
}

// beds: in a campaign world the party decides together (and a guest's bed waits for the host)
{
  const baseTry = Game.prototype.trySleep;
  Game.prototype.trySleep = function () {
    if (this.isGuest && this.net) { for (const l of this.locals) if (l.sleeping) l.toast('Resting… the night ends when the party rests.', ''); return; }
    if (!(this.net && this.net.remotes && this.net.remotes.size) && !this.restDayOn()) return baseTry.call(this);
    const P = this.restParty(), awake = P.filter(q => !q.asleep);
    if (!awake.length) { restMorning(this); return; }
    const names = awake.map(q => q.name).join(', ');
    for (const l of this.locals) l.toast(`${names} must rest too${P.length > 2 ? ' (or most of you)' : ''}`, '');
  };
}

// making camp: lie down where you are, at night, with nothing hunting you
function restMakeCamp(lp) {
  const g = lp.g, p = lp.player;
  if (g.dim !== DIM.OVERWORLD) { lp.toast('You can\'t settle down to sleep here', 'warn'); return false; }
  const night = g.env && g.env.day < 0.45;
  if (!night && !g.lateHeld()) { lp.toast('Make camp at night. By day, a short rest will do.', ''); return false; }
  if (g.entities.some(e => e instanceof Mob && e.alive && e.T && e.T.hostile && !e.tamed && !e.dndSummonBy && Math.hypot(e.x - p.x, e.z - p.z) < 16)) { lp.toast('You can\'t make camp with enemies near', 'warn'); return false; }
  if (p.inWater || !p.onGround) { lp.toast('Find solid ground to make camp', ''); return false; }
  lp.sleeping = { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z), camp: true, t: 0 };
  p.vx = p.vz = 0;
  lp.toast('You make camp and settle down for the night', 'good');
  if (g.sfx) try { g.sfx.play('click'); } catch (e) { /* no sound */ }
  g.trySleep();
  return true;
}
{
  // the sheet's rest buttons gain "Make camp"
  const baseRestBtn = dndDoRest;
  dndDoRest = function (lp, kind) {
    if (kind === 'camp') return restMakeCamp(lp);
    return baseRestBtn(lp, kind);
  };
}

// a guest hears from the host: the vote, and the morning
{
  const baseGuest = Net.prototype.guestMsg;
  Net.prototype.guestMsg = function (m) {
    if (m && m.t === 'adv' && m.k === 'restmorning') {
      const g = this.g, fade = document.getElementById('fx-fade');
      if (fade) { fade.hidden = false; requestAnimationFrame(() => fade.classList.add('on')); }
      setTimeout(() => {
        if (g.meta) { g.meta.time = DAY_LEN * 0.02; g.meta.day = m.day; }
        g._lateHold = false;
        restWake(g);
        if (fade) { fade.classList.remove('on'); setTimeout(() => { fade.hidden = true; }, 400); }
      }, 1800);
      return;
    }
    if (m && m.t === 'adv' && m.k === 'restvote') {
      for (const l of this.g.locals) if (!l.sleeping) l.toast(`${m.a} of ${m.n} are resting. Morning comes in ${m.s} seconds — rest too, or keep watch.`, '');
      return;
    }
    return baseGuest.call(this, m);
  };
}

// a chip on the HUD while the night holds
{
  const baseFrame = Hud.prototype.frame;
  Hud.prototype.frame = function (dt, cam) {
    const r = baseFrame.call(this, dt, cam);
    try {
      const g = this.lp && this.lp.g, on = !!(g && g.lateHeld && g.lateHeld() && !this.lp.sleeping);
      if (!this.root) return r;
      let el = this._lateEl;
      if (on && (!el || !el.isConnected)) { el = this._lateEl = document.createElement('div'); el.className = 'late-chip'; el.innerHTML = '<b>☾</b> Late evening · rest to end the day'; this.root.appendChild(el); }
      if (el) el.hidden = !on;
    } catch (e) { /* the HUD can wait */ }
    return r;
  };
}
