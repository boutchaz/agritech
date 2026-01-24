import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Sidebar from '../components/Sidebar'
import SubscriptionRequired from '../components/SubscriptionRequired'
import SubscriptionBanner from '../components/SubscriptionBanner'
import LegacyUserBanner from '../components/LegacyUserBanner'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { isSubscriptionValid } from '../lib/polar'
import { LevelUpSuggestion } from '../components/adaptive'
import { useSidebarMargin } from '../hooks/useSidebarLayout'
import { useAuthStore, waitForHydration } from '../stores/authStore'
import { useActivityTracking } from '../hooks/useActivityTracking'

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
  const { currentOrganization } = useAuth()
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription()
  const { i18n } = useTranslation()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [activeModule, setActiveModule] = useState('dashboard')
  const isRTL = i18n.language === 'ar'
  const { style: sidebarStyle } = useSidebarMargin(isRTL)

  // Track user activity for live dashboard concurrent users
  useActivityTracking()

  // Mock modules data - this should come from your state management
  const modules = [
    { id: 'dashboard', name: 'Dashboard', icon: 'Home', active: true, category: 'general' },
    { id: 'fruit-trees', name: 'Arbres Fruitiers', icon: 'Tree', active: true, category: 'agriculture' },
    { id: 'legumes', name: 'Légumes', icon: 'Sprout', active: true, category: 'agriculture' },
  ]

  // Debug logging
  console.log('🔍 Subscription check:', {
    subscription,
    subscriptionLoading,
    currentOrganization,
    isValid: isSubscriptionValid(subscription),
  })

  // Show loading while checking subscription
  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  // Check if subscription is valid
  // Allow access to settings pages even without valid subscription
  const hasValidSubscription = isSubscriptionValid(subscription)
  const isOnSettingsPage = window.location.pathname.includes('/settings/')

  console.log('🚦 Access check:', {
    hasValidSubscription,
    isOnSettingsPage,
    shouldBlock: !hasValidSubscription && !isOnSettingsPage && currentOrganization,
  })

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

    console.log('🚫 BLOCKING ACCESS - Reason:', reason)
    return <SubscriptionRequired reason={reason} />
  }

  console.log('✅ ACCESS GRANTED')

  return (
    <div className={isDarkMode ? 'dark' : ''} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <Sidebar
          modules={modules}
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          isDarkMode={isDarkMode}
          onThemeToggle={() => setIsDarkMode(!isDarkMode)}
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
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          </header> */}
          <main className="flex-1 min-h-0 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <Outlet />
          </main>
        </div>
      </div>
      {/* Level-up suggestion toast */}
      <LevelUpSuggestion />
    </div>
  )
}