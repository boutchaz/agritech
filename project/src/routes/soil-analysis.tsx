import { createFileRoute, redirect } from '@tanstack/react-router'

// Redirect old soil-analysis route to new unified analyses route
export const Route = createFileRoute('/soil-analysis')({
  beforeLoad: () => {
    throw redirect({ to: '/analyses' })
  }
})
