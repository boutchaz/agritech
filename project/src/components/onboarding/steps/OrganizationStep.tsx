import { useEffect, useRef, useState } from 'react';
import { Building2, User, Briefcase, CheckCircle, ArrowRight, ArrowLeft, Mail, PhoneForwarded } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isValidPhoneNumber } from 'react-phone-number-input';
import type { Country } from 'react-phone-number-input';
import { OnboardingInput } from '../ui/OnboardingInput';
import { SelectionCard } from '../ui/SelectionCard';
import { ButtonLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/ui/phone-input';
import { useOnboardingStore } from '@/stores/onboardingStore';

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
  { id: 'individual' as const, icon: User, color: 'emerald' },
  { id: 'farm' as const, icon: Building2, color: 'blue', showBadge: true },
  { id: 'business' as const, icon: Briefcase, color: 'indigo' },
];

const COUNTRIES = [
  { id: 'MA', flag: '🇲🇦' },
  { id: 'FR', flag: '🇫🇷' },
  { id: 'ES', flag: '🇪🇸' },
  { id: 'DZ', flag: '🇩🇿' },
  { id: 'TN', flag: '🇹🇳' },
];

export const OrganizationStep = ({
  organizationData,
  existingOrgId,
  onUpdate,
  onCheckSlug,
  onNext,
  isLoading = false,
}: OrganizationStepProps) => {
  const { t } = useTranslation();
  const profilePhone = useOnboardingStore((s) => s.profileData.phone?.trim() ?? '');
  const [subStep, setSubStep] = useState(0);
  const [slugCheck, setSlugCheck] = useState<SlugCheckResult | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const slugCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceAttempted = useRef(false);
  const onNextRef = useRef(onNext);
  const onUpdateRef = useRef(onUpdate);
  const onCheckSlugRef = useRef(onCheckSlug);

  useEffect(() => {
    onNextRef.current = onNext;
    onUpdateRef.current = onUpdate;
    onCheckSlugRef.current = onCheckSlug;
  }, [onNext, onUpdate, onCheckSlug]);

  useEffect(() => {
    if (existingOrgId && organizationData.name && organizationData.email && !autoAdvanceAttempted.current) {
      autoAdvanceAttempted.current = true;
      const timer = setTimeout(() => {
        onNextRef.current();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [existingOrgId, organizationData.name, organizationData.email]);

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

  const orgPhoneOk =
    !organizationData.phone?.trim() || isValidPhoneNumber(organizationData.phone);
  const profilePhoneValid = Boolean(profilePhone && isValidPhoneNumber(profilePhone));
  const orgPhoneMatchesProfile =
    profilePhoneValid &&
    organizationData.phone?.trim() === profilePhone;
  const orgDefaultCountry = (
    COUNTRIES.some((c) => c.id === organizationData.country)
      ? (organizationData.country as Country)
      : 'MA'
  );

  const isValid = organizationData.name.trim() &&
    organizationData.email.trim() &&
    (existingOrgId || (slugCheck?.available ?? false)) &&
    orgPhoneOk;

  if (subStep === 0) {
    return (
      <div className="mx-auto max-w-lg animate-fade-in px-2">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </div>
          <h2
            className="mb-0.5 text-lg font-semibold text-slate-900 dark:text-white"
            data-testid="onboarding-org-account-type-title"
          >
            {t('onboarding.organization.accountTypeTitle', 'What type of account?')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('onboarding.organization.accountTypeSubtitle', 'We will tailor features to your needs')}
          </p>
        </div>

        <div className="space-y-2">
          {ACCOUNT_TYPES.map((type) => (
            <SelectionCard
              key={type.id}
              testId={`onboarding-org-account-${type.id}`}
              title={t(`onboarding.organization.accountTypes.${type.id}.name`, type.id)}
              description={t(`onboarding.organization.accountTypes.${type.id}.description`, '')}
              icon={<type.icon className="w-5 h-5" />}
              selected={organizationData.account_type === type.id}
              onClick={() => onUpdate({ account_type: type.id as OrganizationData['account_type'] })}
              color={type.color}
              badge={
                'showBadge' in type && type.showBadge
                  ? t('onboarding.organization.accountTypes.farm.badge', 'Popular')
                  : undefined
              }
            />
          ))}
        </div>

        <Button
          type="button"
          variant="emerald"
          onClick={() => setSubStep(1)}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg font-medium shadow-sm transition-all duration-200 active:scale-[0.98]"
        >
          <span>{t('onboarding.welcome.continue', 'Continue')}</span>
          <ArrowRight className="h-4 w-4" />
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
    return (
      <div className="mx-auto max-w-lg animate-fade-in px-2">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </div>
          <h2 className="mb-0.5 text-lg font-semibold text-slate-900 dark:text-white">
            {organizationData.account_type === 'farm'
              ? t('onboarding.organization.orgNameTitleFarm', 'Name your farm')
              : t('onboarding.organization.orgNameTitleOrg', 'Name your organization')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('onboarding.organization.orgNameSubtitle', 'This name will appear on your reports and invoices')}
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <OnboardingInput
            label={t('onboarding.organization.orgNameLabel', 'Organization name')}
            value={organizationData.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            autoFocus
          />

          <div>
            <OnboardingInput
              label={t('onboarding.organization.slugLabel', 'Unique identifier (slug)')}
              value={organizationData.slug}
              onChange={(e) => onUpdate({
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
              })}
              success={!isCheckingSlug && slugCheck?.available}
              error={
                !isCheckingSlug && slugCheck && !slugCheck.available
                  ? t('onboarding.organization.slugTaken', 'This slug is already taken')
                  : undefined
              }
              isValidating={isCheckingSlug}
              hint={t('onboarding.organization.slugHint', 'Your URL: agrogina.ma/{{slug}}', {
                slug: organizationData.slug || t('onboarding.organization.slugPlaceholder', 'your-slug'),
              })}
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
                {t('onboarding.organization.slugSuggest', 'Use "{{suggestion}}" instead', {
                  suggestion: slugCheck.suggestion,
                })}
              </Button>
            )}
          </div>
        </div>

        {organizationData.name && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
              {t('onboarding.organization.previewLabel', 'Preview')}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-base">
                {organizationData.name.charAt(0).toUpperCase() || 'O'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{organizationData.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">agrogina.ma/{organizationData.slug || 'slug'}</p>
              </div>
              {slugCheck?.available && (
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSubStep(0)}
            className="h-11 shrink-0 gap-1.5 px-3 sm:px-4"
            data-testid="onboarding-org-back-name"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('onboarding.welcome.back', 'Back')}</span>
          </Button>
          <Button
            type="button"
            variant="emerald"
            onClick={() => setSubStep(2)}
            disabled={!organizationData.name.trim() || (!existingOrgId && !slugCheck?.available)}
            className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg font-medium shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>{t('onboarding.welcome.continue', 'Continue')}</span>
            <ArrowRight className="h-4 w-4" />
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
    <div className="mx-auto max-w-lg animate-fade-in px-2">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
          <Mail className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </div>
        <h2 className="mb-0.5 text-lg font-semibold text-slate-900 dark:text-white">
          {t('onboarding.organization.contactTitle', 'Contact & location')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('onboarding.organization.contactSubtitle', 'For invoices and communications')}
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <OnboardingInput
          label={t('onboarding.organization.emailLabel', 'Work email')}
          type="email"
          value={organizationData.email}
          onChange={(e) => onUpdate({ email: e.target.value })}
        />

        <div>
          <label className="mb-2 block pl-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('onboarding.organization.phoneLabel', 'Organization phone (optional)')}
          </label>
          <PhoneInput
            international
            defaultCountry={orgDefaultCountry}
            value={organizationData.phone || undefined}
            onChange={(v) => onUpdate({ phone: v ?? '' })}
            invalid={Boolean(organizationData.phone?.trim()) && !orgPhoneOk}
            className="w-full"
          />
          {profilePhoneValid && (
            <div className="mt-2 pl-0.5">
              {orgPhoneMatchesProfile ? (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  {t('onboarding.organization.sameAsProfilePhone', 'This is the same number as on your profile.')}
                </p>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto gap-1.5 p-0 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                  onClick={() => onUpdate({ phone: profilePhone })}
                  data-testid="onboarding-org-reuse-profile-phone"
                >
                  <PhoneForwarded className="h-3.5 w-3.5 shrink-0" />
                  {t('onboarding.organization.reuseProfilePhone', 'Use the same number as my profile')}
                </Button>
              )}
            </div>
          )}
          <p className="mt-1.5 pl-1 text-xs text-slate-400 dark:text-slate-500">
            {t(
              'onboarding.organization.phoneHint',
              'For invoices and support. Leave blank if the same as your personal number.',
            )}
          </p>
          {Boolean(organizationData.phone?.trim()) && !orgPhoneOk && (
            <p className="mt-1.5 pl-1 text-xs font-medium text-red-600 dark:text-red-400">
              {t(
                'onboarding.organization.phoneInvalid',
                'This phone number does not look valid for the selected country.',
              )}
            </p>
          )}
        </div>

        <OnboardingInput
          label={t('onboarding.organization.addressOptional', 'Address (optional)')}
          value={organizationData.address || ''}
          onChange={(e) => onUpdate({ address: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-4">
          <OnboardingInput
            label={t('onboarding.organization.cityLabel', 'City')}
            value={organizationData.city || ''}
            onChange={(e) => onUpdate({ city: e.target.value })}
          />

          <div>
            <label className="mb-2 block pl-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('onboarding.organization.countryLabel', 'Country')}
            </label>
            <select
              value={organizationData.country}
              onChange={(e) => onUpdate({ country: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {COUNTRIES.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.flag} {t(`onboarding.organization.countries.${country.id}`, country.id)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setSubStep(1)}
          disabled={isLoading}
          className="h-11 shrink-0 gap-1.5 px-3 sm:px-4"
          data-testid="onboarding-org-back-contact"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t('onboarding.welcome.back', 'Back')}</span>
        </Button>
        <Button
          type="button"
          variant="emerald"
          onClick={onNext}
          disabled={!isValid || isLoading}
          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg font-medium shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? (
            <>
              <ButtonLoader className="h-4 w-4 text-white" />
              <span>{t('onboarding.organization.saving', 'Saving...')}</span>
            </>
          ) : (
            <>
              <span>{t('onboarding.welcome.nextStep', 'Next step')}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
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
};

export default OrganizationStep;
