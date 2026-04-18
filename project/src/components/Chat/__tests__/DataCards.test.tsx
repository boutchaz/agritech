import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecommendationCard } from '../cards/RecommendationCard';
import { DiagnosticCard } from '../cards/DiagnosticCard';
import { FarmSummaryCard } from '../cards/FarmSummaryCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
  }),
}));

describe('RecommendationCard', () => {
  it('renders constat, action, and priority badge', () => {
    render(
      <RecommendationCard
        data={{
          constat: 'Nitrogen deficiency detected',
          diagnostic: 'Low NDRE index',
          action: 'Apply 50 units/ha of ammonium nitrate',
          priority: 'high',
        }}
      />
    );
    expect(screen.getByText('Nitrogen deficiency detected')).toBeInTheDocument();
    expect(screen.getByText('Apply 50 units/ha of ammonium nitrate')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });
});

describe('DiagnosticCard', () => {
  it('renders scenario code and zone', () => {
    render(
      <DiagnosticCard
        data={{
          scenario_code: 'B',
          scenario: 'Stress hydrique modéré',
          confidence: 0.85,
          zone_classification: 'stressed',
        }}
      />
    );
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Stress hydrique modéré')).toBeInTheDocument();
    expect(screen.getByText('stressed')).toBeInTheDocument();
  });
});

describe('FarmSummaryCard', () => {
  it('renders counts', () => {
    render(
      <FarmSummaryCard
        data={{
          farms_count: 3,
          parcels_count: 12,
          workers_count: 25,
          pending_tasks: 8,
        }}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });
});
