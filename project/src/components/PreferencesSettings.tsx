import React, { useState, useEffect } from 'react';
import { Sliders, Save, Loader2 } from 'lucide-react';
import { FormField } from './ui/FormField';
import { Select } from './ui/Select';
import { ExperienceLevelSelector } from './settings/ExperienceLevelSelector';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from './MultiTenantAuthProvider';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

const PreferencesSettings: React.FC = () => {
  const { i18n, t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [language, setLanguage] = useState(i18n.language || 'fr');
  const [timezone, setTimezone] = useState('Africa/Casablanca');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    alerts: true,
    reports: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  // Handle language change immediately
  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
    // Immediately change i18n language
    await i18n.changeLanguage(newLanguage);
    
    // Set document direction for RTL languages
    if (newLanguage === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = newLanguage;
    }
  };

  // Load user preferences from profile
  useEffect(() => {
    if (profile) {
      const userLanguage = (profile as any).language || i18n.language || 'fr';
      const userTimezone = (profile as any).timezone || 'Africa/Casablanca';

      // Only set the state for display, don't change i18n language automatically
      // This allows users to keep their current language selection until they explicitly change it
      setLanguage(userLanguage);
      setTimezone(userTimezone);

      setIsLoadingPreferences(false);
    } else if (!user) {
      setIsLoadingPreferences(false);
    }
  }, [profile, user]); // Removed i18n from dependencies to avoid infinite loop

  const handleSave = async () => {
    if (!user) {
      toast.error(t('preferences.errors.notLoggedIn'), {
        description: t('preferences.errors.notLoggedInDescription'),
        duration: 3000,
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update user profile in database
      const { error } = await supabase
        .from('user_profiles')
        .update({
          language,
          timezone,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update i18n language immediately
      if (i18n.language !== language) {
        await i18n.changeLanguage(language);
        // Set document direction
        if (language === 'ar') {
          document.documentElement.dir = 'rtl';
          document.documentElement.lang = 'ar';
        } else {
          document.documentElement.dir = 'ltr';
          document.documentElement.lang = language;
        }
      }

      // Invalidate auth profile query to refresh data
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });

      // Show success toast
      toast.success(t('preferences.success'), {
        description: t('preferences.successDescription'),
        duration: 3000,
      });
    } catch (error) {
      // Show error toast
      toast.error(t('preferences.errors.saveError'), {
        description: t('preferences.errors.saveErrorDescription'),
        duration: 4000,
      });
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state while fetching preferences
  if (isLoadingPreferences) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">{t('preferences.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sliders className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('preferences.title')}
          </h2>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? t('preferences.saving') : t('preferences.save')}
        </Button>
      </div>

      <p className="text-gray-600 dark:text-gray-400">
        {t('preferences.subtitle')}
      </p>

      {/* Experience Level Selector - Full Width */}
      <ExperienceLevelSelector />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interface Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {t('preferences.sections.interface')}
          </h3>

          <div className="space-y-6">

            <FormField label={t('preferences.fields.language')} htmlFor="pref_language">
              <Select
                id="pref_language"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="es">Español</option>
              </Select>
            </FormField>

            <FormField label={t('preferences.fields.timezone')} htmlFor="pref_timezone">
              <Select
                id="pref_timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="UTC">{t('preferences.timezones.utc')}</option>
                <option value="Africa/Casablanca">{t('preferences.timezones.morocco')}</option>
                <option value="Europe/Paris">{t('preferences.timezones.france')}</option>
                <option value="Europe/Madrid">{t('preferences.timezones.spain')}</option>
                <option value="Africa/Tunis">{t('preferences.timezones.tunisia')}</option>
                <option value="Africa/Algiers">{t('preferences.timezones.algeria')}</option>
              </Select>
            </FormField>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {t('preferences.sections.notifications')}
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{t('preferences.notifications.email.title')}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('preferences.notifications.email.description')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{t('preferences.notifications.push.title')}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('preferences.notifications.push.description')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.push}
                  onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{t('preferences.notifications.alerts.title')}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('preferences.notifications.alerts.description')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.alerts}
                  onChange={(e) => setNotifications({ ...notifications, alerts: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">{t('preferences.notifications.reports.title')}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('preferences.notifications.reports.description')}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.reports}
                  onChange={(e) => setNotifications({ ...notifications, reports: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('preferences.sections.dataPrivacy')}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">{t('preferences.dataPrivacy.analytics.title')}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('preferences.dataPrivacy.analytics.description')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>
              {t('preferences.dataPrivacy.privacyNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSettings;
