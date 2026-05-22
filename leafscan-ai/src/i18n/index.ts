/**
 * i18n setup với react-i18next.
 * Language được đồng bộ với settingsStore.language thông qua useI18nSync().
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { vi } from './locales/vi';
import { en } from './locales/en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en },
    },
    lng: 'vi',
    fallbackLng: 'vi',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

export default i18n;
