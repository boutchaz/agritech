import { createFileRoute, Outlet } from '@tanstack/react-router';
import { ModuleGate } from '@/components/authorization/ModuleGate';

export const Route = createFileRoute('/_authenticated/(accounting)/accounting')({
  component: () => (
    <ModuleGate>
      <Outlet />
    </ModuleGate>
  ),
});
