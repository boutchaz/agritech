import React, { useMemo, useState } from 'react';
import { Thermometer, Snowflake, Sun, Flame, Leaf, Timer, Calendar, Settings2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

// Temperature threshold configuration by crop type and phenological stage
interface TemperatureThreshold {
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
  threshold: number;
  comparison: 'below' | 'above' | 'between';
  upperThreshold?: number;
  unit: 'hours' | 'days';
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface PhenologicalStage {
  name: string;
  nameKey: string;
  thresholds: TemperatureThreshold[];
  defaultMonths?: [number, number]; // Start and end month (0-11) for default date range
}

interface StageDateRange {
  startDate: string | null;
  endDate: string | null;
  enabled: boolean;
}

// Phenological stages and temperature thresholds by crop type
const cropPhenologicalConfig: Record<string, PhenologicalStage[]> = {
  olive: [
    {
      name: 'Dormancy (Winter)',
      nameKey: 'phenological.olive.dormancy',
      defaultMonths: [11, 1], // December to February
      thresholds: [
        {
          name: 'Chilling Hours',
          nameKey: 'phenological.chillingHours',
          description: 'Hours below 10°C needed to break dormancy',
          descriptionKey: 'phenological.chillingHoursDesc',
          threshold: 10,
          comparison: 'below',
          unit: 'hours',
          icon: <Snowflake className="h-5 w-5" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
          name: 'Frost Risk Hours',
          nameKey: 'phenological.frostRisk',
          description: 'Hours below 0°C - risk of frost damage',
          descriptionKey: 'phenological.frostRiskDesc',
          threshold: 0,
          comparison: 'below',
          unit: 'hours',
          icon: <Snowflake className="h-5 w-5" />,
          color: 'text-cyan-600',
          bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
        },
      ],
    },
    {
      name: 'Flowering (Spring)',
      nameKey: 'phenological.olive.flowering',
      defaultMonths: [3, 5], // April to June
      thresholds: [
        {
          name: 'Optimal Flowering',
          nameKey: 'phenological.optimalFlowering',
          description: 'Hours between 15-25°C ideal for flowering',
          descriptionKey: 'phenological.optimalFloweringDesc',
          threshold: 15,
          upperThreshold: 25,
          comparison: 'between',
          unit: 'hours',
          icon: <Leaf className="h-5 w-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
        {
          name: 'Heat Stress',
          nameKey: 'phenological.heatStress',
          description: 'Hours above 35°C - stress for flowering',
          descriptionKey: 'phenological.heatStressDesc',
          threshold: 35,
          comparison: 'above',
          unit: 'hours',
          icon: <Flame className="h-5 w-5" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
        },
      ],
    },
    {
      name: 'Fruit Development (Summer)',
      nameKey: 'phenological.olive.fruitDev',
      defaultMonths: [5, 9], // June to October
      thresholds: [
        {
          name: 'Growing Degree Hours',
          nameKey: 'phenological.growingDegreeHours',
          description: 'Hours above 10°C for fruit development',
          descriptionKey: 'phenological.growingDegreeHoursDesc',
          threshold: 10,
          comparison: 'above',
          unit: 'hours',
          icon: <Sun className="h-5 w-5" />,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        },
        {
          name: 'Extreme Heat',
          nameKey: 'phenological.extremeHeat',
          description: 'Hours above 40°C - critical stress',
          descriptionKey: 'phenological.extremeHeatDesc',
          threshold: 40,
          comparison: 'above',
          unit: 'hours',
          icon: <Flame className="h-5 w-5" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
        },
      ],
    },
  ],
  citrus: [
    {
      name: 'Dormancy (Winter)',
      nameKey: 'phenological.citrus.dormancy',
      defaultMonths: [11, 1], // December to February
      thresholds: [
        {
          name: 'Cold Hours',
          nameKey: 'phenological.coldHours',
          description: 'Hours below 12°C for dormancy',
          descriptionKey: 'phenological.coldHoursDesc',
          threshold: 12,
          comparison: 'below',
          unit: 'hours',
          icon: <Snowflake className="h-5 w-5" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
          name: 'Frost Damage Risk',
          nameKey: 'phenological.frostDamageRisk',
          description: 'Hours below -2°C - severe frost damage',
          descriptionKey: 'phenological.frostDamageRiskDesc',
          threshold: -2,
          comparison: 'below',
          unit: 'hours',
          icon: <Snowflake className="h-5 w-5" />,
          color: 'text-cyan-600',
          bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
        },
      ],
    },
    {
      name: 'Flowering (Spring)',
      nameKey: 'phenological.citrus.flowering',
      defaultMonths: [2, 4], // March to May
      thresholds: [
        {
          name: 'Optimal Flowering',
          nameKey: 'phenological.optimalFlowering',
          description: 'Hours between 18-25°C ideal for citrus flowering',
          descriptionKey: 'phenological.optimalFloweringCitrusDesc',
          threshold: 18,
          upperThreshold: 25,
          comparison: 'between',
          unit: 'hours',
          icon: <Leaf className="h-5 w-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
      ],
    },
    {
      name: 'Fruit Development',
      nameKey: 'phenological.citrus.fruitDev',
      defaultMonths: [4, 10], // May to November
      thresholds: [
        {
          name: 'Growing Degree Hours',
          nameKey: 'phenological.growingDegreeHours',
          description: 'Hours above 13°C for fruit development',
          descriptionKey: 'phenological.growingDegreeHoursCitrusDesc',
          threshold: 13,
          comparison: 'above',
          unit: 'hours',
          icon: <Sun className="h-5 w-5" />,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        },
      ],
    },
  ],
  grape: [
    {
      name: 'Dormancy (Winter)',
      nameKey: 'phenological.grape.dormancy',
      defaultMonths: [10, 2], // November to March
      thresholds: [
        {
          name: 'Chilling Hours',
          nameKey: 'phenological.chillingHours',
          description: 'Hours below 7°C needed to break dormancy',
          descriptionKey: 'phenological.chillingHoursGrapeDesc',
          threshold: 7,
          comparison: 'below',
          unit: 'hours',
          icon: <Snowflake className="h-5 w-5" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
          name: 'Frost Risk',
          nameKey: 'phenological.frostRisk',
          description: 'Hours below -15°C - winter kill risk',
          descriptionKey: 'phenological.frostRiskGrapeDesc',
          threshold: -15,
          comparison: 'below',
          unit: 'hours',
          icon: <Snowflake className="h-5 w-5" />,
          color: 'text-cyan-600',
          bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
        },
      ],
    },
    {
      name: 'Bud Break (Spring)',
      nameKey: 'phenological.grape.budBreak',
      defaultMonths: [2, 4], // March to May
      thresholds: [
        {
          name: 'Base Temperature Hours',
          nameKey: 'phenological.baseTemperatureHours',
          description: 'Hours above 10°C for bud development',
          descriptionKey: 'phenological.baseTemperatureHoursDesc',
          threshold: 10,
          comparison: 'above',
          unit: 'hours',
          icon: <Leaf className="h-5 w-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
      ],
    },
    {
      name: 'Veraison to Harvest',
      nameKey: 'phenological.grape.veraison',
      defaultMonths: [6, 9], // July to October
      thresholds: [
        {
          name: 'Optimal Ripening',
          nameKey: 'phenological.optimalRipening',
          description: 'Hours between 20-30°C for sugar accumulation',
          descriptionKey: 'phenological.optimalRipeningDesc',
          threshold: 20,
          upperThreshold: 30,
          comparison: 'between',
          unit: 'hours',
          icon: <Sun className="h-5 w-5" />,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        },
      ],
    },
  ],
  // Default configuration for other crops
  default: [
    {
      name: 'General',
      nameKey: 'phenological.general',
      thresholds: [
        {
          name: 'Frost Risk',
          nameKey: 'phenological.frostRisk',
          description: 'Hours below 0°C - frost damage risk',
          descriptionKey: 'phenological.frostRiskGeneralDesc',
          threshold: 0,
          comparison: 'below',
          unit: 'hours',
          icon: <Snowflake className="h-5 w-5" />,
          color: 'text-cyan-600',
          bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
        },
        {
          name: 'Cold Hours',
          nameKey: 'phenological.coldHours',
          description: 'Hours below 10°C',
          descriptionKey: 'phenological.coldHoursGeneralDesc',
          threshold: 7,
          comparison: 'below',
          unit: 'hours',
          icon: <Snowflake className="h-5 w-5" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
          name: 'Growing Hours',
          nameKey: 'phenological.growingHours',
          description: 'Hours above 15°C for growth',
          descriptionKey: 'phenological.growingHoursDesc',
          threshold: 15,
          comparison: 'above',
          unit: 'hours',
          icon: <Sun className="h-5 w-5" />,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        },
        {
          name: 'Heat Stress',
          nameKey: 'phenological.heatStress',
          description: 'Hours above 35°C - heat stress',
          descriptionKey: 'phenological.heatStressGeneralDesc',
          threshold: 35,
          comparison: 'above',
          unit: 'hours',
          icon: <Flame className="h-5 w-5" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
        },
      ],
    },
  ],
};

interface TemperatureDataPoint {
  date: string;
  current_min: number;
  current_max: number;
  current_mean: number;
  ltn_min?: number;
  ltn_max?: number;
  ltn_mean?: number;
}

interface PhenologicalTemperatureCountersProps {
  temperatureData: TemperatureDataPoint[];
  cropType?: string | null;
  treeType?: string | null;
  variety?: string | null;
  startDate?: string;
  endDate?: string;
}

const PhenologicalTemperatureCounters: React.FC<PhenologicalTemperatureCountersProps> = ({
  temperatureData,
  cropType,
  treeType,
  startDate,
  endDate,
}) => {
  const { t } = useTranslation();

  // State for date range customization per stage
  const [stageDateRanges, setStageDateRanges] = useState<Record<string, StageDateRange>>({});
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  // Determine the crop type to use for configuration
  const effectiveCropType = useMemo(() => {
    const type = (cropType || treeType || '').toLowerCase();
    if (type.includes('olive') || type.includes('olivier')) return 'olive';
    if (type.includes('citrus') || type.includes('orange') || type.includes('lemon') || type.includes('agrume')) return 'citrus';
    if (type.includes('grape') || type.includes('vigne') || type.includes('raisin')) return 'grape';
    return 'default';
  }, [cropType, treeType]);

  // Get the phenological stages for this crop
  const phenologicalStages = cropPhenologicalConfig[effectiveCropType] || cropPhenologicalConfig.default;

  // Toggle date range customization for a stage
  const toggleStageExpanded = (stageKey: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageKey]: !prev[stageKey]
    }));
  };

  // Update date range for a stage
  const updateStageDateRange = (stageKey: string, field: 'startDate' | 'endDate', value: string) => {
    setStageDateRanges(prev => ({
      ...prev,
      [stageKey]: {
        ...prev[stageKey],
        [field]: value,
        enabled: true
      }
    }));
  };

  // Clear date range for a stage
  const clearStageDateRange = (stageKey: string) => {
    setStageDateRanges(prev => {
      const newRanges = { ...prev };
      delete newRanges[stageKey];
      return newRanges;
    });
  };

  // Filter temperature data by date range for a specific stage
  const getFilteredDataForStage = (stageKey: string, stageIndex: number): TemperatureDataPoint[] => {
    const dateRange = stageDateRanges[stageKey];

    if (dateRange?.enabled && dateRange.startDate && dateRange.endDate) {
      return temperatureData.filter(day => {
        try {
          const dayDate = parseISO(day.date);
          return isWithinInterval(dayDate, {
            start: startOfDay(parseISO(dateRange.startDate!)),
            end: endOfDay(parseISO(dateRange.endDate!))
          });
        } catch {
          return false;
        }
      });
    }

    // Return all data if no custom range is set
    return temperatureData;
  };

  // Get formatted date range display for a stage
  const getDateRangeDisplay = (stageKey: string, stage: PhenologicalStage): string => {
    const dateRange = stageDateRanges[stageKey];

    if (dateRange?.enabled && dateRange.startDate && dateRange.endDate) {
      try {
        return `${format(parseISO(dateRange.startDate), 'dd/MM/yyyy', { locale: fr })} - ${format(parseISO(dateRange.endDate), 'dd/MM/yyyy', { locale: fr })}`;
      } catch {
        return '';
      }
    }

    // Use parent's date range if available
    if (startDate && endDate) {
      try {
        return `${format(parseISO(startDate), 'dd/MM/yyyy', { locale: fr })} - ${format(parseISO(endDate), 'dd/MM/yyyy', { locale: fr })}`;
      } catch {
        return t('phenological.allPeriod', 'Toute la période');
      }
    }

    return t('phenological.allPeriod', 'Toute la période');
  };

  // Calculate temperature counters for a specific data set
  const calculateCountersForData = (data: TemperatureDataPoint[], stage: PhenologicalStage): Record<string, number> => {
    const results: Record<string, number> = {};

    data.forEach(day => {
      const { current_min, current_max } = day;
      const amplitude = (current_max - current_min) / 2;
      const midpoint = (current_max + current_min) / 2;

      // Simulate 24 hourly temperatures using sine wave approximation
      // Min temp at ~6am, Max temp at ~3pm
      for (let hour = 0; hour < 24; hour++) {
        // Phase shift: max at hour 15 (3pm), min at hour 6 (6am)
        const hourlyTemp = midpoint + amplitude * Math.sin(((hour - 9) / 24) * 2 * Math.PI);

        stage.thresholds.forEach(threshold => {
          const key = `${stage.nameKey}_${threshold.nameKey}`;

          if (!results[key]) results[key] = 0;

          if (threshold.comparison === 'below' && hourlyTemp < threshold.threshold) {
            results[key]++;
          } else if (threshold.comparison === 'above' && hourlyTemp > threshold.threshold) {
            results[key]++;
          } else if (
            threshold.comparison === 'between' &&
            threshold.upperThreshold &&
            hourlyTemp >= threshold.threshold &&
            hourlyTemp <= threshold.upperThreshold
          ) {
            results[key]++;
          }
        });
      }
    });

    return results;
  };

  // Calculate counters per stage with date filtering
  const countersPerStage = useMemo(() => {
    if (!temperatureData || temperatureData.length === 0) return {};

    const results: Record<string, Record<string, number>> = {};

    phenologicalStages.forEach((stage, stageIndex) => {
      const filteredData = getFilteredDataForStage(stage.nameKey, stageIndex);
      results[stage.nameKey] = calculateCountersForData(filteredData, stage);
    });

    return results;
  }, [temperatureData, phenologicalStages, stageDateRanges]);

  // Get the number of days in the filtered data for a stage
  const getDaysInPeriod = (stageKey: string, stageIndex: number): number => {
    const filteredData = getFilteredDataForStage(stageKey, stageIndex);
    return filteredData.length;
  };

  // Calculate total possible hours for a period (for percentage calculation)
  const getTotalPossibleHours = (stageKey: string, stageIndex: number): number => {
    return getDaysInPeriod(stageKey, stageIndex) * 24;
  };

  if (!temperatureData || temperatureData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Timer className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('phenological.title', 'Temperature Counters by Phenological Stage')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('phenological.subtitle', 'Based on crop type')}: {' '}
              <span className="font-medium capitalize">
                {effectiveCropType === 'default'
                  ? t('phenological.general', 'General')
                  : effectiveCropType}
              </span>
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

      <div className="space-y-6">
        {phenologicalStages.map((stage, stageIndex) => {
          const stageKey = stage.nameKey;
          const isExpanded = expandedStages[stageKey] || false;
          const hasCustomRange = stageDateRanges[stageKey]?.enabled;
          const stageCounters = countersPerStage[stageKey] || {};

          return (
          <div key={stageIndex} className="space-y-3">
            {/* Stage Header with date range controls */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                {t(stage.nameKey, stage.name)}
              </h4>
              <div className="flex items-center gap-2">
                {/* Date range badge */}
                <span className={`text-xs px-2 py-1 rounded-full ${hasCustomRange ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {getDateRangeDisplay(stageKey, stage)}
                </span>
                {/* Customize button */}
                <button
                  onClick={() => toggleStageExpanded(stageKey)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={t('phenological.customizeDateRange', 'Personnaliser la période')}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Settings2 className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Date range picker (collapsible) */}
            {isExpanded && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      {t('phenological.from', 'Du')}:
                    </label>
                    <input
                      type="date"
                      value={stageDateRanges[stageKey]?.startDate || ''}
                      onChange={(e) => updateStageDateRange(stageKey, 'startDate', e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">
                      {t('phenological.to', 'Au')}:
                    </label>
                    <input
                      type="date"
                      value={stageDateRanges[stageKey]?.endDate || ''}
                      onChange={(e) => updateStageDateRange(stageKey, 'endDate', e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  {hasCustomRange && (
                    <button
                      onClick={() => clearStageDateRange(stageKey)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <X className="h-4 w-4" />
                      {t('phenological.clearRange', 'Réinitialiser')}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t('phenological.dateRangeHint', 'Sélectionnez une plage de dates pour calculer les compteurs uniquement sur cette période')}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stage.thresholds.map((threshold, thresholdIndex) => {
                const key = `${stage.nameKey}_${threshold.nameKey}`;
                const count = stageCounters[key] || 0;
                const daysInPeriod = getDaysInPeriod(stageKey, stageIndex);
                const totalPossibleHours = getTotalPossibleHours(stageKey, stageIndex);
                const percentage = totalPossibleHours > 0 ? Math.round((count / totalPossibleHours) * 100) : 0;
                const equivalentDays = Math.round(count / 24 * 10) / 10; // 1 decimal place

                return (
                  <div
                    key={thresholdIndex}
                    className={`${threshold.bgColor} rounded-xl p-4 border border-gray-100 dark:border-gray-700`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`${threshold.color}`}>
                        {threshold.icon}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {threshold.comparison === 'below' && `< ${threshold.threshold}°C`}
                        {threshold.comparison === 'above' && `> ${threshold.threshold}°C`}
                        {threshold.comparison === 'between' && `${threshold.threshold}-${threshold.upperThreshold}°C`}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {count.toLocaleString()}
                      <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                        {t('phenological.hours', 'hrs')}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>≈ {equivalentDays} {t('phenological.equivalentDays', 'jours équiv.')}</span>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <span className={`font-medium ${percentage >= 50 ? threshold.color : ''}`}>
                        {percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {t('phenological.outOf', 'sur')} {daysInPeriod} {t('phenological.daysOfData', 'jours de données')}
                    </p>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
                      {t(threshold.nameKey, threshold.name)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t(threshold.descriptionKey, threshold.description)}
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
          <strong>{t('phenological.note', 'Note')}:</strong>{' '}
          {t('phenological.noteText', 'Hourly temperatures are estimated from daily min/max using a sinusoidal model. Actual hourly measurements may vary. These counters help track accumulated temperature exposure for crop management decisions.')}
        </p>
      </div>
    </div>
  );
};

export default PhenologicalTemperatureCounters;
