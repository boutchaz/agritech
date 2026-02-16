import React, { useState, useEffect, useCallback } from 'react';
import { Image, Download, Calendar, Cloud, AlertTriangle, CheckCircle, Loader, Eye, Grid3X3, Activity, MousePointer, CalendarDays, Satellite, Database, RefreshCw } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  satelliteApi,
  VegetationIndexType,
  VEGETATION_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  convertBoundaryToGeoJSON,
  getDateRangeLastNDays
} from '../../lib/satellite-api';
import { satelliteIndicesApi } from '../../lib/api/satellite-indices';
import { useAuth } from '../../hooks/useAuth';
import InteractiveIndexViewer from './InteractiveIndexViewer';

interface IndexImageViewerProps {
  parcelId: string;
  parcelName?: string;
  farmId?: string;
  boundary?: number[][];
}

interface CachedImageData {
  index: VegetationIndexType;
  image_url: string;
  date: string;
  cloud_coverage: number;
  metadata?: Record<string, any>;
}

const IndexImageViewer: React.FC<IndexImageViewerProps> = ({
  parcelId,
  parcelName,
  farmId,
  boundary
}) => {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = currentOrganization?.id;

  const [selectedIndices, setSelectedIndices] = useState<VegetationIndexType[]>(['NDVI', 'NDRE', 'NDMI']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [cloudCoverage, setCloudCoverage] = useState(10);
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [displayMode, setDisplayMode] = useState<'static' | 'interactive'>('static');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
   const [isSyncing, setIsSyncing] = useState(false);

  // Initialize with last 30 days for better date availability
  useEffect(() => {
    const defaultRange = getDateRangeLastNDays(30);
    setStartDate(defaultRange.start_date);
    setEndDate(defaultRange.end_date);
  }, []);

  // Query cached images from database
  const {
    data: cachedImages,
    isLoading: isLoadingCache,
    refetch: refetchCache,
  } = useQuery({
    queryKey: ['satellite-images-cache', parcelId, selectedDate || startDate],
    queryFn: async (): Promise<CachedImageData[]> => {
      if (!organizationId || !parcelId) return [];

      const targetDate = selectedDate || startDate;
      if (!targetDate) return [];

      const response = await satelliteIndicesApi.getAll(
        {
          parcel_id: parcelId,
          date_from: targetDate,
          date_to: targetDate,
        },
        organizationId
      );

      // Filter entries that have image_url in metadata
      return response
        .filter(item => item.metadata?.image_url)
        .map(item => ({
          index: item.index_name as VegetationIndexType,
          image_url: item.metadata?.image_url,
          date: item.date?.split('T')[0],
          cloud_coverage: item.cloud_coverage_percentage || 0,
          metadata: item.metadata,
        }));
    },
    enabled: !!organizationId && !!parcelId && !!(selectedDate || startDate),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch available dates when boundary and date range are set
  const availableDatesQuery = useQuery({
    queryKey: ['availableDates', boundary, startDate, endDate, cloudCoverage],
    queryFn: async () => {
      if (!boundary || !startDate || !endDate) {
        return null;
      }

      const aoi = {
        geometry: convertBoundaryToGeoJSON(boundary),
        name: parcelName || 'Selected Parcel'
      };

      return satelliteApi.getAvailableDates(aoi, startDate, endDate, cloudCoverage);
    },
    enabled: !!boundary && !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleIndexToggle = (index: VegetationIndexType) => {
    setSelectedIndices(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Use React Query mutation for generating images from satellite API
  const generateImagesMutation = useMutation({
    mutationFn: async () => {
      if (!boundary || selectedIndices.length === 0 || !organizationId) {
        throw new Error('Missing required parameters');
      }

      const aoi = {
        geometry: convertBoundaryToGeoJSON(boundary),
        name: parcelName || 'Selected Parcel'
      };

      // Use selected date if available, otherwise use date range
      let dateRange;
      if (selectedDate) {
        dateRange = {
          start_date: selectedDate,
          end_date: selectedDate
        };
      } else if (startDate && endDate) {
        dateRange = { start_date: startDate, end_date: endDate };
      } else {
        throw new Error('Please select a specific date or set a date range');
      }

      setIsSyncing(true);

      try {
        const results = await satelliteApi.generateMultipleIndexImages(
          aoi,
          dateRange,
          selectedIndices,
          cloudCoverage
        );

        // Save each image to database cache
        for (const imageData of results) {
          try {
            await satelliteIndicesApi.create(
              {
                parcel_id: parcelId,
                farm_id: farmId,
                index_name: imageData.index,
                date: imageData.date,
                cloud_coverage_percentage: imageData.cloud_coverage,
                metadata: {
                  image_url: imageData.image_url,
                  ...imageData.metadata,
                },
              },
              organizationId
            );
          } catch {
            // Ignore duplicates
          }
        }

        // Refetch cache
        await refetchCache();
        queryClient.invalidateQueries({ queryKey: ['satellite-images-cache', parcelId] });

        return results;
      } finally {
        setIsSyncing(false);
      }
    },
  });

  // Get display images: prefer cached, fall back to mutation results
  const displayImages = useCallback((): CachedImageData[] => {
    // First check cached images for selected indices
    const cached = (cachedImages || []).filter(img => selectedIndices.includes(img.index));

    if (cached.length > 0) {
      return cached;
    }

    // Fall back to mutation results
    if (generateImagesMutation.data) {
      return generateImagesMutation.data.map(img => ({
        index: img.index,
        image_url: img.image_url,
        date: img.date,
        cloud_coverage: img.cloud_coverage,
        metadata: img.metadata,
      }));
    }

    return [];
  }, [cachedImages, selectedIndices, generateImagesMutation.data]);

  const generateImages = () => {
    generateImagesMutation.mutate();
  };

  const getCacheStats = () => {
    const cached = (cachedImages || []).filter(img => selectedIndices.includes(img.index));
    return { total: cached.length, fromCache: cached.length > 0 };
  };

  const getIndexColor = (index: VegetationIndexType) => {
    const colors: Record<VegetationIndexType, string> = {
      NDVI: '#22c55e', NDRE: '#10b981', NDMI: '#3b82f6', MNDWI: '#06b6d4',
      GCI: '#84cc16', SAVI: '#eab308', OSAVI: '#f59e0b', MSAVI2: '#f97316',
      NIRv: '#ef4444', EVI: '#0ea5e9', MSI: '#8b5cf6', MCARI: '#ec4899', TCARI: '#f43f5e'
    };
    return colors[index] || '#6b7280';
  };

  const downloadImage = (imageUrl: string, index: VegetationIndexType, date: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${parcelName || parcelId}_${index}_${date}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getColorLegend = (index: VegetationIndexType) => {
    const legends: Record<VegetationIndexType, { min: string, max: string, colors: string[] }> = {
      NDVI: { min: '-1 (Water/Bare)', max: '+1 (Dense Vegetation)', colors: ['#8B4513', '#FFD700', '#ADFF2F', '#32CD32', '#006400'] },
      NDRE: { min: '-1 (Low Nitrogen)', max: '+1 (High Nitrogen)', colors: ['#FF4500', '#FFA500', '#FFFF00', '#9ACD32', '#228B22'] },
      NDMI: { min: '-1 (Dry)', max: '+1 (Wet)', colors: ['#8B4513', '#D2691E', '#F0E68C', '#87CEEB', '#4169E1'] },
      MNDWI: { min: '-1 (Vegetation)', max: '+1 (Water)', colors: ['#228B22', '#90EE90', '#FFFFE0', '#87CEEB', '#0000FF'] },
      GCI: { min: '0 (Low Chlorophyll)', max: '50+ (High Chlorophyll)', colors: ['#FFB6C1', '#FFFF00', '#ADFF2F', '#32CD32', '#006400'] },
      SAVI: { min: '-1 (Bare Soil)', max: '+1 (Dense Vegetation)', colors: ['#D2691E', '#F4A460', '#FFFF00', '#9ACD32', '#228B22'] },
      OSAVI: { min: '-1 (Bare Soil)', max: '+1 (Dense Vegetation)', colors: ['#D2691E', '#F4A460', '#FFFF00', '#9ACD32', '#228B22'] },
      MSAVI2: { min: '-1 (Bare Soil)', max: '+1 (Dense Vegetation)', colors: ['#D2691E', '#F4A460', '#FFFF00', '#9ACD32', '#228B22'] },
      NIRv: { min: '0.0 (Low Activity)', max: '0.4 (High Activity)', colors: ['#FF0000', '#FF8C00', '#FFD700', '#ADFF2F', '#32CD32'] },
      EVI: { min: '-0.2 (Low)', max: '+0.8 (High)', colors: ['#8B4513', '#FF8C00', '#FFD700', '#7CFC00', '#006400'] },
      MSI: { min: '0 (Wet)', max: '2+ (Dry)', colors: ['#0000FF', '#87CEEB', '#FFFFE0', '#FFA500', '#FF4500'] },
      MCARI: { min: '0 (Low Chlorophyll)', max: '2+ (High Chlorophyll)', colors: ['#FFB6C1', '#FFFF00', '#ADFF2F', '#32CD32', '#006400'] },
      TCARI: { min: '0 (Low Chlorophyll)', max: '3+ (High Chlorophyll)', colors: ['#FFB6C1', '#FFFF00', '#ADFF2F', '#32CD32', '#006400'] }
    };
    return legends[index] || legends.NDVI;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {displayMode === 'static' ? <Image className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
          <h2 className="text-xl font-semibold">
            {displayMode === 'static' ? 'Vegetation Index Images' : 'Interactive Vegetation Analysis'}
          </h2>
        </div>

        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setDisplayMode('static')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              displayMode === 'static'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Image className="w-4 h-4" />
            Static Images
          </button>
          <button
            onClick={() => setDisplayMode('interactive')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              displayMode === 'interactive'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MousePointer className="w-4 h-4" />
            Interactive
          </button>
        </div>
      </div>

      <p className="text-gray-600">
        {displayMode === 'static'
          ? `Generate visual satellite imagery for vegetation indices of ${parcelName || `Parcel ${parcelId}`}`
          : `Explore interactive satellite data with hover details, zoom, and pan capabilities for ${parcelName || `Parcel ${parcelId}`}`
        }
      </p>

      {displayMode === 'interactive' ? (
        <InteractiveIndexViewer
          parcelId={parcelId}
          parcelName={parcelName}
          boundary={boundary}
        />
      ) : (
        <>
          {/* Configuration Panel */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="font-medium text-gray-900">Configuration</h3>

        {/* Available Dates Info */}
        {availableDatesQuery.isLoading ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin text-gray-600" />
              <span className="text-sm text-gray-600">Checking available satellite images...</span>
            </div>
          </div>
        ) : availableDatesQuery.data ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Available Images</span>
            </div>
            <div className="text-sm text-blue-800">
              Found {availableDatesQuery.data.total_images} satellite images between {startDate} and {endDate}
              {availableDatesQuery.data.total_images === 0 && (
                <p className="mt-1 text-orange-700">
                  No images available for this date range. Try expanding the date range or increasing cloud coverage tolerance.
                </p>
              )}
            </div>
          </div>
        ) : null}

        {/* Date Range & Settings */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Max Cloud Coverage (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={cloudCoverage}
              onChange={(e) => setCloudCoverage(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as 'grid' | 'single')}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="grid">Grid View</option>
              <option value="single">Single View</option>
            </select>
          </div>
        </div>

        {/* Available Dates List */}
        {availableDatesQuery.data && availableDatesQuery.data.available_dates.length > 0 && (
          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Image Date ({availableDatesQuery.data.available_dates.length} available)
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableDatesQuery.data.available_dates.map((dateInfo) => (
                  <button
                    key={dateInfo.date}
                    onClick={() => setSelectedDate(dateInfo.date)}
                    className={`p-2 text-xs rounded-md border transition-colors ${
                      selectedDate === dateInfo.date
                        ? 'bg-green-100 border-green-500 text-green-900'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{dateInfo.date}</div>
                    <div className="text-gray-500 flex items-center gap-1 mt-1">
                      <Cloud className="w-3 h-3" />
                      {dateInfo.cloud_coverage.toFixed(0)}%
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {selectedDate && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: {selectedDate} •
                Cloud coverage: {availableDatesQuery.data.available_dates.find(d => d.date === selectedDate)?.cloud_coverage.toFixed(1)}%
              </p>
            )}
          </div>
        )}

        {/* Index Selection */}
        <div>
          <label className="text-sm font-medium mb-3 block">Select Indices to Visualize</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {VEGETATION_INDICES.map(index => (
              <label key={index} className="flex items-center p-2 border rounded-md cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIndices.includes(index)}
                  onChange={() => handleIndexToggle(index)}
                  className="mr-2"
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: getIndexColor(index) }}
                >
                  {index}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 items-center">
          {/* Cache indicator */}
          {getCacheStats().fromCache && (
            <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              <Database className="w-3 h-3" />
              <span>{getCacheStats().total} images en cache</span>
            </div>
          )}

          {/* Refresh cache button */}
          <button
            onClick={() => refetchCache()}
            disabled={isLoadingCache}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingCache ? 'animate-spin' : ''}`} />
            Actualiser le cache
          </button>

          {/* Generate from satellite API button */}
          <button
            onClick={generateImages}
            disabled={generateImagesMutation.isPending || isSyncing || !boundary || selectedIndices.length === 0 || (!selectedDate && (!startDate || !endDate))}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {(generateImagesMutation.isPending || isSyncing) ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Satellite className="w-4 h-4" />
            )}
            {(generateImagesMutation.isPending || isSyncing) ? 'Récupération...' :
             selectedDate ? `Récupérer depuis satellite (${selectedDate})` : 'Récupérer depuis satellite'}
          </button>
        </div>
        {!selectedDate && availableDatesQuery.data?.available_dates.length > 0 && (
          <p className="text-sm text-amber-600 mt-2">
            Tip: Select a specific date from the available dates above for better results.
          </p>
        )}
      </div>

      {/* Error Display */}
      {generateImagesMutation.isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-700 text-sm mt-1">
            {generateImagesMutation.error instanceof Error
              ? generateImagesMutation.error.message
              : 'Failed to generate index images'}
          </p>
        </div>
      )}

      {/* Image Display */}
      {displayImages().length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {getCacheStats().fromCache ? 'Images (depuis cache)' : 'Images générées'}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                {viewMode === 'grid' ? <Eye className="w-3 h-3" /> : <Grid3X3 className="w-3 h-3" />}
                {viewMode === 'grid' ? 'Single View' : 'Grid View'}
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayImages().map((imageData) => (
                <div key={imageData.index} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-2">
                      <h4
                        className="font-medium text-lg"
                        style={{ color: getIndexColor(imageData.index) }}
                      >
                        {imageData.index}
                        {imageData.metadata?.demo_mode && (
                          <span className="ml-2 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            DEMO
                          </span>
                        )}
                      </h4>
                      {!imageData.metadata?.demo_mode && (
                        <button
                          onClick={() => downloadImage(imageData.image_url, imageData.index, imageData.date)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {imageData.metadata?.demo_mode
                        ? imageData.metadata.message
                        : VEGETATION_INDEX_DESCRIPTIONS[imageData.index]
                      }
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {imageData.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Cloud className="w-3 h-3" />
                        {imageData.cloud_coverage.toFixed(1)}%
                        {imageData.metadata?.threshold_used > imageData.metadata?.requested_threshold && (
                          <span className="text-xs text-amber-600" title={`Requested ${imageData.metadata.requested_threshold}% but used ${imageData.metadata.threshold_used}%`}>
                            (relaxed)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Image */}
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <img
                      src={imageData.image_url}
                      alt={`${imageData.index} visualization`}
                      className="max-w-full max-h-full object-contain"
                      onError={() => console.error(`Failed to load image: ${imageData.index}`)}
                    />
                  </div>

                  {/* Color Legend */}
                  <div className="p-3 bg-gray-50">
                    <div className="text-xs font-medium mb-2">Value Range</div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{getColorLegend(imageData.index).min}</span>
                      <div className="flex-1 mx-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            background: `linear-gradient(to right, ${getColorLegend(imageData.index).colors.join(', ')})`
                          }}
                        />
                      </div>
                      <span>{getColorLegend(imageData.index).max}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Single View */
            <div className="space-y-4">
              {/* Image Navigation */}
              <div className="flex items-center justify-center gap-2">
                {displayImages().map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      selectedImageIndex === index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {img.index}
                  </button>
                ))}
              </div>

              {/* Selected Image */}
              {(() => {
                const selectedImg = displayImages()[selectedImageIndex];
                if (!selectedImg) return null;
                return (
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="p-6 border-b">
                      <div className="flex items-center justify-between mb-4">
                        <h4
                          className="text-2xl font-bold"
                          style={{ color: getIndexColor(selectedImg.index) }}
                        >
                          {selectedImg.index}
                        </h4>
                        <button
                          onClick={() => downloadImage(
                            selectedImg.image_url,
                            selectedImg.index,
                            selectedImg.date
                          )}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <Download className="w-4 h-4" />
                          Download Image
                        </button>
                      </div>
                      <p className="text-gray-700 mb-4">
                        {VEGETATION_INDEX_DESCRIPTIONS[selectedImg.index]}
                      </p>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Date: {selectedImg.date}
                        </div>
                        <div className="flex items-center gap-2">
                          <Cloud className="w-4 h-4" />
                          Cloud Coverage: {selectedImg.cloud_coverage.toFixed(1)}%
                        </div>
                        {selectedImg.metadata?.suitable_images && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            {selectedImg.metadata.suitable_images} suitable images found
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Large Image Display */}
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <img
                        src={selectedImg.image_url}
                        alt={`${selectedImg.index} visualization`}
                        className="max-w-full max-h-full object-contain rounded"
                      />
                    </div>

                    {/* Enhanced Color Legend */}
                    <div className="p-6 bg-gray-50">
                      <h5 className="font-medium mb-3">Color Scale Interpretation</h5>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {getColorLegend(selectedImg.index).min}
                        </span>
                        <span className="text-sm font-medium">
                          {getColorLegend(selectedImg.index).max}
                        </span>
                      </div>
                      <div
                        className="h-4 rounded-full mb-3"
                        style={{
                          background: `linear-gradient(to right, ${getColorLegend(selectedImg.index).colors.join(', ')})`
                        }}
                      />
                      <div className="text-sm text-gray-600">
                        Colors represent the range of {selectedImg.index} values across your parcel.
                        Darker greens typically indicate healthier vegetation.
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Image className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-blue-800">Image Generation Information</span>
        </div>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• Images are generated from the best available satellite data within your date range</p>
          <p>• Lower cloud coverage settings produce higher quality images but may limit availability</p>
          <p>• Recent imagery (last 7 days) provides the most current field conditions</p>
          <p>• Click download to save high-resolution images for further analysis</p>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default IndexImageViewer;
