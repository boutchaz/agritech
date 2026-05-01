import type { LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface HrPageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  stats?: Array<{ label: string; value: ReactNode; accent?: 'default' | 'warn' | 'danger' | 'success' }>;
}

/**
 * Standard HR module page header with icon + title + optional stat strip.
 * Use across workforce/* pages for visual consistency.
 */
export function HrPageHeader({ icon: Icon, title, subtitle, actions, stats }: HrPageHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 mt-0.5">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>

      {stats && stats.length > 0 && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 ${
                s.accent === 'warn'
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
                  : s.accent === 'danger'
                  ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
                  : s.accent === 'success'
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                  : ''
              }`}
            >
              <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
              <div
                className={`text-2xl font-semibold mt-0.5 ${
                  s.accent === 'warn'
                    ? 'text-amber-700 dark:text-amber-300'
                    : s.accent === 'danger'
                    ? 'text-red-700 dark:text-red-300'
                    : s.accent === 'success'
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : ''
                }`}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
