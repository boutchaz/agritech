import { createFileRoute } from '@tanstack/react-router'
import ProfileSettings from '../components/ProfileSettings'

export const Route = createFileRoute('/settings/profile')({
  component: ProfileSettings,
})