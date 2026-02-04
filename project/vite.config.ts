import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter(),
    react(),
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
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Ensure unique filenames for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Manual chunks for better code splitting
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],
          // Routing
          'router': ['@tanstack/react-router'],
          // Query/State management
          'query': ['@tanstack/react-query', 'zustand', 'jotai'],
          // UI components
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-tabs',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-label',
            '@radix-ui/react-alert-dialog',
          ],
          // Charts (large)
          'charts': ['echarts', 'echarts-for-react', 'recharts'],
          // Maps (large)
          'maps': ['leaflet', 'react-leaflet', 'ol'],
          // Date utilities
          'dates': ['date-fns', 'react-day-picker'],
          // Supabase
          'supabase': ['@supabase/supabase-js', '@supabase/ssr'],
          // Forms
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // i18n
          'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // PDF generation
          'pdf': ['jspdf', 'jspdf-autotable'],
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
