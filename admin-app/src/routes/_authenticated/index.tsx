import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Leaf, ArrowRight, RefreshCw } from 'lucide-react';
import { referentialApi, getCropLabel } from '@/lib/referentiels';

function ReferentielsDashboard() {
  const { data: crops, isLoading, refetch } = useQuery({
    queryKey: ['referentials-list'],
    queryFn: () => referentialApi.list(),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Référentiels</h1>
          <p className="text-gray-500 mt-1">
            Inspect, validate and update agronomic reference data
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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : !crops?.length ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed border-gray-300">
          <p className="text-gray-500">No referential files found</p>
          <p className="text-sm text-gray-400 mt-1">
            Place DATA_*.json files in agritech-api/referentials/
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {crops.map((c) => (
            <Link
              key={c.crop}
              to="/referentiels/$crop"
              params={{ crop: c.crop }}
              className="group bg-white rounded-lg border border-gray-200 p-6 hover:border-emerald-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700">
                      {getCropLabel(c.crop)}
                    </h3>
                    <p className="text-sm text-gray-500">{c.fileName}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 mt-1" />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  v{c.version}
                </span>
                <span className="text-xs text-gray-400">{c.date}</span>
                <span className="text-xs text-gray-400">
                  {c.sections.length} sections
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.sections.slice(0, 8).map((s) => (
                  <span
                    key={s}
                    className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                  >
                    {s}
                  </span>
                ))}
                {c.sections.length > 8 && (
                  <span className="inline-block px-2 py-0.5 text-gray-400 text-xs">
                    +{c.sections.length - 8} more
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/')({
  component: ReferentielsDashboard,
});
