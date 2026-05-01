import { describe, it, expect } from 'vitest';
import type {
  ChillHoursDisplay,
  PhenologyDashboardData,
} from '../calibration-review';

describe('ChillHoursDisplay', () => {
  it('mirrors backend DTO fields', () => {
    const sample: ChillHoursDisplay = {
      value: 342,
      reference: {
        min: 200,
        max: 400,
        source: 'variety',
        variety_label: 'Picholine Marocaine',
      },
      band: 'yellow',
      phrase: 'Heures de froid acceptables',
    };
    expect(sample.value).toBe(342);
    expect(sample.reference.source).toBe('variety');
    expect(sample.band).toBe('yellow');
  });
});

describe('PhenologyDashboardData', () => {
  it('exposes chill: ChillHoursDisplay | null', () => {
    const dashboard: PhenologyDashboardData = {
      available: true,
      mode: 'NORMAL',
      year_range: '2024-2026',
      referential_cycle_used: false,
      mean_stages: [],
      timelines: [],
      yearly_stages: {},
      referentiel_gdd: null,
      chill: null,
    };
    expect(dashboard.chill).toBeNull();
  });
});
