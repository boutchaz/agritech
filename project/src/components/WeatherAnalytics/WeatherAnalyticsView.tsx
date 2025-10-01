import React, { useState } from 'react';
import { Calendar, Cloud, Droplets, TrendingUp } from 'lucide-react';
import { useWeatherAnalytics, TimeRange } from '../../hooks/useWeatherAnalytics';
import TemperatureCharts from './TemperatureCharts';
import PrecipitationChart from './PrecipitationChart';
import DryWetConditionsCharts from './DryWetConditionsCharts';

interface WeatherAnalyticsViewProps {
  parcelBoundary: number[][];
  parcelName: string;
}

const WeatherAnalyticsView: React.FC<WeatherAnalyticsViewProps> = ({
  parcelBoundary,
  parcelName,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('last-12-months');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDates, setShowCustomDates] = useState(false);

  const { data, loading, error } = useWeatherAnalytics({
    parcelBoundary,
    timeRange,
    customStartDate: showCustomDates ? customStartDate : undefined,
    customEndDate: showCustomDates ? customEndDate : undefined,
  });

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    setShowCustomDates(range === 'custom');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Chargement des analyses météorologiques...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Erreur de chargement
        </h3>
        <p className="text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Cloud className="h-7 w-7 text-blue-500" />
              Analyses Météo & Climatiques
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {parcelName} • Comparaison avec les normales climatiques
            </p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">Période d'analyse:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleTimeRangeChange('last-3-months')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === 'last-3-months'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              3 derniers mois
            </button>
            <button
              onClick={() => handleTimeRangeChange('last-6-months')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === 'last-6-months'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              6 derniers mois
            </button>
            <button
              onClick={() => handleTimeRangeChange('last-12-months')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === 'last-12-months'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              12 derniers mois
            </button>
            <button
              onClick={() => handleTimeRangeChange('ytd')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === 'ytd'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Année en cours
            </button>
            <button
              onClick={() => handleTimeRangeChange('custom')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === 'custom'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Personnalisée
            </button>
          </div>

          {/* Custom Date Range Inputs */}
          {showCustomDates && (
            <div className="flex gap-4 items-end mt-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {data && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Données du {new Date(data.start_date).toLocaleDateString('fr-FR')} au{' '}
              {new Date(data.end_date).toLocaleDateString('fr-FR')} •{' '}
              Localisation: {data.location.latitude.toFixed(4)}°, {data.location.longitude.toFixed(4)}°
            </p>
          )}
        </div>
      </div>

      {data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Température Moyenne
                </h3>
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {data.temperature_series.length > 0
                  ? (
                      data.temperature_series.reduce((sum, t) => sum + t.current_mean, 0) /
                      data.temperature_series.length
                    ).toFixed(1)
                  : 'N/A'}
                °C
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                Période analysée
              </p>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-cyan-900 dark:text-cyan-100">
                  Précipitations Totales
                </h3>
                <Droplets className="h-5 w-5 text-cyan-600" />
              </div>
              <p className="text-3xl font-bold text-cyan-900 dark:text-cyan-100">
                {data.monthly_precipitation.length > 0
                  ? data.monthly_precipitation
                      .reduce((sum, m) => sum + m.precipitation_total, 0)
                      .toFixed(0)
                  : 'N/A'}
                <span className="text-lg ml-1">mm</span>
              </p>
              <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-2">
                Période analysée
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
                  Jours de Pluie
                </h3>
                <Droplets className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                {data.monthly_precipitation.length > 0
                  ? data.monthly_precipitation.reduce((sum, m) => sum + m.wet_days_count, 0)
                  : 'N/A'}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                Jours avec &gt; 1mm
              </p>
            </div>
          </div>

          {/* Temperature Analysis Section */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-500" />
              Analyse des Températures
            </h3>
            <TemperatureCharts data={data.temperature_series} />
          </div>

          {/* Precipitation Analysis Section */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Droplets className="h-6 w-6 text-cyan-500" />
              Analyse des Précipitations
            </h3>
            <PrecipitationChart data={data.monthly_precipitation} />
          </div>

          {/* Dry/Wet Conditions Section */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Cloud className="h-6 w-6 text-amber-500" />
              Conditions Sèches & Humides
            </h3>
            <DryWetConditionsCharts data={data.monthly_precipitation} />
          </div>

          {/* Insights Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Analyses et Recommandations
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Les données sont comparées aux normales climatiques à long terme (LTN) pour
                  identifier les écarts significatifs par rapport aux conditions habituelles.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Un jour humide est défini comme un jour avec plus de 1mm de précipitations.
                  Les périodes sèches sont analysées pour optimiser la gestion de l'irrigation.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Les conditions de sécheresse (5 jours consécutifs avec moins de 5mm)
                  nécessitent une attention particulière pour la gestion hydrique des cultures.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center">
          <Cloud className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Sélectionnez une période pour afficher les analyses météorologiques
          </p>
        </div>
      )}
    </div>
  );
};

export default WeatherAnalyticsView;
