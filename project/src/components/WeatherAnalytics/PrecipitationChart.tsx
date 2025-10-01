import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MonthlyWeatherData } from '../../services/weatherClimateService';

interface PrecipitationChartProps {
  data: MonthlyWeatherData[];
}

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

const PrecipitationChart: React.FC<PrecipitationChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        Aucune donnée de précipitations disponible
      </div>
    );
  }

  // Format data for chart
  const formattedData = data.map(d => ({
    month: new Date(d.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
    fullMonth: d.month,
    actual: Math.round(d.precipitation_total * 10) / 10,
    ltn: Math.round(d.precipitation_ltn * 10) / 10,
  }));

  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value} mm
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Précipitations Mensuelles
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={formattedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis
            dataKey="month"
            stroke="#6B7280"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#6B7280"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            label={{ value: 'mm', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar
            dataKey="actual"
            fill="#3B82F6"
            name="Actuel"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="ltn"
            fill="#9CA3AF"
            name="Normale (LTN)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PrecipitationChart;
