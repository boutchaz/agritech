import { useState } from 'react';
import { Ruler, Cloud, Droplets, ArrowRight, Sprout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OnboardingInput } from '../ui/OnboardingInput';
import { FarmLocationPicker } from '../ui/FarmLocationPicker';
import { ButtonLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { useOnboardingStore } from '@/stores/onboardingStore';

interface FarmData {
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  size: number;
  size_unit: string;
  soil_type?: string;
  climate_zone?: string;
  description: string;
}

interface FarmStepProps {
  farmData: FarmData;
  onUpdate: (data: Partial<FarmData>) => void;
  onNext: () => void;
  isLoading?: boolean;
}

const SOIL_TYPES = [
  { id: 'clay', name: 'Argileux', icon: '🏺', description: 'Riche en nutriments, retient l\'eau' },
  { id: 'sandy', name: 'Sableux', icon: '🏖️', description: 'Drainage rapide, chauffe vite' },
  { id: 'loam', name: 'Limoneux', icon: '🌱', description: 'Équilibré, idéal pour la plupart des cultures' },
  { id: 'silt', name: 'Limon', icon: '💧', description: 'Fertile, retient bien l\'humidité' },
  { id: 'peat', name: 'Tourbeux', icon: '🌿', description: 'Acide, riche en matière organique' },
  { id: 'chalk', name: 'Calcaire', icon: '⚪', description: 'Alcalin, bien drainé' },
];

const CLIMATE_ZONES = [
  { id: 'mediterranean', name: 'Méditerranéen', icon: '☀️', description: 'Étés chauds et secs' },
  { id: 'continental', name: 'Continental', icon: '❄️', description: 'Hivers froids, étés chauds' },
  { id: 'oceanic', name: 'Océanique', icon: '🌊', description: 'Températures modérées' },
  { id: 'subtropical', name: 'Subtropical', icon: '🌴', description: 'Chaud et humide' },
  { id: 'arid', name: 'Aride', icon: '🏜️', description: 'Très sec, peu de pluie' },
  { id: 'semi-arid', name: 'Semi-aride', icon: '🌵', description: 'Pluies saisonnières' },
];

const SIZE_UNITS = [
  { id: 'hectares', name: 'Hectares', factor: 1 },
  { id: 'acres', name: 'Acres', factor: 2.471 },
  { id: 'm2', name: 'Mètres²', factor: 10000 },
];

export const FarmStep = ({
  farmData,
  onUpdate,
  onNext,
  isLoading = false,
}: FarmStepProps) => {
  const { t } = useTranslation();
  const orgCountry = useOnboardingStore((s) => s.organizationData.country);
  const [subStep, setSubStep] = useState(0);

  const hasLocationPoint =
    typeof farmData.latitude === 'number' &&
    typeof farmData.longitude === 'number' &&
    Number.isFinite(farmData.latitude) &&
    Number.isFinite(farmData.longitude);

  const isValid =
    Boolean(farmData.name.trim() && farmData.location.trim() && hasLocationPoint) && farmData.size > 0;

  if (subStep === 0) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Sprout className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
            Créons votre première ferme
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            C'est ici que la magie commence !
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <OnboardingInput
            label="Nom de la ferme"
            value={farmData.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            autoFocus
            icon={<Sprout className="w-5 h-5" />}
            hint="Ex: Ferme El Haouzia, Domaine du Soleil"
          />
          <FarmLocationPicker
            countryCode={orgCountry}
            value={{
              location: farmData.location,
              latitude: farmData.latitude,
              longitude: farmData.longitude,
              place_id: farmData.place_id,
            }}
            onChange={(next) =>
              onUpdate({
                location: next.location,
                latitude: next.latitude,
                longitude: next.longitude,
                place_id: next.place_id,
              })
            }
          />
        </div>

        <Button
          type="button"
          variant="emerald"
          onClick={() => setSubStep(1)}
          disabled={!farmData.name.trim() || !hasLocationPoint}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg font-medium text-sm shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
        >
          {t('onboarding.welcome.continue', 'Continue')}
          <ArrowRight className="w-4 h-4" />
        </Button>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        `}</style>
      </div>
    );
  }

  if (subStep === 1) {
    const selectedUnit = SIZE_UNITS.find(u => u.id === farmData.size_unit) || SIZE_UNITS[0];
    const hectares = farmData.size / selectedUnit.factor;
    const footballFields = Math.round(hectares * 1.5);

    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Ruler className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
            Quelle est la superficie ?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            De "{farmData.name}"
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div className="flex gap-2">
            {SIZE_UNITS.map((unit) => (
              <Button
                key={unit.id}
                type="button"
                onClick={() => onUpdate({ size_unit: unit.id })}
                className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all duration-200
                  ${farmData.size_unit === unit.id
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
              >
                {unit.name}
              </Button>
            ))}
          </div>

          <OnboardingInput
            label={`Superficie en ${selectedUnit.name.toLowerCase()}`}
            type="number"
            value={farmData.size || ''}
            onChange={(e) => onUpdate({ size: parseFloat(e.target.value) || 0 })}
            icon={<Ruler className="w-5 h-5" />}
          />
        </div>

        {farmData.size > 0 && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Cela représente environ:
            </p>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {footballFields}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  terrains de football
                </div>
              </div>
              <div className="flex flex-wrap gap-1 max-w-[120px]">
                {Array.from({ length: Math.min(footballFields, 20) }).map((_, ffIdx) => (
                  <div
                    key={"ff-" + ffIdx}
                    className="w-3 h-2.5 bg-emerald-500/40 dark:bg-emerald-500/30 rounded-sm animate-scale-in"
                    style={{ animationDelay: `${ffIdx * 50}ms` }}
                  />
                ))}
                {footballFields > 20 && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">+{footballFields - 20}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={() => setSubStep(2)}
          disabled={!farmData.size || farmData.size <= 0}
          className="mt-6 w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm
            shadow-sm hover:shadow-md
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200 active:scale-[0.98]
            flex items-center justify-center gap-2"
        >
          Continuer
          <ArrowRight className="w-4 h-4" />
        </Button>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scale-in {
            from { transform: scale(0); }
            to { transform: scale(1); }
          }
          .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
          .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
        `}</style>
      </div>
    );
  }

  if (subStep === 2) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Droplets className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
            Quel type de sol ? (optionnel)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pour des recommandations personnalisées
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SOIL_TYPES.map((soil) => (
            <Button
              key={soil.id}
              type="button"
              onClick={() => onUpdate({ soil_type: soil.id })}
              className={`p-3 rounded-lg border text-left transition-all duration-200 h-auto
                ${farmData.soil_type === soil.id
                  ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800 shadow-sm'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
            >
              <div className="text-lg mb-1">{soil.icon}</div>
              <div className="font-medium text-slate-900 dark:text-white text-sm">{soil.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{soil.description}</div>
            </Button>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            onClick={() => setSubStep(3)}
            className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-medium text-sm
              hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
          >
            Passer
          </Button>
          <Button
            onClick={() => setSubStep(3)}
            className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm
              shadow-sm hover:shadow-md
              transition-all duration-200 active:scale-[0.98]
              flex items-center justify-center gap-2"
          >
            Continuer
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Cloud className="w-6 h-6 text-slate-600 dark:text-slate-300" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
          Zone climatique (optionnel)
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pour des alertes météo adaptées
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {CLIMATE_ZONES.map((climate) => (
          <Button
            key={climate.id}
            type="button"
            onClick={() => onUpdate({ climate_zone: climate.id })}
            className={`p-3 rounded-lg border text-left transition-all duration-200 h-auto
              ${farmData.climate_zone === climate.id
                ? 'border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800 shadow-sm'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
          >
            <div className="text-lg mb-1">{climate.icon}</div>
            <div className="font-medium text-slate-900 dark:text-white text-sm">{climate.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{climate.description}</div>
          </Button>
        ))}
      </div>

      <Button
        onClick={onNext}
        disabled={!isValid || isLoading}
        className="mt-6 w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm
          shadow-sm hover:shadow-md
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-all duration-200 active:scale-[0.98]
          flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <ButtonLoader className="h-4 w-4 text-white" />
            <span>Enregistrement...</span>
          </>
        ) : (
          <>
            Étape suivante
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default FarmStep;
