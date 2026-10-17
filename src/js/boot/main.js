// ---------------------------------------------------------------------------
// boot/main.js — start the game. When Claude republishes a new version while
// you are playing, the hot hook hands us your unsaved progress so nothing is
// lost and you land back in the same world.
// ---------------------------------------------------------------------------

function fatal(msg) {
  const el = document.getElementById('fatal');
  el.hidden = false;
  el.innerHTML = '<div><h2 style="font-family:var(--font-display);font-weight:400;font-size:40px;margin:0 0 8px;color:var(--ember)">Shadowbloom can’t start here</h2><p style="color:var(--muted);max-width:52ch;margin:0 auto"></p></div>';
  el.querySelector('p').textContent = msg;
}

function start(hotData) {
  let game;
  try {
    const probe = document.createElement('canvas').getContext('webgl2');
    if (!probe) { fatal('This browser does not support WebGL 2, which the game needs for 3D. Try a recent Chrome, Edge, Firefox or Safari.'); return; }
    prepRecipes();
    game = new Game();
    window.__game = game;
    // handles for automated play-tests
    window.PACKS_DEBUG = () => PACKS.report;
    window.__padLayout = (pad, sw) => padLayout(pad, sw);
    window.habitatAtDebug = (w, x, z, gr) => habitatAt(w, x, z, gr);
    window.__SND = { mats: SND_MAT, fx: SND_FX, render: sndTakes, cache: SND.cache, packs: SND.packs };
    window.ATLAS_DEBUG = { get tile() { return ATLAS.tile; }, get canvas() { return ATLAS.canvas; }, get res() { return ATLAS.res; }, TILE };
    game.dev = { mkStack, RECIPES, B, BLOCKS, ITEMS, ATLAS, ANIMS, findSafeY, itemDef, Mob, Watcher, DIM, raycastBlocks, DroppedItem, matchGrid, itemLight, MOB_TYPES, worldBoxes, T_SHAPE, SHAPE, SHAPES, metaLight, shapeBoxes, stationResult, recolorKey, compostChance, makeWorldGen, Chunk, tagMatch, RS, T_RS, T_COND, railShapeFor, Minecart, fillSignal, H2D6, OPP6, D6X, D6Y, D6Z, meshChunk, FP_BODY, FP_HAND, Boat, MODELS: typeof MODELS !== "undefined" ? MODELS : null, VOX: typeof VOX !== "undefined" ? VOX : null, SND, sndTakes, Arrow, HexFlask: typeof HexFlask !== "undefined" ? HexFlask : null, plantRuns, BLOCK_FACES, PACK_LOOK, SND_MAT, Net, RemotePawn, netSnap, chunkHash, prepRecipes, SMELTING, MILLING, SAWING, UNOBTAINABLE, recolorKey, MAPS, encodeMap, decodeMap, mapCreate, newMapId, canMerge, normalizeStack, InputManager, mapForStack, mapPinsChanged, VOX, SND_FX, SND3, snd3Field, snd3Reach, HUSB: typeof HUSB !== "undefined" ? HUSB : null, NPC, NpcTalk, QuestBoard, npcSkinCanvas, boardQuests, npcQuestFor, villageById, questTake, questKill, npcStats, babble, npcVoice, RIFT, riftOf, riftStability, RiftTear, COMMANDS, DRAGON_TYPES, takeMounts, restoreMounts, seamWant, World, CH, LAIR_REG, DRAG, eggTick, StableUI, stableBook, stableSummon, stableDismiss, stableList, stableQuick, summonFamiliar, SPELLS, creatureFace, STRUCTS, structLoot, LORE, BookUI, structTick, Projectile, ENCH, enchOffers, enchShelves, POTIONS, EFFECTS, BREW, brewResult, giveEffect, composePiece2, MUSIC_MOODS, musicNight, applyResourcePack, installResourcePack, MODEL_DEFS, vWorld, VTEMPLATES, campFlue, NPC_P, collides, buildSkinParts, skinFace, npcSkin, getSkin, itemMesh: (gl, k) => itemMesh(gl, k), avatarDraws: (...a) => avatarDraws(...a), tryIgniteAt, PV };
  } catch (e) { console.error(e); fatal(e.message || String(e)); return; }
  try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => game.hotSnapshot()); } catch (e) { /* not in a viewer */ }
  game.boot(hotData || {}).catch(e => { console.error(e); fatal(e.message || String(e)); });
  if (typeof lanCheckServed === 'function') lanCheckServed(game);
}

try {
  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
} catch (e) { start({}); }

// The installable web version (dist/web) and the desktop app add a few things of their own.
try {
  // offline cache, so an installed copy opens with no connection
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && document.querySelector('link[rel="manifest"]')) navigator.serviceWorker.register('sw.js').catch(() => {});
} catch (e) { /* nothing extra here */ }
