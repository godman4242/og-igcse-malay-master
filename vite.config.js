/// <reference types="vitest" />
/* global process */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

// Opt-in bundle analyzer. Set ANALYZE=true to emit dist/stats.html with a
// treemap of every chunk's contents. Off by default so production builds
// stay clean and Vercel doesn't ship the report.
const analyze = process.env.ANALYZE === 'true'

// Preview-only: serve /asr/ with Cache-Control: no-store. The ASR e2e runs against
// `vite preview`, and headless Chromium can't write the ~76 MB model to its HTTP disk
// cache (ERR_CACHE_WRITE_FAILURE) — no-store skips the write so the fetch succeeds. The
// service worker still caches /asr in Cache Storage (cache.put ignores Cache-Control),
// so offline transcription keeps working. Prod doesn't need this (real cache is GBs).
const asrPreviewNoStore = {
  name: 'asr-preview-no-store',
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.startsWith('/asr/')) res.setHeader('Cache-Control', 'no-store')
      next()
    })
  },
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    asrPreviewNoStore,
    analyze && visualizer({
      filename: 'dist/stats.json',
      template: 'raw-data',
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
    // PWA — generateSW strategy. Workbox compiles a service worker from
    // the manifest of bundled assets so every JS chunk (including the
    // dictionary, connectors, scenarios, comprehension passages, word
    // families, and grammar drills) is precached on install. That makes
    // the core study experience — flashcards, grammar, writing
    // connectors, word-family tree — work fully offline once the app
    // has loaded once.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // we register via virtual:pwa-register/react in App.jsx
      includeAssets: ['favicon.svg', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png'],
      manifest: {
        name: 'IGCSE Malay Master',
        short_name: 'Malay Master',
        description: 'IGCSE Malay revision platform — flashcards, roleplay, writing tutor, and Cikgu Maya, fully offline-capable.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['education'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // Precache everything Vite emits — JS chunks, CSS, HTML, icons.
        // The dictionary / connectors / scenarios bundles fall into this
        // sweep automatically, so the core study experience is fully
        // offline after one warm load. Bump the per-file ceiling so the
        // PDF.js chunk (≈330 kB) clears the default 2 MiB cap with room
        // to spare for future growth.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // The OCR engine (≈20 MB of WASM cores + worker under /ocr) must NOT be
        // precached — that would bloat the install for every user, including the
        // majority who never OCR a page. It's cached on first use via the
        // runtimeCaching rule below (CacheFirst → offline after one OCR run).
        // og-image.png (≈750 KB) is for social-link crawlers only — no app
        // surface ever fetches it, so precaching it wastes 750 KB per install.
        globIgnores: ['**/ocr/**', '**/asr/**', '**/og-image.png'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // autoUpdate mode forces clientsClaim + skipWaiting true: a new deploy
        // activates and reloads automatically, so PWA users no longer need to
        // swipe-kill + reopen to get the latest build. Set explicitly for clarity.
        skipWaiting: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Self-hosted ASR engine (ONNX Runtime Web WASM + the converted Whisper
            // ONNX model). Immutable + large → CacheFirst so a second transcription
            // works fully offline (spec N5). transformers.js useBrowserCache is off, so
            // the SW is the sole /asr cache (no double-caching). Excluded from precache.
            urlPattern: ({ url }) => url.pathname.startsWith('/asr/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'asr-assets',
              expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
          {
            // Self-hosted OCR engine (Tesseract.js WASM cores, worker, language
            // models). Immutable + large → CacheFirst so a second OCR run works
            // fully offline (spec N5). Excluded from precache via globIgnores.
            urlPattern: ({ url }) => url.pathname.startsWith('/ocr/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-assets',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts stylesheet — fresh-but-fast.
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Google Fonts files themselves — long-lived, immutable.
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Same-origin assets that Vite didn't precache — images,
            // any future static drops. Stale-while-revalidate keeps the
            // UI responsive even on patchy school Wi-Fi.
            urlPattern: ({ request, url }) =>
              url.origin === self.location.origin &&
              ['image', 'font', 'style'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // dev-mode SW would clash with Vite HMR; we register in prod only
      },
    }),
  ],
  server: { port: 5173 },
  // transformers.js / onnxruntime-web ship their own ESM + wasm loader. Pre-bundling
  // them with esbuild mangles ORT's runtime wasm resolution (the session hangs before
  // it ever fetches the wasm). Excluding them keeps ORT's loader intact.
  optimizeDeps: { exclude: ['@huggingface/transformers'] },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.{test,spec}.js', 'api/**/__tests__/**/*.{test,spec}.js'],
    exclude: ['node_modules', 'dist'],
  },
})
