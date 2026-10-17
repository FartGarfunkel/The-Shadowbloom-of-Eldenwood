// ---------------------------------------------------------------------------
// game/ambience.js — the world's background sound: wind on the heights,
// birds by day, crickets at night, drips and far rumbles in caves, the hiss
// of the Ember Depths. Built from the same synth as every other sound.
// (A fuller alpha-style soundscape and music come in a later update.)
// ---------------------------------------------------------------------------

class Ambience {
  constructor(game) {
    this.g = game; this.level = 0.7; this.music = 0.5;
    this.wind = null; this.t = { bird: 3, cricket: 2, drip: 4, rumble: 30 };
  }
  setLevels(amb, music) { this.level = amb; this.music = music; if (this.wind) this.wind.g.gain.value = 0; }
  stopAll() { if (this.wind) { try { this.wind.src.stop(); } catch (e) { /* already stopped */ } this.wind = null; } }
  // A looping band of filtered noise whose loudness follows height and openness.
  ensureWind() {
    const s = this.g.sfx;
    if (this.wind || !s.ctx || !s.noise) return;
    const c = s.ctx;
    const src = c.createBufferSource(); src.buffer = s.noise; src.loop = true; src.playbackRate.value = 0.35;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 0.6;
    const g = c.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(s.master); src.start();
    this.wind = { src, f, g };
  }
  update(dt) {
    const g = this.g, s = g.sfx, lp = g.local;
    if (!s.ctx || !lp || !g.world || this.level <= 0) { if (this.wind) this.wind.g.gain.value = 0; return; }
    this.ensureWind();
    const p = lp.player, w = g.world;
    const l = w.getLight(Math.floor(p.x), Math.floor(p.y + 1), Math.floor(p.z));
    const sky = l >> 4;                               // 15 = open sky, 0 = deep underground
    const day = g.env.day || 0;
    const high = clamp((p.y - 80) / 40, 0, 1);
    const open = sky / 15;
    // wind
    if (this.wind) {
      const gust = g.wind ? clamp(g.wind.gust / 0.35, 0, 1) : 0;   // the wind's roar swells with each gust
      const want = this.level * (g.dim === DIM.OVERWORLD || g.dim === DIM.SKYLANDS ? 0.02 + open * (0.025 + high * 0.08) * (1 + gust * 1.6) : g.dim === DIM.DEPTHS ? 0.035 : 0.01);
      const gg = this.wind.g.gain; gg.value += (want - gg.value) * Math.min(1, dt * 1.5);
      this.wind.f.frequency.value = 300 + high * 400 + Math.sin(g.time * 0.21) * 80;
    }
    const T = this.t;
    for (const k in T) T[k] -= dt;
    const vol = this.level;
    const at = (name, dist) => {
      const a = Math.random() * TAU;
      const d = dist * (0.5 + Math.random() * 0.5);
      s.playAt(name, p.x + Math.cos(a) * d, p.y + 2, p.z + Math.sin(a) * d, 40);
    };
    if (vol <= 0.05) return;
    if (g.dim === DIM.OVERWORLD || g.dim === DIM.SKYLANDS) {
      if (open > 0.7 && day > 0.6 && T.bird <= 0) { T.bird = 2 + Math.random() * 6; if (Math.random() < vol) at('chirp', 14); }
      if (open > 0.7 && day < 0.4 && T.cricket <= 0) { T.cricket = 0.6 + Math.random() * 1.8; if (Math.random() < vol) at('cricket', 10); }
    }
    if (sky < 4 && T.drip <= 0) { T.drip = 1.5 + Math.random() * 5; if (Math.random() < vol) at('drip', 8); }
    if (sky < 2 && T.rumble <= 0) { T.rumble = 40 + Math.random() * 80; if (Math.random() < vol * 0.8) s.play('cave'); }
    if (g.dim === DIM.DEPTHS && T.drip <= 0.1 && Math.random() < dt * 0.3) at('burn', 6);
  }
}
