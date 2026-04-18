import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  satelliteApi,
  convertBoundaryToGeoJSON,
  formatDateForAPI,
  getDateRangeLastNDays,
  DEFAULT_CLOUD_COVERAGE,
  TIME_SERIES_INDICES,
  VEGETATION_INDICES,
  INDEX_METADATA,
  RELIABILITY_CONFIG,
  VEGETATION_INDEX_DESCRIPTIONS,
  type VegetationIndexType,
  type TimeSeriesIndexType,
  type IndexReliability,
} from '../satellite-api'

// Mock the api-client module
vi.mock('../api-client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import { apiClient } from '../api-client'

const mockApiClient = vi.mocked(apiClient)

describe('satellite-api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Constants', () => {
    it('DEFAULT_CLOUD_COVERAGE should be 10', () => {
      expect(DEFAULT_CLOUD_COVERAGE).toBe(10)
    })

    it('TIME_SERIES_INDICES should include derived indices', () => {
      expect(TIME_SERIES_INDICES).toContain('NIRvP')
      expect(TIME_SERIES_INDICES).toContain('TCARI_OSAVI')
    })

    it('TIME_SERIES_INDICES should include all vegetation indices', () => {
      VEGETATION_INDICES.forEach(index => {
        expect(TIME_SERIES_INDICES).toContain(index)
      })
    })

    it('VEGETATION_INDICES should have correct order (fiable first)', () => {
      // First indices should be the reliable ones
      expect(VEGETATION_INDICES[0]).toBe('NIRv')
      expect(VEGETATION_INDICES[1]).toBe('EVI')
      expect(VEGETATION_INDICES[2]).toBe('NDRE')
    })

    it('INDEX_METADATA should have entries for all time series indices', () => {
      TIME_SERIES_INDICES.forEach(index => {
        expect(INDEX_METADATA[index]).toBeDefined()
        expect(INDEX_METADATA[index]).toHaveProperty('reliability')
        expect(INDEX_METADATA[index]).toHaveProperty('priority')
        expect(INDEX_METADATA[index]).toHaveProperty('description')
      })
    })

    it('RELIABILITY_CONFIG should have all reliability levels', () => {
      const levels: IndexReliability[] = ['fiable', 'utile', 'prudence', 'inutile']
      levels.forEach(level => {
        expect(RELIABILITY_CONFIG[level]).toBeDefined()
        expect(RELIABILITY_CONFIG[level]).toHaveProperty('label')
        expect(RELIABILITY_CONFIG[level]).toHaveProperty('color')
        expect(RELIABILITY_CONFIG[level]).toHaveProperty('bgColor')
        expect(RELIABILITY_CONFIG[level]).toHaveProperty('borderColor')
      })
    })

    it('VEGETATION_INDEX_DESCRIPTIONS should have entries for all vegetation indices', () => {
      VEGETATION_INDICES.forEach(index => {
        expect(VEGETATION_INDEX_DESCRIPTIONS[index]).toBeDefined()
        expect(typeof VEGETATION_INDEX_DESCRIPTIONS[index]).toBe('string')
      })
    })
  })

  describe('convertBoundaryToGeoJSON', () => {
    it('should convert WGS84 coordinates to GeoJSON Polygon', () => {
      const boundary = [
        [-8.577, 31.442],
        [-8.578, 31.441],
        [-8.572, 31.443],
        [-8.577, 31.442], // Already closed
      ]

      const result = convertBoundaryToGeoJSON(boundary)

      expect(result.type).toBe('Polygon')
      expect(result.coordinates).toHaveLength(1)
      expect(result.coordinates[0]).toHaveLength(4)
    })

    it('should close unclosed polygons', () => {
      const boundary = [
        [-8.577, 31.442],
        [-8.578, 31.441],
        [-8.572, 31.443],
      ]

      const result = convertBoundaryToGeoJSON(boundary)

      // Should add the first point at the end to close the polygon
      expect(result.coordinates[0]).toHaveLength(4)
      expect(result.coordinates[0][0]).toEqual(result.coordinates[0][3])
    })

    it('should convert Web Mercator (EPSG:3857) coordinates to WGS84', () => {
      // Marrakech area in Web Mercator
      const boundary = [
        [-1001875.4171, 3709080.2425], // ~-9°, ~31.5° in WGS84
        [-1001875.4171, 3709080.2425],
        [-1001875.4171, 3709080.2425],
      ]

      const result = convertBoundaryToGeoJSON(boundary)

      // First coordinate should be converted to WGS84
      const firstCoord = result.coordinates[0][0]
      expect(Math.abs(firstCoord[0])).toBeLessThan(180)
      expect(Math.abs(firstCoord[1])).toBeLessThan(90)
    })

    it('should throw error for invalid boundary with less than 3 coordinates', () => {
      const boundary = [
        [-8.577, 31.442],
        [-8.578, 31.441],
      ]

      expect(() => convertBoundaryToGeoJSON(boundary)).toThrow('Invalid boundary: must have at least 3 coordinates')
    })

    it('should throw error for null boundary', () => {
      expect(() => convertBoundaryToGeoJSON(null as unknown as number[][])).toThrow('Invalid boundary')
    })

    it('should throw error for empty boundary', () => {
      expect(() => convertBoundaryToGeoJSON([])).toThrow('Invalid boundary')
    })

    it('should throw error for coordinates outside valid range after conversion', () => {
      // Coordinates that would result in invalid WGS84 values
      const boundary = [
        [999999999, 999999999],
        [999999999, 999999998],
        [999999998, 999999999],
      ]

      expect(() => convertBoundaryToGeoJSON(boundary)).toThrow()
    })
  })

  describe('formatDateForAPI', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-06-15T10:30:00Z')
      const result = formatDateForAPI(date)

      expect(result).toBe('2024-06-15')
    })

    it('should handle different timezones correctly', () => {
      // Create a date at midnight UTC
      const date = new Date('2024-12-31T00:00:00Z')
      const result = formatDateForAPI(date)

      expect(result).toBe('2024-12-31')
    })
  })

  describe('getDateRangeLastNDays', () => {
    it('should return correct date range for 30 days', () => {
      const result = getDateRangeLastNDays(30)

      expect(result).toHaveProperty('start_date')
      expect(result).toHaveProperty('end_date')

      // Parse dates and verify difference
      const startDate = new Date(result.start_date)
      const endDate = new Date(result.end_date)
      const diffTime = endDate.getTime() - startDate.getTime()
      const diffDays = diffTime / (1000 * 60 * 60 * 24)

      expect(diffDays).toBe(30)
    })

    it('should return correct date range for 730 days (2 years)', () => {
      const result = getDateRangeLastNDays(730)

      const startDate = new Date(result.start_date)
      const endDate = new Date(result.end_date)
      const diffTime = endDate.getTime() - startDate.getTime()
      const diffDays = diffTime / (1000 * 60 * 60 * 24)

      expect(diffDays).toBe(730)
    })

    it('end_date should be today', () => {
      const result = getDateRangeLastNDays(7)
      const today = formatDateForAPI(new Date())

      expect(result.end_date).toBe(today)
    })
  })

  describe('SatelliteAPIClient', () => {
    describe('getHealth', () => {
      it('should call GET /health', async () => {
        mockApiClient.get.mockResolvedValue({ status: 'ok' })

        const result = await satelliteApi.getHealth()

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/satellite-proxy/health')
        expect(result).toEqual({ status: 'ok' })
      })
    })

    describe('calculateIndices', () => {
      it('should call POST /indices/calculate with defaults', async () => {
        const mockResponse = {
          request_id: 'test-id',
          timestamp: '2024-01-01T00:00:00Z',
          indices: [],
          metadata: {},
        }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const request = {
          aoi: {
            geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
          },
          date_range: { start_date: '2024-01-01', end_date: '2024-01-31' },
          indices: ['NDVI'] as VegetationIndexType[],
        }

        const result = await satelliteApi.calculateIndices(request)

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/satellite-proxy/indices/calculate',
          expect.objectContaining({
            use_aoi_cloud_filter: true,
            cloud_buffer_meters: 300,
          })
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('getTimeSeries', () => {
      it('should call POST /indices/timeseries', async () => {
        const mockResponse = {
          index: 'NIRv',
          start_date: '2024-01-01',
          end_date: '2024-03-31',
          data: [],
        }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const request = {
          aoi: {
            geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
          },
          date_range: { start_date: '2024-01-01', end_date: '2024-03-31' },
          index: 'NIRv' as TimeSeriesIndexType,
        }

        const result = await satelliteApi.getTimeSeries(request)

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/satellite-proxy/indices/timeseries',
          request
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('startTimeSeriesSync', () => {
      it('should call POST /indices/timeseries-sync', async () => {
        const mockResponse = {
          status: 'syncing' as const,
          totalIndices: 4,
          completedIndices: 0,
          currentIndex: 'NIRv',
          results: {},
        }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const body = {
          parcel_id: 'test-parcel',
          aoi: {
            geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
            name: 'Test Parcel',
          },
          date_range: { start_date: '2024-01-01', end_date: '2024-03-31' },
          cloud_coverage: 10,
        }

        const result = await satelliteApi.startTimeSeriesSync(body)

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/satellite-proxy/indices/timeseries-sync',
          body
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('getTimeSeriesSyncStatus', () => {
      it('should call GET /indices/timeseries-sync/{parcelId}/status', async () => {
        const mockResponse = {
          status: 'completed' as const,
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:01:00Z',
          totalIndices: 4,
          completedIndices: 4,
          currentIndex: null,
          results: {},
        }
        mockApiClient.get.mockResolvedValue(mockResponse)

        const result = await satelliteApi.getTimeSeriesSyncStatus('test-parcel-id')

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/satellite-proxy/indices/timeseries-sync/test-parcel-id/status'
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('getAvailableDates', () => {
      it('should call POST /indices/available-dates with correct params', async () => {
        const mockResponse = {
          available_dates: [
            { date: '2024-01-15', cloud_coverage: 5, timestamp: 1705276800, available: true },
          ],
          total_images: 1,
          date_range: { start: '2024-01-01', end: '2024-01-31' },
          filters: { max_cloud_coverage: 10 },
        }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const aoi = {
          geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        }

        const result = await satelliteApi.getAvailableDates(
          aoi,
          '2024-01-01',
          '2024-01-31',
          10,
          'test-parcel',
          true
        )

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/satellite-proxy/indices/available-dates',
          expect.objectContaining({
            aoi,
            start_date: '2024-01-01',
            end_date: '2024-01-31',
            cloud_coverage: 10,
            parcel_id: 'test-parcel',
            force_refresh: true,
          })
        )
        expect(result).toEqual(mockResponse)
      })

      it('should use default cloud coverage of 10', async () => {
        mockApiClient.post.mockResolvedValue({
          available_dates: [],
          total_images: 0,
          date_range: { start: '', end: '' },
          filters: { max_cloud_coverage: 10 },
        })

        const aoi = {
          geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        }

        await satelliteApi.getAvailableDates(aoi, '2024-01-01', '2024-01-31')

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/satellite-proxy/indices/available-dates',
          expect.objectContaining({
            cloud_coverage: 10,
          })
        )
      })
    })

    describe('checkCloudCoverage', () => {
      it('should call POST /analysis/cloud-coverage', async () => {
        const mockResponse = {
          has_suitable_images: true,
          available_images_count: 5,
          suitable_images_count: 3,
        }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const request = {
          geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
          date_range: { start_date: '2024-01-01', end_date: '2024-01-31' },
        }

        const result = await satelliteApi.checkCloudCoverage(request)

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/satellite-proxy/analysis/cloud-coverage',
          request
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('hasCloudFreeImages', () => {
      it('should return true when suitable images exist', async () => {
        mockApiClient.post.mockResolvedValue({
          has_suitable_images: true,
          available_images_count: 5,
          suitable_images_count: 3,
        })

        const aoi = {
          geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        }
        const dateRange = { start_date: '2024-01-01', end_date: '2024-01-31' }

        const result = await satelliteApi.hasCloudFreeImages(aoi, dateRange, 10)

        expect(result).toBe(true)
      })

      it('should return false when no suitable images exist', async () => {
        mockApiClient.post.mockResolvedValue({
          has_suitable_images: false,
          available_images_count: 5,
          suitable_images_count: 0,
        })

        const aoi = {
          geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        }
        const dateRange = { start_date: '2024-01-01', end_date: '2024-01-31' }

        const result = await satelliteApi.hasCloudFreeImages(aoi, dateRange, 10)

        expect(result).toBe(false)
      })

      it('should return false on error', async () => {
        mockApiClient.post.mockRejectedValue(new Error('API Error'))

        const aoi = {
          geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        }
        const dateRange = { start_date: '2024-01-01', end_date: '2024-01-31' }

        const result = await satelliteApi.hasCloudFreeImages(aoi, dateRange, 10)

        expect(result).toBe(false)
      })
    })

    describe('getHeatmapData', () => {
      it('should call POST /indices/heatmap', async () => {
        const mockResponse = {
          date: '2024-01-15',
          index: 'NDVI',
          bounds: { min_lon: 0, max_lon: 1, min_lat: 0, max_lat: 1 },
          pixel_data: [],
          aoi_boundary: [],
          statistics: { min: 0, max: 1, mean: 0.5, median: 0.5, p10: 0.1, p90: 0.9, std: 0.2, count: 100 },
          visualization: { min: 0, max: 1, palette: [] },
          metadata: { sample_scale: 10, total_pixels: 100, data_source: 'sentinel-2' },
        }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const request = {
          aoi: {
            geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
          },
          date: '2024-01-15',
          index: 'NDVI' as VegetationIndexType,
        }

        const result = await satelliteApi.getHeatmapData(request)

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/satellite-proxy/indices/heatmap',
          request
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('generateInteractiveVisualization', () => {
      it('should call getHeatmapData for heatmap type', async () => {
        const mockResponse = {
          date: '2024-01-15',
          index: 'NDVI',
          bounds: { min_lon: 0, max_lon: 1, min_lat: 0, max_lat: 1 },
          pixel_data: [],
          aoi_boundary: [],
          statistics: { min: 0, max: 1, mean: 0.5, median: 0.5, p10: 0.1, p90: 0.9, std: 0.2, count: 100 },
          visualization: { min: 0, max: 1, palette: [] },
          metadata: { sample_scale: 10, total_pixels: 100, data_source: 'sentinel-2' },
        }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const aoi = {
          geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        }

        const result = await satelliteApi.generateInteractiveVisualization(
          aoi,
          '2024-01-15',
          'NDVI',
          'heatmap',
          'test-parcel'
        )

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/satellite-proxy/indices/heatmap',
          expect.objectContaining({
            aoi,
            date: '2024-01-15',
            index: 'NDVI',
            grid_size: 1000,
            parcel_id: 'test-parcel',
          })
        )
        expect(result).toEqual(mockResponse)
      })

      it('should call getInteractiveData for scatter type', async () => {
        const mockResponse = {
          date: '2024-01-15',
          index: 'NDVI',
          bounds: { min_lon: 0, max_lon: 1, min_lat: 0, max_lat: 1 },
          pixel_data: [],
          statistics: { min: 0, max: 1, mean: 0.5, median: 0.5, p10: 0.1, p90: 0.9, std: 0.2, count: 100 },
          visualization: { min: 0, max: 1, palette: [] },
          metadata: {},
        }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const aoi = {
          geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        }

        const result = await satelliteApi.generateInteractiveVisualization(
          aoi,
          '2024-01-15',
          'NDVI',
          'scatter'
        )

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/satellite-proxy/indices/interactive',
          expect.objectContaining({
            aoi,
            date: '2024-01-15',
            index: 'NDVI',
            max_pixels: 10000,
          })
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('calculateParcelStatistics', () => {
      it('should call POST /analysis/parcel-statistics with defaults', async () => {
        const mockResponse = {
          parcel_id: 'test-parcel',
          statistics: {},
          cloud_coverage_info: {
            threshold_used: 10,
            images_found: 5,
            avg_cloud_coverage: 5,
            best_date: '2024-01-15',
          },
          metadata: {
            date_range: { start_date: '2024-01-01', end_date: '2024-01-31' },
            processing_date: '2024-01-01T00:00:00Z',
            scale: 10,
          },
        }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const request = {
          parcel_id: 'test-parcel',
          aoi: {
            geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
          },
          date_range: { start_date: '2024-01-01', end_date: '2024-01-31' },
          indices: ['NDVI'] as VegetationIndexType[],
        }

        const result = await satelliteApi.calculateParcelStatistics(request)

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/satellite-proxy/analysis/parcel-statistics',
          expect.objectContaining({
            use_aoi_cloud_filter: true,
            cloud_buffer_meters: 300,
          })
        )
        expect(result).toEqual(mockResponse)
      })
    })

    describe('generateMultipleIndexImages', () => {
      it('should call generateIndexImage for each index', async () => {
        const mockResponse = {
          image_url: 'https://example.com/image.png',
          index: 'NDVI',
          date: '2024-01-15',
          cloud_coverage: 5,
          metadata: { available_images: 5, suitable_images: 3 },
        }
        mockApiClient.post.mockResolvedValue(mockResponse)

        const aoi = {
          geometry: { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] },
        }
        const dateRange = { start_date: '2024-01-01', end_date: '2024-01-31' }

        const result = await satelliteApi.generateMultipleIndexImages(
          aoi,
          dateRange,
          ['NDVI', 'EVI'] as VegetationIndexType[],
          10
        )

        expect(mockApiClient.post).toHaveBeenCalledTimes(2)
        expect(result).toHaveLength(2)
      })
    })
  })
})
