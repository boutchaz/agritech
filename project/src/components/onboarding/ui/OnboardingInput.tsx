import React, { useState, forwardRef } from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';

interface OnboardingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: boolean;
  hint?: string;
  isValidating?: boolean;
  icon?: React.ReactNode;
}

export const OnboardingInput = forwardRef<HTMLInputElement, OnboardingInputProps>(
  ({ label, error, success, hint, isValidating, icon, className, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = props.value && String(props.value).length > 0;

    return (
      <div className="relative">
        {/* Input container with floating label */}
        <div
          className={`
            relative rounded-2xl border-2 bg-white transition-all duration-300 overflow-hidden
            ${isFocused 
              ? 'border-emerald-500 shadow-lg shadow-emerald-500/10 ring-4 ring-emerald-500/5' 
              : error 
                ? 'border-red-300 bg-red-50/30' 
                : success 
                  ? 'border-emerald-400 bg-emerald-50/30' 
                  : 'border-gray-200 hover:border-gray-300'
            }
          `}
        >
          {/* Icon - properly positioned */}
          {icon && (
            <div 
              className={`
                absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center
                w-5 h-5 transition-colors duration-200 flex-shrink-0
                ${isFocused ? 'text-emerald-500' : 'text-gray-400'}
              `}
            >
              {icon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            {...props}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={`
              w-full bg-transparent text-gray-900 text-base font-medium
              outline-none transition-all duration-200
              ${icon ? 'pl-12 pr-12' : 'pl-4 pr-12'}
              ${isFocused || hasValue ? 'pt-6 pb-2' : 'py-4'}
              ${className || ''}
            `}
            placeholder={isFocused || hasValue ? props.placeholder : ''}
          />

          {/* Floating label */}
          <label
            className={`
              absolute pointer-events-none transition-all duration-200 ease-out
              ${icon ? 'left-12' : 'left-4'}
              ${isFocused || hasValue
                ? 'top-2 text-xs font-semibold tracking-wide'
                : 'top-1/2 -translate-y-1/2 text-base font-medium'
              }
              ${isFocused 
                ? 'text-emerald-600' 
                : error 
                  ? 'text-red-500' 
                  : hasValue
                    ? 'text-gray-500'
                    : 'text-gray-400'
              }
            `}
          >
            {label}
          </label>

          {/* Status indicators - properly contained */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5">
            {isValidating && (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            )}
            {!isValidating && success && (
              <div className="animate-scale-in">
                <Check className="w-5 h-5 text-emerald-500" />
              </div>
            )}
            {!isValidating && error && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-2 flex items-start gap-2 animate-slide-down">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p className="mt-2 text-sm text-gray-500 pl-1">{hint}</p>
        )}

        <style>{`
          @keyframes scale-in {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
          }
          
          @keyframes slide-down {
            0% { transform: translateY(-8px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          
          .animate-scale-in {
            animation: scale-in 0.3s ease-out forwards;
          }
          
          .animate-slide-down {
            animation: slide-down 0.2s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }
);

OnboardingInput.displayName = 'OnboardingInput';

export default OnboardingInput;
