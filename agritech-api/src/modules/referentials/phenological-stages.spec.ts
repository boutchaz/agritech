import * as fs from 'fs';
import * as path from 'path';

const REFERENTIALS_DIR = path.resolve(__dirname, '..', '..', '..', 'referentials');

const loadReferentiel = (filename: string): Record<string, unknown> => {
  const raw = fs.readFileSync(path.join(REFERENTIALS_DIR, filename), 'utf-8');
  return JSON.parse(raw) as Record<string, unknown>;
};

describe('Referentiel phenological_stages block', () => {
  describe.each([
    ['DATA_AGRUMES.json'],
    ['DATA_AVOCATIER.json'],
    ['DATA_PALMIER_DATTIER.json'],
  ])('%s', (filename) => {
    const ref = loadReferentiel(filename);

    it('exposes a top-level phenological_stages array', () => {
      expect(Array.isArray(ref.phenological_stages)).toBe(true);
      expect((ref.phenological_stages as unknown[]).length).toBeGreaterThan(0);
    });

    it('every stage has key, name_fr, months (1-12), thresholds', () => {
      const stages = ref.phenological_stages as Array<Record<string, unknown>>;
      for (const stage of stages) {
        expect(typeof stage.key).toBe('string');
        expect(typeof stage.name_fr).toBe('string');
        expect(Array.isArray(stage.months)).toBe(true);
        for (const m of stage.months as number[]) {
          expect(m).toBeGreaterThanOrEqual(1);
          expect(m).toBeLessThanOrEqual(12);
        }
        expect(Array.isArray(stage.thresholds)).toBe(true);
      }
    });

    it('every threshold has key, label_fr, compare, value, unit', () => {
      const stages = ref.phenological_stages as Array<Record<string, unknown>>;
      for (const stage of stages) {
        for (const th of stage.thresholds as Array<Record<string, unknown>>) {
          expect(typeof th.key).toBe('string');
          expect(typeof th.label_fr).toBe('string');
          expect(['below', 'above', 'between']).toContain(th.compare);
          expect(typeof th.value).toBe('number');
          expect(typeof th.unit).toBe('string');
          if (th.compare === 'between') {
            expect(typeof th.upper).toBe('number');
          }
        }
      }
    });
  });

  describe('DATA_OLIVIER.json', () => {
    const ref = loadReferentiel('DATA_OLIVIER.json');

    it('exposes a top-level phenological_stages array', () => {
      expect(Array.isArray(ref.phenological_stages)).toBe(true);
      expect((ref.phenological_stages as unknown[]).length).toBeGreaterThan(0);
    });

    it('dormancy stage uses Nov-Feb window with 7.2°C chill threshold', () => {
      const stages = ref.phenological_stages as Array<Record<string, unknown>>;
      const dormancy = stages.find((s) => s.key === 'dormancy');
      expect(dormancy).toBeDefined();
      expect(dormancy!.months).toEqual([11, 12, 1, 2]);

      const thresholds = dormancy!.thresholds as Array<Record<string, unknown>>;
      const chill = thresholds.find((t) => t.key === 'chill_hours');
      expect(chill).toBeDefined();
      expect(chill!.value).toBe(7.2);
      expect(chill!.compare).toBe('below');
    });

    it('every stage has key, name_fr, months (array of 1-12), thresholds (array)', () => {
      const stages = ref.phenological_stages as Array<Record<string, unknown>>;
      for (const stage of stages) {
        expect(typeof stage.key).toBe('string');
        expect(typeof stage.name_fr).toBe('string');
        expect(Array.isArray(stage.months)).toBe(true);
        for (const m of stage.months as number[]) {
          expect(m).toBeGreaterThanOrEqual(1);
          expect(m).toBeLessThanOrEqual(12);
        }
        expect(Array.isArray(stage.thresholds)).toBe(true);
      }
    });

    it('every threshold has key, label_fr, compare, value, unit', () => {
      const stages = ref.phenological_stages as Array<Record<string, unknown>>;
      for (const stage of stages) {
        for (const th of stage.thresholds as Array<Record<string, unknown>>) {
          expect(typeof th.key).toBe('string');
          expect(typeof th.label_fr).toBe('string');
          expect(['below', 'above', 'between']).toContain(th.compare);
          expect(typeof th.value).toBe('number');
          expect(typeof th.unit).toBe('string');
          if (th.compare === 'between') {
            expect(typeof th.upper).toBe('number');
          }
        }
      }
    });
  });
});
