import React from 'react';
import { Check } from 'lucide-react';

interface SelectionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  color?: string;
  badge?: string;
  disabled?: boolean;
}

export const SelectionCard: React.FC<SelectionCardProps> = ({
  title,
  description,
  icon,
  selected,
  onClick,
  color = 'emerald',
  badge,
  disabled = false,
}) => {
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-500',
      icon: 'bg-emerald-100 text-emerald-600',
      check: 'bg-emerald-500',
      shadow: 'shadow-emerald-500/20',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-500',
      icon: 'bg-blue-100 text-blue-600',
      check: 'bg-blue-500',
      shadow: 'shadow-blue-500/20',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-500',
      icon: 'bg-purple-100 text-purple-600',
      check: 'bg-purple-500',
      shadow: 'shadow-purple-500/20',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-500',
      icon: 'bg-orange-100 text-orange-600',
      check: 'bg-orange-500',
      shadow: 'shadow-orange-500/20',
    },
    pink: {
      bg: 'bg-pink-50',
      border: 'border-pink-500',
      icon: 'bg-pink-100 text-pink-600',
      check: 'bg-pink-500',
      shadow: 'shadow-pink-500/20',
    },
    cyan: {
      bg: 'bg-cyan-50',
      border: 'border-cyan-500',
      icon: 'bg-cyan-100 text-cyan-600',
      check: 'bg-cyan-500',
      shadow: 'shadow-cyan-500/20',
    },
    indigo: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-500',
      icon: 'bg-indigo-100 text-indigo-600',
      check: 'bg-indigo-500',
      shadow: 'shadow-indigo-500/20',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-500',
      icon: 'bg-green-100 text-green-600',
      check: 'bg-green-500',
      shadow: 'shadow-green-500/20',
    },
  };

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.emerald;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full p-5 rounded-2xl border-2 text-left
        transition-all duration-300 ease-out
        ${selected 
          ? `${colors.bg} ${colors.border} shadow-lg ${colors.shadow}` 
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${selected ? 'scale-[1.02]' : 'hover:scale-[1.01]'}
      `}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-2 -right-2 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-lg animate-bounce-subtle">
          {badge}
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`
          p-3 rounded-xl transition-all duration-300
          ${selected ? colors.icon : 'bg-gray-100 text-gray-500'}
        `}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`
            font-semibold text-base transition-colors duration-200
            ${selected ? 'text-gray-900' : 'text-gray-700'}
          `}>
            {title}
          </h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Checkbox indicator */}
        <div className={`
          w-6 h-6 rounded-full border-2 flex items-center justify-center
          transition-all duration-300
          ${selected 
            ? `${colors.check} border-transparent` 
            : 'border-gray-300 bg-white'
          }
        `}>
          {selected && (
            <Check className="w-4 h-4 text-white animate-scale-in" />
          )}
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
        
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </button>
  );
};

export default SelectionCard;
