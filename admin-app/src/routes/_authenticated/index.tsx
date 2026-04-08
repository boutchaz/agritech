import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Leaf, ArrowRight, RefreshCw, Plus, X } from 'lucide-react';
import { referentialApi, getCropLabel } from '@/lib/referentiels';
import { toast } from 'sonner';

function ReferentielsDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newCropName, setNewCropName] = useState('');

  const { data: crops, isLoading, refetch } = useQuery({
    queryKey: ['referentials-list'],
    queryFn: () => referentialApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (crop: string) =>
      referentialApi.create(crop, {
        metadata: {
          version: '1.0',
          date: new Date().toISOString().slice(0, 7),
          culture: crop.toLowerCase().replace(/\s+/g, '_'),
          pays: 'Maroc',
        },
      }),
    onSuccess: (result) => {
      toast.success(`Referential "${result.crop}" created`);
      queryClient.invalidateQueries({ queryKey: ['referentials-list'] });
      setShowCreate(false);
      setNewCropName('');
      navigate({ to: '/referentiels/$crop', params: { crop: result.crop } });
    },
    onError: (err: Error) => {
      toast.error(`Creation failed: ${err.message}`);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCropName.trim();
    if (!name) return;
    createMutation.mutate(name);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Référentiels</h1>
          <p className="text-gray-500 mt-1">
            Inspect, validate and update agronomic reference data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            New Referential
          </button>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="mb-6 bg-white rounded-lg border border-emerald-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">New Referential</h3>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewCropName('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm text-gray-600 mb-1">
                Crop name
              </label>
              <input
                type="text"
                value={newCropName}
                onChange={(e) => setNewCropName(e.target.value)}
                placeholder="e.g. grenadier, figuier..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                Creates DATA_{'<NAME>'}.json with empty metadata
              </p>
            </div>
            <button
              type="submit"
              disabled={!newCropName.trim() || createMutation.isPending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : !crops?.length ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed border-gray-300">
          <p className="text-gray-500">No referential files found</p>
          <p className="text-sm text-gray-400 mt-1">
            Click "New Referential" to create one
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
