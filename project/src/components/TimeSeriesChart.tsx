
import { TimeSeriesPoint } from '../services/satelliteIndicesService';

export interface TemperatureDataPoint {
  date: string;
  temperature: number; // Temperature at 11:00 (satellite pass time)
  temp_min?: number;
  temp_max?: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  index: string;
  width?: number;
  height?: number;
  temperatureData?: TemperatureDataPoint[];
  showTemperature?: boolean;
}

const TimeSeriesChart = ({
  data,
  index,
  width = 600,
  height = 300,
  temperatureData = [],
  showTemperature = false,
}: TimeSeriesChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        Aucune donnée à afficher
      </div>
    );
  }

  // Adjust right margin for temperature axis
  const margin = { top: 20, right: showTemperature ? 70 : 30, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate scales for index values
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  const dates = data.filter(d => d && d.date).map(d => new Date(d.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const dateRange = maxDate - minDate || 1;

  // Calculate temperature scales if temperature data is provided
  const tempValues = temperatureData.map(d => d.temperature);
  const minTemp = tempValues.length > 0 ? Math.min(...tempValues) - 5 : 0;
  const maxTemp = tempValues.length > 0 ? Math.max(...tempValues) + 5 : 40;
  const tempRange = maxTemp - minTemp || 1;

  // Match temperature data to satellite dates
  const matchedTemperatures = data.map(point => {
    const tempMatch = temperatureData.find(t => {
      const pointDate = new Date(point.date).toISOString().split('T')[0];
      const tempDate = new Date(t.date).toISOString().split('T')[0];
      return pointDate === tempDate;
    });
    return tempMatch ? { ...tempMatch, date: point.date } : null;
  }).filter(t => t !== null) as TemperatureDataPoint[];

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
    .map((point, _i) => {
      const x = (new Date(point.date).getTime() - minDate) / dateRange * chartWidth;
      const y = chartHeight - ((point.value - minValue) / valueRange * chartHeight);
      return { x, y, ...point };
    });

  // Create temperature path and points if showing temperature
  const tempPathData = showTemperature && matchedTemperatures.length > 0
    ? matchedTemperatures
        .map((point, i) => {
          const x = (new Date(point.date).getTime() - minDate) / dateRange * chartWidth;
          const y = chartHeight - ((point.temperature - minTemp) / tempRange * chartHeight);
          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ')
    : '';

  const tempPoints = showTemperature && matchedTemperatures.length > 0
    ? matchedTemperatures.map((point) => {
        const x = (new Date(point.date).getTime() - minDate) / dateRange * chartWidth;
        const y = chartHeight - ((point.temperature - minTemp) / tempRange * chartHeight);
        return { x, y, ...point };
      })
    : [];

  // Generate y-axis ticks (left - index values)
  const yTicks = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const value = minValue + (valueRange * i / tickCount);
    const y = chartHeight - (i / tickCount * chartHeight);
    yTicks.push({ value, y });
  }

  // Generate temperature y-axis ticks (right)
  const tempTicks = [];
  for (let i = 0; i <= tickCount; i++) {
    const value = minTemp + (tempRange * i / tickCount);
    const y = chartHeight - (i / tickCount * chartHeight);
    tempTicks.push({ value, y });
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
      case 'MNDWI': return '#06b6d4'; // cyan
      case 'GCI': return '#10b981'; // emerald
      case 'SAVI': return '#f59e0b'; // amber
      case 'OSAVI': return '#8b5cf6'; // violet
      case 'MSAVI2': return '#ec4899'; // pink
      case 'NIRv': return '#f97316'; // orange
      case 'EVI': return '#0ea5e9'; // sky
      case 'NIRvP': return '#9333ea'; // violet
      case 'MSI': return '#ef4444'; // red
      case 'MCARI': return '#a855f7'; // purple
      case 'TCARI': return '#14b8a6'; // teal
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
          {yTicks.map((tick, tickIdx) => (
            <line
              key={"tick-" + tickIdx}
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

          {/* Y-axis labels (left - index values) */}
          {yTicks.map((tick, tickIdx) => (
            <text
              key={"tick-" + tickIdx}
              x={margin.left - 10}
              y={margin.top + tick.y + 4}
              textAnchor="end"
              fontSize="12"
              fill={getIndexColor(index)}
            >
              {tick.value.toFixed(2)}
            </text>
          ))}

          {/* Temperature Y-axis (right) */}
          {showTemperature && (
            <>
              <line
                x1={margin.left + chartWidth}
                y1={margin.top}
                x2={margin.left + chartWidth}
                y2={margin.top + chartHeight}
                stroke="#ef4444"
                strokeWidth="2"
              />
              {tempTicks.map((tick, tempIdx) => (
                <text
                  key={`temp-${tempIdx}`}
                  x={margin.left + chartWidth + 10}
                  y={margin.top + tick.y + 4}
                  textAnchor="start"
                  fontSize="12"
                  fill="#ef4444"
                >
                  {tick.value.toFixed(0)}°C
                </text>
              ))}
            </>
          )}

          {/* X-axis labels */}
          {xTicks.map((tick, gridIdx) => (
            <text
              key={"grid-" + gridIdx}
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

          {/* Temperature line (render first so index line is on top) */}
          {showTemperature && tempPathData && (
            <path
              d={tempPathData}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray="5,3"
              opacity="0.8"
            />
          )}

          {/* Index data line */}
          <path
            d={pathData}
            fill="none"
            stroke={getIndexColor(index)}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Temperature points */}
          {showTemperature && tempPoints.map((point, tempPtIdx) => (
            <g key={`temp-point-${tempPtIdx}`}>
              <circle
                cx={margin.left + point.x}
                cy={margin.top + point.y}
                r="3"
                fill="#ef4444"
                stroke="white"
                strokeWidth="1"
                opacity="0.8"
              >
                <title>
                  {new Date(point.date).toLocaleDateString('fr-FR')} - {point.temperature.toFixed(1)}°C
                </title>
              </circle>
            </g>
          ))}

          {/* Index data points */}
          {points.map((point, barIdx) => (
            <g key={"bar-" + barIdx}>
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
            fill={getIndexColor(index)}
            transform={`rotate(-90, 15, ${height / 2})`}
          >
            Valeur {index}
          </text>

          {/* Temperature Y-axis label */}
          {showTemperature && (
            <text
              x={width - 15}
              y={height / 2}
              textAnchor="middle"
              fontSize="12"
              fill="#ef4444"
              transform={`rotate(90, ${width - 15}, ${height / 2})`}
            >
              Température (°C)
            </text>
          )}
        </svg>

        {/* Legend */}
        {showTemperature && (
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5" style={{ backgroundColor: getIndexColor(index) }} />
              <span className="text-gray-700 dark:text-gray-300">{index}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5" style={{ backgroundColor: '#ef4444', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ef4444' }} />
              <span className="text-gray-700 dark:text-gray-300">Température (11h)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeSeriesChart;
