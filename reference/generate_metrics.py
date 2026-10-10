#!/usr/bin/env python3
import json
import subprocess
import numpy as np
import os
import sys
from pathlib import Path

def run_cmd(cmd):
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Command failed: {cmd}", file=sys.stderr)
        print(result.stderr, file=sys.stderr)
        raise RuntimeError(f"Command failed with code {result.returncode}")
    return result.stdout

# 1. Extract audio to 16kHz mono WAV
print("Extracting audio...")
run_cmd("ffmpeg -y -i /tmp/reference.mp4 -ar 16000 -ac 1 -c:a pcm_s16le /tmp/reference_audio.wav")

# Load audio data
import wave
with wave.open('/tmp/reference_audio.wav', 'rb') as wf:
    n_channels = wf.getnchannels()
    sample_width = wf.getsampwidth()
    frame_rate = wf.getframerate()
    n_frames = wf.getnframes()
    audio_data = wf.readframes(n_frames)

audio = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
print(f"Audio loaded: {len(audio)} samples at {frame_rate} Hz, duration {len(audio)/frame_rate:.2f}s")

# 2. Compute RMS dB per 0.25s
hop_size_025 = int(0.25 * frame_rate)
rms_db = []
for i in range(0, len(audio), hop_size_025):
    chunk = audio[i:i+hop_size_025]
    if len(chunk) == 0:
        break
    rms = np.sqrt(np.mean(chunk**2))
    db = 20 * np.log10(rms + 1e-10)
    rms_db.append(round(db, 3))
print(f"RMS dB per 0.25s: {len(rms_db)} values")

# 3. Compute spectral centroid per 0.5s
hop_size_05 = int(0.5 * frame_rate)
centroids = []
for i in range(0, len(audio), hop_size_05):
    chunk = audio[i:i+hop_size_05]
    if len(chunk) < 1024:
        break
    # Apply window
    windowed = chunk * np.hanning(len(chunk))
    # FFT
    fft = np.fft.rfft(windowed)
    magnitude = np.abs(fft)
    freqs = np.fft.rfftfreq(len(chunk), 1/frame_rate)
    # Spectral centroid
    if np.sum(magnitude) > 0:
        centroid = np.sum(freqs * magnitude) / np.sum(magnitude)
    else:
        centroid = 0.0
    centroids.append(round(centroid, 3))
print(f"Spectral centroid per 0.5s: {len(centroids)} values")

# 4. Onset detection via spectral flux
# Compute STFT
n_fft = 1024
hop = 256
n_frames = 1 + (len(audio) - n_fft) // hop
stft = np.zeros((n_fft // 2 + 1, n_frames), dtype=np.complex64)
for i in range(n_frames):
    start = i * hop
    frame = audio[start:start+n_fft]
    if len(frame) < n_fft:
        frame = np.pad(frame, (0, n_fft - len(frame)))
    windowed = frame * np.hanning(n_fft)
    stft[:, i] = np.fft.rfft(windowed)

magnitude = np.abs(stft)
# Spectral flux: difference between consecutive frames
flux = np.sum(np.maximum(0, magnitude[:, 1:] - magnitude[:, :-1]), axis=0)
# Adaptive threshold: mean + 2*std
threshold = np.mean(flux) + 2 * np.std(flux)
onset_indices = np.where(flux > threshold)[0]
onset_times = [(idx * hop / frame_rate) for idx in onset_indices]
# Keep only onsets separated by at least 50ms
filtered_onsets = []
for t in onset_times:
    if not filtered_onsets or t - filtered_onsets[-1] > 0.05:
        filtered_onsets.append(round(t, 3))
print(f"Onset times: {len(filtered_onsets)} onsets")

# 5. Estimated BPM from onset intervals
if len(filtered_onsets) > 1:
    intervals = np.diff(filtered_onsets)
    # Filter reasonable intervals (30-240 BPM = 0.25-2.0s)
    reasonable = intervals[(intervals > 0.25) & (intervals < 2.0)]
    if len(reasonable) > 0:
        median_interval = np.median(reasonable)
        estimated_bpm = round(60.0 / median_interval, 1)
    else:
        estimated_bpm = 0.0
else:
    estimated_bpm = 0.0
print(f"Estimated BPM: {estimated_bpm}")

# 6. Peak times - 12 loudest transients (RMS peaks)
# Use RMS over 100ms windows
peak_hop = int(0.1 * frame_rate)
peak_window = int(0.1 * frame_rate)
rms_peaks = []
for i in range(0, len(audio) - peak_window, peak_hop):
    chunk = audio[i:i+peak_window]
    rms = np.sqrt(np.mean(chunk**2))
    rms_peaks.append((i / frame_rate, rms))
# Sort by RMS descending, take top 12
rms_peaks.sort(key=lambda x: x[1], reverse=True)
peak_times = [round(t, 3) for t, _ in rms_peaks[:12]]
peak_times.sort()
print(f"Peak times: {peak_times}")

# Write audio-metrics.json
audio_metrics = {
    "rms_db_per_0.25s": rms_db,
    "centroid_hz_per_0.5s": centroids,
    "onset_times": filtered_onsets,
    "estimated_bpm": estimated_bpm,
    "peak_times": peak_times
}
def convert(obj):
    if isinstance(obj, (np.floating, np.float32, np.float64)):
        return float(obj)
    if isinstance(obj, (np.integer, np.int32, np.int64)):
        return int(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, list):
        return [convert(x) for x in obj]
    if isinstance(obj, dict):
        return {k: convert(v) for k, v in obj.items()}
    return obj

with open('reference/audio-metrics.json', 'w') as f:
    json.dump(convert(audio_metrics), f, separators=(',', ':'))
print("audio-metrics.json written")
