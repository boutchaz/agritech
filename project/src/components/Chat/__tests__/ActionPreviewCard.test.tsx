import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
  }),
}));

// Import after mock setup
import { ActionPreviewCard } from '../cards/ActionPreviewCard';

describe('ActionPreviewCard', () => {
  it('renders harvest preview with parcel name, quantity, and date', () => {
    render(
      <ActionPreviewCard
        data={{
          action_type: 'record_harvest',
          parcel_name: 'B3 - Oliviers',
          crop_type: 'olives',
          quantity: 3,
          unit: 'tons',
          harvest_date: '2026-04-06',
          quality_grade: 'A',
        }}
      />,
    );

    expect(screen.getByText(/B3 - Oliviers/)).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('tons')).toBeDefined();
    expect(screen.getByText('2026-04-06')).toBeDefined();
    // Should have amber border indicator
    const card = document.querySelector('.border-l-amber-500, .border-l-yellow-500');
    expect(card).not.toBeNull();
  });

  it('shows confirm instruction text', () => {
    render(
      <ActionPreviewCard
        data={{
          action_type: 'record_harvest',
          parcel_name: 'B3',
          quantity: 3,
          unit: 'tons',
          harvest_date: '2026-04-06',
        }}
      />,
    );

    expect(screen.getByText(/confirme/i)).toBeDefined();
  });

  it('shows PREVIEW badge', () => {
    render(
      <ActionPreviewCard
        data={{
          action_type: 'record_harvest',
          parcel_name: 'B3',
          quantity: 3,
          unit: 'tons',
          harvest_date: '2026-04-06',
        }}
      />,
    );

    expect(screen.getByText(/preview/i)).toBeDefined();
  });
});

describe('ActionPreviewCard — all action types', () => {
  it('renders create_task with Title, Parcel, Priority, Assigned To', () => {
    render(
      <ActionPreviewCard
        data={{
          action_type: 'create_task',
          title: 'Irriguer B3',
          parcel_name: 'B3',
          farm_name: 'Farm Meknes',
          priority: 'high',
          task_type: 'irrigation',
          worker_name: 'Ahmed Benali',
        }}
      />,
    );

    expect(screen.getByText('Irriguer B3')).toBeDefined();
    expect(screen.getByText('B3')).toBeDefined();
    expect(screen.getByText('high')).toBeDefined();
    expect(screen.getByText('Ahmed Benali')).toBeDefined();
  });

  it('renders record_stock_entry with items list', () => {
    render(
      <ActionPreviewCard
        data={{
          action_type: 'record_stock_entry',
          entry_type: 'Material Receipt',
          items: [
            { item_name: 'Engrais NPK', quantity: 500, unit: 'kg' },
            { item_name: 'Pesticide X', quantity: 10, unit: 'liters' },
          ],
          to_warehouse_name: 'Magasin Principal',
          entry_date: '2026-04-06',
        }}
      />,
    );

    expect(screen.getByText(/Engrais NPK/)).toBeDefined();
    expect(screen.getByText(/500/)).toBeDefined();
    expect(screen.getByText(/Pesticide X/)).toBeDefined();
    expect(screen.getByText('Magasin Principal')).toBeDefined();
  });

  it('renders log_parcel_event with recalibration warning', () => {
    render(
      <ActionPreviewCard
        data={{
          action_type: 'log_parcel_event',
          parcel_name: 'B3',
          event_type: 'disease',
          description: 'Verticillium wilt',
          recalibrage_warning: true,
        }}
      />,
    );

    expect(screen.getByText(/recalibration/i)).toBeDefined();
    expect(screen.getByText('disease')).toBeDefined();
  });
});
