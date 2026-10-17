// ---------------------------------------------------------------------------
// game/fauna.js — ambient wildlife: butterflies by day, fireflies by night,
// songbirds that perch in trees and scatter when you come close, and fish in
// lakes and rivers. Purely atmospheric: each player's game spawns its own,
// they are never saved and never sent over the network.
// ---------------------------------------------------------------------------

class Fauna {
  constructor(game) { this.g = game; this.list = []; this.t = 0; this.meshes = null; }
  init(gl) {
    const M = {};
    const box = (tile, parts) => {
      const mb = new MeshBuilder(64);
      for (const [mn, mx, t] of parts) addBox(mb, mn, mx, tilesOf(t || tile));
      const r = mb.result(); return makeVAO(gl, r.verts, r.idx);
    };
    for (const c of ['bird_blue', 'bird_red', 'bird_brown']) {
      M[c] = {
        body: box(c, [[[-0.07, -0.06, -0.12], [0.07, 0.07, 0.1]], [[-0.055, 0.03, -0.21], [0.055, 0.13, -0.1]], [[-0.02, 0.06, -0.27], [0.02, 0.09, -0.21], 'beak'], [[-0.05, 0.0, 0.1], [0.05, 0.02, 0.22]]]),
        wingL: box(c, [[[-0.22, 0, -0.08], [0, 0.015, 0.08]]]),
        wingR: box(c, [[[0, 0, -0.08], [0.22, 0.015, 0.08]]]),
      };
    }
    for (const c of ['butterfly_orange', 'butterfly_blue', 'butterfly_yellow', 'butterfly_white']) {
      const uv = tileUV(ATLAS.tile[c]), um = (uv[0] + uv[2]) / 2;
      const wing = (x0, x1, u0, u1) => {
        const mb = new MeshBuilder(8);
        const a = mb.vert(x0, 0, 0.5, u0, uv[3], 255, 0, 255), b = mb.vert(x1, 0, 0.5, u1, uv[3], 255, 0, 255);
        const cc = mb.vert(x1, 0, -0.5, u1, uv[1], 255, 0, 255), d = mb.vert(x0, 0, -0.5, u0, uv[1], 255, 0, 255);
        mb.quad(a, b, cc, d, false); mb.quad(b, a, d, cc, false);
        const r = mb.result(); return makeVAO(gl, r.verts, r.idx);
      };
      // the painted texture is a pair of wings seen from above, body at the right edge
      M[c] = { wingL: wing(-0.5, 0, uv[0], um), wingR: wing(0, 0.5, um, uv[0]) };
    }
    for (const c of ['fish_koi', 'fish_silver']) {
      M[c] = { body: box(c, [[[-0.05, -0.06, -0.16], [0.05, 0.06, 0.12]]]), tail: box(c, [[[-0.012, -0.08, 0], [0.012, 0.08, 0.13]]]) };
    }
    this.meshes = M;
  }
  clear() { this.list = []; }
  count(type) { let n = 0; for (const c of this.list) if (c.type === type) n++; return n; }

  update(dt) {
    const g = this.g;
    if (!this.meshes) this.init(g.renderer.gl);
    const watchers = g.locals.map(l => l.player).filter(p => !p.dead);
    if (!watchers.length) return;
    this.t += dt;
    if (this.t > 1) { this.t = 0; this.spawn(watchers[Math.floor(Math.random() * watchers.length)]); }
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const c = L[i];
      c.age += dt;
      let near = Infinity, np = null;
      for (const p of watchers) { const d = Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z); if (d < near) { near = d; np = p; } }
      if (near > 64 || c.age > c.life) { L.splice(i, 1); continue; }
      this['tick_' + c.kind](c, dt, near, np);
    }
  }
  surfaceAt(x, z, fromY) {
    const w = this.g.world;
    for (let y = Math.min(CH - 2, fromY); y > 1; y--) {
      const id = w.getBlock(x, y, z);
      if (id === 0 || BLOCKS[id].render === RENDER.CROSS || (!T_SOLID[id] && !T_LIQUID[id] && !BLOCKS[id].isLeaves)) continue;
      return { y: y + 1, id };
    }
    return null;
  }
  spawn(p) {
    const g = this.g, w = g.world, day = g.env.day, r = Math.random;
    if (g.dim !== 0 && g.dim !== 2) return;
    const ring = (a, b) => { const ang = r() * TAU, d = a + r() * (b - a); return [Math.floor(p.x + Math.cos(ang) * d), Math.floor(p.z + Math.sin(ang) * d)]; };
    // butterflies over flowers and grass on bright days
    if (day > 0.6 && this.count('butterfly') < 10 && r() < 0.5) {
      const [x, z] = ring(8, 26);
      if (w.isLoaded(x, z)) {
        const s = this.surfaceAt(x, z, Math.floor(p.y) + 20);
        if (s && (s.id === B.grass || s.id === B.sky_grass) && Math.abs(s.y - p.y) < 20) {
          const kinds = ['butterfly_orange', 'butterfly_blue', 'butterfly_yellow', 'butterfly_white'];
          const n = 1 + Math.floor(r() * 3), kind = kinds[Math.floor(r() * kinds.length)];
          for (let i = 0; i < n; i++) this.list.push({ kind: 'butterfly', type: 'butterfly', tex: kind, x: x + r(), y: s.y + 0.8 + r() * 1.2, z: z + r(), hx: x, hy: s.y + 1.2, hz: z, vx: 0, vy: 0, vz: 0, yaw: r() * TAU, age: 0, life: 70 + r() * 80, tt: 0, flap: r() * 10 });
        }
      }
    }
    // fireflies in grassy places at night
    if (g.dim === 0 && day < 0.45 && this.count('firefly') < 36 && r() < 0.6) {
      const [x, z] = ring(6, 22);
      if (w.isLoaded(x, z)) {
        const s = this.surfaceAt(x, z, Math.floor(p.y) + 16);
        const col = g.world.gen.column(x, z);
        if (s && s.id === B.grass && col.temp > -0.3 && Math.abs(s.y - p.y) < 16) {
          const n = 4 + Math.floor(r() * 7);
          for (let i = 0; i < n; i++) this.list.push({ kind: 'firefly', type: 'firefly', x: x + r() * 4 - 2, y: s.y + 0.4 + r() * 2.2, z: z + r() * 4 - 2, vx: 0, vy: 0, vz: 0, age: 0, life: 50 + r() * 60, ph: r() * TAU, hy: s.y + 1.2 });
        }
      }
    }
    // songbirds perched in tree tops and meadows
    if (day > 0.35 && this.count('bird') < 14 && r() < 0.3) {
      const [x, z] = ring(18, 40);
      if (w.isLoaded(x, z)) {
        const s = this.surfaceAt(x, z, Math.floor(p.y) + 30);
        if (s && (BLOCKS[s.id].isLeaves || s.id === B.grass || s.id === B.sky_grass) && Math.abs(s.y - p.y) < 30) {
          const kinds = ['bird_blue', 'bird_red', 'bird_brown'];
          const kind = kinds[Math.floor(r() * kinds.length)], n = 2 + Math.floor(r() * 4);
          for (let i = 0; i < n; i++) {
            const bx = x + Math.floor(r() * 3) - 1, bz = z + Math.floor(r() * 3) - 1;
            const ss = this.surfaceAt(bx, bz, s.y + 4) || s;
            this.list.push({ kind: 'bird', type: 'bird', tex: kind, x: bx + 0.5, y: ss.y, z: bz + 0.5, vx: 0, vy: 0, vz: 0, yaw: r() * TAU, age: 0, life: 300, state: 'perch', tt: r() * 2, flap: 0, peck: 0 });
          }
        }
      }
    }
    // fish in open water
    if (g.dim === 0 && this.count('fish') < 10 && r() < 0.4) {
      const [x, z] = ring(8, 28);
      if (w.isLoaded(x, z)) {
        for (let y = Math.min(SEA + 2, Math.floor(p.y) + 10); y > 4; y--) {
          if (T_LIQUID[w.getBlock(x, y, z)] === 1 && T_LIQUID[w.getBlock(x, y - 1, z)] === 1) {
            const kind = r() < 0.4 ? 'fish_koi' : 'fish_silver';
            for (let i = 0, n = 1 + Math.floor(r() * 3); i < n; i++) this.list.push({ kind: 'fish', type: 'fish', tex: kind, x: x + 0.5, y: y - 0.3, z: z + 0.5, vx: 0, vy: 0, vz: 0, yaw: r() * TAU, age: 0, life: 200, tt: 0, wig: r() * 10 });
            break;
          }
        }
      }
    }
  }

  // ---- behaviours ------------------------------------------------------------------
  steer(c, tx, ty, tz, speed, dt, k = 2) {
    const dx = tx - c.x, dy = ty - c.y, dz = tz - c.z, d = Math.hypot(dx, dy, dz) || 1;
    c.vx += (dx / d * speed - c.vx) * Math.min(1, dt * k);
    c.vy += (dy / d * speed - c.vy) * Math.min(1, dt * k);
    c.vz += (dz / d * speed - c.vz) * Math.min(1, dt * k);
    c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
    if (Math.hypot(c.vx, c.vz) > 0.05) c.yaw = Math.atan2(-c.vx, -c.vz);
  }
  tick_butterfly(c, dt) {
    c.tt -= dt; c.flap += dt * 18;
    if (c.tt <= 0) { c.tt = 1 + Math.random() * 2.5; c.gx = c.hx + Math.random() * 6 - 3; c.gy = c.hy + Math.random() * 1.6 - 0.3; c.gz = c.hz + Math.random() * 6 - 3; }
    this.steer(c, c.gx, c.gy + Math.sin(c.age * 4) * 0.3, c.gz, 1.4, dt, 1.5);
    if (this.g.env.day < 0.45) c.life = Math.min(c.life, c.age + 5);
  }
  tick_firefly(c, dt) {
    c.ph += dt;
    c.vx += (Math.random() - 0.5) * dt * 1.2; c.vz += (Math.random() - 0.5) * dt * 1.2; c.vy += ((c.hy - c.y) * 0.3 + (Math.random() - 0.5)) * dt;
    c.vx *= 0.98; c.vy *= 0.97; c.vz *= 0.98;
    c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
    if (this.g.env.day > 0.55) c.life = Math.min(c.life, c.age + 3);
  }
  tick_bird(c, dt, near, np) {
    const g = this.g, w = g.world;
    const scare = np && near < (np.sneaking ? 3 : 7);
    if (c.state === 'perch') {
      c.vx = c.vz = 0;
      c.tt -= dt; c.peck = Math.max(0, c.peck - dt);
      if (c.tt <= 0) { c.tt = 0.8 + Math.random() * 2.5; if (Math.random() < 0.5) c.peck = 0.3; else c.yaw += (Math.random() - 0.5) * 2; if (Math.random() < 0.12) g.sfx.playAt('chirp', c.x, c.y, c.z, 30); }
      // keep resting on the surface
      if (!T_SOLID[w.getBlock(Math.floor(c.x), Math.floor(c.y - 0.1), Math.floor(c.z))] && !BLOCKS[w.getBlock(Math.floor(c.x), Math.floor(c.y - 0.1), Math.floor(c.z))].isLeaves) c.y -= dt * 2;
      if (scare) {
        // the whole flock takes off together
        const away = Math.atan2(c.x - np.x, c.z - np.z);
        for (const o of this.list) if (o.kind === 'bird' && o.state === 'perch' && Math.hypot(o.x - c.x, o.z - c.z) < 6) this.takeOff(o, away);
        g.sfx.playAt('flap', c.x, c.y, c.z, 24);
      }
    } else {
      c.flap += dt * 22;
      const dx = c.gx - c.x, dz = c.gz - c.z, dist = Math.hypot(dx, dz);
      const cruise = c.gy + Math.min(8, dist * 0.4);
      this.steer(c, c.gx, dist > 2 ? cruise : c.gy, c.gz, dist > 2 ? 6 : 2.5, dt, 1.6);
      if (dist < 0.6 && Math.abs(c.y - c.gy) < 0.6) { c.state = 'perch'; c.y = c.gy; c.tt = 1; }
      if (c.age - c.launched > 20) c.life = 0;
    }
  }
  takeOff(c, awayAng) {
    const w = this.g.world;
    c.state = 'fly'; c.launched = c.age;
    const ang = awayAng + (Math.random() - 0.5) * 1.2, d = 18 + Math.random() * 22;
    const gx = Math.floor(c.x + Math.sin(ang) * d), gz = Math.floor(c.z + Math.cos(ang) * d);
    const s = w.isLoaded(gx, gz) ? this.surfaceAt(gx, gz, Math.floor(c.y) + 25) : null;
    c.gx = gx + 0.5; c.gz = gz + 0.5; c.gy = s ? s.y : c.y + 6;
    if (!s) c.life = Math.min(c.life, c.age + 6);
  }
  tick_fish(c, dt, near, np) {
    const w = this.g.world;
    c.wig += dt * (near < 4 ? 30 : 10);
    c.tt -= dt;
    const inWater = (x, y, z) => T_LIQUID[w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))] === 1;
    if (c.tt <= 0 || (np && near < 4)) {
      c.tt = 1.5 + Math.random() * 3;
      for (let k = 0; k < 6; k++) {
        let ang = Math.random() * TAU;
        if (np && near < 4) ang = Math.atan2(c.x - np.x, c.z - np.z) + (Math.random() - 0.5);
        const gx = c.x + Math.sin(ang) * 3, gz = c.z + Math.cos(ang) * 3, gy = c.y + (Math.random() - 0.5);
        if (inWater(gx, gy, gz) && inWater(gx, gy + 0.3, gz)) { c.gx = gx; c.gy = gy; c.gz = gz; break; }
      }
    }
    if (c.gx === undefined) { c.gx = c.x; c.gy = c.y; c.gz = c.z; }
    this.steer(c, c.gx, c.gy, c.gz, np && near < 4 ? 3 : 1, dt, 3);
    if (!inWater(c.x, c.y, c.z)) { c.y -= dt; if (!inWater(c.x, c.y, c.z)) c.life = 0; }
  }

  // ---- drawing --------------------------------------------------------------------
  draws(out, glows) {
    const w = this.g.world, M = this.meshes;
    if (!M) return;
    for (const c of this.list) {
      const l = w.getLight(Math.floor(c.x), Math.floor(c.y), Math.floor(c.z)), light = [l >> 4, l & 15];
      if (c.kind === 'firefly') {
        const b = 0.5 + 0.5 * Math.sin(c.ph * 3.1 + Math.sin(c.ph * 1.3) * 2);
        if (b > 0.25) glows.push({ x: c.x, y: c.y, z: c.z, size: 0.05 + b * 0.06, uv: tileUV(ATLAS.tile.firefly), light: 0xFF });
        continue;
      }
      const base = Mat4.create(); Mat4.rotateY(base, c.yaw);
      if (c.kind === 'butterfly') {
        const f = Math.sin(c.flap) * 1.1;
        for (const [mesh, s] of [[M[c.tex].wingL, -1], [M[c.tex].wingR, 1]]) {
          const m = Mat4.create(); m.set(base); Mat4.scale(m, 0.22, 0.22, 0.22); Mat4.rotateZ(m, s * f);
          out.push({ mesh, m, px: c.x, py: c.y, pz: c.z, light, noCull: true });
        }
      } else if (c.kind === 'bird') {
        const B2 = M[c.tex];
        const m = Mat4.create(); m.set(base); if (c.peck > 0) Mat4.rotateX(m, -0.5);
        out.push({ mesh: B2.body, m, px: c.x, py: c.y + 0.06, pz: c.z, light });
        const f = c.state === 'fly' ? Math.sin(c.flap) * 1.0 : 0.1;
        for (const [mesh, s, ox] of [[B2.wingL, 1, -0.06], [B2.wingR, -1, 0.06]]) {
          const wm = Mat4.create(); wm.set(base); Mat4.translate(wm, ox, 0.04, 0); Mat4.rotateZ(wm, s * f);
          out.push({ mesh, m: wm, px: c.x, py: c.y + 0.06, pz: c.z, light });
        }
      } else if (c.kind === 'fish') {
        const F2 = M[c.tex];
        out.push({ mesh: F2.body, m: base, px: c.x, py: c.y, pz: c.z, light });
        const tm = Mat4.create(); tm.set(base); Mat4.translate(tm, 0, 0, 0.12); Mat4.rotateY(tm, Math.sin(c.wig) * 0.5);
        out.push({ mesh: F2.tail, m: tm, px: c.x, py: c.y, pz: c.z, light });
      }
    }
  }
}
