import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gauge, Info, AlertTriangle, Check, Loader2 } from 'lucide-react';
import {
  useTargetYieldSuggestion,
  useConfirmTargetYield,
} from '@/hooks/useCalibrationReport';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TargetYieldStepProps {
  parcelId: string;
  calibrationId: string;
  /**
   * When true, renders as a compact inline panel (post-calibration flow).
   * When false, renders as a modal-style chip dialog (re-open via plan page link).
   */
  embedded?: boolean;
  /**
   * Force rendering even when should_auto_show is false (plan page "Ajuster l'objectif" link).
   * Default false: panel hides itself unless the calibration is ambiguous or already confirmed.
   */
  alwaysShow?: boolean;
  onConfirmed?: () => void;
}

export function TargetYieldStep({
  parcelId,
  calibrationId,
  embedded = true,
  alwaysShow = false,
  onConfirmed,
}: TargetYieldStepProps) {
  const { t } = useTranslation('ai');
  const { data: suggestion, isLoading, error } = useTargetYieldSuggestion(
    parcelId,
    calibrationId,
  );
  const confirmMutation = useConfirmTargetYield(parcelId);

  const [mode, setMode] = useState<'accept' | 'override'>('accept');
  const [customValue, setCustomValue] = useState<string>('');

  useEffect(() => {
    if (suggestion && customValue === '') {
      const seed =
        suggestion.current_target_yield_t_ha ?? suggestion.suggested_t_ha;
      setCustomValue(String(seed));
      if (
        suggestion.current_source === 'user_override' &&
        suggestion.current_target_yield_t_ha != null
      ) {
        setMode('override');
      }
    }
  }, [suggestion, customValue]);

  const envelope = suggestion?.envelope;
  const parsedValue = useMemo(() => {
    const num = parseFloat(customValue);
    return Number.isFinite(num) ? num : null;
  }, [customValue]);

  const outOfRange = useMemo(() => {
    if (mode === 'accept' || !envelope || parsedValue == null) return null;
    if (parsedValue < envelope.hard_min) {
      return t('targetYield.errors.belowMin', {
        min: envelope.hard_min,
        defaultValue: `Valeur trop basse — minimum ${envelope.hard_min} t/ha`,
      });
    }
    if (parsedValue > envelope.hard_max) {
      const reasonKey =
        envelope.binding_upper_bound === 'varietal_phase'
          ? 'targetYield.errors.aboveVarietalMax'
          : 'targetYield.errors.aboveCalibrationMax';
      return t(reasonKey, {
        max: envelope.hard_max,
        defaultValue: `Valeur trop haute — plafond ${envelope.hard_max} t/ha`,
      });
    }
    return null;
  }, [mode, envelope, parsedValue, t]);

  if (isLoading) {
    return (
      <Panel embedded={embedded}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('targetYield.loading', 'Calcul de la suggestion…')}
        </div>
      </Panel>
    );
  }

  if (error || !suggestion) {
    if (!alwaysShow) return null;
    return (
      <Panel embedded={embedded}>
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t('targetYield.errors.loadFailed', 'Impossible de charger la suggestion — ré-essayer plus tard.')}
        </div>
      </Panel>
    );
  }

  const alreadyConfirmed = suggestion.current_target_yield_t_ha != null;
  if (!alwaysShow && !suggestion.should_auto_show && alreadyConfirmed) {
    return null;
  }

  const handleConfirm = () => {
    if (mode === 'accept') {
      confirmMutation.mutate(
        {
          calibrationId,
          target_yield_t_ha: suggestion.suggested_t_ha,
          source: 'suggested',
        },
        { onSuccess: () => onConfirmed?.() },
      );
    } else if (parsedValue != null && !outOfRange) {
      confirmMutation.mutate(
        {
          calibrationId,
          target_yield_t_ha: parsedValue,
          source: 'user_override',
        },
        { onSuccess: () => onConfirmed?.() },
      );
    }
  };

  const canSubmit =
    !confirmMutation.isPending &&
    (mode === 'accept' ||
      (parsedValue != null && !outOfRange && parsedValue > 0));

  const bindingBadge =
    envelope?.binding_upper_bound === 'varietal_phase'
      ? t('targetYield.binding.varietal', 'Plafond varieté × phase × densité')
      : t('targetYield.binding.calibration', 'Plafond calibrage × 1.1');

  return (
    <Panel embedded={embedded}>
      <header className="mb-4 flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/30">
          <Gauge className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('targetYield.title', 'Objectif rendement')}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {t(
              'targetYield.subtitle',
              "Confirmer votre objectif avant la génération du plan annuel. Toutes les doses et l'estimation économique en découlent.",
            )}
          </p>
        </div>
      </header>

      <SuggestionRow
        title={t('targetYield.suggested', 'Suggestion')}
        value={suggestion.suggested_t_ha}
        method={suggestion.suggestion_method}
      />

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label={t('targetYield.stats.envelope', 'Plage admise')}
          value={`${envelope?.hard_min} – ${envelope?.hard_max} t/ha`}
          hint={bindingBadge}
        />
        <StatTile
          label={t('targetYield.stats.potential', 'Potentiel calibrage')}
          value={`${suggestion.inputs.yield_potential_min} – ${suggestion.inputs.yield_potential_max} t/ha`}
        />
        {suggestion.history_best3_avg != null && (
          <StatTile
            label={t('targetYield.stats.history', 'Moyenne 3 meilleures années')}
            value={`${suggestion.history_best3_avg} t/ha`}
          />
        )}
        {suggestion.inputs.varietal_cap_t_ha != null && (
          <StatTile
            label={t('targetYield.stats.varietal', 'Plafond variétal')}
            value={`${suggestion.inputs.varietal_cap_t_ha} t/ha`}
          />
        )}
      </div>

      {(suggestion.warnings.wide_range ||
        suggestion.warnings.young_no_history ||
        suggestion.warnings.low_confidence) && (
        <div className="mt-3 space-y-2">
          {suggestion.warnings.wide_range && (
            <Hint variant="amber">
              {t(
                'targetYield.warnings.wideRange',
                "Potentiel à large fourchette — objectif à affiner après la première saison.",
              )}
            </Hint>
          )}
          {suggestion.warnings.young_no_history && (
            <Hint variant="amber">
              {t(
                'targetYield.warnings.youngNoHistory',
                "Parcelle jeune et sans historique — suggestion basée sur le potentiel théorique.",
              )}
            </Hint>
          )}
          {suggestion.warnings.low_confidence && (
            <Hint variant="amber">
              {t(
                'targetYield.warnings.lowConfidence',
                "Calibrage à faible confiance — l'objectif est indicatif.",
              )}
            </Hint>
          )}
        </div>
      )}

      <fieldset className="mt-5 space-y-3">
        <legend className="sr-only">{t('targetYield.modeLegend', 'Mode de confirmation')}</legend>

        <label
          className={cn(
            'flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors',
            mode === 'accept'
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700',
          )}
        >
          <input
            type="radio"
            name="target-yield-mode"
            value="accept"
            checked={mode === 'accept'}
            onChange={() => setMode('accept')}
            className="h-4 w-4 accent-emerald-600"
          />
          <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
            {t('targetYield.accept', 'Accepter la suggestion')}{' '}
            <span className="text-gray-500">
              ({suggestion.suggested_t_ha} t/ha)
            </span>
          </span>
        </label>

        <label
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors',
            mode === 'override'
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700',
          )}
        >
          <input
            type="radio"
            name="target-yield-mode"
            value="override"
            checked={mode === 'override'}
            onChange={() => setMode('override')}
            className="mt-1 h-4 w-4 accent-emerald-600"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {t('targetYield.override', 'Définir un objectif personnalisé')}
            </span>
            {mode === 'override' && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={envelope?.hard_min}
                  max={envelope?.hard_max}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800"
                />
                <span className="text-sm text-gray-600 dark:text-gray-300">t/ha</span>
                <span className="text-xs text-gray-500">
                  {t('targetYield.range', 'Plage')}: {envelope?.hard_min}–{envelope?.hard_max}
                </span>
              </div>
            )}
          </div>
        </label>
      </fieldset>

      {outOfRange && (
        <p className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          {outOfRange}
        </p>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="green"
          onClick={handleConfirm}
          disabled={!canSubmit}
        >
          {confirmMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('targetYield.saving', 'Enregistrement…')}
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              {mode === 'accept'
                ? t('targetYield.confirmAccept', 'Confirmer la suggestion')
                : t('targetYield.confirmOverride', "Confirmer l'objectif personnalisé")}
            </>
          )}
        </Button>
      </div>
    </Panel>
  );
}

function Panel({
  embedded,
  children,
}: {
  embedded: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-xl border p-5',
        embedded
          ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800/40 dark:bg-emerald-900/10'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
      )}
    >
      {children}
    </section>
  );
}

function SuggestionRow({
  title,
  value,
  method,
}: {
  title: string;
  value: number;
  method: string;
}) {
  const { t } = useTranslation('ai');
  const methodLabel =
    method === 'history_best3_x_0_95'
      ? t('targetYield.method.history', 'Moyenne 3 meilleures années × 0.95')
      : method === 'potential_central_x_coef'
        ? t('targetYield.method.potential', 'Potentiel central × coef état')
        : t('targetYield.method.fallback', 'Données limitées');

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-white p-4 dark:bg-gray-900/40">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
          {value} <span className="text-base font-medium text-gray-500">t/ha</span>
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Info className="h-3.5 w-3.5" />
        {methodLabel}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-white/70 p-3 text-sm dark:bg-gray-900/40">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 font-semibold text-gray-900 dark:text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-gray-500">{hint}</p>}
    </div>
  );
}

function Hint({
  variant,
  children,
}: {
  variant: 'amber';
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-xs',
        variant === 'amber' &&
          'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-200',
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
