// ---------------------------------------------------------------------------
// game/audio.js — every sound is synthesized with WebAudio. No sound files.
// Audio starts on the first tap/click (browsers require a gesture).
// ---------------------------------------------------------------------------

class Sfx {
  constructor() { this.ctx = null; this.volume = 0.6; this.noise = null; this.last = {}; this.listeners = () => []; }
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
  ok(name, gap = 0.04) {
    if (!this.ctx || this.volume <= 0) return false;
    const t = this.ctx.currentTime;
    if (this.last[name] && t - this.last[name] < gap) return false;
    this.last[name] = t; return true;
  }
  noiseHit(dur, freq, q, gain, type = 'bandpass', pan = 0) {
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    let node = g;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); node = p; }
    src.connect(f); f.connect(g); node.connect(this.out || this.master);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }
  tone(freq, dur, type, gain, slideTo, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out || this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  // material-flavoured dig/step/place
  material(mat, kind) {
    if (!this.ok(kind + mat, kind === 'step' ? 0.2 : 0.05)) return;
    const M = {
      stone: [900, 1.2], grass: [2400, 0.6], gravel: [1500, 0.8], wood: [500, 2.5], sand: [3000, 0.5],
      glass: [3800, 3], snow: [3400, 0.4], wool: [700, 0.3], metal: [2600, 6],
    }[mat] || [1000, 1];
    const gain = kind === 'step' ? 0.12 : kind === 'break' ? 0.5 : 0.32;
    const dur = kind === 'step' ? 0.09 : kind === 'break' ? 0.22 : 0.12;
    this.noiseHit(dur, M[0] * (0.9 + Math.random() * 0.2), M[1], gain);
    if (kind === 'break' && mat === 'glass') { this.tone(2400, 0.15, 'triangle', 0.08, 1200); this.tone(3100, 0.12, 'triangle', 0.06, 1800, 0.03); }
    if (mat === 'wood' && kind !== 'step') this.tone(180, 0.08, 'triangle', 0.12, 120);
    if (mat === 'metal' && kind !== 'step') { this.tone(1400 + Math.random() * 300, 0.12, 'triangle', 0.06, 1100); this.tone(2900, 0.08, 'sine', 0.03, 2600, 0.01); }
  }
  // Note blocks: a plucked tone; the block underneath picks the instrument.
  note(n, under) {
    if (!this.ok('note' + n, 0.02)) return;
    const f = 185 * Math.pow(2, n / 12);
    const mat = under && BLOCKS[under] ? BLOCKS[under].sound : 'wood';
    if (mat === 'stone') { this.tone(f / 2, 0.25, 'triangle', 0.16, f / 2.05); this.noiseHit(0.05, 200, 1, 0.2, 'lowpass'); }
    else if (mat === 'sand' || mat === 'gravel') this.noiseHit(0.08, 4000, 2, 0.2, 'highpass');
    else if (mat === 'glass') this.tone(f * 2, 0.12, 'square', 0.04, f * 2);
    else if (mat === 'metal' || mat === 'gold') { this.tone(f * 2, 0.9, 'sine', 0.08, f * 2); this.tone(f * 4.02, 0.6, 'sine', 0.03, f * 4); }
    else if (mat === 'wool') this.tone(f / 2, 0.5, 'sine', 0.12, f / 2);
    else { this.tone(f, 0.45, 'triangle', 0.12, f); this.tone(f * 2, 0.15, 'sine', 0.04, f * 2); }
  }
  // Positional: quieter with distance from the nearest local player.
  playAt(name, x, y, z, range = 28) {
    if (!this.ctx) return;
    let d = Infinity;
    for (const l of this.listeners()) d = Math.min(d, Math.hypot(l.x - x, l.y - y, l.z - z));
    if (d > range) return;
    const g = this.ctx.createGain();
    g.gain.value = clamp(1 - (d - 3) / (range - 3), 0, 1);
    g.connect(this.master);
    this.out = g;
    try { this.play(name); } finally { this.out = null; }
  }
  play(name) {
    if (!this.ok(name)) return;
    switch (name) {
      case 'pop': this.tone(520 + Math.random() * 200, 0.08, 'sine', 0.18, 900); break;
      case 'bow': this.noiseHit(0.12, 2600, 3, 0.18); this.tone(260, 0.12, 'triangle', 0.1, 180); break;
      case 'arrow_hit': this.noiseHit(0.06, 1800, 2, 0.25); this.tone(420, 0.05, 'square', 0.04, 260); break;
      case 'shear': this.noiseHit(0.05, 5200, 4, 0.2, 'highpass'); this.noiseHit(0.05, 4800, 4, 0.16, 'highpass'); break;
      case 'anvil': this.tone(1460, 0.6, 'triangle', 0.1, 1430); this.tone(2910, 0.4, 'sine', 0.05, 2880); this.noiseHit(0.08, 3000, 3, 0.2); break;
      case 'moo': this.tone(140, 0.7, 'sawtooth', 0.06, 110); this.tone(142, 0.7, 'triangle', 0.08, 100); break;
      case 'oink': this.tone(320, 0.14, 'sawtooth', 0.05, 240); this.tone(300, 0.12, 'square', 0.03, 220, 0.16); break;
      case 'baa': this.tone(420, 0.45, 'sawtooth', 0.04, 380); this.tone(426, 0.45, 'triangle', 0.05, 384); break;
      case 'cluck': this.tone(900, 0.06, 'square', 0.04, 700); this.tone(820, 0.06, 'square', 0.035, 640, 0.09); break;
      case 'dig_gravel': this.noiseHit(0.12, 1500, 0.8, 0.3); break;
      case 'click': this.tone(700, 0.04, 'square', 0.04); break;
      case 'click_off': this.tone(520, 0.04, 'square', 0.035); break;
      case 'piston_out': this.noiseHit(0.16, 700, 1.4, 0.32, 'lowpass'); this.tone(170, 0.12, 'triangle', 0.1, 260); break;
      case 'piston_in': this.noiseHit(0.14, 600, 1.4, 0.28, 'lowpass'); this.tone(240, 0.12, 'triangle', 0.09, 150); break;
      case 'dispense': this.tone(900, 0.05, 'square', 0.04, 1100); this.noiseHit(0.06, 2400, 2, 0.12); break;
      case 'dispense_fail': this.tone(1300, 0.04, 'square', 0.035); this.tone(1300, 0.04, 'square', 0.03, 0, 0.07); break;
      case 'rail': this.noiseHit(0.3, 900, 3, 0.07, 'bandpass'); this.tone(95, 0.25, 'sawtooth', 0.02, 90); break;
      case 'door_open': this.noiseHit(0.18, 600, 1.5, 0.25, 'bandpass'); this.tone(220, 0.16, 'triangle', 0.08, 300); break;
      case 'door_close': this.noiseHit(0.1, 400, 1.2, 0.35, 'lowpass'); this.tone(150, 0.1, 'triangle', 0.1, 110); break;
      case 'bell': [0, 1].forEach(i => { this.tone(880 * (i ? 2.76 : 1), 2.4, 'sine', i ? 0.04 : 0.12, 870 * (i ? 2.76 : 1)); }); this.tone(1320, 1.6, 'sine', 0.05, 1310); break;
      case 'creak': this.tone(90 + Math.random() * 40, 0.5, 'sawtooth', 0.025, 70); this.noiseHit(0.3, 500, 4, 0.05); break;
      case 'grind': this.noiseHit(0.35, 300, 0.8, 0.18, 'lowpass'); this.noiseHit(0.2, 1200, 2, 0.05); break;
      case 'saw': this.noiseHit(0.25, 2400, 3, 0.12, 'bandpass'); this.tone(320, 0.2, 'sawtooth', 0.02, 300); break;
      case 'explode': this.noiseHit(1.4, 140, 0.5, 0.9, 'lowpass'); this.noiseHit(0.6, 800, 0.5, 0.4, 'lowpass'); this.tone(50, 1, 'sine', 0.5, 25); break;
      case 'fuse': this.noiseHit(1.2, 5000, 0.6, 0.12, 'highpass'); break;
      case 'ignite': this.noiseHit(0.15, 2600, 1, 0.3); this.noiseHit(0.5, 900, 0.6, 0.12, 'lowpass'); break;
      case 'tick': this.tone(1100, 0.025, 'square', 0.025); break;
      case 'swap': this.noiseHit(0.08, 1800, 1.2, 0.12); break;
      case 'hurt': this.tone(220, 0.18, 'sawtooth', 0.18, 110); this.noiseHit(0.12, 600, 1, 0.25); break;
      case 'hit': this.noiseHit(0.08, 1800, 1.5, 0.4); this.tone(160, 0.06, 'square', 0.1, 90); break;
      case 'crit': this.tone(1200, 0.1, 'triangle', 0.1, 2200); break;
      case 'eat': for (let i = 0; i < 3; i++) setTimeout(() => this.ctx && this.noiseHit(0.06, 2500, 2, 0.25), i * 90); this.tone(500, 0.12, 'sine', 0.06, 700, 0.25); break;
      case 'heal': this.tone(660, 0.12, 'sine', 0.1, 880); this.tone(880, 0.16, 'sine', 0.08, 1100, 0.08); break;
      case 'levelup': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.12, 0, i * 0.08)); break;
      case 'splash': this.noiseHit(0.35, 1200, 0.5, 0.35, 'lowpass'); break;
      case 'fizz': this.noiseHit(0.4, 5000, 0.8, 0.25, 'highpass'); break;
      case 'boar': this.tone(140 + Math.random() * 40, 0.18, 'sawtooth', 0.08, 90); break;
      case 'ghoul': this.tone(90, 0.6, 'sawtooth', 0.09, 70); this.tone(96, 0.6, 'sawtooth', 0.06, 74); break;
      case 'rattle': for (let i = 0; i < 5; i++) this.tone(900 + Math.random() * 500, 0.03, 'square', 0.035, 600, i * 0.045); break;
      case 'spider': this.noiseHit(0.25, 3200, 1.5, 0.12, 'highpass'); this.tone(220, 0.12, 'sawtooth', 0.04, 160); break;
      case 'hiss': this.noiseHit(1.4, 4200, 0.5, 0.22, 'highpass'); break;
      case 'squish': this.noiseHit(0.12, 600, 1.2, 0.3, 'lowpass'); this.tone(180, 0.1, 'sine', 0.12, 90); break;
      case 'roar': this.tone(70, 1.1, 'sawtooth', 0.22, 45); this.noiseHit(1.0, 300, 0.7, 0.3, 'lowpass'); break;
      case 'slam': this.noiseHit(0.6, 180, 0.6, 0.7, 'lowpass'); this.tone(55, 0.5, 'sine', 0.4, 30); break;
      case 'charge': this.noiseHit(0.5, 800, 0.4, 0.25, 'lowpass'); break;
      case 'fireball': this.noiseHit(0.5, 600, 0.6, 0.3, 'lowpass'); this.tone(300, 0.4, 'sawtooth', 0.05, 120); break;
      case 'warn': this.tone(880, 0.12, 'square', 0.06); this.tone(660, 0.12, 'square', 0.05, 0, 0.12); break;
      case 'portal': [262, 330, 392].forEach((f, i) => this.tone(f, 1.4, 'sine', 0.06, f * 1.5, i * 0.05)); this.noiseHit(1.2, 1500, 0.3, 0.12, 'bandpass'); break;
      case 'fell': this.noiseHit(0.5, 400, 1.2, 0.4); this.tone(110, 0.4, 'triangle', 0.15, 70); break;
      case 'thud': this.noiseHit(0.3, 250, 0.8, 0.5, 'lowpass'); break;
      case 'chest': this.tone(240, 0.12, 'triangle', 0.1, 180); this.noiseHit(0.1, 900, 2, 0.15); break;
      case 'bucket': this.noiseHit(0.25, 1600, 0.6, 0.25, 'lowpass'); break;
      case 'death': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.12, 0, i * 0.15)); break;
      case 'victory': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.12, 0, i * 0.11)); break;
      case 'burn': this.noiseHit(0.15, 3000, 0.6, 0.12, 'highpass'); break;
      case 'craft': this.tone(400, 0.06, 'square', 0.05); this.noiseHit(0.08, 1200, 2, 0.15); break;
      case 'equip': this.noiseHit(0.12, 2200, 1.5, 0.2); this.tone(900, 0.08, 'triangle', 0.06, 700); break;
      case 'cave': { // a low, distant swell — the only sound he ever makes
        const c = this.ctx, t = c.currentTime;
        const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; f.Q.value = 6;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 1.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.5);
        src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + 4.6);
        this.tone(55, 4, 'sine', 0.05, 52);
        break;
      }
      case 'chirp': { const f = 2400 + Math.random() * 1600; this.tone(f, 0.07, 'sine', 0.05, f * 1.4); this.tone(f * 1.1, 0.06, 'sine', 0.04, f * 0.9, 0.09); if (Math.random() < 0.5) this.tone(f * 1.2, 0.05, 'sine', 0.035, f * 1.5, 0.17); break; }
      case 'cricket': { const f = 4200 + Math.random() * 600; for (let i = 0; i < 3; i++) this.tone(f, 0.035, 'square', 0.012, f * 0.98, i * 0.07); break; }
      case 'drip': { const f = 1400 + Math.random() * 900; this.tone(f, 0.09, 'sine', 0.06, f * 0.55); this.tone(f * 1.6, 0.05, 'sine', 0.02, f, 0.04); break; }
      case 'flap': for (let i = 0; i < 4; i++) setTimeout(() => this.ctx && this.noiseHit(0.05, 700, 0.8, 0.12, 'bandpass'), i * 70); break;
      case 'frost': this.tone(1800, 0.25, 'sine', 0.08, 2600); this.noiseHit(0.2, 6000, 1, 0.1, 'highpass'); break;
    }
  }
}
