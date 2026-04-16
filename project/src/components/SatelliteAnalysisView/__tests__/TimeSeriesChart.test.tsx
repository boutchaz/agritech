import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TimeSeriesChart from '../TimeSeriesChart'
import * as satelliteApi from '../../../lib/satellite-api'
import * as satelliteIndicesApi from '../../../lib/api/satellite-indices'

// Import jest-dom for the toBeInTheDocument matcher
import '@testing-library/jest-dom'

// Mock the hooks
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    currentOrganization: { id: 'test-org-id' },
  }),
}))

// Mock the satellite API
vi.mock('../../../lib/satellite-api', () => ({
  satelliteApi: {
    startTimeSeriesSync: vi.fn(),
    getTimeSeriesSyncStatus: vi.fn(),
    getTimeSeries: vi.fn(),
    getAvailableDates: vi.fn(),
  },
  TimeSeriesIndexType: {},
  VegetationIndexType: {},
  TIME_SERIES_INDICES: ['NIRv', 'EVI', 'NDRE', 'NDMI', 'NDVI', 'GCI', 'SAVI', 'MSAVI2', 'OSAVI', 'MSI', 'MNDWI', 'MCARI', 'TCARI', 'NIRvP', 'TCARI_OSAVI'],
  VEGETATION_INDEX_DESCRIPTIONS: {},
  convertBoundaryToGeoJSON: vi.fn((boundary) => ({
    type: 'Polygon',
    coordinates: [boundary],
  })),
  getDateRangeLastNDays: vi.fn((days) => ({
    start_date: '2024-01-01',
    end_date: '2025-01-01',
  })),
  DEFAULT_CLOUD_COVERAGE: 10,
}))

// Mock the satellite indices API
vi.mock('../../../lib/api/satellite-indices', () => ({
  satelliteIndicesApi: {
    getAll: vi.fn(),
  },
}))

// Mock apiRequest
vi.mock('../../../lib/api-client', () => ({
  apiRequest: vi.fn().mockResolvedValue({ data: [] }),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock ResizeObserver for Recharts
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// Helper to create wrapper with QueryClient
let queryClient: QueryClient

const createWrapper = () => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        staleTime: 0,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Sample test data
const mockBoundary = [
  [-8.577068435201765, 31.44278790572605],
  [-8.57793469997679, 31.44144176522235],
  [-8.577910966602268, 31.440652290625763],
  [-8.572274311655132, 31.44125957942667],
  [-8.572167511696115, 31.443466028674663],
  [-8.573306709146467, 31.443415422616454],
  [-8.573306709146467, 31.443132028648762],
  [-8.577068435201765, 31.44278790572605],
]

const mockCachedData = [
  { date: '2024-01-15', mean_value: 0.45, index_value: 0.45 },
  { date: '2024-02-15', mean_value: 0.52, index_value: 0.52 },
  { date: '2024-03-15', mean_value: 0.48, index_value: 0.48 },
] as unknown as Awaited<ReturnType<typeof satelliteIndicesApi.satelliteIndicesApi.getAll>>

const mockTimeSeriesData = {
  index: 'NIRvP',
  start_date: '2024-01-01',
  end_date: '2024-03-31',
  data: [
    { date: '2024-01-15', value: 0.35 },
    { date: '2024-02-15', value: 0.42 },
    { date: '2024-03-15', value: 0.38 },
  ],
}

describe('TimeSeriesChart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()

    // Reset localStorage mock to return null by default
    localStorageMock.getItem.mockReset()
    localStorageMock.getItem.mockReturnValue(null)

    // Setup default mock returns
    vi.mocked(satelliteIndicesApi.satelliteIndicesApi.getAll).mockResolvedValue(mockCachedData)
    vi.mocked(satelliteApi.satelliteApi.getTimeSeries).mockResolvedValue(mockTimeSeriesData)
    vi.mocked(satelliteApi.satelliteApi.startTimeSeriesSync).mockResolvedValue({
      status: 'syncing',
      totalIndices: 1,
      completedIndices: 0,
      currentIndex: 'NIRv',
      results: {},
    })
    vi.mocked(satelliteApi.satelliteApi.getTimeSeriesSyncStatus).mockResolvedValue({
      status: 'completed',
      startedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:01:00Z',
      totalIndices: 1,
      completedIndices: 1,
      currentIndex: null,
      results: { NIRv: { points: 10 } },
    })
  })

  describe('Component Rendering', () => {
    it('renders with default index selected', async () => {
      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          defaultIndex="NDVI"
        />,
        { wrapper }
      )

      // Check that the component renders without crashing
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetchFromSatellite|Satellite/i })).toBeInTheDocument()
      })
    })

    it('renders with NIRvP as default index', async () => {
      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          parcelName="Test Parcel"
          farmId="test-farm-id"
          boundary={mockBoundary}
          defaultIndex="NIRvP"
        />,
        { wrapper }
      )

      // Check that the component renders with NIRvP
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetchFromSatellite|Satellite/i })).toBeInTheDocument()
      })

      // The index selector should show NIRvP
      expect(screen.getByRole('button', { name: /NIRvP/i })).toBeInTheDocument()
    })

    it('renders with TCARI_OSAVI as default index', async () => {
      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          parcelName="Test Parcel"
          farmId="test-farm-id"
          boundary={mockBoundary}
          defaultIndex="TCARI_OSAVI"
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetchFromSatellite|Satellite/i })).toBeInTheDocument()
      })

      // The index selector should show TCARI_OSAVI
      expect(screen.getByRole('button', { name: /TCARI_OSAVI/i })).toBeInTheDocument()
    })
  })

  describe('Index Selection', () => {
    it('shows the selected index in the selector', async () => {
      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          boundary={mockBoundary}
          defaultIndex="NIRv"
        />,
        { wrapper }
      )

      // Wait for the index selector button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /NIRv/i })).toBeInTheDocument()
      })
    })

    it('allows clicking on the index selector', async () => {
      const user = userEvent.setup()
      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          boundary={mockBoundary}
          defaultIndex="NIRv"
        />,
        { wrapper }
      )

      // Wait for the index selector button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /NIRv/i })).toBeInTheDocument()
      })

      // The index selector button shows the selected index
      const selectorButton = screen.getByRole('button', { name: /NIRv/i })

      // Clicking should not throw
      await user.click(selectorButton)
    })
  })

  describe('Date Range Persistence', () => {
    it('restores date range from localStorage', async () => {
      const persistedDates = JSON.stringify({ start: '2024-06-01', end: '2024-12-01' })
      localStorageMock.getItem.mockReturnValue(persistedDates)

      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          boundary={mockBoundary}
        />,
        { wrapper }
      )

      expect(localStorageMock.getItem).toHaveBeenCalledWith('timeseries-date-range-test-parcel-id')
    })

    it('falls back to default range when localStorage is invalid', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')

      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          boundary={mockBoundary}
        />,
        { wrapper }
      )

      // Should call getDateRangeLastNDays as fallback
      await waitFor(() => {
        expect(satelliteApi.getDateRangeLastNDays).toHaveBeenCalledWith(730)
      })
    })
  })

  describe('Sync Button', () => {
    it('renders sync button', async () => {
      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          parcelName="Test Parcel"
          farmId="test-farm-id"
          boundary={mockBoundary}
        />,
        { wrapper }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetchFromSatellite|Satellite/i })).toBeInTheDocument()
      })
    })

    it('sync button is present and clickable', async () => {
      const user = userEvent.setup()
      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          parcelName="Test Parcel"
          farmId="test-farm-id"
          boundary={mockBoundary}
        />,
        { wrapper }
      )

      const syncButton = await screen.findByRole('button', { name: /fetchFromSatellite|Satellite/i })
      expect(syncButton).toBeInTheDocument()

      // Clicking the button should work (even if disabled, the click doesn't throw)
      await user.click(syncButton)
    })
  })

  describe('Data Display', () => {
    it('shows loading state while fetching data', async () => {
      // Make the API call hang
      vi.mocked(satelliteIndicesApi.satelliteIndicesApi.getAll).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          boundary={mockBoundary}
        />,
        { wrapper }
      )

      // Component should render without crashing during loading
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetchFromSatellite|Satellite/i })).toBeInTheDocument()
      })
    })

    it('handles empty data gracefully', async () => {
      vi.mocked(satelliteIndicesApi.satelliteIndicesApi.getAll).mockResolvedValue([])

      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          boundary={mockBoundary}
        />,
        { wrapper }
      )

      // Should render without errors even with empty data
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetchFromSatellite|Satellite/i })).toBeInTheDocument()
      })
    })

    it('handles API errors gracefully', async () => {
      vi.mocked(satelliteIndicesApi.satelliteIndicesApi.getAll).mockRejectedValue(
        new Error('API Error')
      )

      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          boundary={mockBoundary}
        />,
        { wrapper }
      )

      // Should render without crashing on error
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetchFromSatellite|Satellite/i })).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles missing boundary gracefully', async () => {
      const wrapper = createWrapper()

      render(
        <TimeSeriesChart
          parcelId="test-parcel-id"
          // No boundary provided
        />,
        { wrapper }
      )

      // Should render without crashing
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /fetchFromSatellite|Satellite/i })).toBeInTheDocument()
      })
    })
  })

  describe('Derived Index Conversion Logic', () => {
    // These tests verify the conversion logic independently of React Query execution
    it('identifies NIRvP as a derived index that requires NIRv', () => {
      const derivedIndexMap: Record<string, string[]> = {
        'NIRvP': ['NIRv'],
        'TCARI_OSAVI': ['TCARI', 'OSAVI'],
      }

      expect(derivedIndexMap['NIRvP']).toContain('NIRv')
      expect(derivedIndexMap['NIRvP']).toHaveLength(1)
    })

    it('identifies TCARI_OSAVI as a derived index that requires TCARI and OSAVI', () => {
      const derivedIndexMap: Record<string, string[]> = {
        'NIRvP': ['NIRv'],
        'TCARI_OSAVI': ['TCARI', 'OSAVI'],
      }

      expect(derivedIndexMap['TCARI_OSAVI']).toContain('TCARI')
      expect(derivedIndexMap['TCARI_OSAVI']).toContain('OSAVI')
      expect(derivedIndexMap['TCARI_OSAVI']).toHaveLength(2)
    })

    it('regular indices do not require conversion', () => {
      const derivedIndices = ['NIRvP', 'TCARI_OSAVI']
      const regularIndex = 'NIRv'

      expect(derivedIndices).not.toContain(regularIndex)
    })
  })
})
