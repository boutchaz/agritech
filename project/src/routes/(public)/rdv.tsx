import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { RdvRequestPage } from '@/components/public/RdvRequestPage'

export const Route = createFileRoute('/(public)/rdv')({
  component: RdvPage,
})

function RdvPage() {
  const { t } = useTranslation()

  return (
    <RdvRequestPage
      badgeText={t('public.rdv.badge', 'Rendez-vous · Démo')}
      title={t('public.rdv.title', "Réservez une démonstration d'AGROGINA")}
      subtitle={t('public.rdv.subtitle', "Dites-nous ce que vous cultivez et choisissez un créneau. Notre équipe vous recontacte rapidement pour confirmer.")}
    />
  )
}
