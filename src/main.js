/**
 * NewEra AI Agent — intro film player.
 *
 * Owns the runtime experience: it creates the film, renders the score once into
 * an AudioBuffer, and keeps picture and sound locked to a single clock. It also
 * exposes a deterministic capture API so a headless browser can step the film
 * frame-by-frame and mux the result into an MP4.
 */

import './style.css';
import { createFilm, CHAPTERS, WIDTH, HEIGHT } from './engine/film.js';
import { renderScore, encodeWav } from './engine/score.js';
import { DURATION } from './engine/audio.js';

const canvas = document.getElementById('film');
const film = createFilm(canvas);

const el = {
  play: document.getElementById('playBtn'),
  playIcon: document.getElementById('playIcon'),
  mute: document.getElementById('muteBtn'),
  restart: document.getElementById('restartBtn'),
  tc: document.getElementById('tc'),
  tcd: document.getElementById('tcd'),
  scrub: document.getElementById('scrub'),
  scrubFill: document.getElementById('scrubFill'),
  scrubMarks: document.getElementById('scrubMarks'),
  chapters: document.getElementById('chapters'),
  startcard: document.getElementById('startcard'),
  start: document.getElementById('startBtn')
};

/* ------------------------------------------------------------------ *
 * Player state
 * ------------------------------------------------------------------ */

const state = {
  playing: false,
  muted: false,
  time: 0,
  audio: null,
  source: null,
  ctx: null,
  gain: null,
  startedAt: 0,
  raf: 0,
  ready: false
};

/** Capture mode: ?capture=1 renders frames on demand instead of playing. */
const params = new URLSearchParams(window.location.search);
const captureMode = params.get('capture') === '1';

function formatTime(seconds) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${String(m).padStart(2, '0')}:${rest.toFixed(1).padStart(4, '0')}`;
}

/* ------------------------------------------------------------------ *
 * HUD
 * ------------------------------------------------------------------ */

function buildChapters() {
  el.chapters.innerHTML = '';
  CHAPTERS.forEach((chapter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chapter';
    button.textContent = chapter.label;
    button.dataset.start = String(chapter.start);
    button.addEventListener('click', () => seek(chapter.start));
    el.chapters.appendChild(button);
  });
  el.scrubMarks.innerHTML = '';
  CHAPTERS.forEach((chapter) => {
    const mark = document.createElement('span');
    mark.className = 'scrub-mark';
    mark.style.left = `${(chapter.start / DURATION) * 100}%`;
    el.scrubMarks.appendChild(mark);
  });
}

function updateHud() {
  el.tc.textContent = formatTime(state.time);
  el.tcd.textContent = formatTime(DURATION);
  el.scrubFill.style.width = `${(state.time / DURATION) * 100}%`;
  el.scrub.setAttribute('aria-valuenow', String(Math.round((state.time / DURATION) * 100)));
  const active = CHAPTERS.reduce((acc, c) => (state.time >= c.start ? c : acc), CHAPTERS[0]);
  [...el.chapters.children].forEach((node) => {
    node.classList.toggle('is-active', node.dataset.start === String(active.start));
  });
}

/* ------------------------------------------------------------------ *
 * Audio
 * ------------------------------------------------------------------ */

async function prepareAudio() {
  if (state.audio) return state.audio;
  state.audio = await renderScore();
  state.ready = true;
  return state.audio;
}

function stopSource() {
  if (state.source) {
    try { state.source.stop(); } catch { /* already stopped */ }
    state.source.disconnect();
    state.source = null;
  }
}

function startAudio(offset) {
  if (!state.ctx || !state.audio || state.muted) return;
  stopSource();
  const source = state.ctx.createBufferSource();
  source.buffer = state.audio;
  source.connect(state.gain);
  source.start(0, Math.max(0, Math.min(offset, DURATION - 0.01)));
  state.source = source;
}

/* ------------------------------------------------------------------ *
 * Transport
 * ------------------------------------------------------------------ */

function tick() {
  if (!state.playing) return;
  state.time = Math.min(DURATION, (state.ctx.currentTime - state.startedAt));
  if (state.time >= DURATION) {
    state.time = DURATION;
    film.render(state.time);
    updateHud();
    pause();
    return;
  }
  film.render(state.time);
  updateHud();
  state.raf = requestAnimationFrame(tick);
}

async function play() {
  if (state.playing) return;
  await prepareAudio();
  if (!state.ctx) {
    state.ctx = new (window.AudioContext || window.webkitAudioContext)();
    state.gain = state.ctx.createGain();
    state.gain.gain.value = state.muted ? 0 : 1;
    state.gain.connect(state.ctx.destination);
  }
  if (state.ctx.state === 'suspended') await state.ctx.resume();
  state.playing = true;
  state.startedAt = state.ctx.currentTime - state.time;
  startAudio(state.time);
  el.playIcon.textContent = 'Pause';
  el.startcard.classList.add('is-gone');
  cancelAnimationFrame(state.raf);
  state.raf = requestAnimationFrame(tick);
}

function pause() {
  if (!state.playing) return;
  state.playing = false;
  cancelAnimationFrame(state.raf);
  stopSource();
  el.playIcon.textContent = 'Play intro';
}

function seek(time) {
  state.time = Math.max(0, Math.min(DURATION, time));
  film.render(state.time);
  updateHud();
  if (state.playing) {
    state.startedAt = state.ctx.currentTime - state.time;
    startAudio(state.time);
  }
}

function restart() {
  pause();
  seek(0);
  play();
}

function toggleMute() {
  state.muted = !state.muted;
  if (state.gain) state.gain.gain.value = state.muted ? 0 : 1;
  el.mute.textContent = state.muted ? 'Sound off' : 'Sound on';
  if (!state.muted && state.playing) startAudio(state.time);
}

/* ------------------------------------------------------------------ *
 * Scrubber
 * ------------------------------------------------------------------ */

function scrubFromEvent(event) {
  const rectBox = el.scrub.getBoundingClientRect();
  const x = (event.clientX ?? event.touches?.[0]?.clientX ?? rectBox.left) - rectBox.left;
  seek((x / rectBox.width) * DURATION);
}

el.scrub.addEventListener('pointerdown', (event) => {
  el.scrub.setPointerCapture(event.pointerId);
  scrubFromEvent(event);
  const move = (e) => scrubFromEvent(e);
  const up = () => {
    el.scrub.removeEventListener('pointermove', move);
    el.scrub.removeEventListener('pointerup', up);
  };
  el.scrub.addEventListener('pointermove', move);
  el.scrub.addEventListener('pointerup', up);
});

el.scrub.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') seek(state.time + 5);
  if (event.key === 'ArrowLeft') seek(state.time - 5);
  if (event.key === 'Home') seek(0);
  if (event.key === 'End') seek(DURATION);
});

el.play.addEventListener('click', () => (state.playing ? pause() : play()));
el.restart.addEventListener('click', restart);
el.mute.addEventListener('click', toggleMute);
el.start.addEventListener('click', play);

window.addEventListener('keydown', (event) => {
  if (event.target !== document.body) return;
  if (event.code === 'Space') { event.preventDefault(); state.playing ? pause() : play(); }
  if (event.key === 'm') toggleMute();
  if (event.key === 'r') restart();
});

/* ------------------------------------------------------------------ *
 * Headless capture API
 * ------------------------------------------------------------------ */

/**
 * The render harness drives the film through this object:
 *   window.__NEWERA__.render(t)  -> paints exactly the frame at second t
 *   window.__NEWERA__.duration  -> total runtime in seconds
 *   window.__NEWERA__.wav()     -> the fully mixed score as a WAV ArrayBuffer
 */
window.__NEWERA__ = {
  duration: DURATION,
  width: WIDTH,
  height: HEIGHT,
  chapters: CHAPTERS,
  render: (t) => film.render(t),
  wav: async () => encodeWav(await renderScore()),
  ready: true
};

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

buildChapters();
film.render(0);
updateHud();

if (captureMode) {
  // Capture harness controls the frame: exact 1080p canvas, no overlays.
  document.body.classList.add('is-render');
} else {
  prepareAudio().catch(() => {
    // Audio is best-effort at boot; playback retries it on demand.
  });
}
