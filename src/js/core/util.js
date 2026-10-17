// ---------------------------------------------------------------------------
// core/util.js — math, seeded randomness, noise. No dependencies.
// ---------------------------------------------------------------------------

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fract = (x) => x - Math.floor(x);
const TAU = Math.PI * 2;

// Seeded PRNG (mulberry32). Deterministic, fast, good enough for gameplay.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Integer hash for per-position determinism (no state).
function hash32(a, b, c, d) {
  let h = (a | 0) * 374761393 + (b | 0) * 668265263 + (c | 0) * 2147483647 + (d | 0) * 1274126177;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return h >>> 0;
}
const hashFloat = (a, b, c, d) => hash32(a, b, c, d) / 4294967296;

// String -> 32-bit seed (so players can type words as seeds).
function seedFromString(s) {
  s = String(s).trim();
  if (/^-?\d+$/.test(s) && Math.abs(Number(s)) < 2 ** 31) return Number(s) | 0;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h | 0;
}

// ---- Simplex noise (Gustavson), seeded permutation --------------------------
class SimplexNoise {
  constructor(seed) {
    const rand = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) { this.perm[i] = p[i & 255]; this.permMod12[i] = this.perm[i] % 12; }
  }
  noise2(xin, yin) {
    const perm = this.perm, pm = this.permMod12, g = SimplexNoise.grad3;
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { const gi = pm[ii + perm[jj]] * 3; t0 *= t0; n0 = t0 * t0 * (g[gi] * x0 + g[gi + 1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { const gi = pm[ii + i1 + perm[jj + j1]] * 3; t1 *= t1; n1 = t1 * t1 * (g[gi] * x1 + g[gi + 1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { const gi = pm[ii + 1 + perm[jj + 1]] * 3; t2 *= t2; n2 = t2 * t2 * (g[gi] * x2 + g[gi + 1] * y2); }
    return 70 * (n0 + n1 + n2);
  }
  noise3(xin, yin, zin) {
    const perm = this.perm, pm = this.permMod12, g = SimplexNoise.grad3;
    const F3 = 1 / 3, G3 = 1 / 6;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let n = 0;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) { const gi = pm[ii + perm[jj + perm[kk]]] * 3; t0 *= t0; n += t0 * t0 * (g[gi] * x0 + g[gi + 1] * y0 + g[gi + 2] * z0); }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) { const gi = pm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; t1 *= t1; n += t1 * t1 * (g[gi] * x1 + g[gi + 1] * y1 + g[gi + 2] * z1); }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) { const gi = pm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; t2 *= t2; n += t2 * t2 * (g[gi] * x2 + g[gi + 1] * y2 + g[gi + 2] * z2); }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) { const gi = pm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; t3 *= t3; n += t3 * t3 * (g[gi] * x3 + g[gi + 1] * y3 + g[gi + 2] * z3); }
    return 32 * n;
  }
  fbm2(x, y, octaves, lacunarity = 2, gain = 0.5) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let o = 0; o < octaves; o++) { sum += amp * this.noise2(x * freq, y * freq); norm += amp; amp *= gain; freq *= lacunarity; }
    return sum / norm;
  }
}
SimplexNoise.grad3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);

// ---- Matrices (column-major Float32Array(16), WebGL convention) -------------
const MAT4_TMP = new Float32Array(16);
const Mat4 = {
  create() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
    return out;
  },
  // View rotation for a camera whose world rotation is Ry(yaw)·Rx(pitch).
  // yaw=0,pitch=0 looks down -Z; +yaw turns toward -X; +pitch looks up.
  // V = Rx(-pitch)·Ry(-yaw), stored column-major.
  viewRotation(out, yaw, pitch) {
    const c = Math.cos(yaw), s = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    out[0] = c; out[1] = s * sp; out[2] = s * cp; out[3] = 0;
    out[4] = 0; out[5] = cp; out[6] = -sp; out[7] = 0;
    out[8] = -s; out[9] = c * sp; out[10] = c * cp; out[11] = 0;
    out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
    return out;
  },
  // (0.9.0.54) no new arrays: these run for every creature, cloud and limb every frame, and the garbage added up
  multiply(out, a, b) {
    const r = MAT4_TMP;
    for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) {
      r[c * 4 + rr] = a[rr] * b[c * 4] + a[4 + rr] * b[c * 4 + 1] + a[8 + rr] * b[c * 4 + 2] + a[12 + rr] * b[c * 4 + 3];
    }
    out.set(r); return out;
  },
  identity(out) { out.fill(0); out[0] = out[5] = out[10] = out[15] = 1; return out; },
  translate(out, x, y, z) { // out = out * T
    out[12] += out[0] * x + out[4] * y + out[8] * z;
    out[13] += out[1] * x + out[5] * y + out[9] * z;
    out[14] += out[2] * x + out[6] * y + out[10] * z;
    out[15] += out[3] * x + out[7] * y + out[11] * z;
    return out;
  },
  // out = out * R, worked in place (the same numbers the full multiply gave)
  rotateY(out, a) { const c = Math.cos(a), s = Math.sin(a); for (let i = 0; i < 4; i++) { const x = out[i], z = out[8 + i]; out[i] = x * c - z * s; out[8 + i] = x * s + z * c; } return out; },
  rotateX(out, a) { const c = Math.cos(a), s = Math.sin(a); for (let i = 0; i < 4; i++) { const y = out[4 + i], z = out[8 + i]; out[4 + i] = y * c + z * s; out[8 + i] = z * c - y * s; } return out; },
  rotateZ(out, a) { const c = Math.cos(a), s = Math.sin(a); for (let i = 0; i < 4; i++) { const x = out[i], y = out[4 + i]; out[i] = x * c + y * s; out[4 + i] = y * c - x * s; } return out; },
  scale(out, x, y, z) { for (let i = 0; i < 4; i++) { out[i] *= x; out[4 + i] *= y; out[8 + i] *= z; } return out; },
};

// Frustum planes from a view-projection matrix; test AABB visibility.
function frustumPlanes(m, out) {
  const p = out || new Float32Array(24);
  const set = (i, a, b, c, d) => { const l = Math.hypot(a, b, c); p[i] = a / l; p[i + 1] = b / l; p[i + 2] = c / l; p[i + 3] = d / l; };
  set(0, m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]);
  set(4, m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
  set(8, m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]);
  set(12, m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
  set(16, m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]);
  set(20, m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]);
  return p;
}
function aabbInFrustum(p, x0, y0, z0, x1, y1, z1) {
  for (let i = 0; i < 24; i += 4) {
    const a = p[i], b = p[i + 1], c = p[i + 2], d = p[i + 3];
    const x = a > 0 ? x1 : x0, y = b > 0 ? y1 : y0, z = c > 0 ? z1 : z0;
    if (a * x + b * y + c * z + d < 0) return false;
  }
  return true;
}

// Pack world block coords into one number key (x,z within ±1,000,000).
const posKey = (x, y, z) => ((x + 1048576) * 2097152 + (z + 1048576)) * 128 + y;
function unpackPosKey(k) {
  const y = k % 128; k = (k - y) / 128;
  const zz = k % 2097152; const xx = (k - zz) / 2097152;
  return [xx - 1048576, y, zz - 1048576];
}

// Base64 helpers for Uint8Array (used by save encoding).
function bytesToBase64(bytes) {
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(s);
}
function base64ToBytes(b64) {
  const s = atob(b64); const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

const randInt = (rand, a, b) => a + Math.floor(rand() * (b - a + 1));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
