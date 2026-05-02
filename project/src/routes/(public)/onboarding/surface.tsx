import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OnbHeader, OnbShellLayout } from '@/components/onboarding-v2/chrome';
import { SurfaceScreen, type SurfaceUnit } from '@/components/onboarding-v2/SurfaceScreen';
import { onboardingApi } from '@/lib/api/onboarding';
import { useOnboardingStore } from '@/stores/onboardingStore';

export const Route = createFileRoute('/(public)/onboarding/surface')({
  component: SurfaceStepRoute,
});

const UI_TO_DB: Record<SurfaceUnit, string> = {
  ha: 'hectares',
  acre: 'acres',
  m2: 'm2',
};
const DB_TO_UI = (dbUnit: string): SurfaceUnit => {
  if (dbUnit === 'acres') return 'acre';
  if (dbUnit === 'm2') return 'm2';
  return 'ha';
};

function SurfaceStepRoute() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const farmData = useOnboardingStore((s) => s.farmData);
  const organizationData = useOnboardingStore((s) => s.organizationData);
  const existingFarmId = useOnboardingStore((s) => s.existingFarmId);
  const updateFarmData = useOnboardingStore((s) => s.updateFarmData);
  const setCurrentStep = useOnboardingStore((s) => s.setCurrentStep);
  const persistState = useOnboardingStore((s) => s.persistState);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const data = {
    surface: farmData.size ? String(farmData.size) : '',
    unit: DB_TO_UI(farmData.size_unit || 'hectares'),
    farmName: organizationData.name || farmData.name || 'Mon exploitation',
  };

  const handleChange = (patch: Partial<typeof data>) => {
    if (patch.surface !== undefined) updateFarmData({ size: parseFloat(patch.surface) || 0 });
    if (patch.unit !== undefined) updateFarmData({ size_unit: UI_TO_DB[patch.unit] });
  };

  const handleNext = useCallback(async () => {
    if (loading) return;
    const effectiveSize = farmData.size && farmData.size > 0 ? farmData.size : 0;
    if (effectiveSize <= 0) {
      setError(t('onboarding.surfaceRequired', 'Veuillez saisir une superficie supérieure à zéro.'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onboardingApi.saveFarm(
        {
          name: organizationData.name || farmData.name,
          location: organizationData.city || farmData.location || '',
          size: effectiveSize,
          size_unit: farmData.size_unit || 'hectares',
          farm_type: 'main',
          description: '',
        },
        existingFarmId || undefined,
      );
      await persistState({ currentStep: 5 });
      setCurrentStep(5);
      navigate({ to: '/onboarding/select-trial' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('onboarding.errorGeneric', 'Une erreur est survenue'));
    } finally {
      setLoading(false);
    }
  }, [loading, organizationData, farmData, existingFarmId, persistState, setCurrentStep, navigate, t]);

  const handleBack = useCallback(() => {
    navigate({ to: '/onboarding/farm' });
  }, [navigate]);

  return (
    <OnbShellLayout header={<OnbHeader step={4} total={5} />}>
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}
      <SurfaceScreen data={data} onChange={handleChange} onNext={handleNext} onBack={handleBack} loading={loading} />
    </OnbShellLayout>
  );
}
