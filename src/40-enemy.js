/* ===== ENNEMIS : un adversaire FIXE par étage (même seed monde = même gardien) ===== */
/* Courbe de difficulté : puissance cible par étage. Seul réglage à toucher pour l'équilibrage. */
const DIFF = { p0: 300, lin: .07, exp: 1.022 };
const targetPower = f => DIFF.p0 * Math.pow(1 + DIFF.lin * (f - 1), 2) * Math.pow(DIFF.exp, f - 1) * (1 - .2 * Math.max(0, 6 - f) / 5);

function makeEnemy(floor, worldSeed) {
  const r = makeRng(hashStr('etage:' + floor + ':' + worldSeed));
  const boss = floor % 10 === 0;
  const origin = r.pick(Object.keys(ORIGINS));
  const O = ORIGINS[origin];
  const base = { str: 2, agi: 2, spd: 2, end: 2, hp: 0 };
  for (const k of STAT_KEYS) base[k] += O.stats[k];
  const wl = STAT_KEYS.map(k => [k, O.weights[k]]);

  const nSk = Math.min(SKILL_IDS.length, (floor < 3 ? 0 : floor < 10 ? 1 : floor < 25 ? 2 : floor < 45 ? 3 : floor < 70 ? 5 : 7) + (boss ? 1 : 0));
  const skills = r.shuffle(SKILL_IDS).slice(0, nSk);

  const equip = {};
  const rar = () => Math.min(rollRarity(r, floor, false), floor < 8 ? 0 : floor < 15 ? 1 : 3);
  if (floor > 6 || r.chance(.14 * floor)) equip.weapon = makeItem(r, 'weapon', floor, boss ? 2 : rar());
  if (floor >= 3 && r.chance(Math.min(.9, .4 + floor * .02)) || boss) equip.armor = makeItem(r, 'armor', floor, boss ? 2 : rar());
  if (floor >= 8) equip.tal1 = makeItem(r, 'talisman', floor, rar());
  if (floor >= 22) equip.tal2 = makeItem(r, 'talisman', floor, rar());
  for (const k in equip) equip[k].isNew = false;
  const pets = [];
  let nPets = floor < 12 ? 0 : floor < 30 ? (r.chance(.4) ? 1 : 0) : floor < 60 ? 1 + (r.chance(.4) ? 1 : 0) : 2 + (r.chance(.3) ? 1 : 0);
  if (boss && floor >= 20) nPets = Math.min(3, nPets + 1);
  for (let i = 0; i < nPets; i++) { const pt = makePet(r, floor, Math.min(2, rar()), r.weighted(PET_POOL)); pt.isNew = false; pets.push(pt); }

  /* Ajuste les stats pour coller à la courbe (le boss garde son bonus x1.25 en plus) */
  const ent = { base, level: floor, skills, boss: false };
  const target = targetPower(floor);
  for (let guard = 0; guard < 400; guard++) {
    const p = teamPower(computeStats(ent, equip), pets);
    if (Math.abs(p - target) / target < .025) break;
    const tot = STAT_KEYS.reduce((a, k) => a + base[k], 0);
    const step = Math.max(1, Math.round(tot * Math.min(.08, Math.abs(p - target) / target / 3)));
    for (let i = 0; i < step; i++) {
      if (p < target) base[r.weighted(wl)]++;
      else { const k = r.weighted(wl); if (base[k] > 1) base[k]--; }
    }
  }

  const look = {
    skin: r.pick(LOOK.skin), hair: r.pick(LOOK.hairStyles), hairColor: r.pick(LOOK.hairColors), eyes: r.pick(LOOK.eyes),
    outfit: r.pick(LOOK.outfit), build: boss ? 'massif' : r.pick(LOOK.builds),
  };
  const tier = Math.min(TIERS.length - 1, Math.floor((floor - 1) / 10));
  const name = boss ? r.pick(NAME_A) + r.pick(NAME_B) : r.pick(NAME_A) + r.pick(NAME_B);
  const title = boss ? BOSS_TITLES[tier] : r.pick(TITLES);
  return { name, title, floor, level: floor, origin, base, skills, equip, pets, look, boss };
}
