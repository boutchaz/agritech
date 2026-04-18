import { createFileRoute } from '@tanstack/react-router'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { PrivacyPolicyContent } from '@/components/legal/PrivacyPolicyContent'
import { Shield } from 'lucide-react'

export const Route = createFileRoute('/(public)/privacy-policy')({
  component: PrivacyPolicyPage,
})

const privacyToc = [
  { id: 'responsable', label: 'Responsable' },
  { id: 'cadre-juridique', label: 'Loi 09-08 & CNDP' },
  { id: 'donnees-collectees', label: 'Données collectées' },
  { id: 'finalites', label: 'Finalités' },
  { id: 'base-legale', label: 'Fondements légaux' },
  { id: 'conservation', label: 'Conservation' },
  { id: 'destinataires', label: 'Destinataires' },
  { id: 'transfert', label: 'Transferts' },
  { id: 'securite', label: 'Sécurité' },
  { id: 'droits', label: 'Vos droits' },
  { id: 'violation', label: 'Violations' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'automatisation', label: 'Profilage' },
  { id: 'mineurs', label: 'Mineurs' },
  { id: 'modifications', label: 'Évolution' },
  { id: 'contact', label: 'Contact' },
] as const

function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Politique de Confidentialité"
      lastUpdated="30 mars 2026"
      heroKicker="Confidentialité"
      heroIcon={<Shield className="h-6 w-6" aria-hidden />}
      heroDescription="Vos données, vos droits, et nos engagements de conformité au Maroc (loi 09-08 / CNDP)."
      toc={[...privacyToc]}
    >
      <PrivacyPolicyContent />
    </LegalPageLayout>
  )
}
