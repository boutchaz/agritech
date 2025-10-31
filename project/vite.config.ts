import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tanstackRouter(), react()],
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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks - split large libraries
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react/') || id.includes('react-dom/')) {
              return 'react-vendor';
            }
            // TanStack
            if (id.includes('@tanstack/')) {
              return 'tanstack-vendor';
            }
            // Radix UI
            if (id.includes('@radix-ui/')) {
              return 'ui-vendor';
            }
            // ECharts (heavier, separate from recharts)
            if (id.includes('echarts')) {
              return 'echarts-vendor';
            }
            // Recharts (lighter charting library)
            if (id.includes('recharts')) {
              return 'recharts-vendor';
            }
            // Map libraries - split OpenLayers and Leaflet
            if (id.includes('leaflet')) {
              return 'leaflet-vendor';
            }
            if (id.includes('/ol') || id.includes('openlayers')) {
              return 'openlayers-vendor';
            }
            // Supabase
            if (id.includes('@supabase/')) {
              return 'supabase-vendor';
            }
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('@hookform/')) {
              return 'form-vendor';
            }
            // Zod (validation, used with forms but can be separate)
            if (id.includes('zod') && !id.includes('node_modules/zod/dist')) {
              return 'validation-vendor';
            }
            // i18n
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n-vendor';
            }
            // PDF libraries
            if (id.includes('jspdf')) {
              return 'pdf-vendor';
            }
            // Icons (lucide-react can be large)
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            // Socket/Real-time
            if (id.includes('socket.io')) {
              return 'socket-vendor';
            }
            // Other utilities (date-fns, clsx, etc.)
            if (id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils-vendor';
            }
            // Other node_modules (catch-all for smaller libraries)
            return 'vendor';
          }
          
          // Split app code by routes if needed (optional)
          // if (id.includes('/src/routes/')) {
          //   return 'routes';
          // }
        },
      },
    },
    // Increased limit - large chunks are now properly isolated
    // echarts-vendor (~1MB) is acceptable as it's only loaded when needed
    // vendor (~1.2MB) contains misc dependencies that are harder to split
    // index (~1.3MB) is the main app bundle
    chunkSizeWarningLimit: 1500,
    // Enable tree shaking
    minify: 'esbuild',
    // Source maps for production (optional - remove if not needed)
    sourcemap: false,
    // Target modern browsers for smaller output
    target: 'esnext',
  },
});
