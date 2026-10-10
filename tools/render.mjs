#!/usr/bin/env node
import { spawn } from 'child_process';
import puppeteer from 'puppeteer';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const FRAME_DIR = '/tmp/frames';
const SCORE_PATH = '/tmp/score.wav';
const OUTPUT_MP4 = 'public/newera-intro-1080p.mp4';

async function waitForUrl(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  if (existsSync(FRAME_DIR)) rmSync(FRAME_DIR, { recursive: true });
  mkdirSync(FRAME_DIR, { recursive: true });

  console.log('Starting preview server...');
  const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true
  });

  preview.stdout?.on('data', d => console.log('[preview]', d.toString().trim()));
  preview.stderr?.on('data', d => console.error('[preview]', d.toString().trim()));

  try {
    await waitForUrl(BASE_URL);
    console.log('Preview server ready');

    console.log('Launching Puppeteer...');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--font-render-hinting=none'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    console.log('Navigating to capture page...');
    await page.goto(`${BASE_URL}/?capture=1`, { waitUntil: 'networkidle0' });

    console.log('Waiting for NEWERA engine...');
    await page.waitForFunction(() => window.__NEWERA__ && window.__NEWERA__.ready, { timeout: 30000 });

    const { duration, width, height } = await page.evaluate(() => window.__NEWERA__);
    console.log(`Engine ready: duration=${duration}s, ${width}x${height}`);

    const totalFrames = Math.ceil(duration * 30);
    console.log(`Rendering ${totalFrames} frames at 30 fps...`);

    for (let i = 0; i < totalFrames; i++) {
      const t = i / 30;
      await page.evaluate(t => window.__NEWERA__.render(t), t);
      await page.screenshot({
        path: join(FRAME_DIR, `f-${String(i).padStart(5, '0')}.jpg`),
        type: 'jpeg',
        quality: 92
      });
      if (i % 300 === 0) console.log(`  ${i}/${totalFrames} frames`);
    }
    console.log('Frame capture complete');

    console.log('Extracting audio...');
    const b64 = await page.evaluate(async () => {
      const buf = await window.__NEWERA__.wav();
      const bytes = new Uint8Array(buf);
      let s = '';
      const CH = 0x8000;
      for (let i = 0; i < bytes.length; i += CH) {
        s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
      }
      return btoa(s);
    });
    writeFileSync(SCORE_PATH, Buffer.from(b64, 'base64'));
    console.log('Audio saved to', SCORE_PATH);

    await browser.close();

    console.log('Encoding MP4...');
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-framerate', '30',
        '-i', join(FRAME_DIR, 'f-%05d.jpg'),
        '-i', SCORE_PATH,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-crf', '18',
        '-preset', 'medium',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-shortest',
        '-movflags', '+faststart',
        OUTPUT_MP4
      ], { stdio: 'inherit' });
      ffmpeg.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)));
    });
    console.log('MP4 written to', OUTPUT_MP4);

    console.log('Verifying output...');
    await new Promise((resolve, reject) => {
      const probe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate',
        '-of', 'json',
        OUTPUT_MP4
      ], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      probe.stdout.on('data', d => out += d);
      probe.on('close', code => {
        if (code !== 0) return reject(new Error('ffprobe failed'));
        const info = JSON.parse(out);
        const v = info.streams.find(s => s.codec_type === 'video');
        const a = info.streams.find(s => s.codec_type === 'audio');
        console.log('Video:', v?.width, 'x', v?.height, '@', v?.r_frame_rate, v?.codec_name);
        console.log('Audio:', a?.codec_name);
        console.log('Duration:', info.format.duration, 'Size:', info.format.size);
        if (!v || v.width !== 1920 || v.height !== 1080) reject(new Error('Invalid video resolution'));
        if (!a || a.codec_name !== 'aac') reject(new Error('Missing/invalid audio stream'));
        if (Math.abs(Number(info.format.duration) - duration) > 1) reject(new Error('Duration mismatch'));
        if (Number(info.format.size) < 5 * 1024 * 1024) reject(new Error('File too small'));
        resolve();
      });
    });
    console.log('✅ All verification checks passed');

  } catch (err) {
    console.error('❌ Render failed:', err.message);
    process.exitCode = 1;
    throw err;
  } finally {
    preview.kill();
  }
}

main().catch(() => process.exit(1));
