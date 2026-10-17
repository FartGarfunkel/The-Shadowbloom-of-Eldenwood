// ---------------------------------------------------------------------------
// game/sounds2.js — creature voices and the dark.
//
// Every animal and monster gets a voice made the way real calls are: a buzzy
// source (the throat) through two or three vowel resonances (the mouth),
// with a pitch curve, vibrato, a tremble or a growl, and breath. Each voice
// has a hurt and a death version (higher and shorter, lower and longer).
// Caves get their own unsettling repertoire: far-off digging, footsteps that
// aren't yours, scrapes, whispers, a low moan, slow breathing.
// Sounds placed in the world are panned left and right by where they are.
// ---------------------------------------------------------------------------

// Vowel resonances in Hz (first three formants).
const VOWELS = {
  a: [730, 1090, 2440], o: [570, 840, 2410], u: [300, 870, 2240], e: [530, 1840, 2480], i: [270, 2290, 3010],
  m: [250, 1100, 2400], r: [490, 1350, 1690], y: [400, 1600, 2600],
};

Object.assign(Sfx.prototype, {
  // A voice: o = { f: [[t, Hz]...] pitch curve (t from 0 to 1), dur, v: 'mua' vowels in order, k: size of the
  // mouth (bigger = smaller animal), gain, wave, vib: [rate, Hz], am: [rate, depth], noise: breath 0..1,
  // lp: dull it, delay, pitch: multiplier, att, hold, pan }
  voice(o) {
    const c = this.ctx; if (!c) return;
    const t0 = c.currentTime + (o.delay || 0), dur = Math.max(0.05, o.dur || 0.5), out = this.out || this.master, pm = o.pitch || 1;
    const osc = c.createOscillator(); osc.type = o.wave || 'sawtooth';
    const pts = o.f || [[0, 200], [1, 200]];
    osc.frequency.setValueAtTime(Math.max(20, pts[0][1] * pm), t0);
    for (let i = 1; i < pts.length; i++) osc.frequency.linearRampToValueAtTime(Math.max(20, pts[i][1] * pm), t0 + pts[i][0] * dur);
    const stops = [osc];
    if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1] * pm; l.connect(lg); lg.connect(osc.frequency); stops.push(l); }
    const pre = c.createGain(); pre.gain.value = 1; osc.connect(pre);
    if (o.noise) { const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true; const ng = c.createGain(); ng.gain.value = o.noise * 2.2; n.connect(ng); ng.connect(pre); stops.push(n); }
    const env = c.createGain();
    const vs = (o.v || 'a').split('').map(ch => VOWELS[ch] || VOWELS.a), k = o.k || 1;
    for (let i = 0; i < 3; i++) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = o.q || [4, 6, 8][i];
      bp.frequency.setValueAtTime(vs[0][i] * k, t0);
      for (let j = 1; j < vs.length; j++) bp.frequency.linearRampToValueAtTime(vs[j][i] * k, t0 + dur * j / (vs.length - 1));
      const fg = c.createGain(); fg.gain.value = [1, 0.55, 0.22][i] * 3.2;
      pre.connect(bp); bp.connect(fg); fg.connect(env);
    }
    const g = (o.gain ?? 0.3) * (this.voiceGain || 1), att = o.att ?? 0.03;
    env.gain.setValueAtTime(0.0001, t0); env.gain.exponentialRampToValueAtTime(g, t0 + att);
    env.gain.setValueAtTime(g, t0 + Math.max(att + 0.01, dur * (o.hold ?? 0.55)));
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let tail = env;
    if (o.am) {
      const am = c.createGain(); am.gain.value = 1 - o.am[1] / 2;
      const l = c.createOscillator(); l.frequency.value = o.am[0]; const lg = c.createGain(); lg.gain.value = o.am[1] / 2;
      l.connect(lg); lg.connect(am.gain); stops.push(l); env.connect(am); tail = am;
    }
    if (o.lp) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; tail.connect(lp); tail = lp; }
    if (o.pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = clamp(o.pan, -1, 1); tail.connect(pn); tail = pn; }
    tail.connect(out);
    for (const s of stops) { s.start(t0, s.buffer ? Math.random() * 0.5 : 0); s.stop(t0 + dur + 0.05); }
  },
  // A short click or knock (bones, beaks, hooves, claws).
  click(freq, delay = 0, gain = 0.2, dur = 0.03) { this.noiseHit(dur, freq, 3, gain, 'bandpass', 0, delay); },
  // A noise swell with a moving filter (wind in a tunnel, a whisper, a breath).
  swell(o) {
    const c = this.ctx; if (!c) return;
    const t0 = c.currentTime + (o.delay || 0), dur = o.dur || 1, out = this.out || this.master;
    const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true; n.playbackRate.value = o.rate || 1;
    const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 3;
    const fr = o.fr || [[0, 600], [1, 600]];
    f.frequency.setValueAtTime(fr[0][1], t0);
    for (let i = 1; i < fr.length; i++) f.frequency.linearRampToValueAtTime(fr[i][1], t0 + fr[i][0] * dur);
    const g = c.createGain(), peak = o.gain ?? 0.2;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + dur * (o.rise ?? 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    n.connect(f); f.connect(g);
    let tail = g;
    if (o.pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = clamp(o.pan, -1, 1); g.connect(pn); tail = pn; }
    tail.connect(out);
    n.start(t0, Math.random() * 0.5); n.stop(t0 + dur + 0.05);
  },
});

// noiseHit with a start delay (the original plays at once)
{
  const base = Sfx.prototype.noiseHit;
  Sfx.prototype.noiseHit = function (dur, freq, q, gain, type = 'bandpass', pan = 0, delay = 0) {
    if (!delay) return base.call(this, dur, freq, q, gain, type, pan);
    const c = this.ctx, t = c.currentTime + delay;
    const src = c.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.out || this.master);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  };
}

// ---- the voices -----------------------------------------------------------------------------------
// Each takes the synth and a mood: { p: pitch, d: length, kind: '' | 'hurt' | 'death' | 'angry' }.
const R = () => Math.random();
const VOICES = {
  // farm animals
  moo: (s, m) => s.voice({ f: [[0, 118], [0.25, 128], [0.8, 112], [1, 98]], dur: 1.25 * m.d, v: 'muoo', k: 0.85, gain: 0.32, noise: 0.08, pitch: m.p * (0.95 + R() * 0.1), vib: [5, 2] }),
  oink: (s, m) => { for (let i = 0; i < (m.kind ? 1 : 2); i++) s.voice({ f: [[0, 240], [1, 170]], dur: 0.17 * m.d, v: 'ou', k: 1.25, gain: 0.3, noise: 0.35, am: [42, 0.6], pitch: m.p * (0.9 + R() * 0.2), delay: i * 0.21 }); },
  baa: (s, m) => s.voice({ f: [[0, 360], [0.2, 400], [1, 330]], dur: 0.8 * m.d, v: 'eea', k: 1.15, gain: 0.26, vib: [7.5, 28], noise: 0.12, pitch: m.p * (0.92 + R() * 0.16) }),
  cluck: (s, m) => { const n = m.kind === 'hurt' ? 1 : 2 + Math.floor(R() * 3); for (let i = 0; i < n; i++) s.voice({ f: [[0, 520], [1, 420]], dur: 0.08 * m.d, v: 'a', k: 1.8, gain: 0.22, noise: 0.2, pitch: m.p * (0.9 + R() * 0.25), delay: i * 0.12 }); },
  boar: (s, m) => s.voice({ f: [[0, 150], [1, 105]], dur: 0.35 * m.d, v: 'ou', k: 1.0, gain: 0.32, noise: 0.45, am: [34, 0.7], pitch: m.p }),
  deer: (s, m) => s.voice({ f: [[0, 900], [0.3, 1050], [1, 700]], dur: 0.35 * m.d, v: 'ea', k: 1.4, gain: 0.2, noise: 0.25, pitch: m.p }),
  rabbit: (s, m) => s.voice({ f: [[0, 1800], [1, 1500]], dur: 0.08 * m.d, v: 'i', k: 2.2, gain: 0.15, wave: 'triangle', pitch: m.p }),
  // horses and their kin
  horse: (s, m) => {
    if (m.kind) { s.voice({ f: [[0, 700], [1, 450]], dur: 0.45 * m.d, v: 'ea', k: 1.0, gain: 0.28, noise: 0.3, pitch: m.p }); return; }
    if (R() < 0.4) { s.swell({ dur: 0.5, fr: [[0, 900], [1, 500]], q: 1.2, gain: 0.25, rate: 0.7 }); s.swell({ dur: 0.35, fr: [[0, 700], [1, 400]], q: 1.2, gain: 0.18, delay: 0.55 }); return; }   // a snort
    s.voice({ f: [[0, 880], [0.15, 1180], [0.55, 760], [1, 430]], dur: 1.3, v: 'ieea', k: 1.0, gain: 0.26, vib: [13, 45], noise: 0.15, pitch: m.p * (0.95 + R() * 0.1) });
  },
  donkey: (s, m) => { const n = m.kind ? 1 : 3; for (let i = 0; i < n; i++) { s.voice({ f: [[0, 820], [1, 900]], dur: 0.32, v: 'i', k: 1.0, gain: 0.24, noise: 0.25, pitch: m.p, delay: i * 0.75 }); s.voice({ f: [[0, 260], [1, 220]], dur: 0.38, v: 'ao', k: 0.95, gain: 0.3, noise: 0.3, pitch: m.p, delay: i * 0.75 + 0.33 }); } },
  llama: (s, m) => s.voice({ f: [[0, 300], [0.5, 340], [1, 290]], dur: 0.7 * m.d, v: 'mmu', k: 1.0, gain: 0.25, wave: 'triangle', pitch: m.p, vib: [5, 6] }),
  spit: (s) => { s.swell({ dur: 0.18, fr: [[0, 2500], [1, 1500]], q: 0.8, gain: 0.3, rise: 0.15 }); s.click(900, 0.02, 0.15); },
  camel: (s, m) => s.voice({ f: [[0, 120], [1, 95]], dur: 0.6 * m.d, v: 'oou', k: 0.9, gain: 0.32, noise: 0.4, am: [26, 0.6], pitch: m.p }),
  moa: (s, m) => s.voice({ f: [[0, 220], [0.6, 240], [1, 180]], dur: 0.45 * m.d, v: 'ou', k: 1.1, gain: 0.28, noise: 0.15, pitch: m.p }),
  // dogs, foxes, raccoons, cats
  wolf: (s, m) => {
    if (m.kind === 'hurt') { s.voice({ f: [[0, 950], [1, 650]], dur: 0.22, v: 'ia', k: 1.25, gain: 0.26, noise: 0.15, pitch: m.p }); return; }
    if (m.kind === 'death') { s.voice({ f: [[0, 700], [0.3, 800], [1, 350]], dur: 0.9, v: 'iau', k: 1.2, gain: 0.25, vib: [8, 20], pitch: m.p }); return; }
    if (R() < 0.35) { s.voice({ f: [[0, 520], [1, 640]], dur: 0.5, v: 'iu', k: 1.3, gain: 0.16, wave: 'triangle', pitch: m.p }); return; }   // a whine
    for (let i = 0; i < 2; i++) s.voice({ f: [[0, 430], [1, 290]], dur: 0.14, v: 'ao', k: 1.15, gain: 0.32, noise: 0.35, pitch: m.p * (0.95 + R() * 0.1), delay: i * 0.26 });   // two barks
  },
  wolf_angry: (s, m) => s.voice({ f: [[0, 80], [0.5, 88], [1, 72]], dur: 1.0, v: 'rro', k: 1.0, gain: 0.34, noise: 0.5, am: [28, 0.75], pitch: m.p }),
  wolf_howl: (s, m) => s.voice({ f: [[0, 380], [0.25, 640], [0.8, 590], [1, 420]], dur: 2.6, v: 'uoou', k: 1.05, gain: 0.22, vib: [5, 14], noise: 0.06, pitch: m.p * (0.95 + R() * 0.1), att: 0.25 }),
  fox: (s, m) => { if (R() < 0.5 || m.kind) s.voice({ f: [[0, 1100], [0.4, 1300], [1, 650]], dur: 0.3 * m.d, v: 'iea', k: 1.3, gain: 0.22, noise: 0.45, pitch: m.p }); else for (let i = 0; i < 3; i++) s.voice({ f: [[0, 900], [1, 700]], dur: 0.09, v: 'ia', k: 1.4, gain: 0.2, noise: 0.3, pitch: m.p, delay: i * 0.13 }); },
  raccoon: (s, m) => s.voice({ f: [[0, 820], [1, 760]], dur: 0.4 * m.d, v: 'ei', k: 1.5, gain: 0.18, noise: 0.3, am: [32, 0.8], pitch: m.p }),
  cat: (s, m) => {
    if (m.kind === 'hurt') { s.voice({ f: [[0, 950], [1, 700]], dur: 0.25, v: 'ia', k: 1.4, gain: 0.25, noise: 0.25, pitch: m.p }); return; }
    s.voice({ f: [[0, 560], [0.35, 760], [1, 470]], dur: 0.62 * m.d, v: 'iau', k: 1.35, gain: 0.22, vib: [6, 10], pitch: m.p * (0.92 + R() * 0.16) });
  },
  cat_purr: (s) => s.voice({ f: [[0, 48], [1, 52]], dur: 1.6, v: 'mm', k: 1.0, gain: 0.25, noise: 0.6, am: [24, 0.9], lp: 500 }),
  cat_angry: (s) => s.swell({ dur: 0.9, fr: [[0, 3500], [1, 2800]], q: 0.7, gain: 0.25, rise: 0.1, type: 'highpass' }),
  // bears and pandas
  bear: (s, m) => s.voice({ f: [[0, 95], [0.5, 110], [1, 80]], dur: 1.0 * m.d, v: 'oru', k: 0.85, gain: 0.36, noise: 0.5, am: [18, 0.55], pitch: m.p }),
  bear_angry: (s, m) => s.voice({ f: [[0, 150], [0.3, 170], [1, 90]], dur: 1.3, v: 'aro', k: 0.85, gain: 0.42, noise: 0.6, am: [22, 0.45], pitch: m.p }),
  panda: (s, m) => { if (R() < 0.15 && !m.kind) { s.swell({ dur: 0.25, fr: [[0, 2000], [1, 1200]], q: 0.8, gain: 0.3, rise: 0.1, delay: 0.3 }); s.voice({ f: [[0, 600], [1, 900]], dur: 0.3, v: 'ii', k: 1.2, gain: 0.12, noise: 0.5 }); return; }   // a sneeze
    s.voice({ f: [[0, 480], [1, 420]], dur: 0.45 * m.d, v: 'ea', k: 1.15, gain: 0.24, vib: [7, 18], noise: 0.15, pitch: m.p }); },
  goat: (s, m) => { const scream = !m.kind && R() < 0.12; s.voice({ f: scream ? [[0, 900], [0.3, 1150], [1, 700]] : [[0, 600], [1, 520]], dur: (scream ? 1.0 : 0.7) * m.d, v: 'eea', k: 1.2, gain: scream ? 0.3 : 0.24, vib: [9, scream ? 60 : 35], noise: scream ? 0.4 : 0.15, pitch: m.p }); },
  armadillo: (s, m) => { s.swell({ dur: 0.15, fr: [[0, 3000], [1, 2200]], q: 2, gain: 0.12 }); s.swell({ dur: 0.12, fr: [[0, 2800], [1, 2000]], q: 2, gain: 0.1, delay: 0.2 }); },
  mouse: (s, m) => { for (let i = 0; i < 2; i++) s.tone(3800 * m.p, 0.05, 'sine', 0.06, 3200 * m.p, i * 0.09); },
  // birds
  turkey: (s, m) => s.voice({ f: [[0, 520], [1, 440]], dur: 0.7 * m.d, v: 'oua', k: 1.3, gain: 0.24, noise: 0.15, am: [21, 0.85], pitch: m.p }),
  duck: (s, m) => { for (let i = 0; i < (m.kind ? 1 : 2); i++) s.voice({ f: [[0, 300], [1, 260]], dur: 0.17, v: 'ae', k: 1.3, gain: 0.26, noise: 0.25, q: 9, wave: 'square', pitch: m.p * (0.95 + R() * 0.1), delay: i * 0.22 }); },
  parrot: (s, m) => s.voice({ f: [[0, 1250], [0.5, 1450], [1, 1050]], dur: 0.28 * m.d, v: 'aea', k: 1.45, gain: 0.2, noise: 0.5, pitch: m.p * (0.9 + R() * 0.25) }),
  bat: (s, m) => { for (let i = 0; i < 2 + (m.kind ? 0 : 1); i++) s.tone(5200 * m.p, 0.035, 'sine', 0.05, 4100 * m.p, i * 0.07); },
  bee: (s, m) => s.voice({ f: [[0, 225], [1, 235]], dur: 1.1 * m.d, v: 'ee', k: 1.0, gain: 0.08, am: [110, 0.5], wave: 'sawtooth', pitch: m.p }),
  bee_angry: (s) => s.voice({ f: [[0, 290], [1, 300]], dur: 1.0, v: 'ee', k: 1.1, gain: 0.12, am: [140, 0.6] }),
  // water life
  squid: (s, m) => { s.swell({ dur: 0.35, fr: [[0, 500], [1, 250]], type: 'lowpass', q: 1, gain: 0.3, rise: 0.2 }); s.tone(110 * m.p, 0.2, 'sine', 0.08, 70 * m.p); },
  fish: (s, m) => { s.swell({ dur: 0.2, fr: [[0, 900], [1, 600]], q: 1.5, gain: 0.18 }); },
  flop: (s) => { s.noiseHit(0.08, 700, 1, 0.25, 'lowpass'); s.swell({ dur: 0.15, fr: [[0, 1500], [1, 1000]], q: 1, gain: 0.12, delay: 0.03 }); },
  puff: (s) => { s.swell({ dur: 0.3, fr: [[0, 400], [1, 900]], q: 1.2, gain: 0.25, rise: 0.8, type: 'lowpass' }); },
  dolphin: (s, m) => {
    for (let i = 0; i < 6; i++) s.click(2600 + R() * 1500, i * 0.05, 0.12, 0.015);
    s.tone(2800 * m.p, 0.45, 'sine', 0.06, 4800 * m.p, 0.35); s.tone(4800 * m.p, 0.25, 'sine', 0.05, 3900 * m.p, 0.8);
  },
  turtle: (s, m) => s.tone(900 * m.p, 0.07, 'triangle', 0.05, 760 * m.p),
  axolotl: (s, m) => s.voice({ f: [[0, 1500], [1, 1700]], dur: 0.12 * m.d, v: 'i', k: 2, gain: 0.12, wave: 'triangle', pitch: m.p }),
  frog: (s, m) => { for (let i = 0; i < (m.kind ? 1 : 2); i++) s.voice({ f: [[0, 190], [1, 165]], dur: 0.22, v: 'ao', k: 1.1, gain: 0.3, noise: 0.2, am: [38, 0.95], pitch: m.p * (0.95 + R() * 0.1), delay: i * 0.3 }); },
  // monsters
  ghoul: (s, m) => {
    if (m.kind === 'hurt') { s.voice({ f: [[0, 170], [1, 115]], dur: 0.38, v: 'ao', k: 0.95, gain: 0.34, noise: 0.35, pitch: m.p }); return; }
    if (m.kind === 'death') { s.voice({ f: [[0, 130], [0.4, 120], [1, 60]], dur: 1.2, v: 'aou', k: 0.9, gain: 0.32, noise: 0.4, pitch: m.p }); return; }
    s.voice({ f: [[0, 88], [0.3, 76], [0.65, 96], [1, 70]], dur: 1.35 + R() * 0.4, v: 'uoau', k: 0.9, gain: 0.32, noise: 0.35, am: [7, 0.35], vib: [3, 4], pitch: m.p * (0.9 + R() * 0.2) });
  },
  rattle: (s, m) => { const n = m.kind === 'death' ? 14 : m.kind === 'hurt' ? 6 : 5; for (let i = 0; i < n; i++) s.click(1300 + R() * 1400, i * (0.03 + R() * 0.03), 0.16); if (m.kind === 'death') s.noiseHit(0.3, 600, 1, 0.2, 'lowpass', 0, 0.3); },
  spider: (s, m) => { s.swell({ dur: 0.5 * m.d, fr: [[0, 4200], [1, 3000]], type: 'highpass', q: 0.8, gain: 0.14, rise: 0.15 }); for (let i = 0; i < 6; i++) s.click(2400 + R() * 1200, 0.05 + i * 0.045, 0.12, 0.02); },
  squish: (s, m) => { s.swell({ dur: 0.18 * m.d, fr: [[0, 900], [1, 300]], type: 'lowpass', q: 2, gain: 0.32, rise: 0.15 }); s.tone(170 * m.p, 0.12, 'sine', 0.1, 90 * m.p); },
  fuseling: (s, m) => s.voice({ f: [[0, 140], [1, 90]], dur: 0.5 * m.d, v: 'ru', k: 1, gain: 0.25, noise: 0.7, pitch: m.p }),
  // the player
  player: (s, m) => s.voice({ f: [[0, 190], [1, 125]], dur: 0.22 * m.d, v: 'au', k: 1.0, gain: 0.32, noise: 0.3, pitch: m.p }),
};
// the older creatures' voices, for their hurt and death calls
for (const [type, v] of [['cow', 'moo'], ['pig', 'oink'], ['sheep', 'baa'], ['chicken', 'cluck'], ['boar', 'boar'], ['deer', 'deer'], ['rabbit', 'rabbit'], ['ghoul', 'ghoul'], ['charred_ghoul', 'ghoul'],
  ['skeleton', 'rattle'], ['spider', 'spider'], ['fuseling', 'fuseling'], ['slime', 'squish']]) if (MOB_TYPES[type]) MOB_TYPES[type].voice = v;

// ---- the dark: cave sounds ---------------------------------------------------------------------------
const CAVE_SOUNDS = {
  cave_dig: (s, pan) => { for (let i = 0; i < 3 + Math.floor(R() * 3); i++) { s.noiseHit(0.12, 700 + R() * 300, 1.2, 0.14, 'bandpass', pan, i * (0.55 + R() * 0.2)); s.noiseHit(0.08, 180, 1, 0.12, 'lowpass', pan, i * (0.55 + R() * 0.2)); } },
  cave_steps: (s, pan) => { for (let i = 0; i < 5; i++) s.noiseHit(0.09, 1300 + R() * 300, 0.9, 0.12 * (1 - i * 0.12), 'bandpass', pan, i * 0.48 + R() * 0.05); },
  cave_scrape: (s, pan) => {
    const c = s.ctx, t = c.currentTime, o = c.createOscillator(), m = c.createOscillator(), mg = c.createGain(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(190, t + 3);
    m.frequency.value = 47; mg.gain.value = 60; m.connect(mg); mg.connect(o.frequency);
    f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    o.connect(f); f.connect(g);
    let tail = g; if (c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = pan; g.connect(pn); tail = pn; }
    tail.connect(s.out || s.master); o.start(t); m.start(t); o.stop(t + 3.1); m.stop(t + 3.1);
  },
  cave_whisper: (s, pan) => { for (let i = 0; i < 3; i++) s.swell({ dur: 0.7 + R() * 0.5, fr: [[0, 1800 + R() * 800], [0.5, 2600], [1, 1500]], q: 5, gain: 0.05, rise: 0.7, delay: i * 0.6, pan, rate: 1.3 }); },
  cave_moan: (s, pan) => s.voice({ f: [[0, 62], [0.4, 70], [1, 52]], dur: 3.4, v: 'uou', k: 0.8, gain: 0.16, noise: 0.25, vib: [3, 3], lp: 420, att: 1.0, pan }),
  cave_breath: (s, pan) => { s.swell({ dur: 1.6, fr: [[0, 500], [1, 800]], q: 0.8, gain: 0.08, rise: 0.6, type: 'lowpass', pan }); s.swell({ dur: 1.8, fr: [[0, 700], [1, 400]], q: 0.8, gain: 0.07, rise: 0.3, type: 'lowpass', delay: 1.7, pan }); },
  cave_creak: (s, pan) => { s.tone(80 + R() * 30, 1.2, 'sawtooth', 0.03, 60); s.noiseHit(0.9, 420, 5, 0.06, 'bandpass', pan); },
  cave_drone: (s) => s.play('cave'),
  cave_pebbles: (s, pan) => { for (let i = 0; i < 6; i++) s.noiseHit(0.04, 2400 + R() * 1000, 2, 0.1 * (1 - i * 0.1), 'bandpass', pan, i * (0.07 + R() * 0.12)); },
};

// ---- weather and the world --------------------------------------------------------------------------
const WORLD_SOUNDS = {
  thunder: (s) => { s.swell({ dur: 4.5, fr: [[0, 220], [0.3, 140], [1, 80]], type: 'lowpass', q: 0.7, gain: 0.85, rise: 0.06, rate: 0.5 }); s.swell({ dur: 2.2, fr: [[0, 900], [1, 300]], type: 'lowpass', q: 0.7, gain: 0.35, rise: 0.02, delay: 0.05, rate: 0.7 }); },
  thunder_far: (s) => s.swell({ dur: 5, fr: [[0, 160], [1, 70]], type: 'lowpass', q: 0.7, gain: 0.4, rise: 0.3, rate: 0.4 }),
  lava_pop: (s) => { s.tone(220 + R() * 160, 0.08, 'sine', 0.1, 90); s.noiseHit(0.05, 900, 2, 0.12); },
  fire_crackle: (s) => { for (let i = 0; i < 4; i++) s.click(1800 + R() * 2400, R() * 0.4, 0.08, 0.012); },
  splash_small: (s) => s.swell({ dur: 0.25, fr: [[0, 1600], [1, 900]], q: 1, gain: 0.2, rise: 0.1 }),
  step_wood_creak: (s) => s.tone(120 + R() * 40, 0.25, 'sawtooth', 0.02, 95),
};

// ---- hooking it into the synth -------------------------------------------------------------------
{
  const basePlay = Sfx.prototype.play;
  Sfx.prototype.play = function (name) {
    if (!this.ctx || this.volume <= 0) return;
    let fn = VOICES[name], mood = { p: 1, d: 1, kind: '' };
    if (!fn) {
      const m = /^(.*)_(hurt|death|angry)$/.exec(name);
      if (m && VOICES[m[1]]) { fn = VOICES[m[1]]; mood = m[2] === 'hurt' ? { p: 1.3, d: 0.55, kind: 'hurt' } : m[2] === 'death' ? { p: 0.82, d: 1.25, kind: 'death' } : { p: 0.9, d: 1.1, kind: 'angry' }; }
    }
    if (fn) { if (!this.ok(name, 0.08)) return; fn(this, mood); return; }
    if (CAVE_SOUNDS[name]) { if (!this.ok(name, 1)) return; CAVE_SOUNDS[name](this, this._pan || (R() - 0.5) * 1.6); return; }
    if (WORLD_SOUNDS[name]) { if (!this.ok(name, 0.05)) return; WORLD_SOUNDS[name](this); return; }
    // the old night creatures speak with the new voices
    if (name === 'ghoul' || name === 'rattle' || name === 'spider' || name === 'squish' || name === 'moo' || name === 'oink' || name === 'baa' || name === 'cluck' || name === 'boar') { if (!this.ok(name, 0.08)) return; VOICES[name](this, mood); return; }
    if (name === 'hurt' && this.ok('player_hurt', 0.1)) VOICES.player(this, { p: 1, d: 1, kind: 'hurt' });
    return basePlay.call(this, name);
  };
  // Placed sounds: quieter with distance, panned to the side they come from.
  Sfx.prototype.playAt = function (name, x, y, z, range = 28) {
    if (!this.ctx) return;
    let d = Infinity, near = null;
    const ls = this.listeners();
    for (const l of ls) { const dd = Math.hypot(l.x - x, l.y - y, l.z - z); if (dd < d) { d = dd; near = l; } }
    if (d > range) return;
    const g = this.ctx.createGain();
    g.gain.value = clamp(1 - (d - 3) / (range - 3), 0, 1);
    let pan = 0;
    if (near && ls.length === 1 && near.yaw !== undefined && d > 0.5) {
      const rx = Math.cos(near.yaw), rz = -Math.sin(near.yaw);              // the listener's right
      pan = clamp(((x - near.x) * rx + (z - near.z) * rz) / Math.max(1, Math.hypot(x - near.x, z - near.z)), -1, 1) * 0.75;
    }
    if (pan && this.ctx.createStereoPanner) { const pn = this.ctx.createStereoPanner(); pn.pan.value = pan; g.connect(pn); pn.connect(this.master); } else g.connect(this.master);
    this.out = g; this._pan = pan;
    try { this.play(name); } finally { this.out = null; this._pan = 0; }
  };
}

// Mobs: hurt and death calls for every creature with a voice.
{
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const dealt = baseHurt.call(this, amount, src);
    const T = this.T;
    if (dealt > 0 && !T.ai && T.voice && this.alive) this.game.sfx.playAt(T.voice + '_hurt', this.x, this.y + this.h * 0.7, this.z);
    return dealt;
  };
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    baseDie.call(this, src);
    if (!this.T.ai && this.T.voice) this.game.sfx.playAt(this.T.voice + '_death', this.x, this.y + this.h * 0.6, this.z);
  };
}
