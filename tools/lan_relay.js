// Run the desktop app's LAN server on its own (for tests): node tools/lan_relay.js [port]
// Prints {"port":..,"token":..} once listening; serves dist/shadowbloom.html.
const path = require('path');
const { LanServer } = require('../launcher/desktop/lan.js');
const port = +process.argv[2] || 25580;
const s = new LanServer({ gameFile: () => path.join(__dirname, '../dist/shadowbloom.html'), world: process.env.WORLD || 'Test World', host: process.env.HOSTNAME_ || 'Tester', version: 'test', port });
s.start().then(r => { console.log(JSON.stringify(r)); }).catch(e => { console.error(e.message); process.exit(1); });
process.on('SIGTERM', () => { s.stop(); process.exit(0); });
