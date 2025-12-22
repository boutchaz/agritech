// Satellite Indices Service for calculating vegetation indices
export interface VegetationIndex {
  NDVI: string;
  NDRE: string;
  NDMI: string;
  MNDWI: string;
  GCI: string;
  SAVI: string;
  OSAVI: string;
  MSAVI2: string;
  PRI: string;
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
  use_aoi_cloud_filter?: boolean; // Calculate cloud coverage within AOI only (default: true)
  cloud_buffer_meters?: number;   // Buffer around AOI for cloud calculation (default: 300m)
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
  imageQuality?: number; // 0-100 for JPEG
}

export class SatelliteIndicesService {
  private baseUrl: string;

  constructor() {
    // Update this URL to match your satellite-indices-service endpoint
    // Remove trailing slash to avoid double slashes in URLs
    const url = import.meta.env.VITE_SATELLITE_SERVICE_URL || 'http://localhost:8000';
    this.baseUrl = url.replace(/\/+$/, '');
  }

  async calculateIndices(request: IndexCalculationRequest): Promise<IndexCalculationResponse> {
    try {
      // Apply defaults for AOI-based cloud filtering
      const requestWithDefaults: IndexCalculationRequest = {
        use_aoi_cloud_filter: true,  // Default to AOI-based filtering
        cloud_buffer_meters: 300,    // Default 300m buffer
        ...request
      };

      const response = await fetch(`${this.baseUrl}/api/indices/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestWithDefaults),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calculating indices:', error);
      throw error;
    }
  }

  async getTimeSeries(
    aoi: IndexCalculationRequest['aoi'],
    dateRange: IndexCalculationRequest['date_range'],
    index: string,
    interval: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<TimeSeriesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/indices/timeseries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aoi,
          date_range: dateRange,
          index,
          interval,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting time series:', error);
      throw error;
    }
  }

  async exportIndexMap(
    aoi: IndexCalculationRequest['aoi'],
    date: string,
    index: string,
    scale: number = 10,
    options: ExportOptions = { format: 'GeoTIFF' }
  ): Promise<{ download_url: string; expires_at: string; format: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/indices/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aoi,
          date,
          index,
          scale,
          format: options.format,
          include_statistics: options.includeStatistics ?? true,
          include_metadata: options.includeMetadata ?? true,
          image_quality: options.imageQuality ?? 90,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        download_url: result.download_url,
        expires_at: result.expires_at,
        format: options.format,
      };
    } catch (error) {
      console.error('Error exporting index map:', error);
      throw error;
    }
  }

  // Export time series data to different formats
  async exportTimeSeries(
    timeSeriesData: TimeSeriesResponse,
    format: 'JSON' | 'CSV' | 'PDF',
    parcelName?: string
  ): Promise<Blob> {
    const data = timeSeriesData.data;
    const stats = timeSeriesData.statistics;

    switch (format) {
      case 'JSON': {
        const exportData = {
          parcel: parcelName,
          index: timeSeriesData.index,
          period: {
            start: timeSeriesData.start_date,
            end: timeSeriesData.end_date,
          },
          statistics: stats,
          data: data.map(point => ({
            date: point.date,
            value: point.value,
          })),
          exported_at: new Date().toISOString(),
        };
        return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      }

      case 'CSV': {
        const header = 'Date,Value\n';
        const rows = data.map(point => `${point.date},${point.value}`).join('\n');
        const statsRows = stats ? `\n\nStatistiques\nMoyenne,${stats.mean}\nMin,${stats.min}\nMax,${stats.max}\nMédiane,${stats.median}\nÉcart-type,${stats.std}` : '';
        return new Blob([header + rows + statsRows], { type: 'text/csv' });
      }

      case 'PDF': {
        // For PDF, we'll generate an HTML string and use print-to-PDF
        // In a real implementation, you'd use a library like jsPDF or pdfmake
        const html = this.generatePDFContent(timeSeriesData, parcelName);
        return new Blob([html], { type: 'text/html' });
      }

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private generatePDFContent(timeSeriesData: TimeSeriesResponse, parcelName?: string): string {
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

  ${stats ? `
  <div class="stats">
    <h3>Statistiques</h3>
    <div class="stats-grid">
      <div class="stat-item">
        <div class="stat-value">${stats.mean.toFixed(3)}</div>
        <div class="stat-label">Moyenne</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.min.toFixed(3)}</div>
        <div class="stat-label">Minimum</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.max.toFixed(3)}</div>
        <div class="stat-label">Maximum</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.median.toFixed(3)}</div>
        <div class="stat-label">Médiane</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.std.toFixed(3)}</div>
        <div class="stat-label">Écart-type</div>
      </div>
    </div>
  </div>
  ` : ''}

  <h3>Données (${timeSeriesData.data.length} points)</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Valeur</th>
      </tr>
    </thead>
    <tbody>
      ${timeSeriesData.data.map(point => `
        <tr>
          <td>${new Date(point.date).toLocaleDateString('fr-FR')}</td>
          <td>${point.value.toFixed(4)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;
  }

  async getAvailableIndices(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/indices/available`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting available indices:', error);
      // Return default indices if service is unavailable
      return ['NDVI', 'NDRE', 'NDMI', 'GCI', 'SAVI'];
    }
  }

  // Helper method to convert parcel boundary to GeoJSON format
  static convertBoundaryToGeoJSON(boundary: number[][]): IndexCalculationRequest['aoi'] {
    // Check if coordinates are in Web Mercator (EPSG:3857) or geographic (WGS84)
    const firstCoord = boundary[0];
    let geoCoordinates: number[][];

    if (Math.abs(firstCoord[0]) > 180 || Math.abs(firstCoord[1]) > 90) {
      // Coordinates are in Web Mercator (EPSG:3857), need to convert to WGS84
      console.log('Converting coordinates from Web Mercator to WGS84');
      geoCoordinates = boundary.map(coord => {
        const [x, y] = coord;
        // Convert from Web Mercator to WGS84
        const lon = (x / 20037508.34) * 180;
        const lat = (Math.atan(Math.exp((y / 20037508.34) * Math.PI)) * 360 / Math.PI) - 90;
        return [lon, lat];
      });
    } else {
      // Coordinates are already in geographic (WGS84)
      console.log('Coordinates are already in WGS84');
      geoCoordinates = boundary;
    }

    // Ensure the polygon is closed (first and last points should be the same)
    if (geoCoordinates.length > 0) {
      const first = geoCoordinates[0];
      const last = geoCoordinates[geoCoordinates.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        geoCoordinates.push([first[0], first[1]]);
      }
    }

    console.log('Converted coordinates:', geoCoordinates);

    return {
      geometry: {
        type: 'Polygon',
        coordinates: [geoCoordinates], // GeoJSON Polygon expects array of rings
      },
    };
  }

  // Helper method to get date range (last 30 days by default)
  static getDefaultDateRange(): { start_date: string; end_date: string } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    return {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
    };
  }
}

export const satelliteIndicesService = new SatelliteIndicesService();
