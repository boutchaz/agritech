import { createFileRoute, useNavigate } from '@tanstack/react-router'
import React, { useState } from 'react'
import { AuthLayout } from '../components/AuthLayout'
import { FormField } from '../components/ui/FormField'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { authSupabase } from '../lib/auth-supabase'
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
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)
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
      // The Edge Function will be called directly after signup (bypassing triggers)
      console.log('📝 Starting user signup...', { email, organizationName })

      const emailRedirectUrl = new URL('/auth/callback', window.location.origin)
      emailRedirectUrl.searchParams.set('next', '/select-trial')

      const { data: authData, error: signUpError } = await authSupabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: emailRedirectUrl.toString(),
          data: {
            organization_name: organizationName,
            allow_unconfirmed_setup: true, // Allow Edge Function to setup even if email not confirmed
          }
        }
      })
      
      console.log('📝 Signup response:', { user: authData?.user?.id, error: signUpError?.message })

      if (signUpError) {
        console.error('❌ Signup error:', signUpError)
        console.error('❌ Signup error details:', JSON.stringify(signUpError, null, 2))
        console.error('❌ Signup error status:', signUpError.status)
        console.error('❌ Signup error message:', signUpError.message)
        
        if (signUpError.message?.includes('User already registered') || signUpError.message?.includes('already registered')) {
          throw new Error('A user with this email already exists')
        }
        
        // Handle 500 errors specifically - show actual error message
        if (signUpError.message?.includes('500') || signUpError.status === 500 || signUpError.message?.includes('Internal Server Error')) {
          const errorMsg = signUpError.message || 'Unknown server error'
          throw new Error(`Server error during registration: ${errorMsg}. Please check the Supabase dashboard logs.`)
        }
        
        // Show the actual error message to the user
        throw new Error(signUpError.message || 'An error occurred during registration')
      }

      if (authData.user) {
        // Call Edge Function directly to setup user (bypass trigger)
        // Wait a moment for session to be available (new users might need a moment)
        await new Promise(resolve => setTimeout(resolve, 500))
        
        let edgeFunctionCalled = false
        try {
          // Wait a bit more for session to be established
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          console.log('📞 Calling Edge Function to setup user...')
          
          // Use Supabase client to call Edge Function (handles auth automatically)
          const { data, error } = await authSupabase.functions.invoke('on-user-created', {
            body: {
              id: authData.user.id,
              email: authData.user.email,
              raw_user_meta_data: {
                organization_name: organizationName,
                allow_unconfirmed_setup: true,
                ...authData.user.user_metadata,
              },
            },
          })

          if (error) {
            console.error('❌ Edge Function error:', error)
            console.error('❌ Edge Function error details:', JSON.stringify(error, null, 2))
            // Continue anyway - select-trial page will retry if needed
          } else {
            console.log('✅ Edge Function setup completed:', data)
            edgeFunctionCalled = true
          }
        } catch (edgeError) {
          console.error('⚠️ Error calling Edge Function:', edgeError)
          // Continue anyway - select-trial page will retry if needed
        }
        
        // Wait a moment for Edge Function to complete if it was called
        if (edgeFunctionCalled) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

        // Check if email confirmation is required
        if (authData.user.identities && authData.user.identities.length === 0) {
          // Email confirmation is required
          setNeedsEmailConfirmation(true)
          setShowEmailConfirmation(true)
          setIsLoading(false)
          return
        }

        // Email confirmation disabled or already confirmed
        // Wait a moment for Edge Function to complete
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
        console.log('✅ Account created - showing activation message')
        
        // Show success message with activation instructions
        setNeedsEmailConfirmation(false)
        setShowEmailConfirmation(true) // Reuse this state to show activation message
        setIsLoading(false)
        
        // Redirect to trial selection after showing message for 3 seconds
        setTimeout(() => {
          window.location.href = '/select-trial'
        }, 3000) // Give user 3 seconds to see the message
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred during registration')
    } finally {
      setIsLoading(false)
    }
  }

  // Show email confirmation or account activation message
  if (showEmailConfirmation) {
    if (needsEmailConfirmation) {
      // Email confirmation required
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
            <div className="space-y-3">
              <p className="text-gray-600 dark:text-gray-400">
                After confirming your email, you'll be redirected to select your free trial plan.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  📋 Important: Activate Your Account
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-400">
                  After confirming your email, please visit{' '}
                  <a 
                    href="/select-trial" 
                    className="font-semibold underline hover:text-blue-600 dark:hover:text-blue-300"
                    onClick={(e) => {
                      e.preventDefault()
                      window.location.href = '/select-trial'
                    }}
                  >
                    http://localhost:5173/select-trial
                  </a>
                  {' '}to activate your account and select your free trial plan.
                </p>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Make sure to check your spam folder if you don't see the email within a few minutes.
              </p>
            </div>
          </div>
        </AuthLayout>
      )
    } else {
      // Account created, show activation message
      return (
        <AuthLayout
          title="Account Created Successfully!"
          subtitle="Your account is being set up"
          helperText="Please complete the activation process to start using your account."
          switchLabel="Already have an account?"
          switchHref="/login"
          switchCta="Sign in"
        >
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-3">
              <p className="text-gray-600 dark:text-gray-400">
                Your account has been created successfully. To activate your account, please visit:
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  📋 Activate Your Account
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-400 mb-3">
                  Go to{' '}
                  <a 
                    href="/select-trial" 
                    className="font-semibold underline hover:text-blue-600 dark:hover:text-blue-300 break-all"
                    onClick={(e) => {
                      e.preventDefault()
                      window.location.href = '/select-trial'
                    }}
                  >
                    http://localhost:5173/select-trial
                  </a>
                  {' '}to activate your account and select your free trial plan.
                </p>
                <button
                  onClick={() => window.location.href = '/select-trial'}
                  className="w-full mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Go to Activation Page
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                You will be redirected automatically in a few seconds...
              </p>
            </div>
          </div>
        </AuthLayout>
      )
    }
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
