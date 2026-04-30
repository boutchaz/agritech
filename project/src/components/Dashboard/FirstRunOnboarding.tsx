import { useNavigate } from '@tanstack/react-router';
import { Check, MapPin, Package, Sprout, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Step {
  id: 'farm' | 'parcel' | 'stock';
  done: boolean;
  icon: typeof MapPin;
  to: string;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
}

interface Props {
  hasFarm: boolean;
  hasParcel: boolean;
  hasStock: boolean;
  userName?: string | null;
}

const FirstRunOnboarding = ({ hasFarm, hasParcel, hasStock, userName }: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const steps: Step[] = [
    {
      id: 'farm',
      done: hasFarm,
      icon: Sprout,
      to: '/farm-hierarchy',
      titleKey: 'dashboard.firstRun.steps.farm.title',
      titleFallback: 'Create your first farm',
      descKey: 'dashboard.firstRun.steps.farm.desc',
      descFallback: 'Name it, set the location, pick the size.',
    },
    {
      id: 'parcel',
      done: hasParcel,
      icon: MapPin,
      to: '/parcels',
      titleKey: 'dashboard.firstRun.steps.parcel.title',
      titleFallback: 'Add a parcel',
      descKey: 'dashboard.firstRun.steps.parcel.desc',
      descFallback: 'Draw the boundary or enter the area.',
    },
    {
      id: 'stock',
      done: hasStock,
      icon: Package,
      to: '/stock',
      titleKey: 'dashboard.firstRun.steps.stock.title',
      titleFallback: 'Add a stock item',
      descKey: 'dashboard.firstRun.steps.stock.desc',
      descFallback: 'Seeds, fertilizer, fuel — anything you track.',
    },
  ];

  const completed = steps.filter(s => s.done).length;
  const nextStep = steps.find(s => !s.done) ?? steps[0];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
      <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-slate-800">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
              {t('dashboard.firstRun.title', 'Welcome{{name}} — let\'s set up your farm', {
                name: userName ? `, ${userName}` : '',
              })}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 max-w-xl">
              {t(
                'dashboard.firstRun.subtitle',
                'Three quick steps to start tracking parcels, stock, and harvests. You can always add more later.',
              )}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {completed}<span className="text-slate-400 dark:text-slate-600">/3</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('dashboard.firstRun.completed', 'completed')}
            </div>
          </div>
        </div>
      </div>

      <ol className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isNext = step.id === nextStep.id && !step.done;
          return (
            <li
              key={step.id}
              className={cn(
                'flex items-center gap-4 p-4 sm:p-5 transition-colors',
                isNext && 'bg-emerald-50/40 dark:bg-emerald-950/10',
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center h-9 w-9 rounded-full shrink-0 border',
                  step.done
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isNext
                      ? 'bg-white dark:bg-slate-800 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-slate-400',
                )}
              >
                {step.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                    {idx + 1}
                  </span>
                  <h3
                    className={cn(
                      'text-sm sm:text-base font-medium',
                      step.done
                        ? 'text-slate-400 dark:text-slate-500 line-through'
                        : 'text-slate-900 dark:text-white',
                    )}
                  >
                    {t(step.titleKey, step.titleFallback)}
                  </h3>
                </div>
                {!step.done && (
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {t(step.descKey, step.descFallback)}
                  </p>
                )}
              </div>

              {!step.done && (
                <Button
                  size="sm"
                  variant={isNext ? 'default' : 'outline'}
                  onClick={() => navigate({ to: step.to })}
                  className="shrink-0"
                >
                  {isNext
                    ? t('dashboard.firstRun.start', 'Start')
                    : t('dashboard.firstRun.go', 'Go')}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default FirstRunOnboarding;
