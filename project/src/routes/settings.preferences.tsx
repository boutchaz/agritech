import { createFileRoute } from '@tanstack/react-router'
import PreferencesSettings from '../components/PreferencesSettings'

export const Route = createFileRoute('/settings/preferences')({
  component: PreferencesSettings,
})