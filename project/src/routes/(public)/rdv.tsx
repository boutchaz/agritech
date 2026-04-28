import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { RdvRequestPage } from '@/components/public/RdvRequestPage'
import { useSEO } from '@/hooks/useSEO'

export const Route = createFileRoute('/(public)/rdv')({
  component: RdvPage,
})

function RdvPage() {
  const { t } = useTranslation()
  useSEO({
    title: t('public.rdv.title', "Réservez une démonstration d'AGROGINA"),
    description: t('seo.rdv.description', "Réservez une démonstration gratuite d'AgroGina. Découvrez comment notre plateforme de gestion agricole peut optimiser votre exploitation."),
    path: '/rdv',
    keywords: 'démonstration agrogina, démo logiciel agricole, essai gratuit agriculture',
  })

  return (
    <RdvRequestPage
      badgeText={t('public.rdv.badge', 'Rendez-vous · Démo')}
      title={t('public.rdv.title', "Réservez une démonstration d'AGROGINA")}
      subtitle={t('public.rdv.subtitle', "Dites-nous ce que vous cultivez et choisissez un créneau. Notre équipe vous recontacte rapidement pour confirmer.")}
    />
  )
}
