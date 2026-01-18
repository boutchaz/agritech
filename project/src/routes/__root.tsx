import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { MultiTenantAuthProvider } from '../components/MultiTenantAuthProvider'
import { AbilityProvider } from '../lib/casl/AbilityContext'
import { GlobalCommandPalette } from '../components/GlobalCommandPalette'
import { ExperienceLevelProvider } from '../contexts/ExperienceLevelContext'
import { TourProvider } from '../contexts/TourContext'
import { TourHelpButton } from '../components/TourHelpButton'
import { NetworkStatusProvider } from '../components/NetworkStatusProvider'
import { OfflineIndicator } from '../components/OfflineIndicator'
import { ErrorBoundary } from '../components/ErrorBoundary'

export const Route = createRootRoute({
  component: () => (
    <ErrorBoundary>
      <NetworkStatusProvider enableToasts={true} enableSlowConnectionWarning={true}>
        <MultiTenantAuthProvider>
          <ExperienceLevelProvider>
            <TourProvider>
              <AbilityProvider>
                <GlobalCommandPalette>
                  <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-y-auto">
                    <Outlet />
                    <OfflineIndicator />
                    <TourHelpButton />
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
            </TourProvider>
          </ExperienceLevelProvider>
        </MultiTenantAuthProvider>
      </NetworkStatusProvider>
    </ErrorBoundary>
  ),
})