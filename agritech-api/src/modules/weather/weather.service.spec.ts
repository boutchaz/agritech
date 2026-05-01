import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { WeatherService } from './weather.service';
import {
  createMockSupabaseClient,
  mockQueryResult,
  setupTableMock,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_DATES, TEST_IDS } from '../../../test/helpers/test-utils';

describe('WeatherService', () => {
  let service: WeatherService;
  let mockClient: MockSupabaseClient;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeatherService,
        { provide: DatabaseService, useValue: { getAdminClient: () => mockClient } },
      ],
    }).compile();

    service = module.get<WeatherService>(WeatherService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getParcelWeather', () => {
    it('returns weather analytics for an organization-scoped parcel', async () => {
      const parcelsBuilder = setupTableMock(mockClient, 'parcels');
      parcelsBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          boundary: [
            [-7.61, 33.58],
            [-7.59, 33.58],
            [-7.59, 33.56],
            [-7.61, 33.56],
          ],
        }),
      );

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            daily: {
              time: ['2026-04-10', '2026-04-11'],
              temperature_2m_min: [10, 12],
              temperature_2m_mean: [15, 18],
              temperature_2m_max: [20, 24],
              precipitation_sum: [0, 4],
              et0_fao_evapotranspiration: [1.1, 1.3],
              relative_humidity_2m_mean: [50, 60],
              wind_speed_10m_max: [5, 6],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            current: {
              temperature_2m: 22,
              apparent_temperature: 24,
              relative_humidity_2m: 55,
              pressure_msl: 1012,
              wind_speed_10m: 10,
              wind_direction_10m: 180,
              weather_code: 61,
              cloud_cover: 35,
            },
            daily: {
              time: ['2026-04-12'],
              temperature_2m_min: [13],
              temperature_2m_max: [25],
              precipitation_sum: [2],
              weather_code: [3],
              wind_speed_10m_max: [8],
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            daily: {
              time: ['2025-04-10', '2024-04-10'],
              temperature_2m_min: [9, 11],
              temperature_2m_mean: [14, 16],
              temperature_2m_max: [19, 21],
              precipitation_sum: [1, 3],
            },
          }),
        });

      const result = await service.getParcelWeather(
        TEST_IDS.parcel,
        TEST_IDS.organization,
        '2026-04-10',
        '2026-04-11',
      );

      expect(result.current).toEqual(
        expect.objectContaining({
          temp: 22,
          feels_like: 24,
          humidity: 55,
          description: 'Rain',
          icon: '10d',
        }),
      );
      expect(result.daily).toEqual([
        expect.objectContaining({ date: '2026-04-10', precipitation: 0, is_wet_day: false }),
        expect.objectContaining({ date: '2026-04-11', precipitation: 4, is_wet_day: true }),
      ]);
      expect(result.forecast).toEqual([
        expect.objectContaining({
          date: '2026-04-12',
          temp: { day: 19, min: 13, max: 25 },
          description: 'Partly cloudy',
        }),
      ]);
      expect(result.monthly).toEqual([
        expect.objectContaining({
          month: '2026-04',
          precipitation_total: 4,
          wet_days_count: 1,
          dry_days_count: 1,
        }),
      ]);
      expect(result.temperature_series).toEqual([
        expect.objectContaining({ date: '2026-04-10', ltn_mean: 15 }),
        expect.objectContaining({ date: '2026-04-11', ltn_mean: 18 }),
      ]);
      expect(result.alerts).toEqual([]);
      expect(result.location).toEqual({ latitude: 33.57, longitude: -7.6 });
      expect(parcelsBuilder.eq).toHaveBeenCalledWith('id', TEST_IDS.parcel);
      expect(parcelsBuilder.eq).toHaveBeenCalledWith(
        'farms.organization_id',
        TEST_IDS.organization,
      );
    });

    it('returns an empty response when the parcel has no boundary', async () => {
      const parcelsBuilder = setupTableMock(mockClient, 'parcels');
      parcelsBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ boundary: null }));

      const result = await service.getParcelWeather(
        TEST_IDS.parcel,
        TEST_IDS.organization,
        TEST_DATES.yesterday,
        TEST_DATES.today,
      );

      expect(result).toEqual({
        current: null,
        forecast: [],
        daily: [],
        monthly: [],
        temperature_series: [],
        alerts: [],
        location: { latitude: 0, longitude: 0 },
        start_date: TEST_DATES.yesterday,
        end_date: TEST_DATES.today,
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('data fetchers', () => {
    it('maps archive daily weather data into service format', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          daily: {
            time: ['2026-04-10'],
            temperature_2m_min: [9],
            temperature_2m_mean: [14],
            temperature_2m_max: [20],
            precipitation_sum: [2.5],
            et0_fao_evapotranspiration: [1.2],
            relative_humidity_2m_mean: [61],
            wind_speed_10m_max: [7],
          },
        }),
      });

      const fetchArchiveData = Reflect.get(
        service,
        'fetchArchiveData',
      ) as (lat: number, lon: number, startDate: string, endDate: string) => Promise<unknown>;

      const result = await fetchArchiveData.call(service, 33.5, -7.6, '2026-04-10', '2026-04-10');

      expect(result).toEqual([
        {
          date: '2026-04-10',
          temperature_min: 9,
          temperature_mean: 14,
          temperature_max: 20,
          precipitation: 2.5,
          et0: 1.2,
          humidity: 61,
          wind_speed: 7,
          is_wet_day: true,
        },
      ]);
    });

    it('returns an empty archive result when the upstream API fails', async () => {
      fetchMock.mockRejectedValue(new Error('network down'));

      const fetchArchiveData = Reflect.get(
        service,
        'fetchArchiveData',
      ) as (lat: number, lon: number, startDate: string, endDate: string) => Promise<unknown[]>;

      await expect(
        fetchArchiveData.call(service, 33.5, -7.6, '2026-04-10', '2026-04-10'),
      ).resolves.toEqual([]);
    });

    it('maps current and forecast weather data', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 18,
            apparent_temperature: 17,
            relative_humidity_2m: 48,
            pressure_msl: 1015,
            wind_speed_10m: 5,
            wind_direction_10m: 240,
            weather_code: 95,
            cloud_cover: 70,
          },
          daily: {
            time: ['2026-04-12'],
            temperature_2m_min: [11],
            temperature_2m_max: [21],
            precipitation_sum: [6],
            weather_code: [51],
            wind_speed_10m_max: [4],
          },
        }),
      });

      const fetchForecast = Reflect.get(
        service,
        'fetchForecast',
      ) as (lat: number, lon: number) => Promise<{
        current: Record<string, unknown> | null;
        forecast: Record<string, unknown>[];
      }>;

      const result = await fetchForecast.call(service, 33.5, -7.6);

      expect(result.current).toEqual(
        expect.objectContaining({
          temp: 18,
          wind_speed: 18,
          description: 'Thunderstorm',
          icon: '11d',
        }),
      );
      expect(result.forecast).toEqual([
        expect.objectContaining({
          date: '2026-04-12',
          windSpeed: 14,
          description: 'Drizzle',
          icon: '09d',
        }),
      ]);
    });

    it('computes climate normals by month-day and handles wet day probabilities', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          daily: {
            time: ['2025-04-10', '2024-04-10', '2025-04-11'],
            temperature_2m_min: [9, 11, 10],
            temperature_2m_mean: [14, 16, 15],
            temperature_2m_max: [19, 21, 20],
            precipitation_sum: [0, 4, 2],
          },
        }),
      });

      const fetchClimateNormals = Reflect.get(
        service,
        'fetchClimateNormals',
      ) as (lat: number, lon: number) => Promise<Record<string, Record<string, number>>>;

      const result = await fetchClimateNormals.call(service, 33.5, -7.6);

      expect(result['4-10']).toEqual({
        month: 4,
        day: 10,
        temperature_min: 10,
        temperature_mean: 15,
        temperature_max: 20,
        precipitation_avg: 2,
        wet_days_probability: 0.5,
      });
      expect(result['4-11']).toEqual({
        month: 4,
        day: 11,
        temperature_min: 10,
        temperature_mean: 15,
        temperature_max: 20,
        precipitation_avg: 2,
        wet_days_probability: 1,
      });
    });
  });
});
