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

const NAMESPACES = ['common', 'ai', 'stock', 'compliance', 'accounting'] as const;

// Lazy loaders for non-default languages
const lazyLanguageLoaders: Record<string, () => Promise<Record<string, any>>> = {
  fr: async () => {
    const [common, ai, stock, compliance, accounting] = await Promise.all([
      import('../locales/fr/common.json'),
      import('../locales/fr/ai.json'),
      import('../locales/fr/stock.json'),
      import('../locales/fr/compliance.json'),
      import('../locales/fr/accounting.json'),
    ]);
    return { common: common.default, ai: ai.default, stock: stock.default, compliance: compliance.default, accounting: accounting.default };
  },
  ar: async () => {
    const [common, ai, stock, compliance, accounting] = await Promise.all([
      import('../locales/ar/common.json'),
      import('../locales/ar/ai.json'),
      import('../locales/ar/stock.json'),
      import('../locales/ar/compliance.json'),
      import('../locales/ar/accounting.json'),
    ]);
    return { common: common.default, ai: ai.default, stock: stock.default, compliance: compliance.default, accounting: accounting.default };
  },
};

// Detect language before init
const detectLanguage = (): string => {
  const stored = localStorage.getItem('i18nextLng');
  if (stored && ['en', 'fr', 'ar'].includes(stored)) return stored;
  const nav = navigator.language?.split('-')[0];
  if (nav && ['en', 'fr', 'ar'].includes(nav)) return nav;
  return 'en';
};

const detectedLng = detectLanguage();

// Build initial resources — always include English as fallback
const initialResources: Record<string, Record<string, any>> = {
  en: {
    common: enCommon,
    ai: enAi,
    stock: enStock,
    compliance: enCompliance,
    accounting: enAccounting,
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
    ns: ['common', 'ai', 'stock', 'compliance', 'accounting'],

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
  if (lng === 'en' || i18n.hasResourceBundle(lng, 'common')) {
    i18n.changeLanguage(lng);
    return;
  }
  const loader = lazyLanguageLoaders[lng];
  if (loader) {
    const bundles = await loader();
    for (const ns of NAMESPACES) {
      if (bundles[ns]) {
        i18n.addResourceBundle(lng, ns, bundles[ns], true, true);
      }
    }
  }
  i18n.changeLanguage(lng);
};

export default i18n;
