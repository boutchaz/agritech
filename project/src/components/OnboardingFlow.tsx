import {  useState, useEffect  } from "react";
import { usersApi } from '@/lib/api/users';
import { onboardingApi } from '@/lib/api/onboarding';
import { farmsApi } from '@/lib/api/farms';
import { farmRolesApi } from '@/lib/api/farm-roles';
import { demoDataApi } from '@/lib/api/demo-data';
import { useTranslation } from 'react-i18next';
import { Building, Users, MapPin, Check, Database } from 'lucide-react';
import { FormField } from './ui/FormField';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { SectionLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';

interface OnboardingFlowProps {
  user: { id: string; email?: string };
  onComplete: () => void;
}

interface OrganizationData {
  name: string;
  slug: string;
  phone: string;
  email: string;
  account_type: 'individual' | 'business' | 'farm';
  country: string;
  address?: string;
  city?: string;
}

interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  timezone: string;
  language: string;
}

interface FarmData {
  name: string;
  location: string;
  size: number;
  size_unit: string;
  farm_type: 'main' | 'sub';
  description: string;
}

const OnboardingFlow = ({ user, onComplete }: OnboardingFlowProps) => {
  const roundToTwoDecimals = (value: number): number => Number(value.toFixed(2));
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [seedingData, setSeedingData] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [existingOrgId, setExistingOrgId] = useState<string | null>(null);
  const [hasExistingProfile, setHasExistingProfile] = useState<boolean>(false);
  const [hasExistingOrg, setHasExistingOrg] = useState<boolean>(false);
  const [hasExistingFarms, setHasExistingFarms] = useState<boolean>(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    language: 'fr',
  });

  const [organizationData, setOrganizationData] = useState<OrganizationData>({
    name: '',
    slug: '',
    phone: '',
    email: user?.email || '',
    account_type: 'business',
    country: 'Morocco',
    address: '',
    city: '',
  });

  const [farmData, setFarmData] = useState<FarmData>({
    name: '',
    location: '',
    size: 0,
    size_unit: 'hectares',
    farm_type: 'main',
    description: ''
  });

  // Check for existing data on component mount
  useEffect(() => {
    const checkExistingData = async () => {
      setInitialLoading(true);
      let profileExists = false;
      let orgExists = false;
      let farmsExist = false;
      const completed: number[] = [];

      try {
        const profile = await usersApi.getMe().catch(() => null);

        if (profile && profile.first_name && profile.last_name) {
          profileExists = true;
          setHasExistingProfile(true);
          completed.push(1);
        }

        if (profile) {
          setProfileData({
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            phone: profile.phone || '',
            timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            language: profile.language || 'fr',
          });
        }

        const organizations = await usersApi.getMyOrganizations().catch(() => []);
        const primaryOrg = organizations[0];

        if (primaryOrg) {
          orgExists = true;
          setHasExistingOrg(true);
          setExistingOrgId(primaryOrg.id);
          completed.push(2);
          setOrganizationData({
            name: primaryOrg.name || '',
            slug: primaryOrg.slug || '',
            phone: primaryOrg.phone || '',
            email: primaryOrg.email || user?.email || '',
            account_type: 'business',
            country: primaryOrg.country || 'Morocco',
            address: primaryOrg.address || '',
            city: primaryOrg.city || '',
          });

          const farmsData = await farmsApi.getAll({}, primaryOrg.id).catch(() => []);

          if (farmsData && farmsData.length > 0) {
            farmsExist = true;
            setHasExistingFarms(true);
            completed.push(3);
          }
        }

        setCompletedSteps(completed);

        // Determine which step to show
        if (profileExists && orgExists && farmsExist) {
          // All steps completed - call onComplete to exit onboarding
          onComplete();
          return;
        } else if (profileExists && orgExists) {
          // Profile and org exist, go to farm step
          setCurrentStep(3);
        } else if (profileExists) {
          // Only profile exists, go to organization step
          setCurrentStep(2);
        } else {
          // Start from beginning
          setCurrentStep(1);
        }
      } catch (error) {
        console.error('Error checking existing data:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    checkExistingData();
  }, [user]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleOrganizationNameChange = (name: string) => {
    setOrganizationData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const validateStep = (step: number): boolean => {
    // If step is already completed, it's valid
    if (completedSteps.includes(step)) {
      return true;
    }

    switch (step) {
      case 1:
        return profileData.first_name.trim() !== '' && profileData.last_name.trim() !== '';
      case 2:
        return organizationData.name.trim() !== '' && organizationData.slug.trim() !== '';
      case 3:
        // If farms already exist, step is valid
        if (hasExistingFarms) return true;
        return farmData.name.trim() !== '' && farmData.location.trim() !== '' && farmData.size > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      setError(null);
    } else {
      setError(t('onboardingFlow.requiredFields'));
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError(null);
    }
  };

  const canSkipStep = (step: number): boolean => {
    return completedSteps.includes(step);
  };

  const handleComplete = async () => {
    if (!validateStep(3)) {
      setError(t('onboardingFlow.requiredFields'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let organizationId = existingOrgId;

      await onboardingApi.saveProfile({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        timezone: profileData.timezone,
        language: profileData.language,
      });

      if (!organizationId) {
        const { id: createdOrgId } = await onboardingApi.saveOrganization({
          name: organizationData.name,
          slug: organizationData.slug,
          phone: organizationData.phone,
          email: organizationData.email || user.email,
          account_type: organizationData.account_type,
          address: organizationData.address || undefined,
          city: organizationData.city || undefined,
          country: organizationData.country,
        });

        organizationId = createdOrgId;

        // Seed reference data (chart of accounts, units of measure, etc.)
        setSeedingData(true);
        try {
          await demoDataApi.seedDemoData(organizationId);
        } catch (seedError) {
          console.error('Failed to seed reference data:', seedError);
          // Continue with onboarding even if seeding fails
        } finally {
          setSeedingData(false);
        }

        const { id: createdFarmId } = await onboardingApi.saveFarm({
          name: farmData.name,
          location: farmData.location,
          size: farmData.size,
          size_unit: farmData.size_unit,
          farm_type: farmData.farm_type,
          description: farmData.description,
        });

        await farmRolesApi.assignRole(
          {
            farm_id: createdFarmId,
            user_id: user.id,
            role: 'main_manager',
            permissions: {},
          },
          organizationId,
        );
      } else if (!hasExistingFarms) {
        // Seed reference data for existing organization before creating farm
        setSeedingData(true);
        try {
          await demoDataApi.seedDemoData(organizationId);
        } catch (seedError) {
          console.error('Failed to seed reference data:', seedError);
          // Continue with onboarding even if seeding fails
        } finally {
          setSeedingData(false);
        }

        const { id: createdFarmId } = await onboardingApi.saveFarm({
          name: farmData.name,
          location: farmData.location,
          size: farmData.size,
          size_unit: farmData.size_unit,
          farm_type: farmData.farm_type,
          description: farmData.description,
        });

        try {
          await farmRolesApi.assignRole(
            {
              farm_id: createdFarmId,
              user_id: user.id,
              role: 'main_manager',
              permissions: {},
            },
            organizationId,
          );
        } catch (roleError) {
          console.error('Role assignment error:', roleError);
        }
      }

      onComplete();
    } catch (error: unknown) {
      console.error('Onboarding error:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Profil personnel', icon: Users },
    { number: 2, title: 'Organisation', icon: Building },
    { number: 3, title: 'Première ferme', icon: MapPin }
  ];

  // Show loading state while checking existing data
  if (initialLoading) {
    return <SectionLoader className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = completedSteps.includes(step.number) || currentStep > step.number;

              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted
                      ? 'bg-green-600 border-green-600 text-white'
                      : isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Step 1: Profile */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {hasExistingProfile ? 'Vérifiez votre profil' : 'Créez votre profil'}
              </h2>
              {hasExistingProfile && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">✓ Votre profil existe déjà. Vous pouvez passer à l'étape suivante.</p>
                </div>
              )}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Prénom *" htmlFor="onb_first_name" required>
                    <Input
                      id="onb_first_name"
                      type="text"
                      value={profileData.first_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="Jean"
                    />
                  </FormField>
                  <FormField label="Nom *" htmlFor="onb_last_name" required>
                    <Input
                      id="onb_last_name"
                      type="text"
                      value={profileData.last_name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Dupont"
                    />
                  </FormField>
                </div>
                <div>
                  <FormField label="Téléphone" htmlFor="onb_phone">
                    <Input
                      id="onb_phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+33 1 23 45 67 89"
                    />
                  </FormField>
                </div>
                <div>
                  <FormField label="Fuseau horaire" htmlFor="onb_timezone">
                    <Select
                      id="onb_timezone"
                      value={profileData.timezone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, timezone: (e.target as HTMLSelectElement).value }))}
                    >
                      <option value="UTC">UTC</option>
                      <option value="Europe/Paris">Europe/Paris</option>
                      <option value="Africa/Casablanca">Africa/Casablanca</option>
                      <option value="Africa/Tunis">Africa/Tunis</option>
                      <option value="Africa/Algiers">Africa/Algiers</option>
                    </Select>
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Organization */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {hasExistingOrg ? 'Votre organisation' : 'Créez votre organisation'}
              </h2>
              {hasExistingOrg && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">✓ Votre organisation existe déjà. Vous pouvez passer à l'étape suivante.</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <FormField label="Nom de l'organisation *" htmlFor="onb_org_name" required>
                    <Input
                      id="onb_org_name"
                      type="text"
                      value={organizationData.name}
                      onChange={(e) => handleOrganizationNameChange(e.target.value)}
                      placeholder="Ma Ferme AgroGina"
                      data-testid="onboarding-org-name"
                    />
                  </FormField>
                </div>
                <div>
                  <FormField label="Identifiant URL" htmlFor="onb_org_slug" helper={`Sera utilisé dans l'URL: agrogina.app/org/${organizationData.slug}`}>
                    <Input
                      id="onb_org_slug"
                      type="text"
                      value={organizationData.slug}
                      onChange={(e) => setOrganizationData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="ma-ferme-agrogina"
                    />
                  </FormField>
                  {/* helper moved into FormField */}
                  {/* <p className="text-xs text-gray-500 mt-1"> ... </p> */}
                </div>
                <div>
                  <FormField label="Téléphone" htmlFor="onb_org_phone">
                    <Input
                      id="onb_org_phone"
                      type="tel"
                      value={organizationData.phone}
                      onChange={(e) => setOrganizationData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+33 1 23 45 67 89"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Farm */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {hasExistingFarms ? 'Vos fermes' : 'Créez votre première ferme'}
              </h2>
              {hasExistingFarms && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-700">✓ Vous avez déjà des fermes. Vous pouvez passer à l'étape suivante.</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom de la ferme *
                  </label>
                  <input
                    type="text"
                    value={farmData.name}
                    onChange={(e) => setFarmData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={hasExistingFarms}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Ferme principale"
                    data-testid="onboarding-farm-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Localisation *
                  </label>
                  <input
                    type="text"
                    value={farmData.location}
                    onChange={(e) => setFarmData(prev => ({ ...prev, location: e.target.value }))}
                    disabled={hasExistingFarms}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Ville, Région, Pays"
                    data-testid="onboarding-farm-location"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Superficie *" htmlFor="onb_farm_size" required>
                    <Input
                      id="onb_farm_size"
                      type="number"
                      step="0.01"
                      value={farmData.size}
                      onChange={(e) => setFarmData(prev => ({ ...prev, size: roundToTwoDecimals(parseFloat(e.target.value) || 0) }))}
                      disabled={hasExistingFarms}
                      placeholder="0"
                      data-testid="onboarding-farm-size"
                    />
                  </FormField>
                  <FormField label="Unité" htmlFor="onb_farm_unit">
                    <Select
                      id="onb_farm_unit"
                      value={farmData.size_unit}
                      onChange={(e) => setFarmData(prev => ({ ...prev, size_unit: (e.target as HTMLSelectElement).value }))}
                      disabled={hasExistingFarms}
                    >
                      <option value="hectares">Hectares</option>
                      <option value="acres">Acres</option>
                      <option value="m2">Mètres carrés</option>
                    </Select>
                  </FormField>
                </div>
                <div>
                  <FormField label="Type de ferme" htmlFor="onb_farm_type">
                    <Select
                      id="onb_farm_type"
                      value={farmData.farm_type}
                      onChange={(e) => setFarmData(prev => ({ ...prev, farm_type: (e.target as HTMLSelectElement).value as 'main' | 'sub' }))}
                      disabled={hasExistingFarms}
                    >
                      <option value="main">Ferme principale</option>
                      <option value="sub">Sous-ferme</option>
                    </Select>
                  </FormField>
                  <p className="text-xs text-gray-500 mt-1">
                    {farmData.farm_type === 'main' 
                      ? 'Ferme principale - centre de gestion de votre organisation'
                      : 'Sous-ferme - dépendante d\'une ferme principale'
                    }
                  </p>
                </div>
                <div>
                  <FormField label="Description" htmlFor="onb_farm_desc">
                    <Textarea
                      id="onb_farm_desc"
                      value={farmData.description}
                      onChange={(e) => setFarmData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      disabled={hasExistingFarms}
                      placeholder="Description de votre ferme..."
                    />
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </Button>

            {currentStep < 3 ? (
              <Button variant="blue" type="button" onClick={handleNext} className="px-6 py-2 text-sm font-medium rounded-md" data-testid="onboarding-next-button" >
                {canSkipStep(currentStep) ? 'Continuer' : 'Suivant'}
              </Button>
            ) : (
              <Button variant="green" type="button" onClick={handleComplete} disabled={loading || seedingData} className="px-6 py-2 text-sm font-medium rounded-md disabled:cursor-not-allowed flex items-center gap-2" data-testid="onboarding-complete-button" >
                {seedingData ? (
                  <>
                    <Database className="w-4 h-4 animate-pulse" />
                    Préparation des données...
                  </>
                ) : loading ? (
                  'Création...'
                ) : (
                  'Terminer'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
