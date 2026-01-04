import { createFileRoute } from '@tanstack/react-router'
import PreferencesSettings from '@/components/PreferencesSettings'

export const Route = createFileRoute('/_authenticated/(settings)/settings/preferences')({
  component: PreferencesSettings,
})