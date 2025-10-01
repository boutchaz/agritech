import React from 'react';
import { ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { MonthlyWeatherData } from '../../services/weatherClimateService';

interface DryWetConditionsChartsProps {
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

const DryWetConditionsCharts: React.FC<DryWetConditionsChartsProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        Aucune donnée de conditions sèches/humides disponible
      </div>
    );
  }

  // Format data for charts
  const wetDaysData = data.map(d => ({
    month: new Date(d.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
    actual: Math.round(d.wet_days_count),
    ltn: Math.round(d.wet_days_ltn * 10) / 10,
    deficit: Math.round(d.wet_days_count - d.wet_days_ltn),
  }));

  const dryDaysData = data.map(d => ({
    month: new Date(d.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
    actual: Math.round(d.dry_days_count),
    ltn: Math.round(d.dry_days_ltn * 10) / 10,
    deficit: Math.round(d.dry_days_count - d.dry_days_ltn),
  }));

  const drySpellData = data.map(d => ({
    month: new Date(d.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
    actual: Math.round(d.dry_spell_conditions_count),
    ltn: Math.round(d.dry_spell_conditions_ltn * 10) / 10,
    deficit: Math.round(d.dry_spell_conditions_count - d.dry_spell_conditions_ltn),
  }));

  const shortDrySpellData = data.map(d => ({
    month: new Date(d.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
    actual: Math.round(d.short_dry_spells_count),
    ltn: Math.round(d.short_dry_spells_ltn * 10) / 10,
    deficit: Math.round(d.short_dry_spells_count - d.short_dry_spells_ltn),
  }));

  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Wet Days Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Analyse des Jours Humides (Jours avec &gt; 1mm)
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={wetDaysData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              label={{ value: 'Jours', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="actual" fill="#3B82F6" name="Actuel" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="ltn" stroke="#9CA3AF" strokeWidth={2} name="Normale (LTN)" dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Deficit/Excess */}
        <div className="mt-6">
          <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200">
            Déficit/Excès
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={wetDaysData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis
                dataKey="month"
                stroke="#6B7280"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} />
              <Bar
                dataKey="deficit"
                fill="#10B981"
                name="Déficit/Excès"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dry Days Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Analyse des Jours Secs
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={dryDaysData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              label={{ value: 'Jours', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="actual" fill="#F59E0B" name="Actuel" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="ltn" stroke="#9CA3AF" strokeWidth={2} name="Normale (LTN)" dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Deficit/Excess */}
        <div className="mt-6">
          <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200">
            Déficit/Excès
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dryDaysData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis
                dataKey="month"
                stroke="#6B7280"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} />
              <Bar
                dataKey="deficit"
                fill="#F59E0B"
                name="Déficit/Excès"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dry Spell Conditions (5 days < 5mm) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Conditions de Sécheresse (5 jours avec &lt; 5mm)
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={drySpellData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              label={{ value: 'Occurrences', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="actual" fill="#EF4444" name="Actuel" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="ltn" stroke="#9CA3AF" strokeWidth={2} name="Normale (LTN)" dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Deficit/Excess */}
        <div className="mt-6">
          <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200">
            Déficit/Excès
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={drySpellData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis
                dataKey="month"
                stroke="#6B7280"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} />
              <Bar
                dataKey="deficit"
                fill="#EF4444"
                name="Déficit/Excès"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Short Dry Spells (1-3 days) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Périodes Sèches Courtes (1-3 jours consécutifs)
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={shortDrySpellData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              label={{ value: 'Occurrences', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="actual" fill="#8B5CF6" name="Actuel" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="ltn" stroke="#9CA3AF" strokeWidth={2} name="Normale (LTN)" dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Deficit/Excess */}
        <div className="mt-6">
          <h4 className="text-md font-medium mb-3 text-gray-800 dark:text-gray-200">
            Déficit/Excès
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={shortDrySpellData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis
                dataKey="month"
                stroke="#6B7280"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#6B7280" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#6B7280" strokeWidth={2} />
              <Bar
                dataKey="deficit"
                fill="#8B5CF6"
                name="Déficit/Excès"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DryWetConditionsCharts;
