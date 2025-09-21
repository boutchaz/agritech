import React from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { supabase } from './lib/supabase'
import './index.css'

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
  const { data: { session } } = await supabase.auth.getSession()
  routerContext.auth.user = session?.user || null
  routerContext.auth.isLoading = false

  // Subscribe to auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    routerContext.auth.user = session?.user || null
    router.invalidate()
  })

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RouterProvider router={router} context={routerContext} />
    </React.StrictMode>,
  )
}

init()