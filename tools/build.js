// Bundles src/ into self-contained HTML:
//   dist/emberwild.html  – full document; download it and open it in any browser
//   dist/artifact.html   – page body for publishing as a Claude artifact
//   dist/web/            – installable web app (put it on any web host; see launcher/README.md)
//   dist/desktop/        – the desktop app's files (tools/package.sh turns them into an AppImage / .exe)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
// DQ_OUT=<dir>: write only the game file there (for parallel test builds that mustn't touch dist/)
const OUT = process.env.DQ_OUT || null;
const src = (p) => fs.readFileSync(path.join(root, 'src', p), 'utf8');
const ORDER = [
  'core/util.js', 'core/blocks.js', 'core/items.js', 'render/doku.js', 'render/doku2.js', 'render/doku3.js', 'render/doku4.js', 'render/gerudoku.js', 'render/mobtex.js', 'render/textures.js', 'render/packs.js',
  'world/chunk.js', 'world/shapes.js', 'world/worldgen.js','world/worldgen_v1.js', 'world/world.js', 'world/mesher.js', 'world/plants3d.js',
  'render/gl.js', 'render/models.js', 'render/rigs.js', 'render/rigdefs.js', 'render/rigdefs2.js', 'render/monstex.js', 'render/packmobs.js', 'render/rigs2.js', 'render/items3d.js', 'render/sculpt.js', 'render/models3d.js', 'render/skins.js', 'render/packarmor.js', 'render/renderer.js',
  'game/physics.js', 'game/inventory.js', 'game/audio.js', 'game/ambience.js', 'game/music.js',
  'input/input.js', 'input/gamepad.js', 'save/storage.js',
  'game/player.js', 'game/entities.js', 'game/fauna.js', 'game/portals.js', 'game/haunt.js', 'game/mobai.js', 'game/dismember.js',
  'ui/hud.js', 'ui/invui.js', 'ui/title.js', 'ui/ui.js', 'input/padsetup.js', 'game/local.js', 'game/game.js', 'input/controls.js',
  'game/build.js', 'game/blockfx.js', 'game/mech.js', 'game/vehicles.js', 'game/blocks2.js',
  'game/redstone.js', 'game/minecart.js', 'game/rsplace.js', 'game/rules.js', 'game/ambientfx.js', 'game/commands.js', 'game/nightmobs.js', 'game/bestiary.js', 'game/crowd.js', 'game/sounds2.js', 'game/sfxlib.js', 'game/voices3.js', 'game/monsters.js', 'game/quarrels.js', 'game/furniture.js', 'game/pets.js', 'game/trains.js', 'game/bows.js', 'game/ships.js', 'game/boats2.js', 'game/fishing.js', 'game/portallinks.js', 'game/aquatic.js', 'game/blocksounds.js', 'game/obtain.js', 'game/weather.js', 'game/instruments.js', 'game/capes.js', 'game/particles2.js', 'game/sound3.js', 'game/husbandry.js', 'game/skymobs.js', 'game/dyeing.js', 'game/metals.js', 'game/skills.js', 'net/net.js', 'net/netsync.js', 'net/netui.js', 'game/maps.js', 'game/villages.js', 'game/towns.js', 'game/villagers.js', 'game/towns3.js', 'game/townlife.js', 'game/magic.js', 'game/dungeons.js', 'game/riftarc.js', 'game/worldupdate.js', 'game/dragons.js', 'game/seamless.js', 'game/stable.js', 'game/structures.js', 'game/villageflat.js', 'game/enchanting.js', 'game/brewing.js', 'game/aether.js', 'game/music2.js', 'game/riftlore.js', 'game/camping.js', 'game/carried.js', 'render/clouds.js', 'game/portalview.js', 'ui/sheet.js', 'game/worlds.js', 'game/theend.js', 'game/stronghold.js', 'game/endmobs.js', 'game/elytra.js', 'game/deepdark.js', 'game/movement.js', 'game/perf.js', 'game/anim.js', 'game/fairplay.js', 'game/rpg.js', 'game/arcana.js', 'game/farming.js', 'game/places.js', 'game/server.js', 'game/mods.js', 'game/livingworld.js', 'game/hearth.js', 'game/together.js', 'game/machines.js', 'game/travel.js', 'game/paths.js', 'game/deephalls.js', 'game/seas.js',
  'game/skies.js', 'game/distant.js',
  'dnd/srd.js', 'dnd/spelldata.js', 'dnd/spells_more1.js', 'dnd/spells_more2.js', 'dnd/spells_more3.js', 'dnd/items.js', 'dnd/equipment.js', 'dnd/magicitems.js', 'dnd/dice.js', 'dnd/character.js', 'dnd/look.js', 'dnd/rules.js', 'dnd/spells.js', 'dnd/spells2.js', 'dnd/abilities.js', 'dnd/ranged.js', 'dnd/magic.js', 'dnd/progression.js', 'dnd/origins.js', 'dnd/creator.js',
  'game/dnd_monsters1.js', 'game/dnd_monsters2.js', 'game/dnd_monsters3.js',
  'campaign/engine.js', 'campaign/extras.js', 'campaign/restday.js', 'campaign/roads.js', 'campaign/encounters.js', 'campaign/companions.js', 'campaign/regionspawn.js',
  'campaign/sb_world.js', 'campaign/sb_act1.js', 'campaign/sb_act2.js', 'campaign/sb_act3.js', 'campaign/sb_regions.js', 'campaign/watcher.js', 'campaign/shadowbloom.js',
  'render/gear3d.js', 'render/itemmodels.js', 'game/shields.js', 'game/traps.js', 'render/icons3d.js', 'ui/hymenu.js', 'game/sanity.js', 'input/mouseback.js', 'ui/uiscale.js',
  'boot/main.js',
];
// DQ_SKIP=a.js,b.js leaves modules out of a test build (a module another hand is still writing)
const SKIP = (process.env.DQ_SKIP || '').split(',').filter(Boolean);
const js = ORDER.filter(f => !SKIP.includes(f)).map(f => `// ==== ${f} ====\n` + src('js/' + f)).join('\n');
if (/<\/script/i.test(js)) throw new Error('JS contains a closing script tag');
const bundle = `(function () {\n'use strict';\n${js}\n})();`;
// (0.9.0.55) a syntax error anywhere leaves the game unable to start at all: caught here, naming the module it's in
try { new Function(bundle); } catch (e) {
  if (!(e instanceof SyntaxError)) throw e;
  const bad = ORDER.filter(f => { try { new Function(src('js/' + f)); return false; } catch (er) { return er instanceof SyntaxError; } });
  throw new Error('Syntax error in ' + (bad.join(', ') || 'the bundle') + ': ' + e.message);
}
// (alpha 5) the interface's two fonts travel inside the file (SIL Open Font License; src/fonts/), so the game looks the
// same offline, in the desktop app, as online. Subset to Latin text and symbols, about 36 KB together.
const fontFace = (fam, file, weight) => { const p = path.join(root, 'src/fonts', file); return fs.existsSync(p) ? `@font-face{font-family:'${fam}';src:url(data:font/woff;base64,${fs.readFileSync(p).toString('base64')}) format('woff');font-weight:${weight};font-style:normal;font-display:swap}\n` : ''; };
const fonts = fontFace('Jersey 15', 'jersey15.woff', '400') + fontFace('Pixelify Sans', 'pixelify.woff', '400 700');
// (alpha 6) the interface is zoomed to its size setting (ui/uiscale.js), and CSS zoom multiplies viewport units too:
// written against the interface's size, a panel told to be 90vh tall stays 90% of the screen at any size
const vpUnits = (c) => c.split('\n').map(l => /hy-hero|hy-stage/.test(l) ? l : l.replace(/(\d*\.?\d+)v([hw])\b/g, 'calc($1v$2 / var(--uiz, 1))')).join('\n');   // (the title's hero isn't zoomed: its units stay)
const css = fonts + vpUnits(src('styles.css') + '\n' + (fs.existsSync(path.join(root, 'src/dnd.css')) ? src('dnd.css') : ''));
// the patch notes travel inside the game file, so the launcher and the game can show the news of whatever version is installed
const news = fs.readFileSync(path.join(root, 'launcher/news.html'), 'utf8').trim();
if (/<\/template|\/\*SCRIPT\*\//i.test(news)) throw new Error('news.html must not contain </template> or the script marker');
const body = src('index.html').replace('/*STYLES*/', () => css).replace('/*NEWS*/', () => news).replace('/*SCRIPT*/', () => bundle);
if (!OUT) { fs.mkdirSync(path.join(root, 'dist'), { recursive: true }); fs.writeFileSync(path.join(root, 'dist/artifact.html'), body); }
const page = (extraHead) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="theme-color" content="#0d1311">
${extraHead}<style>html,body{margin:0;padding:0}[hidden]{display:none!important}</style>
</head>
<body>
${body}
</body>
</html>
`;
// The non-game files (launcher, build and test tools, notes) ride along inside the game file as a
// compressed bundle, so the whole project can be rebuilt from any single update file.
const zlib = require('zlib');
const extra = {};
const walk = (dir) => { for (const f of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
  const rel = path.join(dir, f.name);
  if (f.isDirectory()) { if (!/icons|reference|__pycache__/.test(f.name)) walk(rel); }
  else if (/\.(js|py|sh|html|md|txt|json|yml)$/.test(f.name)) extra[rel] = fs.readFileSync(path.join(root, rel), 'utf8');
} };
for (const d of ['launcher', 'tools', 'notes']) if (fs.existsSync(path.join(root, d))) walk(d);
extra['README.md'] = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const sourcesTag = `<script type="application/octet-stream" id="dq-sources" data-format="json+gzip+base64">${zlib.gzipSync(JSON.stringify(extra), { level: 9 }).toString('base64')}</script>\n`;
const full = page('').replace('</body>', () => sourcesTag + '</body>');
if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'shadowbloom.html'), full); console.log('built', (full.length / 1024).toFixed(1), 'KB ->', OUT); process.exit(0); }
fs.writeFileSync(path.join(root, 'dist/emberwild.html'), full);
fs.writeFileSync(path.join(root, 'dist/shadowbloom.html'), full);   // the game file, the name releases carry

// ---- installable web app and desktop app files ----
const version = (src('js/save/storage.js').match(/GAME_VERSION = '([^']+)'/) || [])[1] || '0.0.0';
const icons = path.join(root, 'launcher/icons');
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
const web = path.join(root, 'dist/web');
fs.rmSync(web, { recursive: true, force: true });
fs.mkdirSync(path.join(web, 'icons'), { recursive: true });
fs.writeFileSync(path.join(web, 'index.html'), page(`<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/icon-32.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Shadowbloom">
`));
fs.writeFileSync(path.join(web, 'manifest.webmanifest'), JSON.stringify({
  name: 'Shadowbloom', short_name: 'Shadowbloom', id: './', start_url: './', scope: './',
  description: 'The Shadowbloom of Eldenwood: a voxel tabletop RPG campaign, alone or with friends.',
  display: 'fullscreen', display_override: ['fullscreen', 'standalone'], orientation: 'landscape',
  background_color: '#0d1311', theme_color: '#0d1311', categories: ['games'], version,
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2));
fs.writeFileSync(path.join(web, 'sw.js'), fs.readFileSync(path.join(root, 'launcher/web/sw.js'), 'utf8').replace('__VERSION__', version));
for (const f of ['icon-32.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) copy(path.join(icons, f), path.join(web, 'icons', f));
copy(path.join(root, 'launcher/web/README.txt'), path.join(web, 'README.txt'));

const desk = path.join(root, 'dist/desktop');
fs.rmSync(desk, { recursive: true, force: true });
fs.mkdirSync(desk, { recursive: true });
fs.writeFileSync(path.join(desk, 'index.html'), full);
copy(path.join(root, 'launcher/desktop/main.js'), path.join(desk, 'main.js'));
copy(path.join(root, 'launcher/desktop/preload.js'), path.join(desk, 'preload.js'));
copy(path.join(root, 'launcher/desktop/lan.js'), path.join(desk, 'lan.js'));
copy(path.join(root, 'launcher/desktop/updater.js'), path.join(desk, 'updater.js'));
fs.writeFileSync(path.join(desk, 'launcher.html'), fs.readFileSync(path.join(root, 'launcher/desktop/launcher.html'), 'utf8').replace('/*FONTS*/', () => fonts).replace('<!--NEWS-->', () => fs.readFileSync(path.join(root, 'launcher/news.html'), 'utf8')).replace('__VERSION__', version));
copy(path.join(icons, 'icon-512.png'), path.join(desk, 'icon.png'));
// 0.9.0.40: launcherId fingerprints the app itself (launcher files and Electron version, not the game), so the
// updater only offers a new app download when the app really changed; updateSource is the default repository.
const launcherId = require('crypto').createHash('sha256').update(JSON.stringify([
  ...['main.js', 'preload.js', 'lan.js', 'updater.js', 'launcher.html'].map(f => fs.readFileSync(path.join(root, 'launcher/desktop', f), 'utf8')),
  (fs.readFileSync(path.join(root, 'tools/package.sh'), 'utf8').match(/^ELECTRON=(.+)$/m) || [])[1] || '',
])).digest('hex').slice(0, 16);
const updateSource = (src('js/save/storage.js').match(/UPDATE_SOURCE = '([^']*)'/) || [])[1] || '';
fs.writeFileSync(path.join(desk, 'package.json'), JSON.stringify({
  name: 'emberwild', productName: 'Shadowbloom', version: version.replace(/-.*/, ''), description: 'The Shadowbloom of Eldenwood: a voxel tabletop RPG',
  main: 'main.js', author: 'Shadowbloom', license: 'UNLICENSED', fullVersion: version, launcherId, updateSource,
}, null, 2));
console.log('built', (full.length / 1024).toFixed(1) + ' KB', ORDER.length + ' modules', 'v' + version);
