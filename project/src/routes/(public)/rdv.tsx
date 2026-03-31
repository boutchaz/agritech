import { createFileRoute } from '@tanstack/react-router'
import { RdvRequestPage } from '@/components/public/RdvRequestPage'

export const Route = createFileRoute('/(public)/rdv')({
  component: RdvPage,
})

function RdvPage() {
  return (
    <RdvRequestPage
      badgeText="Rendez-vous · Démo"
      title="Réservez une démonstration d’AGROGINA"
      subtitle="Dites-nous ce que vous cultivez et choisissez un créneau. Notre équipe vous recontacte rapidement pour confirmer."
    />
  )
}

