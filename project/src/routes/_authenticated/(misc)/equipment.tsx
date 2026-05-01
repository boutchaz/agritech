
import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/(misc)/equipment')({
  component: () => <Navigate to="/infrastructure" />,
})
