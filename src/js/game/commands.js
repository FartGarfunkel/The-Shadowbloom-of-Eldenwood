// ---------------------------------------------------------------------------
// game/commands.js — chat, commands and WorldEdit.
//
// Press T (or / to start a command, or Enter) to open the chat line. Commands
// work when the world allows them (World settings → Allow commands; on by
// default in Creative). WorldEdit works like the server mod: //wand gives a
// golden wand — left click a block for corner 1, right click for corner 2 —
// then //set, //replace, //walls, //copy, //paste, //undo and the rest.
// Type /help for the list.
// ---------------------------------------------------------------------------

const BLOCK_NAME_ALIASES = {
  oak_planks: 'planks', oak_log: 'log', oak_leaves: 'leaves', oak_sapling: 'sapling', grass_block: 'grass', short_grass: 'tall_grass', dandelion: 'flower_yellow', poppy: 'flower_red',
  deepslate: 'slate', cobbled_deepslate: 'cobbled_slate', polished_deepslate: 'polished_slate', deepslate_bricks: 'slate_bricks', glowstone: 'glowstone', white_wool: 'wool',
  hay_block: 'hay_bale', sweet_berry_bush: 'berry_bush', oak_slab: 'oak_slab', smooth_stone_slab: 'smooth_stone_slab', air: 'air',
};
// Find a block by key, Minecraft name, or a few words of its display name. Returns -1 if unknown.
function resolveBlock(name) {
  if (!name) return -1;
  let n = String(name).toLowerCase().replace(/^minecraft:|^mcl_[a-z]+:|^default:/, '').trim().replace(/\s+/g, '_');
  if (n === 'air' || n === '0') return 0;
  if (B[n] !== undefined) return B[n];
  if (BLOCK_NAME_ALIASES[n] && B[BLOCK_NAME_ALIASES[n]] !== undefined) return B[BLOCK_NAME_ALIASES[n]];
  const words = n.replace(/_/g, ' ');
  const exact = BLOCKS.find(b => b.name.toLowerCase() === words);
  if (exact) return exact.id;
  const part = BLOCKS.find(b => b.key.includes(n) && ITEMS[b.key]);
  return part ? part.id : -1;
}
function resolveItem(name) {
  if (!name) return null;
  let n = String(name).toLowerCase().replace(/^minecraft:|^mcl_[a-z]+:|^default:/, '').trim().replace(/\s+/g, '_');
  if (ITEMS[n]) return n;
  if (BLOCK_NAME_ALIASES[n] && ITEMS[BLOCK_NAME_ALIASES[n]]) return BLOCK_NAME_ALIASES[n];
  const words = n.replace(/_/g, ' ');
  const exact = Object.values(ITEMS).find(d => d.name.toLowerCase() === words);
  if (exact) return exact.key;
  const part = Object.keys(ITEMS).find(k => k.includes(n));
  return part || null;
}
// A block pattern: "stone", "stone:2" (with meta), or a mix "60%stone,40%andesite".
function parsePattern(text) {
  if (!text) return null;
  const parts = String(text).split(',').map(s => s.trim()).filter(Boolean);
  const out = [];
  let total = 0;
  for (const p of parts) {
    const m = /^(?:(\d+(?:\.\d+)?)%)?([^:]+)(?::(\d+))?$/.exec(p);
    if (!m) return null;
    const id = resolveBlock(m[2]);
    if (id < 0) return { error: 'Unknown block: ' + m[2] };
    const wgt = m[1] ? Number(m[1]) : 1;
    out.push({ id, meta: m[3] ? Number(m[3]) & 255 : 0, w: wgt }); total += wgt;
  }
  if (!out.length) return null;
  return { pick: () => { if (out.length === 1) return out[0]; let r = Math.random() * total; for (const o of out) { r -= o.w; if (r <= 0) return o; } return out[out.length - 1]; }, list: out };
}

// ---- the chat line -------------------------------------------------------------------------------
Object.assign(LocalPlayer.prototype, {
  chatEls() {
    if (this._chat) return this._chat;
    const root = this.el.querySelector('.chat');
    if (!root) return null;
    const input = root.querySelector('.chat-input'), log = root.querySelector('.chat-log');
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); const t = input.value; this.closeChat(); if (t.trim()) this.submitChat(t); }
      else if (e.key === 'Escape') { e.preventDefault(); this.closeChat(); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const h = this._chatHist || [];
        if (!h.length) return;
        this._chatHi = clamp((this._chatHi ?? h.length) + (e.key === 'ArrowUp' ? -1 : 1), 0, h.length);
        input.value = this._chatHi >= h.length ? '' : h[this._chatHi];
      } else if (e.key === 'Tab') {
        e.preventDefault();
        input.value = this.completeChat(input.value);
      }
    });
    input.addEventListener('keyup', (e) => e.stopPropagation());
    this._chat = { root, input, log };
    return this._chat;
  },
  openChat(prefill = '') {
    const c = this.chatEls(); if (!c) return;
    this.mode = 'chat'; this.mining = null;
    c.root.hidden = false; c.root.classList.add('open');
    c.input.value = prefill; this._chatHi = undefined;
    if (this.useKb) this.g.input.releaseLock(true);
    setTimeout(() => { c.input.focus(); c.input.setSelectionRange(prefill.length, prefill.length); }, 0);
  },
  closeChat() {
    const c = this.chatEls(); if (!c) return;
    c.root.classList.remove('open'); c.input.blur();
    this.mode = 'play';
    if (this.useKb && !this.g.input.touchMode && this.g.state === 'playing') this.g.input.requestLock();
    this.showChatBriefly();
  },
  showChatBriefly() {
    const c = this.chatEls(); if (!c) return;
    c.root.hidden = !c.log.children.length && !c.root.classList.contains('open');
    clearTimeout(this._chatHide);
    this._chatHide = setTimeout(() => { if (!c.root.classList.contains('open')) c.root.hidden = true; }, 9000);
  },
  chatMsg(text, kind = '') {
    const c = this.chatEls();
    if (!c) { this.toast(text, kind); return; }
    for (const line of String(text).split('\n')) {
      const d = document.createElement('div'); d.className = 'chat-line ' + kind; d.textContent = line;
      c.log.appendChild(d);
    }
    while (c.log.children.length > 60) c.log.firstChild.remove();
    c.log.scrollTop = c.log.scrollHeight;
    this.showChatBriefly();
  },
  submitChat(text) {
    this._chatHist = (this._chatHist || []).concat([text]).slice(-40);
    if (text.startsWith('/')) this.runCommand(text);
    else for (const l of this.g.locals) l.chatMsg('<' + this.name + '> ' + text);
  },
  completeChat(v) {
    if (!v.startsWith('/')) return v;
    const parts = v.split(' ');
    if (parts.length === 1) {
      const want = v.replace(/^\/+/, ''), slash = v.startsWith('//') ? '//' : '/';
      const names = Object.keys(slash === '//' ? WE_COMMANDS : COMMANDS).filter(n => n.startsWith(want) && !(slash !== '//' && COMMANDS[n].hidden));
      if (names.length === 1) return slash + names[0] + ' ';
      if (names.length > 1) this.chatMsg(names.map(n => slash + n).join('  '), 'dim');
      return v;
    }
    const last = parts[parts.length - 1].toLowerCase();
    if (!last) return v;
    const keys = Object.keys(ITEMS).filter(k => k.startsWith(last)).slice(0, 12);
    if (keys.length === 1) { parts[parts.length - 1] = keys[0]; return parts.join(' ') + ' '; }
    if (keys.length) this.chatMsg(keys.join('  '), 'dim');
    return v;
  },
  // ---- running a command ----------------------------------------------------------------------
  runCommand(text) {
    const g = this.g;
    const we = text.startsWith('//');
    const parts = text.replace(/^\/+/, '').trim().split(/\s+/);
    const name = parts.shift().toLowerCase();
    const table = we ? WE_COMMANDS : COMMANDS;
    const cmd = table[name];
    if (!cmd) { this.chatMsg('Unknown command: ' + (we ? '//' : '/') + name + ' — try /help', 'err'); return; }
    if (cmd.cheat !== false && !g.rules().commands) { this.chatMsg('Commands are off in this world. Turn on "Allow commands" in World settings (pause menu).', 'err'); return; }
    if (g.isGuest && (we || cmd.cheat !== false)) { this.chatMsg('Only the host can use commands', 'err'); return; }
    try {
      const out = cmd.run(this, parts);
      if (out) this.chatMsg(out, 'ok');
    } catch (e) {
      this.chatMsg(e && e.usage ? 'Usage: ' + (we ? '//' : '/') + name + ' ' + cmd.usage : 'Error: ' + (e && e.message ? e.message : e), 'err');
      if (!(e && e.usage)) console.error(e);
    }
  },
  // "~" means where you are; "~3" three blocks off.
  coord(arg, axis) {
    const p = this.player, base = axis === 0 ? p.x : axis === 1 ? p.y : p.z;
    if (arg === undefined) throw { usage: true };
    if (arg.startsWith('~')) return Math.floor(base + (arg.length > 1 ? Number(arg.slice(1)) : 0));
    const v = Number(arg); if (!isFinite(v)) throw { usage: true };
    return Math.floor(v);
  },
});
const usage = () => { throw { usage: true }; };

const COMMANDS = {
  help: { cheat: false, usage: '[command]', desc: 'List commands', run(lp, a) {
    if (a[0]) { const n = a[0].replace(/^\/+/, ''), c = COMMANDS[n] || WE_COMMANDS[n]; return c ? `/${n} ${c.usage} — ${c.desc}` : 'No such command'; }
    return 'Commands: ' + Object.keys(COMMANDS).filter(k => !COMMANDS[k].hidden).map(k => '/' + k).join(' ') + '\nWorldEdit: ' + Object.keys(WE_COMMANDS).map(k => '//' + k).join(' ') + '\n/help <command> for details. Tab completes.';
  } },
  herobrine: { hidden: true, cheat: false, usage: '[trace]', desc: '…', run(lp, a) {
    const h = lp.g.haunt; if (!h || !hauntDimOk(lp.g)) return 'Removed Herobrine.';
    if (a[0] === 'trace') { h.leaveTrace(); return 'Removed Herobrine.'; }
    h.forceSighting(); return 'Removed Herobrine.';
  } },
  say: { cheat: false, usage: '<message>', desc: 'Say something', run(lp, a) { for (const l of lp.g.locals) l.chatMsg('[' + lp.name + '] ' + a.join(' ')); } },
  seed: { cheat: false, usage: '', desc: 'Show the world seed', run(lp) { return 'Seed: ' + (lp.g.meta.seedText ?? lp.g.meta.seed); } },
  gamemode: { usage: '<survival|creative>', desc: 'Change game mode', run(lp, a) {
    const m = (a[0] || '').toLowerCase(); const mode = m.startsWith('c') || m === '1' ? 'creative' : m.startsWith('s') || m === '0' ? 'survival' : null;
    if (!mode) usage(); lp.g.meta.mode = mode; if (mode === 'survival') lp.player.flying = false; return 'Game mode: ' + mode;
  } },
  time: { usage: 'set <day|noon|night|midnight|0-1200> | add <n> | query', desc: 'Set the time of day', run(lp, a) {
    const g = lp.g;
    if (a[0] === 'query') return `Time ${Math.round(g.meta.time)} of ${DAY_LEN} (day ${g.meta.day || 0})`;
    const named = { day: 60, morning: 30, noon: DAY_LEN * 0.25, sunset: DAY_LEN * 0.48, night: DAY_LEN * 0.55, midnight: DAY_LEN * 0.75 };
    if (a[0] === 'set') { const v = named[a[1]] ?? Number(a[1]); if (!isFinite(v)) usage(); g.meta.time = ((v % DAY_LEN) + DAY_LEN) % DAY_LEN; return 'Time set'; }
    if (a[0] === 'add') { const v = Number(a[1]); if (!isFinite(v)) usage(); g.meta.time = ((g.meta.time + v) % DAY_LEN + DAY_LEN) % DAY_LEN; return 'Time moved on'; }
    usage();
  } },
  daylength: { usage: '<day minutes> <night minutes>', desc: 'How long days and nights last', run(lp, a) {
    const d = Number(a[0]), n = Number(a[1] ?? a[0]); if (!(d > 0) || !(n > 0)) usage();
    const r = lp.g.rules(); r.dayMinutes = clamp(d, 1, 240); r.nightMinutes = clamp(n, 1, 240); return `Days last ${r.dayMinutes} min, nights ${r.nightMinutes} min`;
  } },
  gamerule: { usage: '[rule] [true|false|number]', desc: 'Show or change a game rule', run(lp, a) {
    const r = lp.g.rules();
    if (!a[0]) return Object.keys(RULE_DEFAULTS).map(k => k + '=' + r[k]).join('  ');
    if (!(a[0] in RULE_DEFAULTS)) return 'Unknown rule. Rules: ' + Object.keys(RULE_DEFAULTS).join(', ');
    if (a[1] === undefined) return a[0] + ' = ' + r[a[0]];
    const v = typeof RULE_DEFAULTS[a[0]] === 'number' ? Number(a[1]) : /^(true|on|1|yes)$/i.test(a[1]);
    r[a[0]] = v; return a[0] + ' = ' + v;
  } },
  tp: { usage: '<x y z> | spawn | <player>', desc: 'Teleport', run(lp, a) {
    const g = lp.g, p = lp.player;
    if (a[0] === 'spawn') { g.placeAtSpawn(p, false); return 'To spawn'; }
    if (a.length === 1) { const o = g.locals.find(l => l.name.toLowerCase() === a[0].toLowerCase()); if (!o) return 'No player called ' + a[0]; p.x = o.player.x; p.y = o.player.y; p.z = o.player.z; return 'To ' + o.name; }
    const x = lp.coord(a[0], 0), y = lp.coord(a[1], 1), z = lp.coord(a[2], 2);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) g.world.ensureChunk((x >> 4) + dx, (z >> 4) + dz);
    p.x = x + 0.5; p.y = y; p.z = z + 0.5; p.vx = p.vy = p.vz = 0; p.fallStart = null;
    return `Teleported to ${x} ${y} ${z}`;
  } },
  give: { usage: '<item> [count]', desc: 'Get items', run(lp, a) {
    const k = resolveItem(a[0]); if (!k) return 'Unknown item: ' + a[0];
    const n = clamp(Number(a[1] || 1) | 0, 1, 64 * 36);
    let left = n; while (left > 0) { const t = Math.min(left, maxStackOf(k)); const r = lp.give(mkStack(k, t)); if (r > 0) { lp.g.dropItem(mkStack(k, r), lp.player.x, lp.player.y + 1, lp.player.z, false); } left -= t; }
    return `Gave ${n} ${itemDef(k).name}`;
  } },
  clear: { usage: '', desc: 'Empty your inventory', run(lp) { const inv = lp.player.inv; for (const c of [inv.main, inv.armor, inv.off, inv.hook, inv.charm]) c.slots.fill(null); return 'Inventory cleared'; } },
  kill: { usage: '', desc: 'Respawn the hard way', run(lp) { lp.hurt(9999, { type: 'void', bypass: true, bypassArmor: true }); } },
  heal: { usage: '', desc: 'Full health and breath', run(lp) { const p = lp.player; p.health = p.maxHealth; p.air = AIR_MAX; p.burn = 0; return 'Healed'; } },
  xp: { usage: '<amount>', desc: 'Gain experience', run(lp, a) { const n = Number(a[0]); if (!(n > 0)) usage(); lp.grantXP(Math.floor(n)); return 'Level ' + lp.player.level; } },
  spawnpoint: { usage: '', desc: 'Respawn here', run(lp) { const p = lp.player; p.spawn = [p.x, p.y, p.z]; p.spawnDim = lp.g.dim; return 'Spawn point set'; } },
  setworldspawn: { usage: '', desc: 'Make here the world spawn', run(lp) { const p = lp.player; lp.g.meta.spawn = [p.x, 0, p.z]; return 'World spawn set'; } },
  summon: { usage: '<creature> [count]', desc: 'Summon creatures', run(lp, a) {
    const t = (a[0] || '').toLowerCase(); if (!MOB_TYPES[t]) return 'Creatures: ' + Object.keys(MOB_TYPES).join(', ');
    const g = lp.g, p = lp.player, n = clamp(Number(a[1] || 1) | 0, 1, 20), [dx, , dz] = p.look();
    for (let i = 0; i < n; i++) g.addEntity(new Mob(g, t, p.x + dx * 3 + (Math.random() - 0.5) * 2, p.y + 0.5, p.z + dz * 3 + (Math.random() - 0.5) * 2));
    return `Summoned ${n} ${t}`;
  } },
  setblock: { usage: '<x y z> <block>', desc: 'Place one block', run(lp, a) {
    const x = lp.coord(a[0], 0), y = lp.coord(a[1], 1), z = lp.coord(a[2], 2), pat = parsePattern(a[3]);
    if (!pat) usage(); if (pat.error) return pat.error;
    const o = pat.pick(); lp.g.world.setBlock(x, y, z, o.id, o.meta); return 'Block placed';
  } },
  fill: { usage: '<x1 y1 z1> <x2 y2 z2> <block>', desc: 'Fill a box', run(lp, a) {
    const c = [0, 1, 2, 3, 4, 5].map(i => lp.coord(a[i], i % 3)), pat = parsePattern(a[6]);
    if (!pat) usage(); if (pat.error) return pat.error;
    return weFill(lp, boxOf(c.slice(0, 3), c.slice(3)), () => pat.pick(), 'fill');
  } },
};

// ---- WorldEdit ---------------------------------------------------------------------------------------
const WE_MAX = 1500000;
function weState(lp) { return lp.we || (lp.we = { pos1: null, pos2: null, clip: null, undo: [], redo: [] }); }
function boxOf(a, b) { return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])]; }
function weSel(lp) {
  const s = weState(lp);
  if (!s.pos1 || !s.pos2) throw new Error('Select an area first: //wand, then left and right click two corners (or //pos1 and //pos2)');
  return boxOf(s.pos1, s.pos2);
}
function volOf(b) { return (b[3] - b[0] + 1) * (b[4] - b[1] + 1) * (b[5] - b[2] + 1); }
// Write many blocks quickly (no physics), remembering what was there for //undo.
function weWrite(lp, list, label) {
  const g = lp.g, w = g.world;
  const touched = new Set(), undo = [];
  for (const [x, y, z, id, meta] of list) {
    if (y < 0 || y >= CH) continue;
    const c = w.ensureChunk(x >> 4, z >> 4);
    const i = cidx(x & 15, y, z & 15);
    const oid = c.blocks[i], om = c.meta[i];
    if (oid === id && om === meta) continue;
    undo.push(x, y, z, oid, om);
    c.blocks[i] = id; c.meta[i] = meta;
    if (id && y + 1 > c.maxY) c.maxY = y + 1;
    if (oid !== id && c.blockEntities.has(i)) c.blockEntities.delete(i);
    touched.add(c);
  }
  for (const c of touched) {
    c.modified = true; c.dirty = true; c.tickables = null; c.rsTick = null;
    w.markRemesh(c, 0, 0, true); w.markRemesh(c, 15, 15, true);
  }
  const s = weState(lp);
  if (undo.length) { s.undo.push({ label, data: undo }); if (s.undo.length > 12) s.undo.shift(); s.redo = []; }
  return undo.length / 5;
}
function weFill(lp, box, pick, label, test) {
  if (volOf(box) > WE_MAX) throw new Error(`That's ${volOf(box).toLocaleString()} blocks — the limit is ${WE_MAX.toLocaleString()}`);
  const w = lp.g.world, list = [];
  for (let y = box[1]; y <= box[4]; y++) for (let z = box[2]; z <= box[5]; z++) for (let x = box[0]; x <= box[3]; x++) {
    if (test && !test(x, y, z, w)) continue;
    const o = pick(x, y, z); if (!o) continue;
    list.push([x, y, z, o.id, o.meta]);
  }
  const n = weWrite(lp, list, label);
  return `${n.toLocaleString()} block${n === 1 ? '' : 's'} changed`;
}
// A direction word: me (where you look), north/south/east/west/up/down.
function weDir(lp, word) {
  const w = (word || 'me').toLowerCase();
  const map = { north: [0, 0, -1], n: [0, 0, -1], south: [0, 0, 1], s: [0, 0, 1], east: [1, 0, 0], e: [1, 0, 0], west: [-1, 0, 0], w: [-1, 0, 0], up: [0, 1, 0], u: [0, 1, 0], down: [0, -1, 0], d: [0, -1, 0] };
  if (map[w]) return map[w];
  const [lx, ly, lz] = lp.player.look();
  if (Math.abs(ly) > 0.7) return [0, Math.sign(ly), 0];
  return Math.abs(lx) > Math.abs(lz) ? [Math.sign(lx), 0, 0] : [0, 0, Math.sign(lz)];
}
// Turning a block a quarter turn clockwise (seen from above): facing bits for the common kinds.
function rotMeta(id, m, q) {
  const b = BLOCKS[id], k = T_SHAPE[id];
  for (let i = 0; i < q; i++) {
    if (k === SHAPE.STAIRS || k === SHAPE.GATE || k === SHAPE.DOOR || k === SHAPE.TRAPDOOR || k === SHAPE.LADDER || k === SHAPE.BED || k === SHAPE.FRAME || b.facingModel || (b.tex && b.tex.front && !b.f6)) m = (m & ~3) | ((m + 1) & 3);
    else if (k === SHAPE.SLAB && (m & 7) >= 2 && (m & 7) <= 5) m = (m & ~7) | (2 + (((m & 7) - 2 + 1) & 3));
    else if (b.axisBlock || k === SHAPE.ROD) { const a = m & 3; if (a === 1) m = (m & ~3) | 2; else if (a === 2) m = (m & ~3) | 1; }
    else if (b.render === RENDER.TORCH && (m & 7)) m = (m & ~7) | ({ 1: 3, 3: 2, 2: 4, 4: 1 }[m & 7]);
    else if (b.f6) { const d = m & 7; if (d >= 2) m = (m & ~7) | H2D6[(D62H[d] + 1) & 3]; }
  }
  return m;
}
const WE_COMMANDS = {
  wand: { usage: '', desc: 'Get the selection wand (left click: corner 1, right click: corner 2)', run(lp) { lp.give(mkStack('we_wand', 1)); return 'Left click a block for corner 1, right click for corner 2'; } },
  pos1: { usage: '', desc: 'Corner 1 where you stand', run(lp) { const p = lp.player; weState(lp).pos1 = [Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)]; return 'Corner 1 set' + weSizeNote(lp); } },
  pos2: { usage: '', desc: 'Corner 2 where you stand', run(lp) { const p = lp.player; weState(lp).pos2 = [Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)]; return 'Corner 2 set' + weSizeNote(lp); } },
  hpos1: { usage: '', desc: 'Corner 1 at the block you look at', run(lp) { const t = lp.target; if (!t) return 'Look at a block'; weState(lp).pos1 = [t.x, t.y, t.z]; return 'Corner 1 set' + weSizeNote(lp); } },
  hpos2: { usage: '', desc: 'Corner 2 at the block you look at', run(lp) { const t = lp.target; if (!t) return 'Look at a block'; weState(lp).pos2 = [t.x, t.y, t.z]; return 'Corner 2 set' + weSizeNote(lp); } },
  sel: { usage: '', desc: 'Clear the selection', run(lp) { const s = weState(lp); s.pos1 = s.pos2 = null; return 'Selection cleared'; } },
  size: { usage: '', desc: 'Size of the selection', run(lp) { const b = weSel(lp); return `${b[3] - b[0] + 1} × ${b[4] - b[1] + 1} × ${b[5] - b[2] + 1} = ${volOf(b).toLocaleString()} blocks`; } },
  count: { usage: '<block>', desc: 'Count a block in the selection', run(lp, a) {
    const b = weSel(lp), id = resolveBlock(a[0]); if (id < 0) usage();
    const w = lp.g.world; let n = 0;
    for (let y = b[1]; y <= b[4]; y++) for (let z = b[2]; z <= b[5]; z++) for (let x = b[0]; x <= b[3]; x++) if (w.getBlock(x, y, z) === id) n++;
    return `${n.toLocaleString()} ${BLOCKS[id].name}`;
  } },
  set: { usage: '<pattern>', desc: 'Fill the selection (e.g. stone, or 70%stone,30%andesite)', run(lp, a) { const pat = parsePattern(a.join('')); if (!pat) usage(); if (pat.error) return pat.error; return weFill(lp, weSel(lp), () => pat.pick(), 'set'); } },
  replace: { usage: '<from> <to>', desc: 'Swap one block for another in the selection', run(lp, a) {
    const from = resolveBlock(a[0]), pat = parsePattern(a[1]); if (from < 0 || !pat) usage(); if (pat.error) return pat.error;
    return weFill(lp, weSel(lp), () => pat.pick(), 'replace', (x, y, z, w) => w.getBlock(x, y, z) === from);
  } },
  walls: { usage: '<pattern>', desc: 'Four walls round the selection', run(lp, a) {
    const pat = parsePattern(a.join('')); if (!pat) usage(); if (pat.error) return pat.error; const b = weSel(lp);
    return weFill(lp, b, () => pat.pick(), 'walls', (x, y, z) => x === b[0] || x === b[3] || z === b[2] || z === b[5]);
  } },
  faces: { usage: '<pattern>', desc: 'Every outside face of the selection (a hollow box)', run(lp, a) {
    const pat = parsePattern(a.join('')); if (!pat) usage(); if (pat.error) return pat.error; const b = weSel(lp);
    return weFill(lp, b, () => pat.pick(), 'faces', (x, y, z) => x === b[0] || x === b[3] || y === b[1] || y === b[4] || z === b[2] || z === b[5]);
  } },
  hollow: { usage: '', desc: 'Empty the inside of the selection, keeping a one-block shell', run(lp) {
    const b = weSel(lp); return weFill(lp, b, () => ({ id: 0, meta: 0 }), 'hollow', (x, y, z) => x > b[0] && x < b[3] && y > b[1] && y < b[4] && z > b[2] && z < b[5]);
  } },
  drain: { usage: '<radius>', desc: 'Remove water and lava around you', run(lp, a) {
    const r = clamp(Number(a[0] || 8) | 0, 1, 64), p = lp.player, cx = Math.floor(p.x), cy = Math.floor(p.y), cz = Math.floor(p.z);
    return weFill(lp, [cx - r, cy - r, cz - r, cx + r, cy + r, cz + r], (x, y, z) => ({ id: 0, meta: 0 }), 'drain', (x, y, z, w) => T_LIQUID[w.getBlock(x, y, z)] && Math.hypot(x - cx, y - cy, z - cz) <= r);
  } },
  sphere: { usage: '<pattern> <radius>', desc: 'A ball centred on you', run(lp, a) { return weBall(lp, a, false); } },
  hsphere: { usage: '<pattern> <radius>', desc: 'A hollow ball', run(lp, a) { return weBall(lp, a, true); } },
  cyl: { usage: '<pattern> <radius> [height]', desc: 'A cylinder standing on you', run(lp, a) { return weCyl(lp, a, false); } },
  hcyl: { usage: '<pattern> <radius> [height]', desc: 'A hollow cylinder', run(lp, a) { return weCyl(lp, a, true); } },
  pyramid: { usage: '<pattern> <size>', desc: 'A pyramid standing on you', run(lp, a) {
    const pat = parsePattern(a[0]), n = clamp(Number(a[1]) | 0, 1, 100); if (!pat || !n) usage(); if (pat.error) return pat.error;
    const p = lp.player, cx = Math.floor(p.x), cy = Math.floor(p.y), cz = Math.floor(p.z);
    return weFill(lp, [cx - n, cy, cz - n, cx + n, cy + n, cz + n], () => pat.pick(), 'pyramid', (x, y, z) => Math.max(Math.abs(x - cx), Math.abs(z - cz)) <= n - (y - cy));
  } },
  copy: { usage: '', desc: 'Copy the selection (relative to where you stand)', run(lp) {
    const b = weSel(lp), w = lp.g.world, p = lp.player, s = weState(lp);
    if (volOf(b) > WE_MAX) return 'Too big to copy';
    const ox = Math.floor(p.x), oy = Math.floor(p.y), oz = Math.floor(p.z), data = [];
    for (let y = b[1]; y <= b[4]; y++) for (let z = b[2]; z <= b[5]; z++) for (let x = b[0]; x <= b[3]; x++) data.push(x - ox, y - oy, z - oz, w.getBlock(x, y, z), w.getMeta(x, y, z));
    s.clip = { data }; return `${(data.length / 5).toLocaleString()} blocks copied`;
  } },
  cut: { usage: '', desc: 'Copy, then clear the selection', run(lp) { WE_COMMANDS.copy.run(lp); return weFill(lp, weSel(lp), () => ({ id: 0, meta: 0 }), 'cut') + ' (cut)'; } },
  paste: { usage: '[-a]', desc: 'Paste where you stand (-a: leave out air)', run(lp, a) {
    const s = weState(lp); if (!s.clip) return 'Nothing copied yet';
    const p = lp.player, ox = Math.floor(p.x), oy = Math.floor(p.y), oz = Math.floor(p.z), skipAir = a.includes('-a'), d = s.clip.data, list = [];
    for (let i = 0; i < d.length; i += 5) { if (skipAir && !d[i + 3]) continue; list.push([ox + d[i], oy + d[i + 1], oz + d[i + 2], d[i + 3], d[i + 4]]); }
    const n = weWrite(lp, list, 'paste'); return `${n.toLocaleString()} blocks pasted`;
  } },
  rotate: { usage: '<90|180|270>', desc: 'Turn what you copied (round the up axis)', run(lp, a) {
    const s = weState(lp); if (!s.clip) return 'Nothing copied yet';
    const q = (((Number(a[0]) / 90) | 0) % 4 + 4) % 4; const d = s.clip.data;
    for (let i = 0; i < d.length; i += 5) { for (let k = 0; k < q; k++) { const x = d[i], z = d[i + 2]; d[i] = -z; d[i + 2] = x; } d[i + 4] = rotMeta(d[i + 3], d[i + 4], q); }
    return 'Turned ' + q * 90 + '°';
  } },
  flip: { usage: '[x|y|z]', desc: 'Mirror what you copied', run(lp, a) {
    const s = weState(lp); if (!s.clip) return 'Nothing copied yet';
    const ax = { x: 0, y: 1, z: 2 }[(a[0] || 'x').toLowerCase()] ?? 0, d = s.clip.data;
    for (let i = 0; i < d.length; i += 5) d[i + ax] = -d[i + ax];
    return 'Flipped';
  } },
  move: { usage: '<distance> [direction]', desc: 'Shift the selection', run(lp, a) {
    const n = Number(a[0]) | 0; if (!n) usage(); const [dx, dy, dz] = weDir(lp, a[1]), b = weSel(lp), w = lp.g.world, list = [], s = weState(lp);
    if (volOf(b) > WE_MAX / 2) return 'Too big to move';
    const keep = [];
    for (let y = b[1]; y <= b[4]; y++) for (let z = b[2]; z <= b[5]; z++) for (let x = b[0]; x <= b[3]; x++) { keep.push([x, y, z, w.getBlock(x, y, z), w.getMeta(x, y, z)]); list.push([x, y, z, 0, 0]); }
    for (const [x, y, z, id, m] of keep) list.push([x + dx * n, y + dy * n, z + dz * n, id, m]);
    const r = weWrite(lp, list, 'move');
    s.pos1 = [s.pos1[0] + dx * n, s.pos1[1] + dy * n, s.pos1[2] + dz * n]; s.pos2 = [s.pos2[0] + dx * n, s.pos2[1] + dy * n, s.pos2[2] + dz * n];
    return `${r.toLocaleString()} blocks changed`;
  } },
  stack: { usage: '<times> [direction]', desc: 'Repeat the selection', run(lp, a) {
    const n = clamp(Number(a[0]) | 0, 1, 64), [dx, dy, dz] = weDir(lp, a[1]), b = weSel(lp), w = lp.g.world, list = [];
    const sx = (b[3] - b[0] + 1) * dx, sy = (b[4] - b[1] + 1) * dy, sz = (b[5] - b[2] + 1) * dz;
    if (volOf(b) * n > WE_MAX) return 'Too big';
    for (let y = b[1]; y <= b[4]; y++) for (let z = b[2]; z <= b[5]; z++) for (let x = b[0]; x <= b[3]; x++) {
      const id = w.getBlock(x, y, z), m = w.getMeta(x, y, z);
      for (let k = 1; k <= n; k++) list.push([x + sx * k, y + sy * k, z + sz * k, id, m]);
    }
    return `${weWrite(lp, list, 'stack').toLocaleString()} blocks changed`;
  } },
  expand: { usage: '<amount> [direction|vert]', desc: 'Grow the selection', run(lp, a) { return weResize(lp, a, 1); } },
  contract: { usage: '<amount> [direction]', desc: 'Shrink the selection', run(lp, a) { return weResize(lp, a, -1); } },
  undo: { usage: '[times]', desc: 'Take back the last edit', run(lp, a) {
    const s = weState(lp), n = clamp(Number(a[0] || 1) | 0, 1, 12); let done = 0;
    for (let k = 0; k < n && s.undo.length; k++) { const e = s.undo.pop(); s.redo.push(weReplay(lp, e, true)); done++; }
    return done ? `Undid ${done} edit${done > 1 ? 's' : ''}` : 'Nothing to undo';
  } },
  redo: { usage: '[times]', desc: 'Put an undone edit back', run(lp, a) {
    const s = weState(lp), n = clamp(Number(a[0] || 1) | 0, 1, 12); let done = 0;
    for (let k = 0; k < n && s.redo.length; k++) { const e = s.redo.pop(); s.undo.push(weReplay(lp, e, false)); done++; }
    return done ? `Redid ${done} edit${done > 1 ? 's' : ''}` : 'Nothing to redo';
  } },
};
function weSizeNote(lp) { const s = weState(lp); if (!s.pos1 || !s.pos2) return ''; return ` (${volOf(boxOf(s.pos1, s.pos2)).toLocaleString()} blocks selected)`; }
function weBall(lp, a, hollow) {
  const pat = parsePattern(a[0]), r = Number(a[1]); if (!pat || !(r > 0) || r > 60) usage(); if (pat.error) return pat.error;
  const p = lp.player, cx = Math.floor(p.x), cy = Math.floor(p.y), cz = Math.floor(p.z), R = Math.ceil(r);
  return weFill(lp, [cx - R, cy - R, cz - R, cx + R, cy + R, cz + R], () => pat.pick(), hollow ? 'hsphere' : 'sphere', (x, y, z) => { const d = Math.hypot(x - cx, y - cy, z - cz); return d <= r + 0.5 && (!hollow || d > r - 0.5); });
}
function weCyl(lp, a, hollow) {
  const pat = parsePattern(a[0]), r = Number(a[1]), h = clamp(Number(a[2] || 1) | 0, 1, CH); if (!pat || !(r > 0) || r > 100) usage(); if (pat.error) return pat.error;
  const p = lp.player, cx = Math.floor(p.x), cy = Math.floor(p.y), cz = Math.floor(p.z), R = Math.ceil(r);
  return weFill(lp, [cx - R, cy, cz - R, cx + R, cy + h - 1, cz + R], () => pat.pick(), hollow ? 'hcyl' : 'cyl', (x, y, z) => { const d = Math.hypot(x - cx, z - cz); return d <= r + 0.5 && (!hollow || d > r - 0.5); });
}
function weResize(lp, a, sign) {
  const n = Number(a[0]) | 0, s = weState(lp); if (!n) usage(); weSel(lp);
  const b = boxOf(s.pos1, s.pos2);
  if ((a[1] || '').toLowerCase() === 'vert') { b[1] = 0; b[4] = CH - 1; }
  else {
    const [dx, dy, dz] = weDir(lp, a[1]);
    const ax = dx ? 0 : dy ? 1 : 2, dir = dx || dy || dz;
    if (dir > 0) b[3 + ax] += n * sign; else b[ax] -= n * sign;
  }
  s.pos1 = [b[0], b[1], b[2]]; s.pos2 = [b[3], b[4], b[5]];
  return 'Selection: ' + volOf(b).toLocaleString() + ' blocks';
}
// Apply an undo record (backwards) or a redo record; returns the record for the other stack.
function weReplay(lp, e, back) {
  const g = lp.g, w = g.world, d = e.data, touched = new Set(), rev = [];
  for (let i = 0; i < d.length; i += 5) {
    const x = d[i], y = d[i + 1], z = d[i + 2], c = w.ensureChunk(x >> 4, z >> 4), k = cidx(x & 15, y, z & 15);
    rev.push(x, y, z, c.blocks[k], c.meta[k]);
    c.blocks[k] = d[i + 3]; c.meta[k] = d[i + 4];
    if (d[i + 3] && y + 1 > c.maxY) c.maxY = y + 1;
    if (c.blockEntities.has(k)) c.blockEntities.delete(k);
    touched.add(c);
  }
  for (const c of touched) { c.modified = true; c.dirty = true; c.tickables = null; c.rsTick = null; w.markRemesh(c, 0, 0, true); w.markRemesh(c, 15, 15, true); }
  void back;
  return { label: e.label, data: rev };
}

// The wand, and what the renderer outlines.
Object.assign(LocalPlayer.prototype, {
  weClick(which) {
    const t = this.target; if (!t) return;
    const s = weState(this);
    s[which === 1 ? 'pos1' : 'pos2'] = [t.x, t.y, t.z];
    this.chatMsg(`Corner ${which}: ${t.x} ${t.y} ${t.z}` + weSizeNote(this), 'ok');
    this.swingArm(); this.g.sfx.play('click');
  },
  weBoxes() {
    const s = this.we; if (!s || (!s.pos1 && !s.pos2)) return null;
    const out = [];
    if (s.pos1 && s.pos2) { const b = boxOf(s.pos1, s.pos2); out.push([b[0], b[1], b[2], b[3] + 1, b[4] + 1, b[5] + 1]); }
    for (const c of [s.pos1, s.pos2]) if (c) out.push([c[0], c[1], c[2], c[0] + 1, c[1] + 1, c[2] + 1]);
    return out;
  },
});
