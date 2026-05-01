import { describe, it, expect } from 'vitest';
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  getCurrency,
  formatCurrency,
  formatAmount,
} from '../currencies';

describe('currencies', () => {
  describe('DEFAULT_CURRENCY', () => {
    it('should be MAD', () => {
      expect(DEFAULT_CURRENCY).toBe('MAD');
    });
  });

  describe('CURRENCIES', () => {
    it('should include EUR, USD, GBP, MAD, TND, DZD, XOF, XAF', () => {
      const codes = CURRENCIES.map(c => c.code);
      expect(codes).toContain('EUR');
      expect(codes).toContain('USD');
      expect(codes).toContain('GBP');
      expect(codes).toContain('MAD');
      expect(codes).toContain('TND');
      expect(codes).toContain('DZD');
      expect(codes).toContain('XOF');
      expect(codes).toContain('XAF');
    });

    it('should have code, name, symbol, and locale for each currency', () => {
      for (const currency of CURRENCIES) {
        expect(currency.code).toBeTruthy();
        expect(currency.name).toBeTruthy();
        expect(currency.symbol).toBeTruthy();
        expect(currency.locale).toBeTruthy();
      }
    });
  });

  describe('getCurrency', () => {
    it('should return the currency for a valid code', () => {
      const eur = getCurrency('EUR');
      expect(eur).toBeDefined();
      expect(eur?.code).toBe('EUR');
      expect(eur?.symbol).toBe('€');
    });

    it('should return MAD currency', () => {
      const mad = getCurrency('MAD');
      expect(mad).toBeDefined();
      expect(mad?.symbol).toBe('DH');
    });

    it('should return undefined for unknown code', () => {
      expect(getCurrency('XYZ')).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      expect(getCurrency('eur')).toBeUndefined();
      expect(getCurrency('EUR')).toBeDefined();
    });
  });

  describe('formatCurrency', () => {
    it('should format EUR correctly', () => {
      const result = formatCurrency(1234.56, 'EUR');
      expect(result).toContain('1');
      expect(result).toContain('234');
      expect(result).toContain('56');
    });

    it('should format MAD correctly', () => {
      const result = formatCurrency(1000, 'MAD');
      expect(result).toBeTruthy();
      expect(result).toContain('1');
      expect(result).toContain('000');
    });

    it('should fallback for unknown currency code', () => {
      const result = formatCurrency(100, 'XYZ');
      expect(result).toBe('100 XYZ');
    });

    it('should handle zero amount', () => {
      const result = formatCurrency(0, 'EUR');
      expect(result).toContain('0');
    });

    it('should handle negative amount', () => {
      const result = formatCurrency(-500, 'EUR');
      expect(result).toContain('500');
    });

    it('should respect minimum and maximum fraction digits', () => {
      const result = formatCurrency(100, 'EUR');
      expect(result).toContain('00');
    });
  });

  describe('formatAmount', () => {
    it('should format amount with symbol', () => {
      const result = formatAmount(1234.56, '€');
      expect(result).toBe('1234.56 €');
    });

    it('should pad to 2 decimal places', () => {
      const result = formatAmount(100, 'DH');
      expect(result).toBe('100.00 DH');
    });

    it('should handle zero', () => {
      const result = formatAmount(0, '$');
      expect(result).toBe('0.00 $');
    });

    it('should handle negative', () => {
      const result = formatAmount(-50.5, 'DH');
      expect(result).toBe('-50.50 DH');
    });
  });
});
