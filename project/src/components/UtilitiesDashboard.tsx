
import { LineChart, Line, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, PieChart, Activity } from 'lucide-react';

interface UtilitiesDashboardProps {
  chartData: {
    monthlyTrend: any[];
    costByType: any[];
    consumptionData: any[];
  };
  utilities: any[];
  currency: string;
}

const UtilitiesDashboard = ({ chartData, utilities, currency }: UtilitiesDashboardProps) => {
  return (
    <div className="space-y-6">
      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Cost Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Évolution mensuelle des coûts
            </h3>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </div>
          {chartData.monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: any, name: string) => [
                    `${value} ${currency}`,
                    name === 'amount' ? 'Montant' : 'Nombre'
                  ]}
                />
                <Legend />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="amount" />
                <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} name="count" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Aucune donnée disponible pour les 6 derniers mois
            </div>
          )}
        </div>

        {/* Cost Breakdown by Type */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Répartition par type de charge
            </h3>
            <PieChart className="h-5 w-5 text-green-500" />
          </div>
          {chartData.costByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Tooltip
                  formatter={(value: any) => [`${value} ${currency}`, 'Montant']}
                />
                <Legend />
                <Pie
                  dataKey="amount"
                  nameKey="label"
                  data={chartData.costByType}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ label, percent }: any) => `${label}: ${(percent * 100).toFixed(1)}%`}
                >
                  {chartData.costByType.map((entry, hueIdx) => (
                    <Cell key={`cell-${entry.label}`} fill={`hsl(${hueIdx * 45}, 70%, 60%)`} />
                  ))}
                </Pie>
              </RechartsPieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Aucune donnée de charges disponible
            </div>
          )}
        </div>
      </div>

      {/* Consumption Analysis */}
      {chartData.consumptionData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Analyse de la consommation et coût unitaire
            </h3>
            <Activity className="h-5 w-5 text-purple-500" />
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData.consumptionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip
                formatter={(value: any, name: string) => {
                  if (name === 'amount') return [`${value} ${currency}`, 'Montant'];
                  if (name === 'consumption') return [`${value}`, 'Consommation'];
                  if (name === 'unitCost') return [`${value} ${currency}/unité`, 'Coût unitaire'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="amount" fill="#3b82f6" name="amount" />
              <Bar dataKey="consumption" fill="#10b981" name="consumption" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Statistiques détaillées
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {chartData.costByType.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Types de charges</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {chartData.consumptionData.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Avec données de consommation</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {utilities.filter((u: any) => u.is_recurring).length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Charges récurrentes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {utilities.filter((u: any) => u.payment_status === 'overdue').length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">En retard</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtilitiesDashboard;
