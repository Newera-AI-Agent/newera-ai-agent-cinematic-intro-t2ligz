# Manus 2.0 Reference Analysis

## Technical Specifications
- **Duration**: 166.46s (2:46)
- **Frame Rate**: 30 fps
- **Resolution**: 1920×1080 (16:9)
- **Video Codec**: H.264 (yuv420p, 9.4 Mbps)
- **Audio**: AAC LC, stereo, 44100 Hz
- **Frames**: 4993 total, 199.1 MB

## Chronological Narrative (2-second bands)
**0–2s**: Flash to white (#f1f1f1), high motion, ambient drone. Cut at 0.1s.
**2–4s**: Bright greyscale, dynamic movement. Cut at 3.5s.
**4–6s**: Dark mid-tones (#0e1011), high motion. Cut at 4.4s.
**6–8s**: Cool blue-grey (#93adc0), static, music swells. Cut at 6.2s.
**8–10s**: Near-black (#0c0e0f), high motion, loud. Cut at 8.4s.
**10–16s**: Sustained white frames, near-static, prominent music.
**16–30s**: Greyscale mid-tones, moderate motion, rhythmic audio. Cuts at 17.5, 26.9s.
**30–46s**: Alternating white/dark bands, rising tension. Cuts at 30.3, 32.3, 35.4, 37.4, 38.7, 43.1, 44.8s.
**46–60s**: Warm brown/orange hues (#6b473b), low-key, loud impacts. Cuts at 46.0, 51.6, 54.9, 57.9, 59.8s.
**60–90s**: Bright white dominance (#f0f0f0), static holds, peak audio energy. Cuts at 60.0, 63.9, 65.8, 67.6, 72.4, 76.9, 84.4s.
**90–120s**: Sustained white, minimal cuts (3), atmospheric breakdown.
**120–166s**: Final climax, white/blue-white, rising to final peaks. Cuts at 123.8, 128.1, 132.3, 137.5, 141.9, 147.0, 151.8, 157.0, 159.6s.

## Cut Table (43 cuts from cuts.json)
| Time | Type | Score |
|------|------|-------|
| 0.100 | hard cut | 1.000 |
| 3.467 | hard cut | 0.758 |
| 4.400 | hard cut | 0.782 |
| 6.200 | hard cut | 0.727 |
| 8.367 | hard cut | 0.707 |
| 17.500 | hard cut | 0.791 |
| 26.900 | hard cut | 0.915 |
| 30.300 | hard cut | 0.870 |
| 32.300 | hard cut | 0.897 |
| 35.367 | hard cut | 0.845 |
| 37.367 | hard cut | 0.882 |
| 38.700 | hard cut | 0.924 |
| 43.100 | hard cut | 0.895 |
| 44.800 | hard cut | 0.900 |
| 46.000 | hard cut | 1.000 |
| 51.600 | hard cut | 0.972 |
| 54.867 | hard cut | 0.955 |
| 57.900 | hard cut | 0.933 |
| 59.767 | hard cut | 0.942 |
| 60.000 | hard cut | 1.000 |
| 63.900 | hard cut | 0.971 |
| 65.800 | hard cut | 0.960 |
| 67.567 | hard cut | 0.952 |
| 72.400 | hard cut | 1.000 |
| 76.900 | hard cut | 0.980 |
| 84.400 | hard cut | 0.973 |
| 123.767 | hard cut | 1.000 |
| 128.100 | hard cut | 0.985 |
| 132.300 | hard cut | 0.991 |
| 137.500 | hard cut | 0.978 |
| 141.900 | hard cut | 0.982 |
| 147.000 | hard cut | 0.321 |
| 151.767 | hard cut | 1.000 |
| 157.000 | hard cut | 0.626 |
| 159.633 | whip pan | 0.575 |

## Audio Architecture
- **BPM**: 129.3 (465ms/beat)
- **Onsets**: 382 spectral-flux peaks
- **RMS Range**: -200 to -7.4 dBFS
- **12 Peak Transients**: 74.3, 75.0, 81.8, 82.5, 86.3, 156.8, 157.9, 158.0, 158.1, 158.5, 159.9, 160.4s
- **Sections**: 0–30s sub-drone; 30–60s rising tension; 60–90s main drop (max RMS); 90–120s breakdown; 120–166s final climax.

## Emotional Arc & Pacing
| Act | Time | Cuts | Cuts/min | Avg Motion | Avg Brightness |
|-----|------|------|----------|------------|----------------|
| I: Intro | 0–30s | 10 | 20.0 | 0.172 | 0.580 |
| II: Rising | 30–60s | 14 | 28.0 | 0.163 | 0.520 |
| III: Climax | 60–90s | 8 | 16.0 | 0.076 | 0.792 |
| IV: Falling | 90–120s | 3 | 6.0 | 0.082 | 0.850 |
| V: Resolution | 120–166s | 9 | 11.7 | 0.079 | 0.782 |

## Palette per Act
| Act | Dominant Hex | Description |
|-----|--------------|-------------|
| I | #f1f1f1, #f3f3f3, #f4f4f4 | Monochrome/greyscale |
| II | #f3f3f3, #f1f1f1, #6b473b | Warm accents on grey |
| III | #f0f0f0, #f2f3f3, #f2f2f2 | High-key B&W |
| IV | #ecedee, #f1f1f1, #edeeef | Cool white |
| V | #f2f2f2, #efeeee, #b2c7d7 | Blue-white highlights |

## HOW TO REPRODUCE THIS FEELING
1. **Sub-bass drone** at 30–40Hz through Act I, felt not heard.
2. **Hard cuts on downbeats** — lock to 129 BPM grid (465ms/beat).
3. **Single-frame white flashes** at transitions to reset retinal adaptation.
4. **3-hue palette per act**: I=cool blues, II=warm ambers, III=B&W, IV=cyans, V=gold-white.
5. **Exponential motion blur** 0→200px over 4s risers, snap to zero on drop.
6. **Foley impacts** (glass, metal, sub kick) exactly on cut frames for super-event fusion.
7. **Spectral centroid rise** 200→4000Hz per 8-bar build; perceived as lift at constant volume.
8. **2-frame glitch cuts** at 1/3 and 2/3 of climax suggesting system overload.
9. **Match cuts on primitives** — circle→sphere→lens flare; shape continuity masks time jumps.
10. **Inverse vignette** — dark scenes 0%, bright scenes 40%, guides eye to center.
11. **Score the silence** — 2.3s gap at 58s, 1.8s at 124s filled with sub-20Hz infrasound.
12. **30fps render, 2s animation** — hold 60 frames, move in 2-frame bursts for cinematic judder.
13. **Chromatic aberration on impacts only** — 4px RGB split for 3 frames post-cut.
14. **Final frame holds 3s past audio end** — logo lingers in silence, exploits recency effect.