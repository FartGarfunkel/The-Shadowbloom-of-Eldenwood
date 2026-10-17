// ---------------------------------------------------------------------------
// game/metals.js — 0.9: more ores, and the metals and tiers that come of them.
//
//   silver     iron pick or better, y 5–40      tools a touch better than iron, and they
//                                                bite undead (ghouls, skeletons, wraiths) half again
//   steel      iron and two coal make a steel blend; smelt it        the tier beside diamond
//   mithril    steel or diamond pick, y 3–18, rare   light, fast and very hard-wearing
//   adamantite mithril pick, y 2–10, very rare      the strongest there is
//   ruby, sapphire  iron pick, y 4–26               gems (for magic, and trade)
//
// Each metal has its tools (pickaxe, axe, shovel, sword, hoe), its armour and
// a storage block. Tiers in order: wood, stone, copper, bronze, iron, silver,
// steel ≈ diamond, mithril, cinderite, adamantite.
// ---------------------------------------------------------------------------
const NEW_TIERS = {
  silver: { label: 'Silver', tier: 3, speed: 7, durability: 280, damage: 6, mat: 'silver_ingot', holy: true, cols: ['#e8eef4', '#9aa4b0', '#ffffff'] },
  steel: { label: 'Steel', tier: 4, speed: 7.5, durability: 1100, damage: 7, mat: 'steel_ingot', cols: ['#b8c0c8', '#5e6670', '#e4eaf0'] },
  mithril: { label: 'Mithril', tier: 5, speed: 11, durability: 2600, damage: 8, mat: 'mithril_ingot', cols: ['#7ad0f0', '#2a6a9a', '#d8f8ff'] },
  adamantite: { label: 'Adamantite', tier: 6, speed: 12, durability: 3800, damage: 9, mat: 'adamantite_ingot', cols: ['#5ac08a', '#1e5a3a', '#b8f0d0'] },
};
const NEW_ARMOR = {
  silver: { label: 'Silver', mat: 'silver_ingot', pts: [2, 6, 5, 3], dur: 17 },
  steel: { label: 'Steel', mat: 'steel_ingot', pts: [3, 7, 6, 3], dur: 28 },
  mithril: { label: 'Mithril', mat: 'mithril_ingot', pts: [3, 9, 7, 3], dur: 40 },   // (0.9.0.25) each tier past diamond is better
  adamantite: { label: 'Adamantite', mat: 'adamantite_ingot', pts: [4, 10, 8, 3], dur: 50 },
};
{
  for (const [tk, t] of Object.entries(NEW_TIERS)) {
    TIERS[tk] = t;
    for (const [kk, k] of Object.entries(TOOL_KINDS)) {
      defItem(tk + '_' + kk, { name: t.label + ' ' + k.label, maxStack: 1, icon: tk + '_' + kk, tool: { type: k.type, tier: t.tier, speed: t.speed, damage: Math.max(1, t.damage + k.dmg), durability: t.durability }, holy: t.holy });
      RECIPES.push({ out: tk + '_' + kk, n: 1, shape: TOOL_SHAPES[kk], key: { M: t.mat, S: 'stick' }, group: 'tools' });
    }
  }
  for (const [mk, m] of Object.entries(NEW_ARMOR)) {
    ARMOR_MATS[mk] = m;
    for (const p of ARMOR_PIECES) {
      defItem(mk + '_' + p.key, { name: m.label + ' ' + p.label, maxStack: 1, icon: mk + '_' + p.key, armor: { slot: p.slot, points: m.pts[p.slot], durability: m.dur * p.durMul } });
      RECIPES.push({ out: mk + '_' + p.key, n: 1, shape: ARMOR_SHAPES[p.slot], key: { M: m.mat }, group: 'armor' });
    }
  }
  defItem('silver_ingot', { name: 'Silver Ingot' });
  defItem('steel_blend', { name: 'Steel Blend', desc: 'Iron and coal, ready for the furnace.' });
  defItem('steel_ingot', { name: 'Steel Ingot' });
  defItem('mithril_ingot', { name: 'Mithril Ingot', rarity: 'rare' });
  defItem('adamantite_ingot', { name: 'Adamantite Ingot', rarity: 'epic' });
  defItem('ruby', { name: 'Ruby', rarity: 'rare' });
  defItem('sapphire', { name: 'Sapphire', rarity: 'rare' });
  RECIPES.push({ out: 'steel_blend', n: 1, items: ['iron_ingot', 'coal', 'coal'] }, { out: 'steel_blend', n: 1, items: ['iron_ingot', 'charcoal', 'charcoal'] });
  for (const [blk, it] of [['silver_block', 'silver_ingot'], ['steel_block', 'steel_ingot'], ['mithril_block', 'mithril_ingot'], ['adamantite_block', 'adamantite_ingot'], ['ruby_block', 'ruby'], ['sapphire_block', 'sapphire']]) {
    RECIPES.push({ out: blk, n: 1, shape: ['MMM', 'MMM', 'MMM'], key: { M: it } }, { out: it, n: 9, items: [blk] });
  }
  Object.assign(SMELTING, { silver_ore: 'silver_ingot', mithril_ore: 'mithril_ingot', adamantite_ore: 'adamantite_ingot', steel_blend: 'steel_ingot' });
  // silver bites the undead
  const UNDEAD = /ghoul|skeleton|stray|husk|drowned|wraith|zombie/;
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const d = src.weapon && itemDef(src.weapon);
    if (d && d.holy && (UNDEAD.test(this.type) || this.T.undead)) { amount *= 1.5; if (this.game) this.game.burst(this.x, this.y + this.h * 0.6, this.z, 'sparkle', 5, 0.6); }
    return baseHurt.call(this, amount, src);
  };
}
// ---- the pictures --------------------------------------------------------------------------------------
{
  for (const [tk, t] of Object.entries(NEW_TIERS)) TOOL_TIER_COLORS[tk] = [hexRGB(t.cols[0]), hexRGB(t.cols[1])];
  for (const [tk, t] of Object.entries(NEW_TIERS)) ARMOR_COLORS[tk] = [hexRGB(t.cols[0]), hexRGB(t.cols[1]), hexRGB(t.cols[2])];
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB;
    const SR = ramp('#8b8c90', 8, 0.55), DR = ramp('#4d5360', 8, 0.55);
    const T = (name, f) => addTile(name, f, 0, undefined, GR);
    for (const [k, hex, baseR, o] of [['silver_ore', '#e8eef4', SR, { n: 4 }], ['mithril_ore', '#6ac8f0', DR, { n: 3 }], ['adamantite_ore', '#4ac080', DR, { n: 3 }],
      ['ruby_ore', '#e02a4a', SR, { n: 3, gem: true, facets: true }], ['sapphire_ore', '#2a5ae0', SR, { n: 3, gem: true, facets: true }]]) T(k, p => gOre(p, baseR, hex, o));
    for (const [k, hex] of [['silver_block', '#dfe6ee'], ['steel_block', '#a8b0b8'], ['mithril_block', '#7ad0f0'], ['adamantite_block', '#4ab07a']]) T(k, p => gMetal(p, ramp(hex, 8, 0.5)));
    for (const [k, hex] of [['ruby_block', '#d02a4a'], ['sapphire_block', '#2a5ad0']]) T(k, p => gGemBlock(p, ramp(hex, 8, 0.55)));
    // ingots, gems and the blend
    for (const [k, c] of [['silver_ingot', NEW_TIERS.silver.cols], ['steel_ingot', NEW_TIERS.steel.cols], ['mithril_ingot', NEW_TIERS.mithril.cols], ['adamantite_ingot', NEW_TIERS.adamantite.cols]])
      addItem(k, p => p.art(ART.ingot, { A: H(c[0]), a: H(c[1]), L: H(c[2]) }));
    addItem('steel_blend', p => p.art(ART.lump, { A: H('#6a6e74'), a: H('#2a2c30'), L: H('#c8ccd2') }));
    addItem('ruby', p => p.art(ART.gem, { A: H('#e02a4a'), a: H('#8a0e22'), L: H('#ffc0cc') }));
    addItem('sapphire', p => p.art(ART.gem, { A: H('#2a5ae0'), a: H('#0e2a8a'), L: H('#c0d0ff') }));
    // hoes, and armour as worn
    for (const [tk, t] of Object.entries(NEW_TIERS)) {
      addItem(tk + '_hoe', p => p.art(HOE_ART, Object.assign({ H: H(t.cols[0]), h: H(t.cols[1]), g: H('#5a3d1f') }, STICK_PAL)));
      const [c, d, l] = t.cols;
      const plate = (p) => {
        p.noise(H(c), 0.1);
        for (let x = 0; x < 16; x++) { p.set(x, 0, H(l)); p.set(x, 15, H(d)); p.set(x, 7, shade(H(d), 1.1)); }
        for (let y = 0; y < 16; y++) { p.set(0, y, H(l)); p.set(15, y, H(d)); }
        for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) p.set(x, y, H(l));
      };
      addTile('armor_' + tk, plate);
      addTile('armor_' + tk + '_face', p => { plate(p); for (let y = 4; y < 15; y++) for (let x = 3; x < 13; x++) p.set(x, y, [0, 0, 0], 0); });
    }
  };
}
// ---- in the ground -----------------------------------------------------------------------------------------
{
  const base = WorldGen.prototype.placeOres;
  WorldGen.prototype.placeOres = function (ch, rnd) {
    base.call(this, ch, rnd);
    if (this.dim !== 0) return;
    const veins = [[B.silver_ore, 3, 5, 5, 40], [B.mithril_ore, 0.7, 4, 3, 18], [B.adamantite_ore, 0.25, 3, 2, 10], [B.ruby_ore, 0.6, 3, 4, 26], [B.sapphire_ore, 0.6, 3, 4, 26]];
    for (const [id, count, size, ymin, ymax] of veins) {
      const n = Math.floor(count) + (rnd() < count % 1 ? 1 : 0);
      for (let v = 0; v < n; v++) {
        let x = rnd() * 16, y = ymin + rnd() * (ymax - ymin), z = rnd() * 16;
        for (let k = 0; k < size; k++) {
          const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
          if (ix >= 0 && ix < 16 && iz >= 0 && iz < 16 && iy > 0 && iy < CH) { const i = cidx(ix, iy, iz); if (ch.blocks[i] === B.stone || ch.blocks[i] === B.slate) ch.blocks[i] = id; }
          x += rnd() * 2 - 1; y += rnd() * 2 - 1; z += rnd() * 2 - 1;
        }
      }
    }
  };
}
