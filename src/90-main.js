/* ===== MAIN : état, sauvegarde, écrans ===== */
const SAVE_KEY = 'fighters.save.v2';
const INV_MAX = 60;
let S = null, tab = 'tour', alloc = null;
let _enemies = {};

function save() {
  if (S) S.savedAt = Date.now();
  try { if (S) localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* stockage navigateur indisponible */ }
  cloudPush();
}

/* ---------- Sauvegarde cloud (capacité db de la page publiée) ----------
   Une partie par personne, privée : data/users/<id>/save. Le navigateur sert de cache et de secours. */
const Cloud = { ref: null, status: 'local', busy: false, dirty: false, timer: null };
async function cloudInit() {
  const C = window.claude;
  if (!C || !C.use) return;
  try {
    const [db, user] = await Promise.all([C.use('db'), C.use('user')]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    const ref = db.doc('data/users/' + id + '/save');
    const snap = await Promise.race([ref.get(), new Promise((_, rej) => setTimeout(() => rej({ code: 'timeout' }), 10000))]);
    Cloud.ref = ref; Cloud.status = 'cloud';
    const d = snap.exists ? snap.data() : null;
    if (d && typeof d.json === 'string') {
      const remote = JSON.parse(d.json);
      if (remote && remote.v === 2 && (!S || (remote.savedAt || 0) > (S.savedAt || 0))) {
        S = remote; _enemies = {}; try { localStorage.setItem(SAVE_KEY, d.json); } catch (e) { }
        if (!document.querySelector('.fight')) render();
        toast('Partie restaurée');
        return;
      }
    }
    if (S) cloudPush();
  } catch (e) { Cloud.ref = null; Cloud.status = 'local'; }
}
function cloudPush() {
  if (!Cloud.ref) return;
  clearTimeout(Cloud.timer);
  Cloud.timer = setTimeout(cloudWrite, 700);
}
async function cloudWrite() {
  if (!Cloud.ref) return;
  if (Cloud.busy) { Cloud.dirty = true; return; }
  Cloud.busy = true; Cloud.dirty = false;
  try {
    if (S) await Cloud.ref.set({ json: JSON.stringify(S), savedAt: S.savedAt || Date.now() });
    else await Cloud.ref.delete();
    Cloud.status = 'cloud';
  } catch (e) {
    const c = e && e.code;
    if (c === 'unavailable') Cloud.dirty = true;
    else { Cloud.ref = null; Cloud.status = 'local'; }
  }
  Cloud.busy = false;
  if (Cloud.dirty) { Cloud.dirty = false; setTimeout(cloudWrite, 1500); }
}
function load() { try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
const heroStats = () => computeStats(S.hero, S.equip);
const myPets = () => S.pets.slice(0, petSlots(S.hero.level)).filter(Boolean);
function enemyAt(f) { const k = f + ':' + S.world; return _enemies[k] || (_enemies[k] = makeEnemy(f, S.world)); }
const randomName = () => { const r = makeRng((Math.random() * 1e9) | 0); return r.pick(NAME_A) + r.pick(NAME_B); };
const rnd = () => makeRng((Math.random() * 2 ** 31) | 0);

/* Codex : tout ce que le héros a déjà possédé (armes, familiers). Pouvoirs = hero.skills. */
function note(it) {
  if (!S.codex) S.codex = { w: {}, p: {} };
  if (it.slot === 'weapon') S.codex.w[it.base] = 1;
  if (it.slot === 'pet') S.codex.p[it.bossPet || it.species] = 1;
}
function ensureCodex() {
  if (S.codex) return;
  S.codex = { w: {}, p: {} };
  [...S.inv, ...Object.values(S.equip), ...S.pets].filter(Boolean).forEach(note);
}
function newGame(name, look, origin) {
  S = { v: 2, world: (Math.random() * 1e9) | 0, hero: newHero(name, look, origin), equip: { weapon: starterWeapon(origin) }, pets: [null, null, null], inv: [],
    portals: [1], best: 0, stats: { runs: 0, wins: 0, deaths: 0, fights: 0 }, run: null, lastRun: null, pendingChoice: null, tips: {}, sound: true, speed: 1, codex: { w: {}, p: {} } };
  note(S.equip.weapon);
  save();
}

/* ---------- Run rogue-lite ---------- */
function startRun(from) {
  S.run = { start: from, floor: from, hp: heroStats().maxHp, flasks: 3, xp: 0, loot: [], wins: 0 };
  S.stats.runs++; save();
}
function secureLoot() {
  const run = S.run; let overflow = 0;
  for (const it of run.loot) { S.inv.push(it); note(it); }
  while (S.inv.length > INV_MAX) { const worst = S.inv.reduce((a, b) => (itemScore(b) < itemScore(a) ? b : a)); S.inv.splice(S.inv.indexOf(worst), 1); overflow += salvageValue(worst); }
  run.xp += overflow;
  const n = run.loot.length; run.loot = []; return n;
}
function endRun(reason) {
  const run = S.run, from = S.hero.level;
  const lost = reason === 'death' ? run.loot.length : 0;
  const secured = reason === 'death' ? 0 : secureLoot();
  if (reason === 'death') run.loot = [];
  const kept = reason === 'death' ? Math.floor(run.xp * DEATH_XP_KEEP) : run.xp;
  const levels = grantXp(S.hero, kept);
  S.lastRun = { reason, start: run.start, reached: run.floor - (reason === 'death' ? 0 : 1), wins: run.wins, xp: kept, xpLost: run.xp - kept, from, to: S.hero.level, points: levels * POINTS_PER_LEVEL, lost, secured };
  S.run = null; save();
}
function applyOutcome(en, res) {
  const run = S.run, floor = run.floor, st = heroStats();
  S.stats.fights++;
  const out = { floor, win: res.winner === 'L', boss: en.boss };
  if (!out.win) { S.stats.deaths++; out.lostLoot = run.loot.length; endRun('death'); return out; }
  S.stats.wins++; run.wins++;
  out.xp = Math.round(xpReward(floor) * (1 + st.xpBonus)); run.xp += out.xp;
  out.loot = lootForFloor(rnd(), floor, en.boss, 0);
  run.loot.push(...out.loot);
  out.healed = Math.min(st.maxHp - res.heroHp, Math.round(st.maxHp * WIN_HEAL));
  run.hp = res.heroHp + out.healed;
  if (floor > S.best) { S.best = floor; out.record = true; }
  if (floor % 5 === 0) { out.sanctuary = true; run.hp = st.maxHp; run.flasks = 3; }
  if (floor % 10 === 0 && !S.portals.includes(floor + 1)) { S.portals.push(floor + 1); out.portal = floor + 1; }
  run.floor++;
  return out;
}

/* ---------- Équipement et familiers ---------- */
function bestSlotFor(it) {
  if (it.slot === 'pet') { const n = petSlots(S.hero.level); for (let i = 0; i < n; i++) if (!S.pets[i]) return i; let w = -1, wp = Infinity; for (let i = 0; i < n; i++) { const p = petStats(S.pets[i]).power; if (p < wp) { wp = p; w = i; } } return w; }
  if (it.slot !== 'talisman') return it.slot;
  if (!S.equip.tal1) return 'tal1'; if (!S.equip.tal2) return 'tal2';
  return computeStats(S.hero, { ...S.equip, tal1: it }).power >= computeStats(S.hero, { ...S.equip, tal2: it }).power ? 'tal1' : 'tal2';
}
function deltaFor(it, slot) {
  if (slot == null) slot = bestSlotFor(it);
  if (it.slot === 'pet') { if (slot < 0) return 0; const cur = S.pets[slot]; return Math.round((petStats(it).power - (cur ? petStats(cur).power : 0)) * .7); }
  return computeStats(S.hero, { ...S.equip, [slot]: it }).power - heroStats().power;
}
const itemScore = it => deltaFor(it) + it.rarity * 5 + (it.bossPet ? 1e6 : 0);
function equip(it, slot) {
  if (slot == null) slot = bestSlotFor(it);
  S.inv.splice(S.inv.indexOf(it), 1);
  if (it.slot === 'pet') { const old = S.pets[slot]; if (old) S.inv.push(old); S.pets[slot] = it; }
  else { const old = S.equip[slot]; if (old) { old.isNew = false; S.inv.push(old); } S.equip[slot] = it; if (S.run) S.run.hp = Math.min(S.run.hp, heroStats().maxHp); }
  it.isNew = false; save(); Sfx.play('tap'); toast(it.name + ' équipé');
}
function salvage(it) {
  S.inv.splice(S.inv.indexOf(it), 1); const v = salvageValue(it);
  if (S.run) S.run.xp += v; else grantXp(S.hero, v);
  save(); Sfx.play('xp'); return v;
}

/* ---------- Rendu racine ---------- */
function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  Music.set('menu');
  if (!S) { renderCreate(app); return; }
  const body = tab === 'tour' ? tabTour() : tab === 'heros' ? tabHero() : tabBag();
  app.append(renderTop(), body, renderNav());
}
function xpBar() {
  const need = xpToNext(S.hero.level);
  return h('div', { class: 'xpbar', title: `${S.hero.xp} / ${need} XP` }, h('i', { style: { width: clamp(S.hero.xp / need, 0, 1) * 100 + '%' } }));
}
function renderTop() {
  const st = heroStats();
  return h('div', { class: 'top' },
    portrait(S.hero, S.equip, 1, 'avatar'),
    h('div', { class: 'grow' },
      h('div', { class: 'name' }, S.hero.name),
      h('div', { class: 'sub num' }, `Niv. ${S.hero.level} · Puissance ${fmt(teamPower(st, myPets()))}`), xpBar()),
    S.hero.points || S.hero.choices ? h('button', { class: 'chip hot', onclick: () => { tab = 'heros'; render(); } }, `+${S.hero.points || ''}${S.hero.choices ? ' ★' : ''}`) : null);
}
function renderNav() {
  const nNew = S.inv.filter(i => i.isNew).length;
  const b = (id, ic, label, badge) => h('button', { class: tab === id ? 'on' : '', onclick: () => { tab = id; Sfx.play('tap'); render(); } }, icon(ic, 26), label, badge ? h('span', { class: 'badge num' }, badge) : null);
  return h('nav', { class: 'nav' }, b('tour', 'tower', 'Tour'), b('heros', 'hero', 'Héros', (S.hero.points || 0) + (S.hero.choices || 0) || null), b('sac', 'bag', 'Sac', nNew || null));
}

/* ---------- Onglet Tour ---------- */
const TIPS = {
  start: 'Un run = une montée. Après chaque victoire, tu choisis : continuer ou encaisser. Si tu tombes, tu perds le butin du run et la moitié de l\'XP.',
  loot: 'Le butin et l\'XP du run ne sont à toi qu\'en te retirant. Chaque étage de plus rapporte plus, et risque plus.',
  points: 'Tu as des points à répartir. Onglet Héros.',
  pets: 'Emplacement de familier débloqué. Les familiers se trouvent sur les étages et chez les boss.',
  portal: 'Portail ouvert : tu peux démarrer un run juste après un boss vaincu. Utile pour farmer son familier exclusif.',
};
function pickTip() {
  const want = ['start'];
  if (S.run && S.run.loot.length) want.push('loot');
  if (S.hero.points) want.push('points');
  if (petSlots(S.hero.level) > 0) want.push('pets');
  if (S.portals.length > 1) want.push('portal');
  return want.find(k => !S.tips[k]);
}
function oddsInfo(wc) {
  if (wc >= .85) return ['Écrasant', '#21a35a'];
  if (wc >= .6) return ['Favorable', '#5fb84a'];
  if (wc >= .4) return ['Incertain', '#e0a312'];
  if (wc >= .2) return ['Risqué', '#f07a2a'];
  return ['Suicidaire', '#e5484d'];
}
function foeCard(f) {
  const en = enemyAt(f), es = computeStats(en, en.equip);
  const wc = winChance(S.hero, S.equip, myPets(), S.run ? S.run.hp : null, en, 60);
  const [oLabel, oCol] = oddsInfo(wc);
  const weapon = en.equip.weapon ? WEAPONS[en.equip.weapon.base].name : 'Poings';
  const tier = tierIdx(f);
  return h('div', { class: 'panel' },
    h('div', { class: 'foe' },
      fullPreview(en, en.equip, -1, '', 1),
      h('div', { class: 'col', style: { gap: '6px', minWidth: 0 } },
        h('div', { class: 'label' }, en.boss ? `Boss · étage ${f}` : `Étage ${f}`),
        h('div', null, h('h3', null, en.name), h('div', { class: 'title' }, en.title)),
        h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '5px' } },
          h('span', { class: 'chip' }, weapon),
          en.skills.length ? h('span', { class: 'chip', title: en.skills.map(s => SKILLS[s].name).join(', ') }, en.skills.length + ' pouvoir' + (en.skills.length > 1 ? 's' : '')) : null,
          en.pets.length ? h('span', { class: 'chip' }, icon('paw', 14), en.pets.map(p => PETS[p.species].name).join(', ')) : null),
        h('div', { class: 'row num', style: { fontSize: '13px', gap: '12px' } }, h('span', null, `PV ${fmt(es.maxHp)}`), h('span', null, `Puiss. ${fmt(teamPower(es, en.pets))}`)),
        h('div', { class: 'odds' }, h('div', { class: 'meter' }, h('i', { style: { width: Math.round(wc * 100) + '%', background: oCol } })), h('b', { class: 'num', style: { color: oCol } }, Math.round(wc * 100) + '%')),
        h('div', { style: { fontSize: '12px', color: oCol } }, oLabel))),
    en.boss ? h('div', { class: 'excl' }, icon('paw', 18), `Butin exclusif : ${BOSS_PETS[tier].name} · ${Math.round(BOSS_PET_CHANCE * 100)}%`) : null);
}
function tabTour() {
  const sc = h('div', { class: 'scroll' });
  const f = S.run ? S.run.floor : Math.max(...S.portals), T = tierOf(f);
  sc.append(h('div', { class: 'col', style: { gap: '6px' } },
    h('div', { class: 'tier' }, h('h2', null, T.name), h('span', { class: 'label num' }, `Palier ${tierIdx(f) + 1} / 10`)),
    h('div', { class: 'prog' }, h('i', { style: { width: Math.min(100, S.best) + '%' } })),
    h('div', { class: 'row label num', style: { justifyContent: 'space-between' } }, h('span', null, `Record : étage ${S.best}`), h('span', null, `Sommet : ${TOWER_TOP}`))));
  const tip = pickTip();
  if (tip) sc.append(h('div', { class: 'tip' }, icon('xp', 20), h('span', null, TIPS[tip]), h('button', { 'aria-label': 'Fermer', onclick: () => { S.tips[tip] = 1; save(); render(); } }, '×')));
  if (S.run) runView(sc); else campView(sc);
  return sc;
}
function campView(sc) {
  if (S.lastRun) sc.append(runSummary(S.lastRun, true));
  if (S.hero.points || S.hero.choices) sc.append(h('button', { class: 'btn btn-soul', onclick: () => { tab = 'heros'; render(); } }, icon('xp', 22), S.hero.points ? `${S.hero.points} points à répartir` : 'Choix de la Brute disponible'));
  const pick = h('div', { class: 'portals' });
  let sel = S.portals.includes(S._portalSel) ? S._portalSel : Math.max(...S.portals);
  const drawP = () => { pick.innerHTML = ''; S.portals.slice().sort((a, b) => a - b).forEach(p => pick.append(h('button', { class: 'pill' + (p === sel ? ' on' : ''), onclick: () => { sel = S._portalSel = p; drawP(); go.textContent = `Lancer un run · étage ${sel}`; } }, icon(p === 1 ? 'tower' : 'portal', 16), p === 1 ? 'Étage 1' : `Étage ${p}`))); };
  drawP();
  const go = h('button', { class: 'btn btn-gold btn-big', onclick: () => { startRun(sel); render(); } }, `Lancer un run · étage ${sel}`);
  sc.append(h('div', { class: 'panel col' }, h('div', { class: 'label' }, 'Point de départ'), pick,
    h('div', { style: { fontSize: '12px', color: 'var(--muted-ink)' } }, 'Chaque boss vaincu ouvre un portail juste après lui.')));
  sc.append(foeCard(sel), go);
}
function runView(sc) {
  const run = S.run, st = heroStats();
  const canDrink = run.flasks > 0 && run.hp < st.maxHp;
  const flasks = h('div', { class: 'flasks' }); for (let i = 0; i < 3; i++) flasks.append(icon(i < run.flasks ? 'flask' : 'flaskE', 22));
  const nextSanct = Math.ceil(run.floor / 5) * 5;
  sc.append(h('div', { class: 'panel dark col' },
    h('div', { class: 'row' }, h('span', { class: 'label' }, `Run · départ étage ${run.start}`)),
    stakeLine(run),
    h('div', { class: 'row', style: { fontSize: '12px', color: 'var(--muted)' } }, icon('flame', 16), h('span', { class: 'grow' }, `Prochain sanctuaire (vie et fioles) : étage ${nextSanct}`)),
    h('div', { class: 'row' }, icon('heart', 18), h('span', { class: 'label' }, 'Vie'), h('span', { class: 'grow' }), flasks, h('button', { class: 'btn btn-sm btn-blood', disabled: !canDrink, onclick: drink }, 'Boire')),
    hpBar(run.hp, st.maxHp)));
  sc.append(foeCard(run.floor));
  sc.append(h('button', { class: 'btn btn-gold btn-big', onclick: startFight }, `Combattre · étage ${run.floor}`));
  sc.append(h('button', { class: 'btn btn-soul', onclick: confirmRetreat }, icon('xp', 20), `Encaisser ${fmt(run.xp)} XP${run.loot.length ? ' et ' + run.loot.length + ' objet' + (run.loot.length > 1 ? 's' : '') : ''}`));
  const strip = h('div', { class: 'strip' });
  for (let n = run.floor + 4; n >= Math.max(run.start, run.floor - 1); n--) {
    const tags = h('span', { class: 'tag' });
    if (n % 10 === 0) tags.append(icon('skull', 18));
    if (n % 5 === 0) tags.append(icon('flame', 18));
    const label = n < run.floor ? 'Vaincu' : n === run.floor ? `${enemyAt(n).name} ${enemyAt(n).title}` : n % 10 === 0 ? 'Boss du palier' : n % 5 === 0 ? 'Sanctuaire' : '?';
    strip.append(h('div', { class: 'floor' + (n < run.floor ? ' done' : '') + (n === run.floor ? ' cur' : '') }, h('span', { class: 'n num' }, n), h('span', null, label), tags));
  }
  sc.append(h('div', { class: 'label', style: { marginTop: '4px' } }, 'La tour'), strip);
}
function stakeLine(run, big) {
  const lose = Math.ceil(run.xp * (1 - DEATH_XP_KEEP));
  return h('div', { class: 'stake' + (big ? ' big' : '') },
    h('div', { class: 'row' }, icon('lock', 18), h('b', { class: 'grow' }, 'En jeu'), xpTag(run.xp, 16), h('span', { class: 'num' }, `· ${run.loot.length} obj.`)),
    h('div', { class: 'risk' }, run.xp || run.loot.length ? `Si tu tombes : −${run.loot.length} obj. et −${fmt(lose)} XP.` : 'Rien en jeu pour l\'instant.'));
}
function drink() { const mx = heroStats().maxHp; S.run.flasks--; S.run.hp = Math.min(mx, S.run.hp + Math.round(mx * .4)); save(); Sfx.init(); Sfx.play('heal'); render(); }
function confirmRetreat() {
  overlay(close => [
    h('h2', null, 'Se retirer ?'),
    h('p', { style: { margin: 0, lineHeight: 1.45, textAlign: 'center' } }, `Tu encaisses ${fmt(S.run.xp)} XP et ${S.run.loot.length} objet${S.run.loot.length > 1 ? 's' : ''}. Le run se termine.`),
    h('button', { class: 'btn btn-soul', onclick: () => { close(); endRun('retreat'); Sfx.play('level'); render(); } }, 'Encaisser'),
    h('button', { class: 'btn btn-stone', onclick: close }, 'Continuer'),
  ], { center: true });
}
function runSummary(L, compact) {
  const title = L.reason === 'death' ? 'Run terminé : tombé' : 'Run terminé : retraite';
  return h('div', { class: 'panel col summary' },
    h('div', { class: 'row' }, h('b', { class: 'grow', style: { fontFamily: 'var(--f-display)', fontSize: '18px', fontWeight: 400 } }, title),
      compact ? h('button', { class: 'x', 'aria-label': 'Fermer', onclick: () => { S.lastRun = null; save(); render(); } }, '×') : null),
    h('div', { class: 'sumgrid num' },
      h('div', null, h('span', null, 'Étages'), h('b', null, `${L.start} → ${L.reached}`)),
      h('div', null, h('span', null, 'XP'), h('b', null, '+' + fmt(L.xp) + (L.xpLost ? ` (−${fmt(L.xpLost)})` : ''))),
      h('div', null, h('span', null, 'Niveau'), h('b', null, L.to > L.from ? `${L.from} → ${L.to}` : L.to)),
      h('div', null, h('span', null, 'Butin'), h('b', null, L.reason === 'death' ? (L.lost ? `${L.lost} perdu${L.lost > 1 ? 's' : ''}` : '0') : `${L.secured} gardé${L.secured > 1 ? 's' : ''}`))),
    L.points ? h('div', { style: { fontSize: '13px', color: '#21a35a' } }, `+${L.points} points de stats gagnés.`) : null);
}

/* ---------- Combat ---------- */
async function startFight() {
  Sfx.init(); Sfx.on = S.sound;
  try { await document.fonts.load('20px "Lilita One"'); } catch (e) { /* police de secours */ }
  const en = enemyAt(S.run.floor);
  const heroEnt = JSON.parse(JSON.stringify(S.hero)), heroEq = JSON.parse(JSON.stringify(S.equip)), pets = JSON.parse(JSON.stringify(myPets()));
  const res = simulateFight(S.hero, S.equip, pets, S.run.hp, en, (Math.random() * 2 ** 31) | 0);
  const out = applyOutcome(en, res);
  save();
  showFight(heroEnt, heroEq, pets, en, res, out);
}
function showFight(heroEnt, heroEq, pets, en, res, out) {
  const app = document.getElementById('app');
  Music.set('fight');
  const U = res.units, bars = {};
  const side = (id, ent, eq, cls) => {
    const petIds = Object.keys(U).filter(k => k[0] === id && k.length > 1);
    bars[id] = hpBar(U[id].start != null ? U[id].start : U[id].max, U[id].max);
    const minis = h('div', { class: 'minis' }); petIds.forEach(k => { const b = h('div', { class: 'mini' }, h('i', { style: { width: '100%' } })); bars[k] = b; minis.append(b); });
    return h('div', { class: 'side ' + cls }, portrait(ent, eq, id === 'L' ? 1 : -1, 'pc'), h('div', { style: { minWidth: 0 } }, h('div', { class: 'nm' }, ent.name), bars[id], minis));
  };
  const canvas = h('canvas', { class: 'arena' });
  const logBox = h('div', { class: 'flog' });
  const spd = h('button', { class: 'btn btn-sm btn-stone num' }, 'x' + S.speed);
  const skip = h('button', { class: 'btn btn-sm btn-stone grow' }, 'Passer');
  const root = h('div', { class: 'fight' },
    h('div', { class: 'hud' }, side('L', heroEnt, heroEq, ''), h('div', { class: 'fl' }, 'Étage', h('b', { class: 'num' }, out.floor)), side('R', en, en.equip, 'r')),
    canvas, logBox, h('div', { class: 'fctl' }, spd, skip));
  app.append(root);
  const fp = new FightPlayer(canvas, {
    heroEnt, heroEquip: heroEq, heroPets: pets, enemy: en, res, floor: out.floor, speed: S.speed,
    onHp: hp => { for (const k in hp) { if (!bars[k]) continue; if (k.length === 1) setBar(bars[k], hp[k], U[k].max); else bars[k].firstChild.style.width = clamp(hp[k] / U[k].max, 0, 1) * 100 + '%'; } },
    onLog: (t, sd) => { logBox.append(h('div', { class: sd }, t)); while (logBox.children.length > 6) logBox.firstChild.remove(); },
  });
  spd.onclick = () => { S.speed = S.speed >= 3 ? 1 : S.speed + 1; fp.speed = S.speed; spd.textContent = 'x' + S.speed; save(); };
  skip.onclick = () => { skip.disabled = true; fp.skip(); };
  fp.run().then(() => {
    if (fp.skipped) fp.finalize();
    skip.disabled = true;
    setTimeout(() => out.win ? showVictory(out, fp, root) : showDeath(out, fp, root), fp.skipped ? 200 : 100);
  });
}
function leaveFight(fp, root) { fp.destroy(); root.remove(); render(); }
function lootRow(it, i, locked) {
  const ms = itemMainStat(it);
  return h('div', { class: 'loot' + (it.bossPet ? ' legend' : ''), style: { animationDelay: (300 + i * 180) + 'ms' } },
    itemTile(it, { size: 30 }),
    h('div', { style: { minWidth: 0 } },
      h('b', { style: { color: it.rarity ? mix(RARITIES[it.rarity].color, '#2a1f3d', .35) : 'var(--ink)' } }, it.name),
      h('small', null, `${itemTypeName(it)} · ${RARITIES[it.rarity].name}${ms ? ' · ' + ms.k + ' ' + ms.v : ''}`)),
    locked ? icon('lock', 20) : null);
}
function showVictory(out, fp, root) {
  Sfx.play('xp');
  const run = S.run, st = heroStats();
  const items = [
    h('h2', { class: 'win' }, out.boss ? 'BOSS VAINCU' : 'VICTOIRE'),
    h('div', { class: 'row', style: { justifyContent: 'center', gap: '14px' } }, h('span', { class: 'label' }, `Étage ${out.floor}`), xpTag(out.xp, 22), out.record ? h('span', { class: 'chip', style: { background: 'var(--gold)' } }, 'Record') : null),
  ];
  out.loot.forEach((it, i) => items.push(lootRow(it, i, true)));
  if (out.portal) items.push(h('div', { class: 'tip' }, icon('portal', 20), h('span', null, `Portail ouvert : tu pourras démarrer tes prochains runs à l'étage ${out.portal}.`)));
  if (out.sanctuary) items.push(h('div', { class: 'tip warm' }, icon('flame', 20), h('span', null, `Sanctuaire : vie et fioles restaurées. Ton butin reste en jeu.`)));
  const nx = enemyAt(run.floor), wc = winChance(S.hero, S.equip, myPets(), run.hp, nx, 50), [lab, col] = oddsInfo(wc);
  items.push(h('div', { class: 'col', style: { gap: '4px' } },
    h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'label' }, out.healed && !out.sanctuary ? `Vie · +${out.healed}` : 'Vie'), h('span', { style: { fontSize: '13px' } }, 'Étage ', h('b', { class: 'num' }, run.floor), ' : ', h('b', { style: { color: col } }, `${lab} ${Math.round(wc * 100)}%`))),
    hpBar(run.hp, st.maxHp)));
  items.push(stakeLine(run, true));
  items.push(h('div', { class: 'decide' },
    h('button', { class: 'btn btn-gold', onclick: () => { ov.close(); leaveFight(fp, root); startFight(); } }, h('span', null, 'Continuer', h('small', null, `étage ${run.floor} · ${Math.round(wc * 100)}%`))),
    h('button', { class: 'btn btn-soul', onclick: () => { ov.close(); endRun('retreat'); Sfx.play('level'); leaveFight(fp, root); } }, h('span', null, 'Encaisser', h('small', null, `${fmt(run.xp)} XP · ${run.loot.length} obj.`)))));
  items.push(h('button', { class: 'btn btn-ghost', onclick: () => { ov.close(); leaveFight(fp, root); } }, 'Préparer (sac, héros) avant de décider'));
  const ov = overlay(items, { dismiss: false });
}
function showDeath(out, fp, root) {
  Sfx.play('death'); Music.set(null);
  const L = S.lastRun;
  const scr = h('div', { class: 'souls-screen dead' },
    h('h1', null, 'Tu es tombé'),
    h('p', null, `Étage ${out.floor}. Perdu : ${out.lostLoot ? `${out.lostLoot} objet${out.lostLoot > 1 ? 's' : ''} et ` : ''}${fmt(L.xpLost)} XP.`),
    h('p', { class: 'keep' }, `Tu gardes ${fmt(L.xp)} XP (la moitié).${L.to > L.from ? ` Niveau ${L.from} → ${L.to} : +${L.points} points.` : ''}`),
    h('button', { class: 'btn btn-gold', onclick: () => { scr.remove(); leaveFight(fp, root); if (S.hero.points) { tab = 'heros'; render(); } } }, L.points ? 'Répartir mes points' : 'Se relever'));
  document.getElementById('app').append(scr);
}

/* ---------- Onglet Héros : répartition des points ---------- */
function tabHero() {
  const sc = h('div', { class: 'scroll' });
  if (!alloc) alloc = { str: 0, agi: 0, spd: 0, end: 0 };
  const used = STAT_KEYS.reduce((a, k) => a + alloc[k], 0), left = S.hero.points - used;
  const preview = { ...S.hero, base: { ...S.hero.base } }; for (const k of STAT_KEYS) preview.base[k] += alloc[k];
  const st0 = heroStats(), st = computeStats(preview, S.equip);
  sc.append(h('div', { class: 'panel' },
    h('div', { class: 'hero-card' },
      fullPreview(S.hero, S.equip, 1, '', 1.1),
      h('div', { class: 'col', style: { gap: '4px', minWidth: 0 } },
        h('div', { class: 'label' }, `${ORIGINS[S.hero.origin].name} · niveau ${S.hero.level}`),
        h('h2', { style: { fontSize: '26px', overflowWrap: 'anywhere' } }, S.hero.name),
        h('div', { class: 'label', style: { marginTop: '6px' } }, `XP ${fmt(S.hero.xp)} / ${fmt(xpToNext(S.hero.level))}`), xpBar(),
        h('div', { class: 'label', style: { marginTop: '6px' } }, 'Puissance'),
        h('div', { class: 'power num' }, fmt(teamPower(st, myPets())), st.power !== st0.power ? h('small', { class: 'delta-up' }, ` +${fmt(st.power - st0.power)}`) : null),
        h('div', { style: { fontSize: '12px', color: 'var(--muted-ink)' } }, `${S.stats.runs} runs · record étage ${S.best}`)))));
  if (S.hero.choices) sc.append(choicePanel());
  const rows = h('div', { class: 'alloc' });
  for (const k of STAT_KEYS) {
    const gear = st0[k] - S.hero.base[k];
    rows.append(h('div', { class: 'arow' },
      h('div', { class: 'grow' }, h('b', null, STAT_NAMES[k]), h('small', null, STAT_HINT[k])),
      h('button', { class: 'pm', 'aria-label': 'Retirer', disabled: !alloc[k], onclick: () => { alloc[k]--; render(); } }, icon('minus', 18)),
      h('span', { class: 'val num' }, S.hero.base[k] + alloc[k], gear ? h('small', null, ` +${gear}`) : null, alloc[k] ? h('em', null, ` (+${alloc[k]})`) : null),
      h('button', { class: 'pm plus', 'aria-label': 'Ajouter', disabled: left <= 0, onclick: () => { alloc[k]++; Sfx.play('tap'); render(); } }, icon('plus', 18))));
  }
  sc.append(h('div', { class: 'panel col' },
    h('div', { class: 'row' }, h('span', { class: 'label grow' }, 'Statistiques'), h('span', { class: 'chip' + (left ? ' hot' : '') }, `${left} point${left > 1 ? 's' : ''} libre${left > 1 ? 's' : ''}`)),
    rows,
    S.hero.points ? h('div', { class: 'row' },
      h('button', { class: 'btn btn-sm btn-stone', onclick: () => { autoAlloc(left); render(); } }, 'Conseil'),
      h('button', { class: 'btn btn-sm btn-gold grow', disabled: !used, onclick: () => { for (const k of STAT_KEYS) S.hero.base[k] += alloc[k]; S.hero.points -= used; alloc = null; save(); Sfx.play('level'); toast('Points attribués'); render(); } }, used ? `Valider ${used} point${used > 1 ? 's' : ''}` : 'Valider')) : null));
  const d = (k, a, b, f) => h('div', null, h('span', null, k), h('b', { class: 'num' }, f(b), a !== b ? h('small', { class: b > a ? 'delta-up' : 'delta-down' }, ' ' + (b > a ? '▲' : '▼')) : null));
  const p1 = v => pct(v), r0 = v => fmt(v);
  sc.append(h('div', { class: 'panel' }, h('div', { class: 'label', style: { marginBottom: '6px' } }, 'Au combat'),
    h('div', { class: 'derived' },
      d('PV max', st0.maxHp, st.maxHp, r0), d('Dégâts', Math.round(st0.dmg), Math.round(st.dmg), r0), d('Armure', st0.armor, st.armor, r0), d('Vitesse', st0.speed, st.speed, v => round1(v).toString().replace('.', ',')),
      d('Esquive', st0.evade, st.evade, p1), d('Critique', st0.crit, st.crit, p1), d('Enchaînement', st0.combo, st.combo, p1), d('Parade', st0.block, st.block, p1))));
  sc.append(codexPanel());
  sc.append(h('div', { class: 'panel col' }, h('div', { class: 'row' }, h('span', { class: 'label grow' }, 'Options'), h('span', { class: 'chip' }, `v${GAME_VERSION}`)),
    h('div', { class: 'row', style: { flexWrap: 'wrap' } },
      h('button', { class: 'btn btn-sm btn-stone', onclick: () => { S.music = S.music === false; Music.setOn(S.music); save(); render(); } }, icon(S.music !== false ? 'sound' : 'mute', 18), S.music !== false ? 'Musique activée' : 'Musique coupée'),
      h('button', { class: 'btn btn-sm btn-stone', onclick: () => { S.sound = !S.sound; Sfx.on = S.sound; save(); render(); } }, icon(S.sound ? 'sound' : 'mute', 18), S.sound ? 'Bruitages activés' : 'Bruitages coupés'),
      h('button', { class: 'btn btn-sm btn-stone', onclick: openSaveIO }, 'Sauvegarde'),
      h('button', { class: 'btn btn-sm btn-blood', onclick: confirmReset }, 'Recommencer'))));
  return sc;
}
function codexPanel() {
  ensureCodex();
  const tile = (on, ic, title, desc, how, color, legend) => {
    const ico = icon(ic, 30); if (color && on) ico.style.color = color;
    return h('button', { class: 'ctile' + (on ? '' : ' off') + (legend && on ? ' legend' : ''), 'aria-label': title, onclick: () => overlay(close => [
      h('div', { class: 'row' }, h('div', { class: 'ctile' + (on ? '' : ' off'), style: { width: '64px', flex: 'none' } }, (() => { const i2 = icon(ic, 40); if (color && on) i2.style.color = color; return i2; })()),
        h('div', { class: 'grow' }, h('h2', { style: { textAlign: 'left', fontSize: '24px' } }, title), h('div', { style: { fontSize: '13px', color: on ? '#16a34a' : 'var(--muted-ink)' } }, on ? 'Débloqué' : 'Verrouillé'))),
      h('p', { style: { margin: 0, lineHeight: 1.45 } }, desc),
      on ? null : h('div', { class: 'tip' }, icon('lock', 20), h('span', null, how)),
      h('button', { class: 'btn btn-stone', onclick: close }, 'Fermer')], { center: true }) }, ico);
  };
  const sec = (label, n, tot, tiles) => [h('div', { class: 'codex-h' }, h('span', { class: 'label' }, label), h('span', { class: 'label num' }, `${n} / ${tot}`)), h('div', { class: 'codex' }, tiles)];
  const sk = SKILL_IDS.map(id => tile(S.hero.skills.includes(id), 'sk_' + id, SKILLS[id].name, SKILLS[id].desc, `Se débloque via le Choix de la Brute, tous les ${CHOICE_EVERY} niveaux.`));
  const wk = WEAPON_DROP.map(k => tile(!!S.codex.w[k], k, WEAPONS[k].name, `Dégâts de base ${WEAPONS[k].dmg}. ${WEAPONS[k].note || ''}`.trim(), 'Se trouve dans le butin des étages.'));
  const pk = Object.keys(PETS).map(k => tile(!!S.codex.p[k], 'paw', PETS[k].name, `PV ${PETS[k].hp}, dégâts ${PETS[k].dmg}, vitesse ${PETS[k].speed} (niveau 1).`, 'Se trouve dans le butin des étages et des boss, ou via le Choix de la Brute.', PETS[k].col));
  const bk = BOSS_PETS.map((b, i) => tile(!!S.codex.p[b.id], 'paw', b.name, `Familier exclusif du boss de l'étage ${(i + 1) * 10}. Légendaire.`, `${Math.round(BOSS_PET_CHANCE * 100)}% de chance de le looter sur le boss de l'étage ${(i + 1) * 10}.`, b.col, true));
  const nW = WEAPON_DROP.filter(k => S.codex.w[k]).length, nP = Object.keys(PETS).filter(k => S.codex.p[k]).length, nB = BOSS_PETS.filter(b => S.codex.p[b.id]).length;
  return h('div', { class: 'panel col' },
    h('div', { class: 'row' }, h('b', { class: 'grow', style: { fontFamily: 'var(--f-display)', fontWeight: 400, fontSize: '19px' } }, 'Collection'), h('span', { class: 'chip' }, `${S.hero.skills.length + nW + nP + nB} / ${SKILL_IDS.length + WEAPON_DROP.length + Object.keys(PETS).length + BOSS_PETS.length}`)),
    h('div', { class: 'tip' }, icon('xp', 20), h('span', null, `Pouvoirs : un Choix de la Brute tous les ${CHOICE_EVERY} niveaux. Prochain au niveau ${(Math.floor(S.hero.level / CHOICE_EVERY) + 1) * CHOICE_EVERY}. Armes et familiers : dans le butin.`)),
    ...sec('Pouvoirs', S.hero.skills.length, SKILL_IDS.length, sk),
    ...sec('Armes', nW, WEAPON_DROP.length, wk),
    ...sec('Familiers', nP, Object.keys(PETS).length, pk),
    ...sec('Familiers de boss', nB, BOSS_PETS.length, bk));
}
function autoAlloc(left) {
  const W = ORIGINS[S.hero.origin].weights, tot = STAT_KEYS.reduce((a, k) => a + W[k], 0);
  for (let i = 0; i < left; i++) {
    let bk = STAT_KEYS[0], bd = -1e9;
    for (const k of STAT_KEYS) { const want = (S.hero.base[k] + alloc[k]) / (W[k] / tot); if (-want > bd) { bd = -want; bk = k; } }
    alloc[bk]++;
  }
}
function choicePanel() {
  if (!S.pendingChoice) { S.pendingChoice = rollChoice(S.hero, myPets().length < petSlots(S.hero.level), rnd()); save(); }
  const cards = h('div', { class: 'cards two' });
  S.pendingChoice.forEach((c, i) => {
    const L = choiceLabel(c);
    cards.append(h('button', { class: 'card' + (c.type === 'skill' ? ' skill' : c.type === 'pet' ? ' pet' : ''), style: { animationDelay: i * 90 + 'ms' }, onclick: () => {
      if (c.type === 'skill') S.hero.skills.push(c.id);
      else if (c.type === 'hp') S.hero.base.hp = (S.hero.base.hp || 0) + c.v;
      else if (c.type === 'points') S.hero.points += c.v;
      else { const p = makePet(rnd(), Math.max(1, S.hero.level), c.rarity, c.species); const slot = S.pets.findIndex((x, j) => !x && j < petSlots(S.hero.level)); p.isNew = slot < 0; note(p); if (slot >= 0) S.pets[slot] = p; else S.inv.push(p); }
      S.hero.choices--; S.pendingChoice = null; save(); Sfx.play('level'); toast(L.title); render();
    } }, c.type === 'pet' ? petPreview({ species: c.species, rarity: c.rarity, ilvl: 1 }, 1, 'cardpet', 1.4) : null, h('span', { class: 'k' }, L.sub), h('b', null, L.title), h('p', null, L.desc)));
  });
  return h('div', { class: 'panel col choice' }, h('div', { class: 'row' }, icon('xp', 22), h('b', { class: 'grow', style: { fontFamily: 'var(--f-display)', fontWeight: 400, fontSize: '19px' } }, 'Choix de la Brute'), S.hero.choices > 1 ? h('span', { class: 'chip' }, `${S.hero.choices} en attente`) : null),
    h('div', { style: { fontSize: '13px', color: 'var(--muted-ink)' } }, `Tous les ${CHOICE_EVERY} niveaux, 2 bonus sont tirés au hasard (pouvoir, familier, PV ou points). Tu en gardes un.`), cards);
}
function openSaveIO() {
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  const ta = h('textarea', { id: 'savecode', rows: 4, class: 'savecode' }); ta.value = code;
  overlay(close => [
    h('h2', null, 'Sauvegarde'),
    h('p', { style: { margin: 0, fontSize: '13px', lineHeight: 1.4 } }, 'La partie est gardée dans ce navigateur. Copie ce code pour la transférer, ou colle un code pour charger une partie.'),
    ta,
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-sm btn-stone grow', onclick: () => { ta.select(); try { navigator.clipboard.writeText(ta.value).then(() => toast('Code copié'), () => toast('Sélectionné : copie-le')); } catch (e) { toast('Sélectionné : copie-le'); } } }, 'Copier'),
      h('button', { class: 'btn btn-sm btn-gold grow', onclick: () => { try { const s = JSON.parse(decodeURIComponent(escape(atob(ta.value.trim())))); if (!s.hero || s.v !== 2) throw 0; S = s; _enemies = {}; save(); close(); render(); toast('Partie chargée'); } catch (e) { toast('Code invalide'); } } }, 'Charger')),
  ], { center: true });
}
function confirmReset() {
  overlay(close => [
    h('h2', null, 'Tout recommencer ?'),
    h('p', { style: { margin: 0, textAlign: 'center' } }, `${S.hero.name}, niveau ${S.hero.level}, record étage ${S.best}, sera effacé.`),
    h('button', { class: 'btn btn-blood', onclick: () => { close(); try { localStorage.removeItem(SAVE_KEY); } catch (e) { } S = null; _enemies = {}; tab = 'tour'; cloudPush(); render(); } }, 'Effacer et recommencer'),
    h('button', { class: 'btn btn-stone', onclick: close }, 'Annuler'),
  ], { center: true });
}

/* ---------- Onglet Sac ---------- */
function tabBag() {
  const sc = h('div', { class: 'scroll' });
  if (S.run && S.run.loot.length) sc.append(h('div', { class: 'panel col' }, h('div', { class: 'row' }, icon('lock', 18), h('span', { class: 'label grow' }, `Butin du run · en jeu`)),
    h('div', { class: 'grid' }, S.run.loot.map(it => itemTile(it, { onclick: () => openItem(it, null, true) })))));
  const slot = (key, label, ei) => h('div', null, itemTile(S.equip[key], { empty: label, emptyIcon: ei, onclick: () => S.equip[key] && openItem(S.equip[key], key) }), h('div', { class: 'slotlab' }, label));
  sc.append(h('div', { class: 'panel col' }, h('div', { class: 'label' }, 'Équipé'),
    h('div', { class: 'slots' }, slot('weapon', 'Arme', 'poings'), slot('armor', 'Armure', 'cuir'), slot('tal1', 'Talisman', 'amulette'), slot('tal2', 'Talisman', 'anneau'))));
  const nSlots = petSlots(S.hero.level);
  const petSlot = i => {
    if (i >= nSlots) return h('div', null, h('div', { class: 'tile empty locked' }, icon('lock', 22)), h('div', { class: 'slotlab' }, `Niv. ${PET_SLOT_LEVELS[i]}`));
    const p = S.pets[i];
    return h('div', null, p ? h('button', { class: 'tile petslot', style: { '--rbg': rarityBg(p.rarity) }, onclick: () => openItem(p, 'pet' + i) }, petPreview(p, 1, 'petcv', 1.5), h('span', { class: 'lv num' }, p.ilvl)) : itemTile(null, { empty: 'Familier', emptyIcon: 'paw' }), h('div', { class: 'slotlab' }, p ? PETS[p.species].name : 'Libre'));
  };
  sc.append(h('div', { class: 'panel col' }, h('div', { class: 'label' }, 'Familiers'), h('div', { class: 'slots three' }, petSlot(0), petSlot(1), petSlot(2))));
  const inv = S.inv.slice().sort((a, b) => (b.slot === 'pet') - (a.slot === 'pet') || b.rarity - a.rarity || b.ilvl - a.ilvl);
  const commons = inv.filter(i => i.rarity === 0 && deltaFor(i) <= 0);
  sc.append(h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'label num' }, `Sac · ${S.inv.length} / ${INV_MAX}`),
    commons.length ? h('button', { class: 'btn btn-sm btn-stone', onclick: () => { let t = 0; commons.slice().forEach(i => { t += salvage(i); }); toast(`+${fmt(t)} XP`); render(); } }, `Démanteler ${commons.length} communs · +${fmt(commons.reduce((a, i) => a + salvageValue(i), 0))} XP`) : null));
  if (inv.length) sc.append(h('div', { style: { fontSize: '12px', color: 'var(--muted-ink)' } }, h('b', { class: 'delta-up' }, '▲'), ' = plus fort que ce que tu portes. Touche un objet pour comparer stat par stat.'));
  if (!inv.length) sc.append(h('div', { class: 'panel', style: { textAlign: 'center', color: 'var(--muted-ink)', fontSize: '14px', lineHeight: 1.5 } }, 'Ton sac est vide. Les étages lâchent armes, armures, talismans et familiers. Sécurise-les au sanctuaire.'));
  else sc.append(h('div', { class: 'grid' }, inv.map(it => itemTile(it, { up: deltaFor(it) > 0, showNew: true, onclick: () => openItem(it) }))));
  return sc;
}
/* Comparaison claire : ce qui est équipé vs ce qui le remplacerait, stat par stat */
const CMP_ROWS = [
  ['maxHp', 'PV max', v => fmt(v)], ['dmg', 'Dégâts / coup', v => fmt(v)], ['armor', 'Armure', v => fmt(v)], ['speed', 'Vitesse', v => round1(v).toString().replace('.', ',')],
  ['evade', 'Esquive', pct], ['crit', 'Critique', pct], ['combo', 'Enchaînement', pct], ['block', 'Parade', pct],
  ['lifesteal', 'Vol de vie', pct], ['thorns', 'Épines', pct], ['regen', 'Régén. / tour', v => fmt(v)], ['xpBonus', 'Gain d\'XP', pct],
];
function compareTable(A, B, rows, onlyChanged) {
  const t = h('div', { class: 'cmp' }, h('div', { class: 'cmp-h' }, h('span', null, ''), h('span', null, 'Actuel'), h('span', null, 'Avec'), h('span', null, '')));
  for (const [k, label, f] of rows) {
    const a = A[k] || 0, b = B[k] || 0, d = b - a, same = Math.abs(d) < 1e-6 || (k === 'dmg' || k === 'maxHp' || k === 'armor') && Math.round(a) === Math.round(b);
    if (onlyChanged && same && !(a || b)) continue;
    if (onlyChanged && same) continue;
    t.append(h('div', { class: 'cmp-r' + (same ? ' same' : '') }, h('span', null, label), h('span', { class: 'num' }, f(a)), h('b', { class: 'num' }, f(b)),
      h('span', { class: 'num ' + (same ? '' : d > 0 ? 'delta-up' : 'delta-down') }, same ? '=' : d > 0 ? '▲' : '▼')));
  }
  if (t.children.length === 1) t.append(h('div', { class: 'cmp-r same' }, h('span', null, 'Aucun changement')));
  return t;
}
function powerLine(before, after) {
  const d = after - before;
  return h('div', { class: 'powerline' },
    h('div', null, h('b', null, 'Puissance '), h('span', { class: 'num' }, `${fmt(before)} → ${fmt(after)} `), h('b', { class: 'num ' + (d >= 0 ? 'delta-up' : 'delta-down') }, `(${d >= 0 ? '+' : ''}${fmt(d)})`)),
    h('small', null, 'La puissance résume attaque et défense en un chiffre. Plus haut = plus fort.'));
}
function itemOwnLines(it) {
  const ms = itemMainStat(it), note = it.slot === 'weapon' ? WEAPONS[it.base].note : null;
  const lines = h('div', { class: 'panel flat' });
  if (it.slot === 'pet') {
    const p = petStats(it);
    [['PV', p.maxHp], ['Dégâts', Math.round(p.dmg)], ['Vitesse', round1(p.speed).toString().replace('.', ',')], ['Esquive', pct(p.evade)], ['Critique', pct(p.crit)]].forEach(([k, v]) => lines.append(h('div', { class: 'affix' }, h('span', null, k), h('b', { class: 'num' }, v))));
    if (it.bossPet) lines.append(h('div', { class: 'affix' }, h('b', { style: { color: '#b07a00' } }, 'Exclusif de boss')));
    return lines;
  }
  if (ms) lines.append(h('div', { class: 'affix' }, h('span', null, ms.k), h('b', { class: 'num' }, ms.v)));
  if (it.slot === 'armor' && ARMORS[it.base].evade) lines.append(h('div', { class: 'affix' }, h('span', null, 'Esquive'), h('b', null, '+' + pct(ARMORS[it.base].evade))));
  if (it.slot === 'armor' && ARMORS[it.base].spd) lines.append(h('div', { class: 'affix' }, h('span', null, 'Vitesse'), h('b', { class: 'delta-down' }, ARMORS[it.base].spd)));
  if (note) lines.append(h('div', { class: 'affix' }, h('span', null, note)));
  for (const k in it.affixes) lines.append(h('div', { class: 'affix' }, h('b', { style: { color: '#2f6fd6' } }, affixText(k, it.affixes[k]))));
  if (!lines.children.length) lines.append(h('div', { class: 'affix' }, h('span', null, 'Aucun bonus.')));
  return lines;
}
const SLOT_NAMES = { weapon: 'Arme', armor: 'Armure', tal1: 'Talisman I', tal2: 'Talisman II' };
function openItem(it, equippedSlot, locked) {
  if (it.isNew && !locked) { it.isNew = false; save(); }
  const rc = it.rarity ? mix(RARITIES[it.rarity].color, '#2a1f3d', .35) : 'var(--ink)';
  overlay(close => {
    const head = it.slot === 'pet' ? petPreview(it, 1, 'petbig', 1.5) : h('div', { class: 'ihead' }, itemTile(it, { size: 38 }));
    const els = [h('div', { class: 'row' }, head, h('div', { class: 'grow' },
      h('h2', { style: { textAlign: 'left', fontSize: '24px', color: rc } }, it.name),
      h('div', { style: { fontSize: '13px', color: 'var(--muted-ink)' } }, `${itemTypeName(it)} · ${RARITIES[it.rarity].name} · niveau ${it.ilvl}`)))];
    els.push(itemOwnLines(it));
    if (locked) { els.push(h('div', { class: 'tip' }, icon('lock', 20), h('span', null, 'En jeu : encaisse (retraite) pour le garder. Si tu tombes, il est perdu.'))); els.push(h('button', { class: 'btn btn-stone', onclick: close }, 'Fermer')); return els; }
    if (equippedSlot) {
      els.push(h('div', { class: 'label', style: { textAlign: 'center' } }, 'Équipé'));
      if (String(equippedSlot).startsWith('pet')) els.push(h('button', { class: 'btn btn-stone', onclick: () => { const i = +equippedSlot.slice(3); S.inv.push(S.pets[i]); S.pets[i] = null; save(); close(); render(); } }, 'Retirer du combat'));
      els.push(h('button', { class: 'btn btn-stone', onclick: close }, 'Fermer'));
      return els;
    }
    if (it.slot === 'pet') {
      const n = petSlots(S.hero.level);
      if (!n) els.push(h('div', { class: 'tip' }, icon('lock', 20), h('span', null, `Premier emplacement de familier au niveau ${PET_SLOT_LEVELS[0]}.`)));
      else {
        const sl = bestSlotFor(it), cur = S.pets[sl];
        const z = { maxHp: 0, dmg: 0, speed: 0, evade: 0, crit: 0 }, A = cur ? petStats(cur) : z, B = petStats(it);
        els.push(h('div', { class: 'label' }, cur ? `Comparé à ${cur.name} (emplacement ${sl + 1})` : `Emplacement ${sl + 1} libre`));
        els.push(compareTable(A, B, CMP_ROWS.filter(r => ['maxHp', 'dmg', 'speed', 'evade', 'crit'].includes(r[0])), false));
        const p0 = teamPower(heroStats(), myPets()), pets2 = S.pets.slice(); pets2[sl] = it;
        els.push(powerLine(p0, teamPower(heroStats(), pets2.slice(0, n).filter(Boolean))));
        els.push(h('button', { class: 'btn btn-gold', onclick: () => { equip(it, sl); close(); render(); } }, cur ? `Remplacer ${cur.name}` : 'Emmener au combat'));
      }
    } else {
      const slots = it.slot === 'talisman' && S.equip.tal1 && S.equip.tal2 ? ['tal1', 'tal2'] : [bestSlotFor(it)];
      const st0 = heroStats(), p0 = teamPower(st0, myPets());
      for (const sl of slots) {
        const cur = S.equip[sl], st1 = computeStats(S.hero, { ...S.equip, [sl]: it });
        els.push(h('div', { class: 'label' }, cur ? `${SLOT_NAMES[sl]} · comparé à ${cur.name}` : `${SLOT_NAMES[sl]} · emplacement vide`));
        els.push(compareTable(st0, st1, CMP_ROWS, true));
        els.push(powerLine(p0, teamPower(st1, myPets())));
        els.push(h('button', { class: 'btn btn-gold', onclick: () => { equip(it, sl); close(); render(); } }, slots.length > 1 ? `Remplacer ${SLOT_NAMES[sl]}` : cur ? `Remplacer ${cur.name}` : 'Équiper'));
      }
    }
    els.push(h('button', { class: 'btn btn-stone', onclick: () => { const v = salvage(it); close(); toast(`+${fmt(v)} XP`); render(); } }, `Démanteler · +${fmt(salvageValue(it))} XP`));
    els.push(h('div', { style: { fontSize: '12px', color: 'var(--muted-ink)', textAlign: 'center' } }, 'Démanteler détruit l\'objet et te donne de l\'XP pour monter de niveau.'));
    return els;
  });
}

/* ---------- Création ---------- */
function renderCreate(app) {
  const r = rnd();
  const st = { name: randomName(), origin: 'brute', look: { skin: LOOK.skin[1], hair: 'meches', hairColor: LOOK.hairColors[0], eyes: LOOK.eyes[0], outfit: LOOK.outfit[0], build: 'normal' } };
  let view = null;
  const rebuildView = () => { view = makeView({ look: st.look }, { weapon: starterWeapon(st.origin) }, 'L', 0, 0); };
  rebuildView();
  const prev = h('canvas', { class: 'create-prev' });
  attachPreview(prev, () => view, { zoom: 1, dy: 12 });
  const sc = h('div', { class: 'scroll' });
  const nameIn = h('input', { class: 'namein', id: 'heroname', maxlength: 14, 'aria-label': 'Nom du héros' }); nameIn.value = st.name;
  nameIn.addEventListener('input', () => { st.name = nameIn.value; });
  const section = (label, el) => h('div', { class: 'col', style: { gap: '6px' } }, h('div', { class: 'label' }, label), el);
  const swatches = (key, list) => { const box = h('div', { class: 'opts' }); const draw = () => { box.innerHTML = ''; list.forEach(c => box.append(h('button', { class: 'sw' + (st.look[key] === c ? ' on' : ''), style: { background: c }, 'aria-label': c, onclick: () => { st.look[key] = c; rebuildView(); draw(); } }))); }; draw(); return box; };
  const pills = (key, list, names) => { const box = h('div', { class: 'opts' }); const draw = () => { box.innerHTML = ''; list.forEach(v => box.append(h('button', { class: 'pill' + (st.look[key] === v ? ' on' : ''), onclick: () => { st.look[key] = v; rebuildView(); draw(); } }, names[v]))); }; draw(); return box; };
  const origins = h('div', { class: 'origins' });
  const drawO = () => { origins.innerHTML = ''; for (const k in ORIGINS) { const O = ORIGINS[k]; const bonus = STAT_KEYS.filter(s => O.stats[s]).map(s => `+${O.stats[s]} ${STAT_SHORT[s]}`).join('  '); origins.append(h('button', { class: 'origin' + (st.origin === k ? ' on' : ''), onclick: () => { st.origin = k; rebuildView(); drawO(); } }, h('b', null, O.name), h('span', null, O.desc), h('i', null, `${bonus} · ${WEAPONS[O.weapon].name}`))); } };
  drawO();
  sc.append(
    h('div', { class: 'logo' }, h('h1', null, 'FIGHTERS'), h('p', null, 'La Tour aux cent étages')),
    prev,
    section('Nom', h('div', { class: 'row' }, nameIn, h('button', { class: 'btn btn-sm btn-stone', 'aria-label': 'Nom au hasard', onclick: () => { nameIn.value = st.name = randomName(); } }, icon('dice', 22)))),
    section('Origine', origins),
    section('Peau', swatches('skin', LOOK.skin)),
    section('Coiffure', pills('hair', LOOK.hairStyles, LOOK.hairStyleNames)),
    section('Cheveux', swatches('hairColor', LOOK.hairColors)),
    section('Yeux', swatches('eyes', LOOK.eyes)),
    section('Tenue', swatches('outfit', LOOK.outfit)),
    section('Carrure', pills('build', LOOK.builds, LOOK.buildNames)),
    h('button', { class: 'btn btn-gold btn-big', style: { marginTop: '6px' }, onclick: () => {
      Sfx.init(); Sfx.play('level');
      newGame((st.name || '').trim() || randomName(), { ...st.look }, st.origin); tab = 'tour'; render();
    } }, 'Entrer dans la Tour'));
  app.append(sc);
}

/* ---------- Démarrage ---------- */
function boot(data) {
  S = (data && data.S) || load();
  if (S && S.v !== 2) S = null;
  if (S && !S.speed) S.speed = 1;
  if (S) ensureCodex();
  if (S) { Sfx.on = S.sound !== false; Music.on = S.music !== false; }
  render();
  cloudInit();
}
try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ S })); } catch (e) { }
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
