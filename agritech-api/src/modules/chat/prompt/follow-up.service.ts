import { Injectable } from '@nestjs/common';

export interface ParsedSuggestions {
  cleanText: string;
  suggestions: string[];
}

@Injectable()
export class FollowUpService {
  private static readonly SUGGESTIONS_MARKER = '---SUGGESTIONS---';

  /**
   * Parse follow-up suggestions from AI response text.
   * AI is instructed to append:
   *   ---SUGGESTIONS---
   *   ["suggestion1", "suggestion2", "suggestion3"]
   *
   * Returns the cleaned text (without the block) and parsed suggestions array.
   */
  parseSuggestions(text: string): ParsedSuggestions {
    const markerIndex = text.indexOf(FollowUpService.SUGGESTIONS_MARKER);

    if (markerIndex === -1) {
      return { cleanText: text, suggestions: [] };
    }

    const cleanText = text.substring(0, markerIndex).trim();
    const suggestionsRaw = text
      .substring(markerIndex + FollowUpService.SUGGESTIONS_MARKER.length)
      .trim();

    try {
      const parsed = JSON.parse(suggestionsRaw);
      if (Array.isArray(parsed) && parsed.every((s) => typeof s === 'string')) {
        return { cleanText, suggestions: parsed };
      }
    } catch {
      // Malformed JSON — return empty suggestions
    }

    return { cleanText, suggestions: [] };
  }
}
