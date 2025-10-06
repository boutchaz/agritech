import { Link, createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'
import { AuthLayout } from '../components/AuthLayout'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError('Please enter the email associated with your account.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })

      if (resetError) {
        throw resetError
      }

      setIsSubmitted(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to send a reset link right now. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We all forget sometimes"
      helperText="Enter the email you use for Agritech and we will send you a link to create a new password."
      switchLabel="Remembered it?"
      switchHref="/login"
      switchCta="Go back to sign in"
    >
      {isSubmitted ? (
        <div className="space-y-6" role="status" aria-live="polite">
          <div className="space-y-3 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/95 to-lime-50/90 px-5 py-5 text-sm text-emerald-900 shadow-lg shadow-emerald-500/10">
            <p className="text-base font-semibold text-emerald-800">Check your inbox</p>
            <p>
              We sent a secure password reset link to <span className="font-semibold">{email}</span>. Follow the instructions within the next 24 hours to choose a new password.
            </p>
            <p className="text-emerald-700/80">
              Didn’t receive anything? Remember to check spam or request another email below.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                setIsSubmitted(false)
                setError(null)
                setIsLoading(false)
              }}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-lime-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              Send another email
            </button>
            <Link
              to="/login"
              className="flex w-full items-center justify-center rounded-xl border border-emerald-500/30 bg-white/90 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-500 hover:text-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              Return to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormField
              label="Email address"
              htmlFor="reset-email"
              helper="Use the email connected to your Agritech account."
              required
            >
              <Input
                id="reset-email"
                name="reset-email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@farm.co"
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-lime-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Sending reset link...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthLayout>
  )
}
