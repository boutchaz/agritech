import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from '../locales/en/common.json';
import frCommon from '../locales/fr/common.json';
import arCommon from '../locales/ar/common.json';
import enAi from '../locales/en/ai.json';
import frAi from '../locales/fr/ai.json';
import arAi from '../locales/ar/ai.json';

const resources = {
  en: {
    common: enCommon,
    ai: enAi,
  },
  fr: {
    common: frCommon,
    ai: frAi,
  },
  ar: {
    common: arCommon,
    ai: arAi,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: ['en', 'fr'],
    defaultNS: 'common',
    ns: ['common', 'ai'],

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
