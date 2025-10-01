import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TemperatureTimeSeries } from '../../services/weatherClimateService';

interface TemperatureChartsProps {
  data: TemperatureTimeSeries[];
}

const TemperatureCharts: React.FC<TemperatureChartsProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        Aucune donnée de température disponible
      </div>
    );
  }

  // Format data for charts
  const formattedData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
    fullDate: d.date,
    currentMin: Math.round(d.current_min * 10) / 10,
    ltnMin: Math.round(d.ltn_min * 10) / 10,
    currentMean: Math.round(d.current_mean * 10) / 10,
    ltnMean: Math.round(d.ltn_mean * 10) / 10,
    currentMax: Math.round(d.current_max * 10) / 10,
    ltnMax: Math.round(d.ltn_max * 10) / 10,
  }));

  interface TooltipPayload {
    name: string;
    value: number;
    color: string;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
  }

  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}°C
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Minimum Temperature Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Température Minimale
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis
              dataKey="date"
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              label={{ value: '°C', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line
              type="monotone"
              dataKey="currentMin"
              stroke="#3B82F6"
              strokeWidth={2}
              name="Actuel"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="ltnMin"
              stroke="#9CA3AF"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Normale (LTN)"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Mean Temperature Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Température Moyenne
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis
              dataKey="date"
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              label={{ value: '°C', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line
              type="monotone"
              dataKey="currentMean"
              stroke="#10B981"
              strokeWidth={2}
              name="Actuel"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="ltnMean"
              stroke="#9CA3AF"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Normale (LTN)"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Maximum Temperature Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Température Maximale
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis
              dataKey="date"
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              label={{ value: '°C', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line
              type="monotone"
              dataKey="currentMax"
              stroke="#EF4444"
              strokeWidth={2}
              name="Actuel"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="ltnMax"
              stroke="#9CA3AF"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Normale (LTN)"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TemperatureCharts;
