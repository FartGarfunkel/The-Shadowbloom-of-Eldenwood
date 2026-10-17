// ---------------------------------------------------------------------------
// game/redstone.js — redstone circuits.
//
// Works the way Minecraft Java's does, at 20 game ticks a second (a redstone
// tick is two game ticks):
//  * Power runs 0-15. Dust loses one level per block; repeaters restore 15.
//  * A solid block a lever or button is fixed to, a block above a torch, a
//    block under a pressure plate, or a block a repeater points into is
//    "strongly" powered and feeds dust beside it. Dust running into or over a
//    block only "weakly" powers it: enough for lamps, pistons, doors and torches,
//    not enough to feed more dust.
//  * Torches go out a tick after the block they hang on is powered.
//  * Repeaters wait 1-4 ticks, stretch short pulses, and lock when another
//    repeater powers their side. Comparators compare or subtract, and read how
//    full a chest, hopper, furnace, composter or cake is.
//  * Observers give a one-tick pulse when the block they look at changes.
// Things that react: lamps, copper bulbs, pistons, dispensers, droppers,
// hoppers, note blocks, bells, TNT, doors, trapdoors, gates and powered rails.
//
// Only the host runs circuits; guests see the results as ordinary block changes.
// ---------------------------------------------------------------------------

const TORCH_SUP = [0, 4, 5, 2, 3];          // torch meta -> six-way side of the block it hangs on
const RSO = { noFluid: true };              // setBlock options for circuit changes
// Components that need looking at on a timer: 1 hopper, 2 daylight detector,
// 3 pressure plate, 4 tripwire hook, 5 detector rail.
const RS_TICKER = new Uint8Array(MAX_BLOCKS);
for (const b of BLOCKS) {
  const r = T_RS[b.id];
  RS_TICKER[b.id] = r === RS.HOPPER ? 1 : r === RS.DAYLIGHT ? 2 : r === RS.PLATE ? 3 : r === RS.HOOK ? 4 : r === RS.DRAIL ? 5 : 0;
}
function leverSup(m) { const k = m & 7; return k === 0 ? 0 : k === 1 ? 1 : H2D6[(k - 2) & 3]; }
function hookSup(m) { return H2D6[m & 3]; }
// Blocks that a piston can't move at all, and blocks it breaks instead of moving.
function pistonImmovable(id, w, x, y, z) {
  const b = BLOCKS[id];
  if (b.hardness < 0 || b.hardness >= 40 || T_PORTAL[id] || b.movingBlock || b.pistonHead || b.extended || b.mech) return true;
  if (b.key === 'obsidian' || b.key === 'crying_obsidian' || b.key === 'respawn_anchor' || b.key === 'reinforced_deepslate') return true;
  if (w.getEntity(x, y, z)) return true;    // chests, furnaces, signs, jukeboxes... stay put
  return false;
}
function pistonBreaks(id) {
  const b = BLOCKS[id];
  if (!id) return false;
  return !T_SOLID[id] || T_REPLACEABLE[id] || T_LIQUID[id] || b.door || b.bed || b.double || b.render === RENDER.MODEL || b.render === RENDER.CROSS ||
    T_SHAPE[id] === SHAPE.CAKE || T_SHAPE[id] === SHAPE.CANDLE || b.key === 'pumpkin' || b.key === 'carved_pumpkin' || b.key === 'jack_o_lantern' || b.key === 'melon' ||
    b.key === 'cobweb';
}
const isSticky = (id) => id === B.slime_block || id === B.honey_block;

class Redstone {
  constructor(game) {
    this.g = game;
    this.pending = new Map();    // block updates waiting to be looked at
    this.sched = new Map();      // timed changes: key -> { x, y, z, t, kind, want }
    this.now = 0;
    this.burn = new Map();       // torch burn-out bookkeeping: key -> [times]
    this.plateSeen = new Map();  // pressure plates: key -> last tick something stood on them
    this.netDone = new Set();
    this.anims = new Map();      // piston -> its animation in progress
  }
  clear() { this.pending.clear(); this.sched.clear(); this.burn.clear(); this.plateSeen.clear(); this.anims.clear(); }
  get w() { return this.g.world; }

  // ---- bookkeeping ------------------------------------------------------------------------
  queue(x, y, z) { this.pending.set(posKey(x, y, z), [x, y, z]); }
  schedule(x, y, z, delay, kind, want) {
    const k = posKey(x, y, z), s = this.sched.get(k);
    if (s && s.kind === kind) return;
    this.sched.set(k, { x, y, z, t: this.now + delay, kind, want });
  }
  // Every block change in the world comes through here (see World.setBlock).
  changed(x, y, z, oldId, newId) {
    if (this.g.isGuest) return;
    const w = this.w;
    if (T_RS[newId]) this.queue(x, y, z);
    if (RS_TICKER[newId]) this.noteTicker(x, y, z);
    for (let d = 0; d < 6; d++) {
      const nx = x + D6X[d], ny = y + D6Y[d], nz = z + D6Z[d];
      const id = w.getBlock(nx, ny, nz);
      if (T_RS[id]) {
        this.queue(nx, ny, nz);
        if (T_RS[id] === RS.OBSERVER && (w.getMeta(nx, ny, nz) & 7) === OPP6[d]) this.observe(nx, ny, nz);
      }
      if (T_COND[id]) for (let e = 0; e < 6; e++) {
        const mx = nx + D6X[e], my = ny + D6Y[e], mz = nz + D6Z[e];
        if (T_RS[w.getBlock(mx, my, mz)]) this.queue(mx, my, mz);
      }
    }
  }
  // An observer saw something: pulse in a tick (unless it is already pulsing).
  observe(x, y, z) {
    const k = posKey(x, y, z), s = this.sched.get(k);
    if (s) return;
    this.sched.set(k, { x, y, z, t: this.now + 2, kind: 'observer', want: true });
  }

  // Called 20 times a second.
  step() {
    if (this.g.isGuest || !this.g.world) return;
    this.now++;
    if (this.sched.size) {
      const due = [];
      for (const s of this.sched.values()) if (s.t <= this.now) due.push(s);
      due.sort((a, b) => a.t - b.t);
      for (const s of due) { const k = posKey(s.x, s.y, s.z); if (this.sched.get(k) === s) this.sched.delete(k); this.fire(s); }
    }
    this.runTickers();
    for (let round = 0; round < 16 && this.pending.size; round++) {
      const list = [...this.pending.values()];
      this.pending.clear(); this.netDone.clear();
      for (const [x, y, z] of list) this.update(x, y, z);
    }
  }

  // ---- reading power -----------------------------------------------------------------------
  dustArms(x, y, z) {
    const w = this.w;
    const c = wireConnects((dx, dy, dz) => w.getBlock(x + dx, y + dy, z + dz), (dx, dy, dz) => w.getMeta(x + dx, y + dy, z + dz), [0, 0, 0, 0]);
    const arms = [c[0] > 0, c[1] > 0, c[2] > 0, c[3] > 0];
    const n = (arms[0] ? 1 : 0) + (arms[1] ? 1 : 0) + (arms[2] ? 1 : 0) + (arms[3] ? 1 : 0);
    if (n === 0) arms.fill(true);
    else if (n === 1) for (let h = 0; h < 4; h++) if (c[h]) arms[(h + 2) & 3] = true;
    return arms;
  }
  // Power the component at (x,y,z) gives its neighbour in direction d.
  emit(x, y, z, id, m, d) {
    switch (T_RS[id]) {
      case RS.BLOCK: return 15;
      case RS.LEVER: case RS.BUTTON: return m & 8 ? 15 : 0;
      case RS.PLATE: case RS.DAYLIGHT: case RS.TARGET: return m & 15;
      case RS.TORCH: return d === TORCH_SUP[m & 7] ? 0 : 15;
      case RS.REPEATER: return (m & 16) && d === H2D6[m & 3] ? 15 : 0;
      case RS.COMPARATOR: return d === H2D6[m & 3] ? (m >> 4) & 15 : 0;
      case RS.OBSERVER: return (m & 8) && d === OPP6[m & 7] ? 15 : 0;
      case RS.DRAIL: case RS.HOOK: return m & 8 ? 15 : 0;
      case RS.WIRE: {
        const p = m & 15;
        if (!p || d === 1) return 0;
        if (d === 0) return p;
        return this.dustArms(x, y, z)[D62H[d]] ? p : 0;
      }
    }
    return 0;
  }
  // Strong power the component gives the solid block beside it in direction d.
  strong(x, y, z, id, m, d) {
    switch (T_RS[id]) {
      case RS.LEVER: case RS.BUTTON: return (m & 8) && d === leverSup(m) ? 15 : 0;
      case RS.PLATE: return d === 0 ? m & 15 : 0;
      case RS.TORCH: return d === 1 && TORCH_SUP[m & 7] !== 1 ? 15 : 0;
      case RS.REPEATER: case RS.COMPARATOR: case RS.OBSERVER: return this.emit(x, y, z, id, m, d);
      case RS.DRAIL: return d === 0 && (m & 8) ? 15 : 0;
      case RS.HOOK: return (m & 8) && d === hookSup(m) ? 15 : 0;
    }
    return 0;
  }
  // How strongly a solid block is powered (strongOnly: what dust beside it can use).
  blockPower(x, y, z, strongOnly) {
    const w = this.w;
    let best = 0;
    for (let e = 0; e < 6; e++) {
      const nx = x + D6X[e], ny = y + D6Y[e], nz = z + D6Z[e], id = w.getBlock(nx, ny, nz);
      const r = T_RS[id]; if (!r) continue;
      const m = w.getMeta(nx, ny, nz), d = OPP6[e];
      let v = this.strong(nx, ny, nz, id, m, d);
      if (!strongOnly && r === RS.WIRE) v = Math.max(v, this.emit(nx, ny, nz, id, m, d));
      if (v > best) { best = v; if (best >= 15) return 15; }
    }
    return best;
  }
  // Power arriving at (x,y,z) from its neighbour in direction d.
  inputFrom(x, y, z, d) {
    const w = this.w, nx = x + D6X[d], ny = y + D6Y[d], nz = z + D6Z[d], id = w.getBlock(nx, ny, nz);
    let v = 0;
    if (T_RS[id]) v = this.emit(nx, ny, nz, id, w.getMeta(nx, ny, nz), OPP6[d]);
    if (T_COND[id] && v < 15) v = Math.max(v, this.blockPower(nx, ny, nz, false));
    return v;
  }
  // The strongest power reaching a component from any side (except `skip`).
  powerAt(x, y, z, skip = -1) {
    let best = 0;
    for (let d = 0; d < 6; d++) { if (d === skip) continue; const v = this.inputFrom(x, y, z, d); if (v > best) { best = v; if (best >= 15) break; } }
    return best;
  }
  // Is the block a torch hangs on powered?
  supportPowered(x, y, z) {
    const id = this.w.getBlock(x, y, z);
    if (T_RS[id] === RS.BLOCK) return true;
    return T_COND[id] ? this.blockPower(x, y, z, false) > 0 : false;
  }

  // ---- reacting ----------------------------------------------------------------------------
  update(x, y, z) {
    const w = this.w, id = w.getBlock(x, y, z), r = T_RS[id];
    if (!r) return;
    const m = w.getMeta(x, y, z);
    switch (r) {
      case RS.WIRE: this.updateWire(x, y, z); break;
      case RS.TORCH: case RS.TORCH_OFF: {
        const s = TORCH_SUP[m & 7];
        const on = !this.supportPowered(x + D6X[s], y + D6Y[s], z + D6Z[s]);
        if ((r === RS.TORCH) !== on) this.schedule(x, y, z, 2, 'torch');
        break;
      }
      case RS.REPEATER: {
        const locked = this.repeaterLocked(x, y, z, m);
        if (locked !== !!(m & 32)) { w.setBlock(x, y, z, id, locked ? m | 32 : m & ~32, RSO); return; }
        if (locked) return;
        const on = this.inputFrom(x, y, z, OPP6[H2D6[m & 3]]) > 0;
        if (on !== !!(m & 16)) this.schedule(x, y, z, 2 * (1 + ((m >> 2) & 3)), 'repeater', on);
        break;
      }
      case RS.COMPARATOR: {
        if (this.comparatorValue(x, y, z, m) !== ((m >> 4) & 15)) this.schedule(x, y, z, 2, 'comparator');
        break;
      }
      case RS.LAMP: {
        const on = this.powerAt(x, y, z) > 0;
        if (on && id === B.redstone_lamp) { this.sched.delete(posKey(x, y, z)); w.setBlock(x, y, z, B.redstone_lamp_on, m, RSO); }
        else if (!on && id === B.redstone_lamp_on) this.schedule(x, y, z, 4, 'lamp');
        break;
      }
      case RS.BULB: {
        const on = this.powerAt(x, y, z) > 0, was = !!(m & 0x20);
        if (on && !was) { w.setBlock(x, y, z, id === B.copper_bulb ? B.copper_bulb_lit : B.copper_bulb, m | 0x20, RSO); this.g.sfx.playAt('click', x, y, z, 16); }
        else if (!on && was) w.setBlock(x, y, z, id, m & ~0x20, RSO);
        break;
      }
      case RS.PISTON: {
        const ext = !!BLOCKS[id].extended;
        const on = this.powerAt(x, y, z, m & 7) > 0;
        if (on !== ext) this.schedule(x, y, z, 1, 'piston');
        break;
      }
      case RS.DISPENSER: case RS.DROPPER: {
        const on = this.powerAt(x, y, z) > 0, trig = !!(m & 8);
        if (on && !trig) { w.setBlock(x, y, z, id, m | 8, RSO); this.schedule(x, y, z, 4, 'dispense'); }
        else if (!on && trig) w.setBlock(x, y, z, id, m & ~8, RSO);
        break;
      }
      case RS.HOPPER: {
        const on = this.powerAt(x, y, z) > 0;
        if (on !== !!(m & 8)) w.setBlock(x, y, z, id, on ? m | 8 : m & ~8, RSO);
        break;
      }
      case RS.NOTE: case RS.BELL: {
        const on = this.powerAt(x, y, z) > 0, was = !!(m & 0x20);
        if (on && !was) {
          w.setBlock(x, y, z, id, m | 0x20, RSO);
          if (r === RS.NOTE) { const n = m & 31; this.g.sfx.note(n, w.getBlock(x, y - 1, z)); this.g.particleNote(x, y, z, n); }
          else this.g.sfx.playAt('bell', x, y, z, 48);
        } else if (!on && was) w.setBlock(x, y, z, id, m & ~0x20, RSO);
        break;
      }
      case RS.TNT: if (this.powerAt(x, y, z) > 0) { w.setBlock(x, y, z, 0); this.g.primeTNT(x, y, z, 4); } break;
      case RS.DOOR: {
        const lower = m & 16 ? y - 1 : y;
        if (w.getBlock(x, lower, z) !== id || w.getBlock(x, lower + 1, z) !== id) break;
        const ml = w.getMeta(x, lower, z);
        const on = this.powerAt(x, lower, z) > 0 || this.powerAt(x, lower + 1, z) > 0;
        if (on !== !!(ml & 0x20)) {
          const nm = (ml & ~(4 | 0x20 | 16)) | (on ? 4 | 0x20 : 0);
          w.setBlock(x, lower, z, id, nm, RSO); w.setBlock(x, lower + 1, z, id, nm | 16, RSO);
          if (!!(ml & 4) !== on) this.g.sfx.playAt(doorSound(BLOCKS[id], on), x, y, z);
        }
        break;
      }
      case RS.TRAPDOOR: case RS.GATE: {
        const on = this.powerAt(x, y, z) > 0;
        if (on !== !!(m & 0x20)) {
          w.setBlock(x, y, z, id, (m & ~(4 | 0x20)) | (on ? 4 | 0x20 : 0), RSO);
          if (!!(m & 4) !== on) this.g.sfx.playAt(doorSound(BLOCKS[id], on), x, y, z);
        }
        break;
      }
      case RS.PRAIL: {
        const on = this.railPowered(x, y, z, id, m);
        if (on !== !!(m & 8)) w.setBlock(x, y, z, id, on ? m | 8 : m & ~8, RSO);
        break;
      }
    }
  }
  // Timed changes come due.
  fire(s) {
    const w = this.w, { x, y, z } = s, id = w.getBlock(x, y, z), m = w.getMeta(x, y, z), r = T_RS[id];
    switch (s.kind) {
      case 'torch': {
        if (r !== RS.TORCH && r !== RS.TORCH_OFF) return;
        const sup = TORCH_SUP[m & 7];
        const on = !this.supportPowered(x + D6X[sup], y + D6Y[sup], z + D6Z[sup]);
        if (on && r === RS.TORCH_OFF) {
          // burnt out: stays dark for a while
          const hist = this.burn.get(posKey(x, y, z));
          if (hist && hist.length >= 8 && this.now - hist[hist.length - 8] < 60) { this.schedule(x, y, z, 160, 'torch'); return; }
          w.setBlock(x, y, z, B.redstone_torch, m, RSO);
        } else if (!on && r === RS.TORCH) {
          const k = posKey(x, y, z), hist = this.burn.get(k) || [];
          hist.push(this.now); while (hist.length > 10) hist.shift(); this.burn.set(k, hist);
          w.setBlock(x, y, z, B.redstone_torch_off, m, RSO);
          if (hist.length >= 8 && this.now - hist[hist.length - 8] < 60) {
            this.g.sfx.playAt('fizz', x, y, z, 16);
            this.g.burst(x + 0.5, y + 0.7, z + 0.5, 'white', 5, 0.3, 0.1);
          }
        }
        break;
      }
      case 'repeater': {
        if (r !== RS.REPEATER || (m & 32)) return;
        const nm = s.want ? m | 16 : m & ~16;
        if (nm !== m) w.setBlock(x, y, z, id, nm, RSO);
        this.queue(x, y, z);
        break;
      }
      case 'comparator': {
        if (r !== RS.COMPARATOR) return;
        const v = this.comparatorValue(x, y, z, m);
        const nm = (m & 7) | (v > 0 ? 8 : 0) | (v << 4);
        if (nm !== m) w.setBlock(x, y, z, id, nm, RSO);
        break;
      }
      case 'lamp': if (id === B.redstone_lamp_on && this.powerAt(x, y, z) === 0) w.setBlock(x, y, z, B.redstone_lamp, m, RSO); break;
      case 'observer': {
        if (r !== RS.OBSERVER) return;
        if (s.want) { w.setBlock(x, y, z, id, m | 8, RSO); this.sched.set(posKey(x, y, z), { x, y, z, t: this.now + 2, kind: 'observer', want: false }); }
        else w.setBlock(x, y, z, id, m & ~8, RSO);
        break;
      }
      case 'button': if (r === RS.BUTTON && (m & 8)) { w.setBlock(x, y, z, id, m & ~8, RSO); this.g.sfx.playAt('click_off', x, y, z, 16); } break;
      case 'target': if (r === RS.TARGET) w.setBlock(x, y, z, id, m & ~15, RSO); break;
      case 'piston': if (r === RS.PISTON) this.pistonMove(x, y, z); break;
      case 'dispense': if (r === RS.DISPENSER || r === RS.DROPPER) this.dispense(x, y, z); break;
    }
  }

  // ---- dust ----------------------------------------------------------------------------------
  // Which dust cells this one joins (the same rules the mesher draws).
  wireLinks(x, y, z, out) {
    const w = this.w;
    out.length = 0;
    const upFree = !T_COND[w.getBlock(x, y + 1, z)];
    for (let h = 0; h < 4; h++) {
      const ax = x + DIRX[h], az = z + DIRZ[h];
      const side = w.getBlock(ax, y, az);
      if (T_RS[side] === RS.WIRE) out.push(ax, y, az);
      else {
        if (upFree && T_RS[w.getBlock(ax, y + 1, az)] === RS.WIRE) out.push(ax, y + 1, az);
        if (!T_COND[side] && T_RS[w.getBlock(ax, y - 1, az)] === RS.WIRE) out.push(ax, y - 1, az);
      }
    }
    return out;
  }
  // Power fed into one dust cell from outside the network.
  dustInput(x, y, z) {
    const w = this.w;
    let best = 0;
    for (let d = 0; d < 6; d++) {
      const nx = x + D6X[d], ny = y + D6Y[d], nz = z + D6Z[d], id = w.getBlock(nx, ny, nz), r = T_RS[id];
      if (r === RS.WIRE) continue;
      let v = 0;
      if (r) v = this.emit(nx, ny, nz, id, w.getMeta(nx, ny, nz), OPP6[d]);
      if (T_COND[id] && v < 15) v = Math.max(v, this.blockPower(nx, ny, nz, true));
      if (v > best) { best = v; if (best >= 15) break; }
    }
    return best;
  }
  // Work out the whole connected stretch of dust at once and set every cell.
  updateWire(x, y, z) {
    const k0 = posKey(x, y, z);
    if (this.netDone.has(k0)) return;
    const w = this.w;
    const cells = [], index = new Map(), links = [];
    const tmp = [];
    index.set(k0, 0); cells.push(x, y, z);
    for (let i = 0; i < cells.length / 3 && cells.length < 3 * 4096; i++) {
      const cx = cells[i * 3], cy = cells[i * 3 + 1], cz = cells[i * 3 + 2];
      this.wireLinks(cx, cy, cz, tmp);
      const ln = [];
      for (let j = 0; j < tmp.length; j += 3) {
        const k = posKey(tmp[j], tmp[j + 1], tmp[j + 2]);
        let n = index.get(k);
        if (n === undefined) { n = cells.length / 3; index.set(k, n); cells.push(tmp[j], tmp[j + 1], tmp[j + 2]); }
        ln.push(n);
      }
      links[i] = ln;
    }
    const N = cells.length / 3;
    const power = new Int8Array(N);
    const buckets = Array.from({ length: 16 }, () => []);
    for (let i = 0; i < N; i++) {
      this.netDone.add(posKey(cells[i * 3], cells[i * 3 + 1], cells[i * 3 + 2]));
      const v = this.dustInput(cells[i * 3], cells[i * 3 + 1], cells[i * 3 + 2]);
      power[i] = v; if (v > 0) buckets[v].push(i);
    }
    for (let v = 15; v > 1; v--) {
      for (const i of buckets[v]) {
        if (power[i] !== v) continue;
        for (const n of links[i] || []) if (power[n] < v - 1) { power[n] = v - 1; buckets[v - 1].push(n); }
      }
    }
    for (let i = 0; i < N; i++) {
      const cx = cells[i * 3], cy = cells[i * 3 + 1], cz = cells[i * 3 + 2];
      const m = w.getMeta(cx, cy, cz);
      if ((m & 15) !== power[i]) w.setBlock(cx, cy, cz, B.redstone_wire, (m & ~15) | power[i], RSO);
    }
  }

  // ---- repeaters and comparators -----------------------------------------------------------
  repeaterLocked(x, y, z, m) {
    const w = this.w, f = m & 3;
    for (const s of [H2D6[(f + 1) & 3], H2D6[(f + 3) & 3]]) {
      const nx = x + D6X[s], ny = y, nz = z + D6Z[s], id = w.getBlock(nx, ny, nz), r = T_RS[id];
      if (r !== RS.REPEATER && r !== RS.COMPARATOR) continue;
      if (this.emit(nx, ny, nz, id, w.getMeta(nx, ny, nz), OPP6[s]) > 0) return true;
    }
    return false;
  }
  sideInput(x, y, z, d) {
    const w = this.w, nx = x + D6X[d], nz = z + D6Z[d], id = w.getBlock(nx, y, nz), m = w.getMeta(nx, y, nz);
    switch (T_RS[id]) {
      case RS.WIRE: return m & 15;
      case RS.BLOCK: return 15;
      case RS.REPEATER: case RS.COMPARATOR: return this.emit(nx, y, nz, id, m, OPP6[d]);
    }
    return 0;
  }
  comparatorValue(x, y, z, m) {
    const w = this.w, f = m & 3, back = OPP6[H2D6[f]];
    let rear = this.inputFrom(x, y, z, back);
    const bx = x + D6X[back], by = y, bz = z + D6Z[back];
    const cv = this.measure(bx, by, bz);
    if (cv >= 0) rear = cv;
    else if (T_COND[w.getBlock(bx, by, bz)] && rear < 15) {
      const cv2 = this.measure(bx + D6X[back], by, bz + D6Z[back]);
      if (cv2 >= 0) rear = Math.max(rear, cv2);
    }
    const side = Math.max(this.sideInput(x, y, z, H2D6[(f + 1) & 3]), this.sideInput(x, y, z, H2D6[(f + 3) & 3]));
    if (m & 4) return Math.max(0, rear - side);
    return rear >= side ? rear : 0;
  }
  // What a comparator reads from a block: -1 when there's nothing to read.
  measure(x, y, z) {
    const w = this.w, id = w.getBlock(x, y, z), b = BLOCKS[id], m = w.getMeta(x, y, z);
    if (b.container || b.furnace) return fillSignal(this.inv(x, y, z).items);
    if (b.composter) return Math.min(8, m & 15);
    if (T_SHAPE[id] === SHAPE.CAKE) return 14 - 2 * (m & 7);
    if (b.cauldron) return m & 3;
    if (b.jukebox) { const e = w.getEntity(x, y, z); return e && e.disc ? 15 : 0; }
    if (b.hive) return ((m >> 2) & 3) * 5;
    if (b.frame) { const e = w.getEntity(x, y, z); return e && e.item ? 1 + ((e.rot || 0) & 7) : 0; }
    if (T_RS[id] === RS.DRAIL) { const c = this.g.cartAt && this.g.cartAt(x, y, z); return c && c.items ? fillSignal(c.items) : -1; }
    return -1;
  }

  // ---- powered and activator rails ----------------------------------------------------------
  // Powered directly, or joined (along the track, through rails of the same kind) to one that is, within 8.
  railPowered(x, y, z, id, m) {
    if (this.powerAt(x, y, z) > 0) return true;
    const w = this.w;
    for (let end = 0; end < 2; end++) {
      let cx = x, cy = y, cz = z, cm = m, px = null, py = 0, pz = 0;
      let ex = RAIL_EXITS[railShape(id, cm)][end];
      for (let i = 0; i < 8; i++) {
        const nxt = this.railStep(cx, cy, cz, ex, id);
        if (!nxt) break;
        const [nx, ny, nz] = nxt;
        if (nx === px && ny === py && nz === pz) break;
        if (this.powerAt(nx, ny, nz) > 0) return true;
        px = cx; py = cy; pz = cz; cx = nx; cy = ny; cz = nz; cm = w.getMeta(cx, cy, cz);
        // carry on out of the far end
        const ends = RAIL_EXITS[railShape(id, cm)];
        const back0 = cx + ends[0][0] === px && cz + ends[0][2] === pz;
        ex = back0 ? ends[1] : ends[0];
      }
    }
    return false;
  }
  railStep(x, y, z, e, id) {
    const w = this.w, nx = x + e[0], nz = z + e[2];
    for (const ny of e[1] ? [y + 1] : [y, y - 1]) if (w.getBlock(nx, ny, nz) === id) return [nx, ny, nz];
    return null;
  }

  // ---- things that run on a timer ----------------------------------------------------------
  noteTicker(x, y, z) {
    const c = this.w.chunkAt(x >> 4, z >> 4);
    if (!c) return;
    if (!c.rsTick) this.scanTickers(c);
    c.rsTick.add(cidx(x & 15, y, z & 15));
  }
  scanTickers(c) {
    c.rsTick = new Set();
    const top = Math.min(c.maxY, CH);
    for (let i = 0, n = top << 8; i < n; i++) if (RS_TICKER[c.blocks[i]]) c.rsTick.add(i);
  }
  runTickers() {
    const g = this.g, w = this.w, t = this.now;
    if (t & 1) return;
    const centers = g.locals.map(l => l.player);
    if (!centers.length) return;
    let ents = null;
    for (const c of w.chunks.values()) {
      let near = false;
      for (const p of centers) if (Math.abs(c.cx - (Math.floor(p.x) >> 4)) <= 6 && Math.abs(c.cz - (Math.floor(p.z) >> 4)) <= 6) { near = true; break; }
      if (!near) continue;
      if (!c.rsTick) this.scanTickers(c);
      if (!c.rsTick.size) continue;
      for (const i of c.rsTick) {
        const id = c.blocks[i], kind = RS_TICKER[id];
        if (!kind) { c.rsTick.delete(i); continue; }
        const x = c.cx * 16 + (i & 15), z = c.cz * 16 + ((i >> 4) & 15), y = i >> 8, m = c.meta[i];
        if (kind === 1) { if (t % 8 === 0) this.hopperTick(x, y, z, id, m); continue; }
        if (kind === 2) { if (t % 20 === 0) this.daylightTick(x, y, z, id, m); continue; }
        if (!ents) ents = this.entityBoxes();
        if (kind === 3) this.plateTick(x, y, z, id, m, ents);
        else if (kind === 4) this.hookTick(x, y, z, id, m, ents);
        else if (kind === 5) this.detectorTick(x, y, z, id, m, ents);
      }
    }
  }
  // Everything that can stand on a plate or trip a wire: [x0,y0,z0,x1,y1,z1, kind].
  entityBoxes() {
    const out = [];
    for (const p of this.g.pawns()) { const q = p.player || p; if (q.dead) continue; out.push([q.x - 0.3, q.y, q.z - 0.3, q.x + 0.3, q.y + 1.8, q.z + 0.3, 'mob']); }
    for (const e of this.g.entities) {
      if (e.remove) continue;
      const kind = e instanceof Mob ? (e.alive ? 'mob' : null) : e instanceof DroppedItem ? 'item' : e.isCart ? 'cart' : e instanceof Arrow ? 'item' : null;
      if (!kind) continue;
      out.push([e.x - e.w, e.y, e.z - e.w, e.x + e.w, e.y + (e.h || 0.5), e.z + e.w, kind, e]);
    }
    return out;
  }
  countIn(ents, x0, y0, z0, x1, y1, z1, filter) {
    let n = 0;
    for (const b of ents) if (b[3] > x0 && b[0] < x1 && b[4] > y0 && b[1] < y1 && b[5] > z0 && b[2] < z1 && (!filter || filter(b[6]))) n++;
    return n;
  }
  plateTick(x, y, z, id, m, ents) {
    const kind = BLOCKS[id].plate;
    const n = this.countIn(ents, x + 1 / 16, y, z + 1 / 16, x + 15 / 16, y + 0.3, z + 15 / 16, kind === 'mobs' ? (k) => k === 'mob' : null);
    let p = 0;
    if (n > 0) p = kind === 'light' ? Math.min(15, n) : kind === 'heavy' ? Math.min(15, Math.ceil(n / 10)) : 15;
    const k = posKey(x, y, z), cur = m & 15;
    if (p > 0) this.plateSeen.set(k, this.now);
    // pressing takes effect at once; letting go waits half a second
    if (p > cur || (p < cur && this.now - (this.plateSeen.get(k) || 0) >= 10)) {
      this.w.setBlock(x, y, z, id, (m & ~15) | p, RSO);
      this.g.sfx.playAt(p > cur ? 'click' : 'click_off', x, y, z, 16);
    }
  }
  hookTick(x, y, z, id, m, ents) {
    const w = this.w, f = m & 3, h = (f + 2) & 3, dx = DIRX[h], dz = DIRZ[h];
    let strung = false, tripped = false;
    const wires = [];
    for (let i = 1; i <= 41; i++) {
      const cx = x + dx * i, cz = z + dz * i, cid = w.getBlock(cx, y, cz);
      if (BLOCKS[cid].tripwire) { wires.push(cx); wires.push(cz); continue; }
      if (T_RS[cid] === RS.HOOK && (w.getMeta(cx, y, cz) & 3) === h && wires.length) strung = true;
      break;
    }
    if (strung) for (let j = 0; j < wires.length; j += 2) {
      const cx = wires[j], cz = wires[j + 1];
      if (this.countIn(ents, cx, y, cz, cx + 1, y + 0.5, cz + 1)) { tripped = true; break; }
    }
    const nm = (m & ~12) | (strung ? 4 : 0) | (tripped ? 8 : 0);
    if (nm !== m) {
      w.setBlock(x, y, z, id, nm, RSO);
      if ((nm & 8) !== (m & 8)) this.g.sfx.playAt(tripped ? 'click' : 'click_off', x, y, z, 16);
      // the wire sags when it's tied off
      for (let j = 0; j < wires.length; j += 2) {
        const wm = w.getMeta(wires[j], y, wires[j + 1]), want = (wm & ~3) | (strung ? 2 : 0) | (tripped ? 1 : 0);
        if (wm !== want) w.setBlock(wires[j], y, wires[j + 1], B.tripwire, want, RSO);
      }
    }
  }
  detectorTick(x, y, z, id, m, ents) {
    const n = this.countIn(ents, x + 0.1, y, z + 0.1, x + 0.9, y + 0.9, z + 0.9, (k) => k === 'cart');
    const on = n > 0;
    if (on !== !!(m & 8)) this.w.setBlock(x, y, z, id, on ? m | 8 : m & ~8, RSO);
    else if (on) this.queueAround(x, y, z);   // comparators reading a cart's chest
  }
  queueAround(x, y, z) {
    for (let d = 0; d < 6; d++) { const nx = x + D6X[d], ny = y + D6Y[d], nz = z + D6Z[d]; if (T_RS[this.w.getBlock(nx, ny, nz)] === RS.COMPARATOR) this.queue(nx, ny, nz); }
  }
  daylightTick(x, y, z, id, m) {
    const g = this.g, w = this.w;
    let p = 0;
    if (g.dim === 0) {
      const sky = w.getLight(x, y + 1, z) >> 4;
      const sun = clamp(((g.env ? g.env.day : 1) - 0.2) / 0.8, 0, 1);
      p = Math.round(sky * (m & 16 ? 1 - sun : sun));
    }
    if (p !== (m & 15)) w.setBlock(x, y, z, id, (m & ~15) | p, RSO);
  }

  // ---- hoppers ----------------------------------------------------------------------------------
  // What a block holds that hoppers, droppers and comparators can reach.
  inv(x, y, z) {
    const w = this.w, id = w.getBlock(x, y, z), b = BLOCKS[id];
    if (b.container) {
      const n = b.container;
      const e = w.getEntity(x, y, z, () => ({ type: 'chest', items: new Array(n).fill(null) }));
      if (!e.items || e.items.length !== n) e.items = Object.assign(new Array(n).fill(null), e.items || []);
      return { x, y, z, items: e.items, kind: 'box' };
    }
    if (b.furnace) {
      const e = w.getEntity(x, y, z, () => ({ type: 'furnace', items: [null, null, null], burn: 0, burnMax: 0, cook: 0 }));
      e.items = e.items || [null, null, null];
      return { x, y, z, items: e.items, kind: 'furnace' };
    }
    if (b.composter) return { x, y, z, items: [], kind: 'composter' };
    const cart = this.g.cartAt ? this.g.cartAt(x, y, z, true) : null;
    if (cart) return { x, y, z, items: cart.items, kind: 'box', cart };
    return null;
  }
  // Slots an item can go into when it arrives from `from` (six-way, from the container's side).
  insertSlots(c, from, s) {
    if (c.kind === 'furnace') return from === 1 ? [0] : from === 0 ? [] : (fuelValue(s.id) > 0 ? [1] : []);
    return c.items.map((_, i) => i);
  }
  extractSlots(c, to) {
    if (c.kind === 'furnace') return to === 0 ? [2] : [];
    return c.items.map((_, i) => i);
  }
  // Put one of stack s into container c. Returns true when it went in.
  insertOne(c, from, s) {
    if (c.kind === 'composter') {
      const w = this.w, m = w.getMeta(c.x, c.y, c.z), lvl = m & 15, ch = compostChance(s.id);
      if (from !== 1 || !ch || lvl >= 7) return false;
      if (Math.random() < ch) w.setBlock(c.x, c.y, c.z, w.getBlock(c.x, c.y, c.z), lvl + 1 === 7 ? 8 : lvl + 1);
      return true;
    }
    const slots = this.insertSlots(c, from, s);
    for (const i of slots) { const t = c.items[i]; if (t && canMerge(t, s) && t.n < maxStackOf(t.id)) { t.n++; return true; } }
    for (const i of slots) if (!c.items[i]) { c.items[i] = Object.assign(cloneStack(s), { n: 1 }); return true; }
    return false;
  }
  changedInv(c) {
    if (c.cart) return;
    this.g.entityChanged(c.x, c.y, c.z);
    this.queueAround(c.x, c.y, c.z);
  }
  // Move one item from container a (reached through face `to`) into b (arriving from `from`).
  moveOne(a, to, b, from) {
    if (a.kind === 'composter') {
      const w = this.w, m = w.getMeta(a.x, a.y, a.z);
      if (to !== 0 || (m & 15) < 8) return false;
      if (!this.insertOne(b, from, mkStack('bone_meal', 1))) return false;
      w.setBlock(a.x, a.y, a.z, w.getBlock(a.x, a.y, a.z), 0);
      return true;
    }
    for (const i of this.extractSlots(a, to)) {
      const s = a.items[i]; if (!s) continue;
      if (this.insertOne(b, from, s)) { s.n--; if (s.n <= 0) a.items[i] = null; return true; }
    }
    return false;
  }
  hopperTick(x, y, z, id, m) {
    if (m & 8) return;   // locked by redstone
    const g = this.g, w = this.w;
    const me = this.inv(x, y, z); if (!me) return;
    let changed = false;
    // push out of the spout
    const sp = m & 7, out = sp === 1 ? 0 : sp;
    const dst = this.inv(x + D6X[out], y + D6Y[out], z + D6Z[out]);
    if (dst && me.items.some(Boolean) && this.moveOne(me, out, dst, OPP6[out])) { changed = true; this.changedInv(dst); }
    // pull from above: a container, or items lying on top
    const src = this.inv(x, y + 1, z);
    if (src) { if (this.moveOne(src, 0, me, 1)) { changed = true; this.changedInv(src); } }
    else if (!T_SOLID[w.getBlock(x, y + 1, z)] || T_SHAPE[w.getBlock(x, y + 1, z)]) {
      for (const e of g.entities) {
        if (!(e instanceof DroppedItem) || e.remove || !e.stack) continue;
        if (e.x < x || e.x > x + 1 || e.z < z || e.z > z + 1 || e.y < y + 0.5 || e.y > y + 2) continue;
        if (this.insertOne(me, 1, e.stack)) { e.stack.n--; if (e.stack.n <= 0) e.remove = true; changed = true; break; }
      }
    }
    if (changed) this.changedInv(me);
  }

  // ---- dispensers and droppers ----------------------------------------------------------------
  dispense(x, y, z) {
    const g = this.g, w = this.w, id = w.getBlock(x, y, z), m = w.getMeta(x, y, z), dir = m & 7;
    const me = this.inv(x, y, z); if (!me) return;
    const full = []; me.items.forEach((s, i) => { if (s) full.push(i); });
    if (!full.length) { g.sfx.playAt('dispense_fail', x, y, z, 20); return; }
    const slot = full[Math.floor(Math.random() * full.length)], s = me.items[slot];
    const fx = x + D6X[dir], fy = y + D6Y[dir], fz = z + D6Z[dir];
    const take = () => { s.n--; if (s.n <= 0) me.items[slot] = null; this.changedInv(me); };
    const smoke = () => {
      for (let i = 0; i < 5; i++) g.particles.add({ x: x + 0.5 + D6X[dir] * 0.6, y: y + 0.5 + D6Y[dir] * 0.6, z: z + 0.5 + D6Z[dir] * 0.6, vx: D6X[dir] * 0.8 + (Math.random() - 0.5) * 0.3, vy: D6Y[dir] * 0.8 + 0.2, vz: D6Z[dir] * 0.8 + (Math.random() - 0.5) * 0.3, life: 0.6, max: 0.6, size: 0.08, uv: tileUV(ATLAS.tile.smoke ?? 0), light: 0xFF, grav: -0.3 });
    };
    if (T_RS[id] === RS.DROPPER) {
      const dst = this.inv(fx, fy, fz);
      if (dst) { if (this.moveSlot(me, slot, dst, OPP6[dir])) { this.changedInv(dst); this.changedInv(me); g.sfx.playAt('dispense', x, y, z, 20); } else g.sfx.playAt('dispense_fail', x, y, z, 20); return; }
      this.spit(x, y, z, dir, Object.assign(cloneStack(s), { n: 1 })); take(); smoke(); g.sfx.playAt('dispense', x, y, z, 20);
      return;
    }
    const def = itemDef(s.id) || {};
    const cur = w.getBlock(fx, fy, fz);
    const free = cur === 0 || (T_REPLACEABLE[cur] && !T_LIQUID[cur]);
    const ok = () => { smoke(); g.sfx.playAt('dispense', x, y, z, 20); };
    if (s.id === 'arrow') {
      const sp = 22;
      const a = new Arrow(g, x + 0.5 + D6X[dir] * 0.7, y + 0.5 + D6Y[dir] * 0.7, z + 0.5 + D6Z[dir] * 0.7, D6X[dir] * sp + (Math.random() - 0.5), D6Y[dir] * sp + 2, D6Z[dir] * sp + (Math.random() - 0.5), null, 5, true);
      g.addEntity(a); take(); g.sfx.playAt('bow', x, y, z, 24); return;
    }
    if (def.bucket === 'water' || def.bucket === 'lava') {
      if (!free) { g.sfx.playAt('dispense_fail', x, y, z, 20); return; }
      if (def.bucket === 'water' && g.dim === 1) { g.sfx.playAt('fizz', fx, fy, fz); }
      else w.setBlock(fx, fy, fz, def.bucket === 'water' ? B.water : B.lava, 0);
      me.items[slot] = mkStack('bucket', 1); this.changedInv(me); g.sfx.playAt('bucket', fx, fy, fz); return;
    }
    if (def.bucket === 'empty') {
      if (T_LIQUID[cur] && (w.getMeta(fx, fy, fz) & 15) === 0) {
        w.setBlock(fx, fy, fz, 0);
        const full2 = mkStack(T_LIQUID[cur] === 1 ? 'water_bucket' : 'lava_bucket', 1);
        if (s.n === 1) me.items[slot] = full2; else { take(); if (!this.insertOne(me, -1, full2)) this.spit(x, y, z, dir, full2); }
        this.changedInv(me); g.sfx.playAt('bucket', fx, fy, fz); return;
      }
    }
    if (s.id === 'bone_meal' && cur) {
      const held = Object.assign(cloneStack(s), { n: 1 });
      const fake = { g: Object.create(g, { creative: { value: false } }), player: { inv: { held } }, swingArm() {}, toast() {} };
      LocalPlayer.prototype.useBonemeal.call(fake, { x: fx, y: fy, z: fz, id: cur, nx: 0, ny: 0, nz: 0 }, held);
      if (held.n === 0) { take(); return; }
      g.sfx.playAt('dispense_fail', x, y, z, 20); return;
    }
    if (s.id === 'tnt') { if (free) { take(); g.primeTNT(fx, fy, fz, 4); ok(); return; } }
    if (def.igniter === 'flint') {
      if (BLOCKS[cur].tnt) { w.setBlock(fx, fy, fz, 0); g.primeTNT(fx, fy, fz, 4); }
      else if (cur === 0 && T_SOLID[w.getBlock(fx, fy - 1, fz)]) w.setBlock(fx, fy, fz, B.fire);
      else { g.sfx.playAt('dispense_fail', x, y, z, 20); return; }
      s.d = (s.d || 0) + 1; g.sfx.playAt('ignite', fx, fy, fz); this.changedInv(me); return;
    }
    if (def.cart && BLOCKS[cur].rail && g.placeCart) { if (g.placeCart(def.cart, fx, fy, fz, dir)) { take(); ok(); return; } }
    if (def.boat && T_LIQUID[cur] === 1) { g.addEntity(new Boat(g, def.boat, fx + 0.5, fy + 0.6, fz + 0.5, [0, 0, 0, Math.PI, Math.PI / 2, -Math.PI / 2][dir])); take(); ok(); return; }
    if (def.shears) {
      for (const e of g.entities) if (e instanceof Mob && e.alive && e.T.woolly && !e.sheared && !e.baby && Math.abs(e.x - fx - 0.5) < 1 && Math.abs(e.z - fz - 0.5) < 1 && Math.abs(e.y - fy) < 1.5) {
        e.sheared = true; g.dropItem(mkStack(e.color ? e.color + '_wool' : 'wool', 1 + Math.floor(Math.random() * 3)), e.x, e.y + 1, e.z, true); g.sfx.playAt('shear', e.x, e.y, e.z); s.d = (s.d || 0) + 1; this.changedInv(me); return;
      }
    }
    // anything else is simply thrown out
    this.spit(x, y, z, dir, Object.assign(cloneStack(s), { n: 1 })); take(); ok();
  }
  moveSlot(a, slot, b, from) {
    const s = a.items[slot]; if (!s) return false;
    if (!this.insertOne(b, from, s)) return false;
    s.n--; if (s.n <= 0) a.items[slot] = null;
    return true;
  }
  spit(x, y, z, dir, stack) {
    const sp = 3.5 + Math.random();
    this.g.dropItem(stack, x + 0.5 + D6X[dir] * 0.7, y + 0.5 + D6Y[dir] * 0.7 - (dir === 0 ? 0.2 : 0.15), z + 0.5 + D6Z[dir] * 0.7, false, 0,
      [D6X[dir] * sp + (Math.random() - 0.5) * 0.6, D6Y[dir] * sp + (dir > 1 ? 1.2 : 0), D6Z[dir] * sp + (Math.random() - 0.5) * 0.6], 0.3);
  }

  // ---- pistons ------------------------------------------------------------------------------------
  pistonMove(x, y, z) {
    // a piston that is still moving finishes its last move first
    const prev = this.anims.get(posKey(x, y, z));
    if (prev && !prev.remove) prev.finish();
    const w = this.w, id = w.getBlock(x, y, z), m = w.getMeta(x, y, z), b = BLOCKS[id], dir = m & 7;
    const on = this.powerAt(x, y, z, dir) > 0;
    if (on && !b.extended) this.extend(x, y, z, id, m, dir);
    else if (!on && b.extended) this.retract(x, y, z, id, m, dir);
  }
  // The blocks that move when pushing (or pulling) from `start` toward `mv`. null if something won't budge.
  gather(sx, sy, sz, mv, px, py, pz) {
    const w = this.w;
    const move = new Map(), breaks = new Map(), queue = [[sx, sy, sz]];
    const isPiston = (x, y, z) => x === px && y === py && z === pz;
    while (queue.length) {
      const [x, y, z] = queue.shift();
      const k = posKey(x, y, z);
      if (move.has(k) || isPiston(x, y, z)) continue;
      const id = w.getBlock(x, y, z);
      if (!id || T_LIQUID[id] || T_REPLACEABLE[id]) continue;
      if (pistonBreaks(id)) { breaks.set(k, [x, y, z, id]); continue; }
      if (pistonImmovable(id, w, x, y, z)) return null;
      move.set(k, [x, y, z, id, w.getMeta(x, y, z)]);
      if (move.size > 12) return null;
      // whatever is in the way moves too
      queue.push([x + D6X[mv], y + D6Y[mv], z + D6Z[mv]]);
      // slime and honey drag their neighbours along
      if (isSticky(id)) for (let d = 0; d < 6; d++) {
        if (d === mv) continue;
        const nx = x + D6X[d], ny = y + D6Y[d], nz = z + D6Z[d], nid = w.getBlock(nx, ny, nz);
        if (!nid || isPiston(nx, ny, nz) || T_LIQUID[nid] || T_REPLACEABLE[nid] || pistonBreaks(nid) || pistonImmovable(nid, w, nx, ny, nz)) continue;
        if (isSticky(nid) && nid !== id) continue;   // slime and honey don't stick to each other
        queue.push([nx, ny, nz]);
      }
    }
    // destinations must be free (or breakable)
    for (const [x, y, z] of move.values()) {
      const tx = x + D6X[mv], ty = y + D6Y[mv], tz = z + D6Z[mv];
      if (ty < 0 || ty >= CH) return null;
      const k = posKey(tx, ty, tz);
      if (move.has(k)) continue;
      if (isPiston(tx, ty, tz)) return null;
      const tid = w.getBlock(tx, ty, tz);
      if (!tid || T_LIQUID[tid] || T_REPLACEABLE[tid]) continue;
      if (pistonBreaks(tid)) { breaks.set(k, [tx, ty, tz, tid]); continue; }
      return null;
    }
    return { move: [...move.values()], breaks: [...breaks.values()] };
  }
  extend(x, y, z, id, m, dir) {
    const w = this.w, g = this.g, sticky = !!BLOCKS[id].sticky;
    const hx = x + D6X[dir], hy = y + D6Y[dir], hz = z + D6Z[dir];
    if (hy < 0 || hy >= CH) return;
    const plan = this.gather(hx, hy, hz, dir, x, y, z);
    if (!plan) return;
    this.carry(plan, dir, () => {
      w.setBlock(x, y, z, sticky ? B.sticky_piston_extended : B.piston_extended, dir, { noFluid: true, piston: true });
    }, [[x, y, z, hx, hy, hz, B.piston_head, dir | (sticky ? 8 : 0)]], posKey(x, y, z));
    g.sfx.playAt('piston_out', x, y, z, 24);
  }
  retract(x, y, z, id, m, dir) {
    const w = this.w, g = this.g, sticky = !!BLOCKS[id].sticky;
    const hx = x + D6X[dir], hy = y + D6Y[dir], hz = z + D6Z[dir];
    const headHere = w.getBlock(hx, hy, hz) === B.piston_head;
    if (headHere) w.setBlock(hx, hy, hz, 0, 0, { noFluid: false, piston: true });
    w.setBlock(x, y, z, sticky ? B.sticky_piston : B.piston, dir, { noFluid: true, piston: true });
    g.sfx.playAt('piston_in', x, y, z, 24);
    const anim = [[hx, hy, hz, x, y, z, B.piston_head, dir | (sticky ? 8 : 0), true]];
    if (sticky) {
      const fx = hx + D6X[dir], fy = hy + D6Y[dir], fz = hz + D6Z[dir];
      const fid = w.getBlock(fx, fy, fz);
      if (fid && !T_LIQUID[fid] && !T_REPLACEABLE[fid] && !pistonBreaks(fid) && !pistonImmovable(fid, w, fx, fy, fz)) {
        const plan = this.gather(fx, fy, fz, OPP6[dir], x, y, z);
        if (plan) { this.carry(plan, OPP6[dir], null, anim, posKey(x, y, z)); return; }
      }
    }
    const a = new PistonAnim(g, [], anim, OPP6[dir]);
    this.anims.set(posKey(x, y, z), a); g.addEntity(a);
  }
  // Lift the blocks, break what's in the way, and slide them over with an animation.
  carry(plan, mv, then, extra, key) {
    const w = this.w, g = this.g;
    const opts = { noFluid: true, piston: true, quiet: false };
    for (const [x, y, z, id] of plan.breaks) {
      const meta = w.getMeta(x, y, z);
      if (!T_LIQUID[id]) g.dropBlockItems(x, y, z, id, true, meta);
      w.setBlock(x, y, z, 0, 0, opts);
    }
    for (const [x, y, z] of plan.move) w.setBlock(x, y, z, 0, 0, opts);
    const pieces = plan.move.map(([x, y, z, id, meta]) => [x, y, z, x + D6X[mv], y + D6Y[mv], z + D6Z[mv], id, meta]);
    for (const p of pieces) w.setBlock(p[3], p[4], p[5], B.moving_block, 0, opts);
    if (then) then();
    for (const e of extra) if (!e[8]) w.setBlock(e[3], e[4], e[5], B.moving_block, 0, opts);
    const a = new PistonAnim(g, pieces, extra, mv);
    this.anims.set(key, a); g.addEntity(a);
  }
}

// How full a container looks to a comparator (0-15).
function fillSignal(items) {
  if (!items || !items.length) return 0;
  let f = 0, any = false;
  for (const s of items) if (s) { f += s.n / maxStackOf(s.id); any = true; }
  return any ? Math.floor(1 + (f / items.length) * 14) : 0;
}

// Blocks sliding out of (or back into) a piston. Lasts a tenth of a second, then
// the real blocks take their places. Carries anything standing in the way.
class PistonAnim extends Entity {
  constructor(game, pieces, extra, mv) {
    super(game, pieces.length ? pieces[0][0] + 0.5 : extra[0][0] + 0.5, pieces.length ? pieces[0][1] : extra[0][1], pieces.length ? pieces[0][2] + 0.5 : extra[0][2] + 0.5);
    this.pieces = pieces; this.extra = extra; this.mv = mv; this.t = 0; this.dur = 0.12;
    this.w = 0; this.h = 0; this.noSave = true;
    // whoever is in the way (or riding on top) gets moved along
    const boxes = [];
    for (const p of pieces) boxes.push([Math.min(p[0], p[3]), Math.min(p[1], p[4]), Math.min(p[2], p[5]), Math.max(p[0], p[3]) + 1, Math.max(p[1], p[4]) + 1 + (D6Y[mv] === 0 ? 0.1 : 0), Math.max(p[2], p[5]) + 1]);
    for (const p of extra) if (!p[8]) boxes.push([p[3], p[4], p[5], p[3] + 1, p[4] + 1, p[5] + 1]);
    this.riders = [];
    const hit = (x0, y0, z0, x1, y1, z1) => boxes.some(b => x1 > b[0] && x0 < b[3] && y1 > b[1] && y0 < b[4] && z1 > b[2] && z0 < b[5]);
    for (const l of game.locals) { const q = l.player; if (hit(q.x - 0.3, q.y, q.z - 0.3, q.x + 0.3, q.y + 1.8, q.z + 0.3)) this.riders.push(q); }
    for (const e of game.entities) if (!(e instanceof PistonAnim) && !e.remove && e.w !== undefined && hit(e.x - e.w, e.y, e.z - e.w, e.x + e.w, e.y + (e.h || 0.5), e.z + e.w)) this.riders.push(e);
  }
  update(dt) {
    const step = Math.min(dt, this.dur - this.t);
    this.t += dt;
    if (step > 0) {
      const k = step / this.dur;
      for (const e of this.riders) {
        e.x += D6X[this.mv] * k; e.z += D6Z[this.mv] * k;
        if (D6Y[this.mv]) { e.y += D6Y[this.mv] * k * (D6Y[this.mv] > 0 ? 1.02 : 1); if (D6Y[this.mv] > 0) e.vy = Math.max(e.vy || 0, 0); }
      }
    }
    if (this.t >= this.dur) this.finish();
  }
  finish() {
    if (this.remove) return;
    this.remove = true;
    const w = this.game.world, opts = { noFluid: false, piston: true };
    for (const p of this.pieces) if (w.getBlock(p[3], p[4], p[5]) === B.moving_block) w.setBlock(p[3], p[4], p[5], p[6], p[7], opts);
    for (const p of this.extra) if (!p[8] && w.getBlock(p[3], p[4], p[5]) === B.moving_block) w.setBlock(p[3], p[4], p[5], p[6], p[7], opts);
  }
  draws(out) {
    const gl = this.game.renderer.gl, f = clamp(this.t / this.dur, 0, 1);
    const one = (p, from) => {
      const [ax, ay, az, bx, by, bz, id, meta] = p;
      const x = lerp(ax, bx, f), y = lerp(ay, by, f), z = lerp(az, bz, f);
      const mesh = blockStateMesh(gl, id, meta);
      if (!mesh) return;
      const l = this.game.world.getLight(Math.round(x), Math.round(y), Math.round(z));
      const m = Mat4.create();
      out.push({ mesh, m, px: x, py: y, pz: z, light: [Math.max(l >> 4, 4), l & 15] });
      void from;
    };
    for (const p of this.pieces) one(p);
    for (const p of this.extra) one(p);
  }
}

// A mesh of one block in a given state (for blocks on the move). Drawn from 0..1 in each axis.
const STATE_MESHES = new Map();
function blockStateMesh(gl, id, meta) {
  const k = id * 256 + (meta & 255);
  if (STATE_MESHES.has(k)) return STATE_MESHES.get(k);
  const b = BLOCKS[id];
  const mb = new MeshBuilder(256);
  if (b.render === RENDER.CUBE || b.render === RENDER.CUTOUT) {
    let faces = BLOCK_FACES[id];
    if (b.f6) { const d = meta & 7; faces = faces.slice(); for (let f = 0; f < 6; f++) faces[f] = f === D6_FACE[d] ? (d < 2 ? b.f6.frontV : b.f6.front) : f === D6_FACE[OPP6[d]] ? b.f6.back : b.f6.side; }
    addBox(mb, [0, 0, 0], [1, 1, 1], faces);
  } else if (b.render === RENDER.SHAPE) {
    const boxes = shapeBoxes(id, meta, () => 0, () => 0, 0) || [];
    for (const bx of boxes) addPxBox(mb, bx, BLOCK_FACES[id], 0, 0, 0, 1 / 16);
  } else if (b.render === RENDER.MODEL && SHAPES[b.shape]) {
    for (const box of SHAPES[b.shape]) addShapeBox(mb, box, 0, 0, 0, 1 / 16, 255, 0);
  } else { STATE_MESHES.set(k, null); return null; }
  const r = mb.result();
  const mesh = makeVAO(gl, r.verts, r.idx);
  STATE_MESHES.set(k, mesh);
  return mesh;
}

// ---- the world's side ----------------------------------------------------------------------------
Object.assign(Game.prototype, {
  // A piston or its head was broken (by hand or blast): take the other half with it.
  pistonPartBroken(x, y, z, oldId) {
    const w = this.world, b = BLOCKS[oldId];
    for (let e = 0; e < 6; e++) {
      const nx = x + D6X[e], ny = y + D6Y[e], nz = z + D6Z[e], nid = w.getBlock(nx, ny, nz), nm = w.getMeta(nx, ny, nz);
      if (b.pistonHead && BLOCKS[nid].extended && (nm & 7) === OPP6[e]) { w.setBlock(nx, ny, nz, 0, 0, { piston: true }); this.dropBlockItems(nx, ny, nz, nid, true); }
      if (b.extended && BLOCKS[nid].pistonHead && (nm & 7) === e) w.setBlock(nx, ny, nz, 0, 0, { piston: true });
    }
  },
  // Levers, buttons and hooks fall off when the block they're fixed to goes.
  dropAttached(x, y, z) {
    const w = this.world;
    for (let e = 0; e < 6; e++) {
      const nx = x + D6X[e], ny = y + D6Y[e], nz = z + D6Z[e], nid = w.getBlock(nx, ny, nz);
      if (!BLOCKS[nid].attached) continue;
      const nm = w.getMeta(nx, ny, nz), sup = T_RS[nid] === RS.HOOK ? hookSup(nm) : leverSup(nm);
      if (sup !== OPP6[e]) continue;
      w.setBlock(nx, ny, nz, 0); this.dropBlockItems(nx, ny, nz, nid, true, nm);
    }
  },
});
