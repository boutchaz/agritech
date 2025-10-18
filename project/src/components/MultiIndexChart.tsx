import React, { useState } from 'react';
import { TimeSeriesPoint } from '../services/satelliteIndicesService';

interface MultiIndexData {
  index: string;
  data: TimeSeriesPoint[];
  color: string;
  visible?: boolean;
}

interface MultiIndexChartProps {
  datasets: MultiIndexData[];
  width?: number;
  height?: number;
}

const MultiIndexChart: React.FC<MultiIndexChartProps> = ({
  datasets,
  width = 800,
  height = 400
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);
  const [visibleIndices, setVisibleIndices] = useState<Record<string, boolean>>(
    Object.fromEntries(datasets.map(ds => [ds.index, ds.visible !== false]))
  );

  const margin = { top: 40, right: 150, bottom: 50, left: 70 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Get visible datasets
  const visibleDatasets = datasets.filter(ds => visibleIndices[ds.index]);

  if (visibleDatasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <p>Aucun indice sélectionné</p>
        <p className="text-sm mt-2">Cliquez sur un indice dans la légende pour l'afficher</p>
      </div>
    );
  }

  // Calculate global scales
  const allDates: number[] = [];
  const allValues: number[] = [];

  visibleDatasets.forEach(dataset => {
    dataset.data.forEach(point => {
      if (point && point.date && point.value !== undefined) {
        allDates.push(new Date(point.date).getTime());
        allValues.push(point.value);
      }
    });
  });

  if (allDates.length === 0 || allValues.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        Aucune donnée à afficher
      </div>
    );
  }

  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const dateRange = maxDate - minDate || 1;

  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue || 1;

  // Add padding to value range
  const valuePadding = valueRange * 0.1;
  const adjustedMinValue = minValue - valuePadding;
  const adjustedMaxValue = maxValue + valuePadding;
  const adjustedValueRange = adjustedMaxValue - adjustedMinValue;

  // Generate y-axis ticks
  const yTicks = [];
  const tickCount = 6;
  for (let i = 0; i <= tickCount; i++) {
    const value = adjustedMinValue + (adjustedValueRange * i / tickCount);
    const y = chartHeight - (i / tickCount * chartHeight);
    yTicks.push({ value, y });
  }

  // Generate x-axis ticks based on first visible dataset
  const firstDataset = visibleDatasets[0];
  const xTicks = [];
  const xTickCount = Math.min(8, firstDataset.data.length);
  for (let i = 0; i < xTickCount; i++) {
    const dateIndex = Math.floor(i * (firstDataset.data.length - 1) / (xTickCount - 1));
    const point = firstDataset.data[dateIndex];

    if (point && point.date) {
      const x = (new Date(point.date).getTime() - minDate) / dateRange * chartWidth;
      xTicks.push({
        x,
        date: new Date(point.date).toLocaleDateString('fr-FR', {
          month: 'short',
          day: 'numeric',
          year: '2-digit'
        })
      });
    }
  }

  // Toggle index visibility
  const toggleIndex = (index: string) => {
    setVisibleIndices(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
        <svg
          width={width}
          height={height}
          className="w-full h-auto"
          viewBox={`0 0 ${width} ${height}`}
        >
          {/* Background */}
          <rect
            x={margin.left}
            y={margin.top}
            width={chartWidth}
            height={chartHeight}
            fill="transparent"
            stroke="#e5e7eb"
            strokeWidth="1"
            className="dark:stroke-gray-600"
          />

          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={`y-grid-${i}`}>
              <line
                x1={margin.left}
                y1={margin.top + tick.y}
                x2={margin.left + chartWidth}
                y2={margin.top + tick.y}
                stroke="#f3f4f6"
                strokeWidth="1"
                strokeDasharray="2,2"
                className="dark:stroke-gray-700"
              />
            </g>
          ))}

          {xTicks.map((tick, i) => (
            <line
              key={`x-grid-${i}`}
              x1={margin.left + tick.x}
              y1={margin.top}
              x2={margin.left + tick.x}
              y2={margin.top + chartHeight}
              stroke="#f3f4f6"
              strokeWidth="1"
              strokeDasharray="2,2"
              className="dark:stroke-gray-700"
            />
          ))}

          {/* Axes */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + chartHeight}
            stroke="#374151"
            strokeWidth="2"
            className="dark:stroke-gray-400"
          />
          <line
            x1={margin.left}
            y1={margin.top + chartHeight}
            x2={margin.left + chartWidth}
            y2={margin.top + chartHeight}
            stroke="#374151"
            strokeWidth="2"
            className="dark:stroke-gray-400"
          />

          {/* Y-axis labels */}
          {yTicks.map((tick, i) => (
            <text
              key={`y-label-${i}`}
              x={margin.left - 10}
              y={margin.top + tick.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="#6b7280"
              className="dark:fill-gray-400"
            >
              {tick.value.toFixed(3)}
            </text>
          ))}

          {/* X-axis labels */}
          {xTicks.map((tick, i) => (
            <text
              key={`x-label-${i}`}
              x={margin.left + tick.x}
              y={margin.top + chartHeight + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#6b7280"
              className="dark:fill-gray-400"
            >
              {tick.date}
            </text>
          ))}

          {/* Data lines */}
          {visibleDatasets.map((dataset) => {
            const pathData = dataset.data
              .filter(point => point && point.date !== undefined && point.value !== undefined)
              .map((point, i) => {
                const x = (new Date(point.date).getTime() - minDate) / dateRange * chartWidth;
                const y = chartHeight - ((point.value - adjustedMinValue) / adjustedValueRange * chartHeight);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ');

            const isHovered = hoveredIndex === dataset.index;

            return (
              <g key={dataset.index}>
                {/* Line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={dataset.color}
                  strokeWidth={isHovered ? "3" : "2"}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={isHovered ? 1 : 0.8}
                  onMouseEnter={() => setHoveredIndex(dataset.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="transition-all duration-200"
                />

                {/* Data points */}
                {dataset.data
                  .filter(point => point && point.date !== undefined && point.value !== undefined)
                  .map((point, i) => {
                    const x = margin.left + (new Date(point.date).getTime() - minDate) / dateRange * chartWidth;
                    const y = margin.top + chartHeight - ((point.value - adjustedMinValue) / adjustedValueRange * chartHeight);

                    return (
                      <circle
                        key={`${dataset.index}-point-${i}`}
                        cx={x}
                        cy={y}
                        r={isHovered ? "5" : "3"}
                        fill={dataset.color}
                        stroke="white"
                        strokeWidth="1.5"
                        opacity={isHovered ? 1 : 0.7}
                        className="transition-all duration-200"
                      >
                        <title>
                          {dataset.index}: {new Date(point.date).toLocaleDateString('fr-FR')} - {point.value.toFixed(4)}
                        </title>
                      </circle>
                    );
                  })}
              </g>
            );
          })}

          {/* Chart title */}
          <text
            x={width / 2}
            y={20}
            textAnchor="middle"
            fontSize="16"
            fontWeight="600"
            fill="#374151"
            className="dark:fill-gray-300"
          >
            Évolution temporelle des indices de végétation
          </text>

          {/* Y-axis label */}
          <text
            x={20}
            y={height / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
            className="dark:fill-gray-400"
            transform={`rotate(-90, 20, ${height / 2})`}
          >
            Valeur de l'indice
          </text>

          {/* X-axis label */}
          <text
            x={margin.left + chartWidth / 2}
            y={height - 10}
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
            className="dark:fill-gray-400"
          >
            Date
          </text>

          {/* Legend */}
          <g transform={`translate(${margin.left + chartWidth + 20}, ${margin.top})`}>
            <text
              x={0}
              y={0}
              fontSize="12"
              fontWeight="600"
              fill="#374151"
              className="dark:fill-gray-300"
            >
              Indices
            </text>
            {datasets.map((dataset, i) => {
              const isVisible = visibleIndices[dataset.index];
              const isHovered = hoveredIndex === dataset.index;

              return (
                <g
                  key={dataset.index}
                  transform={`translate(0, ${20 + i * 25})`}
                  onClick={() => toggleIndex(dataset.index)}
                  onMouseEnter={() => setHoveredIndex(dataset.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer"
                >
                  <rect
                    x={-5}
                    y={-10}
                    width={120}
                    height={20}
                    fill={isHovered ? '#f3f4f6' : 'transparent'}
                    className="dark:fill-gray-700/50"
                    rx="3"
                  />
                  <rect
                    x={0}
                    y={-5}
                    width={12}
                    height={12}
                    fill={isVisible ? dataset.color : 'transparent'}
                    stroke={dataset.color}
                    strokeWidth="2"
                    rx="2"
                  />
                  <text
                    x={18}
                    y={3}
                    fontSize="11"
                    fill={isVisible ? '#374151' : '#9ca3af'}
                    className={isVisible ? 'dark:fill-gray-300' : 'dark:fill-gray-500'}
                    fontWeight={isHovered ? '600' : '400'}
                  >
                    {dataset.index}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Info box */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            💡 Cliquez sur les indices dans la légende pour les afficher/masquer.
            Survolez les lignes pour mettre en évidence un indice spécifique.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MultiIndexChart;