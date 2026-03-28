import { createFileRoute } from '@tanstack/react-router';
import { useState, lazy, Suspense } from 'react';
import { Satellite, TrendingUp, BarChart3, MapPin, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useParcels } from '@/hooks/useParcels';
import { IndexCalculationResponse } from '@/lib/satellite-api';
import { useCan } from '@/lib/casl';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

// Lazy load heavy satellite components (ECharts + Recharts ~1.6MB)
const IndicesCalculator = lazy(() => import('@/components/SatelliteAnalysisView/IndicesCalculator'));
const TimeSeriesChart = lazy(() => import('@/components/SatelliteAnalysisView/TimeSeriesChart'));

function SatelliteAnalysisPage() {
  const { t } = useTranslation();
  const { currentFarm } = useAuth();
  const { can } = useCan();
  const navigate = useNavigate();
  const farmId = currentFarm?.id ?? null;
  const { parcels, loading: parcelsLoading } = useParcels(farmId);

  const [selectedParcelId, setSelectedParcelId] = useState<string>('');
  const [calculationResults, setCalculationResults] = useState<IndexCalculationResponse | null>(null);

  const selectedParcel = parcels.find(p => p.id === selectedParcelId);

  const handleParcelSelect = (parcelId: string) => {
    setSelectedParcelId(parcelId);
    setCalculationResults(null);
  };

  const handleResultsUpdate = (results: IndexCalculationResponse) => {
    setCalculationResults(results);
  };

  // Check if user has access to satellite features
  if (!can('create', 'SatelliteReport')) {
    return (
      <div className="p-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('production.satelliteAnalysis.proFeatureTitle')}
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            {t('production.satelliteAnalysis.proFeatureDescription')}
          </p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <Satellite className="w-4 h-4 text-blue-600" />
              <span>{t('production.satelliteAnalysis.featureRealtime')}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>{t('production.satelliteAnalysis.featureVegetation')}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>{t('production.satelliteAnalysis.featureHistorical')}</span>
            </div>
          </div>
          <Button
            onClick={() => navigate({ to: '/settings/subscription' })}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
          >
            {t('production.satelliteAnalysis.upgradeButton')}
            <span>→</span>
          </Button>
        </div>
      </div>
    );
  }

  if (!currentFarm) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-yellow-800 font-medium">{t('production.satelliteAnalysis.noFarmTitle')}</h4>
            <p className="text-yellow-700">{t('production.satelliteAnalysis.noFarmMessage')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between" data-tour="satellite-map">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Satellite className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">{t('production.satelliteAnalysis.title')}</h1>
          </div>
          <p className="text-gray-600">
            {t('production.satelliteAnalysis.subtitle')}
          </p>
        </div>
      </div>

      {/* Farm Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-900">{t('production.satelliteAnalysis.currentFarmLabel')}:</span>
          <span className="text-blue-800">{currentFarm.name}</span>
        </div>
        <p className="text-blue-700 text-sm">
          {currentFarm.location && `${currentFarm.location} • `}
          {t('production.satelliteAnalysis.parcelsAvailable', { count: parcels.length })}
        </p>
      </div>

      {/* Parcel Selection */}
      <div className="bg-white rounded-lg shadow p-6" data-tour="satellite-indices">
        <h2 className="text-lg font-semibold mb-4">{t('production.satelliteAnalysis.selectParcelTitle')}</h2>

        {parcelsLoading ? (
          <div className="text-gray-500">{t('production.satelliteAnalysis.loadingParcels')}</div>
        ) : parcels.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-600">{t('production.satelliteAnalysis.noParcelsTitle')}</p>
            <p className="text-sm text-gray-500 mt-1">
              {t('production.satelliteAnalysis.noParcelsMessage')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {parcels.map((parcel) => (
              <div
                key={parcel.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedParcelId === parcel.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleParcelSelect(parcel.id)}
              >
                <h3 className="font-medium text-gray-900">{parcel.name}</h3>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  {parcel.area && (
                    <p>{t('production.satelliteAnalysis.areaLabel')}: {parcel.area} {parcel.area_unit || t('production.satelliteAnalysis.hectares')}</p>
                  )}
                  {parcel.soil_type && (
                    <p>{t('production.satelliteAnalysis.soilLabel')}: {parcel.soil_type}</p>
                  )}
                  {parcel.irrigation_type && (
                    <p>{t('production.satelliteAnalysis.irrigationLabel')}: {parcel.irrigation_type}</p>
                  )}
                </div>

                {/* Boundary availability indicator */}
                <div className="mt-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    parcel.boundary ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs text-gray-500">
                    {parcel.boundary ? t('production.satelliteAnalysis.boundaryDefined') : t('production.satelliteAnalysis.noBoundary')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analysis Tools */}
      {selectedParcel && selectedParcel.boundary && (
        <div className="space-y-8">
          {/* Vegetation Indices Calculator */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <h2 className="text-xl font-semibold">{t('production.satelliteAnalysis.vegetationIndicesTitle')}</h2>
            </div>
            <Suspense fallback={
              <div className="flex items-center justify-center p-12 bg-white rounded-lg shadow">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">{t('production.satelliteAnalysis.loadingAnalysisTools')}</span>
              </div>
            }>
              <IndicesCalculator
                parcelName={selectedParcel.name}
                boundary={selectedParcel.boundary}
                onResultsUpdate={handleResultsUpdate}
              />
            </Suspense>
          </div>

          {/* Time Series Analysis */}
          <div data-tour="satellite-timeline">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">{t('production.satelliteAnalysis.historicalTrendsTitle')}</h2>
            </div>
            <Suspense fallback={
              <div className="flex items-center justify-center p-12 bg-white rounded-lg shadow">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">{t('production.satelliteAnalysis.loadingHistoricalData')}</span>
              </div>
            }>
              <TimeSeriesChart
                parcelId={selectedParcel.id}
                parcelName={selectedParcel.name}
                boundary={selectedParcel.boundary}
              />
            </Suspense>
          </div>

          {/* Analysis Summary */}
          {calculationResults && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">{t('production.satelliteAnalysis.analysisSummaryTitle')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">{t('production.satelliteAnalysis.latestResultsTitle')}</h3>
                  <div className="space-y-2">
                    {calculationResults.indices.map((result, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-600">{result.index}:</span>
                        <span className="font-medium">{result.value.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-3">{t('production.satelliteAnalysis.parcelInfoTitle')}</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">{t('production.satelliteAnalysis.nameLabel')}:</span> {selectedParcel.name}</p>
                    <p><span className="text-gray-600">{t('production.satelliteAnalysis.areaLabel')}:</span> {selectedParcel.area} {selectedParcel.area_unit || t('production.satelliteAnalysis.hectares')}</p>
                    {selectedParcel.soil_type && (
                      <p><span className="text-gray-600">{t('production.satelliteAnalysis.soilTypeLabel')}:</span> {selectedParcel.soil_type}</p>
                    )}
                    {selectedParcel.irrigation_type && (
                      <p><span className="text-gray-600">{t('production.satelliteAnalysis.irrigationLabel')}:</span> {selectedParcel.irrigation_type}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No boundary warning */}
      {selectedParcel && !selectedParcel.boundary && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-yellow-800 font-medium">{t('production.satelliteAnalysis.boundaryRequiredTitle')}</h4>
              <p className="text-yellow-700">
                {t('production.satelliteAnalysis.boundaryRequiredMessage', { parcelName: selectedParcel.name })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(production)/production/satellite-analysis')({
  component: SatelliteAnalysisPage,
});