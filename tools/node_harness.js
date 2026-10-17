// Loads engine source files into one scope for Node-side tests (no DOM).
const fs = require('fs'), path = require('path'), vm = require('vm');
const files = ['core/util.js', 'core/blocks.js', 'core/items.js', 'world/chunk.js', 'world/shapes.js', 'world/worldgen.js', 'world/world.js', 'world/mesher.js'];
let src = files.map(f => fs.readFileSync(path.join(__dirname, '../src/js', f), 'utf8')).join('\n');
src = `const BLOCK_FACES = []; const ATLAS = { tile: {} }; function tileUV(){ return [0,0,1,1]; }\n` + src + `\nfor (const b of BLOCKS) BLOCK_FACES[b.id] = [0,0,0,0,0,0];\n`;
module.exports = function load(extra = '') {
  const ctx = { console, performance, btoa, atob, Math, Date };
  vm.createContext(ctx);
  vm.runInContext(src + '\n' + extra, ctx);
  return ctx;
};
