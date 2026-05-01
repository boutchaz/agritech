import { createFileRoute } from '@tanstack/react-router';
import ReorderSuggestions from '@/components/Stock/ReorderSuggestions';

function ReorderSuggestionsPage() {
  return <ReorderSuggestions />;
}

export const Route = createFileRoute('/_authenticated/(inventory)/stock/reorder-suggestions')({
  component: ReorderSuggestionsPage,
});
