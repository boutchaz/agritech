import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
import { setupNewUser } from '../utils/authSetup'

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
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            email_confirm: false
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
        // Setup new user with profile and organization using authSetup
        const setupResult = await setupNewUser({
          userId: authData.user.id,
          email: authData.user.email!,
          organizationName: organizationName,
        })

        if (!setupResult.success) {
          console.error('User setup failed:', setupResult.error)
          setError('Account created but setup incomplete. Please try logging in.')
          return
        }

        // Reload the page to ensure auth state is fresh and organization data is loaded
        // This prevents race conditions where MultiTenantAuthProvider queries before setup completes
        window.location.href = '/onboarding'
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred during registration')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <a
              href="/login"
              className="font-medium text-green-600 hover:text-green-500"
            >
              sign in to your existing account
            </a>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <FormField
              label="Organization Name"
              htmlFor="organization"
              required
              helper="Your farm or company name"
            >
              <Input
                id="organization"
                name="organization"
                type="text"
                required
                placeholder="Your farm or company name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                data-testid="register-organization"
              />
            </FormField>

            <FormField label="Email address" htmlFor="email-address" required>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="register-email"
              />
            </FormField>

            <FormField label="Password" htmlFor="password" required>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="register-password"
              />
            </FormField>

            <FormField label="Confirm Password" htmlFor="confirm-password" required>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="register-confirm-password"
              />
            </FormField>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              data-testid="register-submit"
            >
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
