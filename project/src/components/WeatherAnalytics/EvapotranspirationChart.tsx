import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { EvapotranspirationTimeSeries, MonthlyEvapotranspirationData } from '../../services/weatherClimateService';

interface EvapotranspirationChartProps {
  dailyData: EvapotranspirationTimeSeries[];
  monthlyData: MonthlyEvapotranspirationData[];
}

const EvapotranspirationChart: React.FC<EvapotranspirationChartProps> = ({
  dailyData,
  monthlyData,
}) => {
  const { t } = useTranslation();

  // Format daily data for the line chart
  const formattedDailyData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return [];

    // Compute 7-day moving average
    return dailyData.map((d, i) => {
      const windowStart = Math.max(0, i - 6);
      const window = dailyData.slice(windowStart, i + 1);
      const avg7d = window.reduce((sum, w) => sum + w.et0, 0) / window.length;

      return {
        date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        fullDate: d.date,
        et0: Math.round(d.et0 * 10) / 10,
        et0_7d_avg: Math.round(avg7d * 10) / 10,
      };
    });
  }, [dailyData]);

  // Format monthly data for the bar chart
  const formattedMonthlyData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return [];
    return monthlyData.map((m) => ({
      month: new Date(m.month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      fullMonth: m.month,
      et0_total: m.et0_total,
      et0_avg: m.et0_avg,
      days_count: m.days_count,
    }));
  }, [monthlyData]);

  // Summary stats
  const stats = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return null;
    const values = dailyData.map((d) => d.et0);
    const total = values.reduce((a, b) => a + b, 0);
    const avg = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return {
      total: Math.round(total * 10) / 10,
      avg: Math.round(avg * 10) / 10,
      max: Math.round(max * 10) / 10,
      min: Math.round(min * 10) / 10,
    };
  }, [dailyData]);

  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        {t('weather.et.noData', 'No evapotranspiration data available')}
      </div>
    );
  }

  interface TooltipPayload {
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
  }

  const DailyTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value} mm/j
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const MonthlyTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value} {entry.dataKey === 'et0_total' ? 'mm' : 'mm/j'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* ET Info Card */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-5 border border-orange-200 dark:border-orange-800">
        <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2">
          {t('weather.et.whatIsET', 'What is Evapotranspiration (ET)?')}
        </h4>
        <p className="text-sm text-orange-800 dark:text-orange-200 leading-relaxed">
          {t(
            'weather.et.description',
            'Evapotranspiration (ET) is the total water loss from land to the atmosphere, combining evaporation (water turning into vapor from soil, water bodies, or wet surfaces) and transpiration (water released by plants through their leaves). ET₀ (reference ET) is key for irrigation planning.'
          )}
        </p>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('weather.et.totalET', 'Total ET₀')}
            </p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.total}<span className="text-sm ml-1">mm</span>
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('weather.et.avgDaily', 'Avg. Daily ET₀')}
            </p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.avg}<span className="text-sm ml-1">mm/j</span>
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('weather.et.maxDaily', 'Max Daily ET₀')}
            </p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.max}<span className="text-sm ml-1">mm/j</span>
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('weather.et.minDaily', 'Min Daily ET₀')}
            </p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.min}<span className="text-sm ml-1">mm/j</span>
            </p>
          </div>
        </div>
      )}

      {/* Daily ET0 Line Chart with 7-day moving average */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {t('weather.et.dailyChart', 'Daily Reference Evapotranspiration (ET₀)')}
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={formattedDailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
            <XAxis
              dataKey="date"
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#6B7280"
              tick={{ fill: '#6B7280', fontSize: 12 }}
              label={{ value: 'mm/j', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
            />
            <Tooltip content={<DailyTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Area
              type="monotone"
              dataKey="et0"
              fill="#FDBA74"
              fillOpacity={0.3}
              stroke="#F97316"
              strokeWidth={1}
              name={t('weather.et.dailyET0', 'Daily ET₀')}
            />
            <Line
              type="monotone"
              dataKey="et0_7d_avg"
              stroke="#DC2626"
              strokeWidth={2.5}
              dot={false}
              name={t('weather.et.movingAvg', '7-day Moving Avg.')}
            />
            {stats && (
              <ReferenceLine
                y={stats.avg}
                stroke="#9CA3AF"
                strokeDasharray="5 5"
                label={{
                  value: `Avg: ${stats.avg} mm/j`,
                  position: 'right',
                  fill: '#9CA3AF',
                  fontSize: 11,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly ET0 Bar Chart */}
      {formattedMonthlyData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {t('weather.et.monthlyChart', 'Monthly Evapotranspiration (ET₀)')}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedMonthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
              <XAxis
                dataKey="month"
                stroke="#6B7280"
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis
                stroke="#6B7280"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                label={{ value: 'mm', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
              />
              <Tooltip content={<MonthlyTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar
                dataKey="et0_total"
                fill="#F97316"
                radius={[4, 4, 0, 0]}
                name={t('weather.et.monthlyTotal', 'Monthly Total ET₀ (mm)')}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Irrigation insight */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
        <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {t(
              'weather.et.irrigationInsight',
              'ET₀ represents the water demand of the atmosphere. Multiply ET₀ by the crop coefficient (Kc) to estimate actual crop water needs (ETc = ET₀ × Kc). Higher ET₀ values indicate greater irrigation requirements.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EvapotranspirationChart;
