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

    try {
      const parsed = JSON.parse(trimmedContent) as StructuredResponse;

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { text: rawContent, suggestions: [] };
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

      return {
        text: combinedText,
        suggestions,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to parse structured chat response. Falling back to raw text: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { text: rawContent, suggestions: [] };
    }
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
