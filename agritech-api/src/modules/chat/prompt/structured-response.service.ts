import { Injectable, Logger } from '@nestjs/common';
import { safeJsonStringifyForError } from '../../../common/utils/safe-json-stringify';

type StructuredCardType =
  | 'recommendation-card'
  | 'diagnostic-card'
  | 'farm-summary'
  | 'plan-calendar'
  | 'stock-alert'
  | 'financial-snapshot';

interface StructuredCard {
  type: StructuredCardType;
  data: Record<string, unknown>;
}

interface StructuredResponse {
  text?: string;
  suggestions?: string[];
  data_cards?: StructuredCard[];
}

/** Strip ```json … ``` fences; models often wrap structured output this way. */
function stripMarkdownJsonFence(content: string): string {
  let s = content.trim();
  if (!s.startsWith('```')) return s;
  const open = s.match(/^```(?:json)?\s*\n?/i);
  if (!open) return content.trim();
  s = s.slice(open[0].length);
  const close = s.lastIndexOf('```');
  if (close !== -1) s = s.slice(0, close);
  return s.trim();
}

/** First balanced `{ ... }` in the string (handles preamble text). */
function extractOutermostJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let stringEscape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (stringEscape) {
        stringEscape = false;
      } else if (c === '\\') {
        stringEscape = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

@Injectable()
export class StructuredResponseService {
  private readonly logger = new Logger(StructuredResponseService.name);

  private static readonly SUPPORTED_CARD_TYPES = new Set<StructuredCardType>([
    'recommendation-card',
    'diagnostic-card',
    'farm-summary',
    'plan-calendar',
    'stock-alert',
    'financial-snapshot',
  ]);

  parseStructuredResponse(rawContent: string): { text: string; suggestions: string[] } {
    const trimmedContent = rawContent.trim();

    if (!trimmedContent) {
      return { text: '', suggestions: [] };
    }

    const stripped = stripMarkdownJsonFence(trimmedContent);
    const t = stripped.trim();
    const slice = extractOutermostJsonObject(t);
    const candidates: string[] = [];
    if (t.startsWith('{')) candidates.push(t);
    if (slice && !candidates.includes(slice)) candidates.push(slice);

    for (const jsonStr of candidates) {
      try {
        const parsed = JSON.parse(jsonStr) as StructuredResponse;

        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          continue;
        }

        const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
        const suggestions = Array.isArray(parsed.suggestions)
          ? parsed.suggestions.filter((suggestion): suggestion is string => typeof suggestion === 'string')
          : [];
        const dataCards = Array.isArray(parsed.data_cards)
          ? parsed.data_cards.filter((card): card is StructuredCard => this.isValidCard(card))
          : [];

        const embeddedCards = dataCards.map((card) => this.formatCard(card));
        const combinedText = [text, ...embeddedCards].filter(Boolean).join('\n\n').trim();

        const looksStructured =
          'text' in parsed || 'suggestions' in parsed || 'data_cards' in parsed;
        if (!looksStructured) {
          continue;
        }

        return {
          text: combinedText || text,
          suggestions,
        };
      } catch {
        /* try next candidate */
      }
    }

    this.logger.warn(
      'Failed to parse structured chat response after fence stripping / object extraction. Falling back to raw text.',
    );
    return { text: rawContent, suggestions: [] };
  }

  private isValidCard(card: unknown): card is StructuredCard {
    if (!card || typeof card !== 'object' || Array.isArray(card)) {
      return false;
    }

    const candidate = card as { type?: unknown; data?: unknown };
    return (
      typeof candidate.type === 'string' &&
      StructuredResponseService.SUPPORTED_CARD_TYPES.has(candidate.type as StructuredCardType) &&
      !!candidate.data &&
      typeof candidate.data === 'object' &&
      !Array.isArray(candidate.data)
    );
  }

  private formatCard(card: StructuredCard): string {
    try {
      return `\`\`\`json:${card.type}\n${JSON.stringify(card.data, null, 2)}\n\`\`\``;
    } catch {
      return `\`\`\`json:${card.type}\n${safeJsonStringifyForError(card.data, 8000)}\n\`\`\``;
    }
  }
}
