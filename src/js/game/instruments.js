// ---------------------------------------------------------------------------
// game/instruments.js — a compass and a clock you read by looking at them,
// like the originals: the compass needle swings round to point at your spawn
// (and spins wildly in other dimensions), the clock's dial turns to show the
// sun or the moon. The picture changes everywhere the item appears: in the
// hotbar and inventory, in your hand, dropped on the ground, in item frames.
// ---------------------------------------------------------------------------

const INSTRUMENTS = { compassF: 0, clockF: 0, compassA: 0, compassV: 0, deathF: 0, deathA: 0, deathV: 0, frames: null };
const COMPASS_FRAMES = 32, CLOCK_FRAMES = 64;

// Paint every frame of both pictures (once, after the texture atlas is made).
function paintInstrumentFrames() {
  const H = hexRGB, out = { compass: [], clock: [], death_compass: [] };
  const px = () => new Px(1);
  const disc = (p, rim, face, r = 6.2) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d <= r + 0.9 && d > r - 0.3) p.set(x, y, H(rim)); else if (d <= r - 0.3) p.set(x, y, face);
    }
  };
  const line = (p, ang, from, to, col) => {
    for (let t = from; t <= to; t += 0.25) { const x = Math.round(7.5 + Math.sin(ang) * t - 0.01), y = Math.round(7.5 - Math.cos(ang) * t - 0.01); p.set(x, y, H(col)); }
  };
  for (let f = 0; f < COMPASS_FRAMES; f++) {
    const p = px(), a = f / COMPASS_FRAMES * TAU;
    disc(p, '#4a4a54', H('#d8d8e0'));
    for (const k of [0, 1, 2, 3]) { const q = k * Math.PI / 2; p.set(Math.round(7.5 + Math.sin(q) * 5.2), Math.round(7.5 - Math.cos(q) * 5.2), H('#8a8a96')); }
    line(p, a + Math.PI, 0, 3.2, '#3a3a44');        // the tail of the needle
    line(p, a, 0, 4.8, '#d8202a');                   // the red point: home
    p.set(7, 7, H('#141414')); p.set(8, 8, H('#141414'));
    outlineSprite(p);
    out.compass.push(new Uint8Array(toTileSize(p.d, p.w).buffer.slice(0)));
  }
  // the death compass: a dark face, a pale needle that points to your grave
  for (let f = 0; f < COMPASS_FRAMES; f++) {
    const p = px(), a = f / COMPASS_FRAMES * TAU;
    disc(p, '#2a2430', H('#4a4256'));
    for (const k of [0, 1, 2, 3]) { const q = k * Math.PI / 2; p.set(Math.round(7.5 + Math.sin(q) * 5.2), Math.round(7.5 - Math.cos(q) * 5.2), H('#6a6078')); }
    line(p, a + Math.PI, 0, 3.2, '#1a1620');
    line(p, a, 0, 4.8, '#b8f0ff');
    p.set(7, 7, H('#e8e8f0')); p.set(8, 8, H('#e8e8f0'));
    outlineSprite(p);
    out.death_compass.push(new Uint8Array(toTileSize(p.d, p.w).buffer.slice(0)));
  }
  for (let f = 0; f < CLOCK_FRAMES; f++) {
    const p = px(), phi = (f / CLOCK_FRAMES - 0.25) * TAU;
    disc(p, '#b98f15', H('#000000'));
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d > 5.9) continue;
      const alpha = Math.atan2(x - 7.5, -(y - 7.5)), beta = alpha - phi;   // where on the turning dial this pixel is ((alpha 3) turning clockwise)
      const day = Math.cos(beta) > 0;
      let c = day ? H('#5a9ae8') : H('#121a3a');
      if (Math.abs(Math.cos(beta)) < 0.12) c = H('#6a4a2a');               // the horizon
      const sx = Math.sin(phi) * 3.3, sy = -Math.cos(phi) * 3.3;             // the sun on the dial: rising on the left, high at noon, setting on the right
      if (Math.hypot(x - 7.5 - sx, y - 7.5 - sy) < 1.6) c = H('#ffd84a');
      if (Math.hypot(x - 7.5 + sx, y - 7.5 + sy) < 1.4) c = H('#e8e8f0');    // the moon opposite
      if (!day && (Math.sin(beta * 7) > 0.97) && d > 2.5) c = H('#d8d8f8');
      p.set(x, y, c);
    }
    p.set(7, 1, H('#3a2a10')); p.set(8, 1, H('#3a2a10'));                 // the marker at the top
    outlineSprite(p);
    out.clock.push(new Uint8Array(toTileSize(p.d, p.w).buffer.slice(0)));
  }
  // in the atlas: frames the renderer swaps in (chosen by INSTRUMENTS, not by time)
  for (const [key, n, which] of [['compass', COMPASS_FRAMES, 'compassF'], ['clock', CLOCK_FRAMES, 'clockF'], ['death_compass', COMPASS_FRAMES, 'deathF']]) {
    const tile = ATLAS.tile[key]; if (tile === undefined) continue;
    ANIMS.push({ tile, frames: out[key], fps: 0, phase: 0, cur: -1, pick: () => INSTRUMENTS[which] % n });
  }
  // and as picture strips for the inventory and hotbar
  const strip = (frames) => {
    const c = document.createElement('canvas'); c.width = TILE * frames.length; c.height = TILE;
    const x = c.getContext('2d');
    frames.forEach((fr, i) => x.putImageData(new ImageData(new Uint8ClampedArray(fr), TILE, TILE), i * TILE, 0));
    try { return c.toDataURL(); } catch (e) { return null; }
  };
  const cs = strip(out.compass), ks = strip(out.clock), ds = strip(out.death_compass);
  let st = document.getElementById('vx-instrument-css');
  if (!st) { st = document.createElement('style'); st.id = 'vx-instrument-css'; document.head.appendChild(st); }
  st.textContent = (cs ? `.ico.dyn-compass{background-image:url(${cs})!important;background-size:${COMPASS_FRAMES * 100}% 100%!important;background-position:calc(var(--compass-f,0) * 100% / ${COMPASS_FRAMES - 1}) 0!important}` : '')
    + (ks ? `.ico.dyn-clock{background-image:url(${ks})!important;background-size:${CLOCK_FRAMES * 100}% 100%!important;background-position:calc(var(--clock-f,0) * 100% / ${CLOCK_FRAMES - 1}) 0!important}` : '')
    + (ds ? `.ico.dyn-death_compass{background-image:url(${ds})!important;background-size:${COMPASS_FRAMES * 100}% 100%!important;background-position:calc(var(--death-f,0) * 100% / ${COMPASS_FRAMES - 1}) 0!important}` : '');
  INSTRUMENTS.frames = out;
}

// Icons in slots get the moving pictures.
{
  const base = slotInner;
  slotInner = function (s) {
    const h = base(s);
    if (s && (s.id === 'compass' || s.id === 'clock' || s.id === 'death_compass')) return h.replace('class="ico"', `class="ico dyn-${s.id}"`);
    return h;
  };
}

// Each frame: where the needle points (with a little swing and settle) and what the dial shows.
{
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    baseFrame.call(this, dt);
    if (this._pass) return;
    if (!INSTRUMENTS.frames) { try { paintInstrumentFrames(); } catch (e) { console.warn('instruments', e); INSTRUMENTS.frames = { compass: [], clock: [], death_compass: [] }; } }
    const I = INSTRUMENTS, l = this.local, p = l && l.player;
    let want = I.compassA, spin = false;
    if (p && this.inWorld()) {
      if (this.dim !== DIM.OVERWORLD) spin = true;
      else {
        const sp = p.spawn || (this.meta && this.meta.spawn) || [0, 0, 0];
        const toYaw = Math.atan2(-(sp[0] - p.x), -(sp[2] - p.z));
        const rel = ((toYaw - p.yaw) % TAU + TAU + Math.PI) % TAU - Math.PI;
        want = -rel;
      }
    } else spin = true;
    if (spin) I.compassA += dt * (4 + Math.sin(this.time * 1.7) * 3);
    else {
      // a spring: it swings past and settles, like a real needle
      const d = ((want - I.compassA) % TAU + TAU * 1.5) % TAU - Math.PI;
      I.compassV += d * dt * 40; I.compassV *= Math.max(0, 1 - dt * 6); I.compassA += I.compassV * dt;
    }
    if (!Number.isFinite(I.compassA) || !Number.isFinite(I.compassV)) { I.compassA = 0; I.compassV = 0; }   // (alpha 4) a NaN needle stayed NaN
    I.compassF = ((Math.round(I.compassA / TAU * COMPASS_FRAMES) % COMPASS_FRAMES) + COMPASS_FRAMES) % COMPASS_FRAMES;
    // the death compass: the same needle, drawn to your grave (and lost when there's none in this world)
    const gr = p && this.inWorld() ? p.grave : null;
    if (gr && gr.dim === this.dim) {
      const toYaw = Math.atan2(-(gr.x + 0.5 - p.x), -(gr.z + 0.5 - p.z));
      const rel = ((toYaw - p.yaw) % TAU + TAU + Math.PI) % TAU - Math.PI;
      const d = ((-rel - I.deathA) % TAU + TAU * 1.5) % TAU - Math.PI;
      I.deathV += d * dt * 40; I.deathV *= Math.max(0, 1 - dt * 6); I.deathA += I.deathV * dt;
    } else I.deathA += dt * (4 + Math.sin(this.time * 1.3) * 3);
    if (!Number.isFinite(I.deathA) || !Number.isFinite(I.deathV)) { I.deathA = 0; I.deathV = 0; }
    I.deathF = ((Math.round(I.deathA / TAU * COMPASS_FRAMES) % COMPASS_FRAMES) + COMPASS_FRAMES) % COMPASS_FRAMES;
    if (this.meta && this.dim === DIM.OVERWORLD) I.clockF = Math.floor(((this.meta.time % DAY_LEN) / DAY_LEN) * CLOCK_FRAMES) % CLOCK_FRAMES;
    else I.clockF = Math.floor(this.time * 20) % CLOCK_FRAMES;
    const root = document.documentElement.style;
    if (I._cf !== I.compassF) { I._cf = I.compassF; root.setProperty('--compass-f', I.compassF); }
    if (I._kf !== I.clockF) { I._kf = I.clockF; root.setProperty('--clock-f', I.clockF); }
    if (I._df !== I.deathF) { I._df = I.deathF; root.setProperty('--death-f', I.deathF); }
  };
}
