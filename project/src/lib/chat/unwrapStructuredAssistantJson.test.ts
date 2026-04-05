import { describe, it, expect } from 'vitest';
import {
  unwrapStructuredAssistantJson,
  stripMarkdownJsonFence,
  extractOutermostJsonObject,
} from './unwrapStructuredAssistantJson';

describe('stripMarkdownJsonFence', () => {
  it('removes ```json wrapper', () => {
    const inner = '{"text":"hi"}';
    expect(stripMarkdownJsonFence(`\`\`\`json\n${inner}\n\`\`\``)).toBe(inner);
  });
});

describe('extractOutermostJsonObject', () => {
  it('pulls object after prose', () => {
    const inner = '{"text":"x"}';
    expect(extractOutermostJsonObject(`Here you go:\n${inner}\nthanks`)).toBe(inner);
  });
});

describe('unwrapStructuredAssistantJson', () => {
  it('unwraps bare structured JSON into markdown + card fence', () => {
    const raw = JSON.stringify({
      text: 'Hello',
      suggestions: ['a'],
      data_cards: [
        {
          type: 'farm-summary',
          data: { farms_count: 2, parcels_count: 1, workers_count: 1, pending_tasks: 1 },
        },
      ],
    });
    const out = unwrapStructuredAssistantJson(raw);
    expect(out).toContain('Hello');
    expect(out).toContain('```json:farm-summary');
    expect(out).toContain('"farms_count": 2');
  });

  it('unwraps fenced structured JSON', () => {
    const inner = JSON.stringify({
      text: 'Cal',
      data_cards: [
        {
          type: 'farm-summary',
          data: { farms_count: 1, parcels_count: 0, workers_count: 0, pending_tasks: 0 },
        },
      ],
    });
    const out = unwrapStructuredAssistantJson(`\`\`\`json\n${inner}\n\`\`\``);
    expect(out).toContain('Cal');
    expect(out).toContain('```json:farm-summary');
  });

  it('unwraps when preamble precedes JSON', () => {
    const inner = JSON.stringify({
      text: 'Done',
      data_cards: [],
    });
    const out = unwrapStructuredAssistantJson(`Sure.\n${inner}`);
    expect(out).toBe('Done');
  });

  it('returns original when not JSON', () => {
    const plain = 'Just a sentence.';
    expect(unwrapStructuredAssistantJson(plain)).toBe(plain);
  });
});
