/**
 * NewEra AI Agent — the original 2:04 cinematic score.
 *
 * This module owns the ARRANGEMENT: it schedules every note, hit and sweep of
 * the film onto a Web Audio graph. The same `scheduleScore` call drives live
 * playback (AudioContext) and the offline render that becomes the MP4's audio
 * track (OfflineAudioContext), so picture and sound can never drift apart.
 */

import { DURATION, SAMPLE_RATE, mulberry32, noteFreq, VOICES } from './audio.js';

const { tone, pad, pluck, kick, snare, hat, sub, riser, impact, whoosh, shimmer, click, glitch } = VOICES;

export const BPM = 84;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const SIXTEENTH = BEAT / 4;

/** Harmony. A natural-minor world: Am – F – C – G, with Dm/Em as colour. */
const CHORD = {
  am: ['a2', 'c3', 'e3', 'a3'],
  f: ['f2', 'a2', 'c3', 'f3'],
  c: ['c3', 'e3', 'g3', 'c4'],
  g: ['g2', 'b2', 'd3', 'g3'],
  dm: ['d3', 'f3', 'a3', 'd4'],
  em: ['e2', 'g2', 'b2', 'e3']
};

const PROGRESSION = ['am', 'f', 'c', 'g'];

/** Thematic melody: (time offset, note, duration, gain). */
const THEME = [
  [0.0, 'a3', 0.9, 0.15],
  [0.9, 'c4', 0.45, 0.12],
  [1.35, 'e4', 1.1, 0.14],
  [2.6, 'd4', 0.8, 0.12],
  [3.4, 'c4', 0.5, 0.1],
  [3.9, 'a3', 1.3, 0.13],
  [5.4, 'g3', 0.8, 0.12],
  [6.2, 'a3', 0.5, 0.11],
  [6.7, 'c4', 1.6, 0.15]
];

/* ------------------------------------------------------------------ *
 * Master bus
 * ------------------------------------------------------------------ */

/** Glue, warmth and headroom for the whole mix. */
export function createMasterBus(ctx) {
  const input = ctx.createGain();
  input.gain.value = 1;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -15;
  comp.knee.value = 26;
  comp.ratio.value = 3.2;
  comp.attack.value = 0.008;
  comp.release.value = 0.3;
  const air = ctx.createBiquadFilter();
  air.type = 'highshelf';
  air.frequency.value = 7000;
  air.gain.value = 2.4;
  const rumble = ctx.createBiquadFilter();
  rumble.type = 'highpass';
  rumble.frequency.value = 24;
  const trim = ctx.createGain();
  trim.gain.value = 0.9;
  input.connect(comp);
  comp.connect(rumble);
  rumble.connect(air);
  air.connect(trim);
  return { input, output: trim };
}

/* ------------------------------------------------------------------ *
 * Arrangement
 * ------------------------------------------------------------------ */

/**
 * Schedule the complete score onto `bus`, offset by `t0` seconds.
 * Deterministic: identical arguments always produce an identical render.
 */
export function scheduleScore(ctx, bus, { t0 = 0, seed = 20261010 } = {}) {
  const rnd = mulberry32(seed);
  const cache = new Map();
  const at = (t) => t0 + t;

  const N = (o) => pluck(ctx, bus, o, cache, rnd);
  const W = (t, d, g, from, to) => whoosh(ctx, bus, at(t), d, g, cache, rnd, from, to);
  const R = (t, d, g) => riser(ctx, bus, at(t), d, g, cache, rnd);
  const I = (t, g) => impact(ctx, bus, at(t), g, cache, rnd);
  const K = (t, g) => kick(ctx, bus, at(t), g);
  const S = (t, g) => snare(ctx, bus, at(t), g, cache, rnd);
  const H = (t, g, open) => hat(ctx, bus, at(t), g, cache, rnd, open);

  /** Sixteenth-note arpeggio that carries the drive of the middle acts. */
  function arpeggio(start, bars, gain, spread, octave) {
    for (let b = 0; b < bars; b += 1) {
      const names = CHORD[PROGRESSION[b % PROGRESSION.length]];
      for (let s = 0; s < 16; s += 1) {
        const name = names[(s + b) % names.length];
        const freq = noteFreq(name) * Math.pow(2, octave);
        N({
          t0: at(start + b * BAR + s * SIXTEENTH),
          freq,
          dur: 0.3,
          gain: gain * (s % 4 === 0 ? 1.25 : 0.85),
          pan: spread ? (((s % 2) * 2 - 1) * 0.38) : 0
        });
      }
    }
  }

  /** Sustained string pad following the progression. */
  function bed(start, bars, gain, cutoff) {
    for (let b = 0; b < bars; b += 1) {
      const names = CHORD[PROGRESSION[b % PROGRESSION.length]];
      names.slice(0, 3).forEach((name, i) => {
        pad(ctx, bus, {
          t0: at(start + b * BAR),
          freq: noteFreq(name),
          dur: BAR + 0.6,
          gain: gain / (i + 1.6),
          attack: 1.4,
          release: 1.6,
          cutoff,
          pan: (i - 1) * 0.3,
          spread: 7
        });
      });
    }
  }

  /* ---------------- ACT 1 · COLD OPEN (0.0 – 9.0) ---------------- */
  // Near silence, a distant room, and a single idea arriving.
  sub(ctx, bus, at(0.4), 8.8, 0.15, 33);
  W(1.6, 1.4, 0.1, -0.8, 0.5);
  W(5.0, 1.2, 0.09, 0.7, -0.6);
  N({ t0: at(1.1), freq: noteFreq('a3'), dur: 2.6, gain: 0.09, pan: -0.25 });
  N({ t0: at(3.3), freq: noteFreq('e4'), dur: 2.2, gain: 0.075, pan: 0.28 });
  N({ t0: at(5.5), freq: noteFreq('c4'), dur: 2.8, gain: 0.085, pan: -0.15 });
  N({ t0: at(7.3), freq: noteFreq('d4'), dur: 1.6, gain: 0.07, pan: 0.2 });
  tone(ctx, bus, { t0: at(6.4), freq: noteFreq('a5'), dur: 2.4, type: 'sine', gain: 0.028, attack: 1.2, decay: 2.4 });
  R(6.9, 1.9, 0.14);
  I(8.85, 0.42);

  /* ---------------- ACT 2 · SPARK (9.0 – 27.0) ---------------- */
  // The motif states itself plainly; the world is still mostly empty.
  sub(ctx, bus, at(9.0), 18.2, 0.17, 36);
  bed(9.0, 6, 0.055, 1100);
  THEME.forEach(([t, n, d, g]) => N({ t0: at(9.4 + t), freq: noteFreq(n), dur: d + 0.5, gain: g, pan: (rnd() - 0.5) * 0.5 }));
  N({ t0: at(18.4), freq: noteFreq('a3'), dur: 1.4, gain: 0.12, pan: -0.2 });
  N({ t0: at(19.6), freq: noteFreq('c4'), dur: 1.2, gain: 0.11, pan: 0.25 });
  N({ t0: at(20.8), freq: noteFreq('e4'), dur: 1.8, gain: 0.13, pan: -0.1 });
  N({ t0: at(22.6), freq: noteFreq('g4'), dur: 1.6, gain: 0.12, pan: 0.15 });
  for (let i = 0; i < 8; i += 1) H(18.0 + i * 0.72, 0.05, false);
  for (let b = 0; b < 6; b += 1) {
    K(20.2 + b * BAR, 0.4);
    S(20.2 + b * BAR + BEAT * 2, 0.16);
  }
  W(16.2, 0.9, 0.16, -0.9, 0.8);
  W(22.4, 0.9, 0.18, 0.9, -0.8);
  R(24.3, 2.5, 0.24);
  I(26.85, 0.78);

  /* ---------------- ACT 3 · GRID (27.0 – 50.0) ---------------- */
  // Machine logic: sixteenths lock in, the room grows.
  sub(ctx, bus, at(27.0), 23.0, 0.2, 41);
  bed(27.0, 8, 0.07, 1500);
  arpeggio(27.0, 8, 0.085, true, 0);
  for (let i = 0; i < 32; i += 1) H(29.0 + i * (BEAT / 2), i % 2 === 0 ? 0.07 : 0.045, i % 8 === 6);
  for (let b = 0; b < 8; b += 1) K(31.0 + b * BAR, 0.62);
  for (let b = 0; b < 6; b += 1) S(35.0 + b * BAR + BEAT * 2, 0.24);
  W(33.0, 1.0, 0.2, -0.9, 0.9);
  W(40.0, 1.0, 0.22, 0.9, -0.9);
  W(46.0, 1.1, 0.22, -0.9, 0.9);
  for (let b = 0; b < 3; b += 1) {
    const names = CHORD[PROGRESSION[b % 4]];
    names.forEach((n, i) => pad(ctx, bus, { t0: at(43.0 + b * BAR), freq: noteFreq(n), dur: BAR + 0.5, gain: 0.06 / (i + 1.3), attack: 0.9, release: 1.2, cutoff: 2100, pan: (i - 1.5) * 0.24, spread: 6 }));
  }
  for (let i = 0; i < 16; i += 1) S(46.4 + i * (BEAT / 2), 0.07 + i * 0.012);
  R(47.4, 2.5, 0.3);

  /* ---------------- ACT 4 · ASCENT (50.0 – 71.5) ---------------- */
  // Everything tightens; the pitch climbs; the film inhales.
  sub(ctx, bus, at(50.0), 21.5, 0.22, 44);
  arpeggio(50.0, 7, 0.1, true, 1);
  bed(50.0, 7, 0.085, 2400);
  for (let b = 0; b < 7; b += 1) {
    K(50.0 + b * BAR, 0.7);
    K(50.0 + b * BAR + BEAT * 2, 0.5);
    S(50.0 + b * BAR + BEAT * 1, 0.22);
    S(50.0 + b * BAR + BEAT * 3, 0.26);
  }
  for (let i = 0; i < 28; i += 1) H(50.0 + i * (BEAT / 2), 0.055, i % 4 === 3);
  W(57.5, 1.0, 0.2, -0.9, 0.9);
  W(64.0, 1.0, 0.22, 0.9, -0.9);
  for (let i = 0; i < 24; i += 1) S(66.2 + i * (BEAT / 4), 0.09 + i * 0.016);
  R(66.0, 3.4, 0.32);
  tone(ctx, bus, { t0: at(66.0), freq: noteFreq('a2'), glideTo: noteFreq('a4'), dur: 5.4, type: 'sawtooth', gain: 0.07, attack: 5.0, decay: 0.5, cutoff: 5200, q: 2.6 });
  tone(ctx, bus, { t0: at(68.0), freq: noteFreq('e3'), glideTo: noteFreq('e5'), dur: 3.4, type: 'triangle', gain: 0.05, attack: 3.2, decay: 0.4 });
  // The title lands: a sub drop under 'THE NEW ERA' so the words have weight.
  sub(ctx, bus, at(68.0), 3.4, 0.26, 32);
  impact(ctx, bus, at(68.0), 0.55, cache, rnd);
  glitch(ctx, bus, at(67.85), 0.5, 0.2, cache, rnd);

  /* ---------------- ACT 5 · IMPACT (71.5 – 74.0) ---------------- */
  // The drop. Sub, crack, and a brief hole in the world.
  I(71.5, 1.0);
  sub(ctx, bus, at(71.5), 3.0, 0.3, 30);
  tone(ctx, bus, { t0: at(71.5), freq: 1400, glideTo: 180, dur: 1.6, type: 'sawtooth', gain: 0.16, attack: 0.002, decay: 1.6, cutoff: 3000, q: 4 });
  W(72.1, 1.5, 0.24, -1.0, 1.0);

  /* ---------------- ACT 6 · HERO (74.0 – 99.0) ---------------- */
  // The theme in full: the product at its most confident.
  sub(ctx, bus, at(74.0), 25.0, 0.24, 46);
  bed(74.0, 8, 0.1, 3000);
  arpeggio(74.0, 8, 0.075, true, 0);
  THEME.forEach(([t, n, d, g]) => {
    N({ t0: at(74.0 + t), freq: noteFreq(n), dur: d + 0.6, gain: g * 1.5, pan: -0.22 });
    N({ t0: at(85.7 + t), freq: noteFreq(n), dur: d + 0.6, gain: g * 1.5, pan: 0.22 });
  });
  for (let b = 0; b < 8; b += 1) {
    K(74.0 + b * BAR, 0.82);
    K(74.0 + b * BAR + BEAT * 2, 0.58);
    S(74.0 + b * BAR + BEAT * 1, 0.3);
    S(74.0 + b * BAR + BEAT * 3, 0.34);
  }
  for (let i = 0; i < 64; i += 1) H(74.0 + i * (BEAT / 2), i % 2 === 0 ? 0.07 : 0.05, i % 8 === 6);
  shimmer(ctx, bus, at(74.0), 3.4, 0.1, -0.4);
  shimmer(ctx, bus, at(85.7), 3.4, 0.1, 0.4);
  W(80.5, 1.0, 0.2, -0.9, 0.9);
  W(91.5, 1.0, 0.2, 0.9, -0.9);
  R(95.6, 3.2, 0.26);
  I(98.8, 0.85);

  // Foley: the montage is cut to the frame, so it must be cut to the ear too.
  // Cut points mirror HERO_PLAN in film.js (74.0 + cumulative durations).
  const HERO_CUTS = [74.0, 77.2, 80.0, 82.6, 85.6, 88.2, 90.6, 96.2];
  HERO_CUTS.forEach((c, i) => {
    // Every cut gets a splice click; the faster middle cuts get a glitch too.
    click(ctx, bus, at(c), 0.16 + (i === 0 ? 0.06 : 0), i % 3 === 0 ? 'switch' : 'cut', (i % 2 === 0 ? -1 : 1) * 0.35, cache, rnd);
    if (i > 0 && i < 7) glitch(ctx, bus, at(c), 0.22, 0.14, cache, rnd);
  });
  // Terminal shot (74.0–77.2): keystrokes and a run confirmation.
  for (let i = 0; i < 22; i += 1) {
    click(ctx, bus, at(74.35 + i * 0.105), 0.07 + (i % 3) * 0.012, 'ui', -0.18, cache, rnd);
  }
  click(ctx, bus, at(76.55), 0.24, 'switch', 0.1, cache, rnd);
  // Editor shot (77.2–80.0): typing, then the agent's own diff landing.
  for (let i = 0; i < 16; i += 1) {
    click(ctx, bus, at(77.5 + i * 0.09), 0.06, 'ui', 0.2, cache, rnd);
  }
  click(ctx, bus, at(79.45), 0.2, 'cut', -0.2, cache, rnd);
  // DOM shot (80.0–82.6): hover blips, then the click that snaps the highlight.
  click(ctx, bus, at(80.4), 0.11, 'ui', -0.3, cache, rnd);
  click(ctx, bus, at(81.15), 0.26, 'switch', 0.15, cache, rnd);
  click(ctx, bus, at(81.95), 0.1, 'ui', 0.3, cache, rnd);
  // Agent graph (82.6–85.6): one click per worker as it starts.
  for (let i = 0; i < 5; i += 1) click(ctx, bus, at(83.2 + i * 0.3), 0.13, 'switch', (i % 2 === 0 ? -1 : 1) * 0.4, cache, rnd);
  // Test runner (85.6–88.2): tick per suite, a soft fail, then green.
  for (let i = 0; i < 5; i += 1) click(ctx, bus, at(85.9 + i * 0.62), 0.12, 'ui', 0.25, cache, rnd);
  click(ctx, bus, at(89.5), 0.14, 'cut', -0.15, cache, rnd);
  // Deploy (88.2–90.6): four log lines landing, then the live stamp.
  for (let i = 0; i < 4; i += 1) click(ctx, bus, at(88.4 + i * 0.5), 0.13, 'ui', (i % 2 === 0 ? -1 : 1) * 0.3, cache, rnd);
  click(ctx, bus, at(90.4), 0.3, 'switch', 0, cache, rnd);
  glitch(ctx, bus, at(90.4), 0.35, 0.16, cache, rnd);
  // Product workspace (90.6–96.2): UI ticks under the plan executing.
  for (let i = 0; i < 14; i += 1) {
    click(ctx, bus, at(91.0 + i * 0.36), 0.07 + (i % 4) * 0.01, 'ui', (i % 2 === 0 ? -0.25 : 0.25), cache, rnd);
  }
  click(ctx, bus, at(95.4), 0.22, 'cut', 0, cache, rnd);

  /* ---------------- ACT 7 · REVEAL (99.0 – 118.0) ---------------- */
  // Space, glass and the name arriving.
  sub(ctx, bus, at(99.0), 19.0, 0.2, 38);
  bed(99.0, 4, 0.09, 2000);
  ['a3', 'e4', 'c5', 'a4'].forEach((n, i) => N({ t0: at(99.6 + i * 1.7), freq: noteFreq(n), dur: 2.6, gain: 0.13 - i * 0.015, pan: (i % 2 === 0 ? -0.3 : 0.3) }));
  ['g3', 'd4', 'b4', 'g4'].forEach((n, i) => N({ t0: at(106.0 + i * 1.6), freq: noteFreq(n), dur: 2.4, gain: 0.12 - i * 0.014, pan: (i % 2 === 0 ? 0.3 : -0.3) }));
  shimmer(ctx, bus, at(110.4), 5.0, 0.14, 0);
  R(112.0, 4.0, 0.28);
  I(116.2, 0.9);

  /* ---------------- ACT 8 · OUTRO (118.0 – 124.0) ---------------- */
  // One last sub, one last hit, and the era begins.
  sub(ctx, bus, at(118.0), 6.0, 0.22, 34);
  pad(ctx, bus, { t0: at(118.0), freq: noteFreq('a2'), dur: 6.0, gain: 0.11, attack: 0.8, release: 2.6, cutoff: 1600, spread: 9 });
  pad(ctx, bus, { t0: at(118.0), freq: noteFreq('e3'), dur: 6.0, gain: 0.08, attack: 1.0, release: 2.6, cutoff: 1800, spread: 9 });
  N({ t0: at(118.6), freq: noteFreq('a4'), dur: 2.4, gain: 0.1, pan: 0 });
  K(121.0, 0.7);
  tone(ctx, bus, { t0: at(121.0), freq: noteFreq('a2'), dur: 3.0, type: 'sine', gain: 0.14, attack: 0.006, decay: 3.0 });
  shimmer(ctx, bus, at(121.2), 2.6, 0.09, 0);
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

/** Render the whole score offline and return a finished AudioBuffer. */
export async function renderScore(sampleRate = SAMPLE_RATE) {
  const frames = Math.ceil(DURATION * sampleRate);
  const ctx = new OfflineAudioContext(2, frames, sampleRate);
  const bus = createMasterBus(ctx);
  bus.output.connect(ctx.destination);
  scheduleScore(ctx, bus.input, { t0: 0 });
  return ctx.startRendering();
}

/** Encode an AudioBuffer as a 16-bit PCM RIFF/WAVE ArrayBuffer. */
export function encodeWav(buffer) {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytes = 44 + frames * channels * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const ascii = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, 'RIFF');
  view.setUint32(4, bytes - 8, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, frames * channels * 2, true);

  const data = [];
  for (let c = 0; c < channels; c += 1) data.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const sample = Math.max(-1, Math.min(1, data[c][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return view.buffer;
}
