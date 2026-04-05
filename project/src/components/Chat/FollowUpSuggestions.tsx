
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface FollowUpSuggestionsProps {
  suggestions: string[];
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function FollowUpSuggestions({ suggestions, onSend, disabled }: FollowUpSuggestionsProps) {
  if (!suggestions.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          size="sm"
          className="h-auto py-1.5 px-3 text-xs gap-1.5"
          onClick={() => onSend(suggestion)}
          disabled={disabled}
        >
          <Sparkles className="w-3 h-3 text-muted-foreground" />
          {suggestion}
        </Button>
      ))}
    </div>
  );
}
