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
        <div
          className={`
            relative rounded-lg border bg-white dark:bg-slate-900 transition-all duration-200 overflow-hidden
            ${isFocused
              ? 'border-emerald-500 ring-2 ring-emerald-500/10'
              : error
                ? 'border-red-300 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10'
                : success
                  ? 'border-emerald-400 dark:border-emerald-700'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }
          `}
        >
          {icon && (
            <div
              className={`
                absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center
                w-4 h-4 transition-colors duration-200 flex-shrink-0
                ${isFocused ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}
              `}
            >
              {icon}
            </div>
          )}

          <input
            ref={ref}
            {...props}
            data-testid={`onboarding-input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={`
              w-full bg-transparent text-slate-900 dark:text-white text-sm font-medium
              outline-none transition-all duration-200
              ${icon ? 'pl-10 pr-10' : 'pl-3 pr-10'}
              ${isFocused || hasValue ? 'pt-6 pb-1.5' : 'py-3'}
              ${className || ''}
            `}
            placeholder={isFocused || hasValue ? props.placeholder : ''}
          />

          <label
            className={`
              absolute pointer-events-none transition-all duration-200 ease-out
              ${icon ? 'left-10' : 'left-3'}
              ${isFocused || hasValue
                ? 'top-1.5 text-[11px] font-medium tracking-wide'
                : 'top-1/2 -translate-y-1/2 text-sm font-medium'
              }
              ${isFocused
                ? 'text-emerald-600 dark:text-emerald-400'
                : error
                  ? 'text-red-500 dark:text-red-400'
                  : hasValue
                    ? 'text-slate-400 dark:text-slate-500'
                    : 'text-slate-400 dark:text-slate-500'
              }
            `}
          >
            {label}
          </label>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4">
            {isValidating && (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            )}
            {!isValidating && success && (
              <div className="animate-scale-in">
                <Check className="w-4 h-4 text-emerald-500" />
              </div>
            )}
            {!isValidating && error && (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>

        {error && (
          <div className="mt-1.5 flex items-start gap-1.5 animate-slide-down">
            <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {hint && !error && (
          <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500 pl-1">{hint}</p>
        )}

        <style>{`
          @keyframes scale-in {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
          }

          @keyframes slide-down {
            0% { transform: translateY(-4px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }

          .animate-scale-in {
            animation: scale-in 0.2s ease-out forwards;
          }

          .animate-slide-down {
            animation: slide-down 0.15s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }
);

OnboardingInput.displayName = 'OnboardingInput';

export default OnboardingInput;
