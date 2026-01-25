import React, { useEffect, useRef, useState } from 'react';
import { Building2, User, Briefcase, CheckCircle, ArrowRight, MapPin, Mail, Phone } from 'lucide-react';
import { OnboardingInput } from '../ui/OnboardingInput';
import { SelectionCard } from '../ui/SelectionCard';

interface OrganizationData {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country: string;
  account_type: 'individual' | 'farm' | 'business';
}

interface SlugCheckResult {
  available: boolean;
  suggestion?: string;
  error?: string;
}

interface OrganizationStepProps {
  organizationData: OrganizationData;
  existingOrgId: string | null;
  onUpdate: (data: Partial<OrganizationData>) => void;
  onCheckSlug: (slug: string) => Promise<SlugCheckResult>;
  onNext: () => void;
}

const ACCOUNT_TYPES = [
  {
    id: 'individual',
    name: 'Particulier',
    description: 'Petit producteur ou jardinier',
    icon: User,
    color: 'emerald',
  },
  {
    id: 'farm',
    name: 'Exploitation Agricole',
    description: 'Ferme professionnelle',
    icon: Building2,
    color: 'blue',
    badge: 'Populaire',
  },
  {
    id: 'business',
    name: 'Entreprise',
    description: 'Coopérative ou grande exploitation',
    icon: Briefcase,
    color: 'purple',
  },
];

const COUNTRIES = [
  { id: 'MA', name: 'Maroc', flag: '🇲🇦' },
  { id: 'FR', name: 'France', flag: '🇫🇷' },
  { id: 'ES', name: 'Espagne', flag: '🇪🇸' },
  { id: 'DZ', name: 'Algérie', flag: '🇩🇿' },
  { id: 'TN', name: 'Tunisie', flag: '🇹🇳' },
];

export const OrganizationStep: React.FC<OrganizationStepProps> = ({
  organizationData,
  existingOrgId,
  onUpdate,
  onCheckSlug,
  onNext,
}) => {
  const [subStep, setSubStep] = useState(0);
  const [slugCheck, setSlugCheck] = useState<SlugCheckResult | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const slugCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  // Auto-generate slug from name
  useEffect(() => {
    if (organizationData.name) {
      const slug = organizationData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (slug !== organizationData.slug) {
        onUpdate({ slug });
      }
    }
  }, [organizationData.name, organizationData.slug, onUpdate]);

  // Debounced slug check
  useEffect(() => {
    if (slugCheckTimeout.current) {
      clearTimeout(slugCheckTimeout.current);
    }

    const slug = organizationData.slug;
    if (!slug || slug.length < 3 || existingOrgId) {
      setSlugCheck(null);
      return;
    }

    setIsCheckingSlug(true);
    slugCheckTimeout.current = setTimeout(async () => {
      try {
        const result = await onCheckSlug(slug);
        setSlugCheck(result);
      } catch {
        setSlugCheck(null);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500);

    return () => {
      if (slugCheckTimeout.current) {
        clearTimeout(slugCheckTimeout.current);
      }
    };
  }, [organizationData.slug, existingOrgId, onCheckSlug]);

  const isValid = organizationData.name.trim() && 
    organizationData.email.trim() && 
    (existingOrgId || (slugCheck?.available ?? false));

  // Sub-step 0: Account type selection
  if (subStep === 0) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Quel type de compte ?
          </h2>
          <p className="text-gray-500">
            Nous adapterons les fonctionnalités à vos besoins
          </p>
        </div>

        <div className="space-y-3">
          {ACCOUNT_TYPES.map((type) => (
            <SelectionCard
              key={type.id}
              title={type.name}
              description={type.description}
              icon={<type.icon className="w-6 h-6" />}
              selected={organizationData.account_type === type.id}
              onClick={() => onUpdate({ account_type: type.id as OrganizationData['account_type'] })}
              color={type.color}
              badge={type.badge}
            />
          ))}
        </div>

        <button
          onClick={() => setSubStep(1)}
          className="mt-8 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold
            shadow-lg shadow-emerald-500/30 hover:shadow-xl
            transition-all duration-300 hover:scale-[1.02]
            flex items-center justify-center gap-2"
        >
          Continuer
          <ArrowRight className="w-5 h-5" />
        </button>

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

  // Sub-step 1: Organization name & slug
  if (subStep === 1) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Nommez votre {organizationData.account_type === 'farm' ? 'exploitation' : 'organisation'}
          </h2>
          <p className="text-gray-500">
            Ce nom apparaîtra sur vos rapports et factures
          </p>
        </div>

        <div className="space-y-4">
          <OnboardingInput
            label="Nom de l'organisation"
            value={organizationData.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            autoFocus
            icon={<Building2 className="w-5 h-5" />}
          />

          <div className="relative">
            <OnboardingInput
              label="Identifiant unique (slug)"
              value={organizationData.slug}
              onChange={(e) => onUpdate({ 
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
              })}
              success={!isCheckingSlug && slugCheck?.available}
              error={!isCheckingSlug && slugCheck && !slugCheck.available ? 'Ce slug est déjà pris' : undefined}
              isValidating={isCheckingSlug}
              hint={`agritech.ma/${organizationData.slug || 'votre-slug'}`}
            />
            
            {slugCheck && !slugCheck.available && slugCheck.suggestion && (
              <button
                type="button"
                onClick={() => onUpdate({ slug: slugCheck.suggestion! })}
                className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 underline"
              >
                Utiliser "{slugCheck.suggestion}" à la place
              </button>
            )}
          </div>
        </div>

        {/* Live preview card */}
        <div className="mt-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Aperçu de votre espace</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {organizationData.name.charAt(0).toUpperCase() || 'O'}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{organizationData.name || 'Votre Organisation'}</p>
              <p className="text-sm text-gray-500">agritech.ma/{organizationData.slug || 'slug'}</p>
            </div>
            {slugCheck?.available && (
              <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto" />
            )}
          </div>
        </div>

        <button
          onClick={() => setSubStep(2)}
          disabled={!organizationData.name.trim() || (!existingOrgId && !slugCheck?.available)}
          className="mt-8 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold
            shadow-lg shadow-emerald-500/30 hover:shadow-xl
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300 hover:scale-[1.02]
            flex items-center justify-center gap-2"
        >
          Continuer
          <ArrowRight className="w-5 h-5" />
        </button>

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

  // Sub-step 2: Contact & location
  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Informations de contact
        </h2>
        <p className="text-gray-500">
          Pour les factures et communications
        </p>
      </div>

      <div className="space-y-4">
        <OnboardingInput
          label="Email professionnel"
          type="email"
          value={organizationData.email}
          onChange={(e) => onUpdate({ email: e.target.value })}
          icon={<Mail className="w-5 h-5" />}
        />

        <OnboardingInput
          label="Téléphone (optionnel)"
          type="tel"
          value={organizationData.phone}
          onChange={(e) => onUpdate({ phone: e.target.value })}
          icon={<Phone className="w-5 h-5" />}
        />

        <OnboardingInput
          label="Adresse (optionnel)"
          value={organizationData.address}
          onChange={(e) => onUpdate({ address: e.target.value })}
          icon={<MapPin className="w-5 h-5" />}
        />

        <div className="grid grid-cols-2 gap-4">
          <OnboardingInput
            label="Ville"
            value={organizationData.city}
            onChange={(e) => onUpdate({ city: e.target.value })}
          />

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Pays</label>
            <select
              value={organizationData.country}
              onChange={(e) => onUpdate({ country: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-0 transition-colors appearance-none bg-white"
            >
              {COUNTRIES.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.flag} {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!isValid}
        className="mt-8 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold
          shadow-lg shadow-emerald-500/30 hover:shadow-xl
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-300 hover:scale-[1.02]
          flex items-center justify-center gap-2"
      >
        Étape suivante
        <ArrowRight className="w-5 h-5" />
      </button>

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

export default OrganizationStep;
