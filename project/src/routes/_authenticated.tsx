import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Sidebar from '../components/Sidebar'
import SubscriptionRequired from '../components/SubscriptionRequired'
import SubscriptionBanner from '../components/SubscriptionBanner'
import LegacyUserBanner from '../components/LegacyUserBanner'
import MobileBottomNav from '../components/MobileBottomNav'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { isSubscriptionValid } from '../lib/polar'
import { LevelUpSuggestion } from '../components/adaptive'
import { useSidebarMargin } from '../hooks/useSidebarLayout'
import { useAuthStore, waitForHydration } from '../stores/authStore'
import { useActivityTracking } from '../hooks/useActivityTracking'
import { isRTLLocale } from '../lib/is-rtl-locale'
import { usersApi } from '../lib/api/users'
import { AuthenticatedLayoutSkeleton } from '@/components/AuthenticatedLayoutSkeleton';


export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    await waitForHydration()
    
    const contextUser = context.auth?.user
    const storeState = useAuthStore.getState()
    const storeUser = storeState.isAuthenticated ? storeState.user : null
    
    const user = contextUser || storeUser
    
    if (!user) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
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
    if (profile?.language && profile.language !== i18n.language) {
      i18n.changeLanguage(profile.language)
    }
  }, [profile?.language, i18n])

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
  const isOnSettingsPage = window.location.pathname.includes('/settings/')

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
    <div className={isDarkMode ? 'dark' : ''} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <Sidebar
          modules={modules}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          isDarkMode={isDarkMode}
          onThemeToggle={handleThemeToggle}
        />
        {/* Main content with margin for fixed sidebar (desktop only) */}
        <div
          className="flex flex-col h-screen transition-all duration-300 ease-in-out"
          style={sidebarStyle}
        >
          <LegacyUserBanner />
          <SubscriptionBanner />
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
          <main data-main-scroll className="flex-1 min-h-0 overflow-y-auto bg-gray-50 dark:bg-gray-900 pb-16 md:pb-0">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
      {/* Level-up suggestion toast */}
      <LevelUpSuggestion />
    </div>
  )
}
