import { createFileRoute } from '@tanstack/react-router';
import { ProductionDashboard } from '@/components/ProductionIntelligence/ProductionDashboard';

const ParcelProductionIntelligence = () => {
  const { parcelId } = Route.useParams();

  return <ProductionDashboard parcelId={parcelId} />;
};

export const Route = createFileRoute('/parcels/$parcelId/production')({
  component: ParcelProductionIntelligence,
});
