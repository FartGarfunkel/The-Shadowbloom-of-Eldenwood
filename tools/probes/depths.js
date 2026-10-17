g.meta.mode = 'creative';
g.travelPortal(1);
return 'going';
//@ wait 12000
p.flying = true;
// look for a crimson or warped wood nearby and stand at its edge
const w2 = g.world; let best = null;
for (let dz = -40; dz <= 40 && !best; dz += 2) for (let dx = -40; dx <= 40 && !best; dx += 2) {
  const x = Math.floor(p.x) + dx, z = Math.floor(p.z) + dz;
  for (let y = 80; y > 30; y--) { const id = w2.getBlock(x, y, z); if (id === D.B.crimson_nylium || id === D.B.warped_nylium) { if (w2.getBlock(x, y + 1, z) === 0 && w2.getBlock(x, y + 2, z) === 0) { best = [x, y + 1, z]; } break; } }
}
if (best) { p.x = best[0] + 0.5; p.y = best[1] + 0.5; p.z = best[2] + 0.5; p.vx = p.vy = p.vz = 0; }
p.pitch = -0.15;
return { dim: g.dim, best };
//@ wait 6000
//@ shot depths1
p.yaw += 2.2;
return 1;
//@ wait 3000
//@ shot depths2
return 1;
