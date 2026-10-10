/**
 * sim.js — simulated real software.
 *
 * The launch-film rule: never claim what the product does — show the product
 * doing it. Every screen in here is drawn as a working interface: a live
 * terminal transcript, a diffed code editor, a DOM inspector driven by a real
 * cursor, a parallel agent graph, a test runner, a deploy log and the product
 * itself. Real chrome, real glyphs, motion that never stops.
 *
 * Everything is a pure function of time, so the headless capture and the live
 * browser render the identical frame.
 */

const W = 1920;
const H = 1080;

const INK = '#05060a';
const PANEL = '#0a0e17';
const PANEL_2 = '#0e1420';
const BONE = '#f4f6fb';
const MIST = '#8d98b2';
const DIM = '#556075';
const SIGNAL = '#4f8cff';
const AURORA = '#7be0c8';
const EMBER = '#ff6b3d';
const ROSE = '#ff5d7a';

const MONO = '"JetBrains Mono", monospace';
const SANS = 'Inter, sans-serif';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeIn = (t) => Math.pow(clamp(t, 0, 1), 3);

/** Deterministic pseudo-random — every render must be identical. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ------------------------------------------------------------------ *
 * Primitives (stage units: x/y/w/h in 0..1, sizes in px)
 * ------------------------------------------------------------------ */

function rect(ctx, x, y, w, h, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x * W, y * H, w * W, h * H);
  ctx.restore();
}

function rrect(ctx, x, y, w, h, rad) {
  const rr = Math.max(0, Math.min(rad, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function box(ctx, x, y, w, h, opts = {}) {
  const { fill = PANEL, stroke = 'rgba(141,152,178,0.22)', alpha = 1, radius = 14, lw = 1.4 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  rrect(ctx, x * W, y * H, w * W, h * H, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.restore();
}

function label(ctx, value, x, y, size, opts = {}) {
  const {
    font = SANS, weight = 400, color = BONE, align = 'left',
    baseline = 'middle', spacing = 0, alpha = 1, blur = 0
  } = opts;
  if (alpha <= 0.004) return;
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
  const px = x * W;
  const py = y * H;
  if (spacing > 0) {
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

function hair(ctx, x1, y1, x2, y2, color, alpha = 1, width = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1 * W, y1 * H);
  ctx.lineTo(x2 * W, y2 * H);
  ctx.stroke();
  ctx.restore();
}

/** Reveal `n` characters of a string — the typewriter primitive. */
const typed = (s, n) => s.slice(0, Math.max(0, Math.floor(n)));

/** App-window chrome: title bar, traffic lights, title, optional right chip. */
function chrome(ctx, x, y, w, h, title, alpha, accent = SIGNAL, chip = '') {
  box(ctx, x, y, w, h, { alpha, fill: PANEL, stroke: 'rgba(141,152,178,0.26)', radius: 16 });
  const bar = 0.052;
  ctx.save();
  ctx.globalAlpha = alpha;
  rrect(ctx, x * W, y * H, w * W, bar * H, 16);
  ctx.clip();
  ctx.fillStyle = PANEL_2;
  ctx.fillRect(x * W, y * H, w * W, bar * H);
  ctx.restore();
  hair(ctx, x, y + bar, x + w, y + bar, 'rgba(141,152,178,0.22)', alpha);
  const cy = y + bar / 2;
  [ROSE, EMBER, AURORA].forEach((c, i) => {
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc((x + 0.014 + i * 0.0125) * W, cy * H, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  label(ctx, title, x + 0.062, cy, 19, { font: MONO, color: MIST, alpha: alpha * 0.95 });
  if (chip) {
    label(ctx, chip, x + w - 0.02, cy, 17, { font: MONO, color: accent, align: 'right', alpha: alpha * 0.9, spacing: 1.2 });
  }
  return y + bar;
}

/* ------------------------------------------------------------------ *
 * Shot 01 — the terminal: one prompt, six steps, a deployed site
 * ------------------------------------------------------------------ */

const TERM = [
  { k: 'cmd', s: 'newera run "rebuild the marketing site"' },
  { k: 'dim', s: 'resolve intent .......................... done' },
  { k: 'dim', s: 'plan .................................... 6 steps' },
  { k: 'ok', s: 'step 1/6  read repository ................ 0.8s' },
  { k: 'ok', s: 'step 2/6  edit src/pages/hero.tsx ......... 1.4s' },
  { k: 'ok', s: 'step 3/6  generate 3 assets ............... 2.1s' },
  { k: 'ok', s: 'step 4/6  run test suite .................. 4.6s' },
  { k: 'ok', s: 'step 5/6  build for production ............ 7.2s' },
  { k: 'ok', s: 'step 6/6  deploy .......................... 11.4s' },
  { k: 'done', s: 'done in 42s  ->  https://newera-film.pages.dev' }
];

const TERM_COLOR = { cmd: BONE, dim: MIST, ok: AURORA, done: BONE };

export function shotTerminal(ctx, local, alpha) {
  const x = 0.11;
  const y = 0.17;
  const w = 0.78;
  const h = 0.66;
  const top = chrome(ctx, x, y, w, h, 'newera — zsh — 132x38', alpha, SIGNAL, 'agent: running');
  const size = 25;
  const lh = 0.058;
  let clock = 0;
  ctx.save();
  ctx.font = `400 ${size}px ${MONO}`;
  TERM.forEach((ln, i) => {
    const start = 0.25 + i * 0.42;
    const dur = ln.s.length / 38;
    const revealed = typed(ln.s, (local - start) * 38);
    const on = local >= start;
    const a = alpha * (on ? clamp((local - start) / 0.12, 0, 1) : 0);
    const ly = top + 0.085 + i * lh;
    const color = TERM_COLOR[ln.k];
    let tx = x + 0.028;
    if (ln.k === 'cmd') {
      label(ctx, '➜', tx, ly, size, { font: MONO, color: AURORA, alpha: a });
      label(ctx, '~', tx + 0.026, ly, size, { font: MONO, color: SIGNAL, alpha: a });
      tx += 0.052;
    } else if (ln.k === 'ok') {
      label(ctx, '✓', tx, ly, size, { font: MONO, color: AURORA, alpha: a });
      tx += 0.03;
    } else if (ln.k === 'done') {
      rect(ctx, x + 0.02, ly - 0.026, w - 0.04, 0.052, AURORA, a * 0.1);
      label(ctx, '●', tx, ly, size, { font: MONO, color: AURORA, alpha: a });
      tx += 0.03;
    }
    label(ctx, revealed, tx, ly, size, {
      font: MONO,
      color,
      alpha: a * (ln.k === 'dim' ? 0.72 : 1),
      weight: ln.k === 'done' ? 600 : 400
    });
    // Blinking cursor sits on the line currently being written.
    if (on && local < start + dur + 0.12 && i < TERM.length - 1) {
      const cw = ctx.measureText(revealed).width;
      rect(ctx, 0, 0, 0, 0, BONE, 0);
      ctx.save();
      ctx.globalAlpha = alpha * (Math.sin(local * 9) > 0 ? 0.9 : 0.15);
      ctx.fillStyle = BONE;
      ctx.fillRect(tx * W + cw + 4, (ly - 0.017) * H, 12, 0.034 * H);
      ctx.restore();
    }
    clock = Math.max(clock, on ? local - start : 0);
  });
  ctx.restore();
  // Live footer: spinner, elapsed, token meter.
  const fy = y + h - 0.035;
  hair(ctx, x + 0.02, fy - 0.028, x + w - 0.02, fy - 0.028, 'rgba(141,152,178,0.2)', alpha);
  const spin = (local * 0.6) % 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = SIGNAL;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc((x + 0.032) * W, fy * H, 9, spin * Math.PI * 2, spin * Math.PI * 2 + 2.1);
  ctx.stroke();
  ctx.restore();
  label(ctx, `elapsed ${clock.toFixed(1)}s`, x + 0.052, fy, 18, { font: MONO, color: MIST, alpha });
  label(ctx, 'tokens 18.4k · cost $0.31', x + w - 0.02, fy, 18, { font: MONO, color: DIM, align: 'right', alpha });
}

/* ------------------------------------------------------------------ *
 * Shot 02 — the editor: the agent editing real source with a real diff
 * ------------------------------------------------------------------ */

const CODE = [
  "const { createFilm } = await load(filmModule);",
  "const { renderScore } = await load(scoreModule);",
  '',
  'export function mount(root) {',
  '  const canvas = root.querySelector("canvas");',
  '  const film = createFilm(canvas);',
  '  const audio = renderScore({ bpm: 92 });',
  '',
  '  // Drive the picture from one clock so A/V never drift.',
  '  function frame(now) {',
  '    const t = (now - startedAt) / 1000;',
  '    film.render(t);',
  '    requestAnimationFrame(frame);',
  '  }',
  '',
  '  requestAnimationFrame(frame);',
  '}'
];

const DIFF = { 3: '+', 4: '+', 5: '-', 6: '+', 9: '-', 12: '+' };

const KW = /^(import|from|export|const|let|function|return|if|else|await|async|new|class|for)$/;

function tokenize(ctx, src) {
  const out = [];
  const re = /"[^"]*"|'[^']*'|\/\/.*$|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|\s+|./g;
  let m;
  while ((m = re.exec(src))) {
    const s = m[0];
    let c = MIST;
    if (/^["'`]/.test(s)) c = AURORA;
    else if (s.startsWith('//')) c = DIM;
    else if (KW.test(s)) c = SIGNAL;
    else if (/^\d/.test(s)) c = EMBER;
    else if (/^[A-Za-z_$]/.test(s) && /^\s*\(/.test(src.slice(m.index + s.length))) c = BONE;
    else if (/^[A-Za-z_$]/.test(s)) c = '#c3ccdd';
    else if (s.trim() === '') c = MIST;
    out.push({ s, c });
  }
  return out;
}

const TREE = [
  ['▾ src', 0],
  ['▾ engine', 1],
  ['film.js', 2],
  ['score.js', 2],
  ['audio.js', 2],
  ['sim.js', 2],
  ['main.js', 1],
  ['styles.css', 1],
  ['index.html', 0]
];

export function shotEditor(ctx, local, alpha) {
  const x = 0.08;
  const y = 0.14;
  const w = 0.84;
  const h = 0.72;
  const top = chrome(ctx, x, y, w, h, 'newera-ai-agent — visual studio', alpha, SIGNAL, '＋12  −4');
  const tabs = ['film.js', 'sim.js', 'hero.tsx'];
  const tabW = 0.13;
  const tabH = 0.046;
  tabs.forEach((tb, i) => {
    const tx = x + 0.02 + i * tabW;
    const active = i === 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    rrect(ctx, tx * W, top * H, tabW * W, tabH * H, 8);
    ctx.fillStyle = active ? PANEL_2 : 'rgba(14,20,32,0.5)';
    ctx.fill();
    ctx.restore();
    label(ctx, tb, tx + 0.012, top + tabH / 2, 18, { font: MONO, color: active ? BONE : DIM, alpha });
    if (active) hair(ctx, tx, top + tabH, tx + tabW, top + tabH, SIGNAL, alpha, 2.4);
  });
  const bodyTop = top + tabH + 0.012;
  // Sidebar
  rect(ctx, x + 0.014, bodyTop, 0.19, h - (bodyTop - y) - 0.03, 'rgba(10,14,23,0.9)', alpha);
  label(ctx, 'EXPLORER', x + 0.028, bodyTop + 0.032, 15, { font: MONO, color: DIM, alpha, spacing: 2 });
  TREE.forEach((row, i) => {
    const [name, depth] = row;
    const ry = bodyTop + 0.078 + i * 0.042;
    const sel = name === 'sim.js';
    if (sel) rect(ctx, x + 0.02, ry - 0.021, 0.178, 0.042, SIGNAL, alpha * 0.16);
    label(ctx, name, x + 0.036 + depth * 0.022, ry, 17, {
      font: MONO,
      color: sel ? BONE : name.includes('.') ? MIST : '#aeb8cc',
      alpha
    });
  });
  // Gutter + code
  const gx = x + 0.235;
  const size = 24;
  const lh = 0.05;
  const cy0 = bodyTop + 0.055;
  const caretLine = clamp(Math.floor((local - 0.6) / 0.55), 0, CODE.length - 1);
  CODE.forEach((src, i) => {
    const ly = cy0 + i * lh;
    const reveal = clamp((local - 0.5 - i * 0.22) / 0.3, 0, 1);
    const a = alpha * reveal;
    if (a <= 0.004) return;
    const mark = DIFF[i];
    if (mark === '+') rect(ctx, gx - 0.05, ly - 0.024, 0.62, lh, AURORA, alpha * 0.09);
    if (mark === '-') rect(ctx, gx - 0.05, ly - 0.024, 0.62, lh, ROSE, alpha * 0.09);
    label(ctx, String(i + 1).padStart(2, ' '), gx - 0.022, ly, 17, { font: MONO, color: DIM, align: 'right', alpha: a });
    if (mark) label(ctx, mark, gx - 0.052, ly, 17, { font: MONO, color: mark === '+' ? AURORA : ROSE, alpha: a });
    let cx2 = gx;
    ctx.save();
    ctx.font = `400 ${size}px ${MONO}`;
    tokenize(ctx, src).forEach((tk) => {
      label(ctx, tk.s, cx2, ly, size, { font: MONO, color: tk.c, alpha: a });
      cx2 += (ctx.measureText(tk.s).width + 0) / W;
    });
    ctx.restore();
    if (i === caretLine) {
      ctx.save();
      ctx.globalAlpha = alpha * (Math.sin(local * 8) > 0 ? 1 : 0.2);
      ctx.fillStyle = BONE;
      ctx.fillRect(cx2 * W + 3, (ly - 0.016) * H, 11, 0.032 * H);
      ctx.restore();
    }
  });
  // Minimap
  const mx = x + w - 0.055;
  const rnd = rng(77);
  for (let i = 0; i < 34; i += 1) {
    const mw = 0.012 + rnd() * 0.03;
    rect(ctx, mx, bodyTop + 0.02 + i * 0.0165, mw, 0.005, rnd() > 0.7 ? AURORA : MIST, alpha * 0.5);
  }
  // Inline agent hint: the model explaining its own edit.
  const hint = clamp((local - 3.4) / 0.5, 0, 1);
  if (hint > 0) {
    const hy = y + h - 0.075;
    box(ctx, gx - 0.05, hy - 0.03, 0.62, 0.062, { alpha: alpha * hint, fill: 'rgba(79,140,255,0.12)', stroke: 'rgba(79,140,255,0.5)', radius: 10 });
    label(ctx, '◆ newera: hoisted the clock so picture and score share one timeline', gx - 0.03, hy, 17, { font: MONO, color: SIGNAL, alpha: alpha * hint });
  }
}

/* ------------------------------------------------------------------ *
 * Montage driver — the cut rhythm that keeps the eye moving
 * ------------------------------------------------------------------ */

/**
 * Walk a shot plan of { id, dur } and report which shot is live, how far into
 * it we are, and a push value the act uses for whip-pan slides. Non-looping:
 * after the last shot the final frame holds.
 */
export function montage(local, plan, { fade = 0.16, push = 0.22 } = {}) {
  let acc = 0;
  const times = plan.map((p) => {
    const s = acc;
    acc += p.dur;
    return { ...p, start: s, end: acc };
  });
  const total = acc;
  const lt = clamp(local, 0, total);
  let i = times.findIndex((s) => lt >= s.start && lt < s.end);
  if (i === -1) i = times.length - 1;
  const cur = times[i];
  const into = lt - cur.start;
  const left = cur.end - lt;
  const alpha = Math.min(easeOut(into / fade), easeOut(left / fade), 1);
  const slide = 1 - easeOut(into / push);
  return { index: i, shot: cur, into, alpha, slide, times, total };
}

/**
 * Cut flash — a 1-frame horizontal smear and a hairline of light on every cut.
 * This is what sells a hard cut as intentional rather than accidental.
 */
export function cutFlash(ctx, local, times, alpha) {
  times.forEach((s) => {
    const d = local - s.start;
    if (d < 0 || d > 0.24) return;
    const p = 1 - d / 0.24;
    ctx.save();
    ctx.globalAlpha = alpha * p * 0.5;
    ctx.fillStyle = 'rgba(244,246,251,0.9)';
    ctx.fillRect(0, (0.5 - p * 0.02) * H, W, p * 0.04 * H);
    ctx.globalAlpha = alpha * p * 0.22;
    ctx.fillStyle = SIGNAL;
    for (let i = 0; i < 40; i += 1) {
      const y = ((i * 97) % 100) / 100;
      const w = 0.08 + ((i * 37) % 30) / 100;
      ctx.fillRect(((i * 61) % 100) / 100 * W - w * W, y * H, w * W, 2);
    }
    ctx.restore();
  });
}

/** A soft motion smear drawn across the whole frame during a fast cut. */
export function smear(ctx, local, times, alpha, color = SIGNAL) {
  times.forEach((s) => {
    const d = local - s.start;
    if (d < 0 || d > 0.3) return;
    const p = 1 - d / 0.3;
    ctx.save();
    ctx.globalAlpha = alpha * p * 0.3;
    ctx.strokeStyle = color;
    for (let i = 0; i < 70; i += 1) {
      const y = ((i * 53) % 100) / 100;
      const len = (0.1 + ((i * 29) % 40) / 100) * p;
      ctx.lineWidth = 1 + ((i * 13) % 3);
      ctx.beginPath();
      ctx.moveTo(0.5 * W - len * W, y * H);
      ctx.lineTo(0.5 * W + len * W, y * H);
      ctx.stroke();
    }
    ctx.restore();
  });
}

/* ------------------------------------------------------------------ *
 * Shot 03 — the DOM inspector: the agent reading a real page
 * ------------------------------------------------------------------ */

const DOM_TREE = [
  ['▾ body', 0],
  ['▾ div#app', 1],
  ['▾ header.hero', 2],
  ['h1.headline', 3],
  ['p.subtitle', 3],
  ['button.cta', 3],
  ['▾ section.grid', 2],
  ['div.card', 3],
  ['div.card', 3],
  ['div.card', 3],
  ['▸ footer', 1]
];

const STYLES = [
  ['display', 'block'],
  ['font-size', '64px'],
  ['font-weight', '600'],
  ['letter-spacing', '2px'],
  ['color', '#f4f6fb'],
  ['background', '#05060a'],
  ['opacity', '1'],
  ['grid-template', '3 × 1fr']
];

/** Cursor path through the inspector: move, hover, click, snap. */
function cursorAt(local) {
  const keys = [
    { t: 0.0, x: 0.72, y: 0.78 },
    { t: 0.7, x: 0.44, y: 0.42 },
    { t: 1.5, x: 0.42, y: 0.4 },
    { t: 2.4, x: 0.63, y: 0.55 },
    { t: 3.4, x: 0.6, y: 0.52 }
  ];
  let i = 0;
  while (i < keys.length - 1 && local > keys[i + 1].t) i += 1;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const p = b.t === a.t ? 1 : easeOut((local - a.t) / (b.t - a.t));
  return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p) };
}

export function shotDom(ctx, local, alpha) {
  const x = 0.06;
  const y = 0.13;
  const w = 0.88;
  const h = 0.74;
  const top = chrome(ctx, x, y, w, h, 'newera — devtools — inspect', alpha, AURORA, 'node: h1.headline');
  const bodyTop = top + 0.02;

  // Left: element tree
  rect(ctx, x + 0.012, bodyTop, 0.24, h - (bodyTop - y) - 0.03, 'rgba(10,14,23,0.92)', alpha);
  label(ctx, 'ELEMENTS', x + 0.026, bodyTop + 0.03, 15, { font: MONO, color: DIM, alpha, spacing: 2 });
  DOM_TREE.forEach((row, i) => {
    const [name, depth] = row;
    const ry = bodyTop + 0.072 + i * 0.044;
    const sel = name === 'h1.headline';
    const appear = clamp((local - i * 0.09) / 0.2, 0, 1);
    if (sel) rect(ctx, x + 0.018, ry - 0.022, 0.226, 0.044, AURORA, alpha * appear * 0.2);
    label(ctx, name, x + 0.032 + depth * 0.02, ry, 17, {
      font: MONO,
      color: sel ? AURORA : name.startsWith('▾') || name.startsWith('▸') ? MIST : '#b9c3d6',
      alpha: alpha * appear
    });
  });

  // Centre: the page being inspected, with a snapping highlight box
  const px = x + 0.27;
  const pw = 0.42;
  box(ctx, px, bodyTop, pw, h - (bodyTop - y) - 0.03, { alpha, fill: '#070a12', stroke: 'rgba(141,152,178,0.18)', radius: 10 });
  label(ctx, 'EVERY ERA', px + pw / 2, bodyTop + 0.14, 54, { font: 'Cormorant Garamond, serif', weight: 300, color: BONE, align: 'center', alpha: alpha * 0.9, spacing: 3 });
  label(ctx, 'begins in the dark', px + pw / 2, bodyTop + 0.23, 54, { font: 'Cormorant Garamond, serif', weight: 300, color: MIST, align: 'center', alpha: alpha * 0.75, spacing: 3 });
  for (let i = 0; i < 3; i += 1) {
    const cw = (pw - 0.05) / 3;
    box(ctx, px + 0.012 + i * cw, bodyTop + 0.34, cw - 0.012, 0.2, { alpha: alpha * 0.8, fill: PANEL_2, stroke: 'rgba(141,152,178,0.16)', radius: 8 });
    for (let r = 0; r < 3; r += 1) {
      rect(ctx, px + 0.022 + i * cw, bodyTop + 0.37 + r * 0.028, cw - 0.03 - r * 0.02, 0.008, MIST, alpha * 0.45);
    }
  }
  // Highlight box snaps to the headline on the first click.
  const snap = easeOut((local - 1.15) / 0.35);
  if (snap > 0) {
    ctx.save();
    ctx.globalAlpha = alpha * snap;
    ctx.strokeStyle = AURORA;
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(123,224,200,0.12)';
    const hx = px + 0.035;
    const hy = bodyTop + 0.095;
    const hw = pw - 0.07;
    const hh = 0.062;
    ctx.fillRect(hx * W, hy * H, hw * W, hh * H);
    ctx.strokeRect(hx * W, hy * H, hw * W, hh * H);
    label(ctx, 'h1.headline  ·  64px  ·  1120 × 67', hx + 0.006, hy - 0.026, 15, { font: MONO, color: AURORA, alpha: alpha * snap });
    // Padding box overlay
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(123,224,200,0.5)';
    ctx.strokeRect((hx - 0.006) * W, (hy - 0.012) * H, (hw + 0.012) * W, (hh + 0.024) * H);
    ctx.restore();
  }

  // Right: computed styles, one row resolving at a time
  const sx = x + 0.705;
  rect(ctx, sx, bodyTop, 0.163, h - (bodyTop - y) - 0.03, 'rgba(10,14,23,0.92)', alpha);
  label(ctx, 'COMPUTED', sx + 0.014, bodyTop + 0.03, 15, { font: MONO, color: DIM, alpha, spacing: 2 });
  STYLES.forEach((row, i) => {
    const ry = bodyTop + 0.075 + i * 0.042;
    const a = alpha * clamp((local - 1.3 - i * 0.12) / 0.25, 0, 1);
    label(ctx, row[0], sx + 0.014, ry, 16, { font: MONO, color: MIST, alpha: a * 0.85 });
    label(ctx, row[1], sx + 0.152, ry, 16, { font: MONO, color: BONE, align: 'right', alpha: a });
  });
  const audit = clamp((local - 3.1) / 0.4, 0, 1);
  if (audit > 0) {
    box(ctx, sx + 0.008, bodyTop + 0.44, 0.147, 0.07, { alpha: alpha * audit, fill: 'rgba(255,107,61,0.14)', stroke: 'rgba(255,107,61,0.5)', radius: 8 });
    label(ctx, '3 layout shifts', sx + 0.02, bodyTop + 0.462, 16, { font: MONO, color: EMBER, alpha: alpha * audit });
    label(ctx, 'patched automatically', sx + 0.02, bodyTop + 0.488, 14, { font: MONO, color: MIST, alpha: alpha * audit * 0.9 });
  }

  // The cursor itself
  const c = cursorAt(local);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.moveTo(c.x * W, c.y * H);
  ctx.lineTo(c.x * W + 13, c.y * H + 30);
  ctx.lineTo(c.x * W + 20, c.y * H + 20);
  ctx.lineTo(c.x * W + 33, c.y * H + 17);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const click = local > 1.15 && local < 1.5;
  if (click) {
    const p = (local - 1.15) / 0.35;
    ctx.save();
    ctx.globalAlpha = alpha * (1 - p) * 0.8;
    ctx.strokeStyle = AURORA;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(c.x * W, c.y * H, 10 + p * 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ *
 * Shot 04 — the agent graph: six workers, one intent
 * ------------------------------------------------------------------ */

const NODES = [
  { id: 'root', label: 'newera', x: 0.5, y: 0.32, r: 0.075, accent: BONE },
  { id: 'research', label: 'research', x: 0.24, y: 0.58, r: 0.05, accent: SIGNAL },
  { id: 'write', label: 'write', x: 0.37, y: 0.68, r: 0.05, accent: AURORA },
  { id: 'test', label: 'test', x: 0.52, y: 0.72, r: 0.05, accent: AURORA },
  { id: 'review', label: 'review', x: 0.66, y: 0.65, r: 0.05, accent: EMBER },
  { id: 'deploy', label: 'deploy', x: 0.78, y: 0.55, r: 0.05, accent: SIGNAL }
];

const LANES = [
  { label: 'research', start: 0.5, dur: 2.6, accent: SIGNAL },
  { label: 'write', start: 1.1, dur: 3.4, accent: AURORA },
  { label: 'test', start: 2.4, dur: 2.8, accent: AURORA },
  { label: 'review', start: 3.6, dur: 2.2, accent: EMBER },
  { label: 'deploy', start: 4.6, dur: 2.0, accent: SIGNAL }
];

export function shotAgents(ctx, local, alpha) {
  const root = NODES[0];
  // Edges, drawn as curved links with pulses travelling outward.
  NODES.slice(1).forEach((n, i) => {
    const grow = easeOut((local - 0.2 - i * 0.12) / 0.5);
    if (grow <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha * grow;
    ctx.strokeStyle = n.accent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(root.x * W, root.y * H);
    ctx.quadraticCurveTo(((root.x + n.x) / 2) * W, ((root.y + n.y) / 2 + 0.06) * H, n.x * W, n.y * H);
    ctx.stroke();
    ctx.restore();
    // Pulse: a dot running the edge, then a return packet.
    const phase = ((local * 0.8 + i * 0.17) % 1);
    const t = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
    const qx = lerp(root.x, n.x, t);
    const qy = lerp(root.y, n.y, t) + Math.sin(t * Math.PI) * 0.06;
    ctx.save();
    ctx.globalAlpha = alpha * grow * 0.95;
    ctx.fillStyle = phase < 0.5 ? n.accent : BONE;
    ctx.beginPath();
    ctx.arc(qx * W, qy * H, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  NODES.forEach((n, i) => {
    const on = clamp((local - 0.2 - i * 0.12) / 0.5, 0, 1);
    if (on <= 0) return;
    const r = n.r * W * (0.6 + easeOut(on) * 0.4);
    ctx.save();
    ctx.globalAlpha = alpha * on;
    const g = ctx.createRadialGradient(n.x * W, n.y * H, 0, n.x * W, n.y * H, r * 1.9);
    g.addColorStop(0, n.accent);
    g.addColorStop(1, 'rgba(5,6,10,0)');
    ctx.globalAlpha = alpha * on * 0.3;
    ctx.fillStyle = g;
    ctx.fillRect(n.x * W - r * 2, n.y * H - r * 2, r * 4, r * 4);
    ctx.globalAlpha = alpha * on;
    ctx.beginPath();
    ctx.arc(n.x * W, n.y * H, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(10,14,23,0.92)';
    ctx.fill();
    ctx.strokeStyle = n.accent;
    ctx.lineWidth = i === 0 ? 3 : 2;
    ctx.stroke();
    // Progress ring around each worker.
    if (i > 0) {
      const p = clamp((local - 0.6 - i * 0.2) / 2.6, 0, 1);
      ctx.beginPath();
      ctx.strokeStyle = BONE;
      ctx.lineWidth = 2.4;
      ctx.arc(n.x * W, n.y * H, r + 9, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    label(ctx, n.label, n.x, n.y + 0.001, 20, { font: MONO, color: i === 0 ? BONE : n.accent, align: 'center', alpha: alpha * on, weight: 500 });
  });

  // Header + counters
  label(ctx, 'SIX AGENTS  ·  ONE INTENT', 0.5, 0.11, 26, { font: MONO, color: MIST, align: 'center', alpha, spacing: 10 });
  label(ctx, 'parallel execution', 0.5, 0.165, 20, { font: MONO, color: DIM, align: 'center', alpha, spacing: 4 });

  // Bottom: a real concurrent-lane timeline.
  const ly = 0.87;
  LANES.forEach((ln, i) => {
    const y = ly + i * 0.026;
    const s = 0.2 + ln.start * 0.1;
    const e = s + ln.dur * 0.1;
    const p = clamp((local - ln.start) / ln.dur, 0, 1);
    label(ctx, ln.label, 0.2, y, 15, { font: MONO, color: MIST, align: 'right', alpha: alpha * 0.9 });
    rect(ctx, s, y - 0.007, (e - s), 0.014, 'rgba(141,152,178,0.18)', alpha);
    rect(ctx, s, y - 0.007, (e - s) * p, 0.014, ln.accent, alpha);
    if (p > 0 && p < 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = BONE;
      ctx.beginPath();
      ctx.arc((s + (e - s) * p) * W, y * H, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
}

/* ------------------------------------------------------------------ *
 * Shot 05 — the test runner: green, then green again
 * ------------------------------------------------------------------ */

const SUITES = [
  { name: 'engine/film.test.js', cases: 8 },
  { name: 'engine/score.test.js', cases: 5 },
  { name: 'engine/audio.test.js', cases: 6 },
  { name: 'ui/player.test.jsx', cases: 4 },
  { name: 'e2e/launch.spec.ts', cases: 3 }
];

export function shotTests(ctx, local, alpha) {
  const x = 0.14;
  const y = 0.15;
  const w = 0.72;
  const h = 0.68;
  const top = chrome(ctx, x, y, w, h, 'newera — vitest — run 4f21c', alpha, AURORA, 'watch mode');
  const size = 24;
  const lh = 0.052;
  let row = 0;
  let passed = 0;
  const total = SUITES.reduce((a, s) => a + s.cases, 0);
  SUITES.forEach((s, si) => {
    const sStart = 0.3 + si * 0.62;
    const sa = alpha * clamp((local - sStart) / 0.18, 0, 1);
    const ly = top + 0.075 + row * lh;
    label(ctx, '▸', x + 0.026, ly, size, { font: MONO, color: MIST, alpha: sa });
    label(ctx, s.name, x + 0.05, ly, size, { font: MONO, color: BONE, alpha: sa });
    const suiteDone = clamp((local - sStart - 0.3) / (s.cases * 0.16), 0, 1);
    label(ctx, `${Math.round(suiteDone * s.cases)}/${s.cases}`, x + w - 0.03, ly, size, { font: MONO, color: MIST, align: 'right', alpha: sa * 0.9 });
    if (suiteDone >= 1) {
      label(ctx, '✓', x + w - 0.09, ly, size, { font: MONO, color: AURORA, align: 'right', alpha: sa });
      passed += s.cases;
    }
    row += 1;
    // One individual test line, animating in.
    const ca = alpha * clamp((local - sStart - 0.5) / 0.2, 0, 1);
    label(ctx, `✓ ${s.name.split('/')[0]} resolves its contract`, x + 0.075, ly + lh * 0.62, 19, { font: MONO, color: 'rgba(123,224,200,0.85)', alpha: ca * 0.9 });
    row += 1;
  });
  // A flaky test beat: fail, retry, pass.
  const flaky = 3.9;
  if (local > flaky) {
    const a = alpha * clamp((local - flaky) / 0.2, 0, 1);
    const ly = top + 0.075 + row * lh;
    const retried = local > flaky + 0.7;
    label(ctx, retried ? '✓' : '✕', x + 0.026, ly, size, { font: MONO, color: retried ? AURORA : ROSE, alpha: a });
    label(ctx, retried ? 'e2e/launch.spec.ts  (retry 1 — passed)' : 'e2e/launch.spec.ts  (flaky — retrying)', x + 0.05, ly, size, { font: MONO, color: retried ? BONE : ROSE, alpha: a });
    row += 1;
  }
  // Summary bar: coverage fills to 94%.
  const sy = y + h - 0.055;
  hair(ctx, x + 0.02, sy - 0.032, x + w - 0.02, sy - 0.032, 'rgba(141,152,178,0.22)', alpha);
  const cov = easeOut((local - 4.6) / 1.6);
  label(ctx, `coverage ${(cov * 94).toFixed(0)}%`, x + 0.026, sy, 19, { font: MONO, color: AURORA, alpha });
  rect(ctx, x + 0.19, sy - 0.008, 0.34, 0.014, 'rgba(141,152,178,0.2)', alpha);
  rect(ctx, x + 0.19, sy - 0.008, 0.34 * cov, 0.014, AURORA, alpha);
  label(ctx, `${passed + (local > flaky + 0.7 ? 3 : 0)}/${total} passed`, x + w - 0.026, sy, 19, { font: MONO, color: BONE, align: 'right', alpha });
}

/* ------------------------------------------------------------------ *
 * Shot 06 — the deploy: edges lighting up, a URL going live
 * ------------------------------------------------------------------ */

const EDGES = [
  [0.16, 0.42], [0.28, 0.3], [0.36, 0.52], [0.47, 0.36], [0.55, 0.6],
  [0.63, 0.34], [0.72, 0.5], [0.83, 0.38], [0.24, 0.66], [0.44, 0.72],
  [0.6, 0.78], [0.78, 0.68], [0.88, 0.58], [0.12, 0.6], [0.34, 0.2]
];

const DEPLOY_LOG = [
  'build  ·  vite build ................ 7.2s',
  'assets ·  6 files  ·  412 KB ......... gzip 118 KB',
  'upload ·  newera-film.pages.dev ..... 61 regions',
  'verify ·  HTTP 200 in 41ms .......... edge: bom1'
];

export function shotDeploy(ctx, local, alpha) {
  // Left: the log
  const x = 0.06;
  const y = 0.2;
  const w = 0.42;
  const h = 0.6;
  const top = chrome(ctx, x, y, w, h, 'deploy — cloudflare pages', alpha, AURORA, 'live');
  DEPLOY_LOG.forEach((ln, i) => {
    const a = alpha * clamp((local - 0.2 - i * 0.5) / 0.2, 0, 1);
    label(ctx, '✓', x + 0.022, top + 0.085 + i * 0.075, 21, { font: MONO, color: AURORA, alpha: a });
    label(ctx, ln, x + 0.045, top + 0.085 + i * 0.075, 21, { font: MONO, color: MIST, alpha: a });
  });
  const bar = easeOut((local - 0.1) / 2.2);
  label(ctx, 'propagation', x + 0.022, y + h - 0.075, 18, { font: MONO, color: DIM, alpha });
  rect(ctx, x + 0.15, y + h - 0.082, 0.24, 0.014, 'rgba(141,152,178,0.2)', alpha);
  rect(ctx, x + 0.15, y + h - 0.082, 0.24 * bar, 0.014, SIGNAL, alpha);

  // Right: the edge map, each node lighting in sequence
  const gx = 0.53;
  const gy = 0.2;
  const gw = 0.41;
  const gh = 0.6;
  box(ctx, gx, gy, gw, gh, { alpha, fill: '#070a12', stroke: 'rgba(141,152,178,0.2)', radius: 14 });
  label(ctx, 'EDGE NETWORK', gx + 0.02, gy + 0.04, 15, { font: MONO, color: DIM, alpha, spacing: 2 });
  EDGES.forEach(([ex, ey], i) => {
    const nx = gx + 0.04 + ex * (gw - 0.08);
    const ny = gy + 0.1 + ey * (gh - 0.2);
    const on = clamp((local - 0.3 - i * 0.12) / 0.4, 0, 1);
    if (on <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha * on * 0.5;
    ctx.strokeStyle = SIGNAL;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo((gx + gw / 2) * W, (gy + gh / 2) * H);
    ctx.lineTo(nx * W, ny * H);
    ctx.stroke();
    ctx.globalAlpha = alpha * on;
    ctx.fillStyle = AURORA;
    ctx.beginPath();
    ctx.arc(nx * W, ny * H, 3.4 + on * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = BONE;
  ctx.beginPath();
  ctx.arc((gx + gw / 2) * W, (gy + gh / 2) * H, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // The result chip: the URL, stamped on.
  const stamp = clamp((local - 2.4) / 0.4, 0, 1);
  if (stamp > 0) {
    const cy = 0.87;
    box(ctx, 0.5 - 0.19, cy - 0.036, 0.38, 0.072, { alpha: alpha * stamp, fill: 'rgba(123,224,200,0.12)', stroke: AURORA, radius: 999 });
    label(ctx, '●  newera-film.pages.dev  —  live', 0.5, cy, 24, { font: MONO, color: AURORA, align: 'center', alpha: alpha * stamp, weight: 500 });
    const pulse = 0.5 + 0.5 * Math.sin(local * 5);
    ctx.save();
    ctx.globalAlpha = alpha * stamp * pulse;
    ctx.fillStyle = AURORA;
    ctx.beginPath();
    ctx.arc(0.5 * W - 0.175 * W, cy * H, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ *
 * Shot 07 — the product itself: a plan executing, an artifact landing
 * ------------------------------------------------------------------ */

const SIDEBAR = [
  ['⌘', 'New task'],
  ['◆', 'Rebuild the marketing site'],
  ['◇', 'Fix the flaky deploy'],
  ['◇', 'Audit accessibility'],
  ['◇', 'Write the launch thread']
];

const PLAN = [
  ['Read the repository', 0.4, 1.0],
  ['Rewrite the hero section', 1.2, 1.4],
  ['Generate three assets', 2.4, 1.2],
  ['Run the test suite', 3.4, 1.6],
  ['Deploy to production', 4.8, 1.4]
];

export function shotProduct(ctx, local, alpha) {
  const x = 0.05;
  const y = 0.11;
  const w = 0.9;
  const h = 0.78;
  chrome(ctx, x, y, w, h, 'newera  ·  workspace', alpha, SIGNAL, 'agent working');
  const top = y + 0.052;
  const bot = y + h;

  // Sidebar
  rect(ctx, x, top, 0.2, bot - top - 0.01, 'rgba(8,11,18,0.95)', alpha);
  SIDEBAR.forEach((row, i) => {
    const ry = top + 0.06 + i * 0.055;
    const active = i === 1;
    if (active) {
      rect(ctx, x + 0.008, ry - 0.022, 0.184, 0.048, SIGNAL, alpha * 0.16);
      rect(ctx, x + 0.008, ry - 0.022, 0.003, 0.048, SIGNAL, alpha);
    }
    label(ctx, row[0], x + 0.024, ry, 17, { font: SANS, color: active ? SIGNAL : DIM, alpha });
    label(ctx, row[1], x + 0.044, ry, 17, { font: SANS, color: active ? BONE : MIST, alpha: alpha * (active ? 1 : 0.75) });
  });

  // Main: the task, the plan executing, the artifact
  const mx = x + 0.215;
  const mw = w - 0.23;
  label(ctx, 'Rebuild the marketing site', mx, top + 0.055, 30, { font: SANS, weight: 600, color: BONE, alpha });
  label(ctx, 'newera is working · 5 steps · 42s elapsed', mx, top + 0.1, 18, { font: MONO, color: MIST, alpha });

  PLAN.forEach(([name, s, d], i) => {
    const ry = top + 0.175 + i * 0.062;
    const p = clamp((local - s) / d, 0, 1);
    const on = clamp((local - s + 0.4) / 0.3, 0, 1);
    if (on <= 0) return;
    const done = p >= 1;
    ctx.save();
    ctx.globalAlpha = alpha * on;
    ctx.strokeStyle = done ? AURORA : SIGNAL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc((mx + 0.011) * W, ry * H, 10, -Math.PI / 2, -Math.PI / 2 + (done ? Math.PI * 2 : p * Math.PI * 2));
    ctx.stroke();
    if (done) {
      ctx.strokeStyle = AURORA;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo((mx + 0.005) * W, ry * H);
      ctx.lineTo((mx + 0.01) * W, (ry + 0.012) * H);
      ctx.lineTo((mx + 0.019) * W, (ry - 0.012) * H);
      ctx.stroke();
    }
    ctx.restore();
    label(ctx, name, mx + 0.032, ry, 21, { font: SANS, color: done ? BONE : MIST, alpha: alpha * on });
    label(ctx, done ? 'done' : `${(p * 100).toFixed(0)}%`, mx + mw - 0.02, ry, 17, { font: MONO, color: done ? AURORA : DIM, align: 'right', alpha: alpha * on });
    // Live sub-output under the running step.
    if (!done && p > 0) {
      label(ctx, i === 3 ? '  24/26 passing …' : '  streaming output …', mx + 0.032, ry + 0.026, 15, { font: MONO, color: DIM, alpha: alpha * on * 0.9 });
    }
  });

  // Artifact pane: a rendered thumbnail of the page the agent produced.
  const ax = mx + mw * 0.52;
  const aw = mw * 0.46;
  box(ctx, ax, top + 0.155, aw, 0.44, { alpha: alpha * clamp((local - 1.6) / 0.5, 0, 1), fill: '#070a12', stroke: 'rgba(141,152,178,0.22)', radius: 12 });
  const aa = alpha * clamp((local - 1.8) / 0.6, 0, 1);
  if (aa > 0) {
    label(ctx, 'EVERY ERA', ax + aw / 2, top + 0.25, 34, { font: 'Cormorant Garamond, serif', weight: 300, color: BONE, align: 'center', alpha: aa, spacing: 2 });
    label(ctx, 'begins in the dark', ax + aw / 2, top + 0.31, 34, { font: 'Cormorant Garamond, serif', weight: 300, color: MIST, align: 'center', alpha: aa * 0.8, spacing: 2 });
    for (let i = 0; i < 3; i += 1) {
      const cw = (aw - 0.05) / 3;
      box(ctx, ax + 0.014 + i * cw, top + 0.36, cw - 0.014, 0.16, { alpha: aa * 0.9, fill: PANEL_2, stroke: 'rgba(141,152,178,0.18)', radius: 7 });
      rect(ctx, ax + 0.024 + i * cw, top + 0.385, cw - 0.04, 0.008, SIGNAL, aa * 0.6);
      rect(ctx, ax + 0.024 + i * cw, top + 0.405, cw - 0.06, 0.008, MIST, aa * 0.4);
    }
    label(ctx, 'preview  ·  hero.tsx', ax + 0.016, top + 0.575, 15, { font: MONO, color: DIM, alpha: aa });
  }

  // Composer: the next prompt typing itself.
  const cy = bot - 0.055;
  box(ctx, mx, cy - 0.032, mw, 0.064, { alpha, fill: 'rgba(12,16,26,0.9)', stroke: 'rgba(141,152,178,0.3)', radius: 999 });
  const prompt = 'now make it faster';
  label(ctx, typed(prompt, (local - 5.4) * 22), mx + 0.026, cy, 20, { font: SANS, color: BONE, alpha: alpha * clamp((local - 5.2) / 0.4, 0, 1) });
  const ready = local > 5.9;
  box(ctx, mx + mw - 0.075, cy - 0.026, 0.062, 0.052, { alpha: alpha * (ready ? 1 : 0.4), fill: ready ? SIGNAL : 'rgba(79,140,255,0.35)', stroke: null, radius: 999 });
  label(ctx, '↑', mx + mw - 0.044, cy, 22, { font: SANS, color: BONE, align: 'center', alpha });
}

/* ------------------------------------------------------------------ *
 * Layered interface planes — used by the ascent act
 * ------------------------------------------------------------------ */

/**
 * A small interface plane that can be scaled and pushed past the camera.
 * `kind` picks the content: 'code' | 'chart' | 'graph' | 'term' | 'grid'.
 * These replace the repeated starfield warp with something that reads as
 * software travelling past the viewer at speed.
 */
export function uiPlane(ctx, x, y, w, h, alpha, kind, seed, t) {
  if (alpha <= 0.004) return;
  const r = rng(seed);
  box(ctx, x, y, w, h, { alpha, fill: 'rgba(9,13,21,0.82)', stroke: 'rgba(141,152,178,0.3)', radius: 10, lw: 1.2 });
  // Title strip
  rect(ctx, x, y, w, 0.012, SIGNAL, alpha * 0.6);
  const lh = h / 12;
  if (kind === 'code') {
    for (let i = 0; i < 9; i += 1) {
      const indent = (i % 3) * 0.012;
      const len = 0.25 + r() * 0.6;
      rect(ctx, x + 0.012 + indent, y + 0.02 + i * lh * 1.15, (w - 0.024) * len, lh * 0.3, i % 4 === 0 ? AURORA : i % 3 === 0 ? SIGNAL : MIST, alpha * 0.75);
    }
  } else if (kind === 'chart') {
    const base = y + h - 0.014;
    for (let i = 0; i < 12; i += 1) {
      const bh = (0.12 + r() * 0.72) * h * 0.7;
      rect(ctx, x + 0.012 + i * ((w - 0.024) / 12), base - bh, (w - 0.03) / 15, bh, i > 8 ? AURORA : SIGNAL, alpha * 0.7);
    }
    hair(ctx, x + 0.01, base, x + w - 0.01, base, MIST, alpha * 0.5);
  } else if (kind === 'graph') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + t * 0.4;
      const nx = cx + Math.cos(a) * w * 0.3;
      const ny = cy + Math.sin(a) * h * 0.3;
      hair(ctx, cx, cy, nx, ny, SIGNAL, alpha * 0.5);
      ctx.save();
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = i % 2 ? AURORA : BONE;
      ctx.beginPath();
      ctx.arc(nx * W, ny * H, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = BONE;
    ctx.beginPath();
    ctx.arc(cx * W, cy * H, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (kind === 'term') {
    for (let i = 0; i < 8; i += 1) {
      rect(ctx, x + 0.014, y + 0.024 + i * lh * 1.2, (w - 0.03) * (0.3 + r() * 0.6), lh * 0.28, i === 0 ? AURORA : MIST, alpha * 0.7);
    }
  } else {
    for (let i = 0; i < 4; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        rect(ctx, x + 0.012 + j * ((w - 0.024) / 3), y + 0.02 + i * ((h - 0.03) / 4), (w - 0.036) / 3, (h - 0.05) / 4, (i + j) % 3 === 0 ? SIGNAL : MIST, alpha * 0.5);
      }
    }
  }
}

/**
 * A plane field: N planes flying toward the camera with depth parallax.
 * `speed` is the ramp (1 = cruising, 4 = hyperspeed) and `spread` widens the
 * field so the frame never repeats the same composition twice.
 */
export function planeField(ctx, t, { count = 22, speed = 1, alpha = 0.5, spread = 1.1, seed = 991 }) {
  const r = rng(seed);
  const kinds = ['code', 'chart', 'graph', 'term', 'grid'];
  const planes = [];
  for (let i = 0; i < count; i += 1) {
    planes.push({
      ox: (r() - 0.5) * 1.9 * spread,
      oy: (r() - 0.5) * 1.3 * spread,
      phase: r(),
      w: 0.14 + r() * 0.16,
      kind: kinds[Math.floor(r() * kinds.length)],
      seed: Math.floor(r() * 9999)
    });
  }
  // Sort far-to-near so nearer planes overdraw.
  const live = planes.map((p) => {
    const z = (p.phase + t * 0.055 * speed) % 1;
    return { ...p, z };
  }).sort((a, b) => a.z - b.z);

  live.forEach((p) => {
    const z = p.z;
    const scale = 0.06 + Math.pow(z, 2.4) * 3.4;
    const w = p.w * scale;
    const h = w * 0.66;
    const x = 0.5 + p.ox * Math.pow(z, 1.7) - w / 2;
    const y = 0.5 + p.oy * Math.pow(z, 1.7) - h / 2;
    if (x + w < -0.1 || x > 1.1 || y + h < -0.1 || y > 1.1) return;
    const a = alpha * Math.min(1, z * 2.6) * (1 - Math.max(0, z - 0.88) / 0.12) * 0.85;
    if (a <= 0.006) return;
    uiPlane(ctx, x, y, w, h, a, p.kind, p.seed, t + p.seed);
  });
}
