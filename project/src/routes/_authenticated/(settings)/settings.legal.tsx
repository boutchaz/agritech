import { createFileRoute } from '@tanstack/react-router'
import { FileText, Shield, ExternalLink } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/(settings)/settings/legal')({
  component: LegalSettings,
})

function LegalSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Mentions Légales</h2>
        <p className="mt-1 text-sm text-gray-500">
          Consultez nos conditions d'utilisation et notre politique de confidentialité.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="/terms-of-service"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">Conditions Générales d'Utilisation</h3>
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Règles d'utilisation de la plateforme AgroGina.
            </p>
            <p className="mt-2 text-xs text-gray-400">Dernière mise à jour : 30 mars 2026</p>
          </div>
        </a>

        <a
          href="/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start gap-4 rounded-xl border bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">Politique de Confidentialité</h3>
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Comment nous protégeons vos données personnelles et agricoles.
            </p>
            <p className="mt-2 text-xs text-gray-400">Dernière mise à jour : 30 mars 2026</p>
          </div>
        </a>
      </div>
    </div>
  )
}
