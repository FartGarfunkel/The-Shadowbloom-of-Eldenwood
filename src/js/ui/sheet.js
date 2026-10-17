// ---------------------------------------------------------------------------
// ui/sheet.js — 0.9.0.16: your character sheet.
//
// The doll in the inventory is you, in 3D: your skin, your armour, what's in
// your hands and on your back, standing there breathing. It turns slowly, and
// you can drag it round to see your back. Beside it, your skills (each one's
// level, hover for the experience) and what they add up to in a fight: your
// combat level, how hard you hit, how much of a blow you turn aside, your mana.
// Hovering a tool, weapon or piece of armour shows what it does in your hands:
// its numbers as you'd use it (your skill and its level included), and how it
// compares with what you're holding or wearing now.
// ---------------------------------------------------------------------------
const DOLL3D = { fb: null, color: null, depth: null, w: 0, h: 0, px: null, img: null, spin: 0.35, base: 0.35, drag: null, raf: 0 };

// ---- drawing the doll ---------------------------------------------------------------------------------------------
Renderer.prototype.renderDoll = function (draws, w, h, cam) {
  const gl = this.gl, D = DOLL3D;
  if (!D.fb || D.w !== w || D.h !== h) {
    if (D.fb) { gl.deleteFramebuffer(D.fb); gl.deleteRenderbuffer(D.color); gl.deleteRenderbuffer(D.depth); }
    D.w = w; D.h = h; D.px = new Uint8Array(w * h * 4); D.img = new ImageData(w, h);
    D.color = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, D.color); gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, w, h);
    D.depth = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, D.depth); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    D.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, D.fb);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, D.color);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, D.depth);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, D.fb);
  try {
    gl.viewport(0, 0, w, h); gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.enable(gl.CULL_FACE); gl.disable(gl.BLEND);
    Mat4.perspective(this.proj, 26 * Math.PI / 180, w / h, 0.1, 40);
    Mat4.viewRotation(this.view, cam.yaw, cam.pitch);
    this.useModel({ day: 1, fog: [0, 0, 0], minLight: 0.42 }, [1000, 2000], [15, 15]);
    this.applyDyn(this.prog.model, false);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    for (const d of draws) if (!d.depthOnly) this.drawModelCall(d, cam);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, D.px);
  } finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindVertexArray(null); }
  // the rows come back bottom first
  const row = w * 4, out = D.img.data;
  for (let y = 0; y < h; y++) out.set(D.px.subarray((h - 1 - y) * row, (h - y) * row), y * row);
  return D.img;
};
// you, as the doll: standing still, facing out, turned as far as you've turned it
function dollPose(lp) {
  const ps = lp.pose();
  Object.assign(ps, { x: 0, y: 0, z: 0, yaw: Math.PI + DOLL3D.spin, headPitch: Math.sin(performance.now() / 2600) * 0.08, walk: 0, walkAmt: 0, swing: 0, sneak: false, sit: false, sleep: false, swim: false, swimPitch: 0, paddle: 0,
    hang: false, climb: 0, air: false, vy: 0, sprint: false, land: 0, light: [15, 15], tint: null, deathT: 0, invis: false, fp: false, time: performance.now() / 1000, bow: 0, eat: 0, carry: null });
  return ps;
}
function drawDoll(lp, cv) {
  const g = lp.g, r = g.renderer, skin = lp.skin;
  if (!r || !skin || !skin.ready || !cv.isConnected) return false;
  const dpr = Math.min(2, window.devicePixelRatio || 1), cw = Math.max(32, Math.round(cv.clientWidth * dpr)), ch = Math.max(64, Math.round(cv.clientHeight * dpr));
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const draws = [];
  avatarDraws(draws, r.gl, skin, dollPose(lp));
  const cam = { x: 0, y: 1.02, z: 5.2, yaw: 0, pitch: -0.035, fov: 26 };
  const img = r.renderDoll(draws, cw, ch, cam);
  cv.getContext('2d').putImageData(img, 0, 0);
  return true;
}
// while the inventory is open, the doll lives
function dollLoop(ui) {
  cancelAnimationFrame(DOLL3D.raf);
  let last = 0;
  const step = (t) => {
    const cv = ui.root && ui.root.querySelector('.doll canvas');
    if (!ui.mode || ui.mode !== 'inventory' || !cv) { DOLL3D.raf = 0; return; }
    if (t - last > 33) {
      last = t;
      if (!DOLL3D.drag) DOLL3D.spin = DOLL3D.base + Math.sin(t / 2600) * 0.45;   // turning a little this way and that
      try { if (!drawDoll(ui.lp, cv) && !cv._flat) { cv._flat = true; drawSkinPreview(cv, skinRef(ui.lp.profile), ui.lp.player.inv.armor.slots.map(s => s ? s.id : null)); } }
      catch (e) { console.warn('doll', e); DOLL3D.raf = 0; return; }
    }
    DOLL3D.raf = requestAnimationFrame(step);
  };
  DOLL3D.raf = requestAnimationFrame(step);
}

// ---- the numbers ---------------------------------------------------------------------------------------------------
const SKILL_SHORT = { mining: 'Min', woodcutting: 'Wood', excavation: 'Dig', farming: 'Farm', fishing: 'Fish', melee: 'Melee', archery: 'Arch', defence: 'Def', smithing: 'Smith', cooking: 'Cook', taming: 'Tame', magic: 'Magic' };
function combatLevel(p) {
  const L = (k) => skillLv(p, k);
  return Math.floor((L('melee') + L('defence') + Math.max(L('archery'), L('magic'))) / 3 + (L('melee') + L('defence')) / 12);
}
// how much of a blow your armour, your Defence and its wear turn aside (0..1)
function protection(p) {
  const worn = p.inv.armor.slots.filter(Boolean);
  const arm = Math.min(0.8, p.inv.armorPoints() * 0.032);
  const sk = worn.length ? skillBonus(p, 'defence', 0.15) + worn.reduce((k, s) => k + gearBonus(s, 0.03), 0) : 0;
  return 1 - (1 - arm) * (1 - sk);
}
// a weapon's blow in your hands (hearts): its damage, sharpened, times your Melee and its level
function blowOf(p, s) {
  const d = s && itemDef(s.id), t = d && d.tool;
  let dmg = t ? t.damage : 1;
  if (t && typeof enchLv === 'function') { const sh = enchLv(s, 'sharp'); if (sh) dmg += 0.5 * sh + 0.5; }
  return dmg * (1 + skillBonus(p, 'melee', 0.2) + (t ? gearBonus(s, 0.25) : 0)) / 2;
}
const SHEET_TIER = ['', 'wood', 'stone', 'iron', 'diamond', 'mithril', 'adamantite'];
const fmt1 = (v) => (Math.round(v * 10) / 10).toString();
function sheetHTML(lp) {
  const p = lp.player, S = skillsOf(p);
  let total = 0;
  const cells = SKILLS.map(([k, name, col]) => {
    const xp = S[k] || 0, L = skillLevel(xp); total += L;
    const b = SKILL_XP[Math.min(99, L + 1)], pr = L >= 99 ? 1 : (xp - SKILL_XP[L]) / (b - SKILL_XP[L]);
    return `<div class="sh-sk" title="${esc(name)} level ${L} · ${Math.floor(xp).toLocaleString()} xp${L < 99 ? ' · ' + Math.ceil(b - xp).toLocaleString() + ' to ' + (L + 1) : ''}"><span style="color:${col}">${SKILL_SHORT[k]}</span><b>${L}</b><i style="width:${Math.round(pr * 100)}%;background:${col}"></i></div>`;
  }).join('');
  const held = p.inv.held, mana = typeof manaMax === 'function' ? manaMax(p) : 0;
  return `<div class="sh-head"><span>Combat <b>${combatLevel(p)}</b></span><span>Total <b>${total}</b></span></div>
    <div class="sh-grid">${cells}</div>
    <div class="sh-foot"><span title="A blow with what you're holding">⚔ ${fmt1(blowOf(p, held))}</span><span title="How much of a blow your armour and Defence turn aside">🛡 ${Math.round(protection(p) * 100)}%</span>${mana ? `<span title="Mana">✦ ${Math.round(mana)}</span>` : ''}</div>`;
}

// ---- hooking it in -------------------------------------------------------------------------------------------------
{
  const baseOpen = InvUI.prototype.open;
  InvUI.prototype.open = function (mode, opts) {
    const r = baseOpen.call(this, mode, opts);
    if (this.mode === 'inventory') {
      const top = this.root.querySelector('.ip-top'), gear = top && top.querySelector('.eq-col.gear');
      if (gear && !top.querySelector('.sheet')) { const sh = document.createElement('div'); sh.className = 'sheet'; gear.after(sh); sh.innerHTML = sh._h = sheetHTML(this.lp); }
      const cv = top && top.querySelector('.doll canvas');
      if (cv) {
        cv.classList.add('d3'); cv._flat = false;
        cv.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); DOLL3D.drag = { x: e.clientX, s: DOLL3D.spin, t: performance.now() }; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* fine */ } });
        cv.addEventListener('pointermove', (e) => { if (DOLL3D.drag) DOLL3D.spin = DOLL3D.drag.s + (e.clientX - DOLL3D.drag.x) * 0.02; });
        const up = () => { if (DOLL3D.drag) DOLL3D.base = DOLL3D.spin - Math.sin(performance.now() / 2600) * 0.45; DOLL3D.drag = null; };
        cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
        cv.title = 'Drag to turn';
      }
      dollLoop(this);
    }
    return r;
  };
  const baseRender = InvUI.prototype.render;
  InvUI.prototype.render = function () {
    const r = baseRender.call(this);
    if (this.mode === 'inventory') {
      const sh = this.root.querySelector('.sheet');
      if (sh) { const h = sheetHTML(this.lp); if (sh._h !== h) { sh._h = h; sh.innerHTML = h; } }
    }
    return r;
  };
  // the old flat doll only when the 3D one can't be drawn
  const baseFlat = drawSkinPreview;
  drawSkinPreview = function (cv, url, armor) { if (cv && cv.classList && cv.classList.contains('d3') && !cv._flat) return; return baseFlat(cv, url, armor); };
}
// what a tool, weapon or piece of armour does in your hands, and against what you have now
{
  const baseInfo = itemInfoHTML;
  itemInfoHTML = function (s) {
    let h = baseInfo(s);
    const d = s && itemDef(s.id), lp = INFO_FOR, p = lp && lp.player;
    if (!d || !p) return h;
    const t = d.tool, cmp = (a, b, unit = '') => { const dv = Math.round((a - b) * 10) / 10; return dv ? ` <span class="${dv > 0 ? 'up' : 'down'}">${dv > 0 ? '▲ +' : '▼ '}${dv}${unit}</span>` : ''; };
    if (t && t.type !== 'bow' && t.type !== 'igniter' && t.type !== 'shears') {
      const held = p.inv.held, mine = blowOf(p, s), now = held && held !== s ? blowOf(p, held) : null;
      h += `<div class="ts">In your hands: ${fmt1(mine)} ♥ a blow${now !== null ? cmp(mine, now) : ''}</div>`;
      if (t.type !== 'sword' && t.tier) h += `<div class="td">Tier ${t.tier}${SHEET_TIER[t.tier] ? ' (' + SHEET_TIER[t.tier] + ')' : ''} · digs ${fmt1(t.speed * (1 + gearBonus(s, 0.35)))}× as fast as a bare hand</div>`;
    }
    if (d.armor) {
      const slot = d.armor.slot, worn = p.inv.armor.slots[slot];
      if (worn !== s) { const wd = worn && itemDef(worn.id); h += `<div class="td">Instead of ${wd ? esc(wd.name) : 'nothing'}:${cmp(d.armor.points, wd && wd.armor ? wd.armor.points : 0, ' armour')}</div>`; }
    }
    return h;
  };
  let INFO_FOR = null;
  const baseTip = InvUI.prototype.showTip;
  InvUI.prototype.showTip = function (s, e) { INFO_FOR = this.lp; try { return baseTip.call(this, s, e); } finally { INFO_FOR = null; } };
}
