// ---------------------------------------------------------------------------
// render/packarmor.js — 0.9.0.15: armour in your resource pack's pictures.
//
// Minecraft paints armour as two pictures laid out like an old 64x32 skin:
// layer 1 holds the helmet, the chestplate (body and both arms) and the boots,
// layer 2 the leggings (the belt on the body, and both legs). When the pack has
// them, worn armour is built from those boxes, a pixel (half a pixel for the
// leggings) out from the body the way Minecraft does it, and painted with the
// pack's own pictures; leather takes its dye, with the pack's undyed overlay on
// top. Our own metals that Minecraft doesn't have keep their own look.
// ---------------------------------------------------------------------------
const PACK_ARMOR = {};
const PACK_ARMOR_NAMES = { leather: ['leather'], iron: ['iron'], gold: ['gold', 'golden'], diamond: ['diamond'], cinderite: ['netherite'], copper: ['copper'] };
const LEATHER_UNDYED = [160, 101, 64];
async function packArmor(Z, root, legacy, load) {
  let n = 0;
  const canvasOf = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').putImageData(img, 0, 0); return c; };
  const first = async (paths) => {
    for (const p of paths) {
      if (!Z.files.has(p)) continue;
      const img = await load(p);
      if (img && img.width >= 64 && img.width === img.height * 2) return canvasOf(img);
    }
    return null;
  };
  for (const [mat, names] of Object.entries(PACK_ARMOR_NAMES)) {
    const R = {};
    for (const nm of names) {
      R.l1 = R.l1 || await first([root + 'entity/equipment/humanoid/' + nm + '.png', root + 'models/armor/' + nm + '_layer_1.png']);
      R.l2 = R.l2 || await first([root + 'entity/equipment/humanoid_leggings/' + nm + '.png', root + 'models/armor/' + nm + '_layer_2.png']);
      if (mat === 'leather') {
        R.o1 = R.o1 || await first([root + 'entity/equipment/humanoid/' + nm + '_overlay.png', root + 'models/armor/' + nm + '_layer_1_overlay.png']);
        R.o2 = R.o2 || await first([root + 'entity/equipment/humanoid_leggings/' + nm + '_overlay.png', root + 'models/armor/' + nm + '_layer_2_overlay.png']);
      }
    }
    if (R.l1 || R.l2) { PACK_ARMOR[mat] = R; n++; }
  }
  return n;
}
// a layer's picture, dyed (leather), as a canvas
const PACK_ARMOR_CV = new Map();
function packArmorCanvas(mat, layer, col) {
  const P = PACK_ARMOR[mat]; if (!P) return null;
  const base = layer === 2 ? P.l2 : P.l1; if (!base) return null;
  if (mat !== 'leather') return base;
  const c3 = col ? hexRGB('#' + col) : LEATHER_UNDYED, key = layer + ':' + c3.join(',');
  if (PACK_ARMOR_CV.has(key)) return PACK_ARMOR_CV.get(key);
  const c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
  const x = c.getContext('2d'); x.drawImage(base, 0, 0);
  const id = x.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = d[i] * c3[0] / 255; d[i + 1] = d[i + 1] * c3[1] / 255; d[i + 2] = d[i + 2] * c3[2] / 255; }
  x.putImageData(id, 0, 0);
  const ov = layer === 2 ? P.o2 : P.o1; if (ov && ov.width === c.width) x.drawImage(ov, 0, 0);
  PACK_ARMOR_CV.set(key, c);
  return c;
}
// ... and as a texture
const PACK_ARMOR_TEX = new Map();
function packArmorTex(gl, mat, layer, col) {
  const cv = packArmorCanvas(mat, layer, col); if (!cv) return null;
  if (PACK_ARMOR_TEX.has(cv)) return PACK_ARMOR_TEX.get(cv);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);
  PACK_ARMOR_TEX.set(cv, tex);
  return tex;
}
// the boxes, in each part's own frame (pixels), with the patch of the picture each one takes; the same for every material
let PACK_ARMOR_MESHES = null;
function packArmorMeshes(gl) {
  if (PACK_ARMOR_MESHES) return PACK_ARMOR_MESHES;
  const mk = (layer, lo, hi, u, v, w, h, d, mirror, slice) => {
    const mb = new MeshBuilder(64);
    addSkinBox(mb, lo.map(q => q * PX), hi.map(q => q * PX), u, v, w, h, d, 64, 32, mirror, slice);
    const r = mb.result(), o = makeVAO(gl, r.verts, r.idx); o.layer = layer; return o;
  };
  const M = {
    helmet: mk(1, [-5, -1, -5], [5, 9, 5], 0, 0, 8, 8, 8, false),
    chest: mk(1, [-5, -1, -3], [5, 13, 3], 16, 16, 8, 12, 4, false),
    waist: mk(2, [-4.5, -0.5, -2.5], [4.5, 12.5, 2.5], 16, 16, 8, 12, 4, false),
  };
  for (const [S, mir] of [['', false], ['L', true]]) {
    M['pad' + S] = mk(1, [-3, -4, -3], [3, 3, 3], 40, 16, 4, 12, 4, mir, [0, 0.5]);
    M['cuff' + S] = mk(1, [-3, -7, -3], [3, 0, 3], 40, 16, 4, 12, 4, mir, [0.5, 1]);
    M['thigh' + S] = mk(2, [-2.5, -6, -2.5], [2.5, 0.5, 2.5], 0, 16, 4, 12, 4, mir, [0, 0.5]);
    M['knee' + S] = mk(2, [-2.5, -6.5, -2.5], [2.5, 0, 2.5], 0, 16, 4, 12, 4, mir, [0.5, 1]);
    M['boot' + S] = mk(1, [-3, -7, -3], [3, 0.02, 3], 0, 16, 4, 12, 4, mir, [0.5, 1]);
    // (0.9.0.17) a forearm cuff cut from the chestplate's body, for packs whose chestplate leaves the arms bare below the shoulder
    M['cuffB' + S] = mk(1, [-2.9, -7, -2.9], [2.9, 0, 2.9], 16, 16, 4, 12, 4, mir, [0.5, 1]);
  }
  return (PACK_ARMOR_MESHES = M);
}
// what to draw a piece of this material with, if the pack has it: { am: meshes, t1, t2 }
function packArmorKit(gl, mat, col) {
  const P = PACK_ARMOR[mat];
  if (!P) return null;
  const t1 = packArmorTex(gl, mat, 1, col), t2 = packArmorTex(gl, mat, 2, col);
  if (!t1 && !t2) return null;
  const M = packArmorMeshes(gl);
  // does the pack's chestplate cover the forearm? If not, the cuff comes from its body, so the arm still shows it
  if (P.bareArms === undefined && P.l1) {
    const c = P.l1, s = c.width / 64, d = c.getContext('2d').getImageData(Math.round(40 * s), Math.round(26 * s), Math.round(16 * s), Math.round(6 * s)).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] >= 128) n++;
    P.bareArms = n < d.length / 4 * 0.25;
  }
  const am = P.bareArms ? (M._alt || (M._alt = Object.assign({}, M, { cuff: M.cuffB, cuffL: M.cuffBL }))) : M;
  return { am, t1, t2 };
}
// worn armour from the pack is drawn over the skin's outer layer (its pictures leave gaps the layer shows through)
function packArmorWorn(id) { return !!(id && PACK_ARMOR[armorMat(String(id).split('#')[0])]); }
// the inventory doll: paint the pack's pictures over the flat skin (returns the slots it painted)
function packArmorDoll(armor, put, aw) {
  const done = [false, false, false, false];
  const cvOf = (k, layer) => { const id = armor[k]; if (!id) return null; const [pid, col] = String(id).split('#'); return packArmorCanvas(armorMat(pid), layer, col); };
  const L2 = cvOf(2, 2);
  if (L2) { const s = L2.width / 64; put(L2, 20 * s, 20 * s, 8 * s, 12 * s, 3.6, 8, 8.8, 12.4); put(L2, 4 * s, 20 * s, 4 * s, 12 * s, 3.6, 20, 4.4, 12.2); put(L2, 4 * s, 20 * s, 4 * s, 12 * s, 8, 20, 4.4, 12.2, true); done[2] = true; }
  const B = cvOf(3, 1);
  if (B) { const s = B.width / 64; put(B, 4 * s, 20 * s, 4 * s, 12 * s, 3.5, 20, 4.5, 12.5); put(B, 4 * s, 20 * s, 4 * s, 12 * s, 8, 20, 4.5, 12.5, true); done[3] = true; }
  const C = cvOf(1, 1);
  if (C) { const s = C.width / 64; put(C, 20 * s, 20 * s, 8 * s, 12 * s, 3.5, 7.5, 9, 13); put(C, 44 * s, 20 * s, 4 * s, 12 * s, 4 - aw - 0.5, 7.5, aw + 1, 13); put(C, 44 * s, 20 * s, 4 * s, 12 * s, 11.5, 7.5, aw + 1, 13, true); done[1] = true; }
  const H = cvOf(0, 1);
  if (H) { const s = H.width / 64; put(H, 8 * s, 8 * s, 8 * s, 8 * s, 3.5, -0.5, 9, 9); done[0] = true; }
  return done;
}
