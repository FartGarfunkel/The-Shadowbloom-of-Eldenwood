// ---------------------------------------------------------------------------
// render/icons3d.js — (alpha 3) inventory icons in 3D, the Hytale way.
//
// Blocks already got 3D icons (render/models.js). Now every item is drawn into the icon sheet from its 3D model —
// the same model you hold, drop and hang on a rack — turned a little so its thickness shows, lit from the top left.
// The sheet is drawn at 64 px a cell so the models read clearly. Settings → "3D item icons" switches back to the
// flat pictures.
// ---------------------------------------------------------------------------

ICONS.size = 64;
ICONS.cols = 32;   // (alpha 4) a squarer sheet: 32 across instead of 16, so it stays inside the GPU's texture limits
{
  // The isometric fallback for blocks was drawn for 32 px cells: scale it up to the bigger cells. (alpha 4) And only
  // draw it if the 3D block icons can't be: drawn first for every block and then painted over, it was most of the
  // start-up time on slower machines. buildIcons() now only notes where each block's picture goes; renderBlockIcons()
  // replaces them in 3D, and if it can't (or never runs), the flat ones are drawn after all.
  const baseIso = drawIsoBlock;
  drawIsoBlock = function (g, ox, oy, faces) {
    if (ICONS.isoLater) { ICONS.isoLater.push([ox, oy, faces]); return; }
    const k = ICONS.size / 32;
    if (k === 1) return baseIso(g, ox, oy, faces);
    g.save(); g.imageSmoothingEnabled = false; g.translate(ox, oy); g.scale(k, k); baseIso(g, 0, 0, faces); g.restore();
  };
  const baseBuild = buildIcons;
  buildIcons = function () {
    ICONS.isoLater = [];
    try { baseBuild(); } finally { const L = ICONS.isoLater; ICONS.isoLater = null; ICONS.isoPending = L; }
    setTimeout(() => iconsFlushIso(), 0);   // nothing drew them in 3D in the meantime: draw them flat
  };
}
function iconsFlushIso() {
  const L = ICONS.isoPending; ICONS.isoPending = null;
  if (!L || !L.length || !ICONS.canvas) return;
  const g = ICONS.canvas.getContext('2d'), S = ICONS.size;
  for (const [ox, oy, f] of L) { g.clearRect(ox, oy, S, S); drawIsoBlock(g, ox, oy, f); }
  ICONS.dirty = true;
  if (typeof installIconCSS === 'function' && document.getElementById('vx-icon-css')) installIconCSS();
}
function icons3dOn() { try { const s = JSON.parse(localStorage.getItem('emberwild.settings') || '{}'); return s.icons3d !== false; } catch (e) { return true; } }

function renderItemIcons3D(renderer) {
  if (!icons3dOn() || !ICONS.canvas || !renderer || !renderer.gl) return;
  const gl = renderer.gl, P = renderer.prog.model;
  const keys = Object.keys(ITEMS).filter(k => { const d = ITEMS[k]; return d && d.icon && !d.icon.startsWith('block:') && ICONS.index[k] !== undefined && ATLAS.tile[d.icon] !== undefined; });
  if (!keys.length) return;
  const S = ICONS.size, cols = 32, rows = Math.ceil(keys.length / cols), W = cols * S, H = rows * S;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const depth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, W, H);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  gl.viewport(0, 0, W, H);
  gl.disable(gl.SCISSOR_TEST);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND);
  gl.useProgram(P.p);
  const E = 0.6, proj = new Float32Array([1 / E, 0, 0, 0, 0, 1 / E, 0, 0, 0, 0, -0.2, 0, 0, 0, 0, 1]);
  gl.uniformMatrix4fv(P.u.uProj, false, proj);
  gl.uniformMatrix4fv(P.u.uView, false, Mat4.create());
  gl.uniform1i(P.u.uTex, 0); gl.uniform1f(P.u.uDay, 1); gl.uniform3f(P.u.uFog, 0, 0, 0); gl.uniform2f(P.u.uFogRange, 1000, 2000);
  gl.uniform1f(P.u.uMinLight, 0); gl.uniform2f(P.u.uLight, 1, 0); gl.uniform4f(P.u.uTint, 0, 0, 0, 0); gl.uniform1f(P.u.uUnlit, 0); gl.uniform1f(P.u.uAlpha, 1);
  if (P.u.uGlint) gl.uniform2f(P.u.uGlint, 0, 0);
  if (P.u.uDynN) gl.uniform1i(P.u.uDynN, 0);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, renderer.tex);
  gl.enable(gl.SCISSOR_TEST);
  const done = [];
  keys.forEach((key, i) => {
    let im = null;
    try { im = itemMesh(gl, key); } catch (e) { im = null; }
    if (!im || !im.mesh) return;
    const cx = i % cols, cy = Math.floor(i / cols);
    gl.viewport(cx * S, cy * S, S, S); gl.scissor(cx * S, cy * S, S, S);
    const m = Mat4.create();
    // small things (rings, coins, gems) are drawn small in the world; in a slot they fill it more
    const d = ITEMS[key], mk = typeof dndModelOf === 'function' ? dndModelOf(key, d) : null;
    const sz = mk && typeof DND_MODEL_SIZE !== 'undefined' && DND_MODEL_SIZE[mk] ? DND_MODEL_SIZE[mk] : (typeof itemSize === 'function' ? itemSize(key) : 1);
    const boost = Math.min(1.7, Math.pow(1 / Math.max(0.45, sz), 0.85));
    if (im.kind === 'block') {
      // lanterns, chains, pots: the placed model, turned like a block icon
      Mat4.translate(m, 0, -0.02, 0); Mat4.rotateX(m, Math.PI / 6); Mat4.rotateY(m, Math.PI / 4); Mat4.scale(m, 0.62, 0.62, 0.62);
    } else if (im.stand) {
      // things that stand (potions, bags, candles): upright, seen a little from above
      Mat4.translate(m, 0, -0.03, 0); Mat4.rotateX(m, 0.32); Mat4.rotateY(m, -0.62); Mat4.scale(m, 0.92 * boost, 0.92 * boost, 0.92 * boost);
    } else {
      // things lying along the picture (weapons, tools, food): turned so their thickness shows
      Mat4.rotateX(m, 0.22); Mat4.rotateY(m, -0.55); Mat4.scale(m, 0.98 * boost, 0.98 * boost, 0.98 * boost);
    }
    gl.uniformMatrix4fv(P.u.uModel, false, m);
    gl.bindVertexArray(im.mesh.vao); gl.drawElements(gl.TRIANGLES, im.mesh.count, gl.UNSIGNED_INT, 0);
    done.push(i);
  });
  gl.disable(gl.SCISSOR_TEST);
  const px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fb); gl.deleteRenderbuffer(depth); gl.deleteTexture(tex);
  gl.bindVertexArray(null); gl.enable(gl.CULL_FACE);
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  const tg = tmp.getContext('2d', { willReadFrequently: true }), img = tg.createImageData(W, H);
  for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  // a soft dark outline round each model, so it reads against any slot
  tg.putImageData(img, 0, 0);
  const g = ICONS.canvas.getContext('2d');
  for (const i of done) {
    const key = keys[i], cx = i % cols, cy = Math.floor(i / cols), j = ICONS.index[key];
    const ox = (j % ICONS.cols) * S, oy = Math.floor(j / ICONS.cols) * S;
    // only replace the flat picture when the model actually drew something
    let n = 0;
    for (let y = cy * S; y < cy * S + S && n < S * S * 0.012; y += 2) { const o = (y * W + cx * S) * 4; for (let x = 0; x < S; x += 2) if (px[o + x * 4 + 3] > 0) n += 4; }
    if (n < S * S * 0.012) continue;
    g.clearRect(ox, oy, S, S);
    g.save(); g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 0; g.shadowOffsetX = 1; g.shadowOffsetY = 2;
    g.drawImage(tmp, cx * S, H - (cy + 1) * S, S, S, ox, oy, S, S);
    g.restore();
  }
  ICONS.dirty = true;
  ICONS.items3d = done.length;
}
{
  const baseBlocks = renderBlockIcons;
  renderBlockIcons = function (renderer) {
    let ok = false;
    try { baseBlocks(renderer); ok = true; } catch (e) { console.warn('3D block icons unavailable', e); }
    if (ok) ICONS.isoPending = null; else iconsFlushIso();
    try { renderItemIcons3D(renderer); } catch (e) { console.warn('3D item icons unavailable', e); }
  };
}
try { window.__iconPos = (k) => iconPos(k); Object.defineProperty(window, '__icons3d', { get: () => ICONS.items3d || 0 }); } catch (e) { /* no window */ }
try { window.__iconIndex = (k) => ICONS.index[k] ?? -1; } catch (e) { /* no window */ }
