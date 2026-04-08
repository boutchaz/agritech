import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Save,
  X,
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getTableBySlug } from '@/lib/referentiels';
import type { ColumnDef } from '@/lib/referentiels';
import { toast } from 'sonner';

const PAGE_SIZE = 25;

function ReferentielDetailPage() {
  const { table: slug } = Route.useParams();
  const tableDef = getTableBySlug(slug);
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<
    { row: string; column: string; message: string }[]
  >([]);

  if (!tableDef) {
    return (
      <div className="p-8">
        <p className="text-red-600">Unknown table: {slug}</p>
        <Link to="/" className="text-emerald-700 hover:underline mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const queryKey = ['referentiel', tableDef.table, page, search];

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from(tableDef.table)
        .select('*', { count: 'exact' });

      // Search across text columns
      if (search.trim()) {
        const textCols = tableDef.columns
          .filter((c) => !c.type || c.type === 'text')
          .map((c) => `${c.key}.ilike.%${search.trim()}%`);
        if (textCols.length > 0) {
          query = query.or(textCols.join(','));
        }
      }

      query = query
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, any> }) => {
      const { error } = await supabase
        .from(tableDef.table)
        .update(values)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Row updated successfully');
      queryClient.invalidateQueries({ queryKey: ['referentiel', tableDef.table] });
      setEditingRow(null);
      setEditValues({});
    },
    onError: (err: Error) => {
      toast.error(`Update failed: ${err.message}`);
    },
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const startEdit = (row: any) => {
    setEditingRow(row.id);
    const values: Record<string, any> = {};
    tableDef.columns.forEach((col) => {
      values[col.key] = row[col.key];
    });
    setEditValues(values);
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setEditValues({});
  };

  const saveEdit = () => {
    if (!editingRow) return;
    // Only send changed editable fields
    const changes: Record<string, any> = {};
    const currentRow = rows.find((r: any) => r.id === editingRow);
    tableDef.columns.forEach((col) => {
      if (col.editable && editValues[col.key] !== currentRow?.[col.key]) {
        changes[col.key] = editValues[col.key];
      }
    });
    if (Object.keys(changes).length === 0) {
      cancelEdit();
      return;
    }
    updateMutation.mutate({ id: editingRow, values: changes });
  };

  // Validation: check for empty required fields, invalid numbers, duplicates
  const runValidation = () => {
    const errors: { row: string; column: string; message: string }[] = [];
    const nameColumn = tableDef.columns.find(
      (c) => c.key === 'name' || c.key === 'stage_name' || c.key === 'disease_name',
    );

    if (!rows.length) {
      toast.info('No data to validate');
      return;
    }

    const seen = new Map<string, string[]>();

    rows.forEach((row: any) => {
      // Check empty names
      if (nameColumn && (!row[nameColumn.key] || row[nameColumn.key].toString().trim() === '')) {
        errors.push({
          row: row.id,
          column: nameColumn.key,
          message: `Empty ${nameColumn.label}`,
        });
      }

      // Check number columns for invalid values
      tableDef.columns.forEach((col) => {
        if (col.type === 'number' && row[col.key] != null) {
          const v = Number(row[col.key]);
          if (isNaN(v)) {
            errors.push({ row: row.id, column: col.key, message: `Invalid number` });
          }
        }
      });

      // Track duplicates on name
      if (nameColumn) {
        const val = (row[nameColumn.key] ?? '').toString().toLowerCase().trim();
        if (val) {
          if (!seen.has(val)) seen.set(val, []);
          seen.get(val)!.push(row.id);
        }
      }
    });

    // Flag duplicates
    seen.forEach((ids, val) => {
      if (ids.length > 1 && nameColumn) {
        ids.forEach((id) => {
          errors.push({
            row: id,
            column: nameColumn.key,
            message: `Duplicate: "${val}"`,
          });
        });
      }
    });

    setValidationErrors(errors);
    if (errors.length === 0) {
      toast.success(`Validation passed — ${rows.length} rows OK`);
    } else {
      toast.warning(`${errors.length} issue(s) found`);
    }
  };

  const getValidationError = (rowId: string, colKey: string) =>
    validationErrors.find((e) => e.row === rowId && e.column === colKey);

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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{tableDef.label}</h1>
          <p className="text-sm text-gray-500">
            {tableDef.table} — {tableDef.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runValidation}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-md text-sm hover:bg-amber-100"
          >
            <AlertTriangle className="h-4 w-4" />
            Validate
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

      {/* Validation summary */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              {validationErrors.length} validation issue(s) found on this page
            </span>
          </div>
          <button
            onClick={() => setValidationErrors([])}
            className="text-amber-600 hover:text-amber-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            refetch();
          }}
          className="relative max-w-md"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {tableDef.columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {col.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={tableDef.columns.length + 1}
                    className="px-4 py-12 text-center"
                  >
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableDef.columns.length + 1}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No data
                  </td>
                </tr>
              ) : (
                rows.map((row: any) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-gray-50 ${
                      validationErrors.some((e) => e.row === row.id)
                        ? 'bg-amber-50/50'
                        : ''
                    }`}
                  >
                    {tableDef.columns.map((col) => {
                      const vErr = getValidationError(row.id, col.key);
                      const isEditing = editingRow === row.id;

                      return (
                        <td key={col.key} className="px-4 py-3 text-sm">
                          {isEditing && col.editable ? (
                            <EditCell
                              column={col}
                              value={editValues[col.key]}
                              onChange={(val) =>
                                setEditValues((prev) => ({ ...prev, [col.key]: val }))
                              }
                              hasError={!!vErr}
                            />
                          ) : (
                            <div className="flex items-center gap-1">
                              <CellDisplay value={row[col.key]} type={col.type} />
                              {vErr && (
                                <span
                                  className="text-xs text-amber-600"
                                  title={vErr.message}
                                >
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {editingRow === row.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={saveEdit}
                            disabled={updateMutation.isPending}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Save"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(row)}
                          className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(page * PAGE_SIZE, total)}
              </span>{' '}
              of <span className="font-medium">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 py-1 text-sm text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CellDisplay({ value, type }: { value: any; type?: string }) {
  if (value == null || value === '') {
    return <span className="text-gray-300">—</span>;
  }
  if (type === 'boolean') {
    return value ? (
      <Check className="h-4 w-4 text-emerald-600" />
    ) : (
      <X className="h-4 w-4 text-gray-300" />
    );
  }
  if (type === 'json') {
    return (
      <span className="font-mono text-xs text-gray-600 max-w-[200px] truncate block">
        {JSON.stringify(value)}
      </span>
    );
  }
  return <span className="truncate max-w-[250px] block">{String(value)}</span>;
}

function EditCell({
  column,
  value,
  onChange,
  hasError,
}: {
  column: ColumnDef;
  value: any;
  onChange: (val: any) => void;
  hasError: boolean;
}) {
  const baseClass = `w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
    hasError ? 'border-amber-400' : 'border-gray-300'
  }`;

  if (column.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
      />
    );
  }

  if (column.type === 'number') {
    return (
      <input
        type="number"
        step="any"
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? null : Number(e.target.value))
        }
        className={`${baseClass} max-w-[120px]`}
      />
    );
  }

  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={`${baseClass} max-w-[250px]`}
    />
  );
}

export const Route = createFileRoute('/_authenticated/referentiels/$table')({
  component: ReferentielDetailPage,
});
