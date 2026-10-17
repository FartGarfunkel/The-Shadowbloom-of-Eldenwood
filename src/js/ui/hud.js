// ---------------------------------------------------------------------------
// ui/hud.js — one player's heads-up display, inside that player's slice of the
// screen: hearts, armor, XP, hotbar, boss bar, toasts, damage numbers, death
// screen, touch controls (player one only).
// ---------------------------------------------------------------------------

function slotInner(s) {
  if (!s) return '';
  const def = itemDef(s.id);
  let h = `<i class="ico" style="background-position:${iconPos(s.id)}"></i>`;
  if (s.n > 1) h += `<b>${s.n}</b>`;
  const dur = def && (def.tool ? def.tool.durability : def.armor ? def.armor.durability : 0);
  if (dur && s.d) {
    const f = Math.max(0, 1 - s.d / dur);
    h += `<span class="dur"><i style="width:${f * 100}%;background:hsl(${f * 110},80%,50%)"></i></span>`;
  }
  return h;
}
const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

class Hud {
  constructor(lp) {
    this.lp = lp; this.g = lp.g; this.root = lp.el;
    this.q = (s) => this.root.querySelector(s);
    this.lastHot = ''; this.lastHearts = ''; this.floatEls = []; this.debugOn = false;
    const hb = this.q('.hotbar');
    for (let i = 0; i < 9; i++) {
      const d = document.createElement('div'); d.className = 'slot'; d.dataset.i = i;
      d.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (!lp.player.carrying) lp.player.inv.selected = i; });
      hb.appendChild(d);
    }
    this.q('.respawn').onclick = () => lp.respawn();
    if (lp.index === 0) this.g.input.bindTouch(this.q('.touch'));
    this.q('.pname').textContent = lp.name;
    this.applyTouch();
  }
  applyTouch() {
    const t = this.lp.index === 0 && this.g.input.touchMode;
    this.q('.touch').hidden = !t;
  }
  // Fit slot sizes to this player's slice of the screen.
  layout() {
    const v = this.lp.view;
    const gs = { small: 0.8, normal: 1, large: 1.22 }[this.g.settings.guiScale] || 1;
    const size = Math.floor(clamp(Math.min((v.w - 24) / 9.6, (v.h - 140) / 9.5, 46) * gs, 24, 58));
    this.root.style.setProperty('--slot-size', size + 'px');
    this.root.style.setProperty('--hud-scale', (clamp(Math.min(v.w / 900, v.h / 560), 0.65, 1) * gs).toFixed(2));
  }
  frame(dt, cam) {
    const lp = this.lp, g = this.g, p = lp.player, inv = p.inv;
    this.applyTouch();
    const off = inv.offhand;
    const sig = inv.selected + '|' + (p.carrying ? 'c' : '') + inv.main.slots.slice(0, 9).map(s => s ? s.id + ':' + s.n + ':' + (s.d || 0) : '-').join(',') + '|' + (off ? off.id + ':' + off.n : '-');
    if (sig !== this.lastHot) {
      this.lastHot = sig;
      const els = this.q('.hotbar').children;
      for (let i = 0; i < 9; i++) { els[i].innerHTML = slotInner(inv.main.slots[i]); els[i].classList.toggle('sel', i === inv.selected && !p.carrying); }
      const os = this.q('.offslot'); os.hidden = !off; os.innerHTML = off ? slotInner(off) : '';
      const held = inv.held, hn = this.q('.held-name');
      if (held && held.id !== this._lastHeldId) {
        const d = itemDef(held.id);
        hn.textContent = d ? d.name : held.id; hn.className = 'held-name ' + (d && d.rarity ? d.rarity : ''); hn.hidden = false;
        clearTimeout(this._hnT); this._hnT = setTimeout(() => { hn.hidden = true; }, 1600);
      }
      this._lastHeldId = held ? held.id : null;
    }
    const ch = this.q('.carry-hint');
    ch.hidden = !p.carrying;
    if (p.carrying) ch.textContent = 'Carrying ' + (p.carrying.kind === 'block' ? BLOCKS[p.carrying.id].name : 'a ' + p.carrying.type) + ' · use to set down';
    const hs = p.health + '|' + (p.poison > 0 ? 'P' : '') + (p.chill > 0 ? 'C' : '') + p.maxHealth + '|' + inv.armorPoints() + '|' + p.level + '|' + Math.floor(p.xp);
    if (hs !== this.lastHearts) {
      this.lastHearts = hs;
      let h = '';
      for (let i = 0; i < p.maxHealth / 2; i++) h += `<span class="heart${p.health >= i * 2 + 2 ? '' : p.health >= i * 2 + 1 ? ' half' : ' empty'}${p.poison > 0 ? ' poison' : p.chill > 0 ? ' chill' : ''}"></span>`;
      this.q('.hearts').innerHTML = h;
      const ap = inv.armorPoints();
      // (0.9.0.25) past twenty points (better than diamond) the shields glow, one per point over
      this.q('.armorbar').innerHTML = ap ? Array.from({ length: 10 }, (_, i) => `<span class="shield${ap >= i * 2 + 1 ? '' : ' empty'}"${ap - 20 > i ? ' style="filter:drop-shadow(0 0 2px #8ae0ff) brightness(1.25) hue-rotate(160deg)"' : ''}></span>`).reverse().join('') : '';
      this.q('.xpfill').style.width = (p.xp / xpForLevel(p.level) * 100) + '%';
      this.q('.xplevel').textContent = p.level > 0 ? p.level : '';
    }
    // air bubbles while your head is under water (and for a moment after)
    const air = p.air ?? AIR_MAX, ar = this.q('.airrow');
    const showAir = air < AIR_MAX - 0.05 || ((p.contacts || {}).eyeWater && !g.creative);
    ar.hidden = !showAir;
    if (showAir) {
      const n = Math.ceil(air / AIR_MAX * 10 - 0.001), popping = air / AIR_MAX * 10 - Math.floor(air / AIR_MAX * 10) < 0.15 && n > 0;
      const as = n + '|' + popping;
      if (as !== this._airS) { this._airS = as; let h = ''; for (let i = 0; i < 10; i++) h += i < n ? `<span class="bubble${i === n - 1 && popping ? ' pop' : ''}"></span>` : ''; ar.innerHTML = h; }
    }
    this.q('.hearts').style.transform = p.health <= 4 && !p.dead ? `translateY(${Math.sin(g.time * 30) > 0 ? -1 : 1}px)` : '';
    const c = p.contacts || {};
    this.q('.fx-water').hidden = !c.eyeWater;
    this.q('.fx-lava').hidden = !c.eyeLava;
    this.q('.fx-fire').hidden = !(p.burn > 0);
    const pf = this.q('.fx-portal'); pf.hidden = p.portalTime <= 0; pf.style.opacity = Math.min(1, p.portalTime / 1.6);
    this.q('.fx-hurt').style.opacity = p.hurtFlash * 0.9 + (p.health <= 4 && !p.dead ? 0.25 + Math.sin(g.time * 4) * 0.1 : 0);
    let boss = null, bd = 48 * 48;
    for (const e of g.entities) if (e.T && e.T.boss && e.alive) { const d = e.dist2(p); if (d < bd) { bd = d; boss = e; } }
    this.q('.bossbar').hidden = !boss;
    if (boss) this.q('.boss-fill').style.width = Math.max(0, boss.health / boss.maxHealth * 100) + '%';
    this.q('.pname').hidden = g.locals.length < 2;
    this.updateFloaters(dt, cam);
    this.nameTags(cam);
    const dbg = this.q('.debug');
    const coords = g.rules && g.rules().showCoords;
    if (this.debugOn || g.settings.showFps || coords) {
      dbg.hidden = false;
      if ((this._dbgT = (this._dbgT || 0) + dt) > 0.25) {
        this._dbgT = 0;
        if (!this.debugOn && coords) {
          const fac = ['north', 'west', 'south', 'east'][Math.round((((p.yaw % TAU) + TAU) % TAU) / (Math.PI / 2)) & 3];
          dbg.textContent = (g.settings.showFps ? Math.round(g.fps) + ' fps\n' : '') + `XYZ ${Math.floor(p.x)} ${Math.floor(p.y)} ${Math.floor(p.z)} · facing ${fac}`;
        } else if (this.debugOn) {
          const l = g.world.getLight(Math.floor(p.x), Math.floor(p.y + 0.5), Math.floor(p.z));
          const st = g.renderer.stats;
          dbg.textContent = `${Math.round(g.fps)} fps\nXYZ ${p.x.toFixed(1)} ${p.y.toFixed(1)} ${p.z.toFixed(1)}\n${DIM_NAME[g.dim]}${g.dim === 0 ? ' · ' + BIOME_NAME[g.world.gen.biomeAt(p.x, p.z)] : ''}\nlight sky ${l >> 4} block ${l & 15}\nchunks ${st.drawn}/${st.chunks} · ${Math.round(st.tris / 1000)}k tris\nentities ${g.entities.length} · critters ${g.fauna.list.length}\nstorage ${g.save.backendName}${g.save.cloud.enabled ? ' + cloud (' + g.save.cloud.status + ')' : ''}`;
          if (this.lp && this.lp.useKb) { const I = g.input; dbg.textContent += `\nmouse ${I.locked ? 'held' : 'loose'} · wheel ${I.wheelSeen || 0} in, ${I.wheelSteps || 0} slots`; }   // (0.9.0.50)
        } else dbg.textContent = Math.round(g.fps) + ' fps';
      }
    } else dbg.hidden = true;
  }
  saving(on) { const b = this.q('.savebadge'); if (on) { b.hidden = false; b.textContent = 'Saving…'; } else { clearTimeout(this._sb); this._sb = setTimeout(() => { b.hidden = true; }, 600); } }
  toast(msg, kind = '') {
    const box = this.q('.toasts');
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg;
    box.appendChild(t);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, kind === 'boss' ? 4200 : 2800);
  }
  whisper(text) {
    const box = this.q('.toasts');
    const t = document.createElement('div'); t.className = 'toast whisper'; t.textContent = text;
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, 2600);
  }
  pickup(id, n) {
    const d = itemDef(id); if (!d) return;
    const last = this._lastPick;
    if (last && last.id === id && performance.now() - last.t < 1500 && last.el.isConnected) {
      last.n += n; last.t = performance.now(); last.el.textContent = `+${last.n} ${d.name}`; return;
    }
    const box = this.q('.toasts');
    const t = document.createElement('div'); t.className = 'toast' + (d.rarity ? ' rare' : ''); t.textContent = `+${n} ${d.name}`;
    box.appendChild(t);
    while (box.children.length > 5) box.firstChild.remove();
    this._lastPick = { id, n, t: performance.now(), el: t };
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, 2200);
  }
  dimName(name) {
    const el = this.q('.dimname');
    el.hidden = false; el.textContent = name;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(this._dimT); this._dimT = setTimeout(() => { el.hidden = true; }, 3300);
  }
  floatText(x, y, z, text, color) {
    const el = document.createElement('div'); el.className = 'floater'; el.textContent = text; el.style.color = color || '#fff';
    this.q('.floaters').appendChild(el);
    this.floatEls.push({ el, x, y, z, life: 1.1 });
    if (this.floatEls.length > 24) { const f = this.floatEls.shift(); f.el.remove(); }
  }
  project(x, y, z, cam) {
    const vp = this.lp.vp || this.g.renderer.vp, v = this.lp.view;
    const rx = x - cam.x, ry = y - cam.y, rz = z - cam.z;
    const cx = vp[0] * rx + vp[4] * ry + vp[8] * rz + vp[12], cy = vp[1] * rx + vp[5] * ry + vp[9] * rz + vp[13], cw = vp[3] * rx + vp[7] * ry + vp[11] * rz + vp[15];
    if (cw <= 0.1) return null;
    return [((cx / cw) * 0.5 + 0.5) * v.w, (1 - ((cy / cw) * 0.5 + 0.5)) * v.h];
  }
  updateFloaters(dt, cam) {
    for (let i = this.floatEls.length - 1; i >= 0; i--) {
      const f = this.floatEls[i];
      f.life -= dt; f.y += dt * 0.8;
      if (f.life <= 0) { f.el.remove(); this.floatEls.splice(i, 1); continue; }
      const s = this.project(f.x, f.y, f.z, cam);
      if (!s) { f.el.style.display = 'none'; continue; }
      f.el.style.display = '';
      f.el.style.left = s[0] + 'px'; f.el.style.top = s[1] + 'px';
      f.el.style.opacity = Math.min(1, f.life * 2);
    }
  }
  // Names over other players' heads (split-screen partners and LAN players).
  nameTags(cam) {
    const g = this.g, box = this.q('.tags');
    const others = [];
    for (const o of g.locals) if (o !== this.lp && !o.dead) others.push([o.name, o.x, o.y + 2.1, o.z]);
    if (g.net) for (const r of g.net.pawns()) if (!r.dead) others.push([r.name, r.x, r.y + 2.1, r.z]);
    while (box.children.length < others.length) { const d = document.createElement('div'); d.className = 'tag'; box.appendChild(d); }
    [...box.children].forEach((el, i) => {
      const o = others[i];
      const s = o && Math.hypot(o[1] - cam.x, o[3] - cam.z) < 64 ? this.project(o[1], o[2], o[3], cam) : null;
      if (!s) { el.hidden = true; return; }
      el.hidden = false; el.textContent = o[0]; el.style.left = s[0] + 'px'; el.style.top = s[1] + 'px';
    });
  }
  // Writing on a sign: four short lines.
  signEditor(lines, done) {
    const lp = this.lp, g = this.g;
    const box = document.createElement('div');
    box.className = 'sign-edit';
    box.innerHTML = `<div class="sign-board"><div class="sign-title">Write on the sign</div>${[0, 1, 2, 3].map(i => `<input maxlength="16" value="${esc(lines[i] || '')}" aria-label="Line ${i + 1}">`).join('')}<button class="btn primary tiny">Done</button></div>`;
    this.root.appendChild(box);
    const inputs = [...box.querySelectorAll('input')];
    const prevMode = lp.mode;
    lp.mode = 'sign';
    if (lp.useKb) g.input.releaseLock(true);
    const finish = () => {
      done(inputs.map(i => i.value.slice(0, 16)));
      box.remove(); lp.mode = prevMode === 'sign' ? 'play' : prevMode;
      lp._signClose = null;
      if (lp.useKb && !g.input.touchMode && g.state === 'playing') g.input.requestLock();
    };
    inputs.forEach((inp, i) => inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { if (i < 3) inputs[i + 1].focus(); else finish(); }
      if (e.key === 'Escape') finish();
    }));
    box.querySelector('button').onclick = finish;
    box.addEventListener('pointerdown', (e) => e.stopPropagation());
    lp._signClose = finish;
    setTimeout(() => inputs[0].focus(), 30);
  }
  showDeath(cause, level) {
    this.q('.death-cause').textContent = cause;
    this.q('.death-note').textContent = `Your items were dropped where you fell. You keep level ${level}.`;
    this.q('.death').hidden = false;
    this._deathT = performance.now();
  }
  hideDeath() { this.q('.death').hidden = true; }
  deathButtonFocus() {}
  deathInput(inp) {
    // controller players respawn with A after a short pause
    if (performance.now() - (this._deathT || 0) > 1200 && (inp.jump || inp.usePressed) && !this.lp.useKb) this.lp.respawn();
  }
}

// Heart and shield sprites, painted once and shared by every view.
function installHudSprites() {
  const mk = (rows, pal) => {
    const cv = document.createElement('canvas'); cv.width = 9; cv.height = 9;
    const g = cv.getContext('2d');
    rows.forEach((r, y) => { for (let x = 0; x < 9; x++) { const c = pal[r[x]]; if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); } } });
    return cv.toDataURL();
  };
  const heart = ['.kkk.kkk.', 'kRRRkRRRk', 'kRWRRRRRk', 'kRRRRRRRk', 'kRRRRRRRk', '.kRRRRRk.', '..kRRRk..', '...kRk...', '....k....'];
  const half = heart.map(r => r.split('').map((c, x) => (c === 'R' || c === 'W') && x > 4 ? 'D' : c).join(''));
  const empty = heart.map(r => r.replace(/[RW]/g, 'D'));
  const bubble = ['..kkkkk..', '.kBBBBBk.', 'kBWWBBBBk', 'kBWBBBBBk', 'kBBBBBBBk', 'kBBBBBBBk', 'kBBBBBBBk', '.kBBBBBk.', '..kkkkk..'];
  const pop = ['.........', '..k...k..', '.k.B.B.k.', '...B.B...', '.kB...Bk.', '...B.B...', '.k.B.B.k.', '..k...k..', '.........'];
  const shield = ['kkkkkkkkk', 'kSSSSLLLk', 'kSWSSLLLk', 'kSSSSLLLk', 'kSSSSLLLk', '.kSSSLLk.', '..kSSLk..', '...kSk...', '....k....'];
  const pal = { k: '#140808', R: '#e5484d', W: '#ffb3b0', D: '#3a1a1a', S: '#cfd6de', L: '#90a0b0', B: '#5aa6f0' };
  const st = document.createElement('style');
  st.textContent = `.heart{background:no-repeat center/100% url(${mk(heart, pal)})}.heart.half{background-image:url(${mk(half, pal)})}.heart.empty{background-image:url(${mk(empty, pal)})}.shield{background:no-repeat center/100% url(${mk(shield, pal)})}.bubble{background:no-repeat center/100% url(${mk(bubble, pal)})}.bubble.pop{background-image:url(${mk(pop, pal)})}`;
  document.head.appendChild(st);
}
