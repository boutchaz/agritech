import React from 'react';
import { DollarSign } from 'lucide-react';
import { CURRENCIES, type Currency } from '../utils/currencies';

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: Currency) => void;
  disabled?: boolean;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({ value, onChange, disabled = false }) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const currency = CURRENCIES.find(c => c.code === e.target.value);
    if (currency) {
      onChange(currency);
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <DollarSign className="w-4 h-4" />
        <span>Devise</span>
      </label>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {CURRENCIES.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.symbol} - {currency.name} ({currency.code})
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        La devise sera utilisée pour tous les montants financiers (utilities, factures, etc.)
      </p>
    </div>
  );
};

export default CurrencySelector;