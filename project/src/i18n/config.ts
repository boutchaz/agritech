import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Only import the detected/default language synchronously
// Other languages load on demand
import enCommon from '../locales/en/common.json';
import enAi from '../locales/en/ai.json';
import enStock from '../locales/en/stock.json';
import enCompliance from '../locales/en/compliance.json';
import enAccounting from '../locales/en/accounting.json';
import enSatellite from '../locales/en/satellite.json';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'ar'] as const;
const NAMESPACES = ['common', 'ai', 'stock', 'compliance', 'accounting', 'satellite'] as const;
type Namespace = (typeof NAMESPACES)[number];
type TranslationResource = Record<string, unknown>;
type LanguageBundles = Record<Namespace, TranslationResource>;

// Lazy loaders for non-default languages
const lazyLanguageLoaders: Record<string, () => Promise<LanguageBundles>> = {
  fr: async () => {
    const [common, ai, stock, compliance, accounting, satellite] = await Promise.all([
      import('../locales/fr/common.json'),
      import('../locales/fr/ai.json'),
      import('../locales/fr/stock.json'),
      import('../locales/fr/compliance.json'),
      import('../locales/fr/accounting.json'),
      import('../locales/fr/satellite.json'),
    ]);
    return { common: common.default, ai: ai.default, stock: stock.default, compliance: compliance.default, accounting: accounting.default, satellite: satellite.default };
  },
  ar: async () => {
    const [common, ai, stock, compliance, accounting, satellite] = await Promise.all([
      import('../locales/ar/common.json'),
      import('../locales/ar/ai.json'),
      import('../locales/ar/stock.json'),
      import('../locales/ar/compliance.json'),
      import('../locales/ar/accounting.json'),
      import('../locales/ar/satellite.json'),
    ]);
    return { common: common.default, ai: ai.default, stock: stock.default, compliance: compliance.default, accounting: accounting.default, satellite: satellite.default };
  },
};

// Detect language before init
const detectLanguage = (): string => {
  const supported: readonly string[] = SUPPORTED_LANGUAGES;
  const stored = localStorage.getItem('i18nextLng');
  if (stored && supported.includes(stored)) return stored;
  const nav = navigator.language?.split('-')[0];
  if (nav && supported.includes(nav)) return nav;
  return 'en';
};

const detectedLng = detectLanguage();

// Build initial resources — always include English as fallback
const initialResources: Record<string, LanguageBundles> = {
  en: {
    common: enCommon,
    ai: enAi,
    stock: enStock,
    compliance: enCompliance,
    accounting: enAccounting,
    satellite: enSatellite,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: initialResources,
    lng: detectedLng === 'en' ? 'en' : undefined, // Let detector pick if not English
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'ai', 'stock', 'compliance', 'accounting', 'satellite'],

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    react: {
      useSuspense: false,
    },
  });

// Load non-English language resources after init
if (detectedLng !== 'en' && lazyLanguageLoaders[detectedLng]) {
  lazyLanguageLoaders[detectedLng]().then((bundles) => {
    for (const ns of NAMESPACES) {
      if (bundles[ns]) {
        i18n.addResourceBundle(detectedLng, ns, bundles[ns], true, true);
      }
    }
    i18n.changeLanguage(detectedLng);
  });
}

// Export helper for runtime language switching
export const loadLanguage = async (lng: string) => {
  // Fall back to 'en' for unsupported languages
  const safeLng = (SUPPORTED_LANGUAGES as readonly string[]).includes(lng) ? lng : 'en';

  if (safeLng === 'en' || i18n.hasResourceBundle(safeLng, 'common')) {
    i18n.changeLanguage(safeLng);
    return;
  }
  const loader = lazyLanguageLoaders[safeLng];
  if (loader) {
    const bundles = await loader();
    for (const ns of NAMESPACES) {
      if (bundles[ns]) {
        i18n.addResourceBundle(safeLng, ns, bundles[ns], true, true);
      }
    }
  }
  i18n.changeLanguage(safeLng);
};

export default i18n;
