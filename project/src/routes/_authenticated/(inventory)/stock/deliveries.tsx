import { createFileRoute, redirect } from '@tanstack/react-router';

// Stock context = supplier reception (incoming goods).
// Customer-side deliveries moved to /accounting/customer-deliveries (per CEO decision).
export const Route = createFileRoute('/_authenticated/(inventory)/stock/deliveries')({
  beforeLoad: () => {
    throw redirect({ to: '/stock/reception' });
  },
});
