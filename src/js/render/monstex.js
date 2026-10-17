// ---------------------------------------------------------------------------
// render/monstex.js — 0.8.3: the monsters' skins and bodies.
// Husks, the drowned, strays, cave spiders, bog witches, stone mites, wraiths,
// cinder wisps, magma slimes, marauders, werewolves, ogres, crocodiles,
// sharks, snakes, scorpions, and the big cats (lions, tigers, snow leopards,
// panthers). Original looks throughout: where the classic game has a creature
// of the same name, ours is drawn its own way.
// ---------------------------------------------------------------------------

function paintMonsterTiles083() {
  const H = hexRGB;
  const T = (name, f) => addTile(name, f);
  const tone = (p, c, k = 0.14) => shade(H(c), 1 + (p.rand() - 0.5) * k);
  const fur = (p, base, dark, light, streak = 0.25) => { p.noise(H(base), 0.2); p.speck(H(dark), streak); p.speck(H(light), 0.08); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.15) p.set(x, y, tone(p, dark)); };
  const face = (p, rows, pal) => p.art(rows, pal);
  const blank = '................';
  const eyesOnly = (rows, pal) => (p) => face(p, rows, pal);   // a see-through overlay (glowing eyes)

  // ---- husk: a ghoul dried out in the desert sun, wrapped in rags ----
  T('husk_skin', p => { p.noise(H('#9a8a62'), 0.18); p.speck(H('#7a6a46'), 0.2); for (let k = 0; k < 4; k++) { let x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 8); for (let i = 0; i < 6; i++) { p.set(x & 15, y, H('#5e5036')); y++; x += p.rand() < 0.5 ? 1 : -1; } } });
  T('husk_face', p => { p.noise(H('#9a8a62'), 0.16); face(p, [blank, blank, blank, blank, '..kkk....kkk....', '..kok....kok....', '..kkk....kkk....', blank, '.......kk.......', 'wwwwwwwwwwwwwwww', 'wWwwWwwwWwwWwwWw', 'wwwwwwwwwwwwwwww', blank, blank, blank, blank], { k: H('#2a2014'), o: H('#c8a040'), w: H('#c8b896'), W: H('#a89878') }); });
  T('husk_wrap', p => { p.noise(H('#b8a684'), 0.16); for (let y = 0; y < 16; y += 3) for (let x = 0; x < 16; x++) p.set(x, (y + (x >> 2)) & 15, tone(p, '#8a7a5a')); p.speck(H('#6a5a3e'), 0.06); });
  // ---- drowned: swollen, blue-green, weed-hung, eyes like deep-sea lamps ----
  T('drowned_skin', p => { p.noise(H('#4a7a72'), 0.2); p.speck(H('#2e5a52'), 0.2); p.speck(H('#7ab0a0'), 0.06); for (let k = 0; k < 5; k++) { const x = Math.floor(p.rand() * 16); for (let y = 0; y < 3 + Math.floor(p.rand() * 6); y++) p.set(x, y, tone(p, '#2e6a2a')); } });
  T('drowned_face', p => { p.noise(H('#4a7a72'), 0.18); face(p, [blank, blank, blank, blank, '..kkk....kkk....', '..k.k....k.k....', '..kkk....kkk....', blank, blank, '....kkkkkkk.....', '....k.k.k.k.....', blank, '.g.....g....g...', '.g.....g....g...', blank, blank], { k: H('#14242a'), g: H('#2e6a2a') }); });
  T('drowned_eyes', eyesOnly([blank, blank, blank, blank, blank, '...c......c.....', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { c: H('#7affe8') }));
  T('drowned_rags', p => { p.noise(H('#3a4a5a'), 0.22); for (let y = 10; y < 16; y++) for (let x = 0; x < 16; x++) if (p.rand() < (y - 9) / 7) p.set(x, y, [0, 0, 0], 0); for (let k = 0; k < 6; k++) { const x = Math.floor(p.rand() * 16); for (let y = 0; y < 8; y++) if (p.rand() < 0.7) p.set(x, y, tone(p, '#2e6a2a')); } });
  // ---- stray: frost-bitten bones under a ragged fur mantle ----
  T('stray_bone', p => { p.noise(H('#c8d4e0'), 0.12); p.speck(H('#9aaac0'), 0.12); p.speck(H('#ffffff'), 0.05); });
  T('stray_head', p => { p.noise(H('#c8d4e0'), 0.12); p.speck(H('#e8f4ff'), 0.12); });
  T('stray_face', p => { p.noise(H('#c8d4e0'), 0.12); face(p, [blank, 'f.f..f.f..f.f...', blank, blank, '..kkk....kkk....', '..kbk....kbk....', '..kkk....kkk....', blank, '.......kk.......', blank, '...k.k.k.k.k....', '...kkkkkkkkk....', blank, blank, blank, blank], { k: H('#1a2232'), b: H('#6ab8ff'), f: H('#ffffff') }); });
  T('stray_cloak', p => { fur(p, '#6a6058', '#4a4038', '#8a8070'); for (let y = 12; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 3 === 0) p.set(x, y, [0, 0, 0], 0); for (let x = 0; x < 16; x++) if (p.rand() < 0.5) p.set(x, 0, H('#e8f4ff')); });
  // ---- cave spider: smaller, slate-blue, with a pale mark on its back ----
  T('cave_spider_fur', p => { fur(p, '#2a3a4a', '#16222e', '#3e5468', 0.3); });
  T('cave_spider_back', p => { fur(p, '#2a3a4a', '#16222e', '#3e5468', 0.3); for (let y = 5; y < 11; y++) for (let x = 6; x < 10; x++) if (Math.abs(x - 7.5) + Math.abs(y - 8) < 3.2) p.set(x, y, tone(p, '#a8c8d8')); });
  T('cave_spider_face', p => { fur(p, '#2a3a4a', '#16222e', '#3e5468', 0.3); for (let x = 5; x < 11; x++) { p.set(x, 13, H('#a8c8d8')); } });
  // ---- bog witch: a hooded crone of the swamps, moss-cloaked, herbs at her belt ----
  T('witch_skin', p => { p.noise(H('#a89a7a'), 0.14); p.speck(H('#8a7a5a'), 0.15); });
  T('witch_face', p => { p.noise(H('#a89a7a'), 0.14); face(p, [blank, blank, blank, '..hhhh...hhhh...', blank, '..kyk....kyk....', blank, '.......nn.......', '.......nnN......', '.......nn.......', '.....kkkkkk.....', blank, '......w..w......', '......w..w......', blank, blank], { k: H('#2a1e14'), y: H('#e8d040'), n: H('#8a7458'), N: H('#5a8a3a'), h: H('#5a4a3a'), w: H('#d8d0c0') }); });
  T('witch_robe', p => { p.noise(H('#3a4a2e'), 0.2); p.speck(H('#26321e'), 0.2); p.speck(H('#5a6a3a'), 0.1); for (let y = 0; y < 16; y++) if (y % 5 === 0) for (let x = 0; x < 16; x++) if (p.rand() < 0.6) p.set(x, y, tone(p, '#5a4a2a')); });
  T('witch_hood', p => { p.noise(H('#2e3a24'), 0.2); p.speck(H('#1e2818'), 0.25); for (let x = 0; x < 16; x++) if (p.rand() < 0.4) p.set(x, 15, H('#4a6a2a')); });
  T('witch_herb', p => { for (let k = 0; k < 4; k++) { const x = 2 + k * 3; for (let y = 0; y < 10; y++) p.set(x, y, tone(p, k % 2 ? '#6a9a3a' : '#9a6a3a')); p.set(x + 1, 3, H('#c8a040')); p.set(x - 1, 5, tone(p, '#4a7a2a')); } });
  // ---- stone mite: a little segmented burrower the colour of the rock it hides in ----
  T('mite_shell', p => { p.noise(H('#7a7a80'), 0.2); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#a8a8b0')); p.set(x, 15, H('#4a4a50')); } p.speck(H('#c8c8d8'), 0.06); });
  T('mite_head', p => { p.noise(H('#6a6a70'), 0.2); p.set(4, 6, H('#1a1a1a')); p.set(11, 6, H('#1a1a1a')); for (let x = 6; x < 10; x++) p.set(x, 12, H('#2a2a2a')); });
  // ---- wraith: a hanging shroud with nothing inside but two cold lights ----
  T('wraith_cloak', p => { p.noise(H('#3a3a48'), 0.22); p.speck(H('#22222e'), 0.25); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (y > 9 && p.rand() < (y - 9) / 9) p.set(x, y, [0, 0, 0], 0); for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) if (p.alpha(x, y) && p.rand() < 0.3) p.set(x, y, tone(p, '#26263a')); });
  T('wraith_hood', p => { p.noise(H('#34344a'), 0.2); p.speck(H('#1e1e2c'), 0.2); });
  T('wraith_face', p => { p.fill(H('#08080e')); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#34344a')); p.set(x, 1, H('#2a2a3c')); p.set(0, x, H('#34344a')); p.set(15, x, H('#34344a')); } });
  T('wraith_eyes', eyesOnly([blank, blank, blank, blank, blank, blank, '...cc....cc.....', '...cC....cC.....', blank, blank, blank, blank, blank, blank, blank, blank], { c: H('#b8e8ff'), C: H('#ffffff') }));
  T('wraith_hand', p => { p.noise(H('#9aa0b0'), 0.12); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (p.rand() < 0.15) p.set(x, y, tone(p, '#6a7080')); });
  // ---- cinder wisp: a cage of charred rods around a burning heart (the Ember Depths) ----
  T('wisp_core', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); p.set(x, y, mix(H('#fff2a0'), H('#ff5a1a'), clamp(d / 9 + (p.rand() - 0.5) * 0.2, 0, 1))); } });
  T('wisp_rod', p => { p.noise(H('#2a1e1a'), 0.25); for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#ff7a2a')); });
  T('wisp_face', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, mix(H('#fff2a0'), H('#ff7a1a'), clamp(Math.hypot(x - 7.5, y - 7.5) / 9, 0, 1))); face(p, [blank, blank, blank, blank, '...kk.....kk....', '...kk.....kk....', blank, blank, blank, '.....kkkkk......', blank, blank, blank, blank, blank, blank], { k: H('#5a1a08') }); });
  // ---- magma slime: a crust of black rock over a molten heart ----
  T('magma_crust', p => { p.noise(H('#3a1e14'), 0.25); for (let k = 0; k < 4; k++) { let x = Math.floor(p.rand() * 16), y = 0; for (let i = 0; i < 18 && y < 16; i++) { p.set(x & 15, y, H(i % 3 ? '#ff7a1a' : '#ffc040')); y++; x += p.rand() < 0.4 ? 1 : p.rand() < 0.5 ? -1 : 0; } } });
  T('magma_core', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, mix(H('#ffe080'), H('#e84a10'), clamp(Math.hypot(x - 7.5, y - 7.5) / 10 + (p.rand() - 0.5) * 0.15, 0, 1))); });
  T('magma_face', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, mix(H('#ffe080'), H('#e84a10'), clamp(Math.hypot(x - 7.5, y - 7.5) / 10, 0, 1))); face(p, [blank, blank, blank, blank, '..kkk....kkk....', '..kkk....kkk....', blank, blank, blank, '....kkkkkkk.....', '.....k...k......', blank, blank, blank, blank, blank], { k: H('#3a0e04') }); });
  // ---- marauder: hooded raider in patched leather, a scarf across the face ----
  T('raider_skin', p => { p.noise(H('#a87a5a'), 0.14); p.speck(H('#8a5e40'), 0.12); });
  T('raider_face', p => { p.noise(H('#3a3028'), 0.18); face(p, [blank, blank, blank, 'ssssssssssssssss', '.kkkk....kkkk...', '.kwbk....kwbk...', 'ssssssssssssssss', 'rrrrrrrrrrrrrrrr', 'rRrrRrrRrrRrrRrr', 'rrrrrrrrrrrrrrrr', 'rrRrrrRrrrRrrrRr', 'rrrrrrrrrrrrrrrr', blank, blank, blank, blank], { s: H('#a87a5a'), k: H('#2a1e14'), w: H('#e8e0d0'), b: H('#3a2a1a'), r: H('#7a2a22'), R: H('#5a1a14') }); });
  T('raider_hood', p => { p.noise(H('#3a3028'), 0.2); p.speck(H('#2a2018'), 0.25); for (let x = 0; x < 16; x++) p.set(x, 15, H('#2a2018')); });
  T('raider_leather', p => { p.noise(H('#6a4a2e'), 0.2); p.speck(H('#4a321e'), 0.2); for (let k = 0; k < 3; k++) { const x0 = Math.floor(p.rand() * 12), y0 = Math.floor(p.rand() * 12); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) p.set(x0 + i, y0 + j, tone(p, '#8a6a42')); for (let i = 0; i < 4; i++) p.set(x0 + i, y0, H('#2a1e14')); } for (let x = 0; x < 16; x++) { p.set(x, 11, H('#2a1e14')); p.set(x, 12, H('#5a4a3a')); } p.set(7, 11, H('#c8a040')); p.set(8, 11, H('#c8a040')); });
  T('raider_pants', p => { p.noise(H('#3a3a44'), 0.2); p.speck(H('#2a2a32'), 0.2); for (let y = 12; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#2a1e14')); });
  // ---- werewolf: a wolf that stands up ----
  T('were_fur', p => fur(p, '#4a4038', '#2e2620', '#6a5e52', 0.3));
  T('were_back', p => { fur(p, '#3a322c', '#221c18', '#5a4e44', 0.35); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 5; y++) p.set(x, y, tone(p, '#221c18')); });
  T('were_face', p => { fur(p, '#4a4038', '#2e2620', '#6a5e52', 0.3); face(p, [blank, blank, blank, blank, '..yy......yy....', '..yk......ky....', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { y: H('#ffd040'), k: H('#1a1208') }); });
  T('were_snout', p => { fur(p, '#5a4e44', '#2e2620', '#7a6e62', 0.2); face(p, [blank, blank, '......kk........', '......kk........', blank, blank, blank, blank, blank, blank, 'w.w.w.w.w.w.w.w.', '.w.w.w.w.w.w.w.w', blank, blank, blank, blank], { k: H('#141008'), w: H('#e8e0c8') }); });
  T('were_claw', p => { fur(p, '#3a322c', '#221c18', '#5a4e44'); for (let x = 1; x < 16; x += 4) for (let y = 12; y < 16; y++) p.set(x, y, H('#d8d0b8')); });
  // ---- ogre: big, grey-green, tusked, in a hide loincloth ----
  T('ogre_skin', p => { p.noise(H('#6a7a52'), 0.18); p.speck(H('#4e5e3a'), 0.2); p.speck(H('#8a9a6a'), 0.06); for (let k = 0; k < 3; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#5a6a42'), 0.1); });
  T('ogre_face', p => { p.noise(H('#6a7a52'), 0.18); face(p, [blank, blank, 'bbbbbbbbbbbbbbbb', '..kkk....kkk....', '..kyk....kyk....', blank, '.......nn.......', '......nnnn......', blank, '...mmmmmmmmm....', '...mt.....tm....', '....t.....t.....', blank, blank, blank, blank], { b: H('#4e5e3a'), k: H('#2a2014'), y: H('#e8c040'), n: H('#5a6a42'), m: H('#3a1e14'), t: H('#f0e8c8') }); });
  T('ogre_cloth', p => { p.noise(H('#7a5a3a'), 0.22); p.speck(H('#5a3e26'), 0.25); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#3a2a1a')); p.set(x, 1, H('#5a4030')); } for (let y = 10; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 4 === 0 && p.rand() < 0.6) p.set(x, y, [0, 0, 0], 0); });
  // ---- crocodile: armoured back, pale belly, a long toothy jaw ----
  T('croc_hide', p => { p.noise(H('#4a5a32'), 0.18); for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x += 4) { p.set(x, y, H('#2e3a1e')); p.set(x + 1, y + 1, H('#6a7a46')); } });
  T('croc_back', p => { p.noise(H('#3e4a2a'), 0.18); for (let y = 0; y < 16; y += 3) for (let x = 2; x < 14; x += 4) { p.set(x, y, H('#6a7a46')); p.set(x + 1, y, H('#5a6a3a')); p.set(x, y + 1, H('#24301a')); } });
  T('croc_belly', p => { p.noise(H('#c8c09a'), 0.12); for (let y = 0; y < 16; y += 3) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#a8a07a')); });
  T('croc_face', p => { p.noise(H('#4a5a32'), 0.18); face(p, [blank, blank, '..yk......ky....', '..kk......kk....', blank, blank, blank, blank, blank, blank, blank, blank, 'w.w.w.w.w.w.w.w.', blank, blank, blank], { y: H('#e8d040'), k: H('#141808'), w: H('#f0ecd8') }); });
  T('croc_jaw', p => { p.noise(H('#4a5a32'), 0.18); for (let x = 0; x < 16; x += 2) { p.set(x, 14, H('#f0ecd8')); p.set(x + 1, 15, H('#f0ecd8')); } p.set(2, 2, H('#141808')); p.set(13, 2, H('#141808')); });
  // ---- shark: slate grey over white ----
  T('shark_skin', p => { p.noise(H('#5a6a7a'), 0.12); p.speck(H('#4a5a6a'), 0.15); for (let y = 11; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#e8ecf0', 0.06)); });
  T('shark_face', p => { p.noise(H('#5a6a7a'), 0.12); for (let y = 10; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#e8ecf0', 0.06)); face(p, [blank, blank, blank, blank, '.k............k.', blank, blank, blank, blank, blank, '..wwwwwwwwwwww..', '..w.w.w.w.w.w...', '..kkkkkkkkkkkk..', blank, blank, blank], { k: H('#0a1018'), w: H('#ffffff') }); });
  // ---- snakes: a desert rattler, a jungle green, a speckled adder ----
  for (const [k, base, mark, belly] of [['rattler', '#b89a6a', '#6a4a2a', '#e8d8b0'], ['greensnake', '#4a8a2e', '#2e5a1e', '#c8d870'], ['adder', '#6a5e4a', '#2a2218', '#a89a7a']]) {
    T(k + '_skin', p => { p.noise(H(base), 0.12); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.abs(((x + y * 2) % 8) - 4); if (k !== 'greensnake' ? d < 1.5 : (x + y) % 7 === 0) p.set(x, y, tone(p, mark)); } for (let x = 0; x < 16; x++) for (let y = 13; y < 16; y++) p.set(x, y, tone(p, belly, 0.08)); });
    T(k + '_head', p => { p.noise(H(base), 0.12); p.set(3, 5, H('#d8b020')); p.set(12, 5, H('#d8b020')); p.set(3, 6, H('#141008')); p.set(12, 6, H('#141008')); for (let x = 5; x < 11; x++) p.set(x, 12, H(mark)); });
  }
  T('snake_tongue', p => p.fill(H('#c8202a')));
  T('rattle', p => { p.noise(H('#d8c8a0'), 0.1); for (let y = 0; y < 16; y += 3) for (let x = 0; x < 16; x++) p.set(x, y, H('#8a7a5a')); });
  // ---- scorpion: a desert hunter with pincers and a stinging tail ----
  T('scorp_shell', p => { p.noise(H('#8a5a2a'), 0.16); for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) { p.set(x, y, H('#5a3a1a')); p.set(x, y + 1, H('#b07a3e')); } });
  T('scorp_face', p => { p.noise(H('#8a5a2a'), 0.16); face(p, [blank, blank, blank, '....kk....kk....', '....kk....kk....', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { k: H('#141008') }); });
  T('scorp_sting', p => { p.noise(H('#3a1e0e'), 0.15); for (let y = 0; y < 6; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#d8c8a0')); });
  // ---- the big cats ----
  const catFace = (p, base, eye, nose) => face(p, [blank, blank, blank, blank, '..ee......ee....', '..ek......ke....', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { e: H(eye), k: H('#0a0806') });
  T('lion_fur', p => { p.noise(H('#c89a52'), 0.14); p.speck(H('#a87a3a'), 0.15); p.speck(H('#e0b870'), 0.06); });
  T('lion_mane', p => fur(p, '#7a4a1e', '#4a2a10', '#a86a2e', 0.35));
  T('lion_face', p => { p.noise(H('#c89a52'), 0.14); catFace(p, '#c89a52', '#e8c040'); });
  T('lion_snout', p => { p.noise(H('#e0c08a'), 0.1); face(p, [blank, '.....kkkk.......', '......kk........', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { k: H('#2a1810') }); });
  T('tiger_fur', p => { p.noise(H('#e07a2a'), 0.12); for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) if (Math.abs(((x * 2 + Math.floor(y / 3) * 5) % 9) - 4) < 1 && p.rand() < 0.85) p.set(x, y, tone(p, '#1a120a')); for (let x = 0; x < 16; x++) for (let y = 13; y < 16; y++) p.set(x, y, tone(p, '#f0e8d8', 0.05)); });
  T('tiger_face', p => { p.noise(H('#e07a2a'), 0.12); for (let x = 3; x < 13; x += 3) { p.set(x, 1, H('#1a120a')); p.set(x, 2, H('#1a120a')); } catFace(p, '#e07a2a', '#c8e040'); for (let y = 9; y < 16; y++) for (let x = 3; x < 13; x++) p.set(x, y, tone(p, '#f0e8d8', 0.05)); });
  T('leopard_fur', p => { p.noise(H('#c8c4bc'), 0.1); for (let k = 0; k < 9; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 15); p.set(x, y, H('#3a3630')); p.set(x + 1, y, H('#3a3630')); p.set(x, y + 1, H('#5a564e')); p.set(x + 1, y + 1, H('#8a867e')); } });
  T('leopard_face', p => { p.noise(H('#c8c4bc'), 0.1); catFace(p, '#c8c4bc', '#7ac8d8'); p.set(6, 1, H('#3a3630')); p.set(10, 2, H('#3a3630')); });
  T('panther_fur', p => { p.noise(H('#1e1c22'), 0.16); p.speck(H('#2e2c34'), 0.2); p.speck(H('#3a3844'), 0.05); });
  T('panther_face', p => { p.noise(H('#1e1c22'), 0.16); catFace(p, '#1e1c22', '#d8e040'); });
  T('bigcat_snout', p => { p.noise(H('#f0e8d8'), 0.08); face(p, [blank, '.....kkkk.......', '......kk........', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { k: H('#2a1810') }); });
  T('panther_snout', p => { p.noise(H('#2a2830'), 0.12); face(p, [blank, '.....kkkk.......', '......kk........', blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank, blank], { k: H('#08060a') }); });

  // ---- what they drop or carry ----
  addItem('venom_sac', p => { p.blob(8, 9, 4, H('#7ab03a'), 0.15); p.blob(7, 8, 2, H('#a8e05a'), 0.1); p.set(6, 6, H('#e8ffc0')); for (let y = 2; y < 6; y++) p.set(8, y, H('#5a7a2a')); });
  addItem('shark_tooth', p => { for (let y = 3; y < 14; y++) { const w = Math.floor((14 - y) / 2.2); for (let x = 8 - w; x <= 8 + w; x++) p.set(x, y, x === 8 - w ? H('#ffffff') : H('#e8e4d8')); } for (let x = 4; x < 13; x++) p.set(x, 14, H('#c8c0a8')); });
  addItem('ectoplasm', p => { p.blob(8, 9, 4, H('#a8e8f0'), 0.12); p.blob(8, 7, 2, H('#e8ffff'), 0.08); p.set(6, 6, H('#ffffff')); });
  addItem('cinder_rod', p => { for (let i = 2; i < 14; i++) { p.set(i, 15 - i, H('#3a2018')); p.set(i + 1, 15 - i, H('#ff7a2a')); p.set(i, 14 - i, H('#ffc040')); } });
  addItem('magma_cream', p => { p.blob(8, 9, 4, H('#3a1e14'), 0.15); p.blob(8, 9, 2, H('#ff7a1a'), 0.1); p.set(8, 8, H('#ffe080')); });
  addItem('ogre_club', p => { for (let i = 1; i < 11; i++) { p.set(i + 3, 15 - i, H('#7a5430')); p.set(i + 4, 15 - i, H('#5a3e22')); } for (let y = 0; y < 7; y++) for (let x = 9; x < 16; x++) if (Math.hypot(x - 12, y - 3) < 3.6) p.set(x, y, shade(H('#6a4a2a'), 0.8 + p.rand() * 0.4)); p.set(10, 2, H('#9a9aa4')); p.set(13, 5, H('#9a9aa4')); });
  addItem('hex_flask', p => { for (let y = 5; y < 15; y++) for (let x = 4; x < 12; x++) if (Math.hypot(x - 7.5, y - 10) < 4.2) p.set(x, y, y < 8 ? H('#c8e0e8') : H('#6a3a8a')); for (let y = 1; y < 5; y++) { p.set(7, y, H('#c8e0e8')); p.set(8, y, H('#a8c0c8')); } p.set(7, 0, H('#7a5430')); p.set(8, 0, H('#7a5430')); p.set(5, 10, H('#e8c8ff')); });
  addItem('croc_scale', p => { for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) if (Math.abs(x - 7.5) + Math.abs(y - 7.5) < 6) p.set(x, y, shade(H('#4a5a32'), 0.8 + p.rand() * 0.4)); p.set(7, 5, H('#8a9a5a')); });
  addItem('pelt', p => { for (let y = 2; y < 15; y++) for (let x = 2; x < 14; x++) if (!(y < 4 && (x < 4 || x > 11)) && !(y > 12 && (x < 4 || x > 11))) p.set(x, y, shade(H('#a87a3a'), 0.85 + p.rand() * 0.3)); for (let x = 5; x < 11; x++) p.set(x, 8, H('#7a5426')); });
}
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () { base(); paintMonsterTiles083(); };
}

// ---- the bodies -------------------------------------------------------------------------------------
{
  const D = MODEL_DEFS;
  const ear = (name, at, w, h, tex, rest) => [name, 'head', at, [-w / 2, 0, -0.5, w / 2, h, 0.5], tex, { role: 'ear', rest: rest || [0, 0, 0] }];
  const snout = (at, w, h, l, tex) => ['snout', 'head', at, [-w / 2, -h / 2, -l, w / 2, h / 2, 0], tex];
  const overlay = (name, parent, box, tex) => [name, parent, [0, 0, 0], box, tex, { glow: true, noCull: true }];

  D.husk = bipedRig({
    head: [8, 8, 8], body: [8, 12, 4], arm: [4, 12, 4], leg: [4, 12, 4], armsReach: true,
    tex: { head: { all: 'husk_skin', front: 'husk_face' }, body: 'husk_wrap', arm: 'husk_skin', fore: 'husk_wrap', leg: 'husk_wrap', shin: 'husk_skin' },
  });
  D.drowned = bipedRig({
    head: [8, 8, 8], body: [8, 12, 4], arm: [4, 12, 4], leg: [4, 12, 4], armsReach: true,
    tex: { head: { all: 'drowned_skin', front: 'drowned_face' }, body: 'drowned_rags', arm: 'drowned_skin', leg: 'drowned_rags', shin: 'drowned_skin' },
    extras: [overlay('eyes', 'head', [-4, 0, -4.08, 4, 8, -4.02], 'drowned_eyes')],
  });
  D.stray = bipedRig({
    head: [8, 8, 8], body: [8, 12, 4], arm: [2, 12, 2], leg: [2, 12, 2], legX: 2, armX: 5, bodyNoCull: true,
    tex: { head: { all: 'stray_head', front: 'stray_face' }, body: { all: 'skel_ribs', top: 'stray_bone', bottom: 'stray_bone' }, arm: 'stray_bone', leg: 'stray_bone' },
    extras: [['cloak', 'body', [0, 12, 0], [-5, -9, -2.6, 5, 0.5, 2.6], 'stray_cloak', { noCull: true }], ['spine', 'body', [0, 0, 0.6], [-0.5, 0, -0.5, 0.5, 12, 0.5], 'stray_bone']],
  });
  D.cave_spider = spiderRig({ size: 0.7, tex: { body: 'cave_spider_fur', back: 'cave_spider_back', head: { all: 'cave_spider_fur', front: 'cave_spider_face' }, leg: 'cave_spider_fur' } });
  D.cave_spider.parts.push(rpart('eyes', 'head', [0, 0, 0], [-4 * 0.7, -4 * 0.7, -8 * 0.7 - 0.12, 4 * 0.7, 4 * 0.7, -8 * 0.7 - 0.04], 'spider_eyes', { glow: true }));
  D.witch = bipedRig({
    head: [8, 9, 8], body: [8, 12, 6], arm: [4, 12, 4], leg: [4, 12, 4],
    tex: { head: { all: 'witch_skin', front: 'witch_face' }, body: 'witch_robe', arm: 'witch_robe', fore: 'witch_skin', leg: 'witch_robe' },
    extras: [['hood', 'head', [0, 0, 0.5], [-5, -1, -4.5, 5, 10, 4.5], { all: 'witch_hood', front: false }, { noCull: true, rest: [0, 0, 0] }],
      ['skirt', 'body', [0, 0, 0], [-4.6, -11, -3.4, 4.6, 0.5, 3.4], 'witch_robe', { noCull: true }], ['herbs', 'body', [0, 1, -3.1], [-4, -6, -0.2, 4, 0, 0.2], 'witch_herb', { noCull: true }]],
  });
  // stone mite: five segments, smaller toward the tail
  {
    const seg = (n, parent, at, w, h, l, tex, extra) => rpart(n, parent, at, [-w / 2, 0, 0, w / 2, h, l], tex, Object.assign({ role: 'seg' }, extra || {}));
    D.stone_mite = finishRig('segmented', [
      rpart('head', null, [0, 0, -3], [-2, 0, -3, 2, 3, 0], { all: 'mite_shell', front: 'mite_head' }, { role: 'mhead', limb: 'head' }),
      seg('seg1', 'head', [0, 0, 0], 4, 4, 2, 'mite_shell'), seg('seg2', 'seg1', [0, 0, 2], 5, 4, 2, 'mite_shell'), seg('seg3', 'seg2', [0, 0, 2], 4, 3, 2, 'mite_shell'),
      seg('seg4', 'seg3', [0, 0, 2], 3, 2, 2, 'mite_shell'), seg('seg5', 'seg4', [0, 0, 2], 2, 1.5, 2, 'mite_shell'),
    ], { hipY: 2, height: 4, post: 'slither' });
  }
  D.wraith = finishRig('wraith', [
    rpart('body', null, [0, 10, 0], [-5, -10, -3, 5, 10, 3], 'wraith_cloak', { role: 'wbody', alpha: 0.78, noCull: true }),
    rpart('head', 'body', [0, 10, 0], [-4.5, 0, -4.5, 4.5, 9, 4.5], { all: 'wraith_hood', front: 'wraith_face' }, { role: 'whead', limb: 'head', alpha: 0.85 }),
    rpart('eyes', 'head', [0, 0, 0], [-4.5, 0, -4.62, 4.5, 9, -4.56], 'wraith_eyes', { glow: true, noCull: true }),
    rpart('armR', 'body', [-6, 8, 0], [-1.2, -14, -1.2, 1.2, 0, 1.2], 'wraith_hand', { role: 'warm', side: 1, rest: [0.9, 0, 0.15], alpha: 0.8 }),
    rpart('armL', 'body', [6, 8, 0], [-1.2, -14, -1.2, 1.2, 0, 1.2], 'wraith_hand', { role: 'warm', side: -1, rest: [0.9, 0, -0.15], alpha: 0.8 }),
    rpart('hem', 'body', [0, -10, 0], [-6, -6, -3.5, 6, 0, 3.5], 'wraith_cloak', { role: 'whem', alpha: 0.55, noCull: true }),
  ], { hipY: 10, height: 30, post: 'drift' });
  D.cinder_wisp = finishRig('wisp', [
    rpart('core', null, [0, 10, 0], [-3.5, -3.5, -3.5, 3.5, 3.5, 3.5], { all: 'wisp_core', front: 'wisp_face' }, { role: 'wcore', glow: true, limb: 'head' }),
    ...[0, 1, 2, 3, 4, 5].map(i => rpart('rod' + i, null, [Math.cos(i / 6 * TAU) * 6, 8 + (i % 2) * 4, Math.sin(i / 6 * TAU) * 6], [-0.8, -4, -0.8, 0.8, 4, 0.8], 'wisp_rod', { role: 'rod', idx: i })),
  ], { hipY: 10, height: 16, post: 'orbit' });
  D.magma_slime = finishRig('slime', [
    rpart('cube', null, [0, 0, 0], [-8, 0, -8, 8, 16, 8], 'magma_crust', { role: 'cube', alpha: 0.9, noCull: true }),
    rpart('core', 'cube', [0, 0, 0], [-5, 3, -5, 5, 13, 5], { all: 'magma_core', front: 'magma_face' }, { glow: true }),
  ]);
  D.raider = bipedRig({
    head: [8, 8, 8], body: [8, 12, 4], arm: [4, 12, 4], leg: [4, 12, 4],
    tex: { head: { all: 'raider_hood', front: 'raider_face' }, body: 'raider_leather', arm: 'raider_leather', fore: 'raider_skin', leg: 'raider_pants', shin: 'raider_pants' },
    extras: [['hood', 'head', [0, 0, 0.6], [-4.6, -0.5, -4.4, 4.6, 8.8, 4.4], { all: 'raider_hood', front: false }, { noCull: true }]],
  });
  D.werewolf = bipedRig({
    head: [8, 8, 7], body: [10, 13, 6], arm: [4, 14, 4], leg: [4, 12, 5], armsReach: true,
    tex: { head: { all: 'were_fur', front: 'were_face', top: 'were_back' }, body: { all: 'were_fur', back: 'were_back' }, arm: 'were_fur', fore: 'were_claw', leg: 'were_fur', shin: 'were_claw' },
    extras: [snout([0, 1.5, -3.5], 4, 4, 5, { all: 'were_fur', front: 'were_snout', bottom: 'were_snout' }), ear('earL', [-3, 8, 0], 2, 3, 'were_back'), ear('earR', [3, 8, 0], 2, 3, 'were_back'),
      ['mane', 'body', [0, 13, 0], [-6, -5, -4, 6, 2, 4], 'were_back', { noCull: true }], ['tail', 'body', [0, 1, 3], [-1.5, -1.5, 0, 1.5, 1.5, 9], 'were_back', { rest: [-0.7, 0, 0] }]],
  });
  D.werewolf.pitch0 = 0;
  D.ogre = bipedRig({
    head: [10, 10, 10], body: [16, 16, 10], arm: [6, 18, 6], leg: [6, 14, 6], armX: 11, legX: 4, heavy: true,
    tex: { head: { all: 'ogre_skin', front: 'ogre_face' }, body: { all: 'ogre_skin' }, arm: 'ogre_skin', leg: 'ogre_skin', shin: 'ogre_skin' },
    extras: [['loin', 'body', [0, 0, 0], [-8.4, -6, -5.4, 8.4, 3, 5.4], 'ogre_cloth', { noCull: true }], ['belly', 'body', [0, 2, -5], [-6, 0, -2, 6, 9, 0], 'ogre_skin']],
  });
  D.crocodile = quadRig({
    body: [10, 6, 26], leg: [3, 4], head: [8, 5, 7], headAt: [0, 0], tail: [6, 5, 22], tailRest: 0.05, legInset: -1.5,
    tex: { body: { all: 'croc_hide', top: 'croc_back', bottom: 'croc_belly' }, head: { all: 'croc_hide', front: 'croc_face', top: 'croc_back' }, leg: 'croc_hide', tail: { all: 'croc_hide', top: 'croc_back' } },
    extras: [['jaw', 'head', [0, -1, -7], [-3.5, -1.5, -9, 3.5, 1, 0], { all: 'croc_jaw', top: 'croc_back' }, { role: 'jaw' }]],
  });
  D.shark = fishRig({ body: [10, 10, 30], tail: [12, 10], dorsal: [8, 8, -2], fins: 6, tex: { body: { all: 'shark_skin', front: 'shark_face' }, fin: 'shark_skin', tail: 'shark_skin' }, scale: 1 });
  for (const [k, skin, head, rattle] of [['rattlesnake', 'rattler_skin', 'rattler_head', true], ['green_snake', 'greensnake_skin', 'greensnake_head'], ['adder', 'adder_skin', 'adder_head']]) {
    const parts = [rpart('head', null, [0, 0, -2], [-1.5, 0, -3.5, 1.5, 2, 0], { all: skin, front: head, top: head }, { role: 'mhead', limb: 'head' }),
      rpart('tongue', 'head', [0, 0.5, -3.5], [-0.3, 0, -1.5, 0.3, 0.1, 0], 'snake_tongue', { only: 'tongueOut', noCull: true })];
    let prev = 'head';
    for (let i = 1; i <= 8; i++) { const w = i < 3 ? 2.2 : 2.2 - (i - 3) * 0.2; parts.push(rpart('seg' + i, prev, [0, 0, i === 1 ? 0 : 2.4], [-w / 2, 0, 0, w / 2, w * 0.9, 2.6], skin, { role: 'seg', idx: i })); prev = 'seg' + i; }
    if (rattle) parts.push(rpart('rattle', prev, [0, 0.6, 2.4], [-0.8, 0, 0, 0.8, 1.6, 2], 'rattle', { role: 'rattle' }));
    D[k] = finishRig('segmented', parts, { hipY: 1, height: 2.5, post: 'slither' });
  }
  {
    const sc = spiderRig({ size: 0.55, tex: { body: 'scorp_shell', back: 'scorp_shell', head: { all: 'scorp_shell', front: 'scorp_face' }, leg: 'scorp_shell' } });
    // pincers out front and a tail that curls up over the back
    for (const s of [1, -1]) {
      sc.parts.push(rpart('arm' + (s > 0 ? 'R' : 'L'), 'head', [s * 2, -0.5, -3.5], [-0.8, -0.8, -4, 0.8, 0.8, 0], 'scorp_shell', { rest: [0, s * 0.5, 0] }));
      sc.parts.push(rpart('claw' + (s > 0 ? 'R' : 'L'), 'arm' + (s > 0 ? 'R' : 'L'), [0, 0, -4], [-1.4, -1, -3, 1.4, 1, 0], 'scorp_shell', { rest: [0, -s * 0.6, 0] }));
    }
    let prev = 'abdomen', z = 6.6;
    for (let i = 1; i <= 5; i++) { sc.parts.push(rpart('tail' + i, prev, [0, i === 1 ? 1 : 0, i === 1 ? z : 0], [-0.9, 0, 0, 0.9, 1.6, 2.4], 'scorp_shell', { role: 'stail', idx: i, rest: [-0.55, 0, 0] })); prev = 'tail' + i; }
    sc.parts.push(rpart('sting', prev, [0, 0, 2.4], [-0.6, -1.5, 0, 0.6, 0.6, 1.2], 'scorp_sting', { rest: [-0.4, 0, 0] }));
    sc.post = 'sting';
    D.scorpion = finishRig('spider', sc.parts, { height: 7, post: 'sting' });
  }
  // the big cats: a cat's build at a lion's size
  const bigcat = (fur, faceT, snoutT, tail, extras = [], size = [10, 11, 24], leg = [4, 12], head = [9, 8, 8]) => quadRig({
    body: size, leg, head, headAt: [3, 0], tail: [2, tail, 2], tailRest: -1.0, post: 'sit',
    tex: { body: fur, head: { all: fur, front: faceT }, leg: fur, tail: fur },
    extras: [snout([0, -2, -8], 5, 3, 3, { all: fur, front: snoutT }), ear('earL', [-3, 4, -2], 2, 2, fur), ear('earR', [3, 4, -2], 2, 2, fur), ...extras],
  });
  D.lion = bigcat('lion_fur', 'lion_face', 'lion_snout', 14, [['mane', 'head', [0, 0, 0], [-7, -6, -2, 7, 7, 4], 'lion_mane', { noCull: true }]]);
  D.lioness = bigcat('lion_fur', 'lion_face', 'lion_snout', 14, [], [9, 10, 22], [4, 11], [8, 7, 7]);
  D.tiger = bigcat('tiger_fur', 'tiger_face', 'bigcat_snout', 15, [], [11, 11, 26], [4, 12], [9, 8, 8]);
  D.snow_leopard = bigcat('leopard_fur', 'leopard_face', 'bigcat_snout', 18, [], [8, 9, 20], [3, 10], [7, 7, 6]);
  D.panther = bigcat('panther_fur', 'panther_face', 'panther_snout', 15, [], [9, 10, 22], [4, 11], [8, 7, 7]);

  // poses: snakes and mites slither, scorpions raise and strike, wraiths drift, wisps' rods circle
  Object.assign(RIG_POST, {
    slither(m, d, P, R) {
      const t = (m.age || 0) * (m.speedNow > 0.2 ? 9 : 2.5) + (m.id || 0), a = m.coiled ? 0.9 : m.speedNow > 0.2 ? 0.45 : 0.18;
      for (let i = 1; i <= 8; i++) P['seg' + i] = [0, Math.sin(t - i * 0.9) * a, 0];
      if (m.striking > 0) P.head = [-0.5, 0, 0];
      if (m.rattling) P.rattle = [0, Math.sin((m.age || 0) * 60) * 0.4, 0];
    },
    sting(m, d, P, R) {
      const k = m.striking > 0 ? 1 : 0, t = (m.age || 0);
      for (let i = 1; i <= 5; i++) P['tail' + i] = [-0.15 * k - Math.sin(t * 2 + i) * 0.04, 0, 0];
      P.sting = [k * -0.9, 0, 0];
      P.clawR = [0, Math.sin(t * 3) * 0.15, 0]; P.clawL = [0, -Math.sin(t * 3) * 0.15, 0];
    },
    drift(m, d, P, R) {
      const t = (m.age || 0) + (m.id || 0);
      R.lift = Math.sin(t * 1.6) * 0.12;
      P.armR = [Math.sin(t * 1.3) * 0.2 + (m.swingT > 0 ? -0.8 : 0), 0, 0]; P.armL = [Math.sin(t * 1.3 + 1) * 0.2 + (m.swingT > 0 ? -0.8 : 0), 0, 0];
      P.hem = [Math.sin(t * 2.2) * 0.12, 0, Math.sin(t * 1.7) * 0.1];
    },
    orbit(m, d, P, R) {
      const t = (m.age || 0) * 2 + (m.id || 0);
      R.lift = Math.sin(t * 0.8) * 0.1;
      for (let i = 0; i < 6; i++) P['rod' + i] = [Math.sin(t + i) * 0.25, t * 0.6, Math.cos(t + i) * 0.25];
    },
  });
}
