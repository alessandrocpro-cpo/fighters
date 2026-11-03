/* ===== PERSONNAGE : stats dérivées, puissance, niveaux ===== */
function newHero(name, look, origin) {
  const base = { str: 3, agi: 3, spd: 3, end: 3, hp: 0 };
  for (const k of STAT_KEYS) base[k] += ORIGINS[origin].stats[k];
  return { name, look, origin, base, level: 1, xp: 0, points: 0, choices: 0, skills: [], tp: 0, actives: { devaste: 1 } };
}

/* Entité = { base, level, skills, boss? } + équipement { weapon, armor, tal1, tal2 } */
function computeStats(ent, equip) {
  equip = equip || {};
  const s = { str: ent.base.str, agi: ent.base.agi, spd: ent.base.spd, end: ent.base.end };
  const add = { hp: ent.base.hp || 0, crit: 0, evade: 0, combo: 0, block: 0, lifesteal: 0, thorns: 0, regen: 0, xp: 0 };
  const items = [equip.weapon, equip.armor, equip.tal1, equip.tal2].filter(Boolean);
  for (const it of items) for (const k in it.affixes) {
    if (k in s) s[k] += it.affixes[k]; else add[k] += it.affixes[k];
  }
  const wk = equip.weapon ? equip.weapon.base : 'poings';
  const W = WEAPONS[wk];
  const wDmg = equip.weapon ? equip.weapon.dmg : W.dmg;
  const A = equip.armor ? ARMORS[equip.armor.base] : null;
  const has = id => ent.skills.includes(id);
  const bossMul = ent.boss ? 1.25 : 1;

  const st = {
    ...s,
    weapon: wk,
    maxHp: Math.round((40 + s.end * 9 + (ent.level - 1) * 3 + add.hp) * bossMul),
    dmg: wDmg + s.str * 1.15,
    armor: equip.armor ? equip.armor.armor : 0,
    evade: clamp(.03 + s.agi * .011 + (W.evade || 0) + (A && A.evade || 0) + add.evade + (has('fantome') ? .08 : 0), 0, .55),
    acc: s.agi * .004,
    crit: clamp(.04 + s.agi * .005 + W.crit + add.crit, 0, .7),
    critMult: has('colere') ? 2.2 : 1.6,
    combo: clamp(s.agi * .007 + W.combo + add.combo, 0, .6),
    block: clamp(add.block + (has('peau') ? .12 : 0), 0, .5),
    lifesteal: add.lifesteal + (has('soif') ? .2 : 0),
    thorns: add.thorns,
    regen: add.regen,
    xpBonus: add.xp,
    speed: Math.max(4, 10 + s.spd + W.spd + (A && A.spd || 0)),
    stun: W.stun || 0,
    pierce: W.pierce || 0,
    first: !!W.first,
    skills: ent.skills.slice(),
  };
  st.dmg *= bossMul;
  st.power = computePower(st);
  return st;
}

/* Puissance = moyenne géométrique attaque x défense. Sert de repère, pas de loi. */
function computePower(st) {
  const has = id => st.skills.includes(id);
  let off = st.dmg * (1 + st.crit * (st.critMult - 1)) * (1 + st.combo) * (st.speed / 10) * (1 + st.lifesteal * .5);
  let def = st.maxHp / (1 - st.armor / (st.armor + 50)) / (1 - st.evade) / (1 - st.block) + st.regen * 25;
  if (has('furie')) off *= 1.12;
  if (has('fracas')) off *= 1.22;
  if (has('riposte')) off *= 1.08;
  if (has('premier')) off *= 1.04;
  if (has('souffle')) def *= 1.2;
  if (has('regard')) def *= 1.12;
  def *= 1 + st.thorns * .4;
  return Math.round(Math.sqrt(off * def) * 10);
}

/* ---------- Familiers ---------- */
const petBase = pet => PETS[pet.species];
function petStats(pet) {
  const sp = petBase(pet), R = RARITIES[pet.rarity];
  const sc = (1 + (pet.ilvl - 1) * .11) * R.mult * (pet.bossPet ? 1.2 : 1);
  const st = {
    maxHp: Math.round(sp.hp * sc), dmg: sp.dmg * sc, armor: 0, evade: sp.evade + (pet.bossPet ? .04 : 0), acc: 0,
    crit: sp.crit, critMult: 1.6, combo: 0, block: 0, lifesteal: 0, thorns: 0, regen: 0,
    speed: sp.speed + Math.min(8, pet.ilvl * .05), stun: 0, pierce: 0, first: false, skills: [],
  };
  st.power = computePower(st);
  return st;
}
const petSlots = level => PET_SLOT_LEVELS.filter(l => level >= l).length;
function teamPower(st, pets) { return Math.round(st.power + (pets || []).filter(Boolean).reduce((a, p) => a + petStats(p).power * .7, 0)); }

/* ---------- XP et niveaux ---------- */
const xpToNext = lvl => Math.round(26 * Math.pow(lvl, 1.62) + 20);
const xpReward = floor => Math.round((10 + floor * 5) * (floor % 10 === 0 ? 3 : 1));
const WIN_HEAL = .2; // part des PV max récupérée après chaque victoire
/* Verse l'XP : chaque niveau = POINTS_PER_LEVEL points, tous les CHOICE_EVERY niveaux = un choix façon MyBrute */
function grantXp(hero, amount) {
  hero.xp += amount; let gained = 0;
  while (hero.xp >= xpToNext(hero.level)) {
    hero.xp -= xpToNext(hero.level); hero.level++; gained++;
    hero.points += POINTS_PER_LEVEL;
    if (hero.level % CHOICE_EVERY === 0) hero.choices++;
    if (hero.level % TP_EVERY === 0) hero.tp = (hero.tp || 0) + 1;
  }
  return gained;
}

/* Choix façon MyBrute : 2 bonus, on en garde 1 */
function rollChoice(hero, freePetSlot, r) {
  const opts = [];
  const free = r.shuffle(SKILL_IDS.filter(id => !hero.skills.includes(id)));
  if (free.length) opts.push({ type: 'skill', id: free[0] });
  if (freePetSlot) opts.push({ type: 'pet', species: r.weighted(PET_POOL.slice(0, 6)), rarity: r.chance(.3) ? 1 : 0 });
  if (free.length > 1 && opts.length < 2) opts.push({ type: 'skill', id: free[1] });
  if (opts.length < 2) opts.push({ type: 'hp', v: 15 + hero.level * 3 });
  if (opts.length < 2) opts.push({ type: 'points', v: 2 });
  return r.shuffle(opts).slice(0, 2);
}
function choiceLabel(c) {
  if (c.type === 'skill') return { title: SKILLS[c.id].name, sub: 'Pouvoir', desc: SKILLS[c.id].desc };
  if (c.type === 'pet') return { title: PETS[c.species].name, sub: 'Familier' + (c.rarity ? ' rare' : ''), desc: 'Combat à tes côtés. Les ennemis partagent leurs coups entre vous.' };
  if (c.type === 'hp') return { title: '+' + c.v + ' PV max', sub: 'Vigueur', desc: 'Plus de marge pour grimper loin.' };
  return { title: '+' + c.v + ' points', sub: 'Entraînement', desc: 'Points de stats bonus à répartir.' };
}

/* Techniques actives : 1 point = débloquer (rang 1) ou améliorer (jusqu'au rang 3) */
const activeRank = (hero, id) => (hero.actives && hero.actives[id]) || 0;
function learnActive(hero, id) {
  if (!hero.actives) hero.actives = {};
  if ((hero.tp || 0) < 1 || activeRank(hero, id) >= 3) return false;
  hero.tp--; hero.actives[id] = activeRank(hero, id) + 1; return true;
}
function ensureHeroV3(hero) {
  if (hero.actives == null) hero.actives = {};
  if (hero.tp == null) hero.tp = 1 + Math.floor(hero.level / TP_EVERY);
}

function enemyTraits(en, heroSt) {
  const es = computeStats(en, en.equip), t = [];
  if (es.evade >= .2) t.push('insaisissable');
  if (es.armor / (es.armor + 50) >= .16) t.push('cuirasse');
  if (es.crit >= .16 || es.skills.includes('fracas') || es.skills.includes('colere')) t.push('frappe');
  if (en.pets && en.pets.length) t.push('meute');
  if (es.regen > 0 || es.skills.includes('souffle') || es.lifesteal >= .1) t.push('increvable');
  if (heroSt && es.speed > heroSt.speed * 1.25) t.push('rapide');
  return t;
}
/* Techniques conseillées : les plus utiles contre les traits de l'adversaire, parmi celles apprises */
function recommendLoadout(hero, traits) {
  const learned = ACTIVE_IDS.filter(id => activeRank(hero, id) > 0);
  const score = id => ACTIVES[id].base + activeRank(hero, id) * .3 + (ACTIVES[id].counters.some(c => traits.includes(c)) ? 3 : 0);
  return learned.sort((a, b) => score(b) - score(a)).slice(0, activeSlots(hero.level));
}
