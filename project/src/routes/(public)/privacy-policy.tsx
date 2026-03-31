import { createFileRoute } from '@tanstack/react-router'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { PrivacyPolicyContent } from '@/components/legal/PrivacyPolicyContent'

export const Route = createFileRoute('/(public)/privacy-policy')({
  component: PrivacyPolicyPage,
})

function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Politique de Confidentialité"
      lastUpdated="30 mars 2026"
    >
      <PrivacyPolicyContent />
    </LegalPageLayout>
  )
}
