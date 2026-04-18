import React, { useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CURRENCIES, DEFAULT_CURRENCY, getCurrency, type Currency } from '@/utils/currencies';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: Currency) => void;
  disabled?: boolean;
}

const TRIGGER_ID = 'organization-currency-select';

function formatCurrencyOption(currency: Currency): string {
  return `${currency.symbol} - ${currency.name} (${currency.code})`;
}

const CurrencySelector = ({ value, onChange, disabled = false }: CurrencySelectorProps) => {
  const { t } = useTranslation('common');

  const selectValue = useMemo(() => {
    return getCurrency(value)?.code ?? DEFAULT_CURRENCY;
  }, [value]);

  const handleValueChange = (code: string) => {
    const currency = getCurrency(code);
    if (currency) {
      onChange(currency);
    }
  };

  return (
    <div className="space-y-2">
      <Label
        htmlFor={TRIGGER_ID}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        <DollarSign className="h-4 w-4 shrink-0" aria-hidden />
        {t('organization.currency.label', 'Currency')}
      </Label>
      <Select value={selectValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger
          id={TRIGGER_ID}
          className="h-12 w-full rounded-2xl border-slate-200 bg-white px-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/50"
        >
          <SelectValue placeholder={t('organization.currency.placeholder', 'Select a currency')} />
        </SelectTrigger>
        <SelectContent position="popper" className="rounded-xl">
          {CURRENCIES.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              {formatCurrencyOption(currency)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t(
          'organization.currency.helper',
          'The currency will be used for all financial amounts (utilities, invoices, etc.)',
        )}
      </p>
    </div>
  );
};

export default CurrencySelector;
