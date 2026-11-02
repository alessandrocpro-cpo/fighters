/* ===== MUSIQUE : séquenceur WebAudio procédural (aucun fichier, aucun droit d'auteur) =====
   Deux boucles : 'menu' (calme, do majeur) et 'fight' (rythmée, la mineur). Fondu enchaîné entre les deux. */
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
const _ = null;
const TRACKS = {
  menu: {
    bpm: 96, swing: .08, vol: .55,
    chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
    bass: [48, 45, 41, 43], bassSteps: [0, 6, 8, 14],
    lead: [
      76, _, _, 79, _, _, 81, _, 79, _, 76, _, 74, _, _, _,
      72, _, _, 76, _, _, 74, _, 72, _, 69, _, 72, _, _, _,
      69, _, 72, _, 74, _, 76, _, 77, _, 76, _, 74, _, _, _,
      74, _, _, 76, _, _, 79, _, 81, _, 79, _, 76, _, 74, _,
    ],
    kick: [0, 8], snare: [], hat: [2, 6, 10, 14], leadWave: 'triangle', leadVol: .09, leadDecay: .32,
  },
  fight: {
    bpm: 142, swing: 0, vol: .5,
    chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]],
    bass: [45, 41, 48, 43], bassSteps: [0, 2, 4, 6, 8, 10, 12, 14], bassOct: true,
    lead: [
      81, _, 76, _, 72, _, 76, _, 81, _, 84, _, 83, _, 81, _,
      77, _, 72, _, 69, _, 72, _, 77, _, 81, _, 79, _, 77, _,
      79, _, 76, _, 72, _, 76, _, 79, _, 84, _, 83, _, 79, _,
      79, _, 74, _, 71, _, 74, _, 79, _, 83, _, 86, _, 83, _,
    ],
    kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], leadWave: 'square', leadVol: .045, leadDecay: .14,
  },
};

const Music = {
  on: true, want: null, cur: null, bus: null, master: null, step: 0, next: 0, timer: null,
  get ctx() { return Sfx.ctx; },
  /* À appeler sur chaque geste utilisateur : crée/relance l'audio si besoin */
  wake() {
    Sfx.init();
    const a = this.ctx; if (!a) return;
    if (a.state === 'suspended') a.resume().catch(() => {});
    if (!this.master) { this.master = a.createGain(); this.master.gain.value = .32; this.master.connect(a.destination); }
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
    this.apply();
  },
  set(name) { this.want = name; this.apply(); },
  setOn(v) { this.on = v; this.apply(); },
  apply() {
    const a = this.ctx; if (!a || !this.master) return;
    const target = this.on ? this.want : null;
    if (target === this.cur) return;
    const t = a.currentTime;
    if (this.bus) { const old = this.bus; old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(old.gain.value, t); old.gain.linearRampToValueAtTime(0, t + .6); setTimeout(() => { try { old.disconnect(); } catch (e) { } }, 900); }
    this.cur = target; this.bus = null;
    if (!target) return;
    const bus = a.createGain(); bus.gain.setValueAtTime(0, t); bus.gain.linearRampToValueAtTime(TRACKS[target].vol, t + .8);
    bus.connect(this.master); this.bus = bus;
    this.step = 0; this.next = t + .05;
  },
  tick() {
    const a = this.ctx; if (!a || !this.bus || !this.cur) return;
    const T = TRACKS[this.cur], dur = 60 / T.bpm / 4;
    while (this.next < a.currentTime + .15) {
      const sw = (this.step % 2) ? dur * T.swing : 0;
      this.play(T, this.step, this.next + sw, dur);
      this.next += dur; this.step = (this.step + 1) % 64;
    }
  },
  play(T, step, t, dur) {
    const bar = Math.floor(step / 16), s = step % 16, out = this.bus;
    if (s === 0) for (const m of T.chords[bar]) this.voice(out, 'triangle', midiHz(m), t, dur * 15, .028, .2, 1.2);
    const bi = T.bassSteps.indexOf(s);
    if (bi >= 0) { const m = T.bass[bar] + (T.bassOct && bi % 2 ? 12 : 0) - 12; this.voice(out, T.bassOct ? 'sawtooth' : 'triangle', midiHz(m), t, dur * 1.6, T.bassOct ? .07 : .12, .005, .12, 600); }
    const n = T.lead[step]; if (n) this.voice(out, T.leadWave, midiHz(n), t, dur * 1.5, T.leadVol, .005, T.leadDecay, 2400);
    if (T.kick.includes(s)) this.kick(out, t);
    if (T.snare.includes(s)) this.noise(out, t, .12, 1800, 'bandpass', .22);
    if (T.hat.includes(s)) this.noise(out, t, .035, 7000, 'highpass', .06);
  },
  voice(out, type, f, t, len, vol, att, rel, cutoff) {
    const a = this.ctx, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.setValueAtTime(vol, t + Math.max(att, len * .3)); g.gain.exponentialRampToValueAtTime(.0005, t + len + rel);
    let node = o;
    if (cutoff) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cutoff; o.connect(fl); node = fl; }
    node.connect(g); g.connect(out); o.start(t); o.stop(t + len + rel + .05);
  },
  kick(out, t) {
    const a = this.ctx, o = a.createOscillator(), g = a.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
    g.gain.setValueAtTime(.45, t); g.gain.exponentialRampToValueAtTime(.001, t + .16);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + .18);
  },
  _nb: null,
  noise(out, t, len, freq, type, vol) {
    const a = this.ctx;
    if (!this._nb) { const b = a.createBuffer(1, a.sampleRate * .3, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this._nb = b; }
    const n = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    n.buffer = this._nb; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + len);
    n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + len + .02);
  },
};
/* L'audio ne peut démarrer qu'après un geste du joueur : on se branche sur tous les appuis */
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => Music.wake(), true);
  document.addEventListener('keydown', () => Music.wake(), true);
  document.addEventListener('visibilitychange', () => { const a = Sfx.ctx; if (!a) return; if (document.hidden) a.suspend().catch(() => {}); else a.resume().catch(() => {}); });
}
