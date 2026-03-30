import { createFileRoute } from '@tanstack/react-router'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { TermsOfServiceContent } from '@/components/legal/TermsOfServiceContent'

export const Route = createFileRoute('/(public)/terms-of-service')({
  component: TermsOfServicePage,
})

function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title="Conditions Générales d'Utilisation"
      lastUpdated="30 mars 2026"
    >
      <TermsOfServiceContent />
    </LegalPageLayout>
  )
}
