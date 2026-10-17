// ---------------------------------------------------------------------------
// game/voices3.js — creature voices, recorded rather than played live.
//
// A voice is rendered the way a throat makes one: a train of glottal pulses
// (open slowly, snap shut) that never quite keeps time (jitter) or level
// (shimmer), with breath riding on each pulse; a growl skips or halves every
// other pulse; then four vocal-tract resonances in a chain shape it into a
// vowel, gliding from one vowel to the next. A big body has a long tract
// (low resonances); a little one a short one. A touch of room is added so it
// sounds like it happened somewhere. Each call has a few takes, played a
// little higher or lower each time, and a pack's own recordings win.
// ---------------------------------------------------------------------------

// Formants [F1..F4] and their bandwidths for the vowels the voices use ('x' is the neutral "uh").
const VOX_V = {
  a: [730, 1090, 2440, 3400], o: [570, 840, 2410, 3300], u: [320, 870, 2240, 3200], e: [530, 1840, 2480, 3500], i: [280, 2250, 2900, 3600],
  x: [500, 1400, 2450, 3400], r: [480, 1300, 1650, 3200], m: [260, 1000, 2300, 3200], n: [280, 1600, 2500, 3300], y: [660, 1700, 2400, 3400],
};
const VOX_BW = [80, 110, 170, 260];
const vGauss = (r) => (r() + r() + r() + r() - 2) * 0.87;

Object.assign(SndBuf.prototype, {
  // A voiced call. o = { f: [[t, Hz]...] (t 0..1), v: 'uoa' vowels in turn, k: tract scale (bigger = smaller creature),
  //   breath 0..1, jit, shim, sub (growl: every other pulse weaker), rough (ragged pulses), vib [rate, Hz],
  //   am [[rate, depth]...], att, rel (0..1 of the length spent fading), drive (grit), gain, open (0.3 to 0.7) }
  throat(t0, dur, o) {
    const sr = this.sr, d = this.d, r = this.r, i0 = Math.floor(t0 * sr), n = Math.min(Math.floor(dur * sr), d.length - i0);
    if (n <= 0) return;
    const pts = o.f || [[0, 120], [1, 100]], vs = (o.v || 'x').split('').map(c => VOX_V[c] || VOX_V.x), k = o.k || 1, bwk = o.bw || 1;
    const fAt = (t) => { for (let j = 1; j < pts.length; j++) if (t <= pts[j][0]) { const [ta, fa] = pts[j - 1], [tb, fb] = pts[j]; const u = (t - ta) / Math.max(1e-6, tb - ta); return fa + (fb - fa) * (u * u * (3 - 2 * u)); } return pts[pts.length - 1][1]; };
    const vAt = (t, q) => { if (vs.length === 1) return vs[0][q]; const x = t * (vs.length - 1), j = Math.min(vs.length - 2, Math.floor(x)), u = x - j, s = u * u * (3 - 2 * u); return vs[j][q] + (vs[j + 1][q] - vs[j][q]) * s; };
    const R = [0, 1, 2, 3].map(() => ({ a1: 0, a2: 0, b0: 1, y1: 0, y2: 0 }));
    const setR = (t) => { for (let q = 0; q < 4; q++) { const F = Math.min(sr * 0.45, vAt(t, q) * k), B = VOX_BW[q] * bwk * (1 + (o.breath || 0) * 0.6), rr = Math.exp(-Math.PI * B / sr), c = R[q]; c.a1 = 2 * rr * Math.cos(2 * Math.PI * F / sr); c.a2 = -rr * rr; c.b0 = 1 - c.a1 - c.a2; } };
    const open = o.open || 0.5, Tp = open * 0.72, Tn = open * 0.28;
    const att = Math.max(1, Math.floor((o.att ?? 0.04) * sr)), rel = Math.floor(n * (o.rel ?? 0.45));
    let ph = r(), prev = 0, jf = 1, amp = 1, odd = 0, lp = 0, vibPh = r() * 6;
    const breath = o.breath || 0, jit = o.jit ?? 0.015, shim = o.shim ?? 0.08, sub = o.sub || 0, rough = o.rough || 0, drive = o.drive || 0;
    const am = o.am || [], amPh = am.map(() => r() * 6.28);
    let nz = 0, peak = 1e-9;
    const tmp = new Float32Array(n), envs = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      if ((i & 31) === 0) setR(t);
      let f = fAt(t) * (o.pitch || 1);
      if (o.vib) { vibPh += 2 * Math.PI * o.vib[0] / sr; f += Math.sin(vibPh) * o.vib[1]; }
      ph += f * jf / sr;
      if (ph >= 1) {
        ph -= 1; odd ^= 1;
        jf = 1 + jit * vGauss(r);
        amp = Math.max(0, 1 + shim * vGauss(r)) * (sub && odd ? 1 - sub : 1) * (rough ? 1 - rough * r() : 1);
      }
      // glottal flow (Rosenberg) and its slope: lip radiation makes the slope what we hear
      const g = ph < Tp ? 0.5 * (1 - Math.cos(Math.PI * ph / Tp)) : ph < Tp + Tn ? Math.cos(Math.PI / 2 * (ph - Tp) / Tn) : 0;
      const dg = (g - prev) * sr / Math.max(40, f) * 0.12; prev = g;
      nz = nz * 0.3 + (r() * 2 - 1) * 0.7;
      let x = dg * amp * (1 - breath * 0.55) + nz * breath * (0.25 + 0.75 * g) * 0.9;
      for (let q = 0; q < 4; q++) { const c = R[q], y = c.b0 * x + c.a1 * c.y1 + c.a2 * c.y2; c.y2 = c.y1; c.y1 = y; x = y; }
      lp += (x - lp) * 0.6;
      tmp[i] = lp; if (Math.abs(lp) > peak) peak = Math.abs(lp);
      let env = i < att ? Math.sin(Math.PI / 2 * i / att) : 1;
      if (i > n - rel) env *= Math.pow((n - i) / rel, 1.4);
      for (let j = 0; j < am.length; j++) env *= 1 - am[j][1] * (0.5 + 0.5 * Math.sin(amPh[j] + 2 * Math.PI * am[j][0] * i / sr));
      envs[i] = env;
    }
    // the tract rings loud: bring it to a known level before the grit and the envelope
    const g = (o.gain ?? 1) / peak, dn = drive ? Math.tanh(1 + drive) : 1;
    for (let i = 0; i < n; i++) { let y = tmp[i] * g; if (drive) y = Math.tanh(y * (1 + drive)) / dn; d[i0 + i] += y * envs[i]; }
  },
  // Breath without a voice: hisses, whispers, snorts, a cat's spit. Shaped by vowels too (o.v) or one band (o.f).
  hiss(t0, dur, o) {
    const sr = this.sr, d = this.d, r = this.r, i0 = Math.floor(t0 * sr), n = Math.min(Math.floor(dur * sr), d.length - i0);
    if (n <= 0) return;
    const bands = o.bands || [[o.f || 4000, o.q || 1.2, 1]];
    const cs = bands.map(([f, q]) => sndBiquad('bp', f, q, sr));
    const att = Math.max(1, Math.floor((o.att ?? 0.05) * sr)), rel = Math.floor(n * (o.rel ?? 0.5)), am = o.am || [];
    for (let i = 0; i < n; i++) {
      const x = r() * 2 - 1;
      let y = 0; for (let b = 0; b < cs.length; b++) y += sndRun(cs[b], x) * bands[b][2];
      let env = i < att ? i / att : 1;
      if (i > n - rel) env *= (n - i) / rel;
      for (const [rate, dep] of am) env *= 1 - dep * (0.5 + 0.5 * Math.sin(2 * Math.PI * rate * i / sr));
      if (o.gate) env *= Math.sin(2 * Math.PI * o.gate * i / sr) > 0 ? 1 : 0.15;    // a rattle's buzz
      d[i0 + i] += y * env * (o.gain ?? 1);
    }
  },
  // Bone on bone, chitin on chitin: a dry click that rings a moment.
  clack(t0, f, gain, ring = 0.012) {
    this.modes(t0, [[f, ring, 1], [f * 2.37, ring * 0.6, 0.5], [f * 4.1, ring * 0.35, 0.25]], gain);
    this.noise(t0, 0.004, 'bp', f * 1.6, 1.5, gain * 0.6, { att: 0.0004 });
  },
  // The space around it: a small room's reflections, mixed in.
  room(mix = 0.15, size = 1) {
    const d = this.d, sr = this.sr, out = new Float32Array(d.length);
    const combs = [0.0297, 0.0371, 0.0411, 0.0437].map(s => ({ buf: new Float32Array(Math.floor(s * size * sr)), p: 0, lp: 0 }));
    const fb = 0.72 + Math.min(0.2, (size - 1) * 0.1);
    for (let i = 0; i < d.length; i++) {
      let s = 0;
      for (const c of combs) { const y = c.buf[c.p]; c.lp = y * 0.6 + c.lp * 0.4; c.buf[c.p] = d[i] + c.lp * fb; c.p = (c.p + 1) % c.buf.length; s += y; }
      out[i] = s * 0.25;
    }
    for (let i = 0; i < d.length; i++) d[i] = d[i] * (1 - mix * 0.5) + out[i] * mix;
  },
  // Dull or thin the whole take.
  shape(type, f, q = 0.7) { const c = sndBiquad(type, f, q, this.sr), d = this.d; for (let i = 0; i < d.length; i++) d[i] = sndRun(c, d[i]); },
});

// ---- the creatures --------------------------------------------------------------------------------------
// VOX[voice] = { say, hurt, death, angry }: each [seconds, loudness, recipe(b, take, rand), pitch wobble between plays]
const vp = (r, a) => 1 + (r() - 0.5) * a;     // a take's own pitch
const VOX = {
  // ---- the undead ----
  ghoul: {
    say: [1.9, 0.8, (b, v, r) => { const p = vp(r, 0.25); b.throat(0, 1.3 + r() * 0.35, { f: [[0, 96 * p], [0.2, 108 * p], [0.55, 90 * p], [1, 68 * p]], v: ['uoxr', 'xoux', 'ouar'][v % 3], k: 0.9, breath: 0.34, sub: 0.32, rough: 0.28, jit: 0.035, am: [[5 + r() * 3, 0.3]], drive: 1.4, att: 0.12 }); b.room(0.16); }],
    hurt: [0.6, 0.85, (b, v, r) => { const p = vp(r, 0.2); b.throat(0, 0.38, { f: [[0, 175 * p], [0.25, 168 * p], [1, 108 * p]], v: 'axo', k: 0.92, breath: 0.38, sub: 0.25, rough: 0.2, att: 0.012, drive: 2, rel: 0.6 }); b.room(0.12); }],
    death: [1.8, 0.85, (b, v, r) => { const p = vp(r, 0.15); b.throat(0, 1.4, { f: [[0, 150 * p], [0.3, 128 * p], [0.7, 85 * p], [1, 52 * p]], v: 'aoux', k: 0.9, breath: 0.42, sub: 0.45, rough: 0.4, am: [[16, 0.35]], att: 0.02, drive: 1.6, rel: 0.6 }); b.room(0.18); }],
  },
  husk: {
    say: [1.8, 0.8, (b, v, r) => { const p = vp(r, 0.2); b.throat(0, 1.25, { f: [[0, 88 * p], [0.3, 98 * p], [1, 64 * p]], v: 'xaox', k: 0.95, breath: 0.62, sub: 0.3, rough: 0.35, jit: 0.04, am: [[4, 0.25]], drive: 1.2, att: 0.1 }); b.hiss(0.1, 1.0, { f: 2600, q: 0.8, gain: 0.08, att: 0.2 }); b.room(0.12); }],
    hurt: [0.55, 0.85, (b, v, r) => { const p = vp(r, 0.2); b.throat(0, 0.36, { f: [[0, 160 * p], [1, 100 * p]], v: 'ax', k: 0.95, breath: 0.6, sub: 0.25, rough: 0.3, att: 0.012, drive: 1.6, rel: 0.6 }); b.room(0.1); }],
    death: [1.6, 0.85, (b, v, r) => { b.throat(0, 1.3, { f: [[0, 140], [0.4, 110], [1, 48]], v: 'axu', k: 0.95, breath: 0.65, sub: 0.4, rough: 0.4, att: 0.02, rel: 0.65 }); b.grains(0.6, 0.8, 40, 1500, 6000, 1.5, 0.12, { fade: true }); b.room(0.12); }],
  },
  drowned: {
    say: [1.9, 0.8, (b, v, r) => { const p = vp(r, 0.2); b.throat(0, 1.4, { f: [[0, 92 * p], [0.4, 100 * p], [1, 70 * p]], v: 'uoux', k: 0.85, breath: 0.3, sub: 0.35, rough: 0.35, am: [[11 + r() * 6, 0.45], [3, 0.2]], drive: 1.2, att: 0.1 }); for (let i = 0; i < 10; i++) b.modes(0.1 + r() * 1.2, [[350 + r() * 700, 0.014, 1]], 0.12, { droop: -0.5 }); b.shape('lp', 2200); b.room(0.2); }],
    hurt: [0.6, 0.85, (b, v, r) => { const p = vp(r, 0.2); b.throat(0, 0.4, { f: [[0, 165 * p], [1, 105 * p]], v: 'oxu', k: 0.86, breath: 0.35, sub: 0.3, am: [[14, 0.4]], att: 0.012, drive: 1.6, rel: 0.6 }); for (let i = 0; i < 4; i++) b.modes(0.05 + r() * 0.3, [[400 + r() * 600, 0.012, 1]], 0.12, { droop: -0.5 }); b.shape('lp', 2400); b.room(0.15); }],
    death: [1.8, 0.85, (b, v, r) => { b.throat(0, 1.3, { f: [[0, 140], [0.5, 100], [1, 50]], v: 'oux', k: 0.85, breath: 0.4, sub: 0.45, am: [[18, 0.5]], att: 0.02, rel: 0.6 }); for (let i = 0; i < 16; i++) b.modes(0.3 + r() * 1.3, [[300 + r() * 900, 0.016, 1]], 0.14, { droop: -0.6 }); b.shape('lp', 2200); b.room(0.2); }],
  },
  rattle: {   // skeletons: a dry clatter of loose bones
    say: [0.9, 0.7, (b, v, r) => { let t = 0; const n = 7 + Math.floor(r() * 7); for (let i = 0; i < n; i++) { t += 0.025 + r() * 0.06; b.clack(t, 1200 + r() * 1600, 0.5 + r() * 0.5, 0.008 + r() * 0.01); } b.noise(0.02, t, 'bp', 900, 0.8, 0.08, { att: 0.05 }); b.room(0.14); }],
    hurt: [0.5, 0.8, (b, v, r) => { b.clack(0, 900 + r() * 300, 1, 0.02); for (let i = 0; i < 6; i++) b.clack(0.02 + i * (0.02 + r() * 0.03), 1400 + r() * 1500, 0.6, 0.008); b.thump(0, 180, 90, 0.07, 0.4); b.room(0.12); }],
    death: [1.6, 0.85, (b, v, r) => { for (let i = 0; i < 26; i++) { const t = Math.pow(r(), 0.7) * 1.1; b.clack(t, 500 + r() * 2200 * (1 - t * 0.5), 0.5 + r() * 0.5, 0.01 + r() * 0.03); } b.noise(0.1, 0.5, 'lp', 600, 0.8, 0.3, { brown: true }); b.room(0.16); }],
  },
  stray: {
    say: [1.1, 0.7, (b, v, r) => { let t = 0; for (let i = 0; i < 8; i++) { t += 0.03 + r() * 0.06; b.clack(t, 1700 + r() * 1800, 0.45, 0.008); } b.hiss(0, 0.9, { bands: [[3800, 1.2, 1], [6500, 1.5, 0.6]], gain: 0.25, att: 0.25, am: [[2, 0.4]] }); b.room(0.18); }],
    hurt: [0.5, 0.8, (b, v, r) => { b.clack(0, 1100, 1, 0.02); for (let i = 0; i < 5; i++) b.clack(0.02 + i * 0.03, 1800 + r() * 1500, 0.6, 0.008); b.hiss(0, 0.25, { f: 5000, q: 1, gain: 0.3, att: 0.005 }); b.room(0.12); }],
    death: [1.6, 0.85, (b, v, r) => { for (let i = 0; i < 22; i++) b.clack(Math.pow(r(), 0.7) * 1.1, 700 + r() * 2500, 0.5 + r() * 0.5, 0.012 + r() * 0.025); b.hiss(0, 1.3, { f: 4500, q: 0.9, gain: 0.25, att: 0.01, rel: 0.8 }); b.room(0.16); }],
  },
  // ---- crawling things ----
  spider: {
    say: [0.9, 0.65, (b, v, r) => { b.hiss(0, 0.6 + r() * 0.2, { bands: [[3600, 1.5, 1], [5600, 2, 0.6], [1800, 1.2, 0.3]], gain: 0.5, att: 0.06, am: [[24 + r() * 10, 0.55]] }); let t = 0.05; for (let i = 0; i < 7; i++) { t += 0.04 + r() * 0.05; b.clack(t, 2600 + r() * 1800, 0.35, 0.005); } b.room(0.1); }],
    hurt: [0.45, 0.8, (b, v, r) => { b.throat(0, 0.28, { f: [[0, 820], [1, 640]], v: 'ie', k: 1.7, breath: 0.85, att: 0.006, rel: 0.7 }); b.hiss(0, 0.3, { f: 4200, q: 1.4, gain: 0.4, att: 0.004 }); b.clack(0, 2400, 0.5, 0.006); }],
    death: [1.1, 0.8, (b, v, r) => { b.throat(0, 0.8, { f: [[0, 700], [1, 300]], v: 'iex', k: 1.6, breath: 0.9, att: 0.01, rel: 0.7 }); b.hiss(0, 0.9, { f: 3800, q: 1.2, gain: 0.35, att: 0.01, rel: 0.8, am: [[30, 0.5]] }); for (let i = 0; i < 10; i++) b.clack(r() * 0.8, 2000 + r() * 2000, 0.3, 0.006); b.room(0.1); }],
  },
  mite: {   // stone mites: a squeaking chitter
    say: [0.6, 0.55, (b, v, r) => { let t = 0; for (let i = 0; i < 9; i++) { t += 0.02 + r() * 0.04; b.clack(t, 3200 + r() * 2500, 0.4, 0.004); } b.throat(0.05, 0.12, { f: [[0, 1900], [1, 2300]], v: 'i', k: 2, breath: 0.5, att: 0.005 }); }],
    hurt: [0.3, 0.7, (b, v, r) => { b.throat(0, 0.14, { f: [[0, 2400], [1, 1900]], v: 'ie', k: 2, breath: 0.5, att: 0.004 }); b.clack(0, 3500, 0.5, 0.004); }],
    death: [0.6, 0.75, (b, v, r) => { b.throat(0, 0.4, { f: [[0, 2600], [1, 1200]], v: 'iex', k: 2, breath: 0.6, att: 0.004, rel: 0.7 }); for (let i = 0; i < 6; i++) b.clack(r() * 0.35, 3000 + r() * 2000, 0.3, 0.004); }],
  },
  scorpion: {
    say: [0.7, 0.55, (b, v, r) => { let t = 0; for (let i = 0; i < 10; i++) { t += 0.02 + r() * 0.04; b.clack(t, 1800 + r() * 2200, 0.45, 0.006); } b.hiss(0, 0.5, { f: 3200, q: 1.3, gain: 0.2, att: 0.05 }); }],
    hurt: [0.4, 0.75, (b, v, r) => { b.hiss(0, 0.25, { f: 3800, q: 1.2, gain: 0.5, att: 0.004 }); for (let i = 0; i < 4; i++) b.clack(i * 0.03, 2000 + r() * 1500, 0.5, 0.006); }],
    death: [0.9, 0.75, (b, v, r) => { b.hiss(0, 0.7, { f: 3000, q: 1, gain: 0.4, att: 0.01, rel: 0.8, am: [[18, 0.5]] }); for (let i = 0; i < 12; i++) b.clack(r() * 0.7, 1500 + r() * 2500, 0.35, 0.006); }],
  },
  snake: {
    say: [1.0, 0.6, (b, v, r) => { b.hiss(0, 0.6 + r() * 0.3, { bands: [[5200, 1.4, 1], [7800, 1.8, 0.5], [3000, 1.3, 0.3]], gain: 0.6, att: 0.08, rel: 0.4, am: [[3, 0.15]] }); }],
    hurt: [0.5, 0.75, (b, v, r) => { b.hiss(0, 0.35, { bands: [[4600, 1.2, 1], [7000, 1.5, 0.5]], gain: 0.8, att: 0.004, rel: 0.6 }); }],
    death: [1.0, 0.7, (b, v, r) => { b.hiss(0, 0.9, { bands: [[4200, 1.1, 1], [6800, 1.5, 0.4]], gain: 0.6, att: 0.01, rel: 0.9, am: [[6, 0.4]] }); }],
  },
  rattlesnake: {
    say: [1.4, 0.6, (b, v, r) => { b.hiss(0, 1.2, { bands: [[3800, 0.9, 1], [7000, 1.2, 0.6]], gain: 0.55, att: 0.04, rel: 0.25, gate: 46 + r() * 8 }); }],
    hurt: [0.5, 0.75, (b, v, r) => { b.hiss(0, 0.35, { bands: [[4600, 1.2, 1], [7000, 1.5, 0.5]], gain: 0.8, att: 0.004, rel: 0.6 }); }],
    death: [1.0, 0.7, (b, v, r) => { b.hiss(0, 0.9, { bands: [[3800, 1, 1]], gain: 0.5, att: 0.01, rel: 0.9, gate: 30 }); }],
  },
  // ---- slimes ----
  squish: {
    say: [0.45, 0.7, (b, v, r) => { b.thump(0, 140 + r() * 40, 55, 0.18, 0.7); b.noise(0, 0.12, 'lp', 700, 0.9, 0.5, { att: 0.006 }); for (let i = 0; i < 4; i++) b.modes(0.02 + r() * 0.15, [[300 + r() * 500, 0.02, 1]], 0.2, { droop: -0.5 }); }],
    hurt: [0.4, 0.8, (b, v, r) => { b.thump(0, 220, 90, 0.12, 0.6); b.noise(0, 0.1, 'lp', 1100, 0.9, 0.5, { att: 0.003 }); for (let i = 0; i < 3; i++) b.modes(r() * 0.1, [[500 + r() * 700, 0.015, 1]], 0.2, { droop: -0.5 }); }],
    death: [0.7, 0.85, (b, v, r) => { b.thump(0, 120, 40, 0.3, 0.8); b.noise(0, 0.3, 'lp', 900, 0.8, 0.6, { att: 0.004 }); for (let i = 0; i < 9; i++) b.modes(r() * 0.4, [[250 + r() * 800, 0.02, 1]], 0.2, { droop: -0.6 }); }],
  },
  magma: {
    say: [0.6, 0.7, (b, v, r) => { b.thump(0, 110, 45, 0.22, 0.75); b.noise(0, 0.14, 'lp', 600, 0.9, 0.45); b.hiss(0.05, 0.45, { f: 5000, q: 0.8, gain: 0.15, att: 0.02 }); for (let i = 0; i < 4; i++) b.modes(r() * 0.3, [[180 + r() * 300, 0.03, 1]], 0.2, { droop: -0.5 }); }],
    hurt: [0.45, 0.8, (b, v, r) => { b.thump(0, 180, 70, 0.14, 0.6); b.hiss(0, 0.35, { f: 4500, q: 0.8, gain: 0.3, att: 0.004 }); }],
    death: [0.9, 0.85, (b, v, r) => { b.thump(0, 100, 35, 0.35, 0.8); b.hiss(0, 0.8, { f: 4000, q: 0.7, gain: 0.35, att: 0.01, rel: 0.8 }); for (let i = 0; i < 8; i++) b.modes(r() * 0.5, [[150 + r() * 400, 0.03, 1]], 0.2, { droop: -0.6 }); }],
  },
  // ---- the fuseling: a woody thing that creaks and rustles; its fuse fizzes ----
  fuseling: {
    say: [0.6, 0.55, (b, v, r) => { b.grains(0, 0.45, 30, 1500, 6000, 1.5, 0.3, { dMax: 0.02 }); b.noise(0, 0.4, 'bp', 700, 3, 0.12, { att: 0.1 }); }],
    hurt: [0.5, 0.8, (b, v, r) => { b.throat(0, 0.3, { f: [[0, 130], [1, 90]], v: 'rx', k: 1, breath: 0.85, sub: 0.4, rough: 0.5, att: 0.008, rel: 0.6 }); b.grains(0, 0.25, 22, 1200, 5000, 1.5, 0.35); b.modes(0, [[240 + r() * 60, 0.03, 1], [620, 0.015, 0.4]], 0.35); }],
    death: [1.0, 0.85, (b, v, r) => { b.throat(0, 0.7, { f: [[0, 120], [1, 60]], v: 'rxu', k: 1, breath: 0.85, sub: 0.5, rough: 0.5, att: 0.01, rel: 0.7 }); b.grains(0, 0.8, 50, 900, 5000, 1.5, 0.3, { fade: true }); b.modes(0.05, [[160, 0.08, 1], [430, 0.03, 0.4]], 0.4); }],
  },
  hiss: {
    say: [1.6, 0.7, (b, v, r) => { b.hiss(0, 1.5, { bands: [[3000, 0.8, 0.7], [6000, 1, 1]], gain: 0.5, att: 0.3, rel: 0.12, am: [[13, 0.2]] }); b.grains(0.1, 1.3, 70, 2000, 8000, 2, 0.18, { front: 0.8 }); }],
  },
  // ---- people of a sort ----
  witch: {
    say: [1.3, 0.7, (b, v, r) => { const p = vp(r, 0.15);
      if (v % 2) { let t = 0; for (let i = 0; i < 4 + (v % 3); i++) { b.throat(t, 0.13, { f: [[0, 330 * p * (1 - i * 0.04)], [1, 290 * p * (1 - i * 0.04)]], v: 'ea', k: 1.15, breath: 0.55, att: 0.01, rel: 0.5, open: 0.4 }); b.hiss(t, 0.06, { f: 2500, q: 0.8, gain: 0.15, att: 0.004 }); t += 0.15 + r() * 0.03; } }
      else b.throat(0, 0.9, { f: [[0, 230 * p], [0.4, 260 * p], [1, 210 * p]], v: 'mmnm', k: 1.1, breath: 0.25, att: 0.06, vib: [5, 6] });
      b.room(0.14); }],
    hurt: [0.5, 0.85, (b, v, r) => { const p = vp(r, 0.15); b.throat(0, 0.32, { f: [[0, 400 * p], [0.3, 430 * p], [1, 300 * p]], v: 'ax', k: 1.15, breath: 0.45, att: 0.008, rel: 0.6, open: 0.4 }); b.room(0.1); }],
    death: [1.5, 0.85, (b, v, r) => { b.throat(0, 1.2, { f: [[0, 420], [0.3, 380], [1, 160]], v: 'aaox', k: 1.15, breath: 0.5, att: 0.02, rel: 0.6, vib: [6, 12], open: 0.4 }); b.room(0.16); }],
  },
  raider: {
    say: [1.0, 0.7, (b, v, r) => { const p = vp(r, 0.2), n = 1 + (v % 3); let t = 0; const vw = ['xm', 'ox', 'ax', 'mx', 'ex'];
      for (let i = 0; i < n; i++) { const L = 0.16 + r() * 0.16; b.throat(t, L, { f: [[0, 125 * p], [0.5, 135 * p], [1, 105 * p]], v: vw[Math.floor(r() * vw.length)], k: 1, breath: 0.3, att: 0.015, rel: 0.5, rough: 0.1 }); t += L + 0.04 + r() * 0.06; }
      b.room(0.12); }],
    hurt: [0.45, 0.85, (b, v, r) => { const p = vp(r, 0.2); b.throat(0, 0.24, { f: [[0, 165 * p], [0.2, 172 * p], [1, 120 * p]], v: 'ax', k: 1, breath: 0.4, sub: 0.15, att: 0.006, rel: 0.6, drive: 1 }); b.room(0.1); }],
    death: [1.4, 0.85, (b, v, r) => { b.throat(0, 1.0, { f: [[0, 180], [0.25, 175], [1, 82]], v: 'aaox', k: 1, breath: 0.45, sub: 0.2, att: 0.01, rel: 0.6 }); b.room(0.14); }],
  },
  ogre: {
    say: [1.3, 0.85, (b, v, r) => { const p = vp(r, 0.15); b.throat(0, 0.7 + r() * 0.3, { f: [[0, 66 * p], [0.3, 74 * p], [1, 54 * p]], v: v % 2 ? 'mxo' : 'oxr', k: 0.72, breath: 0.3, sub: 0.45, rough: 0.25, att: 0.03, drive: 1.8 }); b.thump(0, 70, 40, 0.15, 0.2); b.room(0.2, 1.3); }],
    hurt: [0.6, 0.9, (b, v, r) => { b.throat(0, 0.36, { f: [[0, 105], [1, 70]], v: 'ux', k: 0.72, breath: 0.35, sub: 0.4, att: 0.01, drive: 2, rel: 0.6 }); b.room(0.15, 1.3); }],
    death: [2.0, 0.95, (b, v, r) => { b.throat(0, 1.6, { f: [[0, 95], [0.3, 82], [1, 38]], v: 'oxu', k: 0.72, breath: 0.4, sub: 0.55, rough: 0.35, att: 0.02, rel: 0.6, drive: 1.6 }); b.thump(1.2, 60, 30, 0.4, 0.6); b.room(0.2, 1.4); }],
  },
  // ---- beasts ----
  werewolf: {
    say: [2.0, 0.8, (b, v, r) => { const p = vp(r, 0.12);
      if (v % 2) b.throat(0, 1.8, { f: [[0, 330 * p], [0.25, 560 * p], [0.75, 520 * p], [1, 380 * p]], v: 'uoou', k: 1.0, breath: 0.12, vib: [5, 12], att: 0.15, rel: 0.4 });
      else b.throat(0, 1.1, { f: [[0, 78 * p], [0.5, 86 * p], [1, 70 * p]], v: 'rxr', k: 0.95, breath: 0.45, sub: 0.6, rough: 0.5, am: [[24, 0.35]], drive: 2.4, att: 0.1 });
      b.room(0.2, 1.3); }],
    hurt: [0.5, 0.85, (b, v, r) => { b.throat(0, 0.3, { f: [[0, 700], [0.3, 760], [1, 420]], v: 'ie', k: 1.05, breath: 0.4, att: 0.006, rel: 0.6, drive: 1.2 }); b.room(0.1); }],
    death: [2.0, 0.85, (b, v, r) => { b.throat(0, 1.7, { f: [[0, 520], [0.4, 430], [1, 160]], v: 'ouux', k: 1.0, breath: 0.2, vib: [5, 10], att: 0.02, rel: 0.6 }); b.room(0.2, 1.3); }],
    angry: [1.2, 0.85, (b, v, r) => { b.throat(0, 1.0, { f: [[0, 90], [0.5, 100], [1, 80]], v: 'rar', k: 0.95, breath: 0.5, sub: 0.65, rough: 0.55, am: [[28, 0.35]], drive: 2.8, att: 0.04 }); }],
  },
  croc: {
    say: [1.4, 0.75, (b, v, r) => { b.thump(0, 48, 34, 1.0, 0.5); b.throat(0, 1.1, { f: [[0, 42], [1, 38]], v: 'uo', k: 0.6, breath: 0.4, sub: 0.6, rough: 0.6, am: [[9, 0.5]], att: 0.15 }); b.hiss(0.2, 0.7, { f: 2400, q: 0.8, gain: 0.1, att: 0.2 }); b.room(0.14); }],
    hurt: [0.6, 0.85, (b, v, r) => { b.hiss(0, 0.45, { bands: [[2500, 0.9, 1], [5000, 1.2, 0.5]], gain: 0.7, att: 0.005, rel: 0.6 }); b.thump(0, 90, 50, 0.15, 0.4); }],
    death: [1.4, 0.85, (b, v, r) => { b.hiss(0, 1.1, { f: 2200, q: 0.8, gain: 0.5, att: 0.01, rel: 0.85 }); b.throat(0.1, 1.1, { f: [[0, 60], [1, 34]], v: 'uo', k: 0.6, breath: 0.5, sub: 0.6, rough: 0.6, att: 0.1, rel: 0.7 }); }],
  },
  lion: {
    say: [2.4, 0.95, (b, v, r) => { const p = vp(r, 0.12);
      if (v % 3 === 0) b.throat(0, 2.0, { f: [[0, 95 * p], [0.2, 170 * p], [0.45, 185 * p], [1, 85 * p]], v: 'oaoux', k: 0.78, breath: 0.4, sub: 0.45, rough: 0.35, drive: 2.2, att: 0.2, rel: 0.55 });
      else { let t = 0; for (let i = 0; i < 3; i++) { b.throat(t, 0.5, { f: [[0, 110 * p], [0.3, 140 * p], [1, 80 * p]], v: 'oux', k: 0.78, breath: 0.45, sub: 0.4, rough: 0.3, drive: 1.8, att: 0.04, rel: 0.6 }); t += 0.58 + r() * 0.1; } }
      b.room(0.2, 1.4); }],
    hurt: [0.6, 0.9, (b, v, r) => { b.throat(0, 0.4, { f: [[0, 260], [0.3, 300], [1, 160]], v: 'ar', k: 0.8, breath: 0.5, sub: 0.35, rough: 0.35, drive: 2, att: 0.008, rel: 0.6 }); b.room(0.12); }],
    death: [1.8, 0.9, (b, v, r) => { b.throat(0, 1.5, { f: [[0, 200], [0.3, 170], [1, 60]], v: 'aoux', k: 0.8, breath: 0.5, sub: 0.5, rough: 0.4, att: 0.02, rel: 0.6, drive: 1.6 }); b.room(0.18, 1.3); }],
    angry: [1.0, 0.95, (b, v, r) => { b.throat(0, 0.8, { f: [[0, 150], [0.3, 210], [1, 120]], v: 'arx', k: 0.8, breath: 0.6, sub: 0.5, rough: 0.5, drive: 2.6, att: 0.02 }); b.hiss(0, 0.6, { f: 3000, q: 0.7, gain: 0.25, att: 0.01 }); }],
  },
  bigcat: {   // tigers, panthers, snow leopards: chuffs, growls, and a snarl
    say: [1.4, 0.8, (b, v, r) => { const p = vp(r, 0.18);
      if (v % 2) { for (let i = 0; i < 2 + (v % 3); i++) { b.hiss(i * 0.32, 0.18, { bands: [[900, 1, 1], [2400, 1, 0.4]], gain: 0.6, att: 0.01, rel: 0.6 }); b.throat(i * 0.32, 0.16, { f: [[0, 120 * p], [1, 95 * p]], v: 'ox', k: 0.85, breath: 0.8, att: 0.01, rel: 0.6 }); } }
      else b.throat(0, 1.1, { f: [[0, 85 * p], [0.5, 95 * p], [1, 75 * p]], v: 'rxr', k: 0.85, breath: 0.45, sub: 0.55, rough: 0.45, am: [[22, 0.3]], drive: 2.2, att: 0.1 });
      b.room(0.16, 1.2); }],
    hurt: [0.55, 0.9, (b, v, r) => { b.throat(0, 0.36, { f: [[0, 300], [0.25, 340], [1, 180]], v: 'ar', k: 0.88, breath: 0.6, sub: 0.3, rough: 0.4, drive: 2, att: 0.006, rel: 0.6 }); b.hiss(0, 0.3, { f: 3200, q: 0.8, gain: 0.25, att: 0.004 }); }],
    death: [1.5, 0.9, (b, v, r) => { b.throat(0, 1.2, { f: [[0, 240], [0.3, 200], [1, 70]], v: 'aoux', k: 0.88, breath: 0.55, sub: 0.45, rough: 0.4, att: 0.02, rel: 0.6, drive: 1.4 }); b.room(0.16); }],
    angry: [0.9, 0.95, (b, v, r) => { b.hiss(0, 0.7, { bands: [[2800, 0.8, 1], [5000, 1.2, 0.5]], gain: 0.6, att: 0.01, rel: 0.5 }); b.throat(0, 0.75, { f: [[0, 160], [0.3, 220], [1, 130]], v: 'arx', k: 0.88, breath: 0.6, sub: 0.5, rough: 0.5, drive: 2.6, att: 0.02 }); }],
  },
  // ---- spirits ----
  wraith: {
    say: [2.6, 0.7, (b, v, r) => { const p = vp(r, 0.2); b.throat(0, 1.9, { f: [[0, 150 * p], [0.3, 175 * p], [0.7, 140 * p], [1, 110 * p]], v: 'uoou', k: 1.05, breath: 0.88, vib: [4, 6], att: 0.5, rel: 0.5 }); b.hiss(0.2, 1.6, { bands: [[1200, 3, 0.6], [2600, 4, 0.5]], gain: 0.25, att: 0.4, am: [[1.3, 0.5]] }); b.room(0.38, 1.8); }],
    hurt: [0.9, 0.8, (b, v, r) => { b.throat(0, 0.5, { f: [[0, 640], [0.3, 760], [1, 520]], v: 'ie', k: 1.2, breath: 0.8, att: 0.01, rel: 0.6, vib: [7, 15] }); b.room(0.35, 1.6); }],
    death: [2.6, 0.85, (b, v, r) => { b.throat(0, 1.9, { f: [[0, 700], [0.3, 560], [1, 120]], v: 'iaou', k: 1.15, breath: 0.85, att: 0.02, rel: 0.7, vib: [6, 18] }); b.room(0.4, 1.8); }],
  },
  wisp: {   // cinder wisps breathe like a bellows full of embers
    say: [1.4, 0.7, (b, v, r) => { b.hiss(0, 0.55, { bands: [[700, 0.8, 1], [1800, 1, 0.5]], gain: 0.6, att: 0.35, rel: 0.4 }); b.hiss(0.62, 0.6, { bands: [[600, 0.8, 1], [1500, 1, 0.4]], gain: 0.55, att: 0.08, rel: 0.7 }); for (let i = 0; i < 8; i++) b.noise(r() * 1.2, 0.004 + r() * 0.006, 'bp', 1500 + r() * 4000, 2, 0.3 + r() * 0.4); b.room(0.15); }],
    hurt: [0.5, 0.8, (b, v, r) => { b.modes(0, [[420 + r() * 80, 0.04, 1], [1100, 0.02, 0.4]], 0.5); b.hiss(0, 0.35, { f: 2200, q: 0.8, gain: 0.5, att: 0.004 }); for (let i = 0; i < 5; i++) b.noise(r() * 0.3, 0.005, 'bp', 2000 + r() * 4000, 2, 0.4); }],
    death: [1.4, 0.85, (b, v, r) => { b.hiss(0, 1.2, { bands: [[1200, 0.7, 1], [4000, 1, 0.6]], gain: 0.6, att: 0.01, rel: 0.85 }); b.thump(0, 90, 40, 0.3, 0.6); b.grains(0, 1.0, 40, 1500, 7000, 2, 0.25, { fade: true, front: 1.5 }); b.room(0.15); }],
  },
  // ---- the farm, redone with the new throat ----
  moo: {
    say: [1.7, 0.75, (b, v, r) => { const p = vp(r, 0.14); b.throat(0, 1.2 + r() * 0.3, { f: [[0, 112 * p], [0.15, 124 * p], [0.7, 116 * p], [1, 96 * p]], v: 'mmuoo', k: 0.82, breath: 0.12, sub: 0.12, att: 0.06, rel: 0.35, vib: [3, 2] }); b.room(0.14, 1.2); }],
    hurt: [0.6, 0.8, (b, v, r) => { b.throat(0, 0.45, { f: [[0, 170], [1, 125]], v: 'muo', k: 0.84, breath: 0.2, att: 0.02, rel: 0.5 }); b.room(0.1); }],
    death: [1.5, 0.8, (b, v, r) => { b.throat(0, 1.2, { f: [[0, 150], [0.4, 128], [1, 70]], v: 'muox', k: 0.84, breath: 0.25, sub: 0.2, att: 0.02, rel: 0.6 }); b.room(0.12); }],
  },
  oink: {
    say: [0.7, 0.7, (b, v, r) => { const p = vp(r, 0.2), n = 1 + (v % 3 ? 1 : 0); for (let i = 0; i < n; i++) { const t = i * 0.22; b.throat(t, 0.17, { f: [[0, 235 * p], [1, 175 * p]], v: 'ox', k: 1.2, breath: 0.4, sub: 0.35, rough: 0.35, att: 0.01, rel: 0.6, drive: 1.2 }); b.hiss(t, 0.12, { f: 1400, q: 1.2, gain: 0.2, att: 0.004 }); } }],
    hurt: [0.45, 0.85, (b, v, r) => { b.throat(0, 0.3, { f: [[0, 520], [0.3, 600], [1, 400]], v: 'ie', k: 1.25, breath: 0.4, sub: 0.2, att: 0.006, rel: 0.6, drive: 1.4 }); }],
    death: [1.0, 0.85, (b, v, r) => { b.throat(0, 0.8, { f: [[0, 560], [0.3, 500], [1, 220]], v: 'iex', k: 1.25, breath: 0.45, sub: 0.3, att: 0.01, rel: 0.6, drive: 1.2 }); }],
  },
  baa: {
    say: [1.1, 0.7, (b, v, r) => { const p = vp(r, 0.18); b.throat(0, 0.75 + r() * 0.15, { f: [[0, 330 * p], [0.25, 380 * p], [1, 320 * p]], v: 'meea', k: 1.12, breath: 0.2, vib: [7.5, 22], am: [[19, 0.35]], att: 0.03, rel: 0.4 }); b.room(0.12); }],
    hurt: [0.5, 0.8, (b, v, r) => { b.throat(0, 0.35, { f: [[0, 440], [1, 380]], v: 'ea', k: 1.12, breath: 0.25, am: [[21, 0.4]], att: 0.01, rel: 0.5 }); }],
    death: [1.2, 0.8, (b, v, r) => { b.throat(0, 0.9, { f: [[0, 400], [0.4, 360], [1, 200]], v: 'eax', k: 1.12, breath: 0.3, am: [[17, 0.4]], att: 0.01, rel: 0.6 }); }],
  },
  cluck: {
    say: [0.8, 0.6, (b, v, r) => { const p = vp(r, 0.15), n = 2 + (v % 3); let t = 0; for (let i = 0; i < n; i++) { b.throat(t, 0.07, { f: [[0, 520 * p], [1, 430 * p]], v: 'ya', k: 1.35, breath: 0.35, att: 0.004, rel: 0.6, open: 0.4 }); t += 0.1 + r() * 0.08; } if (v % 2) b.throat(t + 0.05, 0.22, { f: [[0, 600 * p], [0.4, 760 * p], [1, 560 * p]], v: 'ae', k: 1.35, breath: 0.3, att: 0.01, rel: 0.5, open: 0.4 }); }],
    hurt: [0.4, 0.75, (b, v, r) => { b.throat(0, 0.22, { f: [[0, 900], [0.4, 1000], [1, 700]], v: 'ae', k: 1.4, breath: 0.45, att: 0.004, rel: 0.6, open: 0.4 }); }],
    death: [0.7, 0.75, (b, v, r) => { b.throat(0, 0.5, { f: [[0, 950], [1, 450]], v: 'aex', k: 1.4, breath: 0.5, att: 0.004, rel: 0.6, open: 0.4 }); b.grains(0.05, 0.4, 20, 1500, 5000, 1.5, 0.15); }],
  },
  // ---- you ----
  hurt: {
    say: [0.42, 0.85, (b, v, r) => { const p = vp(r, 0.12); b.throat(0, 0.2 + r() * 0.05, { f: [[0, 150 * p], [0.18, 168 * p], [1, 108 * p]], v: v % 2 ? 'ux' : 'ox', k: 1.0, breath: 0.32, sub: 0.08, att: 0.008, rel: 0.55, drive: 0.6 }); b.thump(0, 120, 70, 0.07, 0.25); b.room(0.08); }],
  },
};
// creatures that share a voice
VOX.player = { say: VOX.hurt.say, hurt: VOX.hurt.say, death: VOX.raider.death };
VOX.green_snake = VOX.snake; VOX.adder = VOX.snake;

{
  const basePlay = Sfx.prototype.play;
  Sfx.prototype.play = function (name) {
    if (!this.ctx || this.volume <= 0) return;
    const m = /^(.*?)(?:_(hurt|death|angry))?$/.exec(name), who = m[1], kind = m[2] || 'say';
    const set = VOX[who], spec = set && (set[kind] || (kind === 'angry' ? set.say : null));
    if (spec || SND.packs.has('mob.' + name)) {
      if (!this.ok('vx' + name, 0.08)) return;
      const pack = SND.packs.get('mob.' + name) || (name === 'hurt' && SND.packs.get('fx.hurt'));
      if (pack) { this.sample(pack, 0.95, 0.05); return; }
      this.sample(sndTakes(this.ctx, 'vx.' + name, spec), spec[1], spec[3] ?? 0.05);
      return;
    }
    return basePlay.call(this, name);
  };
  // render them in the background once sound is on
  const baseUnlock = Sfx.prototype.unlock;
  Sfx.prototype.unlock = function () {
    const fresh = !this.ctx;
    baseUnlock.call(this);
    if (!fresh || !this.ctx) return;
    const jobs = [];
    for (const [who, set] of Object.entries(VOX)) for (const [kind, spec] of Object.entries(set)) jobs.push(['vx.' + who + (kind === 'say' ? '' : '_' + kind), spec]);
    const step = () => { const t0 = performance.now(); while (jobs.length && performance.now() - t0 < 6) { const [k, sp] = jobs.shift(); sndTakes(this.ctx, k, sp); } if (jobs.length) setTimeout(step, 45); };
    setTimeout(step, 2500);
  };
}
