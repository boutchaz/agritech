import React, { useState } from 'react';
import { HelpCircle, BookOpen, ChevronRight, Check, RotateCcw } from 'lucide-react';
import { useTour, TourId } from '@/contexts/TourContext';

interface TourInfo {
  id: TourId;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const AVAILABLE_TOURS: TourInfo[] = [
  {
    id: 'welcome',
    title: 'Visite de bienvenue',
    description: 'Découvrez l\'interface et la navigation',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'full-app',
    title: '🌟 Tour complet',
    description: 'Découvrez toute l\'application en une visite',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    description: 'Statistiques et aperçu général',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'farm-management',
    title: 'Gestion des fermes',
    description: 'Créez et gérez vos exploitations',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'parcels',
    title: 'Gestion des parcelles',
    description: 'Gérez vos cultures et parcelles',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'tasks',
    title: 'Gestion des tâches',
    description: 'Planifiez et suivez les travaux',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'workers',
    title: 'Gestion du personnel',
    description: 'Gérez votre équipe et les paiements',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'inventory',
    title: 'Gestion du stock',
    description: 'Suivez votre inventaire',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'harvests',
    title: 'Récoltes',
    description: 'Enregistrez et suivez vos récoltes',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'infrastructure',
    title: 'Infrastructures',
    description: 'Gérez bâtiments, puits et bassins',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'billing',
    title: 'Facturation',
    description: 'Devis, commandes et factures',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'accounting',
    title: 'Comptabilité',
    description: 'Journaux et rapports financiers',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'satellite',
    title: 'Analyse satellite',
    description: 'Surveillez la santé des cultures',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'reports',
    title: 'Rapports',
    description: 'Générez et exportez des rapports',
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    id: 'settings',
    title: 'Paramètres',
    description: 'Configurez votre organisation',
    icon: <BookOpen className="h-4 w-4" />,
  },
];

export const TourHelpButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { startTour, isTourCompleted, resetTour, resetAllTours, isRunning } = useTour();

  const handleStartTour = (tourId: TourId) => {
    setIsOpen(false);
    startTour(tourId);
  };

  const handleResetTour = async (e: React.MouseEvent, tourId: TourId) => {
    e.stopPropagation();
    await resetTour(tourId);
  };

  const handleResetAll = async () => {
    await resetAllTours();
  };

  if (isRunning) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 bg-emerald-50 border-b border-emerald-100">
            <h3 className="font-semibold text-emerald-800">Centre d'aide</h3>
            <p className="text-sm text-emerald-600 mt-1">
              Choisissez une visite guidée pour découvrir les fonctionnalités
            </p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {AVAILABLE_TOURS.map((tour) => {
              const completed = isTourCompleted(tour.id);
              
              return (
                <button
                  key={tour.id}
                  onClick={() => handleStartTour(tour.id)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-left"
                >
                  <div className={`p-2 rounded-lg ${completed ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                    {completed ? <Check className="h-4 w-4" /> : tour.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${completed ? 'text-emerald-700' : 'text-gray-800'}`}>
                        {tour.title}
                      </span>
                      {completed && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          Terminé
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{tour.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {completed && (
                      <button
                        onClick={(e) => handleResetTour(e, tour.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Recommencer cette visite"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <button
              onClick={handleResetAll}
              className="w-full text-sm text-gray-600 hover:text-gray-800 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser toutes les visites
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          p-4 rounded-full shadow-lg transition-all duration-300 
          ${isOpen 
            ? 'bg-gray-800 text-white rotate-45' 
            : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-110'
          }
        `}
        title="Aide et visites guidées"
      >
        <HelpCircle className="h-6 w-6" />
      </button>
    </div>
  );
};

export default TourHelpButton;
