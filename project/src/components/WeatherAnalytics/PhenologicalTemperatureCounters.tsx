import React, { useMemo, useState } from 'react';
import { Snowflake, Sun, Flame, Leaf, Timer, Calendar } from 'lucide-react';
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
          description: 'Hours below 7°C',
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

const PhenologicalTemperatureCounters = ({
  temperatureData,
  cropType,
  treeType,
  startDate,
  endDate,
}: PhenologicalTemperatureCountersProps) => {
  const { t } = useTranslation();

  // State for date range customization per stage
  const [stageDateRanges, setStageDateRanges] = useState<Record<string, StageDateRange>>({});
  const [_expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

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
  const _toggleStageExpanded = (stageKey: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageKey]: !prev[stageKey]
    }));
  };

  // Update date range for a stage
  const _updateStageDateRange = (stageKey: string, field: 'startDate' | 'endDate', value: string) => {
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
  const _clearStageDateRange = (stageKey: string) => {
    setStageDateRanges(prev => {
      const newRanges = { ...prev };
      delete newRanges[stageKey];
      return newRanges;
    });
  };

   // Filter temperature data by date range for a specific stage
   const getFilteredDataForStage = (stageKey: string, _stageIndex: number): TemperatureDataPoint[] => {
    const dateRange = stageDateRanges[stageKey];

    // Use custom stage range if set
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

    // Use parent component's date range if available
    if (startDate && endDate) {
      return temperatureData.filter(day => {
        try {
          const dayDate = parseISO(day.date);
          return isWithinInterval(dayDate, {
            start: startOfDay(parseISO(startDate)),
            end: endOfDay(parseISO(endDate))
          });
        } catch {
          return false;
        }
      });
    }

    // Return all data only if no date range is specified
    return temperatureData;
  };

   // Get formatted date range display for a stage
   const _getDateRangeDisplay = (stageKey: string, _stage: PhenologicalStage): string => {
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
  const _countersPerStage = useMemo(() => {
    if (!temperatureData || temperatureData.length === 0) return {};

    const results: Record<string, Record<string, number>> = {};

    phenologicalStages.forEach((stage, stageIndex) => {
      const filteredData = getFilteredDataForStage(stage.nameKey, stageIndex);
      const counters = calculateCountersForData(filteredData, stage);
      const totalHours = filteredData.length * 24;

       // Validate: Check if counters exceed total hours (impossible values)
       Object.entries(counters).forEach(([_key, value]) => {
         if (value > totalHours && totalHours > 0) {
           // Data validation: counter exceeds period total (possible data corruption)
         }
       });

      results[stage.nameKey] = counters;
    });

    return results;
  }, [temperatureData, phenologicalStages, stageDateRanges, startDate, endDate]);

  // Get the number of days in the filtered data for a stage
  const getDaysInPeriod = (stageKey: string, stageIndex: number): number => {
    const filteredData = getFilteredDataForStage(stageKey, stageIndex);
    return filteredData.length;
  };

  // Calculate total possible hours for a period (for percentage calculation)
  const _getTotalPossibleHours = (stageKey: string, stageIndex: number): number => {
    return getDaysInPeriod(stageKey, stageIndex) * 24;
  };

  if (!temperatureData || temperatureData.length === 0) {
    return null;
  }

  // Calculate universal temperature counters (5 fixed ranges)
  const universalCounters = useMemo(() => {
    if (!temperatureData || temperatureData.length === 0) {
      return {
        range1: 0, // < 0°C
        range2: 0, // 0-7°C
        range3: 0, // 7-15°C
        range4: 0, // 15-35°C
        range5: 0, // > 35°C
        totalHours: 0,
      };
    }

    let range1 = 0; // < 0°C
    let range2 = 0; // 0-7°C
    let range3 = 0; // 7-15°C
    let range4 = 0; // 15-35°C
    let range5 = 0; // > 35°C

    temperatureData.forEach(day => {
      const { current_min, current_max } = day;
      const amplitude = (current_max - current_min) / 2;
      const midpoint = (current_max + current_min) / 2;

      // Simulate 24 hourly temperatures using sine wave approximation
      for (let hour = 0; hour < 24; hour++) {
        const hourlyTemp = midpoint + amplitude * Math.sin(((hour - 9) / 24) * 2 * Math.PI);

        if (hourlyTemp < 0) {
          range1++;
        } else if (hourlyTemp >= 0 && hourlyTemp < 7) {
          range2++;
        } else if (hourlyTemp >= 7 && hourlyTemp < 15) {
          range3++;
        } else if (hourlyTemp >= 15 && hourlyTemp <= 35) {
          range4++;
        } else {
          range5++; // > 35°C
        }
      }
    });

    const totalHours = temperatureData.length * 24;

    return {
      range1,
      range2,
      range3,
      range4,
      range5,
      totalHours,
    };
  }, [temperatureData]);

  const universalRanges = [
    {
      key: 'range1',
      name: t('phenological.frostRange', 'Gel (< 0°C)'),
      nameKey: 'phenological.frostRange',
      description: t('phenological.frostRangeDesc', 'Risque de gel'),
      tempRange: '< 0°C',
      icon: <Snowflake className="h-5 w-5" />,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20',
    },
    {
      key: 'range2',
      name: t('phenological.coldRange', 'Froid (0-7°C)'),
      nameKey: 'phenological.coldRange',
      description: t('phenological.coldRangeDesc', 'Températures froides'),
      tempRange: '0-7°C',
      icon: <Snowflake className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      key: 'range3',
      name: t('phenological.coolRange', 'Frais (7-15°C)'),
      nameKey: 'phenological.coolRange',
      description: t('phenological.coolRangeDesc', 'Températures fraîches'),
      tempRange: '7-15°C',
      icon: <Leaf className="h-5 w-5" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      key: 'range4',
      name: t('phenological.optimalRange', 'Optimal (15-35°C)'),
      nameKey: 'phenological.optimalRange',
      description: t('phenological.optimalRangeDesc', 'Zone de croissance optimale'),
      tempRange: '15-35°C',
      icon: <Sun className="h-5 w-5" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      key: 'range5',
      name: t('phenological.heatRange', 'Chaleur (> 35°C)'),
      nameKey: 'phenological.heatRange',
      description: t('phenological.heatRangeDesc', 'Stress thermique'),
      tempRange: '> 35°C',
      icon: <Flame className="h-5 w-5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Timer className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('phenological.title', 'Compteur Température')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('phenological.subtitle', 'Analyse des températures par plage')}
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

      {/* Universal Temperature Counter Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200">
            {t('phenological.universalCounter', 'Compteur Universel')}
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('phenological.totalData', 'Total')}:{' '}
            {temperatureData?.length || 0} {t('phenological.days', 'jours')} ({universalCounters.totalHours} {t('phenological.hours', 'heures')})
          </span>
        </div>

        {/* Progress bar visualization */}
        <div className="mb-4 h-6 rounded-full overflow-hidden flex">
          <div
            className="bg-cyan-500 transition-all duration-300"
            style={{ width: `${(universalCounters.range1 / universalCounters.totalHours) * 100}%` }}
            title={`< 0°C: ${Math.round((universalCounters.range1 / universalCounters.totalHours) * 100)}%`}
          />
          <div
            className="bg-blue-500 transition-all duration-300"
            style={{ width: `${(universalCounters.range2 / universalCounters.totalHours) * 100}%` }}
            title={`0-7°C: ${Math.round((universalCounters.range2 / universalCounters.totalHours) * 100)}%`}
          />
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${(universalCounters.range3 / universalCounters.totalHours) * 100}%` }}
            title={`7-15°C: ${Math.round((universalCounters.range3 / universalCounters.totalHours) * 100)}%`}
          />
          <div
            className="bg-amber-500 transition-all duration-300"
            style={{ width: `${(universalCounters.range4 / universalCounters.totalHours) * 100}%` }}
            title={`15-35°C: ${Math.round((universalCounters.range4 / universalCounters.totalHours) * 100)}%`}
          />
          <div
            className="bg-red-500 transition-all duration-300"
            style={{ width: `${(universalCounters.range5 / universalCounters.totalHours) * 100}%` }}
            title={`> 35°C: ${Math.round((universalCounters.range5 / universalCounters.totalHours) * 100)}%`}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-cyan-500"></div>
            <span className="text-gray-600 dark:text-gray-400">&lt; 0°C</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-gray-600 dark:text-gray-400">0-7°C</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-500"></div>
            <span className="text-gray-600 dark:text-gray-400">7-15°C</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500"></div>
            <span className="text-gray-600 dark:text-gray-400">15-35°C</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-gray-600 dark:text-gray-400">&gt; 35°C</span>
          </div>
        </div>

        {/* Universal counters grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {universalRanges.map((range) => {
            const hours = universalCounters[range.key as keyof typeof universalCounters] as number;
            const percentage = universalCounters.totalHours > 0
              ? (hours / universalCounters.totalHours) * 100
              : 0;
            const equivalentDays = Math.round((hours / 24) * 10) / 10;

            return (
              <div
                key={range.key}
                className={`${range.bgColor} rounded-xl p-4 border border-gray-100 dark:border-gray-700`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`${range.color}`}>
                    {range.icon}
                  </span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded">
                    {range.tempRange}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {hours.toLocaleString()}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                    h
                  </span>
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>≈ {equivalentDays}j</span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span className={`font-medium ${percentage >= 20 ? range.color : ''}`}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2">
                  {range.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {range.description}
                </p>
              </div>
            );
          })}
        </div>
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
