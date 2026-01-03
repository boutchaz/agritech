import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '../components/AuthLayout'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { loginViaApi, signInWithGoogle, signInWithGitHub } from '../lib/auth-api'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOAuthLoading, setIsOAuthLoading] = useState<'google' | 'github' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Redirect if already logged in
  if (user) {
    navigate({ to: '/dashboard' })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await loginViaApi(email, password)

      if (response?.user) {
        window.location.href = '/dashboard'
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('auth.errors.generic')
      setError(message.includes('Invalid') ? t('auth.errors.invalidCredentials') : message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsOAuthLoading('google')
    setError(null)
    try {
      await signInWithGoogle()
    } catch (error) {
      setError(error instanceof Error ? error.message : t('auth.errors.oauthFailed'))
      setIsOAuthLoading(null)
    }
  }

  const handleGitHubSignIn = async () => {
    setIsOAuthLoading('github')
    setError(null)
    try {
      await signInWithGitHub()
    } catch (error) {
      setError(error instanceof Error ? error.message : t('auth.errors.oauthFailed'))
      setIsOAuthLoading(null)
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
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isOAuthLoading !== null}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isOAuthLoading === 'google' ? (
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
          </button>

          <button
            type="button"
            onClick={handleGitHubSignIn}
            disabled={isLoading || isOAuthLoading !== null}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isOAuthLoading === 'github' ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            )}
            <span>{t('auth.continueWithGitHub')}</span>
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-slate-500">{t('auth.orContinueWith')}</span>
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

          <div className="flex justify-end text-sm">
            <Link
              to="/forgot-password"
              className="font-medium text-emerald-600 transition hover:text-emerald-500"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200/70 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isOAuthLoading !== null}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-lime-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t('auth.signingIn') : t('auth.signIn.button')}
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}
