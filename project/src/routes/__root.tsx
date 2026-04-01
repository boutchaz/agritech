import { createRootRoute, Outlet, useLocation } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import { AuthProviderSwitch } from '../components/AuthProviderSwitch'
import { AbilityProvider } from '../lib/casl/AbilityContext'
import { ExperienceLevelProvider } from '../contexts/ExperienceLevelContext'
import { NetworkStatusProvider } from '../components/NetworkStatusProvider'
import { OfflineIndicator } from '../components/OfflineIndicator'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { NotFoundPage } from '../components/NotFoundPage'
import { lazy, Suspense } from 'react'

// Lazy load non-critical UI — command palette, tour, devtools
// Eagerly start loading these chunks since they wrap the main Outlet
const globalCommandPaletteImport = import('../components/GlobalCommandPalette');
const tourContextImport = import('../contexts/TourContext');

const GlobalCommandPalette = lazy(() =>
  globalCommandPaletteImport.then((mod) => ({
    default: mod.GlobalCommandPalette,
  }))
);

const TourProvider = lazy(() =>
  tourContextImport.then((mod) => ({
    default: mod.TourProvider,
  }))
);

const TourHelpButton = lazy(() =>
  import('../components/TourHelpButton').then((mod) => ({
    default: mod.TourHelpButton,
  }))
);

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

function RootComponent() {
  const location = useLocation();
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');

  return (
      <ErrorBoundary>
        <HotkeysProvider
          defaultOptions={{
            hotkey: {
              preventDefault: true,
              stopPropagation: true,
              conflictBehavior: 'warn',
            },
          }}
        >
          <NetworkStatusProvider enableToasts={true} enableSlowConnectionWarning={true}>
            <AuthProviderSwitch>
              <ExperienceLevelProvider>
                <Suspense fallback={<div className="h-screen bg-gray-50 dark:bg-gray-900" />}>
                  <TourProvider>
                    <AbilityProvider>
                      <Suspense fallback={<div className="h-screen bg-gray-50 dark:bg-gray-900" />}>
                        <GlobalCommandPalette>
                          <div className="h-screen bg-gray-50 dark:bg-gray-900 overflow-y-auto">
                            <Outlet />
                            <OfflineIndicator />
                            {!isOnboardingRoute && (
                              <Suspense>
                                <TourHelpButton />
                              </Suspense>
                            )}
                            <Toaster richColors position="top-right" />
                            {import.meta.env.DEV && (
                              <Suspense>
                                <TanStackRouterDevtools />
                                <ReactQueryDevtools initialIsOpen={false} />
                              </Suspense>
                            )}
                          </div>
                        </GlobalCommandPalette>
                      </Suspense>
                    </AbilityProvider>
                  </TourProvider>
                </Suspense>
              </ExperienceLevelProvider>
            </AuthProviderSwitch>
          </NetworkStatusProvider>
        </HotkeysProvider>
      </ErrorBoundary>
    );
}

export const Route = createRootRoute({
  notFoundComponent: NotFoundPage,
  component: RootComponent,
})
