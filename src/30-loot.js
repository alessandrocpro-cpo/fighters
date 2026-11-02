/* ===== BUTIN : génération d'objets ===== */
function rollRarity(r, floor, boss) {
  const f = Math.min(floor, 100);
  const w = [Math.max(12, 64 - f * .7), 27 + f * .12, 7 + f * .28, 1.2 + f * .1];
  if (boss) { w[0] = 0; w[2] *= 2; w[3] *= 2.5; }
  return r.weighted(w.map((x, i) => [i, x]));
}

function makeItem(r, slot, ilvl, rarity) {
  const R = RARITIES[rarity];
  const scale = 1 + (ilvl - 1) * .11;
  const it = { id: uid(), slot, ilvl, rarity, affixes: {}, isNew: true };
  if (slot === 'weapon') { it.base = r.pick(WEAPON_DROP); it.dmg = round1(WEAPONS[it.base].dmg * scale * R.mult); }
  else if (slot === 'armor') { it.base = r.pick(Object.keys(ARMORS)); it.armor = Math.round(ARMORS[it.base].armor * scale * R.mult); }
  else it.base = r.pick(Object.keys(TALISMANS));
  const n = R.affixes + (slot === 'talisman' ? 1 : 0);
  const pool = r.shuffle(AFFIX_POOL[slot]);
  for (let i = 0; i < n; i++) { const k = pool[i]; it.affixes[k] = AFFIXES[k].roll(ilvl, R.mult, r); }
  it.name = itemName(r, it);
  return it;
}

function itemName(r, it) {
  const baseName = it.slot === 'weapon' ? WEAPONS[it.base].name : it.slot === 'armor' ? 'Armure ' + ARMORS[it.base].name.toLowerCase() : TALISMANS[it.base].name;
  if (it.rarity === 3) return r.pick(LEGEND_NAMES);
  const mat = MATERIALS[Math.min(MATERIALS.length - 1, Math.floor((it.ilvl - 1) / 10))];
  return baseName + ' ' + mat;
}
function itemTypeName(it) {
  if (it.slot === 'pet') return 'Familier · ' + PETS[it.species].name;
  if (it.slot === 'weapon') return WEAPONS[it.base].name;
  if (it.slot === 'armor') return 'Armure ' + ARMORS[it.base].name.toLowerCase();
  return TALISMANS[it.base].name;
}

function makePet(r, ilvl, rarity, species, bossIdx) {
  const p = { id: uid(), slot: 'pet', ilvl, rarity, species, affixes: {}, isNew: true };
  if (bossIdx != null) { const B = BOSS_PETS[bossIdx]; p.species = B.base; p.bossPet = B.id; p.name = B.name; p.rarity = 3; }
  else p.name = PETS[species].name + (rarity ? ' ' + ['', 'vif', 'farouche', 'alpha'][rarity] : '');
  return p;
}
const bossPetDef = p => p.bossPet ? BOSS_PETS.find(b => b.id === p.bossPet) : null;

function lootForFloor(r, floor, boss, luck) {
  const out = [];
  const tier = Math.min(TIERS.length - 1, Math.floor((floor - 1) / 10));
  if (boss && r.chance(BOSS_PET_CHANCE)) out.push(makePet(r, floor, 3, null, tier));
  if (r.chance(boss ? .15 : .05)) out.push(makePet(r, floor, Math.min(2, rollRarity(r, floor, boss)), r.weighted(PET_POOL)));
  const pick = () => r.weighted([['weapon', 4], ['armor', 3.5], ['talisman', 2.5]]);
  if (boss) {
    out.push(makeItem(r, pick(), floor, rollRarity(r, floor, true)));
    if (r.chance(.35)) out.push(makeItem(r, pick(), floor, rollRarity(r, floor, false)));
  } else if (r.chance(.42 + (luck || 0))) {
    out.push(makeItem(r, pick(), floor, rollRarity(r, floor, false)));
  }
  return out;
}

const salvageValue = it => Math.round((4 + it.ilvl * 1.8) * (1 + it.rarity * 1.3));

function affixText(k, v) {
  const A = AFFIXES[k];
  if (A.pct) return '+' + pct(v) + ' ' + A.label;
  return '+' + v + (A.suffix ? A.suffix : ' ' + A.label);
}

function starterWeapon(origin) {
  const it = makeItem(makeRng(hashStr(origin)), 'weapon', 1, 0);
  it.base = ORIGINS[origin].weapon; it.dmg = WEAPONS[it.base].dmg; it.name = WEAPONS[it.base].name + (it.base === 'marteau' ? ' usé' : ' usée');
  it.isNew = false;
  return it;
}
