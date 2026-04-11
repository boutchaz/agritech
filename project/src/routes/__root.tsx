import {
  createRootRoute,
  Outlet,
  useLocation,
  useRouterState,
} from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { HotkeysProvider } from '@tanstack/react-hotkeys'
import { AuthProviderSwitch } from '../components/AuthProviderSwitch'
import { AbilityProvider } from '../lib/casl/AbilityContext'
import { ExperienceLevelProvider } from '../contexts/ExperienceLevelContext'
import { NetworkStatusProvider } from '../components/NetworkStatusProvider'
import { OfflineIndicator } from '../components/OfflineIndicator'
import { ServiceWorkerUpdate } from '../components/ServiceWorkerUpdate'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { NotFoundPage } from '../components/NotFoundPage'
import { lazy, Suspense, type ReactNode, Component, type ErrorInfo } from 'react'
import { cn } from '@/lib/utils'

/**
 * Wrapper that catches errors from lazy-loaded components.
 * Without this, a chunk-load failure would leave the Suspense fallback showing forever
 * (empty div → "white page").
 */
class LazyErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[LazyErrorBoundary] Chunk load failed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      // Render children directly — the lazy wrapper failed but the rest of the
      // tree (Outlet, providers, etc.) can still render.
      return this.props.fallback ?? this.props.children;
    }
    return this.props.children;
  }
}

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

  // Detect not-found state: only the root route matched → no child route matched.
  // Render the 404 page directly without auth providers to avoid loading skeletons
  // and auth redirects blocking the not-found page.
  const matches = useRouterState({ select: (s) => s.matches });
  const isNotFound = matches.length <= 1;

  if (isNotFound) {
    return (
      <div className="h-screen bg-slate-50 dark:bg-slate-950 overflow-y-auto">
        <Outlet />
        <Toaster richColors position="top-right" />
      </div>
    );
  }

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
                <LazyErrorBoundary fallback={<FallbackShell />}>
                  <Suspense fallback={<FallbackShell />}>
                    <TourProvider>
                      <AbilityProvider>
                        <LazyErrorBoundary fallback={<FallbackShell />}>
                          <Suspense fallback={<FallbackShell />}>
                            <GlobalCommandPalette>
                              <AppShell isOnboardingRoute={isOnboardingRoute} />
                            </GlobalCommandPalette>
                          </Suspense>
                        </LazyErrorBoundary>
                      </AbilityProvider>
                    </TourProvider>
                  </Suspense>
                </LazyErrorBoundary>
              </ExperienceLevelProvider>
            </AuthProviderSwitch>
          </NetworkStatusProvider>
        </HotkeysProvider>
      </ErrorBoundary>
    );
}

/**
 * Fallback shown while lazy chunks load.
 * Must NOT render <Outlet /> — that can itself suspend, creating an infinite loop.
 */
function FallbackShell() {
  return <div className="h-screen bg-slate-50 dark:bg-slate-950" />;
}

/**
 * Inner shell extracted to keep the JSX tree readable.
 */
function AppShell({ isOnboardingRoute }: { isOnboardingRoute: boolean }) {
  const matches = useRouterState({ select: (s) => s.matches })
  const isAuthenticatedApp = matches.some(
    (m) => typeof m.routeId === 'string' && m.routeId.startsWith('/_authenticated'),
  )
  /** Public / onboarding: outer shell scrolls. Logged-in app: single scroll on <main> so mobile nav padding works. */
  const allowOuterScroll = isOnboardingRoute || !isAuthenticatedApp

  return (
    <div
      className={cn(
        'flex h-screen min-h-0 flex-col bg-slate-50 dark:bg-slate-950',
        allowOuterScroll ? 'overflow-y-auto' : 'overflow-hidden',
      )}
    >
      <div
        className={cn(
          'min-h-0 w-full',
          allowOuterScroll ? '' : 'flex flex-1 flex-col overflow-hidden',
        )}
      >
        <Outlet />
      </div>
      <OfflineIndicator />
      <ServiceWorkerUpdate />
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
  );
}

export const Route = createRootRoute({
  notFoundComponent: NotFoundPage,
  component: RootComponent,
})
