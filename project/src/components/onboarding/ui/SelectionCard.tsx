import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelectionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  selected: boolean;
  onClick: () => void;
  color?: string;
  badge?: string;
  disabled?: boolean;
  descriptionClassName?: string;
  footer?: ReactNode;
  className?: string;
  /** Stable test id (recommended when `title` is translated). */
  testId?: string;
}

export const SelectionCard = ({
  title,
  description,
  icon,
  selected,
  onClick,
  color = 'emerald',
  badge,
  disabled = false,
  descriptionClassName,
  footer,
  className,
  testId,
}: SelectionCardProps) => {
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-500 dark:border-emerald-400',
      icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
      check: 'bg-emerald-500',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-500 dark:border-blue-400',
      icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
      check: 'bg-blue-500',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-500 dark:border-purple-400',
      icon: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
      check: 'bg-purple-500',
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      border: 'border-indigo-500 dark:border-indigo-400',
      icon: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
      check: 'bg-indigo-500',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-500 dark:border-orange-400',
      icon: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
      check: 'bg-orange-500',
    },
    pink: {
      bg: 'bg-pink-50 dark:bg-pink-900/20',
      border: 'border-pink-500 dark:border-pink-400',
      icon: 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400',
      check: 'bg-pink-500',
    },
    cyan: {
      bg: 'bg-cyan-50 dark:bg-cyan-900/20',
      border: 'border-cyan-500 dark:border-cyan-400',
      icon: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400',
      check: 'bg-cyan-500',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-500 dark:border-green-400',
      icon: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
      check: 'bg-green-500',
    },
  };

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.emerald;

  const testIdFromTitle =
    title
      .trim()
      .toLowerCase()
      .replace(/\W+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'item';

  const descClass =
    descriptionClassName ??
    'mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2';

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId ?? `selection-card-${testIdFromTitle}`}
      className={`
        relative h-auto min-w-0 w-full whitespace-normal p-3.5 rounded-lg border text-left
        transition-all duration-200 ease-out
        ${selected
          ? `${colors.bg} ${colors.border}`
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${selected ? 'ring-1 ring-emerald-500/10' : ''}
        ${className ?? ''}
      `}
    >
      {badge && (
        <div className="absolute -top-2 -right-1.5 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
          {badge}
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`
          flex-shrink-0 p-2 rounded-lg transition-all duration-200
          ${selected ? colors.icon : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}
        `}>
          <div className="w-4 h-4 flex items-center justify-center [&_svg]:size-4">
            {icon}
          </div>
        </div>

        <div className="flex-1 min-w-0 text-left">
          <h3 className={`
            font-medium text-sm transition-colors duration-200 break-words
            ${selected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}
          `}>
            {title}
          </h3>
          <p className={descClass}>{description}</p>
        </div>

        <div className={`
          flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5
          transition-all duration-200
          ${selected
            ? `${colors.check} border-transparent`
            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
          }
        `}>
          {selected && (
            <Check className="w-3 h-3 text-white animate-scale-in" />
          )}
        </div>
      </div>

      {footer ? <div className="mt-2.5 text-left">{footer}</div> : null}

      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out forwards;
        }
      `}</style>
    </Button>
  );
};

export default SelectionCard;
