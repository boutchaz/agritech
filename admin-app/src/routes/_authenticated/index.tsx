import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Database, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { REFERENTIEL_TABLES, CATEGORY_LABELS } from '@/lib/referentiels';

function ReferentielsDashboard() {
  const { data: counts, isLoading, refetch } = useQuery({
    queryKey: ['referentiels-counts'],
    queryFn: async () => {
      const results: Record<string, number> = {};
      await Promise.all(
        REFERENTIEL_TABLES.map(async (t) => {
          const { count, error } = await supabase
            .from(t.table)
            .select('*', { count: 'exact', head: true });
          results[t.slug] = error ? -1 : (count ?? 0);
        }),
      );
      return results;
    },
  });

  const grouped = REFERENTIEL_TABLES.reduce(
    (acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    },
    {} as Record<string, typeof REFERENTIEL_TABLES>,
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Référentiels</h1>
          <p className="text-gray-500 mt-1">
            Inspect, validate and update reference data tables
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {Object.entries(grouped).map(([category, tables]) => (
        <div key={category} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {CATEGORY_LABELS[category] || category}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tables.map((t) => {
              const count = counts?.[t.slug];
              return (
                <Link
                  key={t.slug}
                  to="/referentiels/$table"
                  params={{ table: t.slug }}
                  className="group bg-white rounded-lg border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Database className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 group-hover:text-emerald-700">
                          {t.label}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {t.table}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-600 mt-1" />
                  </div>
                  <p className="text-sm text-gray-500 mt-3">{t.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    {isLoading ? (
                      <span className="text-xs text-gray-400">Loading...</span>
                    ) : count === -1 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                        Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {count} rows
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/')({
  component: ReferentielsDashboard,
});
