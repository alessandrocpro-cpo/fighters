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
  idle:    { lean: .06, crouch: 3,  armF: .55, elbF: 1.0, armB: .25, elbB: .9, wpn: .65, head: 0,    fF: 9,  fB: -9,  lF: 0, bodyY: 0,   rot: 0 },
  run:     { lean: .3,  crouch: 5,  armF: .9,  elbF: 1.2, armB: -.4, elbB: 1.2, wpn: .3, head: -.05, fF: 9,  fB: -9,  lF: 0, bodyY: 0,   rot: 0 },
  windup:  { lean: -.2, crouch: 7,  armF: 3.3, elbF: .35, armB: .6,  elbB: .6, wpn: .3,  head: -.05, fF: 13, fB: -12, lF: 0, bodyY: 0,   rot: 0 },
  strike:  { lean: .45, crouch: 10, armF: 1.15, elbF: .05, armB: -.7, elbB: .4, wpn: 1.3, head: .1,  fF: 21, fB: -16, lF: 0, bodyY: 0,   rot: 0 },
  hit:     { lean: -.34, crouch: 4, armF: .2,  elbF: .6,  armB: -.5, elbB: .5, wpn: -.6, head: -.4,  fF: 6,  fB: -14, lF: 0, bodyY: 0,   rot: 0 },
  dodge:   { lean: -.5, crouch: 2,  armF: .5,  elbF: 1.6, armB: 1.0, elbB: 1.4, wpn: -.5, head: -.2, fF: 10, fB: -14, lF: 7, bodyY: -16, rot: 0 },
  block:   { lean: -.08, crouch: 8, armF: 2.0, elbF: 1.5, armB: 1.3, elbB: 1.7, wpn: -1.0, head: -.18, fF: 11, fB: -13, lF: 0, bodyY: 0,  rot: 0 },
  victory: { lean: -.1, crouch: 1,  armF: 3.05, elbF: .15, armB: .35, elbB: .9, wpn: -.5, head: -.22, fF: 9, fB: -9,  lF: 0, bodyY: 0,   rot: 0 },
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

/* --- Héros chibi style « flash » : grosse tête, corps trapu, pieds nus, dégradés doux, trait brun fin --- */
const OUTL = '#3b2216';
const _lt = {}, _dk = {};
const lt = c => _lt[c] || (_lt[c] = mix(c, '#fff3dc', .32));
const dk = c => _dk[c] || (_dk[c] = mix(c, '#2a0f08', .38));
/* Remplissage dégradé (haut-gauche clair -> bas-droite sombre) + trait fin */
function soft(c, path, color, box, lw) {
  const g = c.createLinearGradient(box[0], box[1], box[2], box[3]);
  g.addColorStop(0, lt(color)); g.addColorStop(.45, color); g.addColorStop(1, dk(color));
  c.beginPath(); path(c); c.fillStyle = g; c.fill();
  if (lw !== 0) { c.lineWidth = lw || 1.7; c.strokeStyle = OUTL; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
}
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
const HAIR = {
  /* en bataille : volume, mèches qui tombent sur les yeux (style de la référence) */
  meches: c => {
    c.moveTo(-15, 10); c.lineTo(-22, 6); c.lineTo(-18, 0); c.lineTo(-26, -6); c.lineTo(-19, -11); c.lineTo(-25, -20); c.lineTo(-14, -20);
    c.lineTo(-15, -30); c.lineTo(-5, -24); c.lineTo(0, -32); c.lineTo(5, -24); c.lineTo(14, -29); c.lineTo(13, -20); c.lineTo(22, -19);
    c.lineTo(17, -12); c.lineTo(22, -5); c.lineTo(16, -5); c.lineTo(17, 2); c.lineTo(12, -4); c.lineTo(11, 3); c.lineTo(7, -5);
    c.lineTo(4, 1); c.lineTo(2, -7); c.lineTo(-3, -2); c.lineTo(-5, -9); c.lineTo(-9, 3); c.closePath();
  },
  pics: c => {
    c.moveTo(-15, 8); c.lineTo(-27, 2); c.lineTo(-18, -5); c.lineTo(-30, -15); c.lineTo(-16, -16); c.lineTo(-23, -31);
    c.lineTo(-7, -23); c.lineTo(-4, -38); c.lineTo(4, -24); c.lineTo(15, -35); c.lineTo(13, -21); c.lineTo(25, -19);
    c.lineTo(17, -8); c.lineTo(13, -9); c.lineTo(12, -2); c.lineTo(8, -9); c.lineTo(5, -3); c.lineTo(2, -11); c.lineTo(-2, -5);
    c.quadraticCurveTo(-5, -12, -8, -6); c.quadraticCurveTo(-10, 1, -9, 9); c.closePath();
  },
  court: c => {
    c.moveTo(-15.5, 4); c.bezierCurveTo(-19, -12, -10, -22, 2, -21.5); c.bezierCurveTo(13, -21, 18.5, -13, 17.5, -5);
    c.lineTo(13, -8); c.lineTo(11, -3); c.lineTo(7.5, -9); c.lineTo(4, -5); c.lineTo(0, -10); c.quadraticCurveTo(-7, -8, -9, 5); c.closePath();
  },
  cap: c => {
    c.moveTo(-16, 7); c.bezierCurveTo(-21, -11, -12, -23, 2, -22.5); c.bezierCurveTo(13, -22, 19.5, -14, 18.5, -3);
    c.lineTo(14.5, -6); c.lineTo(14, 2); c.lineTo(9.5, -7); c.lineTo(7, 0); c.lineTo(3.5, -9); c.lineTo(-.5, -4);
    c.quadraticCurveTo(-3, -11, -7, -6); c.quadraticCurveTo(-9.5, 0, -9, 9); c.closePath();
  },
};
const HAIR_BOX = [-28, -36, 22, 12];
function drawHairBack(c, L) {
  if (L.hair === 'longs') soft(c, cc => { cc.moveTo(-6, -20); cc.bezierCurveTo(-28, -18, -27, 16, -20, 36); cc.lineTo(-12, 31); cc.lineTo(-7, 38); cc.lineTo(-3, 22); cc.lineTo(2, 6); cc.closePath(); }, L.hairColor, [-28, -20, 2, 38]);
  if (L.hair === 'queue') soft(c, cc => { cc.moveTo(-10, -18); cc.quadraticCurveTo(-32, -26, -35, 0); cc.quadraticCurveTo(-37, 16, -29, 26); cc.quadraticCurveTo(-29, 10, -23, 1); cc.quadraticCurveTo(-18, -9, -6, -11); cc.closePath(); }, L.hairColor, [-37, -26, -6, 26]);
}
function drawHairFront(c, L) {
  const p = HAIR[L.hair] || HAIR.cap;
  soft(c, p, L.hairColor, HAIR_BOX, 1.8);
  // mèches internes
  c.save(); c.beginPath(); p(c); c.clip();
  c.strokeStyle = dk(L.hairColor); c.lineWidth = 1.1; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-10, -18); c.quadraticCurveTo(-4, -12, -6, -4); c.moveTo(2, -22); c.quadraticCurveTo(6, -14, 4, -6); c.moveTo(11, -18); c.quadraticCurveTo(14, -12, 12, -5); c.stroke();
  c.strokeStyle = lt(L.hairColor); c.lineWidth = 2; c.beginPath(); c.arc(-1, -4, 17, Math.PI * 1.2, Math.PI * 1.42); c.stroke();
  c.restore();
}
function drawFace(c, v, t) {
  const ex = v.expr, iris = L_eyes(v);
  const blink = ((t / 1000 + v.phase) % 4.2) < .12;
  c.lineCap = 'round';
  const eye = (x, w, hgt) => {
    if (ex === 'ko') { c.strokeStyle = OUTL; c.lineWidth = 1.8; c.beginPath(); c.moveTo(x - 2.2, -2); c.lineTo(x + 2.2, 2.5); c.moveTo(x + 2.2, -2); c.lineTo(x - 2.2, 2.5); c.stroke(); return; }
    if (blink || ex === 'hurt' || ex === 'grin') { c.strokeStyle = OUTL; c.lineWidth = 1.9; c.beginPath(); c.moveTo(x - w, 1); c.quadraticCurveTo(x, ex === 'grin' ? -2.5 : ex === 'hurt' ? -1.5 : 2.5, x + w, 1); c.stroke(); return; }
    c.beginPath(); c.ellipse(x, .5, w, hgt, 0, 0, TAU); c.fillStyle = '#fffaf0'; c.fill();
    c.beginPath(); c.ellipse(x + w * .3, .8, w * .62, hgt * .78, 0, 0, TAU); c.fillStyle = iris; c.fill();
    c.beginPath(); c.arc(x + w * .35, .9, w * .3, 0, TAU); c.fillStyle = '#1a0d08'; c.fill();
    c.beginPath(); c.arc(x - w * .1, -.8, .7, 0, TAU); c.fillStyle = '#fff'; c.fill();
    c.beginPath(); c.ellipse(x, .5, w, hgt, 0, Math.PI * 1.05, Math.PI * 1.95); c.lineWidth = 1.7; c.strokeStyle = OUTL; c.stroke();
  };
  eye(5.2, 2.3, 3); eye(11.6, 2.7, 3.3);
  c.strokeStyle = OUTL; c.lineWidth = 1.3; c.beginPath(); c.moveTo(16.4, 3.5); c.lineTo(15.4, 5.5); c.stroke();
  if (ex === 'hurt' || ex === 'ko') { c.beginPath(); c.ellipse(10.5, 10, 1.8, 2.1, 0, 0, TAU); c.fillStyle = '#6b1f1f'; c.fill(); c.lineWidth = 1.3; c.stroke(); }
  else if (ex === 'grin') { c.beginPath(); c.moveTo(7.5, 8.5); c.quadraticCurveTo(11, 13, 14, 8.5); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.3; c.stroke(); }
  else { c.lineWidth = 1.5; c.beginPath(); c.moveTo(9, 10); c.quadraticCurveTo(11, 10.8, 13, 9.6); c.stroke(); }
  c.fillStyle = 'rgba(230,90,70,.22)'; c.beginPath(); c.ellipse(10, 6.5, 2.4, 1.2, 0, 0, TAU); c.fill();
}
const L_eyes = v => v.look.eyes || '#7a4a2a';
function drawHead(c, v, t) {
  const L = v.look;
  soft(c, headPath, L.skin, [-12, -16, 14, 16], 1.8);
  soft(c, Pth.ellipse(-7, 3, 2.8, 4), L.skin, [-10, -1, -4, 7], 1.5);
  drawFace(c, v, t);
  drawHairFront(c, L);
  if (v.boss) {
    soft(c, cc => { cc.moveTo(-16, -6); cc.quadraticCurveTo(-6, -28, 18, -13); cc.lineTo(19, -8); cc.quadraticCurveTo(0, -19, -16, -1); cc.closePath(); }, '#5d6380', [-16, -26, 19, -1]);
    soft(c, cc => { cc.moveTo(-11, -14); cc.quadraticCurveTo(-30, -26, -24, -46); cc.quadraticCurveTo(-20, -30, -5, -21); cc.closePath(); }, '#f2e6c8', [-30, -46, -5, -14]);
    soft(c, cc => { cc.moveTo(6, -19); cc.quadraticCurveTo(11, -38, 30, -43); cc.quadraticCurveTo(18, -32, 15, -16); cc.closePath(); }, '#f2e6c8', [6, -43, 30, -16]);
  }
}

function drawFighter(c, v, t) {
  if (v.kind === 'pet') return drawPet(c, v, t);
  const p = v.pose, L = v.look, bw = BUILD[L.build] || 1;
  const skin = L.skin, cloth = L.outfit, pants = mix(cloth, '#2a0f08', .22), band = mix(cloth, '#2a0f08', .45);
  c.save();
  c.translate(v.x, v.y);
  c.save(); c.scale(v.scale * CH, v.scale * CH); c.globalAlpha = .25 * v.alpha;
  const sh = 1 - Math.min(.5, -p.bodyY / 60);
  c.beginPath(); c.ellipse(p.rot ? -26 : 0, 0, (p.rot ? 46 : 24 * bw) * sh, 6 * sh, 0, 0, TAU); c.fillStyle = '#2a0f08'; c.fill(); c.restore();
  c.scale(v.face * v.scale * CH, v.scale * CH);
  c.globalAlpha = v.alpha;
  if (p.rot) { c.translate(0, -p.rot * 17); c.rotate(p.rot); }
  let bodyY = p.bodyY, fF = p.fF, fB = p.fB, liftF = p.lF, liftB = 0;
  if (v.running) { const s = Math.sin(v.runT), co = Math.cos(v.runT); fF = 4 + s * 14; fB = -4 - s * 14; liftF = Math.max(0, co) * 9; liftB = Math.max(0, -co) * 9; bodyY -= Math.abs(s) * 3; }
  const breathe = Math.sin(t / 300 + v.phase);
  c.translate(0, bodyY);
  const hip = { x: 0, y: -36 + p.crouch + breathe * .3 };
  const hipW = 5.5 * bw;
  const leg = (dx, fx, lift, dark) => {
    const k = ik2(hip.x + dx, hip.y, fx, -4 - lift, 17.5, 16.5);
    const col = dark ? dk(pants) : pants, sk = dark ? dk(skin) : skin;
    soft(c, Pth.capsule(hip.x + dx, hip.y, k.kx, k.ky, 7 * bw, 6 * bw), col, capBox(hip.x + dx, hip.y, k.kx, k.ky, 7));
    // tibia : pantalon roulé puis cheville nue
    const mx = lerp(k.kx, k.fx, .55), my = lerp(k.ky, k.fy, .55);
    soft(c, Pth.capsule(k.kx, k.ky, mx, my, 6.2 * bw, 6.4 * bw), col, capBox(k.kx, k.ky, mx, my, 6));
    soft(c, Pth.capsule(mx, my, k.fx, k.fy, 3.6 * bw, 3.4 * bw), sk, capBox(mx, my, k.fx, k.fy, 4));
    soft(c, Pth.rrect(mx - 6.8 * bw, my - 2, 13.6 * bw, 4, 2), dk(col), [mx - 7, my - 2, mx + 7, my + 2], 1.4);
    // pied nu
    const ax = k.fx, ay = k.fy + 4;
    soft(c, cc => { cc.moveTo(ax - 4.5, ay - 6); cc.quadraticCurveTo(ax + 2, ay - 7, ax + 7, ay - 3.5); cc.quadraticCurveTo(ax + 12, ay - 2.5, ax + 11.5, ay); cc.lineTo(ax - 5, ay); cc.quadraticCurveTo(ax - 6, ay - 3, ax - 4.5, ay - 6); cc.closePath(); }, sk, [ax - 6, ay - 7, ax + 12, ay]);
    c.strokeStyle = OUTL; c.lineWidth = .9; c.beginPath(); c.moveTo(ax + 8, ay - 2.6); c.lineTo(ax + 8.3, ay); c.moveTo(ax + 10, ay - 2); c.lineTo(ax + 10.2, ay); c.stroke();
  };
  const torso = () => { c.translate(hip.x, hip.y); c.rotate(p.lean); };
  const headFrame = () => { c.translate(3, -27); c.rotate(p.head + breathe * .012); c.translate(1, -16); };
  const arm = (sx, a, e, dark, front) => {
    const ux = sx + Math.sin(a) * 14, uy = -22 + Math.cos(a) * 14;
    const fa = a + e, hx = ux + Math.sin(fa) * 13, hy = uy + Math.cos(fa) * 13;
    const sk = dark ? dk(skin) : skin;
    soft(c, Pth.capsule(sx, -22, ux, uy, 5.4 * bw, 4.8 * bw), sk, capBox(sx, -22, ux, uy, 5.5));
    soft(c, Pth.capsule(ux, uy, hx, hy, 4.8 * bw, 4.2 * bw), sk, capBox(ux, uy, hx, hy, 5));
    // bracelet de force
    const bx = lerp(ux, hx, .72), by = lerp(uy, hy, .72);
    c.save(); c.translate(bx, by); c.rotate(Math.atan2(hy - uy, hx - ux));
    soft(c, Pth.rrect(-2.5, -5 * bw, 5, 10 * bw, 1.5), dark ? dk(band) : band, [-2.5, -5, 2.5, 5], 1.3);
    c.restore();
    if (front) {
      c.save(); c.translate(hx, hy);
      c.rotate(Math.atan2(Math.cos(fa), Math.sin(fa)) - Math.PI / 2 + p.wpn);
      drawWeapon(c, v.gear.weapon, v.gear.wRar);
      c.restore();
    }
    soft(c, Pth.circle(hx, hy, (v.gear.weapon === 'poings' && front ? 5.6 : 4.8) * bw), sk, [hx - 5, hy - 5, hx + 5, hy + 5]);
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
  // torse nu (visible dans l'ouverture du gilet)
  soft(c, tPath, skin, TB, 1.8);
  c.strokeStyle = dk(skin); c.lineWidth = 1; c.beginPath(); c.moveTo(1, -20); c.quadraticCurveTo(4, -16, 7, -19); c.moveTo(2, -10); c.lineTo(2.5, -5); c.stroke();
  // gilet ouvert : deux pans
  c.save(); c.beginPath(); tPath(c); c.clip();
  soft(c, cc => { cc.moveTo(-14 * bw, -29); cc.lineTo(-1, -29); cc.lineTo(-3, -12); cc.lineTo(-2, 5); cc.lineTo(-14 * bw, 5); cc.closePath(); }, cloth, TB, 1.6);
  soft(c, cc => { cc.moveTo(14 * bw, -29); cc.lineTo(8 * bw, -29); cc.lineTo(5.5 * bw, -14); cc.lineTo(7 * bw, 5); cc.lineTo(14 * bw, 5); cc.closePath(); }, cloth, TB, 1.6);
  c.restore();
  c.beginPath(); tPath(c); c.lineWidth = 1.8; c.strokeStyle = OUTL; c.stroke();
  drawArmor(c, v, bw, tPath);
  // ceinture + boucle
  soft(c, Pth.rrect(-10.5 * bw, -3.5, 21 * bw, 5.5, 1.5), '#6b3d1f', [-10, -4, 10, 2], 1.5);
  soft(c, Pth.rrect(1.5, -4.5, 5.5, 7, 1.2), '#e9b844', [1, -4, 7, 3], 1.3);
  c.save(); headFrame(); drawHead(c, v, t); c.restore();
  arm(5 * bw, p.armF, p.elbF, false, true);
  c.restore();
  if (v.stun > 0) {
    c.save(); c.translate(0, -112);
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
  c.save(); c.scale(s, s); c.globalAlpha = .28 * v.alpha; c.beginPath(); c.ellipse(0, 0, b === 'ours' ? 32 : 26, 6, 0, 0, TAU); c.fillStyle = INK; c.fill(); c.restore();
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
    drawFighter(c, v, t);
  }
  if (Previews.size) requestAnimationFrame(previewLoop); else attachPreview._running = false;
}
