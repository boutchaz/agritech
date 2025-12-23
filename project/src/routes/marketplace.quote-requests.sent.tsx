import { createFileRoute } from '@tanstack/react-router';
import { QuoteRequestsSent } from '@/components/Marketplace/QuoteRequestsSent';

export const Route = createFileRoute('/marketplace/quote-requests/sent')({
  component: QuoteRequestsSentPage,
});

function QuoteRequestsSentPage() {
  return <QuoteRequestsSent />;
}
