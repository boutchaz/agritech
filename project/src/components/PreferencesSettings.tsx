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
import { useMutation, useQueryClient } from '@tanstack/react-query';

type DifficultyLevel = 'basic' | 'intermediate' | 'expert';

const PreferencesSettings: React.FC = () => {
  const { i18n } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('basic');
  const [language, setLanguage] = useState('fr');
  const [timezone, setTimezone] = useState('Africa/Casablanca');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    alerts: true,
    reports: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);

  // Load user preferences from profile
  useEffect(() => {
    if (profile) {
      // @ts-expect-error - language field exists in user_profiles
      const userLanguage = profile.language || 'fr';
      // @ts-expect-error - timezone field exists in user_profiles
      const userTimezone = profile.timezone || 'Africa/Casablanca';

      setLanguage(userLanguage);
      setTimezone(userTimezone);

      // Update i18n language to match user preference
      if (i18n.language !== userLanguage) {
        i18n.changeLanguage(userLanguage);
      }

      setIsLoadingPreferences(false);
    } else if (!user) {
      setIsLoadingPreferences(false);
    }
  }, [profile, user, i18n]);

  const handleSave = async () => {
    if (!user) {
      toast.error('Erreur', {
        description: 'Vous devez être connecté pour sauvegarder vos préférences.',
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
      }

      // Invalidate auth profile query to refresh data
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });

      // Show success toast
      toast.success('Préférences enregistrées', {
        description: 'Vos préférences ont été mises à jour avec succès.',
        duration: 3000,
      });
    } catch (error) {
      // Show error toast
      toast.error('Erreur lors de la sauvegarde', {
        description: 'Impossible de sauvegarder vos préférences. Veuillez réessayer.',
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
          <p className="text-gray-600 dark:text-gray-400">Chargement des préférences...</p>
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
            Préférences
          </h2>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Enregistrement...' : 'Sauvegarder'}
        </Button>
      </div>

      <p className="text-gray-600 dark:text-gray-400">
        Personnalisez votre expérience avec l'application selon vos préférences.
      </p>

      {/* Experience Level Selector - Full Width */}
      <ExperienceLevelSelector />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interface Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Interface utilisateur
          </h3>

          <div className="space-y-6">

            <FormField label="Langue" htmlFor="pref_language">
              <Select
                id="pref_language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="es">Español</option>
              </Select>
            </FormField>

            <FormField label="Fuseau horaire" htmlFor="pref_timezone">
              <Select
                id="pref_timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="UTC">UTC (Temps universel coordonné)</option>
                <option value="Africa/Casablanca">Maroc (GMT+1)</option>
                <option value="Europe/Paris">France (GMT+1)</option>
                <option value="Europe/Madrid">Espagne (GMT+1)</option>
                <option value="Africa/Tunis">Tunisie (GMT+1)</option>
                <option value="Africa/Algiers">Algérie (GMT+1)</option>
              </Select>
            </FormField>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Notifications
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Notifications par email</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Recevoir des notifications importantes par email
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
                <h4 className="font-medium text-gray-900 dark:text-white">Notifications push</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Recevoir des notifications dans le navigateur
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
                <h4 className="font-medium text-gray-900 dark:text-white">Alertes système</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Alertes critiques et avertissements importants
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
                <h4 className="font-medium text-gray-900 dark:text-white">Rapports périodiques</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Recevoir des rapports hebdomadaires et mensuels
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
          Données et confidentialité
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Analytiques d'utilisation</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aider à améliorer l'application en partageant des données d'utilisation anonymes
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>
              Vos données sont protégées selon notre politique de confidentialité.
              Vous pouvez modifier ces paramètres à tout moment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesSettings;
