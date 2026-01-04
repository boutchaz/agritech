import { createFileRoute } from '@tanstack/react-router';
import { QuoteRequestsSent } from '@/components/Marketplace/QuoteRequestsSent';

export const Route = createFileRoute('/_authenticated/(misc)/marketplace/quote-requests/sent')({
  component: QuoteRequestsSentPage,
});

function QuoteRequestsSentPage() {
  return <QuoteRequestsSent />;
}
