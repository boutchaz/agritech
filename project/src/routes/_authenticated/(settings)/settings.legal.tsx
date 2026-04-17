import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { FileText, Shield, ExternalLink } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/(settings)/settings/legal')({
  component: LegalSettings,
})

function LegalSettings() {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

  // Source-of-truth dates for the most recent updates of each document.
  // Replace with API-driven values when those documents move into a CMS.
  const TERMS_LAST_UPDATED = '2026-03-30'
  const PRIVACY_LAST_UPDATED = '2026-03-30'

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(
      i18n.language === 'fr' ? 'fr-FR' : isRTL ? 'ar-MA' : 'en-US',
      { day: 'numeric', month: 'long', year: 'numeric' },
    )

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('legal.title', 'Legal')}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('legal.subtitle', 'Review our terms of service and privacy policy.')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="/terms-of-service"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md dark:bg-gray-800 dark:border-gray-700"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {t('legal.terms.title', 'Terms of Service')}
              </h3>
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('legal.terms.description', 'Rules for using the AgroGina platform.')}
            </p>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {t('legal.lastUpdated', 'Last updated: {{date}}', { date: formatDate(TERMS_LAST_UPDATED) })}
            </p>
          </div>
        </a>

        <a
          href="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md dark:bg-gray-800 dark:border-gray-700"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {t('legal.privacy.title', 'Privacy Policy')}
              </h3>
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('legal.privacy.description', 'How we protect your personal and farm data.')}
            </p>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {t('legal.lastUpdated', 'Last updated: {{date}}', { date: formatDate(PRIVACY_LAST_UPDATED) })}
            </p>
          </div>
        </a>
      </div>
    </div>
  )
}
