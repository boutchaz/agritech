import { describe, it, expect } from 'vitest';
import { findOwningModuleSlug, isPathEnabled } from '../module-gating';

describe('module-gating', () => {
  const catalog = [
    {
      slug: 'core',
      navigationItems: ['/dashboard', '/settings', '/farm-hierarchy', '/parcels', '/notifications'],
    },
    {
      slug: 'agromind_advisor',
      navigationItems: ['/parcels/$parcelId/ai'],
    },
    {
      slug: 'marketplace',
      navigationItems: ['/marketplace'],
    },
    {
      slug: 'accounting',
      navigationItems: ['/accounting'],
    },
    {
      slug: 'sales_purchasing',
      navigationItems: ['/accounting/quotes', '/accounting/sales-orders', '/accounting/purchase-orders'],
    },
  ];

  describe('findOwningModuleSlug', () => {
    it('maps /dashboard → core', () => {
      expect(findOwningModuleSlug('/dashboard', catalog)).toBe('core');
    });

    it('maps /parcels → core', () => {
      expect(findOwningModuleSlug('/parcels', catalog)).toBe('core');
    });

    it('maps /parcels/abc (no AI suffix) → core (fallback to shorter match)', () => {
      expect(findOwningModuleSlug('/parcels/abc-uuid-123', catalog)).toBe('core');
    });

    it('maps /parcels/abc/ai → agromind_advisor (longest prefix wins over core)', () => {
      expect(findOwningModuleSlug('/parcels/abc-uuid-123/ai', catalog)).toBe('agromind_advisor');
    });

    it('maps /parcels/abc/ai/diagnostics → agromind_advisor', () => {
      expect(findOwningModuleSlug('/parcels/abc-uuid/ai/diagnostics', catalog)).toBe('agromind_advisor');
    });

    it('maps /marketplace/quote-requests/received → marketplace', () => {
      expect(findOwningModuleSlug('/marketplace/quote-requests/received', catalog)).toBe('marketplace');
    });

    it('maps /accounting → accounting', () => {
      expect(findOwningModuleSlug('/accounting', catalog)).toBe('accounting');
    });

    it('maps /accounting/quotes → sales_purchasing (more specific than /accounting)', () => {
      expect(findOwningModuleSlug('/accounting/quotes', catalog)).toBe('sales_purchasing');
    });

    it('maps /accounting/quotes/123 → sales_purchasing', () => {
      expect(findOwningModuleSlug('/accounting/quotes/123', catalog)).toBe('sales_purchasing');
    });

    it('returns null for an unknown path', () => {
      expect(findOwningModuleSlug('/nonexistent-route', catalog)).toBeNull();
    });

    it('handles $param placeholder (TanStack convention) with uuid-like segment', () => {
      expect(
        findOwningModuleSlug('/parcels/00000000-0000-0000-0000-000000000000/ai', catalog)
      ).toBe('agromind_advisor');
    });

    it('also accepts the legacy :param form', () => {
      const legacyCatalog = [
        { slug: 'core', navigationItems: ['/parcels'] },
        { slug: 'agromind_advisor', navigationItems: ['/parcels/:id/ai'] },
      ];
      expect(findOwningModuleSlug('/parcels/abc/ai', legacyCatalog)).toBe('agromind_advisor');
    });

    it('is not fooled by substring without path boundary', () => {
      // /parcelsXYZ must not match /parcels — boundaries matter
      expect(findOwningModuleSlug('/parcelsXYZ', catalog)).toBeNull();
    });
  });

  describe('isPathEnabled', () => {
    it('allows /dashboard when core active', () => {
      expect(isPathEnabled('/dashboard', catalog, new Set(['core']))).toBe(true);
    });

    it('blocks /parcels/abc/ai when agromind_advisor inactive', () => {
      expect(isPathEnabled('/parcels/abc/ai', catalog, new Set(['core']))).toBe(false);
    });

    it('allows /parcels/abc/ai when agromind_advisor active', () => {
      expect(
        isPathEnabled('/parcels/abc/ai', catalog, new Set(['core', 'agromind_advisor']))
      ).toBe(true);
    });

    it('allows /parcels (no AI) even with agromind inactive', () => {
      expect(isPathEnabled('/parcels/abc', catalog, new Set(['core']))).toBe(true);
    });

    it('blocks /marketplace when marketplace inactive', () => {
      expect(
        isPathEnabled('/marketplace/quote-requests/received', catalog, new Set(['core']))
      ).toBe(false);
    });

    it('blocks unknown path even when core active', () => {
      expect(isPathEnabled('/nonexistent', catalog, new Set(['core']))).toBe(false);
    });
  });
});
