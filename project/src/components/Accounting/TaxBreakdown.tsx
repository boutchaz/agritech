import React from 'react';
import { formatCurrency, type TaxBreakdownItem } from '@/lib/taxCalculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TaxBreakdownProps {
  taxBreakdown: TaxBreakdownItem[];
  currency?: string;
  className?: string;
}

/**
 * Component to display tax breakdown in a clean, readable format
 */
export const TaxBreakdown: React.FC<TaxBreakdownProps> = ({
  taxBreakdown,
  currency = 'MAD',
  className = '',
}) => {
  if (taxBreakdown.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Tax Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {taxBreakdown.map((tax) => (
          <div
            key={tax.tax_id}
            className="flex items-start justify-between text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0 last:pb-0"
          >
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">
                {tax.tax_name}
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({tax.tax_rate}%)
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                on {formatCurrency(tax.taxable_amount, currency)}
              </div>
            </div>
            <div className="font-semibold text-gray-900 dark:text-white ml-4">
              {formatCurrency(tax.tax_amount, currency)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

interface InvoiceTotalsDisplayProps {
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  taxBreakdown?: TaxBreakdownItem[];
  currency?: string;
  className?: string;
}

/**
 * Component to display invoice totals with tax breakdown
 */
export const InvoiceTotalsDisplay: React.FC<InvoiceTotalsDisplayProps> = ({
  subtotal,
  taxTotal,
  grandTotal,
  taxBreakdown = [],
  currency = 'MAD',
  className = '',
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Subtotal */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {formatCurrency(subtotal, currency)}
        </span>
      </div>

      {/* Tax breakdown */}
      {taxBreakdown.length > 0 && (
        <div className="space-y-1.5 border-t border-gray-200 dark:border-gray-700 pt-2">
          {taxBreakdown.map((tax) => (
            <div key={tax.tax_id} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {tax.tax_name} ({tax.tax_rate}%)
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(tax.tax_amount, currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tax Total (if no breakdown) */}
      {taxBreakdown.length === 0 && taxTotal > 0 && (
        <div className="flex items-center justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
          <span className="text-gray-600 dark:text-gray-400">Tax</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(taxTotal, currency)}
          </span>
        </div>
      )}

      {/* Grand Total */}
      <div className="flex items-center justify-between text-lg font-bold border-t-2 border-gray-300 dark:border-gray-600 pt-3">
        <span className="text-gray-900 dark:text-white">Grand Total</span>
        <span className="text-green-600 dark:text-green-400">
          {formatCurrency(grandTotal, currency)}
        </span>
      </div>
    </div>
  );
};

interface LineItemTaxDisplayProps {
  amount: number;
  taxAmount: number;
  taxRate?: number;
  taxName?: string;
  currency?: string;
  compact?: boolean;
}

/**
 * Component to display tax information for a single line item
 */
export const LineItemTaxDisplay: React.FC<LineItemTaxDisplayProps> = ({
  amount,
  taxAmount,
  taxRate,
  taxName,
  currency = 'MAD',
  compact = false,
}) => {
  if (taxAmount === 0) {
    return compact ? (
      <span className="text-xs text-gray-500">No tax</span>
    ) : (
      <div className="text-sm text-gray-500 dark:text-gray-400">No tax applied</div>
    );
  }

  return compact ? (
    <div className="text-xs text-gray-600 dark:text-gray-400">
      {taxName && `${taxName} `}
      {taxRate && `(${taxRate}%)`}: {formatCurrency(taxAmount, currency)}
    </div>
  ) : (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Amount</span>
        <span className="font-medium">{formatCurrency(amount, currency)}</span>
      </div>
      {taxRate && taxName && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {taxName} ({taxRate}%)
          </span>
          <span className="font-medium">{formatCurrency(taxAmount, currency)}</span>
        </div>
      )}
      <div className="flex items-center justify-between text-sm font-semibold border-t pt-1">
        <span>Total</span>
        <span>{formatCurrency(amount + taxAmount, currency)}</span>
      </div>
    </div>
  );
};
