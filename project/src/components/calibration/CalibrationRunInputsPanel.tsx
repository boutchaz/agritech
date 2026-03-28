import { Database, FileJson, Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatValue(
  value: unknown,
  t: (key: string, opts?: Record<string, string | number>) => string,
): string {
  if (value === null || value === undefined) {
    return t('calibration.runInputs.valueEmpty');
  }
  if (typeof value === 'boolean') {
    return value ? t('calibration.runInputs.valueYes') : t('calibration.runInputs.valueNo');
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return t('calibration.runInputs.valueEmpty');
    }
    if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return value.join(', ');
    }
    return t('calibration.runInputs.valueElements', { count: value.length });
  }
  if (isRecord(value)) {
    return JSON.stringify(value);
  }
  return String(value);
}

function CulturalHistoryBlock({
  history,
  t,
  requestFieldLabel,
}: {
  history: JsonRecord;
  t: (key: string, opts?: Record<string, string | number>) => string;
  requestFieldLabel: (key: string) => string;
}) {
  const entries = Object.entries(history).filter(
    ([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
  );
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-600 dark:bg-gray-900/40">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {t('calibration.runInputs.culturalHeading')}
      </h4>
      <dl className="grid gap-2 sm:grid-cols-2">
        {entries.map(([key, val]) => (
          <div key={key}>
            <dt className="text-xs text-gray-500 dark:text-gray-400">
              {requestFieldLabel(key)}
            </dt>
            <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatValue(val, t)}</dd>
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
  const { t } = useTranslation('ai');

  const requestFieldLabel = (key: string) =>
    t(`calibration.requestFields.${key}`, { defaultValue: key.replace(/_/g, ' ') });

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

  const fullTitle =
    fullRecalibrationTitle ?? t('calibration.runInputs.btnFullTitle');

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/60"
      data-testid="calibration-run-inputs-panel"
    >
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('calibration.runInputs.title')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('calibration.runInputs.subtitle')}
          </p>
        </div>
      </div>

      {showEditRow && (
        <div className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50/90 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/50 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {t('calibration.runInputs.editHint', {
              targeted: t('calibration.runInputs.editTargeted'),
              full: t('calibration.runInputs.editFull'),
            })}
          </p>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            {onOpenPartialRecalibration && (
              <Button
                type="button"
                onClick={onOpenPartialRecalibration}
                title={t('calibration.runInputs.btnTargetedTitle')}
                className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:bg-gray-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
              >
                {t('calibration.runInputs.btnTargeted')}
              </Button>
            )}
            {onOpenFullRecalibration && (
              <Button
                type="button"
                onClick={onOpenFullRecalibration}
                disabled={fullRecalibrationDisabled}
                title={fullTitle}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('calibration.runInputs.btnFull')}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4 p-4">
        {(satN !== null || wxN !== null || anN !== null || hvN !== null) && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {satN !== null && (
              <div className="rounded-lg bg-emerald-50/80 px-3 py-2 dark:bg-emerald-950/30">
                <p className="text-xs text-emerald-800 dark:text-emerald-300">{t('calibration.runInputs.metricSatellite')}</p>
                <p className="text-lg font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
                  {satN}
                </p>
              </div>
            )}
            {wxN !== null && (
              <div className="rounded-lg bg-sky-50/80 px-3 py-2 dark:bg-sky-950/30">
                <p className="text-xs text-sky-800 dark:text-sky-300">{t('calibration.runInputs.metricWeather')}</p>
                <p className="text-lg font-semibold tabular-nums text-sky-900 dark:text-sky-100">{wxN}</p>
              </div>
            )}
            {anN !== null && (
              <div className="rounded-lg bg-amber-50/80 px-3 py-2 dark:bg-amber-950/30">
                <p className="text-xs text-amber-900 dark:text-amber-300">{t('calibration.runInputs.metricAnalyses')}</p>
                <p className="text-lg font-semibold tabular-nums text-amber-950 dark:text-amber-100">{anN}</p>
              </div>
            )}
            {hvN !== null && (
              <div className="rounded-lg bg-violet-50/80 px-3 py-2 dark:bg-violet-950/30">
                <p className="text-xs text-violet-800 dark:text-violet-300">{t('calibration.runInputs.metricHarvests')}</p>
                <p className="text-lg font-semibold tabular-nums text-violet-900 dark:text-violet-100">{hvN}</p>
              </div>
            )}
          </div>
        )}

        {parcelSnap && Object.keys(parcelSnap).length > 0 && (
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              <Sprout className="h-4 w-4" aria-hidden />
              {t('calibration.runInputs.parcelHeading')}
            </div>
            <dl className="grid gap-2 sm:grid-cols-2">
              {Object.entries(parcelSnap).map(([key, val]) => (
                <div key={key}>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">
                    {requestFieldLabel(key)}
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-100">{formatValue(val, t)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {culturalHistory && (
          <CulturalHistoryBlock history={culturalHistory} t={t} requestFieldLabel={requestFieldLabel} />
        )}

        {(directRequestEntries.length > 0 || typeof report.version === 'string') && (
          <details className="rounded-lg border border-gray-200 dark:border-gray-600">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 [&::-webkit-details-marker]:hidden">
              {t('calibration.runInputs.technicalDetailsSummary')}
            </summary>
            <div className="space-y-3 border-t border-gray-200 p-3 dark:border-gray-600">
              {directRequestEntries.length > 0 && (
                <dl className="grid gap-2 sm:grid-cols-2">
                  {directRequestEntries.map(([key, val]) => (
                    <div key={key}>
                      <dt className="text-xs text-gray-500 dark:text-gray-400">
                        {requestFieldLabel(key)}
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-gray-100">{formatValue(val, t)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {typeof report.version === 'string' && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t('calibration.runInputs.versionLine', { version: report.version })}
                </p>
              )}
            </div>
          </details>
        )}

        <details className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <FileJson className="h-4 w-4" aria-hidden />
              {t('calibration.runInputs.jsonExportSummary')}
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
