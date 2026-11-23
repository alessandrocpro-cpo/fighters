/* ===== RENDU : combattants chibi « peints » (tête anime, mèches séparées, tenue en couches) + familiers.
   Chaque combattant est d'abord dessiné en aplats ombrés (cel : ombre bas-droite + reflet haut-gauche)
   sur un calque, puis éclairé d'un bloc : dégradé chaud en haut, sombre au sol, et liseré de
   contre-jour (RIM, couleur du palier) sur le bord arrière de la silhouette. ===== */
const INK = '#22162e';
let RIM = '#c9b8ff'; // couleur du contre-jour, réglée par l'arène selon le palier
const _rgb = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
function mix(a, b, t) { const A = _rgb(a), B = _rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const _sc = {}, _lc = {};
const shadeOf = c => _sc[c] || (_sc[c] = mix(c, '#1d1132', .4));
const lightOf = c => _lc[c] || (_lc[c] = mix(c, '#fff4e6', .42));
const deepOf = c => mix(c, '#120a1e', .62);

/* Aplat + ombre décalée (lumière haut-gauche) + reflet sur le bord éclairé + contour encre */
function cel(c, path, color, o) {
  o = o || {};
  const lx = o.lx == null ? -1.6 : o.lx, ly = o.ly == null ? -2.2 : o.ly;
  c.beginPath(); path(c); c.fillStyle = o.shade || shadeOf(color); c.fill();
  c.save(); c.beginPath(); path(c); c.clip();
  c.save(); c.translate(lx, ly); c.beginPath(); path(c); c.fillStyle = color; c.fill(); c.restore();
  if (o.hi !== false) {
    // reflet = forme moins sa copie décalée vers le bas-droite : il reste une bande sur le bord haut-gauche
    c.beginPath(); path(c); c.save(); c.translate(-lx * .75, -ly * .75); path(c); c.restore();
    c.globalAlpha *= o.hi || .45; c.fillStyle = lightOf(color); c.fill('evenodd'); c.globalAlpha = 1;
  }
  if (o.rim === true && RIM) {
    c.beginPath(); path(c); c.translate(o.rw || 1.6, .5); path(c);
    c.globalAlpha *= .6; c.fillStyle = RIM; c.fill('evenodd');
  }
  c.restore();
  if (o.lw !== 0) { c.beginPath(); path(c); c.lineWidth = o.lw || 1.7; c.strokeStyle = o.ink || INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
}
const Pth = {
  capsule: (x0, y0, x1, y1, r0, r1) => c => { const a = Math.atan2(y1 - y0, x1 - x0); c.arc(x0, y0, r0, a + Math.PI / 2, a - Math.PI / 2); c.arc(x1, y1, r1, a - Math.PI / 2, a + Math.PI / 2); c.closePath(); },
  circle: (x, y, r) => c => c.arc(x, y, r, 0, TAU),
  ellipse: (x, y, rx, ry, rot) => c => c.ellipse(x, y, rx, ry, rot || 0, 0, TAU),
  poly: pts => c => { c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); },
  rrect: (x, y, w, h, r) => c => { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); },
  /* mèche effilée : racine (x0,y0) de demi-largeur w, pointe (x1,y1), b = courbure */
  lock: (x0, y0, x1, y1, w, b) => c => {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    const mx = x0 + dx * .5 + nx * (b || 0), my = y0 + dy * .5 + ny * (b || 0);
    c.moveTo(x0 + nx * w, y0 + ny * w);
    c.quadraticCurveTo(mx + nx * w * .8, my + ny * w * .8, x1, y1);
    c.quadraticCurveTo(mx - nx * w * .55, my - ny * w * .55, x0 - nx * w, y0 - ny * w);
    c.closePath();
  },
};
function ik2(hx, hy, fx, fy, l1, l2) {
  let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy);
  const mx = l1 + l2 - .01; if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
  const a = Math.atan2(dy, dx), b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  return { kx: hx + Math.cos(a - b) * l1, ky: hy + Math.sin(a - b) * l1, fx: hx + dx, fy: hy + dy };
}

const CH = 1.15;      // échelle globale du combattant dans l'arène
const HERO_H = 134;   // hauteur pieds -> haut des cheveux, avant échelle
const CHEST_Y = 80;   // hauteur du torse (impacts, auras)
const HS = 1.12;      // taille de la tête (chibi)
const BUILD = { fin: .9, normal: 1, massif: 1.16 };
/* Poses. Bras : angle depuis la verticale basse vers l'avant (π/2 = horizontal devant, π = levé).
   wpn = angle absolu de l'arme dans le repère du torse (0 = devant, négatif = vers le haut). */
const POSES = {
  idle:    { lean: .06, crouch: 3,  armF: .95, elbF: 1.75, armB: .5,  elbB: 2.15, wpn: -1.05, head: .02, fF: 15, fB: -14, lF: 0,  bodyY: 0,   rot: 0 },
  run:     { lean: .3,  crouch: 9,  armF: 1.05, elbF: 1.25, armB: -.6, elbB: 1.5, wpn: -.45, head: -.05, fF: 15, fB: -14, lF: 0,  bodyY: 0,   rot: 0 },
  windup:  { lean: -.22, crouch: 12, armF: 2.85, elbF: .55, armB: .55, elbB: 1.95, wpn: -2.45, head: -.06, fF: 20, fB: -18, lF: 0, bodyY: 0,   rot: 0 },
  strike:  { lean: .42, crouch: 15, armF: 1.6,  elbF: .05, armB: -.55, elbB: 1.5, wpn: .12, head: .12,  fF: 30, fB: -24, lF: 0,  bodyY: 0,   rot: 0 },
  hit:     { lean: -.32, crouch: 6, armF: .35, elbF: .9,  armB: -.4, elbB: .8, wpn: -1.9, head: -.4,  fF: 12, fB: -21, lF: 0,  bodyY: 0,   rot: 0 },
  dodge:   { lean: -.5, crouch: 3,  armF: .6,  elbF: 1.8, armB: 1.0, elbB: 1.5, wpn: -1.8, head: -.2,  fF: 16, fB: -20, lF: 10, bodyY: -22, rot: 0 },
  block:   { lean: -.06, crouch: 13, armF: 1.45, elbF: 1.95, armB: 1.05, elbB: 2.0, wpn: -1.45, head: -.15, fF: 18, fB: -18, lF: 0, bodyY: 0,  rot: 0 },
  victory: { lean: -.1, crouch: 3,  armF: 2.95, elbF: .25, armB: .4,  elbB: 1.0, wpn: -1.6, head: -.25, fF: 14, fB: -13, lF: 0, bodyY: 0,  rot: 0 },
  ko:      { lean: -.1, crouch: -2, armF: .9,  elbF: .3,  armB: 1.6, elbB: .2, wpn: .4,  head: -.3,  fF: 14, fB: -2,  lF: 0,  bodyY: 0,   rot: -1.5 },
};
const MARKS = ['cicatrice', 'peinture', 'pansement', 'aucune', 'tatouage', 'aucune'];

function makeView(ent, equip, side, x, y) {
  const w = equip && equip.weapon, a = equip && equip.armor;
  return {
    kind: 'hero', x, y, homeX: x, homeY: y, face: side === 'L' ? 1 : -1, scale: ent.boss ? 1.12 : 1, look: ent.look, boss: !!ent.boss,
    mark: side === 'R' ? MARKS[hashStr(String(ent.name || '') + (ent.floor || '')) % MARKS.length] : 'aucune',
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
const STEEL = '#cfd6e6', WOOD = '#6e4430', GOLD = '#e8c06a';
function drawWeapon(c, kind, rar) {
  const bladeCol = rar === 3 ? '#ffe9a8' : STEEL;
  const blade = path => {
    if (rar >= 2) { c.save(); c.globalAlpha = .35; c.lineWidth = 6; c.strokeStyle = RARITIES[rar].color; c.beginPath(); path(c); c.stroke(); c.restore(); }
    cel(c, path, bladeCol, { lw: 1.6, lx: -1, ly: -1.4, hi: .8 });
  };
  const grip = (x0, x1) => { cel(c, Pth.rrect(x0, -2.3, x1 - x0, 4.6, 2), WOOD, { lw: 1.6 }); c.strokeStyle = 'rgba(30,16,20,.5)'; c.lineWidth = .8; c.beginPath(); for (let x = x0 + 2; x < x1 - 1; x += 2.6) { c.moveTo(x, -2.2); c.lineTo(x + 1.6, 2.2); } c.stroke(); };
  if (kind === 'epee') {
    grip(-8, 2);
    cel(c, Pth.circle(-9.5, 0, 2.9), GOLD, { lw: 1.6 });
    blade(Pth.poly([4, -3.4, 34, -3.4, 42, 0, 34, 3.4, 4, 3.4]));
    c.strokeStyle = 'rgba(40,40,70,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(7, .4); c.lineTo(34, .4); c.stroke();
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(7, -1.6); c.lineTo(32, -1.6); c.stroke();
    cel(c, c2 => { c2.moveTo(1, -8); c2.quadraticCurveTo(4.5, -4, 4.5, 0); c2.quadraticCurveTo(4.5, 4, 1, 8); c2.lineTo(-.5, 6); c2.quadraticCurveTo(1.5, 0, -.5, -6); c2.closePath(); }, GOLD, { lw: 1.6 });
  } else if (kind === 'dague') {
    grip(-6, 2);
    blade(c2 => { c2.moveTo(3, -2.8); c2.quadraticCurveTo(16, -4, 26, 0); c2.quadraticCurveTo(16, 2.4, 3, 2.8); c2.closePath(); });
    cel(c, Pth.rrect(1, -5.4, 3, 10.8, 1.2), GOLD, { lw: 1.6 });
  } else if (kind === 'hache') {
    cel(c, Pth.capsule(-9, 0, 33, 0, 2.4, 2.4), WOOD, { lw: 1.6 });
    blade(c2 => { c2.moveTo(21, -2); c2.lineTo(19, -10); c2.quadraticCurveTo(28, -24, 39, -15); c2.quadraticCurveTo(32, -7, 35, 1); c2.quadraticCurveTo(28, 4, 21, 3); c2.closePath(); });
    cel(c, Pth.rrect(18, -3.8, 5.5, 7.6, 1.2), '#5a5560', { lw: 1.4 });
  } else if (kind === 'marteau') {
    cel(c, Pth.capsule(-9, 0, 30, 0, 2.4, 2.4), WOOD, { lw: 1.6 });
    blade(Pth.rrect(22, -12, 15, 24, 3.5));
    cel(c, Pth.rrect(20.5, -13, 18, 4.5, 1.5), '#6a6372', { lw: 1.3 });
    cel(c, Pth.rrect(20.5, 8.5, 18, 4.5, 1.5), '#6a6372', { lw: 1.3 });
  } else if (kind === 'lance') {
    cel(c, Pth.capsule(-24, 0, 46, 0, 1.9, 1.9), WOOD, { lw: 1.6 });
    blade(Pth.poly([44, 0, 50, -4.8, 63, 0, 50, 4.8]));
    cel(c, Pth.poly([41, -1, 45, 8, 38, 10]), '#ffb994', { lw: 1.2 });
  }
}

/* ---------- Tête (repère : centre de la tête, visage vers +x) ---------- */
function headPath(c) {
  c.moveTo(-13.2, 2);
  c.bezierCurveTo(-15.2, -10.5, -8, -18.5, 1.2, -18.5);
  c.bezierCurveTo(10.5, -18.5, 15.8, -11.5, 15.3, -2);
  c.lineTo(14.9, 4.2);
  c.quadraticCurveTo(14, 10.2, 9.4, 13.8);
  c.quadraticCurveTo(6.6, 16, 3.2, 15.2);
  c.quadraticCurveTo(-3.8, 12.8, -9, 9.2);
  c.quadraticCurveTo(-12.8, 6.2, -13.2, 2);
  c.closePath();
}
/* calotte : couvre le crâne, ligne du front côté visage */
const HAIRCAP = c => {
  c.moveTo(-17.5, 10);
  c.bezierCurveTo(-23, -8, -14, -25.5, 1.5, -25);
  c.bezierCurveTo(15, -24.5, 21, -15.5, 19, -3);
  c.quadraticCurveTo(11, -11.5, 1.8, -11);
  c.quadraticCurveTo(-6, -10, -8.4, 2);
  c.quadraticCurveTo(-9.5, 6, -10, 10.5);
  c.closePath();
};
/* mèches de chaque coiffure : [x0, y0, x1, y1, demi-largeur, courbure] */
const FRINGE = {
  meches: [[-9, -15, -12, 9, 5, -2], [-4, -20, -2.5, 1, 5.6, 1.5], [2, -21, 6.5, 4.5, 5.6, 2], [7.5, -20, 12, 1.5, 5, 2], [11.5, -17, 16.5, 4, 4.2, 1.6], [14.5, -11, 17.4, 10, 3, 1]],
  pics: [[-6, -16, -28, -2, 6, -2], [-5, -19, -27, -20, 6, -2], [-2, -21, -17, -37, 6, -1.5], [3, -22, 1, -41, 5.6, -1], [7, -21, 15, -37, 5.6, 1], [10, -18, 25, -26, 5, 1.2], [12, -14, 26, -11, 4.4, 1], [3, -18, 6, -2, 5, 1.4], [8.5, -17, 13, 0, 4.6, 1.4], [12.5, -14, 17.6, 3, 3.6, 1], [-9, -14, -11, 6, 4, -1.5]],
  court: [[-9, -17, -17, -24, 4.6, -1], [-4, -21, -7, -30, 4.6, -1], [2, -22, 5, -30, 4.2, 1], [1, -18, 5, -5, 5, 1.4], [6, -18, 11, -4, 4.6, 1.4], [10.5, -16, 16.5, -3, 3.8, 1.2], [-8, -14, -11, 4, 4, -1.5]],
  crete: [[-12, -14, -26, -20, 5, -1.5], [-8, -18, -18, -33, 5.4, -1.5], [-2, -21, -4, -42, 5.4, -1], [4, -21, 10, -38, 5, 1], [9, -18, 19, -28, 4.4, 1.2], [6, -16, 11, -6, 3.4, 1.2]],
  queue: [[-8, -15, -11, 6, 4.4, -1.5], [3, -19, 7.5, -3, 5, 1.6], [8.5, -18, 13, -1, 4.6, 1.6], [12.5, -15, 17, 4, 3.6, 1.2], [14.5, -10, 16.4, 11, 2.6, .8]],
  tresse: [[-9, -15, -12, 8, 4.6, -2], [-2, -20, 5, 0, 5.6, 2.2], [4.5, -20, 11.5, 1, 5.2, 2.2], [9.5, -18, 16, 3, 4.4, 1.8], [13, -13, 17, 8, 3.2, 1.1], [14.2, -8, 15.6, 15, 2.4, .7]],
};
FRINGE.longs = FRINGE.meches;
function hairLock(c, l, col) {
  const p = Pth.lock(l[0], l[1], l[2], l[3], l[4], l[5]);
  cel(c, p, col, { lw: 1.4, hi: .5 });
  // fil de lumière le long de la mèche
  const dx = l[2] - l[0], dy = l[3] - l[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  c.strokeStyle = lightOf(col); c.globalAlpha = .45; c.lineWidth = 1.1; c.lineCap = 'round';
  c.beginPath(); c.moveTo(l[0] + dx * .18 - nx * l[4] * .25, l[1] + dy * .18 - ny * l[4] * .25);
  c.quadraticCurveTo(l[0] + dx * .45 + nx * (l[5] || 0) * .5, l[1] + dy * .45 + ny * (l[5] || 0) * .5, l[0] + dx * .62, l[1] + dy * .62); c.stroke();
  c.globalAlpha = 1;
}
function drawHairBack(c, L) {
  const col = L.hairColor, dk = shadeOf(col), st = L.hair;
  // masse arrière commune (nuque), plus sombre
  if (st !== 'crete') cel(c, cc => { cc.moveTo(-6, -20); cc.bezierCurveTo(-20, -19, -21, 2, -17, 13); cc.lineTo(-11, 10); cc.lineTo(-8, 15); cc.quadraticCurveTo(-4, 2, 2, -8); cc.closePath(); }, dk, { lw: 1.5, hi: .3 });
  if (st === 'longs') {
    cel(c, cc => { cc.moveTo(-4, -20); cc.bezierCurveTo(-27, -18, -27, 20, -22, 50); cc.lineTo(-17, 43); cc.lineTo(-13, 52); cc.lineTo(-9, 41); cc.lineTo(-4, 47); cc.quadraticCurveTo(-3, 26, 0, 4); cc.closePath(); }, mix(col, dk, .45), { lw: 1.6 });
    c.strokeStyle = shadeOf(dk); c.lineWidth = .9; c.globalAlpha = .6;
    c.beginPath(); c.moveTo(-16, 0); c.quadraticCurveTo(-20, 22, -17, 40); c.moveTo(-9, 6); c.quadraticCurveTo(-11, 24, -9, 36); c.stroke(); c.globalAlpha = 1;
  }
  if (st === 'queue') {
    cel(c, Pth.lock(-12, -14, -30, 30, 6.5, -6), mix(col, dk, .3), { lw: 1.6 });
    cel(c, Pth.lock(-14, -12, -24, 22, 4, 3), col, { lw: 1.4 });
    cel(c, Pth.ellipse(-13, -13, 3.6, 4.6, .5), '#ffb994', { lw: 1.4 });
  }
  if (st === 'tresse') {
    // une seule natte dans le dos, maillons tressés qui s'affinent
    for (let i = 0; i < 8; i++) { const y = 2 + i * 6.2, x = -15 - Math.sin(i * .55) * 2.4 - i * .7; cel(c, Pth.ellipse(x, y, 5.4 - i * .28, 4.4, i % 2 ? .55 : -.55), i % 2 ? col : mix(col, dk, .3), { lw: 1.4 }); }
    cel(c, Pth.rrect(-24, 50, 8, 4.4, 1.6), '#ffb994', { lw: 1.3 });
    cel(c, cc => { cc.moveTo(-23, 54); cc.lineTo(-27, 64); cc.lineTo(-21, 59.5); cc.lineTo(-18, 65); cc.lineTo(-17, 54); cc.closePath(); }, col, { lw: 1.3 });
  }
}
/* Frange d'un seul tenant : calotte + bord inférieur en dents de mèches (pointes vers le bas) */
const isDown = l => l[3] > l[1] + 6 && l[2] > l[0] - 5;
function fringePath(downs) {
  const ds = downs.slice().sort((a, b) => b[2] - a[2]);
  return c => {
    c.moveTo(-17.5, 10);
    c.bezierCurveTo(-23, -8, -14, -25.5, 1.5, -25);
    c.bezierCurveTo(15, -24.5, 21, -15.5, 19, -3);
    let px = 19, py = -3;
    for (let i = 0; i < ds.length; i++) {
      const l = ds[i], tx = l[2], ty = l[3];
      c.quadraticCurveTo(tx + 2.2, py + (ty - py) * .55, tx, ty);
      const n = ds[i + 1];
      if (n) { const nx = (tx + n[2]) / 2 + .6, ny = Math.min(ty, n[3]) - Math.max(5, (ty - l[1]) * .45); c.quadraticCurveTo(tx - .4, ty - (ty - ny) * .45, nx, ny); px = nx; py = ny; }
    }
    c.quadraticCurveTo(-11, 9, -10, 10.5);
    c.closePath();
  };
}
function drawHairFront(c, L) {
  const col = L.hairColor, st = L.hair, locks = FRINGE[st] || FRINGE.meches;
  const ups = locks.filter(l => !isDown(l)), downs = locks.filter(isDown);
  if (st === 'crete') {
    // côtés rasés : ombre courte sur le crâne, crête de pointes
    c.save(); c.beginPath(); headPath(c); c.clip();
    c.fillStyle = mix(col, L.skin, .72); c.globalAlpha = .5; c.beginPath(); HAIRCAP(c); c.fill();
    c.restore();
    for (const l of ups) hairLock(c, l, col);
    for (const l of downs) hairLock(c, l, col);
    return;
  }
  for (const l of ups) hairLock(c, l, col);
  const fp = fringePath(downs);
  cel(c, fp, col, { lw: 1.6, hi: .45 });
  c.save(); c.beginPath(); fp(c); c.clip();
  // séparations de mèches : traits fins qui partent des pointes
  c.lineCap = 'round';
  for (const l of downs) {
    const dx = l[2] - l[0], dy = l[3] - l[1];
    c.strokeStyle = deepOf(col); c.globalAlpha = .55; c.lineWidth = 1;
    c.beginPath(); c.moveTo(l[2] - dx * .05, l[3] - dy * .05); c.quadraticCurveTo(l[0] + dx * .55 - (l[5] || 0), l[1] + dy * .55, l[0] + dx * .25, l[1] + dy * .25); c.stroke();
    c.strokeStyle = lightOf(col); c.globalAlpha = .4; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(l[0] + dx * .3 + 1.6, l[1] + dy * .3); c.quadraticCurveTo(l[0] + dx * .5 + 2, l[1] + dy * .5, l[0] + dx * .66 + 1.2, l[1] + dy * .66); c.stroke();
  }
  // anneau de lumière
  c.strokeStyle = lightOf(col); c.globalAlpha = .8; c.lineWidth = 2.6;
  c.beginPath(); c.arc(1.5, -5, 15.5, Math.PI * 1.12, Math.PI * 1.32); c.stroke();
  c.beginPath(); c.arc(1.5, -5, 15.5, Math.PI * 1.42, Math.PI * 1.6); c.stroke();
  c.globalAlpha = 1;
  c.restore();
}
/* Yeux anime : amande, iris en dégradé, pupille, deux reflets, cils épais */
function drawEye(c, x, w, h, iris, ex, blink, outer) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (ex === 'ko') { c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x - 2.6, -3); c.lineTo(x + 2.6, 2.4); c.moveTo(x + 2.6, -3); c.lineTo(x - 2.6, 2.4); c.stroke(); return; }
  if (ex === 'hurt') { c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x - w, -2.5 * outer); c.lineTo(x + w * .2, .5); c.lineTo(x + w, -2.5 * -outer); c.stroke(); return; }
  if (blink) { c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x - w, 0); c.quadraticCurveTo(x, 2.2, x + w, 0); c.stroke(); return; }
  if (ex === 'grin') { c.strokeStyle = INK; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x - w, 1.4); c.quadraticCurveTo(x, -3.6, x + w, 1.4); c.stroke(); return; }
  const shape = cc => { cc.moveTo(x - w, -h * .12); cc.quadraticCurveTo(x - w * .55, -h * .98, x + w * .2, -h); cc.quadraticCurveTo(x + w * .95, -h * .86, x + w, -h * .08); cc.quadraticCurveTo(x + w * .55, h * .95, x - w * .05, h * .88); cc.quadraticCurveTo(x - w * .82, h * .68, x - w, -h * .12); cc.closePath(); };
  c.beginPath(); shape(c); c.fillStyle = '#fbf6ff'; c.fill();
  c.save(); c.beginPath(); shape(c); c.clip();
  const ix = x + w * .2, iy = h * .1;
  const g = c.createLinearGradient(0, iy - h * .85, 0, iy + h * .85);
  g.addColorStop(0, deepOf(iris)); g.addColorStop(.45, iris); g.addColorStop(1, lightOf(iris));
  c.beginPath(); c.ellipse(ix, iy, w * .74, h * .84, 0, 0, TAU); c.fillStyle = g; c.fill();
  c.lineWidth = .7; c.strokeStyle = deepOf(iris); c.stroke();
  c.beginPath(); c.ellipse(ix + w * .05, iy + h * .05, w * .3, h * .42, 0, 0, TAU); c.fillStyle = '#140c1e'; c.fill();
  // ombre de la paupière
  c.beginPath(); c.ellipse(x, -h * .95, w * 1.3, h * .38, 0, 0, TAU); c.fillStyle = 'rgba(40,20,60,.28)'; c.fill();
  c.restore();
  c.fillStyle = '#ffffff';
  c.beginPath(); c.ellipse(ix - w * .26, iy - h * .38, w * .3, h * .2, -.4, 0, TAU); c.fill();
  c.beginPath(); c.arc(ix + w * .32, iy + h * .4, w * .13, 0, TAU); c.fill();
  // paupière haute épaisse + cil relevé côté extérieur
  c.strokeStyle = INK; c.lineWidth = 2.3;
  c.beginPath(); c.moveTo(x - w * .92, -h * .3); c.quadraticCurveTo(x - w * .5, -h * 1.1, x + w * .25, -h * 1.04); c.quadraticCurveTo(x + w * .85, -h * .96, x + w * .95, -h * .3); c.stroke();
  const ox = outer < 0 ? x - w * .92 : x + w * .95, oy = -h * .3;
  c.lineWidth = 1.5; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + outer * 1.8, oy - 1.4); c.stroke();
  c.lineWidth = .8; c.globalAlpha = .7; c.beginPath(); c.moveTo(x - w * .45, h * .86); c.quadraticCurveTo(x + w * .2, h * 1.02, x + w * .75, h * .55); c.stroke(); c.globalAlpha = 1;
}
function drawFace(c, v, t) {
  const L = v.look, ex = v.expr, iris = L.eyes || '#3dc8ff';
  const blink = ((t / 1000 + v.phase) % 4.2) < .12;
  // ombre portée de la frange sur le front
  c.save(); c.beginPath(); headPath(c); c.clip();
  c.fillStyle = shadeOf(L.skin); c.globalAlpha = .55; c.save(); c.translate(1, 3.2); c.beginPath(); HAIRCAP(c); c.fill(); c.restore();
  c.globalAlpha = .5; c.beginPath(); c.ellipse(4, 16.5, 12, 4.5, -.15, 0, TAU); c.fill();
  c.restore();
  c.save(); c.translate(0, 3.6);
  drawEye(c, 3.8, 3.7, 5.4, iris, ex, blink, -1);
  drawEye(c, 11.8, 2.8, 5, iris, ex, blink, 1);
  c.restore();
  // joues
  c.fillStyle = 'rgba(255,128,128,.2)'; c.beginPath(); c.ellipse(4, 11.2, 2.8, 1.2, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(12.4, 11, 1.8, 1, 0, 0, TAU); c.fill();
  // nez
  c.strokeStyle = shadeOf(L.skin); c.lineWidth = 1.1; c.lineCap = 'round'; c.beginPath(); c.moveTo(15.1, 6.8); c.lineTo(14.3, 8.6); c.stroke();
  // bouche
  c.strokeStyle = INK;
  if (ex === 'hurt' || ex === 'ko') { c.beginPath(); c.moveTo(8.6, 12.8); c.quadraticCurveTo(10.5, 10.4, 12.8, 12.6); c.quadraticCurveTo(10.8, 14.6, 8.6, 12.8); c.fillStyle = '#5a1f2e'; c.fill(); c.lineWidth = 1.1; c.stroke(); }
  else if (ex === 'grin') { c.beginPath(); c.moveTo(7.6, 11.2); c.quadraticCurveTo(10.6, 15.6, 13.4, 10.8); c.closePath(); c.fillStyle = '#5a1f2e'; c.fill(); c.save(); c.clip(); c.fillStyle = '#ffffff'; c.fillRect(7, 10.4, 7, 1.8); c.restore(); c.lineWidth = 1.1; c.stroke(); }
  else { c.lineWidth = 1.2; c.beginPath(); c.moveTo(8.6, 12.4); c.quadraticCurveTo(10.6, 11.7, 12.6, 12.5); c.stroke(); }
  // marques (adversaires)
  const m = v.mark;
  if (m === 'cicatrice') { c.strokeStyle = '#c4626a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(1, 7); c.lineTo(6.5, 12.5); c.moveTo(2.4, 10.6); c.lineTo(4, 9.2); c.moveTo(4.2, 12.2); c.lineTo(5.6, 10.6); c.stroke(); }
  else if (m === 'peinture') { c.strokeStyle = '#9cc9ff'; c.globalAlpha = .9; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 9.5); c.lineTo(6, 10.5); c.moveTo(.8, 12); c.lineTo(5.8, 12.8); c.stroke(); c.globalAlpha = 1; }
  else if (m === 'pansement') { c.save(); c.translate(4, 10.4); c.rotate(-.35); cel(c, Pth.rrect(-3.6, -1.6, 7.2, 3.2, 1), '#efe2cc', { lw: 1, hi: false }); c.strokeStyle = 'rgba(120,90,70,.6)'; c.lineWidth = .6; c.beginPath(); c.moveTo(-1, -1.2); c.lineTo(-1, 1.2); c.moveTo(1, -1.2); c.lineTo(1, 1.2); c.stroke(); c.restore(); }
  else if (m === 'tatouage') { c.fillStyle = '#ffb994'; c.globalAlpha = .9; for (const [x, y] of [[-1.5, 7], [0, 9.6], [-1.6, 12]]) { c.beginPath(); c.moveTo(x, y - 1.4); c.lineTo(x + 1.1, y); c.lineTo(x, y + 1.4); c.lineTo(x - 1.1, y); c.closePath(); c.fill(); } c.globalAlpha = 1; }
}
/* Sourcils froncés en V, dessinés par-dessus la frange (convention manga) */
function drawBrows(c, v) {
  const ex = v.expr; if (ex === 'ko') return;
  const calm = ex === 'grin' ? 1.2 : 0, col = deepOf(v.look.hairColor);
  const brow = (x0, y0, x1, y1) => { c.beginPath(); c.moveTo(x0, y0 - .9); c.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - 1.6, x1, y1); c.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) + .2, x0, y0 + .9); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = .8; c.strokeStyle = INK; c.stroke(); };
  brow(-1.6, -5.6 + calm, 6, -3.2 - calm * .4);
  brow(8.6, -3.4 - calm * .4, 14.6, -5.6 + calm);
}
function drawHead(c, v, t) {
  const L = v.look;
  cel(c, headPath, L.skin, { lw: 1.7, hi: .35 });
  cel(c, Pth.ellipse(-5.8, 4.6, 2.1, 3.1, .1), L.skin, { lw: 1.2, lx: -.6, ly: -.8 });
  c.strokeStyle = shadeOf(L.skin); c.lineWidth = .8; c.beginPath(); c.arc(-5.6, 4.6, 1.2, -1, 1.6); c.stroke();
  drawFace(c, v, t);
  drawHairFront(c, L);
  drawBrows(c, v);
  if (v.boss) {
    // heaume de fer noirci à cornes d'os
    cel(c, cc => { cc.moveTo(-16, -2); cc.bezierCurveTo(-18, -20, -6, -26, 4, -25); cc.bezierCurveTo(14, -24, 19, -16, 18, -6); cc.lineTo(14, -8); cc.quadraticCurveTo(2, -16, -10, -6); cc.lineTo(-12, 4); cc.closePath(); }, '#3c3648', { lw: 1.6 });
    cel(c, Pth.rrect(-6, -23, 4, 14, 1.5), '#5a5268', { lw: 1.2 });
    cel(c, cc => { cc.moveTo(-10, -17); cc.quadraticCurveTo(-30, -26, -24, -48); cc.quadraticCurveTo(-19, -30, -4, -22); cc.closePath(); }, '#eadccb', { lw: 1.6 });
    cel(c, cc => { cc.moveTo(6, -23); cc.quadraticCurveTo(10, -42, 30, -46); cc.quadraticCurveTo(18, -34, 15, -18); cc.closePath(); }, '#eadccb', { lw: 1.6 });
  }
}

/* ---------- Corps (pieds en 0,0, regard vers +x) ---------- */
function drawHumanoid(c, v, t) {
  const p = v.pose, L = v.look, bw = BUILD[L.build] || 1;
  const skin = L.skin, cloth = L.outfit;
  const shirt = mix(cloth, '#e9dfd2', .72), pants = mix(cloth, '#1f1828', .6), leather = '#6a4430', leatherD = '#46302a';
  const boot = '#3a2c30', metal = '#e3c37a', wrap = '#e8dcc6', glove = '#2f2533';
  c.save();
  c.translate(v.x, v.y);
  c.scale(v.face * v.scale * CH, v.scale * CH);
  if (p.rot) { c.translate(0, -p.rot * 16); c.rotate(p.rot); }
  let bodyY = p.bodyY * .7, fF = p.fF, fB = p.fB, liftF = p.lF * .6, liftB = 0;
  if (v.running) {
    const s = Math.sin(v.runT), co = Math.cos(v.runT);
    fF = 4 + s * 16; fB = -4 - s * 16; liftF = Math.max(0, co) * 9; liftB = Math.max(0, -co) * 9; bodyY -= Math.abs(s) * 3;
  }
  const breathe = Math.sin(t / 300 + v.phase);
  c.translate(0, bodyY);
  const hip = { x: 0, y: -56 + p.crouch * .55 + breathe * .35 };
  const hipW = 6.5 * bw;

  const leg = (dx, fx, lift, back) => {
    const hx = hip.x + dx, hy = hip.y + 4;
    const k = ik2(hx, hy, fx, -10 - lift, 22, 21);
    const pc = back ? shadeOf(pants) : pants, lc = back ? shadeOf(leather) : leather;
    cel(c, Pth.capsule(hx, hy, k.kx, k.ky, 8.8 * bw, 7.3 * bw), pc);
    cel(c, Pth.capsule(k.kx, k.ky, k.fx, k.fy - 4, 7.2 * bw, 6.4 * bw), pc);
    // plis du pantalon
    c.strokeStyle = 'rgba(16,8,26,.4)'; c.lineWidth = .9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(lerp(hx, k.kx, .55) - 3, lerp(hy, k.ky, .55)); c.quadraticCurveTo(lerp(hx, k.kx, .7), lerp(hy, k.ky, .7) + 2, lerp(hx, k.kx, .8) + 3, lerp(hy, k.ky, .8)); c.stroke();
    // poche cargo sur la cuisse avant
    // genouillère
    cel(c, Pth.ellipse(k.kx + 2, k.ky + .5, 4.6 * bw, 5.4 * bw, .25), lc, { lw: 1.3 });
    // botte montante à sangles
    const ax = k.fx, ay = k.fy + 10, bc = back ? shadeOf(boot) : boot;
    const bootP = cc => { cc.moveTo(ax - 6.5, ay - 16); cc.lineTo(ax + 5.5, ay - 16); cc.lineTo(ax + 6.5, ay - 9); cc.quadraticCurveTo(ax + 10, ay - 7.5, ax + 14.5, ay - 6); cc.quadraticCurveTo(ax + 18.5, ay - 4.5, ax + 17.5, ay - .5); cc.lineTo(ax - 8.5, ay - .5); cc.quadraticCurveTo(ax - 8.6, ay - 9, ax - 6.5, ay - 16); cc.closePath(); };
    cel(c, bootP, bc, { lw: 1.6 });
    cel(c, Pth.rrect(ax - 9, ay - 3.6, 28, 4.2, 1.5), '#1b1418', { lw: 1.3, hi: false });
    cel(c, Pth.rrect(ax - 7.8, ay - 18.5, 14.6, 3.8, 1.6), back ? shadeOf(leatherD) : leatherD, { lw: 1.3 });
    for (const yy of [ay - 13, ay - 9]) {
      c.fillStyle = lc; c.fillRect(ax - 7.4, yy, 14, 1.9);
      c.fillStyle = back ? shadeOf(metal) : metal; c.fillRect(ax + 2.6, yy - .3, 2.4, 2.5);
    }
    c.strokeStyle = 'rgba(255,240,220,.55)'; c.lineWidth = .8; c.beginPath(); c.moveTo(ax + 7.5, ay - 7); c.lineTo(ax + 10, ay - 5.4); c.moveTo(ax + 10.5, ay - 6.6); c.lineTo(ax + 12.5, ay - 5); c.stroke();
  };
  const torso = () => { c.translate(hip.x, hip.y); c.rotate(p.lean); };
  const headFrame = () => { c.translate(3, -38); c.rotate(p.head + breathe * .012); c.translate(2, -16 * HS); c.scale(HS, HS); };
  const arm = (sx, a, e, back, front) => {
    const sy = -30, ux = sx + Math.sin(a) * 15, uy = sy + Math.cos(a) * 15;
    const fa = a + e;
    const hx = ux + Math.sin(fa) * 13.5, hy = uy + Math.cos(fa) * 13.5;
    const sk = back ? shadeOf(skin) : skin, sl = back ? shadeOf(cloth) : cloth;
    cel(c, Pth.capsule(ux, uy, hx, hy, 4.8 * bw, 4.3 * bw), sk);
    // brassard de cuir lacé
    const b0x = lerp(ux, hx, .3), b0y = lerp(uy, hy, .3);
    cel(c, Pth.capsule(b0x, b0y, lerp(ux, hx, .86), lerp(uy, hy, .86), 5.5 * bw, 5 * bw), back ? shadeOf(leather) : leather, { lw: 1.4 });
    const nx = -(hy - uy) / 13.5, ny = (hx - ux) / 13.5;
    c.strokeStyle = back ? shadeOf(metal) : metal; c.lineWidth = .9;
    for (const f of [.45, .7]) { const mx = lerp(ux, hx, f), my = lerp(uy, hy, f); c.beginPath(); c.moveTo(mx - nx * 5 * bw, my - ny * 5 * bw); c.lineTo(mx + nx * 5 * bw, my + ny * 5 * bw); c.stroke(); }
    cel(c, Pth.capsule(sx, sy, ux, uy, 5.8 * bw, 5 * bw), sk);
    // manche courte de la veste
    cel(c, Pth.capsule(sx, sy, lerp(sx, ux, .55), lerp(sy, uy, .55), 6.4 * bw, 6 * bw), sl, { lw: 1.5 });
    if (front) {
      c.save(); c.translate(hx, hy); c.rotate(p.wpn); c.scale(1.12, 1.12);
      drawWeapon(c, v.gear.weapon, v.gear.wRar);
      c.restore();
    }
    // poing : mitaine de cuir, doigts nus, bandage au poignet
    const fr = (v.gear.weapon === 'poings' && front ? 6.6 : 5.7) * bw;
    cel(c, Pth.capsule(lerp(ux, hx, .86), lerp(uy, hy, .86), hx, hy, 4.9 * bw, 4.9 * bw), back ? shadeOf(wrap) : wrap, { lw: 1.2, hi: .3 });
    cel(c, Pth.circle(hx, hy, fr), back ? shadeOf(glove) : glove, { lw: 1.6 });
    c.fillStyle = sk; c.beginPath(); c.ellipse(hx + fr * .42, hy - fr * .38, fr * .5, fr * .32, -.6, 0, TAU); c.fill();
    c.strokeStyle = INK; c.lineWidth = .8; c.beginPath(); c.moveTo(hx + fr * .1, hy - fr * .7); c.lineTo(hx + fr * .55, hy - fr * .1); c.stroke();
    if (v.gear.armor === 'plaques') { const pa = cc => { cc.arc(sx + 1, sy, 9.6 * bw, Math.PI * 1.02, Math.PI * 2.08); cc.closePath(); }; cel(c, pa, back ? shadeOf(STEEL) : STEEL, { hi: .7 }); trim(c, pa, v.gear.aRar); c.fillStyle = INK; c.beginPath(); c.arc(sx - 4, sy - 4, .9, 0, TAU); c.arc(sx + 5, sy - 5, .9, 0, TAU); c.fill(); }
    if (v.gear.armor === 'cuir') { const pa = cc => { cc.ellipse(sx + 1, sy - 1, 8.2 * bw, 5.6, -.25, Math.PI * .95, Math.PI * 2.1); cc.closePath(); }; cel(c, pa, back ? shadeOf('#7a4a2c') : '#7a4a2c'); trim(c, pa, v.gear.aRar); }
  };

  c.save(); torso(); headFrame(); drawHairBack(c, L); c.restore();
  c.save(); torso(); arm(-6 * bw, p.armB, p.elbB, true, false); c.restore();
  leg(-hipW * .6, fB, liftB, true);
  leg(hipW * .6, fF, liftF, false);
  c.save(); torso();
  cel(c, Pth.ellipse(0, 2, 10.6 * bw, 7.6), pants);
  const tPath = cc => { cc.moveTo(-9 * bw, 4); cc.lineTo(9 * bw, 4); cc.quadraticCurveTo(10.6 * bw, -8, 9.2 * bw, -14); cc.quadraticCurveTo(12.6 * bw, -26, 10.5 * bw, -32); cc.quadraticCurveTo(9 * bw, -35.5, 3 * bw, -35.5); cc.lineTo(-5 * bw, -35.5); cc.quadraticCurveTo(-12.6 * bw, -35, -12 * bw, -27); cc.quadraticCurveTo(-10 * bw, -16, -9.6 * bw, -12); cc.quadraticCurveTo(-10.6 * bw, -4, -9 * bw, 4); cc.closePath(); };
  cel(c, Pth.capsule(2.5, -32, 3.8, -40, 4.2, 4), skin, { lw: 1.6 });
  cel(c, tPath, shirt, { lw: 1.9 });
  // veste ouverte : pan arrière + pan avant, col relevé
  c.save(); c.beginPath(); tPath(c); c.clip();
  cel(c, cc => { cc.moveTo(-14 * bw, -37); cc.lineTo(-.5, -37); cc.quadraticCurveTo(1.8, -20, -.5, 6); cc.lineTo(-14 * bw, 6); cc.closePath(); }, cloth, { lw: 1.6 });
  cel(c, cc => { cc.moveTo(6.5 * bw, -37); cc.lineTo(14 * bw, -37); cc.lineTo(14 * bw, 6); cc.lineTo(7.5 * bw, 6); cc.quadraticCurveTo(5.4 * bw, -14, 6.5 * bw, -37); cc.closePath(); }, cloth, { lw: 1.6 });
  c.restore();
  c.beginPath(); tPath(c); c.lineWidth = 1.9; c.strokeStyle = INK; c.stroke();
  // pli du tee-shirt
  c.strokeStyle = shadeOf(shirt); c.lineWidth = 1; c.beginPath(); c.moveTo(1.5, -22); c.quadraticCurveTo(3.5, -18, 5.5 * bw, -20); c.moveTo(1, -10); c.quadraticCurveTo(3, -7, 5.6 * bw, -9); c.stroke();
  cel(c, Pth.poly([-6.5 * bw, -36.5, -.5, -36.5, -2.5, -41, -9.5 * bw, -38.5]), mix(cloth, '#000', .12), { lw: 1.4 });
  cel(c, Pth.poly([6 * bw, -36.5, 10 * bw, -36.5, 8.5 * bw, -40.5]), mix(cloth, '#000', .12), { lw: 1.4 });
  drawArmor(c, v, bw, tPath);
  // sangle en travers + anneau
  cel(c, Pth.poly([-9 * bw, -33, -6 * bw, -34.5, 10 * bw, -5, 7 * bw, -3.2]), leatherD, { lw: 1.3, hi: .3 });
  cel(c, Pth.circle(1.2, -19.5, 2.2), metal, { lw: 1.1 });
  // ceinture double, boucle, sacoche
  cel(c, Pth.rrect(-10.6 * bw, -4, 21.2 * bw, 5.6, 1.6), leather, { lw: 1.5 });
  cel(c, Pth.rrect(2, -5, 5.6, 7.6, 1.2), metal, { lw: 1.3, hi: .7 });
  c.strokeStyle = INK; c.lineWidth = .9; c.beginPath(); c.moveTo(4.8, -3); c.lineTo(4.8, 1); c.stroke();
  cel(c, Pth.poly([-11 * bw, 1, 10.5 * bw, 4.6, 10.5 * bw, 7.4, -11 * bw, 4]), leatherD, { lw: 1.2, hi: .3 });
  cel(c, Pth.rrect(-12 * bw, 1, 7.4, 9.4, 1.8), mix(leather, '#000', .1), { lw: 1.4 });
  cel(c, Pth.rrect(-12 * bw, 1, 7.4, 3.6, 1.4), leatherD, { lw: 1.1, hi: false });
  c.save(); headFrame(); drawHead(c, v, t); c.restore();
  arm(6 * bw, p.armF, p.elbF, false, true);
  c.restore();
  if (v.stun > 0) {
    c.save(); c.translate(0, -HERO_H - 8);
    for (let i = 0; i < 3; i++) { const a = t / 220 + i * TAU / 3; star(c, Math.cos(a) * 18, Math.sin(a) * 5, 6, '#ffe066'); }
    c.restore();
  }
  c.restore();
}
function trim(c, path, rar) { if (!rar) return; c.beginPath(); path(c); c.strokeStyle = RARITIES[rar].color; c.lineWidth = 1.6; c.stroke(); }
function drawArmor(c, v, bw, tPath) {
  const k = v.gear.armor; if (!k) return;
  if (k === 'cuir') {
    const pp = cc => { cc.moveTo(-11 * bw, -30); cc.lineTo(6 * bw, -30); cc.quadraticCurveTo(10 * bw, -18, 8 * bw, -6); cc.lineTo(-9 * bw, -6); cc.quadraticCurveTo(-12 * bw, -18, -11 * bw, -30); cc.closePath(); };
    c.save(); c.beginPath(); tPath(c); c.clip(); cel(c, pp, '#7a4a2c', { lw: 1.6 }); c.restore();
    c.strokeStyle = 'rgba(255,220,180,.45)'; c.lineWidth = .8; c.setLineDash([1.6, 1.6]); c.beginPath(); c.moveTo(-9 * bw, -27); c.lineTo(5 * bw, -27); c.moveTo(-8.5 * bw, -9); c.lineTo(7 * bw, -9); c.stroke(); c.setLineDash([]);
    trim(c, pp, v.gear.aRar);
  } else if (k === 'maille') {
    c.save(); c.beginPath(); tPath(c); c.clip();
    cel(c, Pth.rrect(-13 * bw, -33, 26 * bw, 34, 3), '#9aa3b8', { lw: 1.4 });
    c.strokeStyle = 'rgba(26,16,36,.4)'; c.lineWidth = .8;
    for (let y = -30; y < 0; y += 3.4) { c.beginPath(); for (let x = -13 * bw + (y % 6.8 ? 1.7 : 0); x < 13 * bw; x += 3.4) { c.moveTo(x, y); c.arc(x + 1.7, y, 1.7, Math.PI, 0, true); } c.stroke(); }
    c.restore();
    trim(c, cc => { cc.moveTo(-12 * bw, -32.5); cc.lineTo(11 * bw, -32.5); }, v.gear.aRar);
  } else if (k === 'plaques') {
    const pp = cc => { cc.moveTo(-10.5 * bw, -34); cc.lineTo(10.5 * bw, -34); cc.quadraticCurveTo(13.5 * bw, -16, 7 * bw, -5); cc.lineTo(-7 * bw, -5); cc.quadraticCurveTo(-13 * bw, -16, -10.5 * bw, -34); cc.closePath(); };
    cel(c, pp, STEEL, { lw: 1.8, hi: .8 });
    c.strokeStyle = 'rgba(26,16,36,.45)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(1, -33); c.lineTo(1, -7); c.moveTo(-8 * bw, -16); c.quadraticCurveTo(1, -13, 9 * bw, -16); c.stroke();
    c.fillStyle = INK; for (const [x, y] of [[-7, -30], [8, -30], [-5, -9], [6, -9]]) { c.beginPath(); c.arc(x * bw, y, .9, 0, TAU); c.fill(); }
    trim(c, pp, v.gear.aRar);
  }
}
function star(c, x, y, r, col) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 1.3; c.strokeStyle = INK; c.stroke();
}

/* ---------- Éclairage d'ensemble : calque + dégradé + contre-jour ---------- */
const _litA = document.createElement('canvas'), _litB = document.createElement('canvas');
function drawFighter(c, v, t) {
  const pet = v.kind === 'pet';
  const m = c.getTransform(), S = Math.hypot(m.a, m.b) || 1;
  const k = pet ? v.scale : v.scale * CH, p = v.pose;
  // ombre au sol
  c.save(); c.translate(v.x, v.y); c.scale(k * v.face, k); c.globalAlpha *= .42 * v.alpha;
  if (pet) { c.beginPath(); c.ellipse(0, 0, v.body === 'ours' ? 32 : 26, 6, 0, 0, TAU); }
  else { const bw = BUILD[v.look.build] || 1, sh = 1 - Math.min(.5, -p.bodyY / 80); c.beginPath(); c.ellipse(p.rot ? -30 : 0, 0, (p.rot ? 60 : 28 * bw) * sh, 7 * sh, 0, 0, TAU); }
  c.fillStyle = '#0a0612'; c.fill(); c.restore();
  const bx0 = v.x - 115 * k, by0 = v.y - 200 * k, W = Math.ceil(230 * k * S), H = Math.ceil(225 * k * S);
  if (W < 2 || H < 2) return;
  if (_litA.width < W || _litA.height < H) { _litA.width = _litB.width = Math.max(_litA.width, W); _litA.height = _litB.height = Math.max(_litA.height, H); }
  const a = _litA.getContext('2d');
  a.setTransform(1, 0, 0, 1, 0, 0); a.globalAlpha = 1; a.globalCompositeOperation = 'source-over'; a.clearRect(0, 0, W, H);
  a.setTransform(S, 0, 0, S, -bx0 * S, -by0 * S);
  if (pet) drawPet(a, v, t); else drawHumanoid(a, v, t);
  a.setTransform(1, 0, 0, 1, 0, 0);
  a.globalCompositeOperation = 'source-atop';
  const gy = (v.y - by0) * S, top = gy - (pet ? 60 : HERO_H) * k * S;
  const g = a.createLinearGradient(0, top, 0, gy);
  g.addColorStop(0, 'rgba(255,238,214,.18)'); g.addColorStop(.42, 'rgba(255,238,214,0)'); g.addColorStop(.78, 'rgba(24,12,40,.1)'); g.addColorStop(1, 'rgba(24,12,40,.42)');
  a.fillStyle = g; a.fillRect(0, 0, W, H);
  if (RIM) {
    const b = _litB.getContext('2d');
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H);
    // bande décalée vers l'intérieur pour garder le trait encre du bord
    const e = 1.1 * S * k, d = 1.15 * S * k;
    b.drawImage(_litA, 0, 0, W, H, v.face * e, e * .7, W, H);
    b.globalCompositeOperation = 'source-in'; b.fillStyle = RIM; b.fillRect(0, 0, W, H);
    b.globalCompositeOperation = 'destination-out'; b.drawImage(_litA, 0, 0, W, H, v.face * (e + d), (e + d) * .7, W, H);
    b.globalCompositeOperation = 'source-over';
    a.globalAlpha = .5; a.drawImage(_litB, 0, 0, W, H, 0, 0, W, H); a.globalAlpha = 1;
  }
  a.globalCompositeOperation = 'source-over';
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha *= v.alpha;
  c.drawImage(_litA, 0, 0, W, H, m.a * bx0 + m.c * by0 + m.e, m.b * bx0 + m.d * by0 + m.f, W, H);
  c.restore();
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
    bossPet: !!B, stripes: !!sp.stripes, bushy: pet.species === 'renard', x, y, homeX: x, homeY: y, face: side === 'L' ? 1 : -1, scale: .86,
    pose: { ...PET_POSES.idle }, target: PET_POSES.idle, rate: 10, running: false, runT: 0, flash: 0, alpha: 1, phase: Math.random() * 10, expr: 'neutral', stun: 0, glow: 0,
  };
}
function drawPet(c, v, t) {
  const p = v.pose, b = v.body, col = v.col, belly = v.belly;
  const s = v.scale;
  c.save(); c.translate(v.x, v.y);
  c.scale(v.face * s, s);
  if (v.glowCol) { const g = c.createRadialGradient(4, -30, 4, 4, -30, 48); g.addColorStop(0, v.glowCol + '66'); g.addColorStop(1, v.glowCol + '00'); c.fillStyle = g; c.beginPath(); c.arc(4, -30, 48, 0, TAU); c.fill(); }
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
    cel(c, Pth.capsule(x0, y0, x1, y1, dims.lr + 1, dims.lr), cl, { lw: 1.9 });
    cel(c, Pth.ellipse(x1 + 2, y1 + 1, dims.lr + 1.6, dims.lr * .7), dark ? shadeOf(belly) : belly, { lw: 1.7 });
  };
  legDraw(dims.bx + 4, -sw, true); legDraw(dims.fx + 4, sw, true);
  if (b === 'ours') cel(c, Pth.circle(dims.bx - 9, dims.by - 6, 4.5), col, { lw: 1.8 });
  else if (v.bushy) cel(c, Pth.ellipse(dims.bx - 12, dims.by - 12, 11, 6, -.8), col, { lw: 1.9 });
  else if (b === 'felin') cel(c, cc => { cc.moveTo(dims.bx, dims.by - 2); cc.quadraticCurveTo(dims.bx - 24, dims.by + 4, dims.bx - 22, dims.by - 22 + Math.sin(t / 300) * 3); cc.quadraticCurveTo(dims.bx - 18, dims.by - 6, dims.bx + 2, dims.by - 6); cc.closePath(); }, col, { lw: 1.8 });
  else cel(c, Pth.capsule(dims.bx - 2, dims.by - 4, dims.bx - 14, dims.by - 16 + Math.sin(t / 200) * 2, 3.5, 2.5), col, { lw: 1.8 });
  cel(c, Pth.ellipse(0, dims.by, dims.rx, dims.ry), col, { lw: 2.1 });
  c.save(); c.beginPath(); c.ellipse(0, dims.by, dims.rx, dims.ry, 0, 0, TAU); c.clip();
  c.fillStyle = belly; c.beginPath(); c.ellipse(4, dims.by + dims.ry * .8, dims.rx * .75, dims.ry * .55, 0, 0, TAU); c.fill();
  if (v.stripes) { c.strokeStyle = INK; c.lineWidth = 2; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 9 - 2, dims.by - dims.ry); c.quadraticCurveTo(i * 9 + 3, dims.by - 2, i * 9, dims.by + 3); c.stroke(); } }
  c.restore();
  c.beginPath(); c.ellipse(0, dims.by, dims.rx, dims.ry, 0, 0, TAU); c.lineWidth = 2.1; c.strokeStyle = INK; c.stroke();
  legDraw(dims.bx, sw * .8, false); legDraw(dims.fx, -sw * .8, false);
  c.save(); c.translate(dims.hx, dims.hy);
  if (b === 'ours') { cel(c, Pth.circle(-6, -9, 4.5), col, { lw: 1.8 }); cel(c, Pth.circle(5, -10, 4.5), col, { lw: 1.8 }); }
  else { const ear = (x, h) => cel(c, Pth.poly([x - 3.5, -5, x + .5, -5 - h, x + 4, -4]), col, { lw: 1.8 }); ear(-5, b === 'felin' ? 7 : 10); ear(2, b === 'felin' ? 7 : 10); }
  cel(c, Pth.circle(0, 0, dims.hr), col, { lw: 2 });
  const snL = b === 'felin' ? 5 : b === 'ours' ? 7 : 9;
  cel(c, Pth.ellipse(dims.hr * .7 + snL * .35, 3 + p.jaw * 1.5, snL * .8, 4.2), belly, { lw: 1.7 });
  if (p.jaw > .3) { c.fillStyle = '#5a1f2e'; c.beginPath(); c.ellipse(dims.hr * .7 + snL * .4, 6.5, snL * .5, 2 * p.jaw, 0, 0, TAU); c.fill(); }
  c.fillStyle = INK; c.beginPath(); c.arc(dims.hr * .7 + snL * 1.05, 1.6 + p.jaw, 2, 0, TAU); c.fill();
  const ex = dims.hr * .35, ey = -2.5;
  if (v.expr === 'ko') { c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ex - 2, ey - 2); c.lineTo(ex + 2, ey + 2); c.moveTo(ex + 2, ey - 2); c.lineTo(ex - 2, ey + 2); c.stroke(); }
  else { c.fillStyle = v.bossPet ? v.glowCol : '#ffcf4a'; c.beginPath(); c.ellipse(ex, ey, 2.2, 2.8, 0, 0, TAU); c.fill(); c.fillStyle = INK; c.beginPath(); c.ellipse(ex + .3, ey, .9, 2.2, 0, 0, TAU); c.fill();
    c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ex - 3, ey - 4.5); c.lineTo(ex + 3, ey - 3.2); c.stroke(); }
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
    const cv = it.canvas, dpr = Math.min(2, window.devicePixelRatio || 1);
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
    const rim = RIM; RIM = it.opts.rim || '#c9b8ff';
    drawFighter(c, v, t);
    RIM = rim;
  }
  if (Previews.size) requestAnimationFrame(previewLoop); else attachPreview._running = false;
}
