
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import type { AIReportSections } from '../../lib/api/ai-reports';

interface AIReportChartsProps {
  sections: AIReportSections;
  satelliteTimeSeries?: Array<{ date: string; ndvi?: number; ndmi?: number }>;
  yieldHistory?: Array<{ season: string; year: number; yieldPerHa: number }>;
  weatherData?: {
    period: { start: string; end: string };
    temperatureSummary: { avgMin: number; avgMax: number; avgMean: number };
    precipitationTotal: number;
  };
}

const COLORS = {
  primary: '#10b981', // green
  secondary: '#3b82f6', // blue
  warning: '#f59e0b', // amber
  danger: '#ef4444', // red
  purple: '#8b5cf6',
  teal: '#14b8a6',
};

export const HealthScoreRadarChart = ({ sections }: { sections: AIReportSections }) => {
  const health = sections.healthAssessment;
  if (!health) return null;

  // Extract scores from health assessments (simplified - you might want to parse actual scores)
  const parseScore = (text: string): number => {
    // Try to extract numbers from text, default to 50 if not found
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : 50;
  };

  const data = [
    { category: 'Sol', score: parseScore(health.soilHealth || '50'), fullMark: 100 },
    { category: 'Végétation', score: parseScore(health.vegetationHealth || '50'), fullMark: 100 },
    { category: 'Eau', score: parseScore(health.waterStatus || '50'), fullMark: 100 },
    { category: 'Global', score: health.overallScore, fullMark: 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="category" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        <Radar
          name="Score"
          dataKey="score"
          stroke={COLORS.primary}
          fill={COLORS.primary}
          fillOpacity={0.6}
        />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export const RecommendationPriorityChart = ({ sections }: { sections: AIReportSections }) => {
  if (!sections.recommendations || sections.recommendations.length === 0) return null;

  const priorityCounts = sections.recommendations.reduce(
    (acc, rec) => {
      acc[rec.priority] = (acc[rec.priority] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const data = [
    { name: 'Haute', value: priorityCounts.high || 0, color: COLORS.danger },
    { name: 'Moyenne', value: priorityCounts.medium || 0, color: COLORS.warning },
    { name: 'Basse', value: priorityCounts.low || 0, color: COLORS.primary },
  ].filter((item) => item.value > 0);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={`cell-${entry.name}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

export const RecommendationCategoryChart = ({ sections }: { sections: AIReportSections }) => {
  if (!sections.recommendations || sections.recommendations.length === 0) return null;

  const categoryCounts = sections.recommendations.reduce(
    (acc, rec) => {
      const category = rec.category.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const data = Object.entries(categoryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" width={100} />
        <Tooltip />
        <Bar dataKey="value" fill={COLORS.secondary} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const SatelliteIndicesChart = ({ timeSeries }: { timeSeries?: Array<{ date: string; ndvi?: number; ndmi?: number }>; }) => {
  if (!timeSeries || timeSeries.length === 0) return null;

  const data = timeSeries
    .map((item) => ({
      date: new Date(item.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
      NDVI: item.ndvi ? Number(item.ndvi.toFixed(3)) : null,
      NDMI: item.ndmi ? Number(item.ndmi.toFixed(3)) : null,
    }))
    .filter((item) => item.NDVI !== null || item.NDMI !== null);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
        <YAxis domain={[0, 1]} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="NDVI"
          stroke={COLORS.primary}
          strokeWidth={2}
          dot={{ r: 4 }}
          name="NDVI (Vigueur végétale)"
        />
        <Line
          type="monotone"
          dataKey="NDMI"
          stroke={COLORS.secondary}
          strokeWidth={2}
          dot={{ r: 4 }}
          name="NDMI (Teneur en eau)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const YieldHistoryChart = ({ yieldHistory }: { yieldHistory?: Array<{ season: string; year: number; yieldPerHa: number }>; }) => {
  if (!yieldHistory || yieldHistory.length === 0) return null;

  const data = yieldHistory
    .map((item) => ({
      label: `${item.year} ${item.season || ''}`.trim(),
      yield: Number(item.yieldPerHa.toFixed(1)),
    }))
    .reverse(); // Show oldest to newest

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} />
        <YAxis label={{ value: 'Rendement (kg/ha)', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value: number) => `${value.toFixed(1)} kg/ha`} />
        <Bar dataKey="yield" fill={COLORS.primary} name="Rendement" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export const RiskSeverityChart = ({ sections }: { sections: AIReportSections }) => {
  if (!sections.riskAlerts || sections.riskAlerts.length === 0) return null;

  const severityCounts = sections.riskAlerts.reduce(
    (acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const data = [
    { name: 'Critique', value: severityCounts.critical || 0, color: COLORS.danger },
    { name: 'Avertissement', value: severityCounts.warning || 0, color: COLORS.warning },
    { name: 'Info', value: severityCounts.info || 0, color: COLORS.secondary },
  ].filter((item) => item.value > 0);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill={COLORS.danger}>
          {data.map((entry) => (
            <Cell key={`cell-${entry.name}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export const AIReportCharts = ({
  sections,
  satelliteTimeSeries,
  yieldHistory,
  weatherData: _weatherData,
}: AIReportChartsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Health Score Radar Chart */}
      {sections.healthAssessment && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Analyse de Santé (Radar)
          </h3>
          <HealthScoreRadarChart sections={sections} />
        </div>
      )}

      {/* Recommendation Priority Distribution */}
      {sections.recommendations && sections.recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Distribution des Priorités
          </h3>
          <RecommendationPriorityChart sections={sections} />
        </div>
      )}

      {/* Recommendation Categories */}
      {sections.recommendations && sections.recommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Catégories de Recommandations
          </h3>
          <RecommendationCategoryChart sections={sections} />
        </div>
      )}

      {/* Satellite Indices Trend */}
      {satelliteTimeSeries && satelliteTimeSeries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Évolution des Indices Satellitaires
          </h3>
          <SatelliteIndicesChart timeSeries={satelliteTimeSeries} />
        </div>
      )}

      {/* Yield History */}
      {yieldHistory && yieldHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Historique des Rendements
          </h3>
          <YieldHistoryChart yieldHistory={yieldHistory} />
        </div>
      )}

      {/* Risk Severity Distribution */}
      {sections.riskAlerts && sections.riskAlerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Distribution des Alertes
          </h3>
          <RiskSeverityChart sections={sections} />
        </div>
      )}
    </div>
  );
};
