import { createFileRoute } from '@tanstack/react-router';
import SubscriptionSettings from '../components/SubscriptionSettings';

export const Route = createFileRoute('/settings/subscription')({
  component: SubscriptionSettings,
});
