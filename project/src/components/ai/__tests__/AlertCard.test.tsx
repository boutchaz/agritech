import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertCard } from '../AlertCard';
import type { AIAlert } from '../../../lib/api/ai-alerts';

vi.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
  Clock: () => <div data-testid="icon-clock" />,
  CheckCircle2: () => <div data-testid="icon-check-circle" />,
}));

describe('AlertCard', () => {
  const mockAlert: AIAlert = {
    id: 'alert-123',
    parcel_id: 'parcel-123',
    alert_type: 'disease_risk',
    severity: 'high',
    status: 'active',
    description: 'High risk of downy mildew detected in sector A.',
    created_at: '2023-10-01T10:00:00Z',
    updated_at: '2023-10-01T10:00:00Z',
  };

  it('renders alert title and description', () => {
    render(<AlertCard alert={mockAlert} />);
    
    expect(screen.getByText('disease risk')).toBeDefined();
    expect(screen.getByText('High risk of downy mildew detected in sector A.')).toBeDefined();
  });

  it('renders severity badge with correct color class for high severity', () => {
    const { container } = render(<AlertCard alert={mockAlert} />);
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-orange-50');
    expect(screen.getByText('high')).toBeDefined();
  });

  it('renders severity badge with correct color class for critical severity', () => {
    const criticalAlert = { ...mockAlert, severity: 'critical' as const };
    const { container } = render(<AlertCard alert={criticalAlert} />);
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-red-50');
    expect(screen.getByText('critical')).toBeDefined();
  });

  it('renders severity badge with correct color class for medium severity', () => {
    const mediumAlert = { ...mockAlert, severity: 'medium' as const };
    const { container } = render(<AlertCard alert={mediumAlert} />);
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-yellow-50');
    expect(screen.getByText('medium')).toBeDefined();
  });

  it('renders severity badge with correct color class for low severity', () => {
    const lowAlert = { ...mockAlert, severity: 'low' as const };
    const { container } = render(<AlertCard alert={lowAlert} />);
    
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-blue-50');
    expect(screen.getByText('low')).toBeDefined();
  });

  it('renders created_at date', () => {
    render(<AlertCard alert={mockAlert} />);
    
    const dateStr = new Date(mockAlert.created_at).toLocaleDateString();
    expect(screen.getByText(dateStr)).toBeDefined();
  });

  it('renders active status icon', () => {
    render(<AlertCard alert={mockAlert} />);
    expect(screen.getByTestId('icon-alert-triangle')).toBeDefined();
    expect(screen.getByText('active')).toBeDefined();
  });

  it('renders acknowledged status icon', () => {
    const acknowledgedAlert = { ...mockAlert, status: 'acknowledged' as const };
    render(<AlertCard alert={acknowledgedAlert} />);
    expect(screen.getByTestId('icon-clock')).toBeDefined();
    expect(screen.getByText('acknowledged')).toBeDefined();
  });

  it('renders resolved status icon', () => {
    const resolvedAlert = { ...mockAlert, status: 'resolved' as const };
    render(<AlertCard alert={resolvedAlert} />);
    expect(screen.getByTestId('icon-check-circle')).toBeDefined();
    expect(screen.getByText('resolved')).toBeDefined();
  });

  it('handles acknowledge button click', async () => {
    const onAcknowledge = vi.fn();
    render(<AlertCard alert={mockAlert} onAcknowledge={onAcknowledge} />);
    
    const button = screen.getByRole('button', { name: 'Acknowledge' });
    await userEvent.click(button);
    
    expect(onAcknowledge).toHaveBeenCalledWith(mockAlert.id);
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it('handles resolve button click', async () => {
    const onResolve = vi.fn();
    render(<AlertCard alert={mockAlert} onResolve={onResolve} />);
    
    const button = screen.getByRole('button', { name: 'Resolve' });
    await userEvent.click(button);
    
    expect(onResolve).toHaveBeenCalledWith(mockAlert.id);
    expect(onResolve).toHaveBeenCalledTimes(1);
  });

  it('does not render acknowledge button if status is not active', () => {
    const acknowledgedAlert = { ...mockAlert, status: 'acknowledged' as const };
    const onAcknowledge = vi.fn();
    render(<AlertCard alert={acknowledgedAlert} onAcknowledge={onAcknowledge} />);
    
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).toBeNull();
  });

  it('does not render resolve button if status is resolved', () => {
    const resolvedAlert = { ...mockAlert, status: 'resolved' as const };
    const onResolve = vi.fn();
    render(<AlertCard alert={resolvedAlert} onResolve={onResolve} />);
    
    expect(screen.queryByRole('button', { name: 'Resolve' })).toBeNull();
  });

  it('disables acknowledge button when isAcknowledging is true', () => {
    const onAcknowledge = vi.fn();
    render(<AlertCard alert={mockAlert} onAcknowledge={onAcknowledge} isAcknowledging={true} />);
    
    const button = screen.getByRole('button', { name: '...' });
    expect(button).toHaveProperty('disabled', true);
  });

  it('disables resolve button when isResolving is true', () => {
    const onResolve = vi.fn();
    render(<AlertCard alert={mockAlert} onResolve={onResolve} isResolving={true} />);
    
    const button = screen.getByRole('button', { name: '...' });
    expect(button).toHaveProperty('disabled', true);
  });
});
