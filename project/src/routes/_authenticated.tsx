import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import Sidebar from '../components/Sidebar'
import SubscriptionRequired from '../components/SubscriptionRequired'
import SubscriptionBanner from '../components/SubscriptionBanner'
import LegacyUserBanner from '../components/LegacyUserBanner'
import MobileBottomNav from '../components/MobileBottomNav'
import BannerDisplay from '../components/BannerDisplay'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { isSubscriptionValid } from '../lib/polar'
import { LevelUpSuggestion } from '../components/adaptive'
import { useSidebarMargin } from '../hooks/useSidebarLayout'
import { useAuthStore, waitForHydration } from '../stores/authStore'
import { useActivityTracking } from '../hooks/useActivityTracking'
import { isRTLLocale } from '../lib/is-rtl-locale'
import { loadLanguage } from '@/i18n/config'
import { usersApi } from '../lib/api/users'
import { AuthenticatedLayoutSkeleton } from '@/components/AuthenticatedLayoutSkeleton';
import { NotificationRealtimeBridge } from '@/components/NotificationRealtimeBridge';
import { PullToRefresh } from '@/components/PullToRefresh';


export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    await waitForHydration()
    
    const contextUser = context.auth?.user
    const storeState = useAuthStore.getState()
    const storeUser = storeState.isAuthenticated ? storeState.user : null
    
    const user = contextUser || storeUser
    
    if (!user) {
      const hasRefreshToken = !!storeState.tokens?.refresh_token
      if (hasRefreshToken && storeState.isTokenExpired()) {
        const refreshed = await storeState.refreshAccessToken()
        if (refreshed && useAuthStore.getState().isAuthenticated) {
          return
        }
      }
      throw redirect({
        to: '/login',
        search: {
          redirect: location.pathname,
        },
      })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { currentOrganization, profile } = useAuth()
  const { data: subscription, isLoading: subscriptionLoading, isFetched: subscriptionFetched } = useSubscription()
  const { i18n } = useTranslation()
  /** Set when the user toggles theme; cleared is unnecessary — profile + localStorage cover hydration. */
  const [darkModeUserOverride, setDarkModeUserOverride] = useState<boolean | null>(null)
  const isDarkMode = useMemo(() => {
    if (darkModeUserOverride !== null) return darkModeUserOverride
    if (profile?.dark_mode !== undefined && profile?.dark_mode !== null) {
      return profile.dark_mode
    }
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('darkMode')
      return stored === 'true'
    }
    return false
  }, [darkModeUserOverride, profile?.dark_mode])
  const [activeModule, setActiveModule] = useState('dashboard')
  const isRTL = isRTLLocale(i18n.language)
  const { style: sidebarStyle } = useSidebarMargin(isRTL)

  // Track user activity for live dashboard concurrent users
  useActivityTracking()

  // Keep localStorage aligned with DB for the next cold load (external storage only — no setState)
  useEffect(() => {
    if (profile?.dark_mode !== undefined && profile?.dark_mode !== null) {
      localStorage.setItem('darkMode', String(profile.dark_mode))
    }
  }, [profile?.dark_mode])

  // Sync language from DB profile on load (overrides localStorage if DB has a value)
  useEffect(() => {
    if (profile?.language) {
      loadLanguage(profile.language)
    }
  }, [profile?.language])

  // Toggle dark mode and persist to DB + localStorage
  const handleThemeToggle = useCallback(() => {
    const newValue = !isDarkMode
    setDarkModeUserOverride(newValue)
    localStorage.setItem('darkMode', String(newValue))
    // Fire-and-forget DB persistence
    usersApi.updateMe({ dark_mode: newValue }).catch((err) => {
      console.warn('Failed to persist dark mode to DB:', err)
    })
  }, [isDarkMode])

  /** Radix portals render under `body`; Tailwind `dark:` only applies under an ancestor with `.dark`. Theme was only on a layout div, so portaled popovers/menus stayed light — sync to `<html>`. */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
    return () => {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // Mock modules data - this should come from your state management
  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: 'Home', active: true, category: 'general' },
    { id: 'fruit-trees', name: 'Arbres Fruitiers', icon: 'Tree', active: true, category: 'agriculture' },
    { id: 'legumes', name: 'Légumes', icon: 'Sprout', active: true, category: 'agriculture' },
  ]

  // Only show loading while subscription hasn't been fetched yet
  // isFetched ensures we don't get stuck in infinite spinner when subscription is null
  const isSubscriptionPending = !subscriptionFetched && (subscriptionLoading || !!currentOrganization)
  if (isSubscriptionPending) {
    return <AuthenticatedLayoutSkeleton />
  }

  // Check if subscription is valid
  // Allow access to settings pages even without valid subscription
  const hasValidSubscription = isSubscriptionValid(subscription)
  const settingsPath = window.location.pathname.replace(/\/$/, '') || '/'
  const isOnSettingsPage =
    settingsPath === '/settings' || settingsPath.startsWith('/settings/')

  // Block access if no valid subscription (unless on settings page)
  if (!hasValidSubscription && !isOnSettingsPage && currentOrganization) {
    // Determine reason for blocking
    const reason = !subscription
      ? 'no_subscription'
      : subscription.status === 'canceled'
      ? 'canceled'
      : subscription.status === 'past_due'
      ? 'past_due'
      : 'expired'

    return <SubscriptionRequired reason={reason} />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      <div
        data-authenticated-app
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-100 dark:bg-slate-950"
      >
        <Sidebar
          modules={modules}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          isDarkMode={isDarkMode}
          onThemeToggle={handleThemeToggle}
        />
        {/* Main content with margin for fixed sidebar (desktop only) */}
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out"
          style={sidebarStyle}
        >
          <LegacyUserBanner />
          <SubscriptionBanner />
          <BannerDisplay />
          <NotificationRealtimeBridge />
          {/* <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <OrganizationSwitcher />
                <FarmSwitcher />
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</span>
                <Button
                  onClick={() => signOut()}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Sign out
                </Button>
              </div>
            </div>
          </header> */}
          <main
            data-main-scroll
            className={cn(
              'flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain bg-slate-50/90 dark:bg-slate-900/80',
              /* Scroll-end padding: tab clearance is primarily the in-flow spacer below (Android / One UI). */
              'max-md:pb-3 max-md:[scroll-padding-bottom:var(--app-mobile-nav-reserve,6rem)]',
              'md:pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] md:[scroll-padding-bottom:max(0.5rem,env(safe-area-inset-bottom,0px))]',
            )}
          >
            <ErrorBoundary>
              {/* No flex-1: let content define height so main scrolls on tablet/WebKit (flex-1 + min-h-0 traps overflow). */}
              <PullToRefresh>
                <div className="flex min-h-0 min-w-0 w-full flex-col">
                  <Outlet />
                </div>
              </PullToRefresh>
            </ErrorBoundary>
          </main>
          {/* Fixed bottom nav is out-of-flow: this reserves real layout height so content never sits under tabs (Samsung etc.). */}
          <div
            aria-hidden
            className="shrink-0 bg-transparent md:hidden h-[var(--app-mobile-nav-reserve,6.5rem)]"
          />
        </div>
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
      {/* Level-up suggestion toast */}
      <LevelUpSuggestion />
    </div>
  )
}
