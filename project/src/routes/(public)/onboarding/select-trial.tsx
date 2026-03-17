import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { SUBSCRIPTION_PLANS, type PlanType } from '@/lib/polar'
import { Check, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useAuthStore } from '@/stores/authStore'
import { useOnboardingStore } from '@/stores/onboardingStore'
import {
  trackOnboardingStart,
  trackTrialPlanView,
  trackTrialPlanSelect,
  trackTrialStartAttempt,
  trackTrialStartSuccess,
  trackTrialStartFailure,
  trackPageView,
} from '@/lib/analytics'

export const Route = createFileRoute('/(public)/onboarding/select-trial')({
  component: SelectTrialPage,
})

// Setup progress steps for better UX
const SETUP_STEPS = [
  { id: 'auth', label: 'Checking authentication...' },
  { id: 'organization', label: 'Creating organization...' },
  { id: 'subscription', label: 'Activating trial...' },
  { id: 'complete', label: 'Complete!' },
] as const

type SetupStepId = typeof SETUP_STEPS[number]['id']

// Polling utility - replaces arbitrary setTimeout delays
const pollUntil = async <T,>(
  fn: () => Promise<T | null>,
  options: { interval?: number; maxAttempts?: number; label?: string } = {}
): Promise<T | null> => {
  const { interval = 200, maxAttempts = 25, _label = 'condition' } = options

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await fn()
    if (result) {
      return result
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
   return null
}

function SelectTrialPage() {
  const { currentOrganization, user, loading, refreshUserData, organizations } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('standard')
  const [error, setError] = useState<string | null>(null)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupStep, setSetupStep] = useState<SetupStepId>('auth')
  const setupAttempted = useRef(false)
  const queryClient = useQueryClient()
  const setSelectedPlanType = useOnboardingStore((state) => state.setSelectedPlanType)

  // Track page view on mount
  useEffect(() => {
    trackPageView({ title: 'Start Your Free Trial' })
    trackOnboardingStart()

     // Track all plan views on page load
     Object.entries(SUBSCRIPTION_PLANS).forEach(([_planType, plan]) => {
       trackTrialPlanView(plan.name)
     })
  }, [])

  // Use organizations array as fallback if currentOrganization isn't set yet
  const hasOrganization = currentOrganization || (organizations && organizations.length > 0)

  // Reset setup attempt when organization is successfully loaded
  useEffect(() => {
    if (hasOrganization && setupAttempted.current) {
      setupAttempted.current = false
    }
  }, [hasOrganization])

  // If user exists but no organization, call Edge Function to set it up
  useEffect(() => {
    const setupUserIfNeeded = async () => {
      // Prevent multiple attempts
      if (setupAttempted.current) {
        return
      }

      if (!loading && user && !hasOrganization && !isSettingUp) {
        setupAttempted.current = true
        setIsSettingUp(true)
        setSetupStep('auth')
        try {
          // Step 1: Poll for access token availability instead of fixed delay
          const accessToken = await pollUntil(
            async () => {
              const token = useAuthStore.getState().getAccessToken()
              return token || null
            },
            { interval: 100, maxAttempts: 30, label: 'access token' }
          )

          if (!accessToken) {
            console.error('❌ No access token available')
            setError('Authentication required. Please try logging in again.')
            setupAttempted.current = false
            return
          }

          // Step 2: Create organization via API
          setSetupStep('organization')
          const userMetadata = user.user_metadata as { organization_name?: string } | undefined
          const orgName = userMetadata?.organization_name || `${user.email?.split('@')[0] || 'User'}'s Organization`

          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
          const response = await fetch(`${apiUrl}/api/v1/auth/setup-organization`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              organizationName: orgName,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('❌ API error:', response.status, errorData)
            setError(`Setup failed: ${errorData.message || `Error ${response.status}`}. Please try again or refresh the page.`)
            setupAttempted.current = false
            return
          }

          // Step 3: Poll for organization creation in database (replaces fixed delays)
          setSetupStep('subscription')
          const orgResult = await pollUntil(
            async () => {
              await refreshUserData()
              const orgs = useAuthStore.getState().organizations
              return orgs && orgs.length > 0 ? orgs[0] : null
            },
            { interval: 300, maxAttempts: 20, label: 'organization creation' }
          )

          if (orgResult) {
            // Organization found
          } else {
            // Organization not found after polling, proceeding anyway
          }

          // Refresh user data to update React Query cache
          await refreshUserData()

          setSetupStep('complete')
        } catch (error) {
          console.error('❌ Error calling Edge Function:', error)
          setError(`Setup error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try refreshing the page.`)
          setupAttempted.current = false // Allow retry on error
        } finally {
          setIsSettingUp(false)
        }
      }
    }

    setupUserIfNeeded()
  }, [loading, user, hasOrganization, isSettingUp, refreshUserData])

  // Show loading state while auth data is being fetched or setting up
  if (loading || isSettingUp) {
    const currentStepIndex = SETUP_STEPS.findIndex(s => s.id === setupStep)
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-lime-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4" data-testid="trial-loading">
        <div className="text-center max-w-sm">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-6" data-testid="loading-spinner" />
          <p className="text-gray-900 dark:text-white font-medium mb-4">
            {isSettingUp ? 'Setting up your account...' : 'Loading your account...'}
          </p>
          {isSettingUp && (
            <div className="space-y-2">
              {SETUP_STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 text-sm transition-opacity duration-200 ${
                    index <= currentStepIndex
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-400 dark:text-gray-500 opacity-50'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : index === currentStepIndex ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-current" />
                  )}
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Check if email is not confirmed
  const isEmailConfirmed = user?.email_confirmed_at !== null && user?.email_confirmed_at !== undefined

  // Show error if no user or organization after loading (and not currently setting up)
  if (!loading && !isSettingUp && (!user || !hasOrganization)) {
    // Check if email is not confirmed
    if (user && !isEmailConfirmed) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-lime-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Confirm Your Email
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Your account has been created successfully, but you need to confirm your email address before you can activate your account.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  📧 Check Your Email
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-400 mb-3">
                  We've sent a confirmation email to <strong>{user.email}</strong>. Please click the link in the email to confirm your account.
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  After confirming, visit{' '}
                  <a
                    href="/select-trial"
                    className="font-semibold underline hover:text-blue-600 dark:hover:text-blue-300"
                    onClick={(e) => {
                      e.preventDefault()
                      window.location.href = '/select-trial'
                    }}
                  >
                    {typeof window !== 'undefined' ? window.location.origin : ''}/select-trial
                  </a>
                  {' '}to activate your account and select your free trial plan.
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                Make sure to check your spam folder if you don't see the email within a few minutes.
              </p>
              {error && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-yellow-700 dark:text-yellow-400 text-left">
                  <strong>Note:</strong> {error}
                </div>
              )}
            </div>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/register'}
                className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                Back to Registration
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-lime-500 text-white rounded-xl font-semibold hover:from-green-700 hover:to-lime-600 transition-all"
              >
                Retry After Confirming Email
              </button>
            </div>
          </div>
        </div>
      )
    }

    // No user or organization issue (after email confirmation)
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-lime-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Account Setup Issue
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your account or organization wasn't created properly. Please try registering again.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-400 text-left">
                <strong>Error:</strong> {error}
              </div>
            )}
            <div className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Check the browser console (F12) for detailed error messages.
            </div>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/register'}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-lime-500 text-white rounded-xl font-semibold hover:from-green-700 hover:to-lime-600 transition-all"
            >
              Back to Registration
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
            >
              Retry Setup
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleStartTrial = async () => {
    // Use currentOrganization if available, otherwise use first organization from array
    const orgToUse = currentOrganization || (organizations && organizations.length > 0 ? organizations[0] : null)

    if (!orgToUse?.id || !user?.id) {
      setError('Organization or user not found. Please try again.')
      return
    }

    setSelectedPlanType(selectedPlan)
    setIsCreating(true)
    setError(null)

    trackTrialStartAttempt(selectedPlan)
    trackTrialPlanSelect(selectedPlan, SUBSCRIPTION_PLANS[selectedPlan].pricePerHaYearHt)

    try {
      // Get the access token from authStore (this is where loginViaApi stores it)
      const accessToken = useAuthStore.getState().getAccessToken()
      if (!accessToken) {
        throw new Error('Not authenticated')
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/v1/subscriptions/trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Organization-Id': orgToUse.id,
        },
        body: JSON.stringify({
          organization_id: orgToUse.id,
          plan_type: selectedPlan,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to create trial subscription (${response.status})`)
      }

      const data = await response.json()

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to create trial subscription')
      }

      trackTrialStartSuccess(selectedPlan)

      // Ensure organization is saved to BOTH localStorage AND Zustand store
      // This is critical for API client to find the organization ID after page reload
      localStorage.setItem('currentOrganization', JSON.stringify(orgToUse))
      useOrganizationStore.getState().setCurrentOrganization({
        id: orgToUse.id,
        name: orgToUse.name,
        description: undefined,
        slug: orgToUse.slug || undefined,
        currency_code: orgToUse.currency || undefined,
        timezone: orgToUse.timezone || undefined,
        is_active: orgToUse.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      // Invalidate and refetch subscription query to ensure it's loaded before navigation
      await queryClient.invalidateQueries({ queryKey: ['subscription', orgToUse.id] })

      // Wait for React Query to refetch and update the cache
      await queryClient.refetchQueries({
        queryKey: ['subscription', orgToUse.id],
        type: 'active'
      })

      // Use window.location.href to force a full page reload and ensure provider re-evaluates
      // Redirect to onboarding flow, not dashboard
      window.location.href = '/onboarding'
    } catch (err) {
      console.error('Error creating trial subscription:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create trial subscription'
      setError(errorMessage)
      trackTrialStartFailure(selectedPlan, errorMessage)
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-lime-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4" data-testid="trial-selection-page">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2" data-testid="trial-page-title">
            Start Your Free Trial
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a plan to begin your 14-day free trial. No credit card required.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200/70 bg-red-50/90 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {(Object.keys(SUBSCRIPTION_PLANS) as PlanType[]).map((planType) => {
            const plan = SUBSCRIPTION_PLANS[planType]
            const isSelected = selectedPlan === planType
            const handlePlanClick = () => setSelectedPlan(planType)

            return (
              <div
                key={planType}
                data-testid={`plan-card-${planType}`}
                data-selected={isSelected}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-green-500 shadow-green-500/20'
                    : 'hover:shadow-xl'
                }`}
                onClick={handlePlanClick}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-green-600 to-lime-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Recommended
                    </span>
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-green-500 rounded-full p-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline mb-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {plan.pricePerHaYearHt} MAD
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">/ha/year HT</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {plan.description}
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Key Features:
                  </p>
                  {plan.features.slice(0, 4).map((feature, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-600 flex-shrink-0" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {feature}
                      </span>
                    </div>
                  ))}
                  {plan.features.length > 4 && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 ml-3.5">
                      +{plan.features.length - 4} more features
                    </p>
                  )}
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p>
                    • Hectares:{' '}
                    {plan.limits.maxHectaresInclusive
                      ? `up to ${plan.limits.maxHectaresInclusive}`
                      : `>${plan.limits.minHectaresExclusive || 0}`}
                  </p>
                  <p>
                    • Users:{' '}
                    {plan.limits.includedUsers === null
                      ? 'Unlimited'
                      : plan.limits.includedUsers}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center">
          <button
            onClick={handleStartTrial}
            disabled={isCreating}
            data-testid="start-trial-button"
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-lime-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:from-green-700 hover:to-lime-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isCreating ? (
              <span className="flex items-center space-x-2" data-testid="trial-creating">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Starting your trial...</span>
              </span>
            ) : (
              'Start Free 14-Day Trial'
            )}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}
