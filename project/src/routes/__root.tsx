import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router'
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
import { lazy, Suspense } from 'react'

// Lazy load devtools — they're only used in development
const TanStackRouterDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/router-devtools').then((mod) => ({
        default: mod.TanStackRouterDevtools,
      }))
    )
  : () => null;

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((mod) => ({
        default: mod.ReactQueryDevtools,
      }))
    )
  : () => null;

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
                        <Suspense>
                          <TanStackRouterDevtools />
                          <ReactQueryDevtools initialIsOpen={false} />
                        </Suspense>
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
