/* ===== DATA : tout le contenu du jeu. Ajouter du contenu = éditer ce fichier. ===== */
const STAT_KEYS = ['str', 'agi', 'spd', 'end'];
const STAT_NAMES = { str: 'Force', agi: 'Agilité', spd: 'Vitesse', end: 'Vitalité' };
const STAT_SHORT = { str: 'FOR', agi: 'AGI', spd: 'VIT', end: 'PV' };
const STAT_HINT = {
  str: '+1,15 dégâts par coup',
  agi: 'Esquive, critiques, enchaînements',
  spd: 'Frappe plus souvent',
  end: '+9 PV max',
};
const POINTS_PER_LEVEL = 3;

const ORIGINS = {
  brute:   { name: 'Brute',   desc: 'Frappe fort. Encaisse.',             stats: { str: 3, agi: 0, spd: 0, end: 2 }, weapon: 'hache', weights: { str: 4, agi: 1, spd: 1, end: 3 } },
  lame:    { name: 'Lame',    desc: 'Insaisissable. Coups critiques.',    stats: { str: 1, agi: 3, spd: 1, end: 0 }, weapon: 'dague', weights: { str: 2, agi: 4, spd: 3, end: 1 } },
  colosse: { name: 'Colosse', desc: 'Un mur de chair. Dure longtemps.',   stats: { str: 1, agi: 0, spd: 0, end: 4 }, weapon: 'marteau', weights: { str: 2, agi: 1, spd: 1, end: 5 } },
  tempete: { name: 'Tempête', desc: 'Frappe en premier. Frappe souvent.', stats: { str: 0, agi: 2, spd: 3, end: 0 }, weapon: 'lance', weights: { str: 2, agi: 3, spd: 4, end: 1 } },
};

const LOOK = {
  skin: ['#f7d6b5', '#e9b48a', '#c98b5e', '#9a6240', '#6b4029'],
  hairStyles: ['pics', 'meches', 'longs', 'queue', 'court', 'tresse', 'crete'],
  hairStyleNames: { pics: 'Pics', meches: 'Mèches', longs: 'Longs', queue: 'Queue', court: 'Court', tresse: 'Tresse', crete: 'Crête' },
  hairColors: ['#241a33', '#7a3a26', '#ff5a3d', '#f2c94a', '#ece6ff', '#2f8cff', '#ff3d8b', '#9b5cff', '#2fd6b0'],
  eyes: ['#3dc8ff', '#3fdf8f', '#c98a3c', '#b06cff', '#ff3d6c'],
  outfit: ['#3a4a6a', '#7a2236', '#2f5a4a', '#4a2f6a', '#8a5a2a', '#2a2433'],
  builds: ['fin', 'normal', 'massif'],
  buildNames: { fin: 'Fin', normal: 'Normal', massif: 'Massif' },
};

/* Armes : dmg = dégâts de base (étage 1), spd = bonus vitesse, combo = chance d'enchaîner */
const WEAPONS = {
  poings:  { name: 'Poings',  dmg: 3,   spd: 1,    combo: .06, crit: 0,   reach: 0 },
  epee:    { name: 'Épée',    dmg: 6,   spd: 0,    combo: .05, crit: .03, reach: 10 },
  hache:   { name: 'Hache',   dmg: 8.5, spd: -1.5, combo: 0,   crit: .06, reach: 10, pierce: .3, note: 'Ignore 30% de l\'armure' },
  dague:   { name: 'Dague',   dmg: 4.5,   spd: 2.5,  combo: .14, crit: .08, reach: 2 },
  marteau: { name: 'Marteau', dmg: 11,  spd: -3,   combo: 0,   crit: .02, reach: 12, stun: .18, note: '18% d\'étourdir' },
  lance:   { name: 'Lance',   dmg: 6.5, spd: 1,    combo: .03, crit: .03, reach: 30, first: true, evade: .03, note: 'Frappe toujours en premier' },
};
const WEAPON_DROP = ['epee', 'hache', 'dague', 'marteau', 'lance'];

const ARMORS = {
  cuir:    { name: 'Cuir',    armor: 3,  evade: .02 },
  maille:  { name: 'Mailles', armor: 6 },
  plaques: { name: 'Plaques', armor: 10, spd: -1 },
};
const TALISMANS = { amulette: { name: 'Amulette' }, anneau: { name: 'Anneau' }, rune: { name: 'Rune' } };

const MATERIALS = ['de fer', 'd\'acier', 'runique', 'de braise', 'd\'os', 'de givre', 'de jade', 'de cendre', 'stellaire', 'du Sommet'];
const LEGEND_NAMES = ['Brise-Aube', 'Croc-Noir', 'Chant-du-Givre', 'Cendre-Reine', 'Murmure', 'Fin-des-Rois', 'Dernier-Soupir', 'Œil-du-Puits', 'Veille-Mort', 'Sang-Clair', 'Sans-Retour', 'Grand-Silence'];

/* Affixes : roll(ilvl, rarityMult, rng) */
const AFFIXES = {
  str:   { label: 'Force',        roll: (l, m, r) => Math.max(1, Math.round((1 + l * .17) * m * r.range(.8, 1.15))) },
  agi:   { label: 'Agilité',      roll: (l, m, r) => Math.max(1, Math.round((1 + l * .17) * m * r.range(.8, 1.15))) },
  spd:   { label: 'Vitesse',      roll: (l, m, r) => Math.max(1, Math.round((1 + l * .14) * m * r.range(.8, 1.15))) },
  end:   { label: 'Endurance',    roll: (l, m, r) => Math.max(1, Math.round((1 + l * .17) * m * r.range(.8, 1.15))) },
  hp:    { label: 'PV max',       roll: (l, m, r) => Math.round((6 + l * 2.4) * m * r.range(.8, 1.15)) },
  crit:  { label: 'Critique',     pct: true, roll: (l, m, r) => round1((2 + Math.min(l, 90) * .06) * m * r.range(.8, 1.15)) / 100 },
  evade: { label: 'Esquive',      pct: true, roll: (l, m, r) => round1((1.5 + Math.min(l, 90) * .05) * m * r.range(.8, 1.15)) / 100 },
  combo: { label: 'Enchaînement', pct: true, roll: (l, m, r) => round1((2 + Math.min(l, 90) * .05) * m * r.range(.8, 1.15)) / 100 },
  block: { label: 'Parade',       pct: true, roll: (l, m, r) => round1((2 + Math.min(l, 90) * .05) * m * r.range(.8, 1.15)) / 100 },
  lifesteal: { label: 'Vol de vie', pct: true, roll: (l, m, r) => round1((3 + Math.min(l, 90) * .05) * m * r.range(.8, 1.15)) / 100 },
  thorns: { label: 'Épines',      pct: true, roll: (l, m, r) => round1((6 + Math.min(l, 90) * .1) * m * r.range(.8, 1.15)) / 100 },
  regen: { label: 'Régénération', suffix: ' PV/tour', roll: (l, m, r) => Math.max(1, Math.round((1 + l * .12) * m * r.range(.8, 1.15))) },
  xp:    { label: 'Gain d\'XP',   pct: true, roll: (l, m, r) => round1((6 + Math.min(l, 90) * .12) * m * r.range(.8, 1.15)) / 100 },
};
const AFFIX_POOL = {
  weapon:   ['str', 'agi', 'spd', 'crit', 'combo', 'lifesteal', 'hp'],
  armor:    ['end', 'hp', 'block', 'thorns', 'regen', 'evade', 'agi'],
  talisman: ['str', 'agi', 'spd', 'end', 'hp', 'crit', 'evade', 'combo', 'block', 'lifesteal', 'thorns', 'regen', 'xp'],
};

const RARITIES = [
  { name: 'Commun',     color: '#a9a3b8', mult: 1,    affixes: 0 },
  { name: 'Rare',       color: '#3d9bff', mult: 1.15, affixes: 1 },
  { name: 'Épique',     color: '#b45cff', mult: 1.32, affixes: 2 },
  { name: 'Légendaire', color: '#ffb81f', mult: 1.55, affixes: 3 },
];

const SKILLS = {
  souffle:   { name: 'Second Souffle', desc: 'Une fois par combat, sous 30% de vie : soigne 35% des PV max.' },
  riposte:   { name: 'Riposte',        desc: '35% de chance de contre-attaquer après une esquive ou une parade.' },
  furie:     { name: 'Furie',          desc: '+40% de dégâts sous 40% de vie.' },
  peau:      { name: 'Peau de Fer',    desc: '+12% de parade.' },
  fracas:    { name: 'Fracas',         desc: 'Chaque 3e coup inflige le double de dégâts.' },
  soif:      { name: 'Soif de Sang',   desc: 'Récupère 20% des dégâts infligés.' },
  regard:    { name: 'Regard Noir',    desc: 'L\'adversaire inflige 12% de dégâts en moins.' },
  premier:   { name: 'Premier Sang',   desc: 'Le premier coup du combat est toujours critique.' },
  fantome:   { name: 'Fantôme',        desc: '+8% d\'esquive.' },
  colere:    { name: 'Colère',         desc: 'Coups critiques à x2,2 au lieu de x1,6.' },
};
const SKILL_IDS = Object.keys(SKILLS);

/* Paliers de la tour (10 étages chacun) : chaque palier est un monde gothique sous un ciel de crépuscule.
   sky = [haut, milieu, horizon], glow = source de lumière derrière le monument, far/mid = silhouettes,
   stone = dalles du sol, crack = lueur dans les fissures, accent = néon, rim = liseré de contre-jour des personnages.
   landmark = monument central, ships = dirigeables, motes = particules. */
const TIERS = [
  { name: 'Le Pont des Flèches',     sky: ['#3b2a6b', '#8a5a9e', '#f0a8c4'], glow: '#ffd2e6', far: '#6a4f8e', mid: '#3d2a5c', stone: '#5a4a6e', stone2: '#46385a', crack: '#ff3d8b', accent: '#ff4f9a', rim: '#ff7ab8', banner: '#8a1f3d', landmark: 'cathedral', ships: true, motes: 'embers', mote: '#ff9ec7' },
  { name: 'Les Docks de Brume',      sky: ['#1d2f4a', '#3f6a7e', '#9fd4d0'], glow: '#c9fff4', far: '#3c5f6e', mid: '#1f3442', stone: '#4a5862', stone2: '#38444e', crack: '#2fe0d0', accent: '#3de8ff', rim: '#6ff0ff', banner: '#1f5a6a', landmark: 'cranes', ships: true, motes: 'rain', mote: '#bfefff' },
  { name: 'La Fonderie Écarlate',    sky: ['#2a0f1c', '#7a2230', '#ff8a4a'], glow: '#ffc27a', far: '#5a2430', mid: '#2e1018', stone: '#5a3a3a', stone2: '#442a2c', crack: '#ff6a1f', accent: '#ff7a2f', rim: '#ffa25c', banner: '#a8301f', landmark: 'foundry', ships: false, motes: 'embers', mote: '#ffb35c' },
  { name: 'Les Toits Néon',          sky: ['#120f2e', '#3a2366', '#c2459a'], glow: '#ff8ad0', far: '#3a2c6a', mid: '#1c1538', stone: '#3e3a58', stone2: '#2e2a44', crack: '#ff3dd0', accent: '#3dc8ff', rim: '#ff5ad6', banner: '#5a1f8a', landmark: 'rooftops', ships: true, motes: 'rain', mote: '#d6c6ff' },
  { name: 'Les Serres de Verre',     sky: ['#14302a', '#2f6a4e', '#c8f2a0'], glow: '#eaffc9', far: '#356a50', mid: '#173428', stone: '#465a4e', stone2: '#34463c', crack: '#7dff6a', accent: '#9dff5c', rim: '#b6ff8a', banner: '#2f6a2a', landmark: 'domes', ships: false, motes: 'spores', mote: '#d6ff9e' },
  { name: 'Les Bas-Fonds Chimiques', sky: ['#0f1a14', '#244a2e', '#7ad66a'], glow: '#c6ff9a', far: '#2c4a32', mid: '#12241a', stone: '#3e4a40', stone2: '#2e3830', crack: '#5aff3d', accent: '#c8ff2f', rim: '#a8ff6a', banner: '#4a5a1a', landmark: 'sewers', ships: false, motes: 'spores', mote: '#b6ff6a' },
  { name: 'L\'Arène des Barons',     sky: ['#2a1410', '#7a3a1f', '#ffc46a'], glow: '#ffe2a8', far: '#6a3f26', mid: '#341a10', stone: '#6a5040', stone2: '#523c30', crack: '#ffb81f', accent: '#ffc83d', rim: '#ffd27a', banner: '#8a2a1a', landmark: 'arena', ships: true, motes: 'embers', mote: '#ffd27a' },
  { name: 'Le Beffroi de Cendre',    sky: ['#1a1420', '#4a3446', '#d6908a'], glow: '#ffd0b8', far: '#4e3c4e', mid: '#231a26', stone: '#4e4450', stone2: '#3a323e', crack: '#ff5a5a', accent: '#ff6f6f', rim: '#ff9a8a', banner: '#5a1f2a', landmark: 'clocktower', ships: false, motes: 'ash', mote: '#e6d6d6' },
  { name: 'L\'Observatoire',         sky: ['#070a24', '#1f2266', '#6a4fc8'], glow: '#c9b8ff', far: '#2a2a6a', mid: '#12123a', stone: '#3a3c66', stone2: '#2a2c4e', crack: '#8a7aff', accent: '#b9a4ff', rim: '#a68cff', banner: '#2a1f6a', landmark: 'observatory', ships: false, motes: 'stars', mote: '#fff6c9' },
  { name: 'Le Sommet',               sky: ['#2a1f5a', '#b45a8a', '#ffd2a0'], glow: '#fff0d0', far: '#a86a9a', mid: '#4a2a5a', stone: '#6a5a7a', stone2: '#544664', crack: '#ffd84a', accent: '#ffcf4a', rim: '#ffe08a', banner: '#a8701f', landmark: 'summit', ships: true, motes: 'embers', mote: '#fff0b3' },
];
const TOWER_TOP = 100;

const NAME_A = ['Gro', 'Ka', 'Mor', 'Vel', 'Tha', 'Bru', 'Zan', 'Ul', 'Dra', 'Fen', 'Kor', 'Ys', 'Sil', 'Ash', 'Rag', 'Ner', 'Bal', 'Ory', 'Hal', 'Vor', 'Tess', 'Mab'];
const NAME_B = ['ld', 'rek', 'gan', 'ia', 'mir', 'ok', 'dra', 'ven', 'th', 'ax', 'ise', 'orn', 'ul', 'ka', 'ric', 'lune', 'ga', 'dor'];
const TITLES = ['le Brisé', 'la Rouille', 'Sans-Nom', 'Croc-de-Fer', 'le Patient', 'la Furie', 'Deux-Lames', 'le Muet', 'Cœur-de-Pierre', 'l\'Affamé', 'la Cendre', 'Œil-Pâle', 'le Tenace', 'la Veuve', 'Poing-Sec', 'le Lent'];
const BOSS_TITLES = ['Gardien des Fondations', 'Roi des Cryptes', 'Maître de Forge', 'Reine du Givre', 'Jardinier Pourpre', 'Archiviste Noyé', 'Champion des Rois', 'Évêque de Cendre', 'Astronome Fou', 'Celui qui Attend'];

/* Familiers : body = silhouette dessinée. Stats de base à l'étage 1, montent avec le niveau d'objet. */
const PETS = {
  chien:    { name: 'Chien',     body: 'canin', col: '#c98b4e', belly: '#f2d2a8', hp: 26, dmg: 3.5, evade: .08, crit: .05, speed: 16 },
  loup:     { name: 'Loup',      body: 'canin', col: '#8f97a8', belly: '#e6e9f0', hp: 40, dmg: 5.5, evade: .1,  crit: .08, speed: 13 },
  renard:   { name: 'Renard',    body: 'canin', col: '#ff8a3d', belly: '#fff2e0', hp: 30, dmg: 4.5, evade: .16, crit: .14, speed: 15 },
  chat:     { name: 'Chat sauvage', body: 'felin', col: '#d9b27a', belly: '#fff2dc', hp: 24, dmg: 4,   evade: .2,  crit: .12, speed: 17 },
  panthere: { name: 'Panthère',  body: 'felin', col: '#3a3550', belly: '#5a5470', hp: 38, dmg: 6,   evade: .18, crit: .16, speed: 14 },
  tigre:    { name: 'Tigre',     body: 'felin', col: '#ff9a3d', belly: '#fff6e8', hp: 50, dmg: 7,   evade: .12, crit: .12, speed: 12, stripes: true },
  ours:     { name: 'Ours',      body: 'ours',  col: '#8a5a3a', belly: '#c99b72', hp: 90, dmg: 8,   evade: .03, crit: .04, speed: 8 },
  polaire:  { name: 'Ours polaire', body: 'ours', col: '#f4f6ff', belly: '#dfe6f7', hp: 110, dmg: 7, evade: .03, crit: .04, speed: 8 },
};
const PET_POOL = [['chien', 30], ['chat', 24], ['loup', 18], ['renard', 12], ['panthere', 7], ['ours', 6], ['tigre', 2], ['polaire', 1]];
/* Familier exclusif de chaque boss de palier : seule source, faible chance -> farm */
const BOSS_PETS = [
  { id: 'loupRuines',   name: 'Loup des Ruines',    base: 'loup',     col: '#9aa0ad', belly: '#fff2b3', glow: '#ffd84a' },
  { id: 'pantherSpec',  name: 'Panthère Spectrale', base: 'panthere', col: '#7fe6c9', belly: '#d9fff4', glow: '#9dffcf' },
  { id: 'oursBraise',   name: 'Ours de Braise',     base: 'ours',     col: '#4a2f2a', belly: '#ff7a3d', glow: '#ff5a1f' },
  { id: 'renardGivre',  name: 'Renard de Givre',    base: 'renard',   col: '#e6f4ff', belly: '#ffffff', glow: '#6fd8ff' },
  { id: 'tigreJade',    name: 'Tigre de Jade',      base: 'tigre',    col: '#3fbf7f', belly: '#d9ffe6', glow: '#9dffcf' },
  { id: 'loupAbysses',  name: 'Loup des Abysses',   base: 'loup',     col: '#2f5f8a', belly: '#6fe0e6', glow: '#2fe0d0' },
  { id: 'chatRoyal',    name: 'Chat Royal',         base: 'chat',     col: '#ffd84a', belly: '#fff6d6', glow: '#ffb81f' },
  { id: 'oursCendre',   name: 'Ours de Cendre',     base: 'ours',     col: '#5a5470', belly: '#b6abc9', glow: '#ff7ab6' },
  { id: 'renardAstral', name: 'Renard Astral',      base: 'renard',   col: '#5a5fb8', belly: '#ffe66f', glow: '#b9a4ff' },
  { id: 'loupCeleste',  name: 'Loup Céleste',       base: 'loup',     col: '#ffffff', belly: '#ffe9b3', glow: '#ffb81f' },
];
const BOSS_PET_CHANCE = .06;
const PET_SLOT_LEVELS = [5, 15, 30];
const CHOICE_EVERY = 3;
const DEATH_XP_KEEP = .5; // part de l'XP du run gardée si on tombe (le butin du run est perdu)

/* Techniques actives : déclenchées par le joueur pendant le combat (jauge de rage). rang 1..3.
   On en apprend plusieurs, on n'en emporte que ACTIVE_SLOTS par combat : le choix dépend de l'adversaire. */
const ACTIVES = {
  devaste:  { short: r => 'x' + [2.2, 2.6, 3][r - 1].toString().replace('.', ','), name: 'Coup dévastateur', cost: 50, counters: ['insaisissable', 'increvable'], base: 2, val: [2.2, 2.6, 3],
    desc: r => `Ton prochain coup inflige x${[2.2, 2.6, 3][r - 1].toString().replace('.', ',')} dégâts et ne peut pas être esquivé.` },
  brise:    { short: r => [2, 3, 4][r - 1] + ' coups', name: 'Brise-armure',     cost: 35, counters: ['cuirasse'], base: 1, val: [2, 3, 4],
    desc: r => `Tes ${[2, 3, 4][r - 1]} prochains coups ignorent toute l'armure adverse.` },
  bouclier: { short: r => '−' + [50, 65, 80][r - 1] + '%', name: 'Bouclier',         cost: 40, counters: ['frappe'], base: 1.5, val: [.5, .65, .8],
    desc: r => `Les 2 prochains coups reçus perdent ${[50, 65, 80][r - 1]}% de leurs dégâts.` },
  balayage: { short: r => 'x' + [0.8, 1.1, 1.4][r - 1].toString().replace('.', ','), name: 'Balayage',         cost: 45, counters: ['meute'], base: .6, val: [.8, 1.1, 1.4],
    desc: r => `Frappe tous les familiers adverses (x${[0.8, 1.1, 1.4][r - 1].toString().replace('.', ',')} tes dégâts) et l'adversaire (moitié).` },
  cri:      { short: r => ['1 tour', '1 tour, −10% dégâts', '2 tours'][r - 1], name: 'Cri de guerre',    cost: 45, counters: ['rapide'], base: 1.2, val: [1, 1, 2],
    desc: r => `L'adversaire est étourdi et perd ${['son prochain tour', 'son prochain tour, et 10% de dégâts', 'ses 2 prochains tours'][r - 1]}.` },
  soin:     { short: r => [22, 30, 38][r - 1] + '% PV', name: 'Second vent',      cost: 60, counters: ['increvable'], base: 1.2, val: [.22, .3, .38],
    desc: r => `Soigne ${[22, 30, 38][r - 1]}% de tes PV max.` },
};
const activeSlots = level => level >= 20 ? 3 : 2;
/* Traits d'adversaire : calculés à partir de ses vraies stats, affichés sur sa fiche */
const TRAITS = {
  insaisissable: { name: 'Insaisissable', desc: 'Esquive beaucoup.' },
  cuirasse:      { name: 'Cuirassé',      desc: 'Armure épaisse.' },
  frappe:        { name: 'Frappe lourde', desc: 'Coups critiques ou dévastateurs.' },
  meute:         { name: 'Meute',         desc: 'Combat avec des familiers.' },
  increvable:    { name: 'Increvable',    desc: 'Se soigne ou se relève.' },
  rapide:        { name: 'Rapide',        desc: 'Frappe bien plus souvent que toi.' },
};
const ACTIVE_IDS = Object.keys(ACTIVES);
const RAGE = { onStrike: 9, onHit: 13, max: 100 };
const PERFECT_MULT = 1.5, PARRY_MULT = .3;
const TP_EVERY = 2; // 1 point de technique au niveau 1, puis tous les 2 niveaux
