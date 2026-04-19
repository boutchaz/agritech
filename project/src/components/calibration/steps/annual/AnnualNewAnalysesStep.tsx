import { Droplets, FlaskRound, Leaf, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAnnualNewAnalyses } from '@/hooks/useAnnualRecalibration';

interface AnnualNewAnalysesStepProps {
  parcelId: string;
  onContinueIfNone: () => void;
}

type AnalysisKind = 'soil' | 'water' | 'foliar';

interface AnalysisConfig {
  key: AnalysisKind;
  label: string;
  icon: ReactNode;
  hasNew: boolean;
  date?: string;
}

interface NewAnalysesWithMetadata {
  soil_date?: string;
  water_date?: string;
  foliar_date?: string;
}

function formatDate(date?: string): string {
  if (!date) return 'date non disponible';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function isFoliarOutsideJuly(date?: string): boolean {
  if (!date) {
    return false;
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return parsedDate.getMonth() !== 6;
}

function analysisFormLink(parcelId: string, type: AnalysisKind): string {
  const mappedType = type === 'foliar' ? 'plant' : type;
  return `/parcels/${parcelId}/analyse?type=${mappedType}&returnTo=stay`;
}

export function AnnualNewAnalysesStep({ parcelId, onContinueIfNone }: AnnualNewAnalysesStepProps) {
  const { t } = useTranslation();
  const { data: analyses, isLoading } = useAnnualNewAnalyses(parcelId);

  const metadata = (analyses ?? {}) as NewAnalysesWithMetadata;

  const analysisCards: AnalysisConfig[] = [
    {
      key: 'soil',
      label: 'sol',
      icon: <FlaskRound className="h-4 w-4 text-amber-600" />,
      hasNew: analyses?.new_soil ?? false,
      date: metadata.soil_date,
    },
    {
      key: 'water',
      label: 'eau',
      icon: <Droplets className="h-4 w-4 text-blue-600" />,
      hasNew: analyses?.new_water ?? false,
      date: metadata.water_date,
    },
    {
      key: 'foliar',
      label: 'foliaire',
      icon: <Leaf className="h-4 w-4 text-green-600" />,
      hasNew: analyses?.new_foliar ?? false,
      date: metadata.foliar_date,
    },
  ];

  const hasNoNewAnalyses = analysisCards.every((analysis) => !analysis.hasNew);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Recherche de nouvelles analyses en cours...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Avez-vous realise de nouvelles analyses cette annee (sol, eau ou foliaire) dont les resultats ne sont pas
        encore dans le systeme?
      </p>

      <div className="space-y-3">
        {analysisCards.map((analysis) => {
          const showFoliarWarning = analysis.key === 'foliar' && isFoliarOutsideJuly(analysis.date);

          return (
            <div
              key={analysis.key}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {analysis.icon}
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Analyse {analysis.label}</p>
                </div>
              </div>

              {analysis.hasNew ? (
                <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                  Nouvelle analyse {analysis.label} detectee ({formatDate(analysis.date)}). Elle sera integree au
                  recalibrage.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Aucune nouvelle analyse detectee.</p>
                  <Button type="button" variant="outline" asChild>
                    <a href={analysisFormLink(parcelId, analysis.key)} target="_blank" rel="noreferrer">
                      {t('annualNewAnalysesStep.addNow')}
                    </a>
                  </Button>
                </div>
              )}

              {showFoliarWarning && (
                <div className="mt-3 rounded-md border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-2.5">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <TriangleAlert className="h-4 w-4" />
                    <p className="text-xs">Prelevement hors juillet - precision reduite</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasNoNewAnalyses && (
        <div className="flex justify-end">
          <Button type="button" onClick={onContinueIfNone} >
            Aucune nouvelle analyse - Continuer
          </Button>
        </div>
      )}
    </div>
  );
}
