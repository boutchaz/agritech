import { Link, createFileRoute, useNavigate, redirect } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/components/AuthLayout'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { loginViaApi, signInWithGoogle } from '@/lib/auth-api'
import { useAuth } from '@/hooks/useAuth'
import {
  trackLoginAttempt,
  trackLoginSuccess,
  trackLoginFailure,
  trackPageView,
} from '@/lib/analytics'
import { useAuthStore, waitForHydration } from '@/stores/authStore'
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/(auth)/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || undefined,
  }),
  beforeLoad: async ({ context, search }) => {
    await waitForHydration()
    
    const contextUser = context.auth?.user
    const storeState = useAuthStore.getState()
    const storeUser = storeState.isAuthenticated ? storeState.user : null
    
    if (contextUser || storeUser) {
      const redirectTo = search.redirect || '/dashboard'
      throw redirect({ to: redirectTo })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isOAuthLoading, setIsOAuthLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { redirect: redirectTo } = Route.useSearch()

  // Track page view on mount
  useEffect(() => {
    trackPageView({ title: t('auth.signIn.title') })
  }, [t])

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate({ to: redirectTo || '/dashboard' })
    }
  }, [user, navigate, redirectTo])

  // Don't render login form if user exists
  if (user) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    trackLoginAttempt('email')

    try {
      const response = await loginViaApi(email, password, rememberMe)
      if (response?.user) {
        trackLoginSuccess('email')
        await new Promise(resolve => setTimeout(resolve, 100))
        window.location.href = redirectTo || '/dashboard'
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.errors.generic')
      const errorMessage = message.includes('Invalid') ? t('auth.errors.invalidCredentials') : message
      setError(errorMessage)
      trackLoginFailure('email', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsOAuthLoading(true)
    setError(null)
    trackLoginAttempt('google')

    try {
      await signInWithGoogle()
      trackLoginSuccess('google')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.errors.oauthFailed')
      setError(errorMessage)
      trackLoginFailure('google', errorMessage)
      setIsOAuthLoading(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.signIn.title')}
      subtitle={t('auth.signIn.subtitle')}
      helperText={t('auth.signIn.helperText')}
      switchLabel={t('auth.signIn.noAccount')}
      switchHref="/register"
      switchCta={t('auth.signIn.createAccount')}
      backHref="/"
      backLabel={t('auth.backToLanding')}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isOAuthLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isOAuthLoading ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            <span>{t('auth.continueWithGoogle')}</span>
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200/90" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 font-medium text-slate-600">{t('auth.orContinueWith')}</span>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormField label={t('auth.emailAddress')} htmlFor="email" required>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@farm.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </FormField>

            <FormField label={t('auth.password')} htmlFor="password" required>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder={t('auth.enterPassword')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </FormField>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
              />
              {t('auth.rememberMe', 'Remember me')}
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-emerald-600 transition hover:text-emerald-500 sm:self-auto sm:shrink-0"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200/70 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || isOAuthLoading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:from-emerald-700 hover:to-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t('auth.signingIn') : t('auth.signIn.button')}
          </Button>
        </form>
      </div>
    </AuthLayout>
  )
}
