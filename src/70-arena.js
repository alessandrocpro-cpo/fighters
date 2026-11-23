/* ===== ARÈNE : un monde gothique par palier, effets, lecteur de combat interactif ===== */
const AW = 400, AH = 280, GROUND = 238, EXT = 440, BOT = 300, FLOOR_BACK = 192, LEDGE = 292;
const tierIdx = floor => Math.min(TIERS.length - 1, Math.floor((floor - 1) / 10));
const tierOf = floor => TIERS[tierIdx(floor)];

/* ---------- Briques de décor ---------- */
function archPath(c, x, y, w, h) { c.moveTo(x, y + h); c.lineTo(x, y + w * .65); c.quadraticCurveTo(x + w * .02, y + w * .08, x + w / 2, y); c.quadraticCurveTo(x + w * .98, y + w * .08, x + w, y + w * .65); c.lineTo(x + w, y + h); c.closePath(); }
function glowFill(c, col, blur, alpha) { c.save(); c.shadowColor = col; c.shadowBlur = blur; c.globalAlpha = alpha == null ? 1 : alpha; c.fillStyle = col; c.fill(); c.restore(); }
function rimStrip(c, x, y, w, h, col, a) { c.save(); c.globalAlpha = a || .55; c.fillStyle = col; c.fillRect(x, y, 1.6, h); c.fillRect(x + w - 1.6, y, 1.6, h); c.restore(); }
function cloudBank(c, x, y, w, h, col, lit, r, n) {
  for (let i = 0; i < (n || 14); i++) {
    const px = x + r.range(-w / 2, w / 2), k = 1 - Math.abs(px - x) / (w / 2), py = y + r.range(-h * .3, h * .3) - k * h * .25, pr = r.range(.35, .7) * h * (.6 + k * .5);
    const g = c.createLinearGradient(0, py - pr, 0, py + pr); g.addColorStop(0, lit); g.addColorStop(.55, col); g.addColorStop(1, mix(col, '#000000', .2));
    c.globalAlpha = r.range(.55, .85); c.fillStyle = g; c.beginPath(); c.ellipse(px, py, pr * 1.6, pr, 0, 0, TAU); c.fill();
  }
  c.globalAlpha = 1;
}
function tower(c, x, base, w, h, o) {
  const top = base - h;
  c.fillStyle = o.col; c.fillRect(x, top, w, h);
  c.beginPath();
  if (o.roof === 'spire') { c.moveTo(x - 2, top); c.lineTo(x + w / 2, top - w * (o.tall || 2)); c.lineTo(x + w + 2, top); }
  else if (o.roof === 'dome') { c.moveTo(x, top); c.quadraticCurveTo(x + w / 2, top - w * .9, x + w, top); }
  else if (o.roof === 'peak') { c.moveTo(x - 2, top); c.lineTo(x + w / 2, top - w * .55); c.lineTo(x + w + 2, top); }
  c.closePath(); c.fill();
  if (o.roof === 'spire') for (const px of [x - 1, x + w - 3]) { c.beginPath(); c.moveTo(px, top); c.lineTo(px + 2, top - 12); c.lineTo(px + 4, top); c.closePath(); c.fill(); }
  if (o.win) {
    const ww = Math.max(3, w * .22), rows = Math.max(1, Math.floor(h / 46));
    for (let j = 0; j < rows; j++) for (const fx of (w > 30 ? [.22, .78] : [.5])) {
      const wx = x + w * fx - ww / 2, wy = top + 14 + j * 46;
      if (wy + ww * 2.6 > base - 6) continue;
      c.beginPath(); archPath(c, wx, wy, ww, ww * 2.6); glowFill(c, o.win, 8, .85);
    }
  }
  if (o.lit) rimStrip(c, x, top, w, h, o.lit, .45);
}
function bridge(c, y, x0, x1, H, col, lit, span) {
  c.beginPath(); c.rect(x0, y, x1 - x0, H);
  for (let x = x0 + 4; x + span < x1 + span; x += span) archPath(c, x + 5, y + 14, span - 10, H);
  c.fillStyle = col; c.fill('evenodd');
  c.fillStyle = col; c.fillRect(x0, y - 7, x1 - x0, 4);
  for (let x = x0; x < x1; x += 9) c.fillRect(x, y - 7, 3, 7);
  c.save(); c.globalAlpha = .55; c.fillStyle = lit; c.fillRect(x0, y - 7, x1 - x0, 1.2); c.restore();
}
function lattice(c, x, base, w, h, col, lw) {
  c.strokeStyle = col; c.lineWidth = lw || 1.6; c.beginPath();
  c.moveTo(x, base); c.lineTo(x, base - h); c.moveTo(x + w, base); c.lineTo(x + w, base - h);
  for (let y = base; y > base - h + 1; y -= w * 1.2) { c.moveTo(x, y); c.lineTo(x + w, y - w * 1.2); c.moveTo(x + w, y); c.lineTo(x, y - w * 1.2); c.moveTo(x, y); c.lineTo(x + w, y); }
  c.stroke();
}
function gear(c, x, y, R, teeth, col) {
  c.beginPath();
  for (let i = 0; i < teeth * 2; i++) { const a = i * Math.PI / teeth, rr = i % 2 ? R * .82 : R; c.lineTo(x + Math.cos(a - .12) * rr, y + Math.sin(a - .12) * rr); c.lineTo(x + Math.cos(a + .12) * rr, y + Math.sin(a + .12) * rr); }
  c.closePath(); c.moveTo(x + R * .35, y); c.arc(x, y, R * .35, 0, TAU, true);
  c.fillStyle = col; c.fill('evenodd');
}
function skyline(c, T, base, col, maxH, r, win, density) {
  let x = -10;
  while (x < AW + 10) {
    const w = r.range(12, 30), h = r.range(.25, 1) * maxH, kind = r();
    tower(c, x, base, w, h, { col, roof: kind < .35 ? 'spire' : kind < .6 ? 'peak' : kind < .75 ? 'dome' : null, tall: r.range(1.2, 2.4) });
    if (win) for (let i = 0; i < h / 14; i++) if (r() < .3) { c.fillStyle = win; c.globalAlpha = r.range(.3, .8); c.fillRect(x + r.range(3, w - 5), base - r.range(6, h - 6), 2, 2.6); }
    c.globalAlpha = 1;
    x += w * (density || .8);
  }
}
function fogBand(c, y, h, col, a) {
  const g = c.createLinearGradient(0, y - h, 0, y + h * .4); g.addColorStop(0, col + '00'); g.addColorStop(.7, col); g.addColorStop(1, col + '00');
  c.save(); c.globalAlpha = a; c.fillStyle = g; c.fillRect(0, y - h, AW, h * 1.4); c.restore();
}

/* ---------- Monuments (un par palier) ---------- */
const LANDMARKS = {
  cathedral(c, T, r) {
    const far = mix(T.far, T.sky[1], .3), col = mix(T.mid, T.far, .2);
    tower(c, 120, 150, 24, 220, { col: far, roof: 'spire', tall: 2.6 });
    tower(c, 352, 150, 22, 190, { col: far, roof: 'spire', tall: 2.4 });
    bridge(c, 40, -10, AW + 10, 70, mix(T.far, T.mid, .45), T.rim, 46);
    c.fillStyle = col; c.fillRect(196, 0, 150, 160);
    c.beginPath(); c.moveTo(192, 0); c.lineTo(271, -60); c.lineTo(350, 0); c.closePath(); c.fill();
    tower(c, 186, 160, 34, 260, { col, roof: 'spire', tall: 2.2, win: T.glow, lit: T.rim });
    tower(c, 318, 160, 34, 290, { col, roof: 'spire', tall: 2.2, win: T.glow, lit: T.rim });
    tower(c, 248, 160, 46, 390, { col, roof: 'spire', tall: 2.6, win: T.glow, lit: T.rim });
    c.beginPath(); c.arc(271, 70, 20, 0, TAU); glowFill(c, T.glow, 18, .9);
    c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; c.moveTo(271, 70); c.lineTo(271 + Math.cos(a) * 20, 70 + Math.sin(a) * 20); } c.stroke();
    c.beginPath(); c.arc(271, 70, 8, 0, TAU); c.stroke();
    for (const x of [206, 300]) { c.beginPath(); archPath(c, x, 96, 16, 50); glowFill(c, T.glow, 8, .7); }
    c.strokeStyle = col; c.lineWidth = 4;
    c.beginPath(); c.moveTo(170, 150); c.quadraticCurveTo(176, 60, 196, 30); c.moveTo(372, 150); c.quadraticCurveTo(366, 60, 346, 30); c.stroke();
  },
  cranes(c, T, r) {
    const far = mix(T.far, T.sky[1], .3), col = T.mid;
    skyline(c, T, 150, far, 70, r, T.glow);
    // phare et son faisceau
    const g = c.createLinearGradient(330, -40, 120, -10); g.addColorStop(0, T.glow + 'aa'); g.addColorStop(1, T.glow + '00');
    c.fillStyle = g; c.beginPath(); c.moveTo(332, -48); c.lineTo(60, -120); c.lineTo(60, 20); c.closePath(); c.fill();
    tower(c, 322, 160, 20, 210, { col, roof: 'peak', lit: T.rim });
    c.beginPath(); c.arc(332, -46, 7, 0, TAU); glowFill(c, T.glow, 16);
    // grues
    for (const [x, h, arm] of [[110, 300, 1], [220, 250, -1]]) {
      lattice(c, x, 165, 14, h, col, 1.8);
      c.fillStyle = col; c.fillRect(x - (arm > 0 ? 30 : 90), 165 - h, 134, 6);
      lattice(c, x - (arm > 0 ? 30 : 90), 165 - h + 6, 0, 0, col);
      c.fillRect(arm > 0 ? x - 34 : x + 90, 165 - h - 4, 16, 18);
      const hx = arm > 0 ? x + 90 : x - 76;
      c.strokeStyle = col; c.lineWidth = 1.2; c.beginPath(); c.moveTo(hx, 165 - h + 6); c.lineTo(hx, 165 - h + 120); c.stroke();
      c.fillRect(hx - 9, 165 - h + 118, 18, 12);
    }
    // coque de navire
    c.fillStyle = mix(T.mid, '#000000', .2); c.beginPath(); c.moveTo(150, 150); c.lineTo(380, 150); c.lineTo(392, 110); c.lineTo(140, 112); c.closePath(); c.fill();
    for (const x of [200, 250, 300]) { c.fillRect(x, 60, 18, 52); }
    for (let x = 160; x < 370; x += 16) { c.fillStyle = T.glow; c.globalAlpha = .7; c.fillRect(x, 124, 5, 4); } c.globalAlpha = 1;
  },
  foundry(c, T, r) {
    const far = mix(T.far, T.sky[1], .25), col = T.mid;
    skyline(c, T, 150, far, 90, r, T.crack);
    for (const [x, h, w] of [[150, 330, 22], [196, 280, 18], [300, 360, 26], [350, 250, 18]]) {
      c.fillStyle = col; c.fillRect(x, 160 - h, w, h); c.fillRect(x - 3, 160 - h, w + 6, 8);
      const g = c.createRadialGradient(x + w / 2, 160 - h - 30, 4, x + w / 2, 160 - h - 30, 60); g.addColorStop(0, T.glow + '55'); g.addColorStop(1, T.glow + '00');
      c.fillStyle = g; c.fillRect(x - 60, 160 - h - 90, w + 120, 120);
      cloudBank(c, x + w / 2 + 20, 160 - h - 50, 90, 40, mix(T.far, '#000000', .3), mix(T.crack, T.far, .5), r, 8);
      rimStrip(c, x, 160 - h, w, h, T.rim, .4);
    }
    c.fillStyle = col; c.fillRect(170, 40, 210, 120);
    c.beginPath(); c.moveTo(166, 40); c.lineTo(275, -10); c.lineTo(384, 40); c.closePath(); c.fill();
    for (const x of [190, 250, 320]) { c.beginPath(); archPath(c, x, 80, 34, 80); glowFill(c, T.crack, 22, .95); }
    c.strokeStyle = mix(col, '#000000', .3); c.lineWidth = 6; c.beginPath(); c.moveTo(80, 120); c.lineTo(170, 120); c.moveTo(80, 70); c.quadraticCurveTo(140, 70, 150, 30); c.stroke();
  },
  rooftops(c, T, r) {
    skyline(c, T, 150, mix(T.far, T.sky[1], .2), 150, r, T.glow, .7);
    skyline(c, T, 165, T.mid, 90, r, T.accent, .9);
    const signs = [[70, 40, 50, 16, T.accent], [250, 20, 60, 18, T.crack], [320, 80, 34, 40, T.accent], [150, 90, 40, 14, T.crack]];
    for (const [x, y, w, h, col] of signs) {
      c.save(); c.shadowColor = col; c.shadowBlur = 14; c.strokeStyle = col; c.lineWidth = 2.4; c.strokeRect(x, y, w, h);
      c.globalAlpha = .25; c.fillStyle = col; c.fillRect(x, y, w, h); c.globalAlpha = 1;
      c.fillStyle = col; for (let i = 0; i < w / 9 - 1; i++) c.fillRect(x + 5 + i * 9, y + h * .3, 5, h * .4); c.restore();
    }
    for (const x of [120, 290]) { c.fillStyle = T.mid; c.fillRect(x, 40, 26, 30); c.beginPath(); c.moveTo(x - 2, 40); c.lineTo(x + 13, 28); c.lineTo(x + 28, 40); c.closePath(); c.fill(); c.fillRect(x + 3, 70, 3, 40); c.fillRect(x + 20, 70, 3, 40); }
    c.strokeStyle = mix(T.mid, '#000000', .3); c.lineWidth = 1; c.beginPath(); c.moveTo(0, 30); c.quadraticCurveTo(100, 60, 200, 25); c.quadraticCurveTo(300, 50, 400, 10); c.stroke();
  },
  domes(c, T, r) {
    skyline(c, T, 150, mix(T.far, T.sky[1], .3), 80, r, null);
    for (const [x, y, rx, ry] of [[120, 160, 70, 90], [290, 160, 90, 150], [380, 160, 50, 70]]) {
      const g = c.createRadialGradient(x, y - ry * .4, 5, x, y - ry * .4, rx * 1.2); g.addColorStop(0, T.glow + 'aa'); g.addColorStop(1, T.mid + 'cc');
      c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, 0, Math.PI, 0); c.fill();
      c.strokeStyle = T.mid; c.lineWidth = 2;
      for (let i = 1; i < 6; i++) { c.beginPath(); c.ellipse(x, y, rx * i / 6, ry, 0, Math.PI, 0); c.stroke(); }
      for (let i = 1; i < 4; i++) { c.beginPath(); c.ellipse(x, y, rx, ry * i / 4, 0, Math.PI, 0); c.stroke(); }
      c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, rx, ry, 0, Math.PI, 0); c.stroke();
      c.save(); c.strokeStyle = T.rim; c.globalAlpha = .6; c.lineWidth = 1.4; c.beginPath(); c.ellipse(x, y, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.45); c.stroke(); c.restore();
      for (let i = 0; i < 6; i++) { c.fillStyle = mix(T.mid, '#000000', .2); c.beginPath(); const px = x + r.range(-rx * .7, rx * .7); c.moveTo(px, y); c.quadraticCurveTo(px + r.range(-12, 12), y - r.range(20, ry * .7), px + r.range(-4, 4), y - r.range(30, ry * .8)); c.lineTo(px + 4, y); c.fill(); }
    }
  },
  sewers(c, T, r) {
    skyline(c, T, 60, mix(T.far, T.sky[1], .3), 120, r, T.glow);
    c.fillStyle = T.mid; c.fillRect(0, -20, AW, 180);
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1;
    for (let y = -20, i = 0; y < 160; y += 9, i++) { c.beginPath(); c.moveTo(0, y); c.lineTo(AW, y); c.stroke(); for (let x = (i % 2) * 11; x < AW; x += 22) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 9); c.stroke(); } }
    for (const [x, w] of [[60, 80], [230, 120]]) {
      c.beginPath(); archPath(c, x, 40, w, 130); const g = c.createRadialGradient(x + w / 2, 140, 5, x + w / 2, 120, w); g.addColorStop(0, T.crack); g.addColorStop(1, mix(T.mid, '#000000', .5));
      c.fillStyle = g; c.fill(); c.strokeStyle = mix(T.mid, '#ffffff', .1); c.lineWidth = 5; c.stroke();
    }
    c.strokeStyle = mix(T.mid, '#000000', .35); c.lineWidth = 9; c.beginPath(); c.moveTo(0, 20); c.lineTo(400, 20); c.moveTo(170, 20); c.lineTo(170, 170); c.stroke();
    c.save(); c.strokeStyle = T.rim; c.globalAlpha = .5; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, 16); c.lineTo(400, 16); c.stroke(); c.restore();
  },
  arena(c, T, r) {
    const col = T.mid;
    for (let row = 0; row < 3; row++) {
      const y = 150 - row * 56, h = 56;
      c.fillStyle = mix(col, T.far, row * .15); c.fillRect(0, y - h, AW, h);
      for (let x = 4; x < AW; x += 30) { c.beginPath(); archPath(c, x + 4, y - h + 10, 20, h - 12); glowFill(c, row === 0 ? T.glow : mix(T.glow, T.mid, .5), 6, .55); }
      c.fillStyle = mix(col, '#000000', .2); c.fillRect(0, y - h, AW, 5);
    }
    for (const x of [40, 120, 200, 280, 360]) {
      c.fillStyle = col; c.fillRect(x - 1.5, -60, 3, 46);
      c.beginPath(); c.moveTo(x + 1.5, -58); c.lineTo(x + 30, -52 + Math.sin(x) * 3); c.lineTo(x + 1.5, -40); c.closePath(); c.fillStyle = T.banner; c.fill();
    }
    c.save(); c.globalAlpha = .18; c.fillStyle = T.glow;
    for (const x of [100, 300]) { c.beginPath(); c.moveTo(x - 6, -200); c.lineTo(x + 6, -200); c.lineTo(x + 80, 190); c.lineTo(x - 80, 190); c.closePath(); c.fill(); }
    c.restore();
  },
  clocktower(c, T, r) {
    skyline(c, T, 150, mix(T.far, T.sky[1], .25), 110, r, T.glow);
    const col = T.mid;
    gear(c, 110, 60, 60, 14, mix(col, T.far, .3)); gear(c, 360, 0, 46, 11, mix(col, T.far, .3));
    tower(c, 226, 170, 70, 420, { col, roof: 'spire', tall: 1.6, lit: T.rim });
    c.beginPath(); c.arc(261, -150, 30, 0, TAU); glowFill(c, T.glow, 20, .95);
    c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(261, -150, 30, 0, TAU); c.stroke();
    c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.moveTo(261 + Math.cos(a) * 24, -150 + Math.sin(a) * 24); c.lineTo(261 + Math.cos(a) * 28, -150 + Math.sin(a) * 28); } c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(261, -150); c.lineTo(261, -170); c.moveTo(261, -150); c.lineTo(276, -144); c.stroke();
    for (const y of [-60, 10, 80]) { c.beginPath(); archPath(c, 251, y, 20, 40); glowFill(c, T.glow, 8, .7); }
  },
  observatory(c, T, r) {
    c.save(); c.beginPath(); c.arc(90, -230, 30, 0, TAU); c.fillStyle = mix(T.glow, T.far, .3); c.fill();
    c.strokeStyle = T.glow; c.globalAlpha = .7; c.lineWidth = 3; c.beginPath(); c.ellipse(90, -230, 56, 12, -.3, 0, TAU); c.stroke(); c.restore();
    skyline(c, T, 150, mix(T.far, T.sky[1], .2), 60, r, T.glow);
    const col = T.mid;
    c.fillStyle = col; c.fillRect(190, 40, 170, 130);
    c.beginPath(); c.ellipse(275, 40, 92, 88, 0, Math.PI, 0); c.fill();
    c.save(); c.strokeStyle = T.rim; c.globalAlpha = .55; c.lineWidth = 1.6; c.beginPath(); c.ellipse(275, 40, 92, 88, 0, Math.PI * 1.05, Math.PI * 1.5); c.stroke(); c.restore();
    c.fillStyle = mix(T.glow, T.mid, .4); c.beginPath(); c.moveTo(262, -46); c.lineTo(288, -46); c.lineTo(286, 40); c.lineTo(264, 40); c.closePath(); c.fill();
    c.save(); c.translate(275, 0); c.rotate(-.6); c.fillStyle = col; c.fillRect(-10, -130, 20, 120); c.fillRect(-13, -138, 26, 14); c.restore();
    for (const x of [210, 320]) { c.beginPath(); archPath(c, x, 90, 18, 50); glowFill(c, T.glow, 8, .7); }
  },
  summit(c, T, r) {
    const g = c.createRadialGradient(200, 150, 10, 200, 150, 220); g.addColorStop(0, '#fff6e0'); g.addColorStop(.25, T.glow + 'cc'); g.addColorStop(1, T.glow + '00');
    c.fillStyle = g; c.fillRect(-20, -80, AW + 40, 260);
    cloudBank(c, 80, 140, 220, 60, mix(T.sky[2], T.far, .3), '#fff2dc', r, 18);
    cloudBank(c, 320, 150, 220, 60, mix(T.sky[2], T.far, .3), '#fff2dc', r, 18);
    const col = T.mid;
    tower(c, 182, 170, 36, 330, { col, roof: 'spire', tall: 3.4, lit: T.rim, win: T.glow });
    c.beginPath(); c.moveTo(200, -248); c.lineTo(207, -232); c.lineTo(200, -216); c.lineTo(193, -232); c.closePath(); glowFill(c, T.accent, 22);
    tower(c, 150, 170, 18, 200, { col, roof: 'spire', tall: 2.4, lit: T.rim });
    tower(c, 232, 170, 18, 220, { col, roof: 'spire', tall: 2.4, lit: T.rim });
  },
};

/* ---------- Avant-plan : échafaudage, bannière, balustrade, dallage ---------- */
function scaffold(c, T, x, w, yTop, yBot) {
  const col = mix(T.mid, '#000000', .4);
  c.fillStyle = col; c.fillRect(x, yTop, 5, yBot - yTop); c.fillRect(x + w - 5, yTop, 5, yBot - yTop);
  c.strokeStyle = col; c.lineWidth = 2.4; c.beginPath();
  for (let y = yTop; y < yBot - 10; y += 44) { c.moveTo(x, y); c.lineTo(x + w, y + 44); c.moveTo(x + w, y); c.lineTo(x, y + 44); }
  c.stroke();
  c.lineWidth = 5; c.beginPath(); for (let y = yTop + 20; y < yBot; y += 44) { c.moveTo(x - 3, y); c.lineTo(x + w + 3, y); } c.stroke();
  c.save(); c.globalAlpha = .55; c.fillStyle = T.rim; c.fillRect(x + w - 1.5, yTop, 1.5, yBot - yTop); c.restore();
}
function banner(c, T, x, y, w, h) {
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, T.banner); g.addColorStop(1, mix(T.banner, '#000000', .45));
  c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w, y + h); c.lineTo(x + w / 2, y + h - 18); c.lineTo(x, y + h); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3; c.beginPath(); for (let i = 1; i < 4; i++) { c.moveTo(x + w * i / 4, y + 4); c.lineTo(x + w * i / 4 + 2, y + h - 22); } c.stroke();
  c.save(); c.strokeStyle = T.accent; c.shadowColor = T.accent; c.shadowBlur = 8; c.lineWidth = 2.4; c.globalAlpha = .9;
  const cx = x + w / 2, cy = y + h * .38, R = w * .3;
  c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
  c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8 - Math.PI / 2, rr = i % 2 ? R * .45 : R * 1.25; c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } c.closePath(); c.stroke();
  c.restore();
  c.fillStyle = '#2a2230'; c.fillRect(x - 6, y - 4, w + 12, 5);
}
function balustrade(c, T, y) {
  const col = mix(T.stone, T.far, .3), dark = mix(col, '#000000', .35), top = y - 32;
  c.fillStyle = dark; c.fillRect(0, y - 7, AW, 7);
  for (let x = 4; x < AW; x += 9) {
    c.fillStyle = col; c.beginPath(); c.moveTo(x, top + 6); c.quadraticCurveTo(x - 3, top + 14, x + 1.5, top + 20); c.quadraticCurveTo(x - 3.5, top + 23, x - .5, y - 7); c.lineTo(x + 3.5, y - 7); c.quadraticCurveTo(x + 6.5, top + 23, x + 2.5, top + 20); c.quadraticCurveTo(x + 7, top + 14, x + 4, top + 6); c.closePath(); c.fill();
  }
  c.fillStyle = col; c.fillRect(0, top, AW, 7);
  c.save(); c.globalAlpha = .5; c.fillStyle = T.rim; c.fillRect(0, top, AW, 1.2); c.restore();
  for (let x = 20; x < AW; x += 78) { c.fillStyle = col; c.fillRect(x, top - 6, 12, y - top + 6); c.fillStyle = dark; c.fillRect(x - 2, top - 9, 16, 5); c.save(); c.globalAlpha = .45; c.fillStyle = T.rim; c.fillRect(x, top - 6, 1.4, y - top); c.restore(); }
}
function floorTiles(c, T, r) {
  const y0 = FLOOR_BACK, y1 = LEDGE;
  const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, mix(T.stone, T.glow, .18)); g.addColorStop(1, T.stone2);
  c.fillStyle = g; c.fillRect(0, y0, AW, y1 - y0);
  let y = y0, h = 9, row = 0;
  while (y < y1) {
    const yb = Math.min(y1, y + h), sw = 26 + (y - y0) * .42;
    for (let x = -(row % 2) * sw / 2; x < AW; x += sw) {
      c.globalAlpha = r.range(.15, .4); c.fillStyle = r() < .5 ? T.stone2 : mix(T.stone, '#ffffff', .08); c.fillRect(x + 1, y + 1, sw - 2, yb - y - 2);
      c.globalAlpha = 1; c.strokeStyle = 'rgba(10,6,18,.55)'; c.lineWidth = 1.2; c.strokeRect(x, y, sw, yb - y);
      c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(x + 1, y + 1, sw - 2, 1.2);
      if (r() < .22) {
        c.save(); c.strokeStyle = T.crack; c.shadowColor = T.crack; c.shadowBlur = 6; c.lineWidth = r.range(.8, 1.6); c.globalAlpha = .85;
        c.beginPath(); let cx = x + r.range(4, sw - 4), cy = y + 2; c.moveTo(cx, cy);
        while (cy < yb - 2) { cx += r.range(-5, 5); cy += r.range(2, 6); c.lineTo(clamp(cx, x + 2, x + sw - 2), Math.min(cy, yb - 1)); }
        c.stroke(); c.restore();
      }
    }
    y = yb; h *= 1.28; row++;
  }
  const lg = c.createRadialGradient(200, GROUND, 10, 200, GROUND, 190); lg.addColorStop(0, T.glow + '30'); lg.addColorStop(1, T.glow + '00');
  c.fillStyle = lg; c.fillRect(0, y0, AW, y1 - y0);
  // marche avant : grands blocs
  c.fillStyle = mix(T.stone2, '#000000', .35); c.fillRect(0, y1, AW, 36);
  c.strokeStyle = 'rgba(10,6,18,.6)'; c.lineWidth = 1.4; for (let x = 10; x < AW; x += 52) { c.beginPath(); c.moveTo(x + r.range(-6, 6), y1); c.lineTo(x, y1 + 36); c.stroke(); }
  c.save(); c.globalAlpha = .5; c.fillStyle = T.rim; c.fillRect(0, y1, AW, 1.4); c.restore();
  const bg = c.createLinearGradient(0, y1 + 36, 0, AH + BOT); bg.addColorStop(0, mix(T.stone2, '#000000', .55)); bg.addColorStop(1, '#0a0612');
  c.fillStyle = bg; c.fillRect(0, y1 + 36, AW, AH + BOT - y1 - 36);
  // éclaboussures lumineuses
  c.save(); c.fillStyle = T.crack; c.shadowColor = T.crack; c.shadowBlur = 10;
  for (const [sx, sy] of [[30, y1 + 20], [370, y1 + 50], [60, y1 + 70], [340, y1 + 14]]) for (let i = 0; i < 7; i++) { c.globalAlpha = r.range(.3, .8); c.beginPath(); c.ellipse(sx + r.range(-22, 22), sy + r.range(-8, 8), r.range(1.5, 6), r.range(1, 3), r.range(0, 3), 0, TAU); c.fill(); }
  c.restore();
}

/* Deux calques en cache : 'back' (ciel, monument) et 'front' (échafaudage, balustrade, dallage).
   Les dirigeables passent entre les deux. */
const _bgCache = {};
function arenaLayers(floor, dpr) {
  const ti = tierIdx(floor), key = ti + ':' + dpr;
  if (_bgCache[key]) return _bgCache[key];
  const T = TIERS[ti];
  const mk = () => { const cv = document.createElement('canvas'); cv.width = AW * dpr; cv.height = (AH + EXT + BOT) * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr); c.translate(0, EXT); return [cv, c]; };
  const [back, c] = mk(), [front, f] = mk();
  const r = makeRng(ti * 77 + 3);
  // ciel en trois tons + halo derrière le monument
  const g = c.createLinearGradient(0, -EXT, 0, FLOOR_BACK); g.addColorStop(0, T.sky[0]); g.addColorStop(.6, T.sky[1]); g.addColorStop(1, T.sky[2]);
  c.fillStyle = g; c.fillRect(0, -EXT, AW, FLOOR_BACK + EXT + 2);
  const hg = c.createRadialGradient(270, 60, 10, 270, 60, 320); hg.addColorStop(0, T.glow + 'aa'); hg.addColorStop(.4, T.glow + '33'); hg.addColorStop(1, T.glow + '00');
  c.fillStyle = hg; c.fillRect(0, -EXT, AW, FLOOR_BACK + EXT);
  for (let i = 0; i < (T.motes === 'stars' ? 140 : 50); i++) { c.globalAlpha = r.range(.2, .9); c.fillStyle = '#ffffff'; const s = r.range(.8, 1.8); c.fillRect(r.range(0, AW), r.range(-EXT, -40), s, s); }
  c.globalAlpha = 1;
  const cCol = mix(T.sky[1], T.far, .35), cLit = mix(T.glow, T.sky[2], .3);
  for (let i = 0; i < 5; i++) cloudBank(c, r.range(0, AW), r.range(-EXT + 60, -60), r.range(120, 220), r.range(30, 60), cCol, cLit, r);
  LANDMARKS[T.landmark](c, T, r);
  fogBand(c, 175, 60, T.sky[2], .7);
  scaffold(f, T, 32, 34, -EXT, FLOOR_BACK);
  scaffold(f, T, 352, 30, -60, FLOOR_BACK);
  banner(f, T, 40, -170, 44, 190);
  balustrade(f, T, FLOOR_BACK);
  floorTiles(f, T, r);
  // vignette
  const vg = f.createRadialGradient(200, 60, 120, 200, 60, 420); vg.addColorStop(0, 'rgba(10,6,18,0)'); vg.addColorStop(1, 'rgba(10,6,18,.55)');
  f.fillStyle = vg; f.fillRect(0, -EXT, AW, AH + EXT + BOT);
  return (_bgCache[key] = { back, front });
}
function arenaBackground(floor, dpr) {
  const L = arenaLayers(floor, dpr);
  if (!L.flat) { const cv = document.createElement('canvas'); cv.width = L.back.width; cv.height = L.back.height; const c = cv.getContext('2d'); c.drawImage(L.back, 0, 0); c.drawImage(L.front, 0, 0); L.flat = cv; }
  return L.flat;
}

/* Dirigeable (animé, dessiné à chaque image) */
function drawShip(c, x, y, s, col, win, face) {
  c.save(); c.translate(x, y); c.scale(s * face, s);
  c.fillStyle = col;
  c.beginPath(); c.moveTo(-30, -2); c.lineTo(-44, -13); c.lineTo(-40, 0); c.lineTo(-44, 13); c.lineTo(-30, 2); c.closePath(); c.fill();
  c.beginPath(); c.ellipse(0, 0, 34, 11, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.ellipse(-2, -4, 26, 4, 0, 0, TAU); c.fill();
  c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(-8, 9); c.lineTo(-6, 15); c.moveTo(8, 9); c.lineTo(6, 15); c.stroke();
  c.fillStyle = col; c.fillRect(-10, 14, 20, 6);
  c.fillStyle = win; for (const wx of [-6, -1, 4]) c.fillRect(wx, 16, 2.4, 2);
  c.restore();
}

/* ---------- Lecteur de combat interactif ----------
   Pilote le moteur pas à pas (createFight) : coup parfait sur les attaques du héros, parade sur les coups
   dangereux « ! », techniques lancées avec la rage, orbes d'XP à attraper. Le rendu suit le style néon. */
const PET_SLOTS_POS = [[-34, 14], [-56, -8], [-14, 28]];
const HOME_L = 122, HOME_R = 278;
class FightPlayer {
  constructor(canvas, o) {
    this.cv = canvas; this.o = o; this.speed = o.speed || 1; this.slow = 1; this.paused = false;
    this.clock = 0; this.waits = []; this.tweens = []; this.fx = []; this.texts = []; this.shakeAmt = 0; this.skipped = false; this.alive = true;
    this.F = o.F; this.qte = null; this.qteN = 0; this.queue = []; this.orbs = []; this.orbXp = 0; this.orbN = 0; this.streak = 0;
    this.freeze = 0; this.flashes = []; this.zoom = 0; this.zf = [AW / 2, GROUND - 90]; this.callout = null;
    this.v = {};
    this.v.L = makeView(o.heroEnt, o.heroEquip, 'L', HOME_L, GROUND); this.v.L.name = o.heroEnt.name;
    this.setHeroSprite(o.heroSprite);
    this.v.R = makeView(o.enemy, o.enemy.equip, 'R', HOME_R, GROUND); this.v.R.name = o.enemy.name;
    (o.heroPets || []).filter(Boolean).forEach((p, i) => { const q = PET_SLOTS_POS[i]; const v = makePetView(p, 'L', HOME_L + q[0], GROUND + q[1]); v.name = p.name; this.v['L' + (i + 1)] = v; });
    (o.enemy.pets || []).forEach((p, i) => { const q = PET_SLOTS_POS[i]; const v = makePetView(p, 'R', HOME_R - q[0], GROUND + q[1]); v.name = p.name; this.v['R' + (i + 1)] = v; });
    this.tier = tierOf(o.floor);
    const T = this.tier;
    this.ships = T.ships ? Array.from({ length: 4 }, (_, i) => ({ x: Math.random() * AW, y: -170 + i * 42 + Math.random() * 20, s: .4 + i * .12, v: (.004 + Math.random() * .006) * (i % 2 ? 1 : -1) })) : [];
    this.motes = Array.from({ length: T.motes === 'rain' ? 70 : 34 }, () => ({ x: Math.random() * AW, y: -EXT + Math.random() * (EXT + AH), s: .4 + Math.random() * .9, ph: Math.random() * 6 }));
    this.lastT = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  setHeroSprite(on) { const v = this.v.L; v.sprite = on ? SPRITES[heroChar()] : null; if (on) spriteImg(v.sprite); }
  wait(ms) { if (this.skipped) return Promise.resolve(); return new Promise(res => this.waits.push({ at: this.clock + ms, res })); }
  tween(obj, key, to, ms, ease) {
    if (this.skipped) { obj[key] = to; return Promise.resolve(); }
    return new Promise(res => this.tweens.push({ obj, key, from: obj[key], to, t0: this.clock, ms: Math.max(1, ms), ease: ease || Ease.outQuad, res }));
  }
  move(v, x, y, ms, ease) { return Promise.all([this.tween(v, 'x', x, ms, ease), this.tween(v, 'y', y, ms, ease)]); }
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  slowmo(f, ms) { this.slow = f; setTimeout(() => { if (!this.qte) this.slow = 1; }, ms); }
  text(x, y, str, col, size, vy) { if (!this.skipped) this.texts.push({ x, y, str, col, size: size || 18, life: 0, max: 900, vy: vy == null ? -.045 : vy }); }
  burst(x, y, col, n, kind) {
    if (this.skipped) return;
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = .08 + Math.random() * .25; this.fx.push({ kind: kind || 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'dust' ? .02 : .05), life: 0, max: 260 + Math.random() * 220, col, s: 2 + Math.random() * 3, rot: Math.random() * TAU }); }
  }
  impact(x, y, big) { if (!this.skipped) this.fx.push({ kind: 'impact', x, y, life: 0, max: big ? 240 : 170, s: big ? 1.5 : 1, rot: Math.random() * TAU }); }
  slashFx(v) { if (!this.skipped) this.fx.push({ kind: 'slash', x: v.x + v.face * 26, y: v.sprite ? this.chest(v) - 10 : v.y - (v.kind === 'pet' ? 26 : 76 * CH), face: v.face, life: 0, max: 170, small: v.kind === 'pet' }); }
  ring(v, col) { if (!this.skipped) this.fx.push({ kind: 'ring', x: v.x, y: this.chest(v), col, life: 0, max: 420 }); }
  /* « Moments forts » : arrêt sur image, flash écran, coup de zoom, gros titre au centre */
  hitstop(ms) { if (!this.skipped) this.freeze = Math.max(this.freeze, ms); }
  flash(col, a, ms) { if (!this.skipped) this.flashes.push({ col, a: a || .3, life: 0, max: ms || 260 }); }
  punch(v, amt) { if (this.skipped) return; this.zoom = Math.max(this.zoom, amt); this.zf = [v.x, this.chest(v)]; }
  rays(v, col) { if (!this.skipped) this.fx.push({ kind: 'rays', x: v.x, y: this.chest(v), col, life: 0, max: 420, rot: Math.random() * TAU }); }
  pillar(v, col) { if (!this.skipped) this.fx.push({ kind: 'pillar', x: v.x, y: v.y, col, life: 0, max: 700 }); }
  clang(v, col) { if (!this.skipped) this.fx.push({ kind: 'clang', x: v.x + v.face * 20, y: this.chest(v) - 4, face: v.face, col, life: 0, max: 380 }); }
  call(str, sub, col, ms) { if (this.skipped) return; this.callout = { str, sub, col, life: 0, max: ms || 1200 }; this.o.onCallout && this.o.onCallout(); }
  top(v) { return v.y - (v.sprite ? v.sprite.H * v.scale * (v.sy || 1) : v.kind === 'pet' ? 46 : HERO_H * CH * v.scale); }
  chest(v) { return v.y - (v.sprite ? v.sprite.H * v.scale * (v.sy || 1) * .55 : v.kind === 'pet' ? 24 : CHEST_Y * CH * v.scale); }

  loop(now) {
    if (!this.alive) return;
    const rdt = Math.min(50, now - this.lastT); this.lastT = now;
    let frozen = false;
    if (!this.paused && this.freeze > 0) { this.freeze -= rdt; frozen = true; }
    this.udt = this.paused ? 0 : rdt;
    if (!this.paused && !frozen) {
      const q = this.qte;
      if (q && !q.done) { q.real += rdt; this.slow = .28; if (q.real >= q.dur) this.endQte(false); }
      for (const o of this.orbs) { o.life += rdt; o.y += o.vy * rdt * (o.life < 400 ? 1 : .1); }
      this.orbs = this.orbs.filter(o => !o.got && o.life < o.max);
    }
    const dt = this.paused || frozen ? 0 : rdt * this.speed * this.slow;
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
    const c = cv.getContext('2d'), T = this.tier;
    const cw = cv.width, ch = cv.height, gr = this.o.groundAt || .64;
    /* cadrage portrait plein écran : 82% de la largeur du monde, sol à ~64% de la hauteur */
    let s = Math.max(cw / (AW * .82), gr * ch / (GROUND + EXT - 20), (1 - gr) * ch / (AH + BOT - GROUND - 10));
    let ox = (cw - AW * s) / 2, oy = ch * gr - GROUND * s;
    // coup de zoom sur l'impact (tenu pendant l'arrêt sur image, puis relâché)
    if (this.zoom > .002) { const [fx, fy] = this.zf, px = ox + fx * s, py = oy + fy * s; s *= 1 + this.zoom; ox = px - fx * s; oy = py - fy * s; }
    this.zoom *= Math.pow(.86, dt / 16);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = T.sky[0]; c.fillRect(0, 0, cw, ch);
    this.shakeAmt *= Math.pow(.9, dt / 16);
    const sx = (Math.random() - .5) * this.shakeAmt * 2, sy = (Math.random() - .5) * this.shakeAmt * 2;
    this.tf = [s, ox + sx * s, oy + sy * s];
    c.setTransform(s, 0, 0, s, this.tf[1], this.tf[2]);
    const lay = arenaLayers(this.o.floor, Math.max(1, Math.round(s)));
    c.drawImage(lay.back, -4, -EXT - 4, AW + 8, AH + EXT + BOT + 8);
    for (const sh of this.ships) {
      sh.x += sh.v * dt; if (sh.x > AW + 60) sh.x = -60; if (sh.x < -60) sh.x = AW + 60;
      drawShip(c, sh.x, sh.y + Math.sin(now / 1400 + sh.s * 9) * 3, sh.s, mix(T.far, '#000000', .25 - sh.s * .1), T.glow, sh.v > 0 ? 1 : -1);
    }
    c.drawImage(lay.front, -4, -EXT - 4, AW + 8, AH + EXT + BOT + 8);
    this.drawMotes(c, now, dt);
    RIM = T.rim;
    // auras : bouclier (cyan) et coup dévastateur chargé (rose), derrière le héros
    const hv = this.v.L, U = this.F && this.F.U;
    const tgt = (cur, on) => clamp(cur + (on ? .08 : -.05), 0, 1);
    hv.guard = tgt(hv.guard || 0, U && U.L.shield > 0);
    hv.power = tgt(hv.power || 0, (U && U.L.devastate) || hv.charge > 0);
    if (hv.guard > 0) { c.save(); c.globalAlpha = .55 * hv.guard; const g = c.createRadialGradient(hv.x, this.chest(hv), 10, hv.x, this.chest(hv), 80); g.addColorStop(0, 'rgba(156,201,255,0)'); g.addColorStop(.7, 'rgba(156,201,255,.35)'); g.addColorStop(1, 'rgba(156,201,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(hv.x, this.chest(hv), 80, 0, TAU); c.fill(); c.restore(); }
    if (hv.power > 0) { c.save(); c.globalAlpha = (.45 + .2 * Math.sin(now / 90)) * hv.power; const g = c.createRadialGradient(hv.x, this.chest(hv), 10, hv.x, this.chest(hv), 90); g.addColorStop(0, 'rgba(255,185,148,.5)'); g.addColorStop(1, 'rgba(255,185,148,0)'); c.fillStyle = g; c.beginPath(); c.arc(hv.x, this.chest(hv), 90, 0, TAU); c.fill(); c.restore(); }
    const order = Object.values(this.v).sort((a, b) => (b.pose.rot ? 1 : 0) - (a.pose.rot ? 1 : 0) || a.y - b.y);
    for (const v of order) {
      if (v.glow > 0) { const g = c.createRadialGradient(v.x, this.chest(v), 5, v.x, this.chest(v), 70); g.addColorStop(0, `rgba(120,255,160,${.55 * v.glow})`); g.addColorStop(1, 'rgba(120,255,160,0)'); c.fillStyle = g; c.fillRect(v.x - 80, v.y - 160, 160, 190); }
      if (v.flash > 0) this.drawFlashed(c, v, now); else drawFighter(c, v, now);
    }
    if (hv.guard > 0) { c.save(); c.globalAlpha = .8 * hv.guard; c.strokeStyle = '#9cc9ff'; c.shadowColor = '#9cc9ff'; c.shadowBlur = 0; c.lineWidth = 2; c.beginPath(); c.ellipse(hv.x, this.chest(hv) - 6, 46, 72, 0, 0, TAU); c.stroke(); c.restore(); }
    this.drawFx(c, dt);
    this.drawOrbs(c, now);
    this.drawStatus(c, now);
    if (this.qte && !this.qte.done) this.drawQte(c, now);
    this.drawTexts(c, dt);
    this.drawCallout(c);
    if (this.flashes.length) {
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      for (const f of this.flashes.slice()) {
        f.life += this.udt; const k = f.life / f.max;
        if (k >= 1) { this.flashes.splice(this.flashes.indexOf(f), 1); continue; }
        c.globalAlpha = f.a * (1 - k) * (1 - k); c.fillStyle = f.col; c.fillRect(0, 0, cw, ch);
      }
      c.restore();
    }
  }
  /* Effets en cours, en pastilles au-dessus des têtes : le joueur voit ce que ses techniques ont posé */
  drawStatus(c, now) {
    const U = this.F && this.F.U; if (!U || this.skipped) return;
    const chips = (v, list) => {
      if (!list.length || v.pose.rot) return;
      c.save(); c.font = '700 10px "Barlow Semi Condensed", "Segoe UI", sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'center';
      // pile verticale, décalée vers l'extérieur : les pastilles des deux camps ne se chevauchent pas au contact
      const out = v.face; let y = this.top(v) - 10 + Math.sin(now / 400);
      for (const l of list) {
        const w = c.measureText(l[0]).width + 12, x = out > 0 ? v.x + 10 - w : v.x - 10;
        c.fillStyle = l[1]; c.strokeStyle = INK; c.lineWidth = 1.6; c.beginPath(); Pth.rrect(x, y - 7, w, 14, 7)(c); c.fill(); c.stroke();
        c.fillStyle = INK; c.fillText(l[0], x + w / 2, y + .5); y -= 17;
      }
      c.restore();
    };
    const L = U.L, R = U.R, hl = [], rl = [];
    if (L.shield > 0) hl.push(['BOUCLIER ×' + L.shield, '#9cc9ff']);
    if (L.devastate) hl.push(['DÉVASTATEUR PRÊT', '#ffb994']);
    if (L.pierceN > 0) hl.push(['BRISE-ARMURE ×' + L.pierceN, '#cfd6de']);
    if (R && R.stunTurns > 0) rl.push([R.stunTurns > 1 ? `ÉTOURDI ×${R.stunTurns}` : 'ÉTOURDI', '#ffdb8f']);
    if (R && R.weak) rl.push(['AFFAIBLI', '#c9b8ff']);
    chips(this.v.L, hl); if (this.v.R) chips(this.v.R, rl);
  }
  /* Gros titre centré (coup parfait, parade, technique) : impossible à rater */
  drawCallout(c) {
    const o = this.callout; if (!o) return;
    o.life += this.udt; const k = o.life / o.max;
    if (k >= 1) { this.callout = null; return; }
    const pop = k < .14 ? 1.5 - .5 * Ease.outBack(k / .14) : 1, a = k > .78 ? 1 - (k - .78) / .22 : 1;
    // en coordonnées écran (insensible au zoom d'impact), au-dessus des têtes ; u = 1 px CSS
    const cw = this.cv.width, u = cw / this.cv.clientWidth, maxW = this.cv.clientWidth - 40;
    c.save(); c.setTransform(u, 0, 0, u, cw / 2, this.cv.height * .25); c.rotate(-.04); c.scale(pop, pop); c.globalAlpha = a;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '28px "Permanent Marker", Impact, sans-serif';
    const tw = Math.min(maxW - 32, c.measureText(o.str).width), sub = o.sub;
    let sw = 0; if (sub) { c.font = '700 15px "Barlow Semi Condensed", "Segoe UI", sans-serif'; sw = Math.min(maxW - 32, c.measureText(sub).width); }
    const W = Math.min(maxW, Math.max(tw, sw) + 32), H = sub ? 64 : 46, top = -H / 2;
    c.fillStyle = 'rgba(24,26,40,.94)'; c.beginPath(); Pth.rrect(-W / 2, top, W, H, 14)(c); c.fill();
    c.fillStyle = o.col; c.fillRect(-W / 2 + 20, top + H - 7, W - 40, 3);
    c.font = '28px "Permanent Marker", Impact, sans-serif'; c.lineJoin = 'round'; c.lineWidth = 6; c.strokeStyle = INK;
    c.strokeText(o.str, 0, top + 22, maxW - 32); c.fillStyle = o.col; c.fillText(o.str, 0, top + 22, maxW - 32);
    if (sub) { c.font = '700 15px "Barlow Semi Condensed", "Segoe UI", sans-serif'; c.fillStyle = '#f4efe8'; c.fillText(sub, 0, top + 45, maxW - 32); }
    c.restore();
  }
  drawMotes(c, now, dt) {
    const T = this.tier, kind = T.motes;
    c.save();
    for (const m of this.motes) {
      if (kind === 'rain') {
        m.y += 1.1 * m.s * dt * .5; m.x -= .25 * m.s * dt * .5; if (m.y > AH + 40) { m.y = -EXT + Math.random() * 100; m.x = Math.random() * (AW + 80); }
        c.globalAlpha = .35; c.strokeStyle = T.mote; c.lineWidth = .8; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + 3, m.y - 12 * m.s); c.stroke();
      } else if (kind === 'stars') {
        c.globalAlpha = .3 + .7 * Math.abs(Math.sin(now / 900 + m.ph * 3)); c.fillStyle = T.mote; c.fillRect(m.x, (m.y % 300) - EXT + 40, 1.6 * m.s, 1.6 * m.s);
      } else {
        const up = kind === 'embers' || kind === 'spores';
        m.y += (up ? -.018 : .02) * m.s * dt; m.x += Math.sin(now / 800 + m.ph) * .2;
        if (m.y < -EXT) m.y = AH + 20; if (m.y > AH + 40) m.y = -EXT;
        c.globalAlpha = .75; c.fillStyle = T.mote;
        if (kind === 'embers') { c.shadowColor = T.mote; c.shadowBlur = 0; }
        c.beginPath(); c.arc(m.x, m.y, (kind === 'ash' ? 1.6 : 1.3) * m.s, 0, TAU); c.fill();
      }
    }
    c.restore();
  }
  drawFx(c, dt) {
    for (const f of this.fx.slice()) {
      f.life += dt; const k = f.life / f.max;
      if (k >= 1) { this.fx.splice(this.fx.indexOf(f), 1); continue; }
      if (f.kind === 'spark' || f.kind === 'dust') {
        f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.kind === 'dust' ? -.0002 : .0007) * dt;
        c.globalAlpha = 1 - k;
        if (f.kind === 'dust') { c.beginPath(); c.arc(f.x, f.y, f.s * (1 + k * 2), 0, TAU); c.fillStyle = f.col; c.fill(); }
        else { c.save(); c.translate(f.x, f.y); c.rotate(f.rot + k * 3); c.fillStyle = f.col; c.shadowColor = f.col; c.shadowBlur = 0; c.beginPath(); c.rect(-f.s, -f.s * .35, f.s * 2, f.s * .7); c.fill(); c.restore(); }
        c.globalAlpha = 1;
      } else if (f.kind === 'impact') {
        const r = (10 + 28 * Ease.outCubic(k)) * f.s;
        c.save(); c.translate(f.x, f.y); c.rotate(f.rot); c.globalAlpha = 1 - k * k;
        c.beginPath(); for (let i = 0; i < 16; i++) { const a = i * TAU / 16, rr = i % 2 ? r * .42 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath();
        c.shadowColor = '#ffb994'; c.shadowBlur = 0; c.fillStyle = '#fff6ea'; c.fill(); c.shadowBlur = 0; c.lineWidth = 2; c.strokeStyle = INK; c.stroke();
        c.restore(); c.globalAlpha = 1;
      } else if (f.kind === 'slash') {
        const R = f.small ? 26 : 44;
        c.save(); c.translate(f.x, f.y); c.scale(f.face, 1); c.globalAlpha = 1 - k;
        c.beginPath(); c.arc(0, 18, R, -2.2 + k * .6, .3 + k * .3); c.arc(0, 22, R * .78, .3 + k * .3, -2.2 + k * .6, true); c.closePath();
        c.shadowColor = '#ffb994'; c.shadowBlur = 0; c.fillStyle = '#ffffff'; c.fill();
        c.restore(); c.globalAlpha = 1;
      } else if (f.kind === 'ring') {
        c.save(); c.globalAlpha = 1 - k; c.strokeStyle = f.col; c.shadowColor = f.col; c.shadowBlur = 0; c.lineWidth = 3 * (1 - k) + 1;
        c.beginPath(); c.arc(f.x, f.y, 20 + 70 * Ease.outCubic(k), 0, TAU); c.stroke(); c.restore();
      } else if (f.kind === 'rays') { // traits de vitesse rayonnants (coup parfait, dévastateur)
        const e = Ease.outCubic(k);
        c.save(); c.translate(f.x, f.y); c.rotate(f.rot); c.globalAlpha = 1 - k; c.fillStyle = f.col;
        for (let i = 0; i < 16; i++) {
          const a = i * TAU / 16 + (i % 2) * .12, r0 = 22 + 46 * e, r1 = r0 + (i % 2 ? 24 : 46) * (1 - k * .5), w = .06;
          c.beginPath(); c.moveTo(Math.cos(a - w) * r0, Math.sin(a - w) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); c.lineTo(Math.cos(a + w) * r0, Math.sin(a + w) * r0); c.closePath(); c.fill();
        }
        c.restore(); c.globalAlpha = 1;
      } else if (f.kind === 'pillar') { // colonne de lumière au lancement d'une technique
        const a = k < .15 ? k / .15 : 1 - (k - .15) / .85, w = 30 * (1 - k * .4), top = f.y - 240;
        c.save(); c.globalAlpha = .6 * a;
        const g = c.createLinearGradient(f.x - w, 0, f.x + w, 0); g.addColorStop(0, hexA(f.col, 0)); g.addColorStop(.5, hexA(f.col, .9)); g.addColorStop(1, hexA(f.col, 0));
        c.fillStyle = g; c.fillRect(f.x - w, top, w * 2, f.y - top + 4);
        c.globalAlpha = .9 * a; c.fillStyle = '#ffffff'; c.fillRect(f.x - w * .12, top, w * .24, f.y - top);
        c.strokeStyle = f.col; c.lineWidth = 2.5; c.beginPath(); c.ellipse(f.x, f.y + 2, 26 + 30 * k, 7 + 6 * k, 0, 0, TAU); c.stroke();
        c.restore();
        for (let i = 0; i < 2; i++) if (Math.random() < .5) this.fx.push({ kind: 'spark', x: f.x + (Math.random() - .5) * w * 1.6, y: f.y - Math.random() * 120, vx: 0, vy: -.12 - Math.random() * .1, life: 0, max: 380, col: f.col, s: 1.6 + Math.random() * 1.6, rot: 0 });
      } else if (f.kind === 'clang') { // bouclier de parade : arc lumineux devant le défenseur
        const e = Ease.outCubic(Math.min(1, k * 2.2));
        c.save(); c.translate(f.x, f.y); c.scale(f.face, 1); c.globalAlpha = 1 - k * k;
        c.lineCap = 'round';
        c.strokeStyle = INK; c.lineWidth = 9; c.beginPath(); c.arc(-18, 0, 22 + 16 * e, -1.05, 1.05); c.stroke();
        c.strokeStyle = f.col; c.lineWidth = 6; c.beginPath(); c.arc(-18, 0, 22 + 16 * e, -1.05, 1.05); c.stroke();
        c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.arc(-18, 0, 22 + 16 * e, -.8, .8); c.stroke();
        c.restore(); c.globalAlpha = 1;
      }
    }
  }
  drawTexts(c, dt) {
    for (const tx of this.texts.slice()) {
      tx.life += dt; const k = tx.life / tx.max;
      if (k >= 1) { this.texts.splice(this.texts.indexOf(tx), 1); continue; }
      tx.y += tx.vy * dt;
      const pop = k < .15 ? Ease.outBack(k / .15) : 1;
      c.save(); c.translate(tx.x, tx.y); c.rotate(-.06); c.scale(pop, pop); c.globalAlpha = k > .7 ? 1 - (k - .7) / .3 : 1;
      c.font = `${tx.size}px "Permanent Marker", Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineJoin = 'round'; c.lineWidth = tx.size * .28; c.strokeStyle = INK; c.strokeText(tx.str, 0, 0);
      c.shadowColor = tx.col; c.shadowBlur = 0; c.fillStyle = tx.col; c.fillText(tx.str, 0, 0);
      c.restore();
    }
  }
  /* Orbes d'XP : étoiles dorées néon à attraper d'un tap */
  drawOrbs(c, now) {
    for (const o of this.orbs) {
      const k = o.life / o.max, a = k > .75 ? (1 - k) / .25 : 1, r = 11 + Math.sin(now / 160 + o.ph) * 1.5;
      c.save(); c.globalAlpha = a;
      const g = c.createRadialGradient(o.x, o.y, 2, o.x, o.y, r * 2.4); g.addColorStop(0, 'rgba(255,219,143,.75)'); g.addColorStop(1, 'rgba(255,185,148,0)'); c.fillStyle = g; c.beginPath(); c.arc(o.x, o.y, r * 2.4, 0, TAU); c.fill();
      c.translate(o.x, o.y); c.rotate(now / 600 + o.ph); c.beginPath(); for (let i = 0; i < 10; i++) { const an = i * TAU / 10 - Math.PI / 2, rr = i % 2 ? r * .45 : r; c.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } c.closePath();
      c.shadowColor = '#ffdb8f'; c.shadowBlur = 0; c.fillStyle = '#ffdb8f'; c.fill(); c.shadowBlur = 0; c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke(); c.restore();
    }
  }
  /* Cercle de réflexe : se referme sur la cible. Taper quand il est dans la zone (anneau intérieur) */
  drawQte(c, now) {
    const q = this.qte, D = q.v, parry = q.kind === 'parry';
    const x = D.x, y = this.chest(D) - 4, k = clamp(q.real / q.dur, 0, 1), inZone = k >= q.zone;
    const R1 = D.kind === 'pet' ? 18 : 26, R0 = R1 + 86, rr = lerp(R0, R1, k), rz = lerp(R0, R1, q.zone);
    const col = parry ? '#9cc9ff' : '#ffb994', hot = parry ? '#ffffff' : '#ffffff';
    c.save();
    // zone de réussite (anneau entre la cible et le centre)
    c.globalAlpha = inZone ? .35 : .16; c.fillStyle = col; c.beginPath(); c.arc(x, y, rz, 0, TAU); c.arc(x, y, R1, 0, TAU, true); c.fill();
    c.globalAlpha = .95; c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 0; c.lineWidth = 2; c.beginPath(); c.arc(x, y, rz, 0, TAU); c.stroke();
    // cercle qui se referme
    c.strokeStyle = inZone ? hot : '#ffffff'; c.shadowColor = parry ? '#9cc9ff' : '#ffdb8f'; c.shadowBlur = 0; c.lineWidth = inZone ? 4.5 : 3; c.globalAlpha = 1;
    c.beginPath(); c.arc(x, y, rr, 0, TAU); c.stroke();
    // étincelle en haut du cercle
    c.fillStyle = '#ffffff'; c.shadowBlur = 0;
    const sy = y - rr; c.beginPath(); c.moveTo(x, sy - 7); c.lineTo(x + 2, sy); c.lineTo(x, sy + 7); c.lineTo(x - 2, sy); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x - 7, sy); c.lineTo(x, sy - 1.5); c.lineTo(x + 7, sy); c.lineTo(x, sy + 1.5); c.closePath(); c.fill();
    c.restore();
    if (parry) { // coup dangereux : « ! » au-dessus de l'attaquant
      const fx = q.from.x, fy = this.top(q.from) - 24, bob = Math.sin(now / 70) * 2;
      c.save(); c.font = '34px "Permanent Marker", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineJoin = 'round'; c.lineWidth = 7; c.strokeStyle = INK; c.strokeText('!', fx, fy + bob);
      c.shadowColor = '#ff9b9b'; c.shadowBlur = 0; c.fillStyle = '#ff9b9b'; c.fillText('!', fx, fy + bob); c.restore();
    }
    if (q.hint) {
      // étiquette TAPE / PARE + main, pour les premiers réflexes
      const bx = x + 8, by = y + 8, pulse = 1 + Math.sin(now / 120) * .05;
      c.save(); c.translate(bx, by); c.scale(pulse, pulse); c.rotate(-.08);
      c.fillStyle = 'rgba(20,12,30,.92)'; c.strokeStyle = parry ? '#9cc9ff' : '#ffffff'; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(-26, -12); c.lineTo(28, -14); c.lineTo(26, 10); c.lineTo(-28, 12); c.closePath(); c.fill(); c.stroke();
      c.font = '15px "Permanent Marker", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff'; c.fillText(parry ? 'PARE' : 'TAPE', 0, 0);
      c.translate(24, 22); c.rotate(-.5);
      cel(c, cc => { cc.moveTo(-3, -16); cc.quadraticCurveTo(-3, -20, 0, -20); cc.quadraticCurveTo(3, -20, 3, -16); cc.lineTo(3, -4); cc.lineTo(11, -2); cc.quadraticCurveTo(14, 0, 13, 6); cc.lineTo(10, 16); cc.lineTo(-6, 16); cc.lineTo(-10, 4); cc.quadraticCurveTo(-11, 0, -7, 0); cc.lineTo(-3, 3); cc.closePath(); }, '#ffffff', { lw: 1.6, rim: false });
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
  /* Renvoie true si le tap a servi (réflexe ou orbe) */
  tap(ev) {
    if (this.skipped || this.paused || !this.tf) return false;
    const q = this.qte;
    if (q && !q.done) {
      if (q.real / q.dur >= q.zone) this.endQte(true);
      else { q.early = true; this.endQte(false); this.text(q.v.x, this.top(q.v) - 30, 'TROP TÔT', '#ff9b9b', 17, -.02); }
      return true;
    }
    if (!ev) return false;
    const [x, y] = this.arenaXY(ev);
    for (const o of this.orbs) if (!o.got && Math.hypot(o.x - x, o.y - y) < 32) {
      o.got = true; this.orbXp += o.val; Sfx.play('xp');
      this.text(o.x, o.y - 10, '+' + o.val + ' XP', '#ffdb8f', 18); this.burst(o.x, o.y, '#ffdb8f', 10);
      this.o.onOrb && this.o.onOrb(this.orbXp);
      return true;
    }
    return false;
  }
  startQte(kind, v, from) {
    if (this.skipped) return Promise.resolve(false);
    this.qteN++;
    const hint = this.o.hint ? this.o.hint(kind) : false;
    this.o.onQteStart && this.o.onQteStart(kind, this.qteN);
    return new Promise(res => { this.qte = { kind, v, from, real: 0, dur: kind === 'parry' ? 760 : 680, zone: .52, res, done: false, hint }; });
  }
  endQte(ok) {
    const q = this.qte; if (!q || q.done) return;
    q.done = true; this.qte = null; this.slow = 1;
    if (q.kind === 'perfect') this.streak = ok ? this.streak + 1 : 0;
    const parry = q.kind === 'parry', col = parry ? '#9cc9ff' : '#ffdb8f';
    if (ok) { // réflexe réussi : retour immédiat au tap (gel court + flash), le gros titre vient à l'impact
      Sfx.play(parry ? 'guard' : 'perfect'); this.ring(q.v, col); this.hitstop(70); this.flash(col, .18, 180);
      if (parry) this.clang(q.v, col);
    } else {
      Sfx.play('miss');
      if (!q.early) this.text(q.v.x, this.top(q.v) - 30, parry ? 'PAS PARÉ' : 'RATÉ', '#ff9b9b', 17, -.02);
    }
    this.o.onQte && this.o.onQte(q.kind, ok, this.streak);
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
    if (this.o.enemy.boss) { this.shake(5); Sfx.play('ko'); }
    this.sync();
    await this.wait(this.o.enemy.boss ? 1100 : 800);
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
      this.text(v.x, this.top(v) - 14, 'SECOND SOUFFLE', '#94e2bd', 15, -.02); this.text(v.x, this.top(v) + 10, '+' + e.heal, '#94e2bd', 20);
      this.log(`${v.name} reprend son souffle (+${e.heal} PV).`, e.who[0]);
      await this.wait(500);
    } else if (e.type === 'regen') { const v = this.v[e.who]; this.text(v.x + 12, this.top(v) + 8, '+' + e.heal, '#94e2bd', 13); }
    else if (e.type === 'stunned') { const v = this.v[e.who]; v.stun = 1.2; this.text(v.x, this.top(v) - 20, 'SONNÉ', '#ffdb8f', 15, -.02); this.log(`${v.name} est sonné et perd son tour.`, e.who[0]); await this.wait(420); }
    else if (e.type === 'active') await this.playActive(e);
  }
  async playActive(e) {
    const H = this.v.L, R = this.v.R, A = ACTIVES[e.id], cyan = e.id === 'bouclier' || e.id === 'soin';
    const col = e.id === 'soin' ? '#94e2bd' : cyan ? '#9cc9ff' : e.id === 'brise' ? '#cfd6de' : e.id === 'cri' ? '#ffdb8f' : '#ffb994';
    const rank = this.F.actives[e.id] || 1, v = A.val[rank - 1];
    H.glow = e.id === 'soin' ? 1 : 0; setPose(H, 'windup', 18); Sfx.play(cyan ? 'guard' : 'ability'); this.slowmo(.4, 320);
    // lancement : colonne de lumière + double onde + gel + titre centré qui dit ce que fait la technique
    this.pillar(H, col); this.ring(H, col); setTimeout(() => this.ring(H, '#ffffff'), 90);
    this.hitstop(90); this.punch(H, .06); this.flash(col, .24, 300);
    const sub = {
      devaste: `Prochain coup ×${String(v).replace('.', ',')}, inesquivable`,
      brise: `${v} prochains coups ignorent l'armure`,
      bouclier: `−${Math.round(v * 100)} % sur les 2 prochains coups`,
      balayage: 'Frappe toute l\'équipe adverse',
      cri: `Adversaire étourdi ${v > 1 ? v + ' tours' : '1 tour'}${rank >= 2 ? ', affaibli' : ''}`,
      soin: `+${e.heal || 0} PV`,
    }[e.id];
    this.call(A.name.toUpperCase(), sub, col, 1400);
    this.o.onActive && this.o.onActive(e.id);
    this.log(`${H.name} : ${A.name}. ${sub}.`, 'L');
    await this.wait(180);
    if (e.id === 'soin') { Sfx.play('heal'); this.text(H.x, this.top(H) + 6, '+' + e.heal, '#94e2bd', 30); this.burst(H.x, this.chest(H), '#94e2bd', 14); }
    else if (e.id === 'cri') { setPose(H, 'victory', 20); this.shake(9); R.stun = 2.4; R.flash = .6; this.ring(R, '#ffdb8f'); this.text(R.x, this.top(R) - 16, 'ÉTOURDI', '#ffdb8f', 20, -.02); }
    else if (e.id === 'devaste') { H.charge = 1; this.burst(H.x, this.chest(H), '#ffb994', 14); }
    else if (e.id === 'bouclier') { this.clang(H, '#9cc9ff'); this.burst(H.x, this.chest(H), '#9cc9ff', 12); }
    else if (e.id === 'brise') { R.flash = .7; this.impact(R.x, this.chest(R), false); this.burst(R.x, this.chest(R), '#cfd6de', 16); this.text(R.x, this.top(R) - 10, 'ARMURE BRISÉE', '#cfd6de', 18, -.02); Sfx.play('block'); }
    else if (e.id === 'balayage') {
      setPose(H, 'strike', 30); this.shake(7); Sfx.play('crit'); this.hitstop(80);
      for (const t of e.hits) { const tv = this.v[t.id]; tv.flash = 1; setPose(tv, 'hit', 30); this.impact(tv.x, this.chest(tv), true); this.text(tv.x, this.top(tv) + 4, String(t.dmg), '#ffdb8f', 28); }
    }
    this.setHp(e.hp);
    await this.wait(700);
    setPose(H, 'idle', 10);
    for (const id in this.v) if (id[0] === 'R' && !this.v[id].pose.rot) setPose(this.v[id], 'idle', 10);
  }
  reach(A, D) { return (A.sprite ? A.sprite.reach * A.scale : A.kind === 'pet' ? 34 : 52 + WEAPONS[A.gear.weapon].reach * .6) + (D.sprite ? D.sprite.body * D.scale : 0) + (D.kind === 'pet' ? -6 : 0) + (D.boss ? 10 : 0); }
  async playWindup(s) {
    const A = this.v[s.a], D = this.v[s.d];
    const reach = this.reach(A, D), tx = D.x - A.face * reach, ty = D.y + (D.kind === 'pet' ? -2 : 1);
    if (Math.abs(A.x - tx) > 6 || Math.abs(A.y - ty) > 6) {
      A.running = true; setPose(A, 'run', 10);
      await this.move(A, tx, ty, Math.hypot(A.x - tx, A.y - ty) / .55, Ease.linear);
      A.running = false;
    }
    if (s.counter) { this.text(A.x, this.top(A) - 10, 'RIPOSTE', '#ffdb8f', 14, -.02); this.log(`${A.name} riposte !`, s.a[0]); }
    setPose(A, 'windup', 24);
    const input = {};
    if (!this.skipped && s.heroStrike) input.perfect = await this.startQte('perfect', D, A);
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
      this.text(D.x, this.top(D) - 6, 'ESQUIVE', '#9cc9ff', 16, -.03);
      this.log(`${D.name} esquive.`, sideD);
      await this.tween(D, 'x', D.x - D.face * 30, 150);
      setPose(D, 'idle', 10); await this.tween(D, 'x', D.x + D.face * 30, 170);
    } else if (e.res === 'block') {
      setPose(D, 'block', 30); Sfx.play('block'); this.burst(hx, hy, '#e8eef5', 8);
      this.text(D.x, this.top(D) - 6, 'BLOQUÉ', '#e8eef5', 16, -.03);
      this.log(`${D.name} pare le coup.`, sideD);
      await this.wait(240);
    } else {
      const big = e.crit || e.heavy || e.perfect || e.devast;
      if (e.parried) {
        setPose(D, 'block', 30); this.burst(hx, hy, '#9cc9ff', 18); this.ring(D, '#9cc9ff'); this.clang(D, '#9cc9ff');
        this.hitstop(110); this.punch(D, .07); this.flash('#9cc9ff', .28);
        this.call('PARADE !', `Dégâts réduits de ${Math.round((1 - PARRY_MULT) * 100)} %`, '#9cc9ff');
      } else { D.flash = 1; setPose(D, 'hit', 32); D.expr = 'hurt'; }
      if (e.shielded) {
        this.burst(hx, hy, '#9cc9ff', 12); this.clang(D, '#9cc9ff');
        const left = this.F.U[e.d] ? this.F.U[e.d].shield : 0;
        this.text(D.x, this.top(D) - 44, left > 0 ? `BOUCLIER : ENCORE ${left}` : 'BOUCLIER ÉPUISÉ', '#9cc9ff', 15, -.02);
      }
      this.impact(hx, hy, big); this.burst(hx, hy, e.crit || e.perfect ? '#ffdb8f' : '#ffb994', big ? 16 : 9);
      this.shake(e.devast ? 10 : big ? 7 : e.parried ? 2 : 3.2);
      Sfx.play(big ? 'crit' : 'hit');
      const dcol = e.parried ? '#9cc9ff' : big ? '#ffdb8f' : '#ffffff';
      this.text(D.x + (Math.random() - .5) * 18, this.top(D) + 4, String(e.dmg), dcol, e.perfect || e.devast ? 40 : big ? 32 : e.parried ? 20 : 24);
      if (e.perfect) {
        this.hitstop(130); this.punch(D, .1); this.flash('#ffdb8f', .32); this.rays(D, '#ffdb8f');
        this.call('COUP PARFAIT', `Dégâts ×${String(PERFECT_MULT).replace('.', ',')}${this.streak >= 2 ? ` · série de ${this.streak}` : ''}`, '#ffdb8f');
        this.slowmo(.35, 220); if (Math.random() < .5) this.spawnOrb(D.x, D.y - 40);
      } else if (e.devast) {
        this.hitstop(150); this.punch(D, .12); this.flash('#ffb994', .36); this.rays(D, '#ffb994');
        this.call('DÉVASTATEUR', 'Coup chargé, impossible à esquiver', '#ffb994'); this.slowmo(.3, 260);
      } else if (e.crit) { this.text(D.x, this.top(D) - 26, 'CRITIQUE', '#ffdb8f', 20, -.02); this.hitstop(60); this.flash('#ffffff', .14, 160); this.slowmo(.35, 180); }
      else if (e.heavy) this.text(D.x, this.top(D) - 26, 'FRACAS', '#ffb994', 18, -.02);
      if (e.pierce) { this.text(D.x, this.top(D) - 46, 'ARMURE IGNORÉE', '#cfd6de', 14, -.02); this.burst(hx, hy, '#cfd6de', 8); }
      if (e.heal) this.text(A.x, this.top(A) + 4, '+' + e.heal, '#94e2bd', 16);
      if (e.thorns) { A.flash = .7; this.text(A.x, this.top(A), '-' + e.thorns, '#ff9b9b', 15); }
      if (e.stun) { D.stun = 1.6; this.text(D.x, this.top(D) - 36, 'ÉTOURDI', '#ffdb8f', 13, -.02); }
      this.setHp(e.hp);
      this.log(`${A.name} frappe ${D.name} : ${e.dmg}${e.crit ? ' (critique)' : ''}${e.parried ? ' (paré)' : ''}${e.perfect ? ' (parfait)' : ''}.`, sideA);
      this.tween(D, 'x', D.x + A.face * 9, 90);
      await this.wait(big ? 280 : 210);
    }
  }
  async afterStrike(s, cont) {
    const A = this.v[s.a], D = this.v[s.d];
    if (this.F.over) return;
    if (cont === 'combo') { this.text(A.x, this.top(A) - 10, 'ENCHAÎNEMENT', '#ffdb8f', 12, -.02); if (!D.pose.rot) { setPose(D, 'idle', 8); D.expr = 'neutral'; } return; }
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
    this.v.L.charge = 0;
    Sfx.play('ko'); this.shake(9); this.slowmo(.3, 650);
    this.burst(lv.x - lv.face * 18, lv.y - 4, 'rgba(255,255,255,.85)', 10, 'dust');
    await this.wait(380);
    for (const id in this.v) {
      const v = this.v[id]; if (v.pose.rot && id !== Lz) continue;
      if (id[0] === W) { v.running = false; setPose(v, 'victory', 6); v.expr = 'grin'; }
    }
    const wv = this.v[W];
    this.text(wv.x, this.top(wv) - 20, W === 'L' ? 'VICTOIRE' : 'DÉFAITE', W === 'L' ? '#ffdb8f' : '#ff9b9b', 30, -.01);
    await this.wait(1100);
  }
  togglePause(on) { this.paused = on == null ? !this.paused : on; }
  skip() {
    this.skipped = true; this.paused = false; this.texts = []; this.fx = []; this.orbs = []; this.flashes = []; this.callout = null; this.freeze = 0; this.zoom = 0;
    if (this.qte) this.endQte(false);
    for (const tw of this.tweens) { tw.obj[tw.key] = tw.to; tw.res(); } this.tweens = [];
    for (const w of this.waits) w.res(); this.waits = [];
  }
  finalize() {
    const hp = this.F.snap(), W = this.F.winner;
    this.setHp(hp);
    for (const id in this.v) {
      const v = this.v[id]; v.running = false; v.x = v.homeX; v.y = v.homeY; v.face = id[0] === 'L' ? 1 : -1; v.stun = 0; v.charge = 0; v.guard = 0; v.power = 0;
      const dead = hp[id] === 0 || id === (W === 'L' ? 'R' : 'L');
      if (dead) { setPose(v, 'ko', 50); v.expr = 'ko'; } else if (id[0] === W) { setPose(v, 'victory', 50); v.expr = 'grin'; } else setPose(v, 'idle', 50);
    }
  }
  destroy() { this.alive = false; if (this.qte) this.endQte(false); }
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
      else if (name === 'perfect') { [988, 1319, 1760].forEach((f, i) => this._tone(f, .16, 'triangle', .13, null, i * .045)); this._noise(.1, 5000, 2, .25); }
      else if (name === 'good') this._tone(880, .12, 'triangle', .1);
      else if (name === 'miss') this._tone(220, .14, 'sine', .08, 160);
      else if (name === 'ability') { this._tone(160, .35, 'sawtooth', .1, 640); this._noise(.3, 1200, .8, .4, 300); }
      else if (name === 'guard') { this._tone(520, .3, 'sine', .14, 780); this._tone(780, .3, 'triangle', .06, 1040, .05); }
    } catch (e) { /* audio non critique */ }
  },
};
