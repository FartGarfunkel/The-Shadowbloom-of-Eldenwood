// ---------------------------------------------------------------------------
// game/mech.js — windmills, waterwheels, axles and the machines they turn.
//
// A windmill (high up, sails in open air) or a waterwheel (in flowing water)
// turns its axle. Axles carry the turning along their length into a millstone
// or sawmill. Everything joined together shares the power: more sources turn
// machines faster; more machines share it out. Parts spin as they work.
// ---------------------------------------------------------------------------

const MECH_AXES = [[0, 1, 0], [1, 0, 0], [0, 0, 1]]; // meta axis: 0 up, 1 east-west, 2 north-south
const MILL_TIME = 3.5; // seconds per item at full speed
// what turning power drives (0.9.0.35 adds the crusher, the harvester and belts: game/machines.js)
const MECH_USERS = new Set(['millstone', 'sawmill', 'crusher', 'harvester']);
const MECH_LOAD = { millstone: 1, sawmill: 1, crusher: 2, harvester: 1 };

class Mechanics {
  constructor(game) {
    this.g = game; this.nodes = new Map(); this.comps = []; this.dirty = true; this.t = 0; this.meshes = null; this.creakT = 0;
  }
  clear() { this.nodes.clear(); this.comps = []; this.dirty = true; }
  placed(x, y, z, id, lp) {
    const w = this.g.world, d = BLOCKS[id];
    let axis = 0;
    const hit = lp && lp.target;
    if (hit) {
      if (d.mech === 'axle') axis = hit.nx ? 1 : hit.nz ? 2 : 0;
      else if (d.mech === 'windmill' || d.mech === 'waterwheel') axis = hit.nx ? 1 : hit.nz ? 2 : (lp.lookDir() & 1 ? 1 : 2);
    }
    if (d.mech === 'axle' || d.mech === 'windmill' || d.mech === 'waterwheel') {
      w.setBlock(x, y, z, id, axis, { quiet: true });
      w.setEntity(x, y, z, { type: 'mech' });
    } else if (d.machine) w.setEntity(x, y, z, { type: 'machine', items: [null, null], progress: 0 });
    this.dirty = true;
    if (d.mech === 'windmill' && lp) {
      const s = this.sourcePower(x, y, z, id, axis);
      lp.toast(s.blocked ? 'The sails need open air all around — 4 blocks every way' : y < 62 ? 'A windmill turns best high up' : 'The sails catch the wind', s.blocked ? 'warn' : 'good');
    }
  }
  removed() { this.dirty = true; }

  // Find every mechanical block in loaded chunks and group the connected ones.
  rebuild() {
    const w = this.g.world;
    this.nodes.clear();
    for (const ch of w.chunks.values()) {
      if (!ch.blockEntities.size) continue;
      for (const [i, e] of ch.blockEntities) {
        if (e.type !== 'mech' && e.type !== 'machine') continue;
        const id = ch.blocks[i], d = BLOCKS[id];
        if (!d.mech) continue;
        const x = ch.cx * 16 + (i & 15), z = ch.cz * 16 + ((i >> 4) & 15), y = i >> 8;
        this.nodes.set(posKey(x, y, z), { x, y, z, id, kind: d.mech, axis: Math.min(2, ch.meta[i] & 3), e, comp: null });
      }
    }
    const conn = (n, dx, dy, dz) => {
      if (MECH_USERS.has(n.kind) || n.kind === 'belt') return true;
      const a = MECH_AXES[n.axis];
      return Math.abs(a[0]) === Math.abs(dx) && Math.abs(a[1]) === Math.abs(dy) && Math.abs(a[2]) === Math.abs(dz);
    };
    this.comps = [];
    for (const n of this.nodes.values()) {
      if (n.comp) continue;
      const comp = { nodes: [], sources: [], machines: [], belts: [], speed: 0, angle: 0 };
      const q = [n]; n.comp = comp;
      while (q.length) {
        const c = q.pop(); comp.nodes.push(c);
        if (c.kind === 'windmill' || c.kind === 'waterwheel') comp.sources.push(c);
        if (MECH_USERS.has(c.kind)) comp.machines.push(c);
        if (c.kind === 'belt') comp.belts.push(c);
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
          const o = this.nodes.get(posKey(c.x + dx, c.y + dy, c.z + dz));
          if (!o || o.comp) continue;
          // two machines never pass power to each other directly
          if (MECH_USERS.has(c.kind) && MECH_USERS.has(o.kind)) continue;
          if (conn(c, dx, dy, dz) && conn(o, -dx, -dy, -dz)) { o.comp = comp; q.push(o); }
        }
      }
      this.comps.push(comp);
    }
    this.dirty = false;
  }
  // How hard a windmill or waterwheel is pushing right now (0..1).
  sourcePower(x, y, z, id, axis) {
    const w = this.g.world, d = BLOCKS[id];
    const a = MECH_AXES[axis];
    // the two directions across the wheel's face
    const u = a[0] ? [0, 1, 0] : a[2] ? [0, 1, 0] : [1, 0, 0], v = a[0] ? [0, 0, 1] : a[2] ? [1, 0, 0] : [0, 0, 1];
    if (d.mech === 'windmill') {
      let blocked = false;
      for (let i = -4; i <= 4 && !blocked; i++) for (let j = -4; j <= 4; j++) {
        if (!i && !j) continue;
        if (i * i + j * j > 17) continue;
        const bx = x + u[0] * i + v[0] * j, by = y + u[1] * i + v[1] * j, bz = z + u[2] * i + v[2] * j;
        if (T_SOLID[w.getBlock(bx, by, bz)] && !BLOCKS[w.getBlock(bx, by, bz)].mech) { blocked = true; break; }
      }
      const wind = this.g.wind ? this.g.wind.strength : 0.6;
      const height = clamp((y - 52) / 34, 0.15, 1);
      return { power: blocked || this.g.dim === DIM.POCKET ? 0 : wind * height * 1.6, blocked };
    }
    // waterwheel: flowing (not still) water through the wheel
    let flow = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const bx = x + u[0] * i + v[0] * j, by = y + u[1] * i + v[1] * j, bz = z + u[2] * i + v[2] * j;
      const b = w.getBlock(bx, by, bz);
      if (T_LIQUID[b] === 1 && (w.getMeta(bx, by, bz) & 15) !== 0) flow++;
    }
    return { power: Math.min(1.2, flow * 0.4), blocked: false };
  }
  update(dt) {
    const g = this.g;
    if (!g.world) return;
    this.t += dt;
    if (this.dirty || this.t > 2) { if (this.t > 2) this.t = 0; this.rebuild(); }
    for (const c of this.comps) {
      let power = 0;
      for (const s of c.sources) { const r = this.sourcePower(s.x, s.y, s.z, s.id, s.axis); s.power = r.power; s.blocked = r.blocked; power += r.power; }
      const load = c.machines.reduce((k, m) => k + (MECH_LOAD[m.kind] || 1), 0) + c.belts.length * 0.05;
      const want = c.sources.length ? Math.min(1.5, power / Math.max(1, load * 0.6)) : 0;
      c.speed += (want - c.speed) * Math.min(1, dt * 0.8);
      c.angle = (c.angle + c.speed * dt * 2.4) % (Math.PI * 2000);
      if (g.isGuest) continue;
      for (const m of c.machines) this.work(m, dt * c.speed);
      if (c.speed > 0.15 && c.nodes.length) {
        this.creakT -= dt;
        if (this.creakT < 0) { this.creakT = 2.5 + Math.random() * 3; const n = c.nodes[0]; g.sfx.playAt('creak', n.x, n.y, n.z, 20); }
      }
    }
  }
  work(m, amount) {
    if (m.kind === 'crusher') return crusherWork(this, m, amount);
    if (m.kind === 'harvester') return harvesterWork(this, m, amount);
    const e = m.e, g = this.g;
    e.items = e.items || [null, null];
    const inp = e.items[0], out = e.items[1];
    const table = m.kind === 'millstone' ? MILLING : SAWING;
    const r = inp && table[inp.id];
    if (!r || (out && (out.id !== r[0] || out.n + r[1] > maxStackOf(r[0])))) { e.progress = 0; return; }
    if (amount <= 0) return;
    e.progress = (e.progress || 0) + amount / MILL_TIME;
    if (Math.random() < amount * 3) g.burst(m.x + 0.5, m.y + 1.05, m.z + 0.5, inp.id, 1, 0.4);
    if (e.progress >= 1) {
      e.progress = 0;
      inp.n--; if (inp.n <= 0) e.items[0] = null;
      if (out) out.n += r[1]; else e.items[1] = mkStack(r[0], r[1]);
      g.sfx.playAt(m.kind === 'millstone' ? 'grind' : 'saw', m.x, m.y, m.z, 20);
      g.entityChanged(m.x, m.y, m.z);
    }
  }
  speedAt(x, y, z) { const n = this.nodes.get(posKey(x, y, z)); return n && n.comp ? n.comp.speed : 0; }

  // ---- drawing -----------------------------------------------------------------------
  buildMeshes(gl) {
    const T = (n) => ATLAS.tile[n] ?? 0;
    const mk = (boxes) => { const mb = new MeshBuilder(256); for (const [mn, mx, t] of boxes) addBox(mb, mn, mx, tilesOf(t)); const r = mb.result(); return makeVAO(gl, r.verts, r.idx); };
    const M = {};
    // everything is built spinning around +z, centred on the origin
    M.axle = mk([[[-0.13, -0.13, -0.5], [0.13, 0.13, 0.5], { side: 'axle', top: 'axle_end', bottom: 'axle_end' }]]);
    const sail = [];
    sail.push([[-0.22, -0.22, -0.32], [0.22, 0.22, 0.25], 'axle_end']);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a);
      // spar along the arm, cloth beside it (built for k=0 then rotated by the draw)
    }
    M.hub = mk(sail);
    M.spar = mk([[[-0.07, 0.2, -0.05], [0.07, 4.2, 0.05], 'axle']]);
    M.cloth = mk([[[0.07, 0.9, -0.02], [1.05, 4.1, 0.02], 'sail']]);
    M.wheelHub = mk([[[-0.25, -0.25, -0.45], [0.25, 0.25, 0.45], 'axle_end']]);
    M.spoke = mk([[[-0.06, 0.2, -0.06], [0.06, 1.35, 0.06], 'axle']]);
    M.paddle = mk([[[-0.32, 1.25, -0.42], [0.32, 1.5, 0.42], 'planks']]);
    M.rim = mk([[[-0.5, 1.32, -0.45], [0.5, 1.42, -0.37], 'axle'], [[-0.5, 1.32, 0.37], [0.5, 1.42, 0.45], 'axle']]);
    M.blade = mk([[[-0.42, -0.02, -0.42], [0.42, 0.02, 0.42], 'saw_blade']]);
    M.runner = mk([[[-0.4, 0, -0.4], [0.4, 0.22, 0.4], { side: 'millstone_side', top: 'millstone_top', bottom: 'millstone_top' }]]);
    this.meshes = M;
  }
  draws(out, cam) {
    const g = this.g, gl = g.renderer.gl;
    if (!this.meshes) this.buildMeshes(gl);
    const M = this.meshes, w = g.world;
    for (const n of this.nodes.values()) {
      if (Math.abs(n.x - cam.x) > 64 || Math.abs(n.z - cam.z) > 64) continue;
      const ang = n.comp ? n.comp.angle : 0;
      const l = w.getLight(n.x, n.y, n.z), light = [l >> 4, l & 15];
      const base = Mat4.create();
      Mat4.translate(base, 0.5, 0.5, 0.5);
      // turn +z onto the block's axis
      if (n.axis === 1) Mat4.rotateY(base, Math.PI / 2);
      else if (n.axis === 0) Mat4.rotateX(base, Math.PI / 2);
      const put = (mesh, m) => out.push({ mesh, m, px: n.x, py: n.y, pz: n.z, light });
      if (n.kind === 'axle') { const m = Mat4.create(); m.set(base); Mat4.rotateZ(m, ang); put(M.axle, m); }
      else if (n.kind === 'windmill') {
        const m = Mat4.create(); m.set(base); Mat4.rotateZ(m, ang); put(M.hub, m);
        for (let k = 0; k < 4; k++) {
          const a = Mat4.create(); a.set(m); Mat4.rotateZ(a, k * Math.PI / 2);
          put(M.spar, a); out.push({ mesh: M.cloth, m: a, px: n.x, py: n.y, pz: n.z, light, noCull: true });
        }
      } else if (n.kind === 'waterwheel') {
        const m = Mat4.create(); m.set(base); Mat4.rotateZ(m, -ang); put(M.wheelHub, m);
        for (let k = 0; k < 8; k++) { const a = Mat4.create(); a.set(m); Mat4.rotateZ(a, k * Math.PI / 4); put(M.spoke, a); put(M.paddle, a); put(M.rim, a); }
      } else if (n.kind === 'millstone') {
        const m = Mat4.create(); Mat4.translate(m, 0.5, 1, 0.5); Mat4.rotateY(m, ang * 0.6); put(M.runner, m);
      } else if (n.kind === 'sawmill') {
        const m = Mat4.create(); Mat4.translate(m, 0.5, 1.02, 0.5); Mat4.rotateY(m, ang * 3); put(M.blade, m);
      }
    }
  }
}
