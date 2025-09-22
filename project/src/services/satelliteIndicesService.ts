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

export class SatelliteIndicesService {
  private baseUrl: string;

  constructor() {
    // Update this URL to match your satellite-indices-service endpoint
    this.baseUrl = import.meta.env.VITE_SATELLITE_SERVICE_URL || 'http://localhost:8000';
  }

  async calculateIndices(request: IndexCalculationRequest): Promise<IndexCalculationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/indices/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
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
    scale: number = 10
  ): Promise<{ download_url: string; expires_at: string }> {
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
          format: 'GeoTIFF',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        download_url: result.download_url,
        expires_at: result.expires_at,
      };
    } catch (error) {
      console.error('Error exporting index map:', error);
      throw error;
    }
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
