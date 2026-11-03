/* ===== UI : helpers DOM + composants réutilisables ===== */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(3)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

/* Icônes SVG maison : remplissage + contour encre, cohérents avec le cel-shading */
const ICONS = {
  soul: '<path d="M12 2.5c1.6 3.4 5.8 5.6 5.8 10.6a5.8 5.8 0 0 1-11.6 0c0-2.6 1.4-4.4 2.6-6 .1 1.8.8 3 1.9 3.4-.8-2.6-.2-5.6 1.3-8z" fill="#8fe3ff"/><path d="M12 11.5c1 1.5 2.4 2.4 2.4 4.3a2.4 2.4 0 0 1-4.8 0c0-1.5 1.4-2.6 2.4-4.3z" fill="#e8fbff" stroke-width="1.2"/>',
  flame: '<path d="M12 2.5c1.6 3.4 5.8 5.6 5.8 10.6a5.8 5.8 0 0 1-11.6 0c0-2.6 1.4-4.4 2.6-6 .1 1.8.8 3 1.9 3.4-.8-2.6-.2-5.6 1.3-8z" fill="#ff9a3c"/><path d="M12 11.5c1 1.5 2.4 2.4 2.4 4.3a2.4 2.4 0 0 1-4.8 0c0-1.5 1.4-2.6 2.4-4.3z" fill="#ffe7a8" stroke-width="1.2"/>',
  ember: '<path d="M12 6c1 2.2 3.8 3.6 3.8 7a3.8 3.8 0 0 1-7.6 0c0-1.8 1-3 1.7-4 .1 1.2.5 2 1.2 2.2-.5-1.7-.1-3.7.9-5.2z" fill="#5b4a3c"/>',
  skull: '<path d="M12 3c-4.7 0-7.5 3.2-7.5 7 0 2.4 1.1 4 2.6 5v3.2c0 .9.7 1.6 1.6 1.6h6.6c.9 0 1.6-.7 1.6-1.6V15c1.5-1 2.6-2.6 2.6-5 0-3.8-2.8-7-7.5-7z" fill="#efe4c8"/><circle cx="9.2" cy="11" r="1.9" fill="#1c130e"/><circle cx="14.8" cy="11" r="1.9" fill="#1c130e"/><path d="M10 17v2.5M12 17v2.5M14 17v2.5" stroke-width="1.2"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="#e2483a"/>',
  flask: '<path d="M9.5 3h5v5l4 8.5A2.4 2.4 0 0 1 16.3 20H7.7a2.4 2.4 0 0 1-2.2-3.5L9.5 8z" fill="#e9e1d1"/><path d="M7 14h10l1.5 2.6a2.4 2.4 0 0 1-2.2 3.4H7.7a2.4 2.4 0 0 1-2.2-3.4z" fill="#e2483a"/><path d="M8.5 3h7" />',
  flaskE: '<path d="M9.5 3h5v5l4 8.5A2.4 2.4 0 0 1 16.3 20H7.7a2.4 2.4 0 0 1-2.2-3.5L9.5 8z" fill="#4b3b2e"/><path d="M8.5 3h7"/>',
  tower: '<path d="M7 21V9H5V4h3v2h2V4h4v2h2V4h3v5h-2v12z" fill="#c9b88f"/><path d="M10.5 21v-4a1.5 1.5 0 0 1 3 0v4" fill="#1c130e"/>',
  bag: '<path d="M7 8h10l1.5 11.5a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5z" fill="#b07a45"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8" fill="none"/><path d="M5.8 12h12.4" />',
  hero: '<circle cx="12" cy="8" r="4.2" fill="#f2c79c"/><path d="M4.5 21c.6-4.5 3.6-7 7.5-7s6.9 2.5 7.5 7z" fill="#3b6ea8"/>',
  epee: '<path d="M18.5 3.5l2 2-10 10-2-2z" fill="#c9d2db"/><path d="M6 15l3 3M4 20l3.5-3.5" stroke-width="2.4"/><path d="M5.5 13.5l5 5" stroke="#e9b844" stroke-width="2.6"/>',
  hache: '<path d="M5 20L16 9" stroke="#8a5a34" stroke-width="2.6"/><path d="M13 4c3.5-.6 6.4 1.3 7 4.8-2.2-.6-3.8 0-5 1.4L12.4 7.6c.9-1 1-2.3.6-3.6z" fill="#c9d2db"/>',
  dague: '<path d="M17.5 4.5l2 2-7 7-2-2z" fill="#c9d2db"/><path d="M9 13l2 2" stroke="#e9b844" stroke-width="2.6"/><path d="M5.5 18.5l4-4" stroke="#8a5a34" stroke-width="2.6"/>',
  marteau: '<path d="M5 20l9-9" stroke="#8a5a34" stroke-width="2.6"/><path d="M12.2 5.3l3.5-3.5 6.5 6.5-3.5 3.5z" fill="#9aa3ad"/>',
  lance: '<path d="M3.5 20.5L17 7" stroke="#8a5a34" stroke-width="2"/><path d="M15.5 6.5L20.5 3.5 17.5 8.5 15 9z" fill="#c9d2db"/>',
  poings: '<path d="M7 9.5h9.5a2.5 2.5 0 0 1 2.5 2.5v3a5 5 0 0 1-5 5h-3A5 5 0 0 1 6 15V10.5a1 1 0 0 1 1-1z" fill="#f2c79c"/><path d="M9.5 9.5v3M13 9.5v3M16 10v2.5"/>',
  cuir: '<path d="M7 4l5 2 5-2 3 4-2 3v9H6v-9L4 8z" fill="#9a6338"/><path d="M8 5l8 14" stroke="#5b3a25" stroke-width="2"/>',
  maille: '<path d="M7 4l5 2 5-2 3 4-2 3v9H6v-9L4 8z" fill="#9aa3ad"/><path d="M8 11h8M8 14h8M8 17h8" stroke-width="1" />',
  plaques: '<path d="M7 4l5 2 5-2 3 4-2 3v9H6v-9L4 8z" fill="#d6dde4"/><path d="M12 7v12" stroke-width="1.4"/>',
  amulette: '<path d="M6 3c0 6 2.5 9 6 9s6-3 6-9" fill="none" stroke-width="1.6"/><path d="M12 11l4 5-4 5-4-5z" fill="#c94fe0"/>',
  anneau: '<circle cx="12" cy="14" r="6" fill="none" stroke="#e9b844" stroke-width="3.2"/><circle cx="12" cy="14" r="6" fill="none" stroke-width="1"/><path d="M9.5 6.5L12 4l2.5 2.5L12 9z" fill="#4fc3e0"/>',
  rune: '<path d="M7 3.5h10l1.5 4v9L17 20.5H7L5.5 16.5v-9z" fill="#8c8f9a"/><path d="M10 7v10M10 9l4 3-4 3" stroke="#8fe3ff" stroke-width="2"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#e9e1d1"/><path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" fill="none"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="#6b5843"/><path d="M15.5 9.5l5 5M20.5 9.5l-5 5"/>',
  paw: '<ellipse cx="12" cy="15.5" rx="4.6" ry="3.8" fill="currentColor"/><circle cx="6.5" cy="10.5" r="2.1" fill="currentColor"/><circle cx="10" cy="7" r="2.1" fill="currentColor"/><circle cx="14" cy="7" r="2.1" fill="currentColor"/><circle cx="17.5" cy="10.5" r="2.1" fill="currentColor"/>',
  xp: '<path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="#ffd84a"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2" fill="#ffd84a"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke-width="2"/>',
  portal: '<ellipse cx="12" cy="12" rx="6.5" ry="9" fill="#b06cff"/><ellipse cx="12" cy="12" rx="3.5" ry="6" fill="#e6d6ff"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke-width="3"/>',
  minus: '<path d="M5 12h14" stroke-width="3"/>',
  sk_souffle: '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="currentColor"/><path d="M12 10v6M9 13h6" stroke="#f4c63d" stroke-width="2.2"/>',
  sk_riposte: '<path d="M17.5 8.5A6.5 6.5 0 1 0 19 15" fill="none" stroke="currentColor" stroke-width="2.8"/><path d="M13.5 4.5l6.5 3-5 4.5z" fill="currentColor" stroke="none"/>',
  sk_furie: '<path d="M12 2.5c1.6 3.4 5.8 5.6 5.8 10.6a5.8 5.8 0 0 1-11.6 0c0-2.6 1.4-4.4 2.6-6 .1 1.8.8 3 1.9 3.4-.8-2.6-.2-5.6 1.3-8z" fill="currentColor"/>',
  sk_peau: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z" fill="currentColor"/><path d="M12 7v10M8 11h8" stroke="#f4c63d" stroke-width="1.8"/>',
  sk_fracas: '<path d="M12 2l2.2 5.4 5.6-1.6-3 5 4.6 3.2-5.6.8.8 5.8-4.6-3.6-4.6 3.6.8-5.8-5.6-.8 4.6-3.2-3-5 5.6 1.6z" fill="currentColor"/>',
  sk_soif: '<path d="M12 3c3 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.5 6-11z" fill="currentColor"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.6 2.6" stroke="#f4c63d" stroke-width="1.6" fill="none"/>',
  sk_regard: '<path d="M2.5 12S6.5 5.5 12 5.5 21.5 12 21.5 12 17.5 18.5 12 18.5 2.5 12 2.5 12z" fill="currentColor"/><ellipse cx="12" cy="12" rx="2.2" ry="4.2" fill="#f4c63d" stroke="none"/>',
  sk_premier: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5" stroke="currentColor" stroke-width="2.2"/>',
  sk_fantome: '<path d="M5.5 21V11a6.5 6.5 0 0 1 13 0v10l-2.2-1.8-2.1 1.8-2.2-1.8-2.2 1.8-2.1-1.8z" fill="currentColor"/><circle cx="9.5" cy="11" r="1.4" fill="#f4c63d" stroke="none"/><circle cx="14.5" cy="11" r="1.4" fill="#f4c63d" stroke="none"/>',
  sk_colere: '<path d="M13.5 2L5 13.5h6L9.5 22 19 9.5h-6z" fill="currentColor"/>',
  gear: '<path d="M12 2.8l1.6 2.3 2.7-.7.5 2.8 2.6 1.2-1.1 2.6 1.1 2.6-2.6 1.2-.5 2.8-2.7-.7L12 21.2l-1.6-2.3-2.7.7-.5-2.8-2.6-1.2 1.1-2.6-1.1-2.6 2.6-1.2.5-2.8 2.7.7z" fill="#c9c2e6"/><circle cx="12" cy="12" r="3.2" fill="#3a2f63"/>',
  t_devaste: '<path d="M12 2l2.2 5.4 5.6-1.6-3 5 4.6 3.2-5.6.8.8 5.8-4.6-3.6-4.6 3.6.8-5.8-5.6-.8 4.6-3.2-3-5 5.6 1.6z" fill="#ff9a3c"/>',
  t_brise: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z" fill="#cfd6de"/><path d="M12 4l-2 5 3 2-2.5 4 1.5 5" stroke-width="2"/>',
  t_bouclier: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z" fill="#7fd6ff"/><path d="M12 6.5v11" stroke="#fff" stroke-width="2"/>',
  t_balayage: '<path d="M3.5 15a9 9 0 0 1 17 0" fill="none" stroke-width="3.2"/><path d="M3.5 15a9 9 0 0 1 17 0" fill="none" stroke="#ffd84a" stroke-width="1.6"/><path d="M18 11.5l3 3.8-4.6.6z" fill="#ffd84a"/>',
  t_cri: '<path d="M5 8.5h4l5-4v15l-5-4H5z" fill="#ffd84a"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke-width="2"/>',
  t_soin: '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" fill="#5fd38a"/><path d="M12 10v6M9 13h6" stroke="#fff" stroke-width="2.2"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3.5" fill="#efe4c8"/><circle cx="8.5" cy="8.5" r="1.4" fill="#1c130e"/><circle cx="15.5" cy="15.5" r="1.4" fill="#1c130e"/><circle cx="12" cy="12" r="1.4" fill="#1c130e"/>',
};
function icon(name, size) {
  const s = size || 20;
  const span = h('span', { class: 'ico', style: { width: s + 'px', height: s + 'px' } });
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="#2a1f3d" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${ICONS[name] || ''}</svg>`;
  return span;
}
const itemIcon = it => it.slot === 'pet' ? 'paw' : it.base;
const rarityBg = r => [`#ece9f2`, `#cfe5ff`, `#ead6ff`, `#ffeab0`][r];

function xpTag(n, size) { return h('span', { class: 'soulc num' }, icon('xp', size || 20), fmt(n) + ' XP'); }

function hpBar(cur, max, cls) {
  const p = clamp(cur / max, 0, 1) * 100;
  return h('div', { class: 'bar ' + (cls || '') }, h('div', { class: 'trail', style: { width: p + '%' } }), h('div', { class: 'fill', style: { width: p + '%' } }), h('div', { class: 'txt num' }, `${fmt(cur)} / ${fmt(max)}`));
}
function setBar(bar, cur, max) {
  const p = clamp(cur / max, 0, 1) * 100 + '%';
  bar.querySelector('.fill').style.width = p; bar.querySelector('.trail').style.width = p;
  bar.querySelector('.txt').textContent = `${fmt(Math.max(0, cur))} / ${fmt(max)}`;
}

function itemTile(it, o) {
  o = o || {};
  if (!it) { const e = h('button', { class: 'tile empty', 'aria-label': o.empty || 'Vide', onclick: o.onclick }, o.emptyIcon ? icon(o.emptyIcon, 30) : null); if (o.emptyIcon) e.firstChild.style.opacity = '.35'; return e; }
  return h('button', { class: 'tile', style: { '--rbg': rarityBg(it.rarity), borderColor: it.rarity ? mix(RARITIES[it.rarity].color, '#2a1f3d', .35) : null }, onclick: o.onclick, 'aria-label': it.name },
    (() => { const ic = icon(itemIcon(it), o.size || 34); if (it.slot === 'pet') ic.style.color = (bossPetDef(it) || PETS[it.species]).col; return ic; })(),
    h('span', { class: 'lv num' }, it.ilvl),
    o.delta != null ? h('span', { class: 'dl num ' + (o.delta > 0 ? 'pos' : 'neg') }, o.delta > 0 ? '▲' + fmt(o.delta) : o.delta < 0 ? '▼' : '=') : o.up ? h('span', { class: 'up' }, '▲') : null,
    it.isNew && o.showNew ? h('span', { class: 'new' }) : null);
}

function itemMainStat(it) {
  if (it.slot === 'weapon') return { k: 'Dégâts', v: it.dmg.toString().replace('.', ',') };
  if (it.slot === 'armor') return { k: 'Armure', v: it.armor };
  if (it.slot === 'pet') { const p = petStats(it); return { k: 'PV ' + p.maxHp + ' · Dégâts', v: Math.round(p.dmg) }; }
  return null;
}

function overlay(content, o) {
  o = o || {};
  const ov = h('div', { class: 'ov' + (o.center ? ' center' : '') });
  const close = () => { ov.remove(); o.onclose && o.onclose(); };
  ov.addEventListener('click', e => { if (e.target === ov && o.dismiss !== false) close(); });
  const sheet = h('div', { class: 'sheet' }, typeof content === 'function' ? content(close) : content);
  ov.append(sheet);
  document.getElementById('app').append(ov);
  return { el: ov, sheet, close };
}

function toast(msg) {
  const t = h('div', { class: 'toast' }, msg);
  document.getElementById('app').append(t);
  setTimeout(() => t.remove(), 2300);
}

/* Portrait animé (tête) réutilisable */
function portrait(ent, equip, face, cls) {
  const cv = h('canvas', { class: cls || '' });
  const v = makeView(ent, equip || {}, face === -1 ? 'R' : 'L', 0, 0);
  attachPreview(cv, () => v, { zoom: 1.75, cy: -92 });
  return cv;
}
function fullPreview(ent, equip, face, cls, zoom) {
  const cv = h('canvas', { class: cls || '' });
  const v = makeView(ent, equip || {}, face === -1 ? 'R' : 'L', 0, 0);
  attachPreview(cv, () => v, { zoom: (zoom || 1) * .86, dy: 10 });
  cv._view = v;
  return cv;
}
function petPreview(pet, face, cls, zoom) {
  const cv = h('canvas', { class: cls || '' });
  const v = makePetView(pet, face === -1 ? 'R' : 'L', 0, 0);
  attachPreview(cv, () => v, { zoom: zoom || 1.6, dy: 14 });
  return cv;
}
