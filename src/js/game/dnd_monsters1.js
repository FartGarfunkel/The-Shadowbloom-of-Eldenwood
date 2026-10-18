// ---------------------------------------------------------------------------
// game/dnd_monsters1.js — alpha 3: creatures of the roads, the hills, the woods, the crypts and the Vale.
//
//   Roads and farms round Stonebridge     giant_rat, bandit, bandit_captain
//   The eastern hills, the goblin warren   goblin, goblin_boss, hobgoblin, bugbear, worg
//   Razorwood, the Haunted Glen, Eldenwood owlbear, giant_spider, ettercap, dire_wolf, awakened_tree, awakened_shrub
//   Old Greystone and the crypts           ghast, wight, specter, banshee, shadow, gelatinous_cube, will_o_wisp
//   The Verdant Vale and the Duskwood      treant, dryad, pixie, sprite, satyr, green_hag, nightmare
//
// Every one has a body of its own (a rig of shaped boxes, render/rigs.js), painted skins, its SRD 5.2
// numbers and its signature move: webs that hold you, a ghast's paralysing claws, a cube that swallows
// you, a banshee's wail, a shadow that drinks your strength, a hag's illusions, a dryad's charm...
// What they do to a player (held, restrained, asleep, charmed, frightened, engulfed, drained) lives on
// the LocalPlayer as `_m1` and wears off by itself. Nothing here puts creatures into the world: spawning
// reads `region`, `night`, `day` and `boss` (a hag's illusions and the trees a treant wakes are a fight's).
//
// This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast
// LLC, available at https://dnd.wizards.com/resources/systems-reference-document, licensed under the
// Creative Commons Attribution 4.0 International License.
// ---------------------------------------------------------------------------
{
// ---- what they leave behind ------------------------------------------------------------------------
defItem('owlbear_feather', { name: 'Owlbear Feather', desc: 'Stiff, barred and smelling of musk. Fletchers and charm-makers pay well.' });
defItem('worg_fang', { name: 'Worg Fang', desc: 'A long yellow fang from a worg. Goblins wear them as trophies.' });
defItem('spider_silk', { name: 'Giant Spider Silk', desc: 'A hank of silk strong as rope. Weaves into fine cloth and bowstrings.' });
defItem('heartwood', { name: 'Living Heartwood', fuel: 8, desc: 'Wood from an awakened tree. Still faintly warm, and it never quite stops growing.' });
defItem('grave_dust', { name: 'Grave Dust', desc: 'Ash and bone from the restless dead. Used in wards and darker work.' });
defItem('banshee_tear', { name: "Banshee's Tear", rarity: 'rare', desc: 'A cold drop of crystal that hums with grief when held near the ear.' });
defItem('shadow_essence', { name: 'Shadow Essence', desc: 'A wisp of darkness that will not stay in the light.' });
defItem('ooze_jelly', { name: 'Ooze Jelly', desc: 'A quivering lump of gelatinous cube. It eats through leather; keep it in glass.' });
defItem('wisp_essence', { name: "Will-o'-Wisp Essence", desc: 'A fading spark of marsh-light. It crackles when touched.' });
defItem('fey_blossom', { name: 'Fey Blossom', desc: 'A flower that never wilts, from the Vale\'s fey folk. Sweet as honey.' });
defItem('pixie_dust', { name: 'Pixie Dust', maxStack: 16, desc: 'Glittering dust that makes the hair stand up. Alchemists prize it.' });
defItem('satyr_horn', { name: 'Satyr Horn', desc: 'A curled horn, ridged like a seashell. Carvers make it into flutes.' });
defItem('hag_eye', { name: "Hag's Eye", rarity: 'rare', desc: 'An orange eye that still blinks now and then. Unpleasant, and very valuable.' });
defItem('nightmare_ember', { name: 'Nightmare Ember', fuel: 20, desc: 'A coal from a nightmare\'s hoof that will not go out.' });

// ---- skins -------------------------------------------------------------------------------------------
{
  const base = paintMonsterTiles;
  paintMonsterTiles = function () {
    base();
    const H = hexRGB, T = (n, f) => addTile(n, f);
    const B16 = '................';
    const R = (o) => { const a = []; for (let i = 0; i < 16; i++) a.push(o[i] || B16); return a; };   // char-art rows by index
    const tone = (p, c, k = 0.14) => shade(H(c), 1 + (p.rand() - 0.5) * k);
    const fur = (p, b, d, l, st = 0.25) => { p.noise(H(b), 0.2); p.speck(H(d), st); p.speck(H(l), 0.08); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.15) p.set(x, y, tone(p, d)); };
    const cloth = (p, b, d, k = 0.12) => { p.noise(H(b), k); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 4 === 0 && p.rand() < 0.45) p.set(x, y, tone(p, d)); };
    const leather = (p, b, d, l) => { p.noise(H(b), 0.16); p.speck(H(d), 0.18); p.speck(H(l), 0.05); };
    const rag = (p, from) => { for (let y = from; y < 16; y++) for (let x = 0; x < 16; x++) if (p.rand() < (y - from + 1) / (17 - from) * 0.9) p.set(x, y, [0, 0, 0], 0); };
    const holes = (p, ch) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (p.rand() < ch) p.set(x, y, [0, 0, 0], 0); };
    const plates = (p, b, d, l, rows = 4) => { p.noise(H(b), 0.1); const hgt = 16 / rows; for (let r = 0; r < rows; r++) { const y0 = Math.round(r * hgt); for (let x = 0; x < 16; x++) { p.set(x, y0, tone(p, l)); p.set(x, Math.round(y0 + hgt - 1), tone(p, d)); } for (let x = (r % 2) * 4; x < 16; x += 8) for (let y = y0; y < y0 + hgt; y++) p.set(x, y, tone(p, d)); } };
    const mail = (p, b, d, l) => { p.fill(H(d)); for (let y = 0; y < 16; y++) for (let x = (y % 2); x < 16; x += 2) p.set(x, y, tone(p, b, 0.2)); p.speck(H(l), 0.06); };
    const bark = (p, b, d, l) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const s = (x * 7 + Math.floor(y / 4) * 3) % 5 === 0 ? 0.7 : 1; p.set(x, y, shade(H(b), s * (0.88 + p.rand() * 0.22))); } for (let i = 0; i < 7; i++) { const x = Math.floor(p.rand() * 16), y = Math.floor(p.rand() * 14); p.set(x, y, H(d)); p.set(x, y + 1, H(d)); } p.speck(H(l), 0.04); };
    const leaves = (p, b, d, l, gaps = 0.16) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (p.rand() < gaps) continue; const r = p.rand(); p.set(x, y, r < 0.25 ? tone(p, d) : r > 0.9 ? tone(p, l) : tone(p, b, 0.25)); } };
    const radial = (p, a, b, r = 8, k = 0) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, mix(H(a), H(b), clamp(Math.hypot(x - 7.5, y - 7.5) / r + (p.rand() - 0.5) * k, 0, 1))); };
    const over = (rows, pal) => (p) => p.art(R(rows), pal);   // see-through overlay: just the eyes

    // ---- giant rat ----
    T('giant_rat_fur', p => fur(p, '#6a5a4c', '#463a30', '#8e7e6a', 0.3));
    T('giant_rat_back', p => { fur(p, '#54463a', '#33281f', '#76665a', 0.35); for (let x = 1; x < 16; x += 3) for (let y = 0; y < 15; y += 2) if (p.rand() < 0.5) { p.set(x, y, tone(p, '#2a2019')); p.set(x, y + 1, tone(p, '#3a2e24')); } });
    T('giant_rat_face', p => { fur(p, '#6a5a4c', '#463a30', '#8e7e6a', 0.18); p.art(R({ 3: '..dd........dd..', 4: '.dkkd......dkkd.', 5: '.dkrk......krkd.', 6: '..kk........kk..' }), { d: H('#3a2e26'), k: H('#140c0a'), r: H('#ff4a3a') }); });
    T('giant_rat_snout', p => { p.noise(H('#7e6c5a'), 0.14); p.art(R({ 0: '.....pPPPPp.....', 1: '.....pPPPPp.....', 2: '......pppp......', 5: '.w.w........w.w.', 7: '..w..........w..', 10: '.......kk.......', 11: '......kyyk......', 12: '......yYYy......', 13: '......yYYy......', 14: '.......yy.......' }), { p: H('#c87a7a'), P: H('#eaa2a2'), w: H('#d8d0c0'), k: H('#2a1a14'), y: H('#e0c860'), Y: H('#f8eca0') }); });
    T('giant_rat_tail', p => { p.noise(H('#c8968c'), 0.1); for (let y = 0; y < 16; y += 3) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#a07068')); });
    T('giant_rat_ear', p => { p.noise(H('#6a5a4c'), 0.15); for (let y = 2; y < 15; y++) for (let x = 2; x < 14; x++) if (Math.hypot(x - 7.5, y - 8.5) < 5.2) p.set(x, y, tone(p, '#d89a98')); });
    T('giant_rat_paw', p => { fur(p, '#6a5a4c', '#463a30', '#8e7e6a', 0.25); for (let y = 11; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#c8908a')); for (let x = 1; x < 16; x += 4) p.set(x, 15, H('#2a1a14')); });
    T('giant_rat_whisker', p => p.fill(H('#e0d8c8')));

    // ---- bandits ----
    const skinB = '#c89a72';
    T('bandit_face', p => { p.noise(H(skinB), 0.1); p.art(R({ 0: 'hhhhhhhhhhhhhhhh', 1: 'hhhhhhhhhhhhhhhh', 2: 'h..............h', 3: '..bbbb....bbbb..', 4: '..wwkw....wkww..', 5: '...ww......ww...', 7: '.......nn.......', 8: 'ssssssssssssssss', 9: 'sSssSssSssSssSss', 10: 'ssssssssssssssss', 11: 'ssSsssSsssSsssSs', 12: 'ssssssssssssssss', 13: 'sssSssssSssssSss', 14: 'ssssssssssssssss', 15: 'SSSSSSSSSSSSSSSS' }), { h: H('#2e2a1e'), b: H('#4a3420'), w: H('#ece4d8'), k: H('#3a2a1a'), n: H('#a87a56'), s: H('#7a2e24'), S: H('#521c16') }); });
    T('bandit_hood', p => { cloth(p, '#4a4430', '#33301f', 0.16); for (let y = 0; y < 16; y++) p.set(7, y, tone(p, '#2a2618')); for (let x = 0; x < 16; x++) p.set(x, 15, H('#26221a')); });
    T('bandit_tunic', p => { leather(p, '#6e4a2c', '#54381f', '#8a6238'); for (let i = 0; i < 16; i++) { const y = Math.floor(i * 0.7); p.set(i, y, H('#94683c')); p.set(i, y + 1, H('#8a6238')); p.set(i, y + 2, H('#3a2414')); } for (let x = 0; x < 16; x++) { p.set(x, 12, H('#2a1a10')); p.set(x, 13, H('#3a2616')); } for (const [x, y] of [[7, 12], [8, 12], [3, 2], [10, 7]]) p.set(x, y, H('#d0d0d8')); p.set(7, 13, H('#9a9aa4')); p.set(8, 13, H('#9a9aa4')); });
    T('bandit_sleeve', p => cloth(p, '#8a7656', '#6a5a40'));
    T('bandit_bracer', p => { leather(p, '#5a3e26', '#3e2a18', '#7a5634'); for (const y of [2, 6]) for (let x = 0; x < 16; x++) p.set(x, y, H('#2e1e10')); for (let y = 11; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, skinB, 0.1)); });
    T('bandit_pants', p => { cloth(p, '#3e3630', '#2a2420', 0.16); for (let y = 6; y < 10; y++) for (let x = 2; x < 7; x++) p.set(x, y, tone(p, '#5a4a3a')); });
    T('bandit_boot', p => { leather(p, '#4a3424', '#32221a', '#5a4030'); for (let y = 0; y < 3; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#6a4a30')); for (let x = 0; x < 16; x++) p.set(x, 15, H('#1e140e')); });
    T('bandit_cape', p => { cloth(p, '#4e4632', '#36301f', 0.16); for (let x = 0; x < 16; x++) p.set(x, 0, H('#2a2416')); rag(p, 12); });
    T('bandit_pouch', p => { leather(p, '#7a5634', '#5a3e24', '#9a7044'); for (let x = 0; x < 16; x++) { p.set(x, 5, H('#3a2414')); p.set(x, 6, H('#5a3e24')); } p.set(7, 7, H('#d0b060')); p.set(8, 7, H('#d0b060')); });
    // the captain: a red coat, a feathered hat, a scar and a well-kept beard
    const skinC = '#b8865e';
    T('bandit_captain_face', p => { p.noise(H(skinC), 0.1); p.art(R({ 2: '...s............', 3: '..bsbb....bbbb..', 4: '..wkws....wkww..', 5: '...sw......ww...', 6: '....s...........', 7: '.......nn.......', 8: '....mmmmmmmm....', 9: '...mmm.kk.mmm...', 10: '..mm.kkkkkk.mm..', 11: '..mmm......mmm..', 12: '...mmmmmmmmmm...', 13: '.....mmmmmm.....', 14: '.......mm.......' }), { s: H('#e0a090'), b: H('#2a1a10'), w: H('#ece4d8'), k: H('#3a1a10'), n: H('#9a6c48'), m: H('#2e1c12') }); });
    T('bandit_captain_hair', p => { p.noise(H('#2e1c12'), 0.15); p.speck(H('#4a3020'), 0.1); });
    T('bandit_captain_hat', p => { p.noise(H('#2a2220'), 0.14); p.speck(H('#1a1412'), 0.2); });
    T('bandit_captain_hatside', p => { p.noise(H('#2a2220'), 0.14); for (let y = 10; y < 14; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#a01e1e')); p.set(3, 11, H('#e8c050')); p.set(4, 11, H('#e8c050')); p.set(3, 12, H('#e8c050')); p.set(4, 12, H('#c89a30')); });
    T('bandit_captain_chest', p => { leather(p, '#5a3a22', '#3e2616', '#7a5032'); for (let y = 0; y < 11; y++) { p.set(7, y, H('#7a5032')); p.set(8, y, H('#3e2616')); } for (let y = 1; y < 11; y += 3) for (const x of [2, 5, 10, 13]) p.set(x, y, H('#c8ccd4')); for (let y = 11; y < 14; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#a81e1e')); for (let x = 0; x < 16; x++) p.set(x, 14, H('#1e120a')); p.set(7, 14, H('#e8c050')); p.set(8, 14, H('#e8c050')); });
    T('bandit_captain_coat', p => { cloth(p, '#7a1e1e', '#5a1414', 0.12); for (let x = 0; x < 16; x++) p.set(x, 15, H('#d8a840')); for (let y = 0; y < 16; y++) p.set(0, y, H('#c89a3a')); });
    T('bandit_captain_sleeve', p => { cloth(p, '#7a1e1e', '#5a1414', 0.12); });
    T('bandit_captain_cuff', p => { cloth(p, '#7a1e1e', '#5a1414', 0.12); for (let y = 5; y < 8; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#d8a840')); for (let y = 8; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#3a2418')); });
    T('bandit_captain_pants', p => cloth(p, '#22201e', '#161412', 0.14));
    T('bandit_captain_boot', p => { leather(p, '#1e1a18', '#121010', '#2e2826'); for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#5a3a22')); for (let x = 0; x < 16; x += 5) p.set(x, 9, H('#8a8e96')); });
    T('bandit_captain_pauldron', p => { p.noise(H('#8a8e96'), 0.1); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#c8ccd4')); p.set(x, 15, H('#4a4e56')); p.set(x, 7, H('#5a5e66')); } for (const x of [2, 7, 12]) { p.set(x, 3, H('#e0e4ec')); p.set(x, 11, H('#e0e4ec')); } });
    T('bandit_captain_plume', p => { p.noise(H('#c02a2a'), 0.15); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 5 === 0) p.set(x, y, tone(p, '#e85a4a')); for (let x = 0; x < 16; x++) for (let y = 13; y < 16; y++) p.set(x, y, tone(p, '#f0e8e0')); });

    // ---- goblins ----
    const gob = '#7a9a3a', gobD = '#5a7a2a', gobL = '#9ab84a';
    const gobSkin = (p, b, d, l) => { p.noise(H(b), 0.14); p.speck(H(d), 0.16); for (let k = 0; k < 4; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 15); p.set(x, y, H(l)); p.set(x + 1, y, tone(p, l)); } };
    T('goblin_skin', p => gobSkin(p, gob, gobD, gobL));
    T('goblin_face', p => { gobSkin(p, gob, gobD, gobL); p.art(R({ 2: '.dddd......dddd.', 3: '.ddddd....ddddd.', 4: '.yyyyk....kyyyy.', 5: '.yykky....ykkyy.', 6: '..yyy......yyy..', 9: '..k..........k..', 10: '..kkkkkkkkkkkk..', 11: '..kwkwkwwkwkwk..', 12: '...kkkkkkkkkk...', 13: '....k.w..w.k....' }), { d: H('#3e5a1a'), y: H('#f0d020'), k: H('#1a1408'), w: H('#f0ecd0') }); });
    T('goblin_ear', p => { gobSkin(p, gob, gobD, gobL); for (let y = 4; y < 12; y++) for (let x = 2; x < 14; x++) if (Math.abs(y - 8) < (14 - x) * 0.4) p.set(x, y, tone(p, '#c8786a')); });
    T('goblin_tunic', p => { leather(p, '#6a4a2a', '#4a321a', '#8a6238'); for (let k = 0; k < 2; k++) { const x0 = 2 + k * 7, y0 = 3 + k * 4; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) p.set(x0 + i, y0 + j, tone(p, k ? '#5a5a3a' : '#7a3a2a')); for (let i = 0; i < 4; i++) p.set(x0 + i, y0, H('#d8c8a0')); } for (let x = 0; x < 16; x++) { p.set(x, 13, H('#a08a5a')); p.set(x, 14, H('#6a5a3a')); } });
    T('goblin_plate', p => { p.noise(H('#7a6a5a'), 0.14); p.speck(H('#a0582a'), 0.22); p.speck(H('#5a4a3e'), 0.1); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#9a8a7a')); p.set(x, 15, H('#3a3028')); } for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) p.set(x, y, H('#c8c0b0')); });
    T('goblin_cloth', p => { cloth(p, '#7a3a26', '#5a2a1a', 0.16); rag(p, 11); });
    T('goblin_foot', p => { gobSkin(p, gob, gobD, gobL); for (let y = 0; y < 5; y++) for (let x = 0; x < 16; x++) if ((x + y) % 3 === 0) p.set(x, y, tone(p, '#a08a5a')); for (let x = 1; x < 16; x += 4) p.set(x, 15, H('#2a2010')); });
    T('goblin_hair', p => { p.noise(H('#1e1a14'), 0.2); p.speck(H('#3a3026'), 0.1); });
    // the boss: darker, red-eyed, a horned helm, a wolf pelt and a shield
    T('goblin_boss_skin', p => gobSkin(p, '#5e7a2a', '#46601e', '#7a9a3a'));
    T('goblin_boss_face', p => { gobSkin(p, '#5e7a2a', '#46601e', '#7a9a3a'); p.art(R({ 2: '.dddd......dddd.', 3: '.ddddds..dddddd.', 4: '.rrrrks...krrrr.', 5: '.rrkkrs...rkkrr.', 6: '..rrr.s....rrr..', 9: '..k..........k..', 10: '..kkkkkkkkkkkk..', 11: '..kwkwkwwkwkwk..', 12: '..wkkkkkkkkkkw..', 13: '..w..........w..' }), { d: H('#2e4410'), r: H('#ff3a20'), k: H('#1a1408'), w: H('#f0ecd0'), s: H('#a0b06a') }); });
    T('goblin_boss_helm', p => { p.noise(H('#6a6e74'), 0.12); p.speck(H('#4a4e54'), 0.15); for (let x = 0; x < 16; x++) { p.set(x, 14, H('#8a8e96')); p.set(x, 15, H('#3a3e44')); } for (let x = 1; x < 16; x += 3) p.set(x, 14, H('#c8ccd4')); for (let y = 0; y < 14; y++) p.set(7, y, H('#8a8e96')); });
    T('goblin_boss_horn', p => { p.noise(H('#e0d4b0'), 0.1); for (let y = 0; y < 16; y += 3) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#b8a888')); for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#5a4a30')); });
    T('goblin_boss_pelt', p => { fur(p, '#6a6a6a', '#4a4a4a', '#9a9a9a', 0.35); rag(p, 13); });
    T('goblin_boss_shield', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d > 8) continue; p.set(x, y, d > 6.6 ? tone(p, '#5a5e64') : tone(p, x % 4 === 0 ? '#5a3e22' : '#7a5430')); } for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, tone(p, '#8a8e96')); p.set(7, 7, H('#d8dce4')); p.art(R({ 3: '.....r....r.....', 4: '......r..r......', 12: '......rrrr......' }), { r: H('#a02a1a') }); });
    T('goblin_boss_mail', p => mail(p, '#7a7e86', '#3a3e44', '#c8ccd4'));

    // ---- hobgoblin: orange-red skin, red-lacquered plates laced in black, a crested helm ----
    const hob = '#b8582a';
    T('hobgoblin_skin', p => { p.noise(H(hob), 0.12); p.speck(H('#94401e'), 0.15); });
    T('hobgoblin_face', p => { p.noise(H(hob), 0.12); p.speck(H('#94401e'), 0.1); p.art(R({ 2: 'hhhhhhhhhhhhhhhh', 3: '.bbbbb....bbbbb.', 4: '..ykky....ykky..', 5: '..yyyy....yyyy..', 7: '......nnnn......', 8: '......nkkn......', 10: '...kkkkkkkkkk...', 11: '...kw......wk...', 12: '....w......w....' }), { h: H('#1e1a1a'), b: H('#5a2010'), y: H('#f0c020'), k: H('#1a0e08'), n: H('#9a4420'), w: H('#f0e8d0') }); });
    T('hobgoblin_armor', p => { p.fill(H('#141010')); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const x0 = c * 4 + (r % 2) * 2, y0 = r * 4; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) p.set((x0 + i) & 15, y0 + j, tone(p, j === 0 ? '#a83020' : '#7a1e14')); p.set((x0 + 1) & 15, y0 + 1, H('#d8b050')); } });
    T('hobgoblin_helm', p => { p.noise(H('#3a3a40'), 0.1); p.speck(H('#2a2a2e'), 0.15); for (let y = 12; y < 15; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#8a1e14')); for (let x = 0; x < 16; x++) p.set(x, 15, H('#d8b050')); });
    T('hobgoblin_crest', p => { p.noise(H('#a01e14'), 0.2); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x += 2) if (p.rand() < 0.4) p.set(x, y, tone(p, '#6a1008')); });
    T('hobgoblin_shield', p => { p.noise(H('#7a1e14'), 0.1); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#d8b050')); p.set(x, 15, H('#d8b050')); p.set(0, x, H('#d8b050')); p.set(15, x, H('#d8b050')); } p.art(R({ 3: '.......kk.......', 4: '......kkkk......', 5: '.....kkyykk.....', 6: '....kkyyyykk....', 7: '...kkyykkyykk...', 8: '....kkyyyykk....', 9: '.....kkyykk.....', 10: '......kkkk......', 11: '.......kk.......' }), { k: H('#141010'), y: H('#e8c050') }); });
    T('hobgoblin_sleeve', p => cloth(p, '#2a2622', '#1a1614', 0.14));
    T('hobgoblin_glove', p => { p.noise(H('#5a5a62'), 0.12); for (const y of [4, 9, 14]) for (let x = 0; x < 16; x++) p.set(x, y, H('#3a3a40')); });
    T('hobgoblin_greave', p => { p.noise(H('#4a4a52'), 0.12); for (let y = 0; y < 16; y += 5) for (let x = 0; x < 16; x++) p.set(x, y, H('#7a1e14')); for (let x = 0; x < 16; x++) p.set(x, 15, H('#1a1614')); });

    // ---- bugbear: shaggy, flat-nosed, beady-eyed ----
    T('bugbear_fur', p => fur(p, '#6a4a2a', '#4a3018', '#8a6a42', 0.3));
    T('bugbear_face', p => { fur(p, '#6a4a2a', '#4a3018', '#8a6a42', 0.2); for (let y = 8; y < 16; y++) for (let x = 2; x < 14; x++) if (Math.abs(x - 7.5) < 6 - (15 - y) * 0.3) p.set(x, y, tone(p, '#a8865e', 0.1)); p.art(R({ 3: 'bbbbbbbbbbbbbbbb', 4: '.bbbbbb..bbbbbb.', 5: '..dyyd....dyyd..', 6: '..dkyd....dykd..', 7: '...dd......dd...', 13: '.w............w.', 14: '.ww..........ww.' }), { b: H('#2e1c0c'), d: H('#2a1a0e'), y: H('#f0d840'), k: H('#100a04'), w: H('#f0e8d0') }); });
    T('bugbear_nose', p => { p.noise(H('#ae8c62'), 0.1); p.art(R({ 1: '....kkkkkkkk....', 2: '...kKKkkkkKKk...', 3: '...kKKkkkkKKk...', 4: '....kkkkkkkk....', 9: 'k..............k', 10: '.kkkkkkkkkkkkkk.', 11: '.kwkkwkkkkwkkwk.', 12: '..k..........k..' }), { k: H('#24160c'), K: H('#0a0604'), w: H('#e8e0c0') }); });
    T('bugbear_kilt', p => { leather(p, '#7a5a3a', '#5a3e26', '#9a7a52'); for (let x = 2; x < 16; x += 4) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, '#3e2814')); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#2a1a0e')); p.set(x, 1, H('#4a3020')); } rag(p, 12); });
    T('bugbear_bracer', p => { fur(p, '#6a4a2a', '#4a3018', '#8a6a42', 0.25); for (let y = 3; y < 9; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, y === 3 || y === 8 ? '#3e2814' : '#8a6a46')); for (let x = 1; x < 16; x += 4) for (let y = 13; y < 16; y++) p.set(x, y, H(y === 15 ? '#f0e8d0' : '#c8b898')); });
    T('bugbear_ear', p => { fur(p, '#6a4a2a', '#4a3018', '#8a6a42'); for (let y = 4; y < 14; y++) for (let x = 4; x < 12; x++) if (Math.hypot(x - 7.5, y - 9) < 4) p.set(x, y, tone(p, '#3a2418')); });
    T('bugbear_shag', p => { fur(p, '#3e2814', '#2a1a0c', '#8a6a3e', 0.4); for (let x = 0; x < 16; x += 2) p.set(x, 0, H('#9a7a4a')); for (let x = 0; x < 16; x++) { const d = 11 + Math.floor(p.rand() * 5); for (let y = d; y < 16; y++) p.set(x, y, [0, 0, 0], 0); } });
    T('bugbear_hide', p => { leather(p, '#8a6a46', '#6a4e32', '#a8885e'); for (let y = 0; y < 16; y++) { p.set(0, y, tone(p, '#5a3a20')); p.set(15, y, tone(p, '#5a3a20')); } for (let i = 0; i < 16; i++) { p.set(i, 15 - i, H('#3a2414')); p.set(i, Math.max(0, 14 - i), H('#4a3020')); } for (let y = 1; y < 11; y += 3) { p.set(3, y, H('#e0c8a0')); p.set(12, y + 1, H('#e0c8a0')); } for (let x = 0; x < 16; x++) { p.set(x, 11, H('#2a1a0e')); p.set(x, 12, H('#5a3a20')); } p.art(R({ 12: '.....wwww.......', 13: '.....wkkw.......', 14: '......ww........' }), { w: H('#e8e0c8'), k: H('#2a2014') }); });

    // ---- worg: black wolf of the hills, red-eyed, snarling ----
    T('worg_fur', p => fur(p, '#3a3432', '#221e1c', '#5a524c', 0.3));
    T('worg_back', p => { fur(p, '#2a2624', '#141210', '#45403c', 0.4); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 6; y++) p.set(x, y, tone(p, '#141210')); });
    T('worg_face', p => { fur(p, '#3a3432', '#221e1c', '#5a524c', 0.2); p.art(R({ 3: '.bbbb......bbbb.', 4: '..kkk......kkk..', 5: '..kkk......kkk..' }), { b: H('#141210'), k: H('#0a0806') }); });
    T('worg_eyes', over({ 4: '...rr......rr...', 5: '...ry......yr...' }, { r: H('#ff4020'), y: H('#ffd040') }));
    T('worg_snout', p => { fur(p, '#45403c', '#2a2624', '#5a524c', 0.15); p.art(R({ 0: '.....kkkkkk.....', 1: '.....kKKKKk.....', 2: '......kkkk......', 9: 'rrrrrrrrrrrrrrrr', 10: 'w.ww.ww..ww.ww.w', 11: 'w..w.w....w.w..w', 12: 'w..............w' }), { k: H('#141010'), K: H('#000000'), r: H('#6a1a1a'), w: H('#f0e8d0') }); });
    T('worg_jaw', p => { p.noise(H('#3a3432'), 0.15); for (let x = 0; x < 16; x++) for (let y = 0; y < 5; y++) p.set(x, y, tone(p, '#7a2222')); for (let x = 0; x < 16; x += 3) { p.set(x, 0, H('#f0e8d0')); p.set(x, 1, H('#f0e8d0')); } });
    T('worg_mane', p => { fur(p, '#2a2624', '#141210', '#4a4440', 0.45); for (let x = 0; x < 16; x++) if (p.rand() < 0.6) p.set(x, 15, [0, 0, 0], 0); });
    T('worg_leg', p => { fur(p, '#322c2a', '#1e1a18', '#4a4440', 0.3); for (let x = 1; x < 16; x += 4) { p.set(x, 15, H('#d8d0c0')); p.set(x, 14, H('#a8a090')); } });

    // ---- dire wolf: a great grey-brown wolf with a dark saddle and amber eyes ----
    T('dire_wolf_fur', p => fur(p, '#7a6a58', '#5a4c3e', '#9a8a76', 0.25));
    T('dire_wolf_back', p => { fur(p, '#4e4234', '#33291f', '#6a5a48', 0.3); });
    T('dire_wolf_face', p => { fur(p, '#7a6a58', '#5a4c3e', '#9a8a76', 0.18); p.art(R({ 3: '.ddd........ddd.', 4: '..aak......kaa..', 5: '..akk......kka..', 9: '....cccccccc....', 10: '...cccccccccc...', 11: '..cccccccccccc..' }), { d: H('#3a3026'), a: H('#e8a020'), k: H('#140c06'), c: H('#c8b898') }); });
    T('dire_wolf_snout', p => { fur(p, '#c8b898', '#a89878', '#e0d4b8', 0.12); p.art(R({ 0: '.....kkkkkk.....', 1: '.....kKKKKk.....', 2: '......kkkk......', 11: '.kkkkkkkkkkkkkk.', 12: '..w.w......w.w..' }), { k: H('#1e1612'), K: H('#000000'), w: H('#f0e8d0') }); });
    T('dire_wolf_leg', p => { fur(p, '#8a7a66', '#6a5a48', '#c8b898', 0.2); for (let y = 9; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#c8b898')); for (let x = 1; x < 16; x += 4) p.set(x, 15, H('#2a2018')); });
    T('dire_wolf_tail', p => { fur(p, '#6a5a48', '#4a3e30', '#8a7a66', 0.3); for (let y = 11; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#2a221a')); });

    // ---- owlbear: a bear's bulk under an owl's head ----
    T('owlbear_fur', p => fur(p, '#6a4a2e', '#4a3220', '#8a6a44', 0.3));
    T('owlbear_back', p => { fur(p, '#5e4228', '#40301c', '#7a5a3a', 0.3); for (let y = 1; y < 16; y += 4) for (let x = 0; x < 16; x++) { const v = Math.abs((x % 8) - 4); if (v < 2) p.set(x, (y + v) & 15, tone(p, '#c8a878')); } });
    T('owlbear_feathers', p => { p.noise(H('#7a5a3a'), 0.14); for (let y = 0; y < 16; y += 3) for (let x = 0; x < 16; x++) { const v = Math.abs((x % 6) - 3); p.set(x, (y + (v >> 1)) & 15, tone(p, v < 1 ? '#e8d8b0' : '#4a3220')); } });
    T('owlbear_face', p => { p.noise(H('#7a5a3a'), 0.12); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const dl = Math.hypot(x - 4, y - 7), dr = Math.hypot(x - 11, y - 7); if (Math.min(dl, dr) < 4.6) p.set(x, y, tone(p, Math.min(dl, dr) > 3.7 ? '#4a3220' : '#efe2c2', 0.08)); } p.art(R({ 5: '..oooo....oooo..', 6: '.ookkoo..ookkoo.', 7: '.okkwko..okwkko.', 8: '.ookkoo..ookkoo.', 9: '..oooo....oooo..', 12: '.......dd.......', 13: '......dddd......' }), { o: H('#f08a20'), k: H('#100804'), w: H('#ffffff'), d: H('#5a4228') }); });
    T('owlbear_beak', p => { p.noise(H('#d8c070'), 0.12); for (let y = 10; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#5a4a20')); for (let y = 0; y < 10; y++) p.set(7, y, H('#f0e0a0')); });
    T('owlbear_tuft', p => { p.noise(H('#3e2a18'), 0.15); for (let y = 0; y < 16; y += 2) for (let x = 0; x < 16; x++) if ((x + y) % 4 === 0) p.set(x, y, tone(p, '#c8a878')); });
    T('owlbear_ruff', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = Math.abs(((x + (y >> 2) * 2) % 6) - 3); p.set(x, y, tone(p, v < 1 ? '#e8d8b0' : y % 4 === 3 ? '#3e2a18' : '#8a6a44')); } for (let x = 0; x < 16; x += 2) p.set(x, 15, [0, 0, 0], 0); });
    T('owlbear_chestf', p => { p.noise(H('#e0cfa8'), 0.1); for (let y = 1; y < 16; y += 3) for (let x = 0; x < 16; x++) { const v = Math.abs((x % 4) - 2); if (v < 1) p.set(x, (y + 1) & 15, tone(p, '#6a4a2e')); else if (v < 2) p.set(x, y, tone(p, '#a8875a')); } });
    T('owlbear_paw', p => { fur(p, '#5a3e26', '#3e2a18', '#7a5a3a', 0.3); for (let x = 1; x < 16; x += 4) for (let y = 11; y < 16; y++) p.set(x, y, tone(p, y > 13 ? '#e8e0c8' : '#b8a888')); });
    T('owlbear_claw', p => { p.noise(H('#e8e0c8'), 0.08); for (let x = 0; x < 16; x++) for (let y = 0; y < 5; y++) p.set(x, y, tone(p, '#5a4a3a')); });

    // ---- giant spider: brown-black, banded legs, a red mark on its back ----
    T('giant_spider_fur', p => { fur(p, '#2a221c', '#16120e', '#4a3a2a', 0.3); });
    T('giant_spider_back', p => { fur(p, '#241c16', '#120e0a', '#3e3024', 0.3); p.art(R({ 2: '.......rr.......', 3: '......rRRr......', 4: '.....rRRRRr.....', 5: '......rRRr......', 6: '.......rr.......', 7: '.......rr.......', 8: '......rRRr......', 9: '.....rRRRRr.....', 10: '....rRRRRRRr....', 11: '.....rrrrrr.....' }), { r: H('#8a1a10'), R: H('#d0301e') }); for (const [x, y] of [[2, 4], [13, 4], [3, 10], [12, 10], [2, 14], [13, 14]]) { p.set(x, y, H('#c8a060')); p.set(x + 1, y, H('#a07a40')); } });
    T('giant_spider_face', p => { fur(p, '#1e1814', '#0e0a08', '#3a2e22', 0.25); });
    T('giant_spider_eyes', over({ 3: '...rr......rr...', 4: '...rr......rr...', 6: '.r..RR....RR..r.', 7: '....RR....RR....', 9: '..r..........r..' }, { r: H('#ff5a2a'), R: H('#ffd040') }));
    T('giant_spider_leg', p => { fur(p, '#2a221c', '#16120e', '#4a3a2a', 0.25); for (let y = 0; y < 16; y += 5) for (let x = 0; x < 16; x++) { p.set(x, y, tone(p, '#a07a40')); p.set(x, (y + 1) & 15, tone(p, '#7a5a30')); } });
    T('giant_spider_fang', p => { p.noise(H('#1a0e0a'), 0.2); for (let y = 10; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#6a1a14')); p.set(7, 2, H('#5a4a40')); });

    // ---- ettercap: purple-grey spider-folk with a silk-heavy abdomen ----
    T('ettercap_skin', p => { p.noise(H('#5a4a6a'), 0.14); for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#3a2e48')); p.speck(H('#7a6a8e'), 0.08); });
    T('ettercap_face', p => { p.noise(H('#5a4a6a'), 0.12); p.art(R({ 2: '..dddddddddddd..', 3: '...dkkkddkkkd...', 4: '...dkkkddkkkd...', 5: '....ddd..ddd....', 9: '......kkkk......', 10: '.....kkkkkk.....', 11: '......kkkk......' }), { d: H('#3a2e48'), k: H('#0e0a12') }); });
    T('ettercap_eyes', over({ 3: '....rr....rr....', 4: '.....r....r.....', 2: '......r..r......', 6: '...r........r...' }, { r: H('#ff3040') }));
    T('ettercap_belly', p => { p.noise(H('#a89ab0'), 0.1); for (let y = 0; y < 16; y += 3) for (let x = 0; x < 16; x++) if (p.rand() < 0.3) p.set(x, y, tone(p, '#7a6a8a')); });
    T('ettercap_sac', p => { p.noise(H('#4a3a5a'), 0.12); for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) { p.set(x, y, tone(p, '#1e1626')); p.set(x, y + 1, tone(p, '#2a2036')); } for (const [x, y] of [[3, 6], [11, 6], [7, 10], [4, 14], [12, 14]]) { p.set(x, y, H('#d8d0e0')); p.set(x + 1, y, H('#b0a8c0')); } });
    T('ettercap_fang', p => { p.noise(H('#141018'), 0.2); for (let y = 11; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#7ad83a')); });
    T('ettercap_leg', p => { p.noise(H('#4a3a5a'), 0.14); for (let y = 0; y < 16; y += 6) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#2a2036')); p.speck(H('#1a1420'), 0.08); });
    T('ettercap_hand', p => { p.noise(H('#4a3a5a'), 0.14); for (let y = 9; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#141018')); });

    // ---- awakened tree and treant ----
    T('awakened_tree_bark', p => bark(p, '#6a5032', '#3e2c1a', '#8a6e4a'));
    T('awakened_tree_face', p => { bark(p, '#6a5032', '#3e2c1a', '#8a6e4a'); p.art(R({ 4: '..dddd....dddd..', 5: '.dkkkkd..dkkkkd.', 6: '.dkkakd..dakkkd.', 7: '..dkkd....dkkd..', 11: '...d........d...', 12: '....dkkkkkkd....', 13: '.....dkkkkd.....' }), { d: H('#2e2014'), k: H('#120c06'), a: H('#e0a030') }); });
    T('awakened_tree_leaves', p => leaves(p, '#4b8f2b', '#2e6a1c', '#7ab84a', 0.14));
    T('awakened_tree_root', p => { bark(p, '#5a422a', '#33241a', '#7a5e3e'); for (let y = 12; y < 16; y++) for (let x = 0; x < 16; x++) if (p.rand() < 0.5) p.set(x, y, tone(p, '#5a4030')); });
    T('treant_bark', p => { bark(p, '#4e3c28', '#2a1e12', '#6a5236'); for (let k = 0; k < 3; k++) p.blob(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), 2, H('#5a7a2e'), 0.25); });
    T('treant_face', p => { bark(p, '#5a4630', '#2a1e12', '#7a6040'); p.art(R({ 2: '.bbbbb....bbbbb.', 3: '..bbbbb..bbbbb..', 4: '..dkkkd..dkkkd..', 5: '..dkkkd..dkkkd..', 6: '...ddd....ddd...', 12: '....dddddddd....', 13: '...dkkkkkkkkd...', 14: '....dddddddd....' }), { b: H('#3a2c1c'), d: H('#2a1e12'), k: H('#0a0604') }); });
    T('treant_eyes', over({ 4: '...aaa....aaa...', 5: '...ayy....yya...' }, { a: H('#ffb030'), y: H('#fff0a0') }));
    T('treant_moss', p => { p.noise(H('#5a7a2e'), 0.2); for (let x = 0; x < 16; x++) { for (let y = 0; y < 16; y++) if (p.rand() < 0.2) p.set(x, y, tone(p, '#3a5a1e')); const d = 9 + Math.floor(p.rand() * 7); for (let y = d; y < 16; y++) p.set(x, y, [0, 0, 0], 0); } });
    T('treant_leaves', p => { leaves(p, '#3a7a2a', '#245a1a', '#5a9a3a', 0.1); for (let k = 0; k < 5; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 15); p.set(x, y, H('#f0c8d8')); p.set(x + 1, y, H('#e8a8c0')); p.set(x, y + 1, H('#e8a8c0')); } });
    // ---- awakened shrub ----
    T('awakened_shrub_leaves', p => { leaves(p, '#4a8a2e', '#2e5e1c', '#6aa83e', 0.08); for (let k = 0; k < 3; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 15); p.set(x, y, H('#c02a3a')); p.set(x + 1, y, H('#8a1a2a')); } });
    T('awakened_shrub_face', p => { leaves(p, '#4a8a2e', '#2e5e1c', '#6aa83e', 0.04); p.art(R({ 5: '..kkk......kkk..', 6: '..kyk......kyk..', 7: '..kkk......kkk..', 11: '.....kkkkkk.....', 12: '....k.k..k.k....' }), { k: H('#0e1a08'), y: H('#e8e040') }); });
    T('awakened_shrub_root', p => { bark(p, '#5a422a', '#33241a', '#7a5e3e'); });

    // ---- ghast: a ghoul lord, grey-violet and rotten, eyes like marsh-gas ----
    T('ghast_skin', p => { p.noise(H('#6e6a72'), 0.14); p.speck(H('#5a6a4a'), 0.16); for (let k = 0; k < 3; k++) { let x = Math.floor(p.rand() * 16), y = 0; for (let i = 0; i < 10; i++) { p.set(x & 15, y, H('#4a3a5a')); y++; x += p.rand() < 0.5 ? 1 : -1; } } });
    T('ghast_face', p => { p.noise(H('#6e6a72'), 0.12); p.speck(H('#5a6a4a'), 0.1); p.art(R({ 3: '.dddd......dddd.', 4: '.dkkkd....dkkkd.', 5: '.dkkkd....dkkkd.', 6: '..ddd......ddd..', 8: '.......kk.......', 9: '.......kk.......', 11: '..kkkkkkkkkkkk..', 12: '..kwkwkwwkwkwk..', 13: '..kkwkwkkwkwkk..', 14: '...kkkkkkkkkk...' }), { d: H('#3e3a44'), k: H('#0e0a0e'), w: H('#d8d0a8') }); });
    T('ghast_eyes', over({ 4: '...gg......gg...', 5: '...gG......Gg...' }, { g: H('#b8ff40'), G: H('#f0ffa0') }));
    T('ghast_ribs', p => { p.noise(H('#6e6a72'), 0.12); p.speck(H('#5a6a4a'), 0.12); for (let y = 2; y < 11; y += 2) for (let x = 2; x < 14; x++) if (x !== 7 && x !== 8) p.set(x, y, tone(p, '#c8c0a0')); for (let y = 1; y < 12; y++) { p.set(7, y, H('#d8d0b0')); p.set(8, y, H('#b8b090')); } for (let y = 12; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#3a3228')); });
    T('ghast_rags', p => { cloth(p, '#3a3228', '#262018', 0.18); rag(p, 8); for (let x = 0; x < 16; x++) if (p.rand() < 0.2) p.set(x, Math.floor(p.rand() * 8), [0, 0, 0], 0); });
    T('ghast_claw', p => { p.noise(H('#3a3020'), 0.15); for (let y = 6; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, y > 12 ? '#e8d890' : '#a89850')); });
    T('ghast_hair', p => { for (let x = 0; x < 16; x++) { const len = 6 + Math.floor(p.rand() * 10); for (let y = 0; y < len; y++) if (p.rand() < 0.8) p.set(x, y, tone(p, x % 3 ? '#2a2a2e' : '#5a5a60')); } });
    // ---- wight: a dead warrior in rusted mail under a tattered cloak ----
    T('wight_skin', p => { p.noise(H('#8a8e92'), 0.12); p.speck(H('#6a6e74'), 0.15); });
    T('wight_face', p => { p.noise(H('#8a8e92'), 0.1); p.speck(H('#6a6e74'), 0.12); p.art(R({ 3: '.bbbbb....bbbbb.', 4: '.dkkkd....dkkkd.', 5: '.dkkkd....dkkkd.', 6: '..ddd......ddd..', 8: '.......kk.......', 10: '...kkkkkkkkkk...', 11: '...kwkwkwkwkw...', 12: '...kkkkkkkkkk...', 13: '...g.g.g.g.g.g..', 14: '..g.g.g.g.g.g...' }), { b: H('#5a5e64'), d: H('#3a3e44'), k: H('#0a0c10'), w: H('#c8c0a0'), g: H('#6a6e74') }); });
    T('wight_eyes', over({ 4: '...cc......cc...', 5: '...cC......Cc...' }, { c: H('#7ad8ff'), C: H('#e8ffff') }));
    T('wight_mail', p => { mail(p, '#5a5a60', '#2a2a2e', '#8a8a92'); p.speck(H('#8a4a22'), 0.12); for (let x = 0; x < 16; x++) { p.set(x, 12, H('#2a1a10')); p.set(x, 13, H('#4a3220')); } p.set(7, 12, H('#8a7a4a')); p.set(8, 12, H('#8a7a4a')); });
    T('wight_plate', p => { p.noise(H('#4a4a52'), 0.12); p.speck(H('#8a4a22'), 0.12); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#7a7a82')); p.set(x, 15, H('#26262a')); } for (const x of [2, 8, 13]) p.set(x, 4, H('#a8a8b0')); });
    T('wight_cloak', p => { cloth(p, '#1e2026', '#121418', 0.16); rag(p, 11); holes(p, 0.04); });
    T('wight_crown', p => { p.noise(H('#6a5a3a'), 0.14); p.speck(H('#4a7a6a'), 0.2); for (let x = 0; x < 16; x++) p.set(x, 15, H('#3a3020')); for (let x = 1; x < 16; x += 4) p.set(x, 3, H('#a89060')); });
    T('wight_glove', p => { p.noise(H('#3e3e46'), 0.12); p.speck(H('#8a4a22'), 0.1); for (const y of [5, 10]) for (let x = 0; x < 16; x++) p.set(x, y, H('#26262a')); });
    T('wight_greave', p => { p.noise(H('#46464e'), 0.12); p.speck(H('#8a4a22'), 0.1); for (let y = 11; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#1e1a18')); });
    // ---- specter, banshee, shadow: the restless dead ----
    T('specter_body', p => { p.noise(H('#a8d0e0'), 0.12); for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) if (p.rand() < 0.5) p.set(x, y, tone(p, '#d8f0ff')); });
    T('specter_face', p => { p.noise(H('#b8dcea'), 0.1); p.art(R({ 3: '..kkkk....kkkk..', 4: '.kkkkkk..kkkkkk.', 5: '.kkkkkk..kkkkkk.', 6: '..kkkk....kkkk..', 9: '......kkkk......', 10: '.....kkkkkk.....', 11: '.....kkkkkk.....', 12: '.....kkkkkk.....', 13: '......kkkk......' }), { k: H('#0a1a2a') }); });
    T('specter_eyes', over({ 4: '...ww......ww...', 5: '...wc......cw...' }, { w: H('#ffffff'), c: H('#9ae8ff') }));
    T('specter_tail', p => { p.noise(H('#a8d0e0'), 0.12); for (let x = 0; x < 16; x++) { const d = 8 + Math.floor(p.rand() * 8); for (let y = d; y < 16; y++) p.set(x, y, [0, 0, 0], 0); } });
    T('banshee_gown', p => { p.noise(H('#b8c8e0'), 0.1); for (let x = 1; x < 16; x += 3) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, '#98a8c8')); for (let y = 13; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#8090b8')); });
    T('banshee_rags', p => { p.noise(H('#a8b8d8'), 0.12); for (let x = 1; x < 16; x += 3) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, '#8898c0')); rag(p, 7); });
    T('banshee_skin', p => { p.noise(H('#d0dcec'), 0.08); });
    const bansheeFace = (p) => { p.noise(H('#c8d6ea'), 0.08); p.art(R({ 0: 'hhhhhhhhhhhhhhhh', 1: 'hhhhhhhhhhhhhhhh', 2: 'hh.bbbb..bbbb.hh', 3: 'h.kkkkk..kkkkk.h', 4: 'h.kkkkk..kkkkk.h', 5: 'h.kkkkk..kkkkk.h', 6: 'h..kkk....kkk..h', 8: '.......nn.......', 10: '......kkkk......', 11: '.....kkkkkk.....', 12: '.....kkkkkk.....', 13: '.....kkkkkk.....', 14: '......kkkk......' }), { h: H('#eef4ff'), b: H('#6a7aa0'), k: H('#060a18'), n: H('#98a8c8') }); };
    T('banshee_face', bansheeFace);
    T('banshee_faceglow', p => { bansheeFace(p); p.art(R({ 3: '...cc.....cc....', 4: '..cww.....wwc...', 5: '...cc.....cc....' }), { w: H('#ffffff'), c: H('#a8d8ff') }); });
    T('banshee_eyes', over({ 3: '...cc.....cc....', 4: '..cww.....wwc...', 5: '...cc.....cc....' }, { w: H('#ffffff'), c: H('#a8d8ff') }));
    T('banshee_hair', p => { p.noise(H('#e0e8f4'), 0.1); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.6) p.set(x, y, tone(p, '#a8b8d0')); });
    T('banshee_hairend', p => { p.noise(H('#e0e8f4'), 0.1); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.6) p.set(x, y, tone(p, '#a8b8d0')); rag(p, 9); });
    T('shadow_body', p => { p.noise(H('#16121c'), 0.25); p.speck(H('#2a2236'), 0.3); p.speck(H('#4a3a6a'), 0.04); });
    T('shadow_face', p => { p.noise(H('#100c16'), 0.2); p.speck(H('#241e30'), 0.2); });
    T('shadow_eyes', over({ 5: '...vv......vv...', 6: '...vV......Vv...' }, { v: H('#b87aff'), V: H('#f0e0ff') }));
    T('shadow_wisp', p => { p.noise(H('#16121c'), 0.25); p.speck(H('#2a2236'), 0.3); rag(p, 5); });
    T('shadow_claw', p => { p.noise(H('#0a080e'), 0.2); for (let y = 10; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#3a2e50')); });
    // ---- gelatinous cube, and what it hasn't finished digesting ----
    T('gelatinous_cube_jelly', p => { p.noise(H('#6ad09a'), 0.12); for (let k = 0; k < 6; k++) { const x = Math.floor(p.rand() * 14) + 1, y = Math.floor(p.rand() * 14) + 1; p.set(x, y, H('#d8ffe8')); p.set(x + 1, y, H('#a8f0c8')); p.set(x, y + 1, H('#a8f0c8')); } p.speck(H('#3a9a6a'), 0.05); for (let x = 0; x < 16; x++) { p.set(x, 0, H('#a8f0c8')); p.set(0, x, H('#a8f0c8')); } });
    T('gelatinous_cube_top', p => { p.noise(H('#8ae0b0'), 0.1); for (let k = 0; k < 8; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), H('#e8fff0')); });
    T('gelatinous_cube_skull', p => { p.noise(H('#d8d0b0'), 0.1); p.art(R({ 5: '..kkk....kkk....', 6: '..kkk....kkk....', 7: '..kkk....kkk....', 9: '.......kk.......', 11: '...kwkwkwkwk....', 12: '...kkkkkkkkk....' }), { k: H('#2a2418'), w: H('#e8e0c8') }); });
    T('gelatinous_cube_bone', p => { p.noise(H('#d8d0b8'), 0.1); p.speck(H('#b8b098'), 0.15); });
    T('gelatinous_cube_sword', p => { p.noise(H('#b8bcc4'), 0.1); for (let y = 12; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#6a4a2a')); for (let x = 0; x < 16; x++) p.set(x, 11, H('#c8a040')); });
    T('gelatinous_cube_coin', p => { p.noise(H('#e8c040'), 0.12); p.speck(H('#fff0a0'), 0.1); });
    // ---- will-o'-wisp ----
    T('will_o_wisp_core', p => radial(p, '#ffffff', '#7ad0ff', 9));
    T('will_o_wisp_face', p => { radial(p, '#ffffff', '#7ad0ff', 9); p.art(R({ 5: '....kk....kk....', 6: '....kk....kk....', 10: '......kkkk......' }), { k: H('#3a7ab0') }); });
    T('will_o_wisp_mote', p => radial(p, '#ffffff', '#b8f0ff', 10));
    // ---- dryad: wood-skinned, leaf-haired, green-eyed ----
    T('dryad_skin', p => { p.noise(H('#c8a070'), 0.08); for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) if (p.rand() < 0.4) p.set(x + (y % 5 === 0 ? 1 : 0), y, tone(p, '#a88050')); });
    T('dryad_face', p => { p.noise(H('#ccaa7a'), 0.06); p.art(R({ 3: '..bbb......bbb..', 4: '..wkk......kkw..', 5: '..kkk......kkk..', 8: '.......nn.......', 9: '..g..........g..', 11: '......llll......', 12: '.......ll.......' }), { b: H('#5a7a2a'), w: H('#f0f8e0'), k: H('#1a3a10'), n: H('#a88050'), g: H('#6aa83e'), l: H('#9a5a3a') }); });
    T('dryad_eyes', over({ 4: '...gg......gg...', 5: '...gG......Gg...' }, { g: H('#7aff5a'), G: H('#e0ffc0') }));
    T('dryad_leaves', p => leaves(p, '#5a9a3a', '#3e7a2a', '#a8d860', 0.12));
    T('dryad_crown', p => { leaves(p, '#5a9a3a', '#3e7a2a', '#a8d860', 0.1); for (let k = 0; k < 5; k++) { const x = 1 + Math.floor(p.rand() * 13), y = 1 + Math.floor(p.rand() * 13); p.set(x, y, H('#ffd8e8')); p.set(x - 1, y, H('#f0a8c8')); p.set(x + 1, y, H('#f0a8c8')); p.set(x, y - 1, H('#f0a8c8')); p.set(x, y + 1, H('#f0a8c8')); p.set(x, y, H('#ffe060')); } });
    T('dryad_body', p => { p.noise(H('#c8a070'), 0.08); for (let y = 1; y < 7; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, (x + y) % 3 ? '#4a8a2e' : '#6aa83e')); for (let x = 0; x < 16; x++) p.set(x, 10, H('#7a5a32')); });
    T('dryad_skirt', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const leaf = Math.abs(((x + (y >> 2) * 2) % 4) - 1.5); if (y > 11 && leaf > 1 + (15 - y) * 0.3) continue; p.set(x, y, tone(p, (y >> 2) % 2 ? '#4a8a2e' : '#5a9a3a', 0.2)); } });
    T('dryad_bark', p => bark(p, '#7a5a3a', '#4a3420', '#9a7a52'));
    T('dryad_leg', p => { p.noise(H('#c8a070'), 0.08); for (let y = 0; y < 16; y++) p.set((y * 2) & 15, y, tone(p, '#4a8a2e')); for (let y = 0; y < 16; y++) p.set((y * 2 + 1) & 15, y, tone(p, '#6aa83e')); });
    // ---- pixie and sprite ----
    T('pixie_skin', p => p.noise(H('#f4d4dc'), 0.06));
    T('pixie_face', p => { p.noise(H('#f4d4dc'), 0.05); p.art(R({ 0: 'hhhhhhhhhhhhhhhh', 1: 'hhhhhhhhhhhhhhhh', 2: 'h.hh.hh..hh.hh.h', 4: '..kkk......kkk..', 5: '..kwk......kwk..', 6: '..vvv......vvv..', 7: '..ppp......ppp..', 10: '......kkkk......', 11: '.......kk.......' }), { h: H('#c890e8'), k: H('#2a1a3a'), w: H('#ffffff'), v: H('#7a4ab0'), p: H('#f0a0b8') }); });
    T('pixie_hair', p => { p.noise(H('#c890e8'), 0.12); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y++) if (p.rand() < 0.35) p.set(x, y, tone(p, '#e8c0ff')); });
    T('pixie_dress', p => { p.noise(H('#e870b0'), 0.12); for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) if ((x + y) % 4 < 2) p.set(x, y, tone(p, '#ffb0d8')); });
    T('pixie_wing', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot((x - 2) / 14, (y - 8) / 8); if (d > 1) continue; p.set(x, y, d > 0.86 ? tone(p, '#5a2a7a') : mix(H('#7ab0ff'), H('#f08af0'), clamp(d * 1.1, 0, 1))); } for (let x = 2; x < 15; x++) { p.set(x, 8, H('#5a2a7a')); p.set(x, 8 - (x >> 2), H('#7a4aa0')); p.set(x, 8 + (x >> 2), H('#7a4aa0')); } for (const [x, y] of [[9, 4], [11, 11], [6, 10]]) p.set(x, y, H('#ffffff')); });
    T('sprite_skin', p => p.noise(H('#9ad0e0'), 0.06));
    T('sprite_face', p => { p.noise(H('#9ad0e0'), 0.05); p.art(R({ 3: '..bb........bb..', 4: '...bkk....kkb...', 5: '...kwk....kwk...', 6: '...kkk....kkk...', 10: '.....kkkkkk.....' }), { b: H('#2a4a3a'), k: H('#0a1a1a'), w: H('#ffffff') }); });
    T('sprite_leaf', p => { p.noise(H('#5a9a3a'), 0.12); for (let y = 0; y < 16; y++) p.set(7, y, H('#3a6a22')); for (let y = 1; y < 16; y += 3) for (let x = 0; x < 16; x++) if (Math.abs(x - 7.5) < (16 - y) * 0.5 && (x + y) % 3 === 0) p.set(x, y, tone(p, '#3a6a22')); });
    T('sprite_cap', p => { p.noise(H('#2e6a22'), 0.12); for (let y = 0; y < 16; y++) p.set(7, y, H('#1e4a16')); });
    T('sprite_wing', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { if (Math.abs(y - 8) > 5.5 - x * 0.12) continue; p.set(x, y, (x % 3 === 0 || y % 3 === 0) ? H('#3a6a7a') : mix(H('#c8f8ff'), H('#7ad8e8'), x / 16)); } });
    T('sprite_pants', p => cloth(p, '#6a4a2a', '#4a321a', 0.14));
    // ---- satyr: a reveller's torso on goat legs, curled horns, pan pipes ----
    T('satyr_skin', p => p.noise(H('#c8946a'), 0.08));
    T('satyr_chest', p => { p.noise(H('#c8946a'), 0.08); for (let y = 3; y < 11; y++) for (let x = 5; x < 11; x++) if (p.rand() < 0.4) p.set(x, y, tone(p, '#5a3a22')); for (let x = 0; x < 16; x++) p.set(x, 1, tone(p, '#a8764e')); for (let i = 0; i < 16; i++) { p.set(i, 15 - i, H('#7a3a2a')); p.set(i, Math.max(0, 14 - i), H('#9a4a32')); } });
    T('satyr_face', p => { p.noise(H('#c8946a'), 0.07); p.art(R({ 0: 'hhhhhhhhhhhhhhhh', 1: 'hh.hhh.hh.hhh.hh', 3: '.bb..........bb.', 4: '..bbb......bbb..', 5: '..wak......kaw..', 6: '...kk......kk...', 8: '.......nn.......', 10: '.k..........k...', 11: '..kkkkkkkkkk....', 12: '...kwwwwwwk.....' }), { h: H('#3a2414'), b: H('#3a2414'), w: H('#f0e8d8'), a: H('#d89020'), k: H('#2a1408'), n: H('#a8744a') }); });
    T('satyr_fur', p => { fur(p, '#6a4a2e', '#4a3220', '#8a6a44', 0.35); for (let x = 0; x < 16; x += 2) for (let y = 0; y < 16; y += 3) p.set(x, y, tone(p, '#3e2a18')); });
    T('satyr_hoof', p => { p.noise(H('#2a221c'), 0.12); for (let y = 0; y < 16; y++) { p.set(7, y, H('#0e0a08')); p.set(8, y, H('#0e0a08')); } for (let x = 0; x < 16; x++) p.set(x, 0, H('#4a3a2e')); });
    T('satyr_horn', p => { p.noise(H('#c8b898'), 0.1); for (let y = 0; y < 16; y += 2) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#8a7a5a')); });
    T('satyr_hair', p => { p.noise(H('#3a2414'), 0.15); for (let y = 0; y < 16; y += 2) for (let x = (y >> 1) % 2; x < 16; x += 3) p.set(x, y, tone(p, '#5a3a22')); });
    T('satyr_pipes', p => { p.fill(H('#3a2414')); for (let x = 0; x < 16; x++) { if (x % 3 === 2) continue; const top = Math.floor(x * 0.5); for (let y = top; y < 16; y++) p.set(x, y, tone(p, '#d8b878')); p.set(x, top, H('#2a1a0a')); } for (let x = 0; x < 16; x++) { p.set(x, 11, H('#8a2a1a')); p.set(x, 12, H('#6a1a10')); } });
    // ---- green hag ----
    T('green_hag_skin', p => { p.noise(H('#6a8a4a'), 0.14); p.speck(H('#4e6a34'), 0.16); for (let k = 0; k < 5; k++) { const x = Math.floor(p.rand() * 15), y = Math.floor(p.rand() * 15); p.set(x, y, H('#3e5a26')); p.set(x + 1, y, H('#8aa860')); } });
    T('green_hag_face', p => { p.noise(H('#6a8a4a'), 0.12); p.speck(H('#4e6a34'), 0.12); p.art(R({ 2: '..dd........dd..', 3: '.dddd......dddd.', 4: '.dkkk......kkkd.', 5: '..kkk......kkk..', 6: '..d..........d..', 10: '..d..........d..', 11: '...kkkkkkkkkk...', 12: '...kwkk.kwk.k...', 13: '....k.w...w.....', 14: '.......w........' }), { d: H('#3e5a26'), k: H('#141a0c'), w: H('#e0d8a0') }); });
    T('green_hag_eyes', over({ 4: '...oo......oo...', 5: '...oy......yo...' }, { o: H('#ff8a10'), y: H('#ffe060') }));
    T('green_hag_hair', p => { for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, x % 3 === 0 ? '#2e3e26' : '#1e2a1a', 0.3)); for (let k = 0; k < 6; k++) { const x = Math.floor(p.rand() * 16); for (let y = Math.floor(p.rand() * 8); y < 16; y += 2) p.set(x, y, tone(p, '#4a6a2a')); } });
    T('green_hag_hairend', p => { for (let x = 0; x < 16; x++) for (let y = 0; y < 16; y++) p.set(x, y, tone(p, x % 3 === 0 ? '#2e3e26' : '#1e2a1a', 0.3)); rag(p, 8); });
    T('green_hag_dress', p => { cloth(p, '#4a4436', '#33302a', 0.18); for (let k = 0; k < 3; k++) { const x0 = Math.floor(p.rand() * 12), y0 = Math.floor(p.rand() * 10); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) p.set(x0 + i, y0 + j, tone(p, '#5a4a32')); } rag(p, 12); });
    T('green_hag_shawl', p => { p.noise(H('#3e5a2a'), 0.2); p.speck(H('#2a3e1c'), 0.25); p.speck(H('#6a8a3a'), 0.08); rag(p, 10); });
    T('green_hag_claw', p => { p.noise(H('#6a8a4a'), 0.12); for (let y = 8; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, tone(p, '#2a2218')); });
    // ---- nightmare: a black horse with a mane of fire ----
    T('nightmare_hide', p => { p.noise(H('#16121a'), 0.18); for (let x = 0; x < 16; x += 3) for (let y = 0; y < 16; y++) if (p.rand() < 0.25) p.set(x, y, tone(p, '#2e2638')); });
    T('nightmare_face', p => { p.noise(H('#16121a'), 0.15); p.art(R({ 2: '.kk..........kk.', 3: '.kk..........kk.', 12: '....rr....rr....', 13: '....rr....rr....' }), { k: H('#050306'), r: H('#5a1206') }); });
    T('nightmare_eyes', over({ 2: '..r..........r..', 3: '..y..........y..' }, { r: H('#ff3a10'), y: H('#ffd040') }));
    T('nightmare_eyeglow', p => radial(p, '#fff0a0', '#ff2a10', 8));
    T('nightmare_hoof', p => { radial(p, '#ffe080', '#e83a10', 9, 0.2); });
    if (typeof addAnim === 'function') addAnim('nightmare_flame', 4, 7, (p, f) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const n = Math.sin(x * 1.7 + f * 1.9) * 2 + Math.sin(x * 0.6 - f * 2.3) * 1.5; const top = 3 + n + Math.abs(x - 7.5) * 0.25; if (y < top) continue; const k = clamp((y - top) / (16 - top), 0, 1); p.set(x, y, k < 0.3 ? mix(H('#fff2a0'), H('#ffb030'), k / 0.3) : mix(H('#ffb030'), H('#c8200a'), (k - 0.3) / 0.7)); } });
    else T('nightmare_flame', p => radial(p, '#fff2a0', '#e8400a', 10, 0.2));

    // ---- drops ----
    const icon = (k, f) => addItem(k, f);
    icon('owlbear_feather', p => { for (let i = 0; i < 12; i++) { const x = 3 + i, y = 13 - i; p.set(x, y, H('#4a3220')); for (let w = 1; w < 4; w++) { p.set(x - w, y - w + 1, H(w % 2 ? '#8a6a44' : '#e8d8b0')); p.set(x + w - 1, y + w, H(w % 2 ? '#a8875a' : '#6a4a2e')); } } });
    icon('worg_fang', p => { for (let y = 2; y < 14; y++) { const w = Math.max(0, Math.floor((14 - y) / 3)); for (let x = 7 - w; x <= 8 + w - (y > 10 ? 1 : 0); x++) p.set(x + (y > 8 ? 1 : 0), y, H(x === 7 - w ? '#fff8e0' : '#e0d0a0')); } for (let x = 5; x < 11; x++) { p.set(x, 2, H('#7a5a3a')); p.set(x, 3, H('#5a3a22')); } });
    icon('spider_silk', p => { for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) if (Math.hypot(x - 7.5, y - 8) < 4.8) p.set(x, y, shade(H('#f0eee8'), 0.85 + ((x + y) % 3) * 0.06)); for (let i = 0; i < 8; i++) p.set(4 + i, 4 + (i % 2) * 7, H('#c8c4bc')); });
    icon('heartwood', p => { for (let y = 2; y < 14; y++) for (let x = 3; x < 13; x++) p.set(x, y, shade(H('#8a5a32'), 0.85 + p.rand() * 0.25)); for (let y = 4; y < 12; y++) for (let x = 5; x < 11; x++) if (Math.hypot(x - 7.5, y - 7.5) < 3) p.set(x, y, H(Math.floor(Math.hypot(x - 7.5, y - 7.5)) % 2 ? '#e0a050' : '#ffd070')); p.set(8, 1, H('#5a9a3a')); p.set(9, 0, H('#7ac04a')); });
    icon('grave_dust', p => { for (let y = 8; y < 14; y++) for (let x = 2; x < 14; x++) if (Math.abs(x - 7.5) < (y - 6) * 1.1) p.set(x, y, shade(H('#9a948a'), 0.75 + p.rand() * 0.4)); for (let k = 0; k < 6; k++) p.set(3 + Math.floor(p.rand() * 10), 3 + Math.floor(p.rand() * 5), H('#c8c0b0')); });
    icon('banshee_tear', p => { for (let y = 2; y < 14; y++) { const w = y < 8 ? (y - 2) * 0.6 : Math.sqrt(Math.max(0, 25 - (y - 9) * (y - 9))) * 0.8; for (let x = 0; x < 16; x++) if (Math.abs(x - 7.5) < w) p.set(x, y, mix(H('#ffffff'), H('#7ab0e8'), clamp(Math.abs(x - 7.5) / 4 + y / 30, 0, 1))); } p.set(6, 9, H('#ffffff')); });
    icon('shadow_essence', p => { for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) { const d = Math.hypot(x - 7.5, y - 7.5 - Math.sin(x) * 1.2); if (d < 6) p.set(x, y, mix(H('#6a4a9a'), H('#0e0a14'), clamp(d / 6 + p.rand() * 0.2, 0, 1)), 255); } p.set(7, 7, H('#e0c8ff')); });
    icon('ooze_jelly', p => { for (let y = 4; y < 14; y++) for (let x = 2; x < 14; x++) if (Math.hypot((x - 7.5) / 1.2, y - 9.5) < 4.6) p.set(x, y, shade(H('#6ad09a'), 0.8 + p.rand() * 0.3)); p.set(5, 7, H('#e8fff0')); p.set(6, 7, H('#c8ffe0')); p.set(9, 10, H('#2a7a4a')); });
    icon('wisp_essence', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 6) p.set(x, y, mix(H('#ffffff'), H('#5ab0ff'), clamp(d / 6, 0, 1))); } });
    icon('fey_blossom', p => { for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; for (let r = 1; r < 5; r++) for (let w = -1; w <= 1; w++) p.set(Math.round(7.5 + Math.cos(a) * r - Math.sin(a) * w * (r > 1 && r < 4 ? 1 : 0)), Math.round(7 + Math.sin(a) * r + Math.cos(a) * w * (r > 1 && r < 4 ? 1 : 0)), H(r > 3 ? '#ffd8ec' : '#f08ac0')); } p.set(7, 7, H('#ffe040')); p.set(8, 7, H('#ffc020')); for (let y = 11; y < 16; y++) p.set(8, y, H('#4a8a2e')); });
    icon('pixie_dust', p => { for (let y = 6; y < 15; y++) for (let x = 3; x < 13; x++) if (Math.hypot(x - 7.5, (y - 10) * 1.2) < 4.5) p.set(x, y, H(p.rand() < 0.3 ? '#ffffff' : p.rand() < 0.5 ? '#f0a8ff' : '#a8d8ff')); for (const [x, y] of [[4, 3], [11, 2], [8, 4], [2, 6], [13, 5]]) p.set(x, y, H('#ffffff')); });
    icon('satyr_horn', p => { for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 1.4, r = 6 - i * 0.3; const x = Math.round(8 + Math.cos(a) * r), y = Math.round(9 - Math.sin(a) * r); for (let w = 0; w < Math.max(1, 3 - i / 5); w++) p.set(x, y + w, H(i % 2 ? '#c8b898' : '#8a7a5a')); } });
    icon('hag_eye', p => { for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 5) p.set(x, y, d < 2.6 ? (d < 1.2 ? H('#140a04') : H('#ff8a10')) : H('#e8e0c8')); } p.set(6, 6, H('#ffffff')); p.set(3, 9, H('#c03a2a')); p.set(12, 6, H('#c03a2a')); });
    icon('nightmare_ember', p => { for (let y = 4; y < 14; y++) for (let x = 3; x < 13; x++) { const d = Math.hypot(x - 7.5, (y - 9) * 1.2); if (d < 5) p.set(x, y, mix(H('#fff0a0'), H('#e83a10'), clamp(d / 5 + p.rand() * 0.15, 0, 1))); } for (const [x, y] of [[6, 2], [9, 1], [8, 3]]) p.set(x, y, H('#ffb030')); });
  };
}
// ---- bodies ------------------------------------------------------------------------------------------
{
  const D = MODEL_DEFS;
  const ovB = (h) => [-h[0] / 2, 0, -h[2] / 2 - 0.1, h[0] / 2, h[1], -h[2] / 2 - 0.03];        // a biped head's face, just proud of it
  const ovQ = (h) => [-h[0] / 2, -h[1] / 2, -h[2] - 0.1, h[0] / 2, h[1] / 2, -h[2] - 0.03];     // a four-legged head's
  const G = { glow: true, noCull: true };
  const eyes = (box, tex) => ['eyes', 'head', [0, 0, 0], box, tex, G];
  const hunch = (def, k) => { const b = def.parts.find(p => p.name === 'body'); if (b) b.rest = [-k, 0, 0]; return def; };
  const post = (def, k) => { def.post = k; return def; };
  const sc = (def, s) => { def.scale = s; return def; };
  const mirror = (x) => { const o = x.slice(); o[0] = x[0].replace(/L(\d?)$/, 'R$1'); o[1] = x[1].replace(/L(\d?)$/, 'R$1'); o[2] = [-x[2][0], x[2][1], x[2][2]]; const b = x[3]; o[3] = [-b[3], b[1], b[2], -b[0], b[4], b[5]]; if (x[5]) { o[5] = Object.assign({}, x[5]); if (o[5].rest) o[5].rest = [o[5].rest[0], -o[5].rest[1], -o[5].rest[2]]; } return o; };
  const pair = (x) => [x, mirror(x)];

  // ---- roads and farms ----
  D.giant_rat = quadRig({
    body: [6, 5, 13], leg: [2, 4], head: [5, 5, 5], headAt: [1, 0], tail: [1, 1, 15], tailRest: 0.15, gallop: true, post: 'm1quad',
    tex: { body: { all: 'giant_rat_fur', top: 'giant_rat_back' }, head: { all: 'giant_rat_fur', front: 'giant_rat_face' }, leg: 'giant_rat_paw', tail: 'giant_rat_tail' },
    extras: [
      ['hump', 'body', [0, 2.5, 1], [-3.4, 0, -4, 3.4, 2.4, 5], { all: 'giant_rat_back', bottom: 'giant_rat_fur' }],
      ['snout', 'head', [0, -1, -5], [-1.5, -1.5, -3, 1.5, 1.5, 0], { all: 'giant_rat_fur', front: 'giant_rat_snout' }],
      ...pair(['earL', 'head', [-1.8, 2.5, -1.5], [-1.5, 0, -0.4, 1.5, 2.5, 0.4], 'giant_rat_ear', { role: 'ear', rest: [0, 0.3, -0.35] }]),
      ['whiskL', 'snout', [-1.5, -0.2, -2.4], [-3.5, -0.15, -0.15, 0, 0.15, 0.15], 'giant_rat_whisker', { rest: [0, -0.35, 0.12] }],
      ['whiskR', 'snout', [1.5, -0.2, -2.4], [0, -0.15, -0.15, 3.5, 0.15, 0.15], 'giant_rat_whisker', { rest: [0, 0.35, -0.12] }],
    ],
  });
  D.bandit = post(bipedRig({
    head: [8, 8, 8], body: [8, 12, 4], arm: [4, 12, 4], leg: [4, 12, 4],
    tex: { head: { all: 'bandit_hood', front: 'bandit_face' }, body: 'bandit_tunic', arm: 'bandit_sleeve', fore: 'bandit_bracer', leg: 'bandit_pants', shin: 'bandit_boot' },
    extras: [
      ['hood', 'head', [0, 0, 0.6], [-4.6, -0.5, -4.5, 4.6, 8.8, 4.4], { all: 'bandit_hood', front: false }, { noCull: true }],
      ['hoodtip', 'hood', [0, 7, 4.4], [-2, -3.5, 0, 2, 1, 2.2], 'bandit_hood', { rest: [0.55, 0, 0] }],
      ['mantle', 'body', [0, 12, 0], [-5.2, -5, -2.7, 5.2, 0.6, 2.7], 'bandit_cape', { noCull: true }],
      ['pouch', 'body', [2.6, 0.5, -2.1], [-1.3, 0, -1.2, 1.3, 2.6, 0], 'bandit_pouch'],
    ],
  }), 'm1biped');
  D.bandit_captain = post(bipedRig({
    head: [8, 8, 8], body: [8, 12, 4], arm: [4, 12, 4], leg: [4, 12, 4],
    tex: { head: { all: 'bandit_captain_hair', front: 'bandit_captain_face' }, body: { all: 'bandit_captain_coat', front: 'bandit_captain_chest' }, arm: 'bandit_captain_sleeve', fore: 'bandit_captain_cuff', leg: 'bandit_captain_pants', shin: 'bandit_captain_boot' },
    extras: [
      ['brim', 'head', [0, 7.4, 0], [-6.5, 0, -6.5, 6.5, 0.9, 6.5], 'bandit_captain_hat', { rest: [-0.07, 0, 0] }],
      ['crown', 'head', [0, 8.2, 0], [-4.2, 0, -4.2, 4.2, 3.2, 4.2], { all: 'bandit_captain_hatside', top: 'bandit_captain_hat' }],
      ['plume', 'crown', [2.8, 1.6, 0.5], [-0.7, 0, -0.7, 0.7, 1.3, 6.5], 'bandit_captain_plume', { rest: [-0.5, 0, 0.35], noCull: true }],
      ...pair(['pauldL', 'armL', [0, 2, 0], [-2.6, -2.2, -2.6, 2.6, 1.3, 2.6], 'bandit_captain_pauldron', { rest: [0, 0, -0.12] }]),
      ['tails', 'body', [0, 0.5, 0], [-4.4, -8, -0.4, 4.4, 0.5, 2.5], 'bandit_captain_coat', { noCull: true }],
    ],
  }), 'm1biped');

  // ---- the eastern hills ----
  const gobRig = (tex, extra, s) => sc(post(hunch(bipedRig({
    head: [8, 7, 7], body: [6, 7, 4], arm: [3, 9, 3], leg: [3, 6, 3], legX: 1.6, armX: 4.5, shoulder: 1.5,
    tex, extras: [
      ...pair(['earL', 'head', [-4, 4.2, 0.5], [-3, -1.2, -0.5, 0, 1.4, 0.5], tex.ear, { rest: [0, 0.2, -0.35] }]),
      ...pair(['earL2', 'earL', [-3, 0, 0], [-3, -0.6, -0.4, 0, 0.8, 0.4], tex.ear, { rest: [0, 0, -0.25] }]),
      ['nose', 'head', [0, 3, -3.5], [-0.9, -1.2, -2.2, 0.9, 1, 0], tex.skin, { rest: [-0.15, 0, 0] }],
      ...extra,
    ],
  }), 0.22), 'm1biped'), s);
  D.goblin = gobRig({ head: { all: 'goblin_skin', front: 'goblin_face' }, body: 'goblin_tunic', arm: 'goblin_skin', leg: 'goblin_tunic', shin: 'goblin_foot', ear: 'goblin_ear', skin: 'goblin_skin' }, [
    ['plate', 'body', [0, 3, -2], [-3.3, 0, -0.7, 3.3, 3.6, 0.2], 'goblin_plate'],
    ['pad', 'armL', [0, 1.5, 0], [-2, -1.6, -2, 2, 0.8, 2], 'goblin_plate', { rest: [0, 0, -0.2] }],
    ['loin', 'body', [0, 0.5, -2.05], [-2.4, -3.6, -0.3, 2.4, 0, 0.3], 'goblin_cloth', { noCull: true }],
    ['tuft', 'head', [0, 7, 1], [-1, 0, -1.5, 1, 2.2, 1.5], 'goblin_hair', { rest: [-0.3, 0, 0] }],
  ], 0.85);
  D.goblin_boss = gobRig({ head: { all: 'goblin_boss_skin', front: 'goblin_boss_face' }, body: 'goblin_boss_mail', arm: 'goblin_boss_skin', leg: 'goblin_tunic', shin: 'goblin_foot', ear: 'goblin_ear', skin: 'goblin_boss_skin' }, [
    ['helm', 'head', [0, 4.6, 0], [-4.4, 0, -3.9, 4.4, 3, 3.9], 'goblin_boss_helm'],
    ...pair(['hornL', 'helm', [-3.6, 2, 0], [-0.7, 0, -0.7, 0.7, 3.2, 0.7], 'goblin_boss_horn', { rest: [0, 0, 0.75] }]),
    ...pair(['hornL2', 'hornL', [0, 3.2, 0], [-0.5, 0, -0.5, 0.5, 2.4, 0.5], 'goblin_boss_horn', { rest: [0, 0, -0.7] }]),
    ['pelt', 'body', [0, 7, 0], [-4.2, -3.4, -2.5, 4.2, 1, 2.6], 'goblin_boss_pelt', { noCull: true }],
    ['shield', 'foreL', [0, -2.5, -1.6], [-3.4, -3.4, -0.8, 3.4, 3.4, 0], 'goblin_boss_shield', { noCull: true }],
    ['loin', 'body', [0, 0.5, -2.05], [-2.4, -3.6, -0.3, 2.4, 0, 0.3], 'goblin_cloth', { noCull: true }],
  ], 1.02);
  D.hobgoblin = sc(post(bipedRig({
    head: [8, 8, 8], body: [9, 12, 5], arm: [4, 12, 4], leg: [4, 12, 4], armX: 6.5,
    tex: { head: { all: 'hobgoblin_skin', front: 'hobgoblin_face' }, body: 'hobgoblin_armor', arm: 'hobgoblin_armor', fore: 'hobgoblin_glove', leg: 'hobgoblin_sleeve', shin: 'hobgoblin_greave' },
    extras: [
      ['helm', 'head', [0, 5, 0], [-4.5, 0, -4.5, 4.5, 3.6, 4.5], 'hobgoblin_helm'],
      ['guard', 'helm', [0, 0, 0], [-4.6, -3.5, 0, 4.6, 0.5, 4.7], 'hobgoblin_helm'],
      ['crest', 'helm', [0, 3.6, 0], [-0.6, 0, -4, 0.6, 2.6, 3.5], 'hobgoblin_crest'],
      ...pair(['earL', 'head', [-4, 4, 0.5], [-1.6, -1, -0.4, 0, 1, 0.4], 'hobgoblin_skin', { rest: [0, 0.2, -0.3] }]),
      ...pair(['pauldL', 'armL', [0, 2, 0], [-2.7, -3, -2.7, 2.7, 1.2, 2.7], 'hobgoblin_armor', { rest: [0, 0, -0.15] }]),
      ['tassets', 'body', [0, 0.5, 0], [-4.9, -5, -2.9, 4.9, 0.5, 2.9], 'hobgoblin_armor', { noCull: true }],
      ['shield', 'foreL', [0, -3, -2.6], [-3.5, -5, -0.8, 3.5, 4, 0], { all: 'hobgoblin_helm', front: 'hobgoblin_shield' }],
    ],
  }), 'm1biped'), 0.97);
  D.bugbear = post(hunch(bipedRig({
    head: [9, 8, 8], body: [10, 14, 6], arm: [4, 17, 4], leg: [4, 13, 5], armX: 7, legX: 2.5,
    tex: { head: { all: 'bugbear_fur', front: 'bugbear_face' }, body: { all: 'bugbear_hide', back: 'bugbear_fur' }, arm: 'bugbear_fur', fore: 'bugbear_bracer', leg: 'bugbear_fur' },
    extras: [
      ['snout', 'head', [0, 2.2, -4], [-2.2, -1.6, -2.4, 2.2, 1.8, 0], { all: 'bugbear_fur', front: 'bugbear_nose' }],
      ...pair(['earL', 'head', [-3.4, 7.5, 0.5], [-1.4, 0, -0.6, 1.4, 2.6, 0.6], 'bugbear_ear', { rest: [0, 0, -0.3] }]),
      ['shag', 'body', [0, 14, 0], [-5.6, -5, -3.4, 5.6, 1.6, 3.6], 'bugbear_shag', { noCull: true }],
      ['beard', 'head', [0, 0.6, -3.9], [-3, -3, -0.6, 3, 0.8, 0.6], 'bugbear_shag', { noCull: true }],
      ['kilt', 'body', [0, 0.5, 0], [-5.4, -6, -3.4, 5.4, 0.5, 3.4], 'bugbear_kilt', { noCull: true }],
    ],
  }), 0.15), 'm1biped');
  D.worg = sc(quadRig({
    body: [9, 9, 20], leg: [3, 11], head: [7, 7, 6], headAt: [2, 0], tail: [3, 10, 3], tailRest: -0.45, gallop: true, post: 'm1quad',
    tex: { body: { all: 'worg_fur', top: 'worg_back' }, head: { all: 'worg_fur', front: 'worg_face', top: 'worg_back' }, leg: 'worg_leg', tail: 'worg_mane' },
    extras: [
      ['mane', 'body', [0, 1, -5], [-5.5, -5, -6, 5.5, 6, 6], { all: 'worg_mane', top: 'worg_back' }, { noCull: true }],
      ['snout', 'head', [0, -1.2, -6], [-1.9, -1.6, -4, 1.9, 1.6, 0], { all: 'worg_fur', front: 'worg_snout' }],
      ['jaw', 'head', [0, -3, -5.5], [-1.7, -1.2, -4.2, 1.7, 0, 0], { all: 'worg_fur', top: 'worg_jaw', front: 'worg_jaw' }, { rest: [-0.3, 0, 0] }],
      ...pair(['earL', 'head', [-2.4, 3.5, -1.5], [-1, 0, -0.5, 1, 2.6, 0.5], 'worg_back', { role: 'ear', rest: [0.5, 0, -0.15] }]),
      ['ridge1', 'body', [0, 4.5, 0], [-0.8, 0, -1.5, 0.8, 2.4, 1.5], 'worg_back', { rest: [0.45, 0, 0] }],
      ['ridge2', 'body', [0, 4.5, 4], [-0.7, 0, -1.3, 0.7, 2, 1.3], 'worg_back', { rest: [0.45, 0, 0] }],
      ['ridge3', 'body', [0, 4.5, 7.5], [-0.6, 0, -1.1, 0.6, 1.5, 1.1], 'worg_back', { rest: [0.45, 0, 0] }],
      eyes(ovQ([7, 7, 6]), 'worg_eyes'),
    ],
  }), 1.1);

  // ---- the woods ----
  D.owlbear = sc(quadRig({
    body: [16, 14, 22], leg: [7, 11], head: [12, 12, 10], headAt: [5, -1], tail: [4, 3, 2], tailRest: -0.3, gallop: true, post: 'm1bear',
    tex: { body: { all: 'owlbear_fur', top: 'owlbear_back' }, head: { all: 'owlbear_feathers', front: 'owlbear_face' }, leg: 'owlbear_fur', shin: 'owlbear_paw', tail: 'owlbear_tuft' },
    extras: [
      ['beak', 'head', [0, -0.5, -10], [-2, -3, -3.2, 2, 1.4, 0], 'owlbear_beak'],
      ['beakTip', 'beak', [0, -3, -3.2], [-1.2, -1.6, 0, 1.2, 0, 1.8], 'owlbear_beak'],
      ...pair(['tuftL', 'head', [-4.2, 6, -4], [-1.4, 0, -1.2, 1.4, 5, 1.2], 'owlbear_tuft', { rest: [0.3, 0, -0.45] }]),
      ['ruff', 'body', [0, 2.5, -11], [-8.5, -8, -2, 8.5, 8.5, 3], 'owlbear_ruff', { noCull: true }],
      ['hump', 'body', [0, 7, -3], [-7, 0, -6, 7, 3, 6], 'owlbear_back'],
      ['clawFL', 'shinFL', [0, -5, -3.5], [-3.5, 0, -1.6, 3.5, 1.4, 0], 'owlbear_claw'],
      ['clawFR', 'shinFR', [0, -5, -3.5], [-3.5, 0, -1.6, 3.5, 1.4, 0], 'owlbear_claw'],
    ],
  }), 1.05);
  {
    const s = 1.5, gs = spiderRig({ size: s, tex: { body: 'giant_spider_fur', back: 'giant_spider_back', head: { all: 'giant_spider_fur', front: 'giant_spider_face' }, leg: 'giant_spider_leg' } });
    gs.parts.push(rpart('eyes', 'head', [0, 0, 0], [-4 * s, -4 * s, -8 * s - 0.12, 4 * s, 4 * s, -8 * s - 0.04], 'giant_spider_eyes', G));
    for (const sd of [1, -1]) gs.parts.push(rpart('fang' + (sd > 0 ? 'R' : 'L'), 'head', [sd * 1.6 * s, -2.5 * s, -8 * s], [-0.8 * s, -3 * s, -1 * s, 0.8 * s, 0, 0.6 * s], 'giant_spider_fang', { rest: [0.35, 0, -sd * 0.15] }));
    gs.parts.push(rpart('spinner', 'abdomen', [0, -1 * s, 12 * s], [-1.2 * s, -1.2 * s, 0, 1.2 * s, 1.2 * s, 1.5 * s], 'giant_spider_fang'));
    D.giant_spider = finishRig('spider', gs.parts, { height: 12 * s, post: 'm1spider' });
  }
  D.ettercap = post(hunch(bipedRig({
    head: [7, 6, 7], body: [8, 10, 6], arm: [2.5, 14, 2.5], leg: [3, 11, 3], legX: 2, armX: 5.5, armsReach: true,
    tex: { head: { all: 'ettercap_skin', front: 'ettercap_face' }, body: { all: 'ettercap_skin', front: 'ettercap_belly' }, arm: 'ettercap_leg', fore: 'ettercap_hand', leg: 'ettercap_leg' },
    extras: [
      ['sac', 'body', [0, 3, 3], [-4.5, -3, 0, 4.5, 6, 9], 'ettercap_sac'],
      ['spinner', 'sac', [0, 0, 9], [-1, -1, 0, 1, 1, 1.5], 'ettercap_fang'],
      ...pair(['mandL', 'head', [-1.6, 0.3, -3.5], [-0.6, -2.2, -1.4, 0.6, 0.4, 0], 'ettercap_fang', { rest: [0.35, 0, 0.3] }]),
      ['belly', 'body', [0, 1, -3], [-3.4, 0, -1.6, 3.4, 6, 0], 'ettercap_belly'],
      ['talR1', 'foreR', [-0.6, -7, 0], [-0.35, -2.6, -0.35, 0.35, 0, 0.35], 'giant_spider_fang', { rest: [0.3, 0, 0.1] }],
      ['talR2', 'foreR', [0.6, -7, 0], [-0.35, -2.6, -0.35, 0.35, 0, 0.35], 'giant_spider_fang', { rest: [0.3, 0, -0.1] }],
      ['talL1', 'foreL', [-0.6, -7, 0], [-0.35, -2.6, -0.35, 0.35, 0, 0.35], 'giant_spider_fang', { rest: [0.3, 0, 0.1] }],
      ['talL2', 'foreL', [0.6, -7, 0], [-0.35, -2.6, -0.35, 0.35, 0, 0.35], 'giant_spider_fang', { rest: [0.3, 0, -0.1] }],
      eyes(ovB([7, 6, 7]), 'ettercap_eyes'),
    ],
  }), 0.3), 'm1biped');
  D.dire_wolf = sc(quadRig({
    body: [8, 8, 19], leg: [3, 12], head: [7, 6, 6], headAt: [2, 0], tail: [3, 11, 3], tailRest: -0.8, gallop: true, post: 'm1quad',
    tex: { body: { all: 'dire_wolf_fur', top: 'dire_wolf_back' }, head: { all: 'dire_wolf_fur', front: 'dire_wolf_face', top: 'dire_wolf_back' }, leg: 'dire_wolf_leg', tail: 'dire_wolf_tail' },
    extras: [
      ['mane', 'body', [0, 0.5, -5], [-5, -4.5, -4.5, 5, 5, 4.5], { all: 'dire_wolf_fur', top: 'dire_wolf_back' }],
      ['snout', 'head', [0, -1.3, -6], [-1.7, -1.5, -4, 1.7, 1.5, 0], { all: 'dire_wolf_fur', front: 'dire_wolf_snout' }],
      ...pair(['earL', 'head', [-2.2, 3, -1.5], [-1.1, 0, -0.5, 1.1, 3, 0.5], 'dire_wolf_back', { role: 'ear' }]),
    ],
  }), 1.05);
  const treeLimbs = (bark, leaf, root, k) => [
    ...pair(['tuftL', 'foreL', [0, -11 * k, 0], [-3 * k, -3.5 * k, -3 * k, 3 * k, 2 * k, 3 * k], leaf, { noCull: true }]),
    ...pair(['twigL', 'foreL', [-2 * k, -8 * k, 0], [-6 * k, -0.7 * k, -0.7 * k, 0, 0.7 * k, 0.7 * k], bark, { rest: [0, 0, -0.6] }]),
    ...pair(['rootL1', 'shinL', [0, -6 * k, 0], [-1 * k, 0, -6 * k, 1 * k, 1.8 * k, 0], root, { rest: [0, 0.5, 0] }]),
    ...pair(['rootL2', 'shinL', [0, -6 * k, 0], [-1 * k, 0, -6 * k, 1 * k, 1.8 * k, 0], root, { rest: [0, 2.6, 0] }]),
  ];
  D.awakened_tree = sc(post(bipedRig({
    head: [10, 10, 10], body: [12, 22, 10], arm: [5, 22, 5], leg: [6, 12, 6], armX: 8.5, legX: 3.2, heavy: true,
    tex: { head: { all: 'awakened_tree_bark', front: 'awakened_tree_face', top: 'awakened_tree_leaves' }, body: 'awakened_tree_bark', arm: 'awakened_tree_bark', leg: 'awakened_tree_root' },
    extras: [
      ['crown', 'head', [0, 8.5, 0.5], [-12, 0, -11, 12, 13, 12], 'awakened_tree_leaves', { noCull: true }],
      ['crown2', 'head', [7, 16, -4], [-6, 0, -5, 6, 7, 5], 'awakened_tree_leaves', { noCull: true }],
      ['crown3', 'head', [-6, 14, 6], [-5, 0, -5, 5, 6, 5], 'awakened_tree_leaves', { noCull: true }],
      ['branchL', 'body', [-5, 18, 2], [-0.9, 0, -0.9, 0.9, 9, 0.9], 'awakened_tree_bark', { rest: [0.2, 0, 0.7] }],
      ['leafL', 'branchL', [0, 9, 0], [-3.5, -1, -3.5, 3.5, 4, 3.5], 'awakened_tree_leaves', { noCull: true }],
      ...treeLimbs('awakened_tree_bark', 'awakened_tree_leaves', 'awakened_tree_root', 1),
    ],
  }), 'm1biped'), 0.9);
  D.awakened_shrub = sc(finishRig('pod', [
    rpart('body', null, [0, 3, 0], [-5, 0, -5, 5, 7, 5], 'awakened_shrub_leaves', { role: 'pbody', noCull: true }),
    rpart('head', 'body', [0, 7, 0], [-4.5, 0, -4.5, 4.5, 5, 4.5], { all: 'awakened_shrub_leaves', front: 'awakened_shrub_face' }, { role: 'phead', limb: 'head', noCull: true }),
    rpart('sprig1', 'head', [-2, 5, 1], [-0.4, 0, -0.4, 0.4, 3.5, 0.4], 'awakened_shrub_root', { rest: [0.2, 0, 0.4] }),
    rpart('sprig2', 'head', [2, 5, -1], [-0.4, 0, -0.4, 0.4, 3, 0.4], 'awakened_shrub_root', { rest: [-0.2, 0, -0.3] }),
    rpart('armL', 'body', [-5, 5, 0], [-4, -0.5, -0.5, 0, 0.5, 0.5], 'awakened_shrub_root', { rest: [0, 0, -0.4] }),
    rpart('armR', 'body', [5, 5, 0], [0, -0.5, -0.5, 4, 0.5, 0.5], 'awakened_shrub_root', { rest: [0, 0, 0.4] }),
    ...[['legFL', -2.5, -2.5, true, -1], ['legFR', 2.5, -2.5, true, 1], ['legBL', -2.5, 2.5, false, -1], ['legBR', 2.5, 2.5, false, 1]].map(([n, x, z, front, side]) => rpart(n, null, [x, 3, z], [-0.9, -3, -0.9, 0.9, 0, 0.9], 'awakened_shrub_root', { role: 'qleg', front, side, limb: n })),
  ], { height: 15, post: 'm1shrub' }), 0.85);

  // ---- crypts ----
  D.ghast = post(hunch(bipedRig({
    head: [8, 8, 8], body: [8, 12, 4], arm: [3, 14, 3], leg: [3, 12, 3], legX: 2, armX: 5.5, armsReach: true,
    tex: { head: { all: 'ghast_skin', front: 'ghast_face' }, body: { all: 'ghast_skin', front: 'ghast_ribs' }, arm: 'ghast_skin', leg: 'ghast_skin' },
    extras: [
      eyes(ovB([8, 8, 8]), 'ghast_eyes'),
      ['hair', 'head', [0, 8, 0], [-4.3, -7, -1, 4.3, 0.6, 4.4], 'ghast_hair', { noCull: true }],
      ['rags', 'body', [0, 0.5, 0], [-4.4, -8, -2.4, 4.4, 0.5, 2.4], 'ghast_rags', { noCull: true }],
      ...pair(['clawL', 'foreL', [0, -7, -0.5], [-1.5, -3, -1.2, 1.5, 0, 0.6], 'ghast_claw', { rest: [0.25, 0, 0] }]),
    ],
  }), 0.18), 'm1biped');
  D.wight = post(bipedRig({
    head: [8, 8, 8], body: [8, 12, 4], arm: [4, 12, 4], leg: [4, 12, 4],
    tex: { head: { all: 'wight_skin', front: 'wight_face' }, body: 'wight_mail', arm: 'wight_mail', fore: 'wight_glove', leg: 'wight_mail', shin: 'wight_greave' },
    extras: [
      eyes(ovB([8, 8, 8]), 'wight_eyes'),
      ['crown', 'head', [0, 6.5, 0], [-4.5, 0, -4.5, 4.5, 2.2, 4.5], 'wight_crown'],
      ['spike1', 'crown', [0, 2.2, -4.4], [-0.6, 0, -0.3, 0.6, 2.4, 0.3], 'wight_crown'],
      ['spike2', 'crown', [-3, 2.2, -4.4], [-0.5, 0, -0.3, 0.5, 1.5, 0.3], 'wight_crown'],
      ['spike3', 'crown', [3, 2.2, -4.4], [-0.5, 0, -0.3, 0.5, 1.5, 0.3], 'wight_crown'],
      ['cloak', 'body', [0, 12, 2.1], [-4.6, -20, 0, 4.6, 0.5, 0.8], 'wight_cloak', { noCull: true, rest: [0.1, 0, 0] }],
      ['collar', 'body', [0, 12, 0], [-4.8, -1.5, -2.6, 4.8, 1.2, 2.6], 'wight_cloak', { noCull: true }],
      ...pair(['pauldL', 'armL', [0, 2, 0], [-2.6, -2.5, -2.6, 2.6, 1.2, 2.6], 'wight_plate', { rest: [0, 0, -0.12] }]),
      ['tassets', 'body', [0, 0.5, 0], [-4.4, -5, -2.4, 4.4, 0.5, 2.4], 'wight_mail', { noCull: true }],
    ],
  }), 'm1biped');
  const ghostA = (a) => ({ glow: true, ghostA: a, noCull: true });
  D.specter = finishRig('m1ghost', [
    rpart('body', null, [0, 15, 0], [-4, -6, -2.5, 4, 8, 2.5], 'specter_body', Object.assign({ role: 'gbody' }, ghostA(0.5))),
    rpart('head', 'body', [0, 8, 0], [-3.5, 0, -3.5, 3.5, 7, 3.5], { all: 'specter_body', front: 'specter_face' }, Object.assign({ role: 'ghead', limb: 'head' }, ghostA(0.62))),
    rpart('eyes', 'head', [0, 0, 0], [-3.5, 0, -3.62, 3.5, 7, -3.56], 'specter_eyes', G),
    rpart('armR', 'body', [5, 7, 0], [-1, -11, -1, 1, 0, 1], 'specter_body', Object.assign({ role: 'garm', rest: [1.15, 0, 0.12] }, ghostA(0.45))),
    rpart('armL', 'body', [-5, 7, 0], [-1, -11, -1, 1, 0, 1], 'specter_body', Object.assign({ role: 'garm', rest: [1.15, 0, -0.12] }, ghostA(0.45))),
    rpart('tail1', 'body', [0, -6, 0], [-3, -4, -2, 3, 0, 2], 'specter_body', ghostA(0.42)),
    rpart('tail2', 'tail1', [0, -4, 0.3], [-2, -3, -1.4, 2, 0, 1.4], 'specter_tail', ghostA(0.32)),
    rpart('tail3', 'tail2', [0, -3, 0.3], [-1, -2, -0.8, 1, 0, 0.8], 'specter_tail', ghostA(0.22)),
  ], { hipY: 15, height: 30, post: 'm1ghost' });
  D.banshee = finishRig('m1ghost', [
    rpart('body', null, [0, 17, 0], [-3.5, -6, -2, 3.5, 8, 2], 'banshee_gown', Object.assign({ role: 'gbody' }, ghostA(0.62))),
    rpart('head', 'body', [0, 8, 0], [-3.5, 0, -3.5, 3.5, 7.5, 3.5], { all: 'banshee_hair', front: 'banshee_face' }, Object.assign({ role: 'ghead', limb: 'head' }, ghostA(0.72))),
    rpart('eyes', 'head', [0, 0, 0], [-3.5, 0, -3.62, 3.5, 7.5, -3.56], 'banshee_faceglow', G),
    rpart('hair', 'head', [0, 7, 2.6], [-4, -15, 0, 4, 1.2, 2], 'banshee_hairend', Object.assign({ role: 'ghair', rest: [0.15, 0, 0] }, ghostA(0.55))),
    rpart('earL', 'head', [-3.5, 4, 0], [-2, -0.5, -0.4, 0, 0.8, 0.4], 'banshee_skin', Object.assign({ rest: [0, 0.2, -0.5] }, ghostA(0.72))),
    rpart('earR', 'head', [3.5, 4, 0], [0, -0.5, -0.4, 2, 0.8, 0.4], 'banshee_skin', Object.assign({ rest: [0, -0.2, 0.5] }, ghostA(0.72))),
    rpart('armR', 'body', [4.5, 7, 0], [-0.9, -12, -0.9, 0.9, 0, 0.9], 'banshee_skin', Object.assign({ role: 'garm', rest: [0.5, 0, 0.35] }, ghostA(0.5))),
    rpart('armL', 'body', [-4.5, 7, 0], [-0.9, -12, -0.9, 0.9, 0, 0.9], 'banshee_skin', Object.assign({ role: 'garm', rest: [0.5, 0, -0.35] }, ghostA(0.5))),
    rpart('tail1', 'body', [0, -6, 0], [-4.5, -7, -3, 4.5, 0, 3], 'banshee_gown', ghostA(0.5)),
    rpart('tail2', 'tail1', [0, -7, 0.2], [-5, -4, -3.4, 5, 0, 3.4], 'banshee_rags', ghostA(0.38)),
  ], { hipY: 17, height: 32, post: 'm1ghost' });
  {
    const sh = bipedRig({
      head: [7, 8, 7], body: [7, 12, 4], arm: [3, 14, 3], leg: [3, 12, 3], legX: 1.8, armX: 5, armsReach: true, bodyNoCull: true,
      tex: { head: 'shadow_face', body: 'shadow_body', arm: 'shadow_body', leg: 'shadow_body', shin: 'shadow_wisp' },
      extras: [
        eyes(ovB([7, 8, 7]), 'shadow_eyes'),
        ['wisp1', 'head', [-1.8, 7.5, 1.5], [-1.2, 0, -1, 1.2, 5, 1], 'shadow_wisp', { rest: [1.25, 0, 0.3] }],
        ['wisp2', 'head', [1.8, 7.5, 1.5], [-1.2, 0, -1, 1.2, 5.5, 1], 'shadow_wisp', { rest: [1.3, 0, -0.3] }],
        ['wisp3', 'head', [0, 7, 3], [-1.6, 0, -1, 1.6, 7, 1], 'shadow_wisp', { rest: [1.5, 0, 0] }],
        ...pair(['clawL', 'foreL', [0, -7, 0], [-1.4, -3.5, -1.2, 1.4, 0, 1.2], 'shadow_claw']),
      ],
    });
    for (const p of sh.parts) if (!p.glow) { p.alpha = /^shin|^wisp/.test(p.name) ? 0.55 : 0.86; p.noCull = true; }
    D.shadow = post(hunch(sh, 0.1), 'm1biped');
  }
  D.gelatinous_cube = finishRig('m1cube', [
    rpart('skull', null, [-5, 6, -3], [-2.2, 0, -2.2, 2.2, 3.6, 2.2], { all: 'gelatinous_cube_bone', front: 'gelatinous_cube_skull' }, { role: 'flot', rest: [0.2, 0.6, 0.1] }),
    rpart('sword', null, [5, 13, 2], [-0.4, -7, -1, 0.4, 7, 1], 'gelatinous_cube_sword', { role: 'flot', rest: [0.3, 0.4, 0.9] }),
    rpart('bone1', null, [-2, 18, 6], [-0.7, -0.7, -4.5, 0.7, 0.7, 4.5], 'gelatinous_cube_bone', { role: 'flot', rest: [0.2, 0.9, 0.3] }),
    rpart('bone2', null, [3, 4, -6], [-0.6, -0.6, -3, 0.6, 0.6, 3], 'gelatinous_cube_bone', { role: 'flot', rest: [0.1, -0.6, 1.2] }),
    rpart('helm', null, [-6, 21, -5], [-2.2, -2, -2.2, 2.2, 2, 2.2], 'wight_plate', { role: 'flot', rest: [0.5, 0.2, 0.6] }),
    rpart('coins', null, [1, 1.5, 3], [-2.5, 0, -2, 2.5, 0.8, 2], 'gelatinous_cube_coin'),
    rpart('cube', null, [0, 0, 0], [-15, 0, -15, 15, 30, 15], { all: 'gelatinous_cube_jelly', top: 'gelatinous_cube_top' }, { role: 'cube', alpha: 0.42, noCull: true }),
  ], { hipY: 15, height: 30, post: 'm1cube' });
  D.will_o_wisp = finishRig('m1wisp', [
    rpart('core', null, [0, 6, 0], [-2.5, -2.5, -2.5, 2.5, 2.5, 2.5], { all: 'will_o_wisp_core', front: 'will_o_wisp_face' }, { role: 'wcore', glow: true, limb: 'head' }),
    rpart('orb', null, [0, 6, 0], [-0.01, -0.01, -0.01, 0.01, 0.01, 0.01], 'will_o_wisp_mote', { glow: true }),
    rpart('m0', 'orb', [5, 0, 0], [-0.7, -0.7, -0.7, 0.7, 0.7, 0.7], 'will_o_wisp_mote', { glow: true }),
    rpart('m1', 'orb', [-4, 2, 3], [-0.6, -0.6, -0.6, 0.6, 0.6, 0.6], 'will_o_wisp_mote', { glow: true }),
    rpart('m2', 'orb', [0, -3, -4.5], [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5], 'will_o_wisp_mote', { glow: true }),
  ], { hipY: 6, height: 9, post: 'm1wisp' });

  // ---- the Vale ----
  D.treant = post(bipedRig({
    head: [12, 12, 11], body: [16, 26, 12], arm: [6, 26, 6], leg: [8, 14, 8], armX: 11, legX: 4.2, heavy: true,
    tex: { head: { all: 'treant_bark', front: 'treant_face', top: 'treant_leaves' }, body: 'treant_bark', arm: 'treant_bark', leg: 'treant_bark', shin: 'awakened_tree_root' },
    extras: [
      eyes(ovB([12, 12, 11]), 'treant_eyes'),
      ['brow', 'head', [0, 8, -5.5], [-5.5, 0, -1.6, 5.5, 1.6, 0], 'treant_bark'],
      ['nose', 'head', [0, 5.6, -5.5], [-1.3, -2.2, -2.6, 1.3, 1, 0], 'treant_bark', { rest: [-0.2, 0, 0] }],
      ['beard', 'head', [0, 3, -5.6], [-5.5, -12, -1.2, 5.5, 0.5, 0.6], 'treant_moss', { noCull: true }],
      ['crown', 'head', [0, 11.5, 1.5], [-15, 0, -13, 15, 10, 13], 'treant_leaves', { noCull: true }],
      ['crown2', 'head', [8, 18, -6], [-7, 0, -6, 7, 8, 6], 'treant_leaves', { noCull: true }],
      ['crown3', 'head', [-9, 16, 7], [-7, 0, -6, 7, 8, 6], 'treant_leaves', { noCull: true }],
      ['crown4', 'head', [2, 20, 4], [-6, 0, -6, 6, 7, 6], 'treant_leaves', { noCull: true }],
      ...pair(['antL', 'head', [-4, 11, -2], [-0.9, 0, -0.9, 0.9, 8, 0.9], 'treant_bark', { rest: [0.1, 0, 0.5] }]),
      ...pair(['mossL', 'armL', [0, 3, 0], [-3.6, -3, -3.6, 3.6, 1, 3.6], 'treant_moss', { noCull: true }]),
      ['bodyMoss', 'body', [0, 14, -6], [-6, -6, -0.8, 6, 0, 0], 'treant_moss', { noCull: true }],
      ...treeLimbs('treant_bark', 'treant_leaves', 'awakened_tree_root', 1.2),
    ],
  }), 'm1biped');
  D.dryad = post(bipedRig({
    head: [7, 8, 7], body: [7, 12, 4], arm: [3, 12, 3], leg: [3, 12, 3], legX: 1.7, armX: 5,
    tex: { head: { all: 'dryad_leaves', front: 'dryad_face' }, body: { all: 'dryad_skin', front: 'dryad_body', back: 'dryad_body' }, arm: 'dryad_skin', leg: 'dryad_leg' },
    extras: [
      eyes(ovB([7, 8, 7]), 'dryad_eyes'),
      ['hair', 'head', [0, 8, 0.5], [-4.2, -14, -0.5, 4.2, 1.2, 4.3], 'dryad_leaves', { noCull: true, rest: [0.08, 0, 0] }],
      ['crown', 'head', [0, 7, 0], [-4.4, 0, -4.4, 4.4, 2.6, 4.4], 'dryad_crown', { noCull: true }],
      ...pair(['twigL', 'head', [-2.4, 8.5, -0.5], [-0.4, 0, -0.4, 0.4, 4.5, 0.4], 'dryad_bark', { rest: [0.1, 0, 0.45] }]),
      ...pair(['twigL2', 'twigL', [0, 3, 0], [-2.2, 0, -0.3, 0, 0.6, 0.3], 'dryad_bark', { rest: [0, 0, 0.3] }]),
      ['skirt', 'body', [0, 1, 0], [-4.4, -9, -2.6, 4.4, 0.5, 2.6], 'dryad_skirt', { noCull: true }],
      ...pair(['vineL', 'foreL', [0, -5, 0], [-1.7, -1, -1.7, 1.7, 1.2, 1.7], 'dryad_leaves', { noCull: true }]),
    ],
  }), 'm1biped');
  {
    const px = bipedRig({
      head: [8, 8, 7], body: [6, 7, 3], arm: [2, 7, 2], leg: [2, 7, 2], legX: 1.2, armX: 4,
      tex: { head: { all: 'pixie_hair', front: 'pixie_face' }, body: 'pixie_dress', arm: 'pixie_skin', leg: 'pixie_skin' },
      extras: [
        ['skirt', 'body', [0, 1, 0], [-3.8, -4, -2.2, 3.8, 0.5, 2.2], 'pixie_dress', { noCull: true }],
        ['bun', 'head', [0, 8, 1], [-2.5, 0, -2, 2.5, 3, 2], 'pixie_hair'],
        ...pair(['antL', 'head', [-1.5, 8, -2], [-0.3, 0, -0.3, 0.3, 4, 0.3], 'pixie_skin', { rest: [-0.3, 0, 0.3] }]),
        ['wingRU', 'body', [1, 5.5, 1.6], [0, -1, -0.15, 11, 9, 0.15], 'pixie_wing', { noCull: true, alpha: 0.9, rest: [0, -0.45, 0.25] }],
        ['wingLU', 'body', [-1, 5.5, 1.6], [-11, -1, -0.15, 0, 9, 0.15], 'pixie_wing', { noCull: true, alpha: 0.9, rest: [0, 0.45, -0.25] }],
        ['wingRD', 'body', [1, 3, 1.6], [0, -7, -0.15, 7, 0, 0.15], 'pixie_wing', { noCull: true, alpha: 0.9, rest: [0, -0.5, -0.2] }],
        ['wingLD', 'body', [-1, 3, 1.6], [-7, -7, -0.15, 0, 0, 0.15], 'pixie_wing', { noCull: true, alpha: 0.9, rest: [0, 0.5, 0.2] }],
      ],
    });
    D.pixie = sc(post(px, 'm1fly'), 0.32);
    const sp = bipedRig({
      head: [7, 7, 7], body: [6, 8, 3], arm: [2, 7, 2], leg: [2, 8, 2], legX: 1.2, armX: 4,
      tex: { head: { all: 'sprite_skin', front: 'sprite_face' }, body: 'sprite_leaf', arm: 'sprite_skin', leg: 'sprite_pants' },
      extras: [
        ['cap', 'head', [0, 5.5, 0], [-3.9, 0, -3.9, 3.9, 2.2, 3.9], 'sprite_cap'],
        ['tip', 'cap', [0, 2.2, 0.8], [-1.6, 0, -1.6, 1.6, 3.5, 1.6], 'sprite_cap', { rest: [0.6, 0, 0] }],
        ...pair(['earL', 'head', [-3.5, 3.5, 0], [-1.6, -0.5, -0.3, 0, 0.8, 0.3], 'sprite_skin', { rest: [0, 0.3, -0.5] }]),
        ['wingR1', 'body', [1, 6.5, 1.6], [0, -0.12, -0.8, 12, 0.12, 1.6], 'sprite_wing', { noCull: true, alpha: 0.8, rest: [0, -0.35, 0.2] }],
        ['wingR2', 'body', [1, 5.2, 1.6], [0, -0.12, -0.7, 10, 0.12, 1.4], 'sprite_wing', { noCull: true, alpha: 0.8, rest: [0, -0.6, -0.15] }],
        ['wingL1', 'body', [-1, 6.5, 1.6], [-12, -0.12, -0.8, 0, 0.12, 1.6], 'sprite_wing', { noCull: true, alpha: 0.8, rest: [0, 0.35, -0.2] }],
        ['wingL2', 'body', [-1, 5.2, 1.6], [-10, -0.12, -0.7, 0, 0.12, 1.4], 'sprite_wing', { noCull: true, alpha: 0.8, rest: [0, 0.6, 0.15] }],
        ['quiver', 'body', [1.6, 2, 1.6], [-1, 0, 0, 1, 6, 1.6], 'bandit_pouch', { rest: [0, 0, 0.4] }],
      ],
    });
    D.sprite = sc(post(sp, 'm1fly'), 0.32);
  }
  {
    const sat = bipedRig({
      head: [8, 8, 7], body: [8, 11, 4], arm: [3, 11, 3], leg: [4, 13, 4],
      tex: { head: { all: 'satyr_hair', front: 'satyr_face' }, body: { all: 'satyr_skin', front: 'satyr_chest' }, arm: 'satyr_skin', leg: 'satyr_fur' },
      extras: [
        ...pair(['hornL1', 'head', [-2.4, 7.4, -1.5], [-1.05, 0, -1.05, 1.05, 3.6, 1.05], 'satyr_horn', { rest: [0.45, 0, 0.6] }]),
        ...pair(['hornL2', 'hornL1', [0, 3.6, 0], [-0.9, 0, -0.9, 0.9, 3.2, 0.9], 'satyr_horn', { rest: [1.25, 0, 0] }]),
        ...pair(['hornL3', 'hornL2', [0, 3.2, 0], [-0.7, 0, -0.7, 0.7, 2.8, 0.7], 'satyr_horn', { rest: [1.3, 0, 0] }]),
        ...pair(['earL', 'head', [-4, 4.5, 0], [-2.2, -0.6, -0.4, 0, 0.8, 0.4], 'satyr_skin', { rest: [0, 0.2, -0.25] }]),
        ['beard', 'head', [0, 0.3, -3.5], [-1, -3, -0.6, 1, 0.3, 0.4], 'satyr_hair'],
        ['curls', 'head', [0, 7, 0], [-4.3, -0.5, -3.8, 4.3, 1.8, 3.8], 'satyr_hair'],
        ['tail', 'body', [0, 1, 2], [-0.8, -0.8, 0, 0.8, 0.8, 2.6], 'satyr_fur', { rest: [-0.7, 0, 0] }],
        ...pair(['hoofL', 'shinL', [0, -6, 0], [-2.1, -1.6, -2.4, 2.1, 0, 1.9], 'satyr_hoof', { rest: [0.4, 0, 0] }]),
        ['pipes', 'foreR', [0, -4.5, -1.6], [-2.6, -1.2, -0.5, 2.6, 2.6, 0.5], 'satyr_pipes', { noCull: true }],
      ],
    });
    for (const p of sat.parts) { if (p.name === 'legL' || p.name === 'legR') p.rest = [0.35, 0, 0]; if (p.name === 'shinL' || p.name === 'shinR') p.rest = [-0.75, 0, 0]; }
    D.satyr = post(sat, 'm1biped');
  }
  D.green_hag = post(hunch(bipedRig({
    head: [8, 9, 8], body: [8, 11, 5], arm: [3, 14, 3], leg: [3, 11, 3], legX: 1.8, armX: 5.5,
    tex: { head: { all: 'green_hag_hair', front: 'green_hag_face' }, body: 'green_hag_dress', arm: 'green_hag_skin', leg: 'green_hag_skin' },
    extras: [
      eyes(ovB([8, 9, 8]), 'green_hag_eyes'),
      ['hair', 'head', [0, 9, 0.5], [-4.9, -15, -4.5, 4.9, 1.6, 4.7], { all: 'green_hag_hairend', front: false }, { noCull: true }],
      ['nose', 'head', [0, 4.4, -4], [-0.9, -1.6, -3, 0.9, 1, 0], 'green_hag_skin', { rest: [0.15, 0, 0] }],
      ['noseTip', 'nose', [0, -1.6, -3], [-0.6, -1.4, -0.2, 0.6, 0, 1], 'green_hag_skin'],
      ['chin', 'head', [0, 0.6, -4], [-1.5, -1.4, -1.2, 1.5, 0.6, 0], 'green_hag_skin'],
      ['skirt', 'body', [0, 1, 0], [-4.7, -11, -3.1, 4.7, 0.5, 3.1], 'green_hag_dress', { noCull: true }],
      ['shawl', 'body', [0, 11, 0], [-5.3, -4.5, -3.2, 5.3, 0.6, 3.2], 'green_hag_shawl', { noCull: true }],
      ...pair(['clawL', 'foreL', [0, -7, 0], [-1.4, -3.4, -1.4, 1.4, 0, 1.4], 'green_hag_claw']),
    ],
  }), 0.25), 'm1biped');
  {
    const hooves = ['FL', 'FR', 'BL', 'BR'].map(k => ['hoof' + k, 'shin' + k, [0, 0, 0], [-2.15, -7, -2.15, 2.15, -5.5, 2.15], 'nightmare_hoof', G]);
    const nm = quadRig({
      body: [10, 10, 22], leg: [4, 14], head: [5, 6, 11], neck: [4, 12, 6, 0.6], headTilt: 0.45, headAt: [3, 0], tail: [3, 14, 3], tailRest: -0.35, gallop: true, post: 'm1nightmare',
      tex: { body: 'nightmare_hide', head: { all: 'nightmare_hide', front: 'nightmare_face' }, leg: 'nightmare_hide', tail: 'nightmare_flame', neck: 'nightmare_hide' },
      extras: [
        ['mane', 'neck', [0, 0, 3], [-1.2, 0, 0, 1.2, 14, 3.5], 'nightmare_flame', G],
        ['forelock', 'head', [0, 3, -2], [-1, 0, -2, 1, 2.5, 1], 'nightmare_flame', G],
        ...pair(['earL', 'head', [-1.5, 3, -1.5], [-0.75, 0, -0.5, 0.75, 3, 0.5], 'nightmare_hide', { role: 'ear', rest: [-0.2, 0, -0.15] }]),
        ['eyeL', 'head', [-2.55, 1, -8], [-0.12, -0.6, -0.9, 0.04, 0.6, 0.9], 'nightmare_eyeglow', G],
        ['eyeR', 'head', [2.55, 1, -8], [-0.04, -0.6, -0.9, 0.12, 0.6, 0.9], 'nightmare_eyeglow', G],
        ...hooves,
      ],
    });
    const tail = nm.parts.find(p => p.name === 'tail'); if (tail) { tail.glow = true; tail.noCull = true; }
    D.nightmare = sc(nm, 1.05);
  }
}

// ---- how they move: poses over the walk ------------------------------------------------------------------
Object.assign(RIG_POST, {
  // two legs: a blow wound up overhead, pan pipes to the lips, hands raised to cast, a crouch to hide
  m1biped(m, d, P, R) {
    const W = m.m1Wind, k = W && W.o ? clamp(1 - W.t / (W.o.wind || 0.5), 0, 1) : 0;
    if (k) {
      const up = Math.PI * 0.8 * k;
      if (W.o.two) { P.armR = [up, 0, 0.15]; P.armL = [up, 0, -0.15]; P.foreR = [0.35 * k, 0, 0]; P.foreL = [0.35 * k, 0, 0]; }
      else { P.armR = [up, -0.25 * k, 0.15]; P.foreR = [0.45 * k, 0, 0]; }
      if (P.body) P.body[0] += 0.1 * k;
    }
    const st = m.state, t = m.age || 0;
    if (st === 'm1pipe') { P.armR = [1.5, 0.65, 0]; P.foreR = [1.15, 0, 0]; P.armL = [1.45, -0.6, 0]; P.foreL = [1.0, 0, 0]; if (P.head) P.head[0] += Math.sin(t * 8) * 0.08; }
    else if (st === 'm1cast') { P.armR = [2.4 + Math.sin(t * 9) * 0.1, 0, 0.45]; P.armL = [2.4 + Math.sin(t * 9 + 1) * 0.1, 0, -0.45]; P.foreR = [0.2, 0, 0]; P.foreL = [0.2, 0, 0]; }
    else if (st === 'm1hide') { R.lift -= 0.1; for (const [a, b] of [['legL', 'shinL'], ['legR', 'shinR']]) { if (P[a]) P[a][0] += 0.55; if (P[b]) P[b][0] -= 0.9; } if (P.body) P.body[0] -= 0.35; }
  },
  // four legs: the head rears back before a bite, snaps down with it, and lifts to howl
  m1quad(m, d, P, R) {
    const W = m.m1Wind, k = W && W.o ? clamp(1 - W.t / (W.o.wind || 0.5), 0, 1) : 0;
    if (!P.head) P.head = [0, 0, 0];
    if (k) { P.head[0] += 0.35 * k; R.pitch = (R.pitch || 0) + 0.1 * k; }
    const bite = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0;
    P.head[0] -= 0.45 * bite;
    if (m.state === 'm1howl') P.head[0] += 0.95;
    P.jaw = [-(0.05 + bite * 0.5 + (m.state === 'm1howl' ? 0.5 : 0)), 0, 0];
  },
  m1bear(m, d, P, R) { if (RIG_POST.bear) RIG_POST.bear(m, d, P, R); RIG_POST.m1quad(m, d, P, R); },
  m1spider(m, d, P, R) {
    const t = m.age || 0, bite = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0;
    P.fangL = [Math.sin(t * 7) * 0.08 - bite * 0.5, 0, 0]; P.fangR = [Math.sin(t * 7 + 1) * 0.08 - bite * 0.5, 0, 0];
    if (m.state === 'm1web') R.pitch = (R.pitch || 0) + 0.32;
  },
  // the restless dead drift: bobbing, the tail of mist trailing, arms reaching; a banshee throws back her head to wail
  m1ghost(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0) * 0.7, sp = clamp((m.speedNow || 0) * 0.08, 0, 0.45);
    R.lift = Math.sin(t * 1.7) * 0.1;
    P.body = [Math.sin(t * 1.1) * 0.05 - sp * 0.6, 0, Math.sin(t * 0.9) * 0.04];
    const reach = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0;
    P.armR = [Math.sin(t * 1.3) * 0.18 + reach * 0.6, 0, 0]; P.armL = [Math.sin(t * 1.3 + 1.2) * 0.18 + reach * 0.6, 0, 0];
    P.tail1 = [Math.sin(t * 2.1) * 0.15 + sp, 0, Math.sin(t * 1.6) * 0.12];
    P.tail2 = [Math.sin(t * 2.1 - 0.8) * 0.2 + sp * 0.6, 0, Math.sin(t * 1.6 - 0.8) * 0.15];
    P.tail3 = [Math.sin(t * 2.1 - 1.6) * 0.25, 0, Math.sin(t * 1.6 - 1.6) * 0.2];
    P.hair = [Math.sin(t * 1.4) * 0.08 + sp * 1.2, 0, Math.sin(t * 1.1) * 0.05];
    P.head = [(m.headPitch || 0) * 0.7, (m.headYawRel || 0) * 0.8, 0];
    const W = m.m1Wind; if (W && W.o) { const k = clamp(1 - W.t / (W.o.wind || 0.5), 0, 1); P.armR[0] += 1.6 * k; P.armL[0] += 1.6 * k; }
    if (m.state === 'm1wail') { P.head[0] += 0.5 + Math.sin(t * 30) * 0.04; P.armR = [2.7, 0, 0.6]; P.armL = [2.7, 0, -0.6]; P.hair[0] += 0.6; R.lift += 0.15; }
  },
  // the cube's leftovers turn slowly in the jelly; the whole thing quivers
  m1cube(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0);
    for (const p of d.parts) if (p.role === 'flot') { const i = p.name.length; P[p.name] = [Math.sin(t * 0.7 + i) * 0.15, t * 0.15 * (i % 2 ? 1 : -1), Math.cos(t * 0.6 + i) * 0.12]; }
    R.roll = Math.sin(t * 1.3) * 0.015; R.pitch = Math.sin(t * 1.1) * 0.015;
  },
  m1wisp(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0); R.lift = Math.sin(t * 2.2) * 0.12; P.core = [Math.sin(t * 1.3) * 0.2, Math.sin(t * 0.7) * 0.4, 0]; P.orb = [0.3, t * 2.4, 0.2];
    if (m.game && m.state !== 'm1invis' && Math.random() < 0.3) spellSpark(m.game, m.x + (Math.random() - 0.5) * 0.5, m.y + 0.35 + R.lift + (Math.random() - 0.5) * 0.5, m.z + (Math.random() - 0.5) * 0.5, 'mana_frost', { vy: 0.3, life: 0.6, size: 0.05 });
  },
  // pixies and sprites: wings a blur, legs dangling while they hover
  m1fly(m, d, P, R) {
    const t = (m.age || 0) + (m.id || 0), f = Math.sin(t * 38);
    P.wingRU = [0, -f * 0.55, 0]; P.wingLU = [0, f * 0.55, 0]; P.wingRD = [0, -f * 0.45, 0]; P.wingLD = [0, f * 0.45, 0];
    P.wingR1 = [0, 0, -f * 0.5]; P.wingL1 = [0, 0, f * 0.5]; P.wingR2 = [0, 0, f * 0.5]; P.wingL2 = [0, 0, -f * 0.5];
    if (!m.onGround) {
      P.legL = [0.25 + Math.sin(t * 2) * 0.1, 0, 0.05]; P.legR = [0.1 + Math.sin(t * 2 + 1) * 0.1, 0, -0.05]; P.shinL = [-0.4, 0, 0]; P.shinR = [-0.3, 0, 0];
      if (!m.aiming && !(m.swingT > 0)) { P.armR = [0.3, 0, 0.5 + Math.sin(t * 3) * 0.1]; P.armL = [0.3, 0, -0.5 - Math.sin(t * 3) * 0.1]; }
    }
    R.lift = (R.lift || 0) + Math.sin(t * 3) * 0.02;
    RIG_POST.m1biped(m, d, P, R);
  },
  m1shrub(m, d, P, R) {
    const t = m.age || 0, s = m.swingT > 0 ? Math.sin(m.swingT / 0.3 * Math.PI) : 0;
    P.armR = [0, -s * 1.2, Math.sin(t * 2) * 0.1]; P.armL = [0, s * 0.6, -Math.sin(t * 2 + 1) * 0.1];
    if (m.state === 'm1still') { for (const k of ['legFL', 'legFR', 'legBL', 'legBR', 'head', 'body']) P[k] = [0, 0, 0]; P.armR = [0, 0, 0]; P.armL = [0, 0, 0]; }
  },
  // a nightmare gallops on the air, its tail of fire streaming out behind
  m1nightmare(m, d, P, R) {
    RIG_POST.m1quad(m, d, P, R);
    if (!m.onGround && !m.ghost) {
      const t = (m.age || 0) * 9;
      for (const p of d.parts) if (p.role === 'qleg') {
        const off = (p.front ? 0 : Math.PI) + (p.side > 0 ? 0.5 : 0);
        P[p.name] = [Math.sin(t + off) * 0.7, 0, 0];
        P['shin' + p.name.slice(3)] = [p.front ? -Math.max(0, Math.cos(t + off)) * 0.9 : Math.max(0, -Math.cos(t + off)) * 0.6, 0, 0];
      }
      R.pitch = (R.pitch || 0) + clamp((m.vy || 0) * 0.05, -0.3, 0.3);
    }
    if (P.tail) P.tail[0] += 0.45;
    if (m.game && m.state !== 'm1invis' && Math.random() < (m.onGround ? 0.12 : 0.35)) m.game.flame(m.x + (Math.random() - 0.5) * 0.8, m.y + 0.1 + Math.random() * 0.4, m.z + (Math.random() - 0.5) * 0.8);
  },
});
// ---- their numbers (SRD 5.2) ---------------------------------------------------------------------------
// hp is the stat block's average, damage one attack's average (the D&D layer weighs it against your armour),
// speed in blocks a second (30 ft ≈ 2.7). xp is the base game's; dndXp the SRD's for the CR.
{
  const GHOST = ['acid', 'bludgeoning', 'cold', 'fire', 'lightning', 'piercing', 'slashing', 'thunder'];
  const M = (k, o) => Object.assign({ model: k, m1: k, hostile: true, special: true, xp: Math.max(2, Math.round(Math.sqrt(o.dndXp || 10) * 1.2)) }, o);
  Object.assign(MOB_TYPES, {
    giant_rat: M('giant_rat', { label: 'a giant rat', hp: 7, w: 0.32, h: 0.65, speed: 3.0, damage: 4, ac: 13, toHit: 4, cr: 0.125, dndXp: 25, ctype: 'beast', region: ['farms'], voice: 'mouse', drops: [['leather', 0, 1, 0.25], ['raw_meat', 0, 1, 0.3]] }),
    bandit: M('bandit', { label: 'a bandit', held: 'scimitar', hp: 11, w: 0.3, h: 1.95, speed: 2.8, damage: 4, ac: 12, toHit: 3, cr: 0.125, dndXp: 25, ctype: 'humanoid', humanoid: true, faction: 'bandit', region: ['farms'], voice: 'raider', drops: [['gold_coin', 1, 6, 0.8], ['silver_coin', 2, 10, 0.6], ['leather', 0, 1, 0.4], ['scimitar', 1, 1, 0.06], ['bread', 0, 1, 0.3]] }),
    bandit_captain: M('bandit_captain', { label: 'a bandit captain', held: 'scimitar', hp: 52, w: 0.32, h: 2.0, speed: 2.9, damage: 7, ac: 15, toHit: 5, cr: 2, dndXp: 450, ctype: 'humanoid', humanoid: true, faction: 'bandit', boss: true, mini: true, knockResist: 0.4, region: ['farms'], voice: 'raider', drops: [['gold_coin', 10, 25, 1], ['scimitar', 1, 1, 0.35], ['dagger', 1, 1, 0.5], ['emerald', 0, 2, 0.5]] }),
    goblin: M('goblin', { label: 'a goblin', held: 'scimitar', hp: 10, w: 0.28, h: 1.15, speed: 3.0, damage: 5, ac: 15, toHit: 4, cr: 0.25, dndXp: 50, ctype: 'fey', goblinoid: true, faction: 'goblin', region: ['hills'], voice: 'm1goblin', drops: [['gold_coin', 0, 3, 0.5], ['scimitar', 1, 1, 0.05], ['arrow', 0, 3, 0.4], ['leather', 0, 1, 0.3]] }),
    goblin_boss: M('goblin_boss', { label: 'a goblin boss', held: 'scimitar', hp: 21, w: 0.32, h: 1.45, speed: 3.0, damage: 5, ac: 17, toHit: 4, cr: 1, dndXp: 200, ctype: 'fey', goblinoid: true, faction: 'goblin', boss: true, mini: true, knockResist: 0.3, region: ['hills'], voice: 'm1goblin', drops: [['gold_coin', 6, 14, 1], ['scimitar', 1, 1, 0.3], ['worg_fang', 0, 2, 0.5], ['iron_ingot', 0, 2, 0.4]] }),
    hobgoblin: M('hobgoblin', { label: 'a hobgoblin', held: 'longsword', hp: 11, w: 0.32, h: 1.95, speed: 2.7, damage: 6, ac: 18, toHit: 3, cr: 0.5, dndXp: 100, ctype: 'fey', goblinoid: true, faction: 'goblin', region: ['hills'], voice: 'raider', drops: [['gold_coin', 1, 5, 0.6], ['longsword', 1, 1, 0.06], ['iron_ingot', 0, 1, 0.3]] }),
    bugbear: M('bugbear', { label: 'a bugbear', held: 'morningstar', hp: 33, w: 0.38, h: 2.25, speed: 2.8, damage: 9, ac: 14, toHit: 4, cr: 1, dndXp: 200, ctype: 'fey', goblinoid: true, faction: 'goblin', knockResist: 0.3, region: ['hills'], voice: 'bear', drops: [['pelt', 1, 2, 0.8], ['morningstar', 1, 1, 0.08], ['gold_coin', 1, 6, 0.6]] }),
    worg: M('worg', { label: 'a worg', hp: 26, w: 0.5, h: 1.45, speed: 4.2, damage: 7, ac: 13, toHit: 5, cr: 0.5, dndXp: 100, ctype: 'fey', faction: 'goblin', night: true, knockResist: 0.25, region: ['hills'], voice: 'wolf', drops: [['pelt', 1, 1, 0.8], ['worg_fang', 0, 2, 0.6], ['raw_meat', 0, 2, 0.6]] }),
    owlbear: M('owlbear', { label: 'an owlbear', hp: 59, w: 0.75, h: 1.9, speed: 3.3, damage: 14, ac: 13, toHit: 7, cr: 3, dndXp: 700, ctype: 'monstrosity', knockResist: 0.6, region: ['forest'], voice: 'm1owlbear', drops: [['owlbear_feather', 1, 3, 1], ['pelt', 1, 2, 0.8], ['raw_meat', 1, 3, 1]] }),
    giant_spider: M('giant_spider', { label: 'a giant spider', hp: 26, w: 0.95, h: 1.1, speed: 3.4, damage: 7, ac: 14, toHit: 5, cr: 1, dndXp: 200, ctype: 'beast', climber: true, knockResist: 0.3, onHit: { poison: 5 }, region: ['forest'], voice: 'spider', drops: [['spider_silk', 1, 3, 0.9], ['venom_sac', 0, 1, 0.5], ['string', 1, 3, 1]] }),
    ettercap: M('ettercap', { label: 'an ettercap', hp: 44, w: 0.34, h: 1.65, speed: 2.7, damage: 6, ac: 13, toHit: 4, cr: 2, dndXp: 450, ctype: 'monstrosity', onHit: { poison: 4 }, region: ['forest'], voice: 'spider', drops: [['spider_silk', 1, 4, 1], ['venom_sac', 0, 2, 0.6]] }),
    dire_wolf: M('dire_wolf', { label: 'a dire wolf', hp: 22, w: 0.5, h: 1.35, speed: 4.3, damage: 8, ac: 14, toHit: 5, cr: 1, dndXp: 200, ctype: 'beast', knockResist: 0.25, region: ['forest'], voice: 'wolf', drops: [['pelt', 1, 2, 1], ['raw_meat', 1, 2, 0.8], ['worg_fang', 0, 1, 0.3]] }),
    awakened_tree: M('awakened_tree', { label: 'an awakened tree', hp: 59, w: 0.7, h: 2.95, speed: 1.8, damage: 13, ac: 13, toHit: 6, cr: 2, dndXp: 450, ctype: 'plant', resist: ['bludgeoning', 'piercing'], vulnerable: ['fire'], immune: ['charm', 'fear', 'sleep'], knockResist: 0.85, noSever: true, region: ['forest'], voice: 'm1tree', drops: [['heartwood', 1, 2, 0.8], ['log', 2, 5, 1], ['stick', 2, 6, 1], ['apple', 0, 2, 0.4]] }),
    awakened_shrub: M('awakened_shrub', { label: 'an awakened shrub', hp: 10, w: 0.3, h: 0.8, speed: 1.8, damage: 1, ac: 9, toHit: 1, cr: 0, dndXp: 10, ctype: 'plant', resist: ['piercing'], vulnerable: ['fire'], region: ['forest'], voice: 'm1tree', drops: [['stick', 1, 3, 1], ['sweet_berries', 0, 3, 0.5]] }),
    ghast: M('ghast', { label: 'a ghast', hp: 36, w: 0.3, h: 1.95, speed: 2.9, damage: 10, ac: 13, toHit: 5, cr: 2, dndXp: 450, ctype: 'undead', undead: true, family: 'ghoul', resist: ['necrotic'], immune: ['poison', 'charm', 'poisoned'], night: true, region: ['crypt'], voice: 'ghoul', drops: [['grave_dust', 1, 2, 0.8], ['rotten_flesh', 0, 2, 0.6], ['bone', 0, 2, 0.6]] }),
    wight: M('wight', { label: 'a wight', held: 'longsword', hp: 82, w: 0.32, h: 2.0, speed: 2.7, damage: 10, ac: 14, toHit: 4, cr: 3, dndXp: 700, ctype: 'undead', undead: true, resist: ['necrotic'], immune: ['poison', 'poisoned'], knockResist: 0.4, night: true, region: ['crypt'], voice: 'husk', m1Shot: 'wight', drops: [['grave_dust', 1, 3, 1], ['longsword', 1, 1, 0.12], ['gold_coin', 2, 10, 0.7], ['iron_ingot', 0, 2, 0.4]] }),
    specter: M('specter', { label: 'a specter', m1Ghost: true, hp: 22, w: 0.35, h: 1.8, speed: 3.6, damage: 10, ac: 12, toHit: 4, cr: 1, dndXp: 200, ctype: 'undead', undead: true, flyer: true, noPush: true, noSever: true, resist: GHOST, immune: ['necrotic', 'poison', 'charm', 'hold', 'root', 'prone', 'poisoned', 'petrify'], night: true, region: ['crypt'], voice: 'wraith', drops: [['ectoplasm', 1, 2, 0.9], ['grave_dust', 0, 1, 0.4]] }),
    banshee: M('banshee', { label: 'a banshee', m1Ghost: true, hp: 54, w: 0.35, h: 2.0, speed: 3.2, damage: 12, ac: 12, toHit: 4, cr: 4, dndXp: 1100, ctype: 'undead', undead: true, flyer: true, noPush: true, noSever: true, boss: true, mini: true, resist: GHOST, immune: ['necrotic', 'poison', 'charm', 'fear', 'hold', 'root', 'prone', 'poisoned', 'petrify'], night: true, region: ['crypt'], voice: 'm1banshee', drops: [['banshee_tear', 1, 1, 1], ['ectoplasm', 2, 4, 1], ['gold_coin', 5, 15, 0.8]] }),
    shadow: M('shadow', { label: 'a shadow', hp: 27, w: 0.3, h: 1.9, speed: 3.4, damage: 5, ac: 12, toHit: 4, cr: 0.5, dndXp: 100, ctype: 'undead', undead: true, noSever: true, resist: GHOST, vulnerable: ['radiant'], immune: ['necrotic', 'poison', 'fear', 'hold', 'root', 'prone', 'poisoned', 'petrify'], night: true, region: ['crypt'], voice: 'wraith', drops: [['shadow_essence', 1, 1, 0.8]] }),
    gelatinous_cube: M('gelatinous_cube', { label: 'a gelatinous cube', hp: 63, w: 0.95, h: 1.9, speed: 1.4, damage: 10, ac: 6, toHit: 4, cr: 2, dndXp: 450, ctype: 'ooze', immune: ['acid', 'blind', 'charm', 'fear', 'prone'], knockResist: 0.9, noSever: true, region: ['crypt'], voice: 'squish', drops: [['ooze_jelly', 1, 3, 1], ['slime_ball', 1, 3, 0.8], ['gold_coin', 2, 12, 0.8], ['bone', 0, 3, 0.7], ['iron_sword', 1, 1, 0.12]] }),
    will_o_wisp: M('will_o_wisp', { label: "a will-o'-wisp", hp: 27, w: 0.25, h: 0.6, speed: 3.8, damage: 9, ac: 19, toHit: 4, cr: 2, dndXp: 450, ctype: 'undead', undead: true, flyer: true, noPush: true, noSever: true, resist: ['acid', 'bludgeoning', 'cold', 'fire', 'necrotic', 'piercing', 'slashing'], immune: ['lightning', 'poison', 'hold', 'root', 'prone', 'poisoned', 'sleep'], night: true, region: ['crypt', 'marsh'], voice: 'm1wisp', drops: [['wisp_essence', 1, 1, 0.9], ['glowstone_dust', 0, 2, 0.5]] }),
    treant: M('treant', { label: 'a treant', hp: 138, w: 1.05, h: 4.2, speed: 2.5, damage: 16, ac: 16, toHit: 10, cr: 9, dndXp: 5000, ctype: 'plant', resist: ['bludgeoning', 'piercing'], vulnerable: ['fire'], boss: true, mini: true, knockResist: 1, noSever: true, region: ['vale', 'duskwood'], voice: 'm1tree', drops: [['heartwood', 3, 6, 1], ['log', 6, 12, 1], ['fey_blossom', 1, 3, 0.8], ['emerald', 1, 3, 0.6]] }),
    dryad: M('dryad', { label: 'a dryad', hp: 22, w: 0.3, h: 1.9, speed: 2.7, damage: 8, ac: 16, toHit: 5, cr: 1, dndXp: 200, ctype: 'fey', magicResist: true, region: ['vale', 'duskwood'], voice: 'm1dryad', drops: [['fey_blossom', 1, 2, 0.9], ['heartwood', 0, 1, 0.3]] }),
    pixie: M('pixie', { label: 'a pixie', hp: 1, w: 0.15, h: 0.5, speed: 3.0, damage: 1, ac: 15, toHit: 4, cr: 0.25, dndXp: 50, ctype: 'fey', flyer: true, noPush: true, magicResist: true, region: ['vale'], voice: 'm1pixie', drops: [['pixie_dust', 1, 2, 1], ['fey_blossom', 0, 1, 0.3]] }),
    sprite: M('sprite', { label: 'a sprite', held: 'bow', hp: 10, w: 0.15, h: 0.5, speed: 3.4, damage: 1, ac: 15, toHit: 6, cr: 0.25, dndXp: 50, ctype: 'fey', flyer: true, noPush: true, ranged: true, region: ['vale'], voice: 'm1pixie', m1Shot: 'sprite', drops: [['pixie_dust', 0, 1, 0.6], ['arrow', 0, 2, 0.5], ['fey_blossom', 0, 1, 0.3]] }),
    satyr: M('satyr', { label: 'a satyr', hp: 31, w: 0.3, h: 1.95, speed: 3.4, damage: 5, ac: 13, toHit: 5, cr: 0.5, dndXp: 100, ctype: 'fey', magicResist: true, region: ['vale'], voice: 'goat', drops: [['satyr_horn', 0, 1, 0.6], ['fey_blossom', 0, 1, 0.4], ['gold_coin', 0, 4, 0.5]] }),
    green_hag: M('green_hag', { label: 'a green hag', hp: 82, w: 0.32, h: 1.85, speed: 2.7, damage: 8, ac: 17, toHit: 6, cr: 3, dndXp: 700, ctype: 'fey', swims: true, walks: true, knockResist: 0.3, onHit: { poison: 3 }, region: ['vale', 'duskwood', 'marsh'], voice: 'witch', drops: [['hag_eye', 0, 1, 0.5], ['hex_flask', 0, 1, 0.4], ['gold_coin', 4, 12, 0.8]] }),
    nightmare: M('nightmare', { label: 'a nightmare', hp: 68, w: 0.62, h: 1.9, speed: 4.6, damage: 13, ac: 13, toHit: 6, cr: 3, dndXp: 700, ctype: 'fiend', flyer: true, fireImmune: true, immune: ['fire'], knockResist: 0.6, night: true, region: ['duskwood', 'shadowfell'], voice: 'horse', drops: [['nightmare_ember', 1, 2, 1], ['leather', 1, 2, 0.6]] }),
  });
  for (const k of Object.keys(MOB_TYPES)) if (MOB_TYPES[k].m1 === k) MOB_TYPES[k].drops = MOB_TYPES[k].drops.filter(([id]) => ITEMS[id]);
  // The campaign (campaign/sb_world.js) brings its own 'goblin' and 'goblin_boss', marauders shrunk and tinted green,
  // which replace these when it loads. Once everything has loaded, such a stand-in gets the goblin's own body and ways
  // back, keeping the campaign's name, numbers, drops and story hooks.
  const mine = {}; for (const k of ['goblin', 'goblin_boss']) mine[k] = Object.assign({}, MOB_TYPES[k]);
  const keep = ['model', 'w', 'h', 'held', 'voice', 'special', 'm1', 'ctype', 'goblinoid', 'faction', 'region', 'speed'];
  setTimeout(() => { try { for (const k in mine) { const T = MOB_TYPES[k]; if (!T || T.m1 || !T.campaign) continue; for (const f of keep) T[f] = mine[k][f]; T.tint = null; T.scale = undefined; } } catch (e) { console.warn('m1 goblins', e); } }, 0);
}

// ---- what they do to you ----------------------------------------------------------------------------------
// Conditions on a player who stands at this screen: held fast (paralysed, prone), restrained (webs, vines, a
// bugbear's grip), asleep, frightened (can't step toward the one it fears), charmed (can't strike the charmer,
// and drifts toward them), confused (left is right), engulfed. Each wears off by itself; jumping struggles free.
const M1_LABEL = { hold: ['Paralysed', '#e8d070'], root: ['Restrained', '#f0f0f0'], sleep: ['Asleep', '#b8a8ff'], fear: ['Frightened', '#c890ff'], charm: ['Charmed', '#ff9ad8'], confuse: ['Confused', '#ff80ff'], prone: ['Knocked prone', '#e8a860'], engulf: ['Engulfed', '#8ae8b0'] };
const M1_HINT = { root: 'Caught fast! Jump to struggle free.', engulf: 'Engulfed! The acid burns. Jump to struggle free.', hold: 'You can\'t move a muscle!', sleep: 'A magical sleep takes you... (a blow will wake you)', charm: 'You can\'t bring yourself to harm', fear: 'Frightened: you can\'t make yourself go nearer.', confuse: 'Confused: your feet go the wrong way!' };
const M1_SAP = new WeakMap();   // a character's sapped strength (a shadow's touch)
function m1LP(q) { return typeof LocalPlayer !== 'undefined' && q instanceof LocalPlayer ? q : null; }
function m1St(lp) { return lp._m1 || (lp._m1 = { hold: 0, root: 0, sleep: 0, fear: 0, charm: 0, confuse: 0, by: null, from: null, engulf: null, rootDC: 12, jumpWas: false, struggleT: 0, acidT: 0, drainT: 0, sap: 0, sapT: 0, stenchOk: false }); }
function m1Chr(lp) { try { return typeof dndLive === 'function' ? dndLive(lp) : null; } catch (e) { return null; } }
function m1Name(m) { return String((m && m.T && m.T.label) || 'it').replace(/^an? /, 'the '); }
// a saving throw for a player at this screen (anyone else gets a coin toss)
function m1Save(q, ab, dc, adv) {
  const lp = m1LP(q); if (!lp) return Math.random() < 0.5;
  const c = m1Chr(lp), b = c && c.d && c.d.saves ? (c.d.saves[ab] || 0) : 1;
  const r1 = 1 + Math.floor(Math.random() * 20), r = adv ? Math.max(r1, 1 + Math.floor(Math.random() * 20)) : r1;
  return r === 20 || (r !== 1 && r + b >= dc);
}
// struggling free: the better of Strength (Athletics) and Dexterity (Acrobatics)
function m1Check(lp, dc) {
  const c = m1Chr(lp), mod = c && c.ab ? Math.max(dndMod(c.ab.str), dndMod(c.ab.dex)) + ((c.skills || []).some(s => s === 'athletics' || s === 'acrobatics') ? dndProf(c.level) : 0) : 2;
  return 1 + Math.floor(Math.random() * 20) + mod >= dc;
}
function m1Afflict(q, kind, t, o = {}) {
  const lp = m1LP(q); if (!lp || !(t > 0)) return false;
  const p = lp.player, g = lp.g;
  if (!p || p.dead || g.creative || p.downed > 0) return false;
  const c = m1Chr(lp), cd = (c && c.conds) || {}, sp = c && c.species;
  const say = (txt, col) => lp.floatText(p.x, p.y + 2.2, p.z, txt, col);
  if ((kind === 'hold' || kind === 'root' || kind === 'prone') && cd.freedom > 0) { say('Unhindered', '#9ad8ff'); return false; }
  if (kind === 'sleep' && (sp === 'elf' || cd.mind_blank > 0)) { say('Unsleeping', '#9ad8ff'); return false; }
  if (kind === 'charm' && cd.mind_blank > 0) { say('Unswayed', '#9ad8ff'); return false; }
  if (kind === 'fear' && (cd.heroism > 0 || cd.mind_blank > 0)) { say('Fearless', '#9ad8ff'); return false; }
  if (o.save) {
    const adv = (kind === 'charm' && sp === 'elf') || (kind === 'fear' && sp === 'halfling') || ((kind === 'charm' || kind === 'fear') && cd.protect_evil > 0) || cd.foresight > 0;
    if (m1Save(q, o.save[0], o.save[1], adv)) { say('Resisted', '#9ad8ff'); return false; }
  }
  const st = m1St(lp), L = M1_LABEL[kind] || [kind, '#ffffff'];
  const fresh = kind === 'engulf' ? !st.engulf : !(st[kind] > 0);
  if (kind === 'prone') { st.hold = Math.max(st.hold, t); if (lp.shake) lp.shake(0.25); }
  else if (kind === 'engulf') { st.engulf = o.by || null; st.acidT = 3; }
  else st[kind] = Math.max(st[kind] || 0, t);
  if (kind === 'charm') st.by = o.by || null;
  if (kind === 'fear') st.from = o.by || null;
  if (kind === 'root') st.rootDC = o.dc || 12;
  say(o.label || L[0], L[1]);
  if (fresh && M1_HINT[kind]) lp.toast(kind === 'charm' ? `${M1_HINT.charm} ${m1Name(o.by)}.` : M1_HINT[kind], 'warn');
  return true;
}
function m1Release(lp, st, eject) {
  const cube = st.engulf; st.engulf = null;
  if (!cube) return;
  cube.m1Held = null; if (cube.state === 'm1engulf') cube.state = 'idle';
  cube.m1EngulfCd = 4;
  if (!eject) return;
  const p = lp.player, w = lp.g.world, free = (x, z) => !T_SOLID[w.getBlock(Math.floor(x), Math.floor(p.y + 0.2), Math.floor(z))] && !T_SOLID[w.getBlock(Math.floor(x), Math.floor(p.y + 1.2), Math.floor(z))];
  const a0 = Math.random() * TAU, r = (cube.w || 0.9) + 0.8;
  for (let i = 0; i < 8; i++) { const a = a0 + i / 8 * TAU, x = cube.x + Math.cos(a) * r, z = cube.z + Math.sin(a) * r; if (free(x, z)) { p.x = x; p.z = z; break; } }
  p.vy = 4; p.fallStart = null;
  lp.g.burst(p.x, p.y + 1, p.z, 'slime_skin', 14, 1);
}
function m1Drain(q, n) {
  const lp = m1LP(q); if (!lp || !(n > 0)) return;
  const p = lp.player, cur = p._m1Drain || 0, full = p.maxHealth + cur;
  const next = Math.min(full - 1, cur + Math.round(n));
  if (next <= cur) return;
  const st = m1St(lp); if (!cur) lp.toast('Your life is drained: your hit point maximum is lowered until you rest.', 'warn');
  p._m1Drain = next; st.drainT = 0; p.recalcMax();
  lp.floatText(p.x, p.y + 2.4, p.z, `Max HP −${next - cur}`, '#8a6aff');
}
function m1Sap(q, n) {
  const lp = m1LP(q); if (!lp) return;
  const c = m1Chr(lp), st = m1St(lp), p = lp.player;
  const top = c && c.ab ? Math.max(0, (c.ab.str || 10) - 1) : 8;
  if (!(st.sap > 0)) lp.toast('A cold touch drains your strength: your blows are weaker for a while.', 'warn');
  st.sap = Math.min(top, (st.sap || 0) + n); st.sapT = 120;
  if (c) M1_SAP.set(c, st);
  lp.floatText(p.x, p.y + 2.4, p.z, `Strength −${n}`, '#b87aff');
  if (typeof dndHudDirty === 'function') dndHudDirty(lp);
}
// the screen shows it too: green murk inside a cube, a web's edges, a charmed rosy haze...
const M1_FX = {
  engulf: 'radial-gradient(ellipse at center, rgba(110,220,150,0.22) 25%, rgba(40,150,90,0.62) 100%)',
  root: 'radial-gradient(ellipse at center, rgba(255,255,255,0) 45%, rgba(235,235,235,0.55) 100%)',
  hold: 'radial-gradient(ellipse at center, rgba(240,220,120,0.08) 40%, rgba(200,170,60,0.45) 100%)',
  sleep: 'radial-gradient(ellipse at center, rgba(20,10,40,0.55) 20%, rgba(10,5,25,0.92) 100%)',
  fear: 'radial-gradient(ellipse at center, rgba(40,0,60,0) 35%, rgba(40,0,60,0.6) 100%)',
  charm: 'radial-gradient(ellipse at center, rgba(255,150,210,0.05) 35%, rgba(255,120,200,0.45) 100%)',
  confuse: 'radial-gradient(ellipse at center, rgba(200,80,255,0.05) 35%, rgba(170,60,240,0.42) 100%)',
};
function m1Overlay(lp, kind) {
  try {
    let el = lp._m1el;
    if (!kind) { if (el && el._k) { el.style.opacity = '0'; el._k = null; } return; }
    if (!lp.el) return;
    if (!el) { el = document.createElement('div'); el.style.cssText = 'position:absolute;inset:0;pointer-events:none;transition:opacity .3s;opacity:0;z-index:4'; lp.el.appendChild(el); lp._m1el = el; }
    if (el._k !== kind) { el.style.background = M1_FX[kind] || 'none'; el.style.opacity = '1'; el._k = kind; }
  } catch (e) { /* no screen to draw on */ }
}
// before the player moves: held fast, struggling, steered by fear or charm
function m1Control(lp, st, dt, inp) {
  const p = lp.player;
  if (p.dead || lp.g.creative) { if (st.engulf) m1Release(lp, st, false); st.hold = st.root = st.sleep = st.fear = st.charm = st.confuse = 0; return inp; }
  const jumpEdge = !!inp.jump && !st.jumpWas; st.jumpWas = !!inp.jump;
  if (st.hold > 0 || st.sleep > 0) {
    const b = InputManager.blankState();
    b.pause = inp.pause; b.chat = inp.chat; b.hideHud = inp.hideHud; b.screenshot = inp.screenshot;
    if (!(st.sleep > 0)) { b.lookX = inp.lookX; b.lookY = inp.lookY; }
    p.vx *= 0.6; p.vz *= 0.6;
    return b;
  }
  let out = inp;
  const own = () => (out === inp ? (out = Object.assign({}, inp)) : out);
  if (st.engulf || st.root > 0) {
    own(); out.mx = 0; out.mz = 0; out.jump = false; out.sprint = false; out.sneak = false;
    p.vx *= 0.5; p.vz *= 0.5;
    if (jumpEdge && st.struggleT <= 0) {
      st.struggleT = 0.4;
      if (m1Check(lp, st.engulf ? 12 : st.rootDC)) {
        const was = st.engulf; st.root = 0; if (was) m1Release(lp, st, true);
        lp.floatText(p.x, p.y + 2.2, p.z, 'Broke free!', '#b8ffb0');
        if (!was) lp.g.burst(p.x, p.y + 0.6, p.z, 'cobweb', 10, 0.8);
      } else lp.floatText(p.x, p.y + 2.2, p.z, 'Struggling…', '#d0d0d0');
    }
  }
  const fearOf = st.fear > 0 && st.from && st.from.alive && !st.from.remove ? st.from : null;
  const charmBy = st.charm > 0 && st.by && st.by.alive && !st.by.remove ? st.by : null;
  if ((fearOf || charmBy) && !st.engulf && !(st.root > 0)) {
    own();
    const s = Math.sin(p.yaw), co = Math.cos(p.yaw), fx = -s, fz = -co, rx = co, rz = -s;
    let wx = rx * out.mx - fx * out.mz, wz = rz * out.mx - fz * out.mz;
    if (fearOf) { const dx = fearOf.x - p.x, dz = fearOf.z - p.z, l = Math.hypot(dx, dz) || 1, d = (wx * dx + wz * dz) / l; if (d > 0) { wx -= dx / l * d; wz -= dz / l * d; } }
    if (charmBy) { const dx = charmBy.x - p.x, dz = charmBy.z - p.z, l = Math.hypot(dx, dz) || 1; if (l > 2.2) { wx += dx / l * 0.5; wz += dz / l * 0.5; } }
    out.mx = clamp(wx * rx + wz * rz, -1, 1); out.mz = clamp(-(wx * fx + wz * fz), -1, 1);
  }
  if (st.confuse > 0) { own(); out.mx = -out.mx; out.mz = -out.mz; }
  return out;
}
// after: the clocks, the cube's acid, the lingering drains, the screen
function m1After(lp, st, dt) {
  const p = lp.player, g = lp.g;
  for (const k of ['hold', 'root', 'sleep', 'fear', 'charm', 'confuse', 'struggleT']) if (st[k] > 0) st[k] -= dt;
  if (p.dead) { if (st.engulf) m1Release(lp, st, false); st.hold = st.root = st.sleep = st.fear = st.charm = st.confuse = 0; st.stenchOk = false; if (p._m1Drain) { p._m1Drain = 0; p.recalcMax(); } st.sap = 0; }
  if (st.engulf) {
    const cube = st.engulf;
    if (!cube.alive || cube.remove || Math.hypot(cube.x - p.x, cube.z - p.z) > 4 || Math.abs(cube.y - p.y) > 4 || g.creative) m1Release(lp, st, false);
    else {
      p.x = cube.x; p.z = cube.z; p.y = cube.y + 0.3; p.vx = p.vz = 0; p.vy = 0; p.fallStart = null;
      if (Math.random() < dt * 8) spellSpark(g, p.x + (Math.random() - 0.5) * 1.4, p.y + Math.random() * 1.6, p.z + (Math.random() - 0.5) * 1.4, 'gelatinous_cube_top', { vy: 0.8, life: 0.8, size: 0.06 });
      st.acidT -= dt;
      if (st.acidT <= 0) { st.acidT = 3; lp.hurt(cube.T.damage, { type: 'magic', attacker: cube, element: 'acid', knock: 0 }); }
    }
  }
  if (st.root > 0 && Math.random() < dt * 5) spellSpark(g, p.x + (Math.random() - 0.5) * 0.9, p.y + Math.random() * 1.2, p.z + (Math.random() - 0.5) * 0.9, 'cobweb', { life: 0.5, size: 0.18 });
  if (st.hold > 0 && Math.random() < dt * 6) spellSpark(g, p.x + (Math.random() - 0.5) * 0.8, p.y + Math.random() * 1.8, p.z + (Math.random() - 0.5) * 0.8, 'mana_light', { life: 0.5, size: 0.05 });
  if (st.sleep > 0 && Math.random() < dt * 2) spellSpark(g, p.x, p.y + 2, p.z, 'mana_arcane', { vy: 0.6, life: 1.2, size: 0.07 });
  if ((st.charm > 0 || st.confuse > 0) && Math.random() < dt * 4) spellSpark(g, p.x + (Math.random() - 0.5), p.y + 1.6 + Math.random() * 0.5, p.z + (Math.random() - 0.5), 'mana_arcane', { vy: 0.3, life: 0.7, size: 0.05 });
  // life drained comes back slowly, or all at once after sleeping in a bed
  if (p._m1Drain > 0) { st.drainT += dt; if (lp.sleeping) { p._m1Drain = 0; p.recalcMax(); lp.toast('Rested, you feel whole again.', 'good'); } else if (st.drainT > 30) { st.drainT = 0; p._m1Drain--; p.recalcMax(); } }
  if (st.sap > 0) { st.sapT -= dt; if (st.sapT <= 0 || lp.sleeping) { st.sap = 0; lp.toast('Your strength returns.', 'good'); if (typeof dndHudDirty === 'function') dndHudDirty(lp); } }
  m1Overlay(lp, st.engulf ? 'engulf' : st.sleep > 0 ? 'sleep' : st.hold > 0 ? 'hold' : st.root > 0 ? 'root' : st.charm > 0 ? 'charm' : st.fear > 0 ? 'fear' : st.confuse > 0 ? 'confuse' : null);
}
{
  const baseUpd = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const st = this._m1;
    if (st && inp && this.mode === 'play') { try { inp = m1Control(this, st, dt, inp); } catch (e) { console.warn('m1 control', e); this._m1 = null; } }
    const r = baseUpd.call(this, dt, inp);
    if (this._m1) { try { m1After(this, this._m1, dt); } catch (e) { console.warn('m1 after', e); this._m1 = null; } }
    return r;
  };
  // a blow wakes a sleeper; a sprite's arrow carries sleep, a wight's carries the grave's chill
  const baseHurt = LocalPlayer.prototype.hurt;
  LocalPlayer.prototype.hurt = function (amount, src = {}) {
    const p = this.player, before = p ? p.health : 0;
    const r = baseHurt.call(this, amount, src);
    try {
      const st = this._m1;
      if (p && p.health < before && !p.dead) {
        if (st && st.sleep > 0) { st.sleep = 0; this.floatText(p.x, p.y + 2.2, p.z, 'Awake!', '#ffffff'); }
        const a = src.attacker;
        if (a && a.T && a.T.m1Shot && src.type === 'arrow') {
          if (a.T.m1Shot === 'sprite') m1Afflict(this, 'sleep', 3, { save: ['con', 10] });
          else if (a.T.m1Shot === 'wight') { spellFx(this.g, p.x, p.y + 1.2, p.z, 'mana_arcane', 10, 0.8, { life: 0.5 }); if (!m1Save(this, 'con', 13)) m1Drain(this, 2); }
        }
      }
    } catch (e) { console.warn('m1 hurt', e); }
    return r;
  };
  // charmed, you can't bring yourself to strike the one who charmed you
  const baseAtk = LocalPlayer.prototype.attackEntity;
  LocalPlayer.prototype.attackEntity = function (e) {
    const st = this._m1;
    if (st && st.charm > 0 && e && e === st.by) { if (!this._m1charmMsgT || this.g.time - this._m1charmMsgT > 2) { this._m1charmMsgT = this.g.time; this.floatText(e.x, e.y + e.h + 0.3, e.z, 'Charmed: you can\'t', '#ff9ad8'); } this.swingArm && this.swingArm(); return; }
    return baseAtk.call(this, e);
  };
  // drained life lowers the most hit points you can have
  const baseMax = Player.prototype.recalcMax;
  Player.prototype.recalcMax = function () {
    const r = baseMax.call(this);
    if (this._m1Drain > 0) { this.maxHealth = Math.max(1, this.maxHealth - this._m1Drain); if (this.health > this.maxHealth) this.health = this.maxHealth; }
    return r;
  };
  // sapped strength weakens blows that lean on it
  if (typeof dndWeaponAttack === 'function') {
    const baseWA = dndWeaponAttack;
    dndWeaponAttack = function (c, W) {
      const A = baseWA(c, W);
      try {
        const st = c && M1_SAP.get(c);
        if (st && st.sap > 0 && A && W && !W.ranged && c.ab) {
          const str = dndMod(c.ab.str), str2 = dndMod(c.ab.str - st.sap), dex = dndMod(c.ab.dex), fin = (W.props || []).includes('finesse');
          if (A.ab === str && !(fin && dex >= str)) { const d = str - (fin ? Math.max(str2, dex) : str2); A.toHit -= d; A.dmg -= d; A.ab -= d; }
        }
      } catch (e) { /* leave the blow as it was */ }
      return A;
    };
  }
}

// ---- their bodies in the world: unseen, glowing, passing through walls ---------------------------------------
function m1Lit(m) { const l = m.lightAt(1); return Math.max(l[1], Math.round(l[0] * clamp(((m.game.env && m.game.env.day) || 0) * 1.4, 0, 1))); }
function m1Vis(m, viewer) {
  if (m.deathTime > 0) return 1;
  let a = 1;
  const st = m.state;
  if (st === 'm1hide') a = 0.22;
  else if (st === 'm1invis') a = 0.08 + 0.05 * Math.sin((m.age || 0) * 9);
  if (m.T.m1 === 'shadow' && !(m.attackCd > 0.6)) { const lit = m1Lit(m); if (lit < 9) a = Math.min(a, 0.16 + lit * 0.05); }
  if (a < 1 && viewer) { const c = typeof dndOf === 'function' ? dndOf(viewer.player || viewer) : null; if (c && c.conds && (c.conds.see_invis > 0 || c.conds.true_seeing > 0)) a = Math.max(a, 0.6); }
  return a;
}
function m1Poof(m) {
  const g = m.game; m.remove = true;
  g.burst(m.x, m.y + m.h / 2, m.z, 'smoke', 16, 0.8);
  if (typeof spellFx === 'function') spellFx(g, m.x, m.y + m.h / 2, m.z, 'mana_heal', 12, 1.2, { life: 0.5 });
  g.sfx.playAt('fizz', m.x, m.y + 1, m.z);
}
{
  const baseDraws = Mob.prototype.draws;
  Mob.prototype.draws = function (out, viewer) {
    if (!this.T || !this.T.m1) return baseDraws.call(this, out, viewer);
    const a = m1Vis(this, viewer);
    if (a >= 0.999) return baseDraws.call(this, out, viewer);
    if (a <= 0.01) return;
    const n = out.length, r = baseDraws.call(this, out, viewer);
    for (let i = n; i < out.length; i++) { const d = out[i]; d.alpha = Math.min(d.alpha ?? 1, a); d.noCull = true; }
    return r;
  };
  // the restless dead glow in the dark, and you can see through them (parts marked ghostA)
  {
    const inner = Mob.prototype.draws;
    Mob.prototype.draws = function (out, viewer) {
      const n = out.length, r = inner.call(this, out, viewer);
      if (!this.T || !this.T.m1Ghost || out.length === n) return r;
      const M = typeof MODELS !== 'undefined' && MODELS[this.T.model];
      if (!M) return r;
      const map = M._m1mm || (M._m1mm = new Map(M.parts.map(p => [p.mesh, p])));
      for (let i = n; i < out.length; i++) { const d = out[i], part = map.get(d.mesh); if (part && part.ghostA) { d.alpha = Math.min(d.alpha ?? 1, part.ghostA); d.noCull = true; } }
      return r;
    };
  }
  const baseGlow = Mob.prototype.glow;
  Mob.prototype.glow = function (out) {
    if (baseGlow) baseGlow.call(this, out);
    const G = this.T && this.T.m1Glow;
    if (!G || this.deathTime > 0 || this.state === 'm1invis') return;
    out.push({ x: this.x, y: this.y + this.h * G[1], z: this.z, size: G[2] * (1 + 0.08 * Math.sin((this.age || 0) * 6)), uv: tileUV(ATLAS.tile[G[0]] ?? ATLAS.tile.white), light: 0xFF });
  };
  // the incorporeal pass through stone
  const baseMove = moveEntity;
  moveEntity = function (world, e, dt) {
    if (e.m1Phase && !e.ghost) { e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; e.onGround = false; e.hitWall = false; e.hitCeiling = false; return; }
    return baseMove(world, e, dt);
  };
  // fire burns the trees twice over, poison does nothing to the dead; an illusion is gone at a touch;
  // the captain parries, the goblin boss pulls a goblin into the way, a hobgoblin takes it on the shield
  const baseHurt = Mob.prototype.hurt;
  Mob.prototype.hurt = function (amount, src = {}) {
    const T = this.T;
    if (!T || !T.m1 || this.ghost || !this.alive) return baseHurt.call(this, amount, src);
    if (this.m1Illusion) { m1Poof(this); const a = src.attacker; if (a && a.floatText) a.floatText(this.x, this.y + this.h + 0.3, this.z, 'Only an illusion!', '#9affc0'); return 0; }
    if (!src.dnd && (src.type === 'burn' || src.type === 'lava')) { if (T.vulnerable && T.vulnerable.includes('fire')) amount *= 2; else if (T.resist && T.resist.includes('fire')) amount *= 0.5; }
    if (src.type === 'poison' && T.immune && T.immune.includes('poison')) return 0;
    const a = src.attacker;
    const melee = a && !src.type && src.tool !== 'arrow' && (m1LP(a) || typeof a.send === 'function');
    const def = melee && M1_DEF[T.m1];
    if (def) { const r = def.call(this, amount, src, a); if (r <= 0) return 0; amount = r; }
    const dealt = baseHurt.call(this, amount, src);
    if (dealt > 0) { this.m1Awake = true; if (this.state === 'm1hide' || this.state === 'm1still') this.state = 'idle'; this.huntT = Math.max(this.huntT || 0, 8); }
    return dealt;
  };
  const baseDie = Mob.prototype.die;
  Mob.prototype.die = function (src) {
    if (this.m1Illusion) { m1Poof(this); this.deathTime = 0.0001; return; }
    return baseDie.call(this, src);
  };
}
const M1_DEF = {
  bandit_captain(amount, src, a) {
    if ((this.m1ParryT || 0) > this.age || Math.random() > 0.3) return amount;
    this.m1ParryT = this.age + 3; this.swingT = 0.3;
    if (a.floatText) a.floatText(this.x, this.y + this.h + 0.3, this.z, 'Parried!', '#e0e0ff');
    spellFx(this.game, this.x - Math.sin(this.yaw) * 0.5, this.y + 1.3, this.z - Math.cos(this.yaw) * 0.5, 'mana_light', 10, 1.5, { life: 0.25, size: 0.05 });
    this.game.sfx.playAt('hit', this.x, this.y + 1, this.z);
    return 0;
  },
  goblin_boss(amount, src, a) {
    if ((this.m1RedirT || 0) > this.age || Math.random() > 0.5) return amount;
    let best = null, bd = 2.6;
    for (const e of this.game.entities) if (e !== this && e instanceof Mob && e.alive && e.T && e.T.m1 === 'goblin' && !e.m1Illusion) { const d = Math.hypot(e.x - this.x, e.z - this.z); if (d < bd) { bd = d; best = e; } }
    if (!best) return amount;
    this.m1RedirT = this.age + 4;
    const bx = best.x, bz = best.z; best.x = this.x; best.z = this.z; this.x = bx; this.z = bz;
    if (a.floatText) a.floatText(best.x, best.y + best.h + 0.3, best.z, 'Redirected!', '#c8ff80');
    best.hurt(amount, src);
    return 0;
  },
  hobgoblin(amount, src, a) {
    // the shield turns a blow from the front now and then
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), dx = a.x - this.x, dz = a.z - this.z, l = Math.hypot(dx, dz) || 1;
    if ((fx * dx + fz * dz) / l < 0.5 || Math.random() > 0.2 || (this.lost && this.lost.has('foreL'))) return amount;
    if (a.floatText) a.floatText(this.x, this.y + this.h + 0.3, this.z, 'Blocked!', '#e0e0ff');
    this.game.sfx.playAt('hit', this.x, this.y + 1, this.z);
    return 0;
  },
};

// ---- shared know-how ------------------------------------------------------------------------------------------
// webs, thrown daggers and rocks, darts of dust: a little flying thing that does something where it lands
class M1Shot extends Entity {
  constructor(game, x, y, z, vx, vy, vz, owner, o) { super(game, x, y, z); this.netLocalOnly = true; this.vx = vx; this.vy = vy; this.vz = vz; this.owner = owner; this.o = o; this.w = this.h = 0.15; this.spin = Math.random() * 6; }
  update(dt) {
    const g = this.game, w = g.world, o = this.o;
    this.age += dt;
    if (this.age > (o.life || 5)) { this.remove = true; return; }
    const r = o.r || 0.45;
    for (let s = 0; s < 3; s++) {
      const h = dt / 3; this.vy -= (o.grav ?? 12) * h;
      this.x += this.vx * h; this.y += this.vy * h; this.z += this.vz * h;
      for (const q of g.pawns()) if (!q.dead && Math.abs(q.x - this.x) < r && Math.abs(q.z - this.z) < r && this.y > q.y - 0.2 && this.y < q.y + 1.9) return this.land(q);
      if (T_SOLID[w.getBlock(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z))]) return this.land(null);
    }
    if (o.trail && Math.random() < dt * 40) spellSpark(g, this.x, this.y, this.z, o.trail, { life: 0.4, size: 0.08 });
  }
  land(q) { this.remove = true; try { if (this.o.hit) this.o.hit(q, this); } catch (e) { console.warn('m1 shot', e); } }
  draws(out) {
    if (!this.o.item || !this.game.renderer) return;
    const im = itemMesh(this.game.renderer.gl, this.o.item), m = Mat4.create(), s = this.o.size || 0.5;
    Mat4.rotateY(m, this.spin + this.age * 6); Mat4.rotateX(m, this.age * 4); Mat4.scale(m, s, s, s);
    out.push({ mesh: im.mesh, m, px: this.x, py: this.y, pz: this.z, light: this.lightAt(0), noCull: im.kind !== 'block' });
  }
  glow(out) { if (this.o.glow) out.push({ x: this.x, y: this.y, z: this.z, size: this.o.gsize || 0.4, uv: tileUV(ATLAS.tile[this.o.glow] ?? ATLAS.tile.white), light: 0xFF }); }
}
const MV = (want, dir) => ({ want, dir });
Object.assign(Mob.prototype, {
  m1Sense(dt, p, dist, dyp, range) {
    if (this.m1Rally > 0) this.m1Rally -= dt;
    const s = this.senses(p, dist, dyp, dt, range);
    if (this.state !== 'm1hide' && this.state !== 'm1invis') this.voiceTick(dt, dist);
    return s;
  },
  m1Idle(dt, k = 1) { this.wander(dt); const m = this.wanderMove(); m.want *= k; return m; },
  // how many of its own kind (or the kinds named) are within r of q
  m1Near(q, r, kinds) {
    if (!q) return 0;
    let n = 0;
    for (const e of this.game.entities) {
      if (e === this || !(e instanceof Mob) || !e.alive || e.m1Illusion || !e.T) continue;
      if (!(kinds ? kinds.includes(e.T.m1) : e.T.m1 === this.T.m1)) continue;
      if (Math.abs(e.x - q.x) < r && Math.abs(e.z - q.z) < r && Math.hypot(e.x - q.x, e.z - q.z) < r) n++;
    }
    return n;
  },
  m1Alert(kinds, r) { for (const e of this.game.entities) if (e !== this && e instanceof Mob && e.alive && e.T && (kinds.includes(e.T.m1) || kinds.includes(e.type)) && Math.hypot(e.x - this.x, e.z - this.z) < r) { e.huntT = Math.max(e.huntT || 0, 15); e.alertT = Math.max(e.alertT || 0, 8); e.m1Awake = true; if (e.type === 'spider' || e.type === 'cave_spider') e.panicT = Math.max(e.panicT || 0, 8); } },
  m1Shout(lines) {
    const line = lines[Math.floor(Math.random() * lines.length)], who = m1Name(this);
    for (const l of this.game.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 24) l.toast(`${who[0].toUpperCase() + who.slice(1)}: “${line}”`, '');
    if (this.T.voice) this.game.sfx.playAt(this.T.voice + '_angry', this.x, this.y + this.h * 0.8, this.z);
  },
  // a blow that lands: damage of a kind, a push, and whatever else it carries (o.fx)
  m1Hit(q, dmg, o = {}) {
    if (!q || q.dead || q.alive === false) return false;
    const lp = m1LP(q), before = lp ? lp.player.health : 0;
    const d = Math.max(1, Math.round(dmg + (this.m1Rally > 0 ? 1 : 0)));
    q.hurt(d, { type: 'mob', attacker: this, knock: o.knock ?? 2, element: o.element });
    const landed = lp ? lp.player.health < before : true;
    if (landed && o.fx) { try { o.fx.call(this, q, lp); } catch (e) { console.warn('m1 fx', e); } }
    return landed;
  },
  // swing at q if it's in reach: at once, or after a wind-up you can see coming (o.wind seconds)
  m1Swing(q, dist, dyp, o) {
    if (!q || this.m1Wind || this.attackCd > 0) return false;
    if (dist > (o.reach ?? 1.35) + this.w || Math.abs(dyp) > (o.dy ?? 1.8)) return false;
    if (o.wind) { this.m1Wind = { t: o.wind, o, p: q }; return true; }
    this.attackCd = o.cd ?? 1.2; this.swingT = 0.3;
    this.m1Hit(q, o.dmg, o);
    if (o.after) o.after.call(this, q);
    return true;
  },
  m1WindTick(dt) {
    const W = this.m1Wind; if (!W) return false;
    W.t -= dt;
    if (W.t > 0) return true;
    this.m1Wind = null; this.attackCd = W.o.cd ?? 1.6; this.swingT = 0.3;
    const q = W.p;
    if (W.o.release) W.o.release.call(this, q);
    else if (q && !q.dead && Math.hypot(q.x - this.x, q.z - this.z) <= (W.o.reach ?? 1.35) + this.w + 0.5 && Math.abs(q.y - this.y) < (W.o.dy ?? 1.8) + 0.5) this.m1Hit(q, W.o.dmg, W.o);
    if (W.o.after) W.o.after.call(this, q);
    return true;
  },
  // the second blow of a pair
  m1ComboTick(dt, q, dist, dyp, o) {
    if (!(this.m1Combo > 0)) return;
    this.m1ComboT -= dt; if (this.m1ComboT > 0) return;
    this.m1Combo--; this.m1ComboT = 0.65; this.swingT = 0.3;
    if (q && dist <= (o.reach ?? 1.35) + this.w + 0.4 && Math.abs(dyp) < (o.dy ?? 2)) this.m1Hit(q, o.dmg, o);
  },
  // height above the ground beneath it
  m1Floor(maxD = 8) {
    const w = this.game.world, x = Math.floor(this.x), z = Math.floor(this.z), y0 = Math.floor(this.y);
    for (let k = 0; k <= maxD; k++) if (T_SOLID[w.getBlock(x, y0 - k - 1, z)]) return this.y - (y0 - k);
    return maxD + 1;
  },
  m1Sun() { const g = this.game; return g.dim === 0 && g.env && g.env.day > 0.55 && this.lightAt(1)[0] >= 12; },
  // an arrow at q that lands for about dmg
  m1Arrow(q, dmg) {
    if (!q) return;
    const g = this.game, sp = 22, s = this.h < 1 ? 0.3 : 1;
    const ex = this.x - Math.sin(this.yaw) * 0.4 * s, ey = this.y + this.h * 0.75, ez = this.z - Math.cos(this.yaw) * 0.4 * s;
    const tx = q.x - ex, tz = q.z - ez, hd = Math.hypot(tx, tz), t = hd / sp;
    const ty = q.y + 1.2 - ey + 0.5 * 20 * t * t, l = Math.hypot(tx, ty, tz) || 1, j = () => (Math.random() - 0.5) * 0.04;
    g.addEntity(new Arrow(g, ex, ey, ez, (tx / l + j()) * sp, (ty / l + j()) * sp, (tz / l + j()) * sp, this, dmg * 30 / sp * 1.1, false));
    g.sfx.playAt('bow', ex, ey, ez);
    this.swingT = 0.3;
  },
  // keep a bow's distance, strafing, loosing now and then
  m1Archer(dt, p, dist, toPlayer, o) {
    this.shootT = (this.shootT ?? 1 + Math.random()) - dt;
    const sees = !!this._sees;
    this.aiming = sees && dist < (o.range || 16);
    if (this.aiming && this.shootT <= 0) { this.shootT = (o.every || 1.6) + Math.random(); this.m1Arrow(p, o.dmg); if (o.after) o.after.call(this); }
    this.strafeT = (this.strafeT || 0) - dt;
    if (this.strafeT <= 0) { this.strafeT = 1.5 + Math.random() * 2; this.strafe = Math.random() < 0.5 ? -1 : 1; }
    if (!sees || dist > (o.far || 11)) return MV(this.T.speed, (o.fly ? null : this.navDir(p.x, p.y, p.z, dt)) ?? toPlayer);
    if (dist < (o.near || 5)) return MV(this.T.speed * 0.9, toPlayer + Math.PI + this.strafe * 0.4);
    return MV(this.T.speed * 0.45, toPlayer + this.strafe * Math.PI / 2);
  },
  // throw something on an arc at q
  m1Lob(q, sp, grav, o) {
    if (!q) return null;
    const g = this.game, ex = this.x - Math.sin(this.yaw) * (this.w + 0.2), ey = this.y + this.h * (o.hand ?? 0.8), ez = this.z - Math.cos(this.yaw) * (this.w + 0.2);
    const tx = q.x - ex, tz = q.z - ez, hd = Math.hypot(tx, tz) || 1, t = hd / sp;
    const vy = ((q.y + 1) - ey) / t + 0.5 * grav * t;
    return g.addEntity(new M1Shot(g, ex, ey, ez, tx / hd * sp, vy, tz / hd * sp, this, Object.assign({ grav }, o)));
  },
  // a web that holds whoever it strikes
  m1Web(q, dc, t = 4) {
    this.game.sfx.playAt('shear', this.x, this.y + 0.6, this.z);
    this.m1Lob(q, 15, 10, { item: 'cobweb', size: 0.75, r: 0.6, hand: 0.5, hit: (who, sh) => { sh.game.burst(sh.x, sh.y, sh.z, 'cobweb', 14, 1); if (who) m1Afflict(who, 'root', t, { save: ['dex', dc], dc: dc - 1, label: 'Webbed!' }); } });
  },
  // a spell's wind-up (hands raised), then what it does
  m1Cast(t, fn) { this.m1CastT = t; this.m1CastDone = fn; this.state = 'm1cast'; },
  m1CastTick(dt, p) {
    if (!(this.m1CastT > 0)) return false;
    this.m1CastT -= dt;
    if (Math.random() < dt * 20) spellSpark(this.game, this.x + (Math.random() - 0.5) * 0.8, this.y + this.h * (0.6 + Math.random() * 0.5), this.z + (Math.random() - 0.5) * 0.8, this.T.m1CastFx || 'mana_arcane', { vy: 0.8, life: 0.5, size: 0.06 });
    if (this.m1CastT <= 0) { this.state = 'idle'; const f = this.m1CastDone; this.m1CastDone = null; if (f) { try { f.call(this, p); } catch (e) { console.warn('m1 cast', e); } } }
    return true;
  },
  m1Flinched() { const h = this.hurtTime > 0; const f = h && !this.m1Flinch; this.m1Flinch = h; return f; },
});

// ---- what each one does ------------------------------------------------------------------------------------
{
  const AI = MONSTER_AI;
  const GOBLINS = ['goblin', 'goblin_boss', 'hobgoblin', 'bugbear', 'worg'];

  // giant rats: a swarm that nips in from all sides (Pack Tactics), and scatters when alone and hurt
  AI.giant_rat = function (dt, p, dist, dyp, toPlayer) {
    const s = this.m1Sense(dt, p, dist, dyp, 16);
    if (!s.hunting) return this.m1Idle(dt, 0.9);
    const pack = this.m1Near(p, 3) > 0;
    if (this.health < this.maxHealth * 0.4 && !pack) return MV(this.T.speed * 1.15, toPlayer + Math.PI + Math.sin(this.age * 3) * 0.5);
    this.m1Swing(p, dist, dyp, { dmg: this.T.damage + (pack ? 1 : 0), cd: 1.0, knock: 1 });
    const c = this.chase(p, dist, toPlayer, dt); if (dist > 2.5) c.dir += Math.sin(this.age * 7 + this.id) * 0.35;
    return c;
  };

  // bandits: a shout, the band closes in; a few have bows; they run when it goes badly, unless the captain watches
  AI.bandit = function (dt, p, dist, dyp, toPlayer) {
    if (this.m1Init !== 1) { this.m1Init = 1; if (this.T.m1 === 'bandit' && Math.random() < 0.25) this.heldItem = 'bow'; }
    const s = this.m1Sense(dt, p, dist, dyp, 22);
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    if (!s.hunting) {
      this.aiming = false;
      const lead = this.leader && this.leader.alive && !this.leader.remove ? this.leader : null;
      if (lead && Math.hypot(lead.x - this.x, lead.z - this.z) > 5) return MV(this.T.speed * 0.7, this.navDir(lead.x, lead.y, lead.z, dt) ?? Math.atan2(this.x - lead.x, this.z - lead.z));
      return this.m1Idle(dt);
    }
    if (s.sees && !this.m1Yelled) { this.m1Yelled = true; this.m1Shout(['Stand and deliver!', 'Your coin or your life!', 'Get them, lads!']); this.m1Alert(['bandit', 'bandit_captain'], 20); }
    if (this.health < this.maxHealth * 0.3 && !this.m1Near(this, 12, ['bandit_captain'])) { this.aiming = false; return MV(this.T.speed * 1.1, toPlayer + Math.PI + Math.sin(this.age) * 0.4); }
    if (this.heldItem === 'bow') return this.m1Archer(dt, p, dist, toPlayer, { dmg: 5 });
    this.aiming = false;
    this.m1Swing(p, dist, dyp, { dmg: this.T.damage, cd: 1.2 });
    return this.chase(p, dist, toPlayer, dt, this.m1Rally > 0 ? 1.15 : 1);
  };

  // the captain: blade then dagger, a thrown knife for the cautious, a parry (M1_DEF), and a rallying cry
  AI.bandit_captain = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game;
    if (this.m1Init !== 1) { this.m1Init = 1; if (!this.offItem) this.offItem = 'dagger'; }
    const s = this.m1Sense(dt, p, dist, dyp, 24);
    this.m1ComboTick(dt, p, dist, dyp, { dmg: this.T.damage - 2, knock: 1.5 });
    if (!s.hunting) return this.m1Idle(dt, 0.8);
    if (s.sees && !this.m1Yelled) { this.m1Yelled = true; this.m1Shout(['Nobody walks this road for free.', 'Take them — and everything they carry!']); this.m1Alert(['bandit'], 24); }
    if (this.health < this.maxHealth * 0.5 && !this.m1Rallied) {
      this.m1Rallied = true; this.m1Shout(['To me, lads! Cut them down!']);
      for (const e of g.entities) if (e instanceof Mob && e.alive && e.T && e.T.m1 === 'bandit' && Math.hypot(e.x - this.x, e.z - this.z) < 18) { e.m1Rally = 12; e.huntT = 15; spellFx(g, e.x, e.y + 2.2, e.z, 'mana_fire', 8, 0.6, { life: 0.5 }); }
    }
    this.m1ThrowT = (this.m1ThrowT ?? 3) - dt;
    if (s.sees && dist > 4 && dist < 12 && this.m1ThrowT <= 0) {
      this.m1ThrowT = 4 + Math.random() * 2; this.swingT = 0.3;
      this.m1Lob(p, 16, 14, { item: 'dagger', size: 0.45, r: 0.5, hit: (q, sh) => { if (q) sh.owner.m1Hit(q, 5, { knock: 1 }); } });
    }
    if (this.attackCd <= 0 && dist < 1.4 + this.w && Math.abs(dyp) < 1.8) { this.attackCd = 2.1; this.swingT = 0.3; this.m1Hit(p, this.T.damage, { knock: 2 }); this.m1Combo = 1; this.m1ComboT = 0.65; }
    return this.chase(p, dist, toPlayer, dt);
  };

  // goblins: Nimble Escape — a blow, then a dart back out of reach; now and then they melt into hiding and strike from it
  AI.goblin = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game;
    if (this.m1Init !== 1) { this.m1Init = 1; if (this.T.m1 === 'goblin' && Math.random() < 0.35) this.heldItem = 'bow'; }
    const s = this.m1Sense(dt, p, dist, dyp, 22);
    if (this.m1HideT > 0) { this.m1HideT -= dt; if (this.m1HideT <= 0 && this.state === 'm1hide') this.state = 'idle'; }
    if (this.m1Flinched() && Math.random() < 0.35) { this.m1DartT = 0.6; this.m1DartS = (Math.random() < 0.5 ? -1 : 1) * 0.7; this.state = 'm1hide'; this.m1HideT = 2; }
    if (!s.hunting) { this.aiming = false; return this.m1Idle(dt); }
    if (s.sees && !this.m1Yelled) { this.m1Yelled = true; g.sfx.playAt(this.T.voice + '_angry', this.x, this.y + 1, this.z); this.m1Alert(GOBLINS, 16); }
    if (this.m1DartT > 0) { this.m1DartT -= dt; return MV(this.T.speed * 1.3, toPlayer + Math.PI + (this.m1DartS || 0.5)); }
    const hidden = this.state === 'm1hide';
    if (this.heldItem === 'bow') return this.m1Archer(dt, p, dist, toPlayer, { dmg: 5, near: 5, far: 12, after() { if (this.state === 'm1hide') this.state = 'idle'; else if (Math.random() < 0.3) { this.state = 'm1hide'; this.m1HideT = 2.5; } } });
    this.aiming = false;
    if (this.m1Swing(p, dist, dyp, { dmg: this.T.damage + (hidden ? 3 : 0), cd: 1.1 })) {
      if (hidden) this.state = 'idle';
      this.m1DartT = 0.55; this.m1DartS = (Math.random() < 0.5 ? -1 : 1) * 0.6;
      if (Math.random() < 0.25) { this.state = 'm1hide'; this.m1HideT = 2; }
    }
    return this.chase(p, dist, toPlayer, dt, hidden ? 0.8 : 1);
  };

  // the goblin boss: two quick cuts, shouts the warren to arms, and pulls a goblin into the way of your blade (M1_DEF)
  AI.goblin_boss = function (dt, p, dist, dyp, toPlayer) {
    const s = this.m1Sense(dt, p, dist, dyp, 24);
    this.m1ComboTick(dt, p, dist, dyp, { dmg: this.T.damage });
    if (!s.hunting) return this.m1Idle(dt, 0.8);
    if (s.sees && !this.m1Yelled) { this.m1Yelled = true; this.m1Shout(['Shiny things for whoever brings me their head!', 'Kill \'em! KILL \'EM!']); this.m1Alert(GOBLINS, 24); }
    if (this.attackCd <= 0 && dist < 1.4 + this.w && Math.abs(dyp) < 1.8) { this.attackCd = 2.0; this.swingT = 0.3; this.m1Hit(p, this.T.damage); this.m1Combo = 1; this.m1ComboT = 0.65; }
    return this.chase(p, dist, toPlayer, dt);
  };

  // hobgoblins: drilled soldiers; they hit hardest beside a comrade (Pack Tactics) and keep a shield up (M1_DEF)
  AI.hobgoblin = function (dt, p, dist, dyp, toPlayer) {
    const s = this.m1Sense(dt, p, dist, dyp, 24);
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    if (!s.hunting) return this.m1Idle(dt, 0.7);
    if (s.sees && !this.m1Yelled) { this.m1Yelled = true; this.m1Alert(GOBLINS, 18); }
    const pack = this.m1Near(p, 2.6, ['hobgoblin', 'goblin', 'goblin_boss', 'bugbear']) > 0;
    this.m1Swing(p, dist, dyp, { dmg: this.T.damage + (pack ? 3 : 0), cd: 1.3, knock: 2.5 });
    return this.chase(p, dist, toPlayer, dt);
  };

  // bugbears: unseen until too late — it creeps up hidden and opens with a crushing ambush (+2d6), long-armed, and grabs
  AI.bugbear = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game;
    if (this.m1Init !== 1) { this.m1Init = 1; this.state = 'm1hide'; }
    const s = this.senses(p, dist, dyp, dt, 22);
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    const stalking = this.state === 'm1hide';
    if (!s.hunting) { if (!stalking && this.age - (this.m1SeenT ?? -99) > 6) this.state = 'm1hide'; return this.m1Idle(dt, 0.5); }
    this.m1SeenT = this.age;
    const grab = (q) => m1Afflict(q, 'root', 1.4, { dc: 12, label: 'Grabbed!' });
    if (stalking) {
      if (dist < 2.4 + this.w && Math.abs(dyp) < 2 && this.attackCd <= 0) {
        this.state = 'idle';
        this.m1Swing(p, dist, dyp, { dmg: this.T.damage + 7, wind: 0.35, cd: 1.6, reach: 2.4, knock: 4, fx(q) { grab(q); g.sfx.playAt('bear_angry', this.x, this.y + 2, this.z); } });
        return MV(0, toPlayer);
      }
      return MV(this.T.speed * 0.75, (dist > 2.2 ? this.navDir(p.x, p.y, p.z, dt) : null) ?? toPlayer);
    }
    this.voiceTick(dt, dist);
    this.m1Swing(p, dist, dyp, { dmg: this.T.damage, wind: 0.3, cd: 1.5, reach: 2.4, knock: 3, fx(q) { if (Math.random() < 0.3) grab(q); } });
    return this.chase(p, dist, toPlayer, dt);
  };

  // wolves of the hills and the woods: a howl that brings the rest, a lunge, and a bite that drags you down
  const wolfAI = (friends, howlCalls) => function (dt, p, dist, dyp, toPlayer) {
    const g = this.game, s = this.senses(p, dist, dyp, dt, 30);
    if (this.m1HowlT > 0) { this.m1HowlT -= dt; if (this.m1HowlT <= 0) this.state = 'idle'; return MV(0, toPlayer); }
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    this.soundT -= dt;
    if (this.soundT < 0) { this.soundT = 6 + Math.random() * 8; if (dist < 30) g.sfx.playAt(s.hunting ? 'wolf_angry' : 'wolf', this.x, this.y + 1, this.z); }
    if (!s.hunting) return this.m1Idle(dt, 1.1);
    if (s.sees && !this.m1Yelled) { this.m1Yelled = true; this.state = 'm1howl'; this.m1HowlT = 1.2; g.sfx.playAt('wolf_howl', this.x, this.y + 1.2, this.z, 48); this.m1Alert(howlCalls, 28); return MV(0, toPlayer); }
    this.leapCd = (this.leapCd || 0) - dt;
    if (this.onGround && dist < 6 && dist > 2.4 && this.leapCd <= 0 && Math.abs(dyp) < 2 && s.sees) { this.leapCd = 2.6 + Math.random(); const l = dist || 1; this.vy = 6; this.vx = (p.x - this.x) / l * 9; this.vz = (p.z - this.z) / l * 9; }
    const pack = this.m1Near(p, 3, friends) > 0;
    this.m1Swing(p, dist, dyp, { dmg: this.T.damage + (pack ? 1 : 0), cd: 1.2, knock: 2, fx(q) { m1Afflict(q, 'prone', 0.7, { save: ['str', 13] }); } });
    const c = this.chase(p, dist, toPlayer, dt);
    if (dist > 3 && dist < 7 && pack) c.dir += Math.sin(this.age * 0.9 + this.id) * 0.8;   // the pack circles
    return c;
  };
  AI.worg = wolfAI(['worg'], ['worg', ...GOBLINS]);
  AI.dire_wolf = wolfAI(['dire_wolf'], ['dire_wolf']);

  // the owlbear: a screech, a charge, then up on its hind legs for two raking blows (Rend)
  AI.owlbear = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game, s = this.m1Sense(dt, p, dist, dyp, 24);
    if (this.rearT > 0) this.rearT -= dt;
    this.m1ComboTick(dt, p, dist, dyp, { dmg: this.T.damage, reach: 2.2, knock: 4 });
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    if (this.m1Charge > 0) {
      this.m1Charge -= dt;
      if (Math.random() < dt * 20) g.burst(this.x, this.y + 0.1, this.z, 'dirt', 1, 0.6);
      if (dist < 2.1 + this.w || this.hitWall) this.m1Charge = 0;
      return MV(this.T.speed * 2.1, this.m1ChargeDir);
    }
    if (!s.hunting) return this.m1Idle(dt, 0.8);
    if (s.sees && !this.m1Yelled) { this.m1Yelled = true; g.sfx.playAt(this.T.voice + '_angry', this.x, this.y + 1.6, this.z, 40); this.rearT = 0.9; }
    this.m1ChargeCd = (this.m1ChargeCd ?? 2) - dt;
    if (s.sees && dist > 5 && dist < 12 && this.m1ChargeCd <= 0 && this.onGround) { this.m1ChargeCd = 7 + Math.random() * 3; this.m1Charge = 1.1; this.m1ChargeDir = toPlayer; g.sfx.playAt(this.T.voice + '_angry', this.x, this.y + 1.6, this.z, 40); }
    if (this.attackCd <= 0 && dist < 2.1 + this.w && Math.abs(dyp) < 2.2) {
      this.rearT = 0.8;
      this.m1Wind = { t: 0.45, p, o: { dmg: this.T.damage, wind: 0.45, cd: 2.6, reach: 2.2, knock: 4, after() { this.m1Combo = 1; this.m1ComboT = 0.65; } } };
      return MV(0, toPlayer);
    }
    return this.chase(p, dist, toPlayer, dt);
  };

  // the giant spider: a web that holds you fast (Recharge 5–6), then the venomous bite; it climbs like its small kin
  AI.giant_spider = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game, s = this.senses(p, dist, dyp, dt, 20);
    if (s.hunting) this.panicT = Math.max(this.panicT || 0, 1);   // it hunts by day as well as by night
    this.m1WebT = (this.m1WebT ?? 2 + Math.random() * 3) - dt;
    if (this.m1WebAim > 0) { this.m1WebAim -= dt; this.state = 'm1web'; if (this.m1WebAim <= 0) { this.state = 'idle'; this.m1Web(p, 13); } return MV(0, toPlayer); }
    if (s.hunting && s.sees && this.onGround && !this.surfaceTilt && dist > 3 && dist < 13 && this.m1WebT <= 0) { this.m1WebT = 8 + Math.random() * 5; this.m1WebAim = 0.5; g.sfx.playAt('spider', this.x, this.y + 0.6, this.z); return MV(0, toPlayer); }
    return this.asType('spider', () => MONSTER_AI.__base.call(this, dt, p, dist, dyp, toPlayer));
  };

  // the ettercap: keeper of spiders — it calls them in, strings you up in silk, and bites
  AI.ettercap = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game, s = this.m1Sense(dt, p, dist, dyp, 22);
    this.m1ComboTick(dt, p, dist, dyp, { dmg: 7, knock: 2 });
    if (this.m1CastTick(dt, p)) return MV(0, toPlayer);
    if (!s.hunting) return this.m1Idle(dt, 0.8);
    if (s.sees && !this.m1Yelled) { this.m1Yelled = true; this.m1Alert(['giant_spider', 'spider', 'cave_spider'], 28); g.sfx.playAt('spider', this.x, this.y + 1.5, this.z, 32); }
    this.m1WebT = (this.m1WebT ?? 3) - dt;
    if (s.sees && dist > 3 && dist < 10 && this.m1WebT <= 0) { this.m1WebT = 9 + Math.random() * 4; this.m1Cast(0.5, (q) => { if (q && !q.dead) this.m1Web(q, 12, 4); }); return MV(0, toPlayer); }
    if (this.attackCd <= 0 && dist < 1.4 + this.w && Math.abs(dyp) < 1.8) { this.attackCd = 2.0; this.swingT = 0.3; this.m1Hit(p, this.T.damage); this.m1Combo = 1; this.m1ComboT = 0.65; }
    return this.chase(p, dist, toPlayer, dt);
  };

  // awakened plants stand still as any tree or bush until you come close, then lumber after you
  const plantAI = (wake, o) => function (dt, p, dist, dyp, toPlayer) {
    const g = this.game, s = this.senses(p, dist, dyp, dt, 18);
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    if (!this.m1Awake) {
      this.state = 'm1still';
      if (s.hunting && dist < wake) { this.m1Awake = true; this.state = 'idle'; g.burst(this.x, this.y + this.h * 0.8, this.z, this.T.m1 === 'awakened_shrub' ? 'awakened_shrub_leaves' : 'awakened_tree_leaves', 20, 1.4); g.sfx.playAt(this.T.voice + '_angry', this.x, this.y + this.h * 0.7, this.z); }
      else return MV(0, this.yaw);
    }
    if (this.state === 'm1still') this.state = 'idle';
    this.voiceTick(dt, dist, 8, 8);
    if (!s.hunting) return this.m1Idle(dt, 0.5);
    this.m1Swing(p, dist, dyp, o);
    return this.chase(p, dist, toPlayer, dt);
  };
  AI.awakened_tree = plantAI(6, { dmg: 13, wind: 0.7, cd: 2.0, reach: 2.0, knock: 7, dy: 2.6, fx() { this.game.shake(0.2, this); } });
  AI.awakened_shrub = plantAI(3.5, { dmg: 1, cd: 1.2, knock: 1 });

  // the ghast: a stench that turns the stomach, claws that paralyse, a bite that rots
  AI.ghast = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game, s = this.m1Sense(dt, p, dist, dyp, 24);
    if (Math.random() < dt * 5) spellSpark(g, this.x + (Math.random() - 0.5) * 1.2, this.y + 0.3 + Math.random() * 1.5, this.z + (Math.random() - 0.5) * 1.2, 'mana_heal', { vy: 0.4, life: 1.0, size: 0.07 });
    this.m1StenchT = (this.m1StenchT || 0) - dt;
    if (this.m1StenchT <= 0) {
      this.m1StenchT = 1;
      for (const q of g.pawns()) {
        const lp = m1LP(q); if (!lp || q.dead || Math.hypot(q.x - this.x, q.z - this.z) > 1.8 || Math.abs(q.y - this.y) > 2) continue;
        const st = m1St(lp); if (st.stenchOk) continue;
        if (m1Save(q, 'con', 10, (m1Chr(lp) || {}).species === 'dwarf')) { st.stenchOk = true; lp.floatText(q.x, q.y + 2.2, q.z, 'You steel your stomach', '#9ad8ff'); }
        else { const P = lp.player; P.poison = Math.max(P.poison || 0, 2.5); P.slow = Math.max(P.slow || 0, 2); lp.floatText(q.x, q.y + 2.2, q.z, 'Poisoned by the stench', '#9ae060'); }
      }
    }
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    if (!s.hunting) return this.m1Idle(dt);
    const claw = !((this.m1Alt || 0) & 1);
    if (this.m1Swing(p, dist, dyp, claw ? { dmg: this.T.damage, cd: 1.3, fx(q) { m1Afflict(q, 'hold', 2.2, { save: ['con', 10] }); } } : { dmg: 12, cd: 1.4, element: 'necrotic' })) this.m1Alt = (this.m1Alt || 0) + 1;
    return this.chase(p, dist, toPlayer, dt);
  };

  // the wight: a dead captain who still fights like one — bow at range, sword up close, and every third blow drinks your life
  AI.wight = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game, s = this.m1Sense(dt, p, dist, dyp, 26), sun = this.m1Sun();
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    if (!s.hunting) { this.aiming = false; if (this.heldItem === 'bow') this.heldItem = 'longsword'; return this.m1Idle(dt, 0.7); }
    if (s.sees && dist > 6.5 && dist < 18 && !(this.lost && (this.lost.has('armL') || this.lost.has('foreL')))) {
      if (this.heldItem !== 'bow') { this.heldItem = 'bow'; this.shootT = 1.2; }
      return this.m1Archer(dt, p, dist, toPlayer, { dmg: 6, near: 4, far: 17, every: 2.0 });
    }
    this.aiming = false; if (this.heldItem === 'bow') this.heldItem = 'longsword';
    const drain = (this.m1Alt || 0) % 3 === 2;
    const o = drain
      ? { dmg: 6, cd: 1.4, element: 'necrotic', fx(q) { spellFx(g, q.x, q.y + 1.2, q.z, 'mana_arcane', 16, 1, { life: 0.6 }); if (!m1Save(q, 'con', 13)) m1Drain(q, 6); } }
      : { dmg: this.T.damage - (sun ? 3 : 0), cd: 1.4, knock: 2.5 };
    if (this.m1Swing(p, dist, dyp, o)) this.m1Alt = (this.m1Alt || 0) + 1;
    return this.chase(p, dist, toPlayer, dt, sun ? 0.8 : 1);
  };

  // drifting through walls toward you, at head height; a touch, then away again
  const ghostAI = (o) => function (dt, p, dist, dyp, toPlayer) {
    const g = this.game;
    this.noGrav = true; this.m1Phase = true;
    if (o.sunFlees && this.m1Sun()) { this.remove = true; g.burst(this.x, this.y + 1, this.z, 'white', 18, 0.8); g.sfx.playAt('wraith_death', this.x, this.y + 1, this.z); return MV(0, this.yaw); }
    const s = this.m1Sense(dt, p, dist, dyp, 28);
    if (o.extra) { const r = o.extra.call(this, dt, p, dist, dyp, toPlayer, s); if (r) return r; }
    this.retreatT = (this.retreatT || 0) - dt;
    if (!s.hunting) { const f = this.m1Floor(6); this.flyVy = f < 0.6 ? 0.8 : f > 2.5 ? -0.6 : Math.sin(this.age * 0.8) * 0.4; return this.m1Idle(dt, 0.6); }
    const hover = this.retreatT > 0 ? 2.5 : 0.35;
    this.flyVy = clamp(((p.y + hover) - this.y) * 1.8, -3, 3);
    if (this.retreatT > 0) return MV(this.T.speed * 0.75, toPlayer + Math.PI + 0.65);
    if (dist < 1.5 + this.w && Math.abs(p.y - this.y) < 2.2 && this.attackCd <= 0) {
      this.attackCd = 1.8; this.swingT = 0.3;
      this.m1Hit(p, this.T.damage, { element: 'necrotic', knock: 1.5, fx: o.touch });
      this.retreatT = 0.9 + Math.random() * 0.8;
    }
    return MV(this.T.speed, toPlayer);
  };
  // the specter: its touch drains the life out of you (Life Drain)
  AI.specter = ghostAI({ sunFlees: true, touch(q) { if (!m1Save(q, 'con', 10)) m1Drain(q, 5); } });
  // the banshee: her face fills you with dread (Horrifying Visage); once, she wails, and the living fall (Deathly Wail)
  AI.banshee = ghostAI({
    extra(dt, p, dist, dyp, toPlayer, s) {
      const g = this.game;
      if (this.m1WailT > 0) {
        this.m1WailT -= dt; this.state = 'm1wail'; this.flyVy = 0;
        if (Math.random() < dt * 40) { const a = Math.random() * TAU, r = 3 + Math.random() * 2; spellSpark(g, this.x + Math.cos(a) * r, this.y + 1 + Math.random() * 1.5, this.z + Math.sin(a) * r, 'mana_frost', { vx: -Math.cos(a) * r * 1.8, vz: -Math.sin(a) * r * 1.8, life: 0.5, size: 0.08 }); }
        if (this.m1WailT <= 0) { this.state = 'idle'; this.m1DeathlyWail(); }
        return MV(0, toPlayer);
      }
      if (!s.hunting) return null;
      this.m1VisageT = (this.m1VisageT ?? 0) - dt;
      if (s.sees && dist < 12 && this.m1VisageT <= 0) {
        this.m1VisageT = 18; g.sfx.playAt(this.T.voice, this.x, this.y + 1.6, this.z, 40);
        for (const q of g.pawns()) if (!q.dead && Math.hypot(q.x - this.x, q.z - this.z) < 12) m1Afflict(q, 'fear', 4, { save: ['wis', 11], by: this });
      }
      const near = g.pawns().filter(q => !q.dead && Math.hypot(q.x - this.x, q.z - this.z) < 7).length;
      if (!this.m1Wailed && s.sees && dist < 6 && (this.health < this.maxHealth * 0.65 || near > 1)) {
        this.m1Wailed = true; this.m1WailT = 1.4;
        g.sfx.playAt(this.T.voice + '_angry', this.x, this.y + 1.6, this.z, 48);
        for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 24) l.toast('The banshee draws a terrible breath…', 'warn');
        return MV(0, toPlayer);
      }
      return null;
    },
  });
  Mob.prototype.m1DeathlyWail = function () {
    const g = this.game;
    g.shake(0.5, this);
    spellRing(g, this.x, this.y + 1.2, this.z, 'mana_frost', 0.5, 48, { speed: 9, life: 0.8, size: 0.14 });
    spellRing(g, this.x, this.y + 0.4, this.z, 'mana_arcane', 0.5, 36, { speed: 7, life: 0.9, size: 0.12, flat: true });
    for (const q of g.pawns()) {
      if (q.dead || Math.hypot(q.x - this.x, q.z - this.z) > 6.5 || Math.abs(q.y - this.y) > 4) continue;
      const ok = m1Save(q, 'con', 13);
      q.hurt(ok ? 7 : 14, { type: 'magic', attacker: this, element: 'psychic', knock: 3 });
      if (!ok) m1Afflict(q, 'fear', 5, { by: this });
      if (q.floatText) q.floatText(q.x, q.y + 2.5, q.z, 'Deathly Wail!', '#a8d8ff');
    }
    for (const e of g.entities) if (e instanceof Mob && e !== this && e.alive && e.T && !e.T.undead && e.T.ctype !== 'construct' && Math.hypot(e.x - this.x, e.z - this.z) < 6.5) e.hurt(10, { type: 'magic', attacker: this, knock: 2 });
  };

  // the shadow: in the dark it is all but invisible (see m1Vis); its touch drains your Strength
  AI.shadow = function (dt, p, dist, dyp, toPlayer) {
    const s = this.m1Sense(dt, p, dist, dyp, 22);
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    if (!s.hunting) return this.m1Idle(dt, 0.7);
    this.m1Swing(p, dist, dyp, { dmg: this.T.damage, cd: 1.3, element: 'necrotic', knock: 1, fx(q) { m1Sap(q, 1 + Math.floor(Math.random() * 4)); } });
    return this.chase(p, dist, toPlayer, dt, m1Lit(this) >= 10 ? 0.75 : 1.1);
  };

  // the gelatinous cube: it slides over you and you're inside it, held in the acid, until you struggle out
  AI.gelatinous_cube = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game, s = this.m1Sense(dt, p, dist, dyp, 14);
    const held = this.m1Held && !this.m1Held.dead && this.m1Held._m1 && this.m1Held._m1.engulf === this ? this.m1Held : null;
    if (!held) { this.m1Held = null; if (this.state === 'm1engulf') this.state = 'idle'; }
    else { this.state = 'm1engulf'; this.wander(dt); return MV(this.T.speed * 0.5, this.wanderDir); }   // it oozes off with its meal
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    if (!s.hunting) return this.m1Idle(dt, 0.6);
    this.m1EngulfCd = (this.m1EngulfCd || 0) - dt;
    const lp = m1LP(p);
    if (lp && dist < this.w + 0.55 && Math.abs(dyp) < 1.5 && this.m1EngulfCd <= 0) {
      this.m1EngulfCd = 3;
      if (m1Save(p, 'dex', 12)) { lp.floatText(p.x, p.y + 2.2, p.z, 'Leapt clear!', '#9ad8ff'); const l = dist || 1; lp.knock((p.x - this.x) / l * 6, 4, (p.z - this.z) / l * 6); }
      else if (m1Afflict(p, 'engulf', 1, { by: this })) { this.m1Held = lp; this.state = 'm1engulf'; g.sfx.playAt('squish', this.x, this.y + 1, this.z); lp.hurt(this.T.damage, { type: 'magic', attacker: this, element: 'acid', knock: 0 }); }
      return MV(0, toPlayer);
    }
    if (!lp || this.m1EngulfCd > 0) this.m1Swing(p, dist, dyp, { dmg: this.T.damage, wind: 0.5, cd: 2.2, reach: 0.6, element: 'acid', knock: 2 });
    return this.chase(p, dist, toPlayer, dt);
  };

  // the will-o'-wisp: it winks out and back, drifts away as you chase it and darts in when you stop; its touch is lightning
  AI.will_o_wisp = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game; this.noGrav = true;
    const s = this.m1Sense(dt, p, dist, dyp, 26);
    this.m1FlickT = (this.m1FlickT ?? 3 + Math.random() * 2) - dt;
    if (this.m1FlickT <= 0) {
      if (this.state === 'm1invis') { this.state = 'idle'; this.m1FlickT = 3 + Math.random() * 3; spellFx(g, this.x, this.y + 0.3, this.z, 'mana_frost', 10, 1, { life: 0.4 }); }
      else { this.state = 'm1invis'; this.m1FlickT = 1.5 + Math.random() * 1.5; }
    }
    const floor = this.m1Floor(8);
    if (!s.hunting) { this.flyVy = floor < 1.2 ? 0.8 : floor > 3 ? -0.5 : Math.sin(this.age) * 0.4; return this.m1Idle(dt, 0.7); }
    // Consume Life: a fallen foe nearby feeds it
    if (p.player && p.player.downed > 0 && dist < 2.5 && (this.m1FeedT || 0) < this.age) { this.m1FeedT = this.age + 6; this.health = Math.min(this.maxHealth, this.health + 10); spellFx(g, this.x, this.y + 0.3, this.z, 'mana_heal', 16, 1, { life: 0.6 }); }
    this.flyVy = clamp((p.y + 1.2 - this.y) * 1.6, -2.5, 2.5);
    if (this.state !== 'm1invis' && dist < 1.4 + this.w && Math.abs(p.y + 1 - this.y) < 1.8 && this.attackCd <= 0) {
      this.attackCd = 1.8; this.swingT = 0.3;
      this.m1Hit(p, this.T.damage, { element: 'lightning', knock: 2 });
      spellFx(g, this.x, this.y + 0.3, this.z, 'mana_light', 20, 2.2, { life: 0.3, size: 0.06 }); g.sfx.playAt('fizz', this.x, this.y, this.z);
      this.state = 'm1invis'; this.m1FlickT = 1.2;
    }
    const pvx = p.vx || 0, pvz = p.vz || 0, chasing = Math.hypot(pvx, pvz) > 2 && (pvx * (this.x - p.x) + pvz * (this.z - p.z)) > 0;
    if (chasing && dist < 7) return MV(this.T.speed * 0.8, toPlayer + Math.PI + Math.sin(this.age * 0.7) * 0.8);
    return MV(this.T.speed, toPlayer + (this.state === 'm1invis' ? Math.sin(this.age * 2) * 1.2 : 0));
  };

  // the treant: still as an old oak until roused; two crushing slams, rocks hurled at those who keep away, and once, it wakes the trees
  AI.treant = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game, s = this.senses(p, dist, dyp, dt, 30);
    this.m1ComboTick(dt, p, dist, dyp, { dmg: this.T.damage, reach: 2.6, knock: 8, dy: 3 });
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    if (!this.m1Awake) {
      this.state = 'm1still';
      if (s.hunting && dist < 10) { this.m1Awake = true; this.state = 'idle'; g.sfx.playAt(this.T.voice + '_angry', this.x, this.y + 3, this.z, 48); for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 30) l.toast('The ancient tree stirs: a treant!', 'warn'); }
      else return MV(0, this.yaw);
    }
    if (this.state === 'm1still') this.state = 'idle';
    this.voiceTick(dt, dist, 7, 8);
    if (!s.hunting) return this.m1Idle(dt, 0.5);
    if (!this.m1Animated && this.health < this.maxHealth * 0.6) { this.m1Animated = true; this.m1Cast(1.0, () => this.m1AnimateTrees(2)); }
    if (this.m1CastTick(dt, p)) return MV(0, toPlayer);
    this.m1RockT = (this.m1RockT ?? 3) - dt;
    if (s.sees && dist > 5 && dist < 24 && this.m1RockT <= 0) {
      this.m1RockT = 6 + Math.random() * 3;
      this.m1Wind = { t: 1.0, p, o: { wind: 1.0, two: true, cd: 1.2, release(q) {
        if (!q || q.dead) return;
        g.sfx.playAt('thud', this.x, this.y + 3, this.z);
        this.m1Lob(q, 16, 16, { item: 'cobblestone', size: 0.9, r: 0.9, hand: 1.05, hit: (who, sh) => { sh.game.burst(sh.x, sh.y, sh.z, 'stone', 18, 1.5); sh.game.sfx.playAt('thud', sh.x, sh.y, sh.z); if (who) sh.owner.m1Hit(who, 28, { knock: 8 }); } });
      } } };
      return MV(0, toPlayer);
    }
    if (this.attackCd <= 0 && dist < 2.6 + this.w && Math.abs(dyp) < 3) {
      this.m1Wind = { t: 0.6, p, o: { dmg: this.T.damage, wind: 0.6, cd: 2.4, reach: 2.6, knock: 8, dy: 3, fx() { g.shake(0.3, this); }, after() { this.m1Combo = 1; this.m1ComboT = 0.75; } } };
      return MV(0, toPlayer);
    }
    return this.chase(p, dist, toPlayer, dt);
  };
  Mob.prototype.m1AnimateTrees = function (n) {
    const g = this.game, w = g.world;
    for (let i = 0, made = 0; i < 16 && made < n; i++) {
      const a = Math.random() * TAU, x = Math.floor(this.x + Math.cos(a) * 5) + 0.5, z = Math.floor(this.z + Math.sin(a) * 5) + 0.5;
      let y = Math.floor(this.y) + 3; while (y > this.y - 4 && !T_SOLID[w.getBlock(Math.floor(x), y - 1, Math.floor(z))]) y--;
      if (!T_SOLID[w.getBlock(Math.floor(x), y - 1, Math.floor(z))] || T_SOLID[w.getBlock(Math.floor(x), y, Math.floor(z))] || T_SOLID[w.getBlock(Math.floor(x), y + 1, Math.floor(z))]) continue;
      const m = g.addEntity(new Mob(g, 'awakened_tree', x, y, z)); m.m1Awake = true; m.huntT = 20; made++;
      g.burst(x, y + 2, z, 'awakened_tree_leaves', 30, 1.6);
    }
    for (const l of g.locals) if (Math.hypot(l.player.x - this.x, l.player.z - this.z) < 30) l.toast('The treant calls, and the trees answer!', 'warn');
  };

  // the dryad: never far from her tree; she charms, tangles you in vines, lashes from out of reach, and steps from tree to tree
  AI.dryad = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game;
    if (!this.m1Home) this.m1Home = [this.x, this.y, this.z];
    const s = this.m1Sense(dt, p, dist, dyp, 16);
    if (this.m1CastTick(dt, p)) return MV(0, toPlayer);
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    const home = this.m1Home, fromHome = Math.hypot(this.x - home[0], this.z - home[2]);
    if (!s.hunting) { if (fromHome > 8) return MV(this.T.speed * 0.7, this.navDir(home[0], home[1], home[2], dt) ?? Math.atan2(this.x - home[0], this.z - home[2])); return this.m1Idle(dt, 0.6); }
    this.m1StrideCd = (this.m1StrideCd ?? 4) - dt;
    if (this.m1StrideCd <= 0 && ((this.hurtTime > 0 && this.health < this.maxHealth * 0.7) || fromHome > 16)) { this.m1StrideCd = 10; if (this.m1TreeStride()) return MV(0, toPlayer); }
    const lp = m1LP(p), st = lp && lp._m1;
    this.m1CharmT = (this.m1CharmT ?? 2) - dt;
    if (s.sees && dist < 10 && this.m1CharmT <= 0 && !(st && st.charm > 0)) {
      this.m1CharmT = 16;
      this.m1Cast(0.8, (q) => { if (q && !q.dead && Math.hypot(q.x - this.x, q.z - this.z) < 12) { spellFx(g, q.x, q.y + 1.5, q.z, 'mana_heal', 20, 1, { life: 0.6 }); m1Afflict(q, 'charm', 6, { save: ['wis', 14], by: this }); } });
      return MV(0, toPlayer);
    }
    this.m1VineT = (this.m1VineT ?? 6) - dt;
    if (s.sees && dist > 3 && dist < 10 && this.m1VineT <= 0) {
      this.m1VineT = 18;
      this.m1Cast(0.7, (q) => { if (!q || q.dead) return; for (let i = 0; i < 24; i++) { const a = Math.random() * TAU; spellSpark(g, q.x + Math.cos(a) * 1.2, q.y + 0.1, q.z + Math.sin(a) * 1.2, 'dryad_leaves', { vx: -Math.cos(a), vy: 1.2, vz: -Math.sin(a), life: 0.8, size: 0.12 }); } m1Afflict(q, 'root', 4, { save: ['str', 14], dc: 13, label: 'Entangled!' }); });
      return MV(0, toPlayer);
    }
    this.m1Swing(p, dist, dyp, { dmg: this.T.damage, cd: 1.5, reach: 2.2, knock: -4 });
    if (st && st.charm > 0 && st.by === this) return MV(0, toPlayer);   // she lets you come to her
    return this.chase(p, dist, toPlayer, dt, 0.8);
  };
  Mob.prototype.m1TreeStride = function () {
    const g = this.game, w = g.world, ox = Math.floor(this.x), oy = Math.floor(this.y), oz = Math.floor(this.z);
    for (let i = 0; i < 50; i++) {
      const x = ox + Math.floor(Math.random() * 21) - 10, z = oz + Math.floor(Math.random() * 21) - 10;
      if (Math.abs(x - ox) + Math.abs(z - oz) < 4) continue;
      for (let y = oy + 3; y >= oy - 3; y--) {
        const b = BLOCKS[w.getBlock(x, y, z)];
        if (!b || !b.isLog) continue;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz; let fy = y;
          while (fy > y - 4 && !T_SOLID[w.getBlock(nx, fy - 1, nz)]) fy--;
          if (T_SOLID[w.getBlock(nx, fy - 1, nz)] && !T_SOLID[w.getBlock(nx, fy, nz)] && !T_SOLID[w.getBlock(nx, fy + 1, nz)]) {
            g.burst(this.x, this.y + 1, this.z, 'dryad_leaves', 20, 1.2);
            this.x = nx + 0.5; this.y = fy; this.z = nz + 0.5; this.vx = this.vy = this.vz = 0;
            g.burst(this.x, this.y + 1, this.z, 'dryad_leaves', 20, 1.2); g.sfx.playAt('fizz', this.x, this.y + 1, this.z);
            return true;
          }
        }
        break;
      }
    }
    return false;
  };

  // pixies: unseen more often than not, flitting, sprinkling dust that sleeps, tangles or confuses
  AI.pixie = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game; this.noGrav = true;
    const s = this.m1Sense(dt, p, dist, dyp, 18);
    if (Math.random() < dt * 8) spellSpark(g, this.x + (Math.random() - 0.5) * 0.3, this.y + 0.2 + Math.random() * 0.3, this.z + (Math.random() - 0.5) * 0.3, Math.random() < 0.5 ? 'mana_arcane' : 'mana_light', { vy: -0.4, life: 0.8, size: 0.035 });
    if (this.m1CastTick(dt, p)) { this.flyVy = 0; return MV(0, toPlayer); }
    this.m1FlickT = (this.m1FlickT ?? 2) - dt;
    if (this.m1FlickT <= 0) { if (this.state === 'm1invis') { this.state = 'idle'; this.m1FlickT = 2 + Math.random() * 1.5; } else { this.state = s.hunting ? 'm1invis' : 'idle'; this.m1FlickT = 3 + Math.random() * 2; } }
    const floor = this.m1Floor(6);
    if (!s.hunting) { this.flyVy = floor < 1.5 ? 1 : floor > 3 ? -0.6 : Math.sin(this.age * 2) * 0.5; return MV(this.T.speed * 0.5, this.yaw + Math.sin(this.age * 1.3) * 1.5); }
    this.flyVy = clamp((p.y + 1.8 + Math.sin(this.age * 2.5) * 0.6 - this.y) * 1.5, -2.5, 2.5);
    this.m1SpellT = (this.m1SpellT ?? 2 + Math.random() * 2) - dt;
    if (s.sees && dist < 8 && this.m1SpellT <= 0) {
      this.m1SpellT = 9 + Math.random() * 5;
      const r = Math.random(), kind = r < 0.4 ? 'sleep' : r < 0.7 ? 'confuse' : 'root';
      this.m1Cast(0.6, (q) => { if (!q || q.dead || Math.hypot(q.x - this.x, q.z - this.z) > 10) return; spellFx(g, q.x, q.y + 1.6, q.z, 'mana_arcane', 26, 1.2, { life: 0.8, size: 0.05 }); m1Afflict(q, kind, 4, { save: kind === 'root' ? ['str', 12] : ['wis', 12], dc: 11, label: kind === 'root' ? 'Entangled!' : undefined }); });
      return MV(0, toPlayer);
    }
    if (dist < 1.2 + this.w && Math.abs(p.y + 1 - this.y) < 1.6 && this.attackCd <= 0) { this.attackCd = 1.5; this.swingT = 0.3; this.m1Hit(p, 1, { knock: 0.5 }); }
    const zig = Math.sin(this.age * 3.1 + this.id) * 1.4;
    if (dist < 3) return MV(this.T.speed, toPlayer + Math.PI + zig);
    if (dist > 6) return MV(this.T.speed, toPlayer + zig * 0.4);
    return MV(this.T.speed * 0.7, toPlayer + Math.PI / 2 * Math.sign(Math.sin(this.age * 0.6 + this.id)) + zig * 0.3);
  };

  // sprites: tiny archers hanging in the air out of reach; their arrows put you to sleep; hurt, they vanish
  AI.sprite = function (dt, p, dist, dyp, toPlayer) {
    this.noGrav = true;
    const s = this.m1Sense(dt, p, dist, dyp, 22);
    if (this.m1InvT > 0) { this.m1InvT -= dt; if (this.m1InvT <= 0 && this.state === 'm1invis') this.state = 'idle'; }
    if (this.m1Flinched()) { this.state = 'm1invis'; this.m1InvT = 3; }
    const floor = this.m1Floor(8);
    if (!s.hunting) { this.aiming = false; this.flyVy = floor < 2 ? 0.8 : floor > 4 ? -0.5 : Math.sin(this.age * 1.5) * 0.4; return this.m1Idle(dt, 0.8); }
    this.flyVy = clamp((p.y + 2.5 - this.y) * 1.4, -2.5, 2.5);
    if (dist < 1.3 + this.w && this.attackCd <= 0 && Math.abs(p.y + 1 - this.y) < 2) { this.attackCd = 1.2; this.swingT = 0.3; this.m1Hit(p, 6, { knock: 1 }); }
    return this.m1Archer(dt, p, dist, toPlayer, { dmg: 2, near: 4, far: 13, every: 1.8, fly: true, after() { if (this.state === 'm1invis') { this.state = 'idle'; this.m1InvT = 0; } } });
  };

  // satyrs: a tune on the pipes that charms, frightens or lulls you to sleep, and a butt of the horns
  AI.satyr = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game, s = this.m1Sense(dt, p, dist, dyp, 20);
    if (this.m1PipeT > 0) {
      this.m1PipeT -= dt; this.state = 'm1pipe';
      if (Math.random() < dt * 6) spellSpark(g, this.x - Math.sin(this.yaw) * 0.4, this.y + 1.7, this.z - Math.cos(this.yaw) * 0.4, this.m1SongKind === 'fear' ? 'mana_fire' : this.m1SongKind === 'sleep' ? 'mana_arcane' : 'mana_heal', { vx: (Math.random() - 0.5), vy: 1.2, vz: (Math.random() - 0.5), life: 1.2, size: 0.08 });
      if (this.m1PipeT <= 0) { this.state = 'idle'; this.m1Song(); }
      return MV(0, toPlayer);
    }
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    if (this.m1DartT > 0) { this.m1DartT -= dt; return MV(this.T.speed * 1.2, toPlayer + Math.PI + this.m1DartS); }
    if (!s.hunting) return this.m1Idle(dt, 1.0);
    this.m1SongT = (this.m1SongT ?? 3) - dt;
    if (s.sees && dist < 10 && dist > 2 && this.m1SongT <= 0) { this.m1SongT = 14 + Math.random() * 4; this.m1PipeT = 2.2; this.m1SongKind = ['charm', 'fear', 'sleep'][Math.floor(Math.random() * 3)]; g.sfx.playAt('m1pipes', this.x, this.y + 1.7, this.z, 32); return MV(0, toPlayer); }
    if (this.m1Swing(p, dist, dyp, { dmg: this.T.damage, cd: 1.3, knock: 6 })) { this.m1DartT = 0.6; this.m1DartS = (Math.random() < 0.5 ? -1 : 1) * 0.8; }
    return this.chase(p, dist, toPlayer, dt, 1.1);
  };
  Mob.prototype.m1Song = function () {
    const g = this.game, kind = this.m1SongKind || 'charm';
    for (const q of g.pawns()) {
      if (q.dead || Math.hypot(q.x - this.x, q.z - this.z) > 12) continue;
      if (kind === 'charm') m1Afflict(q, 'charm', 5, { save: ['wis', 12], by: this });
      else if (kind === 'fear') m1Afflict(q, 'fear', 4, { save: ['wis', 12], by: this });
      else m1Afflict(q, 'sleep', 4, { save: ['wis', 12] });
    }
  };

  // the green hag: voices from the reeds that aren't what they seem (Mimicry), copies of herself from nothing,
  // and Invisible Passage — she fades, circles round, and claws from nowhere
  AI.green_hag = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game;
    if (this.m1Illusion) return m1IllusionAI.call(this, dt, p, dist, dyp, toPlayer);
    const s = this.m1Sense(dt, p, dist, dyp, 22);
    if (this.m1InvT > 0) { this.m1InvT -= dt; if (this.m1InvT <= 0 && this.state === 'm1invis') { this.state = 'idle'; spellFx(g, this.x, this.y + 1, this.z, 'mana_heal', 14, 1, { life: 0.5 }); } }
    if (this.m1CastTick(dt, p)) return MV(0, toPlayer);
    if (this.m1WindTick(dt)) return MV(0, toPlayer);
    this.m1MimicT = (this.m1MimicT ?? 8) - dt;
    if (this.m1MimicT <= 0 && dist < 30) { this.m1MimicT = 10 + Math.random() * 14; g.sfx.playAt(['wolf', 'cat', 'baa', 'oink', 'raider', 'moo', 'cluck', 'hurt'][Math.floor(Math.random() * 8)], this.x, this.y + 1.5, this.z); }
    if (!s.hunting) return this.m1Idle(dt, 0.7);
    if (s.sees && !this.m1Yelled) { this.m1Yelled = true; g.sfx.playAt(this.T.voice + '_angry', this.x, this.y + 1.6, this.z); }
    this.m1InvCd = (this.m1InvCd ?? 4) - dt;
    if (this.state !== 'm1invis' && this.m1InvCd <= 0 && (this.hurtTime > 0 || Math.random() < dt * 0.15)) { this.m1InvCd = 14; this.state = 'm1invis'; this.m1InvT = 5; spellFx(g, this.x, this.y + 1, this.z, 'mana_heal', 18, 1, { life: 0.5 }); }
    this.m1IllusT = (this.m1IllusT ?? 5) - dt;
    if (s.sees && this.m1IllusT <= 0 && dist < 14 && this.state !== 'm1invis') { this.m1IllusT = 20; this.m1Cast(0.8, () => this.m1MakeIllusions(2)); return MV(0, toPlayer); }
    const hidden = this.state === 'm1invis';
    if (this.m1Swing(p, dist, dyp, { dmg: this.T.damage + (hidden ? 3 : 0), cd: 1.3, knock: 2 }) && hidden) { this.state = 'idle'; this.m1InvT = 0; }
    if (hidden && dist < 6) return MV(this.T.speed * 1.1, toPlayer + Math.sin(this.age * 1.2) * 0.9);
    return this.chase(p, dist, toPlayer, dt);
  };
  Mob.prototype.m1MakeIllusions = function (n) {
    const g = this.game; let have = 0;
    for (const e of g.entities) if (e.m1Illusion && e.m1Caster === this && e.alive && !e.remove) have++;
    for (let i = have, tries = 0; i < n && tries < 10; tries++) {
      const a = Math.random() * TAU, x = this.x + Math.cos(a) * 2.5, z = this.z + Math.sin(a) * 2.5;
      if (T_SOLID[g.world.getBlock(Math.floor(x), Math.floor(this.y + 0.5), Math.floor(z))]) continue;
      const m = new Mob(g, this.type, x, this.y, z);
      m.m1Illusion = true; m.m1Caster = this; m.m1Life = 14; m.health = m.maxHealth = 1; m.huntT = 15; m.yaw = this.yaw; m.kept = false;
      g.addEntity(m); spellFx(g, x, this.y + 1, z, 'mana_heal', 16, 1, { life: 0.5 }); i++;
    }
  };
  function m1IllusionAI(dt, p, dist, dyp, toPlayer) {
    this.m1Life -= dt;
    if (this.m1Life <= 0 || !this.m1Caster || !this.m1Caster.alive || this.m1Caster.remove) { m1Poof(this); return MV(0, this.yaw); }
    const s = this.senses(p, dist, dyp, dt, 22);
    if (!s.hunting) return this.m1Idle(dt);
    if (dist < 1.2 + this.w && Math.abs(dyp) < 1.8) { m1Poof(this); if (p.floatText) p.floatText(this.x, this.y + this.h + 0.3, this.z, 'Only an illusion!', '#9affc0'); return MV(0, toPlayer); }
    if (dist < 2.6 && !(this.swingT > 0) && Math.random() < dt * 2) this.swingT = 0.3;   // it swings, and nothing lands
    return this.chase(p, dist, toPlayer, dt);
  }

  // the nightmare: it gallops on the air trailing fire, circles, dives to trample and burn, and steps out of the world and back
  AI.nightmare = function (dt, p, dist, dyp, toPlayer) {
    const g = this.game, s = this.m1Sense(dt, p, dist, dyp, 32);
    if (this.m1GoneT > 0) { this.m1GoneT -= dt; this.state = 'm1invis'; this.noGrav = true; this.flyVy = 0; this.vx = this.vz = 0; if (this.m1GoneT <= 0) this.m1Reappear(p); return MV(0, toPlayer); }
    const floor = this.m1Floor(10);
    if (!s.hunting) {
      if (floor > 0.7) { this.noGrav = true; this.flyVy = -1.5; } else this.noGrav = false;
      return this.m1Idle(dt, 0.8);
    }
    this.noGrav = true;
    this.m1StrideCd = (this.m1StrideCd ?? 8) - dt;
    if (this.m1StrideCd <= 0 && (this.health < this.maxHealth * 0.5 || Math.random() < dt * 0.05)) { this.m1StrideCd = 16; this.m1GoneT = 1.6; g.burst(this.x, this.y + 1, this.z, 'smoke', 30, 1.2); g.sfx.playAt('fizz', this.x, this.y + 1, this.z); return MV(0, toPlayer); }
    this.m1DiveT = (this.m1DiveT ?? 2) - dt;
    if (this.m1Diving > 0) {
      this.m1Diving -= dt;
      this.flyVy = clamp(((p.y + 0.6) - this.y) * 3, -6, 3);
      if (dist < 1.6 + this.w && Math.abs(p.y - this.y) < 2.2 && this.attackCd <= 0) {
        this.attackCd = 1.6; this.swingT = 0.3;
        this.m1Hit(p, this.T.damage, { knock: 6, fx(q) { if (q.ignite) q.ignite(4); else if (q instanceof Mob && !(q.T && q.T.fireImmune)) q.burn = Math.max(q.burn || 0, 4); } });
        this.m1Diving = 0; this.m1DiveT = 3 + Math.random() * 2;
      }
      return MV(this.T.speed * 1.5, toPlayer);
    }
    if (s.sees && this.m1DiveT <= 0 && dist < 16) { this.m1Diving = 2.2; g.sfx.playAt('horse_angry', this.x, this.y + 1.5, this.z, 40); return MV(this.T.speed * 1.4, toPlayer); }
    const wantY = Math.max(p.y + 3.5, this.y - floor + 2.5);
    this.flyVy = clamp((wantY - this.y) * 1.4, -3, 3);
    return MV(this.T.speed, toPlayer + (dist < 8 ? Math.PI / 2.2 : 0));
  };
  Mob.prototype.m1Reappear = function (p) {
    const g = this.game, w = g.world;
    this.state = 'idle';
    if (p) {
      const yaw = p.player ? p.player.yaw : (p.yaw || 0);
      for (const [d, side] of [[6, 0], [5, 0.8], [5, -0.8], [4, 1.6]]) {
        const x = p.x + Math.sin(yaw + side) * d, z = p.z + Math.cos(yaw + side) * d, y = p.y + 2;
        if (!T_SOLID[w.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))] && !T_SOLID[w.getBlock(Math.floor(x), Math.floor(y + 1), Math.floor(z))]) { this.x = x; this.y = y; this.z = z; break; }
      }
      this.m1Diving = 1.5;
    }
    g.burst(this.x, this.y + 1, this.z, 'smoke', 30, 1.2);
    for (let i = 0; i < 20; i++) g.flame(this.x + (Math.random() - 0.5) * 1.5, this.y + Math.random() * 2, this.z + (Math.random() - 0.5) * 1.5);
  };
}

// ---- voices: a goblin's cackle, an owlbear's screech-roar, the creak of a waking tree, a banshee's wail,
// a wisp's crackle, a pixie's giggle, a dryad's sigh, and a satyr's pipes
if (typeof VOX !== 'undefined') {
  const vq = (r, a) => 1 + (r() - 0.5) * a;
  Object.assign(VOX, {
    m1goblin: {
      say: [1.0, 0.75, (b, v, r) => { const p = vq(r, 0.2); let t = 0; for (let i = 0; i < 3 + (v % 3); i++) { b.throat(t, 0.12, { f: [[0, 520 * p], [1, 430 * p]], v: 'ae', k: 1.45, breath: 0.4, rough: 0.3, att: 0.006, rel: 0.6, drive: 1.4 }); t += 0.13 + r() * 0.05; } b.room(0.12); }],
      hurt: [0.4, 0.85, (b, v, r) => { b.throat(0, 0.25, { f: [[0, 900], [0.3, 980], [1, 640]], v: 'ie', k: 1.5, breath: 0.45, rough: 0.3, att: 0.004, rel: 0.6, drive: 1.6 }); }],
      death: [0.9, 0.85, (b, v, r) => { b.throat(0, 0.7, { f: [[0, 820], [0.4, 700], [1, 260]], v: 'iex', k: 1.5, breath: 0.5, rough: 0.4, att: 0.01, rel: 0.6 }); b.room(0.12); }],
      angry: [0.8, 0.85, (b, v, r) => { b.throat(0, 0.6, { f: [[0, 420], [0.3, 640], [1, 380]], v: 'arx', k: 1.4, breath: 0.4, sub: 0.3, rough: 0.5, drive: 2.2, att: 0.01 }); }],
    },
    m1owlbear: {
      say: [1.6, 0.85, (b, v, r) => { const p = vq(r, 0.15); b.throat(0, 0.5, { f: [[0, 520 * p], [0.3, 760 * p], [1, 480 * p]], v: 'uo', k: 1.05, breath: 0.35, att: 0.03, rel: 0.5 }); b.throat(0.55, 0.9, { f: [[0, 90 * p], [0.4, 105 * p], [1, 70 * p]], v: 'oxu', k: 0.72, breath: 0.4, sub: 0.5, rough: 0.4, drive: 1.8, att: 0.08 }); b.room(0.2, 1.3); }],
      hurt: [0.6, 0.9, (b, v, r) => { b.throat(0, 0.4, { f: [[0, 1100], [0.3, 1250], [1, 700]], v: 'ie', k: 1.1, breath: 0.6, rough: 0.3, att: 0.006, rel: 0.6, drive: 1.6 }); b.room(0.12); }],
      death: [1.8, 0.9, (b, v, r) => { b.throat(0, 0.6, { f: [[0, 1000], [1, 500]], v: 'ia', k: 1.1, breath: 0.6, att: 0.01, rel: 0.5 }); b.throat(0.4, 1.2, { f: [[0, 110], [1, 40]], v: 'oux', k: 0.72, breath: 0.45, sub: 0.55, rough: 0.4, att: 0.03, rel: 0.6 }); b.room(0.2, 1.3); }],
      angry: [1.4, 0.95, (b, v, r) => { b.throat(0, 0.6, { f: [[0, 900], [0.25, 1500], [1, 800]], v: 'iea', k: 1.1, breath: 0.7, rough: 0.5, drive: 2.4, att: 0.005, rel: 0.4 }); b.hiss(0, 0.6, { f: 3200, q: 0.8, gain: 0.3, att: 0.005 }); b.throat(0.5, 0.8, { f: [[0, 100], [1, 75]], v: 'rar', k: 0.72, breath: 0.5, sub: 0.6, rough: 0.6, drive: 2.6, att: 0.03 }); b.room(0.18, 1.3); }],
    },
    m1tree: {
      say: [2.2, 0.8, (b, v, r) => { const p = vq(r, 0.2); b.throat(0, 1.8, { f: [[0, 48 * p], [0.5, 56 * p], [1, 42 * p]], v: 'ouo', k: 0.55, breath: 0.25, sub: 0.6, rough: 0.7, jit: 0.08, am: [[3 + r() * 3, 0.5]], drive: 1.2, att: 0.4, rel: 0.5 }); b.noise(0.1, 1.6, 'bp', 380 + r() * 200, 6, 0.25, { att: 0.3 }); b.room(0.25, 1.5); }],
      hurt: [0.8, 0.85, (b, v, r) => { b.noise(0, 0.5, 'bp', 900, 3, 0.6, { att: 0.005 }); b.thump(0, 120, 60, 0.2, 0.6); b.room(0.15); }],
      death: [2.0, 0.9, (b, v, r) => { b.throat(0, 1.6, { f: [[0, 60], [1, 30]], v: 'oux', k: 0.55, breath: 0.3, sub: 0.6, rough: 0.8, jit: 0.1, att: 0.05, rel: 0.6 }); b.thump(1.3, 70, 30, 0.6, 0.9); b.grains(0.2, 1.2, 30, 400, 2500, 2, 0.2, { fade: true }); b.room(0.25, 1.5); }],
      angry: [1.8, 0.95, (b, v, r) => { b.throat(0, 1.5, { f: [[0, 45], [0.3, 62], [1, 40]], v: 'oaro', k: 0.55, breath: 0.3, sub: 0.7, rough: 0.8, jit: 0.1, drive: 1.8, att: 0.1 }); b.noise(0, 1.4, 'bp', 300, 4, 0.35, { att: 0.2 }); b.room(0.25, 1.6); }],
    },
    m1banshee: {
      say: [2.6, 0.8, (b, v, r) => { const p = vq(r, 0.1); b.throat(0, 2.2, { f: [[0, 420 * p], [0.25, 620 * p], [0.6, 540 * p], [1, 300 * p]], v: 'ouaou', k: 1.25, breath: 0.85, vib: [6, 16], att: 0.3, rel: 0.5 }); b.hiss(0.2, 1.8, { bands: [[1800, 3, 0.6], [3600, 4, 0.4]], gain: 0.25, att: 0.4, am: [[1.7, 0.5]] }); b.room(0.42, 2); }],
      hurt: [0.8, 0.85, (b, v, r) => { b.throat(0, 0.5, { f: [[0, 900], [0.3, 1100], [1, 700]], v: 'ie', k: 1.3, breath: 0.8, vib: [8, 20], att: 0.01, rel: 0.6 }); b.room(0.4, 1.8); }],
      death: [3.0, 0.9, (b, v, r) => { b.throat(0, 2.6, { f: [[0, 1000], [0.3, 800], [1, 120]], v: 'iaou', k: 1.25, breath: 0.85, vib: [6, 24], att: 0.02, rel: 0.7 }); b.room(0.45, 2); }],
      angry: [3.0, 1.0, (b, v, r) => { b.throat(0, 2.6, { f: [[0, 600], [0.15, 1300], [0.6, 1500], [1, 400]], v: 'iaii', k: 1.3, breath: 0.7, vib: [9, 40], drive: 1.6, att: 0.05, rel: 0.3 }); b.hiss(0, 2.4, { bands: [[3000, 2, 1], [6000, 2, 0.6]], gain: 0.45, att: 0.1, am: [[9, 0.4]] }); b.room(0.4, 2); }],
    },
    m1wisp: {
      say: [1.2, 0.55, (b, v, r) => { for (let i = 0; i < 4; i++) b.modes(i * 0.18 + r() * 0.05, [[1400 + r() * 900, 0.25, 1], [2800 + r() * 900, 0.12, 0.4]], 0.18); for (let i = 0; i < 6; i++) b.noise(r() * 1.0, 0.006, 'bp', 3000 + r() * 4000, 3, 0.3); b.room(0.3, 1.5); }],
      hurt: [0.4, 0.7, (b, v, r) => { b.noise(0, 0.15, 'hp', 3000, 0.7, 0.6, { att: 0.001 }); b.modes(0, [[2200, 0.1, 1]], 0.3); }],
      death: [1.2, 0.8, (b, v, r) => { b.modes(0, [[1800, 0.8, 1], [900, 1.0, 0.6]], 0.4, { droop: -0.6 }); b.grains(0, 0.9, 30, 2000, 8000, 2, 0.2, { fade: true }); b.room(0.35, 1.6); }],
    },
    m1pixie: {
      say: [0.9, 0.55, (b, v, r) => { const p = vq(r, 0.15); let t = 0; for (let i = 0; i < 4; i++) { b.throat(t, 0.09, { f: [[0, 1400 * p], [1, 1650 * p]], v: 'ie', k: 2.0, breath: 0.45, att: 0.005, rel: 0.6, open: 0.4 }); t += 0.1 + r() * 0.04; } for (let i = 0; i < 5; i++) b.modes(r() * 0.7, [[3000 + r() * 2500, 0.15, 1]], 0.08); }],
      hurt: [0.35, 0.7, (b, v, r) => { b.throat(0, 0.18, { f: [[0, 2000], [1, 1500]], v: 'ie', k: 2.1, breath: 0.5, att: 0.004, rel: 0.6 }); }],
      death: [0.9, 0.75, (b, v, r) => { b.throat(0, 0.4, { f: [[0, 2200], [1, 900]], v: 'iex', k: 2.1, breath: 0.6, att: 0.004, rel: 0.7 }); b.grains(0.1, 0.7, 24, 3000, 9000, 2, 0.15, { fade: true }); }],
    },
    m1dryad: {
      say: [1.6, 0.6, (b, v, r) => { const p = vq(r, 0.12); b.throat(0, 1.2, { f: [[0, 300 * p], [0.4, 360 * p], [1, 280 * p]], v: 'aou', k: 1.2, breath: 0.75, vib: [4.5, 6], att: 0.25, rel: 0.5 }); b.noise(0, 1.3, 'bp', 2500, 1, 0.08, { att: 0.4 }); b.room(0.3, 1.4); }],
      hurt: [0.5, 0.75, (b, v, r) => { b.throat(0, 0.3, { f: [[0, 520], [1, 400]], v: 'ae', k: 1.2, breath: 0.7, att: 0.01, rel: 0.6 }); }],
      death: [1.6, 0.8, (b, v, r) => { b.throat(0, 1.3, { f: [[0, 480], [1, 180]], v: 'aou', k: 1.2, breath: 0.8, vib: [5, 8], att: 0.02, rel: 0.7 }); b.grains(0.3, 1.0, 30, 1500, 5000, 2, 0.12, { fade: true }); b.room(0.3, 1.4); }],
    },
    m1pipes: {
      say: [2.4, 0.5, (b, v, r) => { const sc = [523, 587, 659, 784, 880, 1047]; let t = 0; for (let i = 0; i < 9; i++) { const f = sc[Math.floor(r() * sc.length)], d = 0.16 + r() * 0.12; b.modes(t, [[f, d * 1.4, 1], [f * 2, d * 0.6, 0.2]], 0.2); b.noise(t, d, 'bp', f, 30, 0.22, { att: 0.03 }); t += d; } b.room(0.25, 1.2); }],
    },
  });
}
}
