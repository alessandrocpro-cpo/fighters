/* ===== RENDU : héros chibi style flash (dégradés doux, trait brun fin) + familiers ===== */
const INK = '#2a1f3d';
const _rgb = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
function mix(a, b, t) { const A = _rgb(a), B = _rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const _sc = {};
const shadeOf = c => _sc[c] || (_sc[c] = mix(c, '#4a2f7a', .3));
const lightOf = c => mix(c, '#ffffff', .45);

/* Aplat + ombre douce décalée (lumière haut-gauche) + contour encre */
function cel(c, path, color, o) {
  o = o || {};
  c.beginPath(); path(c); c.fillStyle = o.shade || shadeOf(color); c.fill();
  c.save(); c.beginPath(); path(c); c.clip();
  c.translate(o.lx == null ? -1.8 : o.lx, o.ly == null ? -2.4 : o.ly);
  c.beginPath(); path(c); c.fillStyle = color; c.fill();
  c.restore();
  if (o.lw !== 0) { c.beginPath(); path(c); c.lineWidth = o.lw || 2.4; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
}
const Pth = {
  capsule: (x0, y0, x1, y1, r0, r1) => c => { const a = Math.atan2(y1 - y0, x1 - x0); c.arc(x0, y0, r0, a + Math.PI / 2, a - Math.PI / 2); c.arc(x1, y1, r1, a - Math.PI / 2, a + Math.PI / 2); c.closePath(); },
  circle: (x, y, r) => c => c.arc(x, y, r, 0, TAU),
  ellipse: (x, y, rx, ry, rot) => c => c.ellipse(x, y, rx, ry, rot || 0, 0, TAU),
  poly: pts => c => { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); },
  rrect: (x, y, w, h, r) => c => { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); },
};
function ik2(hx, hy, fx, fy, l1, l2) {
  let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy);
  const mx = l1 + l2 - .01; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
  const a = Math.atan2(dy, dx), b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  return { kx: hx + Math.cos(a - b) * l1, ky: hy + Math.sin(a - b) * l1, fx: hx + dx, fy: hy + dy };
}

const CH = 1; // échelle globale du héros dans l'arène
const BUILD = { fin: .88, normal: 1, massif: 1.18 };
const POSES = {
  idle:    { lean: .06, crouch: 3,  armF: .7, elbF: 1.25, armB: .45, elbB: 1.2, wpn: .65, head: 0,    fF: 9,  fB: -9,  lF: 0, bodyY: 0,   rot: 0 },
  run:     { lean: .3,  crouch: 5,  armF: .9,  elbF: 1.2, armB: -.4, elbB: 1.2, wpn: .3, head: -.05, fF: 9,  fB: -9,  lF: 0, bodyY: 0,   rot: 0 },
  windup:  { lean: -.2, crouch: 7,  armF: 3.3, elbF: .35, armB: .6,  elbB: .6, wpn: .3,  head: -.05, fF: 13, fB: -12, lF: 0, bodyY: 0,   rot: 0 },
  strike:  { lean: .45, crouch: 10, armF: 1.15, elbF: .05, armB: -.7, elbB: .4, wpn: 1.3, head: .1,  fF: 21, fB: -16, lF: 0, bodyY: 0,   rot: 0 },
  hit:     { lean: -.28, crouch: 4, armF: .2,  elbF: .6,  armB: -.5, elbB: .5, wpn: -.6, head: -.22,  fF: 6,  fB: -14, lF: 0, bodyY: 0,   rot: 0 },
  dodge:   { lean: -.5, crouch: 2,  armF: .5,  elbF: 1.6, armB: 1.0, elbB: 1.4, wpn: -.5, head: -.2, fF: 10, fB: -14, lF: 7, bodyY: -16, rot: 0 },
  block:   { lean: -.08, crouch: 8, armF: 2.0, elbF: 1.5, armB: 1.3, elbB: 1.7, wpn: -1.0, head: -.18, fF: 11, fB: -13, lF: 0, bodyY: 0,  rot: 0 },
  victory: { lean: -.06, crouch: 3, armF: .6, elbF: 2.0, armB: -.5, elbB: -2.0, wpn: -1.2, head: -.14, fF: 13, fB: -13, lF: 0, bodyY: 0,   rot: 0 },
  ko:      { lean: -.1, crouch: 1,  armF: .9,  elbF: .3,  armB: 1.6, elbB: .2, wpn: .4,  head: -.3,  fF: 6,  fB: -4,  lF: 0, bodyY: 0,   rot: -1.5 },
};
function makeView(ent, equip, side, x, y) {
  const w = equip && equip.weapon, a = equip && equip.armor;
  return {
    kind: 'hero', x, y, homeX: x, homeY: y, face: side === 'L' ? 1 : -1, scale: ent.boss ? 1.12 : 1, look: ent.look, boss: !!ent.boss,
    gear: { weapon: w ? w.base : 'poings', wRar: w ? w.rarity : 0, armor: a ? a.base : null, aRar: a ? a.rarity : 0 },
    pose: { ...POSES.idle }, target: POSES.idle, rate: 10, running: false, runT: 0, flash: 0, alpha: 1,
    phase: Math.random() * 10, expr: 'neutral', stun: 0, glow: 0,
  };
}
function setPose(v, name, rate) { v.target = (v.kind === 'pet' ? PET_POSES : POSES)[name]; v.rate = rate || 12; }
function updateView(v, dt) {
  const k = 1 - Math.exp(-v.rate * dt / 1000);
  for (const key in v.target) v.pose[key] += (v.target[key] - v.pose[key]) * k;
  if (v.running) v.runT += dt * .02;
  v.flash = Math.max(0, v.flash - dt / 170);
  v.stun = Math.max(0, v.stun - dt / 1000);
  v.glow = Math.max(0, v.glow - dt / 900);
}

/* --- Armes (repère : +x = lame, origine = poing) --- */
const STEEL = '#dfe6f2', WOOD = '#a8693c', GOLD = '#ffc93d';
const wcel = (c, path, color) => soft(c, path, color, [-12, -14, 44, 12], 1.6);
function drawWeapon(c, kind, rar) {
  const blade = path => {
    if (rar >= 2) { c.save(); c.shadowColor = RARITIES[rar].color; c.shadowBlur = 12; c.beginPath(); path(c); c.fillStyle = RARITIES[rar].color; c.fill(); c.restore(); }
    wcel(c, path, rar === 3 ? '#ffe9a8' : STEEL);
  };
  if (kind === 'epee') {
    wcel(c, Pth.rrect(-8, -2.2, 10, 4.4, 2), WOOD, { lw: 2 });
    wcel(c, Pth.circle(-9, 0, 2.8), GOLD, { lw: 2 });
    blade(Pth.poly([4, -3.2, 33, -3.2, 40, 0, 33, 3.2, 4, 3.2]));
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(7, -1.1); c.lineTo(31, -1.1); c.stroke();
    wcel(c, Pth.rrect(1, -7, 4, 14, 1.5), GOLD, { lw: 2 });
  } else if (kind === 'dague') {
    wcel(c, Pth.rrect(-6, -2, 8, 4, 2), WOOD, { lw: 2 });
    blade(Pth.poly([3, -2.8, 18, -2.4, 24, 0, 18, 2.4, 3, 2.8]));
    wcel(c, Pth.rrect(1, -5, 3, 10, 1.2), GOLD, { lw: 2 });
  } else if (kind === 'hache') {
    wcel(c, Pth.capsule(-9, 0, 32, 0, 2.4, 2.4), WOOD, { lw: 2 });
    blade(c => { c.moveTo(21, -2); c.lineTo(19, -10); c.quadraticCurveTo(27, -22, 37, -15); c.quadraticCurveTo(31, -8, 33, -1); c.closePath(); });
  } else if (kind === 'marteau') {
    wcel(c, Pth.capsule(-9, 0, 30, 0, 2.4, 2.4), WOOD, { lw: 2 });
    blade(Pth.rrect(23, -11, 13, 22, 3));
  } else if (kind === 'lance') {
    wcel(c, Pth.capsule(-24, 0, 46, 0, 1.9, 1.9), WOOD, { lw: 2 });
    blade(Pth.poly([44, 0, 50, -4.5, 61, 0, 50, 4.5]));
    wcel(c, Pth.poly([41, -1, 44, 7, 38, 9]), '#ff5d5d', { lw: 1.6 });
  }
}

/* --- Héros chibi manga : très grosse tête, trait encre épais, ombres franches (cel), reflets blancs --- */
const OUTL = '#1d1420';
const _lt = {}, _dk = {};
const lt = c => _lt[c] || (_lt[c] = mix(c, '#fff3dc', .32));
const dk = c => _dk[c] || (_dk[c] = mix(c, '#2a0f08', .38));
/* Cel-shading manga : aplat, ombre franche en bas à droite (même forme décalée), trait encre épais */
const _md = {};
const mdk = c => _md[c] || (_md[c] = mix(c, '#3a1f4a', .3));
let INKPASS = false; // passe 1 : silhouette épaisse à l'encre ; passe 2 : aplats + trait fin intérieur
function soft(c, path, color, box, lw) {
  if (INKPASS) { c.beginPath(); path(c); c.fillStyle = OUTL; c.fill(); c.lineWidth = (lw || 1.7) * 1.2 + 2.6; c.strokeStyle = OUTL; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); return; }
  const sz = Math.min(box[2] - box[0], box[3] - box[1]), off = clamp(sz * .16, 1.2, 4.5);
  c.beginPath(); path(c); c.fillStyle = mdk(color); c.fill();
  c.save(); c.beginPath(); path(c); c.clip();
  c.translate(-off * .7, -off); c.beginPath(); path(c); c.fillStyle = color; c.fill();
  c.restore();
  if (lw !== 0) { c.beginPath(); path(c); c.lineWidth = (lw || 1.7) * .78; c.strokeStyle = OUTL; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
}
/* Reflet brillant (cheveux, métal) : trait blanc arrondi */
function shine(c, x0, y0, x1, y1, cx, cy, w) {
  if (INKPASS) return;
  // reflet effilé (lentille) : pointu aux deux bouts, épais au milieu
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ix = mx + (mx - cx) * .25, iy = my + (my - cy) * .25;
  const ox = cx + (cx - mx) * (w || 1.6) * .25, oy = cy + (cy - my) * (w || 1.6) * .25;
  c.save(); c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(ox, oy, x1, y1); c.quadraticCurveTo(ix, iy, x0, y0); c.closePath();
  c.fillStyle = 'rgba(255,255,255,.92)'; c.fill(); c.restore();
}
/* Trait d'encrage effilé : épais au milieu, pointu aux bouts (Bézier cubique). e = épaisseur relative aux extrémités */
function taper(c, x0, y0, x1, y1, x2, y2, x3, y3, w, col, e0, e1) {
  if (INKPASS) return;
  const N = 16, A = [], B = []; e0 = e0 == null ? .12 : e0; e1 = e1 == null ? .12 : e1;
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
    const dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2), dy = 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2), l = Math.hypot(dx, dy) || 1;
    const e = t < .5 ? e0 : e1, hw = w / 2 * (e + (1 - e) * Math.pow(Math.sin(Math.PI * t), .6));
    A.push(x - dy / l * hw, y + dx / l * hw); B.push(x + dy / l * hw, y - dx / l * hw);
  }
  c.beginPath(); c.moveTo(A[0], A[1]);
  for (let i = 2; i < A.length; i += 2) c.lineTo(A[i], A[i + 1]);
  for (let i = B.length - 2; i >= 0; i -= 2) c.lineTo(B[i], B[i + 1]);
  c.closePath(); c.fillStyle = col || OUTL; c.fill();
}
const tq = (c, x0, y0, cx, cy, x1, y1, w, col, e0, e1) => taper(c, x0, y0, x0 + (cx - x0) * 2 / 3, y0 + (cy - y0) * 2 / 3, x1 + (cx - x1) * 2 / 3, y1 + (cy - y1) * 2 / 3, x1, y1, w, col, e0, e1);
const capBox = (x0, y0, x1, y1, r) => [Math.min(x0, x1) - r, Math.min(y0, y1) - r, Math.max(x0, x1) + r, Math.max(y0, y1) + r];

function headPath(c) {
  c.moveTo(-15.5, 2);
  c.bezierCurveTo(-17, -12, -8, -19, 1, -19);
  c.bezierCurveTo(11, -19, 17.5, -11, 17, -1);
  c.quadraticCurveTo(16.5, 8, 11, 13.5);
  c.quadraticCurveTo(5, 17, -2, 15);
  c.quadraticCurveTo(-13, 12, -15.5, 2);
  c.closePath();
}
/* Coiffures : polygones ; la frange est remontée (lift) pour dégager les grands yeux chibi */
const liftFringe = (x, y) => (x > -10 && y > -11 ? [x, -11 + (y + 11) * .42] : [x, y]);
/* Mèches vectorielles : arêtes courbées dans le sens du « coup de pinceau » (vers l'arrière en haut, vers le bas sur la frange) */
const HC = [1, -6]; // centre du crâne
const hairPoly = arr => {
  const P = []; for (let i = 0; i < arr.length; i += 2) P.push(liftFringe(arr[i], arr[i + 1]));
  const n = P.length, d = P.map(q => Math.hypot(q[0] - HC[0], q[1] - HC[1]));
  const tips = P.filter((q, i) => d[i] > d[(i + n - 1) % n] && d[i] > d[(i + 1) % n]);
  const segs = P.map((a, i) => {
    const b = P[(i + 1) % n], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const S = my < -8 ? [-1, -.25] : mx > -4 ? [-.35, 1] : [-1, .4];
    let nx = dy / len, ny = -dx / len; if (nx * S[0] + ny * S[1] < 0) { nx = -nx; ny = -ny; }
    const k = len * .2; return [mx + nx * k, my + ny * k, b[0], b[1]];
  });
  const f = c => { c.moveTo(P[0][0], P[0][1]); for (const q of segs) c.quadraticCurveTo(q[0], q[1], q[2], q[3]); c.closePath(); };
  f.tips = tips; return f;
};
const HAIR = {
  meches: hairPoly([-15, 10, -22, 6, -18, 0, -26, -6, -19, -11, -25, -20, -14, -20, -15, -30, -5, -24, 0, -32, 5, -24, 14, -29, 13, -20, 22, -19, 17, -12, 22, -5, 16, -5, 17, 2, 12, -4, 11, 3, 7, -5, 4, 1, 2, -7, -3, -2, -5, -9, -9, 3]),
  pics: hairPoly([-15, 8, -27, 2, -18, -5, -30, -15, -16, -16, -23, -31, -7, -23, -4, -38, 4, -24, 15, -35, 13, -21, 25, -19, 17, -8, 13, -9, 12, -2, 8, -9, 5, -3, 2, -11, -2, -5, -6, -9, -9, 0, -9, 9]),
  court: hairPoly([-15.5, 4, -18, -8, -14, -17, -6, -21, 2, -21.5, 10, -20, 16, -15, 17.5, -5, 13, -8, 11, -3, 7.5, -9, 4, -5, 0, -10, -5, -8, -8, -2, -9, 5]),
  cap: hairPoly([-16, 7, -19, -6, -16, -16, -8, -21.5, 2, -22.5, 11, -21, 17, -15, 18.5, -3, 14.5, -6, 14, 2, 9.5, -7, 7, 0, 3.5, -9, -.5, -4, -4, -9, -7, -6, -9, 0, -9, 9]),
};
const HAIR_BOX = [-28, -36, 22, 12];
function drawHairBack(c, L) {
  if (L.hair === 'longs') soft(c, cc => { cc.moveTo(-6, -20); cc.bezierCurveTo(-28, -18, -27, 16, -20, 36); cc.lineTo(-12, 31); cc.lineTo(-7, 38); cc.lineTo(-3, 22); cc.lineTo(2, 6); cc.closePath(); }, L.hairColor, [-28, -20, 2, 38]);
  if (L.hair === 'queue') soft(c, cc => { cc.moveTo(-10, -18); cc.quadraticCurveTo(-32, -26, -35, 0); cc.quadraticCurveTo(-37, 16, -29, 26); cc.quadraticCurveTo(-29, 10, -23, 1); cc.quadraticCurveTo(-18, -9, -6, -11); cc.closePath(); }, L.hairColor, [-37, -26, -6, 26]);
}
function drawHairFront(c, L) {
  const p = HAIR[L.hair] || HAIR.cap, hc = L.hairColor;
  if (INKPASS) { soft(c, p, hc, HAIR_BOX, 1.9); return; }
  c.beginPath(); p(c); c.fillStyle = hc; c.fill();
  c.save(); c.beginPath(); p(c); c.clip();
  // ombre de masse : bas de la chevelure et côté nuque
  c.fillStyle = mdk(hc); c.beginPath(); c.ellipse(4, 7, 30, 12, -.08, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(-22, -6, 9, 20, .2, 0, TAU); c.fill();
  // mèches : un trait effilé vers chaque pointe
  for (const q of p.tips || []) {
    const ax = lerp(HC[0], q[0], .38), ay = lerp(HC[1], q[1], .38), bx = lerp(HC[0], q[0], .86), by = lerp(HC[1], q[1], .86);
    tq(c, ax, ay, lerp(ax, bx, .5) - (by - ay) * .12, lerp(ay, by, .5) + (bx - ax) * .12, bx, by, 1.5, 'rgba(29,20,32,.85)', .05, .05);
  }
  // reflet : bande brillante qui suit le crâne, coupée naturellement par les mèches (clip)
  // reflets : longues traînées blanches le long des plus grandes mèches du dessus
  const top = (p.tips || []).filter(q => q[1] < -12).sort((u, w) => Math.hypot(w[0] - HC[0], w[1] - HC[1]) - Math.hypot(u[0] - HC[0], u[1] - HC[1])).slice(0, 4);
  for (const q of top) {
    const dx = q[0] - HC[0], dy = q[1] - HC[1], l = Math.hypot(dx, dy), px = -dy / l * 1.4, py = dx / l * 1.4;
    const ax = HC[0] + dx * .44 + px, ay = HC[1] + dy * .44 + py, bx = HC[0] + dx * .8 + px * .4, by = HC[1] + dy * .8 + py * .4;
    tq(c, ax, ay, (ax + bx) / 2 + px * .8, (ay + by) / 2 + py * .8, bx, by, 1.7, 'rgba(255,255,255,.92)', .05, .02);
  }
  shine(c, -15.5, -6, -7, -16.5, -13.5, -14, 1.8);
  c.restore();
  c.beginPath(); p(c); c.lineWidth = 1.4; c.strokeStyle = OUTL; c.lineJoin = 'round'; c.stroke();
}
function drawFace(c, v, t) {
  if (INKPASS) return;
  const ex = v.expr, iris = L_eyes(v);
  const blink = ((t / 1000 + v.phase) % 4.2) < .12;
  c.lineCap = 'round'; c.lineJoin = 'round';
  const eye = (x, w, hgt, near) => {
    const y = 2;
    if (ex === 'ko') { c.strokeStyle = OUTL; c.lineWidth = 1.9; c.beginPath(); c.moveTo(x - 2.6, y - 2.6); c.lineTo(x + 2.6, y + 2.6); c.moveTo(x + 2.6, y - 2.6); c.lineTo(x - 2.6, y + 2.6); c.stroke(); return; }
    if (ex === 'grin') { tq(c, x - w - .4, y + 1.8, x, y - 4.2, x + w + .4, y + 1.8, 2.6, OUTL, .2, .2); return; }
    if (ex === 'hurt') { c.strokeStyle = OUTL; c.lineWidth = 2; const d = near ? 1 : -1; c.beginPath(); c.moveTo(x - w * d, y - 2.4); c.lineTo(x + w * d * .9, y); c.lineTo(x - w * d, y + 2.4); c.stroke(); return; }
    if (blink) { tq(c, x - w, y + 1, x, y + 2.8, x + w + .6, y + .4, 2.2, OUTL, .2, .3); return; }
    // blanc de l'oeil, grand iris, pupille, 2 reflets, cil épais
    c.beginPath(); c.ellipse(x, y, w, hgt, 0, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
    c.save(); c.beginPath(); c.ellipse(x, y, w, hgt, 0, 0, TAU); c.clip();
    c.beginPath(); c.ellipse(x + w * .25, y + .6, w * .78, hgt * .86, 0, 0, TAU); c.fillStyle = iris; c.fill();
    c.beginPath(); c.ellipse(x + w * .25, y - hgt * .25, w * .78, hgt * .45, 0, Math.PI, TAU); c.fillStyle = mdk(iris); c.fill();
    c.beginPath(); c.ellipse(x + w * .3, y + .8, w * .38, hgt * .44, 0, 0, TAU); c.fillStyle = '#140a10'; c.fill();
    c.restore();
    c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - w * .2, y - hgt * .35, w * .34, hgt * .26, -.3, 0, TAU); c.fill();
    c.beginPath(); c.arc(x + w * .5, y + hgt * .45, w * .16, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(x, y, w, hgt, 0, Math.PI * .1, Math.PI * .9); c.lineWidth = .8; c.strokeStyle = OUTL; c.stroke();
    // paupière supérieure épaisse et effilée, avec un cil qui s'échappe vers l'extérieur
    taper(c, x - w - .5, y - hgt * .1, x - w * .7, y - hgt - 1.6, x + w * .7, y - hgt - 1.8, x + w + .9, y - hgt * .35, 3, OUTL, .35, .3);
    tq(c, x + w * .7, y - hgt * .7, x + w * 1.3, y - hgt * 1.05, x + w * 1.7, y - hgt * 1.15, 1.6, OUTL, .6, .05);
    tq(c, x + w * .1, y + hgt + .2, x + w * .6, y + hgt, x + w * .95, y + hgt * .5, 1, OUTL, .05, .3);
  };
  eye(4.4, 2.9, 5, false); eye(11.9, 3.5, 5.5, true);
  // sourcils épais
  const fr = ex === 'hurt' ? 1.4 : 0;
  tq(c, 2, -4.6 + fr, 4.2, -6.2, 6.4, -5 - fr * .5, 2, OUTL, .5, .1);
  tq(c, 9, -5.2 - fr * .5, 12, -7.2, 15.2, -5.6 + fr, 2.2, OUTL, .5, .1);
  // nez
  c.lineWidth = 1.1; c.beginPath(); c.moveTo(17, 6.4); c.lineTo(16.3, 7.4); c.stroke();
  // bouche
  if (ex === 'grin' || ex === 'hurt' || ex === 'ko') {
    const open = ex === 'grin' ? 1 : .7;
    const mo = cc => { cc.moveTo(8.6, 10); cc.quadraticCurveTo(12, 9.4 - (ex === 'grin' ? 0 : 1), 15, 9.8); cc.quadraticCurveTo(13.4, 10 + 5 * open, 11.2, 10 + 4.6 * open); cc.quadraticCurveTo(9, 9.8 + 3 * open, 8.6, 10); cc.closePath(); };
    c.beginPath(); mo(c); c.fillStyle = '#7a1e2c'; c.fill();
    c.save(); c.beginPath(); mo(c); c.clip(); c.beginPath(); c.ellipse(11.8, 10 + 4.8 * open, 3, 2, 0, 0, TAU); c.fillStyle = '#ff7c86'; c.fill(); c.restore();
    c.beginPath(); mo(c); c.lineWidth = 1.5; c.strokeStyle = OUTL; c.stroke();
  } else tq(c, 10, 11, 12.2, 12.4, 14.4, 10.6, 1.8, OUTL, .1, .3);
  // rougeurs hachurées
  c.fillStyle = 'rgba(255,110,120,.35)'; c.beginPath(); c.ellipse(8.6, 8.4, 2.8, 1.4, 0, 0, TAU); c.fill();
  for (let i = 0; i < 3; i++) tq(c, 7 + i * 1.4, 9.4, 7.6 + i * 1.4, 8.4, 8.2 + i * 1.4, 7.4, .9, 'rgba(220,60,80,.8)', .2, .2);
}
const L_eyes = v => v.look.eyes || '#7a4a2a';
function drawHead(c, v, t) {
  const L = v.look;
  if (INKPASS) soft(c, headPath, L.skin, [-12, -16, 14, 16], 1.7);
  else {
    c.beginPath(); headPath(c); c.fillStyle = L.skin; c.fill();
    c.save(); c.beginPath(); headPath(c); c.clip();
    // ombre portée de la frange sur le front + ombre côté nuque et sous la joue
    const hp = HAIR[L.hair] || HAIR.cap;
    c.save(); c.beginPath(); c.rect(-7, -30, 30, 28.5); c.clip(); c.translate(.8, 2.4); c.beginPath(); hp(c); c.fillStyle = mdk(L.skin); c.fill(); c.restore();
    c.fillStyle = mdk(L.skin); c.beginPath(); c.ellipse(-15, 6, 6, 12, .2, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(4, 19, 14, 5, -.1, 0, TAU); c.fill();
    c.restore();
    c.beginPath(); headPath(c); c.lineWidth = 1.3; c.strokeStyle = OUTL; c.stroke();
  }
  soft(c, Pth.ellipse(-6.2, 4.8, 2.2, 2.9), L.skin, [-9, 1, -4, 8], 1);
  tq(c, -6.4, 3, -4.6, 4.6, -6.2, 6.6, 1, mdk(mdk(L.skin)), .2, .2);
  drawFace(c, v, t);
  drawHairFront(c, L);
  if (v.boss) {
    soft(c, cc => { cc.moveTo(-16, -6); cc.quadraticCurveTo(-6, -28, 18, -13); cc.lineTo(19, -8); cc.quadraticCurveTo(0, -19, -16, -1); cc.closePath(); }, '#5d6380', [-16, -26, 19, -1]);
    soft(c, cc => { cc.moveTo(-11, -14); cc.quadraticCurveTo(-30, -26, -24, -46); cc.quadraticCurveTo(-20, -30, -5, -21); cc.closePath(); }, '#f2e6c8', [-30, -46, -5, -14]);
    soft(c, cc => { cc.moveTo(6, -19); cc.quadraticCurveTo(11, -38, 30, -43); cc.quadraticCurveTo(18, -32, 15, -16); cc.closePath(); }, '#f2e6c8', [6, -43, 30, -16]);
  }
}

function drawFighter(c, v, t) {
  if (v.alpha >= .99) { INKPASS = true; try { drawFighter1(c, v, t); } finally { INKPASS = false; } }
  drawFighter1(c, v, t);
}
function drawFighter1(c, v, t) {
  if (v.kind === 'pet') return drawPet(c, v, t);
  const p = v.pose, L = v.look, bw = BUILD[L.build] || 1;
  const skin = L.skin, cloth = L.outfit, pants = mix(cloth, '#2a0f08', .18), band = mix(cloth, '#1d1420', .5), boot = mix(cloth, '#1d1420', .62);
  c.save();
  c.translate(v.x, v.y);
  if (!INKPASS) { c.save(); c.scale(v.scale * CH, v.scale * CH); c.globalAlpha = .25 * v.alpha;
  const sh = 1 - Math.min(.5, -p.bodyY / 60);
  c.beginPath(); c.ellipse(p.rot ? -26 : 0, 0, (p.rot ? 46 : 24 * bw) * sh, 6 * sh, 0, 0, TAU); c.fillStyle = '#2a0f08'; c.fill(); c.restore(); }
  c.scale(v.face * v.scale * CH, v.scale * CH);
  c.globalAlpha = v.alpha;
  if (p.rot) { c.translate(0, -p.rot * 17); c.rotate(p.rot); }
  let bodyY = p.bodyY, fF = p.fF, fB = p.fB, liftF = p.lF, liftB = 0;
  if (v.running) { const s = Math.sin(v.runT), co = Math.cos(v.runT); fF = 4 + s * 14; fB = -4 - s * 14; liftF = Math.max(0, co) * 9; liftB = Math.max(0, -co) * 9; bodyY -= Math.abs(s) * 3; }
  const breathe = Math.sin(t / 300 + v.phase);
  c.translate(0, bodyY);
  const hip = { x: 0, y: -33 + p.crouch + breathe * .3 };
  const hipW = 5.5 * bw;
  const leg = (dx, fx, lift, dark) => {
    const k = ik2(hip.x + dx, hip.y, fx, -6 - lift, 14.5, 14);
    const col = dark ? mdk(pants) : pants, bt = dark ? mdk(boot) : boot;
    // pantalon bouffant : cuisse et tibia larges, revers serré à la cheville
    soft(c, Pth.capsule(hip.x + dx, hip.y, k.kx, k.ky, 8 * bw, 7.6 * bw), col, capBox(hip.x + dx, hip.y, k.kx, k.ky, 8));
    soft(c, Pth.capsule(k.kx, k.ky, k.fx, k.fy - 2, 7.6 * bw, 6.4 * bw), col, capBox(k.kx, k.ky, k.fx, k.fy, 7));
    if (!INKPASS) { c.strokeStyle = OUTL; c.lineWidth = .9; c.lineCap = 'round'; c.beginPath(); c.moveTo(k.kx - 3, k.ky + 2); c.quadraticCurveTo(k.kx + 1, k.ky + 5, k.kx + 4, k.ky + 3); c.moveTo(lerp(k.kx, k.fx, .6) - 3, lerp(k.ky, k.fy, .6)); c.lineTo(lerp(k.kx, k.fx, .6) + 2, lerp(k.ky, k.fy, .6) + 1.5); c.stroke(); }
    // botte trapue
    const ax = k.fx, ay = k.fy + 6;
    soft(c, cc => { cc.moveTo(ax - 6, ay - 9); cc.lineTo(ax + 3, ay - 9.5); cc.quadraticCurveTo(ax + 6, ay - 6, ax + 10, ay - 4.5); cc.quadraticCurveTo(ax + 14, ay - 3, ax + 13, ay); cc.lineTo(ax - 6.5, ay); cc.quadraticCurveTo(ax - 8, ay - 5, ax - 6, ay - 9); cc.closePath(); }, bt, [ax - 7, ay - 10, ax + 13, ay]);
    soft(c, Pth.rrect(ax - 6.8, ay - 2.4, 20, 3, 1.4), dark ? '#b9aec4' : '#efe6f5', [ax - 7, ay - 3, ax + 13, ay], 1.1);
    soft(c, Pth.rrect(ax - 6.6, ay - 11, 10.4, 3.6, 1.6), dark ? mdk(band) : band, [ax - 7, ay - 11, ax + 4, ay - 7], 1.1);
  };
  const torso = () => { c.translate(hip.x, hip.y); c.rotate(p.lean); };
  const headFrame = () => { c.translate(3, -26); c.rotate(p.head + breathe * .012); c.translate(1, -23); c.scale(1.45, 1.45); };
  const arm = (sx, a, e, dark, front) => {
    const ux = sx + Math.sin(a) * 12, uy = -22 + Math.cos(a) * 12;
    const fa = a + e, hx = ux + Math.sin(fa) * 11.5, hy = uy + Math.cos(fa) * 11.5;
    const sk = dark ? mdk(skin) : skin;
    soft(c, Pth.capsule(sx, -22, ux, uy, 5.6 * bw, 5 * bw), sk, capBox(sx, -22, ux, uy, 5.5));
    soft(c, Pth.capsule(ux, uy, hx, hy, 5 * bw, 4.6 * bw), sk, capBox(ux, uy, hx, hy, 5));
    // manche courte évasée
    const mx2 = lerp(sx, ux, .62), my2 = lerp(-22, uy, .62);
    soft(c, Pth.capsule(sx, -22, mx2, my2, 6.4 * bw, 6.6 * bw), dark ? mdk(cloth) : cloth, capBox(sx, -22, mx2, my2, 6.5), 1.4);
    // bracelet de force
    const bx = lerp(ux, hx, .72), by = lerp(uy, hy, .72);
    c.save(); c.translate(bx, by); c.rotate(Math.atan2(hy - uy, hx - ux));
    soft(c, Pth.rrect(-3, -5.6 * bw, 6, 11.2 * bw, 1.8), dark ? mdk(band) : band, [-3, -5.6, 3, 5.6], 1.2);
    c.restore();
    if (front) {
      c.save(); c.translate(hx, hy);
      c.rotate(Math.atan2(Math.cos(fa), Math.sin(fa)) - Math.PI / 2 + p.wpn);
      drawWeapon(c, v.gear.weapon, v.gear.wRar);
      c.restore();
    }
    // gros poing chibi + jointures
    const fr = (v.gear.weapon === 'poings' && front ? 7 : 6.2) * bw;
    soft(c, Pth.circle(hx, hy, fr), sk, [hx - fr, hy - fr, hx + fr, hy + fr], 1.5);
    // doigts repliés : 3 traits effilés + pouce
    for (let i = 0; i < 3; i++) { const a = -.5 + i * .5; tq(c, hx + Math.cos(a) * fr * .25, hy + Math.sin(a) * fr * .25, hx + Math.cos(a + .2) * fr * .6, hy + Math.sin(a + .2) * fr * .6, hx + Math.cos(a) * fr * .92, hy + Math.sin(a) * fr * .92, .9, OUTL, .1, .4); }
    tq(c, hx - fr * .6, hy - fr * .2, hx - fr * .1, hy - fr * .75, hx + fr * .5, hy - fr * .55, 1, OUTL, .2, .2);
    if (front && v.gear.armor === 'plaques') { const pa = cc => { cc.arc(sx + 1, -22, 9.5 * bw, Math.PI * 1.02, Math.PI * 2.1); cc.closePath(); }; soft(c, pa, STEEL, [sx - 9, -32, sx + 10, -20]); trim(c, pa, v.gear.aRar); }
    if (front && v.gear.armor === 'cuir') soft(c, Pth.ellipse(sx + 1, -23, 7 * bw, 4.6, -.2), '#8a5530', [sx - 6, -28, sx + 8, -18]);
  };

  c.save(); torso(); headFrame(); drawHairBack(c, L); c.restore();
  c.save(); torso(); arm(-4.5 * bw, p.armB, p.elbB, true, false); c.restore();
  leg(-hipW * .6, fB, liftB, true);
  leg(hipW * .6, fF, liftF, false);
  c.save(); torso();
  const TB = [-13 * bw, -28, 13 * bw, 4];
  const tPath = cc => { cc.moveTo(-10 * bw, 4); cc.lineTo(10 * bw, 4); cc.lineTo(12.5 * bw, -18); cc.quadraticCurveTo(12.5 * bw, -27, 5 * bw, -27.5); cc.lineTo(-6 * bw, -27.5); cc.quadraticCurveTo(-13 * bw, -27, -13 * bw, -18); cc.closePath(); };
  soft(c, Pth.ellipse(0, 2, 11 * bw, 6.5), pants, [-11, -4, 11, 8], 1.6);
  // kimono croisé : veste, col en V sur maillot sombre, revers, plis
  soft(c, tPath, cloth, TB, 1.8);
  if (!INKPASS) {
    c.save(); c.beginPath(); tPath(c); c.clip();
    const V = cc => { cc.moveTo(-5 * bw, -27.5); cc.lineTo(7 * bw, -27.5); cc.lineTo(2, -11); cc.closePath(); };
    c.beginPath(); V(c); c.fillStyle = band; c.fill();
    c.fillStyle = mdk(cloth); c.beginPath(); c.moveTo(6 * bw, -27.5); c.lineTo(13 * bw, -27.5); c.lineTo(13 * bw, 4); c.lineTo(5 * bw, 4); c.quadraticCurveTo(9 * bw, -10, 6 * bw, -27.5); c.fill();
    c.strokeStyle = OUTL; c.lineCap = 'round'; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(-6 * bw, -27.5); c.lineTo(2, -11); c.lineTo(7.5 * bw, -27.5); c.moveTo(-3 * bw, -27.5); c.lineTo(2.4, -14.5); c.stroke();
    c.lineWidth = .9; c.beginPath(); c.moveTo(-9 * bw, -18); c.quadraticCurveTo(-6 * bw, -13, -7 * bw, -7); c.moveTo(8 * bw, -16); c.quadraticCurveTo(9 * bw, -11, 7 * bw, -6); c.stroke();
    c.restore();
    c.beginPath(); tPath(c); c.lineWidth = 1.4; c.strokeStyle = OUTL; c.stroke();
  }
  drawArmor(c, v, bw, tPath);
  // ceinture nouée : bande, noeud, deux pans qui flottent
  const sway = Math.sin(t / 260 + v.phase) * 1.2;
  soft(c, cc => { cc.moveTo(3, 1); cc.quadraticCurveTo(5 + sway, 8, 3.5 + sway, 13); cc.lineTo(7.5 + sway, 12.5); cc.quadraticCurveTo(8, 7, 6, 1); cc.closePath(); }, mdk(band), [3, 1, 8, 13], 1.2);
  soft(c, cc => { cc.moveTo(5, 1); cc.quadraticCurveTo(9 + sway, 6, 10 + sway * 1.4, 11); cc.lineTo(13.5 + sway * 1.4, 9); cc.quadraticCurveTo(10, 4, 7.5, 0); cc.closePath(); }, band, [5, 0, 13, 11], 1.2);
  soft(c, Pth.rrect(-11 * bw, -4, 22 * bw, 6, 2), band, [-11, -4, 11, 2], 1.4);
  soft(c, Pth.ellipse(5.5, -1, 3.4, 3.2), band, [2, -4, 9, 2], 1.2);
  c.save(); headFrame(); drawHead(c, v, t); c.restore();
  arm(5 * bw, p.armF, p.elbF, false, true);
  c.restore();
  if (v.stun > 0) {
    c.save(); c.translate(0, -130);
    for (let i = 0; i < 3; i++) { const a = t / 220 + i * TAU / 3; star(c, Math.cos(a) * 15, Math.sin(a) * 4, 4.5, '#ffe066'); }
    c.restore();
  }
  c.restore();
}
function trim(c, path, rar) { if (!rar) return; c.beginPath(); path(c); c.strokeStyle = RARITIES[rar].color; c.lineWidth = 1.6; c.stroke(); }
function drawArmor(c, v, bw, tPath) {
  const k = v.gear.armor; if (!k) return;
  if (k === 'cuir') {
    soft(c, Pth.poly([-11 * bw, -24, -6 * bw, -27, 11 * bw, -2, 6 * bw, 2]), '#8a5530', [-11, -27, 11, 2], 1.5);
  } else if (k === 'maille') {
    c.save(); c.beginPath(); tPath(c); c.clip();
    soft(c, Pth.rrect(-13 * bw, -22, 26 * bw, 24, 3), '#a7afba', [-13, -22, 13, 2], 1.5);
    c.strokeStyle = 'rgba(59,34,22,.4)'; c.lineWidth = .8;
    for (let y = -19; y < 2; y += 3.4) { c.beginPath(); for (let x = -13 * bw; x < 13 * bw; x += 3.4) { c.moveTo(x, y); c.arc(x + 1.7, y, 1.7, Math.PI, 0, true); } c.stroke(); }
    c.restore();
    trim(c, cc => { cc.moveTo(-12.5 * bw, -21.5); cc.lineTo(12 * bw, -21.5); }, v.gear.aRar);
  } else if (k === 'plaques') {
    const pp = cc => { cc.moveTo(-10 * bw, -25); cc.lineTo(10.5 * bw, -25); cc.quadraticCurveTo(13 * bw, -10, 6 * bw, -3); cc.lineTo(-7 * bw, -3); cc.quadraticCurveTo(-12.5 * bw, -12, -10 * bw, -25); cc.closePath(); };
    soft(c, pp, STEEL, [-12, -25, 13, -3]);
    c.strokeStyle = 'rgba(59,34,22,.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -24); c.lineTo(0, -5); c.stroke();
    trim(c, pp, v.gear.aRar);
  }
}
function star(c, x, y, r, col) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
}

/* ---------- Familiers ---------- */
const PET_POSES = {
  idle:    { lunge: 0,  crouch: 0, jaw: 0,  rot: 0,    tilt: 0 },
  run:     { lunge: 0,  crouch: 1, jaw: 0,  rot: 0,    tilt: .05 },
  windup:  { lunge: -6, crouch: 4, jaw: 0,  rot: 0,    tilt: -.12 },
  strike:  { lunge: 14, crouch: 0, jaw: 1,  rot: 0,    tilt: .18 },
  hit:     { lunge: -6, crouch: 2, jaw: .6, rot: 0,    tilt: -.2 },
  dodge:   { lunge: -10, crouch: -10, jaw: 0, rot: 0,  tilt: -.25 },
  block:   { lunge: -2, crouch: 4, jaw: 0,  rot: 0,    tilt: -.1 },
  victory: { lunge: 0,  crouch: -2, jaw: .8, rot: 0,   tilt: -.15 },
  ko:      { lunge: -4, crouch: 6, jaw: .4, rot: -1.4, tilt: 0 },
};
function makePetView(pet, side, x, y) {
  const sp = PETS[pet.species], B = bossPetDef(pet);
  return {
    kind: 'pet', body: sp.body, col: B ? B.col : sp.col, belly: B ? B.belly : sp.belly, glowCol: B ? B.glow : pet.rarity >= 2 ? RARITIES[pet.rarity].color : null,
    bossPet: !!B, stripes: !!sp.stripes, bushy: pet.species === 'renard', x, y, homeX: x, homeY: y, face: side === 'L' ? 1 : -1, scale: .78,
    pose: { ...PET_POSES.idle }, target: PET_POSES.idle, rate: 10, running: false, runT: 0, flash: 0, alpha: 1, phase: Math.random() * 10, expr: 'neutral', stun: 0, glow: 0,
  };
}
function drawPet(c, v, t) {
  const pc = (cc, path, col, o) => soft(cc, path, col, [-28, -52, 40, 0], (o && o.lw) ? o.lw * .75 : 1.7);
  const p = v.pose, b = v.body, col = v.col, belly = v.belly;
  const s = v.scale;
  c.save(); c.translate(v.x, v.y);
  if (!INKPASS) { c.save(); c.scale(s, s); c.globalAlpha = .28 * v.alpha; c.beginPath(); c.ellipse(0, 0, b === 'ours' ? 32 : 26, 6, 0, 0, TAU); c.fillStyle = INK; c.fill(); c.restore(); }
  c.scale(v.face * s, s); c.globalAlpha = v.alpha;
  if (v.glowCol && !INKPASS) { const g = c.createRadialGradient(4, -30, 4, 4, -30, 48); g.addColorStop(0, v.glowCol + '66'); g.addColorStop(1, v.glowCol + '00'); c.fillStyle = g; c.beginPath(); c.arc(4, -30, 48, 0, TAU); c.fill(); }
  if (p.rot) { c.translate(0, -p.rot * 12); c.rotate(p.rot); }
  const bob = Math.sin(t / 260 + v.phase) * .8;
  c.translate(p.lunge, p.crouch + bob);
  c.rotate(p.tilt);
  const dims = b === 'ours' ? { by: -32, rx: 26, ry: 18, leg: 15, lr: 6.5, fx: 15, bx: -15, hx: 25, hy: -42, hr: 12 }
    : b === 'felin' ? { by: -24, rx: 22, ry: 9, leg: 17, lr: 4, fx: 15, bx: -15, hx: 23, hy: -33, hr: 9 }
    : { by: -27, rx: 20, ry: 10.5, leg: 17, lr: 4.5, fx: 14, bx: -14, hx: 24, hy: -38, hr: 9.5 };
  const sw = v.running ? Math.sin(v.runT * 1.2) * .7 : 0;
  const legDraw = (x, ang, dark) => {
    const x0 = x, y0 = dims.by + dims.ry * .4, x1 = x0 + Math.sin(ang) * dims.leg, y1 = Math.min(-3, y0 + Math.cos(ang) * dims.leg);
    const cl = dark ? shadeOf(col) : col;
    pc(c, Pth.capsule(x0, y0, x1, y1, dims.lr + 1, dims.lr), cl, { lw: 2.2 });
    pc(c, Pth.ellipse(x1 + 2, y1 + 1, dims.lr + 1.6, dims.lr * .7), dark ? shadeOf(belly) : belly, { lw: 2 });
  };
  legDraw(dims.bx + 4, -sw, true); legDraw(dims.fx + 4, sw, true);
  // queue
  if (b === 'ours') pc(c, Pth.circle(dims.bx - 9, dims.by - 6, 4.5), col, { lw: 2 });
  else if (v.bushy) pc(c, Pth.ellipse(dims.bx - 12, dims.by - 12, 11, 6, -.8), col, { lw: 2.2 });
  else if (b === 'felin') pc(c, cc => { cc.moveTo(dims.bx, dims.by - 2); cc.quadraticCurveTo(dims.bx - 24, dims.by + 4, dims.bx - 22, dims.by - 22 + Math.sin(t / 300) * 3); cc.quadraticCurveTo(dims.bx - 18, dims.by - 6, dims.bx + 2, dims.by - 6); cc.closePath(); }, col, { lw: 2 });
  else pc(c, Pth.capsule(dims.bx - 2, dims.by - 4, dims.bx - 14, dims.by - 16 + Math.sin(t / 200) * 2, 3.5, 2.5), col, { lw: 2 });
  // corps
  pc(c, Pth.ellipse(0, dims.by, dims.rx, dims.ry), col, { lw: 2.5 });
  c.save(); c.beginPath(); c.ellipse(0, dims.by, dims.rx, dims.ry, 0, 0, TAU); c.clip();
  c.fillStyle = belly; c.beginPath(); c.ellipse(4, dims.by + dims.ry * .8, dims.rx * .75, dims.ry * .55, 0, 0, TAU); c.fill();
  if (v.stripes) { c.strokeStyle = INK; c.lineWidth = 2.2; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 9 - 2, dims.by - dims.ry); c.quadraticCurveTo(i * 9 + 3, dims.by - 2, i * 9, dims.by + 3); c.stroke(); } }
  c.restore();
  c.beginPath(); c.ellipse(0, dims.by, dims.rx, dims.ry, 0, 0, TAU); c.lineWidth = 1.8; c.strokeStyle = OUTL; c.stroke();
  legDraw(dims.bx, sw * .8, false); legDraw(dims.fx, -sw * .8, false);
  // tête
  c.save(); c.translate(dims.hx, dims.hy);
  if (b === 'ours') { pc(c, Pth.circle(-6, -9, 4.5), col, { lw: 2 }); pc(c, Pth.circle(5, -10, 4.5), col, { lw: 2 }); }
  else { const ear = (x, h) => pc(c, Pth.poly([x - 3.5, -5, x + .5, -5 - h, x + 4, -4]), col, { lw: 2 }); ear(-5, b === 'felin' ? 7 : 10); ear(2, b === 'felin' ? 7 : 10); }
  pc(c, Pth.circle(0, 0, dims.hr), col, { lw: 2.4 });
  const snL = b === 'felin' ? 5 : b === 'ours' ? 7 : 9;
  pc(c, Pth.ellipse(dims.hr * .7 + snL * .35, 3 + p.jaw * 1.5, snL * .8, 4.2), belly, { lw: 2 });
  if (p.jaw > .3) { c.fillStyle = '#7a2a3a'; c.beginPath(); c.ellipse(dims.hr * .7 + snL * .4, 6.5, snL * .5, 2 * p.jaw, 0, 0, TAU); c.fill(); }
  c.fillStyle = INK; c.beginPath(); c.arc(dims.hr * .7 + snL * 1.05, 1.6 + p.jaw, 2, 0, TAU); c.fill();
  const ex = dims.hr * .35, ey = -2.5;
  if (v.expr === 'ko') { c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(ex - 2, ey - 2); c.lineTo(ex + 2, ey + 2); c.moveTo(ex + 2, ey - 2); c.lineTo(ex - 2, ey + 2); c.stroke(); }
  else { c.fillStyle = v.bossPet ? v.glowCol : INK; c.beginPath(); c.ellipse(ex, ey, 2.2, 2.8, 0, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(ex - .6, ey - 1, .9, 0, TAU); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(ex - 3, ey - 4.5); c.lineTo(ex + 3, ey - 3.2); c.stroke(); }
  c.restore();
  c.restore();
}

/* Aperçu animé réutilisable (création, héros, cartes) */
const Previews = new Set();
function attachPreview(canvas, getView, opts) {
  opts = opts || {};
  Previews.add({ canvas, getView, opts });
  if (!attachPreview._running) { attachPreview._running = true; requestAnimationFrame(previewLoop); }
}
function previewLoop(t) {
  for (const it of Previews) {
    if (!it.canvas.isConnected) { Previews.delete(it); continue; }
    const cv = it.canvas, dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) continue;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
    const v = it.getView(); if (!v) continue;
    const s = (h / 120) * (it.opts.zoom || 1) * dpr;
    const ty = it.opts.cy != null ? cv.height / 2 - it.opts.cy * s : cv.height - (it.opts.dy == null ? 8 : it.opts.dy) * s;
    c.setTransform(s, 0, 0, s, cv.width / 2 + (it.opts.dx || 0) * s, ty);
    v.x = 0; v.y = 0;
    updateView(v, 16);
    drawFighter(c, v, t);
  }
  if (Previews.size) requestAnimationFrame(previewLoop); else attachPreview._running = false;
}
