import { createFileRoute } from '@tanstack/react-router'
import OrganizationSettings from '../components/OrganizationSettings'

export const Route = createFileRoute('/settings/organization')({
  component: OrganizationSettings,
})