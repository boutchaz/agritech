import { fromLonLat } from 'ol/proj';

export interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
  boundingbox?: string[];
}

export interface GeocodingService {
  search: (query: string) => Promise<SearchResult[]>;
  reverse: (lat: number, lon: number) => Promise<SearchResult | null>;
}

// Using Nominatim (OpenStreetMap's free geocoding service)
class NominatimService implements GeocodingService {
  private baseUrl = 'https://nominatim.openstreetmap.org';
  private headers = {
    'Accept': 'application/json',
    'User-Agent': 'AgriTech-Platform/1.0' // Required by Nominatim
  };

  async search(query: string): Promise<SearchResult[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        limit: '5',
        addressdetails: '1',
        extratags: '1',
        namedetails: '1'
      });

      const response = await fetch(`${this.baseUrl}/search?${params}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Geocoding search error:', error);
      return [];
    }
  }

  async reverse(lat: number, lon: number): Promise<SearchResult | null> {
    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: 'json',
        addressdetails: '1'
      });

      const response = await fetch(`${this.baseUrl}/reverse?${params}`, {
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const geocodingService = new NominatimService();

// Utility functions
export function searchResultToCoordinates(result: SearchResult): [number, number] {
  return [parseFloat(result.lon), parseFloat(result.lat)];
}

export function searchResultToOLCoordinates(result: SearchResult): number[] {
  return fromLonLat([parseFloat(result.lon), parseFloat(result.lat)]);
}

// Get user's current position
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => {
        switch(error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Permission denied. Please allow location access.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out.'));
            break;
          default:
            reject(new Error('An unknown error occurred.'));
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

// Watch user's position for real-time updates
export function watchPosition(
  onSuccess: (position: GeolocationPosition) => void,
  onError?: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser');
  }

  return navigator.geolocation.watchPosition(
    onSuccess,
    onError || console.error,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

export function clearWatch(watchId: number): void {
  if (navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

// Morocco-specific search helpers
export function searchMoroccanLocation(query: string): Promise<SearchResult[]> {
  // Add Morocco context to the search
  return geocodingService.search(`${query}, Morocco`);
}

export function isLocationInMorocco(lat: number, lon: number): boolean {
  // Rough bounding box for Morocco
  const moroccoBox = {
    north: 35.9344,
    south: 27.6614,
    east: -0.9975,
    west: -13.1785
  };

  return lat >= moroccoBox.south &&
         lat <= moroccoBox.north &&
         lon >= moroccoBox.west &&
         lon <= moroccoBox.east;
}