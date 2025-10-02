import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import OrganizationSwitcher from '../components/OrganizationSwitcher'
import FarmSwitcher from '../components/FarmSwitcher'
import SubscriptionRequired from '../components/SubscriptionRequired'
import SubscriptionBanner from '../components/SubscriptionBanner'
import LegacyUserBanner from '../components/LegacyUserBanner'
import { useAuth } from '../hooks/useAuth'
import { useSubscription } from '../hooks/useSubscription'
import { isSubscriptionValid } from '../lib/polar'

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
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        modules={modules}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={() => setIsDarkMode(!isDarkMode)}
      />
      <div className="flex-1 overflow-auto flex flex-col">
        <LegacyUserBanner />
        <SubscriptionBanner />
        <header className="bg-white border-b">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <OrganizationSwitcher />
              <FarmSwitcher />
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="p-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}