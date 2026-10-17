// ---------------------------------------------------------------------------
// render/mobtex.js — fur, feathers, scales and faces for the 0.8 animals, in
// the soft-noise, dark-eyed style of the early Doku / Faithful packs, plus
// the icons for what they drop (fish, ink, scutes, horns...).
// Every face is a 16x16 picture stretched over the front of the head, so
// eyes sit high and wide and the muzzle sits low, like the classic mobs.
// ---------------------------------------------------------------------------

function paintMobTiles() {
  const H = hexRGB;
  const tone = (p, c, k = 0.12) => shade(H(c), 1 + (p.rand() - 0.5) * k);
  // fur or hide: base noise, flecks, a pale belly along the bottom, stripes, spots or bands
  const fur = (name, base, o = {}) => addTile(name, p => {
    p.noise(H(base), o.v ?? 0.16);
    if (o.fleck) p.speck(H(o.fleck), o.fleckN ?? 0.12);
    if (o.belly) for (let x = 0; x < 16; x++) for (let y = 16 - (o.bellyH || 4); y < 16; y++) p.set(x, y, tone(p, o.belly, 0.1));
    if (o.stripes) for (let x = 1; x < 16; x += o.stripes[1]) for (let y = 0; y < 13; y++) if (p.rand() < 0.85) p.set(x + ((y >> 2) & 1), y, tone(p, o.stripes[0]));
    if (o.spots) for (let i = 0; i < o.spots[1]; i++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 13), o.spots[2] || 1, H(o.spots[0]), 0.1);
    if (o.bands) for (let y = o.bands[2] || 1; y < 16; y += o.bands[1]) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, o.bands[0]));
    if (o.edge) for (let x = 0; x < 16; x++) { p.set(x, 15, tone(p, o.edge)); if (p.rand() < 0.5) p.set(x, 14, tone(p, o.edge)); }
  });
  // a face: eyes high and wide, then a muzzle, nose and mouth low down
  const face = (name, base, o = {}) => addTile(name, p => {
    p.noise(H(base), o.v ?? 0.12);
    if (o.fleck) p.speck(H(o.fleck), 0.08);
    if (o.blaze) for (let y = 0; y < 16; y++) { const w = y < 6 ? 1 : 2; for (let x = 8 - w; x < 8 + w; x++) p.set(x, y, tone(p, o.blaze, 0.08)); }
    if (o.mask) for (let y = o.mask[1]; y < o.mask[2]; y++) for (let x = 0; x < 16; x++) if (!(x > 6 && x < 9 && y > o.mask[1])) p.set(x, y, tone(p, o.mask[0]));
    if (o.patches) for (const cx of [4, 11]) { p.blob(cx, (o.eyeY ?? 6) + 1, 2, H(o.patches), 0.08); p.set(cx, (o.eyeY ?? 6) + 3, tone(p, o.patches)); }
    if (o.cheeks) for (let y = 8; y < 16; y++) for (let x = 0; x < 16; x++) if (x < 4 || x > 11 || y > 12) p.set(x, y, tone(p, o.cheeks, 0.08));
    if (o.muzzle) for (let y = o.muzzleY ?? 10; y < 16; y++) for (let x = o.muzzleX ?? 4; x < 16 - (o.muzzleX ?? 4); x++) p.set(x, y, tone(p, o.muzzle, 0.08));
    const ey = o.eyeY ?? 6, ew = o.eyeW ?? 2, eh = o.eyeH ?? 1;
    for (const ex of (o.eyeX || [3, 11])) for (let i = 0; i < ew; i++) for (let j = 0; j < eh; j++) {
      p.set(ex + i, ey + j, H(o.eye || '#141010'));
      if (o.eyeWhite) p.set(ex < 8 ? ex - 1 : ex + ew, ey + j, H(o.eyeWhite));
    }
    if (o.shine) for (const ex of (o.eyeX || [3, 11])) p.set(ex, ey, H(o.shine));
    if (o.nose) { const ny = o.noseY ?? 12; for (let x = 7; x < 9; x++) { p.set(x, ny, H(o.nose)); p.set(x, ny + 1, H(o.nose)); } if (o.noseWide) { p.set(6, ny, H(o.nose)); p.set(9, ny, H(o.nose)); } }
    if (o.nostrils) { const ny = o.noseY ?? 12; p.set(5, ny, H(o.nostrils)); p.set(10, ny, H(o.nostrils)); }
    if (o.mouth) for (let x = 6; x < 10; x++) p.set(x, o.mouthY ?? 14, H(o.mouth));
    if (o.art) p.art(o.art, Object.fromEntries(Object.entries(o.pal || {}).map(([k, v]) => [k, H(v)])));
  });
  const plain = (name, c, v = 0.1) => addTile(name, p => p.noise(H(c), v));
  const hex = (rgb) => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
  // feathers: rows of soft scallops
  const feather = (name, base, o = {}) => addTile(name, p => {
    p.noise(H(base), o.v ?? 0.1);
    for (let y = 2; y < 16; y += 3) for (let x = (y % 2) * 2; x < 16; x += 4) { p.set(x, y, tone(p, o.edge || base, 0.1)); p.set(x + 1, y, tone(p, o.edge || base, 0.1)); }
    if (o.tip) for (let x = 0; x < 16; x++) { p.set(x, 15, tone(p, o.tip)); p.set(x, 14, tone(p, o.tip)); }
    if (o.bar) for (let x = 0; x < 16; x++) for (let y = o.bar[1]; y < o.bar[1] + 2; y++) p.set(x, y, tone(p, o.bar[0]));
  });
  // scales: offset rows of little arcs, a lighter belly
  const scales = (name, base, o = {}) => addTile(name, p => {
    p.noise(H(base), 0.1);
    for (let y = 1; y < 16; y += 3) for (let x = (y % 2) * 2; x < 16; x += 4) p.set(x, y, tone(p, o.dark || base, 0.1)), p.set(x + 1, y + 1, tone(p, o.dark || base, 0.1));
    if (o.back) for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) p.set(x, y, tone(p, o.back));
    if (o.belly) for (let x = 0; x < 16; x++) for (let y = 12; y < 16; y++) p.set(x, y, tone(p, o.belly, 0.06));
    if (o.stripe) for (let x = 0; x < 16; x++) for (let y = o.stripe[1]; y < o.stripe[1] + o.stripe[2]; y++) p.set(x, y, tone(p, o.stripe[0]));
    if (o.spots) for (let i = 0; i < o.spots[1]; i++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), tone(p, o.spots[0]));
  });

  // ---- horses, donkeys, llamas, camels ----
  for (const [k, c, d, blaze] of [['chestnut', '#8a5430', '#5a3018', '#e8dcc8'], ['black', '#2a2422', '#141010', '#d8d0c4'], ['white', '#e8e4dc', '#b8b0a4', null], ['dun', '#c8a46a', '#8a6a3a', '#f0e4c8']]) {
    fur('horse_' + k, c, { v: 0.12, fleck: d, fleckN: 0.05 });
    face('horse_' + k + '_face', c, { blaze, eyeY: 2, eyeX: [1, 13], muzzle: k === 'white' ? '#c8bcb0' : '#3a2a22', muzzleY: 11, muzzleX: 3, nostrils: '#141010', noseY: 13 });
    fur('horse_' + k + '_mane', d, { v: 0.2, stripes: [hex(shade(H(d), 0.7)), 2] });
  }
  plain('hoof', '#3a3028', 0.15);
  fur('donkey_hide', '#8a7e70', { v: 0.14, belly: '#c8c0b0', bellyH: 3 });
  face('donkey_face', '#8a7e70', { eyeY: 2, eyeX: [1, 13], muzzle: '#d8d0c4', muzzleY: 10, muzzleX: 3, nostrils: '#2a2420', noseY: 13 });
  fur('donkey_mane', '#3a3028', { v: 0.2 });
  fur('donkey_leg', '#8a7e70', { v: 0.14 });
  for (const [k, c, d] of [['cream', '#e8dcc0', '#c8b898'], ['brown', '#8a6040', '#5a3a24'], ['white', '#f4f0e8', '#d8d0c4'], ['gray', '#9a9890', '#6a6860']]) {
    addTile('llama_' + k, p => { pWool(p, c); p.speck(H(d), 0.06); });
    face('llama_' + k + '_face', c, { eyeY: 3, eyeX: [2, 12], muzzle: d, muzzleY: 10, muzzleX: 3, nose: '#2a2420', noseY: 12, mouth: '#4a3a30', mouthY: 14 });
  }
  fur('camel_hide', '#c8a060', { v: 0.12, fleck: '#a88040', fleckN: 0.08 });
  face('camel_face', '#c8a060', { eyeY: 2, eyeX: [1, 13], muzzle: '#a88a58', muzzleY: 10, muzzleX: 3, nostrils: '#4a3420', noseY: 12, mouth: '#5a4028', mouthY: 14 });
  fur('camel_hump', '#b8904e', { v: 0.18 });

  // ---- dogs, foxes and their kin ----
  fur('wolf_fur', '#c8c4bc', { v: 0.18, fleck: '#8a8680', belly: '#e8e4dc', bellyH: 3 });
  fur('wolf_back', '#9a948a', { v: 0.22, fleck: '#5a5650' });
  fur('wolf_leg', '#c8c4bc', { v: 0.16, fleck: '#8a8680' });
  face('wolf_face', '#c8c4bc', { eyeY: 5, eyeX: [3, 11], eye: '#1a1410', eyeWhite: '#e8e4dc', cheeks: '#e8e4dc' });
  face('wolf_snout', '#d8d4cc', { eyeX: [], nose: '#141010', noseY: 2, noseWide: true });
  fur('fox_fur', '#e07a2a', { v: 0.16, fleck: '#b85a18', belly: '#f4ece0', bellyH: 4 });
  face('fox_face', '#e07a2a', { eyeY: 5, eyeX: [2, 12], cheeks: '#f4ece0', eye: '#1a1008' });
  face('fox_snout', '#f4ece0', { eyeX: [], nose: '#141010', noseY: 1 });
  fur('fox_tail', '#e07a2a', { v: 0.2, belly: '#f8f4ec', bellyH: 4 });
  fur('fox_ear', '#1e1410', { v: 0.1 });
  fur('snow_fox_fur', '#f2f0ea', { v: 0.08, fleck: '#d8d4cc' });
  face('snow_fox_face', '#f2f0ea', { eyeY: 5, eyeX: [2, 12], eye: '#1a1008' });
  face('snow_fox_snout', '#ffffff', { eyeX: [], nose: '#141010', noseY: 1 });
  fur('snow_fox_tail', '#f2f0ea', { v: 0.1, belly: '#ffffff', bellyH: 3 });
  fur('raccoon_fur', '#7a7470', { v: 0.2, fleck: '#5a5450', belly: '#a8a29c', bellyH: 3 });
  face('raccoon_face', '#b8b2aa', { mask: ['#1e1a18', 4, 8], eyeY: 5, eyeX: [3, 11], eye: '#e8e0d0', eyeW: 1 });
  face('raccoon_snout', '#d8d2ca', { eyeX: [], nose: '#141010', noseY: 1 });
  fur('raccoon_tail', '#8a847e', { bands: ['#1e1a18', 4, 1], v: 0.12 });

  // ---- cats ----
  fur('cat_tabby', '#c89050', { v: 0.14, stripes: ['#8a5a2a', 4], belly: '#e8d0a8', bellyH: 3 });
  face('cat_tabby_face', '#c89050', { eyeY: 6, eyeX: [3, 11], eye: '#2a8a2a', eyeWhite: '#141010', muzzle: '#f0dcc0', muzzleY: 10, muzzleX: 5, nose: '#d87a7a', noseY: 10, art: ['.....k....k.....', '................', '.......kk.......'], pal: { k: '#8a5a2a' } });
  fur('cat_black', '#24201e', { v: 0.12, fleck: '#3a3430', fleckN: 0.06 });
  face('cat_black_face', '#24201e', { eyeY: 6, eyeX: [3, 11], eye: '#e8d82a', eyeWhite: '#141010', nose: '#3a2a2a', noseY: 11 });
  fur('ocelot_fur', '#e8c060', { v: 0.12, spots: ['#5a3a18', 14, 1], belly: '#f4e8c8', bellyH: 3 });
  face('ocelot_face', '#e8c060', { eyeY: 6, eyeX: [3, 11], eye: '#3a8a2a', eyeWhite: '#141010', muzzle: '#f4e8c8', muzzleY: 10, muzzleX: 5, nose: '#c87a6a', noseY: 10 });

  // ---- bears and pandas ----
  fur('polar_bear_fur', '#f0f0e8', { v: 0.08, fleck: '#d8d8d0', fleckN: 0.1 });
  face('polar_bear_face', '#f0f0e8', { eyeY: 6, eyeX: [3, 11] });
  face('polar_bear_snout', '#f8f8f2', { eyeX: [], nose: '#141010', noseY: 1, noseWide: true });
  fur('brown_bear_fur', '#6a4428', { v: 0.18, fleck: '#4a2e18' });
  face('brown_bear_face', '#6a4428', { eyeY: 6, eyeX: [3, 11] });
  face('brown_bear_snout', '#a87a50', { eyeX: [], nose: '#141010', noseY: 1, noseWide: true });
  fur('panda_white', '#f2f0ea', { v: 0.06 });
  fur('panda_black', '#24201e', { v: 0.1 });
  face('panda_face', '#f2f0ea', { patches: '#24201e', eyeY: 5, eyeX: [4, 11], eye: '#e8e0d0', eyeW: 1 });
  face('panda_snout', '#f8f6f0', { eyeX: [], nose: '#141010', noseY: 1, noseWide: true });

  // ---- goats, armadillos, mice ----
  addTile('goat_fur', p => pWool(p, '#e8e4dc'));
  face('goat_face', '#e8e4dc', { eyeY: 4, eyeX: [2, 12], eye: '#5a4a2a', eyeWhite: '#e8d8a0', muzzle: '#d8d0c4', muzzleY: 11, muzzleX: 4, nostrils: '#5a5048', noseY: 12 });
  plain('goat_horn', '#c8b898', 0.12);
  fur('armadillo_shell', '#a8706a', { v: 0.1, bands: ['#7a4a46', 3, 1], fleck: '#c89088', fleckN: 0.05 });
  fur('armadillo_skin', '#d8a898', { v: 0.1 });
  face('armadillo_face', '#d8a898', { eyeY: 5, eyeX: [4, 11], eyeW: 1, nose: '#7a4a46', noseY: 12 });
  fur('mouse_fur', '#8a8078', { v: 0.14, belly: '#c8c0b8', bellyH: 3 });
  face('mouse_face', '#8a8078', { eyeY: 6, eyeX: [3, 11], shine: '#ffffff', nose: '#e8a0a0', noseY: 12 });
  plain('mouse_ear', '#e8b0b0', 0.08);
  plain('pink_skin', '#e8a8a8', 0.08);

  // ---- birds ----
  feather('turkey_feather', '#5a3a24', { edge: '#8a6a3a', tip: '#2a1a10' });
  addTile('turkey_fan', p => { p.noise(H('#5a3a24'), 0.12); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const r = Math.hypot(x - 7.5, y - 16); if (r > 13) p.set(x, y, tone(p, '#e8d8b8')); else if (r > 11) p.set(x, y, tone(p, '#1e140c')); else if ((Math.atan2(y - 16, x - 7.5) * 8 | 0) % 2) p.set(x, y, tone(p, '#7a5230')); } });
  plain('turkey_head', '#6a8ac8', 0.1);
  face('turkey_face', '#6a8ac8', { eyeY: 4, eyeX: [3, 11], eyeW: 1, art: ['', '', '', '', '', '', '', '', '', '......rrrr......', '......rrrr......', '.......rr.......', '.......rr.......'], pal: { r: '#d8202a' } });
  feather('duck_feather', '#f4f2ec', { edge: '#d8d4c8' });
  face('duck_face', '#f4f2ec', { eyeY: 5, eyeX: [2, 13], eyeW: 1 });
  plain('duck_bill', '#f0a020', 0.08);
  feather('mallard_body', '#8a7a68', { edge: '#5a4a3a', bar: ['#3a52a8', 9] });
  addTile('mallard_head', p => { p.noise(H('#1e6a3a'), 0.14); for (let x = 0; x < 16; x++) { p.set(x, 15, H('#f4f2ec')); p.set(x, 14, H('#f4f2ec')); } });
  face('mallard_face', '#1e6a3a', { eyeY: 5, eyeX: [2, 13], eyeW: 1, art: ['', '', '', '', '', '', '', '', '', '', '', '', '', '', 'wwwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwww'], pal: { w: '#f4f2ec' } });
  plain('mallard_bill', '#d8c02a', 0.08);
  for (const [k, c, e, w] of [['red', '#d82020', '#2a5ad8', '#f0c020'], ['green', '#3ab82a', '#e8d82a', '#2a7ad8'], ['blue', '#2a7ad8', '#e8d82a', '#f0f0f0'], ['gray', '#a8a8a8', '#e8e8e8', '#d82020']]) {
    feather('parrot_' + k, c, { edge: hex(shade(H(c), 0.75)), tip: e });
    face('parrot_' + k + '_face', w, { eyeY: 5, eyeX: [2, 12], eyeWhite: '#ffffff', eyeW: 1 });
  }
  plain('parrot_beak', '#3a3a3a', 0.1);
  feather('moa_feather', '#5a7088', { edge: '#3a4a60', v: 0.12 });
  face('moa_face', '#5a7088', { eyeY: 6, eyeX: [2, 12], eye: '#e8a82a', eyeWhite: '#141010', eyeW: 1 });
  plain('moa_beak', '#d8c890', 0.08);
  plain('moa_leg', '#c8a858', 0.1);
  addTile('aerbunny_fur', p => { pWool(p, '#f4f4fa'); p.speck(H('#dce4f4'), 0.08); });
  face('aerbunny_face', '#f4f4fa', { eyeY: 7, eyeX: [3, 11], eye: '#c82a5a', nose: '#f0a0b8', noseY: 11 });

  // ---- bats and bees ----
  fur('bat_fur', '#3a2e28', { v: 0.2, fleck: '#2a201c' });
  addTile('bat_wing', p => { p.noise(H('#2a201c'), 0.15); for (let i = 0; i < 16; i += 5) for (let y = 0; y < 16; y++) p.set(i, y, tone(p, '#4a3a32')); });
  face('bat_face', '#3a2e28', { eyeY: 6, eyeX: [3, 11], eye: '#141010', shine: '#ffffff', nose: '#5a4038', noseY: 10 });
  addTile('bee_body', p => { p.noise(H('#f0c020'), 0.1); for (let x = 0; x < 16; x++) for (const y0 of [3, 9]) for (let y = y0; y < y0 + 3; y++) p.set(x, y, tone(p, '#2a1e10')); });
  addTile('bee_side', p => { p.noise(H('#f0c020'), 0.1); for (let y = 0; y < 16; y++) for (const x0 of [4, 10]) for (let x = x0; x < x0 + 3; x++) p.set(x, y, tone(p, '#2a1e10')); });
  face('bee_face', '#2a1e10', { eyeY: 4, eyeX: [2, 11], eyeW: 3, eyeH: 3, eye: '#141010', shine: '#4a4a4a' });
  addTile('bee_wing', p => { for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) p.set(x, y, tone(p, '#d8ecf8', 0.05), 140); for (let x = 1; x < 15; x++) p.set(x, 8, H('#a8c0d0'), 180); });
  plain('bee_sting', '#141010', 0.05);

  // ---- water life ----
  addTile('squid_skin', p => { p.noise(H('#2a3a5a'), 0.14); p.speck(H('#3a5a8a'), 0.12); });
  face('squid_face', '#2a3a5a', { eyeY: 6, eyeX: [2, 12], eye: '#e8e8e8', eyeH: 2, eyeW: 2, art: ['', '', '', '', '', '', '...k........k...', '...k........k...'], pal: { k: '#141010' } });
  addTile('glow_squid_skin', p => { p.noise(H('#1a6a6a'), 0.14); for (let i = 0; i < 18; i++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#7af8e8')); });
  face('glow_squid_face', '#1a6a6a', { eyeY: 6, eyeX: [2, 12], eye: '#b8fff4', eyeH: 2, eyeW: 2, art: ['', '', '', '', '', '', '...k........k...', '...k........k...'], pal: { k: '#0a2a2a' } });
  scales('cod_scales', '#a8946a', { dark: '#7a6848', belly: '#e8dcc0', spots: ['#5a4a30', 10] });
  face('cod_face', '#a8946a', { eyeY: 5, eyeX: [2, 13], eyeW: 1, eye: '#141010', eyeWhite: '#e8e8e8' });
  plain('cod_fin', '#c8b48a', 0.1);
  scales('salmon_scales', '#a83a2a', { dark: '#802a1e', back: '#4a5a3a', belly: '#e8b0a0' });
  face('salmon_face', '#a83a2a', { eyeY: 5, eyeX: [2, 13], eyeW: 1, eye: '#141010', eyeWhite: '#e8e8e8' });
  plain('salmon_fin', '#6a3a2a', 0.1);
  for (const [k, c, s] of [['orange', '#f07a1a', '#f8f8f8'], ['blue', '#2a7ad8', '#f8e82a'], ['pink', '#e86aa8', '#f8f8f8']]) {
    scales('tropical_' + k, c, { stripe: [s, 6, 3] });
    face('tropical_' + k + '_face', c, { eyeY: 5, eyeX: [2, 13], eyeW: 1, eyeWhite: '#f8f8f8' });
  }
  addTile('puffer_skin', p => { p.noise(H('#e8c040'), 0.1); p.speck(H('#a88a20'), 0.1); for (let x = 0; x < 16; x++) for (let y = 12; y < 16; y++) p.set(x, y, tone(p, '#f4ecd0')); });
  face('puffer_face', '#e8c040', { eyeY: 4, eyeX: [2, 12], eyeW: 2, eye: '#141010', eyeWhite: '#f4ecd0', mouth: '#8a5a20', mouthY: 12 });
  plain('puffer_spine', '#f4ecd0', 0.05);
  fur('dolphin_skin', '#7a8a9a', { v: 0.08, belly: '#d8dde4', bellyH: 6 });
  face('dolphin_face', '#7a8a9a', { eyeY: 7, eyeX: [1, 14], eyeW: 1, muzzle: '#d8dde4', muzzleY: 12, muzzleX: 2 });
  addTile('turtle_shell', p => {
    p.noise(H('#3a6a2a'), 0.12);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const gx = (x + (((y / 5) | 0) % 2) * 3) % 6, gy = y % 5; if (gx === 0 || gy === 0) p.set(x, y, tone(p, '#24441a')); else if (gx === 3 && gy === 2) p.set(x, y, tone(p, '#5a8a3a')); }
  });
  fur('turtle_skin', '#5a9a5a', { v: 0.12, spots: ['#7ab86a', 8, 1] });
  face('turtle_face', '#5a9a5a', { eyeY: 6, eyeX: [2, 12], eyeW: 2, mouth: '#2a4a2a', mouthY: 12 });
  for (const [k, c, g] of [['pink', '#f0a8c0', '#d8507a'], ['blue', '#7a8af0', '#4a4ac8'], ['gold', '#f0c83a', '#c88a1a'], ['wild', '#8a6a4a', '#5a3a2a']]) {
    fur('axolotl_' + k, c, { v: 0.1, spots: [g, 5, 0] });
    face('axolotl_' + k + '_face', c, { eyeY: 5, eyeX: [1, 13], eyeW: 2, mouth: g, mouthY: 11 });
    plain('axolotl_' + k + '_gill', g, 0.12);
  }
  fur('frog_skin', '#6a9a3a', { v: 0.12, spots: ['#4a7a2a', 8, 1], belly: '#e8e0a0', bellyH: 3 });
  addTile('frog_eye', p => { p.noise(H('#6a9a3a'), 0.1); for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) p.set(x, y, tone(p, '#e8d82a', 0.06)); for (let y = 6; y < 10; y++) for (let x = 5; x < 11; x++) p.set(x, y, H('#141010')); });
  face('frog_face', '#6a9a3a', { eyeY: 2, eyeX: [1, 12], eyeW: 3, eyeH: 2, eye: '#141010', eyeWhite: '#e8d82a', mouth: '#3a5a1a', mouthY: 11 });
}

// Glowing eyes for spiders, and the fuseling's new look: a thorny, root-legged pod of dark bark
// split by ember cracks, slit eyes that burn, a jaw that drops open when it hisses, and a crown
// of drooping fronds.
function paintMonsterTiles() {
  const H = hexRGB;
  const tone = (p, c, k = 0.12) => shade(H(c), 1 + (p.rand() - 0.5) * k);
  addTile('spider_eyes', p => p.art(['................', '................', '................', '................', '..RR...RR...RR..', '..RL...RL...RL..', '................', '...rr......rr...',
    '...rr......rr...', '................', '................', '................', '................', '................', '................', '................'], { R: H('#ff2a1a'), L: H('#ffb0a0'), r: H('#e01e12') }));
  addTile('fuse_bark', p => {
    p.noise(H('#3e4a26'), 0.22); p.speck(H('#2a3218'), 0.25); p.speck(H('#5a6a32'), 0.08);
    for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) if (p.rand() < 0.5) p.set(x, y, tone(p, '#2a3218'));
  });
  addTile('fuse_cracks', p => {
    for (let k = 0; k < 3; k++) {
      let x = 2 + Math.floor(p.rand() * 12), y = 0;
      for (let i = 0; i < 18; i++) { p.set(x & 15, y, H(i % 4 ? '#ff7a1a' : '#ffd060')); y++; if (y > 15) break; x += p.rand() < 0.33 ? 1 : p.rand() < 0.5 ? -1 : 0; }
    }
  });
  addTile('fuse_face2', p => {
    p.noise(H('#3e4a26'), 0.2); p.speck(H('#2a3218'), 0.2);
    p.art(['................', '................', '................', '.kkkkk....kkkkk.', '.kkkkkk..kkkkkk.', '..kkkkk..kkkkk..', '................', '................',
      '................', '.......kk.......', '......kkkk......', '................', '................', '................', '................', '................'], { k: H('#120e08') });
  });
  addTile('fuse_slits', p => p.art(['................', '................', '................', '................', '..OYYO....OYYO..', '...OO......OO...', '................', '................',
    '................', '................', '................', '................', '................', '................', '................', '................'], { O: H('#ff7a1a'), Y: H('#ffe08a') }));
  addTile('fuse_maw', p => { p.noise(H('#2a3218'), 0.2); for (let x = 1; x < 15; x += 2) { p.set(x, 0, H('#e8d8b0')); p.set(x, 1, H('#c8b890')); } for (let y = 2; y < 16; y++) for (let x = 2; x < 14; x++) p.set(x, y, tone(p, '#5a1a08')); });
  addTile('fuse_leaf', p => { p.noise(H('#2e4a1e'), 0.2); for (let y = 0; y < 16; y++) p.set(7, y, H('#1e3212')); p.set(8, 2, H('#ff7a1a')); });
  addTile('fuse_root', p => { p.noise(H('#3a2e1e'), 0.2); p.speck(H('#5a4a2e'), 0.12); });
  addTile('fuse_thorn', p => p.noise(H('#a89a6a'), 0.15));
}

// Rain, snow and splashes.
function paintWeatherTiles() {
  const H = hexRGB;
  // the whole tile is the streak: the particle's width is the streak's width
  addTile('rain_streak', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (y > 1 && y < 15 && (x + y * 7) % 11 !== 0) p.set(x, y, shade(H('#a8bcd8'), 0.9 + p.rand() * 0.2), 180); });
  addTile('snowflake', p => { for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) if (Math.hypot(x - 7.5, y - 7.5) < 3) p.set(x, y, H('#ffffff')); });
  addTile('puddle', p => {
    const r = p.rand, cx = 7.5 + (r() - 0.5) * 2, cy = 7.5 + (r() - 0.5) * 2;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot((x - cx) * 0.9, y - cy) + Math.sin(x * 1.3 + y * 0.7) * 0.9;
      if (d > 7.4) continue;
      const edge = d > 6.2;
      p.set(x, y, shade(H(edge ? '#3e5a7a' : '#4a6e98'), 0.92 + r() * 0.14), edge ? 170 : 200);
    }
    for (const [x, y] of [[5, 5], [6, 5], [7, 6], [10, 9], [11, 9]]) p.set(x, y, H('#c8dcf4'), 220);
  });
  // a torch's flame: a crisp little tongue of fire, white-hot at the core
  addTile('torch_flame', p => p.art(['................', '................', '.......Y........', '.......YY.......', '......YOY.......', '......YOOY......', '.....YOWOY......', '.....OOWWOY.....',
    '....YOWWWOY.....', '....OOWWWWO.....', '....OWWWWWO.....', '.....OWWWO......', '......OOO.......', '................', '................', '................'], { Y: H('#ffc83a'), O: H('#ff8a1a'), W: H('#fff4c8') }));
  addTile('smoke_puff', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) + Math.sin(x * 2.1 + y) * 0.6; if (d < 6.5) p.set(x, y, shade(H('#6a6a6a'), 0.85 + p.rand() * 0.3), 200); } });
  addTile('smoke_dark', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) + Math.sin(x * 1.7 + y * 1.3) * 0.7; if (d < 7) p.set(x, y, shade(H('#3a3634'), 0.85 + p.rand() * 0.3), 210); } });
  addTile('rain_splash', p => { for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, H('#c0d4ec')); });
}

// Capes: a woven outside with a trim, a darker lining, and an icon. Sixteen colours and three
// special ones (ember, frost, royal).
const CAPE_SPECIAL = { ember: ['#7a1a0e', '#ff8a1a'], frost: ['#5ab4e0', '#f0fbff'], royal: ['#4a1a7a', '#f2cc3e'] };
function paintCapeTiles() {
  const H = hexRGB, tone = (p, c, k = 0.12) => shade(c, 1 + (p.rand() - 0.5) * k);
  const make = (key, base, trim, deco) => {
    const b = H(base), t = H(trim);
    addTile(key, p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, ((x + y * 3) % 4 === 0) ? shade(b, 0.9) : b));
      for (let i = 0; i < 16; i++) { p.set(i, 0, tone(p, t)); p.set(0, i, tone(p, t)); p.set(15, i, tone(p, t)); p.set(i, 15, tone(p, t)); }
      if (deco) deco(p, b, t);
    });
    addTile(key + '_in', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, shade(b, 0.62))); });
    addItem(key + '_icon', p => {
      p.art(['................', '...tttttttttt...', '..tBBBBBBBBBBt..', '..tBbBBBBBBbBt..', '..tBBBBBBBBBBt..', '..tBBBBBBBBBBt..', '.tBBBBBBBBBBBBt.', '.tBBBbBBBBbBBBt.', '.tBBBBBBBBBBBBt.', '.tBBBBBBBBBBBBt.',
        '.tBBBBBBBBBBBBt.', 'tBBBBBBBBBBBBBBt', 'tBBbBBBBBBBBbBBt', 'tBBBBBBBBBBBBBBt', 'tttttttttttttttt', '................'], { t: t, B: b, b: shade(b, 0.85) });
      if (deco) { const q = new Px(3); deco(q, b, t); for (let y = 3; y < 14; y++) for (let x = 2; x < 14; x++) if (q.alpha(x, y) && p.alpha(x, y) && !(q.get(x, y)[0] === b[0] && q.get(x, y)[1] === b[1])) { const c = q.get(x, y); if (c[3] > 0 && (c[0] !== 0 || c[1] !== 0 || c[2] !== 0)) p.set(x, y, [c[0], c[1], c[2]]); } }
    });
  };
  for (const [c, , hex] of COLORS) make(c + '_cape', hex, hex2(shade(H(hex), 0.6)));
  make('ember_cape', CAPE_SPECIAL.ember[0], '#ffb050', (p, b, t) => { for (let x = 0; x < 16; x++) { const h = 4 + Math.round(Math.abs(Math.sin(x * 1.3)) * 5); for (let y = 15 - h; y < 15; y++) p.set(x, y, y > 12 ? H('#ffd060') : H('#ff6a1a')); } });
  make('frost_cape', CAPE_SPECIAL.frost[0], '#f0fbff', (p) => { for (const [cx, cy] of [[5, 5], [11, 9], [6, 12]]) { for (let k = -2; k <= 2; k++) { p.set(cx + k, cy, H('#ffffff')); p.set(cx, cy + k, H('#ffffff')); } p.set(cx - 1, cy - 1, H('#d8f4ff')); p.set(cx + 1, cy + 1, H('#d8f4ff')); } });
  make('royal_cape', CAPE_SPECIAL.royal[0], '#f2cc3e', (p) => { for (let y = 4; y < 11; y++) for (let x = 6; x < 10; x++) if (Math.abs(x - 7.5) + Math.abs(y - 7) < 3.6) p.set(x, y, H('#f2cc3e')); p.set(7, 7, H('#e84a5a')); p.set(8, 7, H('#e84a5a')); });
}
function hex2(rgb) { return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join(''); }

// Icons for what the new animals drop.
function paintMobItems() {
  const H = hexRGB;
  const I = (name, rows, pal) => addItem(name, p => p.art(rows, Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, H(v)]))));
  const FISH = ['................', '................', '................', '..........dd....', '.....ddddDDd....', '...dDDDDDDDDd.dd', '..dDWkDDDDDDDdDd', '..dDDDDDDDDDDDd.', '..dLLLLLLLLLLDDd', '...dLLLLLLLLd.dd', '.....ddddddd....', '................', '................', '................', '................', '................'];
  I('cod', FISH, { d: '#5a4a30', D: '#a8946a', L: '#e8dcc0', W: '#ffffff', k: '#141010' });
  I('cooked_cod', FISH, { d: '#5a3a20', D: '#c8945a', L: '#f0d4a0', W: '#ffffff', k: '#141010' });
  I('salmon', FISH, { d: '#5a2018', D: '#c84a3a', L: '#f0b0a0', W: '#ffffff', k: '#141010' });
  I('cooked_salmon', FISH, { d: '#5a2a18', D: '#d8784a', L: '#f8c8a0', W: '#ffffff', k: '#141010' });
  I('tropical_fish', FISH, { d: '#8a3a0a', D: '#f07a1a', L: '#f8f8f8', W: '#ffffff', k: '#141010' });
  I('pufferfish', ['................', '................', '....s..s..s.....', '.....dddddd.....', '..sdDDDDDDDDd.s.', '...dDWkDDDDDDd..', '.sdDDDDDDDDDDDs.', '..dDDDDDDDDDDDd.', '.sdLLLLLLLLLLLds', '..dLLLmmmLLLLLd.', '...dLLLLLLLLLd..', '..s.dddddddd.s..', '......s..s......', '................', '................', '................'],
    { d: '#8a6a10', D: '#e8c040', L: '#f4ecd0', W: '#ffffff', k: '#141010', s: '#f4ecd0', m: '#8a5a20' });
  const SAC = ['................', '................', '................', '......dd........', '.....dDDd.......', '....dDDDDd......', '...dDDLDDDd.....', '...dDLLDDDd.....', '...dDDDDDDd.....', '...dDDDDDDd.....', '....dDDDDd......', '.....dddd.......', '................', '................', '................', '................'];
  I('ink_sac', SAC, { d: '#0a0a14', D: '#24243a', L: '#5a5a7a' });
  I('glow_ink_sac', SAC, { d: '#0a3a3a', D: '#1aa8a0', L: '#a8fff0' });
  I('turtle_scute', ['................', '................', '................', '.....dddddd.....', '....dGGgGGGd....', '...dGGgggGGGd...', '...dGgGGGgGGd...', '...dGGGGGGGGd...', '....dGGgGGGd....', '.....dddddd.....', '................', '................', '................', '................', '................', '................'],
    { d: '#24441a', G: '#4a8a3a', g: '#7ab86a' });
  I('goat_horn', ['................', '................', '.........dd.....', '........dHHd....', '.......dHHd.....', '......dHHd......', '.....dHHHd......', '....dHHHd.......', '...dHHHd........', '...dHHd.........', '...dLLd.........', '....dd..........', '................', '................', '................', '................'],
    { d: '#5a4a30', H: '#c8b898', L: '#e8dcc0' });
  I('spider_eye', ['................', '................', '................', '.....dddddd.....', '....dRRRRRRd....', '...dRRrrRRRRd...', '...dRrkkrRRRd...', '...dRrkkrRLRd...', '...dRRrrRRRRd...', '....dRRRRRRd....', '.....dddddd.....', '................', '................', '................', '................', '................'],
    { d: '#3a0a10', R: '#a82a3a', r: '#d84a5a', k: '#141010', L: '#f0a0a8' });
  I('rotten_flesh', ['................', '................', '................', '.....ddd........', '...ddRRRdd......', '..dRRgRRRRd.....', '..dRgggRRRRd....', '...dRRRRgRRd....', '....dRRRgggRd...', '.....dRRRRRd....', '......dddd......', '................', '................', '................', '................', '................'],
    { d: '#3a1a10', R: '#a8603a', g: '#6a8a3a' });
  I('rabbit_foot', ['................', '................', '................', '......ddd.......', '.....dFFFd......', '.....dFFFd......', '.....dFFFd......', '.....dFFFd......', '....dFFFFFd.....', '....dFfFfFd.....', '....dddddd......', '................', '................', '................', '................', '................'],
    { d: '#5a4a3a', F: '#c8b8a0', f: '#8a7a68' });
}
