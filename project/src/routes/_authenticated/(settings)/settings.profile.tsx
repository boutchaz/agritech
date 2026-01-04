import { createFileRoute } from '@tanstack/react-router'
import ProfileSettings from '@/components/ProfileSettings'

export const Route = createFileRoute('/_authenticated/(settings)/settings/profile')({
  component: ProfileSettings,
})