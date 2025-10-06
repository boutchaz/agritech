import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { MultiTenantAuthProvider } from '../components/MultiTenantAuthProvider'
import { AbilityProvider } from '../lib/casl/AbilityContext'
import { GlobalCommandPalette } from '../components/GlobalCommandPalette'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 2,
    },
  },
})

export const Route = createRootRoute({
  component: () => (
    <QueryClientProvider client={queryClient}>
      <MultiTenantAuthProvider>
        <AbilityProvider>
          <GlobalCommandPalette>
            <div className="min-h-screen bg-gray-50">
              <Outlet />
              <TanStackRouterDevtools />
              <ReactQueryDevtools initialIsOpen={false} />
            </div>
          </GlobalCommandPalette>
        </AbilityProvider>
      </MultiTenantAuthProvider>
    </QueryClientProvider>
  ),
})