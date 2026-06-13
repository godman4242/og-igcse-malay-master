import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
  ],
  // Two servers: the dev server (:5173) for most specs (some rely on dev-only /src/
  // module URLs — see the ?t= trap in mistake-promotion.spec.js), AND a production
  // PREVIEW server (:4173) for audio-transcribe.spec.js. ASR needs preview because
  // (a) ONNX Runtime's wasm glue .mjs is served from /public and Vite DEV refuses to
  // import /public as a module (works only as a built static asset), and (b) the PWA
  // service worker — needed for the offline-transcription test — only ships in a build.
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 300_000, // build copies the ~322 MB ASR model into dist
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
