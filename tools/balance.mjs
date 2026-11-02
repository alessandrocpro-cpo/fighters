// Bot rogue-lite qui grimpe la tour avec les vraies règles. Usage : node tools/balance.mjs [combats] [runs-bot]
import fs from 'fs'; import vm from 'vm'; import path from 'path';
const dir = path.join(path.dirname(new URL(import.meta.url).pathname), '../src');
const files = fs.readdirSync(dir).filter(f => /^[0-5]\d-.*\.js$/.test(f)).sort();
const ctx = { console, Math, Date }; vm.createContext(ctx);
vm.runInContext(files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n') + '\n;globalThis.A={newHero,computeStats,makeEnemy,simulateFight,winChance,lootForFloor,makeRng,xpReward,xpToNext,grantXp,rollChoice,salvageValue,ORIGINS,starterWeapon,petStats,petSlots,makePet,teamPower,STAT_KEYS,WIN_HEAL,DEATH_XP_KEEP};', ctx);
const A = ctx.A;
const FIGHTS = +process.argv[2] || 2000, BOTS = +process.argv[3] || 4;
const milestones = [5, 10, 20, 30, 50, 70, 100];
for (let b = 0; b < BOTS; b++) {
  const origin = Object.keys(A.ORIGINS)[b % 4], world = 1000 + b, r = A.makeRng(b * 99 + 7);
  const hero = A.newHero('Bot', {}, origin); const eq = { weapon: A.starterWeapon(origin) }; let pets = [];
  let portals = [1], best = 0, fights = 0, runs = 0, deaths = 0, bossPets = 0; const reached = {};
  const st = () => A.computeStats(hero, eq);
  const pw = () => A.teamPower(st(), pets);
  const takeItem = it => {
    if (it.slot === 'pet') {
      const slots = A.petSlots(hero.level);
      if (it.bossPet) bossPets++;
      pets.push(it); pets.sort((x, y) => A.petStats(y).power - A.petStats(x).power);
      while (pets.length > slots) A.grantXp(hero, A.salvageValue(pets.pop()));
      return;
    }
    const slot = it.slot === 'talisman' ? (!eq.tal1 ? 'tal1' : !eq.tal2 ? 'tal2' : (A.computeStats(hero, { ...eq, tal1: it }).power >= A.computeStats(hero, { ...eq, tal2: it }).power ? 'tal1' : 'tal2')) : it.slot;
    if (A.computeStats(hero, { ...eq, [slot]: it }).power > st().power) { if (eq[slot]) A.grantXp(hero, A.salvageValue(eq[slot])); eq[slot] = it; }
    else A.grantXp(hero, A.salvageValue(it));
  };
  const spend = () => {
    while (hero.choices > 0) {
      hero.choices--;
      const opts = A.rollChoice(hero, pets.length < A.petSlots(hero.level), r);
      let bestO = opts[0], bp = -1;
      for (const o of opts) {
        const h2 = JSON.parse(JSON.stringify(hero)); let p2 = pets.slice();
        if (o.type === 'skill') h2.skills.push(o.id); else if (o.type === 'hp') h2.base.hp += o.v; else if (o.type === 'points') h2.points += o.v; else p2 = [...pets, A.makePet(r, hero.level, o.rarity, o.species)];
        const p = A.teamPower(A.computeStats(h2, eq), p2); if (p > bp) { bp = p; bestO = o; }
      }
      if (bestO.type === 'skill') hero.skills.push(bestO.id); else if (bestO.type === 'hp') hero.base.hp += bestO.v; else if (bestO.type === 'points') hero.points += bestO.v; else pets.push(A.makePet(r, hero.level, bestO.rarity, bestO.species));
    }
    while (hero.points > 0) { // glouton : le point qui augmente le plus la puissance
      let bk = 'str', bp = -1;
      for (const k of A.STAT_KEYS) { hero.base[k]++; const p = st().power; hero.base[k]--; if (p > bp) { bp = p; bk = k; } }
      hero.base[bk]++; hero.points--;
    }
  };
  while (fights < FIGHTS) {
    runs++;
    let floor = Math.max(...portals), hp = st().maxHp, flasks = 3, runXp = 0, runLoot = [];
    while (true) {
      const en = A.makeEnemy(floor, world);
      let wc = A.winChance(hero, eq, pets, hp, en, 24);
      while (wc < .6 && flasks > 0 && hp < st().maxHp * .7) { flasks--; hp = Math.min(st().maxHp, hp + Math.round(st().maxHp * .4)); wc = A.winChance(hero, eq, pets, hp, en, 24); }
      // retraite si l'espérance de gain de l'étage suivant < risque de perte (moitié de l'XP du run + butin)
      if (floor > Math.max(...portals) && (wc < .35 || wc * A.xpReward(floor) < (1 - wc) * (runXp * (1 - A.DEATH_XP_KEEP) + runLoot.length * 30))) break;
      fights++;
      const res = A.simulateFight(hero, eq, pets, hp, en, r.int(0, 1e9), { noEvents: true });
      if (res.winner !== 'L') { deaths++; runLoot = []; runXp = Math.floor(runXp * A.DEATH_XP_KEEP); break; }
      runXp += Math.round(A.xpReward(floor) * (1 + st().xpBonus));
      runLoot.push(...A.lootForFloor(r, floor, floor % 10 === 0, 0));
      hp = Math.min(st().maxHp, res.heroHp + Math.round(st().maxHp * A.WIN_HEAL));
      if (floor > best) { best = floor; reached[floor] = `${fights}c/${runs}r/L${hero.level}`; }
      if (floor % 5 === 0) { hp = st().maxHp; flasks = 3; }
      if (floor % 10 === 0 && !portals.includes(floor + 1)) portals.push(floor + 1);
      floor++;
      if (fights >= FIGHTS) break;
    }
    runLoot.forEach(takeItem);
    A.grantXp(hero, runXp); spend();
  }
  const s = st();
  console.log(`bot ${b} ${origin.padEnd(8)} best=${best} lvl=${hero.level} runs=${runs} deaths=${deaths} pow=${pw()} pets=${pets.length} bossPets=${bossPets} skills=${hero.skills.length}`);
  console.log('   1er passage :', milestones.map(m => `${m}:${reached[m] || '-'}`).join('  '));
}
