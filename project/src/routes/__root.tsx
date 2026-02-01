import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { AuthProviderSwitch } from '../components/AuthProviderSwitch'
import { AbilityProvider } from '../lib/casl/AbilityContext'
import { GlobalCommandPalette } from '../components/GlobalCommandPalette'
import { ExperienceLevelProvider } from '../contexts/ExperienceLevelContext'
import { TourProvider } from '../contexts/TourContext'
import { TourHelpButton } from '../components/TourHelpButton'
import { NetworkStatusProvider } from '../components/NetworkStatusProvider'
import { OfflineIndicator } from '../components/OfflineIndicator'
import { ErrorBoundary } from '../components/ErrorBoundary'

export const Route = createRootRoute({
  component: () => {
    const location = useLocation();
    const isOnboardingRoute = location.pathname.startsWith('/onboarding');

    return (
      <ErrorBoundary>
        <NetworkStatusProvider enableToasts={true} enableSlowConnectionWarning={true}>
          <AuthProviderSwitch>
            <ExperienceLevelProvider>
              <TourProvider>
                <AbilityProvider>
                  <GlobalCommandPalette>
                    <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-y-auto">
                      <Outlet />
                      <OfflineIndicator />
                      {!isOnboardingRoute && <TourHelpButton />}
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
          </AuthProviderSwitch>
        </NetworkStatusProvider>
      </ErrorBoundary>
    );
  },
})
