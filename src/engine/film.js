/**
 * NewEra AI Agent — the picture.
 *
 * A deterministic, time-driven canvas film. `render(t)` is pure: the same
 * timestamp always draws the same frame, which lets the browser play it live
 * and lets a headless renderer capture it frame-by-frame for the MP4.
 *
 * Nothing is loaded from disk — every pixel is drawn from geometry, type and
 * seeded noise, so the film ships as a few kilobytes instead of a video file.
 */

import { mulberry32 } from './audio.js';
import {
  montage, cutFlash, smear, planeField,
  shotTerminal, shotEditor, shotDom, shotAgents, shotTests, shotDeploy, shotProduct
} from './sim.js';

export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Chapter markers — the HUD builds its scrubber from this list. */
export const CHAPTERS = [
  { id: 'cold', label: 'Cold open', start: 0 },
  { id: 'spark', label: 'The spark', start: 9 },
  { id: 'grid', label: 'The grid', start: 27 },
  { id: 'ascent', label: 'Ascent', start: 50 },
  { id: 'impact', label: 'Impact', start: 71.5 },
  { id: 'hero', label: 'NewEra', start: 74 },
  { id: 'reveal', label: 'The mark', start: 99 },
  { id: 'outro', label: 'Begin', start: 118 }
];

export const ACTS = CHAPTERS.map((c, i) => ({
  ...c,
  end: i + 1 < CHAPTERS.length ? CHAPTERS[i + 1].start : 124
}));

const INK = '#05060a';
const BONE = '#f4f6fb';
const MIST = '#8d98b2';
const SIGNAL = '#4f8cff';
const EMBER = '#ff6b3d';
const AURORA = '#7be0c8';

/* ------------------------------------------------------------------ *
 * Small deterministic helpers
 * ------------------------------------------------------------------ */

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeIn = (t) => Math.pow(clamp(t, 0, 1), 3);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** 0 -> 1 -> 0 window that opens and closes around an act. */
export const window01 = (t, start, end, fadeIn = 1, fadeOut = 1) =>
  Math.min(easeOut((t - start) / Math.max(0.001, fadeIn)), easeOut((end - t) / Math.max(0.001, fadeOut)), 1);

/** Layout helper: proportional rectangle on the 1920x1080 stage. */
function rect(ctx, x, y, w, h) {
  ctx.fillRect(Math.round(x * WIDTH), Math.round(y * HEIGHT), Math.round(w * WIDTH), Math.round(h * HEIGHT));
}

function text(ctx, value, x, y, size, opts = {}) {
  const {
    font = 'Inter, sans-serif', weight = 400, color = BONE, align = 'center',
    baseline = 'middle', spacing = 0, alpha = 1, blur = 0
  } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = color;
  if (blur > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }
  const px = x * WIDTH;
  const py = y * HEIGHT;
  if (spacing > 0) {
    // Manual tracking: canvas letterSpacing is not universally supported.
    const chars = [...value];
    const widths = chars.map((c) => ctx.measureText(c).width + spacing);
    const total = widths.reduce((a, b) => a + b, 0) - spacing;
    let cursor = align === 'center' ? px - total / 2 : align === 'right' ? px - total : px;
    chars.forEach((c, i) => {
      ctx.fillText(c, cursor, py);
      cursor += widths[i];
    });
  } else {
    ctx.fillText(value, px, py);
  }
  ctx.restore();
}

/** Hairline rule that draws itself from the centre outward. */
function rule(ctx, y, progress, alpha, color = MIST, width = 0.34) {
  const w = width * easeOut(progress);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  rect(ctx, 0.5 - w / 2, y, w, 0.0016);
  ctx.restore();
}

/** Soft radial light — used for every glow, flare and vignette. */
function glow(ctx, x, y, radius, color, alpha) {
  const cx = x * WIDTH;
  const cy = y * HEIGHT;
  const r = radius * WIDTH;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(5,6,10,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

/** Perspective grid plane, receding to a vanishing point. */
function gridPlane(ctx, t, { horizon, depth, alpha, color = SIGNAL, span = 1.6, rows = 22, cols = 26 }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  const vx = 0.5;
  const vy = horizon;
  ctx.beginPath();
  for (let r = 1; r <= rows; r += 1) {
    const p = ((r / rows + (t * 0.08) % (1 / rows)) % 1);
    const z = Math.pow(p, 2.2);
    const y = vy + z * depth;
    ctx.moveTo(0, y * HEIGHT);
    ctx.lineTo(WIDTH, y * HEIGHT);
  }
  for (let c = 0; c <= cols; c += 1) {
    const x = c / cols;
    ctx.moveTo(vx * WIDTH, vy * HEIGHT);
    ctx.lineTo((vx + (x - vx) * span) * WIDTH, (vy + depth) * HEIGHT);
  }
  ctx.stroke();
  ctx.restore();
}

/** Seeded star/dust field with slow parallax drift. */
function dust(ctx, t, count, alpha, speed = 0.02) {
  const rnd = mulberry32(1337);
  ctx.save();
  ctx.fillStyle = BONE;
  for (let i = 0; i < count; i += 1) {
    const x = (rnd() + t * speed * (0.4 + rnd())) % 1;
    const y = rnd();
    const size = 0.6 + rnd() * 1.9;
    ctx.globalAlpha = alpha * (0.25 + rnd() * 0.75);
    ctx.beginPath();
    ctx.arc(x * WIDTH, y * HEIGHT, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Motion streaks radiating from a centre point — speed and travel. */
function streaks(ctx, t, { cx, cy, count, alpha, color, inner, outer, len = 0.5 }) {
  const rnd = mulberry32(90210);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  for (let i = 0; i < count; i += 1) {
    const angle = rnd() * Math.PI * 2;
    const phase = (t * (0.35 + rnd() * 0.8) + rnd()) % 1;
    const r0 = lerp(inner, outer, phase);
    const r1 = r0 + len * (0.2 + rnd() * 0.8);
    ctx.lineWidth = 0.6 + rnd() * 2.2;
    ctx.beginPath();
    ctx.moveTo((cx + Math.cos(angle) * r0) * WIDTH, (cy + Math.sin(angle) * r0) * HEIGHT);
    ctx.lineTo((cx + Math.cos(angle) * r1) * WIDTH, (cy + Math.sin(angle) * r1) * HEIGHT);
    ctx.stroke();
  }
  ctx.restore();
}

/** Vertical data columns — the "machine thinking" texture. */
function dataColumns(ctx, t, alpha, seed) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.font = '300 15px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  const cols = 24;
  for (let c = 0; c < cols; c += 1) {
    const x = ((c + 0.5) / cols) * WIDTH;
    const speed = 30 + rnd() * 90;
    const glyphs = 16 + Math.floor(rnd() * 14);
    const offset = (t * speed + rnd() * 900) % 1;
    for (let g = 0; g < glyphs; g += 1) {
      const p = (offset + g / glyphs) % 1;
      const y = p * HEIGHT;
      const a = alpha * (1 - Math.abs(p - 0.5) * 1.6) * (0.3 + rnd() * 0.7);
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = rnd() > 0.82 ? AURORA : rnd() > 0.5 ? SIGNAL : MIST;
      const code = (0x30a0 + Math.floor(rnd() * 96)).toString(16);
      ctx.fillText(code, x, y);
    }
  }
  ctx.restore();
}

/** The NewEra mark: a hexagonal aperture built from three nested rings. */
function mark(ctx, x, y, radius, t, alpha, color = BONE) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x * WIDTH, y * HEIGHT);
  const r = radius * WIDTH;
  for (let ring = 0; ring < 3; ring += 1) {
    const rr = r * (1 - ring * 0.24);
    ctx.strokeStyle = ring === 1 ? SIGNAL : color;
    ctx.lineWidth = ring === 1 ? 3.5 : 2;
    ctx.beginPath();
    for (let i = 0; i <= 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + t * 0.25 * (ring % 2 === 0 ? 1 : -1);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // Aperture blades rotating inward — the "aperture closing on the future".
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2 + t * 0.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22);
    ctx.lineTo(Math.cos(a + 2.0) * r * 0.86, Math.sin(a + 2.0) * r * 0.86);
    ctx.stroke();
  }
  ctx.restore();
}

/** A UI panel that assembles from its own edges. */
function panel(ctx, x, y, w, h, progress, { title, alpha = 1, accent = SIGNAL, rows = 4 }) {
  const p = easeOut(progress);
  const hw = (w * p) / 2;
  const hh = (h * p) / 2;
  const cx = x * WIDTH;
  const cy = y * HEIGHT;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(12,16,26,0.72)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(cx - hw * WIDTH, cy - hh * HEIGHT, hw * 2 * WIDTH, hh * 2 * HEIGHT);
  ctx.fill();
  ctx.stroke();
  if (p > 0.55 && title) {
    const inner = (p - 0.55) / 0.45;
    ctx.globalAlpha = alpha * inner;
    text(ctx, title, x - w / 2 + 0.018, y - h / 2 + 0.035, 21, { font: '"JetBrains Mono", monospace', color: accent, align: 'left', spacing: 1.6 });
    for (let r = 0; r < rows; r += 1) {
      const rw = (0.72 - r * 0.09) * w * inner;
      ctx.globalAlpha = alpha * inner * (0.5 - r * 0.08);
      ctx.fillStyle = r % 2 === 0 ? accent : MIST;
      rect(ctx, x - w / 2 + 0.018, y - h / 2 + 0.1 + r * 0.055, rw, 0.006);
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * Acts
 * ------------------------------------------------------------------ */

function actCold(ctx, t) {
  // 0–9s: darkness, a breath, and the first point of light.
  dust(ctx, t, 90, 0.35, 0.008);
  const breathe = 0.5 + 0.5 * Math.sin(t * 0.9);
  glow(ctx, 0.5, 0.52, 0.34, 'rgba(79,140,255,0.55)', 0.16 + breathe * 0.12);
  gridPlane(ctx, t, { horizon: 0.78, depth: 0.24, alpha: 0.05 + easeOut((t - 4) / 4) * 0.1 });
  const first = window01(t, 2.4, 8.6, 1.6, 1.0);
  text(ctx, 'Every era', 0.5, 0.47, 62, { font: 'Cormorant Garamond, serif', weight: 300, color: BONE, alpha: first, spacing: 2 });
  text(ctx, 'begins in the dark', 0.5, 0.55, 62, { font: 'Cormorant Garamond, serif', weight: 300, color: MIST, alpha: window01(t, 3.4, 8.6, 1.4, 1.0), spacing: 2 });
  rule(ctx, 0.63, (t - 4.4) / 2, window01(t, 4.4, 8.4, 0.8, 0.8), MIST, 0.2);
  glow(ctx, 0.5, 0.52, 0.06 + easeIn((t - 6.6) / 2.2) * 0.3, 'rgba(244,246,251,0.9)', easeOut((t - 6.6) / 2.2) * 0.75);
}

function actSpark(ctx, t) {
  // 9–27s: the motif appears, particles ignite, a world starts to form.
  const local = t - 9;
  dust(ctx, t, 150, 0.4, 0.02);
  gridPlane(ctx, t, { horizon: 0.66, depth: 0.34, alpha: 0.12 + easeOut(local / 6) * 0.14, color: SIGNAL });
  streaks(ctx, t, { cx: 0.5, cy: 0.5, count: 90, alpha: 0.16 + easeOut(local / 8) * 0.2, color: SIGNAL, inner: 0.05, outer: 0.55, len: 0.3 });
  glow(ctx, 0.5, 0.5, 0.22 + Math.sin(local * 1.4) * 0.03, 'rgba(123,224,200,0.5)', 0.2 + easeOut(local / 7) * 0.18);

  const line1 = window01(local, 1.2, 7.4, 0.9, 1.2);
  text(ctx, 'A new intelligence', 0.5, 0.44, 68, { weight: 300, color: BONE, alpha: line1, spacing: 3 });
  text(ctx, 'is taking shape', 0.5, 0.53, 68, { weight: 300, color: MIST, alpha: window01(local, 2.4, 7.4, 0.9, 1.2), spacing: 3 });

  const line2 = window01(local, 9.0, 16.6, 1.1, 1.2);
  text(ctx, 'Built to think. Built to act.', 0.5, 0.47, 54, { weight: 500, color: BONE, alpha: line2, spacing: 4 });
  rule(ctx, 0.55, (local - 10.4) / 2, line2 * 0.8, SIGNAL, 0.26);
  text(ctx, 'NEWERA AI AGENT', 0.5, 0.61, 24, { font: '"JetBrains Mono", monospace', weight: 400, color: SIGNAL, alpha: line2, spacing: 9 });

  const hit = easeOut((local - 15.6) / 1.4);
  if (hit > 0) {
    glow(ctx, 0.5, 0.5, 0.18 + hit * 0.5, 'rgba(79,140,255,0.6)', hit * 0.4 * (1 - easeOut((local - 17) / 1.6)));
  }
}

function actGrid(ctx, t) {
  // 27–50s: the machine at work — data, panels, structured thought.
  const local = t - 27;
  dataColumns(ctx, t, 0.32 + easeOut(local / 5) * 0.3, 4242);
  gridPlane(ctx, t, { horizon: 0.3, depth: 0.7, alpha: 0.1, color: AURORA, span: 2.4, rows: 18, cols: 30 });
  glow(ctx, 0.5, 0.5, 0.55, 'rgba(79,140,255,0.35)', 0.16 + Math.sin(local * 0.7) * 0.04);

  const cards = [
    { x: 0.27, y: 0.42, w: 0.3, h: 0.3, title: 'PLAN', delay: 2.0, accent: SIGNAL },
    { x: 0.5, y: 0.52, w: 0.32, h: 0.32, title: 'BUILD', delay: 4.4, accent: AURORA },
    { x: 0.73, y: 0.42, w: 0.3, h: 0.3, title: 'SHIP', delay: 6.8, accent: EMBER }
  ];
  cards.forEach((c) => {
    panel(ctx, c.x, c.y, c.w, c.h, (local - c.delay) / 1.1, { title: c.title, alpha: window01(local, c.delay, 21, 0.8, 1.2), accent: c.accent });
  });

  const line1 = window01(local, 1.4, 8.0, 1.0, 1.2);
  text(ctx, 'It plans.', 0.5, 0.2, 76, { weight: 600, color: BONE, alpha: line1, spacing: 1 });
  const line2 = window01(local, 11.0, 18.4, 1.0, 1.2);
  text(ctx, 'It builds.', 0.5, 0.2, 76, { weight: 600, color: BONE, alpha: line2, spacing: 1 });
  text(ctx, 'thousands of steps. one intent.', 0.5, 0.85, 30, { weight: 300, color: MIST, alpha: window01(local, 12.6, 19, 1.0, 1.2), spacing: 3 });
}

/*
 * 50–71.5s: acceleration, but not the same acceleration twice.
 *
 * Three distinct gears, so the eye never sees the same frame type twice:
 *   gear 1 (50–57)  a field of interface planes drifting past — code, charts,
 *                   terminals, graphs. Software, not stars.
 *   gear 2 (57–64)  the planes rush; speed ramps 1x -> 4x, depth stretches.
 *   gear 3 (64–71.5) the planes blow past the lens; the grid arrives to catch
 *                   the fall, and the title lands on the impact.
 */
function actAscent(ctx, t) {
  const local = t - 50;
  // Speed ramp: slow, cinematic hook first, then the agent's velocity.
  const ramp = easeIn(clamp((local - 6) / 12, 0, 1));
  const speed = 1 + ramp * 3;

  // Gear 1–2: the plane field, always moving, never repeating.
  planeField(ctx, t, {
    count: 26,
    speed,
    spread: 1.0 + ramp * 0.5,
    alpha: 0.5 + ramp * 0.22,
    seed: 991
  });

  // Gear 3: the grid catches the fall once the ramp is at full speed.
  if (ramp > 0.25) {
    gridPlane(ctx, t, {
      horizon: 0.5,
      depth: 0.5,
      alpha: (ramp - 0.25) * 0.16,
      color: AURORA,
      rows: 30,
      cols: 40
    });
  }

  // Streaks only arrive with the ramp, and never alone.
  if (ramp > 0.4) {
    streaks(ctx, t, {
      cx: 0.5,
      cy: 0.5,
      count: Math.round(120 * ramp),
      alpha: (ramp - 0.4) * 0.7,
      color: AURORA,
      inner: 0.02,
      outer: 0.7 + ramp * 0.6,
      len: 0.16 + ramp * 0.4
    });
  }
  glow(ctx, 0.5, 0.5, 0.1 + ramp * 0.42, 'rgba(244,246,251,0.6)', 0.08 + ramp * 0.3);

  const line1 = window01(local, 0.6, 6.4, 0.8, 1.0);
  text(ctx, 'Every agent.', 0.5, 0.36, 70, { weight: 300, color: BONE, alpha: line1, spacing: 3 });
  text(ctx, 'Every model.', 0.5, 0.45, 70, { weight: 300, color: MIST, alpha: window01(local, 2.0, 7.2, 0.8, 1.0), spacing: 3 });
  const line2 = window01(local, 9.4, 17.0, 1.0, 1.4);
  text(ctx, 'One place to command them all.', 0.5, 0.5, 58, { weight: 500, color: BONE, alpha: line2, spacing: 2 });
  rule(ctx, 0.58, (local - 11) / 2.4, line2 * 0.9, AURORA, 0.3);

  // Readout strip: sells the ramp as instrumentation rather than decoration.
  if (ramp > 0.15) {
    const a = (ramp - 0.15) * 1.1;
    text(ctx, `agents ${Math.round(6 + ramp * 34)}  ·  parallel  ·  ${speed.toFixed(1)}x`, 0.5, 0.93, 20, {
      font: '"JetBrains Mono", monospace', color: AURORA, alpha: clamp(a, 0, 1) * 0.85, spacing: 5
    });
  }

  const final = window01(local, 18.0, 21.4, 0.6, 0.6);
  text(ctx, 'THE NEW ERA', 0.5, 0.5, 96, { weight: 700, color: BONE, alpha: final, spacing: 12 });
}

function actImpact(ctx, t) {
  // 71.5–74s: the drop. A shockwave, then a hole in the world.
  const local = clamp(t - 71.5, 0, 2.5);
  const flash = Math.max(0, 1 - local / 0.42);
  const ring = easeOut(local / 2.2);
  ctx.save();
  ctx.fillStyle = BONE;
  ctx.globalAlpha = flash;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = (1 - ring) * 0.85;
  ctx.strokeStyle = BONE;
  ctx.lineWidth = 26 * (1 - ring) + 2;
  ctx.beginPath();
  ctx.arc(WIDTH / 2, HEIGHT / 2, ring * 1.5 * WIDTH, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = SIGNAL;
  ctx.lineWidth = 8 * (1 - ring) + 1;
  ctx.beginPath();
  ctx.arc(WIDTH / 2, HEIGHT / 2, ring * 1.1 * WIDTH, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  streaks(ctx, t, { cx: 0.5, cy: 0.5, count: 160, alpha: (1 - ring) * 0.6, color: BONE, inner: 0.05, outer: 0.9, len: 0.4 });
  glow(ctx, 0.5, 0.5, 0.9, 'rgba(255,107,61,0.5)', (1 - ring) * 0.5);
}

/*
 * 74–99s: the product, shown working.
 *
 * The old cut held three empty wireframe cards for 24 seconds. This holds
 * nothing: seven screens of simulated real software, cut every ~2.5s, with
 * whip-pan pushes, cut flashes and a scrubber that sells the velocity. The
 * last beat is the punchline card.
 */

const HERO_PLAN = [
  { id: 'terminal', dur: 3.2, tag: '01 · one prompt' },
  { id: 'editor', dur: 2.8, tag: '02 · it edits your code' },
  { id: 'dom', dur: 2.6, tag: '03 · it inspects the page' },
  { id: 'agents', dur: 3.0, tag: '04 · six agents, one intent' },
  { id: 'tests', dur: 2.6, tag: '05 · it verifies itself' },
  { id: 'deploy', dur: 2.4, tag: '06 · it ships' },
  { id: 'product', dur: 5.6, tag: '07 · the workspace' },
  { id: 'card', dur: 2.6, tag: '' }
];

/** The punchline: the brand line, held on black. */
function shotCard(ctx, local, alpha) {
  const inA = easeOut(local / 0.5);
  glow(ctx, 0.5, 0.5, 0.6, 'rgba(79,140,255,0.45)', inA * 0.26);
  mark(ctx, 0.5, 0.34, 0.08 * (0.82 + easeOut(local / 0.9) * 0.18), local, alpha * inA * 0.95);
  text(ctx, 'An agent that', 0.5, 0.58, 56, { weight: 300, color: MIST, alpha: alpha * inA, spacing: 2 });
  text(ctx, 'finishes the work.', 0.5, 0.67, 56, { weight: 600, color: BONE, alpha: alpha * easeOut((local - 0.3) / 0.6), spacing: 2 });
  rule(ctx, 0.755, (local - 0.7) / 1.2, alpha * easeOut((local - 0.7) / 0.8) * 0.9, SIGNAL, 0.32);
}

const HERO_SHOTS = {
  terminal: shotTerminal,
  editor: shotEditor,
  dom: shotDom,
  agents: shotAgents,
  tests: shotTests,
  deploy: shotDeploy,
  product: shotProduct,
  card: shotCard
};

function actHero(ctx, t) {
  const local = t - 74;
  dust(ctx, t, 110, 0.2, 0.012);
  glow(ctx, 0.5, 0.5, 0.8, 'rgba(79,140,255,0.3)', 0.15);

  const m = montage(local, HERO_PLAN, { fade: 0.13, push: 0.24 });
  const draw = HERO_SHOTS[m.shot.id];

  // Whip-pan push: alternate shots slide in from opposite sides and settle.
  ctx.save();
  const dir = m.index % 2 === 0 ? 1 : -1;
  ctx.translate(dir * m.slide * 0.07 * WIDTH, 0);
  const scale = 1 + (1 - easeOut(m.into / 0.7)) * 0.022;
  ctx.translate(WIDTH / 2, HEIGHT / 2);
  ctx.scale(scale, scale);
  ctx.translate(-WIDTH / 2, -HEIGHT / 2);
  draw(ctx, m.into, m.alpha);
  ctx.restore();

  cutFlash(ctx, local, m.times, 1);
  smear(ctx, local, m.times, 1, m.index % 2 === 0 ? SIGNAL : AURORA);

  // Shot chip: reads like a product-demo lower third, pinned top-centre.
  if (m.shot.tag) {
    const chip = easeOut(m.into / 0.25) * easeOut((m.shot.end - local) / 0.25);
    ctx.save();
    ctx.globalAlpha = chip * 0.5;
    ctx.fillStyle = 'rgba(5,6,10,0.85)';
    const cw = 0.2 * WIDTH;
    ctx.fillRect(WIDTH / 2 - cw / 2, 0.022 * HEIGHT, cw, 0.036 * HEIGHT);
    ctx.restore();
    text(ctx, m.shot.tag, 0.5, 0.040, 18, { font: '"JetBrains Mono", monospace', color: AURORA, alpha: chip * 0.95, spacing: 4 });
  }

  // Segment pips: eight slots, the live one filled.
  HERO_PLAN.forEach((p, i) => {
    const on = i === m.index;
    const px = 0.5 + (i - (HERO_PLAN.length - 1) / 2) * 0.022;
    ctx.save();
    ctx.globalAlpha = on ? 0.95 : 0.28;
    ctx.fillStyle = on ? SIGNAL : MIST;
    ctx.fillRect((px - 0.008) * WIDTH, 0.070 * HEIGHT, 0.016 * WIDTH, on ? 4 : 2);
    ctx.restore();
  });

  // Scrubber across the whole montage, with a tick on every cut.
  const prog = clamp(local / m.total, 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = 'rgba(141,152,178,0.28)';
  ctx.fillRect(0.06 * WIDTH, 0.978 * HEIGHT, 0.88 * WIDTH, 3);
  ctx.fillStyle = SIGNAL;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(0.06 * WIDTH, 0.978 * HEIGHT, 0.88 * WIDTH * prog, 3);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = BONE;
  m.times.forEach((s) => {
    ctx.fillRect((0.06 + 0.88 * (s.start / m.total)) * WIDTH, 0.9725 * HEIGHT, 1.5, 11);
  });
  ctx.restore();
}

function actReveal(ctx, t) {
  // 99–118s: the mark, and the name it stands for.
  const local = t - 99;
  const rise = easeOut(local / 3.4);
  dust(ctx, t, 160, 0.34, 0.01);
  glow(ctx, 0.5, 0.46, 0.55, 'rgba(79,140,255,0.45)', 0.22 + Math.sin(local * 0.8) * 0.05);
  mark(ctx, 0.5, 0.44 - (1 - rise) * 0.06, 0.115, t, rise * window01(local, 0, 19, 0.4, 1.6));

  const name = window01(local, 2.6, 12.0, 1.2, 1.4);
  text(ctx, 'NEWERA', 0.5, 0.66, 128, { weight: 700, color: BONE, alpha: name, spacing: 26 });
  rule(ctx, 0.735, (local - 4.0) / 2.6, window01(local, 4.0, 12.0, 1.0, 1.4) * 0.9, SIGNAL, 0.4);
  text(ctx, 'AI AGENT', 0.5, 0.79, 26, { font: '"JetBrains Mono", monospace', weight: 400, color: MIST, alpha: window01(local, 5.2, 12.0, 1.0, 1.4), spacing: 18 });

  const promise = window01(local, 13.4, 18.6, 1.0, 1.2);
  text(ctx, 'The new era of work', 0.5, 0.5, 62, { weight: 300, color: BONE, alpha: promise, spacing: 3 });
  text(ctx, 'starts with you.', 0.5, 0.58, 62, { weight: 300, color: MIST, alpha: window01(local, 14.6, 18.6, 1.0, 1.2), spacing: 3 });
}

function actOutro(ctx, t) {
  // 118–124s: the sign-off.
  const local = t - 118;
  const inAlpha = window01(local, 0.2, 6.0, 0.9, 1.6);
  dust(ctx, t, 100, 0.3, 0.006);
  glow(ctx, 0.5, 0.5, 0.5, 'rgba(79,140,255,0.4)', inAlpha * 0.22);
  mark(ctx, 0.5, 0.36, 0.055, t, inAlpha, BONE);
  text(ctx, 'NEWERA AI AGENT', 0.5, 0.53, 44, { weight: 600, color: BONE, alpha: inAlpha, spacing: 16 });
  rule(ctx, 0.585, local / 1.2, inAlpha * 0.8, SIGNAL, 0.34);
  text(ctx, 'newera.namansoni.in', 0.5, 0.65, 26, { font: '"JetBrains Mono", monospace', weight: 400, color: AURORA, alpha: window01(local, 0.8, 5.6, 1.0, 1.4), spacing: 5 });
  text(ctx, 'Build the new era.', 0.5, 0.78, 30, { weight: 300, color: MIST, alpha: window01(local, 1.6, 5.6, 1.0, 1.4), spacing: 6 });
}

/* ------------------------------------------------------------------ *
 * Renderer
 * ------------------------------------------------------------------ */

const ACT_RENDERERS = {
  cold: actCold,
  spark: actSpark,
  grid: actGrid,
  ascent: actAscent,
  impact: actImpact,
  hero: actHero,
  reveal: actReveal,
  outro: actOutro
};

/**
 * Create the film renderer bound to a canvas.
 * Returns { render(t), chapters } where `t` is seconds from the start.
 */
export function createFilm(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });

  function render(t) {
    const time = clamp(t, 0, 124);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const act = ACTS.find((a) => time >= a.start && time < a.end) || ACTS[ACTS.length - 1];
    ACT_RENDERERS[act.id](ctx, time);

    // Film grain, drawn deterministically per frame so captures stay stable.
    const rnd = mulberry32(Math.floor(time * 24) + 7);
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = BONE;
    for (let i = 0; i < 340; i += 1) {
      ctx.fillRect(rnd() * WIDTH, rnd() * HEIGHT, 1.6, 1.6);
    }
    ctx.restore();

    // Vignette keeps the eye in the centre of the frame.
    const vg = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.28, WIDTH / 2, HEIGHT / 2, HEIGHT * 0.86);
    vg.addColorStop(0, 'rgba(5,6,10,0)');
    vg.addColorStop(1, 'rgba(5,6,10,0.85)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  return { render, chapters: CHAPTERS, width: WIDTH, height: HEIGHT };
}
