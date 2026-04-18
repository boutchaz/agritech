import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalibrationCard } from '../CalibrationCard';
import type { AICalibration } from '../../../lib/api/ai-calibration';

vi.mock('lucide-react', () => ({
  BrainCircuit: () => <div data-testid="icon-brain-circuit" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
  Clock: () => <div data-testid="icon-clock" />,
  XCircle: () => <div data-testid="icon-x-circle" />,
}));

describe('CalibrationCard', () => {
  const mockCalibration: AICalibration = {
    id: 'cal-123',
    parcel_id: 'parcel-123',
    status: 'completed',
    confidence_score: 0.85,
    zone_classification: 'optimal',
    error_message: null,
    created_at: '2023-10-01T10:00:00Z',
    updated_at: '2023-10-02T10:00:00Z',
  };

  it('renders calibration data correctly', () => {
    render(<CalibrationCard calibration={mockCalibration} />);

    expect(screen.getByText('85%')).toBeDefined();
    expect(screen.getByText('optimal')).toBeDefined();
    expect(screen.getByText('Completed')).toBeDefined();

    const dateStr = new Date(mockCalibration.updated_at).toLocaleDateString();
    expect(screen.getByText(`Last updated: ${dateStr}`)).toBeDefined();
  });

  it('renders empty zone classification correctly', () => {
    const emptyCalibration = {
      ...mockCalibration,
      zone_classification: null as unknown as string,
    };
    render(<CalibrationCard calibration={emptyCalibration} />);

    expect(screen.getByText('No zones classified yet')).toBeDefined();
  });
});
