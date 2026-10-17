const X = Math.floor(p.x), Z = Math.floor(p.z), Y = Math.floor(p.y);
for (let x = X - 8; x < X + 10; x++) for (let z = Z - 12; z < Z + 4; z++) { for (let y = Y; y < Y + 12; y++) w.setBlock(x, y, z, 0, 0, { quiet: true }); w.setBlock(x, Y - 1, z, B.grass, 0, { quiet: true }); }
const mk = (t, dx, dz, f) => { const m = new D.Mob(g, t, X + dx + 0.5, Y, Z + dz + 0.5); m.yaw = -Math.PI / 2 + 0.5; m.T = Object.assign({}, m.T, { speed: 0, skittish: 0 }); if (f) f(m); g.addEntity(m); return m; };
mk('cow', -4, -6); mk('pig', -1.5, -6); mk('sheep', 1, -6); mk('sheep', 3.5, -6, m => { m.color = 'light_blue'; }); mk('chicken', 5.5, -6);
mk('sheep', 1, -8.5, m => { m.sheared = true; }); mk('cow', -3, -8.5, m => m.makeBaby()); mk('chicken', 4, -8.5, m => m.makeBaby());
g.meta.time = 300; p.x = X + 0.5; p.z = Z + 0.5; p.y = Y + 1.2; p.yaw = 0.0; p.pitch = -0.28; p.flying = true;
return 'ok';
//@ wait 4000
//@ shot animals2
return 1;
