// ---------------------------------------------------------------------------
// game/rsplace.js — placing and using redstone parts, rails and minecarts.
//
// Levers and buttons go on floors, ceilings and walls; repeaters and
// comparators point the way you face; pistons and dispensers face you;
// observers look the way you look; hoppers spout into whatever you clicked.
// Right click a repeater to change its delay, a comparator to switch it to
// subtract, a daylight detector to invert it.
// ---------------------------------------------------------------------------

Object.assign(LocalPlayer.prototype, {
  // Six-way direction the player is looking: 0 down, 1 up, or N/E/S/W.
  lookDir6() {
    const [, dy] = this.player.look();
    if (dy < -0.72) return 0;
    if (dy > 0.72) return 1;
    return H2D6[this.lookDir()];
  },
  // Can dust, plates, rails and repeaters sit on the block at (x,y,z)?
  rsFloorOK(x, y, z, sink) {
    const w = this.g.world, id = w.getBlock(x, y, z), k = T_SHAPE[id], m = w.getMeta(x, y, z);
    if (!T_SOLID[id]) return false;
    if (!k) return BLOCKS[id].render === RENDER.CUBE || BLOCKS[id].render === RENDER.CUTOUT;
    // on a bottom half slab too: it just sits half a block lower
    if (k === SHAPE.SLAB) return (m & 7) === 1 || (m & 7) === 6 || ((m & 7) === 0 && !!sink);
    if (k === SHAPE.STAIRS) return !!(m & 4);
    return id === B.hopper || k === SHAPE.SCAFFOLD;
  },
  // Placement rules (from placeSpecial). A placement, null to refuse, or undefined for the usual rules.
  placeRedstone(hit, bid) {
    const w = this.g.world, d = BLOCKS[bid], r = T_RS[bid];
    const [x, y, z] = this.placeTarget(hit);
    const look = this.lookDir();
    const floor = () => { if (this.rsFloorOK(x, y - 1, z, T_SINK[bid])) return true; this.toast('This needs solid ground under it', ''); return false; };
    if (d.rail) return floor() ? { x, y, z, meta: railShapeFor(w, x, y, z, bid, look) } : null;
    if (d.tripwire) return floor() ? { x, y, z, meta: 0 } : null;
    switch (r) {
      case RS.WIRE: case RS.PLATE: return floor() ? { x, y, z, meta: 0 } : null;
      case RS.REPEATER: case RS.COMPARATOR: return floor() ? { x, y, z, meta: look } : null;
      case RS.LEVER: case RS.BUTTON: {
        let meta;
        if (hit.ny === 1) meta = 0;
        else if (hit.ny === -1) meta = 1;
        else meta = 2 + dirOf(-hit.nx, -hit.nz);
        const s = leverSup(meta), sid = w.getBlock(x + D6X[s], y + D6Y[s], z + D6Z[s]);
        if (!T_SOLID[sid] || (T_SHAPE[sid] && T_SHAPE[sid] !== SHAPE.SLAB && T_SHAPE[sid] !== SHAPE.STAIRS)) { this.toast('Fix it to a solid block', ''); return null; }
        if (meta < 2 && (look & 1)) meta |= 16;
        return { x, y, z, meta };
      }
      case RS.HOOK: {
        if (hit.ny !== 0) { this.toast('Tripwire hooks go on the side of a block', ''); return null; }
        const f = dirOf(-hit.nx, -hit.nz);
        if (!T_SOLID[w.getBlock(x + DIRX[f], y, z + DIRZ[f])]) return null;
        return { x, y, z, meta: f };
      }
      case RS.OBSERVER: return { x, y, z, meta: this.lookDir6() };
      case RS.PISTON: case RS.DISPENSER: case RS.DROPPER: return { x, y, z, meta: OPP6[this.lookDir6()] };
      case RS.HOPPER: return { x, y, z, meta: hit.ny !== 0 ? 0 : H2D6[dirOf(-hit.nx, -hit.nz)] };
      case RS.DAYLIGHT: return { x, y, z, meta: 0 };
    }
    return undefined;
  },
  // Right click on a redstone part. True when it did something.
  useRedstone(hit, held, def) {
    const g = this.g, w = g.world, { x, y, z } = hit, id = hit.id, b = BLOCKS[id], m = w.getMeta(x, y, z), r = T_RS[id];
    if (id === B.redstone_ore) w.setBlock(x, y, z, B.redstone_ore_lit, 0);
    // holding a block and sneaking: place against it instead
    if (this.player.sneaking && def && def.block) return false;
    switch (r) {
      case RS.LEVER:
        w.setBlock(x, y, z, id, m ^ 8);
        g.sfx.playAt(m & 8 ? 'click_off' : 'click', x, y, z, 16); this.swingArm(); return true;
      case RS.BUTTON:
        if (!(m & 8)) { w.setBlock(x, y, z, id, m | 8); g.rs.schedule(x, y, z, b.wooden ? 30 : 20, 'button'); g.sfx.playAt('click', x, y, z, 16); }
        this.swingArm(); return true;
      case RS.REPEATER:
        w.setBlock(x, y, z, id, (m & ~12) | ((((m >> 2) & 3) + 1) & 3) << 2);
        g.sfx.playAt('tick', x, y, z, 12); this.swingArm(); return true;
      case RS.COMPARATOR:
        w.setBlock(x, y, z, id, m ^ 4);
        g.sfx.playAt(m & 4 ? 'click_off' : 'click', x, y, z, 12); this.swingArm(); return true;
      case RS.DAYLIGHT:
        w.setBlock(x, y, z, id, m ^ 16); g.rs.daylightTick(x, y, z, id, m ^ 16);
        g.sfx.playAt('click', x, y, z, 12); this.swingArm(); return true;
      case RS.HOPPER: case RS.DISPENSER: case RS.DROPPER:
        this.swingArm(); g.sfx.play('chest'); this.openInventory('container', { pos: [x, y, z] }); return true;
    }
    if ((id === B.iron_door || id === B.iron_trapdoor) && !g.creative) { this.toast('Iron doors open with redstone — try a button or lever beside it', ''); return true; }
    return false;
  },
  // A minecart item used on a rail.
  placeCartItem(def, held, hit) {
    const g = this.g;
    if (!hit || !BLOCKS[hit.id].rail) { this.toast('Set a minecart on a rail', ''); return; }
    if (g.cartAt(hit.x, hit.y, hit.z)) return;
    const c = g.placeCart(def.cart, hit.x, hit.y, hit.z, 0);
    if (!c) return;
    c.yaw = this.player.yaw;
    if (!g.creative) { held.n--; if (held.n <= 0) this.player.inv.held = null; }
    this.swingArm();
  },
});

// Redstone ore glows for a while after it's touched, then fades.
Object.assign(Game.prototype, {
  oreFade(x, y, z, rnd) { if (rnd() < 0.15) this.world.setBlock(x, y, z, B.redstone_ore, 0); },
  // An arrow hit a target block: a signal that's stronger the nearer the middle.
  targetHit(x, y, z, hx, hy, hz) {
    const w = this.world, id = w.getBlock(x, y, z);
    if (T_RS[id] !== RS.TARGET) return;
    const fx = hx - x, fy = hy - y, fz = hz - z;
    // which face it went in by: the coordinate nearest an edge
    const ex = Math.min(fx, 1 - fx), ey = Math.min(fy, 1 - fy), ez = Math.min(fz, 1 - fz);
    let a, b2;
    if (ex <= ey && ex <= ez) { a = fy; b2 = fz; } else if (ey <= ez) { a = fx; b2 = fz; } else { a = fx; b2 = fy; }
    const d = Math.max(Math.abs(a - 0.5), Math.abs(b2 - 0.5));
    const p = clamp(Math.ceil(15 * (1 - d * 2)), 1, 15);
    w.setBlock(x, y, z, id, (w.getMeta(x, y, z) & ~15) | p, RSO);
    this.rs.sched.delete(posKey(x, y, z));
    this.rs.schedule(x, y, z, 20, 'target');
    this.sfx.playAt('click', x, y, z, 24);
  },
});
