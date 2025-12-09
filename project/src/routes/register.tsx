import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState } from 'react'
import { AuthLayout } from '../components/AuthLayout'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { authSupabase } from '../lib/auth-supabase'
import { useAuth } from '../hooks/useAuth'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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
      // Starting user signup via NestJS API

      // Extract first and last name from organization name
      const nameParts = organizationName.split(' ')
      const firstName = nameParts[0] || organizationName
      const lastName = nameParts.slice(1).join(' ') || 'User'

      // Call NestJS signup endpoint
      const response = await fetch(`${apiUrl}/api/v1/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          organizationName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('❌ Signup error:', data)

        if (response.status === 409 || data.message?.includes('already exists') || data.message?.includes('already registered')) {
          throw new Error('A user with this email already exists')
        }

        throw new Error(data.message || 'An error occurred during registration')
      }

      // Signup successful - now sign in with Supabase directly
      console.log('✅ User created, signing in with Supabase...')

      // Sign in with Supabase to get session
      const { data: signInData, error: signInError } = await authSupabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError || !signInData.session) {
        console.error('❌ Sign in error after signup:', signInError)
        throw new Error('Account created but failed to sign in. Please try logging in.')
      }

      console.log('✅ Signed in successfully')

      // Store organization ID and data for later use
      if (data.organization?.id) {
        localStorage.setItem('currentOrganizationId', data.organization.id)

        // Store organization data to help with initial load
        localStorage.setItem('currentOrganization', JSON.stringify({
          id: data.organization.id,
          name: data.organization.name,
          slug: data.organization.slug,
          role: 'organization_admin',
          is_active: true
        }))
      }

      // Redirect to trial selection
      window.location.href = '/select-trial'
    } catch (error) {
      console.error('❌ Registration error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred during registration')
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
