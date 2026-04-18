import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LegalPageLayout } from '@/components/legal/LegalPageLayout'
import { PrivacyPolicyContent } from '@/components/legal/PrivacyPolicyContent'
import { Shield } from 'lucide-react'

export const Route = createFileRoute('/(public)/privacy-policy')({
  component: PrivacyPolicyPage,
})

function PrivacyPolicyPage() {
  const { t } = useTranslation()

  const privacyToc = [
    { id: 'responsable', label: t('public.privacy.toc.responsable', 'Responsable') },
    { id: 'cadre-juridique', label: t('public.privacy.toc.cadreJuridique', 'Loi 09-08 & CNDP') },
    { id: 'donnees-collectees', label: t('public.privacy.toc.donneesCollectees', 'Données collectées') },
    { id: 'finalites', label: t('public.privacy.toc.finalites', 'Finalités') },
    { id: 'base-legale', label: t('public.privacy.toc.baseLegale', 'Fondements légaux') },
    { id: 'conservation', label: t('public.privacy.toc.conservation', 'Conservation') },
    { id: 'destinataires', label: t('public.privacy.toc.destinataires', 'Destinataires') },
    { id: 'transfert', label: t('public.privacy.toc.transfert', 'Transferts') },
    { id: 'securite', label: t('public.privacy.toc.securite', 'Sécurité') },
    { id: 'droits', label: t('public.privacy.toc.droits', 'Vos droits') },
    { id: 'violation', label: t('public.privacy.toc.violation', 'Violations') },
    { id: 'cookies', label: t('public.privacy.toc.cookies', 'Cookies') },
    { id: 'automatisation', label: t('public.privacy.toc.automatisation', 'Profilage') },
    { id: 'mineurs', label: t('public.privacy.toc.mineurs', 'Mineurs') },
    { id: 'modifications', label: t('public.privacy.toc.modifications', 'Évolution') },
    { id: 'contact', label: t('public.privacy.toc.contact', 'Contact') },
  ]

  return (
    <LegalPageLayout
      title={t('public.privacy.title', 'Politique de Confidentialité')}
      lastUpdated={t('public.privacy.lastUpdated', '30 mars 2026')}
      heroKicker={t('public.privacy.kicker', 'Confidentialité')}
      heroIcon={<Shield className="h-6 w-6" aria-hidden />}
      heroDescription={t('public.privacy.description', 'Vos données, vos droits, et nos engagements de conformité au Maroc (loi 09-08 / CNDP).')}
      toc={[...privacyToc]}
    >
      <PrivacyPolicyContent />
    </LegalPageLayout>
  )
}
