'use strict';
const GAME_VERSION = '0.5.2'; // incrémenté à chaque release (voir CHANGELOG.md)
/* ===== CORE : utilitaires partagés (logique + rendu) ===== */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const Ease = {
  linear: t => t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

/* RNG déterministe (mulberry32) : même seed = même résultat. Indispensable pour
   des étages fixes et, plus tard, une validation serveur / PvP asynchrone. */
function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  const r = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.range = (lo, hi) => lo + r() * (hi - lo);
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.chance = p => r() < p;
  r.weighted = list => {
    let tot = 0; for (const [, w] of list) tot += w;
    let x = r() * tot;
    for (const [v, w] of list) { if ((x -= w) <= 0) return v; }
    return list[list.length - 1][0];
  };
  r.shuffle = arr => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  return r;
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
let _uidN = 0;
const uid = () => Date.now().toString(36) + (_uidN++).toString(36) + Math.floor(Math.random() * 1e5).toString(36);
const fmt = n => Math.round(n).toLocaleString('fr-FR');
const pct = v => (Math.round(v * 1000) / 10).toString().replace('.', ',') + '%';
const round1 = v => Math.round(v * 10) / 10;
