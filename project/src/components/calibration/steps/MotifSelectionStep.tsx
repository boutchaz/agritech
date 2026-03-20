import {
  AlertTriangle,
  Beaker,
  Droplets,
  GitCompareArrows,
  Leaf,
  RefreshCcw,
  Sprout,
  Waves,
} from 'lucide-react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import type { RecalibrationMotif } from '@/components/calibration/RecalibrationWizard';

export interface RecalibrationMotifOption {
  value: RecalibrationMotif;
  label: string;
  description: string;
  blockUpdated: string;
  icon: typeof Waves;
}

export const RECALIBRATION_MOTIFS: RecalibrationMotifOption[] = [
  {
    value: 'water_source_change',
    label: "Changement source d'eau",
    description: "La source d'eau a change",
    blockUpdated: 'Analyse eau + irrigation',
    icon: Waves,
  },
  {
    value: 'irrigation_change',
    label: 'Changement systeme irrigation',
    description: "Le systeme d'irrigation a change",
    blockUpdated: "Parametres d'irrigation",
    icon: Droplets,
  },
  {
    value: 'new_soil_analysis',
    label: 'Nouvelle analyse sol',
    description: 'Une nouvelle analyse de sol est disponible',
    blockUpdated: 'Bloc analyse sol',
    icon: Sprout,
  },
  {
    value: 'new_water_analysis',
    label: 'Nouvelle analyse eau',
    description: "Une nouvelle analyse d'eau est disponible",
    blockUpdated: 'Bloc analyse eau',
    icon: Beaker,
  },
  {
    value: 'new_foliar_analysis',
    label: 'Nouvelle analyse foliaire',
    description: 'Une nouvelle analyse foliaire est disponible',
    blockUpdated: 'Bloc analyse foliaire',
    icon: Leaf,
  },
  {
    value: 'parcel_restructure',
    label: 'Restructuration parcelle',
    description: 'Changements structurels majeurs (replantation, etc.)',
    blockUpdated: 'Recalibrage complet',
    icon: RefreshCcw,
  },
  {
    value: 'other',
    label: 'Autre',
    description: 'Description libre',
    blockUpdated: "Defini par l'utilisateur",
    icon: GitCompareArrows,
  },
];

interface MotifSelectionStepProps {
  selectedMotif: RecalibrationMotif | null;
  motifDetail: string;
  onSelectMotif: (motif: RecalibrationMotif) => void;
  onMotifDetailChange: (value: string) => void;
}

export function MotifSelectionStep({
  selectedMotif,
  motifDetail,
  onSelectMotif,
  onMotifDetailChange,
}: MotifSelectionStepProps) {
  return (
    <div className="space-y-6" data-testid="calibration-partial-motif-step">
      <div>
        <h4 className="text-base font-semibold text-gray-900 dark:text-white">Selectionnez le motif du recalibrage</h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choisissez la raison du recalibrage partiel pour cibler uniquement les blocs concernes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {RECALIBRATION_MOTIFS.map((motif) => {
          const Icon = motif.icon;
          const isSelected = selectedMotif === motif.value;

          return (
            <button
              key={motif.value}
              type="button"
              data-testid={`calibration-partial-motif-option-${motif.value}`}
              onClick={() => onSelectMotif(motif.value)}
              className={`rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/30'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-white">{motif.label}</h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{motif.description}</p>
                </div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <Icon className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-3 rounded-md border border-dashed border-gray-300 dark:border-gray-600 p-2 text-xs text-gray-600 dark:text-gray-300">
                Bloc mis a jour: <span className="font-medium">{motif.blockUpdated}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedMotif === 'parcel_restructure' && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Redirection vers recalibrage complet</p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                Une restructuration parcellaire implique un nouveau profil de reference complet. L&apos;assistant de calibrage initial est recommande.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedMotif === 'other' && (
        <FormField
          label="Detail du motif"
          htmlFor="recalibration_motif_detail"
          required
          helper="Precisez ce qui a change pour determiner les blocs a recalculer."
        >
          <Input
            id="recalibration_motif_detail"
            placeholder="Ex: Changement de strategie de fertigation suite a un nouvel audit"
            value={motifDetail}
            onChange={(event) => onMotifDetailChange(event.target.value)}
          />
        </FormField>
      )}
    </div>
  );
}
