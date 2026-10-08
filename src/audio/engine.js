// Every sound Luna makes, synthesised with the Web Audio API: no audio files. The
// recipes are the approved ones from the sound lab (plans/reference/luna-sound-lab.html),
// ported as they are: the same partials, envelopes, filters, reverb impulse, jitter
// and ambient graph. Tune them only with the owner.
//
// This module loads only once sound is first turned on. It is handed an
// AudioContext the page created inside that press, as browsers require.

const VOLUME = 0.7;

// The exact phases' chords: New, First Quarter, Full, Last Quarter
const CHORDS = [
  [440, 659.25],                 // New: open and low
  [523.25, 783.99, 1046.5],      // First Quarter
  [587.33, 880, 1174.66, 1760],  // Full: the brightest
  [493.88, 739.99, 987.77]       // Last Quarter
];

const cents = (c) => Math.pow(2, c / 1200);
const jitter = (range) => cents((Math.random() * 2 - 1) * range);

export const createEngine = (ctx) => {
  const makeNoise = (seconds) => {
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };
  const makeImpulse = (seconds, decay) => {
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  };

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
  const master = ctx.createGain();
  master.gain.value = VOLUME;
  master.connect(comp); comp.connect(ctx.destination);
  const verb = ctx.createConvolver();
  verb.buffer = makeImpulse(3.2, 3.4);
  const wet = ctx.createGain(); wet.gain.value = 0.55;
  verb.connect(wet); wet.connect(master);
  const noiseBuf = makeNoise(2.5);

  // A voice's input: dry to the master, some of it to the reverb
  const bus = (send) => {
    const input = ctx.createGain();
    input.connect(master);
    const s = ctx.createGain(); s.gain.value = send;
    input.connect(s); s.connect(verb);
    return input;
  };
  const env = (g, t, attack, peak, decay) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  };
  const tone = (freq, t, peak, attack, decay, dest, type = 'sine') => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain(); env(g, t, attack, peak, decay);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + attack + decay + 0.05);
    return o;
  };
  const noise = (t, attack, peak, decay, dest, type, freq, q = 1) => {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    const g = ctx.createGain(); env(g, t, attack, peak, decay);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * Math.max(0, 2.4 - attack - decay)); s.stop(t + attack + decay + 0.05);
    return f;
  };

  const SOUNDS = {
    glass() {
      const t = ctx.currentTime, out = bus(0.28), f = 1568 * jitter(18);
      [[1, 0.16, 0.42], [2.76, 0.06, 0.2], [5.4, 0.025, 0.09]].forEach(([r, p, d]) => tone(f * r, t, p, 0.003, d, out));
      noise(t, 0.001, 0.035, 0.014, out, 'highpass', 5200);
    },
    felt() {
      const t = ctx.currentTime, out = bus(0.08);
      noise(t, 0.002, 0.16, 0.035, out, 'bandpass', 1700 * jitter(60), 0.9);
      const o = tone(190 * jitter(30), t, 0.22, 0.003, 0.07, out);
      o.frequency.exponentialRampToValueAtTime(115, t + 0.06);
    },
    hover() {
      const t = ctx.currentTime, out = bus(0.1);
      tone(3136 * jitter(25), t, 0.018, 0.003, 0.04, out);
    },
    on() {
      const t = ctx.currentTime, out = bus(0.16);
      tone(740, t, 0.1, 0.004, 0.12, out); tone(740 * 2, t, 0.02, 0.004, 0.06, out);
      tone(1109, t + 0.05, 0.1, 0.004, 0.18, out); tone(1109 * 2, t + 0.05, 0.02, 0.004, 0.08, out);
    },
    off() {
      const t = ctx.currentTime, out = bus(0.12);
      tone(1109, t, 0.08, 0.004, 0.1, out);
      tone(740, t + 0.05, 0.08, 0.004, 0.16, out);
    },
    open() {
      const t = ctx.currentTime, out = bus(0.35);
      const f = noise(t, 0.16, 0.14, 0.34, out, 'bandpass', 320, 0.7);
      f.frequency.exponentialRampToValueAtTime(2600, t + 0.45);
      tone(70, t, 0.05, 0.12, 0.3, out);
    },
    close() {
      const t = ctx.currentTime, out = bus(0.3);
      const f = noise(t, 0.08, 0.12, 0.3, out, 'bandpass', 2400, 0.7);
      f.frequency.exponentialRampToValueAtTime(300, t + 0.36);
      tone(62, t + 0.08, 0.05, 0.05, 0.22, out);
    },
    // The lab's streak crosses from left to right. Here it crosses the way the
    // meteor on screen does: from and to are stereo positions, -1 to 1.
    meteor({ from = -0.85, to = 0.85 } = {}) {
      const t = ctx.currentTime, out = bus(0.6);
      let dest = out;
      if (ctx.createStereoPanner) {
        const pan = ctx.createStereoPanner(); pan.pan.setValueAtTime(from, t); pan.pan.linearRampToValueAtTime(to, t + 1.1);
        pan.connect(out); dest = pan;
      }
      const f = noise(t, 0.05, 0.08, 1.05, dest, 'highpass', 7200, 0.6);
      f.frequency.exponentialRampToValueAtTime(1600, t + 1.0);
      const o = tone(2700, t, 0.035, 0.04, 0.95, dest);
      o.frequency.exponentialRampToValueAtTime(900, t + 0.95);
      [2093, 3136].forEach((fr, i) => tone(fr, t + 0.95 + i * 0.05, 0.03, 0.004, 0.5, out));
    },
    reward() {
      const t = ctx.currentTime, out = bus(0.65);
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((fr, i) => {
        const at = t + i * 0.22;
        tone(fr, at, 0.07, 0.02, 1.6, out);
        tone(fr * 2.01, at, 0.012, 0.02, 0.9, out);
      });
      const f = noise(t + 0.6, 0.6, 0.02, 1.6, out, 'bandpass', 6000, 2);
      f.frequency.linearRampToValueAtTime(9000, t + 2.6);
    },
    // A day crossed on the timeline, pitched by how much of the Moon is lit (0…1)
    tick(lit = 0) {
      const t = ctx.currentTime, out = bus(0.12);
      tone(520 * Math.pow(2, lit) * jitter(8), t, 0.05, 0.002, 0.05, out, 'triangle');
    },
    // Arriving at an exact phase: 0 New, 1 First Quarter, 2 Full, 3 Last Quarter
    chime(index = 0) {
      const t = ctx.currentTime, out = bus(0.55);
      (CHORDS[index] || CHORDS[0]).forEach((fr, k) => {
        tone(fr, t + k * 0.03, 0.055, 0.006, 1.7, out);
        tone(fr * 2.76, t + k * 0.03, 0.01, 0.004, 0.5, out);
      });
    }
  };

  // Ambient bed: a detuned low drone through a lowpass that opens toward Full Moon,
  // a breath of filtered air, and a faint shimmer that only appears near Full
  let amb = null;
  let ambientLit = 0;
  const setAmbientLevel = (lit) => {
    ambientLit = lit;
    if (!amb) return;
    const t = ctx.currentTime;
    amb.lp.frequency.setTargetAtTime(200 + 1100 * lit, t, 0.25);
    amb.shimmer.gain.setTargetAtTime(0.0001 + 0.006 * lit * lit, t, 0.4);
  };
  const startAmbient = () => {
    if (amb) return;
    const t = ctx.currentTime;
    const out = bus(0.7);
    const level = ctx.createGain(); level.gain.setValueAtTime(0.0001, t); level.gain.exponentialRampToValueAtTime(0.9, t + 2.5);
    level.connect(out);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7; lp.frequency.value = 220;
    lp.connect(level);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    const lfoDepth = ctx.createGain(); lfoDepth.gain.value = 90;
    lfo.connect(lfoDepth); lfoDepth.connect(lp.frequency); lfo.start();
    const oscs = [];
    [55, 82.41, 110, 164.81].forEach((fr) => {
      [-6, 6].forEach((c) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = c;
        const g = ctx.createGain(); g.gain.value = 0.018;
        o.connect(g); g.connect(lp); o.start(); oscs.push(o);
      });
    });
    const air = ctx.createBufferSource(); air.buffer = noiseBuf; air.loop = true;
    const airF = ctx.createBiquadFilter(); airF.type = 'bandpass'; airF.frequency.value = 900; airF.Q.value = 0.5;
    const airG = ctx.createGain(); airG.gain.value = 0.012;
    air.connect(airF); airF.connect(airG); airG.connect(level); air.start();
    const shimmer = ctx.createGain(); shimmer.gain.value = 0.0001; shimmer.connect(level);
    const trem = ctx.createOscillator(); trem.frequency.value = 0.18;
    const tremDepth = ctx.createGain(); tremDepth.gain.value = 0.003;
    trem.connect(tremDepth); tremDepth.connect(shimmer.gain); trem.start();
    [1318.5, 1975.5].forEach((fr) => {
      const o = ctx.createOscillator(); o.frequency.value = fr; o.connect(shimmer); o.start(); oscs.push(o);
    });
    amb = { level, lp, shimmer, stop: [...oscs, lfo, air, trem] };
    setAmbientLevel(ambientLit);
  };
  const stopAmbient = () => {
    if (!amb) return;
    const t = ctx.currentTime, a = amb;
    a.level.gain.cancelScheduledValues(t);
    a.level.gain.setValueAtTime(Math.max(a.level.gain.value, 0.0001), t);
    a.level.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    a.stop.forEach((n) => { try { n.stop(t + 1.3); } catch { /* already stopped */ } });
    amb = null;
  };

  return {
    play(name, arg) {
      SOUNDS[name]?.(arg);
    },
    startAmbient,
    stopAmbient,
    setAmbientLevel
  };
};
