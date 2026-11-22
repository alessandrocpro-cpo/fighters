/* ===== RENDU : héros chibi gothique (grosse tête, corps trapu) + familiers.
   Ombre violette décalée, contour encre fin, liseré de contre-jour néon (RIM) côté dos. ===== */
const INK = '#1a1024';
let RIM = '#c9b8ff'; // couleur du contre-jour, réglée par l'arène selon le palier
const _rgb = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
function mix(a, b, t) { const A = _rgb(a), B = _rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
const _sc = {};
const shadeOf = c => _sc[c] || (_sc[c] = mix(c, '#170c2a', .42));
const lightOf = c => mix(c, '#ffffff', .4);

/* Aplat + ombre décalée (lumière haut-gauche) + liseré néon côté dos + contour encre */
function cel(c, path, color, o) {
  o = o || {};
  c.beginPath(); path(c); c.fillStyle = o.shade || shadeOf(color); c.fill();
  c.save(); c.beginPath(); path(c); c.clip();
  c.save(); c.translate(o.lx == null ? -1.8 : o.lx, o.ly == null ? -2.4 : o.ly);
  c.beginPath(); path(c); c.fillStyle = color; c.fill(); c.restore();
  if (o.rim !== false && RIM) {
    // bande = forme moins sa copie décalée vers l'avant : il reste un liseré sur le bord arrière
    c.beginPath(); path(c); c.translate(o.rw || 1.6, .5); path(c);
    c.globalAlpha *= .6; c.fillStyle = RIM; c.fill('evenodd');
  }
  c.restore();
  if (o.lw !== 0) { c.beginPath(); path(c); c.lineWidth = o.lw || 2; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
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

const CH = 1.05;      // échelle globale du héros dans l'arène
const HERO_H = 119;   // hauteur pieds -> haut des cheveux, avant échelle
const HS = 1.25;      // taille de la tête (chibi)
const BUILD = { fin: .9, normal: 1, massif: 1.16 };
const POSES = {
  idle:    { lean: .05, crouch: 4,  armF: .5,  elbF: 1.1, armB: .25, elbB: .9, wpn: .6,  head: 0,    fF: 13, fB: -12, lF: 0,  bodyY: 0,   rot: 0 },
  run:     { lean: .32, crouch: 8,  armF: .9,  elbF: 1.3, armB: -.5, elbB: 1.3, wpn: .3, head: -.08, fF: 13, fB: -12, lF: 0,  bodyY: 0,   rot: 0 },
  windup:  { lean: -.2, crouch: 10, armF: 3.4, elbF: .35,  armB: .6,  elbB: .6, wpn: .3,  head: -.05, fF: 18, fB: -16, lF: 0,  bodyY: 0,   rot: 0 },
  strike:  { lean: .45, crouch: 15, armF: 1.15, elbF: .05, armB: -.7, elbB: .4, wpn: 1.3, head: .1,  fF: 30, fB: -22, lF: 0,  bodyY: 0,   rot: 0 },
  hit:     { lean: -.32, crouch: 6, armF: .2,  elbF: .6,  armB: -.5, elbB: .5, wpn: -.6, head: -.4,  fF: 9,  fB: -20, lF: 0,  bodyY: 0,   rot: 0 },
  dodge:   { lean: -.5, crouch: 3,  armF: .5,  elbF: 1.6, armB: 1.0, elbB: 1.4, wpn: -.5, head: -.2, fF: 14, fB: -20, lF: 10, bodyY: -22, rot: 0 },
  block:   { lean: -.08, crouch: 12, armF: 2.0, elbF: 1.5, armB: 1.3, elbB: 1.7, wpn: -1.0, head: -.18, fF: 16, fB: -18, lF: 0, bodyY: 0,  rot: 0 },
  victory: { lean: -.1, crouch: 2,  armF: 3.05, elbF: .15, armB: .35, elbB: .9, wpn: -.5, head: -.22, fF: 13, fB: -12, lF: 0, bodyY: 0,  rot: 0 },
  ko:      { lean: -.1, crouch: -2, armF: .9,  elbF: .3,  armB: 1.6, elbB: .2, wpn: .4,  head: -.3,  fF: 14, fB: -2,  lF: 0,  bodyY: 0,   rot: -1.5 },
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
const STEEL = '#c9d2e6', WOOD = '#6a3f2a', GOLD = '#e8b54a';
function drawWeapon(c, kind, rar) {
  const blade = path => {
    if (rar >= 2) { c.save(); c.shadowColor = RARITIES[rar].color; c.shadowBlur = 12; c.beginPath(); path(c); c.fillStyle = RARITIES[rar].color; c.fill(); c.restore(); }
    cel(c, path, rar === 3 ? '#ffe9a8' : STEEL, { lw: 1.8, lx: -1, ly: -1.4 });
  };
  if (kind === 'epee') {
    cel(c, Pth.rrect(-8, -2.2, 10, 4.4, 2), WOOD, { lw: 1.8 });
    cel(c, Pth.circle(-9, 0, 2.8), GOLD, { lw: 1.8 });
    blade(Pth.poly([4, -3.2, 33, -3.2, 40, 0, 33, 3.2, 4, 3.2]));
    c.strokeStyle = '#ffffff'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(7, -1.1); c.lineTo(31, -1.1); c.stroke();
    cel(c, Pth.rrect(1, -7, 4, 14, 1.5), GOLD, { lw: 1.8 });
  } else if (kind === 'dague') {
    cel(c, Pth.rrect(-6, -2, 8, 4, 2), WOOD, { lw: 1.8 });
    blade(Pth.poly([3, -2.8, 18, -2.4, 24, 0, 18, 2.4, 3, 2.8]));
    cel(c, Pth.rrect(1, -5, 3, 10, 1.2), GOLD, { lw: 1.8 });
  } else if (kind === 'hache') {
    cel(c, Pth.capsule(-9, 0, 32, 0, 2.4, 2.4), WOOD, { lw: 1.8 });
    blade(c => { c.moveTo(21, -2); c.lineTo(19, -10); c.quadraticCurveTo(27, -22, 37, -15); c.quadraticCurveTo(31, -8, 33, -1); c.closePath(); });
    cel(c, Pth.rrect(18, -3.5, 5, 7, 1.2), '#5a5560', { lw: 1.6 });
  } else if (kind === 'marteau') {
    cel(c, Pth.capsule(-9, 0, 30, 0, 2.4, 2.4), WOOD, { lw: 1.8 });
    blade(Pth.rrect(23, -11, 13, 22, 3));
    c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.moveTo(23, -4); c.lineTo(36, -4); c.moveTo(23, 4); c.lineTo(36, 4); c.stroke();
  } else if (kind === 'lance') {
    cel(c, Pth.capsule(-24, 0, 46, 0, 1.9, 1.9), WOOD, { lw: 1.8 });
    blade(Pth.poly([44, 0, 50, -4.5, 61, 0, 50, 4.5]));
    cel(c, Pth.poly([41, -1, 44, 7, 38, 9]), '#ffb994', { lw: 1.4 });
  }
}

/* --- Tête (repère : centre de la tête, visage vers +x) --- */
function headPath(c) {
  c.moveTo(-12.5, 3);
  c.bezierCurveTo(-15, -9, -9, -17.5, 1, -17.5);
  c.bezierCurveTo(10, -17.5, 15, -11, 14.6, -1);
  c.lineTo(13.8, 6);
  c.quadraticCurveTo(11.5, 13, 6.5, 15.8);
  c.quadraticCurveTo(0, 14.5, -5, 10.5);
  c.quadraticCurveTo(-10.5, 8, -12.5, 3);
  c.closePath();
}
const HAIR = {
  cap: c => {
    c.moveTo(-14.5, 6);
    c.bezierCurveTo(-19, -10, -11, -21.5, 2, -21);
    c.bezierCurveTo(12, -20.5, 17.5, -13, 16.5, -3);
    c.lineTo(13, -6); c.lineTo(12.5, 1); c.lineTo(8.5, -7); c.lineTo(6.5, -1); c.lineTo(3.5, -9); c.lineTo(-.5, -4);
    c.quadraticCurveTo(-3, -10, -7, -6); c.quadraticCurveTo(-9, 0, -8.5, 8);
    c.closePath();
  },
  pics: c => {
    c.moveTo(-14, 7); c.lineTo(-25, 0); c.lineTo(-16, -6); c.lineTo(-27, -15); c.lineTo(-14, -15); c.lineTo(-21, -29);
    c.lineTo(-6, -21); c.lineTo(-4, -35); c.lineTo(4, -22); c.lineTo(14, -32); c.lineTo(12, -19); c.lineTo(23, -17);
    c.lineTo(16.5, -6); c.lineTo(13, -6); c.lineTo(12.5, 1); c.lineTo(8.5, -7); c.lineTo(6.5, -1); c.lineTo(3.5, -9); c.lineTo(-.5, -4);
    c.quadraticCurveTo(-3, -10, -7, -6); c.quadraticCurveTo(-9, 0, -8.5, 8); c.closePath();
  },
  meches: c => {
    c.moveTo(-15, 12);
    c.bezierCurveTo(-21, -8, -12, -22, 2, -21.5);
    c.bezierCurveTo(14, -21, 19, -12, 17, 2);
    c.lineTo(14, -3); c.quadraticCurveTo(10, 2, 9, 8); c.quadraticCurveTo(7, -2, 2, -6);
    c.quadraticCurveTo(-1, -2, -2, 3); c.quadraticCurveTo(-4, -6, -7, -6);
    c.quadraticCurveTo(-9, 3, -8, 12); c.closePath();
  },
  court: c => {
    c.moveTo(-13.5, 4);
    c.bezierCurveTo(-17, -10, -10, -20, 2, -19.5);
    c.bezierCurveTo(12, -19, 16.5, -12, 15.5, -5);
    c.lineTo(11.5, -7); c.lineTo(9.5, -3); c.lineTo(6.5, -8); c.lineTo(3, -5); c.lineTo(-1, -9);
    c.quadraticCurveTo(-7, -7, -8, 4); c.closePath();
  },
  /* crête : bande de pointes sur le sommet, côtés rasés */
  crete: c => {
    c.moveTo(-12, -6); c.lineTo(-20, -14); c.lineTo(-10, -15); c.lineTo(-14, -26); c.lineTo(-3, -19); c.lineTo(-1, -32);
    c.lineTo(5, -20); c.lineTo(13, -28); c.lineTo(11, -16); c.lineTo(17, -12); c.lineTo(10, -11);
    c.quadraticCurveTo(2, -16, -6, -12); c.closePath();
  },
};
function drawHairBack(c, L) {
  if (L.hair === 'longs') cel(c, cc => { cc.moveTo(-6, -18); cc.bezierCurveTo(-26, -16, -24, 22, -18, 46); cc.lineTo(-10, 40); cc.lineTo(-6, 48); cc.lineTo(-2, 30); cc.lineTo(2, 8); cc.closePath(); }, L.hairColor);
  if (L.hair === 'queue') cel(c, cc => { cc.moveTo(-10, -16); cc.quadraticCurveTo(-30, -24, -34, 2); cc.quadraticCurveTo(-36, 18, -28, 30); cc.quadraticCurveTo(-28, 12, -22, 2); cc.quadraticCurveTo(-18, -8, -6, -10); cc.closePath(); }, L.hairColor);
  if (L.hair === 'tresse') {
    // une seule natte qui tombe dans le dos, maillons tressés
    for (let i = 0; i < 7; i++) { const y = 4 + i * 6.4, x = -15 - Math.sin(i * .5) * 2.5 - i * .5; cel(c, Pth.ellipse(x, y, 5.2 - i * .3, 4.4, i % 2 ? .5 : -.5), L.hairColor, { lw: 1.6 }); }
    cel(c, Pth.rrect(-21, 47, 8, 4, 1.5), '#ffb994', { lw: 1.4 });
    cel(c, cc => { cc.moveTo(-19, 51); cc.lineTo(-23, 60); cc.lineTo(-17, 56); cc.lineTo(-13, 61); cc.lineTo(-14, 51); cc.closePath(); }, L.hairColor, { lw: 1.4 });
  }
}
function drawHairFront(c, L) {
  if (L.hair === 'crete') {
    // côtés rasés : ombre courte sur le crâne
    c.save(); c.beginPath(); headPath(c); c.clip();
    c.fillStyle = mix(L.hairColor, L.skin, .55); c.globalAlpha = .7;
    c.beginPath(); c.moveTo(-15, 4); c.bezierCurveTo(-17, -12, -8, -19, 3, -19); c.bezierCurveTo(12, -19, 16, -12, 15.5, -6); c.lineTo(11, -9); c.quadraticCurveTo(0, -14, -9, 6); c.closePath(); c.fill();
    c.restore();
  }
  const p = L.hair === 'pics' ? HAIR.pics : L.hair === 'meches' || L.hair === 'tresse' ? HAIR.meches : L.hair === 'court' ? HAIR.court : L.hair === 'crete' ? HAIR.crete : HAIR.cap;
  cel(c, p, L.hairColor, { lw: 1.9 });
  c.save(); c.beginPath(); p(c); c.clip();
  c.strokeStyle = lightOf(L.hairColor); c.lineWidth = 1.8; c.lineCap = 'round'; c.globalAlpha = .85;
  c.beginPath(); c.arc(1, -2, 15.5, Math.PI * 1.15, Math.PI * 1.45); c.stroke();
  c.beginPath(); c.arc(1, -2, 15.5, Math.PI * 1.55, Math.PI * 1.68); c.stroke();
  c.restore();
}
function drawFace(c, v, t) {
  const L = v.look, ex = v.expr, iris = L.eyes || '#3dc8ff', EY = 2.2;
  const blink = ((t / 1000 + v.phase) % 4.2) < .12;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.save(); c.translate(0, EY);
  const eye = (x, w, hgt) => {
    if (ex === 'ko') { c.strokeStyle = INK; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x - 2.5, -3); c.lineTo(x + 2.5, 2); c.moveTo(x + 2.5, -3); c.lineTo(x - 2.5, 2); c.stroke(); return; }
    if (blink || ex === 'hurt') { c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.moveTo(x - w, 0); c.quadraticCurveTo(x, ex === 'hurt' ? -3 : 2, x + w, 0); c.stroke(); return; }
    if (ex === 'grin') { c.strokeStyle = INK; c.lineWidth = 2.2; c.beginPath(); c.moveTo(x - w, 1); c.quadraticCurveTo(x, -4, x + w, 1); c.stroke(); return; }
    c.beginPath(); c.ellipse(x, 0, w, hgt, 0, 0, TAU); c.fillStyle = '#f7f2ff'; c.fill();
    c.save(); c.beginPath(); c.ellipse(x, 0, w, hgt, 0, 0, TAU); c.clip();
    c.beginPath(); c.ellipse(x + w * .2, .6, w * .84, hgt * .88, 0, 0, TAU); c.fillStyle = iris; c.fill();
    c.beginPath(); c.ellipse(x + w * .2, -hgt * .45, w * .9, hgt * .4, 0, 0, TAU); c.fillStyle = shadeOf(iris); c.fill();
    c.beginPath(); c.ellipse(x + w * .26, .8, w * .36, hgt * .46, 0, 0, TAU); c.fillStyle = INK; c.fill();
    c.restore();
    c.beginPath(); c.arc(x - w * .15, -hgt * .3, 1.3, 0, TAU); c.fillStyle = '#fff'; c.fill();
    c.beginPath(); c.arc(x + w * .5, hgt * .45, .6, 0, TAU); c.fill();
    // paupière haute épaisse, en biais : regard déterminé
    c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x - w - .6, -hgt * .35); c.quadraticCurveTo(x - w * .2, -hgt * 1.05, x + w + .8, -hgt * .7); c.lineTo(x + w + 2, -hgt * 1.05); c.stroke();
    c.lineWidth = .9; c.beginPath(); c.moveTo(x - w * .6, hgt - .3); c.lineTo(x + w * .7, hgt - .6); c.stroke();
  };
  eye(1.4, 3.1, 5.2); eye(9, 3.9, 5.8);
  c.restore();
  c.strokeStyle = INK; c.lineWidth = 1.2; c.beginPath(); c.moveTo(14.4, 4.2); c.lineTo(13.4, 6); c.stroke();
  if (ex === 'hurt' || ex === 'ko') { c.beginPath(); c.ellipse(9.5, 11, 1.8, 2.2, 0, 0, TAU); c.fillStyle = '#5a1f2e'; c.fill(); c.lineWidth = 1.2; c.stroke(); }
  else if (ex === 'grin') { c.beginPath(); c.moveTo(6.8, 9.8); c.quadraticCurveTo(10, 13.4, 12.8, 9.4); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.2; c.stroke(); }
  else { c.lineWidth = 1.3; c.beginPath(); c.moveTo(7.8, 11.4); c.quadraticCurveTo(9.8, 10.8, 11.6, 11.6); c.stroke(); }
  c.fillStyle = 'rgba(255,90,140,.2)'; c.beginPath(); c.ellipse(10.5, 7.6, 2.4, 1.1, 0, 0, TAU); c.fill();
}
/* Sourcils froncés en V, dessinés par-dessus la frange (convention manga) */
function drawBrows(c, v) {
  const ex = v.expr; if (ex === 'ko') return;
  const calm = ex === 'grin' ? 1 : 0;
  c.strokeStyle = INK; c.lineWidth = 2.1; c.lineCap = 'round'; c.beginPath();
  c.moveTo(-1.8, -6.4 + calm); c.lineTo(4.2, -3.6 - calm * .6);
  c.moveTo(6.4, -3.8 - calm * .6); c.lineTo(13.2, -6.8 + calm); c.stroke();
}
function drawHead(c, v, t) {
  const L = v.look;
  cel(c, headPath, L.skin, { lw: 1.9 });
  cel(c, Pth.ellipse(-7.5, 2, 2.4, 3.6), L.skin, { lw: 1.5 });
  drawFace(c, v, t);
  drawHairFront(c, L);
  drawBrows(c, v);
  if (v.boss) {
    // casque de fer noirci à cornes d'os
    cel(c, cc => { cc.moveTo(-14, -6); cc.quadraticCurveTo(-6, -26, 16, -12); cc.lineTo(17, -7); cc.quadraticCurveTo(0, -17, -14, -1); cc.closePath(); }, '#3a3446', { lw: 1.8 });
    cel(c, cc => { cc.moveTo(-10, -13); cc.quadraticCurveTo(-28, -24, -22, -44); cc.quadraticCurveTo(-18, -28, -4, -19); cc.closePath(); }, '#e6d6c0', { lw: 1.8 });
    cel(c, cc => { cc.moveTo(6, -17); cc.quadraticCurveTo(10, -36, 28, -41); cc.quadraticCurveTo(17, -30, 14, -14); cc.closePath(); }, '#e6d6c0', { lw: 1.8 });
  }
}

function drawFighter(c, v, t) {
  if (v.kind === 'pet') return drawPet(c, v, t);
  const p = v.pose, L = v.look, bw = BUILD[L.build] || 1;
  const skin = L.skin, cloth = L.outfit, pants = mix(cloth, '#15101f', .55), vest = mix(cloth, '#120a18', .45);
  const boot = '#3a2a2a', leather = '#4a3026', wrap = '#d8cbb8', metal = '#b89a5a';
  c.save();
  c.translate(v.x, v.y);
  c.save(); c.scale(v.scale * CH, v.scale * CH); c.globalAlpha = .4 * v.alpha;
  const sh = 1 - Math.min(.5, -p.bodyY / 80);
  c.beginPath(); c.ellipse(p.rot ? -30 : 0, 0, (p.rot ? 58 : 26 * bw) * sh, 6.5 * sh, 0, 0, TAU); c.fillStyle = '#0a0612'; c.fill(); c.restore();
  c.scale(v.face * v.scale * CH, v.scale * CH);
  c.globalAlpha = v.alpha;
  if (p.rot) { c.translate(0, -p.rot * 16); c.rotate(p.rot); }
  let bodyY = p.bodyY * .7, fF = p.fF * .62, fB = p.fB * .62, liftF = p.lF * .6, liftB = 0;
  if (v.running) {
    const s = Math.sin(v.runT), co = Math.cos(v.runT);
    fF = 3 + s * 13; fB = -3 - s * 13; liftF = Math.max(0, co) * 8; liftB = Math.max(0, -co) * 8; bodyY -= Math.abs(s) * 3;
  }
  const breathe = Math.sin(t / 300 + v.phase);
  c.translate(0, bodyY);
  const hip = { x: 0, y: -42 + p.crouch * .55 + breathe * .3 };
  const hipW = 6.5 * bw;
  const leg = (dx, fx, lift, dark) => {
    const k = ik2(hip.x + dx, hip.y, fx, -7 - lift, 19, 18);
    const col = dark ? shadeOf(pants) : pants;
    cel(c, Pth.capsule(hip.x + dx, hip.y, k.kx, k.ky, 7.4 * bw, 6.2 * bw), col);
    cel(c, Pth.capsule(k.kx, k.ky, k.fx, k.fy, 6.2 * bw, 5.4 * bw), col);
    const ax = k.fx, ay = k.fy + 7, bc = dark ? shadeOf(boot) : boot;
    cel(c, cc => { cc.moveTo(ax - 6.5, ay - 12); cc.lineTo(ax + 5, ay - 12); cc.quadraticCurveTo(ax + 8, ay - 6, ax + 13, ay - 4.5); cc.quadraticCurveTo(ax + 16.5, ay - 3, ax + 15.5, ay); cc.lineTo(ax - 7.5, ay); cc.closePath(); }, bc);
    cel(c, Pth.rrect(ax - 8, ay - 2.6, 24.5, 3.6, 1.2), '#1a1216', { lw: 1.4, rim: false });
    cel(c, Pth.rrect(ax - 7.5, ay - 14.5, 13.5, 4.4, 1.5), dark ? shadeOf(leather) : leather, { lw: 1.5 });
  };
  const torso = () => { c.translate(hip.x, hip.y); c.rotate(p.lean); };
  const headFrame = () => { c.translate(2.5, -31); c.rotate(p.head + breathe * .012); c.translate(2, -15.8 * HS); c.scale(HS, HS); };
  const arm = (sx, a, e, dark, front) => {
    const sy = -27, ux = sx + Math.sin(a) * 14, uy = sy + Math.cos(a) * 14;
    const fa = a + e;
    const hx = ux + Math.sin(fa) * 13, hy = uy + Math.cos(fa) * 13;
    const sk = dark ? shadeOf(skin) : skin;
    cel(c, Pth.capsule(ux, uy, hx, hy, 4.9 * bw, 4.4 * bw), sk);
    // bandages d'avant-bras
    const wx = lerp(ux, hx, .55), wy = lerp(uy, hy, .55);
    cel(c, Pth.capsule(wx, wy, hx, hy, 5 * bw, 4.6 * bw), dark ? shadeOf(wrap) : wrap, { lw: 1.6 });
    c.strokeStyle = 'rgba(26,16,36,.45)'; c.lineWidth = .9; c.beginPath(); c.moveTo(lerp(wx, hx, .35) - 3, lerp(wy, hy, .35) + 2); c.lineTo(lerp(wx, hx, .35) + 3, lerp(wy, hy, .35) - 2); c.stroke();
    cel(c, Pth.capsule(sx, sy, ux, uy, 5.6 * bw, 5 * bw), sk);
    if (front) {
      c.save(); c.translate(hx, hy);
      c.rotate(Math.atan2(Math.cos(fa), Math.sin(fa)) - Math.PI / 2 + p.wpn);
      c.scale(1.12, 1.12);
      drawWeapon(c, v.gear.weapon, v.gear.wRar);
      c.restore();
    }
    // poing ganté (mitaines de cuir)
    const fr = (v.gear.weapon === 'poings' && front ? 6.6 : 5.6) * bw;
    cel(c, Pth.circle(hx, hy, fr), dark ? shadeOf('#3a2a30') : '#3a2a30', { lw: 1.8 });
    c.fillStyle = sk; c.beginPath(); c.ellipse(hx + fr * .35, hy - fr * .35, fr * .45, fr * .3, -.6, 0, TAU); c.fill();
    if (front && v.gear.armor === 'plaques') { const pa = cc => { cc.arc(sx + 1, sy + 1, 9.5 * bw, Math.PI * 1.02, Math.PI * 2.1); cc.closePath(); }; cel(c, pa, STEEL); trim(c, pa, v.gear.aRar); }
    if (front && v.gear.armor === 'cuir') cel(c, Pth.ellipse(sx + 1, sy - 1, 7.5 * bw, 5, -.2), '#6a4028');
  };

  c.save(); torso(); headFrame(); drawHairBack(c, L); c.restore();
  c.save(); torso(); arm(-6 * bw, p.armB, p.elbB, true, false); c.restore();
  leg(-hipW * .6, fB, liftB, true);
  leg(hipW * .6, fF, liftF, false);
  c.save(); torso();
  cel(c, Pth.ellipse(0, 1, 10 * bw, 7), pants);
  const tPath = cc => { cc.moveTo(-8.5 * bw, 3); cc.lineTo(8.5 * bw, 3); cc.quadraticCurveTo(11.5 * bw, -16, 10 * bw, -26); cc.quadraticCurveTo(9 * bw, -31, 3 * bw, -31); cc.lineTo(-5 * bw, -31); cc.quadraticCurveTo(-12 * bw, -30.5, -11.5 * bw, -23); cc.quadraticCurveTo(-11 * bw, -11, -8.5 * bw, 3); cc.closePath(); };
  cel(c, Pth.capsule(2, -29, 3, -36, 3.8, 3.6), skin, { lw: 1.8 });
  cel(c, tPath, cloth, { lw: 2.1 });
  // encolure, veste ouverte, sangle
  cel(c, Pth.poly([-2.5, -31.2, 5.5 * bw, -31.2, 2, -24]), skin, { lw: 1.5 });
  cel(c, cc => { cc.moveTo(-5 * bw, -31.5); cc.lineTo(-1, -31.5); cc.lineTo(1.5, -14); cc.lineTo(-1.5, 3); cc.lineTo(-8.5 * bw, 3); cc.quadraticCurveTo(-11 * bw, -11, -11.5 * bw, -23); cc.quadraticCurveTo(-12 * bw, -30.5, -5 * bw, -31.5); cc.closePath(); }, vest, { lw: 1.8 });
  cel(c, Pth.poly([-6 * bw, -32.5, -1, -32.5, -3, -36, -8.5 * bw, -34]), vest, { lw: 1.5 });
  cel(c, Pth.poly([-7 * bw, -29, -4 * bw, -30, 9 * bw, -2, 6 * bw, 0]), leather, { lw: 1.4 });
  c.strokeStyle = shadeOf(cloth); c.lineWidth = 1.2; c.beginPath(); c.moveTo(1 * bw, -18); c.quadraticCurveTo(5, -15, 8 * bw, -18); c.stroke();
  drawArmor(c, v, bw, tPath);
  cel(c, Pth.rrect(-9.6 * bw, -3.2, 19.2 * bw, 5.4, 1.5), leather, { lw: 1.6 });
  cel(c, Pth.rrect(2, -3.8, 5, 6.6, 1), metal, { lw: 1.4 });
  cel(c, Pth.rrect(-9.5 * bw, -1, 6.5, 8, 1.6), mix(leather, '#000000', .15), { lw: 1.4 });
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
    cel(c, Pth.poly([-11 * bw, -27, -6 * bw, -31, 10 * bw, -4, 5 * bw, 1]), '#6a4028', { lw: 1.6 });
  } else if (k === 'maille') {
    c.save(); c.beginPath(); tPath(c); c.clip();
    cel(c, Pth.rrect(-13 * bw, -27, 26 * bw, 28, 3), '#8a93a8', { lw: 1.6 });
    c.strokeStyle = 'rgba(26,16,36,.4)'; c.lineWidth = .9;
    for (let y = -24; y < 0; y += 3.6) { c.beginPath(); for (let x = -13 * bw; x < 13 * bw; x += 3.6) { c.moveTo(x, y); c.arc(x + 1.8, y, 1.8, Math.PI, 0, true); } c.stroke(); }
    c.restore();
    trim(c, cc => { cc.moveTo(-12 * bw, -26.5); cc.lineTo(11 * bw, -26.5); }, v.gear.aRar);
  } else if (k === 'plaques') {
    const pp = cc => { cc.moveTo(-10.5 * bw, -30); cc.lineTo(10.5 * bw, -30); cc.quadraticCurveTo(13 * bw, -12, 6 * bw, -4); cc.lineTo(-7 * bw, -4); cc.quadraticCurveTo(-13 * bw, -14, -10.5 * bw, -30); cc.closePath(); };
    cel(c, pp, STEEL, { lw: 2 });
    c.strokeStyle = 'rgba(26,16,36,.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -29); c.lineTo(0, -6); c.stroke();
    trim(c, pp, v.gear.aRar);
  }
}
function star(c, x, y, r, col) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 1.3; c.strokeStyle = INK; c.stroke();
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
  c.save(); c.scale(s, s); c.globalAlpha = .4 * v.alpha; c.beginPath(); c.ellipse(0, 0, b === 'ours' ? 32 : 26, 6, 0, 0, TAU); c.fillStyle = '#0a0612'; c.fill(); c.restore();
  c.scale(v.face * s, s); c.globalAlpha = v.alpha;
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
