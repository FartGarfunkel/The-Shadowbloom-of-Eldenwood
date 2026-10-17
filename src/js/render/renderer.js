// ---------------------------------------------------------------------------
// render/renderer.js — draws a frame: sky, terrain, creatures, items,
// particles, water, boss telegraphs, and the first-person hand.
// Everything is drawn relative to the camera so far-away coordinates stay
// precise (no jitter at x = 100000).
// ---------------------------------------------------------------------------

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 is not available in this browser.');
    this.gl = gl;
    this.prog = {
      terrain: compileProgram(gl, SHADERS.terrainVS, SHADERS.terrainFS, 'terrain'),
      model: compileProgram(gl, SHADERS.modelVS, SHADERS.modelFS, 'model'),
      sky: compileProgram(gl, SHADERS.skyVS, SHADERS.skyFS, 'sky'),
      line: compileProgram(gl, SHADERS.lineVS, SHADERS.lineFS, 'line'),
      decal: compileProgram(gl, SHADERS.decalVS, SHADERS.decalFS, 'decal'),
    };
    // Atlas texture
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ATLAS.canvas);
    ATLAS.glTex = this.tex;      // (0.9.0.15) for pictures made later (render/sculpt.js modelFill)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.emptyVAO = gl.createVertexArray();
    buildModels(gl);
    // Unit cube outline
    const L = [];
    const e = 0.002, a = -e, b = 1 + e;
    const corners = [[a, a, a], [b, a, a], [b, a, b], [a, a, b], [a, b, a], [b, b, a], [b, b, b], [a, b, b]];
    for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) L.push(...corners[i], ...corners[j]);
    this.outline = this.makeLineVAO(new Float32Array(L));
    // outline of shaped blocks (slabs, stairs, fences...): rebuilt when the target changes
    this.boxLines = { vao: gl.createVertexArray(), vb: gl.createBuffer(), count: 0, sig: '' };
    gl.bindVertexArray(this.boxLines.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.boxLines.vb);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0); gl.bindVertexArray(null);
    // world-space boxes (WorldEdit selection), rebuilt each frame they change
    this.selLines = { vao: gl.createVertexArray(), vb: gl.createBuffer(), count: 0, sig: '' };
    gl.bindVertexArray(this.selLines.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.selLines.vb);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0); gl.bindVertexArray(null);
    // Decal quad (x,z in -1..1) and lane quad (x -1..1, z 0..1)
    this.decalCircle = this.makeQuadVAO(-1, -1, 1, 1);
    this.decalLane = this.makeQuadVAO(-1, 0, 1, 1);
    // Billboard/particle dynamic buffer
    this.dyn = { vao: gl.createVertexArray(), vb: gl.createBuffer(), ib: gl.createBuffer() };
    gl.bindVertexArray(this.dyn.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dyn.vb);
    bindVertexLayout(gl);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.dyn.ib);
    gl.bindVertexArray(null);
    this.dynMB = new MeshBuilder(2048);

    this.proj = Mat4.create(); this.view = Mat4.create(); this.vp = Mat4.create();
    this.handProj = Mat4.create();
    this.planes = new Float32Array(24);
    this.m = Mat4.create();
    this.stats = { chunks: 0, drawn: 0, tris: 0 };
    this.scale = 1;
    this.chunkMeshes = new Map();
  }

  makeLineVAO(data) {
    const gl = this.gl;
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
    gl.bindVertexArray(null);
    return { vao, count: data.length / 3 };
  }
  makeQuadVAO(x0, z0, x1, z1) {
    const mb = new MeshBuilder(4);
    const a = mb.vert(x0, 0, z1, 0, 0, 0, 0, 0), b = mb.vert(x1, 0, z1, 0, 0, 0, 0, 0), c = mb.vert(x1, 0, z0, 0, 0, 0, 0, 0), d = mb.vert(x0, 0, z0, 0, 0, 0, 0, 0);
    mb.quad(a, b, c, d, false); mb.quad(b, a, d, c, false);
    const r = mb.result();
    return makeVAO(this.gl, r.verts, r.idx);
  }

  resize(scale) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * scale;
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr)), h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  }

  uploadChunk(ch, data) {
    const gl = this.gl;
    this.freeChunk(ch);
    const m = { opaque: null, water: null };
    // (0.9.0.22) 16-bit indices when a chunk's mesh is small enough (nearly always): half the index memory
    const vao = (d) => {
      if (d.verts.length / VSTRIDE < 65536) { const o = makeVAO(gl, d.verts, new Uint16Array(d.idx)); o.it = gl.UNSIGNED_SHORT; o.isz = 2; return o; }
      const o = makeVAO(gl, d.verts, d.idx); o.it = gl.UNSIGNED_INT; o.isz = 4; return o;
    };
    if (data.opaque) m.opaque = vao(data.opaque);
    if (data.water) m.water = vao(data.water);
    m.deep = data.deep || 0; m.cut = data.cut ?? -1;
    ch.mesh = m;
    ch.needsMesh = false;
    this.chunkMeshes.set(ch, m);
  }
  freeChunk(ch) {
    if (!ch.mesh) return;
    freeVAO(this.gl, ch.mesh.opaque); freeVAO(this.gl, ch.mesh.water);
    ch.mesh = null;
    this.chunkMeshes.delete(ch);
  }
  freeAll() { for (const ch of [...this.chunkMeshes.keys()]) this.freeChunk(ch); }

  // ---- frames & views --------------------------------------------------------
  // One frame may hold several views (split-screen). beginFrame sizes the
  // canvas once; render() then draws one camera into its rectangle.
  beginFrame(scale, env) {
    const gl = this.gl;
    this.resize(scale);
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    const f = env && env.fog ? env.fog : [0, 0, 0];
    gl.clearColor(f[0] * 0.3, f[1] * 0.3, f[2] * 0.3, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }
  // Carried lights for this view, camera-relative, brightest/nearest first.
  setDynLights(lights, cam) {
    const arr = this._dyn || (this._dyn = new Float32Array(32));
    let n = 0;
    if (lights && lights.length) {
      const sorted = lights.map(l => [l, Math.hypot(l[0] - cam.x, l[1] - cam.y, l[2] - cam.z)]).filter(q => q[1] < l3(q[0]) + 48).sort((a, b) => (a[1] - a[0][3]) - (b[1] - b[0][3]));
      for (const [l] of sorted) { if (n >= 8) break; arr[n * 4] = l[0] - cam.x; arr[n * 4 + 1] = l[1] - cam.y; arr[n * 4 + 2] = l[2] - cam.z; arr[n * 4 + 3] = l[3]; n++; }
    }
    this.dynN = n;
  }
  applyDyn(prog, on = true) {
    const gl = this.gl, u = prog.u;
    gl.uniform1i(u.uDynN, on ? this.dynN : 0);
    if (on && this.dynN) gl.uniform4fv(u.uDyn, this._dyn);
  }
  render(S, rect) {
    const gl = this.gl, P = this.prog;
    const W = rect ? rect.w : this.canvas.width, H = rect ? rect.h : this.canvas.height;
    if (rect) { gl.viewport(rect.x, rect.y, rect.w, rect.h); gl.enable(gl.SCISSOR_TEST); gl.scissor(rect.x, rect.y, rect.w, rect.h); }
    else { gl.viewport(0, 0, W, H); gl.disable(gl.SCISSOR_TEST); }
    const cam = S.camera;
    const far = Math.max(48, S.renderDist * 16);
    const viewFar = S.distant ? Math.max(far, S.distant.range) : far;      // (0.9.0.51) distant terrain reaches further
    Mat4.perspective(this.proj, cam.fov * Math.PI / 180, W / H, 0.05, viewFar + 64);
    this._aspect = W / H;
    Mat4.viewRotation(this.view, cam.yaw, cam.pitch);
    if (cam.roll) { const r = Mat4.create(); Mat4.rotateZ(r, cam.roll); Mat4.multiply(this.view, r, this.view); }
    // (0.9.0.14) looking through a portal: the near plane is the far portal's face, so nothing between
    // that camera and the portal is drawn (an oblique near plane, after Lengyel)
    if (S.clip) {
      const v = this.view, n = S.clip, M = this.proj;
      const C = [v[0] * n[0] + v[4] * n[1] + v[8] * n[2], v[1] * n[0] + v[5] * n[1] + v[9] * n[2], v[2] * n[0] + v[6] * n[1] + v[10] * n[2], n[3]];
      const q = [(Math.sign(C[0]) + M[8]) / M[0], (Math.sign(C[1]) + M[9]) / M[5], -1, (1 + M[10]) / M[14]];
      const k = 2 / (C[0] * q[0] + C[1] * q[1] + C[2] * q[2] + C[3] * q[3]);
      M[2] = C[0] * k; M[6] = C[1] * k; M[10] = C[2] * k + 1; M[14] = C[3] * k;
    }
    Mat4.multiply(this.vp, this.proj, this.view);
    frustumPlanes(this.vp, this.planes);
    const env = S.env;
    let fogRange = env.underwater ? [0, 22] : [viewFar * env.fogStart, viewFar - 6];
    // inside a bank of cloud: the world closes in
    if (env.cloud > 0 && !env.underwater) fogRange = [fogRange[0] * (1 - env.cloud), lerp(fogRange[1], 14, env.cloud)];
    // (0.9.0.50) mist, fog banks, a sandstorm or a blizzard: how far you can see falls to a few dozen blocks
    if (env.mist > 0.01 && !env.underwater) { const end = 24 + (fogRange[1] - 24) * Math.pow(1 - Math.min(1, env.mist), 2); fogRange = [Math.min(fogRange[0], end * 0.12), Math.min(fogRange[1], end)]; }
    this.setDynLights(S.lights, cam);

    gl.clearColor(env.fog[0], env.fog[1], env.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Sky
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND);
    gl.useProgram(P.sky.p);
    const inv = invert4(this.vp);
    gl.uniformMatrix4fv(P.sky.u.uInvVP, false, inv);
    gl.uniform3fv(P.sky.u.uZenith, env.zenith); gl.uniform3fv(P.sky.u.uHorizon, env.horizon);
    gl.uniform3fv(P.sky.u.uSunDir, env.sunDir); gl.uniform3fv(P.sky.u.uSunGlow, env.sunGlow);
    gl.uniform1f(P.sky.u.uStars, env.stars); gl.uniform1f(P.sky.u.uVoid, env.voidBelow ? 1 : 0);
    gl.uniform4fv(P.sky.u.uStorm, env.storm || [0, 1, 1000, 0]); gl.uniform3fv(P.sky.u.uStormCol, env.stormCol || [0.3, 0.3, 0.35]);
    gl.uniform1f(P.sky.u.uAurora, env.aurora || 0); gl.uniform1f(P.sky.u.uRainbow, env.rainbow || 0); gl.uniform1f(P.sky.u.uSkyT, (S.time || 0) % 10000);
    gl.bindVertexArray(this.emptyVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);

    // Sun & moon (unlit billboards, behind everything)
    if (env.showSun) {
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      this.useModel(env, fogRange, [15, 15]);
      gl.uniform1f(P.model.u.uUnlit, 1);
      const d = env.sunDir;
      this.drawBillboard(d[0] * 80, d[1] * 80, d[2] * 80, 14, 'sun', cam);
      this.drawBillboard(-d[0] * 80, -d[1] * 80, -d[2] * 80, 10, 'moon', cam);
      gl.uniform1f(P.model.u.uUnlit, 0);
      gl.disable(gl.BLEND);
    }

    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);

    // Clouds out to the horizon, behind everything (render/clouds.js)
    if (S.clouds && this.drawClouds) this.drawClouds(S, cam, env, 0);

    // Terrain (opaque + cutout)
    gl.useProgram(P.terrain.p);
    this.setTerrainUniforms(env, fogRange, S.time);
    gl.uniform1f(P.terrain.u.uAlphaTest, 0.5); gl.uniform1f(P.terrain.u.uAlpha, 1); gl.uniform1f(P.terrain.u.uWave, 0);
    gl.uniform1f(P.terrain.u.uWind, env.wind === undefined ? 1 : env.wind);
    gl.uniform1f(P.terrain.u.uSea, env.sea || 0);
    this.applyDyn(P.terrain);
    let drawn = 0, tris = 0;
    const visibleWater = [], vis = this._visChunks || (this._visChunks = []);
    vis.length = 0;
    // (0.9.0.22) are you up on the land? then the caves deep under chunks away from you aren't drawn
    const ccx = Math.floor(cam.x) >> 4, ccz = Math.floor(cam.z) >> 4;
    let camCut = -1;
    for (const [ch, m] of this.chunkMeshes) if (ch.cx === ccx && ch.cz === ccz && (S.dim === undefined || ch.dim === S.dim)) { camCut = m.cut; break; }
    const deepAll = S.deepAll || camCut < 0 || cam.y < camCut + 16;
    for (const [ch, m] of this.chunkMeshes) {
      if (S.dim !== undefined && ch.dim !== S.dim) continue;   // a world made ready in the background isn't drawn
      const ox = ch.cx * 16 - cam.x, oz = ch.cz * 16 - cam.z, oy = -cam.y;
      if (!aabbInFrustum(this.planes, ox, oy, oz, ox + 16, oy + ch.maxY + 1, oz + 16)) continue;
      const dx = ox + 8, dz = oz + 8, d2 = dx * dx + dz * dz;
      if (d2 > (far + 12) * (far + 12)) continue;
      vis.push(d2, ch, m);
      if (m.water) visibleWater.push([d2, ox, oy, oz, m.water, ch.cx, ch.cz]);
    }
    // nearest first, so what's hidden behind costs little
    const order = this._visOrder || (this._visOrder = []);
    order.length = 0; for (let i = 0; i < vis.length; i += 3) order.push(i);
    order.sort((a, b) => vis[a] - vis[b]);
    for (const i of order) {
      const ch = vis[i + 1], m = vis[i + 2];
      if (!m.opaque) continue;
      const ox = ch.cx * 16 - cam.x, oz = ch.cz * 16 - cam.z, oy = -cam.y;
      const skip = !deepAll && m.deep > 0 && (Math.abs(ch.cx - ccx) > 1 || Math.abs(ch.cz - ccz) > 1) ? m.deep : 0;
      if (skip >= m.opaque.count) continue;
      gl.uniform3f(P.terrain.u.uOffset, ox, oy, oz);
      gl.uniform2f(P.terrain.u.uWorld, ch.cx * 16, ch.cz * 16);
      gl.bindVertexArray(m.opaque.vao);
      gl.drawElements(gl.TRIANGLES, m.opaque.count - skip, m.opaque.it || gl.UNSIGNED_INT, skip * (m.opaque.isz || 4));
      drawn++; tris += (m.opaque.count - skip) / 3;
    }
    this.stats.drawn = drawn; this.stats.tris = tris; this.stats.chunks = this.chunkMeshes.size;
    // (0.9.0.51) the land beyond the loaded chunks (game/distant.js)
    if (S.distant && this.drawDistant) this.drawDistant(S, cam, env, fogRange);

    // Creatures, dropped items, falling trees
    gl.useProgram(P.model.p);
    this.useModel(env, fogRange, [15, 0]);
    this.applyDyn(P.model);
    // see-through parts (a slime's jelly) go last, farthest first, without hiding what's behind them
    let late = null;
    let masks = null;
    for (const d of S.drawList) { if (d.depthOnly) (masks || (masks = [])).push(d); else if (d.alpha !== undefined && d.alpha < 1) (late || (late = [])).push(d); else this.drawModelCall(d, cam); }
    // invisible lids (inside a boat's hull at the waterline): they only stop the water drawing there
    if (masks) { gl.colorMask(false, false, false, false); for (const d of masks) this.drawModelCall(d, cam); gl.colorMask(true, true, true, true); }
    if (late) {
      const dist = (d) => (d.px - cam.x) ** 2 + (d.py - cam.y) ** 2 + (d.pz - cam.z) ** 2;
      late.sort((a, b) => dist(b) - dist(a));
      gl.depthMask(false);
      for (const d of late) this.drawModelCall(d, cam);
      gl.depthMask(true);
    }

    // a portal you can see through (game/portalview.js)
    if (S.portals && this.portalPass) { this.portalPass(S, cam); this.useModel(env, fogRange, [15, 0]); this.applyDyn(P.model); }

    // the clouds again, against the land: a near cloud hides what's behind it
    if (S.clouds && this.drawClouds) { this.drawClouds(S, cam, env, 1); this.useModel(env, fogRange, [15, 0]); this.applyDyn(P.model); }

    // Blocks left half-broken: their cracks fade as they mend
    if (S.cracks && S.cracks.length) {
      gl.enable(gl.BLEND); gl.blendFunc(gl.DST_COLOR, gl.SRC_COLOR);
      gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -1);
      this.useModel(env, fogRange, [15, 15]);
      gl.uniform1f(P.model.u.uUnlit, 1);
      for (const c of S.cracks) {
        if (S.target && S.crack >= 0 && c.x === S.target.x && c.y === S.target.y && c.z === S.target.z) continue;
        const mesh = this.crackMesh(c.stage);
        Mat4.identity(this.m); Mat4.translate(this.m, c.x - cam.x + 0.5, c.y - cam.y + 0.5, c.z - cam.z + 0.5); Mat4.scale(this.m, 1.002, 1.002, 1.002);
        gl.uniformMatrix4fv(P.model.u.uModel, false, this.m);
        gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
      }
      gl.uniform1f(P.model.u.uUnlit, 0);
      gl.disable(gl.POLYGON_OFFSET_FILL); gl.disable(gl.BLEND);
    }
    // WorldEdit selection boxes
    if (S.boxes && S.boxes.length) {
      const sl = this.selLines, sig = JSON.stringify(S.boxes) + '|' + Math.floor(cam.x) + ',' + Math.floor(cam.y) + ',' + Math.floor(cam.z);
      const ox = Math.floor(cam.x), oy = Math.floor(cam.y), oz = Math.floor(cam.z);
      if (sig !== sl.sig) {
        const L = [], e = 0.01;
        for (const b of S.boxes) {
          const a0 = b[0] - ox - e, a1 = b[3] - ox + e, c0 = b[1] - oy - e, c1 = b[4] - oy + e, d0 = b[2] - oz - e, d1 = b[5] - oz + e;
          const C = [[a0, c0, d0], [a1, c0, d0], [a1, c0, d1], [a0, c0, d1], [a0, c1, d0], [a1, c1, d0], [a1, c1, d1], [a0, c1, d1]];
          for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) L.push(...C[i], ...C[j]);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, sl.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(L), gl.DYNAMIC_DRAW);
        sl.count = L.length / 3; sl.sig = sig;
      }
      gl.useProgram(P.line.p);
      gl.uniformMatrix4fv(P.line.u.uProj, false, this.proj); gl.uniformMatrix4fv(P.line.u.uView, false, this.view);
      gl.uniform3f(P.line.u.uOffset, ox - cam.x, oy - cam.y, oz - cam.z);
      gl.uniform4f(P.line.u.uColor, 1, 0.75, 0.2, 0.9);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.bindVertexArray(sl.vao); gl.drawArrays(gl.LINES, 0, sl.count);
      gl.disable(gl.BLEND);
    }
    // Block outline + crack
    if (S.target) {
      const t = S.target;
      if (S.crack >= 0) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.DST_COLOR, gl.SRC_COLOR);
        gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -1);
        const mesh = this.crackMesh(S.crack);
        this.useModel(env, fogRange, [15, 15]);
        gl.uniform1f(P.model.u.uUnlit, 1);
        Mat4.identity(this.m); Mat4.translate(this.m, t.x - cam.x + 0.5, t.y - cam.y + 0.5, t.z - cam.z + 0.5); Mat4.scale(this.m, 1.002, 1.002, 1.002);
        gl.uniformMatrix4fv(P.model.u.uModel, false, this.m);
        gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
        gl.uniform1f(P.model.u.uUnlit, 0);
        gl.disable(gl.POLYGON_OFFSET_FILL); gl.disable(gl.BLEND);
      }
      gl.useProgram(P.line.p);
      gl.uniformMatrix4fv(P.line.u.uProj, false, this.proj); gl.uniformMatrix4fv(P.line.u.uView, false, this.view);
      gl.uniform3f(P.line.u.uOffset, t.x - cam.x, t.y - cam.y, t.z - cam.z);
      gl.uniform4f(P.line.u.uColor, 0, 0, 0, 0.55);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      if (t.boxes) {
        const sig = JSON.stringify(t.boxes);
        const bl = this.boxLines;
        if (sig !== bl.sig) {
          const L = [], e = 0.002;
          for (const b of t.boxes) {
            const a0 = b[0] / 16 - e, a1 = b[3] / 16 + e, c0 = b[1] / 16 - e, c1 = b[4] / 16 + e, d0 = b[2] / 16 - e, d1 = b[5] / 16 + e;
            const C = [[a0, c0, d0], [a1, c0, d0], [a1, c0, d1], [a0, c0, d1], [a0, c1, d0], [a1, c1, d0], [a1, c1, d1], [a0, c1, d1]];
            for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) L.push(...C[i], ...C[j]);
          }
          gl.bindBuffer(gl.ARRAY_BUFFER, bl.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(L), gl.DYNAMIC_DRAW);
          bl.count = L.length / 3; bl.sig = sig;
        }
        gl.bindVertexArray(bl.vao); gl.drawArrays(gl.LINES, 0, bl.count);
      } else { gl.bindVertexArray(this.outline.vao); gl.drawArrays(gl.LINES, 0, this.outline.count); }
      gl.disable(gl.BLEND);
    }

    // Particles (camera-facing quads built on the CPU each frame)
    if (S.particles.length) {
      gl.useProgram(P.terrain.p);
      gl.uniform3f(P.terrain.u.uOffset, 0, 0, 0);
      gl.uniform2f(P.terrain.u.uWorld, 0, 0);
      gl.disable(gl.CULL_FACE);
      const n = this.buildParticles(S.particles, cam);
      if (n) { gl.bindVertexArray(this.dyn.vao); gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_INT, 0); }
      gl.enable(gl.CULL_FACE);
    }

    // Water & portals (translucent), back to front
    if (visibleWater.length) {
      gl.useProgram(P.terrain.p);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.uniform1f(P.terrain.u.uAlphaTest, 0.01); gl.uniform1f(P.terrain.u.uAlpha, 1); gl.uniform1f(P.terrain.u.uWave, 1);
      visibleWater.sort((a, b) => b[0] - a[0]);
      for (const [, ox, oy, oz, m, cx, cz] of visibleWater) {
        gl.uniform3f(P.terrain.u.uOffset, ox, oy, oz);
        // wave phase from the exact world position so chunk borders always line up
        gl.uniform2f(P.terrain.u.uWorld, cx * 16, cz * 16);
        gl.bindVertexArray(m.vao); gl.drawElements(gl.TRIANGLES, m.count, m.it || gl.UNSIGNED_INT, 0);
      }
      gl.uniform1f(P.terrain.u.uWave, 0);
      gl.depthMask(true); gl.disable(gl.BLEND);
    }

    // Boss attack telegraphs
    if (S.decals.length) {
      gl.useProgram(P.decal.p);
      gl.uniformMatrix4fv(P.decal.u.uProj, false, this.proj); gl.uniformMatrix4fv(P.decal.u.uView, false, this.view);
      gl.uniform1f(P.decal.u.uTime, S.time);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      // drawn over terrain on purpose: a telegraph you can't see isn't fair
      gl.depthMask(false); gl.disable(gl.CULL_FACE); gl.disable(gl.DEPTH_TEST);
      for (const d of S.decals) {
        Mat4.identity(this.m); Mat4.translate(this.m, d.x - cam.x, d.y - cam.y + 0.03, d.z - cam.z);
        if (d.yaw) Mat4.rotateY(this.m, d.yaw);
        Mat4.scale(this.m, d.sx, 1, d.sz);
        gl.uniformMatrix4fv(P.decal.u.uModel, false, this.m);
        gl.uniform4fv(P.decal.u.uColor, d.color);
        gl.uniform1f(P.decal.u.uProgress, d.progress);
        gl.uniform1f(P.decal.u.uShape, d.shape);
        const q = d.shape ? this.decalLane : this.decalCircle;
        gl.bindVertexArray(q.vao); gl.drawElements(gl.TRIANGLES, q.count, gl.UNSIGNED_INT, 0);
      }
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true); gl.enable(gl.CULL_FACE); gl.disable(gl.BLEND);
    }

    // First-person hand + held item
    if (S.hand) {
      gl.clear(gl.DEPTH_BUFFER_BIT);
      Mat4.perspective(this.handProj, 70 * Math.PI / 180, W / H, 0.01, 10);
      gl.useProgram(P.model.p);
      gl.uniformMatrix4fv(P.model.u.uProj, false, this.handProj);
      gl.uniformMatrix4fv(P.model.u.uView, false, Mat4.create());
      gl.uniform2f(P.model.u.uLight, S.hand.light[0], S.hand.light[1]);
      gl.uniform2f(P.model.u.uFogRange, 1000, 2000);
      gl.uniform4f(P.model.u.uTint, 0, 0, 0, 0);
      this.applyDyn(P.model, false);
      const gt = performance.now() / 1000;
      for (const d of S.hand.draws) {
        if (d.tex) gl.bindTexture(gl.TEXTURE_2D, d.tex);
        if (d.noCull) gl.disable(gl.CULL_FACE);
        if (d.glint) gl.uniform2f(P.model.u.uGlint, 1, gt);
        if (d.tint) gl.uniform4f(P.model.u.uTint, d.tint[0], d.tint[1], d.tint[2], d.tint[3]);
        gl.uniformMatrix4fv(P.model.u.uModel, false, d.m);
        gl.bindVertexArray(d.mesh.vao); gl.drawElements(gl.TRIANGLES, d.mesh.count, gl.UNSIGNED_INT, 0);
        if (d.glint) gl.uniform2f(P.model.u.uGlint, 0, 0);
        if (d.tint) gl.uniform4f(P.model.u.uTint, 0, 0, 0, 0);
        if (d.tex) gl.bindTexture(gl.TEXTURE_2D, this.tex);
        if (d.noCull) gl.enable(gl.CULL_FACE);
      }
    }
    gl.bindVertexArray(null);
    gl.disable(gl.SCISSOR_TEST);
  }

  // Animated textures (water, lava, fire, portals, torch flames...): swap the
  // pixels of those atlas tiles for the current frame.
  animateTextures(time) {
    const gl = this.gl;
    let bound = false;
    for (const a of ANIMS) {
      const f = a.pick ? a.pick() : Math.floor(time * a.fps + a.phase) % a.frames.length;
      if (f === a.cur) continue;
      a.cur = f;
      if (!bound) { gl.bindTexture(gl.TEXTURE_2D, this.tex); bound = true; }
      gl.texSubImage2D(gl.TEXTURE_2D, 0, (a.tile % ATLAS_TILES) * TILE, Math.floor(a.tile / ATLAS_TILES) * TILE, TILE, TILE, gl.RGBA, gl.UNSIGNED_BYTE, a.frames[f]);
    }
  }
  setTerrainUniforms(env, fogRange, time) {
    const gl = this.gl, u = this.prog.terrain.u;
    gl.uniformMatrix4fv(u.uProj, false, this.proj);
    gl.uniformMatrix4fv(u.uView, false, this.view);
    gl.uniform1i(u.uTex, 0);
    gl.uniform1f(u.uDay, env.day);
    gl.uniform3fv(u.uFog, env.fog);
    gl.uniform2f(u.uFogRange, fogRange[0], fogRange[1]);
    gl.uniform1f(u.uMinLight, env.minLight);
    gl.uniform1f(u.uTime, time);
    gl.uniform4f(u.uTint, 0, 0, 0, 0);
  }
  useModel(env, fogRange, light) {
    const gl = this.gl, u = this.prog.model.u;
    gl.useProgram(this.prog.model.p);
    gl.uniformMatrix4fv(u.uProj, false, this.proj);
    gl.uniformMatrix4fv(u.uView, false, this.view);
    gl.uniform1i(u.uTex, 0);
    gl.uniform1f(u.uDay, env.day);
    gl.uniform3fv(u.uFog, env.fog);
    gl.uniform2f(u.uFogRange, fogRange[0], fogRange[1]);
    gl.uniform1f(u.uMinLight, env.minLight);
    gl.uniform2f(u.uLight, light[0] / 15, light[1] / 15);
    gl.uniform4f(u.uTint, 0, 0, 0, 0);
    gl.uniform1f(u.uUnlit, 0);
    gl.uniform1f(u.uAlpha, 1);
  }
  drawModelCall(d, cam) {
    const gl = this.gl, u = this.prog.model.u;
    gl.uniform2f(u.uLight, d.light[0] / 15, d.light[1] / 15);
    if (d.tint) gl.uniform4fv(u.uTint, d.tint); else gl.uniform4f(u.uTint, 0, 0, 0, 0);
    // d.m is the model transform with the entity at the origin; (px,py,pz) is
    // its world position in doubles. Subtracting the camera here keeps
    // precision far from the world origin.
    const m = this.m; m.set(d.m); m[12] += d.px - cam.x; m[13] += d.py - cam.y; m[14] += d.pz - cam.z;
    gl.uniformMatrix4fv(u.uModel, false, m);
    if (d.noCull) gl.disable(gl.CULL_FACE);
    if (d.unlit) gl.uniform1f(u.uUnlit, 1);
    if (d.alpha !== undefined) { gl.uniform1f(u.uAlpha, d.alpha); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }
    if (d.tex) gl.bindTexture(gl.TEXTURE_2D, d.tex);
    if (d.glint) gl.uniform2f(u.uGlint, d.glint, performance.now() / 1000);
    gl.bindVertexArray(d.mesh.vao);
    gl.drawElements(gl.TRIANGLES, d.mesh.count, gl.UNSIGNED_INT, 0);
    if (d.glint) gl.uniform2f(u.uGlint, 0, 0);
    if (d.tex) gl.bindTexture(gl.TEXTURE_2D, this.tex);
    if (d.alpha !== undefined) { gl.uniform1f(u.uAlpha, 1); gl.disable(gl.BLEND); }
    if (d.unlit) gl.uniform1f(u.uUnlit, 0);
    if (d.noCull) gl.enable(gl.CULL_FACE);
  }
  drawBillboard(x, y, z, size, tile, cam) {
    const gl = this.gl, u = this.prog.model.u;
    const mb = this.dynMB; mb.reset();
    const uv = tileUV(ATLAS.tile[tile]);
    // Quad in the plane perpendicular to the view direction of the body.
    const len = Math.hypot(x, y, z), d = [x / len, y / len, z / len];
    const rr = [d[2], 0, -d[0]]; const rl = Math.hypot(rr[0], rr[2]) || 1; rr[0] /= rl; rr[2] /= rl;
    const uu = [d[1] * rr[2] - d[2] * rr[1], d[2] * rr[0] - d[0] * rr[2], d[0] * rr[1] - d[1] * rr[0]];
    const s = size / 2;
    const P = (a, b) => [x + rr[0] * a + uu[0] * b, y + rr[1] * a + uu[1] * b, z + rr[2] * a + uu[2] * b];
    const p0 = P(-s, -s), p1 = P(s, -s), p2 = P(s, s), p3 = P(-s, s);
    const v0 = mb.vert(...p0, uv[0], uv[3], 255, 255, 255), v1 = mb.vert(...p1, uv[2], uv[3], 255, 255, 255);
    const v2 = mb.vert(...p2, uv[2], uv[1], 255, 255, 255), v3 = mb.vert(...p3, uv[0], uv[1], 255, 255, 255);
    mb.quad(v0, v1, v2, v3, false); mb.quad(v1, v0, v3, v2, false);
    this.uploadDyn(mb);
    Mat4.identity(this.m);
    gl.uniformMatrix4fv(u.uModel, false, this.m);
    gl.bindVertexArray(this.dyn.vao);
    gl.drawElements(gl.TRIANGLES, mb.icount, gl.UNSIGNED_INT, 0);
  }
  uploadDyn(mb) {
    const gl = this.gl;
    gl.bindVertexArray(this.dyn.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dyn.vb);
    gl.bufferData(gl.ARRAY_BUFFER, mb.u8.subarray(0, mb.vcount * VSTRIDE), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.dyn.ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mb.idx.subarray(0, mb.icount), gl.DYNAMIC_DRAW);
  }
  buildParticles(list, cam) {
    const mb = this.dynMB; mb.reset();
    const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    const fwd = lookVector(cam.yaw, cam.pitch);
    // camera up = right x forward
    const upv = [-(rz * fwd[1]), rz * fwd[0] - rx * fwd[2], rx * fwd[1]];
    for (const p of list) {
      const x = p.x - cam.x, y = p.y - cam.y, z = p.z - cam.z;
      const s = p.size;
      const uv = p.uv;
      const sk = p.light >> 4, bl = p.light & 15;
      // (0.9.0.55) only when it's a colour (note blocks and bone meal keep a number there: they came out black)
      if (p.tint && p.tint.length >= 3) { mb.tint = p.tint; mb.tintAll = 255; } else if (mb.tintAll) { mb.tint = TINT_GRASS; mb.tintAll = 0; }   // (0.9.0.50) sand, ash, dust
      // rain streaks stand upright in the world; everything else faces the camera
      // (0.9.0.22) each corner is centre + A*a + B*b, worked out without a closure or arrays per particle
      let Ax = rx, Ay = 0, Az = rz, Bx = upv[0], By = upv[1], Bz = upv[2];
      if (p.streak) {
        // a gust of wind: a long thin stroke along its direction, turned about that line to face you
        const dx = p.sdx, dy = p.sdy || 0, dz = p.sdz, k = p.streak / s;
        let nx = dy * fwd[2] - dz * fwd[1], ny = dz * fwd[0] - dx * fwd[2], nz = dx * fwd[1] - dy * fwd[0];
        const nl = Math.hypot(nx, ny, nz) || 1;
        Ax = dx * k; Ay = dy * k; Az = dz * k; Bx = nx / nl; By = ny / nl; Bz = nz / nl;
      } else if (p.flat) { Ax = 1; Ay = 0; Az = 0; Bx = 0; By = 0; Bz = 1; }        // lying on the ground (a puddle)
      else if (p.vert) { Bx = 0; By = p.vert / s; Bz = 0; }
      const sh = 230, sk17 = sk * 17, bl17 = bl * 17;
      const pAx = Ax * s, pAy = Ay * s, pAz = Az * s, pBx = Bx * s, pBy = By * s, pBz = Bz * s;
      const v0 = mb.vert(x - pAx - pBx, y - pAy - pBy, z - pAz - pBz, uv[0], uv[3], sk17, bl17, sh);
      const v1 = mb.vert(x + pAx - pBx, y + pAy - pBy, z + pAz - pBz, uv[2], uv[3], sk17, bl17, sh);
      const v2 = mb.vert(x + pAx + pBx, y + pAy + pBy, z + pAz + pBz, uv[2], uv[1], sk17, bl17, sh);
      const v3 = mb.vert(x - pAx + pBx, y - pAy + pBy, z - pAz + pBz, uv[0], uv[1], sk17, bl17, sh);
      mb.quad(v0, v1, v2, v3, false);
    }
    this.uploadDyn(mb);
    return mb.icount;
  }
  crackMesh(stage) {
    this._crack = this._crack || [];
    if (!this._crack[stage]) {
      const mb = new MeshBuilder(24);
      const t = ATLAS.tile['crack_' + stage];
      addBox(mb, [-0.5, -0.5, -0.5], [0.5, 0.5, 0.5], [t, t, t, t, t, t], 1.2);
      const r = mb.result();
      this._crack[stage] = makeVAO(this.gl, r.verts, r.idx);
    }
    return this._crack[stage];
  }
}

function l3(l) { return l[3]; }
function invert4(m) {
  const a = m, out = new Float32Array(16);
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return out;
  det = 1 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
