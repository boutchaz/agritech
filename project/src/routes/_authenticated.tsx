import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import OrganizationSwitcher from '../components/OrganizationSwitcher'
import FarmSwitcher from '../components/FarmSwitcher'
import SubscriptionRequired from '../components/SubscriptionRequired'
import SubscriptionBanner from '../components/SubscriptionBanner'
import LegacyUserBanner from '../components/LegacyUserBanner'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { isSubscriptionValid } from '../lib/polar'
import { LevelUpSuggestion } from '../components/adaptive'

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed'

// Hook to detect desktop screen size (lg breakpoint = 1024px)
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const handleChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)

    // Set initial value
    setIsDesktop(mediaQuery.matches)

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    // Check authentication before loading protected routes
    const { user } = await context.auth
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
  const { user, signOut, currentOrganization } = useAuth()
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [activeModule, setActiveModule] = useState('dashboard')
  const isDesktop = useIsDesktop()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return saved === 'true'
  })

  // Listen for sidebar collapse changes
  useEffect(() => {
    const handleSidebarCollapse = (e: CustomEvent<{ collapsed: boolean }>) => {
      setIsSidebarCollapsed(e.detail.collapsed)
    }

    window.addEventListener('sidebarCollapse', handleSidebarCollapse as EventListener)

    return () => {
      window.removeEventListener('sidebarCollapse', handleSidebarCollapse as EventListener)
    }
  }, [])

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

  // Calculate sidebar width for main content offset
  const sidebarWidth = isDesktop ? (isSidebarCollapsed ? 64 : 256) : 0

  return (
    <div className={isDarkMode ? 'dark' : ''}>
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
          style={{ marginLeft: `${sidebarWidth}px` }}
        >
          <LegacyUserBanner />
          <SubscriptionBanner />
          <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
          </header>
          <main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
            <Outlet />
          </main>
        </div>
      </div>
      {/* Level-up suggestion toast */}
      <LevelUpSuggestion />
    </div>
  )
}