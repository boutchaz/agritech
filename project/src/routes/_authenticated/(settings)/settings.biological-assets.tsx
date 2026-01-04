import { createFileRoute } from '@tanstack/react-router';
import { BiologicalAssetsManagement } from '@/components/settings/BiologicalAssetsManagement';
import { withRouteProtection } from '@/components/authorization/withRouteProtection';

function BiologicalAssetsSettingsPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <BiologicalAssetsManagement />
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(settings)/settings/biological-assets')({
  component: withRouteProtection(
    BiologicalAssetsSettingsPage,
    'read',
    'BiologicalAsset'
  ),
});
