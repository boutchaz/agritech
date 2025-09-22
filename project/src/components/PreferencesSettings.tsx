import React, { useState } from 'react';
import { Sliders, Save } from 'lucide-react';

type DifficultyLevel = 'basic' | 'intermediate' | 'expert';

const PreferencesSettings: React.FC = () => {
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('basic');
  const [language, setLanguage] = useState('fr');
  const [timezone, setTimezone] = useState('Africa/Casablanca');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    alerts: true,
    reports: false
  });

  const handleSave = () => {
    // Save preferences logic here
    console.log('Saving preferences:', {
      difficultyLevel,
      language,
      timezone,
      notifications
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sliders className="h-6 w-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Préférences
          </h2>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <Save className="h-4 w-4" />
          <span>Sauvegarder</span>
        </button>
      </div>

      <p className="text-gray-600 dark:text-gray-400">
        Personnalisez votre expérience avec l'application selon vos préférences.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interface Preferences */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Interface utilisateur
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Niveau de difficulté
              </label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setDifficultyLevel('basic')}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    difficultyLevel === 'basic'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">Basique</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Interface simplifiée avec fonctionnalités essentielles
                  </p>
                </button>

                <button
                  onClick={() => setDifficultyLevel('intermediate')}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    difficultyLevel === 'intermediate'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">Moyen</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Fonctionnalités avancées avec aide contextuelle
                  </p>
                </button>

                <button
                  onClick={() => setDifficultyLevel('expert')}
                  className={`p-4 rounded-lg border-2 transition-colors text-left ${
                    difficultyLevel === 'expert'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <h4 className="font-medium text-gray-900 dark:text-white">Expert</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Toutes les fonctionnalités sans assistance
                  </p>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Langue
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="es">Español</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fuseau horaire
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="UTC">UTC (Temps universel coordonné)</option>
                <option value="Africa/Casablanca">Maroc (GMT+1)</option>
                <option value="Europe/Paris">France (GMT+1)</option>
                <option value="Europe/Madrid">Espagne (GMT+1)</option>
                <option value="Africa/Tunis">Tunisie (GMT+1)</option>
                <option value="Africa/Algiers">Algérie (GMT+1)</option>
              </select>
            </div>
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