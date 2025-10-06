import { createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { SUBSCRIPTION_PLANS, type PlanType } from '../lib/polar'
import { supabase } from '../lib/supabase'
import { Check, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/select-trial')({
  component: SelectTrialPage,
})

function SelectTrialPage() {
  const { currentOrganization, user } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('professional')
  const [error, setError] = useState<string | null>(null)

  const handleStartTrial = async () => {
    if (!currentOrganization?.id || !user?.id) {
      setError('Organization or user not found')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const plan = SUBSCRIPTION_PLANS[selectedPlan]

      // Calculate trial end date (14 days from now)
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 14)

      // Create trial subscription
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          organization_id: currentOrganization.id,
          plan_type: selectedPlan,
          status: 'trialing',
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndDate.toISOString(),
          max_farms: plan.limits.farms,
          max_parcels: plan.limits.parcels,
          max_users: plan.limits.users,
          max_satellite_reports: plan.limits.satelliteReports,
        })

      if (insertError) {
        throw insertError
      }

      // Redirect to dashboard
      window.location.href = '/dashboard'
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
