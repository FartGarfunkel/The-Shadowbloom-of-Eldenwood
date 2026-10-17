// ---------------------------------------------------------------------------
// render/clouds.js — 0.9.0.12: clouds, Cube World style.
//
// Big soft heaps of cloud: each one a cluster of rounded puffs, stepped like
// everything else in the world, flat underneath and piled up on top, bright
// white above and grey-blue below, warmed by the sunset. They drift across the
// sky with the wind and speed up when it gusts; when rain comes in the sky
// fills up with them and they turn grey.
//
// They're drawn twice: once against the open sky out to well past the edge of
// the land (so they reach the horizon), and once more against the land, so a
// cloud in front of a mountain hides it and one behind it is hidden.
// ---------------------------------------------------------------------------
const CLOUD_CELL = 112, CLOUD_REACH = 680, CLOUD_FAR = 2200;
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    addTile('cloud_top', p => p.noise(H('#ffffff'), 0.0));
    addTile('cloud_side', p => p.noise(H('#eef2f8'), 0.0));
    addTile('cloud_bottom', p => p.noise(H('#c4cedc'), 0.0));
  };
}
// a few cloud shapes, made once: puffs in a cluster, flat beneath, heaped on top
function cloudTemplates(gl) {
  if (cloudTemplates.list) return cloudTemplates.list;
  const spot = (n) => { const uv = tileUV(ATLAS.tile[n] ?? 0); return [(uv[0] + uv[2]) / 2, (uv[1] + uv[3]) / 2]; };
  const top = spot('cloud_top'), side = spot('cloud_side'), bot = spot('cloud_bottom');
  const list = [];
  const shadeOf = (f) => f === 2 ? 255 : f === 3 ? 170 : f < 2 ? 222 : 212, colOf = (f) => f === 2 ? top : f === 3 ? bot : side;
  for (let t = 0; t < 10; t++) {
    const rnd = mulberry32(9137 + t * 31), boxes = [];
    // the puffs, as boxes on 2-block layers (snapped to whole blocks across)
    const box = (x0, y0, z0, x1, y1, z1) => boxes.push([Math.round(x0), y0 >> 1, Math.round(z0), Math.round(x1), y1 >> 1, Math.round(z1)]);
    const Lx = 30 + rnd() * 46, Lz = 16 + rnd() * 22, N = 5 + Math.floor(rnd() * 6);
    for (let k = 0; k < N; k++) {
      const px = (rnd() - 0.5) * Lx, pz = (rnd() - 0.5) * Lz * 0.75;
      const r = 6 + rnd() * 8 * (1 - Math.abs(px) / Lx), hr = r * (0.55 + rnd() * 0.35), by = Math.floor(rnd() * 2) * 2;
      for (let y = 0; y < hr; y += 2) {
        const f = Math.sqrt(Math.max(0.04, 1 - Math.pow(y / hr, 2))), rr = Math.max(2, Math.round(r * f)), rz = Math.max(1, Math.round(r * f * 0.62));
        box(px - rr, by + y, pz - rz, px + rr, by + y + 2, pz + rz);
        box(px - rz, by + y, pz - rr, px + rz, by + y + 2, pz + rr);
      }
    }
    // (0.9.0.54) the puffs overlap a great deal, so they're filled into a grid and only the outside of the heap is
    // kept, merged into as few big faces as will do: the same cloud for a fraction of the triangles (and no hidden
    // faces drawn over each other inside it)
    let gx0 = 1e9, gz0 = 1e9, gx1 = -1e9, gz1 = -1e9, L = 0;
    for (const b of boxes) { gx0 = Math.min(gx0, b[0]); gz0 = Math.min(gz0, b[2]); gx1 = Math.max(gx1, b[3]); gz1 = Math.max(gz1, b[5]); L = Math.max(L, b[4]); }
    const X = gx1 - gx0, Z = gz1 - gz0, G = new Uint8Array(X * L * Z);
    const at = (x, l, z) => x < 0 || z < 0 || l < 0 || x >= X || z >= Z || l >= L ? 0 : G[(l * Z + z) * X + x];
    for (const b of boxes) for (let l = b[1]; l < b[4]; l++) for (let z = b[2] - gz0; z < b[5] - gz0; z++) G.fill(1, (l * Z + z) * X + b[0] - gx0, (l * Z + z) * X + b[3] - gx0);
    const mb = new MeshBuilder(4096), mask = new Uint8Array(Math.max(X * Z, Z * L, X * L));
    // (each face reaches a hair past its edges, so where merged faces meet unevenly no pixel of sky shows between them)
    const E = 0.03;
    const face = (f, a, l0, b, c, l1, d) => {
      const F = FACES[f], col = colOf(f), sh = shadeOf(f), ax = f >> 1;
      const X0 = a + gx0 - (ax !== 0 ? E : 0), X1 = c + gx0 + (ax !== 0 ? E : 0), Y0 = l0 * 2 - (ax !== 1 ? E : 0), Y1 = l1 * 2 + (ax !== 1 ? E : 0), Z0 = b + gz0 - (ax !== 2 ? E : 0), Z1 = d + gz0 + (ax !== 2 ? E : 0);
      const vs = F.c.map(q => mb.vert(q[0] ? X1 : X0, q[1] ? Y1 : Y0, q[2] ? Z1 : Z0, col[0], col[1], 255, 0, sh));
      mb.quad(vs[0], vs[1], vs[2], vs[3], false);
    };
    // the faces showing on one slice, merged into rectangles
    const greedy = (W, H, filled, emit) => {
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) mask[j * W + i] = filled(i, j) ? 1 : 0;
      for (let j = 0; j < H; j++) for (let i = 0; i < W;) {
        if (!mask[j * W + i]) { i++; continue; }
        let w = 1; while (i + w < W && mask[j * W + i + w]) w++;
        let h = 1;
        grow: while (j + h < H) { for (let k = 0; k < w; k++) if (!mask[(j + h) * W + i + k]) break grow; h++; }
        for (let jj = j; jj < j + h; jj++) mask.fill(0, jj * W + i, jj * W + i + w);
        emit(i, j, i + w, j + h); i += w;
      }
    };
    for (let l = 0; l < L; l++) {
      greedy(X, Z, (x, z) => at(x, l, z) && !at(x, l + 1, z), (a, b, c, d) => face(2, a, l, b, c, l + 1, d));
      greedy(X, Z, (x, z) => at(x, l, z) && !at(x, l - 1, z), (a, b, c, d) => face(3, a, l, b, c, l + 1, d));
    }
    for (let x = 0; x < X; x++) {
      greedy(Z, L, (z, l) => at(x, l, z) && !at(x + 1, l, z), (a, b, c, d) => face(0, x, b, a, x + 1, d, c));
      greedy(Z, L, (z, l) => at(x, l, z) && !at(x - 1, l, z), (a, b, c, d) => face(1, x, b, a, x + 1, d, c));
    }
    for (let z = 0; z < Z; z++) {
      greedy(X, L, (x, l) => at(x, l, z) && !at(x, l, z + 1), (a, b, c, d) => face(4, a, b, z, c, d, z + 1));
      greedy(X, L, (x, l) => at(x, l, z) && !at(x, l, z - 1), (a, b, c, d) => face(5, a, b, z, c, d, z + 1));
    }
    const r = mb.result();
    cloudTemplates.tris = (cloudTemplates.tris || 0) + r.count / 3; cloudTemplates.boxes = (cloudTemplates.boxes || 0) + boxes.length;
    list.push(makeVAO(gl, r.verts, r.idx));
  }
  return (cloudTemplates.list = list);
}
// (0.9.0.50) thin wisps high up, the kind that run ahead of a front: long flat streaks, one block thick
function wispTemplates(gl) {
  if (wispTemplates.list) return wispTemplates.list;
  const uv = tileUV(ATLAS.tile.cloud_top ?? 0), sp = [(uv[0] + uv[2]) / 2, (uv[1] + uv[3]) / 2], list = [];
  for (let t = 0; t < 4; t++) {
    const rnd = mulberry32(5501 + t * 17), mb = new MeshBuilder(2048);
    for (let k = 0; k < 6 + t; k++) {
      const x0 = (rnd() - 0.5) * 90, z0 = (rnd() - 0.5) * 30, L = 24 + rnd() * 60, W = 2 + rnd() * 5;
      for (let f = 0; f < 6; f++) {
        const F = FACES[f], x1 = x0 + L, z1 = z0 + W;
        const vs = F.c.map(q => mb.vert(q[0] ? x1 : x0, q[1] ? 1 : 0, q[2] ? z1 : z0, sp[0], sp[1], 255, 0, f === 3 ? 200 : 255));
        mb.quad(vs[0], vs[1], vs[2], vs[3], false);
      }
    }
    const r = mb.result(); list.push(makeVAO(gl, r.verts, r.idx));
  }
  return (wispTemplates.list = list);
}
// the clouds in the sky right now, near this camera. (0.9.0.50) how many there are, how dark and how tall depends on
// the weather where each one is, so a storm can be seen coming across the sky before it arrives
function cloudsAround(sc, cam) {
  const out = [], ox = sc.ox, oz = sc.oz, base = sc.base ?? 0.42;
  const kx0 = Math.floor((cam.x - ox - CLOUD_REACH) / CLOUD_CELL), kx1 = Math.floor((cam.x - ox + CLOUD_REACH) / CLOUD_CELL);
  const kz0 = Math.floor((cam.z - oz - CLOUD_REACH) / CLOUD_CELL), kz1 = Math.floor((cam.z - oz + CLOUD_REACH) / CLOUD_CELL);
  for (let kz = kz0; kz <= kz1; kz++) for (let kx = kx0; kx <= kx1; kx++) {
    for (let n = 0; n < 2; n++) {
      const h = hash32(kx, kz, 4471 + n, sc.seed), q = (h & 1023) / 1023;
      const jx = ((h >>> 10) & 255) / 255, jz = ((h >>> 18) & 255) / 255;
      const x = ox + (kx + 0.15 + jx * 0.7) * CLOUD_CELL, z = oz + (kz + 0.15 + jz * 0.7) * CLOUD_CELL;
      const k = sc.field ? sc.field(x, z) : (sc.rainK || 0);
      const cover = clamp(base + k * (1 - base) * 0.98, 0, 1);
      if (q > cover * (n ? 0.55 + 0.45 * k : 1)) continue;
      const d = Math.hypot(x - cam.x, z - cam.z);
      if (d > CLOUD_REACH + 60) continue;
      const th = sc.thunder || 0;
      out.push({ x, y: sc.y + ((h >>> 26) & 31) - k * 12, z, t: (h >>> 3) % 10, s: 0.8 + ((h >>> 13) & 63) / 63 * 0.9 + k * 0.25, r: (h >>> 7) & 3, d,
        dark: k * (sc.darkK ?? 1), tower: th * k * (q < 0.45 ? 1 : 0.35) });
    }
    // wisps, high above
    const hw = hash32(kx, kz, 9001, sc.seed), qw = (hw & 1023) / 1023;
    const wx = ox + (kx + 0.5) * CLOUD_CELL, wz = oz + (kz + 0.5) * CLOUD_CELL;
    if (qw < (sc.wisp ? sc.wisp(wx, wz) : 0.06)) {
      const d = Math.hypot(wx - cam.x, wz - cam.z);
      if (d <= CLOUD_REACH + 60) out.push({ x: wx, y: sc.y + 52 + ((hw >>> 20) & 15), z: wz, t: (hw >>> 3) & 3, s: 1 + ((hw >>> 9) & 31) / 31, r: (hw >>> 7) & 3, d, wisp: 1, dark: 0, tower: 0 });
    }
  }
  return out;
}
Renderer.prototype.drawClouds = function (S, cam, env, pass) {
  const sc = S.clouds; if (!sc || !(sc.cover || sc.field)) return;
  const gl = this.gl, P = this.prog.model, u = P.u;
  const T = cloudTemplates(gl), TW = wispTemplates(gl), list = S._cloudList || (S._cloudList = cloudsAround(sc, cam));
  if (!list.length) return;
  let proj = this.proj, planes = this.planes;
  if (pass === 0) {
    // far: a projection that reaches the horizon, against the open sky only
    proj = this._cloudProj || (this._cloudProj = Mat4.create());
    Mat4.perspective(proj, cam.fov * Math.PI / 180, this._aspect || 1, 0.5, CLOUD_FAR);
    const vp = this._cloudVP || (this._cloudVP = Mat4.create()); Mat4.multiply(vp, proj, this.view);
    planes = this._cloudPlanes || (this._cloudPlanes = []); frustumPlanes(vp, planes);
  }
  gl.useProgram(P.p);
  gl.uniformMatrix4fv(u.uProj, false, proj);
  gl.uniformMatrix4fv(u.uView, false, this.view);
  gl.uniform1i(u.uTex, 0);
  gl.uniform1f(u.uDay, env.day);
  gl.uniform3fv(u.uFog, env.fog);
  // (0.9.0.50) in mist or a sandstorm the clouds fade into it
  const mist = Math.min(1, env.mist || 0);
  gl.uniform2f(u.uFogRange, Math.max(260, CLOUD_REACH * 0.45) * (1 - mist), lerp(CLOUD_REACH + 40, 70, mist));
  gl.uniform1f(u.uMinLight, Math.max(env.minLight, 0.12));
  gl.uniform2f(u.uLight, 1, 0);
  gl.uniform1f(u.uUnlit, 0); gl.uniform1f(u.uAlpha, 1);
  if (u.uDynN) gl.uniform1i(u.uDynN, 0);
  // rain greys them, a storm blackens them; the sunset warms them; lightning lights them from inside
  const glow = env.sunGlow ? env.sunGlow[0] / 0.9 : 0, th = sc.thunder || 0, flash = sc.flash || 0;
  // (a storm cloud far off fades into the dark bank of the storm behind it, not into a pale sky)
  // (0.9.0.54) one fog colour reused, and set only when it changes: no new array for every cloud every frame
  const sCol = env.stormCol, fogTmp = this._cloudFog || (this._cloudFog = new Float32Array(3));
  let lastFog = -1;
  const tintFor = (c) => {
    const fk = sCol && c.dark > 0.2 ? Math.min(1, c.dark) : 0;
    if (fk !== lastFog) {
      lastFog = fk;
      if (fk) { for (let i = 0; i < 3; i++) fogTmp[i] = lerp(env.fog[i], sCol[i], fk); gl.uniform3fv(u.uFog, fogTmp); } else gl.uniform3fv(u.uFog, env.fog);
    }
    if (flash > 0.02) return gl.uniform4f(u.uTint, 0.92, 0.94, 1, flash * (0.35 + c.dark * 0.4));
    if (c.dark > 0.02) return gl.uniform4f(u.uTint, lerp(0.42, 0.26, th), lerp(0.45, 0.28, th), lerp(0.5, 0.34, th), c.dark * lerp(0.55, 0.82, th));
    if (glow > 0.02) return gl.uniform4f(u.uTint, 1.0, 0.66, 0.5, glow * 0.32 * env.day);
    gl.uniform4f(u.uTint, 0, 0, 0, 0);
  };
  const m = this.m;
  const nearR = (S.distant ? S.distant.range : S.renderDist * 16) + 48;
  const draw = (c, tpl, sy, tint) => {
    const s = c.s, R = 48 * s;
    const ox = c.x - cam.x, oy = c.y - cam.y, oz = c.z - cam.z;
    if (pass === 1 && c.d > nearR + R) return;          // the near pass: only clouds the land can reach (the distant land too)
    if (!aabbInFrustum(planes, ox - R * 1.6, oy, oz - R * 1.6, ox + R * 1.6, oy + 32 * s * sy, oz + R * 1.6)) return;
    if (tint) tintFor(c);                                // (0.9.0.54) only for the clouds actually drawn
    Mat4.identity(m); Mat4.translate(m, ox, oy, oz); Mat4.rotateY(m, c.r * Math.PI / 2); Mat4.scale(m, s, s * sy, s);
    gl.uniformMatrix4fv(u.uModel, false, m);
    gl.bindVertexArray(tpl.vao); gl.drawElements(gl.TRIANGLES, tpl.count, gl.UNSIGNED_INT, 0);
  };
  for (const c of list) { if (c.wisp) continue; draw(c, T[c.t], 1 + 1.7 * c.tower, true); }
  // the wisps: thin and see-through
  if (list.some(c => c.wisp)) {
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.uniform4f(u.uTint, 0, 0, 0, 0); gl.uniform3fv(u.uFog, env.fog); gl.uniform1f(u.uAlpha, 0.26 * (1 - mist));
    for (const c of list) if (c.wisp) draw(c, TW[c.t], 1);
    gl.uniform1f(u.uAlpha, 1); gl.depthMask(true); gl.disable(gl.BLEND);
  }
  gl.uniform4f(u.uTint, 0, 0, 0, 0); gl.uniform3fv(u.uFog, env.fog);
  gl.uniform1f(u.uMinLight, env.minLight);
  if (pass === 0) { gl.uniformMatrix4fv(u.uProj, false, this.proj); gl.clear(gl.DEPTH_BUFFER_BIT); }
};
// the sky's clouds as the game sees them: where the wind has carried them, how many, how grey
{
  const baseWind = Wind.prototype.update;
  Wind.prototype.update = function (dt) {
    baseWind.call(this, dt);
    const sp = 1.2 + this.strength * 5.5;                       // a gust hurries them along
    this.cloudX = (this.cloudX || 0) - Math.sin(this.dir) * sp * dt; this.cloudZ = (this.cloudZ || 0) - Math.cos(this.dir) * sp * dt;
  };
  Game.prototype.cloudScene = function (dim = this.dim) {
    // (0.9.0.15) the Skylands sit on top of the Overworld's sky: from up there the same clouds drift by below
    if (this.settings.clouds === false || (dim !== 0 && dim !== DIM.SKYLANDS) || !this.meta) return null;
    const W = this.wind || {}, rain = this.weather ? this.weather.rain : 0;
    return { ox: W.cloudX || 0, oz: W.cloudZ || 0, seed: (this.meta.seed | 0) & 0xffff, cover: clamp(0.42 + rain * 0.55, 0, 1), dark: dim === 0 ? rain : rain * 0.4, y: dim === 0 ? 150 : 150 - CH };
  };
}
