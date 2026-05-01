import { describe, it, expect } from 'vitest';
import enAi from '../en/ai.json';
import frAi from '../fr/ai.json';
import arAi from '../ar/ai.json';

const REQUIRED_KEYS = [
  'title',
  'unit',
  'referenceLabel',
  'fallbackBadge',
  'bands.green',
  'bands.yellow',
  'bands.red',
  'bands.critique',
];

function getDeep(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    obj,
  );
}

const FILES = {
  en: enAi as Record<string, unknown>,
  fr: frAi as Record<string, unknown>,
  ar: arAi as Record<string, unknown>,
};

describe('calibrationReview.chill i18n keys', () => {
  for (const [lang, file] of Object.entries(FILES)) {
    for (const key of REQUIRED_KEYS) {
      it(`${lang}: calibrationReview.chill.${key} exists and is non-empty`, () => {
        const review = file.calibrationReview as Record<string, unknown> | undefined;
        const chill = review?.chill as Record<string, unknown> | undefined;
        expect(chill).toBeDefined();
        const value = getDeep(chill ?? {}, key);
        expect(typeof value).toBe('string');
        expect((value as string).length).toBeGreaterThan(0);
        expect((value as string).toUpperCase()).not.toBe('TODO');
      });
    }
  }
});
