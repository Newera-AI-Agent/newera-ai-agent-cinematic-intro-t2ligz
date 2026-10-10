# TASK CONTRACT (immutable product obligation)

**Original request:** CONTEXT
Repo: Newera-AI-Agent/newera-ai-agent-cinematic-intro-t2ligz (public, branch main). It holds a static Vite project that will become an original 2-minute cinematic intro film for 'NewEra AI Agent'.
Your job is REFERENCE ANALYSIS ONLY.

HARD BOUNDARIES
- Do NOT create, edit or delete anything outside the reference/ directory.
- Specifically do NOT touch: src/, index.html, package.json, vite.config.js, TODO.md, CONTRACTS.md, .github/workflows/*.
- Do NOT run npm install or npm run build. The app source is mid-rewrite and the build is expected to be red. That is not your concern.
- Do NOT deploy anything.

REFERENCE VIDEO
https://d1oupeiobkpcny.cloudfront.net/assets/dashboard/materials/2026/09/28/9e16cfc6dbd4e33982113ccbb237cbdc67e723f6df1378a05701a95cf65ec5dc.mp4
Download to /tmp/reference.mp4 with curl -L, retry up to 3 times, verify size > 1 MB.

ENVIRONMENT
- apt-get update && apt-get install -y ffmpeg (ffprobe included). python3 with pip install numpy.

DELIVERABLES — commit ALL of these to branch main under reference/

1. reference/metadata.json — full ffprobe JSON: duration, fps, resolution, video codec, bitrate, pixel format, audio codec, sample rate, channels.

2. reference/frames/ — one JPEG per 1.0 second of runtime, width 960, quality q:v 3. Command shape: ffmpeg -i /tmp/reference.mp4 -vf "fps=1,scale=960:-2" -q:v 3 reference/frames/f-%03d.jpg

3. reference/sheets/sheet-01.jpg, sheet-02.jpg, ... — contact sheets. 5 columns x 4 rows = 20 cells per sheet, each cell 384x216, with the timestamp burned into the top-left of each cell. Use ffmpeg tile filter (e.g. -vf "fps=1,scale=384:216,drawtext=...,tile=5x4") or generate them with Python/Pillow. Every frame must appear on exactly one sheet.

4. reference/cuts.json — hard-cut detection. Run ffmpeg with -vf "select='gt(scene,0.30)',showinfo" -f null - and parse showinfo lines into an array of {time_seconds, frame_number, scene_score}.

5. reference/audio-metrics.json — decode the audio to 16 kHz mono WAV, then with numpy compute:
   - rms_db_per_0.25s: loudness in dBFS sampled every 250 ms for the whole runtime
   - centroid_hz_per_0.5s: spectral centroid in Hz every 500 ms
   - onset_times: onset timestamps in seconds (spectral-flux peaks above an adaptive threshold)
   - estimated_bpm: tempo estimate from onset intervals
   - peak_times: timestamps of the 12 loudest transients
   Round floats to 3 decimals. Keep arrays compact.

6. reference/visual-metrics.json — decode the video to 64x36 rgb24 at 2 fps, then with numpy compute for every sample: {t, mean_rgb_hex, brightness (0-1), saturation (0-1), motion (mean absolute difference vs previous frame, 0-1)}.

7. reference/analysis.md — a precise, structured, human-readable breakdown of the WHOLE 2 minutes. Must contain:
   - exact duration, fps, resolution, aspect ratio, audio spec
   - a chronological narrative in 2-second bands describing what is actually on screen: composition, layout, motion, typography, colour, camera behaviour, transitions
   - a cut table: every cut timestamp + the transition type you infer (hard cut / dissolve / whip pan / match cut / speed ramp)
   - the audio architecture with timestamps: silence, sub drone, riser, impact, drop, music bed, foley, whooshes
   - the emotional arc and pacing, including visual-change rate (changes per minute) per act
   - a palette table of dominant hex colours per act
   - a final section titled exactly 'HOW TO REPRODUCE THIS FEELING' with 12-20 concrete, actionable filmmaking instructions an engineer could implement on an HTML canvas.
   Keep analysis.md under 8000 characters.

FINISH
- Commit everything with the message 'Add Manus 2.0 reference analysis'.
- As the very LAST thing in your final message, print the complete contents of reference/analysis.md verbatim.
- Report the exact file list you committed.
**Normalized interpretation:** CONTEXT; Repo: Newera-AI-Agent/newera-ai-agent-cinematic-intro-t2ligz (public, branch main).; It holds a static Vite project that will become an original 2-minute cinematic intro film for 'NewEra AI Agent'.; Your job is REFERENCE ANALYSIS ONLY.; HARD BOUNDARIES; Do NOT create, edit or delete anything outside the reference/ directory.; Specifically do NOT touch: src/, index.html, package.json, vite.config.js, TODO.md, CONTRACTS.md, .github/workflows/*.; Do NOT run npm install or npm run build.; The app source is mid-rewrite and the build is expected to be red.; That is not your concern.; Do NOT deploy anything.; REFERENCE VIDEO; https://d1oupeiobkpcny.cloudfront.net/assets/dashboard/materials/2026/09/28/9e16cfc6dbd4e33982113ccbb237cbdc67e723f6df1378a05701a95cf65ec5dc.mp4; Download to /tmp/reference.mp4 with curl -L, retry up to 3 times, verify size > 1 MB.; ENVIRONMENT; apt-get update && apt-get install -y ffmpeg (ffprobe included).; python3 with pip install numpy.; DELIVERABLES — commit ALL of these to branch main under reference/; reference/metadata.json — full ffprobe JSON: duration, fps, resolution, video codec, bitrate, pixel format, audio codec, sample rate, channels.; reference/frames/ — one JPEG per 1.0 second of runtime, width 960, quality q:v 3.
**Execution profile:** marathon
**Created:** 2026-10-10T09:04:52.350Z

## Requirements

| ID | Description | Mandatory | Status | Evidence | Acceptance Criteria |
|----|-------------|-----------|--------|----------|---------------------|
| REQ-001 | CONTEXT | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-002 | Repo: Newera-AI-Agent/newera-ai-agent-cinematic-intro-t2ligz (public, branch main). | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-003 | It holds a static Vite project that will become an original 2-minute cinematic intro film for 'NewEra AI Agent'. | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-004 | Your job is REFERENCE ANALYSIS ONLY. | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-005 | HARD BOUNDARIES | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-006 | Do NOT create, edit or delete anything outside the reference/ directory. | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-007 | Specifically do NOT touch: src/, index.html, package.json, vite.config.js, TODO.md, CONTRACTS.md, .github/workflows/*. | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-008 | Do NOT run npm install or npm run build. | YES | pending | — | A relevant build or static verification passed after the latest relevant edit. |
| REQ-009 | The app source is mid-rewrite and the build is expected to be red. | YES | pending | — | A relevant build or static verification passed after the latest relevant edit. |
| REQ-010 | That is not your concern. | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-011 | Do NOT deploy anything. | YES | pending | — | The deployment URL was probed successfully and matches the verified revision. |
| REQ-012 | REFERENCE VIDEO | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-013 | https://d1oupeiobkpcny.cloudfront.net/assets/dashboard/materials/2026/09/28/9e16cfc6dbd4e33982113ccbb237cbdc67e723f6df1378a05701a95cf65ec5dc.mp4 | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-014 | Download to /tmp/reference.mp4 with curl -L, retry up to 3 times, verify size > 1 MB. | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-015 | ENVIRONMENT | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-016 | apt-get update && apt-get install -y ffmpeg (ffprobe included). | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-017 | python3 with pip install numpy. | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-018 | DELIVERABLES — commit ALL of these to branch main under reference/ | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-019 | reference/metadata.json — full ffprobe JSON: duration, fps, resolution, video codec, bitrate, pixel format, audio codec, sample rate, channels. | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |
| REQ-020 | reference/frames/ — one JPEG per 1.0 second of runtime, width 960, quality q:v 3. | YES | pending | — | Concrete implementation evidence is recorded and the outcome matches the user request. |

## Feature Matrix
- CONTEXT
- Repo: Newera-AI-Agent/newera-ai-agent-cinematic-intro-t2ligz (public, branch main).
- It holds a static Vite project that will become an original 2-minute cinematic intro film for 'NewEra AI Agent'.
- Your job is REFERENCE ANALYSIS ONLY.
- HARD BOUNDARIES
- Do NOT create, edit or delete anything outside the reference/ directory.
- Specifically do NOT touch: src/, index.html, package.json, vite.config.js, TODO.md, CONTRACTS.md, .github/workflows/*.
- Do NOT run npm install or npm run build.
- The app source is mid-rewrite and the build is expected to be red.
- That is not your concern.
- Do NOT deploy anything.
- REFERENCE VIDEO
- https://d1oupeiobkpcny.cloudfront.net/assets/dashboard/materials/2026/09/28/9e16cfc6dbd4e33982113ccbb237cbdc67e723f6df1378a05701a95cf65ec5dc.mp4
- Download to /tmp/reference.mp4 with curl -L, retry up to 3 times, verify size > 1 MB.
- ENVIRONMENT
- apt-get update && apt-get install -y ffmpeg (ffprobe included).
- python3 with pip install numpy.
- DELIVERABLES — commit ALL of these to branch main under reference/
- reference/metadata.json — full ffprobe JSON: duration, fps, resolution, video codec, bitrate, pixel format, audio codec, sample rate, channels.
- reference/frames/ — one JPEG per 1.0 second of runtime, width 960, quality q:v 3.

## Test Matrix
- Do NOT run npm install or npm run build.
- The app source is mid-rewrite and the build is expected to be red.
- Download to /tmp/reference.mp4 with curl -L, retry up to 3 times, verify size > 1 MB.

## Platform Requirements
- Verified live URL

## Completion: 0/20 mandatory requirements have evidence
