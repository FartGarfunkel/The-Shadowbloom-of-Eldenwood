// ---------------------------------------------------------------------------
// game/rules.js — per-world settings: game rules, how long days and nights
// last, graves, and the world settings panel (used when creating a world,
// from the world list, and from the pause menu).
// ---------------------------------------------------------------------------

const RULE_DEFAULTS = {
  dayMinutes: 10, nightMinutes: 10,
  daylightCycle: true, keepInventory: false, graves: true, mobSpawning: true, mobGriefing: true, tntExplodes: true,
  fireSpread: true, blockDrops: true, fallDamage: true, drowning: true, fireDamage: true, naturalRegen: false,
  grassSpread: true, saplingsPlant: true, showCoords: false, commands: false, downed: true,
};
// [key, label, help] — shown as toggles in the world settings panel
const RULE_TOGGLES = [
  ['daylightCycle', 'Day and night cycle', 'Turn off to keep the sun where it is'],
  ['keepInventory', 'Keep inventory on death', 'You respawn with everything you had'],
  ['graves', 'Graves', 'What you drop on death is kept safe in a grave, with a compass that points to it'],
  ['mobSpawning', 'Creatures spawn', 'Animals and monsters appear on their own'],
  ['mobGriefing', 'Creatures break blocks', 'Explosions from creatures and boss attacks damage the land'],
  ['tntExplodes', 'TNT explodes', 'Turn off and TNT just fizzles'],
  ['fireSpread', 'Fire spreads', 'Fire can spread to wood and leaves nearby'],
  ['blockDrops', 'Blocks drop items', 'Broken blocks drop what they\'re made of'],
  ['fallDamage', 'Fall damage', ''],
  ['drowning', 'Drowning', 'Your breath runs out under water'],
  ['fireDamage', 'Fire and lava damage', ''],
  ['naturalRegen', 'Slow natural healing', 'Heal half a heart every few seconds when not hurt for a while (the classic game had none)'],
  ['grassSpread', 'Grass spreads', 'Grass slowly grows onto nearby bare dirt'],
  ['saplingsPlant', 'Saplings plant themselves', 'A sapling left lying on soil takes root'],
  ['showCoords', 'Show coordinates', 'Your position, shown in the corner'],
  ['commands', 'Allow commands', 'Chat commands and WorldEdit (press T or /)'],
  ['downed', 'Downed, not dead (co-op)', 'With someone else playing, you go down instead of dying, and they can help you back up'],
];

Object.assign(Game.prototype, {
  // This world's rules, with defaults for anything an older world doesn't have yet.
  rules() {
    const m = this.meta;
    if (!m) return RULE_DEFAULTS;
    if (!m.rules) m.rules = Object.assign({}, RULE_DEFAULTS, { commands: m.mode === 'creative' });
    else if (m.rules._v !== 1) { m.rules = Object.assign({}, RULE_DEFAULTS, m.rules); m.rules._v = 1; }
    return m.rules;
  },
  // The sun moves at a speed that gives the day and night their chosen lengths.
  // meta.time stays in 0..DAY_LEN (the first half is day), so older worlds just carry on.
  advanceTime(dt) {
    const r = this.rules();
    if (!r.daylightCycle) return;
    const phase = this.meta.time / DAY_LEN;
    const secs = (phase < 0.5 ? r.dayMinutes : r.nightMinutes) * 60;
    this.meta.time = (this.meta.time + dt * (DAY_LEN / 2) / Math.max(30, secs)) % DAY_LEN;
  },
  // ---- graves -----------------------------------------------------------------------------------
  // Everything you were carrying goes into a grave where you fell (or the last safe ground).
  makeGrave(lp, stacks) {
    const w = this.world, p = lp.player;
    if (!stacks.length) return null;
    let [x, y, z] = p.lastSafe && p.y < -10 ? p.lastSafe : [p.x, p.y, p.z];
    x = Math.floor(x); y = Math.max(1, Math.floor(y)); z = Math.floor(z);
    // find a free spot nearby, out of lava and the void
    const free = (a, b, c) => { const id = w.getBlock(a, b, c); return (id === 0 || T_REPLACEABLE[id]) && !T_PORTAL[id]; };
    let spot = null;
    for (let r = 0; r <= 4 && !spot; r++) for (let dy = 0; dy <= 6 && !spot; dy++) for (let dz = -r; dz <= r && !spot; dz++) for (let dx = -r; dx <= r && !spot; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const a = x + dx, b = y + dy, c = z + dz;
      if (b >= CH - 1 || !free(a, b, c) || T_LIQUID[w.getBlock(a, b, c)] === 2) continue;
      spot = [a, b, c];
    }
    if (!spot) return null;
    const [gx, gy, gz] = spot;
    if (!T_SOLID[w.getBlock(gx, gy - 1, gz)]) w.setBlock(gx, gy - 1, gz, B.cobblestone);
    w.setBlock(gx, gy, gz, B.grave, (lp.lookDir() + 2) & 3);
    w.setEntity(gx, gy, gz, { type: 'grave', items: stacks, owner: lp.name, xp: 0, at: Date.now() });
    this.entityChanged(gx, gy, gz);
    return { dim: this.dim, x: gx, y: gy, z: gz };
  },
  // Open a grave: everything goes back into your bags (what doesn't fit drops at your feet).
  openGrave(lp, x, y, z) {
    const w = this.world, e = w.getEntity(x, y, z), p = lp.player;
    w.setBlock(x, y, z, 0);
    if (e && e.items) {
      for (const s of e.items) {
        if (!s) continue;
        const d = itemDef(s.id);
        // armor and the charm go straight back on if the slot is free
        if (d && d.armor && !p.inv.armor.slots[d.armor.slot]) { p.inv.armor.slots[d.armor.slot] = s; continue; }
        if (d && d.charm && !p.inv.charm.slots[0]) { p.inv.charm.slots[0] = s; continue; }
        if (d && d.backpack && !p.inv.back.slots[0]) { p.inv.back.slots[0] = s; continue; }
        const left = p.inv.add(s);
        if (left > 0) this.dropItem(Object.assign(cloneStack(s), { n: left }), p.x, p.y + 0.5, p.z, false);
      }
    }
    if (p.grave && p.grave.x === x && p.grave.y === y && p.grave.z === z) p.grave = null;
    for (const s of [...p.inv.main.slots]) if (s && s.id === 'death_compass') p.inv.remove('death_compass', 1);
    this.sfx.play('chest'); lp.toast('You got your things back', 'good');
    for (let i = 0; i < 12; i++) this.particles.add({ x: x + Math.random(), y: y + Math.random(), z: z + Math.random(), vx: 0, vy: 0.6, vz: 0, life: 1, max: 1, size: 0.06, uv: tileUV(ATLAS.tile.portal_mote_sky ?? ATLAS.tile.white), light: 0xFF, grav: -0.3 });
  },
});

// ---- the world settings panel ------------------------------------------------------------------
// Fills `el` with controls for `rules` (and the name, when `named` is given). Returns a reader.
function worldSettingsForm(el, rules, opts = {}) {
  const r = Object.assign({}, RULE_DEFAULTS, rules || {});
  const mins = [3, 5, 7, 10, 15, 20, 30, 45, 60];
  const sel = (id, v) => `<select id="${id}">${mins.map(m => `<option value="${m}"${m === v ? ' selected' : ''}>${m} min</option>`).join('')}</select>`;
  el.innerHTML = `
    ${opts.name !== undefined ? `<label class="wsf-row"><span>Name</span><input class="wsf-name" maxlength="32" value="${esc(opts.name)}"></label>` : ''}
    ${opts.mode !== undefined ? `<label class="wsf-row"><span>Game mode</span><select class="wsf-mode"><option value="survival"${opts.mode !== 'creative' ? ' selected' : ''}>Survival</option><option value="creative"${opts.mode === 'creative' ? ' selected' : ''}>Creative</option></select></label>` : ''}
    <div class="wsf-two"><label class="wsf-row"><span>Daytime lasts</span>${sel('wsf-day', r.dayMinutes)}</label><label class="wsf-row"><span>Night lasts</span>${sel('wsf-night', r.nightMinutes)}</label></div>
    <div class="wsf-toggles">${RULE_TOGGLES.map(([k, l, h]) => `<label class="wsf-tog" title="${esc(h)}"><input type="checkbox" data-rule="${k}"${r[k] ? ' checked' : ''}><span>${esc(l)}</span>${h ? `<small>${esc(h)}</small>` : ''}</label>`).join('')}</div>`;
  for (const i of el.querySelectorAll('input, select')) i.addEventListener('keydown', (e) => e.stopPropagation());
  return () => {
    const out = Object.assign({}, r);
    out.dayMinutes = Number(el.querySelector('#wsf-day').value); out.nightMinutes = Number(el.querySelector('#wsf-night').value);
    for (const c of el.querySelectorAll('[data-rule]')) out[c.dataset.rule] = c.checked;
    out._v = 1;
    const nm = el.querySelector('.wsf-name'), md = el.querySelector('.wsf-mode');
    return { rules: out, name: nm ? nm.value.trim() : undefined, mode: md ? md.value : undefined };
  };
}
