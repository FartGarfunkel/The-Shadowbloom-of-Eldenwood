// ---------------------------------------------------------------------------
// game/sfxlib.js — the 0.8.2 sound overhaul. Instead of one beep per sound,
// every sound is now *rendered*: built sample by sample from physical models
// (knocked wood and metal ring at their own resonances, gravel is hundreds of
// tiny crunches, glass shatters into a spray of tinkles, a bowstring is a
// plucked string), several takes of each, cached, and played with a little
// pitch and loudness variation so no two footsteps sound quite alike —
// the way the classic game picks one of several recordings.
// Everything is still made in code: no sound files ship with the game.
// A resource pack with sounds can replace any of these (render/packs.js).
// ---------------------------------------------------------------------------

const SND = { cache: new Map(), packs: new Map() };

// ---- tiny DSP kit -----------------------------------------------------------------------------------
function sndBiquad(type, f, Q, sr) {
  const w0 = 2 * Math.PI * Math.min(f, sr * 0.45) / sr, cs = Math.cos(w0), sn = Math.sin(w0), al = sn / (2 * Q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }   // band-pass (0 dB peak)
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
}
function sndRun(c, x) { const y = c.b0 * x + c.b1 * c.x1 + c.b2 * c.x2 - c.a1 * c.y1 - c.a2 * c.y2; c.x2 = c.x1; c.x1 = x; c.y2 = c.y1; c.y1 = y; return y; }

class SndBuf {
  constructor(sr, dur, rng) { this.sr = sr; this.d = new Float32Array(Math.max(1, Math.ceil(dur * sr))); this.r = rng; }
  // a burst of filtered noise with a fast attack and an exponential fade
  noise(t0, dur, type, f, Q, gain, o = {}) {
    const sr = this.sr, i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr), d = this.d, r = this.r;
    const c = sndBiquad(type, f, Q, sr), c2 = o.two ? sndBiquad(type, f, Q, sr) : null;
    const att = Math.max(1, Math.floor((o.att ?? 0.002) * sr)), k = Math.log(1000) / Math.max(1, n - att);
    let brown = 0;
    for (let i = 0; i < n && i0 + i < d.length; i++) {
      let x = r() * 2 - 1;
      if (o.brown) { brown = (brown + x * 0.08) * 0.995; x = brown * 6; }
      let y = sndRun(c, x); if (c2) y = sndRun(c2, y);
      const env = i < att ? i / att : Math.exp(-(i - att) * k * (o.curve || 1));
      if (o.sweep) { /* frequency glide: refresh the filter now and then */ if ((i & 63) === 0) { const nf = f * Math.pow(o.sweep, i / n); const nc = sndBiquad(type, nf, Q, sr); c.b0 = nc.b0; c.b1 = nc.b1; c.b2 = nc.b2; c.a1 = nc.a1; c.a2 = nc.a2; } }
      d[i0 + i] += y * env * gain;
    }
  }
  // many little noise grains over a span: crunching, rustling, crumbling
  grains(t0, span, count, fLo, fHi, Q, gain, o = {}) {
    const r = this.r;
    for (let k = 0; k < count; k++) {
      const t = t0 + Math.pow(r(), o.front ?? 1) * span, f = fLo * Math.pow(fHi / fLo, r()), g = gain * (0.35 + r() * 0.65) * (o.fade ? 1 - (t - t0) / span * 0.7 : 1);
      this.noise(t, (o.dMin ?? 0.004) + r() * ((o.dMax ?? 0.014) - (o.dMin ?? 0.004)), o.type || 'bp', f, Q * (0.7 + r() * 0.6), g, { att: 0.0006 });
    }
  }
  // a struck body ringing at its own resonances: [[Hz, decay seconds, level]...]
  modes(t0, list, gain, o = {}) {
    const sr = this.sr, d = this.d, r = this.r, i0 = Math.floor(t0 * sr);
    for (const [f, dec, a] of list) {
      const ph = r() * Math.PI * 2, n = Math.min(d.length - i0, Math.floor(dec * 7 * sr)), w = 2 * Math.PI * f / sr, att = Math.floor(0.0015 * sr);
      for (let i = 0; i < n; i++) d[i0 + i] += Math.sin(ph + w * i * (1 + (o.droop || 0) * i / n)) * Math.exp(-i / (dec * sr)) * (i < att ? i / att : 1) * a * gain;
    }
  }
  // a dull thump: a sine falling in pitch
  thump(t0, f0, f1, dur, gain) {
    const sr = this.sr, d = this.d, i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr);
    let ph = 0;
    for (let i = 0; i < n && i0 + i < d.length; i++) { const f = f0 * Math.pow(f1 / f0, i / n); ph += 2 * Math.PI * f / sr; d[i0 + i] += Math.sin(ph) * Math.exp(-i / (n * 0.28)) * Math.min(1, i / (0.002 * sr)) * gain; }
  }
  // a plucked string (Karplus-Strong): bowstrings, harps
  pluck(t0, f, dur, gain, damp = 0.996) {
    const sr = this.sr, d = this.d, r = this.r, L = Math.max(2, Math.round(sr / f)), line = new Float32Array(L), i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr);
    let lp = 0; for (let i = 0; i < L; i++) { lp += ((r() * 2 - 1) - lp) * 0.5; line[i] = lp; }
    let p = 0;
    for (let i = 0; i < n && i0 + i < d.length; i++) { const a = line[p], b = line[(p + 1) % L]; line[p] = (a + b) * 0.5 * damp; d[i0 + i] += a * gain * Math.min(1, (n - i) / (0.02 * sr)); p = (p + 1) % L; }
  }
  // a pitched voice with breath through vowel resonances (grunts, gasps)
  vox(t0, dur, f0, f1, vowel, gain, breath = 0.3) {
    const sr = this.sr, d = this.d, r = this.r, i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr), V = VOWELS[vowel] || VOWELS.a;
    const fs = V.map((f, i) => sndBiquad('bp', f, [5, 7, 9][i], sr)), lv = [1, 0.5, 0.22];
    let ph = 0;
    for (let i = 0; i < n && i0 + i < d.length; i++) {
      const f = f0 * Math.pow(f1 / f0, i / n); ph += f / sr; if (ph > 1) ph -= 1;
      const src = (ph * 2 - 1) * 0.7 + (r() * 2 - 1) * breath;
      let y = 0; for (let k = 0; k < 3; k++) y += sndRun(fs[k], src) * lv[k];
      const env = Math.min(1, i / (0.012 * sr)) * Math.pow(1 - i / n, 1.6);
      d[i0 + i] += y * env * gain * 2.4;
    }
  }
  // smooth to a peak level and soften the very end
  finish(peak = 0.9) {
    const d = this.d; let m = 0;
    for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
    const k = m > 0 ? peak / m : 1, fade = Math.floor(this.sr * 0.01);
    for (let i = 0; i < d.length; i++) { let v = d[i] * k; v = Math.tanh(v * 1.1) / Math.tanh(1.1); if (i > d.length - fade) v *= (d.length - i) / fade; d[i] = v; }
    return this;
  }
}

// ---- the recipes: (b, v, r) => fill the buffer b; v = which take, r = random --------------------------
// [length in seconds, how loud it plays, recipe]
const SND_MAT = {
  grass: {
    step: [0.16, 0.4, (b, v, r) => { b.grains(0, 0.09, 18, 900, 4800, 1.2, 0.5, { dMax: 0.02 }); b.noise(0, 0.06, 'lp', 420, 0.7, 0.55); }],
    dig: [0.2, 0.75, (b, v, r) => { b.grains(0, 0.12, 30, 800, 4500, 1.2, 0.55, { dMax: 0.022, front: 1.6 }); b.noise(0, 0.07, 'lp', 450, 0.7, 0.65); }],
    break: [0.34, 0.95, (b, v, r) => { b.grains(0, 0.24, 55, 1200, 6000, 1.0, 0.55, { dMax: 0.025, front: 1.8, fade: true }); b.noise(0, 0.09, 'lp', 260, 0.7, 0.8); b.grains(0.01, 0.18, 12, 300, 900, 1.2, 0.4); }],
    place: [0.2, 0.75, (b, v, r) => { b.grains(0, 0.1, 26, 1500, 6000, 1.0, 0.5, { dMax: 0.02, front: 1.6 }); b.noise(0, 0.07, 'lp', 280, 0.7, 0.7); }],
  },
  dirt: {
    step: [0.16, 0.4, (b) => { b.noise(0, 0.07, 'lp', 340, 0.8, 0.6); b.grains(0, 0.08, 9, 500, 1800, 1.4, 0.35); }],
    dig: [0.2, 0.75, (b) => { b.noise(0, 0.09, 'lp', 380, 0.8, 0.7); b.grains(0, 0.12, 20, 450, 2200, 1.4, 0.4, { front: 1.5 }); }],
    break: [0.34, 0.95, (b) => { b.noise(0, 0.12, 'lp', 360, 0.8, 0.8); b.grains(0, 0.25, 45, 400, 2400, 1.4, 0.45, { front: 1.8, fade: true }); }],
    place: [0.2, 0.75, (b) => { b.noise(0, 0.09, 'lp', 360, 0.8, 0.75); b.grains(0, 0.1, 16, 450, 2000, 1.4, 0.4); }],
  },
  gravel: {
    step: [0.17, 0.45, (b) => { b.grains(0, 0.11, 34, 450, 2600, 2.2, 0.55, { dMax: 0.01, front: 1.3 }); b.noise(0, 0.06, 'lp', 350, 0.7, 0.5); }],
    dig: [0.22, 0.8, (b) => { b.grains(0, 0.15, 55, 600, 3500, 2.0, 0.6, { dMax: 0.012, front: 1.5 }); b.noise(0, 0.06, 'lp', 320, 0.7, 0.45); }],
    break: [0.36, 1, (b) => { b.grains(0, 0.28, 95, 500, 3500, 2.0, 0.6, { dMax: 0.012, front: 1.8, fade: true }); b.noise(0, 0.1, 'lp', 280, 0.7, 0.6); }],
    place: [0.2, 0.8, (b) => { b.grains(0, 0.13, 46, 600, 3300, 2.0, 0.6, { dMax: 0.012, front: 1.4 }); b.noise(0, 0.06, 'lp', 300, 0.7, 0.5); }],
  },
  sand: {
    step: [0.18, 0.38, (b) => { b.noise(0, 0.13, 'bp', 2400, 0.7, 0.55, { att: 0.012, curve: 0.8 }); b.grains(0, 0.1, 12, 2500, 6500, 1.0, 0.25); }],
    dig: [0.22, 0.7, (b) => { b.noise(0, 0.17, 'bp', 2000, 0.7, 0.6, { att: 0.01 }); b.grains(0, 0.14, 22, 2000, 6000, 1.0, 0.3); }],
    break: [0.34, 0.9, (b) => { b.noise(0, 0.28, 'bp', 1800, 0.6, 0.7, { att: 0.008, sweep: 0.6 }); b.grains(0, 0.25, 40, 1500, 6000, 1.0, 0.3, { fade: true }); }],
    place: [0.2, 0.7, (b) => { b.noise(0, 0.15, 'bp', 2100, 0.7, 0.6, { att: 0.008 }); b.grains(0, 0.12, 18, 2000, 6000, 1.0, 0.3); }],
  },
  snow: {
    step: [0.18, 0.42, (b) => { b.grains(0, 0.12, 22, 900, 2600, 6, 0.6, { dMin: 0.006, dMax: 0.018 }); b.noise(0, 0.08, 'hp', 3500, 0.7, 0.15); }],
    dig: [0.22, 0.75, (b) => { b.grains(0, 0.16, 36, 800, 2600, 6, 0.6, { dMin: 0.006, dMax: 0.02 }); b.noise(0, 0.1, 'hp', 3000, 0.7, 0.18); }],
    break: [0.32, 0.9, (b) => { b.grains(0, 0.26, 60, 700, 2800, 5, 0.6, { dMin: 0.006, dMax: 0.02, fade: true }); b.noise(0, 0.14, 'hp', 2800, 0.7, 0.2); }],
    place: [0.22, 0.75, (b) => { b.grains(0, 0.14, 30, 800, 2600, 6, 0.6, { dMin: 0.006, dMax: 0.02 }); }],
  },
  stone: {
    step: [0.14, 0.42, (b, v, r) => { b.noise(0, 0.006, 'bp', 2600 + r() * 1200, 1.5, 0.6); b.noise(0, 0.035, 'bp', 650 + r() * 250, 1.4, 0.7); b.thump(0, 120, 70, 0.06, 0.45); }],
    dig: [0.2, 0.8, (b, v, r) => { b.noise(0, 0.008, 'bp', 3200 + r() * 1500, 1.2, 0.9); b.noise(0, 0.05, 'bp', 800 + r() * 400, 1.2, 0.8); b.grains(0.004, 0.08, 8, 1200, 4000, 2, 0.4); b.thump(0, 140, 80, 0.07, 0.5); }],
    break: [0.42, 1, (b, v, r) => { b.noise(0, 0.012, 'bp', 3000, 1.0, 1); b.noise(0, 0.08, 'bp', 700, 1.0, 0.9); b.grains(0.01, 0.3, 40, 700, 3500, 1.8, 0.5, { front: 1.7, fade: true, dMax: 0.02 }); b.thump(0, 110, 55, 0.12, 0.6); }],
    place: [0.18, 0.8, (b, v, r) => { b.noise(0, 0.008, 'bp', 2400 + r() * 800, 1.3, 0.8); b.noise(0, 0.05, 'bp', 600 + r() * 200, 1.3, 0.9); b.thump(0, 130, 70, 0.08, 0.6); }],
  },
  wood: {
    step: [0.16, 0.42, (b, v, r) => { const f = 200 + r() * 60; b.modes(0, [[f, 0.025, 1], [f * 2.71, 0.014, 0.45], [f * 4.6, 0.008, 0.25]], 0.6); b.noise(0, 0.004, 'bp', 1800, 1.5, 0.4); b.noise(0, 0.03, 'bp', 450, 1.0, 0.35); }],
    dig: [0.22, 0.8, (b, v, r) => { const f = 230 + r() * 80; b.modes(0, [[f, 0.04, 1], [f * 2.71, 0.022, 0.55], [f * 4.6, 0.012, 0.3], [f * 6.9, 0.006, 0.18]], 0.7); b.noise(0, 0.005, 'bp', 2400, 1.5, 0.6); b.noise(0, 0.04, 'bp', 500, 1.0, 0.4); }],
    break: [0.4, 1, (b, v, r) => { const f = 170 + r() * 50; b.noise(0, 0.02, 'bp', 1400, 0.9, 0.9); b.modes(0, [[f, 0.05, 1], [f * 2.71, 0.03, 0.5], [f * 4.6, 0.015, 0.3]], 0.6); b.grains(0.015, 0.22, 26, 1500, 5500, 2.5, 0.45, { front: 1.6, fade: true }); }],
    place: [0.2, 0.8, (b, v, r) => { const f = 190 + r() * 60; b.modes(0, [[f, 0.035, 1], [f * 2.71, 0.02, 0.5], [f * 4.6, 0.01, 0.28]], 0.7); b.noise(0, 0.005, 'bp', 2000, 1.5, 0.5); b.thump(0, 110, 70, 0.05, 0.3); }],
  },
  wool: {
    step: [0.15, 0.35, (b) => { b.noise(0, 0.08, 'lp', 520, 0.7, 0.7, { att: 0.008 }); b.noise(0, 0.06, 'bp', 2500, 0.6, 0.08, { att: 0.01 }); }],
    dig: [0.18, 0.65, (b) => { b.noise(0, 0.1, 'lp', 600, 0.7, 0.8, { att: 0.006 }); b.noise(0, 0.08, 'bp', 2500, 0.6, 0.12, { att: 0.01 }); }],
    break: [0.26, 0.85, (b) => { b.noise(0, 0.18, 'lp', 600, 0.7, 0.85, { att: 0.006 }); b.noise(0, 0.15, 'bp', 2200, 0.6, 0.15, { att: 0.02 }); }],
    place: [0.18, 0.65, (b) => { b.noise(0, 0.1, 'lp', 560, 0.7, 0.8, { att: 0.006 }); }],
  },
  glass: {
    step: [0.14, 0.42, (b, v, r) => { b.noise(0, 0.005, 'bp', 3800 + r() * 1500, 1.5, 0.7); b.noise(0, 0.03, 'bp', 700, 1.3, 0.6); b.modes(0, [[2600 + r() * 900, 0.012, 0.3]], 0.4); b.thump(0, 120, 70, 0.05, 0.35); }],
    dig: [0.2, 0.75, (b, v, r) => { b.noise(0, 0.006, 'bp', 4200, 1.3, 0.7); b.modes(0, [[2400 + r() * 800, 0.03, 1], [3900 + r() * 1200, 0.02, 0.6], [6100 + r() * 1500, 0.012, 0.4]], 0.45); }],
    break: [0.7, 1, (b, v, r) => {
      b.noise(0, 0.03, 'hp', 2500, 0.7, 0.8); b.noise(0, 0.012, 'bp', 1500, 1, 0.7);
      for (let k = 0; k < 46; k++) { const t = Math.pow(r(), 1.7) * 0.42; b.modes(t, [[1800 + r() * 6500, 0.01 + r() * 0.05, 1]], 0.22 * (1 - t * 1.3)); }
    }],
    place: [0.18, 0.75, (b, v, r) => { b.noise(0, 0.006, 'bp', 3400, 1.3, 0.7); b.noise(0, 0.04, 'bp', 650, 1.2, 0.7); b.modes(0, [[2800 + r() * 900, 0.02, 0.5]], 0.4); b.thump(0, 120, 70, 0.06, 0.4); }],
  },
  metal: {
    step: [0.3, 0.38, (b, v, r) => { const f = 420 + r() * 160; b.modes(0, [[f, 0.06, 1], [f * 2.76, 0.04, 0.5], [f * 5.4, 0.025, 0.3], [f * 8.93, 0.015, 0.18]], 0.5); b.noise(0, 0.005, 'bp', 3000, 1.2, 0.5); b.thump(0, 140, 80, 0.05, 0.4); }],
    dig: [0.4, 0.75, (b, v, r) => { const f = 480 + r() * 200; b.modes(0, [[f, 0.1, 1], [f * 2.76, 0.07, 0.6], [f * 5.4, 0.045, 0.35], [f * 8.93, 0.025, 0.2]], 0.55); b.noise(0, 0.006, 'bp', 3800, 1.2, 0.7); }],
    break: [0.6, 1, (b, v, r) => { const f = 380 + r() * 120; b.modes(0, [[f, 0.16, 1], [f * 2.76, 0.12, 0.6], [f * 5.4, 0.08, 0.4], [f * 8.93, 0.05, 0.25]], 0.55); b.noise(0, 0.01, 'bp', 3000, 1, 0.8); for (let k = 0; k < 5; k++) b.modes(0.06 + r() * 0.2, [[900 + r() * 2500, 0.03, 1]], 0.2); }],
    place: [0.35, 0.75, (b, v, r) => { const f = 440 + r() * 160; b.modes(0, [[f, 0.08, 1], [f * 2.76, 0.06, 0.55], [f * 5.4, 0.04, 0.3]], 0.55); b.noise(0, 0.006, 'bp', 3400, 1.2, 0.6); b.thump(0, 130, 75, 0.06, 0.45); }],
  },
  leaves: {
    step: [0.2, 0.32, (b) => { b.grains(0, 0.14, 26, 2600, 8000, 0.8, 0.45, { dMin: 0.008, dMax: 0.03 }); }],
    dig: [0.24, 0.6, (b) => { b.grains(0, 0.18, 40, 2400, 8000, 0.8, 0.5, { dMin: 0.008, dMax: 0.03 }); }],
    break: [0.38, 0.85, (b, v, r) => { b.grains(0, 0.3, 70, 2200, 8000, 0.8, 0.5, { dMin: 0.008, dMax: 0.035, fade: true }); for (let k = 0; k < 3; k++) b.noise(r() * 0.15, 0.006, 'bp', 2500 + r() * 1500, 2, 0.5); }],
    place: [0.22, 0.6, (b) => { b.grains(0, 0.16, 34, 2400, 8000, 0.8, 0.5, { dMin: 0.008, dMax: 0.03 }); }],
  },
  mud: {
    step: [0.2, 0.42, (b, v, r) => { b.noise(0, 0.12, 'bp', 320, 3, 0.8, { att: 0.01, sweep: 2.8 }); b.modes(0.03 + r() * 0.04, [[340 + r() * 200, 0.02, 1]], 0.3, { droop: -0.4 }); }],
    dig: [0.24, 0.75, (b, v, r) => { b.noise(0, 0.15, 'bp', 300, 3, 0.85, { att: 0.01, sweep: 3 }); b.modes(0.05, [[300 + r() * 250, 0.025, 1]], 0.35, { droop: -0.4 }); }],
    break: [0.34, 0.9, (b, v, r) => { b.noise(0, 0.22, 'bp', 260, 2.5, 0.9, { att: 0.01, sweep: 3.5 }); for (let k = 0; k < 3; k++) b.modes(0.04 + r() * 0.15, [[280 + r() * 300, 0.025, 1]], 0.3, { droop: -0.5 }); }],
    place: [0.24, 0.75, (b, v, r) => { b.noise(0, 0.14, 'bp', 300, 3, 0.85, { att: 0.01, sweep: 2.6 }); }],
  },
  slime: {
    step: [0.2, 0.45, (b, v, r) => { b.noise(0, 0.1, 'lp', 500, 1.5, 0.7, { att: 0.006 }); b.thump(0, 150, 60, 0.12, 0.5); }],
    dig: [0.24, 0.75, (b) => { b.noise(0, 0.12, 'lp', 600, 1.5, 0.75, { att: 0.006 }); b.thump(0, 170, 60, 0.14, 0.55); }],
    break: [0.3, 0.9, (b) => { b.noise(0, 0.2, 'lp', 600, 1.5, 0.8, { att: 0.006 }); b.thump(0, 160, 50, 0.2, 0.6); }],
    place: [0.24, 0.75, (b) => { b.noise(0, 0.12, 'lp', 560, 1.5, 0.75, { att: 0.006 }); b.thump(0, 160, 60, 0.14, 0.55); }],
  },
};
SND_MAT.ladder = { step: [0.14, 0.4, (b, v, r) => { const f = 300 + r() * 80; b.modes(0, [[f, 0.02, 1], [f * 2.6, 0.012, 0.5]], 0.6); b.noise(0, 0.004, 'bp', 2200, 1.5, 0.4); }] };
for (const k of ['dig', 'break', 'place']) SND_MAT.ladder[k] = SND_MAT.wood[k];

// Everything else the game plays by name.
const SND_FX = {
  door_open: [0.5, 0.75, (b, v, r) => {   // a wooden creak, then the latch
    const sr = b.sr, n = Math.floor(0.32 * sr), c = sndBiquad('bp', 900, 6, sr); let ph = 0;
    for (let i = 0; i < n; i++) { const f = 30 + 25 * Math.sin(i / sr * 7) + r() * 8; ph += f / sr; const stick = (ph % 1) < 0.08 ? 1 : 0; b.d[i] += sndRun(c, stick * (r() * 0.5 + 0.5)) * 0.9 * Math.sin(Math.PI * i / n); }
    b.modes(0.3, [[260, 0.03, 1], [700, 0.015, 0.4]], 0.5); b.noise(0.3, 0.004, 'bp', 2400, 1.5, 0.4);
  }],
  door_close: [0.35, 0.85, (b, v, r) => { b.modes(0, [[150 + r() * 30, 0.06, 1], [410, 0.03, 0.5], [880, 0.015, 0.25]], 0.8); b.noise(0, 0.05, 'lp', 400, 0.8, 0.7); b.noise(0.06, 0.004, 'bp', 2600, 1.5, 0.35); }],
  chest: [0.6, 0.8, (b, v, r) => {   // lid creaks up
    const sr = b.sr, n = Math.floor(0.45 * sr), c = sndBiquad('bp', 650, 5, sr); let ph = 0;
    for (let i = 0; i < n; i++) { const f = 22 + 14 * (i / n) + r() * 6; ph += f / sr; const stick = (ph % 1) < 0.1 ? 1 : 0; b.d[i] += sndRun(c, stick) * 0.8 * Math.sin(Math.PI * i / n); }
    b.noise(0, 0.004, 'bp', 2000, 1.5, 0.4);
  }],
  chest_close: [0.3, 0.85, (b, v, r) => { b.modes(0, [[170 + r() * 30, 0.05, 1], [450, 0.025, 0.5]], 0.8); b.noise(0, 0.06, 'lp', 380, 0.8, 0.7); b.noise(0.01, 0.003, 'bp', 3000, 2, 0.4); }],
  eat: [0.75, 0.6, (b, v, r) => { for (let k = 0; k < 3; k++) { const t = k * 0.2 + r() * 0.04; b.grains(t, 0.06, 26, 900, 4500, 1.4, 0.55, { dMax: 0.01 }); b.noise(t, 0.04, 'lp', 400, 0.8, 0.4); } }],
  burp: [0.5, 0.5, (b) => { b.vox(0, 0.42, 110, 80, 'o', 0.6, 0.5); }],
  splash: [0.8, 0.8, (b, v, r) => { b.noise(0, 0.5, 'lp', 1400, 0.7, 0.8, { att: 0.004 }); b.noise(0, 0.3, 'bp', 3500, 0.8, 0.3); for (let k = 0; k < 12; k++) b.modes(0.05 + r() * 0.45, [[500 + r() * 1200, 0.012, 1]], 0.25, { droop: -0.6 }); }],
  swim: [0.5, 0.45, (b, v, r) => { b.noise(0, 0.35, 'bp', 900, 0.8, 0.6, { att: 0.08, curve: 0.6 }); for (let k = 0; k < 4; k++) b.modes(0.1 + r() * 0.3, [[600 + r() * 900, 0.01, 1]], 0.18, { droop: -0.6 }); }],
  bucket: [0.45, 0.65, (b, v, r) => { b.noise(0, 0.3, 'lp', 1200, 0.8, 0.6, { att: 0.01 }); b.modes(0, [[620, 0.05, 1], [1710, 0.03, 0.4]], 0.3); for (let k = 0; k < 5; k++) b.modes(0.05 + r() * 0.25, [[500 + r() * 800, 0.012, 1]], 0.2, { droop: -0.5 }); }],
  pop: [0.12, 0.45, (b, v, r) => { const sr = b.sr, n = Math.floor(0.07 * sr); let ph = 0; const f0 = 380 + r() * 260; for (let i = 0; i < n; i++) { ph += (f0 * (1 + 1.6 * i / n)) / sr; b.d[i] += Math.sin(ph * 2 * Math.PI) * Math.exp(-i / (n * 0.35)) * 0.8; } b.noise(0, 0.004, 'bp', 3000, 1.5, 0.3); }],
  hurt: [0.3, 0.75, (b, v, r) => { b.vox(0, 0.22, 170 + r() * 20, 120, 'o', 0.9, 0.55); b.noise(0, 0.06, 'lp', 700, 0.8, 0.4); }],
  hit: [0.2, 0.8, (b, v, r) => { b.noise(0, 0.06, 'lp', 900, 0.8, 0.8); b.thump(0, 160, 70, 0.08, 0.7); b.noise(0, 0.006, 'bp', 2500, 1.2, 0.5); }],
  crit: [0.35, 0.6, (b, v, r) => { b.noise(0, 0.05, 'lp', 1000, 0.8, 0.8); b.modes(0, [[1300, 0.04, 1], [2600, 0.02, 0.5]], 0.4); b.thump(0, 180, 70, 0.08, 0.6); }],
  explode: [2.4, 1, (b, v, r) => { b.noise(0, 2.2, 'lp', 260, 0.7, 1, { brown: true, att: 0.004, curve: 0.6 }); b.noise(0, 0.5, 'lp', 1400, 0.7, 0.6, { att: 0.002 }); b.thump(0, 70, 28, 1.0, 0.9); b.grains(0.05, 1.2, 60, 300, 2500, 1.5, 0.25, { front: 2, fade: true, dMax: 0.03 }); }],
  ignite: [0.45, 0.6, (b, v, r) => { b.noise(0, 0.012, 'bp', 3500, 1.2, 0.7); b.noise(0.01, 0.35, 'bp', 1600, 0.6, 0.5, { att: 0.03, curve: 0.8 }); b.grains(0.02, 0.3, 14, 2000, 6000, 2, 0.3); }],
  fizz: [0.7, 0.6, (b) => { b.noise(0, 0.6, 'hp', 3500, 0.7, 0.7, { att: 0.01, curve: 0.7 }); b.grains(0, 0.5, 40, 3000, 8000, 2, 0.25, { fade: true }); }],
  bow: [0.4, 0.65, (b, v, r) => { b.pluck(0, 150 + r() * 25, 0.22, 0.45, 0.94); b.noise(0, 0.16, 'bp', 1600, 0.7, 0.6, { att: 0.004, sweep: 0.5 }); }],
  arrow_hit: [0.25, 0.7, (b, v, r) => { b.noise(0, 0.004, 'bp', 2600, 1.5, 0.7); b.modes(0, [[260 + r() * 60, 0.03, 1], [700, 0.015, 0.4]], 0.7); b.thump(0, 140, 80, 0.06, 0.4); }],
  levelup: [1.6, 0.6, (b) => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => b.modes(i * 0.09, [[f, 0.35, 1], [f * 2.0, 0.2, 0.3], [f * 3.01, 0.1, 0.12]], 0.35)); }],
  xp: [0.4, 0.4, (b, v, r) => { const f = 900 + r() * 700; b.modes(0, [[f, 0.08, 1], [f * 2.01, 0.04, 0.3]], 0.5); }],
  equip: [0.35, 0.6, (b, v, r) => { b.noise(0, 0.12, 'bp', 2200, 1, 0.6, { att: 0.01 }); for (let k = 0; k < 4; k++) b.modes(r() * 0.12, [[1800 + r() * 2500, 0.02, 1]], 0.2); }],
  thud: [0.35, 0.8, (b) => { b.noise(0, 0.2, 'lp', 260, 0.8, 0.9, { brown: true }); b.thump(0, 90, 45, 0.18, 0.7); }],
  fell: [0.45, 0.85, (b, v, r) => { b.noise(0, 0.22, 'lp', 400, 0.8, 0.8); b.thump(0, 100, 45, 0.2, 0.7); b.vox(0.02, 0.2, 160, 110, 'o', 0.5, 0.6); }],
  click: [0.06, 0.3, (b) => { b.noise(0, 0.004, 'bp', 2200, 1.5, 0.8); b.modes(0, [[1400, 0.008, 1]], 0.4); }],
  click_off: [0.06, 0.28, (b) => { b.noise(0, 0.004, 'bp', 1800, 1.5, 0.8); b.modes(0, [[1100, 0.008, 1]], 0.4); }],
  tick: [0.04, 0.22, (b) => { b.noise(0, 0.003, 'bp', 3000, 1.5, 0.8); }],
  craft: [0.3, 0.55, (b, v, r) => { const f = 230 + r() * 60; b.modes(0, [[f, 0.03, 1], [f * 2.7, 0.015, 0.5]], 0.6); b.grains(0.02, 0.12, 12, 1500, 5000, 2, 0.3); }],
  swap: [0.15, 0.4, (b) => { b.noise(0, 0.08, 'bp', 1800, 0.8, 0.6, { att: 0.01 }); }],
  burn: [0.35, 0.45, (b, v, r) => { b.noise(0, 0.25, 'hp', 2500, 0.7, 0.6, { att: 0.02 }); b.grains(0, 0.25, 10, 2000, 6000, 3, 0.3); }],
  shear: [0.2, 0.55, (b) => { b.noise(0, 0.05, 'hp', 4000, 1, 0.8); b.noise(0.07, 0.05, 'hp', 4500, 1, 0.7); b.modes(0, [[3200, 0.01, 1]], 0.2); }],
  fire_crackle: [0.5, 0.35, (b, v, r) => { for (let k = 0; k < 7; k++) b.noise(r() * 0.4, 0.004 + r() * 0.006, 'bp', 1500 + r() * 4000, 2, 0.5 + r() * 0.5); b.noise(0, 0.45, 'lp', 600, 0.7, 0.15, { att: 0.1, curve: 0.5 }); }],
  lava_pop: [0.3, 0.5, (b, v, r) => { b.modes(0, [[160 + r() * 140, 0.04, 1]], 0.7, { droop: -0.5 }); b.noise(0, 0.05, 'lp', 900, 0.8, 0.4); }],
  splash_small: [0.35, 0.5, (b, v, r) => { b.noise(0, 0.2, 'lp', 1600, 0.7, 0.6); for (let k = 0; k < 5; k++) b.modes(0.02 + r() * 0.2, [[600 + r() * 1200, 0.01, 1]], 0.2, { droop: -0.6 }); }],
};
const SND_TAKES = (len) => len > 1.2 ? 2 : len > 0.5 ? 3 : 5;

// render (once) the takes of a sound
function sndTakes(ctx, key, spec) {
  let list = SND.cache.get(key);
  if (list) return list;
  const [len, , fn] = spec, sr = ctx.sampleRate, n = SND_TAKES(len);
  list = [];
  for (let v = 0; v < n; v++) {
    const rng = mulberry32(seedFromString(key) + v * 7919);
    const b = new SndBuf(sr, len, rng);
    try { fn(b, v, rng); } catch (e) { console.warn('sound', key, e); }
    b.finish(0.9);
    const ab = ctx.createBuffer(1, b.d.length, sr); ab.getChannelData(0).set(b.d);
    list.push(ab);
  }
  SND.cache.set(key, list);
  return list;
}
Object.assign(Sfx.prototype, {
  // play one take of a rendered sound, a touch higher or lower each time
  sample(list, gain, pitchVar = 0.08) {
    if (!list || !list.length) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = list[Math.floor(Math.random() * list.length)];
    src.playbackRate.value = 1 + (Math.random() * 2 - 1) * pitchVar;
    const g = c.createGain(); g.gain.value = gain * (0.9 + Math.random() * 0.15);
    src.connect(g); g.connect(this.out || this.master); src.start(t);
  },
});

// Materials: the old one-beep version replaced
{
  const baseMat = Sfx.prototype.material;
  Sfx.prototype.material = function (mat, kind) {
    if (!this.ctx || this.volume <= 0) return;
    const M = SND_MAT[mat] || SND_MAT.stone, spec = M[kind] || M.dig;
    if (!spec) return baseMat.call(this, mat, kind);
    if (!this.ok(kind + mat, kind === 'step' ? 0.16 : 0.045)) return;
    const pack = SND.packs.get(mat + '.' + kind);
    if (pack) { this.sample(pack, spec[1] * 1.1, 0.06); return; }
    this.sample(sndTakes(this.ctx, mat + '.' + kind, spec), spec[1], kind === 'step' ? 0.1 : 0.08);
  };
  const basePlay = Sfx.prototype.play;
  Sfx.prototype.play = function (name) {
    if (!this.ctx || this.volume <= 0) return;
    const spec = SND_FX[name];
    if (spec && !(name === 'hurt' && false)) {
      if (!this.ok('fx' + name, name === 'eat' ? 0.4 : 0.04)) return;
      const pack = SND.packs.get('fx.' + name);
      this.sample(pack || sndTakes(this.ctx, 'fx.' + name, spec), spec[1], name === 'levelup' ? 0 : 0.07);
      return;
    }
    return basePlay.call(this, name);
  };
}

// Every block gets a material to sound like (most never named one).
{
  const by = (b) => {
    const k = b.key || '';
    if (/sandstone|cobble|brick|_ore$|basalt|slate|tuff|calcite|granite|diorite|andesite|obsidian|quartz|purpur|prismarine|terracotta|concrete$|stone$|^stone/.test(k) && !/glowstone/.test(k)) return 'stone';
    if (/leaves|vine|azalea|hay|thatch|moss_carpet|sapling|flower|grass$|fern|bush|kelp|seagrass|sugar_cane|wheat|crop|lily/.test(k)) return /hay|thatch/.test(k) ? 'grass' : /leaves|azalea|vine/.test(k) ? 'leaves' : 'grass';
    if (/snow|powder_snow/.test(k)) return 'snow';
    if (/ladder|scaffold/.test(k)) return 'ladder';
    if (/mud|clay|slime|honey/.test(k)) return /slime|honey/.test(k) ? 'slime' : 'mud';
    if (/sand|soul_soil|concrete_powder/.test(k)) return 'sand';
    if (/gravel/.test(k)) return 'gravel';
    if (/dirt|farmland|podzol|mycelium|path|grass_block|rooted|soil|ash|permafrost/.test(k)) return 'dirt';
    if (/glass|ice|lantern|beacon|amethyst/.test(k)) return 'glass';
    if (/wool|carpet|bed|sponge/.test(k)) return 'wool';
    // whole words only: a craf-TIN-g table or a mari-GOLD is not metal
    if (/(^|_)(iron|gold|golden|copper|tin|bronze|anvil|chain|bell|cauldron|hopper|rail|metal|steel)(_|$)/.test(k) && !/ore/.test(k)) return 'metal';
    if (/planks|log|wood|door|trapdoor|fence|sign|chest|barrel|table|bookshelf|stem|hyphae|bamboo|note_block|loom|lectern|composter|crafting|sawmill|axle/.test(k)) return 'wood';
    return 'stone';
  };
  for (const b of BLOCKS) {
    if (!b) continue;
    const d = by(b);
    if (!b.sound) b.sound = d;
    else if ((b.sound === 'grass' || b.sound === 'stone' || b.sound === 'gravel' || b.sound === 'wood') && d !== 'stone') b.sound = d;
  }
  // grass blocks crunch like grass, the way the classic game does
  if (B.grass !== undefined) BLOCKS[B.grass].sound = 'grass';
}

// Render everything in the background once sound is on, a few at a time, so nothing waits on first use.
{
  const baseUnlock = Sfx.prototype.unlock;
  Sfx.prototype.unlock = function () {
    const fresh = !this.ctx;
    baseUnlock.call(this);
    if (!fresh || !this.ctx) return;
    const jobs = [];
    for (const m of Object.keys(SND_MAT)) for (const k of Object.keys(SND_MAT[m])) jobs.push([m + '.' + k, SND_MAT[m][k]]);
    for (const k of Object.keys(SND_FX)) jobs.push(['fx.' + k, SND_FX[k]]);
    const step = () => { const t0 = performance.now(); while (jobs.length && performance.now() - t0 < 6) { const [k, sp] = jobs.shift(); sndTakes(this.ctx, k, sp); } if (jobs.length) setTimeout(step, 40); };
    setTimeout(step, 500);
    if (typeof packDecodeSounds === 'function') packDecodeSounds(this.ctx);
  };
}
