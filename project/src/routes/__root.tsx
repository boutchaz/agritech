import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { MultiTenantAuthProvider } from '../components/MultiTenantAuthProvider'
import { AbilityProvider } from '../lib/casl/AbilityContext'
import { GlobalCommandPalette } from '../components/GlobalCommandPalette'
import { ExperienceLevelProvider } from '../contexts/ExperienceLevelContext'
import { NetworkStatusProvider } from '../components/NetworkStatusProvider'
import { OfflineIndicator } from '../components/OfflineIndicator'

export const Route = createRootRoute({
  component: () => (
    <NetworkStatusProvider enableToasts={true} enableSlowConnectionWarning={true}>
      <MultiTenantAuthProvider>
        <ExperienceLevelProvider>
          <AbilityProvider>
            <GlobalCommandPalette>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Outlet />
                <OfflineIndicator />
                <Toaster richColors position="top-right" />
                {import.meta.env.DEV && (
                  <>
                    <TanStackRouterDevtools />
                    <ReactQueryDevtools initialIsOpen={false} />
                  </>
                )}
              </div>
            </GlobalCommandPalette>
          </AbilityProvider>
        </ExperienceLevelProvider>
      </MultiTenantAuthProvider>
    </NetworkStatusProvider>
  ),
})