import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { BASE_MODULE_IDS, ERP_MODULES, isSubscriptionValid } from '@/lib/polar'
import { Check, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useOrganizationStore } from '@/stores/organizationStore'
import { useAuthStore } from '@/stores/authStore'
import { useOnboardingStore } from '@/stores/onboardingStore'
import {
  trackOnboardingStart,
  trackTrialStartAttempt,
  trackTrialStartSuccess,
  trackTrialStartFailure,
  trackPageView,
} from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/(public)/onboarding/select-trial')({
  component: SelectTrialPage,
})

const pollUntil = async <T,>(
  fn: () => Promise<T | null>,
  options: { interval?: number; maxAttempts?: number } = {}
): Promise<T | null> => {
  const { interval = 200, maxAttempts = 25 } = options

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await fn()
    if (result) {
      return result
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  return null
}

function useSetupStepLabels() {
  const { t } = useTranslation();
  return useMemo(() => [
    { id: 'auth' as const, label: t('onboarding.selectTrial.setupSteps.auth', 'Checking authentication...') },
    { id: 'organization' as const, label: t('onboarding.selectTrial.setupSteps.organization', 'Creating organization...') },
    { id: 'subscription' as const, label: t('onboarding.selectTrial.setupSteps.subscription', 'Activating trial...') },
    { id: 'complete' as const, label: t('onboarding.selectTrial.setupSteps.complete', 'Complete!') },
  ], [t]);
}

type SetupStepId = 'auth' | 'organization' | 'subscription' | 'complete'

function AgroGinaLogo({ className }: { className?: string }) {
  return (
    <picture>
      <source srcSet="/assets/logo.webp" type="image/webp" />
      <img src="/assets/logo.png" alt="AgroGina" className={className} />
    </picture>
  )
}

function SelectTrialPage() {
  const { t } = useTranslation();
  const navigate = useNavigate()
  const { currentOrganization, user, loading, refreshUserData, organizations } = useAuth()
  const orgForSub = currentOrganization || (organizations && organizations.length > 0 ? organizations[0] : null)
  const { data: subscription, isFetched: subscriptionFetched } = useSubscription(orgForSub ? { id: orgForSub.id, name: orgForSub.name } : null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupStep, setSetupStep] = useState<SetupStepId>('auth')
  const setupAttempted = useRef(false)
  const queryClient = useQueryClient()
  const setSelectedPlanType = useOnboardingStore((state) => state.setSelectedPlanType)

  const [selectedModules, setSelectedModules] = useState<string[]>(BASE_MODULE_IDS)
  const [modularHectares, setModularHectares] = useState<number>(50)

  const SETUP_STEPS = useSetupStepLabels();

  useEffect(() => {
    trackPageView({ title: t('onboarding.selectTrial.pageTitle', 'Start Your Free Trial') })
    trackOnboardingStart()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Block already-onboarded users — redirect when valid subscription exists
  useEffect(() => {
    if (subscriptionFetched && isSubscriptionValid(subscription)) {
      navigate({ to: '/' })
    }
  }, [subscription, subscriptionFetched, navigate])

  const hasOrganization = currentOrganization || (organizations && organizations.length > 0)

  useEffect(() => {
    if (hasOrganization && setupAttempted.current) {
      setupAttempted.current = false
    }
  }, [hasOrganization])

  useEffect(() => {
    const setupUserIfNeeded = async () => {
      if (setupAttempted.current) {
        return
      }

      if (!loading && user && !hasOrganization && !isSettingUp) {
        setupAttempted.current = true
        setIsSettingUp(true)
        setSetupStep('auth')
        try {
          const accessToken = await pollUntil(
            async () => {
              const token = useAuthStore.getState().getAccessToken()
              return token || null
            },
            { interval: 100, maxAttempts: 30 }
          )

          if (!accessToken) {
            setError(t('onboarding.selectTrial.errorAuthRequired', 'Authentication required. Please try logging in again.'))
            setupAttempted.current = false
            return
          }

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
            setError(t('onboarding.selectTrial.errorSetupFailed', 'Setup failed: {{error}}. Please try again or refresh the page.', { error: errorData.message || `Error ${response.status}` }))
            setupAttempted.current = false
            return
          }

          setSetupStep('subscription')
          await pollUntil(
            async () => {
              await refreshUserData()
              const orgs = useAuthStore.getState().organizations
              return orgs && orgs.length > 0 ? orgs[0] : null
            },
            { interval: 300, maxAttempts: 20 }
          )

          await refreshUserData()

          setSetupStep('complete')
        } catch (err) {
          setError(t('onboarding.selectTrial.errorSetupError', 'Setup error: {{error}}. Please try refreshing the page.', { error: err instanceof Error ? err.message : 'Unknown error' }))
          setupAttempted.current = false
        } finally {
          setIsSettingUp(false)
        }
      }
    }

    setupUserIfNeeded()
  }, [loading, user, hasOrganization, isSettingUp, refreshUserData, t])

  if (loading || isSettingUp) {
    const currentStepIndex = SETUP_STEPS.findIndex(s => s.id === setupStep)
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center p-4 overflow-hidden" data-testid="trial-loading">
        <div className="text-center max-w-sm">
          <AgroGinaLogo className="h-10 mx-auto mb-6" />
          <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto mb-5" data-testid="loading-spinner" />
          <p className="text-foreground font-medium text-sm mb-4">
            {isSettingUp ? t('onboarding.selectTrial.settingUpAccount', 'Setting up your account...') : t('onboarding.selectTrial.loadingAccount', 'Loading your account...')}
          </p>
          {isSettingUp && (
            <div className="space-y-2 text-left inline-block">
              {SETUP_STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-center gap-2 text-sm transition-opacity',
                    index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground opacity-60',
                  )}
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

  const isEmailConfirmed = user?.email_confirmed_at !== null && user?.email_confirmed_at !== undefined

  if (!loading && !isSettingUp && (!user || !hasOrganization)) {
    if (user && !isEmailConfirmed) {
      return (
        <div className="h-[100dvh] bg-background flex items-center justify-center p-4 overflow-hidden">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <div className="text-center mb-5">
                <AgroGinaLogo className="h-9 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-1">
                  {t('onboarding.selectTrial.confirmEmail.title', 'Confirm Your Email')}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('onboarding.selectTrial.confirmEmail.message', 'Your account has been created successfully, but you need to confirm your email address before you can activate your account.')}
                </p>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-3 text-left">
                  <p className="text-xs font-medium text-foreground mb-1">
                    {t('onboarding.selectTrial.confirmEmail.checkEmail', 'Check Your Email')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('onboarding.selectTrial.confirmEmail.sentTo', "We've sent a confirmation email to <strong>{{email}}</strong>. Please click the link in the email to confirm your account.", { email: user.email })}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('onboarding.selectTrial.confirmEmail.spamNote', "Make sure to check your spam folder if you don't see the email within a few minutes.")}
                </p>
                {error && (
                  <div className="mb-3 p-2.5 bg-destructive/10 rounded-lg text-xs text-destructive text-left">
                    <strong>{t('onboarding.selectTrial.confirmEmail.noteLabel', 'Note:')}</strong> {error}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => window.location.reload()} className="w-full">
                  {t('onboarding.selectTrial.confirmEmail.retryAfterConfirm', 'Retry After Confirming Email')}
                </Button>
                <Button variant="secondary" onClick={() => window.location.href = '/register'} className="w-full">
                  {t('onboarding.selectTrial.confirmEmail.backToRegistration', 'Back to Registration')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center p-4 overflow-hidden">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <div className="text-center mb-5">
              <AgroGinaLogo className="h-9 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-1">
                {t('onboarding.selectTrial.accountSetupIssue.title', 'Account Setup Issue')}
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                {t('onboarding.selectTrial.accountSetupIssue.message', "Your account or organization wasn't created properly. Please try registering again.")}
              </p>
              {error && (
                <div className="mb-3 p-2.5 bg-destructive/10 rounded-lg text-xs text-destructive text-left">
                  <strong>{t('onboarding.selectTrial.accountSetupIssue.errorLabel', 'Error:')}</strong> {error}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.href = '/register'} className="w-full">
                {t('onboarding.selectTrial.accountSetupIssue.backToRegistration', 'Back to Registration')}
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()} className="w-full">
                {t('onboarding.selectTrial.accountSetupIssue.retrySetup', 'Retry Setup')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const toggleModule = (moduleId: string) => {
    if (BASE_MODULE_IDS.includes(moduleId)) return
    setSelectedModules(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    )
  }

  const handleStartTrial = async () => {
    const orgToUse = currentOrganization || (organizations && organizations.length > 0 ? organizations[0] : null)

    if (!orgToUse?.id || !user?.id) {
      setError(t('onboarding.selectTrial.errorOrgNotFound', 'Organization or user not found. Please try again.'))
      return
    }

    setSelectedPlanType('standard')
    setIsCreating(true)
    setError(null)

    trackTrialStartAttempt('standard')

    try {
      const accessToken = useAuthStore.getState().getAccessToken()
      if (!accessToken) {
        throw new Error('Not authenticated')
      }

      const body: Record<string, unknown> = {
        organization_id: orgToUse.id,
        plan_type: 'standard',
        selected_modules: selectedModules,
        contracted_hectares: modularHectares,
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const response = await fetch(`${apiUrl}/api/v1/subscriptions/trial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-Organization-Id': orgToUse.id,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to create trial subscription (${response.status})`)
      }

      const data = await response.json()

      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to create trial subscription')
      }

      trackTrialStartSuccess('standard')

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
      await queryClient.invalidateQueries({ queryKey: ['subscription', orgToUse.id] })

      await queryClient.refetchQueries({
        queryKey: ['subscription', orgToUse.id],
        type: 'active'
      })

      if (selectedModules.length > 0) {
        const moduleMap: Record<string, boolean> = {}
        selectedModules.forEach((id) => { moduleMap[id] = true })
        useOnboardingStore.getState().updateModuleSelection(moduleMap)
        useOnboardingStore.getState().setCurrentStep(5)
        useOnboardingStore.getState().persistState({ currentStep: 5 }).catch(() => {})
        window.location.href = '/onboarding/complete'
        return
      }

      window.location.href = '/onboarding'
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('onboarding.selectTrial.errorTrialFailed', 'Failed to create trial subscription')
      setError(errorMessage)
      trackTrialStartFailure('standard', errorMessage)
      setIsCreating(false)
    }
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden" data-testid="trial-selection-page">
      <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <AgroGinaLogo className="h-8" />
          <Badge variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-transparent">
            {t('onboarding.selectTrial.freeTrialBadge', '14-day FREE trial')}
          </Badge>
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-6xl mx-auto w-full px-6 py-4 flex flex-col gap-4">
        <div className="shrink-0 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="trial-page-title">
            {t('onboarding.selectTrial.pageTitle', 'Start Your Free Trial')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('onboarding.selectTrial.pageSubtitle', '14-day free trial. No credit card required.')}
          </p>
        </div>

        {error && (
          <div className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 flex flex-col min-h-0">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              {t('onboarding.selectTrial.modulesHeading', 'ERP Modules')}
            </h3>
            <div className="flex-1 min-h-0 grid grid-cols-2 md:grid-cols-3 gap-2 content-start">
              {ERP_MODULES.map(mod => {
                const isSelected = selectedModules.includes(mod.id)
                const isBase = mod.isBase
                return (
                  <button
                    type="button"
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    disabled={isBase}
                    className={cn(
                      'text-left rounded-lg border p-2.5 transition-all',
                      isBase
                        ? 'border-primary/30 bg-primary/5 cursor-default'
                        : isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-accent/40',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-foreground leading-tight">{mod.name}</div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{mod.desc}</p>
                        {isBase && (
                          <span className="inline-block mt-1 text-[10px] font-medium text-primary">
                            {t('onboarding.selectTrial.includedLabel', 'Included')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div>
                  <label className="text-sm font-semibold text-foreground">
                    {t('onboarding.selectTrial.hectaresLabel', 'Hectares')}
                  </label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Input
                      type="number"
                      min={1}
                      value={modularHectares}
                      onChange={e => setModularHectares(Math.max(1, Number(e.target.value) || 1))}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">ha</span>
                  </div>
                </div>
                <div className="border-t border-border pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('onboarding.selectTrial.modulesLabel', 'Modules')}</span>
                    <span className="font-semibold text-foreground">
                      {t('onboarding.selectTrial.modulesSelected', '{{count}} selected', { count: selectedModules.length })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    {t('onboarding.selectTrial.tailoredQuote', 'Pricing tailored to your farm size and modules — our team will contact you with a personalized quote.')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="mt-auto">
              <Button
                onClick={handleStartTrial}
                disabled={isCreating}
                size="lg"
                data-testid="start-trial-button"
                className="w-full"
              >
                {isCreating ? (
                  <span className="flex items-center justify-center gap-2" data-testid="trial-creating">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{t('onboarding.selectTrial.startingTrial', 'Starting your trial...')}</span>
                  </span>
                ) : (
                  t('onboarding.selectTrial.startButton', 'Start Free 14-Day Trial')
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {t('onboarding.selectTrial.noCreditCard', 'No credit card required. Cancel anytime.')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
