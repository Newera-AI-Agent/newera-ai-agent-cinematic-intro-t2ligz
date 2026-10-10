# CONTRACTS

AUTO-GENERATED after every successful file write. Do not edit by hand - your edits will be overwritten.

This is the authoritative list of what exists in this project. If a symbol is not listed here and not in a file you have read during this run, IT DOES NOT EXIST. Do not reference it. Read the file or write the symbol first.

## Dependencies (package.json)

- `vite` `^5.4.10`

Scripts: `dev`, `build`, `preview`

## Files and public API

### `index.html` - 54 lines
- exports: (nothing public)

### `src/engine/audio.js` - 429 lines
- `mulberry32` (function)
- `noteFreq` (function)
- `SAMPLE_RATE` (const)
- `DURATION` (const)
- `MOTIF` (const)
- `ACTS` (const)
- `VOICES` (const)

### `src/engine/film.js` - 618 lines
- imports: `src/engine/audio.js`, `src/engine/sim.js`
- `createFilm` (function)
- `WIDTH` (const)
- `HEIGHT` (const)
- `CHAPTERS` (const)
- `ACTS` (const)
- `clamp` (const)
- `lerp` (const)
- `easeOut` (const)
- `easeIn` (const)
- `easeInOut` (const)
- `window01` (const)

### `src/engine/score.js` - 308 lines
- imports: `src/engine/audio.js`
- `createMasterBus` (function)
- `scheduleScore` (function)
- `renderScore` (function)
- `encodeWav` (function)
- `BPM` (const)

### `src/engine/sim.js` - 1080 lines
- `shotTerminal` (function)
- `shotEditor` (function)
- `montage` (function)
- `cutFlash` (function)
- `smear` (function)
- `shotDom` (function)
- `shotAgents` (function)
- `shotTests` (function)
- `shotDeploy` (function)
- `shotProduct` (function)
- `uiPlane` (function)
- `planeField` (function)

### `src/main.js` - 271 lines
- imports: `src/engine/film.js`, `src/engine/score.js`, `src/engine/audio.js`, `src/style.css`
- exports: (nothing public)

### `src/style.css` - 238 lines
- exports: (nothing public)

### `vite.config.js` - 17 lines
- exports: (nothing public)

## Unresolved references

- (none) - every internal import resolves.
