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

# Extract video frames at 2fps, 64x36, rgb24 raw format
print("Extracting video frames...")
run_cmd("ffmpeg -y -i /tmp/reference.mp4 -vf 'fps=2,scale=64:36' -f image2pipe -vcodec rawvideo -pix_fmt rgb24 /tmp/video_frames.raw")

# Read raw video data
frame_size = 64 * 36 * 3  # RGB
with open('/tmp/video_frames.raw', 'rb') as f:
    raw_data = f.read()

n_frames = len(raw_data) // frame_size
print(f"Extracted {n_frames} frames")

frames = np.frombuffer(raw_data, dtype=np.uint8).reshape(n_frames, 36, 64, 3)

# Compute metrics per frame
visual_metrics = []
prev_frame = None

for i, frame in enumerate(frames):
    t = i * 0.5  # 2 fps
    
    # Mean RGB
    mean_r = np.mean(frame[:, :, 0])
    mean_g = np.mean(frame[:, :, 1])
    mean_b = np.mean(frame[:, :, 2])
    mean_rgb_hex = f"#{int(round(mean_r)):02x}{int(round(mean_g)):02x}{int(round(mean_b)):02x}"
    
    # Brightness (0-1) - using luminance formula
    brightness = (0.299 * mean_r + 0.587 * mean_g + 0.114 * mean_b) / 255.0
    
    # Saturation (0-1) - max - min / max for each pixel, then average
    max_c = np.max(frame, axis=2)
    min_c = np.min(frame, axis=2)
    sat = np.where(max_c > 0, (max_c - min_c) / max_c, 0)
    saturation = np.mean(sat)
    
    # Motion (mean absolute difference vs previous frame)
    if prev_frame is not None:
        motion = np.mean(np.abs(frame.astype(np.float32) - prev_frame.astype(np.float32))) / 255.0
    else:
        motion = 0.0
    
    visual_metrics.append({
        "t": round(t, 3),
        "mean_rgb_hex": mean_rgb_hex,
        "brightness": round(float(brightness), 3),
        "saturation": round(float(saturation), 3),
        "motion": round(float(motion), 3)
    })
    
    prev_frame = frame.copy()

# Write visual-metrics.json
with open('reference/visual-metrics.json', 'w') as f:
    json.dump(visual_metrics, f, separators=(',', ':'))

print(f"visual-metrics.json written with {len(visual_metrics)} frames")
