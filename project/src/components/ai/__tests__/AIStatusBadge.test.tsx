import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AIStatusBadge } from '../AIStatusBadge';

vi.mock('lucide-react', () => ({
  BrainCircuit: () => <div data-testid="icon-brain-circuit" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
  AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
  Clock: () => <div data-testid="icon-clock" />,
  XCircle: () => <div data-testid="icon-x-circle" />,
}));

describe('AIStatusBadge', () => {
  it('renders active status correctly', () => {
    render(<AIStatusBadge status="active" />);
    const badge = screen.getByText('AI Active');
    expect(badge).toBeDefined();
    expect(badge.closest('span')!.className).toContain('bg-green-100');
  });

  it('renders completed status correctly', () => {
    render(<AIStatusBadge status="completed" />);
    const badge = screen.getByText('Completed');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('bg-green-100');
  });

  it('renders calibration status correctly', () => {
    render(<AIStatusBadge status="calibration" />);
    const badge = screen.getByText('Calibrating');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('bg-blue-100');
  });

  it('renders in_progress status correctly', () => {
    render(<AIStatusBadge status="in_progress" />);
    const badge = screen.getByText('Calibrating');
    expect(badge).toBeDefined();
    expect(badge.closest('span')!.className).toContain('bg-blue-100');
  });

  it('renders pending status correctly', () => {
    render(<AIStatusBadge status="pending" />);
    const badge = screen.getByText('Pending');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('bg-yellow-100');
  });

  it('renders failed status correctly', () => {
    render(<AIStatusBadge status="failed" />);
    const badge = screen.getByText('Failed');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('bg-red-100');
  });

  it('renders paused status correctly', () => {
    render(<AIStatusBadge status="paused" />);
    const badge = screen.getByText('Paused');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('bg-orange-100');
  });

  it('renders disabled status correctly', () => {
    render(<AIStatusBadge status="disabled" />);
    const badge = screen.getByText('Disabled');
    expect(badge).toBeDefined();
    expect(badge.className).toContain('bg-gray-100');
  });

  it('applies custom className', () => {
    render(<AIStatusBadge status="active" className="custom-class" />);
    const badge = screen.getByText('AI Active');
    expect(badge.closest('span')!.className).toContain('custom-class');
  });
});
