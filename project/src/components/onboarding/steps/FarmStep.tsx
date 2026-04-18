import {  useState  } from "react";
import { MapPin, Ruler, Cloud, Droplets, ArrowRight, Sprout } from 'lucide-react';
import { OnboardingInput } from '../ui/OnboardingInput';
import { ButtonLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';

interface FarmData {
  name: string;
  location: string;
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
  const [subStep, setSubStep] = useState(0);

  const isValid = farmData.name.trim() && farmData.location.trim() && farmData.size > 0;

  // Sub-step 0: Farm name & location
  if (subStep === 0) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce-slow">
            <Sprout className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Créons votre première ferme
          </h2>
          <p className="text-gray-500">
            C'est ici que la magie commence !
          </p>
        </div>

        <div className="space-y-4">
          <OnboardingInput
            label="Nom de la ferme"
            value={farmData.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            autoFocus
            icon={<Sprout className="w-5 h-5" />}
            hint="Ex: Ferme El Haouzia, Domaine du Soleil"
          />

          <OnboardingInput
            label="Localisation"
            value={farmData.location}
            onChange={(e) => onUpdate({ location: e.target.value })}
            icon={<MapPin className="w-5 h-5" />}
            hint="Ex: Benslimane, Casablanca-Settat"
          />
        </div>

        <Button
          onClick={() => setSubStep(1)}
          disabled={!farmData.name.trim() || !farmData.location.trim()}
          className="mt-8 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold
            shadow-lg shadow-emerald-500/30 hover:shadow-xl
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300 hover:scale-[1.02]
            flex items-center justify-center gap-2"
        >
          Continuer
          <ArrowRight className="w-5 h-5" />
        </Button>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
          .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  // Sub-step 1: Farm size with visual representation
  if (subStep === 1) {
    const selectedUnit = SIZE_UNITS.find(u => u.id === farmData.size_unit) || SIZE_UNITS[0];
    const hectares = farmData.size / selectedUnit.factor;
    
    // Visual representation - number of football fields (1 hectare ≈ 1.5 football fields)
    const footballFields = Math.round(hectares * 1.5);

    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Ruler className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Quelle est la superficie ?
          </h2>
          <p className="text-gray-500">
            De "{farmData.name}"
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {SIZE_UNITS.map((unit) => (
              <Button
                key={unit.id}
                type="button"
                onClick={() => onUpdate({ size_unit: unit.id })}
                className={`
                  py-3 px-4 rounded-xl border-2 font-medium transition-all duration-200
                  ${farmData.size_unit === unit.id
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }
                `}
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

        {/* Visual size representation */}
        {farmData.size > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-sm text-emerald-800 mb-3">
              Cela représente environ:
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-3xl font-bold text-emerald-600">
                  {footballFields}
                </div>
                <div className="text-sm text-emerald-700">
                  terrains de football
                </div>
              </div>
              <div className="flex flex-wrap gap-1 max-w-[150px]">
                {Array.from({ length: Math.min(footballFields, 20) }).map((_, ffIdx) => (
                  <div
                    key={"ff-" + ffIdx}
                    className="w-4 h-3 bg-emerald-400 rounded-sm animate-scale-in"
                    style={{ animationDelay: `${ffIdx * 50}ms` }}
                  />
                ))}
                {footballFields > 20 && (
                  <span className="text-xs text-emerald-600">+{footballFields - 20}</span>
                )}
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={() => setSubStep(2)}
          disabled={!farmData.size || farmData.size <= 0}
          className="mt-8 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold
            shadow-lg shadow-emerald-500/30 hover:shadow-xl
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300 hover:scale-[1.02]
            flex items-center justify-center gap-2"
        >
          Continuer
          <ArrowRight className="w-5 h-5" />
        </Button>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scale-in {
            from { transform: scale(0); }
            to { transform: scale(1); }
          }
          .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
          .animate-scale-in { animation: scale-in 0.3s ease-out forwards; }
        `}</style>
      </div>
    );
  }

  // Sub-step 2: Soil type selection
  if (subStep === 2) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Droplets className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Quel type de sol ? (optionnel)
          </h2>
          <p className="text-gray-500">
            Pour des recommandations personnalisées
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SOIL_TYPES.map((soil) => (
            <Button
              key={soil.id}
              type="button"
              onClick={() => onUpdate({ soil_type: soil.id })}
              className={`
                p-4 rounded-xl border-2 text-left transition-all duration-200
                ${farmData.soil_type === soil.id
                  ? 'border-amber-500 bg-amber-50 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }
              `}
            >
              <div className="text-2xl mb-2">{soil.icon}</div>
              <div className="font-semibold text-gray-900">{soil.name}</div>
              <div className="text-xs text-gray-500 mt-1">{soil.description}</div>
            </Button>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => setSubStep(3)}
            className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-medium
              hover:bg-gray-200 transition-all duration-200"
          >
            Passer
          </Button>
          <Button
            onClick={() => setSubStep(3)}
            className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold
              shadow-lg shadow-emerald-500/30 hover:shadow-xl
              transition-all duration-300 hover:scale-[1.02]
              flex items-center justify-center gap-2"
          >
            Continuer
            <ArrowRight className="w-5 h-5" />
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
  }

  // Sub-step 3: Climate zone selection
  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-sky-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Cloud className="w-8 h-8 text-sky-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Zone climatique (optionnel)
        </h2>
        <p className="text-gray-500">
          Pour des alertes météo adaptées
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CLIMATE_ZONES.map((climate) => (
          <Button
            key={climate.id}
            type="button"
            onClick={() => onUpdate({ climate_zone: climate.id })}
            className={`
              p-4 rounded-xl border-2 text-left transition-all duration-200
              ${farmData.climate_zone === climate.id
                ? 'border-sky-500 bg-sky-50 shadow-lg'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }
            `}
          >
            <div className="text-2xl mb-2">{climate.icon}</div>
            <div className="font-semibold text-gray-900">{climate.name}</div>
            <div className="text-xs text-gray-500 mt-1">{climate.description}</div>
          </Button>
        ))}
      </div>

      <Button
        onClick={onNext}
        disabled={!isValid || isLoading}
        className="mt-8 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold
          shadow-lg shadow-emerald-500/30 hover:shadow-xl
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-300 hover:scale-[1.02]
          flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <ButtonLoader className="h-5 w-5 text-white" />
            <span>Enregistrement...</span>
          </>
        ) : (
          <>
            Étape suivante
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </Button>

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

export default FarmStep;
