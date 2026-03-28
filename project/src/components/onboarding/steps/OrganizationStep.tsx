import React, { useEffect, useRef, useState } from 'react';
import { Building2, User, Briefcase, CheckCircle, ArrowRight, Mail } from 'lucide-react';
import { OnboardingInput } from '../ui/OnboardingInput';
import { SelectionCard } from '../ui/SelectionCard';
import { ButtonLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';

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
  isLoading?: boolean;
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
  isLoading = false,
}) => {
  const [subStep, setSubStep] = useState(0);
  const [slugCheck, setSlugCheck] = useState<SlugCheckResult | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const slugCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceAttempted = useRef(false);
  // Use refs for callbacks to avoid them being in effect dependencies
  const onNextRef = useRef(onNext);
  const onUpdateRef = useRef(onUpdate);
  const onCheckSlugRef = useRef(onCheckSlug);

  // Keep the refs in sync
  useEffect(() => {
    onNextRef.current = onNext;
    onUpdateRef.current = onUpdate;
    onCheckSlugRef.current = onCheckSlug;
  }, [onNext, onUpdate, onCheckSlug]);

  // Auto-advance if organization data is already complete (from signup)
  useEffect(() => {
    if (existingOrgId && organizationData.name && organizationData.email && !autoAdvanceAttempted.current) {
      autoAdvanceAttempted.current = true;
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        onNextRef.current();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [existingOrgId, organizationData.name, organizationData.email]);

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
        onUpdateRef.current({ slug });
      }
    }
  }, [organizationData.name, organizationData.slug]);

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
        const result = await onCheckSlugRef.current(slug);
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
  }, [organizationData.slug, existingOrgId]);

  const isValid = organizationData.name.trim() && 
    organizationData.email.trim() && 
    (existingOrgId || (slugCheck?.available ?? false));

  // Sub-step 0: Account type selection
  if (subStep === 0) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in px-2">
        <div className="text-center mb-10">
          <div className="w-18 h-18 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-5 p-4">
            <Building2 className="w-9 h-9 text-blue-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Quel type de compte ?
          </h2>
          <p className="text-gray-500 text-base">
            Nous adapterons les fonctionnalités à vos besoins
          </p>
        </div>

        <div className="space-y-3">
          {ACCOUNT_TYPES.map((type) => (
            <SelectionCard
              key={type.id}
              title={type.name}
              description={type.description}
              icon={<type.icon className="w-5 h-5" />}
              selected={organizationData.account_type === type.id}
              onClick={() => onUpdate({ account_type: type.id as OrganizationData['account_type'] })}
              color={type.color}
              badge={type.badge}
            />
          ))}
        </div>

        <Button
          onClick={() => setSubStep(1)}
          className="mt-10 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-semibold text-base
            shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30
            transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
            flex items-center justify-center gap-3"
        >
          <span>Continuer</span>
          <ArrowRight className="w-5 h-5" />
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
  }

  // Sub-step 1: Organization name & slug
  if (subStep === 1) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in px-2">
        <div className="text-center mb-10">
          <div className="w-18 h-18 bg-gradient-to-br from-emerald-100 to-teal-200 rounded-2xl flex items-center justify-center mx-auto mb-5 p-4">
            <Building2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Nommez votre {organizationData.account_type === 'farm' ? 'exploitation' : 'organisation'}
          </h2>
          <p className="text-gray-500 text-base">
            Ce nom apparaîtra sur vos rapports et factures
          </p>
        </div>

        <div className="space-y-5">
          <OnboardingInput
            label="Nom de l'organisation"
            value={organizationData.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            autoFocus
          />

          <div>
            <OnboardingInput
              label="Identifiant unique (slug)"
              value={organizationData.slug}
              onChange={(e) => onUpdate({ 
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
              })}
              success={!isCheckingSlug && slugCheck?.available}
              error={!isCheckingSlug && slugCheck && !slugCheck.available ? 'Ce slug est déjà pris' : undefined}
              isValidating={isCheckingSlug}
              hint={`Votre URL: agritech.ma/${organizationData.slug || 'votre-slug'}`}
            />
            
            {slugCheck && !slugCheck.available && slugCheck.suggestion && (
              <Button
                type="button"
                onClick={() => {
                  if (slugCheck.suggestion) {
                    onUpdate({ slug: slugCheck.suggestion });
                  }
                }}
                className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2"
              >
                Utiliser "{slugCheck.suggestion}" à la place
              </Button>
            )}
          </div>
        </div>

        {/* Live preview card */}
        {organizationData.name && (
          <div className="mt-8 p-5 bg-gradient-to-br from-gray-50 to-gray-100/80 rounded-2xl border border-gray-200/80">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Aperçu</p>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20">
                {organizationData.name.charAt(0).toUpperCase() || 'O'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-lg truncate">{organizationData.name}</p>
                <p className="text-sm text-gray-500">agritech.ma/{organizationData.slug || 'slug'}</p>
              </div>
              {slugCheck?.available && (
                <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
              )}
            </div>
          </div>
        )}

        <Button
          onClick={() => setSubStep(2)}
          disabled={!organizationData.name.trim() || (!existingOrgId && !slugCheck?.available)}
          className="mt-10 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-semibold text-base
            shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
            transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
            flex items-center justify-center gap-3"
        >
          <span>Continuer</span>
          <ArrowRight className="w-5 h-5" />
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
  }

  // Sub-step 2: Contact & location
  return (
    <div className="max-w-lg mx-auto animate-fade-in px-2">
      <div className="text-center mb-10">
        <div className="w-18 h-18 bg-gradient-to-br from-violet-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-5 p-4">
          <Mail className="w-9 h-9 text-violet-600" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          Contact & localisation
        </h2>
        <p className="text-gray-500 text-base">
          Pour les factures et communications
        </p>
      </div>

      <div className="space-y-5">
        <OnboardingInput
          label="Email professionnel"
          type="email"
          value={organizationData.email}
          onChange={(e) => onUpdate({ email: e.target.value })}
        />

        <OnboardingInput
          label="Téléphone (optionnel)"
          type="tel"
          value={organizationData.phone}
          onChange={(e) => onUpdate({ phone: e.target.value })}
          hint="Ex: +212 6XX XXX XXX"
        />

        <OnboardingInput
          label="Adresse (optionnel)"
          value={organizationData.address || ''}
          onChange={(e) => onUpdate({ address: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-4">
          <OnboardingInput
            label="Ville"
            value={organizationData.city || ''}
            onChange={(e) => onUpdate({ city: e.target.value })}
          />

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 pl-1">Pays</label>
            <select
              value={organizationData.country}
              onChange={(e) => onUpdate({ country: e.target.value })}
              className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all duration-200 appearance-none bg-white text-gray-900 font-medium"
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

      <Button
        onClick={onNext}
        disabled={!isValid || isLoading}
        className="mt-10 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-semibold text-base
          shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
          transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
          flex items-center justify-center gap-3"
      >
        {isLoading ? (
          <>
            <ButtonLoader className="h-5 w-5 text-white" />
            <span>Enregistrement...</span>
          </>
        ) : (
          <>
            <span>Étape suivante</span>
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

export default OrganizationStep;
