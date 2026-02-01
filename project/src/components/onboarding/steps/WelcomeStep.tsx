import React, { useState, useEffect } from 'react';
import { Sprout, Globe, User, ArrowRight, Clock } from 'lucide-react';
import { OnboardingInput } from '../ui/OnboardingInput';
import { SelectionCard } from '../ui/SelectionCard';

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

const LANGUAGES = [
  { id: 'fr', name: 'Français', flag: '🇫🇷', description: 'Interface en français' },
  { id: 'en', name: 'English', flag: '🇬🇧', description: 'English interface' },
  { id: 'ar', name: 'العربية', flag: '🇲🇦', description: 'واجهة عربية' },
];

const TIMEZONES = [
  { id: 'Africa/Casablanca', name: 'Casablanca', offset: 'GMT+1', icon: '🇲🇦' },
  { id: 'Europe/Paris', name: 'Paris', offset: 'GMT+1/+2', icon: '🇫🇷' },
  { id: 'Europe/London', name: 'Londres', offset: 'GMT+0/+1', icon: '🇬🇧' },
  { id: 'UTC', name: 'UTC', offset: 'GMT+0', icon: '🌍' },
];

export const WelcomeStep: React.FC<WelcomeStepProps> = ({
  profileData,
  onUpdate,
  onNext,
}) => {
  const [subStep, setSubStep] = useState(0);
  const [showGreeting, setShowGreeting] = useState(true);

  // Auto-advance from greeting
  useEffect(() => {
    if (showGreeting) {
      const timer = setTimeout(() => setShowGreeting(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [showGreeting]);

  const isValid = profileData.first_name.trim() && profileData.last_name.trim();

  // Greeting screen
  if (showGreeting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center animate-fade-in py-8">
        <div className="relative mb-10">
          <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-bounce-slow">
            <Sprout className="w-14 h-14 text-white" />
          </div>
          {/* Pulse rings */}
          <div className="absolute inset-0 w-28 h-28 rounded-full border-4 border-emerald-400/40 animate-ping" />
          <div className="absolute -inset-2 w-32 h-32 rounded-full border-2 border-emerald-300/20 animate-pulse" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 animate-slide-up">
          Bienvenue sur <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">AgriTech</span>
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 max-w-md animate-slide-up px-4" style={{ animationDelay: '0.2s' }}>
          Cultivez votre succès avec intelligence
        </p>

        <div className="mt-10 flex items-center gap-3 text-emerald-600 animate-pulse">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slide-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          
          .animate-fade-in { animation: fade-in 0.6s ease-out forwards; }
          .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
          .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  // Sub-step 0: Name input
  if (subStep === 0) {
    return (
      <div className="max-w-md mx-auto animate-fade-in px-2">
        <div className="text-center mb-10">
          <div className="w-18 h-18 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-5 p-4">
            <User className="w-9 h-9 text-emerald-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Comment vous appelez-vous ?
          </h2>
          <p className="text-gray-500 text-base">
            Nous personnaliserons votre expérience
          </p>
        </div>

        <div className="space-y-5">
          <OnboardingInput
            label="Prénom"
            value={profileData.first_name}
            onChange={(e) => onUpdate({ first_name: e.target.value })}
            autoFocus
          />
          
          <OnboardingInput
            label="Nom"
            value={profileData.last_name}
            onChange={(e) => onUpdate({ last_name: e.target.value })}
          />
        </div>

        <button
          onClick={() => setSubStep(1)}
          disabled={!profileData.first_name.trim() || !profileData.last_name.trim()}
          data-testid="onboarding-continue-name"
          className="mt-10 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-semibold text-base
            shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
            transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
            flex items-center justify-center gap-3"
        >
          <span>Continuer</span>
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

  // Sub-step 1: Language selection (skip phone - it's in OrganizationStep)
  if (subStep === 1) {
    return (
      <div className="max-w-md mx-auto animate-fade-in px-2">
        <div className="text-center mb-10">
          <div className="w-18 h-18 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-5 p-4">
            <Globe className="w-9 h-9 text-blue-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Bonjour, {profileData.first_name} ! 👋
          </h2>
          <p className="text-gray-500 text-base">
            Quelle langue préférez-vous ?
          </p>
        </div>

        <div className="space-y-3">
          {LANGUAGES.map((lang) => (
            <SelectionCard
              key={lang.id}
              title={`${lang.flag} ${lang.name}`}
              description={lang.description}
              icon={<Globe className="w-5 h-5" />}
              selected={profileData.language === lang.id}
              onClick={() => onUpdate({ language: lang.id })}
            />
          ))}
        </div>

        <button
          onClick={() => setSubStep(2)}
          data-testid="onboarding-continue-language"
          className="mt-10 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-semibold text-base
            shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30
            transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
            flex items-center justify-center gap-3"
        >
          <span>Continuer</span>
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

  // Sub-step 2: Timezone selection
  return (
    <div className="max-w-md mx-auto animate-fade-in px-2">
      <div className="text-center mb-10">
        <div className="w-18 h-18 bg-gradient-to-br from-amber-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-5 p-4">
          <Clock className="w-9 h-9 text-amber-600" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          Votre fuseau horaire
        </h2>
        <p className="text-gray-500 text-base">
          Pour synchroniser vos tâches et rappels
        </p>
      </div>

      <div className="space-y-3">
        {TIMEZONES.map((tz) => (
          <SelectionCard
            key={tz.id}
            title={`${tz.icon} ${tz.name}`}
            description={tz.offset}
            icon={<Clock className="w-5 h-5" />}
            selected={profileData.timezone === tz.id}
            onClick={() => onUpdate({ timezone: tz.id })}
          />
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!isValid}
        data-testid="onboarding-next-step-profile"
        className="mt-10 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-semibold text-base
          shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg
          transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
          flex items-center justify-center gap-3"
      >
        <span>Étape suivante</span>
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

export default WelcomeStep;
