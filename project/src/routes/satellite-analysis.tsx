import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Satellite, TrendingUp, BarChart3, MapPin, Lock } from 'lucide-react';
import IndicesCalculator from '../components/SatelliteAnalysis/IndicesCalculator';
import TimeSeriesChart from '../components/SatelliteAnalysis/TimeSeriesChart';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { useParcels } from '../hooks/useParcels';
import { IndexCalculationResponse } from '../lib/satellite-api';
import { useCan } from '../lib/casl';
import { useNavigate } from '@tanstack/react-router';

function SatelliteAnalysisPage() {
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
            Satellite Analysis - Professional Feature
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Unlock powerful satellite imagery analysis to monitor crop health, vegetation indices (NDVI, NDWI),
            and get data-driven insights for precision agriculture.
          </p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <Satellite className="w-4 h-4 text-blue-600" />
              <span>Real-time satellite imagery analysis</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Vegetation health monitoring (NDVI, NDWI, EVI)</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Historical trends and time-series analysis</span>
            </div>
          </div>
          <button
            onClick={() => navigate({ to: '/settings/subscription' })}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
          >
            Upgrade to Professional
            <span>→</span>
          </button>
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
            <h4 className="text-yellow-800 font-medium">No Farm Selected</h4>
            <p className="text-yellow-700">Please select a farm to access satellite analysis features.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Satellite className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Satellite Analysis</h1>
          </div>
          <p className="text-gray-600">
            Analyze vegetation health and crop conditions using satellite imagery
          </p>
        </div>
      </div>

      {/* Farm Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-900">Current Farm:</span>
          <span className="text-blue-800">{currentFarm.name}</span>
        </div>
        <p className="text-blue-700 text-sm">
          {currentFarm.location && `${currentFarm.location} • `}
          {parcels.length} parcel{parcels.length !== 1 ? 's' : ''} available for analysis
        </p>
      </div>

      {/* Parcel Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Select Parcel for Analysis</h2>

        {parcelsLoading ? (
          <div className="text-gray-500">Loading parcels...</div>
        ) : parcels.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-600">No parcels found for this farm.</p>
            <p className="text-sm text-gray-500 mt-1">
              Add parcels with defined boundaries to enable satellite analysis.
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
                    <p>Area: {parcel.area} {parcel.area_unit || 'hectares'}</p>
                  )}
                  {parcel.soil_type && (
                    <p>Soil: {parcel.soil_type}</p>
                  )}
                  {parcel.irrigation_type && (
                    <p>Irrigation: {parcel.irrigation_type}</p>
                  )}
                </div>

                {/* Boundary availability indicator */}
                <div className="mt-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    parcel.boundary ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs text-gray-500">
                    {parcel.boundary ? 'Boundary defined' : 'No boundary data'}
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
              <h2 className="text-xl font-semibold">Vegetation Indices Analysis</h2>
            </div>
            <IndicesCalculator
              parcelName={selectedParcel.name}
              boundary={selectedParcel.boundary}
              onResultsUpdate={handleResultsUpdate}
            />
          </div>

          {/* Time Series Analysis */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Historical Trends</h2>
            </div>
            <TimeSeriesChart
              parcelId={selectedParcel.id}
              parcelName={selectedParcel.name}
              boundary={selectedParcel.boundary}
            />
          </div>

          {/* Analysis Summary */}
          {calculationResults && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Analysis Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Latest Results</h3>
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
                  <h3 className="font-medium mb-3">Parcel Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Name:</span> {selectedParcel.name}</p>
                    <p><span className="text-gray-600">Area:</span> {selectedParcel.area} {selectedParcel.area_unit || 'hectares'}</p>
                    {selectedParcel.soil_type && (
                      <p><span className="text-gray-600">Soil Type:</span> {selectedParcel.soil_type}</p>
                    )}
                    {selectedParcel.irrigation_type && (
                      <p><span className="text-gray-600">Irrigation:</span> {selectedParcel.irrigation_type}</p>
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
              <h4 className="text-yellow-800 font-medium">Boundary Data Required</h4>
              <p className="text-yellow-700">
                The selected parcel "{selectedParcel.name}" doesn't have boundary coordinates defined.
                Boundary data is required for satellite analysis.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/satellite-analysis')({
  component: SatelliteAnalysisPage,
});