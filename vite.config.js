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

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
      registerType: 'prompt',
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
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false, // wait for the update toast to confirm before activating
        navigateFallback: '/index.html',
        runtimeCaching: [
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
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.{test,spec}.js'],
    exclude: ['node_modules', 'dist', 'igcse-malay-master/**'],
  },
})
