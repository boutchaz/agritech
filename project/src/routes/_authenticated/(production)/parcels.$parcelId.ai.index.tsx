import { createFileRoute } from '@tanstack/react-router';
import { AICompassDashboard } from '@/components/ai/AICompassDashboard';

const AIDashboard = () => {
  const { parcelId } = Route.useParams();

  return <AICompassDashboard parcelId={parcelId} />;
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/ai/')({
  component: AIDashboard,
});
