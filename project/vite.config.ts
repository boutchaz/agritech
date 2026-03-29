import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { compression } from 'vite-plugin-compression2';
import path from 'path';

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
  ],
  // API proxy configuration
  server: {
    proxy: {
      '/api': {
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
    ],
  },
  // Fix Leaflet SSR issues
  ssr: {
    noExternal: ['leaflet', 'react-leaflet'],
  },
});
