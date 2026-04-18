import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

import { PhenologyDashboard } from '../PhenologyDashboard';
import type { PhenologyDashboardData } from '@/types/calibration-review';

const baseData: PhenologyDashboardData = {
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

describe('PhenologyDashboard chill integration', () => {
  it('S6.1 — renders ChillHoursGauge when chill present', () => {
    const data: PhenologyDashboardData = {
      ...baseData,
      chill: {
        value: 342,
        reference: { min: 200, max: 400, source: 'variety', variety_label: 'Picholine' },
        band: 'yellow',
        phrase: 'Heures de froid acceptables',
      },
    };
    render(<PhenologyDashboard data={data} />);
    expect(screen.getByTestId('chill-hours-gauge')).toBeInTheDocument();
  });

  it('S6.2 — hides chill section when chill is null', () => {
    render(<PhenologyDashboard data={baseData} />);
    expect(screen.queryByTestId('chill-hours-gauge')).toBeNull();
  });
});
