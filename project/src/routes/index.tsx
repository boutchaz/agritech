import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    // Check if user is authenticated and redirect accordingly
    const { user } = context.auth || {}
    if (user) {
      throw redirect({
        to: '/dashboard',
      })
    }
  },
  component: HomePage,
})

function HomePage() {
  const { user } = useAuth()

  // If user is logged in, redirect to dashboard
  if (user) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          AgroSmart Dashboard
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Modern farm management platform for sustainable agriculture
        </p>
        <div className="space-x-4">
          <Link
            to="/login"
            className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="inline-block bg-white text-green-600 border-2 border-green-600 px-8 py-3 rounded-lg hover:bg-green-50 transition-colors font-semibold"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  )
}