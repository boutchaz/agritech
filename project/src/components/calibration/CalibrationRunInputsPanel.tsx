import { Database, FileJson, Sprout } from 'lucide-react';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const REQUEST_LABELS: Record<string, string> = {
  irrigation_frequency: "Fréquence d'irrigation",
  water_source: "Source d'eau",
  volume_per_tree_liters: 'Volume par arbre (L)',
  irrigation_type: "Type d'irrigation",
  pruning_type: 'Type de taille',
  last_pruning_date: 'Dernière taille',
  pruning_intensity: 'Intensité de taille',
  past_fertilization: 'Fertilisation passée',
  fertilization_type: 'Type de fertilisation',
  biostimulants_used: 'Biostimulants',
  observations: 'Observations',
  water_source_changed: "Changement de source d'eau",
  water_source_change_date: "Date du changement d'eau",
  previous_water_source: 'Source précédente',
  irrigation_regime_changed: "Changement de régime d'irrigation",
  irrigation_change_date: "Date du changement d'irrigation",
  previous_irrigation_frequency: 'Fréquence précédente',
  previous_volume_per_tree_liters: 'Volume précédent (L)',
  harvest_regularity: 'Régularité des récoltes',
  mode_calibrage: 'Mode de calibrage',
  recalibration_motif: 'Motif de recalibrage',
  recalibration_motif_detail: 'Détail du motif',
  lookback_days: 'Fenêtre historique (jours)',
  stress_events: 'Événements de stress',
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '—';
    }
    if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return value.join(', ');
    }
    return `${value.length} élément(s)`;
  }
  if (isRecord(value)) {
    return JSON.stringify(value);
  }
  return String(value);
}

function CulturalHistoryBlock({ history }: { history: JsonRecord }) {
  const entries = Object.entries(history).filter(
    ([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
  );
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-600 dark:bg-gray-900/40">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Historique cultural (formulaire)
      </h4>
      <dl className="grid gap-2 sm:grid-cols-2">
        {entries.map(([key, val]) => (
          <div key={key}>
            <dt className="text-xs text-gray-500 dark:text-gray-400">
              {REQUEST_LABELS[key] ?? key.replace(/_/g, ' ')}
            </dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatValue(val)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export interface CalibrationRunInputsPanelProps {
  /** Full `calibration_data` object from GET calibration/report (`report` field). */
  report: Record<string, unknown> | null | undefined;
  /** When set, show how to change inputs (wizards); optional buttons open the same flows as the page header. */
  onOpenPartialRecalibration?: () => void;
  onOpenFullRecalibration?: () => void;
  fullRecalibrationDisabled?: boolean;
  fullRecalibrationTitle?: string;
}

export function CalibrationRunInputsPanel({
  report,
  onOpenPartialRecalibration,
  onOpenFullRecalibration,
  fullRecalibrationDisabled = false,
  fullRecalibrationTitle,
}: CalibrationRunInputsPanelProps) {
  if (!report || typeof report !== 'object') {
    return null;
  }

  const request = isRecord(report.request) ? report.request : null;
  const inputs = isRecord(report.inputs) ? report.inputs : null;
  const parcelSnap = isRecord(report.parcel) ? report.parcel : null;

  const satellite = inputs?.satellite_images;
  const weather = inputs?.weather_rows;
  const analyses = inputs?.analyses;
  const harvests = inputs?.harvest_records;

  const satN = Array.isArray(satellite) ? satellite.length : null;
  const wxN = Array.isArray(weather) ? weather.length : null;
  const anN = Array.isArray(analyses) ? analyses.length : null;
  const hvN = Array.isArray(harvests) ? harvests.length : null;

  const culturalHistory =
    request && isRecord(request.cultural_history) ? (request.cultural_history as JsonRecord) : null;

  const directRequestEntries = request
    ? Object.entries(request).filter(([k]) => k !== 'cultural_history')
    : [];

  const hasAny =
    request ||
    inputs ||
    parcelSnap ||
    satN !== null ||
    wxN !== null ||
    anN !== null ||
    hvN !== null;

  if (!hasAny) {
    return null;
  }

  const showEditRow =
    onOpenPartialRecalibration !== undefined || onOpenFullRecalibration !== undefined;

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/60"
      data-testid="calibration-run-inputs-panel"
    >
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Données utilisées pour ce calibrage</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paramètres saisis et jeux de données injectés dans le moteur au moment du dernier lancement (lecture
            seule).
          </p>
        </div>
      </div>

      {showEditRow && (
        <div className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50/90 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Pour modifier ces données et relancer le moteur, ouvrez le{' '}
            <span className="font-medium text-gray-800 dark:text-gray-200">recalibrage partiel</span> ou le{' '}
            <span className="font-medium text-gray-800 dark:text-gray-200">re-calibrage complet</span> (assistant
            identique à la première calibration).
          </p>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            {onOpenPartialRecalibration && (
              <button
                type="button"
                onClick={onOpenPartialRecalibration}
                className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
              >
                Recalibrage partiel
              </button>
            )}
            {onOpenFullRecalibration && (
              <button
                type="button"
                onClick={onOpenFullRecalibration}
                disabled={fullRecalibrationDisabled}
                title={fullRecalibrationTitle}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Re-calibrate
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4 p-4">
        {(satN !== null || wxN !== null || anN !== null || hvN !== null) && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {satN !== null && (
              <div className="rounded-lg bg-emerald-50/80 px-3 py-2 dark:bg-emerald-950/30">
                <p className="text-xs text-emerald-800 dark:text-emerald-300">Lectures satellite</p>
                <p className="text-lg font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
                  {satN}
                </p>
              </div>
            )}
            {wxN !== null && (
              <div className="rounded-lg bg-sky-50/80 px-3 py-2 dark:bg-sky-950/30">
                <p className="text-xs text-sky-800 dark:text-sky-300">Jours météo</p>
                <p className="text-lg font-semibold tabular-nums text-sky-900 dark:text-sky-100">{wxN}</p>
              </div>
            )}
            {anN !== null && (
              <div className="rounded-lg bg-amber-50/80 px-3 py-2 dark:bg-amber-950/30">
                <p className="text-xs text-amber-900 dark:text-amber-300">Analyses labo</p>
                <p className="text-lg font-semibold tabular-nums text-amber-950 dark:text-amber-100">{anN}</p>
              </div>
            )}
            {hvN !== null && (
              <div className="rounded-lg bg-violet-50/80 px-3 py-2 dark:bg-violet-950/30">
                <p className="text-xs text-violet-800 dark:text-violet-300">Enregistrements récolte</p>
                <p className="text-lg font-semibold tabular-nums text-violet-900 dark:text-violet-100">{hvN}</p>
              </div>
            )}
          </div>
        )}

        {parcelSnap && Object.keys(parcelSnap).length > 0 && (
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              <Sprout className="h-4 w-4" aria-hidden />
              Parcelle (instantané au lancement)
            </div>
            <dl className="grid gap-2 sm:grid-cols-2">
              {Object.entries(parcelSnap).map(([key, val]) => (
                <div key={key}>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">
                    {REQUEST_LABELS[key] ?? key.replace(/_/g, ' ')}
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{formatValue(val)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {culturalHistory && <CulturalHistoryBlock history={culturalHistory} />}

        {directRequestEntries.length > 0 && (
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
            <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Autres paramètres de requête
            </p>
            <dl className="grid gap-2 sm:grid-cols-2">
              {directRequestEntries.map(([key, val]) => (
                <div key={key}>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">
                    {REQUEST_LABELS[key] ?? key.replace(/_/g, ' ')}
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{formatValue(val)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {typeof report.version === 'string' && (
          <p className="text-xs text-gray-400 dark:text-gray-500">Version moteur : {report.version}</p>
        )}

        <details className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <FileJson className="h-4 w-4" aria-hidden />
              Export JSON technique (request + inputs)
            </span>
          </summary>
          <pre className="max-h-64 overflow-auto border-t border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-600 dark:bg-gray-950">
            {JSON.stringify(
              {
                request: request ?? undefined,
                inputs: inputs
                  ? {
                      ...inputs,
                      satellite_images: Array.isArray(satellite)
                        ? `(truncated: ${satellite.length} readings)`
                        : inputs.satellite_images,
                      weather_rows: Array.isArray(weather)
                        ? `(truncated: ${weather.length} rows)`
                        : inputs.weather_rows,
                      analyses: Array.isArray(analyses)
                        ? `(truncated: ${analyses.length} analyses)`
                        : inputs.analyses,
                      harvest_records: Array.isArray(harvests)
                        ? `(truncated: ${harvests.length} records)`
                        : inputs.harvest_records,
                    }
                  : undefined,
              },
              null,
              2,
            )}
          </pre>
        </details>
      </div>
    </div>
  );
}
