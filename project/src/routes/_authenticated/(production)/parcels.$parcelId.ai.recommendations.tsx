import { createFileRoute, redirect } from '@tanstack/react-router';

// Recommendations were folded into the unified Saison view so the user
// lands on one place that knows what's ready and what's still generating
// instead of bouncing between two empty pages.
export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/recommendations')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/parcels/$parcelId/ai/plan/summary',
      params: { parcelId: params.parcelId },
      search: { farmId: undefined },
    });
  },
});
