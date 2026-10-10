const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function main() {
  // Serve dist folder
  const httpServer = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '0.0.0.0'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });
  
  // Wait for server to start
  await new Promise(r => setTimeout(r, 3000));
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  
  // Create frames directory
  const framesDir = '/tmp/frames';
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }
  
  console.log('Loading page with capture=1...');
  await page.goto('http://localhost:4173/?capture=1', { waitUntil: 'networkidle0' });
  
  // Wait for the app to initialize
  await page.waitForFunction(() => window.__NEWERA__ !== undefined);
  console.log('NEWERA API found');
  
  const duration = 124; // seconds
  const fps = 30;
  const totalFrames = duration * fps; // 3720
  
  console.log(`Capturing ${totalFrames} frames...`);
  
  for (let i = 0; i < totalFrames; i++) {
    const t = i / fps;
    
    // Render frame at time t
    await page.evaluate((time) => {
      return window.__NEWERA__.render(time);
    }, t);
    
    // Screenshot
    const frameNum = String(i + 1).padStart(5, '0');
    await page.screenshot({
      path: path.join(framesDir, `f-${frameNum}.jpg`),
      quality: 92,
      fullPage: false
    });
    
    if (i % 300 === 0) {
      console.log(`  Frame ${i + 1}/${totalFrames} (${t.toFixed(1)}s)`);
    }
  }
  
  console.log('Frames captured. Extracting audio...');
  
  // Extract audio
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
  
  // Decode base64 and write WAV
  const wavBuffer = Buffer.from(b64, 'base64');
  fs.writeFileSync('/tmp/score.wav', wavBuffer);
  console.log(`Audio written: ${wavBuffer.length} bytes`);
  
  await browser.close();
  httpServer.kill();
  
  console.log('Capture complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
