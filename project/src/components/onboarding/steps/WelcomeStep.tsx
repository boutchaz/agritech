import React, { useState, useEffect } from 'react';
import { Sprout, Globe, User, Phone, ArrowRight } from 'lucide-react';
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
  { id: 'Africa/Casablanca', name: 'Casablanca', offset: 'GMT+1' },
  { id: 'Europe/Paris', name: 'Paris', offset: 'GMT+1/+2' },
  { id: 'Europe/London', name: 'Londres', offset: 'GMT+0/+1' },
  { id: 'UTC', name: 'UTC', offset: 'GMT+0' },
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
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center animate-fade-in">
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-bounce-slow">
            <Sprout className="w-12 h-12 text-white" />
          </div>
          {/* Pulse rings */}
          <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-emerald-400/50 animate-ping" />
          <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-emerald-300/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4 animate-slide-up">
          Bienvenue sur <span className="text-emerald-600">AgriTech</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-md animate-slide-up" style={{ animationDelay: '0.2s' }}>
          Cultivez votre succès avec intelligence
        </p>

        <div className="mt-8 flex items-center gap-2 text-emerald-600 animate-pulse">
          <span className="text-sm">Préparation de votre espace...</span>
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
            50% { transform: translateY(-10px); }
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
      <div className="max-w-md mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Comment vous appelez-vous ?
          </h2>
          <p className="text-gray-500">
            Nous personnaliserons votre expérience
          </p>
        </div>

        <div className="space-y-4">
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
          className="mt-8 w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold
            shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
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

  // Sub-step 1: Phone (optional)
  if (subStep === 1) {
    return (
      <div className="max-w-md mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bonjour, {profileData.first_name} !
          </h2>
          <p className="text-gray-500">
            Un numéro de téléphone pour les notifications importantes ?
          </p>
        </div>

        <OnboardingInput
          label="Téléphone (optionnel)"
          type="tel"
          value={profileData.phone}
          onChange={(e) => onUpdate({ phone: e.target.value })}
          hint="Ex: +212 6XX XXX XXX"
          icon={<Phone className="w-5 h-5" />}
        />

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => setSubStep(2)}
            className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-medium
              hover:bg-gray-200 transition-all duration-200"
          >
            Passer
          </button>
          <button
            onClick={() => setSubStep(2)}
            className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold
              shadow-lg shadow-emerald-500/30 hover:shadow-xl
              transition-all duration-300 hover:scale-[1.02]
              flex items-center justify-center gap-2"
          >
            Continuer
            <ArrowRight className="w-5 h-5" />
          </button>
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

  // Sub-step 2: Language selection
  if (subStep === 2) {
    return (
      <div className="max-w-md mx-auto animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Quelle langue préférez-vous ?
          </h2>
          <p className="text-gray-500">
            Vous pourrez changer à tout moment
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
          onClick={() => setSubStep(3)}
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

  // Sub-step 3: Timezone selection
  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Globe className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Votre fuseau horaire
        </h2>
        <p className="text-gray-500">
          Pour synchroniser vos tâches et rappels
        </p>
      </div>

      <div className="space-y-3">
        {TIMEZONES.map((tz) => (
          <SelectionCard
            key={tz.id}
            title={tz.name}
            description={tz.offset}
            icon={<Globe className="w-5 h-5" />}
            selected={profileData.timezone === tz.id}
            onClick={() => onUpdate({ timezone: tz.id })}
          />
        ))}
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

export default WelcomeStep;
