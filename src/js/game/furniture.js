// ---------------------------------------------------------------------------
// game/furniture.js — 0.8.4: furniture, and sitting down.
//
// Every wood has a chair, a stool, a bench, a table, a wall shelf, a standing
// shelf, a bookcase and a cabinet. They face you when you set them down.
// Use a chair, stool or bench to sit (stairs and bottom slabs work too, with
// an empty hand); sneak to stand up. Shelves hold whatever you put on them,
// one stack to a spot, and show it; bookcases hold books, one to a spot, and
// show their spines. Cabinets are small cupboards (nine slots).
// ---------------------------------------------------------------------------

const FURN_WOOD_COLOR = {
  oak: '#b8945f', birch: '#d7c98f', spruce: '#7a5a3a', jungle: '#b88764', acacia: '#b8653a', dark_oak: '#4f3420',
  cherry: '#e0b0a4', mangrove: '#7a3a34', crimson: '#7e3a56', warped: '#3a8582', pine: '#c9a46a', aspen: '#d8caa2',
};
const FURN_SEAT = { chair: 8, stool: 10, bench: 7 };
const BOOK_COLORS = ['#8a2a22', '#24456e', '#2e5a2a', '#6a4422', '#5a2a6a'];

// ---- the shapes (pixels, 0..16; facing 0 has its back to the north, its front toward you) ----
for (const [w, , logK, plK] of WOODS) {
  const P = plK === 'planks' ? 'planks' : w + '_planks', S = 'stripped_' + w + '_log_side', L = w === 'oak' ? 'log_side' : w + '_log_side';
  const box = (b, side, end) => ({ b, side, end: end || side });
  const legs = (h, a, b2, t = 2) => [[a, a], [b2 - t, a], [a, b2 - t], [b2 - t, b2 - t]].map(([x, z]) => box([x, 0, z, x + t, h, z + t], S));
  SHAPES[w + '_chair'] = [
    ...legs(6.5, 2, 14), box([1.5, 6.5, 1.5, 14.5, 8, 14.5], P),
    box([2, 8, 1.5, 4, 16, 3.5], S), box([12, 8, 1.5, 14, 16, 3.5], S),
    box([4, 10, 2, 12, 11.5, 3], P), box([4, 13.5, 2, 12, 15, 3], P),
  ];
  SHAPES[w + '_stool'] = [...legs(8.5, 3, 13, 2), box([2.5, 8.5, 2.5, 13.5, 10, 13.5], P), box([4, 3, 4, 12, 4, 12], S)];
  SHAPES[w + '_bench'] = [
    box([1, 0, 4, 3, 5.5, 12], S), box([13, 0, 4, 15, 5.5, 12], S),
    box([0, 5.5, 3, 16, 7, 13], P), box([0, 7, 3, 16, 12, 4.5], P), box([0, 10.5, 2.5, 16, 12, 4.5], P),
  ];
  SHAPES[w + '_table'] = [box([0, 13, 0, 16, 16, 16], P), ...legs(13, 1, 15, 2.5), box([3, 4, 3, 13, 5, 13], S)];
  SHAPES[w + '_shelf'] = [box([0, 6, 0, 16, 8, 8], P), box([1, 2, 0, 3, 6, 6], S), box([13, 2, 0, 15, 6, 6], S), box([0, 8, 0, 16, 9, 1], S)];
  SHAPES[w + '_standing_shelf'] = [
    box([0, 0, 0, 16, 16, 1], P), box([0, 0, 0, 1, 16, 10], S), box([15, 0, 0, 16, 16, 10], S),
    box([1, 0, 1, 15, 1, 10], P), box([1, 7, 1, 15, 8, 10], P), box([1, 15, 1, 15, 16, 10], P),
  ];
  SHAPES[w + '_bookcase'] = [
    box([1, 1, 0, 15, 15, 1], P), box([0, 0, 0, 1, 16, 16], P), box([15, 0, 0, 16, 16, 16], P),
    box([1, 0, 0, 15, 1, 16], P), box([1, 7.5, 0, 15, 8.5, 16], P), box([1, 15, 0, 15, 16, 16], P),
  ];
  SHAPES[w + '_cabinet'] = [box([1, 0, 1, 15, 14, 14.5], P), box([0.5, 14, 0.5, 15.5, 15.5, 15.5], P), box([2, 1.5, 14.5, 14, 12.5, 15.2], w + '_trapdoor'),
    box([7, 6, 15.2, 7.8, 8.5, 15.8], 'iron_block'), box([8.2, 6, 15.2, 9, 8.5, 15.8], 'iron_block')];
}

// ---- tiles: item pictures for each piece, book spines --------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    const draw = (p, rects, col) => { for (const [x0, y0, x1, y1, k] of rects) for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) p.set(x, y, shade(col, k)); };
    const ICON = {
      chair: [[4, 1, 6, 15, 0.8], [4, 3, 11, 4, 1], [4, 6, 11, 7, 1], [4, 8, 13, 10, 1.05], [11, 10, 13, 15, 0.8], [5, 10, 6, 15, 0.7]],
      stool: [[2, 5, 14, 7, 1.05], [3, 7, 5, 15, 0.8], [11, 7, 13, 15, 0.8], [5, 11, 11, 12, 0.7]],
      bench: [[1, 4, 15, 6, 0.9], [1, 6, 15, 7, 0.75], [1, 8, 15, 10, 1.05], [2, 10, 4, 15, 0.8], [12, 10, 14, 15, 0.8]],
      table: [[0, 4, 16, 7, 1.05], [1, 7, 3, 15, 0.8], [13, 7, 15, 15, 0.8], [3, 9, 13, 10, 0.7]],
      shelf: [[1, 4, 15, 5, 0.75], [1, 7, 15, 9, 1.05], [2, 9, 4, 12, 0.8], [12, 9, 14, 12, 0.8]],
      standing_shelf: [[2, 1, 14, 15, 0.55], [2, 1, 3, 15, 0.9], [13, 1, 14, 15, 0.9], [2, 1, 14, 2, 1.05], [2, 7, 14, 8, 1.05], [2, 14, 14, 15, 1.05]],
      bookcase: [[2, 1, 14, 15, 0.5], [2, 1, 3, 15, 0.95], [13, 1, 14, 15, 0.95], [2, 1, 14, 2, 1.05], [2, 7, 14, 8, 1.05], [2, 14, 14, 15, 1.05]],
      cabinet: [[2, 2, 14, 15, 0.95], [1, 1, 15, 2, 1.1], [3, 3, 7.5, 14, 0.8], [8.5, 3, 13, 14, 0.8]],
    };
    for (const [w] of WOODS) {
      const col = H(FURN_WOOD_COLOR[w] || '#b8945f');
      for (const k of Object.keys(ICON)) addItem('furn_' + k + '_' + w, p => {
        draw(p, ICON[k], col);
        if (k === 'bookcase') for (let i = 0; i < 5; i++) { const c = H(BOOK_COLORS[i]); for (let y = 3; y < 7; y++) p.set(4 + i * 2, y, c); for (let y = 9; y < 14; y++) p.set(3 + i * 2 + (i > 2 ? 1 : 0), y, H(BOOK_COLORS[(i + 2) % 5])); }
        if (k === 'standing_shelf') { p.set(5, 5, H('#c8c8d0')); p.set(6, 5, H('#c8c8d0')); p.set(5, 6, H('#9a9aa4')); p.set(6, 6, H('#9a9aa4')); p.set(10, 12, H('#d03a2a')); p.set(10, 13, H('#a02a1a')); }
        if (k === 'cabinet') { p.set(7, 8, H('#c8c8d0')); p.set(8, 8, H('#c8c8d0')); }
      });
    }
    BOOK_COLORS.forEach((c, i) => addTile('book_spine_' + i, p => {
      p.noise(H(c), 0.12);
      for (let x = 0; x < 16; x++) { p.set(x, 3, H('#d8b040')); p.set(x, 12, H('#d8b040')); p.set(x, 0, shade(H(c), 0.6)); p.set(x, 15, shade(H(c), 0.6)); }
      for (let y = 5; y < 10; y++) for (let x = 4; x < 12; x++) if ((x + y) % 3 === 0) p.set(x, y, shade(H(c), 1.25));
    }));
    addTile('book_pages', p => { p.noise(H('#e8e0c8'), 0.06); for (let y = 0; y < 16; y += 2) for (let x = 0; x < 16; x++) p.set(x, y, H('#d0c8b0')); });
  };
}

// ---- recipes ----------------------------------------------------------------------------------
for (const [w, , , plK] of WOODS) {
  const P = plK, S = 'stick', K = (k) => w + '_' + k, td = ITEMS[w + '_trapdoor'] ? w + '_trapdoor' : P;
  RECIPES.push(
    { out: K('chair'), n: 2, shape: ['P  ', 'PPP', 'S S'], key: { P, S }, group: 'furniture' },
    { out: K('stool'), n: 2, shape: ['PPP', 'S S'], key: { P, S }, group: 'furniture' },
    { out: K('bench'), n: 2, shape: ['PPP', 'SSS'], key: { P, S }, group: 'furniture' },
    { out: K('table'), n: 1, shape: ['PPP', 'S S', 'S S'], key: { P, S }, group: 'furniture' },
    { out: K('shelf'), n: 3, shape: ['S S', 'PPP'], key: { P, S }, group: 'furniture' },
    { out: K('standing_shelf'), n: 1, shape: ['PPP', 'S S', 'PPP'], key: { P, S }, group: 'furniture' },
    { out: K('bookcase'), n: 1, shape: ['PSP', 'P P', 'PSP'], key: { P, S }, group: 'furniture' },
    { out: K('cabinet'), n: 1, shape: ['PPP', 'PTP', 'PPP'], key: { P, T: td }, group: 'furniture' },
  );
}

// ---- sitting ----------------------------------------------------------------------------------
// You sit on a seat the way you sit in a boat: it holds you in place until you sneak.
const FURN_FACE_ANGLE = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
class Seat extends Entity {
  constructor(game, bx, by, bz, top, yaw) {
    super(game, bx + 0.5, by + top / 16, bz + 0.5);
    this.bx = bx; this.by = by; this.bz = bz; this.top = top; this.yaw = yaw; this.block = game.world.getBlock(bx, by, bz);
    this.riders = [null]; this.isVehicle = true; this.isSeat = true; this.w = 0.3; this.h = 0.3;
    // sit a touch toward the front of a chair, away from its back
    if (BLOCKS[this.block].furniture === 'chair') { this.x += -Math.sin(yaw) * 0.08; this.z += -Math.cos(yaw) * 0.08; }
  }
  get alive() { return !this.remove; }
  mount(lp) {
    this.riders[0] = lp; lp.riding = this; lp.seat = 0;
    const p = lp.player; p.vx = p.vy = p.vz = 0; p.yaw = this.yaw;
    lp.toast('Sneak to stand up', '');
  }
  dismount(lp) {
    if (this.riders[0] !== lp) return;
    this.riders[0] = null; lp.riding = null; this.remove = true;
    const p = lp.player, w = this.game.world;
    // stand up in front of the seat if there's room, else on top of it
    const fx = Math.round(-Math.sin(this.yaw)), fz = Math.round(-Math.cos(this.yaw));
    for (const [dx, dz] of [[fx, fz], [-fz, fx], [fz, -fx], [-fx, -fz]]) {
      const x = this.bx + dx, z = this.bz + dz;
      for (const y of [this.by, this.by + 1, this.by - 1]) if (T_SOLID[w.getBlock(x, y - 1, z)] && !collides(w, x + 0.2, y, z + 0.2, x + 0.8, y + 1.8, z + 0.8)) { p.x = x + 0.5; p.y = y; p.z = z + 0.5; p.fallStart = null; return; }
    }
    p.y = this.by + 1; p.fallStart = null;
  }
  hurt() { return 0; }
  update(dt) {
    const g = this.game, r = this.riders[0];
    if (!r || r.dead || !g.locals.includes(r) || r.riding !== this) { this.remove = true; if (r && r.riding === this) r.riding = null; return; }
    if (g.world.getBlock(this.bx, this.by, this.bz) !== this.block) { this.dismount(r); return; }
    const p = r.player;
    p.x = this.x; p.y = this.y - 0.25; p.z = this.z; p.vx = p.vy = p.vz = 0; p.fallStart = null; p.onGround = true;
  }
  draws() {}
  snap() { return null; }
}
// Where can you sit, how high, and which way do you face?
function seatAt(w, x, y, z) {
  const id = w.getBlock(x, y, z), b = BLOCKS[id], m = w.getMeta(x, y, z);
  if (b.furniture && FURN_SEAT[b.furniture]) return { top: FURN_SEAT[b.furniture], yaw: Math.PI + FURN_FACE_ANGLE[m & 3], furn: true };
  if (T_SHAPE[id] === SHAPE.STAIRS && !(m & 4)) return { top: 8, yaw: [Math.PI, Math.PI / 2, 0, -Math.PI / 2][m & 3] };
  if (T_SHAPE[id] === SHAPE.SLAB && (m & 7) === 0) return { top: 8, yaw: null };
  return null;
}
Object.assign(LocalPlayer.prototype, {
  sitOn(x, y, z) {
    const g = this.g, s = seatAt(g.world, x, y, z);
    if (!s || this.riding || this.player.carrying) return false;
    if (T_SOLID[g.world.getBlock(x, y + 1, z)] && !BLOCKS[g.world.getBlock(x, y + 1, z)].furniture) { this.toast('No room to sit there', ''); return true; }
    if (g.entities.some(e => e.isSeat && !e.remove && e.bx === x && e.by === y && e.bz === z)) { this.toast('Someone is sitting there', ''); return true; }
    const seat = new Seat(g, x, y, z, s.top, s.yaw ?? this.player.yaw);
    g.addEntity(seat); seat.mount(this); seat.update(0);
    g.sfx.material(BLOCKS[g.world.getBlock(x, y, z)].sound || 'wood', 'step');
    return true;
  },
  // Which spot on a shelf or in a bookcase the crosshair is on.
  furnSlot(hit, b) {
    const [fx, fy, fz] = this.hitFrac(hit), f = this.g.world.getMeta(hit.x, hit.y, hit.z) & 3;
    const X = clamp(fx, 0, 0.999) * 16, Z = clamp(fz, 0, 0.999) * 16;
    const mx = f === 0 ? X : f === 1 ? Z : f === 2 ? 16 - X : 16 - Z;      // back into the piece's own frame
    const col = Math.min(2, Math.floor(mx / (16 / 3)));
    const row = b.furniture === 'shelf' ? 0 : fy < 0.5 ? 0 : 1;
    return row * 3 + col;
  },
});
// (0.9.0.44) a book by what it is, not only by its name: old lore books (lore_*) and spell tomes (tome_*) too
const isBook = (id) => {
  if (!id || /bookshelf|bookcase/.test(id)) return false;
  const d = itemDef(id);
  return /book/.test(id) || !!(d && (d.lore || d.tome || /book/.test(d.icon || '')));
};
{
  const base = LocalPlayer.prototype.useBlockAt;
  LocalPlayer.prototype.useBlockAt = function (hit, held, def) {
    const g = this.g, w = g.world, p = this.player, b = BLOCKS[hit.id];
    if (!p.sneaking && !this.riding) {
      if (b.furniture && FURN_SEAT[b.furniture]) { this.swingArm(); return this.sitOn(hit.x, hit.y, hit.z); }
      if (!held && (T_SHAPE[hit.id] === SHAPE.STAIRS || T_SHAPE[hit.id] === SHAPE.SLAB) && seatAt(w, hit.x, hit.y, hit.z) && hit.ny === 1) return this.sitOn(hit.x, hit.y, hit.z);
    }
    // a plain bookshelf is packed full already: say where books can go
    if (hit.id === B.bookshelf && held && isBook(held.id) && !p.sneaking) { this.toast('This bookshelf is full already. Books go in a Bookcase (planks and sticks: P S P / P · P / P S P)', ''); return true; }
    if (b.shelf || b.bookcase) {
      const n = b.shelf || b.bookcase, k = this.furnSlot(hit, b);
      let e = w.getEntity(hit.x, hit.y, hit.z);
      if (!e || !e.items) { e = { type: b.shelf ? 'shelf' : 'bookcase', items: new Array(n).fill(null) }; w.setEntity(hit.x, hit.y, hit.z, e); }
      const here = e.items[k];
      if (held && (!b.bookcase || isBook(held.id))) {
        if (here) { this.toast(b.bookcase ? 'There is a book there already' : 'Something is there already', ''); return true; }
        const take = b.bookcase ? 1 : held.n;
        e.items[k] = Object.assign(cloneStack(held), { n: take });
        held.n -= take; if (held.n <= 0) p.inv.held = null;
        g.entityChanged(hit.x, hit.y, hit.z); g.sfx.material('wood', 'place'); this.swingArm(); return true;
      }
      if (held && b.bookcase) { this.toast('Bookcases hold books', ''); return true; }
      if (here) { e.items[k] = null; this.give(here); g.entityChanged(hit.x, hit.y, hit.z); g.sfx.play('pop'); this.swingArm(); return true; }
      return true;
    }
    return base.call(this, hit, held, def);
  };
}

// ---- drawing what's on the shelves ---------------------------------------------------------------
const BOOK_MESHES = [];
function bookMesh(gl, i) {
  if (BOOK_MESHES[i]) return BOOK_MESHES[i];
  const mb = new MeshBuilder(64), spine = 'book_spine_' + (i % BOOK_COLORS.length);
  addBox(mb, [-0.11, 0, -0.2], [0.11, 0.38, 0.2], ['book_spine_' + ((i + 1) % 5), 'book_spine_' + ((i + 1) % 5), 'book_pages', 'book_pages', spine, 'book_pages'].map(n => n));
  const r = mb.result();
  return (BOOK_MESHES[i] = makeVAO(gl, r.verts, r.idx));
}
{
  // tilesOf takes arrays of names; addBox takes tile indices
  const baseAddBox = addBox;
  addBox = function (mb, min, max, tiles, shadeMul) { if (tiles && typeof tiles[0] === 'string') tiles = tilesOf(tiles); return baseAddBox(mb, min, max, tiles, shadeMul); };
}
{
  const base = blockEntityDraws;
  blockEntityDraws = function (game, out, cam, R) {
    base(game, out, cam, R);
    const w = game.world, gl = game.renderer.gl;
    const pcx = Math.floor(cam.x) >> 4, pcz = Math.floor(cam.z) >> 4;
    for (const ch of w.chunks.values()) {
      if (!ch.blockEntities.size || Math.abs(ch.cx - pcx) > R || Math.abs(ch.cz - pcz) > R) continue;
      for (const [i, e] of ch.blockEntities) {
        if ((e.type !== 'shelf' && e.type !== 'bookcase') || !e.items) continue;
        const x = ch.cx * 16 + (i & 15), z = ch.cz * 16 + ((i >> 4) & 15), y = i >> 8;
        const b = BLOCKS[ch.blocks[i]];
        if (!b.shelf && !b.bookcase) continue;
        const l = w.getLight(x, y, z), light = [l >> 4, l & 15], f = ch.meta[i] & 3;
        e.items.forEach((s, k) => {
          if (!s || !itemDef(s.id)) return;
          const col = k % 3, row = Math.floor(k / 3), cx = (col + 0.5) / 3 * 0.86 + 0.07;
          const m = Mat4.create();
          Mat4.translate(m, 0.5, 0, 0.5); Mat4.rotateY(m, FURN_FACE_ANGLE[f]); Mat4.translate(m, -0.5, 0, -0.5);
          if (e.type === 'bookcase') {
            const by = row ? 8.5 / 16 : 1 / 16, h = (s.id.charCodeAt(0) + k * 7) % 5;
            Mat4.translate(m, cx, by, 0.5); Mat4.rotateZ(m, ((k * 37) % 5 - 2) * 0.03); Mat4.scale(m, 1, 0.9 + h * 0.04, 1);
            out.push({ mesh: bookMesh(gl, /enchant/.test(s.id) ? 4 : (k + h) % 4), m, px: x, py: y, pz: z, light });
            return;
          }
          const top = b.furniture === 'shelf' ? 8 / 16 : row ? 8 / 16 : 1 / 16, depth = b.furniture === 'shelf' ? 4 / 16 : 5.5 / 16;
          const im = itemMesh(gl, s.id);
          if (im.kind === 'block') { Mat4.translate(m, cx, top + 0.11, depth); Mat4.rotateY(m, 0.3 * (col - 1)); Mat4.scale(m, 0.22, 0.22, 0.22); }
          else { Mat4.translate(m, cx, top + 0.17, depth); Mat4.scale(m, 0.36, 0.36, 0.36); }
          out.push({ mesh: im.mesh, m, px: x, py: y, pz: z, light, noCull: im.kind !== 'block' });
        });
      }
    }
  };
}
