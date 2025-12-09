import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'pwa-icon.svg'],
      devOptions: {
        enabled: false, // Disable in dev to avoid issues
      },
      manifest: {
        name: 'Agritech',
        short_name: 'Agritech',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        description: 'Farm management, stock and billing in one place.',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Increase the maximum file size limit for precaching to 5 MB
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB

        // Immediately activate new service worker
        skipWaiting: true,
        clientsClaim: true,

        // Clean old caches on activation
        cleanupOutdatedCaches: true,

        // Force navigation requests to go through service worker
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],

        runtimeCaching: [
          {
            // Fonts - long cache, rarely change
            urlPattern: /^https:\/\/fonts\.(gstatic|googleapis)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // API calls - Always network first, no caching to ensure fresh data
            urlPattern: /\/api\/v1\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Supabase REST API - Always network first, no caching
            urlPattern: /\/rest\/v1\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            // Static assets (JS/CSS) - Cache with version hash handles updates
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
            },
          },
          {
            // Images and other assets - Cache first for performance
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 days
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Ensure unique filenames for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react-day-picker', 'date-fns', 'leaflet'],
    exclude: ['lucide-react'],
  },
  // Fix Leaflet SSR issues
  ssr: {
    noExternal: ['leaflet', 'react-leaflet'],
  },
});
