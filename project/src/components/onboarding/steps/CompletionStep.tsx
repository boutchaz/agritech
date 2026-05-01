import { useEffect, useMemo } from 'react';
import { Rocket, Settings, Bell, Database, Check, Loader2, Landmark } from 'lucide-react';
import { SelectionCard } from '../ui/SelectionCard';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface Preferences {
  currency: string;
  date_format: string;
  use_demo_data: boolean;
  enable_notifications: boolean;
  accounting_template_country: string;
}

interface CompletionStepProps {
  preferences: Preferences;
  profileName: string;
  organizationName: string;
  farmName: string;
  selectedModulesCount: number;
  /** Organization country from step 2 (ISO2), used to default chart template */
  defaultAccountingCountry: string;
  onUpdate: (data: Partial<Preferences>) => void;
  onComplete: () => void;
  isLoading: boolean;
}

const CURRENCIES = [
  { id: 'MAD', nameKey: 'onboarding.settings.currencyNames.mad', nameFallback: 'Moroccan dirham', symbol: 'د.م.' },
  { id: 'EUR', nameKey: 'onboarding.settings.currencyNames.eur', nameFallback: 'Euro', symbol: '€' },
  { id: 'USD', nameKey: 'onboarding.settings.currencyNames.usd', nameFallback: 'US dollar', symbol: '$' },
];

const DATE_FORMATS = [
  { id: 'DD/MM/YYYY', labelKey: 'onboarding.settings.dateFormatLabels.eu', labelFallback: '31/12/2024 (Europe)' },
  { id: 'MM/DD/YYYY', labelKey: 'onboarding.settings.dateFormatLabels.us', labelFallback: '12/31/2024 (US)' },
  { id: 'YYYY-MM-DD', labelKey: 'onboarding.settings.dateFormatLabels.iso', labelFallback: '2024-12-31 (ISO)' },
];

/** Chart templates shipped in the API (must match AccountsService fallbacks) */
const CHART_COUNTRIES = [
  { id: 'MA', labelKey: 'onboarding.settings.chart.ma', labelFallback: 'Morocco (CGNC)' },
  { id: 'FR', labelKey: 'onboarding.settings.chart.fr', labelFallback: 'France (PCG)' },
  { id: 'TN', labelKey: 'onboarding.settings.chart.tn', labelFallback: 'Tunisia (PCN)' },
  { id: 'US', labelKey: 'onboarding.settings.chart.us', labelFallback: 'United States (US GAAP)' },
  { id: 'GB', labelKey: 'onboarding.settings.chart.gb', labelFallback: 'United Kingdom (FRS 102)' },
  { id: 'DE', labelKey: 'onboarding.settings.chart.de', labelFallback: 'Germany (HGB)' },
];

function mapOrgCountryToDefaultTemplate(iso: string): string {
  const u = (iso || 'MA').toUpperCase().trim();
  if (CHART_COUNTRIES.some((c) => c.id === u)) return u;
  if (u === 'ES') return 'FR';
  if (u === 'DZ') return 'MA';
  return 'MA';
}

export const CompletionStep = ({
  preferences,
  profileName,
  organizationName,
  farmName,
  selectedModulesCount,
  defaultAccountingCountry,
  onUpdate,
  onComplete,
  isLoading,
}: CompletionStepProps) => {
  const { t } = useTranslation();

  const chartDefault = useMemo(
    () => mapOrgCountryToDefaultTemplate(defaultAccountingCountry),
    [defaultAccountingCountry],
  );

  useEffect(() => {
    if (!preferences.accounting_template_country) {
      onUpdate({ accounting_template_country: chartDefault });
    }
  }, [chartDefault, preferences.accounting_template_country, onUpdate]);

  const canLaunch =
    !!preferences.currency &&
    !!preferences.date_format &&
    !!preferences.accounting_template_country;

  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-in">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Settings className="w-7 h-7 text-emerald-700" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {t('onboarding.settings.title', 'Final settings')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t(
            'onboarding.settings.subtitle',
            'Currency, dates, and your chart of accounts are required so costs, stock, and payroll post correctly.',
          )}
        </p>
      </div>

      <div className="space-y-6 mb-6">
        <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 p-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-600" />
            {t('onboarding.settings.chartTitle', 'Chart of accounts (country)')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {t(
              'onboarding.settings.chartHelp',
              'We install the official account plan and default mappings for this country. You can refine mappings later in Accounting.',
            )}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {CHART_COUNTRIES.map((c) => (
              <Button
                key={c.id}
                type="button"
                variant="outline"
                onClick={() => onUpdate({ accounting_template_country: c.id })}
                className={`h-auto py-2.5 px-3 text-left text-sm justify-start ${
                  preferences.accounting_template_country === c.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                    : ''
                }`}
              >
                {t(c.labelKey, c.labelFallback)}
              </Button>
            ))}
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('onboarding.settings.currency', 'Currency')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map((currency) => (
              <Button
                key={currency.id}
                type="button"
                variant="outline"
                onClick={() => onUpdate({ currency: currency.id })}
                className={`py-3 px-2 h-auto flex flex-col items-center gap-0.5 ${
                  preferences.currency === currency.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                    : ''
                }`}
              >
                <span className="text-lg font-bold">{currency.symbol}</span>
                <span className="text-[10px] text-gray-500">{currency.id}</span>
                <span className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-2 text-center">
                  {t(currency.nameKey, currency.nameFallback)}
                </span>
              </Button>
            ))}
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('onboarding.settings.dateFormat', 'Date format')}
          </label>
          <div className="space-y-2">
            {DATE_FORMATS.map((format) => (
              <Button
                key={format.id}
                type="button"
                variant="outline"
                onClick={() => onUpdate({ date_format: format.id })}
                className={`w-full justify-between h-auto py-3 ${
                  preferences.date_format === format.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                    : ''
                }`}
              >
                <span className="font-medium text-sm">{t(format.labelKey, format.labelFallback)}</span>
                {preferences.date_format === format.id && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              </Button>
            ))}
          </div>
        </section>

        <div className="space-y-3">
          <SelectionCard
            title={t('onboarding.settings.demoTitle', 'Demo data')}
            description={t(
              'onboarding.settings.demoDesc',
              'Only if you have no farm yet — otherwise skipped to keep your farm and parcels.',
            )}
            icon={<Database className="w-5 h-5" />}
            selected={preferences.use_demo_data}
            onClick={() => onUpdate({ use_demo_data: !preferences.use_demo_data })}
          />

          <SelectionCard
            title={t('onboarding.settings.notificationsTitle', 'Notifications')}
            description={t('onboarding.settings.notificationsDesc', 'Important alerts by email')}
            icon={<Bell className="w-5 h-5" />}
            selected={preferences.enable_notifications}
            onClick={() => onUpdate({ enable_notifications: !preferences.enable_notifications })}
          />
        </div>
      </div>

      <div className="space-y-2 mb-6 text-sm border-t border-gray-200 dark:border-slate-700 pt-4">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
          <Check className="w-4 h-4 shrink-0" />
          <span className="truncate">{profileName}</span>
        </div>
        <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
          <Check className="w-4 h-4 shrink-0" />
          <span className="truncate">{organizationName}</span>
        </div>
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <Check className="w-4 h-4 shrink-0" />
          <span className="truncate">{farmName}</span>
        </div>
        <div className="flex items-center gap-2 text-violet-800 dark:text-violet-300">
          <Check className="w-4 h-4 shrink-0" />
          {t('onboarding.settings.modulesLine', '{{count}} modules', { count: selectedModulesCount })}
        </div>
      </div>

      <Button
        onClick={onComplete}
        disabled={isLoading || !canLaunch}
        className="w-full py-5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white rounded-2xl font-bold text-lg
          shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]
          flex items-center justify-center gap-3"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            {t('onboarding.settings.launching', 'Setting up…')}
          </>
        ) : (
          <>
            <Rocket className="w-6 h-6" />
            {t('onboarding.settings.launch', 'Open my workspace')}
          </>
        )}
      </Button>

      {!canLaunch && (
        <p className="mt-2 text-center text-xs text-amber-700 dark:text-amber-400">
          {t('onboarding.settings.incomplete', 'Choose a chart country, currency, and date format to continue.')}
        </p>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default CompletionStep;
