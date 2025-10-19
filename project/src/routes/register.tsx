import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState } from 'react'
import { AuthLayout } from '../components/AuthLayout'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
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

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      // Sign up the user with organization name in metadata
      // The backend trigger will automatically create profile and organization
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/select-trial`,
          data: {
            email_confirm: false,
            organization_name: organizationName,
          }
        }
      })

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          throw new Error('A user with this email already exists')
        }
        throw signUpError
      }

      if (authData.user) {
        // Check if email confirmation is required
        if (authData.user.identities && authData.user.identities.length === 0) {
          // Email confirmation is required - show message
          setShowEmailConfirmation(true)
          setIsLoading(false)
          return
        }

        // Email confirmation disabled or already confirmed - redirect to trial selection
        window.location.href = '/select-trial'
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred during registration')
    } finally {
      setIsLoading(false)
    }
  }

  // Show email confirmation message
  if (showEmailConfirmation) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="We've sent you a confirmation link"
        helperText={`Please check ${email} and click the link to confirm your account.`}
        switchLabel="Didn't receive the email?"
        switchHref="/register"
        switchCta="Try again"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            After confirming your email, you'll be redirected to select your free trial plan.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Make sure to check your spam folder if you don't see the email within a few minutes.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create your Agritech account"
      subtitle="Get started in minutes"
      helperText="Set up a workspace for your organization and invite your team once you're inside. You'll receive a confirmation email after signing up."
      switchLabel="Already have an account?"
      switchHref="/login"
      switchCta="Sign in"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <FormField
            label="Organization name"
            htmlFor="organization"
            helper="Use the name your team recognizes (e.g. farm, cooperative, or agribusiness)."
            required
          >
            <Input
              id="organization"
              name="organization"
              type="text"
              required
              placeholder="Green Acres Cooperative"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              data-testid="register-organization"
              className="w-full rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </FormField>

          <FormField label="Email address" htmlFor="email-address" required>
            <Input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@farm.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="register-email"
              className="w-full rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </FormField>

          <FormField
            label="Password"
            htmlFor="password"
            helper="Use at least 8 characters with a mix of letters and numbers."
            required
          >
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              required
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="register-password"
              className="rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </FormField>

          <FormField label="Confirm password" htmlFor="confirm-password" required>
            <PasswordInput
              id="confirm-password"
              name="confirm-password"
              autoComplete="new-password"
              required
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="register-confirm-password"
              className="rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </FormField>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200/70 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-lime-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="register-submit"
        >
          {isLoading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
    </AuthLayout>
  )
}
