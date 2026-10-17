// ---------------------------------------------------------------------------
// game/inventory.js — item stacks and containers.
// A stack is a plain object: { id, n, d?, c? }
//   id: item key   n: count   d: durability used   c: contents (array of stacks|null)
// Plain objects serialize straight into saves.
// ---------------------------------------------------------------------------

function mkStack(id, n = 1, extra) { return Object.assign({ id, n }, extra || {}); }
function cloneStack(s) { return s ? JSON.parse(JSON.stringify(s)) : null; }
function canMerge(a, b) {
  return a && b && a.id === b.id && !a.c && !b.c && !a.d && !b.d && maxStackOf(a.id) > 1;
}
function itemName(s) { const d = itemDef(s.id); return d ? d.name : s.id; }

class Container {
  constructor(size, slots) {
    this.slots = new Array(size).fill(null);
    if (slots) for (let i = 0; i < Math.min(size, slots.length); i++) this.slots[i] = slots[i] ? normalizeStack(slots[i]) : null;
  }
  get size() { return this.slots.length; }
  // Adds as much as fits; returns leftover count (stack.n is mutated).
  add(stack, order) {
    const idx = order || this.slots.map((_, i) => i);
    const max = maxStackOf(stack.id);
    if (max > 1 && !stack.c && !stack.d) {
      for (const i of idx) {
        const s = this.slots[i];
        if (s && canMerge(s, stack) && s.n < max) {
          const k = Math.min(max - s.n, stack.n); s.n += k; stack.n -= k;
          if (!stack.n) return 0;
        }
      }
    }
    for (const i of idx) {
      if (!this.slots[i]) {
        const k = Math.min(max, stack.n);
        this.slots[i] = Object.assign({}, stack, { n: k });
        stack.n -= k;
        if (!stack.n) return 0;
      }
    }
    return stack.n;
  }
  count(id) { let n = 0; for (const s of this.slots) if (s && s.id === id) n += s.n; return n; }
  remove(id, n) {
    for (let i = this.slots.length - 1; i >= 0 && n > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id && !s.c) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) this.slots[i] = null; }
    }
    return n;
  }
  toJSON() { return this.slots.map(cloneStack); }
}

function normalizeStack(s) {
  if (!s || !s.id) return null;
  const id = itemDef(s.id) ? s.id : (ITEM_ALIASES[s.id] || s.id);
  const out = { id, n: Math.max(1, s.n | 0) };
  if (s.d) out.d = s.d;
  if (s.g) out.g = s.g;
  if (s.c) out.c = s.c.map(x => x ? normalizeStack(x) : null);
  return out;
}

// Player inventory = 36 main slots (0-8 hotbar) + slots of an equipped backpack,
// plus an off hand and a belt hook (a lantern or torch hung there lights the way).
class PlayerInventory {
  constructor() {
    this.main = new Container(36);
    this.armor = new Container(4);
    this.back = new Container(1);     // backpack slot
    this.off = new Container(1);      // off hand
    this.hook = new Container(1);     // belt / backpack hook
    this.charm = new Container(1);    // a charm worn on the belt
    this.cape = new Container(1);     // a cape over the shoulders
    this.ender = new Container(27);   // what every ender chest opens onto
    this.selected = 0;
  }
  get offhand() { return this.off.slots[0]; }
  set offhand(s) { this.off.slots[0] = s; }
  // Brightest light this person carries (held, off hand or hooked), 0..15.
  carriedLight() {
    let l = 0;
    for (const s of [this.held, this.off.slots[0], this.hook.slots[0]]) if (s) l = Math.max(l, itemLight(s.id));
    return l;
  }
  backpackSlots() {
    const b = this.back.slots[0];
    if (!b) return null;
    const def = itemDef(b.id);
    if (!def || !def.backpack) return null;
    if (!b.c || b.c.length !== def.backpack) { const old = b.c || []; b.c = new Array(def.backpack).fill(null); old.forEach((s, i) => { if (i < b.c.length) b.c[i] = s; }); }
    return b.c;
  }
  // Order: hotbar, main, then backpack.
  add(stack) {
    let left = this.main.add(stack);
    if (left > 0) {
      const bp = this.backpackSlots();
      if (bp) { const tmp = new Container(0); tmp.slots = bp; left = tmp.add(stack); }
    }
    return left;
  }
  count(id) {
    let n = this.main.count(id);
    const bp = this.backpackSlots();
    if (bp) for (const s of bp) if (s && s.id === id) n += s.n;
    return n;
  }
  countTag(key) { return key.startsWith('#') ? TAGS[key].reduce((a, k) => a + this.count(k), 0) : this.count(key); }
  remove(id, n) {
    const bp = this.backpackSlots();
    if (bp) { const tmp = new Container(0); tmp.slots = bp; n = tmp.remove(id, n); }
    return this.main.remove(id, n);
  }
  removeTag(key, n) {
    if (!key.startsWith('#')) return this.remove(key, n);
    for (const k of TAGS[key]) { n = this.remove(k, n); if (!n) break; }
    return n;
  }
  get held() { return this.main.slots[this.selected]; }
  set held(s) { this.main.slots[this.selected] = s; }
  armorPoints() {
    let p = 0;
    for (const s of this.armor.slots) if (s) { const d = itemDef(s.id); if (d && d.armor) p += d.armor.points; }
    return p;
  }
  fireResist() {
    let r = this.charmBonus('fire');
    for (const s of this.armor.slots) if (s) { const d = itemDef(s.id); if (d && d.armor) r += d.armor.fireResist || 0; }
    return Math.min(0.9, r);
  }
  // What the belt charm gives: hearts, fire (resistance), breath (air lasts n times longer), fall (damage taken).
  charmBonus(kind) {
    const s = this.charm.slots[0], d = s && itemDef(s.id);
    return d && d.charm && d.charm[kind] ? d.charm[kind] : 0;
  }
  toJSON() { return { main: this.main.toJSON(), armor: this.armor.toJSON(), back: this.back.toJSON(), off: this.off.toJSON(), hook: this.hook.toJSON(), charm: this.charm.toJSON(), cape: this.cape.toJSON(), ender: this.ender.toJSON(), selected: this.selected }; }
  load(o) {
    if (!o) return;
    this.main = new Container(36, o.main);
    this.armor = new Container(4, o.armor);
    this.back = new Container(1, o.back);
    this.off = new Container(1, o.off);
    this.hook = new Container(1, o.hook);
    this.charm = new Container(1, o.charm);
    this.cape = new Container(1, o.cape);
    this.ender = new Container(27, o.ender);
    this.selected = clamp(o.selected | 0, 0, 8);
  }
}

// ---- crafting ------------------------------------------------------------------
// Can the player make recipe r from what they carry (plus what sits in `grid`)?
function recipeMissing(inv, r, grid) {
  const miss = {};
  for (const [k, n] of recipeIngredients(r)) {
    let have = inv.countTag(k);
    if (grid) for (const s of grid) if (s && tagMatch(k, s.id)) have += s.n;
    if (have < n) miss[k] = n - have;
  }
  return miss;
}
function canCraft(inv, r, grid) { return Object.keys(recipeMissing(inv, r, grid)).length === 0; }
function ingredientLabel(key) {
  if (key === '#log') return 'Any Log';
  if (key === '#planks') return 'Any Planks';
  if (key === '#wood_slab') return 'Any Wooden Slab';
  if (key === '#wool') return 'Any Wool';
  if (key === '#sand') return 'Any Sand';
  if (key === '#stone_tool') return 'Cobblestone or Blackstone';
  if (key === '#leaves') return 'Any Leaves';
  if (key === '#coal') return 'Coal or Charcoal';
  const d = itemDef(key); return d ? d.name : key;
}
function ingredientIcon(key) { return key.startsWith('#') ? TAGS[key][0] : key; }
