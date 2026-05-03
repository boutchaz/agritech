import type { ReactNode } from 'react';

export interface HrStat {
  label: string;
  value: ReactNode;
  accent?: 'default' | 'warn' | 'danger' | 'success';
}

interface HrStatGridProps {
  stats: HrStat[];
}

/**
 * Stat strip for HR module pages, extracted from the legacy HrPageHeader.
 * Render as a sibling to ModernPageHeader, inside the body container.
 */
export function HrStatGrid({ stats }: HrStatGridProps) {
  if (!stats.length) return null;
  return (
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
  );
}
