import { useTranslation } from 'react-i18next';
import { Snowflake, Sun, Flame, Leaf, Timer, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePhenologicalCounters } from '@/hooks/usePhenologicalCounters';
import { useAuth } from '@/hooks/useAuth';
import type { PhenologicalCounter, PhenologicalStage } from '@/lib/api/weather';

interface PhenologicalTemperatureCountersProps {
  parcelId?: string;
  cropType?: string | null;
  /**
   * Temperature data is no longer consumed — phenological counters now come from
   * the backend service (real-hourly Open-Meteo data). Kept for parent compat.
   */
  temperatureData?: unknown;
  treeType?: string | null;
  variety?: string | null;
  startDate?: string;
  endDate?: string;
  year?: number;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  snowflake: <Snowflake className="h-5 w-5" />,
  sun: <Sun className="h-5 w-5" />,
  flame: <Flame className="h-5 w-5" />,
  leaf: <Leaf className="h-5 w-5" />,
};

interface IconStyle {
  text: string;
  bg: string;
  cardBg: string;
}

const ICON_STYLE: Record<string, IconStyle> = {
  snowflake: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    cardBg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  sun: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    cardBg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  flame: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/30',
    cardBg: 'bg-red-50 dark:bg-red-900/20',
  },
  leaf: {
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    cardBg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
};

const DEFAULT_STYLE: IconStyle = ICON_STYLE.sun;

const compareLabel = (counter: PhenologicalCounter): string => {
  if (counter.compare === 'between') return `${counter.threshold}–${counter.upper}°C`;
  if (counter.compare === 'below') return `< ${counter.threshold}°C`;
  return `> ${counter.threshold}°C`;
};

const stageMonthsCoverageHours = (months: number[]): number => {
  // Approximate hours in the months window (handles wrap like Nov-Feb)
  const daysPerMonth: Record<number, number> = {
    1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
    7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
  };
  return months.reduce((sum, m) => sum + (daysPerMonth[m] ?? 30), 0) * 24;
};

const PhenologicalTemperatureCounters = ({
  parcelId,
  startDate,
  endDate,
  year,
}: PhenologicalTemperatureCountersProps) => {
  const { t, i18n } = useTranslation();
  const { currentOrganization } = useAuth();
  const lang = (i18n.language || 'fr').slice(0, 2);

  const { data, isLoading, isError } = usePhenologicalCounters({
    parcelId,
    organizationId: currentOrganization?.id ?? null,
    year,
  });

  if (!parcelId) return null;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Timer className="h-6 w-6 text-purple-600 dark:text-purple-400 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="animate-pulse h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="animate-pulse h-3 w-64 bg-gray-100 dark:bg-gray-700/50 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-700/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Timer className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100">
              {t('weather.counters.errorTitle', 'Compteurs météo indisponibles')}
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {t(
                'weather.counters.error',
                'Les données météo horaires sont temporairement indisponibles. Réessayez plus tard.',
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const stageName = (stage: PhenologicalStage): string => {
    if (lang === 'en' && stage.name_en) return stage.name_en;
    if (lang === 'ar' && stage.name_ar) return stage.name_ar;
    return stage.name_fr || stage.key;
  };

  const counterLabel = (counter: PhenologicalCounter): string => {
    if (lang === 'en' && counter.label_en) return counter.label_en;
    return counter.label_fr || counter.key;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      {/* Header — matches previous design */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Timer className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('weather.counters.title', 'Compteurs phénologiques')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('weather.counters.subtitle', 'Année {{year}} — données horaires réelles', { year: data.year })}
            </p>
          </div>
        </div>
        {startDate && endDate && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              {format(parseISO(startDate), 'dd/MM/yyyy', { locale: fr })} - {format(parseISO(endDate), 'dd/MM/yyyy', { locale: fr })}
            </span>
          </div>
        )}
      </div>

      {/* Per-stage sections with rich cards */}
      <div className="space-y-8">
        {data.stages.map((stage) => {
          const stageHours = stageMonthsCoverageHours(stage.months);
          return (
            <div key={stage.key}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">
                  {stageName(stage)}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {stage.months.map((m) => String(m).padStart(2, '0')).join('·')}
                  {' · '}
                  {stageHours} {t('weather.counters.hours', 'h')}
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {stage.counters.map((counter) => {
                  const iconKey = counter.icon ?? 'sun';
                  const style = ICON_STYLE[iconKey] ?? DEFAULT_STYLE;
                  const equivalentDays = Math.round((counter.value / 24) * 10) / 10;
                  const percentage = stageHours > 0 ? (counter.value / stageHours) * 100 : 0;

                  return (
                    <div
                      key={`${stage.key}-${counter.key}`}
                      className={`${style.cardBg} rounded-xl p-4 border border-gray-100 dark:border-gray-700`}
                      data-testid={`counter-${stage.key}-${counter.key}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={style.text}>
                          {ICON_MAP[iconKey] ?? ICON_MAP.sun}
                        </span>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded">
                          {compareLabel(counter)}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {counter.value.toLocaleString()}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                          {counter.unit}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>≈ {equivalentDays}j</span>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <span className={`font-medium ${percentage >= 20 ? style.text : ''}`}>
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2">
                        {counterLabel(counter)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>{t('weather.counters.noteLabel', 'Note')}:</strong>{' '}
          {t(
            'weather.counters.note',
            'Les compteurs sont calculés à partir des températures horaires réelles (Open-Meteo Archive). Les seuils par stade sont définis dans le référentiel de la culture.',
          )}
        </p>
      </div>
    </div>
  );
};

export default PhenologicalTemperatureCounters;
