// ---------------------------------------------------------------------------
// game/machines.js — 0.9.0.35: gears and belts.
//
// The windmills and waterwheels get more to turn:
// - Conveyor belts: lay them in a line and turn one with an axle (or set it
//   next to a turning machine) and the whole run moves, carrying whatever's on
//   it (items, creatures, you) the way it was laid. At the far end it puts
//   things into a chest, a hopper, a furnace or a machine, or drops them off.
// - The Crusher: the millstone's big brother, built with steel. Every ore
//   (silver, mithril and adamantite too) comes out as two crushed ores, and
//   now and then three: the better the Smithing of whoever built it, the more
//   often. Crushing ore trains their Smithing.
// - The Harvester: set it among your fields and turn it, and it gathers every
//   ripe crop (and berry bush) within four blocks, plants the seed back, and
//   puts the harvest into a chest or hopper beside it.
// - Hoppers now feed machines and take what they've made (in at the top or
//   the sides, out at the bottom), and machines push what they've made onto a
//   belt leading away from them.
// ---------------------------------------------------------------------------
const BELT_SPEED = 1.7;          // blocks a second at full turning
const CRUSH_TIME = 2.0;          // seconds per ore at full speed
const DIR4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // 0 north (-z), 1 east, 2 south, 3 west

// ---- what the crusher takes ---------------------------------------------------------------------------------------------
for (const [m, ingot, hex] of [['silver', 'silver_ingot', '#e8eef4'], ['mithril', 'mithril_ingot', '#6ac8f0'], ['adamantite', 'adamantite_ingot', '#4ac080']]) {
  if (!ITEMS[ingot]) continue;
  defItem('crushed_' + m, { name: 'Crushed ' + m[0].toUpperCase() + m.slice(1) + ' Ore', desc: 'Smelts into one ingot. A crusher makes two (or three) from every ore.' });
  SMELTING['crushed_' + m] = ingot;
  if (typeof ORE_SMELTS !== 'undefined') ORE_SMELTS.add('crushed_' + m);
}
const CRUSHING = {};
for (const [k, v] of Object.entries(MILLING)) if (/_ore$|^cobblestone$|^gravel$|^stone$/.test(k)) CRUSHING[k] = v;
for (const m of ['silver', 'mithril', 'adamantite']) if (ITEMS['crushed_' + m] && B[m + '_ore'] !== undefined) CRUSHING[m + '_ore'] = ['crushed_' + m, 2];
for (const [k, v] of [['raw_iron', ['crushed_iron', 2]], ['raw_gold', ['crushed_gold', 2]], ['raw_copper', ['crushed_copper', 2]]]) if (ITEMS[k] && ITEMS[v[0]]) CRUSHING[k] = v;
const CRUSH_ORES = new Set(Object.keys(CRUSHING).filter(k => /_ore$|^raw_/.test(k)));
function machineTableOf(kind) { return kind === 'sawmill' ? SAWING : kind === 'crusher' ? CRUSHING : kind === 'millstone' ? MILLING : null; }

// whoever built it (their Smithing makes a crusher better, and crushing trains it)
function machineOwner(g, e) {
  if (!e || !e.owner) return null;
  const l = (g.allLocals ? g.allLocals() : g.locals).find(q => q.name === e.owner);
  if (l) return l;
  if (g.net) for (const r of g.net.remotes.values()) if (r.name === e.owner) return r;
  return null;
}
function crusherWork(mech, m, amount) {
  const e = m.e, g = mech.g;
  e.items = e.items || [null, null];
  const inp = e.items[0], out = e.items[1];
  const r = inp && CRUSHING[inp.id];
  if (!r || (out && (out.id !== r[0] || out.n + r[1] + 1 > maxStackOf(r[0])))) { e.progress = 0; return; }
  if (amount <= 0) return;
  e.progress = (e.progress || 0) + amount / CRUSH_TIME;
  if (Math.random() < amount * 4) g.burst(m.x + 0.5, m.y + 1.05, m.z + 0.5, inp.id, 1, 0.5);
  if (e.progress < 1) return;
  e.progress = 0;
  const who = machineOwner(g, e), ore = CRUSH_ORES.has(inp.id);
  const lv = who && who.player && who.player.stats ? skillLv(who.player, 'smithing') : (e.smithLv || 1);
  if (who instanceof LocalPlayer) e.smithLv = lv;
  const n = r[1] + (ore && Math.random() < lv / 99 * 0.5 ? 1 : 0);
  inp.n--; if (inp.n <= 0) e.items[0] = null;
  if (out) out.n += n; else e.items[1] = mkStack(r[0], n);
  if (ore && who) {
    if (who instanceof LocalPlayer) skillGain(who, 'smithing', 8);
    else if (who.send) who.send({ t: 'adv', k: 'skill', s: 'smithing', n: 8 });
  }
  g.sfx.playAt('grind', m.x, m.y, m.z, 20);
  g.entityChanged(m.x, m.y, m.z);
}

// ---- the harvester --------------------------------------------------------------------------------------------------------
function seedFor(b) {
  if (b.crop && b.crop.seed && ITEMS[b.crop.seed]) return b.crop.seed;
  for (const k of Object.keys(ITEMS)) { const d = ITEMS[k]; if (d.plants === b.key || (d.block === b.key && !d.food)) return k; }
  for (const k of Object.keys(ITEMS)) { const d = ITEMS[k]; if (d.block === b.key) return k; }
  return null;
}
const SEED_OF = new Map();
function harvesterWork(mech, m, amount) {
  const e = m.e, g = mech.g, w = g.world;
  if (amount <= 0) return;
  e.t = (e.t || 0) + amount;
  if (e.t < 4) return;
  e.t = 0;
  const rs = g.rs, store = rs ? [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]].map(([dx, dy, dz]) => rs.inv(m.x + dx, m.y + dy, m.z + dz)).filter(Boolean) : [];
  const put = (s) => {
    for (const c of store) {
      while (s.n > 0 && rs.insertOne(c, 1, s)) s.n--;
      rs.changedInv(c);
      if (s.n <= 0) return true;
    }
    return false;
  };
  let done = 0;
  const who = machineOwner(g, e);
  for (let dy = -1; dy <= 1 && done < 8; dy++) for (let dz = -4; dz <= 4 && done < 8; dz++) for (let dx = -4; dx <= 4 && done < 8; dx++) {
    const x = m.x + dx, y = m.y + dy, z = m.z + dz, id = w.getBlock(x, y, z), b = BLOCKS[id];
    if (!b) continue;
    const ripe = b.crop && w.getMeta(x, y, z) >= b.crop.stages - 1;
    if (!ripe && !b.harvest) continue;
    done++;
    const got = [];
    if (b.harvest) { got.push(mkStack(b.harvest, 2 + (Math.random() < 0.5 ? 1 : 0))); w.setBlock(x, y, z, B.berry_bush_empty); }
    else {
      const n0 = g.entities.length;
      g.dropBlockItems(x, y, z, id, false, w.getMeta(x, y, z));
      for (let k = n0; k < g.entities.length; k++) { const it = g.entities[k]; if (it instanceof DroppedItem && it.stack) { got.push(it.stack); it.remove = true; } }
      w.setBlock(x, y, z, 0);
      // the seed goes back in
      let seed = SEED_OF.get(id); if (seed === undefined) { seed = seedFor(b); SEED_OF.set(id, seed); }
      const s = seed && got.find(q => q.id === seed && q.n > 0);
      if (s && T_SOLID[w.getBlock(x, y - 1, z)]) { s.n--; w.setBlock(x, y, z, id, 0); }
      if (who instanceof LocalPlayer) skillGain(who, 'farming', 3);
    }
    for (const s of got) if (s.n > 0 && !put(s)) g.dropItem(s, m.x + 0.5, m.y + 1.2, m.z + 0.5, true);
    g.burst(x + 0.5, y + 0.4, z + 0.5, b.key, 4, 0.4);
  }
  if (done && g.sfx.material) g.sfx.material('grass', 'dig');
}

// ---- belts --------------------------------------------------------------------------------------------------------------
{
  const basePlaced = Mechanics.prototype.placed;
  Mechanics.prototype.placed = function (x, y, z, id, lp) {
    const d = BLOCKS[id], w = this.g.world;
    if (d.mech === 'belt') {
      const dir = lp && lp.lookDir ? lp.lookDir() : 0;
      w.setBlock(x, y, z, id, dir, { quiet: true });
      w.setEntity(x, y, z, { type: 'mech' });
      this.dirty = true;
      return;
    }
    if (d.mech === 'harvester') { w.setEntity(x, y, z, { type: 'mech', owner: lp && lp.name }); this.dirty = true; return; }
    const r = basePlaced.call(this, x, y, z, id, lp);
    if (d.mech === 'crusher' && lp) { const e = w.getEntity(x, y, z); if (e) { e.owner = lp.name; e.smithLv = skillLv(lp.player, 'smithing'); } }
    return r;
  };
  const baseUpd = Mechanics.prototype.update;
  Mechanics.prototype.update = function (dt) {
    const r = baseUpd.call(this, dt);
    try { beltTick(this, dt); } catch (e) { if (!BELTS.warned) { BELTS.warned = true; console.warn('belts', e); } }
    return r;
  };
}
const BELTS = { at: new Map(), ejT: new WeakMap() };
function beltTick(mech, dt) {
  const g = mech.g, w = g.world; if (!w) return;
  const at = BELTS.at; at.clear();
  for (const c of mech.comps) {
    if (c.speed > 0.05) for (const b of c.belts) at.set(posKey(b.x, b.y, b.z), { b, dir: w.getMeta(b.x, b.y, b.z) & 3, s: Math.min(1.2, c.speed) });
    // machines push what they've made onto a belt leading away from them
    if (!g.isGuest && c.speed > 0.05) for (const m of c.machines) {
      const e = m.e; if (!e || !e.items || !e.items[1]) continue;
      const t = (BELTS.ejT.get(e) || 0) + dt * c.speed; if (t < 0.6) { BELTS.ejT.set(e, t); continue; }
      BELTS.ejT.set(e, 0);
      for (let d = 0; d < 4; d++) {
        const bx = m.x + DIR4[d][0], bz = m.z + DIR4[d][1];
        if (BLOCKS[w.getBlock(bx, m.y, bz)].mech !== 'belt' || (w.getMeta(bx, m.y, bz) & 3) !== d) continue;
        const s = e.items[1], one = Object.assign(cloneStack(s), { n: 1 });
        s.n--; if (s.n <= 0) e.items[1] = null;
        const it = g.dropItem(one, bx + 0.5, m.y + 0.2, bz + 0.5, false);
        if (it) { it.vx = it.vz = it.vy = 0; it.pickupDelay = 1; }
        g.entityChanged(m.x, m.y, m.z);
        break;
      }
    }
  }
  if (!at.size) return;
  const carry = (e, isItem) => {
    const by = Math.floor(e.y + 0.02), bx = Math.floor(e.x), bz = Math.floor(e.z);
    const k = at.get(posKey(bx, by, bz)); if (!k) return;
    if (e.y - by > 0.35) return;                          // only what's on the belt
    const [dx, dz] = DIR4[k.dir], v = BELT_SPEED * k.s * dt;
    // into whatever's at the far end
    if (isItem && !g.isGuest) {
      const ahead = (e.x - (bx + 0.5)) * dx + (e.z - (bz + 0.5)) * dz;
      const nx = bx + dx, nz = bz + dz;
      if (ahead > 0.3 && BLOCKS[w.getBlock(nx, by, nz)].mech !== 'belt') {
        const c = g.rs && g.rs.inv(nx, by, nz);
        if (c) {
          const from = k.dir === 0 ? 3 : k.dir === 1 ? 4 : k.dir === 2 ? 2 : 5;   // the side it arrives at
          let moved = false; while (e.stack.n > 0 && g.rs.insertOne(c, from, e.stack)) { e.stack.n--; moved = true; }
          if (moved) g.rs.changedInv(c);
          if (e.stack.n <= 0) { e.remove = true; return; }
        }
      }
    }
    // along the belt, and drawn to its middle line
    const cx = bx + 0.5, cz = bz + 0.5, side = dx ? (cz - e.z) : (cx - e.x), pull = Math.max(-v, Math.min(v, side * 0.5));
    const ox = dx * v + (dx ? 0 : pull), oz = dz * v + (dz ? 0 : pull), ew = e.w || 0.3, eh = e.h || 0.5;
    if (!collides(w, e.x + ox - ew, e.y + 0.01, e.z + oz - ew, e.x + ox + ew, e.y + eh, e.z + oz + ew)) { e.x += ox; e.z += oz; }
    if (isItem) { e.vx *= 0.5; e.vz *= 0.5; }
  };
  if (!g.isGuest) for (const e of g.entities) {
    if (e.remove || e.ghost) continue;
    if (e instanceof DroppedItem) carry(e, true);
    else if (e instanceof Mob && e.alive && !e.T.boss && !e.noGrav) carry(e, false);
  }
  for (const l of g.locals) { const p = l.player; if (!p.dead && p.onGround && !l.riding && !p.flying) carry(p, false); }
}

// ---- hoppers and machines --------------------------------------------------------------------------------------------------
{
  const baseInv = Redstone.prototype.inv;
  Redstone.prototype.inv = function (x, y, z) {
    const b = BLOCKS[this.w.getBlock(x, y, z)];
    if (b && b.machine && machineTableOf(b.mech)) {
      const e = this.w.getEntity(x, y, z, () => ({ type: 'machine', items: [null, null], progress: 0 }));
      e.items = e.items || [null, null];
      return { x, y, z, items: e.items, kind: 'machine', table: machineTableOf(b.mech) };
    }
    return baseInv.call(this, x, y, z);
  };
  const baseIn = Redstone.prototype.insertSlots;
  Redstone.prototype.insertSlots = function (c, from, s) { if (c.kind === 'machine') return from === 0 ? [] : (c.table[s.id] ? [0] : []); return baseIn.call(this, c, from, s); };
  const baseOut = Redstone.prototype.extractSlots;
  Redstone.prototype.extractSlots = function (c, to) { if (c.kind === 'machine') return to === 1 ? [] : [1]; return baseOut.call(this, c, to); };
  // the machine screen: the crusher's own list and words
  const baseTable = InvUI.prototype.machineTable;
  InvUI.prototype.machineTable = function () { const pos = this.opts.pos, k = pos && BLOCKS[this.g.world.getBlock(pos[0], pos[1], pos[2])].mech; return k === 'crusher' ? CRUSHING : baseTable.call(this); };
  const baseBars = InvUI.prototype.machineBars;
  InvUI.prototype.machineBars = function () {
    const r = baseBars.call(this), pos = this.opts.pos; if (!pos) return r;
    if (BLOCKS[this.g.world.getBlock(pos[0], pos[1], pos[2])].mech !== 'crusher') return r;
    const st = this.root.querySelector('.mach-status'), sp = this.g.mech.speedAt(pos[0], pos[1], pos[2]);
    const e = this.g.world.getEntity(pos[0], pos[1], pos[2]), lv = e && e.smithLv || 1;
    if (st) st.textContent = sp > 0.05 ? `Turning at ${Math.round(Math.min(1, sp) * 100)}% — every ore crushes into 2, and ${Math.round(lv / 99 * 50)}% of the time 3 (its builder's Smithing ${lv})` : 'Not turning. A crusher is heavy work: join it to a windmill or waterwheel (two of them turn it well).';
    return r;
  };
}

// ---- recipes, words, looks --------------------------------------------------------------------------------------------------
RECIPES.push({ out: 'conveyor', n: 6, shape: ['LLL', 'IAI'], key: { L: 'leather', I: 'iron_ingot', A: 'axle' }, group: 'redstone' });
if (ITEMS.steel_ingot) RECIPES.push({ out: 'crusher', n: 1, shape: [' A ', 'SMS', 'SSS'], key: { A: 'axle', S: 'steel_ingot', M: 'millstone' }, group: 'redstone' });
else RECIPES.push({ out: 'crusher', n: 1, shape: [' A ', 'IMI', 'III'], key: { A: 'axle', I: 'iron_ingot', M: 'millstone' }, group: 'redstone' });
RECIPES.push({ out: 'harvester', n: 1, shape: [' A ', 'IHI', 'PPP'], key: { A: 'axle', I: 'iron_ingot', H: 'iron_hoe', P: '#planks' }, group: 'redstone' });
if (ITEMS.conveyor) ITEMS.conveyor.desc = 'Lay them in a line; turn one with an axle and the whole run carries things the way it was laid. At the end it fills a chest, hopper, furnace or machine.';
if (ITEMS.crusher) ITEMS.crusher.desc = 'Crushes every ore into two (sometimes three, with its builder\'s Smithing). Needs strong turning: an axle from a windmill or waterwheel.';
if (ITEMS.harvester) ITEMS.harvester.desc = 'Turned by an axle, it reaps every ripe crop and berry bush within 4 blocks, replants, and fills a chest or hopper beside it.';
if (ITEMS.millstone) ITEMS.millstone.desc += ' Hoppers can feed it and take from it.';
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB, RUB = H('#2a2a2e'), RUB2 = H('#1a1a1e'), IRON = H('#a8a8b0'), IRON2 = H('#6a6a72'), WOOD = H('#9a6a3a'), WOOD2 = H('#6a4422');
    addTile('conveyor_top', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(y % 4 === 0 ? RUB2 : RUB, 0.9 + p.rand() * 0.2)); for (let y = 0; y < 16; y++) { p.set(0, y, IRON2); p.set(15, y, IRON2); p.set(1, y, IRON); p.set(14, y, IRON); } });
    addTile('conveyor_side', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(IRON2, 0.9 + p.rand() * 0.2)); for (let x = 0; x < 16; x++) { p.set(x, 0, IRON); p.set(x, 15, H('#3a3a40')); } for (const x of [3, 12]) p.set(x, 7, H('#2a2a2e')); });
    addTile('crusher_top', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(IRON2, 0.85 + p.rand() * 0.2)); for (let x = 2; x < 14; x++) for (const y of [4, 5, 10, 11]) p.set(x, y, shade(H('#34343a'), 0.9 + p.rand() * 0.2)); for (let x = 2; x < 14; x += 2) { p.set(x, 6, IRON); p.set(x + 1, 9, IRON); } for (let i = 0; i < 16; i++) { p.set(i, 0, IRON); p.set(0, i, IRON); p.set(15, i, H('#4a4a52')); p.set(i, 15, H('#4a4a52')); } });
    addTile('crusher_side', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(y < 5 ? H('#8a8a94') : IRON2, 0.9 + p.rand() * 0.15)); for (let x = 0; x < 16; x++) { p.set(x, 5, H('#3a3a40')); p.set(x, 0, IRON); } for (const [x, y] of [[2, 2], [13, 2], [2, 8], [13, 8], [2, 13], [13, 13]]) p.set(x, y, H('#d8d8e0')); for (let x = 5; x < 11; x++) p.set(x, 9, H('#e8a030')); });
    addTile('harvester_top', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(x % 4 === 3 ? WOOD2 : WOOD, 0.9 + p.rand() * 0.2)); for (let i = 1; i < 15; i++) { p.set(i, i, IRON); p.set(15 - i, i, IRON); } for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, IRON2); });
    addTile('harvester_side', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(x % 4 === 3 ? WOOD2 : WOOD, 0.9 + p.rand() * 0.2)); for (let x = 0; x < 16; x++) { p.set(x, 0, IRON); p.set(x, 15, IRON2); } for (let x = 3; x < 13; x++) p.set(x, 6 + Math.round(Math.sin(x * 0.5) * 1.5), H('#d8d8e0')); for (let y = 7; y < 13; y++) p.set(7, y, WOOD2); });
    const lump = (c, d, l) => ({ A: hexRGB(c), a: hexRGB(d), L: hexRGB(l) });
    for (const [m, hex] of [['silver', '#e8eef4'], ['mithril', '#6ac8f0'], ['adamantite', '#4ac080']]) if (ITEMS['crushed_' + m]) addItem('crushed_' + m, p => p.art(ART.berries.map(r => r.replace(/G/g, '.').replace(/s/g, '.')), lump(hex, '#5a5450', '#ffffff')));
  };
}
// ---- drawn moving: the belt's slats, the crusher's rollers, the harvester's arms ----------------------------------------------
{
  const baseDraws = Mechanics.prototype.draws;
  Mechanics.prototype.draws = function (out, cam) {
    baseDraws.call(this, out, cam);
    const g = this.g, gl = g.renderer.gl, w = g.world;
    if (!this.meshes2) {
      const mk = (boxes) => { const mb = new MeshBuilder(256); for (const [mn, mx, t] of boxes) addBox(mb, mn, mx, tilesOf(t)); const r = mb.result(); return makeVAO(gl, r.verts, r.idx); };
      this.meshes2 = {
        slat: mk([[[-0.44, 0, -0.06], [0.44, 0.05, 0.06], 'conveyor_side']]),
        roller: mk([[[-0.36, -0.1, -0.1], [0.36, 0.1, 0.1], 'axle_end'], [[-0.3, -0.13, -0.03], [0.3, 0.13, 0.03], 'axle']]),
        arm: mk([[[-0.06, 0, -0.55], [0.06, 0.08, 0.55], 'axle'], [[-0.12, -0.02, 0.45], [0.12, 0.2, 0.58], 'axle_end']]),
      };
    }
    const M = this.meshes2;
    for (const n of this.nodes.values()) {
      if (n.kind !== 'belt' && n.kind !== 'crusher' && n.kind !== 'harvester') continue;
      if (Math.abs(n.x - cam.x) > 48 || Math.abs(n.z - cam.z) > 48) continue;
      const ang = n.comp ? n.comp.angle : 0, l = w.getLight(n.x, n.y + (n.kind === 'belt' ? 0 : 1), n.z), light = [l >> 4, l & 15];   // the light above a solid machine
      if (n.kind === 'belt') {
        const d = w.getMeta(n.x, n.y, n.z) & 3, [dx, dz] = DIR4[d], ph = (ang * 0.45) % 1;
        for (let k = 0; k < 3; k++) {
          const t = ((ph + k / 3) % 1) - 0.5, m = Mat4.create();
          Mat4.translate(m, 0.5 + dx * t, 0.06, 0.5 + dz * t);
          if (dx) Mat4.rotateY(m, Math.PI / 2);
          out.push({ mesh: M.slat, m, px: n.x, py: n.y, pz: n.z, light });
        }
      } else if (n.kind === 'crusher') {
        for (const s of [-1, 1]) { const m = Mat4.create(); Mat4.translate(m, 0.5, 1.08, 0.5 + s * 0.2); Mat4.rotateX(m, ang * 2 * s); out.push({ mesh: M.roller, m, px: n.x, py: n.y, pz: n.z, light }); }
      } else {
        for (let k = 0; k < 2; k++) { const m = Mat4.create(); Mat4.translate(m, 0.5, 1.0, 0.5); Mat4.rotateY(m, ang * 0.7 + k * Math.PI / 2); out.push({ mesh: M.arm, m, px: n.x, py: n.y, pz: n.z, light }); }
      }
    }
  };
}
PV.debug.machines = { crushing: () => CRUSHING, belts: () => BELTS.at.size, harvest: (x, y, z) => { const m = GAME.mech.nodes.get(posKey(x, y, z)); if (m) { m.e.t = 99; harvesterWork(GAME.mech, m, 1); } return !!m; } };
