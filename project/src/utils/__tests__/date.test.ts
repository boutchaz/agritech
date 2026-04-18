import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getLocalDate,
  formatLocalDate,
  getLocalDateOffset,
  parseLocalDate,
  formatLocalDateTime,
  getLocalDateTime,
} from '../date';

describe('date utils', () => {
  describe('getLocalDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const result = getLocalDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return today date', () => {
      const today = new Date();
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(getLocalDate()).toBe(expected);
    });
  });

  describe('formatLocalDate', () => {
    it('should format a Date to YYYY-MM-DD', () => {
      const date = new Date(2025, 5, 15);
      expect(formatLocalDate(date)).toBe('2025-06-15');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date(2025, 0, 5);
      expect(formatLocalDate(date)).toBe('2025-01-05');
    });

    it('should handle December 31st', () => {
      const date = new Date(2025, 11, 31);
      expect(formatLocalDate(date)).toBe('2025-12-31');
    });
  });

  describe('getLocalDateOffset', () => {
    it('should return a future date with positive offset', () => {
      const tomorrow = getLocalDateOffset(1);
      const today = getLocalDate();
      expect(tomorrow).not.toBe(today);
    });

    it('should return a past date with negative offset', () => {
      const yesterday = getLocalDateOffset(-1);
      const today = getLocalDate();
      expect(yesterday).not.toBe(today);
    });

    it('should return today with zero offset', () => {
      expect(getLocalDateOffset(0)).toBe(getLocalDate());
    });

    it('should return correct date for +7 days', () => {
      const result = getLocalDateOffset(7);
      const expected = new Date();
      expected.setDate(expected.getDate() + 7);
      const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth() + 1).padStart(2, '0')}-${String(expected.getDate()).padStart(2, '0')}`;
      expect(result).toBe(expectedStr);
    });
  });

  describe('parseLocalDate', () => {
    it('should parse YYYY-MM-DD to a Date at midnight local time', () => {
      const result = parseLocalDate('2025-06-15');
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it('should parse January 1st correctly', () => {
      const result = parseLocalDate('2025-01-01');
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
    });

    it('should parse December 31st correctly', () => {
      const result = parseLocalDate('2025-12-31');
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(31);
    });
  });

  describe('formatLocalDateTime', () => {
    it('should format a Date with time by default', () => {
      const date = new Date(2025, 5, 15, 14, 30);
      const result = formatLocalDateTime(date);
      expect(result).toContain('2025');
      expect(result).toContain('06');
      expect(result).toContain('15');
      expect(result).toContain('14');
      expect(result).toContain('30');
    });

    it('should format without time when includeTime is false', () => {
      const date = new Date(2025, 5, 15, 14, 30);
      const result = formatLocalDateTime(date, false);
      expect(result).toContain('2025');
      expect(result).not.toContain('14');
      expect(result).not.toContain('30');
    });

    it('should accept ISO string input', () => {
      const result = formatLocalDateTime('2025-06-15T14:30:00');
      expect(result).toContain('2025');
    });
  });

  describe('getLocalDateTime', () => {
    it('should return datetime in YYYY-MM-DDTHH:mm:ss format', () => {
      const result = getLocalDateTime();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it('should return current local datetime', () => {
      const now = new Date();
      const result = getLocalDateTime();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(result.startsWith(expected)).toBe(true);
    });
  });
});
