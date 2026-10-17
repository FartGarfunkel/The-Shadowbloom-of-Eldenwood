// ---------------------------------------------------------------------------
// game/music2.js — 0.9.0.10: more music, music of the place, and battle music.
//
// A whole band now, all played live: harp, flute, strings, choir, horn,
// marimba, kalimba, music box, a plucked oud, clarinet, and drums from frame
// drums to taiko. Each part of the world has its own sound — pastoral plains,
// green forests, jungle marimbas, desert ouds over a frame drum, frosty music
// boxes in the taiga, horn calls in the mountains, harps by the sea, a lute in
// the villages, a slow clarinet in the swamps, choirs in the Skylands — and
// darker, slower versions of each at night. Pieces come more often than
// before, and every one is written fresh.
//
// When a boss or a dragon turns on you, the quiet music gives way to a battle
// theme with drums, driving strings, brass and choir, which grows fiercer as
// the fight turns, ends in a fanfare when you win, and fades if you get away.
// ---------------------------------------------------------------------------

MUSIC_MODES.hijaz = [0, 1, 4, 5, 7, 8, 10];
MUSIC_MODES.penta = [0, 2, 4, 7, 9, 12, 14];        // a major pentatonic, laid out as seven steps
MUSIC_MODES.minpenta = [0, 3, 5, 7, 10, 12, 15];
MUSIC_MODES.whole = [0, 2, 4, 6, 8, 10, 12];
Object.assign(MUSIC_MOODS, {
  plains: { modes: ['major', 'lydian', 'mixolydian'], roots: [50, 52, 53, 55], tempo: [66, 80], density: 0.6, register: 2, progs: [[0, 4, 5, 3], [0, 3, 4, 0], [0, 5, 3, 4], [3, 4, 0, 0]], bell: 0.12, lead: 'flute', lead2: 'piano', lh: 'harp', padIns: 'strings' },
  forest: { modes: ['dorian', 'mixolydian', 'major'], roots: [48, 50, 52], tempo: [58, 70], density: 0.55, register: 0, progs: [[0, 6, 3, 4], [0, 3, 0, 4], [0, 5, 6, 4]], bell: 0.2, lead: 'piano', lead2: 'flute', lh: 'harp', padIns: 'strings' },
  jungle: { modes: ['penta', 'mixolydian'], roots: [50, 53, 55], tempo: [84, 100], density: 0.7, register: 2, progs: [[0, 4, 3, 4], [0, 3, 4, 3], [0, 5, 3, 4]], bell: 0, lead: 'marimba', lead2: 'kalimba', lh: 'kalimba', padIns: 'pad', perc: 'hand' },
  desert: { modes: ['hijaz', 'phrygian'], roots: [50, 52], tempo: [70, 84], density: 0.55, register: 0, progs: [[0, 1, 0, 6], [0, 6, 1, 0], [0, 3, 1, 0]], bell: 0, drone: true, lead: 'pluck', lead2: 'flute', lh: 'pluck', padIns: 'pad', perc: 'frame' },
  savanna: { modes: ['penta', 'minpenta'], roots: [48, 50, 53], tempo: [64, 76], density: 0.55, register: 0, progs: [[0, 3, 4, 3], [0, 4, 3, 0]], bell: 0, lead: 'kalimba', lead2: 'flute', lh: 'pluck', padIns: 'pad', perc: 'shaker' },
  frost: { modes: ['lydian', 'aeolian', 'dorian'], roots: [52, 55, 57], tempo: [50, 60], density: 0.4, register: 5, progs: [[0, 5, 3, 4], [0, 1, 4, 0], [0, 3, 5, 4]], bell: 0.55, bellIns: 'celesta', lead: 'musicbox', lead2: 'piano', lh: 'piano', padIns: 'strings' },
  peaks: { modes: ['dorian', 'mixolydian', 'aeolian'], roots: [45, 48, 50], tempo: [54, 64], density: 0.45, register: 0, progs: [[0, 6, 0, 4], [0, 3, 6, 4], [0, 4, 3, 0]], bell: 0.1, drone: true, lead: 'horn', lead2: 'flute', lh: 'harp', padIns: 'strings' },
  swamp: { modes: ['dorian', 'aeolian'], roots: [43, 45, 48], tempo: [52, 62], density: 0.45, register: -3, progs: [[0, 6, 0, 4], [0, 3, 1, 0]], bell: 0, drone: true, lead: 'clarinet', lh: 'pluck', padIns: 'pad', perc: 'hand' },
  ocean: { modes: ['lydian', 'major', 'mixolydian'], roots: [50, 53, 55], tempo: [56, 68], density: 0.5, register: 2, progs: [[0, 4, 1, 4], [0, 3, 4, 0], [0, 5, 3, 4]], bell: 0.3, lead: 'flute', lead2: 'piano', lh: 'harp', arp: true, padIns: 'choir' },
  village: { modes: ['major', 'mixolydian'], roots: [50, 52, 55], tempo: [76, 92], density: 0.72, register: 2, progs: [[0, 3, 4, 0], [0, 4, 5, 3], [0, 3, 0, 4]], bell: 0.1, lead: 'pluck', lead2: 'flute', lh: 'harp', padIns: 'pad', perc: 'shaker' },
  deep: { modes: ['lydian', 'dorian'], roots: [43, 45, 48], tempo: [44, 52], density: 0.3, register: -2, progs: [[0, 1, 0, 4], [0, 5, 3, 0]], bell: 0.45, bellIns: 'musicbox', drone: true, lead: 'musicbox', lh: 'pad', padIns: 'choir' },
  sky2: { modes: ['lydian', 'major'], roots: [53, 55, 57], tempo: [60, 72], density: 0.55, register: 5, progs: [[0, 1, 4, 0], [0, 4, 1, 5], [0, 5, 3, 4]], bell: 0.5, lead: 'flute', lead2: 'harp', lh: 'harp', arp: true, padIns: 'choir' },
  depths2: { modes: ['harmonic', 'phrygian', 'hijaz'], roots: [38, 40, 41], tempo: [48, 58], density: 0.4, register: -5, progs: [[0, 1, 0, 4], [0, 5, 1, 4]], bell: 0, drone: true, lead: 'cello', lead2: 'clarinet', lh: 'pluck', padIns: 'choir', perc: 'frame' },
  cave2: { modes: ['phrygian', 'aeolian', 'whole'], roots: [40, 43, 45], tempo: [46, 56], density: 0.3, register: -4, progs: [[0, 1, 0, 6], [0, 5, 6, 0]], bell: 0.35, bellIns: 'musicbox', drone: true, lead: 'piano', lead2: 'musicbox', lh: 'harp', padIns: 'strings' },
});
// night: the same instruments, darker and slower
function musicNight(M) {
  return Object.assign({}, M, { modes: M.modes.includes('hijaz') ? ['hijaz', 'phrygian'] : ['dorian', 'aeolian'], tempo: [M.tempo[0] * 0.85, M.tempo[1] * 0.85], density: M.density * 0.8, bell: Math.max(M.bell || 0, 0.3), perc: M.perc === 'shaker' ? null : M.perc, register: (M.register || 0) - 2 });
}

// ---- the band -------------------------------------------------------------------------------------------------------
Object.assign(Music.prototype, {
  noiseBuf() {
    if (this._noise) return this._noise;
    const c = this.g.sfx.ctx, n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (this._noise = b);
  },
  noise(t, dur, type, f, Q, gain, out, att = 0.002) {
    const c = this.g.sfx.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf(); s.loop = true;
    const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = Q;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(out || this.mix); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return fl;
  },
  osc(type, f, t, end, out, det = 0) { const o = this.g.sfx.ctx.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.connect(out); o.start(t); o.stop(end); return o; },
  vib(o, t, rate, depth, delay = 0.2) {
    const c = this.g.sfx.ctx, l = c.createOscillator(), lg = c.createGain();
    l.frequency.value = rate; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(depth, t + delay + 0.3);
    l.connect(lg); lg.connect(o.frequency); l.start(t); return l;
  },
  // a harp: bright when plucked, mellowing as it rings
  harp(t, m, d, v, out) {
    const c = this.g.sfx.ctx, f = this.hz(m), dec = clamp(2.6 - (m - 48) * 0.03, 0.9, 3);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(900, t + dec * 0.6);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    lp.connect(g); g.connect(out || this.mix);
    this.osc('triangle', f, t, t + dec + 0.05, lp); const o2 = this.osc('sine', f * 2, t, t + dec * 0.5, lp); o2.detune.value = 3;
  },
  // a breathy flute with a slow vibrato
  flute(t, m, d, v, out) {
    const c = this.g.sfx.ctx, f = this.hz(m), len = Math.max(0.25, d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06 * v, t + 0.07); g.gain.setValueAtTime(0.055 * v, t + len * 0.85); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.25);
    g.connect(out || this.mix);
    const o = this.osc('sine', f, t, t + len + 0.3, g), o2 = this.osc('triangle', f, t, t + len + 0.3, g);
    const l1 = this.vib(o, t, 5.2, f * 0.006), l2 = this.vib(o2, t, 5.2, f * 0.006); l1.stop(t + len + 0.3); l2.stop(t + len + 0.3);
    const lpT = c.createGain(); lpT.gain.value = 0.15; o2.disconnect(); o2.connect(lpT); lpT.connect(g);
    this.noise(t, Math.min(len, 0.4) + 0.2, 'bandpass', f * 2, 1.4, 0.012 * v, out, 0.05);
  },
  // bowed strings: detuned saws through a soft filter, swelling in
  strings(t, m, d, v, out) {
    const c = this.g.sfx.ctx, f = this.hz(m), short = d < 0.35, att = short ? 0.02 : Math.min(0.5, d * 0.25), len = Math.max(0.12, d);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = short ? 2600 : 1700; lp.Q.value = 0.6;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022 * v, t + att); g.gain.setValueAtTime(0.022 * v, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + (short ? 0.08 : 0.5));
    lp.connect(g); g.connect(out || this.mix);
    const end = t + len + (short ? 0.12 : 0.6);
    for (const det of [-8, 0, 7]) { const o = this.osc('sawtooth', f, t, end, lp, det); if (!short) this.vib(o, t, 5 + det * 0.03, f * 0.004, 0.3).stop(end); }
  },
  // a choir singing "ah": saws through vowel resonances
  choir(t, m, d, v, out) {
    const c = this.g.sfx.ctx, f = this.hz(m), len = Math.max(0.6, d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * v, t + Math.min(0.8, len * 0.4)); g.gain.setValueAtTime(0.05 * v, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + 1.2);
    g.connect(out || this.mix);
    const mixIn = c.createGain(); mixIn.gain.value = 1;
    for (const [ff, q, a] of [[730, 9, 1], [1090, 10, 0.5], [2440, 12, 0.25]]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff; b.Q.value = q; const bg = c.createGain(); bg.gain.value = a * 3; mixIn.connect(b); b.connect(bg); bg.connect(g); }
    const end = t + len + 1.3;
    for (const det of [-10, 9]) { const o = this.osc('sawtooth', f, t, end, mixIn, det); this.vib(o, t, 4.6 + det * 0.02, f * 0.005, 0.4).stop(end); }
  },
  // a horn call: warm, with the filter opening as it swells
  horn(t, m, d, v, out) {
    const c = this.g.sfx.ctx, f = this.hz(m), len = Math.max(0.3, d);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(350, t); lp.frequency.linearRampToValueAtTime(1500, t + 0.15); lp.frequency.linearRampToValueAtTime(1100, t + len);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * v, t + 0.1); g.gain.setValueAtTime(0.045 * v, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.35);
    lp.connect(g); g.connect(out || this.mix);
    const end = t + len + 0.4; this.osc('sawtooth', f, t, end, lp, -4); this.osc('sawtooth', f, t, end, lp, 5); this.osc('sine', f / 2, t, end, lp);
  },
  // brass stabs for battle
  brass(t, m, d, v, out) {
    const c = this.g.sfx.ctx, f = this.hz(m), len = Math.max(0.15, d);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.2; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(3400, t + 0.05); lp.frequency.exponentialRampToValueAtTime(1500, t + len);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05 * v, t + 0.03); g.gain.exponentialRampToValueAtTime(0.03 * v, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.2);
    lp.connect(g); g.connect(out || this.mix);
    const end = t + len + 0.25; this.osc('sawtooth', f, t, end, lp, -6); this.osc('sawtooth', f, t, end, lp, 6);
  },
  // marimba and kalimba, music box and celesta: struck and plucked bars and tines
  bar(t, m, v, out, parts, dec, lvl) {
    const c = this.g.sfx.ctx, f = this.hz(m), g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(lvl * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); g.connect(out || this.mix);
    for (const [r, a, pd] of parts) { if (f * r > 10000) continue; const pg = c.createGain(); pg.gain.setValueAtTime(a, t); pg.gain.exponentialRampToValueAtTime(0.0001, t + dec * pd); pg.connect(g); this.osc('sine', f * r, t, t + dec + 0.05, pg); }
  },
  marimba(t, m, d, v, out) { this.bar(t, m, v, out, [[1, 1, 1], [3.93, 0.35, 0.12], [9.2, 0.08, 0.05]], 0.75, 0.16); },
  kalimba(t, m, d, v, out) { this.bar(t, m, v, out, [[1, 1, 1], [5.4, 0.25, 0.1], [2, 0.12, 0.4]], 1.1, 0.13); },
  musicbox(t, m, d, v, out) { this.bar(t, m + 12, v, out, [[1, 1, 1], [2.98, 0.3, 0.25], [5.9, 0.1, 0.1]], 1.3, 0.07); },
  celesta(t, m, d, v, out) { this.bar(t, m + 12, v, out, [[1, 1, 1], [4, 0.2, 0.2], [2, 0.15, 0.5]], 1.6, 0.06); },
  // a plucked oud / lute: bright then quickly dark
  pluck(t, m, d, v, out) {
    const c = this.g.sfx.ctx, f = this.hz(m), dec = clamp(1.6 - (m - 48) * 0.02, 0.6, 1.8);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2; lp.frequency.setValueAtTime(3800, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.075 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    lp.connect(g); g.connect(out || this.mix);
    this.osc('sawtooth', f, t, t + dec + 0.05, lp); this.osc('sawtooth', f, t, t + dec + 0.05, lp, 9);
  },
  clarinet(t, m, d, v, out) {
    const c = this.g.sfx.ctx, f = this.hz(m), len = Math.max(0.25, d);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035 * v, t + 0.06); g.gain.setValueAtTime(0.032 * v, t + len); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.2);
    lp.connect(g); g.connect(out || this.mix);
    const o = this.osc('square', f, t, t + len + 0.25, lp); this.vib(o, t, 4.8, f * 0.004, 0.3).stop(t + len + 0.25);
  },
  cello(t, m, d, v, out) { this.strings(t, m - 12, d, v * 1.5, out); },
  // drums
  taiko(t, m, d, v, out) {
    const c = this.g.sfx.ctx, g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); g.connect(out || this.mix);
    const o = this.osc('sine', 150, t, t + 0.6, g); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.22);
    this.noise(t, 0.12, 'lowpass', 700, 0.7, 0.22 * v, out);
  },
  timpani(t, m, d, v, out) {
    const c = this.g.sfx.ctx, f = this.hz(m), g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.32 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3); g.connect(out || this.mix);
    const o = this.osc('sine', f * 1.03, t, t + 1.35, g); o.frequency.exponentialRampToValueAtTime(f, t + 0.1); this.osc('sine', f * 1.5, t, t + 0.6, g);
    this.noise(t, 0.08, 'lowpass', 400, 0.7, 0.12 * v, out);
  },
  snare(t, m, d, v, out) { this.noise(t, 0.14, 'highpass', 1400, 0.7, 0.14 * v, out); const c = this.g.sfx.ctx, g = c.createGain(); g.gain.setValueAtTime(0.12 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); g.connect(out || this.mix); this.osc('triangle', 190, t, t + 0.1, g); },
  hand(t, m, d, v, out) {
    const c = this.g.sfx.ctx, g = c.createGain(), f = m > 60 ? 240 : 130;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + (m > 60 ? 0.12 : 0.28)); g.connect(out || this.mix);
    const o = this.osc('sine', f * 1.4, t, t + 0.3, g); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    if (m > 60) this.noise(t, 0.05, 'bandpass', 2400, 1.5, 0.05 * v, out);
  },
  frame(t, m, d, v, out) {
    // doum (low) and tek (high, dry)
    if (m < 60) { const c = this.g.sfx.ctx, g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); g.connect(out || this.mix); const o = this.osc('sine', 120, t, t + 0.35, g); o.frequency.exponentialRampToValueAtTime(78, t + 0.12); }
    else this.noise(t, 0.06, 'bandpass', 2600, 1.8, 0.09 * v, out);
  },
  shaker(t, m, d, v, out) { this.noise(t, 0.07, 'highpass', 6500, 0.7, 0.035 * v, out, 0.012); },
  cymbal(t, m, d, v, out) {
    const c = this.g.sfx.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf(); s.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5200;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * v, t + Math.max(0.01, d)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 1.4);
    s.connect(hp); hp.connect(g); g.connect(out || this.mix); s.start(t); s.stop(t + d + 1.5);
  },
});
// The bus again, with room for the battle music and the fanfare beside the quiet pieces, and a limiter.
Music.prototype.ensureBus = function () {
  const s = this.g.sfx;
  if (this.bus || !s.ctx) return !!this.bus;
  const c = s.ctx;
  this.bus = c.createGain(); this.bus.gain.value = this.volume * 0.55;
  const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 6500;
  const dry = c.createGain(); dry.gain.value = 0.72;
  const wet = c.createGain(); wet.gain.value = 0.5;
  const verb = c.createConvolver();
  const len = Math.floor(c.sampleRate * 3.2), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < 400 ? i / 400 : 1); }
  verb.buffer = ir;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.3;
  this.mix = c.createGain(); this.mix.gain.value = 1;
  this.bmix = c.createGain(); this.bmix.gain.value = 0;
  this.fmix = c.createGain(); this.fmix.gain.value = 1;
  for (const m of [this.mix, this.bmix, this.fmix]) m.connect(tone);
  tone.connect(dry); tone.connect(verb); verb.connect(wet);
  dry.connect(this.bus); wet.connect(this.bus); this.bus.connect(comp); comp.connect(c.destination);
  return true;
};
Music.prototype.schedule = function () {
  const c = this.g.sfx.ctx, horizon = c.currentTime + 2.5;
  while (this.ni < this.notes.length && this.start + this.notes[this.ni].t < horizon) {
    const n = this.notes[this.ni++], at = Math.max(c.currentTime + 0.02, this.start + n.t), f = this[n.ins];
    if (typeof f === 'function') f.call(this, at, n.m, n.d, n.v, this.mix);
  }
};

// ---- writing a piece for a place ---------------------------------------------------------------------------------------
function composePiece2(M, seed) {
  if (!M.lead && !M.lh && !M.perc && !M.padIns) return composePiece(M, seed);
  const r = mulberry32(seed), pick = (a) => a[Math.floor(r() * a.length)];
  const mode = MUSIC_MODES[pick(M.modes)], root = pick(M.roots) + (M.register || 0);
  const bpm = M.tempo[0] + r() * (M.tempo[1] - M.tempo[0]), beat = 60 / bpm;
  const prog = pick(M.progs), progB = pick(M.progs);
  const deg = (d, oct = 0) => { const o = Math.floor(d / 7); return root + mode[((d % 7) + 7) % 7] + 12 * (o + oct); };
  const notes = [], add = (bt, ins, m, d, v) => notes.push({ t: bt * beat, ins, m, d: d * beat, v });
  const lead = M.lead || 'piano', lead2 = M.lead2 || lead, lh = M.lh || 'piano', padI = M.padIns || 'pad';
  // intro, theme, theme again (changed), a second part on other chords, the theme once more, and an ending
  const sections = [{ bars: 2, mel: false, lh: 0.4 }, { bars: 8, mel: true, lh: 1, ins: lead }, { bars: 8, mel: true, lh: 1, vary: true, up: r() < 0.4 ? 7 : 0, ins: lead2 },
    { bars: 8, mel: r() < 0.7, lh: 0.8, B: true, ins: lead2 }, { bars: 8, mel: true, lh: 1, vary: true, ins: lead }, { bars: 4, mel: r() < 0.5, lh: 0.5, end: true, ins: lead }];
  const rhythms = [[2, 1, 1], [1.5, 0.5, 2], [1, 1, 2], [3, 1], [1, 0.5, 0.5, 2], [2, 2], [1, 1, 1, 1], [0.5, 0.5, 1, 2]];
  const mkMotif = () => { const mo = []; let st = 0; for (const len of pick(rhythms)) { mo.push({ s: st, len, rest: r() < 0.1 }); st += pick([-2, -1, -1, 1, 1, 2, 0, 3]); } return mo; };
  const motif = mkMotif(), motifB = mkMotif();
  let t = 0, bar = 0;
  for (const S of sections) {
    const P = S.B ? progB : prog;
    for (let b = 0; b < S.bars; b++, bar++) {
      const last = S.end && b === S.bars - 1;
      const ch = last ? 0 : P[Math.floor(b / 2) % P.length] + (S.B ? 0 : 0);
      const barT = t + b * 4;
      if (b % 2 === 0 || last) for (const k of [0, 2, 4]) add(barT, padI, deg(ch + k, -1), last ? 6 : 8, 0.65 + r() * 0.25);
      if (M.drone && bar % 4 === 0) add(barT, 'drone', root - 12, 16, 0.8);
      // the left hand: broken chords, or rippling arpeggios by the sea and in the sky
      if (r() < 0.88 * S.lh) {
        if (M.arp || lh === 'harp' && r() < 0.5) { const up = [0, 2, 4, 7, 9, 7, 4, 2]; for (let i = 0; i < 8; i++) if (r() < 0.9) add(barT + i * 0.5, lh, deg(ch + up[i], -1), 1.2, 0.4 + r() * 0.15); }
        else { const pat = pick([[0, 4, 7, 4], [0, 2, 4, 7], [0, 4, 9, 7], [0, 7, 4, 2]]); for (let i = 0; i < 4; i++) if (r() < 0.82) add(barT + i, lh, deg(ch + ([0, 2, 4, 7, 9].indexOf(pat[i]) >= 0 ? [0, 2, 4, 4, 5][[0, 2, 4, 7, 9].indexOf(pat[i])] : 0), -1) + (pat[i] === 7 ? 12 : 0), 1.5, 0.42 + r() * 0.2); }
      }
      // percussion, softly
      if (M.perc && S.lh >= 0.8 && !last) {
        if (M.perc === 'frame') for (const [bt, hi, vv] of [[0, 0, 0.9], [1, 1, 0.5], [1.5, 1, 0.4], [2, 0, 0.7], [3, 1, 0.5]]) add(barT + bt, 'frame', hi ? 72 : 48, 0.2, vv);
        else if (M.perc === 'hand') for (const [bt, hi, vv] of [[0, 0, 0.8], [0.75, 1, 0.4], [1.5, 1, 0.5], [2, 0, 0.6], [2.5, 1, 0.4], [3.5, 1, 0.45]]) add(barT + bt, 'hand', hi ? 72 : 48, 0.2, vv * (0.85 + r() * 0.3));
        else if (M.perc === 'shaker') for (let i = 0; i < 8; i++) add(barT + i * 0.5, 'shaker', 0, 0.1, i % 2 ? 0.5 : 0.8);
      }
      // the melody
      const mo = S.B ? motifB : motif;
      if (S.mel && (b % 2 === 0 || r() < M.density * 0.6) && r() < M.density + 0.3) {
        let at = barT + (r() < 0.5 ? 0 : pick([0.5, 1, 2]));
        const start = ch + pick([0, 2, 4]) + 7 + (S.up || 0);
        for (const n of mo) {
          const vary = S.vary && r() < 0.35 ? pick([-1, 1, 2]) : 0;
          if (!n.rest && at < barT + 4.5) add(at, S.ins || lead, deg(start + n.s + vary), n.len, 0.7 + r() * 0.25);
          at += n.len;
        }
      }
      if (M.bell && r() < M.bell * 0.5) add(barT + pick([1, 2, 3, 3.5]), M.bellIns || 'bell', deg(ch + pick([0, 2, 4]), 2), 1, 0.6);
    }
    t += S.bars * 4;
  }
  add(t, lh, deg(0, -1), 4, 0.5); add(t + 0.03, lh, deg(4, -1), 4, 0.4); add(t + 0.06, lead === 'horn' ? 'harp' : lead, deg(0), 4, 0.45);
  notes.sort((a, b) => a.t - b.t);
  return notes;
}
{
  // what the place sounds like
  Music.prototype.biomeMood = function (p) {
    const g = this.g, gen = g.world && g.world.gen;
    if (!gen || !gen.column) return 'day';
    if (gen.villagesNear) { try { if (gen.villagesNear(p.x, p.z, 8).length) return 'village'; } catch (e) { /* no villages here */ } }
    const c = gen.column(Math.floor(p.x), Math.floor(p.z));
    switch (c.biome) {
      case BIOME.OCEAN: case BIOME.BEACH: return 'ocean';
      case BIOME.DESERT: return 'desert';
      case BIOME.TAIGA: return 'frost';
      case BIOME.MOUNTAINS: return c.temp < -0.15 ? 'frost' : 'peaks';
      case BIOME.FOREST: return c.temp > 0.25 && c.humid > 0.3 ? 'jungle' : c.humid > 0.4 && c.h <= SEA + 4 ? 'swamp' : 'forest';
      default: return c.temp > 0.28 && c.humid < 0.02 ? 'savanna' : 'plains';
    }
  };
  Music.prototype.moodNow = function () {
    const g = this.g;
    if (!g.inWorld()) return 'menu';
    const lp = g.local, p = lp && lp.player;
    if (g.dim === DIM.DEPTHS) return Math.random() < 0.5 ? 'depths' : 'depths2';
    if (g.dim === DIM.SKYLANDS) return Math.random() < 0.35 ? 'sky' : 'sky2';
    if (!p || !g.world) return 'day';
    if (p.contacts && p.contacts.eyeWater) return 'deep';
    const sky = g.world.getLight(Math.floor(p.x), Math.floor(p.y + 1), Math.floor(p.z)) >> 4;
    if (sky < 4 && p.y < SEA - 4) return Math.random() < 0.5 ? 'cave' : 'cave2';
    if (g.creative && Math.random() < 0.25) return 'creative';
    const m = this.biomeMood(p), night = g.env && g.env.day < 0.45;
    return night ? m + ':night' : m;
  };
  Music.prototype.play = function (mood) {
    if (!this.ensureBus()) return;
    const c = this.g.sfx.ctx;
    this.mix.gain.cancelScheduledValues(c.currentTime); this.mix.gain.value = 1;
    this.mood = mood;
    const [k, night] = String(mood).split(':'), base = MUSIC_MOODS[k] || MUSIC_MOODS.day;
    this.notes = composePiece2(night ? musicNight(base) : base, Math.floor(Math.random() * 1e9));
    this.ni = 0; this.start = c.currentTime + 0.3; this.playing = true;
    this.end = this.start + (this.notes.length ? this.notes[this.notes.length - 1].t + 6 : 1);
    this.schedule();
  };
}

// ---- the battle --------------------------------------------------------------------------------------------------------
{
  Music.prototype.bossNear = function () {
    const g = this.g, lp = g.local, p = lp && lp.player;
    if (!p || p.dead) return null;
    let best = null, bd = 40;
    for (const e of g.entities) {
      if (!(e.T && e.T.boss) || !e.alive || e.deathTime > 0) continue;
      if (e.T.dragon && (e.sleeping || e.dstate === 'sleep')) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y, e.z - p.z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  };
  Music.prototype.startBattle = function (boss) {
    if (!this.ensureBus()) return;
    const c = this.g.sfx.ctx;
    if (this.playing) this.stop();
    const dragon = !!boss.T.dragon, r = mulberry32((Math.random() * 1e9) | 0), pick = (a) => a[Math.floor(r() * a.length)];
    const motif = []; let st = 0; for (const len of pick([[1, 0.5, 0.5, 1, 1], [1.5, 0.5, 1, 1], [0.5, 0.5, 1, 0.5, 0.5, 1], [2, 1, 1]])) { motif.push({ s: st, len }); st += pick([-1, 1, 2, -2, 1, 3]); }
    const eerie = boss.type === 'herobrine';
    this.battle = { boss, dragon: dragon || eerie, bpm: eerie ? 132 : dragon ? 124 : 142 + r() * 8, root: eerie ? 45 : dragon ? 50 : pick([45, 50, 52]), progs: eerie ? [[0, 1, 0, 4], [0, 5, 1, 4], [0, 1, 6, 4]] : [[0, 5, 3, 4], [0, 3, 5, 4], [0, 5, 6, 4], [0, 1, 0, 4]], prog: [0, 5, 3, 4], motif, bar: 0, next: c.currentTime + 0.6 };
    this.bmix.gain.cancelScheduledValues(c.currentTime); this.bmix.gain.setValueAtTime(this.bmix.gain.value, c.currentTime); this.bmix.gain.linearRampToValueAtTime(1, c.currentTime + 1.5);
  };
  Music.prototype.endBattle = function (won) {
    const b = this.battle; this.battle = null;
    if (!b || !this.bmix) return;
    const c = this.g.sfx.ctx, now = c.currentTime;
    this.bmix.gain.cancelScheduledValues(now); this.bmix.gain.setValueAtTime(this.bmix.gain.value, now); this.bmix.gain.linearRampToValueAtTime(0, now + (won ? 0.8 : 4));
    this.wait = won ? 50 + Math.random() * 40 : 25 + Math.random() * 20;
    if (won) this.fanfare(b, now + 0.6);
  };
  Music.prototype.fanfare = function (b, t) {
    const beat = 60 / 120, root = b.root + 3, o = this.fmix;     // in the relative major
    const at = (k) => t + k * beat;
    [0, 4, 7, 12].forEach((s, i) => { this.brass(at(i * 0.5), root + s, 0.45 * beat, 0.9, o); this.brass(at(i * 0.5), root + s - 12, 0.45 * beat, 0.6, o); });
    for (const s of [0, 4, 7, 12, 16]) this.brass(at(2), root + s, 3.5 * beat, 0.8, o);
    for (const s of [0, 4, 7]) this.choir(at(2), root + s, 5 * beat, 0.9, o);
    for (let i = 0; i < 12; i++) this.timpani(at(i * 0.125), root - 12, 0.2, 0.3 + i * 0.05, o);
    this.timpani(at(2), root - 12, 1, 1, o); this.cymbal(at(1.6), 0, 0.4, 1, o);
    this.strings(at(2), root - 12, 4 * beat, 1, o);
  };
  // one bar of the fight, written as it's needed
  Music.prototype.battleBar = function (b, t0) {
    const beat = 60 / b.bpm, mode = MUSIC_MODES.harmonic, root = b.root, o = this.bmix;
    const deg = (d, oct = 0) => { const k = Math.floor(d / 7); return root + mode[((d % 7) + 7) % 7] + 12 * (k + oct); };
    const boss = b.boss, frac = boss && boss.maxHealth ? boss.health / boss.maxHealth : 1;
    const bar = b.bar, intro = bar < 2, fierce = frac < 0.5 ? 2 : 1;
    if (bar % 8 === 0) b.prog = b.progs[Math.floor(Math.random() * b.progs.length)];
    const ch = b.prog[Math.floor(bar / 2) % b.prog.length];
    const T = (x) => t0 + x * beat;
    // driving low strings in eighths
    for (let i = 0; i < 8; i++) this.strings(T(i * 0.5), deg(ch, -1) + (i % 4 === 3 ? 12 : 0), 0.42 * beat, i % 4 === 0 ? 1 : 0.7, o);
    // drums
    const drum = b.dragon ? (x, v) => this.timpani(T(x), deg(0, -2) + (x === 2 ? 7 : 0), 0.3, v, o) : (x, v) => this.taiko(T(x), 0, 0.3, v, o);
    for (const [x, v] of [[0, 1], [1.5, 0.6], [2, 0.85], [3, 0.6]]) drum(x, v);
    if (fierce > 1 || bar % 2 === 1) for (const [x, v] of [[0.75, 0.5], [2.5, 0.55], [3.5, 0.6]]) drum(x, v);
    if (bar % 4 === 3) for (let i = 0; i < 8; i++) this.snare(T(3 + i * 0.125), 0, 0.1, 0.3 + i * 0.08, o);
    else for (const x of [1, 3]) this.snare(T(x), 0, 0.1, 0.45, o);
    if (bar % 8 === 7) this.cymbal(T(2), 0, 2 * beat, 1, o);
    if (intro) { b.bar++; return; }
    // brass on the chord changes, choir holding it
    if (bar % 2 === 0) {
      for (const k of [0, 2, 4]) this.brass(T(0), deg(ch + k), 1.3 * beat, 0.8, o);
      for (const k of [0, 2, 4]) this.choir(T(0), deg(ch + k), 7.5 * beat, b.dragon ? 1 : 0.7, o);
    }
    if (fierce > 1) for (const k of [0, 2, 4]) this.brass(T(2.5), deg(ch + k), 0.4 * beat, 0.6, o);
    // the theme, high, in answering phrases
    const ph = bar % 16;
    if ((ph >= 4 && ph < 8) || (ph >= 12 && ph < 16) || (fierce > 1 && ph >= 8 && ph < 12)) {
      let at = 0;
      for (const n of b.motif) { if (at < 4) { const m = deg(ch + 7 + n.s + (ph >= 12 ? 2 : 0)); if (b.dragon) this.horn(T(at), m, n.len * beat, 0.9, o); else this.strings(T(at), m + 12, n.len * beat, 0.9, o); } at += n.len; }
    }
    b.bar++;
  };
  const baseUpdate = Music.prototype.update;
  Music.prototype.update = function (dt) {
    const g = this.g, s = g.sfx;
    if (!s.ctx || this.volume <= 0) { if (this.battle) this.endBattle(false); return baseUpdate.call(this, dt); }
    const boss = g.inWorld() ? this.bossNear() : null;
    if (boss && !this.battle && !(g.jukeboxes && g.jukeboxes.size)) this.startBattle(boss);
    if (this.battle) {
      const b = this.battle;
      if (boss) { b.boss = boss; b.lost = 0; }
      const won = b.boss && (b.boss.health <= 0 || b.boss.deathTime > 0);
      if (won) { this.endBattle(true); return; }
      if (!boss) { b.lost = (b.lost || 0) + dt; if (b.lost > 6 || !g.inWorld()) { this.endBattle(false); return; } }
      const c = s.ctx;
      if (b.next < c.currentTime) b.next = c.currentTime + 0.05;
      while (b.next < c.currentTime + 1.2) { this.battleBar(b, b.next); b.next += 4 * 60 / b.bpm; }
      return;
    }
    // more music than before: shorter quiet spells between pieces
    const wasPlaying = this.playing;
    const r = baseUpdate.call(this, dt);
    if (wasPlaying && !this.playing && g.inWorld()) this.wait = Math.min(this.wait, 50 + Math.random() * 80);
    if (this.inWorldT > 0 && this.inWorldT < dt * 1.5) this.wait = Math.min(this.wait, 15 + Math.random() * 20);
    return r;
  };
}
