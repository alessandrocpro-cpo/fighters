/* ===== ARÈNE : un monde lumineux par palier, effets, lecteur de combat multi-unités ===== */
const AW = 400, AH = 280, GROUND = 238, EXT = 340, BOT = 70, HORIZON = 176;
const tierIdx = floor => Math.min(TIERS.length - 1, Math.floor((floor - 1) / 10));
const tierOf = floor => TIERS[tierIdx(floor)];

function drawCloud(c, x, y, s, col) {
  const p = cc => { cc.moveTo(x - 30 * s, y); cc.arc(x - 18 * s, y - 4 * s, 13 * s, Math.PI, Math.PI * 1.7); cc.arc(x, y - 12 * s, 17 * s, Math.PI * 1.15, Math.PI * 1.9); cc.arc(x + 20 * s, y - 4 * s, 12 * s, Math.PI * 1.3, 0); cc.lineTo(x + 32 * s, y); cc.closePath(); };
  c.beginPath(); p(c); c.fillStyle = col; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(42,31,61,.18)'; c.stroke();
}
function drawFlower(c, x, y, col, s) {
  s = s || 1;
  c.fillStyle = col; c.strokeStyle = 'rgba(42,31,61,.55)'; c.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const a = i * TAU / 5; c.beginPath(); c.arc(x + Math.cos(a) * 2.6 * s, y + Math.sin(a) * 2.6 * s, 2.2 * s, 0, TAU); c.fill(); c.stroke(); }
  c.beginPath(); c.arc(x, y, 1.6 * s, 0, TAU); c.fillStyle = '#ffb21f'; c.fill();
}
function drawTuft(c, x, y, col) {
  c.strokeStyle = col; c.lineWidth = 1.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x - 4, y - 5); c.moveTo(x, y); c.lineTo(x, y - 7); c.moveTo(x + 3, y); c.lineTo(x + 5, y - 5); c.stroke();
}
function drawProp(c, kind, x, y, s, T, r) {
  const lw = { lw: 2.2 };
  if (kind === 'trees' || kind === 'blossoms') {
    cel(c, Pth.rrect(x - 3 * s, y - 26 * s, 6 * s, 26 * s, 2), '#8a5a3a', lw);
    const leaf = kind === 'blossoms' ? T.far : T.mid;
    cel(c, cc => { cc.arc(x - 9 * s, y - 30 * s, 11 * s, 0, TAU); }, leaf, lw);
    cel(c, cc => { cc.arc(x + 9 * s, y - 31 * s, 11 * s, 0, TAU); }, leaf, lw);
    cel(c, cc => { cc.arc(x, y - 42 * s, 13 * s, 0, TAU); }, leaf, lw);
  } else if (kind === 'pines') {
    cel(c, Pth.rrect(x - 2.5 * s, y - 12 * s, 5 * s, 12 * s, 2), '#7a4f34', lw);
    for (let i = 0; i < 3; i++) cel(c, Pth.poly([x - (16 - i * 4) * s, y - (10 + i * 12) * s, x, y - (34 + i * 12) * s, x + (16 - i * 4) * s, y - (10 + i * 12) * s]), T.mid, lw);
  } else if (kind === 'rocks') {
    cel(c, Pth.poly([x - 20 * s, y, x - 16 * s, y - 22 * s, x - 4 * s, y - 34 * s, x + 12 * s, y - 28 * s, x + 20 * s, y]), T.mid, lw);
  } else if (kind === 'crystals') {
    for (let i = -1; i <= 1; i++) cel(c, Pth.poly([x + i * 9 * s - 5 * s, y, x + i * 9 * s, y - (26 + (i === 0 ? 14 : 0)) * s, x + i * 9 * s + 5 * s, y]), i === 0 ? T.accent : T.mid, lw);
  } else if (kind === 'palms') {
    cel(c, cc => { cc.moveTo(x - 3 * s, y); cc.quadraticCurveTo(x + 4 * s, y - 24 * s, x + 2 * s, y - 46 * s); cc.lineTo(x + 7 * s, y - 46 * s); cc.quadraticCurveTo(x + 9 * s, y - 24 * s, x + 3 * s, y); cc.closePath(); }, '#b07a4a', lw);
    for (const a of [-2.6, -1.9, -1.2, -.5]) cel(c, cc => { cc.moveTo(x + 4 * s, y - 46 * s); cc.quadraticCurveTo(x + 4 * s + Math.cos(a) * 14 * s, y - 46 * s + Math.sin(a) * 14 * s - 6 * s, x + 4 * s + Math.cos(a) * 26 * s, y - 46 * s + Math.sin(a) * 26 * s + 8 * s); cc.quadraticCurveTo(x + 4 * s + Math.cos(a) * 12 * s, y - 46 * s + Math.sin(a) * 12 * s + 2 * s, x + 4 * s, y - 46 * s); cc.closePath(); }, T.mid, lw);
  } else if (kind === 'columns') {
    const h = (r() < .5 ? 40 : 28) * s;
    cel(c, Pth.rrect(x - 7 * s, y - h, 14 * s, h, 2), '#fff2d6', lw);
    cel(c, Pth.rrect(x - 10 * s, y - h - 5 * s, 20 * s, 6 * s, 2), '#fff2d6', lw);
    c.strokeStyle = 'rgba(42,31,61,.25)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - 2 * s, y - h + 2); c.lineTo(x - 2 * s, y - 2); c.moveTo(x + 3 * s, y - h + 2); c.lineTo(x + 3 * s, y - 2); c.stroke();
  } else if (kind === 'stars') {
    cel(c, Pth.poly([x - 18 * s, y - 20 * s, x + 18 * s, y - 20 * s, x + 8 * s, y - 6 * s, x - 6 * s, y - 2 * s]), T.mid, lw);
    star(c, x, y - 34 * s, 5 * s, T.accent);
  } else if (kind === 'clouds') {
    drawCloud(c, x, y - 6 * s, s * .9, '#ffffff');
  }
}

const _bgCache = {};
function arenaBackground(floor, dpr) {
  const ti = tierIdx(floor), key = ti + ':' + dpr;
  if (_bgCache[key]) return _bgCache[key];
  const T = TIERS[ti];
  const cv = document.createElement('canvas'); cv.width = AW * dpr; cv.height = (AH + EXT + BOT) * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr); c.translate(0, EXT);
  const r = makeRng(ti * 77 + 3);
  // ciel
  const g = c.createLinearGradient(0, -EXT, 0, HORIZON); g.addColorStop(0, T.sky[0]); g.addColorStop(1, T.sky[1]);
  c.fillStyle = g; c.fillRect(0, -EXT, AW, HORIZON + EXT);
  if (T.props === 'stars') { c.fillStyle = '#ffffff'; for (let i = 0; i < 70; i++) { c.globalAlpha = r.range(.3, 1); c.fillRect(r.range(0, AW), r.range(-EXT, 120), 1.6, 1.6); } c.globalAlpha = 1; cel(c, Pth.circle(320, 40, 22), '#fff6c9', { lw: 2 }); }
  else { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(330, 30, 30, 0, TAU); c.fill(); c.fillStyle = '#fffbea'; c.beginPath(); c.arc(330, 30, 20, 0, TAU); c.fill(); }
  for (let i = 0; i < 6; i++) drawCloud(c, r.range(-10, AW + 10), r.range(-EXT + 40, 110), r.range(.6, 1.2), 'rgba(255,255,255,.85)');
  // collines lointaines
  for (let i = 0; i < 5; i++) { const x = i * 100 + r.range(-30, 30), rx = r.range(70, 110), ry = r.range(28, 48); c.beginPath(); c.ellipse(x, HORIZON + 6, rx, ry, 0, Math.PI, 0); c.fillStyle = mix(T.far, T.sky[1], .25); c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(42,31,61,.22)'; c.stroke(); }
  // décor intermédiaire
  const xs = [18, 70, 330, 382, 125, 275];
  xs.forEach((x, i) => drawProp(c, T.props, x + r.range(-8, 8), HORIZON + 6 + (i > 3 ? -2 : 4), i > 3 ? .7 : r.range(.85, 1.1), T, r));
  // sol
  c.fillStyle = T.ground; c.fillRect(0, HORIZON, AW, AH + BOT - HORIZON);
  c.strokeStyle = 'rgba(42,31,61,.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, HORIZON); c.lineTo(AW, HORIZON); c.stroke();
  for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(r.range(0, AW), r.range(HORIZON + 20, AH + BOT - 10), r.range(30, 70), r.range(7, 14), 0, 0, TAU); c.fillStyle = i % 2 ? T.ground2 : mix(T.ground, '#ffffff', .18); c.fill(); }
  for (let i = 0; i < 26; i++) drawTuft(c, r.range(0, AW), r.range(HORIZON + 8, AH + BOT - 4), shadeOf(T.ground2));
  for (let i = 0; i < 12; i++) drawFlower(c, r.range(0, AW), r.range(HORIZON + 10, AH + BOT - 6), T.flower, r.range(.8, 1.15));
  for (let i = 0; i < 4; i++) cel(c, Pth.ellipse(r.range(0, AW), r.range(HORIZON + 20, AH + BOT - 10), r.range(6, 11), r.range(3.5, 5)), mix(T.ground2, '#8a86a8', .5), { lw: 1.8 });
  // cercle d'arène
  c.beginPath(); c.ellipse(200, GROUND + 4, 152, 32, 0, 0, TAU); c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.55)'; c.stroke();
  c.lineWidth = 1.5; c.strokeStyle = 'rgba(42,31,61,.18)'; c.stroke();
  _bgCache[key] = cv;
  return cv;
}

/* ---------- Lecteur de combat : rejoue les événements simulés ---------- */
const PET_SLOTS_POS = [[-32, 14], [-54, -8], [-14, 28]];
const HOME_L = 148, HOME_R = 252;
class FightPlayer {
  constructor(canvas, o) {
    this.cv = canvas; this.o = o; this.speed = o.speed || 1; this.slow = 1;
    this.clock = 0; this.waits = []; this.tweens = []; this.fx = []; this.texts = []; this.shakeAmt = 0; this.skipped = false; this.alive = true;
    this.F = o.F; this.qte = null; this.queue = []; this.orbs = []; this.orbXp = 0; this.orbN = 0;
    this.onTap = ev => this.tap(ev); canvas.addEventListener('pointerdown', this.onTap);
    this.v = {};
    this.v.L = makeView(o.heroEnt, o.heroEquip, 'L', HOME_L, GROUND); this.v.L.name = o.heroEnt.name;
    this.v.R = makeView(o.enemy, o.enemy.equip, 'R', HOME_R, GROUND); this.v.R.name = o.enemy.name;
    (o.heroPets || []).filter(Boolean).forEach((p, i) => { const q = PET_SLOTS_POS[i]; const v = makePetView(p, 'L', HOME_L + q[0], GROUND + q[1]); v.name = p.name; this.v['L' + (i + 1)] = v; });
    (o.enemy.pets || []).forEach((p, i) => { const q = PET_SLOTS_POS[i]; const v = makePetView(p, 'R', HOME_R - q[0], GROUND + q[1]); v.name = p.name; this.v['R' + (i + 1)] = v; });
    this.tier = tierOf(o.floor);
    this.motes = Array.from({ length: 16 }, () => ({ x: Math.random() * AW, y: Math.random() * AH, s: .4 + Math.random() * .8, ph: Math.random() * 6 }));
    this.last = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  wait(ms) { if (this.skipped) return Promise.resolve(); return new Promise(res => this.waits.push({ at: this.clock + ms, res })); }
  tween(obj, key, to, ms, ease) {
    if (this.skipped) { obj[key] = to; return Promise.resolve(); }
    return new Promise(res => this.tweens.push({ obj, key, from: obj[key], to, t0: this.clock, ms: Math.max(1, ms), ease: ease || Ease.outQuad, res }));
  }
  move(v, x, y, ms, ease) { return Promise.all([this.tween(v, 'x', x, ms, ease), this.tween(v, 'y', y, ms, ease)]); }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  slowmo(f, ms) { this.slow = f; setTimeout(() => { this.slow = 1; }, ms); }
  text(x, y, str, col, size, vy) { if (!this.skipped) this.texts.push({ x, y, str, col, size: size || 18, life: 0, max: 900, vy: vy == null ? -.045 : vy }); }
  burst(x, y, col, n, kind) {
    if (this.skipped) return;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = .08 + Math.random() * .25; this.fx.push({ kind: kind || 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'dust' ? .02 : .05), life: 0, max: 260 + Math.random() * 220, col, s: 2 + Math.random() * 3, rot: Math.random() * TAU }); }
  }
  impact(x, y, big) { if (!this.skipped) this.fx.push({ kind: 'impact', x, y, life: 0, max: big ? 220 : 160, s: big ? 1.5 : 1, rot: Math.random() * TAU }); }
  slashFx(v) { if (!this.skipped) this.fx.push({ kind: 'slash', x: v.x + v.face * 22, y: v.y - (v.kind === 'pet' ? 26 : 62), face: v.face, life: 0, max: 170, small: v.kind === 'pet' }); }
  top(v) { return v.y - (v.kind === 'pet' ? 46 : 124 * v.scale); }
  chest(v) { return v.y - (v.kind === 'pet' ? 22 : 52 * v.scale); }

  loop(now) {
    if (!this.alive) return;
    const rdt = Math.min(50, now - this.last); this.last = now;
    if (this.qte && !this.qte.done) { this.qte.real += rdt; this.slow = .28; if (this.qte.real >= this.qte.dur) this.endQte(false); }
    for (const o of this.orbs) { o.life += rdt; o.y += o.vy * rdt * (o.life < 400 ? 1 : .1); }
    this.orbs = this.orbs.filter(o => !o.got && o.life < o.max);
    const dt = rdt * this.speed * this.slow;
    this.clock += dt;
    for (const tw of this.tweens.slice()) {
      const k = clamp((this.clock - tw.t0) / tw.ms, 0, 1);
      tw.obj[tw.key] = lerp(tw.from, tw.to, tw.ease(k));
      if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.res(); }
    }
    for (const w of this.waits.slice()) if (this.clock >= w.at) { this.waits.splice(this.waits.indexOf(w), 1); w.res(); }
    for (const id in this.v) updateView(this.v[id], dt);
    this.draw(now, dt);
    requestAnimationFrame(this.loop);
  }
  draw(now, dt) {
    const cv = this.cv, dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d');
    const cw = cv.width, ch = cv.height;
    /* cadrage portrait : zoom avec rognage latéral max 30%, ciel et sol prolongés */
    const s = Math.max(cw / AW, Math.min(ch / AH, cw / (AW * .6)));
    const extra = Math.max(0, ch / s - AH), botExtra = Math.min(BOT - 10, extra * .3);
    const ox = (cw - AW * s) / 2, oy = ch - (AH + botExtra) * s;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = this.tier.sky[0]; c.fillRect(0, 0, cw, ch);
    this.shakeAmt *= Math.pow(.9, dt / 16);
    const sx = (Math.random() - .5) * this.shakeAmt * 2, sy = (Math.random() - .5) * this.shakeAmt * 2;
    this.tf = [s, ox + sx * s, oy + sy * s];
    c.setTransform(s, 0, 0, s, this.tf[1], this.tf[2]);
    c.drawImage(arenaBackground(this.o.floor, Math.max(1, Math.round(s))), -4, -EXT - 4, AW + 8, AH + EXT + BOT + 8);
    // pétales / lucioles
    for (const m of this.motes) {
      m.y += m.s * dt * .012; m.x += Math.sin(now / 700 + m.ph) * .25;
      if (m.y > AH + 20) { m.y = -20; m.x = Math.random() * AW; }
      c.globalAlpha = .7; c.fillStyle = this.tier.flower; c.beginPath(); c.ellipse(m.x, m.y, 2.2 * m.s, 1.3 * m.s, now / 500 + m.ph, 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
    // unités triées par profondeur (KO au fond)
    const order = Object.values(this.v).sort((a, b) => (b.pose.rot ? 1 : 0) - (a.pose.rot ? 1 : 0) || a.y - b.y);
    for (const v of order) {
      if (v.glow > 0) { const g = c.createRadialGradient(v.x, this.chest(v), 5, v.x, this.chest(v), 70); g.addColorStop(0, `rgba(120,255,160,${.55 * v.glow})`); g.addColorStop(1, 'rgba(120,255,160,0)'); c.fillStyle = g; c.fillRect(v.x - 80, v.y - 150, 160, 180); }
      if (v.flash > 0) this.drawFlashed(c, v, now); else drawFighter(c, v, now);
    }
    for (const f of this.fx.slice()) {
      f.life += dt; const k = f.life / f.max;
      if (k >= 1) { this.fx.splice(this.fx.indexOf(f), 1); continue; }
      if (f.kind === 'spark' || f.kind === 'dust') {
        f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.kind === 'dust' ? -.0002 : .0007) * dt;
        c.globalAlpha = 1 - k;
        if (f.kind === 'dust') { c.beginPath(); c.arc(f.x, f.y, f.s * (1 + k * 2), 0, TAU); c.fillStyle = f.col; c.fill(); }
        else { c.save(); c.translate(f.x, f.y); c.rotate(f.rot + k * 3); c.fillStyle = f.col; c.strokeStyle = INK; c.lineWidth = .8; c.beginPath(); c.rect(-f.s, -f.s * .4, f.s * 2, f.s * .8); c.fill(); c.stroke(); c.restore(); }
        c.globalAlpha = 1;
      } else if (f.kind === 'impact') {
        const r = (10 + 26 * Ease.outCubic(k)) * f.s;
        c.save(); c.translate(f.x, f.y); c.rotate(f.rot); c.globalAlpha = 1 - k * k;
        c.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16, rr = i % 2 ? r * .45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath();
        c.fillStyle = '#fff8d6'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = INK; c.stroke();
        c.restore(); c.globalAlpha = 1;
      } else if (f.kind === 'slash') {
        const R = f.small ? 24 : 40;
        c.save(); c.translate(f.x, f.y); c.scale(f.face, 1); c.globalAlpha = 1 - k;
        c.beginPath(); c.arc(0, 18, R, -2.2 + k * .6, .3 + k * .3); c.arc(0, 22, R * .78, .3 + k * .3, -2.2 + k * .6, true); c.closePath();
        c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(42,31,61,.5)'; c.stroke();
        c.restore(); c.globalAlpha = 1;
      }
    }
    this.drawOverlays(c, now);
    for (const tx of this.texts.slice()) {
      tx.life += dt; const k = tx.life / tx.max;
      if (k >= 1) { this.texts.splice(this.texts.indexOf(tx), 1); continue; }
      tx.y += tx.vy * dt;
      const pop = k < .15 ? Ease.outBack(k / .15) : 1;
      c.save(); c.translate(tx.x, tx.y); c.scale(pop, pop); c.globalAlpha = k > .7 ? 1 - (k - .7) / .3 : 1;
      c.font = `${tx.size}px "Lilita One", Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineJoin = 'round'; c.lineWidth = tx.size * .3; c.strokeStyle = INK; c.strokeText(tx.str, 0, 0);
      c.fillStyle = tx.col; c.fillText(tx.str, 0, 0);
      c.restore();
    }
  }
  drawOverlays(c, now) {
    for (const id in this.v) {
      const v = this.v[id];
      if (v.shieldFx > 0) { v.shieldFx = Math.max(0, v.shieldFx - .004); c.save(); c.globalAlpha = .25 + .2 * Math.sin(now / 120); c.strokeStyle = '#8fe3ff'; c.lineWidth = 3; c.beginPath(); c.ellipse(v.x, this.chest(v) - 6, 40, 62, 0, 0, TAU); c.stroke(); c.restore(); }
      if (this.F && id === 'L' && this.F.U.L.shield > 0 && !v.shieldFx) v.shieldFx = .6;
      if (v.charge > 0) { c.save(); c.globalAlpha = .35 + .25 * Math.sin(now / 80); const g = c.createRadialGradient(v.x, this.chest(v), 4, v.x, this.chest(v), 60); g.addColorStop(0, 'rgba(255,170,80,.9)'); g.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = g; c.fillRect(v.x - 60, this.chest(v) - 60, 120, 120); c.restore(); }
    }
    for (const o of this.orbs) {
      const k = o.life / o.max, a = k > .75 ? (1 - k) / .25 : 1, r = 11 + Math.sin(now / 160 + o.ph) * 1.5;
      c.save(); c.globalAlpha = a;
      const g = c.createRadialGradient(o.x, o.y, 2, o.x, o.y, r * 2.2); g.addColorStop(0, 'rgba(255,230,120,.9)'); g.addColorStop(1, 'rgba(255,200,60,0)'); c.fillStyle = g; c.beginPath(); c.arc(o.x, o.y, r * 2.2, 0, TAU); c.fill();
      c.translate(o.x, o.y); c.rotate(now / 600 + o.ph); c.beginPath(); for (let i = 0; i < 10; i++) { const an = i * TAU / 10 - Math.PI / 2, rr = i % 2 ? r * .45 : r; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.closePath();
      c.fillStyle = '#ffd84a'; c.fill(); c.lineWidth = 1.6; c.strokeStyle = INK; c.stroke(); c.restore();
    }
    const q = this.qte;
    if (q && !q.done) {
      const k = clamp(q.real / q.dur, 0, 1), inZone = k >= q.zone, parry = q.kind === 'parry';
      const x = q.v.x, y = this.chest(q.v) - 4, R0 = 80, R1 = 25, rr = lerp(R0, R1, k), rz = lerp(R0, R1, q.zone);
      const col = parry ? '#5fc8ff' : '#ffd84a';
      c.save();
      c.globalAlpha = .9; c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.55)'; c.setLineDash([4, 5]); c.beginPath(); c.arc(x, y, rz, 0, TAU); c.stroke(); c.setLineDash([]);
      c.lineWidth = inZone ? 6 : 4; c.strokeStyle = INK; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.stroke();
      c.lineWidth = inZone ? 3.5 : 2.2; c.strokeStyle = inZone ? '#ffffff' : col; c.beginPath(); c.arc(x, y, rr, 0, TAU); c.stroke();
      c.beginPath(); c.arc(x, y, R1, 0, TAU); c.fillStyle = inZone ? col : 'rgba(255,255,255,.3)'; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
      c.font = '13px "Lilita One", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineJoin = 'round'; c.lineWidth = 3.5; c.strokeStyle = INK; c.fillStyle = '#fff';
      const word = parry ? 'PARE' : 'TAPE';
      c.strokeText(word, x, y + 1); c.fillText(word, x, y + 1);
      if (parry) { const fx = q.from.x, fy = this.top(q.from) - 22, bob = Math.sin(now / 70) * 2; c.font = '30px "Lilita One", Impact, sans-serif'; c.lineWidth = 6; c.strokeText('!', fx, fy + bob); c.fillStyle = '#ff5a4f'; c.fillText('!', fx, fy + bob); }
      if (this.qteN <= 3 && this.o.tutorial) {
        c.font = '13px "Lilita One", Impact, sans-serif'; c.lineWidth = 4; c.fillStyle = '#fff';
        const t1 = parry ? 'COUP DANGEREUX !' : 'COUP PARFAIT', t2 = 'Tape quand le cercle se ferme';
        c.font = '15px "Lilita One", Impact, sans-serif'; c.strokeText(t1, 200, 34); c.fillText(t1, 200, 34);
        c.font = '12px "Lilita One", Impact, sans-serif'; c.strokeText(t2, 200, 52); c.fillText(t2, 200, 52);
      }
      c.restore();
    }
  }
  drawFlashed(c, v, now) {
    if (!this._off) this._off = document.createElement('canvas');
    const o = this._off; if (o.width !== this.cv.width || o.height !== this.cv.height) { o.width = this.cv.width; o.height = this.cv.height; }
    const oc = o.getContext('2d'); oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(0, 0, o.width, o.height);
    oc.setTransform(this.tf[0], 0, 0, this.tf[0], this.tf[1], this.tf[2]); drawFighter(oc, v, now);
    oc.setTransform(1, 0, 0, 1, 0, 0); oc.globalCompositeOperation = 'source-atop'; oc.fillStyle = `rgba(255,255,255,${v.flash * .85})`; oc.fillRect(0, 0, o.width, o.height); oc.globalCompositeOperation = 'source-over';
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(o, 0, 0); c.restore();
  }
  setHp(hp) { if (hp) this.o.onHp && this.o.onHp(hp); }
  log(t, side) { this.o.onLog && this.o.onLog(t, side); }
  sync() { this.o.onRage && this.o.onRage(this.F); }

  /* ----- Entrées joueur ----- */
  arenaXY(ev) {
    const r = this.cv.getBoundingClientRect(), dpr = this.cv.width / r.width;
    return [((ev.clientX - r.left) * dpr - this.tf[1]) / this.tf[0], ((ev.clientY - r.top) * dpr - this.tf[2]) / this.tf[0]];
  }
  tap(ev) {
    if (this.skipped || !this.tf) return;
    const q = this.qte;
    if (q && !q.done) {
      const k = q.real / q.dur;
      if (k >= q.zone) { this.endQte(true); }
      else { this.endQte(false); this.text(q.v.x, this.top(q.v) - 30, 'TROP TÔT', '#ff9d9d', 15, -.02); }
      return;
    }
    const [x, y] = this.arenaXY(ev);
    for (const o of this.orbs) if (!o.got && Math.hypot(o.x - x, o.y - y) < 30) {
      o.got = true; this.orbXp += o.val; Sfx.play('xp');
      this.text(o.x, o.y - 10, '+' + o.val + ' XP', '#ffd84a', 17); this.burst(o.x, o.y, '#ffd84a', 10);
      this.o.onOrb && this.o.onOrb(this.orbXp);
      return;
    }
  }
  startQte(kind, v, from) {
    if (this.skipped) return Promise.resolve(false);
    this.qteN = (this.qteN || 0) + 1;
    return new Promise(res => { this.qte = { kind, v, from, real: 0, dur: kind === 'parry' ? 760 : 680, zone: .52, res, done: false }; });
  }
  endQte(ok) {
    const q = this.qte; if (!q || q.done) return;
    q.done = true; this.qte = null; this.slow = 1;
    if (ok) { Sfx.play(q.kind === 'parry' ? 'block' : 'crit'); this.o.onQte && this.o.onQte(q.kind); }
    q.res(ok);
  }
  queueActive(id) { if (!this.queue.includes(id)) this.queue.push(id); }
  spawnOrb(x, y) {
    if (this.skipped || this.orbN >= 5) return;
    this.orbN++;
    this.orbs.push({ x: x + (Math.random() - .5) * 40, y: y - 30 - Math.random() * 30, vy: -.02, life: 0, max: 2600, val: this.o.orbVal || 5, got: false, ph: Math.random() * 6 });
  }

  /* ----- Boucle de combat interactive ----- */
  async run() {
    const F = this.F;
    this.text(200, 70, 'ÉTAGE ' + this.o.floor, '#ffffff', 24, -.004);
    if (this.o.enemy.boss) { this.text(200, 100, this.o.enemy.title.toUpperCase(), '#ffd84a', 15, -.004); this.shake(5); Sfx.play('ko'); }
    this.sync();
    await this.wait(this.o.enemy.boss ? 900 : 500);
    let guard = 0;
    while (!F.over && guard++ < 6000) {
      if (this.skipped) { F.runAuto(); break; }
      // techniques demandées par le joueur (ou automatiques si la rage déborde)
      let acts = [];
      while (this.queue.length) { const ev = F.useActive(this.queue.shift()); if (ev) acts.push(...ev); }
      if (!acts.length && F.rage() >= RAGE.max) acts = F.autoActives();
      for (const e of acts) await this.playEvent(e);
      if (acts.length) this.sync();
      if (F.over) break;
      const n = F.next(); if (!n) break;
      for (const e of n.events) await this.playEvent(e);
      if (!n.strike) { this.sync(); continue; }
      const input = await this.playWindup(n.strike);
      const r = F.resolve(input);
      for (const e of r.events) await this.playEvent(e);
      this.sync();
      await this.afterStrike(n.strike, r.cont);
    }
    const winner = F.winner || 'L';
    if (this.skipped) this.finalize(); else await this.playEnd(winner);
    return F.result([]);
  }
  async playEvent(e) {
    if (e.type === 'atk') return this.playHit(e);
    this.setHp(e.hp);
    if (e.type === 'down') { const v = this.v[e.id]; setPose(v, 'ko', 8); v.expr = 'ko'; this.tween(v, 'alpha', .55, 500); this.log(`${v.name} est hors de combat.`, e.id[0]); if (e.id[0] === 'R') this.spawnOrb(v.x, v.y - 30); }
    else if (e.type === 'skill') {
      const v = this.v[e.who]; v.glow = 1; Sfx.play('heal');
      this.text(v.x, this.top(v) - 14, 'SECOND SOUFFLE', '#8dffb0', 15, -.02); this.text(v.x, this.top(v) + 10, '+' + e.heal, '#8dffb0', 20);
      this.log(`${v.name} reprend son souffle (+${e.heal} PV).`, e.who[0]);
      await this.wait(500);
    } else if (e.type === 'regen') { const v = this.v[e.who]; this.text(v.x + 12, this.top(v) + 8, '+' + e.heal, '#8dffb0', 13); }
    else if (e.type === 'stunned') { const v = this.v[e.who]; v.stun = 1.2; this.text(v.x, this.top(v) - 20, 'SONNÉ', '#ffe066', 14, -.02); this.log(`${v.name} est sonné et perd son tour.`, e.who[0]); await this.wait(420); }
    else if (e.type === 'active') await this.playActive(e);
  }
  async playActive(e) {
    const H = this.v.L, R = this.v.R, A = ACTIVES[e.id];
    H.glow = 1; setPose(H, 'windup', 18); Sfx.play('level'); this.slowmo(.4, 260);
    this.text(H.x, this.top(H) - 22, A.name.toUpperCase(), '#ffd84a', 16, -.015);
    this.log(`${H.name} : ${A.name}.`, 'L');
    if (e.id === 'soin') { Sfx.play('heal'); this.text(H.x, this.top(H) + 6, '+' + e.heal, '#8dffb0', 22); }
    else if (e.id === 'bouclier') H.shieldFx = 1;
    else if (e.id === 'cri') { this.shake(8); R.stun = 2; this.text(R.x, this.top(R) - 16, 'ÉTOURDI', '#ffe066', 15, -.02); }
    else if (e.id === 'devaste') { H.charge = 1; }
    else if (e.id === 'brise') { this.burst(R.x, this.chest(R), '#cfd6de', 12); this.text(R.x, this.top(R) - 10, 'ARMURE BRISÉE', '#cfd6de', 13, -.02); }
    else if (e.id === 'balayage') {
      setPose(H, 'strike', 30); this.shake(6); Sfx.play('crit');
      for (const t of e.hits) { const v = this.v[t.id]; v.flash = 1; setPose(v, 'hit', 30); this.impact(v.x, this.chest(v), false); this.text(v.x, this.top(v) + 4, String(t.dmg), '#ffffff', 20); }
    }
    this.setHp(e.hp);
    await this.wait(420);
    setPose(H, 'idle', 10);
    for (const id in this.v) if (id[0] === 'R' && !this.v[id].pose.rot) setPose(this.v[id], 'idle', 10);
  }
  async playWindup(s) {
    const A = this.v[s.a], D = this.v[s.d];
    const reach = (A.kind === 'pet' ? 30 : 44 + WEAPONS[A.gear.weapon].reach * .55) + (D.kind === 'pet' ? -6 : 0) + (D.boss ? 8 : 0);
    const tx = D.x - A.face * reach, ty = D.y + (D.kind === 'pet' ? -2 : 1);
    if (Math.abs(A.x - tx) > 6 || Math.abs(A.y - ty) > 6) {
      A.running = true; setPose(A, 'run', 10);
      await this.move(A, tx, ty, Math.hypot(A.x - tx, A.y - ty) / .55, Ease.linear);
      A.running = false;
    }
    if (s.counter) { this.text(A.x, this.top(A) - 10, 'RIPOSTE', '#ffd84a', 14, -.02); this.log(`${A.name} riposte !`, s.a[0]); }
    setPose(A, 'windup', 24);
    const input = {};
    if (!this.skipped && s.heroStrike) { input.perfect = await this.startQte('perfect', D, A); }
    else if (!this.skipped && s.telegraph) { Sfx.play('swoosh'); input.parry = await this.startQte('parry', D, A); }
    else await this.wait(A.kind === 'pet' ? 90 : 110);
    return input;
  }
  async playHit(e) {
    const A = this.v[e.a], D = this.v[e.d], sideA = e.a[0], sideD = e.d[0];
    setPose(A, 'strike', 42); this.slashFx(A); Sfx.play('swoosh'); A.charge = 0;
    await this.wait(55);
    const hx = D.x - D.face * 4, hy = this.chest(D);
    if (e.res === 'dodge') {
      setPose(D, 'dodge', 26); Sfx.play('dodge');
      this.text(D.x, this.top(D) - 6, 'ESQUIVE', '#bfe7ff', 16, -.03);
      this.log(`${D.name} esquive.`, sideD);
      await this.tween(D, 'x', D.x - D.face * 30, 150);
      setPose(D, 'idle', 10); await this.tween(D, 'x', D.x + D.face * 30, 170);
    } else if (e.res === 'block') {
      setPose(D, 'block', 30); Sfx.play('block'); this.burst(hx, hy, '#e8eef5', 8);
      this.text(D.x, this.top(D) - 6, 'PARADE', '#e8eef5', 16, -.03);
      this.log(`${D.name} pare le coup.`, sideD);
      await this.wait(240);
    } else {
      const big = e.crit || e.heavy || e.perfect || e.devast;
      if (e.parried) { setPose(D, 'block', 30); this.burst(hx, hy, '#bfe7ff', 14); this.text(D.x, this.top(D) - 26, 'PARÉ !', '#bfe7ff', 20, -.02); }
      else { D.flash = 1; setPose(D, 'hit', 32); D.expr = 'hurt'; }
      if (e.shielded) { D.shieldFx = 1; this.burst(hx, hy, '#8fe3ff', 10); }
      this.impact(hx, hy, big); this.burst(hx, hy, e.crit || e.perfect ? '#ffd84a' : '#ffffff', big ? 14 : 8);
      this.shake(e.devast ? 10 : big ? 7 : e.parried ? 2 : 3.2);
      Sfx.play(big ? 'crit' : 'hit');
      this.text(D.x + (Math.random() - .5) * 18, this.top(D) + 4, String(e.dmg), big ? '#ffd84a' : '#ffffff', big ? 30 : 22);
      if (e.perfect) { this.text(D.x, this.top(D) - 26, 'PARFAIT !', '#ffd84a', 19, -.02); this.slowmo(.35, 200); if (Math.random() < .5) this.spawnOrb(D.x, D.y - 40); }
      else if (e.devast) { this.text(D.x, this.top(D) - 26, 'DÉVASTATEUR', '#ff9d5c', 17, -.02); this.slowmo(.3, 260); }
      else if (e.crit) { this.text(D.x, this.top(D) - 24, 'CRITIQUE', '#ffd84a', 15, -.02); this.slowmo(.35, 180); }
      else if (e.heavy) this.text(D.x, this.top(D) - 24, 'FRACAS', '#ff9d5c', 15, -.02);
      if (e.pierce) this.text(D.x, this.top(D) - 42, 'SANS ARMURE', '#cfd6de', 12, -.02);
      if (e.heal) this.text(A.x, this.top(A) + 4, '+' + e.heal, '#8dffb0', 16);
      if (e.thorns) { A.flash = .7; this.text(A.x, this.top(A), '-' + e.thorns, '#ff9d9d', 15); }
      if (e.stun) { D.stun = 1.6; this.text(D.x, this.top(D) - 34, 'ÉTOURDI', '#ffe066', 13, -.02); }
      this.setHp(e.hp);
      this.log(`${A.name} frappe ${D.name} : ${e.dmg}${e.crit ? ' (critique)' : ''}${e.parried ? ' (paré)' : ''}${e.perfect ? ' (parfait)' : ''}.`, sideA);
      this.tween(D, 'x', D.x + A.face * 9, 90);
      await this.wait(big ? 280 : 210);
    }
  }
  async afterStrike(s, cont) {
    const A = this.v[s.a], D = this.v[s.d];
    if (this.F.over) return;
    if (cont === 'combo') { this.text(A.x, this.top(A) - 10, 'ENCHAÎNEMENT', '#ffd84a', 12, -.02); if (!D.pose.rot) { setPose(D, 'idle', 8); D.expr = 'neutral'; } return; }
    if (cont === 'counter') { setPose(A, 'idle', 12); D.expr = 'neutral'; return; }
    if (!D.pose.rot) { setPose(D, 'idle', 8); D.expr = 'neutral'; }
    const back = v => {
      if (v.pose.rot) return Promise.resolve();
      if (Math.abs(v.x - v.homeX) < 4 && Math.abs(v.y - v.homeY) < 4) { setPose(v, 'idle', 10); return Promise.resolve(); }
      const away = Math.sign(v.homeX - v.x) !== v.face;
      if (away) v.face *= -1;
      v.running = true; setPose(v, 'run', 10);
      return this.move(v, v.homeX, v.homeY, Math.hypot(v.x - v.homeX, v.y - v.homeY) / .6, Ease.linear).then(() => { v.running = false; if (away) v.face *= -1; setPose(v, 'idle', 10); });
    };
    await Promise.all([back(A), back(D)]);
    await this.wait(80);
  }
  async playEnd(W) {
    const Lz = W === 'L' ? 'R' : 'L';
    const lv = this.v[Lz];
    setPose(lv, 'ko', 7); lv.expr = 'ko'; lv.stun = 0;
    Sfx.play('ko'); this.shake(9); this.slowmo(.3, 650);
    this.burst(lv.x - lv.face * 18, lv.y - 4, 'rgba(255,255,255,.85)', 10, 'dust');
    await this.wait(380);
    for (const id in this.v) {
      const v = this.v[id]; if (v.pose.rot && id !== Lz) continue;
      if (id[0] === W) { v.running = false; setPose(v, 'victory', 6); v.expr = 'grin'; }
    }
    const wv = this.v[W];
    this.text(wv.x, this.top(wv) - 20, W === 'L' ? 'VICTOIRE' : 'DÉFAITE', W === 'L' ? '#ffd84a' : '#ff6b6b', 24, -.01);
    await this.wait(1100);
  }
  skip() {
    this.skipped = true; this.texts = []; this.fx = []; this.orbs = [];
    if (this.qte) this.endQte(false);
    for (const tw of this.tweens) { tw.obj[tw.key] = tw.to; tw.res(); } this.tweens = [];
    for (const w of this.waits) w.res(); this.waits = [];
  }
  finalize() {
    const hp = this.F.snap(), W = this.F.winner;
    this.setHp(hp);
    for (const id in this.v) {
      const v = this.v[id]; v.running = false; v.x = v.homeX; v.y = v.homeY; v.face = id[0] === 'L' ? 1 : -1; v.stun = 0; v.shieldFx = 0; v.charge = 0;
      const dead = hp[id] === 0 || id === (W === 'L' ? 'R' : 'L');
      if (dead) { setPose(v, 'ko', 50); v.expr = 'ko'; } else if (id[0] === W) { setPose(v, 'victory', 50); v.expr = 'grin'; } else setPose(v, 'idle', 50);
    }
  }
  destroy() { this.alive = false; this.cv.removeEventListener('pointerdown', this.onTap); if (this.qte) this.endQte(false); }
}
/* ---------- Audio : synthé minimal, zéro fichier ---------- */
const Sfx = {
  ctx: null, on: true,
  init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.on = false; } },
  _noise(dur, freq, q, vol, sweep) {
    const a = this.ctx, n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    n.buffer = b; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, a.currentTime + dur);
    const g = a.createGain(); g.gain.value = vol; n.connect(f); f.connect(g); g.connect(a.destination); n.start();
  },
  _tone(freq, dur, type, vol, slide, delay) {
    const a = this.ctx, o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (delay || 0);
    o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur);
  },
  play(name) {
    if (!this.on || !this.ctx) return;
    try {
      if (name === 'swoosh') this._noise(.14, 900, 1.2, .35, 3000);
      else if (name === 'hit') { this._noise(.12, 400, .8, .9); this._tone(140, .14, 'sine', .5, 60); }
      else if (name === 'crit') { this._noise(.18, 500, .7, 1); this._tone(180, .2, 'square', .18, 50); this._tone(880, .12, 'triangle', .15); }
      else if (name === 'block') { this._tone(1400, .12, 'square', .07, 900); this._noise(.06, 3000, 4, .4); }
      else if (name === 'dodge') this._noise(.12, 1800, 2, .25, 600);
      else if (name === 'ko') { this._tone(110, .6, 'sine', .7, 35); this._noise(.4, 200, .6, .6); }
      else if (name === 'heal') { [523, 659, 784].forEach((f, i) => this._tone(f, .18, 'triangle', .12, null, i * .06)); }
      else if (name === 'xp' || name === 'soul') { [784, 988, 1319].forEach((f, i) => this._tone(f, .22, 'sine', .1, null, i * .07)); }
      else if (name === 'level') { [392, 523, 659, 784, 1046].forEach((f, i) => this._tone(f, .3, 'triangle', .14, null, i * .08)); }
      else if (name === 'death') { this._tone(220, 1.4, 'sawtooth', .08, 55); this._tone(165, 1.6, 'sine', .25, 40); }
      else if (name === 'tap') this._tone(660, .05, 'triangle', .06);
    } catch (e) { /* audio non critique */ }
  },
};

