import { useState, useEffect, useCallback } from 'react';
import { Globe, User, ArrowRight, ArrowLeft, Clock, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { loadLanguage } from '@/i18n/config';
import { OnboardingInput } from '../ui/OnboardingInput';
import { SelectionCard } from '../ui/SelectionCard';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/ui/phone-input';

interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  language: string;
  timezone: string;
}

interface WelcomeStepProps {
  profileData: ProfileData;
  onUpdate: (data: Partial<ProfileData>) => void;
  onNext: () => void;
}

const LANGUAGE_IDS = ['fr', 'en', 'ar'] as const;

const LANGUAGE_FLAG: Record<(typeof LANGUAGE_IDS)[number], string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  ar: '🇲🇦',
};

const TIMEZONE_IDS = ['Africa/Casablanca', 'Europe/Paris', 'Europe/London', 'UTC'] as const;

const TIMEZONE_FLAG: Record<(typeof TIMEZONE_IDS)[number], string> = {
  'Africa/Casablanca': '🇲🇦',
  'Europe/Paris': '🇫🇷',
  'Europe/London': '🇬🇧',
  UTC: '🌍',
};

export const WelcomeStep = ({ profileData, onUpdate, onNext }: WelcomeStepProps) => {
  const { t } = useTranslation();
  const [subStep, setSubStep] = useState(0);
  const [showGreeting, setShowGreeting] = useState(true);
  const [phoneTouched, setPhoneTouched] = useState(false);

  useEffect(() => {
    if (showGreeting) {
      const timer = setTimeout(() => setShowGreeting(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showGreeting]);

  const handleLanguageSelect = useCallback(
    (langId: string) => {
      void loadLanguage(langId);
      onUpdate({ language: langId });
    },
    [onUpdate],
  );

  const namesOk = Boolean(profileData.first_name.trim() && profileData.last_name.trim());
  const phoneOk = isValidPhoneNumber(profileData.phone || '');
  const phoneShowError = phoneTouched && profileData.phone && !phoneOk;

  const primaryClass =
    'h-11 min-w-0 flex-1 rounded-lg shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed';

  if (showGreeting) {
    return (
      <div
        className="flex min-h-[260px] flex-col items-center justify-center px-4 py-6 text-center animate-fade-in"
        data-testid="onboarding-step-greeting"
      >
        <picture className="mb-4 block animate-slide-up">
          <source srcSet="/assets/logo.webp" type="image/webp" />
          <img src="/assets/logo.png" alt={t('onboarding.welcome.greetingBrand', 'AgroGina')} className="mx-auto h-14 w-auto sm:h-16" decoding="async" />
        </picture>

        <h1 className="mb-1.5 text-2xl font-bold text-slate-900 animate-slide-up dark:text-white">
          {t('onboarding.welcome.greetingPrefix', 'Welcome to')}{' '}
          <span className="text-emerald-600">{t('onboarding.welcome.greetingBrand', 'AgroGina')}</span>
        </h1>

        <p
          className="max-w-sm animate-slide-up px-2 text-sm text-slate-500 dark:text-slate-400"
          style={{ animationDelay: '0.15s' }}
        >
          {t('onboarding.welcome.greetingTagline', 'Grow your success with intelligence')}
        </p>

        <div className="mt-6 flex items-center gap-2">
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 dark:bg-slate-600" style={{ animationDelay: '0ms' }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 dark:bg-slate-600" style={{ animationDelay: '150ms' }} />
          <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 dark:bg-slate-600" style={{ animationDelay: '300ms' }} />
        </div>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slide-up {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
          .animate-slide-up { animation: slide-up 0.5s ease-out forwards; }
        `}</style>
      </div>
    );
  }

  if (subStep === 0) {
    return (
      <div className="mx-auto max-w-md animate-fade-in px-1">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <User className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </div>
          <h2 className="mb-0.5 text-lg font-semibold text-slate-900 dark:text-white" data-testid="onboarding-step-name-title">
            {t('onboarding.welcome.nameTitle', 'What should we call you?')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('onboarding.welcome.nameSubtitle', 'We will personalize your experience')}</p>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <OnboardingInput
            label={t('onboarding.welcome.firstName', 'First name')}
            value={profileData.first_name}
            onChange={(e) => onUpdate({ first_name: e.target.value })}
            autoFocus
          />
          <OnboardingInput
            label={t('onboarding.welcome.lastName', 'Last name')}
            value={profileData.last_name}
            onChange={(e) => onUpdate({ last_name: e.target.value })}
          />
        </div>

        <Button
          type="button"
          variant="emerald"
          onClick={() => setSubStep(1)}
          disabled={!namesOk}
          data-testid="onboarding-continue-name"
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg font-medium shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
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
      <div className="mx-auto max-w-md animate-fade-in px-1">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <MessageCircle className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </div>
          <h2 className="mb-0.5 text-lg font-semibold text-slate-900 dark:text-white">
            {t('onboarding.welcome.phoneTitle', 'Your mobile number')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t(
              'onboarding.welcome.phoneSubtitle',
              'We use it for WhatsApp, SMS, and important account updates.',
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <label className="mb-2 block pl-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('onboarding.welcome.phoneLabel', 'Phone number')}
          </label>
          <PhoneInput
            id="onboarding-profile-phone"
            international
            defaultCountry="MA"
            value={profileData.phone || undefined}
            onChange={(v) => onUpdate({ phone: v ?? '' })}
            invalid={phoneShowError}
            className="w-full"
            onBlur={() => setPhoneTouched(true)}
          />
          <p className="mt-2 pl-0.5 text-xs text-slate-400 dark:text-slate-500">
            {t(
              'onboarding.welcome.phoneHint',
              'Choose your country, then enter your number in international format.',
            )}
          </p>
          {phoneShowError && (
            <p className="mt-1.5 pl-0.5 text-xs font-medium text-red-600 dark:text-red-400">
              {t(
                'onboarding.welcome.phoneInvalid',
                'Please enter a valid phone number for the selected country.',
              )}
            </p>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSubStep(0)}
            className="h-11 shrink-0 gap-1.5 px-3 sm:px-4"
            data-testid="onboarding-back-phone"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('onboarding.welcome.back', 'Back')}</span>
          </Button>
          <Button
            type="button"
            variant="emerald"
            onClick={() => {
              setPhoneTouched(true);
              if (phoneOk) setSubStep(2);
            }}
            data-testid="onboarding-continue-phone"
            disabled={!phoneOk}
            className={`${primaryClass} flex items-center justify-center gap-2 font-medium disabled:opacity-40`}
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

  if (subStep === 2) {
    return (
      <div className="mx-auto max-w-md animate-fade-in px-1">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
            <Globe className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </div>
          <h2 className="mb-0.5 text-lg font-semibold text-slate-900 dark:text-white" data-testid="onboarding-step-language-title">
            {t('onboarding.welcome.languageHello', 'Hello, {{name}}', { name: profileData.first_name })}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('onboarding.welcome.languagePickSubtitle', 'Which language do you prefer?')}
          </p>
        </div>

        <div className="space-y-2">
          {LANGUAGE_IDS.map((langId) => (
            <SelectionCard
              key={langId}
              testId={`onboarding-lang-${langId}`}
              title={`${LANGUAGE_FLAG[langId]} ${t(`onboarding.welcome.languages.${langId}.name`)}`}
              description={t(`onboarding.welcome.languages.${langId}.description`)}
              icon={<Globe className="h-5 w-5" />}
              selected={profileData.language === langId}
              onClick={() => handleLanguageSelect(langId)}
            />
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSubStep(1)}
            className="h-11 shrink-0 gap-1.5 px-3 sm:px-4"
            data-testid="onboarding-back-language"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('onboarding.welcome.back', 'Back')}</span>
          </Button>
          <Button
            type="button"
            variant="emerald"
            onClick={() => setSubStep(3)}
            data-testid="onboarding-continue-language"
            className={`${primaryClass} flex items-center justify-center gap-2 font-medium`}
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
    <div className="mx-auto max-w-md animate-fade-in px-1">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
          <Clock className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </div>
        <h2 className="mb-0.5 text-lg font-semibold text-slate-900 dark:text-white" data-testid="onboarding-step-timezone-title">
          {t('onboarding.welcome.timezoneTitle', 'Your time zone')}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('onboarding.welcome.timezoneSubtitle', 'To sync your tasks and reminders')}
        </p>
      </div>

      <div className="space-y-2">
        {TIMEZONE_IDS.map((tzId) => (
          <SelectionCard
            key={tzId}
            testId={`onboarding-tz-${tzId.replace(/\//g, '-')}`}
            title={`${TIMEZONE_FLAG[tzId]} ${t(`onboarding.welcome.timezones.${tzId}.city`)}`}
            description={t(`onboarding.welcome.timezones.${tzId}.offset`)}
            icon={<Clock className="h-5 w-5" />}
            selected={profileData.timezone === tzId}
            onClick={() => onUpdate({ timezone: tzId })}
          />
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setSubStep(2)}
          className="h-11 shrink-0 gap-1.5 px-3 sm:px-4"
          data-testid="onboarding-back-timezone"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t('onboarding.welcome.back', 'Back')}</span>
        </Button>
        <Button
          type="button"
          variant="emerald"
          onClick={onNext}
          disabled={!namesOk}
          data-testid="onboarding-next-step-profile"
          className={`${primaryClass} flex items-center justify-center gap-2 font-medium disabled:opacity-40`}
        >
          <span>{t('onboarding.welcome.nextStep', 'Next step')}</span>
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
};

export default WelcomeStep;
