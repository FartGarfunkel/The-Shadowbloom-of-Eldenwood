// ---------------------------------------------------------------------------
// game/movement.js — 0.9.0.21: movement feel.
//
// Hanging from a ledge you can shimmy along it, hand over hand (left and right
// as you'd walk), and climb up wherever you've got to (or drop). A jump
// pressed just after you've walked off an edge still counts, and a jump
// pressed just before you land happens as you land.
// ---------------------------------------------------------------------------
{
  const baseMove = Player.prototype.move;
  Player.prototype.move = function (world, inp, dt, opts) {
    const H = this.hang;
    // ---- along the ledge ----
    if (H && !this.flying && Math.abs(inp.mx || 0) > 0.3 && !inp.jump && !inp.sneak && !(inp.mz > 0.4) && !(inp.mz < -0.4 && H.t > 0.6)) {
      const side = Math.sign(inp.mx), rx = -H.dz, rz = H.dx, step = side * 1.7 * dt;
      const nx = H.x + rx * step, nz = H.z + rz * step, surf = H.surf ?? H.top;
      // the ledge has to go on under your leading hand (at much the same height), open above it, with room for your body
      const lead = (v) => Math.floor(v);
      const lx = H.dx ? H.bx : lead(nx + rx * side * (this.w + 0.05)), lz = H.dz ? H.bz : lead(nz + rz * side * (this.w + 0.05));
      const S = ledgeSurface(world, lx, H.cy ?? H.top - 1, lz), y = S === null ? 0 : S - 1.75;
      const ok = S !== null && Math.abs(S - surf) <= 0.13 && ledgeRoom(world, lx, lz, S, this.w)
        && !collides(world, nx - this.w, y, nz - this.w, nx + this.w, y + PLAYER_H, nz + this.w);
      if (ok) {
        H.x = nx; H.z = nz;
        if (H.dx) H.bz = Math.floor(nz); else H.bx = Math.floor(nx);
        if (H.bx === lx && H.bz === lz) H.surf = S;
        H.shimPh = (H.shimPh || 0) + Math.abs(step) * 3.4;
        H.shimT = 0.15;
        // a scrape of stone now and then
        if ((H.scrapeT = (H.scrapeT || 0) - dt) <= 0) { H.scrapeT = 0.45; this._shimSound = true; }
      }
    }
    if (H && H.shimT > 0) H.shimT -= dt;
    // ---- a jump just too late (walked off the edge) or just too early (not landed yet) ----
    const jumpEdge = inp.jump && !this._mvJump; this._mvJump = !!inp.jump;
    if (jumpEdge) this._jumpBuf = 0.14;
    else if (this._jumpBuf > 0) this._jumpBuf -= dt;
    const c = this.contacts || {}, free = !this.flying && !c.water && !c.lava && !c.ladder && !this.hang && !this.climb && !this.gliding && !this.swimming;
    if (free && !this.onGround && jumpEdge && (this._airT || 0) < 0.13 && !this._jumped && this.vy <= 0.5) {
      this.vy = JUMP_V; this._jumped = true; this._jumpBuf = 0;
    }
    const wasGround = this.onGround;
    const r = baseMove.call(this, world, inp, dt, opts);
    if (this.onGround) {
      this._airT = 0; this._jumped = false;
      // pressed just before landing: off again
      if (!wasGround && free && this._jumpBuf > 0 && !inp.jump && !this.sneaking) { this.vy = JUMP_V; this.onGround = false; this._jumped = true; this._jumpBuf = 0; }
    } else {
      this._airT = (this._airT || 0) + dt;
      if (this.vy > 1 && wasGround) this._jumped = true;
    }
    return r;
  };
  const baseLP = LocalPlayer.prototype.update;
  LocalPlayer.prototype.update = function (dt, inp) {
    const r = baseLP.call(this, dt, inp);
    const p = this.player;
    // (0.9.0.48) the mouse let go and not taken back (after Esc, say): a quiet "Click to play"
    if (this.useKb && this.el) {
      const I = this.g.input, need = this.g.state === 'playing' && this.mode === 'play' && !I.locked && !I.touchMode && !I._noLockFallback && !!I.needClick && !(this.pads && this.pads.size);   // (not while playing on a controller)
      let h = this._clickEl;
      if (need && !h) { h = this._clickEl = document.createElement('div'); h.className = 'click-play'; h.textContent = 'Click to play'; this.el.appendChild(h); }
      if (h) h.hidden = !need;
    }
    if (p._shimSound) { p._shimSound = false; this.g.sfx.material('stone', 'step'); }
    if (p.hang && !this._shimTip && p.hang.shimPh > 2) { this._shimTip = true; }
    return r;
  };
  // the ledge tip mentions the shimmy too
  const baseToast = LocalPlayer.prototype.toast;
  LocalPlayer.prototype.toast = function (msg, kind) {
    if (msg === 'Hanging on — jump to climb up, sneak to drop') msg = 'Hanging on — move left or right along the ledge, jump to climb up, sneak to drop';
    return baseToast.call(this, msg, kind);
  };
  // hand over hand
  const basePose = LocalPlayer.prototype.pose;
  LocalPlayer.prototype.pose = function () {
    const ps = basePose.call(this), H = this.player.hang;
    if (H) { ps.shimPh = H.shimPh || 0; ps.shimMv = H.shimT > 0 ? 1 : 0; }
    return ps;
  };
  const baseAnim = avatarAnim;
  avatarAnim = function (pose) {
    const A = baseAnim(pose);
    if (pose.hang && pose.shimMv) {
      const s = Math.sin(pose.shimPh), c = Math.cos(pose.shimPh);
      A.armR = [2.9 + s * 0.22, 0, 0.18 + Math.max(0, c) * 0.25]; A.armL = [2.9 - s * 0.22, 0, -0.18 - Math.max(0, -c) * 0.25];
      A.legR = [0.15 + s * 0.15, 0, 0.04 + Math.max(0, c) * 0.12]; A.legL = [-0.05 - s * 0.15, 0, -0.04 - Math.max(0, -c) * 0.12];
      A.body = [-0.1, 0, s * 0.06];
    }
    return A;
  };
}
