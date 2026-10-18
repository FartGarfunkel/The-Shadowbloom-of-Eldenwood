// ---------------------------------------------------------------------------
// game/dnd_monsters2.js — alpha 3: the D&D creatures of the mountain, the
// caverns, the plains, the desert and the peaks.
//
//   Mount Cinder and the Smoldering Pass (mountain)
//     magma_mephit           a cackling imp of molten rock: claws, a gout of fire, and it bursts when it dies
//     fire_elemental         a living column of flame: its touch sets you alight, its heat burns all near; water hurts it
//     salamander             a serpent-bodied fire warrior: a burning spear it thrusts or throws, and it coils round you
//     hell_hound             a fiendish hound that breathes fire and hunts in packs
//     gargoyle               a crouched statue on a ledge... until you come close; then it swoops
//     young_red_dragon       a world boss: wakes, takes wing, breathes a cone of fire, dives, lands to rend
//     magma_worm             a burrowing lava worm that bursts up out of the ground beneath you
//   Crystal Caverns of Lumina (caverns)
//     earth_elemental        a hulk of living rock: slams, hurls stone, sinks into the earth and rises beside you
//     xorn                   three arms, three eyes, a mouth on top: it smells the gems you carry and eats them
//     stone_golem            a carved guardian: slams, a bolt of force, and a gaze that slows
//     rust_monster           its antennae rust your metal weapon and armour away; it eats dropped iron
//     giant_bat              a great bat that finds you by sound, even unseen
//     crystal_sentinel       a crystalline guardian: blade arms and a resonance blast of thunder
//     crystal_dragon         (boss) a young dragon of living crystal; breathes a beam of prismatic light that blinds
//     lumina_heart_guardian  (boss) the floating crystal guardian of the Heart of Lumina: lances, a shattering pulse, a rain of shards
//   Plains of Silent Stones (plains)
//     gnoll, gnoll_pack_lord bone bows and rending claws; the pack lord's howl sends the pack into a frenzy
//     ankheg                 bursts out of the ground, seizes you in its mandibles, sprays acid
//     giant_scorpion         the plains' huge night hunter: pincers that hold, a venomous sting
//     griffon                circles high, then dives on you (and on horses)
//     hippogriff             territorial: wheel too close and it makes flyby swoops
//     stone_guardian         a standing stone that wakes: heavy hops, stone fists, a ley pulse you have to jump
//     plains_beast           (boss) the corrupted beast of the plains: a Bloom-veined lion-bull that kills livestock,
//                            charges, and roars a storm of black petals
//   Redrock Haven (desert)
//     purple_worm            gargantuan: rises out of the sand, swallows you whole, stings from below
//     sandworm               its smaller kin, an ambusher of desert roads
//   Skyreach Roost and the peaks (peaks)
//     wyvern                 dives with a venomous sting; harpy: a luring song; roc (boss): snatches you up and drops you;
//     air_elemental          a whirlwind that flings you away
// The fire, earth and air elementals fight for whoever summons them (tamed / owner / dndSummonBy).
//
// Stat blocks: SRD 5.2 where the creature is in it (CC BY 4.0, System Reference Document 5.2 by Wizards
// of the Coast); the magma worm, sandworm, crystal sentinel, crystal dragon, Lumina guardian, stone
// guardian, plains beast and gnoll pack lord are Eldenwood's own.
// ---------------------------------------------------------------------------

// ---- what they leave behind -----------------------------------------------------------------------
{
  const I = (k, o) => { if (!ITEMS[k]) defItem(k, o); };
  I('elemental_core_fire', { name: 'Fire Elemental Core', fuel: 40, rarity: 'rare', desc: 'A knot of flame that never goes out. It burns for an age as fuel, and smiths prize it.' });
  I('elemental_core_earth', { name: 'Earth Elemental Core', rarity: 'rare', desc: 'A fist-sized stone that hums and is far too heavy for its size.' });
  I('elemental_core_air', { name: 'Air Elemental Core', rarity: 'rare', desc: 'A swirl of wind trapped in nothing at all. It tugs at your hand.' });
  I('salamander_scale', { name: 'Salamander Scale', desc: 'Red as a coal, and always warm. Good for fire-proofed gear.' });
  I('hellhound_fang', { name: 'Hell Hound Fang', desc: 'A blackened fang that smoulders when you breathe on it.' });
  I('red_dragon_scale', { name: 'Red Dragon Scale', rarity: 'epic', desc: 'From a young red dragon. Fire runs off it like water.' });
  I('worm_tooth', { name: 'Great Worm Tooth', desc: 'A hooked tooth as long as your forearm, from one of the great burrowing worms.' });
  I('rust_antenna', { name: 'Rust Monster Antenna', desc: 'Feathery and faintly orange. Touch it to iron and the iron flakes away.' });
  I('lumina_crystal', { name: 'Lumina Crystal', rarity: 'rare', desc: 'A shard of the Crystal Caverns that rings when struck and glows in the dark.' });
  I('ankheg_chitin', { name: 'Ankheg Chitin', desc: 'A plate of an ankheg\'s shell: light, hard, and good for armour.' });
  I('griffon_feather', { name: 'Griffon Feather', desc: 'A great pinion feather. Fletchers and hat-makers pay well.' });
  I('leystone', { name: 'Leystone', rarity: 'rare', desc: 'A chip of an awakened standing stone. Its spiral still glows.' });
  I('bloom_petal', { name: 'Black-veined Petal', desc: 'A petal of the Bloom, pulsing faintly. It is not good to keep this long.' });
  I('wyvern_stinger', { name: 'Wyvern Stinger', desc: 'The barb of a wyvern\'s tail, its venom still potent.' });
  I('harpy_feather', { name: 'Harpy Feather', desc: 'A grey feather that hums the ghost of a tune.' });
  I('roc_feather', { name: 'Roc Feather', rarity: 'epic', desc: 'A single feather taller than you are.' });
}

// ---- their skins --------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    try { d2PaintTiles(); } catch (e) { console.warn('dnd monsters 2: tiles', e); }
  };
}
function d2PaintTiles() {
  const H = hexRGB, T = (n, f) => addTile(n, f), blank = '................';
  const tone = (p, c, k = 0.14) => shade(H(c), 1 + (p.rand() - 0.5) * k);
  const fill = (p, c, v = 0.16) => p.noise(H(c), v);
  const ov = (rows, pal) => (p) => p.art(rows, pal);   // a see-through overlay (glowing eyes, runes)
  const hsl = (h, s, l) => { const a = s * Math.min(l, 1 - l), f = (n) => { const k = (n + h * 12) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]; };
  const fur = (p, b, d, l, s = 0.22) => { p.noise(H(b), 0.18); p.speck(H(d), s); p.speck(H(l), 0.07); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.14) p.set(x, y, tone(p, d)); };
  const scales = (p, b, d, l) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const r = y >> 2, cx = (x + (r & 1) * 2) % 4, cy = y % 4, edge = cy === 3 || (cy === 2 && (cx === 0 || cx === 3)); p.set(x, y, edge ? tone(p, d) : cy === 0 && cx > 0 && cx < 3 ? tone(p, l, 0.08) : tone(p, b)); } };
  const bands = (p, b, d, l, h = 4, o = 0) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const k = (y + o) % h; p.set(x, y, k === h - 1 ? tone(p, d) : k === 0 ? tone(p, l, 0.08) : tone(p, b)); } };
  const cracks = (p, c1, c2, n, len = 14) => { for (let k = 0; k < n; k++) { let x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); for (let i = 0; i < len; i++) { p.set(x & 15, y & 15, H(i % 4 === 0 ? c2 : c1)); if (p.rand() < 0.55) y++; else x += p.rand() < 0.5 ? 1 : -1; } } };
  const facets = (p, b, l, d) => { const sh = [0.8, 0.94, 1.06, 1.2]; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const u = x + y * 0.6, v = x - y * 0.9 + 32, f = (Math.floor(u / 5) * 3 + Math.floor(v / 6)) & 3, edge = (u % 5) < 0.75 || (v % 6) < 0.75; p.set(x, y, edge ? (f & 1 ? H(l) : H(d)) : shade(H(b), sh[f] * (0.97 + p.rand() * 0.06))); } };
  // overlapping feathers: rounded tips in offset rows, a pale shaft, each feather a slightly different shade
  const feathers = (p, b, d, l, tip) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const r = y >> 2, off = (r & 1) * 2, fx = (x + off) % 4, fy = y % 4, cell = ((x + off) >> 2) * 7 + r * 13;
      const k = 0.9 + (cell % 5) * 0.05;
      let c;
      if (fy === 3) c = fx === 0 || fx === 3 ? tone(p, d) : tone(p, tip || d);
      else if (fx === 0) c = shade(tone(p, b), 0.8);
      else if (fx === 2 && fy < 2) c = tone(p, l, 0.08);
      else c = tone(p, b);
      p.set(x, y, shade(c, k));
    }
  };
  const molten = (p, c0, c1, r = 10) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, mix(H(c0), H(c1), clamp(Math.hypot(x - 7.5, y - 7.5) / r + (p.rand() - 0.5) * 0.15, 0, 1))); };
  const flame = (p, hot, mid, edge, dark, gaps = true) => {
    for (let x = 0; x < 16; x++) {
      const top = 2 + Math.floor((Math.sin(x * 1.9 + p.rand() * 1.5) * 0.5 + 0.5) * 6);
      for (let y = 0; y < 16; y++) {
        const k = clamp((y - top) / (16 - top), 0, 1);
        if (y < top) { if (!gaps || p.rand() < 0.4) p.set(x, y, H(dark)); else p.set(x, y, [0, 0, 0], 0); continue; }
        p.set(x, y, k > 0.7 ? mix(H(mid), H(hot), (k - 0.7) / 0.3) : k > 0.3 ? mix(H(edge), H(mid), (k - 0.3) / 0.4) : mix(H(dark), H(edge), k / 0.3));
      }
    }
  };
  const stone = (p, b, d, l, moss) => { p.noise(H(b), 0.16); p.speck(H(d), 0.12); p.speck(H(l), 0.06); cracks(p, d, d, 2, 7); if (moss) for (let k = 0; k < 6; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 6), tone(p, moss)); };
  const grad = (p, c0, c1, vert = true) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(mix(H(c0), H(c1), (vert ? y : x) / 15), 0.94 + p.rand() * 0.12)); };
  const vein = (p, b, v, every = 5) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const ln = x % every === 0 || (x + y) % 9 === 0; p.set(x, y, ln ? tone(p, v, 0.1) : tone(p, b, 0.1)); } };
  const glowEyes = (row, w, c, core, gap) => { const r = []; for (let i = 0; i < 16; i++) r.push(blank); const L = '.'.repeat(gap) + c.repeat(w), line = (L + '.'.repeat(16 - 2 * L.length) + L.split('').reverse().join('')); r[row] = line; r[row + 1] = line.replace(new RegExp(c, 'g'), (m, i) => (i === gap + Math.floor(w / 2) || i === 15 - gap - Math.floor(w / 2)) ? core : c); return r; };

  // ---- magma mephit: black crust over a molten heart ----
  const lavaRock = (p, b = '#2e1c16') => { p.noise(H(b), 0.22); p.speck(H('#170c08'), 0.18); cracks(p, '#e8520e', '#ffc040', 4, 12); p.speck(H('#ff9a30'), 0.025); };
  T('magma_mephit_skin', p => lavaRock(p));
  T('magma_mephit_face', p => { lavaRock(p); p.art([blank, blank, '.kkkk......kkkk.', '..kkk......kkk..', '..kkk......kkk..', '..kkk......kkk..', blank, '.......kk.......', blank, '...kkkkkkkkkk...', '...kmmmmmmmmk...', '....kmmmmmmk....', '.....kkkkkk.....', blank, blank, blank], { k: H('#120806'), m: H('#ff8a1a') }); });
  T('magma_mephit_eyes', ov(glowEyes(3, 3, 'y', 'W', 2), { y: H('#ffd040'), W: H('#fffbe0') }));
  T('magma_mephit_core', p => molten(p, '#fff0a0', '#e8400c'));
  T('magma_mephit_wing', p => vein(p, '#4a1a10', '#ff7a1a', 5));
  T('magma_mephit_horn', p => grad(p, '#4a3c36', '#1e1614'));

  // ---- fire elemental: a column of living flame ----
  T('fire_elemental_flame', p => flame(p, '#fff4b8', '#ffb020', '#ff5a10', '#a8200a'));
  T('fire_elemental_tongue', p => flame(p, '#ffffff', '#ffe060', '#ff9020', '#e04010'));
  T('fire_elemental_fist', p => flame(p, '#ffe8a0', '#ff8a1a', '#d8380e', '#6a1406', false));
  T('fire_elemental_core', p => molten(p, '#ffffff', '#ffb020', 9));
  T('fire_elemental_chest', p => { molten(p, '#fffbe0', '#ff8a1a', 8); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.abs(Math.sin(Math.atan2(y - 7.5, x - 7.5) * 3 + Math.hypot(x - 7.5, y - 7.5) * 0.6)) < 0.12) p.set(x, y, H('#ff6a10')); });
  T('fire_elemental_face', p => { molten(p, '#fff4c0', '#ff7a14', 10); p.art([blank, blank, blank, blank, '..kkkk....kkkk..', '..kWWk....kWWk..', '...kk......kk...', blank, blank, blank, '.....kkkkkk.....', '....kmmmmmmk....', '.....kkkkkk.....', blank, blank, blank], { k: H('#3a0a04'), W: H('#ffffff'), m: H('#ffd060') }); });

  // ---- salamander: crimson scales, a crest of fire ----
  T('salamander_scales', p => { scales(p, '#c8401a', '#6a1a0a', '#f0803a'); for (let x = 0; x < 16; x++) if (p.rand() < 0.5) p.set(x, 7, tone(p, '#3a0e06')); });
  T('salamander_belly', p => bands(p, '#f0b040', '#b06818', '#ffe080', 3));
  T('salamander_face', p => { scales(p, '#c8401a', '#6a1a0a', '#f0803a'); p.art([blank, blank, blank, '.yyk......kyy...', '.ykk......kky...', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { y: H('#ffe040'), k: H('#1a0604') }); });
  T('salamander_snout', p => { scales(p, '#b83a18', '#5a160a', '#e0703a'); p.art([blank, blank, '.....k....k.....', blank, blank, blank, blank, blank, blank, blank, 'kkkkkkkkkkkkkkkk', 'mmmmmmmmmmmmmmmm', 'w.w.w.w..w.w.w.w', blank, blank, blank], { k: H('#1a0604'), m: H('#ff7a1a'), w: H('#f0e8d0') }); });
  T('salamander_crest', p => flame(p, '#fffbd0', '#ffd040', '#ff7a14', '#c83a0a'));
  T('salamander_spear', p => { fill(p, '#3a3432', 0.14); for (let y = 0; y < 16; y++) { p.set(7, y, H('#6a625e')); p.set(8, y, H('#5a524e')); } for (let y = 0; y < 16; y += 5) for (let x = 0; x < 16; x++) p.set(x, y, H('#7a5a2a')); });
  T('salamander_tip', p => molten(p, '#ffffff', '#ff7a14', 9));

  // ---- hell hound: soot-black fur cracked with embers ----
  T('hell_hound_fur', p => { fur(p, '#2c2422', '#151010', '#4a3c38', 0.3); cracks(p, '#a8300c', '#ff7a1a', 2, 7); });
  T('hell_hound_back', p => { fur(p, '#1e1816', '#0c0808', '#3a2e2a', 0.35); for (let x = 1; x < 16; x += 3) for (let y = 0; y < 5; y++) p.set(x, y, tone(p, '#0c0808')); for (let x = 2; x < 16; x += 5) p.set(x, 0, H('#ff6a14')); });
  T('hell_hound_face', p => { fur(p, '#2c2422', '#151010', '#4a3c38', 0.3); p.art([blank, blank, blank, '.kkkk......kkkk.', '..kkk......kkk..', '..kkk......kkk..', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { k: H('#0a0606') }); });
  T('hell_hound_eyes', ov(glowEyes(4, 3, 'r', 'y', 2), { r: H('#ff4a14'), y: H('#ffe060') }));
  T('hell_hound_snout', p => { fur(p, '#241c1a', '#0e0a0a', '#3a2e2a', 0.2); p.art([blank, '......kkkk......', '......kkkk......', blank, blank, blank, blank, blank, blank, 'kkkkkkkkkkkkkkkk', '.w..wmmmmmmw..w.', '.w..w......w..w.', blank, blank, blank, blank], { k: H('#0a0606'), w: H('#e8e0c8'), m: H('#ff6a14') }); });
  T('hell_hound_jaw', p => { fur(p, '#241c1a', '#0e0a0a', '#3a2e2a', 0.2); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#ff5a10')); p.set(x, 1, H('#a82a0a')); } for (const x of [1, 4, 11, 14]) p.set(x, 2, H('#e8e0c8')); });
  T('hell_hound_mane', p => { for (let x = 0; x < 16; x++) { const top = Math.floor(p.rand() * 6); for (let y = 0; y < 16; y++) p.set(x, y, y < top ? [0, 0, 0] : y < top + 2 ? H('#ff6a14') : tone(p, '#1a1210'), y < top ? 0 : 255); } });
  T('hell_hound_flame', p => flame(p, '#fff0a0', '#ffb020', '#ff4a10', '#801808'));

  // ---- gargoyle: weathered stone with a grimace ----
  T('gargoyle_stone', p => stone(p, '#76767c', '#4a4a50', '#9a9aa2', '#5a6a3a'));
  T('gargoyle_face', p => { stone(p, '#76767c', '#4a4a50', '#9a9aa2'); p.art([blank, blank, blank, '.dddddd..dddddd.', '...kkk....kkk...', '...kkk....kkk...', blank, '.......dd.......', '......dddd......', blank, '...kkkkkkkkkk...', '...kwk.kk.kwk...', '...k........k...', blank, blank, blank], { d: H('#4a4a50'), k: H('#1a1a1e'), w: H('#c8c8c0') }); });
  T('gargoyle_eyes', ov(glowEyes(4, 3, 'y', 'W', 3), { y: H('#ffb030'), W: H('#fff0c0') }));
  T('gargoyle_wing', p => { stone(p, '#5e5e64', '#3a3a40', '#7a7a82'); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x += 5) p.set(x, y, tone(p, '#8a8a92')); });
  T('gargoyle_horn', p => grad(p, '#5a5a60', '#2a2a30'));

  // ---- the young red dragon ----
  T('young_red_dragon_scale', p => scales(p, '#a8221a', '#4e0a08', '#e04a2a'));
  T('young_red_dragon_belly', p => bands(p, '#e8962a', '#a8581a', '#ffc860', 4));
  T('young_red_dragon_wing', p => vein(p, '#8a1a12', '#3a0806', 5));
  T('young_red_dragon_bone', p => fill(p, '#5a1410', 0.12));
  T('young_red_dragon_horn', p => { grad(p, '#f0e2c0', '#3a2a20', false); for (let x = 3; x < 16; x += 4) for (let y = 0; y < 16; y++) if (p.rand() < 0.6) p.set(x, y, tone(p, '#5a4a3a')); });
  T('young_red_dragon_spine', p => grad(p, '#2a0806', '#8a1a12'));
  T('young_red_dragon_eye', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, Math.abs(x - 7.5) < 1.5 ? H('#1a0404') : mix(H('#fff080'), H('#ff8a10'), Math.abs(y - 7.5) / 8)); });
  T('young_red_dragon_snout', p => { scales(p, '#a8221a', '#4e0a08', '#e04a2a'); p.art([blank, blank, blank, '...kk......kk...', '...kk......kk...', blank, blank, blank, blank, blank, blank, blank, 'dddddddddddddddd', '.w..w..ww..w..w.', '.w..w..ww..w..w.', blank], { k: H('#1a0404'), d: H('#3a0806'), w: H('#f0ecd8') }); });
  T('young_red_dragon_mouth', p => { fill(p, '#6a1410', 0.15); for (let x = 0; x < 16; x += 2) { p.set(x, 0, H('#f0ecd8')); p.set(x, 15, H('#f0ecd8')); } });

  // ---- the crystal dragon ----
  T('crystal_dragon_scale', p => facets(p, '#9ad8e8', '#f0ffff', '#4a7ab8'));
  T('crystal_dragon_belly', p => facets(p, '#e8e0ff', '#ffffff', '#9a8ad8'));
  T('crystal_dragon_wing', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const ln = (x + y) % 6 === 0 || (x - y + 16) % 7 === 0; p.set(x, y, ln ? H('#f8ffff') : tone(p, '#7ac8f0', 0.08)); } });
  T('crystal_dragon_bone', p => facets(p, '#b8a8f0', '#ffffff', '#6a58b8'));
  T('crystal_dragon_horn', p => facets(p, '#f0c8ff', '#ffffff', '#a070d8'));
  T('crystal_dragon_spike', p => facets(p, '#c8f0ff', '#ffffff', '#58a0e0'));
  T('crystal_dragon_core', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 8, a = Math.atan2(y - 7.5, x - 7.5) / TAU + 0.5; p.set(x, y, mix([255, 255, 255], hsl(a, 0.9, 0.7), clamp(d * 1.3, 0, 1))); } });
  T('crystal_dragon_eye', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, Math.abs(x - 7.5) < 1.2 ? H('#5a1a7a') : mix(H('#ffffff'), H('#ff8af0'), Math.abs(y - 7.5) / 8)); });
  T('crystal_dragon_snout', p => { facets(p, '#9ad8e8', '#f0ffff', '#4a7ab8'); p.art([blank, blank, blank, '...cc......cc...', blank, blank, blank, blank, blank, blank, blank, blank, 'dddddddddddddddd', '.w..w..ww..w..w.', '.w..w..ww..w..w.', blank], { c: H('#ffffff'), d: H('#3a5a8a'), w: H('#e8f8ff') }); });

  // ---- the wyvern ----
  T('wyvern_scale', p => scales(p, '#6a6a3a', '#34341a', '#9a9a5a'));
  T('wyvern_belly', p => bands(p, '#c8b880', '#8a7a4a', '#e8dca8', 3));
  T('wyvern_wing', p => vein(p, '#5a4a30', '#2a2010', 5));
  T('wyvern_bone', p => fill(p, '#3a3420', 0.12));
  T('wyvern_horn', p => grad(p, '#d8ccb0', '#5a5040', false));
  T('wyvern_eye', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, Math.abs(x - 7.5) < 1.5 ? H('#141008') : mix(H('#f0f060'), H('#9ac020'), Math.abs(y - 7.5) / 8)); });
  T('wyvern_snout', p => { scales(p, '#6a6a3a', '#34341a', '#9a9a5a'); p.art([blank, blank, blank, '...kk......kk...', blank, blank, blank, blank, blank, blank, blank, blank, 'dddddddddddddddd', 'w.w.w.w..w.w.w.w', '.w.w.w....w.w.w.', blank], { k: H('#141008'), d: H('#2a2a14'), w: H('#ece4cc') }); });
  T('wyvern_sting', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(mix(H('#e8dcc0'), H('#7a2a9a'), clamp((x - 4) / 11, 0, 1)), 0.92 + p.rand() * 0.14)); });

  // ---- the great worms ----
  T('magma_worm_plate', p => { p.noise(H('#2a2220'), 0.2); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + (y >> 2) * 3) % 6 === 0 || y % 4 === 0) p.set(x, y, tone(p, '#141010')); p.speck(H('#4a3a34'), 0.06); cracks(p, '#c8400c', '#ff8a1a', 2, 6); });
  T('magma_worm_seam', p => molten(p, '#ffe080', '#e84a0c', 12));
  T('magma_worm_mouth', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5), a = Math.atan2(y - 7.5, x - 7.5); p.set(x, y, d < 3 ? H('#fff0a0') : d < 4.6 ? H('#ff7a14') : d < 5.8 ? (Math.sin(a * 8) > 0 ? H('#f0e8d0') : H('#3a0a04')) : tone(p, '#2a2220')); } });
  T('magma_worm_mound', p => { p.noise(H('#2a2420'), 0.25); cracks(p, '#c8400c', '#ffb040', 3, 8); });
  T('purple_worm_skin', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const b = y % 5; p.set(x, y, b === 0 ? tone(p, '#3a1650') : b === 1 ? tone(p, '#8a5aaa', 0.08) : tone(p, '#5a2a7a')); } p.speck(H('#4a2266'), 0.08); });
  T('purple_worm_mouth', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5), a = Math.atan2(y - 7.5, x - 7.5); const tooth = ((d > 4.2 && d < 5.4) && Math.sin(a * 9) > 0.2) || ((d > 6.2 && d < 7.3) && Math.sin(a * 12 + 1) > 0.3); p.set(x, y, tooth ? H('#f0e8d8') : d < 2.6 ? H('#140208') : d < 4.2 ? tone(p, '#6a1a2a') : d < 6.2 ? tone(p, '#8a2a3a') : tone(p, '#5a2a7a')); } });
  T('purple_worm_mound', p => { p.noise(H('#d8c088'), 0.12); for (let y = 0; y < 16; y += 3) for (let x = 0; x < 16; x++) if ((x + y * 2) % 7 < 3) p.set(x, (y + (x >> 3)) & 15, tone(p, '#b89a62')); });
  T('sandworm_skin', p => { bands(p, '#c8a46a', '#7a5a34', '#e8cc94', 4); for (let k = 0; k < 5; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#9a7a48'), 0.1); });
  T('sandworm_mouth', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5), a = Math.atan2(y - 7.5, x - 7.5), seam = Math.abs(Math.sin(a * 1.5)) < 0.12 && d > 1.5; p.set(x, y, seam ? H('#2a0e06') : d < 2.5 ? H('#1a0804') : d < 6 ? (Math.sin(a * 10) > 0.6 && d > 4 ? H('#f0e4c8') : tone(p, '#8a3a2a')) : tone(p, '#c8a46a')); } });
  T('sandworm_jaw', p => { bands(p, '#b8945a', '#6a4a24', '#dcc08a', 4); for (let x = 0; x < 16; x += 2) { p.set(x, 15, H('#f0e4c8')); p.set(x + 1, 14, H('#f0e4c8')); } });
  T('sandworm_mound', p => { p.noise(H('#e0c890'), 0.12); for (let y = 1; y < 16; y += 4) for (let x = 0; x < 16; x++) p.set(x, (y + (x >> 2)) & 15, tone(p, '#c0a468')); });

  // ---- earth elemental: layered rock, gem flecks, moss on its shoulders ----
  const strata = (p, b, d, l, gems) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const yy = y + Math.sin(x * 0.7) * 1.2, L = Math.floor(yy / 3), edge = (yy % 3) < 0.6; p.set(x, y, edge ? tone(p, d) : shade(H(b), (L % 2 ? 0.92 : 1.06) * (0.94 + p.rand() * 0.12))); } p.speck(H(l), 0.05); if (gems) for (let k = 0; k < 3; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H(gems[k % gems.length])); };
  T('earth_elemental_rock', p => strata(p, '#6a5a48', '#3e342a', '#8a7a64', ['#e8b040', '#5ab06a', '#c86040']));
  T('earth_elemental_top', p => { strata(p, '#6a5a48', '#3e342a', '#8a7a64'); for (let x = 0; x < 16; x++) { const h = 3 + Math.floor(p.rand() * 4); for (let y = 0; y < h; y++) p.set(x, y, tone(p, y === h - 1 ? '#2e4a1a' : '#4a7a2a')); } });
  T('earth_elemental_face', p => { strata(p, '#5a4c3e', '#2e261e', '#7a6a58'); p.art([blank, blank, blank, 'dddddddddddddddd', '.dddddd..dddddd.', '...kkk....kkk...', '...kkk....kkk...', blank, '.......dd.......', blank, blank, '....kkkkkkkk....', '.....k....k.....', blank, blank, blank], { d: H('#2e261e'), k: H('#120e0a') }); });
  T('earth_elemental_eyes', ov(glowEyes(5, 3, 'o', 'y', 3), { o: H('#ff9a20'), y: H('#fff0a0') }));
  T('earth_elemental_fist', p => stone(p, '#5a5048', '#2e2824', '#7a6e64'));
  T('earth_elemental_crystal', p => facets(p, '#ffb040', '#fff0b0', '#b86010'));

  // ---- xorn: pebbled stone hide, a toothed maw on top ----
  T('xorn_hide', p => { p.noise(H('#7a6a58'), 0.16); for (let k = 0; k < 10; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H(p.rand() < 0.5 ? '#9a8a74' : '#5a4c3e'), 0.1); p.speck(H('#4a3e32'), 0.08); });
  T('xorn_maw', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5), a = Math.atan2(y - 7.5, x - 7.5); p.set(x, y, d > 6.2 ? tone(p, '#7a6a58') : d > 4.8 && Math.sin(a * 10) > 0 ? H('#f0e8d0') : mix(H('#1a0404'), H('#7a1a14'), d / 6.2)); } });
  T('xorn_jaw', p => { p.noise(H('#7a6a58'), 0.16); for (let x = 0; x < 16; x++) { p.set(x, 15, H((x & 1) ? '#f0e8d0' : '#2a0808')); p.set(x, 14, H((x & 1) ? '#f0e8d0' : '#5a4c3e')); } });
  T('xorn_eye', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); p.set(x, y, d > 7 ? H('#3a3028') : Math.abs(x - 7.5) < 1.6 && d < 6 ? H('#0e0a06') : mix(H('#fff8a0'), H('#c8a020'), d / 7)); } });
  T('xorn_claw', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(mix(H('#5a5048'), H('#e8dcc0'), y / 15), 0.92 + p.rand() * 0.14)); });

  // ---- stone golem: carved granite, runes of blue light ----
  T('stone_golem_block', p => { p.noise(H('#9a9890'), 0.1); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (y % 8 === 0 || (x + (y >> 3) * 8) % 16 === 0) p.set(x, y, tone(p, '#5a5852')); else if ((y % 8) === 1 || ((x + (y >> 3) * 8) % 16) === 1) p.set(x, y, tone(p, '#b8b6ae')); p.speck(H('#7a7870'), 0.08); });
  T('stone_golem_face', p => { p.noise(H('#9a9890'), 0.1); p.art([blank, blank, 'dddddddddddddddd', 'llllllllllllllll', blank, blank, '..kkkk....kkkk..', blank, '.......dd.......', '.......dd.......', blank, '....kkkkkkkk....', blank, blank, 'dddddddddddddddd', blank], { d: H('#5a5852'), l: H('#b8b6ae'), k: H('#2a2826') }); });
  T('stone_golem_eyes', ov([blank, blank, blank, blank, blank, blank, '..cccc....cccc..', '..cWWc....cWWc..', blank, blank, blank, blank, blank, blank, blank, blank], { c: H('#5ac8ff'), W: H('#e8faff') }));
  T('stone_golem_runes', ov([blank, '......cccc......', '.....c....c.....', '....c..cc..c....', '....c.c..c.c....', '....c..cc..c....', '.....c....c.....', '......cccc......', '.......cc.......', '...c...cc...c...', '....c..cc..c....', '.....cccccc.....', '.......cc.......', '......c..c......', '.....c....c.....', blank], { c: H('#7ad8ff') }));
  T('stone_golem_dark', p => stone(p, '#6a6862', '#44423e', '#8a8882'));

  // ---- rust monster: rusty plates, feathery antennae ----
  T('rust_monster_shell', p => { bands(p, '#b0622a', '#6a3414', '#d8884a', 4); p.speck(H('#8a3a14'), 0.12); p.speck(H('#5a2a10'), 0.06); for (let k = 0; k < 4; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#6a8a6a')); });
  T('rust_monster_belly', p => bands(p, '#d8b878', '#a88850', '#f0d8a0', 3));
  T('rust_monster_face', p => { bands(p, '#b0622a', '#6a3414', '#d8884a', 4); p.art([blank, blank, blank, blank, '..kk........kk..', '..kk........kk..', blank, blank, blank, blank, '.....dddddd.....', '....dkkkkkkd....', '....d.k..k.d....', blank, blank, blank], { k: H('#120806'), d: H('#5a2a10') }); });
  T('rust_monster_antenna', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const mid = Math.abs(x - 7.5) < 1.5, barb = (x + y) % 3 === 0; p.set(x, y, mid ? H('#5a2a10') : barb ? tone(p, '#e8b070') : tone(p, '#b06a30'), mid || barb || p.rand() < 0.5 ? 255 : 0); } });
  T('rust_monster_tail', p => { fill(p, '#c87a3a', 0.12); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#6a3414')); p.set(x, 15, H('#6a3414')); } for (let y = 0; y < 16; y++) p.set(7, y, H('#8a4a1c')); });

  // ---- giant bat ----
  T('giant_bat_fur', p => fur(p, '#4a3426', '#2a1c14', '#6a5040'));
  T('giant_bat_face', p => { fur(p, '#4a3426', '#2a1c14', '#6a5040'); p.art([blank, blank, blank, blank, '...rr......rr...', '...rr......rr...', blank, '......pppp......', '......kppk......', '......pppp......', blank, '....kkkkkkkk....', '.....w....w.....', '.....w....w.....', blank, blank], { r: H('#e83a2a'), p: H('#8a5a50'), k: H('#140c08'), w: H('#f0e8d8') }); });
  T('giant_bat_wing', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const bone = x % 6 === 0 || y === 0; p.set(x, y, bone ? tone(p, '#6a5446') : tone(p, '#3a2a24', 0.1), y > 13 && (x % 6) > 2 && (x % 6) < 5 ? 0 : 255); } });

  // ---- crystal sentinel ----
  T('crystal_sentinel_crystal', p => facets(p, '#8ab8f0', '#f0f8ff', '#4a5ab8'));
  T('crystal_sentinel_dark', p => facets(p, '#5a5ab8', '#a8b8f0', '#2a2a6a'));
  T('crystal_sentinel_face', p => { facets(p, '#8ab8f0', '#f0f8ff', '#4a5ab8'); for (let y = 5; y < 8; y++) for (let x = 1; x < 15; x++) p.set(x, y, tone(p, '#1a1a4a')); });
  T('crystal_sentinel_eyes', ov([blank, blank, blank, blank, blank, blank, '..cccc....cccc..', blank, blank, blank, blank, blank, blank, blank, blank, blank], { c: H('#c8f8ff') }));
  T('crystal_sentinel_core', p => molten(p, '#ffffff', '#5ae0ff', 9));
  T('crystal_sentinel_shard', p => facets(p, '#c8f0ff', '#ffffff', '#6aa8e8'));

  // ---- the guardian of the Heart of Lumina ----
  T('lumina_heart_guardian_crystal', p => { facets(p, '#bfe8f8', '#ffffff', '#6a9ad8'); for (let k = 0; k < 6; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H(k & 1 ? '#ffb0e8' : '#fff0a0')); });
  T('lumina_heart_guardian_spire', p => facets(p, '#9ad0f0', '#f0ffff', '#4a6ab0'));
  T('lumina_heart_guardian_shard', p => facets(p, '#e0f8ff', '#ffffff', '#8ac8f0'));
  T('lumina_heart_guardian_heart', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 8; p.set(x, y, d < 0.45 ? mix(H('#ffffff'), H('#ffe890'), d / 0.45) : mix(H('#ffe890'), H('#ff8ad0'), clamp((d - 0.45) / 0.55, 0, 1)), d > 0.98 ? 0 : 255); } for (let a = 0; a < 16; a++) { const x = Math.round(7.5 + Math.cos(a / 16 * TAU) * 5.2), y = Math.round(7.5 + Math.sin(a / 16 * TAU) * 5.2); p.set(x, y, H('#fff8ff')); } });
  T('lumina_heart_guardian_rune', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5), a = Math.atan2(y - 7.5, x - 7.5); const on = Math.abs(d - 7) < 0.6 || Math.abs(d - 4.5) < 0.5 || (d > 4.5 && d < 7 && Math.abs(Math.sin(a * 4)) < 0.15) || (d < 2 && Math.abs(Math.sin(a * 3)) < 0.3); p.set(x, y, on ? H('#aef0ff') : [0, 0, 0], on ? 255 : 0); } });

  // ---- gnolls ----
  T('gnoll_fur', p => { fur(p, '#b8955a', '#7a5a30', '#d8b880'); for (let k = 0; k < 7; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#5a3e20'), 0.12); });
  T('gnoll_face', p => { fur(p, '#b8955a', '#7a5a30', '#d8b880'); p.art([blank, blank, '..ddd......ddd..', '.ddddd....ddddd.', '...yk......ky...', '..ddd......ddd..', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { d: H('#3a2a18'), y: H('#e8c040'), k: H('#120a04') }); });
  T('gnoll_snout', p => { fur(p, '#3a2a1a', '#1a120a', '#5a4428', 0.2); p.art([blank, '......kkkk......', '......kkkk......', blank, blank, blank, blank, blank, blank, 'kkkkkkkkkkkkkkkk', '.w.w.w....w.w.w.', blank, blank, blank, blank, blank], { k: H('#0e0804'), w: H('#ece4cc') }); });
  T('gnoll_mane', p => fur(p, '#3a2a18', '#1a120a', '#5a4428', 0.4));
  T('gnoll_leather', p => { p.noise(H('#6a4a2e'), 0.2); p.speck(H('#4a321e'), 0.2); for (let i = 0; i < 16; i++) { p.set(i, (i + 3) & 15, H('#3a2414')); p.set(i, (i + 4) & 15, H('#3a2414')); } for (const [x, y] of [[4, 7], [11, 14], [8, 2]]) { p.set(x, y, H('#e8dcc0')); p.set(x + 1, y, H('#c8bca0')); } });
  T('gnoll_ear', p => { fur(p, '#b8955a', '#7a5a30', '#d8b880'); for (let y = 3; y < 14; y++) for (let x = 5; x < 11; x++) p.set(x, y, tone(p, '#3a2418')); });
  T('gnoll_pack_lord_fur', p => { fur(p, '#8a7458', '#4a3a28', '#aa9474'); for (let k = 0; k < 6; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#3a2a18'), 0.12); });
  T('gnoll_pack_lord_face', p => { fur(p, '#8a7458', '#4a3a28', '#aa9474'); p.art([blank, 'rr............rr', '.rr..ddd..ddd.rr', '..rddddd..dddddr', '...rk......kr...', '..ddd......ddd..', '.rr..........rr.', 'rr............rr', blank, blank, blank, blank, blank, blank, blank, blank], { d: H('#2a1e12'), r: H('#a8201a'), k: H('#120a04') }); });
  T('gnoll_pack_lord_eyes', ov([blank, blank, blank, blank, '...r........r...', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { r: H('#ff3a20') }));
  T('gnoll_pack_lord_bone', p => { p.noise(H('#e0d4b8'), 0.1); cracks(p, '#9a8c70', '#9a8c70', 3, 6); for (let y = 0; y < 16; y += 5) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#6a4a2e')); });
  T('gnoll_pack_lord_skull', p => { p.noise(H('#e8dcc0'), 0.08); p.art([blank, blank, blank, blank, '..kkkk....kkkk..', '..kkkk....kkkk..', '..kkkk....kkkk..', blank, '.......kk.......', '......kkkk......', blank, blank, '..w.w.w..w.w.w..', '..kkkkkkkkkkkk..', blank, blank], { k: H('#1a140c'), w: H('#fffaf0') }); });

  // ---- ankheg ----
  T('ankheg_shell', p => { bands(p, '#8a6a2a', '#4a3410', '#b8944a', 5); for (let k = 0; k < 6; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#7a9a3a')); });
  T('ankheg_belly', p => bands(p, '#d8c890', '#a89860', '#f0e4b0', 3));
  T('ankheg_face', p => { bands(p, '#8a6a2a', '#4a3410', '#b8944a', 5); p.art([blank, blank, '.kkkk......kkkk.', 'kkWkk......kkWkk', 'kkkkk......kkkkk', 'kkkkk......kkkkk', '.kkkk......kkkk.', blank, blank, blank, blank, '.....dddddd.....', '....dkkkkkkd....', blank, blank, blank], { k: H('#141008'), W: H('#9aa890'), d: H('#3a2a0e') }); });
  T('ankheg_mandible', p => grad(p, '#6a4a1a', '#1a0e04', false));
  T('ankheg_leg', p => bands(p, '#6a4a1a', '#2a1a08', '#9a7438', 4));
  T('ankheg_mound', p => { p.noise(H('#6a4a30'), 0.22); p.speck(H('#4a3220'), 0.15); for (let x = 0; x < 16; x++) if (p.rand() < 0.5) p.set(x, Math.floor(p.rand() * 3), tone(p, '#5a8a3a')); });

  // ---- giant scorpion: obsidian-black with a bronze sheen ----
  T('giant_scorpion_shell', p => { bands(p, '#2a2228', '#0e0a0e', '#5a4a52', 4); for (let x = 0; x < 16; x++) if (p.rand() < 0.3) p.set(x, (p.rand() * 4 | 0) * 4, H('#a8743a')); });
  T('giant_scorpion_face', p => { bands(p, '#2a2228', '#0e0a0e', '#5a4a52', 4); p.art([blank, blank, '.....rr..rr.....', '.....rr..rr.....', '.r............r.', blank, blank, blank, blank, blank, blank, '....dddddddd....', blank, blank, blank, blank], { r: H('#e83a20'), d: H('#0a0608') }); });
  T('giant_scorpion_sting', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(mix(H('#1a1418'), H('#e8a030'), clamp((y - 5) / 10, 0, 1)), 0.92 + p.rand() * 0.14)); });

  // ---- griffon ----
  T('griffon_fur', p => fur(p, '#c89a50', '#946a30', '#e0b870', 0.2));
  T('griffon_plume', p => feathers(p, '#f0ead8', '#b8ae98', '#ffffff'));
  T('griffon_face', p => { feathers(p, '#f0ead8', '#b8ae98', '#ffffff'); p.art([blank, blank, blank, 'dd............dd', 'yk............ky', 'kk............kk', 'd..............d', blank, blank, blank, blank, blank, blank, blank, blank, blank], { d: H('#6a5a40'), y: H('#f0b020'), k: H('#141008') }); });
  T('griffon_beak', p => { grad(p, '#f0c040', '#a8741a'); for (let x = 0; x < 16; x++) for (let y = 12; y < 16; y++) p.set(x, y, tone(p, '#3a2a10')); });
  T('griffon_wing', p => feathers(p, '#8a5a2a', '#4a2e14', '#b07a40', '#2a1a0a'));
  T('griffon_talon', p => scales(p, '#e0b040', '#8a6418', '#f0d070'));
  T('griffon_tuft', p => fur(p, '#6a4220', '#3a2210', '#8a5a30', 0.35));

  // ---- hippogriff ----
  T('hippogriff_hide', p => { p.noise(H('#9a9aa0'), 0.1); for (let k = 0; k < 8; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#c8c8d0'), 0.06); p.speck(H('#7a7a82'), 0.08); });
  T('hippogriff_feather', p => feathers(p, '#7a8aa0', '#4a5468', '#a8b4c8'));
  T('hippogriff_face', p => { feathers(p, '#7a8aa0', '#4a5468', '#a8b4c8'); p.art([blank, blank, blank, blank, 'yk............ky', 'kk............kk', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { y: H('#e8a020'), k: H('#0e0a06') }); });
  T('hippogriff_beak', p => { grad(p, '#5a5a62', '#26262c'); for (let x = 0; x < 16; x++) p.set(x, 0, H('#8a8a94')); });
  T('hippogriff_wing', p => feathers(p, '#6a7a92', '#3a4458', '#9aa8c0', '#202838'));
  T('hippogriff_mane', p => fur(p, '#4a5468', '#2a3040', '#6a7890', 0.35));
  T('hippogriff_hoof', p => fill(p, '#3a3430', 0.1));
  T('hippogriff_talon', p => scales(p, '#b8a470', '#6a5a38', '#d8c890'));

  // ---- stone guardian: a lichen-spotted standing stone with a teal spiral ----
  T('stone_guardian_stone', p => { stone(p, '#8a8a84', '#5a5a56', '#a8a8a2'); for (let k = 0; k < 4; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H(k & 1 ? '#b8b85a' : '#d8d8c8'), 0.15); });
  T('stone_guardian_face', p => { stone(p, '#8a8a84', '#5a5a56', '#a8a8a2'); p.art([blank, blank, '.dddddd..dddddd.', blank, '..kkk......kkk..', '..kkk......kkk..', '..kkk......kkk..', blank, '.......dd.......', '.......dd.......', blank, '.....kkkkkk.....', blank, blank, blank, blank], { d: H('#5a5a56'), k: H('#2a2a28') }); });
  T('stone_guardian_eyes', ov([blank, blank, blank, blank, blank, '...t........t...', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { t: H('#6af0d8') }));
  T('stone_guardian_rune', ov([blank, '.....tttttt.....', '....t......t....', '...t..tttt..t...', '...t.t....t.t...', '...t.t.tt.t.t...', '...t.t..t.t.t...', '...t..ttt..t....', '....t.....t.....', '.....ttttt......', '.......t........', '......ttt.......', '.....t.t.t......', '....t..t..t.....', '.......t........', blank], { t: H('#6af0d8') }));

  // ---- the corrupted beast of the plains ----
  T('plains_beast_hide', p => { fur(p, '#3a2a26', '#1a1210', '#5a4440', 0.25); cracks(p, '#6a2a7a', '#9a3ab8', 3, 9); });
  T('plains_beast_mane', p => { fur(p, '#1e1420', '#0a060c', '#3a2a40', 0.45); for (let k = 0; k < 5; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#b84ad8')); });
  T('plains_beast_face', p => { fur(p, '#3a2a26', '#1a1210', '#5a4440', 0.25); p.art([blank, 'v..............v', '.v..dddd..dddd.v', '..vddkkd..dkkddv', '...vkkkd..dkkkv.', '..ddkkkd..dkkkd.', '.v.dddd....dddd.', 'v..v..........v.', '..v............v', blank, blank, blank, blank, blank, blank, blank], { d: H('#1a1210'), k: H('#0a0408'), v: H('#140818') }); });
  T('plains_beast_eyes', ov(glowEyes(4, 2, 'm', 'W', 4), { m: H('#ff4ad8'), W: H('#ffe0fa') }));
  T('plains_beast_snout', p => { fur(p, '#2a1e1c', '#120c0a', '#4a3a36', 0.2); p.art([blank, blank, blank, '...kkk....kkk...', '...kkk....kkk...', blank, blank, blank, blank, blank, 'kkkkkkkkkkkkkkkk', '.w..w......w..w.', blank, blank, blank, blank], { k: H('#0a0606'), w: H('#e8dcc0') }); });
  T('plains_beast_horn', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(mix(H('#e8dcc0'), H('#141014'), clamp(x / 15, 0, 1)), 0.9 + p.rand() * 0.15)); });
  T('plains_beast_petal', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const dx = Math.abs(x - 7.5), inside = dx < 7.6 - Math.max(0, 6 - y) * 0.9; if (!inside) { p.set(x, y, [0, 0, 0], 0); continue; } const v = dx < 0.8 || Math.abs(dx - (y - 4) * 0.45) < 0.5; p.set(x, y, v ? (p.rand() < 0.25 ? H('#ff6ae8') : H('#0a020c')) : mix(H('#5a1a6a'), H('#a84ad0'), dx / 8)); } });
  T('plains_beast_hoof', p => fill(p, '#1a1416', 0.12));

  // ---- harpy ----
  T('harpy_skin', p => { p.noise(H('#a8b098'), 0.12); p.speck(H('#8a947c'), 0.12); });
  T('harpy_face', p => { p.noise(H('#a8b098'), 0.12); p.art(['hhhhhhhhhhhhhhhh', 'hh.hhh.hh.hhh.hh', 'h....h....h....h', blank, blank, '..wyk......kyw..', blank, blank, '.......dd.......', blank, '....kkkkkkkk....', '....kwkwwkwk....', blank, blank, blank, blank], { h: H('#2a2228'), w: H('#f0f0e0'), y: H('#e8d020'), k: H('#141010'), d: H('#7a8468') }); });
  T('harpy_hair', p => { fur(p, '#2a2228', '#141016', '#4a3e48', 0.35); for (let x = 1; x < 16; x += 3) for (let y = 0; y < 16; y++) if (p.rand() < 0.4) p.set(x, y, H('#100c10')); });
  T('harpy_plumage', p => feathers(p, '#7a6a5a', '#4a3e32', '#9a8a78'));
  T('harpy_chest', p => { p.noise(H('#a8b098'), 0.12); for (let y = 8; y < 16; y++) for (let x = 0; x < 16; x++) { const r = y >> 2, cx = (x + (r & 1) * 2) % 4, cy = y % 4; p.set(x, y, cy === 3 ? tone(p, '#4a3e32') : cx === 0 ? tone(p, '#5a4e40') : tone(p, '#7a6a5a')); } });
  T('harpy_wing', p => feathers(p, '#6a5a4a', '#3a2e24', '#8a7a68', '#241a14'));
  T('harpy_talon', p => scales(p, '#d8b040', '#7a5a18', '#f0d070'));

  // ---- roc ----
  T('roc_plumage', p => feathers(p, '#5a3e24', '#2e1e10', '#7a5634', '#1e1208'));
  T('roc_head', p => feathers(p, '#d8b060', '#9a7432', '#f0d088'));
  T('roc_face', p => { feathers(p, '#d8b060', '#9a7432', '#f0d088'); p.art([blank, blank, blank, 'dddd........dddd', 'yk............ky', 'kk............kk', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { d: H('#5a3e1a'), y: H('#ffd030'), k: H('#0e0a04') }); });
  T('roc_beak', p => { grad(p, '#e8d070', '#8a7030'); for (let x = 0; x < 16; x++) for (let y = 12; y < 16; y++) p.set(x, y, tone(p, '#2a2010')); });
  T('roc_wing', p => { feathers(p, '#4a321c', '#22160a', '#6a4a2a', '#120a04'); for (let x = 0; x < 16; x++) if (p.rand() < 0.7) p.set(x, 6, tone(p, '#8a6a44')); });
  T('roc_talon', p => scales(p, '#c8a040', '#6a5018', '#e8c868'));
  T('roc_claw', p => grad(p, '#4a4a4a', '#0a0a0a'));

  // ---- air elemental ----
  T('air_elemental_wind', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const s = Math.sin(x * 0.8 + y * 1.6 + Math.sin(y * 0.7) * 2); p.set(x, y, mix(H('#b8d4ea'), H('#ffffff'), s * 0.5 + 0.5), s > -0.6 ? 255 : 0); } });
  T('air_elemental_cloud', p => { p.noise(H('#e8f0f8'), 0.06); for (let k = 0; k < 6; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 2, H('#b8c8da'), 0.06); });
  T('air_elemental_face', p => { p.noise(H('#e0eaf4'), 0.06); for (let y = 4; y < 8; y++) for (let x = 2; x < 14; x++) if (Math.abs(x - 7.5) > 1.5) p.set(x, y, tone(p, '#8aa0b8')); });
  T('air_elemental_eyes', ov(glowEyes(5, 3, 'W', 'W', 3), { W: H('#ffffff') }));
  T('air_elemental_debris', p => stone(p, '#7a7068', '#4a4440', '#9a9088'));

  // ---- the particles they throw about ----
  T('ankheg_acid', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 7.5; p.set(x, y, mix(H('#f0ffa0'), H('#6ab020'), clamp(d * 1.3, 0, 1)), d < 1 ? Math.round(255 * Math.pow(1 - d, 0.8)) : 0); } });
  T('crystal_dragon_prism', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 7.5, a = Math.atan2(y - 7.5, x - 7.5) / TAU + 0.5, star = Math.abs(x - 7.5) < 1 || Math.abs(y - 7.5) < 1; p.set(x, y, mix([255, 255, 255], hsl(a, 1, 0.65), clamp(d * 1.5, 0, 1)), star && d < 1 ? 255 : d < 0.6 ? Math.round(255 * (1 - d / 0.6)) : 0); } });
  T('plains_beast_petal', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const dx = Math.abs(x - 7.5), inside = dx < 6 - Math.abs(y - 7.5) * 0.7; p.set(x, y, dx < 0.7 ? H('#0a020c') : mix(H('#5a1a6a'), H('#c060e8'), dx / 6), inside ? 255 : 0); } });

  // ---- item pictures ----
  const A = addItem;
  A('elemental_core_fire', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, (y - 8) * 1.1); if (d < 6) p.set(x, y, mix(H('#fffbe0'), H('#e8400c'), d / 6)); } for (let k = 0; k < 5; k++) p.set(5 + k * 1.5 | 0, 2 + (k & 1), H('#ff9a20')); });
  A('elemental_core_earth', p => { for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) if (Math.abs(x - 7.5) + Math.abs(y - 7.5) < 7) p.set(x, y, shade(H('#7a6a54'), 0.8 + p.rand() * 0.35)); for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, H('#ffb040')); p.set(7, 7, H('#fff0b0')); });
  A('elemental_core_air', p => { for (let a = 0; a < 40; a++) { const r = a / 40 * 6.5, t = a * 0.55; p.set(Math.round(7.5 + Math.cos(t) * r), Math.round(7.5 + Math.sin(t) * r), mix(H('#ffffff'), H('#9ac8e8'), a / 40)); } });
  A('salamander_scale', p => { for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot(x - 7.5, (y - 5) * 1.2); if (d < 5.5 && y > 3 + Math.abs(x - 7.5) * 0.4) p.set(x, y, shade(H('#d8481a'), 1.2 - d * 0.08)); } for (let y = 5; y < 12; y++) p.set(7, y, H('#7a1a08')); p.set(6, 5, H('#ffb060')); });
  A('hellhound_fang', p => { for (let y = 2; y < 14; y++) { const w = Math.max(0, Math.floor((14 - y) / 3)); for (let x = 7 - w; x <= 7 + w; x++) p.set(x + ((y - 2) >> 2), y, y > 10 ? H('#3a2a24') : H('#e8e0c8')); } p.set(10, 13, H('#ff6a14')); });
  A('red_dragon_scale', p => { for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot(x - 7.5, (y - 5) * 1.2); if (d < 5.5 && y > 3 + Math.abs(x - 7.5) * 0.4) p.set(x, y, shade(H('#b8241a'), 1.25 - d * 0.08)); } for (let y = 5; y < 12; y++) p.set(7, y, H('#4e0a08')); p.set(6, 5, H('#ff8a5a')); });
  A('worm_tooth', p => { for (let y = 1; y < 15; y++) { const w = Math.max(0, Math.floor((15 - y) / 4)); const cx = 5 + Math.round(Math.sin(y / 15 * 2.2) * 3); for (let x = cx - w; x <= cx + w; x++) p.set(x, y, y > 12 ? H('#8a7a5a') : x === cx - w ? H('#ffffff') : H('#e8dcc0')); } });
  A('rust_antenna', p => { for (let y = 1; y < 15; y++) { p.set(8, y, H('#5a2a10')); for (let k = 1; k < 4; k++) if ((y + k) % 3 === 0) { p.set(8 - k, y, H('#d8904a')); p.set(8 + k, y, H('#b06a30')); } } });
  A('lumina_crystal', p => { for (let y = 1; y < 15; y++) { const w = y < 5 ? (y - 1) : Math.max(1, 4 - (y - 5) * 0.4); for (let x = Math.round(7.5 - w); x <= Math.round(7.5 + w); x++) p.set(x, y, x < 7.5 ? H('#e0f8ff') : H('#8ac8f0')); } p.set(6, 4, H('#ffffff')); p.set(9, 9, H('#ffb0e8')); });
  A('ankheg_chitin', p => { for (let y = 3; y < 13; y++) for (let x = 2; x < 14; x++) if (Math.abs(x - 7.5) < 6 - Math.abs(y - 8) * 0.5) p.set(x, y, (y % 3 === 0) ? H('#4a3410') : shade(H('#9a7a3a'), 0.9 + p.rand() * 0.2)); p.set(5, 5, H('#c8a860')); });
  A('griffon_feather', p => { for (let y = 1; y < 15; y++) { const w = Math.max(0, Math.round(Math.sin((y - 1) / 14 * Math.PI) * 3.5)); for (let x = 7 - w; x <= 7 + w; x++) p.set(x + (y >> 3), y, y > 9 ? H('#4a2e14') : H('#8a5a2a')); p.set(7 + (y >> 3), y, H('#f0ead8')); } });
  A('leystone', p => { for (let y = 2; y < 14; y++) for (let x = 3; x < 13; x++) if (Math.abs(x - 7.5) < 5 - Math.abs(y - 8) * 0.3) p.set(x, y, shade(H('#8a8a84'), 0.85 + p.rand() * 0.3)); for (let a = 0; a < 18; a++) { const r = a / 18 * 3.5, t = a * 0.7; p.set(Math.round(7.5 + Math.cos(t) * r), Math.round(8 + Math.sin(t) * r), H('#6af0d8')); } });
  A('bloom_petal', p => { for (let y = 1; y < 15; y++) for (let x = 2; x < 14; x++) { const dx = Math.abs(x - 7.5); if (dx < 6 - Math.abs(y - 8) * 0.75) p.set(x, y, dx < 0.8 ? H('#0a020c') : mix(H('#5a1a6a'), H('#c060e8'), dx / 6)); } p.set(9, 6, H('#ff6ae8')); p.set(6, 10, H('#ff6ae8')); });
  A('wyvern_stinger', p => { for (let y = 1; y < 15; y++) { const w = Math.max(0, Math.floor((15 - y) / 4)), cx = 4 + Math.round(y * 0.45); for (let x = cx - w; x <= cx + w; x++) p.set(x, y, y > 10 ? H('#7a2a9a') : H('#e8dcc0')); } p.set(10, 14, H('#c060e8')); });
  A('harpy_feather', p => { for (let y = 1; y < 15; y++) { const w = Math.max(0, Math.round(Math.sin((y - 1) / 14 * Math.PI) * 3)); for (let x = 7 - w; x <= 7 + w; x++) p.set(x, y, (x + y) % 4 === 0 ? H('#4a3e32') : H('#8a7a68')); p.set(7, y, H('#d8d0c0')); } });
  A('roc_feather', p => { for (let y = 0; y < 16; y++) { const w = Math.max(0, Math.round(Math.sin(y / 15 * Math.PI) * 4)); for (let x = 7 - w; x <= 7 + w; x++) p.set(x + (y >> 2) - 2, y, y > 11 ? H('#1e1208') : y % 5 === 0 ? H('#8a6a44') : H('#5a3e24')); p.set(7 + (y >> 2) - 2, y, H('#e8d8b0')); } });
}

// ---- body plans ---------------------------------------------------------------------------------------
// Worms: a mound of heaved earth while underground; out of it, a column of ring segments that rears
// up and bends over toward its prey, the mouth on the top of the last one (jaws round it, for some).
function d2WormRig(o) {
  const T = o.tex, n = o.n, P = [];
  P.push(rpart('mound', null, [0, 0, 0], [-o.w0 * 0.75, -1.5, -o.w0 * 0.75, o.w0 * 0.75, 2.5, o.w0 * 0.75], T.mound, { only: 'd2burrowed' }));
  P.push(rpart('mound2', 'mound', [o.w0 * 0.25, 2.5, 0], [-o.w0 * 0.42, -0.5, -o.w0 * 0.42, o.w0 * 0.42, 1.6, o.w0 * 0.42], T.mound, { only: 'd2burrowed', rest: [0, 0.6, 0] }));
  let parent = null;
  for (let i = 0; i < n; i++) {
    const w = o.w0 + (o.w1 - o.w0) * (i / (n - 1)), top = i === n - 1;
    P.push(rpart('seg' + i, parent, i ? [0, o.L, 0] : [0, -o.L * 0.7, 0], [-w / 2, 0, -w / 2, w / 2, o.L, w / 2], top ? { all: T.skin, top: T.mouth } : T.skin, { role: 'wseg', idx: i, rest: [o.bend[i] || 0, 0, 0], not: 'd2burrowed' }));
    if (o.ring && i > 0) P.push(rpart('ring' + i, 'seg' + i, [0, 0, 0], [-w / 2 - 0.35, -0.7, -w / 2 - 0.35, w / 2 + 0.35, 0.7, w / 2 + 0.35], T.ring, { glow: !!o.ringGlow, not: 'd2burrowed' }));
    parent = 'seg' + i;
  }
  const head = 'seg' + (n - 1), wh = o.w1;
  for (let k = 0; k < (o.jaws || 0); k++) P.push(rpart('jaw' + k, head, [0, o.L, 0], [-wh * 0.34, 0, -wh / 2 - 0.3, wh * 0.34, o.jawL || 5, -wh / 2 + 0.7], T.jaw, { role: 'wjaw', rest: [0.35, k / o.jaws * TAU, 0], not: 'd2burrowed', noCull: true }));
  for (const x of o.extras || []) P.push(rpart(x[0], x[1], x[2], x[3], x[4], Object.assign({ not: 'd2burrowed' }, x[5] || {})));
  return finishRig('d2worm', P, { hipY: 0, height: n * o.L, scale: o.scale || 1, wormN: n });
}

// Dragons of this file (the young red, the crystal dragon, the wyvern): the skeleton game/dragons.js
// uses, so RIG_ANIM.dragon flies them, but each with its own build, head, horns and dressing.
function d2DragonRig(o) {
  const T = o.tex, hip = o.hip ?? 14, W = o.W ?? 6, Hh = o.Hh ?? 5, L = o.L ?? 12;
  const n1 = o.neck1 ?? 8, n2 = o.neck2 ?? 8, w1 = o.nw1 ?? 3.5, w2 = o.nw2 ?? 3;
  const hd = o.head || [4.5, 3, 7], sn = o.snout || [3, 2.5, 6], tl = o.tail || [10, 10, 10], tw = o.tailW || [3.5, 2.5, 1.5];
  const body = { all: T.scale, bottom: T.belly };
  const P = [
    rpart('body', null, [0, hip, 0], [-W, -Hh, -L, W, Hh + 1, L], body, { role: 'dbody' }),
    rpart('neck1', 'body', [0, Hh * 0.55, -L + 1], [-w1, -w1, -n1, w1, w1 + 1, 0], body, { rest: [0.6, 0, 0], limb: 'head' }),
    rpart('neck2', 'neck1', [0, 0.5, -n1], [-w2, -w2, -n2, w2, w2 + 1, 0], body, { rest: [-0.25, 0, 0], limb: 'head' }),
    rpart('head', 'neck2', [0, 0.5, -n2], [-hd[0], -hd[1], -hd[2], hd[0], hd[1] + 1, 0], body, { rest: [-0.3, 0, 0], limb: 'head' }),
    rpart('snout', 'head', [0, -0.5, -hd[2]], [-sn[0], -sn[1], -sn[2], sn[0], sn[1] - 0.5, 0], { all: T.scale, front: T.snout }),
    rpart('jaw', 'head', [0, -hd[1], -1], [-sn[0] + 0.3, -1.4, -(hd[2] + sn[2] - 1.5), sn[0] - 0.3, 0, 0], { all: T.belly, top: T.mouth || T.belly }),
    rpart('eyeL', 'head', [-hd[0] - 0.05, 1.2, -hd[2] * 0.6], [-0.1, -0.6, -0.9, 0.1, 0.6, 0.9], T.eye, { glow: true }),
    rpart('eyeR', 'head', [hd[0] + 0.05, 1.2, -hd[2] * 0.6], [-0.1, -0.6, -0.9, 0.1, 0.6, 0.9], T.eye, { glow: true }),
    rpart('tail1', 'body', [0, 2, L], [-tw[0], -tw[0], 0, tw[0], tw[0], tl[0]], body, { rest: [0.25, 0, 0], limb: 'tail' }),
    rpart('tail2', 'tail1', [0, 0, tl[0]], [-tw[1], -tw[1], 0, tw[1], tw[1], tl[1]], body, { rest: [0.1, 0, 0], limb: 'tail' }),
    rpart('tail3', 'tail2', [0, 0, tl[1]], [-tw[2], -tw[2], 0, tw[2], tw[2], tl[2]], body, { rest: [0.05, 0, 0], limb: 'tail' }),
  ];
  const legY = hip - Hh + 1.5, lu = o.legU ?? legY / 2, ll = legY - lu, lw = o.legW ?? 2.5;
  const legs = o.noFront ? [['B', o.legZ ?? L * 0.25]] : [['F', -L * 0.62], ['B', L * 0.62]];
  for (const [nm, z] of legs) for (const s of [1, -1]) {
    const S = nm + (s > 0 ? 'R' : 'L');
    P.push(rpart('leg' + S, null, [s * (W - 0.5), legY, z], [-lw, -lu, -lw, lw, 0, lw], T.scale, { limb: 'leg' + S }));
    P.push(rpart('shin' + S, 'leg' + S, [0, -lu, 0], [-lw + 0.5, -ll, -lw, lw - 0.5, 0, lw - 0.5], T.scale, { limb: 'leg' + S }));
    if (o.claws) P.push(rpart('foot' + S, 'shin' + S, [0, -ll, -lw + 0.5], [-lw + 0.3, 0, -2.2, lw - 0.3, 1, 0], T.horn, {}));
  }
  // the wings, as in game/dragons.js: arm, forearm with a wrist claw, three fingers, skin between
  const wa = o.wingArm ?? 12, wf = o.wingFore ?? 14, wm = o.wingMemb ?? 14, wm2 = o.wingMemb2 ?? 12, fl = o.fingers || [17, 15, 12], fm = o.fingerMemb || [6, 7, 8], at = o.wingAt || [W + 0.5, Hh, -L * 0.5];
  for (const s of [1, -1]) {
    const S = s > 0 ? 'R' : 'L', X = (a, b) => s > 0 ? [a, b] : [-b, -a];
    const [a0, a1] = X(0, wa), [b0, b1] = X(0, wf), [c0, c1] = X(-0.6, 0.6), mem = { noCull: true, limb: 'wing' + S };
    if (o.wingAlpha) mem.alpha = o.wingAlpha;
    P.push(rpart('wing' + S, 'body', [s * at[0], at[1], at[2]], [a0, -1, -1, a1, 1, 1], T.bone, { limb: 'wing' + S }));
    P.push(rpart('wing' + S + 'm', 'wing' + S, [0, 0, 0.5], [a0, -0.2, 0, a1, 0.2, wm], T.wing, Object.assign({}, mem)));
    P.push(rpart('wing' + S + '2', 'wing' + S, [s * wa, 0, 0], [b0, -0.75, -0.75, b1, 0.75, 0.75], T.bone, { limb: 'wing' + S }));
    P.push(rpart('wing' + S + '2m', 'wing' + S + '2', [0, 0, 0.4], [b0, -0.2, 0, b1, 0.2, wm2], T.wing, Object.assign({}, mem)));
    P.push(rpart('wing' + S + 'c', 'wing' + S + '2', [s * wf, 0, 0], [c0, -0.5, -3, c1, 0.5, 0], T.horn, { rest: [0, s * 0.35, 0], limb: 'wing' + S }));
    for (let k = 0; k < 3; k++) {
      const [f0, f1] = X(0, fl[k]), [m0, m1] = X(0, fl[k] - 2.5);
      P.push(rpart('wing' + S + 'f' + k, 'wing' + S + '2', [s * wf, 0, 0], [f0, -0.45, -0.45, f1, 0.45, 0.45], T.bone, { rest: [0, s * DRAGON_FINGER[k][0], 0], limb: 'wing' + S }));
      P.push(rpart('wing' + S + 'f' + k + 'm', 'wing' + S + 'f' + k, [0, 0, 0.3], [m0, -0.2, 0, m1, 0.2, fm[k]], T.wing, Object.assign({}, mem)));
    }
  }
  for (const x of o.extras || []) P.push(rpart(x[0], x[1], x[2], x[3], x[4], x[5]));
  return finishRig('dragon', P, { hipY: hip, height: hip + Hh + 12, scale: o.scale || 1.5, post: o.post });
}

// ---- how they move ----------------------------------------------------------------------------------------
Object.assign(RIG_ANIM, {
  // worms: rise out of the ground, sway, and strike down at what's in front of them
  d2worm(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0) * 0.7, e = m.d2burrowed ? 0 : (m.d2emerge ?? 1);
    R.lift = -(1 - e) * ((d.height || 40) * RPX * (d.scale || 1) + 0.6);
    const k = m.d2strike || 0, n = d.wormN || 6, open = m.d2open || 0;
    for (let i = 0; i < n; i++) P['seg' + i] = [Math.sin(t * 1.6 - i * 0.7) * 0.05 - k * (i < n - 2 ? 0.3 : 0.12), Math.sin(t * 1.1 - i * 0.55) * 0.07 * (1 - k), Math.sin(t * 0.9 - i * 0.6) * 0.03];
    for (const p of m._M.parts) if (p.role === 'wjaw') P[p.name] = [-(open * 1.1) + Math.sin(t * 3 + (p.rest ? p.rest[1] : 0)) * 0.04, 0, 0];
  },
  // floating, limbless bodies (the fire and air elementals, the Lumina guardian): columns that sway or
  // spin, flames that flicker, shards that circle, arms that swing
  d2elem(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0) * 0.37, a = m.walkAmt || 0;
    R.lift = (d.float || 0) + Math.sin(t * 1.7) * (d.bob ?? 0.05);
    for (const p of m._M.parts) {
      const i = p.idx || 0;
      if (p.role === 'ecol') P[p.name] = d.spin ? [Math.sin(t * 2.3 + i) * 0.06, t * (2.2 + i * 0.9) * (i % 2 ? -1 : 1), Math.cos(t * 1.9 + i) * 0.06] : [Math.sin(t * 3.1 + i * 1.3) * 0.07 - a * 0.06, Math.sin(t * 2.3 + i * 1.7) * 0.2, Math.cos(t * 2.7 + i) * 0.07];
      else if (p.role === 'eflick') P[p.name] = [Math.sin(t * 9 + i * 2.1) * 0.18, 0, Math.cos(t * 7.3 + i * 1.3) * 0.18];
      else if (p.role === 'orbit') P[p.name] = [0, t * (d.orbSpeed || 1) * (m.d2fast ? 2.2 : 1) * (m.d2charge > 0 ? 3 : 1) + i / (p.n || 6) * TAU, 0];
      else if (p.role === 'halo') P[p.name] = [0, t * 0.35, 0];
    }
    P.body = [-0.18 * a + Math.sin(t * 1.3) * 0.03, Math.sin(t * 1.1) * 0.08, 0];
    P.head = [(m.headPitch || 0) * 0.7, (m.headYawRel || 0) * 0.8, Math.sin(t * 2) * 0.04];
    const sw = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0, side = m._swingSide || 1;
    P.armR = [Math.sin(t * 1.7) * 0.15 + 0.1 + (side > 0 ? sw * 1.7 : 0), 0, 0.3 + Math.sin(t * 2.1) * 0.08];
    P.armL = [Math.sin(t * 1.7 + 1) * 0.15 + 0.1 + (side < 0 ? sw * 1.7 : 0), 0, -0.3 - Math.sin(t * 2.1 + 1) * 0.08];
    P.foreR = [0.3 + (side > 0 ? sw * 0.5 : 0), 0, 0]; P.foreL = [0.3 + (side < 0 ? sw * 0.5 : 0), 0, 0];
    if (m.d2cast > 0) { P.armR = [2.5, 0, 0.45]; P.armL = [2.5, 0, -0.45]; }
  },
  // the salamander: a warrior's torso on a serpent's coils
  d2serp(m, d, P, R) {
    const a = m.walkAmt || 0, t = (m.age || 0) + (m.id || 0), sp = 2 + 6 * a, amp = 0.12 + 0.22 * a;
    for (const p of m._M.parts) {
      if (p.role === 'tseg') P[p.name] = [0, Math.sin(t * sp - p.idx * 0.9) * amp * (p.idx < 2 ? 0.25 : 1), 0];
      else if (p.role === 'eflick') P[p.name] = [Math.sin(t * 8 + p.idx * 1.9) * 0.15, 0, Math.cos(t * 6.5 + p.idx) * 0.12];
    }
    P.body = [-0.12 * a, Math.sin(t * sp) * 0.06, Math.sin(t * sp * 0.5) * 0.04];
    P.head = [(m.headPitch || 0) * 0.8, (m.headYawRel || 0) * 0.8, 0];
    const sw = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0;
    P.armR = [Math.sin(t * 1.3) * 0.05 + sw * 0.7, 0, 0]; P.foreR = [-sw * 0.6, 0, 0];
    P.armL = [Math.sin(t * 1.3 + 1) * 0.08, 0, -0.1]; P.foreL = [0, 0, 0];
    if (m.d2throwT > 0) { const k = Math.min(1, m.d2throwT / 0.7); P.armR = [-2.4 * k + 1.2 * (1 - k), 0, 0.2]; }
    if (m.d2grab) { P.armL = [1.1, 0, 0.2]; P.foreL = [0.4, 0, 0]; for (const p of m._M.parts) if (p.role === 'tseg' && p.idx > 2) P[p.name] = [0, -0.7 + Math.sin(t * 3 + p.idx) * 0.05, 0]; }
    R.lift = Math.sin(t * 1.5) * 0.012;
  },
  // the xorn: three legs stepping in turn, three arms, a mouth on top that opens
  d2tri(m, d, P, R) {
    const a = m.walkAmt || 0, ph = (m.walk || 0) * 1.3, t = (m.age || 0) + (m.id || 0);
    const sw = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0;
    for (const p of m._M.parts) {
      const i = p.idx || 0;
      if (p.role === 'xleg') P[p.name] = [Math.sin(ph + i * TAU / 3) * 0.55 * a, 0, 0];
      else if (p.role === 'xarm') P[p.name] = [Math.sin(t * 1.5 + i * 2) * 0.12 + (i === (m._xarm || 0) ? sw * 1.2 : sw * 0.25), 0, 0];
      else if (p.role === 'xjaw') P[p.name] = [-((m.d2open || 0) * 0.85 + Math.max(0, Math.sin(t * 0.9 + i)) * 0.08), 0, 0];
    }
    P.body = [Math.sin(ph) * 0.04 * a, Math.sin(t * 0.6) * 0.05, Math.sin(ph * 0.5) * 0.05 * a];
    const e = m.d2burrowed ? 0 : (m.d2emerge ?? 1);
    R.lift = Math.abs(Math.sin(ph * 1.5)) * 0.02 * a - (1 - e) * 1.4;
  },
  // the standing stone: it hops, and its fists float at its sides
  d2stone(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), awake = m.d2awake, hop = m.d2hop || 0;
    R.lift = awake ? Math.sin(hop * Math.PI) * 0.12 + Math.sin(t * 1.3) * 0.02 : 0;
    P.body = [awake ? -0.05 + Math.sin(t * 0.9) * 0.02 : 0, 0, awake ? Math.sin(hop * TAU) * 0.05 : 0];
    const sw = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0, side = m._swingSide || 1;
    for (const [n, s] of [['armR', 1], ['armL', -1]]) {
      let rx = Math.sin(t * 1.4 + s) * 0.12 + (side === s ? sw * 1.5 : 0);
      if (m.d2slam > 0) rx = 2.9 * Math.min(1, m.d2slam * 1.5);
      if (m.d2slamDown > 0) rx = 0.9;
      P[n] = [rx, 0, s * (0.12 + Math.sin(t * 1.1) * 0.04)];
    }
  },
});

// ---- poses over the kinds' own animation ------------------------------------------------------------------
Object.assign(RIG_POST, {
  d2mephit(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), fly = m.noGrav;
    const f = fly ? Math.sin(t * 22) * 0.6 : Math.sin(t * 3) * 0.08;
    P.wingL = [0, 0, -f - (fly ? 0.15 : 0)]; P.wingR = [0, 0, f + (fly ? 0.15 : 0)];
    P.tail = [Math.sin(t * 2) * 0.15, Math.sin(t * 1.3) * 0.3, 0];
    if (fly) { P.legL = [0.5, 0, 0]; P.legR = [0.3, 0, 0]; P.shinL = [-0.8, 0, 0]; P.shinR = [-0.6, 0, 0]; R.lift += Math.sin(t * 3) * 0.04; }
    if (m.d2breath > 0) { P.head = P.head || [0, 0, 0]; P.head[0] -= 0.25; P.armR = [1.3, 0, 0.5]; P.armL = [1.3, 0, -0.5]; }
  },
  // statue: crouched on its haunches, wings folded; awake: wings beating
  d2gargoyle(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0);
    if (m.d2statue) {
      R.lift -= 0.36;
      P.body = [-0.5, 0, 0]; P.head = [0.3, 0, 0];
      P.legL = [1.55, 0, -0.18]; P.legR = [1.55, 0, 0.18]; P.shinL = [-2.35, 0, 0]; P.shinR = [-2.35, 0, 0];
      P.armR = [0.95, 0, 0.12]; P.armL = [0.95, 0, -0.12]; P.foreR = [0.85, 0, 0]; P.foreL = [0.85, 0, 0];
      P.wingL = [0, 0.95, 1.3]; P.wingR = [0, -0.95, -1.3]; P.tail = [0.9, 0.6, 0];
      return;
    }
    const fly = m.noGrav && !m.onGround;
    if (fly) {
      const f = Math.sin(t * 9);
      P.wingL = [0, 0.15, -0.1 - f * 0.65]; P.wingR = [0, -0.15, 0.1 + f * 0.65];
      P.legL = [-0.5, 0, 0]; P.legR = [-0.4, 0, 0]; P.shinL = [-0.6, 0, 0]; P.shinR = [-0.6, 0, 0];
      P.body = [(P.body ? P.body[0] : 0) - 0.35, P.body ? P.body[1] : 0, 0];
      R.lift += Math.sin(t * 9) * 0.05;
    } else { P.wingL = [0, 0.8, 1.15]; P.wingR = [0, -0.8, -1.15]; }
    P.tail = [Math.sin(t * 1.5) * 0.1 + 0.3, Math.sin(t * 1.1) * 0.3, 0];
  },
  // griffons and hippogriffs: wings folded along the flanks on the ground, beating in the air
  d2wings(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), fly = m.noGrav && !m.onGround;
    if (fly) {
      const glide = m.d2dive > 0, f = Math.sin(t * 8);
      P.wingL = [0, 0.1, glide ? -0.05 : -0.1 - f * 0.75]; P.wingR = [0, -0.1, glide ? 0.05 : 0.1 + f * 0.75];
      P.wingL2 = [0, 0, glide ? 0 : -Math.sin(t * 8 - 0.8) * 0.4]; P.wingR2 = [0, 0, glide ? 0 : Math.sin(t * 8 - 0.8) * 0.4];
      for (const k of ['legFL', 'legFR']) P[k] = [glide ? 1.1 : 0.55, 0, 0];
      for (const k of ['legBL', 'legBR']) P[k] = [-0.9, 0, 0];
      R.pitch += glide ? -0.25 : 0.04;
    } else {
      // folded: the span swings back along the flank (yaw), the plate hangs down and a little out (pitch about the span)
      const br = Math.sin(t * 1.3) * 0.03;
      P.wingL = [1.75 + br, 1.57, 0]; P.wingR = [1.75 + br, -1.57, 0]; P.wingL2 = [0, 0.12, 0]; P.wingR2 = [0, -0.12, 0];
    }
  },
  // the harpy: arms become wings in flight; her head thrown back while she sings
  d2harpy(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), fly = m.noGrav && !m.onGround;
    if (fly) {
      const f = Math.sin(t * 10);
      P.armR = [0.15, 0, 1.45 + f * 0.6]; P.armL = [0.15, 0, -1.45 - f * 0.6]; P.foreR = [0, 0, 0.15]; P.foreL = [0, 0, -0.15];
      P.legL = [0.7, 0, 0]; P.legR = [0.5, 0, 0]; P.shinL = [-1.2, 0, 0]; P.shinR = [-1.0, 0, 0];
      P.body = [-0.2, P.body ? P.body[1] : 0, 0];
      R.lift += f * 0.05;
    }
    if (m.d2sing > 0) { P.head = P.head || [0, 0, 0]; P.head[0] += 0.3 + Math.sin(t * 3) * 0.08; P.head[2] = Math.sin(t * 1.7) * 0.15; }
  },
  // the roc: long slow beats, a glide when it falls, talons forward when it carries
  d2roc(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), fly = m.noGrav && !m.onGround;
    if (fly) {
      const glide = (m.vy || 0) < -1.5 || m.d2glide, f = glide ? 0 : Math.sin(t * 3.4);
      P.wingR = [0, 0, 1.5 + f * 0.5]; P.wingL = [0, 0, -1.5 - f * 0.5];
      P.wingR2 = [0, 0, glide ? -0.05 : -Math.sin(t * 3.4 - 0.9) * 0.3]; P.wingL2 = [0, 0, glide ? 0.05 : Math.sin(t * 3.4 - 0.9) * 0.3];
      P.legL = [m.d2grab ? 0.4 : -1.0, 0, 0]; P.legR = [m.d2grab ? 0.4 : -1.0, 0, 0];
      R.pitch = clamp(-(m.vy || 0) * 0.03, -0.35, 0.35) + (glide ? 0.1 : 0);
      R.lift += -f * 0.06;
    } else { P.wingR = [0, 0, 0.04]; P.wingL = [0, 0, -0.04]; P.wingR2 = [0, 0, 3.05]; P.wingL2 = [0, 0, -3.05]; }
  },
  // the giant scorpion: pincers that snap, a tail that strikes over its back
  d2scorp(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), k = m.striking > 0 ? Math.sin(Math.min(1, m.striking / 0.4) * Math.PI) : 0;
    for (let i = 1; i <= 6; i++) P['tail' + i] = [-0.14 * k - Math.sin(t * 1.6 + i * 0.7) * 0.04, Math.sin(t * 0.9 + i * 0.5) * 0.04, 0];
    P.sting = [-k * 1.0, 0, 0];
    const snap = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0, hold = m.d2grab ? 1 : 0;
    P.pinR = [0.3 + Math.max(0, Math.sin(t * 2.6)) * 0.35 - snap * 0.55 - hold * 0.3, 0, 0];
    P.pinL = [0.3 + Math.max(0, Math.sin(t * 2.6 + 1.5)) * 0.35 - snap * 0.55, 0, 0];
    P.clawArmR = [0, -snap * 0.3, 0]; P.clawArmL = [0, snap * 0.3, 0];
  },
  // the ankheg: comes up out of the earth nose first; mandibles work; it rears to spit
  d2ankheg(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), e = m.d2burrowed ? 0 : (m.d2emerge ?? 1);
    R.lift -= (1 - e) * 1.4; R.pitch += (1 - e) * -0.5 + (m.d2spit > 0 ? -0.22 : 0);
    const open = Math.max(m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0, m.d2grab ? 0.2 : 0, m.d2spit > 0 ? 0.85 : 0);
    P.mandL = [0, -0.35 + open * 0.85 + Math.sin(t * 5) * 0.03, 0]; P.mandR = [0, 0.35 - open * 0.85 - Math.sin(t * 5) * 0.03, 0];
    P.antL = [Math.sin(t * 2.3) * 0.15, Math.sin(t * 1.7) * 0.1, 0]; P.antR = [Math.sin(t * 2.3 + 1) * 0.15, -Math.sin(t * 1.7 + 1) * 0.1, 0];
    if (m.d2spit > 0) { P.head = P.head || [0, 0, 0]; P.head[0] += 0.35; }
  },
  // the hell hound: rears its head before it breathes, jaws wide while it does
  d2hound(m, d, P, R) {
    const sw = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0;
    P.jaw = [m.d2breath > 0 ? -0.65 : -0.05 - sw * 0.55, 0, 0];
    P.head = P.head || [0, 0, 0];
    if (m.d2wind > 0) P.head[0] += 0.4; else if (m.d2breath > 0) P.head[0] -= 0.1;
    P.tailFire = [Math.sin((m.age || 0) * 9) * 0.15, 0, 0];
  },
  // the corrupted beast: petals that breathe, head low to charge, high to roar
  d2beast(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0);
    for (const p of m._M.parts) if (p.role === 'petal') P[p.name] = [Math.sin(t * 1.3 + p.idx) * 0.08 + (m.d2roarT > 0 ? -0.25 : 0), 0, Math.sin(t * 2.1 + p.idx * 1.7) * 0.06];
    P.head = P.head || [0, 0, 0];
    if (m.d2chg > 0 || m.d2paw > 0) P.head[0] -= 0.45;
    if (m.d2roarT > 0) P.head[0] += 0.45;
    if (m.d2paw > 0) { P.legFR = [Math.sin(t * 14) * 0.6 - 0.2, 0, 0]; }
  },
  // gnolls stoop
  d2hunch(m, d, P, R) {
    P.body = P.body || [0, 0, 0]; P.body[0] -= 0.22;
    P.head = P.head || [0, 0, 0]; P.head[0] += 0.2;
    if (m.d2rageT > 0) { P.head[0] += Math.sin((m.age || 0) * 20) * 0.08; }
  },
  // golems and the earth elemental: both arms up to slam; rising out of the ground
  d2golem(m, d, P, R) {
    if (m.d2cast > 0) { P.armR = [2.6, 0, 0.3]; P.armL = [2.6, 0, -0.3]; P.foreR = [0.2, 0, 0]; P.foreL = [0.2, 0, 0]; }
    const e = m.d2burrowed ? 0 : (m.d2emerge ?? 1);
    if (e < 1) { R.lift -= (1 - e) * (d.height || 32) * RPX * (d.scale || 1); P.armR = [2.8, 0, 0.4]; P.armL = [2.8, 0, -0.4]; }
  },
  // the crystal sentinel thrums before it blasts: arms out, body shivering
  d2sentinel(m, d, P, R) {
    if (!(m.d2hum > 0)) return;
    const t = (m.age || 0) * 40;
    P.armR = [0.2, 0, 1.25 + Math.sin(t) * 0.05]; P.armL = [0.2, 0, -1.25 - Math.sin(t) * 0.05];
    P.body = [Math.sin(t * 1.3) * 0.03, Math.sin(t) * 0.03, 0];
  },
  // the wyvern curls its tail forward over its back to sting
  d2wyvern(m, d, P, R) {
    const k = m.d2sting > 0 ? Math.sin(Math.min(1, m.d2sting / 0.5) * Math.PI) : 0;
    if (!k) return;
    const add = (n, x) => { const v = P[n] || (P[n] = [0, 0, 0]); v[0] += x; };
    add('tail1', -0.5 * k); add('tail2', -0.7 * k); add('tail3', -0.8 * k); add('tail4', -0.6 * k);
  },
});

// ---- the bodies -------------------------------------------------------------------------------------------
{
  const D = MODEL_DEFS;
  const ear = (name, at, w, h, tex, rest) => [name, 'head', at, [-w / 2, 0, -0.5, w / 2, h, 0.5], tex, { role: 'ear', rest: rest || [0, 0, 0] }];
  const snout = (at, w, h, l, tex) => ['snout', 'head', at, [-w / 2, -h / 2, -l, w / 2, h / 2, 0], tex];
  const overlay = (name, parent, box, tex, extra) => [name, parent, [0, 0, 0], box, tex, Object.assign({ glow: true, noCull: true }, extra || {})];
  const hideUnder = (def, moundTex, mound) => { for (const p of def.parts) p.not = 'd2burrowed'; def.parts.unshift(rpart('mound', null, [0, 0, 0], mound || [-7, -1.5, -7, 7, 2.5, 7], moundTex, { only: 'd2burrowed' })); return def; };

  // ---- Mount Cinder ----
  D.magma_mephit = bipedRig({
    head: [6, 6, 6], body: [6, 6, 4], arm: [2, 6, 2], leg: [2, 5, 2], legX: 1.5, armX: 4,
    tex: { head: { all: 'magma_mephit_skin', front: 'magma_mephit_face' }, body: { all: 'magma_mephit_skin', front: 'magma_mephit_core' }, arm: 'magma_mephit_skin', leg: 'magma_mephit_skin' },
    extras: [
      overlay('eyes', 'head', [-3, 0, -3.08, 3, 6, -3.02], 'magma_mephit_eyes'),
      ['hornL', 'head', [-2, 5.5, -0.5], [-0.6, 0, -0.6, 0.6, 3, 0.6], 'magma_mephit_horn', { rest: [0.4, 0, 0.45] }],
      ['hornR', 'head', [2, 5.5, -0.5], [-0.6, 0, -0.6, 0.6, 3, 0.6], 'magma_mephit_horn', { rest: [0.4, 0, -0.45] }],
      ['wingL', 'body', [-1.5, 5, 2], [-9, -0.2, -1, 0, 0.2, 6], 'magma_mephit_wing', { noCull: true, rest: [0, 0.35, -0.45] }],
      ['wingR', 'body', [1.5, 5, 2], [0, -0.2, -1, 9, 0.2, 6], 'magma_mephit_wing', { noCull: true, rest: [0, -0.35, 0.45] }],
      ['tail', 'body', [0, 1, 2], [-0.6, -0.6, 0, 0.6, 0.6, 5], 'magma_mephit_skin', { rest: [-0.4, 0, 0] }],
      ['tailTip', 'tail', [0, 0, 5], [-1, -1, 0, 1, 1, 2], 'magma_mephit_core', { glow: true }],
    ],
  });
  D.magma_mephit.post = 'd2mephit';

  {
    const F = 'fire_elemental_', parts = [
      rpart('col0', null, [0, 0, 0], [-2.5, 0, -2.5, 2.5, 7, 2.5], F + 'flame', { role: 'ecol', idx: 0, glow: true }),
      rpart('col1', 'col0', [0, 7, 0], [-4, 0, -4, 4, 7, 4], F + 'flame', { role: 'ecol', idx: 1, glow: true }),
      rpart('body', 'col1', [0, 7, 0], [-6.5, 0, -4.5, 6.5, 11, 4.5], { all: F + 'flame', front: F + 'chest' }, { role: 'ebody', glow: true }),
      rpart('head', 'body', [0, 11, 0], [-4, 0, -4, 4, 8, 4], { all: F + 'flame', front: F + 'face', top: F + 'core' }, { role: 'ehead', limb: 'head', glow: true }),
      rpart('armR', 'body', [7.5, 9.5, 0], [-2, -8, -2, 2, 1.5, 2], F + 'flame', { role: 'earm', side: 1, glow: true }),
      rpart('foreR', 'armR', [0, -8, 0], [-2.6, -7, -2.6, 2.6, 0, 2.6], F + 'fist', { role: 'efore', side: 1, glow: true }),
      rpart('armL', 'body', [-7.5, 9.5, 0], [-2, -8, -2, 2, 1.5, 2], F + 'flame', { role: 'earm', side: -1, glow: true }),
      rpart('foreL', 'armL', [0, -8, 0], [-2.6, -7, -2.6, 2.6, 0, 2.6], F + 'fist', { role: 'efore', side: -1, glow: true }),
      rpart('shL', 'body', [-5.5, 11, 0], [-1.5, 0, -1.5, 1.5, 5, 1.5], F + 'tongue', { role: 'eflick', idx: 5, glow: true, rest: [0, 0, 0.35] }),
      rpart('shR', 'body', [5.5, 11, 0], [-1.5, 0, -1.5, 1.5, 5, 1.5], F + 'tongue', { role: 'eflick', idx: 6, glow: true, rest: [0, 0, -0.35] }),
    ];
    [[-2.5, -1.5, 5], [0, -2, 7], [2.5, -1.5, 5], [-1.5, 1.8, 4.5], [1.5, 1.8, 4.5]].forEach(([x, z, h], i) =>
      parts.push(rpart('fl' + i, 'head', [x, 8, z], [-1.2, 0, -1.2, 1.2, h, 1.2], F + 'tongue', { role: 'eflick', idx: i, glow: true, rest: [z * 0.1, 0, -x * 0.12] })));
    D.fire_elemental = finishRig('d2elem', parts, { hipY: 14, height: 40, scale: 1.05, float: 0.15 });
  }

  {
    const SA = 'salamander_', sc = SA + 'scales', parts = [
      rpart('body', null, [0, 13, 0], [-4.5, 0, -3, 4.5, 11, 3], { all: sc, front: SA + 'belly' }, { role: 'sbody' }),
      rpart('head', 'body', [0, 11, -0.5], [-3.2, 0, -3.5, 3.2, 5, 3], { all: sc, front: SA + 'face' }, { limb: 'head' }),
      rpart('snout', 'head', [0, 0.3, -3.5], [-2.4, 0, -4, 2.4, 2.8, 0], { all: sc, front: SA + 'snout' }),
      rpart('armR', 'body', [5.6, 9.5, 0], [-1.6, -6, -1.6, 1.6, 1.5, 1.6], sc, { limb: 'armR', rest: [0.5, 0, 0.15] }),
      rpart('foreR', 'armR', [0, -6, 0], [-1.4, -6, -1.4, 1.4, 0, 1.4], sc, { limb: 'armR', rest: [0.7, 0, 0] }),
      rpart('spear', 'foreR', [0, -5.2, 0], [-0.5, -0.5, -18, 0.5, 0.5, 9], SA + 'spear', { not: 'd2spearOut', rest: [-1.2, 0, 0] }),
      rpart('spearTip', 'spear', [0, 0, -18], [-1.1, -1.1, -4.5, 1.1, 1.1, 0], SA + 'tip', { glow: true, not: 'd2spearOut' }),
      rpart('armL', 'body', [-5.6, 9.5, 0], [-1.6, -6, -1.6, 1.6, 1.5, 1.6], sc, { limb: 'armL', rest: [0.3, 0, -0.15] }),
      rpart('foreL', 'armL', [0, -6, 0], [-1.4, -6, -1.4, 1.4, 0, 1.4], sc, { limb: 'armL', rest: [0.5, 0, 0] }),
      rpart('tseg0', 'body', [0, 0.5, 0.5], [-4.2, -7, -3.4, 4.2, 0.5, 3.4], sc, { role: 'tseg', idx: 0 }),
      rpart('tseg1', 'tseg0', [0, -7, 0], [-3.8, -6, -3.2, 3.8, 0, 3.2], sc, { role: 'tseg', idx: 1, rest: [-0.8, 0, 0] }),
      rpart('tseg2', 'tseg1', [0, -6, 0], [-3.4, -6, -3, 3.4, 0, 3], { all: sc, front: SA + 'belly' }, { role: 'tseg', idx: 2, rest: [-0.75, 0, 0] }),
    ];
    let prev = 'tseg2';
    [6, 5, 4, 3].forEach((w, k) => { parts.push(rpart('tseg' + (k + 3), prev, [0, -6, 0], [-w / 2, -6, -w * 0.45, w / 2, 0, w * 0.45], sc, { role: 'tseg', idx: k + 3 })); prev = 'tseg' + (k + 3); });
    parts.push(rpart('tailFire', prev, [0, -6, 0], [-1, -3, -1, 1, 0, 1], SA + 'crest', { glow: true, role: 'eflick', idx: 7 }));
    [[0, 5, -1.5, 4.5, 0.35], [0, 5, 1, 4, 0.6], [0, 3.5, 3, 3.5, 1.0]].forEach(([x, y, z, h, r], i) => parts.push(rpart('cr' + i, 'head', [x, y, z], [-0.6, 0, -1.2, 0.6, h, 1.2], SA + 'crest', { glow: true, role: 'eflick', idx: i, rest: [r, 0, 0] })));
    [[10, 4, 1.2], [6, 3.5, 1.3], [2, 3, 1.4]].forEach(([y, h, r], i) => parts.push(rpart('crb' + i, 'body', [0, y, 3], [-0.6, 0, -1.2, 0.6, h, 1.2], SA + 'crest', { glow: true, role: 'eflick', idx: i + 3, rest: [r, 0, 0] })));
    D.salamander = finishRig('d2serp', parts, { hipY: 13, height: 30, scale: 1.25 });
  }

  D.hell_hound = quadRig({
    body: [8, 8, 16], leg: [3, 10], head: [7, 6, 6], headAt: [2.5, 0], tail: [2, 9, 2], tailRest: -2.0, gallop: true, post: 'd2hound',
    tex: { body: { all: 'hell_hound_fur', top: 'hell_hound_back' }, head: { all: 'hell_hound_fur', front: 'hell_hound_face', top: 'hell_hound_back' }, leg: 'hell_hound_fur', tail: 'hell_hound_back' },
    extras: [
      snout([0, -1.2, -6], 4, 3, 4.5, { all: 'hell_hound_fur', front: 'hell_hound_snout' }),
      ['jaw', 'snout', [0, -1.5, 0], [-1.8, -1.2, -4.3, 1.8, 0, 0], { all: 'hell_hound_fur', top: 'hell_hound_jaw', front: 'hell_hound_jaw' }],
      overlay('eyes', 'head', [-3.5, -3, -6.08, 3.5, 3, -6.02], 'hell_hound_eyes'),
      ear('earL', [-2.5, 3, -1.5], 2, 3, 'hell_hound_back', [0, 0, -0.2]), ear('earR', [2.5, 3, -1.5], 2, 3, 'hell_hound_back', [0, 0, 0.2]),
      ['mane', 'body', [0, 4, -2], [-1.6, 0, -6, 1.6, 3.5, 7], 'hell_hound_mane', { noCull: true }],
      ['tailFire', 'tail', [0, -9, 0], [-1.4, -4.5, -1.4, 1.4, 0, 1.4], 'hell_hound_flame', { glow: true }],
    ],
  });

  D.gargoyle = bipedRig({
    head: [7, 7, 7], body: [9, 11, 6], arm: [3, 11, 3], leg: [3, 11, 4], legX: 2.2,
    tex: { head: { all: 'gargoyle_stone', front: 'gargoyle_face' }, body: 'gargoyle_stone', arm: 'gargoyle_stone', leg: 'gargoyle_stone' },
    extras: [
      overlay('eyes', 'head', [-3.5, 0, -3.58, 3.5, 7, -3.52], 'gargoyle_eyes', { only: 'd2awake' }),
      ['hornL', 'head', [-2.5, 7, 0], [-0.6, 0, -0.6, 0.6, 4, 0.6], 'gargoyle_horn', { rest: [0.5, 0, 0.45] }],
      ['hornL2', 'hornL', [0, 4, 0], [-0.45, 0, -0.45, 0.45, 3, 0.45], 'gargoyle_horn', { rest: [0.8, 0, 0] }],
      ['hornR', 'head', [2.5, 7, 0], [-0.6, 0, -0.6, 0.6, 4, 0.6], 'gargoyle_horn', { rest: [0.5, 0, -0.45] }],
      ['hornR2', 'hornR', [0, 4, 0], [-0.45, 0, -0.45, 0.45, 3, 0.45], 'gargoyle_horn', { rest: [0.8, 0, 0] }],
      ['brow', 'head', [0, 4.8, -3.5], [-3.7, 0, -1, 3.7, 1.2, 0], 'gargoyle_stone'],
      ['wingL', 'body', [-2.5, 10, 2.5], [-13, -0.25, -1, 0, 0.25, 10], 'gargoyle_wing', { noCull: true }],
      ['wingLb', 'wingL', [0, 0, 0], [-13, -0.6, -1.4, 0, 0.6, 0], 'gargoyle_stone'],
      ['wingR', 'body', [2.5, 10, 2.5], [0, -0.25, -1, 13, 0.25, 10], 'gargoyle_wing', { noCull: true }],
      ['wingRb', 'wingR', [0, 0, 0], [0, -0.6, -1.4, 13, 0.6, 0], 'gargoyle_stone'],
      ['tail', 'body', [0, 1, 3], [-0.75, -0.75, 0, 0.75, 0.75, 8], 'gargoyle_stone', { rest: [0.6, 0, 0] }],
      ['tailTip', 'tail', [0, 0, 8], [-1.6, -0.3, 0, 1.6, 0.3, 2.5], 'gargoyle_horn'],
    ],
  });
  D.gargoyle.post = 'd2gargoyle';

  {
    const spines = [];
    for (let i = 0; i < 7; i++) { const z = -9 + i * 3; spines.push(['spB' + i, 'body', [0, 5.5, z], [-0.5, 0, -1.2, 0.5, 3.4 - Math.abs(z) / 9 * 1.6, 1.2], 'young_red_dragon_spine', { rest: [0.45, 0, 0] }]); }
    for (const [p, z, y] of [['neck1', -2, 4], ['neck1', -6, 4], ['neck2', -2, 3.6], ['neck2', -6, 3.6], ['tail1', 3, 3.2], ['tail1', 7, 3.2], ['tail2', 4, 2.3], ['tail2', 8, 2.3]]) spines.push(['sp' + spines.length, p, [0, y, z], [-0.4, 0, -1, 0.4, 2.2, 1], 'young_red_dragon_spine', { rest: [0.5, 0, 0] }]);
    D.young_red_dragon = d2DragonRig({
      tex: { scale: 'young_red_dragon_scale', belly: 'young_red_dragon_belly', wing: 'young_red_dragon_wing', bone: 'young_red_dragon_bone', horn: 'young_red_dragon_horn', eye: 'young_red_dragon_eye', snout: 'young_red_dragon_snout', mouth: 'young_red_dragon_mouth' },
      hip: 13, W: 5.5, Hh: 4.5, L: 11, neck1: 9, nw1: 3, neck2: 8, nw2: 2.6, head: [4, 2.8, 7], snout: [2.8, 2.3, 6], tail: [10, 10, 9], tailW: [3.2, 2.3, 1.4],
      wingArm: 11, wingFore: 13, wingMemb: 13, wingMemb2: 11, fingers: [16, 14, 11], claws: true, scale: 1.6,
      extras: spines.concat([
        ['hornL', 'head', [-2.4, 3.2, -1.5], [-0.9, -0.8, 0, 0.9, 0.8, 6.5], 'young_red_dragon_horn', { rest: [-0.3, -0.35, 0] }],
        ['hornL2', 'hornL', [0, 0, 6.5], [-0.6, -0.6, 0, 0.6, 0.6, 4], 'young_red_dragon_horn', { rest: [-0.6, 0.1, 0] }],
        ['hornR', 'head', [2.4, 3.2, -1.5], [-0.9, -0.8, 0, 0.9, 0.8, 6.5], 'young_red_dragon_horn', { rest: [-0.3, 0.35, 0] }],
        ['hornR2', 'hornR', [0, 0, 6.5], [-0.6, -0.6, 0, 0.6, 0.6, 4], 'young_red_dragon_horn', { rest: [-0.6, -0.1, 0] }],
        ['hornLs', 'head', [-3.6, 1.5, -0.5], [-0.5, -0.5, 0, 0.5, 0.5, 3.5], 'young_red_dragon_horn', { rest: [-0.1, -0.7, 0] }],
        ['hornRs', 'head', [3.6, 1.5, -0.5], [-0.5, -0.5, 0, 0.5, 0.5, 3.5], 'young_red_dragon_horn', { rest: [-0.1, 0.7, 0] }],
        ['noseHorn', 'snout', [0, 1.8, -4.5], [-0.5, 0, -0.5, 0.5, 1.6, 0.5], 'young_red_dragon_horn', { rest: [-0.4, 0, 0] }],
        ['frillL', 'head', [-4.05, -0.5, -2], [-0.15, -2.4, 0, 0.15, 2.4, 4.5], 'young_red_dragon_wing', { rest: [0, -0.55, 0], noCull: true }],
        ['frillR', 'head', [4.05, -0.5, -2], [-0.15, -2.4, 0, 0.15, 2.4, 4.5], 'young_red_dragon_wing', { rest: [0, 0.55, 0], noCull: true }],
        ['bladeC', 'tail3', [0, 0, 9], [-0.6, -0.4, 0, 0.6, 0.4, 5.5], 'young_red_dragon_spine'],
        ['bladeL', 'tail3', [0, 0, 14.5], [-0.3, -0.25, -4.5, 0.3, 0.25, 0], 'young_red_dragon_spine', { rest: [0, 0.6, 0] }],
        ['bladeR', 'tail3', [0, 0, 14.5], [-0.3, -0.25, -4.5, 0.3, 0.25, 0], 'young_red_dragon_spine', { rest: [0, -0.6, 0] }],
      ]),
    });
  }

  D.magma_worm = d2WormRig({
    n: 6, w0: 10, w1: 9, L: 8, scale: 1.35, bend: [0.15, 0.05, -0.15, -0.3, -0.4, -0.45], ring: true, ringGlow: true,
    tex: { skin: 'magma_worm_plate', mouth: 'magma_worm_mouth', ring: 'magma_worm_seam', mound: 'magma_worm_mound' },
  });

  // ---- the Crystal Caverns ----
  D.earth_elemental = bipedRig({
    head: [8, 7, 8], body: [20, 15, 12], arm: [8, 20, 8], leg: [8, 11, 8], armX: 14, legX: 5, heavy: true,
    tex: { head: { all: 'earth_elemental_rock', front: 'earth_elemental_face', top: 'earth_elemental_top' }, body: { all: 'earth_elemental_rock', top: 'earth_elemental_top' }, arm: 'earth_elemental_rock', leg: 'earth_elemental_rock' },
    extras: [
      overlay('eyes', 'head', [-4, 0, -4.08, 4, 7, -4.02], 'earth_elemental_eyes'),
      ['bouldR', 'armR', [0, 2, 0], [-5.5, -3, -5.5, 5.5, 5, 5.5], { all: 'earth_elemental_rock', top: 'earth_elemental_top' }],
      ['bouldL', 'armL', [0, 2, 0], [-5.5, -3, -5.5, 5.5, 5, 5.5], { all: 'earth_elemental_rock', top: 'earth_elemental_top' }],
      ['fistR', 'foreR', [0, -9, 0], [-5, -6, -5, 5, 1, 5], 'earth_elemental_fist'],
      ['fistL', 'foreL', [0, -9, 0], [-5, -6, -5, 5, 1, 5], 'earth_elemental_fist'],
      ['back', 'body', [0, 8, 6], [-8, -6, 0, 8, 6, 3], 'earth_elemental_rock'],
      ['cry0', 'body', [-4, 15, 3], [-1.2, 0, -1.2, 1.2, 5, 1.2], 'earth_elemental_crystal', { glow: true, rest: [0.3, 0, 0.3] }],
      ['cry1', 'body', [3, 15, 4], [-1, 0, -1, 1, 4, 1], 'earth_elemental_crystal', { glow: true, rest: [0.4, 0, -0.35] }],
      ['cry2', 'bouldL', [-2, 5, 1], [-0.9, 0, -0.9, 0.9, 3.5, 0.9], 'earth_elemental_crystal', { glow: true, rest: [0, 0, 0.4] }],
      ['cry3', 'bouldR', [2, 5, -1], [-0.8, 0, -0.8, 0.8, 3, 0.8], 'earth_elemental_crystal', { glow: true, rest: [0.2, 0, -0.3] }],
    ],
  });
  Object.assign(D.earth_elemental, { scale: 1.3, post: 'd2golem' });
  hideUnder(D.earth_elemental, 'earth_elemental_top', [-10, -1.5, -10, 10, 4, 10]);

  {
    const XO = 'xorn_', xp = [rpart('body', null, [0, 5, 0], [-6, 0, -6, 6, 13, 6], { all: XO + 'hide', top: XO + 'maw' }, { role: 'xbody' })];
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU, b = a + Math.PI / 3, sx = Math.sin(a), cz = -Math.cos(a), bx = Math.sin(b), bz = -Math.cos(b);
      xp.push(rpart('eye' + i, 'body', [sx * 6.2, 10.5, cz * 6.2], [-1.3, -1.3, -0.6, 1.3, 1.3, 0.6], XO + 'eye', { rest: [0, -a, 0] }));
      xp.push(rpart('jaw' + i, 'body', [0, 13, 0], [-3.6, 0, -6.2, 3.6, 3.2, -5.2], XO + 'jaw', { role: 'xjaw', idx: i, rest: [0.15, -a, 0], noCull: true }));
      xp.push(rpart('arm' + i, 'body', [bx * 5.6, 10, bz * 5.6], [-1.3, -6.5, -1.3, 1.3, 1, 1.3], XO + 'hide', { role: 'xarm', idx: i, rest: [0.75, -b, 0], limb: 'arm' + i }));
      xp.push(rpart('fore' + i, 'arm' + i, [0, -6.5, 0], [-1.1, -5, -1.1, 1.1, 0, 1.1], XO + 'hide', { rest: [-0.9, 0, 0], limb: 'arm' + i }));
      xp.push(rpart('claw' + i, 'fore' + i, [0, -5, 0], [-1.4, -3, -1.4, 1.4, 0, 1.4], XO + 'claw', { limb: 'arm' + i }));
      xp.push(rpart('leg' + i, 'body', [bx * 3.6, 0.5, bz * 3.6], [-1.8, -5.5, -1.8, 1.8, 0, 1.8], XO + 'hide', { role: 'xleg', idx: i, rest: [0.15, -b, 0] }));
    }
    D.xorn = hideUnder(finishRig('d2tri', xp, { hipY: 5, height: 20, scale: 1 }), 'ankheg_mound', [-6, -1.5, -6, 6, 2.5, 6]);
  }

  D.stone_golem = bipedRig({
    head: [9, 9, 8], body: [18, 16, 11], arm: [7, 20, 7], leg: [7, 14, 7], armX: 12.5, legX: 4.5, heavy: true,
    tex: { head: { all: 'stone_golem_block', front: 'stone_golem_face' }, body: 'stone_golem_block', arm: 'stone_golem_block', fore: 'stone_golem_dark', leg: 'stone_golem_block', shin: 'stone_golem_dark' },
    extras: [
      overlay('eyes', 'head', [-4.5, 0, -4.08, 4.5, 9, -4.02], 'stone_golem_eyes'),
      overlay('runes', 'body', [-9, 0, -5.58, 9, 16, -5.52], 'stone_golem_runes'),
      ['pauldR', 'armR', [0, 1, 0], [-4.5, -2, -4.5, 4.5, 3, 4.5], 'stone_golem_block'],
      ['pauldL', 'armL', [0, 1, 0], [-4.5, -2, -4.5, 4.5, 3, 4.5], 'stone_golem_block'],
      ['brow', 'head', [0, 6, -4], [-5, 0, -1.5, 5, 1.5, 0], 'stone_golem_dark'],
      ['belt', 'body', [0, 0, 0], [-9.3, 0, -5.8, 9.3, 2.5, 5.8], 'stone_golem_dark'],
    ],
  });
  Object.assign(D.stone_golem, { scale: 1.2, post: 'd2golem' });

  D.rust_monster = quadRig({
    body: [10, 7, 15], leg: [3, 7], head: [6, 6, 5], headAt: [0, 0], tail: [1.6, 1.6, 9], tailRest: 0.05,
    tex: { body: { all: 'rust_monster_shell', bottom: 'rust_monster_belly' }, head: { all: 'rust_monster_shell', front: 'rust_monster_face' }, leg: 'rust_monster_belly', tail: 'rust_monster_shell' },
    extras: [
      ['paddle', 'tail', [0, -0.8, 9], [-3.5, -0.3, 0, 3.5, 0.3, 4.5], 'rust_monster_tail', { noCull: true }],
      ['antL', 'head', [-1.5, 3, -3.5], [-1.4, 0, -0.25, 1.4, 6, 0.25], 'rust_monster_antenna', { noCull: true, rest: [-0.6, 0, 0.3] }],
      ['antL2', 'antL', [0, 6, 0], [-1.2, 0, -0.25, 1.2, 5, 0.25], 'rust_monster_antenna', { noCull: true, rest: [-0.6, 0, 0] }],
      ['antR', 'head', [1.5, 3, -3.5], [-1.4, 0, -0.25, 1.4, 6, 0.25], 'rust_monster_antenna', { noCull: true, rest: [-0.6, 0, -0.3] }],
      ['antR2', 'antR', [0, 6, 0], [-1.2, 0, -0.25, 1.2, 5, 0.25], 'rust_monster_antenna', { noCull: true, rest: [-0.6, 0, 0] }],
      ['plate0', 'body', [0, 3.5, -4.5], [-4.6, 0, -2.5, 4.6, 1.5, 3], 'rust_monster_shell', { rest: [-0.12, 0, 0] }],
      ['plate1', 'body', [0, 3.5, 0], [-4.6, 0, -2.5, 4.6, 1.5, 3], 'rust_monster_shell', { rest: [-0.12, 0, 0] }],
      ['plate2', 'body', [0, 3.5, 4.5], [-4.2, 0, -2.5, 4.2, 1.2, 2.5], 'rust_monster_shell', { rest: [-0.12, 0, 0] }],
      ['mandL', 'head', [-1.6, -2.4, -5], [-0.5, -0.5, -2, 0.5, 0.5, 0], 'rust_monster_belly', { rest: [0.3, 0.3, 0] }],
      ['mandR', 'head', [1.6, -2.4, -5], [-0.5, -0.5, -2, 0.5, 0.5, 0], 'rust_monster_belly', { rest: [0.3, -0.3, 0] }],
    ],
  });

  D.giant_bat = batRig({ scale: 0.85, tex: { body: 'giant_bat_fur', head: { all: 'giant_bat_fur', front: 'giant_bat_face' }, wing: 'giant_bat_wing' } });
  D.giant_bat.parts.push(rpart('nose', 'head', [0, 2, -3], [-1, -1, -1, 1, 1.5, 0], 'giant_bat_fur', {}));
  D.giant_bat.parts.push(rpart('feetL', 'body', [-1.5, -12, 0], [-0.6, -2, -0.6, 0.6, 0, 0.6], 'giant_bat_wing', {}));
  D.giant_bat.parts.push(rpart('feetR', 'body', [1.5, -12, 0], [-0.6, -2, -0.6, 0.6, 0, 0.6], 'giant_bat_wing', {}));

  D.crystal_sentinel = bipedRig({
    head: [7, 8, 7], body: [10, 13, 6], arm: [4, 14, 4], leg: [4, 12, 4],
    tex: { head: { all: 'crystal_sentinel_crystal', front: 'crystal_sentinel_face' }, body: 'crystal_sentinel_crystal', arm: 'crystal_sentinel_crystal', fore: 'crystal_sentinel_dark', leg: 'crystal_sentinel_dark', shin: 'crystal_sentinel_crystal' },
    extras: [
      overlay('eyes', 'head', [-3.5, 0, -3.58, 3.5, 8, -3.52], 'crystal_sentinel_eyes'),
      overlay('core', 'body', [-2.5, 5, -3.12, 2.5, 10, -3.04], 'crystal_sentinel_core'),
      ['crown0', 'head', [0, 8, 0], [-0.9, 0, -0.9, 0.9, 6, 0.9], 'crystal_sentinel_shard', { glow: true, rest: [0.1, 0, 0] }],
      ['crown1', 'head', [-2.2, 8, 0.5], [-0.7, 0, -0.7, 0.7, 4, 0.7], 'crystal_sentinel_shard', { glow: true, rest: [0.2, 0, 0.35] }],
      ['crown2', 'head', [2.2, 8, 0.5], [-0.7, 0, -0.7, 0.7, 4, 0.7], 'crystal_sentinel_shard', { glow: true, rest: [0.2, 0, -0.35] }],
      ['spikeR', 'armR', [1, 1, 0], [-1, 0, -1, 1, 6, 1], 'crystal_sentinel_crystal', { rest: [0.2, 0, -0.6] }],
      ['spikeL', 'armL', [-1, 1, 0], [-1, 0, -1, 1, 6, 1], 'crystal_sentinel_crystal', { rest: [0.2, 0, 0.6] }],
      ['bladeR', 'foreR', [0, -1, 0], [-0.5, -10, -3.5, 0.5, 1, 0.5], 'crystal_sentinel_shard', { glow: true }],
      ['bladeL', 'foreL', [0, -1, 0], [-0.5, -10, -3.5, 0.5, 1, 0.5], 'crystal_sentinel_shard', { glow: true }],
      ['back0', 'body', [-2, 10, 3], [-1, 0, -1, 1, 6, 1], 'crystal_sentinel_crystal', { rest: [0.6, 0, 0.3] }],
      ['back1', 'body', [2, 9, 3], [-1, 0, -1, 1, 5, 1], 'crystal_sentinel_crystal', { rest: [0.7, 0, -0.3] }],
    ],
  });
  D.crystal_sentinel.post = 'd2sentinel';

  {
    const ex = [];
    [[-1.5, -7, 6, 0.35, -0.35], [1.2, -6.2, 4, 0.5, 0.4], [0.5, -2.5, 7, 0.25, 0.2], [-1, -1.5, 4.5, 0.55, -0.45], [-0.5, 2, 6.5, 0.3, -0.2], [1.5, 2.8, 4, 0.55, 0.5], [0, 6.5, 5, 0.45, 0]]
      .forEach(([x, z, h, rx, rz], i) => ex.push(['cr' + i, 'body', [x, 6, z], [-0.8, 0, -0.8, 0.8, h, 0.8], 'crystal_dragon_spike', { glow: true, rest: [rx, 0, rz] }]));
    for (const [p, z, y] of [['neck1', -3, 4.2], ['neck2', -3, 3.8], ['tail1', 4, 3], ['tail2', 4, 2.2]]) ex.push(['crn' + ex.length, p, [0, y, z], [-0.6, 0, -0.6, 0.6, 3, 0.6], 'crystal_dragon_spike', { glow: true, rest: [0.5, 0, 0] }]);
    ex.push(['hornL', 'head', [-2.2, 3.5, -1.5], [-0.8, 0, -0.8, 0.8, 6.5, 0.8], 'crystal_dragon_horn', { glow: true, rest: [0.75, 0, 0.25] }]);
    ex.push(['hornR', 'head', [2.2, 3.5, -1.5], [-0.8, 0, -0.8, 0.8, 6.5, 0.8], 'crystal_dragon_horn', { glow: true, rest: [0.75, 0, -0.25] }]);
    ex.push(['brow', 'head', [0, 3.6, -4.5], [-0.6, 0, -0.6, 0.6, 3, 0.6], 'crystal_dragon_horn', { glow: true, rest: [-0.3, 0, 0] }]);
    ex.push(['core', 'body', [0, -0.5, -10.55], [-2.6, -3, -0.4, 2.6, 2.6, 0], 'crystal_dragon_core', { glow: true }]);
    ex.push(['tip0', 'tail3', [0, 0, 8], [-0.9, -0.9, 0, 0.9, 0.9, 4.5], 'crystal_dragon_spike', { glow: true }]);
    ex.push(['tip1', 'tail3', [0, 0, 8], [-0.6, -0.6, 0, 0.6, 0.6, 3.5], 'crystal_dragon_spike', { glow: true, rest: [-0.6, 0.4, 0] }]);
    ex.push(['tip2', 'tail3', [0, 0, 8], [-0.6, -0.6, 0, 0.6, 0.6, 3.5], 'crystal_dragon_spike', { glow: true, rest: [-0.5, -0.5, 0] }]);
    D.crystal_dragon = d2DragonRig({
      tex: { scale: 'crystal_dragon_scale', belly: 'crystal_dragon_belly', wing: 'crystal_dragon_wing', bone: 'crystal_dragon_bone', horn: 'crystal_dragon_horn', eye: 'crystal_dragon_eye', snout: 'crystal_dragon_snout' },
      hip: 13, W: 5.5, Hh: 5, L: 10.5, neck1: 7, nw1: 3.2, neck2: 7, nw2: 2.8, head: [4, 3, 6.5], snout: [2.8, 2.4, 6.5], tail: [9, 9, 8], tailW: [3, 2.2, 1.4],
      wingArm: 11, wingFore: 13, wingMemb: 13, wingMemb2: 11, fingers: [16, 14, 11], wingAlpha: 0.72, claws: true, scale: 1.55, extras: ex,
    });
  }

  {
    const LU = 'lumina_heart_guardian_', parts = [
      rpart('body', null, [0, 26, 0], [-7, -8, -7, 7, 8, 7], LU + 'crystal', { role: 'ebody' }),
      rpart('heart', 'body', [0, 0, 0], [-4.5, -4.5, -7.12, 4.5, 4.5, -7.04], LU + 'heart', { glow: true, noCull: true }),
      rpart('heartB', 'body', [0, 0, 0], [-4.5, -4.5, 7.04, 4.5, 4.5, 7.12], LU + 'heart', { glow: true, noCull: true }),
      rpart('top1', 'body', [0, 8, 0], [-5, 0, -5, 5, 6, 5], LU + 'spire', { rest: [0, 0.785, 0] }),
      rpart('top2', 'top1', [0, 6, 0], [-3, 0, -3, 3, 6, 3], LU + 'spire'),
      rpart('top3', 'top2', [0, 6, 0], [-1.4, 0, -1.4, 1.4, 5, 1.4], LU + 'shard', { glow: true }),
      rpart('bot1', 'body', [0, -8, 0], [-5, -6, -5, 5, 0, 5], LU + 'spire', { rest: [0, 0.785, 0] }),
      rpart('bot2', 'bot1', [0, -6, 0], [-3, -6, -3, 3, 0, 3], LU + 'spire'),
      rpart('bot3', 'bot2', [0, -6, 0], [-1.4, -5, -1.4, 1.4, 0, 1.4], LU + 'shard', { glow: true }),
      rpart('armR', 'body', [13, 2, 0], [-0.05, -0.05, -0.05, 0.05, 0.05, 0.05], LU + 'shard', { role: 'earm', side: 1 }),
      rpart('foreR', 'armR', [0, 0, 0], [-1.8, -12, -1.8, 1.8, 5, 1.8], LU + 'shard', { role: 'efore', side: 1, glow: true }),
      rpart('armL', 'body', [-13, 2, 0], [-0.05, -0.05, -0.05, 0.05, 0.05, 0.05], LU + 'shard', { role: 'earm', side: -1 }),
      rpart('foreL', 'armL', [0, 0, 0], [-1.8, -12, -1.8, 1.8, 5, 1.8], LU + 'shard', { role: 'efore', side: -1, glow: true }),
      rpart('halo', null, [0, 3, 0], [-12, -0.15, -12, 12, 0.15, 12], LU + 'rune', { role: 'halo', glow: true, noCull: true }),
    ];
    for (let i = 0; i < 6; i++) parts.push(rpart('orb' + i, null, [0, 26 + (i % 2 ? 3 : -3), 0], [-1.2, -3, -17.5, 1.2, 3, -15], LU + 'shard', { role: 'orbit', idx: i, n: 6, glow: true }));
    D.lumina_heart_guardian = finishRig('d2elem', parts, { hipY: 26, height: 52, scale: 1.25, float: 0.3, orbSpeed: 0.9, bob: 0.08 });
  }

  // ---- the Plains of Silent Stones ----
  D.gnoll = bipedRig({
    head: [7, 7, 7], body: [8, 12, 5], arm: [3, 13, 3], leg: [4, 12, 4],
    tex: { head: { all: 'gnoll_fur', front: 'gnoll_face', top: 'gnoll_mane' }, body: 'gnoll_leather', arm: 'gnoll_fur', leg: 'gnoll_fur' },
    extras: [
      snout([0, 2, -3.5], 4, 3.4, 5, { all: 'gnoll_fur', front: 'gnoll_snout', bottom: 'gnoll_snout' }),
      ear('earL', [-2.6, 7, 0.5], 2.6, 3.4, 'gnoll_ear', [0, 0, 0.25]), ear('earR', [2.6, 7, 0.5], 2.6, 3.4, 'gnoll_ear', [0, 0, -0.25]),
      ['mane', 'body', [0, 12, 2.5], [-1.4, -9, 0, 1.4, 3.5, 2], 'gnoll_mane', { noCull: true }],
      ['tail', 'body', [0, 1, 2.5], [-1.2, -6, -1.2, 1.2, 0, 1.2], 'gnoll_mane', { rest: [-0.5, 0, 0] }],
    ],
  });
  D.gnoll.post = 'd2hunch';
  D.gnoll_pack_lord = bipedRig({
    head: [8, 8, 8], body: [10, 14, 6], arm: [4, 15, 4], leg: [5, 13, 5], heavy: true,
    tex: { head: { all: 'gnoll_pack_lord_fur', front: 'gnoll_pack_lord_face', top: 'gnoll_mane' }, body: 'gnoll_pack_lord_bone', arm: 'gnoll_pack_lord_fur', leg: 'gnoll_pack_lord_fur' },
    extras: [
      snout([0, 2.2, -4], 4.6, 3.8, 5.5, { all: 'gnoll_pack_lord_fur', front: 'gnoll_snout', bottom: 'gnoll_snout' }),
      overlay('eyes', 'head', [-4, 0, -4.08, 4, 8, -4.02], 'gnoll_pack_lord_eyes'),
      ear('earL', [-3, 8, 0.5], 2.8, 3.6, 'gnoll_ear', [0, 0, 0.3]), ear('earR', [3, 8, 0.5], 2.8, 3.6, 'gnoll_ear', [0, 0, -0.3]),
      ['skull', 'head', [0, 0, 0], [-4.4, 6.5, -4.6, 4.4, 9.5, 4.4], { all: 'gnoll_pack_lord_bone', front: 'gnoll_pack_lord_skull' }],
      ['hornL', 'head', [-3.8, 9, -1], [-0.7, 0, -0.7, 0.7, 4, 0.7], 'gnoll_pack_lord_bone', { rest: [0.3, 0, 0.5] }],
      ['hornR', 'head', [3.8, 9, -1], [-0.7, 0, -0.7, 0.7, 4, 0.7], 'gnoll_pack_lord_bone', { rest: [0.3, 0, -0.5] }],
      ['paulR', 'armR', [0, 1, 0], [-2.8, -2, -2.8, 2.8, 2, 2.8], 'gnoll_pack_lord_bone'],
      ['paulL', 'armL', [0, 1, 0], [-2.8, -2, -2.8, 2.8, 2, 2.8], 'gnoll_pack_lord_bone'],
      ['cloak', 'body', [0, 14, 3.1], [-5.5, -15, 0, 5.5, 1, 1.2], 'gnoll_mane', { noCull: true, rest: [0.12, 0, 0] }],
    ],
  });
  D.gnoll_pack_lord.post = 'd2hunch';

  {
    const AK = 'ankheg_', ak = [
      rpart('thorax', null, [0, 10, 0], [-4.5, -3, -5, 4.5, 3.5, 5], { all: AK + 'shell', bottom: AK + 'belly' }, { role: 'sbody' }),
      rpart('head', 'thorax', [0, 0.5, -5], [-4, -3, -6, 4, 3, 0], { all: AK + 'shell', front: AK + 'face' }, { role: 'shead', limb: 'head' }),
      rpart('abdomen', 'thorax', [0, 0.5, 5], [-5.5, -4, 0, 5.5, 3.5, 13], { all: AK + 'shell', bottom: AK + 'belly' }, { role: 'abdomen' }),
      rpart('mandL', 'head', [-2.2, -2, -6], [-0.9, -0.6, -5, 0.9, 0.6, 0], AK + 'mandible', {}),
      rpart('mandR', 'head', [2.2, -2, -6], [-0.9, -0.6, -5, 0.9, 0.6, 0], AK + 'mandible', {}),
      rpart('antL', 'head', [-1.6, 2.5, -5.5], [-0.25, -0.25, -8, 0.25, 0.25, 0], AK + 'leg', { rest: [0.5, 0.25, 0] }),
      rpart('antR', 'head', [1.6, 2.5, -5.5], [-0.25, -0.25, -8, 0.25, 0.25, 0], AK + 'leg', { rest: [0.5, -0.25, 0] }),
      rpart('ridge0', 'abdomen', [0, 3.5, 2], [-4.5, 0, -1, 4.5, 1.2, 3.5], AK + 'shell', { rest: [0.12, 0, 0] }),
      rpart('ridge1', 'abdomen', [0, 3.5, 6], [-4.2, 0, -1, 4.2, 1.2, 3.5], AK + 'shell', { rest: [0.12, 0, 0] }),
      rpart('ridge2', 'abdomen', [0, 3.2, 10], [-3.6, 0, -1, 3.6, 1, 3], AK + 'shell', { rest: [0.12, 0, 0] }),
    ];
    const zs = [-3.5, 0, 3.5], fan = [0.55, 0, -0.55];
    for (let i = 0; i < 3; i++) for (const side of [1, -1]) {
      const S = (side > 0 ? 'R' : 'L') + i;
      ak.push(rpart('sleg' + S, 'thorax', [side * 4.5, 0, zs[i]], side > 0 ? [0, -1, -1, 8, 1, 1] : [-8, -1, -1, 0, 1, 1], AK + 'leg', { role: 'sleg', idx: i, side, rest: [0, side * fan[i], side * 0.45], limb: 'sleg' + S }));
      ak.push(rpart('sshin' + S, 'sleg' + S, [side * 8, 0, 0], [-0.9, -13, -0.9, 0.9, 0, 0.9], AK + 'leg', { role: 'sshin', idx: i, side, rest: [0, 0, -side * 0.45], limb: 'sleg' + S }));
    }
    D.ankheg = hideUnder(finishRig('spider', ak, { height: 14, scale: 1.1, post: 'd2ankheg' }), AK + 'mound', [-8, -1.5, -8, 8, 2.5, 8]);
  }

  {
    const GS = 'giant_scorpion_', sh = GS + 'shell', sp = [
      rpart('thorax', null, [0, 7, 0], [-6, -2.5, -6, 6, 3, 6], sh, { role: 'sbody' }),
      rpart('head', 'thorax', [0, 0, -6], [-4.5, -2, -4, 4.5, 2.6, 0], { all: sh, front: GS + 'face' }, { role: 'shead', limb: 'head' }),
      rpart('abdomen', 'thorax', [0, 0.3, 6], [-5, -2.4, 0, 5, 2.8, 9], sh, { role: 'abdomen' }),
    ];
    const zs = [-4.2, -1.4, 1.4, 4.2], fan = [0.6, 0.2, -0.2, -0.6];
    for (let i = 0; i < 4; i++) for (const side of [1, -1]) {
      const S = (side > 0 ? 'R' : 'L') + i;
      sp.push(rpart('sleg' + S, 'thorax', [side * 6, 0, zs[i]], side > 0 ? [0, -0.9, -0.9, 7.5, 0.9, 0.9] : [-7.5, -0.9, -0.9, 0, 0.9, 0.9], sh, { role: 'sleg', idx: i, side, rest: [0, side * fan[i], side * 0.5], limb: 'sleg' + S }));
      sp.push(rpart('sshin' + S, 'sleg' + S, [side * 7.5, 0, 0], [-0.8, -10, -0.8, 0.8, 0, 0.8], sh, { role: 'sshin', idx: i, side, rest: [0, 0, -side * 0.5], limb: 'sleg' + S }));
    }
    for (const side of [1, -1]) {
      const S = side > 0 ? 'R' : 'L';
      sp.push(rpart('clawArm' + S, 'thorax', [side * 4.5, 0.5, -6.5], [-1.4, -1.4, -6, 1.4, 1.4, 0], sh, { rest: [0.15, -side * 0.45, 0], limb: 'claw' + S }));
      sp.push(rpart('clawFore' + S, 'clawArm' + S, [0, 0, -6], [-1.2, -1.2, -5, 1.2, 1.2, 0], sh, { rest: [0, side * 1.0, 0], limb: 'claw' + S }));
      sp.push(rpart('pincer' + S, 'clawFore' + S, [0, 0, -5], [-2.2, -0.2, -5.5, 2.2, 2, 0], sh, { limb: 'claw' + S }));
      sp.push(rpart('pin' + S, 'clawFore' + S, [0, -0.2, -1], [-1.4, -1.6, -4.5, 1.4, 0, 0], sh, { rest: [0.3, 0, 0], limb: 'claw' + S }));
    }
    let prev = 'abdomen';
    for (let i = 1; i <= 6; i++) { sp.push(rpart('tail' + i, prev, i === 1 ? [0, 1.5, 9] : [0, 0, 3.6], [-1.6 + i * 0.12, 0, 0, 1.6 - i * 0.12, 2.8 - i * 0.15, 3.8], sh, { role: 'stail', idx: i, rest: [-0.52, 0, 0] })); prev = 'tail' + i; }
    sp.push(rpart('sting', prev, [0, 0.8, 3.8], [-1.4, -1.2, 0, 1.4, 1.6, 3], GS + 'sting', { rest: [-0.3, 0, 0] }));
    sp.push(rpart('barb', 'sting', [0, 0, 3], [-0.5, -0.5, 0, 0.5, 0.5, 2.5], GS + 'sting', { rest: [0.9, 0, 0] }));
    D.giant_scorpion = finishRig('spider', sp, { height: 12, scale: 1.15, post: 'd2scorp' });
  }

  {
    const winged = (o, fur, feather, wing, talon) => {
      const d = quadRig(o);
      for (const p of d.parts) { if (p.name === 'legFR' || p.name === 'legFL') p.tex = feather; if (p.name === 'shinFR' || p.name === 'shinFL') p.tex = talon; }
      const wl = o.wingLen || [11, 10], ww = o.wingW || [9, 8], at = o.wingAt || [o.body[0] / 2 + 0.7, o.body[1] / 2 - 0.5, -6];
      for (const s of [1, -1]) {
        const S = s > 0 ? 'R' : 'L';
        d.parts.push(rpart('wing' + S, 'body', [s * at[0], at[1], at[2]], s > 0 ? [0, -0.5, 0, wl[0], 0.5, ww[0]] : [-wl[0], -0.5, 0, 0, 0.5, ww[0]], wing, { noCull: true, limb: 'wing' + S }));
        d.parts.push(rpart('wing' + S + '2', 'wing' + S, [s * wl[0], 0.6, 0], s > 0 ? [0, -0.4, 0, wl[1], 0.4, ww[1]] : [-wl[1], -0.4, 0, 0, 0.4, ww[1]], wing, { noCull: true, limb: 'wing' + S }));
      }
      return d;
    };
    D.griffon = winged({
      body: [10, 10, 20], leg: [4, 12], head: [6, 7, 7], neck: [6, 7, 6, 0.3], headAt: [3, 1], tail: [2, 12, 2], tailRest: -1.0, gallop: true, post: 'd2wings',
      tex: { body: { all: 'griffon_fur', front: 'griffon_plume' }, neck: 'griffon_plume', head: { all: 'griffon_plume', front: 'griffon_face' }, leg: 'griffon_fur', tail: 'griffon_fur' },
      extras: [
        ['beak', 'head', [0, 0.5, -7], [-1.6, -2, -3, 1.6, 1.5, 0], 'griffon_beak'],
        ['hook', 'beak', [0, -2, -3], [-1, -1.6, -1.2, 1, 0.4, 0], 'griffon_beak'],
        ['crest', 'head', [0, 3.5, -1], [-1, 0, 0, 1, 1.5, 4.5], 'griffon_plume', { rest: [-0.25, 0, 0] }],
        ['ruff', 'body', [0, 2, -10], [-5.5, -4, -2, 5.5, 5, 2], 'griffon_plume'],
        ['tuft', 'tail', [0, -12, 0], [-1.8, -3.5, -1.8, 1.8, 0, 1.8], 'griffon_tuft'],
        ['clawFR', 'shinFR', [0, -6, -2], [-2, 0, -1.6, 2, 1, 0], 'griffon_beak'],
        ['clawFL', 'shinFL', [0, -6, -2], [-2, 0, -1.6, 2, 1, 0], 'griffon_beak'],
      ],
    }, 'griffon_fur', 'griffon_plume', 'griffon_wing', 'griffon_talon');
    D.hippogriff = winged({
      body: [9, 10, 20], leg: [3, 14], head: [5, 6, 8], neck: [4, 11, 5, 0.5], headTilt: 0.3, headAt: [3, 0], tail: [3, 12, 3], tailRest: -0.45, gallop: true, post: 'd2wings',
      wingLen: [10, 10], wingW: [8, 7],
      tex: { body: { all: 'hippogriff_hide', front: 'hippogriff_feather' }, neck: 'hippogriff_feather', head: { all: 'hippogriff_feather', front: 'hippogriff_face' }, leg: 'hippogriff_hide', tail: 'hippogriff_mane' },
      extras: [
        ['beak', 'head', [0, -0.5, -8], [-1.4, -1.8, -3, 1.4, 1.4, 0], 'hippogriff_beak'],
        ['hook', 'beak', [0, -1.8, -3], [-0.9, -1.4, -1, 0.9, 0.3, 0], 'hippogriff_beak'],
        ['crest', 'head', [0, 3, -2], [-0.8, 0, 0, 0.8, 1.2, 5], 'hippogriff_mane', { rest: [-0.3, 0, 0] }],
        ['mane', 'neck', [0, 0, 2.5], [-0.8, 0, 0, 0.8, 11, 1.6], 'hippogriff_mane'],
        ['hoofBL', 'shinBL', [0, 0, 0], [-1.8, -7, -1.8, 1.8, -5.6, 1.8], 'hippogriff_hoof'],
        ['hoofBR', 'shinBR', [0, 0, 0], [-1.8, -7, -1.8, 1.8, -5.6, 1.8], 'hippogriff_hoof'],
      ],
    }, 'hippogriff_hide', 'hippogriff_feather', 'hippogriff_wing', 'hippogriff_talon');
  }

  {
    const SG = 'stone_guardian_', st = SG + 'stone';
    D.stone_guardian = finishRig('d2stone', [
      rpart('body', null, [0, 0, 0], [-6, 0, -3.5, 6, 30, 3.5], st, { role: 'gbody' }),
      rpart('cap', 'body', [0.5, 30, 0], [-5, 0, -3, 4.5, 4, 3], st, { rest: [0, 0, 0.12] }),
      rpart('face', 'body', [0, 19, 0], [-6, 0, -3.56, 6, 10, -3.5], SG + 'face'),
      rpart('eyes', 'body', [0, 19, 0], [-6, 0, -3.64, 6, 10, -3.58], SG + 'eyes', { glow: true, noCull: true, only: 'd2awake' }),
      rpart('runes', 'body', [0, 0, 0], [-5, 1, -3.6, 5, 18, -3.54], SG + 'rune', { glow: true, noCull: true, only: 'd2awake' }),
      rpart('runesB', 'body', [0, 0, 0], [-5, 3, 3.54, 5, 27, 3.6], SG + 'rune', { glow: true, noCull: true, only: 'd2awake' }),
      rpart('rub0', 'body', [-4.5, 0, -3], [-2, 0, -2, 2, 2.5, 2], st, { rest: [0, 0.5, 0] }),
      rpart('rub1', 'body', [4, 0, 2.5], [-2.2, 0, -2.2, 2.2, 2, 2.2], st, { rest: [0, 0.3, 0] }),
      rpart('armR', 'body', [9, 20, 0], [-0.05, -0.05, -0.05, 0.05, 0.05, 0.05], st, { role: 'garm', side: 1, only: 'd2awake' }),
      rpart('fistR', 'armR', [0, -8, 0], [-3.5, -3.5, -3.5, 3.5, 3.5, 3.5], st, { only: 'd2awake' }),
      rpart('armL', 'body', [-9, 20, 0], [-0.05, -0.05, -0.05, 0.05, 0.05, 0.05], st, { role: 'garm', side: -1, only: 'd2awake' }),
      rpart('fistL', 'armL', [0, -8, 0], [-3.5, -3.5, -3.5, 3.5, 3.5, 3.5], st, { only: 'd2awake' }),
    ], { hipY: 15, height: 34, scale: 1 });
  }

  D.plains_beast = quadRig({
    body: [16, 14, 26], leg: [6, 14], head: [10, 9, 9], headAt: [1, 0], tail: [2, 16, 2], tailRest: -0.5, gallop: true, post: 'd2beast', scale: 1.35,
    tex: { body: 'plains_beast_hide', head: { all: 'plains_beast_hide', front: 'plains_beast_face' }, leg: 'plains_beast_hide', tail: 'plains_beast_mane' },
    extras: [
      ['snout', 'head', [0, -2, -9], [-3.5, -2.5, -3, 3.5, 2, 0], { all: 'plains_beast_hide', front: 'plains_beast_snout' }],
      overlay('eyes', 'head', [-5, -4.5, -9.08, 5, 4.5, -9.02], 'plains_beast_eyes'),
      ['mane', 'head', [0, 0, 0.5], [-7, -6.5, -3.5, 7, 7, 4], 'plains_beast_mane', { noCull: true }],
      ['hump', 'body', [0, 7, -7], [-6.5, 0, -6, 6.5, 6, 7], 'plains_beast_mane'],
      ['hornL', 'head', [-5, 3, -4], [-5, -1, -1, 0, 1, 1], 'plains_beast_horn', { rest: [0, -0.35, -0.3] }],
      ['hornL2', 'hornL', [-5, 0, 0], [-1, 0, -0.8, 0, 5, 0.8], 'plains_beast_horn', { rest: [-0.35, 0, -0.4] }],
      ['hornR', 'head', [5, 3, -4], [0, -1, -1, 5, 1, 1], 'plains_beast_horn', { rest: [0, 0.35, 0.3] }],
      ['hornR2', 'hornR', [5, 0, 0], [0, 0, -0.8, 1, 5, 0.8], 'plains_beast_horn', { rest: [-0.35, 0, 0.4] }],
      ['hoofFL', 'shinFL', [0, -7, 0], [-3.3, 0, -3.3, 3.3, 1.8, 3.3], 'plains_beast_hoof'],
      ['hoofFR', 'shinFR', [0, -7, 0], [-3.3, 0, -3.3, 3.3, 1.8, 3.3], 'plains_beast_hoof'],
      ['hoofBL', 'shinBL', [0, -7, 0], [-3.3, 0, -3.3, 3.3, 1.8, 3.3], 'plains_beast_hoof'],
      ['hoofBR', 'shinBR', [0, -7, 0], [-3.3, 0, -3.3, 3.3, 1.8, 3.3], 'plains_beast_hoof'],
      ['thorn0', 'tail', [0, -5, 0.6], [-0.3, 0, -0.3, 0.3, 2.5, 0.3], 'plains_beast_horn', { rest: [1.2, 0, 0] }],
      ['thorn1', 'tail', [0, -10, 0.6], [-0.3, 0, -0.3, 0.3, 2.5, 0.3], 'plains_beast_horn', { rest: [1.2, 0, 0] }],
      ['thorn2', 'tail', [0, -14, 0.6], [-0.3, 0, -0.3, 0.3, 2.5, 0.3], 'plains_beast_horn', { rest: [1.2, 0, 0] }],
    ],
  });
  for (let i = 0; i < 7; i++) {
    const x = i % 2 ? 1.6 : -1.6, z = -9.5 + i * 3.2, h = 8 + (3 - Math.abs(i - 3)) * 1.6;
    D.plains_beast.parts.push(rpart('pet' + i, 'body', [x, 7, z], [-0.25, 0, -2.6, 0.25, h, 2.6], 'plains_beast_petal', { noCull: true, role: 'petal', idx: i, rest: [0.25, 0, x > 0 ? -0.35 : 0.35] }));
  }

  // ---- Redrock Haven ----
  D.purple_worm = d2WormRig({
    n: 7, w0: 14, w1: 12, L: 10, scale: 2.4, bend: [0.12, 0.04, -0.1, -0.22, -0.3, -0.36, -0.4],
    tex: { skin: 'purple_worm_skin', mouth: 'purple_worm_mouth', mound: 'purple_worm_mound' },
  });
  D.sandworm = d2WormRig({
    n: 6, w0: 9, w1: 8, L: 8, scale: 1.2, bend: [0.15, 0.05, -0.15, -0.3, -0.4, -0.45], jaws: 3, jawL: 5,
    tex: { skin: 'sandworm_skin', mouth: 'sandworm_mouth', jaw: 'sandworm_jaw', mound: 'sandworm_mound' },
  });

  // ---- Skyreach Roost and the peaks ----
  D.wyvern = d2DragonRig({
    tex: { scale: 'wyvern_scale', belly: 'wyvern_belly', wing: 'wyvern_wing', bone: 'wyvern_bone', horn: 'wyvern_horn', eye: 'wyvern_eye', snout: 'wyvern_snout' },
    hip: 16, W: 4.5, Hh: 4, L: 9, neck1: 7, nw1: 2.5, neck2: 7, nw2: 2.2, head: [3.4, 2.4, 6], snout: [2.3, 2, 7], noFront: true, legZ: 1.5, legU: 8, legW: 2.2,
    tail: [10, 10, 10], tailW: [3, 2.2, 1.4], wingArm: 13, wingFore: 15, wingMemb: 14, wingMemb2: 12, fingers: [18, 16, 13], claws: true, scale: 1.3, post: 'd2wyvern',
    extras: [
      ['hornL', 'head', [-2, 2.8, -1], [-0.5, -0.5, 0, 0.5, 0.5, 4], 'wyvern_horn', { rest: [-0.35, -0.25, 0] }],
      ['hornR', 'head', [2, 2.8, -1], [-0.5, -0.5, 0, 0.5, 0.5, 4], 'wyvern_horn', { rest: [-0.35, 0.25, 0] }],
      ['tail4', 'tail3', [0, 0, 10], [-1, -1, 0, 1, 1, 7], 'wyvern_scale', { rest: [-0.25, 0, 0], limb: 'tail' }],
      ['sting', 'tail4', [0, 0, 7], [-1.2, -1.2, 0, 1.2, 1.2, 3.5], 'wyvern_sting', { rest: [-0.6, 0, 0] }],
      ['barb', 'sting', [0, 0, 3.5], [-0.4, -0.4, 0, 0.4, 0.4, 3], 'wyvern_sting', { rest: [-0.9, 0, 0] }],
    ],
  });

  D.harpy = bipedRig({
    head: [7, 7, 7], body: [7, 11, 4], arm: [3, 11, 3], leg: [3, 12, 3],
    tex: { head: { all: 'harpy_hair', front: 'harpy_face' }, body: { all: 'harpy_chest', back: 'harpy_plumage' }, arm: 'harpy_plumage', fore: 'harpy_skin', leg: 'harpy_plumage', shin: 'harpy_talon' },
    extras: [
      ['hair', 'head', [0, 0, 0.6], [-4, -2.5, -3.4, 4, 7.8, 4.2], { all: 'harpy_hair', front: false }, { noCull: true }],
      ['featR', 'armR', [1, 1, 0.3], [-0.3, -12, 0, 0.3, 1, 7], 'harpy_wing', { noCull: true }],
      ['featR2', 'foreR', [1, 0, 0.3], [-0.3, -7, 0, 0.3, 0, 9], 'harpy_wing', { noCull: true }],
      ['featL', 'armL', [-1, 1, 0.3], [-0.3, -12, 0, 0.3, 1, 7], 'harpy_wing', { noCull: true }],
      ['featL2', 'foreL', [-1, 0, 0.3], [-0.3, -7, 0, 0.3, 0, 9], 'harpy_wing', { noCull: true }],
      ['talonR', 'shinR', [0, -6, -1.5], [-1.6, 0, -2, 1.6, 1, 0.5], 'harpy_talon'],
      ['talonL', 'shinL', [0, -6, -1.5], [-1.6, 0, -2, 1.6, 1, 0.5], 'harpy_talon'],
      ['tailF', 'body', [0, 1, 2], [-3, -0.3, 0, 3, 0.3, 6], 'harpy_plumage', { noCull: true, rest: [0.5, 0, 0] }],
    ],
  });
  D.harpy.post = 'd2harpy';

  D.roc = birdRig({
    body: [14, 13, 22], head: [8, 8, 9], leg: [4, 10], wing: [1.5, 13, 20], legX: 4, neck: [8, 5, 0.2], scale: 2.1, post: 'd2roc',
    tex: { body: 'roc_plumage', neck: 'roc_plumage', head: { all: 'roc_head', front: 'roc_face' }, leg: 'roc_talon', wing: 'roc_wing' },
    extras: [
      ['beak', 'head', [0, 3.5, -9], [-2.2, -2.5, -5, 2.2, 2.5, 0], 'roc_beak'],
      ['hook', 'beak', [0, -2.5, -5], [-1.5, -3, -2, 1.5, 0.5, 0], 'roc_beak'],
      ['brow', 'head', [0, 6.5, -9.3], [-4.3, 0, 0, 4.3, 1.5, 4], 'roc_plumage'],
      ['crest', 'head', [0, 8, -1], [-1.5, 0, 0, 1.5, 2, 7], 'roc_plumage', { rest: [-0.45, 0, 0] }],
      ['ruff', 'neck', [0, 1, 0], [-5, -1, -5, 5, 4, 5], 'roc_head'],
      ['tailFan', 'body', [0, 3, 11], [-8, -0.6, 0, 8, 0.6, 13], 'roc_wing', { noCull: true, rest: [-0.2, 0, 0] }],
      ['talonR', 'legR', [0, -10, 0], [-2.8, -0.5, -5, 2.8, 1.5, 1.5], 'roc_talon'],
      ['clawR', 'talonR', [0, 0, -5], [-2.4, -2, -1.6, 2.4, 0.5, 0], 'roc_claw', { rest: [0.6, 0, 0] }],
      ['talonL', 'legL', [0, -10, 0], [-2.8, -0.5, -5, 2.8, 1.5, 1.5], 'roc_talon'],
      ['clawL', 'talonL', [0, 0, -5], [-2.4, -2, -1.6, 2.4, 0.5, 0], 'roc_claw', { rest: [0.6, 0, 0] }],
      ['thighR', 'legR', [0, 0, 0], [-2.6, -4, -2.6, 2.6, 1, 2.6], 'roc_plumage'],
      ['thighL', 'legL', [0, 0, 0], [-2.6, -4, -2.6, 2.6, 1, 2.6], 'roc_plumage'],
      ['wingR2', 'wingR', [0, -13, 0], [0.2, -13, -9, 1.3, 0, 9], 'roc_wing', { noCull: true, role: 'wing2' }],
      ['wingL2', 'wingL', [0, -13, 0], [-1.3, -13, -9, -0.2, 0, 9], 'roc_wing', { noCull: true, role: 'wing2' }],
    ],
  });

  {
    const A = 'air_elemental_', wind = { alpha: 0.6, noCull: true }, parts = [
      rpart('col0', null, [0, 0, 0], [-1.5, 0, -1.5, 1.5, 4, 1.5], A + 'wind', Object.assign({ role: 'ecol', idx: 0 }, wind)),
      rpart('col1', 'col0', [0.5, 4, 0], [-3, 0, -3, 3, 4.5, 3], A + 'wind', Object.assign({ role: 'ecol', idx: 1 }, wind)),
      rpart('col2', 'col1', [-0.5, 4.5, 0], [-4.5, 0, -4.5, 4.5, 5, 4.5], A + 'wind', Object.assign({ role: 'ecol', idx: 2 }, wind)),
      rpart('col3', 'col2', [0.5, 5, 0], [-6, 0, -6, 6, 5, 6], A + 'wind', Object.assign({ role: 'ecol', idx: 3 }, wind)),
      rpart('body', null, [0, 18.5, 0], [-7, 0, -5, 7, 7, 5], A + 'cloud', { role: 'ebody', alpha: 0.85, noCull: true }),
      rpart('head', 'body', [0, 7, -0.5], [-3.5, 0, -3.5, 3.5, 6, 3.5], { all: A + 'cloud', front: A + 'face' }, { role: 'ehead', limb: 'head', alpha: 0.9 }),
      rpart('eyes', 'head', [0, 0, 0], [-3.5, 0, -3.58, 3.5, 6, -3.52], A + 'eyes', { glow: true, noCull: true }),
      rpart('armR', 'body', [8, 5, 0], [-2.5, -6, -2.5, 2.5, 1.5, 2.5], A + 'cloud', { role: 'earm', side: 1, alpha: 0.8, noCull: true }),
      rpart('foreR', 'armR', [0, -6, 0], [-2, -6, -2, 2, 0, 2], A + 'wind', Object.assign({ role: 'efore', side: 1 }, wind)),
      rpart('armL', 'body', [-8, 5, 0], [-2.5, -6, -2.5, 2.5, 1.5, 2.5], A + 'cloud', { role: 'earm', side: -1, alpha: 0.8, noCull: true }),
      rpart('foreL', 'armL', [0, -6, 0], [-2, -6, -2, 2, 0, 2], A + 'wind', Object.assign({ role: 'efore', side: -1 }, wind)),
    ];
    for (let i = 0; i < 3; i++) parts.push(rpart('deb' + i, null, [0, 6 + i * 3.5, 0], [6.5 + i, -0.6, -0.6, 7.7 + i, 0.6, 0.6], A + 'debris', { role: 'orbit', idx: i, n: 3 }));
    D.air_elemental = finishRig('d2elem', parts, { hipY: 10, height: 34, scale: 1.1, float: 0.4, spin: true, orbSpeed: 3.2, bob: 0.08 });
  }

  for (const k of ['magma_mephit', 'fire_elemental', 'salamander', 'hell_hound', 'gargoyle', 'young_red_dragon', 'magma_worm', 'earth_elemental', 'xorn', 'stone_golem', 'rust_monster', 'giant_bat', 'crystal_sentinel', 'crystal_dragon', 'lumina_heart_guardian',
    'gnoll', 'gnoll_pack_lord', 'ankheg', 'giant_scorpion', 'griffon', 'hippogriff', 'stone_guardian', 'plains_beast', 'purple_worm', 'sandworm', 'wyvern', 'harpy', 'roc', 'air_elemental']) if (!D[k]) console.warn('dnd monsters 2: no body for', k);
}

// ---- what they are --------------------------------------------------------------------------------------------
// Hit points, AC, attack bonus, CR, XP, resistances and immunities from the stat blocks; `damage` is the
// average of one blow of the main attack (the riders of fire, acid, poison... are added where it lands).
// speed: blocks a second on foot (30 ft ≈ 2.6); fly: in the air.
{
  const BPS = ['bludgeoning', 'piercing', 'slashing'];
  const M = (o) => Object.assign({ hostile: true, special: true, d2: true }, o);
  Object.assign(MOB_TYPES, {
    magma_mephit: M({ model: 'magma_mephit', label: 'a magma mephit', hp: 18, w: 0.3, h: 1.0, speed: 2.6, fly: 2.8, damage: 3, flyer: true, fireImmune: true, noSever: true, voice: 'magma', xp: 7,
      ac: 11, toHit: 3, cr: 0.5, dndXp: 100, ctype: 'elemental', region: ['mountain'], vulnerable: ['cold'], immune: ['fire', 'poison'],
      drops: [['magma_cream', 0, 1, 0.5], ['coal', 0, 2, 0.4], ['elemental_core_fire', 1, 1, 0.05]] }),
    fire_elemental: M({ model: 'fire_elemental', label: 'a fire elemental', hp: 93, w: 0.6, h: 2.6, speed: 3.8, damage: 10, fireImmune: true, noSever: true, knockResist: 0.5, element: 'fire', voice: 'wisp', xp: 30,
      ac: 13, toHit: 6, cr: 5, dndXp: 1800, ctype: 'elemental', region: ['mountain'], resist: BPS, immune: ['fire', 'poison'], summonable: true,
      drops: [['elemental_core_fire', 1, 1, 0.6], ['coal', 1, 3, 1], ['cinder_rod', 0, 1, 0.3]] }),
    salamander: M({ model: 'salamander', label: 'a salamander', hp: 90, w: 0.6, h: 2.5, speed: 2.6, damage: 13, fireImmune: true, knockResist: 0.4, voice: 'snake', xp: 30,
      ac: 15, toHit: 7, cr: 5, dndXp: 1800, ctype: 'elemental', region: ['mountain'], vulnerable: ['cold'], immune: ['fire'],
      drops: [['salamander_scale', 1, 3, 1], ['iron_ingot', 0, 1, 0.3], ['gold_ingot', 0, 1, 0.15]] }),
    hell_hound: M({ model: 'hell_hound', label: 'a hell hound', hp: 58, w: 0.45, h: 1.3, speed: 3.8, damage: 7, fireImmune: true, knockResist: 0.2, voice: 'werewolf', xp: 20,
      ac: 15, toHit: 5, cr: 3, dndXp: 700, ctype: 'fiend', region: ['mountain'], immune: ['fire'], night: true,
      drops: [['hellhound_fang', 0, 2, 0.8], ['coal', 0, 2, 0.5]] }),
    gargoyle: M({ model: 'gargoyle', label: 'a gargoyle', hp: 67, w: 0.4, h: 1.9, speed: 2.6, fly: 4.2, damage: 7, flyer: true, knockResist: 0.4, voice: 'ogre', xp: 16,
      ac: 15, toHit: 4, cr: 2, dndXp: 450, ctype: 'elemental', region: ['mountain'], immune: ['poison'],
      drops: [['cobblestone', 1, 3, 1], ['emerald', 0, 1, 0.1]] }),
    young_red_dragon: M({ model: 'young_red_dragon', label: 'a young red dragon', hp: 178, w: 1.2, h: 2.4, speed: 3.2, fly: 5.5, damage: 13, flyer: true, boss: true, fireImmune: true, noSever: true, knockResist: 1, xp: 200,
      ac: 18, toHit: 10, cr: 10, dndXp: 5900, ctype: 'dragon', region: ['mountain'], immune: ['fire'], saves: { dex: 4, wis: 4 },
      drops: [['red_dragon_scale', 3, 6, 1], ['dragon_scale', 2, 4, 1], ['gold_ingot', 4, 10, 1], ['emerald', 3, 8, 1], ['ruby', 1, 3, 0.6], ['heart_crystal', 1, 1, 0.5]] }),
    magma_worm: M({ model: 'magma_worm', label: 'a magma worm', hp: 85, w: 0.7, h: 3.2, speed: 3.0, damage: 13, fireImmune: true, noSever: true, noPush: true, knockResist: 1, voice: 'magma', xp: 30,
      ac: 16, toHit: 7, cr: 5, dndXp: 1800, ctype: 'monstrosity', region: ['mountain'], vulnerable: ['cold'], immune: ['fire'],
      drops: [['worm_tooth', 1, 2, 0.7], ['magma_cream', 1, 2, 0.6], ['obsidian', 0, 2, 0.4]] }),
    earth_elemental: M({ model: 'earth_elemental', label: 'an earth elemental', hp: 147, w: 0.75, h: 2.9, speed: 2.6, damage: 14, noSever: true, knockResist: 0.9, voice: 'ogre', xp: 30,
      ac: 17, toHit: 8, cr: 5, dndXp: 1800, ctype: 'elemental', region: ['caverns'], vulnerable: ['thunder'], immune: ['poison'], summonable: true,
      drops: [['elemental_core_earth', 1, 1, 0.6], ['iron_ingot', 0, 2, 0.5], ['emerald', 0, 1, 0.15], ['diamond', 0, 1, 0.05]] }),
    xorn: M({ model: 'xorn', label: 'a xorn', hp: 84, w: 0.45, h: 1.45, speed: 1.9, damage: 8, knockResist: 0.6, voice: 'croc', xp: 30,
      ac: 19, toHit: 6, cr: 5, dndXp: 1800, ctype: 'elemental', region: ['caverns'], immune: ['poison'],
      drops: [['diamond', 0, 1, 0.3], ['emerald', 0, 2, 0.4], ['gold_ingot', 0, 2, 0.5], ['ruby', 0, 1, 0.2], ['sapphire', 0, 1, 0.2]] }),
    stone_golem: M({ model: 'stone_golem', label: 'a stone golem', hp: 220, w: 0.8, h: 3.0, speed: 2.6, damage: 15, noSever: true, knockResist: 0.95, xp: 60,
      ac: 18, toHit: 10, cr: 10, dndXp: 5900, ctype: 'construct', region: ['caverns'], immune: ['poison', 'psychic'], saves: { str: 6, dex: 4, con: 7, int: 2, wis: 4, cha: 2 },
      drops: [['iron_ingot', 1, 3, 0.7], ['emerald', 1, 3, 0.6], ['lumina_crystal', 0, 1, 0.2]] }),
    rust_monster: M({ model: 'rust_monster', label: 'a rust monster', hp: 33, w: 0.45, h: 1.0, speed: 3.2, damage: 5, voice: 'mite', xp: 7,
      ac: 14, toHit: 3, cr: 0.5, dndXp: 100, ctype: 'monstrosity', region: ['caverns'],
      drops: [['rust_antenna', 0, 2, 0.7], ['leather', 0, 1, 0.3]] }),
    giant_bat: M({ model: 'giant_bat', label: 'a giant bat', hp: 22, w: 0.55, h: 0.9, speed: 1.2, fly: 4.2, damage: 6, flyer: true, sound: 'bat', xp: 5,
      ac: 13, toHit: 4, cr: 0.25, dndXp: 50, ctype: 'beast', region: ['caverns'],
      drops: [['leather', 0, 1, 0.6], ['raw_meat', 0, 1, 0.4]] }),
    crystal_sentinel: M({ model: 'crystal_sentinel', label: 'a crystal sentinel', hp: 102, w: 0.4, h: 2.3, speed: 2.6, damage: 13, noSever: true, knockResist: 0.5, xp: 36,
      ac: 17, toHit: 7, cr: 6, dndXp: 2300, ctype: 'construct', region: ['caverns'], resist: ['piercing', 'slashing', 'radiant'], vulnerable: ['thunder'], immune: ['poison', 'psychic'],
      drops: [['lumina_crystal', 1, 2, 0.8], ['amethyst_shard', 1, 3, 0.6], ['quartz', 0, 2, 0.4]] }),
    crystal_dragon: M({ model: 'crystal_dragon', label: 'the crystal dragon', hp: 152, w: 1.1, h: 2.3, speed: 3.2, fly: 5.2, damage: 12, flyer: true, boss: true, noSever: true, knockResist: 1, xp: 180,
      ac: 18, toHit: 9, cr: 9, dndXp: 5000, ctype: 'dragon', region: ['caverns'], immune: ['radiant', 'poison'], vulnerable: ['thunder'], saves: { dex: 3, con: 6, wis: 3 },
      drops: [['lumina_crystal', 4, 8, 1], ['dragon_scale', 2, 4, 1], ['diamond', 1, 3, 0.8], ['amethyst_shard', 4, 8, 1], ['heart_crystal', 1, 1, 0.5]] }),
    lumina_heart_guardian: M({ model: 'lumina_heart_guardian', label: 'the Guardian of the Heart of Lumina', hp: 230, w: 1.3, h: 4.4, speed: 1.6, fly: 2.6, damage: 22, flyer: true, boss: true, noSever: true, noPush: true, knockResist: 1, xp: 300,
      ac: 19, toHit: 10, cr: 12, dndXp: 8400, ctype: 'construct', region: ['caverns'], resist: ['piercing', 'slashing', 'force'], vulnerable: ['thunder'], immune: ['poison', 'psychic', 'radiant'], saves: { con: 8, wis: 6, int: 5 },
      drops: [['lumina_crystal', 8, 14, 1], ['diamond', 2, 4, 1], ['heart_crystal', 1, 1, 1], ['emerald', 4, 8, 1]] }),
    gnoll: M({ model: 'gnoll', label: 'a gnoll', held: 'bow', hp: 27, w: 0.35, h: 2.0, speed: 2.6, damage: 5, voice: 'raider', family: 'gnoll', xp: 7,
      ac: 15, toHit: 4, cr: 0.5, dndXp: 100, ctype: 'fiend', region: ['plains'],
      drops: [['bone', 0, 2, 0.6], ['leather', 0, 1, 0.5], ['arrow', 0, 3, 0.6], ['raw_meat', 0, 1, 0.3]] }),
    gnoll_pack_lord: M({ model: 'gnoll_pack_lord', label: 'a gnoll pack lord', held: ITEMS.glaive ? 'glaive' : 'iron_axe', hp: 49, w: 0.4, h: 2.3, speed: 2.6, damage: 8, voice: 'werewolf', family: 'gnoll', knockResist: 0.3, xp: 16,
      ac: 15, toHit: 5, cr: 2, dndXp: 450, ctype: 'fiend', region: ['plains'],
      drops: [['bone', 2, 4, 1], ['leather', 1, 2, 1], ['gold_ingot', 0, 2, 0.4], ['emerald', 0, 2, 0.5], ['glaive', 1, 1, 0.15]] }),
    ankheg: M({ model: 'ankheg', label: 'an ankheg', hp: 45, w: 0.7, h: 1.2, speed: 2.6, damage: 10, knockResist: 0.4, voice: 'scorpion', xp: 16,
      ac: 14, toHit: 5, cr: 2, dndXp: 450, ctype: 'monstrosity', region: ['plains'],
      drops: [['ankheg_chitin', 1, 3, 1], ['raw_meat', 0, 2, 0.4]] }),
    giant_scorpion: M({ model: 'giant_scorpion', label: 'a giant scorpion', hp: 52, w: 0.8, h: 1.2, speed: 3.2, damage: 6, knockResist: 0.4, voice: 'scorpion', xp: 20,
      ac: 15, toHit: 4, cr: 3, dndXp: 700, ctype: 'beast', region: ['plains'], night: true,
      drops: [['venom_sac', 1, 2, 0.8], ['ankheg_chitin', 0, 1, 0.3], ['string', 0, 2, 0.3]] }),
    griffon: M({ model: 'griffon', label: 'a griffon', hp: 59, w: 0.6, h: 1.6, speed: 2.6, fly: 5, damage: 8, flyer: true, knockResist: 0.3, voice: 'lion', xp: 16,
      ac: 12, toHit: 6, cr: 2, dndXp: 450, ctype: 'monstrosity', region: ['plains'], day: true,
      drops: [['griffon_feather', 1, 3, 1], ['raw_meat', 1, 2, 0.8], ['leather', 0, 1, 0.5]] }),
    hippogriff: M({ model: 'hippogriff', label: 'a hippogriff', hp: 26, w: 0.55, h: 1.8, speed: 3.2, fly: 4.2, damage: 7, flyer: true, grazer: true, xp: 10,
      ac: 11, toHit: 5, cr: 1, dndXp: 200, ctype: 'monstrosity', region: ['plains'], day: true,
      drops: [['feather', 1, 3, 1], ['griffon_feather', 0, 1, 0.2], ['leather', 0, 2, 0.6], ['raw_meat', 1, 2, 0.6]] }),
    stone_guardian: M({ model: 'stone_guardian', label: 'a stone guardian', hp: 68, w: 0.6, h: 2.3, speed: 1.8, damage: 13, noSever: true, knockResist: 0.9, xp: 24,
      ac: 17, toHit: 6, cr: 4, dndXp: 1100, ctype: 'construct', region: ['plains'], resist: ['piercing', 'slashing'], vulnerable: ['thunder'], immune: ['poison', 'psychic'], night: true,
      drops: [['leystone', 1, 1, 0.6], ['cobblestone', 1, 4, 1], ['mossy_cobblestone', 0, 2, 0.5]] }),
    plains_beast: M({ model: 'plains_beast', label: 'the corrupted beast of the plains', hp: 136, w: 1.0, h: 2.6, speed: 3.8, damage: 17, boss: true, knockResist: 0.8, voice: 'lion', xp: 160,
      ac: 15, toHit: 8, cr: 8, dndXp: 3900, ctype: 'monstrosity', region: ['plains'], resist: ['necrotic', 'poison'], vulnerable: ['radiant'], saves: { str: 7, con: 6, wis: 3 },
      drops: [['bloom_petal', 3, 6, 1], ['pelt', 1, 3, 1], ['raw_meat', 2, 5, 1], ['emerald', 2, 6, 1], ['heart_crystal', 1, 1, 0.4]] }),
    purple_worm: M({ model: 'purple_worm', label: 'a purple worm', hp: 247, w: 1.4, h: 7.5, speed: 3.8, damage: 22, noSever: true, noPush: true, knockResist: 1, voice: 'croc', xp: 150,
      ac: 18, toHit: 14, cr: 15, dndXp: 13000, ctype: 'monstrosity', region: ['desert'],
      drops: [['worm_tooth', 2, 4, 1], ['diamond', 1, 3, 0.7], ['emerald', 2, 6, 0.8], ['gold_ingot', 2, 6, 0.8], ['venom_sac', 1, 3, 1]] }),
    sandworm: M({ model: 'sandworm', label: 'a sandworm', hp: 68, w: 0.6, h: 3.4, speed: 2.6, damage: 14, noSever: true, noPush: true, knockResist: 0.8, voice: 'croc', xp: 24,
      ac: 14, toHit: 6, cr: 4, dndXp: 1100, ctype: 'monstrosity', region: ['desert'],
      drops: [['worm_tooth', 0, 1, 0.5], ['sand', 1, 3, 1], ['leather', 0, 2, 0.4]] }),
    wyvern: M({ model: 'wyvern', label: 'a wyvern', hp: 127, w: 0.9, h: 2.0, speed: 2.6, fly: 5, damage: 13, flyer: true, noSever: true, knockResist: 0.7, voice: 'croc', xp: 36,
      ac: 14, toHit: 7, cr: 6, dndXp: 2300, ctype: 'dragon', region: ['peaks'], day: true,
      drops: [['wyvern_stinger', 1, 1, 0.7], ['dragon_scale', 0, 2, 0.5], ['raw_meat', 1, 3, 0.8], ['leather', 1, 2, 0.6]] }),
    harpy: M({ model: 'harpy', label: 'a harpy', hp: 38, w: 0.35, h: 1.8, speed: 1.8, fly: 3.4, damage: 6, flyer: true, voice: 'witch', xp: 10,
      ac: 11, toHit: 3, cr: 1, dndXp: 200, ctype: 'monstrosity', region: ['peaks'], day: true,
      drops: [['harpy_feather', 1, 2, 0.8], ['feather', 0, 2, 0.5], ['gold_ingot', 0, 1, 0.1]] }),
    roc: M({ model: 'roc', label: 'a roc', hp: 248, w: 1.4, h: 4.2, speed: 1.6, fly: 6.5, damage: 28, flyer: true, boss: true, noSever: true, noPush: true, knockResist: 1, xp: 220,
      ac: 15, toHit: 13, cr: 11, dndXp: 7200, ctype: 'monstrosity', region: ['peaks'], saves: { dex: 4, con: 9, wis: 4 },
      drops: [['roc_feather', 1, 3, 1], ['feather', 6, 12, 1], ['raw_meat', 4, 8, 1], ['emerald', 2, 6, 1], ['heart_crystal', 1, 1, 0.5]] }),
    air_elemental: M({ model: 'air_elemental', label: 'an air elemental', hp: 90, w: 0.6, h: 2.6, speed: 1.0, fly: 5.5, damage: 14, flyer: true, noSever: true, knockResist: 0.3, voice: 'wraith', xp: 30,
      ac: 15, toHit: 8, cr: 5, dndXp: 1800, ctype: 'elemental', region: ['peaks'], resist: ['bludgeoning', 'lightning', 'piercing', 'slashing'], immune: ['poison', 'thunder'], summonable: true,
      drops: [['elemental_core_air', 1, 1, 0.6], ['feather', 0, 2, 0.4]] }),
  });
  for (const k of Object.keys(MOB_TYPES)) if (MOB_TYPES[k].d2) MOB_TYPES[k].drops = MOB_TYPES[k].drops.filter(([id]) => ITEMS[id]);
}

// ---- the toolkit ----------------------------------------------------------------------------------------------
const D2_FIRE = ['mana_fire', 'mana_ember', 'mana_fire', 'mana_light'];
const D2_PRISM = ['crystal_dragon_prism', 'mana_light', 'mana_arcane', 'mana_frost', 'mana_heal', 'mana_fire'];
const D2_EL = { fire: 'fire', cold: 'frost', lightning: 'lightning', thunder: 'thunder', acid: 'acid', poison: 'poison', radiant: 'radiant', necrotic: 'necrotic', force: 'force', psychic: 'psychic' };
// Is it fighting for someone (summoned, tamed, a pet)?
function d2Ally(m) { return !!(m && (m.owner || m.dndSummonBy || m.tamed)); }
function d2Summoner(m) { const s = m.dndSummonBy; if (s && !s.dead && typeof s.x === 'number') return s; return m.ownerPawn ? m.ownerPawn() : null; }
// Whom does it fight? A wild one: players and their creatures (and whatever picked a fight with it).
// One fighting for someone: the hostile creatures that belong to no one.
function d2FoeOf(m, e) {
  if (!e || e === m || e.dead || e.remove) return false;
  if (e instanceof Mob) {
    if (!e.alive || !e.T) return false;
    if (d2Ally(m)) return !!e.T.hostile && !d2Ally(e) && !e.npc;
    return d2Ally(e) || m.quarrel === e;
  }
  return !d2Ally(m);
}
function d2Victims(m, x, y, z, r, hr = 3) {
  const g = m.game, out = [];
  if (!d2Ally(m)) for (const q of g.pawns()) if (!q.dead && Math.hypot(q.x - x, q.z - z) < r + 0.3 && q.y < y + hr && q.y + 1.8 > y - hr) out.push(q);
  for (const e of g.entities) if (e instanceof Mob && e !== m && d2FoeOf(m, e) && Math.hypot(e.x - x, e.z - z) < r + e.w && e.y < y + hr && e.y + e.h > y - hr) out.push(e);
  return out;
}
function d2Roll(n, d, plus = 0) { return typeof dndRoll === 'function' ? dndRoll(n, d, plus).total : Math.round(n * (d + 1) / 2 + plus); }
function d2Save(t, ab, dc) {
  try {
    if (t instanceof Mob) return typeof dndMobSave === 'function' ? dndMobSave(t, ab, dc).ok : Math.random() < 0.4;
    const c = typeof dndOf === 'function' ? dndOf(t) : null;
    const b = c && typeof dndSaveBonus === 'function' ? dndSaveBonus(c, ab) : 2;
    return 1 + Math.floor(Math.random() * 20) + b >= dc;
  } catch (e) { return Math.random() < 0.4; }
}
// how much of a kind of harm it takes (resistances, immunities, vulnerabilities)
function d2Takes(t, type) {
  if (!type) return 1;
  if (t instanceof Mob) return typeof dndMobTakes === 'function' ? dndMobTakes(t, type) : (type === 'fire' && t.T.fireImmune ? 0 : 1);
  const c = typeof dndOf === 'function' ? dndOf(t) : null;
  return c && c.d && c.d.resist && c.d.resist.includes(type) ? 0.5 : 1;
}
function d2Say(t, msg, kind) { if (t && typeof t.toast === 'function') t.toast(msg, kind || ''); }
function d2Float(t, text, col) { if (t && typeof t.floatText === 'function') t.floatText(t.x, t.y + 2.1, t.z, text, col || '#8fe3ff'); }
function d2Free(t) { return !t.player || !(t.g && t.g.creative); }   // creative players aren't grabbed or pulled about
// One blow: base damage of one kind plus a rider of another (fire on a burning spear, acid on a bite...)
function d2Hit(m, t, base, kind, rider = 0, rkind = null, o = {}) {
  if (!t || t.dead || (t instanceof Mob && !t.alive)) return 0;
  let amt = t instanceof Mob ? base * d2Takes(t, kind) : base;   // a player's own resistances to the base kind are worked out by the game
  if (rider) amt += rider * d2Takes(t, rkind);
  amt = Math.round(amt);
  if (amt <= 0) { if (t instanceof Mob && m.floatText) m.floatText(t.x, t.y + t.h, t.z, 'Immune'); return 0; }
  const el = D2_EL[kind], src = { type: o.magic ? 'magic' : 'mob', attacker: m, knock: o.knock ?? 3 };
  if (el && !(t instanceof Mob && el === 'fire')) src.element = el;
  t.hurt(amt, src);
  if (o.ignite) { if (typeof t.ignite === 'function') t.ignite(o.ignite); else if (t instanceof Mob && !t.T.fireImmune) t.burn = Math.max(t.burn || 0, o.ignite); }
  if (o.poison) d2Poison(t, o.poison);
  return amt;
}
// A save for half (or none): breath, blasts, pulses
function d2SaveHit(m, v, ab, dc, dice, kind, o = {}) {
  const ok = d2Save(v, ab, dc);
  let dmg = Array.isArray(dice) ? d2Roll(dice[0], dice[1], dice[2] || 0) : dice;
  if (ok) { dmg = o.noHalf ? 0 : Math.floor(dmg / 2); d2Float(v, 'Save!'); }
  if (dmg > 0) d2Hit(m, v, dmg, kind, 0, null, { magic: true, knock: o.knock ?? 1, ignite: ok ? 0 : o.ignite, poison: ok ? 0 : o.poison });
  if (!ok && o.fail) o.fail(v);
  return ok;
}
function d2Poison(v, secs) { if (v.player) v.player.poison = Math.max(v.player.poison || 0, secs); else if (v instanceof Mob && !(v.T && v.T.undead)) v.poisonT = Math.max(v.poisonT || 0, secs); }
function d2Slow(v, secs, msg) { if (v.player) { v.player.slow = Math.max(v.player.slow || 0, secs); if (msg) d2Say(v, msg, 'warn'); } else if (v instanceof Mob) v.slowT = Math.max(v.slowT || 0, secs); }
function d2Toss(v, vy) { if (v.player) { if (d2Free(v)) v.knock(0, vy, 0); } else if (v instanceof Mob) v.vy = Math.max(v.vy, vy * (1 - (v.T.knockResist || 0))); }
function d2Push(m, v, k, up = 4) {
  const dx = v.x - m.x, dz = v.z - m.z, l = Math.hypot(dx, dz) || 1;
  if (v.player) { if (d2Free(v)) v.knock(dx / l * k, up, dz / l * k); }
  else if (v instanceof Mob) { const r = 1 - (v.T.knockResist || 0); v.vx += dx / l * k * r; v.vz += dz / l * k * r; v.vy = Math.max(v.vy, up * r); }
}
function d2Prone(v) { if (v.player) { if (d2Free(v)) { v.knock(0, 3, 0); v.player.slow = Math.max(v.player.slow || 0, 1.2); d2Float(v, 'Prone!', '#ffb070'); } } else if (v instanceof Mob) v.slowT = Math.max(v.slowT || 0, 1.5); }
function d2Fear(m, v, secs) {
  if (v.player) { v.player.slow = Math.max(v.player.slow || 0, secs * 0.6); if (typeof giveEffect === 'function') giveEffect(v, 'weak', secs); d2Push(m, v, 5, 3); d2Say(v, 'You are frightened!', 'warn'); }
  else if (v instanceof Mob) { v.panicT = secs; v.fleeFrom = m; }
}
function d2Bloodied(t) { const P = t.player || t; return P.health <= (P.maxHealth || 20) / 2; }
function d2Ground(v) { return v.player ? !!v.player.onGround : v instanceof Mob ? !!v.onGround : true; }
function d2Blind(v, secs) { if (v.player) { v.d2flashT = Math.max(v.d2flashT || 0, secs); d2Say(v, 'The light blinds you!', 'warn'); } else if (v instanceof Mob) { v.dndBlind = Math.max(v.dndBlind || 0, secs); v.slowT = Math.max(v.slowT || 0, secs * 0.5); } }
function d2Fwd(m, d, up) { return [m.x - Math.sin(m.yaw) * d, m.y + up, m.z - Math.cos(m.yaw) * d]; }
function d2Aim(from, t) { const tx = t.x - from[0], ty = (t.y + (t instanceof Mob ? t.h * 0.5 : 1)) - from[1], tz = t.z - from[2], l = Math.hypot(tx, ty, tz) || 1; return [tx / l, ty / l, tz / l, l]; }
function d2FloorY(m, max = 16) { const w = m.game.world, x = Math.floor(m.x), z = Math.floor(m.z); let y = Math.floor(m.y + 0.01); for (let i = 0; i < max; i++, y--) if (T_SOLID[w.getBlock(x, y - 1, z)]) return y; return m.y - max; }
// Don't fly into the roof of a cave: the highest a flyer can go here
function d2CapAlt(m, want) {
  const w = m.game.world, x = Math.floor(m.x), z = Math.floor(m.z), y0 = Math.floor(m.y + m.h);
  for (let y = y0; y < y0 + 10; y++) if (T_SOLID[w.getBlock(x, y, z)]) return Math.min(want, y - m.h - 0.3);
  return want;
}
function d2Fly(m, ty, k = 1.6, max = 4) { m.noGrav = true; m.flyVy = clamp((ty - m.y) * k, -max, max); }
function d2Chase(m, t, dist, dt, k = 1, stop = 0.9) {
  const sp = (m.noGrav && m.T.fly ? m.T.fly : m.T.speed) * k * (m.d2rageT > 0 ? 1.35 : 1);
  return { want: dist < stop ? 0 : sp, dir: (dist > 2.4 && !m.noGrav ? m.navDir(t.x, t.y, t.z, dt) : null) ?? heading(m.x, m.z, t.x, t.z) };
}
function d2Wander(m, dt, k = 0.6) { m.wander(dt); const r = m.wanderMove(); r.want *= k; return r; }
// A blow within reach, when its claws are ready
function d2Melee(m, t, reach, cd, fn) {
  if (!t || m.attackCd > 0) return false;
  const d = Math.hypot(t.x - m.x, t.z - m.z) - (t.w || 0.3) - m.w, dy = t.y - m.y;
  if (d > reach || dy > m.h + 0.5 || dy < -2.2) return false;
  m.attackCd = cd * (m.d2rageT > 0 ? 0.6 : 1); m.swingT = 0.3;
  fn(t);
  return true;
}
function d2Clear(g, x, y, z, v) {
  const tx = v.x - x, ty = v.y + 1 - y, tz = v.z - z, l = Math.hypot(tx, ty, tz);
  if (l < 1) return true;
  const hit = raycastBlocks(g.world, x, y, z, tx / l, ty / l, tz / l, l, false);
  return !hit || hit.dist >= l - 0.6;
}
// A breath (or a beam): particles each frame; the harm once to each creature caught in it
function d2Breath(m, dt, mouth, dir, o) {
  const g = m.game, [mx, my, mz] = mouth, [ux, uy, uz] = dir;
  const n = Math.min(o.n || 10, Math.ceil(dt * (o.rate || 160)));
  for (let i = 0; i < n; i++) {
    const sp = (o.speed || 10) * (0.8 + Math.random() * 0.5), j = o.spread ?? (o.line ? 0.06 : 0.3), f = Math.random() * 0.4;
    spellSpark(g, mx + ux * f, my + uy * f, mz + uz * f, o.tiles[i % o.tiles.length], { vx: (ux + (Math.random() - 0.5) * j) * sp, vy: (uy + (Math.random() - 0.5) * j) * sp, vz: (uz + (Math.random() - 0.5) * j) * sp,
      life: (o.len / sp) * (0.75 + Math.random() * 0.4), size: (o.size || 0.12) * (0.8 + Math.random() * 0.5), grow: o.grow ?? (o.line ? 0.6 : 2.6) });
  }
  if (o.smoke && Math.random() < dt * 12) spellSpark(g, mx, my, mz, o.smoke, { vx: ux * 4, vy: uy * 4 + 1, vz: uz * 4, life: 1.1, size: 0.25, grow: 2 });
  if (m.ghost) return;
  const hit = m._d2hit || (m._d2hit = new Set());
  if ((m._d2bt = (m._d2bt || 0) - dt) > 0) return;
  m._d2bt = 0.1;
  for (const v of d2Victims(m, mx, my, mz, o.len + 1, o.len)) {
    if (hit.has(v)) continue;
    const vx = v.x - mx, vy = v.y + (v instanceof Mob ? v.h / 2 : 0.9) - my, vz = v.z - mz, d = Math.hypot(vx, vy, vz);
    if (d > o.len + 0.5) continue;
    if (o.line) { const al = vx * ux + vy * uy + vz * uz; if (al < 0 || al > o.len) continue; if (Math.hypot(vx - ux * al, vy - uy * al, vz - uz * al) > (o.width || 1) + (v.w || 0.3)) continue; }
    else if (d > 1.2 && (vx * ux + vy * uy + vz * uz) / (d || 1) < (o.cos || 0.82)) continue;
    if (!d2Clear(g, mx, my, mz, v)) continue;
    hit.add(v);
    o.onHit(v, m);
  }
}
function d2Burst(m, x, y, z, r, o) { for (const v of d2Victims(m, x, y, z, r, o.h || 2.5)) { if (o.ground && !d2Ground(v)) continue; o.onHit(v, Math.hypot(v.x - x, v.z - z)); } }
// Holding something: a coil, mandibles, talons. It's carried where the holder says, until let go.
function d2Grab(m, t, dur, fwd = 1.2, up = 0.2, mode) { if (!t || t.dead || !d2Free(t) || (t instanceof Mob && (t.T.boss || t.w > 0.9))) return false; m.d2grab = { t, end: (m.d2t || 0) + dur, fwd, up, mode }; return true; }
function d2GrabTick(m) {
  const G = m.d2grab;
  if (!G) return;
  const t = G.t;
  if (!m.alive || (m.d2t || 0) > G.end || !t || t.dead || t.remove || (t instanceof Mob && !t.alive)) { m.d2grab = null; return; }
  let x, y, z;
  if (G.mode === 'below') { x = m.x; y = m.y + G.up; z = m.z; }
  else { const f = G.fwd + m.w; x = m.x - Math.sin(m.yaw) * f; z = m.z - Math.cos(m.yaw) * f; y = m.y + G.up; }
  const w = m.game.world;
  if (t.player) {
    const P = t.player;
    if (!collides(w, x - 0.3, y, z - 0.3, x + 0.3, y + 1.8, z + 0.3)) { P.x = x; P.y = y; P.z = z; }
    P.vx = P.vy = P.vz = 0; P.fallStart = null;
  } else if (t instanceof Mob) {
    if (!collides(w, x - t.w, y, z - t.w, x + t.w, y + t.h, z + t.w)) { t.x = x; t.y = y; t.z = z; }
    t.vx = t.vy = t.vz = 0;
  }
}
function d2Announce(m, msg, r = 48) { if (m._d2ann) return; m._d2ann = 1; for (const l of m.game.locals) if (Math.hypot(l.player.x - m.x, l.player.z - m.z) < r) l.toast(msg, 'boss'); }
// what's in your pack that a xorn wants, or that a rust monster can smell
const D2_TREASURE = ['diamond', 'emerald', 'ruby', 'sapphire', 'gold_ingot', 'gold_nugget', 'raw_gold', 'amethyst_shard', 'lumina_crystal', 'quartz', 'gold_block', 'diamond_block', 'emerald_block'];
function d2Metal(id) { return !!id && /iron|gold|copper|steel|chain|mithril|adamant|cinderite|bronze|silver|plate|scale|splint|breast|ring_?mail|half_?plate|sword|axe|mace|spear|dagger|hammer|pick|glaive|halberd|rapier|scimitar|sickle|trident|lance|morningstar|flail|war_?pick|javelin|shears|bucket/.test(id) && !/wood|stone|bone|crystal|leather|club|staff|bow|sling|dart|whip|net|hide/.test(id); }
function d2Carries(t, test) {
  const P = t && t.player; if (!P || !P.inv) return false;
  const inv = P.inv, h = inv.held;
  if (h && test(h.id)) return true;
  if (inv.armor && inv.armor.slots) for (const s of inv.armor.slots) if (s && test(s.id)) return true;
  const slots = inv.main && inv.main.slots; if (slots) for (const s of slots) if (s && test(s.id)) return true;
  return false;
}
// Things it hunts besides you: farm animals for the corrupted beast, horses for griffons
function d2Prey(m, dt, types, r) {
  if ((m._d2preyT = (m._d2preyT || 0) - dt) > 0) return m._d2prey && m._d2prey.alive && !m._d2prey.remove ? m._d2prey : null;
  m._d2preyT = 1;
  let best = null, bd = r;
  for (const e of m.game.entities) if (e instanceof Mob && e.alive && !e.owner && types.includes(e.type)) { const d = Math.hypot(e.x - m.x, e.z - m.z); if (d < bd && Math.abs(e.y - m.y) < 8) { bd = d; best = e; } }
  m._d2prey = best;
  return best;
}
function d2Aimed(c, m, t) { c.t = t; c.dist = Math.hypot(t.x - m.x, t.z - m.z); c.dyp = t.y - m.y; c.toT = heading(m.x, m.z, t.x, t.z); c.hunting = true; c.sees = true; }
function d2GroundKey(g, x, y, z) { const b = BLOCKS[g.world.getBlock(Math.floor(x), Math.floor(y) - 1, Math.floor(z))]; return b && b.key ? b.key : 'dirt'; }

// ---- a thrown spear, a bolt of force, a lance of light, a hurled stone ----
class D2Shot extends Entity {
  constructor(game, x, y, z, vx, vy, vz, owner, o) { super(game, x, y, z); this.netLocalOnly = true; this.vx = vx; this.vy = vy; this.vz = vz; this.owner = owner; this.o = o; this.w = 0.15; this.h = 0.15; }
  update(dt) {
    const g = this.game, o = this.o, own = this.owner;
    this.age += dt;
    if (this.age > (o.life || 4) || !own) { this.remove = true; return; }
    for (let s = 0; s < 3; s++) {
      const h = dt / 3; this.vy -= (o.grav || 0) * h;
      this.x += this.vx * h; this.y += this.vy * h; this.z += this.vz * h;
      if (!d2Ally(own)) for (const q of g.pawns()) if (!q.dead && Math.abs(q.x - this.x) < 0.5 && Math.abs(q.z - this.z) < 0.5 && this.y > q.y - 0.1 && this.y < q.y + 1.9) return this.hit(q);
      for (const e of g.entities) if (e instanceof Mob && e !== own && d2FoeOf(own, e) && Math.abs(e.x - this.x) < e.w + 0.25 && Math.abs(e.z - this.z) < e.w + 0.25 && this.y > e.y && this.y < e.y + e.h) return this.hit(e);
      if (T_SOLID[g.world.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))]) return this.hit(null);
    }
    if (Math.random() < dt * 40) spellSpark(g, this.x, this.y, this.z, o.fx || o.tile, { life: 0.35, size: (o.size || 0.3) * 0.45 });
  }
  hit(t) {
    const g = this.game, o = this.o;
    this.remove = true;
    spellFx(g, this.x, this.y, this.z, o.fx || o.tile, 14, 1.2, { life: 0.4 });
    if (o.burst) g.burst(this.x, this.y, this.z, o.burst, 10, 1);
    if (o.sound) g.sfx.playAt(o.sound, this.x, this.y, this.z);
    if (t && this.owner) { d2Hit(this.owner, t, o.dmg, o.kind, o.rider || 0, o.rkind, { knock: o.knock ?? 2, ignite: o.ignite, magic: o.magic }); if (o.prone) d2Prone(t); }
  }
  draws() {}
  glow(out) { out.push({ x: this.x, y: this.y, z: this.z, size: this.o.size || 0.3, uv: tileUV(ATLAS.tile[this.o.tile] ?? ATLAS.tile.white), light: 0xFF }); }
}
function d2Shoot(m, from, t, sp, o, lead = 0) {
  const [ux, uy, uz, l] = d2Aim(from, t), g = m.game;
  g.addEntity(new D2Shot(g, from[0], from[1], from[2], ux * sp, uy * sp + (o.grav ? l / sp * o.grav * 0.5 : 0) + lead, uz * sp, m, o));
}

// ---- their sounds ----
Object.assign(SND_FX, {
  d2_song: [2.4, 0.55, (b, v, r) => { const notes = [0, 3, 7, 5, 10, 7, 3, 0]; let t = 0; for (const n of notes) { const f = 440 * Math.pow(2, (n + (r() < 0.3 ? 1 : 0)) / 12); b.throat(t, 0.34, { f: [[0, f], [1, f * 0.985]], v: 'ao', k: 0.85, vib: [5.5, 6], breath: 0.25, gain: 0.5, att: 0.05, rel: 0.4 }); t += 0.28; } }],
  d2_chime: [1.6, 0.5, (b, v, r) => { b.modes(0, [[1320 + r() * 40, 0.9, 0.5], [1980, 0.7, 0.3], [2640, 0.5, 0.2], [3960, 0.35, 0.1]], 0.5); b.modes(0.12, [[1760, 0.8, 0.3]], 0.3); }],
  d2_rumble: [1.4, 0.7, (b, v, r) => { b.noise(0, 1.3, 'lp', 160, 0.7, 0.9, { brown: true, att: 0.2, curve: 0.6 }); b.thump(0.1, 60, 35, 0.6, 0.5); }],
  d2_screech: [1.2, 0.7, (b, v, r) => { b.throat(0, 0.9, { f: [[0, 900], [0.3, 1300], [1, 700]], v: 'ie', k: 0.55, rough: 0.4, breath: 0.4, drive: 0.4, gain: 0.6, att: 0.02 }); }],
  d2_grind: [1.0, 0.6, (b, v, r) => { b.grains(0, 0.9, 40, 200, 1400, 1.2, 0.5, { fade: true }); b.noise(0, 0.9, 'bp', 400, 1.2, 0.5, { brown: true }); }],
  d2_wind: [1.6, 0.6, (b, v, r) => { b.noise(0, 1.5, 'bp', 600, 1.5, 0.7, { sweep: 1.8, att: 0.3, curve: 0.5 }); b.noise(0, 1.5, 'lp', 250, 0.7, 0.4, { brown: true, att: 0.2 }); }],
  d2_crack: [0.8, 0.7, (b, v, r) => { b.modes(0, [[300 + r() * 80, 0.05, 1], [900, 0.03, 0.5]], 0.6); b.noise(0, 0.4, 'bp', 1800, 1.4, 0.6); b.grains(0.05, 0.6, 24, 300, 3000, 1.3, 0.35, { fade: true }); }],
});

// ---- how they think --------------------------------------------------------------------------------------------
// Each creature's brain gets what it's after: a wild one, the player (or whatever it quarrels with), once it
// has noticed them; one fighting for someone, the nearest hostile creature near its summoner, and when
// there's nothing to fight it keeps by its summoner.
const D2B = {};
function d2Think(m, B, dt, p, dist, dyp, forceAlly) {
  try {
    m.d2t = (m.d2t || 0) + dt;
    if (m.d2rageT > 0) m.d2rageT -= dt;
    if (!m.d2init) { m.d2init = true; if (B.init) B.init(m); }
    d2GrabTick(m);
    if (m.d2swallow) d2SwallowTick(m, dt);
    if (m.d2wave) d2WaveTick(m, dt);
    if (m.d2rain) d2RainTick(m, dt);
    const ally = forceAlly || d2Ally(m);
    const c = { t: null, dist: 999, dyp: 0, toT: m.yaw, hunting: false, sees: false, ally };
    if (ally) {
      m.d2statue = false; m.d2awake = true;
      const f = d2AllyFoe(m, dt);
      if (!f) {
        if (B.dig && (m.d2st === 'under' || m.d2st === 'sink')) { m.d2st = 'rise'; m.d2stT = 0.45; }
        if (B.dig && m.d2st === 'rise') return d2BurrowTick(m, dt, c, B.dig);
        m.d2breath = 0; m.lockMove = false; m.dstate = m.dstate === 'sleep' ? 'circle' : m.dstate;
        return d2Follow(m, dt, B.flyer);
      }
      d2Aimed(c, m, f);
    } else if (p) {
      c.t = p; c.dist = dist; c.dyp = dyp; c.toT = heading(m.x, m.z, p.x, p.z);
      const s = m.senses(p, dist, dyp, dt, B.range || 24);
      c.hunting = s.hunting; c.sees = s.sees;
      if (!c.hunting && B.sense && B.sense(m, p, dist, dt)) c.hunting = true;
    }
    return B.think(m, dt, c) || { want: 0, dir: m.yaw };
  } catch (e) {
    if (!m._d2err) { m._d2err = true; console.warn('dnd monster AI (' + m.type + ')', e); }
    return { want: 0, dir: m.yaw };
  }
}
function d2AllyFoe(m, dt) {
  const f = m.petFoe;
  if (f && d2FoeOf(m, f) && Math.hypot(f.x - m.x, f.z - m.z) < 28) return f;   // what its summoner fights, or what hurt it
  if ((m._d2scan = (m._d2scan || 0) - dt) > 0) return m._d2foe && d2FoeOf(m, m._d2foe) ? m._d2foe : null;
  m._d2scan = 0.5;
  const s = d2Summoner(m), cx = s ? s.x : m.x, cz = s ? s.z : m.z;
  let best = null, bd = 16;
  for (const e of m.game.entities) { if (!(e instanceof Mob) || !d2FoeOf(m, e)) continue; const d = Math.hypot(e.x - cx, e.z - cz); if (d < bd && Math.abs(e.y - m.y) < 10) { bd = d; best = e; } }
  return (m._d2foe = best);
}
function d2Follow(m, dt, flyer) {
  const s = d2Summoner(m);
  if (flyer) d2Fly(m, d2CapAlt(m, (s ? s.y : d2FloorY(m, 12)) + 2.2), 1.5, 4);
  if (!s) return d2Wander(m, dt, 0.5);
  const d = Math.hypot(s.x - m.x, s.z - m.z);
  if ((d > 28 || Math.abs(s.y - m.y) > 12) && m.teleportNear && m.teleportNear(s)) return { want: 0, dir: m.yaw };
  if (d > 5) return { want: (flyer && m.T.fly ? m.T.fly : m.T.speed) * (d > 10 ? 1.5 : 1.1), dir: flyer || !m.goToward ? heading(m.x, m.z, s.x, s.z) : m.goToward(s.x, s.y, s.z, dt) };
  return { want: 0, dir: heading(m.x, m.z, s.x, s.z) };
}

// ---- under the ground: gliding unseen, bursting up, fighting, sinking back ----
function d2SurfaceAt(w, x, y0, z) {
  const bx = Math.floor(x), bz = Math.floor(z), by = Math.floor(y0 + 0.01);
  for (let dy = 3; dy >= -6; dy--) { const y = by + dy; if (y < 2) break; if (T_SOLID[w.getBlock(bx, y - 1, bz)] && !T_SOLID[w.getBlock(bx, y, bz)] && !T_LIQUID[w.getBlock(bx, y, bz)]) return y; }
  return null;
}
function d2Glide(m, dir, step) {
  const w = m.game.world, fx = -Math.sin(dir), fz = -Math.cos(dir);
  const go = (x, z) => { const y = d2SurfaceAt(w, x, m.y, z); if (y === null) return false; m.x = x; m.z = z; m.y = y; return true; };
  if (!go(m.x + fx * step, m.z + fz * step)) { if (!go(m.x + fx * step, m.z)) go(m.x, m.z + fz * step); }
}
function d2Headroom(m, want) { const w = m.game.world, x = Math.floor(m.x), z = Math.floor(m.z), y0 = Math.floor(m.y); for (let y = y0; y < y0 + Math.ceil(want); y++) if (T_SOLID[w.getBlock(x, y, z)]) return Math.max(1.2, y - m.y - 0.05); return want; }
function d2Erupt(m, c, o) {
  const g = m.game, key = d2GroundKey(g, m.x, m.y, m.z);
  g.burst(m.x, m.y + 0.5, m.z, key, 40, 2.2); g.burst(m.x, m.y + 1, m.z, key, 20, 3);
  g.shake(o.eruptShake || 0.3, m);
  g.sfx.playAt('explode', m.x, m.y, m.z, 30);
  if (o.eruptFx) o.eruptFx(m);
  d2Burst(m, m.x, m.y + 0.5, m.z, o.eruptR || 1.8, { onHit: v => { if (o.onErupt) o.onErupt(m, v, c); else { d2Hit(m, v, o.eruptDmg || m.T.damage, o.eruptKind || 'piercing', o.eruptRider || 0, o.eruptRkind, { knock: 3 }); d2Toss(v, 7); } } });
  m.huntT = 10;
}
function d2BurrowTick(m, dt, c, o) {
  const g = m.game, t = c.t;
  m.d2stT = (m.d2stT || 0) - dt;
  switch (m.d2st) {
    case 'under': {
      m.d2burrowed = true; m.d2emerge = 0; m.h = o.hUnder || 0.8; m.invulnT = 0.3; m.noGrav = true; m.flyVy = undefined; m.vy = 0; m.vx = m.vz = 0; m.lockMove = true; m.d2strike = 0;
      let dir = m.yaw, sp = 0;
      if (t && c.hunting) { dir = c.toT; sp = c.dist > 0.6 ? o.speedUnder : 0; } else { m.wander(dt); dir = m.wanderDir; sp = m.wanderOn ? o.speedUnder * 0.35 : 0; }
      if (sp > 0) d2Glide(m, dir, sp * dt);
      if ((m._d2dust = (m._d2dust || 0) - dt) <= 0) { m._d2dust = sp > 0 ? 0.12 : 0.6; g.burst(m.x, m.y + 0.1, m.z, d2GroundKey(g, m.x, m.y, m.z), sp > 0 ? 5 : 2, 0.7); }
      if (sp > 0 && (m._d2rum = (m._d2rum || 0) - dt) <= 0) { m._d2rum = 1.3; g.sfx.playAt('d2_rumble', m.x, m.y, m.z, 24); if (o.shake && t && c.dist < 10) g.shake(o.shake * (1 - c.dist / 10), m); }
      if (t && c.hunting && c.dist < (o.erupt || 2) && m.d2stT <= 0 && Math.abs(c.dyp) < 3) { m.d2st = 'rise'; m.d2stT = 0.45; m.h = d2Headroom(m, o.hUp); d2Erupt(m, c, o); }
      return { want: 0, dir };
    }
    case 'rise': {
      m.d2burrowed = false; m.lockMove = true; m.vx = m.vz = 0; m.noGrav = false; m.invulnT = 0;
      m.d2emerge = clamp(1 - m.d2stT / 0.45, 0, 1);
      if (m.d2stT <= 0) { m.d2st = 'up'; m.d2stT = o.upTime[0] + Math.random() * (o.upTime[1] - o.upTime[0]); m.d2emerge = 1; m.lockMove = false; }
      return { want: 0, dir: t ? c.toT : m.yaw };
    }
    case 'up': {
      m.d2burrowed = false; m.d2emerge = 1; m.noGrav = false; m.lockMove = false;
      const r = o.up(m, dt, c) || { want: 0, dir: t ? c.toT : m.yaw };
      if (m.d2stT <= 0 && !m.d2swallow && !m.d2grab && (m.onGround || m.d2st !== 'up')) { m.d2st = 'sink'; m.d2stT = 0.6; g.sfx.playAt('d2_rumble', m.x, m.y, m.z, 24); }
      return r;
    }
    case 'sink': {
      m.lockMove = true; m.vx = m.vz = 0; m.d2emerge = clamp(m.d2stT / 0.6, 0, 1); m.d2strike = 0;
      if (Math.random() < dt * 25) g.burst(m.x + (Math.random() - 0.5), m.y + 0.2, m.z + (Math.random() - 0.5), d2GroundKey(g, m.x, m.y, m.z), 3, 1);
      if (m.d2stT <= 0) { m.d2st = 'under'; m.d2stT = o.coolUnder[0] + Math.random() * (o.coolUnder[1] - o.coolUnder[0]); }
      return { want: 0, dir: m.yaw };
    }
  }
  m.d2st = 'under';
  return { want: 0, dir: m.yaw };
}
// a worm above ground: it turns to face you and strikes down
function d2WormUp(m, dt, c, o) {
  const g = m.game, t = c.t;
  if (o.fx) o.fx(m, dt, c);
  if (m.d2strikeT > 0) {
    m.d2strikeT -= dt;
    const k = clamp(1 - m.d2strikeT / 0.7, 0, 1);
    m.d2strike = Math.sin(k * Math.PI); m.d2open = 1;
    if (k > 0.45 && !m._d2bit) {
      m._d2bit = true;
      if (t && Math.hypot(t.x - m.x, t.z - m.z) < o.reach + (t.w || 0.3) && Math.abs(t.y - m.y) < 4) { d2Hit(m, t, o.bite[0], o.bite[1], o.bite[2] || 0, o.bite[3], { knock: o.knock ?? 3, ignite: o.ignite }); if (o.onBite) o.onBite(m, t); }
      g.sfx.playAt('dragon_bite', m.x, m.y + 2, m.z, 24);
    }
    return { want: 0, dir: m.yaw };
  }
  m.d2strike = Math.max(0, (m.d2strike || 0) - dt * 3); m.d2open = Math.max(0, (m.d2open || 0) - dt * 1.5);
  if (!t || !c.hunting) return { want: 0, dir: m.yaw };
  m.voiceTick(dt, c.dist, 4, 6);
  m.d2bite = (m.d2bite ?? 0.4) - dt;
  if (m.d2bite <= 0 && c.dist < o.reach + 0.6) { m.d2bite = o.cd; m.d2strikeT = 0.7; m._d2bit = false; }
  if (c.dist > o.reach + 3 && m.d2stT > 1 && !m.d2swallow) m.d2stT = 1;   // out of reach: back under soon
  return { want: 0, dir: c.toT };
}
// the purple worm's gullet: swallowed, blind, burning with acid, until you hurt it enough or it spits you out
function d2SwallowTick(m, dt) {
  const S = m.d2swallow, t = S.t;
  if (!t || t.dead || !m.alive || m.d2t > S.end || S.dmg >= 30) { d2Spit(m); return; }
  if (t.player) { const P = t.player; P.x = m.x; P.y = m.y + 0.4; P.z = m.z; P.vx = P.vy = P.vz = 0; P.fallStart = null; t.darkT = Math.max(t.darkT || 0, 1.2); }
  if ((S.acid -= dt) <= 0) { S.acid = 2; d2Hit(m, t, d2Roll(2, 6), 'acid', 0, null, { magic: true, knock: 0 }); }
}
function d2Spit(m) {
  const S = m.d2swallow; m.d2swallow = null;
  if (!S || !S.t || S.t.dead) return;
  const t = S.t, x = m.x - Math.sin(m.yaw) * 2.5, z = m.z - Math.cos(m.yaw) * 2.5, y = m.y + 1.5;
  if (t.player && !collides(m.game.world, x - 0.3, y, z - 0.3, x + 0.3, y + 1.8, z + 0.3)) { t.player.x = x; t.player.y = y; t.player.z = z; }
  d2Toss(t, 5); d2Say(t, 'The worm spits you out!', 'good');
  m.game.burst(x, y, z, 'slime_ball', 14, 1);
}
// a ring of force rolling out across the ground (jump it)
function d2WaveTick(m, dt) {
  const W = m.d2wave, g = m.game;
  W.r += dt * 6;
  if (W.r > W.max) { m.d2wave = null; return; }
  const n = Math.round(10 + W.r * 6);
  for (let i = 0; i < n; i++) { const a = i / n * TAU + W.r; spellSpark(g, W.x + Math.cos(a) * W.r, W.y + 0.15, W.z + Math.sin(a) * W.r, i % 3 ? 'mana_heal' : 'mana_frost', { vy: 0.8 + Math.random(), life: 0.25, size: 0.1 }); }
  if (Math.random() < dt * 20) g.burst(W.x + Math.cos(W.r * 3) * W.r, W.y + 0.1, W.z + Math.sin(W.r * 3) * W.r, d2GroundKey(g, W.x, W.y, W.z), 3, 0.8);
  for (const v of d2Victims(m, W.x, W.y, W.z, W.r + 0.7, 2)) {
    if (W.hit.has(v)) continue;
    const d = Math.hypot(v.x - W.x, v.z - W.z);
    if (Math.abs(d - W.r) > 0.7) continue;
    W.hit.add(v);
    if (!d2Ground(v) || v.y > W.y + 0.8) { d2Float(v, 'Jumped it!', '#8fe38f'); continue; }
    d2Hit(m, v, d2Roll(2, 10), 'thunder', 0, null, { magic: true, knock: 2 }); d2Toss(v, 6); d2Prone(v);
  }
}
// crystal shards falling where it marked the ground
function d2RainTick(m, dt) {
  const g = m.game;
  for (const s of m.d2rain) {
    if (s.done) continue;
    if (m.d2t < s.at) { if (Math.random() < dt * 14) spellRing(g, s.x, s.y + 0.08, s.z, 'crystal_dragon_prism', 1.5, 10, { speed: -0.6, life: 0.4, size: 0.07, flat: true }); continue; }
    s.done = true;
    for (let i = 0; i < 16; i++) spellSpark(g, s.x + (Math.random() - 0.5) * 0.4, s.y + 6 - i * 0.35, s.z + (Math.random() - 0.5) * 0.4, i % 2 ? 'sparkle' : 'crystal_dragon_prism', { vy: -14, life: 0.3, size: 0.12 });
    spellFx(g, s.x, s.y + 0.4, s.z, 'crystal_dragon_prism', 24, 2.2, { life: 0.5, size: 0.1 });
    g.sfx.playAt('d2_chime', s.x, s.y, s.z, 20);
    d2Burst(m, s.x, s.y + 0.5, s.z, 1.6, { onHit: v => d2SaveHit(m, v, 'dex', 15, [3, 6], 'piercing', { knock: 1.5 }) });
  }
  if (m.d2rain.every(s => s.done)) m.d2rain = null;
}

// ---- Mount Cinder ----
D2B.magma_mephit = {
  range: 20, flyer: true,
  think(m, dt, c) {
    const g = m.game;
    if (Math.random() < dt * 4) g.flame(m.x + (Math.random() - 0.5) * 0.4, m.y + 0.4 + Math.random() * 0.4, m.z + (Math.random() - 0.5) * 0.4);
    const floor = d2FloorY(m, 10);
    if (!c.t || !c.hunting) { d2Fly(m, d2CapAlt(m, floor + 1.3 + Math.sin(m.d2t) * 0.3), 1.2, 2); m.voiceTick(dt, c.dist, 6, 8); return d2Wander(m, dt, 0.7); }
    m.voiceTick(dt, c.dist, 3, 5);
    m.d2cd = (m.d2cd ?? 3 + Math.random() * 4) - dt;
    if (m.d2breath > 0) {
      m.d2breath -= dt; d2Fly(m, d2CapAlt(m, c.t.y + 1.4), 2, 3);
      const mo = d2Fwd(m, 0.35, 0.75);
      d2Breath(m, dt, mo, d2Aim(mo, c.t), D2_MEPHIT_BREATH);
      return { want: 0, dir: c.toT };
    }
    if (m.d2cd <= 0 && c.sees && c.dist < 3.6 && c.dist > 1) { m.d2breath = 1.0; m.d2cd = 9 + Math.random() * 6; m._d2hit = new Set(); g.sfx.playAt('spell_fire', m.x, m.y + 0.8, m.z); return { want: 0, dir: c.toT }; }
    // flit in, claw, flit back out
    m.d2back = (m.d2back || 0) - dt;
    d2Fly(m, d2CapAlt(m, c.t.y + (m.d2back > 0 ? 2.2 : 0.9) + Math.sin(m.d2t * 3) * 0.15), 2, 3.5);
    if (d2Melee(m, c.t, 0.9, 1.8, t => d2Hit(m, t, 3, 'slashing', 3, 'fire', { ignite: 1.5 }))) m.d2back = 1.0;
    if (m.d2back > 0) return { want: m.T.fly * 0.8, dir: c.toT + Math.PI + Math.sin(m.d2t) * 0.8 };
    return { want: c.dist < 0.8 ? 0 : m.T.fly * 1.1, dir: c.toT };
  },
};
const D2_MEPHIT_BREATH = { len: 3.2, cos: 0.8, tiles: D2_FIRE, speed: 8, size: 0.09, onHit: (v, m) => d2SaveHit(m, v, 'dex', 11, [2, 6], 'fire', { ignite: 2 }) };

D2B.fire_elemental = {
  range: 22,
  think(m, dt, c) {
    const g = m.game;
    if (Math.random() < dt * 22) g.flame(m.x + (Math.random() - 0.5) * 1.1, m.y + Math.random() * 2.4, m.z + (Math.random() - 0.5) * 1.1);
    if (Math.random() < dt * 3) spellSpark(g, m.x + (Math.random() - 0.5), m.y + 2 + Math.random(), m.z + (Math.random() - 0.5), 'mana_ember', { vy: 1.5 + Math.random(), life: 0.9, size: 0.06 });
    // water undoes it
    if (m.inWater && (m._d2wet = (m._d2wet || 0) - dt) <= 0) { m._d2wet = 0.5; m.hurt(d2Roll(1, 6), { type: 'magic', element: 'frost', knock: 0 }); spellFx(g, m.x, m.y + 1, m.z, 'cloud_puff', 8, 1.2, { life: 0.9, size: 0.25, vy: 1.5 }); g.sfx.playAt('fizz', m.x, m.y + 1, m.z); }
    // its heat: whatever stands close burns
    if ((m._d2aura = (m._d2aura ?? 1.5) - dt) <= 0) { m._d2aura = 3; d2Burst(m, m.x, m.y + 1, m.z, 2.2, { onHit: v => d2Hit(m, v, Math.ceil(d2Roll(1, 10) / 2), 'fire', 0, null, { magic: true, knock: 0.5, ignite: 2 }) }); }
    if (!c.t || !c.hunting) { m.voiceTick(dt, c.dist, 5, 7); return d2Wander(m, dt); }
    m.voiceTick(dt, c.dist, 3, 4);
    d2Melee(m, c.t, 1.2, 1.6, t => { m._swingSide = -(m._swingSide || 1); d2Hit(m, t, 10, 'fire', 0, null, { ignite: 3 }); g.sfx.playAt('ignite', t.x, t.y + 1, t.z); });
    return d2Chase(m, c.t, c.dist, dt, 1, 1.0);
  },
};

D2B.salamander = {
  range: 22,
  think(m, dt, c) {
    const g = m.game;
    if (Math.random() < dt * 6) { const a = Math.random() * TAU; g.flame(m.x + Math.cos(a) * 0.5, m.y + 1.6 + Math.random() * 0.8, m.z + Math.sin(a) * 0.5); }
    if ((m._d2aura = (m._d2aura ?? 2) - dt) <= 0) { m._d2aura = 3; d2Burst(m, m.x, m.y + 1, m.z, 1.6, { onHit: v => d2Hit(m, v, Math.ceil(d2Roll(2, 6) / 2), 'fire', 0, null, { magic: true, knock: 0.3 }) }); }
    if (m.d2throwT > 0) m.d2throwT -= dt;
    m.d2spearOut = m.d2throwT > 0;
    if (!c.t || !c.hunting) { m.voiceTick(dt, c.dist, 6, 8); return d2Wander(m, dt, 0.7); }
    m.voiceTick(dt, c.dist, 4, 6);
    // it coils round whatever is close
    m.d2coil = (m.d2coil ?? 6) - dt;
    if (m.d2coil <= 0 && c.dist < 2.2 + m.w && Math.abs(c.dyp) < 1.6 && !m.d2grab) {
      m.d2coil = 12 + Math.random() * 4;
      if (!d2Save(c.t, 'str', 15)) { d2Hit(m, c.t, 11, 'bludgeoning', 7, 'fire', { knock: 0 }); if (d2Grab(m, c.t, 3, 0.9, 0.1)) d2Say(c.t, 'The salamander coils around you!', 'warn'); g.sfx.playAt('hiss', m.x, m.y + 1, m.z); }
      else d2Float(c.t, 'Slipped free!');
    }
    // and throws its burning spear at range (it comes back to its hand)
    m.d2spear = (m.d2spear ?? 2) - dt;
    if (m.d2spear <= 0 && c.sees && c.dist > 4.5 && c.dist < 13 && !(m.d2throwT > 0)) {
      m.d2spear = 4 + Math.random() * 2; m.d2throwT = 0.7; m.swingT = 0.3;
      d2Shoot(m, d2Fwd(m, 0.6, 2.2), c.t, 20, { dmg: 13, kind: 'piercing', rider: 7, rkind: 'fire', ignite: 2, tile: 'mana_fire', fx: 'mana_fire', grav: 4, size: 0.32, sound: 'burn' });
      g.sfx.playAt('bow', m.x, m.y + 2, m.z);
    }
    d2Melee(m, c.t, 1.7, 1.6, t => d2Hit(m, t, 13, 'piercing', 7, 'fire', { ignite: 2, knock: 2.5 }));
    return d2Chase(m, c.t, c.dist, dt, 1, 1.4);
  },
};

D2B.hell_hound = {
  range: 26,
  think(m, dt, c) {
    const g = m.game;
    if (Math.random() < dt * 3) { const [x, y, z] = d2Fwd(m, 0.9, 1.0); g.flame(x, y, z); }
    if (!c.t || !c.hunting) { m.voiceTick(dt, c.dist, 7, 9); return d2Wander(m, dt, 0.8); }
    m.voiceTick(dt, c.dist, 4, 6);
    m.d2cd = (m.d2cd ?? 2 + Math.random() * 3) - dt;
    if (m.d2wind > 0) { m.d2wind -= dt; if (m.d2wind <= 0) { m.d2breath = 1.1; m._d2hit = new Set(); g.sfx.playAt('dragon_breath', m.x, m.y + 1, m.z, 30); } return { want: 0, dir: c.toT }; }
    if (m.d2breath > 0) {
      m.d2breath -= dt;
      const mo = d2Fwd(m, 1.1, 0.95);
      d2Breath(m, dt, mo, d2Aim(mo, c.t), D2_HOUND_BREATH);
      return { want: 0, dir: c.toT };
    }
    if (m.d2cd <= 0 && c.sees && c.dist < 4.2 && c.dist > 1.6 && Math.abs(c.dyp) < 2) { m.d2wind = 0.45; m.d2cd = 8 + Math.random() * 5; g.sfx.playAt('werewolf_angry', m.x, m.y + 1, m.z); return { want: 0, dir: c.toT }; }
    // pack tactics: a packmate at its quarry's side and it bites surer
    if ((m._d2packT = (m._d2packT || 0) - dt) <= 0) { m._d2packT = 0.6; m._d2pack = g.entities.some(e => e !== m && e.type === 'hell_hound' && e.alive && Math.hypot(e.x - c.t.x, e.z - c.t.z) < 2); }
    d2Melee(m, c.t, 0.9, 1.6, t => d2Hit(m, t, 7 + (m._d2pack ? 2 : 0), 'piercing', 3, 'fire', { ignite: 1 }));
    return d2Chase(m, c.t, c.dist, dt, 1, 0.9);
  },
};
const D2_HOUND_BREATH = { len: 3.4, cos: 0.82, tiles: D2_FIRE, speed: 9, size: 0.11, smoke: 'smoke', onHit: (v, m) => d2SaveHit(m, v, 'dex', 12, [5, 6], 'fire', { ignite: 2 }) };

// stone until something comes near (or strikes it)
function d2StatueTick(m, dt, c, o) {
  if (m.d2statue === undefined) m.d2statue = !c.ally;
  if (!m.d2statue) return false;
  m.d2awake = false; m.noGrav = false; m.swingT = 0;
  const t = c.t, near = t && c.dist < (t.sneaking ? o.sneakR : o.r) && Math.abs(c.dyp) < 4;
  if (near || m.d2woke) { m.d2statue = false; m.d2woke = false; m.d2awake = true; m.huntT = 10; m.attackCd = 0.6; if (o.wake) o.wake(m); return false; }
  return true;
}
D2B.gargoyle = {
  range: 24, flyer: true,
  think(m, dt, c) {
    const g = m.game;
    if (d2StatueTick(m, dt, c, D2_GARGOYLE_WAKE)) return { want: 0, dir: m.yaw };
    if (m.d2lift > 0) { m.d2lift -= dt; m.noGrav = true; m.flyVy = 5; return { want: 0, dir: c.toT }; }
    if (!c.t || !c.hunting) {
      // nothing to hunt: down to the ground, and back to stone
      m.d2idle = (m.d2idle || 0) + dt;
      if (m.y - d2FloorY(m, 20) > 0.3 && !m.onGround) { m.noGrav = true; m.flyVy = -2.5; return { want: 0, dir: m.yaw }; }
      m.noGrav = false;
      if (m.d2idle > 20 && m.onGround) { m.d2statue = true; m.d2idle = 0; }
      return d2Wander(m, dt, 0.4);
    }
    m.d2idle = 0;
    m.voiceTick(dt, c.dist, 6, 8);
    m.d2back = (m.d2back || 0) - dt;
    d2Fly(m, d2CapAlt(m, c.t.y + (m.d2back > 0 ? 3 : 0.6)), 1.8, 4);
    if (d2Melee(m, c.t, 1.0, 1.4, t => d2Hit(m, t, 7, 'slashing', 0, null, { knock: 2.5 }))) { m.d2hits = (m.d2hits || 0) + 1; if (m.d2hits % 2 === 0) m.d2back = 1.4; }   // two claws, then away
    if (m.d2back > 0) return { want: m.T.fly, dir: c.toT + Math.PI + 0.7 };
    return { want: c.dist < 0.9 ? 0 : m.T.fly, dir: c.toT };
  },
};
const D2_GARGOYLE_WAKE = { r: 4.5, sneakR: 2.2, wake: m => { const g = m.game; g.sfx.playAt('d2_crack', m.x, m.y + 1, m.z, 24); g.burst(m.x, m.y + 1, m.z, 'stone', 22, 1.2); g.sfx.playAt('ogre_angry', m.x, m.y + 1.5, m.z, 24); m.d2lift = 0.6; } };

// the dragons: asleep (or perched) until disturbed; then wing, circle, breathe, dive, land to fight
function d2DragonBrain(o) {
  return {
    range: 40, flyer: true,
    init(m) { m.dstate = 'sleep'; },
    think(m, dt, c) {
      const g = m.game, T = m.T, t = c.t;
      if (m.hoverT > 0) m.hoverT -= dt;
      if (m.d2sting > 0) m.d2sting -= dt;
      if (typeof dragonUnstick === 'function') dragonUnstick(m, dt);
      if (!t) { if (m.dstate !== 'sleep') { if (!m.onGround) { m.noGrav = true; m.flyVy = -4; } else { m.noGrav = false; m.dstate = 'sleep'; } } return { want: 0, dir: m.yaw }; }
      const mouth = () => (typeof dragonMouth === 'function' ? dragonMouth(m) : d2Fwd(m, 2, m.h * 0.8));
      const bite = (reach) => d2Melee(m, t, reach, o.cd || 1.3, v => {
        m.d2n = (m.d2n || 0) + 1;
        if (o.sting && m.d2n % 2 === 0) { m.d2sting = 0.5; d2Hit(m, v, o.sting[0], 'piercing', o.sting[1], 'poison', { knock: 3, poison: 5 }); }
        else d2Hit(m, v, T.damage, o.kind || 'slashing', o.rider || 0, o.rkind, { knock: 4 });
        g.sfx.playAt('dragon_bite', m.x, m.y + 1, m.z);
      });
      switch (m.dstate) {
        case 'sleep': {
          m.noGrav = false;
          if (o.smoke && Math.random() < dt * 0.5) { const [x, y, z] = mouth(); g.burst(x, y - 0.6, z, o.smoke, 3, 0.25, -1); }
          if ((c.hunting && c.dist < 26 && !(t.sneaking && c.dist > 10)) || m.hurtTime > 0 || c.ally) {
            m.dstate = 'takeoff'; m.stT = 1.4; m.noGrav = true; m.flyVy = 6;
            g.sfx.playAt('dragon_roar', m.x, m.y + 2, m.z, 90);
            if (o.wake) d2Announce(m, o.wake, 60);
          }
          return { want: 0, dir: m.yaw };
        }
        case 'takeoff': { m.stT -= dt; m.noGrav = true; m.flyVy = 6.5; if (m.stT <= 0) { m.dstate = 'circle'; m.stT = 3 + Math.random() * 2; m.orbit = Math.atan2(m.z - t.z, m.x - t.x); } return { want: 2, dir: m.yaw }; }
        case 'circle': {
          m.noGrav = true; m.stT -= dt; m.orbit = (m.orbit || 0) + dt * 0.55;
          const R = o.circle || 12, gx = t.x + Math.cos(m.orbit) * R, gz = t.z + Math.sin(m.orbit) * R, alt = d2CapAlt(m, t.y + (o.alt || 9) + Math.sin(m.age * 0.7) * 1.5);
          m.flyVy = clamp((alt - m.y) * 1.2, -6, 6);
          if ((m.flapT = (m.flapT || 0) - dt) <= 0) { m.flapT = 0.7; g.sfx.playAt('dragon_flap', m.x, m.y + 2, m.z, 40); }
          m.d2cd = (m.d2cd ?? 2) - dt;
          if (m.stT <= 0) {
            if (!c.hunting && c.dist > 30) { m.dstate = 'land'; m.stT = 6; }
            else { m.dstate = o.breath && m.d2cd <= 0 ? 'breath' : Math.random() < 0.6 ? 'dive' : 'land'; m.stT = m.dstate === 'land' ? 8 : 6; m.breathPt = null; }
          }
          return { want: T.fly * 1.1, dir: heading(m.x, m.z, gx, gz) };
        }
        case 'breath': {
          m.noGrav = true; m.stT -= dt;
          if (!m.breathPt) { const a = Math.atan2(m.z - t.z, m.x - t.x), r = o.breathR || 5.5; m.breathPt = [t.x + Math.cos(a) * r, t.y + 3.5, t.z + Math.sin(a) * r]; }
          const [bx, by, bz] = m.breathPt, d = Math.hypot(bx - m.x, bz - m.z);
          m.flyVy = clamp((d2CapAlt(m, by) - m.y) * 1.5, -6, 6);
          if (d > 2 && !(m.breathT > 0) && m.stT > 0) return { want: T.fly, dir: heading(m.x, m.z, bx, bz) };
          m.yaw = turnTo(m.yaw, heading(m.x, m.z, t.x, t.z), dt * 4); m.hoverT = 0.5;
          if (!(m.breathT > 0) && !m.breathed) { m.breathT = o.breathDur || 2.2; m.breathed = true; m._d2hit = new Set(); g.sfx.playAt(o.breathSound || 'dragon_breath', m.x, m.y + 2, m.z, 50); }
          if (m.breathT > 0) { m.breathT -= dt; const mo = mouth(); d2Breath(m, dt, mo, d2Aim(mo, t), o.breath); }
          else { m.breathed = false; m.d2cd = 14 + Math.random() * 6; m.dstate = 'circle'; m.stT = 3 + Math.random() * 2; }
          if (m.stT < -5) { m.breathT = 0; m.breathed = false; m.d2cd = 10; m.dstate = 'circle'; m.stT = 3; }
          return { want: 0, dir: m.yaw };
        }
        case 'dive': {
          m.noGrav = true; m.stT -= dt;
          m.flyVy = clamp((t.y + 0.5 - m.y) * 2.5, -11, 8);
          if (Math.hypot(t.x - m.x, t.y + 1 - m.y, t.z - m.z) < 2.6 + m.w && m.attackCd <= 0 && bite(3)) { m.dstate = 'climb'; m.stT = 1.4; }
          if (m.stT <= 0) { m.dstate = 'climb'; m.stT = 1.2; }
          return { want: T.fly * 1.5, dir: c.toT };
        }
        case 'climb': { m.stT -= dt; m.noGrav = true; m.flyVy = 7; if (m.stT <= 0) { m.dstate = 'circle'; m.stT = 3 + Math.random() * 3; } return { want: T.fly, dir: m.yaw }; }
        case 'land': {
          m.stT -= dt;
          if (!m.onGround) { m.noGrav = true; m.flyVy = -5; return { want: c.dist > 5 ? T.speed * 1.5 : 0, dir: c.toT }; }
          m.noGrav = false;
          if (!c.hunting) { m.d2rest = (m.d2rest || 0) + dt; if (m.d2rest > 12) { m.dstate = 'sleep'; m.d2rest = 0; } return d2Wander(m, dt, 0.5); }
          m.d2rest = 0;
          bite(2.0);
          m.d2cd = (m.d2cd ?? 0) - dt;
          if (o.breath && m.d2cd <= 0 && c.dist < (o.breath.len - 1) && c.sees) { m.dstate = 'gbreath'; m.breathT = o.breathDur || 2; m._d2hit = new Set(); g.sfx.playAt(o.breathSound || 'dragon_breath', m.x, m.y + 2, m.z, 50); return { want: 0, dir: c.toT }; }
          if (m.stT <= 0) { m.dstate = 'takeoff'; m.stT = 1.3; m.noGrav = true; g.sfx.playAt('dragon_roar', m.x, m.y + 2, m.z, 70); }
          return { want: c.dist < 2 ? 0 : T.speed, dir: (c.dist > 4 ? m.navDir(t.x, t.y, t.z, dt) : null) ?? c.toT };
        }
        case 'gbreath': {
          m.breathT -= dt; m.noGrav = false;
          const mo = mouth(); d2Breath(m, dt, mo, d2Aim(mo, t), o.breath);
          if (m.breathT <= 0) { m.d2cd = 14 + Math.random() * 6; m.dstate = 'land'; m.stT = Math.max(m.stT, 2); }
          return { want: 0, dir: c.toT };
        }
      }
      m.dstate = 'circle'; m.stT = 3;
      return { want: 0, dir: m.yaw };
    },
  };
}
D2B.young_red_dragon = d2DragonBrain({
  rider: 3, rkind: 'fire', cd: 1.2, smoke: 'smoke', wake: 'A young red dragon takes to the air!',
  breath: { len: 7, cos: 0.84, tiles: D2_FIRE, speed: 13, size: 0.16, rate: 220, n: 14, smoke: 'smoke', onHit: (v, m) => d2SaveHit(m, v, 'dex', 17, [16, 6], 'fire', { ignite: 4, knock: 2 }) },
});

const D2_MAGMA_DIG = {
  speedUnder: 3.0, erupt: 2.2, hUnder: 0.7, hUp: 3.2, upTime: [5, 8], coolUnder: [2.5, 4.5], eruptR: 2, shake: 0.12, eruptShake: 0.35,
  onErupt: (m, v) => { d2Hit(m, v, 13, 'piercing', 7, 'fire', { knock: 2, ignite: 3 }); d2Toss(v, 7); },
  eruptFx: m => { for (let i = 0; i < 24; i++) spellSpark(m.game, m.x + (Math.random() - 0.5) * 1.5, m.y + 0.3, m.z + (Math.random() - 0.5) * 1.5, Math.random() < 0.5 ? 'mana_ember' : 'flame', { vy: 3 + Math.random() * 4, vx: (Math.random() - 0.5) * 3, vz: (Math.random() - 0.5) * 3, grav: 9, life: 1.2, size: 0.12 }); },
  up: (m, dt, c) => d2WormUp(m, dt, c, D2_MAGMA_UP),
};
const D2_MAGMA_UP = { reach: 3.0, bite: [13, 'piercing', 7, 'fire'], ignite: 3, cd: 2.0, fx: (m, dt) => { if (Math.random() < dt * 10) m.game.flame(m.x + (Math.random() - 0.5) * 1.2, m.y + Math.random() * 3, m.z + (Math.random() - 0.5) * 1.2); } };
D2B.magma_worm = { range: 30, dig: D2_MAGMA_DIG, init(m) { m.d2st = 'under'; m.d2burrowed = true; m.d2emerge = 0; }, think(m, dt, c) { return d2BurrowTick(m, dt, c, D2_MAGMA_DIG); } };

// ---- the Crystal Caverns ----
function d2StuckFor(m, dt) { m._d2stuck = (m.hitWall && (m.lastWant || 0) > 0.5) ? (m._d2stuck || 0) + dt : 0; return m._d2stuck; }
const D2_EARTH_DIG = {
  speedUnder: 3.4, erupt: 2.4, hUnder: 0.8, hUp: 2.9, upTime: [12, 20], coolUnder: [1, 2], eruptR: 2.2, eruptDmg: 14, eruptKind: 'bludgeoning', eruptShake: 0.4,
  up(m, dt, c) {
    const g = m.game;
    if (!c.t || !c.hunting) { m.d2stT = Math.max(m.d2stT, 5); return d2Wander(m, dt, 0.5); }
    m.voiceTick(dt, c.dist, 5, 7);
    // far off, or no way through: down into the earth, and up beside its foe
    if ((c.dist > 12 || d2StuckFor(m, dt) > 1.5) && m.onGround) m.d2stT = 0; else m.d2stT = Math.max(m.d2stT, 3);
    m.d2rock = (m.d2rock ?? 2) - dt;
    if (m.d2rock <= 0 && c.sees && c.dist > 4.5 && c.dist < 12) {
      m.d2rock = 4 + Math.random() * 2; m.swingT = 0.3; m._swingSide = 1;
      d2Shoot(m, d2Fwd(m, 1, 2.6), c.t, 16, { dmg: 8, kind: 'bludgeoning', tile: 'air_elemental_debris', fx: 'smoke', burst: 'stone', grav: 8, size: 0.45, knock: 3, prone: true, sound: 'thud' });
    }
    d2Melee(m, c.t, 1.4, 1.6, t => { m._swingSide = -(m._swingSide || 1); d2Hit(m, t, 14, 'bludgeoning', 0, null, { knock: 5 }); g.sfx.playAt('thud', t.x, t.y + 1, t.z); });
    return d2Chase(m, c.t, c.dist, dt, 1, 1.4);
  },
};
D2B.earth_elemental = { range: 24, dig: D2_EARTH_DIG, init(m) { m.d2st = 'up'; m.d2emerge = 1; m.d2burrowed = false; m.d2stT = 5; }, think(m, dt, c) { return d2BurrowTick(m, dt, c, D2_EARTH_DIG); } };

function d2EatGem(m, t) {
  const P = t.player; if (!P || !P.inv || Math.random() > 0.3) return;
  for (const id of D2_TREASURE) if (P.inv.count(id) > 0) { P.inv.remove(id, 1); m.health = Math.min(m.maxHealth, m.health + 6); d2Say(t, 'The xorn snatches a ' + (ITEMS[id] ? ITEMS[id].name : id) + ' from you and eats it!', 'warn'); m.game.sfx.playAt('eat', m.x, m.y + 1, m.z); return; }
}
const D2_XORN_DIG = {
  speedUnder: 2.6, erupt: 2.0, hUnder: 0.6, hUp: 1.45, upTime: [10, 16], coolUnder: [1, 2], eruptR: 1.5, eruptDmg: 8, eruptKind: 'slashing',
  up(m, dt, c) {
    const g = m.game;
    m.d2open = Math.max(0, (m.d2open || 0) - dt * 2);
    if (!c.t || !c.hunting) { m.d2stT = Math.max(m.d2stT, 4); return d2Wander(m, dt, 0.5); }
    m.voiceTick(dt, c.dist, 5, 8);
    if ((c.dist > 10 || d2StuckFor(m, dt) > 1.5) && m.onGround) m.d2stT = 0; else m.d2stT = Math.max(m.d2stT, 3);
    // the charge: straight at what it senses
    m.d2chg = (m.d2chg ?? 2) - dt;
    if (m.d2chgT > 0) { m.d2chgT -= dt; d2Melee(m, c.t, 0.9, 1.0, t => d2Hit(m, t, 8, 'slashing', 0, null, { knock: 3 })); return { want: m.T.speed * 3, dir: c.toT }; }
    if (m.d2chg <= 0 && c.dist > 3 && c.dist < 8 && c.sees) { m.d2chg = 6; m.d2chgT = 0.9; g.sfx.playAt('d2_grind', m.x, m.y + 1, m.z, 20); }
    d2Melee(m, c.t, 0.9, 1.0, t => {
      m.d2n = (m.d2n || 0) + 1; m._xarm = m.d2n % 3;
      if (m.d2n % 4 === 0) { m.d2open = 1; d2Hit(m, t, 17, 'piercing', 0, null, { knock: 2 }); d2EatGem(m, t); }
      else d2Hit(m, t, 8, 'slashing', 0, null, { knock: 1.5 });
    });
    return d2Chase(m, c.t, c.dist, dt, 1, 0.9);
  },
};
D2B.xorn = {
  range: 20, dig: D2_XORN_DIG,
  init(m) { m.d2st = 'up'; m.d2emerge = 1; m.d2burrowed = false; m.d2stT = 4; },
  // Treasure Sense: it knows where your gems and gold are, through the rock
  sense(m, t, dist, dt) { if ((m._d2gemT = (m._d2gemT || 0) - dt) <= 0) { m._d2gemT = 2; m._d2gem = dist < 40 && d2Carries(t, id => D2_TREASURE.includes(id)); } return m._d2gem; },
  think(m, dt, c) { return d2BurrowTick(m, dt, c, D2_XORN_DIG); },
};

D2B.stone_golem = {
  range: 24,
  think(m, dt, c) {
    const g = m.game;
    if (m.d2cast > 0) m.d2cast -= dt;
    if (!c.t || !c.hunting) return d2Wander(m, dt, 0.5);
    if (m.walkAmt > 0.4 && (m._d2step = (m._d2step || 0) - dt) <= 0) { m._d2step = 0.55; g.sfx.playAt('thud', m.x, m.y, m.z, 16); if (c.dist < 8) g.shake(0.06, m); }
    // its gaze slows everything around it
    m.d2slow = (m.d2slow ?? 4) - dt;
    if (m.d2slow <= 0 && c.sees && c.dist < 9) {
      m.d2slow = 14 + Math.random() * 6; m.d2cast = 0.8;
      spellRing(g, m.x, m.y + 0.1, m.z, 'mana_arcane', 1, 40, { speed: 7, life: 1.2, flat: true });
      g.sfx.playAt('spell_ward', m.x, m.y + 2, m.z, 30);
      d2Burst(m, m.x, m.y + 1, m.z, 9, { onHit: v => { if (!d2Save(v, 'wis', 17)) d2Slow(v, 10, 'The golem\'s gaze slows you!'); else d2Float(v, 'Save!'); } });
    }
    if (m.d2cast > 0) return { want: 0, dir: c.toT };
    m.d2bolt = (m.d2bolt ?? 2) - dt;
    if (m.d2bolt <= 0 && c.sees && c.dist > 4 && c.dist < 22) {
      m.d2bolt = 4 + Math.random() * 2; m.swingT = 0.3;
      const from = d2Fwd(m, 0.8, 2.4);
      d2Shoot(m, from, c.t, 18, { dmg: 22, kind: 'force', tile: 'mana_arcane', fx: 'mana_arcane', size: 0.35, knock: 3, sound: 'spell_hit' });
      g.sfx.playAt('spell_zap', from[0], from[1], from[2], 24);
    }
    d2Melee(m, c.t, 1.3, 1.8, t => { m._swingSide = -(m._swingSide || 1); d2Hit(m, t, 15, 'bludgeoning', 9, 'force', { knock: 5 }); g.sfx.playAt('thud', t.x, t.y + 1, t.z); });
    return d2Chase(m, c.t, c.dist, dt, 1, 1.3);
  },
};

// the rust monster's antennae: your metal flakes away
function d2RustTouch(m, t) {
  const P = t.player; if (!P || !P.inv) return;
  if (d2Save(t, 'dex', 11)) { d2Float(t, 'Dodged the antennae'); return; }
  const fx = () => m.game.burst(t.x, t.y + 1, t.z, 'rust_antenna', 10, 0.8);
  const h = P.inv.held, hd = h && itemDef(h.id);
  if (hd && hd.tool && hd.tool.durability && d2Metal(h.id)) {
    h.d = (h.d || 0) + Math.ceil(hd.tool.durability * 0.2); fx();
    if (h.d >= hd.tool.durability) { P.inv.held = null; d2Say(t, 'Your ' + hd.name + ' rusts away to nothing!', 'warn'); } else d2Say(t, 'Your ' + hd.name + ' corrodes!', 'warn');
    return;
  }
  const slots = P.inv.armor && P.inv.armor.slots; if (!slots) return;
  const metal = []; for (let i = 0; i < slots.length; i++) { const s = slots[i], d = s && itemDef(s.id); if (d && d.armor && d.armor.durability && d2Metal(s.id)) metal.push(i); }
  if (!metal.length) return;
  const i = metal[Math.floor(Math.random() * metal.length)], s = slots[i], d = itemDef(s.id);
  s.d = (s.d || 0) + Math.ceil(d.armor.durability * 0.2); fx();
  if (s.d >= d.armor.durability) { slots[i] = null; d2Say(t, 'Your ' + d.name + ' rusts away to nothing!', 'warn'); } else d2Say(t, 'Your ' + d.name + ' corrodes!', 'warn');
}
D2B.rust_monster = {
  range: 18,
  sense(m, t, dist, dt) { if ((m._d2ironT = (m._d2ironT || 0) - dt) <= 0) { m._d2ironT = 1.5; m._d2iron = dist < 16 && d2Carries(t, d2Metal); } return m._d2iron; },   // Iron Scent
  think(m, dt, c) {
    const g = m.game;
    if (!c.t || !c.hunting) {
      // iron lying about: it goes and eats it
      if ((m._d2foodT = (m._d2foodT || 0) - dt) <= 0) { m._d2foodT = 1; m._d2food = null; let bd = 10; for (const e of g.entities) if (e instanceof DroppedItem && !e.remove && e.stack && d2Metal(e.stack.id)) { const d = Math.hypot(e.x - m.x, e.z - m.z); if (d < bd) { bd = d; m._d2food = e; } } }
      const f = m._d2food;
      if (f && !f.remove) {
        if (Math.hypot(f.x - m.x, f.z - m.z) < 1.2) { f.remove = true; g.burst(f.x, f.y + 0.2, f.z, 'rust_antenna', 10, 0.6); g.sfx.playAt('eat', m.x, m.y + 0.5, m.z); m.health = Math.min(m.maxHealth, m.health + 4); m._d2food = null; }
        return { want: m.T.speed * 0.8, dir: m.goToward ? m.goToward(f.x, f.y, f.z, dt) : heading(m.x, m.z, f.x, f.z) };
      }
      m.voiceTick(dt, c.dist, 6, 8); return d2Wander(m, dt, 0.7);
    }
    m.voiceTick(dt, c.dist, 4, 6);
    d2Melee(m, c.t, 0.9, 1.8, t => { d2Hit(m, t, 5, 'piercing', 0, null, { knock: 1.5 }); d2RustTouch(m, t); });
    return d2Chase(m, c.t, c.dist, dt, 1, 0.9);
  },
};

D2B.giant_bat = {
  range: 16, flyer: true,
  think(m, dt, c) {
    const g = m.game;
    // blindsight: it finds you by sound, seen or not
    if (!c.t && !c.ally) { const t = g.nearestPawn(m.x, m.y, m.z, 12); if (t) d2Aimed(c, m, t); }
    m.roosting = false;
    if ((m._d2sq = (m._d2sq || 0) - dt) <= 0) { m._d2sq = 1.5 + Math.random() * 2.5; g.sfx.playAt('bat', m.x, m.y, m.z, 16); }
    const floor = d2FloorY(m, 12);
    if (!c.t || !c.hunting) { d2Fly(m, d2CapAlt(m, floor + 2.5 + Math.sin(m.d2t * 0.8)), 1.2, 3); return d2Wander(m, dt, 1.4); }
    m.d2back = (m.d2back || 0) - dt;
    const jig = Math.sin(m.d2t * 5 + m.id) * 0.6;
    d2Fly(m, d2CapAlt(m, c.t.y + (m.d2back > 0 ? 2.5 : 1.1) + jig * 0.3), 2, 4.5);
    if (d2Melee(m, c.t, 0.9, 2.0, v => d2Hit(m, v, 6, 'piercing', 0, null, { knock: 1.5 }))) m.d2back = 1.1;
    if (m.d2back > 0) return { want: m.T.fly, dir: c.toT + Math.PI + jig };
    return { want: m.T.fly, dir: c.toT + jig * 0.4 };
  },
};

D2B.crystal_sentinel = {
  range: 22,
  think(m, dt, c) {
    const g = m.game;
    if (Math.random() < dt * 2) spellSpark(g, m.x + (Math.random() - 0.5) * 0.8, m.y + 0.5 + Math.random() * 1.8, m.z + (Math.random() - 0.5) * 0.8, 'sparkle', { vy: 0.4, life: 0.8, size: 0.06 });
    if (m.d2hum > 0) {
      m.d2hum -= dt;
      if (Math.random() < dt * 30) { const a = Math.random() * TAU, r = 3; spellSpark(g, m.x + Math.cos(a) * r, m.y + 1.2, m.z + Math.sin(a) * r, 'crystal_dragon_prism', { vx: -Math.cos(a) * r * 1.2, vz: -Math.sin(a) * r * 1.2, life: 0.8, size: 0.08 }); }
      if (m.d2hum <= 0) {   // the resonance blast
        g.sfx.playAt('rift_boom' in SND_FX ? 'rift_boom' : 'explode', m.x, m.y + 1, m.z, 30);
        for (let i = 0; i < 3; i++) spellRing(g, m.x, m.y + 0.6 + i * 0.5, m.z, i % 2 ? 'mana_frost' : 'crystal_dragon_prism', 0.6, 36, { speed: 6 + i * 2, life: 0.6 });
        g.shake(0.25, m);
        d2Burst(m, m.x, m.y + 1, m.z, 3.4, { onHit: v => { const ok = d2SaveHit(m, v, 'con', 14, [4, 10], 'thunder', { knock: 0 }); d2Push(m, v, ok ? 3 : 7); } });
      }
      return { want: 0, dir: c.t ? c.toT : m.yaw };
    }
    if (!c.t || !c.hunting) return d2Wander(m, dt, 0.5);
    m.d2res = (m.d2res ?? 4) - dt;
    if (m.d2res <= 0 && c.dist < 3.2) { m.d2hum = 0.9; m.d2res = 10 + Math.random() * 5; g.sfx.playAt('d2_chime', m.x, m.y + 1.5, m.z, 24); return { want: 0, dir: c.toT }; }
    m.d2bolt = (m.d2bolt ?? 3) - dt;
    if (m.d2bolt <= 0 && c.sees && c.dist > 5 && c.dist < 14) { m.d2bolt = 3.5 + Math.random() * 2; m.swingT = 0.3; d2Shoot(m, d2Fwd(m, 0.6, 1.6), c.t, 16, { dmg: d2Roll(2, 8), kind: 'thunder', tile: 'crystal_dragon_prism', fx: 'crystal_dragon_prism', size: 0.28, knock: 2, sound: 'd2_chime' }); }
    d2Melee(m, c.t, 1.0, 1.6, t => { d2Hit(m, t, 13, 'slashing', 0, null, { knock: 2 }); g.sfx.playAt('d2_chime', t.x, t.y + 1, t.z, 12); });
    return d2Chase(m, c.t, c.dist, dt, 1, 1.0);
  },
};

D2B.crystal_dragon = d2DragonBrain({
  rider: 4, rkind: 'radiant', cd: 1.5, wake: 'The crystal dragon unfolds its glittering wings!', breathR: 6.5, breathDur: 1.6, breathSound: 'd2_chime',
  breath: { line: true, width: 1.0, len: 12, tiles: D2_PRISM, speed: 24, size: 0.12, rate: 260, n: 16, onHit: (v, m) => d2SaveHit(m, v, 'dex', 16, [10, 8], 'radiant', { knock: 1.5, fail: u => d2Blind(u, 4) }) },
});

D2B.lumina_heart_guardian = {
  range: 32, flyer: true,
  think(m, dt, c) {
    const g = m.game, t = c.t;
    m.noGrav = true;
    m.d2fast = m.health < m.maxHealth * 0.5;
    if (Math.random() < dt * 6) spellSpark(g, m.x + (Math.random() - 0.5) * 2, m.y + 1 + Math.random() * 3, m.z + (Math.random() - 0.5) * 2, Math.random() < 0.5 ? 'sparkle' : 'crystal_dragon_prism', { vy: 0.5, life: 1, size: 0.07 });
    const floor = d2FloorY(m, 16);
    if (m.d2charge > 0) {
      m.d2charge -= dt; m.d2cast = 1;
      if (Math.random() < dt * 40) { const a = Math.random() * TAU; spellSpark(g, m.x + Math.cos(a) * 6, m.y + 1 + Math.random() * 2, m.z + Math.sin(a) * 6, 'crystal_dragon_prism', { vx: -Math.cos(a) * 7, vz: -Math.sin(a) * 7, life: 0.8, size: 0.1 }); }
      if (m.d2charge <= 0) {   // the shattering pulse
        m.d2cast = 0;
        g.sfx.playAt('rift_boom' in SND_FX ? 'rift_boom' : 'explode', m.x, m.y + 2, m.z, 40); g.shake(0.5, m);
        for (let i = 0; i < 4; i++) spellRing(g, m.x, floor + 0.3 + i * 0.6, m.z, i % 2 ? 'mana_frost' : 'crystal_dragon_prism', 1, 48, { speed: 9 + i * 2, life: 0.7, size: 0.12 });
        d2Burst(m, m.x, floor + 1, m.z, 6.2, { h: 4, onHit: v => { const ok = d2SaveHit(m, v, 'con', 18, [8, 8], 'thunder', { knock: 0 }); d2Push(m, v, ok ? 4 : 9, ok ? 3 : 6); if (!ok) d2Prone(v); } });
      }
      return { want: 0, dir: t ? c.toT : m.yaw };
    }
    m.d2cast = 0;
    if (!t || !c.hunting) { d2Fly(m, floor + 1.0 + Math.sin(m.d2t * 0.7) * 0.3, 1, 1.5); return { want: 0, dir: m.yaw + 0.3 * dt }; }
    if (!c.ally) d2Announce(m, 'The Guardian of the Heart of Lumina awakens!', 50);
    d2Fly(m, d2CapAlt(m, Math.max(floor + 0.6, t.y + 0.4) + Math.sin(m.d2t * 0.9) * 0.3), 1.2, 2);
    m.d2pulse = (m.d2pulse ?? 8) - dt;
    if (m.d2pulse <= 0 && c.dist < 6.5) { m.d2charge = 1.2; m.d2pulse = 14 + Math.random() * 4; m.d2decal = { x: m.x, y: floor, z: m.z, sx: 6.2, sz: 6.2, shape: 0, color: [0.6, 0.9, 1, 0.85], end: m.d2t + 1.2, len: 1.2 }; g.sfx.playAt('d2_chime', m.x, m.y + 2, m.z, 40); return { want: 0, dir: c.toT }; }
    // wounded, it calls down a rain of shards
    if (m.d2fast && !m.d2rain) {
      m.d2shards = (m.d2shards ?? 1.5) - dt;
      if (m.d2shards <= 0) {
        m.d2shards = 8 + Math.random() * 3; m.d2rain = [];
        const vs = d2Victims(m, m.x, m.y, m.z, 20, 10);
        for (let i = 0; i < 4; i++) { const v = vs[i % Math.max(1, vs.length)] || t, a = Math.random() * TAU, r = i < vs.length ? 0 : 1 + Math.random() * 2.5, x = v.x + Math.cos(a) * r, z = v.z + Math.sin(a) * r; m.d2rain.push({ x, y: d2SurfaceAt(g.world, x, v.y + 1, z) ?? v.y, z, at: m.d2t + 1.2 + i * 0.25 }); }
      }
    }
    // two lances of light
    m.d2lance = (m.d2lance ?? 2.5) - dt;
    if (m.d2lance <= 0 && c.sees && c.dist > 3) {
      m.d2lance = 4 + Math.random(); m.d2lance2 = 0.3;
      d2Shoot(m, [m.x + Math.cos(m.yaw) * 1.6, m.y + 2.6, m.z - Math.sin(m.yaw) * 1.6], t, 22, { dmg: d2Roll(3, 10), kind: 'radiant', tile: 'mana_light', fx: 'crystal_dragon_prism', size: 0.32, knock: 2, sound: 'spell_hit' });
      g.sfx.playAt('spell_zap', m.x, m.y + 2.6, m.z, 30);
    }
    if (m.d2lance2 > 0) { m.d2lance2 -= dt; if (m.d2lance2 <= 0) d2Shoot(m, [m.x - Math.cos(m.yaw) * 1.6, m.y + 2.6, m.z + Math.sin(m.yaw) * 1.6], t, 22, { dmg: d2Roll(3, 10), kind: 'radiant', tile: 'mana_light', fx: 'crystal_dragon_prism', size: 0.32, knock: 2, sound: 'spell_hit' }); }
    d2Melee(m, t, 2.2, 2.2, v => { m._swingSide = -(m._swingSide || 1); d2Hit(m, v, 22, 'piercing', 0, null, { knock: 4 }); g.sfx.playAt('d2_chime', v.x, v.y + 1, v.z, 16); });
    if (c.dist < 3) return { want: m.T.fly * 0.5, dir: c.toT + Math.PI };
    return { want: c.dist > 6 ? m.T.fly : 0, dir: c.toT };
  },
};

// ---- the Plains of Silent Stones ----
D2B.gnoll = {
  range: 26,
  init(m) { if (Math.random() < 0.45 && ITEMS.spear) m.heldItem = 'spear'; },
  think(m, dt, c) {
    const g = m.game;
    if (!c.t || !c.hunting) { m.aiming = false; m.voiceTick(dt, c.dist, 8, 10); return d2Wander(m, dt, 0.7); }
    if (!m._d2yip && c.sees) {   // the cackle that brings the pack
      m._d2yip = true; g.sfx.playAt(m.T.voice || 'raider', m.x, m.y + 1.6, m.z, 30);
      for (const e of g.entities) if (e !== m && e.T && e.T.family === 'gnoll' && e.alive && Math.hypot(e.x - m.x, e.z - m.z) < 16) { e.alertT = 15; e.huntT = 10; }
    }
    m.voiceTick(dt, c.dist, 5, 7);
    const bow = m.heldItem === 'bow';
    m.aiming = !!(bow && c.sees && c.dist > 4 && c.dist < 18);
    if (bow && c.dist > 4) {
      m.shootT = (m.shootT ?? 1 + Math.random()) - dt;
      if (m.aiming && m.shootT <= 0) { m.shootT = 2.2 + Math.random(); m.shootAt(c.t); }
      m.strafeT = (m.strafeT || 0) - dt;
      if (m.strafeT <= 0) { m.strafeT = 1.5 + Math.random() * 2; m.strafe = Math.random() < 0.5 ? -1 : 1; }
      if (!c.sees || c.dist > 14) return d2Chase(m, c.t, c.dist, dt);
      return { want: m.T.speed * 0.45, dir: c.toT + m.strafe * Math.PI / 2 };
    }
    m.aiming = false;
    d2Melee(m, c.t, 1.0, 2.0, t => {
      d2Hit(m, t, m.heldItem === 'spear' ? 6 : 5, 'piercing', 0, null, { knock: 2 });
      // Rampage: a wounded quarry draws a second, wilder blow
      if (!m._d2rampage && d2Bloodied(t)) { m._d2rampage = true; m.attackCd = 0.25; m.d2rageT = 2; g.sfx.playAt(m.T.voice || 'raider', m.x, m.y + 1.6, m.z); }
    });
    return d2Chase(m, c.t, c.dist, dt, 1, 0.9);
  },
};
D2B.gnoll_pack_lord = {
  range: 28,
  think(m, dt, c) {
    const g = m.game;
    if (!c.t || !c.hunting) { m.voiceTick(dt, c.dist, 8, 10); return d2Wander(m, dt, 0.6); }
    m.voiceTick(dt, c.dist, 5, 7);
    // its howl sends the pack into a frenzy
    m.d2howl = (m.d2howl ?? 2) - dt;
    if (m.d2howl <= 0 && c.sees) {
      const pack = g.entities.filter(e => e !== m && e.type === 'gnoll' && e.alive && Math.hypot(e.x - m.x, e.z - m.z) < 14);
      if (pack.length) {
        m.d2howl = 15 + Math.random() * 5; m.swingT = 0.3; m.d2rageT = 4;
        g.sfx.playAt('werewolf', m.x, m.y + 2, m.z, 40);
        spellRing(g, m.x, m.y + 0.1, m.z, 'mana_fire', 1, 30, { speed: 5, life: 0.8, flat: true });
        for (const e of pack) { e.d2rageT = 6; e.huntT = 10; e.alertT = 15; e.attackCd = 0; spellFx(g, e.x, e.y + 1.5, e.z, 'mana_fire', 10, 0.8, { life: 0.5 }); }
        for (const l of g.locals) if (Math.hypot(l.player.x - m.x, l.player.z - m.z) < 30) l.toast('The pack lord howls, and the gnolls fly into a frenzy!', 'warn');
      } else m.d2howl = 4;
    }
    d2Melee(m, c.t, 1.6, 1.6, t => d2Hit(m, t, 8, 'slashing', 0, null, { knock: 3 }));   // the glaive's long reach
    return d2Chase(m, c.t, c.dist, dt, 1, 1.4);
  },
};

const D2_ANKHEG_DIG = {
  speedUnder: 3.2, erupt: 2.2, hUnder: 0.6, hUp: 1.2, upTime: [9, 14], coolUnder: [2, 4], eruptR: 1.8,
  onErupt: (m, v, c) => { d2Hit(m, v, 10, 'slashing', 3, 'acid', { knock: 1 }); d2Toss(v, 5); if (!m.d2grab && v === c.t && d2Grab(m, v, 2.2, 1.0, 0)) d2Say(v, 'The ankheg seizes you in its mandibles!', 'warn'); },
  up(m, dt, c) {
    const g = m.game;
    if (!c.t || !c.hunting) return d2Wander(m, dt, 0.6);
    m.voiceTick(dt, c.dist, 4, 6);
    m.d2cd = (m.d2cd ?? 3) - dt;
    if (m.d2spit > 0) {   // acid spray: a 30-foot line
      m.d2spit -= dt;
      if (m.d2spit < 0.6) { const mo = d2Fwd(m, 1.4, 0.9); d2Breath(m, dt, mo, d2Aim(mo, c.t), D2_ACID_SPRAY); }
      return { want: 0, dir: c.toT };
    }
    if (m.d2cd <= 0 && c.sees && c.dist > 2 && c.dist < 6.5) { m.d2spit = 1.0; m._d2hit = new Set(); m.d2cd = 10 + Math.random() * 6; g.sfx.playAt('hiss', m.x, m.y + 1, m.z, 20); return { want: 0, dir: c.toT }; }
    d2Melee(m, c.t, 1.2, 2.2, t => { d2Hit(m, t, 10, 'slashing', 3, 'acid', { knock: 1.5 }); if (!m.d2grab && Math.random() < 0.4) d2Grab(m, t, 1.6, 1.0, 0); });
    if (m.health < m.maxHealth * 0.4 && !m._d2fled) { m._d2fled = true; m.d2stT = 0; }   // badly hurt: back into the earth
    return d2Chase(m, c.t, c.dist, dt, 1, 1.2);
  },
};
const D2_ACID_SPRAY = { line: true, width: 0.6, len: 6, tiles: ['ankheg_acid', 'ankheg_acid', 'mana_heal'], speed: 12, size: 0.13, rate: 200, onHit: (v, m) => d2SaveHit(m, v, 'dex', 12, [4, 6], 'acid', { knock: 0.5 }) };
D2B.ankheg = { range: 24, dig: D2_ANKHEG_DIG, init(m) { m.d2st = 'under'; m.d2burrowed = true; m.d2emerge = 0; }, think(m, dt, c) { return d2BurrowTick(m, dt, c, D2_ANKHEG_DIG); } };

D2B.giant_scorpion = {
  range: 18,
  think(m, dt, c) {
    const g = m.game;
    if (m.striking > 0) m.striking -= dt;
    if (m.hurtTime > 0) m.d2angry = 20;
    if (m.d2angry > 0) m.d2angry -= dt;
    const angry = c.ally || m.d2angry > 0 || g.env.day < 0.45 || m.lightAt(0.5)[0] < 10;
    if (!c.t || !c.hunting || !angry) return d2Wander(m, dt, 0.6);
    m.voiceTick(dt, c.dist, 4, 6);
    d2Melee(m, c.t, 1.0, 1.1, t => {
      m.d2n = (m.d2n || 0) + 1;
      if (m.d2n % 3 === 0) { m.striking = 0.4; d2Hit(m, t, 7, 'piercing', 11, 'poison', { knock: 2, poison: 5 }); }
      else { d2Hit(m, t, 6, 'bludgeoning', 0, null, { knock: 1 }); if (!m.d2grab && Math.random() < 0.35) d2Grab(m, t, 1.8, 1.4, 0); }
    });
    return d2Chase(m, c.t, c.dist, dt, 1, 1.1);
  },
};

// the griffon circles high, then folds its wings and drops on its prey
D2B.griffon = {
  range: 30, flyer: true,
  think(m, dt, c) {
    const g = m.game;
    if (m.d2dive > 0) m.d2dive -= dt;
    if (!c.ally && (!c.t || !c.hunting)) { const h = d2Prey(m, dt, ['horse', 'donkey', 'hippogriff', 'deer'], 24); if (h) d2Aimed(c, m, h); }   // horse is its favourite meat
    const t = c.t;
    if (!t || !c.hunting) {
      m.d2st = null;
      if (!m.onGround) { m.noGrav = true; m.flyVy = -3; return { want: m.T.speed, dir: m.yaw }; }
      m.noGrav = false; m.voiceTick(dt, c.dist, 9, 12);
      return d2Wander(m, dt, 0.6);
    }
    m.d2st = m.d2st || 'rise';
    m.stT = (m.stT ?? 0) - dt;
    if (m.d2st === 'rise') { d2Fly(m, d2CapAlt(m, t.y + 8), 1.4, 5); if (m.y > t.y + 6 || m.stT < -4) { m.d2st = 'circle'; m.stT = 3 + Math.random() * 2; m.orbit = Math.atan2(m.z - t.z, m.x - t.x); } return { want: m.T.fly * 0.6, dir: m.yaw + 0.5 * dt }; }
    if (m.d2st === 'circle') {
      m.orbit += dt * 0.8;
      const gx = t.x + Math.cos(m.orbit) * 7, gz = t.z + Math.sin(m.orbit) * 7;
      d2Fly(m, d2CapAlt(m, t.y + 8), 1.4, 4);
      if (m.stT <= 0) { m.d2st = 'dive'; m.stT = 3; m.d2dive = 3; g.sfx.playAt('d2_screech', m.x, m.y + 1, m.z, 40); }
      return { want: m.T.fly, dir: heading(m.x, m.z, gx, gz) };
    }
    if (m.d2st === 'dive') {
      m.d2dive = 0.3;
      m.noGrav = true; m.flyVy = clamp((t.y + 0.6 - m.y) * 2.4, -12, 6);
      if (Math.hypot(t.x - m.x, t.y + 0.8 - m.y, t.z - m.z) < 1.8 + m.w && m.attackCd <= 0) {
        m.attackCd = 1.2; m.swingT = 0.3;
        d2Hit(m, t, 8 + d2Roll(1, 8), 'piercing', 0, null, { knock: 4 });
        if (d2Grab(m, t, 1.5, 0.6, -0.4)) d2Say(t, 'The griffon pins you in its talons!', 'warn');
        m.d2st = 'climb'; m.stT = 1.6;
      }
      if (m.stT <= 0) { m.d2st = 'climb'; m.stT = 1.2; }
      return { want: m.T.fly * 1.7, dir: c.toT };
    }
    // climb back up and around again
    d2Fly(m, d2CapAlt(m, t.y + 9), 1.4, 5);
    if (m.stT <= 0) { m.d2st = 'circle'; m.stT = 3 + Math.random() * 3; }
    return { want: m.T.fly, dir: m.yaw };
  },
};

// the hippogriff minds its own business, unless you come too close: then swoop after swoop
D2B.hippogriff = {
  range: 20, flyer: true,
  think(m, dt, c) {
    const g = m.game;
    if (m.hurtTime > 0) m.d2angry = 25;
    if (c.t && c.dist < 6 && c.sees && !c.t.sneaking && !(m.d2angry > 0)) { m.d2angry = 12; g.sfx.playAt('d2_screech', m.x, m.y + 1, m.z, 30); }
    if (m.d2angry > 0) m.d2angry -= dt;
    if (!c.t || !c.hunting || !(m.d2angry > 0 || c.ally)) {
      if (!m.onGround) { m.noGrav = true; m.flyVy = -3; return { want: m.T.speed * 0.6, dir: m.yaw }; }
      m.noGrav = false;
      return d2Wander(m, dt, 0.6);
    }
    m.d2back = (m.d2back || 0) - dt;
    d2Fly(m, d2CapAlt(m, c.t.y + (m.d2back > 0 ? 3 : 0.7)), 1.6, 4);
    if (d2Melee(m, c.t, 1.0, 1.6, t => d2Hit(m, t, 7, 'slashing', 0, null, { knock: 3 }))) { m.d2hits = (m.d2hits || 0) + 1; if (m.d2hits % 2 === 0) m.d2back = 1.6; }
    if (m.d2back > 0) return { want: m.T.fly, dir: c.toT + Math.PI + 0.4 };
    return { want: m.T.fly, dir: c.toT };
  },
};

// the standing stone: dormant until you come close; then it hops after you and makes the ground ring
D2B.stone_guardian = {
  range: 20,
  think(m, dt, c) {
    const g = m.game;
    if (d2StatueTick(m, dt, c, D2_STONE_WAKE)) return { want: 0, dir: m.yaw };
    if (m.d2slamDown > 0) m.d2slamDown -= dt;
    if (!c.t || !c.hunting) { m.d2idle = (m.d2idle || 0) + dt; if (m.d2idle > 18 && m.onGround) { m.d2statue = true; m.d2idle = 0; } return { want: 0, dir: m.yaw }; }
    m.d2idle = 0;
    // the ley pulse: fists up, and down: a ring rolls out across the ground
    m.d2pulse = (m.d2pulse ?? 4) - dt;
    if (m.d2slam > 0) {
      m.d2slam += dt / 0.9;
      if (m.d2slam >= 1) {
        m.d2slam = 0; m.d2slamDown = 0.5;
        m.d2wave = { x: m.x, y: m.y, z: m.z, r: 0.5, max: 6.5, hit: new Set() };
        g.sfx.playAt('explode', m.x, m.y, m.z, 28); g.shake(0.3, m); g.burst(m.x, m.y + 0.2, m.z, d2GroundKey(g, m.x, m.y, m.z), 30, 2);
      }
      return { want: 0, dir: c.toT };
    }
    if (m.d2pulse <= 0 && c.dist < 6 && m.onGround) { m.d2pulse = 9 + Math.random() * 3; m.d2slam = 0.001; g.sfx.playAt('d2_grind', m.x, m.y + 1, m.z, 24); m.d2decal = { x: m.x, y: m.y, z: m.z, sx: 6.5, sz: 6.5, shape: 0, color: [0.3, 1, 0.85, 0.8], end: m.d2t + 1.6, len: 1.6 }; return { want: 0, dir: c.toT }; }
    // it moves in heavy hops
    const moving = c.dist > 1.6;
    m.d2hopT = (m.d2hopT || 0) - dt;
    if (moving && m.onGround && m.d2hopT <= 0) { m.d2hopT = 0.95; m.vy = 4.6; m.d2hopping = true; }
    m.d2hop = m.onGround ? 0 : clamp(0.5 - m.vy / 9.2, 0, 1);
    if (m.d2hopping && m.onGround && m.d2hopT < 0.7) { m.d2hopping = false; g.sfx.playAt('thud', m.x, m.y, m.z, 16); g.burst(m.x, m.y + 0.1, m.z, d2GroundKey(g, m.x, m.y, m.z), 6, 0.6); if (c.dist < 8) g.shake(0.06, m); }
    d2Melee(m, c.t, 1.2, 1.8, t => { m._swingSide = -(m._swingSide || 1); d2Hit(m, t, 13, 'bludgeoning', 0, null, { knock: 4 }); g.sfx.playAt('thud', t.x, t.y + 1, t.z); });
    return { want: moving ? (m.onGround ? m.T.speed * 0.4 : m.T.speed * 1.8) : 0, dir: (c.dist > 2.4 ? m.navDir(c.t.x, c.t.y, c.t.z, dt) : null) ?? c.toT };
  },
};
const D2_STONE_WAKE = { r: 5, sneakR: 3, wake: m => { const g = m.game; g.sfx.playAt('d2_grind', m.x, m.y + 1, m.z, 24); g.burst(m.x, m.y + 0.2, m.z, 'stone', 16, 1); spellSpiral(g, m.x, m.y, m.z, 'mana_heal', 30, { r: 0.9, h: 2.4, turns: 2, life: 0.9 }); } };

// the corrupted beast of the plains: it kills the herds, it charges, it roars a storm of black petals
D2B.plains_beast = {
  range: 30,
  think(m, dt, c) {
    const g = m.game;
    m.d2fast = m.health < m.maxHealth * 0.5;
    if (Math.random() < dt * (m.d2fast ? 6 : 3)) spellSpark(g, m.x + (Math.random() - 0.5) * 1.5, m.y + 2.4 + Math.random(), m.z + (Math.random() - 0.5) * 2, 'plains_beast_petal', { vy: -0.3, vx: (Math.random() - 0.5), life: 2, size: 0.09, flutter: 2 });
    if (!c.ally && (!c.t || !c.hunting)) { const prey = d2Prey(m, dt, ['cow', 'sheep', 'pig', 'goat', 'horse', 'donkey', 'chicken', 'llama', 'mooshroom'], 32); if (prey) d2Aimed(c, m, prey); }
    if (m.d2stun > 0) { m.d2stun -= dt; return { want: 0, dir: m.yaw }; }
    if (!c.t || !c.hunting) { m.voiceTick(dt, c.dist, 8, 12); return d2Wander(m, dt, 0.6); }
    if (c.t.player && !c.ally) d2Announce(m, 'The corrupted beast of the plains bellows, petals bristling!', 48);
    m.voiceTick(dt, c.dist, 5, 7);
    // the charge: it paws the ground, then comes
    if (m.d2paw > 0) {
      m.d2paw -= dt;
      if (Math.random() < dt * 10) g.burst(m.x, m.y + 0.1, m.z, d2GroundKey(g, m.x, m.y, m.z), 3, 0.8);
      if (m.d2paw <= 0) { m.d2chg = 1.6; m.d2chgDir = c.toT; m._d2chgHit = false; g.sfx.playAt('roar', m.x, m.y + 1.5, m.z, 40); }
      return { want: 0, dir: c.toT };
    }
    if (m.d2chg > 0) {
      m.d2chg -= dt;
      if (Math.random() < dt * 15) g.burst(m.x, m.y + 0.1, m.z, d2GroundKey(g, m.x, m.y, m.z), 2, 1);
      if (!m._d2chgHit) for (const v of d2Victims(m, m.x - Math.sin(m.yaw) * 1.2, m.y + 1, m.z - Math.cos(m.yaw) * 1.2, m.w + 0.9, 2)) {
        m._d2chgHit = true; m.d2chg = Math.min(m.d2chg, 0.25);
        d2Hit(m, v, 17, 'piercing', d2Roll(2, 10), 'bludgeoning', { knock: 9 }); d2Toss(v, 7);
        if (!d2Save(v, 'str', 16)) d2Prone(v);
        g.sfx.playAt('thud', v.x, v.y + 1, v.z, 20); g.shake(0.25, m);
        break;
      }
      if (m.hitWall && m.d2chg < 1.35) { m.d2chg = 0; m.d2stun = 1.5; g.shake(0.3, m); g.sfx.playAt('thud', m.x, m.y + 1, m.z, 20); }   // into a wall: dazed
      return { want: m.T.speed * 2.4, dir: m.d2chgDir };
    }
    m.d2chgCd = (m.d2chgCd ?? 3) - dt;
    if (m.d2chgCd <= 0 && c.sees && c.dist > 5 && c.dist < 16 && Math.abs(c.dyp) < 2) {
      m.d2chgCd = (m.d2fast ? 6 : 9) + Math.random() * 3; m.d2paw = 0.9;
      m.d2decal = { x: m.x, y: m.y, z: m.z, yaw: c.toT + Math.PI, sx: 1.2, sz: Math.min(16, c.dist + 3), shape: 1, color: [0.85, 0.2, 0.9, 0.85], end: m.d2t + 0.9, len: 0.9 };
      g.sfx.playAt('lion_angry', m.x, m.y + 1.5, m.z, 30);
      return { want: 0, dir: c.toT };
    }
    // the Bloom's roar: fear, and a storm of petals
    m.d2roar = (m.d2roar ?? 6) - dt;
    if (m.d2roarT > 0) { m.d2roarT -= dt; return { want: 0, dir: c.toT }; }
    if (m.d2roar <= 0 && c.dist < 7) {
      m.d2roar = (m.d2fast ? 12 : 17) + Math.random() * 3; m.d2roarT = 0.9;
      g.sfx.playAt('roar', m.x, m.y + 1.5, m.z, 50);
      for (let i = 0; i < 60; i++) { const a = Math.random() * TAU, s = 3 + Math.random() * 5; spellSpark(g, m.x, m.y + 2, m.z, 'plains_beast_petal', { vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: Math.random() * 2, life: 1.2, size: 0.12, flutter: 3 }); }
      d2Burst(m, m.x, m.y + 1, m.z, 6.5, { onHit: v => { if (!d2Save(v, 'wis', 15)) d2Fear(m, v, 6); d2SaveHit(m, v, 'con', 15, [3, 6], 'necrotic', { knock: 1 }); } });
      return { want: 0, dir: c.toT };
    }
    d2Melee(m, c.t, 1.4, 1.8, t => { m.d2n = (m.d2n || 0) + 1; if (m.d2n % 2) d2Hit(m, t, 17, 'piercing', 0, null, { knock: 4 }); else d2Hit(m, t, 13, 'slashing', 0, null, { knock: 2 }); });
    return d2Chase(m, c.t, c.dist, dt, 1, 1.4);
  },
};

// ---- Redrock Haven ----
const D2_PURPLE_UP = {
  reach: 4.5, bite: [22, 'piercing'], cd: 2.4, knock: 2,
  onBite(m, t) {   // Swallow
    if (m.d2swallow || !t.player || !d2Free(t)) return;
    if (d2Save(t, 'str', 19)) { d2Float(t, 'Wrenched free!'); return; }
    m.d2swallow = { t, dmg: 0, end: m.d2t + 9, acid: 1 };
    m.d2stT = Math.max(m.d2stT, 4);
    d2Say(t, 'The purple worm swallows you whole! Hurt it to be spat out.', 'warn');
  },
  fx(m, dt, c) {   // the tail stinger, bursting up out of the sand beside you
    const g = m.game, t = c.t;
    m.d2stingCd = (m.d2stingCd ?? 3) - dt;
    if (t && c.hunting && m.d2stingCd <= 0 && !m.d2stingAt && c.dist < 14) {
      m.d2stingCd = 7 + Math.random() * 4;
      const y = d2SurfaceAt(g.world, t.x, t.y + 1, t.z) ?? t.y;
      m.d2stingAt = [t.x, y, t.z, m.d2t + 1.0];
      m.d2decal = { x: t.x, y, z: t.z, sx: 1.5, sz: 1.5, shape: 0, color: [0.7, 0.2, 0.9, 0.85], end: m.d2t + 1.0, len: 1.0 };
      g.sfx.playAt('d2_rumble', t.x, t.y, t.z, 20);
    }
    const S = m.d2stingAt;
    if (S) {
      if (m.d2t < S[3]) { if (Math.random() < dt * 15) g.burst(S[0] + (Math.random() - 0.5), S[1] + 0.1, S[2] + (Math.random() - 0.5), d2GroundKey(g, S[0], S[1], S[2]), 2, 0.8); return; }
      m.d2stingAt = null;
      g.burst(S[0], S[1] + 0.4, S[2], d2GroundKey(g, S[0], S[1], S[2]), 30, 2.2);
      for (let i = 0; i < 12; i++) spellSpark(g, S[0], S[1] + i * 0.25, S[2], i % 2 ? 'mana_arcane' : 'ankheg_acid', { vy: 2, life: 0.5, size: 0.14 });
      g.sfx.playAt('dragon_bite', S[0], S[1], S[2], 24);
      d2Burst(m, S[0], S[1] + 0.5, S[2], 1.5, { onHit: v => { d2Hit(m, v, 16, 'piercing', 35, 'poison', { knock: 2, poison: 6 }); d2Toss(v, 5); } });
    }
  },
};
const D2_PURPLE_DIG = { speedUnder: 3.8, erupt: 3.2, hUnder: 0.9, hUp: 7.5, upTime: [8, 12], coolUnder: [3, 5], eruptR: 3, eruptDmg: 22, shake: 0.3, eruptShake: 0.6, up: (m, dt, c) => d2WormUp(m, dt, c, D2_PURPLE_UP) };
D2B.purple_worm = { range: 36, dig: D2_PURPLE_DIG, init(m) { m.d2st = 'under'; m.d2burrowed = true; m.d2emerge = 0; }, think(m, dt, c) { return d2BurrowTick(m, dt, c, D2_PURPLE_DIG); } };
const D2_SAND_UP = { reach: 2.6, bite: [14, 'piercing'], cd: 1.8 };
const D2_SAND_DIG = { speedUnder: 2.8, erupt: 2.0, hUnder: 0.7, hUp: 3.4, upTime: [4, 7], coolUnder: [2, 4], eruptR: 1.8, eruptDmg: 14, shake: 0.1, eruptShake: 0.3, up: (m, dt, c) => d2WormUp(m, dt, c, D2_SAND_UP) };
D2B.sandworm = { range: 28, dig: D2_SAND_DIG, init(m) { m.d2st = 'under'; m.d2burrowed = true; m.d2emerge = 0; }, think(m, dt, c) { return d2BurrowTick(m, dt, c, D2_SAND_DIG); } };

// ---- Skyreach Roost and the peaks ----
D2B.wyvern = d2DragonBrain({ cd: 1.4, sting: [11, 24], circle: 9, alt: 7, wake: null });

D2B.harpy = {
  range: 26, flyer: true,
  think(m, dt, c) {
    const g = m.game, t = c.t;
    const floor = d2FloorY(m, 20);
    if (m.d2sing > 0) {   // the luring song
      m.d2sing -= dt;
      d2Fly(m, d2CapAlt(m, floor + 1.6), 1.2, 2);
      if (Math.random() < dt * 6) spellSpark(g, m.x + (Math.random() - 0.5) * 0.6, m.y + 1.7, m.z + (Math.random() - 0.5) * 0.6, 'note_particle', { vy: 0.8, vx: (Math.random() - 0.5), life: 1.4, size: 0.12 });
      for (const v of m.d2lured || []) {
        if (v.dead || v.remove) continue;
        const d = Math.hypot(m.x - v.x, m.z - v.z);
        if (d < 1.6) continue;
        const k = 14 * dt / Math.max(1, d);
        if (v.player) { const P = v.player; P.vx += (m.x - v.x) * k; P.vz += (m.z - v.z) * k; P.slow = Math.max(P.slow || 0, 0.4); }
        else if (v instanceof Mob) { v.vx += (m.x - v.x) * k; v.vz += (m.z - v.z) * k; }
        if (Math.random() < dt * 2) spellSpark(g, v.x, v.y + 2, v.z, 'note_particle', { vy: 0.6, life: 1, size: 0.1 });
      }
      if (m.hurtTime > 0.3 && m.d2sing > 0.8) m.d2sing = 0.8;   // a blow breaks the song
      if (t) d2Melee(m, t, 1.0, 2.0, v => d2Hit(m, v, 6, 'slashing', 0, null, { knock: 0.5 }));
      if (m.d2sing <= 0) { m.d2lured = null; m.d2songCd = 14 + Math.random() * 6; }
      return { want: 0, dir: t ? c.toT : m.yaw };
    }
    if (!t || !c.hunting) {
      if (m.y - floor > 0.4) { d2Fly(m, floor, 1, 2.5); return d2Wander(m, dt, 0.6); }
      m.noGrav = false; m.voiceTick(dt, c.dist, 8, 10);
      return d2Wander(m, dt, 0.5);
    }
    m.d2songCd = (m.d2songCd ?? 1) - dt;
    if (m.d2songCd <= 0 && c.dist < 24 && !c.ally) {
      m.d2sing = 6; m.d2lured = [];
      g.sfx.playAt('d2_song', m.x, m.y + 1.5, m.z, 48);
      for (const v of d2Victims(m, m.x, m.y, m.z, 24, 12)) {
        if (v instanceof Mob && !(v.T.humanoid || v.npc)) continue;   // humanoids and giants hear it
        if ((v._d2songImmune || 0) > g.time) continue;
        if (!d2Save(v, 'wis', 11)) { m.d2lured.push(v); d2Say(v, 'A haunting song draws you toward the harpy...', 'warn'); }
        else { v._d2songImmune = g.time + 60; d2Float(v, 'Resisted the song'); }
      }
      return { want: 0, dir: c.toT };
    }
    m.d2back = (m.d2back || 0) - dt;
    d2Fly(m, d2CapAlt(m, t.y + (m.d2back > 0 ? 3 : 0.8)), 1.6, 3.5);
    if (d2Melee(m, t, 0.9, 2.2, v => d2Hit(m, v, 6, 'slashing', 0, null, { knock: 1.5 }))) m.d2back = 1.4;
    if (m.d2back > 0) return { want: m.T.fly, dir: c.toT + Math.PI + 0.6 };
    return { want: c.dist < 0.8 ? 0 : m.T.fly, dir: c.toT };
  },
};

// the roc: soars, stoops, snatches you up in its talons, carries you high, and lets go
D2B.roc = {
  range: 48, flyer: true,
  think(m, dt, c) {
    const g = m.game, t = c.t;
    m.noGrav = true; m.d2glide = false;
    const floor = d2FloorY(m, 40);
    if (m.d2grab) {
      m.d2carry -= dt; m.flyVy = 6;
      if (m.d2carry <= 0 || m.y - floor > 18) {
        const G = m.d2grab; m.d2grab = null;
        if (G && G.t) { d2Say(G.t, 'The roc lets you fall!', 'warn'); if (G.t.player) G.t.player.fallStart = G.t.player.y; }
        m.d2st = 'climb'; m.stT = 1;
      }
      return { want: m.T.fly * 0.6, dir: m.yaw + dt * 0.5 };
    }
    if (!t || !c.hunting) { d2Fly(m, d2CapAlt(m, floor + 16), 0.8, 3); m.d2st = null; return { want: m.T.fly * 0.6, dir: m.yaw + dt * 0.25 }; }
    if (!c.ally && c.dist < 40) { if (!m._d2ann) g.sfx.playAt('d2_screech', m.x, m.y, m.z, 80); d2Announce(m, 'A roc\'s shadow sweeps over you!', 60); }
    m.d2st = m.d2st || 'circle';
    m.stT = (m.stT ?? 4) - dt;
    if (m.d2st === 'circle') {
      m.orbit = (m.orbit ?? Math.atan2(m.z - t.z, m.x - t.x)) + dt * 0.35;
      const gx = t.x + Math.cos(m.orbit) * 14, gz = t.z + Math.sin(m.orbit) * 14;
      d2Fly(m, d2CapAlt(m, t.y + 14), 1, 4);
      if ((m._d2cry = (m._d2cry || 0) - dt) <= 0) { m._d2cry = 6 + Math.random() * 4; g.sfx.playAt('d2_screech', m.x, m.y, m.z, 60); }
      if (m.stT <= 0) { m.d2st = 'dive'; m.stT = 4.5; }
      return { want: m.T.fly, dir: heading(m.x, m.z, gx, gz) };
    }
    if (m.d2st === 'dive') {
      m.d2glide = true;
      m.flyVy = clamp((t.y + 1.2 - m.y) * 2.2, -14, 6);
      if (Math.hypot(t.x - m.x, t.y + 1 - m.y, t.z - m.z) < 2.6 + m.w * 0.5 && m.attackCd <= 0) {
        m.attackCd = 2; m.swingT = 0.3;
        if (d2Free(t) && (t.player || (t instanceof Mob && t.w <= 0.8 && !t.T.boss))) {
          d2Hit(m, t, 23, 'slashing', 0, null, { knock: 0 });
          if (d2Grab(m, t, 6, 0, -2.1, 'below')) { m.d2carry = 2.5; d2Say(t, 'The roc snatches you up in its talons!', 'warn'); }
        } else d2Hit(m, t, 28, 'piercing', 0, null, { knock: 6 });
        g.sfx.playAt('dragon_bite', m.x, m.y, m.z, 30);
        m.d2st = 'climb'; m.stT = 1.5;
      }
      if (m.stT <= 0) { m.d2st = 'climb'; m.stT = 1.5; }
      return { want: m.T.fly * 1.5, dir: c.toT };
    }
    m.flyVy = 6;
    if (m.stT <= 0) { m.d2st = 'circle'; m.stT = 5 + Math.random() * 3; }
    return { want: m.T.fly, dir: m.yaw };
  },
};

D2B.air_elemental = {
  range: 24, flyer: true,
  think(m, dt, c) {
    const g = m.game;
    m.noGrav = true;
    if (Math.random() < dt * 10) { const a = Math.random() * TAU, r = 0.6 + Math.random() * 0.8; spellSpark(g, m.x + Math.cos(a) * r, m.y + Math.random() * 2.2, m.z + Math.sin(a) * r, Math.random() < 0.7 ? 'cloud_puff' : 'ash_flake', { vx: -Math.sin(a) * 3, vz: Math.cos(a) * 3, vy: 0.8, life: 0.6, size: 0.12 }); }
    if ((m._d2wind = (m._d2wind || 0) - dt) <= 0) { m._d2wind = 3 + Math.random() * 2; if (c.dist < 20) g.sfx.playAt('d2_wind', m.x, m.y + 1, m.z, 20); }
    const floor = d2FloorY(m, 16);
    if (!c.t || !c.hunting) { d2Fly(m, floor + 0.4 + Math.sin(m.d2t) * 0.2, 1.2, 2.5); return d2Wander(m, dt, 1); }
    d2Fly(m, d2CapAlt(m, Math.max(floor + 0.3, c.t.y + 0.2)), 1.6, 4);
    m.d2ww = (m.d2ww ?? 3) - dt;
    if (m.d2rush > 0) {   // the whirlwind
      m.d2rush -= dt;
      if (Math.random() < dt * 30) { const a = Math.random() * TAU; spellSpark(g, m.x + Math.cos(a) * 1.2, m.y + Math.random() * 2.5, m.z + Math.sin(a) * 1.2, 'cloud_puff', { vx: -Math.sin(a) * 6, vz: Math.cos(a) * 6, vy: 2, life: 0.5, size: 0.2 }); }
      if (c.dist < 1.3 + m.w) {
        m.d2rush = 0;
        g.sfx.playAt('d2_wind', m.x, m.y + 1, m.z, 30);
        d2SaveHit(m, c.t, 'str', 13, [4, 10, 2], 'thunder', { knock: 0, fail: v => { d2Push(m, v, 10, 9); d2Prone(v); } });
      }
      return { want: m.T.fly * 1.7, dir: c.toT };
    }
    if (m.d2ww <= 0 && c.dist < 7 && c.sees) { m.d2ww = 8 + Math.random() * 4; m.d2rush = 1.4; g.sfx.playAt('d2_wind', m.x, m.y + 1, m.z, 30); }
    d2Melee(m, c.t, 1.6, 1.6, t => { m._swingSide = -(m._swingSide || 1); d2Hit(m, t, 14, 'thunder', 0, null, { knock: 4 }); });
    return d2Chase(m, c.t, c.dist, dt, 1, 1.2);
  },
};

for (const [k, B] of Object.entries(D2B)) {
  const f = function (dt, p, dist, dyp, toPlayer) { return d2Think(this, B, dt, p, dist, dyp, false); };
  f.d2 = B;
  MONSTER_AI[k] = f;
}

// ---- hooks ----------------------------------------------------------------------------------------------------
{
  // summoned or tamed: its own brain, fighting its summoner's foes (rather than a pet's plain follow-and-bite)
  const baseCtl = Mob.prototype.controlAI;
  Mob.prototype.controlAI = function (dt, p, dist, dyp, toPlayer) {
    if (this.T && this.T.d2 && !this.riddenBy && !this.ghost && (this.owner || this.dndSummonBy)) { const f = MONSTER_AI[this.type]; if (f && f.d2) return d2Think(this, f.d2, dt, null, 999, 0, true); }
    return baseCtl ? baseCtl.call(this, dt, p, dist, dyp, toPlayer) : null;
  };
  // underground, nothing reaches it; a statue struck wakes; a magma worm burns what hits it; a rust monster's
  // antennae flick at the blade that strikes it; a worm with you inside spits you out when hurt enough
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    if (!this.T || !this.T.d2) return baseHurt.call(this, amount, src);
    if (this.d2burrowed && src.type !== 'void') return 0;
    const dealt = baseHurt.call(this, amount, src);
    if (dealt > 0 && !this.ghost) {
      try {
        if (this.d2statue) this.d2woke = true;
        if (this.d2swallow) this.d2swallow.dmg += dealt;
        const a = src.attacker, melee = a && !(a instanceof Mob) && src.type !== 'arrow' && src.type !== 'projectile' && src.type !== 'magic' && Math.hypot(a.x - this.x, a.z - this.z) < 3.5;
        if (melee && this.type === 'magma_worm' && this.alive) { d2Hit(this, a, d2Roll(1, 6), 'fire', 0, null, { magic: true, knock: 1, ignite: 2 }); }
        if (melee && this.type === 'rust_monster' && this.alive && Math.random() < 0.5 && a.player && a.player.inv && d2Metal(a.player.inv.held && a.player.inv.held.id)) d2RustTouch(this, a);
      } catch (e) { console.warn('d2 hurt', e); }
    }
    return dealt;
  };
  // the mephit bursts; whatever it held goes free; a boss's fall is told
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    if (this.T && this.T.d2 && !this.ghost) {
      try {
        if (this.d2swallow) d2Spit(this);
        this.d2grab = null;
        if (this.type === 'magma_mephit') {
          const g = this.game;
          spellFx(g, this.x, this.y + 0.5, this.z, 'mana_fire', 30, 2.5, { life: 0.5, size: 0.12 });
          g.burst(this.x, this.y + 0.5, this.z, 'magma_mephit_skin', 16, 1.5);
          g.sfx.playAt('explode', this.x, this.y, this.z, 20);
          d2Burst(this, this.x, this.y + 0.5, this.z, 1.6, { onHit: v => d2SaveHit(this, v, 'dex', 11, [2, 6], 'fire', { ignite: 2 }) });
        }
        if (this.T.boss && !this.tamed) for (const l of this.game.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 64) l.toast(`${String(this.T.label).replace(/^the /, 'The ').replace(/^an? /, 'The ')} is slain!`, 'epic');
      } catch (e) { console.warn('d2 death', e); }
    }
    return baseDie.call(this, src);
  };
  // ground markings ahead of a big attack
  const baseDecal = Mob.prototype.telegraphDecal;
  Mob.prototype.telegraphDecal = function () {
    const d = this.T && this.T.d2 ? this.d2decal : null;
    if (d) { if ((this.d2t || 0) > d.end) this.d2decal = null; else return Object.assign({}, d, { progress: clamp(1 - (d.end - (this.d2t || 0)) / d.len, 0, 1) }); }
    return baseDecal ? baseDecal.call(this) : null;
  };
  // what a guest's game needs to draw them right: underground, statue, flying, the dragons' state
  const ST = ['sleep', 'takeoff', 'circle', 'breath', 'dive', 'climb', 'land', 'gbreath'];
  const baseSnap = Mob.prototype.snap;
  Mob.prototype.snap = function () {
    const s = baseSnap.call(this);
    if (this.T && this.T.d2) s.d2 = [(this.d2burrowed ? 1 : 0) | (this.d2statue ? 2 : 0) | (this.noGrav ? 4 : 0) | (this.d2awake ? 8 : 0) | (this.breathT > 0 || this.d2breath > 0 ? 16 : 0) | (this.d2spearOut ? 32 : 0) | (this.d2sing > 0 ? 64 : 0) | (this.d2grab ? 128 : 0),
      Math.round((this.d2emerge ?? 1) * 20), Math.max(0, ST.indexOf(this.dstate)), Math.round((this.d2strike || 0) * 20)];
    return s;
  };
  const baseApply = Mob.prototype.applySnap;
  Mob.prototype.applySnap = function (o) {
    baseApply.call(this, o);
    if (o.d2) {
      const f = o.d2[0];
      this.d2burrowed = !!(f & 1); this.d2statue = !!(f & 2); this.noGrav = !!(f & 4); this.d2awake = !!(f & 8); this.breathT = f & 16 ? 0.3 : 0; this.d2breath = this.breathT;
      this.d2spearOut = !!(f & 32); this.d2sing = f & 64 ? 1 : 0; this.d2grab = f & 128 ? { ghost: true } : null;
      this.d2emerge = o.d2[1] / 20; this.dstate = ST[o.d2[2]]; this.d2strike = o.d2[3] / 20;
      if (this.T && this.T.flyer) this.onGround = !this.noGrav;
    }
  };
}
// the crystal dragon's light: a white glare that fades
{
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseUpd.call(this, dt, inp);
    if (this.d2flashT > 0 || this._d2flashEl) {
      try {
        this.d2flashT = Math.max(0, (this.d2flashT || 0) - dt);
        if (this.el) {
          let fx = this._d2flashEl;
          if (!fx) { fx = this._d2flashEl = document.createElement('div'); fx.className = 'fx fx-glare'; Object.assign(fx.style, { position: 'absolute', inset: '0', pointerEvents: 'none', background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.97) 20%, rgba(240,230,255,0.9) 55%, rgba(220,200,255,0.75) 100%)', opacity: '0' }); this.el.prepend(fx); }
          const k = Math.min(1, this.d2flashT / 1.5);
          fx.style.opacity = (k * 0.95).toFixed(2); fx.hidden = k <= 0.01;
        }
      } catch (e) { /* only a glare */ }
    }
    return r;
  };
}
