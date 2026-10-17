// ---------------------------------------------------------------------------
// game/music.js — quiet, generative piano music in the spirit of the old
// game's soundtrack: sparse melodies over soft pads, lots of space and a long
// reverb, a new piece every time (no two are the same).
//
// It plays now and then, never all the time: a piece on the title screen,
// the first in a world a little after you arrive, then one every few
// minutes. The mood follows where you are: warm and open by day, darker and
// slower at night, low and sparse in caves, airy in the Skylands, ominous in
// the Ember Depths. The Music slider in Options sets the volume (0 = off).
// ---------------------------------------------------------------------------

const MUSIC_MODES = {
  major: [0, 2, 4, 5, 7, 9, 11], lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10], aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11],
};
// mood -> how a piece is built
const MUSIC_MOODS = {
  day: { modes: ['major', 'lydian', 'mixolydian'], roots: [48, 50, 53, 55], tempo: [62, 76], density: 0.62, register: 0, progs: [[0, 4, 5, 3], [0, 5, 3, 4], [3, 0, 4, 5], [0, 3, 5, 4], [0, 2, 3, 4]], bell: 0 },
  night: { modes: ['dorian', 'aeolian'], roots: [45, 47, 50, 52], tempo: [52, 64], density: 0.45, register: -2, progs: [[0, 5, 3, 4], [0, 3, 6, 4], [0, 6, 5, 4], [0, 4, 5, 3]], bell: 0.35 },
  cave: { modes: ['phrygian', 'aeolian', 'dorian'], roots: [40, 43, 45], tempo: [46, 56], density: 0.3, register: -5, progs: [[0, 1, 0, 6], [0, 5, 6, 0], [0, 3, 1, 0]], bell: 0.2, drone: true },
  sky: { modes: ['lydian', 'major'], roots: [53, 55, 57], tempo: [60, 70], density: 0.55, register: 5, progs: [[0, 1, 4, 0], [0, 4, 1, 5]], bell: 0.6 },
  depths: { modes: ['harmonic', 'phrygian'], roots: [38, 40, 41], tempo: [48, 58], density: 0.35, register: -5, progs: [[0, 1, 0, 4], [0, 5, 1, 4]], bell: 0, drone: true },
  menu: { modes: ['major', 'dorian', 'lydian'], roots: [48, 50, 52], tempo: [58, 68], density: 0.55, register: 0, progs: [[0, 5, 3, 4], [0, 3, 0, 4], [5, 3, 0, 4]], bell: 0.25 },
  creative: { modes: ['lydian', 'major'], roots: [50, 52, 55], tempo: [66, 80], density: 0.75, register: 3, progs: [[0, 4, 5, 3], [3, 4, 0, 5], [0, 1, 4, 3]], bell: 0.4 },
};

class Music {
  constructor(game) {
    this.g = game; this.volume = 0.5;
    this.bus = null; this.notes = []; this.ni = 0; this.start = 0; this.end = 0;
    this.wait = 25 + Math.random() * 30;           // seconds until the next piece
    this.playing = false; this.mood = null; this.menuDone = false; this.inWorldT = 0;
  }
  setVolume(v) { this.volume = v; if (this.bus) this.bus.gain.setTargetAtTime(v * 0.55, this.bus.context.currentTime, 0.3); if (v <= 0) this.stop(); }
  // The music bus: its own volume, a gentle low-pass and a big hall reverb, straight to the speakers.
  ensureBus() {
    const s = this.g.sfx;
    if (this.bus || !s.ctx) return !!this.bus;
    const c = s.ctx;
    this.bus = c.createGain(); this.bus.gain.value = this.volume * 0.55;
    const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 5200;
    const dry = c.createGain(); dry.gain.value = 0.7;
    const wet = c.createGain(); wet.gain.value = 0.55;
    const verb = c.createConvolver();
    const len = Math.floor(c.sampleRate * 3.2), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < 400 ? i / 400 : 1); }
    verb.buffer = ir;
    this.mix = c.createGain(); this.mix.gain.value = 1;
    this.mix.connect(tone); tone.connect(dry); tone.connect(verb); verb.connect(wet);
    dry.connect(this.bus); wet.connect(this.bus); this.bus.connect(c.destination);
    return true;
  }
  stop() {
    this.notes = []; this.ni = 0; this.playing = false;
    if (this.mix) { const t = this.mix.context.currentTime; this.mix.gain.cancelScheduledValues(t); this.mix.gain.setValueAtTime(this.mix.gain.value, t); this.mix.gain.linearRampToValueAtTime(0, t + 2); setTimeout(() => { if (this.mix && !this.playing) this.mix.gain.value = 1; }, 2200); }
  }
  // What mood fits where the player is?
  moodNow() {
    const g = this.g;
    if (!g.inWorld()) return 'menu';
    if (g.dim === DIM.DEPTHS) return 'depths';
    if (g.dim === DIM.SKYLANDS) return 'sky';
    const lp = g.local, p = lp && lp.player;
    if (p && g.world) { const sky = g.world.getLight(Math.floor(p.x), Math.floor(p.y + 1), Math.floor(p.z)) >> 4; if (sky < 4 && p.y < SEA - 4) return 'cave'; }
    if (g.creative && Math.random() < 0.5) return 'creative';
    return g.env && g.env.day < 0.45 ? 'night' : 'day';
  }
  update(dt) {
    const g = this.g, s = g.sfx;
    if (!s.ctx || this.volume <= 0) return;
    // a jukebox playing nearby takes over
    const juke = g.jukeboxes && g.jukeboxes.size;
    if (juke && this.playing) this.stop();
    if (this.playing) { this.schedule(); if (s.ctx.currentTime > this.end) { this.playing = false; this.wait = g.inWorld() ? 180 + Math.random() * 300 : 90 + Math.random() * 60; } return; }
    if (juke) return;
    const inWorld = g.inWorld();
    if (!inWorld) {
      // the title screen gets a piece shortly after the first click (browsers keep sound off until then)
      if (!this.menuDone && g.state !== 'loading') { this.wait = Math.min(this.wait, 2); this.wait -= dt; if (this.wait <= 0) { this.menuDone = true; this.play('menu'); } }
      this.inWorldT = 0;
      return;
    }
    if (this.inWorldT === 0) this.wait = 40 + Math.random() * 50;   // just arrived: the first piece comes a little later
    this.inWorldT += dt;
    if (g.state !== 'playing') return;
    this.wait -= dt;
    if (this.wait <= 0) this.play(this.moodNow());
  }
  play(mood) {
    if (!this.ensureBus()) return;
    const c = this.g.sfx.ctx;
    this.mix.gain.cancelScheduledValues(c.currentTime); this.mix.gain.value = 1;
    this.mood = mood;
    this.notes = composePiece(MUSIC_MOODS[mood] || MUSIC_MOODS.day, Math.floor(Math.random() * 1e9));
    this.ni = 0; this.start = c.currentTime + 0.3; this.playing = true;
    this.end = this.start + (this.notes.length ? this.notes[this.notes.length - 1].t + 6 : 1);
    this.schedule();
  }
  // Notes go to the audio clock a couple of seconds ahead of time.
  schedule() {
    const c = this.g.sfx.ctx, horizon = c.currentTime + 2.5;
    while (this.ni < this.notes.length && this.start + this.notes[this.ni].t < horizon) {
      const n = this.notes[this.ni++];
      const at = Math.max(c.currentTime + 0.02, this.start + n.t);
      if (n.ins === 'piano') this.piano(at, n.m, n.d, n.v);
      else if (n.ins === 'pad') this.pad(at, n.m, n.d, n.v);
      else if (n.ins === 'bell') this.bell(at, n.m, n.d, n.v);
      else if (n.ins === 'drone') this.drone(at, n.m, n.d, n.v);
    }
  }
  hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  // A soft piano: a few slightly stretched partials that fade at different rates, and a felt-hammer thump.
  piano(t, m, d, v) {
    const c = this.g.sfx.ctx, f = this.hz(m), out = this.mix;
    const g = c.createGain(); g.connect(out);
    const decay = clamp(2.8 - (m - 48) * 0.035, 0.7, 3.2), len = Math.max(d, 0.4) + decay;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.06 * v, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const parts = [[1, 1], [2.003, 0.42], [3.009, 0.18], [4.02, 0.08], [5.04, 0.04]];
    for (const [r, a] of parts) {
      if (f * r > 9000) continue;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * r;
      const pg = c.createGain(); pg.gain.setValueAtTime(a, t); pg.gain.exponentialRampToValueAtTime(a * 0.05 + 0.0001, t + len / (r * 0.8));
      o.connect(pg); pg.connect(g); o.start(t); o.stop(t + len + 0.05);
    }
  }
  // A warm pad: detuned saws through a slowly opening filter.
  pad(t, m, d, v) {
    const c = this.g.sfx.ctx, f = this.hz(m), out = this.mix;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5;
    lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(900 + v * 600, t + d * 0.5); lp.frequency.linearRampToValueAtTime(500, t + d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022 * v, t + Math.min(2.5, d * 0.4)); g.gain.setValueAtTime(0.022 * v, t + d * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + d + 1.5);
    lp.connect(g); g.connect(out);
    for (const det of [-6, 5]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + d + 1.6); }
    const s = c.createOscillator(); s.type = 'sine'; s.frequency.value = f / 2; const sg = c.createGain(); sg.gain.value = 1.4; s.connect(sg); sg.connect(lp); s.start(t); s.stop(t + d + 1.6);
  }
  // A small glass bell for the high sparkles.
  bell(t, m, d, v) {
    const c = this.g.sfx.ctx, f = this.hz(m), out = this.mix;
    for (const [r, a, dec] of [[1, 0.06, 2.2], [2.76, 0.025, 1.1], [5.4, 0.012, 0.6]]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * r;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + 0.05);
    }
  }
  // A low hum under the cave and Depths pieces.
  drone(t, m, d, v) {
    const c = this.g.sfx.ctx, f = this.hz(m), out = this.mix;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03 * v, t + 4); g.gain.setValueAtTime(0.03 * v, t + d - 4); g.gain.linearRampToValueAtTime(0.0001, t + d);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
    lp.connect(g); g.connect(out);
    for (const [r, det] of [[1, 0], [1.5, 4], [2, -3]]) { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f * r; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + d + 0.1); }
  }
}

// Writes one piece: a chord progression played as soft pads and a broken-chord left hand, a
// melody built from a short motif that comes back changed, and a few bell notes to finish.
function composePiece(M, seed) {
  const r = mulberry32(seed), pick = (a) => a[Math.floor(r() * a.length)];
  const mode = MUSIC_MODES[pick(M.modes)], root = pick(M.roots) + M.register;
  const bpm = M.tempo[0] + r() * (M.tempo[1] - M.tempo[0]), beat = 60 / bpm;
  const prog = pick(M.progs);
  const deg = (d, oct = 0) => { const o = Math.floor(d / 7); return root + mode[((d % 7) + 7) % 7] + 12 * (o + oct); };
  const notes = [];
  const add = (beatT, ins, m, d, v) => notes.push({ t: beatT * beat, ins, m, d: d * beat, v });
  // the shape: a quiet opening, the theme, the theme again (changed, maybe higher), and a closing
  const sections = [{ bars: 2, mel: false, lh: 0.3 }, { bars: 8, mel: true, lh: 1 }, { bars: 8, mel: true, lh: 1, vary: true, up: r() < 0.4 ? 7 : 0 }, { bars: 4, mel: r() < 0.5, lh: 0.5, end: true }];
  // a motif: 3-5 notes with a rhythm, as scale steps from a chord tone
  const rhythms = [[2, 1, 1], [1.5, 0.5, 2], [1, 1, 2], [3, 1], [1, 0.5, 0.5, 2], [2, 2], [1, 1, 1, 1]];
  const motif = []; let rh = pick(rhythms), step = 0;
  for (const len of rh) { motif.push({ s: step, len, rest: r() < 0.12 }); step += pick([-2, -1, -1, 1, 1, 2, 0, 3]); }
  let t = 0, bar = 0;
  for (const S of sections) {
    for (let b = 0; b < S.bars; b++, bar++) {
      const ch = prog[Math.floor(bar / 2) % prog.length] + (S.end && b === S.bars - 1 ? -prog[Math.floor(bar / 2) % prog.length] : 0);
      const barT = t + b * 4;
      // pads: hold the chord for two bars
      if (bar % 2 === 0 || S.end && b === S.bars - 1) for (const k of [0, 2, 4]) add(barT, 'pad', deg(ch + k, -1), S.end && b === S.bars - 1 ? 6 : 8, 0.7 + r() * 0.3);
      if (M.drone && bar % 4 === 0) add(barT, 'drone', root - 12, 16, 0.8);
      // left hand: a slow broken chord, sometimes skipping notes
      if (r() < 0.85 * S.lh) {
        const pat = pick([[0, 4, 7, 4], [0, 2, 4, 7], [0, 4, 9, 7], [0, 7, 4, 2]]);
        for (let i = 0; i < 4; i++) if (r() < 0.82) add(barT + i, 'piano', deg(ch + [0, 2, 4, 6, 7, 9, 11][[0, 2, 4, 7, 9].indexOf(pat[i]) >= 0 ? [0, 2, 4, 7, 9].indexOf(pat[i]) : 0], -1) + (pat[i] === 7 ? 12 : 0) - (pat[i] === 7 ? 12 : 0), 1.5, 0.45 + r() * 0.2);
      }
      // melody: the motif placed on the chord, every other bar or so, with space between
      if (S.mel && (b % 2 === 0 || r() < M.density * 0.6) && r() < M.density + 0.3) {
        let at = barT + (r() < 0.5 ? 0 : pick([0.5, 1, 2]));
        const start = ch + pick([0, 2, 4]) + 7 + (S.up || 0);
        for (const n of motif) {
          const vary = S.vary && r() < 0.35 ? pick([-1, 1, 2]) : 0;
          if (!n.rest && at < barT + 4.5) add(at, 'piano', deg(start + n.s + vary), n.len, 0.7 + r() * 0.25);
          at += n.len;
        }
      }
      if (M.bell && r() < M.bell * 0.5) add(barT + pick([1, 2, 3, 3.5]), 'bell', deg(ch + pick([0, 2, 4]), 2), 1, 0.6);
    }
    t += S.bars * 4;
  }
  // the last chord rings out
  add(t, 'piano', deg(0, -1), 4, 0.5); add(t + 0.02, 'piano', deg(4, -1), 4, 0.4); add(t + 0.04, 'piano', deg(0), 4, 0.45);
  notes.sort((a, b) => a.t - b.t);
  return notes;
}
