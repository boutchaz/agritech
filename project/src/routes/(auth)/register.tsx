import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState, useEffect } from 'react'
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

export const Route = createFileRoute('/(auth)/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [includeDemoData, setIncludeDemoData] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Track page view on mount
  useEffect(() => {
    trackPageView({ title: 'Create your Agritech account' })
  }, [])

  // Redirect to dashboard if user is already logged in
  // Using useEffect to prevent infinite navigation loop
  useEffect(() => {
    if (user) {
      navigate({ to: '/dashboard' })
    }
  }, [user, navigate])

  // Don't render register form if user exists
  if (user) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    trackRegisterAttempt()

    if (password !== confirmPassword) {
      setError('Passwords do not match')
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
      const message = error instanceof Error ? error.message : 'An error occurred during registration'
      if (message.includes('already exists') || message.includes('already registered')) {
        setError('A user with this email already exists')
        trackRegisterFailure('email_already_exists')
      } else {
        setError(message)
        trackRegisterFailure(message)
      }
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create your Agritech account"
      subtitle="Get started in minutes"
      helperText="Set up a workspace for your organization and invite your team once you're inside."
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
                Create with demo data to explore features
              </label>
              <p className="text-xs text-slate-600">
                Pre-populate your account with sample farms, parcels, tasks, and invoices to quickly see how the platform works.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200/70 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-sm">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-lime-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="register-submit"
        >
          {isLoading ? 'Creating account...' : 'Sign up'}
        </Button>
      </form>
    </AuthLayout>
  )
}
