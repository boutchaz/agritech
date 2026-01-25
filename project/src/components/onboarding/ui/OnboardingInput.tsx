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
      <div className="relative group">
        {/* Input container with floating label */}
        <div
          className={`
            relative rounded-xl border-2 transition-all duration-300
            ${isFocused 
              ? 'border-emerald-500 shadow-lg shadow-emerald-500/10' 
              : error 
                ? 'border-red-300' 
                : success 
                  ? 'border-emerald-400' 
                  : 'border-gray-200 hover:border-gray-300'
            }
            ${isFocused ? 'scale-[1.02]' : 'scale-100'}
          `}
        >
          {/* Icon */}
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-200 group-focus-within:text-emerald-500">
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
              w-full bg-transparent px-4 pt-6 pb-2 text-gray-900 text-base
              outline-none transition-all duration-200
              ${icon ? 'pl-12' : ''}
              ${className}
            `}
          />

          {/* Floating label */}
          <label
            className={`
              absolute left-4 transition-all duration-200 pointer-events-none
              ${icon ? 'left-12' : ''}
              ${isFocused || hasValue
                ? 'top-2 text-xs font-medium'
                : 'top-1/2 -translate-y-1/2 text-base'
              }
              ${isFocused 
                ? 'text-emerald-600' 
                : error 
                  ? 'text-red-500' 
                  : 'text-gray-500'
              }
            `}
          >
            {label}
          </label>

          {/* Status indicators */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
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
          <p className="mt-2 text-sm text-red-500 flex items-center gap-1 animate-slide-down">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}

        {/* Hint text */}
        {hint && !error && (
          <p className="mt-2 text-sm text-gray-500">{hint}</p>
        )}

        <style>{`
          @keyframes scale-in {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
          }
          
          @keyframes slide-down {
            0% { transform: translateY(-10px); opacity: 0; }
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
