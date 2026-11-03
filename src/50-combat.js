/* ===== COMBAT : moteur pas à pas (déterministe), jouable en direct ou en automatique =====
   next() prépare le prochain coup (pré-tiré, donc le hasard ne dépend pas des actions du joueur),
   resolve(input) l'applique avec les actions du joueur : coup parfait, parade, techniques. */
function makeUnit(id, side, st, hp, name, main) {
  return { id, side, st, main, name, hp: hp == null ? st.maxHp : Math.min(hp, st.maxHp), t: 0, hits: 0, usedSouffle: false, firstDone: false,
    rage: 0, shield: 0, shieldVal: 0, stunTurns: 0, devastate: 0, weak: false, pierceN: 0 };
}

function createFight(heroEnt, heroEquip, heroPets, heroHp, enemy, seed) {
  const r = makeRng(seed);
  const units = [makeUnit('L', 'L', computeStats(heroEnt, heroEquip), heroHp, heroEnt.name, true)];
  (heroPets || []).filter(Boolean).forEach((p, i) => units.push(makeUnit('L' + (i + 1), 'L', petStats(p), null, p.name, false)));
  units.push(makeUnit('R', 'R', computeStats(enemy, enemy.equip), null, enemy.name, true));
  (enemy.pets || []).forEach((p, i) => units.push(makeUnit('R' + (i + 1), 'R', petStats(p), null, p.name, false)));
  const U = {}; for (const u of units) U[u.id] = u;
  U.L.rage = 20;
  const acts = {}; const lo = heroEnt.loadout || recommendLoadout(heroEnt, []);
  for (const id of lo) if (heroEnt.actives && heroEnt.actives[id]) acts[id] = heroEnt.actives[id];
  const F = { units, U, over: false, winner: null, turns: 0, cur: null, pending: null, actives: acts, startHp: U.L.hp };
  const alive = u => u.hp > 0;
  const snap = () => { const o = {}; for (const u of units) o[u.id] = Math.max(0, Math.round(u.hp)); return o; };
  F.snap = snap;
  F.rage = () => Math.round(U.L.rage);
  for (const u of units) { u.t = (100 / u.st.speed) * r.range(.5, 1); if (u.st.first) u.t *= .25; }

  const pickTarget = atk => {
    const foes = units.filter(u => u.side !== atk.side && alive(u));
    const main = foes.find(u => u.main), pets = foes.filter(u => !u.main);
    const roll = r(), pick = r();
    if (!pets.length || roll < (atk.main ? .6 : .7)) return main;
    return pets[Math.floor(pick * pets.length)];
  };
  const finish = () => {
    if (F.over) return;
    F.over = true; F.cur = null; F.pending = null;
    F.winner = !alive(U.L) ? 'R' : !alive(U.R) ? 'L' : (U.L.hp / U.L.st.maxHp >= U.R.hp / U.R.st.maxHp ? 'L' : 'R');
  };
  const checkOver = () => { if (!alive(U.L) || !alive(U.R) || F.turns >= 400) finish(); return F.over; };

  /* Prépare le coup suivant (ou commence un nouveau tour) */
  F.next = () => {
    if (F.over) return null;
    const events = [];
    if (!F.cur) {
      if (checkOver()) return null;
      F.turns++;
      let atk = null; for (const u of units) if (alive(u) && (!atk || u.t < atk.t)) atk = u;
      atk.t += 100 / atk.st.speed;
      if (atk.stunTurns > 0) { atk.stunTurns--; events.push({ type: 'stunned', who: atk.id, hp: snap() }); return { events, strike: null }; }
      if (atk.st.regen && atk.hp < atk.st.maxHp) { const h = Math.min(atk.st.regen, atk.st.maxHp - atk.hp); atk.hp += h; events.push({ type: 'regen', who: atk.id, heal: h, hp: snap() }); }
      F.cur = { atk, def: pickTarget(atk), n: 0, counter: false };
    }
    const { atk, def, counter } = F.cur;
    const p = { atk, def, counter, rEv: r(), rBl: r(), rDmg: r.range(.7, 1.3), rCrit: r(), rStun: r(), rCounter: r(), rCombo: r() };
    p.dodge = p.rEv < clamp(def.st.evade - atk.st.acc, .02, .6);
    p.block = !p.dodge && p.rBl < def.st.block;
    p.crit = p.rCrit < atk.st.crit || (!atk.firstDone && atk.st.skills.includes('premier'));
    p.heavy = atk.st.skills.includes('fracas') && (atk.hits + 1) % 3 === 0;
    p.dangerous = def.id === 'L' && !p.dodge && !p.block && (p.crit || p.heavy);
    F.pending = p;
    return { events, strike: { a: atk.id, d: def.id, counter, telegraph: p.dangerous, heroStrike: atk.id === 'L' } };
  };

  /* Applique le coup préparé. input = { perfect, parry } */
  F.resolve = input => {
    input = input || {};
    const p = F.pending; if (!p) return { events: [], cont: null };
    F.pending = null;
    const { atk, def, counter } = p;
    const events = [];
    atk.hits++; atk.firstDone = true;
    const base = { type: 'atk', a: atk.id, d: def.id, counter };
    let miss = false;
    const devast = atk.devastate;
    if (!devast && p.dodge) { events.push({ ...base, res: 'dodge' }); miss = true; }
    else if (!devast && p.block) { events.push({ ...base, res: 'block' }); miss = true; }
    else {
      let d = atk.st.dmg * p.rDmg;
      const e = { ...base, res: 'hit', crit: p.crit, heavy: p.heavy };
      if (p.crit) d *= atk.st.critMult;
      if (p.heavy) d *= 2;
      if (atk.st.skills.includes('furie') && atk.hp / atk.st.maxHp < .4) d *= 1.4;
      if (def.st.skills.includes('regard')) d *= .88;
      if (atk.weak) d *= .9;
      if (devast) { d *= devast; e.devast = true; atk.devastate = 0; }
      if (atk.id === 'L' && input.perfect) { d *= PERFECT_MULT; e.perfect = true; }
      if (def.id === 'L' && input.parry && p.dangerous) { d *= PARRY_MULT; e.parried = true; }
      if (def.shield > 0) { d *= 1 - def.shieldVal; def.shield--; e.shielded = true; }
      let arm = def.st.armor * (1 - atk.st.pierce);
      if (atk.pierceN > 0) { arm = 0; atk.pierceN--; e.pierce = true; }
      d *= 1 - arm / (arm + 50);
      d = Math.max(1, Math.round(d));
      def.hp -= d; e.dmg = d;
      if (atk.st.stun && def.hp > 0 && p.rStun < atk.st.stun) { def.t += 70 / def.st.speed; e.stun = true; }
      if (atk.st.lifesteal) { const h = Math.round(d * atk.st.lifesteal); if (h > 0) { atk.hp = Math.min(atk.st.maxHp, atk.hp + h); e.heal = h; } }
      if (def.st.thorns && def.hp > 0) { const t = Math.max(1, Math.round(d * def.st.thorns)); atk.hp -= t; e.thorns = t; }
      if (def.id === 'L') U.L.rage = Math.min(RAGE.max, U.L.rage + RAGE.onHit);
      e.hp = snap(); events.push(e);
      if (def.hp <= 0 && !def.main && !def._downSent) { def._downSent = true; events.push({ type: 'down', id: def.id, hp: snap() }); }
      if (atk.hp <= 0 && !atk.main && !atk._downSent) { atk._downSent = true; events.push({ type: 'down', id: atk.id, hp: snap() }); }
      if (def.hp > 0 && !def.usedSouffle && def.st.skills.includes('souffle') && def.hp / def.st.maxHp < .3) {
        def.usedSouffle = true; const h = Math.round(def.st.maxHp * .35); def.hp = Math.min(def.st.maxHp, def.hp + h);
        events.push({ type: 'skill', who: def.id, id: 'souffle', heal: h, hp: snap() });
      }
    }
    if (miss) events[events.length - 1].hp = snap();
    if (atk.id === 'L') U.L.rage = Math.min(RAGE.max, U.L.rage + RAGE.onStrike);
    let cont = null;
    if (checkOver()) cont = null;
    else if (!alive(def) || !alive(atk)) F.cur = null;
    else if (miss) {
      if (!counter && def.st.skills.includes('riposte') && p.rCounter < .35) { F.cur = { atk: def, def: atk, n: 0, counter: true }; cont = 'counter'; }
      else F.cur = null;
    } else if (!counter) {
      F.cur.n++;
      if (F.cur.n < 4 && p.rCombo < atk.st.combo) cont = 'combo'; else F.cur = null;
    } else F.cur = null;
    return { events, cont };
  };

  /* Technique active du héros */
  F.canUse = id => !F.over && F.actives[id] && U.L.rage >= ACTIVES[id].cost && alive(U.L);
  F.useActive = id => {
    if (!F.canUse(id)) return null;
    const A = ACTIVES[id], rank = F.actives[id], v = A.val[rank - 1];
    U.L.rage -= A.cost;
    const e = { type: 'active', who: 'L', id };
    if (id === 'devaste') U.L.devastate = v;
    else if (id === 'bouclier') { U.L.shield = 2; U.L.shieldVal = v; }
    else if (id === 'soin') { const h = Math.min(U.L.st.maxHp - U.L.hp, Math.round(U.L.st.maxHp * v)); U.L.hp += h; e.heal = h; }
    else if (id === 'cri') { U.R.stunTurns += v; if (rank >= 2) U.R.weak = true; }
    else if (id === 'brise') U.L.pierceN = v;
    else if (id === 'balayage') {
      e.hits = [];
      for (const u of units) if (u.side === 'R' && alive(u)) {
        const dd = Math.max(1, Math.round(U.L.st.dmg * v * (u.main ? .5 : 1)));
        u.hp -= dd; e.hits.push({ id: u.id, dmg: dd });
      }
    }
    e.hp = snap();
    const out = [e];
    for (const u of units) if (u.side === 'R' && !u.main && u.hp <= 0 && !u._downSent) { u._downSent = true; out.push({ type: 'down', id: u.id, hp: snap() }); }
    checkOver();
    return out;
  };
  /* Joueur automatique : utilise ses techniques dès que possible, sans chercher le bon moment */
  F.autoActives = () => {
    const out = [];
    for (const id of ACTIVE_IDS) {
      if (!F.canUse(id)) continue;
      if (id === 'soin' && U.L.hp / U.L.st.maxHp > .5) continue;
      if (id === 'devaste' && U.L.devastate) continue;
      if (id === 'bouclier' && U.L.shield) continue;
      if (id === 'brise' && U.L.pierceN) continue;
      if (id === 'balayage' && !units.some(u => u.side === 'R' && !u.main && alive(u))) continue;
      out.push(...F.useActive(id));
    }
    return out;
  };
  F.info = () => { const o = {}; for (const u of units) o[u.id] = { max: u.st.maxHp, name: u.name, main: u.main }; o.L.start = F.startHp; return o; };
  F.result = events => ({ events, winner: F.winner, heroHp: Math.max(0, Math.round(U.L.hp)), units: F.info() });
  /* Termine le combat en automatique (bouton Passer) et renvoie les événements restants */
  F.runAuto = () => {
    const evs = [];
    if (F.pending) evs.push(...F.resolve({}).events);
    let guard = 0;
    while (!F.over && guard++ < 5000) {
      evs.push(...F.autoActives());
      const n = F.next(); if (!n) break;
      evs.push(...n.events);
      if (n.strike) evs.push(...F.resolve({}).events);
    }
    finish();
    return evs;
  };
  return F;
}

/* Combat entièrement automatique (estimation, bot d'équilibrage, combat interrompu) */
function simulateFight(heroEnt, heroEquip, heroPets, heroHp, enemy, seed, opts) {
  const F = createFight(heroEnt, heroEquip, heroPets, heroHp, enemy, seed);
  const events = F.runAuto();
  if (!(opts && opts.noEvents)) events.push({ type: 'end', winner: F.winner, hp: F.snap() });
  return F.result(opts && opts.noEvents ? [] : events);
}

/* Estimation Monte-Carlo (jeu automatique) : affichée au joueur pour décider « je pousse ou j'encaisse ». */
function winChance(heroEnt, heroEquip, heroPets, heroHp, enemy, n) {
  n = n || 80; let w = 0;
  for (let i = 0; i < n; i++) if (simulateFight(heroEnt, heroEquip, heroPets, heroHp, enemy, 7919 * i + 13, { noEvents: true }).winner === 'L') w++;
  return w / n;
}
