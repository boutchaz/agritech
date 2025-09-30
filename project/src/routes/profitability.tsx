import { createFileRoute } from '@tanstack/react-router'
import ProfitabilityDashboard from '../components/ProfitabilityDashboard'

export const Route = createFileRoute('/profitability')({
  component: ProfitabilityDashboard,
})