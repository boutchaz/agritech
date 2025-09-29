import React from 'react';
import { getNutrientStatus, getNutrientColor } from '../../utils/soilRecommendations';

interface NutrientData {
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
}

interface NutrientBarChartProps {
  nutrients: NutrientData[];
  title?: string;
}

const NutrientBarChart: React.FC<NutrientBarChartProps> = ({ nutrients, title }) => {
  const getBarWidth = (value: number, min: number, max: number): number => {
    // Calculate percentage relative to optimal range
    const range = max - min;
    const position = Math.max(0, Math.min(100, ((value - min) / range) * 100));
    return position;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
      )}

      <div className="space-y-6">
        {nutrients.map((nutrient, index) => {
          const status = getNutrientStatus(nutrient.value, nutrient.min, nutrient.max);
          const barWidth = getBarWidth(nutrient.value, nutrient.min, nutrient.max);
          const colorClass = getNutrientColor(status);

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {nutrient.name}
                </span>
                <span className={`text-sm font-semibold ${colorClass}`}>
                  {nutrient.value} {nutrient.unit}
                </span>
              </div>

              {/* Bar Chart */}
              <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                {/* Optimal range indicator */}
                <div className="absolute inset-0 flex">
                  <div className="bg-red-100 dark:bg-red-900/20 flex-1"></div>
                  <div className="bg-green-100 dark:bg-green-900/20 flex-1"></div>
                  <div className="bg-yellow-100 dark:bg-yellow-900/20 flex-1"></div>
                </div>

                {/* Current value indicator */}
                <div
                  className={`absolute top-0 bottom-0 rounded-r-lg transition-all duration-500 ${
                    status === 'low' ? 'bg-red-500' :
                    status === 'optimal' ? 'bg-green-500' :
                    'bg-yellow-500'
                  }`}
                  style={{ width: `${barWidth}%` }}
                ></div>

                {/* Value label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                    {status === 'low' ? 'Faible' :
                     status === 'optimal' ? 'Optimal' :
                     'Élevé'}
                  </span>
                </div>
              </div>

              {/* Range labels */}
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{nutrient.min} {nutrient.unit}</span>
                <span>Optimal</span>
                <span>{nutrient.max} {nutrient.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NutrientBarChart;