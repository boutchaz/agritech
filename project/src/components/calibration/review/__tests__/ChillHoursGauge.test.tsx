import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

import { ChillHoursGauge } from '../ChillHoursGauge';
import type { ChillHoursDisplay } from '@/types/calibration-review';

const sample: ChillHoursDisplay = {
  value: 342,
  reference: { min: 200, max: 400, source: 'variety', variety_label: 'Picholine' },
  band: 'yellow',
  phrase: 'Heures de froid acceptables',
};

describe('ChillHoursGauge', () => {
  it('S5.1 — renders nothing when data is null', () => {
    const { container } = render(<ChillHoursGauge data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('S5.2 — renders value, variety label, reference range, and yellow band class', () => {
    render(<ChillHoursGauge data={sample} />);
    expect(screen.getByText(/342/)).toBeInTheDocument();
    expect(screen.getByText(/Picholine/)).toBeInTheDocument();
    // Range can be rendered as 200–400 or 200-400
    expect(screen.getByText(/200\s*[–-]\s*400/)).toBeInTheDocument();
    const gauge = screen.getByTestId('chill-hours-gauge');
    expect(gauge.getAttribute('data-band')).toBe('yellow');
  });

  it('S5.3 — shows fallback badge when source is fallback', () => {
    const fallbackData: ChillHoursDisplay = {
      ...sample,
      reference: { ...sample.reference, source: 'fallback', variety_label: null },
    };
    render(<ChillHoursGauge data={fallbackData} />);
    expect(screen.getByTestId('chill-hours-fallback-badge')).toBeInTheDocument();
  });

  it('S5.4 — renders critique band styling', () => {
    const critiqueData: ChillHoursDisplay = { ...sample, band: 'critique', value: 80 };
    render(<ChillHoursGauge data={critiqueData} />);
    const gauge = screen.getByTestId('chill-hours-gauge');
    expect(gauge.getAttribute('data-band')).toBe('critique');
    // critique should expose alert role
    expect(screen.getByTestId('chill-hours-critique-alert')).toBeInTheDocument();
  });
});
