// ---------------------------------------------------------------------------
// game/sound3.js — 0.8.6.2: sound that sits in the world.
//
// Sounds come from where they are: through a head-related (HRTF) panner, so
// in front, behind and to the side all sound different. They travel the way
// sound does: the game floods out through the air from where you stand (a few
// times a second), so something round the corner of your cave is heard, and
// something on the far side of the rock isn't — a cow up on the surface is
// gone once you're mining below, and a zombie through a wall comes muffled.
// Enclosed spaces ring: a small room a little, a big cave a lot.
//
// Monsters give themselves away like they do in the classic game: zombies moan
// as they wander, skeletons rattle, spiders hiss, and they all have feet —
// shuffling, clacking, skittering (only the fuseling creeps up quietly).
// Animals walk on whatever they stand on. Sit in the dark long enough and the
// caves start making their noises. Your hurt is the old "oof", and a felled
// tree creaks over and crashes down.
// ---------------------------------------------------------------------------

const SND3 = { g: null, field: null, fieldT: 0, mood: 0, moodT: 0, wet: [0, 0] };

// ---- the mix: everything through one bus, with a room and a cave on sends ------------------------------
{
  const baseUnlock = Sfx.prototype.unlock;
  Sfx.prototype.unlock = function () {
    const fresh = !this.ctx;
    baseUnlock.call(this);
    if (!fresh || !this.ctx || this.bus3) return;
    try {
      const c = this.ctx, out = this.master, sr = c.sampleRate;
      const ir = (secs, damp, early) => {
        const n = Math.floor(sr * secs), b = c.createBuffer(2, n, sr);
        for (let ch = 0; ch < 2; ch++) {
          const d = b.getChannelData(ch); let lp = 0;
          for (let i = 0; i < n; i++) {
            const t = i / sr, a = damp + (1 - damp) * Math.exp(-t * 5);    // darker as it dies away
            lp += ((Math.random() * 2 - 1) - lp) * a;
            d[i] = lp * Math.pow(1 - i / n, 2) * Math.exp(-t * 2.5 / secs) * Math.min(1, i / (sr * 0.004));
          }
          for (let k = 0; k < early; k++) { const i = Math.floor(sr * (0.008 + Math.random() * 0.07)); if (i < n) d[i] += (Math.random() < 0.5 ? -1 : 1) * (0.6 - k * 0.05); }
        }
        return b;
      };
      const bus = c.createGain(); bus.connect(out);
      const mk = (buf) => { const g = c.createGain(), v = c.createConvolver(); g.gain.value = 0; v.buffer = buf; bus.connect(g); g.connect(v); v.connect(out); return g; };
      this.bus3 = { bus, room: mk(ir(0.8, 0.5, 8)), cave: mk(ir(2.8, 0.28, 5)) };
      this.vol = out; this.master = bus;
    } catch (e) { console.warn('reverb', e); }
  };
  Sfx.prototype.setVolume = function (v) { this.volume = v; const n = this.vol || this.master; if (n) n.gain.value = v; };
}

// ---- how sound gets from there to here ----------------------------------------------------------------
// From the listener's head, flood out through the air (and water, leaves, doors, slabs...) up to 20 blocks
// and 24000 cells. A sound in a cell the flood reached is heard by the way round (a bit further than straight);
// one it couldn't reach (the flood ran out of air before its cap) is behind solid rock.
const SND3_R = 20, SND3_N = 2 * SND3_R + 1;
const SND3_DIST = new Uint8Array(SND3_N * SND3_N * SND3_N), SND3_Q = new Int32Array(SND3_N * SND3_N * SND3_N);
function snd3Blocks(id) { return T_SOLID[id] && !T_SHAPE[id] && !(BLOCKS[id] && BLOCKS[id].isLeaves); }
function snd3Field(g) {
  const L = g.local, cam = L && (L.cam || L.player), w = g.world;
  if (!cam || !w) return null;
  const hx = Math.floor(cam.x), hy = Math.floor(cam.y), hz = Math.floor(cam.z);
  const sky = w.getLight(hx, hy, hz) >> 4;
  if (sky >= 14) return { open: true, cells: 0 };
  const cx0 = (hx - SND3_R) >> 4, cz0 = (hz - SND3_R) >> 4, cw = ((hx + SND3_R) >> 4) - cx0 + 1, cd = ((hz + SND3_R) >> 4) - cz0 + 1;
  const chs = [];
  for (let a = 0; a < cw; a++) for (let b = 0; b < cd; b++) chs.push(w.chunkAt(cx0 + a, cz0 + b));
  const N = SND3_N, ox = hx - SND3_R, oy = hy - SND3_R, oz = hz - SND3_R, D = SND3_DIST, Q = SND3_Q;
  const cell = (x, y, z) => { if (y < 0 || y >= CH) return -1; const ch = chs[((x >> 4) - cx0) * cd + ((z >> 4) - cz0)]; return ch ? (y << 8) | ((z & 15) << 4) | (x & 15) : -1; };
  const chOf = (x, z) => chs[((x >> 4) - cx0) * cd + ((z >> 4) - cz0)];
  D.fill(255);
  let qh = 0, qt = 0, cells = 0, open = 0, complete = true;
  const start = ((hy - oy) * N + (hz - oz)) * N + (hx - ox);
  D[start] = 0; Q[qt++] = start;
  while (qh < qt) {
    if (cells >= 24000) { complete = false; break; }
    const i = Q[qh++], lx = i % N, lz = ((i / N) | 0) % N, ly = (i / (N * N)) | 0, dv = D[i];
    cells++;
    const x = lx + ox, y = ly + oy, z = lz + oz;
    const ch = chOf(x, z), ci = cell(x, y, z);
    if (ch && ci >= 0 && (ch.light[ci] >> 4) >= 14) open++;
    if (dv >= 254) continue;
    for (let k = 0; k < 6; k++) {
      const nx = lx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = ly + (k === 2 ? 1 : k === 3 ? -1 : 0), nz = lz + (k === 4 ? 1 : k === 5 ? -1 : 0);
      if (nx < 0 || ny < 0 || nz < 0 || nx >= N || ny >= N || nz >= N) continue;
      const j = (ny * N + nz) * N + nx;
      if (D[j] !== 255) continue;
      const wx = nx + ox, wy = ny + oy, wz = nz + oz, c2 = chOf(wx, wz), cj = cell(wx, wy, wz);
      if (!c2 || cj < 0 || snd3Blocks(c2.blocks[cj])) { D[j] = 254; continue; }   // rock: marked so it isn't looked at again
      D[j] = dv + 1; Q[qt++] = j;
    }
  }
  return { open: false, hx: hx + 0.5, hy: hy + 0.5, hz: hz + 0.5, ox, oy, oz, complete, cells, openFrac: cells ? open / cells : 0 };
}
// Straight-line count of solid blocks between two points (half for glass, doors and the like).
function snd3Wall(w, a, x, y, z) {
  const dx = x - a.x, dy = y - a.y, dz = z - a.z, len = Math.hypot(dx, dy, dz), n = Math.ceil(len * 2);
  let c = 0, last = -1;
  for (let s = 1; s < n; s++) {
    const t = s / n, bx = Math.floor(a.x + dx * t), by = Math.floor(a.y + dy * t), bz = Math.floor(a.z + dz * t), k = bx * 73856093 ^ by * 19349663 ^ bz * 83492791;
    if (k === last) continue; last = k;
    const id = w.getBlock(bx, by, bz);
    if (T_SOLID[id]) c += T_OPAQUE[id] && !T_SHAPE[id] ? 1 : 0.5;
    if (c >= 8) break;
  }
  return c;
}
// How a sound at (x, y, z) reaches listener L: { d: distance it travels, wall: how much is in the way }
function snd3Reach(g, L, x, y, z) {
  const d = Math.hypot(x - L.x, y - L.y, z - L.z), w = g && g.world;
  if (!w || d < 1.5) return { d, wall: 0 };
  const f = SND3.field;
  if (f && !f.open && Math.abs(L.x - f.hx) < 2.5 && Math.abs(L.y - f.hy) < 2.5 && Math.abs(L.z - f.hz) < 2.5) {
    const lx = Math.floor(x) - f.ox, ly = Math.floor(y) - f.oy, lz = Math.floor(z) - f.oz;
    if (lx >= 0 && ly >= 0 && lz >= 0 && lx < SND3_N && ly < SND3_N && lz < SND3_N) {
      const v = SND3_DIST[(ly * SND3_N + lz) * SND3_N + lx];
      if (v < 254) return { d: Math.max(d, v * 0.8), wall: 0 };
      if (f.complete) return { d, wall: Math.max(1, snd3Wall(w, L, x, y, z)) };
    }
  }
  // out in the open, things out in the open are simply heard
  const here = w.getLight(Math.floor(L.x), Math.floor(L.y), Math.floor(L.z)) >> 4, there = w.getLight(Math.floor(x), Math.floor(y + 0.5), Math.floor(z)) >> 4;
  if (here >= 12 && there >= 10) return { d, wall: 0 };
  return { d, wall: snd3Wall(w, L, x, y + 0.5, z) };
}
{
  // Placed sounds: how far they travel and what's in the way; where they come from (HRTF when one person plays)
  Sfx.prototype.playAt = function (name, x, y, z, range = 28, vol = 1) {
    if (!this.ctx) return;
    const node = this.placeNode(x, y, z, range, vol);
    if (!node) return;
    this.out = node; this._pan = 0.0001;
    try { this.play(name); } finally { this.out = null; this._pan = 0; }
  };
  // a step (or a dig) of some material, somewhere in the world
  Sfx.prototype.materialAt = function (mat, kind, x, y, z, range = 16, vol = 0.5) {
    if (!this.ctx || this.volume <= 0) return;
    const node = this.placeNode(x, y, z, range, vol);
    if (!node) return;
    const M = SND_MAT[mat] || SND_MAT.stone, spec = M[kind] || M.dig;
    if (!spec) return;
    this.out = node;
    try { this.sample(SND.packs.get(mat + '.' + kind) || sndTakes(this.ctx, mat + '.' + kind, spec), spec[1], 0.1); } finally { this.out = null; }
  };
  Sfx.prototype.placeNode = function (x, y, z, range, vol) {
    const c = this.ctx, ls = this.listeners();
    let L = null, best = Infinity;
    for (const l of ls) { const d = Math.hypot(l.x - x, l.y - y, l.z - z); if (d < best) { best = d; L = l; } }
    if (!L || best > range + 2) return null;
    const a = snd3Reach(SND3.g, L, x, y, z);
    if (a.d > range) return null;
    let gain = clamp(1 - (a.d - 3) / (range - 3), 0, 1) * vol;
    if (a.wall) gain *= Math.pow(0.42, Math.min(a.wall, 6));
    if (gain < 0.015) return null;
    const g = c.createGain(); g.gain.value = gain;
    let tail = g;
    if (a.wall) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(220, 1400 / a.wall); lp.Q.value = 0.5; tail.connect(lp); tail = lp; }
    if (ls.length === 1 && best > 0.6 && L.yaw !== undefined) {
      // where it is relative to your head: right, up, and in front (WebAudio looks down -z)
      const dx = x - L.x, dy = y - L.y, dz = z - L.z, rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw), fx = -Math.sin(L.yaw), fz = -Math.cos(L.yaw);
      const px = dx * rx + dz * rz, pf = dx * fx + dz * fz, n = Math.hypot(px, dy, pf) || 1;
      try {
        const p = c.createPanner();
        p.panningModel = 'HRTF'; p.distanceModel = 'linear'; p.refDistance = 1; p.maxDistance = 1e4; p.rolloffFactor = 0;
        if (p.positionX) { p.positionX.value = px / n; p.positionY.value = dy / n * 0.6; p.positionZ.value = -pf / n; } else p.setPosition(px / n, dy / n * 0.6, -pf / n);
        tail.connect(p); tail = p;
      } catch (e) { /* no panner: plain */ }
    }
    tail.connect(this.master);
    return g;
  };
}

// ---- once a frame: the air around you, the ring of the room, the mood of the dark ---------------------------
{
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) {
    baseFrame.call(this, dt);
    if (this._pass) return;
    SND3.g = this;
    if (this.state !== 'playing' || !this.world || !this.locals.length) return;
    try { snd3Tick(this, Math.min(dt, 0.1)); } catch (e) { if (!SND3.warned) { SND3.warned = true; console.warn('sound3', e); } }
  };
}
function snd3Tick(g, dt) {
  const s = g.sfx;
  if ((SND3.fieldT -= dt) <= 0) { SND3.fieldT = 0.35; SND3.field = snd3Field(g); }
  // reverb: a small enclosed space rings a little, a big one (a cavern) a lot; none out in the open
  const f = SND3.field;
  let room = 0, cave = 0;
  if (f && !f.open) {
    const shut = clamp(1 - f.openFrac * 4, 0, 1), size = f.complete ? f.cells : 24000;
    cave = shut * clamp((size - 1500) / 9000, 0, 1) * 0.55;
    room = shut * clamp(size / 600, 0, 1) * (1 - cave / 0.55) * 0.3;
  }
  if (s.bus3) {
    const t = s.ctx.currentTime;
    s.bus3.room.gain.setTargetAtTime(room, t, 0.6); s.bus3.cave.gain.setTargetAtTime(cave, t, 0.6);
  }
  // the dark: sit long enough where it's pitch black and the caves start making their noises
  const lp = g.local, p = lp && lp.player, w = g.world;
  if (!p || p.dead || (g.settings.ambience ?? 0.7) <= 0) return;
  if ((SND3.moodT -= dt) > 0) return;
  SND3.moodT = 0.25;
  const x = Math.floor(p.x + (Math.random() - 0.5) * 16), y = Math.floor(p.y + 1 + (Math.random() - 0.5) * 16), z = Math.floor(p.z + (Math.random() - 0.5) * 16);
  const id = w.getBlock(x, y, z), l = w.getLight(x, y, z);
  if (id === 0 && l === 0 && g.dim !== DIM.SKYLANDS) SND3.mood += 1 / 220;
  else if ((l >> 4) > 8 || (l & 15) > 6) SND3.mood = Math.max(0, SND3.mood - 1 / 400);
  if (SND3.mood >= 1) {
    SND3.mood = 0;
    const pick = SND3_CAVE[Math.floor(Math.random() * SND3_CAVE.length)];
    s.playAt(pick, x + 0.5, y + 0.5, z + 0.5, 48);
  }
}

// ---- monsters give themselves away; everything with feet has footsteps -----------------------------------
const SND3_FAMILY = (m) => {
  const T = m.T, v = T.voice;
  if (m.type === 'fuseling') return 'creeper';
  if (v === 'ghoul' || v === 'husk' || v === 'drowned' || T.family === 'ghoul') return 'zombie';
  if (v === 'rattle' || v === 'stray') return 'bone';
  if (v === 'spider' || v === 'mite' || v === 'scorpion' || m.type === 'cave_spider') return 'spider';
  return null;
};
{
  const base = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    const ox = this.x, oz = this.z, st0 = this.soundT;
    const r = base.apply(this, arguments);
    if (!this.alive || this.remove || !this.game || !this.T) return r;
    const g = this.game, fam = this._fam === undefined ? (this._fam = SND3_FAMILY(this)) : this._fam;
    // footsteps
    const moved = Math.hypot(this.x - ox, this.z - oz);
    if (moved > 0.001 && moved < 2 && (this.onGround || this.surf === 'wall') && !this.inWater && !this.T.flies) {
      const stride = fam === 'spider' ? 0.55 : fam === 'bone' ? 1.0 : fam === 'zombie' ? 1.2 : this.w > 0.55 ? 1.6 : this.w < 0.3 ? 0.7 : 1.1;
      this._stepAcc = (this._stepAcc || 0) + moved;
      if (this._stepAcc >= stride) {
        this._stepAcc = 0;
        if (fam === 'zombie' || fam === 'bone' || fam === 'spider') g.sfx.playAt('mstep_' + fam, this.x, this.y, this.z, 16);
        else if (this.w >= 0.25) {
          const id = g.world.getBlock(Math.floor(this.x), Math.floor(this.y - 0.2), Math.floor(this.z));
          if (id && BLOCKS[id]) g.sfx.materialAt(BLOCKS[id].sound, 'step', this.x, this.y, this.z, 14, fam === 'creeper' ? 0.18 : this.w > 0.55 ? 0.5 : 0.35);
        }
      }
    }
    // hostile ones make their noises as they wander, not only when they've seen you (the classic game's way)
    if (this.T.hostile && fam !== 'creeper' && this.T.voice) {
      if (this.soundT > st0 + 0.5) this._amb = 5 + Math.random() * 8;       // it just spoke
      else if ((this._amb = (this._amb ?? 2 + Math.random() * 8) - dt) <= 0) {
        this._amb = 5 + Math.random() * 8;
        let near = Infinity;
        for (const l of g.locals) near = Math.min(near, Math.hypot(l.player.x - this.x, l.player.z - this.z));
        if (near < 20) g.sfx.playAt(this.T.voice, this.x, this.y + this.h * 0.8, this.z);
      }
    }
    return r;
  };
}

// ---- the voices and noises ---------------------------------------------------------------------------
{
  const vp = (r, a) => 1 + (r() - 0.5) * a;
  // zombies: a low, rasping moan from a throat that doesn't work any more
  VOX.ghoul.say = [1.9, 0.85, (b, v, r) => {
    const p = vp(r, 0.2);
    const k = Math.floor(r() * 3);
    if (k === 0) {          // "uuhh... hhnn"
      b.throat(0, 0.8, { f: [[0, 104 * p], [0.4, 116 * p], [1, 92 * p]], v: 'xou', k: 0.9, breath: 0.32, sub: 0.5, rough: 0.45, jit: 0.05, drive: 1.8, att: 0.06, rel: 0.4 });
      b.throat(0.86, 0.6, { f: [[0, 96 * p], [1, 70 * p]], v: 'oux', k: 0.9, breath: 0.5, sub: 0.45, rough: 0.4, jit: 0.05, drive: 1.4, att: 0.05, rel: 0.6 });
    } else if (k === 1) {   // a long groan that rises and sinks
      b.throat(0, 1.45, { f: [[0, 80 * p], [0.35, 112 * p], [0.7, 98 * p], [1, 62 * p]], v: 'xuour', k: 0.88, breath: 0.36, sub: 0.55, rough: 0.5, jit: 0.055, drive: 2.1, am: [[4.5, 0.3]], att: 0.12, rel: 0.45 });
    } else {                    // a wet, gargling growl
      b.throat(0, 1.0, { f: [[0, 118 * p], [0.3, 132 * p], [1, 84 * p]], v: 'raox', k: 0.92, breath: 0.4, sub: 0.6, rough: 0.6, jit: 0.06, drive: 2.4, am: [[21, 0.35]], att: 0.05, rel: 0.5 });
    }
    b.room(0.1);
  }, 0.06];
  VOX.ghoul.hurt = [0.6, 0.9, (b, v, r) => { const p = vp(r, 0.2); b.throat(0, 0.34, { f: [[0, 168 * p], [0.2, 176 * p], [1, 112 * p]], v: 'axo', k: 0.92, breath: 0.35, sub: 0.35, rough: 0.3, att: 0.008, drive: 2.2, rel: 0.6 }); b.room(0.08); }];
  // spiders: a raspy, breathy hiss in short pulses, and a chitter of mouthparts
  VOX.spider.say = [1.0, 0.75, (b, v, r) => {
    let t = 0;
    for (let i = 0, n = 2 + (v % 3); i < n; i++) { const L = 0.14 + r() * 0.16; b.hiss(t, L, { bands: [[1500 + r() * 300, 1.3, 1], [2700, 1.6, 0.7], [4600, 2, 0.35]], gain: 0.75, att: 0.02, rel: 0.5, am: [[34 + r() * 10, 0.6]] }); b.throat(t, L, { f: [[0, 260], [1, 230]], v: 'ix', k: 1.6, breath: 0.95, att: 0.02, rel: 0.6, gain: 0.35 }); t += L + 0.05 + r() * 0.08; }
    for (let i = 0; i < 5; i++) b.clack(r() * t, 2600 + r() * 1400, 0.25, 0.005);
    b.room(0.08);
  }];
  // you: the old "oof"
  const oof = [0.4, 0.9, (b, v, r) => {
    const p = vp(r, 0.08);
    b.throat(0, 0.23, { f: [[0, 132 * p], [0.15, 150 * p], [0.7, 118 * p], [1, 92 * p]], v: 'ux', k: 1.0, breath: 0.18, sub: 0.06, att: 0.004, rel: 0.45, drive: 1.3, open: 0.55 });
    b.hiss(0.17, 0.08, { bands: [[1800, 0.8, 1], [3800, 1.2, 0.5]], gain: 0.12, att: 0.01, rel: 0.7 });     // the breath at the end
    b.thump(0, 110, 70, 0.06, 0.25);
  }, 0.04];
  VOX.hurt.say = oof; VOX.player.say = oof; VOX.player.hurt = oof;
  // animals that still spoke through the old synth, given real throats
  const A = (o) => o;
  Object.assign(VOX, {
    wolf: {
      say: [0.8, 0.8, (b, v, r) => { const p = vp(r, 0.15), n = v % 3 ? 2 : 1; for (let i = 0; i < n; i++) b.throat(i * 0.27, 0.15, { f: [[0, 430 * p], [0.3, 470 * p], [1, 300 * p]], v: 'ao', k: 1.12, breath: 0.4, sub: 0.15, att: 0.004, rel: 0.6, drive: 1.6, open: 0.45 }); b.room(0.08); }],
      hurt: [0.4, 0.8, (b, v, r) => { b.throat(0, 0.22, { f: [[0, 950], [1, 640]], v: 'ia', k: 1.25, breath: 0.3, att: 0.004, rel: 0.6, open: 0.45 }); }],
      death: [1.0, 0.8, (b, v, r) => { b.throat(0, 0.85, { f: [[0, 700], [0.3, 790], [1, 340]], v: 'iau', k: 1.2, breath: 0.25, vib: [8, 20], att: 0.01, rel: 0.6 }); }],
      angry: [1.1, 0.85, (b, v, r) => { b.throat(0, 1.0, { f: [[0, 78], [0.5, 88], [1, 72]], v: 'rro', k: 1.0, breath: 0.45, sub: 0.6, rough: 0.55, am: [[28, 0.4]], drive: 2.6, att: 0.06 }); }],
    },
    wolf_howl: { say: [2.8, 0.75, (b, v, r) => { const p = vp(r, 0.1); b.throat(0, 2.6, { f: [[0, 380 * p], [0.25, 640 * p], [0.8, 590 * p], [1, 420 * p]], v: 'uoou', k: 1.05, breath: 0.08, vib: [5, 12], att: 0.25, rel: 0.4 }); b.room(0.25, 1.4); }] },
    cat: {
      say: [0.8, 0.7, (b, v, r) => { const p = vp(r, 0.16); b.throat(0, 0.6, { f: [[0, 560 * p], [0.35, 770 * p], [1, 470 * p]], v: 'miau', k: 1.35, breath: 0.12, vib: [6, 10], att: 0.03, rel: 0.45, open: 0.45 }); }],
      hurt: [0.4, 0.8, (b, v, r) => { b.throat(0, 0.26, { f: [[0, 950], [1, 700]], v: 'ia', k: 1.4, breath: 0.25, att: 0.004, rel: 0.6, open: 0.45 }); }],
      angry: [1.0, 0.75, (b, v, r) => { b.hiss(0, 0.9, { bands: [[3200, 0.8, 1], [5600, 1.2, 0.5]], gain: 0.7, att: 0.02, rel: 0.4 }); }],
    },
    horse: {
      say: [1.6, 0.75, (b, v, r) => {
        const p = vp(r, 0.1);
        if (v % 3 === 2) { b.hiss(0, 0.45, { bands: [[900, 1, 1], [2200, 1, 0.5]], gain: 0.8, att: 0.01, rel: 0.6, am: [[30, 0.5]] }); b.hiss(0.55, 0.35, { bands: [[700, 1, 1]], gain: 0.6, att: 0.02, rel: 0.6 }); return; }   // a snort
        b.throat(0, 1.3, { f: [[0, 880 * p], [0.15, 1180 * p], [0.55, 760 * p], [1, 430 * p]], v: 'ieea', k: 1.0, breath: 0.15, vib: [13, 50], att: 0.03, rel: 0.4 }); b.room(0.12);
      }],
      hurt: [0.5, 0.8, (b, v, r) => { b.throat(0, 0.4, { f: [[0, 700], [1, 450]], v: 'ea', k: 1.0, breath: 0.3, att: 0.006, rel: 0.6 }); }],
    },
    duck: { say: [0.6, 0.65, (b, v, r) => { const p = vp(r, 0.12); for (let i = 0, n = 1 + (v % 3); i < n; i++) b.throat(i * 0.2, 0.15, { f: [[0, 300 * p], [1, 260 * p]], v: 'ae', k: 1.3, breath: 0.3, bw: 0.5, att: 0.006, rel: 0.5, open: 0.3, drive: 1.2 }); }] },
    goat: { say: [1.0, 0.7, (b, v, r) => { const p = vp(r, 0.15); b.throat(0, 0.75, { f: [[0, 600 * p], [1, 520 * p]], v: 'meea', k: 1.2, breath: 0.25, vib: [9, 40], am: [[9, 0.3]], att: 0.02, rel: 0.4 }); }] },
    frog: { say: [0.7, 0.7, (b, v, r) => { const p = vp(r, 0.1); for (let i = 0, n = 1 + (v % 2); i < n; i++) b.throat(i * 0.3, 0.22, { f: [[0, 190 * p], [1, 165 * p]], v: 'ao', k: 1.1, breath: 0.15, am: [[38, 0.95]], att: 0.01, rel: 0.5 }); }] },
    turkey: { say: [0.9, 0.7, (b, v, r) => { const p = vp(r, 0.1); b.throat(0, 0.7, { f: [[0, 520 * p], [1, 440 * p]], v: 'oua', k: 1.3, breath: 0.2, am: [[21, 0.85]], att: 0.01, rel: 0.4 }); }] },
    donkey: { say: [2.4, 0.75, (b, v, r) => { for (let i = 0; i < 3; i++) { b.throat(i * 0.72, 0.32, { f: [[0, 820], [1, 900]], v: 'i', k: 1.0, breath: 0.3, att: 0.01, rel: 0.4 }); b.throat(i * 0.72 + 0.36, 0.3, { f: [[0, 260], [1, 220]], v: 'a', k: 1.0, breath: 0.35, sub: 0.2, att: 0.01, rel: 0.4 }); } }] },
    bear: {
      say: [1.2, 0.8, (b, v, r) => { b.throat(0, 1.0, { f: [[0, 95], [0.5, 110], [1, 80]], v: 'oru', k: 0.82, breath: 0.45, sub: 0.5, rough: 0.45, am: [[18, 0.4]], drive: 2, att: 0.06 }); b.room(0.1); }],
      angry: [1.4, 0.9, (b, v, r) => { b.throat(0, 1.3, { f: [[0, 150], [0.3, 175], [1, 90]], v: 'aro', k: 0.82, breath: 0.5, sub: 0.6, rough: 0.55, am: [[22, 0.4]], drive: 2.6, att: 0.04 }); }],
    },
    fox: { say: [0.6, 0.65, (b, v, r) => { const p = vp(r, 0.15); b.throat(0, 0.3, { f: [[0, 1100 * p], [0.4, 1300 * p], [1, 650 * p]], v: 'iea', k: 1.3, breath: 0.45, att: 0.006, rel: 0.6, open: 0.4 }); }] },
  });
  void A;
}
// footsteps: a zombie's heavy shuffle, a skeleton's bones on stone, a spider's legs
SND_FX.mstep_zombie = [0.3, 0.55, (b, v, r) => { b.thump(0, 120 + r() * 30, 60, 0.09, 0.8); b.noise(0, 0.07, 'lp', 500, 0.8, 0.5, { brown: true, att: 0.003 }); b.noise(0.04, 0.16, 'bp', 1200 + r() * 500, 0.8, 0.28, { att: 0.04 }); }];
SND_FX.mstep_bone = [0.25, 0.5, (b, v, r) => { b.clack(0, 900 + r() * 500, 0.8, 0.012); b.clack(0.03 + r() * 0.03, 1500 + r() * 900, 0.5, 0.008); b.thump(0, 160, 100, 0.04, 0.3); }];
SND_FX.mstep_spider = [0.2, 0.45, (b, v, r) => { for (let i = 0; i < 3; i++) b.noise(i * (0.025 + r() * 0.02), 0.012, 'bp', 2600 + r() * 2200, 1.4, 0.6 - i * 0.1, { att: 0.0005 }); b.noise(0, 0.08, 'hp', 4000, 0.8, 0.12, { att: 0.01 }); }];
// a felled tree: the trunk creaks and splits as it goes, then it crashes down through its branches
SND_FX.tree_creak = [1.3, 0.8, (b, v, r) => {
  const c = b.sr, n = Math.floor(1.1 * c);
  for (let k = 0; k < 3; k++) { const t0 = k * 0.32 + r() * 0.08; b.modes(t0, [[180 + r() * 90, 0.08, 1], [420 + r() * 140, 0.05, 0.5]], 0.35, { droop: -0.4 }); b.noise(t0, 0.25, 'bp', 600 + r() * 300, 4, 0.25, { att: 0.08 }); }
  b.grains(0.05, 1.0, 40, 900, 4800, 2.2, 0.35, { front: 1.3, dMax: 0.008 });       // fibres snapping
  for (let i = 0; i < 4; i++) b.noise(0.1 + r() * 0.9, 0.006, 'bp', 1400 + r() * 1800, 1.2, 0.8);   // sharp cracks
  b.noise(0.6, 0.6, 'bp', 2400, 0.7, 0.25, { att: 0.4 });                            // the crown whooshing down
  void n;
}];
SND_FX.fell = [1.6, 1, (b, v, r) => {
  b.thump(0, 70, 34, 0.45, 1); b.noise(0, 0.35, 'lp', 260, 0.8, 0.8, { brown: true, att: 0.004 });   // the trunk hits the ground
  for (let i = 0; i < 9; i++) b.noise(r() * 0.35, 0.008, 'bp', 1000 + r() * 2500, 1.3, 0.6 * (0.5 + r() * 0.5));   // branches snapping
  b.grains(0.02, 1.2, 90, 1800, 7000, 1.4, 0.22, { front: 1.6, fade: true, dMax: 0.03 });   // the leaves thrashing
  b.room(0.08, 1.2);
}];
{
  const base = FallingTree.prototype.update;
  FallingTree.prototype.update = function (dt) {
    if (!this._creaked) { this._creaked = true; if (this.game && this.game.sfx) this.game.sfx.playAt('tree_creak', this.x, this.y + 2, this.z, 32); }
    return base.apply(this, arguments);
  };
}
// the dark's own noises (rendered once, with a long ring to them)
const SND3_CAVE = ['cave_a', 'cave_b', 'cave_c', 'cave_d', 'cave_e', 'cave_f'];
Object.assign(SND_FX, {
  // a deep swell that comes up out of the ground and sinks back
  cave_a: [5, 0.8, (b, v, r) => { b.noise(0, 4.6, 'lp', 120 + r() * 40, 2.5, 0.9, { att: 1.6, brown: true }); b.modes(0.3, [[43 + r() * 6, 1.4, 1], [65, 0.9, 0.4]], 0.35); b.room(0.3, 2); }],
  // a far-off wail, almost a voice
  cave_b: [4.2, 0.6, (b, v, r) => { b.throat(0, 3.2, { f: [[0, 310], [0.4, 430], [0.7, 380], [1, 240]], v: 'uoou', k: 1.1, breath: 0.85, vib: [4, 9], att: 0.8, rel: 0.5, gain: 0.7 }); b.shape('lp', 1600); b.room(0.45, 2.2); }],
  // metal dragged over stone somewhere below
  cave_c: [3.6, 0.55, (b, v, r) => { b.modes(0, [[620 + r() * 200, 0.6, 1], [1390, 0.4, 0.5], [2210, 0.25, 0.3]], 0.25, { droop: -0.25 }); b.noise(0, 2.4, 'bp', 1100, 6, 0.3, { att: 0.9, sweep: 0.6 }); b.room(0.4, 2); }],
  // stone shifting, and a trickle of grit
  cave_d: [3.4, 0.7, (b, v, r) => { b.noise(0, 1.2, 'lp', 180, 0.8, 0.8, { brown: true, att: 0.3 }); b.grains(0.6, 1.8, 45, 1500, 5000, 2, 0.3, { front: 0.7, fade: true }); b.room(0.35, 1.8); }],
  // slow breathing that isn't yours
  cave_e: [4.4, 0.55, (b, v, r) => { for (let i = 0; i < 2; i++) { b.hiss(i * 2.0, 1.1, { bands: [[500, 0.8, 1], [1100, 1, 0.4]], gain: 0.6, att: 0.5, rel: 0.4 }); b.hiss(i * 2.0 + 1.15, 0.8, { bands: [[650, 0.8, 1]], gain: 0.45, att: 0.1, rel: 0.7 }); } b.room(0.35, 1.8); }],
  // two tones that won't agree, bending slowly apart
  cave_f: [4.6, 0.5, (b, v, r) => { const f = 110 + r() * 60; b.modes(0.2, [[f, 1.2, 1], [f * 1.06, 1.2, 0.8], [f * 2.02, 0.6, 0.3]], 0.35, { droop: 0.08 }); b.noise(0, 4, 'bp', f * 3, 3, 0.15, { att: 1.5 }); b.room(0.4, 2.2); }],
});

// ---- doors, trapdoors, gates and chests: wood that moves -------------------------------------------------
// Real wooden doors aren't tuned: they're a dry rubbing creak on the hinge and a dead, hollow knock as the
// door meets its frame, with the latch clicking. (The old ones rang like a xylophone bar.) Iron and copper
// doors grind and clang instead.
function doorSound(b, open) {
  const k = (b && b.key) || '';
  const kind = /(^|_)(iron|copper)/.test(k) ? 'door_iron' : b && b.trapdoor ? 'trapdoor' : b && T_SHAPE[b.id] === SHAPE.GATE ? 'gate' : 'door';
  return kind + (open ? '_open' : '_close');
}
{
  // a hinge creaking: friction, rough and woody, not a squeal
  const creak = (b, r, t0, dur, f0, gain) => {
    const sr = b.sr, i0 = Math.floor(t0 * sr), n = Math.floor(dur * sr), c1 = sndBiquad('bp', f0, 2.2, sr), c2 = sndBiquad('bp', f0 * 2.3, 3, sr);
    let ph = 0;
    for (let i = 0; i < n && i0 + i < b.d.length; i++) {
      const t = i / n, rate = 26 + 34 * Math.sin(t * Math.PI) + r() * 14;      // the wood sticks and slips, faster in the middle of the swing
      ph += rate / sr;
      const slip = (ph % 1) < 0.18 ? (r() * 0.6 + 0.4) : r() * 0.08;
      const y = sndRun(c1, slip) * 0.8 + sndRun(c2, slip) * 0.35;
      b.d[i0 + i] += y * gain * Math.sin(Math.PI * Math.min(1, t * 1.15));
    }
  };
  // wood meeting wood: a hollow knock with no ring to it
  const knock = (b, r, t0, lo, gain) => {
    b.thump(t0, lo * 1.6, lo * 0.8, 0.07, 0.9 * gain);
    b.noise(t0, 0.06, 'lp', 520, 0.8, 0.75 * gain, { brown: true, att: 0.001 });
    b.noise(t0, 0.035, 'bp', 850 + r() * 250, 1.0, 0.6 * gain, { att: 0.0008 });
    b.noise(t0 + 0.002, 0.004, 'bp', 2400 + r() * 600, 1.4, 0.3 * gain);
  };
  Object.assign(SND_FX, {
    door_open: [0.55, 0.75, (b, v, r) => { creak(b, r, 0, 0.36, 420 + r() * 80, 0.55); knock(b, r, 0.02, 130, 0.35); b.noise(0.01, 0.004, 'bp', 3000, 1.6, 0.35); }],
    door_close: [0.4, 0.85, (b, v, r) => { creak(b, r, 0, 0.12, 460, 0.25); knock(b, r, 0.11, 120 + r() * 20, 1); b.noise(0.13, 0.005, 'bp', 2800, 1.6, 0.4); b.noise(0.15, 0.08, 'bp', 1200, 0.8, 0.12, { att: 0.01 }); }],
    trapdoor_open: [0.4, 0.7, (b, v, r) => { creak(b, r, 0, 0.2, 520, 0.4); knock(b, r, 0.2, 160, 0.7); }],
    trapdoor_close: [0.35, 0.8, (b, v, r) => { knock(b, r, 0, 150 + r() * 20, 1); b.noise(0.01, 0.06, 'bp', 1500, 0.8, 0.15, { att: 0.005 }); }],
    gate_open: [0.45, 0.7, (b, v, r) => { creak(b, r, 0, 0.3, 380, 0.45); b.noise(0.0, 0.004, 'bp', 2600, 1.5, 0.4); }],
    gate_close: [0.35, 0.8, (b, v, r) => { knock(b, r, 0.0, 140, 0.9); b.noise(0.02, 0.005, 'bp', 2800, 1.5, 0.45); }],
    door_iron_open: [0.6, 0.75, (b, v, r) => { b.noise(0, 0.45, 'bp', 700, 3, 0.4, { att: 0.08 }); b.modes(0.4, [[380, 0.08, 1], [1020, 0.04, 0.5], [2110, 0.02, 0.3]], 0.4); }],
    door_iron_close: [0.6, 0.85, (b, v, r) => { b.modes(0, [[230, 0.12, 1], [610, 0.07, 0.6], [1430, 0.035, 0.35], [2650, 0.02, 0.2]], 0.8); b.noise(0, 0.05, 'lp', 600, 0.8, 0.6); }],
    chest_close: [0.35, 0.85, (b, v, r) => { knock(b, r, 0, 130 + r() * 20, 1); b.noise(0.01, 0.004, 'bp', 3000, 1.6, 0.35); }],
    chest: [0.6, 0.8, (b, v, r) => { creak(b, r, 0, 0.45, 360 + r() * 60, 0.5); b.noise(0, 0.004, 'bp', 2000, 1.5, 0.35); }],
  });
}
