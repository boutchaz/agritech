import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom'

// Mock useAuth
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    currentOrganization: { id: 'test-org-id' },
  }),
}))

// Mock satellite API
vi.mock('../../../lib/satellite-api', () => ({
  satelliteApi: {
    startTimeSeriesSync: vi.fn(),
    getTimeSeriesSyncStatus: vi.fn(),
    getTimeSeries: vi.fn(),
    getAvailableDates: vi.fn(),
  },
  TimeSeriesIndexType: {},
  VegetationIndexType: {},
  TIME_SERIES_INDICES: ['NIRv', 'EVI', 'NDRE', 'NDMI'],
  VEGETATION_INDEX_DESCRIPTIONS: { NIRv: 'NIRv description' },
  convertBoundaryToGeoJSON: vi.fn((boundary: number[][]) => ({
    type: 'Polygon',
    coordinates: [boundary],
  })),
  getDateRangeLastNDays: vi.fn((days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    return {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
    }
  }),
  DEFAULT_CLOUD_COVERAGE: 10,
}))

// Mock satellite indices API
vi.mock('../../../lib/api/satellite-indices', () => ({
  satelliteIndicesApi: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}))

// Mock apiRequest
vi.mock('../../../lib/api-client', () => ({
  apiRequest: vi.fn().mockResolvedValue({ data: [] }),
}))

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// localStorage mock
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageMock.store[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageMock.store[key] }),
  clear: vi.fn(() => { localStorageMock.store = {} }),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const TODAY = new Date().toISOString().split('T')[0]

const mockBoundary = [
  [-7.605586, 32.991767],
  [-7.605586, 32.990943],
  [-7.605231, 32.990895],
  [-7.604899, 32.991101],
  [-7.605586, 32.991767],
]

// Import after mocks are set up (vi.mock is hoisted)
import TimeSeriesChart from '../TimeSeriesChart'

function renderChart(props: Record<string, unknown> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TimeSeriesChart
        parcelId="test-parcel-id"
        parcelName="Test Parcel"
        boundary={mockBoundary}
        {...(props as any)}
      />
    </QueryClientProvider>,
  )
}

describe('TimeSeriesChart end_date always today', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('initializes end_date to today even when localStorage has a stale date', async () => {
    // Simulate stale localStorage: end saved as 2026-03-25 (not today)
    localStorageMock.store['timeseries-date-range-test-parcel-id'] = JSON.stringify({
      start: '2024-03-25',
      end: '2026-03-25',
    })

    renderChart()

    // Find the end-date input
    await waitFor(() => {
      const endDateInput = screen.getByDisplayValue(TODAY) as HTMLInputElement
      expect(endDateInput).toBeInTheDocument()
    })

    // Verify it is NOT the stale date
    expect(screen.queryByDisplayValue('2026-03-25')).toBeNull()
  })

  it('restores start_date from localStorage but forces end_date to today', async () => {
    localStorageMock.store['timeseries-date-range-test-parcel-id'] = JSON.stringify({
      start: '2025-06-01',
      end: '2025-12-01',
    })

    renderChart()

    await waitFor(() => {
      // start_date should be restored
      expect(screen.getByDisplayValue('2025-06-01')).toBeInTheDocument()
      // end_date should be today, not the stored value
      expect(screen.getByDisplayValue(TODAY)).toBeInTheDocument()
    })

    expect(screen.queryByDisplayValue('2025-12-01')).toBeNull()
  })

  it('forceSync sends today as end_date even if user changed the input', async () => {
    const user = userEvent.setup()
    const { satelliteApi } = await import('../../../lib/satellite-api')

    vi.mocked(satelliteApi.startTimeSeriesSync).mockResolvedValue({
      status: 'completed',
      totalIndices: 1,
      completedIndices: 1,
      currentIndex: null,
      results: { NIRv: { points: 5 } },
    })
    vi.mocked(satelliteApi.getTimeSeriesSyncStatus).mockResolvedValue({
      status: 'completed',
      startedAt: '2026-03-31T00:00:00Z',
      completedAt: '2026-03-31T00:01:00Z',
      totalIndices: 1,
      completedIndices: 1,
      currentIndex: null,
      results: { NIRv: { points: 5 } },
    })

    renderChart()

    // Wait for render
    await waitFor(() => {
      expect(screen.getByDisplayValue(TODAY)).toBeInTheDocument()
    })

    // Manually change the end_date input to a past date
    const endDateInput = screen.getByDisplayValue(TODAY)
    fireEvent.change(endDateInput, { target: { value: '2026-03-15' } })

    // Click sync button
    const syncButton = screen.getByRole('button', { name: /récupérer/i })
    await user.click(syncButton)

    // Assert startTimeSeriesSync was called with today, not the manually entered date
    await waitFor(() => {
      expect(satelliteApi.startTimeSeriesSync).toHaveBeenCalled()
    })

    const callArgs = vi.mocked(satelliteApi.startTimeSeriesSync).mock.calls[0][0]
    expect(callArgs.date_range.end_date).toBe(TODAY)
    expect(callArgs.date_range.end_date).not.toBe('2026-03-15')
  })

  it('only persists start_date to localStorage, not end_date', async () => {
    renderChart()

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    // Check what was persisted — should only contain start, not end
    const lastCall = localStorageMock.setItem.mock.calls.find(
      (call: string[]) => call[0] === 'timeseries-date-range-test-parcel-id'
    )
    expect(lastCall).toBeDefined()
    const persisted = JSON.parse(lastCall![1])
    expect(persisted).not.toHaveProperty('end')
    expect(persisted).toHaveProperty('start')
  })
})
