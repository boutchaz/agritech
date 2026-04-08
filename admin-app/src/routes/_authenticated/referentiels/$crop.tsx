import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Pencil,
  Save,
  X,
  Check,
  Leaf,
} from 'lucide-react';
import { referentialApi, getCropLabel, getSectionLabel } from '@/lib/referentiels';
import { toast } from 'sonner';

function CropDetailPage() {
  const { crop } = Route.useParams();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editJson, setEditJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['referential', crop],
    queryFn: () => referentialApi.get(crop),
  });

  const updateMutation = useMutation({
    mutationFn: ({ section, value }: { section: string; value: unknown }) =>
      referentialApi.updateSection(crop, section, value),
    onSuccess: (_, vars) => {
      toast.success(`Section "${vars.section}" updated`);
      queryClient.invalidateQueries({ queryKey: ['referential', crop] });
      setEditingSection(null);
      setEditJson('');
    },
    onError: (err: Error) => {
      toast.error(`Update failed: ${err.message}`);
    },
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startEdit = (section: string) => {
    if (!data) return;
    setEditingSection(section);
    setEditJson(JSON.stringify(data[section], null, 2));
    setJsonError(null);
  };

  const saveEdit = () => {
    if (!editingSection) return;
    try {
      const parsed = JSON.parse(editJson);
      setJsonError(null);
      updateMutation.mutate({ section: editingSection, value: parsed });
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const sections = data ? Object.keys(data) : [];
  const metadata = data?.metadata as Record<string, unknown> | undefined;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Leaf className="h-6 w-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {getCropLabel(crop)}
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            {metadata && (
              <>
                <span className="text-sm text-gray-500">
                  v{String(metadata.version ?? '')}
                </span>
                <span className="text-sm text-gray-400">
                  {String(metadata.date ?? '')}
                </span>
              </>
            )}
            <span className="text-sm text-gray-400">
              {sections.length} sections
            </span>
          </div>
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
      ) : !data ? (
        <p className="text-red-600">Failed to load referential for {crop}</p>
      ) : (
        <div className="space-y-2">
          {sections.map((section) => {
            const isExpanded = expandedSections.has(section);
            const isEditing = editingSection === section;
            const value = data[section];
            const isMetadata = section === 'metadata';

            return (
              <div
                key={section}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900">
                      {getSectionLabel(section)}
                    </span>
                    <span className="text-xs text-gray-400">{section}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TypeBadge value={value} />
                    {!isMetadata && !isEditing && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(section);
                          if (!isExpanded) toggleSection(section);
                        }}
                        className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </button>

                {/* Section content */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {isEditing ? (
                      <div className="p-4">
                        <textarea
                          value={editJson}
                          onChange={(e) => {
                            setEditJson(e.target.value);
                            setJsonError(null);
                          }}
                          className={`w-full h-96 font-mono text-sm p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            jsonError ? 'border-red-300' : 'border-gray-300'
                          }`}
                          spellCheck={false}
                        />
                        {jsonError && (
                          <p className="text-sm text-red-600 mt-1">
                            Invalid JSON: {jsonError}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={saveEdit}
                            disabled={updateMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Save className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingSection(null);
                              setEditJson('');
                              setJsonError(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 overflow-x-auto">
                        <JsonTree value={value} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TypeBadge({ value }: { value: unknown }) {
  let label = '';
  let color = 'bg-gray-100 text-gray-600';

  if (Array.isArray(value)) {
    label = `array [${value.length}]`;
    color = 'bg-blue-50 text-blue-600';
  } else if (value && typeof value === 'object') {
    label = `object {${Object.keys(value).length}}`;
    color = 'bg-purple-50 text-purple-600';
  } else if (typeof value === 'number') {
    label = 'number';
    color = 'bg-amber-50 text-amber-600';
  } else if (typeof value === 'string') {
    label = 'string';
    color = 'bg-green-50 text-green-600';
  } else if (typeof value === 'boolean') {
    label = 'boolean';
    color = 'bg-pink-50 text-pink-600';
  }

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function JsonTree({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">null</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span className="flex items-center gap-1">
        {value ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <X className="h-3.5 w-3.5 text-gray-400" />
        )}
        <span className={value ? 'text-emerald-700' : 'text-gray-500'}>
          {String(value)}
        </span>
      </span>
    );
  }

  if (typeof value === 'number') {
    return <span className="text-amber-700 font-mono text-sm">{value}</span>;
  }

  if (typeof value === 'string') {
    if (value.length > 200) {
      return (
        <span className="text-green-700 text-sm block max-w-2xl">
          "{value.slice(0, 200)}..."
        </span>
      );
    }
    return <span className="text-green-700 text-sm">"{value}"</span>;
  }

  if (Array.isArray(value)) {
    // Compact display for simple arrays
    if (
      value.length <= 6 &&
      value.every((v) => typeof v === 'number' || typeof v === 'string')
    ) {
      return (
        <span className="font-mono text-sm">
          [
          {value.map((v, i) => (
            <span key={i}>
              {i > 0 && ', '}
              {typeof v === 'string' ? (
                <span className="text-green-700">"{v}"</span>
              ) : (
                <span className="text-amber-700">{v}</span>
              )}
            </span>
          ))}
          ]
        </span>
      );
    }

    return (
      <div className={depth > 2 ? 'ml-3' : ''}>
        {value.map((item, i) => (
          <div key={i} className="border-l-2 border-gray-200 pl-4 py-1 my-1">
            <span className="text-xs text-gray-400 mr-2">[{i}]</span>
            <JsonTree value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);

    return (
      <div className={depth > 0 ? 'ml-3' : ''}>
        <table className="w-full">
          <tbody>
            {entries.map(([key, val]) => {
              const isComplex =
                (typeof val === 'object' && val !== null) ||
                (Array.isArray(val) && val.length > 6);

              return (
                <tr key={key} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pr-4 align-top whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-700">
                      {key}
                    </span>
                  </td>
                  <td className="py-1.5 align-top">
                    {isComplex ? (
                      <CollapsibleValue label={key} value={val} depth={depth} />
                    ) : (
                      <JsonTree value={val} depth={depth + 1} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return <span className="text-gray-500 text-sm">{String(value)}</span>;
}

function CollapsibleValue({
  value,
  depth,
}: {
  label: string;
  value: unknown;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 1);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <TypeBadge value={value} />
      </button>
      {open && (
        <div className="mt-1">
          <JsonTree value={value} depth={depth + 1} />
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/referentiels/$crop')({
  component: CropDetailPage,
});
