import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Save,
  X,
  Check,
  Leaf,
  Pencil,
} from 'lucide-react';
import { referentialApi, getCropLabel, getSectionLabel } from '@/lib/referentiels';
import type { ValidationError } from '@/lib/referentiels';
import { toast } from 'sonner';
import {
  buildReferentialSchema,
  formatZodErrors,
} from '../../../../../shared/referential-schema';

type JsonPath = (string | number)[];

function CropDetailPage() {
  const { crop } = Route.useParams();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState<unknown>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [rawEditorOpen, setRawEditorOpen] = useState(false);
  const [rawJsonDraft, setRawJsonDraft] = useState('');
  const [rawJsonError, setRawJsonError] = useState<string | null>(null);
  const [rawValidationErrors, setRawValidationErrors] = useState<ValidationError[]>([]);
  const [hasRawChanges, setHasRawChanges] = useState(false);
  const [isValidatingRaw, setIsValidatingRaw] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['referential', crop],
    queryFn: () => referentialApi.get(crop),
  });

  const updateMutation = useMutation({
    mutationFn: ({ section, value }: { section: string; value: unknown }) =>
      referentialApi.updateSection(crop, section, value),
    onSuccess: (_, vars) => {
      toast.success(`"${getSectionLabel(vars.section)}" saved`);
      queryClient.invalidateQueries({ queryKey: ['referential', crop] });
      setEditingSection(null);
      setSectionDraft(null);
      setHasChanges(false);
    },
    onError: (err: Error) => {
      toast.error(`Update failed: ${err.message}`);
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: (value: unknown) => referentialApi.update(crop, value),
    onSuccess: () => {
      toast.success('Referential JSON saved');
      queryClient.invalidateQueries({ queryKey: ['referential', crop] });
      setRawEditorOpen(false);
      setRawJsonError(null);
      setRawValidationErrors([]);
      setHasRawChanges(false);
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
    setRawEditorOpen(false);
    setRawJsonError(null);
    setRawValidationErrors([]);
    setHasRawChanges(false);
    setEditingSection(section);
    setSectionDraft(structuredClone(data[section]));
    setHasChanges(false);
    setValidationErrors([]);
    if (!expandedSections.has(section)) {
      toggleSection(section);
    }
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setSectionDraft(null);
    setHasChanges(false);
    setValidationErrors([]);
  };

  const openRawEditor = () => {
    if (!data) return;
    cancelEdit();
    setRawEditorOpen(true);
    setRawJsonDraft(JSON.stringify(data, null, 2));
    setRawJsonError(null);
    setRawValidationErrors([]);
    setHasRawChanges(false);
  };

  const cancelRawEdit = () => {
    setRawEditorOpen(false);
    setRawJsonError(null);
    setRawValidationErrors([]);
    setHasRawChanges(false);
  };

  const saveEdit = async () => {
    if (!editingSection || !sectionDraft || !data) return;

    const mergedDocument = {
      ...structuredClone(data),
      [editingSection]: sectionDraft,
    };
    const localValidation = buildReferentialSchema(crop).safeParse(mergedDocument);
    if (!localValidation.success) {
      setValidationErrors(formatZodErrors(localValidation.error));
      toast.error(`${localValidation.error.issues.length} validation error(s)`);
      return;
    }

    // Validate before saving
    setIsValidating(true);
    try {
      const result = await referentialApi.validateSection(crop, editingSection, sectionDraft);
      if (!result.valid) {
        setValidationErrors(result.errors);
        toast.error(`${result.errors.length} validation error(s)`);
        setIsValidating(false);
        return;
      }
      setValidationErrors([]);
    } catch {
      // If validate endpoint fails, still allow save (backward compat)
    }
    setIsValidating(false);

    updateMutation.mutate({ section: editingSection, value: sectionDraft });
  };

  const parseRawJson = (): unknown | null => {
    try {
      const parsed = JSON.parse(rawJsonDraft);
      setRawJsonError(null);
      return parsed;
    } catch (err) {
      setRawJsonError(err instanceof Error ? err.message : 'Invalid JSON');
      return null;
    }
  };

  const validateRawEdit = async (): Promise<unknown | null> => {
    const parsed = parseRawJson();
    if (parsed === null) return null;

    const localValidation = buildReferentialSchema(crop).safeParse(parsed);
    if (!localValidation.success) {
      setRawValidationErrors(formatZodErrors(localValidation.error));
      toast.error(`${localValidation.error.issues.length} validation error(s)`);
      return null;
    }
    setRawValidationErrors([]);

    setIsValidatingRaw(true);
    try {
      const result = await referentialApi.validate(crop, parsed);
      if (!result.valid) {
        setRawValidationErrors(result.errors);
        toast.error(`${result.errors.length} validation error(s)`);
        return null;
      }
      setRawValidationErrors([]);
      return parsed;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Validation failed');
      return null;
    } finally {
      setIsValidatingRaw(false);
    }
  };

  const saveRawEdit = async () => {
    const parsed = await validateRawEdit();
    if (parsed === null) return;
    updateDocumentMutation.mutate(parsed);
  };

  const updateValue = useCallback((path: JsonPath, newValue: unknown) => {
    setSectionDraft((prev: unknown) => {
      const clone = structuredClone(prev);
      let target: any = clone;
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]];
      }
      target[path[path.length - 1]] = newValue;
      return clone;
    });
    setHasChanges(true);
  }, []);

  const sections = data ? Object.keys(data) : [];
  const metadata = data?.metadata as Record<string, unknown> | undefined;

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          <Link
            to="/"
            className="mt-0.5 shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 sm:mt-0"
            aria-label="Back to referentials"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 sm:h-12 sm:w-12">
            <Leaf className="h-5 w-5 text-emerald-600 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              {getCropLabel(crop)}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 sm:text-sm">
              {metadata && (
                <>
                  <span className="text-gray-500">
                    v{String(metadata.version ?? '')}
                  </span>
                  <span>{String(metadata.date ?? '')}</span>
                </>
              )}
              <span>{sections.length} sections</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:w-auto sm:shrink-0"
        >
          <RefreshCw className={`h-4 w-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          type="button"
          onClick={openRawEditor}
          disabled={isLoading || !data}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:w-auto sm:shrink-0"
        >
          <Pencil className="h-4 w-4 shrink-0" />
          Edit JSON
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : !data ? (
        <p className="text-red-600">Failed to load referential for {crop}</p>
      ) : (
        <div className="space-y-4">
          {rawEditorOpen && (
            <div className="rounded-lg border border-emerald-300 bg-white p-4 ring-1 ring-emerald-100">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Raw JSON Editor</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Paste a full referential JSON document here. This path supports new top-level
                    sections and canonical keys.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void validateRawEdit();
                    }}
                    disabled={isValidatingRaw || updateDocumentMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {isValidatingRaw ? 'Validating...' : 'Validate JSON'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void saveRawEdit();
                    }}
                    disabled={
                      isValidatingRaw ||
                      updateDocumentMutation.isPending ||
                      !hasRawChanges
                    }
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    Save JSON
                  </button>
                  <button
                    type="button"
                    onClick={cancelRawEdit}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </div>

              <textarea
                value={rawJsonDraft}
                onChange={(e) => {
                  setRawJsonDraft(e.target.value);
                  setHasRawChanges(true);
                  setRawJsonError(null);
                }}
                spellCheck={false}
                className="min-h-[28rem] w-full rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-sm text-gray-900 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />

              {rawJsonError && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Invalid JSON: {rawJsonError}
                </div>
              )}

              {rawValidationErrors.length > 0 && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="mb-1 text-sm font-medium text-red-800">
                    Schema validation failed ({rawValidationErrors.length}
                    {rawValidationErrors.length > 1 ? ' errors' : ' error'})
                  </p>
                  <ul className="space-y-0.5 text-xs text-red-700">
                    {rawValidationErrors.map((e, i) => (
                      <li key={i}>
                        <span className="font-mono text-red-600">{e.path || '$'}</span>
                        {' - '}
                        {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            {sections.map((section) => {
            const isExpanded = expandedSections.has(section);
            const isEditing = editingSection === section;
            const value = isEditing ? sectionDraft : data[section];
            const isMetadata = section === 'metadata';

            return (
              <div
                key={section}
                className={`bg-white rounded-lg border overflow-hidden ${
                  isEditing ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-gray-200'
                }`}
              >
                {/* Section header */}
                <div className="flex items-center justify-between gap-2 px-3 py-3 transition-colors hover:bg-gray-50 sm:px-5">
                  <button
                    onClick={() => toggleSection(section)}
                    className="flex items-center gap-3 flex-1"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900">
                      {getSectionLabel(section)}
                    </span>
                    <span className="text-xs text-gray-400">{section}</span>
                    <TypeBadge value={value} />
                  </button>
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveEdit}
                          disabled={updateMutation.isPending || isValidating || !hasChanges}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" />
                          {isValidating ? 'Validating...' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </>
                    ) : !isMetadata ? (
                      <button
                        onClick={() => startEdit(section)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Edit values"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Validation errors */}
                {isEditing && validationErrors.length > 0 && (
                  <div className="mx-5 mt-0 mb-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-medium text-red-800 mb-1">
                      Schema validation failed ({validationErrors.length} error{validationErrors.length > 1 ? 's' : ''})
                    </p>
                    <ul className="text-xs text-red-700 space-y-0.5">
                      {validationErrors.map((e, i) => (
                        <li key={i}>
                          <span className="font-mono text-red-600">{e.path}</span>
                          {' — '}
                          {e.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Section content */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 overflow-x-auto">
                    <JsonTree
                      value={value}
                      path={[]}
                      editable={isEditing}
                      onValueChange={updateValue}
                    />
                  </div>
                )}
              </div>
            );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Components ---

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

  if (!label) return null;

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

interface JsonTreeProps {
  value: unknown;
  path: JsonPath;
  depth?: number;
  editable: boolean;
  onValueChange: (path: JsonPath, value: unknown) => void;
}

function JsonTree({ value, path, depth = 0, editable, onValueChange }: JsonTreeProps) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic text-sm">null</span>;
  }

  // Leaf values — editable inline
  if (typeof value === 'boolean') {
    if (editable) {
      return (
        <button
          onClick={() => onValueChange(path, !value)}
          className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1"
        >
          {value ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <X className="h-3.5 w-3.5 text-gray-400" />
          )}
          <span className={value ? 'text-emerald-700 text-sm' : 'text-gray-500 text-sm'}>
            {String(value)}
          </span>
        </button>
      );
    }
    return (
      <span className="flex items-center gap-1">
        {value ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <X className="h-3.5 w-3.5 text-gray-400" />}
        <span className={value ? 'text-emerald-700 text-sm' : 'text-gray-500 text-sm'}>{String(value)}</span>
      </span>
    );
  }

  if (typeof value === 'number') {
    if (editable) {
      return (
        <InlineNumberEditor
          value={value}
          onChange={(v) => onValueChange(path, v)}
        />
      );
    }
    return <span className="text-amber-700 font-mono text-sm">{value}</span>;
  }

  if (typeof value === 'string') {
    if (editable) {
      return (
        <InlineStringEditor
          value={value}
          onChange={(v) => onValueChange(path, v)}
        />
      );
    }
    if (value.length > 200) {
      return <span className="text-green-700 text-sm block max-w-2xl">"{value.slice(0, 200)}..."</span>;
    }
    return <span className="text-green-700 text-sm">"{value}"</span>;
  }

  // Compact simple arrays
  if (
    Array.isArray(value) &&
    value.length <= 6 &&
    value.every((v) => typeof v === 'number' || typeof v === 'string')
  ) {
    if (editable) {
      return (
        <div className="flex flex-wrap items-center gap-1 font-mono text-sm">
          <span>[</span>
          {value.map((v, i) => (
            <span key={i} className="flex items-center gap-0.5">
              {i > 0 && <span>, </span>}
              {typeof v === 'number' ? (
                <InlineNumberEditor
                  value={v}
                  onChange={(nv) => onValueChange([...path, i], nv)}
                />
              ) : (
                <InlineStringEditor
                  value={v as string}
                  onChange={(nv) => onValueChange([...path, i], nv)}
                />
              )}
            </span>
          ))}
          <span>]</span>
        </div>
      );
    }
    return (
      <span className="font-mono text-sm">
        [{value.map((v, i) => (
          <span key={i}>
            {i > 0 && ', '}
            {typeof v === 'string' ? (
              <span className="text-green-700">"{v}"</span>
            ) : (
              <span className="text-amber-700">{v}</span>
            )}
          </span>
        ))}]
      </span>
    );
  }

  // Complex arrays
  if (Array.isArray(value)) {
    return (
      <div className={depth > 2 ? 'ml-3' : ''}>
        {value.map((item, i) => (
          <div key={i} className="border-l-2 border-gray-200 pl-4 py-1 my-1">
            <span className="text-xs text-gray-400 mr-2">[{i}]</span>
            <JsonTree value={item} path={[...path, i]} depth={depth + 1} editable={editable} onValueChange={onValueChange} />
          </div>
        ))}
      </div>
    );
  }

  // Objects
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);

    return (
      <div className={depth > 0 ? 'ml-3' : ''}>
        <table className="w-full">
          <tbody>
            {entries.map(([key, val]) => {
              const isComplex =
                (typeof val === 'object' && val !== null && !Array.isArray(val)) ||
                (Array.isArray(val) && (val.length > 6 || val.some((v) => typeof v === 'object')));

              return (
                <tr key={key} className="border-b border-gray-100 last:border-0">
                  <td className="py-1.5 pr-4 align-top whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-700">{key}</span>
                  </td>
                  <td className="py-1.5 align-top">
                    {isComplex ? (
                      <CollapsibleValue
                        value={val}
                        path={[...path, key]}
                        depth={depth}
                        editable={editable}
                        onValueChange={onValueChange}
                      />
                    ) : (
                      <JsonTree value={val} path={[...path, key]} depth={depth + 1} editable={editable} onValueChange={onValueChange} />
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
  path,
  depth,
  editable,
  onValueChange,
}: {
  value: unknown;
  path: JsonPath;
  depth: number;
  editable: boolean;
  onValueChange: (path: JsonPath, value: unknown) => void;
}) {
  const [open, setOpen] = useState(depth < 1);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <TypeBadge value={value} />
      </button>
      {open && (
        <div className="mt-1">
          <JsonTree value={value} path={path} depth={depth + 1} editable={editable} onValueChange={onValueChange} />
        </div>
      )}
    </div>
  );
}

// --- Inline editors ---

function InlineNumberEditor({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  if (!editing) {
    return (
      <span
        onClick={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        className="text-amber-700 font-mono text-sm cursor-pointer hover:bg-amber-50 rounded px-1 -mx-1"
        title="Click to edit"
      >
        {value}
      </span>
    );
  }

  return (
    <input
      type="number"
      step="any"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const num = Number(draft);
        if (!isNaN(num)) onChange(num);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const num = Number(draft);
          if (!isNaN(num)) onChange(num);
          setEditing(false);
        }
        if (e.key === 'Escape') setEditing(false);
      }}
      autoFocus
      className="font-mono text-sm text-amber-700 border border-amber-300 rounded px-1 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-amber-400"
    />
  );
}

function InlineStringEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className="text-green-700 text-sm cursor-pointer hover:bg-green-50 rounded px-1 -mx-1 truncate max-w-md inline-block"
        title="Click to edit"
      >
        "{value}"
      </span>
    );
  }

  const isLong = value.length > 80;

  if (isLong) {
    return (
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onChange(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false);
        }}
        autoFocus
        rows={3}
        className="text-sm text-green-700 border border-green-300 rounded px-2 py-1 w-full max-w-lg focus:outline-none focus:ring-1 focus:ring-green-400"
      />
    );
  }

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        onChange(draft);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onChange(draft);
          setEditing(false);
        }
        if (e.key === 'Escape') setEditing(false);
      }}
      autoFocus
      className="text-sm text-green-700 border border-green-300 rounded px-1 py-0.5 w-64 focus:outline-none focus:ring-1 focus:ring-green-400"
    />
  );
}

export const Route = createFileRoute('/_authenticated/referentiels/$crop')({
  component: CropDetailPage,
});
