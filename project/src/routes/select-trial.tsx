import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { SUBSCRIPTION_PLANS, type PlanType } from '../lib/polar'
import { authSupabase } from '../lib/auth-supabase'
import { Check, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/select-trial')({
  component: SelectTrialPage,
})

function SelectTrialPage() {
  const { currentOrganization, user, loading, refreshUserData, organizations } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('professional')
  const [error, setError] = useState<string | null>(null)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const setupAttempted = useRef(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Use organizations array as fallback if currentOrganization isn't set yet
  const hasOrganization = currentOrganization || (organizations && organizations.length > 0)

  // Reset setup attempt when organization is successfully loaded
  useEffect(() => {
    if (hasOrganization && setupAttempted.current) {
      console.log('✅ Organization loaded, resetting setup attempt flag')
      setupAttempted.current = false
    }
  }, [hasOrganization])

  // If user exists but no organization, call Edge Function to set it up
  useEffect(() => {
    const setupUserIfNeeded = async () => {
      // Prevent multiple attempts
      if (setupAttempted.current) {
        console.log('⏸️ Setup already attempted, skipping...')
        return
      }
      
      if (!loading && user && !hasOrganization && !isSettingUp) {
        setupAttempted.current = true
        setIsSettingUp(true)
        try {
          console.log('🔄 Setting up user organization...', { userId: user.id, email: user.email })
          
          // Wait a moment for session to be available
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Get organization name from user metadata or use default
          const orgName = user.user_metadata?.organization_name || `${user.email?.split('@')[0] || 'User'}'s Organization`
          
          console.log('📞 Calling Edge Function with:', {
            userId: user.id,
            email: user.email,
            organizationName: orgName
          })

          // Use Supabase client to call Edge Function (handles auth automatically)
          const { data, error } = await authSupabase.functions.invoke('on-user-created', {
            body: {
              id: user.id,
              email: user.email,
              raw_user_meta_data: {
                organization_name: orgName,
                allow_unconfirmed_setup: true,
                ...user.user_metadata,
              },
            },
          })

          if (error) {
            console.error('❌ Edge Function error:', error)
            console.error('❌ Edge Function error details:', JSON.stringify(error, null, 2))
            setError(`Setup failed: ${error.message || 'Unknown error'}. Please try again or refresh the page.`)
            setupAttempted.current = false // Allow retry on error
            return
          }

          console.log('✅ Edge Function setup completed:', data)
          console.log('✅ Edge Function response:', JSON.stringify(data, null, 2))
          
          // Wait a moment for database to sync
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          // Wait a bit more for database transaction to complete
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Force a refetch by directly querying the organization_users table first
          // This ensures we get the latest data even if React Query cache hasn't updated
          let orgFound = false
          try {
            const { data: orgUsers, error: checkError } = await authSupabase
              .from('organization_users')
              .select('organization_id, organizations(id, name, slug)')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle()
            
            if (checkError) {
              console.error('❌ Error checking organization:', checkError)
            } else if (orgUsers?.organization_id) {
              console.log('✅ Organization found after creation:', orgUsers.organization_id)
              orgFound = true
            } else {
              console.warn('⚠️ Organization not found in database yet, waiting...')
            }
          } catch (checkErr) {
            console.error('❌ Error checking organization:', checkErr)
          }
          
          // Always refresh user data to ensure React Query cache is updated
          console.log('🔄 Refreshing user data to load organization...')
          await refreshUserData()
          
          // Wait for React Query to update and component to re-render
          // The organizations array should now be populated
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          // Double-check that organization exists by querying again
          if (!orgFound) {
            console.log('⏳ Organization not found initially, checking again...')
            const { data: retryOrgUsers } = await authSupabase
              .from('organization_users')
              .select('organization_id')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .limit(1)
              .maybeSingle()
            
            if (retryOrgUsers?.organization_id) {
              console.log('✅ Organization found on retry:', retryOrgUsers.organization_id)
              // One more refresh to ensure it's loaded
              await refreshUserData()
              await new Promise(resolve => setTimeout(resolve, 1000))
            } else {
              console.warn('⚠️ Organization still not found after retry')
            }
          }

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
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-lime-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          {isSettingUp ? 'Setting up your account...' : 'Loading your account...'}
        </p>
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
                    http://localhost:5173/select-trial
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

    setIsCreating(true)
    setError(null)

    try {
      // Call Edge Function to create trial subscription (bypasses RLS)
      const { data, error: functionError } = await authSupabase.functions.invoke('create-trial-subscription', {
        body: {
          organization_id: orgToUse.id,
          plan_type: selectedPlan,
        },
      })

      if (functionError) {
        throw new Error(functionError.message || 'Failed to create trial subscription')
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to create trial subscription')
      }

      console.log('✅ Trial subscription created:', data.subscription)

      // Invalidate subscription query to force refetch
      await queryClient.invalidateQueries({ queryKey: ['subscription', orgToUse.id] })
      
      // Wait a moment for database to sync
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Refetch subscription to ensure it's loaded
      await queryClient.refetchQueries({ queryKey: ['subscription', orgToUse.id] })
      
      // Wait for refetch to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // Use React Router navigation instead of window.location.href to preserve state
      navigate({ to: '/dashboard' })
    } catch (err) {
      console.error('Error creating trial subscription:', err)
      setError(err instanceof Error ? err.message : 'Failed to create trial subscription')
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-lime-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
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
            const isEnterprise = planType === 'enterprise'

            return (
              <div
                key={planType}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-green-500 shadow-green-500/20'
                    : 'hover:shadow-xl'
                } ${isEnterprise ? 'opacity-60' : ''}`}
                onClick={() => !isEnterprise && setSelectedPlan(planType)}
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
                      {plan.price}
                    </span>
                    {plan.priceAmount > 0 && (
                      <span className="text-gray-600 dark:text-gray-400 ml-2">/month</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {plan.description}
                  </p>
                </div>

                {isEnterprise && (
                  <div className="mb-4 text-sm text-amber-600 dark:text-amber-400">
                    Trial not available. Contact sales to get started.
                  </div>
                )}

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
                  <p>• {plan.limits.farms === 999999 ? '∞' : plan.limits.farms} Farms</p>
                  <p>• {plan.limits.parcels === 999999 ? '∞' : plan.limits.parcels} Parcels</p>
                  <p>• {plan.limits.users === 999999 ? '∞' : plan.limits.users} Users</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center">
          <button
            onClick={handleStartTrial}
            disabled={isCreating || selectedPlan === 'enterprise'}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-lime-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:from-green-700 hover:to-lime-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isCreating ? (
              <span className="flex items-center space-x-2">
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
