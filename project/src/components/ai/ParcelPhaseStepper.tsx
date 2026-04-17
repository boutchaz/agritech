import { useCalibrationProgress } from '@/hooks/useCalibrationSocket';
import type { ParcelPhaseState } from '@/hooks/useParcelPhase';
import { cn } from '@/lib/utils';
import { Check, Loader2, Satellite, Settings, Leaf, Activity } from 'lucide-react';

interface ParcelPhaseStepperProps {
  parcelId: string;
  phaseState: ParcelPhaseState;
}

const STEPS = [
  { key: 'data', label: 'Données', icon: Satellite },
  { key: 'calibration', label: 'Calibrage', icon: Settings },
  { key: 'nutrition', label: 'Nutrition', icon: Leaf },
  { key: 'active', label: 'Surveillance', icon: Activity },
];

export function ParcelPhaseStepper({ parcelId, phaseState }: ParcelPhaseStepperProps) {
  const { stepIndex, isBusy, label, phase } = phaseState;
  const progress = useCalibrationProgress(parcelId);
  const showBar = isBusy;
  const barPercent =
    phase === 'calibrating' && progress?.percent != null
      ? Math.max(5, Math.min(100, progress.percent))
      : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            {isBusy && <Loader2 className="h-4 w-4 animate-spin text-green-600" aria-hidden />}
            <span className="truncate">{label}</span>
          </div>
          {phase === 'calibrating' && progress?.message && (
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{progress.message}</p>
          )}
        </div>
        {barPercent != null && (
          <span className="shrink-0 text-xs font-medium text-green-700 dark:text-green-400">
            {Math.round(barPercent)}%
          </span>
        )}
      </div>

      <ol className="mt-4 grid grid-cols-4 gap-2">
        {STEPS.map((step, idx) => {
          const done = idx < stepIndex;
          const current = idx === stepIndex;
          const Icon = step.icon;
          return (
            <li key={step.key} className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                  done && 'border-green-600 bg-green-600 text-white',
                  current && !isBusy && 'border-green-600 bg-white text-green-600 dark:bg-gray-900',
                  current && isBusy && 'border-green-600 bg-white text-green-600 dark:bg-gray-900',
                  !done && !current && 'border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500',
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : current && isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-center text-[11px] font-medium',
                  done && 'text-green-700 dark:text-green-400',
                  current && 'text-gray-900 dark:text-gray-100',
                  !done && !current && 'text-gray-400 dark:text-gray-500',
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {showBar && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={cn(
              'h-full bg-green-600 transition-all',
              barPercent == null && 'animate-pulse w-1/3',
            )}
            style={barPercent != null ? { width: `${barPercent}%` } : undefined}
          />
        </div>
      )}
    </div>
  );
}
