import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { compression } from 'vite-plugin-compression2';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// vite-plugin-prerender uses require() which crashes on Node v25+ ESM — only load for production
let prerender: typeof import('vite-plugin-prerender').default | undefined;
if (process.env.NODE_ENV === 'production') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    prerender = require('vite-plugin-prerender');
  } catch {
    // Node v25 ESM fallback — skip prerender
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
    }),
    react(),
    // Sentry plugin uploads source maps on production builds
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      disable: !process.env.SENTRY_AUTH_TOKEN,
    }),
    // Brotli compression — ~70% smaller than uncompressed
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024, // Only compress files > 1KB
    }),
    // Gzip fallback for older clients
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024,
    }),
    // PWA — auto-update, no stale cache
    VitePWA({
      registerType: 'autoUpdate',
      // Inline the registration script (no separate registerSW.js file to cache)
      injectRegister: 'auto',
      workbox: {
        // Clean old caches from previous SW versions on activate
        cleanupOutdatedCaches: true,
        // Force the new SW to take over immediately (no waiting)
        skipWaiting: true,
        clientsClaim: true,
        // Don't precache sourcemaps or compression artifacts
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webp,jpg,jpeg}'],
        // Exclude large/optional chunks from precache to keep install fast
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
        // Navigation fallback for SPA routing
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [
          /^\/api\//,       // Don't cache API calls
          /^\/blog/,        // Server-rendered blog
          /^\/sitemap/,
          /^\/rss/,
        ],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // API calls — network first, fall back to cache (offline support)
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60, // 1 hour
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            // Google Fonts webfonts
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Leaflet CDN tiles & CSS
            urlPattern: /^https:\/\/unpkg\.com\/leaflet/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'leaflet-cdn',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            // Map tiles (OSM, etc.)
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            // Supabase storage (images, documents)
            urlPattern: /\.supabase\.co\/storage/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-storage',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
      },
      manifest: false, // Use the existing site.webmanifest
      devOptions: {
        enabled: false, // Don't run SW in dev — avoids confusion
      },
    }),
    prerender && prerender({
      routes: ['/', '/login', '/register', '/terms-of-service', '/privacy-policy', '/rdv'],
      staticDir: path.resolve(__dirname, 'dist'),
    }),
  ],
  // API proxy configuration
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/blog': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/sitemap.xml': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/rss.xml': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    // Enable sourcemaps for better debugging in development
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      external: (id) => id.startsWith('@tauri-apps/'),
      output: {
        // Ensure unique filenames for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Manual chunks for better code splitting
        manualChunks(id) {
          // React core — needed immediately
          if (id.includes('/react-dom/') || id.includes('/node_modules/react/')) {
            return 'react-vendor';
          }
          // Router — needed for first render
          if (id.includes('@tanstack/react-router') && !id.includes('devtools')) {
            return 'router';
          }
          // Query + state — needed for data fetching
          if (id.includes('@tanstack/react-query') && !id.includes('devtools')) {
            return 'query';
          }
          if (id.includes('zustand') || id.includes('jotai')) {
            return 'state';
          }
          // Supabase — needed for auth
          if (id.includes('@supabase/')) {
            return 'supabase';
          }
          // i18n — needed for first render
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n';
          }
          // UI primitives (Radix) — loaded on demand per route
          if (id.includes('@radix-ui/')) {
            return 'ui-vendor';
          }
          // Forms — loaded when forms are used
          if (id.includes('react-hook-form') || id.includes('@hookform/') || id.includes('/zod/')) {
            return 'forms';
          }
          // Charts — heavy, lazy loaded
          if (id.includes('echarts')) {
            return 'echarts';
          }
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
            return 'recharts';
          }
          // Maps — heavy, lazy loaded
          if (id.includes('leaflet')) {
            return 'maps-leaflet';
          }
          if (id.includes('/ol/') || id.includes('openlayers')) {
            return 'maps-ol';
          }
          // Dates
          if (id.includes('date-fns') || id.includes('react-day-picker')) {
            return 'dates';
          }
          // PDF — heavy, lazy loaded
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'pdf';
          }
          // CASL
          if (id.includes('@casl/')) {
            return 'casl';
          }
          // Sentry — loaded async after initial render
          if (id.includes('@sentry/')) {
            return 'sentry';
          }
          // Lucide icons — let them split per route for better code splitting
          // (no manual chunk — icons tree-shake into each route's chunk)
          // kbar (command palette)
          if (id.includes('kbar')) {
            return 'kbar';
          }
          // axios
          if (id.includes('axios')) {
            return 'axios';
          }
          // Devtools — dev only
          if (id.includes('devtools')) {
            return 'devtools';
          }
          // Marked (markdown) — lazy
          if (id.includes('marked') || id.includes('dompurify')) {
            return 'markdown';
          }
          // Socket.io
          if (id.includes('socket.io')) {
            return 'socketio';
          }
          // docx generation
          if (id.includes('docx')) {
            return 'docx';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-router',
      '@tanstack/react-query',
      'zustand',
      'i18next',
      'react-i18next',
      '@supabase/supabase-js',
      'react-day-picker',
      'date-fns',
      'leaflet',
      'react-hook-form',
      'sonner',
      'clsx',
      'tailwind-merge',
      'class-variance-authority',
      'axios',
      'lucide-react',
      'gsap',
      '@chenglou/pretext',
    ],
  },
  // Fix Leaflet SSR issues
  ssr: {
    noExternal: ['leaflet', 'react-leaflet'],
  },
});
