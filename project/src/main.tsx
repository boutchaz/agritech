import React from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { initGA } from './lib/analytics'
import { useAuthStore, waitForHydration } from './stores/authStore'
import './i18n/config'
import './index.css'

// Initialize Locator for React DevTools debugging (development only)
if (import.meta.env.DEV) {
  import('@locator/runtime').then((setupLocator) => {
    setupLocator.default();
  });
}

// Create a client with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always stale — invalidateQueries always triggers immediate refetch
      gcTime: 5 * 60 * 1000, // Keep unused data in memory for 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Disable globally - prevents refetch on tab switch
      refetchOnReconnect: true, // Refetch when network reconnects
    },
  },
})

// Export queryClient for use in other modules (e.g., to clear cache on auth changes)
export { queryClient }

// Create router context with auth
const routerContext = {
  auth: {
    user: null as any,
    isLoading: true,
  },
}

// Create a new router instance with context
const router = createRouter({
  routeTree,
  context: routerContext,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

/**
 * One-time cleanup: unregister any rogue/manually-registered service workers
 * from before vite-plugin-pwa was set up. Once the new PWA SW takes over,
 * this is a no-op. Uses a localStorage flag to only run once.
 */
async function cleanupLegacyServiceWorkers() {
  const CLEANUP_KEY = 'agrogina:sw-cleanup-v1';
  if (localStorage.getItem(CLEANUP_KEY)) return;

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        // Unregister any SW that isn't from vite-plugin-pwa
        // (vite-plugin-pwa SWs are at /sw.js)
        if (registration.active?.scriptURL && !registration.active.scriptURL.endsWith('/sw.js')) {
          console.warn('[sw-cleanup] Unregistering legacy SW:', registration.active.scriptURL);
          await registration.unregister();
        }
      }
      // Also clear old workbox/cache storage buckets
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          // Only delete non-workbox caches (workbox uses `workbox-` prefix)
          if (!name.startsWith('workbox-') && !name.startsWith('api-cache')) {
            console.warn('[sw-cleanup] Deleting legacy cache:', name);
            await caches.delete(name);
          }
        }
      }
    } catch (err) {
      console.warn('[sw-cleanup] Cleanup failed (non-fatal):', err);
    }
  }
  localStorage.setItem(CLEANUP_KEY, String(Date.now()));
}

async function init() {
  // Clean up any legacy service workers from previous PWA attempts
  await cleanupLegacyServiceWorkers();

  // Defer Sentry initialization to not block first paint
  if (import.meta.env.PROD) {
    import('./lib/sentry').then(({ initSentry }) => initSentry(router));
  }
  initGA()

  // Wait for Zustand store to hydrate from localStorage before making auth decisions
  await waitForHydration()

  const authStore = useAuthStore.getState()
  const storeUser = authStore.user
  const storeIsAuthenticated = authStore.isAuthenticated

  if (storeIsAuthenticated && storeUser) {
    routerContext.auth.user = { id: storeUser.id, email: storeUser.email }
    routerContext.auth.isLoading = false
  } else {
    routerContext.auth.user = null
    routerContext.auth.isLoading = false
  }

  useAuthStore.subscribe((state, prevState) => {
    if (state.isAuthenticated !== prevState.isAuthenticated) {
      routerContext.auth.user = state.user ? { id: state.user.id, email: state.user.email } : null
      router.invalidate()
      queryClient.clear()
    }

  })

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} context={routerContext} />
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

init().catch((err) => {
  console.error('[init] Fatal error during app initialization:', err);
  // Remove the inline loader so the user doesn't see a forever-spinner
  const loader = document.getElementById('app-loader');
  if (loader) loader.remove();
  // Show a minimal error message so the page isn't blank
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif;background:#f9fafb;">
        <div style="text-align:center;max-width:400px;padding:24px;">
          <h2 style="color:#dc2626;margin-bottom:8px;">Application Error</h2>
          <p style="color:#6b7280;margin-bottom:16px;">Something went wrong loading the application. Please try refreshing.</p>
          <button onclick="location.reload()" style="padding:8px 24px;background:#10b981;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">Refresh Page</button>
        </div>
      </div>
    `;
  }
})
