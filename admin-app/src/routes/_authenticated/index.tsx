import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Leaf,
  ArrowRight,
  RefreshCw,
  Plus,
  X,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Upload,
  GitCompare,
  Eye,
  EyeOff,
  Database,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { referentialApi, getCropLabel, refDataApi } from '@/lib/referentiels';
import type { ReferenceDataTable, ImportResult, DiffResult } from '@/lib/referentiels';
import { toast } from 'sonner';
import clsx from 'clsx';

function ReferentielsDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newCropName, setNewCropName] = useState('');
  const [templateCrop, setTemplateCrop] = useState('');

  const { data: crops, isLoading, refetch } = useQuery({
    queryKey: ['referentials-list'],
    queryFn: () => referentialApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: ({ crop, template }: { crop: string; template?: string }) =>
      referentialApi.create(crop, template || undefined),
    onSuccess: (result) => {
      toast.success(`Referential "${result.crop}" created`);
      queryClient.invalidateQueries({ queryKey: ['referentials-list'] });
      setShowCreate(false);
      setNewCropName('');
      setTemplateCrop('');
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
    createMutation.mutate({ crop: name, template: templateCrop || undefined });
  };

  return (
    <div className="admin-page">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Référentiels</h1>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">
            Inspect, validate and update agronomic reference data
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:shrink-0">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 active:bg-emerald-800"
          >
            <Plus className="h-4 w-4 shrink-0" />
            New Referential
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
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
          <form onSubmit={handleCreate} className="flex flex-col gap-4 md:flex-row md:items-end md:gap-3">
            <div className="min-w-0 flex-1 md:max-w-xs">
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
            </div>
            <div className="min-w-0 md:max-w-xs">
              <label className="block text-sm text-gray-600 mb-1">
                Template (optional)
              </label>
              <select
                value={templateCrop}
                onChange={(e) => setTemplateCrop(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Empty — no template</option>
                {crops?.map((c) => (
                  <option key={c.crop} value={c.crop}>
                    Copy from {getCropLabel(c.crop)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Uses same structure with empty default values
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
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
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
                    <p className="text-sm text-gray-500">v{c.version}</p>
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

      {/* Reference Data Management */}
      <RefDataManagement />
    </div>
  );
}

// --- Reference Data Management ---

const REF_TABLES: { value: ReferenceDataTable; label: string }[] = [
  { value: 'account_templates', label: 'Account Templates' },
  { value: 'account_mappings', label: 'Account Mappings' },
  { value: 'modules', label: 'Modules' },
  { value: 'currencies', label: 'Currencies' },
  { value: 'roles', label: 'Roles' },
  { value: 'work_units', label: 'Work Units' },
];

function RefDataManagement() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<ReferenceDataTable>('modules');
  const [activePanel, setActivePanel] = useState<'import' | 'diff' | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Fetch table data
  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ['ref-data', selectedTable, page],
    queryFn: () =>
      refDataApi.getData(selectedTable, {
        limit: String(pageSize),
        offset: String(page * pageSize),
      }),
    enabled: isOpen,
  });

  // Import state
  const [importFile, setImportFile] = useState<Record<string, unknown>[] | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [dryRunResult, setDryRunResult] = useState<ImportResult | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);

  // Diff state
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);

  const importMutation = useMutation({
    mutationFn: ({ dryRun }: { dryRun: boolean }) =>
      refDataApi.import(selectedTable, importFile!, { dryRun, updateExisting }),
    onSuccess: (result, { dryRun }) => {
      if (dryRun) {
        setDryRunResult(result);
        toast.success('Dry run completed — review results below');
      } else {
        toast.success(`Import completed: ${result.recordsCreated} created, ${result.recordsUpdated} updated`);
        setImportFile(null);
        setImportFileName('');
        setDryRunResult(null);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const diffMutation = useMutation({
    mutationFn: () => refDataApi.diff(selectedTable),
    onSuccess: (result) => {
      setDiffResult(result);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const publishMutation = useMutation({
    mutationFn: ({ ids, unpublish }: { ids: string[]; unpublish: boolean }) =>
      refDataApi.publish(selectedTable, ids, unpublish),
    onSuccess: (result) => {
      if (result.publishedCount) toast.success(`${result.publishedCount} records published`);
      if (result.unpublishedCount) toast.success(`${result.unpublishedCount} records unpublished`);
      if (result.errors.length) toast.error(`${result.errors.length} errors`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const rows = Array.isArray(json) ? json : json.rows ?? json.data ?? [json];
      setImportFile(rows);
      setImportFileName(file.name);
      setDryRunResult(null);
    } catch {
      toast.error('Invalid JSON file');
    }
    e.target.value = '';
  };

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRightIcon className="h-4 w-4 text-gray-400" />}
        <Database className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-700">Reference Data Management</span>
        <span className="text-xs text-gray-400 ml-2">Import, diff & publish reference tables</span>
      </button>

      {isOpen && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-5 space-y-4">
          {/* Table selector */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="text-sm text-gray-500 shrink-0">Table:</label>
            <select
              value={selectedTable}
              onChange={(e) => {
                setSelectedTable(e.target.value as ReferenceDataTable);
                setPage(0);
                setDiffResult(null);
                setDryRunResult(null);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {REF_TABLES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <div className="flex gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={() => setActivePanel(activePanel === 'import' ? null : 'import')}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  activePanel === 'import'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50',
                )}
              >
                <Upload className="h-3.5 w-3.5" /> Import
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePanel(activePanel === 'diff' ? null : 'diff');
                  if (activePanel !== 'diff') diffMutation.mutate();
                }}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  activePanel === 'diff'
                    ? 'bg-emerald-600 text-white'
                    : 'border border-gray-300 text-gray-600 hover:bg-gray-50',
                )}
              >
                <GitCompare className="h-3.5 w-3.5" /> Diff
              </button>
            </div>
          </div>

          {/* Import Panel */}
          {activePanel === 'import' && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Import Data</h4>

              {/* File picker */}
              <div>
                <label className="block">
                  <span className="sr-only">Choose JSON file</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                </label>
                {importFileName && (
                  <p className="mt-1 text-xs text-gray-500">
                    Loaded: <span className="font-medium">{importFileName}</span> ({importFile?.length ?? 0} rows)
                  </p>
                )}
              </div>

              {/* Options */}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                Update existing records
              </label>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => importMutation.mutate({ dryRun: true })}
                  disabled={!importFile || importMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                >
                  {importMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                  Dry Run
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Import ${importFile?.length} rows into ${selectedTable}?`)) {
                      importMutation.mutate({ dryRun: false });
                    }
                  }}
                  disabled={!importFile || importMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {importMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Import
                </button>
              </div>

              {/* Dry run result */}
              {dryRunResult && (
                <div className={clsx(
                  'rounded-lg border p-3 text-sm',
                  dryRunResult.errors.length ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50',
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    {dryRunResult.errors.length ? (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    )}
                    <span className="font-medium">
                      {dryRunResult.errors.length ? 'Issues found' : 'Dry run passed'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span>Processed: {dryRunResult.recordsProcessed}</span>
                    <span>Created: {dryRunResult.recordsCreated}</span>
                    <span>Updated: {dryRunResult.recordsUpdated}</span>
                    <span>Skipped: {dryRunResult.recordsSkipped}</span>
                  </div>
                  {dryRunResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-red-700">
                      {dryRunResult.errors.slice(0, 10).map((e, i) => (
                        <li key={i}>Row {e.row}: {e.error}</li>
                      ))}
                      {dryRunResult.errors.length > 10 && (
                        <li>...and {dryRunResult.errors.length - 10} more</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Data Table */}
          {tableLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : tableData?.data?.length ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {tableData.total} record{tableData.total !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(tableData.data[0])
                        .filter((k) => !['id', 'created_at', 'updated_at'].includes(k))
                        .slice(0, 8)
                        .map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                          >
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {tableData.data.map((row: Record<string, unknown>, i: number) => {
                      const cols = Object.keys(row)
                        .filter((k) => !['id', 'created_at', 'updated_at'].includes(k))
                        .slice(0, 8);
                      return (
                        <tr key={String(row.id ?? i)} className="hover:bg-gray-50">
                          {cols.map((col) => (
                            <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                              {row[col] == null
                                ? <span className="text-gray-300">—</span>
                                : typeof row[col] === 'boolean'
                                  ? row[col] ? '✓' : '✗'
                                  : typeof row[col] === 'object'
                                    ? JSON.stringify(row[col]).slice(0, 60)
                                    : String(row[col]).slice(0, 80)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {tableData.total > pageSize && (
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-40"
                  >
                    ← Previous
                  </button>
                  <span className="text-xs text-gray-500">
                    Page {page + 1} of {Math.ceil(tableData.total / pageSize)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * pageSize >= tableData.total}
                    className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          ) : !tableLoading && (
            <p className="text-sm text-gray-400 text-center py-6">No records in {REF_TABLES.find((t) => t.value === selectedTable)?.label ?? selectedTable}</p>
          )}

          {/* Diff Panel */}
          {activePanel === 'diff' && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Version Diff</h4>
                <button
                  type="button"
                  onClick={() => diffMutation.mutate()}
                  disabled={diffMutation.isPending}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  {diffMutation.isPending ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {diffMutation.isPending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              ) : diffResult ? (
                <div>
                  <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                    <span>v{diffResult.fromVersion} &rarr; v{diffResult.toVersion}</span>
                    <span className="text-emerald-600">+{diffResult.added} added</span>
                    <span className="text-amber-600">~{diffResult.modified} modified</span>
                    <span className="text-red-600">-{diffResult.removed} removed</span>
                  </div>

                  {diffResult.changes.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">No differences found</p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {diffResult.changes.slice(0, 50).map((change, i) => (
                        <div
                          key={i}
                          className={clsx(
                            'rounded px-3 py-1.5 text-xs',
                            change.type === 'added' && 'bg-emerald-50 text-emerald-800',
                            change.type === 'modified' && 'bg-amber-50 text-amber-800',
                            change.type === 'removed' && 'bg-red-50 text-red-800',
                          )}
                        >
                          <span className="font-mono font-medium">{change.id}</span>
                          {change.field && <span className="ml-2 text-gray-500">.{change.field}</span>}
                          {change.type === 'modified' && (
                            <span className="ml-2">
                              {String(change.oldValue)} &rarr; {String(change.newValue)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Publish actions from diff */}
                  {diffResult.changes.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const ids = diffResult.changes
                            .filter((c) => c.type !== 'removed')
                            .map((c) => c.id);
                          if (ids.length && confirm(`Publish ${ids.length} records?`)) {
                            publishMutation.mutate({ ids, unpublish: false });
                          }
                        }}
                        disabled={publishMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Eye className="h-3.5 w-3.5" /> Publish All Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const ids = diffResult.changes
                            .filter((c) => c.type !== 'removed')
                            .map((c) => c.id);
                          if (ids.length && confirm(`Unpublish ${ids.length} records?`)) {
                            publishMutation.mutate({ ids, unpublish: true });
                          }
                        }}
                        disabled={publishMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <EyeOff className="h-3.5 w-3.5" /> Unpublish
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/')({
  component: ReferentielsDashboard,
});
