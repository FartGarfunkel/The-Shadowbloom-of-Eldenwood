// ---------------------------------------------------------------------------
// game/dyeing.js — 0.8.6.4: dyeing in the crafting grid.
//
// A bed, wool, carpet, terracotta, glass or candle with a dye takes that
// colour (the loom still does eight at a time). Leather armour takes any dye,
// and dyes mix: dye a red tunic with yellow and it comes out orange. You see
// the colour when it's worn.
// ---------------------------------------------------------------------------
const DYE_HEX = Object.fromEntries(COLORS.map(c => [c[0], c[2]]));
function dyeMix(cols) {
  let r = 0, g = 0, b = 0, mx = 0;
  for (const h of cols) { const c = hexRGB(h); r += c[0]; g += c[1]; b += c[2]; mx += Math.max(c[0], c[1], c[2]); }
  const n = cols.length, avgMax = mx / n; r /= n; g /= n; b /= n;
  const k = avgMax / Math.max(1, Math.max(r, g, b));      // keep it as bright as the dyes were
  const to = (v) => Math.round(clamp(v * k, 0, 255)).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}
{
  const baseMatch = matchGrid;
  matchGrid = function (slots, W) {
    const items = slots.filter(Boolean);
    const dyes = items.filter(s => { const d = itemDef(s.id); return d && d.dye; });
    const rest = items.filter(s => { const d = itemDef(s.id); return !(d && d.dye); });
    if (dyes.length && rest.length === 1) {
      const a = rest[0], da = itemDef(a.id);
      // leather armour: any number of dyes, mixed together (and with the colour it already has)
      if (da && da.armor && a.id.startsWith('leather_')) {
        const cols = dyes.map(s => DYE_HEX[itemDef(s.id).dye]).filter(Boolean);
        if (a.col) cols.push(a.col);
        const col = dyeMix(cols);
        return { out: a.id, n: 1, idx: -1, w: 1, h: 1, extra: Object.assign({}, a.d ? { d: a.d } : {}, { col }) };
      }
      // one block and one dye: that block in that colour
      if (dyes.length === 1) {
        const to = typeof recolorKey === 'function' ? recolorKey(a.id, itemDef(dyes[0].id).dye) : null;
        if (to) return { out: to, n: 1, idx: -1, w: 1, h: 1 };
      }
    }
    return baseMatch(slots, W);
  };
  const baseNorm = normalizeStack;
  normalizeStack = function (s) { const o = baseNorm(s); if (o && s && typeof s.col === 'string' && /^#[0-9a-f]{6}$/i.test(s.col)) o.col = s.col; return o; };
  const baseMerge = canMerge;
  canMerge = function (a, b) { return baseMerge(a, b) && (a.col || null) === (b.col || null); };
  const baseInfo = itemInfoHTML;
  itemInfoHTML = function (s) { let h = baseInfo(s); if (s && s.col) h += `<div class="ts"><span style="display:inline-block;width:10px;height:10px;background:${s.col};border:1px solid #000;vertical-align:middle"></span> Dyed</div>`; return h; };
}
