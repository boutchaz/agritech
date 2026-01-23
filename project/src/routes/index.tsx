import { createFileRoute, redirect } from '@tanstack/react-router'
import LandingPage from '../components/LandingPage'
import { useAuthStore, waitForHydration } from '../stores/authStore'

export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    await waitForHydration()
    
    const contextUser = context.auth?.user
    const storeState = useAuthStore.getState()
    const storeUser = storeState.isAuthenticated ? storeState.user : null
    
    const user = contextUser || storeUser
    
    if (user) {
      throw redirect({
        to: '/dashboard',
      })
    }
  },
  component: LandingPage,
})