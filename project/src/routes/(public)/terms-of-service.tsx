import { createFileRoute } from '@tanstack/react-router'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { TermsOfServiceContent } from '@/components/legal/TermsOfServiceContent'
import { ScrollText } from 'lucide-react'

export const Route = createFileRoute('/(public)/terms-of-service')({
  component: TermsOfServicePage,
})

const termsToc = [
  { id: 'objet', label: 'Objet' },
  { id: 'definitions', label: 'Définitions' },
  { id: 'inscription-compte', label: 'Compte' },
  { id: 'services', label: 'Services' },
  { id: 'donnees-propriete', label: 'Données' },
  { id: 'obligations', label: 'Obligations' },
  { id: 'propriete-intellectuelle', label: 'PI' },
  { id: 'abonnements', label: 'Abonnements' },
  { id: 'responsabilite', label: 'Responsabilité' },
  { id: 'donnees-personnelles', label: 'Données perso' },
  { id: 'resiliation', label: 'Résiliation' },
  { id: 'droit-applicable', label: 'Droit applicable' },
  { id: 'contact', label: 'Contact' },
] as const

function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title="Conditions Générales d'Utilisation"
      lastUpdated="30 mars 2026"
      heroKicker="CGU"
      heroIcon={<ScrollText className="h-6 w-6" aria-hidden />}
      heroDescription="Le cadre contractuel d'utilisation d'AgroGina : compte, services, responsabilités et contenus."
      toc={[...termsToc]}
    >
      <TermsOfServiceContent />
    </LegalPageLayout>
  )
}
