import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { TermsOfServiceContent } from '@/components/legal/TermsOfServiceContent'
import { ScrollText } from 'lucide-react'

export const Route = createFileRoute('/(public)/terms-of-service')({
  component: TermsOfServicePage,
})

function TermsOfServicePage() {
  const { t } = useTranslation()

  const termsToc = [
    { id: 'objet', label: t('public.terms.toc.objet', 'Objet') },
    { id: 'definitions', label: t('public.terms.toc.definitions', 'Définitions') },
    { id: 'inscription-compte', label: t('public.terms.toc.compte', 'Compte') },
    { id: 'services', label: t('public.terms.toc.services', 'Services') },
    { id: 'donnees-propriete', label: t('public.terms.toc.donnees', 'Données') },
    { id: 'obligations', label: t('public.terms.toc.obligations', 'Obligations') },
    { id: 'propriete-intellectuelle', label: t('public.terms.toc.pi', 'PI') },
    { id: 'abonnements', label: t('public.terms.toc.abonnements', 'Abonnements') },
    { id: 'responsabilite', label: t('public.terms.toc.responsabilite', 'Responsabilité') },
    { id: 'donnees-personnelles', label: t('public.terms.toc.donneesPerso', 'Données perso') },
    { id: 'resiliation', label: t('public.terms.toc.resiliation', 'Résiliation') },
    { id: 'droit-applicable', label: t('public.terms.toc.droitApplicable', 'Droit applicable') },
    { id: 'contact', label: t('public.terms.toc.contact', 'Contact') },
  ]

  return (
    <LegalPageLayout
      title={t('public.terms.title', "Conditions Générales d'Utilisation")}
      lastUpdated={t('public.terms.lastUpdated', '30 mars 2026')}
      heroKicker={t('public.terms.kicker', 'CGU')}
      heroIcon={<ScrollText className="h-6 w-6" aria-hidden />}
      heroDescription={t('public.terms.description', "Le cadre contractuel d'utilisation d'AgroGina : compte, services, responsabilités et contenus.")}
      toc={[...termsToc]}
    >
      <TermsOfServiceContent />
    </LegalPageLayout>
  )
}
