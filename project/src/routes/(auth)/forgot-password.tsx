import { Link, createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthLayout } from '@/components/AuthLayout'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/button';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const Route = createFileRoute('/(auth)/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError(t('auth.forgotPasswordPage.errorEmptyEmail', 'Please enter the email associated with your account.'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/auth/callback`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send reset email');
      }

      setIsSubmitted(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : t('auth.forgotPasswordPage.errorGeneric', 'Unable to send a reset link right now. Please try again later.'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.forgotPasswordPage.title', 'Reset your password')}
      subtitle={t('auth.forgotPasswordPage.subtitle', 'We all forget sometimes')}
      helperText={t('auth.forgotPasswordPage.helperText', 'Enter the email you use for AgroGina and we will send you a link to create a new password.')}
      switchLabel={t('auth.forgotPasswordPage.switchLabel', 'Remembered it?')}
      switchHref="/login"
      switchCta={t('auth.forgotPasswordPage.switchCta', 'Go back to sign in')}
    >
      {isSubmitted ? (
        <div className="space-y-6" role="status" aria-live="polite">
          <div className="space-y-3 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/95 to-lime-50/90 px-5 py-5 text-sm text-emerald-900 shadow-lg shadow-emerald-500/10">
            <p className="text-base font-semibold text-emerald-800">{t('auth.forgotPasswordPage.successTitle', 'Check your inbox')}</p>
            <p>
              {t('auth.forgotPasswordPage.successMessage', 'We sent a secure password reset link to {{email}}. Follow the instructions within the next 24 hours to choose a new password.', { email })}
            </p>
            <p className="text-emerald-700/80">
              {t('auth.forgotPasswordPage.successSpamNote', "Didn't receive anything? Remember to check spam or request another email below.")}
            </p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={() => {
                setIsSubmitted(false)
                setError(null)
                setIsLoading(false)
              }}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-lime-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              {t('auth.forgotPasswordPage.sendAnotherEmail', 'Send another email')}
            </Button>
            <Link
              to="/login"
              className="flex w-full items-center justify-center rounded-xl border border-emerald-500/30 bg-white/90 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-500 hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              {t('auth.forgotPasswordPage.returnToSignIn', 'Return to sign in')}
            </Link>
          </div>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormField
              label={t('auth.emailAddress', 'Email address')}
              htmlFor="reset-email"
              helper={t('auth.forgotPasswordPage.emailHelper', 'Use the email connected to your AgroGina account.')}
              required
            >
              <Input
                id="reset-email"
                name="reset-email"
                type="email"
                autoComplete="email"
                required
                placeholder={t('auth.forgotPasswordPage.emailPlaceholder', 'you@farm.co')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </FormField>
          </div>

          {error && (
            <div
              className="rounded-2xl border border-red-200/70 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-lime-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? t('auth.forgotPasswordPage.sendingResetLink', 'Sending reset link...') : t('auth.forgotPasswordPage.sendResetLink', 'Send reset link')}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
