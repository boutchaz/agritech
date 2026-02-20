import { createFileRoute, Navigate } from '@tanstack/react-router'

const SatelliteIndex = () => {
  const { parcelId } = Route.useParams();
  return <Navigate to="/parcels/$parcelId/satellite/timeseries" params={{ parcelId }} replace />;
};

export const Route = createFileRoute('/_authenticated/(production)/parcels/$parcelId/satellite/')({
  component: SatelliteIndex,
});
