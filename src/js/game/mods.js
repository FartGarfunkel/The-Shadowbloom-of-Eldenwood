// ---------------------------------------------------------------------------
// game/mods.js — 0.9.0.29: mods and plugins.
//
// A mod is a .js file that adds to the game: commands, items, recipes, and
// code that runs when things happen (a block broken, a creature slain, a
// player joining, every tick). A plugin is the same, for servers: it runs
// while this screen hosts a world (a dedicated server or a world opened to
// LAN), and hears the server's own events (joins, leaves, chat, start, stop).
// Options → Mods & plugins (and the server's Plugins tab) add, switch on and
// off, and remove them; they're kept with the game, in this browser/app.
//
// Writing one: the file is the body of a function given the API as `DQ`:
//   DQ.name = 'My mod';                       // how it's listed
//   DQ.command('hello', 'Say hello', (player, args) => 'Hello, ' + player.name);
//   DQ.item('ruby_ring', { name: 'Ruby Ring', icon: 'ruby', desc: 'Pretty.' });
//   DQ.recipe({ out: 'ruby_ring', n: 1, shape: [' R ', 'R R', ' R '], key: { R: 'ruby' } });
//   DQ.on('blockBreak', (player, x, y, z, key) => { if (key === 'diamond_ore') DQ.say(player.name + ' found diamonds!'); });
//   DQ.on('mobDeath', (mob, killer) => { ... });   DQ.on('tick', (dt) => { ... });
//   DQ.on('join', (name) => DQ.say('Welcome, ' + name));   DQ.on('chat', (name, text) => { ... });
//   DQ.world.getBlock(x, y, z) / DQ.world.setBlock(x, y, z, 'stone');   DQ.players() / DQ.give(name, 'apple', 3)
//   DQ.spawn('cow', x, y, z);   DQ.toast('Hi');   DQ.game (everything, for the brave)
// Mods run with the game's full trust: only add ones you trust.
// ---------------------------------------------------------------------------
const MODS = { list: [], hooks: {}, loaded: false, errors: {} };
const MODS_KEY = 'dokuquest.mods';
function modsStored() { try { return JSON.parse(localStorage.getItem(MODS_KEY) || '[]'); } catch (e) { return []; } }
function modsSave(list) { try { localStorage.setItem(MODS_KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
// an event goes to every running mod that listens for it; one that returns false cancels (where that means something)
function modEmit(ev, ...a) {
  const L = MODS.hooks[ev]; if (!L || !L.length) return undefined;
  let out;
  for (const h of L) {
    if (h.mod.kind === 'plugin' && !modsServing()) continue;
    try { const r = h.fn(...a); if (r === false) out = false; } catch (e) { modFault(h.mod, e); }
  }
  return out;
}
function modsServing() { const g = typeof GAME !== 'undefined' ? GAME : null; return !!(g && ((typeof SERVER !== 'undefined' && SERVER.on) || (g.net && g.net.role === 'host'))); }
function modFault(mod, e) { MODS.errors[mod.id] = String(e && e.message || e); if (!mod._warned) { mod._warned = true; console.warn('mod ' + mod.name, e); if (typeof serverLog === 'function') serverLog(`Plugin "${mod.name}" had a problem: ${e && e.message || e}`, 'warn'); } }
function modApi(g, mod) {
  const DQ = {
    get game() { return g; }, version: GAME_VERSION,
    set name(v) { mod.name = String(v).slice(0, 40); }, get name() { return mod.name; },
    on(ev, fn) { if (typeof fn === 'function') (MODS.hooks[ev] || (MODS.hooks[ev] = [])).push({ mod, fn }); },
    command(name, desc, fn) {
      if (!/^[a-z0-9_]{1,24}$/i.test(name) || typeof fn !== 'function') return;
      COMMANDS[name.toLowerCase()] = { cheat: !!mod.cheat, usage: '', desc: String(desc || '') + ' (' + mod.name + ')', run(lp, args) { try { const r = fn({ name: lp && lp.name, x: lp && lp.player.x, y: lp && lp.player.y, z: lp && lp.player.z, lp }, args || []); return r === undefined ? '' : String(r); } catch (e) { modFault(mod, e); return 'That went wrong: ' + (e.message || e); } } };
    },
    item(key, def) {
      if (!/^[a-z0-9_]{2,40}$/.test(key) || ITEMS[key]) return false;
      const d = Object.assign({ name: key }, def || {});
      if (d.icon && !ATLAS.tile[d.icon]) d.icon = undefined;
      defItem(key, d); return true;
    },
    recipe(r) { if (r && r.out && ITEMS[r.out]) { RECIPES.push(r); if (typeof prepRecipes === 'function') try { prepRecipes(); } catch (e) { /* prepared on use */ } return true; } return false; },
    world: {
      getBlock(x, y, z) { const w = g.world; if (!w) return null; const id = w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)); return BLOCKS[id] ? BLOCKS[id].key : null; },
      setBlock(x, y, z, key) { const w = g.world; if (!w || B[key] === undefined) return false; return w.setBlock(Math.floor(x), Math.floor(y), Math.floor(z), B[key], 0); },
    },
    players() { return g.pawns().filter(p => !p.serverPawn).map(p => ({ name: p.name || (p.player && p.player.name) || 'Player', x: p.x ?? p.player.x, y: p.y ?? p.player.y, z: p.z ?? p.player.z, dim: p.dim ?? g.dim })); },
    give(name, item, n = 1) {
      if (!ITEMS[item]) return false;
      const lp = g.locals.find(l => l.name === name); if (lp) { lp.give(mkStack(item, n)); return true; }
      const r = g.net && [...g.net.remotes.values()].find(q => q.name === name); if (r && r.give) { r.give(mkStack(item, n)); return true; }
      return false;
    },
    spawn(type, x, y, z) { if (!MOB_TYPES[type] || g.isGuest) return null; return g.addEntity(new Mob(g, type, x, y, z)); },
    say(text) { text = String(text).slice(0, 200); for (const l of g.locals) if (!l.serverPawn) l.chatMsg('<' + mod.name + '> ' + text); if (g.net && !g.isGuest) g.net.all({ t: 'chat', from: mod.name, text }); if (typeof serverLog === 'function' && typeof SERVER !== 'undefined' && SERVER.on) serverLog('<' + mod.name + '> ' + text, 'chat'); },
    toast(text) { for (const l of g.locals) if (!l.serverPawn) l.toast(String(text).slice(0, 200), ''); },
    time(v) { if (v !== undefined) g.meta.time = DAY_LEN * (+v % 1); return g.meta.time / DAY_LEN; },
    log(...a) { console.log('[' + mod.name + ']', ...a); if (typeof serverLog === 'function' && typeof SERVER !== 'undefined' && SERVER.on) serverLog('[' + mod.name + '] ' + a.join(' '), ''); },
  };
  return DQ;
}
function modsLoad(g) {
  if (MODS.loaded) return; MODS.loaded = true;
  MODS.list = modsStored();
  for (const mod of MODS.list) {
    if (!mod.enabled) continue;
    try { new Function('DQ', '"use strict";\n' + mod.code)(modApi(g, mod)); mod.ok = true; }
    catch (e) { mod.ok = false; modFault(mod, e); }
  }
}
// the game's own events, passed on
{
  const baseBoot = Game.prototype.openWorld;
  Game.prototype.openWorld = async function (...a) { modsLoad(this); const r = await baseBoot.apply(this, a); modEmit('worldOpen', this.meta && this.meta.name); return r; };
  const baseCreate = Game.prototype.createWorld;
  if (baseCreate) Game.prototype.createWorld = async function (...a) { modsLoad(this); const r = await baseCreate.apply(this, a); modEmit('worldOpen', this.meta && this.meta.name); return r; };
  const baseBreak = LocalPlayer.prototype.breakBlock;
  LocalPlayer.prototype.breakBlock = function (x, y, z) {
    const w = this.g.world, id = w.getBlock(x, y, z), r = baseBreak.call(this, x, y, z);
    if (id && w.getBlock(x, y, z) !== id && MODS.hooks.blockBreak) modEmit('blockBreak', { name: this.name, lp: this }, x, y, z, BLOCKS[id].key);
    return r;
  };
  const basePlace = LocalPlayer.prototype.placeBlock;
  LocalPlayer.prototype.placeBlock = function (hit, def, held) { const r = basePlace.call(this, hit, def, held); if (MODS.hooks.blockPlace && def) modEmit('blockPlace', { name: this.name, lp: this }, def.block); return r; };
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) { const r = baseDie.call(this, src); if (MODS.hooks.mobDeath) modEmit('mobDeath', { type: this.type, x: this.x, y: this.y, z: this.z, mob: this }, src && src.attacker && src.attacker.name ? src.attacker.name : null); return r; };
  const baseFrame = Game.prototype.frame;
  Game.prototype.frame = function (dt) { const r = baseFrame.call(this, dt); if (MODS.hooks.tick && this.state === 'playing') modEmit('tick', dt); return r; };
  // a host's (or a LAN world's) joins and chat, for plugins
  const baseHost = Net.prototype.hostMsg;
  Net.prototype.hostMsg = function (from, m) {
    if (m && m.t === 'chat' && MODS.hooks.chat && !(typeof SERVER !== 'undefined' && SERVER.on)) { const r = this.remotes.get('g' + from + ':' + (m.li || 0)); if (modEmit('chat', r ? r.name : 'Someone', String(m.text || '')) === false) return; }
    return baseHost.call(this, from, m);
  };
}
// ---- the list (Options → Mods & plugins, and the server's Plugins tab) -------------------------------------------------
function modsRender(g, box, kind) {
  const list = modsStored(), mine = kind ? list.filter(m => (m.kind || 'mod') === kind) : list;
  const word = kind === 'plugin' ? 'plugin' : 'mod or plugin';
  box.innerHTML = `<div class="mods">
    <p class="hint">${kind === 'plugin' ? 'Plugins run while this screen hosts a world (this server, or a world opened to LAN). ' : 'Mods add to the game; plugins run while you host. '}A ${word} is a .js file. They run with the game's full trust: only add ones you trust. Changes take effect the next time a world opens.</p>
    <div class="mods-list">${mine.length ? mine.map(m => `<div class="mod-row"><label class="sv-check"><input type="checkbox" data-on="${esc(m.id)}" ${m.enabled ? 'checked' : ''}> <b>${esc(m.name)}</b></label><span class="mod-kind">${m.kind === 'plugin' ? 'plugin' : 'mod'}</span>${MODS.errors[m.id] ? `<span class="mod-err">${esc(MODS.errors[m.id])}</span>` : ''}<button class="btn tiny danger" data-del="${esc(m.id)}">Remove</button></div>`).join('') : `<p class="hint">None yet.</p>`}</div>
    <div class="mods-add"><label class="btn" data-nav>Add a ${kind === 'plugin' ? 'plugin' : 'mod'} (.js)…<input type="file" accept=".js,text/javascript" hidden></label>
    ${kind ? '' : '<label class="sv-check"><input type="checkbox" id="mod-as-plugin"> it\'s a server plugin</label>'}
    <button class="btn ghost" data-a="example">Save an example</button></div>
    <p class="mods-msg" id="mods-msg"></p></div>`;
  const msg = (t) => { const m = box.querySelector('#mods-msg'); if (m) m.textContent = t; };
  for (const c of box.querySelectorAll('[data-on]')) c.onchange = () => { const L = modsStored(), m = L.find(x => x.id === c.dataset.on); if (m) { m.enabled = c.checked; modsSave(L); msg('Saved. It takes effect the next time a world opens.'); } };
  for (const b of box.querySelectorAll('[data-del]')) b.onclick = () => { const L = modsStored().filter(x => x.id !== b.dataset.del); modsSave(L); modsRender(g, box, kind); };
  const inp = box.querySelector('input[type=file]');
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    const code = await f.text();
    try { new Function('DQ', code); } catch (e) { msg('That file has an error in it: ' + e.message); return; }
    const plug = kind === 'plugin' || !!(box.querySelector('#mod-as-plugin') || {}).checked || /\bDQ\.plugin\s*=\s*true/.test(code);
    const nm = (code.match(/DQ\.name\s*=\s*['"]([^'"]{1,40})['"]/) || [])[1] || f.name.replace(/\.js$/i, '');
    const L = modsStored(); L.push({ id: 'm' + Date.now().toString(36), name: nm, kind: plug ? 'plugin' : 'mod', code, enabled: true, added: Date.now() });
    if (!modsSave(L)) { msg('There was no room to keep it (the file is too big).'); return; }
    modsRender(g, box, kind); msg(`Added "${nm}". It runs the next time a world opens.`);
  };
  box.querySelector('[data-a=example]').onclick = () => {
    const ex = MOD_EXAMPLE, a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ex], { type: 'text/javascript' })); a.download = kind === 'plugin' ? 'welcome-plugin.js' : 'example-mod.js'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
}
const MOD_EXAMPLE = `// An example Shadowbloom mod/plugin. Add it in Options -> Mods & plugins (or a server's Plugins tab).
DQ.name = 'Welcome & Diamonds';
// a command anyone can use: /roll
DQ.command('roll', 'Roll a die', (player, args) => player.name + ' rolls a ' + (1 + Math.floor(Math.random() * (+args[0] || 6))));
// tell everyone when someone finds diamonds
DQ.on('blockBreak', (player, x, y, z, key) => { if (key === 'diamond_ore') DQ.say(player.name + ' found diamonds!'); });
// greet people joining a server (plugins hear joins)
DQ.on('join', (name) => DQ.say('Welcome, ' + name + '! Type /roll to try your luck.'));
// a new item and its recipe
DQ.item('lucky_charm', { name: 'Lucky Charm', icon: 'emerald', desc: 'It does nothing. Probably.' });
DQ.recipe({ out: 'lucky_charm', n: 1, items: ['emerald', 'gold_nugget', 'string'] });
`;
{
  // the row in Options
  const baseBuild = UI.prototype.buildSettings;
  UI.prototype.buildSettings = function () {
    baseBuild.call(this);
    const g = this.g, box = $('#settings-grid'); if (!box) return;
    const row = document.createElement('div'); row.className = 'setting pack-setting';
    const n = modsStored().length;
    row.innerHTML = `<label>Mods &amp; plugins</label><span class="pack-btns"><button class="btn tiny" data-nav data-a="mods">Manage (${n})…</button></span><span class="desc">Add-on .js files: commands, items, recipes and more. Plugins run while you host a world or a server.</span>`;
    row.querySelector('[data-a=mods]').onclick = () => {
      const ov = document.createElement('div'); ov.className = 'server-view';
      ov.innerHTML = `<div class="sv-card"><header class="sv-head"><h2>Mods &amp; plugins</h2><button class="btn ghost" data-a="x">Done</button></header><div id="mods-box"></div></div>`;
      document.body.appendChild(ov);
      ov.addEventListener('keydown', (e) => e.stopPropagation());
      ov.querySelector('[data-a=x]').onclick = () => { ov.remove(); this.buildSettings(); };
      modsRender(g, ov.querySelector('#mods-box'), null);
    };
    box.appendChild(row);
  };
}
PV.debug.mods = { load: () => modsLoad(GAME), emit: (...a) => modEmit(...a), state: () => MODS };
