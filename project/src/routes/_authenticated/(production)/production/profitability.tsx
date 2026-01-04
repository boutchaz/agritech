import { createFileRoute } from '@tanstack/react-router'
import ProfitabilityDashboard from '@/components/ProfitabilityDashboard'

export const Route = createFileRoute('/_authenticated/(production)/production/profitability')({
  component: ProfitabilityDashboard,
})