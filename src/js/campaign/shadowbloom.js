// ---------------------------------------------------------------------------
// campaign/shadowbloom.js — The Shadowbloom of Eldenwood, put together.
//
// sb_world.js holds the land, creatures, things and letters; sb_act1.js, sb_act2.js and sb_act3.js the people,
// quests and dreams of each act. This makes it the campaign every new world plays.
// ---------------------------------------------------------------------------
const DEFAULT_CAMPAIGN = 'shadowbloom';
campaignDefine(SB);

// handles for the campaign validator (tools/campaign_check.py)
try { Object.assign(window.__dnd, { B, DND_SKILLS, DND_ABILITY_NAMES, LOOK_OUTFITS, LOOK_HAIR, LOOK_BEARD, LOOK_EYES, LOOK_MOUTH, LOOK_MARKS, LOOK_HORNS, LOOK_EARS, DTHEME, CAMP_SITE_KINDS, MONSTER_AI, NPC_SHOPS, VTEMPLATES: typeof VTEMPLATES !== 'undefined' ? VTEMPLATES : null }); } catch (e) { console.warn('campaign debug', e); }
try { window.__dnd_solid = (id) => !!T_SOLID[id]; window.__dnd.camp.read = (k) => campOpenBook(GAME.locals[0], k); window.__dnd.camp.solidAt = (x, y, z) => !!T_SOLID[GAME.world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z))];
  // late-bound: the versions every later module has wrapped (the ones the game itself calls)
  window.__dnd.campDo = (g, fx, lp, ctx) => campDo(g, fx, lp, ctx); window.__dnd.dndDoRest = (lp, k) => dndDoRest(lp, k); } catch (e) { /* no window */ }
