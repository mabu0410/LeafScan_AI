/**
 * Hook sync i18n language với settingsStore.language.
 */
import { useEffect } from 'react';
import i18n from './index';
import { useSettingsStore } from '../stores/settingsStore';

export function useI18nSync() {
  const language = useSettingsStore(state => state.language);

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);
}
