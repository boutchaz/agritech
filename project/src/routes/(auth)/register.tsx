import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { AuthLayout } from '@/components/AuthLayout'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Checkbox } from '@/components/ui/checkbox'
import { signupViaApi, loginViaApi } from '@/lib/auth-api'
import { useAuth } from '@/hooks/useAuth'
import {
  trackRegisterAttempt,
  trackRegisterSuccess,
  trackRegisterFailure,
  trackPageView,
} from '@/lib/analytics'
import { Button } from '@/components/ui/button';
import { useSEO } from '@/hooks/useSEO';

export const Route = createFileRoute('/(auth)/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const { t } = useTranslation()
  useSEO({
    title: t('auth.register.title', 'Créer un compte'),
    description: t('seo.register.description', 'Créez votre compte AgroGina gratuitement et découvrez la plateforme de gestion agricole tout-en-un pour le Maroc.'),
    path: '/register',
    keywords: 'inscription agrogina, créer compte agriculture, logiciel agricole maroc',
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [includeDemoData, setIncludeDemoData] = useState(false)
  const [tosAccepted, setTosAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailExistsError, setEmailExistsError] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    trackPageView({ title: t('auth.register.title') })
  }, [t])

  useEffect(() => {
    if (user) {
      navigate({ to: '/dashboard' })
    }
  }, [user, navigate])

  if (user) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    trackRegisterAttempt()

    if (!tosAccepted) {
      setError(t('auth.register.errorTosRequired'))
      setIsLoading(false)
      trackRegisterFailure('tos_not_accepted')
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.register.errorPasswordMismatch'))
      setIsLoading(false)
      trackRegisterFailure('password_mismatch')
      return
    }

    try {
      const nameParts = organizationName.split(' ')
      const firstName = nameParts[0] || organizationName
      const lastName = nameParts.slice(1).join(' ') || 'User'

      const data = await signupViaApi({
        email,
        password,
        firstName,
        lastName,
        organizationName,
        includeDemoData,
      })

      await loginViaApi(email, password)

      if (data.organization?.id) {
        localStorage.setItem('currentOrganizationId', data.organization.id)
        localStorage.setItem('currentOrganization', JSON.stringify({
          id: data.organization.id,
          name: data.organization.name,
          slug: data.organization.slug,
          role: 'organization_admin',
          is_active: true
        }))
      }

      trackRegisterSuccess(includeDemoData)
      window.location.href = '/onboarding/select-trial'
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.register.errorGeneric')
      if (message.includes('already exists') || message.includes('already registered')) {
        if (organizationName) {
          sessionStorage.setItem('pendingOrgName', organizationName)
        }
        setEmailExistsError(true)
        trackRegisterFailure('email_already_exists')
      } else {
        setError(t('auth.register.errorGeneric'))
        trackRegisterFailure('registration_failed')
      }
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      helperText={t('auth.register.helperText')}
      switchLabel={t('auth.alreadyHaveAccount')}
      switchHref="/login"
      switchCta={t('auth.signIn.button')}
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormField
            label={t('auth.register.orgName')}
            htmlFor="organization"
            helper={t('auth.register.orgNameHelper')}
            required
          >
            <Input
              id="organization"
              name="organization"
              type="text"
              required
              placeholder={t('auth.register.orgNamePlaceholder')}
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              data-testid="register-organization"
              className="w-full rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </FormField>

          <FormField label={t('auth.emailAddress')} htmlFor="email-address" required>
            <Input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t('auth.register.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="register-email"
              className="w-full rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </FormField>

            <FormField
              label={t('auth.password')}
              htmlFor="password"
              helper={t('auth.register.passwordHelper')}
              required
            >
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              placeholder={t('auth.register.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="register-password"
              className="rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </FormField>

          <FormField label={t('auth.register.confirmPassword')} htmlFor="confirm-password" required>
            <PasswordInput
              id="confirm-password"
              name="confirm-password"
              autoComplete="new-password"
              required
              placeholder={t('auth.register.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="register-confirm-password"
              className="rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </FormField>

          <div className="flex items-start space-x-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <Checkbox
              id="demo-data"
              checked={includeDemoData}
              onCheckedChange={(checked) => setIncludeDemoData(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1 space-y-1">
              <label
                htmlFor="demo-data"
                className="text-sm font-medium text-slate-900 cursor-pointer"
              >
                {t('auth.register.demoDataLabel')}
              </label>
              <p className="text-xs text-slate-600">
                {t('auth.register.demoDataDescription')}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <Checkbox
              id="tos-accepted"
              checked={tosAccepted}
              onCheckedChange={(checked) => setTosAccepted(checked === true)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <label
                htmlFor="tos-accepted"
                className="text-sm text-slate-700 cursor-pointer"
              >
                <Trans
                  i18nKey="auth.register.tosLabel"
                  components={{
                    terms: (
                      <Link
                        to="/terms-of-service"
                        target="_blank"
                        className="font-medium text-emerald-600 underline hover:text-emerald-700"
                      />
                    ),
                    privacy: (
                      <Link
                        to="/privacy-policy"
                        target="_blank"
                        className="font-medium text-emerald-600 underline hover:text-emerald-700"
                      />
                    ),
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {emailExistsError && (
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/90 px-4 py-3 text-sm shadow-sm">
            <p className="text-amber-800 font-medium mb-2">
              {t('auth.register.errorEmailExistsTitle', 'This email is already registered.')}
            </p>
            <p className="text-amber-700 mb-3">
              {t('auth.register.errorEmailExistsAction', 'Sign in to your existing account and create a new organization.')}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-amber-300 bg-amber-100/50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
              onClick={() => navigate({ to: '/login', search: { redirect: '/onboarding/select-trial' } })}
            >
              {t('auth.register.signInToCreateOrg', 'Sign in & create organization')}
            </Button>
          </div>
        )}

        {error && !emailExistsError && (
          <div className="rounded-2xl border border-red-200/70 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || !tosAccepted}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-lime-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="register-submit"
        >
          {isLoading ? t('auth.register.creating') : t('auth.register.submit')}
        </Button>
      </form>
    </AuthLayout>
  )
}
