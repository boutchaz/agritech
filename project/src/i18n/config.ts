import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from '../locales/en/common.json';
import frCommon from '../locales/fr/common.json';
import arCommon from '../locales/ar/common.json';
import enAi from '../locales/en/ai.json';
import frAi from '../locales/fr/ai.json';
import arAi from '../locales/ar/ai.json';
import enStock from '../locales/en/stock.json';
import frStock from '../locales/fr/stock.json';
import arStock from '../locales/ar/stock.json';
import enCompliance from '../locales/en/compliance.json';
import frCompliance from '../locales/fr/compliance.json';
import arCompliance from '../locales/ar/compliance.json';
import enAccounting from '../locales/en/accounting.json';
import frAccounting from '../locales/fr/accounting.json';
import arAccounting from '../locales/ar/accounting.json';

const resources = {
  en: {
    common: enCommon,
    ai: enAi,
    stock: enStock,
    compliance: enCompliance,
    accounting: enAccounting,
  },
  fr: {
    common: frCommon,
    ai: frAi,
    stock: frStock,
    compliance: frCompliance,
    accounting: frAccounting,
  },
  ar: {
    common: arCommon,
    ai: arAi,
    stock: arStock,
    compliance: arCompliance,
    accounting: arAccounting,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: ['en', 'fr'],
    defaultNS: 'common',
    ns: ['common', 'ai', 'stock', 'compliance', 'accounting'],

    interpolation: {
      escapeValue: false, // React already escapes values
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

export default i18n;
