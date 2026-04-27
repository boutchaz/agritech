/**
 * Analytics hooks — auto-tracking for page views, feature adoption, and form submissions.
 *
 * Phase 1: usePageView — auto-tracks every route change via TanStack Router.
 * Phase 2: feature adoption — maps URL prefixes to feature names.
 * Phase 5: useTrackedForm — wraps react-hook-form with submit tracking.
 */
import { useEffect, useCallback, type FieldValues, type UseFormProps, type UseFormReturn } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import {
  trackPageView,
  trackFeatureUsed,
  trackFormSubmitStart,
  trackFormSubmitSuccess,
  trackFormSubmitError,
} from './analytics';

// ============================================
// Feature adoption — path prefix → feature name
// ============================================

const FEATURE_MAP: Array<{ prefix: string; feature: string }> = [
  { prefix: '/stock', feature: 'stock' },
  { prefix: '/accounting', feature: 'accounting' },
  { prefix: '/campaigns', feature: 'production' },
  { prefix: '/crop-cycles', feature: 'production' },
  { prefix: '/harvests', feature: 'production' },
  { prefix: '/parcels', feature: 'production' },
  { prefix: '/orchards', feature: 'production' },
  { prefix: '/trees', feature: 'production' },
  { prefix: '/biological-assets', feature: 'production' },
  { prefix: '/product-applications', feature: 'production' },
  { prefix: '/pruning', feature: 'production' },
  { prefix: '/quality-control', feature: 'production' },
  { prefix: '/farm-hierarchy', feature: 'production' },
  { prefix: '/satellite', feature: 'satellite' },
  { prefix: '/workers', feature: 'workers' },
  { prefix: '/tasks', feature: 'tasks' },
  { prefix: '/payroll', feature: 'payroll' },
  { prefix: '/ai-chat', feature: 'agromind_chat' },
  { prefix: '/agromind', feature: 'agromind_chat' },
  { prefix: '/compliance', feature: 'compliance' },
  { prefix: '/reports', feature: 'reports' },
  { prefix: '/settings', feature: 'settings' },
];

function resolveFeature(pathname: string): string | null {
  // Strip the locale prefix (e.g., /en, /fr, /ar) if present
  const stripped = pathname.replace(/^\/(en|fr|ar)(\/|$)/, '/');

  for (const { prefix, feature } of FEATURE_MAP) {
    if (stripped.startsWith(prefix)) {
      return feature;
    }
  }
  return null;
}

// ============================================
// usePageView — auto page view + feature adoption
// ============================================

/** Last feature tracked in this session (avoid duplicate `feature_used` on same-feature navigation) */
let lastTrackedFeature: string | null = null;

/**
 * Auto-tracks page views on every route change.
 * Also fires `feature_used` when the user enters a new module.
 *
 * Wire this into the authenticated layout (`__root.tsx` or `_authenticated.tsx`).
 */
export function usePageView() {
  const location = useLocation();

  useEffect(() => {
    // 1. Page view
    trackPageView({
      path: location.pathname,
      title: document.title,
    });

    // 2. Feature adoption (fire once per feature per session)
    const feature = resolveFeature(location.pathname);
    if (feature && feature !== lastTrackedFeature) {
      lastTrackedFeature = feature;
      trackFeatureUsed(feature, 'page_view');
    }
  }, [location.pathname]);
}

// ============================================
// useTrackedForm — form submission funnel
// ============================================

interface TrackedFormOptions<T extends FieldValues> extends UseFormProps<T> {
  /** Human-readable name for GA4 tracking (e.g., "invoice", "task", "worker") */
  formName: string;
}

/**
 * Wraps react-hook-form's `useForm` with automatic form submission tracking.
 *
 * Usage:
 * ```tsx
 * const form = useTrackedForm({ formName: 'invoice', resolver: zodResolver(schema) });
 * // Use form.handleSubmit as normal — tracking is automatic
 * ```
 */
export function useTrackedForm<T extends FieldValues>(
  options: TrackedFormOptions<T>,
): UseFormReturn<T> & { trackedSubmit: (onValid: (data: T) => Promise<void> | void) => () => void } {
  const { formName, ...formOptions } = options;
  const form = useForm<T>(formOptions);

  const trackedSubmit = useCallback(
    (onValid: (data: T) => Promise<void> | void) => {
      return form.handleSubmit(async (data) => {
        trackFormSubmitStart(formName);
        try {
          await onValid(data);
          trackFormSubmitSuccess(formName);
        } catch (error) {
          trackFormSubmitError(formName, (error as Error).message);
          throw error;
        }
      });
    },
    [form, formName],
  );

  return { ...form, trackedSubmit };
}
