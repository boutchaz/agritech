import React from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { authSupabase } from './lib/auth-supabase'
import './i18n/config'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { checkMobileUpdate } from './utils/clearCache'

// Create a client with shorter stale time for fresher data
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 1000, // 5 seconds - data goes stale quickly
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      retry: 1,
      refetchOnWindowFocus: true, // Refetch when window regains focus
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
  const { data: { session } } = await authSupabase.auth.getSession()
  routerContext.auth.user = session?.user || null
  routerContext.auth.isLoading = false

  // Force update check on mobile devices
  await checkMobileUpdate()

  // Enhanced service worker registration with update detection
  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      // Check for updates immediately
      registration?.update()

      // More frequent checks on mobile (every 5 minutes)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const checkInterval = isMobile ? 5 * 60 * 1000 : 60 * 60 * 1000 // 5 min mobile, 1 hour desktop

      setInterval(() => {
        registration?.update()
      }, checkInterval)
    },
    onNeedRefresh() {
      // New service worker is available and waiting
      // Force update immediately on mobile for better UX
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      if (isMobile) {
        // Auto-update on mobile without confirmation
        updateSW(true)
      } else {
        // Ask for confirmation on desktop
        if (confirm('A new version is available. Reload to update?')) {
          updateSW(true)
        }
      }
    },
    onOfflineReady() {
      // App is ready to work offline - no action needed
    },
    onRegisterError(error) {
      console.error('Service Worker registration error:', error)
    },
  })

  // Check for updates when page becomes visible (user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Force check and update on mobile
      updateSW(true)
    }
  })

  // Check for updates on focus (user returns to window)
  window.addEventListener('focus', () => {
    updateSW(true)
  })

  // Additional mobile-specific update triggers
  if ('serviceWorker' in navigator) {
    // Force unregister old service workers on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          // Force update check
          registration.update()
        })
      })
    }
  }

  // Subscribe to auth changes
  authSupabase.auth.onAuthStateChange((event, session) => {
    routerContext.auth.user = session?.user || null
    router.invalidate()

    // Clear all cached data on sign in/out to ensure fresh data
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
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

init()
