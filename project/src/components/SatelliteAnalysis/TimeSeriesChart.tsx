import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';
import {
  satelliteApi,
  VegetationIndexType,
  VEGETATION_INDICES,
  VEGETATION_INDEX_DESCRIPTIONS,
  TimeSeriesRequest,
  TimeSeriesResponse,
  convertBoundaryToGeoJSON,
  getDateRangeLastNDays
} from '../../lib/satellite-api';

interface TimeSeriesChartProps {
  parcelId: string;
  parcelName?: string;
  boundary?: number[][];
  defaultIndex?: VegetationIndexType;
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  parcelId,
  parcelName,
  boundary,
  defaultIndex = 'NDVI'
}) => {
  const [selectedIndex, setSelectedIndex] = useState<VegetationIndexType>(defaultIndex);
  const [interval, setInterval] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with last 6 months
  useEffect(() => {
    const defaultRange = getDateRangeLastNDays(180);
    setStartDate(defaultRange.start_date);
    setEndDate(defaultRange.end_date);
  }, []);

  const fetchTimeSeriesData = useCallback(async () => {
    if (!boundary || !startDate || !endDate) return;

    setIsLoading(true);
    setError(null);

    try {
      const request: TimeSeriesRequest = {
        aoi: {
          geometry: convertBoundaryToGeoJSON(boundary),
          name: parcelName || 'Selected Parcel'
        },
        date_range: {
          start_date: startDate,
          end_date: endDate
        },
        index: selectedIndex,
        interval,
        cloud_coverage: 20 // Allow slightly higher cloud coverage for time series
      };

      const response = await satelliteApi.getTimeSeries(request);
      setTimeSeriesData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch time series data');
    } finally {
      setIsLoading(false);
    }
  }, [boundary, startDate, endDate, selectedIndex, interval, parcelName]);

  // Auto-fetch data when parameters change
  useEffect(() => {
    if (boundary && startDate && endDate) {
      fetchTimeSeriesData();
    }
  }, [fetchTimeSeriesData, boundary, startDate, endDate]);

  const getIndexColor = (index: VegetationIndexType) => {
    const colors: Record<VegetationIndexType, string> = {
      NDVI: '#22c55e',
      NDRE: '#10b981',
      NDMI: '#3b82f6',
      MNDWI: '#06b6d4',
      GCI: '#84cc16',
      SAVI: '#eab308',
      OSAVI: '#f59e0b',
      MSAVI2: '#f97316',
      PRI: '#ef4444',
      MSI: '#8b5cf6',
      MCARI: '#ec4899',
      TCARI: '#f43f5e'
    };
    return colors[index] || '#6b7280';
  };

  const formatTooltipValue = (value: number) => {
    return value.toFixed(3);
  };

  const getTrendIcon = () => {
    if (!timeSeriesData?.data || timeSeriesData.data.length < 2) return null;

    const firstValue = timeSeriesData.data[0].value;
    const lastValue = timeSeriesData.data[timeSeriesData.data.length - 1].value;

    if (lastValue > firstValue) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (lastValue < firstValue) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return null;
  };

  const calculateStatistics = () => {
    if (!timeSeriesData?.data) return null;

    const values = timeSeriesData.data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const std = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length);

    return { mean, min, max, std };
  };

  const stats = calculateStatistics();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5" />
        <h2 className="text-xl font-semibold">Vegetation Index Time Series</h2>
        {getTrendIcon()}
      </div>
      <p className="text-gray-600 mb-6">
        Historical trends for {parcelName || `Parcel ${parcelId}`}
      </p>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Vegetation Index</label>
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(e.target.value as VegetationIndexType)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {VEGETATION_INDICES.map(index => (
              <option key={index} value={index}>
                {index}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Interval</label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value as any)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Mean</div>
            <div className="text-lg font-semibold">{stats.mean.toFixed(3)}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Min</div>
            <div className="text-lg font-semibold">{stats.min.toFixed(3)}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Max</div>
            <div className="text-lg font-semibold">{stats.max.toFixed(3)}</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Std Dev</div>
            <div className="text-lg font-semibold">{stats.std.toFixed(3)}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="h-96 mb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading time series data...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            {error}
          </div>
        ) : timeSeriesData?.data && timeSeriesData.data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeSeriesData.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={['dataMin - 0.1', 'dataMax + 0.1']}
              />
              <Tooltip
                formatter={(value: number) => [formatTooltipValue(value), selectedIndex]}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={getIndexColor(selectedIndex)}
                strokeWidth={2}
                dot={{ fill: getIndexColor(selectedIndex), r: 4 }}
                activeDot={{ r: 6 }}
              />
              {stats && (
                <ReferenceLine
                  y={stats.mean}
                  stroke="#666"
                  strokeDasharray="5 5"
                  label={{ value: "Mean", position: "top" }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available for the selected parameters
          </div>
        )}
      </div>

      {/* Index Description */}
      <div className="p-4 bg-blue-50 rounded-lg mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="px-2 py-1 rounded text-xs font-medium text-white"
            style={{ backgroundColor: getIndexColor(selectedIndex) }}
          >
            {selectedIndex}
          </div>
          <span className="font-medium">Index Information</span>
        </div>
        <p className="text-sm text-gray-700">
          {VEGETATION_INDEX_DESCRIPTIONS[selectedIndex]}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={fetchTimeSeriesData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default TimeSeriesChart;