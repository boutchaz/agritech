import { describe, it, expect, vi, afterEach } from 'vitest';
import { getTourDefinitions, filterStepsByDomPresence, JOYRIDE_PROPS, handleEscKey } from '../TourContext';
import type { Step } from 'react-joyride';

const mockT = (key: string) => key;

describe('Tour definitions', () => {
  it('every step across all tours has skipBeacon: true (react-joyride v3)', () => {
    const definitions = getTourDefinitions(mockT as any);
    const tourIds = Object.keys(definitions);

    expect(tourIds.length).toBeGreaterThan(0);

    for (const tourId of tourIds) {
      const steps = definitions[tourId];
      for (let i = 0; i < steps.length; i++) {
        expect(
          steps[i].skipBeacon,
          `Tour "${tourId}" step ${i + 1} (target: ${steps[i].target}) missing skipBeacon: true`
        ).toBe(true);
      }
    }
  });
});

describe('filterStepsByDomPresence', () => {
  it('includes body-targeted steps always', () => {
    const steps: Step[] = [
      { target: 'body', content: 'Welcome', skipBeacon: true },
    ];
    const result = filterStepsByDomPresence(steps);
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe('body');
  });

  it('excludes steps whose selector target is not in the DOM', () => {
    const steps: Step[] = [
      { target: '[data-tour="infrastructure-list"]', content: 'List', skipBeacon: true },
      { target: '[data-tour="infrastructure-add"]', content: 'Add', skipBeacon: true },
    ];
    // No matching elements exist in test DOM
    const result = filterStepsByDomPresence(steps);
    expect(result).toHaveLength(0);
  });

  it('includes steps whose selector target exists in the DOM', () => {
    // Add a matching element to the DOM
    const el = document.createElement('div');
    el.setAttribute('data-tour', 'test-element');
    document.body.appendChild(el);

    const steps: Step[] = [
      { target: '[data-tour="test-element"]', content: 'Test', skipBeacon: true },
      { target: '[data-tour="missing"]', content: 'Missing', skipBeacon: true },
    ];
    const result = filterStepsByDomPresence(steps);
    expect(result).toHaveLength(1);
    expect(result[0].target).toBe('[data-tour="test-element"]');

    // Cleanup
    document.body.removeChild(el);
  });

  it('returns empty array when all non-body targets are missing', () => {
    const steps: Step[] = [
      { target: '[data-tour="a"]', content: 'A', skipBeacon: true },
      { target: '[data-tour="b"]', content: 'B', skipBeacon: true },
    ];
    const result = filterStepsByDomPresence(steps);
    expect(result).toHaveLength(0);
  });
});

describe('Joyride props', () => {
  it('disableOverlayClose is false (overlay click dismisses tour)', () => {
    expect(JOYRIDE_PROPS.disableOverlayClose).toBe(false);
  });
});

describe('ESC key dismiss', () => {
  it('handleEscKey calls endTour when Escape key event is received', () => {
    const endTour = vi.fn();
    const handler = handleEscKey(endTour);
    
    // Simulate Escape key
    handler(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(endTour).toHaveBeenCalledTimes(1);
  });

  it('handleEscKey does NOT call endTour for other keys', () => {
    const endTour = vi.fn();
    const handler = handleEscKey(endTour);
    
    handler(new KeyboardEvent('keydown', { key: 'Enter' }));
    handler(new KeyboardEvent('keydown', { key: 'a' }));
    expect(endTour).not.toHaveBeenCalled();
  });
});
