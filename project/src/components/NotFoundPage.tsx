import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#111] to-[#1E1E1E] relative overflow-hidden">
      {/* Background radial gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 40%, rgba(30,136,229,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 60%, rgba(45,90,61,0.15) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-lg">
        {/* 404 number */}
        <div className="relative mb-8">
          <h1
            className="font-[Montserrat,sans-serif] font-extrabold text-[8rem] sm:text-[10rem] leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#4ade80] to-[#2D5A3D] select-none"
            style={{ textShadow: 'none' }}
          >
            404
          </h1>
          {/* Leaf decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 opacity-10">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="0.5" className="w-full h-full">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <h2 className="font-[Montserrat,sans-serif] font-bold text-2xl sm:text-3xl text-white mb-4">
          {t('notFound.title', 'Page introuvable')}
        </h2>
        <p className="text-[#a0aec0] text-lg mb-10 leading-relaxed">
          {t('notFound.description', "La page que vous cherchez n'existe pas ou a été déplacée.")}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="bg-[#2D5A3D] text-white hover:bg-[#1f3f2a] font-semibold text-base gap-2"
          >
            <Link to="/">
              <Home className="w-5 h-5" />
              {t('notFound.goHome', "Retour à l'accueil")}
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-[rgba(255,255,255,0.3)] text-white hover:bg-[rgba(255,255,255,0.1)] hover:border-white font-semibold text-base gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
            {t('notFound.goBack', 'Page précédente')}
          </Button>
        </div>

        {/* Footer hint */}
        <p className="mt-12 text-[#6b7280] text-sm flex items-center justify-center gap-2">
          <Search className="w-4 h-4" />
          {t('notFound.hint', 'Vérifiez l\'URL ou utilisez la navigation')}
        </p>
      </div>
    </div>
  );
}
