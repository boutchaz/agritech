import { FollowUpService } from './follow-up.service';

describe('FollowUpService', () => {
  let service: FollowUpService;

  beforeEach(() => {
    service = new FollowUpService();
  });

  describe('parseSuggestions', () => {
    it('should extract suggestions from SUGGESTIONS block', () => {
      const text = `Here is some response text about your farm.

---SUGGESTIONS---
["What is the water status?", "Show me the annual plan", "Recommend fertilizer"]`;

      const result = service.parseSuggestions(text);
      expect(result.suggestions).toEqual([
        'What is the water status?',
        'Show me the annual plan',
        'Recommend fertilizer',
      ]);
      expect(result.cleanText).toBe('Here is some response text about your farm.');
    });

    it('should strip the SUGGESTIONS block from the text', () => {
      const text = `Response text.\n\n---SUGGESTIONS---\n["a","b","c"]`;
      const result = service.parseSuggestions(text);
      expect(result.cleanText).toBe('Response text.');
      expect(result.cleanText).not.toContain('SUGGESTIONS');
    });

    it('should return empty array when no SUGGESTIONS block', () => {
      const text = 'Just a normal response with no suggestions.';
      const result = service.parseSuggestions(text);
      expect(result.suggestions).toEqual([]);
      expect(result.cleanText).toBe(text);
    });

    it('should handle malformed JSON gracefully', () => {
      const text = `Response.\n\n---SUGGESTIONS---\nnot valid json`;
      const result = service.parseSuggestions(text);
      expect(result.suggestions).toEqual([]);
      expect(result.cleanText).toBe('Response.');
    });

    it('should handle empty suggestions array', () => {
      const text = `Response.\n\n---SUGGESTIONS---\n[]`;
      const result = service.parseSuggestions(text);
      expect(result.suggestions).toEqual([]);
      expect(result.cleanText).toBe('Response.');
    });

    it('should handle suggestions with varied whitespace', () => {
      const text = `Response text.\n\n\n---SUGGESTIONS---\n  ["a", "b"]  \n`;
      const result = service.parseSuggestions(text);
      expect(result.suggestions).toEqual(['a', 'b']);
    });
  });
});
