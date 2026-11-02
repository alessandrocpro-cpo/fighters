/* ===== COMBAT : simulation pure -> liste d'événements. Le rendu ne fait que rejouer. =====
   Multi-unités : héros + familiers contre adversaire + familiers. Le combat s'arrête quand un combattant principal tombe. */
function makeUnit(id, side, st, hp, name, main) {
  return { id, side, st, main, name, hp: hp == null ? st.maxHp : Math.min(hp, st.maxHp), t: 0, hits: 0, usedSouffle: false, firstDone: false };
}

function simulateFight(heroEnt, heroEquip, heroPets, heroHp, enemy, seed, opts) {
  const log = !(opts && opts.noEvents);
  const r = makeRng(seed);
  const units = [makeUnit('L', 'L', computeStats(heroEnt, heroEquip), heroHp, heroEnt.name, true)];
  (heroPets || []).filter(Boolean).forEach((p, i) => units.push(makeUnit('L' + (i + 1), 'L', petStats(p), null, p.name, false)));
  units.push(makeUnit('R', 'R', computeStats(enemy, enemy.equip), null, enemy.name, true));
  (enemy.pets || []).forEach((p, i) => units.push(makeUnit('R' + (i + 1), 'R', petStats(p), null, p.name, false)));
  const U = {}; for (const u of units) U[u.id] = u;
  const ev = [];
  const snap = () => { const o = {}; for (const u of units) o[u.id] = Math.max(0, Math.round(u.hp)); return o; };
  const push = e => { if (log) { e.hp = snap(); ev.push(e); } };
  for (const u of units) { u.t = (100 / u.st.speed) * r.range(.5, 1); if (u.st.first) u.t *= .25; }
  push({ type: 'start' });

  const alive = u => u.hp > 0;
  const pickTarget = atk => {
    const foes = units.filter(u => u.side !== atk.side && alive(u));
    const main = foes.find(u => u.main), pets = foes.filter(u => !u.main);
    if (!pets.length || r() < (atk.main ? .6 : .7)) return main;
    return r.pick(pets);
  };
  const strike = (atk, def, isCounter) => {
    atk.hits++;
    const base = { type: 'atk', a: atk.id, d: def.id, counter: isCounter };
    if (r() < clamp(def.st.evade - atk.st.acc, .02, .6)) { push({ ...base, res: 'dodge' }); return 'miss'; }
    if (r() < def.st.block) { push({ ...base, res: 'block' }); return 'miss'; }
    let d = atk.st.dmg * r.range(.7, 1.3);
    let crit = r() < atk.st.crit;
    if (!atk.firstDone && atk.st.skills.includes('premier')) crit = true;
    atk.firstDone = true;
    if (crit) d *= atk.st.critMult;
    const heavy = atk.st.skills.includes('fracas') && atk.hits % 3 === 0;
    if (heavy) d *= 2;
    if (atk.st.skills.includes('furie') && atk.hp / atk.st.maxHp < .4) d *= 1.4;
    if (def.st.skills.includes('regard')) d *= .88;
    const arm = def.st.armor * (1 - atk.st.pierce);
    d *= 1 - arm / (arm + 50);
    d = Math.max(1, Math.round(d));
    def.hp -= d;
    const e = { ...base, res: 'hit', dmg: d, crit, heavy };
    if (atk.st.stun && def.hp > 0 && r() < atk.st.stun) { def.t += 70 / def.st.speed; e.stun = true; }
    if (atk.st.lifesteal) { const h = Math.round(d * atk.st.lifesteal); if (h > 0) { atk.hp = Math.min(atk.st.maxHp, atk.hp + h); e.heal = h; } }
    if (def.st.thorns && def.hp > 0) { const t = Math.max(1, Math.round(d * def.st.thorns)); atk.hp -= t; e.thorns = t; }
    push(e);
    if (def.hp <= 0 && !def.main) push({ type: 'down', id: def.id });
    if (atk.hp <= 0 && !atk.main) push({ type: 'down', id: atk.id });
    if (def.hp > 0 && !def.usedSouffle && def.st.skills.includes('souffle') && def.hp / def.st.maxHp < .3) {
      def.usedSouffle = true; const h = Math.round(def.st.maxHp * .35); def.hp = Math.min(def.st.maxHp, def.hp + h);
      push({ type: 'skill', who: def.id, id: 'souffle', heal: h });
    }
    return 'hit';
  };

  const over = () => !alive(U.L) || !alive(U.R);
  let turns = 0;
  while (!over() && turns < 400) {
    turns++;
    let atk = null; for (const u of units) if (alive(u) && (!atk || u.t < atk.t)) atk = u;
    atk.t += 100 / atk.st.speed;
    if (atk.st.regen && atk.hp < atk.st.maxHp) { const h = Math.min(atk.st.regen, atk.st.maxHp - atk.hp); atk.hp += h; push({ type: 'regen', who: atk.id, heal: h }); }
    const def = pickTarget(atk);
    let n = 0;
    while (true) {
      n++;
      const res = strike(atk, def, false);
      if (!alive(def) || !alive(atk) || over()) break;
      if (res === 'miss') { if (def.st.skills.includes('riposte') && r() < .35) strike(def, atk, true); break; }
      if (n >= 4 || !(r() < atk.st.combo)) break;
    }
  }
  let winner;
  if (!alive(U.L)) winner = 'R';
  else if (!alive(U.R)) winner = 'L';
  else winner = U.L.hp / U.L.st.maxHp >= U.R.hp / U.R.st.maxHp ? 'L' : 'R';
  push({ type: 'end', winner });
  const info = {}; for (const u of units) info[u.id] = { max: u.st.maxHp, name: u.name, main: u.main };
  info.L.start = heroHp == null ? U.L.st.maxHp : Math.min(heroHp, U.L.st.maxHp);
  return { events: ev, winner, heroHp: Math.max(0, Math.round(U.L.hp)), units: info };
}

/* Estimation Monte-Carlo : affichée au joueur pour décider « je pousse ou je me retire ». */
function winChance(heroEnt, heroEquip, heroPets, heroHp, enemy, n) {
  n = n || 80; let w = 0;
  for (let i = 0; i < n; i++) if (simulateFight(heroEnt, heroEquip, heroPets, heroHp, enemy, 7919 * i + 13, { noEvents: true }).winner === 'L') w++;
  return w / n;
}
