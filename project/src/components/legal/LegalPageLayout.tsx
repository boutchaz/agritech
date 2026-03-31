import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

interface LegalPageLayoutProps {
  title: string
  lastUpdated: string
  children: import('react').ReactNode
}

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l'accueil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-gray-500">Dernière mise à jour : {lastUpdated}</p>
          <div className="mt-8 prose prose-gray max-w-none prose-headings:text-gray-900 prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-p:text-gray-600 prose-li:text-gray-600 prose-strong:text-gray-900">
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t bg-white py-6 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} AgroGina — CodeLovers, Maroc
      </footer>
    </div>
  )
}
