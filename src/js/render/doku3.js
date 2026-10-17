// ---------------------------------------------------------------------------
// render/doku3.js — textures for 0.6: redstone dust and torches, levers,
// repeaters and comparators, pistons, observers, dispensers and droppers,
// hoppers, lamps, daylight detectors, targets, copper bulbs, tripwire, the
// four kinds of rail and the minecarts. Same Doku painters as doku.js.
// ---------------------------------------------------------------------------

// Paint once, then register four copies turned 0/90/180/270 degrees clockwise
// (name_0 .. name_3). Used for tops whose arrows must follow the block's facing.
function addRotTiles(name, painter) {
  const src = new Px(seedFromString(name));
  painter(src);
  for (let r = 0; r < 4; r++) {
    addTile(name + '_' + r, p => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        let sx = x, sy = y;
        for (let k = 0; k < r; k++) { const t = sx; sx = sy; sy = 15 - t; }
        const c = src.get(sx, sy);
        if (c[3]) p.set(x, y, c, c[3]);
      }
    });
  }
}

function paintDokuBlocks3() {
  const H = hexRGB;
  const STONE = ramp('#9fa0a4', 7, 0.45), COB = ramp('#7c7c7e', 7, 0.5), IRON = ramp('#c8c8cc', 7, 0.45), DARK = ramp('#3e3e44', 6, 0.5);
  const WOOD = ramp('#a8834f', 7, 0.5), GOLD = ramp('#e8c040', 7, 0.45), COPPER = ramp('#c8724a', 7, 0.45);
  const RED_ON = H('#ff3a24'), RED_HI = H('#ff9a7a'), RED_OFF = H('#5a1414'), RED_OFF_HI = H('#7a2a24');

  // ---- dust: drawn grey and tinted by signal strength in the mesher ----
  addTile('redstone_dust_line', p => {
    for (let y = 0; y < 16; y++) for (let x = 5; x <= 10; x++) {
      const edge = x === 5 || x === 10;
      if (edge && p.rand() < 0.45) continue;
      p.set(x, y, grey(edge ? 0.62 : 0.78 + p.rand() * 0.22));
    }
    for (let k = 0; k < 10; k++) p.set(4 + Math.floor(p.rand() * 8), Math.floor(p.rand() * 16), grey(0.7));
  });
  addTile('redstone_spark', p => { for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 3) p.set(x, y, d < 1.6 ? RED_HI : RED_ON); } });
  addTile('redstone_dust_dot', p => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d < 3.6 || (d < 4.6 && p.rand() < 0.5)) p.set(x, y, grey(d < 2.5 ? 0.95 : 0.72 + p.rand() * 0.2));
    }
  });
  // ---- torches ----
  const rsTorch = (on) => (p) => {
    for (let y = 9; y < 16; y++) { p.set(7, y, WOOD[3]); p.set(8, y, WOOD[2]); }
    const hd = on ? [RED_HI, RED_ON] : [RED_OFF_HI, RED_OFF];
    for (let y = 6; y < 9; y++) { p.set(7, y, hd[y === 6 ? 0 : 1]); p.set(8, y, hd[1]); }
    if (on) { p.set(6, 6, RED_ON, 150); p.set(9, 6, RED_ON, 150); p.set(7, 5, RED_HI, 180); }
  };
  addTile('redstone_torch', rsTorch(true));
  addTile('redstone_torch_off', rsTorch(false));
  addTile('rs_post_on', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y < 11 ? (y === 9 ? RED_HI : RED_ON) : WOOD[y % 2 ? 2 : 3]); });
  addTile('rs_post_off', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y < 11 ? (y === 9 ? RED_OFF_HI : RED_OFF) : WOOD[y % 2 ? 2 : 3]); });
  addTile('rs_head_on', p => { p.fill(RED_ON); for (let k = 0; k < 20; k++) p.set(Math.floor(p.rand() * 16), Math.floor(p.rand() * 16), RED_HI); });
  addTile('rs_head_off', p => p.fill(RED_OFF));
  addTile('lever_handle', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, y < 2 ? WOOD[5] : WOOD[(x + y) % 3 ? 3 : 2]); });

  // ---- repeater and comparator tops (turned to face each way) ----
  const smooth = (p) => pPolished(p, STONE);
  const rsLine = (p, pts, on) => { for (const [x, y] of pts) p.set(x, y, on ? (p.rand() < 0.3 ? RED_HI : RED_ON) : RED_OFF); };
  for (const on of [true, false]) {
    addRotTiles('repeater_top_' + (on ? 'on' : 'off'), p => {
      smooth(p);
      const pts = []; for (let y = 3; y < 15; y++) pts.push([7, y], [8, y]);
      rsLine(p, pts, on);
      // arrow head at the output end, delay notches along the side
      for (const [x, y] of [[6, 2], [9, 2], [5, 3], [10, 3]]) p.set(x, y, STONE[1]);
      for (const y of [7, 9, 11, 13]) { p.set(3, y, STONE[1]); p.set(12, y, STONE[1]); }
    });
    addRotTiles('comparator_top_' + (on ? 'on' : 'off'), p => {
      smooth(p);
      const pts = [];
      for (let y = 4; y < 12; y++) pts.push([7, y], [8, y]);
      for (let x = 4; x < 12; x++) pts.push([x, 11]);
      for (let y = 11; y < 14; y++) pts.push([4, y], [11, y]);
      rsLine(p, pts, on);
      for (const [x, y] of [[6, 2], [9, 2], [5, 3], [10, 3]]) p.set(x, y, STONE[1]);
    });
  }

  // ---- lamps, ore, bulbs ----
  addTile('redstone_lamp', p => { pCobble(p, ramp('#7a5a36', 6, 0.5), H('#2a1c10'), 9, { mortar: 1.2 }); frameOver(p, H('#9a7a50'), H('#3a2a18')); });
  addTile('redstone_lamp_on', p => { pCobble(p, ramp('#f0c060', 6, 0.4), H('#a86a20'), 9, { mortar: 1.2 }); p.speck(H('#fff4c8'), 0.08); frameOver(p, H('#ffe8a0'), H('#a86a20')); });
  addTile('redstone_ore_lit', p => pOre(p, ramp('#9a9a9e', 7, 0.5), '#ff4a3a', { n: 7 }));
  const bulb = (lit) => (p) => {
    pMetal(p, COPPER);
    for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) {
      const d = Math.hypot(x - 7.5, y - 7.5);
      if (d < 4.6) p.set(x, y, lit ? shade(H('#ffd870'), 0.9 + (d < 2 ? 0.25 : 0) + p.rand() * 0.08) : shade(H('#4a3a30'), 0.9 + p.rand() * 0.1));
    }
    if (lit) for (const [x, y] of [[6, 6], [7, 5]]) p.set(x, y, H('#fff8e0'));
  };
  addTile('copper_bulb', bulb(false));
  addTile('copper_bulb_lit', bulb(true));

  // ---- observer ----
  addTile('observer_front', p => {
    pPolished(p, DARK);
    for (let x = 2; x < 14; x++) { p.set(x, 6, H('#1a1a1e')); p.set(x, 9, H('#1a1a1e')); }
    for (const x of [4, 5, 10, 11]) { p.set(x, 7, H('#a8a8b0')); p.set(x, 8, H('#6a6a72')); }
    for (let y = 2; y < 5; y++) for (let x = 3; x < 13; x++) if ((x + y) % 2) p.set(x, y, DARK[1]);
  });
  addTile('observer_back', p => { pPolished(p, DARK); for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, H('#2a0a0a')); });
  addTile('observer_back_on', p => { pPolished(p, DARK); for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, (x === 6 || y === 6) ? RED_HI : RED_ON); });
  const arrowUp = (p, col) => { for (let y = 3; y < 14; y++) { p.set(7, y, col); p.set(8, y, col); } for (let i = 0; i < 4; i++) { p.set(7 - i, 3 + i, col); p.set(8 + i, 3 + i, col); } };
  addTile('observer_side', p => { pCobble(p, COB, H('#2a2a2e'), 8); arrowUp(p, H('#c8c8cc')); });
  addTile('observer_top', p => { pPolished(p, DARK); arrowUp(p, H('#8a8a92')); });

  // ---- pistons ----
  addTile('piston_side', p => {
    pCobble(p, COB, H('#2c2c30'), 10);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(WOOD, clamp(0.5 + (y === 0 ? 0.3 : y === 3 ? -0.35 : 0) + (p.rand() - 0.5) * 0.15, 0, 0.999)));
    for (let x = 0; x < 16; x++) { p.set(x, 4, IRON[1]); p.set(x, 5, IRON[4]); }
    for (let y = 6; y < 16; y++) { p.set(7, y, IRON[2]); p.set(8, y, IRON[3]); }
  });
  addTile('piston_side_base', p => { pCobble(p, COB, H('#2c2c30'), 10); for (let y = 0; y < 16; y++) { p.set(7, y, IRON[2]); p.set(8, y, IRON[3]); } });
  const pistonFace = (sticky) => (p) => {
    pPlanks(p, WOOD);
    frameOver(p, IRON[5], IRON[1], 2);
    for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, IRON[(x + y) % 2 ? 3 : 4]);
    if (sticky) for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) if (Math.hypot(x - 7.5, y - 7.5) < 5.6) p.set(x, y, shade(H('#6ac85a'), 0.85 + p.rand() * 0.25), 245);
  };
  addTile('piston_top', pistonFace(false));
  addTile('piston_top_sticky', pistonFace(true));
  addTile('piston_bottom', p => { pCobble(p, COB, H('#2c2c30'), 9); for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) p.set(x, y, IRON[(x === 5 || y === 5) ? 5 : 2]); });
  addTile('piston_inner', p => { pCobble(p, COB, H('#2c2c30'), 9); for (let y = 3; y < 13; y++) for (let x = 3; x < 13; x++) p.set(x, y, H('#1a1a1c')); for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) p.set(x, y, WOOD[3]); });
  addTile('piston_head_side', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(WOOD, clamp(0.5 + (p.rand() - 0.5) * 0.18 + ((x + y * 3) % 7 === 0 ? -0.2 : 0), 0, 0.999))); });
  addTile('piston_rod', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(WOOD, clamp(0.45 + (x % 4 === 0 ? -0.2 : 0.05) + (p.rand() - 0.5) * 0.1, 0, 0.999))); });

  // ---- dispenser and dropper mouths (on furnace stone) ----
  const mouth = (big, vertical) => (p) => {
    paintStone(p, 'stone');
    pCobble(p, ramp('#8a8a8c', 7, 0.5), H('#3a3a3e'), 8);
    frameOver(p, H('#b8b8bc'), H('#3a3a3e'));
    if (vertical) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < (big ? 4.6 : 3.4)) p.set(x, y, d < (big ? 3.4 : 2.2) ? H('#141416') : H('#5a5a5e')); }
    } else {
      const r = big ? 4 : 3;
      for (let y = 8 - r; y < 8 + r; y++) for (let x = 8 - r; x < 8 + r; x++) p.set(x, y, (x === 8 - r || y === 8 - r) ? H('#5a5a5e') : H('#141416'));
      if (big) for (const [x, y] of [[5, 5], [10, 5], [5, 10], [10, 10]]) p.set(x, y, H('#2a2a2e'));
    }
  };
  addTile('dispenser_front', mouth(true, false));
  addTile('dispenser_front_vertical', mouth(true, true));
  addTile('dropper_front', mouth(false, false));
  addTile('dropper_front_vertical', mouth(false, true));

  // ---- hopper ----
  addTile('hopper_outside', p => pMetal(p, DARK));
  addTile('hopper_inside', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#1e1e22'), 0.9 + p.rand() * 0.15)); });
  addTile('hopper_top', p => { pMetal(p, DARK); for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) p.set(x, y, shade(H('#1e1e22'), 0.9 + p.rand() * 0.15)); });

  // ---- daylight detector, target ----
  const sensor = (tint) => (p) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const cell = (x % 5 === 0 || y % 5 === 0);
      p.set(x, y, cell ? H('#d8ccb0') : shade(H(tint), 0.85 + p.rand() * 0.2 + (x % 5 === 1 && y % 5 === 1 ? 0.25 : 0)));
    }
  };
  addTile('daylight_detector_top', sensor('#6a8ab8'));
  addTile('daylight_detector_inverted_top', sensor('#3a5a8a'));
  addTile('daylight_detector_side', p => { pPlanks(p, WOOD, { nails: false }); for (let x = 0; x < 16; x++) p.set(x, 10, WOOD[0]); });
  const hayBase = (p) => { const R = ramp('#d8b04a', 7, 0.45); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, pick(R, clamp(0.5 + Math.sin(x * 2.3 + y * 0.4) * 0.12 + (p.rand() - 0.5) * 0.15, 0, 0.999))); };
  const rings = (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 7.6) p.set(x, y, Math.floor(d) % 4 < 2 ? H('#d8202a') : H('#f4ecdc')); } };
  addTile('target_side', p => { hayBase(p); rings(p); });
  addTile('target_top', p => { hayBase(p); rings(p); });

  // ---- tripwire ----
  addTile('tripwire', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#e8e4dc'), 0.85 + p.rand() * 0.2)); });

  // ---- rails ----
  // straight: iron rails 3 px in from each side, wooden sleepers every 4 rows
  const sleeper = (p, y) => { for (let x = 1; x < 15; x++) { p.set(x, y, WOOD[2]); p.set(x, y + 1, WOOD[1]); } };
  const straightRail = (railR, centre) => (p) => {
    for (const y of [1, 5, 9, 13]) sleeper(p, y);
    if (centre) for (let y = 0; y < 16; y++) { p.set(7, y, centre); p.set(8, y, shade(centre, 0.8)); }
    for (let y = 0; y < 16; y++) for (const [x, k] of [[2, 5], [3, 3], [12, 5], [13, 3]]) p.set(x, y, railR[k - (y % 4 === 0 ? 1 : 0)]);
  };
  addTile('rail', straightRail(IRON));
  addTile('powered_rail', straightRail(GOLD, RED_OFF));
  addTile('powered_rail_on', straightRail(GOLD, RED_ON));
  addTile('activator_rail', straightRail(IRON, H('#7a3a2a')));
  addTile('activator_rail_on', straightRail(IRON, H('#ff6a3a')));
  const detector = (on) => (p) => {
    straightRail(IRON)(p);
    for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) p.set(x, y, (x === 5 || y === 5) ? STONE[5] : STONE[3]);
    for (let y = 7; y < 9; y++) for (let x = 7; x < 9; x++) p.set(x, y, on ? RED_ON : RED_OFF);
  };
  addTile('detector_rail', detector(false));
  addTile('detector_rail_on', detector(true));
  // curve: quarter circles about the bottom-right corner joining the south and east edges
  addTile('rail_corner', p => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(15.5 - x, 15.5 - y), k = Math.atan2(15.5 - y, 15.5 - x) / (Math.PI / 2) * 4, fr = k - Math.floor(k);
      if (d > 1.5 && d < 14.5 && fr > 0.25 && fr < 0.6) p.set(x, y, fr < 0.42 ? WOOD[2] : WOOD[1]);
    }
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(15.5 - x, 15.5 - y);
      if (Math.abs(d - 13) < 1.1) p.set(x, y, IRON[d < 13 ? 5 : 3]);
      if (Math.abs(d - 3) < 1.1) p.set(x, y, IRON[d < 3 ? 5 : 3]);
    }
  });

  // ---- minecarts ----
  addTile('minecart_side', p => { pMetal(p, ramp('#7a7a80', 7, 0.5)); for (let x = 0; x < 16; x++) { p.set(x, 7, IRON[1]); p.set(x, 8, IRON[4]); } });
  addTile('minecart_inside', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.set(x, y, shade(H('#4a4a50'), 0.85 + p.rand() * 0.15 + (x % 5 === 0 ? -0.15 : 0))); });
  addTile('minecart_wheel', p => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); p.set(x, y, d < 2 ? IRON[5] : d < 6 ? DARK[2] : DARK[0]); } });
}

// ---- items ------------------------------------------------------------------------------------
function paintDokuItems3() {
  const H = hexRGB;
  const I = (name, rows, pal) => addItem(name, p => p.art(rows, pal));
  const R = { r: H('#d8202a'), R: H('#ff6a5a'), s: H('#8a6438'), S: H('#b08a50'), c: H('#7c7c7e'), C: H('#a8a8aa'), k: H('#3a3a3e'), i: H('#c8c8cc'), I: H('#eeeef2'), g: H('#e8c040'), G: H('#fff0a0') };
  I('lever', ['................', '................', '........RR......', '........Rr......', '.......ss.......', '.......Ss.......', '......ss........', '......Ss........', '.....ss.........', '.....Ss.........', '...cccccccc.....', '...cCCCCCCck....', '...cCCCCCCck....', '...ckkkkkkkk....', '................', '................'], R);
  I('repeater_item', ['................', '................', '................', '....R.....R.....', '....r.....r.....', '...sS....sS.....', '...sS....sS.....', '.ccccccccccccc..', '.cCCCCrrCCCCCck.', '.cCCrrrrrrCCCck.', '.cCCCCrrCCCCCck.', '.ckkkkkkkkkkkkk.', '................', '................', '................', '................'], R);
  I('comparator_item', ['................', '................', '................', '...R....R..R....', '...r....r..r....', '..sS...sS..sS...', '..sS...sS..sS...', '.ccccccccccccc..', '.cCCrrrrrrrrCck.', '.cCCCCCrCCCCCck.', '.cCCCCCrCCCCCck.', '.ckkkkkkkkkkkkk.', '................', '................', '................', '................'], R);
  I('hopper_item', ['................', '................', '.kkkkkkkkkkkkkk.', '.kCCCCCCCCCCCCk.', '.kCkkkkkkkkkkCk.', '.kCCCCCCCCCCCCk.', '..kCCCCCCCCCCk..', '...kCCCCCCCCk...', '....kCCCCCCk....', '.....kCCCCk.....', '......kCCk......', '......kCCk......', '.......kk.......', '................', '................', '................'], { k: H('#2a2a2e'), C: H('#5a5a62') });
  I('tripwire_hook_item', ['................', '................', '......iIi.......', '.....i...i......', '.....i...i......', '......iIi.......', '.......i........', '.......i........', '.....ssSss......', '.....sSSSs......', '.....sSSSs......', '.....sSSSs......', '.....sSSSs......', '.....sssss......', '................', '................'], R);
  // minecarts: a little iron tub on wheels, with whatever it carries
  const cart = (top) => ['................', '................', '................', ...top, '.kiiiiiiiiiiiik.', '.kICCCCCCCCCCik.', '.kiCCCCCCCCCCik.', '..kiiiiiiiiiik..', '...kk......kk...', '..kWWk....kWWk..', '...kk......kk...'];
  const pal = Object.assign({ W: H('#2a2a2e') }, R);
  I('minecart', cart(['................', '................', '................']), pal);
  I('chest_minecart', cart(['....oooooooo....', '....oOOOOOOo....', '....ooOgOOoo....'], Object.assign({ o: H('#7a5228'), O: H('#b07a3c') }, pal)), Object.assign({ o: H('#7a5228'), O: H('#b07a3c') }, pal));
  I('furnace_minecart', cart(['....cccccccc....', '....cCkkkkCc....', '....cCkRrkCc....']), pal);
  I('tnt_minecart', cart(['....rrrrrrrr....', '....rIIIIIIr....', '....rrrrrrrr....']), pal);
  I('hopper_minecart', cart(['....kkkkkkkk....', '....kCCCCCCk....', '.....kCCCCk.....'], Object.assign({ C: H('#5a5a62') }, pal)), Object.assign({ C: H('#5a5a62') }, pal));
}
