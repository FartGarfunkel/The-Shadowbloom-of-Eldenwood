// ---------------------------------------------------------------------------
// game/carried.js — 0.9.0.12: what you carry shows on you.
//
// The things in your hotbar that aren't in your hand are on you where you'd
// keep them: a sword (or a staff, or a club) slung across your back, a bow
// over it, a pickaxe or shovel hanging at your right hip, an axe or hoe at your
// left, and a few potions hanging off the side of your backpack (or from your
// belt, without one). Everyone sees it, over the network too.
// ---------------------------------------------------------------------------
function carriedLook(inv) {
  const ids = [];
  for (let i = 0; i < 9; i++) if (i !== inv.selected && inv.main.slots[i]) ids.push(inv.main.slots[i].id);
  const tt = (id) => { const d = itemDef(id); return d && d.tool ? d.tool.type : null; };
  const out = {};
  const long = ids.find(id => tt(id) === 'sword' || tt(id) === 'staff' || /club|spear|trident|mace/.test(id));
  const bow = ids.find(id => tt(id) === 'bow');
  if (long) out.b = long;
  if (bow) { if (long) out.b2 = bow; else out.b = bow; }
  const hr = ids.find(id => tt(id) === 'pickaxe') || ids.find(id => tt(id) === 'shovel');
  const hl = ids.find(id => tt(id) === 'axe') || ids.find(id => tt(id) === 'hoe');
  if (hr) out.hr = hr; if (hl) out.hl = hl;
  const pots = [], bp = inv.backpackSlots ? inv.backpackSlots() : null;
  for (const id of ids.concat((bp || []).filter(Boolean).map(s => s.id))) if (/^(splash_)?potion_|^honey_bottle$/.test(id) && pots.length < 3) pots.push(id);
  if (pots.length) out.p = pots;
  return Object.keys(out).length ? out : null;
}
{
  const basePose = LocalPlayer.prototype.pose;
  LocalPlayer.prototype.pose = function () {
    const ps = basePose.call(this), k = carriedLook(this.player.inv);
    if (k) ps.kit = k;
    return ps;
  };
  const baseDraws = avatarDraws;
  avatarDraws = function (out, gl, skin, pose) {
    baseDraws(out, gl, skin, pose);
    const K = pose.kit;
    if (!K || !skin || !skin.ready || pose.fp || pose.swim || pose.sleep || pose.deathT || pose.invis) return;
    // the body's frame, worked out the way avatarDraws does it
    const P = skin.parts, A = avatarAnim(pose);
    const bodyM = Mat4.create();
    Mat4.rotateY(bodyM, pose.yaw);
    if (A.lift) Mat4.translate(bodyM, 0, A.lift, 0);
    Mat4.translate(bodyM, P.body.pivot[0], P.body.pivot[1], P.body.pivot[2]);
    if (A.body[1]) Mat4.rotateY(bodyM, A.body[1]); if (A.body[0]) Mat4.rotateX(bodyM, A.body[0]); if (A.body[2]) Mat4.rotateZ(bodyM, A.body[2]);
    const put = (id, place) => {
      if (!itemDef(id)) return;
      const im = itemMesh(gl, id), m = Mat4.create(); m.set(bodyM); place(m);
      out.push({ mesh: im.mesh, m, px: pose.x, py: pose.y, pz: pose.z, light: pose.light, noCull: true, tint: pose.tint });
    };
    const zb = (pose.back ? 7.4 : 2.7) * PX;
    // slung across the back, the grip up over the right shoulder
    if (K.b) put(K.b, m => { Mat4.translate(m, 0, 7.4 * PX, zb); Mat4.rotateZ(m, Math.PI - 0.12); Mat4.scale(m, 0.72, 0.72, 0.72); });
    if (K.b2) put(K.b2, m => { Mat4.translate(m, 0, 6.8 * PX, zb + 0.9 * PX); Mat4.rotateZ(m, Math.PI / 2 + 0.12); Mat4.scale(m, 0.78, 0.78, 0.78); });
    // hanging at the hips, head up at the belt, handle down along the leg
    if (K.hr) put(K.hr, m => { Mat4.translate(m, 4.75 * PX, 1.2 * PX, 0.4 * PX); Mat4.rotateY(m, Math.PI / 2); Mat4.rotateZ(m, Math.PI / 4 + 0.08); Mat4.scale(m, 0.52, 0.52, 0.52); });
    if (K.hl) put(K.hl, m => { Mat4.translate(m, -4.75 * PX, 1.2 * PX, 0.4 * PX); Mat4.rotateY(m, -Math.PI / 2); Mat4.rotateZ(m, Math.PI / 4 + 0.08); Mat4.scale(m, 0.52, 0.52, 0.52); });
    // potions: off the side of the pack, or from the belt
    if (K.p) K.p.forEach((id, i) => put(id, m => {
      if (pose.back) { Mat4.translate(m, -5.5 * PX, 4.2 * PX, (2.6 + i * 1.25) * PX); Mat4.rotateY(m, Math.PI / 2); Mat4.scale(m, 0.32, 0.32, 0.32); }
      else { Mat4.translate(m, (-2.6 + i * 1.3) * PX, -0.6 * PX, -2.45 * PX); Mat4.scale(m, 0.27, 0.27, 0.27); }
    }));
  };
}
