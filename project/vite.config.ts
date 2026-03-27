import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter(),
    react(),
    // Sentry plugin uploads source maps on production builds
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      disable: !process.env.SENTRY_AUTH_TOKEN,
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
      output: {
        // Ensure unique filenames for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Manual chunks for better code splitting
        manualChunks(id) {
          // IMPORTANT: react and react-dom must NOT be in a manual chunk.
          // Splitting them causes "Cannot access 'R' before initialization" TDZ errors.
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return undefined; // Let Vite handle React — stays in entry chunk
          }
          if (id.includes('node_modules/@tanstack/react-router')) return 'router';
          if (id.includes('node_modules/@tanstack/react-query') || id.includes('node_modules/zustand') || id.includes('node_modules/jotai')) return 'query';
          if (id.includes('node_modules/@radix-ui/')) return 'ui-vendor';
          if (id.includes('node_modules/echarts') || id.includes('node_modules/recharts')) return 'charts';
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet') || id.includes('node_modules/ol/')) return 'maps';
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/react-day-picker')) return 'dates';
          if (id.includes('node_modules/@supabase/')) return 'supabase';
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform/') || id.includes('node_modules/zod')) return 'forms';
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) return 'i18n';
          if (id.includes('node_modules/jspdf')) return 'pdf';
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
    include: ['react-day-picker', 'date-fns', 'leaflet'],
    exclude: ['lucide-react'],
  },
  // Fix Leaflet SSR issues
  ssr: {
    noExternal: ['leaflet', 'react-leaflet'],
  },
});
