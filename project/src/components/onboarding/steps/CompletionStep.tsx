import React, { useState } from 'react';
import { Rocket, Settings, Bell, Database, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { SelectionCard } from '../ui/SelectionCard';
import { Button } from '@/components/ui/button';

interface Preferences {
  currency: string;
  date_format: string;
  use_demo_data: boolean;
  enable_notifications: boolean;
}

interface CompletionStepProps {
  preferences: Preferences;
  profileName: string;
  organizationName: string;
  farmName: string;
  selectedModulesCount: number;
  onUpdate: (data: Partial<Preferences>) => void;
  onComplete: () => void;
  isLoading: boolean;
}

const CURRENCIES = [
  { id: 'MAD', name: 'Dirham Marocain', symbol: 'د.م.' },
  { id: 'EUR', name: 'Euro', symbol: '€' },
  { id: 'USD', name: 'Dollar US', symbol: '$' },
];

const DATE_FORMATS = [
  { id: 'DD/MM/YYYY', name: '31/12/2024', description: 'Format européen' },
  { id: 'MM/DD/YYYY', name: '12/31/2024', description: 'Format américain' },
  { id: 'YYYY-MM-DD', name: '2024-12-31', description: 'Format ISO' },
];

export const CompletionStep: React.FC<CompletionStepProps> = ({
  preferences,
  profileName,
  organizationName,
  farmName,
  selectedModulesCount,
  onUpdate,
  onComplete,
  isLoading,
}) => {
  const [showPreferences, setShowPreferences] = useState(false);

  if (!showPreferences) {
    // Summary view before launch
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full animate-pulse" />
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <Rocket className="w-8 h-8 text-emerald-600" />
            </div>
            {/* Orbiting sparkles */}
            <div className="absolute inset-0 animate-spin-slow">
              <Sparkles className="absolute -top-1 left-1/2 w-4 h-4 text-amber-400" />
              <Sparkles className="absolute top-1/2 -right-1 w-3 h-3 text-sky-400" />
              <Sparkles className="absolute -bottom-1 left-1/4 w-4 h-4 text-pink-400" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Prêt pour le décollage !
          </h2>
          <p className="text-gray-500">
            Voici un résumé de votre configuration
          </p>
        </div>

        {/* Summary cards */}
        <div className="space-y-3 mb-8">
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-emerald-900">Profil créé</div>
              <div className="text-sm text-emerald-700">{profileName}</div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-blue-900">Organisation configurée</div>
              <div className="text-sm text-blue-700">{organizationName}</div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl border border-amber-200 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-amber-900">Ferme prête</div>
              <div className="text-sm text-amber-700">{farmName}</div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-violet-50 to-violet-100 rounded-xl border border-violet-200 flex items-center gap-4">
            <div className="w-10 h-10 bg-violet-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-violet-900">Modules activés</div>
              <div className="text-sm text-violet-700">{selectedModulesCount} super-pouvoirs</div>
            </div>
          </div>
        </div>

        {/* Preferences toggle */}
        <Button
          onClick={() => setShowPreferences(true)}
          className="w-full p-4 mb-6 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700">Personnaliser les préférences</span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </Button>

        {/* Launch button */}
        <Button
          onClick={onComplete}
          disabled={isLoading}
          className="w-full py-5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white rounded-2xl font-bold text-lg
            shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40
            disabled:opacity-70 disabled:cursor-not-allowed
            transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
            flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Lancement en cours...
            </>
          ) : (
            <>
              <Rocket className="w-6 h-6" />
              Lancer mon tableau de bord
            </>
          )}
        </Button>

        <p className="mt-4 text-center text-sm text-gray-500">
          3... 2... 1... C'est parti !
        </p>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
          .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        `}</style>
      </div>
    );
  }

  // Preferences view
  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-gray-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Préférences système
        </h2>
        <p className="text-gray-500">
          Ajustez selon vos besoins
        </p>
      </div>

      <div className="space-y-6">
        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map((currency) => (
              <Button
                key={currency.id}
                type="button"
                onClick={() => onUpdate({ currency: currency.id })}
                className={`
                  py-3 px-4 rounded-xl border-2 text-center transition-all duration-200
                  ${preferences.currency === currency.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="text-lg font-bold">{currency.symbol}</div>
                <div className="text-xs text-gray-500">{currency.id}</div>
              </Button>
            ))}
          </div>
        </div>

        {/* Date format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Format de date</label>
          <div className="space-y-2">
            {DATE_FORMATS.map((format) => (
              <Button
                key={format.id}
                type="button"
                onClick={() => onUpdate({ date_format: format.id })}
                className={`
                  w-full p-3 rounded-xl border-2 text-left flex items-center justify-between transition-all duration-200
                  ${preferences.date_format === format.id
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div>
                  <div className="font-medium">{format.name}</div>
                  <div className="text-xs text-gray-500">{format.description}</div>
                </div>
                {preferences.date_format === format.id && (
                  <Check className="w-5 h-5 text-emerald-500" />
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <SelectionCard
            title="Données de démonstration"
            description="Pré-remplir avec des exemples pour découvrir"
            icon={<Database className="w-5 h-5" />}
            selected={preferences.use_demo_data}
            onClick={() => onUpdate({ use_demo_data: !preferences.use_demo_data })}
          />
          
          <SelectionCard
            title="Notifications"
            description="Recevoir les alertes importantes par email"
            icon={<Bell className="w-5 h-5" />}
            selected={preferences.enable_notifications}
            onClick={() => onUpdate({ enable_notifications: !preferences.enable_notifications })}
          />
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Button
          onClick={() => setShowPreferences(false)}
          className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-medium
            hover:bg-gray-200 transition-all duration-200"
        >
          Retour
        </Button>
        <Button
          onClick={onComplete}
          disabled={isLoading}
          className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold
            shadow-lg shadow-emerald-500/30 hover:shadow-xl
            disabled:opacity-70 disabled:cursor-not-allowed
            transition-all duration-300 hover:scale-[1.02]
            flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Lancement...
            </>
          ) : (
            <>
              Terminer
              <Rocket className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default CompletionStep;
