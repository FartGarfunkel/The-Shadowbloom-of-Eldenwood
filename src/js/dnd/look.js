// ---------------------------------------------------------------------------
// dnd/look.js — a character's looks, painted into a 64×64 player skin.
//
// The creator edits a look (species, body, skin, face, hair, beard, markings, horns,
// outfit and its colours); dndPaintSkin(look) paints it into the same skin format any
// Minecraft skin uses, so it works everywhere a skin does: first person, third person,
// split screen, and for the friends you play with over the network. The outer layer
// (hair volume, hoods, horns, tusks, a snout, ears) stands out in 3D like a skin's
// second layer. Campaign NPCs are painted with the same code.
// ---------------------------------------------------------------------------

const LOOK_HAIR = [['bald', 'Bald'], ['short', 'Short'], ['crop', 'Cropped'], ['long', 'Long'], ['tail', 'Ponytail'], ['braids', 'Braids'], ['mohawk', 'Crest'], ['bun', 'Topknot'], ['curly', 'Curly'], ['sides', 'Shaved sides'], ['wild', 'Wild mane']];
const LOOK_BEARD = [['none', 'None'], ['stubble', 'Stubble'], ['short', 'Short'], ['long', 'Long'], ['braided', 'Braided'], ['moustache', 'Moustache']];
const LOOK_EYES = [['round', 'Round'], ['narrow', 'Narrow'], ['wide', 'Wide'], ['slit', 'Slit'], ['glow', 'Glowing']];
const LOOK_MOUTH = [['plain', 'Plain'], ['smile', 'Smile'], ['stern', 'Stern'], ['grin', 'Grin']];
const LOOK_MARKS = [['none', 'None'], ['freckles', 'Freckles'], ['scar', 'Scar'], ['paint', 'War paint'], ['tattoo', 'Markings'], ['blush', 'Rosy cheeks']];
const LOOK_HORNS = [['none', 'None'], ['curled', 'Curled'], ['ram', 'Ram'], ['straight', 'Straight'], ['small', 'Nubs']];
const LOOK_EARS = [['round', 'Round'], ['pointed', 'Pointed'], ['long', 'Long pointed']];
const LOOK_OUTFITS = {
  gambeson: { name: 'Gambeson & tabard', cols: ['#8a6a4a', '#3a5a9a', '#4a3a2a', '#3a2414'] },
  furs: { name: 'Furs & leathers', cols: ['#8a6a42', '#5a4030', '#4a3424', '#2a1a10'] },
  doublet: { name: 'Doublet & sash', cols: ['#9a3a6a', '#e8c040', '#3a2a4a', '#3a2414'] },
  vestments: { name: 'Vestments', cols: ['#e8e0c8', '#c8a040', '#7a6a50', '#4a3424'] },
  leafrobe: { name: 'Leaf robe', cols: ['#4a7a2a', '#8a6a3a', '#3a4a22', '#4a3424'] },
  wraps: { name: 'Monk wraps', cols: ['#c87a2a', '#6a2a1a', '#8a5a2a', '#3a2414'] },
  surcoat: { name: 'Surcoat over mail', cols: ['#e8e8f0', '#c8a040', '#7a7a84', '#4a4a54'] },
  ranger: { name: 'Hooded ranger', cols: ['#3a5a2a', '#6a4a2a', '#4a3a2a', '#3a2414'] },
  shadow: { name: 'Shadow leathers', cols: ['#2a2a32', '#6a2a2a', '#1e1e24', '#141418'] },
  silks: { name: 'Silken robe', cols: ['#a02a3a', '#e8c040', '#5a1a2a', '#2a1a10'] },
  pact: { name: 'Pact robe', cols: ['#2a1a3a', '#8a3ac0', '#1e1428', '#141018'] },
  archrobe: { name: 'Wizard robe', cols: ['#2a3a8a', '#e8d070', '#1e2a5a', '#2a1a10'] },
  traveller: { name: 'Traveller', cols: ['#7a6a4a', '#5a7a5a', '#4a4a3a', '#3a2414'] },
  noble: { name: 'Fine clothes', cols: ['#4a2a6a', '#e8c040', '#2a2a3a', '#1a1a1a'] },
  peasant: { name: 'Plain clothes', cols: ['#9a8a6a', '#6a5a3a', '#5a4a3a', '#3a2a1a'] },
};
const LOOK_CLASS_OUTFIT = { barbarian: 'furs', bard: 'doublet', cleric: 'vestments', druid: 'leafrobe', fighter: 'gambeson', monk: 'wraps', paladin: 'surcoat', ranger: 'ranger', rogue: 'shadow', sorcerer: 'silks', warlock: 'pact', wizard: 'archrobe' };
const LOOK_HAIR_COLS = ['#141414', '#2a1a10', '#4a2c18', '#6a4020', '#8a5a2a', '#b07a3a', '#d8b060', '#f0e0a0', '#e8e8e8', '#9a9a9a', '#8a2a14', '#c84a1a', '#3a5ab0', '#2a8a6a', '#8a3ac0', '#e86aa0'];
const LOOK_EYE_COLS = ['#3a5ab0', '#3a7a4a', '#6a4a2a', '#2a2a2a', '#5a8ab0', '#7a6a3a', '#c8a020', '#e04040', '#a060e0', '#e8e8f0'];
const LOOK_HORN_COLS = ['#2a2a30', '#5a4a3a', '#8a7a6a', '#d8c8a8', '#6a2a2a', '#3a2a4a'];

// a starting look for a species and class (a new random face each time you ask)
function dndDefaultLook(species, cls, seed) {
  const R = mulberry32(((seed ?? Math.random() * 1e9) >>> 0) || 1), pick = (a) => a[Math.floor(R() * a.length)];
  const Sp = DND_SPECIES[species] || DND_SPECIES.human, L = Sp.look || {};
  const o = LOOK_CLASS_OUTFIT[cls] || 'traveller';
  const look = {
    species, body: R() < 0.5 ? 'broad' : 'slim', skin: pick(L.skins || NPC_SKIN_TONES),
    hair: species === 'dragonborn' ? 'bald' : species === 'goliath' && R() < 0.6 ? 'bald' : pick(['short', 'crop', 'long', 'tail', 'braids', 'curly', 'sides', 'bun', 'wild']),
    hairCol: pick(species === 'elf' ? ['#f0e0a0', '#d8b060', '#e8e8e8', '#141414', '#8a2a14', '#2a1a10'] : LOOK_HAIR_COLS.slice(0, 12)),
    beard: L.beard ? pick(['long', 'braided', 'short']) : species === 'elf' || species === 'dragonborn' || species === 'tiefling' ? 'none' : R() < 0.35 ? pick(['stubble', 'short', 'long', 'moustache']) : 'none',
    eyes: species === 'dragonborn' ? 'slit' : species === 'tiefling' ? 'glow' : pick(['round', 'narrow', 'wide']), eyeCol: species === 'dragonborn' ? '#c8a020' : species === 'tiefling' ? pick(['#c8a020', '#e04040', '#e8e8f0']) : pick(LOOK_EYE_COLS.slice(0, 6)),
    mouth: pick(['plain', 'smile', 'stern']), marks: species === 'goliath' ? 'tattoo' : R() < 0.25 ? pick(['freckles', 'scar', 'blush']) : 'none',
    horns: L.horns ? pick(['curled', 'ram', 'straight']) : 'none', hornCol: pick(LOOK_HORN_COLS),
    ears: L.ears === 'pointed' ? 'pointed' : 'round', tusks: !!L.tusks, snout: !!L.snout, scales: !!L.scales, tail: !!L.tail,
    outfit: o, cols: LOOK_OUTFITS[o].cols.slice(), hood: cls === 'ranger' || cls === 'warlock' || cls === 'rogue' ? R() < 0.5 : false, cloak: ['ranger', 'wizard', 'warlock', 'paladin', 'druid'].includes(cls),
    hat: cls === 'wizard' ? 'wizard' : cls === 'bard' ? 'feather' : cls === 'druid' ? 'circlet' : 'none',
  };
  if (species === 'gnome') look.nose = true;
  return look;
}

function dndPaintSkin(look) {
  const L = Object.assign(dndDefaultLook(look.species || 'human', null, 7), look);
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  const R = mulberry32(((L.seed || 0) * 2654435761 >>> 0) || 99991);
  const H = (c) => typeof c === 'string' ? hexRGB(c) : c;
  const put = (x, y, c, v = 0.06) => { if (!c) return; const k = 1 + (R() - 0.5) * v; g.fillStyle = `rgb(${clamp(c[0] * k, 0, 255) | 0},${clamp(c[1] * k, 0, 255) | 0},${clamp(c[2] * k, 0, 255) | 0})`; g.fillRect(x, y, 1, 1); };
  const box = (u, v, w, h, d, fn) => {
    const faces = { top: [u + d, v, w, d], bottom: [u + d + w, v, w, d], right: [u, v + d, d, h], front: [u + d, v + d, w, h], left: [u + d + w, v + d, d, h], back: [u + d + w + d, v + d, w, h] };
    for (const [f, [x0, y0, fw, fh]] of Object.entries(faces)) for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) put(x0 + x, y0 + y, fn(f, x, y, fw, fh));
  };
  const dark = (c, k = 0.72) => c.map(q => q * k), light = (c, k = 1.22) => c.map(q => Math.min(255, q * k));
  const skin = H(L.skin), hair = H(L.hairCol), eye = H(L.eyeCol), beardC = H(L.beardCol || L.hairCol);
  const [cMain, cTrim, cLegs, cBoots] = (L.cols || LOOK_OUTFITS[L.outfit].cols).map(H);
  const scaleTint = (x, y) => L.scales ? ((x + y) % 2 === 0 ? dark(skin, 0.86) : skin) : skin;
  const white = [242, 240, 232], slim = L.body === 'slim';
  const hs = L.hair, bald = hs === 'bald' || L.snout && hs === 'bald';
  // ---- the head ----
  box(0, 0, 8, 8, 8, (f, x, y) => {
    const sk = scaleTint(x, y);
    if (f === 'top') return bald ? (L.snout ? dark(sk, 0.9) : sk) : hs === 'sides' || hs === 'mohawk' ? (x >= 2 && x <= 5 ? hair : sk) : hair;
    if (f === 'bottom') return ['long', 'braided'].includes(L.beard) ? beardC : sk;
    if (f === 'back') {
      if (bald) return sk;
      if (['long', 'tail', 'braids', 'wild', 'curly'].includes(hs)) return hair;
      if (hs === 'mohawk') return x >= 3 && x <= 4 ? hair : sk;
      return y < (hs === 'crop' ? 3 : hs === 'sides' ? 4 : 6) ? hair : sk;
    }
    if (f === 'front') {
      // hairline
      if (!bald && y === 0 && hs !== 'mohawk' && hs !== 'sides') return hair;
      if (!bald && y === 1 && ['long', 'wild', 'curly', 'braids', 'short'].includes(hs) && (x <= 1 || x >= 6 || (hs === 'wild' && x % 3 === 0))) return hair;
      if (!bald && (hs === 'long' || hs === 'wild' || hs === 'braids') && (x === 0 || x === 7) && y < 6) return hair;
      // brows
      if (y === 2) { if ((x >= 1 && x <= 2) || (x >= 5 && x <= 6)) return L.species === 'orc' || L.species === 'dwarf' ? dark(beardC, 0.8) : L.snout ? dark(sk, 0.8) : dark(hair, 0.85); return sk; }
      // eyes (row 3: the blink row)
      if (y === 3) {
        const E = L.eyes;
        if (E === 'glow') return (x === 1 || x === 2 || x === 5 || x === 6) ? light(eye, 1.4) : sk;
        if (E === 'slit') return x === 1 || x === 6 ? eye : x === 2 || x === 5 ? [20, 16, 12] : sk;
        if (E === 'narrow') return x === 2 || x === 5 ? eye : x === 1 || x === 6 ? dark(sk, 0.82) : sk;
        if (E === 'wide') return x === 1 || x === 6 ? white : x === 2 || x === 5 ? eye : sk;
        return x === 1 || x === 6 ? white : x === 2 || x === 5 ? eye : sk;
      }
      if (y === 4) {
        if (L.eyes === 'wide' && (x === 1 || x === 2 || x === 5 || x === 6)) return x === 2 || x === 5 ? dark(eye, 0.7) : white;
        if (x === 3 || x === 4) return L.nose ? dark(sk, 0.8) : L.snout ? dark(sk, 0.78) : dark(sk, 0.88);
        if (L.marks === 'freckles' && (x === 1 || x === 6 || x === 2) && R() < 0.6) return dark(sk, 0.78);
        if (L.marks === 'blush' && (x === 1 || x === 6)) return [Math.min(255, sk[0] * 1.12), sk[1] * 0.82, sk[2] * 0.82];
        if (L.marks === 'paint' && (x <= 2 || x >= 5)) return H('#c03030');
        if (L.marks === 'tattoo' && (x === 1 || x === 6)) return dark(sk, 0.6);
        if (L.marks === 'scar' && x === 5) return [Math.min(255, sk[0] * 1.15), sk[1] * 0.75, sk[2] * 0.75];
        if (L.beard === 'stubble' && (x === 0 || x === 7)) return dark(beardC, 1.1);
        return sk;
      }
      if (y === 5) {
        if (L.marks === 'scar' && x === 5) return [Math.min(255, sk[0] * 1.15), sk[1] * 0.75, sk[2] * 0.75];
        if (['short', 'long', 'braided', 'moustache'].includes(L.beard) && x >= 1 && x <= 6) return x >= 2 && x <= 5 ? beardC : (L.beard === 'moustache' ? sk : beardC);
        const m = L.mouth, mc = dark(sk, 0.58);
        if (L.tusks && (x === 2 || x === 5)) return white;
        if (m === 'smile') return x === 2 || x === 5 ? mc : x === 3 || x === 4 ? dark(sk, 0.68) : sk;
        if (m === 'grin') return x >= 2 && x <= 5 ? (x === 3 || x === 4 ? white : mc) : sk;
        if (m === 'stern') return x >= 2 && x <= 5 ? dark(sk, 0.66) : sk;
        return x >= 3 && x <= 4 ? mc : sk;
      }
      if (y >= 6) {
        if (L.beard === 'stubble' && R() < 0.5) return dark(beardC, 1.15);
        if (['short', 'long', 'braided'].includes(L.beard)) { if (y === 7 && L.beard === 'short' && (x < 2 || x > 5)) return sk; return beardC; }
        if (L.tusks && y === 6 && (x === 2 || x === 5)) return white;
        if (L.mouth === 'smile' && y === 6 && x >= 3 && x <= 4) return dark(sk, 0.6);
        return sk;
      }
      return sk;
    }
    // the sides: hair over the ears
    const front = f === 'right' ? x >= 5 : x <= 2;
    const earX = f === 'right' ? 4 : 3;
    if (L.ears !== 'round' && (y === 3 || y === 4) && x === earX) return light(sk, 1.08);
    if (!bald) {
      if (hs === 'sides' || hs === 'mohawk') { if (y < 1) return hair; }
      else {
        const lenH = ['long', 'wild', 'braids', 'curly'].includes(hs) ? 8 : hs === 'crop' ? 2 : hs === 'tail' || hs === 'bun' ? 3 : 4;
        if (y < lenH && !(front && y >= 2 && !['long', 'wild'].includes(hs))) return hair;
      }
    }
    if (['short', 'long', 'braided'].includes(L.beard) && y >= 5 && front) return beardC;
    if (L.marks === 'tattoo' && y >= 4 && y <= 6 && x % 2 === 0) return dark(sk, 0.62);
    return y < 1 && !bald ? hair : scaleTint(x, y);
  });
  // ---- the outer layer of the head: hair volume, hood, hats, horns, tusks, snout, ears ----
  const HO = (fn) => box(32, 0, 8, 8, 8, fn);
  const hornC = H(L.hornCol || '#2a2a30');
  HO((f, x, y) => {
    if (L.hood) { const hc = cMain; if (f === 'bottom') return null; if (f === 'front') return y < 2 || x === 0 || x === 7 ? (y === 0 || x === 0 || x === 7 ? hc : dark(hc, 0.85)) : null; return hc; }
    // horns rise from the brow
    if (L.horns && L.horns !== 'none') {
      const Hn = L.horns;
      if (f === 'top' && (x === 1 || x === 6) && y >= 4 && y <= 6) return hornC;
      if (f === 'front' && y === 0 && (x === 1 || x === 6)) return hornC;
      if (Hn === 'ram' && (f === 'right' || f === 'left') && y >= 0 && y <= 3 && x >= 2 && x <= 5 && (y === 0 || x === (f === 'right' ? 5 : 2) || y === 3)) return y === 3 ? dark(hornC, 0.8) : hornC;
      if (Hn === 'curled' && (f === 'right' || f === 'left') && y <= 1 && x >= 3 && x <= 5) return hornC;
      if (Hn === 'straight' && f === 'top' && (x === 1 || x === 6) && y >= 3) return light(hornC, 1.1);
      if (Hn === 'small' && f === 'top' && (x === 2 || x === 5) && y === 5) return hornC;
    }
    // a hat
    if (L.hat === 'wizard') { const hc = cMain; if (f === 'top') return (x + y) % 5 === 0 ? H(L.cols ? L.cols[1] : '#e8d070') : hc; if (f !== 'bottom' && y < 2) return y === 1 ? H(L.cols ? L.cols[1] : '#e8d070') : hc; }
    if (L.hat === 'feather') { const hc = cTrim; if (f === 'top' && x >= 1 && x <= 6) return hc; if (f !== 'bottom' && y === 0) return hc; if (f === 'right' && y === 1 && x >= 2 && x <= 5) return H('#e84a2a'); }
    if (L.hat === 'circlet') { if (f !== 'top' && f !== 'bottom' && y === 1) return x % 3 === 0 ? H('#5ac03a') : H('#8a6a3a'); }
    if (L.hat === 'crown') { if (f !== 'top' && f !== 'bottom' && (y === 0 || y === 1)) return y === 0 && x % 2 ? null : H('#e8c040'); }
    if (L.hat === 'hood' && f !== 'bottom') { if (f === 'front') return y < 2 || x === 0 || x === 7 ? cMain : null; return cMain; }
    // hair that stands out from the head
    if (!bald) {
      if (hs === 'wild' && f !== 'bottom' && f !== 'front' && R() < 0.75) return hair;
      if (hs === 'wild' && f === 'front' && y === 0) return hair;
      if (hs === 'curly' && (f === 'top' || ((f === 'left' || f === 'right' || f === 'back') && y < 5)) && R() < 0.6) return light(hair, 1.08);
      if (hs === 'mohawk' && f === 'top' && x >= 3 && x <= 4) return hair;
      if (hs === 'mohawk' && (f === 'front' || f === 'back') && y === 0 && x >= 3 && x <= 4) return hair;
      if (hs === 'bun' && f === 'top' && x >= 3 && x <= 4 && y >= 5) return hair;
      if (hs === 'tail' && f === 'back' && x >= 3 && x <= 4 && y >= 2) return hair;
      if (hs === 'braids' && f === 'back' && (x === 2 || x === 5) && y >= 2) return y % 2 ? dark(hair, 0.85) : hair;
      if (hs === 'long' && f === 'back' && y >= 6) return hair;
    }
    // a snout (the front of the head pushed out), and tusks, and ears that stand out
    if (L.snout && f === 'front' && y >= 4 && x >= 1 && x <= 6) return y === 4 && (x === 2 || x === 5) ? [30, 20, 18] : scaleTint(x, y);
    if (L.tusks && f === 'front' && y === 5 && (x === 1 || x === 6)) return white;
    if (L.ears === 'long' && (f === 'right' || f === 'left') && (y === 2 || y === 3) && x === (f === 'right' ? 4 : 3)) return light(skin, 1.05);
    if (['long', 'braided'].includes(L.beard) && f === 'front' && y >= 6) return L.beard === 'braided' && x % 3 === 1 ? H('#c8a040') : beardC;
    if (L.beard === 'braided' && f === 'bottom' && x >= 2 && x <= 5) return beardC;
    return null;
  });
  // ---- the body: the outfit ----
  const O = L.outfit;
  const robe = ['vestments', 'leafrobe', 'silks', 'pact', 'archrobe'].includes(O);
  const bareArms = O === 'furs' || O === 'wraps';
  box(16, 16, 8, 12, 4, (f, x, y, w, h) => {
    if (f === 'top') return cMain;
    if (f === 'bottom') return robe ? cMain : cLegs;
    if (O === 'furs') { if (f === 'front' && x >= 2 && x <= 5 && y < 8) return scaleTint(x, y); if (y === 8) return H('#3a2a1a'); return R() < 0.3 ? dark(cMain, 0.85) : cMain; }
    if (O === 'wraps' && f === 'front' && (x === y % 8 || x === 7 - (y % 8)) && y < 7) return cTrim;
    if (y === h - 4 && !robe) return f === 'front' && (x === 3 || x === 4) ? H('#c8a040') : H('#3a2a1a');   // belt and buckle
    if (y === 7 && robe) return cTrim;                                                                     // robe sash
    if (f === 'front') {
      if (y === 0 && (x === 3 || x === 4)) return O === 'shadow' || O === 'gambeson' || O === 'ranger' ? dark(cMain, 0.8) : scaleTint(x, y);
      if (O === 'gambeson' && x >= 2 && x <= 5 && y >= 1 && y < 8) return y === 3 && (x === 3 || x === 4) ? H('#e8c040') : cTrim;
      if (O === 'surcoat' && x >= 1 && x <= 6) return (x === 3 || x === 4) && y >= 2 && y <= 5 || (y === 3 && x >= 2 && x <= 5) ? cTrim : cMain;
      if (O === 'vestments' && (x === 3 || x === 4)) return cTrim;
      if (O === 'vestments' && y === 3 && x >= 2 && x <= 5) return cTrim;
      if (O === 'doublet' && (x === y - 1 || x === y) && y < 8) return cTrim;
      if (O === 'archrobe' && R() < 0.06) return H('#f0e8a0');
      if (O === 'pact' && (x === 3 || x === 4) && y > 1) return cTrim;
      if (O === 'silks' && x === 3 + (y % 2)) return cTrim;
      if (O === 'noble' && (x === 3 || x === 4) && y % 2 === 0) return H('#e8c040');
      if (O === 'ranger' && (x === 1 || x === 6)) return dark(cMain, 0.82);
    }
    if (f === 'back' && L.cloak) return dark(cTrim, 0.9);
    return y === h - 1 ? dark(cMain, 0.8) : (O === 'shadow' && R() < 0.1 ? dark(cMain, 0.8) : cMain);
  });
  // the jacket layer: a cloak, a robe's skirt over the belt, a tail
  box(16, 32, 8, 12, 4, (f, x, y) => {
    if (L.cloak && (f === 'back' || ((f === 'left' || f === 'right') && x === (f === 'right' ? 0 : 3)))) return y === 0 ? dark(cTrim, 0.85) : cTrim;
    if (L.cloak && f === 'top' && (y === 3 || x === 0 || x === 7)) return cTrim;
    if (L.tail && f === 'back' && x >= 3 && x <= 4 && y >= 8) return scaleTint(x, y);
    if (O === 'surcoat' && f === 'front' && x >= 1 && x <= 6 && y >= 8) return cMain;
    return null;
  });
  // ---- arms ----
  const aw = slim ? 3 : 4;
  const arm = (side) => (f, x, y) => {
    if (f === 'top') return bareArms ? skin : cMain;
    if (f === 'bottom') return skin;
    if (bareArms) return y >= 8 && y <= 10 ? H(O === 'furs' ? '#5a3a20' : L.cols[1]) : scaleTint(x, y);   // bracers or wraps
    const sleeve = robe ? 11 : O === 'doublet' ? 9 : 8;
    if (y < sleeve) return O === 'surcoat' && y > 3 ? H('#8a8a94') : O === 'doublet' && y > 3 ? light(cMain, 1.12) : y === sleeve - 1 ? dark(cMain, 0.8) : cMain;
    if ((O === 'ranger' || O === 'shadow') && y < 11) return H('#5a3a20');   // bracers
    return scaleTint(x, y);
  };
  box(40, 16, aw, 12, 4, arm('r')); box(32, 48, aw, 12, 4, arm('l'));
  // gauntlets and robe cuffs on the sleeve layer
  if (O === 'surcoat' || O === 'archrobe' || O === 'silks') { const cuff = O === 'surcoat' ? H('#a8a8b4') : cTrim; box(40, 32, aw, 12, 4, (f, x, y) => f !== 'top' && f !== 'bottom' && y === (O === 'surcoat' ? 9 : 10) ? cuff : null); box(48, 48, aw, 12, 4, (f, x, y) => f !== 'top' && f !== 'bottom' && y === (O === 'surcoat' ? 9 : 10) ? cuff : null); }
  // ---- legs ----
  const leg = (f, x, y) => {
    if (f === 'top') return robe ? cMain : cLegs;
    if (f === 'bottom') return O === 'wraps' ? skin : cBoots;
    if (y >= (O === 'wraps' ? 11 : 9)) return O === 'wraps' ? (y === 11 ? H('#8a6a3a') : skin) : y === 9 ? light(cBoots, 1.15) : cBoots;
    if (robe) return y === 8 ? dark(cMain, 0.8) : (O === 'archrobe' && R() < 0.05 ? H('#f0e8a0') : cMain);
    if (O === 'furs' && y < 4) return R() < 0.4 ? dark(cMain, 0.9) : cMain;
    return cLegs;
  };
  box(0, 16, 4, 12, 4, leg); box(16, 48, 4, 12, 4, leg);
  if (robe) for (const [u, v] of [[0, 32], [0, 48]]) box(u, v, 4, 12, 4, (f, x, y) => f !== 'top' && f !== 'bottom' && y < 8 ? (y === 7 ? dark(cMain, 0.82) : cMain) : null);
  return cv;
}
function dndSkinURL(look) { return dndPaintSkin(look).toDataURL('image/png'); }

// ---- a paper doll from a skin: front, right, back, left -----------------------------------------------------------------------
function dndDrawDoll(cv, skin, view = 0, slim) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = false;
  const s = Math.floor(Math.min(W / 18, H / 34)), ox = Math.floor(W / 2), oy = Math.floor((H - 32 * s) / 2);
  const aw = slim ? 3 : 4;
  // [u, v, w, h] of a face on the skin, then where it goes (x offset from the middle, y), mirrored for the back
  const F = (part, face) => {
    const P = { head: [0, 0, 8, 8, 8], body: [16, 16, 8, 12, 4], rarm: [40, 16, aw, 12, 4], larm: [32, 48, aw, 12, 4], rleg: [0, 16, 4, 12, 4], lleg: [16, 48, 4, 12, 4] }[part];
    const [u, v, w, h, d] = P;
    return { front: [u + d, v + d, w, h], back: [u + d + w + d, v + d, w, h], right: [u, v + d, d, h], left: [u + d + w, v + d, d, h] }[face];
  };
  const O = { head: [32, 0, 8, 8, 8], body: [16, 32, 8, 12, 4], rarm: [40, 32, aw, 12, 4], larm: [48, 48, aw, 12, 4], rleg: [0, 32, 4, 12, 4], lleg: [0, 48, 4, 12, 4] };
  const FO = (part, face) => { const [u, v, w, h, d] = O[part]; return { front: [u + d, v + d, w, h], back: [u + d + w + d, v + d, w, h], right: [u, v + d, d, h], left: [u + d + w, v + d, d, h] }[face]; };
  const draw = (part, face, dx, dy, shade = 1, flip = false) => {
    for (const fr of [F(part, face), FO(part, face)]) {
      const [u, v, w, h] = fr;
      g.save(); g.globalAlpha = 1;
      if (flip) { g.translate(ox + dx * s + w * s, oy + dy * s); g.scale(-1, 1); g.drawImage(skin, u, v, w, h, 0, 0, w * s, h * s); }
      else g.drawImage(skin, u, v, w, h, ox + dx * s, oy + dy * s, w * s, h * s);
      g.restore();
    }
    if (shade !== 1) { g.fillStyle = `rgba(0,0,0,${1 - shade})`; const [u, v, w, h] = F(part, face); g.fillRect(ox + dx * s, oy + dy * s, w * s, h * s); }
  };
  const v4 = ((view % 4) + 4) % 4;
  if (v4 === 0) { draw('head', 'front', -4, 0); draw('rarm', 'front', -4 - aw, 8); draw('body', 'front', -4, 8); draw('larm', 'front', 4, 8); draw('rleg', 'front', -4, 20); draw('lleg', 'front', 0, 20); }
  else if (v4 === 2) { draw('head', 'back', -4, 0); draw('larm', 'back', -4 - aw, 8); draw('body', 'back', -4, 8); draw('rarm', 'back', 4, 8); draw('lleg', 'back', -4, 20); draw('rleg', 'back', 0, 20); }
  else if (v4 === 1) { draw('head', 'right', -4, 0); draw('rleg', 'right', -2, 20); draw('body', 'right', -2, 8, 0.85); draw('rarm', 'right', -2, 8); }
  else { draw('head', 'left', -4, 0); draw('lleg', 'left', -2, 20); draw('body', 'left', -2, 8, 0.85); draw('larm', 'left', -2, 8); }
}

// ---- names, by species -----------------------------------------------------------------------------------------------------
const DND_NAMES = {
  human: [['Aldric', 'Bran', 'Cedric', 'Dorian', 'Edmund', 'Gareth', 'Hal', 'Rowan', 'Tobias', 'Wren', 'Elena', 'Mara', 'Isolde', 'Lysa', 'Bryony', 'Tamsin', 'Ada', 'Corin'], ['Ashford', 'Blackwood', 'Carver', 'Dale', 'Fletcher', 'Hollow', 'Marsh', 'Thorne', 'Vale', 'Woods']],
  elf: [['Aelith', 'Caelira', 'Erevir', 'Faelan', 'Ilyse', 'Liora', 'Naevys', 'Rolan', 'Sariel', 'Thalor', 'Valith', 'Ynara', 'Elowen', 'Galen'], ['Brightleaf', 'Dawnwhisper', 'Moonbrook', 'Silverbough', 'Starfall', 'Windsong', 'Willowmere']],
  dwarf: [['Brannoc', 'Dorrin', 'Ebrak', 'Gorrim', 'Harvek', 'Thrain', 'Vondur', 'Amra', 'Bardis', 'Eldra', 'Helga', 'Ristra', 'Torva', 'Vala'], ['Anvilsong', 'Coppervein', 'Deepdelve', 'Flintbrow', 'Ironmantle', 'Stonebeard', 'Hammerfell']],
  halfling: [['Alby', 'Cade', 'Eldo', 'Garret', 'Milo', 'Perrin', 'Rosco', 'Wellan', 'Andra', 'Bree', 'Callie', 'Kitty', 'Lavender', 'Merra', 'Posy'], ['Applebarrel', 'Goodbrook', 'Greenhill', 'Hearthfoot', 'Tealeaf', 'Thistledown', 'Underhedge']],
  gnome: [['Alby', 'Bimble', 'Dimwick', 'Fonzel', 'Glim', 'Orrick', 'Zook', 'Bippa', 'Carlo', 'Ellabell', 'Nissa', 'Orla', 'Roswyn', 'Zanna'], ['Cogwhistle', 'Fizzlebang', 'Gearspark', 'Nackleby', 'Pebblepocket', 'Tinkertop', 'Wobblesprocket']],
  dragonborn: [['Arzhan', 'Balthar', 'Dovrek', 'Ghessa', 'Krivos', 'Medros', 'Nadrak', 'Rhovan', 'Akrisa', 'Birra', 'Darra', 'Hesk', 'Kavra', 'Soriel', 'Thessa'], ['of Clan Emberscale', 'of Clan Ashmaw', 'of Clan Stormcrest', 'of Clan Frostfang', 'of Clan Gildwing', 'of Clan Venomtail']],
  orc: [['Durg', 'Feng', 'Gorl', 'Holga', 'Imra', 'Krull', 'Mhorra', 'Shuma', 'Thokka', 'Bagga', 'Emra', 'Kansa', 'Ovra', 'Sutha', 'Volga'], ['Bonebreaker', 'Ironhide', 'Ashfang', 'Stormfang', 'Tuskwood']],
  tiefling: [['Akmar', 'Damos', 'Ekorin', 'Kairon', 'Morvas', 'Skorn', 'Brisa', 'Kallis', 'Makara', 'Nemia', 'Oriel', 'Rietta'], ['Ash', 'Hope', 'Quest', 'Sorrow', 'Ember', 'Vesper', 'Solace']],
  goliath: [['Aukar', 'Eglan', 'Gaal', 'Keoth', 'Lokar', 'Mavet', 'Thotar', 'Vimar', 'Kuora', 'Nalla', 'Orila', 'Paava'], ['Peakwalker', 'Stoneheart', 'Cloudreacher', 'Ridgebound', 'Skyhammer']],
};
function dndRandomName(species) { const N = DND_NAMES[species] || DND_NAMES.human, f = N[0][Math.floor(Math.random() * N[0].length)], l = N[1][Math.floor(Math.random() * N[1].length)]; return species === 'goliath' || species === 'tiefling' ? f + ' ' + l : f + ' ' + l; }
