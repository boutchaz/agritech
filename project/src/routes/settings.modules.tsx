import { createFileRoute } from '@tanstack/react-router'
import ModulesSettings from '../components/ModulesSettings'

export const Route = createFileRoute('/settings/modules')({
  component: ModulesSettings,
})