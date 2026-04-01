/**
 * Satellite Indices Service
 *
 * All calls route through the NestJS satellite-proxy controller
 * (`/api/v1/satellite-proxy/...`) which adds auth, org scoping,
 * and caching before forwarding to the FastAPI satellite service.
 *
 * The frontend must NEVER call the FastAPI satellite service directly.
 */
import { apiClient } from '../lib/api-client';
import { ErrorHandlers } from '../lib/errors';

const PROXY_PREFIX = '/api/v1/satellite-proxy';

export interface VegetationIndex {
  NDVI: string;
  NDRE: string;
  NDMI: string;
  MNDWI: string;
  GCI: string;
  SAVI: string;
  OSAVI: string;
  MSAVI2: string;
  NIRv: string;
  EVI: string;
  MSI: string;
  MCARI: string;
  TCARI: string;
}

export interface IndexValue {
  index: string;
  value: number;
  unit?: string;
  timestamp: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface IndexCalculationRequest {
  aoi: {
    geometry: {
      type: 'Polygon' | 'Point';
      coordinates: number[][][] | number[];
    };
    name?: string;
  };
  date_range: {
    start_date: string;
    end_date: string;
  };
  indices: string[];
  cloud_coverage?: number;
  scale?: number;
  use_aoi_cloud_filter?: boolean;
  cloud_buffer_meters?: number;
}

export interface IndexCalculationResponse {
  request_id: string;
  timestamp: string;
  aoi_name?: string;
  indices: IndexValue[];
  metadata: {
    start_date: string;
    end_date: string;
    cloud_coverage: number;
    scale: number;
    image_count: number;
  };
}

export interface TimeSeriesResponse {
  index: string;
  aoi_name?: string;
  start_date: string;
  end_date: string;
  data: TimeSeriesPoint[];
  statistics?: {
    mean: number;
    std: number;
    min: number;
    max: number;
    median: number;
  };
}

export type ExportFormat = 'GeoTIFF' | 'PNG' | 'JPEG' | 'JSON' | 'CSV' | 'PDF';

export interface ExportOptions {
  format: ExportFormat;
  includeStatistics?: boolean;
  includeMetadata?: boolean;
  imageQuality?: number;
}

export class SatelliteIndicesService {
  async calculateIndices(request: IndexCalculationRequest): Promise<IndexCalculationResponse> {
    try {
      const requestWithDefaults: IndexCalculationRequest = {
        use_aoi_cloud_filter: true,
        cloud_buffer_meters: 300,
        ...request,
      };
      return await apiClient.post<IndexCalculationResponse>(
        `${PROXY_PREFIX}/indices/calculate`,
        requestWithDefaults,
      );
    } catch (error) {
      ErrorHandlers.log(error, 'Error calculating indices');
      throw error;
    }
  }

  async getTimeSeries(
    aoi: IndexCalculationRequest['aoi'],
    dateRange: IndexCalculationRequest['date_range'],
    index: string,
    interval: 'day' | 'week' | 'month' | 'year' = 'month',
  ): Promise<TimeSeriesResponse> {
    try {
      return await apiClient.post<TimeSeriesResponse>(
        `${PROXY_PREFIX}/indices/timeseries`,
        { aoi, date_range: dateRange, index, interval },
      );
    } catch (error) {
      ErrorHandlers.log(error, 'Error getting time series');
      throw error;
    }
  }

  async exportIndexMap(
    aoi: IndexCalculationRequest['aoi'],
    date: string,
    index: string,
    scale: number = 10,
    options: ExportOptions = { format: 'GeoTIFF' },
  ): Promise<{ download_url: string; expires_at: string; format: string }> {
    try {
      const result = await apiClient.post<{
        download_url: string;
        expires_at: string;
      }>(`${PROXY_PREFIX}/indices/export`, {
        aoi,
        date,
        index,
        scale,
        format: options.format,
        include_statistics: options.includeStatistics ?? true,
        include_metadata: options.includeMetadata ?? true,
        image_quality: options.imageQuality ?? 90,
      });
      return {
        download_url: result.download_url,
        expires_at: result.expires_at,
        format: options.format,
      };
    } catch (error) {
      ErrorHandlers.log(error, 'Error exporting index map');
      throw error;
    }
  }

  async exportTimeSeries(
    timeSeriesData: TimeSeriesResponse,
    format: 'JSON' | 'CSV' | 'PDF',
    parcelName?: string,
  ): Promise<Blob> {
    const data = timeSeriesData.data;
    const stats = timeSeriesData.statistics;

    switch (format) {
      case 'JSON': {
        const exportData = {
          parcel: parcelName,
          index: timeSeriesData.index,
          period: { start: timeSeriesData.start_date, end: timeSeriesData.end_date },
          statistics: stats,
          data: data.map((point) => ({ date: point.date, value: point.value })),
          exported_at: new Date().toISOString(),
        };
        return new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
      }
      case 'CSV': {
        const header = 'Date,Value\n';
        const rows = data.map((point) => `${point.date},${point.value}`).join('\n');
        const statsRows = stats
          ? `\n\nStatistiques\nMoyenne,${stats.mean}\nMin,${stats.min}\nMax,${stats.max}\nMédiane,${stats.median}\nÉcart-type,${stats.std}`
          : '';
        return new Blob([header + rows + statsRows], { type: 'text/csv' });
      }
      case 'PDF': {
        const html = this.generatePDFContent(timeSeriesData, parcelName);
        return new Blob([html], { type: 'text/html' });
      }
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private generatePDFContent(
    timeSeriesData: TimeSeriesResponse,
    parcelName?: string,
  ): string {
    const stats = timeSeriesData.statistics;
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rapport - ${timeSeriesData.index} - ${parcelName || 'Parcelle'}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #1e40af; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f3f4f6; }
    .stats { background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .stat-item { text-align: center; }
    .stat-value { font-size: 1.5em; font-weight: bold; color: #1e40af; }
    .stat-label { font-size: 0.875em; color: #6b7280; }
  </style>
</head>
<body>
  <h1>Rapport d'Indice Satellite: ${timeSeriesData.index}</h1>
  <p><strong>Parcelle:</strong> ${parcelName || 'Non spécifiée'}</p>
  <p><strong>Période:</strong> ${timeSeriesData.start_date} - ${timeSeriesData.end_date}</p>
  <p><strong>Généré le:</strong> ${new Date().toLocaleString('fr-FR')}</p>
  ${
    stats
      ? `
  <div class="stats">
    <h3>Statistiques</h3>
    <div class="stats-grid">
      <div class="stat-item"><div class="stat-value">${stats.mean.toFixed(3)}</div><div class="stat-label">Moyenne</div></div>
      <div class="stat-item"><div class="stat-value">${stats.min.toFixed(3)}</div><div class="stat-label">Minimum</div></div>
      <div class="stat-item"><div class="stat-value">${stats.max.toFixed(3)}</div><div class="stat-label">Maximum</div></div>
      <div class="stat-item"><div class="stat-value">${stats.median.toFixed(3)}</div><div class="stat-label">Médiane</div></div>
      <div class="stat-item"><div class="stat-value">${stats.std.toFixed(3)}</div><div class="stat-label">Écart-type</div></div>
    </div>
  </div>`
      : ''
  }
  <h3>Données (${timeSeriesData.data.length} points)</h3>
  <table>
    <thead><tr><th>Date</th><th>Valeur</th></tr></thead>
    <tbody>
      ${timeSeriesData.data
        .map(
          (point) => `<tr><td>${new Date(point.date).toLocaleDateString('fr-FR')}</td><td>${point.value.toFixed(4)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;
  }

  async getAvailableIndices(): Promise<string[]> {
    try {
      return await apiClient.get<string[]>(`${PROXY_PREFIX}/indices/available`);
    } catch (error) {
      ErrorHandlers.log(error, 'Error getting available indices');
      return ['NDVI', 'NDRE', 'NDMI', 'NIRv', 'EVI', 'GCI', 'SAVI'];
    }
  }

  // Helper: convert parcel boundary to GeoJSON
  static convertBoundaryToGeoJSON(
    boundary: number[][],
  ): IndexCalculationRequest['aoi'] {
    const firstCoord = boundary[0];
    let geoCoordinates: number[][];

    if (Math.abs(firstCoord[0]) > 180 || Math.abs(firstCoord[1]) > 90) {
      geoCoordinates = boundary.map((coord) => {
        const [x, y] = coord;
        const lon = (x / 20037508.34) * 180;
        const lat =
          (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360) / Math.PI -
          90;
        return [lon, lat];
      });
    } else {
      geoCoordinates = boundary;
    }

    if (geoCoordinates.length > 0) {
      const first = geoCoordinates[0];
      const last = geoCoordinates[geoCoordinates.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        geoCoordinates.push([first[0], first[1]]);
      }
    }

    return {
      geometry: {
        type: 'Polygon',
        coordinates: [geoCoordinates],
      },
    };
  }

  static getDefaultDateRange(): { start_date: string; end_date: string } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 2);
    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
  }
}

export const satelliteIndicesService = new SatelliteIndicesService();
