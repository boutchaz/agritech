import React from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { authSupabase } from './lib/auth-supabase'
import { initGA, initClarity } from './lib/analytics'
import './i18n/config'
import './index.css'

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

// Check auth state before rendering
async function init() {
  // Initialize Google Analytics early (doesn't interfere with router)
  initGA()

  const { data: { session } } = await authSupabase.auth.getSession()
  routerContext.auth.user = session?.user || null
  routerContext.auth.isLoading = false

  // Subscribe to auth changes
  authSupabase.auth.onAuthStateChange((event, session) => {
    routerContext.auth.user = session?.user || null
    router.invalidate()

    // Clear all cached data on sign in/out to ensure fresh data
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      queryClient.clear()
    }

    // Initialize Clarity only after successful sign-in to avoid router interference
    // Clarity uses history.pushState which can cause infinite redirects during auth flow
    if (event === 'SIGNED_IN') {
      initClarity()
    }
  })

  // If user is already logged in on initial load, initialize Clarity after a short delay
  // This ensures the router has fully stabilized before Clarity injects its script
  if (session?.user) {
    setTimeout(() => initClarity(), 1000)
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} context={routerContext} />
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

init()
