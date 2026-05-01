import { Test, TestingModule } from '@nestjs/testing';
import { WeatherForecastDay, WeatherGateService } from './weather-gate.service';

describe('WeatherGateService', () => {
  let service: WeatherGateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WeatherGateService],
    }).compile();

    service = module.get<WeatherGateService>(WeatherGateService);
  });

  const createDay = (
    overrides: Partial<WeatherForecastDay> = {},
  ): WeatherForecastDay => ({
    date: '2026-04-16',
    tmin: 12,
    tmax: 24,
    precipitation_mm: 0,
    wind_kmh: 8,
    humidity_pct: 70,
    ...overrides,
  });

  describe('checkWeatherCompatibility', () => {
    it('blocks execution when no forecast is available', () => {
      const result = service.checkWeatherCompatibility('foliar spray', []);

      expect(result).toEqual({
        can_proceed: false,
        blocked_reason: 'No weather forecast available for the next 7 days',
      });
    });

    it('allows foliar applications when temperature, humidity, wind, and rain are suitable', () => {
      const forecast = [
        createDay({ date: '2026-04-16' }),
        createDay({ date: '2026-04-17', precipitation_mm: 1 }),
      ];

      const result = service.checkWeatherCompatibility(' Foliar Spray ', forecast);

      expect(result).toEqual({ can_proceed: true });
    });

    it('blocks foliar applications when rain is expected soon and suggests the next safe day', () => {
      const forecast = [
        createDay({ date: '2026-04-16', precipitation_mm: 1 }),
        createDay({ date: '2026-04-17', precipitation_mm: 0 }),
        createDay({ date: '2026-04-18', precipitation_mm: 0 }),
      ];

      const result = service.checkWeatherCompatibility('phytosanitaire', forecast);

      expect(result).toEqual({
        can_proceed: false,
        blocked_reason: 'Rain is expected too soon after foliar application',
        suggested_window: {
          date: '2026-04-17',
          conditions:
            'Temperature, humidity, and wind are suitable for foliar treatment',
        },
      });
    });

    it('blocks foliar applications for excessive heat when no later window is suitable', () => {
      const forecast = [
        createDay({ date: '2026-04-16', tmax: 31 }),
        createDay({ date: '2026-04-17', wind_kmh: 20 }),
      ];

      const result = service.checkWeatherCompatibility('spray', forecast);

      expect(result).toEqual({
        can_proceed: false,
        blocked_reason: 'Temperature is too high for foliar application',
      });
    });

    it('blocks foliar applications for excessive wind', () => {
      const forecast = [createDay({ wind_kmh: 15 })];

      const result = service.checkWeatherCompatibility('spray', forecast);

      expect(result).toEqual({
        can_proceed: false,
        blocked_reason: 'Wind speed is too high for foliar application',
      });
    });

    it('blocks foliar applications in dry or cool conditions', () => {
      const forecast = [createDay({ tmax: 14, humidity_pct: 55 })];

      const result = service.checkWeatherCompatibility('foliar', forecast);

      expect(result).toEqual({
        can_proceed: false,
        blocked_reason: 'Conditions are too dry/cool for optimal foliar absorption',
      });
    });

    it('allows fertigation when heavy rain is not expected', () => {
      const forecast = [createDay({ precipitation_mm: 10 })];

      const result = service.checkWeatherCompatibility('fertigation', forecast);

      expect(result).toEqual({ can_proceed: true });
    });

    it('blocks fertigation in heavy rain and suggests a later window', () => {
      const forecast = [
        createDay({ date: '2026-04-16', precipitation_mm: 20 }),
        createDay({ date: '2026-04-17', precipitation_mm: 5 }),
      ];

      const result = service.checkWeatherCompatibility('fertigation', forecast);

      expect(result).toEqual({
        can_proceed: false,
        blocked_reason: 'Heavy rain forecast increases nutrient leaching risk',
        suggested_window: {
          date: '2026-04-17',
          conditions: 'No heavy rain expected; fertigation can proceed',
        },
      });
    });

    it('allows pruning in dry and stable weather', () => {
      const forecast = [createDay({ tmin: 3, precipitation_mm: 0.5 })];

      const result = service.checkWeatherCompatibility('pruning', forecast);

      expect(result).toEqual({ can_proceed: true });
    });

    it('blocks pruning when frost risk exists', () => {
      const forecast = [createDay({ tmin: 0, precipitation_mm: 0 })];

      const result = service.checkWeatherCompatibility('taille', forecast);

      expect(result).toEqual({
        can_proceed: false,
        blocked_reason: 'Pruning blocked by frost or wet weather risk',
      });
    });

    it('returns allow by default when no weather gate is defined', () => {
      const forecast = [createDay()];

      const result = service.checkWeatherCompatibility('harvest', forecast);

      expect(result).toEqual({ can_proceed: true });
    });
  });
});
