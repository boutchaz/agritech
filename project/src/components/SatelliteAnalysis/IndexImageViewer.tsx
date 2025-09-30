import React, { useState, useEffect } from 'react';
import { Image, Download, Calendar, Cloud, AlertTriangle, CheckCircle, Loader, Eye, EyeOff, Grid3X3, Activity, MousePointer } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import {
  satelliteApi,
  VegetationIndexType,
  VEGETATION_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  IndexImageResponse,
  convertBoundaryToGeoJSON,
  getDateRangeLastNDays
} from '../../lib/satellite-api';
import InteractiveIndexViewer from './InteractiveIndexViewer';

interface IndexImageViewerProps {
  parcelId: string;
  parcelName?: string;
  boundary?: number[][];
}

const IndexImageViewer: React.FC<IndexImageViewerProps> = ({
  parcelId,
  parcelName,
  boundary
}) => {
  const [selectedIndices, setSelectedIndices] = useState<VegetationIndexType[]>(['NDVI', 'NDRE', 'NDMI']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cloudCoverage, setCloudCoverage] = useState(10);
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');
  const [displayMode, setDisplayMode] = useState<'static' | 'interactive'>('static');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Initialize with last 7 days for recent imagery
  useEffect(() => {
    const defaultRange = getDateRangeLastNDays(7);
    setStartDate(defaultRange.start_date);
    setEndDate(defaultRange.end_date);
  }, []);

  const handleIndexToggle = (index: VegetationIndexType) => {
    setSelectedIndices(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Use React Query mutation for generating images
  const generateImagesMutation = useMutation({
    mutationFn: async () => {
      if (!boundary || !startDate || !endDate || selectedIndices.length === 0) {
        throw new Error('Missing required parameters');
      }

      const aoi = {
        geometry: convertBoundaryToGeoJSON(boundary),
        name: parcelName || 'Selected Parcel'
      };

      const dateRange = { start_date: startDate, end_date: endDate };

      return satelliteApi.generateMultipleIndexImages(
        aoi,
        dateRange,
        selectedIndices,
        cloudCoverage
      );
    },
  });

  const generateImages = () => {
    generateImagesMutation.mutate();
  };

  const getIndexColor = (index: VegetationIndexType) => {
    const colors: Record<VegetationIndexType, string> = {
      NDVI: '#22c55e', NDRE: '#10b981', NDMI: '#3b82f6', MNDWI: '#06b6d4',
      GCI: '#84cc16', SAVI: '#eab308', OSAVI: '#f59e0b', MSAVI2: '#f97316',
      PRI: '#ef4444', MSI: '#8b5cf6', MCARI: '#ec4899', TCARI: '#f43f5e'
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
      PRI: { min: '-0.2 (Stressed)', max: '+0.2 (Healthy)', colors: ['#FF0000', '#FF8C00', '#FFD700', '#ADFF2F', '#32CD32'] },
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

        {/* Generate Button */}
        <button
          onClick={generateImages}
          disabled={generateImagesMutation.isPending || !boundary || selectedIndices.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {generateImagesMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
          {generateImagesMutation.isPending ? 'Generating Images...' : 'Generate Images'}
        </button>
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
      {generateImagesMutation.data && generateImagesMutation.data.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Generated Images</h3>
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
              {generateImagesMutation.data.map((imageData, index) => (
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
                      onLoad={() => console.log(`Image loaded: ${imageData.index}`)}
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
                {generateImagesMutation.data.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      selectedImageIndex === index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {generateImagesMutation.data[index].index}
                  </button>
                ))}
              </div>

              {/* Selected Image */}
              {generateImagesMutation.data[selectedImageIndex] && (
                <div className="bg-white border rounded-lg overflow-hidden">
                  <div className="p-6 border-b">
                    <div className="flex items-center justify-between mb-4">
                      <h4
                        className="text-2xl font-bold"
                        style={{ color: getIndexColor(generateImagesMutation.data[selectedImageIndex].index) }}
                      >
                        {generateImagesMutation.data[selectedImageIndex].index}
                      </h4>
                      <button
                        onClick={() => downloadImage(
                          generateImagesMutation.data[selectedImageIndex].image_url,
                          generateImagesMutation.data[selectedImageIndex].index,
                          generateImagesMutation.data[selectedImageIndex].date
                        )}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Download className="w-4 h-4" />
                        Download Image
                      </button>
                    </div>
                    <p className="text-gray-700 mb-4">
                      {VEGETATION_INDEX_DESCRIPTIONS[generateImagesMutation.data[selectedImageIndex].index]}
                    </p>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date: {generateImagesMutation.data[selectedImageIndex].date}
                      </div>
                      <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4" />
                        Cloud Coverage: {generateImagesMutation.data[selectedImageIndex].cloud_coverage.toFixed(1)}%
                        {generateImagesMutation.data[selectedImageIndex].metadata?.threshold_used > generateImagesMutation.data[selectedImageIndex].metadata?.requested_threshold && (
                          <span className="text-sm text-amber-600 font-medium" title={`Requested ${generateImagesMutation.data[selectedImageIndex].metadata.requested_threshold}% but used ${generateImagesMutation.data[selectedImageIndex].metadata.threshold_used}%`}>
                            (threshold relaxed to {generateImagesMutation.data[selectedImageIndex].metadata.threshold_used}%)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {generateImagesMutation.data[selectedImageIndex].metadata.suitable_images} suitable images found
                      </div>
                    </div>
                  </div>

                  {/* Large Image Display */}
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    <img
                      src={generateImagesMutation.data[selectedImageIndex].image_url}
                      alt={`${generateImagesMutation.data[selectedImageIndex].index} visualization`}
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  </div>

                  {/* Enhanced Color Legend */}
                  <div className="p-6 bg-gray-50">
                    <h5 className="font-medium mb-3">Color Scale Interpretation</h5>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {getColorLegend(generateImagesMutation.data[selectedImageIndex].index).min}
                      </span>
                      <span className="text-sm font-medium">
                        {getColorLegend(generateImagesMutation.data[selectedImageIndex].index).max}
                      </span>
                    </div>
                    <div
                      className="h-4 rounded-full mb-3"
                      style={{
                        background: `linear-gradient(to right, ${getColorLegend(generateImagesMutation.data[selectedImageIndex].index).colors.join(', ')})`
                      }}
                    />
                    <div className="text-sm text-gray-600">
                      Colors represent the range of {generateImagesMutation.data[selectedImageIndex].index} values across your parcel.
                      Darker greens typically indicate healthier vegetation.
                    </div>
                  </div>
                </div>
              )}
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