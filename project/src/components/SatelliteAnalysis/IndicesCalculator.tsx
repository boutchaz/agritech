import React, { useState, useEffect } from 'react';
import { AlertCircle, Satellite, Download, BarChart3 } from 'lucide-react';
import {
  satelliteApi,
  VegetationIndexType,
  VEGETATION_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  IndexCalculationRequest,
  IndexCalculationResponse,
  convertBoundaryToGeoJSON
} from '../../lib/satellite-api';

interface IndicesCalculatorProps {
  parcelName?: string;
  boundary?: number[][];
  onResultsUpdate?: (results: IndexCalculationResponse) => void;
}

const IndicesCalculator: React.FC<IndicesCalculatorProps> = ({
  parcelName,
  boundary,
  onResultsUpdate
}) => {
  const [selectedIndices, setSelectedIndices] = useState<VegetationIndexType[]>(['NDVI', 'NDRE']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cloudCoverage, setCloudCoverage] = useState(10);
  const [scale, setScale] = useState(10);
  const [isCalculating, setIsCalculating] = useState(false);
  const [results, setResults] = useState<IndexCalculationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize with reasonable default dates (last 30 days)
  useEffect(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    setEndDate(endDate.toISOString().split('T')[0]);
    setStartDate(startDate.toISOString().split('T')[0]);
  }, []);

  const handleIndexToggle = (index: VegetationIndexType) => {
    setSelectedIndices(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleCalculate = async () => {
    if (!boundary || !startDate || !endDate || selectedIndices.length === 0) {
      setError('Please select date range and at least one vegetation index');
      return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start >= end) {
      setError('End date must be after start date');
      return;
    }

    if (start >= now) {
      setError('Start date cannot be in the future');
      return;
    }

    if (end >= now) {
      setError('End date cannot be in the future. Satellite data is not available for future dates.');
      return;
    }

    // Check if date range is reasonable (not too old, as very old data might not be available)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    if (start < threeYearsAgo) {
      setError('Start date is too far in the past. Please select a date within the last 3 years.');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const request: IndexCalculationRequest = {
        aoi: {
          geometry: convertBoundaryToGeoJSON(boundary),
          name: parcelName || 'Selected Area'
        },
        date_range: {
          start_date: startDate,
          end_date: endDate
        },
        indices: selectedIndices,
        cloud_coverage: cloudCoverage,
        scale: scale
      };

      const response = await satelliteApi.calculateIndices(request);
      setResults(response);
      onResultsUpdate?.(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate indices');
    } finally {
      setIsCalculating(false);
    }
  };

  const getIndexColor = (index: VegetationIndexType) => {
    const colors: Record<VegetationIndexType, string> = {
      NDVI: 'bg-green-100 text-green-800 border-green-200',
      NDRE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      NDMI: 'bg-blue-100 text-blue-800 border-blue-200',
      MNDWI: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      GCI: 'bg-lime-100 text-lime-800 border-lime-200',
      SAVI: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      OSAVI: 'bg-amber-100 text-amber-800 border-amber-200',
      MSAVI2: 'bg-orange-100 text-orange-800 border-orange-200',
      PRI: 'bg-red-100 text-red-800 border-red-200',
      MSI: 'bg-purple-100 text-purple-800 border-purple-200',
      MCARI: 'bg-pink-100 text-pink-800 border-pink-200',
      TCARI: 'bg-rose-100 text-rose-800 border-rose-200'
    };
    return colors[index] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Satellite className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Vegetation Indices Calculator</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Calculate vegetation indices for {parcelName || 'selected area'} using satellite imagery
        </p>

        {/* Date Range Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Date Range</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Start Date</label>
              <input
                type="date"
                value={startDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">End Date</label>
              <input
                type="date"
                value={endDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Vegetation Indices Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-3 block">Vegetation Indices</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {VEGETATION_INDICES.map((index: VegetationIndexType) => (
              <div
                key={index}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedIndices.includes(index)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleIndexToggle(index)}
              >
                <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${getIndexColor(index)}`}>
                  {index}
                </div>
                <p className="text-xs text-gray-500">
                  {VEGETATION_INDEX_DESCRIPTIONS[index]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Cloud Coverage Threshold: {cloudCoverage}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={cloudCoverage}
              onChange={(e) => setCloudCoverage(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              Pixel Scale: {scale}m
            </label>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCalculate}
            disabled={isCalculating || selectedIndices.length === 0 || !startDate || !endDate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isCalculating ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Calculating...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" />
                Calculate Indices
              </>
            )}
          </button>

          {results && (
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export Results
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-red-800 font-medium">Error</h4>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Results Display */}
      {results && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Calculation Results</h3>
          <p className="text-gray-600 mb-4">
            Processed on {new Date(results.timestamp).toLocaleDateString()}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.indices.map((result: any, index: number) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${getIndexColor(result.index as VegetationIndexType)}`}>
                    {result.index}
                  </div>
                  <span className="text-lg font-semibold">
                    {result.value.toFixed(3)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {VEGETATION_INDEX_DESCRIPTIONS[result.index as VegetationIndexType]}
                </p>
              </div>
            ))}
          </div>

          {results.metadata && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="font-medium mb-2">Processing Metadata</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                {Object.entries(results.metadata).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-500">{key}:</span>
                    <span className="ml-1 font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IndicesCalculator;