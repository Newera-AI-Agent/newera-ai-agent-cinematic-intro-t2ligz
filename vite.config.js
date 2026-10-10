import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built assets resolve from any host path
  // (Cloudflare Pages / EdgeOne / file:// for the headless render pass).
  base: './',
  server: { port: 3000, host: true },
  preview: { port: 3000, host: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
  },
});
