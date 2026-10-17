// ---------------------------------------------------------------------------
// render/doku4.js — textures for 0.7: particles (bubbles, leaves, drips,
// sparkles, spores), graves, heart crystals, belt charms, the death compass
// and the WorldEdit wand.
// ---------------------------------------------------------------------------

function paintDokuBlocks4() {
  const H = hexRGB;
  // ---- particles ----
  addTile('bubble_particle', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 6.5 && d > 4.6) p.set(x, y, H('#d8f0ff'), 230); else if (d <= 4.6 && d > 3.6 && x < 8 && y < 8) p.set(x, y, H('#ffffff'), 200); } });
  const leaf = (name, base, hi, lo) => addTile(name, p => {
    for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) {
      const dx = x - 7.5, dy = y - 7.5, v = Math.abs(dx - dy * 0.3) / 4.5 + Math.abs(dx + dy) / 9;
      if (v > 1) continue;
      p.set(x, y, x === y ? H(lo) : v < 0.45 ? H(hi) : H(base));
    }
  });
  leaf('leaf_green', '#5a9a3a', '#7ab84a', '#3a6a2a');
  leaf('leaf_light', '#8ab85a', '#a8d06a', '#5a8a3a');
  leaf('leaf_dark', '#3a6a4a', '#4a805a', '#24442e');
  leaf('leaf_deep', '#3a7a2a', '#4e963a', '#245a1a');
  leaf('leaf_pink', '#f0a8c8', '#ffc8dc', '#d07aa0');
  leaf('leaf_white', '#e8eef4', '#ffffff', '#b8c4d0');
  const drip = (name, c, hi) => addTile(name, p => { for (let y = 4; y < 13; y++) for (let x = 5; x < 11; x++) { const d = Math.hypot((x - 7.5) * 1.1, (y - 9) * (y < 9 ? 0.6 : 1)); if (d < 3.2) p.set(x, y, d < 1.4 && y < 9 ? H(hi) : H(c)); } });
  drip('drip_water', '#3a72d8', '#a8d0ff');
  drip('drip_lava', '#f06a1a', '#ffe08a');
  drip('drip_tear', '#8a3ad8', '#e0b0ff');
  addTile('sparkle', p => { for (let i = 2; i < 14; i++) { p.set(i, 7, H('#fffbe8')); p.set(7, i, H('#fffbe8')); } for (const [x, y] of [[6, 6], [8, 8], [6, 8], [8, 6]]) p.set(x, y, H('#fff0b0')); });
  addTile('spore', p => { for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) if (Math.hypot(x - 7.5, y - 7.5) < 2.8) p.set(x, y, H('#5ab84a')); });
  // ---- night creatures: skeleton, spider, fuseling, slime ----
  addTile('skel_bone', p => { p.noise(H('#c8c4b4'), 0.12); p.speck(H('#9a968a'), 0.12); });
  addTile('skel_head', p => { p.noise(H('#cfcbbb'), 0.1); p.speck(H('#a8a496'), 0.1); });
  addTile('skel_face', p => {
    p.noise(H('#cfcbbb'), 0.1);
    p.art(['................', '................', '................', '................', '................', '...kkk....kkk...', '...kkk....kkk...', '...kkk....kkk...',
      '................', '.......kk.......', '................', '...kkkkkkkkkk...', '...k.k.k.k.k.k..', '................', '................', '................'], { k: H('#2a2622') });
  });
  // a ribcage you can see through: bone bars with open gaps, the spine down the middle, the hips at the bottom
  addTile('skel_ribs', p => {
    const bone = () => shade(H('#c8c4b4'), 0.88 + p.rand() * 0.22);
    for (const y of [0, 3, 6, 9]) for (let x = 1; x < 15; x++) { p.set(x, y, bone()); if (x > 2 && x < 13) p.set(x, y + 1, shade(H('#a8a496'), 0.95 + p.rand() * 0.1)); }
    for (let y = 12; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, bone());
    for (let y = 0; y < 16; y++) { p.set(7, y, H('#d8d4c4')); p.set(8, y, H('#b8b4a4')); }
  });
  addTile('skel_bow', p => { p.noise(H('#7a5430'), 0.2); for (let y = 0; y < 16; y++) p.set(12, y, H('#e8e8e8')); });
  addTile('spider_fur', p => { p.noise(H('#3a3230'), 0.22); p.speck(H('#5a4a44'), 0.12); });
  addTile('spider_back', p => { p.noise(H('#3e3532'), 0.22); p.speck(H('#5e4e48'), 0.1); for (let i = 0; i < 6; i++) p.set(5 + Math.floor(p.rand() * 6), 3 + Math.floor(p.rand() * 10), H('#7a2a22')); });
  addTile('spider_face', p => {
    p.noise(H('#4a403b'), 0.22); p.speck(H('#625650'), 0.14); p.speck(H('#2e2724'), 0.1);
    // brow ridges over the eyes, a hairy muzzle and two pale fangs
    p.art(['................', '................', '.bbbbbbbbbbbbbb.', '................', '..RR...RR...RR..', '..RR...RR...RR..', '................', '...rr......rr...',
      '................', '.....hhhhhh.....', '....hk....kh....', '....hk....kh....', '.....f....f.....', '.....f....f.....', '................', '................'], { R: H('#d82a1a'), r: H('#a01a10'), k: H('#1a1412'), b: H('#2a2320'), h: H('#5e534c'), f: H('#d8d0c0') });
  });
  // fuseling: a mossy walking seed pod with ember veins that glows hotter as it fuses
  addTile('fuse_moss', p => {
    p.noise(H('#5a7a3a'), 0.25); p.speck(H('#3e5a26'), 0.2); p.speck(H('#7a9a4a'), 0.08);
    let x = Math.floor(p.rand() * 16), y = 0;
    for (let i = 0; i < 22; i++) { p.set(x & 15, y & 15, H(i % 3 ? '#e8742a' : '#ffc060')); y++; x += p.rand() < 0.5 ? 1 : -1; }
  });
  addTile('fuse_cap', p => { p.noise(H('#4a6a2e'), 0.2); for (let i = 0; i < 12; i++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#8aaa4a')); });
  addTile('fuse_face', p => {
    p.noise(H('#5a7a3a'), 0.22); p.speck(H('#3e5a26'), 0.15);
    p.art(['................', '................', '................', '................', '..oooo....oooo..', '..oYYo....oYYo..', '..oooo....oooo..', '................',
      '................', '......e..e......', '.......ee.......', '................', '................', '................', '................', '................'], { o: H('#c8501a'), Y: H('#fff0a0'), e: H('#e8742a') });
  });
  addTile('slime_skin', p => { p.noise(H('#7ad06a'), 0.1); for (let x = 1; x < 6; x++) p.set(x, 1, H('#d0ffc0')); p.set(1, 2, H('#d0ffc0')); for (let i = 0; i < 16; i++) { p.set(i, 15, H('#4a9a3e')); p.set(15, i, H('#4a9a3e')); } });
  addTile('slime_core', p => { p.noise(H('#3e8a32'), 0.14); p.speck(H('#2e6a26'), 0.12); });
  addTile('slime_face', p => {
    p.noise(H('#3e8a32'), 0.14);
    p.art(['................', '................', '................', '................', '..kk.......kk...', '..kk.......kk...', '................', '................',
      '................', '.......kk.......', '................', '................', '................', '................', '................', '................'], { k: H('#1e4a1a') });
  });
  // ---- small pieces for the rigged creatures ----
  addTile('ghoul_shoe', p => { p.noise(H('#2e3048'), 0.25); for (let x = 0; x < 16; x++) for (let y = 12; y < 16; y++) p.set(x, y, shade(H('#3a2a1e'), 0.85 + p.rand() * 0.3)); });
  addTile('cow_hoof', p => { p.noise(H('#5a4030'), 0.2); for (let x = 0; x < 16; x++) for (let y = 11; y < 16; y++) p.set(x, y, shade(H('#2a2420'), 0.85 + p.rand() * 0.3)); });
  addTile('pig_snout', p => { p.noise(H('#e89a9a'), 0.1); p.set(5, 7, H('#8a4a4a')); p.set(5, 8, H('#8a4a4a')); p.set(10, 7, H('#8a4a4a')); p.set(10, 8, H('#8a4a4a')); });
  addTile('boar_mane', p => { p.noise(H('#3a2618'), 0.3); p.speck(H('#1e140c'), 0.25); });
  addTile('wattle', p => p.noise(H('#c8261e'), 0.15));
  addTile('blood_particle', p => { p.noise(H('#8a1410'), 0.25); p.speck(H('#5a0a08'), 0.2); });
  // ---- armour as worn (plates over the body; the helmet's front is open for the face) ----
  const ARMOR_TINTS = { leather: ['#8a5a32', '#5a3a1e', '#b07a4a'], copper: ['#d07a50', '#8a4224', '#f0a880'], bronze: ['#c8904a', '#7a4a1a', '#f0c880'], iron: ['#d4d4d4', '#8a8a8a', '#f4f4f4'],
    gold: ['#f2cc3e', '#b88a14', '#fff0a0'], diamond: ['#5ee6e0', '#1d9a95', '#d2fffc'], cinderite: ['#e8642a', '#7a2a0e', '#ffb070'] };
  for (const [mat, [c, d, l]] of Object.entries(ARMOR_TINTS)) {
    const plate = (p) => {
      p.noise(H(c), mat === 'leather' ? 0.2 : 0.1);
      for (let x = 0; x < 16; x++) { p.set(x, 0, H(l)); p.set(x, 15, H(d)); p.set(x, 7, shade(H(d), 1.1)); }
      for (let y = 0; y < 16; y++) { p.set(0, y, H(l)); p.set(15, y, H(d)); }
      if (mat === 'leather') for (let x = 2; x < 14; x += 2) { p.set(x, 3, H(d)); p.set(x, 12, H(d)); }
      else for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) p.set(x, y, H(l));
    };
    addTile('armor_' + mat, plate);
    addTile('armor_' + mat + '_face', p => { plate(p); for (let y = 4; y < 15; y++) for (let x = 3; x < 13; x++) p.set(x, y, [0, 0, 0], 0); });
  }
  // ---- graves ----
  addTile('grave_stone', p => { pCobble(p, ramp('#8a8a8e', 7, 0.45), H('#3a3a3e'), 7); frameOver(p, H('#a8a8ac'), H('#4a4a4e')); for (let y = 4; y < 11; y++) { p.set(7, y, H('#3a3a3e')); p.set(8, y, H('#3a3a3e')); } for (let x = 5; x < 11; x++) { p.set(x, 6, H('#3a3a3e')); } });
  addTile('grave_stone_top', p => pPolished(p, ramp('#9a9a9e', 6, 0.4)));
  addTile('grave_dirt', p => { pDirt(p, ramp('#6a4a32', 6, 0.5), { pebbles: 6 }); for (let k = 0; k < 18; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#4a8a3a')); });
}

function paintDokuItems4() {
  const H = hexRGB;
  const I = (name, rows, pal) => addItem(name, p => p.art(rows, pal));
  const gold = { n: H('#e8c040'), N: H('#fff0a0'), d: H('#a8801a') };
  I('heart_crystal', ['................', '................', '...rr....rr.....', '..rRRr..rRRr....', '.rRWWRrrRRRRr...', '.rRWRRRRRRRRr...', '.rRRRRRRRRRRr...', '..rRRRRRRRRr....', '...rRRRRRRr.....', '....rRRRRr......', '.....rRRr.......', '......rr........', '................', '................', '................', '................'],
    { r: H('#8a1a3a'), R: H('#e84a7a'), W: H('#ffd0e0') });
  const charm = (name, gem) => I(name, ['................', '.....dnnnd......', '....dn...nd.....', '....n.....n.....', '....n.....n.....', '.....d...d......', '......nNn.......', '.....nGGGn......', '....nGgGGGn.....', '....nGGGGGn.....', '....nGGGGGn.....', '.....nGGGn......', '......nnn.......', '................', '................', '................'], Object.assign({ G: H(gem[0]), g: H(gem[1]) }, gold));
  charm('vigor_charm', ['#e84a5a', '#ffc0c8']);
  charm('ember_charm', ['#f08a2a', '#ffe0a0']);
  charm('tide_charm', ['#3aa8d8', '#c0f0ff']);
  charm('feather_charm', ['#e8e8f0', '#ffffff']);
  I('death_compass', ['................', '................', '.....kkkkkk.....', '....kssssssk....', '...kssWWssssk...', '...ksWssPsssk...', '...kssssPPssk...', '...ksssPPPssk...', '...kssssPsssk...', '...ksssssssk....', '....kssssssk....', '.....kkkkkk.....', '................', '................', '................', '................'],
    { k: H('#2a2a30'), s: H('#6a6a78'), W: H('#d8d8e8'), P: H('#a03ad8') });
  I('we_wand', ['................', '..........GGG...', '.........GgGG...', '........GgGG....', '.......GGGG.....', '......sGG.......', '.....ss.........', '....ss..........', '...ss...........', '..ss............', '.ss.............', '................', '................', '................', '................', '................'],
    { G: H('#e8c040'), g: H('#fff0a0'), s: H('#8a6438') });
}
