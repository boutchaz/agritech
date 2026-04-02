import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { initGA } from './lib/analytics'
import { useAuthStore, waitForHydration } from './stores/authStore'
import { WowIntro } from './components/WowIntro'
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
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
})

// Export queryClient for use in other modules
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
 */
async function cleanupLegacyServiceWorkers() {
  const CLEANUP_KEY = 'agrogina:sw-cleanup-v1';
  if (localStorage.getItem(CLEANUP_KEY)) return;

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.active?.scriptURL && !registration.active.scriptURL.endsWith('/sw.js')) {
          console.warn('[sw-cleanup] Unregistering legacy SW:', registration.active.scriptURL);
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
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

const App = () => {
  const [showIntro, setShowIntro] = useState(true);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  return (
    <>
      {showIntro && <WowIntro onComplete={handleIntroComplete} />}
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} context={routerContext} />
      </QueryClientProvider>
    </>
  );
};

async function init() {
  await cleanupLegacyServiceWorkers();

  if (import.meta.env.PROD) {
    import('./lib/sentry').then(({ initSentry }) => initSentry(router));
  }
  initGA()

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
      <App />
    </React.StrictMode>,
  )
}

init().catch((err) => {
  console.error('[init] Fatal error during app initialization:', err);
  const loader = document.getElementById('app-loader');
  if (loader) loader.remove();
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
