import { createFileRoute } from '@tanstack/react-router'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { TermsOfServiceContent } from '@/components/legal/TermsOfServiceContent'
import { ScrollText } from 'lucide-react'

export const Route = createFileRoute('/(public)/terms-of-service')({
  component: TermsOfServicePage,
})

function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title="Conditions Générales d'Utilisation"
      lastUpdated="30 mars 2026"
      heroKicker="CGU"
      heroIcon={<ScrollText className="h-6 w-6" aria-hidden />}
      heroDescription="Le cadre contractuel d'utilisation d'AgroGina : compte, services, responsabilités et contenus."
    >
      <TermsOfServiceContent />
    </LegalPageLayout>
  )
}
