import React from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { initGA, initClarity, markRouterNavigating, markRouterStable } from './lib/analytics'
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
      staleTime: 5 * 60 * 1000, // 5 minutes - prevents excessive refetching
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
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

async function init() {
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

    if (state.isAuthenticated && !prevState.isAuthenticated) {
      setTimeout(() => {
        markRouterStable()
        initClarity()
      }, 500)
    }
  })

  // Track router state for Clarity safety
  router.subscribe('onBeforeNavigate', () => {
    markRouterNavigating()
  })

  router.subscribe('onResolved', () => {
    markRouterStable()
  })

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} context={routerContext} />
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

init()
