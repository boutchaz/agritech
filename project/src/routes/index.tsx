import { createFileRoute, redirect } from '@tanstack/react-router'
import LandingPage from '../components/LandingPage'

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
  component: LandingPage,
})