/* ===== MAIN : état, sauvegarde, écrans ===== */
const SAVE_KEY = 'fighters.save.v2';
const INV_MAX = 60;
let S = null, tab = 'tour', alloc = null, heroSub = 'stats';
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
    portals: [1], best: 0, stats: { runs: 0, wins: 0, deaths: 0, fights: 0 }, run: null, lastRun: null, pendingChoice: null, tips: {}, sound: true, speed: 2, autoEquip: true, codex: { w: {}, p: {} } };
  note(S.equip.weapon);
  save();
}
/* Techniques emportées contre l'adversaire d'un étage : choix du joueur, sinon conseil automatique */
function curLoadout(f) {
  const learned = ACTIVE_IDS.filter(id => activeRank(S.hero, id) > 0);
  if (S.lo && S.lo.floor === f) return S.lo.ids.filter(id => learned.includes(id)).slice(0, activeSlots(S.hero.level));
  const en = enemyAt(f);
  return recommendLoadout(S.hero, enemyTraits(en, heroStats()));
}
const heroFor = f => Object.assign({}, S.hero, { loadout: curLoadout(f) });
const startFloor = () => S.portals.includes(S._portalSel) ? S._portalSel : Math.max(...S.portals);

/* ---------- Run rogue-lite ---------- */
function startRun(from) {
  S.run = { start: from, floor: from, hp: heroStats().maxHp, flasks: 3, xp: 0, loot: [], wins: 0 };
  S.lastRun = null; S.stats.runs++; save();
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
  S.run = null; S.tips.start = 1;
  if (S.autoEquip !== false) { const r = optimizeAll(S.autoSell === false ? -1 : 1); S.lastRun.equipped = r.eq; S.lastRun.sold = r.sold; S.lastRun.soldXp = r.xp; if (r.lv) { S.lastRun.to = S.hero.level; S.lastRun.points += r.lv * POINTS_PER_LEVEL; } }
  if (S.autoAlloc && S.hero.points) { alloc = { str: 0, agi: 0, spd: 0, end: 0 }; autoAlloc(S.hero.points); for (const k of STAT_KEYS) S.hero.base[k] += alloc[k]; S.hero.points = 0; alloc = null; }
  save();
}
function applyOutcome(en, res) {
  const run = S.run, floor = run.floor, st = heroStats();
  S.stats.fights++;
  const out = { floor, win: res.winner === 'L', boss: en.boss, orbXp: res.orbXp || 0 };
  run.xp += out.orbXp;
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
function equip(it, slot, quiet) {
  if (slot == null) slot = bestSlotFor(it);
  S.inv.splice(S.inv.indexOf(it), 1);
  if (it.slot === 'pet') { const old = S.pets[slot]; if (old) S.inv.push(old); S.pets[slot] = it; }
  else { const old = S.equip[slot]; if (old) { old.isNew = false; S.inv.push(old); } S.equip[slot] = it; if (S.run) S.run.hp = Math.min(S.run.hp, heroStats().maxHp); }
  it.isNew = false; if (quiet) return; save(); Sfx.play('tap'); toast(it.name + ' équipé');
}
/* Équipe tout ce qui augmente la puissance (armes, armure, talismans, familiers). Renvoie le nombre d'objets équipés. */
const upgrades = () => S.inv.filter(it => (it.slot !== 'pet' || petSlots(S.hero.level) > 0) && deltaFor(it) > 0);
function autoEquipAll() {
  let n = 0;
  for (let g = 0; g < 30; g++) {
    const ups = upgrades(); if (!ups.length) break;
    const best = ups.reduce((a, b) => (deltaFor(b) > deltaFor(a) ? b : a));
    equip(best, null, true); n++;
  }
  return n;
}
/* L'XP de démantèlement va directement au héros (jamais dans le pot du run : elle n'est pas en jeu) */
function salvage(it, quiet) {
  S.inv.splice(S.inv.indexOf(it), 1); const v = salvageValue(it);
  const lv = grantXp(S.hero, v);
  if (!quiet) { save(); Sfx.play(lv ? 'level' : 'xp'); if (lv) setTimeout(() => toast(`Niveau ${S.hero.level} ! +${lv * POINTS_PER_LEVEL} points`), 900); }
  return v;
}
/* Objets inutiles : moins bons que l'équipement actuel. On garde les légendaires, les familiers de boss,
   et les familiers tant qu'aucun emplacement n'est ouvert. */
const junk = () => S.inv.filter(it => deltaFor(it) <= 0 && it.rarity < 3 && !it.bossPet && (it.slot !== 'pet' || petSlots(S.hero.level) > 0) &&
  !(it.slot === 'pet' && S.pets.slice(0, petSlots(S.hero.level)).filter(Boolean).length < petSlots(S.hero.level)));
/* Tout optimiser en 1 tap : équipe le meilleur, puis démantèle l'inutile. Renvoie {eq, sold, xp, lv} */
function optimizeAll(maxRarity) {
  const L0 = S.hero.level, eq = autoEquipAll();
  let sold = 0, xp = 0;
  for (const it of junk()) if (it.rarity <= maxRarity) { xp += salvage(it, true); sold++; }
  return { eq, sold, xp, lv: S.hero.level - L0, to: S.hero.level };
}
const optText = r => [r.eq ? `${r.eq} équipé${r.eq > 1 ? 's' : ''}` : null, r.sold ? `${r.sold} démantelé${r.sold > 1 ? 's' : ''} (+${fmt(r.xp)} XP)` : null, r.lv ? `niveau ${r.to} !` : null].filter(Boolean).join(' · ');

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
const heroTodo = () => (S.hero.points ? 1 : 0) + (S.hero.choices || 0) + (S.hero.tp || 0);
function renderTop() {
  const st = heroStats();
  return h('div', { class: 'top' },
    portrait(S.hero, S.equip, 1, 'avatar'),
    h('div', { class: 'grow' },
      h('div', { class: 'name' }, S.hero.name),
      h('div', { class: 'sub num' }, `Niv. ${S.hero.level} · Puissance ${fmt(teamPower(st, myPets()))}`), xpBar()),
    heroTodo() ? h('button', { class: 'chip hot', onclick: () => { tab = 'heros'; heroSub = S.hero.points || S.hero.choices ? 'stats' : 'tech'; render(); } }, S.hero.points ? `+${S.hero.points}` : '★') : null,
    h('button', { class: 'gearbtn', 'aria-label': 'Options', onclick: openOptions }, icon('gear', 26)));
}
function renderNav() {
  const nNew = S.inv.filter(i => i.isNew).length, nUp = upgrades().length;
  const b = (id, ic, label, badge) => h('button', { class: tab === id ? 'on' : '', onclick: () => { tab = id; Sfx.play('tap'); render(); } }, icon(ic, 26), label, badge ? h('span', { class: 'badge num' }, badge) : null);
  return h('nav', { class: 'nav' }, b('tour', 'tower', 'Tour'), b('heros', 'hero', 'Héros', heroTodo() || null), b('sac', 'bag', 'Sac', nUp ? '▲' : nNew || null));
}
function openOptions() {
  overlay(close => [
    h('h2', null, 'Options'),
    h('button', { class: 'btn btn-stone', onclick: () => { S.music = S.music === false; Music.setOn(S.music); save(); close(); openOptions(); } }, icon(S.music !== false ? 'sound' : 'mute', 20), S.music !== false ? 'Musique : oui' : 'Musique : non'),
    h('button', { class: 'btn btn-stone', onclick: () => { S.sound = !S.sound; Sfx.on = S.sound; save(); close(); openOptions(); } }, icon(S.sound ? 'sound' : 'mute', 20), S.sound ? 'Bruitages : oui' : 'Bruitages : non'),
    h('button', { class: 'btn btn-stone', onclick: () => { S.autoEquip = S.autoEquip === false; save(); close(); openOptions(); } }, S.autoEquip !== false ? 'Équiper le meilleur après un run : oui' : 'Équiper le meilleur après un run : non'),
    h('button', { class: 'btn btn-stone', onclick: () => { S.autoSell = S.autoSell === false; save(); close(); openOptions(); } }, S.autoSell !== false ? 'Démanteler l\'inutile (commun, peu commun) : oui' : 'Démanteler l\'inutile (commun, peu commun) : non'),
    h('button', { class: 'btn btn-stone', onclick: () => { S.autoAlloc = !S.autoAlloc; save(); close(); openOptions(); } }, S.autoAlloc ? 'Répartir les points tout seul : oui' : 'Répartir les points tout seul : non'),
    h('div', { class: 'row' }, h('button', { class: 'btn btn-sm btn-stone grow', onclick: () => { close(); openSaveIO(); } }, 'Sauvegarde'), h('button', { class: 'btn btn-sm btn-blood grow', onclick: () => { close(); confirmReset(); } }, 'Recommencer')),
    h('div', { class: 'label', style: { textAlign: 'center' } }, `Climbrawl v${GAME_VERSION}`),
    h('button', { class: 'btn btn-ghost', onclick: close }, 'Fermer'),
  ], { center: true });
}

/* ---------- Onglet Tour ---------- */
const TIPS = {
  start: 'Un run = une montée. Après chaque victoire : continuer ou encaisser. Si tu tombes, tu perds le butin du run et la moitié de l\'XP.',
  qte: 'En combat, tape l\'écran quand le cercle se ferme : coup parfait sur tes attaques, parade sur les coups dangereux (!).',
  tech: 'Les techniques se lancent avec la rage, en bas de l\'écran de combat. Choisis lesquelles emporter selon l\'adversaire.',
  loot: 'Le butin et l\'XP du run ne sont à toi qu\'en encaissant. Chaque étage de plus rapporte plus, et risque plus.',
  pets: 'Emplacement de familier débloqué. Les familiers se trouvent sur les étages et chez les boss.',
  portal: 'Portail ouvert : tu peux démarrer un run juste après un boss vaincu. Utile pour farmer son familier exclusif.',
};
function pickTip() {
  const want = ['start', 'qte'];
  if (S.stats.fights >= 2) want.push('tech');
  if (S.run && S.run.loot.length) want.push('loot');
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
/* Sélecteur de techniques : 1 tap pour en changer, les conseillées contre cet adversaire sont signalées */
function loadoutPicker(f, traits) {
  const learned = ACTIVE_IDS.filter(id => activeRank(S.hero, id) > 0), cur = curLoadout(f), n = activeSlots(S.hero.level);
  const box = h('div', { class: 'lo' });
  box.append(h('div', { class: 'row' }, h('span', { class: 'label grow' }, `Techniques · ${cur.length}/${n}`),
    S.hero.tp ? h('button', { class: 'chip hot', onclick: () => { tab = 'heros'; heroSub = 'tech'; render(); } }, `+${S.hero.tp} à apprendre`) : null));
  const pills = h('div', { class: 'opts' });
  for (const id of learned) {
    const on = cur.includes(id), good = ACTIVES[id].counters.some(c => traits.includes(c));
    pills.append(h('button', { class: 'pill tpill' + (on ? ' on' : '') + (good ? ' good' : ''), onclick: () => {
      let ids = cur.slice();
      if (on) ids = ids.filter(x => x !== id); else { if (ids.length >= n) ids.shift(); ids.push(id); }
      S.lo = { floor: f, ids }; save(); Sfx.play('tap'); render();
    } }, icon('t_' + id, 18), ACTIVES[id].name, good ? h('em', null, 'conseillé') : null));
  }
  if (!learned.length) pills.append(h('span', { style: { fontSize: '13px', color: 'var(--muted-ink)' } }, 'Aucune technique apprise.'));
  box.append(pills);
  return box;
}
function foeCard(f) {
  const en = enemyAt(f), es = computeStats(en, en.equip), traits = enemyTraits(en, heroStats());
  const wc = winChance(heroFor(f), S.equip, myPets(), S.run ? S.run.hp : null, en, 60);
  const [oLabel, oCol] = oddsInfo(wc);
  const weapon = en.equip.weapon ? WEAPONS[en.equip.weapon.base].name : 'Poings';
  const tier = tierIdx(f);
  return h('div', { class: 'panel col' },
    h('div', { class: 'foe' },
      fullPreview(en, en.equip, -1, '', 1),
      h('div', { class: 'col', style: { gap: '6px', minWidth: 0 } },
        h('div', { class: 'label' }, en.boss ? `Boss · étage ${f}` : `Étage ${f}`),
        h('div', null, h('h3', null, en.name), h('div', { class: 'title' }, en.title)),
        h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '5px' } },
          h('span', { class: 'chip' }, weapon),
          en.skills.length ? h('span', { class: 'chip', title: en.skills.map(s => SKILLS[s].name).join(', ') }, en.skills.length + ' pouvoir' + (en.skills.length > 1 ? 's' : '')) : null,
          en.pets.length ? h('span', { class: 'chip' }, icon('paw', 14), en.pets.length) : null),
        traits.length ? h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '5px' } }, traits.map(t => h('span', { class: 'chip trait', title: TRAITS[t].desc }, TRAITS[t].name))) : null,
        h('div', { class: 'odds' }, h('div', { class: 'meter' }, h('i', { style: { width: Math.round(wc * 100) + '%', background: oCol } })), h('b', { class: 'num', style: { color: oCol } }, Math.round(wc * 100) + '%')),
        h('div', { style: { fontSize: '12px', color: oCol } }, oLabel + ' (sans tes réflexes)'))),
    en.boss ? h('div', { class: 'excl' }, icon('paw', 18), `Butin exclusif : ${BOSS_PETS[tier].name} · ${Math.round(BOSS_PET_CHANCE * 100)}%`) : null,
    loadoutPicker(f, traits));
}
function tabTour() {
  const sc = h('div', { class: 'scroll' });
  const f = S.run ? S.run.floor : startFloor(), T = tierOf(f);
  sc.append(h('div', { class: 'col', style: { gap: '6px' } },
    h('div', { class: 'tier' }, h('h2', null, T.name), h('span', { class: 'label num' }, `Record ${S.best} / ${TOWER_TOP}`)),
    h('div', { class: 'prog' }, h('i', { style: { width: Math.min(100, S.best) + '%' } }))));
  const tip = pickTip();
  if (tip) sc.append(h('div', { class: 'tip' }, icon('xp', 20), h('span', null, TIPS[tip]), h('button', { 'aria-label': 'Fermer', onclick: () => { S.tips[tip] = 1; save(); render(); } }, '×')));
  if (S.run) runView(sc); else campView(sc);
  return sc;
}
function campView(sc) {
  if (S.lastRun) sc.append(runSummary(S.lastRun, true));
  const sel = startFloor();
  if (S.portals.length > 1) {
    const pick = h('div', { class: 'portals' });
    S.portals.slice().sort((a, b) => a - b).forEach(p => pick.append(h('button', { class: 'pill' + (p === sel ? ' on' : ''), onclick: () => { S._portalSel = p; render(); } }, icon(p === 1 ? 'tower' : 'portal', 16), `Étage ${p}`)));
    sc.append(h('div', { class: 'col', style: { gap: '6px' } }, h('div', { class: 'label' }, 'Départ'), pick));
  }
  sc.append(foeCard(sel), h('div', { class: 'cta' }, h('button', { class: 'btn btn-gold btn-big', onclick: () => { startRun(sel); startFight(); } }, `Combattre · étage ${sel}`)));
}
function runView(sc) {
  const run = S.run, st = heroStats();
  const canDrink = run.flasks > 0 && run.hp < st.maxHp;
  const flasks = h('div', { class: 'flasks' }); for (let i = 0; i < 3; i++) flasks.append(icon(i < run.flasks ? 'flask' : 'flaskE', 20));
  const nextSanct = Math.ceil(run.floor / 5) * 5, nextBoss = Math.ceil(run.floor / 10) * 10;
  sc.append(h('div', { class: 'panel dark col' },
    stakeLine(run),
    h('div', { class: 'row' }, icon('heart', 18), h('div', { class: 'grow' }, hpBar(run.hp, st.maxHp)), flasks, h('button', { class: 'btn btn-sm btn-blood', disabled: !canDrink, onclick: drink }, 'Boire')),
    h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, `Sanctuaire (vie, fioles) : étage ${nextSanct} · Boss : étage ${nextBoss}`)));
  sc.append(foeCard(run.floor));
  sc.append(h('div', { class: 'decide cta' },
    h('button', { class: 'btn btn-gold', onclick: startFight }, h('span', null, 'Combattre', h('small', null, `étage ${run.floor}`))),
    h('button', { class: 'btn btn-soul', onclick: () => { endRun('retreat'); Sfx.play('level'); render(); } }, h('span', null, 'Encaisser', h('small', null, `${fmt(run.xp)} XP · ${run.loot.length} obj.`)))));
}
function stakeLine(run, big) {
  const lose = Math.ceil(run.xp * (1 - DEATH_XP_KEEP));
  return h('div', { class: 'stake' + (big ? ' big' : '') },
    h('div', { class: 'row' }, icon('lock', 18), h('b', { class: 'grow' }, 'En jeu'), xpTag(run.xp, 16), h('span', { class: 'num' }, `· ${run.loot.length} obj.`)),
    h('div', { class: 'risk' }, run.xp || run.loot.length ? `Si tu tombes : −${run.loot.length} obj. et −${fmt(lose)} XP.` : 'Rien en jeu pour l\'instant.'));
}
function drink() { const mx = heroStats().maxHp; S.run.flasks--; S.run.hp = Math.min(mx, S.run.hp + Math.round(mx * .4)); save(); Sfx.init(); Sfx.play('heal'); render(); }
function runSummary(L, compact) {
  const title = L.reason === 'death' ? 'Run terminé : tombé' : 'Run terminé : encaissé';
  return h('div', { class: 'panel col summary' },
    h('div', { class: 'row' }, h('b', { class: 'grow', style: { fontFamily: 'var(--f-display)', fontSize: '18px', fontWeight: 400 } }, title),
      compact ? h('button', { class: 'x', 'aria-label': 'Fermer', onclick: () => { S.lastRun = null; save(); render(); } }, '×') : null),
    h('div', { class: 'sumgrid num' },
      h('div', null, h('span', null, 'Étages'), h('b', null, `${L.start} → ${L.reached}`)),
      h('div', null, h('span', null, 'XP'), h('b', null, '+' + fmt(L.xp) + (L.xpLost ? ` (−${fmt(L.xpLost)})` : ''))),
      h('div', null, h('span', null, 'Niveau'), h('b', null, L.to > L.from ? `${L.from} → ${L.to}` : L.to)),
      h('div', null, h('span', null, 'Butin'), h('b', null, L.reason === 'death' ? (L.lost ? `${L.lost} perdu${L.lost > 1 ? 's' : ''}` : '0') : `${L.secured} gardé${L.secured > 1 ? 's' : ''}`))),
    L.equipped || L.sold ? h('div', { style: { fontSize: '13px', color: '#21a35a' } }, [L.equipped ? `${L.equipped} objet${L.equipped > 1 ? 's' : ''} plus fort${L.equipped > 1 ? 's' : ''} équipé${L.equipped > 1 ? 's' : ''}` : null, L.sold ? `${L.sold} objet${L.sold > 1 ? 's' : ''} inutile${L.sold > 1 ? 's' : ''} démantelé${L.sold > 1 ? 's' : ''} (+${fmt(L.soldXp)} XP)` : null].filter(Boolean).join(' · ') + '. Automatique.') : null,
    S.hero.points || S.hero.tp || S.hero.choices ? h('button', { class: 'btn btn-sm btn-soul', onclick: () => { tab = 'heros'; heroSub = S.hero.points || S.hero.choices ? 'stats' : 'tech'; render(); } },
      [S.hero.points ? `${S.hero.points} points` : null, S.hero.tp ? `${S.hero.tp} technique${S.hero.tp > 1 ? 's' : ''}` : null, S.hero.choices ? 'Choix de la Brute' : null].filter(Boolean).join(' · ')) : null);
}

/* ---------- Combat interactif ---------- */
async function startFight() {
  Sfx.init(); Sfx.on = S.sound;
  try { await document.fonts.load('20px "Lilita One"'); } catch (e) { /* police de secours */ }
  const floor = S.run.floor, en = enemyAt(floor), seed = (Math.random() * 2 ** 31) | 0, lo = curLoadout(floor);
  const heroEnt = JSON.parse(JSON.stringify(heroFor(floor))), heroEq = JSON.parse(JSON.stringify(S.equip)), pets = JSON.parse(JSON.stringify(myPets()));
  S.pendingFight = { floor, seed, lo }; save(); // recharger la page ne permet pas d'annuler une défaite
  const F = createFight(heroEnt, heroEq, pets, S.run.hp, en, seed);
  showFight(heroEnt, heroEq, pets, en, F, floor);
}
/* Combat commencé mais jamais terminé (page fermée) : résolu en automatique avec le même tirage */
function resolvePendingFight() {
  const P = S.pendingFight; S.pendingFight = null;
  if (!P || !S.run || S.run.floor !== P.floor) return;
  const res = simulateFight(Object.assign({}, S.hero, { loadout: P.lo }), S.equip, myPets(), S.run.hp, enemyAt(P.floor), P.seed, { noEvents: true });
  const out = applyOutcome(enemyAt(P.floor), res); save();
  toast(out.win ? `Combat de l'étage ${P.floor} terminé : victoire` : `Combat de l'étage ${P.floor} terminé : défaite`);
}
function showFight(heroEnt, heroEq, pets, en, F, floor) {
  const app = document.getElementById('app');
  Music.set('fight');
  const U = F.info(), bars = {};
  const side = (id, ent, eq, cls) => {
    const petIds = Object.keys(U).filter(k => k[0] === id && k.length > 1);
    bars[id] = hpBar(U[id].start != null ? U[id].start : U[id].max, U[id].max);
    const minis = h('div', { class: 'minis' }); petIds.forEach(k => { const b = h('div', { class: 'mini' }, h('i', { style: { width: '100%' } })); bars[k] = b; minis.append(b); });
    return h('div', { class: 'side ' + cls }, portrait(ent, eq, id === 'L' ? 1 : -1, 'pc'), h('div', { style: { minWidth: 0 } }, h('div', { class: 'nm' }, ent.name), bars[id], minis));
  };
  const canvas = h('canvas', { class: 'arena' });
  const logBox = h('div', { class: 'flog' });
  const rage = h('i'), rageTxt = h('span', { class: 'num' }, '0');
  const tbtns = {};
  const techRow = h('div', { class: 'techs' });
  for (const id of Object.keys(F.actives)) {
    const A = ACTIVES[id];
    const b = h('button', { class: 'tbtn', 'aria-label': A.name }, icon('t_' + id, 24), h('b', null, A.name), h('small', { class: 'num' }, A.cost));
    b.onclick = () => { if (!F.canUse(id)) return; fp.queueActive(id); b.classList.add('queued'); Sfx.play('tap'); };
    tbtns[id] = b; techRow.append(b);
  }
  if (!techRow.children.length) techRow.append(h('div', { class: 'notech' }, 'Aucune technique emportée.'));
  const orbTag = h('span', { class: 'orbtag num' });
  const spd = h('button', { class: 'btn btn-sm btn-stone num' }, 'x' + S.speed);
  const skip = h('button', { class: 'btn btn-sm btn-stone grow' }, 'Passer');
  const root = h('div', { class: 'fight' },
    h('div', { class: 'hud' }, side('L', heroEnt, heroEq, ''), h('div', { class: 'fl' }, 'Étage', h('b', { class: 'num' }, floor)), side('R', en, en.equip, 'r')),
    canvas,
    h('div', { class: 'rage' }, h('span', { class: 'label' }, 'Rage'), h('div', { class: 'ragebar' }, rage), rageTxt, orbTag),
    techRow, logBox, h('div', { class: 'fctl' }, spd, skip));
  app.append(root);
  const fp = new FightPlayer(canvas, {
    F, heroEnt, heroEquip: heroEq, heroPets: pets, enemy: en, floor, speed: S.speed, tutorial: !S.tips.qte,
    orbVal: Math.max(2, Math.round(xpReward(floor) * .06)),
    onHp: hp => { for (const k in hp) { if (!bars[k]) continue; if (k.length === 1) setBar(bars[k], hp[k], U[k].max); else bars[k].firstChild.style.width = clamp(hp[k] / U[k].max, 0, 1) * 100 + '%'; } },
    onLog: (t, sd) => { logBox.append(h('div', { class: sd }, t)); while (logBox.children.length > 2) logBox.firstChild.remove(); },
    onRage: F2 => {
      const r = F2.rage(); rage.style.width = r + '%'; rageTxt.textContent = r;
      for (const id in tbtns) { const b = tbtns[id], ok = F2.canUse(id); b.disabled = !ok && !fp.queue.includes(id); b.classList.toggle('ready', ok); b.style.setProperty('--p', Math.min(1, r / ACTIVES[id].cost)); if (!fp.queue.includes(id)) b.classList.remove('queued'); }
    },
    onOrb: x => { orbTag.textContent = `+${x} XP bonus`; },
  });
  window.__fp = fp;
  spd.onclick = () => { S.speed = S.speed >= 3 ? 1 : S.speed + 1; fp.speed = S.speed; spd.textContent = 'x' + S.speed; save(); };
  skip.onclick = () => { skip.disabled = true; fp.skip(); };
  fp.run().then(res => {
    skip.disabled = true;
    res.orbXp = fp.orbXp;
    if ((fp.qteN || 0) >= 3) S.tips.qte = 1;
    const out = applyOutcome(en, res); S.pendingFight = null; save();
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
    (() => { const d = deltaFor(it); return h('span', { class: 'dl num ' + (d > 0 ? 'pos' : 'neg') }, d > 0 ? `▲ +${fmt(d)}` : 'moins bon'); })());
}
function showVictory(out, fp, root) {
  Sfx.play('xp');
  const run = S.run, st = heroStats();
  const items = [
    h('h2', { class: 'win' }, out.boss ? 'BOSS VAINCU' : 'VICTOIRE'),
    h('div', { class: 'row', style: { justifyContent: 'center', gap: '14px' } }, h('span', { class: 'label' }, `Étage ${out.floor}`), xpTag(out.xp + out.orbXp, 22), out.record ? h('span', { class: 'chip', style: { background: 'var(--gold)' } }, 'Record') : null),
  ];
  if (out.orbXp) items.push(h('div', { style: { fontSize: '12px', textAlign: 'center', color: 'var(--muted-ink)' } }, `dont +${out.orbXp} XP d'orbes attrapées`));
  out.loot.forEach((it, i) => items.push(lootRow(it, i, true)));
  if (out.portal) items.push(h('div', { class: 'tip' }, icon('portal', 20), h('span', null, `Portail ouvert : tes prochains runs pourront démarrer à l'étage ${out.portal}.`)));
  if (out.sanctuary) items.push(h('div', { class: 'tip warm' }, icon('flame', 20), h('span', null, `Sanctuaire : vie et fioles restaurées. Ton butin reste en jeu.`)));
  const nf = run.floor, nx = enemyAt(nf), wc = winChance(heroFor(nf), S.equip, myPets(), run.hp, nx, 50), [lab, col] = oddsInfo(wc);
  const tr = enemyTraits(nx, st);
  items.push(h('div', { class: 'col', style: { gap: '4px' } },
    h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'label' }, out.healed && !out.sanctuary ? `Vie · +${out.healed}` : 'Vie'), h('span', { style: { fontSize: '13px' } }, `Étage ${nf}${nx.boss ? ' (boss)' : ''} : `, h('b', { style: { color: col } }, `${lab} ${Math.round(wc * 100)}%`))),
    hpBar(run.hp, st.maxHp),
    tr.length ? h('div', { style: { fontSize: '12px', color: 'var(--muted-ink)' } }, `${nx.name} : ${tr.map(t => TRAITS[t].name).join(', ')}. Techniques : ${curLoadout(nf).map(id => ACTIVES[id].name).join(', ') || 'aucune'}.`) : null));
  items.push(stakeLine(run, true));
  items.push(h('div', { class: 'decide' },
    h('button', { class: 'btn btn-gold', onclick: () => { ov.close(); fp.destroy(); root.remove(); startFight(); } }, h('span', null, 'Continuer', h('small', null, `étage ${nf} · ${Math.round(wc * 100)}%`))),
    h('button', { class: 'btn btn-soul', onclick: () => { ov.close(); endRun('retreat'); Sfx.play('level'); leaveFight(fp, root); } }, h('span', null, 'Encaisser', h('small', null, `${fmt(run.xp)} XP · ${run.loot.length} obj.`)))));
  items.push(h('button', { class: 'btn btn-ghost', onclick: () => { ov.close(); leaveFight(fp, root); } }, 'Voir l\'adversaire, changer de techniques'));
  const ov = overlay(items, { dismiss: false });
}
function showDeath(out, fp, root) {
  Sfx.play('death'); Music.set(null);
  const L = S.lastRun, from = startFloor();
  const scr = h('div', { class: 'souls-screen dead' },
    h('h1', null, 'Tu es tombé'),
    h('p', null, `Étage ${out.floor}. Perdu : ${out.lostLoot ? `${out.lostLoot} objet${out.lostLoot > 1 ? 's' : ''} et ` : ''}${fmt(L.xpLost)} XP.`),
    h('p', { class: 'keep' }, `Tu gardes ${fmt(L.xp)} XP (la moitié).${L.to > L.from ? ` Niveau ${L.from} → ${L.to}.` : ''}`),
    h('button', { class: 'btn btn-gold', onclick: () => { scr.remove(); fp.destroy(); root.remove(); startRun(from); startFight(); } }, `Rejouer · étage ${from}`),
    heroTodo() ? h('button', { class: 'btn btn-stone', onclick: () => { scr.remove(); tab = 'heros'; heroSub = S.hero.points || S.hero.choices ? 'stats' : 'tech'; leaveFight(fp, root); } }, 'Améliorer mon héros') :
      h('button', { class: 'btn btn-ghost', style: { color: '#c9c2e6' }, onclick: () => { scr.remove(); leaveFight(fp, root); } }, 'Retour'));
  document.getElementById('app').append(scr);
}

/* ---------- Onglet Héros : répartition des points ---------- */
function tabHero() {
  const sc = h('div', { class: 'scroll' });
  const seg = h('div', { class: 'seg' });
  [['stats', 'Stats', (S.hero.points ? 1 : 0) + (S.hero.choices || 0)], ['tech', 'Techniques', S.hero.tp || 0], ['codex', 'Collection', 0]].forEach(([k, l, n]) =>
    seg.append(h('button', { class: heroSub === k ? 'on' : '', onclick: () => { heroSub = k; Sfx.play('tap'); render(); } }, l, n ? h('span', { class: 'badge num' }, n) : null)));
  sc.append(seg);
  if (heroSub === 'tech') { sc.append(techPanel()); return sc; }
  if (heroSub === 'codex') { sc.append(codexPanel()); return sc; }
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
      used ? h('button', { class: 'btn btn-sm btn-stone', onclick: () => { alloc = null; render(); } }, 'Annuler') :
        h('button', { class: 'btn btn-sm btn-soul grow', onclick: () => { autoAlloc(left); commitAlloc(); } }, `Répartir auto (${ORIGINS[S.hero.origin].name})`),
      used ? h('button', { class: 'btn btn-sm btn-gold grow', onclick: commitAlloc }, `Valider ${used} point${used > 1 ? 's' : ''}`) : null) : null));
  const d = (k, a, b, f) => h('div', null, h('span', null, k), h('b', { class: 'num' }, f(b), a !== b ? h('small', { class: b > a ? 'delta-up' : 'delta-down' }, ' ' + (b > a ? '▲' : '▼')) : null));
  const p1 = v => pct(v), r0 = v => fmt(v);
  sc.append(h('div', { class: 'panel' }, h('div', { class: 'label', style: { marginBottom: '6px' } }, 'Au combat'),
    h('div', { class: 'derived' },
      d('PV max', st0.maxHp, st.maxHp, r0), d('Dégâts', Math.round(st0.dmg), Math.round(st.dmg), r0), d('Armure', st0.armor, st.armor, r0), d('Vitesse', st0.speed, st.speed, v => round1(v).toString().replace('.', ',')),
      d('Esquive', st0.evade, st.evade, p1), d('Critique', st0.crit, st.crit, p1), d('Enchaînement', st0.combo, st.combo, p1), d('Parade', st0.block, st.block, p1))));
  return sc;
}
function commitAlloc() {
  const used = STAT_KEYS.reduce((a, k) => a + alloc[k], 0);
  for (const k of STAT_KEYS) S.hero.base[k] += alloc[k]; S.hero.points -= used; alloc = null; save(); Sfx.play('level'); toast('Points attribués'); render();
}
/* Arbre de techniques : 1 point = apprendre ou monter d'un rang (max 3) */
function techPanel() {
  const tp = S.hero.tp || 0, nextLv = (Math.floor(S.hero.level / TP_EVERY) + 1) * TP_EVERY;
  const list = h('div', { class: 'col', style: { gap: '8px' } });
  for (const id of ACTIVE_IDS) {
    const A = ACTIVES[id], r = activeRank(S.hero, id);
    const pips = h('span', { class: 'pips' }); for (let i = 1; i <= 3; i++) pips.append(h('i', { class: i <= r ? 'on' : '' }));
    list.append(h('div', { class: 'tech' + (r ? '' : ' off') },
      h('div', { class: 'ticon' }, icon('t_' + id, 30)),
      h('div', { class: 'grow' },
        h('div', { class: 'row', style: { gap: '6px' } }, h('b', { class: 'grow' }, A.name), pips),
        h('p', null, A.desc(Math.max(1, r)), r && r < 3 ? h('span', { class: 'next' }, ` Rang ${r + 1} : ${A.short(r)} → ${A.short(r + 1)}.`) : null),
        h('small', null, `Coût ${A.cost} rage · contre ${A.counters.map(c => TRAITS[c].name).join(', ')}`)),
      r >= 3 ? h('span', { class: 'chip' }, 'Max') : h('button', { class: 'btn btn-sm ' + (tp ? 'btn-gold' : 'btn-stone'), disabled: !tp, onclick: () => { if (learnActive(S.hero, id)) { S.lo = null; save(); Sfx.play('level'); toast(r ? `${A.name} rang ${r + 1}` : `${A.name} apprise`); render(); } } }, r ? '+1' : 'Apprendre')));
  }
  return h('div', { class: 'panel col' },
    h('div', { class: 'row' }, h('b', { class: 'grow', style: { fontFamily: 'var(--f-display)', fontWeight: 400, fontSize: '19px' } }, 'Techniques'), h('span', { class: 'chip' + (tp ? ' hot' : '') }, `${tp} point${tp > 1 ? 's' : ''}`)),
    h('div', { class: 'tip' }, icon('xp', 20), h('span', null, `La rage monte quand tu frappes et encaisses. ${activeSlots(S.hero.level)} techniques par combat${S.hero.level < 20 ? ' (3 au niv. 20)' : ''}, choisies sur la fiche adverse. Prochain point : niv. ${nextLv}.`)),
    list);
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
  // aperçu exact de « Tout optimiser » : simulé sur une copie de la partie
  let prev = null;
  if (upgrades().length || junk().length) { const snap = JSON.stringify(S); prev = optimizeAll(2); S = JSON.parse(snap); }
  if (prev && (prev.eq || prev.sold)) sc.append(h('button', { class: 'btn btn-gold', onclick: () => { const r = optimizeAll(2); save(); Sfx.play(r.lv ? 'level' : 'xp'); toast(optText(r) || 'Déjà optimal'); render(); } },
    h('span', { class: 'col', style: { gap: '2px', alignItems: 'center' } }, 'Tout optimiser', h('small', { style: { fontFamily: 'var(--f-body)', fontSize: '12px' } }, optText(prev)))));
  if (S.run && S.run.loot.length) sc.append(h('div', { class: 'panel col' }, h('div', { class: 'row' }, icon('lock', 18), h('span', { class: 'label grow' }, `Butin du run · en jeu`)),
    h('div', { class: 'grid' }, S.run.loot.map(it => itemTile(it, { delta: deltaFor(it), onclick: () => openItem(it, null, true) })))));
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
  sc.append(h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('span', { class: 'label num' }, `Sac · ${S.inv.length} / ${INV_MAX}`)));
  if (inv.length) sc.append(h('div', { style: { fontSize: '12px', color: 'var(--muted-ink)' } }, h('b', { class: 'delta-up' }, '▲ +N'), ' = gain de puissance si tu l\'équipes. ▼ = moins bon que ce que tu portes.'));
  if (!inv.length) sc.append(h('div', { class: 'panel', style: { textAlign: 'center', color: 'var(--muted-ink)', fontSize: '14px', lineHeight: 1.5 } }, 'Ton sac est vide. Les étages lâchent armes, armures, talismans et familiers. Encaisse ton run pour les garder.'));
  else sc.append(h('div', { class: 'grid' }, inv.map(it => itemTile(it, { delta: deltaFor(it), showNew: true, onclick: () => openItem(it) }))));
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
  attachPreview(prev, () => view, { zoom: .86, dy: 10 });
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
    h('div', { class: 'logo' }, h('h1', null, 'CLIMBRAWL'), h('p', null, 'La Tour aux cent étages')),
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
  if (S && !S.speed) S.speed = 2;
  if (S) { ensureCodex(); ensureHeroV3(S.hero); if (S.pendingFight) resolvePendingFight(); }
  if (S) { Sfx.on = S.sound !== false; Music.on = S.music !== false; }
  render();
  cloudInit();
}
try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ S })); } catch (e) { }
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});
