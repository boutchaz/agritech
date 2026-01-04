import { createFileRoute } from '@tanstack/react-router';
import { QuoteRequestsReceived } from '@/components/Marketplace/QuoteRequestsReceived';

export const Route = createFileRoute('/_authenticated/(misc)/marketplace/quote-requests/received')({
  component: QuoteRequestsReceivedPage,
});

function QuoteRequestsReceivedPage() {
  return <QuoteRequestsReceived />;
}
