import React, { useState, useEffect, useCallback } from 'react';
import {
  Building,
  Users,
  MapPin,
  Check,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { useOnboardingBackendPersistence, OnboardingState } from '../hooks/useOnboardingBackendPersistence';
import { Loader2 } from 'lucide-react';
import { onboardingApi } from '@/lib/api/onboarding';

type ModuleSelection = OnboardingState['moduleSelection'];

interface EnhancedOnboardingFlowProps {
  user: any;
  onComplete: () => void;
}

const AVAILABLE_MODULES = [
  {
    id: 'farm_management',
    name: 'Gestion de Ferme',
    description: 'Gérez vos fermes, parcelles et cultures',
    icon: MapPin,
    color: 'emerald'
  },
  {
    id: 'inventory',
    name: 'Gestion de Stock',
    description: 'Suivez votre inventaire et vos entrepôts',
    icon: Package,
    color: 'blue'
  },
  {
    id: 'sales',
    name: 'Ventes',
    description: 'Gestion des devis, commandes et factures',
    icon: ShoppingCart,
    color: 'purple'
  },
  {
    id: 'procurement',
    name: 'Achats',
    description: 'Gérez vos fournisseurs et achats',
    icon: ShoppingCart,
    color: 'orange'
  },
  {
    id: 'accounting',
    name: 'Comptabilité',
    description: 'Plan comptable et gestion financière',
    icon: BarChart3,
    color: 'indigo'
  },
  {
    id: 'hr',
    name: 'Ressources Humaines',
    description: 'Gestion des employés et tâches',
    icon: Users,
    color: 'pink'
  },
  {
    id: 'analytics',
    name: 'Analyses & Satellite',
    description: 'Analyses de santé des cultures via satellite',
    icon: BarChart3,
    color: 'cyan'
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Vendez vos produits sur la marketplace',
    icon: Building,
    color: 'green'
  }
];

const TIMEZONES = [
  { value: 'Africa/Casablanca', label: 'Morocco (Africa/Casablanca)' },
  { value: 'Europe/Paris', label: 'Paris (Europe/Paris)' },
  { value: 'Europe/London', label: 'London (Europe/London)' },
  { value: 'America/New_York', label: 'New York (America/New_York)' },
  { value: 'UTC', label: 'UTC' }
];

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' }
];

const CURRENCIES = [
  { value: 'MAD', label: 'Dirham Marocain (MAD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'US Dollar (USD)' }
];

const EnhancedOnboardingFlow: React.FC<EnhancedOnboardingFlowProps> = ({ user, onComplete }) => {
  const {
    state,
    isRestored,
    isSaving,
    saveError,
    clearState,
    updateProfileData,
    updateOrganizationData,
    updateFarmData,
    updateModuleSelection,
    updatePreferences,
    setCurrentStep,
    setExistingOrgId
  } = useOnboardingBackendPersistence(user?.id, user?.email);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  const { 
    currentStep, 
    profileData, 
    organizationData, 
    farmData, 
    moduleSelection, 
    preferences,
    existingOrgId 
  } = state;

  // Show resume prompt if user has saved progress
  useEffect(() => {
    if (isRestored && currentStep > 1) {
      setShowResumePrompt(true);
    }
  }, [isRestored, currentStep]);

  // Auto-generate slug from organization name
  useEffect(() => {
    if (organizationData.name) {
      const slug = organizationData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (slug !== organizationData.slug) {
        updateOrganizationData({ slug });
      }
    }
  }, [organizationData.name, organizationData.slug, updateOrganizationData]);

  // Prevent React Query refetch on visibility change during onboarding
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible - don't trigger any refetch
        // The persisted state should be sufficient
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleStartOver = () => {
    clearState();
    setShowResumePrompt(false);
  };

  const handleContinue = () => {
    setShowResumePrompt(false);
  };

  const handleNext = async () => {
    setError(null);
    setLoading(true);

    try {
      if (currentStep === 1) {
        await saveProfile();
        setCurrentStep(2);
      } else if (currentStep === 2) {
        await saveOrganization();
        setCurrentStep(3);
      } else if (currentStep === 3) {
        await saveFarm();
        setCurrentStep(4);
      } else if (currentStep === 4) {
        await saveModules();
        setCurrentStep(5);
      } else if (currentStep === 5) {
        // savePreferencesAndComplete already calls completeOnboarding internally
        await savePreferences();
        // Note: completeOnboarding is called inside savePreferencesAndComplete
        // but we need to clear state and call onComplete
        clearState();
        onComplete();
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    await onboardingApi.saveProfile(profileData);
  };

  const saveOrganization = async () => {
    const result = await onboardingApi.saveOrganization(organizationData, existingOrgId || undefined);
    if (result.id && !existingOrgId) {
      setExistingOrgId(result.id);
    }
  };

  const saveFarm = async () => {
    await onboardingApi.saveFarm(farmData);
  };

  const saveModules = async () => {
    await onboardingApi.saveModules(moduleSelection);
  };

  const savePreferences = async () => {
    await onboardingApi.savePreferencesAndComplete(preferences);
  };

  const completeOnboarding = async () => {
    // Already called in savePreferencesAndComplete
    clearState();
    onComplete();
  };

  const toggleModule = (moduleId: string) => {
    const key = moduleId as keyof typeof moduleSelection;
    updateModuleSelection({ [key]: !moduleSelection[key] });
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4, 5].map((step) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold
                ${currentStep > step ? 'bg-emerald-600 text-white' :
                  currentStep === step ? 'bg-emerald-600 text-white' :
                  'bg-gray-200 text-gray-600'}
              `}>
                {currentStep > step ? <Check className="h-5 w-5" /> : step}
              </div>
              <span className="text-xs mt-2 text-center text-gray-600">
                {step === 1 ? 'Profil' :
                 step === 2 ? 'Organisation' :
                 step === 3 ? 'Ferme' :
                 step === 4 ? 'Modules' :
                 'Préférences'}
              </span>
            </div>
            {step < 5 && (
              <div className={`flex-1 h-1 mx-2 ${currentStep > step ? 'bg-emerald-600' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Bienvenue sur AgriTech!</h2>
        <p className="text-gray-600">Commençons par créer votre profil</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Prénom" required>
          <Input
            value={profileData.first_name}
            onChange={(e) => updateProfileData({ first_name: e.target.value })}
            placeholder="Votre prénom"
          />
        </FormField>

        <FormField label="Nom" required>
          <Input
            value={profileData.last_name}
            onChange={(e) => updateProfileData({ last_name: e.target.value })}
            placeholder="Votre nom"
          />
        </FormField>
      </div>

      <FormField label="Téléphone">
        <Input
          type="tel"
          value={profileData.phone}
          onChange={(e) => updateProfileData({ phone: e.target.value })}
          placeholder="+212 6XX XXX XXX"
        />
      </FormField>

      <FormField label="Langue" required>
        <Select
          value={profileData.language}
          onChange={(e) => updateProfileData({ language: e.target.value })}
        >
          {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </Select>
      </FormField>

      <FormField label="Fuseau horaire" required>
        <Select
          value={profileData.timezone}
          onChange={(e) => updateProfileData({ timezone: e.target.value })}
        >
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </Select>
      </FormField>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Building className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Votre Organisation</h2>
        <p className="text-gray-600">Informations sur votre exploitation ou entreprise</p>
      </div>

      <FormField label="Type de compte" required>
        <Select
          value={organizationData.account_type}
          onChange={(e) => updateOrganizationData({ account_type: e.target.value as any })}
        >
          <option value="individual">Particulier</option>
          <option value="farm">Exploitation Agricole</option>
          <option value="business">Entreprise</option>
        </Select>
      </FormField>

      <FormField label="Nom de l'organisation" required>
        <Input
          value={organizationData.name}
          onChange={(e) => updateOrganizationData({ name: e.target.value })}
          placeholder="Ex: Ferme El Haouzia"
        />
      </FormField>

      <FormField label="Identifiant unique (slug)" required>
        <Input
          value={organizationData.slug}
          onChange={(e) => updateOrganizationData({ slug: e.target.value })}
          placeholder="ferme-el-haouzia"
        />
        <p className="text-xs text-gray-500 mt-1">URL: agritech.ma/{organizationData.slug}</p>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Téléphone">
          <Input
            type="tel"
            value={organizationData.phone}
            onChange={(e) => updateOrganizationData({ phone: e.target.value })}
            placeholder="+212 5XX XXX XXX"
          />
        </FormField>

        <FormField label="Email" required>
          <Input
            type="email"
            value={organizationData.email}
            onChange={(e) => updateOrganizationData({ email: e.target.value })}
            placeholder="contact@ferme.ma"
          />
        </FormField>
      </div>

      <FormField label="Adresse">
        <Input
          value={organizationData.address || ''}
          onChange={(e) => updateOrganizationData({ address: e.target.value })}
          placeholder="Adresse complète"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Ville">
          <Input
            value={organizationData.city || ''}
            onChange={(e) => updateOrganizationData({ city: e.target.value })}
            placeholder="Ex: Casablanca"
          />
        </FormField>

        <FormField label="Pays" required>
          <Select
            value={organizationData.country}
            onChange={(e) => updateOrganizationData({ country: e.target.value })}
          >
            <option value="MA">Maroc</option>
            <option value="FR">France</option>
            <option value="ES">Espagne</option>
          </Select>
        </FormField>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <MapPin className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Votre Première Ferme</h2>
        <p className="text-gray-600">Créez votre ferme principale pour commencer</p>
      </div>

      <FormField label="Nom de la ferme" required>
        <Input
          value={farmData.name}
          onChange={(e) => updateFarmData({ name: e.target.value })}
          placeholder="Ex: Ferme Principale"
        />
      </FormField>

      <FormField label="Localisation" required>
        <Input
          value={farmData.location}
          onChange={(e) => updateFarmData({ location: e.target.value })}
          placeholder="Ex: Benslimane, Casablanca-Settat"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Superficie" required>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={farmData.size || ''}
            onChange={(e) => updateFarmData({ size: parseFloat(e.target.value) || 0 })}
            placeholder="0"
          />
        </FormField>

        <FormField label="Unité" required>
          <Select
            value={farmData.size_unit}
            onChange={(e) => updateFarmData({ size_unit: e.target.value })}
          >
            <option value="hectares">Hectares</option>
            <option value="acres">Acres</option>
            <option value="m2">Mètres carrés</option>
          </Select>
        </FormField>
      </div>

      <FormField label="Type de sol">
        <Select
          value={farmData.soil_type || ''}
          onChange={(e) => updateFarmData({ soil_type: e.target.value })}
        >
          <option value="">Sélectionner...</option>
          <option value="clay">Argileux</option>
          <option value="sandy">Sableux</option>
          <option value="loam">Limoneux</option>
          <option value="silt">Limon</option>
          <option value="peat">Tourbeux</option>
          <option value="chalk">Calcaire</option>
        </Select>
      </FormField>

      <FormField label="Zone climatique">
        <Select
          value={farmData.climate_zone || ''}
          onChange={(e) => updateFarmData({ climate_zone: e.target.value })}
        >
          <option value="">Sélectionner...</option>
          <option value="mediterranean">Méditerranéen</option>
          <option value="continental">Continental</option>
          <option value="oceanic">Océanique</option>
          <option value="subtropical">Subtropical</option>
          <option value="arid">Aride</option>
          <option value="semi-arid">Semi-aride</option>
        </Select>
      </FormField>

      <FormField label="Description">
        <Textarea
          value={farmData.description}
          onChange={(e) => updateFarmData({ description: e.target.value })}
          rows={3}
          placeholder="Description de votre ferme..."
        />
      </FormField>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Sparkles className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Choisissez vos Modules</h2>
        <p className="text-gray-600">Sélectionnez les fonctionnalités dont vous avez besoin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AVAILABLE_MODULES.map((module) => {
          const Icon = module.icon;
          const isSelected = moduleSelection[module.id as keyof ModuleSelection];

          return (
            <button
              key={module.id}
              type="button"
              onClick={() => toggleModule(module.id)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${isSelected
                  ? `border-${module.color}-500 bg-${module.color}-50`
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`
                    p-2 rounded-lg
                    ${isSelected ? `bg-${module.color}-100` : 'bg-gray-100'}
                  `}>
                    <Icon className={`h-6 w-6 ${isSelected ? `text-${module.color}-600` : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{module.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                  </div>
                </div>
                <div className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center
                  ${isSelected ? `border-${module.color}-500 bg-${module.color}-500` : 'border-gray-300'}
                `}>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Conseil:</strong> Vous pourrez activer/désactiver ces modules à tout moment depuis les paramètres.
        </p>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Settings className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Préférences</h2>
        <p className="text-gray-600">Configurez vos préférences système</p>
      </div>

      <FormField label="Devise" required>
        <Select
          value={preferences.currency}
          onChange={(e) => updatePreferences({ currency: e.target.value })}
        >
          {CURRENCIES.map(curr => (
            <option key={curr.value} value={curr.value}>{curr.label}</option>
          ))}
        </Select>
      </FormField>

      <FormField label="Format de date" required>
        <Select
          value={preferences.date_format}
          onChange={(e) => updatePreferences({ date_format: e.target.value })}
        >
          <option value="DD/MM/YYYY">JJ/MM/AAAA</option>
          <option value="MM/DD/YYYY">MM/JJ/AAAA</option>
          <option value="YYYY-MM-DD">AAAA-MM-JJ</option>
        </Select>
      </FormField>

      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Données de démonstration</h3>
            <p className="text-sm text-gray-600">Pré-remplir avec des données d'exemple</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.use_demo_data}
            onChange={(e) => updatePreferences({ use_demo_data: e.target.checked })}
            className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <p className="text-sm text-gray-600">Recevoir les notifications par email</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.enable_notifications}
            onChange={(e) => updatePreferences({ enable_notifications: e.target.checked })}
            className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p className="text-sm text-emerald-800">
          <strong>Presque terminé!</strong> Cliquez sur "Terminer" pour accéder à votre tableau de bord.
        </p>
      </div>
    </div>
  );

  if (!isRestored) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8">
        {renderStepIndicator()}

        {saveError && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              ⚠️ Saving failed: {saveError}. Your changes are saved locally.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {showResumePrompt && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800">Reprendre votre inscription?</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Vous avez une inscription en cours (Étape {currentStep}/5). Voulez-vous continuer?
                </p>
                <div className="flex gap-3 mt-3">
                  <button 
                    onClick={handleContinue} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    Continuer
                  </button>
                  <button 
                    onClick={handleStartOver} 
                    className="px-4 py-2 bg-white text-blue-700 border border-blue-300 rounded-lg text-sm font-medium hover:bg-blue-50 transition"
                  >
                    Recommencer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}

        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-2 text-gray-700 hover:text-gray-900 font-semibold"
              disabled={loading}
            >
              ← Précédent
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={loading || isSaving ||
              (currentStep === 1 && (!profileData.first_name || !profileData.last_name)) ||
              (currentStep === 2 && (!organizationData.name || !organizationData.email)) ||
              (currentStep === 3 && (!farmData.name || !farmData.location || !farmData.size))
            }
            className={`
              ml-auto flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition
              ${(loading || isSaving) ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}
              text-white disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {(loading || isSaving) && <Loader2 className="h-5 w-5 animate-spin" />}
            <span>{currentStep === 5 ? 'Terminer' : 'Suivant'}</span>
            {currentStep < 5 && !isSaving && !loading && <ChevronRight className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedOnboardingFlow;
