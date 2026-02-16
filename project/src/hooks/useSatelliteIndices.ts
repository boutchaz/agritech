import { useState, useCallback } from 'react';
import {
   satelliteIndicesService,
   SatelliteIndicesService,
   IndexCalculationRequest,
   IndexCalculationResponse,
   TimeSeriesResponse,
   ExportOptions
} from '../services/satelliteIndicesService';

interface UseSatelliteIndicesReturn {
  calculateIndices: (
    boundary: number[][],
    parcelName: string,
    indices: string[],
    dateRange?: { start_date: string; end_date: string }
  ) => Promise<IndexCalculationResponse>;
  getTimeSeries: (
    boundary: number[][],
    parcelName: string,
    index: string,
    dateRange?: { start_date: string; end_date: string }
  ) => Promise<TimeSeriesResponse>;
  exportIndexMap: (
    boundary: number[][],
    parcelName: string,
    date: string,
    index: string,
    options?: ExportOptions
  ) => Promise<{ download_url: string; expires_at: string; format: string }>;
  exportTimeSeries: (
    timeSeriesData: TimeSeriesResponse,
    format: 'JSON' | 'CSV' | 'PDF',
    parcelName?: string
  ) => Promise<void>;
  loading: boolean;
  error: string | null;
  availableIndices: string[];
  loadAvailableIndices: () => Promise<void>;
}

export function useSatelliteIndices(): UseSatelliteIndicesReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableIndices, setAvailableIndices] = useState<string[]>([]);

  const calculateIndices = useCallback(async (
    boundary: number[][],
    parcelName: string,
    indices: string[],
    dateRange?: { start_date: string; end_date: string }
  ): Promise<IndexCalculationResponse> => {
    setLoading(true);
    setError(null);

    try {
      const aoi = SatelliteIndicesService.convertBoundaryToGeoJSON(boundary);
      aoi.name = parcelName;

      const request: IndexCalculationRequest = {
        aoi,
        date_range: dateRange || SatelliteIndicesService.getDefaultDateRange(),
        indices,
        cloud_coverage: 10,
        scale: 10,
      };

      const result = await satelliteIndicesService.calculateIndices(request);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate indices';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTimeSeries = useCallback(async (
    boundary: number[][],
    parcelName: string,
    index: string,
    dateRange?: { start_date: string; end_date: string }
  ): Promise<TimeSeriesResponse> => {
    setLoading(true);
    setError(null);

    try {
      const aoi = SatelliteIndicesService.convertBoundaryToGeoJSON(boundary);
      aoi.name = parcelName;

      const result = await satelliteIndicesService.getTimeSeries(
        aoi,
        dateRange || SatelliteIndicesService.getDefaultDateRange(),
        index,
        'month'
      );

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get time series';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportIndexMap = useCallback(async (
    boundary: number[][],
    parcelName: string,
    date: string,
    index: string,
    options: ExportOptions = { format: 'GeoTIFF' }
  ): Promise<{ download_url: string; expires_at: string; format: string }> => {
    setLoading(true);
    setError(null);

    try {
      const aoi = SatelliteIndicesService.convertBoundaryToGeoJSON(boundary);
      aoi.name = parcelName;

      const result = await satelliteIndicesService.exportIndexMap(aoi, date, index, 10, options);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export index map';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportTimeSeries = useCallback(async (
    timeSeriesData: TimeSeriesResponse,
    format: 'JSON' | 'CSV' | 'PDF',
    parcelName?: string
  ): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const blob = await satelliteIndicesService.exportTimeSeries(timeSeriesData, format, parcelName);

      // Get file extension
      const extensions: Record<string, string> = {
        'JSON': 'json',
        'CSV': 'csv',
        'PDF': 'html', // We generate HTML for PDF (can be printed to PDF)
      };
      const ext = extensions[format] || 'txt';
      const filename = `${parcelName || 'data'}_${timeSeriesData.index}_${new Date().toISOString().split('T')[0]}.${ext}`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export time series';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAvailableIndices = useCallback(async () => {
    try {
      const indices = await satelliteIndicesService.getAvailableIndices();
      setAvailableIndices(indices);
    } catch (err) {
      console.error('Failed to load available indices:', err);
      // Set default indices as fallback
      setAvailableIndices(['NDVI', 'NDRE', 'NDMI', 'NIRv', 'EVI', 'GCI', 'SAVI']);
    }
  }, []);

  return {
    calculateIndices,
    getTimeSeries,
    exportIndexMap,
    exportTimeSeries,
    loading,
    error,
    availableIndices,
    loadAvailableIndices,
  };
}
