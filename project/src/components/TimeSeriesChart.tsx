import React from 'react';
import { TimeSeriesPoint } from '../services/satelliteIndicesService';

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  index: string;
  width?: number;
  height?: number;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  index,
  width = 600,
  height = 300
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        Aucune donnée à afficher
      </div>
    );
  }

  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate scales
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  const dates = data.filter(d => d && d.date).map(d => new Date(d.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const dateRange = maxDate - minDate || 1;

  // Create path for the line
  const pathData = data
    .filter(point => point && point.date !== undefined && point.value !== undefined)
    .map((point, i) => {
      const x = (new Date(point.date).getTime() - minDate) / dateRange * chartWidth;
      const y = chartHeight - ((point.value - minValue) / valueRange * chartHeight);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Create points for hover
  const points = data
    .filter(point => point && point.date !== undefined && point.value !== undefined)
    .map((point, i) => {
      const x = (new Date(point.date).getTime() - minDate) / dateRange * chartWidth;
      const y = chartHeight - ((point.value - minValue) / valueRange * chartHeight);
      return { x, y, ...point };
    });

  // Generate y-axis ticks
  const yTicks = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const value = minValue + (valueRange * i / tickCount);
    const y = chartHeight - (i / tickCount * chartHeight);
    yTicks.push({ value, y });
  }

  // Generate x-axis ticks
  const xTicks = [];
  const xTickCount = Math.min(6, data.length);
  for (let i = 0; i < xTickCount; i++) {
    const dateIndex = Math.floor(i * (data.length - 1) / (xTickCount - 1));
    const point = data[dateIndex];

    // Ensure point exists and has required properties
    if (point && point.date) {
      const x = (new Date(point.date).getTime() - minDate) / dateRange * chartWidth;
      xTicks.push({
        x,
        date: new Date(point.date).toLocaleDateString('fr-FR', {
          month: 'short',
          day: 'numeric'
        })
      });
    }
  }

  const getIndexColor = (index: string) => {
    switch (index) {
      case 'NDVI': return '#22c55e'; // green
      case 'NDRE': return '#eab308'; // yellow
      case 'NDMI': return '#3b82f6'; // blue
      case 'GCI': return '#10b981'; // emerald
      case 'SAVI': return '#f59e0b'; // amber
      default: return '#6366f1'; // indigo
    }
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
          {/* Chart area background */}
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
            <line
              key={i}
              x1={margin.left}
              y1={margin.top + tick.y}
              x2={margin.left + chartWidth}
              y2={margin.top + tick.y}
              stroke="#f3f4f6"
              strokeWidth="1"
              className="dark:stroke-gray-700"
            />
          ))}

          {/* Y-axis */}
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + chartHeight}
            stroke="#374151"
            strokeWidth="2"
            className="dark:stroke-gray-400"
          />

          {/* X-axis */}
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
              key={i}
              x={margin.left - 10}
              y={margin.top + tick.y + 4}
              textAnchor="end"
              fontSize="12"
              fill="#6b7280"
              className="dark:fill-gray-400"
            >
              {tick.value.toFixed(2)}
            </text>
          ))}

          {/* X-axis labels */}
          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={margin.left + tick.x}
              y={margin.top + chartHeight + 20}
              textAnchor="middle"
              fontSize="12"
              fill="#6b7280"
              className="dark:fill-gray-400"
            >
              {tick.date}
            </text>
          ))}

          {/* Data line */}
          <path
            d={pathData}
            fill="none"
            stroke={getIndexColor(index)}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {points.map((point, i) => (
            <g key={i}>
              <circle
                cx={margin.left + point.x}
                cy={margin.top + point.y}
                r="4"
                fill={getIndexColor(index)}
                stroke="white"
                strokeWidth="2"
                className="hover:r-6 cursor-pointer"
              >
                <title>
                  {new Date(point.date).toLocaleDateString('fr-FR')} - {point.value.toFixed(3)}
                </title>
              </circle>
            </g>
          ))}

          {/* Chart title */}
          <text
            x={width / 2}
            y={15}
            textAnchor="middle"
            fontSize="14"
            fontWeight="600"
            fill="#374151"
            className="dark:fill-gray-300"
          >
            {index} - Évolution temporelle
          </text>

          {/* Y-axis label */}
          <text
            x={15}
            y={height / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
            className="dark:fill-gray-400"
            transform={`rotate(-90, 15, ${height / 2})`}
          >
            Valeur {index}
          </text>
        </svg>
      </div>
    </div>
  );
};

export default TimeSeriesChart;