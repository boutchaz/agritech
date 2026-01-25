import React from 'react';
import { Check, Sparkles } from 'lucide-react';

interface Step {
  id: number;
  title: string;
  icon: React.ReactNode;
}

interface AnimatedProgressProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      {/* Progress bar container */}
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full" />
        
        {/* Animated progress fill */}
        <div 
          className="absolute top-5 left-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        >
          {/* Glow effect */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-400 rounded-full blur-sm animate-pulse" />
        </div>

        {/* Step indicators */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isClickable = stepNumber < currentStep && onStepClick;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center"
                style={{ width: '80px' }}
              >
                {/* Step circle */}
                <button
                  onClick={() => isClickable && onStepClick(stepNumber)}
                  disabled={!isClickable}
                  className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-500 ease-out
                    ${isCompleted 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-100' 
                      : isCurrent 
                        ? 'bg-white text-emerald-600 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20 scale-110' 
                        : 'bg-white text-gray-400 border-2 border-gray-200'
                    }
                    ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 animate-scale-in" />
                  ) : isCurrent ? (
                    <div className="relative">
                      {step.icon}
                      {/* Pulse ring for current step */}
                      <div className="absolute inset-0 -m-1 rounded-full border-2 border-emerald-400 animate-ping opacity-50" />
                    </div>
                  ) : (
                    <span className="text-sm font-medium">{stepNumber}</span>
                  )}
                  
                  {/* Completion sparkle */}
                  {isCompleted && (
                    <Sparkles 
                      className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 animate-bounce-subtle" 
                    />
                  )}
                </button>

                {/* Step title */}
                <span 
                  className={`
                    mt-3 text-xs font-medium text-center transition-colors duration-300
                    ${isCompleted || isCurrent ? 'text-emerald-700' : 'text-gray-400'}
                  `}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress percentage */}
      <div className="mt-6 text-center">
        <span className="text-sm text-gray-500">
          Step {currentStep} of {steps.length}
        </span>
        <span className="mx-2 text-gray-300">|</span>
        <span className="text-sm font-medium text-emerald-600">
          {Math.round(progress)}% complete
        </span>
      </div>

      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        .animate-scale-in {
          animation: scale-in 0.4s ease-out forwards;
        }
        
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AnimatedProgress;
