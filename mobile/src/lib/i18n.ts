import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

import enCommon from '../locales/en/common.json';
import enNavigation from '../locales/en/navigation.json';
import enAuth from '../locales/en/auth.json';
import frCommon from '../locales/fr/common.json';
import frNavigation from '../locales/fr/navigation.json';
import frAuth from '../locales/fr/auth.json';
import arCommon from '../locales/ar/common.json';
import arNavigation from '../locales/ar/navigation.json';
import arAuth from '../locales/ar/auth.json';

const resources = {
  en: { common: enCommon, navigation: enNavigation, auth: enAuth },
  fr: { common: frCommon, navigation: frNavigation, auth: frAuth },
  ar: { common: arCommon, navigation: arNavigation, auth: arAuth },
} as const;

const supportedLocales = ['en', 'fr', 'ar'] as const;

type SupportedLocale = (typeof supportedLocales)[number];

function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
}

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en';
const locale: SupportedLocale = isSupportedLocale(deviceLocale) ? deviceLocale : 'en';
const isRTL = locale === 'ar';

I18nManager.allowRTL(isRTL);
if (I18nManager.isRTL !== isRTL) {
  I18nManager.forceRTL(isRTL);
}

i18n.use(initReactI18next).init({
  resources,
  lng: locale,
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v3',
});

export default i18n;
export { locale as currentLocale };
