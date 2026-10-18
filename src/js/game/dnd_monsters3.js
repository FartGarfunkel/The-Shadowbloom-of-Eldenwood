// ---------------------------------------------------------------------------
// game/dnd_monsters3.js — alpha 3: the creatures of the marshes, the coast and
// the sea, the Shadowfell and the Veil's edge, Duskwood, the Redrock desert,
// and the people the campaign can set against you anywhere.
//
//   the Whispering Marshes and the Sunken Ruin ('marsh')
//     lizardfolk          spiked shield and heavy club; lurk under the water
//     lizardfolk_shaman   thorn whip that drags you in, entangling roots, produce flame
//     giant_frog          a tongue that pulls you in, then swallows you whole
//     troll               regenerates (not after fire or acid); limbs grow back; gets up again
//     shambling_mound     slams, then engulfs you; lightning feeds it
//     giant_crocodile     lies in wait, bites and holds, sweeps with its tail
//   the coast, Saltwind Harbor and the Sunken Village of Aethel ('coast', 'sea')
//     merrow              harpoon that drags you to it
//     sahuagin            blood frenzy; throws javelins
//     sahuagin_priestess  guiding bolt, hold person, healing word for her kin
//     sea_hag             a fair face from afar; horrific up close (fear), then the death glare
//     water_elemental     whelm: you're swept into it and held; summoned, it fights for you
//     giant_crab          scuttles sideways, pinches and holds
//     giant_octopus       tentacles that hold, an ink cloud to flee into
//     plesiosaurus        the long neck strikes from further than you'd think
//     drowned_villager    the cursed drowned of Aethel: lantern that lures, a drowning grasp
//     leviathan           the Leviathan of Saltwind Harbor (boss): psychic waves that daze,
//                         a ram, a bite; bloom spores when it's hurt
//   the Shadowfell Forest and the Veil's edge ('shadowfell')
//     ghost               withering touch, horrifying visage, possession (you stagger, it's in you),
//                         through walls, into the Ethereal
//     veil_echo_beast     a shadow-wolf of after-images: steps behind you; blows strike echoes
//     sentient_shadow     your silhouette: copies what you hold, mirrors your moves, strikes back;
//                         melts into the dark
//   Duskwood ('duskwood')
//     corrupted_fey       a Bloom-twisted fey knight: blinks away leaving an illusion, thorn snare
//     fey_trickster       mirror images, befuddlement, a vanishing trick
//   the Redrock desert ('desert')
//     pollen_raider       spore-mad raider with a scimitar; bursts into a spore cloud
//     pollen_raider_chief (boss) spore bellow, a cleaving greataxe, calls the raiders
//   people, anywhere (SRD humanoids)
//     cultist, cult_fanatic (inflict wounds, hold person), mage (arcane burst, fireball, misty step),
//     priest_acolyte (sacred flame, heals), knight (parry, leadership), veteran (two blows, crossbow),
//     scout (longbow), thug (pack tactics), spy (sneak attack, vanishes), guard_captain (javelins, rally),
//     archmage (lightning bolt, cone of cold, teleport, magic resistance)
//
// Stats are the SRD 5.2 stat blocks (5.1 where 5.2 has none); damage per hit is the SRD average of one
// attack, and the time between blows spreads a round's attacks over its six seconds.
// Spawning is wired elsewhere from region / night / day / boss.
// ---------------------------------------------------------------------------
{
const M3_KEYS = ['lizardfolk', 'lizardfolk_shaman', 'giant_frog', 'troll', 'shambling_mound', 'giant_crocodile', 'merrow', 'sahuagin', 'sahuagin_priestess', 'sea_hag', 'water_elemental',
  'giant_crab', 'giant_octopus', 'plesiosaurus', 'drowned_villager', 'leviathan', 'ghost', 'veil_echo_beast', 'sentient_shadow', 'corrupted_fey', 'fey_trickster', 'pollen_raider',
  'pollen_raider_chief', 'cultist', 'cult_fanatic', 'mage', 'priest_acolyte', 'knight', 'veteran', 'scout', 'thug', 'spy', 'guard_captain', 'archmage'];
// ---- 2. what they leave behind -------------------------------------------------------------------------
defItem('troll_blood', { name: 'Troll Blood', desc: 'Still trying to knit itself back together. A potent regenerative reagent.' });
defItem('mound_heart', { name: 'Shambling Heart', desc: 'A knot of rotting vines that still twitches. Druids and alchemists prize it.' });
defItem('sahuagin_tooth', { name: 'Sahuagin Tooth', desc: 'Serrated like a shark\'s. Sahuagin string them as trophies.' });
defItem('hag_eye', { name: 'Hag Eye', desc: 'A sea hag\'s eye. It still seems to watch you.' });
defItem('elemental_core_water', { name: 'Water Elemental Core', desc: 'A sphere of water that never spills: the heart of a water elemental.' });
defItem('crab_shell', { name: 'Giant Crab Shell', desc: 'A plate of hard red carapace. Light, and tough as iron.' });
defItem('leviathan_scale', { name: 'Leviathan Scale', desc: 'Black, veined with violet. Cold, and faintly humming.' });
defItem('bloomed_pearl', { name: 'Bloomed Pearl', desc: 'Grown inside the Leviathan around a seed of the Bloom. It pulses like a heart.' });
defItem('echo_fang', { name: 'Echo Fang', desc: 'A fang from a veil echo-beast. Look away and it seems to be two.' });
defItem('living_shadow', { name: 'Living Shadow', desc: 'A scrap of darkness that keeps its shape. It flinches from light.' });
defItem('thorned_antler', { name: 'Thorned Antler', desc: 'From a Bloom-twisted fey knight. Its thorns still weep violet sap.' });
defItem('fey_glimmer', { name: 'Fey Glimmer', desc: 'A mote of fey light. Laughs, very quietly, when shaken.' });
defItem('blight_spores', { name: 'Blight Spores', desc: 'Corrupted pollen from the Redrock raiders. Keep it stoppered.' });

// ---- 3. skins ------------------------------------------------------------------------------------------
{ const base = paintMonsterTiles; paintMonsterTiles = function () { base(); m3PaintTiles(); }; }
function m3PaintTiles() {
  const H = hexRGB, T = (n, f) => addTile(n, f), blank = '................';
  const tone = (p, c, k = 0.14) => shade(H(c), 1 + (p.rand() - 0.5) * k);
  const rows = (m) => { const o = []; for (let i = 0; i < 16; i++) o.push(m[i] || blank); return o; };
  const art = (p, m, pal) => { const P = {}; for (const k in pal) P[k] = Array.isArray(pal[k]) ? pal[k] : H(pal[k]); p.art(rows(m), P); };
  const box = (p, x0, y0, x1, y1, c, k = 0.08) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) p.set(x, y, tone(p, c, k)); };
  const clear = (p, x, y) => p.set(x, y, [0, 0, 0], 0);
  const scales = (p, base, dark, light, cell = 3) => {
    p.noise(H(base), 0.12);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const off = Math.floor(y / cell) % 2 ? Math.floor(cell / 2) : 0, cx = (x + off) % cell, cy = y % cell;
      if (cy === cell - 1) p.set(x, y, tone(p, dark, 0.1)); else if (cx === 0 && cy === 0) p.set(x, y, tone(p, light, 0.1));
    }
  };
  const fur = (p, base, dark, light, streak = 0.25) => { p.noise(H(base), 0.2); p.speck(H(dark), streak); p.speck(H(light), 0.08); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.15) p.set(x, y, tone(p, dark)); };
  const cloth = (p, base, dark, light) => { p.noise(H(base), 0.1); for (let x = 1; x < 16; x += 3 + Math.floor(p.rand() * 2)) for (let y = 0; y < 16; y++) if (p.rand() < 0.6) p.set(x, y, tone(p, dark, 0.06)); p.speck(H(light), 0.03); };
  const skin = (p, c) => { p.noise(H(c), 0.06); p.speck(shade(H(c), 0.92), 0.08, 0.05); };
  const metal = (p, base, dark, light) => { p.noise(H(base), 0.07); for (let x = 0; x < 16; x++) { p.set(x, 0, H(light)); p.set(x, 15, H(dark)); } for (let y = 5; y < 16; y += 5) for (let x = 0; x < 16; x++) { p.set(x, y, tone(p, dark, 0.05)); p.set(x, y - 1, tone(p, light, 0.05)); } for (let k = 0; k < 5; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H(light)); };
  const fade = (p, y0) => { for (let y = y0; y < 16; y++) for (let x = 0; x < 16; x++) if (p.rand() < (y - y0 + 1) / (17 - y0)) clear(p, x, y); };
  const tatter = (p, y0) => { for (let x = 0; x < 16; x++) { const d = y0 + Math.floor(p.rand() * (16 - y0)); for (let y = d; y < 16; y++) clear(p, x, y); } };
  const walk = (p, c, n, len, k = 0.1) => { for (let i = 0; i < n; i++) { let x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); for (let j = 0; j < len; j++) { p.set(x & 15, y & 15, tone(p, c, k)); if (p.rand() < 0.5) x += p.rand() < 0.5 ? 1 : -1; else y += p.rand() < 0.5 ? 1 : -1; } } };
  const band = (p, y0, y1, c, k = 0.06) => box(p, 0, y0, 15, y1, c, k);
  // a person's face: skin, hair down to the brow, eyes with whites, a nose, a mouth
  const human = (p, o) => {
    skin(p, o.skin);
    const hr = o.hair ? (o.hairRows ?? 3) : 0;
    for (let x = 0; x < 16; x++) { const h = hr ? hr + (x < 2 || x > 13 ? 3 : 0) : 0; for (let y = 0; y < h; y++) p.set(x, y, tone(p, o.hair)); }
    const sk = H(o.skin), dk = shade(sk, 0.82), dk2 = shade(sk, 0.7), wh = H(o.white || '#f2eee6');
    if (o.brow) for (const x of [3, 4, 5, 10, 11, 12]) p.set(x, 4, H(o.brow));
    for (const x0 of [3, 10]) { p.set(x0, 5, wh); p.set(x0 + 1, 5, H(o.eye)); p.set(x0 + 2, 5, wh); p.set(x0 + 1, 6, dk); }
    p.set(7, 7, dk); p.set(8, 7, dk); p.set(7, 8, dk); p.set(8, 8, dk2); p.set(6, 9, dk); p.set(9, 9, dk2);
    for (let x = 6; x <= 9; x++) p.set(x, 11, H(o.mouth || '#8a4a3e'));
    p.set(5, 11, dk); p.set(10, 11, dk);
  };
  const stubble = (p, c, y0 = 10) => { for (let y = y0; y < 15; y++) for (let x = 3; x < 13; x++) if (p.rand() < 0.35 && !(y === 11 && x >= 6 && x <= 9)) p.set(x, y, tone(p, c)); };

  // ================= the marshes =================
  // ---- lizardfolk: green scales, a cream belly, slit yellow eyes, a crest of red fins ----
  T('lizardfolk_scales', p => scales(p, '#557d3c', '#33532a', '#86b05e'));
  T('lizardfolk_face', p => { scales(p, '#557d3c', '#33532a', '#86b05e'); art(p, { 3: '..ddd.....ddd...', 4: '.dYYYd...dYYYd..', 5: '..YkY.....YkY...', 6: '..yky.....yky...', 7: '...d.......d....' }, { d: '#2a4220', Y: '#f0e060', y: '#c8b030', k: '#141008' }); });
  T('lizardfolk_snout', p => { scales(p, '#5e8a42', '#3a5a2c', '#8ab862'); art(p, { 3: '...kk.....kk....', 11: 'w.w.w.w.w.w.w.w.', 12: 'kkkkkkkkkkkkkkkk', 13: '.w.w.w.w.w.w.w.w' }, { k: '#141008', w: '#f0ecd8' }); });
  T('lizardfolk_belly', p => {
    scales(p, '#557d3c', '#33532a', '#86b05e');
    for (let y = 0; y < 16; y++) for (let x = 4; x < 12; x++) p.set(x, y, y % 3 === 2 ? tone(p, '#a8a068') : tone(p, '#d0c890', 0.06));
    for (let i = 0; i < 16; i++) { const x = 13 - Math.floor(i * 0.72); p.set(x, i, tone(p, '#6a4a2a')); p.set(x + 1, i, tone(p, '#4a321a')); }
    p.set(7, 7, H('#e8e0c8')); p.set(8, 7, H('#e8e0c8')); p.set(7, 8, H('#c8c0a8'));
  });
  T('lizardfolk_hide', p => { p.noise(H('#8a6a42'), 0.16); p.speck(H('#6a4a2a'), 0.2); band(p, 0, 1, '#4a321a'); for (let x = 1; x < 16; x += 3) p.set(x, 1, H('#c8b080')); tatter(p, 11); });
  T('lizardfolk_shield', p => { p.noise(H('#7a5a32'), 0.12); for (let x = 3; x < 16; x += 4) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, '#4a3418')); for (let i = 0; i < 16; i++) { p.set(i, 0, H('#3a2a14')); p.set(i, 15, H('#3a2a14')); p.set(0, i, H('#3a2a14')); p.set(15, i, H('#3a2a14')); } p.blob(8, 8, 3, H('#b8a07a'), 0.1); p.set(8, 8, H('#f0ecd8')); p.set(7, 7, H('#ffffff')); for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) p.set(x, y, H('#e8e4d0')); });
  T('lizardfolk_crest', p => { p.noise(H('#c8502a'), 0.12); for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, '#7a2a14')); for (let x = 0; x < 16; x++) p.set(x, 0, H('#f08a4a')); });
  // the shaman: blue-green scales daubed with white, feathers and a necklace of teeth
  T('lizard_shaman_scales', p => { scales(p, '#3f7a6a', '#244a40', '#6aaa94'); for (let y = 2; y < 16; y += 6) for (let x = 0; x < 16; x++) if (Math.abs((x % 6) - 3) === (y % 6 === 2 ? 3 - (x % 2) : 0) || Math.abs((x % 6) - 3) < 1) p.set(x, y + (Math.abs((x % 6) - 3) > 1 ? 1 : 0), tone(p, '#e8e4d8', 0.05)); });
  T('lizard_shaman_face', p => { scales(p, '#3f7a6a', '#244a40', '#6aaa94'); art(p, { 2: '.wwwww...wwwww..', 3: '.wdddw...wdddw..', 4: '.wYYYw...wYYYw..', 5: '.wYkYw...wYkYw..', 6: '.wykyw...wykyw..', 7: '..www.....www...', 8: '.......ww.......' }, { w: '#ece8dc', d: '#1e3a32', Y: '#f0e060', y: '#c8b030', k: '#141008' }); });
  T('lizard_shaman_snout', p => { scales(p, '#468a76', '#284e44', '#72b29c'); art(p, { 1: 'wwwwwwwwwwwwwwww', 3: '...kk.....kk....', 11: 'w.w.w.w.w.w.w.w.', 12: 'kkkkkkkkkkkkkkkk', 13: '.w.w.w.w.w.w.w.w' }, { k: '#141008', w: '#f0ecd8' }); });
  T('lizard_shaman_feather', p => { for (let y = 0; y < 16; y++) { const w = y < 2 ? 1 : y > 13 ? 0 : 3; for (let x = 8 - w; x <= 8 + w; x++) p.set(x, y, tone(p, y < 5 ? '#f0ece4' : y < 9 ? '#1e1a18' : '#c83a2a')); p.set(8, y, H('#e8dcc0')); } });
  T('lizard_shaman_beads', p => { for (let x = 0; x < 16; x++) { const y = 3 + Math.round(Math.sin(x / 15 * Math.PI) * 4); p.set(x, y, H('#5a3a1a')); if (x % 3 === 1) { p.set(x, y + 1, H('#f0ecd8')); p.set(x, y + 2, H('#d8d0b8')); } else if (x % 3 === 2) p.set(x, y + 1, H('#3aa8a0')); } p.set(7, 9, H('#f0ecd8')); p.set(8, 9, H('#f0ecd8')); p.set(7, 10, H('#d8d0b8')); p.set(8, 10, H('#c8b898')); p.set(7, 11, H('#c8b898')); });
  // ---- giant frog: olive and blotched, a wide mouth, golden eyes with a black bar ----
  T('gfrog_skin', p => { p.noise(H('#6a7a2e'), 0.12); for (let k = 0; k < 6; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1 + Math.floor(p.rand() * 2), H('#3e4a1a'), 0.1); p.speck(H('#9aaa4a'), 0.06); });
  T('gfrog_face', p => { p.noise(H('#6a7a2e'), 0.12); p.blob(4, 3, 1, H('#3e4a1a')); p.blob(12, 2, 1, H('#3e4a1a')); art(p, { 4: '......k..k......', 10: 'k..............k', 11: '.kkkkkkkkkkkkkk.', 12: '..rrrrrrrrrrrr..' }, { k: '#1e240c', r: '#8a5a4a' }); });
  T('gfrog_eye', p => { p.noise(H('#d8b030'), 0.1); for (let x = 2; x < 14; x++) { p.set(x, 7, H('#100c04')); p.set(x, 8, H('#100c04')); } for (let i = 0; i < 16; i++) { p.set(i, 0, H('#4a5a1e')); p.set(i, 15, H('#4a5a1e')); p.set(0, i, H('#4a5a1e')); p.set(15, i, H('#4a5a1e')); } p.set(4, 4, H('#ffffff')); p.set(5, 4, H('#fff4c0')); });
  T('gfrog_belly', p => { p.noise(H('#e0d8a8'), 0.08); p.speck(H('#c8c088'), 0.12); });
  // ---- troll: rubbery grey-green, warty, a mean little face, black claws ----
  T('troll_skin', p => { p.noise(H('#5e7a5a'), 0.14); p.speck(H('#3e5a3a'), 0.18); for (let k = 0; k < 5; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 15); p.set(x, y, H('#7e9a6e')); p.set(x + 1, y + 1, H('#2e4a2a')); } });
  T('troll_face', p => { p.noise(H('#5e7a5a'), 0.12); p.speck(H('#3e5a3a'), 0.12); art(p, { 2: 'hhhhhhhhhhhhhhhh', 3: '.ddddd....ddddd.', 4: '..kok......kok..', 5: '..ddd......ddd..', 6: '.......nn.......', 7: '......nnnn......', 9: '..w..........w..', 10: '..wkkkkkkkkkkw..', 11: '..kkwkkkkkkwkk..', 12: '...kkkkkkkkkk...' }, { h: '#22301e', d: '#2e4a2a', k: '#120e08', o: '#e8a020', n: '#4e6a4a', w: '#e8e0b8' }); });
  T('troll_hair', p => { fur(p, '#2a3a2a', '#141e14', '#3e523e', 0.3); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.4) p.set(x, y, tone(p, '#101810')); });
  T('troll_claw', p => { p.noise(H('#5e7a5a'), 0.14); p.speck(H('#3e5a3a'), 0.18); for (let x = 1; x < 16; x += 4) { for (let y = 11; y < 16; y++) p.set(x, y, H('#181410')); p.set(x + 1, 11, H('#181410')); p.set(x + 1, 12, H('#2a2620')); } });
  T('troll_loin', p => { p.noise(H('#6a5a3e'), 0.18); p.speck(H('#4a3a26'), 0.25); band(p, 0, 1, '#3a2a18'); for (let x = 0; x < 16; x += 4) p.set(x, 1, H('#a89060')); tatter(p, 9); });
  // ---- shambling mound: a heap of vine and rot, two lights deep inside ----
  T('mound_vines', p => { p.noise(H('#3e5a26'), 0.18); for (let k = 0; k < 40; k++) { let x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); const c = ['#2a4018', '#5a7a32', '#6a5a32', '#4a6a2a', '#7a8a3a'][k % 5], dx = p.rand() < 0.5 ? 1 : -1; for (let i = 0; i < 4; i++) { p.set(x & 15, y & 15, tone(p, c)); x += dx; y += 1; } } });
  T('mound_moss', p => { p.noise(H('#4a6a2a'), 0.16); p.speck(H('#6a8a3a'), 0.2); p.speck(H('#2e4418'), 0.15); for (let k = 0; k < 3; k++) { const x = 2 + Math.floor(p.rand() * 12), y = 2 + Math.floor(p.rand() * 12); p.set(x, y, H('#c83a2a')); p.set(x + 1, y, H('#c83a2a')); p.set(x, y - 1, H('#e85a3a')); p.set(x + 1, y + 1, H('#e8e0c8')); } for (let k = 0; k < 4; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#d8d8a8')); });
  T('mound_face', p => { p.noise(H('#18200e'), 0.2); for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) if (x < 2 || x > 13 || y < 2) p.set(x, y, tone(p, '#3e5a26', 0.2)); walk(p, '#4a3a22', 4, 7); });
  T('mound_eyes', p => art(p, { 6: '...gG......Gg...', 7: '...gg......gg...' }, { g: '#c8e840', G: '#f8ffa0' }));
  T('mound_root', p => { p.noise(H('#4a3a22'), 0.16); for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) if (p.rand() < 0.7) p.set(x, y, tone(p, '#2e2414')); p.speck(H('#5a7a32'), 0.08); });
  // ---- giant crocodile: an old croc, dark and mossy ----
  T('gcroc_hide', p => { p.noise(H('#3e4a2a'), 0.16); for (let y = 0; y < 16; y += 4) for (let x = (y / 4 % 2) * 2; x < 16; x += 4) { p.set(x, y, H('#222a16')); p.set(x + 1, y + 1, H('#5a6a3a')); p.set(x + 1, y, H('#2e3a1e')); } p.speck(H('#5a6a32'), 0.05); });
  T('gcroc_back', p => { p.noise(H('#2e3a20'), 0.14); for (let y = 0; y < 16; y += 3) for (let x = 1; x < 16; x += 4) { p.set(x, y, H('#6a7a46')); p.set(x + 1, y, H('#5a6a3a')); p.set(x, y + 1, H('#1a2210')); p.set(x + 1, y + 1, H('#1a2210')); } for (let k = 0; k < 3; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#4a6a2a'), 0.15); });

  // ================= the coast and the sea =================
  // ---- merrow: a big grey-green sea brute, fangs, fins ----
  T('merrow_skin', p => { scales(p, '#4a6a5a', '#2a4038', '#7a9a8a'); for (let k = 0; k < 4; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#8aa696'), 0.1); });
  T('merrow_belly', p => { p.noise(H('#a8b89a'), 0.08); for (let y = 1; y < 16; y += 2) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#889a7a', 0.06)); });
  T('merrow_face', p => { scales(p, '#4a6a5a', '#2a4038', '#7a9a8a'); art(p, { 2: '..ddd......ddd..', 3: '..kyk......kyk..', 4: '...k........k...', 6: '......k..k......', 8: '.kkkkkkkkkkkkkk.', 9: '.kwkwkwkwkwkwkk.', 10: '.krrrrrrrrrrrrk.', 11: '.kkwkwkwkwkwkwk.', 12: '..kkkkkkkkkkkk..' }, { d: '#1e322a', k: '#0e1612', y: '#e8d040', w: '#f0ecd8', r: '#6a1e1e' }); });
  T('merrow_fin', p => { p.noise(H('#2a6a6a'), 0.12); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, '#1a4444')); for (let x = 0; x < 16; x++) p.set(x, 0, H('#5aa8a0')); });
  // ---- sahuagin: dark fish-men, black eyes, a mouth full of teeth, red fins ----
  T('sahuagin_scales', p => { scales(p, '#2e5a4e', '#1a3a32', '#4e8a76'); for (let y = 4; y < 16; y += 5) for (let x = 0; x < 16; x++) if (p.rand() < 0.8) p.set(x, y, tone(p, '#14261f')); });
  T('sahuagin_belly', p => { p.noise(H('#b8b870'), 0.08); for (let y = 2; y < 16; y += 3) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#989852', 0.06)); });
  T('sahuagin_face', p => { scales(p, '#2e5a4e', '#1a3a32', '#4e8a76'); art(p, { 2: '.kkkk....kkkk...', 3: '.kkwk....kwkk...', 4: '.kkkk....kkkk...', 5: '..kk......kk....', 8: '..rrrrrrrrrrrr..', 9: '..wkwkwkwkwkwk..', 10: '..kkkkkkkkkkkk..', 11: '..kwkwkwkwkwkw..', 12: '...rrrrrrrrrr...' }, { k: '#06080a', w: '#e8f0ff', r: '#8a2a2a' }); });
  T('sahuagin_fin', p => { p.noise(H('#c8582a'), 0.12); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, '#8a3a1a')); for (let x = 0; x < 16; x++) p.set(x, 0, H('#e8884a')); });
  T('sahuagin_p_fin', p => { p.noise(H('#7a4aa8'), 0.12); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, '#4a2a6a')); for (let x = 0; x < 16; x++) p.set(x, 0, H('#c8a0f0')); });
  T('sahuagin_p_robe', p => { p.noise(H('#2e5a2a'), 0.12); for (let x = 0; x < 16; x++) { const c = ['#2e5a2a', '#4a7a32', '#3a6a4a', '#24481e'][x % 4]; for (let y = 0; y < 16; y++) if (p.rand() < 0.8) p.set(x, y, tone(p, c)); } for (let k = 0; k < 5; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 10), H('#f0e8d8')); band(p, 0, 1, '#7a4aa8'); tatter(p, 11); });
  T('sahuagin_p_crown', p => { p.noise(H('#d86a5a'), 0.14); p.speck(H('#f0c8a0'), 0.15); for (let x = 1; x < 16; x += 4) { p.set(x, 2, H('#f8f0e0')); p.set(x + 1, 2, H('#e8dcc8')); p.set(x, 3, H('#d8c8b0')); } band(p, 14, 15, '#7a4aa8'); });
  // ---- sea hag: the true face, and the fair one she shows from afar ----
  T('seahag_skin', p => { p.noise(H('#7a8a6a'), 0.12); p.speck(H('#5a6a4a'), 0.2); for (let k = 0; k < 4; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 15); p.set(x, y, H('#d0c8b8')); p.set(x + 1, y, H('#b8b0a0')); p.set(x, y + 1, H('#3a3a2a')); } });
  T('seahag_face', p => { p.noise(H('#7a8a6a'), 0.12); p.speck(H('#5a6a4a'), 0.15); art(p, { 2: '.dd.......ddd...', 3: '.dkkd.....dkd...', 4: '.kyYk.....kRk...', 5: '..kk.......k....', 6: '.......nn.......', 7: '......nnn.......', 8: '......nnNn......', 9: '.....k...k......', 11: '..kkkkkkkkkkk...', 12: '..kwk.kwkkwk....', 13: '...kkk.kk.kk....', 14: '..............b.' }, { d: '#3a4a2a', k: '#14180e', y: '#d8d040', Y: '#fff8a0', R: '#c83a2a', n: '#5a6a4a', N: '#a8b090', w: '#d8d0a8', b: '#d0c8b8' }); });
  T('seahag_hair', p => { p.noise(H('#2a4a2a'), 0.15); for (let x = 0; x < 16; x++) { const c = ['#2a4a2a', '#3a5a2a', '#1e321e', '#4a6a3a'][(x * 7) % 4]; for (let y = 0; y < 16; y++) if (p.rand() < 0.75) p.set(x, y, tone(p, c)); } p.set(4, 5, H('#e8e0d0')); p.set(11, 9, H('#d8c8b8')); for (let x = 0; x < 16; x += 2) if (p.rand() < 0.5) for (let y = 13 + Math.floor(p.rand() * 3); y < 16; y++) clear(p, x, y); });
  T('seahag_rags', p => { cloth(p, '#3a4a3a', '#26322a', '#5a6a4a'); for (let k = 0; k < 3; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 12); p.set(x, y, H('#d0c8b8')); p.set(x, y + 1, H('#3a3a2a')); } walk(p, '#2e5a2a', 3, 6); tatter(p, 12); });
  T('seahag_hand', p => { p.noise(H('#7a8a6a'), 0.12); p.speck(H('#5a6a4a'), 0.2); for (let x = 1; x < 16; x += 3) for (let y = 10; y < 16; y++) p.set(x, y, H(y > 13 ? '#3a3a24' : '#22261a')); });
  T('seahag_fair_face', p => { human(p, { skin: '#f0dcc8', hair: '#e8c860', hairRows: 2, eye: '#3a7ad8', mouth: '#c84a5a', brow: '#c8a040' }); p.set(2, 8, H('#f0b0a8')); p.set(13, 8, H('#f0b0a8')); });
  T('seahag_fair_hair', p => { p.noise(H('#e8c860'), 0.1); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.6) p.set(x, y, tone(p, '#c8a040')); p.speck(H('#fff0a0'), 0.06); });
  T('seahag_fair_dress', p => { cloth(p, '#3a7ac8', '#2a5a9a', '#6aa0e0'); band(p, 0, 0, '#f0f0f8'); band(p, 15, 15, '#f0f0f8'); for (let x = 0; x < 16; x += 2) p.set(x, 14, H('#e0e8f8')); p.set(7, 3, H('#f8e8f0')); p.set(8, 3, H('#e8c8d8')); p.set(7, 4, H('#e8c8d8')); });
  // ---- water elemental ----
  T('welem_water', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(mix(H('#5aa8f0'), H('#1e5ab8'), y / 15), 1 + (p.rand() - 0.5) * 0.12)); for (let k = 0; k < 6; k++) { let x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); for (let i = 0; i < 5; i++) { p.set(x & 15, y & 15, H(i % 2 ? '#c8e8ff' : '#a0d4ff')); x++; y += p.rand() < 0.5 ? 1 : 0; } } });
  T('welem_foam', p => { p.noise(H('#e8f4ff'), 0.06); for (let k = 0; k < 6; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#8ac0f0'), 0.1); p.speck(H('#ffffff'), 0.1); });
  T('welem_face', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(mix(H('#5aa8f0'), H('#1e5ab8'), y / 15), 1 + (p.rand() - 0.5) * 0.1)); art(p, { 4: '..ssss....ssss..', 5: '..s..s....s..s..', 6: '..ssss....ssss..', 10: '.....ssssss.....', 11: '....s......s....' }, { s: '#1a4a98' }); });
  T('welem_eyes', p => art(p, { 5: '...cC......Cc...' }, { c: '#c8f8ff', C: '#ffffff' }));
  // ---- giant crab ----
  T('gcrab_shell', p => { p.noise(H('#c8502a'), 0.12); p.speck(H('#8a2e14'), 0.12); for (let k = 0; k < 6; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 15); p.set(x, y, H('#e88a5a')); p.set(x + 1, y + 1, H('#7a2a10')); } });
  T('gcrab_face', p => { p.noise(H('#c8502a'), 0.12); box(p, 4, 6, 11, 13, '#5a1e0e'); for (let y = 7; y < 13; y += 2) for (let x = 5; x < 11; x++) p.set(x, y, tone(p, '#8a3a1e')); p.set(3, 12, H('#e8c8a0')); p.set(12, 12, H('#e8c8a0')); });
  T('gcrab_leg', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, Math.floor(y / 4) % 2 ? '#e8c8a0' : '#c8502a', 0.1)); for (let x = 0; x < 16; x++) { p.set(x, 4, H('#6a2010')); p.set(x, 12, H('#6a2010')); } });
  T('gcrab_claw', p => { p.noise(H('#c8502a'), 0.12); p.speck(H('#8a2e14'), 0.1); for (let x = 0; x < 16; x++) for (let y = 11; y < 16; y++) p.set(x, y, tone(p, '#2a1408')); for (let x = 0; x < 16; x += 2) p.set(x, 11, H('#f0e8d8')); });
  T('gcrab_eye', p => { p.noise(H('#141414'), 0.1); p.set(5, 4, H('#ffffff')); p.set(6, 4, H('#c8c8c8')); });
  // ---- giant octopus ----
  T('goct_skin', p => { p.noise(H('#a83a3a'), 0.12); for (let k = 0; k < 7; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#7a2228'), 0.1); p.speck(H('#d86a5a'), 0.08); });
  T('goct_face', p => { p.noise(H('#a83a3a'), 0.12); p.blob(3, 12, 1, H('#7a2228')); art(p, { 3: '.dYYYd....dYYYd.', 4: '.dkkkd....dkkkd.', 5: '.dYYYd....dYYYd.', 6: '..ddd......ddd..', 12: '.......kk.......', 13: '......kkkk......' }, { d: '#6a1a20', Y: '#e8c040', k: '#100808' }); });
  T('goct_sucker', p => { p.noise(H('#e8b8a8'), 0.08); for (let y = 1; y < 16; y += 4) for (const x0 of [2, 9]) { for (const [dx, dy] of [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]]) p.set(x0 + dx, y + dy, H('#c88a7a')); p.set(x0 + 1, y + 1, H('#f8d8c8')); } });
  // ---- plesiosaurus ----
  T('plesio_skin', p => { p.noise(H('#4a6a7a'), 0.12); for (let k = 0; k < 6; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#2a4a5a'), 0.12); p.speck(H('#7a9aa8'), 0.06); });
  T('plesio_belly', p => { p.noise(H('#c8d8d0'), 0.08); for (let y = 2; y < 16; y += 3) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#a8b8b0', 0.05)); });
  T('plesio_face', p => { p.noise(H('#4a6a7a'), 0.12); art(p, { 3: '.yk..........ky.', 4: '.kk..........kk.', 8: '......k..k......', 11: 'w.w.w.w.w.w.w.w.', 12: 'kkkkkkkkkkkkkkkk', 13: '.w.w.w.w.w.w.w.w' }, { y: '#e8d860', k: '#0a1418', w: '#f0ecd8' }); });
  // ---- the drowned villagers of Aethel: waterlogged, weed-hung, dead-eyed ----
  T('dvill_skin', p => { p.noise(H('#7a9a96'), 0.1); p.speck(H('#5a7a76'), 0.15); walk(p, '#4a7a5a', 2, 5); for (let k = 0; k < 2; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 15); p.set(x, y, H('#d0c8b8')); p.set(x + 1, y, H('#a8a090')); } });
  T('dvill_face', p => { p.noise(H('#7a9a96'), 0.08); p.speck(H('#5a7a76'), 0.1); art(p, { 1: 'ggg.........gggg', 2: 'g............g.g', 4: '..bbbbbbbbbbbb..', 5: '..wwk.....kww...', 6: '..ddd.....ddd...', 13: '.....kkkkkk.....', 14: 'g...............', 15: 'g...............' }, { g: '#3a6a3a', b: '#2a3a38', w: '#d8e8e0', k: '#3a5a58', d: '#5a7a76' }); });
  T('dvill_eyes', p => art(p, { 5: '....c......c....' }, { c: '#b8ffd8' }));
  T('dvill_robe', p => { cloth(p, '#5a4a3a', '#3e3228', '#7a6a52'); for (let k = 0; k < 4; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#3a3028'), 0.1); walk(p, '#3a5a2a', 3, 6); p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#d0c8b8')); });
  T('dvill_hem', p => { cloth(p, '#5a4a3a', '#3e3228', '#7a6a52'); walk(p, '#3a5a2a', 3, 6); tatter(p, 10); });
  T('dvill_hand', p => { cloth(p, '#5a4a3a', '#3e3228', '#7a6a52'); for (let y = 10; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, y > 13 ? '#6a8aa8' : '#7a9a96', 0.08)); });
  T('dvill_kelp', p => { for (const x0 of [3, 8, 12]) for (let y = 0; y < 16; y++) { const x = x0 + Math.round(Math.sin(y * 0.8 + x0) * 1.2); p.set(x, y, tone(p, '#3a6a2a')); p.set(x + 1, y, tone(p, '#4a8a3a')); } });
  // ---- the Leviathan: black-veined, violet-glimmering, the Bloom growing out of it ----
  T('lev_skin', p => { p.noise(H('#1e2a3a'), 0.12); p.speck(H('#2a3e52'), 0.2); walk(p, '#05070a', 4, 9, 0.05); p.speck(H('#6a3a9a'), 0.03); });
  T('lev_belly', p => { p.noise(H('#6a7a8a'), 0.08); for (let y = 1; y < 16; y += 2) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#4a5a6a', 0.06)); });
  T('lev_face', p => { p.noise(H('#1a2432'), 0.12); for (let a = 0; a < 6; a++) { let x = 7.5, y = 7.5; const dx = Math.cos(a), dy = Math.sin(a); for (let i = 0; i < 8; i++) { x += dx + (p.rand() - 0.5) * 0.6; y += dy + (p.rand() - 0.5) * 0.6; p.set(Math.round(x) & 15, Math.round(y) & 15, H(i < 3 ? '#8a3ab8' : '#05070a')); } } p.set(7, 7, H('#e8a0ff')); p.set(8, 8, H('#c060f0')); });
  T('lev_jaw', p => { p.noise(H('#4a1a2a'), 0.12); for (let i = 0; i < 16; i += 2) { p.set(i, 0, H('#f0ecd8')); p.set(i, 1, H('#d8d0b8')); p.set(0, i, H('#f0ecd8')); p.set(15, i, H('#f0ecd8')); p.set(1, i, H('#d8d0b8')); p.set(14, i, H('#d8d0b8')); } });
  T('lev_fin', p => { p.noise(H('#2a3a5a'), 0.1); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, '#141e2e')); for (let x = 0; x < 16; x++) p.set(x, 15, H('#7a4ab8')); });
  T('lev_bloom', p => { p.noise(H('#3a1a4a'), 0.14); walk(p, '#0a060e', 3, 8, 0.05); p.speck(H('#c84ad8'), 0.08); });
  T('lev_bloom_glow', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); p.set(x, y, mix(H('#ffd8ff'), H('#9a2ab8'), clamp(d / 9 + (p.rand() - 0.5) * 0.15, 0, 1))); } for (let a = 0; a < 8; a++) for (let r = 3; r < 8; r++) p.set(Math.round(7.5 + Math.cos(a * 0.785) * r), Math.round(7.5 + Math.sin(a * 0.785) * r), H('#5a1a6a')); });
  T('lev_eye', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, mix(H('#ffffff'), H('#9a3aff'), clamp(Math.hypot(x - 7.5, y - 7.5) / 8, 0, 1))); });

  // ================= the Shadowfell and the Veil =================
  T('ghost_body', p => { p.noise(H('#b8d0e8'), 0.08); for (let x = 1; x < 16; x += 3) for (let y = 0; y < 16; y++) if (p.rand() < 0.7) p.set(x, y, tone(p, '#98b0d0', 0.05)); fade(p, 10); });
  T('ghost_face', p => { p.noise(H('#c8dcf0'), 0.06); art(p, { 0: 'hhhhhhhhhhhhhhhh', 1: 'hhh..........hhh', 2: 'hh............hh', 5: '..kkk.....kkk...', 6: '..kkk.....kkk...', 7: '...k.......k....', 10: '.......kk.......', 11: '......kkkk......', 12: '.......kk.......' }, { h: '#e0ecf8', k: '#2a3a5a' }); });
  T('ghost_hair', p => { p.noise(H('#dce8f4'), 0.06); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.6) p.set(x, y, tone(p, '#b0c4dc', 0.05)); fade(p, 12); });
  T('ghost_eyes', p => art(p, { 6: '...c.......c....' }, { c: '#a0f0ff' }));
  T('echo_fur', p => { fur(p, '#1e1a2a', '#0e0c16', '#3a2e52', 0.3); for (let k = 0; k < 4; k++) { let x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 16); for (let i = 0; i < 4; i++) { p.set(x & 15, y & 15, H('#6a4aa8')); x++; y++; } } });
  T('echo_back', p => { fur(p, '#141020', '#08060e', '#2a2240', 0.35); for (let x = 6; x < 10; x++) for (let y = 0; y < 16; y += 3) p.set(x, y, H('#8a6ad8')); });
  T('echo_face', p => { fur(p, '#1e1a2a', '#0e0c16', '#3a2e52', 0.25); art(p, { 4: '..kkk......kkk..', 5: '..kkk......kkk..' }, { k: '#06040a' }); });
  T('echo_eyes', p => art(p, { 4: '...v........v...', 5: '..vV........Vv..' }, { v: '#b080ff', V: '#f0e0ff' }));
  T('echo_snout', p => { fur(p, '#2a2438', '#141020', '#3a3250', 0.2); art(p, { 2: '......kkkk......', 3: '.......kk.......', 10: 'w.w.w.w.w.w.w.w.', 11: '.w.w.w.w.w.w.w.w' }, { k: '#06040a', w: '#e8e0f8' }); });
  T('shade_body', p => { p.noise(H('#0c0a12'), 0.15); p.speck(H('#16121f'), 0.2); for (let i = 0; i < 16; i++) { p.set(i, 0, H('#2a1e44')); p.set(i, 15, H('#1e1630')); p.set(0, i, H('#241a3a')); p.set(15, i, H('#241a3a')); } });
  T('shade_eyes', p => art(p, { 5: '...WW......WW...', 6: '...ww......ww...' }, { W: '#ffffff', w: '#b8b0ff' }));

  // ================= Duskwood =================
  T('cfey_bark', p => { p.noise(H('#2e2620'), 0.14); for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) if (p.rand() < 0.7) p.set(x, y, tone(p, '#1a1410')); walk(p, '#a04ad8', 2, 7, 0.1); p.speck(H('#5a4a3a'), 0.06); });
  T('cfey_skin', p => { p.noise(H('#9aa89a'), 0.08); p.speck(H('#7a887a'), 0.1); });
  T('cfey_face', p => { p.noise(H('#9aa89a'), 0.06); art(p, { 0: 'hhhhhhhhhhhhhhhh', 1: 'hhhhhhhhhhhhhhhh', 2: 'hh............hh', 3: 'h..kk......kk..h', 4: '...dkk....kkd...', 5: '..kkkk....kkkk..', 7: '.v.....d.......v', 8: '.v.....d......v.', 9: '..v...dd.....v..', 11: '......kkkk......' }, { h: '#2a1e2e', k: '#2a2430', d: '#7a887a', v: '#a04ad8' }); });
  T('cfey_eyes', p => art(p, { 5: '...cC......Cc...' }, { c: '#d8a0ff', C: '#ffffff' }));
  T('cfey_antler', p => { p.noise(H('#2a221a'), 0.12); for (let y = 0; y < 16; y += 3) p.set(Math.floor(p.rand() * 16), y, H('#5a4a3a')); p.speck(H('#a04ad8'), 0.05); });
  T('cfey_cape', p => { cloth(p, '#3a2a4a', '#24182e', '#5a4a6a'); for (let k = 0; k < 4; k++) { const x = Math.floor(p.rand() * 14), y = Math.floor(p.rand() * 10); p.set(x, y, H('#5a7a3a')); p.set(x + 1, y + 1, H('#4a6a2a')); p.set(x + 2, y, H('#5a7a3a')); } tatter(p, 11); });
  T('trick_skin', p => { p.noise(H('#c8a8e0'), 0.06); p.speck(H('#b090d0'), 0.08); });
  T('trick_face', p => { p.noise(H('#c8a8e0'), 0.05); art(p, { 3: '..kkk.....kkk...', 4: '.kWgk....kWgk...', 5: '.kggk....kggk...', 6: '..kk......kk....', 8: '.p............p.', 10: '...k........k...', 11: '....kkkkkkkk....', 12: '.....wwwwww.....' }, { k: '#2a1a3a', W: '#ffffff', g: '#3ab83a', p: '#f0a0c8', w: '#ffffff' }); });
  T('trick_wing', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 2, y - 8) / 14; if (d < 1) p.set(x, y, mix(H('#c8f0ff'), H('#f0b0f0'), d), 150); } for (let a = 0; a < 4; a++) for (let r = 0; r < 13; r++) p.set(Math.round(2 + Math.cos(a * 0.5 - 0.75) * r), Math.round(8 + Math.sin(a * 0.5 - 0.75) * r), H('#ffffff'), 220); });
  T('trick_cap', p => { p.noise(H('#e86a9a'), 0.1); for (let x = 0; x < 16; x += 4) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, '#ffb0d0')); for (let k = 0; k < 4; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#f8e040')); });
  T('trick_cloth', p => { p.noise(H('#5a9a3a'), 0.1); for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) if (Math.abs((x % 8) - 4) === y % 4) p.set(x, y + 2, tone(p, '#3a6a2a')); for (let x = 0; x < 16; x++) { const d = 12 + Math.abs((x % 4) - 2); for (let y = d; y < 16; y++) clear(p, x, y); } });

  // ================= the Redrock desert =================
  T('praider_wrap', p => { cloth(p, '#b8a070', '#94804e', '#d8c898'); for (let k = 0; k < 4; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#a8b040'), 0.15); for (let i = 0; i < 16; i++) { p.set(15 - i, i, tone(p, '#6a5a3a')); } });
  T('praider_head', p => { p.noise(H('#a89060'), 0.1); for (let y = 1; y < 16; y += 3) for (let x = 0; x < 16; x++) p.set(x, (y + (x >> 2)) & 15, tone(p, '#7e6a40')); p.blob(5, 10, 1, H('#a8b040'), 0.15); });
  T('praider_face', p => { skin(p, '#a87a52'); art(p, { 0: 'hhhhhhhhhhhhhhhh', 1: 'hhhhhhhhhhhhhhhh', 2: 'hhhhhhhhhhhhhhhh', 4: '..ddd......ddd..', 5: '..kyk......kyk..', 6: '..ddd......ddd..' }, { h: '#a89060', d: '#7a5a3a', k: '#2a1e10', y: '#e8f040' }); for (let y = 8; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, (x + y) % 4 === 0 ? '#6a7a1e' : '#8a9a2a')); p.blob(10, 12, 1, H('#c8d040'), 0.1); });
  T('praider_eyes', p => art(p, { 5: '...y.......y....' }, { y: '#f8ff80' }));
  T('praider_skin', p => { skin(p, '#a87a52'); for (let k = 0; k < 3; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#c8d040'), 0.12); });
  T('praider_pod', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, mix(H('#ffffa0'), H('#8aa020'), clamp(Math.hypot(x - 7.5, y - 7.5) / 9 + (p.rand() - 0.5) * 0.2, 0, 1))); walk(p, '#5a6a14', 2, 5); });
  T('praider_scarf', p => { cloth(p, '#8a9a2a', '#6a7a1e', '#aab840'); p.speck(H('#d8e050'), 0.06); });
  T('pchief_armor', p => { scales(p, '#8a6a3a', '#5a4220', '#c8a060', 4); for (let k = 0; k < 3; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 1, H('#a8b040'), 0.15); });
  T('pchief_face', p => { metal(p, '#6a5a4a', '#3a3028', '#9a8a72'); art(p, { 4: '.kkkkkkkkkkkkkk.', 5: '.kyykkkkkkkyyk..', 6: '.kkkkkkkkkkkkkk.', 7: '.......kk.......', 8: '.......kk.......', 9: '.......kk.......', 10: '.......kk.......', 11: '..k.k.k..k.k.k..' }, { k: '#0e0a06', y: '#e8f040' }); });
  T('pchief_horn', p => { p.noise(H('#d8d0b0'), 0.08); for (let y = 1; y < 16; y += 3) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#a89a78')); });
  T('pchief_cape', p => { cloth(p, '#7a1e1a', '#5a1210', '#9a3a2a'); for (let k = 0; k < 4; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 12), 1, H('#a8b040'), 0.15); tatter(p, 11); });

  // ================= people =================
  T('m3_skin_a', p => skin(p, '#e8c4a0'));
  T('m3_skin_b', p => skin(p, '#c08a5a'));
  T('m3_skin_c', p => skin(p, '#7a5034'));
  T('m3_boots', p => { p.noise(H('#3a2a1e'), 0.1); band(p, 0, 1, '#4e3a28'); band(p, 14, 15, '#1e1610'); for (let y = 3; y < 12; y += 3) { p.set(7, y, H('#8a7a5a')); p.set(8, y + 1, H('#8a7a5a')); } });
  const sleeve = (p, base, dark, light, skinC, cuff) => { cloth(p, base, dark, light); for (let y = 10; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, skinC, 0.06)); if (cuff) band(p, 9, 9, cuff); };
  // cultist: blood-red hooded robe, a black sigil
  T('cultist_robe', p => { cloth(p, '#6a1a1e', '#4a1014', '#8a2a2e'); band(p, 0, 0, '#1a0a0a'); band(p, 15, 15, '#1a0a0a'); art(p, { 4: '.....kkkkkk.....', 5: '......kkkk......', 6: '.......kk.......' }, { k: '#140606' }); });
  T('cultist_hood', p => { cloth(p, '#4a1216', '#300a0c', '#6a1e22'); band(p, 15, 15, '#1a0606'); });
  T('cultist_face', p => { human(p, { skin: '#d8b494', hair: '#2a1e16', eye: '#c83a2a', mouth: '#5a2a22', brow: '#2a1e16' }); for (let y = 0; y < 5; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(p.get(x, y), 0.55)); });
  T('cultist_fore', p => sleeve(p, '#6a1a1e', '#4a1014', '#8a2a2e', '#d8b494', '#1a0a0a'));
  // cult fanatic: black and crimson, a bone mask
  T('fanatic_robe', p => { cloth(p, '#1e1a1e', '#121012', '#2e2a2e'); for (let i = 0; i < 16; i++) { const x = Math.floor(i * 0.8) + 1; p.set(x, i, H('#a01e1e')); p.set(x + 1, i, H('#7a1414')); p.set(x + 2, i, H('#a01e1e')); } p.set(8, 6, H('#e8e0d0')); p.set(9, 6, H('#e8e0d0')); p.set(8, 7, H('#c8c0b0')); });
  T('fanatic_mask', p => { p.noise(H('#e8e0d0'), 0.05); art(p, { 0: 'hhhhhhhhhhhhhhhh', 1: 'hhh..........hhh', 4: '..kkk.....kkk...', 5: '..krk.....krk...', 6: '..kkk.....kkk...', 7: '...r.......r....', 8: '...r.......r....', 10: '....kkkkkkkk....', 11: '....k.k.k.k.k...', 12: '.....r.r.r.r....' }, { h: '#141014', k: '#140e0e', r: '#a01e1e' }); });
  T('fanatic_hood', p => { cloth(p, '#141014', '#0a080a', '#221e22'); band(p, 15, 15, '#a01e1e'); });
  T('fanatic_fore', p => { sleeve(p, '#1e1a1e', '#121012', '#2e2a2e', '#d0a888', '#a01e1e'); p.set(5, 12, H('#a01e1e')); p.set(9, 13, H('#a01e1e')); });
  // mage: blue robe with silver trim, a pointed hat, a short beard
  T('mage_robe', p => { cloth(p, '#2a4a9a', '#1e367a', '#4a6ac0'); for (let y = 0; y < 16; y++) { p.set(7, y, H('#c8d0e0')); p.set(8, y, H('#a8b0c8')); } band(p, 15, 15, '#c8d0e0'); for (let k = 0; k < 5; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 14), H('#e8e8ff')); });
  T('mage_hat', p => { cloth(p, '#22387a', '#162660', '#34509a'); band(p, 13, 15, '#c8a040'); p.set(4, 14, H('#f0d870')); p.set(11, 14, H('#f0d870')); p.set(6, 5, H('#e8e8ff')); p.set(10, 8, H('#e8e8ff')); });
  T('mage_face', p => { human(p, { skin: '#e0bc98', hair: '#6a5a4a', eye: '#3a6ab8', brow: '#4a3a2a', mouth: '#7a4a3e' }); for (let y = 10; y < 16; y++) for (let x = 2; x < 14; x++) if (!(y === 11 && x >= 6 && x <= 9) && (y > 11 || x < 5 || x > 10)) p.set(x, y, tone(p, '#6a5a4a')); });
  T('mage_hair', p => { p.noise(H('#6a5a4a'), 0.1); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.5) p.set(x, y, tone(p, '#4e4234')); });
  T('mage_fore', p => sleeve(p, '#2a4a9a', '#1e367a', '#4a6ac0', '#e0bc98', '#c8d0e0'));
  // priest acolyte: white and gold, a sun on the chest, a tonsure
  T('acolyte_robe', p => { cloth(p, '#e8e4d8', '#c8c4b8', '#f8f4ec'); band(p, 0, 0, '#c8a040'); band(p, 15, 15, '#c8a040'); for (let a = 0; a < 8; a++) for (let r = 2; r < 4; r++) p.set(Math.round(8 + Math.cos(a * 0.785) * r), Math.round(6 + Math.sin(a * 0.785) * r), H('#d8b040')); p.blob(8, 6, 1, H('#f0c840'), 0.05); });
  T('acolyte_face', p => human(p, { skin: '#c8946a', hair: '#4a3020', hairRows: 2, eye: '#4a3020', brow: '#3a2414', mouth: '#7a4a3a' }));
  T('acolyte_hair', p => { skin(p, '#c8946a'); for (let y = 6; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#4a3020')); });
  T('acolyte_fore', p => sleeve(p, '#e8e4d8', '#c8c4b8', '#f8f4ec', '#c8946a', '#c8a040'));
  // knight: steel plate, a red tabard with a gold cross, a plume, a shield
  T('knight_plate', p => metal(p, '#a8acb4', '#5a5e66', '#e0e4ec'));
  T('knight_helm', p => { metal(p, '#a8acb4', '#5a5e66', '#e0e4ec'); art(p, { 5: '.kkkkkkkkkkkkkk.', 6: '.kkkkkkkkkkkkkk.', 7: '.......ll.......', 8: '.......ll.......', 10: '...k.k.k.k.k....', 12: '...k.k.k.k.k....' }, { k: '#141418', l: '#e0e4ec' }); });
  T('knight_tabard', p => { cloth(p, '#8a1e22', '#6a1418', '#a83a3a'); for (let y = 2; y < 14; y++) { p.set(7, y, H('#e8c040')); p.set(8, y, H('#c8a030')); } for (let x = 3; x < 13; x++) { p.set(x, 6, H('#e8c040')); p.set(x, 7, H('#c8a030')); } band(p, 15, 15, '#e8c040'); });
  T('knight_plume', p => { p.noise(H('#c82a2a'), 0.12); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, '#8a1a1a')); });
  T('knight_shield', p => { p.noise(H('#8a1e22'), 0.1); for (let i = 0; i < 16; i++) { p.set(i, 0, H('#c8c8d0')); p.set(i, 15, H('#8a8a94')); p.set(0, i, H('#c8c8d0')); p.set(15, i, H('#8a8a94')); } for (let i = 1; i < 15; i++) { p.set(i, i, H('#e8c040')); p.set(i + 1 < 15 ? i + 1 : 14, i, H('#c8a030')); } });
  // veteran: chain and leather, a fur mantle, grey and scarred
  T('vet_mail', p => { p.noise(H('#7a7e86'), 0.08); for (let y = 0; y < 16; y++) for (let x = (y % 2); x < 16; x += 2) p.set(x, y, tone(p, '#a8acb4', 0.06)); for (let i = 0; i < 16; i++) { p.set(i, 11, H('#5a3a22')); p.set(i, 12, H('#4a2e1a')); p.set(Math.floor(i * 0.5) + 2, i, H('#5a3a22')); } p.set(7, 11, H('#c8a040')); });
  T('vet_face', p => { human(p, { skin: '#c8a080', hair: '#8a8a8a', hairRows: 2, eye: '#4a5a6a', brow: '#6a6a6a', mouth: '#7a4a3e' }); stubble(p, '#8a8a8a'); for (let i = 0; i < 5; i++) p.set(2 + i, 3 + i, H('#e0a090')); });
  T('vet_hair', p => { p.noise(H('#8a8a8a'), 0.12); p.speck(H('#6a6a6a'), 0.3); });
  T('vet_fur', p => fur(p, '#7a5a3a', '#4a3420', '#a07a52', 0.3));
  T('vet_leg', p => { p.noise(H('#4a3a2a'), 0.1); p.speck(H('#3a2a1e'), 0.2); box(p, 3, 6, 12, 9, '#6a4a2e'); });
  // scout: green hood and cloak, leather, a quiver
  T('scout_leather', p => { p.noise(H('#5a4a2a'), 0.12); for (let y = 2; y < 16; y += 4) for (let x = 0; x < 16; x += 2) p.set(x, y, H('#8a7a5a')); band(p, 11, 12, '#3a5a2e'); p.set(8, 11, H('#c8a040')); });
  T('scout_hood', p => { cloth(p, '#3a5a2e', '#2a4220', '#4e7a3e'); band(p, 15, 15, '#22341a'); });
  T('scout_face', p => human(p, { skin: '#e0b890', hair: '#8a5a2a', eye: '#3a6a2a', brow: '#6a4220', mouth: '#9a5a4a' }));
  T('scout_quiver', p => { p.noise(H('#6a4a2a'), 0.12); for (let y = 0; y < 16; y += 5) band(p, y, y, '#3a2a18'); for (let x = 2; x < 16; x += 3) { p.set(x, 0, H('#f0f0f0')); p.set(x, 1, H('#c83a2a')); } });
  T('scout_leg', p => { cloth(p, '#4a4030', '#3a3224', '#5e523e'); });
  // thug: bald, scarred, a patched sleeveless jerkin
  T('thug_jerkin', p => { p.noise(H('#6a4a2e'), 0.14); p.speck(H('#4a321e'), 0.2); box(p, 2, 3, 6, 7, '#8a6a42'); box(p, 10, 8, 13, 11, '#5a3e24'); for (let x = 2; x <= 6; x++) p.set(x, 3, H('#2a1e14')); band(p, 13, 13, '#c8b080'); });
  T('thug_face', p => { human(p, { skin: '#c8946a', hair: '#8a2a22', hairRows: 2, eye: '#3a2a1a', brow: '#2a1a10', mouth: '#7a4030' }); stubble(p, '#4a3020'); p.set(8, 7, H('#a86a4a')); p.set(11, 2, H('#e0a090')); p.set(12, 3, H('#e0a090')); p.set(12, 4, H('#e0a090')); });
  T('thug_head', p => { skin(p, '#c8946a'); for (let y = 0; y < 5; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#8a2a22')); });
  T('thug_arm', p => { skin(p, '#c08a5a'); for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#6a4a2e')); p.set(5, 8, H('#3a5a8a')); p.set(6, 9, H('#3a5a8a')); p.set(5, 10, H('#3a5a8a')); });
  T('thug_leg', p => { cloth(p, '#3a3a44', '#2a2a32', '#4a4a56'); box(p, 4, 6, 10, 9, '#5a4a3a'); });
  // spy: charcoal leather, a black half-mask, a hood and a short cape
  T('spy_leather', p => { p.noise(H('#2a2a32'), 0.12); for (let i = 0; i < 16; i++) { p.set(i, 10, H('#1a1a1e')); p.set(i, 11, H('#4a4a56')); p.set(15 - i, i, H('#3a3a44')); } p.set(4, 11, H('#a8a8b4')); p.set(11, 11, H('#a8a8b4')); });
  T('spy_face', p => { human(p, { skin: '#e0bc98', hair: '#1a1a1a', eye: '#6a8a5a', brow: '#1a1a1a' }); for (let y = 7; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#141418')); });
  T('spy_hood', p => { cloth(p, '#22222a', '#16161c', '#32323c'); band(p, 15, 15, '#0e0e12'); });
  T('spy_cape', p => { cloth(p, '#1a1a22', '#101016', '#2a2a34'); tatter(p, 12); });
  // guard captain: steel, a blue tabard with a white tower, a crested helm
  T('captain_tabard', p => { cloth(p, '#2a4a8a', '#1e3a6e', '#3e5ea0'); band(p, 0, 0, '#c8d0e0'); band(p, 15, 15, '#c8d0e0'); box(p, 6, 4, 9, 11, '#f0f0f4'); p.set(6, 3, H('#f0f0f4')); p.set(9, 3, H('#f0f0f4')); p.set(7, 9, H('#2a4a8a')); p.set(8, 9, H('#2a4a8a')); });
  T('captain_face', p => { human(p, { skin: '#b8865a', hair: '#3a2a1a', hairRows: 1, eye: '#3a2a1a', brow: '#2a1a10', mouth: '#6a3a2a' }); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#c8ccd4')); p.set(x, 1, H('#8a8e96')); } for (let x = 4; x < 12; x++) if (x < 6 || x > 9) p.set(x, 10, H('#3a2a1a')); });
  T('captain_helm', p => { skin(p, '#b8865a'); for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, y === 7 ? '#5a5e66' : '#a8acb4', 0.05)); for (let y = 8; y < 13; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#3a2a1a')); });
  T('captain_plume', p => { p.noise(H('#f0f0f0'), 0.06); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, '#c8c8d0')); });
  T('captain_cape', p => { cloth(p, '#1e3060', '#14224a', '#2e4480'); band(p, 15, 15, '#c8d0e0'); });
  // archmage: purple with gold stars, a long white beard
  T('archmage_robe', p => { cloth(p, '#4a2a7a', '#341c5a', '#6a4a9a'); band(p, 0, 0, '#e8c040'); band(p, 15, 15, '#e8c040'); for (let k = 0; k < 6; k++) { const x = 1 + Math.floor(p.rand() * 14), y = 2 + Math.floor(p.rand() * 11); p.set(x, y, H('#f8e070')); p.set(x - 1, y, H('#c8a030')); p.set(x + 1, y, H('#c8a030')); p.set(x, y - 1, H('#c8a030')); p.set(x, y + 1, H('#c8a030')); } });
  T('archmage_face', p => { human(p, { skin: '#e0c0a0', hair: '#e8e8ec', hairRows: 2, eye: '#6a3ab8', brow: '#f8f8f8', mouth: '#8a5a4a' }); p.set(2, 6, H('#c8a080')); p.set(13, 6, H('#c8a080')); for (let x = 4; x < 12; x++) p.set(x, 10, H('#f0f0f4')); });
  T('archmage_beard', p => { p.noise(H('#e8e8ec'), 0.06); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.6) p.set(x, y, tone(p, '#c8c8d4', 0.05)); for (let y = 8; y < 16; y++) { const w = Math.floor((y - 8) * 0.7); for (let x = 0; x < w; x++) { clear(p, x, y); clear(p, 15 - x, y); } } });
  T('archmage_hair', p => { p.noise(H('#e8e8ec'), 0.06); for (let x = 1; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.6) p.set(x, y, tone(p, '#c0c0cc', 0.05)); });
  T('archmage_gold', p => { p.noise(H('#e8c040'), 0.1); p.speck(H('#fff0a0'), 0.12); for (let x = 3; x < 16; x += 6) { p.set(x, 7, H('#8a3ad8')); p.set(x, 8, H('#c070ff')); } });
  T('archmage_fore', p => { sleeve(p, '#4a2a7a', '#341c5a', '#6a4a9a', '#e0c0a0', '#e8c040'); });

  // ---- the spells and spatters they throw about ----
  T('m3_ink', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 8; if (d < 1) p.set(x, y, shade(H('#0a0a14'), 1 + (p.rand() - 0.5) * 0.4), Math.round(255 * (1 - d * d))); } });
  T('m3_spore', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 8; if (d < 1) p.set(x, y, mix(H('#f8ff90'), H('#8aa020'), d), Math.round(255 * (1 - d))); } });
  T('m3_psy', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 8; if (d < 1 && d > 0.45) p.set(x, y, mix(H('#f0c8ff'), H('#8a2ad8'), (d - 0.45) * 1.8)); } });
  T('m3_glow', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 8; if (d < 1) p.set(x, y, mix(H('#f8fff0'), H('#7affb8'), d), Math.round(255 * (1 - d) ** 1.5)); } });
  T('m3_bubble', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 7; if (d < 1 && d > 0.7) p.set(x, y, H('#d8f0ff')); } p.set(5, 5, H('#ffffff')); p.set(6, 5, H('#ffffff')); });

  // ---- item pictures ----
  const I = (n, f) => addItem(n, f);
  I('troll_blood', p => { for (let y = 5; y < 15; y++) for (let x = 4; x < 12; x++) if (Math.hypot(x - 7.5, y - 10) < 4.2) p.set(x, y, y < 8 ? H('#c8e0e8') : shade(H('#3a7a2a'), 0.9 + p.rand() * 0.3)); for (let y = 1; y < 5; y++) { p.set(7, y, H('#c8e0e8')); p.set(8, y, H('#a8c0c8')); } p.set(7, 0, H('#7a5430')); p.set(8, 0, H('#7a5430')); p.set(6, 10, H('#9aea6a')); p.set(9, 12, H('#1e4a14')); });
  I('mound_heart', p => { p.blob(8, 9, 5, H('#3e5a26'), 0.2); for (let k = 0; k < 10; k++) { let x = 3 + Math.floor(p.rand() * 10), y = 4 + Math.floor(p.rand() * 10); for (let i = 0; i < 3; i++) { p.set(x, y, H(k % 2 ? '#6a5a32' : '#2a4018')); x++; y++; } } p.blob(8, 9, 1, H('#a84a3a'), 0.1); });
  I('sahuagin_tooth', p => { for (let y = 2; y < 14; y++) { const w = Math.floor((14 - y) / 2.5); for (let x = 7 - w; x <= 7 + w; x++) p.set(x, y, x === 7 - w ? H('#ffffff') : H('#e0e8e0')); if (y % 2 === 0) p.set(8 + w, y, H('#b0b8b0')); } for (let x = 4; x < 11; x++) p.set(x, 14, H('#8a2a2a')); });
  I('hag_eye', p => { p.blob(8, 8, 5, H('#d8d040'), 0.1); p.blob(8, 8, 2, H('#14180e'), 0.05); p.set(6, 6, H('#ffffff')); for (let i = 0; i < 4; i++) { p.set(2 + i, 12 + (i % 2), H('#a83a2a')); p.set(13 - i, 3 + (i % 2), H('#a83a2a')); } });
  I('elemental_core_water', p => { for (let y = 2; y < 15; y++) for (let x = 2; x < 15; x++) { const d = Math.hypot(x - 8, y - 8.5); if (d < 6) p.set(x, y, mix(H('#c8f0ff'), H('#1e5ab8'), d / 6)); } p.set(6, 5, H('#ffffff')); p.set(7, 5, H('#ffffff')); p.set(6, 6, H('#ffffff')); });
  I('crab_shell', p => { for (let y = 3; y < 14; y++) for (let x = 1; x < 15; x++) if (((x - 8) / 7) ** 2 + ((y - 8.5) / 5.5) ** 2 < 1) p.set(x, y, shade(H('#c8502a'), 0.85 + p.rand() * 0.3)); for (let x = 3; x < 13; x++) p.set(x, 5, H('#e88a5a')); p.set(5, 9, H('#7a2a10')); p.set(10, 9, H('#7a2a10')); });
  I('leviathan_scale', p => { for (let y = 2; y < 15; y++) for (let x = 2; x < 14; x++) if (Math.abs(x - 7.5) + Math.abs(y - 8) * 0.8 < 6.5) p.set(x, y, shade(H('#1e2a3a'), 0.85 + p.rand() * 0.3)); for (let i = 0; i < 6; i++) p.set(8 - Math.floor(i / 2), 4 + i, H('#8a3ab8')); p.set(6, 5, H('#4a6a8a')); });
  I('bloomed_pearl', p => { for (let y = 2; y < 15; y++) for (let x = 2; x < 15; x++) { const d = Math.hypot(x - 8, y - 8.5); if (d < 5.5) p.set(x, y, mix(H('#ffe8ff'), H('#8a2ab8'), d / 5.5)); } for (let a = 0; a < 5; a++) p.set(Math.round(8 + Math.cos(a * 1.26) * 4), Math.round(8.5 + Math.sin(a * 1.26) * 4), H('#2a0a3a')); p.set(6, 6, H('#ffffff')); });
  I('echo_fang', p => { for (let y = 2; y < 15; y++) { const w = Math.floor((15 - y) / 3); for (let x = 5 - w; x <= 5 + w; x++) { p.set(x, y, H('#e8e0f8')); p.set(x + 4, y, H('#8a6ad8')); } } });
  I('living_shadow', p => { for (let y = 2; y < 15; y++) for (let x = 3; x < 13; x++) if (Math.hypot(x - 8, y - 8.5) < 5.5 + Math.sin(y * 1.3 + x) * 0.8) p.set(x, y, shade(H('#141020'), 0.8 + p.rand() * 0.4)); p.set(6, 7, H('#ffffff')); p.set(10, 7, H('#ffffff')); });
  I('thorned_antler', p => { for (let i = 0; i < 12; i++) { p.set(3 + i, 14 - i, H('#2a221a')); p.set(4 + i, 14 - i, H('#4a3a2a')); } for (const [x, y] of [[6, 11], [9, 8], [12, 5]]) { p.set(x - 1, y - 1, H('#2a221a')); p.set(x - 2, y - 2, H('#a04ad8')); } });
  I('fey_glimmer', p => { p.blob(8, 8, 3, H('#f0c8ff'), 0.1); p.set(8, 8, H('#ffffff')); for (const [x, y] of [[8, 2], [8, 14], [2, 8], [14, 8], [4, 4], [12, 12]]) p.set(x, y, H('#e8a0ff')); });
  I('blight_spores', p => { for (let y = 5; y < 15; y++) for (let x = 4; x < 12; x++) if (Math.hypot(x - 7.5, y - 10) < 4.2) p.set(x, y, y < 8 ? H('#c8e0e8') : shade(H('#a8c030'), 0.85 + p.rand() * 0.3)); for (let y = 1; y < 5; y++) { p.set(7, y, H('#c8e0e8')); p.set(8, y, H('#a8c0c8')); } p.set(7, 0, H('#7a5430')); p.set(8, 0, H('#7a5430')); p.set(6, 11, H('#f8ff90')); p.set(9, 9, H('#f8ff90')); });
}

// ---- 4. bodies -----------------------------------------------------------------------------------------
{
  const D = {};
  const glowOver = (name, parent, b, tex) => [name, parent, [0, 0, 0], b, tex, { glow: true, noCull: true }];
  const ear = (name, at, w, h, tex, rest) => [name, 'head', at, [-w / 2, 0, -0.5, w / 2, h, 0.5], tex, { role: 'ear', rest: rest || [0, 0, 0] }];
  // people: the classic proportions, and a kit of things to wear
  const HB = (tex, extras, o = {}) => { const d = bipedRig(Object.assign({ head: [8, 8, 8], body: [8, 12, 4], arm: [4, 12, 4], leg: [4, 12, 4], tex, extras }, o)); d.post = o.post || 'm3_bip'; if (o.scale) d.scale = o.scale; return d; };
  const lean = (d, body, head) => { for (const p of d.parts) { if (p.name === 'body') p.rest = [-body, 0, 0]; if (p.name === 'head') p.rest = [-head, 0, 0]; } return d; };
  const X = {
    hood: (t) => ['hood', 'head', [0, 0, 0.4], [-4.6, -0.4, -4.5, 4.6, 8.9, 4.4], { all: t, front: false }, { noCull: true }],
    skirt: (t, len = 9, w = 4.6, d = 2.6) => ['skirt', 'body', [0, 0, 0], [-w, -len, -d, w, 0.5, d], t, { noCull: true }],
    cape: (t, len = 17, w = 4.5) => ['cape', 'body', [0, 12, 2.1], [-w, -len, 0, w, 0, 0.7], t, { noCull: true, rest: [-0.12, 0, 0] }],
    pauld: (t, s, w = 2.7) => ['pauld' + (s > 0 ? 'R' : 'L'), 'arm' + (s > 0 ? 'R' : 'L'), [0, 0, 0], [-w, -2.2, -w, w, 1.6, w], t],
    plume: (t, parent = 'head', y = 8) => ['plume', parent, [0, y, 0], [-0.6, 0, -3.5, 0.6, 3, 3.5], t, { noCull: true }],
    shield: (t) => ['shield', 'foreL', [-2.4, -2.5, 0], [-0.7, -4.5, -4, 0.5, 4, 4], t],
  };

  // ================= the marshes =================
  const lizard = (sc, face, snoutT, belly, extra) => lean(HB({ head: { all: sc, front: face }, body: { all: sc, front: belly }, arm: sc, leg: sc }, [
    ['snout', 'head', [0, 0.3, -3.5], [-2.5, 0, -5, 2.5, 3, 0], { all: sc, front: snoutT, bottom: 'lizardfolk_belly' }],
    ['crest', 'head', [0, 7, 0.5], [-0.4, 0, -3, 0.4, 3, 3.5], 'lizardfolk_crest', { noCull: true }],
    ['spines', 'body', [0, 2, 2.5], [-0.4, 0, 0, 0.4, 10, 1.6], 'lizardfolk_crest', { noCull: true }],
    ['tail', 'body', [0, 1.5, 2], [-2, -2, 0, 2, 2, 7], sc, { role: 'tail', rest: [0.45, 0, 0] }],
    ['tail2', 'tail', [0, 0, 7], [-1.4, -1.5, 0, 1.4, 1.5, 7], sc, { rest: [0.3, 0, 0] }],
    ['loin', 'body', [0, 0, 0], [-4.4, -4.5, -2.9, 4.4, 1.5, 2.9], 'lizardfolk_hide', { noCull: true }],
  ].concat(extra), { head: [7, 7, 7], body: [8, 12, 5], arm: [3, 12, 3], leg: [4, 11, 4], legX: 2, armX: 5.5 }), 0.18, -0.18);
  D.lizardfolk = lizard('lizardfolk_scales', 'lizardfolk_face', 'lizardfolk_snout', 'lizardfolk_belly', [X.shield('lizardfolk_shield')]);
  D.lizardfolk_shaman = lizard('lizard_shaman_scales', 'lizard_shaman_face', 'lizard_shaman_snout', 'lizardfolk_belly', [
    ['featherC', 'head', [0, 6, 2.5], [-1.2, 0, -0.3, 1.2, 8, 0.3], 'lizard_shaman_feather', { noCull: true, rest: [0.35, 0, 0] }],
    ['featherL', 'head', [-2, 6, 2.5], [-1.2, 0, -0.3, 1.2, 7, 0.3], 'lizard_shaman_feather', { noCull: true, rest: [0.35, 0, 0.45] }],
    ['featherR', 'head', [2, 6, 2.5], [-1.2, 0, -0.3, 1.2, 7, 0.3], 'lizard_shaman_feather', { noCull: true, rest: [0.35, 0, -0.45] }],
    ['beads', 'body', [0, 11.5, -2.6], [-3.6, -6, -0.3, 3.6, 0.5, 0.1], 'lizard_shaman_beads', { noCull: true }],
    ['robe', 'body', [0, 0, 0], [-4.6, -8, -3, 4.6, 1, 3], 'lizardfolk_hide', { noCull: true }],
  ]);
  D.giant_frog = frogRig({ scale: 2.3, tex: { skin: 'gfrog_skin', head: { all: 'gfrog_skin', front: 'gfrog_face' }, eye: 'gfrog_eye', belly: 'gfrog_belly' } });
  for (const p of D.giant_frog.parts) if (p.name === 'body' || p.name === 'throat') p.tex = p.name === 'body' ? { all: 'gfrog_skin', bottom: 'gfrog_belly' } : 'gfrog_belly';
  D.troll = lean(HB({ head: { all: 'troll_hair', front: 'troll_face', bottom: 'troll_skin' }, body: 'troll_skin', arm: 'troll_skin', fore: 'troll_claw', leg: 'troll_skin' }, [
    ['nose', 'head', [0, 3.5, -4], [-1, -3, -3.5, 1, 1, 0], 'troll_skin', { rest: [0.35, 0, 0] }],
    ear('earL', [-4, 5, -1], 3, 1.5, 'troll_skin', [0, 0.3, 1.2]), ear('earR', [4, 5, -1], 3, 1.5, 'troll_skin', [0, -0.3, -1.2]),
    ['mane', 'head', [0, 9, 1.5], [-4.6, -13, 0, 4.6, 0.6, 3], 'troll_hair', { noCull: true, rest: [-0.12, 0, 0] }],
    ['tuskL', 'head', [-2.5, 0.5, -4], [-0.5, 0, -0.8, 0.5, 2.2, 0], 'white'], ['tuskR', 'head', [2.5, 0.5, -4], [-0.5, 0, -0.8, 0.5, 2.2, 0], 'white'],
    ['loin', 'body', [0, 0, 0], [-7.4, -7, -4.4, 7.4, 2, 4.4], 'troll_loin', { noCull: true }],
    ['belly', 'body', [0, 2, -4], [-5.5, 0, -1.5, 5.5, 9, 0], 'troll_skin'],
  ], { head: [8, 9, 8], body: [14, 16, 8], arm: [5, 26, 5], leg: [6, 16, 6], armX: 9.5, legX: 4, heavy: true }), 0.38, -0.42);
  D.shambling_mound = HB({ head: { all: 'mound_moss', front: 'mound_face' }, body: 'mound_vines', arm: 'mound_vines', fore: 'mound_root', leg: 'mound_root' }, [
    glowOver('eyes', 'head', [-5, 0, -5.12, 5, 8, -5.06], 'mound_eyes'),
    ['lump1', 'body', [5, 15, -3], [-4, 0, -4, 4, 6, 4], 'mound_moss'], ['lump2', 'body', [-6, 11, 4], [-4, 0, -3, 4, 7, 4], 'mound_moss'],
    ['lump3', 'body', [0, 18, 3], [-6, 0, -4, 6, 5, 4], 'mound_vines'], ['lump4', 'body', [-7, 3, -5], [-3, 0, -3, 3, 8, 3], 'mound_moss'],
    ['skirt', 'body', [0, 2, 0], [-9.8, -7, -7.8, 9.8, 1, 7.8], 'mound_vines', { noCull: true }],
    ['vine1', 'body', [-6, 6, -7.3], [-0.6, -9, -0.4, 0.6, 0, 0.4], 'mound_root', { noCull: true }], ['vine2', 'body', [3, 9, -7.3], [-0.6, -11, -0.4, 0.6, 0, 0.4], 'mound_root', { noCull: true }],
    ['vine3', 'body', [8, 12, 2], [-0.4, -12, -0.6, 0.4, 0, 0.6], 'mound_root', { noCull: true }], ['vine4', 'foreR', [1, -6, 0], [-0.4, -6, -0.4, 0.4, 0, 0.4], 'mound_root', { noCull: true }],
    ['vine5', 'foreL', [-1, -6, 0], [-0.4, -7, -0.4, 0.4, 0, 0.4], 'mound_root', { noCull: true }],
  ], { head: [10, 8, 10], body: [18, 20, 14], arm: [6, 20, 6], leg: [6, 6, 6], armX: 12, legX: 5, heavy: true });
  D.giant_crocodile = quadRig({
    body: [10, 6, 26], leg: [3, 4], head: [8, 5, 7], headAt: [0, 0], tail: [6, 5, 22], tailRest: 0.05, legInset: -1.5, scale: 1.75, post: 'm3_jaw',
    tex: { body: { all: 'gcroc_hide', top: 'gcroc_back', bottom: 'croc_belly' }, head: { all: 'gcroc_hide', front: 'croc_face', top: 'gcroc_back' }, leg: 'gcroc_hide', tail: { all: 'gcroc_hide', top: 'gcroc_back' } },
    extras: [['jaw', 'head', [0, -1, -7], [-3.5, -1.5, -9, 3.5, 1, 0], { all: 'croc_jaw', top: 'gcroc_back' }, { role: 'jaw' }],
      ['snout', 'head', [0, 1, -7], [-3, -1, -9, 3, 1.5, 0], { all: 'gcroc_hide', top: 'gcroc_back', front: 'croc_jaw' }],
      ['ridge', 'body', [0, 3, 0], [-2.5, 0, -12, 2.5, 1.5, 12], 'gcroc_back'], ['tridge', 'tail', [0, 0, 0], [-1.2, 0, 0, 1.2, 1.5, 20], 'gcroc_back']],
  });

  // ================= the coast and the sea =================
  // merrow: a big hunched sea-brute on a fish's tail
  {
    const sk = 'merrow_skin', P = [
      rpart('hips', null, [0, 9, 0], [-5, -4, -4, 5, 4, 4], sk, { role: 'hips' }),
      rpart('body', 'hips', [0, 4, 0], [-7, 0, -4.5, 7, 14, 4.5], { all: sk, front: 'merrow_belly' }, { role: 'body', rest: [-0.3, 0, 0] }),
      rpart('head', 'body', [0, 14, -1.5], [-4, -1, -6, 4, 7, 2], { all: sk, front: 'merrow_face' }, { role: 'head', limb: 'head', rest: [0.3, 0, 0] }),
      rpart('crest', 'head', [0, 7, -1], [-0.4, 0, -3, 0.4, 4, 4], 'merrow_fin', { noCull: true }),
      rpart('dorsal', 'body', [0, 6, 4.5], [-0.4, 0, -1, 0.4, 8, 3], 'merrow_fin', { noCull: true }),
      rpart('tail1', 'hips', [0, -2, 1], [-4.5, -4, 0, 4.5, 3.5, 9], sk, { role: 'tail1', rest: [0.75, 0, 0] }),
      rpart('tail2', 'tail1', [0, 0, 9], [-3.5, -3, 0, 3.5, 3, 8], sk, { role: 'tail2', rest: [-0.75, 0, 0] }),
      rpart('tail3', 'tail2', [0, 0, 8], [-2.5, -2, 0, 2.5, 2, 6], sk, { role: 'tail3', rest: [-0.15, 0, 0] }),
      rpart('fluke', 'tail3', [0, 0, 6], [-6, -0.5, 0, 6, 0.5, 6], 'merrow_fin', { noCull: true }),
    ];
    for (const s of [1, -1]) {
      const S = s > 0 ? 'R' : 'L';
      P.push(rpart('arm' + S, 'body', [s * 8.5, 12, 0], [-2, -9, -2, 2, 2, 2], sk, { role: 'arm' + S, limb: 'arm' + S }));
      P.push(rpart('fore' + S, 'arm' + S, [0, -9, 0], [-2, -10, -2, 2, 0, 2], { all: sk, bottom: 'seahag_hand' }, { role: 'fore' + S, limb: 'arm' + S, hand: [0, -9, 0] }));
      P.push(rpart('fin' + S, 'fore' + S, [s * 2, -2, 0], s > 0 ? [0, -6, -0.3, 2, 0, 0.3] : [-2, -6, -0.3, 0, 0, 0.3], 'merrow_fin', { noCull: true }));
    }
    D.merrow = finishRig('m3_merfolk', P, { hipY: 9, height: 36 });
  }
  const sahuagin = (fin, extra) => lean(HB({ head: { all: 'sahuagin_scales', front: 'sahuagin_face' }, body: { all: 'sahuagin_scales', front: 'sahuagin_belly' }, arm: 'sahuagin_scales', leg: 'sahuagin_scales' }, [
    ['crest', 'head', [0, 7, 1], [-0.4, -2, -3, 0.4, 3.5, 5], fin, { noCull: true }],
    ['finL', 'head', [-3.5, 3.5, 1], [-3, -1.5, -0.3, 0, 2.5, 0.3], fin, { noCull: true, rest: [0, 0.4, 0] }], ['finR', 'head', [3.5, 3.5, 1], [0, -1.5, -0.3, 3, 2.5, 0.3], fin, { noCull: true, rest: [0, -0.4, 0] }],
    ['dorsal', 'body', [0, 2, 2.5], [-0.4, 0, 0, 0.4, 11, 3], fin, { noCull: true }],
    ['tail', 'body', [0, 1, 2.5], [-1.5, -1.5, 0, 1.5, 1.5, 7], 'sahuagin_scales', { role: 'tail', rest: [0.7, 0, 0] }],
    ['ffinR', 'foreR', [1.5, -1, 0], [0, -5, -0.3, 1.8, 0, 0.3], fin, { noCull: true }], ['ffinL', 'foreL', [-1.5, -1, 0], [-1.8, -5, -0.3, 0, 0, 0.3], fin, { noCull: true }],
  ].concat(extra), { head: [7, 7, 8], body: [8, 12, 5], arm: [3, 12, 3], leg: [4, 12, 4], legX: 2, armX: 5.5 }), 0.2, -0.2);
  D.sahuagin = sahuagin('sahuagin_fin', []);
  D.sahuagin_priestess = sahuagin('sahuagin_p_fin', [['robe', 'body', [0, 0, 0], [-4.6, -9, -3, 4.6, 1, 3], 'sahuagin_p_robe', { noCull: true }],
    ['crown', 'head', [0, 6.5, 0], [-3.9, 0, -4.4, 3.9, 2.5, 4.2], { all: 'sahuagin_p_crown', top: false, bottom: false }, { noCull: true }]]);
  // sea hag: hunched, weed-haired, clawed; and the fair face she wears from afar
  D.sea_hag = lean(HB({ head: { all: 'seahag_hair', front: 'seahag_face', bottom: 'seahag_skin' }, body: 'seahag_rags', arm: 'seahag_skin', fore: 'seahag_hand', leg: 'seahag_skin' }, [
    ['hair', 'head', [0, 8.3, 1.5], [-4.6, -15, -0.5, 4.6, 0.6, 3.2], 'seahag_hair', { noCull: true, rest: [-0.12, 0, 0] }],
    ['hairL', 'head', [-3.7, 1.5, -3.8], [-0.9, -9, -0.5, 0.9, 0, 0.5], 'seahag_hair', { noCull: true }], ['hairR', 'head', [3.7, 1.5, -3.8], [-0.9, -10, -0.5, 0.9, 0, 0.5], 'seahag_hair', { noCull: true }],
    X.skirt('seahag_rags', 10, 4.8, 3), ['hump', 'body', [0, 8, 2.5], [-3.5, -3, 0, 3.5, 2.5, 2], 'seahag_rags'],
  ], { head: [8, 8, 8], body: [8, 11, 5], arm: [3, 13, 3], leg: [3, 11, 3], legX: 2, armX: 5.5, armsReach: true }), 0.42, -0.35);
  D.sea_hag_fair = HB({ head: { all: 'seahag_fair_hair', front: 'seahag_fair_face' }, body: 'seahag_fair_dress', arm: 'seahag_fair_dress', fore: 'm3_skin_a', leg: 'seahag_fair_dress', shin: 'm3_skin_a' }, [
    ['hair', 'head', [0, 8.3, 1.5], [-4.6, -14, -0.5, 4.6, 0.6, 3.2], 'seahag_fair_hair', { noCull: true, rest: [-0.08, 0, 0] }],
    X.skirt('seahag_fair_dress', 11, 4.9, 3.1),
  ], { head: [8, 8, 8], body: [8, 11, 5], arm: [3, 13, 3], leg: [3, 11, 3], legX: 2, armX: 5.5 });
  // water elemental: a column of water with a breaking wave for a head
  D.water_elemental = finishRig('m3_welem', [
    rpart('base', null, [0, 0, 0], [-7, 0, -7, 7, 3.5, 7], 'welem_foam', { role: 'base', alpha: 0.85, noCull: true }),
    rpart('body', null, [0, 3.5, 0], [-5.5, 0, -5.5, 5.5, 15, 5.5], 'welem_water', { role: 'body', alpha: 0.72, noCull: true }),
    rpart('ring1', null, [0, 6, 0], [-7.5, -1.5, -7.5, 7.5, 1.5, 7.5], 'welem_foam', { role: 'ring', alpha: 0.55, noCull: true }),
    rpart('ring2', null, [0, 14, 0], [-7, -1.3, -7, 7, 1.3, 7], 'welem_water', { role: 'ring', alpha: 0.6, noCull: true }),
    rpart('head', 'body', [0, 15, 0], [-6, 0, -6, 6, 9, 6], { all: 'welem_water', front: 'welem_face' }, { role: 'head', limb: 'head', alpha: 0.8, noCull: true }),
    rpart('eyes', 'head', [0, 0, 0], [-6, 0, -6.1, 6, 9, -6.05], 'welem_eyes', { glow: true, noCull: true }),
    rpart('crest', 'head', [0, 9, 3], [-5, 0, -7, 5, 4.5, 3], 'welem_foam', { rest: [-0.45, 0, 0], alpha: 0.8, noCull: true }),
    rpart('armR', 'body', [7, 13, 0], [-2.5, -12, -2.5, 2.5, 1.5, 2.5], 'welem_water', { role: 'armR', alpha: 0.7, noCull: true, rest: [0, 0, 0.12] }),
    rpart('foreR', 'armR', [0, -12, 0], [-3, -4, -3, 3, 0, 3], 'welem_foam', { role: 'foreR', alpha: 0.8, noCull: true, hand: [0, -2, 0] }),
    rpart('armL', 'body', [-7, 13, 0], [-2.5, -12, -2.5, 2.5, 1.5, 2.5], 'welem_water', { role: 'armL', alpha: 0.7, noCull: true, rest: [0, 0, -0.12] }),
    rpart('foreL', 'armL', [0, -12, 0], [-3, -4, -3, 3, 0, 3], 'welem_foam', { role: 'foreL', alpha: 0.8, noCull: true, hand: [0, -2, 0] }),
  ], { hipY: 10, height: 33, scale: 1.12 });
  // giant crab: walks on the spider's gait
  {
    const P = [
      rpart('thorax', null, [0, 6, 0], [-6, -2, -5, 6, 3, 5], { all: 'gcrab_shell', front: 'gcrab_face', bottom: 'gcrab_leg' }, { role: 'sbody' }),
      rpart('carapace', 'thorax', [0, 3, 0.5], [-7.5, 0, -6, 7.5, 2.5, 6], 'gcrab_shell'),
      rpart('head', 'thorax', [0, 1, -5], [-3, -1, -1, 3, 1.5, 0], 'gcrab_face', { role: 'shead', limb: 'head' }),
    ];
    for (const s of [1, -1]) {
      const S = s > 0 ? 'R' : 'L';
      P.push(rpart('eye' + S, 'head', [s * 2, 1.5, -0.5], [-0.4, 0, -0.4, 0.4, 3, 0.4], 'gcrab_leg'));
      P.push(rpart('eyeb' + S, 'eye' + S, [0, 3, 0], [-0.8, 0, -0.8, 0.8, 1.4, 0.8], 'gcrab_eye'));
      P.push(rpart('arm' + S, 'thorax', [s * 5, 0.5, -4.5], [-1, -1, -6, 1, 1, 0], 'gcrab_leg', { rest: [0.15, s * -0.45, 0], limb: 'arm' + S }));
      P.push(rpart('claw' + S, 'arm' + S, [0, 0, -6], [-2.2, -1.5, -5, 2.2, 2, 0], 'gcrab_claw', { rest: [0, s * 0.7, 0], limb: 'arm' + S }));
      P.push(rpart('pincer' + S, 'claw' + S, [0, -1.5, -1], [-1.5, -1.2, -4, 1.5, 0, 0], 'gcrab_claw', { role: 'pincer', limb: 'arm' + S }));
      for (let i = 0; i < 3; i++) {
        const z = -2 + i * 2.5, k = S + i;
        P.push(rpart('sleg' + k, 'thorax', [s * 5.5, 0, z], s > 0 ? [0, -0.8, -0.8, 6, 0.8, 0.8] : [-6, -0.8, -0.8, 0, 0.8, 0.8], 'gcrab_shell', { role: 'sleg', idx: i + 1, side: s, rest: [0, s * (0.3 - i * 0.3), s * 0.5], limb: 'sleg' + k }));
        P.push(rpart('sshin' + k, 'sleg' + k, [s * 6, 0, 0], [-0.7, -11, -0.7, 0.7, 0, 0.7], 'gcrab_leg', { role: 'sshin', idx: i + 1, side: s, rest: [0, 0, s * 0.1], limb: 'sleg' + k }));
      }
    }
    D.giant_crab = finishRig('spider', P, { height: 16, post: 'm3_crab' });
  }
  // giant octopus: a head with a big mantle behind, eight arms in two pieces
  {
    const P = [
      rpart('body', null, [0, 8, 0], [-5, -4, -5, 5, 4, 5], { all: 'goct_skin', front: 'goct_face' }, { role: 'obody', limb: 'head' }),
      rpart('mantle', 'body', [0, 2, 2], [-6, 0, -2, 6, 11, 9], 'goct_skin', { role: 'mantle', rest: [0.45, 0, 0] }),
    ];
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + Math.PI / 8;
      P.push(rpart('arm' + i, 'body', [-Math.sin(a) * 3.5, -3.5, -Math.cos(a) * 3.5], [-1.3, -1.1, -9, 1.3, 1.1, 0], { all: 'goct_skin', bottom: 'goct_sucker' }, { role: 'oarm', idx: i, rest: [-0.4, a, 0] }));
      P.push(rpart('armb' + i, 'arm' + i, [0, 0, -9], [-0.9, -0.8, -9, 0.9, 0.8, 0], { all: 'goct_skin', bottom: 'goct_sucker' }, { role: 'oarmb', idx: i, rest: [0.45, 0, 0] }));
    }
    D.giant_octopus = finishRig('m3_octo', P, { hipY: 8, height: 22, scale: 1.25 });
  }
  // plesiosaurus: flippers on the turtle's stroke, a long neck that strikes
  {
    const P = [
      rpart('body', null, [0, 6, 0], [-7, -4, -11, 7, 5, 11], { all: 'plesio_skin', bottom: 'plesio_belly' }, { role: 'shell' }),
      rpart('neck', 'body', [0, 2, -10], [-2.5, 0, -2.5, 2.5, 18, 2.5], { all: 'plesio_skin', front: 'plesio_belly' }, { role: 'neck', rest: [-0.95, 0, 0] }),
      rpart('neck2', 'neck', [0, 18, 0], [-2, 0, -2, 2, 10, 2], { all: 'plesio_skin', front: 'plesio_belly' }, { role: 'neck2', rest: [0.5, 0, 0] }),
      rpart('head', 'neck2', [0, 10, 0], [-3, -2, -8, 3, 3, 1.5], { all: 'plesio_skin', front: 'plesio_face', bottom: 'plesio_belly' }, { role: 'thead', limb: 'head', rest: [0.45, 0, 0] }),
      rpart('tail', 'body', [0, 1, 11], [-2.5, -2, 0, 2.5, 2, 12], 'plesio_skin', { role: 'tail', rest: [0.15, 0, 0] }),
    ];
    for (const s of [1, -1]) {
      const S = s > 0 ? 'R' : 'L';
      P.push(rpart('flipF' + S, null, [s * 6.5, 3, -6], s > 0 ? [0, -0.8, -3, 10, 0.6, 3] : [-10, -0.8, -3, 0, 0.6, 3], { all: 'plesio_skin', bottom: 'plesio_belly' }, { role: 'flip', front: true, side: s, limb: 'flipF' + S }));
      P.push(rpart('flipB' + S, null, [s * 6.5, 3, 7], s > 0 ? [0, -0.8, -2.5, 8, 0.6, 2.5] : [-8, -0.8, -2.5, 0, 0.6, 2.5], { all: 'plesio_skin', bottom: 'plesio_belly' }, { role: 'flip', front: false, side: s, limb: 'flipB' + S }));
    }
    D.plesiosaurus = finishRig('turtle', P, { hipY: 6, rollY: 6, height: 28, post: 'm3_plesio', scale: 1.1 });
  }
  // the drowned of Aethel: villagers still, under the weed and the water
  D.drowned_villager = HB({ head: { all: 'dvill_skin', front: 'dvill_face' }, body: 'dvill_robe', arm: 'dvill_robe', fore: 'dvill_hand', leg: 'dvill_robe', shin: 'dvill_skin' }, [
    ['nose', 'head', [0, 3.5, -4], [-1, -3, -2, 1, 1, 0], 'dvill_skin'],
    glowOver('eyes', 'head', [-4, 0, -4.1, 4, 10, -4.04], 'dvill_eyes'),
    X.skirt('dvill_hem', 9, 4.6, 3.6),
    ['kelp1', 'body', [2, 12, -3.15], [-0.6, -11, -0.1, 0.6, 0, 0.1], 'dvill_kelp', { noCull: true }],
    ['kelp2', 'head', [-3.6, 10, 1], [-0.7, -9, -0.7, 0.7, 0.5, 0.7], 'dvill_kelp', { noCull: true }],
    ['kelp3', 'armL', [-2.1, 1, 0], [-0.2, -9, -1, 0.2, 0, 1], 'dvill_kelp', { noCull: true }],
  ], { head: [8, 10, 8], body: [8, 12, 6], leg: [4, 11, 4] });
  // the Leviathan: a vast eel-whale of the deep, the Bloom growing out of its back
  {
    const P = [
      rpart('seg1', null, [0, 9, 0], [-9, -7, 0, 9, 8, 16], { all: 'lev_skin', bottom: 'lev_belly' }, { role: 'seg', idx: 1 }),
      rpart('head', 'seg1', [0, 0, 0], [-10, -2, -24, 10, 9, 0], { all: 'lev_skin', front: 'lev_face', bottom: 'lev_belly' }, { role: 'lhead', limb: 'head' }),
      rpart('jaw', 'head', [0, -2, -1], [-9, -5, -22, 9, 0, 0], { all: 'lev_skin', top: 'lev_jaw', bottom: 'lev_belly', front: 'lev_jaw' }, { role: 'jaw' }),
      rpart('eyeL', 'head', [-10.1, 4, -16], [-0.1, -1.6, -2, 0, 1.6, 2], 'lev_eye', { glow: true, noCull: true }),
      rpart('eyeR', 'head', [10.1, 4, -16], [0, -1.6, -2, 0.1, 1.6, 2], 'lev_eye', { glow: true, noCull: true }),
      rpart('finL', 'seg1', [-9, -3, 4], [-13, -0.6, -3, 0, 0.6, 6], 'lev_fin', { role: 'lfin', side: -1, noCull: true, rest: [0, 0, 0.25] }),
      rpart('finR', 'seg1', [9, -3, 4], [0, -0.6, -3, 13, 0.6, 6], 'lev_fin', { role: 'lfin', side: 1, noCull: true, rest: [0, 0, -0.25] }),
    ];
    const S = [[8, 6.5, 16], [7, 6, 15], [6, 5, 14], [4.5, 4, 13], [3, 3, 12]];
    let prev = 'seg1', len = 16;
    S.forEach(([w, h, l], i) => { P.push(rpart('seg' + (i + 2), prev, [0, 0, len], [-w, -h, 0, w, h + 1, l], { all: 'lev_skin', bottom: 'lev_belly' }, { role: 'seg', idx: i + 2 })); prev = 'seg' + (i + 2); len = l; });
    P.push(rpart('fluke', 'seg6', [0, 0, 12], [-11, -0.8, 0, 11, 0.8, 9], 'lev_fin', { noCull: true, role: 'fluke' }));
    P.push(rpart('dorsal', 'seg2', [0, 7, 2], [-0.5, 0, 0, 0.5, 6, 12], 'lev_fin', { noCull: true }));
    for (const [n, par, at, s] of [['bloom1', 'seg1', [4, 8, 6], 3], ['bloom2', 'seg2', [-4, 7, 7], 3.5], ['bloom3', 'seg3', [2.5, 6, 6], 2.5], ['bloom4', 'head', [-5, 9, -13], 2.5], ['bloom5', 'seg4', [-2, 5, 5], 2]]) {
      P.push(rpart(n, par, at, [-s, 0, -s, s, s * 1.4, s], 'lev_bloom'));
      P.push(rpart(n + 'p', n, [0, s * 1.4, 0], [-s * 1.4, 0, -s * 1.4, s * 1.4, 1.2, s * 1.4], 'lev_bloom_glow', { glow: true, noCull: true }));
    }
    for (const [x, y, z] of [[7, 8, -4], [-6, 8, -20], [3, 9, -9]]) P.push(rpart('growth' + P.length, 'head', [x, y, z], [-1.5, 0, -1.5, 1.5, 2.5, 1.5], 'lev_bloom'));
    D.leviathan = finishRig('m3_eel', P, { hipY: 9, height: 20, scale: 1.8 });
  }

  // ================= the Shadowfell =================
  D.ghost = finishRig('m3_ghost', [
    rpart('body', null, [0, 13, 0], [-4, 0, -2, 4, 10, 2], 'ghost_body', { role: 'body', alpha: 0.62, noCull: true }),
    rpart('head', 'body', [0, 10, 0], [-4, 0, -4, 4, 8, 4], { all: 'ghost_hair', front: 'ghost_face' }, { role: 'head', limb: 'head', alpha: 0.72 }),
    rpart('eyes', 'head', [0, 0, 0], [-4, 0, -4.1, 4, 8, -4.05], 'ghost_eyes', { glow: true, noCull: true }),
    rpart('hair', 'head', [0, 8, 2], [-4.4, -11, -0.5, 4.4, 0.5, 2.6], 'ghost_hair', { alpha: 0.55, noCull: true, rest: [-0.15, 0, 0] }),
    rpart('armR', 'body', [5.5, 9, 0], [-1.5, -11, -1.5, 1.5, 1, 1.5], 'ghost_body', { role: 'armR', alpha: 0.55, noCull: true }),
    rpart('armL', 'body', [-5.5, 9, 0], [-1.5, -11, -1.5, 1.5, 1, 1.5], 'ghost_body', { role: 'armL', alpha: 0.55, noCull: true }),
    rpart('tail1', 'body', [0, 0, 0], [-4, -6, -2, 4, 0, 2], 'ghost_body', { role: 'tail1', alpha: 0.5, noCull: true }),
    rpart('tail2', 'tail1', [0, -6, 0], [-3, -4, -1.5, 3, 0, 1.5], 'ghost_body', { role: 'tail2', alpha: 0.4, noCull: true }),
    rpart('tail3', 'tail2', [0, -4, 0], [-1.5, -3, -1, 1.5, 0, 1], 'ghost_body', { role: 'tail3', alpha: 0.3, noCull: true }),
  ], { hipY: 13, height: 31 });
  D.veil_echo_beast = quadRig({
    body: [7, 7, 14], leg: [2.5, 9], head: [6, 6, 5], headAt: [2, 0], tail: [3, 10, 3], tailRest: -0.6, gallop: true, scale: 1.5, post: 'sit',
    tex: { body: { all: 'echo_fur', top: 'echo_back' }, head: { all: 'echo_fur', front: 'echo_face', top: 'echo_back' }, leg: 'echo_fur', tail: 'echo_back' },
    extras: [['mane', 'body', [0, 0.5, -3.5], [-4.6, -4, -4, 4.6, 4.6, 4], { all: 'echo_fur', top: 'echo_back' }, { alpha: 0.9, noCull: true }],
      ['snout', 'head', [0, -1.5, -5], [-1.75, -1.5, -3.5, 1.75, 1.5, 0], { all: 'echo_fur', front: 'echo_snout' }],
      glowOver('eyes', 'head', [-3, -3, -5.12, 3, 3, -5.06], 'echo_eyes'),
      ear('earL', [-2, 3, -1.5], 1.6, 4, 'echo_back', [-0.1, 0, -0.15]), ear('earR', [2, 3, -1.5], 1.6, 4, 'echo_back', [-0.1, 0, 0.15]),
      ['spine1', 'body', [0, 3.5, -2], [-0.5, 0, -0.5, 0.5, 4, 0.5], 'echo_back', { rest: [0.6, 0, 0] }], ['spine2', 'body', [0, 3.5, 1.5], [-0.5, 0, -0.5, 0.5, 5, 0.5], 'echo_back', { rest: [0.7, 0, 0] }],
      ['spine3', 'body', [0, 3.5, 5], [-0.5, 0, -0.5, 0.5, 3.5, 0.5], 'echo_back', { rest: [0.8, 0, 0] }],
      ['wisp', 'tail', [0, -10, 0], [-1, -4, -1, 1, 0, 1], 'echo_back', { alpha: 0.5, noCull: true }]],
  });
  D.sentient_shadow = HB({ head: 'shade_body', body: 'shade_body', arm: 'shade_body', leg: 'shade_body' }, [
    glowOver('eyes', 'head', [-4, 0, -4.1, 4, 8, -4.04], 'shade_eyes'),
    ['wispR', 'body', [3, 12, 0], [-0.8, 0, -0.8, 0.8, 4, 0.8], 'shade_body', { alpha: 0.55, noCull: true, rest: [0, 0, -0.3] }],
    ['wispL', 'body', [-3, 12, 0], [-0.8, 0, -0.8, 0.8, 3, 0.8], 'shade_body', { alpha: 0.55, noCull: true, rest: [0, 0, 0.3] }],
    ['wispH', 'head', [0, 8, 1], [-1, 0, -1, 1, 3, 1], 'shade_body', { alpha: 0.45, noCull: true, rest: [0.3, 0, 0] }],
  ]);

  // ================= Duskwood =================
  {
    const ant = (s) => { const S = s > 0 ? 'R' : 'L'; return [
      ['ant' + S, 'head', [s * 1.6, 8, -0.5], [-0.6, 0, -0.6, 0.6, 7, 0.6], 'cfey_antler', { rest: [0.2, 0, -s * 0.45] }],
      ['ant' + S + '2', 'ant' + S, [0, 3.5, 0], s > 0 ? [0, 0, -0.45, 4, 0.9, 0.45] : [-4, 0, -0.45, 0, 0.9, 0.45], 'cfey_antler', { rest: [0, 0, s * 0.5] }],
      ['ant' + S + '3', 'ant' + S, [0, 6, 0], [-0.45, 0, -3, 0.45, 0.9, 0], 'cfey_antler', { rest: [0.4, 0, 0] }],
      ['ant' + S + '4', 'ant' + S, [0, 7, 0], [-0.4, 0, -0.4, 0.4, 3, 0.4], 'cfey_antler', { rest: [0, 0, -s * 0.5] }],
      ['thorn' + S, 'arm' + S, [s * 1.6, 1.2, 0], [-0.4, 0, -0.4, 0.4, 3, 0.4], 'cfey_antler', { rest: [0, 0, -s * 0.7] }],
      X.pauld('cfey_bark', s, 2.1),
    ]; };
    D.corrupted_fey = HB({ head: { all: 'cfey_skin', front: 'cfey_face', top: 'cfey_cape' }, body: 'cfey_bark', arm: 'cfey_bark', leg: 'cfey_bark' }, [
      glowOver('eyes', 'head', [-3.5, 0, -3.6, 3.5, 8, -3.54], 'cfey_eyes'),
      ['hair', 'head', [0, 8, 2], [-3.8, -10, -0.5, 3.8, 0.5, 2], 'cfey_cape', { noCull: true, rest: [-0.1, 0, 0] }],
      X.cape('cfey_cape', 19, 4.4),
    ].concat(ant(1), ant(-1)), { head: [7, 8, 7], body: [8, 13, 4], arm: [3, 13, 3], leg: [3, 14, 3], legX: 2, armX: 5.5 });
  }
  D.fey_trickster = HB({ head: { all: 'trick_skin', front: 'trick_face', top: 'trick_cap' }, body: 'trick_cloth', arm: 'trick_skin', leg: 'trick_skin' }, [
    ['cap', 'head', [0, 6, 0], [-3.6, 0, -3.6, 3.6, 1.6, 3.6], 'trick_cap'], ['capTip', 'cap', [0, 1.6, 0.5], [-1.6, 0, -1.6, 1.6, 3, 1.6], 'trick_cap', { rest: [0.5, 0, 0] }],
    ear('earL', [-3, 3.5, 0], 3, 1, 'trick_skin', [0, 0, 0.5]), ear('earR', [3, 3.5, 0], 3, 1, 'trick_skin', [0, 0, -0.5]),
    ['wingR', 'body', [1, 4, 1.5], [0, -3, -0.15, 8, 5, 0.15], 'trick_wing', { role: 'twing', side: 1, noCull: true, alpha: 0.75, rest: [0, -0.6, 0.15] }],
    ['wingL', 'body', [-1, 4, 1.5], [-8, -3, -0.15, 0, 5, 0.15], 'trick_wing', { role: 'twing', side: -1, noCull: true, alpha: 0.75, rest: [0, 0.6, -0.15] }],
    ['skirt', 'body', [0, 0, 0], [-2.6, -2.5, -2, 2.6, 0.5, 2], 'trick_cloth', { noCull: true }],
  ], { head: [6, 6, 6], body: [4, 5, 3], arm: [1.5, 5, 1.5], leg: [1.5, 5, 1.5], legX: 1, armX: 2.8, scale: 0.85, post: 'm3_flutter' });

  // ================= the Redrock desert =================
  const raider = (chief) => HB(chief
    ? { head: { all: 'pchief_armor', front: 'pchief_face' }, body: 'pchief_armor', arm: 'pchief_armor', fore: 'praider_skin', leg: 'praider_wrap', shin: 'm3_boots' }
    : { head: { all: 'praider_head', front: 'praider_face' }, body: 'praider_wrap', arm: 'praider_wrap', fore: 'praider_skin', leg: 'praider_wrap', shin: 'praider_wrap' }, (chief ? [
    glowOver('eyes', 'head', [-4, 0, -4.1, 4, 8, -4.04], 'praider_eyes'),
    ['hornL', 'head', [-4, 6, 0], [-0.8, 0, -0.8, 0.8, 4, 0.8], 'pchief_horn', { rest: [0, 0, 1.0] }], ['hornL2', 'hornL', [0, 4, 0], [-0.6, 0, -0.6, 0.6, 3.5, 0.6], 'pchief_horn', { rest: [0, 0, -0.9] }],
    ['hornR', 'head', [4, 6, 0], [-0.8, 0, -0.8, 0.8, 4, 0.8], 'pchief_horn', { rest: [0, 0, -1.0] }], ['hornR2', 'hornR', [0, 4, 0], [-0.6, 0, -0.6, 0.6, 3.5, 0.6], 'pchief_horn', { rest: [0, 0, 0.9] }],
    X.pauld('pchief_armor', 1, 2.8), X.pauld('pchief_armor', -1, 2.8), X.cape('pchief_cape', 17, 4.6),
    ['bloom', 'body', [0, 10, 2.2], [-3, 0, 0, 3, 5, 3], 'praider_pod', { glow: true }],
    ['podR', 'pauldR', [1, 1.6, 0], [-1.2, 0, -1.2, 1.2, 2, 1.2], 'praider_pod', { glow: true }],
    ['sash', 'body', [0, 0, 0], [-4.3, 0, -2.3, 4.3, 2, 2.3], 'praider_scarf'],
  ] : [
    glowOver('eyes', 'head', [-4, 0, -4.1, 4, 8, -4.04], 'praider_eyes'),
    ['turban', 'head', [0, 0, 0.3], [-4.6, 4.5, -4.5, 4.6, 9.4, 4.4], { all: 'praider_head', front: false, top: 'praider_head' }, { noCull: true }],
    ['scarf', 'head', [2, 2, 4], [-1, -7, 0, 1, 0, 0.4], 'praider_scarf', { noCull: true, rest: [-0.3, 0, 0] }],
    ['sash', 'body', [0, 0, 0], [-4.3, 4, -2.3, 4.3, 6, 2.3], 'praider_scarf'],
    ['pod1', 'body', [2.5, 10, 2.1], [-1.5, 0, -0.5, 1.5, 3, 2], 'praider_pod', { glow: true }],
    ['pod2', 'armR', [2, 0, 0], [-0.5, -1, -1.5, 1.5, 2, 1.5], 'praider_pod', { glow: true }],
    ['pod3', 'head', [-3, 8.5, 1], [-1.5, 0, -1.5, 1.5, 2.5, 1.5], 'praider_pod', { glow: true }],
  ]), { scale: chief ? 1.15 : 1 });
  D.pollen_raider = raider(false);
  D.pollen_raider_chief = raider(true);
  D.pollen_raider_chief.heavy = true;

  // ================= people =================
  D.cultist = HB({ head: { all: 'cultist_hood', front: 'cultist_face' }, body: 'cultist_robe', arm: 'cultist_robe', fore: 'cultist_fore', leg: 'cultist_robe', shin: 'm3_boots' }, [X.hood('cultist_hood'), X.skirt('cultist_robe', 9)]);
  D.cult_fanatic = HB({ head: { all: 'fanatic_hood', front: 'fanatic_mask' }, body: 'fanatic_robe', arm: 'fanatic_robe', fore: 'fanatic_fore', leg: 'fanatic_robe', shin: 'm3_boots' }, [X.hood('fanatic_hood'), X.skirt('fanatic_robe', 10),
    ['hornL', 'hood', [-3, 8.5, 0], [-0.6, 0, -0.6, 0.6, 3.5, 0.6], 'pchief_horn', { rest: [-0.2, 0, 0.5] }], ['hornR', 'hood', [3, 8.5, 0], [-0.6, 0, -0.6, 0.6, 3.5, 0.6], 'pchief_horn', { rest: [-0.2, 0, -0.5] }]]);
  D.mage = HB({ head: { all: 'mage_hair', front: 'mage_face', top: 'mage_hat' }, body: 'mage_robe', arm: 'mage_robe', fore: 'mage_fore', leg: 'mage_robe', shin: 'm3_boots' }, [X.skirt('mage_robe', 10),
    ['brim', 'head', [0, 7.6, 0], [-6.5, 0, -6.5, 6.5, 1, 6.5], 'mage_hat'], ['hat1', 'head', [0, 8.6, 0], [-3.8, 0, -3.8, 3.8, 4, 3.8], 'mage_hat'],
    ['hat2', 'hat1', [0, 4, 0.6], [-2.6, 0, -2.6, 2.6, 4, 2.6], 'mage_hat', { rest: [0.2, 0, 0] }], ['hat3', 'hat2', [0, 4, 0.4], [-1.4, 0, -1.4, 1.4, 3.5, 1.4], 'mage_hat', { rest: [0.4, 0, 0] }]]);
  D.priest_acolyte = HB({ head: { all: 'acolyte_hair', front: 'acolyte_face', top: 'm3_skin_b' }, body: 'acolyte_robe', arm: 'acolyte_robe', fore: 'acolyte_fore', leg: 'acolyte_robe', shin: 'm3_boots' }, [X.skirt('acolyte_robe', 10),
    ['rope', 'body', [0, 0, 0], [-4.4, 4, -2.4, 4.4, 5, 2.4], 'praider_head']]);
  D.knight = HB({ head: { all: 'knight_plate', front: 'knight_helm' }, body: { all: 'knight_plate', front: 'knight_tabard', back: 'knight_tabard' }, arm: 'knight_plate', leg: 'knight_plate' }, [
    X.plume('knight_plume'), X.pauld('knight_plate', 1), X.pauld('knight_plate', -1), X.shield('knight_shield'),
    ['tabard', 'body', [0, 0, 0], [-3.2, -6, -2.3, 3.2, 0.5, 2.3], 'knight_tabard', { noCull: true }]], { head: [8.4, 8.4, 8.4] });
  D.veteran = HB({ head: { all: 'vet_hair', front: 'vet_face' }, body: 'vet_mail', arm: 'vet_mail', fore: 'vet_leg', leg: 'vet_leg', shin: 'm3_boots' }, [
    ['mantle', 'body', [0, 12, 0], [-5.2, -3.5, -2.9, 5.2, 1.5, 2.9], 'vet_fur', { noCull: true }], X.pauld('vet_leg', 1, 2.4), X.pauld('vet_leg', -1, 2.4),
    ['skirt', 'body', [0, 0, 0], [-4.4, -4, -2.4, 4.4, 0.5, 2.4], 'vet_mail', { noCull: true }]]);
  D.scout = HB({ head: { all: 'scout_hood', front: 'scout_face' }, body: 'scout_leather', arm: 'scout_leather', fore: 'm3_skin_a', leg: 'scout_leg', shin: 'm3_boots' }, [X.hood('scout_hood'), X.cape('scout_hood', 13, 4.3),
    ['quiver', 'body', [1.5, 5, 2.8], [-1.5, -4, -0.6, 1.5, 7, 1.6], 'scout_quiver', { rest: [0, 0, -0.4] }]]);
  D.thug = HB({ head: { all: 'thug_head', front: 'thug_face', top: 'cultist_robe' }, body: 'thug_jerkin', arm: 'thug_arm', fore: 'm3_skin_b', leg: 'thug_leg', shin: 'm3_boots' }, [
    ['knot', 'head', [0, 6, 4], [-1, -3, 0, 1, 0, 1.2], 'cultist_robe', { noCull: true, rest: [-0.3, 0, 0] }]], { body: [9, 12, 5], arm: [4.5, 12, 4.5], armX: 6.75, legX: 2.25, leg: [4.5, 12, 4.5] });
  D.spy = HB({ head: { all: 'spy_hood', front: 'spy_face' }, body: 'spy_leather', arm: 'spy_leather', fore: 'spy_leather', leg: 'spy_leather', shin: 'm3_boots' }, [X.hood('spy_hood'), X.cape('spy_cape', 12, 4.3)]);
  D.guard_captain = HB({ head: { all: 'captain_helm', front: 'captain_face' }, body: { all: 'knight_plate', front: 'captain_tabard', back: 'captain_tabard' }, arm: 'knight_plate', leg: 'knight_plate', shin: 'm3_boots' }, [
    ['crest', 'head', [0, 8, 0], [-0.7, 0, -4.4, 0.7, 2.5, 4.4], 'captain_plume', { noCull: true }], ['nasal', 'head', [0, 6, -4.1], [-0.5, -3, -0.4, 0.5, 2, 0], 'knight_plate'],
    X.pauld('knight_plate', 1), X.pauld('knight_plate', -1), X.cape('captain_cape', 17),
    ['tabard', 'body', [0, 0, 0], [-3.2, -6, -2.3, 3.2, 0.5, 2.3], 'captain_tabard', { noCull: true }]]);
  D.archmage = HB({ head: { all: 'archmage_hair', front: 'archmage_face' }, body: 'archmage_robe', arm: 'archmage_robe', fore: 'archmage_fore', leg: 'archmage_robe', shin: 'm3_boots' }, [X.skirt('archmage_robe', 11, 4.8, 2.8),
    ['beard', 'head', [0, 1, -4], [-3, -10, -1.2, 3, 3, 0.2], 'archmage_beard', { noCull: true }],
    ['hair', 'head', [0, 8, 2], [-4.4, -12, -0.5, 4.4, 0.6, 2.4], 'archmage_hair', { noCull: true, rest: [-0.08, 0, 0] }],
    ['circlet', 'head', [0, 6.2, 0], [-4.3, 0, -4.3, 4.3, 1, 4.3], 'archmage_gold'],
    ['mantle', 'body', [0, 12, 0], [-5, -4, -2.7, 5, 0.6, 2.7], { all: 'archmage_robe', top: 'archmage_gold' }, { noCull: true }]]);

  Object.assign(MODEL_DEFS, D);
}

// ---- how the new bodies move ---------------------------------------------------------------------------
Object.assign(RIG_ANIM, {
  // merrow: a hunched brute on its tail; in the water it lies out flat and swims with the tail
  m3_merfolk(m, d, P, R) {
    const a = m.walkAmt || 0, ph = m.walk || 0, t = (m.age || 0) + (m.id || 0), wet = m.inWater || (m.ghost && m.wet);
    const sw = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0, thr = m.throwT > 0 ? Math.sin(m.throwT / 0.5 * Math.PI) : 0;
    if (wet) {
      R.pitch = -1.2;
      const k = 2.5 + a * 4;
      P.tail1 = [-0.75 + Math.sin(t * k) * 0.25, 0, 0]; P.tail2 = [0.75 + Math.sin(t * k - 1) * 0.35, 0, 0]; P.tail3 = [Math.sin(t * k - 2) * 0.4, 0, 0];
      P.armR = [0.6 + Math.sin(t * 2) * 0.2, 0, 0.4]; P.armL = [0.6 - Math.sin(t * 2) * 0.2, 0, -0.4];
      P.head = [0.9 + (m.headPitch || 0) * 0.5, (m.headYawRel || 0) * 0.6, 0];
    } else {
      // heaving itself along: the body rocks, the tail drags and curls
      P.hips = [0, 0, Math.sin(ph * 0.8) * 0.08 * a];
      P.body = [Math.sin(ph * 0.8) * 0.06 * a + Math.sin(t * 1.4) * 0.02, Math.sin(ph * 0.8) * 0.12 * a, 0];
      P.tail1 = [Math.sin(t * 1.2) * 0.05, Math.sin(ph * 0.8 + 1) * 0.3 * a + Math.sin(t * 0.7) * 0.1, 0];
      P.tail2 = [0, Math.sin(ph * 0.8 + 2) * 0.35 * a, 0]; P.tail3 = [0, Math.sin(t * 1.5) * 0.25, 0];
      P.armR = [Math.sin(ph * 0.8) * 0.5 * a, 0, 0.1]; P.armL = [-Math.sin(ph * 0.8) * 0.5 * a, 0, -0.1];
      P.foreR = [0.3, 0, 0]; P.foreL = [0.3, 0, 0];
      P.head = [(m.headPitch || 0), (m.headYawRel || 0), 0];
    }
    if (sw) { P.armR = [P.armR[0] + sw * 1.8, -sw * 0.3, P.armR[2]]; P.body[1] = (P.body[1] || 0) - sw * 0.2; }
    if (thr) { P.armR = [2.6 * thr, 0, 0.2]; P.foreR = [0.2, 0, 0]; }
  },
  // water elemental: rings turning against each other, a swaying column, fists of water
  m3_welem(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), a = m.walkAmt || 0, fast = m._m3whelm > 0 ? 3.5 : 1;
    P.ring1 = [Math.sin(t * 1.3) * 0.06, t * 1.6 * fast, 0]; P.ring2 = [0, -t * 1.2 * fast, Math.sin(t * 1.1) * 0.06];
    P.base = [0, t * 0.9 * fast, 0];
    P.body = [Math.sin(t * 1.7) * 0.05 - a * 0.12, Math.sin(t * 0.9) * 0.15, Math.sin(t * 1.3) * 0.05];
    P.head = [(m.headPitch || 0) * 0.5 + Math.sin(t * 2.1) * 0.04, (m.headYawRel || 0) * 0.7, 0];
    P.crest = [Math.sin(t * 2.6) * 0.12, 0, 0];
    const sw = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0, L = m._m3left;
    P.armR = [Math.sin(t * 1.5) * 0.15 + (L ? 0 : sw * 1.9), 0, 0.1]; P.armL = [Math.sin(t * 1.5 + 2) * 0.15 + (L ? sw * 1.9 : 0), 0, -0.1];
    if (m._m3whelm > 0) { P.armR = [1.2, 0, 0.9]; P.armL = [1.2, 0, -0.9]; }
    R.lift = Math.sin(t * 2) * 0.03;
  },
  // giant octopus: arms rippling; swimming, the arms stream behind and pulse
  m3_octo(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), a = m.walkAmt || 0, wet = m.inWater || (m.ghost && m.wet);
    const pulse = (Math.sin(t * 3) + 1) / 2, grab = m._m3grab > 0;
    for (let i = 0; i < 8; i++) {
      const w = Math.sin(t * 2.2 + i * 0.9);
      if (wet && a > 0.2) { P['arm' + i] = [-0.6 + pulse * 0.6, 0, 0]; P['armb' + i] = [0.2 + w * 0.15, 0, 0]; }
      else { P['arm' + i] = [w * 0.12 + Math.sin(m.walk * 1.2 + i * 1.6) * 0.25 * a, 0, 0]; P['armb' + i] = [w * 0.25, Math.sin(t * 1.7 + i) * 0.15, 0]; }
    }
    if (grab) for (const i of [0, 7, 1, 6]) { P['arm' + i] = [0.9, 0, 0]; P['armb' + i] = [1.1, 0, 0]; }
    const sw = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0;
    if (sw) { P.arm0 = [1.2 * sw, 0, 0]; P.arm7 = [1.2 * sw, 0, 0]; }
    P.mantle = [Math.sin(t * 1.6) * 0.08 + (wet ? 0.35 * a : 0), 0, Math.sin(t * 1.1) * 0.05];
    P.body = [(m.headPitch || 0) * 0.3, (m.headYawRel || 0) * 0.3, 0];
    R.pitch = wet ? -0.5 * a : 0; R.lift = wet ? Math.sin(t * 3) * 0.04 : 0;
  },
  // the Leviathan: a wave running down the body, fins rowing, the jaw working
  m3_eel(m, d, P, R) {
    const t = (m.age || 0) * (m.speedNow > 0.5 ? 2.2 : 1.1) + (m.id || 0), amp = 0.12 + clamp((m.speedNow || 0) / 6, 0, 1) * 0.14;
    for (let i = 1; i <= 6; i++) P['seg' + i] = [Math.sin(t * 0.7 - i * 0.6) * 0.04 * (i > 1 ? 1 : 0.3), i > 1 ? Math.sin(t - i * 0.85) * amp : Math.sin(t) * amp * 0.25, 0];
    P.fluke = [Math.sin(t - 6) * 0.25, 0, 0];
    P.finL = [0, 0, Math.sin(t * 1.3) * 0.35]; P.finR = [0, 0, -Math.sin(t * 1.3) * 0.35];
    const open = m._m3jaw || 0;
    P.jaw = [-(0.06 + Math.sin(t * 0.8) * 0.04 + open * 0.55), 0, 0];
    P.head = [(m.headPitch || 0) * 0.4 + Math.sin(t * 0.5) * 0.04, (m.headYawRel || 0) * 0.5 - (P.seg1 ? P.seg1[1] : 0), 0];
    R.pitch = (m.swimPitch || 0) * 0.5; R.lift = Math.sin(t * 0.6) * 0.06;
    if (!m.inWater && !m.ghost) { R.roll = Math.PI / 2 * 0.8; }
  },
  // the ghost: drifting, hair and robe trailing, arms reaching when it comes for you
  m3_ghost(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), a = m.walkAmt || 0;
    R.lift = Math.sin(t * 1.6) * 0.1 + 0.15;
    P.body = [-a * 0.25 + Math.sin(t * 1.1) * 0.03, 0, Math.sin(t * 0.9) * 0.04];
    P.tail1 = [a * 0.4 + Math.sin(t * 2) * 0.12, 0, Math.sin(t * 1.4) * 0.1]; P.tail2 = [a * 0.3 + Math.sin(t * 2 - 1) * 0.15, 0, Math.sin(t * 1.4 - 1) * 0.12]; P.tail3 = [a * 0.3 + Math.sin(t * 2 - 2) * 0.2, 0, 0];
    P.hair = [a * 0.4 + Math.sin(t * 1.8) * 0.08, 0, 0];
    const reach = (m.T && m.T.hostile && m._m3hunt) || m.castT > 0, sw = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0;
    const ra = reach ? 1.3 + Math.sin(t * 2.3) * 0.08 : 0.25 + Math.sin(t * 1.3) * 0.1;
    P.armR = [ra - sw * 0.6, 0, 0.1]; P.armL = [ra - sw * 0.6 + (reach ? 0 : Math.sin(t * 1.3 + 1) * 0.1), 0, -0.1];
    P.head = [(m.headPitch || 0) + Math.sin(t * 0.7) * 0.05, (m.headYawRel || 0), Math.sin(t * 0.5) * 0.08];
  },
});
Object.assign(RIG_POST, {
  // people and the people-shaped: casting, throwing, parrying, alternate claws, lying down, a hold
  m3_bip(m, d, P, R) {
    const t = m.age || 0;
    if (m.castT > 0) { const k = Math.min(1, m.castT * 4), w = Math.sin(t * 9) * 0.1; if (m._m3castOne) { P.armR = [2.5 * k + w, 0, 0.2]; P.foreR = [0.2, 0, 0]; } else { P.armR = [2.3 * k + w, 0, 0.35]; P.armL = [2.3 * k - w, 0, -0.35]; P.foreR = [0.2, 0, 0]; P.foreL = [0.2, 0, 0]; } }
    if (m.throwT > 0) { const k = Math.sin(m.throwT / 0.5 * Math.PI); P.armR = [2.8 * k, 0, 0.15]; P.foreR = [0.1, 0, 0]; }
    if (m.parryT > 0) { P.armL = [1.3, 0.5, 0]; P.foreL = [0.6, 0, 0]; P.armR = [1.0, -0.5, 0]; }
    if (m.swingT > 0 && m._m3left && !d.armsReach) { const sw = Math.sin(m.swingT / 0.3 * Math.PI); P.armL = [(P.armL ? P.armL[0] : 0) + sw * 1.9, sw * 0.25, 0]; P.foreL = [0.25 + sw * 0.5, 0, 0]; if (P.armR) P.armR[0] -= sw * 1.5; }
    if (m.engulfT > 0) { P.armR = [1.6, 0, 0.9]; P.armL = [1.6, 0, -0.9]; P.foreR = [1.2, 0, 0]; P.foreL = [1.2, 0, 0]; }
    if (m._m3down > 0) {
      R.pitch = -1.45; R.lift = -(d.hipY * RPX) + (d.bodyDepth * RPX) * 0.5;
      P.armR = [2.6, 0, 0.5]; P.armL = [2.4, 0, -0.5]; P.legL = [0.1, 0, 0.1]; P.legR = [-0.1, 0, -0.1]; P.shinL = [-0.2, 0, 0]; P.shinR = [-0.2, 0, 0]; P.head = [0.6, 0.5, 0];
    }
    if (m._m3hover) R.lift = (R.lift || 0) + m._m3hover;
  },
  // fey trickster: wings a blur, hovering, legs dangling
  m3_flutter(m, d, P, R) {
    RIG_POST.m3_bip(m, d, P, R);
    const t = (m.age || 0) + (m.id || 0), f = Math.sin(t * 38);
    P.wingR = [0, -f * 0.45, 0]; P.wingL = [0, f * 0.45, 0];
    if (!m.onGround) { P.legL = [0.3 + Math.sin(t * 2) * 0.1, 0, 0.05]; P.legR = [0.15 - Math.sin(t * 2) * 0.1, 0, -0.05]; P.shinL = [-0.4, 0, 0]; P.shinR = [-0.3, 0, 0]; R.lift = (R.lift || 0) + Math.sin(t * 3) * 0.05; }
  },
  // a jaw that gapes when it bites or holds (giant crocodile)
  m3_jaw(m, d, P, R) { const k = m._m3jaw || (m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0); P.jaw = [-(0.05 + k * 0.7), 0, 0]; if (m._m3sweep > 0) P.tail = [0, Math.sin(m._m3sweep / 0.5 * Math.PI) * 1.2 * (m._m3sweepSide || 1), 0]; },
  // the giant crab: claws snapping, eyes swivelling
  m3_crab(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), sw = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0, L = m._m3left;
    P.pincerR = [Math.max(0, Math.sin(t * 3)) * 0.3 + (L ? 0 : sw * 0.6), 0, 0]; P.pincerL = [Math.max(0, Math.sin(t * 3 + 1.5)) * 0.3 + (L ? sw * 0.6 : 0), 0, 0];
    P.armR = [L ? 0 : -sw * 0.5, 0, 0]; P.armL = [L ? -sw * 0.5 : 0, 0, 0];
    if (m._m3grab > 0) { P.pincerR = [0.05, 0, 0]; P.armR = [-0.3, 0.3, 0]; }
    P.eyeR = [Math.sin(t * 1.3) * 0.2, 0, 0]; P.eyeL = [Math.sin(t * 1.1 + 1) * 0.2, 0, 0];
  },
  // the plesiosaurus: the neck sways, and snaps forward to bite
  m3_plesio(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), k = m._m3lunge > 0 ? Math.sin(m._m3lunge / 0.5 * Math.PI) : 0;
    P.neck = [Math.sin(t * 0.9) * 0.08 - k * 0.55, Math.sin(t * 0.6) * 0.2 + (m.headYawRel || 0) * 0.4, 0];
    P.neck2 = [Math.sin(t * 0.9 + 1) * 0.1 - k * 0.3, (m.headYawRel || 0) * 0.3, 0];
    P.head = [(P.head ? P.head[0] : 0) + k * 0.4, 0, 0];
    P.tail = [0, Math.sin(t * 1.4) * 0.3, 0];
  },
});

// ---- 5. who they are -----------------------------------------------------------------------------------
// cd: seconds between blows (a round's attacks spread over six seconds); swimSpeed: blocks a second in water.
{
  const BPS = ['bludgeoning', 'piercing', 'slashing'];
  Object.assign(MOB_TYPES, {
    // ---- the marshes ----
    lizardfolk: { model: 'lizardfolk', label: 'a lizardfolk', held: 'club', hp: 22, w: 0.32, h: 1.9, speed: 2.8, swimSpeed: 3.0, damage: 5, cd: 1.8, hostile: true, special: true, xp: 8, swims: true, walks: true, humanoid: true, faction: 'lizardfolk', voice: 'croc',
      ac: 15, toHit: 4, cr: 0.5, dndXp: 100, ctype: 'humanoid', region: ['marsh'], drops: [['croc_scale', 0, 2, 0.6], ['raw_meat', 0, 1, 0.4], ['club', 1, 1, 0.08]] },
    lizardfolk_shaman: { model: 'lizardfolk_shaman', label: 'a lizardfolk shaman', held: 'druid_staff', hp: 27, w: 0.32, h: 1.9, speed: 2.8, swimSpeed: 3.0, damage: 5, cd: 1.8, hostile: true, special: true, xp: 14, swims: true, walks: true, humanoid: true, faction: 'lizardfolk', voice: 'croc',
      ac: 13, toHit: 4, cr: 2, dndXp: 450, ctype: 'humanoid', region: ['marsh'], drops: [['croc_scale', 0, 2, 0.6], ['feather', 1, 3, 0.7], ['bone', 0, 2, 0.5], ['druid_staff', 1, 1, 0.06]] },
    giant_frog: { model: 'giant_frog', label: 'a giant frog', hp: 18, w: 0.5, h: 1.1, speed: 2.8, swimSpeed: 3.0, damage: 4, cd: 2.2, hostile: true, special: true, xp: 6, swims: true, walks: true, hopper: true, voice: 'frog',
      ac: 11, toHit: 3, cr: 0.25, dndXp: 50, ctype: 'beast', region: ['marsh'], drops: [['raw_meat', 1, 2, 0.8], ['slime_ball', 0, 1, 0.4]] },
    troll: { model: 'troll', label: 'a troll', hp: 94, w: 0.55, h: 2.7, speed: 2.8, damage: 11, cd: 2.0, hostile: true, special: true, xp: 30, knockResist: 0.6, voice: 'ogre', sever: 1.5,
      ac: 15, toHit: 7, cr: 5, dndXp: 1800, ctype: 'giant', region: ['marsh'], drops: [['troll_blood', 1, 2, 0.9], ['leather', 1, 3, 0.8], ['raw_meat', 1, 2, 0.5]] },
    shambling_mound: { model: 'shambling_mound', label: 'a shambling mound', hp: 110, w: 0.7, h: 2.3, speed: 1.9, swimSpeed: 1.9, damage: 13, cd: 2.0, hostile: true, special: true, xp: 30, knockResist: 0.8, swims: true, walks: true, voice: 'squish', noSever: true,
      ac: 15, toHit: 7, cr: 5, dndXp: 1800, ctype: 'plant', resist: ['cold', 'fire'], immune: ['lightning'], region: ['marsh'], drops: [['mound_heart', 1, 1, 0.6], ['vine', 2, 5, 1], ['moss_block', 0, 2, 0.5], ['brown_mushroom', 0, 2, 0.5]] },
    giant_crocodile: { model: 'giant_crocodile', label: 'a giant crocodile', hp: 85, w: 0.85, h: 1.1, speed: 2.8, swimSpeed: 4.6, run: 7, damage: 21, tailDamage: 14, cd: 2.4, hostile: true, special: true, xp: 30, knockResist: 0.8, swims: true, walks: true, voice: 'croc',
      ac: 14, toHit: 8, cr: 5, dndXp: 1800, ctype: 'beast', region: ['marsh'], drops: [['croc_scale', 2, 5, 1], ['leather', 1, 3, 0.8], ['raw_meat', 2, 4, 1]] },
    // ---- the coast and the sea ----
    merrow: { model: 'merrow', label: 'a merrow', held: 'spear', hp: 45, w: 0.55, h: 2.2, speed: 1.0, swimSpeed: 3.8, damage: 9, harpoon: 11, cd: 2.0, hostile: true, special: true, xp: 14, swims: true, walks: true, voice: 'drowned', knockResist: 0.4,
      ac: 13, toHit: 6, cr: 2, dndXp: 450, ctype: 'monstrosity', region: ['coast', 'sea'], drops: [['shark_tooth', 0, 2, 0.6], ['kelp', 1, 3, 0.7], ['spear', 1, 1, 0.08]] },
    sahuagin: { model: 'sahuagin', label: 'a sahuagin', held: 'javelin', hp: 22, w: 0.32, h: 1.9, speed: 2.8, swimSpeed: 3.8, damage: 4, cd: 1.5, hostile: true, special: true, xp: 8, swims: true, walks: true, humanoid: true, faction: 'sahuagin', voice: 'croc',
      ac: 12, toHit: 3, cr: 0.5, dndXp: 100, ctype: 'monstrosity', region: ['coast', 'sea'], drops: [['sahuagin_tooth', 0, 2, 0.6], ['javelin', 1, 1, 0.12], ['cod', 0, 1, 0.3]] },
    sahuagin_priestess: { model: 'sahuagin_priestess', label: 'a sahuagin priestess', held: 'holy_symbol', hp: 33, w: 0.32, h: 1.9, speed: 2.8, swimSpeed: 3.8, damage: 3, cd: 1.5, hostile: true, special: true, xp: 14, swims: true, walks: true, humanoid: true, faction: 'sahuagin', voice: 'witch',
      ac: 12, toHit: 3, cr: 2, dndXp: 450, ctype: 'monstrosity', region: ['coast', 'sea'], drops: [['sahuagin_tooth', 1, 2, 0.7], ['holy_symbol', 1, 1, 0.08], ['potion_healing', 1, 1, 0.12]] },
    sea_hag: { model: 'sea_hag', label: 'a sea hag', hp: 52, w: 0.32, h: 1.8, speed: 2.8, swimSpeed: 3.8, damage: 10, cd: 2.0, hostile: true, special: true, xp: 14, swims: true, walks: true, voice: 'witch',
      ac: 14, toHit: 5, cr: 2, dndXp: 450, ctype: 'fey', region: ['coast', 'sea'], drops: [['hag_eye', 1, 1, 0.5], ['kelp', 1, 3, 0.7], ['glass_bottle', 0, 1, 0.3]] },
    water_elemental: { model: 'water_elemental', label: 'a water elemental', hp: 114, w: 0.6, h: 2.4, speed: 2.8, swimSpeed: 6.5, damage: 13, cd: 2.0, hostile: true, special: true, xp: 30, swims: true, walks: true, knockResist: 0.7, voice: 'squish', noSever: true, m3summon: true,
      ac: 14, toHit: 7, cr: 5, dndXp: 1800, ctype: 'elemental', resist: ['acid', 'fire'], immune: ['poison'], region: ['coast', 'sea'], drops: [['elemental_core_water', 1, 1, 0.5]] },
    giant_crab: { model: 'giant_crab', label: 'a giant crab', hp: 13, w: 0.5, h: 0.8, speed: 2.8, swimSpeed: 2.8, damage: 4, cd: 1.2, hostile: true, special: true, xp: 4, swims: true, walks: true, voice: 'mite',
      ac: 15, toHit: 3, cr: 0.125, dndXp: 25, ctype: 'beast', region: ['coast', 'sea'], drops: [['crab_shell', 0, 1, 0.5], ['raw_meat', 0, 1, 0.5]] },
    giant_octopus: { model: 'giant_octopus', label: 'a giant octopus', hp: 52, w: 0.65, h: 1.3, speed: 1.0, swimSpeed: 5.0, damage: 10, cd: 2.0, hostile: true, special: true, xp: 12, swims: true, walks: true, voice: 'squish', knockResist: 0.3,
      ac: 11, toHit: 5, cr: 1, dndXp: 200, ctype: 'beast', region: ['sea'], drops: [['ink_sac', 1, 3, 1], ['raw_meat', 0, 2, 0.5]] },
    plesiosaurus: { model: 'plesiosaurus', label: 'a plesiosaurus', hp: 68, w: 0.6, h: 1.0, speed: 1.8, swimSpeed: 3.8, damage: 14, cd: 2.4, hostile: true, special: true, xp: 14, swims: true, water: true, needsAir: true, voice: 'croc', knockResist: 0.5,
      ac: 13, toHit: 6, cr: 2, dndXp: 450, ctype: 'beast', region: ['sea'], drops: [['raw_meat', 2, 4, 1], ['leather', 1, 2, 0.6], ['bone', 1, 3, 0.6]] },
    drowned_villager: { model: 'drowned_villager', label: 'a drowned villager of Aethel', held: 'lantern', hp: 45, w: 0.32, h: 2.0, speed: 2.2, swimSpeed: 2.4, damage: 9, cd: 1.8, hostile: true, special: true, xp: 14, swims: true, walks: true, undead: true, noSunBurn: true, humanoid: true, night: true, voice: 'drowned',
      ac: 12, toHit: 5, cr: 2, dndXp: 450, ctype: 'undead', resist: ['necrotic', 'cold'], immune: ['poison'], region: ['coast', 'sea'], drops: [['kelp', 1, 2, 0.7], ['gold_nugget', 0, 3, 0.4], ['lantern', 1, 1, 0.1], ['bone', 0, 2, 0.4]] },
    leviathan: { model: 'leviathan', label: 'the Leviathan of Saltwind Harbor', hp: 300, w: 1.6, h: 2.0, speed: 3.0, swimSpeed: 5.5, damage: 26, cd: 2.5, hostile: true, special: true, boss: true, xp: 400, swims: true, water: true, needsAir: true, knockResist: 1, voice: 'ogre', noSever: true,
      ac: 18, toHit: 12, cr: 15, dndXp: 13000, ctype: 'monstrosity', saves: { str: 10, con: 10, wis: 6 }, immune: ['psychic'], resist: ['cold', 'necrotic'], region: ['sea'],
      drops: [['leviathan_scale', 4, 8, 1], ['bloomed_pearl', 1, 1, 1], ['raw_meat', 4, 8, 1]] },
    // ---- the Shadowfell ----
    ghost: { model: 'ghost', label: 'a ghost', hp: 45, w: 0.32, h: 1.9, speed: 3.6, damage: 17, cd: 2.4, hostile: true, special: true, xp: 20, flyer: true, undead: true, noSunBurn: true, noPush: true, voice: 'wraith', noSever: true,
      ac: 11, toHit: 5, cr: 4, dndXp: 1100, ctype: 'undead', resist: ['acid', 'fire', 'lightning', 'thunder', ...BPS], immune: ['cold', 'necrotic', 'poison'], region: ['shadowfell'], night: true, drops: [['ectoplasm', 1, 3, 1]] },
    veil_echo_beast: { model: 'veil_echo_beast', label: 'a veil echo-beast', hp: 102, w: 0.55, h: 1.5, speed: 4.4, damage: 15, cd: 2.0, hostile: true, special: true, xp: 26, knockResist: 0.4, voice: 'werewolf',
      ac: 14, toHit: 7, cr: 6, dndXp: 2300, ctype: 'monstrosity', resist: ['necrotic', 'cold'], vulnerable: ['radiant'], region: ['shadowfell'], drops: [['echo_fang', 1, 2, 0.8], ['pelt', 1, 1, 0.6]] },
    sentient_shadow: { model: 'sentient_shadow', label: 'a sentient shadow', hp: 120, w: 0.3, h: 1.85, speed: 3.6, damage: 17, cd: 1.8, hostile: true, special: true, xp: 28, voice: 'wraith', noSever: true,
      ac: 15, toHit: 8, cr: 7, dndXp: 2900, ctype: 'undead', undead: true, noSunBurn: true, resist: ['necrotic', 'cold', ...BPS], immune: ['poison'], vulnerable: ['radiant'], region: ['shadowfell'], drops: [['living_shadow', 1, 1, 0.8]] },
    // ---- Duskwood ----
    corrupted_fey: { model: 'corrupted_fey', label: 'a corrupted fey knight', held: 'rapier', hp: 90, w: 0.3, h: 2.2, speed: 3.2, damage: 12, cd: 1.8, hostile: true, special: true, xp: 24, voice: 'raider', knockResist: 0.3,
      ac: 16, toHit: 7, cr: 5, dndXp: 1800, ctype: 'fey', resist: ['necrotic', 'poison'], region: ['duskwood'], drops: [['thorned_antler', 1, 1, 0.6], ['fey_glimmer', 0, 2, 0.5], ['rapier', 1, 1, 0.06]] },
    fey_trickster: { model: 'fey_trickster', label: 'a fey trickster', hp: 27, w: 0.22, h: 0.9, speed: 3.6, damage: 5, cd: 1.6, hostile: true, special: true, xp: 12, flyer: true, voice: 'witch', noPush: true,
      ac: 14, toHit: 6, cr: 2, dndXp: 450, ctype: 'fey', region: ['duskwood'], drops: [['fey_glimmer', 1, 2, 0.8], ['sugar', 0, 2, 0.4]] },
    // ---- the Redrock desert ----
    pollen_raider: { model: 'pollen_raider', label: 'a pollen raider', held: 'scimitar', hp: 32, w: 0.3, h: 1.95, speed: 2.9, damage: 6, cd: 1.4, hostile: true, special: true, xp: 12, humanoid: true, faction: 'blight', voice: 'raider',
      ac: 13, toHit: 5, cr: 2, dndXp: 450, ctype: 'humanoid', immune: ['poison'], region: ['desert'], drops: [['blight_spores', 0, 1, 0.5], ['leather', 0, 1, 0.4], ['scimitar', 1, 1, 0.08], ['emerald', 0, 1, 0.2]] },
    pollen_raider_chief: { model: 'pollen_raider_chief', label: 'the pollen raider chief', held: 'greataxe', hp: 110, w: 0.36, h: 2.25, speed: 2.9, damage: 13, cd: 1.6, hostile: true, special: true, boss: true, xp: 60, humanoid: true, faction: 'blight', voice: 'raider', knockResist: 0.6,
      ac: 15, toHit: 7, cr: 6, dndXp: 2300, ctype: 'humanoid', immune: ['poison'], saves: { str: 6, con: 6 }, region: ['desert'], drops: [['blight_spores', 1, 3, 1], ['greataxe', 1, 1, 0.5], ['emerald', 2, 5, 1], ['gold_ingot', 1, 2, 0.6]] },
    // ---- people ----
    cultist: { model: 'cultist', label: 'a cultist', held: 'sickle', hp: 9, w: 0.3, h: 1.9, speed: 2.8, damage: 4, cd: 1.6, hostile: true, special: true, xp: 4, humanoid: true, faction: 'cult', voice: 'raider',
      ac: 12, toHit: 3, cr: 0.125, dndXp: 25, ctype: 'humanoid', region: ['crypt', 'caverns', 'shadowfell', 'plains', 'forest'], drops: [['candle', 0, 1, 0.3], ['gold_nugget', 0, 2, 0.4], ['sickle', 1, 1, 0.1]] },
    cult_fanatic: { model: 'cult_fanatic', label: 'a cult fanatic', held: 'dagger', hp: 33, w: 0.3, h: 1.9, speed: 2.8, damage: 4, cd: 1.4, hostile: true, special: true, xp: 14, humanoid: true, faction: 'cult', voice: 'witch',
      ac: 13, toHit: 4, cr: 2, dndXp: 450, ctype: 'humanoid', saves: { wis: 4 }, region: ['crypt', 'caverns', 'shadowfell'], drops: [['candle', 0, 2, 0.5], ['gold_nugget', 1, 3, 0.6], ['book', 0, 1, 0.2], ['dagger', 1, 1, 0.12]] },
    mage: { model: 'mage', label: 'a mage', held: 'arcane_focus', hp: 81, w: 0.3, h: 1.9, speed: 2.8, damage: 16, melee: 4, cd: 1.8, hostile: true, special: true, xp: 26, humanoid: true, faction: 'arcane', voice: 'raider',
      ac: 15, toHit: 6, cr: 6, dndXp: 2300, ctype: 'humanoid', saves: { int: 6, wis: 4 }, region: ['vale', 'plains', 'hills', 'crypt'], drops: [['paper', 1, 3, 0.6], ['book', 0, 1, 0.3], ['spellbook', 1, 1, 0.05], ['arcane_focus', 1, 1, 0.1], ['lapis_lazuli', 1, 3, 0.5]] },
    priest_acolyte: { model: 'priest_acolyte', label: 'a priest acolyte', held: 'mace', hp: 11, w: 0.3, h: 1.9, speed: 2.8, damage: 5, cd: 1.6, hostile: true, special: true, xp: 5, humanoid: true, faction: 'order', voice: 'raider',
      ac: 13, toHit: 4, cr: 0.25, dndXp: 50, ctype: 'humanoid', region: ['farms', 'vale', 'plains', 'crypt'], drops: [['candle', 0, 2, 0.4], ['potion_healing', 1, 1, 0.1], ['holy_symbol', 1, 1, 0.05], ['mace', 1, 1, 0.08]] },
    knight: { model: 'knight', label: 'a knight', held: 'greatsword', hp: 52, w: 0.32, h: 1.95, speed: 2.8, damage: 10, cd: 1.6, hostile: true, special: true, xp: 18, humanoid: true, faction: 'order', voice: 'raider', knockResist: 0.5, noSever: false,
      ac: 18, toHit: 5, cr: 3, dndXp: 700, ctype: 'humanoid', saves: { con: 4, wis: 2 }, region: ['farms', 'vale', 'plains', 'hills'], drops: [['iron_ingot', 0, 2, 0.6], ['gold_nugget', 1, 4, 0.6], ['greatsword', 1, 1, 0.06]] },
    veteran: { model: 'veteran', label: 'a warrior veteran', held: 'battleaxe', hp: 65, w: 0.3, h: 1.9, speed: 2.8, damage: 10, cd: 2.2, hostile: true, special: true, xp: 18, humanoid: true, faction: 'bandit', voice: 'raider', knockResist: 0.3,
      ac: 17, toHit: 5, cr: 3, dndXp: 700, ctype: 'humanoid', region: ['plains', 'hills', 'mountain', 'vale', 'desert'], drops: [['iron_nugget', 1, 4, 0.6], ['gold_nugget', 1, 3, 0.6], ['battleaxe', 1, 1, 0.08], ['arrow', 0, 3, 0.4]] },
    scout: { model: 'scout', label: 'a scout', held: 'bow', hp: 16, w: 0.3, h: 1.9, speed: 3.0, damage: 6, melee: 5, cd: 1.6, hostile: true, special: true, xp: 8, humanoid: true, faction: 'bandit', voice: 'raider', ranged: true,
      ac: 13, toHit: 4, cr: 0.5, dndXp: 100, ctype: 'humanoid', region: ['forest', 'hills', 'plains', 'mountain', 'marsh'], drops: [['arrow', 1, 4, 0.8], ['leather', 0, 1, 0.4], ['bow', 1, 1, 0.06]] },
    thug: { model: 'thug', label: 'a thug', held: 'morningstar', hp: 32, w: 0.34, h: 1.9, speed: 2.8, damage: 5, cd: 1.4, hostile: true, special: true, xp: 8, humanoid: true, faction: 'bandit', voice: 'raider', knockResist: 0.2,
      ac: 11, toHit: 4, cr: 0.5, dndXp: 100, ctype: 'humanoid', region: ['farms', 'plains', 'coast', 'hills', 'desert'], drops: [['gold_nugget', 0, 3, 0.6], ['leather', 0, 1, 0.3], ['morningstar', 1, 1, 0.06]] },
    spy: { model: 'spy', label: 'a spy', held: 'shortsword', hp: 27, w: 0.3, h: 1.9, speed: 3.2, damage: 5, cd: 1.4, hostile: true, special: true, xp: 10, humanoid: true, faction: 'bandit', voice: 'raider',
      ac: 12, toHit: 4, cr: 1, dndXp: 200, ctype: 'humanoid', region: ['farms', 'plains', 'coast', 'vale'], drops: [['gold_nugget', 1, 3, 0.6], ['paper', 0, 2, 0.4], ['shortsword', 1, 1, 0.06]] },
    guard_captain: { model: 'guard_captain', label: 'a guard captain', held: 'longsword', hp: 75, w: 0.32, h: 1.95, speed: 2.8, damage: 11, javelin: 11, cd: 1.7, hostile: true, special: true, xp: 22, humanoid: true, faction: 'order', voice: 'raider', knockResist: 0.4,
      ac: 18, toHit: 6, cr: 4, dndXp: 1100, ctype: 'humanoid', region: ['farms', 'plains', 'vale', 'coast'], drops: [['iron_ingot', 1, 2, 0.6], ['gold_nugget', 2, 5, 0.8], ['longsword', 1, 1, 0.06], ['javelin', 1, 2, 0.3]] },
    archmage: { model: 'archmage', label: 'an archmage', held: 'quarterstaff', hp: 170, w: 0.3, h: 1.9, speed: 2.8, damage: 27, melee: 6, cd: 2.0, hostile: true, special: true, boss: true, xp: 120, humanoid: true, faction: 'arcane', voice: 'raider',
      ac: 17, toHit: 9, cr: 12, dndXp: 8400, ctype: 'humanoid', saves: { int: 9, wis: 6 }, resist: ['psychic'], region: ['vale', 'crypt', 'peaks'],
      drops: [['spellbook', 1, 1, 0.4], ['arcane_focus', 1, 1, 0.5], ['diamond', 1, 2, 0.6], ['lapis_lazuli', 3, 8, 1], ['book', 1, 2, 0.6]] },
  });
  for (const k of M3_KEYS) MOB_TYPES[k].drops = MOB_TYPES[k].drops.filter(([id]) => ITEMS[id]);
  for (const k of M3_KEYS) { const T = MOB_TYPES[k]; T.m3 = true; if (T.held && !ITEMS[T.held]) T.held = null; }
}

// ---- 6. how they fight ---------------------------------------------------------------------------------
// shared know-how: blows, saves, holds, fear and charm on players, bolts, clouds, blinks, telegraphs
const M3_WARNED = new Set();
function m3Warn(k, e) { if (M3_WARNED.has(k)) return; M3_WARNED.add(k); console.warn('dnd_monsters3 ' + k + ': ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
function m3IsLP(q) { return typeof LocalPlayer !== 'undefined' && q instanceof LocalPlayer; }
function m3Ally(m) { return !!(m.dndSummonBy || m.owner || m.tamed); }
function m3Leader(m) { return m.dndSummonBy || (m.owner && m.ownerPawn ? m.ownerPawn() : null); }
function m3FoeOf(m, e) { return e instanceof Mob && e !== m && e.alive && !e.remove && e.T && e.T.hostile && !e.owner && !e.tamed && !e.dndSummonBy && !e._m3illusion && !(e.npc && !e.T.hostile); }
function m3Rel(m, t) { const dx = t.x - m.x, dz = t.z - m.z; return { dist: Math.hypot(dx, dz), dyp: t.y - m.y, dir: Math.atan2(-dx, -dz) }; }
function m3Wrap(a) { return ((a + Math.PI * 3) % TAU) - Math.PI; }
// a cooldown on the creature's own clock; the first use comes after `first` seconds
function m3Ready(m, k, secs, first) { const c = m._m3cd || (m._m3cd = {}); if (c[k] === undefined) c[k] = m.age + (first ?? secs * 0.4); if (m.age >= c[k]) { c[k] = m.age + secs * (0.9 + Math.random() * 0.2); return true; } return false; }
function m3HP(q) { return q ? (q.player ? q.player.health : q.health) || 0 : 0; }
function m3MaxHP(q) { return q ? (q.player ? q.player.maxHealth : q.maxHealth) || 1 : 1; }
function m3Say(q, msg, kind) { if (q && q.toast && !(q instanceof Mob)) q.toast(msg, kind || 'warn'); }
function m3Yaw(q) { return (q && (q.player ? q.player.yaw : q.yaw)) || 0; }
// is q facing m (a creature always counts as looking)
function m3Looking(q, m) { if (!q || q instanceof Mob) return true; const y = m3Yaw(q), dx = m.x - q.x, dz = m.z - q.z, l = Math.hypot(dx, dz) || 1; return (-Math.sin(y) * dx - Math.cos(y) * dz) / l > 0.45; }
function m3Fx(g, x, y, z, tile, n, sp, o) { try { spellFx(g, x, y, z, tile, n, sp, o || {}); } catch (e) { /* no particles */ } }
function m3Line(g, x0, y0, z0, x1, y1, z1, tile, n, o = {}) { for (let i = 0; i <= n; i++) { const k = i / n; spellSpark(g, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, z0 + (z1 - z0) * k, tile, { life: o.life || 0.3, size: o.size || 0.07, vy: o.vy || 0 }); } }
function m3Ground(g, x, y, z) { const w = g.world; let yy = Math.floor(y); for (let i = 0; i < 6 && !T_SOLID[w.getBlock(Math.floor(x), yy - 1, Math.floor(z))]; i++) yy--; return yy; }
function m3DecAt(g, x, y, z, r, color) { return { x, y: m3Ground(g, x, y + 0.5, z), z, sx: r, sz: r, shape: 0, progress: 0, color }; }
function m3DecLane(m, yaw, half, len, color) { return { x: m.x, y: m3Ground(m.game, m.x, m.y + 0.5, m.z), z: m.z, yaw: yaw + Math.PI, sx: half, sz: len, shape: 1, progress: 0, color }; }
function m3InLane(m, q, yaw, len, half) { const fx = -Math.sin(yaw), fz = -Math.cos(yaw), dx = q.x - m.x, dz = q.z - m.z, along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx); return along > -0.6 && along < len && side < half + 0.35 && Math.abs(q.y - m.y) < 2.6; }
// where its right hand is (for lanterns, harpoons and spells), from the pose it was last drawn in
function m3Hand(m) {
  const mats = m._mats, M = m._M;
  if (mats && mats.foreR && M) {
    const part = M.parts.find(p => p.name === 'foreR'), h = (part && part.hand) || [0, -5, 0], mm = mats.foreR, hx = h[0] * RPX, hy = h[1] * RPX, hz = h[2] * RPX;
    return [m.x + mm[0] * hx + mm[4] * hy + mm[8] * hz + mm[12], m.y + mm[1] * hx + mm[5] * hy + mm[9] * hz + mm[13], m.z + mm[2] * hx + mm[6] * hy + mm[10] * hz + mm[14]];
  }
  return [m.x - Math.sin(m.yaw) * 0.4 + Math.cos(m.yaw) * 0.35, m.y + m.h * 0.6, m.z - Math.cos(m.yaw) * 0.4 - Math.sin(m.yaw) * 0.35];
}
// a blow (rolled against your armour by the D&D rules). True if it hurt.
function m3Strike(m, t, dmg, o = {}) {
  if (!t || !t.hurt || dmg <= 0 || t.dead) return false;
  const h0 = m3HP(t);
  if (!o.noSwing) m.swingT = 0.3;
  const src = { type: o.type || 'mob', attacker: m, knock: o.knock ?? 3 };
  if (o.el) src.element = o.el; if (o.bypass) src.bypass = true; if (o.noEffect) src.noEffect = true;
  const r = t.hurt(Math.max(1, Math.round(dmg)), src);
  if (t instanceof Mob) return r > 0;
  if (!m3IsLP(t)) return true;
  return m3HP(t) < h0;
}
// a player's saving throw against a creature's power (their own bonus when they have a character)
function m3Save(q, ab, dc) {
  if (q instanceof Mob) { try { return dndMobSave(q, ab, dc).ok; } catch (e) { return Math.random() < 0.4; } }
  let ok;
  try { const c = m3IsLP(q) ? dndLive(q) : null; ok = c ? dndD20({ mod: dndSaveBonus(c, ab) }).total >= dc : Math.random() < 0.35; } catch (e) { ok = Math.random() < 0.35; }
  if (ok && q.floatText) q.floatText(q.x, q.y + 2.1, q.z, 'Saved!', '#8fe3ff');
  return ok;
}
// held: grabbed in jaws or claws, engulfed, swallowed, rooted, paralysed. A creature is simply held fast.
function m3Hold(t, by, secs, mode, o = {}) {
  if (!t || t.dead) return false;
  if (t instanceof Mob) { t.dndHeld = Math.max(t.dndHeld || 0, secs); if (o.dmg) by._m3dot = { t, n: Math.ceil(secs / (o.every || 1.5)), every: o.every || 1.5, k: o.every || 1.5, dmg: o.dmg, el: o.el }; return true; }
  if (!m3IsLP(t)) { giveEffect(t, 'slow', secs, 4); if (t.knock) { const dx = by.x - t.x, dz = by.z - t.z, l = Math.hypot(dx, dz) || 1; t.knock(dx / l * 4, 1, dz / l * 4); } return true; }
  const P = t.player;
  t._m3hold = { by, t: secs, max: secs, mode, every: o.every || 1.5, tick: o.first ?? (o.every || 1.5), dmg: o.dmg || 0, el: o.el, fx: o.fx, x0: P.x, y0: P.y, z0: P.z };
  if (o.msg) t.toast(o.msg, 'warn');
  return true;
}
function m3Release(t, by) { if (t && t._m3hold && (!by || t._m3hold.by === by)) t._m3hold = null; }
function m3Holding(m) { for (const q of m.game.pawns()) if (q._m3hold && q._m3hold.by === m && !q.dead) return q; return null; }
function m3Fear(t, by, secs, dc = 12, msg) {
  if (t instanceof Mob) { if (!m3Save(t, 'wis', dc)) { t.panicT = Math.max(t.panicT || 0, secs); t.fleeFrom = by; } return true; }
  if (m3Save(t, 'wis', dc)) return false;
  if (m3IsLP(t)) { t._m3fear = { by, t: secs }; t.toast(msg || 'You are frightened!', 'warn'); }
  else { giveEffect(t, 'slow', secs, 1); if (t.knock) { const dx = t.x - by.x, dz = t.z - by.z, l = Math.hypot(dx, dz) || 1; t.knock(dx / l * 6, 2, dz / l * 6); } }
  return true;
}
function m3Charm(t, by, secs, o = {}) {
  if (t instanceof Mob) { t.dndCharm = Math.max(t.dndCharm || 0, secs); return true; }
  if (!m3IsLP(t)) { giveEffect(t, 'slow', secs, 2); return true; }
  t._m3charm = Object.assign({ by, t: secs, k: 0, dir: 0, tick: o.every || 1.5 }, o);
  if (o.msg) t.toast(o.msg, 'warn');
  return true;
}
function m3Daze(t, secs, msg) {
  if (t instanceof Mob) { t.slowT = Math.max(t.slowT || 0, secs); return; }
  giveEffect(t, 'slow', secs, 1);
  if (m3IsLP(t)) { t._m3daze = { t: Math.max(secs, (t._m3daze && t._m3daze.t) || 0) }; if (msg) t.toast(msg, 'warn'); }
}
function m3Pull(t, x, z, k, vy = 2) { const dx = x - t.x, dz = z - t.z, l = Math.hypot(dx, dz) || 1; if (t.knock) t.knock(dx / l * k, vy, dz / l * k); else { t.vx += dx / l * k; t.vz += dz / l * k; if (t.onGround) t.vy = Math.max(t.vy, vy); } }
// a free spot to stand on, r0..r1 blocks from (x, z)
function m3Spot(m, x, z, r0, r1, tries = 14) {
  const w = m.game.world;
  for (let i = 0; i < tries; i++) {
    const a = Math.random() * TAU, d = r0 + Math.random() * (r1 - r0), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    let y = Math.floor(m.y) + 3;
    for (let k = 0; k < 8; k++, y--) if (T_SOLID[w.getBlock(Math.floor(px), y - 1, Math.floor(pz))] && !collides(w, px - m.w, y, pz - m.w, px + m.w, y + m.h, pz + m.w)) return [px, y, pz];
  }
  return null;
}
function m3Behind(m, q, d) { const y = m3Yaw(q); return m3Spot(m, q.x + Math.sin(y) * d, q.z + Math.cos(y) * d, 0, 1.2, 10); }
function m3Blink(m, spot, tile = 'mana_arcane') {
  if (!spot) return false;
  const g = m.game;
  m3Fx(g, m.x, m.y + m.h / 2, m.z, tile, 26, 1.6, { life: 0.5 });
  m.x = spot[0]; m.y = spot[1]; m.z = spot[2]; m.vx = m.vy = m.vz = 0; m.path = null;
  m3Fx(g, m.x, m.y + m.h / 2, m.z, tile, 26, 1.6, { life: 0.5 });
  g.sfx.playAt('pop', m.x, m.y + 1, m.z);
  return true;
}
// through a wall: out the other side, if there is room
function m3Phase(m, dir) {
  const w = m.game.world, fx = -Math.sin(dir), fz = -Math.cos(dir);
  for (let d = 1.2; d <= 3.6; d += 0.4) { const x = m.x + fx * d, z = m.z + fz * d; if (!collides(w, x - m.w, m.y, z - m.w, x + m.w, m.y + m.h, z + m.w)) { m3Fx(m.game, m.x, m.y + 1, m.z, 'ectoplasm', 12, 0.8); m.x = x; m.z = z; return true; } }
  return false;
}
function m3Hover(m, h) { const gy = m3Ground(m.game, m.x, m.y + 0.5, m.z); m.flyVy = clamp((gy + h - m.y) * 2, -2, 2); }
function m3Swim(m, t, k = 2.5) { if (m.inWater) m.swimVy = clamp(((t ? t.y + 0.3 : m.y) - m.y) * k, -3.2, 3.2); }
function m3WaterAt(m, x, z) { const w = m.game.world; return T_LIQUID[w.getBlock(Math.floor(x), Math.floor(m.y + 0.3), Math.floor(z))] === 1 || T_LIQUID[w.getBlock(Math.floor(x), Math.floor(m.y) - 1, Math.floor(z))] === 1; }
function m3Dash(m, yaw, sp) { m.lockMove = true; m.vx = -Math.sin(yaw) * sp; m.vz = -Math.cos(yaw) * sp; }
// chase: on foot round walls, straight through the water
function m3Chase(m, t, dist, toT, dt, k = 1) {
  const T = m.T;
  if (m.inWater && T.swims) { m3Swim(m, t); return { want: dist < 0.7 + m.w ? 0 : (T.swimSpeed || T.speed) * k, dir: toT }; }
  if (m.noGrav) return { want: dist < 0.6 + m.w ? 0 : T.speed * k, dir: toT };
  return { want: dist < 0.6 + m.w ? 0 : T.speed * k, dir: (dist > 2.2 ? m.navDir(t.x, t.y, t.z, dt) : null) ?? toT };
}
// keep a few blocks off: near enough to cast, too far to be hit
function m3Kite(m, t, dist, toT, dt, lo, hi) {
  const T = m.T;
  if (m.inWater && T.swims) m3Swim(m, t);
  if (dist < lo) return { want: T.speed, dir: toT + Math.PI + Math.sin(m.age * 0.7 + m.id) * 0.6 };
  if (dist > hi || !m._m3sees) return m3Chase(m, t, dist, toT, dt);
  return { want: T.speed * 0.35, dir: toT + Math.PI / 2 * (Math.sin(m.age * 0.4 + m.id) > 0 ? 1 : -1) };
}
// a blow in reach: SRD damage, a round's attacks spread over six seconds
function m3Melee(m, t, dist, dyp, o = {}) {
  if (!t || m.attackCd > 0) return false;
  const reach = (o.reach ?? 1.3) + m.w + (t.w || 0.3) * 0.5;
  if (dist > reach || Math.abs(dyp) > (o.vreach ?? 1.9)) return false;
  m.attackCd = (o.cd ?? m.T.cd ?? 1.4) * (0.9 + Math.random() * 0.2);
  m._m3left = !m._m3left;
  let dmg = o.dmg ?? m.T.damage;
  if (m._m3inspired > 0) dmg += 2;
  const hit = m3Strike(m, t, dmg, o);
  if (hit && o.onHit) o.onHit(t);
  return true;
}
// following whoever summoned it
function m3Follow(m, L, dt) {
  if (!L) { m.wander(dt); const r = m.wanderMove(); r.want *= 0.5; return r; }
  const d = Math.hypot(L.x - m.x, L.z - m.z);
  if (m.inWater && m.T.swims) m.swimVy = clamp((L.y - m.y) * 2, -2, 2);
  if (d > 24 && m.teleportNear) { m.teleportNear(L); return { want: 0, dir: m.yaw }; }
  if (d > 4) return { want: m.T.speed * (d > 9 ? 1.4 : 1), dir: m.goToward ? m.goToward(L.x, L.y, L.z, dt) : Math.atan2(-(L.x - m.x), -(L.z - m.z)) };
  return { want: 0, dir: Math.atan2(-(L.x - m.x), -(L.z - m.z)) };
}
// an ally keeps on its foe, or takes the nearest threat to whoever it serves
function m3AllyFoe(m, dt) {
  let f = m._m3foe;
  if (f && (!f.alive || f.remove || Math.hypot(f.x - m.x, f.z - m.z) > 24)) f = null;
  m._m3foeT = (m._m3foeT || 0) - dt;
  if (!f && m._m3foeT <= 0) {
    m._m3foeT = 0.5;
    const L = m3Leader(m) || m; let bd = 16;
    for (const e of m.game.entities) if (m3FoeOf(m, e)) { const d = Math.hypot(e.x - L.x, e.z - L.z); if (d < bd) { bd = d; f = e; } }
    if (!f && m.petFoe && m.petFoe.alive && m.petFoe instanceof Mob) f = m.petFoe;
  }
  m._m3foe = f || null;
  return m._m3foe;
}
// a spell being gathered: arms up, a mark on the ground; returns 'busy', the finished cast, or null
function m3Begin(m, kind, secs, data) { m._m3c = Object.assign({ kind, t: secs, max: secs }, data || {}); m.castT = secs; if (m._m3c.dec) m._m3dec = m._m3c.dec; }
function m3Casting(m, dt) {
  const c = m._m3c;
  if (!c) return null;
  c.t -= dt; m.castT = Math.max(m.castT || 0, 0.15); m._m3castOne = !!c.one;
  if (c.dec) { c.dec.progress = clamp(1 - c.t / c.max, 0, 1); m._m3dec = c.dec; }
  if (c.t > 0) return 'busy';
  m._m3c = null; m._m3dec = null;
  return c;
}
// illusions: doubles that drift about, harm no one, and burst when touched
function m3Illusion(m, x, y, z, secs) {
  const g = m.game, e = g.addEntity(new Mob(g, m.type, x, y, z));
  e._m3illusion = secs; e.health = e.maxHealth = 1; e.yaw = m.yaw; e.heldItem = m.heldItem; e.noGrav = !!m.noGrav; e.variant = m.variant;
  return e;
}
function m3Pop(m, by) {
  const g = m.game;
  m.remove = true; m.deathTime = 0.0001;
  m3Fx(g, m.x, m.y + m.h / 2, m.z, 'mana_arcane', 30, 1.8, { life: 0.6 });
  g.sfx.playAt('pop', m.x, m.y + 1, m.z);
  if (by && by.floatText) by.floatText(m.x, m.y + m.h + 0.3, m.z, 'An illusion!', '#d8a0ff');
}
function m3IllusionAI(m, dt, p, dist, toP) {
  m._m3illusion -= dt;
  if (m._m3illusion <= 0) { m3Pop(m); return { want: 0, dir: m.yaw }; }
  if (m.noGrav) m.flyVy = Math.sin(m.age * 3 + m.id) * 0.8;
  m.castT = 0;
  return { want: p && dist < 7 ? m.T.speed * 0.45 : 0.25, dir: p ? toP + Math.sin(m.age * 1.3 + m.id) * 1.4 : m.yaw };
}
// an arrow-shot from a bow or crossbow (lands for about dmg)
function m3Shoot(m, t, dmg, sp = 22) {
  const g = m.game, ex = m.x - Math.sin(m.yaw) * 0.4, ey = m.y + m.h * 0.75, ez = m.z - Math.cos(m.yaw) * 0.4;
  const tx = t.x - ex, tz = t.z - ez, hd = Math.hypot(tx, tz), tt = hd / sp, ty = t.y + 1.2 - ey + 0.5 * 20 * tt * tt, l = Math.hypot(tx, ty, tz) || 1, j = () => (Math.random() - 0.5) * 0.03;
  g.addEntity(new Arrow(g, ex, ey, ez, (tx / l + j()) * sp, (ty / l + j()) * sp, (tz / l + j()) * sp, m, dmg * 30 / sp, false));
  g.sfx.playAt('bow', ex, ey, ez); m.swingT = 0.3;
}
// a thrown or cast missile at t: o = { dmg, el, tile, size, trail, speed, grav, onHit, type, knock, snd }
function m3Throw(m, t, o) {
  const g = m.game, [ex, ey, ez] = o.from || m3Hand(m), sp = o.speed || 16;
  const tx = t.x - ex, tz = t.z - ez, hd = Math.hypot(tx, tz), tt = hd / sp, ty = t.y + (t.h || 1.6) * 0.6 - ey + (o.grav ? 0.5 * o.grav * tt * tt : 0), l = Math.hypot(tx, ty, tz) || 1;
  g.addEntity(new M3Bolt(g, ex, ey, ez, tx / l * sp, ty / l * sp, tz / l * sp, m, Object.assign({ target: t instanceof Mob ? t : null }, o)));
  if (o.snd !== false) g.sfx.playAt(o.snd || 'bow', ex, ey, ez);
}
class M3Bolt extends Entity {
  constructor(game, x, y, z, vx, vy, vz, owner, o) { super(game, x, y, z); this.netLocalOnly = true; this.vx = vx; this.vy = vy; this.vz = vz; this.owner = owner; this.o = o; this.w = 0.2; this.h = 0.3; }
  update(dt) {
    const g = this.game, o = this.o;
    this.age += dt;
    if (this.age > (o.life || 3)) { this.remove = true; return; }
    try {
      const ally = this.owner && m3Ally(this.owner);
      for (let s = 0; s < 3; s++) {
        const h = dt / 3;
        if (o.grav) this.vy -= o.grav * h;
        this.x += this.vx * h; this.y += this.vy * h; this.z += this.vz * h;
        if (!ally) for (const q of g.pawns()) if (!q.dead && Math.abs(q.x - this.x) < 0.5 && Math.abs(q.z - this.z) < 0.5 && this.y > q.y - 0.1 && this.y < q.y + 1.9) return this.hit(q);
        for (const e of g.entities) {
          if (!(e instanceof Mob) || !e.alive || e === this.owner || !(ally ? m3FoeOf(this.owner, e) : (e === o.target))) continue;
          if (Math.abs(e.x - this.x) < e.w + 0.25 && Math.abs(e.z - this.z) < e.w + 0.25 && this.y > e.y - 0.1 && this.y < e.y + e.h + 0.1) return this.hit(e);
        }
        if (T_SOLID[g.world.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))]) return this.pop();
      }
      if (o.trail && Math.random() < dt * 40) spellSpark(g, this.x, this.y, this.z, o.trail, { life: 0.35, size: 0.06 });
    } catch (e) { this.remove = true; m3Warn('bolt', e); }
  }
  hit(q) {
    const o = this.o, own = this.owner && this.owner.alive !== false ? this.owner : null;
    const src = { type: o.type || 'mob', attacker: own || undefined, knock: o.knock ?? 2 };
    if (o.el) src.element = o.el; if (!own) src.bypass = true;
    q.hurt(Math.max(1, Math.round(o.dmg || 1)), src);
    if (o.onHit) try { o.onHit(q, this); } catch (e) { m3Warn('bolt hit', e); }
    this.pop();
  }
  pop() { this.remove = true; m3Fx(this.game, this.x, this.y, this.z, this.o.burst || this.o.trail || 'white', 12, 1.2, { life: 0.4 }); }
  snap() { return null; }
  applySnap() {}
  draws() {}
  glow(out) { out.push({ x: this.x, y: this.y, z: this.z, size: this.o.size || 0.3, uv: tileUV(ATLAS.tile[this.o.tile] ?? ATLAS.tile.white), light: 0xFF }); }
}
// a lingering cloud (spores, ink): o = { r, t, tile, n, size, poison, slow, dmg, every, el, by }
class M3Cloud extends Entity {
  constructor(game, x, y, z, o) { super(game, x, y, z); this.netLocalOnly = true; this.o = o; this.life = o.t || 5; this.k = 0.25; this.w = o.r || 2; this.h = 1; }
  update(dt) {
    const g = this.game, o = this.o;
    this.age += dt;
    if (this.age > this.life) { this.remove = true; return; }
    try {
      const fadeK = Math.min(1, (this.life - this.age) / 1.2);
      for (let i = 0, n = Math.ceil(dt * (o.n || 16) * fadeK + Math.random() - 0.5); i < n; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * o.r; spellSpark(g, this.x + Math.cos(a) * r, this.y + Math.random() * (o.hgt || 1.8), this.z + Math.sin(a) * r, o.tile || 'm3_spore', { vy: 0.15, vx: (Math.random() - 0.5) * 0.3, vz: (Math.random() - 0.5) * 0.3, life: 1.6, size: o.size || 0.35, grow: 1.2 }); }
      this.k -= dt;
      if (this.k > 0) return;
      this.k = o.every || 1.2;
      for (const q of g.pawns()) {
        if (q.dead || Math.hypot(q.x - this.x, q.z - this.z) > o.r + 0.3 || Math.abs(q.y + 0.9 - this.y) > 2.6) continue;
        if (o.poison) giveEffect(q, 'poison', o.poison);
        if (o.slow) giveEffect(q, 'slow', o.slow, 1);
        if (o.dmg) q.hurt(o.dmg, { type: 'mob', attacker: o.by && o.by.alive ? o.by : undefined, bypass: true, knock: 0, element: o.el });
      }
    } catch (e) { this.remove = true; m3Warn('cloud', e); }
  }
  snap() { return null; }
  applySnap() {}
  draws() {}
}
// lasting harm on a held creature (an ally's whelm)
function m3DotTick(m, dt) {
  const d = m._m3dot;
  if (!d.t || !d.t.alive || d.t.remove) { m._m3dot = null; return; }
  d.k -= dt;
  if (d.k <= 0) { d.k = d.every; d.n--; m3Strike(m, d.t, d.dmg, { bypass: true, knock: 0, el: d.el, noSwing: true }); if (d.n <= 0) m._m3dot = null; }
}
// limbs knitting back (trolls): the lost parts whose parents are there grow first
function m3Regrow(m, n) {
  const M = typeof MODELS !== 'undefined' && MODELS[m.T.model];
  if (!M || !m.lost || !m.lost.size) return false;
  const roots = [...m.lost].filter(nm => { const p = M.parts.find(q => q.name === nm); return p && (!p.parent || !m.lost.has(p.parent)); });
  for (const r of roots.slice(0, n)) { const gone = [r]; for (const p of M.parts) if (p.parent && gone.includes(p.parent)) gone.push(p.name); for (const nm of gone) m.lost.delete(nm); }
  const legs = m.lost.size && [...m.lost].some(nm => /^(leg|shin)/.test(nm));
  if (!m.lost.size) m.lost = null;
  if (!legs) { m.crawling = false; m.h = m.T.h; }
  m.limp = 0;
  m3Fx(m.game, m.x, m.y + m.h * 0.6, m.z, 'mana_heal', 24, 1.2, { life: 0.7 });
  m.game.sfx.playAt('squish', m.x, m.y + 1, m.z);
  return true;
}
const m3FireSrc = (src) => !!src && (src.element === 'fire' || src.element === 'acid' || src.type === 'burn' || src.type === 'lava' || src.type === 'fire');

// ---- the player under their power: held, frightened, charmed, dazed ----
function m3PlayerTick(lp, dt) {
  const P = lp.player, g = lp.g;
  if (P.dead || g.creative) { lp._m3hold = lp._m3charm = lp._m3fear = lp._m3daze = null; return; }
  const h = lp._m3hold;
  if (h) {
    h.t -= dt;
    const by = h.by;
    const gone = !by || by.remove || by.alive === false || (by.dndHeld > 0 && h.mode !== 'roots' && h.mode !== 'paralyze') || by._m3down > 0;
    if (h.t <= 0 || gone) {
      lp._m3hold = null;
      if (h.mode === 'swallow' && by && !gone) { const f = (by.w || 0.5) + 0.8; P.x = by.x - Math.sin(by.yaw) * f; P.z = by.z - Math.cos(by.yaw) * f; P.y = by.y + 0.3; P.vy = 5; P.vx = -Math.sin(by.yaw) * 5; P.vz = -Math.cos(by.yaw) * 5; lp.toast('You are spat out!', ''); }
    } else {
      let ax = h.x0, ay = null, az = h.z0;
      if (h.mode === 'grab') { const r = (by.w || 0.5) + 0.5; ax = by.x - Math.sin(by.yaw) * r; az = by.z - Math.cos(by.yaw) * r; }
      else if (h.mode === 'engulf' || h.mode === 'swallow' || h.mode === 'whelm') { ax = by.x; az = by.z; ay = by.y + (h.mode === 'swallow' ? 0.05 : 0.2); }
      const k = Math.min(1, dt * 10), nx = P.x + (ax - P.x) * k, nz = P.z + (az - P.z) * k, ny = ay == null ? P.y : P.y + (ay - P.y) * k, W = P.w || 0.3, HH = P.h || 1.8;
      if (!collides(g.world, nx - W, ny + 0.01, nz - W, nx + W, ny + HH, nz + W)) { P.x = nx; P.y = ny; P.z = nz; }
      P.vx = 0; P.vz = 0; if (ay !== null) P.vy = 0; P.fallStart = null;
      if (h.mode === 'paralyze') P.attackCd = Math.max(P.attackCd || 0, 0.25);
      if (Math.random() < dt * 8) spellSpark(g, P.x + (Math.random() - 0.5) * 0.7, P.y + Math.random() * 1.8, P.z + (Math.random() - 0.5) * 0.7,
        h.fx || (h.mode === 'roots' ? 'mana_heal' : h.mode === 'paralyze' ? 'mana_arcane' : h.mode === 'whelm' ? 'splash' : h.mode === 'swallow' ? 'venom_sac' : 'blood_particle'), { vy: 0.6, life: 0.6, size: 0.07 });
      if (h.dmg > 0) { h.tick -= dt; if (h.tick <= 0) { h.tick = h.every; lp.hurt(h.dmg, { type: 'mob', attacker: by, bypass: true, knock: 0, element: h.el }); } }
    }
  }
  const f = lp._m3fear;
  if (f) {
    f.t -= dt;
    if (f.t <= 0 || !f.by || f.by.remove) lp._m3fear = null;
    else {
      const dx = P.x - f.by.x, dz = P.z - f.by.z, l = Math.hypot(dx, dz) || 1;
      if (l < 12 && !lp._m3hold) { P.vx += dx / l * dt * 16; P.vz += dz / l * dt * 16; }
      P.slow = Math.max(P.slow || 0, 0.25);
      if (Math.random() < dt * 5) spellSpark(g, P.x + (Math.random() - 0.5) * 0.6, P.y + 1.9, P.z + (Math.random() - 0.5) * 0.6, 'smoke', { vy: 0.4, life: 0.5, size: 0.08 });
    }
  }
  const c = lp._m3charm;
  if (c) {
    c.t -= dt;
    if (c.t <= 0 || !c.by || c.by.remove || c.by.alive === false) lp._m3charm = null;
    else {
      c.k -= dt;
      if (c.k <= 0) { c.k = 0.45 + Math.random() * 0.3; c.dir = Math.random() * TAU; }
      if (!lp._m3hold) {
        if (c.pull) { const dx = c.by.x - P.x, dz = c.by.z - P.z, l = Math.hypot(dx, dz) || 1; if (l > 1.6) { P.vx += dx / l * dt * 14; P.vz += dz / l * dt * 14; } P.yaw += m3Wrap(Math.atan2(-dx, -dz) - P.yaw) * Math.min(1, dt * 2); }
        else { P.vx += -Math.sin(c.dir) * dt * 22; P.vz += -Math.cos(c.dir) * dt * 22; P.yaw += Math.sin(g.time * 2.7) * dt * 0.9; }
      }
      P.slow = Math.max(P.slow || 0, 0.2);
      if (c.dmg) { c.tick -= dt; if (c.tick <= 0) { c.tick = c.every || 1.5; lp.hurt(c.dmg, { type: 'mob', attacker: c.by, bypass: true, knock: 0, element: 'necrotic' }); } }
      if (Math.random() < dt * 6) spellSpark(g, P.x + (Math.random() - 0.5) * 0.6, P.y + 1.2 + Math.random() * 0.8, P.z + (Math.random() - 0.5) * 0.6, c.possess ? 'ectoplasm' : 'mana_heal', { vy: 0.5, life: 0.6, size: 0.06 });
    }
  }
  const d = lp._m3daze;
  if (d) {
    d.t -= dt;
    if (d.t <= 0) lp._m3daze = null;
    else { P.yaw += Math.sin(g.time * 2.1) * dt * 0.55; P.pitch = clamp(P.pitch + Math.cos(g.time * 1.7) * dt * 0.3, -1.5, 1.5); P.slow = Math.max(P.slow || 0, 0.25); if (Math.random() < dt * 4) spellSpark(g, P.x + Math.cos(g.time * 5) * 0.4, P.y + 2.0, P.z + Math.sin(g.time * 5) * 0.4, 'mana_arcane', { life: 0.4, size: 0.06 }); }
  }
}
{
  const base = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    if (!this._m3hold && !this._m3charm && !this._m3fear && !this._m3daze) return base.call(this, dt, inp);
    const h = this._m3hold;
    if (h && inp) inp = Object.assign({}, inp, { mx: 0, mz: 0, jump: false, sprint: false }, h.mode === 'paralyze' ? { attack: false, attackPressed: false, use: false, usePressed: false } : {});
    const r = base.call(this, dt, inp);
    try { m3PlayerTick(this, dt); } catch (e) { this._m3hold = this._m3charm = this._m3fear = this._m3daze = null; m3Warn('player', e); }
    return r;
  };
}

// ---- the hooks every creature here goes through ----
{
  // per-frame upkeep (regeneration, after-images, fading), after the body has moved
  const baseUpd = Mob.prototype.update;
  Mob.prototype.update = function (dt) {
    const T = this.T;
    if (!T || !T.m3 || this.ghost) return baseUpd.call(this, dt);
    const b0 = this.burn;
    baseUpd.call(this, dt);
    if (this.remove || !this.alive) return;
    try {
      if (T.noSunBurn && this.burn > b0 && !(this._m3fireT > 0)) this.burn = b0;   // the sun doesn't burn these
      if (this._m3fireT > 0) this._m3fireT -= dt;
      if (this._m3dot) m3DotTick(this, dt);
      if (T.m3tick) T.m3tick(this, dt);
      if (T.m3summon && this.owner) m3PetTick(this, dt);
    } catch (e) { m3Warn(this.type + ' tick', e); }
  };
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const T = this.T;
    if (!T || !T.m3 || this.ghost) return baseHurt.call(this, amount, src);
    if (this._m3illusion) { if (this.alive) m3Pop(this, src.attacker); return 0; }
    if (this._m3hidden) return 0;
    if (src.element === 'fire' || src.type === 'lava') this._m3fireT = 4;
    if (T.m3hurt) { let r; try { r = T.m3hurt(this, amount, src); } catch (e) { m3Warn(this.type + ' hurt', e); } if (r === 0) return 0; if (typeof r === 'number') amount = r; }
    const dealt = baseHurt.call(this, amount, src);
    try {
      const a = src.attacker;
      // a hard enough blow from the one it's holding breaks the hold
      if (dealt > 0 && a && a._m3hold && a._m3hold.by === this) {
        const h = a._m3hold, ch = h.mode === 'swallow' ? (dealt >= 3 ? 0.6 : 0.25) : h.mode === 'engulf' || h.mode === 'whelm' ? 0.25 : h.mode === 'roots' || h.mode === 'paralyze' ? 0 : 0.35;
        if (Math.random() < ch) { a._m3hold = null; m3Say(a, h.mode === 'swallow' ? 'You cut your way out!' : 'You break free!', 'good'); if (h.mode === 'swallow') { a.player.vy = 5; } }
      }
      if (dealt > 0 && T.m3hurtAfter) T.m3hurtAfter(this, dealt, src);
    } catch (e) { m3Warn(this.type + ' hurt after', e); }
    return dealt;
  };
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src = {}) {
    const T = this.T;
    if (!T || !T.m3 || this.ghost) return baseDie.call(this, src);
    if (this._m3illusion) { m3Pop(this); return; }
    if (T.m3die) { let r; try { r = T.m3die(this, src); } catch (e) { m3Warn(this.type + ' die', e); } if (r === 'cancel') return; }
    for (const q of this.game.pawns()) m3Release(q, this);
    baseDie.call(this, src);
    if (T.m3after) try { T.m3after(this, src); } catch (e) { m3Warn(this.type + ' after', e); }
  };
  // drawing: faded (melting into shadow, ethereal, invisible), hidden (inside you), after-images
  const baseDraws = Mob.prototype.draws;
  Mob.prototype.draws = function (out, viewer) {
    const T = this.T;
    if (!T || !T.m3) return baseDraws.call(this, out, viewer);
    if (this._m3hidden) return;
    if (this._m3echoes && this._m3echoes.length) { try { m3DrawEchoes(this, out); } catch (e) { this._m3echoes = null; } }
    const n0 = out.length;
    baseDraws.call(this, out, viewer);
    const f = this._m3fade;
    if (f != null && f < 0.999) for (let i = n0; i < out.length; i++) { const d = out[i]; d.alpha = (d.alpha ?? 1) * f; d.noCull = true; }
  };
  const baseGlow = Mob.prototype.glow;
  Mob.prototype.glow = function (out) {
    if (baseGlow) baseGlow.call(this, out);
    const f = this.T && this.T.m3glow;
    if (f && this.alive && !this._m3hidden) try { f(this, out); } catch (e) { m3Warn(this.type + ' glow', e); }
  };
  const baseDecal = Mob.prototype.telegraphDecal;
  Mob.prototype.telegraphDecal = function () { const d = this._m3dec; if (d && this.alive && this._m3c) return d; if (d) this._m3dec = null; return baseDecal ? baseDecal.call(this) : null; };
}
function m3DrawEchoes(m, out) {
  const M = typeof MODELS !== 'undefined' && MODELS[m.T.model];
  if (!M || !M.def.rig) return;
  for (const e of m._m3echoes) {
    const base = Mat4.create(); Mat4.rotateY(base, e.yaw);
    const mats = rigMatrices(m, M, base);
    for (const part of M.parts) { const mm = mats[part.name]; if (!mm || !rigPartShown(m, part)) continue; out.push({ mesh: part.mesh, m: mm, px: e.x, py: e.y, pz: e.z, light: [12, 12], tint: [0.4, 0.2, 0.75, 0.6], noCull: true, alpha: Math.max(0.05, e.a) * (part.alpha ?? 1) }); }
  }
}
function m3Echo(m, strong) { const E = m._m3echoes || (m._m3echoes = []); E.push({ x: m.x, y: m.y, z: m.z, yaw: m.yaw, a: strong ? 0.55 : 0.4 }); while (E.length > 6) E.shift(); }
// summoned with an owner, the pet code steers it: point it at the summoner's foes, and let it whelm
function m3PetTick(m, dt) {
  const f = m3AllyFoe(m, dt);
  if (f) m.petFoe = f;
  if (m._m3whelm > 0) m._m3whelm -= dt;
  if (m.type === 'water_elemental' && f && Math.hypot(f.x - m.x, f.z - m.z) < 2 + m.w && m3Ready(m, 'whelm', 9, 2)) m3Whelm(m, [f]);
}

// ---- the brain every creature here thinks with ----
// o: { range, sink (how it settles in water when idle), idle (m, dt) => move | null, voice [lo, span] }
function m3Brain(m, dt, p, dist, dyp, toP, think, o) {
  m.lockMove = false;
  if (m.castT > 0) m.castT -= dt;
  if (m.throwT > 0) m.throwT -= dt;
  if (m.parryT > 0) m.parryT -= dt;
  if (m._m3inspired > 0) m._m3inspired -= dt;
  if (m.dndHeld > 0 || m.dndSleep > 0) return { want: 0, dir: m.yaw };
  if (m._m3stun > 0) { m._m3stun -= dt; return { want: 0, dir: m.yaw }; }
  if (m._m3illusion) return m3IllusionAI(m, dt, p, dist, toP);
  if (m.dndCharm > 0) { m.wander(dt); const r = m.wanderMove(); r.want *= 0.5; return r; }
  let t = p, s = null;
  if (m3Ally(m)) {
    t = m3AllyFoe(m, dt);
    if (!t) { m._m3hunt = false; m._m3c = null; return m3Follow(m, m3Leader(m), dt); }
    s = { near: true, sees: true, hunting: true };
  }
  if (t && t !== p) ({ dist, dyp, dir: toP } = m3Rel(m, t));
  if (!s) s = t && !t.dead ? m.senses(t, dist, dyp, dt, o.range || 22) : { hunting: false, sees: false };
  m._m3hunt = s.hunting; m._m3sees = s.sees;
  m.voiceTick(dt, dist, o.voice ? o.voice[0] : 6, o.voice ? o.voice[1] : 8);
  if (!s.hunting) {
    m._m3c = null; m._m3dec = null;
    if (m.noGrav) m.flyVy = Math.sin(m.age * 0.8 + m.id) * 0.5;
    if (m.inWater && m.T.swims) m.swimVy = Math.sin(m.age * 0.6 + m.id) * 0.4 - (o.sink || 0);
    if (o.idle) { const r = o.idle(m, dt); if (r) return r; }
    m.wander(dt); const r = m.wanderMove(); r.want *= o.wanderK ?? 1; return r;
  }
  let r;
  try { r = think(m, dt, t, dist, dyp, toP, s); } catch (e) { m3Warn(m.type, e); r = null; }
  return r || { want: 0, dir: toP };
}
const M3AI = (o, think) => function (dt, p, dist, dyp, toP) { return m3Brain(this, dt, p, dist, dyp, toP, think, o || {}); };
const M3T = MOB_TYPES;

// ================= the marshes =================
MONSTER_AI.lizardfolk = M3AI({ range: 22, sink: 0.5 }, (m, dt, t, dist, dyp, toT) => {
  m3Melee(m, t, dist, dyp, { onHit: (q) => { if ((m._m3bash = !m._m3bash)) { m3Pull(q, m.x, m.z, -7, 3); if (q.floatText) q.floatText(q.x, q.y + 2, q.z, 'Shield bash!', '#c8b080'); } } });
  return m3Chase(m, t, dist, toT, dt);
});
MONSTER_AI.lizardfolk_shaman = M3AI({ range: 24, sink: 0.4 }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game, c = m3Casting(m, dt);
  if (c === 'busy') return { want: 0, dir: toT };
  if (c && c.kind === 'entangle') {
    for (let i = 0; i < 26; i++) { const a = Math.random() * TAU, r = Math.random() * 1.8; spellSpark(g, c.x + Math.cos(a) * r, c.y + Math.random() * 1.4, c.z + Math.sin(a) * r, 'mana_heal', { vy: 1.4, life: 0.7, size: 0.09 }); }
    if (Math.hypot(t.x - c.x, t.z - c.z) < 2 && !m3Save(t, 'str', 12)) m3Hold(t, m, 3, 'roots', { msg: 'Roots burst from the mud and hold you fast!' });
  }
  if (s.sees && dist < 12 && dist > 2.5 && m3Ready(m, 'entangle', 13, 4)) { m3Begin(m, 'entangle', 0.9, { x: t.x, y: t.y, z: t.z, dec: m3DecAt(g, t.x, t.y, t.z, 1.9, [0.35, 0.9, 0.2, 0.85]) }); return { want: 0, dir: toT }; }
  if (s.sees && dist < 9 && dist > 2 && m3Ready(m, 'whip', 4.5, 1.5)) {
    // thorn whip: a lash of thorny vine that drags you in
    const [hx, hy, hz] = m3Hand(m); m3Line(g, hx, hy, hz, t.x, t.y + 1.1, t.z, 'mana_heal', 14, { life: 0.35 });
    m.castT = 0.35; m._m3castOne = true;
    if (m3Strike(m, t, 4, { el: 'piercing', knock: 0, noSwing: true })) m3Pull(t, m.x, m.z, 9, 2);
  } else if (s.sees && dist < 16 && dist > 3 && m3Ready(m, 'flame', 3.4, 2)) {
    m.castT = 0.3; m._m3castOne = true;
    m3Throw(m, t, { dmg: 5, el: 'fire', tile: 'mana_fire', trail: 'flame', size: 0.3, speed: 13, snd: 'ignite', onHit: (q) => { if (q.ignite) q.ignite(1.5); else if (q instanceof Mob && !q.T.fireImmune) q.burn = Math.max(q.burn || 0, 2); } });
  }
  m3Melee(m, t, dist, dyp);
  return m3Kite(m, t, dist, toT, dt, 4, 9);
});
MONSTER_AI.giant_frog = M3AI({ range: 18, sink: 0.2 }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game, held = m3Holding(m);
  if (m._m3tongue > 0) m._m3tongue -= dt;
  m.tongueOut = m._m3tongue > 0 || (held && held._m3hold.mode === 'grab');
  if (held) {
    const h = held._m3hold;
    m.lockMove = true; m.vx *= 0.5; m.vz *= 0.5;
    if (h.mode === 'grab' && h.max - h.t > 1.1) { h.mode = 'swallow'; h.t = h.max = 4; h.dmg = 2; h.el = 'acid'; h.every = h.tick = 1.5; m3Say(held, 'The giant frog swallows you! Hit it to cut your way out.'); g.sfx.playAt('frog', m.x, m.y + 0.6, m.z); }
    return { want: 0, dir: toT };
  }
  if (s.sees && dist > 1.8 && dist < 5.5 && Math.abs(dyp) < 2 && m3Ready(m, 'tongue', 4.5, 1.5)) {
    m._m3tongue = 0.4;
    const mx = m.x - Math.sin(m.yaw) * 0.9, mz = m.z - Math.cos(m.yaw) * 0.9;
    m3Line(g, mx, m.y + 0.5, mz, t.x, t.y + 1, t.z, 'pink_skin', Math.ceil(dist * 4), { life: 0.3, size: 0.09 });
    if (!m3Save(t, 'dex', 11)) { m3Strike(m, t, m.T.damage, { knock: 0, el: 'piercing', noSwing: true }); m3Pull(t, m.x, m.z, Math.min(14, dist * 3), 2); m3Hold(t, m, 2.5, 'grab', { msg: 'The giant frog\'s tongue drags you in!' }); }
    return { want: 0, dir: toT };
  }
  m3Melee(m, t, dist, dyp, { el: 'piercing', onHit: (q) => { if (Math.random() < 0.5 && !m3Save(q, 'str', 11)) m3Hold(q, m, 2.5, 'grab', { msg: 'The giant frog grabs you in its mouth!' }); } });
  return m3Chase(m, t, dist, toT, dt);
});
MONSTER_AI.troll = M3AI({ range: 26 }, (m, dt, t, dist, dyp, toT) => {
  if (m._m3down > 0) return { want: 0, dir: m.yaw };
  m3Melee(m, t, dist, dyp, { reach: 1.7, knock: 4, el: 'slashing' });
  return m3Chase(m, t, dist, toT, dt);
});
Object.assign(M3T.troll, {
  // fire or acid stops it knitting; otherwise it heals, regrows limbs, and gets back up
  m3hurt(m, amt, src) {
    if (m3FireSrc(src)) m._m3burnt = 6;
    if (m._m3down > 0) {
      if (m3FireSrc(src)) { m._m3true = true; return amt; }
      m._m3downDmg = (m._m3downDmg || 0) + amt;
      if (m._m3downDmg >= 20) { m._m3true = true; if (src.attacker && src.attacker.floatText) src.attacker.floatText(m.x, m.y + 1, m.z, 'Hacked apart!', '#ff9a7a'); }
    }
    return amt;
  },
  m3die(m, src) {
    if (m._m3true || m._m3burnt > 0 || m.burn > 0 || m3FireSrc(src)) return;
    if (!(m._m3down > 0)) {
      m._m3down = 6; m._m3downDmg = 0;
      for (const q of m.game.pawns()) m3Release(q, m);
      if (src.attacker && src.attacker.floatText) src.attacker.floatText(m.x, m.y + 1.5, m.z, 'Its wounds are closing!', '#9aea6a');
      if (src.attacker && !m._m3told) { m._m3told = true; m3Say(src.attacker, 'The troll falls... and starts to knit back together. Burn it, or use acid!'); }
    }
    m._m3src = src.attacker ? src : m._m3src;
    m.health = 1;
    return 'cancel';
  },
  m3tick(m, dt) {
    if (m._m3burnt > 0) m._m3burnt -= dt;
    const burnt = m._m3burnt > 0 || m.burn > 0;
    if (m._m3down > 0) {
      m._m3down -= dt; m.vx *= 0.5; m.vz *= 0.5;
      if (burnt) { m._m3true = true; m.health = 0; m.die(m._m3src || {}); return; }
      if (Math.random() < dt * 6) spellSpark(m.game, m.x + (Math.random() - 0.5), m.y + 0.3 + Math.random() * 0.4, m.z + (Math.random() - 0.5), 'mana_heal', { vy: 0.8, life: 0.6, size: 0.07 });
      if (m._m3down <= 0) { m.health = Math.max(m.health, 15); m3Regrow(m, 99); m.game.sfx.playAt('ogre_angry', m.x, m.y + 2, m.z); m.attackCd = 0.6; }
      return;
    }
    if (!burnt && m.health < m.maxHealth) { m.health = Math.min(m.maxHealth, m.health + dt * 2.5); if (Math.random() < dt * 2) spellSpark(m.game, m.x + (Math.random() - 0.5) * 0.8, m.y + Math.random() * m.h, m.z + (Math.random() - 0.5) * 0.8, 'mana_heal', { vy: 0.6, life: 0.5, size: 0.06 }); }
    if (burnt && Math.random() < dt * 4) spellSpark(m.game, m.x + (Math.random() - 0.5) * 0.8, m.y + Math.random() * m.h, m.z + (Math.random() - 0.5) * 0.8, 'smoke', { vy: 0.8, life: 0.8, size: 0.12 });
    if (m.lost && m.lost.size && !burnt) { m._m3regrow = (m._m3regrow || 0) + dt; if (m._m3regrow > 8) { m._m3regrow = 0; m3Regrow(m, 1); } }
  },
});
MONSTER_AI.shambling_mound = M3AI({ range: 18, sink: 0.6 }, (m, dt, t, dist, dyp, toT) => {
  const held = m3Holding(m) || (m._m3eng && m._m3eng.alive && m._m3eng.dndHeld > 0 ? m._m3eng : null);
  m.engulfT = held ? 0.3 : 0;
  if (held) { m.lockMove = true; m.vx *= 0.3; m.vz *= 0.3; return { want: 0, dir: toT }; }
  m3Melee(m, t, dist, dyp, { reach: 1.5, knock: 3, el: 'bludgeoning', onHit: (q) => {
    m._m3slams = (m._m3slams || 0) + 1;
    if (m._m3slams >= 2 && m3Ready(m, 'engulf', 10, 0)) { m._m3slams = 0; if (!m3Save(q, 'str', 14)) { m3Hold(q, m, 5, 'engulf', { dmg: 5, every: 2, el: 'bludgeoning', fx: 'mana_heal', msg: 'The shambling mound engulfs you!' }); if (q instanceof Mob) m._m3eng = q; } }
  } });
  return m3Chase(m, t, dist, toT, dt);
});
M3T.shambling_mound.m3hurt = (m, amt, src) => {
  if (src.element === 'lightning') { m.health = Math.min(m.maxHealth, m.health + amt); m3Fx(m.game, m.x, m.y + 1.2, m.z, 'mana_light', 24, 1.4); if (src.attacker && src.attacker.floatText) src.attacker.floatText(m.x, m.y + m.h + 0.3, m.z, 'Absorbed!', '#fff070'); return 0; }
  return amt;
};
MONSTER_AI.giant_crocodile = M3AI({ range: 16, idle: (m, dt) => { if (m.inWater) m.swimVy = clamp((Math.floor(m.y) + 0.55 - m.y) * 3, -1, 1); m.wander(dt); const r = m.wanderMove(); r.want *= m.inWater ? 0.5 : 0.35; return r; } }, (m, dt, t, dist, dyp, toT) => {
  const g = m.game, held = m3Holding(m);
  if (m._m3sweep > 0) m._m3sweep -= dt;
  if (m._m3jaw > 0) m._m3jaw = Math.max(0, m._m3jaw - dt * 2.5);
  if (m.inWater) m.swimVy = clamp((t.y + 0.2 - m.y) * 2, -2.5, 2.5);
  if (held) { m._m3jaw = 0.7; m.lockMove = true; m.vx *= 0.4; m.vz *= 0.4; return { want: 0, dir: toT }; }
  // a sweep of the tail at whatever's beside or behind it
  const rel = m3Wrap(toT - m.yaw);
  if (dist < 3.4 && Math.abs(rel) > 1.3 && m3Ready(m, 'tail', 3.2, 1)) {
    m._m3sweep = 0.5; m._m3sweepSide = rel > 0 ? 1 : -1;
    if (m3Strike(m, t, m.T.tailDamage, { knock: 8, el: 'bludgeoning', noSwing: true })) m3Pull(t, m.x, m.z, -5, 5);
    return { want: 0, dir: m.yaw };
  }
  if (m._m3lunge > 0) {
    m._m3lunge -= dt;
    if (dist < 1.5 + m.w && m.attackCd <= 0) {
      m.attackCd = m.T.cd; m._m3jaw = 1; m._m3lunge = 0;
      if (m3Strike(m, t, m.T.damage, { knock: 0, el: 'piercing' }) && !m3Save(t, 'str', 16)) m3Hold(t, m, 3.5, 'grab', { dmg: 5, every: 1.5, el: 'piercing', msg: 'The giant crocodile clamps its jaws on you!' });
    }
    return { want: m.T.run, dir: toT };
  }
  if (dist < (m.inWater ? 8 : 5) && Math.abs(dyp) < 2.5 && m3Ready(m, 'lunge', 2.8, 0.5)) { m._m3lunge = 0.9; if (m.onGround || m.inWater) m.vy = m.inWater ? 2 : 4; g.sfx.playAt('croc_hurt', m.x, m.y + 0.5, m.z); }
  return m3Chase(m, t, dist, toT, dt, 0.85);
});

// ================= the coast and the sea =================
MONSTER_AI.merrow = M3AI({ range: 24 }, (m, dt, t, dist, dyp, toT, s) => {
  if (s.sees && dist > 3 && dist < 13 && m.heldItem && m3Ready(m, 'harpoon', 6, 2)) {
    m.throwT = 0.5;
    const d0 = dist;
    m3Throw(m, t, { dmg: m.T.harpoon, el: 'piercing', tile: 'dnd_spear', size: 0.5, trail: 'white', speed: 18, onHit: (q) => { m3Pull(q, m.x, m.z, Math.min(14, d0 * 1.4), 2.5); m3Say(q, 'The merrow\'s harpoon drags you toward it!'); } });
  }
  m3Melee(m, t, dist, dyp, { reach: 1.6, el: 'slashing' });
  return m3Chase(m, t, dist, toT, dt);
});
MONSTER_AI.sahuagin = M3AI({ range: 24 }, (m, dt, t, dist, dyp, toT, s) => {
  // blood frenzy: a wounded foe drives it wild
  const frenzy = m3HP(t) < m3MaxHP(t);
  if (frenzy && Math.random() < dt * 3) spellSpark(m.game, m.x + (Math.random() - 0.5) * 0.5, m.y + 1.5 + Math.random() * 0.4, m.z + (Math.random() - 0.5) * 0.5, 'blood_particle', { vy: 0.5, life: 0.5, size: 0.06 });
  if (s.sees && dist > 4 && dist < 10 && m.heldItem && m3Ready(m, 'javelin', 5, 2)) { m.throwT = 0.5; m3Throw(m, t, { dmg: 5, el: 'piercing', tile: 'dnd_javelin', size: 0.45, speed: 17, grav: 6 }); }
  m3Melee(m, t, dist, dyp, { dmg: m.T.damage + (frenzy ? 2 : 0), el: 'slashing' });
  return m3Chase(m, t, dist, toT, dt, frenzy ? 1.2 : 1);
});
MONSTER_AI.sahuagin_priestess = M3AI({ range: 24 }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game, c = m3Casting(m, dt);
  if (c === 'busy') return { want: 0, dir: toT };
  if (c && c.kind === 'hold') { m3Fx(g, c.x, c.y + 1, c.z, 'mana_arcane', 30, 1.2, { life: 0.6 }); if (Math.hypot(t.x - c.x, t.z - c.z) < 2.6 && !m3Save(t, 'wis', 12)) m3Hold(t, m, 2.5, 'paralyze', { msg: 'The priestess\'s prayer holds you paralysed!' }); }
  // healing word for her kin
  if (m3Ready(m, 'heal', 12, 3)) {
    const kin = m.game.entities.filter(e => e instanceof Mob && e.alive && e.T && e.T.faction === 'sahuagin' && !e._m3illusion && e.health < e.maxHealth * 0.7 && Math.hypot(e.x - m.x, e.z - m.z) < 10);
    if (kin.length) { m.castT = 0.6; for (const e of kin) { e.health = Math.min(e.maxHealth, e.health + 6); m3Fx(g, e.x, e.y + 1, e.z, 'mana_heal', 18, 1); } g.sfx.playAt('spell_heal', m.x, m.y + 1.5, m.z); }
  }
  if (s.sees && dist < 12 && m3Ready(m, 'hold', 14, 5)) { m3Begin(m, 'hold', 1.0, { x: t.x, y: t.y, z: t.z, dec: m3DecAt(g, t.x, t.y, t.z, 1.6, [0.7, 0.4, 1, 0.85]) }); return { want: 0, dir: toT }; }
  if (s.sees && dist < 16 && dist > 2.5 && m3Ready(m, 'bolt', 4.5, 1.5)) { m.castT = 0.35; m._m3castOne = true; m3Throw(m, t, { dmg: 10, el: 'radiant', tile: 'mana_light', trail: 'mana_light', size: 0.35, speed: 15, snd: 'spell_zap' }); }
  m3Melee(m, t, dist, dyp);
  return m3Kite(m, t, dist, toT, dt, 4, 9);
});
MONSTER_AI.sea_hag = M3AI({ range: 22, idle: (m) => { if (!m.variant && m.health >= m.maxHealth) m.variant = 'sea_hag_fair'; return null; } }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game;
  // the fair face holds from afar; close up, or hurt, the truth shows
  if (m.variant && (dist < 7 || m.hurtTime > 0 || m.health < m.maxHealth)) { m.variant = null; m3Fx(g, m.x, m.y + 1.2, m.z, 'mana_heal', 30, 1.2, { life: 0.6 }); g.sfx.playAt('witch', m.x, m.y + 1.5, m.z); }
  if (!m.variant && dist < 8 && m._m3sees && m3Looking(t, m) && m3Ready(m, 'visage', 15, 0)) m3Fear(t, m, 4, 11, 'The sea hag\'s horrific true face fills you with dread!');
  // the death glare, at anyone already afraid of it
  if ((t._m3fear && t._m3fear.by === m) && dist < 10 && m._m3sees && m3Ready(m, 'glare', 6, 1)) {
    m3Line(g, m.x, m.y + 1.55, m.z, t.x, t.y + 1.5, t.z, 'mana_arcane', 18, { life: 0.4, size: 0.09 });
    m3Strike(m, t, 13, { bypass: true, knock: 0, el: 'psychic', noSwing: true });
    m3Say(t, 'The sea hag fixes you with its death glare!');
  }
  m3Melee(m, t, dist, dyp, { el: 'slashing' });
  return m3Chase(m, t, dist, toT, dt);
});
function m3Whelm(m, victims) {
  const g = m.game;
  m._m3whelm = 3.5;
  m3Fx(g, m.x, m.y + 1.2, m.z, 'splash', 40, 2.2, { life: 0.7 });
  g.sfx.playAt('splash', m.x, m.y + 1, m.z);
  for (const q of victims) {
    if (m3Save(q, 'str', 15)) { m3Strike(m, q, 6, { bypass: true, knock: 4, el: 'bludgeoning', noSwing: true }); continue; }
    m3Strike(m, q, 13, { bypass: true, knock: 0, el: 'bludgeoning', noSwing: true });
    m3Hold(q, m, 3.5, 'whelm', { dmg: 4, every: 1.5, el: 'bludgeoning', fx: 'splash', msg: 'The water elemental whelms you! You can\'t breathe!' });
  }
}
MONSTER_AI.water_elemental = M3AI({ range: 20 }, (m, dt, t, dist, dyp, toT) => {
  if (m._m3whelm > 0) { m._m3whelm -= dt; m.lockMove = true; m.vx *= 0.3; m.vz *= 0.3; return { want: 0, dir: toT }; }
  if (dist < 1.6 + m.w && Math.abs(dyp) < 2 && m3Ready(m, 'whelm', 9, 3)) {
    const ally = m3Ally(m);
    m3Whelm(m, ally ? [t] : m.game.pawns().filter(q => !q.dead && Math.hypot(q.x - m.x, q.z - m.z) < 2.3 && Math.abs(q.y - m.y) < 2.2));
    return { want: 0, dir: toT };
  }
  m3Melee(m, t, dist, dyp, { reach: 1.5, knock: 4, el: 'bludgeoning' });
  return m3Chase(m, t, dist, toT, dt);
});
M3T.water_elemental.m3hurt = (m, amt, src) => {
  if (src.element === 'frost' || src.element === 'cold') { m.slowT = Math.max(m.slowT || 0, 6); if (!(m._m3froze > m.age)) { m._m3froze = m.age + 3; if (src.attacker && src.attacker.floatText) src.attacker.floatText(m.x, m.y + m.h + 0.3, m.z, 'Freezing!', '#c8f0ff'); m3Fx(m.game, m.x, m.y + 1.2, m.z, 'ice', 20, 1.2); } }
  return amt;
};
M3T.water_elemental.m3tick = (m, dt) => { if (m.slowT > 0 && Math.random() < dt * 8) spellSpark(m.game, m.x + (Math.random() - 0.5) * 1.2, m.y + Math.random() * m.h, m.z + (Math.random() - 0.5) * 1.2, 'ice', { vy: -0.4, life: 0.6, size: 0.07 }); if (Math.random() < dt * 4) spellSpark(m.game, m.x + (Math.random() - 0.5) * 1.2, m.y + Math.random() * 0.4, m.z + (Math.random() - 0.5) * 1.2, 'splash', { vy: 1, life: 0.5, size: 0.06 }); };
MONSTER_AI.giant_crab = M3AI({ range: 14 }, (m, dt, t, dist, dyp, toT) => {
  const held = m3Holding(m);
  m._m3grab = held ? 1 : 0;
  if (held) { m.lockMove = true; m.vx *= 0.5; m.vz *= 0.5; return { want: 0, dir: toT }; }
  m3Melee(m, t, dist, dyp, { el: 'bludgeoning', onHit: (q) => { if (Math.random() < 0.4 && !m3Save(q, 'str', 11)) m3Hold(q, m, 2, 'grab', { msg: 'The giant crab pinches you in its claw!' }); } });
  if (m.inWater) m3Swim(m, t);
  // scuttling sideways, always facing you
  if (dist > 1.4 + m.w) {
    const side = Math.sin(m.age * 0.5 + m.id) > 0 ? 1 : -1, mv = toT + side * 1.1, sp = m.inWater ? m.T.swimSpeed : m.T.speed, k = Math.min(1, dt * 8);
    m.lockMove = true; m.vx += (-Math.sin(mv) * sp - m.vx) * k; m.vz += (-Math.cos(mv) * sp - m.vz) * k;
    if (m.hitWall && m.onGround) m.wantJump = true;
  }
  return { want: 0, dir: toT };
});
MONSTER_AI.giant_octopus = M3AI({ range: 18, sink: 0.5 }, (m, dt, t, dist, dyp, toT) => {
  const g = m.game, held = m3Holding(m) || (m._m3eng && m._m3eng.alive && m._m3eng.dndHeld > 0 ? m._m3eng : null);
  m._m3grab = held ? 1 : 0;
  if (m._m3flee > 0) { m._m3flee -= dt; if (m.inWater) m.swimVy = -0.8; return { want: (m.inWater ? m.T.swimSpeed : m.T.speed) * 1.6, dir: toT + Math.PI }; }
  // hurt in the water: a cloud of ink, and it's gone
  if (m.inWater && m.health < m.maxHealth * 0.6 && m3Ready(m, 'ink', 25, 0)) {
    g.addEntity(new M3Cloud(g, m.x, m.y + 0.4, m.z, { r: 3.5, t: 6, tile: 'm3_ink', n: 26, size: 0.7, hgt: 2.2, slow: 2 }));
    if (held && !(held instanceof Mob)) { m3Release(held, m); m3Say(held, 'The octopus lets go in a cloud of ink!'); }
    m._m3flee = 3.5; g.sfx.playAt('splash', m.x, m.y + 0.5, m.z);
    return { want: m.T.swimSpeed * 1.6, dir: toT + Math.PI };
  }
  if (held) { m.lockMove = true; m.vx *= 0.5; m.vz *= 0.5; return { want: 0, dir: toT }; }
  m3Melee(m, t, dist, dyp, { reach: 1.8, el: 'bludgeoning', onHit: (q) => { if (!m3Save(q, 'str', 16)) { m3Hold(q, m, 3, 'grab', { dmg: 3, every: 1.5, el: 'bludgeoning', msg: 'The giant octopus wraps its tentacles around you!' }); if (q instanceof Mob) m._m3eng = q; } } });
  return m3Chase(m, t, dist, toT, dt);
});
{
  const brain = M3AI({ range: 20 }, (m, dt, t, dist, dyp, toT) => {
    if (m._m3lunge > 0) m._m3lunge -= dt;
    m3Swim(m, t, 2);
    // the long neck strikes from further than you'd think
    if (dist < 3.2 + m.w && Math.abs(dyp) < 2.6 && m.attackCd <= 0) { m.attackCd = m.T.cd; m._m3lunge = 0.5; m3Strike(m, t, m.T.damage, { el: 'piercing', knock: 3 }); }
    // it stays in the water
    const want = dist < 2.4 ? 0 : m.T.swimSpeed, nx = m.x - Math.sin(toT) * 1.2, nz = m.z - Math.cos(toT) * 1.2;
    return { want: m3WaterAt(m, nx, nz) ? want : 0, dir: toT };
  });
  MONSTER_AI.plesiosaurus = function (dt, p, dist, dyp, toP) {
    if (!this.inWater && typeof strandedFlop === 'function') { strandedFlop(this, dt, { air: 40, every: 2, heavy: true }); return { want: 0, dir: this.yaw }; }
    this.flopT = 0;
    return brain.call(this, dt, p, dist, dyp, toP);
  };
}
MONSTER_AI.drowned_villager = M3AI({ range: 22, sink: 0.4 }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game, c = m3Casting(m, dt);
  if (c === 'busy') return { want: 0, dir: toT };
  if (c && c.kind === 'lure') {
    const [hx, hy, hz] = m3Hand(m); m3Fx(g, hx, hy, hz, 'mana_heal', 30, 1.6, { life: 0.7 });
    for (const q of g.pawns()) if (!q.dead && Math.hypot(q.x - m.x, q.z - m.z) < 12 && m3Looking(q, m) && !m3Save(q, 'wis', 12)) m3Charm(q, m, 3, { pull: true, msg: 'The drowned lantern\'s light draws you in...' });
  }
  if (s.sees && dist > 3 && dist < 12 && m3Ready(m, 'lure', 10, 3)) { m3Begin(m, 'lure', 0.9, { one: true }); return { want: 0, dir: toT }; }
  m3Melee(m, t, dist, dyp, { el: 'cold', onHit: (q) => { if (Math.random() < 0.35 && !m3Save(q, 'str', 12)) m3Hold(q, m, 2.5, 'grab', { dmg: 1, every: 0.8, el: 'cold', fx: 'm3_bubble', msg: 'Cold hands drag at you; water fills your lungs!' }); } });
  return m3Chase(m, t, dist, toT, dt);
});
M3T.drowned_villager.m3glow = (m, out) => {
  if (!m.heldItem) return;
  const [x, y, z] = m3Hand(m), f = 0.5 + Math.sin(m.age * 7 + m.id) * 0.05 + (m.castT > 0 ? 0.4 : 0);
  out.push({ x, y: y - 0.12, z, size: f, uv: tileUV(ATLAS.tile.m3_glow ?? ATLAS.tile.white), light: 0xFF });
};
// the Leviathan of Saltwind Harbor
function m3PsyWave(m) {
  const g = m.game;
  g.shake(0.55, m);
  for (let k = 0; k < 3; k++) spellRing(g, m.x, m.y + 0.6 + k * 0.8, m.z, 'm3_psy', 1.5, 40, { speed: 9 + k, life: 1.3, size: 0.3 });
  g.sfx.playAt('rift_boom' in SND_FX ? 'rift_boom' : 'explode', m.x, m.y + 1, m.z, 48);
  for (const q of g.pawns()) {
    if (q.dead || Math.hypot(q.x - m.x, q.z - m.z) > 13.5 || Math.abs(q.y - m.y) > 9) continue;
    const half = m3Save(q, 'wis', 17);
    m3Strike(m, q, half ? 11 : 22, { bypass: true, knock: 2, el: 'psychic', noSwing: true });
    if (!half) { m3Daze(q, 5, 'The Leviathan\'s psychic wave leaves you reeling!'); giveEffect(q, 'weak', 6); }
  }
  for (const e of g.entities) if (e instanceof Mob && e !== m && e.alive && (e.owner || e.dndSummonBy) && Math.hypot(e.x - m.x, e.z - m.z) < 13.5) m3Strike(m, e, 18, { bypass: true, el: 'psychic', noSwing: true });
}
{
  const brain = M3AI({ range: 48, voice: [9, 8] }, (m, dt, t, dist, dyp, toT) => {
    const g = m.game, enraged = m.health < m.maxHealth * 0.5;
    if (enraged && !m._m3enraged) { m._m3enraged = true; g.toastAll('The Leviathan roars, and the Bloom on its back bursts open!', 'boss'); g.shake(0.5, m); }
    if (m._m3jaw > 0) m._m3jaw = Math.max(0, m._m3jaw - dt * 1.5);
    m3Swim(m, t, 1.5);
    if (m._m3ram > 0) {
      m._m3ram -= dt; m3Dash(m, m._m3ramYaw, 11);
      const hx = m.x - Math.sin(m.yaw) * 2.4, hz = m.z - Math.cos(m.yaw) * 2.4;
      for (const q of g.pawns()) if (!q.dead && !m._m3ramHit.has(q) && Math.hypot(q.x - hx, q.z - hz) < 2.6 && Math.abs(q.y - m.y) < 3) { m._m3ramHit.add(q); m3Strike(m, q, 18, { knock: 12, el: 'bludgeoning', noSwing: true }); }
      if (Math.random() < dt * 20) spellSpark(g, hx, m.y + 1, hz, 'splash', { vy: 1, life: 0.5, size: 0.1 });
      if (m.hitWall) m._m3ram = 0;
      return { want: 0, dir: m._m3ramYaw };
    }
    const c = m3Casting(m, dt);
    if (c === 'busy') {
      if (m._m3c.kind === 'wave') { m._m3jaw = 0.8; if (Math.random() < dt * 30) { const a = Math.random() * TAU; spellSpark(g, m.x + Math.cos(a) * 3, m.y + 1 + Math.random() * 2, m.z + Math.sin(a) * 3, 'm3_psy', { vx: -Math.cos(a) * 2, vz: -Math.sin(a) * 2, life: 0.6, size: 0.2 }); } }
      return { want: m.T.speed * 0.2, dir: m._m3c.kind === 'ram' ? m._m3c.yaw : toT };
    }
    if (c && c.kind === 'wave') m3PsyWave(m);
    if (c && c.kind === 'ram') { m._m3ram = 1.4; m._m3ramYaw = c.yaw; m._m3ramHit = new Set(); m.yaw = c.yaw; g.sfx.playAt('roar', m.x, m.y + 1, m.z, 48); return { want: 0, dir: c.yaw }; }
    if (dist < 22 && m3Ready(m, 'wave', enraged ? 9 : 13, 4)) { m3Begin(m, 'wave', 1.6, { dec: m3DecAt(g, m.x, m.y, m.z, 13.5, [0.7, 0.3, 1, 0.75]) }); g.sfx.playAt('warn', m.x, m.y, m.z, 40); return { want: 0, dir: toT }; }
    if (dist > 7 && dist < 20 && m3Ready(m, 'ram', enraged ? 8 : 11, 6)) { m.yaw = toT; m3Begin(m, 'ram', 1.0, { yaw: toT, dec: m3DecLane(m, toT, 2.4, 16, [1, 0.45, 0.2, 0.85]) }); g.sfx.playAt('charge', m.x, m.y, m.z, 40); return { want: 0, dir: toT }; }
    // the bite: the head is well forward of the body's middle
    const hx = m.x - Math.sin(m.yaw) * 2.4, hz = m.z - Math.cos(m.yaw) * 2.4, hd = Math.hypot(t.x - hx, t.z - hz);
    if (hd < 2.8 && Math.abs(dyp) < 3.2 && m.attackCd <= 0) { m.attackCd = m.T.cd; m._m3jaw = 1; m3Strike(m, t, m.T.damage, { el: 'piercing', knock: 6 }); }
    if (enraged && m3Ready(m, 'spores', 10, 2)) for (let i = 0; i < 2; i++) { const a = Math.random() * TAU; g.addEntity(new M3Cloud(g, m.x + Math.cos(a) * 4, m.y + 0.5, m.z + Math.sin(a) * 4, { r: 3, t: 7, tile: 'm3_psy', n: 14, size: 0.4, poison: 4, dmg: 2, every: 1.5, el: 'poison', by: m })); }
    return { want: dist < 4 ? m.T.swimSpeed * 0.4 : m.T.swimSpeed, dir: toT };
  });
  MONSTER_AI.leviathan = function (dt, p, dist, dyp, toP) {
    if (!this.inWater && typeof strandedFlop === 'function') { strandedFlop(this, dt, { air: 60, every: 3, heavy: true }); return { want: 0, dir: this.yaw }; }
    this.flopT = 0;
    return brain.call(this, dt, p, dist, dyp, toP);
  };
}
M3T.leviathan.m3after = (m) => { const g = m.game; m3Fx(g, m.x, m.y + 1.5, m.z, 'm3_psy', 80, 3, { life: 1.2, size: 0.25 }); g.toastAll('The Leviathan of Saltwind Harbor sinks into the deep. The harbour falls quiet.', 'good'); };

// ================= the Shadowfell =================
function m3Possess(m, q) {
  m._m3possess = { q, t: 6 }; m._m3hidden = true; m.invulnT = 99;
  m3Fx(m.game, q.x, q.y + 1.2, q.z, 'ectoplasm', 40, 1.5, { life: 0.7 });
  m3Charm(q, m, 6, { possess: true, dmg: 2, every: 1.5, msg: 'A ghost possesses you! You stagger, fighting for control...' });
  m.game.sfx.playAt('wraith', q.x, q.y + 1.5, q.z);
}
function m3Unpossess(m) {
  const P = m._m3possess; m._m3possess = null; m._m3hidden = false; m.invulnT = 0; m._m3stun = 1.2;
  const q = P && P.q;
  if (q) { const y = m3Yaw(q); m.x = q.x - Math.sin(y) * 1.6; m.z = q.z - Math.cos(y) * 1.6; m.y = q.y + 0.3; if (q._m3charm && q._m3charm.by === m) q._m3charm = null; m3Say(q, 'You cast the ghost out of you.', 'good'); m3Fx(m.game, m.x, m.y + 1.2, m.z, 'ectoplasm', 40, 1.5, { life: 0.7 }); }
}
MONSTER_AI.ghost = M3AI({ range: 24, voice: [7, 9], idle: (m) => { m.noGrav = true; m3Hover(m, 0.35 + Math.sin(m.age * 0.9 + m.id) * 0.25); return null; } }, (m, dt, t, dist, dyp, toT, s) => {
  m.noGrav = true;
  if (m._m3possess) return { want: 0, dir: m.yaw };
  if (s.sees && dist < 10 && !m._m3seen) { m._m3seen = true; if (m3Looking(t, m)) m3Fear(t, m, 4, 13, 'The ghost\'s horrifying visage chills you to the bone!'); }
  m.flyVy = clamp(((t.y + 0.2) - m.y) * 1.8, -3, 3);
  if (m.hitWall && m3Ready(m, 'phase', 1.0, 0)) m3Phase(m, toT);
  if (m._m3ether > 0) return { want: m.T.speed, dir: toT + 1.7 };
  const c = m3Casting(m, dt);
  if (c === 'busy') return { want: m.T.speed * 0.7, dir: toT };
  if (c && c.kind === 'possess' && dist < 2.6 && !(t instanceof Mob) && !t.dead) { if (m3Save(t, 'cha', 13)) { m._m3stun = 1; m3Pull(m, t.x, t.z, -6, 1); } else m3Possess(m, t); return { want: 0, dir: toT }; }
  if (dist < 2.2 && !(t instanceof Mob) && !t._m3charm && m3Ready(m, 'possess', 18, 6)) { m3Begin(m, 'possess', 1.0); m3Say(t, 'The ghost reaches into you...'); return { want: m.T.speed * 0.7, dir: toT }; }
  m3Melee(m, t, dist, dyp, { reach: 1.3, el: 'necrotic', knock: 2, vreach: 2.4 });
  return { want: dist < 0.8 + m.w ? 0 : m.T.speed, dir: toT };
});
Object.assign(M3T.ghost, {
  m3tick(m, dt) {
    const P = m._m3possess;
    if (P) {
      P.t -= dt; const q = P.q;
      if (!q || q.dead || P.t <= 0 || !q._m3charm || q._m3charm.by !== m) m3Unpossess(m);
      else { m.x = q.x; m.y = q.y + 0.2; m.z = q.z; m.vx = m.vy = m.vz = 0; }
      return;
    }
    if (m._m3ether > 0) { m._m3ether -= dt; m._m3fade = 0.12; if (m._m3ether <= 0) m.invulnT = 0; }
    else m._m3fade = 0.85 + Math.sin(m.age * 2 + m.id) * 0.1;
  },
  m3hurtAfter(m, dealt) { if (m.health < m.maxHealth * 0.5 && m3Ready(m, 'ether', 14, 0)) { m._m3ether = 3; m.invulnT = 3; m3Fx(m.game, m.x, m.y + 1, m.z, 'ectoplasm', 24, 1.2); } },
  m3die(m) { if (m._m3possess) m3Unpossess(m); },
});
MONSTER_AI.veil_echo_beast = M3AI({ range: 30, voice: [8, 10] }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game;
  // a step through the shadows, and it's behind you
  if (s.sees && dist > 4 && dist < 16 && m3Ready(m, 'step', 7, 3)) { const sp = m3Behind(m, t, 2.4); if (sp) { m3Echo(m, true); m3Blink(m, sp, 'smoke'); m.yaw = Math.atan2(-(t.x - m.x), -(t.z - m.z)); m.attackCd = Math.min(m.attackCd, 0.3); g.sfx.playAt('werewolf_angry', m.x, m.y + 1, m.z); } }
  if (s.sees && dist < 10 && m3Ready(m, 'howl', 16, 6)) { g.sfx.playAt('werewolf', m.x, m.y + 1.2, m.z, 40); m3Fear(t, m, 3, 13, 'The echo-beast\'s howl rings through you, again and again...'); }
  if (m.onGround && dist < 6 && dist > 2.4 && Math.abs(dyp) < 2 && m3Ready(m, 'pounce', 3, 1)) { m.vy = 6.2; m.vx = (t.x - m.x) / dist * 9; m.vz = (t.z - m.z) / dist * 9; m3Echo(m); }
  m3Melee(m, t, dist, dyp, { reach: 1.5, el: 'piercing', knock: 4 });
  return m3Chase(m, t, dist, toT, dt);
});
Object.assign(M3T.veil_echo_beast, {
  m3tick(m, dt) {
    const E = m._m3echoes;
    m._m3echoT = (m._m3echoT || 0) - dt;
    if ((m.speedNow || 0) > 3.2 && m._m3echoT <= 0) { m._m3echoT = 0.12; m3Echo(m); }
    if (E) { for (const e of E) e.a -= dt * 0.55; while (E.length && E[0].a <= 0) E.shift(); }
    if (Math.random() < dt * 5) spellSpark(m.game, m.x + (Math.random() - 0.5) * 0.8, m.y + 0.6 + Math.random() * 0.8, m.z + (Math.random() - 0.5) * 0.8, 'smoke', { vy: 0.5, life: 0.7, size: 0.1 });
  },
  // a blow often strikes only an after-image
  m3hurt(m, amt, src) { const a = src.attacker; if (a && !(a instanceof Mob) && src.type !== 'magic' && Math.random() < 0.3) { if (a.floatText) a.floatText(m.x, m.y + m.h + 0.3, m.z, 'An echo!', '#b080ff'); m3Echo(m, true); return 0; } return amt; },
});
MONSTER_AI.sentient_shadow = M3AI({ range: 22 }, (m, dt, t, dist, dyp, toT) => {
  // what you hold, it holds
  if (t.player && m3Ready(m, 'mimic', 1, 0)) { const h = t.player.inv && t.player.inv.held, id = h && h.id; m.heldItem = id && itemDef(id) && !(itemDef(id).block) ? id : null; }
  m3Melee(m, t, dist, dyp, { el: 'necrotic', onHit: (q) => { giveEffect(q, 'weak', 8); if (!m._m3told) { m._m3told = true; m3Say(q, 'Your strength drains into the shadow.'); } } });
  // your mirror image: it steps as you step, reflected
  if (t.player && dist < 10) {
    const P = t.player, nx = (t.x - m.x) / (dist || 1), nz = (t.z - m.z) / (dist || 1), vx = P.vx || 0, vz = P.vz || 0, d = vx * nx + vz * nz;
    let mx = vx - 2 * d * nx, mz = vz - 2 * d * nz;
    if (dist > 1.6) { mx += nx * m.T.speed * 0.6; mz += nz * m.T.speed * 0.6; }
    const sp = Math.min(m.T.speed * 1.3, Math.hypot(mx, mz));
    return { want: sp < 0.3 ? 0 : sp, dir: sp < 0.3 ? toT : Math.atan2(-mx, -mz) };
  }
  return m3Chase(m, t, dist, toT, dt);
});
Object.assign(M3T.sentient_shadow, {
  m3tick(m, dt) {
    const g = m.game, [sky, blk] = m.lightAt(1), light = Math.max(blk, Math.round(sky * clamp(g.dim === 0 ? g.env.day : 0, 0, 1)));
    const want = light < 7 ? 0.22 : light < 12 ? 0.6 : 1;
    m._m3fade = (m._m3fade ?? 1) + (want - (m._m3fade ?? 1)) * Math.min(1, dt * 3);
    if (light < 7 && m.health < m.maxHealth) m.health = Math.min(m.maxHealth, m.health + dt * 2);
    if (sky >= 14 && g.dim === 0 && g.env.day > 0.6) { m._m3sunT = (m._m3sunT || 0) + dt; if (m._m3sunT > 2) { m._m3sunT = 0; m.hurt(2, { type: 'magic', element: 'radiant', knock: 0 }); } }
  },
  // it answers a blow with a blow
  m3hurtAfter(m, dealt, src) { const a = src.attacker; if (a && !(a instanceof Mob) && Math.random() < 0.45 && Math.hypot(a.x - m.x, a.z - m.z) < 2.6) { m.attackCd = Math.min(m.attackCd, 0.08); if (a.floatText) a.floatText(m.x, m.y + m.h + 0.3, m.z, 'Mirrored!', '#b8b0ff'); } },
});

// ================= Duskwood =================
MONSTER_AI.corrupted_fey = M3AI({ range: 24 }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game, c = m3Casting(m, dt);
  if (c === 'busy') return { want: 0, dir: toT };
  if (c && c.kind === 'snare') {
    for (let i = 0; i < 30; i++) { const a = Math.random() * TAU, r = Math.random() * 1.8; spellSpark(g, c.x + Math.cos(a) * r, c.y + Math.random() * 1.6, c.z + Math.sin(a) * r, i % 2 ? 'mana_arcane' : 'mana_heal', { vy: 1.6, life: 0.6, size: 0.08 }); }
    if (Math.hypot(t.x - c.x, t.z - c.z) < 1.9 && !m3Save(t, 'str', 14)) m3Hold(t, m, 2.5, 'roots', { dmg: 2, every: 1, el: 'piercing', fx: 'mana_arcane', msg: 'Bloom-thorns burst from the ground and bind you!' });
  }
  // a blink through the air, leaving a double behind
  if ((s.sees && dist < 3 && m3Ready(m, 'blink', 7, 2)) || m._m3blinkNow) {
    m._m3blinkNow = false;
    const ox = m.x, oy = m.y, oz = m.z, sp = m3Spot(m, t.x, t.z, 3.5, 6.5);
    if (sp) { m3Illusion(m, ox, oy, oz, 6); m3Blink(m, sp, 'mana_arcane'); m.yaw = Math.atan2(-(t.x - m.x), -(t.z - m.z)); }
  }
  if (s.sees && dist < 12 && dist > 2.5 && m3Ready(m, 'snare', 11, 4)) { m3Begin(m, 'snare', 0.9, { x: t.x, y: t.y, z: t.z, dec: m3DecAt(g, t.x, t.y, t.z, 1.9, [0.6, 0.2, 0.9, 0.85]) }); return { want: 0, dir: toT }; }
  m3Melee(m, t, dist, dyp, { reach: 1.5, el: 'piercing', knock: 3 });
  return m3Chase(m, t, dist, toT, dt);
});
M3T.corrupted_fey.m3hurtAfter = (m) => { if (Math.random() < 0.22) m._m3blinkNow = true; };
MONSTER_AI.fey_trickster = M3AI({ range: 20, idle: (m) => { m.noGrav = true; m3Hover(m, 0.9 + Math.sin(m.age * 1.3 + m.id) * 0.3); return null; } }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game, w = g.world;
  m.noGrav = true;
  let floor = 0; for (let k = 1; k <= 5; k++) { if (T_SOLID[w.getBlock(Math.floor(m.x), Math.floor(m.y) - k, Math.floor(m.z))]) break; floor = k; }
  m.flyVy = clamp((Math.max(t.y + 1.0, m.y - floor + 0.9) - m.y) * 2, -2.5, 2.5);
  if (s.sees && dist < 12 && m3Ready(m, 'images', 14, 3)) {
    for (let i = 0; i < 2; i++) { const a = Math.random() * TAU; m3Illusion(m, m.x + Math.cos(a) * 1.8, m.y, m.z + Math.sin(a) * 1.8, 9); }
    m3Fx(g, m.x, m.y + 0.5, m.z, 'mana_arcane', 30, 1.6); g.sfx.playAt('witch', m.x, m.y + 0.5, m.z);
  }
  if (s.sees && dist < 10 && m3Ready(m, 'befuddle', 9, 5)) {
    m.castT = 0.6;
    m3Line(g, m.x, m.y + 0.6, m.z, t.x, t.y + 1.5, t.z, 'mana_arcane', 12, { life: 0.4 });
    if (!m3Save(t, 'wis', 12)) { m3Daze(t, 3.5, 'The trickster befuddles you; the world spins!'); m3Charm(t, m, 2.5, {}); }
  }
  if (m.health < m.maxHealth * 0.6 && m3Ready(m, 'vanish', 14, 0)) { m._m3invis = 3.5; m3Fx(g, m.x, m.y + 0.5, m.z, 'mana_arcane', 20, 1); }
  if (m._m3back > 0) { m._m3back -= dt; return { want: m.T.speed, dir: toT + Math.PI + 0.7 }; }
  if (m3Melee(m, t, dist, dyp, { reach: 1.1, el: 'piercing', vreach: 2.6 })) m._m3back = 1.0;
  return { want: dist < 0.6 ? 0 : m.T.speed, dir: toT };
});
Object.assign(M3T.fey_trickster, {
  m3tick(m, dt) { if (m._m3invis > 0) { m._m3invis -= dt; m._m3fade = 0.1; } else m._m3fade = 1; if (Math.random() < dt * 4) spellSpark(m.game, m.x + (Math.random() - 0.5) * 0.4, m.y + Math.random() * 0.8, m.z + (Math.random() - 0.5) * 0.4, 'mana_arcane', { vy: -0.3, life: 0.5, size: 0.04 }); },
  m3hurt(m, amt, src) { if (m._m3invis > 0 && src.attacker && !(src.attacker instanceof Mob) && Math.random() < 0.5) { if (src.attacker.floatText) src.attacker.floatText(m.x, m.y + 1, m.z, 'Miss', '#b8b8c0'); return 0; } return amt; },
});

// ================= the Redrock desert =================
MONSTER_AI.pollen_raider = M3AI({ range: 24 }, (m, dt, t, dist, dyp, toT, s) => {
  const frenzy = m.health < m.maxHealth * 0.5;
  if (frenzy && Math.random() < dt * 6) spellSpark(m.game, m.x + (Math.random() - 0.5) * 0.6, m.y + 1 + Math.random(), m.z + (Math.random() - 0.5) * 0.6, 'm3_spore', { vy: 0.4, life: 0.8, size: 0.12 });
  if (s.sees && !m._m3yelled && dist < 16) { m._m3yelled = true; m.game.sfx.playAt('raider', m.x, m.y + 1.6, m.z); }
  m3Melee(m, t, dist, dyp, { el: 'slashing', cd: frenzy ? 1.0 : undefined });
  return m3Chase(m, t, dist, toT, dt, frenzy ? 1.3 : 1);
});
M3T.pollen_raider.m3after = (m) => { m.game.addEntity(new M3Cloud(m.game, m.x, m.y + 0.2, m.z, { r: 2.5, t: 5, tile: 'm3_spore', n: 18, size: 0.4, poison: 4, dmg: 1, every: 1.2, el: 'poison' })); m.game.sfx.playAt('puff' in SND_FX ? 'puff' : 'pop', m.x, m.y + 1, m.z); };
MONSTER_AI.pollen_raider_chief = M3AI({ range: 28 }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game, enraged = m.health < m.maxHealth * 0.5;
  if (enraged && !m._m3rally) {
    m._m3rally = true; g.sfx.playAt('ogre_angry', m.x, m.y + 2, m.z, 40);
    for (let i = 0; i < 2; i++) { const sp = m3Spot(m, m.x, m.z, 2, 4); if (sp) { const e = g.addEntity(new Mob(g, 'pollen_raider', sp[0], sp[1], sp[2])); e.huntT = 10; m3Fx(g, sp[0], sp[1] + 1, sp[2], 'm3_spore', 30, 1.5, { life: 0.8, size: 0.2 }); } }
    for (const q of g.pawns()) m3Say(q, 'The chief bellows, and raiders stagger out of the spore-haze!');
  }
  const c = m3Casting(m, dt);
  if (c === 'busy') return { want: 0, dir: m._m3c.yaw ?? toT };
  if (c && c.kind === 'bellow') {
    const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);
    for (let i = 0; i < 70; i++) { const a = (Math.random() - 0.5) * 1.1, sp = 3 + Math.random() * 5, lx = fx * Math.cos(a) - fz * Math.sin(a), lz = fx * Math.sin(a) + fz * Math.cos(a); spellSpark(g, m.x + fx * 0.8, m.y + 1.8, m.z + fz * 0.8, 'm3_spore', { vx: lx * sp, vy: (Math.random() - 0.3), vz: lz * sp, life: 0.9, size: 0.2, grow: 1 }); }
    g.sfx.playAt('ogre_angry', m.x, m.y + 2, m.z);
    for (const q of g.pawns()) if (!q.dead && m3InLane(m, q, c.yaw, 6.5, 1.6)) { const ok = m3Save(q, 'con', 14); m3Strike(m, q, ok ? 5 : 10, { bypass: true, knock: 2, el: 'poison', noSwing: true }); if (!ok) { giveEffect(q, 'poison', 6); m3Daze(q, 2, 'The spore bellow chokes and staggers you!'); } }
  }
  if (c && c.kind === 'cleave') { m.swingT = 0.3; for (const q of g.pawns()) if (!q.dead && m3InLane(m, q, c.yaw, 4, 1.3)) m3Strike(m, q, 18, { knock: 9, el: 'slashing' }); g.shake(0.3, m); }
  if (s.sees && dist < 6 && m3Ready(m, 'bellow', enraged ? 7 : 10, 3)) { m.yaw = toT; m3Begin(m, 'bellow', 0.8, { yaw: toT, dec: m3DecLane(m, toT, 1.6, 6.5, [0.75, 0.9, 0.2, 0.85]) }); return { want: 0, dir: toT }; }
  if (dist < 3.6 && m3Ready(m, 'cleave', 6, 2)) { m.yaw = toT; m3Begin(m, 'cleave', 0.75, { yaw: toT, one: true, dec: m3DecLane(m, toT, 1.3, 4, [1, 0.25, 0.1, 0.9]) }); return { want: 0, dir: toT }; }
  m3Melee(m, t, dist, dyp, { reach: 1.5, el: 'slashing', knock: 5, cd: enraged ? 1.2 : undefined });
  return m3Chase(m, t, dist, toT, dt, enraged ? 1.2 : 1);
});
M3T.pollen_raider_chief.m3after = (m) => { m.game.addEntity(new M3Cloud(m.game, m.x, m.y + 0.2, m.z, { r: 4, t: 7, tile: 'm3_spore', n: 30, size: 0.5, poison: 5, dmg: 2, every: 1.2, el: 'poison' })); };

// ================= people =================
const m3Kin = (m, r, f) => m.game.entities.filter(e => e instanceof Mob && e !== m && e.alive && !e._m3illusion && e.T && e.T.faction === m.T.faction && Math.hypot(e.x - m.x, e.z - m.z) < r && (!f || f(e)));
MONSTER_AI.cultist = M3AI({ range: 22 }, (m, dt, t, dist, dyp, toT) => {
  // dark devotion: cultists together chant, and strike harder for it
  if (m3Ready(m, 'chant', 4, 1) && m3Kin(m, 8).length >= 2) { m._m3inspired = 4; m3Fx(m.game, m.x, m.y + 2.1, m.z, 'mana_arcane', 10, 0.6); }
  m3Melee(m, t, dist, dyp, { el: 'necrotic' });
  return m3Chase(m, t, dist, toT, dt);
});
MONSTER_AI.cult_fanatic = M3AI({ range: 24 }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game, c = m3Casting(m, dt);
  if (c === 'busy') return { want: 0, dir: toT };
  if (c && c.kind === 'hold') { m3Fx(g, c.x, c.y + 1, c.z, 'mana_arcane', 30, 1.2); if (Math.hypot(t.x - c.x, t.z - c.z) < 2.6 && !m3Save(t, 'wis', 13)) m3Hold(t, m, 2.5, 'paralyze', { msg: 'The fanatic\'s spell holds you paralysed!' }); }
  if (c && c.kind === 'wounds') { m3Fx(g, t.x, t.y + 1, t.z, 'smoke', 24, 1); if (dist < 2.8) { const ok = m3Save(t, 'con', 13); m3Strike(m, t, ok ? 8 : 16, { bypass: true, knock: 2, el: 'necrotic' }); } }
  if (s.sees && dist < 11 && dist > 3 && m3Ready(m, 'hold', 15, 4)) { m3Begin(m, 'hold', 1.0, { x: t.x, y: t.y, z: t.z, dec: m3DecAt(g, t.x, t.y, t.z, 1.6, [0.6, 0.1, 0.2, 0.85]) }); return { want: 0, dir: toT }; }
  if (dist < 2.2 && m3Ready(m, 'wounds', 9, 2)) { m3Begin(m, 'wounds', 0.6, { one: true }); return { want: 0, dir: toT }; }
  m3Melee(m, t, dist, dyp, { el: 'piercing' });
  return m3Chase(m, t, dist, toT, dt);
});
MONSTER_AI.mage = M3AI({ range: 26 }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game, c = m3Casting(m, dt);
  if (c === 'busy') return { want: 0, dir: toT };
  if (c && c.kind === 'fireball') {
    for (let i = 0; i < 50; i++) { const a = Math.random() * TAU, r = Math.random() * 3; spellSpark(g, c.x + Math.cos(a) * r, c.y + 0.2 + Math.random() * 2, c.z + Math.sin(a) * r, i % 3 ? 'mana_fire' : 'flame', { vy: 1.5 + Math.random() * 2, life: 0.7, size: 0.12 }); }
    g.sfx.playAt('explode', c.x, c.y, c.z, 32); g.shake(0.25, { x: c.x, z: c.z });
    for (const q of g.pawns()) if (!q.dead && Math.hypot(q.x - c.x, q.z - c.z) < 3.2 && Math.abs(q.y - c.y) < 3) { const ok = m3Save(q, 'dex', 14); m3Strike(m, q, ok ? 10 : 20, { bypass: true, knock: 6, el: 'fire', noSwing: true }); if (!ok && q.ignite) q.ignite(2); }
  }
  // misty step away from anyone who gets close
  if (dist < 2.6 && m3Ready(m, 'misty', 8, 1)) { const sp = m3Spot(m, m.x, m.z, 5, 8); if (sp && m3Blink(m, sp, 'mana_arcane')) return { want: 0, dir: toT }; }
  if (s.sees && dist < 18 && dist > 3 && m3Ready(m, 'fireball', 10, 4)) { m3Begin(m, 'fireball', 1.2, { x: t.x, y: t.y, z: t.z, dec: m3DecAt(g, t.x, t.y, t.z, 3.2, [1, 0.4, 0.1, 0.85]) }); g.sfx.playAt('ignite', m.x, m.y + 1.5, m.z); return { want: 0, dir: toT }; }
  if (s.sees && dist < 20 && m3Ready(m, 'burst', 2.4, 1)) { m.castT = 0.3; m._m3castOne = true; m3Throw(m, t, { dmg: m.T.damage, el: 'force', tile: 'mana_arcane', trail: 'mana_arcane', size: 0.35, speed: 16, snd: 'spell_zap' }); }
  m3Melee(m, t, dist, dyp, { dmg: m.T.melee, el: 'piercing' });
  return m3Kite(m, t, dist, toT, dt, 5, 11);
});
MONSTER_AI.priest_acolyte = M3AI({ range: 22 }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game, c = m3Casting(m, dt);
  if (c === 'busy') return { want: 0, dir: toT };
  if (c && c.kind === 'flame') { for (let i = 0; i < 26; i++) spellSpark(g, c.x + (Math.random() - 0.5) * 0.8, c.y + Math.random() * 2.4, c.z + (Math.random() - 0.5) * 0.8, 'mana_light', { vy: 2, life: 0.6, size: 0.1 }); if (Math.hypot(t.x - c.x, t.z - c.z) < 1.3 && !m3Save(t, 'dex', 12)) m3Strike(m, t, 5, { bypass: true, knock: 0, el: 'radiant', noSwing: true }); }
  if (m3Ready(m, 'heal', 10, 3)) { const hurt = m3Kin(m, 8, e => e.health < e.maxHealth * 0.6); const who = hurt[0] || (m.health < m.maxHealth * 0.6 ? m : null); if (who) { m.castT = 0.6; who.health = Math.min(who.maxHealth, who.health + 7); m3Fx(g, who.x, who.y + 1, who.z, 'mana_heal', 24, 1.2); g.sfx.playAt('spell_heal', m.x, m.y + 1.5, m.z); } }
  if (s.sees && dist < 14 && dist > 2.5 && m3Ready(m, 'flame', 4, 1.5)) { m3Begin(m, 'flame', 0.8, { x: t.x, y: t.y, z: t.z, dec: m3DecAt(g, t.x, t.y, t.z, 1.1, [1, 0.9, 0.4, 0.85]) }); return { want: 0, dir: toT }; }
  m3Melee(m, t, dist, dyp, { el: 'bludgeoning' });
  return m3Kite(m, t, dist, toT, dt, 2.5, 7);
});
MONSTER_AI.knight = M3AI({ range: 24 }, (m, dt, t, dist, dyp, toT) => {
  // leadership: a shout that steadies the allies near it
  if (m3Ready(m, 'lead', 15, 2)) { const al = m3Kin(m, 10); if (al.length) { m.castT = 0.5; m._m3castOne = true; for (const e of al) { e._m3inspired = 8; m3Fx(m.game, e.x, e.y + 2, e.z, 'mana_light', 10, 0.6); } m.game.sfx.playAt('raider', m.x, m.y + 1.6, m.z); } }
  m3Melee(m, t, dist, dyp, { reach: 1.5, knock: 5, el: 'slashing' });
  return m3Chase(m, t, dist, toT, dt);
});
M3T.knight.m3hurt = (m, amt, src) => {
  const a = src.attacker;
  if (a && !(a instanceof Mob) && src.type !== 'magic' && src.type !== 'arrow' && src.type !== 'projectile' && Math.hypot(a.x - m.x, a.z - m.z) < 3.2 && m3Ready(m, 'parry', 5, 0)) {
    m.parryT = 0.5; if (a.floatText) a.floatText(m.x, m.y + m.h + 0.3, m.z, 'Parried!', '#e0e4ec'); m.game.sfx.playAt('anvil', m.x, m.y + 1.2, m.z); m3Fx(m.game, m.x - Math.sin(m.yaw) * 0.5, m.y + 1.3, m.z - Math.cos(m.yaw) * 0.5, 'white', 10, 1.5);
    return 0;
  }
  return amt;
};
MONSTER_AI.veteran = M3AI({ range: 24 }, (m, dt, t, dist, dyp, toT, s) => {
  // the second of its two blows
  if (m._m3second > 0) { m._m3second -= dt; if (m._m3second <= 0 && dist < 1.3 + m.w + 0.3 && Math.abs(dyp) < 1.9) { m._m3left = !m._m3left; m3Strike(m, t, m.T.damage, { el: 'slashing' }); } }
  // a heavy crossbow at range
  if (s.sees && dist > 6 && dist < 18 && m3Ready(m, 'bolt', 3.5, 1.5)) m3Shoot(m, t, 7, 24);
  if (m3Melee(m, t, dist, dyp, { el: 'slashing' })) m._m3second = 0.4;
  return m3Chase(m, t, dist, toT, dt);
});
MONSTER_AI.scout = M3AI({ range: 32 }, (m, dt, t, dist, dyp, toT, s) => {
  m.shootT = (m.shootT ?? 1 + Math.random()) - dt;
  m.aiming = !!(s.sees && dist < 20 && dist > 2.5 && m.heldItem === 'bow');
  if (m.aiming && m.shootT <= 0) { m.shootT = 2.2 + Math.random() * 0.8; m3Shoot(m, t, m.T.damage); }
  if (!m.aiming) m3Melee(m, t, dist, dyp, { dmg: m.T.melee, el: 'piercing' });
  return m3Kite(m, t, dist, toT, dt, 6, 13);
});
MONSTER_AI.thug = M3AI({ range: 22 }, (m, dt, t, dist, dyp, toT) => {
  // pack tactics: with a friend at its target's side it hits harder; every third blow shoves
  const pack = m.game.entities.some(e => e instanceof Mob && e !== m && e.alive && e.T && e.T.hostile && !e._m3illusion && Math.hypot(e.x - t.x, e.z - t.z) < 3);
  m3Melee(m, t, dist, dyp, { dmg: m.T.damage + (pack ? 3 : 0), el: 'bludgeoning', onHit: (q) => { m._m3hits = (m._m3hits || 0) + 1; if (m._m3hits % 3 === 0) { m3Pull(q, m.x, m.z, -9, 4); if (q.floatText) q.floatText(q.x, q.y + 2, q.z, 'Shoved!', '#c8a080'); } } });
  return m3Chase(m, t, dist, toT, dt);
});
MONSTER_AI.spy = M3AI({ range: 24 }, (m, dt, t, dist, dyp, toT, s) => {
  if (m._m3hide > 0) { m._m3hide -= dt; m._m3fade = Math.max(0.3, (m._m3fade ?? 1) - dt * 2); return { want: m.T.speed, dir: toT + 1.3 * (m._m3side || 1) }; }
  m._m3fade = Math.min(1, (m._m3fade ?? 1) + dt * 2);
  if (s.sees && dist > 7 && dist < 16 && m3Ready(m, 'xbow', 3.5, 2)) m3Shoot(m, t, 5, 22);
  // sneak attack: from where you aren't looking, or out of hiding
  const sneak = !m3Looking(t, m) || (m._m3fade ?? 1) < 0.95;
  if (m3Melee(m, t, dist, dyp, { dmg: m.T.damage + (sneak ? 7 : 0), el: 'piercing', onHit: (q) => { if (sneak && q.floatText) q.floatText(q.x, q.y + 2.1, q.z, 'Sneak attack!', '#ff9a7a'); } })) { m._m3hide = 2.5; m._m3side = Math.random() < 0.5 ? -1 : 1; }
  return m3Chase(m, t, dist, toT, dt);
});
MONSTER_AI.guard_captain = M3AI({ range: 24 }, (m, dt, t, dist, dyp, toT, s) => {
  if (m3Ready(m, 'rally', 20, 6)) { const al = m3Kin(m, 12); if (al.length) { m.castT = 0.5; m._m3castOne = true; for (const e of al) { e._m3inspired = 8; e.health = Math.min(e.maxHealth, e.health + 5); m3Fx(m.game, e.x, e.y + 2, e.z, 'mana_light', 12, 0.7); } m.game.sfx.playAt('raider', m.x, m.y + 1.6, m.z); } }
  if (s.sees && dist > 5 && dist < 14 && m3Ready(m, 'javelin', 3.5, 1.5)) { m.throwT = 0.5; m3Throw(m, t, { dmg: m.T.javelin, el: 'piercing', tile: 'dnd_javelin', size: 0.45, speed: 18, grav: 6 }); }
  m3Melee(m, t, dist, dyp, { reach: 1.4, el: 'slashing' });
  return m3Chase(m, t, dist, toT, dt);
});
MONSTER_AI.archmage = M3AI({ range: 30 }, (m, dt, t, dist, dyp, toT, s) => {
  const g = m.game, c = m3Casting(m, dt);
  if (c === 'busy') return { want: 0, dir: m._m3c.yaw ?? toT };
  if (c && c.kind === 'lightning') {
    const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);
    for (let d = 0; d < 20; d += 0.5) spellSpark(g, m.x + fx * d + (Math.random() - 0.5) * 0.3, m.y + 1.4 + (Math.random() - 0.5) * 0.4, m.z + fz * d + (Math.random() - 0.5) * 0.3, 'mana_light', { life: 0.35, size: 0.12 });
    g.sfx.playAt('thunder' in SND_FX ? 'thunder' : 'explode', m.x, m.y + 1, m.z, 40);
    for (const q of g.pawns()) if (!q.dead && m3InLane(m, q, c.yaw, 20, 0.9)) { const ok = m3Save(q, 'dex', 17); m3Strike(m, q, ok ? 14 : 28, { bypass: true, knock: 3, el: 'lightning', noSwing: true }); }
  }
  if (c && c.kind === 'cold') {
    const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw);
    for (let i = 0; i < 80; i++) { const a = (Math.random() - 0.5) * 1.2, sp = 3 + Math.random() * 6, lx = fx * Math.cos(a) - fz * Math.sin(a), lz = fx * Math.sin(a) + fz * Math.cos(a); spellSpark(g, m.x + fx * 0.6, m.y + 1.4, m.z + fz * 0.6, i % 2 ? 'mana_frost' : 'ice', { vx: lx * sp, vy: (Math.random() - 0.5), vz: lz * sp, life: 0.8, size: 0.1 }); }
    g.sfx.playAt('spell_frost', m.x, m.y + 1, m.z);
    for (const q of g.pawns()) if (!q.dead && m3InLane(m, q, c.yaw, 8, 3)) { const ok = m3Save(q, 'con', 17); m3Strike(m, q, ok ? 15 : 30, { bypass: true, knock: 2, el: 'frost', noSwing: true }); if (!ok) { giveEffect(q, 'slow', 5, 2); if (q.player) q.player.chill = Math.max(q.player.chill || 0, 5); } }
  }
  // teleport away from anyone who corners it
  if (dist < 3 && m3Ready(m, 'teleport', 10, 1)) { const sp = m3Spot(m, m.x, m.z, 9, 13); if (sp && m3Blink(m, sp, 'mana_arcane')) return { want: 0, dir: toT }; }
  if (s.sees && dist < 18 && m3Ready(m, 'lightning', 9, 3)) { m.yaw = toT; m3Begin(m, 'lightning', 1.0, { yaw: toT, dec: m3DecLane(m, toT, 0.9, 20, [0.6, 0.8, 1, 0.85]) }); return { want: 0, dir: toT }; }
  if (s.sees && dist < 8 && m3Ready(m, 'cold', 12, 5)) { m.yaw = toT; m3Begin(m, 'cold', 1.0, { yaw: toT, dec: m3DecLane(m, toT, 3, 8, [0.6, 0.9, 1, 0.8]) }); return { want: 0, dir: toT }; }
  if (s.sees && dist < 22 && m3Ready(m, 'burst', 2.2, 1)) { m.castT = 0.3; m._m3castOne = true; m3Throw(m, t, { dmg: m.T.damage, el: 'force', tile: 'mana_arcane', trail: 'mana_arcane', size: 0.45, speed: 17, snd: 'spell_zap' }); }
  m3Melee(m, t, dist, dyp, { dmg: m.T.melee, el: 'bludgeoning' });
  return m3Kite(m, t, dist, toT, dt, 6, 12);
});
// magic resistance: spells land at half strength
M3T.archmage.m3hurt = (m, amt, src) => (src.type === 'magic' ? Math.max(1, Math.round(amt * 0.5)) : amt);
M3T.archmage.m3glow = (m, out) => { out.push({ x: m.x + Math.cos(m.age * 1.5) * 0.7, y: m.y + 2.3 + Math.sin(m.age * 2) * 0.1, z: m.z + Math.sin(m.age * 1.5) * 0.7, size: 0.22, uv: tileUV(ATLAS.tile.mana_arcane ?? ATLAS.tile.white), light: 0xFF }); };
}
