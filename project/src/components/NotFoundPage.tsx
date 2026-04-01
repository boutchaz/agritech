import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 35%, rgba(74,222,128,0.12) 0%, transparent 50%), radial-gradient(circle at 75% 65%, rgba(45,90,61,0.1) 0%, transparent 50%)',
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-lg w-full">
        {/* Illustration — Flowbite open-source (MIT) */}
        <div className="flex justify-center mb-6">
          <img
            src="/assets/404-light.svg"
            alt=""
            aria-hidden
            className="h-44 sm:h-56 w-auto dark:hidden select-none"
            draggable={false}
          />
          <img
            src="/assets/404-dark.svg"
            alt=""
            aria-hidden
            className="h-44 sm:h-56 w-auto hidden dark:block select-none"
            draggable={false}
          />
        </div>

        {/* Message */}
        <h2 className="font-bold text-2xl sm:text-3xl text-gray-900 dark:text-white mb-3">
          {t('notFound.title', 'Page introuvable')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg mb-8 leading-relaxed max-w-md mx-auto">
          {t('notFound.description', "La page que vous cherchez n'existe pas ou a été déplacée.")}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold text-base gap-2 shadow-sm"
          >
            <Link to="/">
              <Home className="w-5 h-5" />
              {t('notFound.goHome', "Retour à l'accueil")}
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="font-semibold text-base gap-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
            {t('notFound.goBack', 'Page précédente')}
          </Button>
        </div>

        {/* Footer hint */}
        <p className="mt-10 text-gray-400 dark:text-gray-500 text-sm flex items-center justify-center gap-2">
          <Search className="w-4 h-4" />
          {t('notFound.hint', 'Vérifiez l\'URL ou utilisez la navigation')}
        </p>
      </div>
    </div>
  );
}
