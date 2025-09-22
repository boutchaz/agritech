import React, { useState, useEffect } from 'react';
import { Satellite, TrendingUp, Download, Calendar, BarChart3, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useSatelliteIndices } from '../hooks/useSatelliteIndices';
import { TimeSeriesResponse, IndexCalculationResponse } from '../services/satelliteIndicesService';
import TimeSeriesChart from './TimeSeriesChart';

interface Parcel {
  id: string;
  name: string;
  boundary?: number[][];
}

interface SatelliteIndicesProps {
  parcel: Parcel;
}

const SatelliteIndices: React.FC<SatelliteIndicesProps> = ({ parcel }) => {
  const {
    calculateIndices,
    getTimeSeries,
    exportIndexMap,
    loading,
    error,
    availableIndices,
    loadAvailableIndices
  } = useSatelliteIndices();

  const [selectedIndex, setSelectedIndex] = useState<string>('NDVI');
  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '6m' | '1y'>('30d');
  const [indicesData, setIndicesData] = useState<IndexCalculationResponse | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'timeseries'>('current');

  useEffect(() => {
    loadAvailableIndices();
  }, [loadAvailableIndices]);

  useEffect(() => {
    if (availableIndices.length > 0 && !selectedIndex) {
      setSelectedIndex(availableIndices[0]);
    }
  }, [availableIndices, selectedIndex]);

  const getDateRange = (range: string) => {
    const endDate = new Date();
    const startDate = new Date();

    switch (range) {
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '6m':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
  };

  const handleCalculateCurrentIndices = async () => {
    if (!parcel.boundary || parcel.boundary.length === 0) {
      alert('Cette parcelle n\'a pas de limites géographiques définies. Veuillez d\'abord définir les limites sur la carte.');
      return;
    }

    try {
      const dateRange = getDateRange('30d'); // Last 30 days for current values
      const result = await calculateIndices(
        parcel.boundary,
        parcel.name,
        availableIndices,
        dateRange
      );
      setIndicesData(result);
    } catch (err) {
      console.error('Error calculating indices:', err);
    }
  };

  const handleGetTimeSeries = async () => {
    if (!parcel.boundary || parcel.boundary.length === 0) {
      alert('Cette parcelle n\'a pas de limites géographiques définies. Veuillez d\'abord définir les limites sur la carte.');
      return;
    }

    try {
      const dateRange = getDateRange(timeRange);
      const result = await getTimeSeries(
        parcel.boundary,
        parcel.name,
        selectedIndex,
        dateRange
      );
      setTimeSeriesData(result);
    } catch (err) {
      console.error('Error getting time series:', err);
    }
  };

  const handleExportMap = async () => {
    if (!parcel.boundary || parcel.boundary.length === 0) {
      alert('Cette parcelle n\'a pas de limites géographiques définies.');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await exportIndexMap(
        parcel.boundary,
        parcel.name,
        today,
        selectedIndex
      );

      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = result.download_url;
      link.download = `${parcel.name}_${selectedIndex}_${today}.tif`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting map:', err);
    }
  };

  const getIndexColor = (index: string, value: number) => {
    switch (index) {
      case 'NDVI':
        if (value > 0.6) return 'text-green-600 dark:text-green-400';
        if (value > 0.3) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getIndexDescription = (index: string) => {
    const descriptions: Record<string, string> = {
      NDVI: 'Indice de végétation différentiel normalisé - Santé générale de la végétation',
      NDRE: 'Indice de végétation différentiel normalisé rouge-bord - Stress végétal',
      NDMI: 'Indice d\'humidité différentiel normalisé - Contenu en eau',
      GCI: 'Indice de chlorophylle verte - Activité photosynthétique',
      SAVI: 'Indice de végétation ajusté au sol - Végétation clairsemée',
      MNDWI: 'Indice d\'eau différentiel normalisé modifié - Détection de l\'eau',
      OSAVI: 'Indice de végétation ajusté au sol optimisé',
      MSAVI2: 'Indice de végétation ajusté au sol modifié 2',
      PRI: 'Indice de réflectance photochimique',
      MSI: 'Indice de stress hydrique',
      MCARI: 'Indice de chlorophylle résistant à l\'atmosphère modifié',
      TCARI: 'Indice de chlorophylle résistant à l\'atmosphère transformé',
    };
    return descriptions[index] || 'Indice de végétation';
  };

  if (!parcel.boundary || parcel.boundary.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Satellite className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Indices Satellites
          </h3>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Limites géographiques non définies
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Veuillez d'abord définir les limites de cette parcelle sur la carte pour accéder aux données satellites.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Satellite className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Indices Satellites
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {availableIndices.map(index => (
              <option key={index} value={index}>{index}</option>
            ))}
          </select>
          <button
            onClick={() => window.location.reload()}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Actualiser"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'current'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="h-4 w-4 inline mr-2" />
          Valeurs Actuelles
        </button>
        <button
          onClick={() => setActiveTab('timeseries')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'timeseries'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="h-4 w-4 inline mr-2" />
          Série Temporelle
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
            <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Current Values Tab */}
      {activeTab === 'current' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getIndexDescription(selectedIndex)}
            </p>
            <button
              onClick={handleCalculateCurrentIndices}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              <span>Calculer</span>
            </button>
          </div>

          {indicesData && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {indicesData.indices.map((indexData) => (
                <div
                  key={indexData.index}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {indexData.index}
                  </div>
                  <div className={`text-2xl font-bold ${getIndexColor(indexData.index, indexData.value)}`}>
                    {indexData.value.toFixed(3)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {new Date(indexData.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Time Series Tab */}
      {activeTab === 'timeseries' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Période
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="30d">30 derniers jours</option>
                  <option value="90d">3 derniers mois</option>
                  <option value="6m">6 derniers mois</option>
                  <option value="1y">1 dernière année</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleGetTimeSeries}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
              <span>Charger Série</span>
            </button>
          </div>

          {timeSeriesData && (
            <div className="space-y-4">
              {/* Statistics */}
              {timeSeriesData.statistics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Moyenne</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {timeSeriesData.statistics.mean.toFixed(3)}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Médiane</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {timeSeriesData.statistics.median.toFixed(3)}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Min</div>
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {timeSeriesData.statistics.min.toFixed(3)}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Max</div>
                    <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                      {timeSeriesData.statistics.max.toFixed(3)}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Écart-type</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {timeSeriesData.statistics.std.toFixed(3)}
                    </div>
                  </div>
                </div>
              )}

              {/* Time Series Chart */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Graphique d'évolution
                  </h4>
                  <button
                    onClick={handleExportMap}
                    disabled={loading}
                    className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                  >
                    <Download className="h-3 w-3" />
                    <span>Exporter</span>
                  </button>
                </div>

                <TimeSeriesChart
                  data={timeSeriesData.data}
                  index={selectedIndex}
                />

                {/* Data table (collapsed by default) */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    Voir les données détaillées ({timeSeriesData.data.length} points)
                  </summary>
                  <div className="mt-2 max-h-64 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {timeSeriesData.data.map((point, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-800 rounded"
                        >
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(point.date).toLocaleDateString()}
                          </span>
                          <span className={`font-medium ${getIndexColor(selectedIndex, point.value)}`}>
                            {point.value.toFixed(3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SatelliteIndices;