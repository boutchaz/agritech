import { createFileRoute } from '@tanstack/react-router'
import DashboardSettings from '../components/DashboardSettings'

export const Route = createFileRoute('/settings/dashboard')({
  component: DashboardSettings,
})